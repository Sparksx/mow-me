// Day/night cycle math. Everything derives from state.cycleT (seconds into
// the current cycle), so the whole cycle is one saved number.

import {
  CYCLE_LENGTH, DAY_FRACTION, DAY_GROWTH_MULT, NIGHT_GROWTH_MULT, NIGHT_COIN_MULT,
} from './config.js';
import { lerp } from './util.js';

const TWILIGHT = 0.05; // dawn/dusk ramp width, as a fraction of the cycle

// 0..1 position in the cycle; day is [0, DAY_FRACTION), night the rest
export function cyclePhase(cycleT) {
  return ((cycleT % CYCLE_LENGTH) + CYCLE_LENGTH) % CYCLE_LENGTH / CYCLE_LENGTH;
}

// 1 = full day, 0 = full night, smooth ramps around dawn (phase 0) and dusk
export function daylight(cycleT) {
  const p = cyclePhase(cycleT);
  if (p >= 1 - TWILIGHT) return (p - (1 - TWILIGHT)) / (2 * TWILIGHT);   // pre-dawn 0 → 0.5
  if (p < TWILIGHT) return 0.5 + p / (2 * TWILIGHT);                     // dawn 0.5 → 1
  if (p < DAY_FRACTION - TWILIGHT) return 1;
  if (p < DAY_FRACTION + TWILIGHT) {
    return 1 - (p - (DAY_FRACTION - TWILIGHT)) / (2 * TWILIGHT);         // dusk 1 → 0
  }
  return 0;
}

export function isNight(cycleT) {
  return daylight(cycleT) < 0.5;
}

export function growthMult(cycleT) {
  return lerp(NIGHT_GROWTH_MULT, DAY_GROWTH_MULT, daylight(cycleT));
}

export function coinMult(cycleT) {
  return lerp(NIGHT_COIN_MULT, 1, daylight(cycleT));
}

// long-run average, used for offline / sleeping-tab growth
export const AVG_GROWTH_MULT =
  DAY_FRACTION * DAY_GROWTH_MULT + (1 - DAY_FRACTION) * NIGHT_GROWTH_MULT;

// HUD helper: which icon to show and seconds until the next switch
export function hudClock(cycleT) {
  const p = cyclePhase(cycleT);
  const night = p >= DAY_FRACTION;
  const remain = (night ? 1 - p : DAY_FRACTION - p) * CYCLE_LENGTH;
  return { icon: night ? '🌙' : '🌞', remain };
}
