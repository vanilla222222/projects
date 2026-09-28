# Audit — 15 new ENEMY_TYPES entries (js/enemies.js)

Only `js/enemies.js` was touched. `node --check js/enemies.js` passes. Every
`behavior:` value below is an existing dispatch key in combat.js's `updateEnemy`
switch (js/combat.js ~815) with a matching `aiXxx` in js/ai.js — no new AI, no
new behavior strings. No id collisions (checked all 15 ids across `js/*.js`
before adding; a full re-scan after the edit shows no duplicate keys inside
`ENEMY_TYPES`). No `isMinion` on any entry, so all 15 are in the random pools.

## Complete list of new entries

| # | id | name | stage / floorKey | behavior | hp | dmg | speed | radius | xpTier |
|---|----|------|------------------|----------|----|-----|-------|--------|--------|
| 1 | `boulderroller` | DNB Boulder Roller | stage 0 (Crypt) | `charger` | 6 | 3 | 50 | 14 | 2 |
| 2 | `rootroller` | DNB Root Roller | stage 1 (Forest) | `charger` | 7 | 3 | 48 | 15 | 2 |
| 3 | `gloomroller` | DNB Gloom Roller | floorKey `9A` | `charger` | 8 | 3 | 50 | 15 | — |
| 4 | `staticwisp` | DNB Static Wisp | stage 1 (Forest) | `ranged` | 3 | 1 | 60 | 10 | 1 |
| 5 | `glarewisp` | DNB Glare Wisp | stage 2 (Desert) | `ranged` | 3 | 1 | 58 | 10 | 2 |
| 6 | `cinderwisp` | DNB Cinder Wisp | stage 3 (Inferno) | `ranged` | 4 | 1 | 62 | 10 | 2 |
| 7 | `shadestalker` | DNB Shade Stalker | stage 0 (Crypt) | `teleporter` | 4 | 2 | 0 | 11 | 2 |
| 8 | `duneshade` | DNB Dune Shade | stage 2 (Desert) | `teleporter` | 4 | 2 | 0 | 11 | 2 |
| 9 | `abyssshade` | DNB Abyss Shade | floorKey `11A` | `teleporter` | 6 | 2 | 0 | 11 | — |
| 10 | `venomskitter` | DNB Venom Skitter | stage 1 (Forest) | `chaser` | 2 | 2 | 135 | 9 | 2 |
| 11 | `ashskitter` | DNB Ash Skitter | stage 3 (Inferno) | `chaser` | 3 | 2 | 138 | 9 | 2 |
| 12 | `venomcreeper` | DNB Venom Creeper | floorKey `10B` | `chaser` | 4 | 2 | 135 | 10 | — |
| 13 | `ironsentinel` | DNB Iron Sentinel | stage 2 (Desert) | `sentry` | 7 | 2 | 38 | 14 | 2 |
| 14 | `moltensentinel` | DNB Molten Sentinel | stage 3 (Inferno) | `sentry` | 8 | 2 | 38 | 15 | 2 |
| 15 | `riftsentinel` | DNB Rift Sentinel | floorKey `12A` | `sentry` | 9 | 2 | 38 | 15 | — |

Grouped by family (each is base + 2 recalibrated variants, the
skullcharger/sandcharger/hellcharger copy-and-retune pattern):

- **Boulder Roller** — `boulderroller` (0) / `rootroller` (1) / `gloomroller` (9A), all `charger`.
- **Static Wisp** — `staticwisp` (1) / `glarewisp` (2) / `cinderwisp` (3), all `ranged`.
- **Shade Stalker** — `shadestalker` (0) / `duneshade` (2) / `abyssshade` (11A), all `teleporter`.
- **Venom Skitter** — `venomskitter` (1) / `ashskitter` (3) / `venomcreeper` (10B), all `chaser`.
- **Iron Sentinel** — `ironsentinel` (2) / `moltensentinel` (3) / `riftsentinel` (12A), all `sentry`.

Placement in file: each entry sits at the end of its own stage/floorKey block,
in the file's existing two-line object-literal style (id/name/hp/dmg/speed/
radius/color/dark on line 1, behavior + per-archetype tuning + tier/stage on
line 2, third line only where the bolt fields need it), matching neighbours.

## How the stats were set

`hp:` is identity, not absolute — `enemyHpScale = 1.32^floorNum` multiplies it
at spawn (enemies.js header, ~line 27-84), so every number below was chosen by
reading 3-4 existing entries in the *same* pool and slotting in relative to
them, never by "picking a floor-13-sized number".

**Boulder Roller family (charger).** Reference points: `skullcharger` (hp 4,
dmg 3, spd 55, r 12) and `hollowknight` (hp 5, r 13) in the Crypt;
`boarrusher` (hp 5, dmg 3, spd 58, r 13) and the hp-9 `mosshide` wall in the
Forest; `tempestrusher` (hp 5) and `stormlurker` (hp 7) on 9A. The family's
identity is "tankier and slower than the stage's stock charger", so each sits
~1-2 hp above the local charger and ~5-8 px/s below it, with a slightly longer
`chargeCooldown` (2.6/2.5/2.5 vs the local 2.0-2.4) and a longer
`telegraphTime` 0.6 to keep the extra bulk fair. dmg stays 3 — every charger in
the file is dmg 3 and dmg is scaled separately in combat.js's
`playerDamageAmount`, so raising it would double-dip. Radius 14/15/15 tracks
the local heavy chassis (thornhide 16, stormlurker 15). 9A gets hp 8 because
the whole 9A roster runs about +1 hp over stage 1's.

