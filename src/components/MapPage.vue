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

  <!-- CONTEXT MENU -->
  <q-menu
    touch-position
    context-menu
    class="context-menu"
  >
  <q-list dense style="min-width: 100px">
    <q-item clickable v-close-popup v-if="layerIsActive">
      <q-item-section
        title="Activa capa"
        @click="editTimestamp('start')"
      >
        Change timestamp from starting date and time ({{ activeTrackStartTime}})
      </q-item-section>
    </q-item>
  </q-list>
  <q-list dense style="min-width: 100px">
    <q-item clickable v-close-popup v-if="layerIsActive">
      <q-item-section
        title="Activa capa"
        @click="editTimestamp('end')"
      >
        Change timestamp from ending date and time ({{ activeTrackEndTime}})
      </q-item-section>
    </q-item>
  </q-list>
  <q-list dense style="min-width: 100px">
    <q-item clickable v-close-popup v-if="layerIsActive">
      <q-item-section
        title="Activa capa"
        @click="addWaypointStart('layer')"
      >
        Add waypoint to layer
      </q-item-section>
    </q-item>
  </q-list>
  <q-list dense style="min-width: 100px">
    <q-item clickable v-close-popup>
      <q-item-section
        @click="addWaypointStart('map')"
      >
        Add waypoint to map
      </q-item-section>
    </q-item>
  </q-list>
</q-menu>

<!-- INPUT FOR DATE/TIME TIMESTAMP -->
<q-dialog v-model="showModalDateTime" class="dialog-date-time" persistent @keyup.enter="doSubmitEditTimestamp">
  <div class="modal-date-time q-pa-md flex column">
      <div>
        <div>
          <h5>
          Enter DATE and TIME of {{ editTimestampMode }}ing track point
          </h5>
        </div>
        <div class="q-gutter-md row no-wrap items-start">
          <q-date v-model="model" mask="YYYY-MM-DD HH:mm" color="purple" />
          <q-time v-model="model" mask="YYYY-MM-DD HH:mm" color="purple" />
        </div>    
      </div>
    <div class="q-mt-md">
        <q-btn flat label="Cancel" v-close-popup/>
        <q-btn flat label="OK" @click="modifyTimestamp"/>
    </div>
  </div>
</q-dialog>

<!-- CONFIRM -->
<q-dialog v-model="confirm" persistent>
  <q-card class="modal-date-time">
    <q-card-section class="row items-center">
      <h5>
        The timestamp has been updated successfully
      </h5>      
    </q-card-section>

    <q-card-actions align="right">
      <q-btn flat label="OK" color="primary" @click="showModalDateTime=false" v-close-popup />
    </q-card-actions>
  </q-card>
</q-dialog>    

<!-- INPUT FOR WAYPOINT NAME -->
<q-dialog v-model="showInput" persistent @keyup.enter="doSubmit">
  <q-card style="min-width: 350px">
    <q-card-section>
      <div class="text-h6">Waypoint name</div>
    </q-card-section>

    <q-card-section class="q-pt-none">
      <q-input class="wp-name" dense v-model="waypointName" autofocus @keyup.enter="prompt = false" />
    </q-card-section>

    <q-card-actions align="right" class="text-primary add-wp-buttons">
      <q-btn flat label="Cancel" v-close-popup />
      <q-btn flat label="OK" v-close-popup @click="addWayPoint" />
    </q-card-actions>
  </q-card>
</q-dialog>
</template>

<script>
import { ref, watch, onMounted, computed } from "vue";
import { useStore } from 'vuex'
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import {Group as LayerGroup } from 'ol/layer.js'
import {Style, Fill, Icon, Text, Stroke, RegularShape, Circle} from 'ol/style';
import GPX from 'ol/format/GPX.js';
import { Colors, setRandomcolor } from '../js/colors.js';
import { DragTrackFile } from '../js/DragTrackFile';
import { TrackCutter } from '../js/TrackCutter.js';
import { TrackInvers } from '../js/TrackInvers.js';
import { TrackJoin } from '../js/TrackJoin.js';
import { NodesInfo } from '../js/NodesInfo.js';
import { DrawTrack } from '../js/DrawTrack.js';
import { HandDraw } from '../js/HandDraw.js';
import Feature from 'ol/Feature.js';
import Point from 'ol/geom/Point.js';
import LineString from 'ol/geom/LineString.js';
import { transform, transformExtent } from 'ol/proj.js'
import {containsXY} from 'ol/extent';
import { addTrack, addTrackFromFile } from '../js/maputils.js'
import { formatDateTime } from '../js/utils.js'
import { TrackHandler  } from '../js/TrackHandler.js'
import { waypointStyle, waypointSelectedStyle } from 'src/js/MapStyles.js';



