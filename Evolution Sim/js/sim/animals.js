const AG = 19;
const G_SIZE = 0, G_SPEED = 1, G_SENSE = 2, G_DIET = 3, G_TEMP = 4, G_TOL = 5, G_FEC = 6, G_TOXR = 7, G_ARMOR = 8, G_RES = 9, G_SCAV = 10, G_TERR = 11, G_HERD = 12, G_COLD = 13, G_DRY = 14, G_NEST = 15, G_PACK = 16, G_DISPLAY = 17, G_CHOOSY = 18;
const ANIMAL_WEIGHTS = [1.3, 1, 0.7, 1.8, 1.2, 0.5, 0.8, 0.5, 0.8, 0.25, 0.9, 0.6, 0.6, 1.2, 0.6, 0.3, 0.3, 0.3, 0.3];
const ANIMAL_CLASSES = ['fish', 'amphibian', 'reptile', 'mammal', 'bird', 'invertebrate'];
const CLS_FISH = 0, CLS_AMPH = 1, CLS_REPT = 2, CLS_MAMM = 3, CLS_BIRD = 4, CLS_INVT = 5;
const CLS_COLD = [[0, 1], [0.5, 1], [0.5, 1], [0, 0.45], [0, 0.45], [0.5, 1]];
const ANIMAL_ROLES = ['herbivore', 'omnivore', 'carnivore', 'scavenger'];
const CLASS_PLURAL = ['fish', 'amphibians', 'reptiles', 'mammals', 'birds', 'invertebrates'];
const INVERT_SIZE = 0.45;
const INVERT_BUG = 1.6;
const INVERT_THIRST = 0.5;
const LITTER_ENERGY = 2.4;
const JELLY_SPEED = 0.3;
const INVERT_PREY = 0.7;
const BIRD_SIZE = 0.6;
const FLY_META = 1.3;
const BIRD_BITE = 0.85;
const BIRD_CROWD = 8;
const BIRD_ESCAPE = 0.35;
const BIRD_SPEED = 1.45;
const BIRD_SENSE = 1.4;
const BIRD_BUG = 6;
const BIRD_BUG_ENERGY = 0.9;
const BIRD_BUG_LO = 0.25;
const BIRD_BUG_SPAN = 0.15;
const BIRD_PREY = 0.8;
const BIRD_FISH_MASS = 1.25;
const BIRD_DEPTH = 0.5;
const BIRD_FISH_LURE = 0.6;
const BIRD_STRIKE = 0.1;
const FISHER_HUNT = 0.85;
const FISHER_RANGE = 1.5;
const BIRD_SEED = 1.8;
const BIRD_FRUIT = 1.4;
const BIRD_PERCH = 1.4;
const BIRD_REST_P = 0.6;
const PERCH_COVER = 0.25;
const FLY_MOVE = 0.15;
const MIGRATE_RANGE = 36;
const MIGRATE_HOME = 3;
const BIRD_DROP_K = 0.03;
const BIRD_DROP = 0.35;
const BIRD_NICHES = ['seed', 'insect', 'fisher', 'raptor', 'carrion'];
const ANIMAL_SPECIATION = 0.18;
const ANIMAL_SPLIT_MIN_POP = 12;
const GRID = 6;
const PLANT_ENERGY = 3.2;
const MEAT_ENERGY = 20;
const FRUIT_ENERGY = 8;
const FRUIT_LURE = 3;
const BERRY_MASS = 1.2;
const FRUIT_MIN_BITE = 0.3;
const CARCASS_EATEN = 0.35;
const CARRION_LURE = 6;
const SCAV_LURE = 3;
const SCAV_BITE = 2;
const SCAV_SAMPLES = 12;
const SCAV_RANGE = 1.5;
const SCAV_HUNT = 0.35;
const MILD_LOSS = 0.25;
const NEURO_TICKS = 25;
const LETHAL_P = 0.5;
const AVERSION_DECAY = 0.015;
const MIMIC_HUE = 0.07;
const AVERSION_LOG_GAP = 2400;
const BUG_MASS = 1.4;
const BUG_ENERGY = 0.3;
const BUG_LURE = 1;
const BUG_DIET_PEAK = 0.45;
const BUG_DIET_MAX = 0.66;
const PARASITE_DRAIN = 0.02;
const PARASITE_DEATH_SHARE = 0.08;
const PARASITE_HOST_TOL = 0.3;
const TILE_LOAD_SCALE = 4;
const RES_COST = 0.1;
const SICK_COST = 0.5;
const SICK_SLOW = 0.4;
const SICK_DEATH = 0.005;
const IMMUNE_TICKS = 900;
const CONTACT_R = 1.5;
const CONTACT_K = 0.35;
const CONTACT_MAX = 3;
const CROWD_K = 0.5;
const CROWD_N = 6;
const RES_EFFECT = 0.85;
const PREY_K = 0.5;
const CARCASS_K = 0.1;
const VECTOR_K = 0.05;
const NATIMM_P = 0.003;
const DOMAIN_BIT = [1, 2, 4, 8];
const FEED_BIT = [1, 2, 4, 1];
const THIRST = 0.02;
const THIRSTY = 0.35;
const DRINK_WET = 0.6;
const AMPH_DRINK_WET = 0.5;
const AMPH_DRY = 2;
const AMPH_RANGE = 5;
const AMPH_DEPTH = 0.35;
const DEHYDRATE_COST = 2.5;
const DEHYDRATE_DEATH = 0.02;
const FRUIT_WATER = 0.15;
const GRAZE_WATER = 0.02;
const MEAT_WATER = 0.2;
const WATERHOLE = 0.25;
const WATER_SAMPLES = 8;
const COLD_META = 0.225;
const COLD_SLOW = 0.9;
const TERR_MIN = 0.5;
const TERR_EVERY = 10;
const TERR_HOLD = 30;
const TERR_RIVAL = 0.3;
const TERR_BITE = 0.15;
const TERR_REPRO = 0.15;
const TERR_COST = 0.08;
const HERD_MIN = 0.4;
const HERD_PULL = 0.6;
const HERD_SAFE = 0.5;
const HERD_SAFE_N = 6;
const HERD_CONTACT = 0.6;
const RES_NUDGE = 0.02;
const MATURE_BASE = 90;
const MATURE_SIZE = 160;
const JUV_MIN = 0.4;
const ELDER_AGE = 0.75;
const ELDER_MIN = 0.6;
const ELDER_FERTILE = 0.9;
const ELDER_INFECT = 0.5;
const OLD_START = 0.85;
const OLD_P = 0.0015;
const OLD_K = 12;
const FOLLOW_EVERY = 4;
const GEN_TAX = 0.22;
const GEN_LO = 0.2;
const GEN_HI = 0.8;
const COLD_UPKEEP = 0.15;
const DRY_COST = 0.08;
const SCAV_PLANT = 0.5;
const EGG_LURE = 4.5;
const HERB_GRAZE = 1.15;
const NEST_MIN = 0.4;
const NEST_EVERY = 10;
const NEST_SAMPLES = 8;
const NEST_RANGE = 8;
const NEST_NEAR = 1.5;
const NEST_FAR = 24;
const NEST_COST = 0.06;
const NEST_DEPTH = 0.4;
const NEST_WARM = 0.45;
const NEST_OPEN = 0.4;
const NEST_TALL = 0.62;
const DEN_SITE = 0.3;
const DEN_R = 4;
const DEN_COVER = 0.35;
const DEN_SHELTER = 0.5;
const DEN_PARA = 1;
const DEN_CONTACT = 0.3;
const GUARD_R = 3;
const GUARD_E = 0.45;
const CLEAN_K = 0.03;
const FEED_EVERY = 5;
const FEED_E = 0.5;
const FEED_R = 8;
const FEED_TOP = 0.8;
const FEED_EFF = 0.8;
const EGG_VERT_K = 0.3;

const ANIMAL_ARCHETYPES = [
	{ domain: 'land', cls: CLS_MAMM, n: 50, g: [0.12, 0.5, 0.45, 0.04, 0.5, 0.65, 0.85, 0.3, 0.08, 0.15, 0.1, 0.05, 0.6, 0.05, 0.3, 0.55, 0.15, 0.3, 0.3] },
	{ domain: 'land', cls: CLS_MAMM, n: 40, g: [0.45, 0.62, 0.55, 0.05, 0.45, 0.5, 0.4, 0.35, 0.2, 0.15, 0.1, 0.05, 0.6, 0.05, 0.3, 0.25, 0.15, 0.3, 0.3] },
	{ domain: 'land', cls: CLS_MAMM, n: 25, g: [0.85, 0.28, 0.35, 0.04, 0.55, 0.5, 0.15, 0.55, 0.7, 0.15, 0.1, 0.05, 0.6, 0.05, 0.3, 0.25, 0.15, 0.3, 0.3] },
	{ domain: 'land', cls: CLS_MAMM, n: 35, g: [0.32, 0.72, 0.5, 0.06, 0.8, 0.45, 0.5, 0.6, 0.15, 0.15, 0.1, 0.05, 0.6, 0.05, 0.3, 0.25, 0.15, 0.3, 0.3] },
	{ domain: 'land', cls: CLS_MAMM, n: 30, g: [0.55, 0.45, 0.45, 0.05, 0.18, 0.45, 0.35, 0.3, 0.35, 0.15, 0.1, 0.05, 0.6, 0.05, 0.3, 0.25, 0.15, 0.3, 0.3] },
	{ domain: 'land', cls: CLS_MAMM, n: 24, g: [0.42, 0.42, 0.45, 0.45, 0.5, 0.55, 0.55, 0.4, 0.2, 0.15, 0.1, 0.35, 0.1, 0.05, 0.3, 0.5, 0.15, 0.3, 0.3] },
	{ domain: 'land', cls: CLS_MAMM, n: 10, g: [0.3, 0.68, 0.7, 0.88, 0.55, 0.6, 0.55, 0.3, 0.1, 0.15, 0.1, 0.5, 0.1, 0.05, 0.3, 0.55, 0.4, 0.3, 0.3] },
	{ domain: 'land', cls: CLS_MAMM, n: 8, g: [0.62, 0.72, 0.75, 0.92, 0.42, 0.6, 0.35, 0.3, 0.25, 0.15, 0.1, 0.5, 0.1, 0.05, 0.3, 0.5, 0.4, 0.3, 0.3] },
	{ domain: 'water', cls: CLS_FISH, n: 60, g: [0.18, 0.5, 0.45, 0.04, 0.5, 0.6, 0.85, 0.3, 0.1, 0.15, 0.1, 0.05, 0.5, 0.05, 0.3, 0.3, 0.15, 0.3, 0.3] },
	{ domain: 'water', cls: CLS_FISH, n: 40, g: [0.32, 0.45, 0.45, 0.06, 0.78, 0.45, 0.6, 0.4, 0.3, 0.15, 0.1, 0.05, 0.5, 0.05, 0.3, 0.45, 0.15, 0.3, 0.3] },
	{ domain: 'water', cls: CLS_INVT, n: 24, g: [0.35, 0.3, 0.4, 0.45, 0.45, 0.55, 0.6, 0.3, 0.5, 0.15, 0.65, 0.35, 0.1, 0.5, 0.3, 0.3, 0.15, 0.3, 0.3] },
	{ domain: 'water', cls: CLS_FISH, n: 8, g: [0.4, 0.66, 0.65, 0.85, 0.35, 0.6, 0.5, 0.3, 0.15, 0.15, 0.1, 0.5, 0.1, 0.05, 0.3, 0.3, 0.4, 0.3, 0.3] },
	{ domain: 'water', cls: CLS_FISH, n: 6, g: [0.75, 0.72, 0.75, 0.92, 0.6, 0.55, 0.3, 0.3, 0.3, 0.15, 0.1, 0.5, 0.1, 0.05, 0.3, 0.3, 0.4, 0.3, 0.3] },
	{ domain: 'land', cls: CLS_MAMM, n: 18, g: [0.38, 0.45, 0.6, 0.45, 0.5, 0.65, 0.6, 0.6, 0.2, 0.3, 0.8, 0.35, 0.1, 0.05, 0.3, 0.5, 0.15, 0.3, 0.3] },
	{ domain: 'amph', cls: CLS_AMPH, n: 16, g: [0.14, 0.5, 0.45, 0.45, 0.55, 0.55, 0.8, 0.5, 0.05, 0.15, 0.1, 0.2, 0.2, 0.6, 0.2, 0.45, 0.15, 0.3, 0.3] },
	{ domain: 'amph', cls: CLS_AMPH, n: 16, g: [0.12, 0.4, 0.4, 0.08, 0.5, 0.55, 0.8, 0.4, 0.05, 0.15, 0.1, 0.05, 0.3, 0.6, 0.2, 0.3, 0.15, 0.3, 0.3] },
	{ domain: 'amph', cls: CLS_AMPH, n: 16, g: [0.25, 0.5, 0.5, 0.8, 0.5, 0.55, 0.6, 0.4, 0.1, 0.15, 0.1, 0.35, 0.1, 0.6, 0.2, 0.3, 0.4, 0.3, 0.3] },
	{ domain: 'amph', cls: CLS_REPT, n: 16, g: [0.85, 0.4, 0.5, 0.9, 0.7, 0.5, 0.4, 0.5, 0.7, 0.15, 0.3, 0.5, 0.1, 0.8, 0.4, 0.5, 0.4, 0.3, 0.3] },
	{ domain: 'land', cls: CLS_REPT, n: 16, g: [0.2, 0.6, 0.5, 0.45, 0.8, 0.5, 0.6, 0.5, 0.15, 0.15, 0.1, 0.4, 0.1, 0.85, 0.8, 0.3, 0.15, 0.3, 0.3] },
	{ domain: 'land', cls: CLS_REPT, n: 16, g: [0.55, 0.15, 0.35, 0.05, 0.78, 0.5, 0.4, 0.5, 0.9, 0.15, 0.1, 0.05, 0.1, 0.85, 0.8, 0.3, 0.15, 0.3, 0.3] },
	{ domain: 'land', cls: CLS_REPT, n: 16, g: [0.55, 0.5, 0.55, 0.85, 0.8, 0.5, 0.4, 0.4, 0.3, 0.15, 0.3, 0.5, 0.1, 0.8, 0.7, 0.3, 0.4, 0.3, 0.3] },
	{ domain: 'land', cls: CLS_REPT, n: 16, g: [0.3, 0.45, 0.85, 0.9, 0.78, 0.5, 0.5, 0.5, 0.1, 0.15, 0.1, 0.5, 0.1, 0.85, 0.7, 0.3, 0.4, 0.3, 0.3] },
	{ domain: 'water', cls: CLS_REPT, n: 14, g: [0.5, 0.35, 0.4, 0.06, 0.65, 0.5, 0.45, 0.4, 0.75, 0.15, 0.1, 0.05, 0.3, 0.7, 0.3, 0.45, 0.1, 0.3, 0.3] },
	{ domain: 'water', cls: CLS_MAMM, n: 8, g: [0.55, 0.65, 0.65, 0.8, 0.3, 0.6, 0.35, 0.3, 0.2, 0.15, 0.1, 0.3, 0.4, 0.1, 0.3, 0.25, 0.5, 0.3, 0.3] },
	{ domain: 'water', cls: CLS_INVT, n: 30, g: [0.15, 0.15, 0.3, 0.06, 0.5, 0.6, 0.85, 0.5, 0.8, 0.15, 0.2, 0.05, 0.2, 0.8, 0.3, 0.1, 0.1, 0.2, 0.2] },
	{ domain: 'water', cls: CLS_INVT, n: 12, g: [0.28, 0.7, 0.75, 0.8, 0.5, 0.55, 0.7, 0.5, 0.05, 0.15, 0.2, 0.2, 0.1, 0.8, 0.3, 0.2, 0.1, 0.4, 0.3] },
	{ domain: 'water', cls: CLS_INVT, n: 14, g: [0.2, 0.15, 0.3, 0.75, 0.55, 0.6, 0.85, 0.7, 0.05, 0.15, 0.1, 0.05, 0.3, 0.85, 0.3, 0.05, 0.1, 0.2, 0.2] },
	{ domain: 'land', cls: CLS_INVT, n: 30, g: [0.06, 0.12, 0.3, 0.08, 0.5, 0.6, 0.9, 0.6, 0.6, 0.15, 0.1, 0.05, 0.1, 0.8, 0.2, 0.1, 0.1, 0.2, 0.2] },
	{ domain: 'land', cls: CLS_INVT, n: 24, g: [0.08, 0.55, 0.6, 0.8, 0.6, 0.55, 0.85, 0.6, 0.3, 0.15, 0.1, 0.2, 0.05, 0.8, 0.6, 0.2, 0.05, 0.2, 0.2] },
	{ domain: 'air', cls: CLS_BIRD, n: 40, g: [0.14, 0.55, 0.5, 0.12, 0.55, 0.55, 0.7, 0.4, 0.02, 0.15, 0.1, 0.1, 0.6, 0.1, 0.3, 0.5, 0.1, 0.5, 0.4] },
	{ domain: 'air', cls: CLS_BIRD, n: 40, g: [0.1, 0.55, 0.55, 0.45, 0.6, 0.5, 0.7, 0.4, 0.02, 0.15, 0.1, 0.1, 0.5, 0.1, 0.3, 0.42, 0.1, 0.5, 0.4] },
	{ domain: 'air', cls: CLS_BIRD, nic: 1, n: 20, g: [0.32, 0.42, 0.55, 0.78, 0.5, 0.55, 0.7, 0.3, 0.05, 0.15, 0.1, 0.2, 0.3, 0.1, 0.3, 0.45, 0.1, 0.4, 0.3] },
	{ domain: 'air', cls: CLS_BIRD, n: 12, g: [0.42, 0.7, 0.85, 0.9, 0.5, 0.55, 0.55, 0.3, 0.05, 0.15, 0.1, 0.3, 0.05, 0.1, 0.4, 0.55, 0.1, 0.4, 0.3] },
	{ domain: 'air', cls: CLS_BIRD, n: 10, g: [0.55, 0.45, 0.9, 0.7, 0.65, 0.5, 0.4, 0.6, 0.05, 0.3, 0.85, 0.2, 0.3, 0.1, 0.6, 0.35, 0.1, 0.3, 0.3] },
];

