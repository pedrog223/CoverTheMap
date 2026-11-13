import { myp5, openlayersmap } from "./main"
import { fromLonLat } from "ol/proj"

export default class Node {
  nodeId
  lat
  lon
  pos
  x
  y
  edges = []
  reachableEdges = []

  /**
   *
   * @constructor
   * @param {number} nodeId_ Node ID
   * @param {number} lat_    Latitude
   * @param {number} lon_    Longitude
   */
  constructor(nodeId_, lat_, lon_) {
    this.nodeId = nodeId_
    this.lat = lat_
    this.lon = lon_
    this.pos = myp5.createVector(1, 1)
    this.updatePosition(openlayersmap)
  }

  /**
   * Recomputes canvas x/y from the current OpenLayers view so nodes
   * follow the map when zooming or panning
   *
   * @param {Map} openlayersmap the OpenLayers map instance
   */
  updatePosition(openlayersmap) {
    const pixel = openlayersmap.getPixelFromCoordinate(
      fromLonLat([Number(this.lon), Number(this.lat)])
    )
    if (pixel != null) {
      this.x = pixel[0]
      this.y = pixel[1]
    }
  }

  show() {
    myp5.noStroke()
    myp5.colorMode(myp5.HSB)
    myp5.fill(0, 255, 255, 100)
    myp5.ellipse(this.x, this.y, 2)
  }

  highlight() {
    myp5.noStroke()
    myp5.colorMode(myp5.HSB)
    myp5.fill(0, 255, 255, 0.5)
    myp5.ellipse(this.x, this.y, 15)
  }
}
