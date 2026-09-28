# Rebalance audit

This documents a game-wide numeric rebalance of the Nightfall roguelite. The
work spanned **two sessions with different agents**, and the first agent was cut
off mid-task without writing anything down. That fact shapes this whole
document, so it is stated up front:

- **Section 1** is what *this* session changed. Every BEFORE value in it was
  read directly off disk before the edit, so those before/after pairs are fact.
- **Section 2** is what the *previous* session changed. Its edits are already
  on disk; the pre-rebalance values are **gone**. There is no git history in
  this repo, no backups, and the files were overwritten in place. Section 2 is
  reconstructed only from what the surviving code comments themselves assert,
  and anything not directly asserted is marked `unknown — pre-rebalance value
  not recoverable`. **No before-value in Section 2 has been guessed or
  back-inferred and presented as fact.**
- **Section 3** is what is not verified, and it is not a formality — see it
  before trusting any of this.

---

## Files changed

### Changed this session

| File | What changed |
| --- | --- |
| `js/items.js` | Degeneracy caps on 12 unbounded stats; outlier compression; active-item damage now depth-scaled; Windfall/Coin Purse payouts compressed; shop discount ceiling. |
| `js/data.js` | `FAMILIAR_TYPES` fully retuned (55 numbers) + tuning header; `SHOP_PICKUP_PRICES` synced and annotated as non-authoritative; verification note on the three `SHOP_*_PRICE` constants; 5 item descriptions corrected to match code. |
| `js/shop.js` | `SHOP_BASE_PRICES` pickup half retuned; full coins-per-floor / coins-per-run income derivation written in as a comment block. |
| `js/familiars.js` | New `familiarDamage()` depth curve; shooter acquisition range cut 420 → 300px; explicit reviewed-and-kept note on the two presentation constants. |
| `js/entities.js` | Comment only — removed a fabricated figure (Task 4). |
| `js/enemies.js` | Comment only — removed the same fabricated figure from its other occurrence. **This was outside the assigned task list**; see the note at the end of Section 1. |

### Changed by the previous session (not re-touched, except as noted)

`js/enemies.js`, `js/entities.js`, `js/combat.js`, `js/game.js`, `js/ai.js`,
`js/data.js`, `js/stars.js`, `js/pills.js`.

### Deliberately not touched

