import { Colors } from './colors.js'
import Feature from 'ol/Feature.js';
import GPX from 'ol/format/GPX.js'
import {Group as LayerGroup } from 'ol/layer.js'
import VectorLayer from 'ol/layer/Vector.js'
import VectorSource from 'ol/source/Vector.js'
import {styleLine, waypointStyle} from './MapStyles.js'
import { Distance } from './utils.js';

export class TrackHandler {
  /**
   * @param {Object} [map, opt_options] Control options.
   */
  constructor(map, callback) {
    this.map = map
    this.colors = new Colors()
    this.callback = callback
  }

  add(contents, filename) {
    var _this = this
  
    // var MAP = mapRef.map
    try {
      var waypoints = [], featureStyle, features

      // Depents upon file if browed or dragged
      if (typeof contents === 'string') {
        features = new GPX().readFeatures(contents, {
          dataProjection: 'EPSG:4326',
          featureProjection: 'EPSG:3857'
        })
      } else {
        features = contents
      }

      features.map((f) => {
        const type = f.getGeometry().getType().toLowerCase()
        if (type === 'point') {
          waypoints.push(f)
        } else {
          if (type.indexOf('linestring') > -1) {
            // featureStyle = styleLine(e)
            var counter = 0
  
            if (f.getGeometry().getType().toLowerCase() === 'multilinestring') {
              const lns = f.getGeometry().getLineStrings()
              var name = filename
              lns.forEach((linestring) => {
                filename = name + '(' + counter++ + ')'                
                _this.prepareTrack(linestring, 'linestring', filename )
              })
            }  else {
              if (f.getGeometry().getType().toLowerCase() === 'linestring') {
                filename = name + '(' + counter++ + ')'
                _this.prepareTrack(f.getGeometry(), 'linestring', filename )
              }
            }
          }
        }
      })
  
      // Add waypoints to last GPX segment
      if (waypoints.length) {     
        const lastId = lastLayerId(_this.map)
        const layerGroup = _this.findLayer(lastId)
        const waypointsLayer = layerGroup.getLayers().array_.find(l => {
          return l.get('type').toLowerCase() === 'waypoints'
        })
        waypointsLayer.getSource().addFeatures(waypoints)
      }
    } catch (er) {
      console.log(er)
    }
  }

  prepareTrack(geom, type, filename) {
    var vectorSource
    let dist = 0
    let nCoords = 0

    if (type === 'linestring') {
        const f = new Feature({
            geometry: geom
        })

        vectorSource = new VectorSource({
            features: [ f ]
        })

        // Get length in meters, and number of nodes
        var coords = vectorSource.getFeatures()[0].getGeometry().getCoordinates()
        for (var index = 1; index < coords.length; index++) {
            const p1 = coords[index - 1]
            const p2 = coords[index]
            dist += Distance(p1, p2)
            nCoords++
        }
    }
    var layerGroup = this.newLayerGroup(filename, dist, nCoords, vectorSource)
    this.map.addLayer(layerGroup)
    this.callback(layerGroup)
  }

  newLayerGroup(filename, dist, nCoords, vectorSource) {
    const layerId = newLayerId(this.map)
    const newStyle = styleLine()
    const layerGroup = new LayerGroup({
        id: layerId,
        col: newStyle.getStroke().getColor(),
        type: 'group',
        name: filename,
        dist: dist,
        nCoords: nCoords,
        layers: [
          // TRACK
          new VectorLayer({
            parentId: layerId,
            type: 'track',
            source: vectorSource,
            style: newStyle
          }),
          // WAYPOINTS
          new VectorLayer({
            parentId: layerId,
            type: 'waypoints',
            source: new VectorSource({
              features: []
            }),
            style: waypointStyle
          })    
        ]
    })
    return layerGroup
  }

  callback (filename, dist, nCoords, vectorSource) {
    var c = newStyle.getStroke().getColor()
    
    $store.commit('main/addLayerToTOC', {
        id: layerId,
        label: filename,
        visible: true,
        active: false,
        color: c,
        zindex: layerId
    })

    MAP.addLayer(layerGroup)
    $store.commit('main/numLayers', layerId)
    $store.commit('main/activeLayerId', layerId)
    // Better extend map to fit new layer
    MAP.getView().fit(vectorSource.getExtent())    
  }

  findLayer(id) {
    return this.map.getLayers().array_.find((layer) => {
      return layer.get('id') == id
    })
  }

}


const newLayerId = (MAP) => {
  return MAP.getLayers().array_.length + 1
}

const lastLayerId = (MAP) => {
  return MAP.getLayers().array_.length
}
