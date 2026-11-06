# Reference notes from Terraria

Fathom is its own game, but several systems are worth building on known-good foundations
rather than on an impression of them. These facts were read from the official wiki
(terraria.wiki.gg) on 2026-11-05 and apply to Desktop/Console/Mobile 1.4.4+. Where Fathom
departs deliberately, that is noted. Nothing here is recalled; anything not on this page was
not checked.

## Walls — *Walls*

- Walls are tiles that draw **behind everything else, including blocks**. They are one of the
  three things a world is made of, alongside blocks and liquids. They are **never collidable**.
- A wall and a block can occupy the same tile. The wall is what remains when the block is
  mined out.
- Placement: on any tile that **does not already contain a wall**, provided the tile is
  **adjacent to another wall or block**. Walls have their own placement layer.
- Removal: a **hammer** or explosives. Not a pickaxe.
- **Safe vs unsafe is the mechanically important distinction.** Safe walls stop enemies
  spawning in front of them and are required for a structure to count as an NPC house or for a
  bed to set a spawn point. Unsafe walls do neither. **Most player-placed walls are safe; most
  naturally generated walls are unsafe.** Unsafe walls must be removed starting from an edge —
  a tile adjacent to open space with no wall.
- Torches, paintings, signs, switches and item frames can be placed **directly on a wall** with
  no block beneath them.

## Inventory — *Inventory*

| section | slots |
|---|---|
| hotbar | 10 |
| main inventory | 40 |
| coins | 4 |
| ammo | 4 |
| trash | 1 |
| armor | 3 |
| vanity armor | 3 |
| armor dye | 3 |
| accessories | 5, 6 or 7 |
| vanity accessories | 5, 6 or 7 |

- Accessory count is difficulty-dependent: 5 in Classic; 5 in Expert, rising to 6 after a Demon
  Heart; 6 in Master, rising to 7. Any accessory fits any accessory slot.
- **Stack limit is 9999** on current versions. The familiar 999 for blocks and walls is the
  old-gen console and 3DS rule, where the limit was per-item.
- A stack is split by picking up a single item from it with the Open/Activate key.
- An item held on the cursor counts as removed from the inventory and is dropped if the
  inventory closes.

## Health — *Health*

- Start: **100**, shown as 5 red hearts. A red heart is **20 HP**; a gold heart is **25 HP**.
- Life Crystal: **+20** each, to a cap of **400** (20 red hearts, so 15 crystals).
- Life Fruit: **+5 per heart**, turning each heart gold; 20 of them reach **500**.
- A Lifeforce Potion lifts the cap temporarily to **600**.
- Regeneration rises **the longer the player avoids taking damage**, with a **further boost for
  standing still**, and more from equipment, potions and nearby campfires or heart lanterns.

## Mana — *Mana*

- Start: **20**, shown as one star. A star is **20 mana**.
- Mana Crystal: **+20**, usable **9 times**, to a cap of **200** (10 stars).
- Regeneration is **slower while mana is being spent**, **faster standing still**, and faster
  the **larger the player's total mana**.
- Casting without enough mana is allowed, at a **60% attack speed penalty**.

## Trees — *Trees*

- **"Trees are background objects that do not affect player or enemy movement."** You walk
  through them. They cannot be climbed, and blocks cannot be placed overlapping their limbs,
  but platforms and torches can be attached to a trunk.
- Cutting the **lowermost centre tile destroys the whole tree**. Parts left standing do not
  regrow.
- Yield is **1–2 wood per tile**, branches included, and up to **one acorn per leaf patch**.
  Axe power sets both the hits per tile and the average wood yield.
- Blocks directly beneath a tree cannot be destroyed.
- A sapling needs **one horizontal open space either side** and appropriate ground — grass,
  snow or sand.

## Where Fathom departs

- Fathom has no difficulty modes, so accessory slots are a fixed count rather than 5/6/7.
- Fathom's stack limit is its own choice; 9999 suits a game with Terraria's item breadth and
  Fathom has far fewer item types.
- Fathom has no NPCs yet, so the safe/unsafe wall distinction currently affects only whether a
  wall reads as natural or built. It is modelled now because retrofitting it later would mean
  rewriting every generated wall.

## Pickaxe power and mining

Fetched from terraria.wiki.gg, 2026-11-05 (1.4.4+).

- Every tile starts at 0 damage and is destroyed once it reaches **100**.
- Each hit adds a `damageIncrease`: **100** for background objects (plants, vines, torches,
  mushrooms, ropes), so they come away in one swing; **power x 2** for Dirt, Clay and Sand;
  **power x 1** for everything else.
