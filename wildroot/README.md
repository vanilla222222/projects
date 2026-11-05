# Wildroot — World One

An original side-view browser idle RPG for Vanilla and friends, hosted in the existing Projects website. World One is the only playable world. This release develops its progression, professions, inventory, exploration and combat; it does not enable World Two.

## Controls and world

Click/tap the ground to walk, enemies to fight, nodes to gather, and NPCs, stations, storage or portals to interact. Characters navigate ladders between three platforms. A/D or arrow keys move, W/S climb, Space jumps, F attacks, 1/2/3 use class abilities, E interacts, I opens inventory and M opens the map. Touch movement and ability controls support portrait and landscape. Sound effects are original Web Audio synthesis and can be enabled/muted in Save & help with a volume control.

World One keeps the user's six-area plan: Caves (3 zones/copper), Deep Caverns (4/iron and gold), Forest (5/oak and birch), Jungle (4/jungle wood), Hearthstead (4/anvil, foundry and Legacy Square), Verdant Outpost or Jungle Town (3/enchanting, alchemy and boss entrance). There are 16 regular enemy species and 23 regular zones. Two secret rooms branch from existing zones, rather than creating another world or main area.

## Character inventories and universal storage

Each character has their own carried materials, unequipped equipment, equipped loadout, capacity history and pending overflow. Loot, gathering, quest rewards, crafted materials and finished foundry batches go to the character who earned or produced them. Another character cannot spend those carried materials.

Every zone in both towns has an actual on-map storage chest. All of them access the same account inventory and equipment storage. Deposit/withdraw actions require standing near a chest. Materials stack to 99 in backpacks and 999 in the chest; each unequipped equipment instance uses one slot. Equipped gear does not consume backpack slots. Crafting and deliveries use the acting character's materials plus materials deposited in the universal chest, never another character's backpack. Potions must be carried to drink them.

Backpacks start at 16 slots. Woven Pouch (+4), Reinforced Pack (+6) and Runic Satchel (+8) can each be consumed once **per character**. The universal chest starts at 24 slots. Wooden Crate (+8), Iron Lockbox (+12) and Runed Cabinet (+16) can each be consumed once **per account**. Consumption removes one item and records its exact identifier. An unused backpack expansion can be transferred through storage to another character. Duplicate chest expansions do not consume on failure.

Full active gathering pauses. Full bags leave combat loot on the ground and stop AUTO. Unclaimed floor materials are retained as character-specific pending overflow when leaving/switching, and offline overflow is retained too. Pending resources cannot be spent until claimed into a backpack with room. There is no silent item deletion. Old over-capacity chest contents remain intact after migration; new deposits obey capacity.

## Equipment and class builds

Seven equipment slots: weapon, head, body, feet, pickaxe, hatchet and accessory. Every piece is an individual transferable instance with attack, defense, health, gathering, critical chance, speed or ability bonuses. Class weapons have class restrictions. The first crafted piece for an empty valid slot auto-equips; further pieces go into the crafter's backpack. Inventory shows comparisons, two rune slots, swaps and storage transfers.

Warrior/Mining, Mage/Logging, Blacksmith/Smithing, Enchanter/Enchanting and Alchemist/Alchemy still require individual three-step class initiations. Each first class grants a slot; all five are required before duplicates; World One allows six characters. Combat talents and profession talents have separate point budgets. Two builds can be saved per character and loaded/reset for free in town. Each class has three active abilities, with the second at character level 6 and the third at level 10.

## Connected professions

- Mining/logging require appropriate skill levels and tools for higher resources. Specialists gather faster, profession talents improve speed/yield/XP, and equipment and potions feed into the same rates.
- Foundry queues reserve all materials/coins in advance and run during exploration or offline time. Oak burns into charcoal; charcoal fuels copper, iron and gold. Verdant steel connects iron/gold, jungle wood and fuel. Blacksmith owners double material output. Cancelling refunds only unfinished reserved batches, once.
- Anvil blueprints unlock through story progression. Equipment and capacity items connect metals, logs, enemy materials, dust and medicine.
- Enchanting applies guaranteed Force, Fortitude, Insight, Fleet or Living runes to two slots on equipped items. Replacing a rune spends new materials and replaces the old effect. No chance-based destruction.
- Alchemy produces potions/resin and bounded liquid for five account research lines. Brewing adds liquid; passive liquid stops at capacity. Potions last 20 minutes and expire correctly inside offline claims. Ability buffs do not erase longer potion buffs.
- The Guild menu has been removed. Previously earned project bonuses remain in old saves. Material research is available at the Stamp Registry and improves matching disciplines.

