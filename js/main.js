import {
  TILE_W, WORLD_TILES, WORLD_W, GROUND_Y, MAX_STAGE, GROW_TIME, GROW_JITTER,
  grassHp, grassCoins, MAX_SLOWDOWN, PLAYER, TOOLS_BY_ID, VEHICLE_TOOLS,
  SHARPEN_BONUS, SAVE_INTERVAL, CYCLE_LENGTH, BOSSES,
  SPEED_PER_LEVEL, MUSCLE_PER_LEVEL, FITNESS_PER_LEVEL, PROFIT_PER_LEVEL,
} from './config.js';
import { clamp, lerp, hashRand, formatDuration } from './util.js';
import { isNight, growthMult, coinMult, AVG_GROWTH_MULT } from './daynight.js';
import {
  updatePowerups, boostSpeedMult, boostPowerMult, boostCoinMult, growthFrozen,
} from './powerups.js';
import { updateBosses, tryHitBoss, bossX } from './boss.js';
import { initTutorial, updateTutorial } from './tutorial.js';
import { freshState, saveState, loadState, clearSave, hasSave } from './save.js';
import { actions, initInput, onHotkey } from './input.js';
import { initRender, render, drawMinimap, viewWidth } from './render.js';
import {
  initUI, updateHUD, renderShop, toggleShop, closeShop, isShopOpen, showWin, toast,
} from './ui.js';
import {
  initAudio, setMuted, isMuted, sfxSnip, sfxCoin, sfxJump, sfxDeath, sfxBossDown,
} from './sound.js';

// ---------- state ----------

let state;
let started = false;
let camX = 0;
let time = 0;
let saveTimer = 0;
let statTimer = 0;
let smokeTimer = 0;
let lastCoinSfx = 0;
let growPtr = 0;

const loaded = loadState();
if (loaded.state) {
  state = loaded.state;
  if (loaded.offlineSeconds > 90) {
    state.cycleT = (state.cycleT + loaded.offlineSeconds) % CYCLE_LENGTH;
    applyGrowth(loaded.offlineSeconds * AVG_GROWTH_MULT);
    toast(`🌱 While you were away (${formatDuration(loaded.offlineSeconds)}), the grass kept growing…`);
  }
} else {
  state = freshState();
}
attachRuntime(state);
let wasNight = isNight(state.cycleT);

function attachRuntime(s) {
  // runtime-only fields (never saved)
  s.player = {
    x: s.playerX, y: GROUND_Y, vx: 0, vy: 0,
    onGround: true, facing: 1, walkPhase: 0, mowing: false, stun: 0,
  };
  s.damage = new Map();
  s.particles = [];
  s.popups = [];
  s.pickups = [];
  s.deathFlash = 0;
  s.mowedPct = 0;
  for (const cfg of BOSSES) {
    if (!s.bosses[cfg.id]) s.bosses[cfg.id] = { hp: cfg.hp, dead: false };
  }
  recountMowed(s);
}

function recountMowed(s) {
  let mowed = 0;
  for (let i = 0; i < WORLD_TILES; i++) if (s.grass[i] < 1) mowed++;
  s.mowedCount = mowed;
  s.mowedPct = (mowed / WORLD_TILES) * 100;
}

function growthRate(i) {
  return (1 - GROW_JITTER + 2 * GROW_JITTER * hashRand(i, 1)) / GROW_TIME;
}

function applyGrowth(seconds) {
  for (let i = 0; i < WORLD_TILES; i++) {
    state.grass[i] = Math.min(MAX_STAGE, state.grass[i] + growthRate(i) * seconds);
  }
}

// ---------- derived stats ----------

function toolPower() {
  const tool = TOOLS_BY_ID[state.toolId];
  const sharpen = state.ownedTools[state.toolId] ?? 0;
  const muscle = 1 + MUSCLE_PER_LEVEL * state.skills.muscle;
  return tool.power * (1 + SHARPEN_BONUS * sharpen) * muscle * boostPowerMult(state);
}

function walkSpeed() {
  return PLAYER.baseSpeed * (1 + SPEED_PER_LEVEL * state.skills.speed) * boostSpeedMult(state);
}

function grassSlowdown() {
  // the tallest grass you're standing in slows you down — fitness resists it
  const pl = state.player;
  const from = Math.max(0, Math.floor((pl.x - PLAYER.width) / TILE_W));
  const to = Math.min(WORLD_TILES - 1, Math.floor((pl.x + PLAYER.width) / TILE_W));
  let maxP = 0;
  for (let i = from; i <= to; i++) if (state.grass[i] > maxP) maxP = state.grass[i];
  if (maxP < 1) return 1;
  const resist = clamp(1 - FITNESS_PER_LEVEL * state.skills.fitness, 0.15, 1);
  return 1 - (maxP / MAX_STAGE) * MAX_SLOWDOWN * resist;
}

