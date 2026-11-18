// Share only the public game URL and a short result, never the current page's
// preview address, query parameters, saved history or culprit identities.
export function createResultSharing(dialog, url, toast) {
  const copyButton = dialog.querySelector('[data-share="copy"]');
  const summary = dialog.querySelector('#share-summary');
  const status = dialog.querySelector('#share-status');
  const manual = dialog.querySelector('#share-manual');
  const input = dialog.querySelector('#share-url');
  let generation = 0;
  let pending = null;
  let manualResult;
  let toastTimer;

  function shareData(result) {
    const text = result.reason === 'win'
      ? result.stage === 5
        ? '냥이잡기 다섯 시험 모두 통과! 너도 도전해 봐!'
        : `냥이잡기 ${result.stage}단계 통과! 너도 찾아낼 수 있어?`
      : `냥이잡기 ${result.stage}단계 감독 실패! 너는 찾아낼 수 있어?`;
    return { title: '냥이잡기 · 45초 시험 감독', text, url };
  }

  function clearToast() {
    clearTimeout(toastTimer);
    toast.textContent = '';
  }

  function showManualCopy(result) {
    manualResult = result;
    summary.textContent = shareData(result).text;
    input.value = url;
    manual.hidden = false;
    status.textContent = '자동으로 복사할 수 없어요. 게임 링크를 길게 누르거나 선택해 복사해 주세요.';
    if (!dialog.open) dialog.showModal();
    input.focus();
    input.select();
    input.setSelectionRange(0, input.value.length);
  }

  async function copy(result) {
    if (pending !== null) return;
    const current = ++generation;
    pending = current;
    copyButton.disabled = true;
    clearToast();
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      // Call within the original click, without an intermediate dialog or await.
      await navigator.clipboard.writeText(url);
      if (current === generation) {
        if (dialog.open) dialog.close();
        toast.textContent = '링크를 복사했어요';
        toastTimer = setTimeout(clearToast, 3000);
      }
    } catch {
      if (current === generation) showManualCopy(result);
    } finally {
      if (pending === current) pending = null;
      if (current === generation) copyButton.disabled = false;
    }
  }

  dialog.addEventListener('close', () => { generation++; pending = null; copyButton.disabled = false; });
  dialog.querySelector('[data-share="close"]').addEventListener('click', () => dialog.close());
  copyButton.addEventListener('click', () => copy(manualResult));
  input.addEventListener('click', () => input.select());

  return {
    async share(result) {
      if (pending !== null) return;
      clearToast();
      const data = shareData(result);
      let supported = typeof navigator.share === 'function';
      try {
        if (supported && navigator.canShare) supported = navigator.canShare(data);
      } catch {
        supported = false;
      }
      if (!supported) return copy(result);
      const current = ++generation;
      pending = current;
      try {
        // The result button opens the OS share sheet directly, in this click.
        await navigator.share(data);
        // Handoff is not delivery confirmation. Cancellation needs no UI.
      } catch (error) {
        if (current === generation && error.name !== 'AbortError') {
          pending = null;
          return copy(result);
        }
      } finally {
        if (pending === current) pending = null;
      }
    },
    copy,
    reset() {
      // Leaving the result invalidates pending callbacks without changing play.
      generation++;
      pending = null;
      copyButton.disabled = false;
      clearToast();
      if (dialog.open) dialog.close();
    },
  };
}