## Story, secrets and combat

Hesta's village well begins a seven-quest main chain: A Foot in the Greenreach → Tools for Tomorrow → Under the Roots, with Letters from the Canopy as its forest branch → Outpost Supplies → An Unquiet Seal → Heart of the Wild. These quests unlock blueprints and require common-material deliveries. The seal requires all five classes and opens the Rootwarden. Returning its guaranteed heart completes World One's story. Two side quests develop the Hidden Sunwell and Forge Vault; their keepers supply guaranteed crafting materials.

Monster families have distinct tells: charges, bolts, slams, hopping attacks and guarding windows. Position, jumping, stuns, damage-over-time and healing affect active fights. The Rootwarden uses telegraphed ground waves, a second projectile lane and summoned rootlings as health falls. Bosses require active play and cannot be cleared by closing the page. AUTO helps with regular combat but does not guarantee survival against a boss.

Sprites have walking frames, class silhouettes, weapon shapes, visible armour/headgear, attack effects, guard rings, warnings and projectile/root-wave effects. Artwork and audio are original code assets; nothing is copied from IdleOn.

## Roster, offline progress and saves

Roster management shows assignments, locations, carried capacity, pending gains, estimated materials/XP/coins/kills per hour, available points and equipment bottlenecks. Assign other characters without taking control away from the current one. Idle rates are estimates including recovery; active skills and dodging can perform differently.

The controlled character uses World physics. Other characters use idle rules. Foundry and liquid generation advance once per real elapsed interval. The selected character is excluded from background rewards, avoiding duplicate simulation. Up to eight hours are claimed on return.

`wildroot-v1` saves are retained. Old numeric equipment migrates to actual pieces; universal materials remain in the chest; class unlocks, skills, quests and study levels are kept. Legacy rune/vitality bonuses remain. Existing boss clears retain access. Import validates equipment identity, queues, talents, expansions and timed effects before replacing data. Export backups are available. Friends play independent local rosters; accounts, networking, trading, microtransactions and server anti-cheat are outside this build.

## Validation and balance limits

Run:

```
node --test wildroot/engine.test.mjs wildroot/world.test.mjs wildroot/progression.test.mjs wildroot/inventory.test.mjs wildroot/town.test.mjs
node wildroot/world1-sim.mjs
```

The automated progression model uses actual gathering, tool gates, crafting costs, timed queues, deposits/withdrawals, character class quests, blueprint deliveries, expansions, potions and an active boss. It completes all five classes and the main story without requiring random rare drops. Its reference runs finish around 69–70 simulated minutes. This is an optimized sequential strategy, excludes walking/menu time, and is **not a measured playtest duration or a promise of final pacing**. Real players, idle sessions, spending choices and simultaneous workers change timing. Secret rooms, side quests, guild levels, research and build development add further World One progression.

The regression suite covers inventory isolation, all town chests, stacking/capacity/overflow, one-time use per scope, equipment transfers, foundry transactions/refunds, save migration, potion expiry, class/build rules, story gates, telegraphs/dodges, roster simulation and the complete main path. Browser checks and actual phone playtesting remain separate from model checks. World One should continue receiving playtest fixes; this release is not a claim of perfection.

## Files

- `content.mjs`: items, recipes, equipment, talents, guild/alchemy research, stories and secret-room data.
- `inventory.mjs`: character backpacks, universal storage, capacity items, transfers and pending overflow.
- `progression.mjs`: equipment, builds, production queues, research, quests, account bonuses and migration helpers.
- `engine.mjs`: combat/gathering stats, idle simulation, class rules, save validation and idle estimates.
- `world.mjs`: navigation, active combat/abilities, monster behavior, portals, storage/NPC interaction and loot.
- `panels.mjs` / `app.mjs`: player-facing overlays, controls and save coordination.
- `scene.mjs` / `audio.mjs`: original rendering and synthesized effects.

