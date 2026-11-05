# Wildroot — World One

An original side-view browser idle RPG for Vanilla and friends. Hosted under `wildroot/` in the Projects website. Serve over HTTP; JavaScript modules cannot run through `file://`.

## The playable world

The main screen is a controllable platform map, not a production dashboard. Click the ground to walk, click enemies to approach and attack, click trees or ore to gather, and click NPCs, stations or portals to interact. Characters walk between platforms using ladders. Keyboard movement supports jumps; mobile has touch controls and a camera that follows the character.

Regular combat maps contain five individual monsters of the zone's species across three platforms. Enemies patrol, approach during fights, take individual hits, retaliate, drop loot and respawn. The player has health, attack and class-skill cooldowns, and recovers at the entrance after a knockout. Floor loot can be collected by walking near it or tapping it. Pending loot is saved and collected before leaving a map or switching characters.

AUTO searches for enemies, navigates ladders and uses the character's ability. Manual movement takes control back. Inventory, quests, professions, talents, crafting and world travel are game overlays. Class progression requires talking to the actual mentor; crafting requires reaching the station.

## Controls

- Click / tap the ground: walk to that point, using a ladder if needed.
- Click / tap an enemy: approach and attack. A skill button deals a stronger class-specific hit.
- Click / tap a tree or ore: approach and gather.
- Click / tap NPCs, crafting stations or portals: walk over and interact.
- A / D or left / right arrows: walk. W / S or up / down arrows: climb.
- Space: jump. F: basic attack. 1: class ability. E: interact. I: inventory. M: map.
- Touch movement buttons, jump, attack, class skill and AUTO are below the world.

## World One specification

Six areas, 22 zones, 16 regular enemy species and one boss:

- Caves (3): copper. Deep Caverns (4): iron and gold.
- Forest (5): oak and birch. Jungle (4): jungle wood.
- Hearthstead Town (3): class mentors, anvil and foundry.
- Verdant Outpost / Jungle Town (3): enchanting, alchemy and boss entrance.

One initial unclassed character. Each character completes a three-step initiation (level, profession practice, material delivery) to choose a class: Warrior / Mining, Mage / Logging, Blacksmith / Smithing, Enchanter / Enchanting, Alchemist / Alchemy. Each first class unlock adds one slot. All five unique classes unlock duplicates; World One has six slots.

Each class has an active combat ability: Warrior Cleave, Mage Arc Bolt, Blacksmith Hammerfall, Enchanter Rune Burst, Alchemist Acid Flask. Beginners have Power Strike. Level-ups grant individual talent points for attack, health or gathering. Professions also retain their existing specialisations: faster mining/logging or double production output.

Storage, route unlocks and the Archive are account-wide. Equipment, talents, quests and skills belong to each character. Eighteen recipes cover bars, planks, dust, tonics, weapons, armour, tools and rune/vitality upgrades. Coins fund crafting fees. Every item has at least one implemented purpose, visible in inventory.

Three independent loot layers remain: each enemy has one common, one rare and one legendary entry; World One has three rare and two legendary entries; global loot has five mythical entries. No rare drop is required for basic advancement. The Archive converts materials into permanent account damage.

## Simulation and saves

The selected character uses position-based hit-by-hit combat and proximity-based gathering. Other characters keep working through the idle model. Both feed the same loot, XP, skills and economy functions. The selected character is excluded from background simulation to prevent duplicate rewards. Opening a menu does not run both simulations on the same character.

Up to eight hours are simulated on return. Existing `wildroot-v1` saves are retained, with default talent fields added to older characters. Local autosave, import/export and multi-tab protection remain. This private prototype trusts local saves/device time and has no account server, multiplayer, trading or purchases. Friends play independent rosters.

Working title, enemy names, recipes and balance remain provisional. World 2's ten branches, World 3's future professions and World 4's ten upgrades are planned, not playable.

## Development and validation

- `content.mjs`: World One data and recipe/loot dependencies.
- `engine.mjs`: progression, crafting, idle simulation, saves and talent rules.
- `world.mjs`: movement, ladders, target navigation, active combat, abilities, loot and map interaction.
- `scene.mjs`: original procedural pixel scenery and sprites.
- `app.mjs`: game HUD, controls, overlays and save coordination.

Run `node --test wildroot/engine.test.mjs wildroot/world.test.mjs` from the repository root. Checks cover progression, roster rules, crafting, old-save compatibility, idle claims, movement/jumping, ladder navigation, actual resource proximity, per-hit combat, cooldowns, auto control, NPC proximity, portal gates, knockouts, floor loot persistence and prevention of active/background duplicate rewards.

Responsive controls are implemented for portrait and landscape. Actual phone hardware testing remains necessary. Artwork is original canvas code, with no copied IdleOn assets.
