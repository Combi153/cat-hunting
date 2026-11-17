import test from 'node:test';
import assert from 'node:assert/strict';
import { Exam, DESK, WINDOW } from '../src/session.js';
import { approachPath, blocked, stationPath } from '../src/walkways.js';

test('tapping any desk from a row, an aisle, or behind the teacher’s desk reaches its side by a clear path', () => {
  const { seats } = new Exam();
  for (const start of [
    { x: -2.24, z: 3.7 },
    { x: 0, z: 5.4 },
    { x: -3.4, z: 0.7 },
    { x: 4.55, z: -4.6 },
  ]) {
    for (const seat of seats) {
      const path = approachPath(seats, start, seat);
      assert.ok(path?.length);
      let prev = start;
      for (const next of path) {
        assert.ok(prev.x === next.x || prev.z === next.z);
        for (let i = 0; i <= 64; i++) {
          const x = prev.x + ((next.x - prev.x) * i) / 64;
          const z = prev.z + ((next.z - prev.z) * i) / 64;
          assert.equal(blocked(seats, x, z), false);
        }
        prev = next;
      }
      assert.ok(Math.abs(prev.x - seat.x) > 0.75);
      assert.ok(Math.hypot(prev.x - seat.x, prev.z - seat.z) < 1.5);
    }
  }
});

test('both service stations can be reached from either side of all twelve desks', () => {
  const { seats } = new Exam();
  for (const seat of seats) {
    for (const side of [-1, 1]) {
      for (const [place, target] of [['window', WINDOW], ['desk', DESK]]) {
        let prev = { x: seat.x + side * 1.02, z: seat.z + 0.52 };
        const path = stationPath(seats, prev, place);
        assert.ok(path?.length);
        for (const next of path) {
          assert.ok(prev.x === next.x || prev.z === next.z);
          for (let i = 0; i <= 32; i++) {
            assert.equal(blocked(seats, prev.x + (next.x - prev.x) * i / 32, prev.z + (next.z - prev.z) * i / 32), false);
          }
          prev = next;
        }
        assert.ok(Math.hypot(prev.x - target.x, prev.z - target.z) < 2.05);
      }
    }
  }
});