Live browser checks on the deployed build confirmed old-save loading, separate carried/stored quantities, a storage chest opening in Hearthstead, a real deposit, Hesta’s quest reward entering the backpack, Woven Pouch consumption from 16 to 20 slots surviving reload, and a foundry batch reserving its inputs. The final patch prevents Blacksmith bonuses from duplicating account-only chest expansions and makes quest item rewards and queue-start messages explicit.


## Positional inventory and viewport dock

Backpacks now have persistent 4 × 4 pages. Selecting a stack exposes quantity, move/split, lock, use/equip, chest transfer and confirmed ground-drop actions. Dragging is a desktop shortcut; every action also works by tapping buttons. Locks belong to slots, including empty reserved slots, survive save/export, and prevent movement, sorting, deposit and dropping. Crafting and deliberate consumable use may still spend locked materials. Sort merges unlocked stacks while retaining locked positions. Legacy quantities and equipment remain intact, including over-capacity old storage.

The Equipment and Tools tabs separate worn combat gear from the pickaxe and hatchet. Storage Info tracks consumed slot expansions and capacity pouches. Four World One capacity categories—Materials, Mining (ores), Logging (logs), and Food/potions—each have woven (+100), reinforced (+300), and runic (+600) pouch recipes at the anvil. Each exact pouch is consumed once per character, adding to that category’s base 99 stack limit. They neither add grid slots nor affect the shared chest’s 999 stack limit. Capacity upgrades do not discard items or automatically rearrange existing stacks; Sort compacts them. Slot expansion rules remain once per character for backpacks and once per account for chests.

Ground drops retain equipment instance IDs and runes. Reloading preserves dropped items. Leaving the map recovers remaining drops rather than deleting them, including equipment when a backpack is full. Universal chest transfers remain available only near a real town chest; selecting a stack allows partial transfers.

The game is now a single dynamic-viewport frame with the map above an integrated controls/menu dock. Both desktop and touch layouts keep movement, combat and menu buttons on screen without document scrolling; only open menus scroll. Safe-area insets are respected. Actual phone hardware testing remains outstanding.

Reference research: IdleOn’s developer quality update notes describe persistent inventory locks; DigitalTQ’s beginner guide distinguishes once-per-character bag-space items from anvil-crafted category capacity pouches. Wildroot uses original item names, progression costs and artwork rather than copying IdleOn assets.


## Paired room portals

Every portal stores its destination room and a specific entrance ID. Left, right and branch entrances have distinct arrival positions; returning puts the character beside the same doorway, facing into the room. Portal labels name the actual destination. Echo Chamber has a separate elevated doorway for the deep-cavern loop, with the existing unlock gates intact. Secret rooms and the Rootwarden chamber each have one return exit to the exact parent entrance. Portal transitions immediately save destination coordinates, retain platform height across reloads, and use the arrival point for knockout recovery. Killing boss adds no longer ends the encounter while the Rootwarden is alive.

Regression coverage traverses every normal-room portal in both directions, verifies unique destinations/arrivals, checks secret/boss returns and gated branch entrances, and tests save/reload on elevated arrivals.


## Town progression, talents and quest completion

Legacy Square is a branch of Village Green, reached through a separate upper doorway. It has a real Stamp Registry, Statue Keeper, universal chest and dormant World Gate. World Two has no enabled destination. Both towns have separate shop stalls in their first zone, with roster-shared daily stock, purchases, protected inventory-slot selling and daily restocking. Stock and daily map charges use the local save’s clock. Coins retain their old copper-unit balance, displayed as copper/silver/gold/platinum at 100:1 denomination boundaries. No paid purchases exist. Milestone gems unlock purely visual halos, shared across the roster and worn per character.

Map teleports cost one daily charge, require discovery and an unlocked route, and regenerate three per 24 hours up to thirty. Walking remains free. Bottled Town Returns consume a carried bottle instead of charges. Teleport convenience links follow the same charge/discovery rules. Fresh and older accounts retain access to the initial forest and main town. Existing rooms’ indices are preserved.

