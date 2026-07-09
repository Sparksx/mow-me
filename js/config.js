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
export const TOOL_INDEX = Object.fromEntries(TOOLS.map((t, i) => [t.id, i]));

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

// ---- day / night ----
export const CYCLE_LENGTH = 420;        // seconds for a full day+night cycle
export const DAY_FRACTION = 0.62;       // slice of the cycle that is daytime
export const DAY_GROWTH_MULT = 1.15;    // sunshine: grass grows faster by day
export const NIGHT_GROWTH_MULT = 0.45;  // grass dozes off at night
export const NIGHT_COIN_MULT = 1.5;     // night-shift pay for cutting in the dark
export const NIGHT_VISION_RADIUS = 290; // px of clear sight around the player at night

// ---- bosses ----
// Giant weeds that guard the deep meadow. They can't be harmed until you meet
// their requirements — until then they shove you away (or worse).
// attack: 'push' knocks the player back, 'kill' sends them back to the start.
export const BOSSES = [
  { id: 'bramble', name: 'Bramble Beast', icon: '🌵', tile: 850,
    hp: 1400, attack: 'push', minToolIdx: 3, minMowedPct: 0, reward: 800,
    desc: 'A snarling knot of thorns.' },
  { id: 'thistle', name: 'Thistle Titan', icon: '🌺', tile: 1850,
    hp: 6000, attack: 'push', minToolIdx: 5, minMowedPct: 20, reward: 5000,
    desc: 'Royalty among weeds. Rude, too.' },
  { id: 'weedking', name: 'The Weed King', icon: '👑', tile: 2750,
    hp: 20000, attack: 'kill', minToolIdx: 6, minMowedPct: 45, reward: 30000,
    desc: 'The lawn’s final boss. It bites.' },
];
export const BOSSES_BY_ID = Object.fromEntries(BOSSES.map(b => [b.id, b]));
export const BOSS_REGEN_DELAY = 4;    // seconds without damage before a boss heals
export const BOSS_REGEN_RATE = 0.025; // fraction of max HP healed per second

// ---- power-up pickups ----
export const POWERUPS = [
  { id: 'espresso',  icon: '☕', name: 'Espresso',      dur: 25, desc: '+60% walking speed' },
  { id: 'whetstone', icon: '🪨', name: 'Whetstone',     dur: 25, desc: 'double mowing power' },
  { id: 'clover',    icon: '🍀', name: 'Golden Clover', dur: 30, desc: 'double coins' },
  { id: 'frost',     icon: '🧊', name: 'Frost Charm',   dur: 45, desc: 'grass stops growing' },
];
export const POWERUPS_BY_ID = Object.fromEntries(POWERUPS.map(p => [p.id, p]));
export const POWERUP_MAX_ACTIVE = 2; // pickups existing in the world at once
export const POWERUP_TTL = 45;       // seconds before an uncollected pickup fades

// ---- tutorial ----
export const TUT_DONE = 99; // tutStep value meaning finished/skipped

// ---- persistence ----
export const SAVE_KEY = 'mowme-save-v1';
export const SAVE_INTERVAL = 5; // seconds
