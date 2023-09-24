import Feature from 'ol/Feature.js';
import {Style, Fill, Stroke, Circle} from 'ol/style';
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

    // Keeps first and last coordinates positions of each union. 
    // Needed in case a step back (ctrl + z) happens
    this.joinedTracksCoords = []

    this.selectStyle = new Style({
      stroke: new Stroke({
        color: 'red',
        width: 8
      })
    })
    // NEW LAYER TO PUT NEW TRACK SEGMENT
    this.attachmentSource = new VectorSource({
      features: []
    })

    this.attachmentLayer = new VectorLayer({
      id: 'attachment',
      style: new Style({
        image: new Circle({
          radius: 20,
          fill: new Fill({color: 'rgba(0,0,0,1'}),
          stroke: new Stroke({color: 'rgba(0,0,0,1)', width: 0.1})
        })
      }),
      source: this.attachmentSource
    })

    this.unionLayer = new VectorLayer({
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
    this.width = []

    this.unionLayer.getSource().getFeatures()[0].getGeometry().setCoordinates(this.originCoords)
    this.map.removeLayer(this.unionLayer)
    this.map.removeLayer(this.attachmentLayer)
  }

  getLinestringFromLayer() {
    const features = this.selectedLayer.getSource().getFeatures()
    const linestring = features.find(f => {
      return f.getGeometry().getType().toLowerCase().indexOf('linestring') != -1
    })
    return linestring
  }

  activate() {
    var _this = this
    this.active = true
    this.map.addLayer(this.unionLayer)
    this.map.addLayer(this.attachmentLayer)
    this.hoverBindId = this.map.on('pointermove', this.moveOverFirstLayer.bind(this))
    this.clickBindId = this.map.on('click', this.clickOnLayer.bind(this))
    this.finishBindId = this.map.on('dblclick', this.finish.bind(this))
  }

  clickOnLayer(e) {
    if (this.selectedLayer){
      this.originCoords = this.getLinestringFromLayer(this.selectedLayer).getGeometry().getCoordinates()

      // If first selected layer
      if (!this.selectedLayersId.length) {
        this.unionLayer.getSource().getFeatures()[0].getGeometry().setCoordinates(this.originCoords)
        
        var lastJoinedCoords = this.joinedTracksCoords[this.joinedTracksCoords.length - 1]
        this.joinedTracksCoords.push({
          start: lastJoinedCoords.end + 1,
          end: this.originCoords.length - 1
        })
        this.applySelectedStyle(this.unionLayer)
  
        this.selectedLayer.setStyle(new Style({
          stroke: new Stroke({
            color: this.color,
            width: this.width
          })
        }))

        this.map.removeLayer(this.unionLayer)
        this.map.addLayer(this.unionLayer)
        unByKey(this.hoverBindId)
        this.hoverBindId = this.map.on('pointermove', this.moveOverNextLayer.bind(this))
      } else {
          this.originCoords = this.unionLayer.getSource().getFeatures()[0].getGeometry().getCoordinates()
          this.joinedTracksCoords.push({
            start: 0,
            end: this.originCoords.length - 1
          })
        }
      
      // New head and tails features for new joins
      const start = this.originCoords[0]
      const end = this.originCoords[this.originCoords.length - 1]

      this.attachmentSource.clear()
      this.attachmentSource.addFeatures([
        new Feature({
          type: 'start',
          geometry: new Point(start)
        }),
        new Feature({
          type: 'end',
          geometry: new Point(end)
        })
      ])
      this.map.removeLayer(this.attachmentLayer)
      this.map.addLayer(this.attachmentLayer)
              
      this.selectedLayersId.push(this.selectedLayer.get('parentId'))
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
      this.joinedTracksCoords = [
        {
          start: 0,
          end: this.selectedLayer.getSource().getFeatures()[0].getGeometry().getCoordinates().length - 1
        }
      ]
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
    var snapped = this.attachmentSource.getClosestFeatureToCoordinate(mouseCoord)
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
      return l.get('type') !== 'joined' && l.get('type') === 'track'}
    })
    if (hit) {
        this.unionLayer.getSource().getFeatures()[0].getGeometry().setCoordinates(concatCoords)
        const start = concatCoords[0]
        const end = concatCoords[concatCoords.length - 1]
        
        // this.attachmentSource.clear()
        // this.attachmentSource.addFeatures([
        //   new Feature({
        //     type: 'start',
        //     geometry: new Point(start)
        //   }),
        //   new Feature({
        //     type: 'end',
        //     geometry: new Point(end)
        //   })
        // ])
        this.map.removeLayer(this.attachmentLayer)
        this.map.addLayer(this.attachmentLayer)
      this.map.getTargetElement().style.cursor = 'pointer'
    } else {
      this.selectedLayer = undefined
      this.unionLayer.getSource().getFeatures()[0].getGeometry().setCoordinates(this.originCoords)
      this.map.getTargetElement().style.cursor = ''
    }
  }

  done() {
    console.log('done')
    this.originCoords = this.unionLayer.getSource().getFeatures()[0].getGeometry().getCoordinates()
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
    e.stopPropagation()
    var firstLayerSelected = this.selectedLayersId[0]
    var coords = this.unionLayer.getSource().getFeatures()[0].getGeometry().getCoordinates()
    this.options.callback(firstLayerSelected, coords, 'join' )

    this.map.dispatchEvent({
      type: 'toolFinished',
      toolname: 'join'
    })
    // this.deactivate()
  }

  // TODO
  reset() {
  }
}
