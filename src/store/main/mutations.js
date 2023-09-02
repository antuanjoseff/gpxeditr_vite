export function addLayerToTOC ( state, payload ) {
    // Add new array on top of previous ones
    state.TOCLayers.forEach((l) => {
        l.active = false
    })
    state.TOCLayers.unshift(payload)
    state.TOCLayers.forEach((e, i) => {
        e.index = i
    })
    state.numLayers = state.TOCLayers.length
}

export function removeTOCLayer ( state, searchId ) {
    const index = state.TOCLayers.findIndex((l)=> {
        return l.id === searchId
    })
    state.TOCLayers.splice(index,1)
}

export function removeLayerFromTOC ( state, index ) {
    state.TOCLayers.splice(index, 1)
    state.numLayers = state.TOCLayers.length
}

export function toggleLayer ( state, payload ) {
    const layerVisible = 'visible' in payload ? payload.visible : true
    const waypointsVisible = 'waypointsVisible' in payload ? payload.waypointsVisible : true
    const lIndex = state.TOCLayers.findIndex( (l) => {
        return l.id === payload.layerId
    })

    state.TOCLayers[lIndex].visible = layerVisible
    state.TOCLayers[lIndex].waypointsVisible = waypointsVisible
}

export function newOrder ( state, newValue ) {
    state.TOCLayers = newValue
    // Redo zindex
    const len = state.TOCLayers.length
    state.TOCLayers.forEach((layer, index) => {
        layer.zindex = (len - index) * 10
    })
}

export function setActiveLayer ( state, index ) {
    state.TOCLayers.forEach((e => {
        if (e.id === index) {
          e.active = true
        } else {
          e.active = false
        }
    }))
}

export function changeLayerColor ( state, payload ) {
    const layerId = payload.layerId
    const color = payload.color

    const layer = state.TOCLayers.find((layer)=>{
        return layer.id === layerId
    })

    layer.color = color
}

export function ReorderLayers (state, payload) {
    const movingLayer = state.TOCLayers[payload.pos]
    state.TOCLayers.splice(payload.pos, 1)
    state.TOCLayers.splice(payload.over, 0, movingLayer)
    // update Zindex
    state.TOCLayers.forEach((e, i) => {
        e.index = i
    })
    const len = state.TOCLayers.length
    state.TOCLayers.forEach((layer, index) => {
        layer.zindex = (len - index) * 10
    })
}

export function activeLayerId (state, layerId) {
    state.activeLayerId = layerId
}

export function activeTool (state, toolname) {
    state.activeTool = toolname
}

export function activeLayerDimensions (state, dimension) {
    state.activeLayerDimensions = dimension
}

export function setZoom (state, zoom) {
    state.zoom = zoom
}

export function numberOfDrawnParts (state, n) {
    state.numberOfDrawnParts = n
}

export function numLayers (state, n) {
    state.numLayers = n
}

export function toleranceForElevationGain (state, payload) {
    state.toleranceForElevationGain = payload
}

export function ActiveLayerTrackInfo (state, payload) {
    state.ActiveLayerTrackInfo = payload
}

export function setTrackInfo (state, payload) {
    state.trackInfo = payload
}

export function graphSelectedRange (state, payload) {
    state.graphSelectedRange = payload
}

export function setProfileIsVisible ( state, value ) {
    state.profileIsVisible = value
}

export function graphData ( state, payload ) {
    state.graphData = payload
}

export function setshowWaypointWindow ( state, value ) {
    state.showWaypointWindow = value
}

export function segmentIsSelected ( state, value ) {
    state.segmentIsSelected = value
}

export function setSelectedWaypoint ( state, payload ) {
    state.selectedWaypoint = payload
}

export function setSelectedWaypointName ( state, name ) {
    state.selectedWaypoint.name = name
}

export function removedWaypoint ( state, payload ) {
    const lIndex = state.TOCLayers.findIndex( (l) => {
        return l.id === payload.layerId
    })

    const wpIndex = state.TOCLayers[lIndex].waypoints.findIndex( (wp) => {
        return wp.id === payload.waypointId
    })

    state.TOCLayers[lIndex].waypoints.splice(wpIndex, 1)
}

export function addNewWaypoint ( state, payload ) {
    const index = state.TOCLayers.findIndex( (l) => {
        return l.id === payload.layerId
    })

    const len = state.TOCLayers[index].waypoints.length
    state.TOCLayers[index].waypoints.push({
        id:  len + 1,
        name:  payload.name
    })
}

export function editLayerWaypoint ( state, payload ) {
    const layerIndex = state.TOCLayers.findIndex( (l) => {
        return l.id === payload.layerId
    })

    const wpIndex = state.TOCLayers[layerIndex].waypoints.findIndex( (wp) => {
        return wp.id === payload.waypointId
    })

    state.TOCLayers[layerIndex].waypoints[wpIndex].name = payload.name    
}

export function updateLayerWaypoints ( state, payload) { 
    const layerIndex = state.TOCLayers.findIndex( (l) => {
        return l.id === payload.layerId
    })

    state.TOCLayers[layerIndex].waypoints = payload.waypoints
}
