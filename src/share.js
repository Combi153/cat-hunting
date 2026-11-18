// Share only the public game URL and a short result, never the current page's
// preview address, query parameters, saved history or culprit identities.
export function createResultSharing(dialog, url) {
  const copyButton = dialog.querySelector('[data-share="copy"]');
  const summary = dialog.querySelector('#share-summary');
  const status = dialog.querySelector('#share-status');
  const manual = dialog.querySelector('#share-manual');
  const input = dialog.querySelector('#share-url');
  let generation = 0;
  let nativePending = false;

  function shareData(result) {
    const text = result.reason === 'win'
      ? result.stage === 5
        ? '냥이잡기 다섯 시험 모두 통과! 너도 도전해 봐!'
        : `냥이잡기 ${result.stage}단계 통과! 너도 찾아낼 수 있어?`
      : `냥이잡기 ${result.stage}단계 감독 실패! 너는 찾아낼 수 있어?`;
    return { title: '냥이잡기 · 45초 시험 감독', text, url };
  }

  function showCopy(result, message = '') {
    generation++;
    summary.textContent = shareData(result).text;
    input.value = url;
    manual.hidden = true;
    copyButton.disabled = false;
    status.textContent = message;
    if (!dialog.open) dialog.showModal();
    copyButton.focus({ preventScroll: true });
  }

  async function copy() {
    if (copyButton.disabled) return;
    const current = generation;
    copyButton.disabled = true;
    status.textContent = '';
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(url);
      if (dialog.open && current === generation) {
        manual.hidden = true;
        status.textContent = '링크를 복사했어요. 친구에게 붙여넣어 보내 주세요.';
      }
    } catch {
      if (dialog.open && current === generation) {
        manual.hidden = false;
        status.textContent = '자동으로 복사할 수 없어요. 게임 링크를 길게 누르거나 선택해 복사해 주세요.';
        input.focus();
        input.select();
        input.setSelectionRange(0, input.value.length);
      }
    } finally {
      if (current === generation) copyButton.disabled = false;
    }
  }

  dialog.addEventListener('close', () => { generation++; });
  dialog.querySelector('[data-share="close"]').addEventListener('click', () => dialog.close());
  copyButton.addEventListener('click', copy);
  input.addEventListener('click', () => input.select());

  return {
    async share(result) {
      if (nativePending) return;
      const data = shareData(result);
      let supported = typeof navigator.share === 'function';
      try {
        if (supported && navigator.canShare) supported = navigator.canShare(data);
      } catch {
        supported = false;
      }
      if (!supported) {
        showCopy(result, '이 브라우저에서는 링크를 복사해 공유해 주세요.');
        return;
      }
      const current = ++generation;
      nativePending = true;
      try {
        // The result button opens the OS share sheet directly, in this click.
        await navigator.share(data);
        // Handoff is not delivery confirmation. Cancellation needs no UI.
      } catch (error) {
        if (current === generation && error.name !== 'AbortError') {
          showCopy(result, '공유 창을 열 수 없어요. 링크를 복사해 보내 주세요.');
        }
      } finally {
        nativePending = false;
      }
    },
    copy(result) {
      showCopy(result);
      return copy();
    },
    reset() {
      // Leaving the result invalidates pending callbacks without changing play.
      generation++;
      if (dialog.open) dialog.close();
    },
  };
}
