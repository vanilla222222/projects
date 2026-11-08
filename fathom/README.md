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

On touchscreens, hold the movement and jump buttons and tap the world to aim. The Dig / attack button switches to Place / use, and the hotbar is tappable. Bag, Map, zoom, pause, housing inspection and Hook have dedicated buttons.

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

WebGL2 batches the walls, terrain atlas, liquid tile fills and tile edges into one GPU draw per frame. The rest of the scene is still composed on Canvas2D. If WebGL2 is unavailable or loses its context, terrain falls back to Canvas2D. The renderer reuses visible tile samples and light buffers while they remain valid, and the game limits backing resolution on high-DPI screens.

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
| `js/underworld.js` | Underworld terrain, biomes, structures and chest generation |
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
| `js/settlement.js` | Regional roles, charters, collections, trade and expedition records |
| `js/enemy.js` | 240 enemies including thirty-seven bosses, spawn pools per biome, layer and event |
| `js/registry.js` | The one object every module registers its exports on |
| `js/player.js` | movement, per-axis tile collision, unstick, reach |
| `js/sprite.js` | 22 body plans covering every creature, and the poses they are drawn in |
| `js/webgl.js` | WebGL2 terrain batching and context-loss fallback |
| `js/touch.js` | multitouch controls and cancellation |
| `js/render.js` | sky, weather, parallax, walls, tiles, water, lighting, bloom, particles |
| `js/profile.js` | characters and worlds, kept apart, and seed parsing |
| `js/menu.js` | title, character select and creation, world select and creation |
| `js/inventory.js` | slots, stacking, splitting, equipment restrictions |
| `js/stats.js` | health, mana, regeneration, death and respawn |
| `js/ui.js` | hearts and stars, hotbar, backpack and equipment screen |
| `js/fishing.js` | rods, what is in the water, and how much water a place has |
| `js/buffs.js` | effects that expire: potions, and what a campfire does |
| `js/audio.js` | every sound in the game, the ambience beds and the music |
| `js/wiring.js` | Circuit propagation, timers, pump transfers and wire persistence |
| `js/game.js` | loop, input, camera, mining, placing, drops, events, save |

### Enemy loot and banners

Every creature has a drop. Rotten Flesh can fuel torches, Shadow Scales make
lanterns, and Wildlife Traces can furnish a terrarium. Check the Bestiary to
see loot after defeating a species.

Claim a species banner in the Bestiary after 50 defeats, one boss win, or
25 catches for passive wildlife. Hang it from a background wall or ceiling.
While within 24 tiles, you deal 15% more damage to that species. Matching
banners share one bonus, and expeditions use their normal difficulty.

### Campaign

Open **Campaign** from Town Hall or the Field Journal. Thirteen acts guide
you from building a forge to defeating the Astral Regent and smelting
Astral metal. The campaign recognizes prior world progress and gives each
act a one-time reward. **Boss Side Quests** lists optional bosses, their
unlock requirements, and summon recipes.

### Chapter 2 · The Scattered Gate

Finish Chapter 1, then select **Begin Chapter 2** in the Campaign. Ten trial
structures awaken. The journal lists their coordinates and guardians.
Search three in Space, three in Hell, three in the Void, and one in the Sky.

Challenge each miniboss at its Trial Seal and return to the seal to claim
its component. Nine structures give distinct fragments. Windlock Citadel
holds the Portal Activator. Keep all ten components for the first subworld.

### The Underworld

Carry all nine fragments and the activator. Use the Portal Activator on a dry,
clear tile with solid ground beneath it. Interact with the gate to descend.
The Return Gate is at the landing camp. Inventory travels with you, while
building edits, containers, towns, and exploration are saved separately.

Explore Ashwood Wilds, Glass Dunes, Brine Depths, Emberbloom Canopy, and
Gloomfrost Expanse. Each region has local resources, wildlife, fish, a surface
refuge, cave strongholds, and deep ruins. Cave and deep seals summon local
guardians. Use relics and local ore to make class weapons.

#### Chapter 2 campaign