// ---------- update ----------

function update(dt) {
  const pl = state.player;

  // --- day / night ---
  if (dt > 0) {
    state.cycleT = (state.cycleT + dt) % CYCLE_LENGTH;
    const night = isNight(state.cycleT);
    if (night !== wasNight) {
      wasNight = night;
      toast(night
        ? '🌙 Night falls — the grass dozes off, and cuts pay +50% 💰'
        : '🌞 Sunrise! You can see again… and so can the grass. It grows faster.');
    }
  }

  // --- movement ---
  const dir = (actions.right ? 1 : 0) - (actions.left ? 1 : 0);
  if (dir !== 0) pl.facing = dir;
  let targetVx = dir * walkSpeed() * grassSlowdown() * (pl.mowing ? PLAYER.mowSpeedMult : 1);
  if (pl.stun > 0) {
    pl.stun -= dt;
    targetVx = 0; // still reeling from a boss shove
  }
  pl.vx += clamp(targetVx - pl.vx, -PLAYER.accel * dt, PLAYER.accel * dt);
  pl.x = clamp(pl.x + pl.vx * dt, PLAYER.width, WORLD_W - PLAYER.width);
  state.playerX = pl.x;

  if (actions.jumpPressed && pl.onGround) {
    pl.vy = -PLAYER.jumpVel;
    pl.onGround = false;
    sfxJump();
  }
  actions.jumpPressed = false;
  if (!pl.onGround) {
    pl.vy += PLAYER.gravity * dt;
    pl.y += pl.vy * dt;
    if (pl.y >= GROUND_Y) { pl.y = GROUND_Y; pl.vy = 0; pl.onGround = true; }
  }
  pl.walkPhase += Math.abs(pl.vx) * dt * 0.09;

  // --- bosses (shoves, snaps, regen) ---
  if (dt > 0) updateBosses(state, dt, time, bossHooks);

  // --- grass growth (round-robin so each frame stays cheap) ---
  const gm = growthFrozen(state) ? 0 : growthMult(state.cycleT);
  const CHUNK = 128;
  const factor = WORLD_TILES / CHUNK;
  if (gm > 0) for (let n = 0; n < CHUNK; n++) {
    const i = growPtr;
    growPtr = (growPtr + 1) % WORLD_TILES;
    const g = state.grass[i];
    if (g < MAX_STAGE) {
      const ng = Math.min(MAX_STAGE, g + growthRate(i) * dt * factor * gm);
      state.grass[i] = ng;
      if (g < 1 && ng >= 1) state.mowedCount--;
    }
  }

  // --- mowing ---
  pl.mowing = actions.mow && pl.onGround;
  if (pl.mowing) {
    const tool = TOOLS_BY_ID[state.toolId];
    const power = toolPower();
    const baseTile = Math.floor(pl.x / TILE_W);
    let hitSomething = tryHitBoss(state, dt, time, power, tool.reach, bossHooks) === 'hit';

    for (let r = 0; r <= tool.reach; r++) {
      const i = baseTile + pl.facing * r;
      if (i < 0 || i >= WORLD_TILES) continue;
      const p = state.grass[i];
      if (p < 1) continue;
      hitSomething = true;

      let entry = state.damage.get(i);
      if (!entry) { entry = { dmg: 0, t: time }; state.damage.set(i, entry); }
      entry.dmg += power * dt;
      entry.t = time;

      if (entry.dmg >= grassHp(p)) cutTuft(i, p);
    }

    if (hitSomething) sfxSnip();

    // engine smoke for motorized tools
    if (VEHICLE_TOOLS.has(state.toolId) || state.toolId === 'gas') {
      smokeTimer -= dt;
      if (smokeTimer <= 0) {
        smokeTimer = 0.13;
        state.particles.push({
          type: 'smoke',
          x: pl.x - pl.facing * 18, y: GROUND_Y - 30,
          vx: -pl.facing * 15 + (Math.random() - 0.5) * 10, vy: -25 - Math.random() * 15,
          rot: 0, vr: 0, size: 4 + Math.random() * 4,
          life: 0.9, maxLife: 0.9,
        });
      }
    }
  }

  // --- power-ups & tutorial ---
  if (dt > 0) updatePowerups(state, dt);
  updateTutorial(state); // polls state — must also run while the shop is open (dt=0)
  if (state.deathFlash > 0) state.deathFlash = Math.max(0, state.deathFlash - dt * 1.2);

  // --- particles & popups ---
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.life -= dt;
    if (p.life <= 0) { state.particles.splice(i, 1); continue; }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.type !== 'smoke') p.vy += 500 * dt;
    p.rot += p.vr * dt;
  }
  for (let i = state.popups.length - 1; i >= 0; i--) {
    const p = state.popups[i];
    p.life -= dt;
    p.y -= 34 * dt;
    if (p.life <= 0) state.popups.splice(i, 1);
  }

  // --- camera ---
  const vw = viewWidth();
  const target = clamp(pl.x + pl.facing * vw * 0.12 - vw / 2, 0, Math.max(0, WORLD_W - vw));
  camX = lerp(camX, target, 1 - Math.exp(-4 * dt));

  // --- periodic stats / minimap / win check ---
  statTimer -= dt;
  if (statTimer <= 0) {
    statTimer = 0.5;
    recountMowed(state);
    drawMinimap(document.getElementById('minimap'), state, camX);
    if (state.mowedCount === WORLD_TILES && !state.won) {
      state.won = true;
      celebrate();
      showWin();
      doSave();
    }
  }

  // --- autosave ---
  saveTimer -= dt;
  if (saveTimer <= 0) {
    saveTimer = SAVE_INTERVAL;
    doSave();
  }

  updateHUD();
}

