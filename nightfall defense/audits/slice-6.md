# Slice 6 audit: hero ponies

## What shipped

### Four heroes
Each map board has one hero slot. The hero cannot be killed, auto-attacks, moves where you send it, has 3 active abilities (Q/W/E, or touch buttons) and 1 passive aura.

| hero | role | attack | aura | Q | W | E | unlock |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Nova Quill | unicorn mage | splashing starlight bolts, hits flyers and magical DNBs | Scholar's Glow: ponies deal +damage | Starburst (12s): blasts the thickest knot and dispels magical DNBs | Revealing Light (18s): reveals every DNB within 220+30/rank, revealed DNBs take extra damage | Arcane Prison (26s): freezes DNBs within 150, shorter on bosses | free |
| Ironmane | earth pony tank | stomps every ground DNB in reach, no flyers | Stone Presence: nearby DNBs move slower, bosses half | Shield Breaker (10s): pierces any plate and pops every shield within 70 | Taunting Bellow (16s): area stun | Earthquake (24s): damage over time with a slow, and drags burrowed DNBs up | 15 Moonstones, or clear moonlit wave 25 |
| Skyflick | pegasus speedster | rapid wind darts, double on flyers, cannot harm magical DNBs, fastest mover | Tailwind: ponies attack faster | Cyclone Nova (11s): triple damage against swarms, with knockback | Lightning Strike (9s): chains across 4+rank DNBs | Gale Wall (20s): hurls flyers back and slows ground DNBs | 25 Moonstones, or clear woods wave 50 |
| Duskfang | bat pony assassin | heavy strikes on the strongest DNB, big crits, sees stealth | Night Eyes: nearby ponies see stealthed DNBs and gain crit chance | Assassinate (10s): finishes off non-boss DNBs left under 30% | Shadow Mark (15s): reveals the strongest DNBs, which take extra damage | Blood Frenzy (22s): attack speed x2.5 with +25% crit | 40 Moonstones, or a first star on any map |

- **How abilities interact with DNB types:**
  - Reveal: Revealing Light, Shadow Mark and Night Eyes.
  - Shield and plate break: Shield Breaker.
  - Anti-swarm: Cyclone Nova and Starburst.
  - Burrowers: Earthquake.
  - Flyers: Lightning and Gale Wall.
  - Magical DNBs: Starburst dispels them.
- **Casting:**
  - Abilities only cast during a wave. Pressing Q/W/E between waves shows the banner "Hero abilities work during a wave".
  - A cast with no target shows a notarget banner and keeps the cooldown.
  - The "Auto-cast" checkbox on the hero card lets the hero cast on its own using the same want rules as the bot.
- **Boss stuns:** sprinting, staged, twin and mother bosses roar every 9s and stun a hero within 260 for 1.6s.
  - Ironmane is stunned for only half as long.
  - Each stun plays a roar sound, shows a stun ring and banner, and stops the hero from moving, attacking or casting.

### Picking and moving
- **Picking:**
  - Open the picker with the hero card's "Pick a hero" or "Change hero" button, or the H key.
  - The picker shows a procedural portrait, role, blurb, aura, three abilities, current level and unlock cost or rule for each hero.
  - During a wave the button reads "Pick after this wave".
  - Each hero keeps its own level per map.
- **Moving:**
  - Click or tap the hero (or press H) to select it. The hint then reads "Tap or click the field to move".
  - Clicking open ground moves the hero. Clicking a pony selects the pony instead and leaves move mode.
  - Entering placement mode clears hero selection, so moving and placing never fight over the same click. Esc deselects.
- **Hero bar:**
  - The bar sits inside the board, bottom-left: portrait, level badge and three ability buttons.
  - Each button shows a conic cooldown sweep and remaining seconds, with ready and cooling states.
  - Buttons are at least 38px at 390px.

### Levels and ranks
- Levels 1 to 30 come from kill XP: `need(lv) = round(20 x 1.16^(lv-1))`.
  - A kill gives `1 + 0.04 x wave` XP.
  - Elites give 3x, bosses 20x, and the hero's own kills 2x.
  - Hero Academy adds +25% per level.
- **Stat growth per level:**
  - range +1.5%
  - attack rate +1.2%
  - power x1.02
  - aura radius +2
  - aura strength +0.3% (crit aura +0.15%)
- **Ranks at levels 5, 10, 20 and 30:**
  - every ability gets +25% power and better numbers: radius, duration, chain and mark count
  - cooldowns get 3% shorter per rank
- **Level-up:** a gold ring, rising text and a chime. Reaching a new rank also shows a banner ("X reached level N! Abilities and aura upgraded").
- **Hero card:** "Level N / 30 · Rank r (next at k)", an XP bar, the aura line and the ability list with live numbers.

### Unlocks and research
- Nova Quill is free. The others unlock with Moonstones from the picker, or by their milestone. Milestones are checked on wave clears, star-ups and load.
- Two research nodes, for 32 in total:
  - **Heroic Legends** (Abilities, 3 levels): +15% hero damage and 8% shorter hero cooldowns per level.
  - **Hero Academy** (Utility, 3 levels): +25% hero XP per level.

