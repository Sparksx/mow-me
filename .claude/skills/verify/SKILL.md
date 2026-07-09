---
name: verify
description: Build/launch/drive recipe to verify Mow Me changes end-to-end in a headless browser.
---

# Verifying Mow Me

Plain static site with ES modules — no build step. It only needs an HTTP
server (`file://` won't load modules).

## Launch

```bash
python3 -m http.server 8123   # from the repo root
```

## Drive

Use Playwright (globally installed; Chromium pre-provisioned via
`PLAYWRIGHT_BROWSERS_PATH`). Resolve the global module with
`NODE_PATH=$(npm root -g) node script.cjs`.

- `window.__MOWME__` is the automation handle: `{ state, actions }`.
  Mutate `state` directly (coins, cycleT, player.x, bosses, pickups…) and set
  `actions.mow = true` to mow programmatically.
- Click `#btn-start` to get past the start overlay before anything runs.
- Keyboard: `keyboard.down('d')` walk, `' '` mow, `'w'` jump, `'b'` shop.
- Game math modules are importable in-page for exact checks:
  `page.evaluate(() => import('/js/daynight.js').then(m => m.coinMult(370)))`.

## Gotchas

- **pagehide autosave**: navigating away saves the current game over
  localStorage. To inject a crafted save, first `page.goto('/ROADMAP.md')`
  (static page, no game JS), set localStorage there, then goto the game.
- Dead bosses don't shove — revive via `state.bosses.<id> = {hp, dead:false}`
  before testing collision.
- Tall grass slows walking a lot; place the player close (≤120px) to a boss
  before walking into its shove radius, or the timeout hits first.
- Toasts (`#toasts` innerText) disappear after ~3.8s — assert promptly.

## Flows worth driving

Fresh boot + tutorial steps (walk → mow → 60 coins → shop → buy), day→night
flip (`state.cycleT = 0.75 * 420`, check `#hud-daynight` + toast), power-up
collect (push into `state.pickups`), locked-boss shove + kill/respawn
(Weed King at tile 2750 kills within ~55px), boss fight (equip scythe, lower
boss hp, hold `actions.mow`), reload persistence (wait >5s for autosave),
legacy/corrupt save handling.