function cutTuft(i, p) {
  const profit = 1 + PROFIT_PER_LEVEL * state.skills.profit;
  const coins = Math.max(1, Math.round(
    grassCoins(p) * profit * coinMult(state.cycleT) * boostCoinMult(state)));
  state.coins += coins;
  state.totalCut++;
  state.grass[i] = 0;
  state.mowedCount++;
  state.damage.delete(i);

  const x = i * TILE_W + TILE_W / 2;
  const h = 10 + (p / MAX_STAGE) * 66;

  state.popups.push({
    x, y: GROUND_Y - h - 12, text: `+${coins}`,
    life: 0.9, maxLife: 0.9, color: '#ffd75e',
  });

  const clipColors = ['#7ec850', '#5aa838', '#8be05a', '#4a9a2e'];
  const bits = Math.min(10, 4 + Math.round(p));
  for (let b = 0; b < bits; b++) {
    state.particles.push({
      type: 'clip',
      x: x + (Math.random() - 0.5) * TILE_W,
      y: GROUND_Y - Math.random() * h,
      vx: (Math.random() - 0.5) * 130 + state.player.facing * 40,
      vy: -60 - Math.random() * 120,
      rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 12,
      size: 4 + Math.random() * 4,
      life: 0.5 + Math.random() * 0.4, maxLife: 0.8,
      color: clipColors[b % clipColors.length],
    });
  }

  const now = performance.now();
  if (now - lastCoinSfx > 120) { lastCoinSfx = now; sfxCoin(); }
}

function celebrate() {
  const vw = viewWidth();
  const colors = ['#ffd75e', '#e86a6a', '#7ec850', '#8ecfff', '#f0f0f0'];
  for (let i = 0; i < 160; i++) {
    state.particles.push({
      type: 'clip',
      x: camX + Math.random() * vw,
      y: Math.random() * 200 - 150,
      vx: (Math.random() - 0.5) * 80,
      vy: 30 + Math.random() * 80,
      rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 10,
      size: 5 + Math.random() * 6,
      life: 3 + Math.random() * 2, maxLife: 5,
      color: colors[i % colors.length],
    });
  }
}

// ---------- bosses ----------

const bossHooks = {
  kill(cfg) {
    respawnPlayer(`💀 ${cfg.name} got you! Back to the start you go…`);
  },
  defeated(cfg) {
    state.coins += cfg.reward;
    toast(`🏆 ${cfg.name} defeated! +${cfg.reward.toLocaleString()} 💰 The path is clear.`);
    sfxBossDown();
    const x = bossX(cfg);
    state.popups.push({
      x, y: GROUND_Y - 130, text: `+${cfg.reward.toLocaleString()}`,
      life: 1.6, maxLife: 1.6, color: '#ffd75e',
    });
    const colors = ['#ffd75e', '#7ec850', '#8be05a', '#f0f0f0'];
    for (let i = 0; i < 50; i++) {
      state.particles.push({
        type: 'clip',
        x: x + (Math.random() - 0.5) * 80,
        y: GROUND_Y - Math.random() * 100,
        vx: (Math.random() - 0.5) * 260,
        vy: -120 - Math.random() * 200,
        rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 12,
        size: 4 + Math.random() * 5,
        life: 0.8 + Math.random() * 0.8, maxLife: 1.6,
        color: colors[i % colors.length],
      });
    }
    doSave();
  },
  popup(x, text) {
    state.popups.push({ x, y: GROUND_Y - 120, text, life: 1, maxLife: 1, color: '#fff' });
  },
};