export default {
  setup() {
    let activeLayerCoords = undefined
    const $store = useStore()
    const center = ref(transform([ 2.92298, 41.93445 ], 'EPSG:4326', 'EPSG:3857'))
    const projection = ref("EPSG:3857")
    const zoom = ref(14)
    const showInput = ref(false)
    const confirm = ref(false)
    const showModalDateTime = ref(false)
    const editTimestampMode = ref('start')
    const waypointName = ref()
    const rotation = ref(0)
    const waypointMode = ref()
    const model = ref('2023-08-29 21:02')
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
    let rightClickCoords
    let trackHandler

    const newLayerId = function () {
      return ++layerCounter
    }
    let dragAndDropInteraction

    const styleLine = () => {
      return new Style({
        stroke: new Stroke({
          color: gColors.newColor(),
          width: '5'
        })
      })
    }

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

    const activeTrackStartTime = computed(() => {
      const value = $store.getters['main/getActiveLayerInfo'].startTime
      return formatDateTime(new Date(value*1000))
    })

    const activeTrackEndTime = computed(() => {
      const value = $store.getters['main/getActiveLayerInfo'].endTime
      return formatDateTime(new Date(value*1000))
    })

    const layerIsActive = computed(() => {
      return $store.getters['main/activeLayerId']
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

    const findParentLayer = function (id) {
      return map.value.map.getLayers().array_.find((layer) => {
        return layer.get('parentId') == id
      })
    }

    const getCoords = (layer) => {
      return layer.getSource().getFeatures()[0].getGeometry().getCoordinates()
    }

    const changeColor = function (layerId, color) {
      const layerGroup = findLayer(layerId)
      const trackLayer = getLayerFromLayerGroup(layerGroup, 'track')
      trackLayer.getStyle().getStroke().setColor(color)
      trackLayer.setStyle(trackLayer.getStyle())
      trackLayer.set('col', color)

      $store.commit('main/changeLayerColor', {
        layerId,
        color
      })
    }

    const toggleLayer = function (layerId, waypoints) {
      const layerGroup = findLayer(layerId)
      if (!waypoints) {
        layerGroup.setVisible(!layerGroup.getVisible())
        $store.commit('main/toggleLayer', {
          layerId,
          visible: layerGroup.getVisible()
        })
      } else {
        const waypointsLayer = getLayerFromLayerGroup(layerGroup, 'waypoints')
        waypointsLayer.setVisible(!waypointsLayer.getVisible())
        
        $store.commit('main/toggleLayer', {
          layerId,
          waypointsVisible:waypointsLayer.getVisible()
        })        
      }
    }

    const zoomToLayer = function (layerId) {
      const layerGroup = findLayer(layerId)
      const layer = getLayerFromLayerGroup(layerGroup, 'track')
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

    const addPoint = function (coords) {
      coords.reverse()
      var f = new Feature({
        geometry: new Point(transform(coords, 'EPSG:4326', 'EPSG:3857')),
        name: 'waypoint'
      })

      if (activeLayerId.value) {
        const layer = findLayer(activeLayerId.value)
        layer.getSource().addFeature(f)
      }
      markersLayer.getSource().addFeature(f)
      map.value.map.getView().fit(markersLayer.getSource().getExtent());
      map.value.map.getView().setZoom(12)
    }

    function resetSelected() {
      if (toolIsActive) return
      const selected = $store.getters['main/getSelectedWaypoint']
      if (selected.layerId) {      
        const layerGroup = findLayer(selected.layerId)        
        const waypointsLayer = getLayerFromLayerGroup(layerGroup, 'waypoints')
        clearWaypointsStyle(waypointsLayer)
      }

      if (activeLayer) {
        activeLayer.setStyle(previousSelectedStyle)
        activeLayer = false
        $store.commit('main/activeLayerId', null)
      }
    }
    function clickOnMap(event) {
      // In case clicked on nogthing
      console.log(event)
      resetSelected()
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

    // --------
    // LOAD GPX
    // --------

    const addTrackCallback = (layerGroup) => {     
      function compare( a, b ) {
        if ( a.id < b.id ){
          return -1;
        }
        if ( a.id > b.id ){
          return 1;
        }
        return 0;
      }

      const layerId = layerGroup.get('id')
      const layer = getLayerFromLayerGroup(layerGroup, 'track')
      map.value.map.getView().fit(layer.getSource().getExtent())

      const wpLayer = getLayerFromLayerGroup(layerGroup, 'waypoints')
      const wpNames = wpLayer.getSource().getFeatures().map((f) => {
        return {id: f.get('id'), name: f.get('name')}
      })
      wpNames.sort(compare)
      $store.commit('main/activeLayerId',  layerId)
      $store.commit('main/addLayerToTOC', {
        id: layerId,
        label: layerGroup.get('name'),
        visible: true,
        active: true,
        color: layerGroup.get('col'),
        zindex: map.value.map.getLayers().values_.length,
        waypoints: wpNames,
        waypointsVisible: true,
        info: {
          dist: layerGroup.get('dist'),
          startTime: layerGroup.get('startTime'),
          endTime: layerGroup.get('endTime')
        }
      })
    }

    onMounted(() => {
      // Add markers empty layer
      const MAP = map.value.map
      const draggerFile = new DragTrackFile(MAP, openFile)
      trackHandler = new TrackHandler(MAP, addTrackCallback)
      draggerFile.on()

      map.value.map.getViewport().addEventListener('contextmenu', function (evt) {
        evt.preventDefault();
        rightClickCoords = map.value.map.getEventCoordinate(evt)
      })

      $store.commit('main/setZoom', Math.floor(map.value.map.getView().getZoom()))

      map.value.map.on('moveend', updateViewState)
      // map.value.map.on('pointermove', checkPointerMove)
      map.value.map.on('click', clickOnMap)
      map.value.map.on('toolFinished', (event) => {
        $store.commit('main/activeLayerId', null)
        deactivateTool(event.toolname)
      })

      coordsContainer.value = document.getElementById('map-coords')
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
        addTrack(map.value.map, $store, geom, 'linestring', 'Drawn layer')
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
        const layerGroup = findLayer(activeLayerId.value)
        const layer = getLayerFromLayerGroup(layerGroup, 'track')        
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
        $store.commit('main/setProfileIsVisible', true)
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

    const addNewSegment = function (groupLayerId, coords, type) {
      const layer = findLayer(groupLayerId)
      const filename = layer.get('name') + '(' + type + ')'
      const trackinfo = tools.info.getInfoFromCoords(coords, groupLayerId)
      const layerId = newLayerId()

      const layerGroup = new LayerGroup({
        id: layerId,
        name: filename,
        dist: trackinfo.distance,
        elevation: trackinfo.elevation,
        time: trackinfo.time,        
        layers: [
          // TRACK
          new VectorLayer({
            parentId: layerId,
            type: 'track',
            style: styleLine(),
            source: new VectorSource({
              features: [
                new Feature({
                  geometry: new LineString(coords)
                })                
              ]
            })
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

      $store.commit('main/addLayerToTOC', {
        id: layerId,
        label: filename,
        visible: true,
        active: false,
        color: gColors.getColor(),
        zindex: layerId,
        waypoints: [],
        waypointsVisible: true
      })
      map.value.map.addLayer(layerGroup)
    }

    var downloadGPX = function (layerId) {
      const layerGroup = findLayer(layerId)
      const layerTrack = getLayerFromLayerGroup(layerGroup, 'track')
      const layerWP = getLayerFromLayerGroup(layerGroup, 'waypoints')
      var features = layerTrack.getSource().getFeatures()
      if (layerWP.getSource().getFeatures().length) {
        features = [
          ...features, ...layerWP.getSource().getFeatures()
        ]
      }

      var text = new GPX().writeFeatures(
        features,
        {
          featureProjection: 'EPSG:3857',
          dataProjection: 'EPSG:4326'
        }
      );
      download(text, layerTrack.get('name') + '.gpx');
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
        callback: addNewSegment,
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
          $store.commit('main/numberOfDrawnParts', numberOfCoords)
        },
        callbackDrawFeaure: function (linestring) {
          addTrack(map.value.map, $store, linestring, 'linestring', 'drawn track')
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

    const getLinestringFromTrack = (features) => {
      const lineString = features.find(f => {
        return f.getGeometry().getType().toLowerCase().indexOf('linestring') != -1
      })
      return lineString
    }

    const trackProfile = async (layerId) => {
      const layerGroup = findLayer(layerId)
      const layer = getLayerFromLayerGroup(layerGroup, 'track')      
      const features = layer.getSource().getFeatures()
      const linestring = features.find(f => {
        return f.getGeometry().getType().toLowerCase().indexOf('linestring') != -1
      })
     
      const coords = linestring.getGeometry().getCoordinates()
      // map.value.map.once('track-info', showTrackData)
      tools.info.deactivate()
      tools.info.callback = showTrackData
      await tools.info.getInfoFromCoords(coords, layerId)
      tools.info.selectedLayersId = layerId
      activateNodesInfo()
    }

    watch(activeLayerId, ( newValue, oldValue ) => {
      const layerGroup = findLayer(newValue)
      if (layerGroup) {
        const trackLayer = getLayerFromLayerGroup(layerGroup, 'track')
        if (newValue){
          activeLayerCoords = getCoords(trackLayer)
        }
      }
    })

    const getLayerFromLayerGroup = (layerGroup, group) => {
      var trackLayer = null
      trackLayer = layerGroup.getLayers().array_.find(l => {
        return l.get('type') === group
      })
      return trackLayer
    }

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
      const layerGroup = findLayer(activeLayerId.value)
      const layer = getLayerFromLayerGroup(layerGroup, 'track')
      layer.getSource().getFeatures()[0].getGeometry().setCoordinates(coords)
    }

    const addPointToLayer = () => {
      if (!activeLayerId.value) return
      const layerGroup = findLayer(activeLayerId.value)
      const layer = getLayerFromLayerGroup(layerGroup, 'waypoints')
      const newId = layer.getSource().getFeatures().length + 1
      if (rightClickCoords) {
        var newFeature = new Feature({
          geometry: new Point(rightClickCoords),
          name: waypointName.value,
          id: newId
        })
        newFeature.setStyle(waypointStyle(newFeature))
        layer.getSource().addFeature(newFeature)
        
        // Add new point to TOC
        $store.commit('main/addNewWaypoint', {
          id: newId,
          name: waypointName.value,
          layerId: activeLayerId.value
        })
      }
      rightClickCoords = null
      waypointName.value = null
      showInput.value = false
    }   

    const addPointToMap = () => {
      if (rightClickCoords) {
        var newFeature = new Feature({
          geometry: new Point(rightClickCoords),
          name: waypointName.value
        })
        markersLayer.getSource().addFeature(newFeature)
      }
      rightClickCoords = null
      waypointName.value = null
      showInput.value = false
    } 

    const deleteTrack = (layerId) => {
      const layer = findLayer(layerId)
      $store.commit('main/removeLayerFromTOC', layerId)
      map.value.map.removeLayer(layer)
    } 

    const editTimestamp = (mode) => {
      showModalDateTime.value = true
      editTimestampMode.value = mode
    }

    const addWaypointStart = (mode) => {
      waypointMode.value = mode
      showInput.value = true
    }

    const addWayPoint = () => {
      if (waypointMode.value === 'map') {
        addPointToMap()
      } else {
        addPointToLayer()
      }
    }

    const doSubmitEditTimestamp = () => {
      console.log('doSubmitEditTimestamp')
    }

    const doSubmit = () => {
      if (waypointName.value) {
        addWayPoint()
      } else {
        showInput.value = false
      }
    }

    const openFile = (contents, filename) => {
      // addTrackFromFile(map.value.map, $store, contents, filename)
      trackHandler.add(contents, filename)
    }

    const clearWaypointsStyle = (waypoints) => {
      waypoints.getSource().getFeatures().forEach((f) => {
        f.setStyle(waypointStyle)
      })      
    }

    const selectWaypoint = (layerId, waypointId, name) => {
      const selectedWaypoint = $store.getters['main/getSelectedWaypoint']
      const layerGroup = findLayer(layerId)
      const waypointsLayer = getLayerFromLayerGroup(layerGroup, 'waypoints')

      // If waypoint is already selected, then unselect it
      if (selectedWaypoint.layerId === layerId && selectedWaypoint.waypointId === waypointId) {
        clearWaypointsStyle(waypointsLayer)
        $store.commit('main/setSelectedWaypoint', {
          layerId: null,
          waypointId: null,
          name: null
        })        
      } else {
        clearWaypointsStyle(waypointsLayer)
        const selected = waypointsLayer.getSource().getFeatures().find((f) => {
          return f.get('id') == waypointId
        })
        if (selected) {
          selected.setStyle(waypointSelectedStyle(selected))
          $store.commit('main/setSelectedWaypoint', {
            layerId,
            waypointId,
            name
          })
        }
      }
    }

    const deleteWaypoint = (layerId, waypointId) => {
      const layerGroup = findLayer(layerId)
      const waypointsLayer = getLayerFromLayerGroup(layerGroup, 'waypoints')
      clearWaypointsStyle(waypointsLayer)
      const selected = waypointsLayer.getSource().getFeatures().find((f) => {
        return f.get('id') == waypointId
      })
      if (selected) {
        waypointsLayer.getSource().removeFeature(selected)
        $store.commit('main/removedWaypoint', {
          layerId: layerId,
          waypointId: waypointId
        })
        // Decrease 'id' to make them consecutive after removing one feature
        const waypoints = []
        waypointsLayer.getSource().getFeatures().forEach((f) => {
          if (f.get('id') > waypointId) {
            f.set('id', f.get('id') - 1)
          }
          waypoints.push({ id: f.get('id'), name: f.get('name') })
        })
        $store.commit('main/updateLayerWaypoints', { layerId, waypoints })
      }
      unselectdWaypoint()        
    }
    
    const unselectdWaypoint = () => {
      $store.commit('main/setSelectedWaypoint', {
        layerId: null,
        waypointId: null,
        name: null
      })      
    }
    
    const modifyTimestamp = () => {
      const mode = editTimestampMode.value
      const layerGroup = findLayer(activeLayerId.value)
      const layer = getLayerFromLayerGroup(layerGroup, 'track')
      const coords = layer.getSource().getFeatures()[0].getGeometry().getCoordinates()
      const selectedTime = new Date(model.value)
    
      // Get inc in timestamp
      let trackTime
      if (mode === 'end'){
        trackTime = new Date(coords[coords.length -1][3])
      } else {
        trackTime = new Date(coords[0][3])
      }
      // Get elapsed SECONDS between two dates. 
      const incTime  = (selectedTime.getTime() / 1000) - trackTime.getTime()

      // Update track coords
      var edited = coords.map((c) => {
        c[3] += incTime
        return c
      })
      const src = 'EPSG:3857'
      const dest = 'EPSG:4326'
      var ed = edited.map((e) => {
        // return transform([e[0], e[1]], src, dest)
        return [e[0].toFixed(3), e[1].toFixed(3)]
      })
      // const chunkSize = 100;
      // var chunks = lineChunk(lineString(ed), chunkSize, { units: "meters" });

      // Avg distance between track points
      // console.log(layerGroup.get('dist') / layerGroup.get('nCoords'))      

      // Get distance between consecutive track points
      // ed.forEach( (e, idx) => {
      //   var p1 = ed[idx]
      //   var p2 = ed[idx+1]
      //   var alfa = Math.atan((p2[1] - p1[1] / (p2[0] - p1[0])))
      //   var d = ((p2[1] - p1[1]) / Math.sin(alfa)).toFixed(3)
      //   console.log(d)
      // })
      

      layer.getSource().getFeatures()[0].getGeometry().setCoordinates(edited)
      confirm.value = true
    }

    const editWaypoint = (layerId, waypointId, name) => {
      const layerGroup = findLayer(layerId)
      const waypointsLayer = getLayerFromLayerGroup(layerGroup, 'waypoints')
      clearWaypointsStyle(waypointsLayer)
      const selected = waypointsLayer.getSource().getFeatures().find((f) => {
        return f.get('id') == waypointId
      })
      if (selected) {
        selected.set('name', name)
      }
    }

    return {
      model,
      modifyTimestamp,
      confirm,
      editTimestampMode,
      doSubmit,
      doSubmitEditTimestamp,
      editTimestamp,
      selectWaypoint,
      deleteWaypoint,
      editWaypoint,
      openFile,
      waypointName,
      addWayPoint,
      addWaypointStart,
      waypointMode,
      showInput,
      showModalDateTime,
      layerIsActive,
      addPointToLayer,
      addPointToMap,
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
      addTrackFromFile,
      changeColor,
      toggleLayer,
      zoomToLayer,
      projection,
      zoom,
      rotation,
      map,
      coordsContainer,
      activeTrackStartTime,
      activeTrackEndTime,
      deleteTrack
    };
  },
};
</script>
<style scoped>
.ol-viewport,
.ol-unselectable.ol-layers,
.ol-layers,
canvas{
  pointer-events: none !important;
}
.modal-date-time{
  max-height: unset;
  background: white;
  align-items: center;
  min-width: unset;
  max-width: unset;
}
.dialog-date-time{
  min-width: unset;
  max-width: unset;
}
</style>