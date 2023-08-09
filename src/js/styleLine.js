import { Colors } from './colors.js';
import {Icon, Text, Style, Stroke} from 'ol/style';

const styleLine = () => {
    var color = new Colors().newColor()
    console.log(color)
    return new Style({
      stroke: new Stroke({
        color: color,
        width: '5'
      })
    })
  }

const crossStyle = (f) => {
    return new Style({
        ZIndex: 20,
        image: new Icon({
            anchor: [0, 1],
            src: 'flag.svg',
            scale: [0.05, 0.05]        
        }),
        text: new Text({
            text: f.get('name'),
            offsetY : 10,
            offsetX: 5
        })
    })
}

export { styleLine, crossStyle }