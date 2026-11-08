'use strict';
// Infinite-in-x world generation. Every function here is pure in the absolute world
// coordinate: a column's terrain depends on its own x and nothing else, and a tile depends
// on its own (x, y). Chunks therefore agree at their seams by construction rather than by
// correction. Structures are stamped from a margin scan so a tree rooted in one chunk still
// appears in its neighbour; STRUCTURE_MARGIN must exceed the widest structure's half-width.

const CHUNK = 48;
const SKY_H = 192;
const STRUCTURE_MARGIN = 14;

// The world is unbounded in both vertical directions as well as horizontally. Everything
// is measured against sea level, which is the one altitude that does not move: surface
// height varies by a couple of hundred tiles between a highland and an ocean bed, so a
// layer defined against it would wander. Negative offsets are above sea level.
//
//   -750 and up   space        planetoids in vacuum
//   -250 to -750  sky          floating islands
//   -250 to +50   surface      the biomes
//    +50 to +750  caves
//   +750 to +1250 deep caverns
//  +1250 to +1750 hell
//  +1750 to +2170 hell caves
//  +2170 to +2850 trench
//  +2850 and down the Void
const VOID_START = 2850;
const LAYERS = [
  { key: 'space', name: 'Space', from: -Infinity, to: -750 },
  { key: 'sky', name: 'Sky', from: -750, to: -250 },
  { key: 'surface', name: 'Surface', from: -250, to: 50 },
  { key: 'caves', name: 'Caves', from: 50, to: 750 },
  { key: 'deep', name: 'Deep Caverns', from: 750, to: 1250 },
  { key: 'hell', name: 'Hell', from: 1250, to: 1750 },
  { key: 'hellcaves', name: 'Hell Caves', from: 1750, to: 2170 },
  { key: 'trench', name: 'The Trench', from: 2170, to: VOID_START },
  { key: 'void', name: 'The Void', from: VOID_START, to: Infinity }
];

// Kept as the depth past which the generator stops inventing new strata and the trench
// takes over. It is no longer a bound on the world: nothing clamps to it.
const WORLD_H = 1056;

// Biomes sit in a climate space rather than a line. The old model picked a biome by
// flooring a single 1-D field, which forces every biome into a fixed order: tundra could
// never border desert, and there was nowhere to put an ocean. Now two independent fields,
// temperature and moisture, place each column in a 2-D space, and each biome owns a region
// of it. Identity is whichever biome's weight is highest; height bias is the weighted
// average of the same weights. Using one set of weights for both is what keeps terrain
// continuous across a border while the surface material still changes abruptly.
//
// `bias` is how high the biome sits. `sub` is what lies under the filler. `wall` is the
// background it leaves behind. `tree` names a species in TREES, or 'none'.
const BIOMES = [
  { key: 'tundra', name: 'Tundra', temp: 0.08, moist: 0.35, bias: -8, rock: 'ice', rockMix: 0.34, cave: 'narrow',
    surface: 'snow', filler: 'snow', sub: 'dirt', wall: 'snowwall', tree: 'pine', grass: false },
  { key: 'taiga', name: 'Taiga', temp: 0.2, moist: 0.72, bias: 2, rock: 'ice', rockMix: 0.18, cave: 'narrow',
    surface: 'snow', filler: 'dirt', sub: 'dirt', wall: 'snowwall', tree: 'pine', grass: false },
  { key: 'highlands', name: 'Highlands', temp: 0.26, moist: 0.13, bias: -26, rock: 'granite', rockMix: 0.42, cave: 'shafts',
    surface: 'stone', filler: 'stone', sub: 'stone', wall: 'stonewall', tree: 'none', grass: false },
  { key: 'plains', name: 'Plains', temp: 0.5, moist: 0.42, bias: 0, cave: 'normal',
    surface: 'grass', filler: 'dirt', sub: 'dirt', wall: 'dirtwall', tree: 'oak', grass: true },
  { key: 'forest', name: 'Deepwood', temp: 0.46, moist: 0.68, bias: 4, cave: 'normal',
    surface: 'grass', filler: 'dirt', sub: 'dirt', wall: 'dirtwall', tree: 'oak', grass: true },
  { key: 'marsh', name: 'Mire', temp: 0.55, moist: 0.93, bias: 18, rock: 'mud', rockMix: 0.3, cave: 'rooms', aquifer: true,
    surface: 'peat', filler: 'peat', sub: 'mud', wall: 'mudwall', tree: 'oak', grass: true },
  { key: 'savanna', name: 'Savanna', temp: 0.82, moist: 0.44, bias: 2, rock: 'redclay', rockMix: 0.2, cave: 'normal',
    surface: 'grass', filler: 'dirt', sub: 'redclay', wall: 'dirtwall', tree: 'acacia', grass: true },
  { key: 'jungle', name: 'Jungle', temp: 0.85, moist: 0.86, bias: 8, rock: 'mud', rockMix: 0.46, cave: 'caverns', aquifer: true,
    surface: 'junglegrass', filler: 'mud', sub: 'mud', wall: 'mudwall', tree: 'jungle', grass: true },
  { key: 'badlands', name: 'Badlands', temp: 0.62, moist: 0.10, bias: -14, rock: 'sandstone', rockMix: 0.5, cave: 'shafts',
    surface: 'redclay', filler: 'redclay', sub: 'sandstone', wall: 'redclaywall', tree: 'none', grass: false },
  { key: 'desert', name: 'Dunes', temp: 0.88, moist: 0.11, bias: 14, rock: 'sandstone', rockMix: 0.58, cave: 'halls',
    surface: 'sand', filler: 'sand', sub: 'sandstone', wall: 'sandwall', tree: 'none', grass: false },

  // Overlays. These are never selected by climate; they replace whatever climate chose,
  // so they are listed after it and carry their own bias handling.
  { key: 'beach', name: 'Shore', temp: -1, moist: -1, bias: 0,
    surface: 'sand', filler: 'sand', sub: 'sandstone', wall: 'sandwall', tree: 'none', grass: false, overlay: true },
  { key: 'ocean', name: 'Ocean', temp: -1, moist: -1, bias: 0, cave: 'caverns', drowned: true,
    surface: 'sand', filler: 'sand', sub: 'sandstone', wall: 'sandwall', tree: 'none', grass: false, overlay: true },
  { key: 'blight', name: 'The Blight', temp: -1, moist: -1, bias: 0, cave: 'chasms', trunk: 'shadelog',
    surface: 'blightgrass', filler: 'dirt', sub: 'blight', wall: 'blightwall', tree: 'blighted', grass: false, overlay: true },
  { key: 'crimson', name: 'The Crimson', temp: -1, moist: -1, bias: 0, cave: 'chasms', trunk: 'crimlog',
    surface: 'fleshgrass', filler: 'dirt', sub: 'flesh', wall: 'fleshwall', tree: 'blighted', grass: false, overlay: true }
];

// What each biome plants on its own surface. `chance` is per column; `props` are weighted
// by their own numbers. A biome with nothing here gets a bare surface, which is itself a
// statement: the badlands are meant to look dead.
const FLORA = {
  plains:    { chance: 0.62, props: [['tuft', 7], ['flower', 3]] },
  forest:    { chance: 0.74, props: [['tuft', 8], ['flower', 2], ['mushroom', 1]] },
  taiga:     { chance: 0.34, props: [['tuft', 6], ['frostshard', 2]] },
  tundra:    { chance: 0.22, props: [['frostshard', 5], ['deadbush', 1]] },
  highlands: { chance: 0.18, props: [['tuft', 3], ['deadbush', 2]] },
  savanna:   { chance: 0.52, props: [['tuft', 8], ['deadbush', 3], ['flower', 1]] },
  jungle:    { chance: 0.88, props: [['jungletuft', 7], ['bamboo', 4], ['flower', 1], ['mushroom', 1]] },
  marsh:     { chance: 0.7, props: [['reeds', 7], ['mushroom', 3], ['jungletuft', 2]] },
  desert:    { chance: 0.14, props: [['cactus', 5], ['deadbush', 3]] },
  badlands:  { chance: 0.1, props: [['deadbush', 6], ['cactus', 1]] },
  beach:     { chance: 0.3, props: [['shell', 6], ['deadbush', 1]] },
  ocean:     { chance: 0.55, props: [['seaweed', 6], ['coral', 3], ['shell', 2]] },
  blight:    { chance: 0.5, props: [['blightshroom', 6], ['deadbush', 3]] },
  crimson:   { chance: 0.5, props: [['fleshshroom', 6], ['deadbush', 3]] }
};

// Resolve a weighted prop list with a single hash draw, so the choice is pure in x.
function pickProp(seed, x, props) {
  let total = 0;
  for (const [, w] of props) total += w;
  let roll = unit(seed, x, 0, 2131) * total;
  for (const [key, w] of props) {
    roll -= w;
    if (roll <= 0) return key;
  }
  return props[0][0];
}

const BY_BIOME = {};
for (const b of BIOMES) BY_BIOME[b.key] = b;
const CLIMATE_BIOMES = BIOMES.filter(b => !b.overlay);

// Sea level. Terrain is allowed to fall below it; where it does, the gap fills with water.
const SEA_LEVEL = SKY_H + 104;
const BEACH_BAND = 10;

// Spawn is always on dry land. Terraria guarantees this too, and for the same reason: the
// first thing a new world has to do is give you somewhere to stand. Without it the
// continent field decides, and roughly a fifth of seeds opened with the player treading
// water over an abyss with no wood in reach.
//
// It is done by pulling the surface up towards a dry ceiling rather than by biasing the
// continent field, because the continent field is only one of the terms in the height and
// a column with land above zero can still be submerged by its own hills. Within
// HOME_FLAT tiles of origin the pull is total and the ground cannot be sea; from there it
// eases out to nothing over HOME_FADE, so the coastline is pushed away from spawn rather
// than deleted. Everything stays a pure function of x.
const HOME_FLAT = 420;
const START_FOREST_CHUNKS = 10;
const START_FOREST_EDGE = CHUNK * START_FOREST_CHUNKS / 2;
const HOME_FADE = 1100;

function homeFactor(x) {
  const d = Math.abs(x);
  if (d <= HOME_FLAT) return 1;
  if (d >= HOME_FLAT + HOME_FADE) return 0;
  const t = 1 - (d - HOME_FLAT) / HOME_FADE;
  return t * t * (3 - 2 * t);
}

// --- the fields -------------------------------------------------------------------------
// All three are pure in x, so two chunks asking about the same column get the same answer.

// Summed octaves of value noise pile up around the middle: measured over 60,000 columns,
// the raw fields sat between 0.29 and 0.69 at the 5th and 95th percentiles. Biomes placed
// at the corners of climate space were therefore unreachable, and three of ten never
// generated at all. The stretch below opens the measured band out to very nearly the full
// range, which is what puts desert and badlands on the map.
const CLIMATE_STRETCH = 2.25;

function stretch(v) {
  return Math.min(1, Math.max(0, (v - 0.5) * CLIMATE_STRETCH + 0.5));
}

// Frequencies divided by about three from the first version: a biome you cross in a
// couple of screens reads as terrain variation rather than as a place, and the whole
// point of fourteen of them is that arriving somewhere feels like arriving.
// Where the climate is actually sampled. Displacing the lookup by a small high-frequency
// amount is what makes every border ragged: two biomes interleave in tongues because the
// line between them wanders by a dozen tiles from column to column.
//
// This replaced a dither that compared a noise field against how close the top two
// weights were. That worked, and was invisible: it fired mostly between neighbours which
// share a surface material - taiga against tundra, both snow - while the borders a player
// actually sees, snow meeting grass, stayed ruled lines. A warp has no threshold to miss.
//
// The climate fields are very low frequency, so displacing the lookup by at most twenty
// tiles barely moves the blended height bias and the terrain stays continuous.
// Two octaves. The broad one bends a border over tens of tiles so it is never straight;
// the fine one oscillates faster than the border moves, which is what turns the boundary
// into interleaved tongues of each biome rather than a wiggly but single line.
const CLIMATE_WARP_BROAD = 54;
const CLIMATE_WARP_FINE = 17;

function climateX(seed, x) {
  const broad = (fbm1(seed, x * 0.012, 4501, 2, 2, 0.5) - 0.5) * CLIMATE_WARP_BROAD;
  const fine = (fbm1(seed, x * 0.16, 4507, 2, 2, 0.5) - 0.5) * CLIMATE_WARP_FINE;
  return x + broad + fine;
}

function temperature(seed, x) {
  const broad = fbm1(seed, x * 0.00014, 311, 3, 2, 0.52);
  const local = fbm1(seed, x * 0.0012, 733, 2, 2, 0.5);
  return stretch(broad * 0.78 + local * 0.22);
}

function moisture(seed, x) {
  const broad = fbm1(seed, x * 0.00017, 419, 3, 2, 0.5);
  const local = fbm1(seed, x * 0.0014, 821, 2, 2, 0.5);
  return stretch(broad * 0.74 + local * 0.26);
}

// How much land there is here. Below zero is sea floor, and the deeper it goes the deeper
// the ocean. A separate low-frequency field so coastlines do not track the climate.
function continent(seed, x) {
  const base = fbm1(seed, x * 0.00036, 577, 4, 2, 0.5);
  const detail = fbm1(seed, x * 0.0029, 643, 2, 2, 0.5);
  return (base * 0.82 + detail * 0.18 - 0.42) * 2.6;
}

// Smooth membership in each climate biome. The kernel is wide enough that neighbouring
// biomes always overlap, which is what makes the blended height bias continuous.
// How hard each biome's weight is jostled per column. This is what makes a border
// interleave, and it had to replace two earlier attempts.
//
// The first compared a noise field against how close the top two weights were and swapped
// the winner when it dipped. That fired mostly between neighbours sharing a surface
// material - taiga against tundra, both snow - so it worked and was invisible. The second
// displaced the sampled position instead; but the climate fields are deliberately very
// low frequency, so moving the lookup twenty tiles barely changes the weights and the
// winner almost never flipped. Measured, only 6.5% of borders between biomes that
// actually look different had any interleaving at all.
//
// Jostling the weights works at every border regardless of which pair meets, because it
// acts on the comparison itself rather than on the thing being compared.
const CLIMATE_JOSTLE = 1.5;
const JOSTLE_FIELD = 0.19;