const FOUNDER_PACK = 0.6;
const FOUNDER_CHOOSY = 0.55;
for (const a of ANIMAL_ARCHETYPES) {
	const g = a.g;
	if (a.cls === CLS_MAMM && a.domain === 'land' && g[G_DIET] > 0.66) g[G_PACK] = FOUNDER_PACK;
	if (a.cls === CLS_BIRD && !a.nic && g[G_DIET] < 0.66) g[G_CHOOSY] = FOUNDER_CHOOSY;
}

function domainIndex(d) {
	return d === 'water' ? 1 : d === 'amph' ? 2 : d === 'air' ? 3 : 0;
}

function birdNiche(diet, scav, nic) {
	if (nic) return 2;
	const r = roleIndex(diet, scav);
	return r === 0 ? 0 : r === 1 ? 1 : r === 2 ? 3 : 4;
}

function dietRole(diet) {
	return diet < 0.33 ? 'herbivore' : diet < 0.66 ? 'omnivore' : 'carnivore';
}

function roleIndex(diet, scav) {
	return diet >= 0.33 && scav > 0.5 ? 3 : diet < 0.33 ? 0 : diet < 0.66 ? 1 : 2;
}

function animalCategory(g, domain, cls = CLS_MAMM, nic = 0) {
	const size = g[G_SIZE];
	const role = dietRole(g[G_DIET]);
	const scav = role !== 'herbivore' && g[G_SCAV] > 0.5;
	if (cls === CLS_BIRD) {
		if (nic) return 'wader';
		if (scav) return 'vulture';
		if (role === 'herbivore') return size < 0.4 ? 'seedbird' : 'fowl';
		if (role === 'omnivore') return 'insectbird';
		return 'raptor';
	}
	if (cls === CLS_INVT) {
		if (domain === 'water') {
			if (role === 'herbivore') return 'urchin';
			if (role === 'omnivore' || scav) return 'crab';
			return g[G_SPEED] < JELLY_SPEED ? 'jelly' : 'octopus';
		}
		return g[G_DIET] < 0.5 ? 'snail' : 'spider';
	}
	if (cls === CLS_FISH) {
		if (role === 'herbivore') return size < 0.45 ? 'fish' : 'ray';
		if (role === 'omnivore') return 'reeffish';
		return size < 0.58 ? 'pike' : 'shark';
	}
	if (cls === CLS_AMPH) {
		if (role === 'herbivore') return 'newt';
		if (role === 'omnivore') return 'frog';
		return 'salamander';
	}
	if (cls === CLS_REPT) {
		if (domain === 'water') return role === 'herbivore' ? 'seaturtle' : 'crocodile';
		if (domain === 'amph') return role === 'herbivore' ? 'seaturtle' : 'crocodile';
		if (role === 'herbivore') return 'tortoise';
		if (role === 'omnivore') return 'lizard';
		return size < 0.45 ? 'snake' : 'monitor';
	}
	if (domain === 'water') return role === 'herbivore' ? 'manatee' : 'seal';
	if (scav) return 'carrion';
	if (role === 'herbivore') return size < 0.28 ? 'rabbit' : size < 0.66 ? 'deer' : 'bison';
	if (role === 'omnivore') return size < 0.35 ? 'mouse' : size < 0.72 ? 'boar' : 'bear';
	return size < 0.42 ? 'fox' : size < 0.74 ? 'wolf' : 'bigcat';
}

const ANIMAL_ICON_VARIANTS = {
	fox: ['fox', 'weasel'],
	wolf: ['wolf', 'coyote'],
	bigcat: ['bigcat', 'tiger'],
	rabbit: ['rabbit', 'squirrel'],
	deer: ['deer', 'horse', 'goat', 'kangaroo'],
	bison: ['bison', 'cow', 'elephant', 'moose'],
	mouse: ['mouse', 'squirrel'],
	boar: ['boar', 'raccoon', 'badger', 'monkey'],
	bear: ['bear', 'ape'],
	carrion: ['hyena', 'jackal'],
	manatee: ['manatee'],
	seal: ['seal', 'orca'],
	crab: ['crab', 'lobster', 'hermitcrab', 'shrimp'],
	urchin: ['urchin', 'seasnail', 'clam'],
	octopus: ['octopus', 'squid'],
	jelly: ['jellyfish'],
	snail: ['snail', 'slug'],
	spider: ['spider', 'scorpion', 'centipede'],
	fish: ['fish', 'eel', 'seahorse'],
	ray: ['ray'],
	reeffish: ['puffer', 'fish'],
	pike: ['pike', 'barracuda'],
	shark: ['shark', 'swordfish'],
	frog: ['frog', 'toad'],
	newt: ['newt', 'axolotl'],
	salamander: ['salamander', 'axolotl'],
	crocodile: ['crocodile'],
	seaturtle: ['turtle'],
	tortoise: ['tortoise', 'turtle'],
	lizard: ['lizard'],
	snake: ['snake'],
	monitor: ['monitor'],
	seedbird: ['sparrow', 'parrot'],
	fowl: ['chicken'],
	insectbird: ['swallow', 'crow'],
	wader: ['heron', 'gull', 'duck'],
	raptor: ['hawk', 'eagle', 'owl'],
	vulture: ['vulture'],
};

function animalIcon(category, id) {
	const v = ANIMAL_ICON_VARIANTS[category];
	return v ? v[id % v.length] : category;
}

const ANIMAL_CATEGORY_LABEL = {
	rabbit: 'Small grazer',
	deer: 'Browser',
	bison: 'Large grazer',
	mouse: 'Small omnivore',
	boar: 'Omnivore',
	bear: 'Large omnivore',
	fox: 'Small predator',
	wolf: 'Predator',
	bigcat: 'Apex predator',
	carrion: 'Scavenger',
	fish: 'Grazing fish',
	ray: 'Large grazing fish',
	reeffish: 'Omnivorous fish',
	crab: 'Sea scavenger',
	pike: 'Predatory fish',
	shark: 'Apex predator (aquatic)',
	manatee: 'Sea mammal',
	seal: 'Marine predator',
	urchin: 'Sea grazer',
	octopus: 'Cephalopod',
	jelly: 'Drifting stinger',
	snail: 'Snail',
	spider: 'Arachnid hunter',
	seaturtle: 'Sea turtle',
	newt: 'Newt',
	frog: 'Frog',
	salamander: 'Salamander',
	crocodile: 'Crocodile',
	tortoise: 'Tortoise',
	lizard: 'Lizard',
	snake: 'Snake',
	monitor: 'Monitor',
	seedbird: 'Seed bird',
	fowl: 'Ground bird',
	insectbird: 'Insect bird',
	wader: 'Fishing bird',
	raptor: 'Raptor',
	vulture: 'Carrion bird',
};

const PACK_MIN = 0.45;
const PACK_R = 9;
const PACK_MAX = 8;
const PACK_K = 0.5;
const PACK_CAP = 2.6;
const PACK_PREY_K = 0.35;
const PACK_PREY_CAP = 2.2;
const PACK_HELP_R = 3;
const PACK_PULL = 0.85;
const PACK_HUNGRY = 0.65;
const PACK_JOIN = 0.95;
const PACK_PACE = 1.25;
const PACK_SICK_SLOW = 0.5;
const PACK_SICK_LEAD = 0.3;
const PACK_BIG = 1.5;
const DISPLAY_COST = 0.12;
const DISPLAY_SPOT = 0.6;
const DISPLAY_SEEN = 0.5;
const SICK_DISPLAY = 0.35;
const PARA_DULL = 0.5;
const MATE_SAMPLES = 8;
const MATE_SHARP = 60;
const MATE_K = 0.4;
const CHOOSY_WAIT = 12;
const SHOWY_ON = 0.7;
const SHOWY_OFF = 0.6;
const SHOW_EVERY = 100;
const SHOW_HIST = 120;

const ANIMAL_FIELDS_F = [
	'x', 'y', 'px', 'py', 'energy', 'age', 'tx', 'ty',
	'mass', 'spd', 'range', 'plantEff', 'meatEff', 'emax', 'meta', 'mature', 'maxAge',
	'litter', 'pT', 'tol', 'toxR', 'armor', 'diet', 'bite', 'carrionEff', 'scav',
	'terr', 'herd', 'cold', 'dry', 'hr', 'water', 'hx', 'hy', 'gf', 'ef', 'oy', 'nx', 'ny',
];
const ANIMAL_FIELDS_I = ['sp', 'uid', 'cool', 'ttl', 'face', 'domain', 'cls', 'alive', 'state', 'seedSp', 'seedTtl', 'confuse', 'strain', 'itime', 'immune', 'imTime', 'natImm', 'parent', 'fly', 'nic', 'home'];
ANIMAL_FIELDS_F.push('show');
ANIMAL_FIELDS_I.push('pk', 'pn');

