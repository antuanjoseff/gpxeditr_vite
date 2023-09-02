import Feature from 'ol/Feature.js';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import Point from 'ol/geom/Point.js';
import LineString from 'ol/geom/LineString.js';
import {unByKey} from 'ol/Observable'
import {selectStyle} from './utils.js';

export class TrackCutter {
  /**
   * @param {Object} [map, opt_options] Control options.
   */
  constructor(map, options) {
    this.map = map
    this.options = options || {}
    this.callback = options.callback
    this.active = false
    this.initCoords = []
    this.selectedLayerId = undefined
    this.layerToCut = undefined
    this.pointermoveBinder = undefined
    this.clickBinder = undefined
    this.pause = false
    // NODES LAYER TO GET SPLIT NODE
    this.nodesLayer = undefined

    this.throttleTime = 50
    this.throttleTimer = undefined
    this.headCoords = undefined
    this.tailCoords = undefined
   }

  isActive() {
    return this.active
  }

  activate() {
    var _this = this
    this.active = true
    this.active = false
    this.pointermoveBinder = this.map.on('pointermove', this.hover.bind(this))
    this.clickBinder = this.map.on('singleclick', this.singleClick.bind(this))
    this.segmentLayer = new VectorLayer({
      id: 'segment',
      source: new VectorSource({
        features: [
          new Feature({
            geometry: new LineString([[]])
          })
        ]
      }),
      // style: this.options.styles.newLayer
      style: selectStyle
    })

    this.map.addLayer(this.segmentLayer)
  }

  singleClick(e) {
    if (this.layerToCut) {
      this.pause = true
      this.done()
    }
  }

  hover(e) {
    if (this.throttleTimer) return
    this.throttleTimer = true
    setTimeout(async () => {
      var _this = this
      if (_this.pause) return
      const hit = this.map.forEachFeatureAtPixel(e.pixel, function (feature, layer) {
        _this.layerToCut = layer
        _this.selectedLayerId = layer.get('parentId')
        _this.initCoords = layer.getSource().getFeatures()[0].getGeometry().getCoordinates()
        _this.nodesLayer = _this.getNodesLayer(_this.initCoords)

        var mouseCoord = _this.map.getCoordinateFromPixel(e.pixel)
        var snapped =_this.nodesLayer.getSource().getClosestFeatureToCoordinate(mouseCoord)
        var fIndex = snapped.get('id')
        var cNew = _this.initCoords.slice(0, fIndex)
        _this.headCoords = _this.initCoords.slice(0, fIndex + 1)
        _this.tailCoords = _this.initCoords.slice(fIndex, _this.initCoords.length)

        _this.segmentLayer.getSource().getFeatures()[0].getGeometry().setCoordinates(cNew)
        return true
      }, { hitTolerance: 10, layerFilter: (l) => {return l.get('type') === 'track'}})

      if (hit) {
        this.map.getTargetElement().style.cursor = 'pointer'        
      } else {
        this.map.getTargetElement().style.cursor = ''
        _this.layerToCut = undefined
        _this.selectedLayerId = undefined
        _this.segmentLayer.getSource().getFeatures()[0].getGeometry().setCoordinates([[]])
      }
      _this.throttleTimer = false
    }, this.throttleTime)
  }

  getLinestringFromLayerToCut() {
    return this.layerToCut.getSource().getFeatures()[0]
    // const linestring = features.find(f => {
    //   return f.getGeometry().getType().toLowerCase().indexOf('linestring') != -1
    // })
    // return linestring
  }

  done() {
    let startTime = null, endTime = null
    if (this.headCoords[0].length > 3) {
      startTime = this.headCoords[0][3]
      endTime = this.headCoords[this.headCoords.length - 1][3]
    }    

    // Modify feature of type linestring
    // this.getLinestringFromLayerToCut().getGeometry().setCoordinates(this.headCoords)
    this.layerToCut.setStyle(this.layerToCut.getStyle())
    this.layerToCut.set('name', 'Cap retallat')
    
    this.callback(
      this.selectedLayerId,
      this.tailCoords,
      'cut'
    )

    this.reset()
    // this.map.dispatchEvent({
    //   type: 'toolFinished',
    //   toolname: 'cutter'
    // })
    //  this.deactivate()
  }

  reset() {
    this.deactivate()
    this.activate()
  }

  deactivate() {
    this.active = false
    this.pause = false
    this.initCoords = []
    this.nodesLayer = undefined
    this.headCoords=undefined
    this.tailCoords=undefined
    this.map.removeLayer(this.segmentLayer)
    this.segmentLayer = undefined
    this.nodestLayer = undefined
    this.layerToCut = undefined

    unByKey(this.pointermoveBinder)
    unByKey(this.clickBinder)

    this.pointermoveBinder = undefined
    this.clickBinder = undefined
  }

  getNodesLayer(coords) {
    const _this = this
    const nodesSource = new VectorSource({})
    coords.forEach((P, index) => {
      var f = new Feature({
        geometry: new Point([P[0], P[1]]),
        id: index
      })
      nodesSource.addFeature(f)
    })

    var nodesLayer = new VectorLayer({
      id: 'nodes',
      source: nodesSource,
      style: []
    })
    return nodesLayer
  }
}
