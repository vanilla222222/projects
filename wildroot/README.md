# Wildroot — World One

An original side-view browser idle RPG for Vanilla and friends, hosted in the existing Projects website. World One is the only playable world. This release develops its progression, professions, inventory, exploration and combat; it does not enable World Two.

## Controls and world

Click/tap the ground to walk, enemies to fight, nodes to gather, and NPCs, stations, storage or portals to interact. Characters navigate ladders through individually authored rooms and vertical routes. A/D or arrow keys move, W/S climb, Space jumps, F attacks, 1/2/3 use class abilities, E interacts, I opens inventory and M opens the map. Touch movement and ability controls support portrait and landscape. Sound effects are original Web Audio synthesis and can be enabled/muted in Save & help with a volume control.

World One keeps the user's six-area plan: Caves (3 zones/copper), Deep Caverns (4/iron and gold), Forest (5/oak and birch), Jungle (4/jungle wood), Hearthstead (4/anvil, foundry and Legacy Square), Verdant Outpost or Jungle Town (3/enchanting, alchemy and boss entrance). With the three-zone Elder Tree ascent, World One has 19 regular enemy species and 26 regular zones. Two secret rooms branch from existing zones, rather than creating another world or main area.

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


## Interface overhaul and Elder Tree (v14)

The bottom dock now follows the Items / Talents / Codex / Map / Players / Menu structure, alongside AUTO and a pop-up Attacks bar. Character HP, MP and XP stay under the canvas. All menus use one original wood/parchment visual system, shared selected-detail panes and vector icon art. No Idleon artwork is embedded.

Inventory includes a live character sheet, equipment/tool/food/bag tabs, paper doll, 4×4 grid pages, quantity splitting, locks, drops, shared chest pages and item source links. World One now crafts greaves, rings (either ring slot), a cape and a completion-gated trophy. Existing saves and their gear remain valid.

Codex contains Quick Ref, obtained quests with active/completed filters, card collection and personal set bonuses, bestiary drops, searchable item sources/uses, star signs, earned achievements and tasks. Recipes use icon grids, source-linked ingredient costs, blueprint requirements and favorites. Stamps, statues, shops, anvil products, furnaces and upgrade stones use the same visual language. Facility access requirements remain enforced.

The Elder Tree branches from The Elder’s Roots (the fifth forest room). Its three zones have 10, 12 and 14 upper platforms, each joined by a shelf-to-shelf ladder graph. Heights are 2106, 2466 and 2826 world units. Both camera coordinates and the room overview handle negative vertical world coordinates. The only telescope is on Crown Observatory’s highest platform. The summit shortcut requires reaching that telescope first. Eight physical constellation markers award 16 total star points; ten connected signs affect real stats. Each character equips one sign, then two after four constellations, then three after eight.

The Greenreach Vault offers eight coin-funded account upgrades. Fifteen achievements award earned gems. Solo trials are entered at Legacy Square’s board, require level 3 and one ticket, and consist of eight waves in three minutes. Enemies award trial score instead of normal loot; score pays coins on a finished run and medals award gems once. Tickets gain three per UTC day, capped at six. Reloading or leaving the game abandons unclaimed trial score. Trials are never simulated for AFK farming.

Keyboard: I items, T talents, C Codex, M map, P players, Q attacks, Escape menu/close. Options control the quest helper, damage text, nearby auto pickup, AUTO skill use, reduced decorative motion, compact spacing and existing sound/save functions. There are no chat/guild/multiplayer-only UI panes or playable World Two content.

## v17 — readable facilities and a steeper World One

Dialogs now use readable body text, wrapping titles and full-height details, with internal scrolling and single-column phone layouts. The fixed game dock stays under the world. The Codex Field Guide explains each facility's location and the copper → iron → outpost → masterwork → telescope → completion route.

Facilities require proximity on the correct platform. Discovery is separate from remote view, claiming and upgrades. World One grants no remote facility permissions: anvil products, foundry controls, stamps, statues, tasks, vault, alchemy, enchanting and star changes require visits. A physical Upgrade Vault now stands in Legacy Square. Backpack/talents/obtained quests/cards remain portable. Storage contents stay hidden away from a town chest; crafting still deliberately uses shared stored materials.

