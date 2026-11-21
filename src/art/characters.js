import * as THREE from 'three';
import { STUDENT_DESK_TOP } from './dimensions.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Metres. Every character looks along +Z. Furniture belongs to the classroom.
const ball = new THREE.SphereGeometry(1, 14, 10);
const softBox = new RoundedBoxGeometry(1, 1, 1, 2, 0.15);
const ring = new THREE.TorusGeometry(1, 0.085, 5, 18);
const wristBand = new THREE.CylinderGeometry(1, 1, 1, 24);
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
  for (const side of [-1, 1]) {
    const temple = new THREE.CatmullRomCurve3([
      v(side * 0.166, 0.013, 0.01), v(side * 0.184, 0.014, 0.005),
      v(side * 0.205, 0.02, -0.125), v(side * 0.209, -0.004, -0.18),
    ]);
    mesh(g, new THREE.TubeGeometry(temple, 9, 0.0055, 5, false), M.ink);
  }
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
    lump(shape, M.blush, [x * 1.58, -0.069, 0.152], [0.027, 0.011, 0.007], [0.24, Math.sign(x) * 0.53, 0]);
  }
  const brows = [
    box(face, M.hair, [-0.072, 0.032, 0.18], [0.039, 0.009, 0.006], [0, 0, 0.06]),
    box(face, M.hair, [0.072, 0.032, 0.18], [0.039, 0.009, 0.006], [0, 0, -0.06]),
  ];
  const mouth = lump(face, M.blush, [0, -0.111, 0.169], [0.026, 0.005, 0.004]);
  const grin = new THREE.Group();
  const smileCurve = new THREE.QuadraticBezierCurve3(
    v(-0.064, -0.09, 0.174),
    v(0, -0.16, 0.195),
    v(0.064, -0.09, 0.174),
  );
  mesh(grin, new THREE.TubeGeometry(smileCurve, 14, 0.012, 6, false), M.white);
  grin.visible = false;
  const tears = new THREE.Group();
  for (const x of [-0.085, 0.085]) lump(tears, M.white, [x, -0.075, 0.182], [0.012, 0.035, 0.009]);
  tears.visible = false;
  const frown = new THREE.Group();
  const curve = new THREE.QuadraticBezierCurve3(
    v(-0.037, -0.125, 0.176),
    v(0, -0.085, 0.19),
    v(0.037, -0.125, 0.176),
  );
  mesh(frown, new THREE.TubeGeometry(curve, 12, 0.006, 5, false), M.blush);
  frown.visible = false;
  head.add(face, grin, tears, frown);
  head.userData.face = { eyes, brows, mouth, grin, tears, frown };
  // Broad, swept locks meet the crown. Keep the hairline above the eyes and
  // tuck the bob behind the temples so the glasses and ear gesture have room.
  const style = index % 4;
  const part = style % 2 === 0 ? 1 : -1;
  lump(shape, hair, [0, 0.105, -0.025], [0.221, 0.174, 0.19]);
  lump(shape, hair, [0, 0.048, -0.088], [0.205, 0.167, 0.12]);
  for (const [x, y, z, width, height, tilt] of [
    [-0.136, 0.118, 0.093, 0.06, 0.108, -0.47],
    [-0.084, 0.151, 0.133, 0.055, 0.108, -0.73],
    [-0.013, 0.163, 0.147, 0.053, 0.091, -0.92],
    [0.079, 0.147, 0.13, 0.05, 0.087, 0.69],
    [0.151, 0.112, 0.091, 0.047, 0.098, 0.44],
  ]) {
    lump(shape, hair, [part * x, y, z], [width, height, 0.052], [0.18, part * x * 2, part * tilt]);
  }
  if (style === 0 || style === 3) {
    lump(shape, hair, [-part * 0.076, 0.205, 0.028], [0.131, 0.057, 0.117], [0.12, part * 0.21, part * 0.35]);
  }
  if (style === 1) {
    for (const side of [-1, 1])
      lump(shape, hair, [side * 0.17, -0.065, -0.07], [0.06, 0.173, 0.099], [-0.16, 0, side * 0.13]);
    lump(shape, hair, [0, -0.09, -0.132], [0.188, 0.157, 0.086]);
  } else if (style === 2) {
    lump(shape, hair, [0, 0.242, -0.108], [0.106, 0.083, 0.095]);
  } else if (style === 3) {
    lump(shape, hair, [-0.059, 0.117, 0.154], [0.088, 0.045, 0.045], [0.14, -0.28, -0.43]);
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
  const open = new THREE.Group();
  lump(open, skin, [0, 0.008, 0], [0.044, 0.062, 0.032]);
  lump(open, skin, [side * -0.034, 0.007, 0.009], [0.018, 0.034, 0.019], [0, 0, side * -0.39]);
  for (const [i, length] of [0.026, 0.03, 0.027, 0.021].entries())
    lump(open, skin, [side * (-0.026 + i * 0.017), 0.035 + length, 0.002], [0.011, length, 0.014]);
  // Curled fingers support the back. Only the thumb pad comes over the rim.
  const grip = new THREE.Group();
  lump(grip, skin, [0.004 * side, 0.004, 0], [0.037, 0.04, 0.033]);
  for (let i = 0; i < 3; i++) {
    lump(grip, skin, [-side * (0.023 - i * 0.004), 0.022 - i * 0.017, 0.005],
      [0.03 - i * 0.003, 0.012, 0.014], [0, side * 0.2, side * -0.16]);
  }
  lump(grip, skin, [-side * 0.025, 0.017, 0.032], [0.027, 0.014, 0.014], [0, side * 0.36, side * -0.32]);
  hand.add(bake(open), bake(grip));
  const indexFinger = lump(hand, skin, [-side * 0.02, 0.047, 0.005], [0.012, 0.043, 0.013]);
  parent.add(hand);
  return {
    upper,
    lower,
    cuff,
    hand,
    open,
    grip,
    indexFinger,
    pinch: v(-side * 0.043, 0.022, 0.024),
    elbow: v(side * 0.29, 0.19, 0.25),
    wrist: v(side * 0.15, 0.3, 0.53),
    shoulder: v(side * 0.20, 0.417, 0),
  };
}
function setArm(arm, elbow, wrist, alpha, posture = 'relaxed') {
  arm.elbow.lerp(elbow, alpha);
  arm.wrist.lerp(wrist, alpha);
  segment(arm.upper, arm.shoulder, arm.elbow, 0.08, 0.077);
  temp.subVectors(arm.wrist, arm.elbow).normalize();
  arm.cuff.position.copy(arm.wrist).addScaledVector(temp, -0.045);
  arm.cuff.scale.set(0.059, 0.055, 0.057);
  arm.cuff.quaternion.setFromUnitVectors(axisY, temp);
  arm.hand.position.copy(arm.wrist);
  arm.indexFinger.visible = posture === 'point';
  arm.grip.visible = posture === 'pinch' || arm.indexFinger.visible;
  arm.open.visible = !arm.grip.visible;
  if (arm.grip.visible) {
    arm.hand.rotation.set(arm.indexFinger.visible ? 2.32 : 0, 0, 0);
  } else {
    arm.hand.position.addScaledVector(temp, 0.025);
    const onDesk = posture === 'desk';
    if (onDesk) arm.hand.position.y -= 0.018;
    arm.hand.rotation.set(posture === 'raised' ? 0 : onDesk ? 1.94 : 0.9, 0, posture === 'raised' ? 0 : -0.2);
  }
  segment(arm.lower, arm.elbow, arm.cuff.position, 0.067, 0.064);
}

