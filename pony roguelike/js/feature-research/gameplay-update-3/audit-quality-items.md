# Audit — ITEMS `quality` rebalance (non-trophy entries)

## Files changed

- `js/data.js` — 183 lines changed, each an isolated `quality:N` digit inside the `ITEMS` table. No other field on any entry was touched; verified by diffing every changed line against the pre-edit file with the `quality:N` token masked out (0 collateral differences), and by confirming the file's line count and its 661 `quality:` entries are unchanged.

## Scope

- 377 non-trophy `ITEMS` entries in scope (661 total `quality:` entries = 377 in scope + 284 `slayertrophy_*`/`masterytrophy_*`, which were left completely untouched).
- The 15 `explorationtrophy_*` entries are NOT slayer/mastery trophies, so they were in scope — all 15 already sat at q1 and all 15 stayed at q1.

## Method

Every item was scored from its `desc` text on a single additive ladder, anchored to the three confirmed reference points:

| Anchor | Effect | Tier |
|---|---|---|
| `ironshoes` / `damageup` / `palebrooch` | +1 damage to all attacks | q1 (score 3.4) |
| `firerateup` | Attacks and shots recharge faster | q1 (score 3.4) |
| `thickmane` / `hpup` | +1 heart container | q2 (score 3.6) |
| `warhorn` / `executionersmark` | +2 damage to all attacks | q3 (score 6.2) |
| `secondwind` / `borrowedwings` | survive-lethal / flight | q4 (score 9.0) |

Tier cutoffs: q1 <= 3.4, q2 <= 5.4, q3 <= 7.4, q4 > 7.4.

Per the user's "damage and firerate are naturally better" instruction, +1 damage and the fire-rate bump were pinned at the TOP of q1 — above every other single stat in the table (+20% speed = 3.0, +8% crit = 2.88, +8% dodge = 2.8, +15% boss damage = 3.3, +25% blast radius = 1.5, +2 coin/shop/magnet effects all lower). So no damage or fire-rate item is ever tiered below a comparable non-damage item of the same complexity.

## Changed items (183)

