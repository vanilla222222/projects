const PG = 29;
const PG_V1 = 17;
const PG_V2 = 23;
const PLANT_WEIGHTS = [1.4, 1.4, 0.6, 1.2, 0.8, 0.5, 0.7, 0.7, 0.6, 0.5, 0.6, 0.6, 0.4, 0.6, 0.3, 0.4, 0.5, 0.6, 0.5, 0.3, 0.4, 0.7, 0.4, 0.5, 0.5, 0.6, 0.4, 0.4, 0.3];
const PLANT_SPECIATION = 0.25;
const PLANT_SPLIT_MIN_POP = 40;
const YEAR_TICKS = 480;
const SHADE_MAX = 0.8;
const SHADE_FULL_BIOMASS = 2.0;
const SAT_OK = 0.75;
const HEALTH_RECOVER = 0.02;
const HEALTH_DECAY = 0.04;
const HEALTH_SPREAD_MIN = 0.4;
const FRUIT_FRAC = 0.15;
const FRUIT_RATE = 0.02;
const FRUIT_ROT = 0.03;
const FRUIT_WIND = 0.6;
const FRUIT_LAG = 0.2;
const FLOWER_SEED_BONUS = 1.5;
const FUNGUS_SEED_P = 0.2;
const FUNGUS_LITTER_K = 0.06;
const FUNGUS_DECOMP = 0.003;
const FUNGUS_RETURN = 0.5;
const MYCO_HOST_K = 1.5;
const MYCO_BOOST = 1.3;
const MYCO_TAX = 0.92;
const DEFENCE_COST = 0.25;
const POLL_WIND = 0.3;
const POLL_FRUIT_BASE = 0.4;
const POLL_DECAY = 0.95;
const PEST_HEALTH = 1.5;
const BLIGHT_RES_COST = 0.15;
const FIRE_COST = 0.06;
const AGE_STEP = 8;
const PLANT_LIFE_BASE = 1.5;
const PLANT_LIFE_WOOD = 40;
const FUNGUS_LIFE = 1;
const LIFE_JITTER = 0.15;
const SEEDLING_MIN = 30;
const SEEDLING_FRAC = 0.05;
const SEEDLING_K0 = 0.3;
const SEEDLING_KILL = 0.03;
const OLD_FRAC = 0.8;
const OLD_GROWTH = 0.6;
const OLD_FRUIT = 0.5;
const OLD_DEATH_FRAC = 0.9;
const OLD_DEATH_P = 0.006;
const OLD_DEATH_K = 8;
const SEED_DRY = 0.9;
const SEED_ADD = 0.1;
const SEED_MAX = 1;
const SEED_DECAY = 0.985;
const SEED_MIN = 0.02;
const GERM_P = 0.12;
const SEED_REST_DRY = 0.7;
const GERM_USE = 0.5;
const OLD_SEED = 1;
const CYCLE_ANNUAL = 0.33;
const CYCLE_BIENNIAL = 0.66;
const ANNUAL_YEARS = 0.8;
const BIENNIAL_YEARS = 2;
const ANNUAL_GROWTH = 1.12;
const BIENNIAL_CAP = 1.1;
const HERB_WOOD = 0.3;
const TREE_WOOD = 0.62;
const DECID_AT = 0.5;
const DECID_BASE = 0.92;
const DECID_AMP = 0.5;
const LEAF_OFF = -0.2;
const LEAF_AMP = 0.15;
const LEAF_DROP = 0.06;
const AUTUMN_AT = 0.45;
const PHASE_BINS = 8;
const PHASE_COST = 0.6;
const BLOSSOM_AT = 0.85;
const BLOSSOM_GENE = 0.45;
const HEIGHT_CAP = 0.3;
const HEIGHT_GROWTH = 0.2;
const HEIGHT_REACH = 2;
const EMERGENT_AT = 0.65;
const CLIMB_AT = 0.6;
const EPI_ROOT = 0.35;
const CLIMB_SHADE = 0.25;
const CLIMB_ALONE = 0.5;
const CLIMB_GROWTH = 0.9;
const VINE_TAX = 0.94;
const EPI_DRY = 0.3;
const CLONAL_MIN = 0.25;
const CLONAL_K = 0.6;
const CLONAL_COST = 0.08;
const CLONE_BIO = 0.1;
const SPROUT_BIO = 0.04;
const FORM_DECID = 1;
const FORM_VINE = 2;
const FORM_EPI = 4;
const FORM_CLIMB = 6;
const FORM_SUCC = 64;
const FORM_HET = 128;
const FORM_PARA = FORM_HET | FORM_EPI;
const FIX_COST = 0.15;
const FIX_AT = 0.25;
const FIX_RATE = 0.004;
const SUCC_COST = 0.18;
const SUCC_AT = 0.5;
const SUCC_DRY = 0.7;
const SUCC_HOT = 0.5;
const SUCC_WET = 0.3;
const HET_AT = 0.6;
const CARN_CAP = 0.55;
const CARN_SOGGY = 2.2;
const CARN_EAT = 0.02;
const CARN_BIO = 0.6;
const CARN_HEALTH = 2;
const CARN_NUT = 0.3;
const PARA_CAP = 0.7;
const PARA_DRAIN = 0.03;
const PARA_EFF = 0.6;
const PARA_STARVE = 0.08;
const ALLELO_COST = 0.12;
const ALLELO_AT = 0.3;
const ALLELO_DMG = 0.06;
const ALLELO_SEED = 0.6;
const THORN_COST = 0.15;
const THORN_K = 0.4;
const INDUCE_COST = 0.06;
const INDUCE_MAX = 0.6;
const INDUCE_UP = 0.08;
const INDUCE_DECAY = 0.9;
const BLOOM_N = 0.58;
const BLOOM_T = 0.5;
const BLOOM_UP = 0.6;
const BLOOM_USE = 0.15;
const BLOOM_CRASH = 0.12;
const BLOOM_LITTER = 0.3;
const BLOOM_SHOW = 0.15;
const O2_KELP = 0.25;
const O2_BLOOM = 0.9;
const O2_ROT = 2;
const ROT_FREE = 0.1;
const HYPOXIA = 0.5;
const PEAT_SHOW = 0.4;
const EROSION_K = 0.004;
const EROSION_MIN = 0.0002;
const ROOT_HOLD = 1.2;
const LITTER_HOLD = 0.15;
const PHENO_AUTUMN = 1;
const PHENO_BARE = 2;
const PHENO_BLOSSOM = 3;