The anvil has Craft, Produce, Points and Upgrade Stones pages. Thread/nails/bricks unlock at Smithing 1/3/5; an existing selected product survives migration. Recipe pages 2 and 3 require craftable, one-use account expansion books after guaranteed story quests. Optional greaves/ring/cape blueprints use tokens from world tasks. Locked recipes show a question mark and a specific unlock hint. Previously learned recipes and all finished gear remain available on migration.

Enchanting selects equipped gear, one of two permanent slots and an enchantment. Before/after stats show the exact result. Overwriting an occupied slot requires an explicit second confirmation. Existing runes survive, and old global rune/vitality bonuses remain, but those legacy repeat recipes are retired.

Alchemy is now four brewing cauldrons with exclusive character assignments (two per cauldron), ten stored brew points, ordered bubble discovery, speed/luck/cost/extra boosts and coin upgrades. Characters retain their normal activity. First discoveries are guaranteed; three failed bubble attempts guarantee the next. Small bubbles affect the roster; large bubbles require personal equipment (one slot, two at Alchemy 7). Water is finite; mist unlocks at Alchemy 5 for bubble levels above five. Six material vials have passive roster bonuses and liquid/material upgrades. Discoveries consume ten unlocked carried materials, with six daily roster attempts, guaranteed first vial and a fifth-attempt safety net. Old research bonuses and saved liquid remain intact.

Enemy HP and damage use authored, accelerating curves rather than the former linear tiers. The starter slime is unchanged. Late jungle/deep/tree rooms demand real upgrades; XP/coins scale more slowly than HP. No dynamic enemy scaling against character level. The deterministic campaign now crafts recipe-page books, claims anvil products, invests earned talents and upgrades armour before late routes; it completes all five classes and the active Rootwarden fight in approximately 96 simulated minutes. This is a regression scenario, not a measured human playtime promise.

Validation: `node --test wildroot/*.test.mjs` (148 passing tests) and `node wildroot/world1-sim.mjs`. Tests cover physical access, separate remote permissions, page consumption, migration, exact costs, enchant replacement, assignments, offline caps, bubble discovery safety nets, vials, malformed saves and combat progression.

Live QA confirmed page-book crafting/consumption, production claiming, point menus, station navigation, assignments, bubble upgrading and vial discovery. Follow-up polish separates the three recipe-page galleries, keeps station recipes focused, bounds gallery scrolling and corrects first-visit tips.

## v19 — room identity and connected item uses

All 29 rooms have separate art direction: distinct skies, platform materials, ambient effects and large original canvas setpieces. The forest ranges from a morning oak glade through birch waterfalls and a lantern-lit night climb; mines, cathedral caverns, chain works, a reservoir, a clockwork engine, jungle ropeways, monsoon falls, sunstone terraces and hanging orchid gardens use different silhouettes. Town roofs, kilns, market stilts, greenhouse terraces and bell towers add vertical exploration. The three Elder Tree zones retain their full ascents and summit telescope.

New upper shelves connect through a real ladder graph. Normal combat exits move onto upper routes; reciprocal arrivals and knockout respawns use those exact doorways. Existing shelves, service positions and saved floor coordinates remain supported. Every non-boss room has a one-time survey cache at its highest route, rewarding useful materials and coins. Map overview, camera tracking and touch navigation support the new heights. Offscreen platform/enemy art is culled.

Every one of the 171 inventory items has at least three implemented purposes; see `ITEM-USES.md`. Ordinary spare items can be reclaimed at the foundry for salvage (exchanged for crafting materials), or contributed at the Legacy Square vault to the Village Arsenal, Supply Depot or Field Academy. Projects grant small capped roster damage, capacity or profession-XP bonuses. These are independent choices, not automatic disposal; both have explicit confirmation and protect locked/equipped items and final unlearned unlocks. Exchange prices prevent profitable reclamation loops.

Material research drops also infuse gear with permanent, material-specific stats. One infusion slot is separate from runes and stones, travels with the equipment instance and supports a before/after preview with explicit replacement confirmation. Rare/mythical infusions are optional; none gates the story.

