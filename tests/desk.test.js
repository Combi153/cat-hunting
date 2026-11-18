import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { createStudent, updateStudent } from '../src/art/characters.js';
import { STUDENT_DESK_TOP } from '../src/art/dimensions.js';

function lowestVertex(group) {
  let bottom = Infinity;
  const point = new Vector3();
  group.traverse((mesh) => {
    if (!mesh.isMesh) return;
    const vertices = mesh.geometry.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
      point.fromBufferAttribute(vertices, i).applyMatrix4(mesh.matrixWorld);
      bottom = Math.min(bottom, point.y);
    }
  });
  return bottom;
}

test('both writing hands clear the desktop and the pencil tip stays on the paper', () => {
  const student = createStudent();
  const { left, right, pencil } = student.userData.clay;
  for (let i = 0; i < 45; i++) {
    updateStudent(student, { time: i / 15, pose: 'write' });
    student.updateMatrixWorld(true);
    for (const hand of [left.hand, right.hand]) {
      const clearance = lowestVertex(hand) - STUDENT_DESK_TOP;
      assert.ok(clearance >= 0.01 && clearance < 0.025, String(clearance));
    }
    const paperGap = lowestVertex(pencil) - (STUDENT_DESK_TOP + 0.011);
    assert.ok(Math.abs(paperGap) < 0.002, String(paperGap));
  }
});

test('the finale changes the face and lifts the winning proctor’s hands', async () => {
  const { createProctor, updateEnding } = await import('../src/art/characters.js');
  const student = createStudent(2);
  updateEnding(student, 'villain', 1);
  const face = student.userData.clay.head.userData.face;
  assert.equal(face.grin.visible, true);
  assert.ok(face.brows[0].rotation.z < 0);
  const proctor = createProctor();
  updateEnding(proctor, 'win', 1);
  const rig = proctor.userData.clay;
  assert.ok(rig.head.userData.face.grin.visible);
  assert.ok(rig.left.wrist.y > 0.7 && rig.right.wrist.y > 0.7);
  assert.equal(rig.clipboard.visible, false);
  updateEnding(proctor, 'sad', 2);
  assert.equal(rig.head.userData.face.grin.visible, false);
  assert.ok(rig.head.rotation.x > 0.2);
});

test('wrongly accused students remain tearful after the first sobbing reaction', async () => {
  const { updateUpset } = await import('../src/art/characters.js');
  const student = createStudent(1);
  for (const time of [0.2, 3, 25, 89]) {
    updateStudent(student, { time, pose: 'write' });
    updateUpset(student, time);
    const face = student.userData.clay.head.userData.face;
    assert.ok(face.tears.visible && face.frown.visible);
    assert.equal(face.grin.visible, false);
    assert.ok(face.brows[0].rotation.z > 0.4);
  }
});

test('watch counterparts share body motion; new props disappear when writing resumes', () => {
  const proof = createStudent(0), clear = createStudent(0);
  for (let i = 0; i < 60; i++) {
    updateStudent(proof, { time: i / 60, pose: 'proof-watch' });
    updateStudent(clear, { time: i / 60, pose: 'clear-watch' });
    for (const arm of ['left', 'right']) {
      assert.deepEqual(proof.userData.clay[arm].wrist, clear.userData.clay[arm].wrist);
    }
  }
  for (const pose of ['watch', 'proof-watch', 'clear-watch', 'pen', 'proof-pen', 'clear-pen', 'sleeve-adjust', 'wrist-rest', 'neck-stretch', 'reread']) {
    for (let i = 0; i < 90; i++) updateStudent(proof, { time: i / 60, pose });
    proof.updateMatrixWorld(true);
    proof.traverse(part => assert.ok(part.matrixWorld.elements.every(Number.isFinite), pose));
    updateStudent(proof, { time: 2, pose: 'write' });
    assert.ok(proof.userData.clay.props.group.children.every(prop => !prop.visible), pose);
  }
});
