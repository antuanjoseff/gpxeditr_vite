<template>
  <ol-map
    ref='map'
    :loadTilesWhileAnimating="true"
    :loadTilesWhileInteracting="true"
    style="height:100%"
  >
    <ol-view
      ref="view"
      :center="center"
      :rotation="rotation"
      :zoom="zoom"
      :projection="projection"
      :constrainResolution=true
    />

    <ol-tile-layer>
      <ol-source-osm />
    </ol-tile-layer>

    <ol-mouseposition-control className="" :target="coordsContainer"/>
    <ol-fullscreen-control />
  </ol-map>
</template>

<script>
import { ref, watch, onMounted, computed } from "vue";
import { useStore } from 'vuex'
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import {Style, Fill, Icon, Text, Stroke, RegularShape, Circle} from 'ol/style';
import GPX from 'ol/format/GPX.js';
import OSMXML from 'ol/format/OSMXML.js';
import DragAndDrop from 'ol/interaction/DragAndDrop.js';
import { Colors, setRandomcolor } from '../js/colors.js';
import { TrackCutter } from '../js/TrackCutter.js';
import { TrackInvers } from '../js/TrackInvers.js';
import { TrackJoin } from '../js/TrackJoin.js';
import { NodesInfo } from '../js/NodesInfo.js';
import { DrawTrack } from '../js/DrawTrack.js';
import { HandDraw } from '../js/HandDraw.js';
import { Distance } from '../js/utils.js';
import Feature from 'ol/Feature.js';
import Point from 'ol/geom/Point.js';
import LineString from 'ol/geom/LineString.js';
import MultiLineString from 'ol/geom/MultiLineString.js';
import { transform, transformExtent } from 'ol/proj.js'
import {containsXY} from 'ol/extent';

