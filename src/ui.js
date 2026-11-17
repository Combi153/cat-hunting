import { TYPES, EXAM_DURATION, seatNo, clock, hasDetail } from './session.js';
const lines = {
  book: '<path d="M4 4h14a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2V4Zm4 0v16m3-11h6m-6 4h5"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  play: '<path d="m7 4 13 8-13 8z" fill="currentColor" stroke="none"/>',
  sound: '<path d="m11 5-5 4H3v6h3l5 4zM15 9a4 4 0 0 1 0 6m2-9a8 8 0 0 1 0 12"/>',
  mute: '<path d="m11 5-5 4H3v6h3l5 4zM16 9l5 6m0-6-5 6"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.6 2.6 0 1 1 3.4 2.4c-.8.4-.9.8-.9 2M12 16h.01"/>',
  clock: '<circle cx="12" cy="13" r="8.5"/><path d="M12 8v5l3 2M9 2h6"/>',
  seat: '<path d="M7 4h10v8H7zM5 14h14v3H5zM7 18v3m10-3v3"/>',
  school: '<path d="m3 10 9-7 9 7M5 10v10h14V10m-9 10v-6h4v6"/>',
  keys: '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M8 15h8"/>',
  mouse: '<rect x="6" y="2" width="12" height="20" rx="6"/><path d="M12 6v4"/>',
  check: '<path d="m4 12 5 5 11-12"/>',
  pause: '<path d="M8 5v14m8-14v14" stroke-width="3"/>',
  x: '<path d="m6 6 12 12m0-12L6 18"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="2.7"/>',
  paper: '<path d="M5 3h11l3 3v15H5zM9 10h6m-6 4h6"/>',
  foot: '<ellipse cx="9" cy="8" rx="3" ry="5" transform="rotate(-18 9 8)"/><circle cx="11" cy="16" r="1.6"/><ellipse cx="17" cy="13" rx="2.4" ry="4" transform="rotate(15 17 13)"/>',
  hand: '<path d="M6 12V7a1.5 1.5 0 0 1 3 0v4-6a1.5 1.5 0 0 1 3 0v6-7a1.5 1.5 0 0 1 3 0v7-5a1.5 1.5 0 0 1 3 0v8c0 5-3 7-6 7-2 0-4-1-5-3l-4-5c-1-2 1-3 2-2l3 2"/>',
  flag: '<path d="M5 21V3m0 1c5-4 9 4 15 0v9c-6 4-10-4-15 0"/>',
  pencil: '<path d="m4 16 11-11 4 4L8 20l-5 1zM13 7l4 4"/>',
  pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
};
export const icon = (name, size = 19) =>
  '<svg aria-hidden="true" width="' +
  size +
  '" height="' +
  size +
  '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
  lines[name] +
  '</svg>';