Open **Boss campaign** in the Underworld journal for arena coordinates and the
next encounter. The route has 15 bosses across five legs, each with two biome
arenas and a border fortress. Forge the reusable summon for each fight at an
Iron Anvil from local bars and relics. Use it inside the named arena and
interact with the altar afterward to collect the trophy. Each win unlocks the
next boss. Each leg’s three trophies can be forged into a class accessory.
The Crown Below is the final fight.

#### Optional dungeons and waystones

The Underworld journal lists five optional dungeons. Read each entrance
inscription, descend the rope shaft, and solve the three-conduit lock to open
the boss chamber. Each dungeon has a supply cache and a craftable, reusable
boss summon. The five bosses have their own attack patterns and drop trophies
that forge into exploration accessories. Collect the trophy at the altar to
connect the dungeon’s waystone to the Return Gate camp and other cleared dungeons.

#### Settlements and trade

Open the Town Directory from Town Hall or a pylon to see charters in your
current realm. Chartered towns can commission civic projects with local
supplies and nearby workstations. Rank-3 districts with four occupied homes,
both projects, and a reciprocal trade route can become Civic Centers. Their
public storehouse supplies one ration per in-game day.

Deliver cargo to establish a partnership. Three deliveries with cargo sent
both ways unlock partner imports. Six deliveries unlock better stock and
prices. Each realm keeps its own town directory, shipments, and trade ranks.

#### Emberbloom Forge Town

Defeat Furnace Mycelium in the Spore Crucible and rescue Kera. House her
near an Emberbloom charter and commission the Banked Kiln to get an Ember
Forge. A shipment from Brine Depths supplies Brine Cooling Salt, which the
forge uses for five class weapons. An established route can import more
salt and unlock stock from both towns.

#### The Molten Exchange

Staff the Emberbloom forge with Kera and Tidekeeper’s Landing with Marra,
then reach rank 2 on their shared trade route. Commission the Exchange at
Kera’s charter. Divert the molten crossing, prime the pump with cooling salt
and bars, and descend into the Keeper’s chamber. Open both valves within nine
seconds to expose its core. The Keeper alternates low and high steam bursts
once hurt.

Install the recovered core with Kera to unlock the Exchange Quench Bench,
which upgrades all five forge weapons. Marra’s counter trades scrip for
Emberbloom Crates and upgrades the Kilnline Rod into a Quenchline Rod.

#### Tidekeeper’s Landing

Defeat the Undertow Warden in the Sunken Sluice and open Marra’s cell.
Build her a furnished home and charter a surface settlement in Brine Depths.
With Marra and two occupied homes near the charter, the Tide Market opens.
Its rotating daily contracts pay scrip for potions, stews, and Saltlight Crates.

Accept Marra’s Lowwater Survey at the market. The hatch opens for one quarter
of each in-game day and the emergency ladder works at every tide. Return the
survey ledger to Marra’s market for the Tideglass Rod.

#### Underworld fishing

Each biome has a surface fish, a cave fish, and a local crate. Bigger pools
can yield crates containing ore, relics, or rare accessories. Emberbloom
catches require a lava-rated rod. Craft the Saltroot Rod for water or upgrade
a Hellfire Rod into the Kilnline Rod for lava. Cook the ten local fish into
stews at a Cauldron.

### Field enemies

Each Overworld surface biome (including the Hallow) and each other vertical
layer has a set of three field enemies. Every Underworld biome has its own
set at the surface, in caves, and in deep caverns. Chargers telegraph a
lunge, ranged hunters mark their shot, and boss-gated plated enemies cycle
between a shield and an opening. Deeper hunters can fire a spread. All
114 enemies have banners and drop materials used by existing recipes.

### Progression

Start with tin tools and work through copper, iron, silver, gold, cobalt, and emberite.
Silver opens gold, and gold opens cobalt and obsidian. An Obsidian Charm makes the first
trips into Hell safer. Cobalt opens emberite, which smelts with obsidian.

King Slime opens the meteor gear side path. The Hollow Eye can be summoned at night.
Craft a Cinder Idol at an anvil and use it in Hell to challenge the Furnace Warden.
Its Furnace Cores can become a long-reach lance, a magic scepter, or a defensive heart.

### Towns and storage