`js/render.js`, `js/utils.js`, `js/theme.js`, `style.css` (completed graphics
slice — colors live in `Theme.*` tokens), `js/roomTemplates.js` (open in the
user's editor), obstacle `hazard`/`walkable` flags, boss-room door slots,
`DONATION_CAP` and the donation-discount mechanism (tied to 20 persisted
achievements and to saved player data in `localStorage`).

---

## 1. Changes I made this session

### 1a. `js/items.js` — degeneracy caps

Every stat below was an **additive sum with no ceiling**, and most terms are
stacking pickup *counts* rather than booleans, so each had a reachable
degenerate end state. The previous session had already capped crit chance,
crit multiplier, dodge, and the fire-rate multiplier; these are the ones it had
not reached.

| Stat | BEFORE | AFTER | Degenerate state being closed |
| --- | --- | --- | --- |
| `player.speed` multiplier | floor `0.25`, **no ceiling** | `Util.clamp(…, 0.25, 2.2)` | **Correctness, not taste.** `tryMoveEntity` (combat.js) is a single-step collision test with no substepping and `main.js` clamps `dt` at 0.05s. A step longer than `TILE + 2*playerRadius` (32+24 = 56px) can cross a one-tile wall. ~35 speed sources plus a x2 speed star (Vega) put the worst case near 1950px/s ≈ 97px/frame — through geometry. 2.2 caps it at 858px/s ≈ 43px/frame. |
| `player.rangeTiles` | floor `0.25`, no ceiling | clamp `0.25 … 12` | 13 sources. Past ~12 tiles a ranged build clears rooms from the doorway; rooms are under 24 tiles wide. |
| `player.bossDamageBonus` | no cap | `Math.min(1, …)` | ~20 sources at 0.05–0.15. Uncapped sum passed +200% against bosses, which already grow slower than trash (`BOSS_HP_GROWTH`). |
| `player.lifestealChance` | no cap | `Math.min(0.4, …)` | 15 sources at 0.05–0.08 → crossed 1.0. Every hit healing half a heart, in a game whose contact damage is half a heart. |
| `player.venomChance` | no cap | `Math.min(0.5, …)` | ~12 sources each, lead term is a stacking count × `luckBonus`, and **luck itself has no ceiling**. All five could sit at 1.0. |
| `player.stunChance` | no cap | `Math.min(0.3, …)` | Hard lock — at 1.0 nothing in a non-boss room gets a turn. |
| `player.charmChance` | no cap | `Math.min(0.35, …)` | Converts rather than merely disables. |
| `player.freezeChance` | no cap | `Math.min(0.35, …)` | Hard lock. Looser than stun only because the Windigo spends 0.12 of it innately (`innateFreezeChance`) and stacking it is that class's identity. |
| `player.fearChance` | no cap | `Math.min(0.4, …)` | Disables offence, enemy still alive. |
| `player.magnetRadius` | no cap | `Math.min(220, …)` | 12 sources → ~400px, vs rooms 480–640px wide. Vacuums the room from the doorway. |
| `player.bombRadiusMult` | no cap | `Math.min(2.5, …)` | ~22 sources → 4x+ on a 92px base blast = whole-room clear, now with a depth-scaled `explosionDamage()` behind it. |
| `player.multishotExtra` | no cap | `Math.min(4, …)` | Straight multiplier on ranged output, compounding with every flat +damage item; Multi Shot and Double Barrel both stack. |
| `player.dealDiscount` | no cap | `Math.min(1, …)` | `game.js` already floors deal cost at 0.5 hearts, so this was never *free* — but past two copies every deal is pinned to the floor and price stops meaning anything. |
| `player.shopDiscountBonus` | no cap | `Math.min(0.5, …)` | 7 sources. |
| combined shop discount in `updateShop` | no cap | `Math.min(0.7, …)` | `loyaltybadge` alone is an unbounded stacking count; plus Merchant's Ring + Pocket Ledger + the above, the raw sum passed 1.0 and every slot collapsed to the 1c floor for the rest of the run. |

### 1b. `js/items.js` — outlier compression and curve re-check

| Thing | BEFORE | AFTER | Why |
| --- | --- | --- | --- |
| `sombrasownseal` ranged damage | `+3` (melee was already `+2`) | `+2` | The same item paid ranged 50% more than melee for the same heart-container cost. The previous session had evidently compressed melee and not reached ranged. Its `desc` in data.js still claimed `+3`; corrected. |
| `downyfeather` speed | `0.15` | `0.20` | It is quality 2 but was paying exactly what quality-1 Speed Up pays, and its own `desc` claimed +25%. Set between the two and the desc corrected to +20%. |
| Active-item damage: `moonshard` 3, `thundercloud` 4, `grapplinghoof` 3, `sombrasbargain` 4, `harbingeroftheend` 5, `livinglegendscrown` 4, `martyrsresolve` 4, `contractofshadows` 4, `sparkvial` 3 | flat constants | wrapped in a local `depthDmg()` = `round(base * bossHpScale(floor))`, min 1 | **This is the item half of the new enemy HP curve.** Enemy HP now compounds ~1.32^floor. A flat 4 was a room wipe on Floor 1 and a rounding error on Floor 10 — every active quietly stopped being an item halfway through a run. Rides the gentler *boss* curve (~1.28) for the same reason `explosionDamage()` does, so a charge-limited button never out-scales aiming. The authored 3/4/5 stay readable as identity. |
| `windfall` payout | `Util.randi(10, 16)` | `Util.randi(6, 11)` | See the income derivation in 1c. At `maxCharge:4` this fires 2–3 times on a 12-room floor; at 10–16 one quality-1 active matched or beat everything else the floor dropped, combined. |
| `coinpurse` payout | `Util.randi(5, 10)` | `Util.randi(4, 8)` | Same compression, held one step under Windfall since it recharges faster (`maxCharge:3`). |

### 1c. Coin economy — `js/shop.js`, `js/data.js`

**The income figure was derived first, and is now written into `shop.js` above
`SHOP_BASE_PRICES` so it never has to be re-derived.** Summary:

- Average coin pickup = **2.14c** (`COIN_TYPES` weights 78/15/6/1 over values 1/5/10/1).
- Per cleared normal room: 0.59c (room-clear reward) + 0.17c (its sack slice) +
  0.20c (its chest slice) + 0.85c (30% procedural chest) ≈ **1.8c**, call it
  **~2c** with template-placed coins.
- Normal rooms per floor = `10 + 2F` (`dungeon.js` `targetNormal`):
  **Floor 1 ≈ 24c, Floor 10 ≈ 60c, whole run ≈ 420c.**
- One shop per floor, 3–4 slots, mixed 35% pickup / 40% item / 12% trinket /
  13% familiar (trinket and familiar fall back to *item* when nothing is
  unlocked, so a fresh save's shop is nearly all items).

| Price | BEFORE | AFTER |
| --- | --- | --- |
| `SHOP_BASE_PRICES.heartRed` | 3 | 3 |
| `SHOP_BASE_PRICES.heartBlue` | 5 | 6 |
| `SHOP_BASE_PRICES.bomb` | 5 | 5 |
| `SHOP_BASE_PRICES.key` | 5 | 5 |
| `SHOP_BASE_PRICES.pill` | 5 | 5 |
| `SHOP_BASE_PRICES.star` | 5 | 7 |
| `SHOP_BASE_PRICES.sack` | 7 | 8 |
| `SHOP_BASE_PRICES.battery` | 7 | 9 |
| `SHOP_ITEM_PRICE` (data.js) | 16 | **16 — verified, left alone** |
| `SHOP_TRINKET_PRICE` | 9 | **9 — verified, left alone** |
| `SHOP_FAMILIAR_PRICE` | 12 | **12 — verified, left alone** |

At these prices the average shop slot costs ~11c and a shop holds ~39c of
stock, so a Floor-1 income (~24c) buys **about two of the 3–4 slots** — the
target ratio. By Floor 10 (~60c) a shop is fully affordable, which is where
the donation machine takes the surplus. The three `SHOP_*_PRICE` constants
already satisfied that ratio, so they were checked against the derivation and
**deliberately not moved**; a verification comment saying so was added instead.

Also fixed: **`SHOP_BASE_PRICES` and `data.js`'s `SHOP_PICKUP_PRICES` disagreed**
(bomb 5 vs 4, key 5 vs 4, star 5 vs 6, battery 7 vs 8). `room.js` reads only the
*kind* out of `SHOP_PICKUP_PRICES` and prices through `shopPrice()`, so its
`price` field is vestigial — it has been synced to the real values and labelled
as not-the-pricing-source in both files.

`DONATION_CAP` (1000) and the donation-discount mechanism were **not touched**.

### 1d. Familiars — `js/data.js` `FAMILIAR_TYPES` + `js/familiars.js`

**First, the question the task asked:** `FAMILIAR_TYPES` had **not** been
reached by the previous session. Every other block it touched carries a
detailed explanatory tuning comment in a consistent house style;
`FAMILIAR_TYPES` had none, and its numbers were internally incoherent in ways
that pass would not have left. It was therefore retuned here.

**Problem 1 — spread.** Within one behavior, every entry has the same generic
description and the same acquisition cost, but implied DPS ranged over
**6.75:1** for orbiters and **6.00:1** for shooters. `dmg:` is kept as identity
and the cooldown is now derived from it:

| Behavior | Rule | DPS spread BEFORE | AFTER |
| --- | --- | --- | --- |
| orbiter | dmg1 → `contactCooldown` 0.45, dmg2 → 0.70, dmg3 → 0.90 | 1.11 – 7.50 (**6.75:1**) | 1.67 – 3.33 (**2.00:1**) |
| shooter | dmg1 → `cooldown` 0.85–1.10, dmg2 → 1.50–1.80, dmg3 → 2.20–2.40 | 0.50 – 3.00 (**6.00:1**) | 0.91 – 1.36 (**1.50:1**) |

Freeze-capable orbiters (Moon Moth, Icedrake) sit one step under their band on
purpose — the freeze is the payment. Worst individual offenders: Roaring
Homunculus `cd 0.4 → 0.9` (7.50 → 3.33 DPS), Quiet Otter `0.45 → 0.9`,
Frozen Sylph `cooldown 1.0 → 2.2` (3.00 → 1.36 DPS), Coral Snail `2.0 → 1.1`
(0.50 → 0.91). 40 orbiter/shooter numbers changed in total.

**Problem 2 — proc rates.** These are wall-clock timers (farmable by standing
still) and they *stack* — every copy is another instance.

| Proc | BEFORE | AFTER | Note |
| --- | --- | --- | --- |
| heal, amount 0.5 | interval 35–55 | interval 50 | Rate band 0.55–1.71 hearts/min → flat **0.60**. |
| heal, amount 1 | interval 35–40 | interval 100 | A full heart every 35s is faster than the game can take it off you, against half-heart contact damage. |
| coin — `coinsprite` | 30s / 1c | **90s** / 1c | Was ~4.3c/min against a floor income of 24–60c total: one familiar rewrote the economy. |
| coin — `tipjar`, `mysticpuppet` | 40s / 2c | **120s** / 2c | Now ~1.4–2.1c/min. |
| charge — `chargebot` | 50s | **90s** | Fed the Windfall/Coin Purse loop as fast as those actives could spend it. |
| charge — `stormelemental`, `weatherednymph` | 55s | **90s** | |
| luckpulse — `luckycat` | 60s / +1 | **120s** / +1 | The only unbounded stat growth left: luck has no ceiling and feeds every status chance. |

15 proc intervals changed. A tuning header documenting all of the above was
added above `FAMILIAR_TYPES`.

**Problem 3 — the curve.** Familiar `dmg` was flat while enemy HP now
compounds. `familiars.js` gained:

```js
const FAMILIAR_DMG_GROWTH = 1.15;
function familiarDamage(baseDmg, floorNum){ … }
```

applied at both damage sites (orbiter contact, shooter bolt). Deliberately far
gentler than enemy HP (1.32) or bombs/poison (1.28): a familiar is free,
untargeted, unaimed DPS, so it should stay a supporting contribution. At 1.15
it ends a 10-floor run ~3.5x its Floor-1 self while trash ends it ~15x — it
goes from *"kills a Grave Grub in a second"* to *"chips in"*, never to *"clears
the room for you"*.

**The three hardcoded constants in `familiars.js`, as asked — decision on each:**

| Constant | Decision | Reason |
| --- | --- | --- |
| shooter targeting range, `420px` (was line 54) | **CHANGED → 300px** | A ranged class's own base reach is 7 tiles = 224px (`baseRangeTiles`); melee is 32px. At 420 a free familiar out-ranged its owner by ~2x and picked off enemies across most of a room (480–640px wide) that the player could not answer. 300 sits just past a ranged player's own reach. |
| orbit drift, `0.6` rad/s (line 42) | **LEFT ALONE** | Pure presentation. A shooter fires from wherever it is, so this touches neither damage, rate, nor reach. The actual anti-stacking is the per-familiar starting angle `index * 1.7` in `entities.js`. |
| shooter hover radius, `30px` (line 43) | **LEFT ALONE** | Same — presentation only. 30px keeps the flock inside the player's silhouette instead of widening a cluster the player has to read as a hitbox. |

A note recording both "left alone" decisions was written into the code so the
next person doesn't re-litigate them.

### 1e. Stale comments

| File | BEFORE | AFTER |
| --- | --- | --- |
| `js/entities.js` (Enemy constructor) | *"…for why the old flat `+ floorNum * 0.7` had to go."* | *"…for why the old flat per-floor HP addition had to go"*, plus an explicit note that the exact constant is not recoverable and is therefore deliberately not cited. |
| `js/enemies.js` (depth-scaling header) | cited the same `type.hp + floorNum * 0.7`, and derived *"the same flat +6"*, *"6:1 down to 2.25:1"*, and *"10A's roster spans 43-49 HP, a 1.14:1 spread"* from it | rewritten figure-free — the argument (a flat addition squashes identity toward 1:1) is preserved, the numbers derived from the guess are gone, with the same not-recoverable note. |

> **Out-of-plan change, flagged deliberately:** the `enemies.js` comment edit
> was not in the assigned task list — the task named only `entities.js`. It was
> made because it is the *same fabricated figure* the task asked to remove, and
> leaving it in one file while removing it from the other would be worse than
> either. It is **comment-only, zero behavioral effect**, and trivially
> revertible if that call was wrong.

### 1f. Item descriptions corrected to match code

These were text/code mismatches, all in `js/data.js`. Descriptions are shown to
the player, so a wrong one is a live bug, not a nit.

| Item | BEFORE | AFTER |
| --- | --- | --- |
| `multishot` | "fire **two** extra bolts" | "fire **one** extra bolt" (matches the previous session's nerf, which had left the text) |
| `downyfeather` | "+25% movement speed" | "+20%" (and the code moved 0.15 → 0.20) |
| `sombrasownseal` | "+3 damage to all attacks" | "+2 damage to all attacks" |
| `spikedbard`, `thornedvine` | "Enemies that touch you take **1** damage" | "…take damage, scaling with how deep you are" (the previous session had already made it `statusTickDamage(floor)`) |

---

## 2. Changes made by the previous agent

**Read this section as testimony, not as measurement.** Everything here is
reconstructed from comments the previous agent left in the code. The
pre-rebalance values are not recoverable: no git, no backups, files overwritten
in place. Where a comment states a before-value, it is quoted. Where it does
not, the cell says so.

### `js/enemies.js` — depth scaling (the centerpiece)

| Item | BEFORE | AFTER | Source |
| --- | --- | --- | --- |
| Enemy HP formula | a **flat per-floor addition** to `type.hp`. The exact constant is **unknown — pre-rebalance value not recoverable** (the comment that cited one was a guess; removed this session). | `ENEMY_HP_GROWTH = 1.32`, `hp = round(type.hp * 1.32^floor)` | Code comment, asserted |
| Boss HP formula | unknown — pre-rebalance value not recoverable | `BOSS_HP_GROWTH = 1.28` | Code comment |
| Bomb/blast damage | flat `4` (inferred — the new code is `4 * bossHpScale`, and the comment describes "a flat 4-damage bomb") | `explosionDamage(floor) = max(1, round(4 * 1.28^floor))` | **Inferred** from the retained base constant |
| Poison tick / Spiked Barding | flat (inferred `0.6`, same reasoning) | `statusTickDamage(floor) = max(1, round(0.6 * 1.28^floor))` | **Inferred** |
| Enemy stat tables (16 enemies × stages 0–2, 10 for stage 3, plus bosses) | unknown — pre-rebalance values not recoverable | retuned; `hp:` is now explicitly *identity on a shared scale*, e.g. Grave Grub 3, Mosshide 9 | Code comment |

**Claims the previous agent made about its own fit, which I could not verify
and did not attempt to re-derive:** that 1.32 puts a run's total enemy HP at
**98%** of the pre-rebalance game; that Floors 1, 9 and 10 each land within
**5%** of their old room totals; that a boss ends the run ~13x its Floor-1 self
against trash's ~15x. These are quoted, not confirmed — the baseline they were
fitted against no longer exists on disk.

### `js/entities.js`

| Item | BEFORE | AFTER | Source |
| --- | --- | --- | --- |
| `Enemy` HP | flat per-floor addition | `Math.round(type.hp * enemyHpScale(floorNum))`, min 1 | Read directly (current code) |
| `Boss` HP | same | `bossHpScale` | Read directly |

### `js/combat.js`

| Item | BEFORE | AFTER | Source |
| --- | --- | --- | --- |
| Player damage units | a **flat 0.5** for contact damage, ignoring each enemy's `dmg:` field | `playerDamageAmount(game, isBoss, dmgHalves)` counting in **half-hearts**; `dmg:1` = half a heart | Code comment, asserted |
| Sourceless hits | flat 0.5 (implied) | `CONTACT_DMG_DEFAULT = 1` half-heart, described as reproducing the old flat value exactly | Code comment |
| Late-game escalation | *"the old code doubled every hit from floorNum >= 6"* | `+1` half-heart from floor 6 onward | Code comment, asserted |
| `COIN_TYPES` weights | *"the old 90/7.5/2/0.5 split"*, avg **1.48c** | 78/15/6/1, avg **2.14c** | Code comment, asserted (this one *does* state its before-values) |
| Large Penny | *"a guaranteed dime"* | heavily penny-weighted roll (`LARGEPENNY_COIN_WEIGHTS`) | Code comment, asserted |
| `CHEST_TYPES.itemChance` | *"a flat 0.05 for all three locked kinds"* | stone 0.08 / gold 0.10 / cursed 0.16 | Code comment, asserted |
| `damagePlayer()` discipline | 7 sites in `ai.js` called `player.takeDamage()` directly, skipping status effects and losing Bestiary kill credit | all routed through `damagePlayer()` | Task briefing + code comment |

### `js/items.js` (the part the previous agent did reach)

| Item | BEFORE | AFTER | Source |
| --- | --- | --- | --- |
| `multishotExtra` per copy | **+2 extra bolts** | **+1** | Code comment, asserted |
| `razorfocus` crit multiplier | **+1 per copy** | **+0.5** | Code comment, asserted |
| `critChance` | uncapped, *"could and did cross 1.0"* | `Math.min(0.75, …)` | Code comment, asserted |
| `critMultiplier` | uncapped | `Math.min(4, …)` | Code comment, asserted |
| `dodgeChance` | uncapped | `Math.min(0.6, …)` | Code comment, asserted |
| fire-rate multiplier | uncapped | `Util.clamp(1/rateDenom, 0.35, 3)` | Read directly |
| pierce / homing / spectral / explosive | separate per-item `pierceCount` fields | unified `tearFlags` | Code comment |
| Range model | unknown — pre-rebalance value not recoverable | ranged classes gain a full tile per source, melee 25% | Code comment |

### `js/data.js`, `js/game.js`, `js/ai.js`, `js/stars.js`, `js/pills.js`

| File | What the comments assert | Before-values |
| --- | --- | --- |
| `data.js` | `COIN_TYPES`, `LARGEPENNY_COIN_WEIGHTS`, `CHEST_TYPES.itemChance` retuned (above); item/trinket/class tables touched | mostly unknown — not recoverable |
| `game.js` | hit-stop wiring added | n/a (new) |
| `ai.js` | 7 direct `takeDamage` calls rerouted; enemy behavior tuning | unknown |
| `stars.js` | star effects retuned (Alcyone +3 damage, Electra 1.5x / Vega 2x speed) | unknown |
| `pills.js` | pill effects retuned; every stat a pill touches now has a floor in `recalcPlayerStats` | unknown |

---

## 3. Not verified / open risks

### The big one

**Nothing in this entire revamp — neither session's work — has ever been
executed, or even syntax-checked.** There is no JavaScript runtime on this
machine: `node`, `bun` and `deno` are all absent. Nothing was run. No test was
written or executed (the user explicitly asked for no smoke-testing, and there
is no test infrastructure in this repo in any case).

What was actually done to check this session's edits:
- every edited region was re-read after writing;
- a bracket-balance pass (comment- and string-aware) over `items.js`,
  `data.js`, `familiars.js`, `shop.js`, `entities.js`, `enemies.js` — all
  balanced;
- the `FAMILIAR_TYPES` retune was applied by a script that asserted each of the
  55 target fields existed and was replaced exactly once, then the resulting
  DPS/rate bands were recomputed from the rewritten file.

Bracket balance is **not** a syntax check and a DPS recomputation is **not** a
playtest. **The first real validation of any of this is the user opening
`index.html` in a browser and watching the console.**

### Specific risks

1. **`familiarDamage()` and `depthDmg()` read `game.dungeon.floorNum`.** Both
   are new call sites for that path in files that did not previously reach for
   it. If `game.dungeon` is ever null when a familiar ticks or an active fires
   (e.g. during a floor transition), that throws. `combat.js` reads the same
   path in the same phase of the frame, so it is very likely fine — but it is
   unproven.
2. **Script load order — checked, and fine.** `index.html` loads `data.js`
   (135) → `enemies.js` (136) → `entities.js` (143) → `familiars.js` (146) →
   `items.js` (149) → `shop.js` (150). So `bossHpScale()` exists before
   `items.js` needs it, `familiarDamage()` before anything calls it, and the
   one *load-time* dependency in this change set — `SHOP_BASE_PRICES` in
   `shop.js` evaluating `SHOP_ITEM_PRICE` from `data.js` — resolves in the
   right order. (Top-level `const` does not hoist across scripts, so that one
   mattered.)
3. **The cap values are judgement calls, not fits.** 0.3/0.35/0.4/0.5 for the
   statuses, 220px magnet, 2.5x bomb, 12 tiles, 4 multishot, 0.7 shop discount
   — each is argued in a code comment, none is fitted to data. They close
   degenerate ceilings; they were not tuned for feel. Expect to move them.
4. **The speed cap of 2.2 is the one cap that is a hard bound**, and its
   derivation assumes player radius 12, `TILE` 32, and `dt ≤ 0.05`. If any of
   those three change, recompute it. It also assumes `starSpeedMult` maxes at 2
   (Vega).
5. **The income derivation is a model, not a measurement.** It assumes the
   player clears essentially every normal room, and it ignores coins
   hand-placed in `roomTemplates.js` (not read — that file is open in the
   user's editor) and the coin-value multiplier items, which can add up to
   ~+2x on a hoarder build. Real income is therefore **higher** than ~2c/room,
   which means shop prices are, if anything, slightly *cheap*.
6. **Familiar normalization flattens variety.** Orbiters and shooters now
   differ mainly by `dmg` tier, `orbitSpeed`, `radius` and `boltSpeed` — the
   supermassive batch was already using one shared description per behavior, so
   little identity was lost, but a designer who intended some of those outliers
   as "this one is the good one" will disagree with this pass.
7. **Familiar `1.15` growth is a guess.** It is a deliberate design choice
   (supporting DPS, not primary), but there is no data behind that exponent.
8. **Windfall + charge familiars is still an unbounded coin loop**, just a much
   slower one (charge procs went 50–55s → 90s, Windfall 10–16 → 6–11). It is
   not closed, only made tedious. Closing it properly means changing active
   recharge itself, which was out of scope.
9. **Player base damage does not scale with depth, and enemy HP now does.**
   That is the intended design (items are the counter), but it means the run
   is *more* item-dependent than before, and a bad item run will feel much
   worse on floors 7–10 than it used to. This is the single most likely thing
   to need another pass after the user actually plays it.
10. **The previous agent's fitted percentages (98% total HP, ±5% per floor)
    could not be re-derived**, because the baseline they were fitted against no
    longer exists. If those numbers were wrong, everything downstream of them
    — including this session's item and familiar curves — inherits the error.
11. **`data.js` `SHOP_PICKUP_PRICES.price` is still dead data.** It was synced
    and annotated rather than deleted, because `roomEditor.js` iterates the
    list. If someone later edits those prices expecting them to matter, they
    will not.
