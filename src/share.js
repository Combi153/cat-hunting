// Share only the public game URL and a short result, never the current page's
// preview address, query parameters, saved history or culprit identities.
export function createResultSharing(dialog, url) {
  const nativeButton = dialog.querySelector('[data-share="native"]');
  const copyButton = dialog.querySelector('[data-share="copy"]');
  const summary = dialog.querySelector('#share-summary');
  const status = dialog.querySelector('#share-status');
  const manual = dialog.querySelector('#share-manual');
  const input = dialog.querySelector('#share-url');
  let data;
  let generation = 0;
  let busy = false;

  function setBusy(value) {
    busy = value;
    nativeButton.disabled = value;
    copyButton.disabled = value;
  }

  function showManualCopy() {
    manual.hidden = false;
    status.textContent = '자동으로 복사할 수 없어요. 게임 링크를 길게 누르거나 선택해 복사해 주세요.';
    input.focus();
    input.select();
    input.setSelectionRange(0, input.value.length);
  }

  dialog.addEventListener('close', () => { generation++; });
  dialog.querySelector('[data-share="close"]').addEventListener('click', () => dialog.close());
  input.addEventListener('click', () => input.select());

  nativeButton.addEventListener('click', async () => {
    if (busy) return;
    const current = generation;
    setBusy(true);
    status.textContent = '';
    try {
      // Invoke directly within the click, preserving transient user activation.
      await navigator.share(data);
      // Resolution means handoff, not confirmed delivery to a friend.
      if (dialog.open && current === generation) dialog.close();
    } catch (error) {
      if (dialog.open && current === generation) {
        status.textContent = error.name === 'AbortError'
          ? '공유를 취소했어요.'
          : '공유 창을 열 수 없어요. 링크를 복사해 보내 주세요.';
      }
    } finally {
      if (current === generation) setBusy(false);
    }
  });

  copyButton.addEventListener('click', async () => {
    if (busy) return;
    const current = generation;
    setBusy(true);
    status.textContent = '';
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(url);
      if (dialog.open && current === generation) {
        manual.hidden = true;
        status.textContent = '링크를 복사했어요. 친구에게 붙여넣어 보내 주세요.';
      }
    } catch {
      if (dialog.open && current === generation) showManualCopy();
    } finally {
      if (current === generation) setBusy(false);
    }
  });

  return {
    open(result) {
      if (dialog.open) return;
      generation++;
      const text = result.reason === 'win'
        ? result.stage === 5
          ? '냥이잡기 다섯 시험 모두 통과! 너도 도전해 봐!'
          : `냥이잡기 ${result.stage}단계 통과! 너도 찾아낼 수 있어?`
        : `냥이잡기 ${result.stage}단계 감독 실패! 너는 찾아낼 수 있어?`;
      data = { title: '냥이잡기 · 45초 시험 감독', text, url };
      summary.textContent = text;
      input.value = url;
      manual.hidden = true;
      setBusy(false);
      let supported = typeof navigator.share === 'function';
      try {
        if (supported && navigator.canShare) supported = navigator.canShare(data);
      } catch {
        supported = false;
      }
      nativeButton.hidden = !supported;
      status.textContent = supported ? '' : '링크를 복사해 친구에게 보내 주세요.';
      dialog.showModal();
      (supported ? nativeButton : copyButton).focus({ preventScroll: true });
    },
  };
}
