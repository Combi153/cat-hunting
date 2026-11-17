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
export const MODES = {
  exam: { name: '본시험', duration: 180, count: 12 },
  practice: { name: '연습', duration: 60, count: 4 },
};
export const DESK = { x: 0, z: 4.55 };
export const WINDOW = { x: -4.85, z: -0.5 };
export const EXIT = { x: 4.75, z: -4.5 };
export const seatNo = (id) => String(id).padStart(2, '0');
export const clock = (seconds) => {
  const n = Math.max(0, Math.ceil(seconds));
  return String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');
};
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
function shuffled(list, random) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export class Exam {
  constructor(mode = 'exam', random = Math.random) {
    this.mode = mode;
    const practice = mode === 'practice';
    this.duration = MODES[mode].duration;
    this.time = 0;
    this.over = false;
    this.log = [];
    this.falseCalls = 0;
    this.complaints = [];
    this.carrying = false;
    this.curtain = false;
    const xs = practice ? [-1.15, 1.15] : [-3.38, -1.13, 1.13, 3.38];
    const zs = practice ? [1.35, -1.35] : [1.72, -0.88, -3.48];
    const kinds = shuffled(Object.keys(TYPES), random);
    this.seats = zs.flatMap((z, row) =>
      xs.map((x, col) => {
        const index = row * xs.length + col;
        return {
          id: index + 1,
          x,
          z,
          kind: practice ? 'glasses' : kinds[index % 4],
          guilty: false,
          notes: [],
          attempts: [],
          caught: false,
          exitAt: null,
          noise: 0,
          noiseOpen: false,
          offset: practice ? index * 1.65 : random() * 9,
          lastAction: null,
        };
      }),
    );
    const ordered = shuffled(this.seats, random);
    const count = practice ? 1 : 1 + Math.floor(random() * 3);
    if (practice) {
      ordered[2].kind = 'ear';
      ordered[3].kind = 'note';
    }
    ordered.slice(0, count).forEach((s) => (s.guilty = true));
    const neutral = ordered.filter((s) => !s.guilty);
    this.requests = [this.newRequest(neutral[0], 'paper', practice ? 6 : 16)];
    if (!practice) this.requests.push(this.newRequest(neutral[1], 'curtain', 76));
  }
  newRequest(seat, type, start) {
    return {
      id: seat.id,
      type,
      start,
      deadline: start + (this.mode === 'practice' ? 24 : 38),
      ack: false,
      done: false,
      late: false,
    };
  }
  add(text) {
    this.log.push({ t: Math.floor(this.time), text });
  }
  liveRequests() {
    return this.requests.filter((r) => r.start <= this.time && !r.done);
  }
  requestFor(id) {
    return this.liveRequests().find((r) => r.id === id);
  }
  seat(id) {
    return this.seats.find((s) => s.id === id);
  }
  stage(s) {
    const t = (this.time + s.offset) % 14;
    if (t < 4) return 'cue';
    if (t < 9.5) return 'detail';
    return 'write';
  }
  view(s, side) {
    if (!s || s.caught) return null;
    const stage = this.stage(s);
    if (stage === 'write') return { key: 'write', text: '시험지를 읽으며 답안지를 작성하고 있다.' };
    if (stage === 'cue' || !side) return { key: 'cue', text: TYPES[s.kind].cue };
    return { key: s.guilty ? 'proof' : 'clear', text: TYPES[s.kind][s.guilty ? 'proof' : 'clear'] };
  }
  record(s, clue) {
    if (this.over || !s || s.caught || !clue || s.notes.some((n) => n.key === clue.key)) return false;
    s.notes.push({ ...clue, t: Math.floor(this.time) });
    this.add(seatNo(s.id) + '번 관찰 기록 · ' + clue.text);
    return true;
  }
  accuse(s, type, key) {
    if (this.over || !s || s.caught || !Object.hasOwn(TYPES, type) || !s.notes.some((n) => n.key === key))
      return null;
    const attempt = type + '/' + key;
    if (s.attempts.includes(attempt)) return null;
    s.attempts.push(attempt);
    const correct = s.guilty && type === s.kind && key === 'proof';
    if (correct) {
      s.caught = true;
      s.exitAt = this.time;
    } else this.falseCalls++;
    const text = correct ? '근거 확인 · 퇴실 조치' : '지목 기각 · 오인 기록';
    s.lastAction = { t: Math.floor(this.time), text };
    this.add(seatNo(s.id) + '번 ' + text);
    return correct;
  }
  acknowledge(req) {
    if (this.over || !this.liveRequests().includes(req) || req.ack) return false;
    req.ack = true;
    req.deadline += this.mode === 'practice' ? 8 : 14;
    this.add(seatNo(req.id) + '번 요청에 고개를 끄덕였다.');
    return true;
  }
  takePaper() {
    if (this.over || this.carrying || !this.liveRequests().some((r) => r.type === 'paper' && r.ack))
      return false;
    this.carrying = true;
    this.add('교탁에서 새 답안지를 받았다.');
    return true;
  }
  serve(req) {
    if (
      this.over ||
      !this.liveRequests().includes(req) ||
      !req.ack ||
      (req.type === 'paper' && !this.carrying)
    )
      return false;
    req.done = true;
    if (req.type === 'paper') this.carrying = false;
    else this.curtain = true;
    this.add(seatNo(req.id) + '번 요청 처리 · ' + (req.type === 'paper' ? '새 답안지 전달' : '커튼 닫기'));
    return true;
  }
  complain(kind, id) {
    const text =
      kind === 'noise' ? '가까운 발소리로 시험에 집중하기 어렵습니다.' : '학생 요청 처리가 지연되었습니다.';
    this.complaints.push({ kind, id, t: Math.floor(this.time), text, resolved: false });
    this.add(seatNo(id) + '번 민원 · ' + text);
  }
  step(dt, player, meters, quiet) {
    if (this.over) return;
    this.time = Math.min(this.duration, this.time + dt);
    for (const r of this.liveRequests()) {
      if (!r.late && this.time >= r.deadline) {
        r.late = true;
        this.complain('delay', r.id);
      }
    }
    for (const s of this.seats) {
      if (s.caught) continue;
      const d = distance(s, player);
      const nearby = Math.max(0, 1 - d / 2.25);
      s.noise = Math.max(0, Math.min(12, s.noise + meters * nearby * (quiet ? 0.17 : 1.85) - dt * 0.38));
      if (s.noise >= 7 && !s.noiseOpen) {
        s.noiseOpen = true;
        this.complain('noise', s.id);
      }
      if (s.noiseOpen && s.noise < 2.4) {
        s.noiseOpen = false;
        const c = this.complaints.findLast((c) => c.kind === 'noise' && c.id === s.id);
        if (c) c.resolved = true;
        this.add(seatNo(s.id) + '번 발소리 민원 조치 완료');
      }
    }
    for (const c of this.complaints)
      if (c.kind === 'delay' && this.requests.some((r) => r.id === c.id && r.done)) c.resolved = true;
    if (this.time >= this.duration) this.over = true;
  }
  result() {
    const cases = this.seats.filter((s) => s.guilty);
    const caught = cases.filter((s) => s.caught).length;
    return {
      mode: this.mode,
      date: Date.now(),
      caught,
      total: cases.length,
      falseCalls: this.falseCalls,
      complaints: this.complaints.map((c) => ({ ...c })),
      served: this.requests.filter((r) => r.done).length,
      requests: this.requests.length,
      score: Math.max(
        0,
        100 - (cases.length - caught) * 15 - this.falseCalls * 20 - this.complaints.length * 8,
      ),
      log: [...this.log],
      seats: this.seats.map((s) => ({
        id: s.id,
        kind: s.kind,
        guilty: s.guilty,
        caught: s.caught,
        notes: s.notes,
        lastAction: s.lastAction,
      })),
    };
  }
}
