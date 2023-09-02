<template>
  <q-layout view="lHh Lpr lFf" class="fit">
    <q-header class="grey-header" elevated>
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          class="main-menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
        />

        <q-toolbar-title>
          <!-- CUTTER -->
          <q-icon
            size="2em"
            name="content_cut"
            class="menu-icon cut"
            :class="cutterClass"
            :title="existsLayers?'Split active layer':'Active a layer first'"
            @click="toggleTool('cutter')"
          />
          <!-- REVERSE -->
          <q-icon
            name="swap_horiz"
            size="2em"
            class="menu-icon invers"
            :class="inversClass"
            :title="existsLayers?'Reverse':'Active a layer first'"
            @click="toggleTool('invers')"
          />
          <!-- JOIN -->
          <q-icon
            name="call_merge"
            size="2em"
            class="menu-icon join"
            :class="joinClass"
            :title="existsLayers?'Join':'Active a layer first'"
            @click="toggleTool('join')"
          />
          <q-icon
            name="fa-solid fa-circle-info"
            size="2em"
            class="shadow-box menu-icon nodesinfo"
            :class="nodesinfoClass"
            :title="existsLayers?'Node info':'Active a layer first'"
            @click="toggleTool('info')"
          />
          <div class="draw-tool">
            <q-icon
              name="edit"
              size="2em"
              class="draw"
              :class="drawClass"
              :title="existsLayers?'Click on map to draw a path':''"
              @click="toggleTool('draw')"
            />
            <q-icon
              name="undo"
              size="2em"
              class="back"
              :class="backClass"
              :title="existsLayers?'Node info':'Active a layer first'"
              @click="toggleTool('back')"
            />
          </div>
          <div class="draw-tool">
            <q-icon
              name="brush"
              size="2em"
              class="draw"
              :class="handDrawClass"
              :title="existsLayers?'Click on map to draw a path':''"
              @click="toggleTool('handDraw')"
            />
            <q-icon
              name="undo"
              size="2em"
              class="back"
              :class="backHandDrawClass"
              :title="existsLayers?'Node info':'Active a layer first'"
              @click="toggleTool('backHandDraw')"
            />
          </div>

          <!-- NODE INFO -->
        </q-toolbar-title>

        <div id="menu-icons" class="flex row">
          <!-- OPEN FILE -->
          <div>
            <input type="file" id="actual-btn" hidden @change="readFile($event)"/>
            <label for="actual-btn">
              <q-icon class="menu-icon folder"  name="folder" size="2em"/>
            </label>
          </div>

          <!-- ADD POINT FROM COORDS -->
          <div class="flex row">
            <q-icon class="menu-icon"  name="filter_tilt_shift" size="2em" @click="addPointClick=!addPointClick"/>
            <transition name="bounce">
              <form v-if="addPointClick" @submit.prevent="addPoint">
                <q-input square standout bg-color="white" borderless dense filled v-model="latLon" label="lat,lon"
                  class=""
                  @input="addPoint"
                />
              </form>
            </transition>
          </div>

          <!-- TERRAIN -->
          <diV>
            <q-icon
              name="terrain"
              square
              size="2em"
              class="menu-icon track-download"
              :class="!activeLayerId?'disabled':''"
              @click="showTrackProfile"
            >
            </q-icon>
          </div>

          <!-- DOWNLOAD -->
          <div>
            <q-icon
              name="file_download"
              square
              size="2em"
              class="menu-icon track-download"
              :class="!activeLayerId?'disabled':''"
              @click.stop.prevent="downloadTrack"
            >
            </q-icon>
          </diV>

        </div>

      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      bordered
    >
      <q-list>
        <q-item-label
          header
        >
        TRACKS
        </q-item-label>

        <gpx-list
          @zoomToLayer="zoomToLayer"
          @toggleLayer="toggleLayer"
          @changeColor="changeColor"
          @finishDrag="finishDrag"
          @downloadTrack="downloadTrack"
          @selectedSegmentCreateTrack="selectedSegmentCreateTrack"
          @overGraphic="overGraphic"
          @trackProfile="trackProfile"
          @clickWaypoint="clickWaypoint"
          @deleteWaypoint="deleteWaypoint"
          @editWaypoint="editWaypoint"
          @deleteTrack="deleteTrack"
        />
      </q-list>
    </q-drawer>

    <q-page-container class="flex column">
      <!-- <drawr-view /> -->
      <div class="flex column fit map-wrapper">
        <div style="flex-grow:1">
          <map-page
            ref="MAP"
          />
        </div>
        <div>
          <modal-track-info 
            ref="GRAPH"
            @selectedSegmentCreateTrack="selectedSegmentCreateTrack"
            @overGraphic="overGraphic"
            @outGraphic="outGraphic"
            @dragOnGraph="dragOnGraph"
            @fillTimeGaps="fillTimeGaps"
          />
        </div>
      </div>


    </q-page-container>
  </q-layout>
