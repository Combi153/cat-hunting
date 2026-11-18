const DESK = { x: 0, z: 4.55 };
const WINDOW = { x: -4.4, z: 1.4 };

export function blocked(seats, x, z) {
  if (x < -4.77 || x > 4.77 || z < -4.95 || z > 5.52) return true;
  return !clearPassage(seats, x, z);
}

const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

// Reach either side of the selected desk via an aisle and a gap between rows.
export function approachPath(seats, start, seat) {
  return routeTo(seats, start, seat.z + 0.52, (aisles) => aisles.filter((x) => Math.abs(x - seat.x) < 1.3));
}

// Stop inside interaction range on the nearest accessible side of the station.
export function stationPath(seats, start, place) {
  if (place === 'window') return routeTo(seats, start, WINDOW.z, () => [WINDOW.x]);
  if (place === 'desk') return routeTo(seats, start, DESK.z, () => [DESK.x - 1.5, DESK.x + 1.5]);
  return null;
}

function routeTo(seats, start, goalZ, goalColumns) {
  const columns = [...new Set(seats.map((s) => s.x))].sort((a, b) => a - b);
  const aisles = [
    columns[0] - 1.05,
    ...columns.slice(1).map((x, i) => (x + columns[i]) / 2),
    columns.at(-1) + 1.05,
  ];
  const rows = [...new Set(seats.map((s) => s.z))];
  const crossings = [start.z, goalZ, ...rows.map((z) => z - 0.82), Math.max(...rows) + 1.45, 5.35];
  let shortest = Infinity;
  let best = null;
  for (const endX of goalColumns(aisles)) {
    for (const crossZ of crossings) {
      for (const startX of [start.x, ...aisles]) {
        const points = [
          { x: startX, z: start.z },
          { x: startX, z: crossZ },
          { x: endX, z: crossZ },
          { x: endX, z: goalZ },
        ];
        let previous = start;
        let length = 0;
        const steps = [];
        for (const point of points) {
          const d = distance(previous, point);
          if (d < 0.0001) continue;
          length += d;
          if (length >= shortest || !clearPassage(seats, previous.x, previous.z, point.x, point.z)) break;
          steps.push(point);
          previous = point;
        }
        if (previous.x === endX && previous.z === goalZ && length < shortest) {
          best = steps;
          shortest = length;
        }
      }
    }
  }
  return best;
}

// Paths are axis aligned. Check the entire segment against each solid rectangle.
function clearPassage(seats, ax, az, bx = ax, bz = az) {
  const xMin = Math.min(ax, bx),
    xMax = Math.max(ax, bx);
  const zMin = Math.min(az, bz),
    zMax = Math.max(az, bz);
  const overlaps = (left, right, back, front) => xMax > left && xMin < right && zMax > back && zMin < front;
  if (overlaps(DESK.x - 1.17, DESK.x + 1.17, DESK.z - 0.63, DESK.z + 0.63)) return false;
  return !seats.some((s) => overlaps(s.x - 0.77, s.x + 0.77, s.z - 0.55, s.z + 1.07));
}
