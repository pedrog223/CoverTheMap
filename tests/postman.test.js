/**
 * Tests for the route solver. Run with:  npm test
 *
 * They use tiny hand-made graphs where the right answer is easy to verify by
 * hand, so if someone changes the solver and breaks it, these fail.
 * The solver only needs plain objects ({from, to, distance}), no map or browser.
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import { solvePostman } from "../src/js/PostmanSolver.js"

/** Builds an undirected edge between two node objects. */
const edge = (from, to, distance) => ({ from, to, distance, trimmed: false })
const node = (name) => ({ name })

/** Sum of the lengths of the consecutive hops of a solved route. */
function routeLength(solution, edges) {
  let total = 0
  for (let i = 1; i < solution.waypoints.length; i++) {
    const a = solution.waypoints[i - 1]
    const b = solution.waypoints[i]
    const e = edges.find(
      (x) => (x.from === a && x.to === b) || (x.from === b && x.to === a)
    )
    assert.ok(e, "route uses a street that does not exist")
    total += e.distance
  }
  return total
}

test("a square (all nodes even) is covered exactly once", () => {
  const [a, b, c, d] = ["a", "b", "c", "d"].map(node)
  const edges = [edge(a, b, 100), edge(b, c, 100), edge(c, d, 100), edge(d, a, 100)]
  for (const exact of [true, false]) {
    const sol = solvePostman(edges, edges, a, null, exact)
    assert.equal(routeLength(sol, edges), 400)
    assert.equal(sol.waypoints[0], a)
    assert.equal(sol.waypoints.at(-1), a)
  }
})

test("a dead-end street must be walked twice when returning to the start", () => {
  // a --100-- b --50-- c   (c is a dead end)
  const [a, b, c] = ["a", "b", "c"].map(node)
  const edges = [edge(a, b, 100), edge(b, c, 50)]
  const sol = solvePostman(edges, edges, a, null, true)
  assert.equal(routeLength(sol, edges), 300)
})

test("choosing a different end point removes the need to come back", () => {
  const [a, b, c] = ["a", "b", "c"].map(node)
  const edges = [edge(a, b, 100), edge(b, c, 50)]
  const sol = solvePostman(edges, edges, a, c, true)
  assert.equal(routeLength(sol, edges), 150)
  assert.equal(sol.waypoints.at(-1), c)
})

test("every required street appears in the route", () => {
  // two triangles sharing node b -> bowtie, all degrees even except none
  const [a, b, c, d, e] = ["a", "b", "c", "d", "e"].map(node)
  const edges = [
    edge(a, b, 1), edge(b, c, 1), edge(c, a, 1),
    edge(b, d, 1), edge(d, e, 1), edge(e, b, 1),
  ]
  const sol = solvePostman(edges, edges, a, null, true)
  const used = new Set()
  for (let i = 1; i < sol.waypoints.length; i++) {
    used.add([sol.waypoints[i - 1].name, sol.waypoints[i].name].sort().join("-"))
  }
  assert.equal(used.size, edges.length)
  assert.equal(routeLength(sol, edges), 6)
})

test("exact matching is never worse than the heuristic", () => {
  // a 3x3 grid of unit streets: many odd nodes, a real matching problem
  const n = []
  for (let i = 0; i < 9; i++) n.push(node("n" + i))
  const edges = []
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (c < 2) edges.push(edge(n[r * 3 + c], n[r * 3 + c + 1], 1))
      if (r < 2) edges.push(edge(n[r * 3 + c], n[(r + 1) * 3 + c], 1))
    }
  }
  const exact = routeLength(solvePostman(edges, edges, n[0], null, true), edges)
  const heur = routeLength(solvePostman(edges, edges, n[0], null, false), edges)
  assert.ok(exact <= heur)
  assert.ok(exact >= edges.length)
})

test("an empty problem returns null instead of crashing", () => {
  assert.equal(solvePostman([], [], null, null, true), null)
})