NPC tokens, the Rootbound Seal and the completion token have non-consuming attunements and unlock eight signature gear patterns. Earned proof remains valid after token combination, so these benefits cannot be missed. Their original quest/completion/trophy functions remain intact. New gear follows the same equipment/reclamation/project rules.

Validation covers all item transactions, protected last copies, no-profit salvage loops, project caps, badge proofs, signature crafting, infusion costs/replacement, malformed saves, all 29 scenery renderings, floor/ladder navigation, elevated reciprocal portals, survey claims and desktop/phone camera aspect ratios. Local preview infrastructure remained unavailable; live browser checks are performed after Pages deployment.

## Personal progression and the repeatable World One loop (v21)

Combat portals and story quest journals are personal. Each character earns their own kill counts (Forest: 12/25/45/70/100; Caves: 18/40/85; Jungle: 130/170/220/280; Depths: 115/155/205/270; Elder Tree: 120/180/260). Town access, blueprints, major story flags, discoveries and NPC-token proof remain shared. Existing saves grandfather previously unlocked routes and seed each existing character's quest history and kills; new slots start their own journey. The map and tracker show the selected character's requirements.

Each class has three unique additional talents and a distinct basic weapon profile: warrior heavy melee, mage ranged bolts, blacksmith hammer splash, enchanter ranged runes, alchemist flask splash. Two attribute points per level have class-specific damage and accuracy roles. Family bonuses use only the highest-level member of each class. Six special talent books come from personal quests, merits, guardian victories and dungeon marks. Books unlock account-wide; special points are personal and separate from other talent budgets. Their effects feed real healing, combat AFK, gathering efficiency, potion strength, character XP and profession XP.

AFK combat includes hit chance, attacking time, movement, room spawn capacity, incoming strikes, food cooldowns and recovery breaks. Food clocks follow real elapsed time; insufficient partial intervals cannot consume future strikes or grant kills. Bosses, secret guardians and dungeon runs are active-only. Offline reports retain actual per-character XP, profession XP, items, kills, coins and food consumed until acknowledged; viewing or reloading never grants them again. Rates remain estimates, with the current limiting factor explained.

The Hunt Board in Rootbound Approach supplies three daily keys (cap nine) after the story gate opens. The first Normal Rootwarden victory is free. Repeat Normal/Challenger/Ancient entries cost 1/2/3 keys, consumed on entry; each tier requires the previous victory. They yield 2/4/7 scales and progressively unlock three anvil armour recipes. Sunwell and Vault guardians are active instances with two- and three-hour roster cooldowns, persistent through reload. Rootlings do not generate normal loot or portal kills.

Mossroot Ruins has its own entrance in Legacy Square (level four). It is separate from solo trials: four authored chambers, eight-minute cap, neutral run stats and three dungeon abilities, random boon choices, run coins, temporary weapons/armour/charms and camp healing. World talents, gear and consumables do not change run combat. Credits improve future starting stats; relic marks buy permanent roster rewards and the Ruins Scholar book. Each cleared room awards 15 credits and one mark; a full clear adds 30 credits and four marks. Knockout/timeouts retain cleared-room rewards. Practice, abandoning, reloading or closing the game cannot award unearned dungeon currency. Three entries regenerate daily, up to nine. Partial runs are a valid way to earn training before a full clear.

Validation: 184 automated tests, including an actual four-chamber combat run and reward transactions. The full common-material World One campaign simulation completes in about 126 model minutes with all five classes, personal route grinding, shared banking, crafting and an active Rootwarden victory. This is a deterministic model, not a claim about every player's playtime.

Hunt knockouts now forfeit the active encounter and recover outside its actual parent doorway. Paid boss retries require another key and restart at full enemy HP; failed guardian attempts do not start a victory cooldown. A roster can reserve only one attempt at a given guardian, and an existing encounter cannot be started twice. Guardian victories clear lingering attacks. Passive world level-ups during a dungeon update the saved home HP without changing run health. Regression tests exercise these paths through real world transitions and foundry production.