| id | old | new | reasoning |
|---|---|---|---|
| `downyfeather` | q2 | q1 | Single movement stat, same family as q1 `speedup` (+15%) and below the `ironshoes` +1 damage q1 baseline (score 3). |
| `piercingshot` | q2 | q1 | Single ranged-only stat, valued on par with the +1 damage q1 baseline (`ironshoes`); `piercingshot`/`goldenmedallion` family now uniform (score 3.4). |
| `guardianhalo` | q3 | q2 | A single flat defensive stat; 10% dodge is the largest in its family but still below `warhorn` (+2 damage) — sits with `charmbracelet` at q2, above the 4-8% dodge trinkets at q1. (score 3.5). |
| `razorfocus` | q2 | q1 | Crit-damage multiplier alone does nothing without crit chance; a narrower single stat than `ironshoes` +1 damage (q1). Now matches its clone `razorwing`. (score 2.6). |
| `vialcourage` | q3 | q2 | One-use 5s invincibility plus speed; comparable to q2 actives `flashpowder`/`chronoshard`, well under the repeatable `warhorn` q3. (score 4). |
| `allseeingeye` | q2 | q1 | One-use map reveal; strictly less than the permanent passive `nightlens` (q2), and no combat impact at all vs `ironshoes` q1. (score 2). |
| `grapplinghoof` | q2 | q1 | One-use dash with damage; on par with the q1 active `bombsatchel`, below the room-wide q2 nuke `moonshard`. (score 3). |
| `voidcharm` | q3 | q1 | Narrow boss-only conditional; strictly worse than the always-on `ironshoes` +1 damage q1 baseline (score 3.3). |
| `whisperingkey` | q2 | q1 | One free key per floor is pure convenience; identical in kind to its q1 clone `vaultcracker`. (score 1.8). |
| `midastouch` | q3 | q2 | Chests guaranteed 3+ pickups is a solid economy upgrade, roughly `merchantsring` (20% off shop, q2) territory — not `warhorn` q3 territory. (score 4.5). |
| `marathonscharm` | q2 | q1 | Single movement stat, same family as q1 `speedup` (+15%) and below the `ironshoes` +1 damage q1 baseline (score 3). |
| `meditationbell` | q3 | q2 | One-use full heal; more than q2 `healingdraught` (2 hearts) but still a single consumable, under q3 `ironcurtain` (3-hit shield). (score 5). |
| `panicwhistle` | q2 | q1 | 3s invincibility, one use — strictly less than q2 `vialcourage` (5s plus speed), so q1. (score 2.2). |
| `gamblerscoin` | q3 | q2 | +2 Luck plus a small crit bump — the q2 `gildedcompass` (+2 Luck) plus a q1-tier extra; matches `cartographerseye`, does not reach `warhorn` q3. (score 5.4). |
| `giftbox` | q2 | q1 | One-use 3 random pickups; on par with q1 `windfall`/`largepenny` and below q2 `healingdraught`. Now matches its clone `vaultemperorsseal`. (score 3). |
| `eagleeye` | q2 | q1 | Range-only stat, marginally better than q1 `rangeup` but far under the `ironshoes` +1 damage q1 baseline in combat value. (score 2.6). |
| `hawkfeather` | q2 | q1 | Single ranged-only stat, valued on par with the +1 damage q1 baseline (`ironshoes`); `piercingshot`/`goldenmedallion` family now uniform (score 3.4). |
| `razorwing` | q2 | q1 | Identical desc to `razorfocus` — both now q1, matching the +1 damage `ironshoes` baseline shape (single narrow stat). (score 2.6). |
| `stonehide` | q2 | q1 | Single small defensive stat; below the `ironshoes` +1 damage q1 baseline, same family as `stonehide` (score 1.4). |
| `bossbane` | q3 | q1 | Narrow boss-only conditional; strictly worse than the always-on `ironshoes` +1 damage q1 baseline (score 1.76). |
| `brokenwatch` | q2 | q1 | +20% fire rate paired with a -10% speed penalty nets below the clean `firerateup` q1 baseline. (score 1.9). |
| `luckydie` | q2 | q1 | A coin flip that averages near zero Luck; strictly worse in expectation than q1 `luckup` (+1 Luck). (score 2). |
| `goldenclover` | q2 | q1 | 5% coin-on-kill is a small economy trickle, below q1 `gluttonyscoin` (+20% coin value). (score 1.5). |
| `quickfuse` | q2 | q1 | Faster bomb fuses is narrow utility with no stat impact; below q1 `bombrangeup` (+25% blast radius). (score 1.5). |
| `nightowlfeather` | q3 | q1 | Reveals room shapes only (not types) — strictly less information than q1 `spectraltoken` and q2 `nightlens`. (score 2). |
| `swiftrecovery` | q2 | q1 | Red hearts heal 50% more is conditional sustain, weaker than the always-on q1 lifesteal trinkets like `ambersigil`. (score 2.4). |
| `fortuneshell` | q3 | q1 | Skewing room-clear rewards toward chests is pure economy; below the `ironshoes` +1 damage q1 baseline. (score 2.6). |
| `spiderring` | q2 | q1 | Pierce (worth the same as +1 damage on this ladder) fully cancelled by -1 damage — nets to zero, so q1. (score 0). |
| `charmedpendant` | q2 | q1 | One-time pill identification is information-only utility, below q1 `lunaraffinity`. (score 1.5). |
| `spectraltoken` | q2 | q1 | Reveals one room type per floor; less than q2 `nightlens` (whole map incl. secrets), matches q1 `starlitcompass`. (score 2.4). |
| `witheredapple` | q3 | q2 | +2 damage offset by a heart; nets out near q2 `soulseller`, clearly under `warhorn` (+2 damage, no cost) (score 3.8). |
| `witchbrew` | q3 | q2 | A one-time full heal bought with a permanent -10% speed; nets below q2 `healingdraught` plus a lasting downside. (score 3.5). |
| `emberheart` | q3 | q2 | A 10% stun-on-damage-taken proc is a reactive room-wide effect, comparable to q2 `flashpowder`, not a build-definer like `warhorn` q3. (score 4). |
| `calmingincense` | q3 | q2 | A permanent 15% enemy slow aura is real but single-effect; sits with q2 `spikedbard` (contact damage), under q3 `stormbarrel` (10% double damage). (score 4.5). |
| `stonewall` | q4 | q2 | Boss-only, and self-cancelling (-25% taken but -10% dealt). Narrower than q2 `merchantsring`; nowhere near `secondwind`/`borrowedwings` q4. (score 4). |
| `mirrorshard` | q4 | q3 | +30% melee swing arc is a genuine melee-build changer, on par with q3 `ironcurtain`/`stormbarrel` — but it is one melee-only effect, not a q4 game-changer like `borrowedwings`. (score 5.6). |
| `puritycharm` | q1 | q2 | Luck-only stat: +1 Luck = q1 (`luckup`), +2 Luck = q2 (`gildedcompass`) (score 3.6). |
| `wingedgrace` | q2 | q1 | Single small defensive stat; below the `ironshoes` +1 damage q1 baseline, same family as `stonehide` (score 2.1). |
| `haloedcrown` | q3 | q2 | The `ironshoes` +1 damage q1 baseline plus a small crit bump — the same strict-superset shape as `cursedhalo`/`graniteknuckles`, so q2. (score 5.2). |
| `holywater` | q2 | q1 | Free cursed-room entry is narrow situational utility; below q1 `cursedlocket` in frequency of relevance. (score 2). |
| `seraphshield` | q2 | q1 | +0.3s i-frames is a single small defensive stat, same family as q1 `temperedsteel` (+0.2s). (score 2.4). |
| `starlitcompass` | q2 | q1 | Reveals two room locations per floor; information-only, matches its q1 twin `infernalcompass` and sits below q2 `nightlens`. (score 2.2). |
| `ascendantcharm` | q3 | q2 | A heart container (the q2 `thickmane` anchor) plus one small Luck bump — a strict superset of q2, not enough to reach `warhorn` q3. (score 5.4). |
| `gildedwing` | q2 | q1 | Two small stats (+10% speed, +5% dodge) that together still total less than the single `ironshoes` +1 damage q1 baseline. (score 3.25). |
| `blackheart` | q2 | q1 | +1 damage offset by a heart nets out below the plain `ironshoes` q1 baseline (score 1). |
| `hollowsoul` | q3 | q2 | Double-damage baseline plus a real secondary effect — top of the ladder alongside `worldbreakergauntlet` (score 4.4). |
| `bloodpact` | q2 | q1 | Lifesteal proc; 8% (`vampfang`) is the q2 anchor, 5-6% sits at q1 below the +1 damage baseline (score 3). |
| `voidwhisper` | q3 | q1 | Narrow boss-only conditional; strictly worse than the always-on `ironshoes` +1 damage q1 baseline (score 2.64). |
| `envyshard` | q2 | q1 | Flat proc, same family as q1 `venomfang`/`directstun`; weaker than the luck-scaled q1 procs `venom`/`hardhitter` (score 1.68). |
| `plaguebreath` | q2 | q1 | Flat proc, same family as q1 `venomfang`/`directstun`; weaker than the luck-scaled q1 procs `venom`/`hardhitter` (score 1.68). |
| `despairtoken` | q2 | q1 | Flat proc, same family as q1 `venomfang`/`directstun`; weaker than the luck-scaled q1 procs `venom`/`hardhitter` (score 1.68). |
| `souldrain` | q3 | q1 | +10% crit bought with a heart container — nets below the free `directhit` (+5% crit, q1) once the cost is priced in. (score 1.2). |
| `cursedhalo` | q3 | q2 | Plain damage baseline plus one small secondary (Luck) — a strict-superset-of-q1 item, so q2, not q3 (matches the `cursedhalo` over-tiering finding) (score 5.2). |
| `sombrasbargain` | q3 | q2 | A room-wide nuke that costs half a heart every use; the cost drops it under free q3 `thundercloud` to join its twin `martyrsresolve` at q2. (score 4.5). |
| `infernalcompass` | q2 | q1 | Identical desc to `starlitcompass` — both now q1 as information-only reveals. (score 2.2). |
| `familiarfriend` | q2 | q1 | +1 Luck plus a tiny speed bump totals under the single `ironshoes` +1 damage q1 baseline. (score 2.55). |
| `damnedsoul` | q2 | q1 | Narrow boss-only conditional; strictly worse than the always-on `ironshoes` +1 damage q1 baseline (score 2.2). |
| `mastervaultkeeper` | q2 | q1 | Economy-only discount; weaker than the `ironshoes` +1 damage q1 baseline, matches q1 `loyaltybadge` (score 2). |
| `pestcontrol` | q2 | q1 | Single movement stat, same family as q1 `speedup` (+15%) and below the `ironshoes` +1 damage q1 baseline (score 1.5). |
| `siegebreaker` | q2 | q3 | Double the `ironshoes` +1 damage q1 baseline with no downside — matches q3 `warhorn`/`executionersmark` (score 6.2). |
| `chainreaction` | q3 | q2 | Plain damage baseline plus one small secondary (Luck) — a strict-superset-of-q1 item, so q2, not q3 (matches the `cursedhalo` over-tiering finding) (score 5.2). |
| `cartographerseye` | q3 | q2 | +1 Luck and +5% crit — two q1-magnitude stats, summing to the q2 `thickmane` heart-container level, not `warhorn` q3. (score 3.6). |
| `chestwhisperer` | q2 | q1 | Identical to the `ironshoes`/`damageup` q1 baseline — plain single-stat +1 damage (score 3.4). |
| `quarrymanscharm` | q2 | q1 | Single narrow stat, same family as q1 `bombrangeup` (+25%) (score 0.9). |
| `rubblerunner` | q3 | q2 | Plain damage baseline plus one narrow secondary — same shape as `graniteknuckles`, so q2 (score 4.9). |
| `frequentbuyercard` | q2 | q1 | Economy-only discount; weaker than the `ironshoes` +1 damage q1 baseline, matches q1 `loyaltybadge` (score 1). |
| `vipmembershipcard` | q3 | q2 | +1 Luck plus a 10% shop discount; the discount half is q1-tier (`mastervaultkeeper`), so the pair lands at q2. (score 3.8). |
| `blacklockboxkey` | q2 | q1 | +1 damage offset by a heart nets out below the plain `ironshoes` q1 baseline (score 1). |
| `devilsbargainring` | q3 | q2 | +2 damage offset by a heart; nets out near q2 `soulseller`, clearly under `warhorn` (+2 damage, no cost) (score 3.8). |
| `slayerssigil` | q2 | q1 | Identical to the `ironshoes`/`damageup` q1 baseline — plain single-stat +1 damage (score 3.4). |
| `harbingeroftheend` | q4 | q3 | The strongest one-use nuke in the table, above q3 `thundercloud` — but still a single consumable, unlike the permanent q4s `borrowedwings`/`guardianfeather`. (score 6.5). |
| `giantslayersbelt` | q3 | q1 | Narrow boss-only conditional; strictly worse than the always-on `ironshoes` +1 damage q1 baseline (score 2.2). |
| `trophyrack` | q3 | q1 | Narrow boss-only conditional; strictly worse than the always-on `ironshoes` +1 damage q1 baseline (score 3.3). |
| `legendsmantle` | q4 | q3 | Identical desc to `ironcurtain` (q3) — the two are now consistent. (score 5.6). |
| `overflowingpurse` | q2 | q1 | Economy-only stat with no combat impact; well below the `ironshoes` +1 damage q1 baseline (score 0.75). |
| `misersvault` | q3 | q1 | Economy-only stat with no combat impact; well below the `ironshoes` +1 damage q1 baseline (score 1.25). |
| `dragonshoardshard` | q4 | q2 | +1 Luck plus a coin-value bump; coin value is the weakest stat family on this ladder (q1 `misersvault`), so this is q2 at most, not q4. (score 3.55). |
| `blastproofgloves` | q2 | q1 | Single narrow stat, same family as q1 `bombrangeup` (+25%) (score 0.9). |
| `graniteknuckles` | q3 | q2 | Plain damage baseline plus one narrow secondary — same shape as `graniteknuckles`, so q2 (score 4.3). |
| `demolitionistsbadge` | q2 | q1 | Single narrow stat, same family as q1 `bombrangeup` (+25%) (score 1.2). |
| `rubblekingscrown` | q3 | q2 | Plain damage baseline plus one narrow secondary — same shape as `graniteknuckles`, so q2 (score 5.2). |
| `fusemastersglove` | q2 | q1 | Plain single-stat fire rate, same magnitude class as the `firerateup` q1 baseline (score 3.4). |
| `powderkegheart` | q3 | q1 | Identical desc to `bombsatchel` (q1) — the two are now consistent. (score 2.2). |
| `endlessquiver` | q2 | q1 | Single ranged-only stat, valued on par with the +1 damage q1 baseline (`ironshoes`); `piercingshot`/`goldenmedallion` family now uniform (score 3.4). |
| `assassinsedge` | q2 | q1 | Single crit stat, same family as q1 `directhit` (+5% crit); below the `ironshoes` +1 damage q1 baseline (score 1.8). |
| `deathsprecisionblade` | q4 | q3 | Crit% plus crit-damage multiplier — a genuine two-part crit build package, on par with q3 `executionersfocus` (score 6.2). |
| `collectorssatchel` | q2 | q1 | Luck-only stat: +1 Luck = q1 (`luckup`), +2 Luck = q2 (`gildedcompass`) (score 1.8). |
| `trinketcase` | q2 | q1 | Single small defensive stat; below the `ironshoes` +1 damage q1 baseline, same family as `stonehide` (score 1.75). |
| `charmbracelet` | q3 | q2 | +1 Luck plus 8% dodge; both individually q1-tier, summing to just over the q2 `thickmane` line. (score 4.6). |
| `beastmasterswhistle` | q2 | q1 | Single movement stat, same family as q1 `speedup` (+15%) and below the `ironshoes` +1 damage q1 baseline (score 1.2). |
| `menageriekeeperscloak` | q3 | q2 | +12% speed and +1 Luck — two q1-magnitude stats, exactly the q2 `thickmane` level; matches `crittercharm` scaled up. (score 3.6). |
| `phoenixfeathershard` | q3 | q2 | A heart container (q2 anchor `thickmane`) plus a small i-frame bump (q1 `temperedsteel`) — a q2 superset, short of `warhorn` q3. (score 5.2). |
| `championssash` | q3 | q2 | Plain damage baseline plus a small speed bump; same shape as q2 `undefeatedchampion` (score 4.9). |
| `livinglegendscrown` | q4 | q3 | Full red-heart restore plus a nova — two q2-tier actives in one, reaching q3 alongside `giantsheart`, but it is still one-use so not q4. (score 7.2). |
| `explorersboots` | q2 | q1 | Single movement stat, same family as q1 `speedup` (+15%) and below the `ironshoes` +1 damage q1 baseline (score 1.5). |
| `frequentflyercoin` | q2 | q1 | Economy-only discount; weaker than the `ironshoes` +1 damage q1 baseline, matches q1 `loyaltybadge` (score 1). |
| `merchantsbestfriendbadge` | q3 | q1 | Economy-only discount; weaker than the `ironshoes` +1 damage q1 baseline, matches q1 `loyaltybadge` (score 2). |
| `overchargedbattery` | q2 | q1 | Identical to the `ironshoes`/`damageup` q1 baseline — plain single-stat +1 damage (score 3.4). |
| `voltaiccore` | q3 | q4 | Double-damage baseline plus a real secondary effect — top of the ladder alongside `worldbreakergauntlet` (score 8). |
| `bruiserswraps` | q2 | q1 | Identical to the `ironshoes`/`damageup` q1 baseline — plain single-stat +1 damage (score 3.4). |
| `ironhoofgauntlet` | q3 | q4 | Double-damage baseline plus a real secondary effect — top of the ladder alongside `worldbreakergauntlet` (score 7.7). |
| `longbowstring` | q2 | q1 | Single ranged-only stat, valued on par with the +1 damage q1 baseline (`ironshoes`); `piercingshot`/`goldenmedallion` family now uniform (score 3.4). |
| `deadeyelens` | q3 | q2 | +5% crit plus homing bolts; homing alone is the q2 `haloguidance`, and the crit half is q1 `directhit`. (score 5.4). |
| `apothecaryssatchel` | q2 | q1 | Luck-only stat: +1 Luck = q1 (`luckup`), +2 Luck = q2 (`gildedcompass`) (score 1.8). |
| `crittercharm` | q2 | q1 | +8% speed and +1 Luck together total under the single `ironshoes` +1 damage q1 baseline. (score 3). |
| `beastfriendsbond` | q3 | q2 | +12% speed and +2 Luck — the q2 `gildedcompass` (+2 Luck) plus a q1 speed bump, so q2; consistent with `menageriekeeperscloak`. (score 5.4). |
| `hexbreakertalisman` | q2 | q1 | +1 damage offset by a heart nets out below the plain `ironshoes` q1 baseline (score 1). |
| `masterkeyring` | q2 | q1 | Economy-only discount; weaker than the `ironshoes` +1 damage q1 baseline, matches q1 `loyaltybadge` (score 1). |
| `vaultemperorsseal` | q3 | q1 | Identical desc to `giftbox` — both now q1 as one-use pickup bundles. (score 3). |
| `arenachampionsbelt` | q3 | q4 | Double-damage baseline plus a real secondary effect — top of the ladder alongside `worldbreakergauntlet` (score 7.7). |
| `radianthalofragment` | q3 | q4 | Three substantial stats at once (heart container + full q2-tier Luck + the largest crit bump in the table) — the same multi-stat shape as q4 `championscrown`. (score 10.08). |
| `contractofshadows` | q2 | q3 | A free room-wide nuke with no heart cost — matches q3 `thundercloud`, and beats the half-heart-cost `sombrasbargain` (q2). (score 5.5). |
| `sombrasownseal` | q4 | q3 | Double-damage baseline plus a real secondary effect — top of the ladder alongside `worldbreakergauntlet` (score 5.56). |
| `swarmrepellent` | q2 | q1 | Single movement stat, same family as q1 `speedup` (+15%) and below the `ironshoes` +1 damage q1 baseline (score 1.5). |
| `antiturretplating` | q2 | q1 | Single small defensive stat; below the `ironshoes` +1 damage q1 baseline, same family as `stonehide` (score 2.8). |
| `sentrywreckersfist` | q3 | q4 | Double-damage baseline plus a real secondary effect — top of the ladder alongside `worldbreakergauntlet` (score 9). |
| `detonationspecialistbadge` | q3 | q4 | Double-damage baseline plus a real secondary effect — top of the ladder alongside `worldbreakergauntlet` (score 8). |
| `hardenedscales` | q2 | q1 | Single small defensive stat; below the `ironshoes` +1 damage q1 baseline, same family as `stonehide` (score 2.1). |
| `bloodstoneamulet` | q2 | q1 | Lifesteal proc; 8% (`vampfang`) is the q2 anchor, 5-6% sits at q1 below the +1 damage baseline (score 3). |
| `bouldershoulder` | q2 | q1 | Single narrow stat, same family as q1 `bombrangeup` (+25%) (score 1.2). |
| `steadfastheart` | q2 | q1 | +0.15s i-frames is the smallest entry in the invulnerability family; below its own q1 sibling `temperedsteel` (+0.2s). (score 1.2). |
| `huntersfocus` | q2 | q1 | Narrow boss-only conditional; strictly worse than the always-on `ironshoes` +1 damage q1 baseline (score 1.76). |
| `sparkvial` | q2 | q3 | A free room-wide nuke; identical in kind to q3 `thundercloud`/`contractofshadows`. (score 5.5). |
| `dragonfirecore` | q3 | q2 | Plain damage baseline plus one narrow secondary — same shape as `graniteknuckles`, so q2 (score 4). |
| `frostboundcloak` | q3 | q2 | A heart container (q2 anchor `thickmane`) plus a 6% freeze proc (q1 `frozenthorn`) — a q2 superset, not `warhorn` q3. (score 5.28). |
| `tidecallersscale` | q3 | q1 | Identical desc to `rangeup` (q1) — range-only, now consistent with `solarfeather`/`moltenscroll`/`obsidiantalisman`. (score 2.2). |
| `gustwovenveil` | q3 | q1 | Single movement stat, same family as q1 `speedup` (+15%) and below the `ironshoes` +1 damage q1 baseline (score 2.25). |
| `whisperingband` | q3 | q1 | Single ranged-only stat, valued on par with the +1 damage q1 baseline (`ironshoes`); `piercingshot`/`goldenmedallion` family now uniform (score 3.4). |
| `solartrinket` | q4 | q1 | Pure convenience magnet, identical to q1 `coinmagnet`/`magnethorseshoe` (score 1.2). |
| `amberfragment` | q2 | q1 | Single movement stat, same family as q1 `speedup` (+15%) and below the `ironshoes` +1 damage q1 baseline (score 1.8). |
| `wanderingchain` | q4 | q1 | Single narrow stat, same family as q1 `bombrangeup` (+25%) (score 1.2). |
| `goldencoin` | q3 | q1 | Identical to the `ironshoes`/`damageup` q1 baseline — plain single-stat +1 damage (score 3.4). |
| `coralgauntlet` | q4 | q1 | Flat proc, same family as q1 `venomfang`/`directstun`; weaker than the luck-scaled q1 procs `venom`/`hardhitter` (score 1.12). |
| `radiantwhistle` | q3 | q1 | Identical desc to `rangeup` (q1) — same range-only family, now consistent. (score 2.2). |
| `duskygauntlet` | q3 | q1 | Pure convenience magnet, identical to q1 `coinmagnet`/`magnethorseshoe` (score 1.2). |
| `velvetcirclet` | q2 | q1 | Single crit stat, same family as q1 `directhit` (+5% crit); below the `ironshoes` +1 damage q1 baseline (score 2.88). |
| `sapphiretiara` | q3 | q1 | Identical desc to `rangeup` (q1) — same range-only family, now consistent. (score 2.2). |
| `braidedbadge` | q3 | q1 | Flat proc, same family as q1 `venomfang`/`directstun`; weaker than the luck-scaled q1 procs `venom`/`hardhitter` (score 1.12). |
| `ambershard` | q4 | q1 | Single ranged-only stat, valued on par with the +1 damage q1 baseline (`ironshoes`); `piercingshot`/`goldenmedallion` family now uniform (score 3.4). |
| `feralfragment` | q3 | q1 | Luck-only stat: +1 Luck = q1 (`luckup`), +2 Luck = q2 (`gildedcompass`) (score 1.8). |
| `wildcloak` | q2 | q1 | Plain single-stat fire rate, same magnitude class as the `firerateup` q1 baseline (score 3.4). |
| `sapphirelocket` | q3 | q1 | Economy-only stat with no combat impact; well below the `ironshoes` +1 damage q1 baseline (score 1). |
| `jadequill` | q2 | q1 | Single crit stat, same family as q1 `directhit` (+5% crit); below the `ironshoes` +1 damage q1 baseline (score 2.16). |
| `feraltalisman` | q3 | q1 | Single crit stat, same family as q1 `directhit` (+5% crit); below the `ironshoes` +1 damage q1 baseline (score 2.88). |
| `lunarrune` | q3 | q1 | Single movement stat, same family as q1 `speedup` (+15%) and below the `ironshoes` +1 damage q1 baseline (score 1.5). |
| `rustedcharm` | q3 | q1 | Single crit stat, same family as q1 `directhit` (+5% crit); below the `ironshoes` +1 damage q1 baseline (score 2.88). |
| `gildedring` | q2 | q1 | Economy-only stat with no combat impact; well below the `ironshoes` +1 damage q1 baseline (score 1). |
| `velvetmedallion` | q3 | q1 | Single movement stat, same family as q1 `speedup` (+15%) and below the `ironshoes` +1 damage q1 baseline (score 1.2). |
| `sacredgauntlet` | q4 | q2 | Heart container is the q2 anchor per `thickmane`/`hpup` (score 3.6). |
| `sacredtoken` | q3 | q1 | Single narrow stat, same family as q1 `bombrangeup` (+25%) (score 1.2). |
| `feralquill` | q2 | q1 | Single movement stat, same family as q1 `speedup` (+15%) and below the `ironshoes` +1 damage q1 baseline (score 0.9). |
| `frostedbell` | q3 | q2 | Luck-only stat: +1 Luck = q1 (`luckup`), +2 Luck = q2 (`gildedcompass`) (score 3.6). |
| `palesigil` | q2 | q1 | Plain single-stat fire rate, same magnitude class as the `firerateup` q1 baseline (score 3.4). |
| `ancientvial` | q3 | q2 | Heart container is the q2 anchor per `thickmane`/`hpup` (score 3.6). |
| `hollowtoken` | q3 | q1 | Identical to the `ironshoes`/`damageup` q1 baseline — plain single-stat +1 damage (score 3.4). |
| `thundercloak` | q2 | q1 | Flat proc, same family as q1 `venomfang`/`directstun`; weaker than the luck-scaled q1 procs `venom`/`hardhitter` (score 1.12). |
| `hollowwhistle` | q3 | q1 | Single movement stat, same family as q1 `speedup` (+15%) and below the `ironshoes` +1 damage q1 baseline (score 1.5). |
| `goldenboots` | q2 | q1 | Lifesteal proc; 8% (`vampfang`) is the q2 anchor, 5-6% sits at q1 below the +1 damage baseline (score 2.5). |
| `shadowsigil` | q2 | q1 | Flat proc, same family as q1 `venomfang`/`directstun`; weaker than the luck-scaled q1 procs `venom`/`hardhitter` (score 1.68). |
| `quietorb` | q3 | q1 | Lifesteal proc; 8% (`vampfang`) is the q2 anchor, 5-6% sits at q1 below the +1 damage baseline (score 3). |
| `weatheredquill` | q4 | q1 | Lifesteal proc; 8% (`vampfang`) is the q2 anchor, 5-6% sits at q1 below the +1 damage baseline (score 2.5). |
| `goldenbrooch` | q3 | q1 | Identical to the `ironshoes`/`damageup` q1 baseline — plain single-stat +1 damage (score 3.4). |
| `mysticcloak` | q2 | q1 | Flat proc, same family as q1 `venomfang`/`directstun`; weaker than the luck-scaled q1 procs `venom`/`hardhitter` (score 1.4). |
| `gildedtrinket` | q3 | q1 | Identical to the `ironshoes`/`damageup` q1 baseline — plain single-stat +1 damage (score 3.4). |
| `roaringbrooch` | q4 | q1 | Luck-only stat: +1 Luck = q1 (`luckup`), +2 Luck = q2 (`gildedcompass`) (score 1.8). |
| `runicgauntlet` | q4 | q2 | Luck-only stat: +1 Luck = q1 (`luckup`), +2 Luck = q2 (`gildedcompass`) (score 3.6). |
| `whisperingidol` | q2 | q1 | Flat proc, same family as q1 `venomfang`/`directstun`; weaker than the luck-scaled q1 procs `venom`/`hardhitter` (score 1.68). |
| `etchedhoofguard` | q2 | q1 | Single crit stat, same family as q1 `directhit` (+5% crit); below the `ironshoes` +1 damage q1 baseline (score 1.8). |
| `duskyboots` | q2 | q1 | Flat proc, same family as q1 `venomfang`/`directstun`; weaker than the luck-scaled q1 procs `venom`/`hardhitter` (score 1.12). |
| `roaringcoin` | q2 | q1 | Flat proc, same family as q1 `venomfang`/`directstun`; weaker than the luck-scaled q1 procs `venom`/`hardhitter` (score 1.68). |
| `mysticband` | q4 | q2 | Heart container is the q2 anchor per `thickmane`/`hpup` (score 3.6). |
| `gleamingvial` | q1 | q2 | Heart container is the q2 anchor per `thickmane`/`hpup` (score 3.6). |
| `paleinsignia` | q3 | q1 | Flat proc, same family as q1 `venomfang`/`directstun`; weaker than the luck-scaled q1 procs `venom`/`hardhitter` (score 1.12). |
| `radiantquill` | q2 | q1 | Flat proc, same family as q1 `venomfang`/`directstun`; weaker than the luck-scaled q1 procs `venom`/`hardhitter` (score 1.12). |
| `onyxwisp` | q3 | q1 | Luck-only stat: +1 Luck = q1 (`luckup`), +2 Luck = q2 (`gildedcompass`) (score 1.8). |
| `coralinsignia` | q3 | q1 | Flat proc, same family as q1 `venomfang`/`directstun`; weaker than the luck-scaled q1 procs `venom`/`hardhitter` (score 1.4). |
| `forgottenrune` | q4 | q1 | Single narrow stat, same family as q1 `bombrangeup` (+25%) (score 1.2). |
| `lunarshard` | q3 | q1 | Luck-only stat: +1 Luck = q1 (`luckup`), +2 Luck = q2 (`gildedcompass`) (score 1.8). |
| `blessedbell` | q2 | q1 | Single narrow stat, same family as q1 `bombrangeup` (+25%) (score 0.9). |
| `gleaminghoofguard` | q4 | q1 | Flat proc, same family as q1 `venomfang`/`directstun`; weaker than the luck-scaled q1 procs `venom`/`hardhitter` (score 1.4). |
| `frostedband` | q4 | q1 | Single crit stat, same family as q1 `directhit` (+5% crit); below the `ironshoes` +1 damage q1 baseline (score 1.8). |
| `emeraldfeather` | q3 | q1 | Flat proc, same family as q1 `venomfang`/`directstun`; weaker than the luck-scaled q1 procs `venom`/`hardhitter` (score 1.4). |
| `forgottenemblem` | q4 | q1 | Narrow boss-only conditional; strictly worse than the always-on `ironshoes` +1 damage q1 baseline (score 1.1). |

