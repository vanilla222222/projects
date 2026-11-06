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

## Multi-tile objects

A door is three tiles tall and a chest two by two, but the world stores one byte per tile
and so an object cannot carry its own extent. Each cell therefore gets its own tile id,
tagged with which cell of which object it is; from any cell the origin is
`(x - part.dx, y - part.dy)`, which is all the code needs to use, break or draw the whole
thing as one piece.

The alternative - one tile id plus a side table of object positions - would need that
table saved, kept in step with every edit, and consulted on every collision test. Cell
tiles cost ids, which are cheap here, and nothing else.

Placing one is all-or-nothing: every cell must be clear and something must be underneath,
so a door cannot be hung in mid-air. Breaking any cell takes the whole object, so a door
can never be left as two thirds of a door.

## Chests and loot

Contents are a pure function of the chest's position and the world seed, exactly like the
tiles around them, and only become stored data once the player has taken something out. A
world with ten thousand untouched chests costs nothing to save, and two players on the
same seed find the same sword in the same cabin. `tools/chest-test.js` checks that
directly: reading a chest must create no edits, and an emptied chest must stay empty
across a save rather than refilling from the generator.

A table rolls each entry independently rather than picking one, so a chest can hold
several things - 88 distinct contents across 119 generated chests. Three bands by depth:
survival kit and an occasional weapon near the surface, better metal and the tools for
the next layer deeper down, and a rare gilded chest with what you hope for.

An open chest is shut by walking away from it and by the backpack closing for any reason
at all, as an invariant checked every step rather than something each exit path has to
remember. That is what stops a chest being left open and its contents never written back.

## Consequences, and recovering from them

Three gaps that together meant the world had no stakes and no way back from them.

**Beds set where you come back.** Dying used to return you to world origin; in an endless
world that is close to a bug, because dying 3,000 tiles out and 800 down cost you the
walk as well as the loot. A bed is a four-by-two object per wood species, and using one
sets the spawn point, which is saved with the world. With no bed, the fallback is the
same search that places a character at the start of a new world, so it is always
somewhere standable rather than coordinate zero.

**Falls hurt** past 16 tiles, at 5.5 health per further tile. Water arrests a fall
entirely, which is both how it works and what makes diving into a pool a way down.
Armour does not soften a landing - that is what the Feather Charm is for.

**Breath** was a field on the player that nothing ever read. It now runs down over 14
seconds submerged and costs health every second after that. The HUD shows it only while
it is running out.

Testing the fall needed the player actually dropped down a shaft: setting `landed`
directly does nothing, because the physics step recomputes it from the body's own motion
before the damage check reads it.

## Armour tiers, set bonuses and accessories

Eight tiers times four pieces, generated from a table. The six-ore ladder previously paid
off in pickaxes and swords but had exactly one armour tier.

Wearing all four pieces of one metal grants that metal's **set bonus**, which is what
makes a complete suit worth the detour rather than four separate upgrades: tin swings
tools faster, copper mines harder, iron adds defence, silver moves faster, gold
regenerates, cobalt breathes water, emberite ignores lava.

**Accessories** fill slots that had existed since the inventory was built and had never
held anything. Each changes one number the player can feel: a second jump in mid-air,
triple breath, quartered fall damage, more mining power, more speed, more defence,
fireproofing, or a light you carry with you.

Every effect is summed by one function and recomputed each step rather than cached, so
taking a piece off matters immediately, and the equipment screen says in words what the
worn set is doing. Armour that silently changes a number is armour the player cannot
reason about.

## A note on tile ids

Chunks store sixteen bits per tile, not eight. Six wood species with a full furniture set
each had the registry at 151 of a possible 255, and beds alone would have added 48 more;
the ceiling was close enough to start shaping what could be built. A chunk is 48x48, so
the change costs 4.6KB per layer per chunk and removes the limit.

## The map

An endless world with fourteen biomes and seven vertical layers and no way to find your
way back is a world you stop exploring, because every trip out is one you might not be
able to undo.

Two sizes of the same thing: a corner panel that is always there, and the same chart
blown up to fill the screen on **M**, with **[** and **]** to zoom. Both draw one pixel
per tile into a small canvas which is then scaled up - the same trick the lighting uses,
so the cost is the number of tiles sampled rather than the number of screen pixels
painted. It redraws about ten times a second, because a map does not need sixty.