## Dialogue-led quests and species art (v24)

All six World One NPCs now open a conversation instead of a board of future quests. Original dialogue covers greetings, two-to-three-page offers, progress reminders, hand-in previews, completion reactions, waiting hints and class initiation. Tap a line to reveal it and tap again to advance; Enter/Space work while the speech box has focus. Accept and hand-in are separate explicit responses on the final page. Actions require the actual nearby NPC, the correct room/platform and the character who began the conversation. Leaving an offer never adds a quest. Markers distinguish available work, unfinished work, ready hand-ins and NPCs with no remaining work.

The 18 personal quests keep their IDs, deliveries, rewards and token chains. New objectives credit the acting character’s actual gathering, charcoal production, equipment crafting, food setup, shop purchases, chest deposits and rune etchings. Exploration and a scored logging challenge round out later quests. Actions previously recorded for that character count; other characters’ carried work does not. Already-accepted older quests retain their original requirements, completed quests stay completed, and earned NPC tokens remain valid. The journal still contains only obtained quests and now supplies location hints.

Every world species has a hand-authored pixel texture with a distinct silhouette, anatomy, palette and surface details. There are 27 unique designs: 22 world enemies, one rootling and four dungeon creatures. Canvas monsters, bestiary portraits and monster cards use the same art. Difficulty marks distinguish stronger Rootwarden encounters. Unknown IDs do not silently inherit generic art.

Validation includes 196 tests and the full common-material campaign simulation (approximately 126 model minutes). The unlinked development page [responsive checks](tests/responsive.html) embeds the real game at phone, landscape and desktop viewport dimensions for repeatable layout checks; it uses the normal browser save, so export a backup before importing test rosters.


## Quest storage and stamp progression

World One now has eight personal slot bags, seven shared-chest expansions, twelve crafted category pouches and fourteen stamps. The four introductory category pouches also come from the matching early quest chains. Bags add spaces; category pouches add stack capacity; chest upgrades expand the same universal town storage. Consume each exact upgrade once in its proper character/account scope.

Quest milestones add Grovekeeper’s Bag (canopy letter), Seamrunner’s Bag (Read the Seams), Spellweaver’s Bag (Threads of Light), Warden’s Backpack (Heart of the Wild), Village Supply Chest (A Village Remembered), Cavern Strongbox (The Stone Oath) and Makers’ Storage Chest (The Forgotten Makers). New stamps cover accuracy, anvil/foundry production speed, enchanting XP, cauldron brewing speed and mining/logging/food carrying capacity.

Already earned permanent quest upgrades become 35 bonus coins per item; the dialogue preview shows the actual reward before hand-in. Character bags and pouches are personal; chest rewards and stamp rewards are account-wide. Existing completed quests backfill newly added permanent items once, using overflow when necessary; consumed, banked, dropped or registered shared upgrades are recognised. Migration does not pay repeat compensation. Storage Info tracks consumed and owned upgrades, reveals quest sources after accepting their quests, and retains anvil/shop sources.

The reward pass audits all 195 items for three implemented uses. New spare bags, chests and stamps keep the existing reclamation and town-project uses. Early pouch recipe costs remain below their category’s starting stack limit, and bigger tiers unlock with ironworking/gilding; bag upgrades do not replace those crafting milestones.


## Gathering, AFK and progressive portal balance

Forward combat gates use increasing personal kill targets. The final jungle exit uses roster kills because the outpost and its class services are shared. Returning to earlier rooms remains free. Journey version 2 preserves rooms that old characters had visited or qualified to enter; new characters use the current combat gates.

| Route | Onward kill targets |
| --- | --- |
| Forest | 12, 25, 45, 70, 100 |
| Copperlight Caves | 18, 40, 85 |
| Jungle | 130, 170, 220, 280 |
| Deep Caverns | 115, 155, 205, 270 |
| Elder Tree | 120, 180, 260 |

Tool tiers and efficiency now use explicit equipment metadata. Copperheart Pick and Living Birch Hatchet outperform ordinary iron tools; the signature pick qualifies for gold. AFK Info includes all gathering requirements, current success/yield tiers and the next efficiency breakpoint. Recipe ingredient previews show backpack stacks at current pouch capacity.

