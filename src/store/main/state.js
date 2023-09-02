export default function () {
  return {
    TOCLayers: [
      // id: 'layerID,'
      // label: filename,
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
      //   maxHight: null,
      //   minHight; null
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
  }
}