const PLANT_ARCHETYPES = [
	{ g: [0.82, 0.12, 0.5, 0.45, 0.35, 0.4, 0.2, 0.6, 0.15, 0.2, 0.3, 0.15, 0.5, 0.3, 0.15], domain: 'land' },
	{ g: [0.72, 0.35, 0.5, 0.08, 0.15, 0.7, 0.15, 0.45, 0.05, 0.1, 0.2, 0.15, 0.5, 0.15, 0.15], domain: 'land' },
	{ g: [0.8, 0.82, 0.4, 0.9, 0.3, 0.3, 0.35, 0.5, 0.3, 0.2, 0.2, 0.1, 0.5, 0.35, 0.15], domain: 'land' },
	{ g: [0.52, 0.65, 0.5, 0.85, 0.2, 0.3, 0.45, 0.55, 0.25, 0.2, 0.2, 0.1, 0.5, 0.3, 0.15], domain: 'land' },
	{ g: [0.5, 0.42, 0.55, 0.1, 0.1, 0.7, 0.15, 0.4, 0.05, 0.1, 0.2, 0.15, 0.5, 0.1, 0.15], domain: 'land' },
	{ g: [0.52, 0.5, 0.5, 0.5, 0.25, 0.5, 0.4, 0.5, 0.25, 0.2, 0.2, 0.15, 0.5, 0.25, 0.15], domain: 'land' },
	{ g: [0.26, 0.58, 0.5, 0.85, 0.2, 0.35, 0.4, 0.35, 0.1, 0.1, 0.2, 0.05, 0.5, 0.3, 0.15], domain: 'land' },
	{ g: [0.14, 0.42, 0.6, 0.05, 0.1, 0.6, 0.8, 0.35, 0.05, 0.1, 0.2, 0.1, 0.5, 0.1, 0.15], domain: 'land' },
	{ g: [0.6, 0.88, 0.5, 0.2, 0.1, 0.6, 0.3, 0.65, 0.05, 0.1, 0.2, 0.15, 0.5, 0.2, 0.15], domain: 'land' },
	{ g: [0.42, 0.2, 0.55, 0.3, 0.3, 0.55, 0.3, 0.6, 0.2, 0.2, 0.3, 0.15, 0.5, 0.4, 0.15], domain: 'land' },
	{ g: [0.55, 0.15, 0.6, 0.05, 0.1, 0.8, 0.6, 0.4, 0, 0, 0, 0, 0.5, 0.1, 0.15], domain: 'water' },
	{ g: [0.45, 0.5, 0.6, 0.35, 0.15, 0.6, 0.3, 0.5, 0, 0, 0, 0, 0.5, 0.15, 0.15], domain: 'water' },
	{ g: [0.7, 0.75, 0.6, 0.05, 0.05, 0.9, 0.5, 0.35, 0, 0, 0, 0, 0.5, 0.1, 0.15], domain: 'water' },
	{ g: [0.58, 0.6, 0.45, 0.72, 0.2, 0.45, 0.3, 0.55, 0.75, 0.7, 0.3, 0.15, 0.5, 0.25, 0.15], domain: 'land' },
	{ g: [0.48, 0.5, 0.5, 0.45, 0.2, 0.55, 0.35, 0.45, 0.75, 0.65, 0.35, 0.2, 0.5, 0.2, 0.15], domain: 'land' },
	{ g: [0.52, 0.55, 0.45, 0.12, 0.15, 0.6, 0.35, 0.35, 0.05, 0.3, 0.2, 0.8, 0.83, 0.15, 0.15], domain: 'land' },
	{ g: [0.64, 0.4, 0.45, 0.12, 0.2, 0.65, 0.3, 0.3, 0.05, 0.3, 0.2, 0.75, 0.15, 0.15, 0.15], domain: 'land' },
	{ g: [0.62, 0.36, 0.6, 0.05, 0.4, 0.6, 0.05, 0.05, 0, 0, 0.15, 0.2, 0.12, 0, 0.15], domain: 'land', kind: 1 },
	{ g: [0.28, 0.44, 0.6, 0.05, 0.5, 0.6, 0.05, 0.05, 0, 0, 0.5, 0.2, 0.72, 0, 0.15], domain: 'land', kind: 1 },
	{ g: [0.48, 0.48, 0.6, 0.05, 0.65, 0.6, 0.05, 0.05, 0, 0, 0.85, 0.2, 0.01, 0, 0.15], domain: 'land', kind: 1 },
	{ g: [0.45, 0.42, 0.6, 0.05, 0.1, 0.4, 0.05, 0.05, 0, 0, 0.1, 0.8, 0.08, 0, 0.15], domain: 'land', kind: 1 },
	{ g: [0.7, 0.68, 0.5, 0.12, 0.2, 0.5, 0.4, 0.5, 0.2, 0.25, 0.2, 0.35, 0.3, 0.2, 0.15], domain: 'land', climb: 0.85 },
	{ g: [0.76, 0.84, 0.55, 0.08, 0.1, 0.6, 0.5, 0.15, 0.05, 0.1, 0.2, 0.72, 0.88, 0.15, 0.15], domain: 'land', climb: 0.85 },
	{ g: [0.45, 0.88, 0.55, 0.08, 0.2, 0.5, 0.4, 0.15, 0.05, 0.1, 0.2, 0.6, 0.95, 0.1, 0.15], domain: 'land', het: 0.85 },
	{ g: [0.56, 0.55, 0.55, 0.1, 0.25, 0.65, 0.4, 0.1, 0.05, 0.1, 0.2, 0.3, 0.2, 0.15, 0.15], domain: 'land', climb: 0.85, het: 0.85 },
	{ g: [0.6, 0.3, 0.55, 0.35, 0.1, 0.5, 0.4, 0.6, 0, 0, 0, 0, 0.5, 0.15, 0.15], domain: 'water' },
];
const PLANT_DEPTH = { 13: 0.5, 14: 0.3, 15: 0.75, 16: 0.25 };
const PLANT_DEPTH_BASE = 0.45;
const DISP_FULL = 40;
const DISP_BONUS = 0.35;
const DISP_DECAY = 0.97;
const DISP_DUNG = 0.03;
PLANT_ARCHETYPES.forEach((a, k) => {
	a.g[15] = a.kind ? 0 : PLANT_DEPTH[k] !== undefined ? PLANT_DEPTH[k] : PLANT_DEPTH_BASE;
	a.g[16] = a.kind || a.domain !== 'land' ? 0 : a.g[1] < 0.45 ? 0.35 : 0.1;
	plantLifeDefaults(a.g, 0);
	if (a.climb) a.g[21] = a.climb;
	if (a.kind) a.g[22] = 0;
	plantStrategyDefaults(a.g, 0);
	if (a.domain !== 'land' || a.kind) for (let k = 23; k < PG; k++) a.g[k] = a.domain === 'water' && k === 23 ? 0.1 : 0;
	if (a.het) a.g[25] = a.het;
});

function plantStrategyDefaults(g, o = 0) {
	const t = g[o];
	const m = g[o + 1];
	const wood = g[o + 3];
	const herb = wood < HERB_WOOD;
	g[o + 23] = herb ? (g[o + 11] > 0.55 ? 0.45 : 0.12) : t > 0.6 && m < 0.45 ? 0.55 : 0.12;
	g[o + 24] = t > 0.62 && m < 0.4 ? 0.7 : 0.15;
	g[o + 25] = 0.1;
	g[o + 26] = !herb && t > 0.5 && m < 0.5 ? 0.45 : 0.1;
	g[o + 27] = !herb && wood < TREE_WOOD ? 0.45 : herb ? 0.05 : 0.2;
	g[o + 28] = herb ? 0.2 : 0.3;
}

function plantLifeDefaults(g, o = 0) {
	const t = g[o];
	const m = g[o + 1];
	const wood = g[o + 3];
	const herb = wood < HERB_WOOD;
	g[o + 17] = herb ? (t > 0.62 && m < 0.4 ? 0.2 : g[o + 11] > 0.55 ? 0.5 : 0.8) : 0.85;
	g[o + 18] = !herb && t >= 0.3 && t <= 0.7 ? 0.7 : 0.25;
	g[o + 19] = 0.5;
	g[o + 20] = herb ? 0.3 : wood > 0.88 ? 0.72 : 0.5;
	g[o + 21] = 0.1;
	g[o + 22] = herb ? (m > 0.75 ? 0.7 : g[o + 11] > 0.55 ? 0.35 : 0.5) : wood < TREE_WOOD ? 0.3 : 0.1;
}

function padPlantGenes(src, count) {
	if (!src || !count) return src;
	const from = src.length / count;
	if (from !== PG_V1 && from !== PG_V2) return src;
	const out = new Float32Array(count * PG);
	for (let k = 0, a = 0, b = 0; k < count; k++, a += from, b += PG) {
		for (let j = 0; j < from; j++) out[b + j] = src[a + j];
		if (from === PG_V1) plantLifeDefaults(out, b);
		plantStrategyDefaults(out, b);
	}
	return out;
}

function plantStratStats() {
	return { fixers: 0, succulents: 0, carnivores: 0, parasites: 0, allelopaths: 0, thorny: 0, induced: 0, blooms: 0, hypoxic: 0, peat: 0, eroded: 0 };
}

function plantStrategyCap(g, o, fm, temp, hum, b) {
	let k = 1;
	const s = g[o + 24];
	if (s > 0) {
		const hd = clamp01((temp - 0.5) / 0.3) * clamp01((0.5 - hum) / 0.35);
		k *= 1 + SUCC_HOT * s * hd - SUCC_WET * s * hum * hum;
	}
	if (fm & FORM_HET) k *= fm & FORM_EPI ? PARA_CAP : (CARN_CAP + CARN_SOGGY * BIOME_SOGGY[b]) * (0.4 + 0.6 * hum);
	return k;
}

function plantCycle(g, o = 0) {
	if (g[o + 3] >= HERB_WOOD) return 2;
	const c = g[o + 17];
	return c < CYCLE_ANNUAL ? 0 : c < CYCLE_BIENNIAL ? 1 : 2;
}

function plantLayerOf(g, o = 0) {
	const wood = g[o + 3];
	if (wood < HERB_WOOD) return 3;
	if (wood < TREE_WOOD) return 2;
	return g[o + 20] > EMERGENT_AT ? 0 : 1;
}

function plantPhaseBin(g, o = 0) {
	const b = Math.floor(g[o + 19] * PHASE_BINS);
	return b < PHASE_BINS ? b : PHASE_BINS - 1;
}

function plantForm(g, o, landPlant) {
	if (!landPlant) return 4 << 3;
	const wood = g[o + 3];
	let f = plantPhaseBin(g, o) << 3;
	if (wood >= HERB_WOOD && g[o + 18] > DECID_AT) f |= FORM_DECID;
	if (wood < HERB_WOOD && g[o + 21] > CLIMB_AT) f |= g[o + 7] < EPI_ROOT ? FORM_EPI : FORM_VINE;
	if (g[o + 24] > SUCC_AT) f |= FORM_SUCC;
	if (wood < HERB_WOOD && g[o + 25] > HET_AT) f = f & FORM_CLIMB ? (f & ~FORM_CLIMB) | FORM_PARA : f | FORM_HET;
	return f;
}

function phaseCurve(out, tick, lag, on) {
	for (let b = 0; b < PHASE_BINS; b++) out[b] = on ? 0.5 + 0.5 * Math.sin((tick / YEAR_TICKS - lag - (b - 4) / PHASE_BINS) * Math.PI * 2) : 0.5;
}

function plantTraitsFrom(g, o = 0) {
	const niche = g[o + 2];
	const wood = g[o + 3];
	const tox = g[o + 4];
	const disp = g[o + 5];
	const shade = g[o + 6];
	const root = g[o + 7];
	const fruiting = g[o + 8];
	const sweet = g[o + 9];
	return {
		prefTemp: g[o],
		prefMoist: g[o + 1],
		tol: 0.09 + 0.22 * niche,
		peak: 1 - 0.3 * niche,
		wood,
		tox,
		disp,
		shade,
		root,
		fruiting,
		sweet,
		seedTox: g[o + 10],
		bloom: g[o + 11],
		hue: g[o + 12],
		defence: g[o + 13],
		blightRes: g[o + 14],
		fire: g[o + 16],
		formCap: (0.8 + 2.4 * wood) * (1 + HEIGHT_CAP * (g[o + 20] - 0.5) * wood),
		growth: 0.05 * (1 - HEIGHT_GROWTH * (g[o + 20] - 0.5) * wood) * (1 - CLONAL_COST * g[o + 22]) * (1 - 0.72 * wood) * (1 - 0.35 * tox) * (1 - 0.12 * disp) * (1 - 0.3 * shade) * (1 - 0.2 * root) * (1 - 0.25 * fruiting - 0.15 * sweet) * (1 - DEFENCE_COST * g[o + 13]) * (1 - BLIGHT_RES_COST * g[o + 14]) * (1 - FIRE_COST * g[o + 16]) * (1 - FIX_COST * g[o + 23]) * (1 - SUCC_COST * g[o + 24]) * (1 - ALLELO_COST * g[o + 26]) * (1 - THORN_COST * g[o + 27]) * (1 - INDUCE_COST * g[o + 28]),
	};
}

