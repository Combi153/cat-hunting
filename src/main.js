import './style.css';
import { Exam, MODES, TYPES, DESK, WINDOW, clock, seatNo } from './session.js';
import * as ui from './ui.js';
import { activateSound, bell, soundsForFrame } from './sound.js';
const $ = (s) => document.querySelector(s);
const lobby = $('#lobby'),
  play = $('#play'),
  overlay = $('#overlay'),
  canvas = $('#room');
const storageKey = 'nyangijapgi.v1';
function load() {
  try {
    const data = JSON.parse(localStorage.getItem(storageKey)) || {};
    return {
      history: (Array.isArray(data.history) ? data.history : [])
        .filter(
          (r) =>
            MODES[r?.mode] &&
            Array.isArray(r.seats) &&
            Array.isArray(r.log) &&
            Array.isArray(r.complaints) &&
            r.seats.every((s) => TYPES[s.kind]),
        )
        .slice(0, 10),
      best: data.best || {},
      muted: data.muted === true,
    };
  } catch {
    return { history: [], best: {}, muted: false };
  }
}
const saved = load();
const save = () => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(saved));
  } catch {
    /* A session still works without browser storage. */
  }
};
let mode = 'exam',
  screen = 'home',
  panel = '',
  room,
  exam,
  roundResult,
  currentResult,
  returnFromHelp = '',
  loading = false;
let selectedSeat = 1,
  selectedKind = '',
  selectedNote = '',
  previous = 0,
  hudElapsed = 0,
  displayedTime = -1,
  noticeTime = 0,
  priorComplaint = 0,
  drag = null,
  stickPointer = null;
