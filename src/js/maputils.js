import GPX from 'ol/format/GPX.js';
import { styleLine, crossStyle } from './styleLine.js';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import Feature from 'ol/Feature.js';
import { Distance } from './utils.js';

const addTrack = (MAP, $store, geom, type, filename) => {
    var layerStyle
    var vectorSource
    let dist = 0
    let nCoords = 0

    if (type === 'linestring') {
        layerStyle = styleLine()
        const f = new Feature({
            geometry: geom
        })
        f.setStyle(styleLine(f))

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

const addNewLayerToMap = (MAP, $store, filename, dist, nCoords, vectorSource) => {
    const layerId = MAP.getLayers().length + 1
    
    const vectorLayer = new VectorLayer({
        id: layerId,
        name: filename,
        dist: dist,
        nCoords: nCoords,
        source: vectorSource
    })
    var c = vectorSource.getFeatures()[0].getStyle().getStroke().getColor()
    console.log(c)
    $store.commit('main/addLayerToTOC', {
        id: layerId,
        label: filename,
        visible: true,
        active: false,
        color: c,
        zindex: layerId
    })

    MAP.addLayer(vectorLayer)
    $store.commit('main/numLayers', layerId)
    $store.commit('main/activeLayerId', layerId)
    // Better extend map to fit new layer
    MAP.getView().fit(vectorSource.getExtent())    
}

const addTrackFromFile= (mapRef, $store, contents, filename) => {
    console.log(mapRef.map)
    
    var MAP = mapRef.map
    try {
      var waypoints = [], featureStyle
  
      var features = new GPX().readFeatures(contents, {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857'
      })
      features.map((f) => {
        const type = f.getGeometry().getType().toLowerCase()
        if (type === 'point') {
          featureStyle = crossStyle(f)
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
    //   const layer = findLayer(layerCounter)
    //   layer.getSource().addFeatures(waypoints)  
    } catch (er) {
      console.log(er)
    }
  }

  export { addTrack, addTrackFromFile }