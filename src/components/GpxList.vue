
<template>
  <div v-if="data.length">
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
              </div>
              <div>
                <q-item-label
                  caption
                  class="zoom-in q-mt-sm"
                  @doubleclick.prevent="setActiveLayer(element.id)"
                  @click.stop="zoomToLayer(element.id)"
                >
                  {{ element.label }} - {{ element.id }}
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
                    <div>{{ wp.id }} {{ wp.name}}</div>
                    <div @click.stop="showWaypointInfo(element.id, wp.id, wp.name)">
                      <q-icon class="waypoint-edit" name="edit" />
                    </div>
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
</template>


<script>
import { computed, defineComponent, ref } from 'vue'
import { useStore } from 'vuex'
import draggable from "vuedraggable";
import EditWaypoint from './EditWaypoint.vue';

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
    'overGraphic',
    'track-profile',
    'clickWaypoint',
    'deleteWaypoint',
    'editWaypoint'
  ],

  setup(props, context){
    const draggable = ref(false)
    let startLoc = 0
    let dragging = false
    let over = {}
    let dragFrom = {}

    const $store = useStore()

    const data = computed({
      // getter
      get() {
        return $store.getters['main/TOCLayers']
      },
      // setter
      set(newValue) {
        $store.commit('main/newOrder', newValue)
        context.emit('finishDrag')
      }
    })

    const activeLayerId = computed(() => {
      return $store.getters['main/activeLayerId']
    })

    const activeWaypointId = computed(() => {
      return $store.getters['main/getSelectedWaypoint'].waypointId
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
      $store.commit('main/activeLayerId', index)
      $store.commit('main/setActiveLayer', index)
    }

    // DRAGGING
    const startDrag = (item, i, e) => {
      startLoc = e.clientY;
      dragging = true;
      dragFrom = item;
    }

    const finishDrag = (item, pos) => {
      $store.commit('main/ReorderLayers', {
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

    const overGraphic = (data) => {
      context.emit('overGraphic', data)
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

    const showWaypointInfo = (layerId, waypointId, name) => {
      $store.commit('main/setSelectedWaypoint', {
          layerId,
          waypointId,
          name
      })
      $store.commit('main/setshowWaypointWindow', true)
    }

    return {
      data,
      showWaypointInfo,
      deletePoint,
      editWaypoint,
      activeWaypointId,
      clickWaypoint,
      activeLayerId,
      overGraphic,
      draggable,
      over,
      startDrag,
      finishDrag,
      onDragOver,
      setActiveLayer,
      toggleVisibility,
      zoomToLayer,
      changeColor
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
.waypoint-item:hover{
  text-decoration: underline;
  font-size: 105%;
}

.waypoint-item.active{
  background:white;
  color: black;
  padding: 2px;
}

.waypoint-item:not(.active) .wp-info i{
  display: none;
}

.waypoint-item.active .wp-info i{
  display: all;
}

.wp-info {
  display: flex;
  justify-content: space-between;
}

.waypoint-edit{
  border: 1px solid #ccc;
  padding: 2px;
}
.track-waypoints-container{
  max-height: 1000px;
  overflow: auto;
  transition: max-height .5s ease-out;
}

.track-waypoints-container.hide{
  max-height: 0px;
  transition: max-height .5s ease-out;
}
</style>
