import Feature from 'ol/Feature.js';
import {Style, Fill, Stroke, Circle} from 'ol/style';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import Point from 'ol/geom/Point.js';
import LineString from 'ol/geom/LineString.js';
import { Distance, projDistance } from './utils.js';
import { transform, transformExtent } from 'ol/proj.js'
import {selectStyle} from './utils.js';
import {unByKey} from 'ol/Observable'
import {LayerSelector} from './LayerSelector.js';

export class NodesInfo {
  /**
   * @param {Object} [map, opt_options] Control options.
   */
  constructor(map, options) {
    this.map = map
    this.active = false
    this.initCoords = undefined
    this.hoverOnActiveLayer = undefined
    this.nodesSource = undefined
    this.throttletime = 50 // miliseconds
    this.throttleTimer = undefined
    this.bindPointerMove = undefined
    this.bindClick = undefined
    this.selectedLayer = undefined
    this.startPoint = undefined
    this.endPoint = undefined
    this.startIndex = undefined
    this.endIndex = undefined
    this.trackInfo = undefined
    this.callback = undefined
    this.elevations = []
    this.distances = []
    this.speed = []
    this.tolerance = 60
    this.selectedLayerId = undefined

    this.selectedNodeLayer = new VectorLayer({
      id: 'nodes',
      source: new VectorSource({
        features: [
          new Feature({
            geometry: new Point([])
          })
        ]
      }),
      style: new Style({
        image: new Circle({
          radius: 10,
          fill: new Fill({color: 'rgba(0,0,0,0.4)'}),
          stroke: new Stroke({color: 'rgba(0,0,0,0.4)', width: 0.1})
        })
      })
    })

    this.selectedSegmentLayer = new VectorLayer({
      id: 'segment',
      source: new VectorSource({
        features: [
          new Feature({
            geometry: new LineString([[]])
          })
        ]}),
      style: selectStyle
    })

  }

  isActive() {
    return this.active
  }

  cleanSegment() {
    this.selectedSegmentLayer.getSource().getFeatures()[0].getGeometry().setCoordinates([[]])
    this.map.dispatchEvent({
      type: 'track-info'
    })
  }

  activate() {
    var _this = this
    this.active = true
    this.layerSelector = new LayerSelector(this.map,{
      throttleTime: 0
    })

    if (!this.selectedLayerId) {
      this.layerSelector.on()
      this.map.once('layer-selected', function(e){
        _this.selectedLayerId = e.layer.get('id')
        _this.layerSelector.off()
        var coords = e.layer.getSource().getFeatures()[0].getGeometry().getCoordinates()
        _this.initCoords = coords
        _this.nodesSource = _this.getNodesSource(coords)
        _this.selectedLayer = e.layer
        _this.bindPointerMove = _this.map.on('pointermove', _this.pointerMoveLayer.bind(_this))
        _this.bindClick = _this.map.on('click', _this.clickLayer.bind(_this))
        _this.sumUp(0, _this.initCoords.length - 1)
      })
    } else {
      this.nodesSource = this.getNodesSource(this.initCoords)
      this.bindPointerMove = this.map.on('pointermove', this.pointerMoveLayer.bind(this))
      this.bindClick = this.map.on('click', this.clickLayer.bind(this))
    }
    this.map.addLayer(this.selectedNodeLayer)
    this.map.addLayer(this.selectedSegmentLayer)
  }

  // TODO
  reset() {
    this.hoverOnActiveLayer = undefined
    this.startPoint = undefined
    this.endPoint = undefined
    this.startIndex = undefined
    this.endIndex = undefined
    unByKey(this.bindPointerMove)
    unByKey(this.bindClick)
    this.bindPointerMove = this.map.on('pointermove', this.pointerMoveLayer.bind(this))
    this.bindClick = this.map.on('click', this.clickLayer.bind(this))
  }

  deactivate() {
    this.selectedLayerId = undefined
    unByKey(this.bindPointerMove)
    unByKey(this.bindClick)
    if (this.selectedSegmentLayer) {
      this.cleanSegment()

    }
    this.selectedLayerId = undefined
    this.selectedNodeLayer.getSource().clear()
    this.selectedNodeLayer.getSource().addFeature(
      new Feature({
        geometry: new Point([])
      })
    )

    this.map.removeLayer(this.selectedNodeLayer)
    this.map.removeLayer(this.selectedSegmentLayer)
    this.initCoords = undefined
    this.hoverOnActiveLayer = undefined
    this.nodesSource = undefined
    this.throttletime = 50 // miliseconds
    this.throttleTimer = undefined
    this.bindPointerMove = undefined
    this.bindClick = undefined
    this.selectedLayer = undefined
    this.startPoint = undefined
    this.endPoint = undefined
    this.startIndex = undefined
    this.endIndex = undefined
    this.active = false
    this.elevations = []
    this.distances = []
    this.speed = []
  }


