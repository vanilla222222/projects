# Slice 4 audit: new enemy types, boss rework, codex, re-tune

## What shipped

### Seven new DNBs (plus the Splitling child)

| DNB | id | HP | speed | mechanic | art and effects |
| --- | --- | --- | --- | --- | --- |
| Gnat | swarm | 0.2x | 128 | Spawns in packs of 5, tiny and fast. Ponies with splash or `swarmMul` (earth stomps, unicorn Prismatic, pegasus Feather Volley, crystal Geode Burst) shred them. | Small body, buzzing wings |
| Mender | healer | 0.9x | 54 | Every 2.5s it heals DNBs within 110 for 6% of their max HP (bosses get a quarter of that). | Green cross and an expanding heal ring |
| Splitter | splitter | 1.1x | 52 | On death it splits into 3 Splitlings (0.25x HP, speed 88). They inherit `d`, `path` and the fork route, so they continue exactly where it fell. | Cracked shell |
| Lurker | stealth | 0.8x | 70 | Hidden, so `canHit` refuses ponies without `detects` unless it is revealed. Sources of reveal or detection: the bat Echolocation path (node 1 detects, node 5 `detectR` reveals), unicorn Skyward Sight node 3+, crystal pony glow (`revealR` 70, more with Lumen, and the whole aura detects at Lumen 4), and glowing map crystals (within 60% of their radius). | Hooded body. When detected it renders at alpha 0.6 with a shimmer. When undetected it is a faint ghost hint: alpha 0.12, a dashed outline and no HP bar. |
| Tunneler | burrower | 1.2x | 60 | Goes underground on a repeating stretch of each segment (190 of every 460 paces, never near the spawn or the exit). It cannot be hit while buried unless the pony has `seesBurrow`. | Dust burst and a dirt mound, with the body at alpha 0.22 |
| Bulwark | shield | 1.3x | 48 | Bubbles DNBs within 100 for 25% of their max HP. The bubble regenerates 4%/s while it is in the aura and drops when the Bulwark dies or the DNB walks away. | Shield icon and range ring, a bubble around covered DNBs, a cyan shield bar above the HP bar, and a pop effect |
| Ironhide | armored | 1.8x | 44 | Flat plate equal to 3% of a Shambler's HP at that wave. Each hit loses the plate, with a floor of 20% of the hit. Pierce (earth Stonehoof and unicorn Arcanist, +10% per node) ignores part of the plate. | Plated body. Its damage numbers render dim grey and smaller. The armor value shows in preview tooltips and in the codex. |

### Elites and combos
- **Elites from wave 60** (castle from 55): 2.2x HP, 1.12x speed, 3x cash, and a leak costs 2 lives. They have a gold glow and a star.
  - Chance: 2%, plus 0.15% per wave, capped at 7%.
  - From wave 80, each elite also carries one extra trait: light plate, its own bubble worth 15% of its HP, or a cloak.
- **Combo waves:**

  | combo | first wave | rule | mix |
  | --- | --- | --- | --- |
  | Iron wall | 40+ | wave % 13 = 3 | armored + shield |
  | Ghost march | 45+ | wave % 13 = 9 | stealth + healer |
  | Hive tide | 50+ | wave % 17 = 5 | swarm + splitter |
  | Sappers | 55+ | wave % 17 = 12 | burrower + armored + healer |

### Waves
- Every map has its own intro order. The first wave a type appears in is a "New: X" themed wave:

  | map | intro order (wave) |
  | --- | --- |
  | moonlit | swarm 12, healer 15, splitter 18, armored 22, burrower 26, shield 32, stealth 36 |
  | woods | swarm 6, healer 11, stealth 16, splitter 21, burrower 25, armored 31, shield 35 |
  | caverns | burrower 5, stealth 11, healer 15, shield 21, splitter 25, armored 31, swarm 35 |
  | cliffs | swarm 4, splitter 11, shield 15, armored 21, healer 25, stealth 31, burrower 35 |
  | castle | armored 4, shield 8, healer 12, stealth 16, splitter 21, burrower 24, swarm 28 |

- Caverns weights burrowers and Lurkers higher. Castle weights armored and shield higher.
- **The wave preview:**
  - shows every new type, with a mechanic tooltip (including the armor value at that wave and the counter ponies), an elite chip with its trait note, theme names, and elite marks on the timeline;
  - warns when a wave has Lurkers but no detection, Ironhides but no pierce, or a big swarm but no splash.

### Bosses
- All 50 bosses (10 per map) were reworked onto a shared trick system, and every boss keeps a distinct kit.
- Each new mechanic now appears in boss form:

  | trick | bosses | trick | bosses |
  | --- | --- | --- | --- |
  | brood (summons) | 10 | flying | 7 |
  | plate | 9 | heal pulse | 7 |
  | cloak | 9 | sprint | 7 |
  | magic | 6 | split | 6 |
  | aegis | 5 | stages | 5 |
  | phase | 4 | shell | 4 |
  | blink | 4 | twin | 4 |
  | burrow | 3 | regen | 3 |
  | haste | 3 | windrider | 3 |

- Boss descriptions spell out the numbers, and boss cards show mechanic tags.

### Codex
- A Codex button sits in the map row, and the C hotkey opens it. It is a modal with DNB and Boss tabs and a count.
- **The grid:** unknown entries show as silhouettes.
- **The detail panel:** large procedural art, stats (HP, speed, bounty, armor at the current wave, leak cost), and per-mechanic weakness text with counter ponies.
- **Unlocking:** an entry unlocks the first time that DNB or boss spawns. A `codex` event fires, which triggers a toast, a sound and a pulsing button.
- The layout is a single column at 390px with no horizontal scroll. Escape closes it.
- **Save:**
  - `ver: 5` under the same key `nightfall-defense-save-v1`, with `codex: {e, b}`.
  - Versions 1 to 4 migrate. The migration seeds the codex with the types and bosses the board's cleared waves have already shown.

### Counters in upgrade data
- Each pony has these stats:
  - `pierce`;
  - `swarmMul`;
  - `revealR`;
  - `detects`;
  - `seesBurrow`;
  - `splash`.
- The node preview lines and tooltips name them: "Ignores N% of armor", "Detects stealthy DNBs", "Reveals hidden DNBs", "Shreds swarms", "Hits burrowed DNBs".
- MECH entries list the counter ponies, and the preview and codex show them.

### Balance tool
- `tools/balance.js` now buys counters. It looks ahead 4 waves for Lurkers or cloaks, plate, and big swarms, and boosts the detect, pierce and splash nodes until about one tower in eight has them.
- It also logs which DNB types leaked on lost waves. The leak event carries `dnb` and `elite`.

BALANCE_PLACEHOLDER

## Tests
E2E_PLACEHOLDER

## Gates
- `node --check` passes on every js file.
- No comments in the js, css or html. No build step. No model names.
- Save key unchanged, with `ver: 5`. The v1, v2 and v4 migrations are tested.

## Known issues
ISSUES_PLACEHOLDER
