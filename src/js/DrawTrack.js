import Feature from 'ol/Feature.js'
import {Style, Fill, Stroke, Circle} from 'ol/style'
import VectorLayer from 'ol/layer/Vector.js'
import VectorSource from 'ol/source/Vector.js'
import Point from 'ol/geom/Point.js'
import LineString from 'ol/geom/LineString.js'
import GeoJSON from 'ol/format/GeoJSON.js'
import { transform } from 'ol/proj.js'
import axios from 'axios'
import {unByKey} from 'ol/Observable'

export class DrawTrack {
  /**
   * @param {Object} [map, opt_options] Control options.
   */
  constructor(map, options) {
    var _this = this
    this.map = map
    this.drawStyle = options.drawStyle

    // this.paused = undefined
    this.throttletimer = undefined
    this.throttletime = 50 // miliseconds
    this.clickBindId = undefined
    this.dblClickBindId = undefined
  }

  isActive() {
    return this.active
  }

  activate() {
    var _this = this
    this.active = true
    this.clicks = []
    this.parts = []

    // this.paused = false
    this.clickPointsLayer = new VectorLayer({
      id: 'nodes',
      source: new VectorSource(),
      style: new Style({
        image: new Circle({
          radius: 5,
          fill: new Fill({color: 'rgba(0,0,0,0.4)'}),
          stroke: new Stroke({color: 'rgba(0,0,0,0.4)', width: 0.1})
        })
      })
    })

    this.drawLineLayer = new VectorLayer({
      id: 'segment',
      source: new VectorSource({
        features: [
          new Feature({
            geometry: new LineString([[]])
          })
        ]}),
      style: this.drawStyle
    })

    this.tmpLineLayer = new VectorLayer({
      id: 'temp',
      source: new VectorSource({
        features: [
          new Feature({
            geometry: new LineString([[]])
          })
        ]}),
      style: this.drawStyle
    })


    this.map.addLayer(this.clickPointsLayer)
    this.map.addLayer(this.drawLineLayer)
    this.map.addLayer(this.tmpLineLayer)

    this.clickBindId = this.map.on('singleclick', this._mySingleClick.bind(this))
    this.dblClickBindId = this.map.on('dblclick', this._myDoubleClick.bind(this))
  }

  // TODO
  reset() {
    this.deactivate()
    this.activate()
  }

  deactivate() {
    this.active = false
    unByKey(this.clickBindId)
    unByKey(this.dblClickBindId)

    this.clicks = []
    this.parts =[]

    if (this.clickPointsLayer) {
      this.clickPointsLayer.getSource().clear()
      this.drawLineLayer.getSource().clear()

      this.map.removeLayer(this.clickPointsLayer)
      this.map.removeLayer(this.drawLineLayer)
      this.map.removeLayer(this.tmpLineLayer)

      this.clickPointsLayer = undefined
      this.drawLineLayer = undefined
      this.tmpLineLayer = undefined
    }

    this.throttletimer = undefined
  }

  _throttleGetNewPart(e) {
    return
    var _this = this
    if (_this.clicks.length === 0) {
      return
    }
    if (this.throttleTimer) return
      this.throttleTimer = true
      setTimeout(async () => {
        var origin = _this.clicks[_this.clicks.length - 1].getGeometr().getCoordinates()
        var target = transform(e.coordinate, 'EPSG:3857', 'EPSG:4326').map((ele) => {
          return parseFloat(ele.toFixed(6))
        })
        const efimeral = true
        const features = _this.getNewPart(origin, target, efimeral)
        _this.tmpLineLayer.getSource().clear()
        _this.tmpLineLayer.getSource().addFeatures(features)

        _this.throttleTimer = false
      }, _this.throttletime)
  }

  _myDoubleClick(e) {
    e.stopPropagation()
    var coords = this.drawLineLayer.getSource().getFeatures()[0].getGeometry().getCoordinates()
    this.map.dispatchEvent({
      type: 'drawn-part',
      nparts: this.parts.length,
      finished: true,
      coords: coords
    })
    // this.paused = !this.paused
    // if (this.paused) {
    //   this.map.un('singleclick', this._mySingleClick)
    // } else {
    //   this.map.on('singleclick', this._mySingleClick.bind(this))
    // }

    // PREVENET MAP FROM ZOOMING IN
  }


  async _mySingleClick(e) {
    // var target = transform(e.coordinate, 'EPSG:3857', 'EPSG:4326')
    // CLICKS ARE IN MAP PROJECTION
    var coord = e.coordinate
    var newFeature = new Feature({
      geometry: new Point([ parseFloat(coord[0].toFixed(6)), parseFloat(coord[1].toFixed(6))])
    })
    this.clicks.push(newFeature)
    this.clickPointsLayer.getSource().addFeatures([newFeature])


    var target = transform(e.coordinate, 'EPSG:3857', 'EPSG:4326').map((ele) => {
      return parseFloat(ele.toFixed(6))
    })

    if (this.clicks.length > 1) {
      var coord = this.clicks[this.clicks.length - 2].getGeometry().getCoordinates()

      let origin = transform(coord, 'EPSG:3857', 'EPSG:4326')
      origin = origin.map((ele) => {
        return parseFloat(ele.toFixed(6))
      })

      const coords = await this.getNewPart(origin, target)
      this.parts.push(coords)

      // MERGE ALL SEGMENTS IN ON LINESTRING
      var lastpart = coords
      var acumulated = this.drawLineLayer.getSource().getFeatures()[0].getGeometry().getCoordinates()
      this.drawLineLayer.getSource().getFeatures()[0].getGeometry().setCoordinates([...acumulated, ...lastpart])

      this.map.dispatchEvent({
        type: 'drawn-part',
        nparts: this.parts.length,
        finished: false
      })
    }
  }

  async getNewPart(origin, target) {
    var BASE_URL = "http://localhost:8000/ruta/"+
            origin[0] + '/' + origin[1] + '/' + target[0] + '/' + target[1]
    try {
      const response = await axios.get(`${BASE_URL}`)
      this.tmpLineLayer.getSource().clear()

      var geojson = response.data
      var features = new GeoJSON().readFeatures(geojson,{
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857'
      })
      return features[0].getGeometry().getCoordinates()
      // return features
    } catch (errors) {
      console.error(errors);
    }
  }

  back() {
    this.parts.pop()
    this.clicks.splice(-1)
    this.drawLineLayer.getSource().getFeatures()[0].getGeometry().setCoordinates(this.parts.flat(1))
    this.clickPointsLayer.getSource().clear()
    this.clickPointsLayer.getSource().addFeatures(this.clicks.flat(1))
    this.map.dispatchEvent({
      type: 'drawn-part',
      nparts: this.parts.length,
      finished: false
    })
  }
}

