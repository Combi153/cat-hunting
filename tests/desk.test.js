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
