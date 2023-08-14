import {Style, Fill, Icon, Text, Stroke, RegularShape, Circle} from 'ol/style';

const nodesStyle = (feature, resolution) => {
  console.log(10 / resolution)
  return new Style({
    image: new Circle({
      radius: 10 / resolution,
      fill: new Fill({color: 'red'}),
      stroke: new Stroke({
        color: [255,0,0], width: 2
      })
    })
  })
}

const crossStyle = new Style({
  image: new RegularShape({
    fill: new Fill({color: 'red'}),
    stroke: new Stroke({color: 'black', width: 2}),
    points: 4,
    radius: 10,
    radius2: 0,
    angle: Math.PI / 4
  })
})

const selectedStyle = new Style({
  fill: new Fill({
    color: 'yellow',
  }),
  stroke: new Stroke({
    color: 'yellow',
    width: '7'
  })
})

const directionStyle = function(feature, resolution) {
  if (styleCache[resolution]) return styleCache[resolution];
  if (defaultResolution === 0) defaultResolution = resolution;

  const delta = (defaultResolution/resolution)*numberArrowbyKm;

  const styles = [
    new Style({
      stroke: new Stroke({
        color: 'red',
        width: 4
      })
    })
  ];
  // var sourceProj = map.value.map.getView().getProjection();
  var length = 0;

  for( var i = 0; i < feature.getGeometry().getCoordinates().length; i++){

    var s= feature.getGeometry().getCoordinates()[i];
    // var c1 = transform([s[0], s[1]], sourceProj, 'EPSG:4326');
    var c1 = [s[0], s[1]]

    if (i+1 < feature.getGeometry().getCoordinates().length) {
      var f = feature.getGeometry().getCoordinates()[i+1];
      // var c2 = transform([f[0], f[1]], sourceProj, 'EPSG:4326');
      var c2 = [f[0], f[1]]
      length += projDistance(c1, c2)
    }

    if (length>=(1000/delta)) {
      console.log('in....')
      var dx = s[0] - f[0];
      var dy = s[1] - f[1];
      var rotation = Math.atan2(dy, dx);
      styles.push(new Style({
      geometry: new Point([f[0],f[1]]),
        image: new Icon({
          src: '//openlayers.org/en/latest/examples/data/arrow.png',
          anchor: [0.75, 0.5],
          rotateWithView: false,
          rotation: -rotation
        })
      }));
      length = 0;
    }
  }
  styleCache[resolution] = styles;
  return styles;
}

export {
  nodesStyle, crossStyle, selectedStyle, directionStyle
} from './styles.js'