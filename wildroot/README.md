# Wildroot — Version 1

An original, buildless browser idle RPG for Vanilla and friends. Open through the Projects index or serve this directory over HTTP. JavaScript modules require HTTP; opening index.html directly with file:// is unsupported.

## Playable scope

- Six areas, 22 zones, 16 regular enemy species, one boss.
- Caves (3): copper. Deep Caverns (4): iron and gold. Forest (5): oak and birch. Jungle (4): jungle wood. Hearthstead Town (3): class mentors, anvil and foundry. Verdant Outpost / Jungle Town (3): enchanting, alchemy and boss entrance.
- One initial unclassed character. Individual three-step class quest lines (level, profession practice, material delivery). Warrior / Mining; Mage / Logging; Blacksmith / Smithing; Enchanter / Enchanting; Alchemist / Alchemy.
- Each first class unlock adds one slot. Five unique base classes unlock duplicates. Version 1 has six total slots; later class tiers will expand the roster rules.
- Independent character assignments, shared materials, route unlocks and archive bonuses. Gathering continues alongside combat on other characters.
- Mining and logging specialists gather faster. Production specialists double material output. Equipment upgrades are per character. Coins fund crafting fees.
- Eighteen recipes for ingots, planks, dust, tonics, weapons, armour, tools and permanent rune/vitality upgrades.
- Three independent loot layers: enemy (one common, one rare, one legendary), World 1 (three rare, two legendary), global (five mythical). Rates are visible in Field Guide.
- Every item has an implemented use, listed in storage. Enemy materials and rare drops can be offered to the Archive for permanent account power. No rare drop is required to advance the main route.
- Eight-hour idle simulation on return, including combat recovery. Local autosave, backup export/import and protection against two tabs writing the same save.
- Responsive touch-friendly layout, keyboard focus, reduced-motion support, original procedural canvas scenery.

## First session

Fight Moss Slimes to level 3, visit Hearthstead, and begin a class quest. Practise that profession and deliver the required materials. A Warrior or Mage is a straightforward first character. Create another adventurer after the first class unlock and assign a different task. Clear 12 enemies in each zone to open the next route. The Jungle opens after Grove Guardians; the Outpost opens after Orchid Mantises. Upgrade equipment before facing the Rootwarden.

Any character can practise any basic profession, so class quests cannot deadlock. Anvil is Hammer Lane; Foundry is the third Town zone. Enchanting is Canopy Market; Alchemy is Alchemists’ Terrace. Use the Workshop shortcuts to travel to a station.

## Provisional content and boundaries

The six-area structure, resources, class affiliations, uniqueness rule and future tiers follow the user's plan. Working title, names, recipe quantities, quest requirements, 12-kill route gates, rates within the specified ranges, eight-hour limit and Archive are first-pass implementation choices for playtesting, not final balance commitments.

World 2 is reserved for ten branches, two per base class: five specialising in World 2 professions and five in World 3 professions. World 4 will add ten direct upgrades. Those worlds, professions and branches are not implemented or presented as playable.

This is a local-save prototype on the existing public Projects website. Friends play separate rosters. It has no accounts, shared multiplayer world, trading, paid items, storefront integrations or server-authoritative anti-cheat. Device time and local save edits remain trusted. There is no runtime backend or external dependency beyond optional web fonts (system fallbacks included).

## Development

Content and dependencies: `content.mjs`. Rules and save handling: `engine.mjs`. UI: `app.mjs`. Original canvas scene: `scene.mjs`.

Run `node --test wildroot/engine.test.mjs` from the repository root. The tests cover content constraints, actual first-class progression, class restrictions/slots, independent workers, crafting and costs, travel gates, loot, archive effects, boss retreat/victory, save validation and idle claims.