class AnimalPool {
	constructor(world, plants, registry, rng, log) {
		this.world = world;
		this.plants = plants;
		this.registry = registry;
		this.rng = rng;
		this.log = log;
		this.cap = 0;
		this.count = 0;
		this.nextUid = 1;
		this.maxAnimals = 7000;
		this._grow(2048);

		const W = world.width;
		const H = world.height;
		this.gcols = Math.ceil(W / GRID);
		this.grows = Math.ceil(H / GRID);
		this.gstart = new Int32Array(this.gcols * this.grows + 1);
		this.gitems = new Int32Array(this.cap);
		this.gcell = new Int32Array(this.cap);

		const n = W * H;
		this.tileLoad = new Uint16Array(n);
		this.parasiteLoad = new Float32Array(n);
		this.parasiteHost = new Float32Array(n);
		this.bugs = null;
		this.disease = null;
		this.eggs = null;
		this.walk = new Uint8Array(n);
		for (let i = 0; i < n; i++) {
			const b = world.biome[i];
			if (b === BIOME_ID.RIVER || b === BIOME_ID.POND) this.walk[i] = 3;
			else if (WATER_BIOME_SET.has(b)) this.walk[i] = 2;
			else this.walk[i] = b === BIOME_ID.GLACIER ? 0 : b === BIOME_ID.BEACH || b === BIOME_ID.CLIFF ? 17 : 1;
			this.walk[i] |= 8;
			if (b === BIOME_ID.HILLS || b === BIOME_ID.BADLANDS || b === BIOME_ID.MOUNTAINS || b === BIOME_ID.CLIFF) this.walk[i] |= 32;
		}
		this.childGenome = new Float32Array(AG);
		this.deaths = { starved: 0, eaten: 0, old: 0, poison: 0, parasite: 0, disease: 0, thirst: 0 };
		this.landDeaths = 0;
		this.weather = null;
		this.terrSp = new Int32Array(n);
		this.terrUid = new Int32Array(n);
		this.terrUntil = new Int32Array(n);
		this.terrRole = new Uint8Array(n);
		this.holders = 0;
		this.tick = 0;
		this._cx = 0;
		this._cy = 0;
		this.carrionEnergy = 0;
		this.scavEnergy = 0;
		this._contactBuf = new Int32Array(CONTACT_MAX);
		this.seedGenome = new Float32Array(PG);
		this.aversionEvents = 0;
		this._avoidLogged = new Map();
		this._migLogged = new Map();
		this.birdMigrants = 0;
		this.packKills = 0;
		this.bigKills = 0;
		this.mateRefusals = 0;
		this._packBuf = new Int32Array(PACK_MAX);
		this._mateBuf = new Int32Array(MATE_SAMPLES);
	}

	_grow(newCap) {
		const old = this.cap;
		for (const f of ANIMAL_FIELDS_F) {
			const a = new Float32Array(newCap);
			if (old) a.set(this[f]);
			this[f] = a;
		}
		for (const f of ANIMAL_FIELDS_I) {
			const a = new Int32Array(newCap);
			if (old) a.set(this[f]);
			this[f] = a;
		}
		const g = new Float32Array(newCap * AG);
		if (old) g.set(this.genome);
		this.genome = g;
		this.cap = newCap;
		if (this.gitems) {
			this.gitems = new Int32Array(newCap);
			this.gcell = new Int32Array(newCap);
		}
	}

	setWeather(Wx) {
		this.weather = Wx;
		const walk = this.walk;
		const depth = this.plants.depth;
		for (let i = 0; i < walk.length; i++) {
			const w = walk[i];
			if (!(w & 3)) continue;
			if (w & 2) {
				if (depth[i] < AMPH_DEPTH && !this.world.isOcean[i]) walk[i] = w | 4;
			} else if (!Wx || Wx.waterDist[i] <= AMPH_RANGE) walk[i] = w | 4;
		}
	}

	_perch(j) {
		const w = this.walk[j];
		return (w & 1) !== 0 && ((w & 16) !== 0 || this.plants.cover(j) > PERCH_COVER);
	}

	canStand(domain, x, y) {
		const W = this.world.width;
		if (x < 0 || y < 0 || x >= W || y >= this.world.height) return false;
		const w = this.walk[(y | 0) * W + (x | 0)];
		return (w & DOMAIN_BIT[domain]) !== 0;
	}

	_decode(i) {
		const g = this.genome;
		const o = i * AG;
		const size = g[o + G_SIZE];
		const speed = g[o + G_SPEED];
		const sense = g[o + G_SENSE];
		const diet = g[o + G_DIET];
		const armor = g[o + G_ARMOR];
		const toxR = g[o + G_TOXR];
		const scav = g[o + G_SCAV];
		const terr = g[o + G_TERR];
		const cold = g[o + G_COLD];
		const mass = 0.35 + 2.5 * size;
		const m75 = Math.pow(mass, 0.75);
		this.mass[i] = mass;
		this.spd[i] = (0.35 + 1.05 * speed) * (1 - 0.3 * armor);
		this.range[i] = 3 + 9 * sense;
		this.diet[i] = diet;
		this.plantEff[i] = 1 - diet * diet;
		this.meatEff[i] = Math.pow(diet, 1.2);
		this.carrionEff[i] = this.meatEff[i] * (0.2 + 0.8 * scav);
		this.scav[i] = scav;
		this.emax[i] = 22 * mass;
		this.meta[i] = 0.05 * m75 * (1 + 0.9 * speed * speed + 0.35 * sense + 0.3 * armor + 0.2 * toxR + 0.15 * g[o + G_TOL]) * (1 + RES_COST * g[o + G_RES]) * (1 + TERR_COST * terr) * (1 - COLD_META * cold) * (1 + DRY_COST * g[o + G_DRY]) * (1 + NEST_COST * g[o + G_NEST]);
		this.mature[i] = MATURE_BASE + MATURE_SIZE * size;
		this.maxAge[i] = 500 + 1300 * size;
		this.litter[i] = 1 + Math.round(3 * g[o + G_FEC]);
		this.pT[i] = g[o + G_TEMP];
		this.tol[i] = 0.08 + 0.3 * g[o + G_TOL];
		this.toxR[i] = toxR;
		this.armor[i] = armor;
		this.bite[i] = 0.058 * m75;
		this.terr[i] = terr;
		this.herd[i] = terr > TERR_MIN ? 0 : g[o + G_HERD];
		this.cold[i] = cold;
		this.dry[i] = g[o + G_DRY];
		this.hr[i] = 2 + 5 * size;
		this.meta[i] *= 1 + DISPLAY_COST * g[o + G_DISPLAY];
		if (this.cls[i] === CLS_BIRD) {
			this.spd[i] *= BIRD_SPEED;
			this.range[i] *= BIRD_SENSE;
			this.terr[i] = 0;
			this.herd[i] = g[o + G_HERD];
		}
	}

	_stage(i) {
		const a = this.age[i];
		const m = this.mature[i];
		this.gf[i] = a < m ? JUV_MIN + (1 - JUV_MIN) * (a / m) : 1;
		const r = a / this.maxAge[i];
		this.ef[i] = r > ELDER_AGE ? Math.max(ELDER_MIN, 1 - ((1 - ELDER_MIN) * (r - ELDER_AGE)) / (1 - ELDER_AGE)) : 1;
	}

	spawn(sp, genome, gOff, x, y, energyFrac) {
		if (this.count >= this.cap) this._grow(this.cap * 2);
		const i = this.count++;
		const o = i * AG;
		for (let k = 0; k < AG; k++) this.genome[o + k] = genome[gOff + k];
		this.domain[i] = domainIndex(sp.domain);
		this.cls[i] = sp.cls;
		this.nic[i] = sp.nic | 0;
		this._decode(i);
		this.x[i] = this.px[i] = this.tx[i] = x;
		this.y[i] = this.py[i] = this.ty[i] = y;
		this.energy[i] = this.emax[i] * energyFrac;
		this.age[i] = 0;
		this._stage(i);
		this.sp[i] = sp.id;
		this.uid[i] = this.nextUid++;
		this.cool[i] = 0;
		this.ttl[i] = 0;
		this.face[i] = this.rng.next() < 0.5 ? 1 : -1;
		this.water[i] = 1;
		this.oy[i] = y;
		this.fly[i] = 0;
		this.hx[i] = -1;
		this.hy[i] = -1;
		this.nx[i] = -1;
		this.ny[i] = -1;
		this.home[i] = 0;
		this.alive[i] = 1;
		this.state[i] = 0;
		this.seedSp[i] = 0;
		this.seedTtl[i] = 0;
		this.confuse[i] = 0;
		this.strain[i] = 0;
		this.itime[i] = 0;
		this.immune[i] = 0;
		this.imTime[i] = 0;
		this.natImm[i] = 0;
		this.parent[i] = 0;
		this.show[i] = 0;
		this.pk[i] = 0;
		this.pn[i] = 0;
		this.registry.add(sp);
		return i;
	}

	newSpecies(genome, gOff, domain, parent, tick, origin, cls = parent ? parent.cls : CLS_MAMM, nic = parent ? parent.nic | 0 : 0) {
		const g = genome.subarray(gOff, gOff + AG);
		const r = this.rng;
		const diet = g[G_DIET];
		const hue = parent ? (parent.hsl[0] + 25 + r.next() * 310) % 360 : r.next() * 360;
		const hsl = [hue, 0.5 + r.next() * 0.2, 0.5 + r.next() * 0.1 - diet * 0.04];
		const sp = this.registry.create(
			{
				group: 'animal',
				domain,
				genome: g,
				parentId: parent ? parent.id : null,
				generation: parent ? parent.generation + 1 : 0,
				tick,
				origin,
			},
			hsl
		);
		sp.cls = cls;
		sp.nic = nic;
		sp.category = animalCategory(g, domain, cls, nic);
		sp.icon = animalIcon(sp.category, sp.id);
		sp.role = ANIMAL_ROLES[roleIndex(diet, g[G_SCAV])];
		sp.aversion = parent && parent.aversion ? parent.aversion.map((a) => ({ hue: a.hue, strength: a.strength })) : [];
		return sp;
	}

	_buildGrid() {
		const n = this.count;
		const cols = this.gcols;
		const start = this.gstart;
		start.fill(0);
		for (let i = 0; i < n; i++) {
			const c = ((this.y[i] / GRID) | 0) * cols + ((this.x[i] / GRID) | 0);
			this.gcell[i] = c;
			start[c + 1]++;
		}
		for (let c = 1; c < start.length; c++) start[c] += start[c - 1];
		const fill = this._fill && this._fill.length === start.length ? this._fill : (this._fill = new Int32Array(start.length));
		fill.set(start);
		for (let i = 0; i < n; i++) this.gitems[fill[this.gcell[i]]++] = i;
	}

	_nearest(i, r, mode, preyMul = 1) {
		const x = this.x[i];
		const y = this.y[i];
		const cols = this.gcols;
		const c0 = Math.max(0, ((x - r) / GRID) | 0);
		const c1 = Math.min(cols - 1, ((x + r) / GRID) | 0);
		const r0 = Math.max(0, ((y - r) / GRID) | 0);
		const r1 = Math.min(this.grows - 1, ((y + r) / GRID) | 0);
		const dom = this.domain[i];
		const diet = this.diet[i];
		const mass = this.mass[i] * this.gf[i];
		const sp = this.sp[i];
		const role = diet < 0.33 ? 0 : diet < 0.66 ? 1 : 2;
		const preyK = this.cls[i] === CLS_INVT ? INVERT_PREY : this.cls[i] === CLS_BIRD ? BIRD_PREY : diet > 0.66 ? 1.8 * preyMul : 0.6;
		let best = -1;
		let bestD = r * r;
		for (let gy = r0; gy <= r1; gy++) {
			for (let gx = c0; gx <= c1; gx++) {
				const c = gy * cols + gx;
				for (let k = this.gstart[c], e = this.gstart[c + 1]; k < e; k++) {
					const j = this.gitems[k];
					if (j === i || !this.alive[j]) continue;
					const dj = this.domain[j];
					if (dj !== dom || dom === 3) {
						if (dj === 3 || dom === 3) {
							if (mode === 1) {
								if (!this._canEat(i, j)) continue;
							} else if (mode === 0) {
								if (!this._canEat(j, i)) continue;
							} else if (dj !== dom) continue;
						} else if (dj !== 2 && dom !== 2) continue;
					}
					if (mode === 0) {
						if (this.diet[j] - diet < 0.3 || this.meatEff[j] < 0.3 || mass > this.mass[j] * this.gf[j] * 1.8) continue;
					} else if (mode === 1) {
						if (diet - this.diet[j] < 0.3 || this.mass[j] * this.gf[j] > mass * preyK) continue;
					} else if (mode === 3) {
						const dd = this.diet[j];
						if ((dd < 0.33 ? 0 : dd < 0.66 ? 1 : 2) !== role) continue;
					} else if (this.sp[j] !== sp || this.age[j] < this.mature[j]) continue;
					const dx = this.x[j] - x;
					const dy = this.y[j] - y;
					const d = (dx * dx + dy * dy) * (mode === 1 ? 1 - DISPLAY_SEEN * this.show[j] : 1);
					if (d < bestD) {
						bestD = d;
						best = j;
					}
				}
			}
		}
		return best;
	}

	_canEat(h, p) {
		const dh = this.domain[h];
		const dp = this.domain[p];
		if (dh !== 3) return dh !== 1 && !this.fly[p];
		if (this.nic[h]) return dp !== 0 && dp !== 3 && this.mass[p] * this.gf[p] < BIRD_FISH_MASS && this.plants.depth[(this.y[p] | 0) * this.world.width + (this.x[p] | 0)] < BIRD_DEPTH;
		if (this.scav[h] > 0.5 || dp === 1) return false;
		return this.diet[h] > 0.66 || (dp !== 3 && this.cls[p] === CLS_INVT);
	}

