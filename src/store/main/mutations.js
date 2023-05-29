export function addLayerToTOC ( state, payload ) {
    // Add new array on top of previous ones
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
    const vis = payload.visible
    const layerId = payload.layerId
    const layer = state.TOCLayers.find((layer)=>{
        return layer.id === layerId
    })
    layer.visible = vis
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

export function graphData ( state, payload ) {
    // console.log(payload)
    state.graphData = payload
}

export function segmentIsSelected ( state, value ) {
    // console.log(payload)
    state.segmentIsSelected = value
}
