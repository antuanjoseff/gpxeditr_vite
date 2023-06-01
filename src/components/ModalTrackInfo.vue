<template>
    <div class="q-gutter-sm"  v-if="info.distance">
        <div class="graph-header">
            <div class="flex">
                <!-- DISTANCE -->
                <div class="flex column">
                  <div class="text-bold q-mr-md">
                    <q-icon class="toc-layer-icon right" name="directions_walk"/>
                    Distance
                  </div>

                  <div class="text-color" v-if="info.distance">
                    {{ info.distance.kms }} kms {{ info.distance.meters }} m
                  </div>
                </div>
                <!-- TIME -->
                <div class="flex column q-mx-md q-pl-md vertical-line">
                  <div class="text-weight-bold">
                    <q-icon class="toc-layer-icon right" name="query_builder"/>
                    Time
                  </div>
                  <div class="text-color" v-if="info.time">
                    {{ info.time.hours }}h  {{ info.time.minutes }}m {{ info.time.seconds }}s
                  </div>
                </div>
                <!-- AVERAGE -->
                <div class="flex column q-ml-md q-px-md vertical-line">
                    <div class="text-weight-bold">
                      <q-icon class="toc-layer-icon right" name="speed"/>
                      Avg
                    </div>

                    <div v-if="info.time">{{ (3.6 * (info.distance.total / info.time.total)).toFixed(2) }} km/h
                    </div>
                </div>
                <!-- ELEVATION -->
                <div class="flex column q-ml-md q-px-md vertical-line vertical-line-right">
                  <div class="text-weight-bold text-center fit">
                    <q-icon
                        class="toc-layer-icon right"
                        name="terrain"
                      />
                    Elevation
                    <q-icon
                        class="toc-layer-icon right"
                        name="settings"
                        @click="toggleSlider"
                      />
                      <q-slider v-if="slider"
                        label
                        v-model="sliderValue" :min="0" :max="300"
                        @update:model-value="updateTolerance"
                        />
                  </div>
                  <div v-if="info.elevation" class="flex">
                        <div class="q-mx-sm">
                          {{ info.elevation.up }} m
                          <q-icon class="toc-layer-icon" name="trending_up"/>
                        </div>

                        <div class="q-mx-sm">
                            {{ info.elevation.down }} m
                            <q-icon class="toc-layer-icon" name="trending_down"/>
                        </div>

                        <div class="q-mx-sm">
                          {{ info.elevation.maxEle }} m
                          <q-icon
                            class="toc-layer-icon"
                            name="vertical_align_top"
                          />
                        </div>

                        <div class="q-mx-sm">
                            {{ info.elevation.minEle }} m
                          <q-icon
                            class="toc-layer-icon"
                            name="vertical_align_bottom"
                          />
                      </div>
                </div>
                </div>
                <!-- CANCEL / CREATE TRACK BUTTONS -->
                <div style="flex-grow: 1;" class="text-right">
                  <q-btn
                    v-if="activeTool=='info'"
                    color="white"
                    text-color="black"
                    label="Create Track"
                    @click="createTrack"
                  />

                  <q-btn
                    v-else
                    color="white"
                    text-color="black"
                    label="Cancel"
                    @click="cancelTrackProfile"
                  />
                </div>
            </div>
          </div>
        <q-card  v-if="info.distance" horizontal="true" class="flex column">
          <q-card-section class="graph-wrapper" @mouseleave="mouseOut">
            <div id="tooltip-header"></div>
            <line-chart
              height="250"
              @overGraphic="overGraphic"
              @outGraphic="outGraphic"
              @dragOnGraph="dragOnGraph"
            ></line-chart>
            <div id="tooltip-footer"></div>
          </q-card-section>
        </q-card>
    </div>
  </template>

<script>
import { defineComponent, computed, ref } from 'vue'
import { useStore } from 'vuex'
import LineChart from 'components/LineChart.vue'

export default defineComponent({

  name: 'ModalTrackInfo',
  emits: ['selected-segment-create-track', 'over-graphic', 'dragOnGraph'],
  components: { LineChart },
  setup(props, context){
    const $store = useStore()
    const slider = ref(false)
    const sliderValue = ref(false)
    const activeTool = computed(() => {
      return $store.getters['main/activeTool']
    })

    const info = computed(() => {
      return $store.getters['main/getTrackInfo']
    })

    const createTrack = () => {
      console.log('click')
      context.emit('selected-segment-create-track')
      $store.commit('main/setTrackInfo', {})
    }

    const dragOnGraph = (data) => {
      context.emit('dragOnGraph', data)
    }

    const overGraphic = (data) => {
      context.emit('over-graphic', data)
    }

    const updateTolerance = (val) => {
      $store.commit('main/toleranceForElevationGain', val)
    }

    const toggleSlider = () => {
      slider.value = !slider.value
      return slider.value
    }

    const outGraphic = (data) => {
      context.emit('out-graphic', data)
      document.getElementById('tooltip-footer').innerHTML = ''
      document.getElementById('tooltip-header').innerHTML = ''
    }

    const mouseOut = (data) => {
      console.log('out')
      document.getElementById('slope-box').innerHTML = ''
    }

    const cancelTrackProfile = () => {
      $store.commit('main/setTrackInfo', {})
      $store.commit('main/setActiveLayer', -1)
    }

    return {
      info,
      mouseOut,
      slider,
      sliderValue,
      updateTolerance,
      toggleSlider,
      dragOnGraph,
      cancelTrackProfile,
      outGraphic,
      overGraphic,
      createTrack,
      activeTool,
      seamless: true
    }
  }
})
</script>

<style lang="scss">
.q-dialog__inner--minimized > div {
  min-width: 100%;
  max-height: 350px;
}
.bottom{
  bottom: 0px;
  left: 0px;
  right: 0px;
}
/* .right-top{
  top: 40px;
  left: 0px;
}

.right-top .absolute-full, .fullscreen, .fixed-full {
  top: 40px;
  right: 0;
  bottom: unset;
  left: unset;
} */
.text-color{
  color:rgb(74, 69, 78);
}
.thin-separator{
  height: 1px;
}
.section-separator{
  height: 3px;
  color:black;
}
.inverted{
  -webkit-transform: scaleX(-1);
  transform: scaleX(-1);
}

#tooltip-header:empty
{
    padding:0;
}
#tooltip-header{
  bottom: 250px
}
#tooltip-footer{
  bottom: 10px;
}


#tooltip-footer{
  position: absolute;
}

#tooltip-header{
  min-height: 26px;
}
#tooltip-header,
#tooltip-footer{
  white-space: nowrap;
  padding: 2px 6px;
  width: fit-content;
  color: white;
  background: red;
  border-radius: 5px;
  font-weight: 600;
}
.graph-header{
  background: #dadada;
}
.graph-header .flex{
  align-items: baseline;
}
.vertical-line{
  border-left: thick solid $dark-page;
}
.vertical-line-right{
  border-right: thick solid $dark-page;
}
.graph-wrapper{
  flex-grow: 1;
  padding: 0px 5px;
}

</style>
<s></s>