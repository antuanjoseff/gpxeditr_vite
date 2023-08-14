import { Colors } from './colors.js'
import Feature from 'ol/Feature.js';
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
          var filename = event.file.name
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

              if (type.indexOf('linestring') > -1) {
                // featureStyle = styleLine(e)
                var counter = 0
    
                if (f.getGeometry().getType().toLowerCase() === 'multilinestring') {
                  const lns = f.getGeometry().getLineStrings()
                  var name = filename
                  lns.forEach((linestring) => {
                    filename = name + '(' + counter++ + ')'
                    _this.addLayerToMap(linestring, [], filename )
                  })
                }  else {
                  if (f.getGeometry().getType().toLowerCase() === 'linestring') {
                    filename = name + '(' + counter++ + ')'
                    _this.addLayerToMap(f, [], filename )
                  }
                }
              }

            }
          })
    
          // Add waypoints
          var lastId = _this.lastLayerId()
          var wLayer = _this.findTrackLayerFromParentId(lastId)
          wLayer.getSource().addFeatures(pointFeatures)

        } catch (e) {
          console.log(e)
        }
      })
    }    

    findTrackLayerFromParentId(id) {
      var layerGroup = this.map.getLayers().array_.find((layer) => {
        return layer.get('id') === id
      })
      const waypointsLayer = layerGroup.getLayers().array_.find(l => {
        return l.get('type').toLowerCase() === 'waypoints'
      })
      return waypointsLayer      
    }

    addLayerToMap(trackGeometry, pointFeatures, filename) {
      const layerId = this.newLayerId()
      var trackExtent = trackGeometry.getExtent()
      const trackFeature = new Feature ({
        geometry: trackGeometry
      })
      const newStyle = this.styleLine()
      const layerGroup = new LayerGroup({
        id: layerId,
        layers: [
          // TRACK
          new VectorLayer({
            parentId: layerId,
            style: newStyle,
            type: 'track',
            source: new VectorSource({
              features: [trackFeature]
            })
          }),
          // WAYPOINTS
          new VectorLayer({
            parentId: layerId,
            type: 'waypoints',
            source: new VectorSource({
              features: pointFeatures
            })
          })    
        ]
      })
      this.map.addLayer(layerGroup);
      var col = newStyle.getStroke().getColor()
      this.callback(layerId, filename, trackExtent, col )      
    }

    lastLayerId() {
      return this.map.getLayers().array_.length
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
