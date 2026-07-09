import { WORLD_TILES, WORLD_W, MAX_STAGE, SAVE_KEY } from './config.js';
import { hashRand, clamp } from './util.js';

// grass progress is quantized to 0.05 steps and stored one char per tuft
const Q = 20; // quantization steps per stage
const CHAR0 = 40; // first charcode used

function encodeGrass(grass) {
  let out = '';
  for (let i = 0; i < grass.length; i++) {
    out += String.fromCharCode(CHAR0 + Math.round(clamp(grass[i], 0, MAX_STAGE) * Q));
  }
  return out;
}

function decodeGrass(str) {
  const grass = new Float32Array(WORLD_TILES);
  const n = Math.min(str.length, WORLD_TILES);
  for (let i = 0; i < n; i++) {
    grass[i] = clamp((str.charCodeAt(i) - CHAR0) / Q, 0, MAX_STAGE);
  }
  // if the world grew between versions, fill new tiles with wild grass
  for (let i = n; i < WORLD_TILES; i++) {
    grass[i] = 2 + hashRand(i, 7) * (MAX_STAGE - 2);
  }
  return grass;
}

export function freshState() {
  // the world starts overgrown, except a tame "backyard" around the spawn
  const grass = new Float32Array(WORLD_TILES);
  const spawnTile = Math.floor(WORLD_TILES * 0.05);
  for (let i = 0; i < WORLD_TILES; i++) {
    const wild = 2 + hashRand(i, 7) * (MAX_STAGE - 2);
    const easy = 1 + hashRand(i, 7) * 1.5;
    const t = clamp(Math.abs(i - spawnTile) / 150, 0, 1);
    grass[i] = easy + (wild - easy) * t;
  }
  return {
    coins: 0,
    toolId: 'scissors',
    ownedTools: { scissors: 0 },   // id -> sharpen level
    skills: { speed: 0, muscle: 0, fitness: 0, profit: 0 },
    playerX: WORLD_W * 0.05,
    grass,
    totalCut: 0,
    won: false,
    muted: false,
    savedAt: Date.now(),
  };
}

export function saveState(state) {
  try {
    const data = {
      v: 1,
      coins: state.coins,
      toolId: state.toolId,
      ownedTools: state.ownedTools,
      skills: state.skills,
      playerX: Math.round(state.playerX),
      grass: encodeGrass(state.grass),
      totalCut: state.totalCut,
      won: state.won,
      muted: state.muted,
      savedAt: Date.now(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false; // storage full / blocked — game still playable
  }
}

// returns { state, offlineSeconds } — state is null when no valid save exists
export function loadState() {
  let raw = null;
  try { raw = localStorage.getItem(SAVE_KEY); } catch { /* blocked */ }
  if (!raw) return { state: null, offlineSeconds: 0 };
  try {
    const data = JSON.parse(raw);
    if (data.v !== 1) return { state: null, offlineSeconds: 0 };
    const state = freshState();
    state.coins = Math.max(0, Number(data.coins) || 0);
    state.toolId = typeof data.toolId === 'string' ? data.toolId : 'scissors';
    state.ownedTools = { scissors: 0, ...(data.ownedTools || {}) };
    if (!(state.toolId in state.ownedTools)) state.toolId = 'scissors';
    state.skills = { ...state.skills, ...(data.skills || {}) };
    state.playerX = clamp(Number(data.playerX) || 0, 0, WORLD_W);
    if (typeof data.grass === 'string') state.grass = decodeGrass(data.grass);
    state.totalCut = Math.max(0, Number(data.totalCut) || 0);
    state.won = !!data.won;
    state.muted = !!data.muted;
    state.savedAt = Number(data.savedAt) || Date.now();
    const offlineSeconds = Math.max(0, (Date.now() - state.savedAt) / 1000);
    return { state, offlineSeconds };
  } catch {
    return { state: null, offlineSeconds: 0 };
  }
}

export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
}

export function hasSave() {
  try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; }
}
