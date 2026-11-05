# Fathom

A side-view mining sandbox with an endless world. Dig down through biomes, strata and caves,
light the dark with torches, and build with what you break.

Open `index.html`. Left click digs, right click places, `1`-`8` or the scroll wheel pick a
block, `A`/`D` or the arrow keys move, `W`/`Space` jumps, `[` and `]` zoom, `P` pauses.
`?seed=anything` loads a specific world; without one a seed is drawn once and kept.

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

Two real bugs came out of those tests rather than out of playing: biome height bias used to
step discretely, so a desert meeting a tundra made a 26-tile cliff; and a player embedded in
a tile had no way out, so spawning inside a tree trunk wedged you there permanently.

## Drawing

No image assets. Tile textures are baked procedurally into one atlas at load, four variants
each so large expanses do not visibly tile. Edges are shaded per tile from the eight-neighbour
mask, so a face open to the sky gets a lit rim and a buried tile gets none.

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
| `js/texture.js` | procedural tile atlas |
| `js/light.js` | coloured sun and emitter propagation, day cycle |
| `js/player.js` | movement, per-axis tile collision, unstick, reach |
| `js/render.js` | sky, parallax, walls, tiles, lighting, bloom, particles |
| `js/game.js` | loop, input, camera, mining, placing, save |
