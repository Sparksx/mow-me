import {
  TILE_W, WORLD_TILES, WORLD_W, VIEW_H, GROUND_Y, MAX_STAGE,
  PLAYER, VEHICLE_TOOLS, PUSHED_TOOLS,
  BOSSES, TOOLS, DAY_FRACTION, NIGHT_VISION_RADIUS, POWERUPS_BY_ID,
} from './config.js';
import { clamp, lerp, hashRand } from './util.js';
import { daylight, cyclePhase } from './daynight.js';

let canvas, ctx;
let cssW = 0, cssH = 0, scale = 1;

export function initRender(c) {
  canvas = c;
  ctx = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
}

export function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cssW = window.innerWidth;
  cssH = window.innerHeight;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  scale = (cssH / VIEW_H) * dpr;
}

// width of the visible world slice in design units
export function viewWidth() {
  return (cssW * (canvas.width / cssW)) / scale;
}

function grassColor(p, shade = 0) {
  // young grass is bright, old grass is dark and blueish
  const t = clamp(p / MAX_STAGE, 0, 1);
  const r = Math.round(lerp(139, 38, t) * (1 - shade));
  const g = Math.round(lerp(224, 122, t) * (1 - shade * 0.5));
  const b = Math.round(lerp(90, 48, t));
  return `rgb(${r},${g},${b})`;
}

// ---------- background ----------

const SKY_DAY = [[93, 180, 232], [168, 220, 242], [216, 240, 200]];
const SKY_NIGHT = [[10, 14, 42], [18, 26, 66], [26, 40, 58]];

