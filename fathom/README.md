# Fathom

A side-view mining sandbox with an endless world. Dig down through biomes, strata and caves,
light the dark with torches, and build with what you break.

Open `index.html`. You pick a character, then a world, and the two are kept apart: a
character carries its inventory, equipment and stats into any world it enters, so the hole
you dug stays in the world you dug it in while the gold stays with you.

A world is a name and a seed. The seed can be words or a number — words are hashed and the
resolved number is shown, so `deepwood` always builds the same world and can be written down
or passed on. Leave it blank for a random one. There is no world size to choose and no evil
biome to pick: the world is endless, so size means nothing and both evils can simply exist
somewhere out along the axis.

`E` opens the backpack, which also lists every control. Left click digs a block, or the wall
behind it if the tile is empty; right click places whatever the selected hotbar slot holds,
uses what it is pointed at, or drinks what you are holding. `1`-`0` or the scroll wheel pick
a slot, `A`/`D` or the arrow keys move, `W`/`Space` jumps and climbs, `G` fires the
grappling hook, `M` opens the map, `H` asks whether the room you are standing in counts as a
house, `N` and `B` turn off the sound and the music, `[` and `]` zoom, `P` pauses.

In the backpack, left click picks up a stack and drops it, right click takes half or places
one at a time, and shift-click sends a stack between the hotbar and the backpack. Equipment
slots only accept equipment. Mined blocks fall as items and fly to you, so a full backpack
leaves them on the ground rather than deleting them.

Health and mana sit top right as hearts and stars, each worth 20. Both regenerate faster the
longer you go without being hit, and faster again standing still.

## Endless, and why that shapes everything

The world is unbounded along x and 1,056 tiles deep. Nothing is generated ahead of time:
chunks of 48×48 tiles are produced on demand and dropped when you walk away. What you change
is kept as a diff against generation, so a save is the seed plus the tiles you actually
edited rather than the world.

That only works if generation is **positional** — every function is pure in the absolute
world coordinate, never in which chunk asked. A column's terrain depends on its own x; a
tile depends on its own (x, y). Chunks then agree at their seams by construction instead of
by correction.

The exception is structures, which is where this architecture usually breaks: a tree rooted
in one chunk has to appear in its neighbour. Chunks therefore stamp every structure whose
origin lies within `STRUCTURE_MARGIN` columns of their edge, not just their own.

## What is checked

`node tools/all.js` runs every suite and prints a summary table; `--quiet` prints only
the summary and, for anything that failed, its failures. Twenty-one files is past the
point where running them by hand is reasonable, and a suite nobody runs protects nothing.

`node tools/worldgen-test.js` builds a region as one piece, then builds the same region by
stitching independently generated chunks, and requires the two to be byte-identical. That is
the seam oracle, and it runs over 55,296 tiles. It also asserts chunks are pure functions of
their coordinates, that generation order cannot matter, that two seeds differ, that every ore
lies inside its declared depth band, and that the surface never steps by more than a couple
of tiles between adjacent columns.

`node tools/physics-test.js` runs 24,000 simulated steps of random input across six columns
in different biomes and requires that **no step ends with the player inside a solid tile**,
that a sealed box holds, that terminal velocity is enforced, and that reach is clamped.

`node tools/autotile-test.js` exercises all 256 neighbour masks.

`node tools/boot-test.js` loads the game the way a browser does: it reads the script list
out of `index.html`, concatenates those files in that order into one program — which is
what sharing one global scope amounts to — and runs it against a stubbed browser. It
catches the two classes of bug that every other suite here is structurally blind to,
because every other suite `require`s its modules and so gives each one its own scope: a
module naming a `const` from a module listed after it, and two modules declaring the same
global name. Both have happened, more than once.

`node tools/sprite-test.js` draws every body plan into a recording context and requires
that each produces different frames at different animation phases. A sprite that ignores
its phase looks perfect in a screenshot and is a still photograph in motion.

`node tools/craft-test.js` walks the whole crafting graph and, now, the three classes:
every weapon belongs to one, every class has a set and accessories that really arrive
through `equipEffects`, three pieces of a set is not a set, and everything that only
drops names a real enemy and is not also craftable.

