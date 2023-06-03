import Draw from 'ol/interaction/Draw.js'
import {Vector as VectorSource} from 'ol/source.js'
import {Vector as VectorLayer} from 'ol/layer.js'
import {unByKey} from 'ol/Observable'

export class HandDraw {
  constructor(map, options) {
    this.source = new VectorSource({wrapX: false})

    this.vector = new VectorLayer({
      source: this.source
    })
    this.map = map
    this.draw = new Draw({
      source: this.source,
      type: 'LineString'
    })
    this.bindDraw = undefined
    this.callback = options.callback
  }

  activate() {
    // this.map.addLayer(this.vector)
    this.map.addInteraction(this.draw);
    this.bindDraw = this.draw.on("drawend", this.featureDrawn.bind(this))
  }

  deactivate(){
    this.map.removeInteraction(this.draw);
    this.map.removeLayer(this.vector)
    unByKey(this.bindDraw)
  }

  featureDrawn(e){
    console.log('do callback')
    const coords = e.feature.getGeometry()
    this.source.clear()
    this.callback(coords)
  }
}