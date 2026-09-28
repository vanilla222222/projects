// Biome definitions and classification logic.
// Three driving fields per map cell: altitude, temperature, humidity (all 0..1),
// plus hydrology flags (ocean / lake / river) computed by mapGenerator.js.

const BIOME = {
	OCEAN_DEEP: 'OCEAN_DEEP',
	OCEAN: 'OCEAN',
	FROZEN_OCEAN: 'FROZEN_OCEAN',
	LAKE: 'LAKE',
	RIVER: 'RIVER',
	POND: 'POND',
	BEACH: 'BEACH',

	DESERT: 'DESERT',
	FROZEN_DESERT: 'FROZEN_DESERT',
	SAVANNA: 'SAVANNA',
	STEPPE: 'STEPPE',
	GRASSLAND: 'GRASSLAND',
	SHRUBLAND: 'SHRUBLAND',
	PLAINS: 'PLAINS',

	FOREST_TEMPERATE: 'FOREST_TEMPERATE',
	TAIGA: 'TAIGA',
	JUNGLE: 'JUNGLE',
	SWAMP: 'SWAMP',
	WETLAND: 'WETLAND',
	BOG: 'BOG',
	MANGROVE: 'MANGROVE',
	WOODLAND: 'WOODLAND',
	DRY_FOREST: 'DRY_FOREST',
	RAINFOREST: 'RAINFOREST',
	CLOUD_FOREST: 'CLOUD_FOREST',
	REDWOOD_FOREST: 'REDWOOD_FOREST',

	TUNDRA: 'TUNDRA',
	HILLS: 'HILLS',
	BADLANDS: 'BADLANDS',
	MOUNTAINS: 'MOUNTAINS',
	ALPINE: 'ALPINE',
	GLACIER: 'GLACIER',
	CLIFF: 'CLIFF',
};

// Display metadata: color used by the renderer and a human-readable label.
const BIOME_INFO = {
	[BIOME.OCEAN_DEEP]: { name: 'Deep Ocean', color: '#0b3d6b' },
	[BIOME.OCEAN]: { name: 'Ocean', color: '#1c6ea4' },
	[BIOME.FROZEN_OCEAN]: { name: 'Frozen Ocean', color: '#bfe3ec' },
	[BIOME.LAKE]: { name: 'Lake', color: '#3a8fc7' },
	[BIOME.RIVER]: { name: 'River', color: '#4fa3d1' },
	[BIOME.POND]: { name: 'Pond', color: '#5aa3c9' },
	[BIOME.BEACH]: { name: 'Beach', color: '#e0d29a' },

	[BIOME.DESERT]: { name: 'Desert', color: '#e3c16f' },
	[BIOME.FROZEN_DESERT]: { name: 'Frozen Desert', color: '#d8dfe0' },
	[BIOME.SAVANNA]: { name: 'Savanna', color: '#c9b45c' },
	[BIOME.STEPPE]: { name: 'Steppe', color: '#b6a869' },
	[BIOME.GRASSLAND]: { name: 'Grassland', color: '#a3c060' },
	[BIOME.SHRUBLAND]: { name: 'Shrubland', color: '#94a352' },
	[BIOME.PLAINS]: { name: 'Plains', color: '#8fbf5a' },

	[BIOME.FOREST_TEMPERATE]: { name: 'Temperate Forest', color: '#3f7d3a' },
	[BIOME.TAIGA]: { name: 'Taiga', color: '#3d6b57' },
	[BIOME.JUNGLE]: { name: 'Jungle', color: '#1f7a3d' },
	[BIOME.SWAMP]: { name: 'Swamp', color: '#4f6b4a' },
	[BIOME.WETLAND]: { name: 'Wetland', color: '#7c9463' },
	[BIOME.BOG]: { name: 'Bog', color: '#5c6b52' },
	[BIOME.MANGROVE]: { name: 'Mangrove', color: '#2f6b52' },
	[BIOME.WOODLAND]: { name: 'Woodland', color: '#6f9a4a' },
	[BIOME.DRY_FOREST]: { name: 'Dry Forest', color: '#8a9a4f' },
	[BIOME.RAINFOREST]: { name: 'Rainforest', color: '#146b2e' },
	[BIOME.CLOUD_FOREST]: { name: 'Cloud Forest', color: '#4a7a6b' },
	[BIOME.REDWOOD_FOREST]: { name: 'Redwood Forest', color: '#2f5a33' },

	[BIOME.TUNDRA]: { name: 'Tundra', color: '#93a893' },
	[BIOME.HILLS]: { name: 'Hills', color: '#7a9a4e' },
	[BIOME.BADLANDS]: { name: 'Badlands', color: '#a8683f' },
	[BIOME.MOUNTAINS]: { name: 'Mountains', color: '#8a8a86' },
	[BIOME.ALPINE]: { name: 'Alpine / Snow Peak', color: '#f2f5f7' },
	[BIOME.GLACIER]: { name: 'Glacier', color: '#a9dcee' },
	[BIOME.CLIFF]: { name: 'Cliff', color: '#6b5f56' },
};