</template>

<script>
import { defineComponent, computed, ref, watch } from 'vue'
import { useStore } from 'vuex'
import GpxList from 'components/GpxList.vue'
import MapPage from 'components/MapPage.vue'
import ModalTrackInfo from 'src/components/ModalTrackInfo.vue'

export default defineComponent({
  name: 'MainLayout',
  components: {
    GpxList, MapPage,
    ModalTrackInfo
  },

  setup (props, context) {
    const addPointClick = ref(false)
    const latLon = ref()
    const GRAPH = ref()
    const leftDrawerOpen = ref(false)
    const $store = useStore()
    const MAP = ref()

    const mapZoom = computed(() => {
      return $store.getters['main/getZoom']
    })

    const backClass = computed(() => {
      return (activeTool.value === 'draw' && $store.getters['main/numberOfDrawnParts'] > 0) ? 'enabled' : 'disabled'
    })

    const backHandDrawClass = computed(() => {
      return (activeTool.value === 'handDraw' && $store.getters['main/numberOfDrawnParts'] > 0) ? 'enabled' : 'disabled'
    })

    const drawClass = computed(() => {
      const enable = (mapZoom.value > 12 && !activeLayerId.value )?'enabled':'disabled'
      const active = activeTool.value === 'draw' ? 'active':'inactive'
      return enable + ' ' + active
    })

    const handDrawClass = computed(() => {
      const active = activeTool.value === 'handDraw' ? 'active':'inactive'
      return 'enabled ' + active
    })

    const nodesinfoClass = computed(() => {
      const enable = (numberOfLayers.value > 0)?'enabled':'disabled'
      const active = activeTool.value === 'info' ? 'active':'inactive'
      return enable + ' ' + active
    })

    const joinClass = computed(() => {
      const enable = numberOfLayers.value > 1?'enabled':'disabled'
      const active = activeTool.value === 'join' ? 'active':'inactive'
      return enable + ' ' + active
    })

    const inversClass = computed(() => {
      const enable = numberOfLayers.value?'enabled':'disabled'
      const active = activeTool.value === 'invers' ? 'active':'inactive'
      return enable + ' ' + active
    })

    const cutterClass = computed(() => {
      const enable = numberOfLayers.value?'enabled':'disabled'
      const active = activeTool.value === 'cutter' ? 'active':'inactive'
      return enable + ' ' + active
    })

    const activeTool = computed(() => {
      return $store.getters['main/activeTool']
    })

    const activeLayerId = computed(() => {
      return $store.getters['main/activeLayerId']
    })

    const numberOfLayers = computed(() => {
      return $store.getters['main/numLayers']
    })


    const activeLayerDimensions = computed(() => {
      return $store.getters['main/activeLayerDimensions']
    })

    const existsLayers = computed(() => {
      return $store.getters['main/TOCLayers'].length
    })

    watch(numberOfLayers, ( newValue, oldValue ) => {
      if (oldValue === 0){
        leftDrawerOpen.value = true
      }
    })

    const changeColor = function (data) {
      MAP.value.changeColor(data.layerId, data.color)
    }

    const toggleLayer = function (obj) {
      MAP.value.toggleLayer(obj.layerId, obj.waypoints)
    }

    const zoomToLayer = function (layerId) {
      MAP.value.zoomToLayer(layerId)
    }

    const finishDrag = () => {
      MAP.value.reorderLayers()
    }

    const addPoint = function () {
      let coords = latLon.value.split(',').map(e => e.trim())
      MAP.value.addPoint(coords)
      latLon.value = ''
      setTimeout(function () {
        addPointClick.value = false
      }, 5000)
    }
    function readFile(e) {
      var file = e.target.files[0];
      if (!file) {
        return;
      }
      const reader = new FileReader();
      reader.onload = function(e) {
        var contents = e.target.result;
        // MAP.value.addTrackFromFile(MAP.value.map, $store, contents, file.name)
        MAP.value.openFile(contents, file.name)
      };
      reader.readAsText(file);
    }

    const toggleTool = function (name) {
      // back is a one click tool
      if (['back', 'backHandDraw'].includes(name)) {
        MAP.value.activateTool(name)
        return
      }

      // Otherwise
      const newState = (activeTool.value === name) ? '' : name
      $store.commit('main/activeTool', newState)
      if (newState !== '') {
        MAP.value.activateTool(name)
      } else {
        MAP.value.deactivateTool(name)
      }
    }

    const downloadFile = () => {
      MAP.value.downloadGPX()
    }

    const downloadTrack = () => {
      MAP.value.downloadGPX(activeLayerId.value)
    }

    const selectedSegmentCreateTrack = async (payload) => {
      console.log('layout calls map')
      const type = 'segment'
      console.log('main layout add new segment')
      await MAP.value.addNewSegmentFromGraph(activeLayerId.value, type)
      MAP.value.tools.info.cleanSegment()
    }

    const outGraphic = () => {
      // MAP.value.clearAnimatedPoint()
    }

    const overGraphic = (data) => {
      MAP.value.drawPointFromGraphic(data)
    }

    const dragOnGraph = (payload) => {
      MAP.value.dragOnGraph(payload)
    }

    const fillTimeGaps = () => {
      MAP.value.fillTimeGaps()
    }

    const showTrackProfile = () => {
      const layerId = activeLayerId.value
      // context.emit('track-profile', layerId)
      zoomToLayer(layerId)
      setActiveLayer(layerId)
      MAP.value.trackProfile(layerId)
      GRAPH.value.clearGraphSelection()
    }
  
    const deleteTrack = (layerId) => {
      MAP.value.deleteTrack(layerId)
    }
  
    const clickWaypoint = ({layerId, waypointId, name}) => {
      MAP.value.selectWaypoint(layerId, waypointId, name)
    }
  
    const deleteWaypoint = ({layerId, waypointId}) => {
      MAP.value.deleteWaypoint(layerId, waypointId)
    }
  
    const editWaypoint = ({layerId, waypointId, name}) => {
      MAP.value.editWaypoint(layerId, waypointId, name)
    }
  
    const setActiveLayer = (index) => {
      $store.commit('main/activeLayerId', index)
      $store.commit('main/setActiveLayer', index)
    }

    return {
      GRAPH,
      clickWaypoint,
      deleteWaypoint,
      editWaypoint,
      downloadTrack,
      showTrackProfile,
      fillTimeGaps,
      dragOnGraph,
      outGraphic,
      overGraphic,
      downloadFile,
      selectedSegmentCreateTrack,
      numberOfLayers,
      existsLayers,
      drawClass,
      handDrawClass,
      backClass,
      backHandDrawClass,
      nodesinfoClass,
      cutterClass,
      inversClass,
      joinClass,
      addPoint,
      toggleTool,
      addPointClick,
      latLon,
      MAP,
      finishDrag,
      changeColor,
      toggleLayer,
      zoomToLayer,
      leftDrawerOpen,
      readFile,
      toggleLeftDrawer () {
        leftDrawerOpen.value = !leftDrawerOpen.value
      },
      activeLayerId,
      deleteTrack
    }
  }
})
</script>

