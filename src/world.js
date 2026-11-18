import * as THREE from 'three';
import {
  createStudent,
  createProctor,
  updateStudent,
  updateEnding,
  updateProctor,
  updateUpset,
} from './art/characters.js';
import { approachPath, stationPath } from './walkways.js';
import { createClassroom, setCurtain } from './art/classroom.js';

export class Room {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.camera = new THREE.OrthographicCamera(-6, 6, 7, -7, 0.05, 70);
    this.look = new THREE.Vector3();
    this.target = new THREE.Vector3();
    this.position = new THREE.Vector3();
    this.projected = new THREE.Vector3();
    this.halfHeight = 7;
    this.focus = null;
    this.ending = null;
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
    this.focus = null;
    this.ending = null;
    this.path = [];
    this.action = null;
    this.curtainProgress = 0;
    this.proctor.visible = true;
    this.proctor.position.set(0, 0, 3.7);
    this.renderer.shadowMap.needsUpdate = true;
    this.updateCamera(1, true);
    this.draw(0, 0);
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
    this.aspect = (this.canvas.clientWidth || innerWidth) / (this.canvas.clientHeight || innerHeight);
    this.renderer.setSize(
      this.canvas.clientWidth || innerWidth,
      this.canvas.clientHeight || innerHeight,
      false,
    );
    this.updateProjection();
    // Resizing clears the WebGL buffer, including while the exam is paused.
    if (this.scene) {
      this.updateCamera(1, true);
      this.renderer.render(this.scene, this.camera);
    }
  }
  updateProjection() {
    this.camera.left = -this.halfHeight * this.aspect;
    this.camera.right = this.halfHeight * this.aspect;
    this.camera.top = this.halfHeight;
    this.camera.bottom = -this.halfHeight;
    this.camera.updateProjectionMatrix();
  }
  select(id) {
    const seat = this.session.seat(id);
    if (!seat || seat.caught) return;
    if (this.action) return;
    const path = approachPath(this.session.seats, this.proctor.position, seat);
    if (!path) return;
    this.focus = id;
    this.path = path;
  }
  get busy() {
    return this.action ? 'helping' : this.path.length ? 'walking' : '';
  }
  overview() {
    if (this.action) return;
    this.focus = null;
    this.path = [];
  }
  help() {
    if (this.busy) return false;
    const request = this.session.requestFor(this.focus);
    if (!request) return false;
    const path =
      request.type === 'curtain' ? stationPath(this.session.seats, this.proctor.position, 'window') : [];
    if (!path) return false;
    request.helping = true;
    this.action = { request, elapsed: 0 };
    this.path = path;
    return true;
  }
  step(dt) {
    if (this.ending) return null;
    let remaining = dt;
    while (this.path.length && remaining > 0) {
      const next = this.path[0],
        p = this.proctor.position;
      const distance = Math.hypot(next.x - p.x, next.z - p.z);
      this.proctor.rotation.y = Math.atan2(next.x - p.x, next.z - p.z);
      const used = Math.min(remaining, distance / 3.3);
      const fraction = distance ? Math.min(1, (used * 3.3) / distance) : 1;
      p.x += (next.x - p.x) * fraction;
      p.z += (next.z - p.z) * fraction;
      remaining -= used;
      if (fraction >= 1) this.path.shift();
    }
    if (!this.path.length && this.action) {
      this.action.elapsed += remaining;
      const { request, elapsed } = this.action;
      if (request.type === 'curtain') {
        this.proctor.rotation.y = -Math.PI / 2;
        this.curtainProgress = Math.min(1, elapsed / 1.8);
      }
      if (elapsed >= (request.type === 'curtain' ? 2.1 : 1.1)) {
        const completed = this.session.serve(request.id);
        this.action = null;
        if (request.type === 'curtain') this.focus = null;
        return completed ? request : null;
      }
    } else if (!this.path.length && this.focus) {
      const seat = this.session.seat(this.focus);
      this.proctor.rotation.y = Math.atan2(
        seat.x - this.proctor.position.x,
        seat.z - this.proctor.position.z,
      );
    }
    return null;
  }
  finish(result) {
    this.focus = null;
    this.path = [];
    this.action = null;
    this.proctor.position.set(0, 0, 2.8);
    this.proctor.rotation.y = 0;
    this.ending = { ...result, id: result.missed[0]?.id, elapsed: 0 };
    this.updateCamera(1, true);
  }
  updateCamera(dt, snap = false) {
    const seat = this.session.seat(this.ending?.id ?? this.focus);
    let height;
    if (this.ending) {
      const actor = seat ?? { x: 0, z: 2.8 };
      const y = seat ? 1.18 : 1.47;
      height = Math.max(0.65, 0.55 / this.aspect);
      this.target.set(actor.x, y - height * 0.38, actor.z + 0.14);
      this.position.set(actor.x + 0.12, y + 0.2, actor.z + 2.6);
    } else if (this.action?.request.type === 'curtain' && !this.path.length) {
      this.target.set(-4.5, 1.8, 1.4);
      this.position.set(-0.5, 3.0, 3.1);
      height = Math.max(1.65, 1.6 / this.aspect);
    } else if (seat && !this.busy) {
      this.target.set(seat.x, 1.0, seat.z + 0.24);
      this.position.set(seat.x + 0.55, 1.85, seat.z + 1.8);
      height = Math.max(0.85, 0.72 / this.aspect);
    } else {
      this.target.set(0, this.aspect > 1 ? 1 : 0.5, -0.55);
      this.position.set(0, 8.5, 10.5);
      height = Math.max(this.aspect > 1 ? 3.45 : 4.65, 3.55 / this.aspect);
    }
    const blend = snap ? 1 : 1 - Math.exp(-dt * 10);
    this.camera.position.lerp(this.position, blend);
    this.look.lerp(this.target, blend);
    this.camera.lookAt(this.look);
    this.halfHeight += (height - this.halfHeight) * blend;
    this.updateProjection();
    this.camera.updateMatrixWorld();
  }
  anchor(seat, height = 1.0) {
    this.projected.set(seat.x, height, seat.z).project(this.camera);
    return { x: (1 + this.projected.x) * 50, y: (1 - this.projected.y) * 50 };
  }
  draw(dt, elapsed) {
    const exam = this.session;
    if (this.ending) this.ending.elapsed += dt;
    for (const seat of exam.seats) {
      const student = this.students.get(seat.id);
      student.visible = !seat.caught && (!this.ending || this.ending.id === seat.id);
      if (seat.caught && exam.time - seat.exitAt < 1.1 && !this.ending) {
        student.visible = true;
        student.scale.setScalar(Math.max(0.01, 1 - (exam.time - seat.exitAt) / 1.1));
      }
      if (this.ending && this.ending.id === seat.id) {
        updateEnding(student, 'villain', this.ending.elapsed);
      } else {
        updateStudent(student, { time: elapsed + seat.offset, pose: exam.behavior(seat).pose });
        if (seat.cleared) updateUpset(student, elapsed - seat.accusedAt);
      }
    }
    this.proctor.visible = !this.ending || !this.ending.id;
    if (this.ending && this.proctor.visible)
      updateEnding(this.proctor, this.ending.reason === 'win' ? 'win' : 'sad', this.ending.elapsed);
    else if (!this.ending)
      updateProctor(this.proctor, {
        time: elapsed,
        walking: this.path.length > 0,
        reaching: Boolean(this.action && !this.path.length),
      });
    setCurtain(this.environment, this.curtainProgress);
    if (this.busy) this.renderer.shadowMap.needsUpdate = true;
    const shadowKey =
      exam.seats
        .filter((seat) => seat.caught)
        .map((seat) => seat.id + ':' + Math.min(2, Math.floor(exam.time - seat.exitAt)))
        .join(',') +
      exam.curtain +
      Boolean(this.ending);
    if (shadowKey !== this.shadowKey) {
      this.shadowKey = shadowKey;
      this.renderer.shadowMap.needsUpdate = true;
    }
    this.updateCamera(dt);
    this.renderer.render(this.scene, this.camera);
  }
}
