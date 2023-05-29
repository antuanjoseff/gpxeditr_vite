import Feature from 'ol/Feature.js';
import {Style, Fill, Text, Stroke, RegularShape, Circle} from 'ol/style';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import Point from 'ol/geom/Point.js';
import LineString from 'ol/geom/LineString.js';
import {unByKey} from 'ol/Observable'

export class TrackJoin {
  /**
   * @param {Object} [map, opt_options] Control options.
   */
  constructor(map, options) {
    this.map = map
    this.options = options
    this.originCoords = undefined
    this.selectedLayer = undefined
    this.currentTargetId = undefined
    this.selectedLayersId = []
    const start = undefined
    const end = undefined
    this.points = []
    this.active = false
    this.mouseOnLayer = undefined
    this.firstSelectedLayer = undefined

    this.hoverBindId = undefined
    this.clickBindId = undefined
    this.finishBindId = undefined
    this.color = undefined
    this.width = undefined

    this.selectStyle = new Style({
      stroke: new Stroke({
        color: 'red',
        width: 8
      })
    })
    // NEW LAYER TO PUT NEW TRACK SEGMENT
    this.joinSource = new VectorSource({
      features: []
    })

    this.joinLayer = new VectorLayer({
      id: 'joined',
      source: new VectorSource({
        features: [
          new Feature({
            geometry: new LineString([[]])
          })
        ]
      })
    })
  }

  isActive() {
    return this.active
  }

  deactivate() {
    this.active = false
    unByKey(this.hoverBindId)
    unByKey(this.clickBindId)
    unByKey(this.finishBindId)
    this.originCoords = []
    this.selectedLayer = undefined
    this.currentTargetId = undefined
    this.selectedLayersId = []
    const start = undefined
    const end = undefined
    this.points = []
    this.active = false
    this.mouseOnLayer = undefined
    this.firstSelectedLayer = undefined

    this.hoverBindId = undefined
    this.clickBindId = undefined
    this.finishBindId = undefined
    this.color = undefined
    this.width = undefined

    this.joinLayer.getSource().getFeatures()[0].getGeometry().setCoordinates(this.originCoords)
    this.map.removeLayer(this.joinLayer)
  }

  activate() {
    var _this = this
    this.active = true
    this.map.addLayer(this.joinLayer)
    this.hoverBindId = this.map.on('pointermove', this.moveOverFirstLayer.bind(this))
    this.clickBindId = this.map.on('click', this.clickOnFirstLayer.bind(this))
    this.finishBindId = this.map.on('dblclick', this.finish.bind(this))
  }

  clickOnFirstLayer(e) {
    if (this.selectedLayer){
      // If first selected layer
      if (!this.selectedLayersId.length) {
        this.originCoords = this.getLayerCoords(this.selectedLayer)
        this.joinLayer.getSource().getFeatures()[0].getGeometry().setCoordinates(this.originCoords)
        this.applySelectedStyle(this.joinLayer)
        const start = this.originCoords[0]
        const end = this.originCoords[this.originCoords.length - 1]
        this.selectedLayer.setStyle(new Style({
          stroke: new Stroke({
            color: this.color,
            width: this.width
          })
        }))
        this.joinSource.addFeatures([
          new Feature({
            type: 'start',
            geometry: new Point(start)
          }),
          new Feature({
            type: 'end',
            geometry: new Point(end)
          })
        ])
        this.map.removeLayer(this.joinLayer)
        this.map.addLayer(this.joinLayer)
        unByKey(this.hoverBindId)
        this.hoverBindId = this.map.on('pointermove', this.moveOverNextLayer.bind(this))
      } else {
          this.originCoords = this.joinLayer.getSource().getFeatures()[0].getGeometry().getCoordinates()
      }
      this.selectedLayersId.push(this.selectedLayer.get('id'))
    }
  }

  moveOverFirstLayer(e) {
    // Get head or tails of acive layer
    var _this = this
    var hit
    hit = _this.map.forEachFeatureAtPixel(e.pixel, function (feature, layer) {
      if (!_this.selectedLayer) {
        _this.selectedLayer = layer
        _this.color = layer.getStyle().getStroke().getColor()
        _this.width = layer.getStyle().getStroke().getWidth()
      }
      return true
    }, { hitTolerance: 10, layerFilter: (l) => {return l.get('id') !== 'joined'} })
    if (hit) {
      this.map.getTargetElement().style.cursor = 'pointer'
      this.applySelectedStyle(this.selectedLayer)
    } else {
      this.map.getTargetElement().style.cursor = ''
      if (this.selectedLayer){
        this.selectedLayer.setStyle(new Style({
          stroke: new Stroke({
            color: this.color,
            width: this.width
          })
        }))
      }
      this.selectedLayer = undefined
    }
  }

  moveOverNextLayer(e){
    // Get head or tails of acive layer
    var _this = this
    var concatCoords
    var mouseCoord = this.map.getCoordinateFromPixel(e.pixel)
    var snapped = this.joinSource.getClosestFeatureToCoordinate(mouseCoord)
    var joinPoint = snapped.get('type')

  var hit = this.map.forEachFeatureAtPixel(e.pixel, function (feature, layer) {
      _this.selectedLayer = layer
      const targetCoords = layer.getSource().getFeatures()[0].getGeometry().getCoordinates()

      // Temporal merge (origin Start with target End or viceversa)
      if (joinPoint === 'start') {
        // Agafa targetCoords i posa'ls davant del activeLayer coords
        concatCoords = targetCoords.concat(_this.originCoords)
      } else {
        // Agafa targetCoords i posa'ls darrera del activeLayer coords
        concatCoords = _this.originCoords.concat(targetCoords)
      }
      return true
    }, { hitTolerance: 10, layerFilter: (l) => {
      return l.get('id') !== 'joined' && !_this.selectedLayersId.includes(l.get('id'))}
    })
    if (hit) {
        this.joinLayer.getSource().getFeatures()[0].getGeometry().setCoordinates(concatCoords)
      this.map.getTargetElement().style.cursor = 'pointer'
    } else {
      this.selectedLayer = undefined
      this.joinLayer.getSource().getFeatures()[0].getGeometry().setCoordinates(this.originCoords)
      this.map.getTargetElement().style.cursor = ''
    }
  }

  done() {
    console.log('done')
    this.originCoords = this.joinLayer.getSource().getFeatures()[0].getGeometry().getCoordinates()
  }

  applySelectedStyle(layer) {
    layer.setStyle(
      [
        new Style({
          stroke: new Stroke({
            color: 'blue',
            width: 18
          })
        }),
        new Style({
          stroke: new Stroke({
            color: 'red',
            width: 4
          })
        })
      ])
  }

  finish(e) {
    console.log('finished!')
    e.stopPropagation()
    this.options.callback(
      this.joinLayer.getSource().getFeatures()[0].getGeometry().getCoordinates(),
      this.selectedLayersId
    )
    this.map.dispatchEvent({
      type: 'toolFinished',
      toolname: 'join'
    })
    // this.deactivate()
  }

  getLayerCoords(layer) {
    return layer.getSource().getFeatures()[0].getGeometry().getCoordinates()
  }
  // TODO
  reset() {
  }
}