export const requestName = (r) => (r.type === 'paper' ? '답안지 교체' : '커튼 조정');
export const reportName = (r) => (r.mode === 'practice' ? '이전 1분 기록' : '시험 감독');
export function lobby(history, muted) {
  const last = history[0];
  return `<div class="lobby-wrap">
    <header class="topline"><div class="schoolbrand"><img src="/cat.svg" width="32" height="32" alt=""><span>감독관 수첩</span></div><nav>
      <button class="icon-btn" data-action="sound" aria-label="${muted ? '소리 켜기' : '소리 끄기'}">${icon(muted ? 'mute' : 'sound')}</button>
      <button class="icon-btn" data-action="help" aria-label="게임 방법">${icon('help')}</button></nav></header>
    <section class="cover">
      <div class="cover-art" role="img" aria-label="흰 클레이 교실에서 안경을 고쳐 쓰는 학생과 순회하는 감독관"></div>
      <div class="cover-copy"><div class="subject"><i></i>1교시 · 국어 영역</div>
      <h1>냥이잡기</h1><p class="lead">수능 시험이 시작됐어요.<br>교실을 걸으며 수상한 손동작을 찾아보세요.</p>
      <div class="room-strip"><span>${icon('clock', 16)} ${EXAM_DURATION / 60}분</span><span>${icon('seat', 16)} 12석</span></div>
      <button class="primary start-btn" data-action="start">${icon('play', 17)} 감독 시작 ${icon('arrow', 19)}</button>
      </div>
    </section>
    <section class="lobby-bottom"><div class="guide"><h2>${icon('hand')}첫 순회</h2><p>인계 메모의 자리 번호를 눌러 걸어가요. 오른쪽 A로 관찰하고, 두 학생의 다음 행동을 기록해 보세요.</p></div>
    <button class="record-link" data-action="history"><div><h2>${icon('book')}감독 일지</h2><small>${last ? '최근 ' + reportName(last) + ' · ' + last.score + '점' : '지난 시험 기록'}</small></div>${icon('arrow')}</button></section>
    </div>`;
}
export function hudTop() {
  return `<header class="hud-top"><div class="hud-id"><img src="/cat.svg" alt=""><div><b>냥이잡기</b><small>1교시 · 국어</small></div></div>
  <div class="timer" aria-label="남은 시간">${icon('clock', 18)}<strong id="time">${clock(EXAM_DURATION)}</strong></div>
  <div class="hud-tools"><button data-action="journal" aria-label="감독 일지">${icon('book')}</button><button data-action="pause" aria-label="일시정지">${icon('pause')}</button></div></header>`;
}
const sharedCues = {
  glasses: '두 학생이 안경다리를 만졌어요.',
  ear: '두 학생이 한쪽 귀에 손을 댔어요.',
  camera: '두 학생이 시험지에 물건을 댔어요.',
  note: '두 학생이 접힌 종이를 펼쳤어요.',
};
export const clueLabel = (key) => ({
  cue: '첫 동작', proof: '후속 행동', clear: '후속 행동', write: '필기', request: '손들기',
})[key];

export function handover(exam) {
  const count = exam.pairCount();
  const prompt = count < 2 ? sharedCues[exam.seat(exam.pair[0]).kind] + ' 다음 행동을 살펴보세요.' :
    exam.pair.some((id) => exam.seat(id).caught) ? '두 자리를 확인했어요. 남은 자리를 순회하세요.' : '두 자리의 후속 행동을 일지에서 비교하세요.';
  const desks = exam.pair.map((id) => {
    const recorded = hasDetail(exam.seat(id));
    return `<button data-walk="${id}" aria-label="${id}번 자리로 이동"${exam.seat(id).caught ? ' disabled' : ''}>${icon(recorded ? 'check' : 'pin', 14)}${seatNo(id)}번</button>`;
  }).join('');
  return `<section class="memo ${count === 2 ? 'complete' : ''}" aria-label="인계 메모">
    <div class="memo-heading"><b>${icon('pencil', 14)} 인계 메모</b><small>${count === 2 ? '대조 완료' : '후속 기록'} · ${count}/2</small></div>
    <p>${prompt}</p>
    <div class="memo-seats">${desks}</div></section>`;
}

// The front row is closest to the teacher's desk, as seen from the starting aisle.
export function patrolMap(exam, current) {
  const rows = [8, 4, 0];
  const desks = rows.flatMap((start) => exam.seats.slice(start, start + 4)).map((s) => {
    const state = s.caught ? '퇴실' : exam.requestFor(s.id) ? '요청' : hasDetail(s) ? '기록' : '';
    return `<button data-walk="${s.id}" class="${current === s.id ? 'current' : ''}"
      aria-label="${s.id}번 자리 ${state}" ${s.caught ? 'disabled' : ''}>
      ${seatNo(s.id)}${state ? `<small>${state}</small>` : ''}</button>`;
  }).join('');
  return `<nav aria-label="순회 좌석표"><h2>${icon('seat', 16)} 순회 좌석표</h2>
    <div class="floor-plan"><span class="window-side">창가</span><div class="desk-map">${desks}</div>
    <span class="teacher-side">교탁</span></div></nav>
    <p class="key-guide"><kbd>1</kbd><kbd>2</kbd> 메모 자리로 이동<br><kbd>E</kbd> 상호작용　<kbd>Tab</kbd> 일지</p>`;
}

