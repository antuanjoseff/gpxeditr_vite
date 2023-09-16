<template>
  <div v-if="data.length" class="tracks-list">
    <draggable
      v-model="data"
      item-key="id"
      handle=".handle"
      ghost-class="ghost"
      animation=450
    >
      <template #item="{ element }">
        <div class="drag-item" 
        :class="activeLayerId==element.id || element.active?'active':''" @click="setActiveLayer(element.id)"
        >
          <q-item tag="div" v-ripple class="q-pr-xs" style="align-items: center;">
            <q-item-section style="flex-grow: 5;">
              <div class="flex row">
                <div @click.stop>
                  <div>
                    <input
                      :id="'color-picker_' + element.id"
                      type="color"
                      value="element.color"
                      @input="changeColor($event, element.id)" hidden
                    />
                  </div>
                  <label :for="'color-picker_' + element.id">
                    <q-icon
                      class="toc-layer-icon palette q-mr-sm"
                      :style="{color:element.color,background:element.color}"
                      name="square"/>
                  </label>
                </div>                       
                <q-icon
                  v-if="element.visible==true"
                  class="toc-layer-icon q-mr-sm"
                  name="visibility"
                  @click.stop.prevent="toggleVisibility(element, element.id)"
                />
                <q-icon
                  v-else
                  class="toc-layer-icon q-mr-sm"
                  name="visibility_off"
                  @click.stop.prevent="toggleVisibility(element, element.id)"
                />
                <q-icon
                  v-if="element.waypoints.length && element.waypointsVisible"
                  class="toc-layer-icon q-mr-sm gps_fixed"
                  name="gps_fixed"
                  @click.stop.prevent="toggleVisibility(element, element.id, 'waypoints')"
                />
                <q-icon
                  v-if="element.waypoints.length && !element.waypointsVisible"
                  class="toc-layer-icon q-mr-sm off gps_off"
                  name="gps_off"
                  @click.stop.prevent="toggleVisibility(element, element.id, 'waypoints')"
                />                        
                <q-icon
                  class="toc-layer-icon q-mr-sm off info"
                  name="info"
                  @click.stop.prevent="modalTrackInfo(element.id)"
                />                        
                <q-icon
                  class="toc-layer-icon q-mr-sm off delete"
                  name="delete"
                  @click.stop.prevent="confirmDeleteTrack(element.id)"
                />                        
              </div>
              <div>
                <q-item-label
                  caption
                  class="zoom-in q-mt-sm"
                  @doubleclick.prevent="setActiveLayer(element.id)"
                  @click.stop="zoomToLayer(element.id)"
                >
                  {{ element.name }} - {{ element.id }}
                </q-item-label>
              </div>
            </q-item-section>
            
            <q-item-section style="flex-grow: 1;" class="cursor-drag text-right">
              <div class="cursor-drag">
                <q-icon
                  class="toc-layer-icon cursor-drag handle"
                  name="more_vert"
                  @mouseover="draggable=true"
                  @mouseleave="draggable=false"
                ></q-icon>
              </div>
            </q-item-section>
        </q-item>
          <div 
            class="track-waypoints-container"
            :class="(element.waypoints.length && element.waypointsVisible) ? 'show' : 'hide'">
              <div v-for="wp in element.waypoints" :key="wp.id"
                  @click="clickWaypoint(element.id, wp.id, wp.name)"
                  class="waypoint-item"
                  :class="activeWaypointId==wp.id ? 'active' : ''"
                  @keyup.delete="deletePoint({layerId: element.id, waypointId: wp.id})"
                  tabindex="0"
                >
                  <div class="wp-info">
                    <!-- <q-chip> -->
                      <div>{{ wp.id }} {{ wp.name}}</div>
                      <div @click.stop="showWaypointInfo(element.id, wp.id, wp.name)">                        
                        <!-- <q-icon class="waypoint-flag" name="flag" title="Edit waypoint" /> -->
                        <q-icon class="waypoint-edit" name="edit" title="Edit waypoint" />
                      </div>
                    <!-- </q-chip> -->
                  </div>
              </div>
          </div>
        </div>
      </template>
    </draggable>
  </div>
  <edit-waypoint 
    @deleteWaypoint="deletePoint" 
    @editWaypoint="editWaypoint" 
  />  
    <!-- MODAL TRACK INFO -->
    <q-dialog v-model="showModalInfo" persistent>
      <q-card class="confirmation-modal">
        <q-card-section class="row items-center">
          <div class="col-12 track-name">
              <q-input outlined label="Name" dense v-model="trackName" autofocus @keyup.enter="editTrackName" />
            </div>
        </q-card-section>

        <q-card-section class="row items-center">
          <div class="row track-info">
            <div class="col-6" ><span class="q-ml-sm text-h6">Start time</span></div>
            <div class="col-6"><span class="q-ml-sm text-h6">End time</span></div>

            <div class="col-6">
              <span class="q-ml-sm">{{ trackInfo.startTime }} </span>
              <q-icon name="access_time" size="2em" @click="editTrackTimestamp('start')" class="edit"/>
            </div>
              
            <div class="col-6">
              <span class="q-ml-sm">{{ trackInfo.endTime }} </span>
              <q-icon name="access_time" size="2em"  @click="editTrackTimestamp('end')" class="edit" />
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn id="OKButton" flat label="CLOSE" color="primary" v-close-popup />
          <!-- <q-btn flat label="YES" color="primary" @click="deleteWaypointConfirmed" v-close-popup /> -->
        </q-card-actions>
      </q-card>
    </q-dialog>   

    <!-- MODAL: CONFIRM TRACK NAME CHANGED-->
    <q-dialog v-model="confirmName" persistent @keyup.enter="confirmName=false">
      <q-card class="confirmation-modal">
        <q-card-section class="row items-center">
          <q-icon size="3" name="delete" color="primary" text-color="white" />
          <span class="q-ml-sm">Track name has been changed</span>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="OK" color="primary"  v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- MODAL: CONFIRM DELETE TRACK-->
    <q-dialog v-model="confirm" persistent>
      <q-card class="confirmation-modal">
        <q-card-section class="row items-center">
          <q-icon size="3" name="delete" color="primary" text-color="white" />
          <span class="q-ml-sm">Do you really want to delete this track?</span>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" v-close-popup @click="cancelDeleteTrack" />
          <q-btn flat label="YES" color="primary" @click="deleteTrack" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>    