Press H in a furnished room to inspect it and invite or relocate a resident. Two
distinct occupied rooms within 45 tiles power a Town Pylon. Put another pylon at
least 90 tiles away, power both, and right-click either one to travel. Shops offer
discounts in populated districts.

The Storage Keeper arrives after 15 smelted bars. Buy or craft a Storage Heart and
place storage units within 24 tiles of a heart. Each standard unit adds 40 stacks.
Reinforced units add 80. Right-click a heart or terminal to search, deposit, or
withdraw from the shared stock for that world. A Storage Crafting Terminal uses
stored ingredients and crafting stations near the terminal. Withdraw items before
removing a heart or unit if doing so would leave too little capacity.

### Tinker’s Workshop

At a Work Bench, craft the Tinker’s Workshop from 14 wood, 6 iron bars and
4 glass. Place it and open crafting nearby. Put the two ingredients in your
backpack or hotbar before combining them. The result carries both sets of
effects in one accessory slot, and equipped accessories are left alone.

Start with combinations such as Swift Boots and a Cloud Charm for Cloudstep
Boots. The Workshop also combines class accessories and four tiers of utility
gear: Trail, Gold, Ember, and Eventide. Retired tiers remain usable in saves.

### Boss encounters

Bosses with shared movement have their own named attack sequences. Orange
lines telegraph where the attacks will travel. At half health the boss leads
with a different attack and follows with a second volley. Afterward it briefly
takes extra damage. Encounters with dedicated mechanics, such as the siege,
the floodgate, and the dungeon side bosses, use their own tells.

The Ossuary Keeper blocks attacks from the side its shield faces. The
Ashvault Guardian ignites delayed vents that keep burning. Destroy the
Granite Colossus’s keystones to shatter its armor. Jump Rimehorn’s charge
and stay outside the Void Sovereign’s gravity well. Use terrain to block
Sunmane’s glare. The Windmill Warden’s blades leave a safe gap near the hub.
Spot the true Mirage Regent by its halo, and watch for foam when the Reef
Leviathan prepares to breach through water.

### Signature attacks

Each class has five starter weapons without an attack rhythm. Later weapons
cycle through their own three impact effects, listed in the tooltip. A burst
or fan can trigger its effect once per attack. Look for the coloured accent
on the projectile and the burst of matching particles when it connects.

Weapon tooltips also describe special attacks. The Furnace Lance thrusts through
a narrow line, the Ashblade wards its wielder during a swing, and the Shatter
Maul sends a shockwave along the aim. The Tin Hand Cannon banks off terrain,
while the Copper Pepperbox fires a timed three-round burst for one bullet.

Diamond Staff bolts curve toward visible enemies. The Ward Scepter plants a
proximity rune, and the Mythril Charge flashes before it explodes. Emberite
and Solarium flasks can bank off walls. With a Spirit Focus held, click an
enemy to prioritize it for the next three seconds.

### Thrower

Craft an Oak Boomerang at a Work Bench to start. Thrower weapons are reusable
and use neither ammunition nor mana. Boomerangs and discs can strike on the
return, knives fan out, javelins pierce, and flasks blast nearby enemies
without destroying blocks. Upgrade through Astral materials and equip
throwing accessories to boost damage.

### Ranger arsenal

Bows fire quickly, crossbows fire slower piercing bolts with less drop, and
guns fire flat shots. Scatterguns spend one bullet per five-pellet shot.
The first compatible stack in the four ammo slots takes priority. With no
matching stack there, weapons use the highest-damage match in the backpack.
Barbed Arrows and Punch Bullets knock enemies back. Bodkin Bolts penetrate
up to four targets, and Ember Arrows singe nearby enemies.

### Town dailies and combat

Open the Quest Board at an active charter pylon to accept that town’s daily.
Supply requests and field jobs rotate at dawn. The standard day and night
cycle takes 24 minutes, with 12- and 48-minute world settings also available.

Craft a Twig Spirit Focus at a Work Bench and click to call your spirit.
It attacks nearby enemies it can see while you hold the focus. Upgrade through
metal and Astral focuses for twin strikes, wards, chains, and bursts.

### A Road Through the Deepwood