export function help() {
  return `<div class="modal-icon">${icon('book', 23)}</div><h2>감독관이 하는 일</h2>
  <div class="help-lines"><p><b>걸으며 살피기</b><span>인계 메모의 두 자리는 첫 동작이 비슷해요. 자리 번호나 교실의 학생을 눌러 다가가고, 화면을 쓸어 둘러봐요. 직접 걸을 때는 왼쪽 패드의 안쪽 점선까지 밀면 살금살금, 바깥까지 밀면 보통 걸음이에요.</span></p>
  <p><b>관찰하고 기록하기</b><span>A 옆에 좌석 번호와 행동이 떠요. ‘관찰하기’에서 A를 누르면 손동작이 크게 보이고, ‘행동 기록’에서 누르면 그 순간이 일지에 남아요.</span></p>
  <p><b>근거로 지목하기</b><span>같은 행동을 기록하고 나면 A로 일지를 열 수 있어요. 근거와 의심 유형을 골라 제출해요. 오인 지목은 20점 감점돼요.</span></p>
  <p><b>요청 처리하기</b><span>손을 든 학생 곁에서 A로 요청을 들어요. 교탁에서 답안지를 챙길 때, 학생에게 건넬 때, 창가에서 커튼을 닫을 때도 A를 눌러요.</span></p></div>
  <details><summary>키보드와 마우스 조작</summary><p>WASD·방향키로 이동하고 드래그 또는 Q/R로 둘러봅니다. 1·2는 메모의 첫째·둘째 자리로 이동, Shift는 조용히 걷기, E는 상호작용, F는 기록, Tab은 일지, Esc는 닫기·일시정지입니다.</p></details>
  <button class="primary wide" data-action="close">확인</button>`;
}
export function journal(e, id, type, note) {
  const s = e.seat(id),
    notes = s?.notes ?? [];
  const selected = notes.find((n) => n.key === note);
  const repeat = s?.attempts.includes(type + '/' + note);
  return `<div class="eyebrow">냥이잡기 · 현장 기록</div><h2>감독 일지</h2>
  <div class="journal-pair">${handover(e)}
  <dl class="pair-notes">${e.pair.map((id) => {
    const detail = e.seat(id).notes.find((n) => n.key === 'clear' || n.key === 'proof');
    return `<div><dt>${seatNo(id)}번</dt><dd>${detail ? detail.text : '후속 행동 대기'}</dd></div>`;
  }).join('')}</dl></div>
  <div class="seat-grid">${e.seats.map((v) => `<button data-seat="${v.id}" class="${id === v.id ? 'selected' : ''} ${v.notes.length ? 'inked' : ''}" title="${v.id}번 좌석">${seatNo(v.id)}${v.caught ? ' ✓' : ''}</button>`).join('')}</div>
  <h3>${seatNo(id)}번 좌석 <small>${s.caught ? '퇴실' : '관찰 ' + notes.length + '건'}</small></h3>
  ${notes.length ? `<label>지목 근거<select id="evidence">${notes.map((n) => `<option value="${n.key}" ${n.key === note ? 'selected' : ''}>${clock(n.t)} · ${n.text}</option>`).join('')}</select></label>` : '<div class="empty">이 좌석에서 기록한 행동이 없습니다. 학생 옆에서 관찰한 뒤 ‘행동 기록’을 누르세요.</div>'}
  ${
    !s.caught && notes.length
      ? `<label>의심 유형<select id="kind"><option value="">유형 선택</option>${Object.entries(TYPES)
          .map(([k, v]) => `<option value="${k}" ${type === k ? 'selected' : ''}>${v.name}</option>`)
          .join('')}</select></label>
  <button class="primary wide" data-action="accuse" ${!selected || !type || repeat ? 'disabled' : ''}>${repeat ? '이미 제출한 지목' : '근거를 제출하고 지목'}</button><small class="fine">오인 지목은 20점 감점됩니다.</small>`
      : ''
  }
  ${s.lastAction ? `<div class="outcome">${s.lastAction.text}</div>` : ''}
  ${e.complaints.length ? `<details><summary>접수 민원 ${e.complaints.length}건</summary>${e.complaints.map((c) => `<p>${seatNo(c.id)}번 · ${c.text} ${c.resolved ? '(조치 완료)' : ''}</p>`).join('')}</details>` : ''}`;
}
export function result(r, best, canReplay) {
  const pair = (r.pair ?? []).map((id) => r.seats.find((s) => s.id === id)).filter(Boolean);
  const completed = pair.filter(hasDetail).length;
  const missed = r.total - r.caught;
  const delta = r.score - r.previousScore;
  const comparison = Number.isFinite(r.previousScore)
    ? `<p class="comparison">같은 배치 ${r.previousScore}점 → ${r.score}점 <b>${delta === 0 ? '동점' : (delta > 0 ? '+' : '−') + Math.abs(delta) + '점'}</b></p>` : '';
  const deductions = [
    missed && '미적발 −' + missed * 15 + '점',
    r.falseCalls && '오인 −' + r.falseCalls * 20 + '점',
    r.complaints.length && '민원 −' + r.complaints.length * 8 + '점',
  ].filter(Boolean);
  const pairReview = pair.length === 2 ? `<section class="pair-review">
    <div class="memo-heading"><b>${icon('pencil', 16)} 인계 메모 복기</b><strong class="ink-stamp">${completed === 2 ? '대조 완료' : '후속 기록 ' + completed + '/2'}</strong></div>
    <p>${sharedCues[pair[0].kind]}</p>
    ${pair.map((s) => `<div class="review-entry"><b>${seatNo(s.id)}번</b><div><small>${hasDetail(s) ? '내가 기록한 장면' : '놓친 장면'}</small><p>${TYPES[s.kind][s.guilty ? 'proof' : 'clear']}</p></div></div>`).join('')}
    </section>` : '';
  return `<div class="eyebrow">1교시 국어 · ${reportName(r)} 종료</div><h2>시험 종료 보고서</h2>
    <div class="score"><strong>${r.score}<small>점</small></strong><span>나의 최고 기록 <b>${best}점</b></span></div>
    ${comparison}
    <p class="deductions">${deductions.join(' · ') || '감점 없이 시험을 마쳤어요.'}</p>
    <div class="stats">${[
      ['적발', r.caught + '/' + r.total],
      ['오인', r.falseCalls + '건'],
      ['접수 민원', r.complaints.length + '건'],
      ['처리 요청', r.served + '/' + r.requests],
    ]
      .map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`)
      .join('')}</div>
    ${pairReview}
    <div class="report-actions">
    ${Number.isInteger(r.seed) ? `<button class="primary" data-action="retry">같은 배치 재도전 ${icon('arrow', 16)}</button>` : ''}<button class="secondary" data-action="again">새 시험 시작</button></div>
    <h3>좌석별 복기</h3><div class="review-list">${r.seats.map((s) => `<details><summary><span>${seatNo(s.id)}번 좌석</span><b>${s.caught ? '적발' : s.guilty ? '미적발' : '정상'}</b></summary><p>${TYPES[s.kind].cue}<br>${TYPES[s.kind][s.guilty ? 'proof' : 'clear']}</p><p class="fine">${s.lastAction ? clock(s.lastAction.t) + ' · ' + s.lastAction.text : '지목 기록 없음'} · 관찰 기록 ${s.notes.length}건</p>${canReplay ? `<button class="pill" data-replay="${s.id}">${icon('eye', 15)} 행동 다시 보기</button>` : ''}</details>`).join('')}</div>
    ${r.complaints.length ? `<details><summary>민원 ${r.complaints.length}건</summary>${r.complaints.map((c) => `<p>${seatNo(c.id)}번 · ${c.text} ${c.resolved ? '(조치 완료)' : '(미조치)'}</p>`).join('')}</details>` : ''}
    ${r.log.length ? `<details><summary>시간순 감독 일지</summary>${r.log.map((l) => `<p>${clock(l.t)} · ${l.text}</p>`).join('')}</details>` : ''}
    <div class="modal-actions"><button class="secondary" data-action="home">처음으로</button></div>`;
}