function toxinType(g, o = 0) {
	const v = g[o + 10];
	return v < 0.33 ? 0 : v < 0.66 ? 1 : 2;
}

function hueDist(a, b) {
	const d = a > b ? a - b : b - a;
	return d > 0.5 ? 1 - d : d;
}

function bloomFactor(season) {
	return 0.5 + 0.5 * season;
}

function fruitFactor(season) {
	return 0.5 + 0.5 * season;
}

function slotOf(g, water, o = 0, kind = 0) {
	if (kind === 1) return 1;
	if (water) return g[o + 1] > 0.45 && g[o + 3] > 0.25 ? 0 : 1;
	return g[o + 3] >= 0.3 ? 0 : 1;
}

function plantCategory(g, domain, kind = 0) {
	if (kind === 1) {
		if (g[11] > 0.5) return 'truffle';
		const tt = toxinType(g);
		return tt === 0 ? 'puffball' : tt === 1 ? 'inkcap' : 'toadstool';
	}
	const t = g[0];
	const m = g[1];
	const wood = g[3];
	if (domain === 'water') return wood > 0.25 ? (m > 0.45 ? 'kelp' : 'seagrass') : m > 0.45 ? 'plankton' : 'algae';
	if (wood < 0.3) {
		if (g[25] > HET_AT) return g[21] > CLIMB_AT ? 'parasite' : 'carnivore';
		if (g[21] > CLIMB_AT) return g[7] < EPI_ROOT ? 'epiphyte' : 'vine';
		if (g[11] > 0.55) return 'flower';
		return t < 0.3 ? 'moss' : m > 0.75 ? 'reed' : 'grass';
	}
	if (wood < 0.62) return t > 0.62 && m < 0.32 ? 'cactus' : g[8] > 0.5 ? 'berrybush' : 'shrub';
	if (g[8] > 0.5) return 'fruittree';
	if (t < 0.38) return 'conifer';
	if (t > 0.7 && m > 0.6) return 'palm';
	return 'tree';
}

const PLANT_ICON_VARIANTS = {
	grass: ['grass', 'tallgrass', 'wheat'],
	reed: ['reed', 'cattail', 'bamboo'],
	moss: ['moss', 'lichen', 'clover'],
	shrub: ['shrub', 'hedge', 'heather'],
	cactus: ['cactus', 'pricklypear', 'agave'],
	tree: ['tree', 'oak', 'birch'],
	conifer: ['conifer', 'pine', 'cypress'],
	palm: ['palm', 'coconut', 'fanpalm'],
	algae: ['algae', 'sealettuce', 'redalgae'],
	kelp: ['kelp', 'bladderkelp', 'kelp'],
	seagrass: ['seagrass', 'eelgrass', 'seagrass'],
	carnivore: ['flytrap', 'pitcher', 'sundew'],
	parasite: ['mistletoe', 'dodder', 'mistletoe'],
	plankton: ['plankton', 'diatom', 'radiolarian'],
	fruittree: ['fruittree', 'appletree', 'cherrytree'],
	berrybush: ['berrybush', 'blueberry', 'raspberry'],
	flower: ['flower', 'tulip', 'sunflower'],
	puffball: ['puffball', 'earthstar', 'coralfungus'],
	inkcap: ['inkcap', 'morel', 'chanterelle'],
	toadstool: ['toadstool', 'bracket', 'porcini'],
	truffle: ['truffle', 'stinkhorn', 'jellyfungus'],
	vine: ['vine', 'ivy', 'vine'],
	epiphyte: ['orchid', 'bromeliad', 'orchid'],
};

function plantIcon(category, id) {
	const v = PLANT_ICON_VARIANTS[category];
	return v ? v[id % v.length] : category;
}

const PLANT_CATEGORY_LABEL = {
	grass: 'Grass',
	reed: 'Reed',
	moss: 'Moss',
	shrub: 'Shrub',
	cactus: 'Succulent',
	tree: 'Broadleaf tree',
	conifer: 'Conifer',
	palm: 'Palm',
	algae: 'Algae',
	kelp: 'Kelp',
	seagrass: 'Seagrass',
	carnivore: 'Carnivorous plant',
	parasite: 'Parasitic plant',
	plankton: 'Plankton',
	fruittree: 'Fruit tree',
	berrybush: 'Berry bush',
	flower: 'Wildflower',
	puffball: 'Puffball',
	inkcap: 'Inkcap',
	toadstool: 'Toadstool',
	truffle: 'Truffle',
	vine: 'Vine',
	epiphyte: 'Epiphyte',
};

const PLANT_CYCLE_LABEL = ['Annual', 'Biennial', 'Perennial'];
const PLANT_LAYER_LABEL = ['Emergent', 'Canopy', 'Shrub layer', 'Ground layer'];

class PlantLayer {
	constructor(world, registry, rng, log) {
		this.world = world;
		this.registry = registry;
		this.rng = rng;
		this.log = log;
		const n = world.width * world.height;
		this.n = n;
		const n2 = n * 2;
		this.species = new Int32Array(n2);
		this.biomass = new Float32Array(n2);
		this.cap = new Float32Array(n2);
		this.growth = new Float32Array(n2);
		this.floor = new Float32Array(n2);
		this.floorM = new Float32Array(n2);
		this.age = new Uint16Array(n2);
		this.life = new Uint16Array(n2);
		this.seedDens = new Float32Array(n);
		this.seedSp = new Int32Array(n);
		this.seedGenome = new Float32Array(n * PG);
		this.stages = { seedTiles: 0, seedDormant: 0, seedlings: 0, mature: 0, old: 0 };
		this.oldDeaths = 0;
		this.germinated = 0;
		this.grazedSeedlings = 0;
		this.snow = null;
		this.tox = new Float32Array(n2);
		this.disp = new Float32Array(n2);
		this.genome = new Float32Array(n2 * PG);
		this.shade = new Float32Array(n2);
		this.root = new Float32Array(n2);
		this.health = new Float32Array(n2).fill(1);
		this.sat = new Float32Array(n2).fill(1);
		this.blight = new Int32Array(n2);
		this.blightT = new Uint16Array(n2);
		this.blightImm = new Int32Array(n2);
		this.disease = null;
		this.kind = new Uint8Array(n2);
		this.myco = new Uint8Array(n2);
		this.hue = new Float32Array(n2);
		this.fruit = new Float32Array(n2);
		this.fruitMax = new Float32Array(n2);
		this._fruitK = new Float32Array(n2);
		this._bloomK = new Float32Array(n2);
		this.form = new Uint8Array(n2);
		this.induced = new Float32Array(n2);
		this.bloom = new Float32Array(n);
		this.oxygen = new Float32Array(n).fill(1);
		this.bugs = null;
		this.strat = plantStratStats();
		this.pheno = new Uint8Array(n);
		this.bloomBin = new Float32Array(PHASE_BINS).fill(0.5);
		this.fruitBin = new Float32Array(PHASE_BINS).fill(0.5);
		this.leafOff = false;
		this.clones = 0;
		this._keep = SPROUT_BIO;
		this.poll = new Float32Array(n);
		this.flowerPoll = 0;
		this.nectarHue = 0;
		this.water = new Uint8Array(n);
		this.depth = new Float32Array(n);
		this.habit = new Float32Array(n);
		this.seasonAmp = new Float32Array(n);
		this.version = 0;
		this.totalBiomass = 0;
		this.coverTiles = 0;
		this.starved = 0;
		this.blighted = 0;
		this.grazeTox = 0;
		this.grazeFungus = 0;
		this.grazeToxType = 0;
		this.grazePotency = 0;
		this.fruitSp = 0;
		this.fruitSweet = 0;
		this.fruitSeedTox = 0;
		this.seedDrops = 0;
		this.animalSeeded = 0;
		this.dispBonus = 0;
		this.nectarDepth = 0;
		this.nectarSp = 0;
		this.fruitEaten = 0;
		this.poisoned = [0, 0, 0];
		this.totalFruit = 0;
		this.fungusTiles = 0;
		this.flowerTiles = 0;
		this.seasonsOn = true;
		this.season = 0;
		this.moistMul = null;
		this.seedResting = 0;
		this.bloomNow = 0.5;
		this.fruitNow = 0.5;
		this.soil = new SoilLayer(world);
		this._scratch = new Float32Array(PG);
		this._prepareClimate();
		this._seed();
	}

	restoreDerived() {
		const n = this.n;
		const n2 = 2 * n;
		this.upgradeGenes();
		this.water = new Uint8Array(n);
		this.depth = new Float32Array(n);
		this.habit = new Float32Array(n);
		this.seasonAmp = new Float32Array(n);
		this._prepareClimate();
		const g = this.genome;
		const tox = (this.tox = new Float32Array(n2));
		const disp = (this.disp = new Float32Array(n2));
		const shade = (this.shade = new Float32Array(n2));
		const root = (this.root = new Float32Array(n2));
		const form = (this.form = new Uint8Array(n2));
		for (let p = 0, o = 0; p < n2; p++, o += PG) {
			tox[p] = g[o + 4];
			disp[p] = g[o + 5];
			shade[p] = g[o + 6];
			root[p] = g[o + 7];
			if (this.species[p]) form[p] = plantForm(g, o, !this.water[p < n ? p : p - n] && !this.kind[p]);
		}
	}