Colours come from the tile registry, so the map never needs its own palette kept in step
with the world. Open space shows its background wall rather than nothing, which is what
makes a dug tunnel legible against solid rock, and water shows as water.

**What the player has seen** is stored as one bit per tile, a bitset per chunk: 288 bytes
where a byte per tile would be 2,304. Walking 3,200 tiles reveals 165,767 tiles and costs
52KB, measured - about 2.6 bits per tile once base64 is counted. It is revealed from the
simulation rather than the draw, so the map fills in whether or not it is being looked at,
and a corrupt entry costs a patch of revealed map rather than refusing to load the world.

`revealAround` is a free function rather than a method on the map, because it is pure
logic with no canvas in it and the alternative is a test that needs a DOM to check the
shape of a disc.

## Housing and villagers

A room is a sealed pocket of air with a background behind it and the right furniture in
it, and finding one is a flood fill that is allowed to fail. The important property is
that the fill is **bounded**: started in an open cave, a naive version walks the whole
world, so it stops at a tile budget and reports "not sealed", which is both the correct
answer and the cheap one. Validating open ground takes under a millisecond.

Requirements follow Terraria's - an enclosed area between 50 and 750 tiles, a background
on every tile of it, a door or platform to get in by, a light, a flat surface and
something to sit on - and each is reported **separately**, because a house that fails is
a house the player wants to be told how to fix. Press **H** inside a room to be told.

An open door still seals a room. That is what lets a house have a way in without leaking
into the world, and it falls out of treating doors as walls for the purposes of the fill
rather than as a special case.

**Who moves in** is a question about progress; **where they live** is a question about
buildings. Keeping those apart keeps both testable. The Guide comes as soon as there is a
room; the Merchant wants 250 coins carried; the Smith wants 40 bars smelted; the Nurse
arrives after you have died once; the Delver after you have been 700 tiles down. So the
roster arrives in an order that follows what the player has actually done.

Villagers are deliberately not enemies with the sign flipped: they have a home, stay near
it, walk rather than chase, turn back at drops, and cannot be hit.

**Coins** come from everything that dies, scaled to what it was - a slime is pocket
change, an obsidian husk is a day's wages - and from chests. What you kill is what pays
for what you buy.

## Spawn, weather, and three things worth finding

**Spawn is never at sea.** The continent field used to decide this on its own, and roughly
a fifth of seeds opened with the player treading water over an abyss with no wood in
reach. Within 420 tiles of the origin the surface is pulled up to a dry ceiling; from
there it eases back out to nothing over the next 1,100, so the coast is pushed away from
spawn rather than deleted, and the homeland keeps its own hills and valleys because a
column already above the ceiling is not touched at all.

It is applied to the **height**, not to the continent field, because a column whose land
is above zero can still be drowned by its own hills - which is exactly how the old
version let oceans in. The test measures what the player meets: across sixty seeds, every
column within the flat radius is above the water line and is neither ocean nor beach, and
each of those seeds still has an ocean somewhere within 30,000 tiles.

**Weather** is a pure function of the world clock, so there is nothing to save and the
same world has the same weather at the same hour in every session. Rain arrives as
fronts: a very low frequency field with a high threshold, which means it is dry most of
the time and when it rains it rains for half an hour. A faster field crossed its own
threshold every few minutes and the sky flickered between wet and dry, which is the one
thing weather must not do. Measured across four seeds: 6-19% of the time wet, and three
to twelve changes over eleven hours of world time.

Wind comes with it - a little always, hard in a storm - and it is not decoration: cloud
banks drift with it, rain slants with it, and every piece of foliage bends under it. Over
tundra and taiga the rain falls as snow.

**Life crystals** are the only thing in the world that makes the player permanently
stronger: two by two, glowing, standing on cave floors below 120 tiles deep, and
consumed where they stand rather than carried away. +20 maximum health each, to a
ceiling of 400.

**Pots** stand on cave floors from 12 tiles down and break in one hit. What is in one is
a function of where it is, so the same pot always holds the same things - a place rather
than a dice roll.

Both are answered from (x, y) alone, like everything else in the generator, so one that
straddles a chunk seam cannot half-generate. The order inside `baseTileAt` matters for
cost rather than for correctness: it runs for every cell of the world, so the cheap hash
is tested first and the geometry - six `isCarved` calls for a two-by-two object - only
runs for the few thousandths of cells that pass it.

