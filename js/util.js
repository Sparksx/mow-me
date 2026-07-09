export const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
export const lerp = (a, b, t) => a + (b - a) * t;

// deterministic pseudo-random in [0,1) from an integer seed —
// used for per-tuft jitter so it never needs to be saved.
export function hashRand(i, salt = 0) {
  let h = (i * 374761393 + salt * 668265263) | 0;
  h = (h ^ (h >>> 13)) | 0;
  h = Math.imul(h, 1274126177);
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 4294967296;
}

export function formatCoins(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M';
  if (n >= 1e4) return (n / 1e3).toFixed(n >= 1e5 ? 0 : 1) + 'k';
  return String(Math.floor(n));
}

export function formatDuration(seconds) {
  if (seconds < 90) return Math.round(seconds) + 's';
  if (seconds < 5400) return Math.round(seconds / 60) + 'm';
  if (seconds < 129600) return Math.round(seconds / 3600) + 'h';
  return Math.round(seconds / 86400) + 'd';
}