	upgradeGenes() {
		const n2 = 2 * this.n;
		if (this.genome.length !== n2 * PG) this.genome = padPlantGenes(this.genome, n2);
		if (this.seedGenome.length !== this.n * PG) this.seedGenome = padPlantGenes(this.seedGenome, this.n);
		if (!this.induced || this.induced.length !== n2) this.induced = new Float32Array(n2);
		if (!this.bloom || this.bloom.length !== this.n) this.bloom = new Float32Array(this.n);
		if (!this.oxygen || this.oxygen.length !== this.n) this.oxygen = new Float32Array(this.n).fill(1);
		if (!this.strat) this.strat = plantStratStats();
		if (!this._scratch || this._scratch.length < PG) this._scratch = new Float32Array(PG);
		if (!this.pheno || this.pheno.length !== this.n) this.pheno = new Uint8Array(this.n);
		if (!this.bloomBin) this.bloomBin = new Float32Array(PHASE_BINS).fill(this.bloomNow);
		if (!this.fruitBin) this.fruitBin = new Float32Array(PHASE_BINS).fill(this.fruitNow);
		if (!(this._keep > 0)) this._keep = SPROUT_BIO;
		if (!this.clones) this.clones = 0;
		if (this.registry && this.registry.all) {
			for (const sp of this.registry.all.values()) {
				if (sp.group !== 'plant') continue;
				if (sp.mean && sp.mean.length < PG) sp.mean = padPlantGenes(sp.mean, 1);
				if (sp.genome && sp.genome.length < PG) sp.genome = padPlantGenes(sp.genome, 1);
			}
		}
	}

	_prepareClimate() {
		const w = this.world;
		const sea = BIOME_THRESHOLDS.seaLevel;
		const harsh = {
			[BIOME_ID.GLACIER]: 0.05,
			[BIOME_ID.ALPINE]: 0.35,
			[BIOME_ID.FROZEN_OCEAN]: 0.25,
			[BIOME_ID.CLIFF]: 0.4,
			[BIOME_ID.BEACH]: 0.55,
			[BIOME_ID.MOUNTAINS]: 0.55,
			[BIOME_ID.BADLANDS]: 0.6,
			[BIOME_ID.SALT_FLAT]: 0.3,
			[BIOME_ID.MANGROVE]: 1.05,
			[BIOME_ID.TUNDRA_BOG]: 0.7,
			[BIOME_ID.CLOUD_FOREST]: 1.15,
			[BIOME_ID.CORAL_REEF]: 1.5,
		};
		for (let i = 0; i < this.n; i++) {
			const b = w.biome[i];
			const isWater = WATER_BIOME_SET.has(b);
			this.water[i] = isWater ? 1 : 0;
			this.depth[i] = isWater ? clamp01((sea - w.altitude[i]) / sea) : 0;
			const fert = 0.45 + 0.55 * w.fertility[i];
			const light = isWater ? 2 - 1.1 * this.depth[i] : 1;
			this.habit[i] = fert * light * (harsh[b] ?? 1);
			this.seasonAmp[i] = 0.75 * (1 - w.temperature[i]);
		}
	}

	moistAt(i) {
		return this.water[i] ? this.depth[i] : this.world.humidity[i];
	}

	capFor(t, i) {
		return (
			t.formCap *
			t.peak *
			this.habit[i] *
			biomeFit(this.world.biome[i], t.wood, t.root, t.shade) *
			gaussFit(this.world.temperature[i], t.prefTemp, t.tol) *
			gaussFit(this.moistAt(i), t.prefMoist, t.tol * 1.2)
		);
	}

	_seed() {
		const n = this.n;
		const founders = PLANT_ARCHETYPES.map((a) => ({ ...a, kind: a.kind || 0, t: plantTraitsFrom(a.g), sp: null }));
		const fungi = founders.filter((f) => f.kind === 1);
		for (let i = 0; i < n; i++) {
			const wet = this.water[i];
			const domain = wet ? 'water' : 'land';
			for (let slot = 0; slot < 2; slot++) {
				let best = null;
				let bestK = 0;
				for (const f of founders) {
					if (f.kind || f.domain !== domain || slotOf(f.g, wet) !== slot) continue;
					const k = this.capFor(f.t, i) * (0.7 + 0.6 * this.rng.next());
					if (k > bestK) {
						bestK = k;
						best = f;
					}
				}
				if (!best || bestK < 0.06 || this.rng.next() > 0.45) {
					if (slot === 1 && !wet && this.species[i] && this.rng.next() < FUNGUS_SEED_P) this._seedFungus(i, fungi[Math.floor(this.rng.next() * fungi.length)]);
					continue;
				}
				this._seedFounder(slot * n + i, best);
			}
		}
	}

	_seedFungus(i, f) {
		if (this.capFor(f.t, i) * this._fungusK(f.g[11] > 0.5, i) < 0.06) return;
		this._seedFounder(this.n + i, f);
	}

	_seedFounder(p, f) {
		if (!f.sp) f.sp = this._newSpecies(f.g, f.domain, null, 0, 'founder', f.kind);
		this._set(p, f.sp, f.g, 0);
		this.biomass[p] = this.cap[p] * (0.4 + 0.4 * this.rng.next());
		this.age[p] = Math.floor(this.rng.next() * OLD_FRAC * this.life[p]);
		if (this.age[p] >= this.matureAt(p)) this.floor[p] = this.floorM[p];
	}

	_newSpecies(genome, domain, parent, tick, origin, kind = 0) {
		const r = this.rng;
		const wood = genome[3];
		const k = parent ? parent.kind | 0 : kind;
		const category = plantCategory(genome, domain, k);
		const base = domain === 'water' ? 150 + r.next() * 55 : 62 + r.next() * 88;
		const hue = k === 1 || category === 'flower' ? genome[12] * 360 : base;
		const hsl = [hue, 0.45 + r.next() * 0.25, 0.5 - wood * 0.14 + (r.next() - 0.5) * 0.08];
		const sp = this.registry.create(
			{
				group: 'plant',
				domain,
				genome,
				parentId: parent ? parent.id : null,
				generation: parent ? parent.generation + 1 : 0,
				tick,
				origin,
			},
			hsl
		);
		sp.kind = k;
		sp.category = category;
		sp.icon = plantIcon(category, sp.id);
		sp.animalSeeds = 0;
		return sp;
	}

	_set(p, sp, genome, off) {
		const i = p < this.n ? p : p - this.n;
		const prev = this.species[p];
		if (prev) this.registry.remove(this.registry.get(prev));
		if (this.blight[p]) this.disease.releasePlant(p);
		this.blightImm[p] = 0;
		this.species[p] = sp.id;
		this.registry.add(sp);
		const kind = sp.kind | 0;
		this.kind[p] = kind;
		const base = p * PG;
		for (let k = 0; k < PG; k++) this.genome[base + k] = genome[off + k];
		const t = plantTraitsFrom(this.genome, base);
		const landPlant = !kind && !this.water[i];
		const fm = plantForm(this.genome, base, landPlant);
		const cyc = landPlant ? plantCycle(this.genome, base) : 2;
		const amp = this.seasonAmp[i];
		this.form[p] = fm;
		let cap = this.capFor(t, i);
		let gm = 1;
		if (cyc === 0) gm = ANNUAL_GROWTH;
		else if (cyc === 1) cap *= BIENNIAL_CAP;
		if (fm & FORM_DECID) gm *= DECID_BASE + DECID_AMP * amp;
		if (fm & FORM_CLIMB) gm *= CLIMB_GROWTH;
		if ((fm & FORM_PARA) === FORM_EPI) cap *= EPI_DRY + (1 - EPI_DRY) * this.world.humidity[i];
		if (landPlant) cap *= plantStrategyCap(this.genome, base, fm, this.world.temperature[i], this.world.humidity[i], this.world.biome[i]);
		this.cap[p] = cap;
		this.induced[p] = 0;
		const shift = (((fm >> 3) & 7) - 4) / PHASE_BINS;
		const timing = landPlant ? 1 + PHASE_COST * amp * (Math.cos(shift * Math.PI * 2) - 1) : 1;
		const floor = this.cap[p] * 0.55 * t.wood * t.wood;
		const years = kind ? FUNGUS_LIFE : cyc === 0 ? ANNUAL_YEARS : cyc === 1 ? BIENNIAL_YEARS : PLANT_LIFE_BASE + PLANT_LIFE_WOOD * t.wood * t.wood;
		this.life[p] = Math.round(((years * YEAR_TICKS) / AGE_STEP) * (1 - LIFE_JITTER + 2 * LIFE_JITTER * this.rng.next()));
		this.age[p] = 0;
		this.floor[p] = 0;
		if (kind === 0) {
			this.growth[p] = t.growth * (1 - 0.2 * t.bloom) * gm;
			this.floorM[p] = floor * (1 + 0.2 * (1 - t.fruiting));
			this.myco[p] = 0;
			this._fruitK[p] = !this.water[i] && t.wood >= 0.3 && t.fruiting > 0.2 ? t.fruiting * FRUIT_FRAC * FRUIT_WIND * timing : 0;
			this._bloomK[p] = t.bloom * FLOWER_SEED_BONUS * FRUIT_WIND * timing;
		} else {
			this.growth[p] = t.growth;
			this.floorM[p] = floor;
			this.myco[p] = t.bloom > 0.5 ? 1 : 0;
			this._fruitK[p] = 0;
			this._bloomK[p] = 0;
		}
		this.hue[p] = sp.hsl[0] / 360;
		this.fruit[p] = 0;
		this.fruitMax[p] = 0;
		this.tox[p] = t.tox;
		this.disp[p] = t.disp;
		this.shade[p] = t.shade;
		this.root[p] = t.root;
		this.health[p] = 1;
		this.sat[p] = 1;
	}