function renderHome() {
  lobby.innerHTML = ui.lobby(mode, saved.history, saved.muted);
}
function home() {
  screen = 'home';
  roundResult = null;
  currentResult = null;
  panel = '';
  overlay.hidden = true;
  play.hidden = true;
  lobby.hidden = false;
  play.classList.remove('replay-mode');
  room?.resetInput();
  renderHome();
}
function notice(message) {
  $('#notice').textContent = message;
  noticeTime = performance.now() + 3200;
}
function modal(name, content, closable = true) {
  const same = panel === name && !overlay.hidden,
    scroll = same ? (overlay.querySelector('.modal')?.scrollTop ?? 0) : 0;
  panel = name;
  room?.resetInput();
  overlay.hidden = false;
  overlay.innerHTML =
    '<section class="modal" role="dialog" aria-modal="true" aria-label="' +
    ({
      help: '감독관 수첩',
      history: '감독 기록',
      result: '시험 종료 보고서',
      journal: '감독 일지',
      pause: '일시정지',
      leave: '시험 중단 확인',
      error: '실행 안내',
    }[name] || '안내') +
    '">' +
    (closable
      ? '<button class="close-x" data-action="close" aria-label="닫기">' + ui.icon('x', 17) + '</button>'
      : '') +
    content +
    '</section>';
  overlay.querySelector('.modal').scrollTop = scroll;
  if (!same) overlay.querySelector('button,select,summary')?.focus({ preventScroll: true });
}
function dismiss() {
  panel = '';
  overlay.hidden = true;
  previous = performance.now();
  room?.resetInput();
  if (screen === 'running') updateHUD();
}
function openHelp() {
  returnFromHelp = panel;
  modal('help', ui.help());
}
function openPause() {
  modal(
    'pause',
    '<div class="modal-icon">' +
      ui.icon('pause') +
      '</div><h2>잠시 멈춤</h2><p class="intro">남은 시험 시간 ' +
      clock(exam.duration - exam.time) +
      '</p><div class="stack"><button class="primary" data-action="resume">감독 계속하기</button><button class="secondary" data-action="help">조작 방법</button><button class="secondary" data-action="sound">' +
      (saved.muted ? '소리 켜기' : '소리 끄기') +
      '</button><button class="secondary" data-action="leave">시험 중단</button></div>',
  );
}
function openHistory() {
  modal(
    'history',
    '<div class="eyebrow">이 브라우저의 기록</div><h2>감독 일지</h2><p class="intro">최근 마친 시험을 다시 열어볼 수 있습니다.</p>' +
      (saved.history.length
        ? saved.history
            .map(
              (r, i) =>
                '<button class="history-row" data-history="' +
                i +
                '"><b>' +
                MODES[r.mode].name +
                '</b><small>' +
                new Date(r.date).toLocaleString('ko-KR', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }) +
                '</small><strong>' +
                r.score +
                '점</strong>' +
                ui.icon('arrow', 15) +
                '</button>',
            )
            .join('')
        : '<div class="empty">아직 마친 시험이 없습니다.</div>'),
  );
}
async function start() {
  if (loading) return;
  loading = true;
  const startBtn = $('.start-btn');
  if (startBtn) {
    startBtn.disabled = true;
    startBtn.textContent = '시험실 준비 중…';
  }
  if (!saved.muted) activateSound();
  try {
    const { Room } = await import('./world.js');
    lobby.hidden = true;
    play.hidden = false;
    overlay.hidden = true;
    if (!room) room = new Room(canvas);
    exam = new Exam(mode);
    room.resize();
    room.reset(exam);
    screen = 'running';
    panel = '';
    roundResult = null;
    currentResult = null;
    priorComplaint = 0;
    displayedTime = -1;
    $('#hud').innerHTML = ui.hudTop(mode, saved.muted);
    $('#notice').textContent = '';
    play.classList.remove('replay-mode');
    previous = performance.now();
    updateHUD();
    if (!saved.muted) bell();
    notice('시험 시작 · 학생 옆으로 걸어가 E로 관찰하세요.');
  } catch (err) {
    console.error(err);
    home();
    modal(
      'error',
      '<h2>시험실을 열 수 없습니다</h2><p class="intro">3D 화면을 준비하지 못했습니다. 브라우저의 그래픽 가속을 켠 뒤 다시 시도해 주세요.</p><button class="primary wide" data-action="close">확인</button>',
    );
  } finally {
    loading = false;
  }
}
function finish() {
  screen = 'ended';
  room.resetInput();
  roundResult = exam.result();
  currentResult = roundResult;
  saved.history.unshift(roundResult);
  saved.history = saved.history.slice(0, 10);
  saved.best[mode] = Math.max(Number(saved.best[mode]) || 0, roundResult.score);
  save();
  if (!saved.muted) bell();
  showResult(roundResult);
}
function showResult(r) {
  currentResult = r;
  modal(
    'result',
    ui.result(r, Math.max(Number(saved.best[r.mode]) || 0, r.score), r === roundResult && screen === 'ended'),
    false,
  );
}
function openJournal(id = room.focus || selectedSeat) {
  if (!exam.seat(id)) id = 1;
  selectedSeat = id;
  selectedKind = '';
  selectedNote = exam.seat(id).notes.at(-1)?.key ?? '';
  paintJournal();
}
function paintJournal() {
  modal('journal', ui.journal(exam, selectedSeat, selectedKind, selectedNote));
}
function close() {
  if (panel === 'help' && returnFromHelp === 'pause') {
    returnFromHelp = '';
    openPause();
    return;
  }
  if (panel === 'leave') {
    openPause();
    return;
  }
  if (panel === 'result') {
    if (screen === 'home') openHistory();
    else return;
    return;
  }
  dismiss();
}
function focusSeat(id) {
  const s = exam.seat(id);
  if (!s || s.caught) return;
  room.focus = id;
  selectedSeat = id;
  room.resetInput();
  updateHUD();
}
function clueFor(s) {
  const req = exam.requestFor(s.id);
  if (req && (!req.ack || exam.time > req.deadline - 6))
    return { key: 'request', text: '필기를 멈추고 감독관에게 손을 들었다.' };
  return exam.view(s, room.side(s));
}
function record() {
  const s = exam.seat(room.focus);
  if (!s) return;
  const clue = clueFor(s);
  if (exam.record(s, clue)) {
    notice(seatNo(s.id) + '번 · 감독 일지에 기록했습니다.');
    updateHUD();
  }
}
function serviceObject() {
  const reqs = exam.liveRequests();
  if (reqs.some((r) => r.type === 'paper' && r.ack) && !exam.carrying && room.nearbyAction('desk', DESK))
    return 'desk';
  if (reqs.some((r) => r.type === 'curtain' && r.ack) && room.nearbyAction('window', WINDOW)) return 'window';
  return null;
}
function useObject(type) {
  if (type === 'desk' && room.nearbyAction('desk', DESK) && exam.takePaper())
    notice('새 답안지를 챙겼습니다. 요청한 학생에게 전달하세요.');
  if (type === 'window' && room.nearbyAction('window', WINDOW)) {
    const r = exam.liveRequests().find((r) => r.type === 'curtain');
    if (r && exam.serve(r)) notice('커튼을 닫았습니다. 학생이 다시 시험에 집중합니다.');
  }
  updateHUD();
}
function interact() {
  if (room.focus) {
    room.focus = null;
    updateHUD();
    return;
  }
  const obj = serviceObject();
  if (obj) {
    useObject(obj);
    return;
  }
  const target = room.target();
  if (target?.type === 'seat') focusSeat(target.id);
  else if (target && target.type !== 'seat') useObject(target.type);
  else notice('학생에게 조금 더 가까이 다가가서 바라보세요.');
}
function respond() {
  const req = exam.requestFor(room.focus);
  if (!req) return;
  if (!req.ack) {
    exam.acknowledge(req);
    notice('기다려 달라는 뜻으로 고개를 끄덕였습니다.');
  } else if (req.type === 'paper' && exam.carrying && exam.serve(req)) notice('새 답안지를 전달했습니다.');
  updateHUD();
}
function put(selector, html) {
  const el = $(selector);
  if (el && el._body !== html) {
    el.innerHTML = html;
    el._body = html;
  }
}
function updateHUD() {
  if (screen !== 'running') return;
  const left = Math.ceil(exam.duration - exam.time);
  if (left !== displayedTime) {
    displayedTime = left;
    $('#time').textContent = clock(left);
    $('#time').parentElement.classList.toggle('urgent', left <= 15);
  }
  put(
    '#tasks',
    exam
      .liveRequests()
      .map(
        (r) =>
          '<div class="task-card ' +
          (r.late ? 'late' : '') +
          '"><b>' +
          ui.icon('hand', 14) +
          seatNo(r.id) +
          '번 · ' +
          (r.ack ? ui.requestName(r) : '손을 든 학생') +
          '</b><small>' +
          (r.ack
            ? r.type === 'paper'
              ? exam.carrying
                ? '새 답안지를 학생에게 건네세요.'
                : '칠판 앞 교탁에서 답안지를 받으세요.'
              : '창가 통로 가운데에서 커튼을 닫으세요.'
            : '학생 곁에서 관찰해 요청을 확인하세요.') +
          '</small></div>',
      )
      .join(''),
  );
  const noisy = exam.seats.filter((s) => !s.caught && s.noise > 4.5).sort((a, b) => b.noise - a.noise)[0];
  put(
    '#feedback',
    noisy
      ? '<div class="feedback-note">' +
          ui.icon('foot', 14) +
          seatNo(noisy.id) +
          '번이 발소리에 펜을 멈췄습니다.</div>'
      : '',
  );
  const s = exam.seat(room.focus);
  if (s && !s.caught) {
    const clue = clueFor(s),
      req = exam.requestFor(s.id),
      exists = s.notes.some((n) => n.key === clue.key);
    const tip = !room.side(s) ? '<small>책상 옆으로 한두 걸음 비켜서면 손이 잘 보입니다.</small>' : '';
    put(
      '#context',
      '<div class="focus-card"><div class="focus-title">' +
        ui.icon('eye', 16) +
        seatNo(s.id) +
        '번 좌석 · 관찰 중<button data-action="unfocus" aria-label="관찰 끝내기">' +
        ui.icon('x', 16) +
        '</button></div><p>' +
        clue.text +
        '</p>' +
        tip +
        (req ? '<small>학생 요청 · ' + ui.requestName(req) + '</small>' : '') +
        '<div class="actions"><button class="em" data-action="record" ' +
        (exists ? 'disabled' : '') +
        '>' +
        (exists ? '기록됨' : 'F · 행동 기록') +
        '</button>' +
        (req && (!req.ack || (req.type === 'paper' && exam.carrying))
          ? '<button data-action="respond">' + (req.ack ? '답안지 건네기' : '고개 끄덕이기') + '</button>'
          : '') +
        '<button data-action="journal">감독 일지</button></div></div>',
    );
  } else {
    const object = serviceObject(),
      target = room.target();
    const label =
      object === 'desk'
        ? '새 답안지 챙기기'
        : object === 'window'
          ? '커튼 닫기'
          : target?.type === 'seat'
            ? seatNo(target.id) + '번 좌석 관찰'
            : '';
    put(
      '#context',
      label ? '<button class="near" data-action="action"><kbd>E</kbd>' + label + '</button>' : '',
    );
  }
  put(
    '#hints',
    '<div class="hints"><span><kbd>WASD</kbd> 이동</span><span>드래그 · 시선</span><span><kbd>Shift</kbd> 조용히</span><span><kbd>Tab</kbd> 일지</span></div>',
  );
  const quietBtn = $('#touch [data-action="quiet"]');
  quietBtn.setAttribute('aria-pressed', String(room.touchQuiet));
}
function enterReplay(id) {
  if (!roundResult || !exam.seat(id)) return;
  screen = 'replay';
  dismiss();
  room.focus = null;
  room.replay = { id, phase: 'cue', time: 0 };
  play.classList.add('replay-mode');
  $('#hud').innerHTML = '<div id="context"></div>';
  $('#notice').textContent = '';
  room.updateCamera(1, true);
  paintReplay();
}
function paintReplay() {
  const re = room.replay,
    s = exam.seat(re.id),
    detail = re.phase === 'detail';
  put(
    '#context',
    '<div class="replay-bar"><small>' +
      seatNo(s.id) +
      '번 좌석 · ' +
      (detail ? '두 번째 장면' : '첫 번째 장면') +
      '</small><b>' +
      TYPES[s.kind][detail ? (s.guilty ? 'proof' : 'clear') : 'cue'] +
      '</b><div><button class="secondary" data-action="replay-switch">' +
      (detail ? '첫 장면' : '후속 행동') +
      '</button> <button class="secondary" data-action="report">보고서로</button></div></div>',
  );
}
function tick(now) {
  const dt = Math.min(2, Math.max(0, (now - previous) / 1000));
  previous = now;
  if (noticeTime && now > noticeTime) {
    $('#notice').textContent = '';
    noticeTime = 0;
  }
  if (screen === 'running' && (!panel || panel === 'journal')) {
    const step = panel ? { meters: 0, quiet: false } : room.move(Math.min(dt, 0.12));
    exam.step(dt, room.player, step.meters, step.quiet);
    if (priorComplaint < exam.complaints.length) {
      const c = exam.complaints.at(-1);
      notice('민원 접수 · ' + seatNo(c.id) + '번 ' + c.text);
      priorComplaint = exam.complaints.length;
    }
    if (!saved.muted) soundsForFrame(exam.time, step.meters > 0.001, step.quiet);
    if (!panel) room.draw(Math.min(dt, 0.15), step.meters, step.quiet);
    hudElapsed += dt;
    if (hudElapsed > 0.11) {
      updateHUD();
      hudElapsed = 0;
    }
    if (exam.over) finish();
  } else if (screen === 'replay') {
    room.replay.time += dt;
    room.draw(Math.min(dt, 0.15), 0, false);
  }
  requestAnimationFrame(tick);
}
function userAction(action) {
  if (action === 'start') return start();
  if (action === 'sound') {
    saved.muted = !saved.muted;
    if (!saved.muted) activateSound();
    save();
    if (screen === 'home') renderHome();
    else if (panel === 'pause') openPause();
    return;
  }
  if (action === 'help') return openHelp();
  if (action === 'history') return openHistory();
  if (action === 'home') return home();
  if (action === 'close') return close();
  if (action === 'again') {
    mode = currentResult?.mode ?? mode;
    return start();
  }
  if (action === 'report') {
    room.replay = null;
    screen = 'ended';
    play.classList.remove('replay-mode');
    return showResult(roundResult);
  }
  if (action === 'replay-switch') {
    room.replay.phase = room.replay.phase === 'cue' ? 'detail' : 'cue';
    return paintReplay();
  }
  if (screen !== 'running') return;
  if (action === 'pause') return openPause();
  if (action === 'resume') return dismiss();
  if (action === 'leave')
    return modal(
      'leave',
      '<h2>시험을 중단할까요?</h2><p class="intro">이번 판의 기록은 저장되지 않습니다.</p><div class="modal-actions"><button class="secondary" data-action="resume">계속 감독</button><button class="primary" data-action="home">중단하기</button></div>',
    );
  if (action === 'journal') return openJournal();
  if (action === 'accuse') {
    const s = exam.seat(selectedSeat),
      ok = exam.accuse(s, selectedKind, selectedNote);
    if (ok === null) return;
    room.focus = null;
    dismiss();
    notice(seatNo(s.id) + '번 · ' + s.lastAction.text);
    updateHUD();
    return;
  }
  if (panel) return;
  if (action === 'quiet') {
    room.touchQuiet = !room.touchQuiet;
    updateHUD();
  }
  if (action === 'action') interact();
  if (action === 'unfocus') {
    room.focus = null;
    updateHUD();
  }
  if (action === 'record') record();
  if (action === 'respond') respond();
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b || b.disabled || (!overlay.hidden && !overlay.contains(b))) return;
  if (b.dataset.mode) {
    mode = b.dataset.mode;
    renderHome();
  } else if (b.dataset.seat) openJournal(Number(b.dataset.seat));
  else if (b.dataset.history !== undefined) showResult(saved.history[Number(b.dataset.history)]);
  else if (b.dataset.replay) enterReplay(Number(b.dataset.replay));
  else if (b.dataset.action) userAction(b.dataset.action);
});
overlay.addEventListener('change', (e) => {
  if (e.target.id === 'kind') selectedKind = e.target.value;
  else if (e.target.id === 'evidence') selectedNote = e.target.value;
  else return;
  paintJournal();
});
const moveKeys = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ShiftLeft',
  'ShiftRight',
  'KeyQ',
  'KeyR',
]);
document.addEventListener('keydown', (e) => {
  if (e.code === 'Escape') {
    if (screen === 'replay') userAction('report');
    else if (panel) close();
    else if (screen === 'running') openPause();
    return;
  }
  if (panel && e.code === 'Tab') {
    const focusable = [...overlay.querySelectorAll('button:not(:disabled),select,summary')].filter(
      (el) => el.getClientRects().length,
    );
    const first = focusable[0],
      last = focusable.at(-1);
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
    return;
  }
  if (screen !== 'running') return;
  if (e.code === 'Tab' && !panel) {
    e.preventDefault();
    if (!e.repeat) openJournal();
    return;
  }
  if (panel) return;
  if (moveKeys.has(e.code)) {
    e.preventDefault();
    room.keys.add(e.code);
  } else if (!e.repeat && e.code === 'KeyE') {
    e.preventDefault();
    interact();
  } else if (!e.repeat && e.code === 'KeyF') {
    e.preventDefault();
    record();
  }
});
document.addEventListener('keyup', (e) => room?.keys.delete(e.code));
document.addEventListener('visibilitychange', () => {
  if (document.hidden && screen === 'running' && (!panel || panel === 'journal')) openPause();
});
window.addEventListener('blur', () => room?.resetInput());
canvas.addEventListener('pointerdown', (e) => {
  if (panel || screen !== 'running') return;
  drag = { id: e.pointerId, x: e.clientX, y: e.clientY, total: 0 };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag || drag.id !== e.pointerId) return;
  const dx = e.clientX - drag.x,
    dy = e.clientY - drag.y;
  drag.total += Math.abs(dx) + Math.abs(dy);
  room.spin(dx, dy);
  drag.x = e.clientX;
  drag.y = e.clientY;
});
canvas.addEventListener('pointerup', (e) => {
  if (!drag || drag.id !== e.pointerId) return;
  if (drag.total < 7 && !panel && screen === 'running') {
    const id = room.pickSeat(e.clientX, e.clientY);
    if (id) focusSeat(id);
  }
  drag = null;
});
canvas.addEventListener('pointercancel', () => {
  drag = null;
});
const stick = $('#stick');
function stickMove(e) {
  const { x, y, width, height } = stick.getBoundingClientRect(),
    dx = (e.clientX - x - width / 2) / (width * 0.43),
    dy = (e.clientY - y - height / 2) / (height * 0.43),
    m = Math.max(1, Math.hypot(dx, dy));
  room.stick = { x: dx / m, y: dy / m };
  stick.firstElementChild.style.transform = 'translate(' + (dx / m) * 24 + 'px,' + (dy / m) * 24 + 'px)';
}
stick.addEventListener('pointerdown', (e) => {
  if (!panel && room) {
    stickPointer = e.pointerId;
    stick.setPointerCapture(e.pointerId);
    stickMove(e);
  }
});
stick.addEventListener('pointermove', (e) => {
  if (stickPointer === e.pointerId) stickMove(e);
});
for (const t of ['pointerup', 'pointercancel', 'lostpointercapture'])
  stick.addEventListener(t, () => {
    stickPointer = null;
    if (room) room.stick = { x: 0, y: 0 };
    stick.firstElementChild.style.transform = '';
  });
window.addEventListener('resize', () => {
  if (room && !play.hidden) room.resize();
});
home();
requestAnimationFrame(tick);
