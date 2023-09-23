import { defineStore } from 'pinia'
export const useAppStore = defineStore('app', {
  state: () => ({
    TOCLayers: [
      // id: 'layerID,'
      // name: filename,
      // visible: true,
      // active: false,
      // color: '#afadaaa',
      // zindex: 10,
      // waypoints: [],
      // waypointsVisible: true
      // info: {
      //   distance:null,
      //   startTime: null,
      //   endTime: null,
      //   elevationGain: null,
      //   elevationLoss: null},
      //   maxHeight: null,
      //   minHeight; null
      // }
    ],
    zoom: undefined,
    numLayers: 0,
    numberOfDrawnParts: 0,
    activeLayerId: false,
    activeLayerDimensions: 0,
    activeTool: '',
    trackInfo: {},
    toleranceForElevationGain: 60,
    ActiveLayerTrackInfo: {},
    graphSelectedRange: {},
    segmentIsSelected: false,
    selectedWaypoint: { layerId: null, waypointId: null, name: null},
    profileIsVisible: false,
    showWaypointWindow: false,
    graphData: {
      labels: [],
      datasets: [
        {
          label: 'Data One',
          backgroundColor: '#f87979',
          data: []
        }
      ]
    }
  }),

  getters: {
    getViewbox (state) {
      return state.viewbox
    },

    getTOCLayers ( state ) {
      return state.TOCLayers
    },
  
    getActiveLayerId ( state ) {
      return state.activeLayerId
    },
    
    getActiveTool ( state ) {
      return state.activeTool
    },
    
    directionArrow ( state ) {
      return state.directionArrow
    },
    
    getActiveLayerDimensions ( state ) {
      return state.activeLayerDimensions
    },
    
    getZoom ( state ) {
      return state.zoom
    },
    
    getNumberOfDrawnParts ( state ) {
      return state.numberOfDrawnParts
    },
    
    getToleranceForElevationGain ( state ) {
      return state.toleranceForElevationGain
    },
    
    getNumLayers ( state ) {
      return state.numLayers
    },
    
    getActiveLayerTrackInfo ( state ) {
      return state.ActiveLayerTrackInfo
    },
    
    getTrackInfo ( state ) {
      return state.trackInfo
    },
    
    getGraphSelectedRange (state) {
      return state.graphSelectedRange
    },
    
    getGraphData (state) {
      return state.graphData
    },
    
    getSegmentIsSelected (state) {
      return state.segmentIsSelected
    },
    
    getSelectedWaypoint (state) {
      return state.selectedWaypoint
    },
    
    getProfileIsVisible (state) {
      return state.profileIsVisible
    },
    
    getShowWaypointWindow (state) {
      return state.showWaypointWindow
    },
    
    getActiveLayerInfo (state) {
      const result = {}
      const layers = state.TOCLayers
      const active = layers.find((l) => {
        return l.active
      })
  
      if (active){
        result.name = active.name
        result.startTime = active.info.startTime
        result.endTime = active.info.endTime
        return result
      } else {
        return null
      }
  }
  },
  
  actions: {
    selectFeature (feature) {
      this.selectedFeature = feature
    },

    addLayerToTOC (payload ) {
      // Add new array on top of previous ones
      this.TOCLayers.unshift(payload)
      this.TOCLayers.forEach((e, i) => {
          e.index = i
          e.active = false
      })
      this.numLayers = this.TOCLayers.length
      this.setActiveLayerId(payload.id)
    },
  
    setTOCLayerInfo (payload ) {
      // Add new array on top of previous ones
      const index = this.TOCLayers.findIndex((l) => {
        return l.id === payload.layerId
      })
      this.TOCLayers[index].info = payload.info
    },
    
    setActiveLayerId (layerId) {
      this.TOCLayers.forEach((l) => {
        l.active = false
      })    
  
      const index = this.TOCLayers.findIndex((l)=> {
        return l.id === layerId
      })
      if (index !== -1) {
        this.TOCLayers[index].active = true
      }
      this.activeLayerId = layerId
    },
    
    removeLayerFromTOC (searchId ) {
      console.log(searchId)
      const index = this.TOCLayers.findIndex((l)=> {
        return l.id === searchId
      })
      this.TOCLayers.splice(index,1)
    },
    
    toggleLayer (payload ) {
      const layerVisible = 'visible' in payload ? payload.visible : true
      const waypointsVisible = 'waypointsVisible' in payload ? payload.waypointsVisible : true
      const lIndex = this.TOCLayers.findIndex( (l) => {
        return l.id === payload.layerId
      })
  
      this.TOCLayers[lIndex].visible = layerVisible
      this.TOCLayers[lIndex].waypointsVisible = waypointsVisible
    },
    
    newOrder (newValue ) {
      this.TOCLayers = newValue
      // Redo zindex
      const len = this.TOCLayers.length
      this.TOCLayers.forEach((layer, index) => {
        layer.zindex = (len - index) * 10
      })
    },
    
    setActiveLayer (layerId ) {
      this.TOCLayers.forEach((e => {
        if (e.id === layerId) {
          e.active = true
          this.activeLayerId = layerId
        } else {
          e.active = false
        }
      }))
    },
    
    setActiveLayerInfo (payload ) {
      const index = this.TOCLayers.findIndex((l) => {
        return l.active
      })
      if ('info' in payload) {
        this.TOCLayers[index].info = payload.info
      }

      if ('name' in payload) {
        this.TOCLayers[index].name = payload.name
      }
    },
    
    changeLayerColor (payload ) {
      const layerId = payload.layerId
      const color = payload.color
  
      const layer = this.TOCLayers.find((layer)=>{
        return layer.id === layerId
      })
  
      layer.color = color
    },
  
    ReorderLayers (payload) {
      const movingLayer = this.TOCLayers[payload.pos]
      this.TOCLayers.splice(payload.pos, 1)
      this.TOCLayers.splice(payload.over, 0, movingLayer)
      // update Zindex
      this.TOCLayers.forEach((e, i) => {
          e.index = i
      })
      const len = this.TOCLayers.length
      this.TOCLayers.forEach((layer, index) => {
          layer.zindex = (len - index) * 10
      })
    },
    
    setActiveTool (toolname) {
      this.activeTool = toolname
    },
    
    setActiveLayerDimensions (dimension) {
      this.activeLayerDimensions = dimension
    },
    
    setZoom (zoom) {
      this.zoom = zoom
    },
    
    setNumberOfDrawnParts (n) {
      this.numberOfDrawnParts = n
    },
    
    setNumLayers (n) {
      this.numLayers = n
    },
    
    setToleranceForElevationGain (payload) {
      this.toleranceForElevationGain = payload
    },
    
    setActiveLayerTrackInfo (payload) {
      console.log(payload)
      this.ActiveLayerTrackInfo = payload
    },
    
    setTrackInfo (payload) {
      this.trackInfo = payload
    },
    
    setGraphSelectedRange (payload) {
      this.graphSelectedRange = payload
    },
    
    setProfileIsVisible (value ) {
      this.profileIsVisible = value
    },
    
    setGraphData (payload ) {
      this.graphData = payload
    },
    
    setshowWaypointWindow (value ) {
      this.showWaypointWindow = value
    },
    
    setSegmentIsSelected (value ) {
      this.segmentIsSelected = value
    },
  
    setSelectedWaypoint (payload ) {
      this.selectedWaypoint = payload
    },
    
    setSelectedWaypointName (name ) {
      this.selectedWaypoint.name = name
    },
    
    removedWaypoint (payload ) {
      const lIndex = this.TOCLayers.findIndex( (l) => {
          return l.id === payload.layerId
      })
  
      const wpIndex = this.TOCLayers[lIndex].waypoints.findIndex( (wp) => {
          return wp.id === payload.waypointId
      })
  
      this.TOCLayers[lIndex].waypoints.splice(wpIndex, 1)
    },
    
    addNewWaypoint (payload ) {
      const index = this.TOCLayers.findIndex( (l) => {
        return l.id === payload.layerId
      })
  
      const len = this.TOCLayers[index].waypoints.length
      this.TOCLayers[index].waypoints.push({
        id:  len + 1,
        name:  payload.name
      })
    },
    
    editLayerWaypoint (payload ) {
      const layerIndex = this.TOCLayers.findIndex( (l) => {
          return l.id === payload.layerId
      })
  
      const wpIndex = this.TOCLayers[layerIndex].waypoints.findIndex( (wp) => {
          return wp.id === payload.waypointId
      })
  
      this.TOCLayers[layerIndex].waypoints[wpIndex].name = payload.name    
    },
    
    updateLayerWaypoints (payload) { 
      const layerIndex = this.TOCLayers.findIndex( (l) => {
          return l.id === payload.layerId
      })
  
      this.TOCLayers[layerIndex].waypoints = payload.waypoints
    }
  
  }
})