Open the questline from Town Hall, the Field Journal, or the Guide and Builder
shops. House two residents in the Deepwood to earn the first pylon. Found a
Ranger Outpost, then follow the quest to restore the Ranger Camp’s lantern and
timber supply counter. The restoration qualifies the outpost for a charter.
Charter a second town in a different region and deliver a shipment from the
original pylon to complete the trade road.

### Regional settlements

Use a Town Pylon with two valid occupied homes nearby to found an outpost.
The pylon's biome or depth determines its specialty and supply counter.
Outposts in different regions ask you to patrol, survey ruins, restore a
landmark light, fish, or catch local wildlife. Press J for the Field Journal,
or open it from Town Hall on touch devices. Landmark surveys and repairs are
performed from the journal while standing inside the structure.

Finish the local assignment to charter the outpost and earn a pylon for the
next town. Three homes and a specialty station close to the pylon qualify it
for a district workshop. Active charters in distinct regions unlock cheaper
regional supplies, shared storage equipment and shipments. Pack a shipment at
one charter and deliver it to the named partner pylon. The sender can unpack
it to recover the materials if the route changes. Founded towns appear on
the map, with green markers for chartered towns.

The Field Journal tracks distinct fish, netted critters, terrarium exhibits,
cooked dishes, crafted mechanisms, and surveyed landmarks. Claim milestone rewards beside an active charter pylon.

### Astral expeditions

Defeat the Astral Regent, then open the Field Journal on the middle Astral
Siege platform. Three repeatable runs pair three bosses each with timed
challenges, lightning, reinforced bosses, or the Regent's bombardment.
One, two, or three distinct charter regions unlock the three runs, and more
active regions improve the payout. Death, timeout, or leaving the arena ends
the run. The journal keeps best times and banks rewards for collection at
an active charter pylon.

### Ashvaults and the Void

Cave galleries swell into chambers and shafts connect more of the deeper galleries.
At altitude 2,170 below sea level, the Trench begins. Ashvaults recur across the Trench
at 2,520 below sea level. Forge a reusable Ashvault Key from a Furnace Core, then use
a Guardian Effigy in the main hall. The Guardian Seal opens the inner reliquary.
Bring relics back to the Relic Appraiser or craft an Ashblade, Vault Bow, or Relic Staff.

Below 2,850, the Void replaces the Trench with connected caverns and shafts. Mine Void
Crystals with an Emberite Pickaxe and combine them with a Guardian Seal to summon
the Void Sovereign. Its heart can be forged into the Sovereign Mantle.


### The Rift and Aetherite

Summon the Mire Broodmother in the Caves or the Granite Colossus in the Deep
Caverns for optional accessories. Underground cisterns and reliquaries hold
supplies for deeper exploration.

Use one of the Void Sovereign's hearts to craft a Rift Sigil and summon the Rift
Archon in the Void. Forge its Rift Core into a Rift Pickaxe, then look in the
underside of sky islands for Aetherite. An Aether Sabre and Aetherstep accessory
can be crafted from the smelted ore.


### Forest expansion

The Forest has four surface enemies, three cave enemies, and three deep enemies.
Look for a Ranger Camp on the surface, a Moss Shrine underground, and a Heartwood
Vault in the deep Forest. Some vault chests are Heartwood Mimics that wake when
opened or struck.

The Briar Warden and Root Crown are optional summons. Use a Briar Idol on the
Forest surface or a Root Crown Idol in its deep caverns. Each drops a material for
its own accessory. The Mimic Clasp uses teeth from a Heartwood Mimic.


### Desert expansion

Find the Caravan Rest on the surface, the Buried Cistern in the caves, and the
Amber Tomb in the deep Desert. Some tomb chests awaken as Dune Mimics.

Use a Storm Feather on the Desert surface to summon Thunderbird or a Desert
Medallion in the Underground Desert to summon the burrowing Desert Scourge.
Both are optional and reward materials for their own accessories.


### Tundra expansion

The Snowbound Lodge sits on the surface, the Rime Observatory lights the caves,
and the Glacier Crypt guards its deep cache with ice spikes. Some crypt chests
wake as Rime Mimics.

