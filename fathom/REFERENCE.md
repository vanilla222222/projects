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

## Water

Water was static when oceans were added: a body you could swim in but not move. It now
flows. Each water tile carries a level from 1 to 255 and the simulation moves volume down
first, then sideways toward the average of a cell and its open neighbours.

Three things keep it affordable on an endless world:

- **An active set.** A cell is simulated only while it is moving; a pass that moves nothing
  out of a cell drops it. Still water is therefore free, which matters when most water in
  the world is a settled ocean.
- **A budget per step.** Leftover cells wait for the next frame, so a collapsing reservoir
  costs several frames rather than one long one.
- **A minimum flow.** Sideways movement targets the floored average and never passes it,
  so equal cells exchange nothing.

Flatness has an exact guarantee and it is not "every column equal": two adjacent columns
can sit one unit apart with no legal move between them, so an n-column basin may hold a
gradient of up to n-1 units out of 255. `tools/liquid-test.js` asserts that, rather than a
stricter claim that would be false.

Only partial tiles are stored. A water tile with no entry is full, which is what generation
produces, so an entire ocean costs nothing to represent and a save holds only the tiles a
player has actually disturbed.

## Vertical layers

The world has no floor and no ceiling. Everything is measured against sea level, which is
the one altitude that does not move: surface height varies by a couple of hundred tiles
between a highland and an ocean bed, so a layer defined against the ground would wander.

| altitude | layer | what is there |
| --- | --- | --- |
| -750 and above | Space | planetoids of skystone and starrock, black sky, no horizon |
| -750 to -250 | Sky | floating islands - grass over soil over a skystone keel - and cloud banks |
| -250 to +50 | Surface | the fourteen biomes |
| +50 to +750 | Caves | per-biome cave profiles and strata |
| +750 to +1250 | Deep Caverns | basalt into deep slate |
| +1250 to +1750 | Hell | the great hall: ash ceiling, ash floor, standing columns, lava lakes |
| +1750 to +2170 | Hell Caves | brimstone, cinderstone and obsidian, heavily flooded with lava |
| +2170 and below | the hall again, repeating without end |

Below the hell caves the great hall repeats every 500 tiles, with a slab of rock between
one hall and the next and passages bored through it. A new palette every thousand tiles
would be a promise the generator cannot keep; one enormous recognisable place that goes
on forever is a journey instead.

Sky islands and planetoids are computed from (x, y) rather than stamped like trees. A
stamped structure has to be scanned for from neighbouring chunks and the margin has to
exceed its half-width; an island forty tiles wide would need a margin three times the
trees'. A structure that is a pure function of position cannot disagree across a seam at
all.

## Enemies

Forty enemies, drawn from Terraria's roster where Fathom has the same biome and invented
where it does not. Six shared behaviours carry all of them: slimes hop, walkers walk and
step up a tile, flyers home in with a bob, swimmers only move in liquid, crawlers cling,
and worms swim through rock.

A spawn is chosen from a weighted pool keyed on biome, layer, day/night and whether the
spot is underwater. An empty pool means nothing spawns, which is how a safe place stays
safe without a special case.

Two rules are taken straight from Terraria. Spawning happens in a ring outside what the
player can see. And **a player-placed wall suppresses spawning**, which is what makes
building a shelter worth doing - the world already records which walls those are, because
"the player put it there" is exactly the wall edit diff, so it costs no extra storage.

Density was measured, not guessed. At nine simultaneous enemies spawning every 1.6
seconds the cap was reached in every trial and the surface felt swarmed, while a character
standing still and doing nothing still survived past three minutes because regeneration
outpaced the damage. Six and 2.8 seconds keeps the pressure without the crowd.

Swords are separate from pickaxes. A pickaxe will hurt something, at 30% of its power and
one and a half times its swing time, which is the argument for making a sword.

## Caves, and what measurement found

The caves were noise, and noise makes pockets rather than caves. A flood fill from the
sky over 600x700 tiles measured **1% to 11% of the underground reachable** across three
seeds, in 300 to 460 separate sealed voids, with the deepest reachable point 31 tiles
down. The world was full of caverns nobody could ever walk into.

The fix is a skeleton that is connected by construction rather than by luck:

- **Galleries** run horizontally at intervals of depth, each a wandering line continuing
  forever in x.
- **Shafts** wander down across many galleries. A shaft crosses every gallery it passes,
  so the two families form one network, and shafts whose top is depth zero are its doors.
- Both take their width from the biome's own cave profile, so a desert gallery is a broad
  hall and a tundra one is a crawl. Without that the uniform network washed the biome
  character out of the very undergrounds it was meant to connect.

Reachability is now 93-96% with the deepest point at the bottom of the sample, on every
seed tested, and `tools/worldgen-test.js` keeps the flood fill as a permanent check.

One bug accounted for most of the remaining failures after the network existed: the carve
was gated behind `depth > 2`, the same guard the noise caves use, which capped every
surface shaft with two tiles of soil. Every door was generated and then sealed.

## Waterlogging, deeper oceans, larger biomes

- **Waterlogging.** A tile holds one block id, so a shell or a frond on the sea bed was
  winning against the water and punching an air pocket in the ocean - 3,785 of them in
  one sampled stretch. Water level is now a property of any non-solid tile, derived from
  a base function the same way tiles and walls are, so an ocean still costs no storage.