	_migrate(i, tile) {
		const Wx = this.weather;
		if (!Wx) return 0;
		const y = this.y[i];
		const oy = this.oy[i];
		const d = this.world.height * 0.5 - oy;
		let goal = oy;
		if (Wx.seasonT < 0) {
			if (this.world.temperature[tile] + Wx.seasonT >= this.pT[i]) return 0;
			const ad = d < 0 ? -d : d;
			goal = oy + (d < 0 ? -1 : 1) * (ad < MIGRATE_RANGE ? ad : MIGRATE_RANGE);
			const sp = this.sp[i];
			const yr = Math.floor(this.tick / YEAR_TICKS);
			if ((d < 0 ? y - goal : goal - y) > MIGRATE_HOME && this._migLogged.get(sp) !== yr) {
				this._migLogged.set(sp, yr);
				this.birdMigrants++;
				const s = this.registry.get(sp);
				if (s && s.population >= 6) this.log.push(this.tick, 'migration', `${s.name} flew ${d > 0 ? 'south' : 'north'} for the winter`, sp);
			}
		}
		const dy = goal - y;
		if (dy < MIGRATE_HOME && dy > -MIGRATE_HOME) return 0;
		const r = this.range[i];
		return dy > r ? r : dy < -r ? -r : dy;
	}

	_localCount(i) {
		const c = this.gcell[i];
		const sp = this.sp[i];
		let n = 0;
		let sx = 0;
		let sy = 0;
		for (let k = this.gstart[c], e = this.gstart[c + 1]; k < e; k++) {
			const j = this.gitems[k];
			if (this.sp[j] !== sp) continue;
			n++;
			sx += this.x[j];
			sy += this.y[j];
		}
		this._cx = n ? sx / n : this.x[i];
		this._cy = n ? sy / n : this.y[i];
		return n;
	}

	_clim(i, t) {
		const pT = this.pT[i];
		return gaussFit(t, pT, t > pT ? this.tol[i] * (1 + this.dry[i]) : this.tol[i]);
	}

	_homeK(i) {
		if (this.hx[i] < 0) return 0;
		const dx = this.x[i] - this.hx[i];
		const dy = this.y[i] - this.hy[i];
		const r = this.hr[i];
		return dx * dx + dy * dy <= r * r ? 0.4 + 0.6 * this.diet[i] : 0;
	}

	_stamp(i, tick) {
		const W = this.world.width;
		const H = this.world.height;
		const r = this.hr[i];
		const cx = this.hx[i];
		const cy = this.hy[i];
		const r2 = r * r;
		const sp = this.sp[i];
		const uid = this.uid[i];
		const d = this.diet[i];
		const role = d < 0.33 ? 0 : d < 0.66 ? 1 : 2;
		const until = tick + TERR_HOLD;
		const y0 = Math.max(0, Math.floor(cy - r));
		const y1 = Math.min(H - 1, Math.floor(cy + r));
		const x0 = Math.max(0, Math.floor(cx - r));
		const x1 = Math.min(W - 1, Math.floor(cx + r));
		for (let y = y0; y <= y1; y++) {
			const dy = y + 0.5 - cy;
			for (let x = x0; x <= x1; x++) {
				const dx = x + 0.5 - cx;
				if (dx * dx + dy * dy > r2) continue;
				const j = y * W + x;
				this.terrSp[j] = sp;
				this.terrUid[j] = uid;
				this.terrRole[j] = role;
				this.terrUntil[j] = until;
			}
		}
	}

	_chaseRival(i) {
		const j = this._nearest(i, this.range[i] * 0.5, 3);
		if (j < 0) return;
		const hx = this.hx[i];
		const hy = this.hy[i];
		const r = this.hr[i];
		const ex = this.x[j] - hx;
		const ey = this.y[j] - hy;
		if (ex * ex + ey * ey > r * r) return;
		const ax = this.x[j] - this.x[i];
		const ay = this.y[j] - this.y[i];
		const d = Math.hypot(ax, ay) || 1;
		this.state[j] = 4;
		this.ttl[j] = 3;
		this.tx[j] = this.x[j] + (ax / d) * 6;
		this.ty[j] = this.y[j] + (ay / d) * 6;
	}

	_site(i, j) {
		const w = this.walk[j];
		const dom = this.domain[i];
		const P = this.plants;
		const Wx = this.weather;
		if (dom === 1) return w & 2 && P.depth[j] < NEST_DEPTH ? 1 - P.depth[j] : 0;
		const cls = this.cls[i];
		const wet = Wx ? Wx.fresh[j] || Wx.wet[j] > EGG_WET : false;
		if (cls === CLS_AMPH) return w & 4 && (!Wx || wet) ? 1 : 0;
		if (!(w & 1) || !(w & DOMAIN_BIT[dom])) return 0;
		const c = P.cover(j);
		if (dom === 3) return P.species[j] && P.genome[j * PG + 3] >= NEST_TALL ? 1 + c : w & 16 ? 0.6 : c > PERCH_COVER ? c : 0;
		if (cls === CLS_REPT) {
			const t = this.world.temperature[j];
			return t >= NEST_WARM && c < NEST_OPEN && !wet ? t * (1 - c) : 0;
		}
		if (cls === CLS_MAMM) return c >= DEN_SITE ? c : w & 32 ? 0.8 : 0;
		return 0.3 + c;
	}

	_setHome(i, t) {
		const W = this.world.width;
		const x = t % W;
		this.nx[i] = x + 0.5;
		this.ny[i] = (t - x) / W + 0.5;
		this.home[i] = this.eggs && (this.domain[i] !== 0 || this.cold[i] > 0.5) ? 1 : 2;
		if (this.domain[i] === 3) this.oy[i] = this.ny[i];
		if (this.hx[i] >= 0) {
			this.hx[i] = this.nx[i];
			this.hy[i] = this.ny[i];
		}
		return this.home[i];
	}

	_dropHome(i) {
		this.home[i] = 0;
		this.nx[i] = -1;
		this.ny[i] = -1;
		return 0;
	}

	_pickHome(i) {
		const W = this.world.width;
		const H = this.world.height;
		const m = this._nearest(i, this.range[i], 2);
		if (m >= 0 && (this.home[m] === 1 || this.home[m] === 2)) {
			const t = (this.ny[m] | 0) * W + (this.nx[m] | 0);
			if (this._site(i, t) > 0) return this._setHome(i, t);
		}
		const rng = this.rng;
		const r = this.range[i] < NEST_RANGE ? this.range[i] : NEST_RANGE;
		let best = 0;
		let bt = -1;
		for (let s = 0; s <= NEST_SAMPLES; s++) {
			const x = s ? this.x[i] + (rng.next() * 2 - 1) * r : this.x[i];
			const y = s ? this.y[i] + (rng.next() * 2 - 1) * r : this.y[i];
			if (x < 0 || y < 0 || x >= W || y >= H) continue;
			const j = (y | 0) * W + (x | 0);
			const v = this._site(i, j);
			if (v > best) {
				best = v;
				bt = j;
			}
		}
		return bt >= 0 ? this._setHome(i, bt) : 0;
	}

	_homeR(i) {
		const h = this.home[i];
		if (h === 3) return this.energy[i] > this.emax[i] * this.gf[i] * GUARD_E ? DEN_R : 0;
		const E = this.eggs;
		if (h === 1 && E && E.head[(this.ny[i] | 0) * this.world.width + (this.nx[i] | 0)] >= 0 && this.energy[i] > this.emax[i] * this.gf[i] * GUARD_E) return GUARD_R;
		return 0;
	}

	_flee(i, fx, fy) {
		const ax = this.x[i] - fx;
		const ay = this.y[i] - fy;
		const d = Math.hypot(ax, ay) || 1;
		this.tx[i] = this.x[i] + (ax / d) * 6;
		this.ty[i] = this.y[i] + (ay / d) * 6;
		this.ttl[i] = 3;
		this.state[i] = 4;
	}

	_feedYoung(i) {
		const cap = this.emax[i] * this.gf[i];
		let spare = this.energy[i] - cap * FEED_E;
		if (spare <= 0) return;
		const x = this.x[i];
		const y = this.y[i];
		const cols = this.gcols;
		const c0 = Math.max(0, ((x - FEED_R) / GRID) | 0);
		const c1 = Math.min(cols - 1, ((x + FEED_R) / GRID) | 0);
		const r0 = Math.max(0, ((y - FEED_R) / GRID) | 0);
		const r1 = Math.min(this.grows - 1, ((y + FEED_R) / GRID) | 0);
		const uid = this.uid[i];
		const sp = this.sp[i];
		const nx = this.nx[i];
		const ny = this.ny[i];
		for (let gy = r0; gy <= r1; gy++) {
			for (let gx = c0; gx <= c1; gx++) {
				const c = gy * cols + gx;
				for (let k = this.gstart[c], e = this.gstart[c + 1]; k < e; k++) {
					const j = this.gitems[k];
					if (this.home[j] !== 3 || !this.alive[j] || (this.parent[j] !== uid && (this.sp[j] !== sp || this.nx[j] !== nx || this.ny[j] !== ny))) continue;
					const need = this.emax[j] * this.gf[j] * FEED_TOP - this.energy[j];
					if (need <= 0) continue;
					const give = need < spare ? need : spare;
					this.energy[j] += give * FEED_EFF;
					this.energy[i] -= give;
					spare -= give;
					if (spare <= 0) return;
				}
			}
		}
	}

	_denContact(i, s) {
		const D = this.disease;
		const c = this.gcell[i];
		const nx = this.nx[i];
		const ny = this.ny[i];
		let rolls = 0;
		for (let k = this.gstart[c], e = this.gstart[c + 1]; k < e && rolls < CONTACT_MAX; k++) {
			const j = this.gitems[k];
			if (j === i || !this.alive[j] || !this.home[j] || this.strain[j] || this.nx[j] !== nx || this.ny[j] !== ny) continue;
			rolls++;
			D.exposeAnimal(j, s, DEN_CONTACT);
		}
	}

	_seekWater(i, tile) {
		const Wx = this.weather;
		const wd = Wx.waterDist;
		const W = this.world.width;
		const H = this.world.height;
		const bit = DOMAIN_BIT[this.domain[i]];
		const d0 = wd[tile];
		if (d0 < WATER_DIST_MAX) {
			const x = tile % W;
			const y = (tile - x) / W;
			let best = d0;
			let bj = -1;
			if (x + 1 < W && wd[tile + 1] < best && this.walk[tile + 1] & bit) {
				best = wd[tile + 1];
				bj = tile + 1;
			}
			if (x > 0 && wd[tile - 1] < best && this.walk[tile - 1] & bit) {
				best = wd[tile - 1];
				bj = tile - 1;
			}
			if (y + 1 < H && wd[tile + W] < best && this.walk[tile + W] & bit) {
				best = wd[tile + W];
				bj = tile + W;
			}
			if (y > 0 && wd[tile - W] < best && this.walk[tile - W] & bit) bj = tile - W;
			if (bj >= 0) {
				const bx = bj % W;
				this.state[i] = 5;
				this.ttl[i] = 0;
				return this._moveToward(i, bx + 0.5, (bj - bx) / W + 0.5, 1);
			}
		}
		if (this.state[i] !== 5 || this.ttl[i] <= 0) this._pickWater(i, d0);
		this.state[i] = 5;
		this.ttl[i]--;
		return this._moveToward(i, this.tx[i], this.ty[i], 1);
	}

	_pickWater(i, d0) {
		const Wx = this.weather;
		const wd = Wx.waterDist;
		const wet = Wx.wet;
		const W = this.world.width;
		const H = this.world.height;
		const dom = this.domain[i];
		const r = Math.max(6, this.range[i] * 1.5);
		let bestScore = -1e9;
		let bx = this.x[i];
		let by = this.y[i];
		for (let s = 0; s < WATER_SAMPLES; s++) {
			const tx = this.x[i] + (this.rng.next() * 2 - 1) * r;
			const ty = this.y[i] + (this.rng.next() * 2 - 1) * r;
			if (tx < 0 || ty < 0 || tx >= W || ty >= H) continue;
			if (!this.canStand(dom, tx, ty)) continue;
			const j = (ty | 0) * W + (tx | 0);
			const score = (d0 - wd[j]) * 0.1 + wet[j] + Wx.fresh[j];
			if (score > bestScore) {
				bestScore = score;
				bx = tx;
				by = ty;
			}
		}
		this.tx[i] = bx;
		this.ty[i] = by;
		this.ttl[i] = 6 + ((this.rng.next() * 6) | 0);
	}

	_pickCarrion(i) {
		const cells = this.plants.soil.carrionCell;
		const W = this.world.width;
		const H = this.world.height;
		const cols = this.gcols;
		const x = this.x[i];
		const y = this.y[i];
		const r = this.range[i] * SCAV_RANGE;
		const c0 = Math.max(0, ((x - r) / GRID) | 0);
		const c1 = Math.min(cols - 1, ((x + r) / GRID) | 0);
		const r0 = Math.max(0, ((y - r) / GRID) | 0);
		const r1 = Math.min(this.grows - 1, ((y + r) / GRID) | 0);
		let best = 0;
		let bc = -1;
		for (let gy = r0; gy <= r1; gy++) {
			for (let gx = c0; gx <= c1; gx++) {
				const c = gy * cols + gx;
				const v = cells[c];
				if (!(v > 0)) continue;
				const d = Math.hypot((gx + 0.5) * GRID - x, (gy + 0.5) * GRID - y);
				if (d > r) continue;
				const score = v / (1 + d * 0.1);
				if (score > best) {
					best = score;
					bc = c;
				}
			}
		}
		if (bc < 0) return false;
		const carrion = this.plants.soil.carrion;
		const bit = FEED_BIT[this.domain[i]];
		const gx = bc % cols;
		const gy = (bc - gx) / cols;
		const xe = Math.min(W, (gx + 1) * GRID);
		const ye = Math.min(H, (gy + 1) * GRID);
		let bestC = 0;
		let bj = -1;
		for (let ty = gy * GRID; ty < ye; ty++) {
			for (let tx = gx * GRID; tx < xe; tx++) {
				const j = ty * W + tx;
				if (carrion[j] > bestC && this.walk[j] & bit) {
					bestC = carrion[j];
					bj = j;
				}
			}
		}
		if (bj < 0) return false;
		const bx = bj % W;
		this.tx[i] = bx + 0.5;
		this.ty[i] = (bj - bx) / W + 0.5;
		this.ttl[i] = 6 + ((this.rng.next() * 8) | 0);
		return true;
	}