// The prop's local contact point follows the animated thumb and index finger,
// including while the wrist is still travelling from the previous gesture.
function holdAt(prop, arm, x, y, z) {
  temp.set(x, y, z).applyQuaternion(prop.quaternion);
  prop.position.copy(arm.hand.position).add(arm.pinch).sub(temp);
}
function makePencil() {
  const p = new THREE.Group();
  box(p, M.pencil, [0, 0, 0], [0.013, 0.19, 0.013]);
  lump(p, M.graphite, [0, -0.101, 0], [0.006, 0.016, 0.006]);
  box(p, M.sole, [0, 0.09, 0], [0.015, 0.025, 0.015]);
  return bake(p);
}
// The same muted housing is used for harmless and illicit displays. Only a
// close look at what is on the screen, and how it is used, distinguishes them.
function makeWatch(display = 'sleep') {
  const watch = new THREE.Group();
  // Local X runs along the forearm. The face sits on the outside of the band.
  mesh(watch, wristBand, M.device, [0, 0, -0.022], [0.065, 0.049, 0.065], [0, 0, Math.PI / 2]);
  box(watch, M.trim, [0, 0.004, 0.036], [0.097, 0.115, 0.021]);
  box(watch, M.paper, [0, 0.004, 0.049], [0.078, 0.093, 0.005]);
  lump(watch, M.device, [0.051, 0.012, 0.034], [0.006, 0.013, 0.007]);
  if (display === 'answers') {
    for (let row = 0; row < 2; row++) {
      const y = 0.025 - row * 0.039;
      tinyDigit(watch, row + 1, -0.021, y, 0.054, 0.009, M.graphite);
      box(watch, M.graphite, [-0.003, y, 0.055], [0.009, 0.003, 0.003]);
      tinyDigit(watch, row ? 4 : 3, 0.021, y, 0.054, 0.009, M.graphite);
    }
  } else if (display === 'time') {
    mesh(watch, ring, M.graphite, [0, 0.004, 0.055], [0.03, 0.03, 0.02]);
    box(watch, M.graphite, [0, 0.015, 0.057], [0.003, 0.026, 0.003]);
    box(watch, M.graphite, [0.009, -0.002, 0.058], [0.024, 0.003, 0.003], [0, 0, -0.45]);
    for (const [x, y] of [
      [0, 0.035],
      [0, -0.027],
      [-0.031, 0.004],
      [0.031, 0.004],
    ])
      box(watch, M.graphite, [x, y, 0.056], [0.005, 0.005, 0.003]);
  } else {
    // Both students initially tilt the same uninformative face away from view.
    box(watch, M.trim, [0, 0.004, 0.054], [0.062, 0.074, 0.004]);
  }
  return bake(watch);
}
function makeExamPen(recording = false, capped = false) {
  const pen = new THREE.Group();
  box(pen, M.device, [0, 0, 0], [0.03, 0.18, 0.028]);
  box(pen, M.trim, [0, 0.068, 0.014], [0.007, 0.047, 0.006]);
  lump(pen, M.brass, [0, -0.094, 0], [0.009, 0.017, 0.009]);
  if (capped) box(pen, M.device, [0, -0.075, 0], [0.033, 0.068, 0.033]);
  if (recording) {
    // An imagined exam-game prop: a pen-sized camera with a preview strip.
    // It shares the normal pen's body, finish and clip, without a glowing cue.
    lump(pen, M.ink, [0, -0.107, 0.001], [0.006, 0.006, 0.006]);
    box(pen, M.paper, [0, -0.051, 0.017], [0.024, 0.06, 0.004]);
    for (let row = 0; row < 3; row++)
      box(pen, M.graphite, [0, -0.031 - row * 0.017, 0.02], [0.016, 0.003, 0.002]);
    box(pen, M.graphite, [-0.008, -0.072, 0.02], [0.003, 0.006, 0.002]);
  } else {
    lump(pen, M.graphite, [0, -0.108, 0], [0.003, 0.007, 0.003]);
  }
  return bake(pen);
}
// Both paper faces share the same lower-corner grip and silhouette.
const paperRotation = new THREE.Euler(-0.57, 0.17, -0.045);
const paperAcross = v(1, 0, 0).applyEuler(paperRotation);
const paperGripX = 0.109;
const watchAxis = new THREE.Vector3();
const dialUp = new THREE.Vector3();
const dialNormal = new THREE.Vector3();
const watchBasis = new THREE.Matrix4();
function makeProps() {
  const props = new THREE.Group();
  const glasses = makeGlasses(true);
  glasses.rotation.set(-0.31, 0.14, 0.055);
  props.add(glasses);
  const clearGlasses = makeGlasses();
  const reflections = new THREE.Group();
  for (const x of [-0.092, 0.092]) {
    // A plain window-shaped glint rather than answer glyphs.
    box(reflections, M.white, [x - 0.018, 0.01, 0.016], [0.035, 0.056, 0.004], [0, 0, -0.3]);
    box(reflections, M.white, [x + 0.016, 0.01, 0.016], [0.01, 0.056, 0.004], [0, 0, -0.3]);
  }
  clearGlasses.add(bake(reflections));
  clearGlasses.rotation.copy(glasses.rotation);
  props.add(clearGlasses);
  const ear = new THREE.Group();
  const earCase = new THREE.Group();
  box(earCase, M.case, [0, 0.024, 0], [0.14, 0.048, 0.09]);
  box(earCase, M.case, [0, 0.073, -0.027], [0.14, 0.063, 0.018], [-0.3, 0, 0]);
  lump(earCase, M.device, [-0.028, 0.05, 0.005], [0.023, 0.009, 0.023]);
  earCase.position.set(0.27, STUDENT_DESK_TOP + 0.012, 0.64);
  earCase.rotation.y = 0.23;
  lump(ear, M.case, [-0.009, 0.024, 0], [0.021, 0.022, 0.016]);
  lump(ear, M.device, [-0.017, 0.027, 0.012], [0.009, 0.009, 0.005]);
  box(ear, M.case, [0, -0.001, 0], [0.015, 0.045, 0.016]);
  ear.rotation.z = -0.36;
  props.add(bake(ear));
  const camera = new THREE.Group();
  box(camera, M.device, [0, 0, 0], [0.157, 0.107, 0.046]);
  box(camera, M.blue, [-0.01, 0, 0.024], [0.116, 0.08, 0.007]);
  box(camera, M.paper, [-0.011, 0.001, 0.029], [0.074, 0.061, 0.003], [0, 0, -0.08]);
  for (let j = 0; j < 3; j++)
    box(camera, M.screenInk, [-0.012, 0.017 - j * 0.015, 0.032], [j === 2 ? 0.03 : 0.047, 0.005, 0.002], [0, 0, -0.08]);
  lump(camera, M.trim, [0.047, 0.055, -0.003], [0.016, 0.006, 0.009]);
  camera.rotation.set(-0.51, 0.17, -0.07);
  props.add(bake(camera));

  const note = new THREE.Group();
  box(note, M.paper, [0, 0, 0], [0.235, 0.155, 0.009]);
  for (let j = 0; j < 4; j++) {
    const y = 0.051 - j * 0.034;
    tinyDigit(note, j + 1, -0.063, y, 0.007, 0.012, M.graphite);
    box(note, M.trim, [-0.007, y, 0.007], [0.042, 0.004, 0.003]);
    tinyDigit(note, [3, 1, 2, 4][j], 0.05, y, 0.007, 0.012);
  }
  note.rotation.copy(paperRotation);
  props.add(bake(note));
  const id = new THREE.Group();
  box(id, M.paper, [0, 0, 0], [0.235, 0.155, 0.009]);
  box(id, M.trim, [-0.052, 0.003, 0.007], [0.069, 0.087, 0.004]);
  lump(id, M.screenInk, [-0.052, -0.021, 0.011], [0.025, 0.016, 0.003]);
  lump(id, M.skin, [-0.052, 0.011, 0.012], [0.016, 0.019, 0.003]);
  lump(id, M.hair2, [-0.053, 0.023, 0.015], [0.016, 0.009, 0.002]);
  for (const [i, digit] of [2, 0, 6].entries())
    tinyDigit(id, digit, 0.01 + i * 0.024, 0.018, 0.007, 0.01, M.graphite);
  for (let j = 0; j < 2; j++)
    box(id, M.trim, [0.036, -0.013 - j * 0.014, 0.007], [0.068, 0.005, 0.003]);
  props.add(bake(id));
  const eraser = new THREE.Group();
  box(eraser, M.white, [0, 0, 0], [0.093, 0.039, 0.048]);
  box(eraser, M.trim, [0.011, 0, 0], [0.048, 0.041, 0.05]);
  eraser.rotation.set(-0.19, 0.17, 0.53);
  props.add(bake(eraser));
  const watch = makeWatch();
  const watchAnswers = makeWatch('answers');
  const watchTime = makeWatch('time');
  const pen = makeExamPen(false, true);
  const penCamera = makeExamPen(true);
  const clearPen = makeExamPen();
  const penCap = new THREE.Group();
  box(penCap, M.device, [0, 0, 0], [0.033, 0.068, 0.033]);
  box(penCap, M.trim, [0, 0.012, 0.017], [0.006, 0.03, 0.005]);
  props.add(watch, watchAnswers, watchTime, pen, penCamera, clearPen, bake(penCap));
  for (const p of props.children) p.visible = false;
  return {
    group: props,
    glasses,
    clearGlasses,
    ear,
    earCase: bake(earCase),
    camera,
    note,
    id,
    eraser,
    watch,
    watchAnswers,
    watchTime,
    pen,
    penCamera,
    clearPen,
    penCap,
  };
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
  r.head.rotation.z = THREE.MathUtils.lerp(r.head.rotation.z, 0, a);
  const le = v(-0.285, 0.17, 0.28),
    lw = v(-0.16, 0.295, 0.52);
  const re = v(0.285, 0.18, 0.27),
    rw = v(0.13 + Math.sin(f * 6) * 0.009, 0.298, 0.56 + Math.cos(f * 4) * 0.012);
  for (const prop of r.props.group.children) prop.visible = false;
  r.props.earCase.visible = pose === 'proof-ear' && !stand;
  const paper = pose === 'note' || pose.endsWith('-note');
  const penPose = pose === 'pen' || pose.endsWith('-pen');
  const watchPose = pose === 'watch' || pose.endsWith('-watch');
  const resting = ['rest', 'read', 'reread', 'sleeve-adjust', 'wrist-rest', 'neck-stretch'].includes(pose);
  const writing = pose === 'write' || pose === 'proof-watch' || pose === 'clear-watch';
  r.pencil.visible = !stand && (writing || resting);
  r.head.userData.glasses.visible = r.normalGlasses || pose === 'glasses';
  let leftPosture = 'desk';
  let rightPosture = 'desk';
  let held = null;
  let contact = null;
  if (pose === 'glasses') {
    rightPosture = 'pinch';
    re.set(0.33, 0.39, 0.18);
    rw.set(0.206, 0.68, 0.191);
  } else if (pose === 'proof-glasses' || pose === 'clear-glasses') {
    re.set(0.31, 0.30, 0.23);
    rw.set(0.24, 0.47, 0.405);
    r.head.userData.glasses.visible = false;
    held = pose === 'proof-glasses' ? r.props.glasses : r.props.clearGlasses;
    contact = [0.17, 0.01, -0.024];
  } else if (pose === 'ear' || pose === 'proof-ear' || pose === 'clear-ear') {
    rightPosture = pose === 'clear-ear' ? 'relaxed' : 'pinch';
    re.set(0.32, 0.34, 0.095);
    rw.set(0.26, 0.63, 0.04);
    if (pose !== 'ear') {
      re.set(0.31, 0.32, 0.16);
      const sweep = Math.sin(f) * 0.024;
      rw.set(0.235, 0.52 + sweep, 0.32 - sweep);
    }
    if (pose === 'proof-ear') {
      held = r.props.ear;
      contact = [0, -0.014, 0];
    }
  } else if (pose === 'camera' || pose === 'proof-camera' || pose === 'clear-camera') {
    re.set(0.265, 0.19, 0.26);
    rightPosture = 'pinch';
    // Both objects pass close to the sheet. The bare end of the eraser touches it.
    rw.set(0.218 + Math.sin(time * 5) * 0.022, aboveDesk(r.upper, 0.51, 0.058), 0.51);
    if (pose === 'proof-camera') {
      held = r.props.camera;
      contact = [0.072, -0.013, 0.014];
    } else if (pose === 'clear-camera') {
      held = r.props.eraser;
      contact = [0.034, 0.012, 0.011];
    }
  } else if (paper) {
    leftPosture = 'pinch';
    re.set(0.272, 0.20, 0.246);
    rw.set(0.18, 0.342 + Math.sin(f) * 0.003, 0.50);
    le.set(-0.262, 0.20, 0.24);
    lw.copy(rw).add(r.right.pinch).sub(r.left.pinch).addScaledVector(paperAcross, -2 * paperGripX);
    held = pose === 'proof-note' ? r.props.note : r.props.id;
    held.rotation.copy(paperRotation);
    const turn = pose === 'note' ? 1.92 : 0;
    r.paperTurn = THREE.MathUtils.lerp(r.paperTurn ?? turn, turn, a);
    held.rotateX(r.paperTurn);
    contact = [paperGripX, -0.043, 0];
  } else if (watchPose) {
    leftPosture = 'relaxed';
    rightPosture = 'pinch';
    le.set(-0.285, 0.342, 0.37);
    lw.set(-0.035, 0.425, 0.453);
    if (pose === 'watch') {
      re.set(0.24, 0.26, 0.27);
      rw.set(-0.08, 0.442, 0.433);
    }
    r.head.rotation.x = THREE.MathUtils.lerp(r.head.rotation.x, 0.22, a);
    r.head.rotation.y = -0.06 + Math.sin(time * 1.1) * 0.025;
  } else if (penPose) {
    leftPosture = 'pinch';
    re.set(0.27, 0.22, 0.25);
    rw.set(0.127, 0.376, 0.50);
    le.set(-0.25, 0.22, 0.26);
    lw.set(-0.079, 0.36, 0.48);
    held = pose === 'proof-pen' ? r.props.penCamera : pose === 'clear-pen' ? r.props.clearPen : r.props.pen;
    held.rotation.set(-0.58, 0.16 + Math.sin(time * 1.6) * 0.09, -0.30);
    contact = [0.012, 0.023, 0.002];
    r.head.rotation.x = THREE.MathUtils.lerp(r.head.rotation.x, 0.2, a);
  } else if (pose === 'sleeve-adjust') {
    leftPosture = 'relaxed';
    rightPosture = 'pinch';
    le.set(-0.29, 0.26, 0.27);
    lw.set(-0.09, 0.38, 0.47);
    re.set(0.24, 0.30, 0.31);
    // The thumb tugs the cuff, leaving the other hand free beyond the sleeve.
    rw.copy(lw).addScaledVector(temp.subVectors(lw, le).normalize(), -0.075)
      .add(v(0.035, 0.041 + Math.sin(time * 2.4) * 0.009, 0.019)).sub(r.right.pinch);
    r.head.rotation.y = -0.06;
  } else if (pose === 'wrist-rest') {
    leftPosture = rightPosture = 'relaxed';
    le.set(-0.265, 0.22, 0.29);
    lw.set(-0.069, 0.378, 0.46);
    re.set(0.255, 0.245, 0.345);
    rw.set(0.011, 0.454, 0.50);
  } else if (pose === 'neck-stretch') {
    rightPosture = 'relaxed';
    re.set(0.335, 0.344, 0.096);
    rw.set(0.216, 0.508, 0.036);
    r.head.rotation.z = 0.09 + Math.sin(time * 0.9) * 0.055;
    r.head.rotation.y = -0.09;
    r.head.rotation.x = 0.06;
  } else if (pose === 'reread') {
    leftPosture = 'point';
    lw.set(-0.076 + Math.sin(time * 1.5) * 0.058, 0.3, 0.53);
    rw.set(0.20, 0.3, 0.43);
    r.head.rotation.y = Math.sin(time * 1.5) * 0.055;
    r.head.rotation.x = THREE.MathUtils.lerp(r.head.rotation.x, 0.24, a);
  } else if (pose === 'hand') {
    rightPosture = 'raised';
    re.set(0.32, 0.63, 0.02);
    rw.set(0.3, 1.02, 0.04);
  } else if (pose === 'rest' || pose === 'read') {
    rw.set(0.2, 0.3, 0.41);
    lw.set(-0.2, 0.3, 0.43);
  }
  if (held || writing) rightPosture = 'pinch';
  if (stand) {
    leftPosture = rightPosture = 'relaxed';
    const swing = walking ? Math.sin(time * 7.2) * 0.1 : 0;
    le.set(-0.25, 0.2, -swing);
    lw.set(-0.25, -0.045, -swing * 1.6);
    re.set(0.25, 0.2, swing);
    rw.set(0.25, -0.045, swing * 1.6);
  }
  if (!paper) r.paperTurn = null;
  if (!stand) {
    if (le.z > 0.13) le.y = Math.max(le.y, aboveDesk(r.upper, le.z, 0.092));
    if (re.z > 0.13) re.y = Math.max(re.y, aboveDesk(r.upper, re.z, 0.092));
    if (leftPosture === 'desk' || leftPosture === 'point') lw.y = aboveDesk(r.upper, lw.z, 0.081);
    if (rightPosture === 'desk') rw.y = aboveDesk(r.upper, rw.z, 0.081);
    if (writing) {
      r.pencil.rotation.set(-0.9, 0, -0.24);
      const tip = temp.set(0, -0.104, 0).applyQuaternion(r.pencil.quaternion).add(r.right.pinch);
      rw.y = aboveDesk(r.upper, rw.z + tip.z, 0.012) - tip.y;
    }
  }
  setArm(r.left, le, lw, a, leftPosture);
  setArm(r.right, re, rw, a, rightPosture);
  if (held && !stand) {
    held.visible = true;
    holdAt(held, r.right, ...contact);
  }
  if (writing) holdAt(r.pencil, r.right, 0, -0.013, 0);
  if (resting) {
    r.pencil.position.set(0.06, aboveDesk(r.upper, 0.65, 0.019), 0.65);
    r.pencil.rotation.set(0, 0, Math.PI / 2);
  }
  if (watchPose) {
    const watch =
      pose === 'proof-watch'
        ? r.props.watchAnswers
        : pose === 'clear-watch'
          ? r.props.watchTime
          : r.props.watch;
    watch.visible = !stand;
    watchAxis.subVectors(r.left.wrist, r.left.elbow).normalize();
    dialUp.crossVectors(dialNormal.set(0.16, 0.83, 0.64), watchAxis).normalize();
    dialNormal.crossVectors(watchAxis, dialUp);
    watchBasis.makeBasis(watchAxis, dialUp, dialNormal);
    watch.quaternion.setFromRotationMatrix(watchBasis);
    if (pose === 'watch') watch.rotateX(-0.48);
    watch.position.copy(r.left.wrist).addScaledVector(watchAxis, -0.077);
    watch.translateZ(0.022);
  }
  if (penPose && pose !== 'pen' && !stand) {
    r.props.penCap.visible = true;
    r.props.penCap.rotation.set(-0.46, 0.14, 0.24);
    holdAt(r.props.penCap, r.left, -0.012, -0.015, 0);
  }
  if (pose === 'wrist-rest') {
    r.left.hand.rotation.set(0.78, 0.2, -0.96);
    r.right.hand.rotation.set(0.56, Math.sin(time * 1.4) * 0.45, 0.1 + Math.sin(time * 1.4) * 0.21);
  } else if (pose === 'neck-stretch') {
    r.right.hand.rotation.set(0.24, -0.15, 0.42);
  }
  updateLegs(r, time, walking);
  syncInstances(r);
}

