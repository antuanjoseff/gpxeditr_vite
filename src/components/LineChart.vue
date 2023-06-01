<template>
  <div id="slope-box"></div>
  <div class="fit padding-canvas" v-if="elevationData">
    <canvas id="overlay" height="250" style="position:absolute;pointer-events:none;"></canvas>
    <line-chart
      ref="CHART"
      id="profile-chart"
      :data="data"
      :options="options"
      :plugins="plugins"
      :height="graphHeight" class="fit"
    />
  </div>
</template>

<script>
import { Line as LineChart } from 'vue-chartjs'
import { ref, watch, nextTick, onMounted, onUnmounted, computed, defineComponent } from 'vue'
import { useStore } from 'vuex'
import { Chart, Tooltip, registerables } from 'chart.js'

Chart.register(...registerables)


export default defineComponent({
  name: 'App',
  components: {
    LineChart
  },
  props: ['height'],
  emits: ['overGraphic', 'outGraphic', 'dragOnGraph'],
  setup(props, { emit }) {
    const $store = useStore()
    const CHART = ref()
    var startIndex, endIndex
    var canvas, overlay, chart
    var selectionContext, selectionRect
    var drag = false
    var cleanRequired = false

    const graphSelectedRange = computed(() => {
      return $store.getters['main/graphSelectedRange']
    })

    const resizeHandler = () => {
      drawRectangle(startIndex, endIndex)
    }

    onUnmounted(async () => {
      window.removeEventListener("resize", resizeHandler)
    })

    const drawRectangle = (x1, x2) => {
      // const rect = canvas.getBoundingClientRect();
      const pixelX1 = CHART.value.chart.scales.x.getPixelForValue(x1)
      const pixelX2 = CHART.value.chart.scales.x.getPixelForValue(x2)
      const rect = canvas.getBoundingClientRect();

      selectionRect.startX = pixelX1
      // selectionRect.startY = chart.chartArea.top

      const eleOrigin = CHART.value.chart.scales.altitud.getPixelForValue(0)

      selectionRect.w = pixelX2 - pixelX1;
      selectionContext.globalAlpha = 0.5;
      selectionContext.clearRect(0, 0, canvas.width, canvas.height);
      selectionContext.fillRect(selectionRect.startX,
        chart.chartArea.top,
        selectionRect.w,
        eleOrigin - chart.chartArea.top
      )
    }

    onMounted(async () => {
      await nextTick()
      window.addEventListener("resize", resizeHandler)
      chart = CHART.value.chart
      canvas = document.getElementById('profile-chart')
      overlay = document.getElementById('overlay')
      overlay.width = canvas.width
      overlay.height = canvas.height
      selectionContext = overlay.getContext('2d')
      selectionRect = {
        w: 0,
        startX: 0,
        startY: 0
      }

      const clearGraphSelection = () => {
        $store.commit('main/segmentIsSelected', false)
        drag = false
        cleanRequired = false
        const rect = canvas.getBoundingClientRect();
        selectionContext.clearRect(0, 0, canvas.width, canvas.height);
        selectionContext.fillRect(0,
          chart.chartArea.top,
          1,
          chart.chartArea.bottom - chart.chartArea.top);
      }

      canvas.addEventListener('pointerdown', evt => {
        if (cleanRequired) {
          clearGraphSelection()
          cleanRequired = false
          return
        }
        if (!drag) {
          const points = chart.getElementsAtEventForMode(evt, 'index', {
            intersect: false
          })
          startIndex = points[0].index;
          const rect = canvas.getBoundingClientRect()
          selectionRect.startX = evt.clientX - rect.left
          selectionRect.startY = chart.chartArea.top
          drag = true
        } else {

          const points = chart.getElementsAtEventForMode(evt, 'index', {
            intersect: false
          });
          drag = false;
          cleanRequired = true
          endIndex = points[0].index;
          $store.commit('main/segmentIsSelected', true)
        }
      })

      var throttle = undefined
      function doThrottle(evt) {
        if (throttle) return
          throttle = true
          setTimeout(async () => {
            const rect = canvas.getBoundingClientRect();
            const eleOrigin = CHART.value.chart.scales.altitud.getPixelForValue(0)

            if (drag) {
              const points = chart.getElementsAtEventForMode(evt, 'index', {
                intersect: false
              })
              endIndex = points[0].index;
              const rect = canvas.getBoundingClientRect();
              selectionRect.w = (evt.clientX - rect.left) - selectionRect.startX;
              selectionContext.globalAlpha = 0.5;
              selectionContext.clearRect(0, 0, canvas.width, canvas.height);

              selectionContext.fillRect(selectionRect.startX,
                chart.chartArea.top,
                selectionRect.w,
                eleOrigin - chart.chartArea.top
              )

              emit('dragOnGraph', { startIndex, endIndex })
            }
            throttle = false
          }, 5)
      }

      canvas.addEventListener('pointermove', evt => {
        doThrottle(evt)
      })


       $store.commit('main/segmentIsSelected', true)

        watch(segmentIsSelected, ( newValue, oldValue ) => {
          if (!newValue) {
            clearGraphSelection()
          }
        })

        watch(graphSelectedRange, ( newValue, oldValue ) => {
          if (newValue.first) {
            drawRectangle(newValue.first, newValue.last)
            endIndex = newValue.last
          }
        })
    })


    const segmentIsSelected = computed(() => {
      return $store.getters['main/segmentIsSelected']
    })

    const dataset = computed(() => {
      return JSON.parse(JSON.stringify($store.getters['main/graphData'].datasets[0]))
    })

    const graphHeight = computed(() => {
      return props.height
    })

    const plugins = ref()
    const elevationData = computed(() => {
      if ($store.getters['main/graphData'].labels) {
        return $store.getters['main/graphData'].labels.length
      } else {
        return 0
      }
    })

    const data = computed(() => {
      return $store.getters['main/graphData']
    })

    const dataLabels = computed(() => {
      return JSON.parse(JSON.stringify($store.getters['main/graphData'].labels))
    })

    var ctx = document.getElementById('profile-chart');

    const externalTooltipHandler = (context) => {
      // Tooltip Element
      const {chart, tooltip} = context;
      if (chart.tooltip._active && chart.tooltip._active.length) {
        const eleData = tooltip.dataPoints[1]
        const speedData = tooltip.dataPoints[0]
        doTooltip(eleData, speedData, chart.chartArea)
      }
    }

    const options =  {
      responsive: true,
      interaction: {
        // mode: 'nearest',
        axis: 'x',
        intersect: false
      },
      maintainAspectRatio: false,
      elements: {
        point:{
          radius: 0
        }
      },

      scales: {
        speed: {
          id: 'speed',
          beginAtZero: true,
          type: 'linear',
          position: 'right',
          max: 10,
          ticks: {
            callback: function(value, index, ticks) {
              return value + ' km/h';
            }
          }
        },
        altitud: {
          id: 'altitud',
          type: 'linear',
          position: 'left',
          ticks: {
            callback: function(value, index, ticks) {
              return value + ' m';
            }
          }
        },
        x: {
          display: false
        }
      },
      plugins: {
        mode: 'nearest',
        intersect: false,
        tooltip: {
          enabled: false,
          usePointStyle: true,
          // position: 'bottom',
          external: externalTooltipHandler
        },
        legend: {
          display: false
        }
      }
    }

    const tooltipLine = {
      id: 'tooltipLine',
      afterDraw: chart => {
        const box = document.getElementById('slope-box')
        if (chart.tooltip._active && chart.tooltip._active.length) {
          const ctx = chart.ctx
          ctx.save()
          const activePoint = chart.tooltip._active[1]
          if (!activePoint) return
          // ctx.font = "30px Arial";
          const idx = activePoint.index
          const label = chart.config._config.data.labels[idx].split(';')[1]
          box.style.marginLeft = (activePoint.element.x + 10) +'px'
          const offset = box.clientHeight / 2
          box.style.marginTop = (activePoint.element.y - offset) +'px'
          const icon = label > 0 ? 'fa-up-long' : 'fa-down-long'
          box.innerHTML = '<span>' + label +'% </span>' + '<i class="slope-icon fa-solid ' + icon + '"></i>'

          ctx.beginPath()
          ctx.setLineDash([5, 7])
          ctx.moveTo(activePoint.element.x, 0)
          ctx.lineTo(activePoint.element.x, chart.chartArea.bottom)
          ctx.lineWidth = 2
          ctx.strokeStyle = 'rbg(255,0,0,0.5)'
          ctx.stroke()
          ctx.restore()
        }
      }
    }

    plugins.value = [tooltipLine]

    const mouseOut = async (e) => {
      drag = false;
      document.getElementById('slope-box').innerHTML = ''
      emit('outGraphic')
    }

    const doTooltip = (eleData, speedData, chartArea) => {
      let indexValue = 0
      if (eleData && eleData.dataIndex) {
        indexValue = eleData.dataIndex
      } else {
        return
      }

      const total  = parseInt(eleData.label)
      const speedFormatted = speedData.formattedValue + ' kms/h'
      const kms = Math.floor(total /  1000)
      const meters = Math.floor(total - (1000 * kms))
      let label = (kms) ? kms + ' kms ' : ''
      label +=  meters + ' m'
      const tooltipHeaderWidth = document.getElementById('tooltip-header').clientWidth
      const tooltipFooterWidth = document.getElementById('tooltip-footer').clientWidth

      document.getElementById('tooltip-footer').innerHTML = label
      document.getElementById('tooltip-header').innerHTML = eleData.formattedValue + ' m' + ' - ' + speedFormatted

      if (eleData.element.x - tooltipHeaderWidth < chartArea.width){
        document.getElementById('tooltip-header').style.marginLeft = (eleData.element.x - tooltipHeaderWidth/2)+'px'
      } else {
        document.getElementById('tooltip-header').style.marginLeft = (eleData.element.x - tooltipHeaderWidth) +'px'
      }

      if (eleData.element.x - tooltipFooterWidth/2 < chartArea.width){
        document.getElementById('tooltip-footer').style.marginLeft = (eleData.element.x - tooltipFooterWidth/2) +'px'
      } else {
        document.getElementById('tooltip-footer').style.marginLeft = (eleData.element.x - tooltipFooterWidth) +'px'
      }
      emit('overGraphic', indexValue)
    }

    return {
      CHART,
      data,
      mouseOut,
      plugins,
      options,
      elevationData,
      graphHeight
    }
  }
})
</script>
<style scoped>
.padding-canvas{
  padding-top: 0px;
}
#slope-box{
  position:absolute;
  border-radius:4px;
  z-index: 10;
  padding:5px;
  background-color: white;
  color: 'black'
}
#slope-box:empty{
  display:none;
}
.slope-icon {
  margin-left: 5px;
}
</style>