  clickLayer(e) {
    if (!this.selectedLayer) {
      this.cleanSegment()
      this.map.dispatchEvent('unselect-track')
      return
    }
    unByKey(this.bindPointerMove)
    unByKey(this.bindClick)

    this.bindPointerMove = this.map.on('pointermove', this.pointerMoveSegment.bind(this))
    this.bindClick = this.map.on('click', this.clickSegment.bind(this))
  }

  clickSegment(e) {
    this.sumUp(this.startIndex, this.endIndex)
    const data = this.trackInfo
    const response = this.trackInfo
    response.type = 'track-info'
    response.name = this.selectedLayer.get('name'),
    response.data = this.selectedSegmentLayer.getSource().getFeatures()[0].getGeometry().getCoordinates()
    this.map.dispatchEvent(response)
    this.reset()
    // this.deactivate()
    // this.activate()
  }

  pointerMoveSegment(e) {
    if (this.throttleTimer) return
    this.throttleTimer = true
    setTimeout(async () => {
      var _this = this
      const hit = this.map.forEachFeatureAtPixel(e.pixel, function (feature, layer) {
        return true
      }, { hitTolerance: 10, layerFilter: (l) => {return l.get('id') == this.selectedLayer.get('id')} })

      if (hit) {
        var mouseCoord = this.map.getCoordinateFromPixel(e.pixel)
        this.endPoint = this.nodesSource.getClosestFeatureToCoordinate(mouseCoord)
        this.endIndex = this.endPoint.get('id')
        let segmentCoords
        if (this.startIndex > this.endIndex){
          segmentCoords = this.initCoords.slice(this.endIndex, _this.startIndex + 1)
        } else {
          segmentCoords = this.initCoords.slice(this.startIndex, this.endIndex + 1)
        }
        this.selectedSegmentLayer.getSource().getFeatures()[0].getGeometry().setCoordinates(segmentCoords)
        this.sumUp(this.startIndex, this.endIndex)
      }

      _this.throttleTimer = false
    }, this.throttleTime)
  }

  pointerMoveLayer(e) {
    var _this = this
    if (this.throttleTimer) return
    this.throttleTimer = true
    setTimeout(async () => {
      var _this = this
      const hit = this.map.forEachFeatureAtPixel(e.pixel, function (feature, layer) {
        _this.selectedLayer = layer
        var coords = layer.getSource().getFeatures()[0].getGeometry().getCoordinates()
        _this.nodesSource = _this.getNodesSource(coords)
        return true
      }, { hitTolerance: 10, layerFilter: (l) => {return l.get('id') === _this.selectedLayerId} })
      if (hit) {
        var mouseCoord = this.map.getCoordinateFromPixel(e.pixel)
        this.startPoint =this.nodesSource.getClosestFeatureToCoordinate(mouseCoord)
        this.startIndex = this.startPoint.get('id')
        try {
          this.map.getTargetElement().style.cursor = 'pointer'
          this.selectedNodeLayer.getSource().getFeatures()[0].getGeometry().setCoordinates(
            this.startPoint.getGeometry().getCoordinates()
          )
        } catch (err) {
          console.log(err)
        }
      } else {
        this.map.getTargetElement().style.cursor = ''
        this.selectedLayer = undefined
        this.selectedNodeLayer.getSource().getFeatures()[0].getGeometry().setCoordinates([])
      }
      _this.throttleTimer = false
    }, this.throttleTime)
  }


