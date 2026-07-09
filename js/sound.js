// Tiny WebAudio synth — no assets needed.

let ctx = null;
let muted = false;

export function setMuted(m) { muted = m; }
export function isMuted() { return muted; }

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  } catch { ctx = null; }
}

function beep(freq, dur, type = 'square', vol = 0.12, slide = 0) {
  if (!ctx || muted) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

let lastSnip = 0;
export function sfxSnip() {
  // rate-limit: mowing triggers this a lot
  const now = performance.now();
  if (now - lastSnip < 70) return;
  lastSnip = now;
  beep(700 + Math.random() * 500, 0.05, 'triangle', 0.07, -300);
}

export function sfxCoin() {
  beep(880, 0.06, 'square', 0.06);
  setTimeout(() => beep(1320, 0.09, 'square', 0.06), 55);
}

export function sfxBuy() {
  beep(520, 0.08, 'triangle', 0.1);
  setTimeout(() => beep(660, 0.08, 'triangle', 0.1), 70);
  setTimeout(() => beep(880, 0.14, 'triangle', 0.1), 140);
}

export function sfxJump() {
  beep(300, 0.12, 'sine', 0.09, 250);
}

export function sfxError() {
  beep(160, 0.15, 'sawtooth', 0.07, -60);
}