**Static Wisp family (ranged).** `ranged` is the most common straightforward
shooter (18 uses) and the right archetype for a plain keep-distance wisp — the
`teleporter` blink-shooter was reserved for the Shade family. Compared against
`vineslinger`/`fernstalker` (hp 2, dmg 1, spd 55-58, keepDistance 190-200,
fireCooldown 1.5, boltSpeed 200-210) in the Forest, `mirageslinger`/`sandvortex`
(hp 2-3, spd 50-52) in the Desert, and `emberarcher`/`soulflame` (hp 3, spd
55-60, fireCooldown 1.3, boltSpeed 225) in Inferno. Each variant is +1 hp and
a few px/s faster than the stage's stock slinger — a shooter that kites a bit
better rather than a harder-hitting one — with dmg held at 1 (dmg 2 is what the
Inferno reserves for `soulflame`-class casters). Inferno's `cinderwisp` inherits
the stage's hotter cadence (fireCooldown 1.3, boltSpeed 230) exactly as the
existing Inferno ranged entries do. Radius 10 across the board, matching every
existing ranged shooter.

**Shade Stalker family (teleporter).** Copied structurally from `barrowblink`
(hp 3, dmg 1, spd 0, r 10, blinkCooldown 3.4, blinkRange 210, fireRange 400,
fireCooldown 1.4, boltSpeed 205, weight 0.6), with `wispblinker`/`flamewalker`
and 11A's `fathomblinker` (hp 5, dmg 2, blinkCooldown 3.1, blinkRange 230,
boltSpeed 225) as the other reference points. `speed:0` is deliberate and
matches every teleporter in the file — `aiTeleporter` moves by blinking, not by
walking. Each variant is +1 hp / +1 dmg over the stage's stock blinker to earn
the "stalker" name, with blink cadence tightening down the run (3.3 -> 3.2 ->
3.0) and blinkRange widening (215 -> 220 -> 235), exactly the trend the
existing blinkers already follow from Crypt to 11A. `weight:0.6` on all three
copies `barrowblink`/`fathomblinker`'s reduced spawn rate, since a blinker is
an annoying enemy to see three of.

**Venom Skitter family (chaser).** There is no separate "fast chaser"
behavior — `chaser` is generic and speed alone differentiates, confirmed by
`cryptcrawler` (spd 130) vs `tombguardian` (spd 40) both being `chaser`. So
these are tuned as glass cannons: speed at or just above the fastest chaser in
their pool (`sprout` 115 / `thornbeast` 90 in the Forest; `emberling` 120 in
Inferno; `junglestalker` 120 on 10B, with `midgecloud` at 150 as the swarm
ceiling), lowest-in-class hp (2/3/4, matching `duneskitter`-tier fragility per
pool), `contactCooldown:0.4` — the tightest value used by any existing chaser
(`cryptcrawler`, `dunestalker`) — and dmg 2 rather than the 1 those fast
chasers carry, which is the whole trade. Radius 9/9/10 keeps them small, in
line with the other speed-9-radius chasers.

**Iron Sentinel family (sentry).** Checked how the existing tanky enemies are
built first: `shielded:true` is **not** an authored field — `shielded` is a
*behavior* whose shield is toggled every frame by combat.js's `updateEnemy`
(`shieldTimer`/`shieldTime`/`vulnTime`), and the only other way an enemy gets
`e.shielded` is `grantedShield` from a `shielder`. Setting a static
`shielded:true` on a `sentry` would produce a permanently invulnerable enemy,
so it was deliberately not set on any of these three; the tankiness is carried
by hp/radius instead. Reference sentries: `sunsentry` (hp 5, dmg 1, spd 44,
r 12, threshold 28, fireRange 440, fireCooldown 1.2), `slagsentry` (hp 5, spd
42, r 13) and 12A's `refrainsentry` (hp 7, spd 42, r 13, threshold 34,
fireRange 460, fireCooldown 1.15). Each Sentinel is +2 hp and +1-2 radius over
its pool's stock sentry, dmg 2 instead of 1, and pays for it with slower feet
(38 vs 42-44), a slightly slower fire cadence than the local sentry (1.35/1.3/
1.25 vs 1.2/1.2/1.15), marginally shorter `fireRange`, and a higher
`sentryThreshold` (34/34/36) so it takes longer to switch into its firing
stance. `weight:0.6` keeps a 9-hp turret-wall from crowding a 12A room.

**Colors.** Every pair is a new `color`/`dark` combination not already in the
file, chosen to sit inside its pool's palette: stone grey for the Crypt roller,
moss green for the Forest roller, indigo for 9A's, teal/sand/ember for the
three wisps, slate/tan/deep-blue for the shades, acid green and hot red for the
skitters, steel/molten/violet for the sentinels. `boltColor` on the shooter-ish
entries follows the same pool convention as the neighbours it sits beside.
