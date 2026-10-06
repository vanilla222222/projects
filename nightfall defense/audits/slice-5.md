# Slice 5 audit: prestige, map stars, Moonstones, research

## What shipped

### Star up
- Clearing wave 100 on a map shows a gold **Star up to N★** button in the wave box (max 5★). Escape or Cancel closes the dialog.
- The confirm dialog shows the new star line and two lists:
  - **Resets on this map:** the ponies on the board, cash (back to the map's start cash, plus the pay for skipped waves), wave progress (restarts at wave 1, or after the Head Start skip), and first-clear records, so every first-clear bonus pays again.
  - **You gain:** the Moonstones, the new reward and DNB multipliers, the new modifier, boss-wave Moonstones, the skip, and the layout preset when Muster Plans is owned.
  - It ends with "Other maps, research, Moonstones and the Codex are not touched."
- `starUp` in core.js builds a fresh board for that map, keeps codex and boss records, grants the Moonstones and emits a `starup` event. That event plays a star sound and a full-screen star burst (rays, popping star, text), with a banner and a pulse on the Research button. Reduced motion turns off the animations.

### Per-star difficulty
- **HP:** `starHpMul = (1 + hp[star]) * (1 + 1.9% per research level owned)`, with `hp = [0, 19, 21, 22, 23, 23]%`. The research part applies only on starred maps, so 0★ maps are unchanged.
- **Speed:** +3% per star. **Rewards:** kill cash and first-clear bonuses +25% per star.
- **Cumulative modifiers:**

  | star | modifier | rule |
  | --- | --- | --- |
  | 1★ | Armored bosses | Bosses get a flat plate worth 6% of a wave Shambler's HP scale, taken off every hit |
  | 2★ | Faster spawns | Spawn gaps x0.75 |
  | 3★ | Enemy regen | DNBs regrow 0.3% of max HP per second, bosses half that |
  | 4★ | Fewer lives | 7 lives per wave instead of 10 (research lives still add) |
  | 5★ | Elites common | Elites from wave 20, and 10% of other non-basic DNBs also become elites |

- The modifiers show as gold pills on the map card and above the wave box in the HUD, with tooltips. The HUD star chip glows on starred maps.

### Moonstones
- **Star-up grant:** `20 x next star x (1 + 0.5 x (map index - 1)) x Moon Lens`. Moonlit pays 20/40/60/80/100, castle pays 3x that.
- **Boss waves:** on 1★+, each boss wave cleared for the first time pays `star + Star Hunter level` Moonstones (x Moon Lens).
- Shown in the HUD chip and in the Research dialog header.

### Research tree
- 30 nodes in 4 branches: Economy (7), Ponies (9), Abilities (7), Utility (7). Each branch is drawn as a node graph with SVG prerequisite lines, level pips, costs, and four states: locked (dashed), open, affordable (glow) and maxed (filled). Tooltips give the per-level effect, the current and next totals, the cost and missing prerequisites.
- Cost is `round(base x 1.7^level)`, with tiered bases of 4, 6, 10, 14, 30, 40 and 90. Buying every level costs 1760 Moonstones.
- Effects in core.js: damage, attack speed, range, crit, race training, cheaper first copies, signature power and cooldowns, longer stuns, charged signatures, aura strength, start cash, kill cash, first-clear bonus, interest, sell refund, boss cash, lives, boss leak cut, Moonstone gain, wave skip after star-up, layout presets, and boss-wave Moonstones.
- The R key opens the dialog. The layout is 4 columns at 1280, 2 at 960 and 1 at 390, with no horizontal scroll.

### Map select
- Each card shows 0 to 5 stars, with a glow that grows with the star count, and its modifier pills.

### Save
- `ver: 6` under the same key `nightfall-defense-save-v1`. It adds `stars`, `moon`, `moonTotal`, `research` and `presets`.
- Versions 1 to 5 migrate, starting at 0★, with no Moonstones and no research.

## Balance

Command: `PRESTIGE=1 node tools/balance.js`. Results are in `tools/prestige-results.json`.
- The loop climbs moonlit from 0★ to 5★. Before each run the bot spends its Moonstones on research, buying the affordable node with the lowest cost divided by a fixed priority.
- Then it gives woods, caverns, cliffs and castle one star-up each, in parallel. Those runs carry the research and Moonstones from the finished moonlit loop.
- The "vs 0★" column divides wave-100 time by the slice-4 0★ time for that map.

| map | star | wave 50 | wave 100 | total losses | worst single wave (losses) | vs 0★ |
| --- | --- | --- | --- | --- | --- | --- |
| moonlit | 0★ | 1.66h | 5.68h | 60 | 14 | 1.00 |
| moonlit | 1★ | 1.10h | 4.70h | 46 | 15 | 0.83 |
| moonlit | 2★ | 0.85h | 4.12h | 42 | 14 | 0.73 |
| moonlit | 3★ | 0.69h | 3.87h | 36 | 8 | 0.68 |
| moonlit | 4★ | 0.53h | 3.01h | 26 | 6 | 0.53 |
| moonlit | 5★ | 0.53h | 5.31h | 61 | 27 | 0.94 |
| woods | 1★ | 0.88h | 2.89h | 4 | 4 | 0.42 |
| caverns | 1★ | 0.57h | 2.05h | 8 | 3 | 0.34 |
| cliffs | 1★ | 0.89h | 2.55h | 2 | 2 | 0.41 |
| castle | 1★ | 0.75h | 1.97h | 0 | 0 | 0.35 |

- The moonlit 0★ run matches the slice-4 baseline exactly (5.68h, 60 losses), so 0★ play is unchanged.
- **Moonlit loop:** every star run reaches wave 100 in 0.53 to 0.94 of the 0★ time, which meets the target of about the same or a little less. 4★ is the easiest step, because 7 lives is offset by the Sturdy Gate levels bought at that point. 5★ is the hardest, because of the elites modifier.
- **Other maps after the full moonlit loop:** 0.34 to 0.42 of their 0★ time. These runs carry 44 research levels and skip 9 waves, the strongest position a player can reach before starring them. Moonlit-style walls don't appear, and the runs are mostly the bare time it takes to play 91 waves.
- **Other maps starred early:** a side run gave each map its first star-up straight after moonlit 1★ (3 research levels plus its own grant). With the same constants, those runs took woods 6.35h (0.92), caverns 4.66h (0.77), cliffs 4.01h (0.65) and castle 3.20h (0.57). That is on target. So the low ratios in the main table come from the order the bot plays the maps in, not from the star curve.

### Tuning steps
1. **Linear per-star HP, +30% per star, regen 0.6%/s:** 1★ 5.25h and 2★ 5.54h were fine, but 3★ took 9.02h with 110 losses. 174 maxed towers had filled the space and walled on waves 75 to 92.
2. **+20% per star, regen 0.3%/s** (fast-forward runs): 3★ 2.80h, 4★ 2.18h, 5★ 4.16h. All too easy.
3. **+27% per star** (fast-forward runs): 3★ 5.93h, 4★ 5.13h, 5★ 9.38h. Run time is very sensitive to HP once a wall appears: +7% HP doubled the 3★ time.
4. **+23% per star, full loop:** moonlit 0.74, 0.68, 0.58, 0.45 and 0.72. Other maps after the loop were 0.16 to 0.27, and 0.39 to 0.59 when starred early. Research was outpacing a flat per-star curve.
5. **Final:** a small per-star table plus 1.9% HP per research level on starred maps. Difficulty now follows the player's research power, which roughly doubled the other maps' run times without changing the moonlit loop much. A side test with 0.8% and 1.8% per level gave the other maps 0.20 to 0.33 and 0.29 to 0.44.
- `tools/balance.js` gained:
  - `FROM_STAR=k`, which fast-forwards to star k by granting each skipped run's Moonstones;
  - `FIRST=<file>`, which reuses an earlier moonlit result;
  - `STARTUNE`, which overrides the STAR constants from the environment.

## Tests
- `tools/e2e.js` passes 19 of 19 on Playwright run 1, and again on run 2 after the HP tuning and dialog text changes (2 of the 3 allowed runs used).
- New tests:
  - **Star up at 1280:**
    - checks the button appears only after wave 100;
    - the confirm dialog lists the four resets and the gains, and Cancel changes nothing;
    - Confirm resets that map's towers, cash, wave and first-clear records, while woods and research are untouched;
    - the HUD shows the Moonstones and 1★, and the burst and banner play;
    - the modifier pill shows, and a 1★ wave 10 run has HP x1.19, a higher clear bonus, 10 lives and a plated boss;
    - the map card shows one lit star, and the save holds `ver: 6`.
  - **Research at 390:**
    - checks the node states and tooltip;
    - buying Drill Yard and Sturdy Gate spends Moonstones and applies x1.1 damage and 11 lives;
    - the dialog has no horizontal scroll and no node overlaps, and Escape and R close it;
    - the star dialog fits 390px.
  - **v5 to v6 migration:** a v5 save loads with no stars, no Moonstones and empty research.
- Older migrations (v1, v2) now check for `ver: 6`. Every test checks for no console errors, at both 1280 and 390.

## Gates
- `node --check` passes on every js file.
- No comments in the js, css or html. No build step. No model names.
- No console errors at 1280 or 390.
- Save key unchanged, with `ver: 6`. The v1, v2 and v5 migrations are tested.
- Balance is recorded in `tools/prestige-results.json` and in this audit.

## Known issues
- The other maps' single star-up is quick (0.34 to 0.42) when the bot does them after the whole moonlit loop. Starred early they are on target. A steeper research term would fix the late case, but it would make early star-ups punishing.
- Moonlit 4★ (0.53) is easier than its neighbours. The 4★ lives cut is mostly cancelled by Sturdy Gate.
- Research raises DNB HP on starred maps by 1.9% per level. Utility levels (Moon Lens, Head Start) therefore add pressure without adding power there. The dialogs explain this.
- The balance bot is deterministic and greedy, both when placing ponies and when buying research. Fast-forward runs (`FROM_STAR`) only approximate the real path; at 4★ they had 6 more Moonstones.
- The full tree costs 1760 Moonstones. A moonlit 0★ to 5★ loop plus one star-up per other map earns about 770 (moonlit 478, the others 56 to 92 each), so the tree is a long-term goal.
- Layout presets need Muster Plans (30 Moonstones, behind Head Start). The bot never uses them.