// Numeric biome IDs: the world grid stores these (a Uint8Array) instead of
// the string keys above — on a multi-million-cell map that's the difference
// between a few MB and tens of MB, and array indexing beats a string-keyed
// object lookup on every pixel the renderer touches every frame.
const BIOME_KEYS = Object.keys(BIOME);
const BIOME_ID = {};
const BIOME_LIST = [];
BIOME_KEYS.forEach((key, id) => {
	BIOME_ID[key] = id;
	BIOME_LIST[id] = key;
});

// Precomputed RGB per biome id (3 bytes each) so the renderer's per-pixel
// biome-color lookup is a direct array index, not a hex-string parse.
const BIOME_COLOR_TABLE = new Uint8Array(BIOME_LIST.length * 3);
BIOME_LIST.forEach((key, id) => {
	const hex = BIOME_INFO[key].color;
	const v = parseInt(hex.slice(1), 16);
	BIOME_COLOR_TABLE[id * 3] = (v >> 16) & 255;
	BIOME_COLOR_TABLE[id * 3 + 1] = (v >> 8) & 255;
	BIOME_COLOR_TABLE[id * 3 + 2] = v & 255;
});

// Tunable thresholds for classification.
const BIOME_THRESHOLDS = {
	seaLevel: 0.42,
	deepOceanLevel: 0.22,
	beachWidth: 0.02,
	mangroveWidth: 0.035,
	mangroveTemp: 0.6,
	mangroveHumidity: 0.5,
	hillLevel: 0.62,
	mountainLevel: 0.8,
	glacierTemp: 0.22,
	cliffSlope: 0.14, // altitude jump between adjacent tiles that reads as a cliff face
	coldTemp: 0.33,
	hotTemp: 0.66,
	aridHumidity: 0.2,
	shrubHumidity: 0.28,
	dryHumidity: 0.4,
	mediumHumidity: 0.6,
	veryHumidHumidity: 0.72,
	humidHumidity: 0.8,
};

// Glaciers form at the highest, coldest peaks — thick permanent ice rather
// than the thin seasonal snow of an alpine cap. Shared between biome
// classification and river-sourcing (rivers spawn at glacier melt points).
function isGlacierConditions(altitude, temperature, t = BIOME_THRESHOLDS) {
	return altitude >= t.mountainLevel && temperature < t.glacierTemp;
}

function classifyLandBiome(altitude, temperature, humidity, t = BIOME_THRESHOLDS) {
	// High altitude bands: hills, mountains, alpine snowcaps (cold or very high).
	if (altitude >= t.mountainLevel) {
		if (isGlacierConditions(altitude, temperature, t)) return BIOME.GLACIER;
		return temperature < 0.45 ? BIOME.ALPINE : BIOME.MOUNTAINS;
	}
	if (altitude >= t.hillLevel) {
		if (temperature < 0.3) return BIOME.ALPINE;
		if (humidity < t.aridHumidity) return BIOME.BADLANDS;
		// Misty montane forest: humid hillside air condensing as it rises,
		// too cool up here to count as the "hot" band below.
		if (humidity > t.humidHumidity && temperature < t.hotTemp) return BIOME.CLOUD_FOREST;
		return BIOME.HILLS;
	}

	const cold = temperature < t.coldTemp;
	const hot = temperature > t.hotTemp;
	const temperate = !cold && !hot;

	// Low-lying and wet: a graded band from marshy wetland up to full swamp/bog,
	// sitting between dry land and open water as humidity climbs.
	const lowLying = altitude < t.seaLevel + 0.08;
	if (lowLying && humidity > t.mediumHumidity) {
		if (humidity <= t.humidHumidity) return BIOME.WETLAND;
		return cold ? BIOME.BOG : BIOME.SWAMP;
	}

	if (cold) {
		if (humidity < t.dryHumidity) return BIOME.FROZEN_DESERT;
		if (humidity < t.mediumHumidity) return BIOME.TUNDRA;
		return BIOME.TAIGA;
	}

	if (hot) {
		if (humidity < t.aridHumidity) return BIOME.DESERT;
		if (humidity < t.dryHumidity) return BIOME.SAVANNA;
		if (humidity < t.mediumHumidity) return BIOME.DRY_FOREST; // tree-dotted transition out of savanna
		if (humidity < t.humidHumidity) return BIOME.JUNGLE;
		return BIOME.RAINFOREST; // the wettest, densest hot forest
	}

	// temperate
	if (humidity < t.aridHumidity) return BIOME.STEPPE;
	if (humidity < t.shrubHumidity) return BIOME.SHRUBLAND; // dry scrubby band between steppe and grassland
	if (humidity < t.dryHumidity) return BIOME.GRASSLAND;
	if (humidity < t.mediumHumidity) return BIOME.PLAINS;
	if (humidity < t.veryHumidHumidity) return BIOME.WOODLAND; // sparse trees, transition into full forest
	if (humidity < t.humidHumidity) return BIOME.FOREST_TEMPERATE;
	return BIOME.REDWOOD_FOREST; // the wettest temperate band, dense old growth
}

function classifyWaterBiome(altitude, temperature, t = BIOME_THRESHOLDS) {
	if (temperature < 0.15) return BIOME.FROZEN_OCEAN;
	return altitude < t.deepOceanLevel ? BIOME.OCEAN_DEEP : BIOME.OCEAN;
}