  sumUp(first, last) {
    // console.log(this.nodesSource.getFeatures().length)
    if (first === last) {
      return {}
    }
    var _this = this

    // Copy nodes just in case they are changed
    // var first = this.startIndex
    // var last = this.endIndex
    // const data = this.selectedSegmentLayer.getSource().getFeatures()[0].getGeometry().getCoordinates()
    if (first > last) {
      const tmp = first
      first = last
      last = tmp
    }

    const sF = this.nodesSource.getFeatures().find((f) => {
      return f.get('id') === first
    })

    const eF = this.nodesSource.getFeatures().find((f) => {
      return f.get('id') === last
    })
    if (sF === undefined || eF === undefined) {
      return
    }
    const response = {}

    // GET DISTANCE (MKS: METERS)
    const dm= (eF.get('d') - sF.get('d'))
    const kms = Math.floor(dm / 1000)
    const meters = Math.floor(dm - (kms * 1000))
    const distance = {
      kms: Math.floor(dm / 1000),
      meters: Math.floor(dm - Math.floor(dm / 1000) * 1000),
      total: (kms * 1000) + meters
    }
    response.distance = distance

    // GET ELAPSED TIME (h:m:s) IF EXISTS
    if (sF.get('t')) {
      const firstTime = sF.get('t')
      const lastTime = eF.get('t')
      const diffTime = Math.abs(firstTime - lastTime) / (60 * 60)
      const h = Math.floor(diffTime)
      const m = Math.floor((diffTime - h) * 60)
      const s = Math.floor((((diffTime - h) * 60) - m) * 60)
      const time = { hours: h, minutes: m, seconds: s }
      time.total = (h*60*60) + (m*60) + s
      response.time = time
    }

    // GET ELEVATION IF EXISTS.Take a messarement with a tolerance of X seconds
    var up = 0
    var down = 0
    var tolerance = this.tolerance // Seconds
    var elapsed  = 0

    var coordsList = this.selectedSegmentLayer.getSource().getFeatures()[0].getGeometry().getCoordinates()
    if (!coordsList.length) {
      coordsList = this.initCoords
    }

    // Three dimensions, means there is no time, so tolerance must be zero
    if (coordsList[0].length == 3) {
      tolerance = 0
    }

    // Three dimensions means x,y, e , elevations is in third place
    // Four dimensions means x, y, t, e Elevation is in fourth place

    if (coordsList[0].length >= 3) {
      // Index of elevation values
      let pos = 2
      var eleFrozen = coordsList[0]
      var maxEle = coordsList[0][pos]
      var minEle =  coordsList[0][pos]
      for (var index = 1; index <= coordsList.length - 1; index++) {
        const cur = coordsList[index]
        const prev = coordsList[index - 1]
        if (tolerance != 0) {
          elapsed += (cur[3] - prev[3])
        } else {
          elapsed  = 0
        }
        if (elapsed >= tolerance) {
          elapsed = 0
          if (cur[pos] > maxEle) {
            maxEle = Math.floor(cur[pos])
          }
          if (cur[pos] < minEle) {
            minEle = Math.floor(cur[pos])
          }
          if ( eleFrozen[pos] < cur[pos]) {
            up += Math.floor(cur[pos]) - Math.floor(eleFrozen[pos])
          } else {
            down += Math.floor(eleFrozen[pos]) - Math.floor(cur[pos])
          }
          eleFrozen = cur
        }
      }

      response.elevation = { up: up, down: down, maxEle, minEle }
    }
    response.type = 'track-info'

    let xDataGraph
    let yDataGraph
    let speedData

    xDataGraph = this.distances.slice(first, last + 1)
    yDataGraph = this.elevations.slice(first, last + 1)
    speedData = this.speed.slice(first, last + 1)

    response.distances = xDataGraph
    // Elevations only when this.selectedSegmentLayer  has no coords
    if (this.selectedSegmentLayer.getSource().getFeatures()[0].getGeometry().getCoordinates().length === 0) {
      response.elevations = yDataGraph
    }

    response.layerId = this.selectedLayerId
    response.speed = speedData
    response.indexes = { first, last }
    this.trackInfo = response
    if (this.callback) {
      this.callback(response)
    }
    // this.map.dispatchEvent(response)
  }

  getNodesSource(coords) {
    const _this = this
    const nodesSource = new VectorSource({})
    let dist = 0
    let speed = 0
    coords.forEach((cur, index) => {
      if (index === 0) {
        dist = 0
        speed = 0
      } else {
        const prev = coords[index -1]
        var c1 = transform([cur[0], cur[1]], 'EPSG:3857', 'EPSG:4326')
        var c2 = transform([prev[0], prev[1]], 'EPSG:3857', 'EPSG:4326')
        var incDist = Math.floor(
          // projDistance([prev[0], prev[1]], [cur[0], cur[1]])
          Distance(c1, c2)
        )
        var incTime = cur[3] - prev[3]
        var speed = (incDist / incTime) * 3.6 // kms/h
        dist += incDist
      }
      const ele = Math.floor(cur[2])
      var f = new Feature({
        geometry: new Point([cur[0], cur[1], cur[2], cur[3]]),
        id: index,
        d: dist,
        e: ele,
        t: cur[3],
        s: speed
      })
      this.distances.push(dist)
      this.elevations.push(ele)
      this.speed.push(speed)
      nodesSource.addFeature(f)
    })
    return nodesSource
  }

  changeTolerance(tolerance, firstIndex, lastIndex) {
    this.tolerance = tolerance
    this.sumUp(firstIndex, lastIndex)
  }

  async getInfoFromCoords(coords) {
    this.initCoords = coords
    this.nodesSource = this.getNodesSource(coords)
    this.startIndex = 0
    this.endIndex = coords.length - 1
    this.sumUp(0, this.initCoords.length - 1)
    return this.trackInfo
  }

  findLayer(id)  {
    return this.map.getLayers().array_.find((layer) => {
      return layer.get('id') == id
    })
  }

}
