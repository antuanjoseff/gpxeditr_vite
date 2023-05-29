export default function () {
  return {
    TOCLayers: [
      // id: 'layerID,'
      // label: filename,
      // visible: true,
      // active: false,
      // color: '#afadaaa',
      // zindex: 10
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