</template>


<script>
import { computed, onUpdated, defineComponent, ref } from 'vue'
import { useAppStore } from '../stores/appStore.js'
import draggable from "vuedraggable";
import EditWaypoint from './EditWaypoint.vue';
import { formatDateTime } from '../js/utils.js'

export default defineComponent({
  name: 'GpxList',
  components: { draggable, EditWaypoint },
  emits: [
    'zoomToLayer',
    'toggleLayer',
    'changeColor',
    'finishDrag',
    'download-track',
    'create-track',
    'track-profile',
    'clickWaypoint',
    'deleteWaypoint',
    'editWaypoint',
    'deleteTrack',
    'editTrackTimestamp',
    'editTrackName'
  ],

  setup(props, context){
    const draggable = ref(false)
    const confirm = ref(false)
    const confirmName = ref(false)
    const showModalInfo = ref(false)
    const trackName = ref()

    let deleteTrackId = null
    let startLoc = 0
    let dragging = false
    let over = {}
    let dragFrom = {}

    onUpdated(() => {
      trackName.value = trackInfo.value.name
    })

    const appStore = useAppStore()

    const data = computed({
      // getter
      get() {
        return appStore.getTOCLayers
      },
      // setter
      set(newValue) {
        appStore.newOrder(newValue)
        context.emit('finishDrag')
      }
    })

    const trackInfo = computed(() => {
      const INFO = appStore.getActiveLayerInfo
      if (!INFO) return {}
      const sDate = formatDateTime(new Date(INFO.startTime * 1000))
      const eDate = formatDateTime(new Date(INFO.endTime * 1000))
      return  {
        startTime: sDate,
        endTime: eDate,
        name: INFO.name
      }
    })

    const activeLayerId = computed(() => {
      return appStore.getActiveLayerId
    })

    const activeWaypointId = computed(() => {
      return appStore.getSelectedWaypoint.waypointId
    })

    const toggleVisibility = (layer, layerId, waypoints=false) => {
      context.emit('toggleLayer', { layerId, waypoints })
    }

    const zoomToLayer = (layerId) => {
      context.emit('zoomToLayer', layerId)
    }

    const changeColor = (e, layerId) => {
      const newColor = e.target.value
      context.emit('changeColor', {
        color: newColor,
        layerId: layerId
      })
    }

    const setActiveLayer = (index) => {
      appStore.setActiveLayerId(index)
      appStore.setActiveLayer(index)
    }

    // DRAGGING
    const startDrag = (item, i, e) => {
      startLoc = e.clientY;
      dragging = true;
      dragFrom = item;
    }

    const finishDrag = (item, pos) => {
      appStore.ReorderLayers({
        pos,
        over: over.pos,
      })
      over = {}
      context.emit('finishDrag')
    }

    const onDragOver = (item, pos, e) => {
      const dir = (startLoc < e.clientY) ? 'down': 'up';
      setTimeout(() => {
        over = { item, pos, dir };
      }, 50)
    }

    const clickWaypoint = (layerId, waypointId, name) => {
      context.emit('clickWaypoint', {layerId, waypointId, name})
    }

    const deletePoint = ({layerId, waypointId}) => {
      context.emit('deleteWaypoint', {layerId, waypointId})
    }

    const editWaypoint = (payload) => {
      context.emit('editWaypoint', payload)
    }

    const confirmDeleteTrack = (layerId) => {
      confirm.value = true
      deleteTrackId = layerId
    }

    const editTrackTimestamp = () => {
      context.emit('editTrackTimestamp', deleteTrackId)
      deleteTrackId = null
    }

    const deleteTrack = () => {
      context.emit('deleteTrack', deleteTrackId)
      deleteTrackId = null
    }

    const cancelDeleteTrack = () => {
      confirm.value = false
      deleteTrackId = null
    }

    const editTrackName = () => {
      appStore.setActiveLayerInfo({name: trackName.value})
      context.emit('editTrackName', {layerId: activeLayerId.value, name: trackName.value})
    }

    const inputLoseFocus = (layerId) => {
      document.getElementById('OKButton').focus()
    }

    const modalTrackInfo = (layerId) => {
      appStore.setActiveLayer(layerId)
      showModalInfo.value = true
    }

    const showWaypointInfo = (layerId, waypointId, name) => {
      appStore.setSelectedWaypoint({
          layerId,
          waypointId,
          name
      })
      appStore.setshowWaypointWindow(true)
    }

    return {
      data,
      showModalInfo,
      showWaypointInfo,
      deletePoint,
      editWaypoint,
      activeWaypointId,
      clickWaypoint,
      activeLayerId,
      draggable,
      over,
      startDrag,
      finishDrag,
      onDragOver,
      setActiveLayer,
      toggleVisibility,
      zoomToLayer,
      changeColor,
      confirm,
      confirmName,
      deleteTrack,
      confirmDeleteTrack,
      cancelDeleteTrack,
      modalTrackInfo,
      trackInfo,
      trackName,
      editTrackTimestamp,
      editTrackName,
      inputLoseFocus
    }
  }
})
</script>