### Star-up
- Star-up resets that map's hero level and XP to level 1 and resets cooldowns. The chosen hero and every unlock stay.
- The star dialog adds a line under resets: "<hero> goes back to level 1 (the hero choice and unlocks stay)".

### Art and audio
- **Procedural pony sprite:** a larger sprite, 3.2x the tower radius, with a body, mane and tail and a per-hero cape.
  - Crowns: Nova a tiara and horn, Ironmane a helm, Skyflick goggles and wings, Duskfang a hood with ear tufts and bat wings.
  - A name tag and level badge, an aura ring, and a selection ring with a move target marker.
- **Effects:** starburst nova, sonar reveal, prison ring, stomp, quake, cyclone, chain lightning, gale, dagger slash, mark, frenzy glow, stun stars and level-up ring.
- **New sounds:** levelup, cast, roar and herostun.

### Save
- `ver: 7` under the same key `nightfall-defense-save-v1`.
- New fields: `heroUnlocks`, plus a per-board `hero` holding id, position, auto, and per-hero level and XP.
- Versions 1 to 6 migrate. Unlocks are granted from cleared waves and stars, and no hero is picked, so the card prompts for a pick.

## Balance

Command: `PAR=5 node tools/balance.js`. Results are in `tools/balance-results.json`.
- **What the bot does:**
  - picks a hero per map: nova on moonlit and caverns, ironmane on woods, skyflick on cliffs and castle
  - re-places the hero on the best route coverage near its towers whenever the tower count changes
  - auto-casts with the hero's want rules
- `HERO=0` turns the hero off. Before the HP retune, `HERO=0` reproduced the slice-5 numbers exactly, with the same fingerprints. To reproduce them now, add `TUNE='{"hpAll":1}'`, plus `MAPTUNE='{"hpMul":1}'` on cliffs and castle.
- **Knobs:** `HERO=<id>` forces a hero, `HEROAUTO=0` turns casting off, and `HEROTUNE` / `TUNE` / `MAPTUNE` override constants.

### 0★ before and after

| map | slice 5 w50 | slice 5 w100 | slice 5 losses | slice 6 hero | slice 6 w50 | slice 6 w100 | slice 6 losses | worst wave | hero lv at w10 / w50 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| moonlit | 1.66h | 5.68h | 60 | Nova Quill | 1.75h | 6.70h | 72 | 18 | 5 / 28 |
| woods | 1.99h | 6.91h | 32 | Ironmane | 2.29h | 6.81h | 28 | 9 | 6 / 25 |
| caverns | 2.10h | 6.05h | 61 | Nova Quill | 2.19h | 7.04h | 73 | 15 | 4 / 25 |
| cliffs | 2.45h | 6.17h | 30 | Skyflick | 2.26h | 5.95h | 26 | 8 | 6 / 25 |
| castle | 2.20h | 5.64h | 33 | Skyflick | 2.25h | 6.24h | 36 | 7 | 5 / 26 |

Every map is inside the 1.5 to 2.5h (w50) and 5 to 8h (w100) bands. The hero reaches level 30 by about wave 70 on every map.

### Tuning steps
Hero hit power is `hpFor(wave) / hpAll x hit x pow`. It follows DNB HP, so the hero stays relevant on every map and wave without needing its own curve. Dividing by `hpAll` means a global HP change makes the towers' job harder without scaling the hero up with it.

| step | change | moonlit w50 | moonlit w100 |
| --- | --- | --- | --- |
| 1 | hit 0.06, no HP change | 0.58h | 1.36h |
| 2 | hero damage off, auras and abilities only, hpAll 1.0 | 1.43h | 4.57h |
| 3 | hero damage off, hpAll 1.5 | 2.85h | wall before w100 |
| 4 | hit 0.01, hpAll 1.25, grow 1.045/lv | 1.58h | 3.70h |
| 5 | **hit 0.01, hpAll 1.25, grow 1.02/lv (chosen)** | 1.75h | 6.70h |
| 6 | hit 0.005, hpAll 1.25 | 1.89h | 7.75h |
| 7 | hit 0.008, hpAll 1.3 | 1.98h | 7.93h |
| 8 | hero damage off, hpAll 1.25 | 2.00h | 9.04h |

- **Auras:** the first-pass values (+8% at level 1, +0.4% per level; slow 10%, crit 4%) were cut to +5% and +0.3% per level (slow 8%, crit 3%).
- **Revealing Light:** its radius went from a fixed 700 to 220+30 per rank, so it no longer covers the whole board.
- **Cliffs and castle:** with the global HP x1.25, cliffs (2.70h w50) and castle (2.83h w50, 8.01h w100) ran over the band. Their `hpMul` was set to 0.92, chosen from a sweep:

  | hpMul | map | w50 | w100 |
  | --- | --- | --- | --- |
  | 0.92 | cliffs | 2.26h | 5.95h |
  | 0.95 | cliffs | 2.47h | 7.32h |
  | 0.88 | castle | 1.99h | 5.11h |
  | 0.92 | castle | 2.25h | 6.24h |

