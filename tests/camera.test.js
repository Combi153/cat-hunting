import test from 'node:test';
import assert from 'node:assert/strict';
import { Box3, OrthographicCamera, Vector3 } from 'three';
import { Room } from '../src/world.js';
import { Exam, TYPES } from '../src/session.js';
import { createProctor, createStudent, updateStudent } from '../src/art/characters.js';
import { REAR_SIGN_Y } from '../src/art/dimensions.js';
import { PROCTOR_HOME } from '../src/walkways.js';

function frame(aspect, session = new Exam(42), focus = null) {
  const room = Object.create(Room.prototype);
  Object.assign(room, {
    session,
    aspect,
    camera: new OrthographicCamera(-6, 6, 7, -7, 0.05, 70),
    look: new Vector3(),
    target: new Vector3(),
    position: new Vector3(),
    halfHeight: 7,
    path: [],
    focus,
  });
  room.updateCamera(1, true);
  return room;
}

function assertFits(box, camera, label) {
  for (const x of [box.min.x, box.max.x])
    for (const y of [box.min.y, box.max.y])
      for (const z of [box.min.z, box.max.z]) {
        const point = new Vector3(x, y, z).project(camera);
        assert.ok(Math.abs(point.x) < 0.98 && Math.abs(point.y) < 0.98,
          `${label}: ${point.toArray()}`);
      }
}

for (const stage of [1, 3]) test(`stage ${stage} overview keeps the rear sign, whole students and proctor inside every frame`, () => {
  const exam = new Exam(42, stage);
  const proctor = createProctor();
  proctor.position.set(PROCTOR_HOME.x, 0, PROCTOR_HOME.z);
  proctor.rotation.y = Math.PI;
  const actors = exam.seats.map((seat, i) => {
    const student = createStudent(i);
    // Raised hands must fit too; seat-center touch targets alone miss cropping.
    updateStudent(student, { time: 1, pose: 'hand' });
    student.position.set(seat.x, 0, seat.z);
    return student;
  });
  actors.push(proctor);
  const bounds = actors.map((actor) => new Box3().setFromObject(actor));
  // Include the entire rear sign frame, not just its text or center point.
  bounds.push(new Box3(
    new Vector3(-0.81, REAR_SIGN_Y - 0.24, -5.615),
    new Vector3(0.81, REAR_SIGN_Y + 0.24, -5.55),
  ));
  for (const aspect of [0.5, 0.85, 1, 1.001, 800 / 730, 800 / 617, 800 / 517, 2.5]) {
    const { camera } = frame(aspect, exam);
    bounds.forEach((box, i) => assertFits(box, camera, `actor ${i}, aspect ${aspect}`));
  }
});

test('the tighter observation frame keeps faces, raised hands and normal and cheating props visible', () => {
  const session = new Exam(42, 3);
  const poses = ['hand', ...Object.keys(TYPES).flatMap(kind => ['proof-' + kind, 'clear-' + kind])];
  for (const seat of session.seats) {
    const student = createStudent(seat.id - 1);
    student.position.set(seat.x, 0, seat.z);
    const { head, left, right, props } = student.userData.clay;
    // Tall and wide canvases exercise the minimum horizontal and vertical extents.
    const cameras = [frame(0.5, session, seat.id).camera, frame(2, session, seat.id).camera];
    for (const [i, pose] of poses.entries()) {
      updateStudent(student, { time: i + 1, pose });
      student.updateMatrixWorld(true);
      const parts = [head, left.hand, right.hand, props.earCase, ...props.group.children];
      for (const part of parts.filter(part => part.visible)) {
        const box = new Box3().setFromObject(part);
        for (const camera of cameras) assertFits(box, camera, `seat ${seat.id}, pose ${pose}`);
      }
    }
  }
});

test('resizing across a square canvas does not abruptly zoom or shift the classroom', () => {
  const before = frame(0.999), after = frame(1.001);
  for (const position of [new Vector3(0, 0, PROCTOR_HOME.z), new Vector3(0, 1.5, -4.5)]) {
    const a = position.clone().project(before.camera);
    const b = position.clone().project(after.camera);
    assert.ok(a.distanceTo(b) < 0.01);
  }
});
