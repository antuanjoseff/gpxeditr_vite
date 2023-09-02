export function TOCLayers ( state ) {
    return state.TOCLayers
}

export function activeLayerId ( state ) {
    return state.activeLayerId
}

export function activeTool ( state ) {
    return state.activeTool
}

export function directionArrow ( state ) {
    return state.directionArrow
}

export function activeLayerDimensions ( state ) {
    return state.activeLayerDimensions
}

export function getZoom ( state ) {
    return state.zoom
}

export function numberOfDrawnParts ( state ) {
    return state.numberOfDrawnParts
}

export function toleranceForElevationGain ( state ) {
    return state.toleranceForElevationGain
}

export function numLayers ( state ) {
    return state.numLayers
}

export function ActiveLayerTrackInfo ( state ) {
    return state.ActiveLayerTrackInfo
}

export function getTrackInfo ( state ) {
    return state.trackInfo
}

export function graphSelectedRange (state) {
    return state.graphSelectedRange
}

export function graphData (state) {
    return state.graphData
}

export function segmentIsSelected (state) {
    return state.segmentIsSelected
}

export function getSelectedWaypoint (state) {
    return state.selectedWaypoint
}

export function profileIsVisible (state) {
    return state.profileIsVisible
}

export function getShowWaypointWindow (state) {
    return state.showWaypointWindow
}

export function getActiveLayerInfo (state) {
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