Use a Rime Horn on the Tundra surface to summon Rimehorn. Use an Aurora Lantern
in the deep Tundra to summon the Aurora Wraith. Both fights are optional.


### Jungle expansion

Find Canopy Outposts on the surface, Vinewell Shrines in the caves, and trapped
Amberroot Temples in the deep Jungle. Some temple chests are Vinebound Mimics.

Use an Orchid Lure on the surface or an Amberroot Idol in the deep Jungle to
summon the Orchid Queen or Amberroot Strangler. Both bosses are optional.


### Mire expansion

Find Reedwalk Posts on the surface, Drowned Pumpworks underground, and the
Blackfen Ossuary in the deep Mire. Some ossuary chests awaken as Siltbound Mimics.

Use a Reed Sigil on the surface or a Blackfen Spool in the deep Mire to summon
the Reed King or Blackfen Widow. Both are optional.


### Highlands expansion

Crag Watch is on the surface, Echo Quarry is in the caves, and Granite
Sepulcher guards its deep cache with floor traps. Some caches awaken as Cairn Mimics.

Use a Crag Totem on the surface or a Cairn Bell in the deep Highlands to summon
Cragbreaker or Cairnshade. Both fights are optional.


### Badlands expansion

Find Claybreak Camp on the surface, Redstone Kiln underground, and Ochre
Catacomb in the deep Badlands. Some catacomb chests wake as Ochre Mimics.

Use a Clay Effigy on the surface or an Ochre Sigil in the deep Badlands to
summon Clay Behemoth or Ochre Drake. Both are optional.


### Savanna expansion

Find Acacia Waystations on the surface, Termite Galleries in the caves, and
the trapped Sunken Sun Court in the deep Savanna. Some court chests are Gilt Mimics.

Use a Sunmane Idol on the surface or a Sun Court Seal in the deep Savanna to
summon Sunmane or the Sun Court Scarab. Both bosses are optional.


### Taiga expansion

Find Pinewatch Huts on the surface, Resinworks in the caves, and Winterroot
Barrows in the deep Taiga. Some barrow chests awaken as Pitchlock Mimics.

Use a Pine Totem on the surface or a Winterroot Bell in the deep Taiga to
summon Pinemaw or the Winterroot Keeper. Both bosses are optional.


### Plains expansion

Find Windmill Crossing on the surface, Chalk Cellar in the caves, and a trapped
Buried Standard ruin deep below. Some deep ruin chests awaken as Chalklock Mimics.

Use a Windmill Token on the surface or a Standard Pennant in the deep Plains
to summon the Windmill Warden or the Buried Standard. Both bosses are optional.


### Blight, Crimson, and Ocean expansions

Each biome adds ten regular enemies, a chest mimic, and a structure in each of
three depth bands. Blight has Spore Crown and Hollowroot, Crimson has Bloodcrest
and Vein Warden, and Ocean has Reef Leviathan and Abyssal Eye. All six encounters
are optional. Their summon recipes and locations appear in the Progression Journal.


### Shore expansion

Find Driftwood Jetties, Saltwater Storehouses, and Saltmarrow Catacombs across
three depths. Some catacomb chests are Driftlock Mimics. Use a Breakwater Shell
on the Shore surface or a Saltmarrow Token in the deep Shore to summon the
optional Breakwater Crab or Saltmarrow.


### Hardmode

Defeat the Rift Archon, then craft a Prism Sigil and summon the Prism Sentinel
in the sky. Its defeat activates Hardmode for that world. The Hallow and new
veins appear in previously unexplored, unedited chunks. The Progression Journal
shows ore depths and can point to nearby Hallow surface.

Mine Palladium with Aetherite, Mythril with Palladium, and Adamantite with
Mythril. All three metals have armor, pickaxes, axes, hammers, swords, bows,
rifles, arrows, and bullets. Hallow crystals make a piercing lance, a chain
lightning conduit, a ward scepter, and the Prismweave mage set.

The equipment panel has four ammo slots and five coin slots. Copper, silver,
gold, platinum, and onyx convert at 100 to one. Shops and contracts use copper
value, and existing coin stacks retain their value.
