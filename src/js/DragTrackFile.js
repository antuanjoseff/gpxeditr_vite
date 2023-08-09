import { Colors } from './colors.js';
import GPX from 'ol/format/GPX.js';
import OSMXML from 'ol/format/OSMXML.js';
import DragAndDrop from 'ol/interaction/DragAndDrop.js';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import {Style, Icon, Text, Stroke} from 'ol/style';

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

          event.features.map((e)=>{
            const type = e.getGeometry().getType().toLowerCase()
            if (type === 'point') {
              featureStyle = crossStyle
            } else {
              if (type.indexOf('linestring') > -1) {
                featureStyle = _this.styleLine(e)
              }
            }
            e.setStyle(featureStyle)
          })
    
          const vectorSource = new VectorSource({
            features: event.features,
          });
          const layerId = _this.newLayerId()
          const vectorLayer = new VectorLayer({
              id: layerId,
              source: vectorSource,
            })

          _this.map.addLayer(vectorLayer);
          _this.callback(layerId, filename, vectorSource.getExtent(), _this.colors.getColor() )

        } catch (e) {
          console.log(e)
        }
      })
    }    

    newLayerId() {
      return this.map.getLayers().count + 1
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
