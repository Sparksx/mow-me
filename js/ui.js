import {
  TOOLS, TOOLS_BY_ID, SKILLS, SHARPEN_MAX, SHARPEN_BONUS,
  sharpenCost, skillCost,
} from './config.js';
import { formatCoins } from './util.js';
import { sfxBuy, sfxError } from './sound.js';

const $ = (id) => document.getElementById(id);

let game = null; // set by initUI: { state, save, resetGame }

export function initUI(g) {
  game = g;

  $('btn-shop').addEventListener('click', toggleShop);
  $('btn-shop-close').addEventListener('click', closeShop);
  $('shop-overlay').addEventListener('click', (e) => {
    if (e.target === $('shop-overlay')) closeShop();
  });

  for (const btn of document.querySelectorAll('.tab-btn')) {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
      $('tab-tools').classList.toggle('hidden', btn.dataset.tab !== 'tools');
      $('tab-skills').classList.toggle('hidden', btn.dataset.tab !== 'skills');
    });
  }

  $('btn-reset').addEventListener('click', () => {
    if (confirm('Really wipe your save and start over? The grass wins this round.')) {
      game.resetGame();
      closeShop();
    }
  });

  $('btn-win-close').addEventListener('click', () => $('win-overlay').classList.add('hidden'));
}

export function toggleShop() {
  if ($('shop-overlay').classList.contains('hidden')) openShop();
  else closeShop();
}

export function openShop() {
  $('shop-overlay').classList.remove('hidden');
  renderShop();
}

export function closeShop() {
  $('shop-overlay').classList.add('hidden');
}

export function isShopOpen() {
  return !$('shop-overlay').classList.contains('hidden');
}

function tryBuy(cost, fn) {
  const s = game.state;
  if (s.coins < cost) { sfxError(); toast('Not enough coins! 💸'); return; }
  s.coins -= cost;
  fn();
  sfxBuy();
  game.save();
  renderShop();
  updateHUD(true);
}

// ---------- shop rendering ----------

export function renderShop() {
  const s = game.state;
  $('shop-coins').textContent = `💰 ${formatCoins(s.coins)}`;

  const toolsEl = $('tab-tools');
  toolsEl.innerHTML = '';
  for (const tool of TOOLS) {
    const owned = tool.id in s.ownedTools;
    const equipped = s.toolId === tool.id;
    const level = s.ownedTools[tool.id] ?? 0;
    const power = Math.round(tool.power * (1 + SHARPEN_BONUS * level));

    const item = document.createElement('div');
    item.className = 'shop-item' + (owned ? '' : ' locked');

    const actions = [];
    if (!owned) {
      actions.push(btn('buy-btn', `Buy 💰 ${formatCoins(tool.cost)}`, s.coins >= tool.cost, () =>
        tryBuy(tool.cost, () => {
          s.ownedTools[tool.id] = 0;
          s.toolId = tool.id;
          toast(`${tool.icon} ${tool.name} equipped!`);
        })));
    } else if (!equipped) {
      actions.push(btn('equip-btn', 'Equip', true, () => {
        s.toolId = tool.id;
        game.save();
        renderShop();
        updateHUD(true);
      }));
    } else {
      const tag = document.createElement('span');
      tag.className = 'equipped-tag';
      tag.textContent = '✔ Equipped';
      actions.push(tag);
    }
    if (owned && level < SHARPEN_MAX) {
      const cost = sharpenCost(tool, level);
      actions.push(btn('buy-btn', `Sharpen 💰 ${formatCoins(cost)}`, s.coins >= cost, () =>
        tryBuy(cost, () => {
          s.ownedTools[tool.id]++;
          toast(`${tool.icon} ${tool.name} sharpened!`);
        })));
    }

    item.innerHTML = `
      <div class="item-icon">${tool.icon}</div>
      <div class="item-info">
        <div class="item-name">${tool.name}
          <span class="level-pips">${'●'.repeat(level)}${'○'.repeat(SHARPEN_MAX - level)}</span>
        </div>
        <div class="item-desc">${tool.desc}</div>
        <div class="item-desc">⚡ Power ${power} &nbsp;·&nbsp; ↔ Reach ${tool.reach}</div>
      </div>`;
    const act = document.createElement('div');
    act.className = 'item-actions';
    actions.forEach(a => act.appendChild(a));
    item.appendChild(act);
    toolsEl.appendChild(item);
  }

  const skillsEl = $('tab-skills');
  skillsEl.innerHTML = '';
  for (const skill of SKILLS) {
    const level = s.skills[skill.id] ?? 0;
    const item = document.createElement('div');
    item.className = 'shop-item';
    item.innerHTML = `
      <div class="item-icon">${skill.icon}</div>
      <div class="item-info">
        <div class="item-name">${skill.name}
          <span class="level-pips">${'●'.repeat(level)}${'○'.repeat(skill.max - level)}</span>
        </div>
        <div class="item-desc">${skill.desc}</div>
      </div>`;
    const act = document.createElement('div');
    act.className = 'item-actions';
    if (level < skill.max) {
      const cost = skillCost(skill, level);
      act.appendChild(btn('buy-btn', `Train 💰 ${formatCoins(cost)}`, s.coins >= cost, () =>
        tryBuy(cost, () => {
          s.skills[skill.id]++;
          toast(`${skill.icon} ${skill.name} level ${s.skills[skill.id]}!`);
        })));
    } else {
      const tag = document.createElement('span');
      tag.className = 'equipped-tag';
      tag.textContent = '★ MAX';
      act.appendChild(tag);
    }
    item.appendChild(act);
    skillsEl.appendChild(item);
  }
}

function btn(cls, label, enabled, onClick) {
  const b = document.createElement('button');
  b.className = cls;
  b.textContent = label;
  b.disabled = !enabled;
  b.addEventListener('click', onClick);
  return b;
}

// ---------- HUD ----------

let lastCoins = -1, lastPct = -1, lastTool = '';

export function updateHUD(force = false) {
  const s = game.state;
  if (force || s.coins !== lastCoins) {
    lastCoins = s.coins;
    $('hud-coins').textContent = `💰 ${formatCoins(s.coins)}`;
  }
  const tool = TOOLS_BY_ID[s.toolId];
  const toolLabel = `${tool.icon} ${tool.name}`;
  if (force || toolLabel !== lastTool) {
    lastTool = toolLabel;
    $('hud-tool').textContent = toolLabel;
  }
  const pct = s.mowedPct;
  if (force || pct !== lastPct) {
    lastPct = pct;
    $('hud-percent').textContent = `${pct.toFixed(1)}% mowed · 🌍 goal: 100%`;
  }
}

export function showWin() {
  $('win-overlay').classList.remove('hidden');
}

export function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  $('toasts').appendChild(el);
  setTimeout(() => el.remove(), 3800);
}
