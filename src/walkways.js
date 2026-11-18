const DESK = { x: 0, z: 4.55 };
export const PROCTOR_HOME = { x: 0, z: 5.45 };
const WINDOW = { x: -4.4, z: 1.4 };
const cache = new WeakMap();
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const insideRoom = (p) => p.x >= -4.77 && p.x <= 4.77 && p.z >= -4.95 && p.z <= 5.52;
const mix = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });

function obstacles(seats) {
  return [
    { left: DESK.x - 1.17, right: DESK.x + 1.17, back: DESK.z - 0.63, front: DESK.z + 0.63 },
    ...seats.map((s) => ({ left: s.x - 0.88, right: s.x + 0.88, back: s.z - 0.55, front: s.z + 1.07 })),
  ];
}
// Slab intersection checks the segment itself, including diagonals, against body-clearance bounds.
function clear(rectangles, a, b) {
  if (!insideRoom(a) || !insideRoom(b)) return false;
  return !rectangles.some((r) => {
    let enter = 0,
      leave = 1;
    for (const [axis, min, max] of [
      ['x', r.left, r.right],
      ['z', r.back, r.front],
    ]) {
      const delta = b[axis] - a[axis];
      if (Math.abs(delta) < 1e-9) {
        if (a[axis] <= min || a[axis] >= max) return false;
      } else {
        const t1 = (min - a[axis]) / delta,
          t2 = (max - a[axis]) / delta;
        enter = Math.max(enter, Math.min(t1, t2));
        leave = Math.min(leave, Math.max(t1, t2));
        if (enter >= leave) return false;
      }
    }
    return enter <= leave;
  });
}
function graph(seats) {
  if (cache.has(seats)) return cache.get(seats);
  const rectangles = obstacles(seats);
  // Leave room beyond the collision boundary for rounded turns.
  const nodes = rectangles
    .flatMap((r) =>
      [r.left - 0.12, r.right + 0.12].flatMap((x) => [r.back - 0.12, r.front + 0.12].map((z) => ({ x, z }))),
    )
    .filter((p) => clear(rectangles, p, p));
  const edges = nodes.map(() => []);
  for (let i = 0; i < nodes.length; i++)
    for (let j = i + 1; j < nodes.length; j++) {
      if (clear(rectangles, nodes[i], nodes[j])) {
        const cost = distance(nodes[i], nodes[j]);
        edges[i].push([j, cost]);
        edges[j].push([i, cost]);
      }
    }
  const value = { rectangles, nodes, edges };
  cache.set(seats, value);
  return value;
}
export function blocked(seats, x, z) {
  const p = { x, z };
  return !clear(graph(seats).rectangles, p, p);
}
function rounded(rectangles, start, points) {
  const result = [];
  let previous = start;
  for (let i = 0; i < points.length - 1; i++) {
    const corner = points[i],
      next = points[i + 1];
    const radius = Math.min(0.24, distance(previous, corner) * 0.35, distance(corner, next) * 0.35);
    const entry = mix(corner, previous, radius / distance(previous, corner));
    const exit = mix(corner, next, radius / distance(corner, next));
    const curve = [entry];
    for (let step = 1; step <= 6; step++) {
      const t = step / 6;
      curve.push(mix(mix(entry, corner, t), mix(corner, exit, t), t));
    }
    let from = previous;
    const safe = curve.every((p) => {
      const valid = clear(rectangles, from, p);
      from = p;
      return valid;
    });
    if (safe) {
      result.push(...curve);
      previous = exit;
    } else {
      result.push(corner);
      previous = corner;
    }
  }
  if (points.length) result.push(points.at(-1));
  return result.filter((p, i) => distance(i ? result[i - 1] : start, p) > 0.0001);
}
function routeTo(seats, start, goals) {
  const { rectangles, nodes: fixed, edges: fixedEdges } = graph(seats);
  const nodes = [start, ...fixed, ...goals];
  const edges = [
    [],
    ...fixedEdges.map((list) => list.map(([id, cost]) => [id + 1, cost])),
    ...goals.map(() => []),
  ];
  for (const i of [0, ...goals.map((_, j) => fixed.length + 1 + j)]) {
    for (let j = 0; j < nodes.length; j++)
      if (i !== j && clear(rectangles, nodes[i], nodes[j])) {
        const cost = distance(nodes[i], nodes[j]);
        edges[i].push([j, cost]);
        edges[j].push([i, cost]);
      }
  }
  const costs = nodes.map(() => Infinity),
    previous = nodes.map(() => -1),
    visited = new Set();
  costs[0] = 0;
  while (visited.size < nodes.length) {
    let current = -1;
    for (let i = 0; i < nodes.length; i++)
      if (!visited.has(i) && (current < 0 || costs[i] < costs[current])) current = i;
    if (current < 0 || !Number.isFinite(costs[current])) return null;
    if (current > fixed.length) {
      const points = [];
      for (let i = current; i > 0; i = previous[i]) points.unshift(nodes[i]);
      return rounded(rectangles, start, points);
    }
    visited.add(current);
    for (const [next, cost] of edges[current])
      if (costs[current] + cost < costs[next]) {
        costs[next] = costs[current] + cost;
        previous[next] = current;
      }
  }
  return null;
}
export function approachPath(seats, start, seat) {
  return routeTo(
    seats,
    start,
    [-1, 1].map((side) => ({ x: seat.x + side * 1.125, z: seat.z + 0.22 })),
  );
}
export function stationPath(seats, start, place) {
  const goals =
    place === 'home'
      ? [PROCTOR_HOME]
      : place === 'window'
        ? [WINDOW]
        : place === 'desk'
          ? [
              { x: -1.5, z: DESK.z },
              { x: 1.5, z: DESK.z },
            ]
          : [];
  if (!goals.length) return null;
  if (goals.some((p) => distance(start, p) < 0.0001)) return [];
  return routeTo(seats, start, goals);
}