const CLIMATE_REGION_WIDTH = 360;

// Each run of regions visits every climate once, in a different seeded order.
const climateDeck = cacheStructure((seed, group) => {
  const order = CLIMATE_BIOMES.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(unit(seed, group, i, 4621) * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
});

function regionalBiome(seed, region) {
  const size = CLIMATE_BIOMES.length;
  const group = Math.floor(region / size);
  const index = region - group * size;
  const order = climateDeck(seed, group);
  const previous = climateDeck(seed, group - 1);
  const repeat = order[0] === previous[size - 1];
  return CLIMATE_BIOMES[order[repeat && index < 2 ? 1 - index : index]];
}

// The climate weights with no jostle at all. Height bias is blended across these, so the
// ground stays a smooth function of position even where identity flickers.
function smoothWeights(seed, x) {
  const wx = climateX(seed, x);
  let t = temperature(seed, wx);
  let m = moisture(seed, wx);
  const influence = 0.78 * (1 - homeFactor(x));
  if (influence > 0) {
    const at = wx / CLIMATE_REGION_WIDTH;
    const region = Math.floor(at);
    const blend = smooth(Math.max(0, Math.min(1, (at - region - 0.64) / 0.36)));
    const from = regionalBiome(seed, region);
    const to = blend ? regionalBiome(seed, region + 1) : from;
    t += (from.temp + (to.temp - from.temp) * blend - t) * influence;
    m += (from.moist + (to.moist - from.moist) * blend - m) * influence;
  }
  const weights = new Array(CLIMATE_BIOMES.length);
  for (let i = 0; i < CLIMATE_BIOMES.length; i += 1) {
    const b = CLIMATE_BIOMES[i];
    const dt = (t - b.temp) / 0.19;
    const dm = (m - b.moist) / 0.21;
    weights[i] = Math.exp(-(dt * dt + dm * dm));
  }
  return weights;
}

// The weights that decide identity: the smooth ones, jostled by a per-biome noise whose
// strength is proportional to how contested the column already is.
//
// Scaling by contest is the part that matters. A flat jostle strong enough to interleave
// a border - 64% of visible borders, measured - also scattered single columns of the
// wrong biome through the middle of every biome, dropping the median run from 17 tiles
// to 8 and then to 4 as it was strengthened. Deep inside a biome the runner-up is far
// behind, the contest is near zero, and the jostle vanishes with it.
function climateWeights(seed, x) {
  const smooth2 = smoothWeights(seed, x);
  let best = 0;
  for (let i = 0; i < smooth2.length; i += 1) if (smooth2[i] > smooth2[best]) best = i;
  let second = -1;
  for (let i = 0; i < smooth2.length; i += 1) {
    if (i === best) continue;
    if (second === -1 || smooth2[i] > smooth2[second]) second = i;
  }
  const share = second >= 0 && smooth2[best] > 0
    ? smooth2[second] / (smooth2[best] + smooth2[second]) : 0;
  // Nothing below a third of parity is a border worth ragging.
  const contest = Math.max(0, (share - 0.3) / 0.2);
  if (contest <= 0) return smooth2;

  const out = new Array(smooth2.length);
  for (let i = 0; i < smooth2.length; i += 1) {
    const noise = fbm1(seed, x * JOSTLE_FIELD, 4600 + i * 29, 2, 2, 0.5) - 0.5;
    out[i] = smooth2[i] * (1 + noise * CLIMATE_JOSTLE * contest);
  }
  return out;
}

// Columns are asked about repeatedly, once per tile in the column and again by trees and
// decoration. The cache is keyed by seed and x only, so it never makes a chunk's answer
// depend on which chunk asked.
const COLUMN_CACHE_SIZE = 4096;
const columnCache = new Array(COLUMN_CACHE_SIZE);
let columnCacheSeed = null;

function columnOf(seed, x) {
  if (columnCacheSeed !== seed) {
    columnCache.length = 0;
    columnCache.length = COLUMN_CACHE_SIZE;
    columnCacheSeed = seed;
  }
  const slot = ((x % COLUMN_CACHE_SIZE) + COLUMN_CACHE_SIZE) % COLUMN_CACHE_SIZE;
  const hit = columnCache[slot];
  if (hit && hit.x === x) return hit;
  const built = buildColumn(seed, x);
  columnCache[slot] = built;
  return built;
}

// Corruption and crimson. The world is divided into bands; a band either carries a blight
// or does not, and a hash of the band index decides which of the two it is, so the pair
// never overlap and neither has to win a fight for space.
const BLIGHT_BAND = 420;

function blightAt(seed, x) {
  const band = Math.floor(x / BLIGHT_BAND);
  if (unit(seed, band, 0, 3301) > 0.3) return null;
  const centre = band * BLIGHT_BAND + BLIGHT_BAND * (0.25 + unit(seed, band, 0, 3307) * 0.5);
  const half = 70 + unit(seed, band, 0, 3313) * 110;
  const edge = (fbm1(seed, x * 0.02, 3319, 2, 2, 0.5) - 0.5) * 34;
  if (Math.abs(x - centre) + edge > half) return null;
  return unit(seed, band, 0, 3323) < 0.5 ? 'blight' : 'crimson';
}

// How wide the interleaved band between two biomes is. The dither field's frequency sets
// the size of each patch within it; at 0.055 a patch is roughly fifteen tiles, which is
// large enough to read as a tongue of forest reaching into the plains rather than as
// single-column speckle.
const BLEND_FIELD = 0.055;
// How close the runners-up must be before a border starts interleaving.
// Low enough that a border between two biomes which actually look different gets a wide
// interleaved band. At 0.40 the blend fired mostly between neighbours that share a
// surface material - taiga against tundra, both snow - so it was working and invisible.
const BLEND_THRESHOLD = 0.26;

// Which two climates compete for a column, how close they are, and which one wins. One
// function, exported, because the test had its own copy of the second-place search and
// inherited the same bug the generator had.
//
// That bug: finding second place inside the same pass as first left it equal to `best`
// whenever the strongest biome was index 0, since nothing ever displaced the initial
// value. The blend then fired, computed a share of exactly one half, and swapped the
// biome for itself. It ran on a fifth of all columns and changed nothing, which is why
// borders still looked like ruled lines in the game while the tests called them blended.
function climateChoice(seed, x) {
  const weights = climateWeights(seed, x);
  let best = 0;
  for (let i = 0; i < weights.length; i += 1) {
    if (weights[i] > weights[best]) best = i;
  }
  // Height comes from the unjostled weights. If the bias followed the flicker, a border
  // would be a row of one-tile steps instead of a smooth slope with ragged ground cover.
  const smooth2 = smoothWeights(seed, x);
  let total = 0;
  let blended = 0;
  for (let i = 0; i < smooth2.length; i += 1) {
    total += smooth2[i];
    blended += smooth2[i] * CLIMATE_BIOMES[i].bias;
  }
  let second = -1;
  for (let i = 0; i < weights.length; i += 1) {
    if (i === best) continue;
    if (second === -1 || weights[i] > weights[second]) second = i;
  }

  // Taking the strongest weight outright puts a ruled line between two biomes, which is
  // the one place a generated world always looks generated. Where the top two are close,
  // a coherent noise field decides per patch which wins, so the border becomes
  // interleaved tongues of each. Height already blends across every weight.
  const share = second >= 0 && weights[best] > 0
    ? weights[second] / (weights[best] + weights[second]) : 0;
  return { weights, smooth: smooth2, total, best, second, share, chosen: best,
    bias: total > 0 ? blended / total : 0 };
}

function buildColumn(seed, x) {
  const choice = climateChoice(seed, x);
  const best = choice.chosen;
  const bias = choice.bias;
  const land = continent(seed, x);

  // Height first, because whether this column is shore or sea depends on where it lands.
  // Blend landforms with the same climate weights as elevation so biome borders
  // meet smoothly. Long ridges, dry escarpments and low wet basins have different profiles.
  let ridgeWeight = 0, flatWeight = 0, dryWeight = 0;
  for (let i = 0; i < CLIMATE_BIOMES.length; i += 1) {
    const key = CLIMATE_BIOMES[i].key;
    const weight = choice.smooth[i] / (choice.total || 1);
    if (key === 'highlands' || key === 'taiga') ridgeWeight += weight;
    if (key === 'marsh' || key === 'plains') flatWeight += weight;
    if (key === 'desert' || key === 'badlands') dryWeight += weight;
  }
  const warp = (fbm1(seed, x * 0.0039, 71, 2, 2, 0.5) - 0.5) * 95;
  const u = x + warp;
  const rolling = (fbm1(seed, u * 0.0085, 11, 4, 2, 0.5) - 0.5) * (53 - flatWeight * 26);
  const broad = fbm1(seed, u * 0.0022, 29, 3, 2, 0.55) - 0.5;
  const hills = broad * (126 + ridgeWeight * 58 - flatWeight * 42);
  const ridge = 1 - Math.abs(2 * fbm1(seed, u * 0.006, 73, 2, 2, 0.5) - 1);
  const landform = -ridgeWeight * ridge ** 4 * 31
    + dryWeight * Math.sin(broad * 19) * 10;
  const detail = (fbm1(seed, u * 0.055, 53, 2, 2, 0.5) - 0.5) * 8;
  const cover = fbm1(seed, u * 0.016, 79, 2, 2, 0.5);
  // Below sea level the shape flattens into a basin rather than keeping its hills, so an
  // ocean floor reads as a floor and not as drowned countryside.
  // Land sits above sea level by default; only a column whose continent field has gone
  // negative is pushed below it. `relief` flattens the hills as the floor drops, so an
  // ocean bed reads as a bed rather than as drowned countryside.
  const shelf = Math.max(0, -land);
  const relief = Math.max(0, 1 - shelf * 2.2);
  // The drop accelerates: a gentle shelf near the shore, then an abyss. A linear term
  // gave oceans about 60 tiles deep, which is a pond you can see the bottom of from the
  // surface; the exponent is what turns the deep ocean into somewhere you have to dive.
  // The first slice of negative continent is still coast, not sea: without that offset
  // the steeper curve turned almost a third of the world into ocean.
  const abyss = Math.pow(Math.max(0, shelf - 0.14), 1.4) * 2600;
  let h = SEA_LEVEL - 34 + (rolling + hills + landform) * relief + detail + bias * relief
    + abyss - Math.max(0, land) * 12;
  // Pull the ground up towards dry land near the origin. Below the ceiling nothing
  // happens at all, so the homeland keeps its own hills and valleys; only a column that
  // would have been shore or sea is lifted, and only as far as the factor says.
  const home = homeFactor(x);
  if (home > 0) {
    const ceiling = SEA_LEVEL - BEACH_BAND - 8;
    if (h > ceiling) h += (ceiling - h) * home;
  }
  h = Math.max(SKY_H + 24, Math.min(SEA_LEVEL + 900, Math.round(h)));

  // Identity. Sea and shore override climate; a blight overrides everything but the sea.
  let biome = CLIMATE_BIOMES[best];
  if (h > SEA_LEVEL) biome = BY_BIOME.ocean;
  else if (h > SEA_LEVEL - BEACH_BAND) biome = BY_BIOME.beach;
  else {
    const blight = blightAt(seed, x);
    if (blight) biome = BY_BIOME[blight];
  }
  const terrainBiome = biome;
  if (x >= -START_FOREST_EDGE && x < START_FOREST_EDGE) biome = BY_BIOME.forest;
  return { x, biome, terrainBiome, climate: CLIMATE_BIOMES[best], height: h, bias, land, cover,
    weights: choice.weights, choice };
}

function biomeAt(seed, x) {
  return columnOf(seed, x).biome;
}

// The climate biome under an overlay: what this column would be without sea or blight.
// Used for the strata, so a blighted forest still has forest rock beneath it.
function climateAt(seed, x) {
  return columnOf(seed, x).climate;
}

function biomeIndex(seed, x) {
  return BIOMES.indexOf(biomeAt(seed, x));
}

function heightBias(seed, x) {
  return columnOf(seed, x).bias;
}

function surfaceHeight(seed, x) {
  return columnOf(seed, x).height;
}

// Caves are not one shape everywhere. Each profile tunes three things: how wide the
// passages are, how readily they open into rooms, and how much the vertical ridged field
// dominates, which is what turns a cave system into shafts or into chasms. This is where
// an underground actually gets its character; the materials alone are just a palette.
const CAVE_PROFILES = {
  normal:  { scale: 0.028, rooms: 0.38, threshold: 0.605, vertical: 0, roomScale: 0.016 , bore: 1.0 },
  // Tundra: tight, winding, little open space.
  narrow:  { scale: 0.038, rooms: 0.22, threshold: 0.655, vertical: 0, roomScale: 0.02 , bore: 0.66 },
  // Desert: broad flat halls carved along the bedding planes of the sandstone.
  halls:   { scale: 0.019, rooms: 0.54, threshold: 0.565, vertical: -0.22, roomScale: 0.0105 , bore: 1.4 },
  // Jungle: enormous chambers, the largest in the world.
  caverns: { scale: 0.015, rooms: 0.6, threshold: 0.54, vertical: 0, roomScale: 0.009 , bore: 1.1 },
  // Highlands and badlands: vertical shafts punched through the rock.
  shafts:  { scale: 0.03, rooms: 0.24, threshold: 0.6, vertical: 0.42, roomScale: 0.018 , bore: 1.05 },
  // The blights: narrow vertical chasms that run a long way down.
  chasms:  { scale: 0.026, rooms: 0.2, threshold: 0.58, vertical: 0.66, roomScale: 0.017 , bore: 0.82 },
  rooms:   { scale: 0.022, rooms: 0.52, threshold: 0.575, vertical: -0.1, roomScale: 0.013 , bore: 1.15 }
};

function caveProfile(column) {
  const key = ((column.terrainBiome || column.biome).cave) || (column.climate && column.climate.cave) || 'normal';
  return CAVE_PROFILES[key] || CAVE_PROFILES.normal;
}

// --- the tunnel network ------------------------------------------------------------
// Noise alone makes pockets, not caves. Measured over three seeds, only 1% to 11% of the
// open space underground could be reached from the sky without mining, in 300 to 460
// separate sealed voids: the world was full of caverns nobody could ever walk into.
//
// The fix is a skeleton that is connected by construction rather than by luck. Long
// horizontal galleries run at intervals of depth, each a sine-free wandering line that
// continues forever in x. Vertical shafts wander down across many of those depths. A
// shaft crosses every gallery it passes, so the two families form one network, and the
// shafts that start at depth zero are its doors.
//
// Both are pure functions of (x, y), so like the sky islands they cannot disagree at a
// chunk seam and need no stamping margin.
// Leave more rock between the galleries while retaining the shafts that link them.
const GALLERY_SPACING = 74;
// Measured, not guessed. At 108 apart with 62% of them breaking the surface there was
// one cave mouth every 160 to 267 tiles - two or three screens of walking between doors,
// each only a few tiles wide and easily hidden behind a tree. Connectivity was already
// 95%, but a cave you never find is a cave that is not there.
const SHAFT_SPACING = 50;

// A horizontal gallery near this depth, if any.
function inGallery(seed, x, depth, bore) {
  const band = Math.round(depth / GALLERY_SPACING);
  for (let b = band - 1; b <= band + 1; b += 1) {
    if (b < 1) continue;
    const base = b * GALLERY_SPACING + (unit(seed, b, 0, 5201) - 0.5) * 38;
    const wander = (fbm1(seed, x * 0.0042 + b * 37, 5203, 3, 2, 0.5) - 0.5) * 52;
    const shape = fbm1(seed, x * 0.021 + b * 11, 5209, 2, 2, 0.5);
    // Swell narrow corridors into chambers without severing their centerlines.
    const chamber = Math.max(0, shape - 0.68) ** 2 * 42;
    const radius = (2.35 + unit(seed, b, 0, 5207) * 3.15
      + (shape - 0.5) * 3 + chamber) * bore;
    if (Math.abs(depth - (base + wander + (shape - 0.5) * 7)) < radius) return true;
  }
  return false;
}

// A vertical shaft near this column, if any. Shafts whose top is depth 0 break the
// surface, and those are what make the cave system findable without a pickaxe.
function inShaft(seed, x, depth, bore) {
  const slot = Math.round(x / SHAFT_SPACING);
  for (let s = slot - 1; s <= slot + 1; s += 1) {
    if (unit(seed, s, 0, 5301) > 0.82) continue;
    // Most shafts break the surface. The cave system was already one connected mass in
    // every seed measured - up to 120,000 tiles of it - but with doors every 480 tiles
    // on average, two of three sample windows contained none at all, and a cave with no
    // door is indistinguishable from no cave.
    const top = unit(seed, s, 0, 5313) < 0.72 ? -3 : 30 + unit(seed, s, 0, 5317) * 180;
    const bottom = 510 + unit(seed, s, 0, 5319) * 730;
    if (depth < top || depth > bottom) continue;
    const base = s * SHAFT_SPACING + (unit(seed, s, 0, 5303) - 0.5) * SHAFT_SPACING * 0.72;
    const wander = (fbm1(seed, depth * 0.0062 + s * 23, 5307, 3, 2, 0.5) - 0.5) * 76;
    const shape = fbm1(seed, depth * 0.03 + s * 5, 5323, 2, 2, 0.5);
    const radius = (2.1 + unit(seed, s, 0, 5311) * 2.8
      + (shape - 0.5) * 1.8 + Math.max(0, shape - 0.65) * 5) * bore;
    // The mouth flares, so an entrance reads as an entrance rather than as a drilled hole.
    // A funnel, not a flare. Widening the mouth made each entrance fifteen tiles across
    // and the surface measured 21.9% open holes - a sieve rather than a landscape - so
    // the shaft now pinches at the top and opens out below. That gives many more
    // entrances for the same amount of missing ground, and a narrow opening leading
    // into a widening throat reads far more like a cave than a crater does.
    const throat = top < 0 && depth < 14 ? 0.4 + depth * 0.043 : 1;
    if (Math.abs(x - (base + wander)) < radius * throat) return true;
  }
  return false;
}

// Whether an open tile underground is full of water. Under the sea, everything open and
// below sea level is: the rock down there has had geological time to saturate, and a dry
// cavern beneath an ocean is a bubble nothing could have made.
//
// The earlier rule stopped at a water table 110 to 230 tiles below the bed, which left
// 89,309 dry air tiles below sea level under the ocean in one sampled stretch, and the
// cave shafts then punched 5% of sea beds open into them. That is the ocean full of air
// pockets. The cut-off now is hell, where lava takes over instead.
function submergedVoid(seed, x, y, column) {
  if (y < SEA_LEVEL) return false;
  if (column.biome.drowned && altitudeOf(y) < 1250) return true;
  const flood = floodFloor(seed, x, column);
  return flood > 0 && y <= flood;
}

// The network takes its width from the biome's own cave profile, so a desert gallery is
// a broad hall and a tundra one is a crawl. Without that the uniform network washed the
// biome character straight out of the undergrounds it was meant to connect.
function inNetwork(seed, x, depth, column) {
  const bore = column ? caveProfile(column).bore || 1 : 1;
  return inGallery(seed, x, depth, bore) || inShaft(seed, x, depth, bore);
}

// Whether this tile is open space rather than rock. One predicate, exported, so the
// generator and the tests cannot drift apart about what counts as a cave - the same
// mistake the stamping rule made once already, where a second copy in the seam test made
// the oracle agree with itself and not with the game.
//
// The network carves from the very first tile down. Gating it behind `depth > 2`, as the
// noise caves are, capped every surface shaft with two tiles of soil: the doors were all
// generated and then all sealed, and measured reachability stayed near zero in half the
// seeds for that one reason.
function isCarved(seed, x, y, depth, column) {
  if (depth >= 0 && inNetwork(seed, x, depth, column)) return true;
  return depth > 4 && caveDensity(seed, x, y, depth, column) > caveThreshold(column);
}

function caveDensity(seed, x, y, depth, column) {
  const p = column ? caveProfile(column) : CAVE_PROFILES.normal;
  const tunnels = ridged2(seed, x * p.scale, y * p.scale, 601, 4);
  const rooms = fbm2(seed, x * p.roomScale, y * (p.roomScale * 1.35), 727, 3, 2, 0.5);
  const squeeze = Math.min(1, depth / 90);
  let d = tunnels * (1 - p.rooms) + rooms * p.rooms * squeeze;
  // A positive vertical term rewards columns that line up, which reads as a shaft; a
  // negative one rewards rows, which reads as a flat-roofed hall.
  if (p.vertical !== 0) {
    const grain = ridged2(seed, x * p.scale * 2.6, y * p.scale * 0.34, 883, 3);
    d += (grain - 0.5) * p.vertical;
  }
  return d;
}

function caveThreshold(column) {
  const profile = column ? caveProfile(column) : CAVE_PROFILES.normal;
  return profile.threshold + (profile === CAVE_PROFILES.halls ? 0.035 : 0.055);
}

// How far down standing water reaches. Beneath an ocean the sea soaks into the rock, so
// the caverns under it are flooded: an underground ocean, which is the one piece of this
// Terraria does not have. A mire has a shallow water table for the same reason.
function floodFloor(seed, x, column) {
  if (column.biome.drowned) {
    const reach = 110 + fbm1(seed, x * 0.004, 3407, 2, 2, 0.5) * 120;
    return column.height + reach;
  }
  if (column.climate && column.climate.aquifer) {
    const reach = 10 + fbm1(seed, x * 0.006, 3413, 2, 2, 0.5) * 34;
    return column.height + reach;
  }
  return -1;
}

function stratum(seed, x, y, depth, column) {
  const jitter = (fbm1(seed, x * 0.02, 409, 2, 2, 0.5) - 0.5) * 22;
  if (depth < 7 + jitter * 0.2) return 'surface';
  // A blight's own rock runs well below its grass, so digging out of one takes effort.
  if (column && (column.biome.key === 'blight' || column.biome.key === 'crimson')
    && depth < 66 + jitter) return 'blighted';
  if (depth < 46 + jitter) return 'filler';

  // Past the near-surface strata the layer decides, not the depth below this column: hell
  // is at an altitude, so it is flat across the world rather than following the terrain.
  const layer = layerAt(y).key;
  if (layer === 'hellcaves') {
    // Mixed, so the deepest rock is not a single colour forever.
    const mix = fbm2(seed, x * 0.03, y * 0.03, 3719, 2, 2, 0.5);
    if (mix > 0.76) return 'obsidian';
    return mix > 0.46 ? 'brimstone' : 'cinderstone';
  }
  if (layer === 'hell') {
    const alt = altitudeOf(y) - 1250;
    return alt + jitter > 240 ? 'brimstone' : 'ash';
  }
  if (layer === 'deep') {
    const alt = altitudeOf(y) - 750;
    return alt + jitter * 2 > 260 ? 'slate' : 'basalt';
  }
  if (depth < 300 + jitter * 2) return 'stone';
  if (depth < 540 + jitter * 2) return 'granite';
  return 'basalt';
}

const ORE_BANDS = [
  { key: 'tin', from: 12, to: 300, salt: 1151, rarity: 0.786, size: 0.088 },
  { key: 'copper', from: 20, to: 360, salt: 1201, rarity: 0.782, size: 0.085 },
  { key: 'iron', from: 60, to: 520, salt: 1301, rarity: 0.796, size: 0.08 },
  { key: 'silver', from: 180, to: 680, salt: 1401, rarity: 0.818, size: 0.072 },
  { key: 'gold', from: 300, to: 820, salt: 1501, rarity: 0.833, size: 0.068 },
  { key: 'cobalt', from: 520, to: 980, salt: 1601, rarity: 0.846, size: 0.064 },
  { key: 'emberite', from: 740, to: Infinity, salt: 1701, rarity: 0.862, size: 0.058 },

  // Gems. Rarer than metal and in smaller pockets, because a gem should be a find rather
  // than a seam you work. Each sits deeper than the last, so what you are carrying says
  // how far down you have been.
  { key: 'amethyst', from: 40, to: 420, salt: 1801, rarity: 0.885, size: 0.135 },
  { key: 'topaz', from: 90, to: 520, salt: 1811, rarity: 0.889, size: 0.135 },
  { key: 'sapphire', from: 180, to: 700, salt: 1823, rarity: 0.893, size: 0.14 },
  { key: 'emerald', from: 280, to: 820, salt: 1831, rarity: 0.897, size: 0.14 },
  { key: 'ruby', from: 420, to: 1000, salt: 1847, rarity: 0.901, size: 0.145 },
  { key: 'diamond', from: 640, to: Infinity, salt: 1861, rarity: 0.912, size: 0.15 }
];

function oreAt(seed, x, y, depth) {
  for (const band of ORE_BANDS) {
    if (depth < band.from || depth > band.to) continue;
    const scale = band.size * 1.28;
    const blob = fbm2(seed, x * scale, y * scale, band.salt, 2, 2, 0.5);
    if (blob > band.rarity) return band.key;
  }
  return null;
}

// --- underground structures ---------------------------------------------------------
// Terraria's underground is punctuated: a ruined cabin with a chest in it, a brick room
// half buried, a mineshaft someone abandoned. Those punctuation marks are what make
// exploring feel like finding things rather than like walking through noise.
//
// Like the sky islands, these are computed from (x, y) rather than stamped, so a room
// wider than a chunk cannot disagree with itself across a seam.

const STRUCTURE_SPACING = 260;

function structureAt(seed, slot) {
  if (unit(seed, slot, 0, 6001) > 0.86) return null;
  const ax = Math.round(slot * STRUCTURE_SPACING
    + STRUCTURE_SPACING * (0.15 + unit(seed, slot, 0, 6003) * 0.7));
  // Anchored to its own column's surface, so a structure sits at a sane depth whether
  // the ground above it is a mountain or an ocean bed.
  const depth = 80 + unit(seed, slot, 0, 6007) * 520;
  const roll = unit(seed, slot, 0, 6011);
  let kind;
  let w;
  let h;
  if (roll >= 0.91) { kind = 'reliquary'; w = 26; h = 12; }
  else if (roll >= 0.8 && roll < 0.87) { kind = 'cistern'; w = 32; h = 15; }
  else if (roll < 0.3) { kind = 'cabin'; w = 11 + Math.floor(unit(seed, slot, 0, 6013) * 8); h = 6 + Math.floor(unit(seed, slot, 0, 6017) * 3); }
  else if (roll < 0.52) { kind = 'ruin'; w = 13 + Math.floor(unit(seed, slot, 0, 6013) * 10); h = 7 + Math.floor(unit(seed, slot, 0, 6017) * 4); }
  else if (roll < 0.8) { kind = 'grotto'; w = 26 + Math.floor(unit(seed, slot, 0, 6013) * 30); h = 14 + Math.floor(unit(seed, slot, 0, 6017) * 16); }
  else { kind = 'mineshaft'; w = 46 + Math.floor(unit(seed, slot, 0, 6013) * 40); h = 5; }
  return { slot, kind, w, h, ax, depth };
}

// A structure's absolute vertical position. Separate from structureAt so the shape can be
// decided without a column lookup, which keeps the slot scan cheap.
function structureRect(seed, body) {
  const top = columnOf(seed, body.ax).height + Math.round(body.depth);
  return { x0: body.ax - (body.w >> 1), x1: body.ax - (body.w >> 1) + body.w,
    y0: top, y1: top + body.h, kind: body.kind, slot: body.slot, w: body.w, h: body.h };
}

// Whether a structure in this slot actually generates, and where. The refusals used to
// live inline in structureTileAt, so a test that asked structureAt where the rooms were
// got told about rooms that never appear - the third time a rule has existed in two
// places in this file and the two have disagreed.
function computeStructurePlaced(seed, slot) {
  const body = structureAt(seed, slot);
  if (!body) return null;
  const rect = structureRect(seed, body);
  // Never in hell, where a wooden cabin among lava is absurd, and never under the sea,
  // where it would flood the moment it generated.
  if (altitudeOf(rect.y0) >= 1250) return null;
  if (columnOf(seed, body.ax).biome.drowned) return null;
  rect.body = body;
  return rect;
}

const STRUCTURE_STATIONS = ['workbench', 'furnace', 'anvil'];

// Where a structure keeps its chest, if it has one, as an absolute origin. A cabin
// almost always has one and a ruin often does; a grotto is a natural chamber and a
// mineshaft was stripped before it was abandoned.
function computeStructureChest(seed, slot) {
  const r = cachedStructurePlaced(seed, slot);
  if (!r) return null;
  const odds = r.kind === 'cabin' ? 0.86 : r.kind === 'ruin' ? 0.5 : r.kind === 'reliquary' || r.kind === 'cistern' ? 1 : 0;
  if (odds === 0) return null;
  if (unit(seed, slot, 0, 7501) > odds) return null;
  const x = r.kind === 'cistern' ? r.x0 + 1 : r.x0 + 2 + Math.floor(unit(seed, slot, 0, 7503) * Math.max(1, r.w - 5));
  const y = r.y1 - 3;                                  // standing on the floor
  const depth = y - columnOf(seed, r.body.ax).height;
  let band = unit(seed, slot, 0, 7507) < 0.06 ? 'rich' : null;
  if (!band) band = depth > 760 ? 'rich' : depth > 320 ? 'deep' : 'caves';
  const kind = band === 'rich' ? 'goldchest' : band === 'deep' ? 'ironchest' : 'woodchest';
  return { x, y, kind, band, slot };
}

// Cache empty slots as well as occupied ones. Each cell in a chunk checks the same
// nearby slots, and the direct-mapped cache stays bounded as the player travels.
function cacheStructure(compute) {
  const entries = new Array(256);
  return (seed, slot) => {
    const index = slot & 255;
    const entry = entries[index];
    if (entry && entry.seed === seed && entry.slot === slot) return entry.value;
    const value = compute(seed, slot);
    entries[index] = { seed, slot, value };
    return value;
  };
}

const cachedStructurePlaced = cacheStructure(computeStructurePlaced);
const cachedStructureChest = cacheStructure(computeStructureChest);

// The chest tile at a position, if a structure put one there.
function chestTileAt(seed, x, y) {
  const slot = Math.floor(x / STRUCTURE_SPACING);
  for (let s = slot - 1; s <= slot + 1; s += 1) {
    const chest = cachedStructureChest(seed, s);
    if (!chest) continue;
    const dx = x - chest.x;
    const dy = y - chest.y;
    if (dx < 0 || dx > 1 || dy < 0 || dy > 1) continue;
    return cellOf(chest.kind, dx, dy).id;
  }
  return null;
}

// The item-kind lookup lives in craft.js, which loads after this file in the browser and
// is required here in Node. Resolving it at call time rather than at load time is what
// lets one spelling work in both.
function lootKindOf(key) {
  if (typeof require === 'function') return require('./craft.js').kindOf(key);
  return kindOf(key);
}

// What is in the chest whose origin is here, before anybody has touched it.
// One signature structure in each supported biome and depth band.
const BIOME_SITE_SPACING = 144;
const FOREST_SITES = ['Ranger Camp', 'Moss Shrine', 'Heartwood Vault'];
const DESERT_SITES = ['Caravan Rest', 'Buried Cistern', 'Amber Tomb'];
const TUNDRA_SITES = ['Snowbound Lodge', 'Rime Observatory', 'Glacier Crypt'];
const JUNGLE_SITES = ['Canopy Outpost', 'Vinewell Shrine', 'Amberroot Temple'];
const MARSH_SITES = ['Reedwalk Post', 'Drowned Pumpworks', 'Blackfen Ossuary'];
const HIGHLAND_SITES = ['Crag Watch', 'Echo Quarry', 'Granite Sepulcher'];
const BADLAND_SITES = ['Claybreak Camp', 'Redstone Kiln', 'Ochre Catacomb'];
const SAVANNA_SITES = ['Acacia Waystation', 'Termite Galleries', 'Sunken Sun Court'];
const TAIGA_SITES = ['Pinewatch Hut', 'Resinworks', 'Winterroot Barrow'];
const PLAINS_SITES = ['Windmill Crossing', 'Chalk Cellar', 'Buried Standard'];
const BLIGHT_SITES = ['Shadebound Camp', 'Spore Chapel', 'Hollow Root Vault'];
const CRIMSON_SITES = ['Crimwood Lookout', 'Vein Foundry', 'Sanguine Crypt'];
const OCEAN_SITES = ['Reef Shelter', 'Drowned Station', 'Abyssal Vault'];
const BEACH_SITES = ['Driftwood Jetty', 'Saltwater Storehouse', 'Saltmarrow Catacomb'];
const BIOME_SITE_NAMES = { forest: FOREST_SITES, desert: DESERT_SITES, tundra: TUNDRA_SITES, jungle: JUNGLE_SITES, marsh: MARSH_SITES, highlands: HIGHLAND_SITES, badlands: BADLAND_SITES, savanna: SAVANNA_SITES, taiga: TAIGA_SITES, plains: PLAINS_SITES, blight: BLIGHT_SITES, crimson: CRIMSON_SITES, ocean: OCEAN_SITES, beach: BEACH_SITES };
const biomeSite = cacheStructure((seed, slot) => {
  const x = slot * BIOME_SITE_SPACING + 25 + Math.floor(unit(seed, slot, 0, 6311) * 84);
  const column = columnOf(seed, x);
  const biome = column.biome.key;
  const surface = column.height;
  const names = BIOME_SITE_NAMES[biome];
  if (!names || (biome !== 'beach' &&
    (biomeAt(seed, x - 14).key !== biome || biomeAt(seed, x + 14).key !== biome))) return null;
  const make = (layer, top, height) => ({ x, top, height, layer, biome,
    name: names[layer], mimic: layer === 2 && (slot === 0 || unit(seed, slot, 0, 6323) < 0.4) });
  const sites = [make(0, biome === 'ocean' ? Math.max(SEA_LEVEL + 2, Math.min(SEA_LEVEL + 36, surface - 7)) : surface - 7, 8),
    make(1, SEA_LEVEL + 175 + Math.floor(unit(seed, slot, 0, 6317) * 330), 12),
    make(2, SEA_LEVEL + 810 + Math.floor(unit(seed, slot, 0, 6319) * 335), 16)];
  // Keep older generated chests intact instead of cutting off one of their cells.
  const structureSlot = Math.floor(x / STRUCTURE_SPACING);
  for (let n = structureSlot - 1; n <= structureSlot + 1; n += 1) {
    const chest = cachedStructureChest(seed, n);
    if (!chest || chest.x + 1 < x - 12 || chest.x > x + 12) continue;
    const overlap = sites.findIndex(site => chest.y + 1 >= site.top && chest.y < site.top + site.height);
    if (overlap > 0) sites[overlap].top = chest.y + 3;
  }
  return sites;
});

function biomeSiteAt(seed, x, y) {
  const alt = altitudeOf(y);
  if (alt < -100 || alt > 1165) return null;
  const sites = biomeSite(seed, Math.floor(x / BIOME_SITE_SPACING));
  if (!sites || Math.abs(x - sites[0].x) > 12) return null;
  return sites.find(site => (site.layer !== 0 || site.biome !== 'beach' || biomeAt(seed, x).key !== 'ocean')
    && y >= site.top && (y < site.top + site.height
    || (site.layer === 0 && site.biome !== 'ocean' && y <= columnOf(seed, x).height))) || null;
}

function forestSiteAt(seed, x, y) {
  const site = biomeSiteAt(seed, x, y);
  return site?.biome === 'forest' ? site : null;
}

const BIOME_SITE_MATERIALS = { blight: ['shadewood', 'blight', 'brick'],
  crimson: ['crimwood', 'flesh', 'brick'], ocean: ['sandstone', 'brick', 'slate'], beach: ['oakwood', 'sandstone', 'brick'] };

function biomeSiteTile(site, x, y) {
  const dx = x - site.x, row = y - site.top, floor = site.height - 1;
  const desert = site.biome === 'desert';
  const tundra = site.biome === 'tundra';
  const jungle = site.biome === 'jungle';
  const marsh = site.biome === 'marsh';
  const highland = site.biome === 'highlands';
  const badlands = site.biome === 'badlands';
  const savanna = site.biome === 'savanna';
  const taiga = site.biome === 'taiga';
  const plains = site.biome === 'plains';
  const specialMaterials = BIOME_SITE_MATERIALS[site.biome];
  const material = specialMaterials ? specialMaterials[site.layer] : plains ? ['oakwood', 'stone', 'brick'][site.layer] : taiga ? ['pinewood', 'granite', 'slate'][site.layer] : savanna ? ['acaciawood', 'redclay', 'sandstone'][site.layer] : badlands ? ['redclay', 'sandstone', 'brick'][site.layer] : highland ? ['stone', 'granite', 'brick'][site.layer] : marsh ? ['oakwood', 'brick', 'slate'][site.layer] : jungle ? ['mahoganywood', 'mud', 'brick'][site.layer] : tundra ? ['pinewood', 'ice', 'slate'][site.layer] : desert ? (site.layer === 2 ? 'brick' : 'sandstone')
    : site.layer === 0 ? 'oakwood' : site.layer === 1 ? 'brick' : 'ashvault-brick';
  if (row >= floor) return idOf(material);
  if (site.layer === 0 && site.biome !== 'ocean') {
    // A roof and posts over an open camp rather than a sealed underground room.
    if (row === (Math.abs(dx) > 8 ? 2 : Math.abs(dx) > 4 ? 1 : 0)) return idOf(material);
    if (Math.abs(dx) === 11 && row >= 3) return idOf(savanna ? 'acacialog' : jungle ? 'mahoganylog' : tundra || taiga ? 'pinelog' : desert ? 'sandstone' : 'oaklog');
  } else {
    if (row === 0) return idOf(material);
    if (Math.abs(dx) === 12) return site.biome !== 'ocean' && row >= floor - 3 ? AIR : idOf(material);
  }
  if (dx >= 7 && dx <= 8 && row >= floor - 2) {
    const chest = site.mimic ? (badlands || savanna || taiga || plains || specialMaterials ? 'forest-mimic' : site.biome + '-mimic') : site.layer === 2 ? 'goldchest' : 'woodchest';
    return cellOf(chest, dx - 7, row - floor + 2).id;
  }
  if (row === 2 && (dx === -8 || dx === 5)) return idOf('lantern');
  if (site.layer === 0 && dx === -6 && row === floor - 1) return idOf('campfire');
  if (site.biome === 'beach' && site.layer === 0 && row === floor - 2 && dx < -4) return idOf('oakplatform');
  if (site.biome === 'beach' && site.layer === 1 && row === floor - 1 && dx === -5) return idOf('workbench');
  if (site.biome === 'blight' && site.layer === 1 && dx === -4 && row === floor - 1) return idOf('crystal');
  if (site.biome === 'crimson' && site.layer === 1 && dx === -5 && row === floor - 1) return idOf('furnace');
  if (site.biome === 'ocean' && site.layer === 1 && dx === -5 && row === floor - 1) return idOf('workbench');
  if (specialMaterials && site.layer === 2 && row === floor - 1 && dx >= -5 && dx <= -2) return idOf('ashvault-spikes');
  if (plains && site.layer === 0 && row >= 1 && row <= 5 && Math.abs(dx) === (row - 3) ** 2) return idOf('oakplatform');
  if (plains && site.layer === 0 && row === floor - 1 && dx === -7) return idOf('oakbench');
  if (plains && site.layer === 1 && row === floor - 1 && dx === -5) return idOf('workbench');
  if (plains && site.layer === 2 && row === floor - 1 && (dx === -5 || dx === -4)) return idOf('ashvault-spikes');
  if (taiga && site.layer === 0 && row === floor - 1 && dx === -7) return idOf('pinebench');
  if (taiga && site.layer === 1 && row === floor - 1 && dx === -5) return idOf('furnace');
  if (taiga && site.layer === 2 && row === floor - 1 && (dx === -5 || dx === -4)) return idOf('glacier-spikes');
  if (savanna && site.layer === 0 && row === floor - 1 && dx === -7) return idOf('acaciabench');
  if (savanna && site.layer === 1 && row === floor - 5 && (dx < -3 || dx > 3)) return idOf('acaciaplatform');
  if (savanna && site.layer === 2 && row === floor - 1 && (dx === -6 || dx === -5)) return idOf('ashvault-spikes');
  if (badlands && site.layer === 0 && dx === -9 && row === floor - 1) return idOf('lantern');
  if (badlands && site.layer === 1 && dx === -5 && row === floor - 1) return idOf('furnace');
  if (badlands && site.layer === 2 && row === floor - 1 && dx >= -5 && dx <= -2) return idOf('ashvault-spikes');
  if (highland && site.layer === 0 && dx === -7 && row >= 3) return idOf('rope');
  if (highland && site.layer === 1 && row === floor - 1 && dx === -5) return idOf('anvil');
  if (highland && site.layer === 2 && row === floor - 1 && dx >= -7 && dx <= -4) return idOf('ashvault-spikes');
  if (marsh && site.layer === 0 && row === floor - 2 && dx < -3) return idOf('oakplatform');
  if (marsh && site.layer === 1 && Math.abs(dx) <= 6 && row >= floor - 3) return idOf('water');
  if (marsh && site.layer === 1 && row === floor - 4 && Math.abs(dx) <= 6) return idOf('oakplatform');
  if (marsh && site.layer === 2 && Math.abs(dx) <= 3 && row === floor - 1) return idOf('ashvault-spikes');
  if (jungle && site.layer === 0 && row === floor - 2 && dx < -4) return idOf('mahoganyplatform');
  if (jungle && site.layer === 1 && Math.abs(dx) <= 4 && row >= floor - 3) return idOf('water');
  if (jungle && site.layer === 1 && dx === -6 && row >= floor - 5) return idOf('vine');
  if (jungle && site.layer === 2 && (dx === -8 || dx === -7) && row === floor - 1) return idOf('ashvault-spikes');
  if (tundra && site.layer === 1 && dx === -2 && row >= floor - 3) return idOf('crystal');
  if (tundra && site.layer === 2 && Math.abs(dx) > 8 && row === floor - 1) return idOf('glacier-spikes');
  if (desert && site.layer === 1 && row >= floor - 3 && Math.abs(dx) <= 5) return idOf('water');
  if (desert && site.layer === 2 && row === floor - 1 && dx === -6) return idOf('ashvault-spikes');
  if (site.layer === 1 && row === floor - 5 && Math.abs(dx) < 8) return idOf('oakplatform');
  if (site.layer === 1 && dx === -8 && row >= floor - 4) return idOf('rope');
  if (site.layer === 2 && (dx === -4 || dx === 2) && row < floor - 3) return idOf(material);
  return AIR;
}

const OSSUARY_FLOORS = [18, 38, 58];
const OSSUARY_LOOT = ['ossuary-sabre', 'ossuary-bow', 'ossuary-staff'];
const cachedOssuary = cacheStructure(seed => {
  const side = unit(seed, 196, 31) < 0.5 ? -1 : 1;
  for (const direction of [side, -side]) {
    for (let distance = 840; distance < 2200; distance += 64) {
      const x = distance * direction;
      const y = surfaceHeight(seed, x);
      if (y >= SEA_LEVEL - 8) continue;
      const slot = Math.floor(x / STRUCTURE_SPACING);
      const overlaps = [slot - 1, slot, slot + 1].some(s => {
        const chest = cachedStructureChest(seed, s);
        return chest && Math.abs(chest.x - x) <= 25 && chest.y >= y - 9 && chest.y <= y + 58;
      });
      if (!overlaps) return { x, y };
    }
  }
  return null;
});

function dungeonLayout(seed) { return cachedOssuary(seed, 0); }

function dungeonAt(seed, x, y) {
  if (Math.abs(x) < 816 || Math.abs(x) > 2224 || y > SEA_LEVEL + 145) return null;
  const site = dungeonLayout(seed);
  if (!site) return null;
  const dy = y - site.y;
  return dy >= -8 && dy <= 145 && Math.abs(x - site.x) <= (dy < 0 ? 12 : 24) ? site : null;
}

function dungeonTile(site, x, y) {
  const dx = x - site.x;
  const dy = y - site.y;
  const brick = idOf('dungeon-brick');
  if (dy < 0) {
    if (dx === -6 && dy === -1) return idOf('dungeon-bell');
    return dy === -8 || (Math.abs(dx) === 12 && dy < -3) ? brick : AIR;
  }
  if (dy === 0) return Math.abs(dx) <= 2 ? idOf('dungeon-gate') : brick;
  if (dy >= 58) return lowerOssuaryTile(dx, dy);
  if (Math.abs(dx) === 24) return brick;
  if (OSSUARY_FLOORS.includes(dy) && Math.abs(dx) > 2) return brick;
  if (dy > 0 && dy < 18) {
    if (dx === 14) return dy < 14 ? brick : idOf('ossuary-circuit-gate');
    if (dx === 5 && dy === 17) return idOf('wire-switch');
    if (dx === 16 && dy === 17) return idOf('wire-lamp');
    if (dx >= 21 && dx <= 22 && dy >= 16) return cellOf('ossuary-workshop-cache', dx - 21, dy - 16).id;
  }
  if (dx === 0) return idOf('rope');
  for (const [row, floor] of OSSUARY_FLOORS.entries()) {
    const cx = row % 2 ? -19 : 18;
    if (dx >= cx && dx < cx + 2 && dy >= floor - 2 && dy < floor) {
      return cellOf('dungeon-cache', dx - cx, dy - floor + 2).id;
    }
    if (dy === floor - 1 && Math.abs(dx) >= 8 && Math.abs(dx) <= 10) return idOf('ashvault-spikes');
    if (dy > floor - 13 && dy < floor - 4 && Math.abs(dx) === 14) return brick;
  }
  return AIR;
}

// The first sealed expansion ends at the arena floor. Future wings can attach below.
const MECHANIST_CACHES = [-19, -1, 17];
const MECHANIST_WEAPONS = ['relay-cleaver', 'coil-carbine', 'lattice-scepter'];

function lowerOssuaryTile(dx, dy) {
  const bulkhead = idOf('ossuary-bulkhead');
  if (Math.abs(dx) === 24) return bulkhead;
  if (dy >= 100) return lensVaultTile(dx, dy, bulkhead);
  if (dy === 58) return Math.abs(dx) <= 2 ? idOf('lower-ossuary-seal') : bulkhead;

  if (dy < 74) {
    if (dx === 0) return idOf('rope');
    if (dx === 7) return dy >= 69 ? idOf('ossuary-relay-gate') : bulkhead;
    if (dx === 2 && dy === 73) return idOf('pressure-plate');
    if (dx === 6 && dy === 72) return idOf('ossuary-dart');
    if (dx === 4 && dy === 73) return idOf('wire-switch');
    if (dx === 9 && dy === 73) return idOf('wire-lamp');
    if (dx === 11 && dy === 73) return idOf('wire-switch');
    if (dx === 18 && dy === 73) return idOf('ossuary-reservoir-inlet');
    if (dx === 21 && dy === 73) return idOf('ossuary-reservoir-outlet');
    if (dy === 71 && (dx === 18 || dx === 21)) return bulkhead;
    if (dy === 72 && dx === 18) return idOf('water');
    if (dy === 72 && [17, 19, 20, 22].includes(dx)) return bulkhead;
    if (dy === 73 && [17, 19, 20, 22].includes(dx)) return bulkhead;
    return AIR;
  }
  if (dy === 74) return dx >= 13 && dx <= 15 ? idOf('ossuary-drain-gate') : bulkhead;
  if (dx === 14) return idOf('rope');
  if (dy === 98 && (dx === -13 || dx === 13)) return idOf('ossuary-dart');
  if (dy >= 94 && Math.abs(dx) === 7) return idOf('ossuary-shutter-open');
  if (dy === 97 && dx === 3) return idOf('wire-lamp');
  if (dy >= 98) {
    for (const cx of MECHANIST_CACHES) {
      if (dx === cx || dx === cx + 1) return cellOf('mechanist-armory', dx - cx, dy - 98).id;
    }
  }
  return AIR;
}

function lensVaultTile(dx, dy, bulkhead) {
  if (dy === 100) return dx >= 13 && dx <= 15 ? idOf('lens-vault-seal') : bulkhead;
  if (dy === 145) return bulkhead;
  if (dy < 121) {
    if (dx === 14 && dy <= 112) return idOf('rope');
    if (dx === 2 && dy === 114) return idOf('vault-emitter');
    if (dx === 11 && dy === 114) return idOf('vault-mirror');
    if (dx === 11 && (dy === 110 || dy === 119)) return idOf('vault-sensor');
    if (dx === 8 && dy === 119) return idOf('and-relay');
    if (dy === 120 && (dx === 4 || dx === 15)) return idOf('wire-switch');
    if (dx === 18 && dy === 119) return idOf('ossuary-dart');
    return AIR;
  }
  if (dy === 121) return dx >= 9 && dx <= 13 ? idOf('lens-vault-gate') : bulkhead;
  if (dx === 11) return idOf('rope');
  if (dx === -19 && dy === 135) return idOf('vault-emitter');
  if (dx === -10 && dy === 135) return idOf('vault-mirror');
  if (dx === -10 && dy === 141) return idOf('vault-sensor');
  if (dx === -14 && dy === 144) return idOf('wire-switch');
  if (dy === 136 && (dx === 4 || dx === 5 || dx === 6)) return idOf('oakplatform');
  if (dy === 138 && (dx === -4 || dx === -3 || dx === -2)) return idOf('oakplatform');
  return AIR;
}

function baseContainerAt(seed, x, y) {
  const dungeon = dungeonAt(seed, x, y);
  if (dungeon) {
    const armory = MECHANIST_CACHES.indexOf(x - dungeon.x);
    if (y === dungeon.y + 98 && armory >= 0) {
      return [{ key: MECHANIST_WEAPONS[armory], count: 1, kind: 'tool' }];
    }
    if (x === dungeon.x + 21 && y === dungeon.y + 16) {
      return [['wire-spool', 36], ['wire-cutters', 1], ['wire-timer', 1], ['pressure-plate', 2],
        ['actuator-block', 4], ['dart-trap', 1], ['inlet-pump', 1], ['outlet-pump', 1]]
        .map(([key, count]) => ({ key, count, kind: lootKindOf(key) }));
    }
    const row = OSSUARY_FLOORS.indexOf(y - dungeon.y + 2);
    if (row < 0 || x !== dungeon.x + (row % 2 ? -19 : 18)) return null;
    return [[OSSUARY_LOOT[row], 1], ['coin', 140 + row * 40]]
      .map(([key, count]) => ({ key, count, kind: lootKindOf(key) }));
  }
  const site = biomeSiteAt(seed, x, y);
  if (site && x === site.x + 7 && y === site.top + site.height - 3) {
    if (site.mimic) return null;
    return rollChest(seed, x, y, ['caves', 'deep', 'rich'][site.layer], { unit, kindOf: lootKindOf });
  }
  const vault = ashvaultAt(seed, x, y);
  if (vault && x === vault.x + 17 && y === vault.y + 8) {
    return [['vault-relic', 4], ['emberite-bar', 6], ['coin', 350]]
      .map(([key, count]) => ({ key, count, kind: lootKindOf(key) }));
  }
  const slot = Math.floor(x / STRUCTURE_SPACING);
  for (let s = slot - 1; s <= slot + 1; s += 1) {
    const chest = cachedStructureChest(seed, s);
    if (!chest || chest.x !== x || chest.y !== y) continue;
    const loot = rollChest(seed, x, y, chest.band, { unit, kindOf: lootKindOf });
    const kind = cachedStructurePlaced(seed, s)?.kind;
    if (kind === 'cistern') loot.push({ key: 'gills-potion', count: 2, kind: 'use' });
    if (kind === 'reliquary') loot.push({ key: 'crystal', count: 4, kind: 'block' });
    return loot;
  }
  return null;
}

function structureTileAt(seed, x, y) {
  const slot = Math.floor(x / STRUCTURE_SPACING);
  for (let s = slot - 1; s <= slot + 1; s += 1) {
    const r = cachedStructurePlaced(seed, s);
    if (!r) continue;
    const body = r.body;
    if (x < r.x0 || x >= r.x1 || y < r.y0 || y >= r.y1) continue;
    // A structure is anchored to its own column's surface, so over a neighbouring valley
    // it can reach above the ground there and carve a hole in the open hillside. It has
    // to stay buried at every column it spans, not just at its anchor.
    if (y < columnOf(seed, x).height + 8) continue;

    const lx = x - r.x0;
    const ly = y - r.y0;
    const edge = lx === 0 || lx === r.w - 1 || ly === 0 || ly === r.h - 1;

    if (r.kind === 'grotto') {
      // A large natural chamber: an eroded ellipse, open, with a flat-ish floor.
      const u = (lx - r.w / 2) / (r.w / 2);
      const v = (ly - r.h / 2) / (r.h / 2);
      const bite = (fbm2(seed, x * 0.07, y * 0.07, 6101, 2, 2, 0.5) - 0.5) * 0.5;
      if (u * u + v * v + bite > 0.95) continue;
      if (ly >= r.h - 2) return idOf('stone');
      return AIR;
    }

    if (r.kind === 'mineshaft') {
      if (ly === r.h - 1) return idOf('wood');            // the floor
      if (ly === 0) return idOf('wood');                  // the roof beam
      // Upright timbers every few tiles, and the rest open.
      if (lx % 7 === 3 && ly > 0 && ly < r.h - 1) return idOf('wood');
      return AIR;
    }

    if (r.kind === 'cistern') {
      const opening = ly >= 4 && ly <= 7 && (lx === 0 || lx === r.w - 1);
      if (edge) return opening ? AIR : idOf('brick');
      if (ly === r.h - 4 && lx % 6 < 4) return idOf('oakplatform');
      if (ly >= r.h - 5 && lx >= 4 && lx < r.w - 4 && y >= SEA_LEVEL) return idOf('water');
      if (ly === 3 && lx % 10 === 4) return idOf('lantern');
      return AIR;
    }

    if (r.kind === 'reliquary') {
      if (edge) return (lx === 0 || lx === r.w - 1) && ly >= r.h - 4 && ly < r.h - 1
        ? AIR : idOf('brick');
      if (ly === r.h - 5 && lx % 9 < 5) return idOf('oakplatform');
      if (ly === 3 && lx % 8 === 3) return idOf('lantern');
      return AIR;
    }

    const shell = r.kind === 'cabin' ? idOf('wood') : idOf('brick');
    if (edge) {
      // A ruin has collapsed in places; a cabin is whole apart from its doorway.
      const gap = fbm2(seed, x * 0.12, y * 0.12, 6107, 2, 2, 0.5);
      if (r.kind === 'ruin' && gap > 0.62) return AIR;
      if (r.kind === 'cabin' && ly >= r.h - 3 && lx === 0 && gap > 0.5) return AIR;
      return shell;
    }

    // Inside. A cabin keeps a crafting station and a torch; a ruin keeps rubble.
    if (r.kind === 'cabin') {
      const stationX = 2 + (body.slot % Math.max(1, r.w - 4));
      if (ly === r.h - 2 && lx === stationX) {
        return idOf(STRUCTURE_STATIONS[Math.abs(body.slot) % STRUCTURE_STATIONS.length]);
      }
      if (ly === 1 && (lx === 2 || lx === r.w - 3)) return idOf('torch');
      return AIR;
    }
    const rubble = fbm2(seed, x * 0.15, y * 0.15, 6113, 2, 2, 0.5);
    if (ly >= r.h - 2 && rubble > 0.56) return idOf('stone');
    return AIR;
  }
  return null;
}

// The background a structure leaves behind, so its interior reads as a room.
function structureWallAt(seed, x, y) {
  const slot = Math.floor(x / STRUCTURE_SPACING);
  for (let s = slot - 1; s <= slot + 1; s += 1) {
    const r = cachedStructurePlaced(seed, s);
    if (!r) continue;
    if (x < r.x0 || x >= r.x1 || y < r.y0 || y >= r.y1) continue;
    if (y < columnOf(seed, x).height + 8) continue;
    if (r.kind === 'grotto') return 0;
    return wallIdOf(r.kind === 'cabin' || r.kind === 'mineshaft' ? 'plankwall' : 'brickwall');
  }
  return null;
}

// --- things standing on cave floors ------------------------------------------------------
// Life crystals and pots. Both are answered from (x, y) alone, like everything else in
// this file, so a crystal that straddles a chunk seam cannot half-generate.
//
// The order matters for cost. baseTileAt runs for every cell of the world, so the cheap
// hash is tested first and the geometry - which needs six isCarved calls for a two-by-two
// object - only runs for the few thousandths of cells that pass it.

const CRYSTAL_ODDS = 0.00068;       // per candidate origin, below the crystal's depth
const CRYSTAL_MIN_DEPTH = 120;
const POT_ODDS = 0.0075;

// Does a two-by-two object fit with its origin here: four open cells with solid ground
// under both columns?
function standsOn(seed, ox, oy, w, h) {
  for (let dy = 0; dy < h; dy += 1) {
    for (let dx = 0; dx < w; dx += 1) {
      const col = columnOf(seed, ox + dx);
      const d = oy + dy - col.height;
      if (d <= 4) return false;
      if (!isCarved(seed, ox + dx, oy + dy, d, col)) return false;
      if (submergedVoid(seed, ox + dx, oy + dy, col)) return false;
      if (lavaFloor(seed, ox + dx, oy + dy)) return false;
    }
  }
  for (let dx = 0; dx < w; dx += 1) {
    const col = columnOf(seed, ox + dx);
    const d = oy + h - col.height;
    if (isCarved(seed, ox + dx, oy + h, d, col)) return false;
  }
  return true;
}

// The crystal cell at this position, if one stands here. Checked against all four
// origins a two-by-two object could have and still cover (x, y).
function crystalTileAt(seed, x, y, depth) {
  if (depth < CRYSTAL_MIN_DEPTH) return null;
  if (altitudeOf(y) >= 1250) return null;
  for (let dy = 0; dy <= 1; dy += 1) {
    for (let dx = 0; dx <= 1; dx += 1) {
      const ox = x - dx;
      const oy = y - dy;
      if (unit(seed, ox, oy, 8101) > CRYSTAL_ODDS) continue;
      if (!standsOn(seed, ox, oy, 2, 2)) continue;
      return cellOf('lifecrystal', dx, dy).id;
    }
  }
  return null;
}

function potTileAt(seed, x, y, depth, column) {
  if (depth < 12) return null;
  if (unit(seed, x, y, 8209) > POT_ODDS) return null;
  if (!standsOn(seed, x, y, 1, 1)) return null;
  return cellOf('pot', 0, 0).id;
}

// What a pot holds, decided by where it is: the same pot always breaks into the same
// things, so a pot is a place rather than a dice roll.
const POT_TABLE = [
  { key: 'coin', min: 4, max: 22, chance: 1 },
  { key: 'torch', min: 2, max: 7, chance: 0.5 },
  { key: 'arrow', min: 5, max: 14, chance: 0.18 },
  { key: 'gel', min: 1, max: 3, chance: 0.22 },
  { key: 'crystal', min: 1, max: 2, chance: 0.1 },
  { key: 'bone', min: 1, max: 3, chance: 0.12 }
];

function potContents(seed, x, y) {
  const out = [];
  for (let i = 0; i < POT_TABLE.length; i += 1) {
    const entry = POT_TABLE[i];
    if (unit(seed, x, y, 8301 + i * 7) > entry.chance) continue;
    const count = entry.min
      + Math.floor(unit(seed, x, y, 8401 + i * 7) * (entry.max - entry.min + 1));
    out.push({ key: entry.key, count: Math.max(1, count) });
    if (out.length >= 2) break;
  }
  if (out.length === 0) out.push({ key: 'coin', count: 5 });
  return out;
}

// --- weather ------------------------------------------------------------------------------
// A pure function of the world clock, like everything else here: nothing to save, and the
// same world has the same weather at the same hour in every session.
//
// Rain arrives as fronts rather than as a coin flip, which is why the field is very low
// frequency with a high threshold: most of the time it is dry, and when it rains it rains
// for half an hour. A faster field crossed its own threshold every few minutes and the
// sky flickered between wet and dry, which is the one thing weather must not do.
const RAIN_FIELD = 0.0006;
const RAIN_THRESHOLD = 0.66;
const RAIN_BAND = 0.12;
const GUST_FIELD = 0.012;

// Blood moons. A night either is one or is not, decided by a hash of which night it is,
// so the whole event costs one integer in the save and every player of a seed meets the
// same nights. Roughly one night in seven, and never the first two: a new character
// should get a little while to find a shovel.
const BLOOD_MOON_ODDS = 0.14;
const BLOOD_MOON_GRACE = 2;

function bloodMoonAt(seed, night) {
  if (night <= BLOOD_MOON_GRACE) return false;
  return unit(seed, night, 0, 9401) < BLOOD_MOON_ODDS;
}

// Where a meteor lands, given which meteor it is. Far enough away to be a journey and
// near enough to be findable, on whichever side the hash picks.
const METEOR_MIN = 180;
const METEOR_MAX = 520;

function meteorSite(seed, index) {
  const side = unit(seed, index, 0, 9501) < 0.5 ? -1 : 1;
  const away = METEOR_MIN + unit(seed, index, 0, 9511) * (METEOR_MAX - METEOR_MIN);
  const x = Math.round(side * away);
  return { x, y: columnOf(seed, x).height, side };
}

function weatherAt(seed, at, biomeKey) {
  const front = fbm1(seed, at * RAIN_FIELD, 9001, 2, 2, 0.35);
  const rain = Math.max(0, Math.min(1, (front - RAIN_THRESHOLD) / RAIN_BAND));
  const gust = fbm1(seed, at * GUST_FIELD, 9103, 2, 2, 0.5);
  // The wind blows a little always and hard in a storm, so foliage is never quite still.
  const wind = (gust - 0.5) * 2 * (0.3 + rain * 0.7);
  const cold = biomeKey === 'tundra' || biomeKey === 'taiga';
  return { rain, wind, snow: cold ? 1 : 0 };
}

function baseTileAt(seed, x, y, column = columnOf(seed, x)) {
  const dungeon = dungeonAt(seed, x, y);
  if (dungeon) return dungeonTile(dungeon, x, y);
  const surface = column.height;
  const site = biomeSiteAt(seed, x, y);
  if (site) return biomeSiteTile(site, x, y);
  // Above the ground: air, unless this column's ground lies below sea level, in which
  // case everything between the two is water. That single rule is the whole ocean.
  if (y < surface) {
    const above = skyTileAt(seed, x, y);
    if (above !== AIR) return above;
    return y >= SEA_LEVEL ? idOf('water') : AIR;
  }

  const altitude = altitudeOf(y);
  if (altitude >= VOID_START) return voidTileAt(seed, x, altitude);
  const vault = ashvaultAt(seed, x, y);
  if (vault) return ashvaultTile(vault, x, y);

  // Structures win over the rock they are set into, but not over hell or the sea, which
  // structureTileAt refuses for itself.
  // A chest is positioned from its own room's interior, never on the shell, so it can be
  // answered before the room itself. Checking it only against air left a quarter of them
  // with one cell clipped off by a ruin's rubble.
  const box = chestTileAt(seed, x, y);
  if (box !== null) return box;

  const built = structureTileAt(seed, x, y);
  if (built !== null) return built;

  // Hell's great hall, and its repeats below the hell caves.
  const hall = hallTileAt(seed, x, y);
  if (hall !== null) return hall;

  const depth = y - surface;
  const biome = column.biome;

  // The network is cut first and unconditionally: it is the thing that makes the noise
  // caves reachable, so it must not be subject to the same noise that sealed them.
  if (isCarved(seed, x, y, depth, column)) {
    const glow = fbm2(seed, x * 0.09, y * 0.09, 1901, 2, 2, 0.5);
    if (depth > 120 && glow > 0.895) return idOf('crystal');
    // A cave below the water table is not a cave, it is a flooded one. Everything above
    // sea level stays dry, so a cavern that breaches the surface drains rather than
    // holding an impossible column of water.
    if (submergedVoid(seed, x, y, column)) return idOf('water');
    // Hell's caverns hold lava in their floors rather than water in their ceilings.
    const lava = lavaFloor(seed, x, y);
    if (lava) return idOf('lava');
    const prize = crystalTileAt(seed, x, y, depth);
    if (prize !== null) return prize;
    const pot = potTileAt(seed, x, y, depth, column);
    if (pot !== null) return pot;
    return AIR;
  }

  const layer = stratum(seed, x, y, depth, column);
  if (layer === 'surface') {
    if (depth === 0) return idOf(biome.surface);
    return idOf(biome.filler);
  }
  if (layer === 'filler') {
    const pocket = fbm2(seed, x * 0.07, y * 0.07, 1801, 2, 2, 0.5);
    if (pocket > 0.84) return idOf(biome.sub);
    if (biome.filler === 'snow') return idOf('dirt');
    return idOf(biome.filler);
  }
  // A blight reaches below its grass: the stone under it is its own, for a while.
  if (layer === 'blighted') {
    const ore = oreAt(seed, x, y, depth);
    if (ore) return idOf(ore);
    return idOf(biome.sub);
  }

  const ore = oreAt(seed, x, y, depth);
  if (ore) return idOf(ore);
  if (layer === 'stone') {
    // Each biome stains its own stone layer with its own rock, mixed by a noise field so
    // the boundary is a gradient of veins rather than a line.
    const climate = column.climate;
    if (climate.rock) {
      const mix = fbm2(seed, x * 0.034, y * 0.034, 1973, 3, 2, 0.5);
      if (mix > 1 - climate.rockMix) return idOf(climate.rock);
    }
    const vein = fbm2(seed, x * 0.05, y * 0.05, 1951, 2, 2, 0.5);
    if (vein > 0.88) return idOf(climate.key === 'jungle' ? 'mud' : 'clay');
    return idOf('stone');
  }
  return idOf(layer);
}

// Which lumber each tree species is made of. A blighted tree takes its wood from the
// biome instead, since the same bare shape grows in both blights.
const TREE_LOG = {
  oak: 'oaklog', pine: 'pinelog', jungle: 'mahoganylog', acacia: 'acacialog',
  blighted: 'shadelog'
};

const TREES = {
  oak: { height: [6, 10], spacing: 11, canopy: 4, chance: 0.5 },
  pine: { height: [9, 14], spacing: 10, canopy: 3, chance: 0.55, conifer: true },
  jungle: { height: [8, 13], spacing: 10, canopy: 4, chance: 0.62, vines: true },
  // Flat-topped and sparse: a savanna reads as savanna because of the gaps between trees.
  acacia: { height: [5, 8], spacing: 17, canopy: 5, chance: 0.34, flat: true },
  // Blighted trees are bare: no canopy at all, just a crooked trunk.
  blighted: { height: [5, 11], spacing: 9, canopy: 0, chance: 0.5, bare: true },
  none: null
};

function treeAt(seed, x) {
  const column = columnOf(seed, x);
  const biome = column.biome;
  const spec = TREES[biome.tree];
  if (!spec) return null;
  // Nothing roots underwater, and nothing roots on a beach.
  if (column.height >= SEA_LEVEL - 2) return null;
  if (((x % spec.spacing) + spec.spacing) % spec.spacing !== 0) return null;
  if (unit(seed, x, 0, 2003) > spec.chance * (0.5 + column.cover)) return null;
  const span = spec.height[1] - spec.height[0];
  const height = spec.height[0] + Math.floor(unit(seed, x, 0, 2011) * (span + 1));
  const root = column.height;
  if (baseTileAt(seed, x, root) !== idOf(biome.surface)) return null;
  return { x, root, height, canopy: spec.canopy, kind: biome.tree, spec,
    trunk: biome.trunk || TREE_LOG[biome.tree] || 'oaklog' };
}

// The canopy is an egg, wider above the trunk top than below it, with its edge eroded by a
// per-tile hash. A solid ellipse of leaf tiles reads as a rectangular hedge once several
// trees stand together; a ragged edge reads as foliage.
// Lava pools. Below the top of hell, the lower part of any cavity fills: the deeper the
// altitude the higher the pool sits, so hell gets steadily less walkable the further down
// it goes rather than switching from dry to drowned at one line.
function lavaFloor(seed, x, y) {
  const alt = altitudeOf(y);
  if (alt < 1250) return false;
  // A wandering lava table rather than one flat ocean. Where the field runs low the table
  // sits far below, which leaves walkable cavern above it.
  const field = fbm1(seed, x * 0.006, 3511, 3, 2, 0.5);
  const table = 1250 + 40 + (1 - field) * 540;
  if (alt <= table) return false;
  // Dry pockets, so even the deepest caverns are not solid lava. Without these hell's
  // caves measured 0% walkable: every cavity below the table filled, and the layer was
  // pure hazard with nowhere to stand.
  const pocket = fbm2(seed, x * 0.013, y * 0.013, 3517, 2, 2, 0.5);
  return pocket < 0.6;
}

// Hell's great hollow, and what lies below it. This is not a shaft: it is the open hall
// that Terraria's Underworld is - a wide cavern with an ash ceiling above and an ash
// floor below, scattered standing columns, and lakes of lava pooled along the bottom.
//
// Below the hell caves the same hall repeats, which is what "infinite depth" means here.
// A new palette every thousand tiles would be a promise the generator cannot keep; one
// enormous recognisable place that goes on forever is a journey instead.
const HALL_TOP = 1250;
const HALL_PERIOD = 500;
const HALL_RESUME = 2170;

// Whether this altitude is inside a great hall rather than ordinary rock.
function inHall(alt) {
  if (alt >= HALL_TOP && alt < 1750) return true;
  return alt >= HALL_RESUME && alt < VOID_START;
}

function hallTileAt(seed, x, y) {
  const alt = altitudeOf(y);
  if (!inHall(alt)) return null;

  // Where in the repeating hall this row sits. The slab between one hall and the next is
  // what gives the deep world a rhythm instead of one undifferentiated void.
  const t = ((alt - HALL_TOP) % HALL_PERIOD + HALL_PERIOD) % HALL_PERIOD;
  const ceiling = 64 + (fbm1(seed, x * 0.009, 5101, 3, 2, 0.5) - 0.5) * 72;
  const floor = 432 + (fbm1(seed, x * 0.012, 5107, 3, 2, 0.5) - 0.5) * 68;

  if (t < ceiling || t > floor) {
    // The slab. Mixed rock, with ore in it, and the occasional passage punched through so
    // one hall always connects to the next.
    const bore = ridged2(seed, x * 0.02, y * 0.02, 5131, 3);
    if (bore > 0.82) return AIR;
    const ore = oreAt(seed, x, y, alt);
    if (ore) return idOf(ore);
    const mix = fbm2(seed, x * 0.03, y * 0.03, 3719, 2, 2, 0.5);
    if (mix > 0.78) return idOf('obsidian');
    return idOf(mix > 0.48 ? 'brimstone' : 'ash');
  }

  // Inside the hall: open, with standing columns and hanging formations.
  const column = fbm2(seed, x * 0.022, y * 0.011, 5113, 3, 2, 0.5);
  if (column > 0.76) {
    const ore = oreAt(seed, x, y, alt);
    if (ore) return idOf(ore);
    return idOf(column > 0.86 ? 'brimstone' : 'ash');
  }

  // Lava lakes pooled along the floor of the hall, their surface wandering.
  const lake = floor - 34 - fbm1(seed, x * 0.007, 5119, 2, 2, 0.5) * 72;
  if (t > lake) return idOf('lava');
  return AIR;
}

const ASHVAULT_SPACING = 320;
const ASHVAULT_DEPTH = 2520;

function ashvaultAt(seed, x, y) {
  const dy = altitudeOf(y) - ASHVAULT_DEPTH;
  if (dy < -11 || dy > 10) return null;
  const slot = Math.round(x / ASHVAULT_SPACING);
  const center = slot * ASHVAULT_SPACING + Math.floor((unit(seed, slot, 0, 5901) - 0.5) * 120);
  if (Math.abs(x - center) > 41) return null;
  return { x: center, y: SEA_LEVEL + ASHVAULT_DEPTH, seed };
}

function ashvaultTile(vault, x, y) {
  const dx = x - vault.x, dy = y - vault.y;
  if (Math.abs(dx) > 32) {
    if (dy === 10) return idOf('ashvault-brick');
    return dy >= 5 ? AIR : hallTileAt(vault.seed, x, y);
  }
  if (dy === -11 || dy === 10) return idOf('ashvault-brick');
  if (Math.abs(dx) === 32) return dy >= 6 ? idOf('ashvault-gate') : idOf('ashvault-brick');
  if (dx === 12) return dy >= 6 ? idOf('ashvault-gate') : idOf('ashvault-brick');
  if (dx >= 17 && dx <= 18 && dy >= 8) return cellOf('ashvault-cache', dx - 17, dy - 8).id;
  if (dy === 9 && [6, 7, -7, -8, -19, -20].includes(dx)) return idOf('ashvault-spikes');
  if (dy === 1 && (dx === -25 || dx === -12 || dx === 3 || dx === 23)) return idOf('torch');
  return AIR;
}

function voidTileAt(seed, x, altitude) {
  const depth = altitude - VOID_START;
  const band = Math.floor(depth / 132);
  const row = depth % 132;
  const shelf = Math.round((fbm1(seed, x * 0.012 + band * 11, 5911, 2, 2, 0.5) - 0.5) * 24);
  // Wide hollow strata linked by staggered shafts. A shaft meets both neighboring
  // hollows, so traveling down never depends on a lucky noise intersection.
  const slot = Math.round(x / 96);
  const shaft = slot * 96 + Math.floor((unit(seed, slot, band, 5913) - 0.5) * 36);
  const ridge = Math.round((unit(seed, Math.floor(x / 8), band, 5919) - 0.5) * 11);
  if (Math.abs(x - shaft) < 5 || (row >= 19 + shelf + ridge && row < 88 + shelf + ridge)) return AIR;
  if (unit(seed, Math.floor(x / 3), Math.floor(depth / 3), 5917) > 0.968) return idOf('void-crystal');
  return idOf('voidstone');
}

// --- everything above the ground ---------------------------------------------------
// Sky islands and planetoids are computed, not stamped. A stamped structure has to be
// scanned for from neighbouring chunks and the margin has to exceed its half-width; a
// structure that is a pure function of (x, y) cannot disagree across a seam at all, and
// an island forty tiles wide would otherwise need a margin three times the trees'.

const SKY_SPACING = 360;
const PLANETOID_SPACING = 150;
const SPACE_FLOOR = -1800;

function skyIslandAt(seed, slot) {
  if (unit(seed, slot, 0, 4001) > 0.55) return null;
  const cx = slot * SKY_SPACING + SKY_SPACING * (0.2 + unit(seed, slot, 0, 4003) * 0.6);
  const alt = -300 - unit(seed, slot, 0, 4007) * 400;
  const rx = 16 + unit(seed, slot, 0, 4011) * 26;
  const ry = 5 + unit(seed, slot, 0, 4013) * 6;
  return { cx: Math.round(cx), cy: Math.round(SEA_LEVEL + alt), rx, ry, slot };
}

function planetoidAt(seed, slot) {
  if (unit(seed, slot, 0, 4101) > 0.42) return null;
  const cx = slot * PLANETOID_SPACING + PLANETOID_SPACING * (0.15 + unit(seed, slot, 0, 4103) * 0.7);
  const alt = -800 - unit(seed, slot, 0, 4107) * 700;
  const r = 5 + unit(seed, slot, 0, 4111) * 9;
  return { cx: Math.round(cx), cy: Math.round(SEA_LEVEL + alt), r, slot };
}

// A floating island: a gentle dome on top and a tapered keel underneath, which is what
// separates an island from a lens. Grass, then soil, then the stone it rides on.
function islandTile(seed, island, x, y) {
  const u = (x - island.cx) / island.rx;
  if (u <= -1 || u >= 1) return AIR;
  const span = Math.sqrt(Math.max(0, 1 - u * u));
  const edge = (fbm1(seed, x * 0.09 + island.slot * 13, 4017, 2, 2, 0.5) - 0.5) * 2.4;
  const top = island.cy - Math.round(island.ry * 0.38 * span + edge);
  const keel = island.cy + Math.round(island.ry * Math.pow(span, 0.6) * 1.8 + edge);
  if (y < top || y > keel) return AIR;
  const depth = y - top;
  if (depth === 0) return idOf('grass');
  if (depth < 2 + Math.round(span * 3)) return idOf('dirt');
  const ore = fbm2(seed, x * 0.08, y * 0.08, 4019, 2, 2, 0.5);
  // Every island has a central seam in its keel plus scattered pockets.
  if ((Math.abs(x - island.cx) < 3 && Math.abs(y - (island.cy + island.ry)) < 2)
    || (ore > 0.77 && depth >= 7 && span > 0.45)) return idOf('aetherite');
  if (ore > 0.86) return idOf(depth > island.ry ? 'gold' : 'copper');
  return idOf('skystone');
}

// A planetoid: a rough sphere, eroded at its edge, with a core of starrock.
function planetoidTile(seed, body, x, y) {
  const dx = x - body.cx;
  const dy = (y - body.cy) * 1.15;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const wobble = (fbm2(seed, x * 0.11, y * 0.11, 4113, 2, 2, 0.5) - 0.5) * body.r * 0.5;
  const edge = body.r + wobble;
  if (dist > edge) return AIR;
  if (dist > edge - 1.5) return idOf('skystone');
  const ore = fbm2(seed, x * 0.09, y * 0.09, 4117, 2, 2, 0.5);
  if (ore > 0.8) return idOf(dist < edge * 0.5 ? 'emberite' : 'silver');
  return dist < edge * 0.55 ? idOf('starrock') : idOf('skystone');
}

const FOUNDRY_PADS = [[-36, -23, 0], [-14, -2, -3], [7, 20, -6], [29, 63, -8]];

function foundryLayout(seed) {
  return { x: unit(seed, 2388, 901) < 0.5 ? -384 : 384, y: SEA_LEVEL - 870 };
}

function foundryAt(seed, x, y) {
  if (y < SEA_LEVEL - 908 || y > SEA_LEVEL - 864 || Math.abs(x) > 455) return null;
  const site = foundryLayout(seed);
  return x >= site.x - 39 && x <= site.x + 66 ? site : null;
}

function foundryTile(site, x, y) {
  const dx = x - site.x, dy = y - site.y;
  if (dx === 31 && dy === -9) return idOf('foundry-console');
  for (const [left, right, floor] of FOUNDRY_PADS) {
    if (dx < left || dx > right) continue;
    if (dy === floor) return idOf(dx === left || dx === right ? 'foundry-pad' : 'foundry-alloy');
    if (dy > floor && dy <= floor + 3 && dx >= left + dy - floor && dx <= right - dy + floor) return idOf('foundry-alloy');
    if (dy === floor - 1 && (dx === left + 2 || dx === right - 2)) return idOf('foundry-pylon');
  }
  if (dy === -9 && [38, 47, 56].includes(dx)) return idOf('foundry-pylon');
  return AIR;
}

function skyTileAt(seed, x, y) {
  const foundry = foundryAt(seed, x, y);
  if (foundry) return foundryTile(foundry, x, y);
  const alt = altitudeOf(y);
  if (alt >= -250) return AIR;

  if (alt >= -750) {
    const slot = Math.floor(x / SKY_SPACING);
    for (let s = slot - 1; s <= slot + 1; s += 1) {
      const island = skyIslandAt(seed, s);
      if (!island) continue;
      if (x < island.cx - island.rx - 2 || x > island.cx + island.rx + 2) continue;
      const found = islandTile(seed, island, x, y);
      if (found !== AIR) return found;
    }
    // Cloud banks: discrete puffs you can land on, not a ceiling. The first attempt used
    // a very low x-frequency, which produced one continuous white slab across the whole
    // sky - it read as a wall and hid the islands behind it.
    const puff = fbm2(seed, x * 0.022, y * 0.075, 4201, 3, 2, 0.5);
    // Thinned toward the edges of the layer so clouds sit in bands rather than fill it.
    const band = Math.abs(alt + 500) / 250;
    if (puff - band * 0.14 > 0.88) return idOf('cloud');
    return AIR;
  }

  if (alt < SPACE_FLOOR) return AIR;
  const slot = Math.floor(x / PLANETOID_SPACING);
  for (let s = slot - 1; s <= slot + 1; s += 1) {
    const body = planetoidAt(seed, s);
    if (!body) continue;
    if (x < body.cx - body.r - 4 || x > body.cx + body.r + 4) continue;
    const found = planetoidTile(seed, body, x, y);
    if (found !== AIR) return found;
  }
  return AIR;
}

function stampTree(write, seed, tree) {
  const trunk = idOf(tree.trunk || 'oaklog');
  const leaf = idOf('leaves');
  const spec = tree.spec || TREES[tree.kind] || {};
  for (let i = 1; i <= tree.height; i += 1) write(tree.x, tree.root - i, trunk);
  const top = tree.root - tree.height;

  // A blighted tree has no canopy: a few crooked branches and nothing else.
  if (spec.bare) {
    for (let i = 2; i < tree.height; i += 2) {
      if (unit(seed, tree.x, i, 2041) > 0.55) continue;
      const dir = unit(seed, tree.x, i, 2043) < 0.5 ? -1 : 1;
      const len = 1 + Math.floor(unit(seed, tree.x, i, 2047) * 2);
      for (let j = 1; j <= len; j += 1) write(tree.x + dir * j, tree.root - i, trunk);
    }
    return;
  }

  // Branches. Without them a trunk is a pole with a hat, which is exactly how the first
  // version read. A branch is two or three trunk tiles stepping outward and up, with a
  // tuft of leaves on its end, placed only on the upper half so the lower trunk stays
  // clear enough to walk past.
  if (!spec.conifer) {
    const from = Math.max(2, Math.floor(tree.height * 0.45));
    for (let i = from; i < tree.height - 1; i += 2) {
      if (unit(seed, tree.x, i, 2051) > 0.42) continue;
      const dir = unit(seed, tree.x, i, 2053) < 0.5 ? -1 : 1;
      const len = 1 + Math.floor(unit(seed, tree.x, i, 2057) * 2);
      let bx = tree.x;
      let by = tree.root - i;
      for (let j = 0; j < len; j += 1) {
        bx += dir;
        if (j > 0) by -= 1;
        write(bx, by, trunk);
      }
      for (let lx = -1; lx <= 1; lx += 1) {
        for (let ly = -1; ly <= 0; ly += 1) {
          if (lx === 0 && ly === 0) continue;
          write(bx + lx, by + ly, leaf);
        }
      }
    }
  }

  // A root flare: one tile either side at the base, so a trunk meets the ground instead
  // of being planted in it like a post.
  if (unit(seed, tree.x, 0, 2059) < 0.7) {
    write(tree.x - 1, tree.root - 1, trunk);
  }
  if (unit(seed, tree.x, 0, 2061) < 0.7) {
    write(tree.x + 1, tree.root - 1, trunk);
  }

  const r = tree.canopy;
  for (let dy = -r - 1; dy <= r; dy += 1) {
    for (let dx = -r; dx <= r; dx += 1) {
      // Conifers taper to a point, flat-tops spread sideways, everything else is an egg.
      let stretch;
      if (spec.conifer) stretch = dy > 0 ? dy / 0.95 : dy / 1.9;
      else if (spec.flat) stretch = dy > 0 ? dy / 0.45 : dy / 0.8;
      else stretch = dy > 0 ? dy / 0.72 : dy / 1.25;
      const squash = spec.flat ? 1.25 : 1;
      const ratio = Math.sqrt((dx * dx) / (r * r * squash * squash)
        + (stretch * stretch) / (r * r));
      if (ratio > 1) continue;
      if (ratio > 0.58 && unit(seed, tree.x * 31 + dx, top + dy, 2029) < (ratio - 0.58) * 2.3) continue;
      if (dx === 0 && dy > 1) continue;
      write(tree.x + dx, top + dy - 1, leaf);
    }
  }
  if (spec.vines) {
    for (let dx = -r; dx <= r; dx += 2) {
      const len = 1 + Math.floor(unit(seed, tree.x + dx, tree.root, 2017) * 4);
      for (let i = 0; i < len; i += 1) write(tree.x + dx, top + i, idOf('vine'));
    }
  }
}

function decorate(write, seed, x, yFrom, yTo) {
  const column = columnOf(seed, x);
  const biome = column.biome;
  const surface = column.height;
  const flora = FLORA[biome.key];

  if (flora && unit(seed, x, 0, 2101) < flora.chance * (0.65 + column.cover * 0.7)) {
    const key = pickProp(seed, x, flora.props);
    const underwater = surface > SEA_LEVEL;
    // Seaweed and coral only grow submerged; everything else only grows in air. Shells
    // are the exception that proves the rule: they belong on the sea bed and on the
    // beach alike, which is the one place a player expects to find them.
    const wetOnly = key === 'seaweed' || key === 'coral';
    const anywhere = key === 'shell';
    if (anywhere || wetOnly === underwater) {
      if (key === 'bamboo') {
        // Bamboo is a stalk, not a tuft: it grows several tiles up from its root.
        const tall = 3 + Math.floor(unit(seed, x, 0, 2137) * 5);
        for (let i = 1; i <= tall; i += 1) write(x, surface - i, idOf('bamboo'));
      } else if (key === 'cactus') {
        const tall = 2 + Math.floor(unit(seed, x, 0, 2139) * 3);
        for (let i = 1; i <= tall; i += 1) write(x, surface - i, idOf('cactus'));
      } else if (key === 'seaweed') {
        // Clamped to the water above it, or a stalk in a shallow bay grows out into the
        // air. The depth here is exactly how far the sea bed sits below sea level.
        const room = surface - SEA_LEVEL;
        const tall = Math.min(room, 1 + Math.floor(unit(seed, x, 0, 2141) * 4));
        for (let i = 1; i <= tall; i += 1) write(x, surface - i, idOf('seaweed'));
      } else {
        write(x, surface - 1, idOf(key));
      }
    }
  }

  // Underground growth: moss near the surface, mushrooms deep, and the blights' own caps
  // wherever their rock reaches. Placed on the ceiling-facing side of any solid floor.
  // Bounded to the rows the caller is actually building. This used to run to a fixed
  // world height, which wasted most of its work and, once the world lost its floor,
  // would simply never have returned.
  const blighted = biome.key === 'blight' || biome.key === 'crimson';
  const y0 = Math.max(surface + 1, yFrom === undefined ? surface + 1 : yFrom);
  const y1 = yTo === undefined ? surface + 400 : yTo;
  for (let y = y0; y < y1; y += 1) {
    const depth = y - surface;
    if (depth < 24) continue;
    if (unit(seed, x, y, 2203) < 0.9945) continue;
    if (baseTileAt(seed, x, y) !== AIR) continue;
    if (baseTileAt(seed, x, y + 1) === AIR) continue;
    let key;
    if (blighted && depth < 90) key = biome.key === 'blight' ? 'blightshroom' : 'fleshshroom';
    else if (depth > 200) key = 'mushroom';
    else key = 'glowmoss';
    write(x, y, idOf(key));
  }
}

// The wall behind a tile, which is what remains visible when the block is mined out. It is
// chosen from the stratum rather than the block, so a cave cut through stone still shows
// stone wall, and an ore pocket does not leave an ore-coloured hole.
function baseWallAt(seed, x, y, column = columnOf(seed, x)) {
  const dungeon = dungeonAt(seed, x, y);
  if (dungeon) return y < dungeon.y ? 0 : wallIdOf('dungeon-wall');
  const site = biomeSiteAt(seed, x, y);
  if (site) return wallIdOf(site.layer === 0 && site.biome !== 'desert' ? 'plankwall'
    : (site.biome === 'jungle' || site.biome === 'marsh') && site.layer === 1 ? 'mudwall' : site.biome === 'tundra' ? 'snowwall' : site.biome === 'desert' ? 'sandwall' : site.biome === 'badlands' ? 'redclaywall' : 'brickwall');
  const depth = y - column.height;
  if (depth < 0) {
    // A sky structure carries its own wall, so digging into an island leaves a room
    // rather than a hole with daylight behind it.
    if (skyTileAt(seed, x, y) === AIR) return 0;
    return altitudeOf(y) < -750 ? wallIdOf('skywall') : wallIdOf('dirtwall');
  }
  if (altitudeOf(y) >= VOID_START) return wallIdOf('void-wall');
  if (ashvaultAt(seed, x, y)) return wallIdOf('ashvault-wall');
  const built = structureWallAt(seed, x, y);
  if (built !== null) return built;
  const layer = stratum(seed, x, y, depth, column);
  if (layer === 'surface' || layer === 'filler' || layer === 'blighted') {
    return wallIdOf(column.biome.wall);
  }
  if (layer === 'stone') return wallIdOf('stonewall');
  if (layer === 'granite') return wallIdOf('granitewall');
  if (layer === 'basalt') return wallIdOf('basaltwall');
  if (layer === 'ash' || layer === 'obsidian') return wallIdOf('ashwall');
  if (layer === 'brimstone') return wallIdOf('brimstonewall');
  return wallIdOf('slatewall');
}

// Whether a structure or prop may be stamped over whatever is already there. Foliage and
// leaves only ever fill empty space: a prop must never replace a tree trunk, a block, or
// another prop. Water counts as empty for the things that grow in it, which is how
// seaweed and coral reach the sea bed.
//
// This used to be written out twice, once in generateChunk and once in the seam test's
// reference builder. Updating one and not the other made the two disagree, and since the
// test's whole job is to prove they agree, the duplicate quietly turned the oracle into a
// liar. One copy, exported, used by both.
const GROWS_IN_WATER = ['seaweed', 'coral', 'shell'];
const WET_ONLY = ['seaweed', 'coral'];

function canStamp(existing, id) {
  const spec = tile(id);
  if (!spec.decor && id !== idOf('leaves') && id !== idOf('vine')) return true;
  if (existing === AIR) return true;
  if (existing !== idOf('water')) return false;
  return GROWS_IN_WATER.indexOf(spec.key) !== -1;
}

// Identity helpers the live world asks for, so chunks.js never needs its own copy of the
// tile registry just to tell water from rock.
// Which vertical band an absolute y falls in. Pure in y, so it costs nothing to ask per
// tile and two chunks can never disagree about where hell begins.
function layerAt(y) {
  const alt = y - SEA_LEVEL;
  for (let i = 0; i < LAYERS.length; i += 1) {
    if (alt >= LAYERS[i].from && alt < LAYERS[i].to) return LAYERS[i];
  }
  return LAYERS[LAYERS.length - 1];
}

function altitudeOf(y) {
  return y - SEA_LEVEL;
}

// How much water a tile holds before anyone has touched it. Anything non-solid below the
// local water surface is wet, including the shells, seaweed and coral that grow down
// there: without this they punch air pockets in the sea, because a tile can hold only one
// block id and the decor was winning. Stored levels override this, exactly as tile and
// wall edits override their own base functions, so nothing has to be saved for an ocean.
function baseLevelAt(seed, x, y) {
  if (altitudeOf(y) >= VOID_START) return 0;
  const id = baseTileAt(seed, x, y);
  const spec = tile(id);
  if (spec.liquid) return 255;
  if (spec.solid || dungeonAt(seed, x, y) || biomeSiteAt(seed, x, y)?.biome === 'ocean') return 0;
  const column = columnOf(seed, x);
  if (y < column.height) return y >= SEA_LEVEL ? 255 : 0;
  return submergedVoid(seed, x, y, column) ? 255 : 0;
}

function isLiquidId(id) {
  return !!tile(id).liquid;
}

function isSolidId(id) {
  return !!tile(id).solid;
}

const HALLOW_BIOME = { key: 'hallow', name: 'The Hallow' };
const HALLOW_SURFACES = new Set(['grass', 'junglegrass', 'snow', 'sand', 'peat', 'redclay', 'blightgrass', 'fleshgrass', 'stone']);
const HARDMODE_STONE = new Set(['stone', 'granite', 'basalt', 'slate', 'brimstone', 'cinderstone', 'ash', 'voidstone']);
const HALLOW_CRYSTALS = ['ray-crystal', 'storm-crystal', 'ward-crystal'];

function isHallowRegion(seed, x) {
  if (Math.abs(x) < 480) return false;
  const region = Math.floor(x / 420);
  return Math.abs(x - (region * 420 + 210)) < 160 && unit(seed, region, 0, 8811) < 0.45
    && !columnOf(seed, x).biome.drowned;
}

function hardmodeTileAt(seed, x, y, id) {
  const key = tile(id).key;
  const altitude = altitudeOf(y);
  if (altitude < -110) return id;
  if (HALLOW_SURFACES.has(key) && isHallowRegion(seed, x)
    && y === surfaceHeight(seed, x)) return idOf('hallowgrass');
  if (!HARDMODE_STONE.has(key)) return id;
  const vein = unit(seed, Math.floor(x / 3), Math.floor(y / 3), 8819);
  if (altitude >= 1950 && vein > 0.972) return idOf('adamantite');
  if (altitude >= 850 && altitude < 1950 && vein > 0.969) return idOf('mythril');
  if (altitude >= 160 && altitude < 850 && vein > 0.966) return idOf('palladium');
  if (!isHallowRegion(seed, x) || altitude < 25 || altitude > 740) return id;
  if (vein > 0.94) {
    return idOf(HALLOW_CRYSTALS[Math.floor(unit(seed, Math.floor(x / 3), Math.floor(y / 3), 8821) * 3)]);
  }
  return vein > 0.55 ? idOf('prismstone') : id;
}

function generateChunk(seed, cx, cy) {
  // Sixteen bits per tile, not eight. Six wood species with a full furniture set each
  // had the registry at 151 of a possible 255, and beds alone would have added 48 more;
  // the ceiling was close enough to start shaping what could be built. A chunk is 48x48,
  // so this costs 4.6KB per layer per chunk and removes the limit entirely.
  const tiles = new Uint16Array(CHUNK * CHUNK);
  const walls = new Uint16Array(CHUNK * CHUNK);
  const x0 = cx * CHUNK;
  const y0 = cy * CHUNK;
  for (let tx = 0; tx < CHUNK; tx += 1) {
    const x = x0 + tx;
    const column = columnOf(seed, x);
    for (let ty = 0; ty < CHUNK; ty += 1) {
      const index = ty * CHUNK + tx;
      tiles[index] = baseTileAt(seed, x, y0 + ty, column);
      walls[index] = baseWallAt(seed, x, y0 + ty, column);
    }
  }
  const write = (wx, wy, id) => {
    const lx = wx - x0;
    const ly = wy - y0;
    if (lx < 0 || lx >= CHUNK || ly < 0 || ly >= CHUNK) return;
    if (dungeonAt(seed, wx, wy) || !canStamp(tiles[ly * CHUNK + lx], id)) return;
    tiles[ly * CHUNK + lx] = id;
  };
  for (let wx = x0 - STRUCTURE_MARGIN; wx < x0 + CHUNK + STRUCTURE_MARGIN; wx += 1) {
    const tree = treeAt(seed, wx);
    if (tree) stampTree(write, seed, tree);
    decorate(write, seed, wx, y0 - 1, y0 + CHUNK + 1);
  }
  return { tiles, walls };
}

// The module's public surface, declared once. index.html used to repeat these
// names by hand, and three separate times a new export was added here and
// forgotten there, which broke the game at runtime while every test passed.
const EXPORTS_worldgen = {
    CHUNK, HALLOW_BIOME, isHallowRegion, hardmodeTileAt, WORLD_H, SKY_H, STRUCTURE_MARGIN, BIOMES, TREES, ORE_BANDS,
    LAYERS, VOID_START, ASHVAULT_DEPTH, ashvaultAt, dungeonAt, dungeonLayout, MECHANIST_CACHES, MECHANIST_WEAPONS, FOREST_SITES, DESERT_SITES, TUNDRA_SITES, JUNGLE_SITES, MARSH_SITES, HIGHLAND_SITES, biomeSiteAt, forestSiteAt, layerAt, altitudeOf, TREE_LOG, BLEND_FIELD, BLEND_THRESHOLD, climateChoice,
    climateX, smoothWeights, regionalBiome, CLIMATE_REGION_WIDTH, CLIMATE_JOSTLE, JOSTLE_FIELD,
    homeFactor, HOME_FLAT, HOME_FADE, START_FOREST_CHUNKS, START_FOREST_EDGE,
    lavaFloor, submergedVoid, hallTileAt, inHall, HALL_TOP, HALL_PERIOD, HALL_RESUME, skyTileAt,
    foundryLayout, foundryAt, FOUNDRY_PADS, skyIslandAt, planetoidAt, islandTile, planetoidTile, SKY_SPACING, PLANETOID_SPACING, SPACE_FLOOR,
    SEA_LEVEL, BEACH_BAND, BY_BIOME, CLIMATE_BIOMES,
    temperature, moisture, continent, climateWeights, columnOf, blightAt, climateAt,
    CAVE_PROFILES, caveProfile, caveThreshold, floodFloor, FLORA, pickProp, canStamp, GROWS_IN_WATER, WET_ONLY,
    inGallery, inShaft, inNetwork, isCarved, GALLERY_SPACING, SHAFT_SPACING,
    STRUCTURE_SPACING, structureAt, structureRect, structurePlaced: computeStructurePlaced, structureTileAt, structureWallAt,
    crystalTileAt, potTileAt, potContents, standsOn, weatherAt, RAIN_FIELD, RAIN_THRESHOLD,
    bloodMoonAt, BLOOD_MOON_ODDS, BLOOD_MOON_GRACE, meteorSite, METEOR_MIN, METEOR_MAX, POT_TABLE, CRYSTAL_ODDS, CRYSTAL_MIN_DEPTH, POT_ODDS,
    structureChest: computeStructureChest, chestTileAt, baseContainerAt,
    isLiquidId, isSolidId, baseLevelAt, get WATER_ID() { return idOf('water'); },
    biomeAt, biomeIndex, heightBias, surfaceHeight, caveDensity, stratum, oreAt,
    baseTileAt, baseWallAt, treeAt, stampTree, decorate, generateChunk
  };

if (typeof module !== 'undefined' && module.exports) {

  const rng = require('./rng.js');
  const noise = require('./noise.js');
  const tiles = require('./tiles.js');
  global.unit = rng.unit;
  global.fbm1 = noise.fbm1;
  global.smooth = noise.smooth;
  global.fbm2 = noise.fbm2;
  global.ridged2 = noise.ridged2;
  global.AIR = tiles.AIR;
  global.idOf = tiles.idOf;
  global.tile = tiles.tile;
  global.cellOf = tiles.cellOf;
  global.rollChest = require('./loot.js').rollChest;
  global.wallIdOf = tiles.wallIdOf;
  module.exports = EXPORTS_worldgen;
} else if (typeof FATHOM !== 'undefined') {
  FATHOM.worldgen = EXPORTS_worldgen;
}
