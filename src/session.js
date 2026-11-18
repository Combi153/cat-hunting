import { STAGES, stageNumber } from './stages.js';
export const TYPES = {
  glasses: {
    name: 'AI 안경',
    taunt: '히히… 안경 속 정답을 못 봤지?',
    cue: '안경다리를 잡고 렌즈를 들여다봤다.',
    proof: '벗어 든 안경 안쪽에 문항 번호가 바뀌는 화면이 보였다.',
    clear: '고개가 움직이자 렌즈의 창틀 반사도 함께 움직였다.',
  },
  ear: {
    name: '초소형 이어폰',
    taunt: '히히… 정답이 귀에 쏙쏙!',
    cue: '한쪽 귀에 손을 가져갔다.',
    proof: '귀에서 꺼낸 이어폰 옆에 열린 충전 케이스가 보인다.',
    clear: '손으로 머리카락을 귀 뒤로 넘기고 다시 필기했다.',
  },
  camera: {
    name: '소형 카메라',
    taunt: '히히… 시험지 사진은 내 거!',
    cue: '작은 물건을 시험지 가까이 가져갔다.',
    proof: '물건 뒷면 화면에 방금 찍은 시험지 사진이 떠 있었다.',
    clear: '지우개로 연필 밑줄을 지우고 가루를 털어냈다.',
  },
  note: {
    name: '쪽지',
    taunt: '히히… 쪽지 덕에 다 풀었지!',
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
  constructor(seed = Math.floor(Math.random() * 4294967296), stage = 1) {
    this.stage = stageNumber(stage);
    this.rules = STAGES[this.stage - 1];
    this.watching = null;
    this.watchTime = 0;
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
    const xs = [-2.25, 0, 2.25];
    const zs = [2.4, 0.1, -2.2, -4.5];
    this.seats = zs.flatMap((z, row) =>
      xs.map((x, col) => ({
        id: row * xs.length + col + 1,
        x,
        z,
        kind: Object.keys(TYPES)[Math.floor(random() * 4)],
        guilty: false,
        caught: false,
        cleared: false,
        exitAt: null,
        first: 7 + random() * 12,
        period: this.rules.cycle + random() * 3,
        ordinary: Math.floor(random() * ordinary.length),
        offset: random() * 8,
      })),
    );
    const devices = shuffled(this.rules.kinds, random);
    for (const [wave, row] of shuffled([0, 1, 2, 3], random).slice(0, this.rules.culprits).entries()) {
      const culprit = this.seats[row * xs.length + Math.floor(random() * xs.length)];
      culprit.guilty = true;
      culprit.kind = devices[wave % devices.length];
      culprit.first = [5, 22, 39, 52][wave] + random() * 3;
    }
    const normal = shuffled(
      this.seats.filter((seat) => !seat.guilty),
      random,
    );
    for (const seat of normal) seat.mimic = random() < this.rules.mimics;
    for (const seat of shuffled(this.seats, random).slice(0, this.rules.sensitive)) seat.sensitive = true;
    this.requests = this.rules.requests.map((start, i) =>
      this.newRequest(normal[i], i === 1 ? 'curtain' : 'paper', start),
    );
  }
  newRequest(seat, type, start) {
    return { id: seat.id, type, start, deadline: start + this.rules.deadline, done: false, late: false };
  }
  observe(id, dt) {
    if (this.over) return;
    if (this.watching !== id) {
      this.watching = id;
      this.watchTime = 0;
    }
    const seat = this.seat(id);
    if (!seat || seat.caught || this.requestFor(id)) {
      this.watchTime = 0;
      return;
    }
    this.watchTime += Math.max(0, dt);
    if (seat.sensitive && !seat.pressured && this.watchTime >= this.rules.patience) {
      seat.pressured = true;
      this.complaints.push({ id, time: this.time, reason: 'observation' });
      this.damage('오랜 관찰로 인한 민원', id);
    }
  }
  watchWarning(id) {
    const seat = this.seat(id);
    return (
      this.watching === id &&
      seat?.sensitive === true &&
      !seat.pressured &&
      !this.requestFor(id) &&
      this.watchTime >= this.rules.patience - 3
    );
  }
  observationText(id) {
    if (this.watchWarning(id)) return '“선생님… 계속 보고 계시면 집중하기 어려워요.”';
    const seat = this.seat(id),
      behavior = this.behavior(seat);
    if (this.stage > 1 && this.watchTime < 0.9 && /^(proof|clear)-/.test(behavior.pose))
      return TYPES[seat.kind].cue;
    return behavior.text;
  }
  seat(id) {
    return this.seats.find((seat) => seat.id === id);
  }
  get caught() {
    return this.seats.filter((seat) => seat.caught).length;
  }
  liveRequests() {
    return this.requests.filter((request) => this.time >= request.start && !request.done);
  }
  requestFor(id) {
    return this.liveRequests().find((request) => request.id === id);
  }
  behavior(seat) {
    if (seat.caught) return { pose: 'exit', text: '부정행위를 확인해 퇴실했다.' };
    if (this.requestFor(seat.id)) return { pose: 'hand', text: '손을 들고 감독관의 도움을 기다리고 있다.' };
    if (this.rules.hide && this.watching === seat.id && this.watchTime < this.rules.hide)
      return { pose: 'write', text: '감독관을 보더니 손을 멈추고 시험지로 시선을 돌렸다.' };
    if (seat.guilty && this.time >= seat.first) {
      if (this.rules.grace && this.time >= this.duration - this.rules.grace)
        return { pose: 'proof-' + seat.kind, text: TYPES[seat.kind].proof };
      const phase = (this.time - seat.first) % seat.period;
      if (phase < 2) return { pose: seat.kind, text: TYPES[seat.kind].cue };
      if (phase < 2 + this.rules.proof) return { pose: 'proof-' + seat.kind, text: TYPES[seat.kind].proof };
    }
    if (seat.cleared) return { pose: 'write', text: '눈가를 붉힌 채, 말없이 답안지를 채우고 있다.' };
    if (!seat.guilty) {
      if (seat.mimic) {
        const phase = (this.time + seat.offset) % seat.period;
        if (phase < 2) return { pose: seat.kind, text: TYPES[seat.kind].cue };
        if (phase < 2 + this.rules.proof) return { pose: 'clear-' + seat.kind, text: TYPES[seat.kind].clear };
      }
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
    seat.accusedAt = this.time;
    this.falseCalls++;
    this.damage('오인 신고', id);
    return { correct: false, text: '“저는 그냥 문제를 풀고 있었는데…” 잘못 짚었어요.' };
  }
  damage(reason, id) {
    if (this.over) return;
    this.health = Math.max(0, this.health - 1);
    this.events.push({ id, time: this.time, text: reason });
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
    this.events.push({
      id,
      time: this.time,
      text: request.type === 'paper' ? '새 답안지 전달' : '커튼 조정',
    });
    return true;
  }
  step(dt) {
    if (this.over) return;
    this.time = Math.min(this.duration, this.time + Math.max(0, dt));
    for (const request of this.liveRequests()) {
      if (!request.helping && !request.late && this.time >= request.deadline && !this.over) {
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
      version: 2,
      stage: this.stage,
      seed: this.seed,
      date: Date.now(),
      reason: this.reason,
      health: this.health,
      caught: this.caught,
      falseCalls: this.falseCalls,
      complaints: this.complaints.length,
      served: this.requests.filter((request) => request.done).length,
      missed: this.seats
        .filter((seat) => seat.guilty && !seat.caught)
        .map((seat) => ({ id: seat.id, kind: seat.kind })),
    };
  }
}
