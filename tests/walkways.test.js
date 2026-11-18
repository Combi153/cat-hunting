import test from 'node:test';
import assert from 'node:assert/strict';
import { Exam } from '../src/session.js';
import { approachPath, stationPath, blocked, PROCTOR_HOME } from '../src/walkways.js';

test('all twelve desks and the curtain are reachable without crossing furniture', () => {
  const { seats } = new Exam(42);
  const starts = [
    PROCTOR_HOME,
    ...seats.map((s) => approachPath(seats, PROCTOR_HOME, s).at(-1)),
    { x: -4.4, z: 1.4 },
  ];
  for (const start of starts) {
    for (const path of [
      ...seats.map((s) => approachPath(seats, start, s)),
      stationPath(seats, start, 'window'),
      stationPath(seats, start, 'home'),
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
  room.proctor = { position: new Vector3(PROCTOR_HOME.x, 0, PROCTOR_HOME.z), rotation: { y: 0 } };
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
  assert.equal(room.returning, true);
  room.step(10);
  assert.equal(room.returning, false);
  assert.deepEqual(room.proctor.position.toArray(), [PROCTOR_HOME.x, 0, PROCTOR_HOME.z]);
  assert.equal(room.proctor.rotation.y, Math.PI);
});

test('reports and observation exits return home before another visit', async () => {
  const { Room } = await import('../src/world.js');
  const { Vector3 } = await import('three');
  for (const guilty of [false, true]) {
    const room = Object.create(Room.prototype);
    room.session = new Exam(42);
    room.proctor = { position: new Vector3(PROCTOR_HOME.x, 0, PROCTOR_HOME.z), rotation: { y: Math.PI } };
    room.path = [];
    const seat = room.session.seats.find((s) => s.guilty === guilty);
    room.select(seat.id);
    room.step(10);
    room.session.report(seat.id);
    room.returnHome();
    room.select(12);
    room.overview();
    assert.equal(room.focus, null);
    assert.equal(room.busy, 'returning');
    room.step(10);
    assert.deepEqual(room.proctor.position.toArray(), [0, 0, 5.45]);
    assert.equal(room.proctor.rotation.y, Math.PI);
    room.select(12);
    room.step(10);
    room.overview();
    assert.equal(room.busy, 'returning');
  }
});
