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
const DOMAIN_BIT = [1, 2, 4];
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

const ANIMAL_ARCHETYPES = [
	{ domain: 'land', cls: CLS_MAMM, n: 50, g: [0.12, 0.5, 0.45, 0.04, 0.5, 0.65, 0.85, 0.3, 0.08, 0.15, 0.1, 0.05, 0.6, 0.05, 0.3, 0.3, 0.15, 0.3, 0.3] },
	{ domain: 'land', cls: CLS_MAMM, n: 40, g: [0.45, 0.62, 0.55, 0.05, 0.45, 0.5, 0.4, 0.35, 0.2, 0.15, 0.1, 0.05, 0.6, 0.05, 0.3, 0.3, 0.15, 0.3, 0.3] },
	{ domain: 'land', cls: CLS_MAMM, n: 25, g: [0.85, 0.28, 0.35, 0.04, 0.55, 0.5, 0.15, 0.55, 0.7, 0.15, 0.1, 0.05, 0.6, 0.05, 0.3, 0.3, 0.15, 0.3, 0.3] },
	{ domain: 'land', cls: CLS_MAMM, n: 35, g: [0.32, 0.72, 0.5, 0.06, 0.8, 0.45, 0.5, 0.6, 0.15, 0.15, 0.1, 0.05, 0.6, 0.05, 0.3, 0.3, 0.15, 0.3, 0.3] },
	{ domain: 'land', cls: CLS_MAMM, n: 30, g: [0.55, 0.45, 0.45, 0.05, 0.18, 0.45, 0.35, 0.3, 0.35, 0.15, 0.1, 0.05, 0.6, 0.05, 0.3, 0.3, 0.15, 0.3, 0.3] },
	{ domain: 'land', cls: CLS_MAMM, n: 24, g: [0.42, 0.42, 0.45, 0.45, 0.5, 0.55, 0.55, 0.4, 0.2, 0.15, 0.1, 0.35, 0.1, 0.05, 0.3, 0.3, 0.15, 0.3, 0.3] },
	{ domain: 'land', cls: CLS_MAMM, n: 10, g: [0.3, 0.68, 0.7, 0.88, 0.55, 0.6, 0.55, 0.3, 0.1, 0.15, 0.1, 0.5, 0.1, 0.05, 0.3, 0.3, 0.4, 0.3, 0.3] },
	{ domain: 'land', cls: CLS_MAMM, n: 8, g: [0.62, 0.72, 0.75, 0.92, 0.42, 0.6, 0.35, 0.3, 0.25, 0.15, 0.1, 0.5, 0.1, 0.05, 0.3, 0.3, 0.4, 0.3, 0.3] },
	{ domain: 'water', cls: CLS_FISH, n: 60, g: [0.18, 0.5, 0.45, 0.04, 0.5, 0.6, 0.85, 0.3, 0.1, 0.15, 0.1, 0.05, 0.5, 0.05, 0.3, 0.3, 0.15, 0.3, 0.3] },
	{ domain: 'water', cls: CLS_FISH, n: 40, g: [0.32, 0.45, 0.45, 0.06, 0.78, 0.45, 0.6, 0.4, 0.3, 0.15, 0.1, 0.05, 0.5, 0.05, 0.3, 0.3, 0.15, 0.3, 0.3] },
	{ domain: 'water', cls: CLS_INVT, n: 24, g: [0.35, 0.3, 0.4, 0.45, 0.45, 0.55, 0.6, 0.3, 0.5, 0.15, 0.65, 0.35, 0.1, 0.5, 0.3, 0.3, 0.15, 0.3, 0.3] },
	{ domain: 'water', cls: CLS_FISH, n: 8, g: [0.4, 0.66, 0.65, 0.85, 0.35, 0.6, 0.5, 0.3, 0.15, 0.15, 0.1, 0.5, 0.1, 0.05, 0.3, 0.3, 0.4, 0.3, 0.3] },
	{ domain: 'water', cls: CLS_FISH, n: 6, g: [0.75, 0.72, 0.75, 0.92, 0.6, 0.55, 0.3, 0.3, 0.3, 0.15, 0.1, 0.5, 0.1, 0.05, 0.3, 0.3, 0.4, 0.3, 0.3] },
	{ domain: 'land', cls: CLS_MAMM, n: 18, g: [0.38, 0.45, 0.6, 0.45, 0.5, 0.65, 0.6, 0.6, 0.2, 0.3, 0.8, 0.35, 0.1, 0.05, 0.3, 0.3, 0.15, 0.3, 0.3] },
	{ domain: 'amph', cls: CLS_AMPH, n: 16, g: [0.14, 0.5, 0.45, 0.45, 0.55, 0.55, 0.8, 0.5, 0.05, 0.15, 0.1, 0.2, 0.2, 0.6, 0.2, 0.3, 0.15, 0.3, 0.3] },
	{ domain: 'amph', cls: CLS_AMPH, n: 16, g: [0.12, 0.4, 0.4, 0.08, 0.5, 0.55, 0.8, 0.4, 0.05, 0.15, 0.1, 0.05, 0.3, 0.6, 0.2, 0.3, 0.15, 0.3, 0.3] },
	{ domain: 'amph', cls: CLS_AMPH, n: 16, g: [0.25, 0.5, 0.5, 0.8, 0.5, 0.55, 0.6, 0.4, 0.1, 0.15, 0.1, 0.35, 0.1, 0.6, 0.2, 0.3, 0.4, 0.3, 0.3] },
	{ domain: 'amph', cls: CLS_REPT, n: 16, g: [0.85, 0.4, 0.5, 0.9, 0.7, 0.5, 0.4, 0.5, 0.7, 0.15, 0.3, 0.5, 0.1, 0.8, 0.4, 0.3, 0.4, 0.3, 0.3] },
	{ domain: 'land', cls: CLS_REPT, n: 16, g: [0.2, 0.6, 0.5, 0.45, 0.8, 0.5, 0.6, 0.5, 0.15, 0.15, 0.1, 0.4, 0.1, 0.85, 0.8, 0.3, 0.15, 0.3, 0.3] },
	{ domain: 'land', cls: CLS_REPT, n: 16, g: [0.55, 0.15, 0.35, 0.05, 0.78, 0.5, 0.4, 0.5, 0.9, 0.15, 0.1, 0.05, 0.1, 0.85, 0.8, 0.3, 0.15, 0.3, 0.3] },
	{ domain: 'land', cls: CLS_REPT, n: 16, g: [0.55, 0.5, 0.55, 0.85, 0.8, 0.5, 0.4, 0.4, 0.3, 0.15, 0.3, 0.5, 0.1, 0.8, 0.7, 0.3, 0.4, 0.3, 0.3] },
	{ domain: 'land', cls: CLS_REPT, n: 16, g: [0.3, 0.45, 0.85, 0.9, 0.78, 0.5, 0.5, 0.5, 0.1, 0.15, 0.1, 0.5, 0.1, 0.85, 0.7, 0.3, 0.4, 0.3, 0.3] },
	{ domain: 'water', cls: CLS_REPT, n: 14, g: [0.5, 0.35, 0.4, 0.06, 0.65, 0.5, 0.45, 0.4, 0.75, 0.15, 0.1, 0.05, 0.3, 0.7, 0.3, 0.3, 0.1, 0.3, 0.3] },
	{ domain: 'water', cls: CLS_MAMM, n: 8, g: [0.55, 0.65, 0.65, 0.8, 0.3, 0.6, 0.35, 0.3, 0.2, 0.15, 0.1, 0.3, 0.4, 0.1, 0.3, 0.3, 0.5, 0.3, 0.3] },
	{ domain: 'water', cls: CLS_INVT, n: 30, g: [0.15, 0.15, 0.3, 0.06, 0.5, 0.6, 0.85, 0.5, 0.8, 0.15, 0.2, 0.05, 0.2, 0.8, 0.3, 0.1, 0.1, 0.2, 0.2] },
	{ domain: 'water', cls: CLS_INVT, n: 12, g: [0.28, 0.7, 0.75, 0.8, 0.5, 0.55, 0.7, 0.5, 0.05, 0.15, 0.2, 0.2, 0.1, 0.8, 0.3, 0.2, 0.1, 0.4, 0.3] },
	{ domain: 'water', cls: CLS_INVT, n: 14, g: [0.2, 0.15, 0.3, 0.75, 0.55, 0.6, 0.85, 0.7, 0.05, 0.15, 0.1, 0.05, 0.3, 0.85, 0.3, 0.05, 0.1, 0.2, 0.2] },
	{ domain: 'land', cls: CLS_INVT, n: 30, g: [0.06, 0.12, 0.3, 0.08, 0.5, 0.6, 0.9, 0.6, 0.6, 0.15, 0.1, 0.05, 0.1, 0.8, 0.2, 0.1, 0.1, 0.2, 0.2] },
	{ domain: 'land', cls: CLS_INVT, n: 24, g: [0.08, 0.55, 0.6, 0.8, 0.6, 0.55, 0.85, 0.6, 0.3, 0.15, 0.1, 0.2, 0.05, 0.8, 0.6, 0.2, 0.05, 0.2, 0.2] },
];

