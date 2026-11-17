import './style.css';
import { Exam, TYPES, DESK, WINDOW, clock, seatNo } from './session.js';
import * as ui from './ui.js';
import { activateSound, bell, soundsForFrame, pencilSound } from './sound.js';
const $ = (s) => document.querySelector(s);
const lobby = $('#lobby'),
  play = $('#play'),
  overlay = $('#overlay'),
  canvas = $('#room');
const desktopMap = matchMedia('(min-width: 900px) and (min-height: 541px)');
const storageKey = 'nyangijapgi.v1';
function load() {
  try {
    const data = JSON.parse(localStorage.getItem(storageKey)) || {};
    return {
      history: (Array.isArray(data.history) ? data.history : [])
        .filter(
          (r) =>
            ['exam', 'practice'].includes(r?.mode) &&
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
let screen = 'home',
  panel = '',
  room,
  exam,
  roundResult,
  viewedReport,
  retryScore,
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
  lobby.innerHTML = ui.lobby(saved.history, saved.muted);
}
function home() {
  screen = 'home';
  roundResult = null;
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
  const focusedId = overlay.contains(document.activeElement) ? document.activeElement.id : '';
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
  if (same && focusedId) document.getElementById(focusedId)?.focus({ preventScroll: true });
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
                ui.reportName(r) +
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
async function start(retry) {
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
    play.classList.remove('replay-mode', 'observing');
    put('#context', '');
    $('#play-header').innerHTML = ui.hudTop();
    if (!room) room = new Room(canvas);
    exam = new Exam(retry?.seed);
    retryScore = retry?.score;
    selectedSeat = exam.pair[0];
    room.resize();
    room.reset(exam);
    screen = 'running';
    panel = '';
    roundResult = null;
    priorComplaint = 0;
    displayedTime = -1;
    $('#notice').textContent = '';
    previous = performance.now();
    updateHUD();
    if (!saved.muted) bell();

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
  if (Number.isFinite(retryScore)) roundResult.previousScore = retryScore;
  saved.history.unshift(roundResult);
  saved.history = saved.history.slice(0, 10);
  saved.best.exam = Math.max(Number(saved.best.exam) || 0, roundResult.score);
  save();
  if (!saved.muted) bell();
  showResult(roundResult);
}
function showResult(r) {
  viewedReport = r;
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
function walkToSeat(id) {
  const seat = exam.seat(id);
  if (!seat || seat.caught) return;
  if (panel) dismiss();
  room.focus = null;
  if (room.side(seat)) room.selectSeat(id);
  else if (!room.approachSeat(id)) notice('이동 패드로 옆 통로에 나와 주세요.');
  updateHUD();
}
function clueFor(s) {
  const req = exam.requestFor(s.id);
  if (req && (!req.ack || exam.time > req.deadline - 6))
    return { key: 'request', text: '필기를 멈추고 감독관에게 손을 들었다.' };
  return exam.view(s, room.side(s));
}
function record(clue) {
  const s = exam.seat(room.focus);
  if (!s) return;
  clue ??= clueFor(s);
  const before = exam.pairCount();
  if (exam.record(s, clue)) {
    const completed = before < 2 && exam.pairCount() === 2;
    if (!saved.muted) pencilSound(completed);
    notice((completed ? '두 자리 대조 완료! ' : '') + seatNo(s.id) + '번 ' + ui.clueLabel(clue.key) + ' 기록 · ' + clue.text);
    updateHUD();
  }
}
function serviceObject() {
  const reqs = exam.liveRequests();
  if (reqs.some((r) => r.type === 'paper' && r.ack) && !exam.carrying && room.withinReach(DESK))
    return 'desk';
  if (reqs.some((r) => r.type === 'curtain' && r.ack) && room.withinReach(WINDOW)) return 'window';
  return null;
}
function useObject(type) {
  if (type === 'desk' && room.withinReach(DESK) && exam.takePaper())
    notice('새 답안지를 챙겼습니다. 요청한 학생에게 전달하세요.');
  if (type === 'window' && room.withinReach(WINDOW)) {
    const r = exam.liveRequests().find((r) => r.type === 'curtain');
    if (r && exam.serve(r)) notice('커튼을 닫았습니다. 학생이 다시 시험에 집중합니다.');
  }
  updateHUD();
}
let shownAction = null;
let pressedAction = null;
function currentAction() {
  if (room.approach) return { type: 'stop', id: room.approach.id, place: room.approach.place, label: '이동 멈추기' };
  const target = room.target();
  if (!room.focus && !(target && target.id === room.pointedSeat)) {
    const obj = serviceObject();
    if (obj) return { type: obj, label: obj === 'desk' ? '답안지 챙기기' : '커튼 닫기' };
  }
  if (!target) return null;
  const id = target.id;
  const req = exam.requestFor(id);
  if (req && !req.ack) return { type: 'listen', id, label: '요청 듣기' };
  if (req?.type === 'paper' && exam.carrying) return { type: 'deliver', id, label: '답안지 건네기' };
  if (!room.focus) return { type: 'observe', id, label: '관찰하기' };
  const seat = exam.seat(id);
  const clue = clueFor(seat);
  if (seat.notes.some((note) => note.key === clue.key)) return { type: 'journal', id, label: '일지 열기' };
  return { type: 'record', id, clue, label: '행동 기록' };
}
function interact(prompt = shownAction) {
  // Capture the visible gesture on touch-down even when it changes before release.
  if (prompt?.type === 'record' && prompt.id === room.focus) {
    record(prompt.clue);
    return;
  }
  const action = currentAction();
  // A moving student or a new clue can change the prompt between touch-down and release.
  if (
    !action ||
    !prompt ||
    prompt.type !== action.type ||
    prompt.id !== action.id ||
    prompt.place !== action.place
  ) {
    updateHUD();
    return;
  }
  switch (action.type) {
    case 'stop':
      room.approach = null;
      break;
    case 'observe':
      focusSeat(action.id);
      break;
    case 'listen':
    case 'deliver':
      respond(action.id);
      break;
    case 'journal':
      return openJournal(action.id);
    default:
      useObject(action.type);
  }
  updateHUD();
}
function respond(id = room.focus) {
  const req = exam.requestFor(id);
  if (!req) return;
  if (!req.ack) {
    exam.acknowledge(req);
    notice(seatNo(id) + '번 요청 · ' + ui.requestName(req));
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
    exam.liveRequests().map((r) => {
      const station = r.ack && (r.type === 'curtain' ? 'window' : !exam.carrying && 'desk');
      const destination = station === 'window' ? '창가' : station === 'desk' ? '교탁' : seatNo(r.id) + '번';
      const instruction = !r.ack ? '가서 요청 듣기' : station === 'desk' ? '새 답안지 받기' :
        station === 'window' ? '커튼 닫기' : '새 답안지를 학생에게 건네세요.';
      return `<button class="task-card ${r.late ? 'late' : ''}" ${station ? 'data-station="' + station + '"' : 'data-walk="' + r.id + '"'}
        aria-label="${destination} 이동 · ${instruction}">
        <b>${ui.icon('hand', 14)} ${seatNo(r.id)}번 · ${r.ack ? ui.requestName(r) : '손을 든 학생'} <time data-deadline="${r.deadline}"></time></b>
        <small>${destination} · ${instruction} →</small></button>`;
    }).join(''),
  );
  for (const timer of $('#tasks').querySelectorAll('time')) {
    const seconds = Math.ceil(Number(timer.dataset.deadline) - exam.time);
    const label = seconds > 0 && !timer.closest('.late') ? seconds + '초' : '지연';
    if (timer.textContent !== label) timer.textContent = label;
  }
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
  put('#handover', ui.handover(exam));
  if (desktopMap.matches) put('#patrol-map', ui.patrolMap(exam, room.approach?.id ?? room.focus ?? room.pointedSeat));
  const s = exam.seat(room.focus);
  const observing = Boolean(s && !s.caught);
  play.classList.toggle('observing', observing);
  const marker = $('#target-marker');
  marker.hidden = true;
  const action = currentAction();
  shownAction = action;
  if (observing) {
    put(
      '#context',
      `<div class="focus-card">
      <div class="focus-title">${ui.icon('eye', 16)} ${seatNo(s.id)}번 좌석 · 관찰 중</div>
      <span class="phase-label"></span><p></p><small hidden>손이 가려지면 옆에서 다시 살펴보세요.</small></div>`,
    );
    const clue = clueFor(s);
    const recorded = s.notes.some((n) => n.key === clue.key);
    put('.focus-card p', clue.text);
    put('.phase-label', ui.clueLabel(clue.key) + (recorded ? ' · 기록됨 ✓' : ''));
    $('.focus-card small').hidden = room.side(s);
  } else {
    put('#context', '');
    const placeName = action?.place ?? action?.type;
    const place = { desk: DESK, window: WINDOW }[placeName];
    const target = place ?? exam.seat(action?.id);
    const height = placeName === 'desk' ? 1.05 : 1.58;
    const anchor = target && room.markerAt(target, height);
    if (anchor) {
      marker.hidden = false;
      marker.textContent = place ? (placeName === 'desk' ? '교탁' : '창가') : seatNo(action.id) + '번';
      marker.style.left = anchor.left + '%';
      marker.style.top = anchor.top + '%';
    }
  }
  const subject = action?.id
    ? seatNo(action.id) + '번 학생'
    : ({ desk: '교탁', window: '창가' }[action?.place ?? action?.type] ?? '상호작용');
  const label = action?.label ?? '다가가세요';
  put('#action-target', subject);
  put('#action-verb', label);
  const button = $('#touch-action');
  button.disabled = !action;
  button.setAttribute('aria-label', subject + ' · ' + label);
  put('#gait', { idle: '이동', quiet: '살금살금', walk: '보통 걸음' }[room.gait]);
  $('#stick').dataset.gait = room.gait;
}
function enterReplay(id) {
  if (!roundResult || !exam.seat(id)) return;
  screen = 'replay';
  dismiss();
  room.focus = null;
  room.replay = { id, phase: 'cue', time: 0 };
  play.classList.add('replay-mode');
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
  const dt = Math.max(0, (now - previous) / 1000);
  previous = now;
  if (noticeTime && now > noticeTime) {
    $('#notice').textContent = '';
    noticeTime = 0;
  }
  if (screen === 'running' && (!panel || panel === 'journal')) {
    const step = panel ? { meters: 0, quiet: false } : room.move(Math.min(dt, 2, exam.duration - exam.time));
    exam.step(dt, room.player, step.meters, step.quiet);
    if (step.arrived && !exam.over) {
      if (step.arrived.id) room.selectSeat(step.arrived.id);
      else room.yaw = Math.atan2(room.player.x - step.arrived.target.x, room.player.z - step.arrived.target.z);
    }
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
  if (action === 'again') return start();
  if (action === 'retry' && panel === 'result' && Number.isInteger(viewedReport?.seed)) return start(viewedReport);
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
  if (action === 'unfocus') {
    room.focus = null;
    updateHUD();
  }
}
$('#touch-action').addEventListener('pointerdown', () => {
  pressedAction = shownAction;
});
document.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b || b.disabled || (!overlay.hidden && !overlay.contains(b))) return;
  if (b.id === 'touch-action') {
    if (screen === 'running' && !panel) interact(e.detail ? pressedAction : shownAction);
    pressedAction = null;
  } else if (b.dataset.station && screen === 'running') {
    room.focus = null;
    if (!room.approachStation(b.dataset.station)) notice('이동 패드로 통로에 나와 주세요.');
    updateHUD();
  } else if (b.dataset.walk && screen === 'running') {
    walkToSeat(Number(b.dataset.walk));
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
    else if (screen === 'running' && room.focus) userAction('unfocus');
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
  if ((e.code === 'Digit1' || e.code === 'Digit2') && !e.repeat) {
    walkToSeat(exam.pair[e.code === 'Digit1' ? 0 : 1]);
    return;
  }
  if (moveKeys.has(e.code)) {
    e.preventDefault();
    room.keys.add(e.code);
  } else if (!e.repeat && e.code === 'KeyE') {
    e.preventDefault();
    interact();
  } else if (!e.repeat && e.code === 'KeyF') {
    e.preventDefault();
    record(shownAction?.type === 'record' ? shownAction.clue : undefined);
  }
});
document.addEventListener('keyup', (e) => room?.keys.delete(e.code));
document.addEventListener('visibilitychange', () => {
  if (document.hidden && screen === 'running' && (!panel || panel === 'journal')) openPause();
});
window.addEventListener('blur', () => room?.resetInput());
canvas.addEventListener('pointerdown', (e) => {
  if (panel || screen !== 'running' || room.focus || drag) return;
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
    if (id) {
      if (room.inObservationRange(id)) room.selectSeat(id);
      else if (!room.approachSeat(id)) notice('이동 패드로 통로에 나와 주세요.');
      updateHUD();
    }
  }
  drag = null;
});
canvas.addEventListener('pointercancel', () => {
  drag = null;
});
const stick = $('#stick');
function stickMove(e) {
  const { x, y, width, height } = stick.getBoundingClientRect(),
    dx = (e.clientX - x - width / 2) / (width * 0.38),
    dy = (e.clientY - y - height / 2) / (height * 0.38),
    m = Math.max(1, Math.hypot(dx, dy));
  room.stick = { x: dx / m, y: dy / m };
  stick.firstElementChild.style.transform =
    'translate(' + room.stick.x * width * 0.38 + 'px,' + room.stick.y * height * 0.38 + 'px)';
}
stick.addEventListener('pointerdown', (e) => {
  if (!panel && room && stickPointer === null) {
    stickPointer = e.pointerId;
    stick.setPointerCapture(e.pointerId);
    stickMove(e);
  }
});
stick.addEventListener('pointermove', (e) => {
  if (stickPointer === e.pointerId) stickMove(e);
});
for (const t of ['pointerup', 'pointercancel', 'lostpointercapture'])
  stick.addEventListener(t, (e) => {
    if (e.pointerId !== stickPointer) return;
    stickPointer = null;
    if (room) room.stick = { x: 0, y: 0 };
    stick.firstElementChild.style.transform = '';
  });
new ResizeObserver(() => {
  if (room && !play.hidden) room.resize();
}).observe(canvas);
home();
requestAnimationFrame(tick);
