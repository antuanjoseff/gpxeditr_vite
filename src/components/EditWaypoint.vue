<template>
    <q-dialog v-model="showWaypoint" persistent @keyup.enter="editWaypoint">
    <q-card style="min-width: 350px">
        <q-card-section>
        <div class="text-h6">Waypoint name</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
        <q-input dense v-model="wpName" autofocus @keyup.enter="prompt = false" />
        </q-card-section>

        <q-card-actions align="right" class="text-primary">
            <div class="modal-buttons">
                <div>
                    <q-btn flat v-close-popup>
                        <q-icon name="delete" color="red" @click="deleteWaypoint"/>
                    </q-btn>
                </div>

                <div>
                    <q-btn flat label="Cancel" v-close-popup @click="closeModal" />
                    <q-btn flat label="OK" v-close-popup @click="editWaypoint" />
                </div>
            </div>
        </q-card-actions>
    </q-card>
    </q-dialog>

    <!-- CONFIRM -->
    <q-dialog v-model="confirm" persistent>
      <q-card class="confirmation-modal">
        <q-card-section class="row items-center">
          <q-icon size="3" name="delete" color="primary" text-color="white" />
          <span class="q-ml-sm">Do you really want to delete this waypoint?</span>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" v-close-popup />
          <q-btn flat label="YES" color="primary" @click="deleteWaypointConfirmed" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>    
</template>

<script>

import { onUpdated, computed, defineComponent, ref } from 'vue'
import { useStore } from 'vuex'

export default defineComponent({
    name: 'EditWaypoint',
    emits: [ 'edit-waypoint', 'delete-waypoint' ],
    setup(props, context) {
        const $store = useStore()
        const wpName = ref('')
        const confirm = ref(false)

        onUpdated(() => {
            wpName.value = $store.getters['main/getSelectedWaypoint'].name
        })
        
        const closeModal = () => {
            $store.commit('main/setshowWaypointWindow', false)
            confirm.value = false
        }
        
        const showWaypoint = computed(() => {
            return $store.getters['main/getShowWaypointWindow']
        })

        const selected = computed(() => {
            return $store.getters['main/getSelectedWaypoint']
        })
    
        const editWaypoint = () => {
            const name = wpName.value
            const payload = {
                layerId: selected.value.layerId,
                waypointId: selected.value.waypointId,
                name
            }
            context.emit('edit-waypoint', payload)
            $store.commit('main/editLayerWaypoint', payload)
            closeModal()
        }
    
        const deleteWaypoint = () => {
            const payload = {
                layerId: selected.value.layerId,
                waypointId: selected.value.waypointId
            }
            confirm.value = true
            // context.emit('delete-waypoint', payload)
            // closeModal()
        }
    
        const deleteWaypointConfirmed = () => {
            const payload = {
                layerId: selected.value.layerId,
                waypointId: selected.value.waypointId
            }
            
            context.emit('delete-waypoint', payload)
            closeModal()
        }

        return {
            confirm,
            deleteWaypointConfirmed,
            showWaypoint,
            wpName,
            editWaypoint,
            deleteWaypoint,
            closeModal
        }
    },
})
</script>

<style scoped>

.modal-buttons{
    width: 100%;
    display:flex;
    justify-content: space-between;
}
.confirmation-modal{
    min-width: unset;
}
</style>