**Hearts** drop from roughly one kill in five, and more often the worse the fight is
going. They are used where they are picked up rather than carried, which is what lets a
fight you are losing be turned around by pushing forward into what you just killed.

## Sprites

Every living thing used to be a rectangle with two eyes on it, at which point the only
thing telling a shark from a skeleton was its colour. `js/sprite.js` holds twenty body
plans - slime, humanoid, skeleton, imp, golem, bat, eye, bird, wasp, beetle, spider,
crab, jelly, fish, leech, maw, worm, demon, lizard, cloud - shared across all forty
enemies by a `body` tag on the species, plus one plan for people that the player and the
villagers share.

There are no image assets anywhere in Fathom, and a sprite sheet for forty enemies in a
dozen poses is not something you write by hand. Drawing each body from primitives means a
pose is a number, so animation costs nothing extra: the same code draws every frame of a
walk cycle.

Plans place their parts in fractions of the creature's own box, so the same spider plan
draws a one-tile cave crawler and a two-tile magma crawler without a special case. Round
details - eyes, teeth, rivets - are sized against the smaller dimension instead, so a long
flat shark does not get oval eyes.

**Gait is driven by distance, not by the clock.** Each enemy carries an `anim` phase
advanced by how far it actually travels, so a walker shoved against a wall stops moving
its legs instead of running on the spot; wings and fins, which beat whether or not they
are getting anywhere, add a steady term as well. The player gains a walk cycle, a jump
pose, a swim stroke, a breathing idle, a blink, and a swing arc that drives mining and
fighting alike, with whatever is in hand drawn on the end of the arm.

`node tools/sprite-test.js` checks that every enemy names a plan that exists, that every
plan is drawn by something, that each draws real detail inside a sane envelope, and - the
one worth having - that every plan produces different frames at different phases. A plan
that ignores its phase looks perfect in a screenshot and is a still photograph in motion.
It caught two: the slime, which only deformed from its hop and so sat dead still on the
ground, and the slime's gait, which never advanced at all.

## Three ways of fighting

Fathom had one: swing a sword at the thing in front of you. Metal armour is a ladder -
each tier strictly better than the last - and a ladder has no room for a choice, so there
was nothing to decide beyond how deep you had been.

Now there are three classes, and the thing that makes them a choice is that specialising
costs defence. The class sets are weaker than the metal of their depth and they are the
only way to make one kind of weapon hit harder, so wearing one is a decision about how
you intend to fight.

| | weapons | set | set bonus |
|---|---|---|---|
| Melee | eight swords, plus four that only drop | Brigand (leather, chitin, iron) | melee +25% |
| Ranged | seven bows and three kinds of arrow | Bone (bone, leather) | arrows +25% |
| Magic | six gem staffs, plus the Imp Staff | Apprentice, then Adept | mana cost -20%, then magic +25% |

**Gems** are ores for every purpose that matters: they generate in the same banded blobs,
they take a pickaxe, and they are drawn the same way the ores are. Nothing smelts them -
a gem is used as it comes out of the rock - so the first thing a new gem is good for is a
staff, and finding a deeper gem is finding a better weapon. Amethyst from 40 tiles down,
then topaz, sapphire, emerald, ruby, and diamond below 640.

**A staff** spends mana instead of ammunition and throws a bolt that ignores gravity.
That is the whole trade against a bow: mana comes back by itself, so magic never runs out
and never fires as fast as you would like. **A bow** fires the best arrow in the backpack
rather than the one in the selected slot - Terraria's rule, and it spares the player a
second hotbar.

**Fallen stars** fall at night, land on the surface, and lie there glowing until somebody
picks one up. Five make a Mana Crystal, which is the only way maximum mana ever goes up,
so a clear night is worth looking up at. They only fall while the player is somewhere one
could be seen: a star falling into the cave you are standing in would be absurd.

**Items used rather than worn** go through one path, because the alternative is a branch
per item in the place handler. A use item does exactly one thing - raise maximum mana,
restore health, restore mana - and the test checks exactly that.

