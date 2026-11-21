import test from 'node:test';
import assert from 'node:assert/strict';
import { Box3, OrthographicCamera, Raycaster, Vector3 } from 'three';
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

test('the inspection camera can see the markings past the animated hands and sleeves', () => {
  const session = new Exam(42, 3);
  const student = createStudent(5);
  const seat = session.seat(6);
  student.position.set(seat.x, 0, seat.z);
  const { camera } = frame(0.8, session, seat.id);
  const { props } = student.userData.clay;
  const ray = new Raycaster();
  // Points on printed columns, photo, screen corners, lens, dial or pen tip.
  const samples = [
    ['proof-note', props.note, [[-0.063, 0.051, 0.008], [-0.063, -0.051, 0.008], [0.05, -0.051, 0.008]]],
    ['clear-note', props.id, [[-0.052, 0.011, 0.014], [0.058, 0.018, 0.008]]],
    ['proof-camera', props.camera, [[-0.04, 0.02, 0.032], [0.019, -0.017, 0.032]]],
    ['clear-camera', props.eraser, [[-0.035, 0.016, 0.017], [0, 0.018, 0.017]]],
    ['proof-glasses', props.glasses, [[-0.092, 0, 0.012], [0.092, 0, 0.012]]],
    ['clear-glasses', props.clearGlasses, [[-0.11, 0.01, 0.016], [0.074, 0.01, 0.016]]],
    ['proof-ear', props.ear, [[-0.017, 0.027, 0.012]]],
    ['proof-watch', props.watchAnswers, [[-0.021, 0.025, 0.055], [0.021, -0.014, 0.055]]],
    ['clear-watch', props.watchTime, [[0, 0.004, 0.055]]],
    ['proof-pen', props.penCamera, [[0, -0.031, 0.02], [0, -0.07, 0.02]]],
    ['clear-pen', props.clearPen, [[0, -0.106, 0]]],
  ];
  let time = 0;
  for (const [pose, prop, points] of samples) {
    for (const phase of ['write', pose.split('-')[1], pose]) {
      for (let tick = 1; tick <= 60; tick++) {
        updateStudent(student, { time: time += 1 / 60, pose: phase });
        if (phase !== pose || ![15, 30, 60].includes(tick)) continue;
        student.updateMatrixWorld(true);
        const meshes = [];
        student.traverseVisible(mesh => {
          if (mesh.isInstancedMesh) mesh.computeBoundingSphere();
          if (mesh.isMesh) meshes.push(mesh);
        });
        for (const point of points) {
          const screen = prop.localToWorld(new Vector3(...point)).project(camera);
          ray.setFromCamera(screen, camera);
          const [hit] = ray.intersectObjects(meshes, false);
          assert.ok(hit && prop.getObjectById(hit.object.id), `${pose}, frame ${tick}, point ${point}`);
        }
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