	_clear(p) {
		const id = this.species[p];
		if (!id) return;
		this.soil.returnMatter(p < this.n ? p : p - this.n, this.biomass[p] + this.fruit[p]);
		this.registry.remove(this.registry.get(id));
		if (this.blight[p]) this.disease.releasePlant(p);
		this.blightImm[p] = 0;
		this.species[p] = 0;
		this.biomass[p] = 0;
		this.cap[p] = 0;
		this.kind[p] = 0;
		this.myco[p] = 0;
		this.fruit[p] = 0;
		this.fruitMax[p] = 0;
		this._fruitK[p] = 0;
		this._bloomK[p] = 0;
		this.form[p] = 0;
		this.induced[p] = 0;
	}

	matureAt(p) {
		const m = this.life[p] * SEEDLING_FRAC;
		return m > SEEDLING_MIN / AGE_STEP ? m : SEEDLING_MIN / AGE_STEP;
	}

	_fungusK(isMyco, j) {
		if (isMyco) {
			const cb = this.species[j] ? this.biomass[j] : 0;
			return cb < MYCO_HOST_K ? cb / MYCO_HOST_K : 1;
		}
		const L = this.soil.litter[j];
		return L < FUNGUS_LITTER_K ? L / FUNGUS_LITTER_K : 1;
	}

	topSpecies(i) {
		return this.species[i] || this.species[this.n + i];
	}

	cover(i) {
		return this.floor[i] + this.floor[this.n + i];
	}

	edible(i, reach = 0, skipUnder = false) {
		const u = this.n + i;
		const r = 1 - reach;
		const a = this.biomass[i] - this.floor[i] * r;
		const b = skipUnder ? 0 : this.biomass[u] - this.floor[u] * r;
		return (a > 0 ? a : 0) + (b > 0 ? b : 0);
	}

	fruitAt(i, tall = true) {
		const fruit = this.fruit;
		const u = this.n + i;
		let f = 0;
		const a = fruit[i];
		if (a > 0 && this.species[i] && (tall || this.genome[i * PG + 3] < 0.62)) f += a;
		const b = fruit[u];
		if (b > 0 && this.species[u] && (tall || this.genome[u * PG + 3] < 0.62)) f += b;
		return f;
	}

	eatFruit(i, amount, tall = true) {
		let got = 0;
		let src = 0;
		let sweet = 0;
		let seedTox = 0;
		for (let p = i; p < 2 * this.n && got < amount; p += this.n) {
			const f = this.fruit[p];
			if (!this.species[p] || !(f > 0)) continue;
			if (!tall && this.genome[p * PG + 3] >= 0.62) continue;
			const want = amount - got;
			const take = f < want ? f : want;
			this.fruit[p] = f - take;
			got += take;
			if (!src) {
				src = this.species[p];
				sweet = this.genome[p * PG + 9];
				seedTox = this.genome[p * PG + 10];
			}
		}
		this.fruitSp = src;
		this.fruitSweet = sweet;
		this.fruitSeedTox = seedTox;
		if (got > 0) this.fruitEaten++;
		return got;
	}

	_bite(p, amount, reach) {
		const lim = this.floor[p] * (1 - reach);
		const e = this.biomass[p] > lim ? this.biomass[p] - lim : 0;
		const take = e < amount ? e : amount;
		this.biomass[p] -= take;
		return take;
	}

	graze(i, amount, reach = 0, skipUnder = false) {
		const u = this.n + i;
		const g = this.genome;
		const ku = 1 - THORN_K * g[u * PG + 27];
		const ki = 1 - THORN_K * g[i * PG + 27];
		const a = skipUnder ? 0 : this._bite(u, amount * ku, reach);
		const b = a < amount * ku ? this._bite(i, (amount - a / ku) * ki, reach) : 0;
		const take = a + b;
		const ind = this.induced;
		this.grazeTox = take > 0 ? (a * (this.tox[u] + ind[u]) + b * (this.tox[i] + ind[i])) / take : 0;
		if (a > 0) this._induce(u);
		if (b > 0) this._induce(i);
		if (a > 0 && this.kind[u]) {
			this.grazeFungus = this.species[u];
			this.grazeToxType = toxinType(this.genome, u * PG);
			this.grazePotency = this.tox[u];
		} else this.grazeFungus = 0;
		if (a > 0 && !this.water[i] && this.biomass[u] < SEEDLING_KILL && this.age[u] < this.matureAt(u)) {
			this.grazedSeedlings++;
			this._clear(u);
		}
		if (b > 0 && !this.water[i] && this.biomass[i] < SEEDLING_KILL && this.age[i] < this.matureAt(i)) {
			this.grazedSeedlings++;
			this._clear(i);
		}
		return take;
	}

	_induce(p) {
		const k = this.genome[p * PG + 28];
		const top = INDUCE_MAX * k;
		const v = this.induced[p] + INDUCE_UP * k;
		this.induced[p] = v < top ? v : top;
	}

	damage(i, amount) {
		const u = this.n + i;
		const health = this.health;
		let a = 0;
		if (this.species[u] && !this.kind[u]) {
			a = this._bite(u, amount, 0);
			if (a > 0) {
				this._induce(u);
				const h = health[u] - a * PEST_HEALTH;
				health[u] = h > 0 ? h : 0;
			}
		}
		let b = 0;
		if (a < amount && this.species[i]) {
			b = this._bite(i, amount - a, 0);
			if (b > 0) {
				this._induce(i);
				const h = health[i] - b * PEST_HEALTH;
				health[i] = h > 0 ? h : 0;
			}
		}
		return a + b;
	}

	nectar(i) {
		const u = this.n + i;
		const bk = this._bloomK;
		const a = this.species[i] ? bk[i] : 0;
		const b = this.species[u] ? bk[u] : 0;
		this.nectarHue = a >= b ? this.hue[i] : this.hue[u];
		this.nectarDepth = this.genome[(a >= b ? i : u) * PG + 15];
		this.nectarSp = a >= b ? this.species[i] : this.species[u];
		return a + b;
	}

	animalSeed(j, sp) {
		sp.animalSeeds = (sp.animalSeeds || 0) + 1;
		this.animalSeeded++;
		const nut = this.soil.nutrient;
		if (nut) nut[j] += DISP_DUNG;
	}

	fruitBonus(i, got) {
		const src = this.fruitSp;
		if (!src || !(got > 0)) return 0;
		const sp = this.registry.get(src);
		const a = sp ? sp.animalSeeds || 0 : 0;
		if (!(a > 0)) return 0;
		const k = a < DISP_FULL ? a / DISP_FULL : 1;
		for (let p = i; p < 2 * this.n; p += this.n) {
			if (this.species[p] !== src) continue;
			const add = got * DISP_BONUS * k;
			this.fruit[p] += add;
			this.dispBonus += add;
			return add;
		}
		return 0;
	}

