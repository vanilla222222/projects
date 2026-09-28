# Audit — Phase 8e slice 3/4: 25 new familiars + skilltree-unlocks-familiars.js

## Files changed

- `js/data/familiars-1.js` — appended 25 new `sk8f_`-prefixed familiar defs at end of `FAMILIAR_TYPES`.
- `js/achievements/skilltree-unlocks-familiars.js` — **new file**. 1 hub (`unlock_familiars_hub`) + 25 leaf unlock nodes.
- `index.html` — added `<script src="js/achievements/skilltree-unlocks-familiars.js"></script>` immediately after `js/achievements/skilltree-general.js`.
- `js/CODE_REFERENCE.md` — added a note in the familiars-system section (near the `familiars-1.js`/`familiars-2.js` batch history) and a new `### achievements/skilltree-unlocks-familiars.js` section (after `skilltree-general.js`'s).

No changes to `js/systems/familiars.js` — every new familiar reuses an existing `behavior` string, exactly as instructed. No sibling-slice files (stars/trinkets/items) touched.

## Verification

Node `vm` harness at `/tmp/claude-.../scratchpad/verify_familiars.js` (loaded real `familiars-1.js`, `familiars-2.js`, `skilltree.js`, `skilltree-unlocks-familiars.js` via `vm.runInContext`, pulling out top-level `const`s explicitly since `vm.runInContext` doesn't attach `const`/`let` to the sandbox object the way `var` does).

Full output:

```
Found 25 sk8f_ familiar ids: sk8f_glowmoth, sk8f_cinderclaw, sk8f_hollowwisp, sk8f_briarcub, sk8f_glassfinch, sk8f_tarpitcher, sk8f_dunehare, sk8f_stormlark, sk8f_mossykettle, sk8f_gildedpurse, sk8f_batterygrub, sk8f_wardencub, sk8f_bastionmoth, sk8f_ferretling, sk8f_ravensnatch, sk8f_seedgrub, sk8f_ironlarva, sk8f_sparkpod, sk8f_ashcask, sk8f_focusgleam, sk8f_duskmirror, sk8f_packrat, sk8f_hoardgull, sk8f_furyimp, sk8f_gnatswarm
PASS: exactly 25 new sk8f_ familiars
PASS: all 25 sk8f_ ids exist in FAMILIAR_TYPES
PASS: no id collisions (object key count matches expected)
Known dispatched behaviors from familiars.js: orbiter, shooter, proc, blocker, thief, grower, detonator, mirror, scavenger, berserker, swarmer
PASS: all 25 familiars use a known dispatched behavior
Behavior mix: {"orbiter":4,"shooter":4,"proc":3,"blocker":2,"thief":2,"grower":2,"detonator":2,"mirror":2,"scavenger":2,"berserker":1,"swarmer":1}
PASS: all 25 familiars have locked:true
New skill node ids (26): unlock_familiars_hub, fam_orbit_hub, fam_orbit_cinderclaw, fam_orbit_hollowwisp, fam_orbit_briarcub, fam_ranged_hub, fam_ranged_tarpitcher, fam_ranged_dunehare, fam_ranged_stormlark, fam_ranged_focusgleam, fam_ranged_duskmirror, fam_support_hub, fam_support_gildedpurse, fam_support_batterygrub, fam_support_wardencub, fam_support_bastionmoth, fam_support_packrat, fam_support_hoardgull, fam_skirmish_hub, fam_skirmish_ravensnatch, fam_skirmish_seedgrub, fam_skirmish_ironlarva, fam_skirmish_furyimp, fam_skirmish_gnatswarm, fam_blast_hub, fam_blast_ashcask
PASS: 26 new skill nodes (1 hub + 25 leaves)
PASS: no duplicate node ids in SKILL_TREE_NODES overall
PASS: unlock_familiars_hub exists
PASS: unlock_familiars_hub parent is unlock_hub
PASS: all 26 new nodes reachable from unlock_familiars_hub (or is the hub itself)
PASS: no cycles in ancestor chains of new nodes
PASS: every leaf has exactly one unlock/familiar effect pointing to a real new familiar
PASS: every one of the 25 new familiars has a granting node

ALL CHECKS PASSED
```

Additional checks:

```
$ node --check js/achievements/skilltree-unlocks-familiars.js   -> exit 0
$ node --check js/data/familiars-1.js                            -> exit 0
$ grep -n "skilltree-unlocks-familiars" index.html
233:<script src="js/achievements/skilltree-unlocks-familiars.js"></script>
```

(Script tag confirmed immediately after `js/achievements/skilltree-general.js`, the last existing `skilltree-*` tag at the time this slice ran; sibling slices append their own tags concurrently and independently.)

## The 25 new familiars

| id | behavior | flavor |
|---|---|---|
| `sk8f_glowmoth` | orbiter | Glow Moth — pale-winged orbiter, dmg1/r42/spd3.4 |
| `sk8f_cinderclaw` | orbiter | Cinderclaw — slow heavy-clawed orbiter, dmg3/r50/spd1.6 |
| `sk8f_hollowwisp` | orbiter | Hollow Wisp — cold half-seen orbiter, dmg1, 15% freeze chance |
| `sk8f_briarcub` | orbiter | Briar Cub — thicket-born orbiter, dmg2/r48/spd2.6 |
| `sk8f_glassfinch` | shooter | Glass Finch — near-transparent bird, dmg1/cd0.95/fast bolt |
| `sk8f_tarpitcher` | shooter | Tar Pitcher — hunched, slow heavy shots, dmg3/cd2.3 |
| `sk8f_dunehare` | shooter | Dune Hare — plain floating shooter, dmg1/cd1.05 |
| `sk8f_stormlark` | shooter | Storm Lark — watchful sniper, dmg2/cd1.6 |
| `sk8f_mossykettle` | proc | Mossy Kettle — heal 0.5/50s |
| `sk8f_gildedpurse` | proc | Gilded Purse — coin 1/90s |
| `sk8f_batterygrub` | proc | Battery Grub — charge 1/90s |
| `sk8f_wardencub` | blocker | Warden Cub — 1 shield / 50s |
| `sk8f_bastionmoth` | blocker | Bastion Moth — 2 shields / 80s |
| `sk8f_ferretling` | thief | Ferretling — orbiter+steal, dmg1, stealChance0.12 |
| `sk8f_ravensnatch` | thief | Raven Snatch — heavier orbiter+steal, dmg2, stealChance0.2 |
| `sk8f_seedgrub` | grower | Seed Grub — dmg1, +0.25x per 15 kills, cap 3x |
| `sk8f_ironlarva` | grower | Iron Larva — dmg2, +0.3x per 25 kills, cap 3x |
| `sk8f_sparkpod` | detonator | Spark Pod — dmg2, blast every 6s, r70 |
| `sk8f_ashcask` | detonator | Ash Cask — dmg4, blast every 10s, r90 |
| `sk8f_focusgleam` | mirror | Focus Gleam — fires where you aim, dmg1/cd1.0 |
| `sk8f_duskmirror` | mirror | Dusk Mirror — heavier aim-mirror, dmg2/cd1.6 |
| `sk8f_packrat` | scavenger | Packrat — pulls pickups every 2.5s, r120 |
| `sk8f_hoardgull` | scavenger | Hoard Gull — pulls pickups every 1.5s, r80 |
| `sk8f_furyimp` | berserker | Fury Imp — dmg1, up to 2.5x at low health |
| `sk8f_gnatswarm` | swarmer | Gnat Swarm — 3 mini-orbs every 6s |

## Skill-tree topology

```
unlock_familiars_hub (child of unlock_hub, cost 1)
├── fam_orbit_hub -> fam_orbit_cinderclaw -> fam_orbit_hollowwisp -> fam_orbit_briarcub   (4, single chain)
├── fam_ranged_hub
│     ├── fam_ranged_tarpitcher
│     └── fam_ranged_dunehare -> fam_ranged_stormlark -> fam_ranged_focusgleam -> fam_ranged_duskmirror   (6 total)
├── fam_support_hub
│     ├── fam_support_gildedpurse -> fam_support_batterygrub
│     ├── fam_support_wardencub -> fam_support_bastionmoth
│     └── fam_support_packrat -> fam_support_hoardgull   (7 total)
├── fam_skirmish_hub
│     ├── fam_skirmish_ravensnatch
│     ├── fam_skirmish_seedgrub -> fam_skirmish_ironlarva
│     └── fam_skirmish_furyimp -> fam_skirmish_gnatswarm   (6 total)
└── fam_blast_hub, fam_blast_ashcask   (2, flat sibling pair, both direct children of the hub)
```

26 nodes total (1 hub + 25 leaves), matching the 25 new familiars 1:1.

## Deviations

None. No changes were needed to `js/systems/familiars.js` — all 25 familiars reuse existing behaviors (orbiter/shooter/proc/blocker/thief/grower/detonator/mirror/scavenger/berserker/swarmer) with only new stat-field combinations and flavor.
