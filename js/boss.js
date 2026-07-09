// Boss weeds: anchored at fixed tiles, they block the meadow. Locked bosses
// (requirements unmet) are invulnerable and shove the player away — the Weed
// King eats them outright. Unlocked bosses become mowable HP pools that fight
// back. Persistent fields per boss: { hp, dead }; everything else on the same
// object is runtime-only (locked, pushCd, phase, snapT, lastHit).

import {
  BOSSES, TOOLS, TOOL_INDEX, TILE_W,
  BOSS_REGEN_DELAY, BOSS_REGEN_RATE,
} from './config.js';
import { toast } from './ui.js';
import { sfxThump, sfxBossHit } from './sound.js';

export const BODY_HALF = 36;   // px half-width of a boss body
const PUSH_RADIUS = 60;        // px: shove distance for push bosses
const KILL_RADIUS = 55;        // px: deadly contact distance for kill bosses
const SNAP_RANGE = 150;        // px: reach of the Weed King's snap attack
const AGGRO_RANGE = 250;       // px: player distance that arms the snap cycle

export function bossX(cfg) {
  return cfg.tile * TILE_W + TILE_W / 2;
}

function unlocked(state, cfg) {
  return TOOL_INDEX[state.toolId] >= cfg.minToolIdx && state.mowedPct >= cfg.minMowedPct;
}

export function requirementText(cfg) {
  const tool = TOOLS[cfg.minToolIdx];
  return `${tool.icon} ${tool.name}${cfg.minMowedPct ? ` + ${cfg.minMowedPct}% mowed` : ''}`;
}

let hintAt = -99;
let immuneCd = 0;

export function updateBosses(state, dt, time, hooks) {
  immuneCd -= dt;
  const pl = state.player;

  for (const cfg of BOSSES) {
    const b = state.bosses[cfg.id];
    if (b.dead) continue;
    b.locked = !unlocked(state, cfg);
    b.pushCd = (b.pushCd ?? 0) - dt;
    const d = pl.x - bossX(cfg);
    const dist = Math.abs(d);

    // slow regen when left alone mid-fight
    if (b.hp < cfg.hp && time - (b.lastHit ?? -99) > BOSS_REGEN_DELAY) {
      b.hp = Math.min(cfg.hp, b.hp + cfg.hp * BOSS_REGEN_RATE * dt);
    }

    if (cfg.attack === 'kill') {
      if (dist < KILL_RADIUS) {
        resetSnap(b);
        hooks.kill(cfg);
        continue;
      }
      updateSnap(b, dist, dt, cfg, hooks);
    } else if (dist < PUSH_RADIUS && b.pushCd <= 0) {
      b.pushCd = b.locked ? 0.25 : 3.2;
      const dir = Math.sign(d) || -1;
      pl.vx = dir * (b.locked ? 880 : 640);
      pl.vy = -240;
      pl.onGround = false;
      pl.stun = b.locked ? 0.45 : 0.3;
      sfxThump();
      if (b.locked && time - hintAt > 3) {
        hintAt = time;
        toast(`🔒 ${cfg.name} shrugs it off — you need ${requirementText(cfg)}!`);
      }
    }
  }
}

// snap-attack cycle: idle → windup (telegraphed) → snap (deadly) → idle
function updateSnap(b, dist, dt, cfg, hooks) {
  if (b.locked) { resetSnap(b); return; }
  b.phase = b.phase ?? 'idle';
  b.snapT = (b.snapT ?? 0) + dt;
  if (b.phase === 'idle') {
    if (dist >= AGGRO_RANGE) b.snapT = Math.min(b.snapT, 2.0); // no pre-charging from afar
    else if (b.snapT > 2.8) { b.phase = 'windup'; b.snapT = 0; sfxThump(); }
  } else if (b.phase === 'windup') {
    if (b.snapT > 0.85) { b.phase = 'snap'; b.snapT = 0; }
  } else if (b.phase === 'snap') {
    if (b.snapT < 0.3 && dist < SNAP_RANGE) {
      resetSnap(b);
      hooks.kill(cfg);
      return;
    }
    if (b.snapT > 0.4) resetSnap(b);
  }
}

function resetSnap(b) {
  b.phase = 'idle';
  b.snapT = 0;
}

// Called from the mow loop. Returns 'hit', 'immune' or null.
export function tryHitBoss(state, dt, time, power, reach, hooks) {
  const pl = state.player;
  for (const cfg of BOSSES) {
    const b = state.bosses[cfg.id];
    if (b.dead) continue;
    const toBoss = bossX(cfg) - pl.x;
    if (Math.sign(toBoss) !== pl.facing) continue;
    if (Math.abs(toBoss) > (reach + 1) * TILE_W + BODY_HALF) continue;
    if (b.locked) {
      if (immuneCd <= 0) {
        immuneCd = 1.4;
        hooks.popup(bossX(cfg), '🔒 immune!');
      }
      return 'immune';
    }
    b.hp -= power * dt;
    b.lastHit = time;
    sfxBossHit();
    if (b.hp <= 0) {
      b.hp = 0;
      b.dead = true;
      hooks.defeated(cfg);
    }
    return 'hit';
  }
  return null;
}