- The gate: the increase is **0** when the pickaxe's power is below the tile's threshold.
  No amount of swinging helps. Published thresholds: Meteorite 50, Obsidian 55,
  Demonite/Crimtane 55, Hellstone/Ebonstone 65, Cobalt/Palladium 100,
  Mythril/Orichalcum 110, Adamantite/Titanium 150, Chlorophyte 200, Lihzahrd 210.
- Maximum power in the game is 230% (Laser Drill).
- The pickaxe must be the held item.

### Where Fathom departs

Terraria breaks every tile at 100 damage and separates its tiers by power and swing speed
alone. That works because it has dozens of tile types spread across many thresholds; with
six ores it collapses, because any power above 100 one-shots the entire world and the late
tiers become indistinguishable. So in Fathom **each tile carries its own toughness**
(`toughness` in `js/tiles.js`, defaulting to Terraria's 100), rising from sand at 80 to
emberite ore at 330. Depth then costs time as well as permission, and every tier is
strictly faster than the one below it — which `tools/mining-test.js` checks rather than
assumes, across all 7 tiers and every tile.

The thresholds themselves are Fathom's own, scaled to its seven pickaxes: basalt 45,
slate 65, crystal 45, silver ore 35, gold ore 45, cobalt ore 65, emberite ore 100.

## Crafting

Fetched from terraria.wiki.gg, 2026-11-05 (1.4.4+).

- A recipe appears in the list **only when every ingredient is already held**. The list is
  therefore a description of what you can do now, not a catalogue to study.
- Crafting stations are furniture placed in the world, not menu tabs.
- **Station reach is 5 tiles left/right and 3 tiles up/down** (a 13x9 box around the
  player), the same reach as tools and chests. Walk out of the box and the station's
  recipes disappear.

### Where Fathom departs

- Terraria's stations are multi-tile furniture. Fathom's occupy **one tile each** and are
  non-solid, so a bench never blocks the tunnel you put it in.
- The chain is Fathom's own: wood by hand gives a bench; the bench gives a furnace and an
  anvil; the furnace smelts the six ores into bars; the anvil turns bars into the six
  pickaxes above wood. `tools/craft-test.js` proves the graph closes, so a player holding
  nothing but raw ore can reach the best pickaxe, and every gated tile has a craftable
  pickaxe that opens it.

## Biomes, caves and water

Terraria's world is finite and hand-shaped: two oceans at fixed edges, one jungle, and
exactly one of corruption or crimson chosen at creation. Fathom is endless, so none of
those scarcity decisions apply and the generator is its own design rather than a copy.

- Biomes are placed by **two climate fields**, temperature and moisture, not by a single
  ordered list. Each biome owns a region of that 2-D space, so tundra can border desert.
- Height bias is the **weighted average of the same weights** that choose identity, which
  is what keeps terrain continuous across a border while the surface material changes
  abruptly. Worst measured surface step is 2 tiles.
- Both blights generate. An endless world never has to choose between them.
- Each biome has its own **cave profile** - passage width, how readily caves open into
  rooms, and whether the field favours vertical shafts or flat-roofed halls. Measured over
  three seeds, jungle caverns run about 25% open with a mean cavity 25 tiles tall; tundra
  tunnels about 11% open with a mean cavity under 7.
- **Underground oceans**, which Terraria does not have: beneath an ocean the sea soaks
  into the rock, so caves within roughly 110-230 tiles of the sea bed are flooded rather
  than empty. A mire has a shallower water table for the same reason.
- Water is static, non-solid and translucent. Swimming is three numbers in the physics
  step; being underwater is shown by tinting the view, not by lighting the water.

## Foliage

Terraria's surface decoration is largely one grass tile plus a handful of shared props.
Fathom gives each biome its own planting table, because two patches of grass reading as
two different places is most of what makes a biome felt rather than labelled.

- Thirteen prop types, all non-solid and all one-swing: tufts, ferns, flowers, bamboo,
  cacti, dead bushes, reeds, shells, seaweed, coral, frost shards, and the two blights'
  own caps.
- Seaweed and coral grow only submerged; everything else only in air. **Shells are the
  exception** and grow on the sea bed and the beach alike, which is where a player looks
  for them.
- Bamboo, cactus and seaweed are stalks rather than single tiles. Seaweed is clamped to
  the depth of water above it, or a stalk in a shallow bay grows out into the air.
- Grass is drawn as a lit top band with a ragged root fringe into the soil beneath it,
  not a tinted square, so a hillside has a silhouette.
- Trees carry branches and a root flare. Without them a trunk is a pole with a hat.
- The blights have their own wood, so a blighted tree stops looking like an ordinary one.
