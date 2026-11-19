import test from 'node:test';
import assert from 'node:assert/strict';
import { Exam } from '../src/session.js';
import { approachPath, stationPath, blocked, PROCTOR_HOME } from '../src/walkways.js';

for (const stage of [1, 3]) test(`all desks and the curtain in stage ${stage} are reachable without crossing furniture`, () => {
  const { seats } = new Exam(42, stage);
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
  room.session = new Exam(42, 3);
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
  room.select(room.session.seats.find((s) => s.id !== request.id).id);
  assert.equal(room.focus, request.id);
  let completion = null;
  for (let t = 0; t < 10 && !completion; t += 0.1) completion = room.step(0.1);
  assert.equal(completion, request);
  assert.equal(request.done, true);
  assert.equal(room.curtainProgress, 1);
  assert.equal(room.focus, null);
  assert.equal(room.help(), false);
  assert.equal(room.returning, true);
  const next = room.session.seats.find((s) => s.id !== request.id);
  room.select(next.id);
  assert.equal(room.returning, false);
  assert.equal(room.focus, next.id);
  room.overview();
  room.step(10);
  assert.equal(room.returning, false);
  assert.deepEqual(room.proctor.position.toArray(), [PROCTOR_HOME.x, 0, PROCTOR_HOME.z]);
  assert.equal(room.proctor.rotation.y, Math.PI);
});

test('return trips can be redirected immediately without visiting home or teleporting', async () => {
  const { Room } = await import('../src/world.js');
  const { Vector3 } = await import('three');
  for (const outcome of ['correct', 'incorrect', 'overview']) {
    const room = Object.create(Room.prototype);
    room.session = new Exam(42, 2);
    room.proctor = { position: new Vector3(PROCTOR_HOME.x, 0, PROCTOR_HOME.z), rotation: { y: Math.PI } };
    room.path = [];
    const seat = room.session.seats.find((s) => s.guilty === (outcome === 'correct'));
    room.select(seat.id);
    room.step(10);
    if (outcome === 'overview') room.overview();
    else {
      room.session.report(seat.id);
      room.returnHome();
    }
    room.step(0.15);
    assert.equal(room.busy, 'returning');
    const position = room.proctor.position.clone();
    const next = room.session.seats.find((s) => s.id !== seat.id);
    const expected = approachPath(room.session.seats, position, next);
    room.select(next.id);
    assert.equal(room.returning, false);
    assert.equal(room.focus, next.id);
    assert.deepEqual(room.proctor.position, position);
    assert.deepEqual(room.path, expected);
    room.step(10);
    assert.equal(room.busy, '');
    assert.equal(room.proctor.position.x, expected.at(-1).x);
    assert.equal(room.proctor.position.z, expected.at(-1).z);
    room.overview();
    room.step(10);
    assert.deepEqual(room.proctor.position.toArray(), [PROCTOR_HOME.x, 0, PROCTOR_HOME.z]);
  }
});

test('repeated retargeting uses the current location and stays clear of furniture', async () => {
  const { Room } = await import('../src/world.js');
  const { Vector3 } = await import('three');
  const room = Object.create(Room.prototype);
  room.session = new Exam(42, 3);
  room.proctor = { position: new Vector3(0, 0, PROCTOR_HOME.z), rotation: { y: Math.PI } };
  room.path = [];
  for (const id of [12, 1, 10, 3, 8, 4, 11, 2, 9, 5, 7, 6]) {
    const position = room.proctor.position.clone();
    room.select(id);
    assert.deepEqual(room.proctor.position, position);
    assert.equal(room.focus, id);
    for (let i = 0; i < 25; i++) {
      room.step(1 / 60);
      assert.equal(blocked(room.session.seats, room.proctor.position.x, room.proctor.position.z), false);
    }
  }
  room.step(10);
  assert.equal(room.busy, '');
  assert.equal(room.focus, 6);
});

test('students in the same aisle use the straight shortest path to the nearer side', () => {
  const { seats } = new Exam(42, 3);
  // At the right side of the front-left desk, the rear-middle desk is reached
  // directly along the shared aisle, without crossing desks or going home.
  const start = { x: -1.125, z: seats[0].z + 0.22 };
  const path = approachPath(seats, start, seats[10]);
  assert.deepEqual(path, [{ x: -1.125, z: seats[10].z + 0.22 }]);
  const direct = Math.abs(path[0].z - start.z);
  assert.equal(direct, Math.hypot(path[0].x - start.x, path[0].z - start.z));
});

test('unobstructed approaches stay straight and return paths do not detour through a fixed station', () => {
  const { seats } = new Exam(42);
  const seat = seats[0],
    start = { x: seat.x - 1.125, z: seat.z + 1.5 };
  const path = approachPath(seats, start, seat);
  assert.equal(path.length, 1);
  assert.equal(path[0].x, start.x);
  const nearHome = { x: 0.4, z: 5.45 };
  assert.deepEqual(stationPath(seats, nearHome, 'home'), [PROCTOR_HOME]);
});

test('frame-by-frame walking avoids furniture and turns gradually', async () => {
  const { Room } = await import('../src/world.js');
  const { Vector3 } = await import('three');
  const room = Object.create(Room.prototype);
  room.session = new Exam(42);
  room.proctor = { position: new Vector3(0, 0, 5.45), rotation: { y: Math.PI } };
  room.path = [];
  for (const seat of room.session.seats) {
    room.select(seat.id);
    for (let frame = 0; frame < 900 && room.busy; frame++) {
      const before = room.proctor.rotation.y;
      room.step(1 / 60);
      assert.equal(blocked(room.session.seats, room.proctor.position.x, room.proctor.position.z), false);
      const turn = Math.atan2(
        Math.sin(room.proctor.rotation.y - before),
        Math.cos(room.proctor.rotation.y - before),
      );
      assert.ok(Math.abs(turn) < 0.7);
    }
    assert.equal(room.busy, '');
    room.returnHome();
    room.step(12);
  }
});
