import GPX from 'ol/format/GPX.js';
import { styleLine, waypointStyle } from './MapStyles.js';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import Feature from 'ol/Feature.js';
import { Distance } from './utils.js';
import {Group as LayerGroup } from 'ol/layer.js'

const addTrack = (MAP, $store, geom, type, filename) => {
    var layerStyle
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

    addNewLayerToMap(MAP, $store, filename, dist, nCoords, vectorSource)
}

const newLayerId = (MAP) => {
  return MAP.getLayers().array_.length + 1
}

const lastLayerId = (MAP) => {
  return MAP.getLayers().array_.length
}

const addNewLayerToMap = (MAP, $store, filename, dist, nCoords, vectorSource) => {
    const layerId = newLayerId(MAP)
    const newStyle = styleLine()
    const layerGroup = new LayerGroup({
        id: layerId,
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
            })
          })    
        ]
    })
    var c = newStyle.getStroke().getColor()
    
    $store.commit('main/addLayerToTOC', {
        id: layerId,
        label: filename,
        visible: true,
        active: false,
        color: c,
        zindex: layerId,
        waypoints:[],
        waypointsVisible: true
    })

    MAP.addLayer(layerGroup)
    $store.commit('main/numLayers', layerId)
    $store.commit('main/activeLayerId', layerId)
    // Better extend map to fit new layer
    MAP.getView().fit(vectorSource.getExtent())    
}

const addTrackFromFile= (MAP, $store, contents, filename) => {
  var pointFeatures = [], trackFeature = []

  // var MAP = mapRef.map
  try {
    var waypoints = [], featureStyle

    var features = new GPX().readFeatures(contents, {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:3857'
    })
    features.map((f) => {
      const type = f.getGeometry().getType().toLowerCase()
      if (type === 'point') {
        featureStyle = waypointStyle(f)
        f.setStyle(featureStyle)
        waypoints.push(f)
      } else {
        if (type.indexOf('linestring') > -1) {
          // featureStyle = styleLine(e)
          var counter = 0

          if (f.getGeometry().getType().toLowerCase() === 'multilinestring') {
            const lns = f.getGeometry().getLineStrings()
            var name = filename
            lns.forEach((linestring) => {
              addTrack(MAP, $store, linestring, 'linestring', filename )
              filename = name + '(' + counter++ + ')'
            })
          }  else {
            if (f.getGeometry().getType().toLowerCase() === 'linestring') {
              addTrack(MAP, $store, f.getGeometry(), 'linestring', filename )
              filename = name + '(' + counter++ + ')'
            }
          }
        }
      }
    })

    // Add waypoints to last GPX segment
    if (waypoints.length) {     
      const lastId = lastLayerId(MAP)
      const layerGroup = findLayer(MAP, lastId)
      const waypointsLayer = layerGroup.getLayers().array_.find(l => {
        return l.get('type').toLowerCase() === 'waypoints'
      })
      waypointsLayer.getSource().addFeatures(waypoints)  
    }
  } catch (er) {
    console.log(er)
  }
}

const findLayer = function (MAP, id) {
  return MAP.getLayers().array_.find((layer) => {
    return layer.get('id') == id
  })
}

export { addTrack, addTrackFromFile, findLayer }