**Fourteen things only ever drop**, each from one species, so the roster of enemies is
also a map of what is worth hunting: the Eye of Night from demon eyes, the Jelly Amulet
from jellyfish, the Star Cloak from star jellies, the Talon Band from vultures, the Fang
Pendant and Shark Fang from sharks, the Bat's Wing from giant bats, the Obsidian Shield
from obsidian husks, the Stinger Brooch and Hornet Lance from hornets, the Imp Staff from
fire imps, the Stone Fist from rock golems, the Bone Flail from armoured skeletons, the
Demon Heart from demons, and the Talon Sling from harpies. The table that maps monster to
prize is derived from the items themselves rather than written out separately, so an item
cannot name a monster the monster does not know about - and the test checks every one of
them names a real enemy and is not also craftable.

Arrows and magic bolts are now drawn. They never were: the bow fired invisible arrows,
and the only way to tell you had hit something was that it died.

## The King Slime

Fathom had nothing to aim at. Every enemy in it moves toward the player and that is the
whole of its behaviour, which is fine for something you meet by accident and useless for
something you summon on purpose: a fight with one idea in it is over before it is a fight.

The King is summoned by a Slime Crown - forty gel and five gold bars, so you have had to
clear a lot of slime to afford one, which is the right way to be introduced to their king.
It cannot spawn: `summonOnly` is checked inside `matches()`, so no pool anywhere can
contain it, which is stronger and more honest than a layer filter that happens never to
match. The test proves it by asking for the pool in every combination of layer, biome,
wetness and hour the game can be in.

It hops like a slime and then breaks the three rules a slime obeys:

- **It teleports when you run.** Distance is not an answer, and it does not despawn when
  you walk away - it arrives instead.
- **It throws off minions.** Ignoring the room is not an answer either. Nothing ordinary
  spawns while a boss is alive, and the boss and its minions do not count against the
  ordinary cap: the fight is the fight.
- **It shrinks as it is hurt**, to just over half its size, getting faster and harder to
  land a hit on exactly as it becomes killable. The fight gets more dangerous as you win
  it. Shrinking is about the feet rather than the top-left corner, or the king rises off
  the floor every time it is hit.

Scale is one number rather than a second pair of dimensions, so collision, drawing and
the hit test all keep reading `width` and `height` and nothing else has to know a boss is
special.

It gives up both its prizes every time, not on a roll: a fight you had to prepare for
should not then also be a lottery. The **Royal Gel** stops slimes attacking you - except
the King, because a trinket that turns off the boss fight you paid for is not a reward -
and the **King's Crown** raises every kind of damage by 12%.

It is drawn as what it obviously is: the same gel, four times over, with a crown on top
and something unfortunate suspended inside. A boss that is visibly the thing you have been
stepping on all game is funnier and more alarming than a new monster would be.

The test is the fight rather than the table: it builds a flat arena, summons the King onto
it, and checks that a second one cannot be summoned, that nothing ordinary spawns beside
it, that it produces minions and stops at its own limit, that it never sinks through the
floor over twenty seconds of hopping, that walking 260 tiles away does not lose it, that
it shrinks in proportion and stays on the floor while shrinking, and that killing it ends
the fight.

## Ropes and the grappling hook

A cave was a series of one-way drops. You could always get down and often not back up, so
depth was a commitment rather than a place to move around in. Two things fix that, and
both are Terraria's.

**A rope** is not solid, holds nothing up, and blocks nothing. The whole of it is a
`climb` flag, which the physics reads rather than the tile's identity, so anything
climbable added later works the same way for free. On a rope gravity is simply off: the
jump key becomes up, down is down, and letting go of both holds you where you are. Step
sideways off the one-tile column and you fall, which is how you get off one. Climbing down
also passes through a platform, because a rope through a platform is the normal way to
build a shaft.

**The hook** is a head that flies until it bites and then reels you in. It lives on the
game rather than on the player, because it is a thing in the world with its own position
and the player is simply held by it. Jump lets go, which is why a hook can never trap you,
and the anchor being mined out from under you drops you too.

Gravity is off for a hooked player for the same reason it is off on a rope: the vertical
speed is decided elsewhere - by the pull, or by which key is down - and letting gravity
also have a say produces a fight between two rules. The hook is stepped **before** the
physics rather than after, or everything it does is a frame behind what the player sees.

Two hooks: iron (18 tiles, pull 16) and crystal (30 tiles, faster and harder). `range`,
`speed` and `pull` live on the item, so swapping hooks mid-swing simply changes the next
shot.

