import { myp5, calcdistance } from "./main"

export default class Edge {
  wayid
  from
  to
  travels
  distance
  oneway
  visited
  alreadyRun
  runCount
  trimmed
  streetName
  isRoundabout
  unreachable

  /**
   * section of road that connects nodes
   *
   * @param {Node}    from_
   * @param {Node}    to_
   * @param {Number}  wayid_ OSM ID
   * @param {boolean} oneway
   */
  constructor(from_, to_, wayid_, oneway) {
    this.wayid = wayid_
    this.from = from_
    this.to = to_
    this.oneway = oneway
    this.travels = 0
    this.alreadyRun = false
    this.runCount = 0
    this.trimmed = false
    this.streetName = ""
    this.isRoundabout = false
    this.unreachable = false // required street that can't be reached from start
    this.distance = calcdistance(
      this.from.lat,
      this.from.lon,
      this.to.lat,
      this.to.lon
    )
    if (!this.from.edges.includes(this)) {
      this.from.edges.push(this)
      this.from.reachableEdges.push(this)
    }
    if (!this.to.edges.includes(this)) {
      this.to.edges.push(this)
      if (!this.oneway) {
        this.to.reachableEdges.push(this)
      }
    }
  }

  show() {
    if (this.trimmed) {
      myp5.strokeWeight(2)
      myp5.stroke(0, 0, 45, 0.5) // dull gray for trimmed edges
    } else {
      myp5.strokeWeight(myp5.min(10, (this.travels + 1) * 2))
      if (this.alreadyRun) {
        myp5.stroke(0, 255, 255, 0.8) // red (HSB) for edges already run
      } else {
        myp5.stroke(55, 255, 255, 0.8)
      }
    }
    myp5.line(this.from.x, this.from.y, this.to.x, this.to.y)
    myp5.fill(0)
    myp5.noStroke()
    if (this.oneway) {
      myp5.push()
      var angle = myp5.atan2(this.from.y - this.to.y, this.from.x - this.to.x)
      myp5.translate(this.to.x, this.to.y)
      myp5.rotate(angle - myp5.HALF_PI)
      var offset = 7
      myp5.triangle(0, offset, offset * 0.5, offset, 0, -offset / 2)
      myp5.pop()
    }
  }

  highlight() {
    myp5.strokeWeight(4)
    myp5.stroke(20, 255, 255, 1)
    myp5.line(this.from.x, this.from.y, this.to.x, this.to.y)
    myp5.fill(0)
    myp5.noStroke()
  }

  /**
   * Draws this street in bright green (HSB hue 120), thick and opaque, so the
   * user can see which required streets can't be reached from the start and
   * pick a connector to restore. Drawn on top of the normal edges.
   */
  highlightUnreachable() {
    myp5.strokeWeight(6)
    myp5.stroke(120, 90, 100, 1) // bright green
    myp5.line(this.from.x, this.from.y, this.to.x, this.to.y)
    myp5.fill(0)
    myp5.noStroke()
  }

  OtherNodeofEdge(node) {
    if (node == this.from) {
      return this.to
    } else {
      return this.from
    }
  }

  /**
   * Replaces the oldNode with the newNode for this edge
   *
   * @param {Node} oldNode old node to replace
   * @param {Node} newNode new node for si edge
   */
  replaceNode(oldNode, newNode) {
    if (this.to == oldNode) {
      this.to = newNode
    } else {
      this.from = newNode
    }
  }

  /**
   * Gives distance from middle of this edge to give point
   * 
   * @param {Number} x x coordinates of the point
   * @param {Number} y y coordinates of the point
   * @returns 
   */
  distanceToPoint(x, y) {
    return myp5.dist(
      x,
      y,
      (this.to.x + this.from.x) / 2,
      (this.to.y + this.from.y) / 2
    )
  }

  /**
   * Perpendicular distance from a geographic point to this edge's segment,
   * clamped to the segment ends. Uses calcdistance() so the result is in km.
   *
   * @param {Number} lat latitude of the point
   * @param {Number} lon longitude of the point
   * @returns {Number} distance in km
   */
  pointToSegmentDistance(lat, lon) {
    const fromLat = Number(this.from.lat)
    const fromLon = Number(this.from.lon)
    const toLat = Number(this.to.lat)
    const toLon = Number(this.to.lon)
    // equirectangular projection so lon distances are comparable to lat
    const coslat = Math.cos((lat * Math.PI) / 180)
    const ax = fromLon * coslat
    const ay = fromLat
    const bx = toLon * coslat
    const by = toLat
    const px = lon * coslat
    const py = lat
    const dx = bx - ax
    const dy = by - ay
    const lengthSq = dx * dx + dy * dy
    let t = 0
    if (lengthSq > 0) {
      t = ((px - ax) * dx + (py - ay) * dy) / lengthSq
      t = Math.max(0, Math.min(1, t))
    }
    const nearestLat = fromLat + t * (toLat - fromLat)
    const nearestLon = fromLon + t * (toLon - fromLon)
    return calcdistance(lat, lon, nearestLat, nearestLon)
  }

  /**
   * Distance in canvas pixels from (x, y) to this edge's on-screen segment
   * (nearest point on the segment, not the midpoint). Used for hit-testing
   * so clicking anywhere along a line selects it, not just near its center.
   *
   * @param {Number} x canvas x of the point
   * @param {Number} y canvas y of the point
   * @returns {Number} distance in pixels
   */
  canvasSegmentDistance(x, y) {
    const ax = this.from.x
    const ay = this.from.y
    const dx = this.to.x - ax
    const dy = this.to.y - ay
    const lengthSq = dx * dx + dy * dy
    let t = 0
    if (lengthSq > 0) {
      t = ((x - ax) * dx + (y - ay) * dy) / lengthSq
      t = Math.max(0, Math.min(1, t))
    }
    return myp5.dist(x, y, ax + t * dx, ay + t * dy)
  }
}
