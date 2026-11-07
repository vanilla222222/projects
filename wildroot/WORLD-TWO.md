# Tidewilds campaign · runtime 45

World One has 29 normal rooms after the Lower Reaches mining expansion. World Two has 32 normal rooms across eight areas. World Two opens after completing the World One story **and** crafting the Greenreach Completion Token. Its nine-quest campaign connects the five skills, expedition equipment, a Tier 2 calling and the Tempest Sovereign boss. Second class branches and World Three remain future work.

| Area | Rooms | Connection | Gathering |
| --- | ---: | --- | --- |
| Tidehaven | 3 | Legacy Square World Gate | Shared chest in each room; supply shop |
| Silverfin Coast | 5 | Landfall Quay | Reedfish, Silverfin, Storm Eel; rods |
| Lanternfen | 5 | Reedpool Inlet | Glowbugs, Amber Beetles, Glasswings; nets |
| Buried Coast | 4 | Artisan Boardwalk | Clay, Fossils, Buried Sun Relics; shovels |
| Berrywild Rise | 4 | Pathfinders’ Hall | Tideberries, Cloudberries; gloves. Saltwillow and Driftwood; axes |
| Hunters’ Highlands | 5 | Saltwillow Bend | Hunting XP from kills; scattered bushes and trees |
| Tempest Cliffs | 4 | Stormglass Cove | Higher tier bugs, dig sites, bushes and wood |
| Farwatch | 2 | Skybreak Beacon | Shared chest in each room; supply shop; sealed future horizon |

The Lower Reaches branch from Heart of the Mountain: Cobalt Fault → Obsidian Descent → Black Crucible. Cobalt and Obsidian remain in World One. Cobalt Alloy consumes tempered bars; Obsidian Composite consumes cobalt and gold bars. Deep Cobalt tools can be made before gathering Obsidian, avoiding a circular tool requirement.

| Base class | Tier 2 | Specialty | Pathfinder |
| --- | --- | --- | --- |
| Warrior | Ranger | Hunting | Tracks in the Grass |
| Mage | Grovekeeper | Foraging | Berrybank |
| Blacksmith | Excavator | Digging | Shovelbank |
| Enchanter | Lantern Weaver | Bug Catching | Reed Gate |
| Alchemist | Tidecaller | Fishing | Shellwater Beach |

Training requires physically reaching the Pathfinder, character level 20, specialty level 3, twenty local first-room kills and the listed supplies. Original talents and class skills remain intact. Gathering specialties gain speed; Ranger gains extra Hunting XP. Each first Tier 2 discovery opens another character slot. Duplicate Tier 2 classes require ten unique Tier 2 discoveries; only five are available now, so a roster can currently advance only five characters. World Three will supply the second five branches.

Logging, Bug Catching, Digging and Foraging gain 1–3 resources per subsequent world. Mining remains condensed in World One and Fishing in World Two. World Three resources are not spawned in advance. Hunting progresses through combat rather than a gathering node.

New equipment consumes progressively higher quantities and intermediate alloys. Gathering satchels increase only their own category and are single-use per character. New items keep at least three implemented roles through crafting/equipment, foundry reclamation and town projects (rare trophies also support material research).

Getting Started derives ten lessons from real character actions, supports revisiting lessons, and never adds unaccepted quests. Reset Data lives in Save & Help, asks before replacing all Wildroot progress, touches only the Wildroot save key, and leaves the current game running if browser storage fails.

## Expedition campaign

Meet Captain Maris at Landfall Quay, Iona in Pathfinders’ Hall and Archivist Sol at Artisan Boardwalk. Each has three personal quests. Quests appear in the journal only after acceptance. The arrival reward supplies the materials for all four Reedbound gathering tools. Artisan Boardwalk has an anvil, and Pathfinders’ Hall has an alchemy station; both enforce physical access and share the normal recipe and inventory rules. Smelting and enchanting remain available in Greenreach.

Fieldwork introduces fishing and bugs. Berrywild work leads to the highland hunt; Sol’s digging and alloy chain unlocks five class-specific storm-forged weapons before that hunt. Higher gathering levels and cobalt tools lead to the Skybreak lens. Captain Maris requires both regional chains, a personal Tier 2 calling and final supplies before opening the Farwatch storm seal.

The Tempest Sovereign waits in the Eye of the Tempest, reached through The Sealed Horizon. Phase one marks heavy slams, phase two fires split volleys, and phase three alternates charges and volleys. Phase transitions clear old hazards and provide a short breather. Victory grants a guaranteed heart and scale, once per encounter. Return the heart to Maris for the Tidewilds Completion Token and Beacon Ring recipe. Repeated active clears can supply ring materials. There are no offline boss rewards or World Three access.

## Travel and NPC interface

The teleport atlas shows illustrated regions and the actual portal graph. Labels remain visible; locked routes, undiscovered rooms, discovered destinations, selection and current location have different appearances. Selecting a room spends no charge; its separate teleport button confirms travel. Find Me centres the current room. Shared ladder landings choose a ladder extending in the requested direction, and releasing climb input retains finite coordinates.

NPC menus immediately show the current quest, objectives, progress and rewards. Accept and hand-in have separate explicit actions; story text is optional. Class training is a separate tab. Character identity, NPC proximity, quest dependencies, materials and one-time reward checks remain enforced.

## Validation and pacing

`node --test wildroot/*.test.mjs` runs the regression suite. `node wildroot/world2-sim.mjs` first completes Greenreach, then uses actual gathering, bank transfers, recipe queues, personal crafting, route kills, NPC claims, Tier 2 training and active combat to finish Tidewilds. It does not insert completed expedition quests or grant their required resources. Its reference Warrior run takes about 1,784 simulated minutes in World Two, excluding human reading and navigation. This is an optimized idle-system model, not a human playtime promise or a claim that the pacing is final. Tests separately exercise legal expedition builds for all five classes against the boss, save migration, phase changes, anti-replay rewards and no offline boss kills.

Desktop and mobile live visual verification remains outstanding when the preview/browser service is unavailable. Automated rendering checks do not replace real phone playtesting.