export default {
  setup() {
    let activeLayerCoords = undefined
    const $store = useStore()
    const center = ref(transform([ 2.92298, 41.93445 ], 'EPSG:4326', 'EPSG:3857'));
    const projection = ref("EPSG:3857");
    const zoom = ref(14);
    const rotation = ref(0);
    const map = ref(null)
    const coordsContainer = ref()
    let markersLayer
    let previousSelectedStyle
    let toolIsActive = false
    let tools = {}
    let activeLayer
    let styleCache =[]
    let curZoom = zoom.value
    const gColors = new Colors()
    let layerCounter = 10 // Avoid 0 value
  
    const newLayerId = function () {
      return layerCounter++
    }

    const styleLine = () => {
      return new Style({
        stroke: new Stroke({
          color: gColors.newColor(),
          width: '5'
        })
      })
    }

    const crossStyle = new Style({
      image: new RegularShape({
        fill: new Fill({color: 'red'}),
        stroke: new Stroke({color: 'black', width: 2}),
        points: 4,
        radius: 10,
        radius2: 0,
        angle: Math.PI / 4
      })
    })

    const selectedStyle = new Style({
      fill: new Fill({
        color: 'yellow',
      }),
      stroke: new Stroke({
        color: 'yellow',
        width: '7'
      })
    })

    const drawStyle = new Style({
      fill: new Fill({
        color: 'red',
      }),
      stroke: new Stroke({
        color: 'red',
        width: '4'
      })
    })

    const directionStyle = function(feature, resolution) {
      if (styleCache[resolution]) return styleCache[resolution];
      if (defaultResolution === 0) defaultResolution = resolution;

      const delta = (defaultResolution/resolution)*numberArrowbyKm;

      const styles = [
        new Style({
          stroke: new Stroke({
            color: 'red',
            width: 4
          })
        })
      ];
      // var sourceProj = map.value.map.getView().getProjection();
      var length = 0;

      for( var i = 0; i < feature.getGeometry().getCoordinates().length; i++){

        var s= feature.getGeometry().getCoordinates()[i];
        // var c1 = transform([s[0], s[1]], sourceProj, 'EPSG:4326');
        var c1 = [s[0], s[1]]

        if (i+1 < feature.getGeometry().getCoordinates().length) {
          var f = feature.getGeometry().getCoordinates()[i+1];
          // var c2 = transform([f[0], f[1]], sourceProj, 'EPSG:4326');
          var c2 = [f[0], f[1]]
          length += projDistance(c1, c2)
        }

        if (length>=(1000/delta)) {
          var dx = s[0] - f[0];
          var dy = s[1] - f[1];
          var rotation = Math.atan2(dy, dx);
          styles.push(new Style({
          geometry: new Point([f[0],f[1]]),
            image: new Icon({
              src: '//openlayers.org/en/latest/examples/data/arrow.png',
              anchor: [0.75, 0.5],
              rotateWithView: false,
              rotation: -rotation
            })
          }));
          length = 0;
        }
      }
      styleCache[resolution] = styles;
      return styles;
    }

    const toleranceForElevationGain = computed(() => {
      return $store.getters['main/toleranceForElevationGain']
    })

    const activeLayerId = computed(() => {
      return $store.getters['main/activeLayerId']
    })

    const numberArrowbyKm = 1
    let defaultResolution = 0

    const findLayer = function (id) {
      return map.value.map.getLayers().array_.find((layer) => {
        return layer.get('id') == id
      })
    }

    const getCoords = (layer) => {
      return layer.getSource().getFeatures()[0].getGeometry().getCoordinates()
    }

    const changeColor = function (layerId, color) {
      const layer = findLayer(layerId)
      layer.getStyle().getStroke().setColor(color)
      layer.setStyle(layer.getStyle())
      $store.commit('main/changeLayerColor', {
        layerId,
        color
      })
    }

    const toggleLayer = function (layerId) {
      const layer = findLayer(layerId)
      layer.setVisible(!layer.getVisible())
      $store.commit('main/toggleLayer', {
        layerId,
        visible: layer.getVisible()
      })
    }

    const zoomToLayer = function (layerId) {
      const layer = findLayer(layerId)
      map.value.map.getView().fit(layer.getSource().getExtent(), { duration: 1000 });
    }

    const reorderLayers = function () {
      const lProperties = $store.getters['main/TOCLayers']
      lProperties.forEach((layer) => {
        const L = findLayer(layer.id)
        L.setZIndex(layer.zindex)
      })
      map.value.render()
    }

    const addGpxLayerFromFile = function (contents, filename) {
      try {
        var features = new GPX().readFeatures(contents, {
          dataProjection: 'EPSG:4326',
          featureProjection: 'EPSG:3857'
        })
        let linestrigs = []
        let points = []
        features.forEach((f) => {
          if (f.getGeometry().getType().toLowerCase() === 'point') {
            points.push(f)
          }
        })
        console.log(points)
        features.forEach((f) => {
          if (f.getGeometry().getType().toLowerCase() === 'multilinestring') {
            const lns = f.getGeometry().getLineStrings()
            var counter = 0
            var name = filename
            lns.forEach(linestring => {
              addLayerFromFeature(linestring, 'linestring', filename)
              filename = name + '(' + counter++ + ')'
            })
          } else {
            if (f.getGeometry().getType().toLowerCase() === 'point') {
              addLayerFromFeature(f.getGeometry().getCoordinates(), 'point', filename)
            }
          }
        })

      } catch (er) {
        console.log(er)
      }
    }

    const addLayerFromFeature = (geom, type, filename) => {
      var layerStyle
      var vectorSource
      let dist = 0
      let nCoords = 0

      if (type === 'point') {
        layerStyle = crossStyle
        vectorSource = new VectorSource({
          features: [
            new Feature({
              geometry: new Point(geom),
            })
          ]
        })
      } else {
        if (type === 'linestring') {
          layerStyle = styleLine()
          vectorSource = new VectorSource({
            features: [
              new Feature({
                geometry: geom
              })
            ]
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
      }


      const layerId = newLayerId()
      // Do not count base layer
      const numberOfLayers = map.value.map.getLayers().values_.length  - 1

      const vectorLayer = new VectorLayer({
        id: layerId,
        name: filename,
        dist: dist,
        nCoords: nCoords,
        source: vectorSource,
        style: layerStyle,
        // style: directionStyle,
        zIndex: (type==='point')?(layerId*20):''
      })

      if (type !== 'point') {
        $store.commit('main/addLayerToTOC', {
          id: layerId,
          label: filename,
          visible: true,
          active: false,
          color: gColors.getColor(),
          zindex: numberOfLayers
        })
      }

      map.value.map.addLayer(vectorLayer)
      $store.commit('main/numLayers', numberOfLayers)
      // Better extend map to fit new layer
      map.value.map.getView().fit(vectorSource.getExtent())
    }

    const addPoint = function (coords) {
      coords.reverse()
      var f = new Feature({
        geometry: new Point(coords),
      })
      markersLayer.getSource().addFeature(f)
      map.value.map.getView().fit(markersLayer.getSource().getExtent());
      map.value.map.getView().setZoom(12)
    }

    function resetSelected() {
      if (activeLayer && !toolIsActive) {
        activeLayer.setStyle(previousSelectedStyle)
        activeLayer = false
        $store.commit('main/activeLayerId', null)
      }
    }
    function clickOnMap(event) {
      // In case clicked on nogthing
      if (toolIsActive) return
      resetSelected()
      map.value.map.forEachFeatureAtPixel(event.pixel, function (feature, layer) {
        if (activeLayer) {
          activeLayer.setStyle(previousSelectedStyle)
        }
        previousSelectedStyle = layer.getStyle()
        activeLayer = layer
        layer.setStyle(selectedStyle)
        $store.commit('main/activeLayerId', layer.get('id'))
        $store.commit('main/activeLayerDimensions', getLayerDimensions(layer))
      })
    }

    function getLayerDimensions(layer) {
      return layer.getSource().getFeatures()[0].getGeometry().getCoordinates()[0].length
    }

    function checkPointerMove(e) {
      map.value.map.on('pointermove', function (event) {
        const hit = this.forEachFeatureAtPixel(event.pixel, function (feature, layer) {
          return true
        }, { hitTolerance: 10 })
        if (hit) {
          this.getTargetElement().style.cursor = 'pointer'
        } else {
          this.getTargetElement().style.cursor = ''
        }
      })
    }

    function addDragDropInteraction() {
      var dragAndDropInteraction = new DragAndDrop({
        formatConstructors: [
          GPX,
          OSMXML
        ],
      });
      dragAndDropInteraction.on('addfeatures', function (event) {
        try{
          const filename = event.file.name
          var layerStyle
          event.features.map((e)=>{
            const type = e.getGeometry().getType().toLowerCase()
            if (type === 'point') {
              // e.setStyle(stylePoint(e))
              // e.setStyle([])
              layerStyle = []
            } else {
              if (type.indexOf('linestring') > -1) {
                layerStyle = styleLine(e)
                // e.setStyle(styleLine(e))
              }
            }
          })

          const vectorSource = new VectorSource({
            features: event.features,
          });
          const layerID = newLayerId()
          const vectorLayer = new VectorLayer({
              id: layerID,
              source: vectorSource,
              style: layerStyle
            })

          map.value.map.addLayer(vectorLayer);
          $store.commit('main/addLayerIds',  layerID)
          $store.commit('main/addLayerToTOC', {
            id: layerID,
            label: filename,
            // layer: vectorLayer,
            visible: true,
            active: false,
            color: gColors.getColor(),
            zindex: map.value.map.getLayers().values_.length
          })
          map.value.map.getView().fit(vectorSource.getExtent());
        } catch (e) {
          console.log(e)
        }
      });

      map.value.map.addInteraction(dragAndDropInteraction);
    }

    onMounted(() => {
      // Add markers empty layer
      $store.commit('main/setZoom', Math.floor(map.value.map.getView().getZoom()))
      markersLayer = new VectorLayer({
        source: new VectorSource(),
        style: crossStyle
      });
      map.value.map.addLayer(markersLayer)

      map.value.map.on('moveend', updateViewState)
      // map.value.map.on('pointermove', checkPointerMove)
      // map.value.map.on('click', clickOnMap)
      map.value.map.on('toolFinished', (event) => {
        $store.commit('main/activeLayerId', null)
        deactivateTool(event.toolname)
      })

      coordsContainer.value = document.getElementById('map-coords')
      addDragDropInteraction()
      initTools()
    })

    const updateViewState = (e) => {
      const newZoom = map.value.map.getView().getZoom()
      if (curZoom < newZoom) {
        $store.commit('main/setZoom', newZoom)
      }
    }

    const layerInMap = (layer) => {
      return map.value.map.getLayers().getArray().includes(layer)
    }

    const activateTool = (tool) => {
      toolIsActive = true
      if (tool !== 'back' && tool !== 'backHandDraw') {
          for (var key in tools) {
          tools[key].deactivate()
        }
      }
      // Hide panel info
      $store.commit('main/setTrackInfo', {})
      switch (tool) {
        case 'cutter':
          activeCutter()
          break
        case 'invers':
          activateInvers()
          break
        case 'join':
          activateJoin()
          break
        case 'info':
          activateNodesInfo()
          break
        case 'draw':
          activateDrawTrack()
          break
        case 'handDraw':
          activateHandDraw()
          break
        case 'back':
          tools.draw.back()
          break
        case 'backHandDraw':
          tools.handDraw.back()
          break
      }
    }

    const deactivateTool = (name) => {
      toolIsActive = false
      $store.commit('main/activeLayerId', false)
      $store.commit('main/activeTool', '')
      resetSelected()
      switch (name) {
        case 'join':
          tools.join.deactivate()
          break
        case 'cutter':
          tools.cutter.deactivate()
          break
        case 'invers':
          tools.invers.deactivate()
          break
        case 'info':
          tools.info.deactivate()
          // map.value.map.un('track-info', showTrackData)
          map.value.map.un('unselect-track', unselectSegment)
          $store.commit('main/setTrackInfo', {
            distance:undefined,
            time:undefined,
            elevation:undefined
          })
          break
        case 'draw':
          draw.deactivate()
          map.value.map.un('drawn-part', listenDrawnParts)
          break
        case 'handDraw':
          tools.handDraw.deactivate()
          break
      }
    }

    const listenDrawnParts = (e) => {
      if (e.finished){
        var geom = new LineString(e.coords)
        addLayerFromFeature(geom, 'linestring', 'Drawn layer')
        tools.draw.reset()
        $store.commit('main/numberOfDrawnParts', 0)
      } else {
        $store.commit('main/numberOfDrawnParts', e.nparts)
      }
    }

    const activateDrawTrack = () => {
      map.value.map.on('drawn-part', listenDrawnParts)
      tools.draw.activate()
    }

    const activateJoin = () => {
      tools.join.activate()
    }

    const activateHandDraw = () => {
      tools.handDraw.activate()
    }

    const activateNodesInfo = () => {
      if (activeLayerId.value) {
        const layer = findLayer(activeLayerId.value)
        const coords = getCoords(layer)
        tools.info.initCoords = coords
        tools.info.selectedLayerId = activeLayerId.value
      }
      tools.info.callback = showTrackData
      tools.info.activate()
      $store.commit('main/activeTool', 'info')
      map.value.map.on('unselect-track', unselectSegment)
    }

    const unselectSegment = () => {
      $store.commit('main/segmentIsSelected', false)
      $store.commit('main/setTrackInfo', $store.getters['main/ActiveLayerTrackInfo'])
    }

    const updateGraphData = function (payload) {
      const data = {
        distance: payload.distance,
        time: payload.time,
        elevation: payload.elevation,
        speed: payload.speed
      }
      if (payload.data) {
        data.data = payload.data
        data.name = payload.name
      }
      $store.commit('main/setTrackInfo', data)
      $store.commit('main/graphSelectedRange', payload.indexes)
      $store.commit('main/segmentIsSelected', true)
    }

    const segmentIsSelected = computed(() => {
      return $store.getters['main/segmentIsSelected']
    })

    watch(toleranceForElevationGain, ( newValue, oldValue ) => {
      const range = $store.getters['main/graphSelectedRange']
      tools.info.changeTolerance(newValue, range.first, range.last)
    })

    watch(segmentIsSelected, ( newValue, oldValue ) => {
      if (!newValue) {
        tools.info.selectedSegmentLayer.getSource().getFeatures()[0].getGeometry().setCoordinates([[]])
      }
    })

    const showTrackData = function (payload) {
      updateGraphData(payload)
      // UPDATE GRAPH DATA
      if (!payload.elevations) {
        updateGraphData(payload)
        return
      } else {
        activeLayerCoords = tools.info.initCoords
        $store.commit('main/ActiveLayerTrackInfo', payload)
        // $store.commit('main/activeLayerId', payload.layerId)
      }
      const datasets = []
      if (payload.speed.length) {
        datasets.push ({
          label: 'Speed ',
          data: payload.speed,
          fill: true,
          borderColor: 'rgb(0,0,255, .3)',
          backgroundColor: 'rgb(0, 0, 255, 0.2)',
          borderWidth: '.5',
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: 'black',
          tension: 0.2,
          yAxisID: 'speed'
          })
      }

      datasets.push({
        label: 'Altitud ',
        yAxisID: 'altitud',
        backgroundColor: 'rgb(255, 50, 50, 0.6)',
        data: payload.elevations,
        fill: true,
        borderWidth: 15,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: 'black',
        tension: 0.2
      })
      $store.commit('main/graphData', {
        labels: payload.distances,
        datasets: datasets
      })
    }

    const activateInvers = () => {
      tools.invers.activate()
    }

    const activeCutter = () => {
      tools.cutter.activate()
    }

    const addNewSegmentFromGraph = function (fromLayerId, type) {
      var coords = tools.info.selectedSegmentLayer.getSource().getFeatures()[0].getGeometry().getCoordinates()
      addNewSegment(fromLayerId, coords, type)
    }

    const addNewSegment = function (fromLayerId, coords, type) {
      console.log(fromLayerId)
      const layer = findLayer(fromLayerId)
      const filename = layer.get('name') + '(' + type + ')'
      const trackinfo = tools.info.getInfoFromCoords(coords, fromLayerId)
      const layerId = newLayerId()

      var newLayer = new VectorLayer({
        id: layerId,
        name: filename,
        dist: trackinfo.distance,
        elevation: trackinfo.elevation,
        time: trackinfo.time,
        source: new VectorSource({
          features: [
            new Feature({
              geometry: new LineString(coords)
            })
          ]
        }),
        style: styleLine()
      })

      $store.commit('main/addLayerToTOC', {
        id: layerId,
        label: filename,
        visible: true,
        active: false,
        color: gColors.getColor(),
        zindex: layerId
      })
      map.value.map.addLayer(newLayer)
    }

    var downloadGPX = function (layerId) {
      const layer = findLayer(layerId)
      var features = layer.getSource().getFeatures()
      console.log(features.length)
      var coords = []
      features.forEach(element => {
        console.log(element.getGeometry().getType())
        coords = [...coords, ...element.getGeometry().getCoordinates()]
      });
      var text = new GPX().writeFeatures(
        // route_layer.getSource().getFeatures(),
        [new Feature({
          geometry: new MultiLineString([coords]),
        })],
        {
          featureProjection: 'EPSG:3857',
          dataProjection: 'EPSG:4326'
        }
      );
      download(text, layer.get('name') + '.gpx');
    };

    const download = (data, filename) => {
      var blob = new Blob([data], {type: 'text/plain'});
      if (navigator.msSaveBlob) {
        navigator.msSaveBlob(blob, filename);
      } else {
        var link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
      }
    }

    const initTools = function () {
      let cutter = new TrackCutter(map.value.map, {
        callback: addNewSegment
      })
      tools.cutter = cutter

      let draw = new DrawTrack(map.value.map, {
        drawStyle: drawStyle
      })
      tools.draw = draw

      let join = new TrackJoin(map.value.map, {
        // activeLayerCoords: activeLayer.getSource().getFeatures()[0].getGeometry().getCoordinates(),
        // activeLayerId: activeLayer.get('id'),
        callback: function (coords, selectedLayersId) {
          if (!selectedLayersId.length) {
            return
          }
          const layerToModify = findLayer(selectedLayersId[0])
          selectedLayersId.shift()
          selectedLayersId.forEach((layerId) => {
            const layerToRemove = findLayer(layerId)
            map.value.map.removeLayer(layerToRemove)
            $store.commit('main/removeTOCLayer', layerId)
          })
          layerToModify.getSource().getFeatures()[0].getGeometry().setCoordinates(coords)
        },
        styles: styleLine
      })
      tools.join = join

      let info = new NodesInfo(map.value.map)
      tools.info = info

      let invers = new TrackInvers(map.value.map, {
        // activeLayer,
        // coords: activeLayer.getSource().getFeatures()[0].getGeometry().getCoordinates(),
        callback: function (newCoords, activeLayer) {
          let index = 0
          let animation
          let increment
          const n = newCoords.length
          const duration = 1000
          let nLoops = duration / 50 // 50ms between
          increment = n /nLoops

          function addCoord() {
            index += increment
            activeLayer.getSource().getFeatures()[0].getGeometry().setCoordinates(newCoords.slice(0,index))
            if (index >= n) {
              clearInterval(animation)
            }
          }

          activeLayer.setStyle(previousSelectedStyle)
          activeLayer.getSource().getFeatures()[0].getGeometry().setCoordinates(newCoords)

          animation = setInterval(addCoord, 50)
        }
      })
      tools.invers = invers

      let handDraw = new HandDraw(map.value.map, {
        coordsCounter: (numberOfCoords) => {
          console.log(numberOfCoords)
          $store.commit('main/numberOfDrawnParts', numberOfCoords)
        },
        callbackDrawFeaure: function (linestring) {
          addLayerFromFeature(linestring, 'linestring', 'drawn track')
        }
      })
      tools.handDraw = handDraw
    }

    let debounce;
    let time = 50

    const drawPointFromGraphic = (index) => {
      window.clearTimeout(debounce);
      var coord = tools.info.initCoords[index]
      tools.info.setSelectedNode(coord)
      var extent = map.value.map.getView().calculateExtent(map.value.map.getSize())
      if (!containsXY(extent, coord[0], coord[1])) {
        debounce = window.setTimeout(() => {
          flyTo(coord)
        }, time);
      }
    }

    // Animation to move map to coordinates
    function flyTo (location) {
      const duration = 2000
      map.value.map.getView().animate({ center: location, duration: duration })
    }

    const trackProfile = async (layerId) => {
      const layer = findLayer(layerId)
      const coords = getCoords(layer)
      // map.value.map.once('track-info', showTrackData)
      tools.info.deactivate()
      tools.info.callback = showTrackData
      await tools.info.getInfoFromCoords(coords, layerId)
      tools.info.selectedLayersId = layerId
      activateNodesInfo()
    }

    watch(activeLayerId, ( newValue, oldValue ) => {
      const l = findLayer(newValue)
      if (newValue){
        activeLayerCoords = getCoords(findLayer(newValue))
      }
    })

    const dragOnGraph = ( { startIndex, endIndex }) => {
      let coords
      if (startIndex <= endIndex) {
        coords = activeLayerCoords.slice(startIndex, endIndex)
      } else {
        coords = activeLayerCoords.slice(endIndex, startIndex)
      }
      tools.info.selectedSegmentLayer.getSource().getFeatures()[0].getGeometry().setCoordinates(coords)
      tools.info.startIndex = startIndex
      tools.info.endIndex = endIndex
      tools.info.callback = updateGraphData
      tools.info.sumUp(startIndex, endIndex)
    }

    const fillTimeGaps = async() => {
      var coords = await tools.info.fillTimeGaps()
      const layer = findLayer(activeLayerId.value)
      layer.getSource().getFeatures()[0].getGeometry().setCoordinates(coords)
    }

    return {
      dragOnGraph,
      trackProfile,
      fillTimeGaps,
      drawPointFromGraphic,
      center,
      tools,
      downloadGPX,
      addNewSegment,
      addNewSegmentFromGraph,
      activateTool,
      deactivateTool,
      activeCutter,
      addPoint,
      reorderLayers,
      addGpxLayerFromFile,
      changeColor,
      toggleLayer,
      zoomToLayer,
      projection,
      zoom,
      rotation,
      map,
      coordsContainer
    };
  },
};
</script>