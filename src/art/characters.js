import * as THREE from 'three';
import { STUDENT_DESK_TOP } from './dimensions.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Metres. Every character looks along +Z. Furniture belongs to the classroom.
const ball = new THREE.SphereGeometry(1, 14, 10);
const softBox = new RoundedBoxGeometry(1, 1, 1, 2, 0.15);
const ring = new THREE.TorusGeometry(1, 0.085, 5, 18);
const materialCache = new Map();
function clay(color, options = {}) {
  const key = color + JSON.stringify(options);
  if (!materialCache.has(key))
    materialCache.set(
      key,
      new THREE.MeshStandardMaterial({ color, roughness: 0.96, metalness: 0, ...options }),
    );
  return materialCache.get(key);
}
const M = {
  skin: clay('#e8b998'),
  skin2: clay('#dca685'),
  blush: clay('#d9a18d'),
  ink: clay('#343332'),
  hair: clay('#39322f'),
  hair2: clay('#514039'),
  hair3: clay('#292c2b'),
  sole: clay('#c9c3b8'),
  shoe: clay('#e9e6dd'),
  trouser: clay('#696b69'),
  white: clay('#efede4'),
  paper: clay('#fff9e7'),
  pencil: clay('#b89962'),
  graphite: clay('#434744'),
  brass: clay('#b7a786'),
  case: clay('#e7ece4'),
  device: clay('#44534f'),
  blue: clay('#9ed4cf', { emissive: '#5eaaa5', emissiveIntensity: 0.2 }),
  screenInk: clay('#386b68'),
  rose: clay('#b77e7d'),
  trim: clay('#c5c4bb'),
};
const shirts = [
  '#e6dfcc',
  '#8d9b93',
  '#a57c72',
  '#75818d',
  '#b6b5ac',
  '#a69277',
  '#c4b5a3',
  '#9babad',
  '#b6a59b',
  '#748b80',
  '#d7c9b1',
  '#9a919f',
];
const temp = new THREE.Vector3();
const axisY = new THREE.Vector3(0, 1, 0);
function mesh(parent, geometry, material, p, s, r) {
  const o = new THREE.Mesh(geometry, material);
  if (p) o.position.set(...p);
  if (s) o.scale.set(...s);
  if (r) o.rotation.set(...r);
  o.castShadow = true;
  o.receiveShadow = true;
  parent.add(o);
  return o;
}
function lump(parent, material, p, s, r) {
  return mesh(parent, ball, material, p, s, r);
}
function box(parent, material, p, s, r) {
  return mesh(parent, softBox, material, p, s, r);
}
// Bake small decorative clay pieces into one mesh per material, so hair and
// knit stitches do not each consume a draw call. Moving joints stay separate.
function bake(group) {
  const buckets = new Map();
  for (const o of [...group.children]) {
    if (!o.isMesh) continue;
    o.updateMatrix();
    const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrix);
    if (!buckets.has(o.material)) buckets.set(o.material, []);
    buckets.get(o.material).push(g);
    group.remove(o);
  }
  for (const [material, geometries] of buckets) {
    const merged = mergeGeometries(geometries, false);
    mesh(group, merged, material);
    geometries.forEach((g) => g.dispose());
  }
  return group;
}
function segment(o, a, b, width, depth = width) {
  temp.subVectors(b, a);
  o.position.copy(a).addScaledVector(temp, 0.5);
  o.scale.set(width, temp.length() * 0.5 + width * 0.55, depth);
  o.quaternion.setFromUnitVectors(axisY, temp.normalize());
}
function v(x, y, z) {
  return new THREE.Vector3(x, y, z);
}
function tinyDigit(parent, digit, x, y, z, size, material = M.screenInk) {
  const patterns = ['abcdef', 'bc', 'abdeg', 'abcdg', 'bcfg', 'acdfg', 'acdefg', 'abc', 'abcdefg', 'abcdfg'];
  const bars = {
    a: [0, 1, 1, 0.18],
    b: [0.5, 0.5, 0.18, 1],
    c: [0.5, -0.5, 0.18, 1],
    d: [0, -1, 1, 0.18],
    e: [-0.5, -0.5, 0.18, 1],
    f: [-0.5, 0.5, 0.18, 1],
    g: [0, 0, 1, 0.18],
  };
  for (const key of patterns[digit]) {
    const [dx, dy, w, h] = bars[key];
    box(parent, material, [x + dx * size, y + dy * size, z], [w * size, h * size, 0.004]);
  }
}
function makeGlasses(proof = false) {
  const g = new THREE.Group();
  for (const x of [-0.092, 0.092]) {
    mesh(g, ring, M.ink, [x, 0, 0.01], [0.078, 0.057, 0.06]);
    if (proof) {
      box(g, M.blue, [x, 0, 0.009], [0.13, 0.084, 0.008]);
      tinyDigit(g, x < 0 ? 0 : 2, x - 0.025, 0, 0.016, 0.021);
      tinyDigit(g, x < 0 ? 7 : 4, x + 0.025, 0, 0.016, 0.021);
    }
  }
  box(g, M.ink, [0, 0.005, 0.01], [0.043, 0.012, 0.018]);
  box(g, M.ink, [-0.174, 0.012, -0.057], [0.012, 0.012, 0.145], [0, -0.16, 0]);
  box(g, M.ink, [0.174, 0.012, -0.057], [0.012, 0.012, 0.145], [0, 0.16, 0]);
  return bake(g);
}
function makeHead(index, proctor = false) {
  const head = new THREE.Group();
  const skin = index % 4 === 2 ? M.skin2 : M.skin;
  const hair = [M.hair, M.hair2, M.hair3][index % 3];
  const shape = new THREE.Group();
  lump(shape, skin, [0, 0, 0], [0.211, 0.235, 0.192]);
  lump(shape, skin, [-0.205, -0.01, 0], [0.042, 0.065, 0.038]);
  lump(shape, skin, [0.205, -0.01, 0], [0.042, 0.065, 0.038]);
  lump(shape, skin, [0, -0.033, 0.186], [0.021, 0.027, 0.022]);
  const face = new THREE.Group();
  const eyes = [];
  for (const x of [-0.071, 0.071]) {
    eyes.push(lump(face, M.ink, [x, -0.018, 0.184], [0.011, 0.016, 0.008]));
    lump(shape, M.blush, [x * 1.58, -0.069, 0.166], [0.027, 0.011, 0.004]);
  }
  const brows = [
    box(face, M.hair, [-0.072, 0.032, 0.18], [0.039, 0.009, 0.006], [0, 0, 0.06]),
    box(face, M.hair, [0.072, 0.032, 0.18], [0.039, 0.009, 0.006], [0, 0, -0.06]),
  ];
  const mouth = lump(face, M.blush, [0, -0.111, 0.169], [0.026, 0.005, 0.004]);
  const grin = new THREE.Group();
  const smileCurve = new THREE.QuadraticBezierCurve3(v(-0.064, -0.09, 0.174), v(0, -0.16, 0.195), v(0.064, -0.09, 0.174));
  mesh(grin, new THREE.TubeGeometry(smileCurve, 14, 0.012, 6, false), M.white);
  grin.visible = false;
  head.add(face, grin);
  head.userData.face = { eyes, brows, mouth, grin };
  // Flattened overlapping locks, with an asymmetric part, keep the silhouette
  // handmade without the round beads reading as animal ears.
  lump(shape, hair, [0, 0.105, -0.035], [0.222, 0.17, 0.187]);
  for (let i = 0; i < 9; i++) {
    const a = (i / 8) * Math.PI;
    const x = Math.cos(a) * 0.171;
    const y = 0.105 + Math.sin(a) * 0.095;
    lump(shape, hair, [x, y, 0.113], [0.06, 0.105, 0.057], [0, 0, -0.45 + i * 0.09]);
  }
  const style = index % 4;
  if (style === 0 || proctor) {
    for (let i = 0; i < 7; i++)
      lump(
        shape,
        hair,
        [-0.155 + i * 0.049, 0.213 + Math.sin(i * 1.7) * 0.012, -0.015],
        [0.069, 0.055, 0.103],
        [0.1, 0.15, -0.2],
      );
  } else if (style === 1) {
    lump(shape, hair, [-0.184, -0.067, -0.032], [0.067, 0.185, 0.143], [0, 0, -0.1]);
    lump(shape, hair, [0.184, -0.067, -0.032], [0.067, 0.185, 0.143], [0, 0, 0.1]);
    lump(shape, hair, [0, -0.13, -0.153], [0.185, 0.16, 0.065]);
  } else if (style === 2) {
    lump(shape, hair, [0, 0.234, -0.135], [0.115, 0.093, 0.1]);
    lump(shape, hair, [-0.194, -0.045, -0.04], [0.041, 0.125, 0.11]);
    lump(shape, hair, [0.194, -0.045, -0.04], [0.041, 0.125, 0.11]);
  } else {
    for (let i = 0; i < 6; i++)
      lump(
        shape,
        hair,
        [-0.15 + i * 0.059, 0.11 + Math.sin(i) * 0.023, 0.15],
        [0.064, 0.095, 0.051],
        [0, 0, -0.32],
      );
  }
  head.add(bake(shape));
  const glasses = makeGlasses();
  glasses.position.set(0, -0.018, 0.188);
  glasses.visible = index % 5 === 0 || proctor;
  head.add(glasses);
  head.userData.glasses = glasses;
  return head;
}
function makeTorso(index, proctor) {
  const g = new THREE.Group();
  const knit = clay(proctor ? '#8f9d7b' : shirts[index % shirts.length]);
  const rib = clay(proctor ? '#798a68' : shirts[index % shirts.length]).clone();
  rib.color.multiplyScalar(0.91);
  lump(g, knit, [0, 0.255, 0], [0.237, 0.272, 0.147]);
  box(g, knit, [0, 0.067, 0.005], [0.403, 0.115, 0.27]);
  lump(g, M.skin, [0, 0.51, 0], [0.073, 0.084, 0.065]);
  // Ribbed neck, waistband and sleeves are modelled clay, with quieter detail
  // than the hair so a hand gesture remains the strongest moving silhouette.
  mesh(g, ring, rib, [0, 0.477, 0.015], [0.088, 0.088, 0.09], [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 12; i++) lump(g, rib, [-0.181 + i * 0.033, 0.057, 0.122], [0.009, 0.045, 0.009]);
  if (proctor || index % 3 === 1) {
    box(g, rib, [0, 0.267, 0.143], [0.024, 0.36, 0.018]);
    for (let i = 0; i < 4; i++) lump(g, M.brass, [0.017, 0.14 + i * 0.074, 0.153], [0.012, 0.012, 0.007]);
    box(g, rib, [-0.127, 0.153, 0.13], [0.109, 0.058, 0.018]);
    box(g, rib, [0.127, 0.153, 0.13], [0.109, 0.058, 0.018]);
  } else {
    for (const x of [-0.11, 0.0, 0.11])
      for (let j = 0; j < 4; j++) {
        lump(
          g,
          rib,
          [x + Math.sin(j * Math.PI) * 0.008, 0.16 + j * 0.065, 0.141],
          [0.013, 0.04, 0.008],
          [0, 0, j % 2 ? -0.35 : 0.35],
        );
      }
  }
  return { group: bake(g), knit, rib };
}
function makeArm(parent, knit, rib, skin, side) {
  const upper = lump(parent, knit);
  const lower = lump(parent, knit);
  const cuff = lump(parent, rib);
  const hand = new THREE.Group();
  lump(hand, skin, [0, 0.008, 0], [0.048, 0.069, 0.034]);
  lump(hand, skin, [side * -0.042, -0.006, 0.012], [0.022, 0.038, 0.025], [0, 0, side * -0.36]);
  // Slightly separated fingertips are visible when requesting a sheet.
  for (let i = 0; i < 4; i++)
    lump(hand, skin, [-0.03 + i * 0.019, 0.061 + (i === 1 ? 0.008 : 0), 0], [0.011, 0.029, 0.018]);
  parent.add(bake(hand));
  return {
    upper,
    lower,
    cuff,
    hand,
    elbow: v(side * 0.29, 0.19, 0.25),
    wrist: v(side * 0.15, 0.3, 0.53),
    shoulder: v(side * 0.222, 0.428, 0),
  };
}
function setArm(arm, elbow, wrist, alpha, raised = false, onDesk = false) {
  arm.elbow.lerp(elbow, alpha);
  arm.wrist.lerp(wrist, alpha);
  segment(arm.upper, arm.shoulder, arm.elbow, 0.085, 0.083);
  segment(arm.lower, arm.elbow, arm.wrist, 0.077, 0.073);
  temp.subVectors(arm.wrist, arm.elbow).normalize();
  arm.cuff.position.copy(arm.wrist).addScaledVector(temp, -0.036);
  arm.cuff.scale.set(0.078, 0.044, 0.073);
  arm.cuff.quaternion.setFromUnitVectors(axisY, temp);
  arm.hand.position.copy(arm.wrist).addScaledVector(temp, 0.025);
  if (onDesk) arm.hand.position.y -= 0.018;
  arm.hand.rotation.set(raised ? 0 : onDesk ? 1.94 : 0.9, 0, raised ? 0 : -0.2);
}
function makePencil() {
  const p = new THREE.Group();
  box(p, M.pencil, [0, 0, 0], [0.013, 0.19, 0.013]);
  lump(p, M.graphite, [0, -0.101, 0], [0.006, 0.016, 0.006]);
  box(p, M.sole, [0, 0.09, 0], [0.015, 0.025, 0.015]);
  return bake(p);
}
function makeProps() {
  const props = new THREE.Group();
  const glasses = makeGlasses(true);
  glasses.position.set(0.08, 0.48, 0.46);
  glasses.rotation.set(-0.23, -0.15, 0.08);
  props.add(glasses);
  const clearGlasses = makeGlasses();
  const reflections = new THREE.Group();
  for (const x of [-0.092, 0.092]) {
    // A plain window-shaped glint rather than answer glyphs.
    box(reflections, M.white, [x - 0.018, 0.01, 0.016], [0.035, 0.056, 0.004], [0, 0, -0.3]);
    box(reflections, M.white, [x + 0.016, 0.01, 0.016], [0.01, 0.056, 0.004], [0, 0, -0.3]);
  }
  clearGlasses.add(bake(reflections));
  clearGlasses.position.copy(glasses.position);
  clearGlasses.rotation.copy(glasses.rotation);
  props.add(clearGlasses);
  const ear = new THREE.Group();
  const earCase = new THREE.Group();
  box(earCase, M.case, [0, 0.024, 0], [0.14, 0.048, 0.09]);
  box(earCase, M.case, [0, 0.073, -0.027], [0.14, 0.063, 0.018], [-0.3, 0, 0]);
  lump(earCase, M.device, [-0.028, 0.05, 0.005], [0.023, 0.009, 0.023]);
  earCase.position.set(0.255, STUDENT_DESK_TOP + 0.012, 0.53);
  lump(ear, M.case, [0.248, 0.566, 0.18], [0.018, 0.026, 0.013]);
  box(ear, M.case, [0.248, 0.542, 0.18], [0.014, 0.035, 0.013]);
  props.add(bake(ear));
  const camera = new THREE.Group();
  box(camera, M.device, [0.16, 0.327, 0.57], [0.15, 0.105, 0.057], [-0.22, 0, 0]);
  box(camera, M.blue, [0.16, 0.329, 0.604], [0.116, 0.075, 0.008], [-0.22, 0, 0]);
  box(camera, M.paper, [0.16, 0.332, 0.61], [0.067, 0.055, 0.004], [-0.22, 0, 0]);
  for (let j = 0; j < 3; j++) box(camera, M.rose, [0.16, 0.316 + j * 0.014, 0.615], [0.043, 0.004, 0.004]);
  lump(camera, M.ink, [0.216, 0.371, 0.575], [0.012, 0.008, 0.01]);
  props.add(bake(camera));
  const note = new THREE.Group();
  box(note, M.paper, [0, 0, 0], [0.205, 0.15, 0.009]);
  for (let j = 0; j < 4; j++) {
    tinyDigit(note, j + 1, -0.068, 0.047 - j * 0.028, 0.008, 0.009, M.rose);
    box(note, M.screenInk, [-0.016, 0.048 - j * 0.028, 0.008], [0.045, 0.006, 0.004], [0, 0, -0.06]);
    tinyDigit(note, [3, 1, 2, 4][j], 0.052, 0.048 - j * 0.028, 0.008, 0.009);
  }
  props.add(bake(note));
  note.position.set(0.06, 0.31, 0.53);
  note.rotation.set(-0.36, -0.12, -0.09);
  const id = new THREE.Group();
  box(id, M.paper, [0, 0, 0], [0.205, 0.13, 0.009]);
  box(id, M.trim, [-0.056, 0.009, 0.008], [0.056, 0.075, 0.004]);
  lump(id, M.skin, [-0.056, 0.02, 0.012], [0.017, 0.02, 0.004]);
  for (let j = 0; j < 3; j++) box(id, M.trim, [0.034, 0.029 - j * 0.025, 0.008], [0.061, 0.006, 0.004]);
  props.add(bake(id));
  id.position.copy(note.position);
  id.rotation.copy(note.rotation);
  const eraser = new THREE.Group();
  box(eraser, M.white, [0.15, 0.3, 0.57], [0.075, 0.025, 0.04]);
  box(eraser, M.trim, [0.15, 0.3, 0.57], [0.035, 0.027, 0.042]);
  props.add(bake(eraser));
  for (const p of props.children) p.visible = false;
  return { group: props, glasses, clearGlasses, ear, earCase: bake(earCase), camera, note, id, eraser };
}
function instanceParts(parent, parts) {
  const batch = new THREE.InstancedMesh(parts[0].geometry, parts[0].material, parts.length);
  batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  batch.castShadow = true;
  batch.receiveShadow = true;
  // The body is small; avoid stale animated-instance bounds at raised hands.
  batch.frustumCulled = false;
  for (const part of parts) parent.remove(part);
  parent.add(batch);
  return { batch, parts };
}
function syncInstances(rig) {
  for (const { batch, parts } of rig.batches) {
    parts.forEach((part, i) => {
      part.updateMatrix();
      batch.setMatrixAt(i, part.matrix);
    });
    batch.instanceMatrix.needsUpdate = true;
  }
}
function makeCharacter(index, proctor = false) {
  const root = new THREE.Group();
  root.name = proctor ? 'Clay exam proctor' : `Clay candidate ${index + 1}`;
  const upper = new THREE.Group();
  root.add(upper);
  const torso = makeTorso(index, proctor);
  upper.add(torso.group);
  const head = makeHead(index, proctor);
  head.position.set(0, 0.706, 0.013);
  upper.add(head);
  const skin = index % 4 === 2 ? M.skin2 : M.skin;
  const left = makeArm(upper, torso.knit, torso.rib, skin, -1);
  const right = makeArm(upper, torso.knit, torso.rib, skin, 1);
  const legs = [-1, 1].map((side) => ({
    side,
    thigh: lump(root, M.trouser),
    shin: lump(root, M.trouser),
    shoe: box(root, M.shoe, [side * 0.11, 0.07, 0.36], [0.15, 0.13, 0.28]),
    sole: box(root, M.sole, [side * 0.11, 0.025, 0.36], [0.153, 0.04, 0.285]),
  }));
  const pencil = makePencil();
  upper.add(pencil);
  const props = makeProps();
  upper.add(props.group);
  props.earCase.visible = false;
  root.add(props.earCase);
  const clipboard = new THREE.Group();
  box(clipboard, clay('#b19978'), [0, 0, 0], [0.24, 0.34, 0.034]);
  box(clipboard, M.paper, [0, 0, 0.022], [0.21, 0.29, 0.009]);
  box(clipboard, M.sole, [0, 0.156, 0.028], [0.078, 0.031, 0.018]);
  for (let i = 0; i < 6; i++) box(clipboard, M.trim, [0, 0.09 - i * 0.035, 0.03], [0.16, 0.005, 0.003]);
  upper.add(bake(clipboard));
  clipboard.visible = proctor;
  const batches = [
    instanceParts(upper, [left.upper, left.lower, right.upper, right.lower]),
    instanceParts(upper, [left.cuff, right.cuff]),
    instanceParts(
      root,
      legs.flatMap((l) => [l.thigh, l.shin]),
    ),
    instanceParts(
      root,
      legs.map((l) => l.shoe),
    ),
    instanceParts(
      root,
      legs.map((l) => l.sole),
    ),
  ];
  root.userData.clay = {
    index,
    proctor,
    upper,
    head,
    left,
    right,
    legs,
    pencil,
    props,
    clipboard,
    batches,
    stand: proctor ? 1 : 0,
    lastTime: null,
    phase: index * 1.61,
    normalGlasses: index % 5 === 0 || proctor,
  };
  if (proctor) root.scale.setScalar(0.93);
  if (proctor) updateProctor(root, { time: 0, walking: false, quiet: false });
  else updateStudent(root, { time: 0, pose: 'write', walking: false });
  return root;
}

export function createStudent(index = 0) {
  return makeCharacter(Math.max(0, Math.floor(index)) % 12);
}
export function createProctor() {
  return makeCharacter(4, true);
}

function updateLegs(rig, time, walking, quiet = false) {
  const s = rig.stand;
  const stride = walking ? Math.sin(time * (quiet ? 5 : 7.2)) * (quiet ? 0.15 : 0.26) * s : 0;
  for (const leg of rig.legs) {
    const x = leg.side * 0.112;
    const step = stride * leg.side;
    const lift = Math.max(0, step) * 0.19;
    const hip = v(x, 0.52 + 0.36 * s, 0);
    const knee = v(x, 0.345 + 0.13 * s + lift, 0.295 * (1 - s) + step * 0.53);
    const ankle = v(x, 0.105 + lift, 0.315 * (1 - s) + step);
    segment(leg.thigh, hip, knee, 0.089, 0.086);
    segment(leg.shin, knee, ankle, 0.079, 0.077);
    leg.shoe.position.set(x, 0.077 + lift, ankle.z + 0.059);
    leg.sole.position.set(x, 0.027 + lift, ankle.z + 0.059);
    leg.shoe.rotation.x = -step * 0.55;
    leg.sole.rotation.x = -step * 0.55;
  }
}

// Arms are posed inside the breathing, forward-leaning torso. The paper stays still in world space.
function aboveDesk(upper, z, clearance) {
  const tilt = upper.rotation.x;
  return (STUDENT_DESK_TOP + clearance - upper.position.y + z * Math.sin(tilt)) / Math.cos(tilt);
}

export function updateStudent(group, { time = 0, pose = 'write', walking = false } = {}) {
  const r = group.userData.clay;
  if (!r) return;
  const dt = r.lastTime === null ? 1 : Math.min(0.1, Math.max(0, time - r.lastTime));
  r.lastTime = time;
  const a = 1 - Math.exp(-dt * 12);
  const stand = pose === 'stand' || pose === 'exit' || walking;
  r.stand += ((stand ? 1 : 0) - r.stand) * a;
  const f = time * 1.8 + r.phase;
  const breath = Math.sin(f) * 0.003;
  r.upper.position.y = 0.52 + 0.36 * r.stand + breath;
  r.upper.rotation.x = 0.035 * (1 - r.stand);
  r.head.rotation.x = THREE.MathUtils.lerp(
    r.head.rotation.x,
    stand ? 0 : pose === 'hand' || pose === 'rest' ? -0.035 : 0.16,
    a,
  );
  r.head.rotation.y = Math.sin(f * 0.3) * 0.018;
  const le = v(-0.285, 0.17, 0.28),
    lw = v(-0.16, 0.295, 0.52);
  const re = v(0.285, 0.18, 0.27),
    rw = v(0.13 + Math.sin(f * 6) * 0.009, 0.298, 0.56 + Math.cos(f * 4) * 0.012);
  for (const prop of r.props.group.children) prop.visible = false;
  r.props.earCase.visible = pose === 'proof-ear' && !stand;
  r.pencil.visible = !stand && (pose === 'write' || pose === 'rest' || pose === 'read');
  r.head.userData.glasses.visible = r.normalGlasses || pose === 'glasses';
  if (pose === 'glasses') {
    re.set(0.33, 0.39, 0.18);
    rw.set(0.173, 0.69, 0.214);
  } else if (pose === 'proof-glasses' || pose === 'clear-glasses') {
    re.set(0.32, 0.3, 0.29);
    rw.set(0.24, 0.48, 0.43);
    r.head.userData.glasses.visible = false;
    r.props.glasses.visible = pose === 'proof-glasses';
    r.props.clearGlasses.visible = pose === 'clear-glasses';
  } else if (pose === 'ear' || pose === 'proof-ear' || pose === 'clear-ear') {
    re.set(0.34, 0.34, 0.1);
    rw.set(0.25, 0.61, 0.075);
    if (pose === 'proof-ear') {
      rw.set(0.25, 0.43, 0.47);
      r.props.ear.position.set(0, -0.13, 0.29);
    }
    r.props.ear.visible = pose === 'proof-ear';
  } else if (pose === 'camera' || pose === 'proof-camera' || pose === 'clear-camera') {
    re.set(0.29, 0.15, 0.3);
    rw.set(0.19, 0.31, 0.54);
    r.props.camera.visible = pose === 'proof-camera' || pose === 'camera';
    r.props.eraser.visible = pose === 'clear-camera';
  } else if (pose === 'note' || pose === 'proof-note' || pose === 'clear-note') {
    re.set(0.29, 0.13, 0.23);
    rw.set(0.15, 0.31, 0.51);
    le.set(-0.27, 0.15, 0.24);
    lw.set(-0.055, 0.3, 0.5);
    r.props.note.visible = pose === 'proof-note';
    r.props.id.visible = pose === 'note' || pose === 'clear-note';
    r.props.id.rotation.y = pose === 'note' ? Math.PI - 0.12 : -0.12;
  } else if (pose === 'hand') {
    re.set(0.32, 0.63, 0.02);
    rw.set(0.3, 1.02, 0.04);
  } else if (pose === 'rest' || pose === 'read') {
    rw.set(0.2, 0.3, 0.41);
    lw.set(-0.2, 0.3, 0.43);
    r.pencil.position.set(0.06, aboveDesk(r.upper, 0.65, 0.019), 0.65);
    r.pencil.rotation.set(0, 0, Math.PI / 2);
  }
  if (stand) {
    const swing = walking ? Math.sin(time * 7.2) * 0.1 : 0;
    le.set(-0.25, 0.2, -swing);
    lw.set(-0.25, -0.045, -swing * 1.6);
    re.set(0.25, 0.2, swing);
    rw.set(0.25, -0.045, swing * 1.6);
  }
  const leftOnDesk = !stand && !pose.endsWith('note');
  const rightOnDesk = !stand && (pose === 'write' || pose === 'rest' || pose === 'read');
  if (!stand) {
    if (le.z > 0.13) le.y = Math.max(le.y, aboveDesk(r.upper, le.z, 0.092));
    if (re.z > 0.13) re.y = Math.max(re.y, aboveDesk(r.upper, re.z, 0.092));
    if (leftOnDesk) lw.y = aboveDesk(r.upper, lw.z, 0.081);
    if (rightOnDesk) rw.y = aboveDesk(r.upper, rw.z, 0.081);
  }
  setArm(r.left, le, lw, a, false, leftOnDesk);
  setArm(r.right, re, rw, a, pose === 'hand', rightOnDesk);
  if (pose === 'write') {
    r.pencil.position.copy(r.right.hand.position);
    r.pencil.position.x -= 0.027;
    r.pencil.position.z += 0.032;
    r.pencil.rotation.set(-0.9, 0, -0.24);
    const tip = temp.set(0, -0.117, 0).applyQuaternion(r.pencil.quaternion);
    r.pencil.position.y = aboveDesk(r.upper, r.pencil.position.z + tip.z, 0.012) - tip.y;
  }
  updateLegs(r, time, walking);
  syncInstances(r);
}

export function updateProctor(group, { time = 0, walking = false, quiet = false } = {}) {
  const r = group.userData.clay;
  if (!r) return;
  r.stand = 1;
  const speed = quiet ? 5 : 7.2;
  const swing = walking ? Math.sin(time * speed) * (quiet ? 0.055 : 0.12) : 0;
  r.upper.position.y =
    0.865 +
    (walking ? Math.abs(Math.sin(time * speed)) * (quiet ? 0.004 : 0.011) : Math.sin(time * 1.5) * 0.003);
  r.upper.rotation.x = quiet && walking ? 0.07 : 0;
  r.head.rotation.x = -0.025;
  r.head.rotation.y = Math.sin(time * 0.4) * 0.025;
  setArm(r.left, v(-0.255, 0.2, -0.035), v(-0.26, -0.045, 0.065), 1);
  setArm(r.right, v(0.26, 0.2, swing), v(0.25, -0.05, swing * 1.7), 1);
  r.clipboard.position.set(-0.283, 0.015, 0.088);
  r.clipboard.rotation.set(-0.08, -0.15, -0.08);
  r.pencil.visible = false;
  updateLegs(r, time, walking, quiet);
  syncInstances(r);
}

export function updateEnding(group, mood, time) {
  const rig = group.userData.clay;
  if (rig.proctor) updateProctor(group, { time });
  else updateStudent(group, { time, pose: 'rest' });
  const { eyes, brows, mouth, grin } = rig.head.userData.face;
  const happy = mood === 'win';
  const laughing = mood === 'villain';
  mouth.visible = !(happy || laughing);
  grin.visible = happy || laughing;
  grin.rotation.z = laughing ? -0.18 : 0;
  for (let i = 0; i < eyes.length; i++) {
    eyes[i].scale.y = happy ? 0.006 : laughing ? 0.009 : 0.016;
    brows[i].rotation.z = (i === 0 ? 1 : -1) * (laughing ? -0.42 : happy ? 0.18 : 0.36);
  }
  rig.head.rotation.x = happy ? -0.08 : laughing ? -0.05 + Math.sin(time * 9) * 0.06 : 0.32;
  rig.head.rotation.z = laughing ? -0.07 : 0;
  rig.upper.position.y += happy ? Math.max(0, Math.sin(time * 5)) * 0.07 : Math.sin(time * 9) * 0.012;
  if (happy) {
    rig.clipboard.visible = false;
    setArm(rig.left, v(-0.32, 0.5, 0.03), v(-0.37, 0.8, 0.13), 1, true);
    setArm(rig.right, v(0.32, 0.5, 0.03), v(0.37, 0.8, 0.13), 1, true);
    syncInstances(rig);
  }
}