function dietRole(diet) {
	return diet < 0.33 ? 'herbivore' : diet < 0.66 ? 'omnivore' : 'carnivore';
}

function roleIndex(diet, scav) {
	return diet >= 0.33 && scav > 0.5 ? 3 : diet < 0.33 ? 0 : diet < 0.66 ? 1 : 2;
}

function animalCategory(g, domain, cls = CLS_MAMM) {
	const size = g[G_SIZE];
	const role = dietRole(g[G_DIET]);
	const scav = role !== 'herbivore' && g[G_SCAV] > 0.5;
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
};

const ANIMAL_FIELDS_F = [
	'x', 'y', 'px', 'py', 'energy', 'age', 'tx', 'ty',
	'mass', 'spd', 'range', 'plantEff', 'meatEff', 'emax', 'meta', 'mature', 'maxAge',
	'litter', 'pT', 'tol', 'toxR', 'armor', 'diet', 'bite', 'carrionEff', 'scav',
	'terr', 'herd', 'cold', 'dry', 'hr', 'water', 'hx', 'hy', 'gf', 'ef',
];
const ANIMAL_FIELDS_I = ['sp', 'uid', 'cool', 'ttl', 'face', 'domain', 'cls', 'alive', 'state', 'seedSp', 'seedTtl', 'confuse', 'strain', 'itime', 'immune', 'imTime', 'natImm', 'parent'];

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
			else this.walk[i] = b === BIOME_ID.GLACIER ? 0 : 1;
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
			if (!w) continue;
			if (w & 2) {
				if (depth[i] < AMPH_DEPTH && !this.world.isOcean[i]) walk[i] = w | 4;
			} else if (!Wx || Wx.waterDist[i] <= AMPH_RANGE) walk[i] = w | 4;
		}
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
		this.meta[i] = 0.05 * m75 * (1 + 0.9 * speed * speed + 0.35 * sense + 0.3 * armor + 0.2 * toxR + 0.15 * g[o + G_TOL]) * (1 + RES_COST * g[o + G_RES]) * (1 + TERR_COST * terr) * (1 - COLD_META * cold) * (1 + DRY_COST * g[o + G_DRY]);
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
		this.domain[i] = sp.domain === 'water' ? 1 : sp.domain === 'amph' ? 2 : 0;
		this.cls[i] = sp.cls;
		this.water[i] = 1;
		this.hx[i] = -1;
		this.hy[i] = -1;
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
		this.registry.add(sp);
		return i;
	}

	newSpecies(genome, gOff, domain, parent, tick, origin, cls = parent ? parent.cls : CLS_MAMM) {
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
		sp.category = animalCategory(g, domain, cls);
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

	_nearest(i, r, mode) {
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
		const preyK = this.cls[i] === CLS_INVT ? INVERT_PREY : diet > 0.66 ? 1.8 : 0.6;
		let best = -1;
		let bestD = r * r;
		for (let gy = r0; gy <= r1; gy++) {
			for (let gx = c0; gx <= c1; gx++) {
				const c = gy * cols + gx;
				for (let k = this.gstart[c], e = this.gstart[c + 1]; k < e; k++) {
					const j = this.gitems[k];
					if (j === i || !this.alive[j]) continue;
					const dj = this.domain[j];
					if (dj !== dom && dj !== 2 && dom !== 2) continue;
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
					const d = dx * dx + dy * dy;
					if (d < bestD) {
						bestD = d;
						best = j;
					}
				}
			}
		}
		return best;
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
		const bit = DOMAIN_BIT[this.domain[i]];
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
		return v > 0 ? v : 0;
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
		const needFood = this.plantEff[i] > 0.15;
		const reach = this._reach(i);
		const tall = reach > 0;
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
		for (let s = 0; s < samples; s++) {
			const tx = this.x[i] + (this.rng.next() * 2 - 1) * r;
			const ty = this.y[i] + (this.rng.next() * 2 - 1) * r;
			if (tx < 0 || ty < 0 || tx >= W || ty >= H) continue;
			if (!this.canStand(dom, tx, ty)) continue;
			const j = (ty | 0) * W + (tx | 0);
			let food = 0.2;
			if (needFood) {
				food = plants.edible(j, reach);
				if (fruitEater) {
					const fr = plants.fruitAt(j, tall);
					if (fr > 0) food += fr * FRUIT_LURE * (0.6 + plants.genome[j * PG + 9]);
				}
				if (av && plants.kind[pn + j] && plants.species[pn + j]) food *= 1 - this._aversion(av, plants.hue[pn + j]);
			}
			if (bugEff > 0) food += bugs.edibleAt(j) * bugEff;
			if (carrion[j] > 0) food += carrion[j] * carrionLure;
			if (eggHead && eggHead[j] >= 0) food += EGG_LURE;
			const clim = this._clim(i, temp[j]);
			const dist = Math.hypot(tx - this.x[i], ty - this.y[i]);
			let score = (food + 0.02) * (0.25 + clim) / (1 + dist * 0.08) + this.rng.next() * 0.002;
			if (wd) score += WATERHOLE / (1 + wd[j]);
			if (tUntil[j] > tick && tUid[j] !== uid && (tSp[j] === sp || tRole[j] === role)) score *= TERR_RIVAL;
			if (score > bestScore) {
				bestScore = score;
				bx = tx;
				by = ty;
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
		if (this.hx[i] >= 0) {
			const ox = this.hx[i];
			const oy = this.hy[i];
			const r = this.hr[i];
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
			const homeK = this._homeK(i);
			if (homeK > 0 && ((tick + i) & 1) === 1) this._chaseRival(i);
			const bite = this.bite[i] * gf * ef * (1 + TERR_BITE * homeK);
			let cost = m75 * (1 + 1.3 * (1 - clim));
			if (this.cold[i] > 0.5) {
				const et = temp[tile] + seasonT;
				if (et < 0.5) cost += m75 * COLD_UPKEEP * (0.5 - et) * 2;
			}
			const lw = tileLoad[tile] + ((this.mass[i] * TILE_LOAD_SCALE + 0.5) | 0);
			tileLoad[tile] = lw < 65535 ? lw : 65535;
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

			if (!acted && this.meatEff[i] > 0.25 && e < emax * (this.scav[i] > 0.5 ? SCAV_HUNT : 0.6) && this.cool[i] === 0) {
				const p = this._nearest(i, this.range[i], 1);
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

			if (!acted && this.parent[i] && gf < 1 && (tick + i) % FOLLOW_EVERY === 0 && this.state[i] !== 1) {
				const p = this._nearest(i, this.range[i], 2);
				if (p >= 0 && Math.hypot(this.x[p] - this.x[i], this.y[p] - this.y[i]) > 1.5) {
					moved = this._moveToward(i, this.x[p], this.y[p], 1);
					this.state[i] = 0;
					acted = true;
				}
			}

			if (eggs && (dg >= 0.33 || dom === 1) && this.energy[i] < emax && eggs.head[tile] >= 0) this.energy[i] += eggs.eatAt(tile, dom !== 1, this.sp[i], (emax - this.energy[i]) / EGG_FOOD) * EGG_FOOD;

			if (!acted && this.scav[i] > 0.5 && e < emax * 0.92 && !(carrion[tile] > 0)) {
				if ((this.ttl[i] <= 0 || this.state[i] !== 2) && !this._pickCarrion(i)) this._pickForage(i);
				this.state[i] = 2;
				if (carrion[(this.ty[i] | 0) * W + (this.tx[i] | 0)] > 0) {
					moved = this._moveToward(i, this.tx[i], this.ty[i], 1);
					this.ttl[i]--;
					acted = true;
				}
			}

			if (!acted && this.plantEff[i] > 0.12 && e < emax * 0.92) {
				const ok = (this.walk[tile] & DOMAIN_BIT[dom]) !== 0;
				const reach = this._reach(i);
				const tall = reach > 0;
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
					this.energy[i] += eaten * FRUIT_ENERGY * (0.6 + plants.fruitSweet) * this.plantEff[i] * plantK * (1 - 1.6 * (seedHit > 0 ? seedHit : 0));
					if (plants.fruitSp && !this.seedSp[i]) {
						this.seedSp[i] = plants.fruitSp;
						this.seedTtl[i] = 20 + ((rng.next() * 40) | 0);
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
				if (this.ttl[i] <= 0) this._pickForage(i);
				moved = this._moveToward(i, this.tx[i], this.ty[i], 0.45);
				this.ttl[i]--;
			}

			if (bugs) {
				if (this.mass[i] < BUG_MASS && bugs.total[tile] > 0 && this.energy[i] < emax) {
					const be = this._bugEff(i);
					if (be > 0) this.energy[i] += bugs.eat(tile, this.bite[i] * gf * ef * be) * BUG_ENERGY;
				}
				const pl = parasiteLoad[tile];
				if (pl > 0) {
					drain = pl * PARASITE_DRAIN * this.mass[i] * (1 - 0.6 * this.armor[i]) * (0.4 + 0.6 * gaussFit(this.genome[i * AG + G_SIZE], this.parasiteHost[tile], PARASITE_HOST_TOL));
					cost += drain;
					bugs.parasiteDrain += drain;
				}
			}
			if (this.cls[i] === CLS_INVT && !dom && dg < 0.5 && this.energy[i] < emax && soil.litter[tile] > 0) this.energy[i] += soil.consumeLitter(tile, bite) * LITTER_ENERGY * plantK;
			if (carrion[tile] > 0 && this.energy[i] < emax * 0.92) {
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
						if (((tick + i) & 1) === 0) this._contact(i, s);
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
				(dom !== 2 || !Wx || Wx.waterDist[tile] <= 1 || (this.walk[tile] & 2) !== 0) &&
				this._localCount(i) < 14
			) {
				this._reproduce(i, tick);
			}
		}
		this.holders = holders;
		this._compact();
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
			if (dj !== dom && dj !== 2 && dom !== 2) continue;
			const dx = this.x[j] - x;
			const dy = this.y[j] - y;
			if (dx * dx + dy * dy > r2) continue;
			near++;
			if (!this.strain[j] && rolls < CONTACT_MAX) buf[rolls++] = j;
		}
		const k = CONTACT_K * (1 + CROWD_K * (near < CROWD_N ? near / CROWD_N : 1)) * (1 + HERD_CONTACT * this.herd[i]);
		for (let m = 0; m < rolls; m++) D.exposeAnimal(buf[m], s, k);
	}

	_attack(i, p, tile, tick) {
		const mp = this.mass[p] * this.gf[p];
		const massRatio = (this.mass[i] * this.gf[i]) / mp;
		const sizeF = Math.min(1.2, Math.max(0.15, massRatio * 0.85));
		const speedF = this.cls[i] === CLS_INVT && this.domain[i] === 1 && this.genome[i * AG + G_SPEED] < JELLY_SPEED ? 0.5 : this.spd[i] / (this.spd[i] + this.spd[p] * 0.7);
		const cover = this.domain[p] === 1
			? 0.3 + Math.min(0.3, this.plants.cover(tile) * 0.6)
			: Math.min(0.45, this.plants.cover(tile) * 0.5);
		let chance = 0.7 * sizeF * speedF * (1 - 0.6 * this.armor[p]) * (1 - cover) * (1 - 0.5 * this.scav[i]);
		const herd = this.herd[p];
		if (herd > 0) {
			const n = this._localCount(p);
			chance *= 1 - HERD_SAFE * herd * (n < HERD_SAFE_N ? n / HERD_SAFE_N : 1);
		}
		if (this.rng.next() < chance) {
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
		const eggTile = layer ? this._eggTile(i) : -1;
		if (layer && eggTile < 0) {
			this.cool[i] = 10;
			return;
		}
		const litter = this.litter[i];
		const mate = this._nearest(i, this.range[i], 2);
		const parentSp = this.registry.get(this.sp[i]);
		const childG = this.childGenome;
		const oi = i * AG;
		const om = mate >= 0 ? mate * AG : oi;
		const budget = this.emax[i] * 0.38;
		const perChild = budget / litter;
		const brood = layer ? Math.round(litter * EGG_CLUTCH_MUL) : litter;
		const W = this.world.width;
		const ex = eggTile % W;
		const ey = (eggTile - ex) / W;
		let clutchSp = null;
		let spent = 0;
		const D = this.disease && this.disease.on ? this.disease : null;
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
				this.eggs.lay(sp, childG, 0, ex + 0.15 + 0.7 * rng.next(), ey + 0.15 + 0.7 * rng.next(), eggTile, cost, dom, im);
				spent += cost;
				continue;
			}
			const j = this.spawn(sp, childG, 0, x, y, 0);
			this.energy[j] = Math.min(perChild, this.emax[j] * this.gf[j] * 0.6);
			this.natImm[j] = im;
			this.parent[j] = this.uid[i];
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
			sp.category = animalCategory(sp.mean, sp.domain, sp.cls);
			sp.icon = animalIcon(sp.category, sp.id);
			sp.role = ANIMAL_ROLES[roleIndex(sp.mean[G_DIET], sp.mean[G_SCAV])];
			const av = sp.aversion;
			if (av && av.length) {
				for (const a of av) a.strength *= 1 - AVERSION_DECAY;
				sp.aversion = av.filter((a) => a.strength >= 0.05);
			}
		}
	}
}
