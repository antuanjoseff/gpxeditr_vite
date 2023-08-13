import { Colors } from './colors.js'
import GPX from 'ol/format/GPX.js'
import OSMXML from 'ol/format/OSMXML.js'
import DragAndDrop from 'ol/interaction/DragAndDrop.js'
import {Group as LayerGroup } from 'ol/layer.js'
import VectorLayer from 'ol/layer/Vector.js'
import VectorSource from 'ol/source/Vector.js'
import {Style, Icon, Text, Stroke} from 'ol/style'

const crossStyle = (f) => {
  return new Style({
    ZIndex: 20,
    image: new Icon({
      anchor: [0, 1],
      src: 'flag.svg',
      scale: [0.05, 0.05]        
    }),
    text: new Text({
      text: f.get('name'),
      offsetY : 10,
      offsetX: 5
    })
  })
}

export class DragTrackFile {
    /**
     * @param {Object} [map, opt_options] Control options.
     */
    constructor(map, callback) {
      this.map = map
      this.colors = new Colors()
      this.callback = callback
      this.dragAndDropInteraction = new DragAndDrop({
        formatConstructors: [
          GPX,
          OSMXML
        ],
      })
      this.map.addInteraction(this.dragAndDropInteraction)
    }

    on() {
      var _this = this
      this.dragAndDropInteraction.on('addfeatures', function (event) {
        try{
          const filename = event.file.name
          var featureStyle
          var pointFeatures = [], trackFeature = []
          var trackExtent

          event.features.map((f)=>{
            const type = f.getGeometry().getType().toLowerCase()
            if (type === 'point') {
              featureStyle = crossStyle
              f.setStyle(featureStyle)
              pointFeatures.push(f)
            } else {
              if (type.indexOf('linestring') > -1) {
                trackExtent = f.getGeometry().getExtent()
                featureStyle = _this.styleLine(f)
                f.setStyle(featureStyle)
                trackFeature.push(f)                
              }
            }
          })
    
          const layerId = _this.newLayerId()
          const trackLayer = new LayerGroup({
            id: layerId,
            layers: [
              // TRACK
              new VectorLayer({
                id: 'track',
                source: new VectorSource({
                  features: trackFeature
                })
              }),
              // WAYPOINTS
              new VectorLayer({
                id: 'waypoints',
                source: new VectorSource({
                  features: pointFeatures
                })
              })    
            ]
          })
          _this.map.addLayer(trackLayer);
          _this.callback(layerId, filename, trackExtent, _this.colors.getColor() )

        } catch (e) {
          console.log(e)
        }
      })
    }    

    newLayerId() {
      return this.map.getLayers().array_.length + 1
    }

    styleLine() {
      return new Style({
        stroke: new Stroke({
          color: this.colors.newColor(),
          width: '5'
        })
      })
    }
    
}