Next-hour AFK forecasts run the offline model on an isolated save, including cooldowns, recovery, food consumption, expiring buffs and skill gains. Long offline gathering advances in at most 30-second steps, allowing earned skill levels to improve the rest of the session. Forecasts use a seeded random sequence; actual random drops and active-play results vary. Common-loot bag estimates share available slots across drop types. Small coin bonuses retain a per-character fractional remainder, so single kills and batch claims accumulate the same bonus instead of discarding fractions.

Boss Hunts shows selected-difficulty accuracy, damage, HP, root-wave damage after defense and equipped healing. It advises preparation without guaranteeing a victory or granting access. The campaign simulation now completes through common-material actions, five classes and an active boss in about 204 model minutes; this is a progression check, not a player-time guarantee.


## Active encounters and rare-drop choices

Eight attack patterns share their geometry between visible warnings and hit detection. Frogs and mites mark a landing location; boars and scarabs charge a bounded lane; ranged enemies fire aimed bolts or split volleys; golems and guardians mark slams or root eruptions. Shell enemies expose themselves during windup and a 1.2-second recovery opening. Rootwarden phases alternate jumpable root sweeps and marked eruptions, clear old hazards on phase transitions and summon rootlings once per phase. Dodges receive text/audio feedback; a 0.45-second damage recovery window prevents overlapping attacks from hitting simultaneously. Lethal damage still defeats the character before food can rescue them. Reduced-motion warnings use steady opacity.

Six optional rare-material equipment recipes offer accuracy, critical chance, movement or gathering choices. Four new rare-material enchantments add accuracy, defense, movement/logging or mining efficiency. All use existing rare drops, remain outside mandatory quest requirements and retain the ordinary spare-equipment reclamation/project roles. Accuracy from equipment and enchantments now affects actual hit chance and displays as a flat stat.

Willow’s spring quest requires one Sunwell Sap and the logging challenge, avoiding repeated two-hour guardian cooldowns for her completion token. Existing accepted quests become easier. The dialogue reflects the new delivery.

`runWorldOne({completeNpcChains:true})` extends the common-material fresh-save campaign with real guardian encounters, personal crafting, food/shop actions, a scored logging challenge, tree visits and seeded rare-material farming. It completes all 18 NPC quests, all five classes, six NPC tokens and the combined completion token in about 234 model minutes. No save-state quest completion shortcuts are used. The standard main-story campaign remains separately checked.


## Roster management and offline reports

The Players screen compares each character's saved assignment, room, current rate estimates, food, overflow, bag use, weapon, armor and tools. Each card names its current bottleneck and recommends a concrete next goal with a recipe, material source or usable carried upgrade. AFK Info performs the detailed hour simulation for the chosen character; the overview uses lightweight current-rate estimates.

Assignment choices use the worker's own discoveries and portal unlocks. Every available gathering resource is selectable. A missing skill/tool, locked route, unvisited destination or active encounter rejects the operation before changing location, activity, progress or loot. Changing a task in the same room keeps the position. Changing rooms retains floor items and equipment instance metadata.

Character switching preserves position, facing, valid ladder progress and partial gathering progress. Combat/gathering resumes on return. Paid hunts, guardians, trials, dungeons and respawn recovery block switching so changing characters cannot reset an active encounter. Pending loot collection during switching does not silently cancel the outgoing assignment.

Offline reports store actual gains plus the initial assignment, duration, initial and final limitations, food types consumed, remaining equipped food, expired buffs, retreats and overflow. Overflow is explicitly retained, not lost. Merged reports keep each character's own tracked duration and starting context, with the latest ending state; older unread reports remain supported and clearly indicate incomplete detailed history. Report actions view the character or recompute their next goal without awarding rewards a second time. Retreated or interrupted assignments retain an actionable warning until retried or changed.

World One balance pass (runtime 34): every class has a common-material verdant weapon before the boss; signature token weapons remain later profession upgrades. Normal Rootbound Helm now improves on Iron Helm, and Challenger Rootmail improves on Verdant Steel Mail. First Roots gives six usable bread once; old completed quests do not regrant consumable supplies.