The physics test proves the contract rather than the implementation: two seconds of
climbing rises, a second of hanging does not slide, climbing down descends, stepping
sideways leaves the rope and falls, a hooked player does not accelerate downward over
three seconds, and letting go restores gravity rather than leaving the player floating.

## Sound

There are no audio assets for the same reason there are no image assets: everything is
made from a description, so a new sound is a few numbers rather than a file.

One idea, repeated. A sound is a list of **layers**, each either a tone - an oscillator
sweeping between two frequencies - or a hiss - filtered noise sweeping between two
cutoffs - with an attack-decay envelope. That is enough for a pickaxe, a bowstring, a
splash, a spell and a boss, because what distinguishes those is mostly which frequencies
move which way and how fast. Twenty-seven sounds, the longest 1.46 seconds.

Every sound is jittered in pitch per play. Without that, the same sound fifty times in a
row is a machine gun rather than a pickaxe. Digging has three sounds rather than one,
because the difference between a spade in soil and a pick on stone is most of what mining
sounds like.

**Ambience** is one bed per vertical layer, crossfaded as the player moves between them:
wind above ground, a hollow drone in the caves, a low roar in hell. The filter closes as
you go down, so depth is audible.

**Music** is a slow generative line over a held chord, pentatonic because a pentatonic
scale has no wrong notes in it - which is exactly what you want from music that will play
for hours and must never once sound like a mistake. Depth lowers the root and darkens the
scale, so the music says where you are without a word. It is scheduled from the game loop
one note at a time rather than from a timer, so it stops when the game stops and never
runs on in a background tab.

Keeping the description separate from the playing is what makes any of this testable:
there is no audio in Node at all. `node tools/audio-test.js` checks that no sound is
silent, deafening, clipping or ten seconds long; that the sound names game.js actually
plays - read out of game.js, not listed in the test - all exist; that every layer of the
world has an ambience bed; and that the music only ever picks notes inside its own scale
over six hundred steps of its own line.

That last check caught the real bug: the melody allowed an octave jump in both
directions on top of a ten-semitone scale, giving it a span of thirty-four semitones.
That is not a melody, it is an alarm. It only lifts now, never drops.

**N** mutes everything, **B** stops the music. Nothing is built until the first key or
click, because no browser will start an audio context before one.

## Events

**A blood moon** is a night that is worse. Which nights are blood moons is a hash of the
night's number, so the whole event costs one integer in the save, every player of a seed
meets the same nights, and nothing about it has to be written down. Roughly one night in
seven, and never the first two - a new character should get a little while to find a
shovel.

It is not merely a different roster. Three enemies exist only during it and are all
worse than what the night usually holds; the spawn interval drops to 45% and the cap
rises from six to nine. The moon itself is bigger and red and washes the whole sky,
because the event has to be visible from inside a house: an event you can only detect by
reading the spawn table is not an event.

The `event` filter sits in `matches()` beside the layer and biome filters, and it only
adds. The test checks exactly that: every enemy that spawns on an ordinary night still
spawns during a blood moon, every event enemy is impossible outside it, and the blood
moon pool is the ordinary pool plus its own and nothing else.

**A meteor** falls when the King dies, which is how the next tier of material arrives:
meteorite is in no band and is not generated with the world at all. The crater is written
into the world's edit diff exactly like anything the player built, so it survives a save
with no new machinery, and so it can be mined out and will stay mined out. Where it lands
is a pure function of which meteor it is - 180 to 520 tiles out, on whichever side the
hash picks - so the announcement can name a direction.

Meteor bars make a sword, a blaster and a suit. The Meteoric set bonus takes 40% off
every spell, and the blaster is deliberately fast and cheap rather than hard-hitting, so
wearing the set with it makes magic nearly free - which is Terraria's joke about the
Space Gun and worth keeping.

## Saying what things do

By this point the game had four armour sets whose entire purpose is one number, two dozen
accessories that each change one, three damage classes and two mana statistics - and none
of it was visible anywhere. A slot's tooltip was the browser's `title` attribute holding
the item's name, and the equipment panel reported defence, speed, mining and little else.
A stat the player cannot see is a stat that does not exist.

