import { Colors } from './colors.js'
import Feature from 'ol/Feature.js';
import GPX from 'ol/format/GPX.js'
import OSMXML from 'ol/format/OSMXML.js'
import DragAndDrop from 'ol/interaction/DragAndDrop.js'
import {Group as LayerGroup } from 'ol/layer.js'
import VectorLayer from 'ol/layer/Vector.js'
import VectorSource from 'ol/source/Vector.js'
import {Style, Icon, Text, Stroke} from 'ol/style'
import { waypointStyle } from './MapStyles.js';


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
        var filename = event.file.name
        var contents = event.features
        _this.callback(contents, filename)
      })
    }
 
  }