# 🌿 Mow Me — Roadmap & Long-Term Vision

## The vision

Mow Me is a cozy game with teeth. The lawn is the antagonist: it grows while you
sleep, it slows you down, and — starting now — it *fights back*. The long-term
goal is a game where every system feeds the same loop:

> mow → earn → upgrade → reach further → discover something new → mow more

…and where "100% mowed" stays a near-mythical achievement that players chase for
weeks, not minutes.

### Design pillars

1. **The lawn is alive.** Grass grows, weeds scheme, day turns to night,
   weather rolls in. The world never waits for the player.
2. **Progress you can see.** Every upgrade is visible on screen — bigger tools,
   wider swaths, farther light at night, bosses toppling.
3. **Any session length pays off.** 2 minutes or 2 hours, you always leave with
   coins, a new toy, or a boss down. Offline growth keeps the return visit interesting.
4. **Zero-asset web game.** Pure canvas + WebAudio, no downloads, loads
   instantly, runs on a phone. This is a feature — keep it.

---

## Phase 1 — Onboarding & a living sky ✅ *(shipped)*

Make the first minute welcoming and the world feel alive around the clock.

- ✅ **Mini tutorial** — a 5-step guided banner for new players (walk → mow →
  earn coins → open shop → first purchase), with a skip button and a coin
  reward at the end. Existing saves never see it.
- ✅ **Day / night cycle** — a full sun-and-moon cycle (~7 minutes) with
  trade-offs in both halves:
  - **Day** ☀️ — full visibility, but sunshine makes the grass grow *faster*.
  - **Night** 🌙 — the grass dozes (slower growth) and cuts pay **+50% coins**,
    but darkness closes in: you only see clearly in a circle of light around you.
  - Stars, a travelling sun/moon, fireflies, and a HUD clock showing time until
    the next switch.

## Phase 2 — Guardians & power-ups ✅ *(shipped)*

Give the meadow structure, danger, and toys.

- ✅ **Bosses** — three giant weeds anchored across the meadow, guarding the deep
  lawn. They **cannot be mowed** until you meet their requirements (tool tier +
  % mowed), which are displayed on approach:
  | Boss | Guards | Requirement | If you're not ready |
  | --- | --- | --- | --- |
  | 🌵 **Bramble Beast** | ~27% mark | Scythe | shoves you flying back |
  | 🌺 **Thistle Titan** | ~58% mark | Gas Mower + 20% mowed | shoves you back, hard |
  | 👑 **The Weed King** | ~86% mark | Riding Mower + 45% mowed | **eats you** — respawn at the start |
  Once unlocked, they become mowable boss fights: big HP pools, health bars,
  regeneration if you retreat, shove attacks mid-fight, and the Weed King's
  telegraphed snap attack that still kills. Rewards are big coin drops — and
  passage. Since bosses physically block the meadow, **100% mowed now requires
  defeating all three**.
- ✅ **Interactive boost pickups** — sparkling items spawn near the player and
  fade if ignored. Mow into them for temporary boosts (shown as HUD timers):
  - ☕ **Espresso** — +60% walking speed (25s)
  - 🪨 **Whetstone** — double mowing power (25s)
  - 🍀 **Golden Clover** — double coins (30s)
  - 🧊 **Frost Charm** — grass stops growing (45s)

## Phase 3 — Weather, wildlife & pests 🌦️

The sky and the soil get opinions.

- **Weather fronts**: rain (growth surge, but grass is softer: −25% HP), wind
  (clippings fly further, small speed push/penalty by direction), heatwave
  (growth pauses, you tire faster), fog (day visibility shrinks — night skills pay off).
- **Moles** 🕳️ — pop up mounds on your mowed lawn that regrow grass around them
  until whacked.
- **Gophers** 💰 — steal loose coins; chase them down for a bonus.
- **Bees & wasps** 🐝 — nest in tall grass; disturb them and get chased (slow +
  screen shake); smoke bomb consumable clears them.
- **Ladybug swarms** 🐞 — rare, follow one for a luck bonus (better power-up spawns).
- **Seasons** as long arcs over real days: spring (fast growth), summer
  (normal), autumn (leaves to rake — new resource), winter (growth nearly
  stops — the one time 100% is realistic… but snow hides the grass).

## Phase 4 — Beyond the fence 🚪

The world stops being one long strip.

- **Biomes** unlocked by defeating bosses: the Swamp (soggy, slow, rich),
  the Golf Course (precision mowing contracts), the Haunted Garden (night-only,
  ghost grass), the Alpine Meadow (thin air: stamina matters).
- **Tool sheds as checkpoints** — fast travel between discovered sheds; boss
  deaths respawn you at the nearest shed instead of the start (Quality of Life
  earned through progress).
- **Gates & keys** — some areas need boss trophies or contract reputation.
- **Landmarks & secrets** — buried treasure under suspicious tufts, a gnome
  village, an abandoned mower to restore.

## Phase 5 — Automation & economy 🤖

Idle-game depth for long-haul players.

- **Robot mowers** — buy, place, and upgrade little roombas that patrol a zone.
- **Goat herd** 🐐 — cheap, chaotic, eats grass *and* your flowers.
- **Consumables** — fertilizer (grow grass on purpose for profit), pesticide,
  sprinkler jammers, smoke bombs.
- **Grass market** — coin value per cut fluctuates; sell stockpiled clippings
  when prices spike.
- **Neighbor contracts** — timed quests ("clear tiles 800–950 before dusk") for
  premium pay and reputation.
- **Prestige — "New Lawn+"** — reset the meadow for Turf Tokens: permanent
  multipliers, cosmetic unlocks, and new world modifiers.

## Phase 6 — Delight & longevity ✨

- **Achievements & stats page** — lifetime tufts cut, distance walked, deaths
  to the Weed King.
- **Daily challenge** — a seeded modifier run (double growth, night-only, tiny
  tool) with a leaderboard.
- **Cosmetics** — hats, mower paint jobs, trail effects. Pure flex.
- **Music & ambience** — procedural chiptune that shifts day/night.
- **Gamepad support**, remappable keys, reduced-motion mode.
- **PWA install & cloud save** — play offline, share save codes between devices.
- **Localization** — FR 🇫🇷 first.
- **Photo mode** — because a freshly striped lawn at sunset deserves it.

### Icebox 🧊 (wild ideas welcome)

Grass-golf minigame · speedrun mode ("mow 5% from a fresh lawn") · roguelite
"Overgrown Dungeon" basement · co-op mowing · a rival NPC mower who "helps" by
stealing your coins-per-cut · lawn stripes that spell words for screenshots.

---

## Engineering notes (continuous)

- **Save compatibility**: new fields are optional with safe defaults; bump
  `SAVE_KEY` only for breaking shape/world changes. Keep a migration path.
- **Performance budget**: 60 fps on a mid phone — keep per-frame allocation low,
  keep the round-robin growth pattern, cull everything off-screen.
- **Testing**: headless-browser smoke test (boot, mow, buy, boss shove, save)
  before each release; `window.__MOWME__` stays the automation handle.
