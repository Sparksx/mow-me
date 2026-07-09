# 🌿 Mow Me

A 2D side-scrolling grass-mowing game. Your mission: **mow everything**.

The catch: the world is a 3,200-tile meadow, the grass **never stops growing**
(even while you're away), and the taller it gets, the harder it is to cut —
and the more it slows you down when you wade through it. Reaching 100% mowed
is *nearly* impossible. Nearly.

Also in the meadow:

- 🌞🌙 **Day & night** — by day you see everything but the grass grows fast;
  by night growth slows and cuts pay **+50%**, but you only see clearly in a
  circle of light around you.
- 👹 **Bosses** — three giant weeds block the deep meadow. Until you meet
  their requirements (tool tier + % mowed) they can't be harmed: two shove you
  flying backwards, and the Weed King **eats you** (respawn at the start).
  Once unlocked they become proper fights — HP bars, regeneration, shoves and
  a telegraphed snap attack. Beating all three is required for 100%.
- ⚡ **Power-ups** — sparkling pickups spawn nearby and fade if ignored:
  ☕ speed, 🪨 double power, 🍀 double coins, 🧊 freeze grass growth.
- 🎓 A **mini tutorial** walks new players through the loop (skippable, and
  returning saves never see it).

See [ROADMAP.md](ROADMAP.md) for where the game is heading next.

## How to play

- **Move** — `A`/`D` or `←`/`→` (touch: on-screen arrows)
- **Mow** — hold `Space`, `J`, `X` or the mouse button (touch: MOW button)
- **Jump** — `W` / `↑`
- **Shop** — `B` · **Fullscreen** — `F` · **Mute** — `M`

Cutting grass earns coins — the taller the grass, the more it pays (it also
has more HP, so it takes longer to chew through). Spend coins in the shop:

- **Tools** — from Rusty Scissors to the Mega Tractor. Each tool has more
  power (cuts faster) and more reach (cuts a wider swath), and can be
  **sharpened** 5 times for +25% power each.
- **Training** — upgrade your character: walking speed, mowing power,
  resistance to tall-grass slowdown, and coins earned per cut.

Progress is saved automatically in your browser (`localStorage`), including
the growth state of every single tuft. Come back tomorrow — the lawn will
remember you, and it will have grown.

Works on desktop (with fullscreen) and on mobile in landscape, with touch
controls.

## Run locally

It's a plain static site using ES modules, so it just needs any web server:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

(Opening `index.html` directly via `file://` won't work — ES modules require HTTP.)

## Deploy to GitHub Pages

A workflow (`.github/workflows/deploy.yml`) deploys the site on every push to
the default branch:

1. In the repo settings, go to **Settings → Pages**.
2. Set **Source** to **GitHub Actions**.
3. Push (or re-run the workflow via **Actions → Deploy to GitHub Pages → Run workflow**).

The game will be live at `https://<user>.github.io/mow-me/`.

## Tweaking the game

All balance lives in [`js/config.js`](js/config.js): world size, grass growth
speed, grass HP/coin curves, tool stats, upgrade costs. The save format is
versioned (`SAVE_KEY`) — bump it if you change the world size or save shape.

## Code layout

| File | What it does |
| --- | --- |
| `js/config.js` | All constants & balance tables (tools, skills, bosses, power-ups, day/night) |
| `js/main.js` | Game state, physics, mowing/growth logic, main loop |
| `js/render.js` | Canvas rendering: world, grass, player, vehicles, bosses, night, minimap |
| `js/daynight.js` | Day/night cycle math: light level, growth & coin multipliers |
| `js/boss.js` | Boss behavior: locking, shoves, the Weed King's snap, fight damage |
| `js/powerups.js` | Power-up pickups & temporary boost effects |
| `js/tutorial.js` | New-player tutorial banner (polls game state) |
| `js/ui.js` | HUD, shop, toasts |
| `js/input.js` | Keyboard / mouse / touch input |
| `js/save.js` | localStorage persistence (grass packed 1 char per tuft) |
| `js/sound.js` | Tiny WebAudio sound effects, no assets |