<style lang="scss">
label.active{
  background: $active;
}

.toc-layer-icon.palette{
  border: 2px solid black;
  padding: 0;
  box-sizing: border-box;
}

.toc-layer-icon{
  cursor:pointer;
  font-size: 1.5em;
}

.cursor-drag{
  cursor: move;
}

.list > div {
    display: flex;
    flex-direction: column; 
}

.item {
  width: 200px;
  padding: 10px;
  margin: 10px auto 10px 10px;
  background: tomato;
  color: white;
  font-family: sans-serif;
  border-radius: 5px;
  display: inline-block;
/*   transition: opacity .3s ease-in-out; */
}

.flip-list-move {
  transition: transform .2s;
}


.over {
  opacity: .6;
}

.handle{
  font-size: 1.5em;
}
.drag-item{
  border: 1px solid grey;
  border-radius: 5px;
  padding: 3px 5px;
  margin: 4px;
  box-shadow: rgba(0, 0, 0, 0.12) 0px 1px 3px, rgba(0, 0, 0, 0.24) 0px 1px 2px;  
}
.drag-item.active{
  background: $active;
}

.ghost {
   font-style: italic;
}

.zoom-in{
  cursor: zoom-in;
}
.track-download{
  cursor: pointer;
}
.q-item__section--side {
  padding-right: 4px;
}
.q-item__section--main + .q-item__section--main {
  margin-left: 3px;
}
.no-events{
  pointer-events: none;
}
.waypoint-item:focus-visible,
.wp-item:focus-visible{
  outline: none;
}
.waypoint-item:hover{
  text-decoration: underline;
  font-size: 105%;
}

.wp-info div:first-of-type{
  flex-grow: 1;
}

.wp-info div:second-of-type{
  background: blue;
}

.waypoint-item.active .wp-info,
.waypoint-item.active .wp-info .q-chip{
  // border: 1px solid black;
  padding: 5px 0;
  background: white;
}

.waypoint-item .wp-info .q-chip{
  background: white;
  color:black;
  border: 1px solid black;
}
.waypoint-item.active{
  // background:white;
  color: black;
}

.waypoint-item:not(.active) .wp-info i.waypoint-edit{
  display: none;
}

.waypoint-item:not(.active) .wp-info i.waypoint-flag{
  display: all;
  pointer-events: none;
}

.waypoint-item.active .wp-info i.waypoint-edit{
  display: all;
}

.waypoint-item.active .wp-info i.waypoint-flag{
  display: none;
}

.wp-info {
  display: flex;
  justify-content: space-between;
}

.waypoint-flag,
.waypoint-edit{
  // border: 1px solid #ccc;
  padding: 2px;
  outline: none;
  // border-radius:50%;
  // background: lightgrey;
  color:black;
  margin-left: 10px;
  cursor: pointer;
}
.track-waypoints-container{
  max-height: 1000px;
  overflow: auto;
  transition: max-height .5s ease-out;
  // display: flex;
  // flex-wrap: wrap;
}

.track-waypoints-container.hide{
  max-height: 0px;
  transition: max-height .5s ease-out;
}

.q-dialog .q-card{
  min-width: unset;
}

.track-info span{
  margin: 0px 10px;
}

i.edit{
  cursor: pointer;
  // padding: 5px 8px;
  border-radius: 4px;
  border-color: #ccc;
  // background: #ccc;
  font-size: 110%;
  outline: none;
}
.track-name{
  margin-bottom: 10px;
}
</style>
