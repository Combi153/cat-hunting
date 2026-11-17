import * as THREE from 'three';
import { STUDENT_DESK_TOP } from './dimensions.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// One material batch per surface, shared geometry, and no lights or characters.
// Coordinates use the seated student's chair center; every student faces +Z.
const C = {
  wall: '#e9e6df',
  ivory: '#e8e4da',
  rim: '#f3eee4',
  steel: '#cbcfc9',
  floor: '#c9cbc8',
  seam: '#bfc2be',
  sage: '#8b9d8b',
  dark: '#526359',
  charcoal: '#72756e',
  locker: '#c7ccc8',
  paper: '#fffdf4',
  rubber: '#9b9f98',
};

function canvasTexture(width, height, paint) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function clayTexture() {
  return canvasTexture(128, 128, (ctx, w, h) => {
    const pixels = ctx.createImageData(w, h);
    let seed = 29317;
    for (let i = 0; i < pixels.data.length; i += 4) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const n = 217 + (seed >>> 26) * 0.55;
      pixels.data[i] = n;
      pixels.data[i + 1] = n;
      pixels.data[i + 2] = n;
      pixels.data[i + 3] = 255;
    }
    ctx.putImageData(pixels, 0, 0);
  });
}

function examTexture() {
  return canvasTexture(1024, 768, (ctx, w, h) => {
    ctx.fillStyle = '#fffdf5';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#c6c3b7';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(25, 22, 974, 724);
    ctx.fillStyle = '#555d55';
    ctx.textAlign = 'center';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('국어 영역', 338, 66);
    ctx.font = '13px sans-serif';
    ctx.fillText('대학수학능력시험 문제지', 338, 92);
    ctx.fillStyle = '#8a8c80';
    ctx.fillRect(47, 112, 580, 1.5);
    ctx.fillStyle = '#6c7169';
    ctx.textAlign = 'left';
    for (let col = 0; col < 2; col++) {
      const x = 52 + col * 297;
      for (let row = 0; row < 34; row++) {
        const y = 145 + row * 16;
        const length = row % 7 === 6 ? 164 : 248 - (row % 3) * 11;
        ctx.globalAlpha = row % 8 === 0 ? 0.85 : 0.42;
        ctx.fillRect(x, y, length, row % 8 === 0 ? 3 : 2);
      }
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#e2b5b4';
    ctx.fillStyle = '#ba7f80';
    ctx.strokeRect(675, 43, 302, 680);
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('답 안 지', 826, 81);
    ctx.font = '13px sans-serif';
    ctx.fillText('수험번호', 827, 115);
    for (let col = 0; col < 8; col++) {
      ctx.strokeRect(697 + col * 33, 131, 25, 28);
      for (let r = 0; r < 10; r++) {
        ctx.beginPath();
        ctx.ellipse(709 + col * 33, 181 + r * 15, 6, 4.4, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    for (let row = 0; row < 18; row++) {
      ctx.fillStyle = '#b47b7e';
      ctx.font = '10px sans-serif';
      ctx.fillText(String(row + 1), 704, 361 + row * 18);
      for (let col = 0; col < 5; col++) {
        ctx.beginPath();
        ctx.ellipse(747 + col * 44, 357 + row * 18, 9, 5.2, 0, 0, Math.PI * 2);
        ctx.stroke();
        if ((row * 7 + col) % 19 === 0) {
          ctx.fillStyle = '#72746c';
          ctx.fill();
        }
      }
    }
  });
}

function shadowTexture() {
  return canvasTexture(128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 8, w / 2, h / 2, 64);
    g.addColorStop(0, 'rgba(55,62,54,.24)');
    g.addColorStop(0.45, 'rgba(55,62,54,.13)');
    g.addColorStop(1, 'rgba(55,62,54,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

export function createClassroom(seats = []) {
  const room = new THREE.Group();
  room.name = 'White clay examination room';
  const batches = new Map();
  const grain = clayTexture();
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
  grain.repeat.set(3, 3);
  const materials = {};
  for (const [key, color] of Object.entries(C)) {
    materials[key] = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.94,
      bumpMap: grain,
      bumpScale: 0.009,
    });
  }
  materials.sky = new THREE.MeshBasicMaterial({ color: '#d2e7ee', side: THREE.DoubleSide });
  materials.paperPrint = new THREE.MeshStandardMaterial({ map: examTexture(), roughness: 1 });
  materials.shadow = new THREE.MeshBasicMaterial({
    map: shadowTexture(),
    transparent: true,
    depthWrite: false,
    opacity: 0.66,
  });
  materials.fabric = new THREE.MeshStandardMaterial({
    color: '#d9dfcf',
    roughness: 1,
    side: THREE.DoubleSide,
    bumpMap: grain,
    bumpScale: 0.012,
  });
  const cache = new Map();
  const matrix = new THREE.Matrix4();
  const rotation = new THREE.Euler();
  const quat = new THREE.Quaternion();
  const unit = new THREE.Vector3(1, 1, 1);

  function add(geometry, material, x, y, z, rx = 0, ry = 0, rz = 0) {
    rotation.set(rx, ry, rz);
    quat.setFromEuler(rotation);
    matrix.compose(new THREE.Vector3(x, y, z), quat, unit);
    const transformed = geometry.clone().applyMatrix4(matrix);
    // Standardize attributes so boxes, cylinders, and planes batch together.
    if (transformed.index) {
      const flat = transformed.toNonIndexed();
      transformed.dispose();
      if (!batches.has(material)) batches.set(material, []);
      batches.get(material).push(flat);
    } else {
      if (!batches.has(material)) batches.set(material, []);
      batches.get(material).push(transformed);
    }
  }
  function box(w, h, d, material, x, y, z, radius = 0.025, ry = 0) {
    const r = Math.max(0.001, Math.min(radius, w / 2.1, h / 2.1, d / 2.1));
    const key = `${w}/${h}/${d}/${r}`;
    const segments = r >= 0.04 && w > 0.4 && d > 0.25 ? 2 : 1;
    if (!cache.has(key)) cache.set(key, new RoundedBoxGeometry(w, h, d, segments, r));
    add(cache.get(key), material, x, y, z, 0, ry);
  }
  function cylinder(radius, height, material, x, y, z, rx = 0, rz = 0) {
    const key = `c/${radius}/${height}`;
    if (!cache.has(key)) cache.set(key, new THREE.CylinderGeometry(radius, radius, height, 10));
    add(cache.get(key), material, x, y, z, rx, 0, rz);
  }
  function plane(w, h, material, x, y, z, rx = 0, ry = 0, rz = 0) {
    const geometry = new THREE.PlaneGeometry(w, h);
    add(geometry, material, x, y, z, rx, ry, rz);
    geometry.dispose();
  }
  function lettering(text, w, h, options = {}) {
    const texture = canvasTexture(1024, Math.round((1024 * h) / w), (ctx, cw, ch) => {
      ctx.fillStyle = options.background || '#ece9df';
      ctx.fillRect(0, 0, cw, ch);
      ctx.fillStyle = options.color || '#647367';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${options.weight || 500} ${Math.floor(ch * (options.size || 0.44))}px sans-serif`;
      ctx.fillText(text, cw / 2, ch / 2);
    });
    return new THREE.MeshStandardMaterial({ map: texture, roughness: 1 });
  }

  // The low, quietly tiled floor anchors the whole dollhouse.
  box(10.55, 0.17, 11.85, 'floor', 0, -0.095, 0.15, 0.07);
  for (let x = -4.8; x < 5.1; x += 0.8) box(0.009, 0.003, 11.45, 'seam', x, -0.007, 0.15, 0.001);
  for (let z = -5.45; z < 5.9; z += 0.8) box(10.2, 0.003, 0.009, 'seam', 0, -0.006, z, 0.001);
  // Open ceiling, solid front/back walls, and a corridor wall with a recessed exit.
  box(10.55, 3.48, 0.18, 'wall', 0, 1.73, 5.99, 0.025);
  box(10.55, 3.48, 0.18, 'wall', 0, 1.73, -5.69, 0.025);
  box(0.18, 3.48, 9.27, 'wall', 5.19, 1.73, 1.255, 0.025);
  box(0.18, 1.08, 1.55, 'wall', 5.19, 2.93, -4.3, 0.025);
  box(0.18, 3.48, 0.52, 'wall', 5.19, 1.73, -5.43, 0.025);
  box(10.24, 0.12, 0.055, 'ivory', 0, 0.075, 5.87, 0.016);
  box(10.24, 0.12, 0.055, 'ivory', 0, 0.075, -5.57, 0.016);
  box(0.055, 0.12, 9.3, 'ivory', 5.08, 0.075, 1.25, 0.016);

  // Four generous, undistracting windows: a single pale blue sky beyond each.
  box(0.18, 1.13, 11.66, 'wall', -5.19, 0.555, 0.15, 0.02);
  box(0.18, 0.4, 11.66, 'wall', -5.19, 3.28, 0.15, 0.02);
  box(0.35, 0.09, 11.52, 'rim', -5.06, 1.13, 0.15, 0.03);
  const curtains = [];
  for (const center of [-4.1, -1.35, 1.4, 4.15]) {
    plane(2.46, 1.9, 'sky', -5.205, 2.1, center, 0, Math.PI / 2);
    for (const z of [center - 1.25, center, center + 1.25])
      box(0.12, 2.0, 0.065, 'rim', -5.06, 2.1, z, 0.017);
    for (const y of [1.14, 2.1, 3.06]) box(0.12, 0.065, 2.57, 'rim', -5.06, y, center, 0.018);
    cylinder(0.018, 2.65, 'steel', -4.89, 3.17, center, Math.PI / 2);
    for (const side of [-1, 1]) {
      const geometry = new THREE.PlaneGeometry(1, 1.91, 28, 4);
      const p = geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const horizontal = p.getX(i);
        const vertical = p.getY(i);
        p.setXYZ(i, Math.cos((horizontal + 0.5) * Math.PI * 10) * 0.038, vertical, horizontal);
      }
      geometry.computeVertexNormals();
      const curtain = new THREE.Mesh(geometry, materials.fabric);
      curtain.position.set(-4.89, 2.105, center + side * 1.1);
      curtain.scale.z = 0.26;
      curtain.castShadow = true;
      curtain.receiveShadow = true;
      curtain.userData = { center, side };
      curtains.push(curtain);
      room.add(curtain);
    }
    // Curtain tiebacks and a small sage pull cord make the request location legible.
    cylinder(0.009, 1.29, 'sage', -4.78, 2.23, center + 1.29);
    cylinder(0.028, 0.08, 'sage', -4.78, 1.55, center + 1.29);
  }
  for (const z of [-5.5, -2.725, 0.025, 2.775, 5.525]) box(0.18, 2, 0.29, 'wall', -5.19, 2.1, z, 0.025);

  // Front chalkboard: recessed sage surface, warm white frame, a chalk ledge.
  box(5.96, 1.74, 0.13, 'rim', -0.2, 2.17, 5.82, 0.055);
  box(5.69, 1.48, 0.055, 'dark', -0.2, 2.17, 5.733, 0.028);
  box(5.98, 0.075, 0.22, 'ivory', -0.2, 1.285, 5.68, 0.025);
  box(0.12, 0.035, 0.055, 'paper', -2.45, 1.34, 5.64, 0.01);
  box(0.19, 0.07, 0.1, 'sage', 2.3, 1.355, 5.63, 0.02);
  const chalk = lettering('1교시  ·  국어 영역', 3.3, 0.48, {
    background: C.dark,
    color: '#dbe3d3',
    weight: 400,
    size: 0.45,
  });
  plane(3.3, 0.48, chalk, -0.2, 2.4, 5.698, 0, Math.PI);
  const notice = lettering('종료 전까지 조용히 응시해 주세요', 3.5, 0.26, {
    background: C.dark,
    color: '#b4c2af',
    weight: 400,
    size: 0.44,
  });
  plane(3.5, 0.26, notice, -0.2, 1.9, 5.697, 0, Math.PI);
  box(4.15, 0.007, 0.008, 'sage', -0.2, 2.105, 5.696, 0.002);

  // Analog wall clock, rendered once into its clay-rimmed disk.
  const clockMat = new THREE.MeshStandardMaterial({
    map: canvasTexture(384, 384, (ctx, w, h) => {
      ctx.fillStyle = '#efede3';
      ctx.fillRect(0, 0, w, h);
      ctx.translate(w / 2, h / 2);
      ctx.strokeStyle = '#777d71';
      ctx.fillStyle = '#777d71';
      for (let n = 0; n < 60; n++) {
        const a = (n * Math.PI) / 30;
        const big = n % 5 === 0;
        ctx.lineWidth = big ? 5 : 2;
        ctx.beginPath();
        ctx.moveTo(Math.sin(a) * (big ? 139 : 148), -Math.cos(a) * (big ? 139 : 148));
        ctx.lineTo(Math.sin(a) * 159, -Math.cos(a) * 159);
        ctx.stroke();
      }
      ctx.lineCap = 'round';
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-66, -37);
      ctx.stroke();
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(102, -59);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
    }),
    roughness: 1,
  });
  cylinder(0.31, 0.07, 'charcoal', 3.6, 2.84, 5.79, Math.PI / 2);
  const clockFace = new THREE.CircleGeometry(0.273, 48);
  add(clockFace, clockMat, 3.6, 2.84, 5.748, 0, Math.PI);
  clockFace.dispose();

  // Back lockers, individual recessed fronts, small vents, and flat handles.
  box(7.6, 1.63, 0.52, 'steel', -0.65, 0.825, -5.3, 0.055);
  for (let col = 0; col < 10; col++) {
    const x = -4.06 + col * 0.758;
    for (let row = 0; row < 2; row++) {
      const y = 0.43 + row * 0.79;
      box(0.71, 0.735, 0.048, 'locker', x, y, -5.012, 0.025);
      box(0.025, 0.125, 0.025, 'rim', x - 0.235, y + 0.025, -4.976, 0.009);
      for (let line = 0; line < 3; line++)
        box(0.19, 0.014, 0.014, 'ivory', x, y + 0.23 - line * 0.038, -4.979, 0.005);
    }
  }
  const rearSign = lettering('시험 중', 1.4, 0.32, { size: 0.5, weight: 600 });
  plane(1.4, 0.32, rearSign, -0.65, 2.33, -5.55);
  box(1.62, 0.48, 0.05, 'ivory', -0.65, 2.33, -5.59, 0.035);

  // Corridor exit at the back right, with a glazed upper panel and a sage plaque.
  box(0.1, 2.46, 1.58, 'rim', 5.1, 1.23, -4.3, 0.025);
  box(0.055, 2.29, 1.39, 'ivory', 5.035, 1.17, -4.3, 0.035);
  box(0.018, 0.86, 0.52, 'steel', 4.998, 1.69, -4.3, 0.024);
  box(0.018, 0.75, 0.41, 'sky', 4.984, 1.69, -4.3, 0.018);
  box(0.04, 0.19, 0.055, 'charcoal', 4.963, 1.02, -3.8, 0.012);
  box(0.14, 0.035, 0.055, 'steel', 4.9, 1.04, -3.8, 0.013);
  const exit = lettering('퇴실', 0.54, 0.22, {
    background: C.sage,
    color: '#f5f3e8',
    weight: 600,
    size: 0.56,
  });
  plane(0.54, 0.22, exit, 4.974, 2.57, -4.3, 0, -Math.PI / 2);

  // Number labels share one atlas and one draw call across every student desk.
  const tagGrid = Math.max(1, Math.ceil(Math.sqrt(seats.length)));
  const tagTexture = canvasTexture(tagGrid * 128, tagGrid * 80, (ctx) => {
    ctx.fillStyle = '#eeece3';
    ctx.fillRect(0, 0, tagGrid * 128, tagGrid * 80);
    ctx.fillStyle = '#767b70';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '600 43px sans-serif';
    seats.forEach((seat, i) =>
      ctx.fillText(
        String(seat.id ?? i + 1).padStart(2, '0'),
        (i % tagGrid) * 128 + 64,
        Math.floor(i / tagGrid) * 80 + 40,
      ),
    );
  });
  const tagMaterial = new THREE.MeshStandardMaterial({ map: tagTexture, roughness: 1 });
  seats.forEach((seat, i) => {
    const { x, z } = seat;
    const dz = z + 0.5;
    const top = STUDENT_DESK_TOP;
    box(1.05, 0.085, 0.7, 'rim', x, top - 0.0425, dz, 0.045);
    box(0.93, 0.16, 0.057, 'ivory', x, top - 0.16, dz + 0.29, 0.025);
    box(0.035, 0.125, 0.54, 'ivory', x - 0.457, top - 0.15, dz, 0.012);
    box(0.035, 0.125, 0.54, 'ivory', x + 0.457, top - 0.15, dz, 0.012);
    for (const lx of [-0.425, 0.425]) {
      for (const lz of [-0.24, 0.24]) {
        const legHeight = top - 0.13;
        cylinder(0.026, legHeight, 'steel', x + lx, 0.012 + legHeight / 2, dz + lz);
        cylinder(0.032, 0.055, 'rubber', x + lx, 0.04, dz + lz);
      }
    }
    cylinder(0.018, 0.85, 'steel', x, 0.2, dz + 0.24, 0, Math.PI / 2);
    // Low chair and slender back: sized for the dollhouse students.
    box(0.48, 0.068, 0.46, 'ivory', x, 0.445, z, 0.05);
    box(0.47, 0.31, 0.066, 'ivory', x, 0.735, z - 0.208, 0.052);
    for (const lx of [-0.187, 0.187]) {
      for (const lz of [-0.16, 0.16]) {
        cylinder(0.022, 0.405, 'steel', x + lx, 0.22, z + lz);
        cylinder(0.027, 0.035, 'rubber', x + lx, 0.032, z + lz);
      }
      cylinder(0.019, 0.46, 'steel', x + lx, 0.65, z - 0.207);
    }
    plane(1.14, 1.13, 'shadow', x, 0.001, z + 0.25, -Math.PI / 2);
    // Examination sheets, a soft fold down the center, eraser, capped sign pen.
    box(0.7, 0.009, 0.425, 'paper', x - 0.01, top + 0.005, dz + 0.015, 0.008);
    // Students look toward +Z. The title goes on the far edge and the OMR sheet on their right (−X).
    plane(0.69, 0.418, 'paperPrint', x - 0.01, top + 0.011, dz + 0.015, -Math.PI / 2, 0, Math.PI);
    box(0.004, 0.003, 0.418, 'ivory', x - 0.1, top + 0.014, dz + 0.015, 0.001);
    box(0.065, 0.026, 0.034, 'paper', x + 0.402, top + 0.016, dz - 0.18, 0.009);
    cylinder(0.009, 0.18, 'charcoal', x - 0.412, top + 0.015, dz + 0.035, Math.PI / 2, -0.13);
    cylinder(0.011, 0.045, 'sage', x - 0.412, top + 0.016, dz - 0.078, Math.PI / 2, -0.13);
    box(0.17, 0.105, 0.015, 'paper', x, top - 0.154, dz + 0.327, 0.012);
    const tag = new THREE.PlaneGeometry(0.142, 0.089);
    const uv = tag.attributes.uv;
    const atlasX = i % tagGrid;
    const atlasY = Math.floor(i / tagGrid);
    for (let j = 0; j < uv.count; j++)
      uv.setXY(j, (atlasX + uv.getX(j)) / tagGrid, 1 - (atlasY + 1 - uv.getY(j)) / tagGrid);
    add(tag, tagMaterial, x, top - 0.154, dz + 0.337);
    tag.dispose();
  });

  // Proctor supplies are visible and readable from the approach aisle.
  box(1.83, 0.1, 0.77, 'rim', 0, 0.9, 4.55, 0.045);
  box(1.62, 0.71, 0.055, 'ivory', 0, 0.5, 4.83, 0.025);
  for (const x of [-0.73, 0.73]) box(0.065, 0.83, 0.62, 'ivory', x, 0.442, 4.55, 0.025);
  plane(2.2, 1.2, 'shadow', 0, 0.002, 4.55, -Math.PI / 2);
  box(0.55, 0.065, 0.4, 'paper', -0.43, 0.983, 4.56, 0.011);
  plane(0.54, 0.39, 'paperPrint', -0.43, 1.018, 4.56, -Math.PI / 2);
  box(0.27, 0.035, 0.36, 'sage', 0.46, 0.973, 4.57, 0.013, 0.09);
  box(0.225, 0.005, 0.285, 'paper', 0.46, 0.994, 4.57, 0.005, 0.09);
  const proctorSign = lettering('감독관', 0.43, 0.16, { size: 0.5 });
  plane(0.43, 0.16, proctorSign, 0, 0.67, 4.786, 0, Math.PI);
  // Minimal ceiling fittings suggest a real room while leaving the view open.
  for (const x of [-2.65, 2.65]) {
    for (const z of [-2.55, 1.5]) {
      box(0.55, 0.075, 1.32, 'rim', x, 3.3, z, 0.035);
      box(0.41, 0.028, 1.17, 'paper', x, 3.251, z, 0.02);
    }
  }

  for (const [key, geometries] of batches) {
    const geometry = mergeGeometries(geometries, false);
    geometries.forEach((g) => g.dispose());
    const material = typeof key === 'string' ? materials[key] : key;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `Room surface · ${typeof key === 'string' ? key : 'printed detail'}`;
    mesh.castShadow = key !== 'sky' && key !== 'shadow';
    mesh.receiveShadow = key !== 'sky' && key !== 'shadow';
    if (key === 'shadow') mesh.renderOrder = 1;
    room.add(mesh);
  }
  cache.forEach((g) => g.dispose());
  room.userData.curtains = curtains;
  room.userData.curtainClosed = false;
  room.userData.deskTopY = STUDENT_DESK_TOP;
  room.userData.proctorDesk = { x: 0, z: 4.55, topY: 0.95 };
  room.userData.exit = { x: 4.8, z: -4.3 };
  return room;
}

export function setCurtain(group, closed) {
  for (const curtain of group.userData.curtains || []) {
    const { center, side } = curtain.userData;
    curtain.scale.z = closed ? 1.25 : 0.26;
    curtain.position.z = center + side * (closed ? 0.625 : 1.1);
  }
  group.userData.curtainClosed = Boolean(closed);
}