	step(tick) {
		if (typeof PlantGpu !== 'undefined' && PlantGpu.step(this, tick)) return;
		const { rng, world } = this;
		const n = this.n;
		const W = world.width;
		const H = world.height;
		const season = Math.sin((tick / YEAR_TICKS) * Math.PI * 2);
		this.season = season;
		const bloomNow = this.seasonsOn ? bloomFactor(season) : 0.5;
		const fruitNow = this.seasonsOn ? fruitFactor(Math.sin((tick / YEAR_TICKS - FRUIT_LAG) * Math.PI * 2)) : 0.5;
		this.bloomNow = bloomNow;
		this.fruitNow = fruitNow;
		this.phaseTick(tick, season);
		const bloomBin = this.bloomBin;
		const fruitBin = this.fruitBin;
		const form = this.form;
		const leafOff = this.leafOff;
		const kind = this.kind;
		const myco = this.myco;
		const fruit = this.fruit;
		const fruitMax = this.fruitMax;
		const fruitK = this._fruitK;
		const bloomK = this._bloomK;
		const water = this.water;
		const flowerK = 0.55 * FLOWER_SEED_BONUS * FRUIT_WIND;
		const litter = this.soil.litter;
		const nut = this.soil.nutrient;
		const species = this.species;
		const bio = this.biomass;
		const cap = this.cap;
		const health = this.health;
		const sat = this.sat;
		const shade = this.shade;
		const growth = this.growth;
		const disp = this.disp;
		const seasonAmp = this.seasonAmp;
		const poll = this.poll;
		const blight = this.blight;
		const moistMul = this.moistMul;
		const age = this.age;
		const life = this.life;
		const floor = this.floor;
		const floorM = this.floorM;
		const ck = (tick & 7) === 0;
		let seedlings = 0;
		let mature = 0;
		let old = 0;
		this.soil.step(this);
		let total = 0;
		let totalFruit = 0;
		let fungi = 0;
		let flowers = 0;
		let flowerPoll = 0;

		for (let p = 0; p < 2 * n; p++) {
			const id = species[p];
			if (!id) continue;
			const under = p >= n;
			const i = under ? p - n : p;
			let ag = age[p];
			const lf = life[p];
			if (ck) {
				ag++;
				age[p] = ag;
				if (ag > OLD_DEATH_FRAC * lf && rng.next() < OLD_DEATH_P * Math.exp(OLD_DEATH_K * (ag / lf - OLD_DEATH_FRAC))) {
					this.oldDeaths++;
					this._selfSeed(p, i, id);
					this._clear(p);
					continue;
				}
				if (leafOff && form[p] & FORM_DECID) this._dropLeaves(p, i);
			}
			const mt = lf * SEEDLING_FRAC > SEEDLING_MIN / AGE_STEP ? lf * SEEDLING_FRAC : SEEDLING_MIN / AGE_STEP;
			const young = ag < mt;
			const aged = ag > OLD_FRAC * lf;
			if (young) seedlings++;
			else {
				if (ck && floor[p] !== floorM[p]) floor[p] = floorM[p];
				if (aged) old++;
				else mature++;
			}
			const fk = kind[p];
			let light = 1;
			let K;
			if (fk) {
				if (myco[p]) {
					const cb = species[i] ? bio[i] : 0;
					K = cb < MYCO_HOST_K ? (cap[p] * cb) / MYCO_HOST_K : cap[p];
				} else {
					const L = litter[i];
					K = L < FUNGUS_LITTER_K ? (cap[p] * L) / FUNGUS_LITTER_K : cap[p];
				}
				fungi++;
			} else {
				const climb = under && form[p] & FORM_CLIMB;
				if (under && species[i]) {
					const cb = bio[i];
					const sf = SHADE_MAX * (cb < SHADE_FULL_BIOMASS ? cb / SHADE_FULL_BIOMASS : 1) * (climb ? CLIMB_SHADE : 1);
					light = 1 - sf * (1 - shade[p]);
				}
				K = cap[p] * light;
				if (climb && !species[i]) K *= CLIMB_ALONE;
				if (under && bloomK[p] > flowerK && !water[i]) {
					flowers++;
					flowerPoll += poll[i];
				}
			}
			let b = bio[p];
			if (K < 0.015) {
				b -= 0.01;
				if (b <= 0) {
					this._clear(p);
					continue;
				}
				bio[p] = b;
				continue;
			}
			let h = health[p];
			if (h <= 0 && blight[p]) {
				this.disease.blightDeath(p);
				this._clear(p);
				this.blighted++;
				continue;
			}
			let s = sat[p];
			let tax = 1;
			if (!under && myco[n + i] && species[n + i]) {
				s *= MYCO_BOOST;
				if (s > 1) s = 1;
				sat[p] = s;
				tax = MYCO_TAX;
			}
			if (!under && form[n + i] & FORM_VINE && species[n + i]) tax *= VINE_TAX;
			if (s >= SAT_OK) {
				h += HEALTH_RECOVER;
				if (h > 1) h = 1;
			} else {
				h -= (SAT_OK - s) * HEALTH_DECAY;
				if (h <= 0) {
					if (blight[p]) {
						this.disease.blightDeath(p);
						this.blighted++;
					} else this.starved++;
					this._clear(p);
					continue;
				}
			}
			health[p] = h;
			if (young) K *= SEEDLING_K0 + ((1 - SEEDLING_K0) * ag) / mt;
			const sm = 1 + seasonAmp[i] * season;
			const mm = moistMul ? moistMul[i] : 1;
			const r = growth[p] * (sm > 0.05 ? sm : 0.05) * light * (0.35 + 0.65 * h) * tax * (mm < 1 && form[p] & FORM_SUCC ? mm + (1 - mm) * SUCC_DRY : mm) * (aged ? OLD_GROWTH : 1);
			const bb = b > 0.03 ? b : 0.03;
			b += r * bb * (1 - b / K);
			if (b > K) b = K;
			if (b < 0.004) b = 0.004;
			bio[p] = b;
			total += b;

			const fullness = b / K;
			if (fk && !myco[p]) {
				const L = litter[i];
				if (L > 0) {
					const d = L * FUNGUS_DECOMP * (fullness < 1 ? fullness : 1);
					litter[i] = L - d;
					const N = nut[i] + d * FUNGUS_RETURN;
					nut[i] = N < SOIL_MAX ? N : SOIL_MAX;
				}
			}
			if (young) continue;
			const fq = fruitK[p];
			if (fq > 0) {
				const target = fq * b * fruitBin[(form[p] >> 3) & 7] * h * (POLL_FRUIT_BASE + (1 - POLL_FRUIT_BASE) * poll[i]) * (aged ? OLD_FRUIT : 1);
				fruitMax[p] = target;
				let f = fruit[p];
				if (f < target) f += (target - f) * FRUIT_RATE;
				else {
					const rot = (f - target) * FRUIT_ROT;
					f -= rot;
					litter[i] += rot;
				}
				fruit[p] = f;
				totalFruit += f;
			}
			if (h >= HEALTH_SPREAD_MIN && fullness > 0.3 && rng.next() < (0.006 + 0.045 * disp[p]) * fullness * (1 + bloomK[p] * bloomBin[(form[p] >> 3) & 7] * (POLL_WIND + (1 - POLL_WIND) * poll[i]))) {
				this._spread(p, i, W, H, tick);
			}
		}
		let cover = 0;
		let seedTiles = 0;
		if (ck) {
			this._strategies(tick);
			seedTiles = this._seedPass(tick);
			this.updatePheno(tick, season);
		}
		for (let i = 0; i < n; i++) {
			if (species[i] || species[n + i]) cover++;
			if (poll[i] > 0) poll[i] *= POLL_DECAY;
		}
		this.totalBiomass = total;
		this.coverTiles = cover;
		this.totalFruit = totalFruit;
		this.fungusTiles = fungi;
		this.flowerTiles = flowers;
		this.flowerPoll = flowers ? flowerPoll / flowers : 0;
		const st = this.stages;
		st.seedlings = seedlings;
		st.mature = mature;
		st.old = old;
		if (ck) {
			st.seedTiles = seedTiles;
			st.seedDormant = this.seedResting;
			this.seedResting = 0;
		}
		this.version++;
	}

	_strategies(tick) {
		const n = this.n;
		const species = this.species;
		const kind = this.kind;
		const form = this.form;
		const bio = this.biomass;
		const cap = this.cap;
		const floor = this.floor;
		const health = this.health;
		const g = this.genome;
		const water = this.water;
		const induced = this.induced;
		const soil = this.soil;
		const nut = soil.nutrient;
		const litter = soil.litter;
		const slope = soil.slope;
		const down = soil.down;
		const bloom = this.bloom;
		const oxygen = this.oxygen;
		const temp = this.world.temperature;
		const hum = this.world.humidity;
		const bugs = this.bugs;
		const st = this.strat;
		let fixers = 0, succ = 0, carn = 0, para = 0, allelo = 0, thorny = 0, ind = 0, blooms = 0, hypoxic = 0, peat = 0, eroded = 0;
		for (let i = 0; i < n; i++) {
			if (water[i]) {
				let N = nut[i];
				let bl = bloom[i];
				const gr = N > BLOOM_N && temp[i] > BLOOM_T ? BLOOM_UP * (N - BLOOM_N) : 0;
				const die = bl * BLOOM_CRASH * (gr > 0 ? 0.2 : 1);
				if (gr > 0 || bl > 0) {
					bl += gr * (1 - bl) - die;
					if (bl < 0.001) bl = 0;
					N -= BLOOM_USE * gr;
					nut[i] = N > 0 ? N : 0;
					if (die > 0) litter[i] += die * BLOOM_LITTER;
					bloom[i] = bl;
				}
				if (bl > BLOOM_SHOW) blooms++;
				let kelp = 0;
				if (species[i] && g[i * PG + 3] > 0.25) kelp = bio[i] < 1 ? bio[i] : 1;
				const rot = litter[i] - ROT_FREE;
				let o = 1 + O2_KELP * kelp - O2_BLOOM * bl - (rot > 0 ? O2_ROT * rot : 0);
				o = o < 0 ? 0 : o > 1 ? 1 : o;
				oxygen[i] = o;
				if (o < HYPOXIA) hypoxic++;
				continue;
			}
			let hold = 0;
			for (let p = i; p < 2 * n; p += n) {
				if (!species[p] || kind[p]) continue;
				const o = p * PG;
				const b = bio[p];
				hold += b * this.root[p];
				if (induced[p] > 0) {
					if (induced[p] > 0.05) ind++;
					induced[p] *= INDUCE_DECAY;
					if (induced[p] < 0.001) induced[p] = 0;
				}
				const fx = g[o + 23];
				if (fx > FIX_AT) {
					fixers++;
					const N = nut[i] + FIX_RATE * fx * (b < 1 ? b : 1);
					nut[i] = N < SOIL_MAX ? N : SOIL_MAX;
				}
				const fm = form[p];
				if (fm & FORM_SUCC) succ++;
				if (g[o + 27] > 0.4) thorny++;
				if (fm & FORM_HET) {
					if (fm & FORM_EPI) {
						para++;
						const hp = p - n;
						if (p >= n && species[hp] && !kind[hp] && g[hp * PG + 3] >= HERB_WOOD) {
							const ex = bio[hp] - floor[hp];
							const want = PARA_DRAIN * b;
							const take = ex <= 0 ? 0 : want < ex ? want : ex;
							bio[hp] -= take;
							const nb = b + take * PARA_EFF;
							bio[p] = nb < cap[p] ? nb : cap[p];
						} else {
							const h = health[p] - PARA_STARVE;
							health[p] = h > 0 ? h : 0;
						}
					} else {
						carn++;
						if (bugs) {
							const got = bugs.eat(i, CARN_EAT * b);
							if (got > 0) {
								const nb = b + got * CARN_BIO;
								bio[p] = nb < cap[p] ? nb : cap[p];
								const h = health[p] + got * CARN_HEALTH;
								health[p] = h < 1 ? h : 1;
								const N = nut[i] + got * CARN_NUT;
								nut[i] = N < SOIL_MAX ? N : SOIL_MAX;
							}
						}
					}
				}
				const al = g[o + 26] - ALLELO_AT;
				if (al > 0) {
					allelo++;
					const q = p < n ? p + n : p - n;
					if (species[q] && species[q] !== species[p] && !kind[q]) {
						const ex = bio[q] - floor[q];
						if (ex > 0) bio[q] -= ex * ALLELO_DMG * al;
					}
				}
			}
			if (soil.decayK[i] < 0.9 && litter[i] > PEAT_SHOW) peat++;
			const sl = slope[i];
			const d = down[i];
			if (sl > 0 && d >= 0) {
				const h = hold / ROOT_HOLD + litter[i] / LITTER_HOLD;
				if (h < 1) {
					const f = EROSION_K * sl * hum[i] * (1 - h);
					const dn = nut[i] * f;
					const dl = litter[i] * f;
					if (dn + dl > EROSION_MIN) {
						nut[i] -= dn;
						litter[i] -= dl;
						const N = nut[d] + dn;
						nut[d] = N < SOIL_MAX ? N : SOIL_MAX;
						litter[d] += dl;
						eroded++;
					}
				}
			}
		}
		st.fixers = fixers;
		st.succulents = succ;
		st.carnivores = carn;
		st.parasites = para;
		st.allelopaths = allelo;
		st.thorny = thorny;
		st.induced = ind;
		st.blooms = blooms;
		st.hypoxic = hypoxic;
		st.peat = peat;
		st.eroded = eroded;
	}

