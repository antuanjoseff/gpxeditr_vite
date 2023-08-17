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
        <q-btn flat label="Cancel" v-close-popup />
        <q-btn flat label="OK" v-close-popup @click="editWaypoint" />
        </q-card-actions>
    </q-card>
    </q-dialog>
</template>

<script>

import { onUpdated, computed, defineComponent, ref } from 'vue'
import { useStore } from 'vuex'

export default defineComponent({
    name: 'EditWaypoint',
    emits: [ 'edit-waypoint' ],
    setup(props, context) {
        const $store = useStore()
        const wpName = ref('')

        onUpdated(() => {
            wpName.value = $store.getters['main/getSelectedWaypoint'].name
        })
        
        const showWaypoint = computed(() => {
            return $store.getters['main/getShowWaypointWindow']
        })

        const selected = computed(() => {
            return $store.getters['main/getSelectedWaypoint']
        })
    
        const editWaypoint = (layerId, waypointId) => {
            const name = wpName.value
            const payload = {
                layerId: selected.value.layerId,
                waypointId: selected.value.waypointId,
                name
            }
            context.emit('edit-waypoint', payload)
            $store.commit('main/editLayerWaypoint', payload)
            $store.commit('main/setshowWaypointWindow', false)        
        }

        return {
            showWaypoint,
            wpName,
            editWaypoint
        }
    },
})
</script>

<style scoped>

</style>