function mixc(night, day, t, alpha = 1) {
  const r = Math.round(lerp(night[0], day[0], t));
  const g = Math.round(lerp(night[1], day[1], t));
  const b = Math.round(lerp(night[2], day[2], t));
  return alpha >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha})`;
}

function drawSky(time, cycleT) {
  const dl = daylight(cycleT);
  const vw = viewWidth();
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, mixc(SKY_NIGHT[0], SKY_DAY[0], dl));
  g.addColorStop(0.65, mixc(SKY_NIGHT[1], SKY_DAY[1], dl));
  g.addColorStop(1, mixc(SKY_NIGHT[2], SKY_DAY[2], dl));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, vw, VIEW_H);

  // stars fade in as daylight fades out
  if (dl < 0.75) {
    const a = (0.75 - dl) / 0.75;
    for (let i = 0; i < 42; i++) {
      const sx = hashRand(i, 201) * vw;
      const sy = hashRand(i, 202) * GROUND_Y * 0.75;
      const tw = 0.5 + 0.5 * Math.sin(time * (1 + hashRand(i, 203) * 2) + i);
      ctx.fillStyle = `rgba(255,255,240,${(0.25 + 0.55 * tw) * a})`;
      ctx.fillRect(sx, sy, 2, 2);
    }
  }

  // sun / moon travel their arc across the sky
  const p = cyclePhase(cycleT);
  if (p < DAY_FRACTION) {
    const t = p / DAY_FRACTION;
    drawSun(lerp(vw * 0.08, vw * 0.92, t), 170 - Math.sin(t * Math.PI) * 110, time);
  } else {
    const t = (p - DAY_FRACTION) / (1 - DAY_FRACTION);
    drawMoon(lerp(vw * 0.08, vw * 0.92, t), 160 - Math.sin(t * Math.PI) * 100);
  }
}

function drawSun(x, y, time) {
  ctx.fillStyle = '#ffe680';
  ctx.beginPath();
  ctx.arc(x, y, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,230,128,0.35)';
  ctx.beginPath();
  ctx.arc(x, y, 58 + Math.sin(time * 0.8) * 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawMoon(x, y) {
  ctx.fillStyle = '#e8ecf4';
  ctx.beginPath();
  ctx.arc(x, y, 30, 0, Math.PI * 2);
  ctx.fill();
  // craters
  ctx.fillStyle = 'rgba(160,170,190,0.55)';
  ctx.beginPath();
  ctx.arc(x - 9, y - 6, 6, 0, Math.PI * 2);
  ctx.arc(x + 8, y + 8, 4.5, 0, Math.PI * 2);
  ctx.arc(x + 11, y - 10, 3, 0, Math.PI * 2);
  ctx.fill();
  // halo
  ctx.fillStyle = 'rgba(220,230,255,0.14)';
  ctx.beginPath();
  ctx.arc(x, y, 44, 0, Math.PI * 2);
  ctx.fill();
}

function drawClouds(camX, time, dl) {
  const period = 1900;
  const vw = viewWidth();
  ctx.fillStyle = mixc([80, 90, 118], [255, 255, 255], dl, 0.85);
  for (let i = 0; i < 7; i++) {
    const wx = hashRand(i, 11) * period;
    const drift = time * (6 + hashRand(i, 12) * 8);
    let sx = ((wx - camX * 0.22 + drift) % period + period) % period - 150;
    if (sx > vw + 150) continue;
    const y = 50 + hashRand(i, 13) * 130;
    const s = 0.7 + hashRand(i, 14) * 0.8;
    cloud(sx, y, s);
  }
}

function cloud(x, y, s) {
  ctx.beginPath();
  ctx.arc(x, y, 26 * s, 0, Math.PI * 2);
  ctx.arc(x + 28 * s, y - 8 * s, 20 * s, 0, Math.PI * 2);
  ctx.arc(x + 52 * s, y + 2 * s, 23 * s, 0, Math.PI * 2);
  ctx.arc(x + 26 * s, y + 10 * s, 22 * s, 0, Math.PI * 2);
  ctx.fill();
}

function drawHills(camX, parallax, baseY, amp, freq, color) {
  const vw = viewWidth();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, VIEW_H);
  for (let sx = 0; sx <= vw + 24; sx += 24) {
    const wx = sx + camX * parallax;
    const y = baseY
      + Math.sin(wx * freq) * amp
      + Math.sin(wx * freq * 2.7 + 1.3) * amp * 0.35;
    ctx.lineTo(sx, y);
  }
  ctx.lineTo(vw + 24, VIEW_H);
  ctx.closePath();
  ctx.fill();
}

function drawGround(camX) {
  const vw = viewWidth();
  // dirt
  const g = ctx.createLinearGradient(0, GROUND_Y, 0, VIEW_H);
  g.addColorStop(0, '#7a5b34');
  g.addColorStop(0.25, '#6b4e2c');
  g.addColorStop(1, '#4a3520');
  ctx.fillStyle = g;
  ctx.fillRect(0, GROUND_Y, vw, VIEW_H - GROUND_Y);

  // pebbles (deterministic, world-anchored)
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  const first = Math.floor(camX / 90);
  for (let i = first; i < first + vw / 90 + 2; i++) {
    const px = i * 90 + hashRand(i, 21) * 70 - camX;
    const py = GROUND_Y + 18 + hashRand(i, 22) * (VIEW_H - GROUND_Y - 34);
    ctx.beginPath();
    ctx.ellipse(px, py, 4 + hashRand(i, 23) * 5, 2.5 + hashRand(i, 24) * 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---------- grass ----------

function drawGrass(state, camX, time) {
  const vw = viewWidth();
  const firstTile = Math.max(0, Math.floor(camX / TILE_W) - 1);
  const lastTile = Math.min(WORLD_TILES - 1, Math.ceil((camX + vw) / TILE_W) + 1);

  ctx.lineCap = 'round';

  for (let i = firstTile; i <= lastTile; i++) {
    const p = state.grass[i];
    const baseX = i * TILE_W - camX;

    // shake freshly-damaged tufts
    const dmg = state.damage.get(i);
    const shaking = dmg && (time - dmg.t) < 0.15 ? 2.5 : 0;

    if (p < 1) {
      // stubble
      ctx.strokeStyle = grassColor(0.4);
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let b = 0; b < 4; b++) {
        const bx = baseX + 3 + hashRand(i, b + 30) * (TILE_W - 6);
        const bh = 3 + hashRand(i, b + 40) * 4 + p * 4;
        ctx.moveTo(bx, GROUND_Y + 1);
        ctx.lineTo(bx + (hashRand(i, b + 50) - 0.5) * 3, GROUND_Y - bh);
      }
      ctx.stroke();
      continue;
    }

    const h = 10 + (p / MAX_STAGE) * 66;
    const blades = 5;
    for (let b = 0; b < blades; b++) {
      const bx = baseX + 2 + hashRand(i, b + 60) * (TILE_W - 4);
      const bh = h * (0.65 + hashRand(i, b + 70) * 0.35);
      const sway = Math.sin(time * 1.4 + i * 0.7 + b * 1.9) * (2 + bh * 0.06)
        + (shaking ? Math.sin(time * 60 + b) * shaking : 0);
      const lean = (hashRand(i, b + 80) - 0.5) * 8;

      ctx.strokeStyle = grassColor(p, hashRand(i, b + 90) * 0.25);
      ctx.lineWidth = 2 + (p / MAX_STAGE) * 1.6;
      ctx.beginPath();
      ctx.moveTo(bx, GROUND_Y + 1);
      ctx.quadraticCurveTo(bx + lean * 0.4, GROUND_Y - bh * 0.6, bx + lean + sway, GROUND_Y - bh);
      ctx.stroke();

      // seed heads on very old grass
      if (p > 4.4 && b === 2 && hashRand(i, 5) > 0.4) {
        ctx.fillStyle = '#d8c96a';
        ctx.beginPath();
        ctx.ellipse(bx + lean + sway, GROUND_Y - bh - 3, 3, 6, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // occasional wildflower in mature grass
    if (p > 3.4 && hashRand(i, 6) > 0.88) {
      const fx = baseX + TILE_W / 2 + (hashRand(i, 61) - 0.5) * 10;
      const fh = h * 0.7;
      ctx.fillStyle = hashRand(i, 62) > 0.5 ? '#e86a6a' : '#f0f0f0';
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(fx + Math.cos(a) * 3.4, GROUND_Y - fh + Math.sin(a) * 3.4, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#f5c542';
      ctx.beginPath();
      ctx.arc(fx, GROUND_Y - fh, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ---------- player & tools ----------

function drawPlayer(state, camX, time) {
  const pl = state.player;
  const x = pl.x - camX;
  const feetY = pl.y;
  const f = pl.facing;
  const walk = pl.walkPhase;
  const moving = Math.abs(pl.vx) > 10;
  const swing = pl.mowing ? Math.sin(time * 18) : 0;

  ctx.save();
  ctx.translate(x, feetY);
  ctx.scale(f, 1);

  const toolId = state.toolId;
  const isVehicle = VEHICLE_TOOLS.has(toolId);
  const isPushed = PUSHED_TOOLS.has(toolId);

  if (isVehicle) {
    drawVehicle(toolId, pl.mowing, time, moving);
  } else {
    // legs
    const legSwing = moving ? Math.sin(walk) * 9 : 0;
    ctx.strokeStyle = '#2a4b8f';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -26); ctx.lineTo(legSwing, -2);
    ctx.moveTo(0, -26); ctx.lineTo(-legSwing, -2);
    ctx.stroke();
    // shoes
    ctx.fillStyle = '#5a3a1a';
    ctx.beginPath();
    ctx.ellipse(legSwing + 2, -2, 6, 3.4, 0, 0, Math.PI * 2);
    ctx.ellipse(-legSwing + 2, -2, 6, 3.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // torso
    ctx.fillStyle = '#3f9b3f';
    roundRect(-8, -48, 16, 24, 6);

    // head
    ctx.fillStyle = '#f2c898';
    ctx.beginPath();
    ctx.arc(1, -56, 9, 0, Math.PI * 2);
    ctx.fill();
    // cap
    ctx.fillStyle = '#d84a3a';
    ctx.beginPath();
    ctx.arc(1, -58, 9, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(1, -60, 13, 4);
    // eye
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(5.5, -55, 1.6, 0, Math.PI * 2);
    ctx.fill();

    if (isPushed) {
      drawPushMower(toolId, pl.mowing, time);
      // arms to the handle
      ctx.strokeStyle = '#f2c898';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(2, -42); ctx.lineTo(16, -32);
      ctx.stroke();
    } else {
      drawHandTool(toolId, swing);
    }
  }

  ctx.restore();
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.fill();
}

function drawHandTool(toolId, swing) {
  // arm + tool pivot at the shoulder
  ctx.save();
  ctx.translate(4, -42);
  ctx.rotate(swing * 0.7 + 0.35);

  ctx.strokeStyle = '#f2c898';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(11, 8);
  ctx.stroke();

  ctx.translate(11, 8);
  if (toolId === 'scissors' || toolId === 'shears') {
    const s = toolId === 'shears' ? 1.4 : 1;
    const open = 0.25 + Math.abs(swing) * 0.35;
    ctx.strokeStyle = toolId === 'shears' ? '#9aa8b8' : '#8a7a5a';
    ctx.lineWidth = 3 * s;
    ctx.beginPath();
    ctx.moveTo(-4 * s, 4 * s); ctx.lineTo(14 * s * Math.cos(open), -14 * s * Math.sin(open) + 4);
    ctx.moveTo(-4 * s, -2 * s); ctx.lineTo(14 * s * Math.cos(-open), 14 * s * Math.sin(-open) - 2);
    ctx.stroke();
    ctx.fillStyle = '#c04a30';
    ctx.beginPath();
    ctx.arc(-5 * s, 1, 3.4 * s, 0, Math.PI * 2);
    ctx.fill();
  } else if (toolId === 'sickle') {
    ctx.strokeStyle = '#6b4e2c';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-2, 2); ctx.lineTo(6, -6); ctx.stroke();
    ctx.strokeStyle = '#c8d0d8';
    ctx.lineWidth = 3.4;
    ctx.beginPath(); ctx.arc(10, 2, 11, -Math.PI * 0.85, Math.PI * 0.25); ctx.stroke();
  } else if (toolId === 'scythe') {
    ctx.strokeStyle = '#6b4e2c';
    ctx.lineWidth = 4.4;
    ctx.beginPath(); ctx.moveTo(-6, -18); ctx.lineTo(8, 16); ctx.stroke();
    ctx.strokeStyle = '#c8d0d8';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(16, 6, 16, Math.PI * 0.35, Math.PI * 1.05); ctx.stroke();
  }
  ctx.restore();
}

function drawPushMower(toolId, mowing, time) {
  const rumble = mowing ? Math.sin(time * 55) * 1.2 : 0;
  ctx.save();
  ctx.translate(26, rumble);
  // handle back to the player
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(-12, -32); ctx.lineTo(6, -10);
  ctx.stroke();
  // deck
  ctx.fillStyle = toolId === 'gas' ? '#c03a2a' : '#3a7ac0';
  roundRect(0, -14, 26, 10, 3);
  if (toolId === 'gas') {
    ctx.fillStyle = '#333';
    roundRect(6, -21, 12, 8, 2); // engine
  }
  // wheels
  ctx.fillStyle = '#222';
  const spin = time * 10;
  wheel(4, -2, 4.5, spin);
  wheel(22, -2, 4.5, spin);
  ctx.restore();
}

function drawVehicle(toolId, mowing, time, moving) {
  const big = toolId === 'tractor';
  const s = big ? 1.35 : 1;
  const rumble = mowing ? Math.sin(time * 50) * 1.4 : 0;
  ctx.save();
  ctx.translate(0, rumble);

  // cutting deck
  ctx.fillStyle = '#444';
  roundRect(10 * s, -8, 26 * s, 6, 2);

  // body
  ctx.fillStyle = big ? '#3a8a3a' : '#c03a2a';
  roundRect(-22 * s, -26 * s, 44 * s, 16 * s, 5);
  // hood
  ctx.fillStyle = big ? '#2e6e2e' : '#a02a1e';
  roundRect(6 * s, -34 * s, 18 * s, 10 * s, 4);
  // exhaust
  if (big) {
    ctx.fillStyle = '#333';
    ctx.fillRect(8 * s, -46 * s, 4, 14 * s);
  }
  // seat
  ctx.fillStyle = '#333';
  roundRect(-20 * s, -36 * s, 10 * s, 12 * s, 3);
  // steering wheel
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(2 * s, -27 * s); ctx.lineTo(6 * s, -36 * s);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(6 * s, -37 * s, 4, 0, Math.PI * 2);
  ctx.stroke();

  // wheels
  const spin = time * (moving ? 9 : 0.5);
  ctx.fillStyle = '#222';
  wheel(-12 * s, -8 * s, big ? 13 : 10, spin);
  wheel(20 * s, -5 * s, big ? 8 : 6.5, spin);

  // driver on the seat
  ctx.fillStyle = '#3f9b3f';
  roundRect(-19 * s, -50 * s, 13, 18, 4);
  ctx.fillStyle = '#f2c898';
  ctx.beginPath();
  ctx.arc(-12 * s, -55 * s, 7.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d84a3a';
  ctx.beginPath();
  ctx.arc(-12 * s, -57 * s, 7.4, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(-12 * s, -59 * s, 11, 3.4);
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(-8 * s, -55 * s, 1.4, 0, Math.PI * 2);
  ctx.fill();
  // arm to the wheel
  ctx.strokeStyle = '#f2c898';
  ctx.lineWidth = 4.4;
  ctx.beginPath();
  ctx.moveTo(-12 * s, -44 * s); ctx.lineTo(4 * s, -36 * s);
  ctx.stroke();

  ctx.restore();
}

function wheel(x, y, r, spin) {
  ctx.save();
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#888';
  ctx.beginPath(); ctx.arc(x, y, r * 0.45, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#aaa';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x - Math.cos(spin) * r * 0.8, y - Math.sin(spin) * r * 0.8);
  ctx.lineTo(x + Math.cos(spin) * r * 0.8, y + Math.sin(spin) * r * 0.8);
  ctx.stroke();
  ctx.restore();
}

// ---------- bosses ----------

const BOSS_TOP = { bramble: 92, thistle: 150, weedking: 112 };

function drawBosses(state, camX, time) {
  const vw = viewWidth();
  for (const cfg of BOSSES) {
    const b = state.bosses?.[cfg.id];
    if (!b || b.dead) continue;
    const x = cfg.tile * TILE_W + TILE_W / 2 - camX;
    if (x < -170 || x > vw + 170) continue;
    const shake = b.lastHit != null && time - b.lastHit < 0.15 ? Math.sin(time * 70) * 2.5 : 0;
    const breathe = 1 + Math.sin(time * 1.6 + cfg.tile) * 0.02;

    ctx.save();
    ctx.translate(x + shake, GROUND_Y);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 2, 44, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.scale(breathe, 1);
    if (cfg.id === 'bramble') drawBramble();
    else if (cfg.id === 'thistle') drawThistle(time);
    else drawWeedKing(b, time);
    ctx.restore();

    drawBossUI(state, cfg, b, x);
  }
}

function bossEye(x, y, r = 4, color = '#ffd75e') {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.75, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#20180a';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawBramble() {
  // a snarling knot of thorny vines
  ctx.fillStyle = '#2e4a1e';
  ctx.beginPath();
  ctx.arc(-18, -30, 24, 0, Math.PI * 2);
  ctx.arc(14, -34, 27, 0, Math.PI * 2);
  ctx.arc(0, -58, 22, 0, Math.PI * 2);
  ctx.arc(-2, -20, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1c3212';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI * i / 10;
    const ox = Math.cos(a) * 36;
    const oy = -34 - Math.sin(a) * 34;
    ctx.beginPath();
    ctx.moveTo(ox * 0.8, -34 + (oy + 34) * 0.8);
    ctx.lineTo(ox * 1.25, -34 + (oy + 34) * 1.3);
    ctx.stroke();
  }
  bossEye(-11, -40);
  bossEye(11, -42);
  // angry brows
  ctx.strokeStyle = '#141f0c';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-17, -48); ctx.lineTo(-5, -44);
  ctx.moveTo(17, -50); ctx.lineTo(5, -46);
  ctx.stroke();
}

function drawThistle(time) {
  const sway = Math.sin(time * 1.2) * 3;
  ctx.strokeStyle = '#3e6e2a';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-4, -60, sway, -108);
  ctx.stroke();
  // leaf arms
  ctx.fillStyle = '#4a8a30';
  for (const dir of [-1, 1]) {
    const y = dir < 0 ? -42 : -60;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.quadraticCurveTo(dir * 22, y - 8, dir * 34, y);
    ctx.quadraticCurveTo(dir * 18, y + 9, 0, y + 5);
    ctx.fill();
  }
  // spiky head
  ctx.save();
  ctx.translate(sway, -122);
  ctx.strokeStyle = '#5a4a80';
  ctx.lineWidth = 3;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 16, Math.sin(a) * 16);
    ctx.lineTo(Math.cos(a) * 29, Math.sin(a) * 29);
    ctx.stroke();
  }
  ctx.fillStyle = '#6a5a9a';
  ctx.beginPath();
  ctx.arc(0, 0, 22, 0, Math.PI * 2);
  ctx.fill();
  // magenta crest
  ctx.fillStyle = '#c05ac0';
  ctx.beginPath();
  ctx.ellipse(0, -18, 15, 10, 0, Math.PI, 0);
  ctx.fill();
  bossEye(-8, -3, 4, '#f0f0f0');
  bossEye(8, -3, 4, '#f0f0f0');
  ctx.strokeStyle = '#2a1a3a';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 14, 7, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
  ctx.restore();
}

function drawWeedKing(b, time) {
  const windup = b.phase === 'windup';
  const snap = b.phase === 'snap';
  ctx.save();
  ctx.translate(0, windup ? 3 : 0);
  // bushy mound body
  ctx.fillStyle = '#26421c';
  ctx.beginPath();
  ctx.arc(-26, -26, 26, 0, Math.PI * 2);
  ctx.arc(26, -26, 26, 0, Math.PI * 2);
  ctx.arc(0, -46, 34, 0, Math.PI * 2);
  ctx.arc(0, -22, 40, 0, Math.PI * 2);
  ctx.fill();
  // leafy tufts
  ctx.strokeStyle = '#1a3212';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI * i / 8;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 40, -30 - Math.sin(a) * 42);
    ctx.lineTo(Math.cos(a) * 48, -30 - Math.sin(a) * 54);
    ctx.stroke();
  }
  // crown
  ctx.fillStyle = '#ffd75e';
  ctx.beginPath();
  ctx.moveTo(-18, -76);
  ctx.lineTo(-18, -92); ctx.lineTo(-9, -80); ctx.lineTo(0, -94);
  ctx.lineTo(9, -80); ctx.lineTo(18, -92); ctx.lineTo(18, -76);
  ctx.closePath();
  ctx.fill();
  bossEye(-12, -52, 5, '#ff5040');
  bossEye(12, -52, 5, '#ff5040');
  // mouth full of teeth — opens wide before it bites
  const open = windup ? 14 : snap ? 20 : 5 + Math.sin(time * 2) * 2;
  ctx.fillStyle = '#3a0a12';
  ctx.beginPath();
  ctx.ellipse(0, -32, 18, open, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8e0c8';
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 7 - 3, -32 - open * 0.8);
    ctx.lineTo(i * 7 + 3, -32 - open * 0.8);
    ctx.lineTo(i * 7, -32 - open * 0.8 + 6);
    ctx.closePath();
    ctx.fill();
  }
  // vines lash out during the snap
  if (snap) {
    ctx.strokeStyle = '#2e4a1e';
    ctx.lineWidth = 5;
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(dir * 20, -20);
      ctx.quadraticCurveTo(dir * 80, -46, dir * 140, -10);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function outlineText(t, x, y, color) {
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillText(t, x + 1, y + 1);
  ctx.fillStyle = color;
  ctx.fillText(t, x, y);
}

function drawBossUI(state, cfg, b, x) {
  const dist = Math.abs(state.player.x - (cfg.tile * TILE_W + TILE_W / 2));
  if (dist > 340 && b.hp >= cfg.hp) return;
  const top = GROUND_Y - BOSS_TOP[cfg.id];
  ctx.textAlign = 'center';
  ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
  outlineText(`${cfg.icon} ${cfg.name}`, x, top - 24, '#fff');
  // hp bar
  const w = 84, h = 7;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(x - w / 2 - 1, top - 18, w + 2, h + 2);
  const frac = clamp(b.hp / cfg.hp, 0, 1);
  ctx.fillStyle = frac > 0.5 ? '#7ec850' : frac > 0.25 ? '#f0a830' : '#e04a3a';
  ctx.fillRect(x - w / 2, top - 17, w * frac, h);
  if (b.locked) {
    const tool = TOOLS[cfg.minToolIdx];
    ctx.font = 'bold 12px "Trebuchet MS", sans-serif';
    let hint = `🔒 needs ${tool.icon} ${tool.name}`;
    if (cfg.minMowedPct) hint += ` + ${cfg.minMowedPct}% mowed`;
    outlineText(hint, x, top - 42, '#ffd75e');
  } else if (b.phase === 'windup') {
    ctx.font = 'bold 26px "Trebuchet MS", sans-serif';
    outlineText('❗', x, top - 46, '#ff5040');
  }
}

// ---------- power-up pickups ----------

function drawPickups(state, camX, time) {
  if (!state.pickups?.length) return;
  const vw = viewWidth();
  ctx.textAlign = 'center';
  for (const pk of state.pickups) {
    const x = pk.x - camX;
    if (x < -40 || x > vw + 40) continue;
    const bob = Math.sin(time * 2.5 + pk.seed * 9) * 5;
    const y = GROUND_Y - 26 + bob;
    ctx.globalAlpha = pk.ttl < 8 ? 0.55 + 0.45 * Math.sin(time * 9) : 1;
    const g = ctx.createRadialGradient(x, y - 7, 2, x, y - 7, 22);
    g.addColorStop(0, 'rgba(255,235,140,0.75)');
    g.addColorStop(1, 'rgba(255,235,140,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y - 7, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '20px serif';
    ctx.fillText(POWERUPS_BY_ID[pk.type].icon, x, y);
    // orbiting sparkle
    const sa = time * 3 + pk.seed * 7;
    ctx.fillStyle = `rgba(255,255,255,${0.5 + 0.5 * Math.sin(sa * 2)})`;
    ctx.fillRect(x + Math.cos(sa) * 15 - 1, y - 8 + Math.sin(sa) * 12 - 1, 2, 2);
    ctx.globalAlpha = 1;
  }
}

// ---------- night ----------

function drawNightOverlay(state, camX, time) {
  const dark = 1 - daylight(state.cycleT ?? 0);
  if (dark < 0.03) return;
  const vw = viewWidth();
  const px = state.player.x - camX;
  const py = state.player.y - 34;
  const R = NIGHT_VISION_RADIUS;
  const g = ctx.createRadialGradient(px, py, R * 0.3, px, py, R);
  g.addColorStop(0, `rgba(8,12,34,${0.08 * dark})`);
  g.addColorStop(1, `rgba(6,9,28,${0.68 * dark})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, vw, VIEW_H);

  // fireflies
  if (dark > 0.45) {
    const fa = (dark - 0.45) / 0.55;
    for (let i = 0; i < 9; i++) {
      const span = vw * 1.2;
      const fx = ((hashRand(i, 401) * span + time * (5 + (i % 3) * 4)
        + Math.sin(time * 0.7 + i) * 30) % span) - vw * 0.1;
      const fy = GROUND_Y - 30 - hashRand(i, 402) * 130 + Math.sin(time * 1.3 + i * 2.2) * 18;
      const a = (0.35 + 0.65 * Math.abs(Math.sin(time * 1.8 + i * 1.7))) * fa;
      ctx.fillStyle = `rgba(220,255,120,${a})`;
      ctx.beginPath();
      ctx.arc(fx, fy, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(220,255,120,${a * 0.25})`;
      ctx.beginPath();
      ctx.arc(fx, fy, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ---------- particles & popups ----------

function drawParticles(particles, camX) {
  for (const p of particles) {
    const a = clamp(p.life / p.maxLife, 0, 1);
    if (p.type === 'smoke') {
      ctx.fillStyle = `rgba(120,120,120,${a * 0.4})`;
      ctx.beginPath();
      ctx.arc(p.x - camX, p.y, p.size * (2 - a), 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.save();
      ctx.translate(p.x - camX, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }
}

function drawPopups(popups, camX) {
  ctx.textAlign = 'center';
  ctx.font = 'bold 15px "Trebuchet MS", sans-serif';
  for (const p of popups) {
    const a = clamp(p.life / p.maxLife, 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = '#3a2a10';
    ctx.fillText(p.text, p.x - camX + 1, p.y + 1);
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, p.x - camX, p.y);
  }
  ctx.globalAlpha = 1;
}

// ---------- main render ----------

export function render(state, camX, time) {
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  const cycleT = state.cycleT ?? 0;
  drawSky(time, cycleT);
  drawClouds(camX, time, daylight(cycleT));
  drawHills(camX, 0.15, 330, 38, 0.0018, '#b8d89a');
  drawHills(camX, 0.35, 375, 30, 0.003, '#8cc272');
  drawGround(camX);
  drawGrass(state, camX, time);
  drawPickups(state, camX, time);
  drawBosses(state, camX, time);
  drawParticles(state.particles, camX);
  drawPlayer(state, camX, time);
  drawNightOverlay(state, camX, time);
  drawPopups(state.popups, camX);
  if (state.deathFlash > 0) {
    ctx.fillStyle = `rgba(190,20,20,${state.deathFlash * 0.45})`;
    ctx.fillRect(0, 0, viewWidth(), VIEW_H);
  }
}

// ---------- minimap ----------

export function drawMinimap(mini, state, camX) {
  const mctx = mini.getContext('2d');
  const w = mini.width, h = mini.height;
  mctx.clearRect(0, 0, w, h);
  const tilesPerCol = WORLD_TILES / w;
  for (let c = 0; c < w; c++) {
    const from = Math.floor(c * tilesPerCol);
    const to = Math.floor((c + 1) * tilesPerCol);
    let maxP = 0;
    for (let i = from; i < Math.max(to, from + 1); i++) maxP = Math.max(maxP, state.grass[i]);
    mctx.fillStyle = maxP < 1 ? '#8a6a3f' : grassColor(maxP);
    mctx.fillRect(c, 0, 1, h);
  }
  // living bosses
  for (const cfg of BOSSES) {
    if (state.bosses?.[cfg.id]?.dead) continue;
    mctx.fillStyle = '#ff4a3a';
    mctx.fillRect((cfg.tile / WORLD_TILES) * w - 1, 0, 3, h);
  }
  // viewport
  const vw = viewWidth();
  mctx.fillStyle = 'rgba(255,255,255,0.25)';
  mctx.fillRect((camX / WORLD_W) * w, 0, Math.max(2, (vw / WORLD_W) * w), h);
  // player
  mctx.fillStyle = '#fff';
  mctx.fillRect((state.player.x / WORLD_W) * w - 1, 0, 3, h);
}