`craft.describe(key, tiles)` returns a name and a few lines for anything the player can
hold: the class, damage, swing time and reach of a weapon; the mana a staff costs; the
defence of a piece of armour and the bonus its full set grants; what an accessory does and
whether it can only be dropped; what a use item does; what a wall is for; what pickaxe
power a tile needs. It lives in craft.js rather than in the interface because what an item
does is a fact about the item - and because a function returning lines of text can be
tested and a panel of DOM cannot.

The test walks every tile, wall, item, weapon, armour piece, accessory and tool in the
game and requires each to produce at least one line, no line to contain `undefined`, `NaN`
or `[object Object]`, and the lines to actually carry the thing that matters for that kind.
Every drop-only item must admit that it only drops, which is the only hint the player ever
gets that it exists.

The tooltip itself is a floating panel rather than `title`, which waits a second, cannot be
styled and shows one line where most items now need four. The gear panel reports the three
damage classes, mana cost, mana regeneration, arrow speed, swing speed and pickup reach.

Icons too: twenty-five accessories were all the same grey square. Accessories are a tinted
pendant, staffs are a shaft with their own bolt colour on the end, use items are a flask,
and hooks are a barbed head on a chain.

## Can the ladder be climbed?

The crafting test proves the recipe graph is well formed. That is a different question
from whether it can be climbed, because mining is gated: a tile carries a `require` and
only a pickaxe of at least that power can break it. The failure that matters is circular -
a gem that needs a pickaxe that needs that gem - and it is invisible to a check that
begins by assuming every raw material is already in the bag, which is what the
reachability check in craft-test does.

`node tools/progress-test.js` walks the real ladder instead. Start with what a new
character is handed, then repeat: mine everything the best pickaxe held can break, craft
everything whose ingredients **and whose station** are both in hand, and see what that
makes possible next. Everything in a round is decided against a snapshot of what was held
when the round began - a single growing set collapses log to plank to door to house into
one pass, and the round number is only worth having because it is the depth of the
dependency.

Loot is deliberately left out of the starting pile. Chests hold pickaxes and swords, and a
ladder that begins by being handed one is not the ladder being tested: the question is
whether a player who makes their own equipment can climb it. A shortcut cannot be what
makes the route passable.

The ladder runs 13 rounds deep and ends holding the best pickaxe in the game: wood, then
benches and furniture, then the first staffs and the Apprentice set, then bars, then the
anvil, then fifty-eight things at once, then the deep gems and meteorite, then cobalt, then
emberite.

The first version of this test reported the entire game as unreachable and sent me off to
add a work bench recipe that was not missing. A station is a property of a tile, not a
key: every wood species already has its own, and `oakbench` is an Oak Work Bench providing
the station `workbench`. The test had compared a station's name against item keys. The
craft test caught the spurious recipe immediately, which is the argument for having both.

## Measuring the renderer

The renderer has nineteen passes and had never been measured. `renderer.setProfiling(true)`
times each one and `renderer.profile()` reports mean milliseconds per frame, worst first;
off, it costs one boolean test per pass. A renderer with nineteen passes needs a way to
answer "which one" that is not guesswork.

What it found, at 1600x900 and zoom 2:

- **Walls cost 5 to 7.5ms drawing cells that are then painted over.** A solid block covers
  its whole cell, and underground that is almost every cell on the screen. Skipping them
  took the pass under a millisecond.
- **The water pass created a gradient per column.** Over open ocean every column has the
  same surface as its neighbour, so neighbouring columns that agree are now filled as one
  shape - one gradient for the screen instead of fifty.
- **Every read of the world built a string key** (`cx + ':' + cy`) and hashed it, and the
  tile pass alone does about thirteen thousand reads a frame because each solid tile also
  asks about its eight neighbours for the edge mask. A one-entry memo in front of the
  chunk map turns almost all of them into two integer comparisons.
- `maskAt` was handed a freshly allocated closure per tile; the edge shades were
  re-assigned per rectangle, and assigning `fillStyle` makes the canvas parse the colour
  string. Both are now hoisted.

And what it found that is **not** worth acting on: the tile pass costs about the same
whether it draws 416 tiles or 5,858 of them - 14ms against 29ms for fourteen times the
count. The cost is pixel fill rate, not per-tile overhead, because headless Chromium has
no GPU and software-rasterises the whole 1.44-megapixel canvas. That is a property of the
measuring environment rather than of the game, and contorting the renderer around it
would be optimising for a browser nobody plays in. The measurements are kept here so the
next person does not repeat the investigation.
