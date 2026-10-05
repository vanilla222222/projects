# Part 4: Pre-balance world slices

These six slices run in order, before the balance cleanup:
1. World gen configs (4.1)
2. Ocean update 2 (4.2)
3. Mountains revamp (4.3)
4. Temperate revamp (4.4)
5. Desert revamp (4.5)
6. Tundra revamp (4.6)

Each revamp follows the same pattern as the ocean update:
- new sub-biomes;
- a plant revamp for that zone;
- a vertical or terrain mechanic;
- new animal archetypes that fit.

## Gates for every slice

- Seeds 42, 7 and 123, run for 3000 ticks:
  - all six classes are alive;
  - all five bird niches are alive;
  - the new archetypes from the slice are alive on at least two seeds.
- ms/tick stays within 5% of the base.
- Save at tick 1500, load, then step 500: the state is identical. Old saves load.
- Gens 2–4 stay reproducible. New biomes come in a new gen, which becomes the default.
- Every grid the renderer reads is in `SNAP_GRIDS` or `SNAP_STATIC`.
- Plant and soil changes are mirrored in `js/gpu/`.
- The browser smoke test shows no console errors.

## 4.1 World gen configs (in progress)

- **New World modal:**
  - seed;
  - size, from small to titanic;
  - continentality;
  - humidity;
  - roughness;
  - temperature;
  - rivers and lakes;
  - starting life;
  - species diversity;
  - season strength.
- With every setting at its default, a seed builds the same world as before.

## 4.2 Ocean update 2

- **New biomes:**
  - **Trench:** the deepest band. It is cold and dark, with low food and marine snow.
  - **Hydrothermal vents:** hot spots on the deep floor that grow chemosynthetic food with no light.
  - **Cold seep:** methane seeps on the slope that support slow, steady chemosynthetic mats.
- **Ocean plants get the land plant revamp:**
  - floor and surface layers replace canopy and understory in water;
  - the floor layer holds kelp, seagrass and coral algae;
  - the surface layer holds phytoplankton, sargassum and floating mats.
- **Water depth layers:** sea animals get a depth level, the same way birds have flight levels.
  - The levels are surface, mid and floor.
  - Animals can only eat, fight and breed with animals at the same or an adjacent level.
  - Light and temperature fall with depth.
  - Diving costs energy.
- **New fish types:**
  - anglerfish (trench ambush);
  - vent shrimp, which are invertebrates;
  - schooling sardines (surface);
  - flatfish (floor);
  - deep-sea eels.

## 4.3 Mountains revamp

- **New and reworked biomes:**
  - **Scree slope:** loose rock with sparse cushion plants.
  - **Montane forest band:** forest at mid elevation that thins with height.
  - **Krummholz:** stunted trees at the treeline.
  - **High plateau:** flat, cold and windy.
  - **Alpine lake / tarn.**
  - **Cave mouths:** shelter with no plant growth.
- **Elevation bands:** the existing Mountains, Alpine, Alpine Meadow and Cliff biomes are reworked into a clear lapse rate, about −6°C per 1000 m. A treeline depends on temperature and latitude.
- **Terrain mechanic:**
  - Slope affects movement cost. Climbers ignore this; everything else pays.
  - Altitude sickness: low oxygen costs energy unless an animal has a high lung capacity, which comes from a new or existing gene.
  - Avalanches are a natural disaster in snow areas after heavy snowfall, and reuse the windthrow and flood code.
  - Rain shadow: the leeward side of ranges is drier. This links to world gen.
- **Plants:**
  - cushion plants;
  - lichens;
  - edelweiss-style alpine flowers;
  - dwarf conifers.
  - Strong UV makes plants invest more in protective toxins.
- **Animals:**
  - mountain goat / ibex (climber grazer);
  - snow leopard (ambush on slopes);
  - pika and marmot (burrowing hibernators);
  - condor and eagle (soaring raptors that use updrafts);
  - alpine salamander.

## 4.4 Temperate revamp

- **New and reworked biomes:**
  - **Deciduous forest:** leaves drop seasonally.
  - **Mixed forest.**
  - **Temperate rainforest** (coastal).
  - **Meadow.**
  - **Heathland.**
  - **Hedgerow and forest edge:** an edge habitat with high diversity.
