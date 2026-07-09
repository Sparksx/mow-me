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

export function sfxThump() {
  beep(85, 0.18, 'sawtooth', 0.16, -35);
}

let lastBossHit = 0;
export function sfxBossHit() {
  // rate-limit: boss damage ticks every frame
  const now = performance.now();
  if (now - lastBossHit < 90) return;
  lastBossHit = now;
  beep(140 + Math.random() * 60, 0.06, 'square', 0.08, -50);
}

export function sfxBossDown() {
  [392, 523, 659, 784].forEach((f, i) => setTimeout(() => beep(f, 0.16, 'triangle', 0.12), i * 110));
}

export function sfxPowerup() {
  beep(660, 0.07, 'square', 0.09);
  setTimeout(() => beep(880, 0.07, 'square', 0.09), 70);
  setTimeout(() => beep(1174, 0.12, 'square', 0.09), 140);
}

export function sfxDeath() {
  beep(340, 0.4, 'sawtooth', 0.12, -280);
  setTimeout(() => beep(180, 0.35, 'sawtooth', 0.1, -120), 180);
}
