import Feature from 'ol/Feature.js';
import {Style, Fill, Stroke, Circle} from 'ol/style';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import Point from 'ol/geom/Point.js';
import LineString from 'ol/geom/LineString.js';
import { Distance } from './utils.js';
import { transform } from 'ol/proj.js'
import {selectStyle, createStyleByStrokeColor} from './utils.js';
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
    this.slopes = []
    this.tolerance = 60
    this.selectedLayerId = undefined
    this.nextClickCleanSegment = false

    // This layer shows circle where mouse move to select segment
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

    // Layer used to get closest feature to mouse position
    this.nodesLayer = new VectorLayer({
      id: 'nodesLayer',
      source: new VectorSource(),
      style:[]
    })

    // segment layer selected by user
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

  getLinestringFromLayer() {
    const features = this.selectedLayer.getSource().getFeatures()
    const linestring = features.find(f => {
      return f.getGeometry().getType().toLowerCase().indexOf('linestring') != -1
    })
    return linestring
  }

  async activate() {
    var _this = this
    this.active = true
    this.layerSelector = new LayerSelector(this.map,{
      throttleTime: 0
    })

    this.layerSelector.on()

    this.map.once('layer-selected', async function(e) {
      var strokeWidth = 5
      _this.selectedLayer = e.layer   
      _this.selectedLayerId = e.layer.get('parentId')
      _this.selectedLayer.setStyle(createStyleByStrokeColor(e.layer.get('col'), strokeWidth))
      _this.layerSelector.off()

      var coords = _this.getLinestringFromLayer(_this.selectedLayer).getGeometry().getCoordinates()
      _this.initCoords = coords
      _this.nodesSource = _this.getNodesSource(coords)
      _this.nodesLayer.setSource(_this.nodesSource)
      console.log(_this.nodesLayer.get('id'))

      _this.map.addLayer(_this.nodesLayer)
      _this.bindPointerMove = _this.map.on('pointermove', _this.pointerMoveLayer.bind(_this))
      _this.bindClick = _this.map.on('click', _this.clickLayer.bind(_this))
      _this.sumUp(0, _this.initCoords.length - 1)
    })

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
    unByKey(this.bindPointerMove)
    unByKey(this.bindClick)
    if (this.selectedSegmentLayer) {
      this.cleanSegment()

    }
    // this.selectedLayerId = undefined
    this.selectedNodeLayer.getSource().clear()
    this.selectedNodeLayer.getSource().addFeature(
      new Feature({
        geometry: new Point([])
      })
    )

    this.map.removeLayer(this.selectedNodeLayer)
    this.map.removeLayer(this.selectedSegmentLayer)
    this.map.removeLayer(this.nodesLayer)
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
    console.log('click segment')
    // if (this.nextClickCleanSegment) {
    //   console.log('clean segment')
    //   this.cleanSegment()
    //   this.nextClickCleanSegment = false
    //   return
    // }
    this.sumUp(this.startIndex, this.endIndex)
    const data = this.trackInfo
    const response = this.trackInfo
    response.type = 'track-info'
    response.name = this.selectedLayer.get('name'),
    response.data = this.selectedSegmentLayer.getSource().getFeatures()[0].getGeometry().getCoordinates()
    this.map.dispatchEvent(response)
    this.nextClickCleanSegment = true

    unByKey(this.bindPointerMove)
    unByKey(this.bindClick)
    
    // Next click cleans segment
    console.log('bind click cleanSegment')
    this.bindClick = this.map.on('click', this.clickToCleanSegment.bind(this))
    // this.reset()
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
      const hit = _this.map.forEachFeatureAtPixel(e.pixel, function (feature, layer) {
        // _this.selectedLayer = layer
        var coords = _this.getLinestringFromLayer(layer).getGeometry().getCoordinates()
        _this.nodesSource = _this.getNodesSource(coords)
        return true
      }, { 
        hitTolerance: 10, 
        layerFilter: (l) => {
          return l.get('parentId') === _this.selectedLayer.get('parentId')
         } 
      })
      
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
        // this.selectedLayer = undefined
        this.selectedNodeLayer.getSource().getFeatures()[0].getGeometry().setCoordinates([])
      }
      _this.throttleTimer = false
    }, this.throttleTime)
  }


  sumUp(first, last) {
    if (first === last) {
      return {}
    }
    var _this = this
    var gapped = false

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
    // Four dimensions means x, y, e, t time is in fourth place

    if (coordsList[0].length >= 3) {
      // Index of elevation values
      let pos = 2
      var eleFrozen = coordsList[0]
      var maxEle = coordsList[0][pos]
      var minEle =  coordsList[0][pos]
      for (var index = 1; index <= coordsList.length - 1; index++) {
        const cur = coordsList[index]
        const prev = coordsList[index - 1]
        // Check if there is a time gap
        if (cur[3] === undefined) {
          gapped = true
        }
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

    let xDataGraph, yDataGraph
    let speedData, slopeData

    xDataGraph = this.distances.slice(first, last + 1)
    yDataGraph = this.elevations.slice(first, last + 1)
    speedData = this.speed.slice(first, last + 1)
    slopeData = this.slopes.slice(first, last + 1)

    response.distances = xDataGraph
    // Elevations only when this.selectedSegmentLayer  has no coords
    if (this.selectedSegmentLayer.getSource().getFeatures()[0].getGeometry().getCoordinates().length === 0) {
      response.elevations = yDataGraph
    }

    response.layerId = this.selectedLayerId
    response.speed = speedData
    response.slope = slopeData
    response.indexes = { first, last }
    response.gapped = gapped
    this.trackInfo = response
    if (this.callback) {
      this.callback(response)
    }
  }

  getNodesSource(coords) {
    const _this = this
    const nodesSource = new VectorSource({})

    let dist = 0
    let prev
    let speed = 0
    let data = []
    this.elevations = []
    this.speed = []
    let ele, slope
    let incEle = 0, maxSlope = 0, minSlope = 0, maxIndex = 0, minIndex = 0
    coords.forEach((cur, index) => {
      ele = cur[2] < 0 ? 0 : Math.floor(cur[2])
      if (index === 0) {
        dist = 0
        if (cur[3] === undefined) {
          this.tolerance = 0
          speed = undefined
        }
        slope = 0
      } else {
        prev = coords[index -1]
        var c1 = transform([cur[0], cur[1]], 'EPSG:3857', 'EPSG:4326')
        var c2 = transform([prev[0], prev[1]], 'EPSG:3857', 'EPSG:4326')
        var incDist = Distance(c1, c2)
          // projDistance([prev[0], prev[1]], [cur[0], cur[1]])

        var incTime = cur[3] - prev[3]
        speed = (incDist / incTime) * 3.6 // kms/h
        dist += incDist
        incEle = cur[2] - prev[2]
        slope = Math.floor(Math.atan(incEle / incDist) * (180 / Math.PI))
        if (slope < minSlope) {
          minSlope = slope
          minIndex = dist
        }
        if (slope > maxSlope) {
          maxSlope = slope
          maxIndex = dist
        }
      }
      const t = cur[3] !== 0 ? cur[3] : undefined
      var f = new Feature({
        geometry: new Point([cur[0], cur[1], cur[2], t, slope]),
        id: index,
        d: dist,
        e: ele,
        t: t,
        s: speed,
        sl: slope
      })
      // data.push([cur[0], cur[1], cur[2], t, dist, ele, t, speed, slope ])
      data.push([cur[0], cur[1], cur[2], t])
      this.distances.push(dist + ';' + slope)
      this.elevations.push(ele)
      if (!isNaN(speed)) {
        this.speed.push(speed)
      }
      nodesSource.addFeature(f)
    })
    this.initCoords = data
    this.speedAvg = this.speed
    // Smooth speed. Avg neighbours
    for (var index = 1; index < this.speed.length - 2; index++) {
      this.speed[index] = (this.speed[index - 1] + this.speed[index] + this.speed[index + 1]) / 3
    }
    // this.speed = this.speedAvg
    return nodesSource
  }

  async fillTimeGaps(){
    var _this = this
    var elePos = 2
    var timePos = 3
    function CoordHasTime(coord) {
      return coord[timePos] !== undefined && coord[timePos] !== 0
    }
    var index = 0

    while (index < _this.initCoords.length - 1) {
      if (CoordHasTime(_this.initCoords[index])) {
        index += 1
      } else {
        var index2 = index + 1
        while (index2 < this.initCoords.length -1 && !CoordHasTime(_this.initCoords[index2]) ) {
          index2 += 1
        }
        if (!CoordHasTime(index2)){
          //Fill gap between index and index2
          var nPointsWithoutTime = index2 - index
          var incTime = _this.initCoords[index2][timePos] - _this.initCoords[index - 1][timePos]
          var incTimePerPoint = incTime / nPointsWithoutTime
          for (var a = index; a < index2; a++) {
            _this.initCoords[a][timePos] = parseInt(_this.initCoords[a - 1][timePos] + incTimePerPoint)
            // if (_this.initCoords[a][elePos] === undefined){
            //   _this.initCoords[index - 1][elePos]
            // }
          }
        } else {
          console.log('time gap reaches the end. Can not fill gap')
        }
        index = index2 + 1
      }
    }
    await _this.getInfoFromCoords(_this.initCoords,_this.selectedLayerId)
    return _this.initCoords
  }

  setSelectedNode(coord) {
    this.selectedNodeLayer.getSource().getFeatures()[0].getGeometry().setCoordinates(
      coord
    )
  }
  
  changeTolerance(tolerance, firstIndex, lastIndex) {
    this.tolerance = tolerance
    this.sumUp(firstIndex, lastIndex)
  }

  async getInfoFromCoords(coords, layerId) {
    this.selectedLayerId = layerId
    this.initCoords = coords
    this.nodesSource = await this.getNodesSource(coords)
    this.startIndex = 0
    this.endIndex = coords.length - 1
    this.sumUp(0, this.initCoords.length - 1)
    return this.trackInfo
  }


  isActive() {
    return this.active
  }

  clickToCleanSegment() {
    this.cleanSegment()
    this.map.dispatchEvent('unselect-track')
    this.reset()
  }
  cleanSegment() {
    this.selectedSegmentLayer.getSource().getFeatures()[0].getGeometry().setCoordinates([[]])
    this.map.dispatchEvent({
      type: 'track-info'
    })
  }

  findLayer(id)  {
    return this.map.getLayers().array_.find((layer) => {
      return layer.get('id') == id
    })
  }

}