	phaseTick(tick, season) {
		const on = this.seasonsOn;
		phaseCurve(this.bloomBin, tick, 0, on);
		phaseCurve(this.fruitBin, tick, FRUIT_LAG, on);
		this.leafOff = on && season < LEAF_OFF;
	}

	_dropLeaves(p, i) {
		const amp = this.seasonAmp[i];
		if (amp <= LEAF_AMP) return;
		const b = this.biomass[p];
		const fl = this.floor[p] > 0.004 ? this.floor[p] : 0.004;
		if (b <= fl) return;
		const d = (b - fl) * LEAF_DROP * amp;
		this.biomass[p] = b - d;
		this.soil.litter[i] += d;
	}

	updatePheno(tick, season) {
		const n = this.n;
		const pheno = this.pheno;
		const species = this.species;
		const kind = this.kind;
		const water = this.water;
		const form = this.form;
		const amp = this.seasonAmp;
		const g = this.genome;
		const bloomBin = this.bloomBin;
		if (!this.seasonsOn) {
			pheno.fill(0);
			return;
		}
		const falling = Math.cos((tick / YEAR_TICKS) * Math.PI * 2) < 0;
		const bare = season < LEAF_OFF;
		const autumn = falling && season < AUTUMN_AT;
		for (let i = 0; i < n; i++) {
			let v = 0;
			if (water[i]) {
				pheno[i] = 0;
				continue;
			}
			if (species[i] && form[i] & FORM_DECID && amp[i] > LEAF_AMP) v = bare ? PHENO_BARE : autumn ? PHENO_AUTUMN : 0;
			if (!v) {
				const u = n + i;
				const pb = species[i] && g[i * PG + 11] > BLOSSOM_GENE ? i : species[u] && !kind[u] && g[u * PG + 11] > BLOSSOM_GENE ? u : -1;
				if (pb >= 0 && bloomBin[(form[pb] >> 3) & 7] > BLOSSOM_AT) v = PHENO_BLOSSOM;
			}
			pheno[i] = v;
		}
	}

	_seedPass(tick) {
		const n = this.n;
		const sd = this.seedDens;
		const seedSp = this.seedSp;
		const seedGenome = this.seedGenome;
		const species = this.species;
		const water = this.water;
		const moistMul = this.moistMul;
		const snow = this.snow;
		const registry = this.registry;
		const rng = this.rng;
		const g = this._scratch;
		let lastId = 0;
		let sp = null;
		let tiles = 0;
		let resting = 0;
		for (let i = 0; i < n; i++) {
			const s0 = sd[i];
			if (!(s0 > 0)) continue;
			tiles++;
			const mm = moistMul ? moistMul[i] : 1;
			const sn = snow ? snow[i] : 0;
			if (sn > SNOW_SHOW || mm < SEED_REST_DRY) {
				resting++;
				continue;
			}
			const d = s0 * SEED_DECAY;
			if (d < SEED_MIN) {
				sd[i] = 0;
				seedSp[i] = 0;
				tiles--;
				continue;
			}
			sd[i] = d;
			const id = seedSp[i];
			if (id !== lastId) {
				sp = registry.get(id);
				lastId = id;
			}
			if (!sp || sp.population <= 0) {
				sd[i] = 0;
				seedSp[i] = 0;
				continue;
			}
			const base = i * PG;
			const pj = slotOf(seedGenome, water[i], base, sp.kind | 0) * n + i;
			if (species[pj] || rng.next() >= GERM_P * d * (mm * (1 - sn))) continue;
			for (let k = 0; k < PG; k++) g[k] = seedGenome[base + k];
			if (this.plantSeed(i, g, sp, tick, false)) {
				this.germinated++;
				sd[i] = d * GERM_USE;
			} else {
				sd[i] = 0;
				seedSp[i] = 0;
			}
		}
		this.seedResting += resting;
		return tiles;
	}

	_seedTick(i, tick) {
		const sd = this.seedDens;
		const mm = this.moistMul ? this.moistMul[i] : 1;
		const sn = this.snow ? this.snow[i] : 0;
		if (sn > SNOW_SHOW || mm < SEED_REST_DRY) {
			this.seedResting++;
			return 1;
		}
		const d = sd[i] * SEED_DECAY;
		if (d < SEED_MIN) {
			sd[i] = 0;
			this.seedSp[i] = 0;
			return 0;
		}
		sd[i] = d;
		this._germinate(i, d, mm * (1 - sn), tick);
		return 1;
	}

	_germinate(i, d, wk, tick) {
		const sp = this.registry.get(this.seedSp[i]);
		if (!sp || sp.population <= 0) {
			this.seedDens[i] = 0;
			this.seedSp[i] = 0;
			return;
		}
		const pj = slotOf(this.seedGenome, this.water[i], i * PG, sp.kind | 0) * this.n + i;
		if (this.species[pj] || this.rng.next() >= GERM_P * d * wk) return;
		const g = this._scratch;
		const base = i * PG;
		for (let k = 0; k < PG; k++) g[k] = this.seedGenome[base + k];
		if (this.plantSeed(i, g, sp, tick, false)) {
			this.germinated++;
			this.seedDens[i] = d * GERM_USE;
		} else {
			this.seedDens[i] = 0;
			this.seedSp[i] = 0;
		}
	}

	_selfSeed(p, i, id) {
		const base = i * PG;
		const src = p * PG;
		for (let k = 0; k < PG; k++) this.seedGenome[base + k] = this.genome[src + k];
		this.seedSp[i] = id;
		this.seedDens[i] = OLD_SEED;
	}

	_bank(j, genome, off, id) {
		const d = this.seedDens[j];
		if (d <= 0 || this.rng.next() * (d + SEED_ADD) < SEED_ADD) {
			const base = j * PG;
			for (let k = 0; k < PG; k++) this.seedGenome[base + k] = genome[off + k];
			this.seedSp[j] = id;
		}
		const v = d + SEED_ADD;
		this.seedDens[j] = v < SEED_MAX ? v : SEED_MAX;
	}

	_spread(p, i, W, H, tick) {
		const base = p * PG;
		const g = this.genome;
		const landPlant = !this.kind[p] && !this.water[i];
		if (landPlant && plantCycle(g, base) === 1 && this.age[p] * 2 < this.life[p]) return;
		const rng = this.rng;
		const x = i % W;
		const y = (i / W) | 0;
		const cl = this.kind[p] ? 0 : g[base + 22] - CLONAL_MIN;
		if (cl > 0 && rng.next() < cl * CLONAL_K) {
			this._clone(p, i, x, y, W, H, tick);
			return;
		}
		const lift = landPlant ? HEIGHT_REACH * g[base + 20] * g[base + 3] : 0;
		const reach = 1 + Math.floor(rng.next() * (1 + this.disp[p] * 4 + lift));
		const tx = x + Math.round((rng.next() * 2 - 1) * reach);
		const ty = y + Math.round((rng.next() * 2 - 1) * reach);
		if (tx < 0 || ty < 0 || tx >= W || ty >= H) return;
		const j = ty * W + tx;
		if (j === i || this.water[j] !== this.water[i]) return;

		const parentId = this.species[p];
		const same = this.species[p < this.n ? j : this.n + j] === parentId;
		if (same && rng.next() >= 0.5) {
			this._bank(j, this.genome, p * PG, parentId);
			return;
		}
		const child = this._scratch;
		mutateGenes(this.genome, p * PG, child, 0, PG, rng, 0.2, 0.025);
		this.plantSeed(j, child, this.registry.get(parentId), tick);
	}

	_clone(p, i, x, y, W, H, tick) {
		const rng = this.rng;
		const tx = x + Math.round(rng.next() * 2 - 1);
		const ty = y + Math.round(rng.next() * 2 - 1);
		if (tx < 0 || ty < 0 || tx >= W || ty >= H) return;
		const j = ty * W + tx;
		if (j === i || this.water[j] !== this.water[i]) return;
		const parentId = this.species[p];
		const child = this._scratch;
		const base = p * PG;
		for (let k = 0; k < PG; k++) child[k] = this.genome[base + k];
		this._keep = CLONE_BIO;
		if (this.plantSeed(j, child, this.registry.get(parentId), tick, false)) this.clones++;
		this._keep = SPROUT_BIO;
	}

