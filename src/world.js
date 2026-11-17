import * as THREE from 'three';
import { createStudent, createProctor, updateStudent, updateProctor } from './art/characters.js';
import { createClassroom, setCurtain } from './art/classroom.js';
import { DESK, WINDOW, EXIT } from './session.js';

const clamp = THREE.MathUtils.clamp;
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const smooth = (rate, dt) => 1 - Math.exp(-rate * dt);
function routeAt(points, distance) {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i],
      length = dist(a, b);
    if (distance < length) {
      const f = distance / length;
      return { x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f, yaw: Math.atan2(b.x - a.x, b.z - a.z) };
    }
    distance -= length;
  }
  return null;
}
export class Room {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0xf0f0e9);
    this.camera = new THREE.PerspectiveCamera(54, 1, 0.055, 44);
    this.look = new THREE.Vector3();
    this.targetPoint = new THREE.Vector3();
    this.cameraPoint = new THREE.Vector3();
    this.screenPoint = new THREE.Vector3();
    this.keys = new Set();
    this.stick = { x: 0, y: 0 };
    this.touchQuiet = false;
    this.resize();
  }
  reset(session) {
    if (this.scene) this.clear();
    this.session = session;
    const scene = (this.scene = new THREE.Scene());
    scene.background = new THREE.Color(0xf3f2ea);
    scene.add(new THREE.HemisphereLight(0xfffcf6, 0xd6d3d1, 1.8));
    const sun = new THREE.DirectionalLight(0xfff8ed, 1.93);
    sun.position.set(-5, 8, 3);
    sun.castShadow = true;
    Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 0.1, far: 24 });
    sun.shadow.camera.updateProjectionMatrix();
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.018;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xd6e9f3, 0.48);
    fill.position.set(4, 4, -3);
    scene.add(fill);
    this.environment = createClassroom(session.seats);
    scene.add(this.environment);
    this.students = new Map();
    for (const s of session.seats) {
      const group = createStudent(s.id - 1);
      if (s.kind === 'glasses') group.userData.clay.normalGlasses = true;
      group.position.set(s.x, 0, s.z);
      scene.add(group);
      this.students.set(s.id, group);
    }
    this.proctor = createProctor();
    scene.add(this.proctor);
    this.proctor.traverse((o) => {
      o.castShadow = false;
    });
    const tile = document.createElement('canvas');
    tile.width = tile.height = 64;
    const ctx = tile.getContext('2d'),
      gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(66,58,48,.32)');
    gradient.addColorStop(1, 'rgba(66,58,48,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    this.footShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.86, 0.66),
      new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(tile),
        transparent: true,
        depthWrite: false,
      }),
    );
    this.footShadow.rotation.x = -Math.PI / 2;
    scene.add(this.footShadow);
    this.renderer.shadowMap.needsUpdate = true;
    this.touchQuiet = false;
    this.player = { x: -2.24, z: 3.7 };
    this.yaw = 0;
    this.pitch = 0.06;
    this.focus = null;
    this.replay = null;
    this.curtain = false;
    this.proctor.rotation.y = Math.PI;
    this.proctor.position.set(this.player.x, 0, this.player.z);
    this.resetInput();
    this.updateCamera(1, true);
    this.draw(0, 0, false);
  }
  clear() {
    // Assets can share cached resources across sessions. Three re-uploads released buffers on reuse.
    const geo = new Set(),
      mat = new Set(),
      tex = new Set();
    this.scene.traverse((obj) => {
      if (obj.isInstancedMesh) obj.dispose();
      if (obj.geometry) geo.add(obj.geometry);
      if (obj.material)
        for (const m of Array.isArray(obj.material) ? obj.material : [obj.material]) {
          mat.add(m);
          for (const value of Object.values(m)) if (value?.isTexture) tex.add(value);
        }
    });
    geo.forEach((g) => g.dispose());
    mat.forEach((m) => m.dispose());
    tex.forEach((t) => t.dispose());
    this.scene.traverse((o) => o.shadow?.dispose());
    this.scene.clear();
  }
  resize() {
    const w = this.canvas.clientWidth || innerWidth,
      h = this.canvas.clientHeight || innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
  resetInput() {
    this.keys.clear();
    this.stick = { x: 0, y: 0 };
  }
  spin(dx, dy) {
    if (this.focus || this.replay) return;
    this.yaw -= dx * 0.005;
    this.pitch = clamp(this.pitch + dy * 0.004, -0.3, 0.55);
  }
  blocked(x, z) {
    if (x < -4.77 || x > 4.77 || z < -4.95 || z > 5.52) return true;
    if (Math.abs(x - DESK.x) < 1.17 && Math.abs(z - DESK.z) < 0.63) return true;
    return this.session.seats.some((s) => Math.abs(x - s.x) < 0.77 && z > s.z - 0.55 && z < s.z + 1.07);
  }
  move(dt) {
    const keys = this.keys;
    const quiet = keys.has('ShiftLeft') || keys.has('ShiftRight') || this.touchQuiet;
    let side =
      Number(keys.has('KeyD') || keys.has('ArrowRight')) -
      Number(keys.has('KeyA') || keys.has('ArrowLeft')) +
      this.stick.x;
    let forward =
      Number(keys.has('KeyW') || keys.has('ArrowUp')) -
      Number(keys.has('KeyS') || keys.has('ArrowDown')) -
      this.stick.y;
    if (keys.has('KeyQ')) this.yaw += dt * 1.6;
    if (keys.has('KeyR')) this.yaw -= dt * 1.6;
    const length = Math.hypot(side, forward);
    if (length > 0.05 && this.focus) this.focus = null;
    if (length > 1) {
      side /= length;
      forward /= length;
    }
    const p = this.player;
    const step = (quiet ? 1.05 : 2.25) * dt;
    const dx = (side * Math.cos(this.yaw) - forward * Math.sin(this.yaw)) * step;
    const dz = (-forward * Math.cos(this.yaw) - side * Math.sin(this.yaw)) * step;
    const prev = { ...p };
    if (!this.blocked(p.x + dx, p.z)) p.x += dx;
    if (!this.blocked(p.x, p.z + dz)) p.z += dz;
    const meters = dist(p, prev);
    if (meters > 0.0005) {
      const face = Math.atan2(p.x - prev.x, p.z - prev.z);
      const turn = Math.atan2(
        Math.sin(face - this.proctor.rotation.y),
        Math.cos(face - this.proctor.rotation.y),
      );
      this.proctor.rotation.y += turn * smooth(16, dt);
    }
    this.proctor.position.set(p.x, 0, p.z);
    return { meters, quiet };
  }
  target() {
    if (this.focus) return { type: 'seat', id: this.focus };
    const candidates = [];
    const push = (type, p, id) => {
      const dx = p.x - this.player.x,
        dz = p.z - this.player.z,
        d = Math.hypot(dx, dz);
      const dot = (-Math.sin(this.yaw) * dx - Math.cos(this.yaw) * dz) / Math.max(d, 0.001);
      if (d < 2.35 && dot > 0.1) candidates.push({ type, id, rank: d + (1 - dot) * 1.45 });
    };
    for (const s of this.session.seats) if (!s.caught) push('seat', s, s.id);
    return candidates.sort((a, b) => a.rank - b.rank)[0] ?? null;
  }
  nearbyAction(type, p) {
    return dist(this.player, p) < 2.05;
  }
  seatMarker(id) {
    const s = this.session.seat(id);
    const v = this.screenPoint.set(s.x, 1.58, s.z).project(this.camera);
    if (v.z < 0 || v.z > 1 || Math.abs(v.x) > 0.89 || Math.abs(v.y) > 0.74) return null;
    return { left: (1 + v.x) * 50, top: (1 - v.y) * 50 };
  }
  pickSeat(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const candidates = [];
    for (const s of this.session.seats) {
      if (s.caught || dist(this.player, s) > 2.45) continue;
      const v = this.screenPoint.set(s.x, 1.14, s.z).project(this.camera);
      if (v.z > 1 || v.z < 0) continue;
      const x = rect.left + (v.x + 1) * rect.width * 0.5,
        y = rect.top + (1 - v.y) * rect.height * 0.5;
      const delta = Math.hypot(clientX - x, clientY - y);
      if (delta < Math.max(50, rect.height * 0.125)) candidates.push({ id: s.id, delta });
    }
    return candidates.sort((a, b) => a.delta - b.delta)[0]?.id;
  }
  side(s) {
    if (
      !s ||
      dist(this.player, s) >= 2.46 ||
      Math.abs(this.player.x - s.x) <= 0.52 ||
      this.player.z < s.z - 0.55
    )
      return false;
    // A neighboring candidate can occlude the line between the proctor and the student's hands.
    const dx = s.x - this.player.x,
      dz = s.z + 0.31 - this.player.z,
      l2 = dx * dx + dz * dz;
    return !this.session.seats.some((other) => {
      if (other.id === s.id || other.caught) return false;
      const u = ((other.x - this.player.x) * dx + (other.z - this.player.z) * dz) / l2;
      return (
        u > 0 &&
        u < 1 &&
        Math.hypot(this.player.x + u * dx - other.x, this.player.z + u * dz - other.z) < 0.37
      );
    });
  }
  updateCamera(dt, snap = false) {
    let t = this.targetPoint,
      c = this.cameraPoint;
    const p = this.player,
      s = this.session.seat(this.replay?.id ?? this.focus);
    const portrait = clamp((1 - this.camera.aspect) * 1.7, 0, 1);
    if (s) {
      const off = this.replay ? { x: 1.1, z: 1.65 } : { x: p.x - s.x, z: p.z - s.z };
      const l = Math.max(0.01, Math.hypot(off.x, off.z));
      t.set(s.x, 1.02, s.z + 0.18);
      c.set(s.x + (off.x / l) * 2.0, 1.68, s.z + (off.z / l) * 2.0);
    } else {
      const sx = Math.sin(this.yaw),
        cz = Math.cos(this.yaw);
      c.set(p.x + sx * 2.52, 2.43 + 0.48 * portrait + this.pitch, p.z + cz * 2.52);
      t.set(p.x - sx * 2.02, 1.05 - this.pitch, p.z - cz * 2.02);
    }
    // Keep the follow camera inside all four walls.
    c.x = clamp(c.x, -4.89, 4.89);
    c.z = clamp(c.z, -5.2, 5.64);
    const k = snap ? 1 : smooth(11, dt);
    this.camera.position.lerp(c, k);
    this.look.lerp(t, k);
    this.camera.lookAt(this.look);
    const fov = s ? 44 + 5 * portrait : 55 + 20 * portrait;
    if (Math.abs(this.camera.fov - fov) > 0.03) {
      this.camera.fov += (fov - this.camera.fov) * k;
      this.camera.updateProjectionMatrix();
    }
  }
  draw(dt, moved, quiet) {
    const exam = this.session;
    const t = this.replay?.time ?? exam.time;
    for (const s of exam.seats) {
      const g = this.students.get(s.id);
      let pose = 'write',
        walking = false;
      if (this.replay && s.id === this.replay.id) {
        g.position.set(s.x, 0, s.z);
        g.rotation.y = 0;
        g.visible = true;
        pose = this.replay.phase === 'cue' ? s.kind : s.guilty ? 'proof-' + s.kind : 'clear-' + s.kind;
      } else if (s.caught) {
        const tExit = Math.max(0, exam.time - s.exitAt);
        const aisleX = s.x + (s.x >= 0 ? 1 : -1) * 0.98;
        const pos = routeAt(
          [s, { x: aisleX, z: s.z - 0.2 }, { x: aisleX, z: -4.68 }, { x: EXIT.x, z: -4.68 }, EXIT],
          tExit * 2.8,
        );
        g.visible = !!pos;
        if (pos) {
          g.position.set(pos.x, 0, pos.z);
          g.rotation.y = pos.yaw;
        }
        walking = true;
        pose = 'exit';
      } else {
        const r = exam.requestFor(s.id);
        const stage = exam.stage(s);
        if (r && (!r.ack || exam.time > r.deadline - 6)) pose = 'hand';
        else if (s.noise > 4.5 && !this.focus) pose = 'rest';
        else if (stage === 'cue') pose = s.kind;
        else if (stage === 'detail') pose = s.guilty ? 'proof-' + s.kind : 'clear-' + s.kind;
      }
      updateStudent(g, { time: t + s.offset, pose, walking });
    }
    this.proctor.visible = !this.focus && !this.replay;
    this.footShadow.position.set(this.player.x, 0.003, this.player.z);
    this.footShadow.visible = this.proctor.visible;
    // Keep soft room shadows cached between transformations of the large occluders.
    const shadowKey =
      exam.seats
        .filter((s) => s.caught)
        .map((s) => s.id + ':' + Math.min(8, Math.floor(exam.time - s.exitAt)))
        .join(',') + exam.curtain;
    if (shadowKey !== this.shadowKey) {
      this.shadowKey = shadowKey;
      this.renderer.shadowMap.needsUpdate = true;
    }
    updateProctor(this.proctor, { time: t, walking: moved > 0.0002, quiet });
    if (this.curtain !== exam.curtain) {
      this.curtain = exam.curtain;
      setCurtain(this.environment, this.curtain);
    }
    this.updateCamera(dt);
    this.renderer.render(this.scene, this.camera);
  }
}
