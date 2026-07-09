// Power-up pickups: sparkling items that spawn near the player, fade if
// ignored, and grant a temporary boost when touched. Active boosts live in
// state.boosts (id -> seconds remaining, saved); pickups in state.pickups
// (runtime only).

import {
  POWERUPS, POWERUPS_BY_ID, TILE_W, WORLD_TILES, GROUND_Y,
  BOSSES, POWERUP_MAX_ACTIVE, POWERUP_TTL,
} from './config.js';
import { toast } from './ui.js';
import { sfxPowerup } from './sound.js';

const COLLECT_RADIUS = 28; // px

let spawnTimer = 8; // first pickup shows up soon after starting

export function updatePowerups(state, dt) {
  // tick active boosts
  for (const id of Object.keys(state.boosts)) {
    state.boosts[id] -= dt;
    if (state.boosts[id] <= 0) {
      delete state.boosts[id];
      const cfg = POWERUPS_BY_ID[id];
      toast(`${cfg.icon} ${cfg.name} wore off.`);
    }
  }

  // age & collect pickups
  for (let i = state.pickups.length - 1; i >= 0; i--) {
    const pk = state.pickups[i];
    pk.ttl -= dt;
    if (pk.ttl <= 0) {
      state.pickups.splice(i, 1);
      continue;
    }
    if (Math.abs(state.player.x - pk.x) < COLLECT_RADIUS) {
      state.pickups.splice(i, 1);
      collect(state, pk);
    }
  }

  // spawn new ones
  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawnTimer = 16 + Math.random() * 18;
    if (state.pickups.length < POWERUP_MAX_ACTIVE) spawnPickup(state);
  }
}

function spawnPickup(state) {
  const ptile = Math.floor(state.player.x / TILE_W);
  for (let tries = 0; tries < 10; tries++) {
    const dir = Math.random() < 0.5 ? -1 : 1;
    const t = ptile + dir * Math.round(12 + Math.random() * 42);
    if (t < 2 || t > WORLD_TILES - 3) continue;
    if (BOSSES.some(b => Math.abs(b.tile - t) < 8)) continue; // no bait next to bosses
    const type = POWERUPS[Math.floor(Math.random() * POWERUPS.length)].id;
    state.pickups.push({ type, x: t * TILE_W + TILE_W / 2, ttl: POWERUP_TTL, seed: Math.random() });
    return;
  }
}

function collect(state, pk) {
  const cfg = POWERUPS_BY_ID[pk.type];
  state.boosts[pk.type] = cfg.dur; // re-collecting refreshes the timer
  toast(`${cfg.icon} ${cfg.name} — ${cfg.desc} for ${cfg.dur}s!`);
  sfxPowerup();
  for (let i = 0; i < 12; i++) {
    state.particles.push({
      type: 'clip',
      x: pk.x + (Math.random() - 0.5) * 20,
      y: GROUND_Y - 20 - Math.random() * 20,
      vx: (Math.random() - 0.5) * 160,
      vy: -80 - Math.random() * 120,
      rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 12,
      size: 4 + Math.random() * 3,
      life: 0.5 + Math.random() * 0.4, maxLife: 0.9,
      color: i % 2 ? '#ffd75e' : '#fff3b0',
    });
  }
}

// ---- boost effects ----

export const boostSpeedMult = (state) => (state.boosts.espresso ? 1.6 : 1);
export const boostPowerMult = (state) => (state.boosts.whetstone ? 2 : 1);
export const boostCoinMult  = (state) => (state.boosts.clover ? 2 : 1);
export const growthFrozen   = (state) => !!state.boosts.frost;
