import test from 'node:test';
import assert from 'node:assert/strict';
import { Exam } from '../src/session.js';
import { approachPath, stationPath, blocked } from '../src/walkways.js';

test('all twelve desks and the curtain are reachable without crossing furniture', () => {
  const { seats } = new Exam(42);
  const starts = [
    { x: 0, z: 3.7 },
    ...seats.map((s) => approachPath(seats, { x: 0, z: 3.7 }, s).at(-1)),
    { x: -4.4, z: 1.4 },
  ];
  for (const start of starts) {
    for (const path of [
      ...seats.map((s) => approachPath(seats, start, s)),
      stationPath(seats, start, 'window'),
    ]) {
      assert.ok(path);
      let previous = start;
      for (const point of path) {
        for (let t = 0; t <= 1; t += 0.02)
          assert.equal(
            blocked(seats, previous.x + (point.x - previous.x) * t, previous.z + (point.z - previous.z) * t),
            false,
          );
        previous = point;
      }
    }
  }
});

test('observation waits for arrival and help completes after the physical action', async () => {
  const { Room } = await import('../src/world.js');
  const { Vector3 } = await import('three');
  const room = Object.create(Room.prototype);
  room.session = new Exam(42);
  room.proctor = { position: new Vector3(0, 0, 3.7), rotation: { y: 0 } };
  room.path = [];
  room.action = null;
  const request = room.session.requests[1];
  room.session.time = request.start;
  room.select(request.id);
  assert.equal(room.busy, 'walking');
  assert.equal(room.help(), false);
  room.step(10);
  assert.equal(room.busy, '');
  assert.equal(room.help(), true);
  room.overview();
  assert.equal(room.focus, request.id);
  let completion = null;
  for (let t = 0; t < 10 && !completion; t += 0.1) completion = room.step(0.1);
  assert.equal(completion, request);
  assert.equal(request.done, true);
  assert.equal(room.curtainProgress, 1);
  assert.equal(room.focus, null);
  assert.equal(room.help(), false);
});