	plantSeed(j, genome, parentSp, tick, bank = true) {
		if (!parentSp) return false;
		const rng = this.rng;
		const kind = parentSp.kind | 0;
		const wet = this.water[j];
		if (wet !== (parentSp.domain === 'water' ? 1 : 0)) return false;
		if (kind === 1) {
			genome[8] = 0;
			genome[9] = 0;
		}
		const bound = (0.8 + 2.4 * genome[3]) * (1 - 0.3 * genome[2]) * this.habit[j] * biomeFit(this.world.biome[j], genome[3], genome[7], genome[6]);
		if (bound < 0.04) return false;
		const parentId = parentSp.id;
		const pj = slotOf(genome, wet, 0, kind) * this.n + j;
		const resident = this.species[pj];
		let resK = 0;
		let resStrength = 0;
		const mixed = resident && pj >= this.n && this.kind[pj] !== kind && this.species[j];
		const sf = mixed ? SHADE_MAX * (this.biomass[j] < SHADE_FULL_BIOMASS ? this.biomass[j] / SHADE_FULL_BIOMASS : 1) : 0;
		if (resident) {
			resK = this.kind[pj] ? this.cap[pj] * this._fungusK(this.myco[pj] === 1, j) : this.cap[pj] * (1 - sf * (1 - this.shade[pj]));
			resStrength = resK * (0.45 + 0.55 * this.biomass[pj] / Math.max(resK, 1e-6)) * (0.5 + 0.5 * this.health[pj]);
			if (resident === parentId ? bound <= resK * 1.02 : bound * 0.85 <= resStrength) {
				if (bank) this._bank(j, genome, 0, parentId);
				return false;
			}
		}
		const tol = 0.09 + 0.22 * genome[2];
		const fit = bound * gaussFit(this.world.temperature[j], genome[0], tol) * gaussFit(this.moistAt(j), genome[1], tol * 1.2);
		if (!(fit >= 0.04)) return false;
		let childK = fit * (kind === 1 ? this._fungusK(genome[11] > 0.5, j) : 1 - sf * (1 - genome[6]));
		const oj = pj < this.n ? pj + this.n : pj - this.n;
		if (!kind && this.species[oj] && this.species[oj] !== parentId && !this.kind[oj]) {
			const al = this.genome[oj * PG + 26] - ALLELO_AT;
			if (al > 0) childK *= 1 - ALLELO_SEED * al;
		}
		if (!(childK >= 0.04) || (bank && !wet && ((this.moistMul && this.moistMul[j] < SEED_DRY) || (this.snow && this.snow[j] > SNOW_SHOW)))) {
			if (bank) this._bank(j, genome, 0, parentId);
			return false;
		}

		if (resident === parentId) {
			if (childK > resK * 1.02) {
				this._assign(pj, parentSp, genome, tick, false);
				return true;
			}
			if (bank) this._bank(j, genome, 0, parentId);
			return false;
		}
		if (resident) {
			const invStrength = childK * 0.85;
			if (invStrength <= resStrength || rng.next() > (invStrength - resStrength) / invStrength) {
				if (bank) this._bank(j, genome, 0, parentId);
				return false;
			}
		}
		this._assign(pj, parentSp, genome, tick, true);
		return true;
	}

	_assign(pj, parentSp, child, tick, fresh) {
		let sp = parentSp;
		const j = pj < this.n ? pj : pj - this.n;
		const domain = this.water[j] ? 'water' : 'land';
		if (geneDistance(child, 0, parentSp.mean, 0, PLANT_WEIGHTS) > PLANT_SPECIATION) {
			sp = this.registry.matchDaughter(parentSp, child, PLANT_WEIGHTS, PLANT_SPECIATION);
			if (!sp && !this.registry.canSplit(parentSp, PLANT_SPLIT_MIN_POP)) sp = parentSp;
			if (!sp) {
				sp = this._newSpecies(child, domain, parentSp, tick, null);
				this.log.push(tick, 'speciation', `${sp.name} (${PLANT_CATEGORY_LABEL[sp.category]}) branched from ${parentSp.name}`, sp.id);
			}
		}
		if (fresh && this.species[pj]) this.soil.returnMatter(j, this.biomass[pj] + this.fruit[pj]);
		const keep = fresh ? this._keep : this.biomass[pj];
		const ag = fresh ? 0 : this.age[pj];
		this._set(pj, sp, child, 0);
		this.biomass[pj] = Math.min(keep, this.cap[pj]);
		if (ag) {
			this.age[pj] = ag;
			if (ag >= this.matureAt(pj)) this.floor[pj] = this.floorM[pj];
		}
	}

	reassignSpecies(fromSp, toSp) {
		const species = this.species;
		const from = fromSp.id;
		const hue = toSp.hsl[0] / 360;
		let moved = 0;
		for (let p = 0; p < 2 * this.n; p++) {
			if (species[p] !== from) continue;
			species[p] = toSp.id;
			this.hue[p] = hue;
			moved++;
		}
		const seedSp = this.seedSp;
		for (let i = 0; i < this.n; i++) if (seedSp[i] === from) seedSp[i] = toSp.id;
		return moved;
	}

	refreshSpeciesMeans() {
		const sums = new Map();
		const species = this.species, genome = this.genome, biomass = this.biomass, health = this.health, blight = this.blight;
		let lastId = 0, s = null;
		for (let p = 0; p < 2 * this.n; p++) {
			const id = species[p];
			if (!id) continue;
			if (id !== lastId) {
				s = sums.get(id);
				if (!s) {
					s = new Float64Array(PG + 4);
					sums.set(id, s);
				}
				lastId = id;
			}
			const base = p * PG;
			for (let k = 0; k < PG; k++) s[k] += genome[base + k];
			s[PG] += 1;
			s[PG + 1] += biomass[p];
			s[PG + 2] += health[p];
			if (blight[p]) s[PG + 3] += 1;
		}
		for (const [id, s] of sums) {
			const sp = this.registry.get(id);
			for (let k = 0; k < PG; k++) sp.mean[k] = s[k] / s[PG];
			sp.biomass = s[PG + 1];
			sp.health = s[PG + 2] / s[PG];
			sp.infected = s[PG + 3];
			sp.category = plantCategory(sp.mean, sp.domain, sp.kind | 0);
			sp.icon = plantIcon(sp.category, sp.id);
			if (sp.animalSeeds) sp.animalSeeds = sp.animalSeeds * DISP_DECAY < 0.05 ? 0 : sp.animalSeeds * DISP_DECAY;
		}
	}
}

const WATER_BIOME_SET = new Set([
	BIOME_ID.OCEAN_DEEP,
	BIOME_ID.OCEAN,
	BIOME_ID.FROZEN_OCEAN,
	BIOME_ID.LAKE,
	BIOME_ID.RIVER,
	BIOME_ID.POND,
	BIOME_ID.CORAL_REEF,
]);

const BIOME_SALT = new Float32Array(BIOME_LIST.length);
const BIOME_WOOD = new Float32Array(BIOME_LIST.length);
const BIOME_SHADE = new Float32Array(BIOME_LIST.length);
BIOME_SALT[BIOME_ID.SALT_FLAT] = 0.85;
BIOME_SALT[BIOME_ID.MANGROVE] = 0.45;
BIOME_WOOD[BIOME_ID.SALT_FLAT] = 0.6;
BIOME_WOOD[BIOME_ID.MANGROVE] = -0.2;
BIOME_WOOD[BIOME_ID.STEPPE] = 0.55;
BIOME_WOOD[BIOME_ID.TUNDRA_BOG] = 0.6;
BIOME_SHADE[BIOME_ID.CLOUD_FOREST] = 0.25;
const BIOME_DEEP = new Float32Array(BIOME_LIST.length);
const BIOME_SOGGY = new Float32Array(BIOME_LIST.length);
BIOME_WOOD[BIOME_ID.FOREST_TEMPERATE] = -0.12;
BIOME_WOOD[BIOME_ID.TAIGA] = -0.1;
BIOME_WOOD[BIOME_ID.RAINFOREST] = -0.15;
BIOME_WOOD[BIOME_ID.JUNGLE] = -0.12;
BIOME_WOOD[BIOME_ID.REDWOOD_FOREST] = -0.18;
BIOME_WOOD[BIOME_ID.WOODLAND] = -0.1;
BIOME_WOOD[BIOME_ID.CLOUD_FOREST] = -0.08;
BIOME_WOOD[BIOME_ID.TUNDRA] = 0.35;
BIOME_SHADE[BIOME_ID.RAINFOREST] = 0.2;
BIOME_SHADE[BIOME_ID.JUNGLE] = 0.15;
BIOME_DEEP[BIOME_ID.DESERT] = 0.4;
BIOME_DEEP[BIOME_ID.BADLANDS] = 0.3;
BIOME_DEEP[BIOME_ID.STEPPE] = 0.15;
BIOME_DEEP[BIOME_ID.SAVANNA] = 0.12;
BIOME_DEEP[BIOME_ID.FROZEN_DESERT] = 0.2;
BIOME_SOGGY[BIOME_ID.WETLAND] = 0.2;
BIOME_SOGGY[BIOME_ID.BOG] = 0.3;
BIOME_SOGGY[BIOME_ID.SWAMP] = 0.15;
BIOME_SOGGY[BIOME_ID.TUNDRA_BOG] = 0.3;

function biomeFit(b, wood, root, shade) {
	return (1 - BIOME_SALT[b] * (1 - root)) * (1 - BIOME_WOOD[b] * wood) * (1 + BIOME_SHADE[b] * shade) * (1 - BIOME_DEEP[b] * (1 - root)) * (1 - BIOME_SOGGY[b] * root);
}