	_moveToward(i, tx, ty, frac) {
		const x = this.x[i];
		const y = this.y[i];
		let dx = tx - x;
		let dy = ty - y;
		const d = Math.hypot(dx, dy);
		if (d < 1e-4) return 0;
		const sk = this.strain[i];
		let v = (sk ? this.spd[i] * (1 - SICK_SLOW * this.disease.sVir[sk]) : this.spd[i]) * this.ef[i];
		const cold = this.cold[i];
		if (cold > 0) {
			const et = this.world.temperature[(y | 0) * this.world.width + (x | 0)] + (this.weather ? this.weather.seasonT : 0);
			if (et < 0.5) v *= 1 - COLD_SLOW * cold * (0.5 - et) * 2;
		}
		const step = Math.min(d, v * frac);
		dx /= d;
		dy /= d;
		const dom = this.domain[i];
		const angles = [0, 0.7, -0.7, 1.4, -1.4, 2.2, -2.2];
		const start = this.rng.next() < 0.5 ? 1 : -1;
		for (let a = 0; a < angles.length; a++) {
			const ang = angles[a] * start;
			const cs = Math.cos(ang);
			const sn = Math.sin(ang);
			const mx = dx * cs - dy * sn;
			const my = dx * sn + dy * cs;
			const nx = x + mx * step;
			const ny = y + my * step;
			if (this.canStand(dom, nx, ny)) {
				this.x[i] = nx;
				this.y[i] = ny;
				if (Math.abs(mx) > 0.2) this.face[i] = mx > 0 ? 1 : -1;
				if (a > 0) this.ttl[i] = Math.min(this.ttl[i], 3);
				return step;
			}
		}
		this.ttl[i] = 0;
		return 0;
	}

	_bugEff(i) {
		if (this.mass[i] >= BUG_MASS) return 0;
		const diet = this.diet[i];
		if (this.cls[i] === CLS_INVT && !this.domain[i] && diet >= 0.5) return INVERT_BUG;
		if (diet >= BUG_DIET_MAX) return 0;
		const v = diet <= BUG_DIET_PEAK ? 1 - (BUG_DIET_PEAK - diet) * 1.4 : 1 - (diet - BUG_DIET_PEAK) / (BUG_DIET_MAX - BUG_DIET_PEAK);
		if (!(v > 0)) return 0;
		if (this.cls[i] !== CLS_BIRD) return v;
		const k = (diet - BIRD_BUG_LO) / BIRD_BUG_SPAN;
		return v * (1 + (BIRD_BUG - 1) * (k < 0 ? 0 : k > 1 ? 1 : k));
	}

	_genT(i) {
		const d = this.diet[i];
		return d <= GEN_LO ? 0 : d >= GEN_HI ? 1 : (d - GEN_LO) / (GEN_HI - GEN_LO);
	}

	_reach(i) {
		const d = Math.abs(this.diet[i] - 0.5);
		return d < 0.3 ? 0.6 * (1 - d / 0.3) : 0;
	}

	_aversion(av, hue) {
		let m = 0;
		for (const a of av) if (a.strength > m && hueDist(a.hue, hue) <= MIMIC_HUE) m = a.strength;
		return m;
	}

	_pickForage(i) {
		const W = this.world.width;
		const H = this.world.height;
		const seeker = this.scav[i] > 0.5;
		const r = seeker ? this.range[i] * SCAV_RANGE : this.range[i];
		const samples = seeker ? SCAV_SAMPLES : 8;
		const dom = this.domain[i];
		const temp = this.world.temperature;
		const plants = this.plants;
		const pn = plants.n;
		let bestScore = -1;
		let bx = this.x[i];
		let by = this.y[i];
		const needFood = this.plantEff[i] > 0.15 && !(dom === 3 && this.diet[i] >= 0.33);
		const reach = this._reach(i);
		const tall = reach > 0 || dom === 3;
		const fruitEater = this.plantEff[i] > 0.12 && (tall || this.mass[i] < BERRY_MASS);
		const asp = this.registry.get(this.sp[i]);
		const av = asp && asp.aversion && asp.aversion.length ? asp.aversion : null;
		const bugs = this.bugs;
		const bugEff = bugs ? this._bugEff(i) * BUG_LURE : 0;
		const carrion = plants.soil.carrion;
		const carrionLure = this.carrionEff[i] * CARRION_LURE * (1 + SCAV_LURE * this.scav[i]);
		const eggHead = this.eggs && this.diet[i] >= 0.33 ? this.eggs.head : null;
		const Wx = this.weather;
		const wd = Wx && dom !== 1 && this.diet[i] > 0.6 ? Wx.waterDist : null;
		const tick = this.tick;
		const uid = this.uid[i];
		const sp = this.sp[i];
		const d = this.diet[i];
		const role = d < 0.33 ? 0 : d < 0.66 ? 1 : 2;
		const tSp = this.terrSp;
		const tUid = this.terrUid;
		const tUntil = this.terrUntil;
		const tRole = this.terrRole;
		const bird = dom === 3;
		const walk = this.walk;
		const fisher = bird && this.nic[i] === 1;
		const my = bird ? this._migrate(i, (this.y[i] | 0) * W + (this.x[i] | 0)) : 0;
		for (let s = 0; s < samples; s++) {
			const tx = this.x[i] + (this.rng.next() * 2 - 1) * r;
			const ty = this.y[i] + my + (this.rng.next() * 2 - 1) * r;
			if (tx < 0 || ty < 0 || tx >= W || ty >= H) continue;
			if (!this.canStand(dom, tx, ty)) continue;
			const j = (ty | 0) * W + (tx | 0);
			let food = 0.2;
			let perchK = 1;
			if (bird) {
				const w = walk[j];
				if (!(w & 1)) {
					if (!fisher || !(w & 2) || plants.depth[j] >= BIRD_DEPTH) continue;
					food += BIRD_FISH_LURE * (0.3 + (this.tileLoad[j] > 8 ? 1 : this.tileLoad[j] / 8));
				} else if (this._perch(j)) perchK = BIRD_PERCH;
			}
			const land = !bird || (walk[j] & 1) !== 0;
			if (needFood && land) {
				food = plants.edible(j, reach);
				if (fruitEater) {
					const fr = plants.fruitAt(j, tall);
					if (fr > 0) food += fr * FRUIT_LURE * (0.6 + plants.genome[j * PG + 9]);
				}
				if (av && plants.kind[pn + j] && plants.species[pn + j]) food *= 1 - this._aversion(av, plants.hue[pn + j]);
			}
			if (bugEff > 0) food += bugs.edibleAt(j) * bugEff;
			if (land && carrion[j] > 0) food += carrion[j] * carrionLure;
			if (land && eggHead && eggHead[j] >= 0) food += EGG_LURE;
			const clim = this._clim(i, temp[j]);
			const dist = Math.hypot(tx - this.x[i], ty - this.y[i]);
			let score = ((food + 0.02) * (0.25 + clim) * perchK) / (1 + dist * 0.08) + this.rng.next() * 0.002;
			if (wd) score += WATERHOLE / (1 + wd[j]);
			if (tUntil[j] > tick && tUid[j] !== uid && (tSp[j] === sp || tRole[j] === role)) score *= TERR_RIVAL;
			if (score > bestScore) {
				bestScore = score;
				bx = tx;
				by = ty;
			}
		}
		if (eggHead && this.eggs.nestCell) {
			const cols = this.gcols;
			const gx = (this.x[i] / GRID) | 0;
			const gy = (this.y[i] / GRID) | 0;
			const nc = this.eggs.nestCell;
			for (let cy = gy - 1; cy <= gy + 1; cy++) {
				if (cy < 0 || cy >= this.grows) continue;
				for (let cx = gx - 1; cx <= gx + 1; cx++) {
					if (cx < 0 || cx >= cols) continue;
					const j = nc[cy * cols + cx];
					if (j < 0 || eggHead[j] < 0) continue;
					const tx = (j % W) + 0.5;
					const ty = (j - (j % W)) / W + 0.5;
					const dist = Math.hypot(tx - this.x[i], ty - this.y[i]);
					if (dist > r || !this.canStand(dom, tx, ty)) continue;
					const score = (EGG_LURE * (0.25 + this._clim(i, temp[j]))) / (1 + dist * 0.08);
					if (score > bestScore) {
						bestScore = score;
						bx = tx;
						by = ty;
					}
				}
			}
		}
		if (bird && bestScore < 0) {
			bx = Math.min(W - 1, Math.max(0, this.x[i] + (this.rng.next() * 2 - 1) * r * 3));
			by = Math.min(H - 1, Math.max(0, this.y[i] + my + (this.rng.next() * 2 - 1) * r * 3));
		}
		if (this.pn[i] > 1 && this._pr[i] !== i) {
			const r = this._pr[i];
			const hx = bx + (this.x[r] - bx) * PACK_PULL;
			const hy = by + (this.y[r] - by) * PACK_PULL;
			if (this.canStand(dom, hx, hy)) {
				bx = hx;
				by = hy;
			}
		}
		const herd = this.herd[i];
		if (herd > HERD_MIN && this._localCount(i) > 1) {
			const k = HERD_PULL * herd;
			const hx = bx + (this._cx - bx) * k;
			const hy = by + (this._cy - by) * k;
			if (this.canStand(dom, hx, hy)) {
				bx = hx;
				by = hy;
			}
		}
		const hR = this.home[i] ? this._homeR(i) : 0;
		if (hR > 0 || this.hx[i] >= 0) {
			const ox = hR > 0 ? this.nx[i] : this.hx[i];
			const oy = hR > 0 ? this.ny[i] : this.hy[i];
			const r = hR > 0 ? hR : this.hr[i];
			const ex = bx - ox;
			const ey = by - oy;
			const e = Math.hypot(ex, ey);
			if (e > r) {
				const cx = ox + (ex / e) * r;
				const cy = oy + (ey / e) * r;
				if (this.canStand(dom, cx, cy)) {
					bx = cx;
					by = cy;
				} else {
					bx = ox;
					by = oy;
				}
			}
		}
		this.tx[i] = bx;
		this.ty[i] = by;
		this.ttl[i] = 6 + ((this.rng.next() * 8) | 0);
	}