function respawnPlayer(msg) {
  const pl = state.player;
  pl.x = state.playerX = WORLD_W * 0.05;
  pl.vx = 0; pl.vy = 0; pl.y = GROUND_Y; pl.onGround = true;
  pl.stun = 0.5;
  state.deathFlash = 1;
  camX = clamp(pl.x - viewWidth() / 2, 0, Math.max(0, WORLD_W - viewWidth()));
  sfxDeath();
  toast(msg);
  doSave();
}

// ---------- persistence ----------

function doSave() {
  state.muted = isMuted();
  saveState(state);
}

function resetGame() {
  clearSave();
  state = freshState();
  attachRuntime(state);
  wasNight = isNight(state.cycleT);
  camX = 0;
  renderShop();
  updateHUD(true);
  toast('🌱 Fresh lawn, fresh start. Good luck!');
}

// ---------- boot ----------

const canvas = document.getElementById('game');
initRender(canvas);
camX = clamp(state.player.x - viewWidth() / 2, 0, Math.max(0, WORLD_W - viewWidth()));
initInput(canvas);
initUI({ get state() { return state; }, save: doSave, resetGame });
initTutorial({ get state() { return state; }, save: doSave });

// keep Space/Enter for gameplay: don't leave clicked buttons focused
document.addEventListener('click', (e) => {
  if (e.target instanceof HTMLButtonElement) e.target.blur();
});

setMuted(state.muted);
updateSoundBtn();
updateHUD(true);

// start screen
const startOverlay = document.getElementById('start-overlay');
const saveNote = document.getElementById('save-note');
saveNote.textContent = hasSave()
  ? `Save found — your lawn is ${state.mowedPct.toFixed(1)}% mowed. It missed you.`
  : `A wild ${WORLD_TILES.toLocaleString()}-tile meadow awaits. Progress auto-saves in your browser.`;

document.getElementById('btn-start').addEventListener('click', () => {
  initAudio();
  started = true;
  startOverlay.classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
});

// hotkeys & buttons
onHotkey('any', () => initAudio());
onHotkey('shop', () => { if (started) toggleShop(); });
onHotkey('fullscreen', toggleFullscreen);
onHotkey('mute', toggleMute);
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape') closeShop();
});

document.getElementById('btn-sound').addEventListener('click', toggleMute);
document.getElementById('btn-fullscreen').addEventListener('click', toggleFullscreen);

function toggleMute() {
  setMuted(!isMuted());
  updateSoundBtn();
  doSave();
}

function updateSoundBtn() {
  document.getElementById('btn-sound').textContent = isMuted() ? '🔇' : '🔊';
}

function toggleFullscreen() {
  const doc = document;
  const el = doc.documentElement;
  const request = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!request) return;
  if (doc.fullscreenElement || doc.webkitFullscreenElement) {
    (doc.exitFullscreen || doc.webkitExitFullscreen).call(doc);
  } else {
    Promise.resolve(request.call(el)).then(() => {
      // best effort: lock to landscape on mobile
      try { screen.orientation?.lock?.('landscape').catch(() => {}); } catch { /* ignore */ }
    }).catch(() => {});
  }
}

// hide the fullscreen button where the API doesn't exist (iPhone Safari)
if (!document.documentElement.requestFullscreen && !document.documentElement.webkitRequestFullscreen) {
  document.getElementById('btn-fullscreen').style.display = 'none';
}

// save when leaving
window.addEventListener('pagehide', doSave);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') doSave();
});

// ---------- main loop ----------

let lastNow = performance.now();

function frame(now) {
  const dtRaw = (now - lastNow) / 1000;
  lastNow = now;
  time += Math.min(dtRaw, 0.1);

  if (dtRaw > 2) {
    // tab was asleep — grass grew the whole time (at the day/night average rate)
    state.cycleT = (state.cycleT + dtRaw) % CYCLE_LENGTH;
    applyGrowth(dtRaw * AVG_GROWTH_MULT);
    recountMowed(state);
  } else if (started && !isShopOpen()) {
    update(Math.min(dtRaw, 0.05));
  } else if (started) {
    // shop open: world keeps growing, player stands still
    update(0);
    const gm = growthFrozen(state) ? 0 : growthMult(state.cycleT);
    applyGrowth(Math.min(dtRaw, 0.05) * gm);
  }

  render(state, camX, time);
  requestAnimationFrame(frame);
}

drawMinimap(document.getElementById('minimap'), state, camX);
requestAnimationFrame(frame);

// small debug handle (also used by automated tests)
window.__MOWME__ = { get state() { return state; }, actions };