`node tools/feature-test.js` checks that life crystals and pots generate in sane numbers
in sane places, that what a pot holds is a function of where it is, and that weather
arrives as fronts rather than flickering between wet and dry.

Two real bugs came out of those tests rather than out of playing: biome height bias used to
step discretely, so a desert meeting a tundra made a 26-tile cliff; and a player embedded in
a tile had no way out, so spawning inside a tree trunk wedged you there permanently.

## Drawing

No image assets. Tile textures are baked procedurally into one atlas at load, twelve variants
each - four noise patterns crossed with three brightness bands - so large expanses do not
visibly tile. The band is chosen by a two-scale coherent hash of the tile's position rather
than per tile, so ground varies in patches as well as per block instead of reading as a
checkerboard. Each solid variant carries a baked bevel, lit along its top and left edges and
darkened along its bottom and right, which is what makes one block distinguishable from the
next in a wall of the same material. On top of that every material is drawn differently:
soil gets pebbles and root flecks, rock gets bedding planes and the occasional crack, sand
gets ripples, ice gets facets. Edges are shaded per tile from the eight-neighbour mask, so a
face open to the sky gets a lit rim and a buried tile gets none.

The sky is a five-stop gradient with a haze band on the horizon whose strength follows the
sun's elevation, and three bands of drifting cloud at different depths, so the sky moves
with the camera at a fraction of its speed instead of being a still photograph.

Light is coloured and runs over the visible window with a margin: sunlight falls per column
and dims through whatever it passes, so a cave mouth throws a shaft rather than a hard edge,
and torches, lanterns, glowmoss, glowcaps and crystals each flood in their own colour. It is
computed per tile, written into a canvas one pixel per tile, then drawn over the world scaled
up with smoothing and a multiply blend — which turns blocky values into soft gradients for
the cost of one small canvas.

## Layout

| file | what it does |
|---|---|
| `js/rng.js` | position-addressable hashing, no call-order dependence |
| `js/noise.js` | value noise, fBm, ridged and domain-warped variants |
| `js/tiles.js` | the tile registry: solidity, opacity, emission, hardness, colour |
| `js/worldgen.js` | biomes, surface, strata, caves, ores, trees, chunk assembly |
| `js/chunks.js` | the live world: generated chunks plus the player's edit diff |
| `js/autotile.js` | eight-neighbour masks to edges and inner corners |
| `js/texture.js` | procedural tile atlas, twelve variants of every tile |
| `js/light.js` | coloured sun and emitter propagation, day cycle |
| `js/mining.js` | Pickaxe power, per-tile toughness, the tier gate |
| `js/craft.js` | Recipes, items, weapons, armour, accessories, and how effects combine |
| `js/liquid.js` | Flowing water: levels, the active set, the budget |
| `js/loot.js` | Chest tables, rolled from position rather than stored |
| `js/minimap.js` | The map, and what the player has revealed of it |
| `js/housing.js` | Room detection and what makes a room a home |
| `js/villager.js` | Who moves in, when, and what they sell |
| `js/enemy.js` | 45 enemies including two bosses, eight behaviours, spawn pools per biome, layer and event |
| `js/registry.js` | The one object every module registers its exports on |
| `js/player.js` | movement, per-axis tile collision, unstick, reach |
| `js/sprite.js` | 22 body plans covering every creature, and the poses they are drawn in |
| `js/render.js` | sky, weather, parallax, walls, tiles, water, lighting, bloom, particles |
| `js/profile.js` | characters and worlds, kept apart, and seed parsing |
| `js/menu.js` | title, character select and creation, world select and creation |
| `js/inventory.js` | slots, stacking, splitting, equipment restrictions |
| `js/stats.js` | health, mana, regeneration, death and respawn |
| `js/ui.js` | hearts and stars, hotbar, backpack and equipment screen |
| `js/buffs.js` | effects that expire: potions, and what a campfire does |
| `js/audio.js` | every sound in the game, the ambience beds and the music |
| `js/game.js` | loop, input, camera, mining, placing, drops, events, save |