## Distribution

Before: q1=131 q2=124 q3=96 q4=26 -> After: q1=259 q2=76 q3=31 q4=11 (of 377).

Changed: 183. Unchanged: 194.

## Items left unchanged (194)

Breakdown: 129 already at q1, 38 at q2, 22 at q3, 5 at q4.

They fall into four groups:

1. **The q1 baseline families that were already internally consistent** (129 items). The `+1 damage to all attacks` clones that already sat at q1 (`ironshoes`, `damageup`, `ironwill`, `sacredlight`, `cinderclaw`, `embercharm`, `swarmbreaker`, `turretbuster`, `polishedscroll`, `runicbauble`, `palebrooch`, `stormlocket`, `emeraldquill`), the fire-rate clones (`firerateup`, `quickdraw`, `featherweight`, `gauntletrunner`, `quickstepcharm`, `sunkenglove`, `brightband`, `crystalflask`, `cursedfragment`, `forgottengauntlet`), the luck-scaled procs (`venom`, `hardhitter`, `flirtatious`, `coldheart`, `terrifying`), the flat-proc trinkets that were already q1, and all 15 `explorationtrophy_*` entries. The scouting note that these were "internally consistent for THOSE" held up — the fix was pulling their stray duplicates (`chestwhisperer`, `goldencoin`, `hollowtoken`, `goldenbrooch`, `gildedtrinket`, `ambershard`, `whisperingband`, ...) down to join them, not moving these.

