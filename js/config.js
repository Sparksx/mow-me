// All game balance & world constants live here.

// ---- world ----
export const TILE_W = 26;              // px per grass tuft
export const WORLD_TILES = 3200;       // number of tufts — the whole job
export const WORLD_W = TILE_W * WORLD_TILES;
export const VIEW_H = 540;             // design-space view height (px)
export const GROUND_Y = 430;           // y of the grass line in design space

// ---- grass ----
export const MAX_STAGE = 5;
export const GROW_TIME = 75;           // avg seconds to grow one stage
export const GROW_JITTER = 0.4;        // per-tuft rate varies ±40%

// HP a tuft has at growth progress p (p >= 1 means cuttable)
export function grassHp(p) {
  return 4 * Math.pow(p, 1.5);
}

// coins for cutting a tuft at progress p (before profit multiplier)
export function grassCoins(p) {
  return Math.ceil(Math.pow(p, 1.5));
}

// how much tall grass slows walking: 0..1 fraction at max stage
export const MAX_SLOWDOWN = 0.6;

// ---- player ----
export const PLAYER = {
  baseSpeed: 165,     // px/s
  accel: 1400,
  jumpVel: 430,
  gravity: 1300,
  width: 22,
  height: 52,
  mowSpeedMult: 0.6,  // walking speed while mowing
};

// ---- tools ----
// power = grass HP shredded per second; reach = tiles cut ahead of you.
export const SHARPEN_MAX = 5;
export const SHARPEN_BONUS = 0.25;     // +25% power per sharpen level

export const TOOLS = [
  { id: 'scissors', name: 'Rusty Scissors', icon: '✂️', power: 9,   reach: 1, cost: 0,
    desc: 'They were in the shed. They are angry about it.' },
  { id: 'shears',   name: 'Garden Shears',  icon: '✄',  power: 16,  reach: 1, cost: 60,
    desc: 'Snip snip. Now with both blades.' },
  { id: 'sickle',   name: 'Sickle',         icon: '🔪', power: 26,  reach: 2, cost: 240,
    desc: 'Curved steel. The grass is nervous.' },
  { id: 'scythe',   name: 'Scythe',         icon: '🌾', power: 46,  reach: 3, cost: 800,
    desc: 'Grim reaper cosplay, but for lawns.' },
  { id: 'push',     name: 'Push Mower',     icon: '🛞', power: 80,  reach: 3, cost: 2400,
    desc: 'Cardio and lawn care in one.' },
  { id: 'gas',      name: 'Gas Mower',      icon: '⛽', power: 140, reach: 4, cost: 7000,
    desc: 'Loud, smelly, magnificent.' },
  { id: 'riding',   name: 'Riding Mower',   icon: '🏎️', power: 250, reach: 5, cost: 22000,
    desc: 'Sit down. Destroy grass. Living the dream.' },
  { id: 'tractor',  name: 'Mega Tractor',   icon: '🚜', power: 480, reach: 7, cost: 80000,
    desc: 'The grass tells its children stories about this.' },
];

export const TOOLS_BY_ID = Object.fromEntries(TOOLS.map(t => [t.id, t]));

// vehicles are drawn differently and rumble while mowing
export const VEHICLE_TOOLS = new Set(['riding', 'tractor']);
export const PUSHED_TOOLS = new Set(['push', 'gas']);

export function sharpenCost(tool, level) {
  const base = Math.max(20, Math.round(tool.cost * 0.35));
  return base * (level + 1);
}

// ---- character upgrades ----
export const SKILLS = [
  { id: 'speed',   name: 'Jogging Shoes', icon: '👟', max: 10, baseCost: 50,  costMult: 1.9,
    desc: '+8% walking speed per level' },
  { id: 'muscle',  name: 'Muscles',       icon: '💪', max: 10, baseCost: 80,  costMult: 1.9,
    desc: '+12% mowing power per level' },
  { id: 'fitness', name: 'Fitness',       icon: '🏃', max: 10, baseCost: 60,  costMult: 1.9,
    desc: 'Tall grass slows you 8% less per level' },
  { id: 'profit',  name: 'Green Thumb',   icon: '🌻', max: 10, baseCost: 100, costMult: 2.0,
    desc: '+15% coins per cut per level' },
];

export const SKILLS_BY_ID = Object.fromEntries(SKILLS.map(s => [s.id, s]));

export function skillCost(skill, level) {
  return Math.round(skill.baseCost * Math.pow(skill.costMult, level));
}

export const SPEED_PER_LEVEL   = 0.08;
export const MUSCLE_PER_LEVEL  = 0.12;
export const FITNESS_PER_LEVEL = 0.08;
export const PROFIT_PER_LEVEL  = 0.15;

// ---- persistence ----
export const SAVE_KEY = 'mowme-save-v1';
export const SAVE_INTERVAL = 5; // seconds
