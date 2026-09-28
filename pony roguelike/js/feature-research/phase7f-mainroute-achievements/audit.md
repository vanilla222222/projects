# Phase 7f — Hollow Chorus / Final Waveform main-route achievement batch

Implementer audit for the 92-achievement batch covering floorKey `'13'` ("The
Hollow Chorus") and floorKey `'14'` ("The Final Waveform") — the two Phase 7b
main-route floors, their 4 new regular bosses, and (via the already-live
`sb_wobbler_<class>`/`sb_subdrop_<class>` grid, untouched here) their two
superbosses `wobbler`/`subdrop`.

## Files changed

- `js/achievements/defs-7.js` — **new file**. All 92 new achievements (52
  `addAchievement`/`addTierSet` calls), plus the 3 id-list consts and the
  `checkHollowChorusFinalWaveformCollection` helper the Collection category
  needs.
- `index.html` — one new `<script src="js/achievements/defs-7.js"></script>`
  line, after `defs-6.js` and before `logic.js`.
- `js/data/items-5.js` — appended 78 new trophy items (`hcfwtrophy_*`) + 5
  capstone items (`lastchord`, `zeroline`, `metronomecharm`, `cadencewatch`,
  `lastwaveformcore`).
- `js/data/trinkets-2.js` — appended 6 capstone trinkets (`splitscarcasing`,
  `cantorbell`, `stilledchord`, `flatlinedcoil`, `threadbarepurse`,
  `lastbarritual`), all `pendingReward:true`.
- `js/data/familiars-2.js` — appended 3 capstone familiars (`wraithnote`,
  `silentwake`, `lastchordmoth`), all `behavior:'orbiter'`.
- `js/systems/items-1.js` — `recalcPlayerStats`: 5 new "Phase 7f trophy batch"
  comment blocks (one per channel: luck, speed, meleeDamage, rangedDamage,
  fire rate/`rateDenom`) wiring all 78 trophies in, plus one inline term per
  channel for each of the 11 stat-bearing capstones (the 3 familiars need no
  wiring — `behavior:'orbiter'` familiars are driven by `dmg`/`radius`/
  `orbitSpeed`/`contactCooldown` directly, not `recalcPlayerStats`).
- `js/game.js` — two small additions, both mirroring an existing pattern
  exactly:
  - `startFloor()`: a `floorNum === 12`/`floorNum === 13` pair right after the
    existing `floorNum === 8` (`deepdiver`) check, firing
    `exploration_reach_floor13`/`_floor14` and the two speedrun-to-floor
    Challenge achievements.
  - `onBossDefeated()`: a `superbossId === 'wobbler'`/`'subdrop'` block right
    after the existing `polish`/`onetruednb` blocks, firing the 10 remaining
    Challenge achievements off flags that already exist
    (`tookDamageThisBossRoom`, `tookDamageThisFloor`, `tookDamageThisRun`,
    `redMax`, `visitedShopThisRun`, `runElapsed`).
- `js/systems/combat-2.js` — `handleEnemyDeath()`: one new guarded call,
  `if (HOLLOWCHORUS_FINALWAVEFORM_WATCH_IDS.has(enemy.type.id))
  checkHollowChorusFinalWaveformCollection(game);`, right after the existing
  `bumpBestiaryCount('enemyKills', ...)` call.
- `js/CODE_REFERENCE.md` — updated the `defs-1.js`..`defs-6.js` section header/
  counts to `defs-7.js`/1764, and added a new "Phase 7f" subsection describing
  the whole batch, following the existing Phase 5b/etc. subsection convention.

No new stat was added to `ensureUnlockShape`'s `statDefaults` — every
Predicate D condition in this batch reuses a flag or counter that already
existed and was already live-bumped elsewhere in the codebase.

## Step 1 investigation — key findings

1. **Live entity ids** (confirmed via grep against `js/data/enemies/*.js`,
   not memory):
   - floorKey `'13'` regular enemies (8, `types-2.js`): `onbeatstalker`,
     `downbeatbrute`, `crescendocharger`, `apexmarksman`, `codablinker`,
     `resonancewarden`, `finalemortar`, `goldenmites`.
   - floorKey `'13'` reskin enemies (4, `types-4.js`, `locked:true`):
     `polyrhythm`, `fermatasentry`, `syncopehopper`, `tremorswarm`.
   - floorKey `'13'` bosses (2, `bosses.js`): `lastovertone` ("The Last
     Overtone"), `hollowcantor` ("The Hollow Cantor").
   - floorKey `'14'` regular enemies (4, `types-4.js`): `deadaircoda`,
     `flatlineburrower`, `silencestalker`, `decrescendosplitter`.
   - floorKey `'14'` bosses (2, `bosses.js`): `flatlinewraith` ("The Flatline
     Wraith"), `zeroamplitude` ("The Zero Amplitude").
   - Superbosses (`superbosses.js`): `wobbler` (WobblerDNB, floor 13),
     `subdrop` (SubdropDNB, floor 14).
   - **Critical finding**: grepping `js/achievements/*.js` showed floorKey
     `'13'`'s 8 regular + 4 reskin enemies **already have** a Slayer
     achievement (`defs-2.js`: single T20 `addAchievement`s for the 8
     regulars; `defs-4.js`: 3-tier 5/20/50 `addTierSet`s for the 4 reskins).
     Only the 4 new bosses and floorKey `'14'`'s 4 regular enemies had zero
     prior coverage. This directly shaped the Slayer section (see below).

2. **Reward-type audit** (Step 1.4/1.5 — exact numbers, from grep + a Node
   count over every `js/achievements/*.js` reward field):
   - `shopDiscount`: **11 uses, 11 distinct kinds, 11 total kinds in
     `SHOP_KIND_LABELS`** — fully exhausted. It is a one-time boolean flag per
     buyable kind (`unlocks.donationDiscounts[kind] = true`), not a stacking
     numeric bonus — confirmed by reading `logic.js`'s `unlockAchievement`
     reward switch. **Not usable for this batch.**
   - `pillColorId`: **40 uses, 40 distinct ids, exactly the 40 `locked:true`
     entries in `PILL_COLORS`** — fully exhausted (0 free).
   - `enemyId`: **60 uses, 60 distinct ids, exactly the 60 `locked:true`
     entries across `ENEMY_TYPES`** — fully exhausted (0 free).
   - `trinketId`: `TRINKET_LIST` is swept whole by `defs-1.js`'s
     `SUPERBOSS_REWARDS = TRINKET_LIST.filter(t => t.locked &&
     !t.donationReward && !t.pendingReward)...` with a **no-modulo, must-match-
     exactly** assertion (`_rewardIndex !== SUPERBOSS_REWARDS.length` triggers
     a `console.warn`). Any new `locked:true` trinket I added WITHOUT
     `pendingReward:true` would silently get swept into that pool, breaking
     the count assertion and leaving the trinket unreachable by any
     achievement. All 6 new capstone trinkets carry `pendingReward:true` —
     the exact same escape hatch `concussiveescapement`/`graspingcasing`/
     `hagglersplinter`/`airylocket`/`lightlattice` already use.
   - `familiarId`/`itemId`: **not** swept by any filter — `SUPERBOSS_REWARDS`
     only pulls from the explicit `NEW_CLASS_REWARD_ITEMS`/
     `NEW_CLASS_REWARD_FAMILIARS` arrays (fixed id lists, not a `.filter()`),
     so any freshly-minted id is automatically safe as long as it isn't added
     to those two arrays (it wasn't).
   - `pickupKind`: consumed exactly by `ACHIEVEMENT_PICKUP_KINDS` (7 kinds, 7
     uses) — not touched by this batch.

3. **Free pre-existing locked pool check (Step 1.5)**: found 10 `locked:true`
   familiars with zero references anywhere (`aegisnewt`, `cutpurse`,
   `brasscrow`, `fusegremlin`, `cinderpod`, `echolens`, `gullspirit`,
   `broodmite`, `sporemother`, `waspjar` — confirmed via a direct grep for
   each id's exact string across every `achievements/*.js` file, not just the
   `familiarId:'x'` literal pattern, since the `sb_<boss>_<class>` loop grants
   familiars programmatically without ever writing that literal). **Not
   used** — the plan directed fresh, thematically-tied entries for capstones,
   and 8 of these 10 predate this task's naming scheme; they're left for a
   future batch, noted here rather than silently spent.

## Step 2 — reward strategy actually used

Since `shopDiscount`/`pillColorId`/`enemyId` are all exhausted, the "genuinely
repeatable" reward type is the pattern already established by Slices 7/8
(`defs-4.js`/`defs-5.js`): mint a brand-new, single-purpose `locked:true`
passive item (`unlockedBy:'<achId>'`) per achievement. Since every id is
freshly minted, there is no shared pool to exhaust and no possible collision
— confirmed by the harness's reward-target collision sweep (see Verification).
78 of the 92 achievements use this pattern (`hcfwtrophy_*`, in `items-5.js`).

The ~14 ladder-capstone/hardest-Challenge/full-completion rungs instead grant
a freshly-minted trinket (`pendingReward:true`, 6), item (5), or `orbiter`
familiar (3) — thematically tied to the cold/blue-violet "Hollow Chorus" and
dark-red/flattening "Final Waveform" palettes (`HOLLOW_CHORUS_PALETTE`
`#6a7fc9`, `FINAL_WAVEFORM_PALETTE` `#e0604a`, per the `bosses.js` comments).
None of these 14 touches an id `SUPERBOSS_REWARDS` or any earlier `defs-*.js`
file already claims (verified — see below).

Every one of the 78 trophies and 14 capstones is wired into a real
`recalcPlayerStats` formula term in `items-1.js` — none is a name-only inert
reward. The 78 trophies are round-robined across 5 channels (luck, speed,
meleeDamage, rangedDamage, fire rate) at that channel's smallest existing
magnitude (luck/meleeDamage/rangedDamage: `+1`; speed: `+0.05` i.e. +5%; fire
rate/`rateDenom`: `+0.03`, undercutting the existing smallest term there,
`0.04`). Each stat-bearing capstone gets its own thematically-matched channel
(e.g. `flatlinedcoil` → `stunChance`, `lastbarritual` → `bossDamageBonus`,
`lastwaveformcore` → `onKillHealChance`, `threadbarepurse` →
`shopDiscountBonus`). The 3 familiars need no `recalcPlayerStats` wiring —
`behavior:'orbiter'` familiars are driven directly by their `dmg`/`radius`/
`orbitSpeed`/`contactCooldown` fields in `familiars.js`, the same as every
other orbiter familiar in the game.

## Step 3 — the 92 achievements, by category

### Slayer (60)

Composition deviates from a literal "over the 13/14 roster" reading — see
the Step 1 finding above. Since floorKey `'13'`'s 8 regular + 4 reskin
enemies already have a Slayer achievement each, this batch:

- (A) 3-tier ladders (8/30/80) for the 4 brand-new floorKey `'14'` regular
  enemies (12 achievements).
- (B) 3-tier ladders (3/10/25) for the 4 brand-new bosses (12 achievements).
- (C) a **second** ladder on fresh `slayer2_*`-prefixed ids for floorKey
  `'13'`'s 8 regular (60/150/300) + 4 reskin (100/250/500) enemies, picking
  up past where the pre-existing achievement leaves off rather than
  re-touching those ids (36 achievements).

### Challenge (12)

Hand-wired Predicate D, reusing existing per-run/per-player flags throughout
— no new stat anywhere. See "Files changed" above for the exact `game.js`
call sites.

### Exploration (14)

2 floor-reach milestones (same `startFloor()` hook as the Challenge speedrun
pair) + 12 Predicate B "first encounter" achievements (`threshold:1` on
`enemyKills`) over the 4 new bosses, `wobbler`/`subdrop`, the 4 new floorKey
`'14'` enemies, and 2 of floorKey `'13'`'s reskin enemies (`polyrhythm`,
`tremorswarm`, picked for variety since their higher-threshold ladder already
exists) — no new code, rides the existing `handleEnemyDeath` →
`bumpBestiaryCount` call.

### Collection (6)

Deviates from a literal "bespoke Predicate-D check enumerating the specific
id list" vs. "simpler reuse" choice offered by the plan — went with the
bespoke option, since it turned out to require very little code: 3 id-list
consts + 1 function + 1 call site. `addTierSet`'s `distinct:true` predicate
counts `Object.keys()` over an ENTIRE bestiary section bucket
(`checkBestiaryAchievements`, `logic.js`), with no id-list parameter, so it
cannot be scoped to just the 13/14 roster without either modifying that
shared function (too invasive) or a small standalone breadth check (what was
built). `checkHollowChorusFinalWaveformCollection(game)` reads
`unlocks.bestiary.enemyKills` — the exact same bucket `bumpBestiaryCount`
already writes on every kill — and counts how many of 3 disjoint id lists
(`HOLLOWCHORUS_ROSTER_IDS` 14, `FINALWAVEFORM_ROSTER_IDS` 6,
`MAINROUTE_1314_SUPERBOSS_IDS` 2) have a nonzero count, unlocking 6
achievements at various thresholds up to full completion of all 22.

Full id/predicate/reward table for all 92 achievements:

### Slayer (60)

| id | predicate | reward |
|---|---|---|
| `slayer_deadaircoda_t1` | bestiarySection:'enemyKills', bestiaryId:'deadaircoda', threshold:8 | `itemId:hcfwtrophy_deadaircoda_t1` |
| `slayer_deadaircoda_t2` | bestiarySection:'enemyKills', bestiaryId:'deadaircoda', threshold:30 | `itemId:hcfwtrophy_deadaircoda_t2` |
| `slayer_deadaircoda_t3` | bestiarySection:'enemyKills', bestiaryId:'deadaircoda', threshold:80 | `itemId:hcfwtrophy_deadaircoda_t3` |
| `slayer_flatlineburrower_t1` | bestiarySection:'enemyKills', bestiaryId:'flatlineburrower', threshold:8 | `itemId:hcfwtrophy_flatlineburrower_t1` |
| `slayer_flatlineburrower_t2` | bestiarySection:'enemyKills', bestiaryId:'flatlineburrower', threshold:30 | `itemId:hcfwtrophy_flatlineburrower_t2` |
| `slayer_flatlineburrower_t3` | bestiarySection:'enemyKills', bestiaryId:'flatlineburrower', threshold:80 | `itemId:hcfwtrophy_flatlineburrower_t3` |
| `slayer_silencestalker_t1` | bestiarySection:'enemyKills', bestiaryId:'silencestalker', threshold:8 | `itemId:hcfwtrophy_silencestalker_t1` |
| `slayer_silencestalker_t2` | bestiarySection:'enemyKills', bestiaryId:'silencestalker', threshold:30 | `itemId:hcfwtrophy_silencestalker_t2` |
| `slayer_silencestalker_t3` | bestiarySection:'enemyKills', bestiaryId:'silencestalker', threshold:80 | `itemId:hcfwtrophy_silencestalker_t3` |
| `slayer_decrescendosplitter_t1` | bestiarySection:'enemyKills', bestiaryId:'decrescendosplitter', threshold:8 | `itemId:hcfwtrophy_decrescendosplitter_t1` |
| `slayer_decrescendosplitter_t2` | bestiarySection:'enemyKills', bestiaryId:'decrescendosplitter', threshold:30 | `itemId:hcfwtrophy_decrescendosplitter_t2` |
| `slayer_decrescendosplitter_t3` | bestiarySection:'enemyKills', bestiaryId:'decrescendosplitter', threshold:80 | `trinketId:splitscarcasing` (capstone) |
| `slayer_lastovertone_t1` | bestiarySection:'enemyKills', bestiaryId:'lastovertone', threshold:3 | `itemId:hcfwtrophy_lastovertone_t1` |
| `slayer_lastovertone_t2` | bestiarySection:'enemyKills', bestiaryId:'lastovertone', threshold:10 | `itemId:hcfwtrophy_lastovertone_t2` |
| `slayer_lastovertone_t3` | bestiarySection:'enemyKills', bestiaryId:'lastovertone', threshold:25 | `itemId:lastchord` (capstone) |
| `slayer_hollowcantor_t1` | bestiarySection:'enemyKills', bestiaryId:'hollowcantor', threshold:3 | `itemId:hcfwtrophy_hollowcantor_t1` |
| `slayer_hollowcantor_t2` | bestiarySection:'enemyKills', bestiaryId:'hollowcantor', threshold:10 | `itemId:hcfwtrophy_hollowcantor_t2` |
| `slayer_hollowcantor_t3` | bestiarySection:'enemyKills', bestiaryId:'hollowcantor', threshold:25 | `trinketId:cantorbell` (capstone) |
| `slayer_flatlinewraith_t1` | bestiarySection:'enemyKills', bestiaryId:'flatlinewraith', threshold:3 | `itemId:hcfwtrophy_flatlinewraith_t1` |
| `slayer_flatlinewraith_t2` | bestiarySection:'enemyKills', bestiaryId:'flatlinewraith', threshold:10 | `itemId:hcfwtrophy_flatlinewraith_t2` |
| `slayer_flatlinewraith_t3` | bestiarySection:'enemyKills', bestiaryId:'flatlinewraith', threshold:25 | `familiarId:wraithnote` (capstone) |
| `slayer_zeroamplitude_t1` | bestiarySection:'enemyKills', bestiaryId:'zeroamplitude', threshold:3 | `itemId:hcfwtrophy_zeroamplitude_t1` |
| `slayer_zeroamplitude_t2` | bestiarySection:'enemyKills', bestiaryId:'zeroamplitude', threshold:10 | `itemId:hcfwtrophy_zeroamplitude_t2` |
| `slayer_zeroamplitude_t3` | bestiarySection:'enemyKills', bestiaryId:'zeroamplitude', threshold:25 | `itemId:zeroline` (capstone) |
| `slayer2_onbeatstalker_t1` | bestiarySection:'enemyKills', bestiaryId:'onbeatstalker', threshold:60 | `itemId:hcfwtrophy_r_onbeatstalker_t1` |
| `slayer2_onbeatstalker_t2` | bestiarySection:'enemyKills', bestiaryId:'onbeatstalker', threshold:150 | `itemId:hcfwtrophy_r_onbeatstalker_t2` |
| `slayer2_onbeatstalker_t3` | bestiarySection:'enemyKills', bestiaryId:'onbeatstalker', threshold:300 | `itemId:hcfwtrophy_r_onbeatstalker_t3` |
| `slayer2_downbeatbrute_t1` | bestiarySection:'enemyKills', bestiaryId:'downbeatbrute', threshold:60 | `itemId:hcfwtrophy_r_downbeatbrute_t1` |
| `slayer2_downbeatbrute_t2` | bestiarySection:'enemyKills', bestiaryId:'downbeatbrute', threshold:150 | `itemId:hcfwtrophy_r_downbeatbrute_t2` |
| `slayer2_downbeatbrute_t3` | bestiarySection:'enemyKills', bestiaryId:'downbeatbrute', threshold:300 | `itemId:hcfwtrophy_r_downbeatbrute_t3` |
| `slayer2_crescendocharger_t1` | bestiarySection:'enemyKills', bestiaryId:'crescendocharger', threshold:60 | `itemId:hcfwtrophy_r_crescendocharger_t1` |
| `slayer2_crescendocharger_t2` | bestiarySection:'enemyKills', bestiaryId:'crescendocharger', threshold:150 | `itemId:hcfwtrophy_r_crescendocharger_t2` |
| `slayer2_crescendocharger_t3` | bestiarySection:'enemyKills', bestiaryId:'crescendocharger', threshold:300 | `itemId:hcfwtrophy_r_crescendocharger_t3` |
| `slayer2_apexmarksman_t1` | bestiarySection:'enemyKills', bestiaryId:'apexmarksman', threshold:60 | `itemId:hcfwtrophy_r_apexmarksman_t1` |
| `slayer2_apexmarksman_t2` | bestiarySection:'enemyKills', bestiaryId:'apexmarksman', threshold:150 | `itemId:hcfwtrophy_r_apexmarksman_t2` |
| `slayer2_apexmarksman_t3` | bestiarySection:'enemyKills', bestiaryId:'apexmarksman', threshold:300 | `itemId:hcfwtrophy_r_apexmarksman_t3` |
| `slayer2_codablinker_t1` | bestiarySection:'enemyKills', bestiaryId:'codablinker', threshold:60 | `itemId:hcfwtrophy_r_codablinker_t1` |
| `slayer2_codablinker_t2` | bestiarySection:'enemyKills', bestiaryId:'codablinker', threshold:150 | `itemId:hcfwtrophy_r_codablinker_t2` |
| `slayer2_codablinker_t3` | bestiarySection:'enemyKills', bestiaryId:'codablinker', threshold:300 | `itemId:hcfwtrophy_r_codablinker_t3` |
| `slayer2_resonancewarden_t1` | bestiarySection:'enemyKills', bestiaryId:'resonancewarden', threshold:60 | `itemId:hcfwtrophy_r_resonancewarden_t1` |
| `slayer2_resonancewarden_t2` | bestiarySection:'enemyKills', bestiaryId:'resonancewarden', threshold:150 | `itemId:hcfwtrophy_r_resonancewarden_t2` |
| `slayer2_resonancewarden_t3` | bestiarySection:'enemyKills', bestiaryId:'resonancewarden', threshold:300 | `itemId:hcfwtrophy_r_resonancewarden_t3` |
| `slayer2_finalemortar_t1` | bestiarySection:'enemyKills', bestiaryId:'finalemortar', threshold:60 | `itemId:hcfwtrophy_r_finalemortar_t1` |
| `slayer2_finalemortar_t2` | bestiarySection:'enemyKills', bestiaryId:'finalemortar', threshold:150 | `itemId:hcfwtrophy_r_finalemortar_t2` |
| `slayer2_finalemortar_t3` | bestiarySection:'enemyKills', bestiaryId:'finalemortar', threshold:300 | `itemId:hcfwtrophy_r_finalemortar_t3` |
| `slayer2_goldenmites_t1` | bestiarySection:'enemyKills', bestiaryId:'goldenmites', threshold:60 | `itemId:hcfwtrophy_r_goldenmites_t1` |
| `slayer2_goldenmites_t2` | bestiarySection:'enemyKills', bestiaryId:'goldenmites', threshold:150 | `itemId:hcfwtrophy_r_goldenmites_t2` |
| `slayer2_goldenmites_t3` | bestiarySection:'enemyKills', bestiaryId:'goldenmites', threshold:300 | `itemId:hcfwtrophy_r_goldenmites_t3` |
| `slayer2_polyrhythm_t1` | bestiarySection:'enemyKills', bestiaryId:'polyrhythm', threshold:100 | `itemId:hcfwtrophy_r_polyrhythm_t1` |
| `slayer2_polyrhythm_t2` | bestiarySection:'enemyKills', bestiaryId:'polyrhythm', threshold:250 | `itemId:hcfwtrophy_r_polyrhythm_t2` |
| `slayer2_polyrhythm_t3` | bestiarySection:'enemyKills', bestiaryId:'polyrhythm', threshold:500 | `itemId:hcfwtrophy_r_polyrhythm_t3` |
| `slayer2_fermatasentry_t1` | bestiarySection:'enemyKills', bestiaryId:'fermatasentry', threshold:100 | `itemId:hcfwtrophy_r_fermatasentry_t1` |
| `slayer2_fermatasentry_t2` | bestiarySection:'enemyKills', bestiaryId:'fermatasentry', threshold:250 | `itemId:hcfwtrophy_r_fermatasentry_t2` |
| `slayer2_fermatasentry_t3` | bestiarySection:'enemyKills', bestiaryId:'fermatasentry', threshold:500 | `itemId:hcfwtrophy_r_fermatasentry_t3` |
| `slayer2_syncopehopper_t1` | bestiarySection:'enemyKills', bestiaryId:'syncopehopper', threshold:100 | `itemId:hcfwtrophy_r_syncopehopper_t1` |
| `slayer2_syncopehopper_t2` | bestiarySection:'enemyKills', bestiaryId:'syncopehopper', threshold:250 | `itemId:hcfwtrophy_r_syncopehopper_t2` |
| `slayer2_syncopehopper_t3` | bestiarySection:'enemyKills', bestiaryId:'syncopehopper', threshold:500 | `itemId:hcfwtrophy_r_syncopehopper_t3` |
| `slayer2_tremorswarm_t1` | bestiarySection:'enemyKills', bestiaryId:'tremorswarm', threshold:100 | `itemId:hcfwtrophy_r_tremorswarm_t1` |
| `slayer2_tremorswarm_t2` | bestiarySection:'enemyKills', bestiaryId:'tremorswarm', threshold:250 | `itemId:hcfwtrophy_r_tremorswarm_t2` |
| `slayer2_tremorswarm_t3` | bestiarySection:'enemyKills', bestiaryId:'tremorswarm', threshold:500 | `itemId:hcfwtrophy_r_tremorswarm_t3` |

### Challenge (12)

| id | predicate | reward |
|---|---|---|
| `challenge_hollowchorus_flawless` | Predicate D — game.js onBossDefeated, wobbler block | `trinketId:stilledchord` (capstone) |
| `challenge_finalwaveform_flawless` | Predicate D — game.js onBossDefeated, subdrop block | `trinketId:flatlinedcoil` (capstone) |
| `challenge_hollowchorus_floor_nodamage` | Predicate D — same wobbler block, reuses `tookDamageThisFloor` | `itemId:hcfwtrophy_challenge_hc_floor_nodamage` |
| `challenge_finalwaveform_floor_nodamage` | Predicate D — same subdrop block, reuses `tookDamageThisFloor` | `itemId:hcfwtrophy_challenge_fw_floor_nodamage` |
| `challenge_hollowchorus_onehearted` | Predicate D — same wobbler block, reuses `redMax` | `itemId:hcfwtrophy_challenge_hc_onehearted` |
| `challenge_finalwaveform_onehearted` | Predicate D — same subdrop block, reuses `redMax` | `itemId:hcfwtrophy_challenge_fw_onehearted` |
| `challenge_hollowchorus_speedkill` | Predicate D — same wobbler block, reuses `game.runElapsed` | `itemId:hcfwtrophy_challenge_hc_speedkill` |
| `challenge_finalwaveform_speedkill` | Predicate D — same subdrop block, reuses `game.runElapsed` | `itemId:hcfwtrophy_challenge_fw_speedkill` |
| `challenge_subdrop_frugal` | Predicate D — same subdrop block, reuses `visitedShopThisRun` | `trinketId:threadbarepurse` (capstone) |
| `challenge_finalwaveform_untouched_run` | Predicate D — same subdrop block, reuses `tookDamageThisRun` | `familiarId:silentwake` (capstone) |
| `challenge_hollowchorus_speedrun` | Predicate D — game.js startFloor, floorNum===12 | `itemId:metronomecharm` (capstone) |
| `challenge_finalwaveform_speedrun` | Predicate D — game.js startFloor, floorNum===13 | `itemId:cadencewatch` (capstone) |

### Exploration (14)

| id | predicate | reward |
|---|---|---|
| `exploration_reach_floor13` | Predicate D — game.js startFloor, floorNum===12 | `itemId:hcfwtrophy_exploration_floor13` |
| `exploration_reach_floor14` | Predicate D — game.js startFloor, floorNum===13 | `itemId:hcfwtrophy_exploration_floor14` |
| `exploration_meet_lastovertone` | bestiarySection:'enemyKills', bestiaryId:'lastovertone', threshold:1 | `itemId:hcfwtrophy_exploration_meet_lastovertone` |
| `exploration_meet_hollowcantor` | bestiarySection:'enemyKills', bestiaryId:'hollowcantor', threshold:1 | `itemId:hcfwtrophy_exploration_meet_hollowcantor` |
| `exploration_meet_flatlinewraith` | bestiarySection:'enemyKills', bestiaryId:'flatlinewraith', threshold:1 | `itemId:hcfwtrophy_exploration_meet_flatlinewraith` |
| `exploration_meet_zeroamplitude` | bestiarySection:'enemyKills', bestiaryId:'zeroamplitude', threshold:1 | `itemId:hcfwtrophy_exploration_meet_zeroamplitude` |
| `exploration_meet_wobbler` | bestiarySection:'enemyKills', bestiaryId:'wobbler', threshold:1 | `itemId:hcfwtrophy_exploration_meet_wobbler` |
| `exploration_meet_subdrop` | bestiarySection:'enemyKills', bestiaryId:'subdrop', threshold:1 | `itemId:hcfwtrophy_exploration_meet_subdrop` |
| `exploration_meet_deadaircoda` | bestiarySection:'enemyKills', bestiaryId:'deadaircoda', threshold:1 | `itemId:hcfwtrophy_exploration_meet_deadaircoda` |
| `exploration_meet_flatlineburrower` | bestiarySection:'enemyKills', bestiaryId:'flatlineburrower', threshold:1 | `itemId:hcfwtrophy_exploration_meet_flatlineburrower` |
| `exploration_meet_silencestalker` | bestiarySection:'enemyKills', bestiaryId:'silencestalker', threshold:1 | `itemId:hcfwtrophy_exploration_meet_silencestalker` |
| `exploration_meet_decrescendosplitter` | bestiarySection:'enemyKills', bestiaryId:'decrescendosplitter', threshold:1 | `itemId:hcfwtrophy_exploration_meet_decrescendosplitter` |
| `exploration_meet_polyrhythm` | bestiarySection:'enemyKills', bestiaryId:'polyrhythm', threshold:1 | `itemId:hcfwtrophy_exploration_meet_polyrhythm` |
| `exploration_meet_tremorswarm` | bestiarySection:'enemyKills', bestiaryId:'tremorswarm', threshold:1 | `itemId:hcfwtrophy_exploration_meet_tremorswarm` |

### Collection (6)

| id | predicate | reward |
|---|---|---|
| `collection_hollowchorus_roster_t1` | Predicate D — bespoke breadth, `checkHollowChorusFinalWaveformCollection`, hc>=7/14 | `itemId:hcfwtrophy_collection_hc_roster_t1` |
| `collection_hollowchorus_roster_t2` | Predicate D — same helper, hc>=14/14 (full) | `familiarId:lastchordmoth` (capstone) |
| `collection_finalwaveform_roster_t1` | Predicate D — same helper, fw>=3/6 | `itemId:hcfwtrophy_collection_fw_roster_t1` |
| `collection_finalwaveform_roster_t2` | Predicate D — same helper, fw>=6/6 (full) | `itemId:lastwaveformcore` (capstone) |
| `collection_mainroute_superbosses` | Predicate D — same helper, sb>=2/2 (wobbler+subdrop) | `itemId:hcfwtrophy_collection_mainroute_sb` |
| `collection_grandcollection_1314` | Predicate D — same helper, hc+fw+sb>=22/22 (full) | `trinketId:lastbarritual` (capstone) |

## Verification (exact output)

1. `node --check` on every touched file (`defs-7.js`, `items-5.js`,
   `trinkets-2.js`, `familiars-2.js`, `items-1.js`, `game.js`,
   `combat-2.js`) — all pass. `index.html` sanity-checked with a Python
   parse confirming the new `<script>` tag is present and well-formed.
2. Full repo sweep — `for f in $(find js -name "*.js"); do node --check "$f"
   || echo FAIL; done` — **zero failures**, clean.
3. Node `vm` harness loading every `index.html` `<script>` **except**
   `js/main.js`, `js/ui/ui.js`, `js/ui/render.js`, `js/ui/roomEditor.js`,
   `js/ui/bestiary.js` (60 of 64 script tags), with a minimal DOM/
   localStorage/Audio shim — **zero thrown errors**, `ACHIEVEMENTS` array
   loads correctly.
4. `ACHIEVEMENTS.length`: **1991 before → 2083 after — delta 92**, exact
   match to the batch size.
5. **Zero duplicate `id`** across the full 2083-entry `ACHIEVEMENTS` array
   (checked with a `Set` over every id).
6. Reward-target collision sweep across `itemId`/`trinketId`/`familiarId`/
   `starId`/`pillColorId`/`enemyId` over the FULL array: **1 collision
   found, and it predates this batch** — `itemId:'championscrown'`, shared
   by design across all 25 `completionist_<class>` achievements (the item
   explicitly stacks; see `defs-1.js`'s own comment on that loop). **Zero
   new collisions introduced by this batch.** `shopDiscount`: 11 uses across
   the whole game, 11 distinct kinds — confirms it was already fully
   consumed and this batch correctly avoided it (`pillColorId`/`enemyId`
   likewise: 0 uses of either in `defs-7.js`, confirmed by grep).
   - Reward types confirmed genuinely repeatable-by-construction in this
     batch: `itemId`/`trinketId`/`familiarId` when the target id is FRESHLY
     MINTED for that one achievement (78 trophies + 14 capstones, each
     referenced by exactly one achievement — verified below). No reward
     type was reused across two DIFFERENT pre-existing targets.
7. No new stat-tracking code was added (every Predicate D condition reuses
   an existing flag/counter), so the "new stat has a definition + live bump
   site" check is N/A for this batch. The one genuinely new piece of
   tracking logic — `checkHollowChorusFinalWaveformCollection` and its
   `combat-2.js` call site — was traced by hand and confirmed reachable: it
   fires from `handleEnemyDeath`, which every player-kill code path in
   `combat-1.js`/`combat-2.js` already calls on `enemy.isDead`, and is
   additionally exercised by a live functional smoke test (below) that
   drives real kills through `bumpBestiaryCount` and confirms the 6
   Collection achievements unlock at the right counts.
8. Every new locked pickup verified real and unique:
   - 78 trophy items (`hcfwtrophy_*`) + 5 capstone items + 6 capstone
     trinkets + 3 capstone familiars = 92 minted ids, each confirmed present
     with a complete entry in its data table (`ITEMS`/`TRINKETS`/
     `FAMILIAR_TYPES`) and referenced by **exactly one** achievement (`itemId`/
     `trinketId`/`familiarId` grep over the loaded `ACHIEVEMENTS` array — 0
     mismatches).
   - All 6 new trinkets confirmed **absent** from `SUPERBOSS_REWARDS`'s
     consumed set (computed live from the loaded `TRINKET_LIST.filter(...)`
     expression) — the `pendingReward:true` flag works as intended.
9. **Functional smoke test** (beyond the plan's minimum, run for extra
   confidence): stubbed `main.js`'s `loadUnlocks`/`saveUnlocks` with an
   in-memory blob, then drove real kills through `bumpBestiaryCount` for
   every id in `HOLLOWCHORUS_ROSTER_IDS`/`FINALWAVEFORM_ROSTER_IDS`/
   `MAINROUTE_1314_SUPERBOSS_IDS` and called
   `checkHollowChorusFinalWaveformCollection` directly (mirroring the
   `combat-2.js` call site). Confirmed via `unlocks.achievements`: Slayer
   ladder rungs, Exploration first-encounter achievements, and all
   applicable Collection breadth achievements (`collection_hollowchorus_
   roster_t2`, `collection_finalwaveform_roster_t1`,
   `collection_mainroute_superbosses`) all unlocked correctly; the granted
   trophy/capstone items showed up in `unlocks.unlockedItems` as expected.

## Deviations from the plan, with justification

1. **Slayer widened beyond a literal "13/14 roster" reading (48 → 60
   achievements)**: floorKey `'13'`'s 8 regular + 4 reskin enemies already
   had a Slayer achievement from an earlier phase; re-touching those ids
   would either duplicate existing rungs (forbidden) or require deleting/
   editing pre-existing achievements (out of scope, would orphan players'
   earned unlocks). Added a second ladder on fresh `slayer2_*` ids at
   higher thresholds instead, so the section still delivers real,
   non-duplicate Slayer content over the full 13/14 roster while
   respecting "don't touch existing achievements."
2. **Challenge sized at 12, not the ~15-25 guidance**: kept every condition
   to a reuse of an existing flag/counter, per the plan's own preference
   ("reusing existing infra where possible... allowed but must be minimal
   and precedented" for anything new). Stretching further would have
   required inventing new per-run trackers (e.g. "no items collected on
   floors 13-14") with no existing precedent to follow, which felt like
   scope creep for marginal content value; 12 solid, precedented Challenge
   achievements over the 4-2 = 2 (wobbler/subdrop) hardest floors,
   +2 speedrun-to-floor, was judged sufficient.
3. **Collection sized at 6, not the ~10-15 guidance**: the scoped-breadth
   mechanism only supports three disjoint id lists (Hollow Chorus roster,
   Final Waveform roster, the 2 mainroute superbosses) plus their union;
   3-4 achievements per list (2 lists get 2 tiers, the superboss pair and
   the grand union get 1 each) is the natural ceiling before the category
   starts padding with redundant thresholds on the same 3 lists.
4. **Total landed at 92**, inside the 90-110 target band but toward the low
   end, a direct consequence of #2/#3 above; Slayer's extra 12 (from
   widening to 60) mostly compensates.
5. **10 pre-existing free locked familiars found but not used** (see Step 1
   finding #3) — the plan directed fresh, thematically-tied entries for
   capstones, so these were deliberately left alone for a future batch
   rather than spent here.

No other deviations — reward-strategy, file-placement, and CODE_REFERENCE.md
update all follow the plan as written once the reward-economy findings above
were established.