- **Seasonal mechanic:**
  - **Leaf fall:** deciduous plants lose canopy in autumn. This gives the understory a spring light window, and there are spring ephemeral flowers.
  - **Leaf litter:** it builds up on the floor and feeds the soil, decomposers and invertebrates.
  - **Mast years:** oak and beech trees fruit in big synchronised bursts every few years, which drives rodent booms and then predator booms.
  - **Phenology:** flowering, breeding and migration are cued by day length.
- **Plants:**
  - oak, beech, maple (deciduous) and pine (evergreen) types;
  - bramble and berry shrubs;
  - ferns;
  - bluebell-style ephemerals.
- **Animals:**
  - deer (browser);
  - wild boar (rooting omnivore that disturbs the soil);
  - fox;
  - badger (den builder);
  - squirrel (caches nuts and plants trees);
  - woodpecker;
  - owl (night raptor);
  - frog and newt (breed in ponds).

## 4.5 Desert revamp

- **New and reworked biomes:**
  - **Rocky / hamada desert.**
  - **Sand sea:** shifting dunes.
  - **Cactus scrub.**
  - **Wadi / dry riverbed:** it floods briefly after rain.
  - **Mesa and canyon.**
  - **Coastal fog desert.**
- **Climate mechanic:**
  - **Day and night extremes:** a big temperature swing using the day/night system. Animals with the activity gene are favoured toward night activity.
  - **Flash floods and wadis:** rare heavy rain fills wadis for a short time.
  - **Superbloom:** dormant seed banks germinate all at once after rain.
  - **Moving dunes:** dune tiles migrate slowly downwind and bury plants.
- **Plants:**
  - succulents and cacti (CAM: they store water and close their stomata by day);
  - deep-rooted mesquite (uses the existing deep-root trait);
  - ephemeral annuals with long-lived seed banks;
  - spiny defences.
- **Animals:**
  - camel (stores water and fat);
  - fennec fox (night hunter, big ears for heat loss);
  - jerboa and kangaroo rat (no drinking, water from food);
  - rattlesnake and sidewinder (reptiles, heat sensing);
  - scorpion (invertebrate, toxin user);
  - roadrunner;
  - vulture (scavenger niche).
  - A water-economy gene trades lower water need for slower growth.

## 4.6 Tundra revamp

- **New and reworked biomes:**
  - **Arctic tundra** (rework).
  - **Polar desert.**
  - **Permafrost bog** (Tundra Bog rework).
  - **Pingo / frost-heave hills.**
  - **Ice sheet edge.**
  - **Sea-ice coast:** a seasonal ice shelf that land animals can walk on.
- **Climate mechanic:**
  - **Permafrost layer:** the soil only thaws to a shallow active layer in summer, which limits root depth. Warming can thaw it and release nutrients and methane.
  - **Polar day and night:** long summer days and long winter nights at high latitude, with a very short growing season.
  - **Snow cover:** it insulates small animals living under the snow and hides plants from grazers.
  - **Seasonal sea ice:** it forms in winter and opens up land bridges. This links to Frozen Ocean.
- **Plants:**
  - mosses;
  - lichens, which reindeer eat in winter;
  - dwarf willow and birch;
  - cotton grass;
  - Arctic poppy, which tracks the sun for warmth.
- **Animals:**
  - caribou / reindeer (long-distance migration herds);
  - musk ox (huddling defence);
  - Arctic fox and Arctic hare (seasonal coat colour change linked to camouflage);
  - lemming (boom-and-bust cycles);
  - snowy owl;
  - polar bear (hunts on sea ice);
  - ptarmigan.
  - Insulation and fat genes are used heavily.

## Order and dependencies

- 4.1 lands first, because the revamps add their new biomes as world gen options. The temperature, humidity and roughness settings then drive how much of each zone appears.
- 4.2 introduces the depth-layer framework. 4.3 reuses its layer idea for elevation bands, and 4.5 and 4.6 reuse the soil-layer idea: permafrost, and seed banks.
- The balance cleanup runs after 4.6, because the new archetypes will shift every food web.