	step(tick) {
		const n = this.count;
		const W = this.world.width;
		const temp = this.world.temperature;
		const plants = this.plants;
		const rng = this.rng;
		const bugs = this.bugs;
		const tileLoad = this.tileLoad;
		const parasiteLoad = this.parasiteLoad;
		const D = this.disease && this.disease.on ? this.disease : null;
		const soil = plants.soil;
		const carrion = soil.carrion;
		const Wx = this.weather;
		const seasonT = Wx ? Wx.seasonT : 0;
		const droughtK = Wx && Wx.drought ? 0.4 : 0;
		const eggs = this.eggs;
		const stampTick = tick % TERR_EVERY === 0;
		tileLoad.fill(0);
		this._buildGrid();
		this._social();
		this.births = 0;
		this.tick = tick;
		let holders = 0;

		for (let i = 0; i < n; i++) {
			if (!this.alive[i]) continue;
			this.px[i] = this.x[i];
			this.py[i] = this.y[i];
			this.age[i]++;
			this._stage(i);
			const gf = this.gf[i];
			const ef = this.ef[i];
			if (this.cool[i] > 0) this.cool[i]--;
			const tile = (this.y[i] | 0) * W + (this.x[i] | 0);
			const clim = this._clim(i, temp[tile]);
			const m75 = this.meta[i] * gf;
			const dom = this.domain[i];
			const flying = dom === 3 && this.fly[i] === 1;
			const dg = this.diet[i];
			const gt = this._genT(i);
			const plantK = (1 - GEN_TAX * gt) * (!dom && this.scav[i] > 0.5 ? 1 - SCAV_PLANT * this.scav[i] : 1) * (dg < 0.33 ? HERB_GRAZE : 1);
			const meatK = 1 - GEN_TAX * (1 - gt);
			let thirsty = false;
			if (Wx && dom !== 1) {
				const amph = dom === 2;
				const inv = this.cls[i] === CLS_INVT;
				let wv = this.water[i];
				if (Wx.waterDist[tile] <= 1 || Wx.wet[tile] > (amph || inv ? AMPH_DRINK_WET : DRINK_WET)) wv = 1;
				else {
					wv -= THIRST * (1 - 0.6 * this.dry[i]) * (0.6 + temp[tile] + seasonT + droughtK) * (this.cold[i] > 0.5 ? 0.6 : 1) * (amph ? AMPH_DRY : 1) * (inv ? INVERT_THIRST : 1);
					if (wv < 0) wv = 0;
				}
				this.water[i] = wv;
				thirsty = wv < THIRSTY;
			}
			if (this.terr[i] > TERR_MIN) {
				if (this.hx[i] < 0 && this.age[i] > this.mature[i] && !thirsty && this.state[i] !== 4) {
					this.hx[i] = this.x[i];
					this.hy[i] = this.y[i];
				}
				if (this.hx[i] >= 0) {
					holders++;
					if (stampTick) this._stamp(i, tick);
				}
			}
			const ng = this.genome[i * AG + G_NEST];
			let hk = this.home[i];
			let hd = 0;
			const away = dom === 3 && seasonT < 0 && temp[tile] + seasonT < this.pT[i];
			if (hk) {
				hd = Math.hypot(this.x[i] - this.nx[i], this.y[i] - this.ny[i]);
				if ((hk === 3 && this.age[i] > this.mature[i]) || hd > NEST_FAR || (away && hk !== 3)) hk = this._dropHome(i);
			} else if (ng > NEST_MIN && (tick + i) % NEST_EVERY === 0 && this.age[i] > this.mature[i] && !thirsty && !away && this.state[i] !== 4) {
				hk = this._pickHome(i);
				if (hk) hd = Math.hypot(this.x[i] - this.nx[i], this.y[i] - this.ny[i]);
			}
			const ntile = hk ? (this.ny[i] | 0) * W + (this.nx[i] | 0) : -1;
			const atHome = hk > 0 && hd <= NEST_NEAR;
			const homeR = hk ? this._homeR(i) : 0;
			if (homeR === GUARD_R && hk === 1) eggs.guard(ntile, this.mass[i] * gf * (0.5 + ng), tick);
			if (hk && hk !== 3) {
				if (atHome && bugs && parasiteLoad[ntile] > 0) bugs.clean(ntile, CLEAN_K * ng);
				if ((tick + i) % FEED_EVERY === 0) this._feedYoung(i);
			}
			const shelter = hk === 3 && atHome ? 1 - DEN_SHELTER * ng : 1;
			const homeK = this._homeK(i);
			if (homeK > 0 && ((tick + i) & 1) === 1) this._chaseRival(i);
			const bite = this.bite[i] * gf * ef * (1 + TERR_BITE * homeK) * (dom === 3 ? BIRD_BITE : 1);
			let cost = m75 * (1 + 1.3 * (1 - clim) * shelter) * (flying ? FLY_META : 1);
			if (this.cold[i] > 0.5) {
				const et = temp[tile] + seasonT;
				if (et < 0.5) cost += m75 * COLD_UPKEEP * (0.5 - et) * 2 * shelter;
			}
			if (!flying) {
				const lw = tileLoad[tile] + ((this.mass[i] * TILE_LOAD_SCALE + 0.5) | 0);
				tileLoad[tile] = lw < 65535 ? lw : 65535;
			}
			let drain = 0;
			const emax = this.emax[i] * gf;
			const e = this.energy[i];
			const landScav = !dom && this.scav[i] > 0.5 && this.diet[i] >= 0.33;
			let moved = 0;
			let acted = false;
			let poisonDead = false;
			if (this.seedTtl[i] > 0 && --this.seedTtl[i] === 0) this._dropSeed(i, tile, tick);

			if (this.confuse[i] > 0) {
				this.confuse[i]--;
				const ang = rng.next() * Math.PI * 2;
				moved = this._moveToward(i, this.x[i] + Math.cos(ang) * 3, this.y[i] + Math.sin(ang) * 3, 0.8);
				this.state[i] = 0;
				this.ttl[i] = 0;
				acted = true;
			}

			if (!acted && this.diet[i] < 0.7 && (tick + i) % 2 === 0 && rng.next() < 0.7) {
				const t = this._nearest(i, this.range[i] * 0.8, 0);
				if (t >= 0) {
					const ax = this.x[i] - this.x[t];
					const ay = this.y[i] - this.y[t];
					const d = Math.hypot(ax, ay) || 1;
					this.tx[i] = this.x[i] + (ax / d) * 6;
					this.ty[i] = this.y[i] + (ay / d) * 6;
					this.ttl[i] = 3;
					this.state[i] = 4;
				}
			}
			if (!acted && this.state[i] === 4 && this.ttl[i] > 0) {
				moved = this._moveToward(i, this.tx[i], this.ty[i], 1.1);
				this.ttl[i]--;
				if (this.ttl[i] <= 0) this.state[i] = 0;
				acted = true;
			}

			if (!acted && this.pn[i] > 1 && this.cool[i] === 0 && e < emax * PACK_JOIN) {
				const r = this._pr[i];
				const p = this._pt[r];
				if (p >= 0 && this.alive[p]) {
					if (this.state[i] !== 3) this.ttl[i] = 18;
					this.state[i] = 3;
					const d0 = Math.hypot(this.x[p] - this.x[i], this.y[p] - this.y[i]);
					moved = this._moveToward(i, this.x[p], this.y[p], (d0 < 4 ? PACK_PACE : 1) * (1 - (PACK_SICK_SLOW * this._pv[r]) / this.pn[i]));
					const d = Math.hypot(this.x[p] - this.x[i], this.y[p] - this.y[i]);
					if (d < 1) this._attack(i, p, tile, tick);
					else if (--this.ttl[i] <= 0) {
						this.cool[i] = 10;
						this.state[i] = 0;
					}
					acted = true;
				}
			}

			if (!acted && this.meatEff[i] > 0.25 && e < emax * (this.scav[i] > 0.5 ? SCAV_HUNT : this.nic[i] ? FISHER_HUNT : 0.6) && this.cool[i] === 0) {
				const p = this._nearest(i, this.nic[i] ? this.range[i] * FISHER_RANGE : this.range[i], 1);
				if (p >= 0) {
					if (this.state[i] !== 3) this.ttl[i] = 18;
					this.state[i] = 3;
					const d0 = Math.hypot(this.x[p] - this.x[i], this.y[p] - this.y[i]);
					moved = this._moveToward(i, this.x[p], this.y[p], d0 < 4 ? 1.6 : 1);
					const d = Math.hypot(this.x[p] - this.x[i], this.y[p] - this.y[i]);
					if (d < 1) this._attack(i, p, tile, tick);
					else if (--this.ttl[i] <= 0) {
						this.cool[i] = 10;
						this.state[i] = 0;
					}
					acted = true;
				}
			}

			if (!acted && thirsty) {
				moved = this._seekWater(i, tile);
				acted = true;
			}

			if (!acted && hk) {
				const lim = homeR > 0 ? homeR : hk !== 3 && this.cool[i] === 0 && e > emax * 0.7 ? NEST_NEAR : 0;
				if (lim > 0 && hd > lim) {
					moved = this._moveToward(i, this.nx[i], this.ny[i], 1);
					if (moved > 0) {
						this.state[i] = 6;
						acted = true;
					} else hk = this._dropHome(i);
				}
			}

			if (!acted && (!hk || (hk === 3 && !homeR)) && this.parent[i] && gf < 1 && (tick + i) % FOLLOW_EVERY === 0 && this.state[i] !== 1) {
				const p = this._nearest(i, this.range[i], 2);
				if (p >= 0 && Math.hypot(this.x[p] - this.x[i], this.y[p] - this.y[i]) > 1.5) {
					moved = this._moveToward(i, this.x[p], this.y[p], 1);
					this.state[i] = 0;
					acted = true;
				}
			}

			if (eggs && (dg >= 0.33 || dom === 1) && this.energy[i] < emax && eggs.head[tile] >= 0) {
				const got = eggs.eatAt(tile, dom !== 1, this.sp[i], (emax - this.energy[i]) / EGG_FOOD, this.mass[i] * gf, tick);
				if (got > 0) this.energy[i] += got * EGG_FOOD;
				else if (got < 0 && !acted) this._flee(i, (tile % W) + 0.5, (tile - (tile % W)) / W + 0.5);
			}

			if (!acted && this.scav[i] > 0.5 && e < emax * 0.92 && !(carrion[tile] > 0)) {
				if ((this.ttl[i] <= 0 || this.state[i] !== 2) && !this._pickCarrion(i)) this._pickForage(i);
				this.state[i] = 2;
				if (carrion[(this.ty[i] | 0) * W + (this.tx[i] | 0)] > 0) {
					moved = this._moveToward(i, this.tx[i], this.ty[i], 1);
					this.ttl[i]--;
					acted = true;
				}
			}

			if (!acted && this.plantEff[i] > 0.12 && e < emax * 0.92 && !(dom === 3 && dg >= 0.33)) {
				const ok = (this.walk[tile] & FEED_BIT[dom]) !== 0;
				const reach = this._reach(i);
				const tall = reach > 0 || dom === 3;
				const fr = ok && (tall || this.mass[i] < BERRY_MASS) ? plants.fruitAt(tile, tall) : 0;
				let skip = false;
				if (ok && fr <= bite * FRUIT_MIN_BITE) {
					const u = plants.n + tile;
					if (plants.kind[u] && plants.species[u]) {
						const asp = this.registry.get(this.sp[i]);
						skip = asp.aversion.length > 0 && this._aversion(asp.aversion, plants.hue[u]) > 0.5;
					}
				}
				const avail = ok ? plants.edible(tile, reach, skip) : 0;
				if (fr > bite * FRUIT_MIN_BITE) {
					this.state[i] = 1;
					const eaten = plants.eatFruit(tile, bite, tall);
					const seedHit = plants.fruitSeedTox * 0.7 - this.toxR[i];
					this.energy[i] += eaten * FRUIT_ENERGY * (0.6 + plants.fruitSweet) * this.plantEff[i] * plantK * (1 - 1.6 * (seedHit > 0 ? seedHit : 0)) * (dom === 3 ? BIRD_FRUIT : 1);
					if (plants.fruitSp && !this.seedSp[i]) {
						this.seedSp[i] = plants.fruitSp;
						this.seedTtl[i] = (20 + ((rng.next() * 40) | 0)) * (dom === 3 ? BIRD_SEED : 1);
					}
					if (eaten > 0) this.water[i] = Math.min(1, this.water[i] + FRUIT_WATER);
					acted = true;
				} else if (avail > bite * 0.5) {
					this.state[i] = 1;
					const eaten = plants.graze(tile, bite, reach, skip);
					if (eaten > 0) this.water[i] = Math.min(1, this.water[i] + GRAZE_WATER);
					const toxHit = Math.max(0, plants.grazeTox - this.toxR[i]);
					this.energy[i] += eaten * PLANT_ENERGY * this.plantEff[i] * plantK * (1 - 1.6 * toxHit);
					if (plants.grazeFungus) poisonDead = this._poison(i, tick);
					acted = true;
				} else {
					if (this.ttl[i] <= 0 || this.state[i] !== 2) this._pickForage(i);
					this.state[i] = 2;
					moved = this._moveToward(i, this.tx[i], this.ty[i], 1);
					this.ttl[i]--;
					acted = true;
				}
			}

			if (!acted) {
				this.state[i] = 0;
				if (dom === 3 && e > emax * 0.6 && this._perch(tile) && rng.next() < BIRD_REST_P) this.ttl[i]--;
				else {
					if (this.ttl[i] <= 0) this._pickForage(i);
					moved = this._moveToward(i, this.tx[i], this.ty[i], 0.45);
					this.ttl[i]--;
				}
			}
			if (dom === 3) this.fly[i] = moved > FLY_MOVE || !(this.walk[(this.y[i] | 0) * W + (this.x[i] | 0)] & 1) ? 1 : 0;

			if (bugs) {
				if (this.mass[i] < BUG_MASS && bugs.total[tile] > 0 && this.energy[i] < emax) {
					const be = this._bugEff(i);
					if (be > 0) this.energy[i] += bugs.eat(tile, this.bite[i] * gf * ef * be) * (dom === 3 && dg >= 0.33 ? BIRD_BUG_ENERGY : BUG_ENERGY);
				}
				const pl = flying ? 0 : parasiteLoad[tile];
				if (pl > 0) {
					drain = pl * PARASITE_DRAIN * this.mass[i] * (1 - 0.6 * this.armor[i]) * (0.4 + 0.6 * gaussFit(this.genome[i * AG + G_SIZE], this.parasiteHost[tile], PARASITE_HOST_TOL)) * (hk === 3 && atHome ? 1 + DEN_PARA : 1);
					cost += drain;
					bugs.parasiteDrain += drain;
				}
			}
			if (this.cls[i] === CLS_INVT && !dom && dg < 0.5 && this.energy[i] < emax && soil.litter[tile] > 0) this.energy[i] += soil.consumeLitter(tile, bite) * LITTER_ENERGY * plantK;
			if (carrion[tile] > 0 && this.energy[i] < emax * 0.92 && (dom !== 3 || this.walk[tile] & 1)) {
				const ce = soil.consumeCarrion(tile, bite * (1 + SCAV_BITE * this.scav[i])) * MEAT_ENERGY * this.carrionEff[i] * meatK;
				this.energy[i] += ce;
				if (ce > 0) this.water[i] = Math.min(1, this.water[i] + MEAT_WATER);
				if (landScav) this.carrionEnergy += ce;
				if (D && !this.strain[i] && D.carcassLoad[tile] > 0) D.exposeAnimal(i, D.carcassStrain[tile], CARCASS_K * D.carcassLoad[tile]);
			}
			let sickDead = 0;
			if (D) {
				const s = this.strain[i];
				if (this.imTime[i] > 0) this.imTime[i]--;
				if (s) {
					const vir = D.sVir[s];
					cost += SICK_COST * vir * m75;
					if (rng.next() < SICK_DEATH * vir * (1 - RES_EFFECT * this.genome[i * AG + G_RES])) sickDead = s;
					else if (--this.itime[i] <= 0) D.recoverAnimal(i);
					else {
						const pl = parasiteLoad[tile];
						if (pl > 0) {
							D.vectorStrain[tile] = s;
							D.vectorLoad[tile] = pl < 1 ? pl : 1;
						}
						if (((tick + i) & 1) === 0) {
							this._contact(i, s);
							if (atHome) this._denContact(i, s);
						}
						if (dom === 3 && rng.next() < BIRD_DROP_K && D.vectorLoad[tile] < BIRD_DROP) {
							D.vectorStrain[tile] = s;
							D.vectorLoad[tile] = BIRD_DROP;
						}
					}
				} else if (((tick + i) & 1) === 0) {
					if (D.carcassLoad[tile] > 0) D.exposeAnimal(i, D.carcassStrain[tile], CARCASS_K * D.carcassLoad[tile]);
					if (!this.strain[i] && D.vectorLoad[tile] > 0) D.exposeAnimal(i, D.vectorStrain[tile], VECTOR_K * D.vectorLoad[tile]);
				}
			}
			if (landScav && this.energy[i] > e) this.scavEnergy += this.energy[i] - e;
			const dry = Wx && dom !== 1 && this.water[i] <= 0;
			if (dry) cost *= DEHYDRATE_COST;
			cost += moved * 0.012 * this.mass[i];
			this.energy[i] -= cost;
			if (this.energy[i] > emax) this.energy[i] = emax;

			if (poisonDead) {
				this._kill(i);
				this.deaths.poison++;
				continue;
			}
			if (sickDead) {
				D.countDeath(sickDead);
				this._kill(i);
				this.deaths.disease++;
				continue;
			}
			if (dry && rng.next() < DEHYDRATE_DEATH) {
				this._kill(i);
				this.deaths.thirst++;
				continue;
			}
			if (this.energy[i] <= 0) {
				this._kill(i);
				if (drain > cost * PARASITE_DEATH_SHARE) this.deaths.parasite++;
				else if (dry) this.deaths.thirst++;
				else this.deaths.starved++;
				continue;
			}
			const ar = this.age[i] / this.maxAge[i];
			if (ar > OLD_START && rng.next() < OLD_P * Math.exp(OLD_K * (ar - OLD_START))) {
				this._kill(i);
				this.deaths.old++;
				continue;
			}

			if (
				this.age[i] > this.mature[i] &&
				ar < ELDER_FERTILE &&
				this.cool[i] === 0 &&
				this.energy[i] > emax * 0.7 &&
				(this.count < this.maxAnimals || (this.diet[i] > 0.6 && this.count < this.maxAnimals + 1500)) &&
				(dom !== 2 || !Wx || Wx.waterDist[tile] <= 1 || (this.walk[tile] & 2) !== 0 || hk === 1) &&
				(hk === 0 || hk === 3 || Math.hypot(this.x[i] - this.nx[i], this.y[i] - this.ny[i]) <= NEST_NEAR) &&
				this._localCount(i) < (dom === 3 ? BIRD_CROWD : 14)
			) {
				this._reproduce(i, tick);
			}
		}
		this.holders = holders;
		this._compact();
	}

