/**
 * Exact minimum-weight PERFECT matching via Edmonds' blossom algorithm
 * (O(n^3)). This is a faithful port of Joris van Rantwijk's well-known
 * max_weight_matching implementation (the one NetworkX uses), specialised to
 * a complete graph given by a symmetric cost matrix.
 *
 * min-weight perfect matching is obtained from max-weight matching by
 * negating the weights and forcing maximum cardinality.
 */

/**
 * General max-weight matching on a graph given as an edge list.
 *
 * @param {number} nvertex number of vertices (0..nvertex-1)
 * @param {Array<[number, number, number]>} edges [i, j, weight]
 * @param {boolean} maxcardinality require maximum cardinality
 * @returns {Int32Array} mate: mate[v] = matched vertex, or -1
 */
export function maxWeightMatching(nvertex, edges, maxcardinality) {
  const nedge = edges.length
  if (nedge === 0) {
    return new Int32Array(nvertex).fill(-1)
  }
  let maxweight = 0
  for (const e of edges) {
    if (e[2] > maxweight) maxweight = e[2]
  }

  // endpoint[2*k], endpoint[2*k+1] are the vertices of edge k
  const endpoint = new Int32Array(2 * nedge)
  for (let k = 0; k < nedge; k++) {
    endpoint[2 * k] = edges[k][0]
    endpoint[2 * k + 1] = edges[k][1]
  }
  // neighbend[v] = list of remote endpoints of edges incident to v
  const neighbend = []
  for (let i = 0; i < nvertex; i++) neighbend.push([])
  for (let k = 0; k < nedge; k++) {
    const [i, j] = edges[k]
    neighbend[i].push(2 * k + 1)
    neighbend[j].push(2 * k)
  }

  const mate = new Int32Array(nvertex).fill(-1)
  // labels: 0 free, 1 S-vertex/blossom, 2 T-vertex/blossom
  const label = new Int32Array(2 * nvertex).fill(0)
  const labelend = new Int32Array(2 * nvertex).fill(-1)
  const inblossom = new Int32Array(nvertex)
  for (let i = 0; i < nvertex; i++) inblossom[i] = i
  const blossomparent = new Int32Array(2 * nvertex).fill(-1)
  const blossomchilds = new Array(2 * nvertex).fill(null)
  const blossombase = new Int32Array(2 * nvertex).fill(-1)
  for (let i = 0; i < nvertex; i++) blossombase[i] = i
  const blossomendps = new Array(2 * nvertex).fill(null)
  const bestedge = new Int32Array(2 * nvertex).fill(-1)
  const blossombestedges = new Array(2 * nvertex).fill(null)
  const unusedblossoms = []
  for (let i = nvertex; i < 2 * nvertex; i++) unusedblossoms.push(i)
  const dualvar = new Float64Array(2 * nvertex)
  for (let i = 0; i < nvertex; i++) dualvar[i] = maxweight
  const allowedge = new Uint8Array(nedge).fill(0)
  let queue = []

  const slack = (k) => {
    const [i, j] = edges[k]
    return dualvar[i] + dualvar[j] - 2 * edges[k][2]
  }

  function* blossomLeaves(b) {
    if (b < nvertex) {
      yield b
    } else {
      for (const t of blossomchilds[b]) {
        if (t < nvertex) yield t
        else yield* blossomLeaves(t)
      }
    }
  }

  function assignLabel(w, t, p) {
    const b = inblossom[w]
    label[w] = t
    label[b] = t
    labelend[w] = p
    labelend[b] = p
    bestedge[w] = -1
    bestedge[b] = -1
    if (t === 1) {
      for (const leaf of blossomLeaves(b)) queue.push(leaf)
    } else if (t === 2) {
      const base = blossombase[b]
      assignLabel(endpoint[mate[base]], 1, mate[base] ^ 1)
    }
  }

  function scanBlossom(v, w) {
    const path = []
    let base = -1
    while (v !== -1 || w !== -1) {
      let b = inblossom[v]
      if (label[b] & 4) {
        base = blossombase[b]
        break
      }
      path.push(b)
      label[b] |= 4
      // trace one step back
      if (labelend[b] === -1) {
        v = -1
      } else {
        v = endpoint[labelend[b]]
        b = inblossom[v]
        v = endpoint[labelend[b]]
      }
      if (w !== -1) {
        const tmp = v
        v = w
        w = tmp
      }
    }
    for (const b of path) label[b] &= ~4
    return base
  }

  function addBlossom(base, k) {
    let v = edges[k][0]
    let w = edges[k][1]
    const bb = inblossom[base]
    let bv = inblossom[v]
    let bw = inblossom[w]
    const b = unusedblossoms.pop()
    blossombase[b] = base
    blossomparent[b] = -1
    blossomparent[bb] = b
    const childs = []
    blossomchilds[b] = childs
    const endps = []
    blossomendps[b] = endps
    while (bv !== bb) {
      blossomparent[bv] = b
      childs.push(bv)
      endps.push(labelend[bv])
      v = endpoint[labelend[bv]]
      bv = inblossom[v]
    }
    childs.push(bb)
    childs.reverse()
    endps.reverse()
    endps.push(2 * k)
    while (bw !== bb) {
      blossomparent[bw] = b
      childs.push(bw)
      endps.push(labelend[bw] ^ 1)
      w = endpoint[labelend[bw]]
      bw = inblossom[w]
    }
    label[b] = 1
    labelend[b] = labelend[bb]
    dualvar[b] = 0
    for (const leaf of blossomLeaves(b)) {
      if (label[inblossom[leaf]] === 2) queue.push(leaf)
      inblossom[leaf] = b
    }
    const bestedgeto = new Int32Array(2 * nvertex).fill(-1)
    for (const bvChild of childs) {
      let nblists
      if (blossombestedges[bvChild] === null) {
        nblists = []
        for (const leaf of blossomLeaves(bvChild)) {
          const lst = []
          for (const p of neighbend[leaf]) lst.push(p >> 1)
          nblists.push(lst)
        }
      } else {
        nblists = [blossombestedges[bvChild]]
      }
      for (const nblist of nblists) {
        for (const kk of nblist) {
          let [i, j] = edges[kk]
          if (inblossom[j] === b) {
            const t = i
            i = j
            j = t
          }
          const bj = inblossom[j]
          if (
            bj !== b &&
            label[bj] === 1 &&
            (bestedgeto[bj] === -1 || slack(kk) < slack(bestedgeto[bj]))
          ) {
            bestedgeto[bj] = kk
          }
        }
      }
      blossombestedges[bvChild] = null
      bestedge[bvChild] = -1
    }
    const be = []
    for (let i = 0; i < 2 * nvertex; i++) {
      if (bestedgeto[i] !== -1) be.push(bestedgeto[i])
    }
    blossombestedges[b] = be
    bestedge[b] = -1
    for (const kk of be) {
      if (bestedge[b] === -1 || slack(kk) < slack(bestedge[b])) bestedge[b] = kk
    }
  }

  function expandBlossom(b, endstage) {
    for (const s of blossomchilds[b]) {
      blossomparent[s] = -1
      if (s < nvertex) {
        inblossom[s] = s
      } else if (endstage && dualvar[s] === 0) {
        expandBlossom(s, endstage)
      } else {
        for (const leaf of blossomLeaves(s)) inblossom[leaf] = s
      }
    }
    if (!endstage && label[b] === 2) {
      const entrychild = inblossom[endpoint[labelend[b] ^ 1]]
      let j = blossomchilds[b].indexOf(entrychild)
      let jstep, endptrick
      if (j & 1) {
        j -= blossomchilds[b].length
        jstep = 1
        endptrick = 0
      } else {
        jstep = -1
        endptrick = 1
      }
      let p = labelend[b]
      const childs = blossomchilds[b]
      const endps = blossomendps[b]
      const n = childs.length
      while (j !== 0) {
        label[endpoint[p ^ 1]] = 0
        label[endpoint[(endps[((j - endptrick) % n + n) % n] ^ endptrick) ^ 1]] = 0
        assignLabel(endpoint[p ^ 1], 2, p)
        allowedge[endps[((j - endptrick) % n + n) % n] >> 1] = 1
        j += jstep
        p = endps[((j - endptrick) % n + n) % n] ^ endptrick
        allowedge[p >> 1] = 1
        j += jstep
      }
      const bv = childs[((j % n) + n) % n]
      label[endpoint[p ^ 1]] = 2
      label[bv] = 2
      labelend[endpoint[p ^ 1]] = p
      labelend[bv] = p
      bestedge[bv] = -1
      j += jstep
      while (childs[((j % n) + n) % n] !== entrychild) {
        const bvv = childs[((j % n) + n) % n]
        if (label[bvv] === 1) {
          j += jstep
          continue
        }
        let leafToLabel = -1
        for (const leaf of blossomLeaves(bvv)) {
          if (label[leaf] !== 0) {
            leafToLabel = leaf
            break
          }
        }
        if (leafToLabel !== -1) {
          label[leafToLabel] = 0
          label[endpoint[mate[blossombase[bvv]]]] = 0
          assignLabel(leafToLabel, 2, labelend[leafToLabel])
        }
        j += jstep
      }
    }
    label[b] = -1
    labelend[b] = -1
    blossomchilds[b] = null
    blossomendps[b] = null
    blossombase[b] = -1
    blossombestedges[b] = null
    bestedge[b] = -1
    unusedblossoms.push(b)
  }

  function augmentBlossom(b, v) {
    let t = v
    while (blossomparent[t] !== b) t = blossomparent[t]
    if (t >= nvertex) augmentBlossom(t, v)
    const childs = blossomchilds[b]
    const endps = blossomendps[b]
    const n = childs.length
    let i = childs.indexOf(t)
    let j = i
    let jstep, endptrick
    if (i & 1) {
      j -= n
      jstep = 1
      endptrick = 0
    } else {
      jstep = -1
      endptrick = 1
    }
    while (j !== 0) {
      j += jstep
      let tt = childs[((j % n) + n) % n]
      const p = endps[((j - endptrick) % n + n) % n] ^ endptrick
      if (tt >= nvertex) augmentBlossom(tt, endpoint[p])
      j += jstep
      tt = childs[((j % n) + n) % n]
      if (tt >= nvertex) augmentBlossom(tt, endpoint[p ^ 1])
      mate[endpoint[p]] = p ^ 1
      mate[endpoint[p ^ 1]] = p
    }
    blossomchilds[b] = childs.slice(i).concat(childs.slice(0, i))
    blossomendps[b] = endps.slice(i).concat(endps.slice(0, i))
    blossombase[b] = blossombase[blossomchilds[b][0]]
  }

  function augmentMatching(k) {
    const v0 = edges[k][0]
    const w0 = edges[k][1]
    for (const [s0, p0] of [
      [v0, 2 * k + 1],
      [w0, 2 * k],
    ]) {
      let s = s0
      let p = p0
      while (true) {
        const bs = inblossom[s]
        if (bs >= nvertex) augmentBlossom(bs, s)
        mate[s] = p
        if (labelend[bs] === -1) break
        const t = endpoint[labelend[bs]]
        const bt = inblossom[t]
        const sNext = endpoint[labelend[bt]]
        const j = endpoint[labelend[bt] ^ 1]
        if (bt >= nvertex) augmentBlossom(bt, j)
        mate[j] = labelend[bt]
        p = labelend[bt] ^ 1
        s = sNext
      }
    }
  }

  for (let t = 0; t < nvertex; t++) {
    label.fill(0)
    bestedge.fill(-1)
    for (let i = nvertex; i < 2 * nvertex; i++) blossombestedges[i] = null
    allowedge.fill(0)
    queue = []
    for (let v = 0; v < nvertex; v++) {
      if (mate[v] === -1 && label[inblossom[v]] === 0) assignLabel(v, 1, -1)
    }
    let augmented = false
    while (true) {
      while (queue.length > 0 && !augmented) {
        const v = queue.pop()
        for (const p of neighbend[v]) {
          const k = p >> 1
          const w = endpoint[p]
          if (inblossom[v] === inblossom[w]) continue
          if (!allowedge[k]) {
            if (slack(k) <= 0) allowedge[k] = 1
          }
          if (allowedge[k]) {
            if (label[inblossom[w]] === 0) {
              assignLabel(w, 2, p ^ 1)
            } else if (label[inblossom[w]] === 1) {
              const base = scanBlossom(v, w)
              if (base >= 0) {
                addBlossom(base, k)
              } else {
                augmentMatching(k)
                augmented = true
                break
              }
            } else if (label[w] === 0) {
              label[w] = 2
              labelend[w] = p ^ 1
            }
          } else if (label[inblossom[w]] === 1) {
            const b = inblossom[v]
            if (bestedge[b] === -1 || slack(k) < slack(bestedge[b])) bestedge[b] = k
          } else if (label[w] === 0) {
            if (bestedge[w] === -1 || slack(k) < slack(bestedge[w])) bestedge[w] = k
          }
        }
      }
      if (augmented) break

      let deltatype = -1
      let delta = 0
      let deltaedge = -1
      let deltablossom = -1

      if (!maxcardinality) {
        deltatype = 1
        delta = Infinity
        for (let v = 0; v < nvertex; v++) delta = Math.min(delta, dualvar[v])
      }
      for (let v = 0; v < nvertex; v++) {
        if (label[inblossom[v]] === 0 && bestedge[v] !== -1) {
          const d = slack(bestedge[v])
          if (deltatype === -1 || d < delta) {
            delta = d
            deltatype = 2
            deltaedge = bestedge[v]
          }
        }
      }
      for (let b = 0; b < 2 * nvertex; b++) {
        if (blossomparent[b] === -1 && label[b] === 1 && bestedge[b] !== -1) {
          const kslack = slack(bestedge[b])
          const d = kslack / 2
          if (deltatype === -1 || d < delta) {
            delta = d
            deltatype = 3
            deltaedge = bestedge[b]
          }
        }
      }
      for (let b = nvertex; b < 2 * nvertex; b++) {
        if (
          blossombase[b] >= 0 &&
          blossomparent[b] === -1 &&
          label[b] === 2 &&
          (deltatype === -1 || dualvar[b] < delta)
        ) {
          delta = dualvar[b]
          deltatype = 4
          deltablossom = b
        }
      }
      if (deltatype === -1) {
        deltatype = 1
        delta = Math.max(0, (() => { let m = Infinity; for (let v = 0; v < nvertex; v++) m = Math.min(m, dualvar[v]); return m })())
      }

      for (let v = 0; v < nvertex; v++) {
        const lb = label[inblossom[v]]
        if (lb === 1) dualvar[v] -= delta
        else if (lb === 2) dualvar[v] += delta
      }
      for (let b = nvertex; b < 2 * nvertex; b++) {
        if (blossombase[b] >= 0 && blossomparent[b] === -1) {
          if (label[b] === 1) dualvar[b] += delta
          else if (label[b] === 2) dualvar[b] -= delta
        }
      }

      if (deltatype === 1) {
        break
      } else if (deltatype === 2) {
        allowedge[deltaedge] = 1
        let i = edges[deltaedge][0]
        if (label[inblossom[i]] === 0) i = edges[deltaedge][1]
        queue.push(i)
      } else if (deltatype === 3) {
        allowedge[deltaedge] = 1
        queue.push(edges[deltaedge][0])
      } else if (deltatype === 4) {
        expandBlossom(deltablossom, false)
      }
    }
    if (!augmented) break
    for (let b = nvertex; b < 2 * nvertex; b++) {
      if (
        blossomparent[b] === -1 &&
        blossombase[b] >= 0 &&
        label[b] === 1 &&
        dualvar[b] === 0
      ) {
        expandBlossom(b, true)
      }
    }
  }

  // read matching off the endpoints
  const result = new Int32Array(nvertex).fill(-1)
  for (let v = 0; v < nvertex; v++) {
    if (mate[v] >= 0) result[v] = endpoint[mate[v]]
  }
  return result
}

/**
 * Exact minimum-weight PERFECT matching on a complete graph given by a
 * symmetric cost matrix (cost[i][j], Infinity on the diagonal).
 *
 * @param {Array<Array<number>>} cost
 * @returns {{cost: number, pairs: Array<[number, number]>}}
 */
export function exactMinWeightMatching(cost) {
  const n = cost.length
  if (n === 0) return { cost: 0, pairs: [] }
  // build edge list with negated weights (max-weight => min original)
  let maxc = 0
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (isFinite(cost[i][j]) && cost[i][j] > maxc) maxc = cost[i][j]
    }
  }
  const edges = []
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (isFinite(cost[i][j])) {
        // shift so all weights are >= 0 for max-weight matching
        edges.push([i, j, maxc - cost[i][j]])
      }
    }
  }
  const mate = maxWeightMatching(n, edges, true)
  const pairs = []
  let total = 0
  const seen = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    if (mate[i] === -1) {
      return { cost: Infinity, pairs: [] } // no perfect matching
    }
    if (!seen[i] && !seen[mate[i]]) {
      seen[i] = 1
      seen[mate[i]] = 1
      pairs.push([i, mate[i]])
      total += cost[i][mate[i]]
    }
  }
  return { cost: total, pairs: pairs }
}
