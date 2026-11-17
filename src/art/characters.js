import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Metres. Every character looks along +Z. Furniture belongs to the classroom.
// Seated hips are at .52; the writing surface is y=.78, z=.51.
const ball = new THREE.SphereGeometry(1, 14, 10);
const softBox = new RoundedBoxGeometry(1, 1, 1, 2, .15);
const ring = new THREE.TorusGeometry(1, .085, 5, 18);
const materialCache = new Map();
function clay(color, options = {}) {
  const key = color + JSON.stringify(options);
  if (!materialCache.has(key)) materialCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: .96, metalness: 0, ...options }));
  return materialCache.get(key);
}
const M = {
  skin: clay('#e8b998'), skin2: clay('#dca685'), blush: clay('#d9a18d'),
  ink: clay('#343332'), hair: clay('#39322f'), hair2: clay('#514039'), hair3: clay('#292c2b'),
  sole: clay('#c9c3b8'), shoe: clay('#e9e6dd'), trouser: clay('#696b69'),
  white: clay('#efede4'), paper: clay('#fff9e7'), pencil: clay('#b89962'), graphite: clay('#434744'),
  brass: clay('#b7a786'), case: clay('#e7ece4'), device: clay('#44534f'),
  blue: clay('#9ed4cf', { emissive: '#5eaaa5', emissiveIntensity: .2 }),
  screenInk: clay('#386b68'), rose: clay('#b77e7d'), trim: clay('#c5c4bb'),
};
const shirts = ['#e6dfcc', '#8d9b93', '#a57c72', '#75818d', '#b6b5ac', '#a69277', '#c4b5a3', '#9babad', '#b6a59b', '#748b80', '#d7c9b1', '#9a919f'];
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
function lump(parent, material, p, s, r) { return mesh(parent, ball, material, p, s, r); }
function box(parent, material, p, s, r) { return mesh(parent, softBox, material, p, s, r); }
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
    geometries.forEach(g => g.dispose());
  }
  return group;
}
function segment(o, a, b, width, depth = width) {
  temp.subVectors(b, a);
  o.position.copy(a).addScaledVector(temp, .5);
  o.scale.set(width, temp.length() * .5 + width * .55, depth);
  o.quaternion.setFromUnitVectors(axisY, temp.normalize());
}
function v(x, y, z) { return new THREE.Vector3(x, y, z); }
function tinyDigit(parent, digit, x, y, z, size, material = M.screenInk) {
  const patterns = ['abcdef', 'bc', 'abdeg', 'abcdg', 'bcfg', 'acdfg', 'acdefg', 'abc', 'abcdefg', 'abcdfg'];
  const bars = { a: [0, 1, 1, .18], b: [.5, .5, .18, 1], c: [.5, -.5, .18, 1], d: [0, -1, 1, .18], e: [-.5, -.5, .18, 1], f: [-.5, .5, .18, 1], g: [0, 0, 1, .18] };
  for (const key of patterns[digit]) {
    const [dx, dy, w, h] = bars[key];
    box(parent, material, [x + dx * size, y + dy * size, z], [w * size, h * size, .004]);
  }
}
function makeGlasses(proof = false) {
  const g = new THREE.Group();
  for (const x of [-.092, .092]) {
    mesh(g, ring, M.ink, [x, 0, .01], [.078, .057, .06]);
    if (proof) {
      box(g, M.blue, [x, 0, .009], [.13, .084, .008]);
      tinyDigit(g, x < 0 ? 0 : 2, x - .025, 0, .016, .021);
      tinyDigit(g, x < 0 ? 7 : 4, x + .025, 0, .016, .021);
    }
  }
  box(g, M.ink, [0, .005, .01], [.043, .012, .018]);
  box(g, M.ink, [-.174, .012, -.057], [.012, .012, .145], [0, -.16, 0]);
  box(g, M.ink, [.174, .012, -.057], [.012, .012, .145], [0, .16, 0]);
  return bake(g);
}
function makeHead(index, proctor = false) {
  const head = new THREE.Group();
  const skin = index % 4 === 2 ? M.skin2 : M.skin;
  const hair = [M.hair, M.hair2, M.hair3][index % 3];
  const shape = new THREE.Group();
  lump(shape, skin, [0, 0, 0], [.211, .235, .192]);
  lump(shape, skin, [-.205, -.01, 0], [.042, .065, .038]);
  lump(shape, skin, [.205, -.01, 0], [.042, .065, .038]);
  lump(shape, skin, [0, -.033, .186], [.021, .027, .022]);
  for (const x of [-.071, .071]) {
    lump(shape, M.ink, [x, -.018, .184], [.011, .016, .008]);
    lump(shape, M.blush, [x * 1.58, -.069, .166], [.027, .011, .004]);
  }
  box(shape, M.hair, [-.072, .032, .18], [.039, .009, .006], [0, 0, .06]);
  box(shape, M.hair, [.072, .032, .18], [.039, .009, .006], [0, 0, -.06]);
  lump(shape, M.blush, [0, -.111, .169], [.026, .005, .004]);
  // Flattened overlapping locks, with an asymmetric part, keep the silhouette
  // handmade without the round beads reading as animal ears.
  lump(shape, hair, [0, .105, -.035], [.222, .17, .187]);
  for (let i = 0; i < 9; i++) {
    const a = (i / 8) * Math.PI;
    const x = Math.cos(a) * .171;
    const y = .105 + Math.sin(a) * .095;
    lump(shape, hair, [x, y, .113], [.060, .105, .057], [0, 0, -.45 + i * .09]);
  }
  const style = index % 4;
  if (style === 0 || proctor) {
    for (let i = 0; i < 7; i++) lump(shape, hair, [-.155 + i * .049, .213 + Math.sin(i * 1.7) * .012, -.015], [.069, .055, .103], [.1, .15, -.2]);
  } else if (style === 1) {
    lump(shape, hair, [-.184, -.067, -.032], [.067, .185, .143], [0, 0, -.10]);
    lump(shape, hair, [.184, -.067, -.032], [.067, .185, .143], [0, 0, .10]);
    lump(shape, hair, [0, -.13, -.153], [.185, .16, .065]);
  } else if (style === 2) {
    lump(shape, hair, [0, .234, -.135], [.115, .093, .10]);
    lump(shape, hair, [-.194, -.045, -.04], [.041, .125, .11]);
    lump(shape, hair, [.194, -.045, -.04], [.041, .125, .11]);
  } else {
    for (let i = 0; i < 6; i++) lump(shape, hair, [-.15 + i * .059, .11 + Math.sin(i) * .023, .15], [.064, .095, .051], [0, 0, -.32]);
  }
  head.add(bake(shape));
  const glasses = makeGlasses();
  glasses.position.set(0, -.018, .188);
  glasses.visible = index % 5 === 0 || proctor;
  head.add(glasses);
  head.userData.glasses = glasses;
  return head;
}
function makeTorso(index, proctor) {
  const g = new THREE.Group();
  const knit = clay(proctor ? '#8f9d7b' : shirts[index % shirts.length]);
  const rib = clay(proctor ? '#798a68' : shirts[index % shirts.length]).clone();
  rib.color.multiplyScalar(.91);
  lump(g, knit, [0, .255, 0], [.237, .272, .147]);
  box(g, knit, [0, .067, .005], [.403, .115, .27]);
  lump(g, M.skin, [0, .51, 0], [.073, .084, .065]);
  // Ribbed neck, waistband and sleeves are modelled clay, with quieter detail
  // than the hair so a hand gesture remains the strongest moving silhouette.
  mesh(g, ring, rib, [0, .477, .015], [.088, .088, .09], [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 12; i++) lump(g, rib, [-.181 + i * .033, .057, .122], [.009, .045, .009]);
  if (proctor || index % 3 === 1) {
    box(g, rib, [0, .267, .143], [.024, .36, .018]);
    for (let i = 0; i < 4; i++) lump(g, M.brass, [.017, .14 + i * .074, .153], [.012, .012, .007]);
    box(g, rib, [-.127, .153, .13], [.109, .058, .018]);
    box(g, rib, [.127, .153, .13], [.109, .058, .018]);
  } else {
    for (const x of [-.11, .0, .11]) for (let j = 0; j < 4; j++) {
      lump(g, rib, [x + Math.sin(j * Math.PI) * .008, .16 + j * .065, .141], [.013, .040, .008], [0, 0, (j % 2 ? -.35 : .35)]);
    }
  }
  return { group: bake(g), knit, rib };
}
function makeArm(parent, knit, rib, skin, side) {
  const upper = lump(parent, knit);
  const lower = lump(parent, knit);
  const cuff = lump(parent, rib);
  const hand = new THREE.Group();
  lump(hand, skin, [0, .008, 0], [.048, .069, .034]);
  lump(hand, skin, [side * -.042, -.006, .012], [.022, .038, .025], [0, 0, side * -.36]);
  // Slightly separated fingertips are visible when requesting a sheet.
  for (let i = 0; i < 4; i++) lump(hand, skin, [-.03 + i * .019, .061 + (i === 1 ? .008 : 0), 0], [.011, .029, .018]);
  parent.add(bake(hand));
  return { upper, lower, cuff, hand, elbow: v(side * .29, .19, .25), wrist: v(side * .15, .30, .53), shoulder: v(side * .222, .428, 0) };
}
function setArm(arm, elbow, wrist, alpha, raised = false) {
  arm.elbow.lerp(elbow, alpha);
  arm.wrist.lerp(wrist, alpha);
  segment(arm.upper, arm.shoulder, arm.elbow, .085, .083);
  segment(arm.lower, arm.elbow, arm.wrist, .077, .073);
  temp.subVectors(arm.wrist, arm.elbow).normalize();
  arm.cuff.position.copy(arm.wrist).addScaledVector(temp, -.036);
  arm.cuff.scale.set(.078, .044, .073);
  arm.cuff.quaternion.setFromUnitVectors(axisY, temp);
  arm.hand.position.copy(arm.wrist).addScaledVector(temp, .025);
  arm.hand.rotation.set(raised ? 0 : .9, 0, raised ? 0 : -.20);
}
function makePencil() {
  const p = new THREE.Group();
  box(p, M.pencil, [0, 0, 0], [.013, .19, .013]);
  lump(p, M.graphite, [0, -.101, 0], [.006, .016, .006]);
  box(p, M.sole, [0, .09, 0], [.015, .025, .015]);
  return bake(p);
}
function makeProps() {
  const props = new THREE.Group();
  const glasses = makeGlasses(true);
  glasses.position.set(.08, .48, .46);
  glasses.rotation.set(-.23, -.15, .08);
  props.add(glasses);
  const clearGlasses = makeGlasses();
  const reflections = new THREE.Group();
  for (const x of [-.092, .092]) {
    // A plain window-shaped glint rather than answer glyphs.
    box(reflections, M.white, [x - .018, .01, .016], [.035, .056, .004], [0, 0, -.3]);
    box(reflections, M.white, [x + .016, .01, .016], [.01, .056, .004], [0, 0, -.3]);
  }
  clearGlasses.add(bake(reflections));
  clearGlasses.position.copy(glasses.position);
  clearGlasses.rotation.copy(glasses.rotation);
  props.add(clearGlasses);
  const ear = new THREE.Group();
  box(ear, M.case, [.255, .285, .53], [.14, .048, .09]);
  box(ear, M.case, [.255, .334, .503], [.14, .063, .018], [-.30, 0, 0]);
  lump(ear, M.device, [.227, .311, .535], [.023, .009, .023]);
  lump(ear, M.case, [.248, .566, .18], [.018, .026, .013]);
  box(ear, M.case, [.248, .542, .18], [.014, .035, .013]);
  props.add(bake(ear));
  const camera = new THREE.Group();
  box(camera, M.device, [.16, .327, .57], [.15, .105, .057], [-.22, 0, 0]);
  box(camera, M.blue, [.16, .329, .604], [.116, .075, .008], [-.22, 0, 0]);
  box(camera, M.paper, [.16, .332, .610], [.067, .055, .004], [-.22, 0, 0]);
  for (let j = 0; j < 3; j++) box(camera, M.rose, [.16, .316 + j * .014, .615], [.043, .004, .004]);
  lump(camera, M.ink, [.216, .371, .575], [.012, .008, .01]);
  props.add(bake(camera));
  const note = new THREE.Group();
  box(note, M.paper, [0, 0, 0], [.205, .15, .009]);
  for (let j = 0; j < 4; j++) {
    tinyDigit(note, j + 1, -.068, .047 - j * .028, .008, .009, M.rose);
    box(note, M.screenInk, [-.016, .048 - j * .028, .008], [.045, .006, .004], [0, 0, -.06]);
    tinyDigit(note, [3, 1, 2, 4][j], .052, .048 - j * .028, .008, .009);
  }
  props.add(bake(note));
  note.position.set(.06, .31, .53);
  note.rotation.set(-.36, -.12, -.09);
  const id = new THREE.Group();
  box(id, M.paper, [0, 0, 0], [.205, .13, .009]);
  box(id, M.trim, [-.056, .009, .008], [.056, .075, .004]);
  lump(id, M.skin, [-.056, .02, .012], [.017, .02, .004]);
  for (let j = 0; j < 3; j++) box(id, M.trim, [.034, .029 - j * .025, .008], [.061, .006, .004]);
  props.add(bake(id));
  id.position.copy(note.position);
  id.rotation.copy(note.rotation);
  const eraser = new THREE.Group();
  box(eraser, M.white, [.15, .30, .57], [.075, .025, .04]);
  box(eraser, M.trim, [.15, .30, .57], [.035, .027, .042]);
  props.add(bake(eraser));
  for (const p of props.children) p.visible = false;
  return { group: props, glasses, clearGlasses, ear, camera, note, id, eraser };
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
    parts.forEach((part, i) => { part.updateMatrix(); batch.setMatrixAt(i, part.matrix); });
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
  head.position.set(0, .706, .013);
  upper.add(head);
  const skin = index % 4 === 2 ? M.skin2 : M.skin;
  const left = makeArm(upper, torso.knit, torso.rib, skin, -1);
  const right = makeArm(upper, torso.knit, torso.rib, skin, 1);
  const legs = [-1, 1].map(side => ({
    side,
    thigh: lump(root, M.trouser),
    shin: lump(root, M.trouser),
    shoe: box(root, M.shoe, [side * .11, .07, .36], [.15, .13, .28]),
    sole: box(root, M.sole, [side * .11, .025, .36], [.153, .04, .285]),
  }));
  const pencil = makePencil();
  upper.add(pencil);
  const props = makeProps();
  upper.add(props.group);
  const clipboard = new THREE.Group();
  box(clipboard, clay('#b19978'), [0, 0, 0], [.24, .34, .034]);
  box(clipboard, M.paper, [0, 0, .022], [.21, .29, .009]);
  box(clipboard, M.sole, [0, .156, .028], [.078, .031, .018]);
  for (let i = 0; i < 6; i++) box(clipboard, M.trim, [0, .09 - i * .035, .030], [.16, .005, .003]);
  upper.add(bake(clipboard));
  clipboard.visible = proctor;
  const batches = [
    instanceParts(upper, [left.upper, left.lower, right.upper, right.lower]),
    instanceParts(upper, [left.cuff, right.cuff]),
    instanceParts(root, legs.flatMap(l => [l.thigh, l.shin])),
    instanceParts(root, legs.map(l => l.shoe)),
    instanceParts(root, legs.map(l => l.sole)),
  ];
  root.userData.clay = { index, proctor, upper, head, left, right, legs, pencil, props, clipboard, batches, stand: proctor ? 1 : 0, lastTime: null, phase: index * 1.61, normalGlasses: index % 5 === 0 || proctor };
  if (proctor) root.scale.setScalar(.93);
  if (proctor) updateProctor(root, { time: 0, walking: false, quiet: false });
  else updateStudent(root, { time: 0, pose: 'write', walking: false });
  return root;
}

export function createStudent(index = 0) { return makeCharacter(Math.max(0, Math.floor(index)) % 12); }
export function createProctor() { return makeCharacter(4, true); }

function updateLegs(rig, time, walking, quiet = false) {
  const s = rig.stand;
  const stride = walking ? Math.sin(time * (quiet ? 5 : 7.2)) * (quiet ? .15 : .26) * s : 0;
  for (const leg of rig.legs) {
    const x = leg.side * .112;
    const step = stride * leg.side;
    const lift = Math.max(0, step) * .19;
    const hip = v(x, .52 + .36 * s, 0);
    const knee = v(x, .345 + .13 * s + lift, .295 * (1 - s) + step * .53);
    const ankle = v(x, .105 + lift, .315 * (1 - s) + step);
    segment(leg.thigh, hip, knee, .089, .086);
    segment(leg.shin, knee, ankle, .079, .077);
    leg.shoe.position.set(x, .077 + lift, ankle.z + .059);
    leg.sole.position.set(x, .027 + lift, ankle.z + .059);
    leg.shoe.rotation.x = -step * .55;
    leg.sole.rotation.x = -step * .55;
  }
}

export function updateStudent(group, { time = 0, pose = 'write', walking = false } = {}) {
  const r = group.userData.clay;
  if (!r) return;
  const dt = r.lastTime === null ? 1 : Math.min(.1, Math.max(0, time - r.lastTime));
  r.lastTime = time;
  const a = 1 - Math.exp(-dt * 12);
  const stand = pose === 'stand' || pose === 'exit' || walking;
  r.stand += ((stand ? 1 : 0) - r.stand) * a;
  const f = time * 1.8 + r.phase;
  const breath = Math.sin(f) * .003;
  r.upper.position.y = .52 + .36 * r.stand + breath;
  r.upper.rotation.x = .035 * (1 - r.stand);
  r.head.rotation.x = THREE.MathUtils.lerp(r.head.rotation.x, stand ? 0 : pose === 'hand' || pose === 'rest' ? -.035 : .16, a);
  r.head.rotation.y = Math.sin(f * .3) * .018;
  const le = v(-.285, .17, .28), lw = v(-.16, .295, .52);
  const re = v(.285, .18, .27), rw = v(.13 + Math.sin(f * 6) * .009, .298, .56 + Math.cos(f * 4) * .012);
  for (const prop of r.props.group.children) prop.visible = false;
  r.pencil.visible = !stand && (pose === 'write' || pose === 'rest');
  r.head.userData.glasses.visible = r.normalGlasses || pose === 'glasses';
  if (pose === 'glasses') {
    re.set(.33, .39, .18); rw.set(.173, .69, .214);
  } else if (pose === 'proof-glasses' || pose === 'clear-glasses') {
    re.set(.32, .30, .29); rw.set(.24, .48, .43);
    r.head.userData.glasses.visible = false;
    r.props.glasses.visible = pose === 'proof-glasses';
    r.props.clearGlasses.visible = pose === 'clear-glasses';
  } else if (pose === 'ear' || pose === 'proof-ear' || pose === 'clear-ear') {
    re.set(.34, .34, .10); rw.set(.25, .61, .075);
    r.props.ear.visible = pose === 'proof-ear';
  } else if (pose === 'camera' || pose === 'proof-camera' || pose === 'clear-camera') {
    re.set(.29, .15, .30); rw.set(.19, .31, .54);
    r.props.camera.visible = pose === 'proof-camera';
    r.props.eraser.visible = pose === 'camera' || pose === 'clear-camera';
  } else if (pose === 'note' || pose === 'proof-note' || pose === 'clear-note') {
    re.set(.29, .13, .23); rw.set(.15, .31, .51);
    le.set(-.27, .15, .24); lw.set(-.055, .30, .50);
    r.props.note.visible = pose === 'proof-note';
    r.props.id.visible = pose === 'note' || pose === 'clear-note';
    r.props.id.rotation.y = pose === 'note' ? Math.PI - .12 : -.12;
  } else if (pose === 'hand') {
    re.set(.32, .63, .02); rw.set(.30, 1.02, .04);
  } else if (pose === 'rest') {
    rw.set(.20, .30, .41); lw.set(-.20, .30, .43);
    r.pencil.position.set(.06, .272, .65);
    r.pencil.rotation.set(0, 0, Math.PI / 2);
  }
  if (stand) {
    const swing = walking ? Math.sin(time * 7.2) * .10 : 0;
    le.set(-.25, .20, -swing); lw.set(-.25, -.045, -swing * 1.6);
    re.set(.25, .20, swing); rw.set(.25, -.045, swing * 1.6);
  }
  setArm(r.left, le, lw, a);
  setArm(r.right, re, rw, a, pose === 'hand');
  if (pose === 'write') {
    r.pencil.position.copy(r.right.wrist).add(v(-.018, .049, -.004));
    r.pencil.rotation.set(-.90, 0, -.24);
  }
  updateLegs(r, time, walking);
  syncInstances(r);
}

export function updateProctor(group, { time = 0, walking = false, quiet = false } = {}) {
  const r = group.userData.clay;
  if (!r) return;
  r.stand = 1;
  const speed = quiet ? 5 : 7.2;
  const swing = walking ? Math.sin(time * speed) * (quiet ? .055 : .12) : 0;
  r.upper.position.y = .865 + (walking ? Math.abs(Math.sin(time * speed)) * (quiet ? .004 : .011) : Math.sin(time * 1.5) * .003);
  r.upper.rotation.x = quiet && walking ? .07 : 0;
  r.head.rotation.x = -.025;
  r.head.rotation.y = Math.sin(time * .4) * .025;
  setArm(r.left, v(-.255, .20, -.035), v(-.26, -.045, .065), 1);
  setArm(r.right, v(.26, .20, swing), v(.25, -.05, swing * 1.7), 1);
  r.clipboard.position.set(-.283, .015, .088);
  r.clipboard.rotation.set(-.08, -.15, -.08);
  r.pencil.visible = false;
  updateLegs(r, time, walking, quiet);
  syncInstances(r);
}