- **Deeper oceans.** The drop off the shelf is now exponential rather than linear: median
  depth 80 tiles and 478 at the 90th percentile, against a previous maximum of 63. A
  shelf offset keeps the shoreline where it was; without it the steeper curve turned
  almost a third of the world into sea.
- **Larger biomes.** Climate frequencies divided by about three. A biome you cross in two
  screens reads as terrain variation rather than as a place.
- **Biome blend.** Taking the strongest climate weight outright puts a ruled line between
  two biomes. Where the top two weights are within 40% of each other, a coherent noise
  field decides per patch which wins, so a border becomes interleaved tongues of each.
  The kernels had to be narrowed first: at their original width the blend fired on 86% of
  all columns, because no biome had a core where it was clearly dominant.

## Three fixes that the tests had been hiding

All three of these were reported from play while the test suite was green. Each one was a
case of the test measuring something adjacent to the thing that mattered.

**Caves did not connect to the surface.** The reachability test seeded its flood fill
from the top two rows of a fixed window. Surface height varies by a couple of hundred
tiles, so for most columns those rows were already underground: the fill started *inside*
the cave system and proved only that it reached itself. It reported 93-96% while the
world had three cave mouths in 800 columns. The fill now seeds only from tiles strictly
above their own column's surface, and the count of distinct surface openings is checked
too, because connectivity without a door is not a cave system anybody will see. Shafts
are also funnels now rather than flares: widening the mouth had made each entrance
fifteen tiles across and turned 21.9% of the surface into holes, so the shaft pinches at
the top and opens below - many more entrances for a quarter of the missing ground.

**The biome blend did nothing visible.** Two separate reasons. The second-place search
ran inside the same pass as the first, which left it equal to the winner whenever the
strongest biome was index 0 - so the blend fired, computed a share of exactly one half,
and swapped the biome for itself. And once that was fixed it still fired mostly between
neighbours that share a surface material, taiga against tundra, both snow. Identity is
now decided by weights jostled per column, with the jostle scaled by how contested the
column is: full at a border, zero in a core. Measured on surface material rather than on
biome name, 69% of visible borders interleave against 6.5% before, and only 10.6% of the
world sits in runs under 20 tiles, so the cores survived.

**The ocean still had air pockets.** Water reached only a table 110 to 230 tiles below
the sea bed; everything carved below that stayed dry, which left 89,309 dry air tiles
under the ocean in one sampled stretch, and the new cave shafts then punched 5% of sea
beds open into them. Anything open below sea level under an ocean is now water, down to
hell where lava takes over.

## Underground structures

Four kinds, placed on a grid and computed from (x, y) like the sky islands, so a room
wider than a chunk cannot disagree with itself at a seam.

- **Cabins** - a wooden shell with a collapsed doorway, torches, and a crafting station
  inside, so finding one is worth something.
- **Ruins** - brick, partly fallen in, with rubble on the floor.
- **Grottos** - large eroded natural chambers, which is also where the big caves are.
- **Mineshafts** - long timbered corridors.

Three rules kept them honest, and each came from a failure: never in hell, never under
the sea, and never poking out of a hillside. A structure is anchored to its own column's
surface, so over a neighbouring valley it could reach above the ground there and carve a
hole in the open hillside; it has to stay buried at every column it spans.

## Wood species, tools and armour

**Six wood species**, one per tree: oak, pine, mahogany, acacia, shadewood and crimwood.
Each has its own log, block, background, platform, door, chair, table and work bench -
forty-eight tiles, generated from a table rather than written out, because six times
eight near-identical entries is forty-eight chances to make one of them different by
accident.

Tools and armour deliberately do **not** depend on species. A recipe ingredient beginning
with `#` is a tag: `#wood` matches any species' lumber, so a pickaxe can be made from
whichever tree happened to be nearest. Gating a pickaxe on finding one particular tree
would be tedious rather than interesting.

**Three tool jobs**, as in Terraria: a pickaxe breaks blocks, an axe fells trees, a hammer
takes down background walls. Holding the wrong one does nothing. That is what makes the
starting set - tin pickaxe, axe, hammer and sword - a set rather than four copies of the
same thing, and it finally implements the wall rule this file recorded long ago.

**Tin** sits below copper: a shallow ore and the metal the player begins with.

**Platforms** are one-way. The collision test needs the body's position before the move as
well as after, because landing on a platform is the condition that the feet were above the
deck and are now below. Checked on position alone, a platform either blocks you the moment
you jump into it or never catches you at all. Holding down drops you through one.

**Doors** swing when used, whatever you are holding - checked before anything the held item
would do, because reaching for a door with a block in hand is the common case and walling
the doorway up instead would be infuriating. A door only closes into empty space, so it
can never shut on the player.

**Armour** has four slots rather than Terraria's three, because boots were asked for. Every
two points of defence take one off an incoming hit, with a floor of one, so armour is
always worth wearing and never makes you untouchable. Defence is read off the worn pieces
each step rather than cached, so taking a piece off matters immediately.

**The bow** is a weapon that spends ammunition and fires where you point rather than at
something under the cursor. An arrow is a small body that flies, falls, and stops at the
first thing it meets.
