// Mini tutorial for fresh saves: a banner walks new players through the core
// loop (walk → mow → earn → shop → buy). Progress is state.tutStep (saved);
// TUT_DONE means finished or skipped. Steps are detected by polling game
// state, so nothing else needs to know the tutorial exists.

import { TUT_DONE } from './config.js';
import { isShopOpen, toast } from './ui.js';

const $ = (id) => document.getElementById(id);

const isTouch = window.matchMedia('(pointer: coarse)').matches;
const kb = (keys, touch) => (isTouch ? touch : keys);

let game = null;
let entered = false;   // has the current step's enter() run?
let shownStep = -1;
let moved = 0, lastX = 0, cutBase = 0;

const STEPS = [
  {
    text: () => `👣 Walk around — ${kb('A / D or ← →', 'the ◀ ▶ buttons')}`,
    enter: (s) => { moved = 0; lastX = s.player.x; },
    done: (s) => {
      moved += Math.abs(s.player.x - lastX);
      lastX = s.player.x;
      return moved > 140;
    },
  },
  {
    text: () => `✂️ Hold ${kb('SPACE', 'the MOW button')} to mow — cut 5 tufts`,
    enter: (s) => { cutBase = s.totalCut; },
    done: (s) => s.totalCut - cutBase >= 5,
  },
  {
    text: () => '💰 Taller grass pays more — collect 60 coins',
    done: (s) => s.coins >= 60,
  },
  {
    text: () => `🛒 Open the shop — ${kb('press B', 'tap 🛒 Shop')}`,
    done: () => isShopOpen(),
  },
  {
    text: () => '🧰 Buy anything — a new tool or some training',
    done: (s) => hasPurchase(s),
  },
];

function hasPurchase(s) {
  if (Object.keys(s.ownedTools).length > 1) return true;
  if (Object.values(s.ownedTools).some((lvl) => lvl > 0)) return true;
  return Object.values(s.skills).some((lvl) => lvl > 0);
}

export function initTutorial(g) {
  game = g;
  $('tut-skip').addEventListener('click', () => {
    game.state.tutStep = TUT_DONE;
    hide();
    toast('Tutorial skipped — the grass respects your confidence.');
    game.save();
  });
}

export function updateTutorial(state) {
  const step = state.tutStep;
  if (step >= STEPS.length) {
    if (step !== TUT_DONE) finish(state);
    else hide();
    return;
  }
  const s = STEPS[step];
  if (!entered) {
    entered = true;
    s.enter?.(state);
  }
  if (shownStep !== step) show(step);
  if (s.done(state)) {
    state.tutStep++;
    entered = false;
    if (state.tutStep >= STEPS.length) finish(state);
    game.save();
  }
}

function finish(state) {
  state.tutStep = TUT_DONE;
  state.coins += 100;
  toast('🎓 Tutorial complete! +100 💰 — now mow it ALL.');
  hide();
  game.save();
}

function show(step) {
  shownStep = step;
  $('tut-progress').textContent = `${step + 1}/${STEPS.length}`;
  $('tut-text').textContent = STEPS[step].text();
  $('tutorial').classList.remove('hidden');
}

function hide() {
  if (shownStep === -2) return;
  shownStep = -2;
  $('tutorial').classList.add('hidden');
}
