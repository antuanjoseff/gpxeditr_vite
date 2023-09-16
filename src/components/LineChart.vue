<template>
  <div id="slope-box"></div>
  <div id = "chartContainer" class="fit padding-canvas" v-if="elevationData">
    <canvas id="overlay" height="250" style="position:absolute;pointer-events:none;"></canvas>
    <line-chart
      ref="CHART"
      id="profile-chart"
      :data="data"
      :options="options"
      :plugins="plugins"
      :height="graphHeight" class="fit"
      @mouseenter="mouseEnterLinechart"
    />
  </div>
</template>

<script>
import { Line as LineChart } from 'vue-chartjs'
import { ref, watch, nextTick, onMounted, onUnmounted, computed, defineComponent } from 'vue'
import { useAppStore } from '../stores/appStore.js'
import { Chart, Tooltip, registerables } from 'chart.js'

Chart.register(...registerables)


export default defineComponent({
  name: 'App',
  components: {
    LineChart
  },
  props: ['height'],
  emits: ['overLineChart', 'clearBox', 'dragOnGraph', 'pointerClicked'],
  setup(props, context) {
    const appStore = useAppStore()
    const CHART = ref()
    var startIndex, endIndex
    var canvas, overlay, chart
    var selectionContext, selectionRect
    var throttle = undefined
    const startSelection = 1  //nClicks => 1
    const endSelection = 2    //nClicks => 2
    const cleanSelection = 3  //nClicks => 3

    var nClicks = 0 

    const graphSelectedRange = computed(() => {
      return appStore.getGraphSelectedRange
    })

    const resizeHandler = () => {
      drawRectangle(startIndex, endIndex)
    }

    const mouseEnterLinechart = () => {
      console.log('mouseenter linechart')
      throttle = undefined
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

    const clearGraphSelection = () => {
      nClicks = 0
      appStore.setSegmentIsSelected(false)
      const rect = canvas.getBoundingClientRect();
      selectionContext.clearRect(0, 0, canvas.width, canvas.height);
      selectionContext.fillRect(0,
        chart.chartArea.top,
        1,
        chart.chartArea.bottom - chart.chartArea.top
      );
    }


    onMounted(async () => {
      // If chart is not visible then do nothing
      if (!CHART.value) return
      
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

      canvas.addEventListener('pointerdown', evt => {
        nClicks++        
        switch (true) {
          case nClicks >= cleanSelection: {
            clearGraphSelection()
            break;
          }
          case nClicks == startSelection: {
            const points = chart.getElementsAtEventForMode(evt, 'index', {
              intersect: false
            })
            if (!points) return
            startIndex = points[0].index;
            const rect = canvas.getBoundingClientRect()
            selectionRect.startX = evt.clientX - rect.left
            selectionRect.startY = chart.chartArea.top
            break
          }
          case nClicks == endSelection: {
            const points = chart.getElementsAtEventForMode(evt, 'index', {
              intersect: false
            });
            endIndex = points[0].index;
            appStore.setSegmentIsSelected(true)
            break;
          }
        }   
        context.emit('pointerClicked', {counter: nClicks})    
      })

      throttle = undefined
      function doThrottle(evt) {
        if (throttle) return
          throttle = true
          setTimeout(async () => {
            const rect = canvas.getBoundingClientRect();
            const eleOrigin = CHART.value.chart.scales.altitud.getPixelForValue(0)
            let points
            points = chart.getElementsAtEventForMode(evt, 'index', {
              intersect: false
            })
            if (nClicks === startSelection) {
              if (points.length === 0) return
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

              context.emit('dragOnGraph', { startIndex, endIndex })
            }
            throttle = false
          }, 5)
      }

      canvas.addEventListener('pointermove', evt => {
        doThrottle(evt)
      })


      //  appStore.setSegmentIsSelected(true)
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
      return appStore.getSegmentIsSelected
    })

    const dataset = computed(() => {
      return JSON.parse(JSON.stringify(appStore.getGraphData.datasets[0]))
    })

    const graphHeight = computed(() => {
      return props.height
    })

    const plugins = ref()
    const elevationData = computed(() => {
      if (appStore.getGraphData.labels) {
        return appStore.getGraphData.labels.length
      } else {
        return 0
      }
    })

    const data = computed(() => {
      return appStore.getGraphData
    })

    const dataLabels = computed(() => {
      return JSON.parse(JSON.stringify(appStore.getGraphData.labels))
    })

    var ctx = document.getElementById('profile-chart');

    const externalTooltipHandler = (context) => {
      // Tooltip Element
      const {chart, tooltip} = context;
      if (chart.tooltip._active && chart.tooltip._active.length) {
        const nDatasets = chart.config._config.data.datasets.length
        if (nDatasets === 2) {
          const eleData = tooltip.dataPoints[1]
          const speedData = tooltip.dataPoints[0]
          doTooltip(eleData, speedData, chart.chartArea)
        } else {
          const eleData = tooltip.dataPoints[0]
          doTooltip(eleData, undefined, chart.chartArea)
        }
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
        let activePoint
        const box = document.getElementById('slope-box')
        if (chart.tooltip._active && chart.tooltip._active.length) {
          const ctx = chart.ctx
          ctx.save()
          if (chart.config._config.data.datasets.length === 2) {
            activePoint = chart.tooltip._active[1]
          } else {
            activePoint = chart.tooltip._active[0]
          }

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

    const doTooltip = (eleData, speedData, chartArea) => {
      let indexValue = 0
      let speedFormatted = '¿?'
      if (eleData && eleData.dataIndex) {
        indexValue = eleData.dataIndex
      } else {
        return
      }

      const total  = parseInt(eleData.label)
      if (speedData) {
        speedFormatted = speedData.formattedValue + ' kms/h'
      }

      const kms = Math.floor(total /  1000)
      const meters = Math.floor(total - (1000 * kms))
      let label = (kms) ? kms + ' kms ' : ''
      label +=  meters + ' m'
      const tooltipHeaderWidth = document.getElementById('tooltip-header').clientWidth
      const tooltipFooterWidth = document.getElementById('tooltip-footer').clientWidth

      document.getElementById('tooltip-footer').innerHTML = label
      document.getElementById('tooltip-header').innerHTML = eleData.formattedValue + ' m' + ' - ' + speedFormatted

      const offset = 10
      // TOOLTIP HEADER
      if ( eleData.element.x - (tooltipHeaderWidth/2)  < (0 + offset  ) ){
        document.getElementById('tooltip-header').style.marginLeft = offset +'px'
      } else if ((tooltipHeaderWidth/2) + eleData.element.x < (canvas.width - offset ) ){
        document.getElementById('tooltip-header').style.marginLeft = eleData.element.x - (tooltipHeaderWidth/2) +'px'
      } else {
        document.getElementById('tooltip-header').style.marginLeft = (canvas.width - tooltipHeaderWidth - offset)+'px'
      }

      // TOOLTIP FOOTER
      if ( eleData.element.x - (tooltipFooterWidth/2)  < (0 + offset  ) ){
        document.getElementById('tooltip-footer').style.marginLeft = offset +'px'
      } else if ((tooltipFooterWidth/2) + eleData.element.x < (canvas.width - offset ) ){
        document.getElementById('tooltip-footer').style.marginLeft = eleData.element.x - (tooltipFooterWidth/2) +'px'
      } else {
        document.getElementById('tooltip-footer').style.marginLeft = (canvas.width - tooltipFooterWidth - offset)+'px'
      }
      context.emit('overLineChart', {index: indexValue, nClicks})
    }

    const resetThrottle = () => {
      throttle = undefined
    }
    

    const handleClicks = (n) => {
      nClicks = n
      resetThrottle()
      console.log(n)
      switch (nClicks) {
        case cleanSelection: {
          clearGraphSelection()
          break;
        }
      }      
    }

    return {
      CHART,
      resetThrottle,
      data,
      clearGraphSelection,
      plugins,
      options,
      elevationData,
      graphHeight,
      segmentIsSelected,
      handleClicks
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