	_social() {
		const n = this.count;
		if (!this._pr || this._pr.length < n + 1) {
			const c = this.cap + 1;
			this._pr = new Int32Array(c);
			this._pt = new Int32Array(c);
			this._pv = new Float32Array(c);
			this._pe = new Float32Array(c);
			this._ps = new Float32Array(c);
		}
		const W = this.world.width;
		const g = this.genome;
		const pl = this.parasiteLoad;
		const pr = this._pr;
		const ps = this._ps;
		const pe = this._pe;
		const pv = this._pv;
		const pt = this._pt;
		const pk = this.pk;
		const pn = this.pn;
		let m = 0;
		for (let i = 0; i < n; i++) {
			pk[i] = 0;
			pn[i] = 0;
			pr[i] = -1;
			if (!this.alive[i]) {
				this.show[i] = 0;
				continue;
			}
			const load = this.fly[i] ? 0 : pl[(this.y[i] | 0) * W + (this.x[i] | 0)];
			this.show[i] = g[i * AG + G_DISPLAY] * this.gf[i] * (this.strain[i] ? SICK_DISPLAY : 1) * (1 - PARA_DULL * (load < 1 ? load : 1));
			if (this.diet[i] > 0.6 && this.scav[i] <= 0.5 && this.age[i] >= this.mature[i] && g[i * AG + G_PACK] > PACK_MIN) {
				pr[i] = -2;
				ps[i] = (this.energy[i] / this.emax[i]) * (this.strain[i] ? PACK_SICK_LEAD : 1);
				m++;
			}
		}
		if (m < 2) return;
		const cols = this.gcols;
		const R2 = PACK_R * PACK_R;
		for (let i = 0; i < n; i++) {
			if (pr[i] === -1) continue;
			const x = this.x[i];
			const y = this.y[i];
			const s = this.sp[i];
			const c0 = Math.max(0, ((x - PACK_R) / GRID) | 0);
			const c1 = Math.min(cols - 1, ((x + PACK_R) / GRID) | 0);
			const r0 = Math.max(0, ((y - PACK_R) / GRID) | 0);
			const r1 = Math.min(this.grows - 1, ((y + PACK_R) / GRID) | 0);
			let best = i;
			let bs = ps[i];
			for (let gy = r0; gy <= r1; gy++) {
				for (let gx = c0; gx <= c1; gx++) {
					const c = gy * cols + gx;
					for (let k = this.gstart[c], e = this.gstart[c + 1]; k < e; k++) {
						const j = this.gitems[k];
						if (j === i || pr[j] === -1 || this.sp[j] !== s) continue;
						const dx = this.x[j] - x;
						const dy = this.y[j] - y;
						if (dx * dx + dy * dy > R2) continue;
						const sj = ps[j];
						if (sj > bs || (sj === bs && this.uid[j] < this.uid[best])) {
							best = j;
							bs = sj;
						}
					}
				}
			}
			pr[i] = best;
		}
		for (let i = 0; i < n; i++) {
			if (pr[i] < 0) continue;
			let r = i;
			while (pr[r] !== r) r = pr[r];
			pr[i] = r;
			if (r === i) {
				pn[i] = 1;
				pe[i] = this.energy[i] / this.emax[i];
				pv[i] = this.strain[i] ? 1 : 0;
			}
		}
		for (let pass = 0; pass < 2; pass++) {
			for (let i = 0; i < n; i++) {
				const r = pr[i];
				if (r < 0 || r === i || (this.strain[i] ? 1 : 0) !== pass) continue;
				if (pn[r] < PACK_MAX) {
					pn[r]++;
					pe[r] += this.energy[i] / this.emax[i];
					pv[r] += pass;
				} else pr[i] = -1;
			}
		}
		for (let i = 0; i < n; i++) {
			const r = pr[i];
			if (r < 0) continue;
			if (r !== i) {
				pn[i] = pn[r];
				pk[i] = this.uid[r];
				continue;
			}
			if (pn[i] < 2) {
				pn[i] = 0;
				pr[i] = -1;
				continue;
			}
			pk[i] = this.uid[i];
			pt[i] = -1;
			if (pe[i] / pn[i] < PACK_HUNGRY && this.meatEff[i] > 0.25) pt[i] = this._nearest(i, this.range[i], 1, Math.min(PACK_PREY_CAP, 1 + PACK_PREY_K * (pn[i] - 1)));
		}
	}

	_packHelp(i, p) {
		const buf = this._packBuf;
		const pr = this._pr;
		const r = pr[i];
		buf[0] = i;
		let k = 1;
		const x = this.x[p];
		const y = this.y[p];
		const R2 = PACK_HELP_R * PACK_HELP_R;
		const cols = this.gcols;
		const c0 = Math.max(0, ((x - PACK_HELP_R) / GRID) | 0);
		const c1 = Math.min(cols - 1, ((x + PACK_HELP_R) / GRID) | 0);
		const r0 = Math.max(0, ((y - PACK_HELP_R) / GRID) | 0);
		const r1 = Math.min(this.grows - 1, ((y + PACK_HELP_R) / GRID) | 0);
		for (let gy = r0; gy <= r1; gy++) {
			for (let gx = c0; gx <= c1; gx++) {
				const c = gy * cols + gx;
				for (let q = this.gstart[c], e = this.gstart[c + 1]; q < e; q++) {
					const j = this.gitems[q];
					if (j === i || pr[j] !== r || !this.alive[j] || this.pn[j] < 2) continue;
					const dx = this.x[j] - x;
					const dy = this.y[j] - y;
					if (dx * dx + dy * dy > R2) continue;
					buf[k++] = j;
					if (k === PACK_MAX) return k;
				}
			}
		}
		return k;
	}

	_packFeed(i, p, n, mp) {
		const buf = this._packBuf;
		const base = (mp * MEAT_ENERGY + this.energy[p] * 0.25) / n;
		const ps = this.strain[p];
		const D = ps && this.disease && this.disease.on ? this.disease : null;
		for (let k = 0; k < n; k++) {
			const j = buf[k];
			let e = this.energy[j] + base * this.meatEff[j] * (1 - GEN_TAX * (1 - this._genT(j)));
			const cap = this.emax[j] * this.gf[j];
			if (j !== i && e > cap) e = cap;
			this.energy[j] = e;
			if (this.domain[j] !== 1) this.water[j] = Math.min(1, this.water[j] + MEAT_WATER);
			if (D) D.exposeAnimal(j, ps, PREY_K);
			this.cool[j] = 4;
			if (j !== i) this.state[j] = 0;
		}
		this.packKills++;
		if (mp > PACK_BIG * this.mass[i] * this.gf[i]) this.bigKills++;
	}

	_chooseMate(i) {
		const rng = this.rng;
		const r = this.range[i];
		const x = this.x[i];
		const y = this.y[i];
		const s = this.sp[i];
		const r2 = r * r;
		const cols = this.gcols;
		const c0 = Math.max(0, ((x - r) / GRID) | 0);
		const c1 = Math.min(cols - 1, ((x + r) / GRID) | 0);
		const r0 = Math.max(0, ((y - r) / GRID) | 0);
		const r1 = Math.min(this.grows - 1, ((y + r) / GRID) | 0);
		const buf = this._mateBuf;
		let m = 0;
		let seen = 0;
		for (let gy = r0; gy <= r1; gy++) {
			for (let gx = c0; gx <= c1; gx++) {
				const c = gy * cols + gx;
				for (let k = this.gstart[c], e = this.gstart[c + 1]; k < e; k++) {
					const j = this.gitems[k];
					if (j === i || !this.alive[j] || this.sp[j] !== s || this.age[j] < this.mature[j]) continue;
					const dx = this.x[j] - x;
					const dy = this.y[j] - y;
					if (dx * dx + dy * dy > r2) continue;
					seen++;
					if (m < MATE_SAMPLES) buf[m++] = j;
					else {
						const q = (rng.next() * seen) | 0;
						if (q < MATE_SAMPLES) buf[q] = j;
					}
				}
			}
		}
		if (!m) return -1;
		const ch = this.genome[i * AG + G_CHOOSY];
		const sharp = MATE_SHARP * ch;
		let top = 0;
		for (let k = 0; k < m; k++) top = Math.max(top, this.show[buf[k]]);
		let tot = 0;
		for (let k = 0; k < m; k++) tot += Math.exp(sharp * (this.show[buf[k]] - top));
		let u = rng.next() * tot;
		let mate = buf[m - 1];
		for (let k = 0; k < m; k++) {
			u -= Math.exp(sharp * (this.show[buf[k]] - top));
			if (u <= 0) {
				mate = buf[k];
				break;
			}
		}
		const sp = this.registry.get(s);
		if (sp && this.show[mate] < ch * sp.mean[G_DISPLAY]) {
			this.cool[i] = CHOOSY_WAIT;
			this.mateRefusals++;
			return -2;
		}
		const ms = this.strain[mate];
		if (ms && this.disease && this.disease.on) this.disease.exposeAnimal(i, ms, MATE_K);
		return mate;
	}

	_showTrack(sp) {
		const d = sp.mean[G_DISPLAY];
		const t = this.tick;
		if (!sp.showHist) {
			sp.showHist = [];
			sp.showStep = SHOW_EVERY;
		}
		if (t % sp.showStep === 0) {
			sp.showHist.push(t, Math.round(d * 1000) / 1000);
			if (sp.showHist.length > SHOW_HIST) {
				const step = sp.showStep * 2;
				const next = [];
				for (let k = 0; k < sp.showHist.length; k += 2) if (sp.showHist[k] % step === 0) next.push(sp.showHist[k], sp.showHist[k + 1]);
				sp.showHist = next;
				sp.showStep = step;
			}
		}
		if (!sp.showy && d > SHOWY_ON && sp.population >= 6) {
			sp.showy = true;
			this.log.push(t, 'info', `${sp.name} evolved a showy display`, sp.id);
		} else if (sp.showy && d < SHOWY_OFF) sp.showy = false;
	}

	_contact(i, s) {
		const D = this.disease;
		const c = this.gcell[i];
		const x = this.x[i];
		const y = this.y[i];
		const dom = this.domain[i];
		const r2 = CONTACT_R * CONTACT_R;
		const buf = this._contactBuf;
		let rolls = 0;
		let near = 0;
		for (let k = this.gstart[c], e = this.gstart[c + 1]; k < e; k++) {
			const j = this.gitems[k];
			if (j === i || !this.alive[j]) continue;
			const dj = this.domain[j];
			if (dj !== dom) {
				if (dj === 3 || dom === 3) {
					if (dj === 1 || dom === 1 || this.fly[dj === 3 ? j : i]) continue;
				} else if (dj !== 2 && dom !== 2) continue;
			}
			const dx = this.x[j] - x;
			const dy = this.y[j] - y;
			if (dx * dx + dy * dy > r2) continue;
			near++;
			if (!this.strain[j] && rolls < CONTACT_MAX) buf[rolls++] = j;
		}
		const k = CONTACT_K * (1 + CROWD_K * (near < CROWD_N ? near / CROWD_N : 1)) * (1 + HERD_CONTACT * (this.pn[i] > 1 ? 1 : this.herd[i]));
		for (let m = 0; m < rolls; m++) D.exposeAnimal(buf[m], s, k);
	}