The selected map room shows non-mutating combat preparation estimates, class-specific accuracy investment, food guidance and gated equipment steps. The hunt board shows real recipe costs, accessible scales and remaining clears per difficulty. These are estimates, not victory guarantees.

Validation includes all five classes sustaining the final cavern with a level-20 common-material build, real crafting and save restoration, and the fresh-save campaign crafting all five verdant weapons through actual gathering, banking and foundry queues. The scripted campaign takes about 221 simulated minutes; this excludes human navigation/reading time and is not a playtime promise.

Randomized campaign checks (seeds 3187, 713503, 90210) also complete, in about 222 simulated minutes. The playthrough consumes earned capacity upgrades and takes optional spare drops to the foundry for real reclamation rather than hoarding them in the shared chest. Quest deliveries and common crafting materials are retained. This exercises storage pressure without deleting loot or granting extra slots/resources.

The main campaign is also exercised with Mage and Blacksmith as the first chosen class, rather than assuming a Warrior-led account. Skill training checks the actual skill level after each gathering session, because multi-resource hits can yield more items without proportionally more XP.

Combat feel pass (runtime 35): Mage, Blacksmith, Enchanter and Alchemist basic attack coefficients/cadences reduce the excessive single-target penalty relative to Warrior, retaining range and splash differences. Hammerfall and Rune Burst now reach targets at their class AUTO stopping distance. Before this, AUTO could repeatedly use basic attacks without ever casting those primaries.

Class attacks have brief, non-damaging canvas effects (staff beam, hammer impact, rune seal, flask splash, warrior slash), with static alternatives under reduced motion. Attack warnings include remaining windup time. Dodge feedback requires a genuinely threatened melee mark or a projectile crossing the player's position; shots travelling away do not award phantom dodges.

Rootwarden health is 3,900 before difficulty multipliers. Phase three sends sweeps in both directions and marks two fixed eruption areas with a safe gap away from platform edges; the same areas drive drawing and damage. Phase changes still clear existing hazards and provide a breather. Scripted starter campaign results before the final skill-range correction were approximately 219 minutes (Warrior), 263 (Mage), 280 (Blacksmith), versus 221/275/344 before this pass. These are simulations, not promised player completion times.

A live phone check caught boss HUD overlap with the room title and quest tracker. Runtime 36 reserves space below the title for the boss panel, uses a contrasting panel background, and hides the quest tracker only during boss encounters.

Runtime entry 37 also suppresses the boss's duplicate local name caption during an attack windup, keeping it out of the dodge instruction; the main boss panel retains the name and phase. Unchanged dependencies retain runtime-36 cache keys.

Inventory flow pass (runtime 38): equipment comparison tables include every gained and lost stat, including rune/stone/infusion bonuses and stats absent from the candidate. Rings show both destinations and offer explicit slot choices. The same comparison is available in crafting previews.

At a town chest, Store & Clear Overflow repeatedly deposits unlocked materials and claims what fits; full chests and locks leave quantities intact. Deposit Spare Gear moves only unequipped, unlocked gear, preserving instance upgrades. Characters already at a chest can switch without closing storage; others must walk there first. Transfer messages report partial amounts. Material details at a chest identify supplies held by other characters.

The backpack counter opens Items and signals retained floor loot or pending overflow. Full-bag notices name the blocked item, floor loot is listed in Items, and rare pickups receive distinct colors. Quest delivery objectives link to the item reference; material sources include gathering rooms, skill requirements, recipe unlock hints, shop prices and map links. Unobtained reward quests identify the mentor instead of revealing their title.

Equipment audit: the Sunwell Branch was strictly outclassed by the common verdant staff despite needing three cooldown-gated guardian drops. It now costs one sap and trades some attack for stronger logging/skill bonuses, keeping a useful profession role. All 199 items retain at least three implemented uses.

Runtime 39 also excludes active boss, guardian, trial and dungeon encounters from town-chest access, even when their retained world coordinates coincide with a town chest. No material transaction can use that coordinate overlap to resupply an active encounter.
