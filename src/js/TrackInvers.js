import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import Feature from 'ol/Feature.js';
import LineString from 'ol/geom/LineString.js';
import {LayerSelector} from './LayerSelector.js';

export class TrackInvers {
  /**
   * @param {Object} [map, opt_options] Control options.
   */
  constructor(map, options) {
    this.map = map
    this.options = options || {}
    this.active = false
    this.layerToReverse = undefined
    this.callback = this.options.callback
    this.throttleTime = 50
    this.throttleTimer = undefined
    this.originalLayer = undefined
    this.modifiedLayer = undefined
    this.color = undefined
    this.width = undefined
    this.layerSelector = new LayerSelector(map,{
      throttleTime: this.throttleTime
    })
  }

  isActive() {
    return this.active
  }

  activate() {
    var _this = this
    this.active = true
    this.layerSelector.on()
    this.map.once('layer-selected', function(e){
      _this.originalLayer = e.layer
      _this.reverse()
      _this.layerSelector.off()
    })
    // this.pointermoveBinder = this.map.on('pointermove', this.hover.bind(this))
    // this.clickBinder = this.map.on('singleclick', this.singleClick.bind(this))

    this.modifiedLayer = new VectorLayer({
      visible: false,
      source: new VectorSource({
        features: [
          new Feature({
            geometry: new LineString([[]])
          }) 
        ]
      })
    })
    this.map.addLayer(this.modifiedLayer)
  }

  deactivate() {
    // unByKey(this.pointermoveBinder)
    // unByKey(this.clickBinder)
    this.layerToReverse = undefined
    this.throttleTimer = undefined
    this.originalLayer = undefined
    this.modifiedLayer = undefined
    this.color = undefined
    this.width = undefined
    this.pointermoveBinde = undefined
    this.clickBinder = undefined
  }

  reverse() {
    var _this = this
    let index = 0
    let animation
    const coords = this.originalLayer.getSource().getFeatures()[0].getGeometry().getCoordinates()
    coords.reverse()
    const n = coords.length
    // DO ANIMATIONS
    const duration = 1000
    let nLoops = duration / 50 // 50ms between
    let increment = n /nLoops

    function addCoord() {
      index += increment
      _this.originalLayer.getSource().getFeatures()[0].getGeometry().setCoordinates(coords.slice(0,index))
      if (index >= n) {
        clearInterval(animation)
        _this.deactivate()
        _this.activate()
      }
    }

    this.modifiedLayer.getSource().getFeatures()[0].getGeometry().setCoordinates([])
    animation = setInterval(addCoord, 50)
  }

  done() {
    this.callback(this.coords, this.activeLayer)
    this.map.dispatchEvent({
      type: 'toolFinished',
      toolname: 'invers'
    })
    this.deactivate()
  }

  // TODO
  reset() {
  }

}
