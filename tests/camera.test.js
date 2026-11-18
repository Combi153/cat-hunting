import test from 'node:test';
import assert from 'node:assert/strict';
import { Box3, OrthographicCamera, Vector3 } from 'three';
import { Room } from '../src/world.js';
import { Exam } from '../src/session.js';
import { createProctor, createStudent, updateStudent } from '../src/art/characters.js';
import { PROCTOR_HOME } from '../src/walkways.js';

function overview(aspect) {
  const room = Object.create(Room.prototype);
  Object.assign(room, {
    session: new Exam(42),
    aspect,
    camera: new OrthographicCamera(-6, 6, 7, -7, 0.05, 70),
    look: new Vector3(),
    target: new Vector3(),
    position: new Vector3(),
    halfHeight: 7,
  });
  room.updateCamera(1, true);
  return room;
}

test('overview keeps the rear sign, whole students and proctor inside every frame', () => {
  const proctor = createProctor();
  proctor.position.set(PROCTOR_HOME.x, 0, PROCTOR_HOME.z);
  proctor.rotation.y = Math.PI;
  const actors = new Exam(42).seats.map((seat, i) => {
    const student = createStudent(i);
    // Raised hands must fit too; seat-center touch targets alone miss cropping.
    updateStudent(student, { time: 1, pose: 'hand' });
    student.position.set(seat.x, 0, seat.z);
    return student;
  });
  actors.push(proctor);
  const bounds = actors.map((actor) => new Box3().setFromObject(actor));
  // Include the entire rear sign frame, not just its text or center point.
  bounds.push(new Box3(new Vector3(-0.81, 2.09, -5.615), new Vector3(0.81, 2.57, -5.55)));
  for (const aspect of [0.5, 0.85, 1, 1.001, 800 / 730, 800 / 617, 800 / 517, 2.5]) {
    const { camera } = overview(aspect);
    for (const [i, box] of bounds.entries()) {
      for (const x of [box.min.x, box.max.x])
        for (const y of [box.min.y, box.max.y])
          for (const z of [box.min.z, box.max.z]) {
            const point = new Vector3(x, y, z).project(camera);
            assert.ok(Math.abs(point.x) < 0.98 && Math.abs(point.y) < 0.98,
              `actor ${i}, aspect ${aspect}: ${point.toArray()}`);
          }
    }
  }
});

test('resizing across a square canvas does not abruptly zoom or shift the classroom', () => {
  const before = overview(0.999), after = overview(1.001);
  for (const position of [new Vector3(0, 0, PROCTOR_HOME.z), new Vector3(0, 1.5, -4.5)]) {
    const a = position.clone().project(before.camera);
    const b = position.clone().project(after.camera);
    assert.ok(a.distanceTo(b) < 0.01);
  }
});