	_attack(i, p, tile, tick) {
		const mp = this.mass[p] * this.gf[p];
		const pn = this.pn[i] > 1 ? this._packHelp(i, p) : 1;
		const massRatio = (this.mass[i] * this.gf[i]) / mp;
		const sizeF = Math.min(1.2, Math.max(0.15, massRatio * 0.85));
		const speedF = this.cls[i] === CLS_INVT && this.domain[i] === 1 && this.genome[i * AG + G_SPEED] < JELLY_SPEED ? 0.5 : this.spd[i] / (this.spd[i] + this.spd[p] * 0.7);
		const cover = this.nic[i]
			? BIRD_STRIKE
			: this.domain[p] === 1
			? 0.3 + Math.min(0.3, this.plants.cover(tile) * 0.6)
			: Math.min(0.45, this.plants.cover(tile) * 0.5) + (this.home[p] > 1 && Math.hypot(this.x[p] - this.nx[p], this.y[p] - this.ny[p]) <= NEST_NEAR ? DEN_COVER * this.genome[p * AG + G_NEST] : 0);
		let chance = 0.7 * sizeF * speedF * (1 - 0.6 * this.armor[p]) * (1 - cover * (1 - DISPLAY_SPOT * this.show[p])) * (1 - 0.5 * this.scav[i]);
		if (pn > 1) chance *= Math.min(PACK_CAP, 1 + PACK_K * (pn - 1));
		if (this.domain[p] === 3 && this.domain[i] !== 3) chance *= BIRD_ESCAPE;
		const herd = this.herd[p];
		if (herd > 0) {
			const n = this._localCount(p);
			chance *= 1 - (HERD_SAFE / Math.sqrt(pn)) * herd * (n < HERD_SAFE_N ? n / HERD_SAFE_N : 1);
		}
		if (pn > 1 && this.rng.next() < chance) {
			this._packFeed(i, p, pn, mp);
			this._kill(p, CARCASS_EATEN);
			this.deaths.eaten++;
		} else if (pn === 1 && this.rng.next() < chance) {
			this.energy[i] += (mp * MEAT_ENERGY * this.meatEff[i] + this.energy[p] * 0.25) * (1 - GEN_TAX * (1 - this._genT(i)));
			if (this.domain[i] !== 1) this.water[i] = Math.min(1, this.water[i] + MEAT_WATER);
			const ps = this.strain[p];
			if (ps && this.disease.on) this.disease.exposeAnimal(i, ps, PREY_K);
			this._kill(p, CARCASS_EATEN);
			this.deaths.eaten++;
			this.cool[i] = 4;
		} else {
			this.cool[i] = 8;
			this.energy[i] -= this.meta[i] * 2;
			this.state[p] = 4;
			this.ttl[p] = 4;
			this.tx[p] = this.x[p] + (this.x[p] - this.x[i]) * 6;
			this.ty[p] = this.y[p] + (this.y[p] - this.y[i]) * 6;
		}
	}

	_kill(i, frac = 1) {
		this.alive[i] = 0;
		if (this.domain[i] !== 1) this.landDeaths++;
		this.registry.remove(this.registry.get(this.sp[i]));
		const W = this.world.width;
		const tile = (this.y[i] | 0) * W + (this.x[i] | 0);
		if (this.strain[i]) this.disease.animalDied(i, tile, frac);
		this.plants.soil.addCarcass(tile, this.mass[i] * this.gf[i] * frac);
	}

	_dropSeed(i, tile, tick) {
		if (this.domain[i] === 3 && !(this.walk[tile] & 1)) {
			this.seedTtl[i] = 4;
			return;
		}
		const sp = this.registry.get(this.seedSp[i]);
		this.seedSp[i] = 0;
		if (!sp || sp.population <= 0) return;
		if (this.rng.next() >= 0.45 + 0.4 * sp.mean[10]) return;
		mutateGenes(sp.mean, 0, this.seedGenome, 0, PG, this.rng, 0.2, 0.025);
		this.plants.seedDrops++;
		this.plants.plantSeed(tile, this.seedGenome, sp, tick);
	}

	_poison(i, tick) {
		const P = this.plants;
		const excess = P.grazePotency - this.toxR[i];
		if (!(excess > 0)) return false;
		const type = P.grazeToxType;
		P.poisoned[type]++;
		let dead = false;
		if (type === 0) this.energy[i] -= excess * MILD_LOSS * this.emax[i];
		else if (type === 1) this.confuse[i] = NEURO_TICKS;
		else if (this.rng.next() < excess * LETHAL_P) dead = true;
		this._learn(i, P.grazeFungus, tick);
		return dead;
	}

	_learn(i, fungusId, tick) {
		const sp = this.registry.get(this.sp[i]);
		const fsp = this.registry.get(fungusId);
		if (!sp || !fsp) return;
		const hue = fsp.hsl[0] / 360;
		let entry = null;
		let bestD = MIMIC_HUE * 0.5;
		for (const a of sp.aversion) {
			const d = hueDist(a.hue, hue);
			if (d <= bestD) {
				bestD = d;
				entry = a;
			}
		}
		if (!entry) {
			entry = { hue, strength: 0 };
			sp.aversion.push(entry);
		}
		const before = entry.strength;
		entry.strength = before + 0.5 < 1 ? before + 0.5 : 1;
		if (before > 0.5 || entry.strength <= 0.5) return;
		this.aversionEvents++;
		const key = sp.id + ':' + fsp.id;
		const last = this._avoidLogged.get(key);
		if (last !== undefined && tick - last < AVERSION_LOG_GAP) return;
		this._avoidLogged.set(key, tick);
		this.log.push(tick, 'info', `${sp.name} learned to avoid ${fsp.name}`, sp.id);
	}

	_eggTile(i) {
		const W = this.world.width;
		const tile = (this.y[i] | 0) * W + (this.x[i] | 0);
		const Wx = this.weather;
		if (this.domain[i] === 3) return this._perch(tile) ? tile : -1;
		if (this.domain[i] !== 2 || !Wx) return tile;
		const x = tile % W;
		const cand = [tile, x + 1 < W ? tile + 1 : -1, x > 0 ? tile - 1 : -1, tile + W < Wx.n ? tile + W : -1, tile - W];
		for (const t of cand) if (t >= 0 && this.walk[t] & 4 && (Wx.fresh[t] || Wx.wet[t] > EGG_WET)) return t;
		return -1;
	}

	_reproduce(i, tick) {
		const rng = this.rng;
		const dom = this.domain[i];
		const layer = this.eggs && (dom !== 0 || this.cold[i] > 0.5);
		const hk = this.home[i];
		const W = this.world.width;
		const ntile = hk === 1 || hk === 2 ? (this.ny[i] | 0) * W + (this.nx[i] | 0) : -1;
		if (ntile >= 0 && !(this._site(i, ntile) > 0)) {
			this._dropHome(i);
			this.cool[i] = 10;
			return;
		}
		const nest = layer && hk === 1;
		const eggTile = nest ? ntile : layer ? this._eggTile(i) : -1;
		if (layer && eggTile < 0) {
			this.cool[i] = 10;
			return;
		}
		const eggDom = nest && this.cls[i] === CLS_REPT ? 0 : dom;
		const D = this.disease && this.disease.on ? this.disease : null;
		const vs = nest && D && this.strain[i] && rng.next() < EGG_VERT_K ? this.strain[i] : 0;
		const litter = this.litter[i];
		const mate = this._chooseMate(i);
		if (mate === -2) return;
		const parentSp = this.registry.get(this.sp[i]);
		const childG = this.childGenome;
		const oi = i * AG;
		const om = mate >= 0 ? mate * AG : oi;
		const budget = this.emax[i] * 0.38;
		const perChild = budget / litter;
		const brood = layer ? Math.round(litter * EGG_CLUTCH_MUL) : litter;
		const ex = eggTile % W;
		const ey = (eggTile - ex) / W;
		let clutchSp = null;
		let spent = 0;
		const ni = this.natImm[i];
		const nm = mate >= 0 ? this.natImm[mate] : 0;
		for (let c = 0; c < brood; c++) {
			if (this.count >= this.maxAnimals + 1500) break;
			for (let k = 0; k < AG; k++) childG[k] = rng.next() < 0.5 ? this.genome[oi + k] : this.genome[om + k];
			mutateGenes(childG, 0, childG, 0, AG, rng, 0.25, 0.04);
			this._clampClass(childG, this.cls[i]);
			if (this.immune[i]) childG[G_RES] = Math.min(1, childG[G_RES] + RES_NUDGE);
			const ang = rng.next() * Math.PI * 2;
			const cx = this.x[i] + Math.cos(ang) * 0.8;
			const cy = this.y[i] + Math.sin(ang) * 0.8;
			const x = this.canStand(dom, cx, cy) ? cx : this.x[i];
			const y = this.canStand(dom, cx, cy) ? cy : this.y[i];
			let sp = parentSp;
			if (geneDistance(childG, 0, parentSp.mean, 0, ANIMAL_WEIGHTS) > ANIMAL_SPECIATION) {
				if (clutchSp && geneDistance(childG, 0, clutchSp.mean, 0, ANIMAL_WEIGHTS) < ANIMAL_SPECIATION) sp = clutchSp;
				else {
					sp = this.registry.matchDaughter(parentSp, childG, ANIMAL_WEIGHTS, ANIMAL_SPECIATION);
					if (!sp && !this.registry.canSplit(parentSp, ANIMAL_SPLIT_MIN_POP)) sp = parentSp;
				}
			}
			if (!sp) {
				sp = this.newSpecies(childG, 0, parentSp.domain, parentSp, tick, null);
				if (layer) clutchSp = sp;
				const label = ANIMAL_CATEGORY_LABEL[sp.category].toLowerCase();
				const rolePrev = parentSp.role;
				const shift = rolePrev !== sp.role ? ` — a new ${sp.role}!` : '';
				this.log.push(tick, 'speciation', `${sp.name} (${label}) branched from ${parentSp.name}${shift}`, sp.id);
			}
			let im = ni && nm ? (rng.next() < 0.5 ? ni : nm) : ni || nm;
			if (D && rng.next() < NATIMM_P) {
				const ds = D.speciesStrain.get(parentSp.id);
				if (ds) im = ds;
			}
			if (layer) {
				const cost = perChild * EGG_COST;
				this.eggs.lay(sp, childG, 0, ex + 0.15 + 0.7 * rng.next(), ey + 0.15 + 0.7 * rng.next(), eggTile, cost, eggDom, im, nest, vs);
				spent += cost;
				continue;
			}
			const j = this.spawn(sp, childG, 0, x, y, 0);
			this.energy[j] = Math.min(perChild, this.emax[j] * this.gf[j] * 0.6);
			this.natImm[j] = im;
			this.parent[j] = this.uid[i];
			if (ntile >= 0) {
				this.home[j] = 3;
				this.nx[j] = this.nx[i];
				this.ny[j] = this.ny[i];
			}
			spent += perChild;
			this.births++;
		}
		this.energy[i] -= spent * 1.1 * (1 - TERR_REPRO * this._homeK(i));
		this.cool[i] = Math.round(35 + 55 * this.genome[oi + G_SIZE] - 10 * this.genome[oi + G_FEC]);
	}

	_clampClass(g, cls) {
		const r = CLS_COLD[cls];
		const c = g[G_COLD];
		g[G_COLD] = c < r[0] ? r[0] : c > r[1] ? r[1] : c;
		if (cls === CLS_INVT && g[G_SIZE] > INVERT_SIZE) g[G_SIZE] = INVERT_SIZE;
		else if (cls === CLS_BIRD && g[G_SIZE] > BIRD_SIZE) g[G_SIZE] = BIRD_SIZE;
	}

	_compact() {
		let n = this.count;
		for (let i = 0; i < n; i++) {
			if (this.alive[i]) continue;
			while (n > i + 1 && !this.alive[n - 1]) n--;
			if (n - 1 > i) this._copySlot(n - 1, i);
			n--;
		}
		this.count = n;
	}

	_copySlot(from, to) {
		for (const f of ANIMAL_FIELDS_F) this[f][to] = this[f][from];
		for (const f of ANIMAL_FIELDS_I) this[f][to] = this[f][from];
		this.genome.copyWithin(to * AG, from * AG, from * AG + AG);
	}

	reassignSpecies(fromSp, toSp) {
		const sp = this.sp;
		const from = fromSp.id;
		let moved = 0;
		for (let i = 0; i < this.count; i++) {
			if (sp[i] !== from) continue;
			sp[i] = toSp.id;
			if (this.alive[i]) moved++;
		}
		return moved;
	}

	refreshSpeciesMeans() {
		const sums = new Map();
		for (let i = 0; i < this.count; i++) {
			const id = this.sp[i];
			let s = sums.get(id);
			if (!s) {
				s = new Float64Array(AG + 2);
				sums.set(id, s);
			}
			const o = i * AG;
			for (let k = 0; k < AG; k++) s[k] += this.genome[o + k];
			s[AG]++;
			if (this.strain[i]) s[AG + 1]++;
		}
		for (const [id, s] of sums) {
			const sp = this.registry.get(id);
			for (let k = 0; k < AG; k++) sp.mean[k] = s[k] / s[AG];
			sp.infected = s[AG + 1];
			sp.category = animalCategory(sp.mean, sp.domain, sp.cls, sp.nic | 0);
			sp.icon = animalIcon(sp.category, sp.id);
			sp.role = ANIMAL_ROLES[roleIndex(sp.mean[G_DIET], sp.mean[G_SCAV])];
			this._showTrack(sp);
			const av = sp.aversion;
			if (av && av.length) {
				for (const a of av) a.strength *= 1 - AVERSION_DECAY;
				sp.aversion = av.filter((a) => a.strength >= 0.05);
			}
		}
	}
}