2. **Heart-container and +2 Luck items already at q2** (`thickmane`, `hpup`, `thickhide`, `seraphplume`, `sunkissedpelt`, `sacredbelt`, `sacrificialdevotee`, `hiddenpassagecharm`, `gildedcompass`, `goldenskeletonkey`, `shadowring`) — these define the q2 anchor, so they cannot move.

3. **Genuinely rare multi-effect or play-changing items already at q3** (`multishot`, `doublebarrel`, `warhorn`, `executionersmark`, `giantsheart`, `saintofsuffering`, `luckyclover`, `stormbarrel`, `ironcurtain`, `thundercloud`, `radiantburst`, `brimstonevial`, `barragecore`, `executionersfocus`, `wanderersendurance`, `insecticidevial`, `doomwalkerscloak`, and the `+1 damage, +2 Luck` trio `hoardersblessing`/`midasfingertip`/`curatorspendant`, plus `chosenofthelight` and `alchemistsformula`).

4. **The five true q4s** — `secondwind` (survive lethal once per floor), `borrowedwings` (flight), `guardianfeather` (a fresh 1-hit shield every floor), `championscrown` (three stacking stats at once), `worldbreakergauntlet` (+2 damage and +40% blast).

## Notable corrections (the scouting-flagged outliers)

- `coralgauntlet` q4 -> q1. A flat 4% charm proc is the weakest proc magnitude in the table; it sat four tiers above the luck-scaled `venom`/`hardhitter` procs doing strictly more.
- `graniteknuckles` q3 -> q2 and `cursedhalo` q3 -> q2. Both are the q1 damage baseline plus one small secondary — q2 is the correct home for that shape, per the plan's explicit call.
- `solartrinket` q4 -> q1, `forgottenrune` q4 -> q1, `wanderingchain` q4 -> q1, `roaringbrooch` q4 -> q1, `frostedband` q4 -> q1, `gleaminghoofguard` q4 -> q1, `weatheredquill` q4 -> q1. These were single small trinket stats (a pickup magnet, +20% blast radius, +1 Luck, +5% crit, a 5% proc, a 5% lifesteal) sitting at the rarest tier — the largest single source of inconsistency in the table.
- `voidcharm`/`trophyrack` (+15% boss damage) q3 -> q1, joining the rest of the boss-damage family (`bossbane`, `giantslayersbelt`, `voidwhisper`, `huntersfocus`, `gildedseal`, `radiantglove`, ...) which were already spread across q1-q3 for identical effects.
- Upward moves are rarer but real: `siegebreaker` (+2 damage) q2 -> q3 to join `warhorn`/`executionersmark`; `puritycharm` (+2 Luck) q1 -> q2 and `gleamingvial` (+1 heart) q1 -> q2 to join their anchors; and the "+2 damage plus a real second effect" cluster (`voltaiccore`, `ironhoofgauntlet`, `arenachampionsbelt`, `detonationspecialistbadge`, `sentrywreckersfist`, `radianthalofragment`) q3 -> q4.

## One gameplay consequence worth flagging

Because `ITEM_QUALITY_WEIGHTS` (js/room.js) weights per item (q1 w:40 ... q4 w:10), moving 128 net items into q1 makes the q1 bucket dominate the roll pool far more than before: total pool weight was ~5240/3720/1920/260 across q1-q4, and is now ~10360/2280/620/110. Individual q3/q4 items are unchanged in per-item weight, but as a group the rare tiers are roughly 4x less likely to be the item that spawns. This falls directly out of the approved rubric (the table really is ~69% single-modest-stat trinkets, mostly the ~110-item block at data.js 777-985), so I did not distort the tiering to hide it — but if the run feel gets too flat, the clean fix is retuning the four weights in js/room.js rather than re-inflating item qualities.
