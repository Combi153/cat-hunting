import './style.css';
import { Exam, clock, seatNo } from './session.js';
import { stageNumber, unlockStage } from './stages.js';
import * as ui from './ui.js';
import { activateSound, bell, reportSound, serviceSound, finale } from './sound.js';
import { createAnalytics, createGameAnalytics } from './analytics.js';
import { createEngagementAnalytics } from './engagement-analytics.js';
import { createResultSharing } from './share.js';
import { createRetryAllowance, RETRY_STORAGE_KEY } from './retries.js';

const track = createAnalytics({
  buildVersion: __BUILD_VERSION__,
  measurementId: import.meta.env.VITE_GA_MEASUREMENT_ID,
  enabled: import.meta.env.PROD || import.meta.env.VITE_GA_DEBUG === 'true',
  debug: import.meta.env.VITE_GA_DEBUG === 'true',
});
const gameAnalytics = createGameAnalytics(track);
const engagement = createEngagementAnalytics(track);

const $ = (selector) => document.querySelector(selector);
const retries = createRetryAllowance({
  getItem: key => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
});
const sharing = createResultSharing($('#share-dialog'), $('link[rel="canonical"]').href, $('#share-toast'), track,
  () => screen === 'ended' ? engagement.shareContext() : { share_placement: 'lobby' },
  (method, context) => {
    const allowance = retries.reward();
    track('retry_reward', { ...context, interaction_action: method, retry_remaining: allowance.remaining });
    refreshRetries();
  });
const storageKey = 'nyangijapgi.v2';
function load() {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey)) || {};
    const legacy = JSON.parse(localStorage.getItem('nyangijapgi.v1')) || {};
    return {
      history: (Array.isArray(value.history) ? value.history : [])
        .filter((round) => round?.version === 2 && ['win', 'health', 'missed'].includes(round.reason))
        .slice(0, 10),
      unlocked: stageNumber(value.unlocked ?? 1),
      completed: value.completed === true,
      muted: value.muted ?? legacy.muted === true,
    };
  } catch {
    return { history: [], muted: false, unlocked: 1, completed: false };
  }
}
const saved = load();
let selectedStage = saved.unlocked;
function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(saved));
  } catch {
    /* Play works without storage. */
  }
}
let room, exam;
let screen = 'home',
  loading = false,
  paused = false;
let previous = performance.now(),
  renderedAt = 0,
  toastUntil = 0;
let previousFocus = null,
  touchStart = null;
