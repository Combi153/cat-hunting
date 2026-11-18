export const RETRY_STORAGE_KEY = 'nyangijapgi.retries.v1';
export const DAILY_RETRIES = 3;
export const SHARE_RETRIES = 3;

// One calendar day for every player, regardless of the device's time zone.
export function retryDay(now = Date.now()) {
  return new Date(now + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function createRetryAllowance(storage, now = () => Date.now()) {
  let memory;
  let persistent = true;
  // Read again before mutations so sequential actions in other tabs are preserved.
  function read() {
    let value = memory;
    if (persistent) {
      let raw;
      try { raw = storage.getItem(RETRY_STORAGE_KEY); } catch { persistent = false; }
      if (persistent) {
        try { value = JSON.parse(raw); } catch { value = null; }
      }
    }
    const day = retryDay(now());
    memory = value?.day === day && Number.isSafeInteger(value.remaining) && value.remaining >= 0
      ? { day, remaining: value.remaining }
      : { day, remaining: DAILY_RETRIES };
    return { ...memory };
  }
  function write(value) {
    memory = value;
    if (persistent) {
      try { storage.setItem(RETRY_STORAGE_KEY, JSON.stringify(value)); } catch { persistent = false; }
    }
    return { ...value };
  }
  return {
    current: read,
    fail() {
      const value = read();
      return write({ ...value, remaining: Math.max(0, value.remaining - 1) });
    },
    reward() {
      const value = read();
      return write({ ...value, remaining: Math.min(Number.MAX_SAFE_INTEGER, value.remaining + SHARE_RETRIES) });
    },
  };
}
