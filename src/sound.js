let audio;
let lastStep = -1,
  lastPage = -1;
export function activateSound() {
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') audio.resume().catch(() => {});
  } catch {
    /* Text and animation also convey every cue. */
  }
}
function tone(freq, length, gain, delay = 0, type = 'sine') {
  if (!audio || audio.state !== 'running') return;
  const osc = audio.createOscillator(),
    vol = audio.createGain(),
    start = audio.currentTime + delay;
  osc.type = type;
  osc.frequency.value = freq;
  vol.gain.setValueAtTime(0.0001, start);
  vol.gain.exponentialRampToValueAtTime(gain, start + 0.009);
  vol.gain.exponentialRampToValueAtTime(0.0001, start + length);
  osc.connect(vol).connect(audio.destination);
  osc.start(start);
  osc.stop(start + length + 0.025);
  osc.onended = () => {
    osc.disconnect();
    vol.disconnect();
  };
}
export function bell() {
  tone(660, 0.32, 0.06);
  tone(880, 0.66, 0.045, 0.23);
}
export function soundsForFrame(t, moving, quiet) {
  if (moving && (t < lastStep || t - lastStep > (quiet ? 0.58 : 0.39))) {
    tone(quiet ? 100 : 85, 0.075, quiet ? 0.007 : 0.026, 0, 'triangle');
    lastStep = t;
  }
  const page = Math.floor(t / 12);
  if (lastPage !== page) {
    lastPage = page;
    if (page > 0) tone(440, 0.045, 0.004, 0, 'triangle');
  }
}