Stamps are one-time physical discoveries registered for account-wide bonuses. Coins increase levels; every fifth level requires carried materials to lift the cap. Seven stamps cover combat, mining, logging, carry capacity and coins. Quest-given stamps are migrated once for older completed quests. Six statue types drop from combat and gathering; a shop chisel enables each character’s deposits. Bronze statue levels belong to the depositing character. Later-world gilding is not enabled.

Beginner and class talent pages each earn three points per class level gained; class points are available after choosing a class and count earlier levels. Profession points remain earned from skill levels. Batch spending, separate budgets, learned secondary/utility techniques, swappable action-bar slots, two saved presets and consumable resets are implemented. Cooldowns follow the actual technique when slots swap. Old spent points and builds are preserved. Reset potions are assembled from five shop fragments at alchemy. Basic class techniques remain available without investing a point; secondary/utility require their class talent and levels six/ten.

Mentors appear once each: Willow in Mossy Clearing, Brann in Lantern Mouth, Flint in Hammer Lane, Mira in Canopy Market and Fern in Alchemists’ Terrace. Hesta remains on Village Green. Class initiation now requires the correct mentor room. Journal initiations appear only after meeting their mentor, and story quests appear only after acceptance in NPC dialogue. Six quest givers each have three quests, eighteen in total. Finishing all three grants that giver’s physical token once per account. All six combine at the anvil into one Greenreach Completion Token; Blacksmith output bonuses cannot duplicate it, and shops cannot buy these completion tokens. NPC completion tokens and story-restoration progress remain distinct.

Validation includes 86 engine/world/inventory/town regressions, the complete existing World One story run, every paired portal, quest acceptance visibility, token conservation, exact mentor locations, shop transactions/restocks, safe selling, stamp/cap consumption and migration, statue ownership/locked slots, talent budgets/hotbar cooldowns/presets, limited teleports and one-time gem claims. Physical mobile-device playtesting remains outstanding.

Research references: DigitalTQ’s original guides for [stamps](https://www.digitaltq.com/wiki/idleon/stamps), [statues](https://www.digitaltq.com/wiki/idleon/statues), [talents and teleportation](https://www.digitaltq.com/wiki/idleon/beginner-guide), and [World One shops](https://www.digitaltq.com/wiki/idleon/world-1-guide-blunder-hills). All Wildroot art, quest text, item names and economy values are original.


## World One adventure expansion (v12)

- Combat now has accuracy against enemy requirements, a displayed damage range, regenerating mana (4/8/12 MP abilities), and two personal auto-food slots. Both shops sell food; the alchemy station makes it. Food stacks use food-pouch capacity and respect inventory locks when equipped.
- Inventory links to the shared card collection and the AFK & gathering panel. Each character has separate combat/skilling card loadouts, initially four slots. Monster cards drop at 2.5%; gathering cards at 1.5% per resource gained; duplicate thresholds are 1/10/30/100/300.
- Gathering exposes efficiency thresholds, success rates, multiyield and a five-round timing minigame. Approach a node and start gathering, open AFK & gathering, and play. Three attempts per skill per UTC day, per character; closing forfeits the attempt. Successful games award 2–17 resources and 10–70 skill XP.
- Professions links to passive anvil products, persistent continuous furnaces and three permanent stone slots per equipment item, independent of runes. Passive products have finite storage; furnaces reserve their inputs and stop at their output limit. The original queued recipe foundry remains available separately.
- The task board in Legacy Square unlocks world/daily tasks and five merit upgrade tracks. Daily progress is measured from reset; daily claims and minigame attempts cannot be reset by rewinding the clock.
- All 26 rooms have authored layouts, widths of 2100–3800 world units, different platforms, direct-ground ladders, individual landmarks and relocated inhabitants. The scrolling camera and tappable room overview share simulation coordinates. Named reciprocal doorways still control arrival positions. Town chests remain at the western approach of every town room.
- Existing saves initialize all new systems. Old positions and floor loot are placed on reachable floors in the new geometry. There is still no active World Two or real-money shop.

Validation: `node --test wildroot/*.test.mjs` (110 tests), `node wildroot/world1-sim.mjs` (complete World One story). Layout tests traverse every shelf and portal, check entity support and migration, and verify camera limits. AFK values are estimates; active play varies with movement and skills, and mixed rare loot can fill bags sooner than the common-loot estimate.