<style lang="scss">
html,
body,
.q-page-container{
  height: 100%;
}

#q-app{
  height: 100%;
}
.map-coords{
  display: none;
}

.menu-icon{
  color: white;  
  cursor: pointer;
  padding: 3px;
  border: 1px solid white;
  margin: 3px;
  // background: $inactive-color;
}

.menu-icon:hover{
  color: $active;
  background: white;
}
.drawtool .draw.enabled,
.menu-icon.nodesinfo.enabled,
.menu-icon.join.enabled,
.menu-icon.invers.enabled,
.menu-icon.cut.enabled{
  cursor: pointer;
}

.draw-tool .draw.active,
.menu-icon.nodesinfo.active,
.menu-icon.join.active,
.menu-icon.invers.active,
.menu-icon.cut.active{
  color: red;
  border: 1px solid grey;
  background: white;
}

// .menu-icon.cut.inactive{
//   color: unset;
// }

.draw-tool .draw:not(.enabled),
.menu-icon.nodesinfo:not(.enabled),
.menu-icon.join:not(.enabled),
.menu-icon.invers:not(.enabled),
.menu-icon.cut:not(.enabled){
  opacity: 0.3;
  cursor: not-allowed;
  // pointer-events: none;
  // color: unset;
}

.draw-tool{
  display: inline-flex;
  align-items: center;
  justify-content: center;
  vertical-align: middle;
  border: 1px solid white;
  padding: 3px;
}
// TRANSITIONS
.bounce-enter-active {
  animation: bounce-in 0.5s;
}
.bounce-leave-active {
  animation: bounce-in 0.5s reverse;
}
@keyframes bounce-in {
  0% {
    transform: scale(0);
  }
  50% {
    transform: scale(1.25);
  }
  100% {
    transform: scale(1);
  }
}
.grey-header{
  background: #ccc;
}
.map-wrapper{
  max-height: 100%;
}
  </style>