const motion = matchMedia('(prefers-reduced-motion: reduce)');
function refreshRetries() {
  if (screen === 'running') return;
  const root = screen === 'home' ? '#lobby' : '#ending';
  const { remaining } = retries.current();
  if ($(`${root} .retry-status`)) put(`${root} .retry-status`, ui.retryStatus(remaining));
  for (const button of document.querySelectorAll(`${root} [data-action=start], ${root} [data-action=advance]`))
    button.disabled = loading || remaining === 0;
}
function put(selector, content) {
  const element = $(selector);
  if (element._content !== content) {
    element.innerHTML = content;
    element._content = content;
  }
}
function home() {
  engagement.home();
  sharing.reset();
  if (screen === 'running') gameAnalytics.leave(exam);
  screen = 'home';
  paused = false;
  $('#overlay').hidden = true;
  $('#play').hidden = true;
  $('#lobby').hidden = false;
  put('#lobby', ui.lobby(saved, selectedStage, retries.current().remaining));
  refreshRetries();
}
function notice(text, hurt = false) {
  $('#notice').textContent = text;
  $('#notice').classList.toggle('hurt', hurt);
  $('#health').classList.toggle('damaged', hurt);
  toastUntil = performance.now() + 3600;
}
function modal(content) {
  previousFocus = document.activeElement;
  paused = true;
  $('#overlay').hidden = false;
  $('#overlay').innerHTML =
    '<section class="modal" role="dialog" aria-modal="true" aria-label="일시정지">' + content + '</section>';
  $('#overlay button')?.focus();
}
function pause() {
  if (screen !== 'running') return;
  modal(
    '<h2>잠시 쉬어가요</h2><p>남은 시간 ' +
      clock(exam.duration - exam.time) +
      '</p><div class="pause-rules"><p>잘못 신고하거나 민원이 생기면 생명이 줄어요.</p>' +
      '<p>도움 요청을 오래 기다리게 하거나 한 학생을 너무 오래 관찰하면 민원이 생길 수 있어요.</p></div>' +
      '<button class="primary" data-action="resume">계속 감독하기</button>' +
      '<button class="secondary" data-action="leave">시험 그만두기</button>',
  );
}
function resume() {
  paused = false;
  $('#overlay').hidden = true;
  previous = performance.now();
  if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
}
async function start(stage = selectedStage, source = 'lobby') {
  selectedStage = Math.min(saved.unlocked, stageNumber(stage));
  if (loading) return;
  if (retries.current().remaining === 0) {
    refreshRetries();
    $(`${screen === 'home' ? '#lobby' : '#ending'} [data-action=share]`)?.focus();
    return;
  }
  sharing.reset();
  loading = true;
  track('level_load', { level_name: `exam_${selectedStage}`, start_source: source });
  const button = document.activeElement;
  if (button?.tagName === 'BUTTON') button.disabled = true;
  if (!saved.muted) activateSound();
  try {
    const { Room } = await import('./world.js');
    // A different tab may have spent the final chance while the room loaded.
    if (retries.current().remaining === 0) return;
    const lastSeed = exam?.seed ?? saved.history[0]?.seed;
    const last = Number.isInteger(lastSeed)
      ? new Exam(lastSeed, exam?.stage ?? saved.history[0]?.stage ?? 1)
      : null;
    const signature = (round) =>
      round.seats
        .filter((seat) => seat.guilty)
        .map((seat) => seat.id)
        .join(',');
    exam = new Exam(undefined, selectedStage);
    // A fresh round visibly changes culprit seats, including after a reload.
    while (last && signature(last) === signature(exam)) exam = new Exam((exam.seed + 1) >>> 0, selectedStage);
    $('#lobby').hidden = true;
    $('#play').hidden = false;
    $('#overlay').hidden = true;
    $('#ending').hidden = true;
    $('#play').className = '';
    put('#play-header', ui.hud(exam.stage));
    if (!room) room = new Room($('#room'));
    room.resize();
    room.reset(exam);
    paused = false;
    screen = 'running';
    $('#notice').textContent = '';
    toastUntil = 0;
    previous = performance.now();
    render();
    if (!saved.muted) bell();
    gameAnalytics.start(exam, source, engagement.nextAttempt(exam.stage));
  } catch (error) {
    track('level_load_error', { level_name: `exam_${selectedStage}` });
    console.error(error);
    home();
    modal(
      '<h2>시험실을 열 수 없어요</h2><p>브라우저의 그래픽 가속을 확인한 뒤 다시 시도해 주세요.</p><button class="primary" data-action="home">돌아가기</button>',
    );
  } finally {
    loading = false;
    if (button?.isConnected && button.tagName === 'BUTTON') button.disabled = false;
    refreshRetries();
  }
}
function select(id) {
  if (screen !== 'running' || paused || exam.seat(id)?.caught) return;
  const previousSeat = room.focus;
  room.select(id);
  if (room.focus === id && previousSeat !== id) gameAnalytics.inspect(exam);
  render();
}
function next() {
  const index = exam.seats.findIndex((seat) => seat.id === room.focus);
  for (let offset = 1; offset <= exam.seats.length; offset++) {
    const seat = exam.seats[(index + offset) % exam.seats.length];
    if (!seat.caught) {
      select(seat.id);
      return;
    }
  }
}
function finish() {
  if (screen !== 'running') return;
  screen = 'ended';
  const result = exam.result();
  if (result.reason !== 'win') retries.fail();
  engagement.finish(exam, gameAnalytics.end(exam));
  saved.unlocked = unlockStage(saved.unlocked, result);
  if (result.reason === 'win' && result.stage === 5) saved.completed = true;
  saved.history.unshift(result);
  saved.history.length = Math.min(saved.history.length, 10);
  save();
  room.finish(result);
  paused = false;
  $('#overlay').hidden = true;
  $('#play').className = 'ended ' + (result.reason === 'win' ? 'win' : 'defeat');
  $('#ending').innerHTML = ui.ending(result, retries.current().remaining);
  refreshRetries();
  if (retries.current().remaining === 0)
    track('retry_exhausted', { ...engagement.shareContext(), retry_remaining: 0 });
  $('#ending').hidden = false;
  $('#ending button').focus({ preventScroll: true });
  $('#notice').textContent = '';
  if (!saved.muted) finale(result.reason === 'win');
}
function render() {
  if (screen !== 'running') return;
  put('#health', ui.hearts(exam.health));
  $('#time').textContent = clock(exam.duration - exam.time);
  $('#time').classList.toggle('urgent', exam.duration - exam.time <= 15);
  $('#play').classList.toggle('inspecting', Boolean(room.focus && !room.busy));
  $('#seat-targets').inert = Boolean(room.action);
  put('#controls', ui.inspection(exam, room.focus, room.busy));
  if (room.focus) {
    const request = exam.requestFor(room.focus);
    const speech = room.busy
      ? room.action
        ? room.action.request.type === 'curtain'
          ? room.path.length
            ? '창가로 이동 중'
            : '커튼 닫는 중'
          : '답안지 건네는 중'
        : ''
      : request
        ? request.type === 'paper'
          ? '“선생님, 답안지를 바꾸고 싶어요.”'
          : '“햇빛이 눈부셔요. 커튼 좀 닫아 주세요.”'
        : exam.observationText(room.focus);
    $('.clue').classList.toggle('concerned', !room.busy && exam.watchWarning(room.focus));
    if ($('.clue').textContent !== speech) $('.clue').textContent = speech;
  }
  put(
    '#seat-targets',
    exam.seats
      .map(
        (seat) =>
          '<button data-seat="' +
          seat.id +
          '" aria-label="' +
          seatNo(seat.id) +
          '번 학생 관찰" ' +
          (seat.caught ? 'disabled' : '') +
          '></button>',
      )
      .join(''),
  );
}
function act(action) {
  if (screen === 'ended' && !loading && ['start', 'advance', 'home', 'review', 'share', 'share-copy'].includes(action))
    engagement.action(({ start: 'retry', advance: 'advance', home: 'home', review: 'review', share: 'share', 'share-copy': 'copy' })[action]);
  if (action === 'start') return start(screen === 'ended' ? exam.stage : selectedStage, screen === 'ended' ? 'retry' : 'lobby');
  if (action === 'advance' && screen === 'ended' && exam.reason === 'win' && exam.stage < 5)
    return start(exam.stage + 1, 'advance');
  if (action === 'home') return home();
  if (action === 'share' && (screen === 'ended' || screen === 'home'))
    return sharing.share(screen === 'ended' ? exam.result() : null);
  if (screen === 'ended' && ['review', 'review-prev', 'review-next', 'review-close'].includes(action)) {
    if (action === 'review-close') {
      engagement.closeReview();
      room.closeReview();
      $('#play').classList.remove('reviewing');
      $('#ending').innerHTML = ui.ending(room.ending, retries.current().remaining);
      refreshRetries();
      $('#ending [data-action=review]')?.focus({ preventScroll: true });
    } else {
      const selection = room.review(action === 'review-prev' ? -1 : action === 'review-next' ? 1 : 0);
      if (!selection) return;
      engagement.review(selection, action === 'review' ? 'open' : 'navigate');
      $('#play').classList.add('reviewing');
      $('#ending').innerHTML = ui.review(selection);
      $(`#ending [data-action=${action === 'review' ? 'review-close' : action}]`)?.focus({ preventScroll: true });
    }
    room.resize();
    return;
  }
  if (action === 'sound') {
    saved.muted = !saved.muted;
    if (!saved.muted) activateSound();
    save();
    if (screen === 'home') home();
    else if (paused) pause();
    return;
  }
  if (screen !== 'running') return;
  if (action === 'resume') return resume();
  if (action === 'leave')
    return modal(
      '<h2>이번 시험을 그만둘까요?</h2><button class="primary" data-action="resume">계속 감독하기</button><button class="secondary" data-action="home">그만두기</button>',
    );
  if (paused) return;
  if (action === 'pause') return pause();
  if (action === 'overview') {
    room.overview();
    render();
    return;
  }
  if (action === 'next') return next();
  if (room.busy) return;
  if (action === 'report') {
    const outcome = exam.report(room.focus);
    if (!outcome) return;
    gameAnalytics.event('student_report', exam, { report_result: outcome.correct ? 'correct' : 'incorrect' });
    if (!saved.muted) reportSound(outcome.correct);
    notice(outcome.text, !outcome.correct);
    if (!exam.over) room.returnHome();
  }
  if (action === 'serve') room.help();
  render();
  if (exam.over) finish();
}
document.addEventListener('click', (event) => {
  const banner = event.target.closest('.sponsor-banner-link');
  if (banner && (screen === 'home' || screen === 'ended')) engagement.banner(screen === 'home' ? 'lobby' : 'result');
  const button = event.target.closest('button');
  if (!button || button.disabled || (paused && !$('#overlay').contains(button))) return;
  if (button.dataset.level && screen === 'home') {
    selectedStage = Math.min(saved.unlocked, stageNumber(button.dataset.level));
    home();
    return;
  }
  if (button.dataset.seat) select(Number(button.dataset.seat));
  else act(button.dataset.action);
});
document.addEventListener('keydown', (event) => {
  if (event.repeat) return;
  if (event.code === 'Escape' && screen === 'ended' && room.ending?.reviewIndex != null)
    act('review-close');
  if (event.code === 'Escape' && screen === 'running') {
    if (paused) resume();
    else if (room.focus) act('overview');
    else pause();
  }
  if (paused && event.code === 'Tab') {
    const buttons = [...$('#overlay').querySelectorAll('button:not(:disabled)')];
    if (
      (event.shiftKey && document.activeElement === buttons[0]) ||
      (!event.shiftKey && document.activeElement === buttons.at(-1))
    ) {
      event.preventDefault();
      (event.shiftKey ? buttons.at(-1) : buttons[0])?.focus();
    }
  }
});
const canvas = $('#room');
canvas.addEventListener('pointerdown', (event) => {
  if (screen !== 'running' || paused) return;
  touchStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointerup', (event) => {
  if (!touchStart || touchStart.id !== event.pointerId || paused || screen !== 'running') return;
  const dx = event.clientX - touchStart.x;
  if (room.focus && Math.abs(dx) > 45) next();
  else if (room.focus && !room.busy && Math.hypot(dx, event.clientY - touchStart.y) < 12) act('overview');
  else if ((!room.focus || room.busy) && Math.hypot(dx, event.clientY - touchStart.y) < 12) {
    const box = canvas.getBoundingClientRect();
    const candidate = exam.seats
      .filter((seat) => !seat.caught)
      .map((seat) => {
        const anchor = room.anchor(seat, 1.0);
        return {
          id: seat.id,
          distance: Math.hypot(
            event.clientX - box.x - (anchor.x * box.width) / 100,
            event.clientY - box.y - (anchor.y * box.height) / 100,
          ),
        };
      })
      .sort((a, b) => a.distance - b.distance)[0];
    if (candidate?.distance < 55) select(candidate.id);
  }
  touchStart = null;
});
canvas.addEventListener('pointercancel', () => {
  touchStart = null;
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) refreshRetries();
  engagement.visibility(!document.hidden);
  if (document.hidden && screen === 'running') gameAnalytics.event('level_background', exam);
  if (document.hidden && !paused) pause();
});
window.addEventListener('blur', () => {
  if (!paused) pause();
});
window.addEventListener('focus', refreshRetries);
window.addEventListener('storage', event => {
  if (event.key === RETRY_STORAGE_KEY || event.key === null) refreshRetries();
});
// Refresh an open lobby/result at midnight without interrupting an active exam.
setInterval(refreshRetries, 1000);
new ResizeObserver(() => {
  if (room && !$('#play').hidden) room.resize();
}).observe(canvas);
function tick(now) {
  const dt = Math.max(0, (now - previous) / 1000);
  previous = now;
  if (screen === 'running' && !paused) {
    const health = exam.health;
    const completed = room.step(Math.min(dt, exam.duration - exam.time));
    if (completed) {
      gameAnalytics.event('help_complete', exam, { help_type: completed.type });
      if (!saved.muted) serviceSound();
      notice('“고맙습니다, 선생님.”');
    }
    exam.step(dt);
    exam.observe(room.focus && !room.busy ? room.focus : null, dt);
    gameAnalytics.progress(exam);
    if (health > exam.health) {
      notice(
        exam.complaints.at(-1)?.reason === 'observation'
          ? '오래 지켜보던 학생이 집중하기 어렵다고 이야기해요.'
          : '기다리던 학생이 도움을 받지 못해 속상해해요.',
        true,
      );
      if (!saved.muted) reportSound(false);
    }
    if (now - renderedAt > 120) {
      render();
      renderedAt = now;
    }
    if (exam.over) finish();
  }
  if (room && (screen === 'running' || screen === 'ended') && !paused) {
    const stillEnding = motion.matches && room.ending && room.ending.reviewIndex == null;
    if (stillEnding) room.ending.elapsed = 0;
    room.draw(stillEnding ? 0 : Math.min(dt, 0.1), exam.time);
    if ((!room.focus || room.busy) && screen === 'running') {
      for (const button of $('#seat-targets').children) {
        const anchor = room.anchor(exam.seat(Number(button.dataset.seat)));
        button.style.left = anchor.x + '%';
        button.style.top = anchor.y + '%';
      }
    }
  }
  if (toastUntil && now > toastUntil) {
    $('#notice').textContent = '';
    $('#health')?.classList.remove('damaged');
    toastUntil = 0;
  }
  requestAnimationFrame(tick);
}
home();
requestAnimationFrame(tick);
