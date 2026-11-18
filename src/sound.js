let audio;
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
export function reportSound(correct) {
  tone(correct ? 660 : 180, 0.18, 0.05, 0, 'triangle');
  tone(correct ? 880 : 130, 0.24, 0.04, 0.13, 'triangle');
}
export function serviceSound() {
  tone(540, 0.12, 0.025);
  tone(720, 0.2, 0.025, 0.12);
}
export function finale(win) {
  const melody = win ? [523, 659, 784, 1047, 784, 1047] : [220, 196, 165, 130];
  melody.forEach((frequency, index) => {
    tone(frequency, index === melody.length - 1 ? 0.85 : 0.22, 0.045, index * 0.18, 'triangle');
    if (win) tone(frequency / 2, 0.32, 0.025, index * 0.18);
  });
  if (!win) {
    // Three clipped, descending notes echo the student's mischievous chuckle.
    for (let i = 0; i < 3; i++) tone(280 - i * 25, 0.11, 0.025, 0.9 + i * 0.19, 'triangle');
  }
}
