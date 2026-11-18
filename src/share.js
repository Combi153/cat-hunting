import { shareContent } from './share-content.js';

export const SHARE_REWARD_DELAY = 5000;
export function createResultSharing(dialog, toast, send = () => {}, getContext = () => ({}), onReward = () => {}) {
  const button = dialog.querySelector('[data-share="send"]');
  const copyButton = dialog.querySelector('[data-share="copy"]');
  const summary = dialog.querySelector('#share-summary');
  const status = dialog.querySelector('#share-status');
  const help = dialog.querySelector('#share-help');
  const manual = dialog.querySelector('#share-manual');
  const input = dialog.querySelector('#share-url');
  let generation = 0, pending = false, rewardTimer, toastTimer, result, context;
  let remaining = 0, lastTick = 0;
  const event = (method, state) => send('share_result', { ...context, interaction_action: method, interaction_status: state });
  function invalidate() {
    generation++;
    pending = false;
    clearInterval(rewardTimer);
    button.disabled = copyButton.disabled = false;
  }
  function clearToast() { clearTimeout(toastTimer); toast.textContent = ''; }
  function waitForReward(method, current) {
    remaining = SHARE_REWARD_DELAY;
    lastTick = performance.now();
    manual.hidden = true;
    button.hidden = copyButton.hidden = true;
    help.textContent = method === 'copy' ? '복사한 링크를 친구에게 보내고 돌아와 주세요.' : '공유를 마치고 돌아오셨나요? 잠시만 기다려 주세요.';
    const tick = () => {
      if (current !== generation) return;
      const now = performance.now();
      if (!document.hidden) remaining -= Math.max(0, now - lastTick);
      lastTick = now;
      const message = `재도전 3회까지 ${Math.max(0, Math.ceil(remaining / 1000))}초`;
      if (status.textContent !== message) status.textContent = message;
      if (remaining > 0) return;
      clearInterval(rewardTimer);
      onReward(method, context);
      dialog.close();
      toast.textContent = '재도전 기회 3회를 받았어요!';
      toastTimer = setTimeout(clearToast, 3000);
    };
    tick();
    rewardTimer = setInterval(tick, 100);
  }
  // Hidden time is not time spent waiting after returning from the share app.
  document.addEventListener('visibilitychange', () => { lastTick = performance.now(); });
  async function copy(current) {
    event('copy', 'attempt');
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(shareContent(result).url);
      if (current !== generation) return;
      event('copy', 'copied');
      waitForReward('copy', current);
    } catch {
      if (current !== generation) return;
      event('copy', 'manual_required');
      pending = false;
      button.hidden = true;
      copyButton.hidden = false;
      copyButton.disabled = false;
      input.value = shareContent(result).url;
      manual.hidden = false;
      help.textContent = '자동 복사가 막혀 있어요. 링크를 선택해 복사할 수 있어요.';
      status.textContent = '자동 복사에 성공하면 5초 뒤 기회를 드려요.';
      input.focus(); input.select(); input.setSelectionRange(0, input.value.length);
    }
  }
  async function perform(copyOnly = false) {
    if (pending) return;
    pending = true;
    const current = ++generation;
    button.disabled = copyButton.disabled = true;
    status.textContent = '';
    const { title, text, url } = shareContent(result);
    const data = { title, text, url };
    let supported = !copyOnly && typeof navigator.share === 'function';
    try { if (supported && navigator.canShare) supported = navigator.canShare(data); } catch { supported = false; }
    if (!supported) {
      if (!copyOnly) event('native', 'unsupported');
      return copy(current);
    }
    event('native', 'attempt');
    try {
      await navigator.share(data);
      if (current !== generation) return;
      event('native', 'resolved');
      waitForReward('native', current);
    } catch (error) {
      if (current !== generation) return;
      event('native', error.name === 'AbortError' ? 'cancelled' : 'error');
      if (error.name !== 'AbortError') return copy(current);
      pending = false;
      button.disabled = copyButton.disabled = false;
      status.textContent = '공유를 취소했어요. 원할 때 다시 공유해 주세요.';
    }
  }
  dialog.addEventListener('close', invalidate);
  button.addEventListener('click', () => perform());
  copyButton.addEventListener('click', () => perform(true));
  dialog.querySelector('[data-share="close"]').addEventListener('click', () => dialog.close());
  input.addEventListener('click', () => input.select());
  return {
    share(nextResult, exhausted = false) {
      if (dialog.open) return;
      invalidate(); clearToast();
      result = nextResult;
      context = getContext();
      dialog.querySelector('#share-title').textContent = exhausted ? '재도전 기회가 없어요' : '친구에게 도전장을 보내요';
      summary.textContent = shareContent(result).text;
      help.textContent = '공유를 마치고 돌아오면 5초 뒤 재도전 기회 3회를 드려요.';
      status.textContent = '';
      button.hidden = false;
      copyButton.hidden = manual.hidden = true;
      dialog.showModal(); button.focus();
    },
    reset() { invalidate(); clearToast(); if (dialog.open) dialog.close(); },
  };
}