export function updateProctor(group, { time = 0, walking = false, quiet = false, reaching = false } = {}) {
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
  if (reaching) setArm(r.right, v(0.29, 0.5, 0.12), v(0.25, 0.8, 0.4 + Math.sin(time * 3) * 0.08), 1, 'raised');
  for (const eye of r.head.userData.face.eyes) eye.scale.y = 0.016;
  r.clipboard.position.set(-0.283, 0.015, 0.088);
  r.clipboard.rotation.set(-0.08, -0.15, -0.08);
  r.pencil.visible = false;
  updateLegs(r, time, walking, quiet);
  syncInstances(r);
}

export function updateUpset(group, time) {
  const r = group.userData.clay;
  const { eyes, brows, mouth, grin, tears, frown } = r.head.userData.face;
  mouth.visible = grin.visible = false;
  frown.visible = true;
  tears.visible = true;
  const sobbing = time < 4;
  for (let i = 0; i < eyes.length; i++) {
    eyes[i].scale.y = sobbing ? 0.005 : 0.009;
    brows[i].rotation.z = (i === 0 ? 1 : -1) * 0.45;
  }
  tears.position.y = sobbing ? -((time * 0.06) % 0.05) : -0.02;
  r.head.rotation.x = 0.26 + (sobbing ? Math.sin(time * 8) * 0.025 : 0);
  r.head.rotation.z = Math.sin(time * 8) * (sobbing ? 0.045 : 0.008);
  if (sobbing) r.upper.position.y += Math.sin(time * 15) * 0.009;
  syncInstances(r);
}

export function updateEnding(group, mood, time) {
  const rig = group.userData.clay;
  if (rig.proctor) updateProctor(group, { time });
  else updateStudent(group, { time, pose: 'rest' });
  const { eyes, brows, mouth, grin, tears, frown } = rig.head.userData.face;
  tears.visible = frown.visible = false;
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
    setArm(rig.left, v(-0.32, 0.5, 0.03), v(-0.37, 0.8, 0.13), 1, 'raised');
    setArm(rig.right, v(0.32, 0.5, 0.03), v(0.37, 0.8, 0.13), 1, 'raised');
    syncInstances(rig);
  }
}
