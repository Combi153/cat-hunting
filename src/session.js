export const TYPES = {
  glasses: {
    name: 'AI 안경',
    cue: '안경다리를 잡고 렌즈를 들여다봤다.',
    proof: '벗어 든 안경 안쪽에 문항 번호가 바뀌는 화면이 보였다.',
    clear: '고개가 움직이자 렌즈의 창틀 반사도 함께 움직였다.',
  },
  ear: {
    name: '초소형 이어폰',
    cue: '한쪽 귀에 손을 가져갔다.',
    proof: '귀에서 꺼낸 이어폰을 열린 충전 케이스에 넣었다.',
    clear: '손으로 머리카락을 귀 뒤로 넘기고 다시 필기했다.',
  },
  camera: {
    name: '소형 카메라',
    cue: '작은 물건을 시험지 가까이 가져갔다.',
    proof: '물건 뒷면 화면에 방금 찍은 시험지 사진이 떠 있었다.',
    clear: '지우개로 연필 밑줄을 지우고 가루를 털어냈다.',
  },
  note: {
    name: '쪽지',
    cue: '접힌 종이를 주워 펼쳤다.',
    proof: '펼친 종이의 문항별 답을 보고 답안지에 옮겼다.',
    clear: '수험번호와 사진이 있는 수험표를 책상에 다시 놓았다.',
  },
};
export const EXAM_DURATION = 90;
export const MAX_HEALTH = 3;
export const seatNo = (id) => String(id).padStart(2, '0');
export const clock = (seconds) => {
  const value = Math.max(0, Math.ceil(seconds));
  return String(Math.floor(value / 60)).padStart(2, '0') + ':' + String(value % 60).padStart(2, '0');
};
function shuffled(list, random) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const index = Math.floor(random() * (i + 1));
    [copy[i], copy[index]] = [copy[index], copy[i]];
  }
  return copy;
}
function examRandom(seed) {
  let state = seed;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
const ordinary = [
  { pose: 'rest', text: '연필을 내려놓고 잠깐 손목을 쉬고 있다.' },
  { pose: 'clear-camera', text: '지우개로 답을 지우고 다시 생각하고 있다.' },
  { pose: 'read', text: '시험지를 내려다보며 지문을 읽고 있다.' },
  { pose: 'clear-ear', text: '흘러내린 머리카락을 귀 뒤로 넘겼다. 손에는 아무것도 없다.' },
];
export class Exam {
  constructor(seed = Math.floor(Math.random() * 4294967296)) {
    this.seed = seed;
    const random = examRandom(seed);
    this.duration = EXAM_DURATION;
    this.time = 0;
    this.health = MAX_HEALTH;
    this.over = false;
    this.reason = '';
    this.falseCalls = 0;
    this.complaints = [];
    this.curtain = false;
    this.events = [];
    const xs = [-1.35, 1.35];
    const zs = [2.4, 0.1, -2.2, -4.5];
    this.seats = zs.flatMap((z, row) => xs.map((x, col) => ({
      id: row * xs.length + col + 1, x, z,
      kind: Object.keys(TYPES)[Math.floor(random() * 4)],
      guilty: false, caught: false, cleared: false,
      exitAt: null, first: 7 + random() * 12,
      period: 18 + random() * 5,
      ordinary: Math.floor(random() * ordinary.length),
      offset: random() * 8,
    })));
    // Spread three different leads over the room without identifying suspects in the UI.
    for (const row of shuffled([0, 1, 2, 3], random).slice(0, 3)) {
      this.seats[row * 2 + Math.floor(random() * 2)].guilty = true;
    }
    const normal = shuffled(this.seats.filter((seat) => !seat.guilty), random);
    this.requests = [this.newRequest(normal[0], 'paper', 26), this.newRequest(normal[1], 'curtain', 58)];
  }
  newRequest(seat, type, start) {
    return { id: seat.id, type, start, deadline: start + 18, done: false, late: false };
  }
  seat(id) { return this.seats.find((seat) => seat.id === id); }
  get caught() { return this.seats.filter((seat) => seat.caught).length; }
  liveRequests() { return this.requests.filter((request) => this.time >= request.start && !request.done); }
  requestFor(id) { return this.liveRequests().find((request) => request.id === id); }
  behavior(seat) {
    if (seat.caught) return { pose: 'exit', text: '부정행위를 확인해 퇴실했다.' };
    if (this.requestFor(seat.id)) return { pose: 'hand', text: '손을 들고 감독관의 도움을 기다리고 있다.' };
    if (seat.guilty && this.time >= seat.first) {
      const phase = (this.time - seat.first) % seat.period;
      if (phase < 2) return { pose: seat.kind, text: TYPES[seat.kind].cue };
      if (phase < 8) return { pose: 'proof-' + seat.kind, text: TYPES[seat.kind].proof };
    }
    if (!seat.guilty) {
      const phase = (this.time + seat.offset) % 32;
      if (phase >= 25 && phase < 29) return ordinary[seat.ordinary];
    }
    return { pose: 'write', text: '지문을 읽으며 연필로 답을 쓰고 있다.' };
  }
  report(id) {
    const seat = this.seat(id);
    if (this.over || !seat || seat.caught || seat.cleared) return null;
    // Players make the judgment. No evidence menu or animation-frame timing requirement.
    if (seat.guilty) {
      seat.caught = true;
      seat.exitAt = this.time;
      this.events.push({ id, time: this.time, text: TYPES[seat.kind].name + ' 적발' });
      return { correct: true, text: seatNo(id) + '번 · ' + TYPES[seat.kind].name + ' 적발!' };
    }
    seat.cleared = true;
    this.falseCalls++;
    this.damage('오인 신고', id);
    return { correct: false, text: seatNo(id) + '번은 정상 학생이에요. 오인 신고 · 생명 −1' };
  }
  damage(reason, id) {
    if (this.over) return;
    this.health = Math.max(0, this.health - 1);
    this.events.push({ id, time: this.time, text: reason + ' · 생명 −1' });
    if (this.health === 0) {
      this.over = true;
      this.reason = 'health';
    }
  }
  serve(id) {
    const request = this.requestFor(id);
    if (this.over || !request) return false;
    request.done = true;
    if (request.type === 'curtain') this.curtain = true;
    this.events.push({ id, time: this.time, text: request.type === 'paper' ? '새 답안지 전달' : '커튼 조정' });
    return true;
  }
  step(dt) {
    if (this.over) return;
    this.time = Math.min(this.duration, this.time + Math.max(0, dt));
    for (const request of this.liveRequests()) {
      if (!request.late && this.time >= request.deadline && !this.over) {
        request.late = true;
        this.complaints.push({ id: request.id, time: this.time });
        this.damage('요청 지연 민원', request.id);
      }
    }
    if (!this.over && this.time >= this.duration) {
      this.over = true;
      this.reason = this.seats.some((seat) => seat.guilty && !seat.caught) ? 'missed' : 'win';
    }
  }
  result() {
    return {
      version: 2, seed: this.seed, date: Date.now(), reason: this.reason,
      health: this.health, caught: this.caught, falseCalls: this.falseCalls,
      complaints: this.complaints.length, served: this.requests.filter((request) => request.done).length,
      missed: this.seats.filter((seat) => seat.guilty && !seat.caught).map((seat) => ({ id: seat.id, kind: seat.kind })),
    };
  }
}
