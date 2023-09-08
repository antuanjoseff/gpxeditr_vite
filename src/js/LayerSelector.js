import {unByKey} from 'ol/Observable'
import { Style, Stroke } from 'ol/style';
import {selectStyle} from './utils.js';

export class LayerSelector {
  /**
   * @param {Object} [map, opt_options] Control options.
   */
  constructor(map, options) {
    this.map = map
    this.options = options || {}
    this.active = false
    this.pause = false
    this.selectedLayer = undefined
    this.previousSelectedId = undefined
    this.hoverBinder = undefined
    this.clickBinder = undefined
    this.throttleTimer = false
    this.throttleTime = this.options.throttle || 50
    this.excludeLayerIds = this.options.excludeLayerIds || []
    this.color = undefined
    this.width = undefined
    this.selectedFeature
  }

  on() {
    this.hoverBinder = this.map.on('pointermove', this.hover.bind(this))
    this.clickBinder = this.map.on('singleclick', this.singleClick.bind(this))
  }

  off() {
    unByKey(this.hoverBinder)
    unByKey(this.clickBinder)
    this.active = false
    this.pause = false
    this.mounseOnLayer = false
    // this.selectedLayer = undefined
  }

  singleClick(e) {
    if (this.selectedLayer) {
      this.pause = true
      this.selectedLayer.setStyle(
        new Style({
          stroke: new Stroke({
            color: this.color,
            width: this.width
          })
        })
      )
      this.map.dispatchEvent({
        type: 'layer-selected',
        layer: this.selectedLayer
      })

      this.off()
    }
  }

  hover(e) {
    var _this = this
    if (this.throttleTimer) return
    this.throttleTimer = true
    setTimeout(async () => {
      var _this = this
      if (_this.pause) return
      var selectedFeature
      const hit = this.map.forEachFeatureAtPixel(
        e.pixel,
        function (feature, layer) {
          // AVOID SELECTING A LAYER WHEHN ANOTHER ONE IS ALREADY SELECTED
          _this.selectedFeature = feature
          if (_this.previousSelectedId && _this.previousSelectedId != layer.get('id')){
            return false
          }
          if (!_this.previousSelectedId) {
            _this.previousSelectedId = layer.get('parentId')
            if (_this.isLineString(feature)) {
              _this.color = layer.getStyle().getStroke().getColor()
              _this.width = layer.getStyle().getStroke().getWidth()
              _this.selectedLayer = layer
            }
          } else {
            if (_this.previousSelectedId != layer.get('parentId')){
              _this.previousSelectedId = layer.get('parentId')
              if (_this.isLineString(feature)) {
                _this.color = layer.getStyle().getStroke().getColor()
                _this.width = layer.getStyle().getStroke().getWidth()
                _this.selectedLayer = layer
              }
            }
          }
          return true
        },
        {
          hitTolerance: 20,
          layerFilter: function (l) {
            // return !_this.excludeLayerIds.includes(l.get('id'))
            return l.get('type') === 'track'
          }
        }
      )

      if (hit) {
          this.map.getTargetElement().style.cursor = 'pointer'
          _this.selectedLayer.setStyle(selectStyle)
      } else {
          this.previousSelectedId = undefined
          if (_this.selectedLayer) {
            _this.selectedLayer.setStyle(
              new Style({
                stroke: new Stroke({
                  color: _this.color,
                  width: _this.width
                })
              })
            )
          }
          this.map.getTargetElement().style.cursor = ''
          if (this.selectedLayer) {
            this.selectedLayer.setStyle(
              new Style({
                stroke: new Stroke({
                  color: this.color,
                  width: this.width
                })
              })
            )
          }
          this.selectedLayer = undefined
        }
        _this.throttleTimer = false
      }, this.throttleTime)
    }

  isLineString(f){
    return f.getGeometry().getType().toLowerCase().indexOf('linestring') !== -1
  }
}