### Prestige
Command: `PRESTIGE=1 node tools/balance.js`. Results are in `tools/prestige-results.json`. "vs 0★" divides wave-100 time by the slice-6 0★ time for that map.

| map | star | wave 50 | wave 100 | total losses | worst single wave (losses) | vs 0★ | slice 5 vs 0★ |
| --- | --- | --- | --- | --- | --- | --- | --- |
| moonlit | 0★ | 1.75h | 6.70h | 72 | 18 | 1.00 | 1.00 |
| moonlit | 1★ | 1.25h | 5.10h | 50 | 15 | 0.76 | 0.83 |
| moonlit | 2★ | 0.97h | 5.01h | 55 | 26 | 0.75 | 0.73 |
| moonlit | 3★ | 0.85h | 5.22h | 55 | 21 | 0.78 | 0.68 |
| moonlit | 4★ | 0.69h | 5.65h | 66 | 27 | 0.84 | 0.53 |
| moonlit | 5★ | 0.57h | 8.24h | 103 | 37 | 1.23 | 0.94 |
| woods | 1★ | 1.00h | 3.38h | 5 | 5 | 0.50 | 0.42 |
| caverns | 1★ | 0.61h | 2.94h | 18 | 10 | 0.42 | 0.34 |
| cliffs | 1★ | 1.00h | 4.54h | 16 | 16 | 0.76 | 0.41 |
| castle | 1★ | 0.84h | 2.40h | 2 | 2 | 0.38 | 0.35 |

- The rows keep the slice-5 shape:
  - moonlit stars 1 to 4 take 0.75 to 0.84 of the 0★ time;
  - the other maps after the full moonlit loop take 0.38 to 0.76.
- The hero resets to level 1 on each star-up, and the bot keeps Nova Quill on moonlit for every star.
- 1★ to 4★ are flatter than in slice 5, and the 4★ dip is gone (0.84 against 0.53).
- 5★ (elites common) is the one step above the 0★ time: 8.24h, 103 losses, worst wave 37. See known issues.

## Tests
- `tools/e2e.js` passes 22 of 22 on Playwright run 1, the only run needed (1 of 3 used).
- **Hero at 1280:**
  - picks Nova from the card's "Pick a hero" button, then clicks the hero and clicks the field to move it
  - H and Esc toggle selection
  - Q between waves shows the "work during a wave" banner
  - during a paused wave with the hero on an enemy, Q, W and E each cast and start their cooldown sweep
  - `heroXp(5000)` levels up to rank 2 or higher, with the level-up banner
  - unlocks Ironmane with 15 Moonstones, and switching heroes keeps each hero's level
  - star-up resets Nova to level 1, keeps the choice and unlocks, and unlocks Duskfang by its star milestone
  - the save holds `ver: 7` and survives a reload
- **Hero UI at 390 (touch):**
  - the picker fits with no horizontal scroll
  - the hero bar sits inside the board with buttons of 38px or more
  - tap to select and tap to move
  - entering placement clears hero selection
  - a touch ability button casts
- **v6 to v7 migration:** a v6 save with moonlit wave 33 cleared loads with `{nova, ironmane}` unlocked, no hero, and the pick prompt shown.
- Older migration tests now expect `ver: 7`, and the research test expects 32 nodes. Every test checks for no console errors, at both 1280 and 390.

## Gates
- `node --check` passes on every js file in `js/` and `tools/`.
- No comments in the js, css or html. No build step. No model names.
- No console errors at 1280 or 390, checked in every e2e test.
- Save key unchanged, with `ver: 7`. The v1, v2, v5 and v6 migrations are tested.
- Balance is recorded in `tools/balance-results.json`, `tools/prestige-results.json` and this audit.

## Known issues
- **Knockback hotfix not merged:** main's knockback cooldown hotfix (d5d61ec, `KNOCK_CD = 0.2` in `hitEnemy` and cyclone) is not on this branch. The merge of main was refused by the permission system in this session, and it was not re-applied by hand. Skyflick's knockbacks (Cyclone Nova and Gale Wall) are limited only by their 11s and 20s cooldowns. When main is merged, the conflict is in `hitEnemy`, and the hero knockback paths should use the same `KNOCK_CD` gate.
- **Global HP raised:** DNB HP is now x1.25 on every map, which offsets the hero's contribution. Playing without a hero (only possible on a brand-new v7 board before picking) is therefore harder than in slice 5: moonlit at 2.00h w50 and 9.04h w100 in the bot run.
- **Small hit scale:** the hero's own hit scale is small (1% of a wave Shambler's HP per hit at level 1). Most of its value comes from auras and abilities, and abilities scale with the same base.
- **Single-hero bot:** the bot uses one fixed hero per map and never switches. Duskfang is not used in the 0★ runs, because it unlocks with a star.
- **Moonlit 5★:** 1.23 of the 0★ time (8.24h, 103 losses). Elite swarms from wave 20 on top of the global HP x1.25 make it the hardest prestige step. A softer elite rate at 5★ (`STAR` table) would pull it back, but it was left alone to keep the slice-5 star curve.
- **Roar stuns:** these come from boss tricks, not a per-boss flag. A new boss with a sprint or stage trick roars automatically.
