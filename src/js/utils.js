import { Fill, Circle, Style, Stroke } from 'ol/style';

const projDistance = function (p1, p2) {
  return Math.sqrt(Math.pow((p1[0]- p2[0]), 2) + Math.pow((p1[1]- p2[1]), 2) )
}

// const Distance = (p1, p2) => {
//   var alfa = Math.atan((p2[1] - p1[1] / (p2[0] - p1[0])))
//   var d = ((p2[1] - p1[1]) / Math.sin(alfa)).toFixed(3)  
//   return Math.abs(d)
// }

const Distance = (p1, p2) => {
  var lon1 = p1[0]
  var lat1 = p1[1]
  var lon2 = p2[0]
  var lat2 = p2[1]
  var radius = 6378137.0 ; // earth radius in meter
  var DE2RA = 0.01745329252; // degre to radian conversion

  // return the distance between (lat1,lon1) and (lat2,lon2) in meter.
  if (lat1 == lat2 && lon1 == lon2) return 0;
  lat1 *= DE2RA;
  lon1 *= DE2RA;
  lat2 *= DE2RA;
  lon2 *= DE2RA;
  var d = Math.sin(lat1) * Math.sin(lat2) + Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon1 - lon2);
  return (radius * Math.acos(d));
}

const createStyleByStrokeColor = (color, width) => {
  return new Style({
    stroke: new Stroke({
      color: color,
      width: width
    })
  })          
}

const selectStyle = [
  new Style({
    stroke: new Stroke({
      color: 'blue',
      width: 18
    })
  }),
  new Style({
    stroke: new Stroke({
      color: 'red',
      width: 4
    })
  })
]

const animatedPointStyle = new Style({
  image: new Circle({
    radius: 20,
    fill: new Fill({color: 'rgba(0,0,0,0.4)'}),
    stroke: new Stroke({color: 'rgba(0,0,0,0.4)', width: 0.1})
  })
})

function padTo2Digits(num) {
  return num.toString().padStart(2, '0');
}

function formatDateTime(date) {
  return (
    [
      date.getFullYear(),
      padTo2Digits(date.getMonth() + 1),
      padTo2Digits(date.getDate()),
    ].join('-') +
    ' - ' +
    [
      padTo2Digits(date.getHours()),
      padTo2Digits(date.getMinutes()),
      padTo2Digits(date.getSeconds()),
    ].join(':')
  );
}


export { formatDateTime, projDistance, Distance, createStyleByStrokeColor, selectStyle, animatedPointStyle }
