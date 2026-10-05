const AG = 32;
const AG_V1 = 30;
const G_SIZE = 0, G_SPEED = 1, G_SENSE = 2, G_DIET = 3, G_TEMP = 4, G_TOL = 5, G_FEC = 6, G_TOXR = 7, G_ARMOR = 8, G_RES = 9, G_SCAV = 10, G_TERR = 11, G_HERD = 12, G_COLD = 13, G_DRY = 14, G_NEST = 15, G_PACK = 16, G_DISPLAY = 17, G_CHOOSY = 18, G_APPETITE = 19, G_DORMANCY = 20, G_ALARM = 21, G_SOCIAL = 22, G_BROOD = 23, G_CARE = 24, G_CLEAN = 25, G_TOLER = 26, G_TOXIC = 27, G_MIMIC = 28, G_BRAIN = 29, G_DEPTH = 30, G_SALT = 31;
const ANIMAL_WEIGHTS = [1.3, 1, 0.7, 1.8, 1.2, 0.5, 0.8, 0.5, 0.8, 0.25, 0.9, 0.6, 0.6, 1.2, 0.6, 0.3, 0.3, 0.3, 0.3, 0.5, 0.5, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.5, 0.6, 0.6];
const ANIMAL_CLASSES = ['fish', 'amphibian', 'reptile', 'mammal', 'bird', 'invertebrate'];
const CLS_FISH = 0, CLS_AMPH = 1, CLS_REPT = 2, CLS_MAMM = 3, CLS_BIRD = 4, CLS_INVT = 5;
const CLS_COLD = [[0, 1], [0.5, 1], [0.5, 1], [0, 0.45], [0, 0.45], [0.5, 1]];
const ANIMAL_ROLES = ['herbivore', 'omnivore', 'carnivore', 'scavenger'];
const CLASS_PLURAL = ['fish', 'amphibians', 'reptiles', 'mammals', 'birds', 'invertebrates'];
const INVERT_SIZE = 0.45;
const INVERT_BUG = 1.3;
const INVERT_THIRST = 0.5;
const LITTER_ENERGY = 2.4;
const JELLY_SPEED = 0.3;
const INVERT_PREY = 0.7;
const BIRD_SIZE = 0.6;
const FLY_META = 1.2;
const BIRD_BITE = 0.85;
const BIRD_CROWD = 10;
const BIRD_ESCAPE = 0.35;
const BIRD_SPEED = 1.45;
const BIRD_SENSE = 1.4;
const BIRD_BUG = 6;
const BIRD_BUG_ENERGY = 0.9;
const BIRD_BUG_LO = 0.25;
const BIRD_BUG_SPAN = 0.15;
const BIRD_PREY = 1;
const BIRD_FISH_MASS = 1.25;
const BIRD_DEPTH = 0.5;
const BIRD_FISH_LURE = 0.6;
const BIRD_STRIKE = 0.1;
const FISHER_HUNT = 0.85;
const FISHER_RANGE = 2;
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
const ANIMAL_SPECIATION = 0.15;
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
const SCAV_RANGE = 2.5;
const SCAV_HUNT = 0.35;
const MILD_LOSS = 0.25;
const NEURO_TICKS = 25;
const LETHAL_P = 0.5;
const AVERSION_DECAY = 0.015;
const MIMIC_HUE = 0.07;
const AVERSION_LOG_GAP = 2400;
const CLEAN_MIN = 0.4;
const CLEAN_MASS = 1.6;
const CLEAN_EVERY = 3;
const CLEAN_RANGE = 0.8;
const CLEAN_BURDEN = 0.0015;
const CLEAN_TICKS = 60;
const CLEAN_CUT = 0.2;
const CLEAN_GAIN = 0.1;
const CLEAN_FULL = 0.012;
const CLEAN_TILE = 0.5;
const CLEAN_SICK = 6;
const CLEAN_CARRY = 0.5;
const CLEAN_EAT = 0.5;
const CLEAN_RIDE = 5;
const CLEAN_SPEC = 0.3;
const CLEAN_HUNGRY = 0.9;
const CLEAN_COOL = 12;
const CLEAN_PAIR_N = 10;
const CLEAN_PAIR_SHARE = 0.25;
const CLEAN_COUNT_DECAY = 0.9;
const CLEAN_POP = 4;
const TOX_MIN = 0.4;
const TOX_COST = 0.06;
const MIMIC_COST = 0.05;
const TOX_HIT = 0.15;
const TOX_SPIT = 0.8;
const TOX_LEARN = 0.45;
const PREY_HUE = 0.04;
const PREY_AV_DECAY = 0.08;
const MIMIC_UNLEARN = 0.3;
const PREY_AV_SKIP = 0.6;
const PREY_AV_DIST = 1;
const PREY_GEN = 0.7;
const PREY_AV_HUNGRY = 0.5;
const MODEL_SWITCH = 1.5;
const MODEL_KEEP = 0.5;
const BRAIN_COST = 0.15;
const BRAIN_MATURE = 60;
const MEM_USE = 1.5;
const MEM_FAR = 40;
const MEM_LOW = 0.05;
const MEM_GOOD = 0.4;
const MEM_WATER_REC = 0.99;
const MEM_WATER_OK = 2;
const DANGER_R = 5;
const LEARN_ADD = 0.6;
const LEARN_BASE = 0.3;
const LEARN_RANGE = 0.8;
const LEARN_DECAY = 0.03;
const LEARN_MIN = 0.05;
const TEACH_LIVE = 0.9;
const TEACH_CARE = 0.25;
const TEACH_KEEP = 0.6;
const TOOL_MIN = 0.35;
const TOOL_SPAN = 0.3;
const TOOL_K = 0.3;
const TOOL_CRACK = 0.5;
const TOOL_ARMOR = 0.4;
const TOOL_LOG = 4;
const TOOL_DECAY = 0.97;
const TOOL_SP = 1;
const MIMIC_LO = 0.2;
const MIMIC_SPAN = 0.35;
const MIMIC_GENE = 0.45;
const MIMIC_TOX = 0.3;
const MODEL_POP = 4;
const BUG_MASS = 1.4;
const BUG_ENERGY = 0.3;
const BUG_LURE = 1;
const BUG_DIET_PEAK = 0.45;
const BUG_DIET_MAX = 0.66;
const PARASITE_DRAIN = 0.02;
const PARASITE_DEATH_SHARE = 0.08;
const PARASITE_HOST_TOL = 0.3;
const TILE_LOAD_SCALE = 4;
const RES_COST = 0.05;
const SICK_COST = 0.5;
const SICK_SLOW = 0.4;
const SICK_DEATH = 0.01;
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
const SALT_THIRST = 1.5;
const SALT_THIRST_AMPH = 1.1;
const MIRE_DRAG = 0.3;
const ZONE_ARID = 1, ZONE_ALPINE = 2, ZONE_DENSE = 3, ZONE_MIRE = 4, ZONE_FRESH = 5;
const ALPINE_AIR_K = 0.08;
const ARID_K = 0.25;
const ARID_SIZE = 1.6;
const ARID_BASE = 0.2;
const ARID_ECTO = 0.45;
const BERG_T = 0.4;
const BERG_K = 0.22;
const FOREST_SLOW = 0.7;
const FOREST_FREE = 0.25;
const AMPH_MIRE = 0.22;
const HYPOXIA_COST = 1.5;
const AMPH_FRESH = 0.1;
const AEST_MAMM_MASS = 1.2;
const BIOME_ZONE = new Uint8Array(BIOME_LIST.length);
for (const k of ['DESERT', 'SALT_FLAT', 'BADLANDS', 'DUNES', 'VOLCANIC']) BIOME_ZONE[BIOME_ID[k]] = ZONE_ARID;
for (const k of ['RAINFOREST', 'JUNGLE', 'CLOUD_FOREST', 'REDWOOD_FOREST']) BIOME_ZONE[BIOME_ID[k]] = ZONE_DENSE;
for (const k of ['WETLAND', 'BOG', 'SWAMP', 'MANGROVE', 'TUNDRA_BOG', 'POND', 'FLOODPLAIN', 'OASIS']) BIOME_ZONE[BIOME_ID[k]] = ZONE_MIRE;
for (const k of ['LAKE', 'RIVER']) BIOME_ZONE[BIOME_ID[k]] = ZONE_FRESH;
BIOME_ZONE[BIOME_ID.ALPINE_MEADOW] = ZONE_ALPINE;
const REEF_COVER = 0.2;
const THIRSTY = 0.35;
const DRINK_WET = 0.6;
const AMPH_DRINK_WET = 0.5;
const AMPH_DRY = 1.6;
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
const RES_NUDGE = 0.05;
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
const BROOD_LO = 0.6;
const BROOD_SPAN = 0.8;
const BROOD_HEAD = 0.3;
const CARE_TICKS = 70;
const CARE_DELAY = 0.4;
const CARE_MARK = 12;
const CARE_SUS = 0.4;
const CARE_GUARD = 0.35;
const CARE_FOLLOW = 0.3;
const CARE_TOP = 0.9;
const GRAN_MIN = 0.4;
const GRAN_EVERY = 10;
const JUV_SUS = 1.3;
const JUV_BUG = 0.7;
const JUV_HUNT = 0.35;
const META_AGE = 0.5;
const TAD_DIET = 0.1;
const TAD_FOOD = 1.8;
const TAD_ALGAE = 0.8;
const TAD_HIDE = 0.55;
const TAD_WANDER = 3;
const LARVA_DIET = 0.2;
const LARVA_SPEED = 0.6;
const LARVA_MAX_DIET = 0.66;
const WATER_SHED = 0.25;
const ELDER_MIG = 1.4;
const ELDER_WATER_R = 2;
const ELDER_THIRST = 0.8;
const LIFE_HIST = 120;
const LIFE_DECAY = 0.995;
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
const FOOD_GRASS = 0, FOOD_LEAF = 1, FOOD_FRUIT = 2, FOOD_SEED = 3, FOOD_BUG = 4, FOOD_MEAT = 5, FOOD_FISH = 6, FOOD_CARRION = 7, FOOD_LITTER = 8, FOOD_EGG = 9;
const FOOD_NAMES = ['grass', 'leaves', 'fruit', 'seeds', 'bugs', 'meat', 'fish', 'carrion', 'litter', 'eggs'];
const FOOD_NUTRIENTS = [
	0.15, 0.3, 0.8, 0.3,
	0.25, 0.3, 0.6, 0.35,
	0.08, 0.9, 0.2, 0.15,
	0.35, 0.7, 0.3, 0.4,
	0.8, 0.4, 0.1, 0.3,
	0.9, 0.5, 0, 0.4,
	0.85, 0.5, 0, 0.7,
	0.7, 0.4, 0, 0.4,
	0.15, 0.2, 0.9, 0.5,
	0.7, 0.5, 0, 0.9,
];
const NUT_K = 3.5;
const NUT_START = 0.7;
const DEFICIT = 0.25;
const NEED_P0 = 0.06;
const NEED_PD = 0.5;
const NEED_M = 0.24;
const NEED_JUV_P = 1.4;
const NEED_JUV_M = 1.3;
const NEED_BIRD = 1.15;
const NEED_ECTO = 0.7;
const FIBRE_K = 0.15;
const SOIL_NUT_LO = 0.5;
const SOIL_NUT_K = 0.8;
const SICK_EAT = 0.3;
const SICK_ABSORB = 0.3;
const PARA_NUT = 0.5;
const DEF_GROW = 0.4;
const DEF_FERT = 0.5;
const EGG_CA = 0.1;
const EGG_CA_MIN = 0.4;
const FAT_EFF = 0.8;
const FAT_MAX = 0.7;
const FAT_MIG = 1.5;
const FAT_BURN = 0.42;
const FAT_STORE = 0.52;
const FAT_RATE = 0.02;
const FAT_BURN_MIG = 0.75;
const FAT_COLD_T = 0.4;
const FAT_PREP_STORE = 0.5;
const FAT_PREP_BURN = 0.35;
const FAT_PREP_RATE = 2;
const APP_OVER = 0.3;
const FAT_HEAVY = 0.25;
const FAT_OBESE = 0.45;
const FAT_LEAN = 0.05;
const FAT_SLOW = 0.6;
const FAT_CATCH = 1.2;
const FAT_META = 0.5;
const FAT_INS = 0.5;
const FAT_HOT = 0.25;
const OMNI_SEEK = 0.5;
const OMNI_PROT_LURE = 2;
const OMNI_FRUIT_CUT = 0.6;
const OMNI_FRUIT_LURE = 1.6;
const OMNI_HUNT = 0.85;
const COND_EVERY = 100;
const COND_HIST = 120;
const DEF_EVENT = 0.4;
const DEF_REARM = 0.25;
const DEF_EVENT_POP = 30;
const DEF_EVENT_AGE = 300;
const MALNOURISHED_SUS = 0.5;
const FAT_SUS = 0.8;
const FOUNDER_APPETITE = 0.35;
const FOUNDER_APP_COLD = 0.2;
const FOUNDER_APP_BIRD = 0.15;
const DORM_MIN = 0.4;
const TORPOR_MIN = 0.3;
const DORM_EVERY = 5;
const DORM_T = 0.35;
const DORM_SEASON = -0.2;
const DORM_HYST = 0.06;
const DORM_FAT = 0.05;
const DORM_ECTO_E = 0.4;
const DORM_BURN = [0, 0.15, 0.08, 0.12, 0.5];
const DORM_GENE_BURN = 0.8;
const TORPOR_TICKS = 24;
const TORPOR_MASS = 0.9;
const TORPOR_E = 0.5;
const AEST_WET = 0.25;
const AEST_SEASON = 0.3;
const AEST_WATER = 0.5;
const DORM_WAKE_E = 0.3;
const DORMANT_CATCH = 1.8;
const DORM_SUS = 0.6;
const DORM_ITIME = 4;
const DORM_SICK = 0.5;
const DORM_COST = 0.05;
const DORM_EVENT = 0.5;
const DORM_REARM = 0.1;
const DORM_EVENT_POP = 20;
const DORM_NAMES = ['', 'hibernation', 'brumation', 'aestivation', 'torpor'];
const FOUNDER_DORM = [0.1, 0.5, 0.5, 0.3, 0.3, 0.45];
const FOUNDER_DORM_COLD = 0.25;

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
	{ domain: 'water', cls: CLS_FISH, n: 36, g: [0.26, 0.5, 0.5, 0.5, 0.6, 0.6, 0.7, 0.35, 0.2, 0.15, 0.3, 0.2, 0.4, 0.05, 0.3, 0.35, 0.2, 0.3, 0.3] },
	{ domain: 'water', cls: CLS_FISH, n: 30, g: [0.3, 0.5, 0.5, 0.52, 0.65, 0.5, 0.65, 0.4, 0.3, 0.15, 0.3, 0.3, 0.3, 0.05, 0.3, 0.35, 0.2, 0.4, 0.3] },
];

const FOUNDER_ALARM_BIRD = 0.55;
const FOUNDER_ALARM_PREY = 0.5;
const FOUNDER_ALARM_LO = 0.25;
const FOUNDER_SOC_MIN = 0.15;
const FOUNDER_SOC_PACK = 0.55;
const FOUNDER_SOC_COLONY = 0.75;
const FOUNDER_SOC_MID = 0.5;
const FOUNDER_SOC_LONE = 0.2;
const FOUNDER_SOC_HIVE = 0.8;
const FOUNDER_HIVE_NEST = 0.45;
const FOUNDER_PACK = 0.6;
const FOUNDER_CHOOSY = 0.55;
const FOUNDER_BROOD = [0.75, 0.7, 0.55, 0.6, 0.45, 0.75];
const FOUNDER_CARE = [0.05, 0.1, 0.15, 0.35, 0.6, 0.05];
const FOUNDER_BIG = 0.4;
const FOUNDER_BIG_BROOD = 0.3;
const FOUNDER_BIG_CARE = 0.6;
for (const a of ANIMAL_ARCHETYPES) {
	const g = a.g;
	if (a.cls === CLS_MAMM && a.domain === 'land' && g[G_DIET] > 0.66) g[G_PACK] = FOUNDER_PACK;
	if (a.cls === CLS_BIRD && !a.nic && g[G_DIET] < 0.66) g[G_CHOOSY] = FOUNDER_CHOOSY;
	g[G_APPETITE] = FOUNDER_APPETITE + (g[G_TEMP] < 0.4 ? FOUNDER_APP_COLD : 0) + (a.cls === CLS_BIRD ? FOUNDER_APP_BIRD : 0);
	g[G_DORMANCY] = FOUNDER_DORM[a.cls] + (a.cls === CLS_MAMM && g[G_TEMP] < 0.4 ? FOUNDER_DORM_COLD : 0);
	const bird = a.cls === CLS_BIRD;
	const prey = g[G_DIET] < 0.66;
	g[G_ALARM] = bird ? (prey || a.nic ? FOUNDER_ALARM_BIRD : FOUNDER_ALARM_LO) : g[G_DIET] < 0.33 && g[G_HERD] >= 0.3 && (a.cls === CLS_MAMM || g[G_SIZE] < 0.25) ? FOUNDER_ALARM_PREY + (g[G_SIZE] < 0.2 ? 0.1 : 0) : FOUNDER_ALARM_LO;
	g[G_SOCIAL] = Math.max(FOUNDER_SOC_MIN, g[G_HERD]);
	const big = a.cls === CLS_MAMM && g[G_SIZE] > FOUNDER_BIG;
	g[G_BROOD] = big ? FOUNDER_BIG_BROOD : FOUNDER_BROOD[a.cls];
	g[G_CARE] = big ? FOUNDER_BIG_CARE : FOUNDER_CARE[a.cls];
	if (a.cls === CLS_MAMM && a.domain === 'land' && !prey) g[G_SOCIAL] = FOUNDER_SOC_PACK;
	if (bird) g[G_SOCIAL] = a.nic || g[G_DIET] < 0.33 ? FOUNDER_SOC_COLONY : g[G_DIET] > 0.85 && g[G_SCAV] < 0.5 ? FOUNDER_SOC_LONE : FOUNDER_SOC_MID;
	if (a.cls === CLS_INVT && a.domain === 'land' && g[G_DIET] < 0.33) {
		g[G_SOCIAL] = FOUNDER_SOC_HIVE;
		g[G_NEST] = FOUNDER_HIVE_NEST;
	}
}
const FOUNDER_CLEAN = { 8: 0.35, 10: 0.6, 30: 0.6 };
const FOUNDER_DEPTH = { 8: 0.12, 9: 0.15, 10: 0.12, 11: 0.35, 12: 0.7, 22: 0.15, 23: 0.45, 24: 0.12, 25: 0.6, 26: 0.5, 34: 0.15, 35: 0.15 };
const FOUNDER_SALT = { 8: 0.4, 9: 1, 10: 0.7, 11: 0.5, 12: 1, 22: 0.6, 23: 1, 24: 0.6, 25: 1, 26: 1, 34: 0, 35: 1 };
const AQ_DEPTH_DEF = 0.3;
const AQ_SALT_DEF = 0.75;
const AQ_K = 0.35;
const AQ_DEPTH_W = 1.6;
const AQ_SAL_W = 0.9;
const AQ_PLACE = 0.55;
const FOUNDER_TOXIC = { 14: 0.65, 26: 0.6, 27: 0.55 };
const FOUNDER_MIMIC = { 15: 0.6, 28: 0.5 };
const FOUNDER_TRAIT_LO = 0.05;
const FOUNDER_TOLER = 0.3;
const FOUNDER_TOLER_HERB = 0.5;
const FOUNDER_BRAIN = [0.08, 0.08, 0.12, 0.25, 0.3, 0.03];
const FOUNDER_BRAIN_SP = { 5: 0.45, 6: 0.4, 7: 0.4, 13: 0.45, 23: 0.5, 30: 0.45, 32: 0.35, 33: 0.5 };
ANIMAL_ARCHETYPES.forEach((a, k) => {
	const g = a.g;
	g[G_BRAIN] = FOUNDER_BRAIN_SP[k] || FOUNDER_BRAIN[a.cls];
	g[G_CLEAN] = FOUNDER_CLEAN[k] || FOUNDER_TRAIT_LO;
	g[G_TOLER] = g[G_DIET] < 0.33 ? FOUNDER_TOLER_HERB : FOUNDER_TOLER;
	g[G_TOXIC] = FOUNDER_TOXIC[k] || FOUNDER_TRAIT_LO;
	g[G_MIMIC] = FOUNDER_MIMIC[k] || FOUNDER_TRAIT_LO;
	g[G_DEPTH] = FOUNDER_DEPTH[k] ?? AQ_DEPTH_DEF;
	g[G_SALT] = FOUNDER_SALT[k] ?? AQ_SALT_DEF;
});

function aquaMisfit(gDepth, gSalt, depth, sal) {
	const m = Math.abs(depth - gDepth) * AQ_DEPTH_W + Math.abs(sal * 0.5 - gSalt) * AQ_SAL_W;
	return m < 1 ? m : 1;
}

function padAnimalGenes(src, count) {
	if (!src || !count || src.length !== count * AG_V1) return src;
	const out = new Float32Array(count * AG);
	for (let k = 0, a = 0, b = 0; k < count; k++, a += AG_V1, b += AG) {
		for (let j = 0; j < AG_V1; j++) out[b + j] = src[a + j];
		out[b + G_DEPTH] = AQ_DEPTH_DEF;
		out[b + G_SALT] = AQ_SALT_DEF;
	}
	return out;
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

const ALARM_MIN = 0.4;
const ALARM_R = 7;
const ALARM_COOL = 20;
const ALARM_RING = 8;
const ALARM_SPOT = 0.3;
const ALARM_COST = 1;
const SOC_MIN = 0.35;
const SOC_GROUP = 14;
const SOC_PULL = 0.6;
const SOC_PUSH = 0.5;
const SOC_EYES = 0.6;
const SOC_N = 6;
const SOC_COMP = 0.01;
const SOC_COMP_CAP = 0.15;
const SOC_PACK = 0.6;
const SHUN_K = 0.5;
const SHUN_SAFE = 0.3;
const GRP_CONTACT = 0.4;
const RANK_FEED = 0.5;
const RANK_MATE = 0.8;
const RANK_SUS = 0.5;
const RANK_SICK = 0.6;
const DISP_EVERY = 20;
const DISP_N = 5;
const DISP_REL = 0.8;
const DISP_P = 0.15;
const DISP_DIST = 25;
const DISP_TICKS = 40;
const DISP_GEN = 3;
const DISP_DRIFT = 1.5;
const DISP_SPLIT_P = 0.2;
const DISP_SPLIT_POP = 20;
const COLONY_MIN = 0.6;
const COLONY_R = 1.5;
const COLONY_N = 4;
const COLONY_POP = 15;
const MOVE_ANG = [0, 0.7, -0.7, 1.4, -1.4, 2.2, -2.2];
const MOVE_COS_P = new Float64Array(MOVE_ANG.map((a) => Math.cos(a)));
const MOVE_SIN_P = new Float64Array(MOVE_ANG.map((a) => Math.sin(a)));
const MOVE_COS_N = new Float64Array(MOVE_ANG.map((a) => Math.cos(a * -1)));
const MOVE_SIN_N = new Float64Array(MOVE_ANG.map((a) => Math.sin(a * -1)));

const ANIMAL_FIELDS_F = [
	'x', 'y', 'px', 'py', 'energy', 'age', 'tx', 'ty',
	'mass', 'spd', 'range', 'plantEff', 'meatEff', 'emax', 'meta', 'mature', 'maxAge',
	'litter', 'pT', 'tol', 'toxR', 'armor', 'diet', 'bite', 'carrionEff', 'scav',
	'terr', 'herd', 'cold', 'dry', 'hr', 'water', 'hx', 'hy', 'gf', 'ef', 'oy', 'nx', 'ny',
];
const ANIMAL_FIELDS_I = ['sp', 'uid', 'cool', 'ttl', 'face', 'domain', 'cls', 'alive', 'state', 'seedSp', 'seedTtl', 'confuse', 'strain', 'itime', 'immune', 'imTime', 'natImm', 'parent', 'fly', 'nic', 'home'];
ANIMAL_FIELDS_F.push('show');
ANIMAL_FIELDS_I.push('pk', 'pn');
ANIMAL_FIELDS_F.push('fat', 'nProt', 'nMin', 'app', 'needP', 'needM');
ANIMAL_FIELDS_I.push('dorm', 'dormT');
ANIMAL_FIELDS_F.push('rnk');
ANIMAL_FIELDS_I.push('alm', 'grp', 'dsp', 'fnd');
ANIMAL_FIELDS_I.push('lv', 'brd', 'cr', 'ld');
ANIMAL_FIELDS_F.push('lk', 'pb');
ANIMAL_FIELDS_I.push('cln');
ANIMAL_FIELDS_F.push('mwx', 'mwy', 'mfx', 'mfy', 'mdx', 'mdy', 'lst', 'tl');
ANIMAL_FIELDS_I.push('lsp');

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
			if (b === BIOME_ID.HILLS || b === BIOME_ID.BADLANDS || b === BIOME_ID.MOUNTAINS || b === BIOME_ID.CLIFF || b === BIOME_ID.VOLCANIC || b === BIOME_ID.ALPINE_MEADOW) this.walk[i] |= 32;
			if (b === BIOME_ID.SALT_FLAT || b === BIOME_ID.MANGROVE) this.walk[i] |= 64;
			if (b === BIOME_ID.TUNDRA_BOG || b === BIOME_ID.BOG || b === BIOME_ID.CORAL_REEF) this.walk[i] |= 128;
		}
		this.zone = new Uint8Array(n);
		for (let i = 0; i < n; i++) this.zone[i] = BIOME_ZONE[world.biome[i]];
		this.childGenome = new Float32Array(AG);
		this.deaths = { starved: 0, eaten: 0, old: 0, poison: 0, parasite: 0, disease: 0, thirst: 0, fire: 0, flood: 0 };
		this.landDeaths = 0;
		this.weather = null;
		this.dis = null;
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
		this.caClutches = 0;
		this.fatBurned = 0;
		this.dormEntered = 0;
		this.dormStarved = 0;
		this.dormBurned = 0;
		this._packBuf = new Int32Array(PACK_MAX);
		this._mateBuf = new Int32Array(MATE_SAMPLES);
		this.alarms = 0;
		this.alarmHeard = 0;
		this.sentinel = 0;
		this.dispersals = 0;
		this.dispSplits = 0;
		this.rankBlocked = 0;
		this.eatenBy = new Float64Array(12);
		this.modelHue = new Float32Array(6).fill(-1);
		this.modelSp = new Int32Array(6);
		this.cleanerPairs = 0;
		this.mimicSp = 0;
		this.mimics = 0;
		this._cleanPref = 0;
		this._cleanRide = false;
		this.symb = { cleanings: 0, cleanFail: 0, cleanEaten: 0, cleanCarry: 0, toxHits: 0, toxSpit: 0, mimicFooled: 0, avoidSkips: 0, protectedTicks: 0 };
		this.brain = { toolUses: 0, toolGain: 0, learned: 0, fledEarly: 0, memWater: 0, memFood: 0, memDanger: 0, taught: 0 };
		this.brainMean = 0;
		this.brainCls = new Float32Array(6);
		this.learnedN = 0;
		this.toolSp = 0;
		this._learnSp = 0;
		this._learnExt = 1;
		this.life = { metamorphs: 0, careGiven: 0, granGiven: 0, granFeeds: 0, juvBug: 0, shed: 0, ledMig: 0, ledT: 0, loneT: 0, ledD: 0, loneD: 0, headStarts: 0 };
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
		this.app[i] = g[o + G_APPETITE];
		this.meta[i] *= 1 + DORM_COST * g[o + G_DORMANCY];
		this.meta[i] *= (1 + TOX_COST * g[o + G_TOXIC]) * (1 + MIMIC_COST * g[o + G_MIMIC]);
		const brain = g[o + G_BRAIN];
		this.meta[i] *= 1 + BRAIN_COST * brain * brain;
		this.mature[i] += BRAIN_MATURE * brain;
		const ck = this.cls[i];
		const ek = ck === CLS_BIRD ? NEED_BIRD : ck === CLS_REPT || ck === CLS_AMPH ? NEED_ECTO : 1;
		this.needP[i] = (NEED_P0 + NEED_PD * diet) * ek;
		this.needM[i] = NEED_M * ek;
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
		this.fat[i] = 0;
		this.nProt[i] = NUT_START;
		this.nMin[i] = NUT_START;
		this.dorm[i] = 0;
		this.dormT[i] = 0;
		this.rnk[i] = 1;
		this.alm[i] = 0;
		this.grp[i] = 1;
		this.dsp[i] = 0;
		this.fnd[i] = 0;
		this.lv[i] = 0;
		this.brd[i] = 0;
		this.cr[i] = 0;
		this.ld[i] = 0;
		this.lk[i] = this._look(sp, this.genome[o + G_MIMIC]);
		this.pb[i] = 0;
		this.cln[i] = 0;
		this.mwx[i] = this.mwy[i] = this.mfx[i] = this.mfy[i] = this.mdx[i] = this.mdy[i] = -1;
		this.lst[i] = 0;
		this.tl[i] = 0;
		this.lsp[i] = 0;
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
		sp.preyAv = parent && parent.preyAv ? parent.preyAv.map((a) => ({ hue: a.hue, cls: a.cls, sp: a.sp | 0, strength: a.strength })) : [];
		sp.cleanOf = parent && parent.cleanOf ? parent.cleanOf : 0;
		sp.cleanN = {};
		sp.cleanLogged = parent && parent.cleanLogged ? parent.cleanLogged.slice() : [];
		sp.lifeSum = 0;
		sp.lifeN = 0;
		sp.colonyAlert = false;
		sp.tools = 0;
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
		const lsp = mode === 0 ? this._learnSp : 0;
		const rr = lsp ? r * this._learnExt : r;
		const lk = lsp ? 1 / (this._learnExt * this._learnExt) : 1;
		const c0 = Math.max(0, ((x - rr) / GRID) | 0);
		const c1 = Math.min(cols - 1, ((x + rr) / GRID) | 0);
		const r0 = Math.max(0, ((y - rr) / GRID) | 0);
		const r1 = Math.min(this.grows - 1, ((y + rr) / GRID) | 0);
		const dom = this.domain[i];
		const diet = this.diet[i];
		const mass = this.mass[i] * this.gf[i];
		const sp = this.sp[i];
		const role = diet < 0.33 ? 0 : diet < 0.66 ? 1 : 2;
		const preyK = this.cls[i] === CLS_INVT ? INVERT_PREY : this.cls[i] === CLS_BIRD ? BIRD_PREY : diet > 0.66 ? 1.8 * preyMul : 0.6;
		const psp = mode === 1 ? this.registry.get(sp) : null;
		const pav = psp && psp.preyAv && psp.preyAv.length ? psp.preyAv : null;
		const fed = pav ? this.energy[i] > this.emax[i] * this.gf[i] * PREY_AV_HUNGRY : false;
		const ride = this._cleanRide;
		const pref = this._cleanPref;
		let best = -1;
		let bestD = r * r;
		const unitK = mode !== 1 && mode !== 5 && !lsp;
		const ax = this.x;
		const ay = this.y;
		for (let gy = r0; gy <= r1; gy++) {
			for (let gx = c0; gx <= c1; gx++) {
				const c = gy * cols + gx;
				for (let k = this.gstart[c], e = this.gstart[c + 1]; k < e; k++) {
					const j = this.gitems[k];
					if (j === i || !this.alive[j]) continue;
					if (unitK) {
						const qx = ax[j] - x;
						const qy = ay[j] - y;
						if (qx * qx + qy * qy >= bestD) continue;
					}
					const dj = this.domain[j];
					if (dj !== dom || dom === 3) {
						if (dj === 3 || dom === 3) {
							if (mode === 5) {
								if (dj === 3) continue;
							} else if (mode === 1) {
								if (!this._canEat(i, j)) continue;
							} else if (mode === 0) {
								if (!this._canEat(j, i)) continue;
							} else if (dj !== dom) continue;
						} else if (dj !== 2 && dom !== 2) continue;
					}
					if (this.dorm[j] && (mode === 0 || (mode === 1 && this.home[j] && Math.abs(this.x[j] - this.nx[j]) + Math.abs(this.y[j] - this.ny[j]) <= NEST_NEAR))) continue;
					if (mode === 0) {
						if (this.diet[j] - diet < 0.3 || this.meatEff[j] < 0.3 || mass > this.mass[j] * this.gf[j] * 1.8) continue;
					} else if (mode === 1) {
						if (diet - this.diet[j] < 0.3 || this.mass[j] * this.gf[j] > mass * preyK) continue;
					} else if (mode === 5) {
						if (this.sp[j] === sp || this.mass[j] * this.gf[j] < mass * CLEAN_MASS || this.dorm[j] || (dom === 1 && dj !== 1)) continue;
						if (!ride && (this.cln[j] > 0 || (this.pb[j] < CLEAN_BURDEN && !this.strain[j]))) continue;
					} else if (mode === 3) {
						const dd = this.diet[j];
						if ((dd < 0.33 ? 0 : dd < 0.66 ? 1 : 2) !== role) continue;
					} else if (this.sp[j] !== sp || (mode === 4 ? this.home[j] !== 1 && this.home[j] !== 2 : this.age[j] < this.mature[j])) continue;
					const dx = this.x[j] - x;
					const dy = this.y[j] - y;
					let dk = 1;
					if (mode === 1) {
						dk = 1 - DISPLAY_SEEN * this.show[j] - (this.alm[j] > 0 ? ALARM_SPOT : 0);
						if (pav) {
							const a = this._preyAversion(pav, this.lk[j], this.cls[j], this.sp[j]);
							if (a > PREY_AV_SKIP && fed && this.rng.next() < (a - PREY_AV_SKIP) / (1 - PREY_AV_SKIP)) {
								this.symb.avoidSkips++;
								continue;
							}
							dk *= 1 + PREY_AV_DIST * a;
						}
					} else if (lsp && this.sp[j] === lsp) dk = lk;
					else if (mode === 5 && pref && this.sp[j] === pref) dk = CLEAN_SPEC;
					const d = (dx * dx + dy * dy) * dk;
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
		const r = this.range[i] * (this.ld[i] ? ELDER_MIG : 1);
		if (this.ld[i]) this.life.ledMig++;
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
		const d = dist2d(ax, ay) || 1;
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
		const m = this.genome[i * AG + G_SOCIAL] > COLONY_MIN ? this._nearest(i, this.range[i] * COLONY_R, 4) : this._nearest(i, this.range[i], 2);
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

	_hazard(i, h, dz, Wx) {
		const flying = this.domain[i] === 3 && this.fly[i] === 1;
		const slow = 0.3 + (this.spd[i] < 1.4 ? 1 - this.spd[i] / 1.4 : 0);
		const juv = this.gf[i] < 1 ? 1.5 : 1;
		if (h === 1) {
			const wa = Wx ? Wx.windA : 0;
			if (!flying && this.rng.next() < FIRE_KILL * slow * juv * (this.dorm[i] ? 3 : 1)) {
				this.deaths.fire++;
				dz.killed++;
				this._kill(i);
				return true;
			}
			this._flee(i, this.x[i] + Math.cos(wa), this.y[i] + Math.sin(wa));
			return false;
		}
		if (this.domain[i] !== 0) return false;
		if (this.rng.next() < FLOOD_DROWN * slow * juv * (this.dorm[i] ? 2 : 1)) {
			this.deaths.flood++;
			dz.drowned++;
			this._kill(i);
			return true;
		}
		this._flee(i, dz.floodX, dz.floodY);
		return false;
	}

	_flee(i, fx, fy) {
		const ax = this.x[i] - fx;
		const ay = this.y[i] - fy;
		const d = dist2d(ax, ay) || 1;
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
					const r = ((give * FEED_EFF) / (this.emax[j] * this.gf[j])) * NUT_K;
					const fp = this.nProt[j] + r * this.nProt[i];
					const fm = this.nMin[j] + r * this.nMin[i];
					this.nProt[j] = fp < 1 ? fp : 1;
					this.nMin[j] = fm < 1 ? fm : 1;
					spare -= give;
					if (spare <= 0) return;
				}
			}
		}
	}

	_hatch(j, tile, par) {
		const o = j * AG;
		const b = this.genome[o + G_BROOD];
		if (b < 0.5) {
			this.age[j] = Math.round(this.mature[j] * BROOD_HEAD * (0.5 - b) * 2);
			this._stage(j);
			this.life.headStarts++;
		}
		const c = this.cls[j];
		if (this.age[j] < this.mature[j] * META_AGE) {
			if (c === CLS_AMPH && tile >= 0 && (this.walk[tile] & 6) === 6) {
				this.lv[j] = 1;
				this.domain[j] = 1;
				this._larvaDiet(j, TAD_DIET);
			} else if (c === CLS_INVT && this.domain[j] === 0 && this.diet[j] < LARVA_MAX_DIET) {
				this.lv[j] = 2;
				this._larvaDiet(j, LARVA_DIET);
				this.spd[j] *= LARVA_SPEED;
			}
		}
		if (par && this.genome[o + G_CARE] > CARE_FOLLOW) this.parent[j] = par;
	}

	_larvaDiet(j, d) {
		this.diet[j] = d;
		this.plantEff[j] = 1 - d * d;
		this.meatEff[j] = Math.pow(d, 1.2);
		this.carrionEff[j] = this.meatEff[j] * (0.2 + 0.8 * this.scav[j]);
	}

	_metamorph(i) {
		const sp = this.registry.get(this.sp[i]);
		if (this.lv[i] === 1) {
			this.domain[i] = domainIndex(sp ? sp.domain : 'amph');
			this.life.metamorphs++;
		}
		this.lv[i] = 0;
		this._decode(i);
		this.state[i] = 0;
		this.ttl[i] = 0;
	}

	_care(i, gran) {
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
		const R2 = FEED_R * FEED_R;
		let fed = 0;
		for (let gy = r0; gy <= r1; gy++) {
			for (let gx = c0; gx <= c1; gx++) {
				const c = gy * cols + gx;
				for (let k = this.gstart[c], e = this.gstart[c + 1]; k < e; k++) {
					const j = this.gitems[k];
					if (j === i || !this.alive[j] || this.gf[j] >= 1 || this.sp[j] !== sp || (!gran && this.parent[j] !== uid)) continue;
					const dx = this.x[j] - x;
					const dy = this.y[j] - y;
					if (dx * dx + dy * dy > R2) continue;
					this.cr[j] = CARE_MARK;
					this._teach(i, j, TEACH_CARE);
					const need = this.emax[j] * this.gf[j] * CARE_TOP - this.energy[j];
					if (need <= 0) continue;
					const give = need < spare ? need : spare;
					this.energy[j] += give * FEED_EFF;
					this.energy[i] -= give;
					const r = ((give * FEED_EFF) / (this.emax[j] * this.gf[j])) * NUT_K;
					const fp = this.nProt[j] + r * this.nProt[i];
					const fm = this.nMin[j] + r * this.nMin[i];
					this.nProt[j] = fp < 1 ? fp : 1;
					this.nMin[j] = fm < 1 ? fm : 1;
					fed += give;
					spare -= give;
					if (spare <= 0) break;
				}
				if (spare <= 0) break;
			}
			if (spare <= 0) break;
		}
		if (gran) {
			this.life.granGiven += fed;
			if (fed > 0) this.life.granFeeds++;
		} else this.life.careGiven += fed;
	}

	_thirstDeath(i) {
		this.deaths.thirst++;
		if (this.weather && this.weather.drought && this.cls[i] === CLS_MAMM && this.herd[i] > HERD_MIN) {
			if (this.ld[i]) this.life.ledD++;
			else this.life.loneD++;
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
		const led = this.ld[i] && this.cls[i] === CLS_MAMM ? ELDER_WATER_R : 1;
		const r = Math.max(6, this.range[i] * 1.5) * led;
		let bestScore = -1e9;
		let bx = this.x[i];
		let by = this.y[i];
		for (let s = 0, ns = WATER_SAMPLES * led; s < ns; s++) {
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
		const mx = this.mwx[i];
		if (mx >= 0) {
			const my = this.mwy[i];
			const mt = (my | 0) * W + (mx | 0);
			if (wd[mt] > MEM_WATER_OK) {
				this.mwx[i] = this.mwy[i] = -1;
			} else if (this.rng.next() < MEM_USE * this.genome[i * AG + G_BRAIN] && dist2d(mx - this.x[i], my - this.y[i]) < MEM_FAR) {
				this.brain.memWater++;
				this.tx[i] = mx;
				this.ty[i] = my;
				this.ttl[i] = 12;
				return;
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
				const d = dist2d((gx + 0.5) * GRID - x, (gy + 0.5) * GRID - y);
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
		const d = dist2d(dx, dy);
		if (d < 1e-4) return 0;
		const sk = this.strain[i];
		let v = (sk ? this.spd[i] * (1 - SICK_SLOW * this.disease.sVir[sk]) : this.spd[i]) * this.ef[i];
		if (this.fat[i] > 0) v *= 1 - FAT_SLOW * this._heavy(i);
		const cold = this.cold[i];
		if (cold > 0) {
			const et = this.world.temperature[(y | 0) * this.world.width + (x | 0)] + (this.weather ? this.weather.seasonT : 0);
			if (et < 0.5) v *= 1 - COLD_SLOW * cold * (0.5 - et) * 2;
		}
		const tad = this.lv[i] === 1;
		if (!tad && this.domain[i] === 0) {
			const t0 = (y | 0) * this.world.width + (x | 0);
			const zn = this.zone[t0];
			if (zn === ZONE_DENSE || this.walk[t0] & 128) {
				const sz = this.genome[i * AG + G_SIZE];
				if (this.walk[t0] & 128) v *= 1 - MIRE_DRAG * (0.4 + sz);
				else if (sz > FOREST_FREE) v *= 1 - FOREST_SLOW * (sz - FOREST_FREE);
			}
		}
		const step = Math.min(d, v * frac);
		dx /= d;
		dy /= d;
		const dom = tad ? 2 : this.domain[i];
		const W = this.world.width;
		const pos = this.rng.next() < 0.5;
		const COS = pos ? MOVE_COS_P : MOVE_COS_N;
		const SIN = pos ? MOVE_SIN_P : MOVE_SIN_N;
		for (let a = 0; a < 7; a++) {
			const cs = COS[a];
			const sn = SIN[a];
			const mx = dx * cs - dy * sn;
			const my = dx * sn + dy * cs;
			const nx = x + mx * step;
			const ny = y + my * step;
			if (this.canStand(dom, nx, ny) && (!tad || this.walk[(ny | 0) * W + (nx | 0)] & 2)) {
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

	_disperse(i) {
		const dom = this.domain[i];
		for (let k = 0; k < 3; k++) {
			const a = this.rng.next() * Math.PI * 2;
			const tx = this.x[i] + Math.cos(a) * DISP_DIST;
			const ty = this.y[i] + Math.sin(a) * DISP_DIST;
			if (!this.canStand(dom, tx, ty)) continue;
			this.tx[i] = tx;
			this.ty[i] = ty;
			this.dsp[i] = DISP_TICKS;
			this.state[i] = 8;
			this.dispersals++;
			return true;
		}
		return false;
	}

	_alarm(i, t) {
		this.alm[i] = ALARM_COOL;
		this.alarms++;
		this.energy[i] -= this.meta[i] * this.gf[i] * ALARM_COST;
		const x = this.x[i];
		const y = this.y[i];
		const fx = this.x[t];
		const fy = this.y[t];
		const mt = this.mass[t] * this.gf[t] * 1.8;
		const dt = this.diet[t];
		const bird = this.cls[i] === CLS_BIRD;
		const cls = this.cls[i];
		const sp = this.sp[i];
		const R2 = ALARM_R * ALARM_R;
		const cols = this.gcols;
		const c0 = Math.max(0, ((x - ALARM_R) / GRID) | 0);
		const c1 = Math.min(cols - 1, ((x + ALARM_R) / GRID) | 0);
		const r0 = Math.max(0, ((y - ALARM_R) / GRID) | 0);
		const r1 = Math.min(this.grows - 1, ((y + ALARM_R) / GRID) | 0);
		for (let gy = r0; gy <= r1; gy++) {
			for (let gx = c0; gx <= c1; gx++) {
				const c = gy * cols + gx;
				for (let k = this.gstart[c], e = this.gstart[c + 1]; k < e; k++) {
					const j = this.gitems[k];
					if (j === i || j === t || !this.alive[j] || this.dorm[j] || this.state[j] === 4 || this.diet[j] >= 0.7) continue;
					if (this.sp[j] !== sp) {
						if (!bird || this.domain[j] === 1 || dt - this.diet[j] < 0.3 || this.mass[j] * this.gf[j] > mt) continue;
					}
					const dx = this.x[j] - x;
					const dy = this.y[j] - y;
					if (dx * dx + dy * dy > R2) continue;
					this._flee(j, fx, fy);
					this.alarmHeard++;
					if (this.cls[j] !== cls) this.sentinel++;
				}
			}
		}
	}

	_heavy(i) {
		const h = this.fat[i] / (this.emax[i] * this.gf[i]) - FAT_HEAVY;
		return h > 0 ? (h < 1 ? h : 1) : 0;
	}

	_sus(i) {
		return (this._deficient(i) ? 1 + MALNOURISHED_SUS : 1) * (this.fat[i] > 0 ? 1 + FAT_SUS * this._heavy(i) : 1) * (this.dorm[i] ? 1 + DORM_SUS : 1) * (this.grp[i] > 1 && this.rnk[i] < 1 ? 1 + RANK_SUS * (1 - this.rnk[i]) : 1) * (this.gf[i] < 1 ? JUV_SUS * (this.cr[i] > 0 ? 1 - CARE_SUS : 1) : 1);
	}

	_dormWant(i, tile, et, Wx, e, em0) {
		const dom = this.domain[i];
		if (dom === 1) return 0;
		const g = this.genome[i * AG + G_DORMANCY];
		const c = this.cls[i];
		const land = c === CLS_INVT && dom === 0;
		if (g > DORM_MIN && Wx.season < DORM_SEASON && et < DORM_T) {
			if (c === CLS_MAMM && this.fat[i] > DORM_FAT * em0) return 1;
			if ((c === CLS_REPT || c === CLS_AMPH || land) && (this.fat[i] > DORM_FAT * em0 * 0.2 || e > DORM_ECTO_E * em0)) return 2;
		}
		if (g > DORM_MIN && (c === CLS_AMPH || (land && this.diet[i] < 0.5) || (this.zone[tile] === ZONE_ARID && (c === CLS_REPT || (c === CLS_MAMM && this.mass[i] < AEST_MAMM_MASS)))) && (Wx.drought || Wx.season > AEST_SEASON) && Wx.wet[tile] < AEST_WET && Wx.waterDist[tile] > 1 && this.water[i] < AEST_WATER) return 3;
		if (g > TORPOR_MIN && (c === CLS_BIRD || c === CLS_MAMM) && this.mass[i] * this.gf[i] < TORPOR_MASS && et < this.pT[i] - this.tol[i] && e < TORPOR_E * em0) return 4;
		return 0;
	}

	_dormEnter(i, k) {
		this.dorm[i] = k;
		this.dormT[i] = 0;
		this.state[i] = 0;
		this.ttl[i] = 0;
		this.dormEntered++;
	}

	_dormWake(i) {
		this.dorm[i] = 0;
		this.dormT[i] = -TORPOR_TICKS;
		this.state[i] = 0;
		this.ttl[i] = 0;
	}

	_dormStep(i, tile, et, Wx, D) {
		const k = this.dorm[i];
		const gf = this.gf[i];
		const em = this.emax[i] * gf;
		const dt = ++this.dormT[i];
		let wake = !Wx;
		if (!wake) {
			if (k === 4) wake = dt >= TORPOR_TICKS;
			else if (k === 3) wake = (!Wx.drought && Wx.season <= AEST_SEASON) || Wx.wet[tile] >= AEST_WET + DORM_HYST;
			else wake = Wx.season >= 0 || et >= DORM_T + DORM_HYST;
		}
		if (!wake && this.fat[i] <= 0 && this.energy[i] < DORM_WAKE_E * em) {
			wake = true;
			if (k !== 4) this.dormStarved++;
		}
		if (wake) {
			this._dormWake(i);
			return false;
		}
		const m75 = this.meta[i] * gf;
		let cost = m75 * DORM_BURN[k] * (1.4 - DORM_GENE_BURN * this.genome[i * AG + G_DORMANCY]);
		let sickDead = 0;
		if (D) {
			const s = this.strain[i];
			if (this.imTime[i] > 0) this.imTime[i]--;
			if (s) {
				const vir = D.sVir[s];
				cost += SICK_COST * DORM_SICK * vir * m75;
				if (this.rng.next() < SICK_DEATH * DORM_SICK * vir * (1 - RES_EFFECT * this.genome[i * AG + G_RES])) sickDead = s;
				else if (dt % DORM_ITIME === 0 && --this.itime[i] <= 0) D.recoverAnimal(i);
				else if (((this.tick + i) & 1) === 0 && this.home[i] && dist2d(this.x[i] - this.nx[i], this.y[i] - this.ny[i]) <= NEST_NEAR) this._denContact(i, s);
			}
		}
		let en = this.energy[i] - cost;
		const fat = this.fat[i];
		const lo = em * FAT_BURN;
		if (en < lo && fat > 0) {
			const take = lo - en < fat ? lo - en : fat;
			en += take;
			this.fat[i] = fat - take;
			this.fatBurned += take;
		}
		this.energy[i] = en;
		this.dormBurned += cost;
		if (sickDead) {
			D.countDeath(sickDead);
			this._kill(i);
			this.deaths.disease++;
			return true;
		}
		if (en <= 0) {
			this._kill(i);
			this.deaths.starved++;
			return true;
		}
		const ar = this.age[i] / this.maxAge[i];
		if (ar > OLD_START && this.rng.next() < OLD_P * Math.exp(OLD_K * (ar - OLD_START))) {
			this._kill(i);
			this.deaths.old++;
		}
		return true;
	}

	_deficient(i) {
		return this.nProt[i] < DEFICIT || this.nMin[i] < DEFICIT;
	}

	_eat(i, g, f, sk) {
		if (!(g > 0)) return 0;
		const o = f * 4;
		const fn = FOOD_NUTRIENTS;
		const gain = g * (1 - FIBRE_K * fn[o + 2] * this.diet[i]);
		const r = (gain / (this.emax[i] * this.gf[i])) * NUT_K * (sk ? 1 - SICK_ABSORB * this.disease.sVir[sk] : 1);
		let soil = 1;
		if (f === FOOD_GRASS || f === FOOD_LEAF || f === FOOD_SEED) {
			const nu = this.plants.soil.nutrient[(this.y[i] | 0) * this.world.width + (this.x[i] | 0)];
			soil = SOIL_NUT_LO + SOIL_NUT_K * (nu < SOIL_MAX ? nu / SOIL_MAX : 1);
		}
		const p = this.nProt[i] + r * fn[o] * soil;
		const m = this.nMin[i] + r * fn[o + 3] * soil;
		this.nProt[i] = p < 1 ? p : 1;
		this.nMin[i] = m < 1 ? m : 1;
		return gain;
	}

	_bugEff(i) {
		if (this.mass[i] * this.gf[i] >= BUG_MASS) return 0;
		const diet = this.diet[i];
		if (this.cls[i] === CLS_INVT && !this.domain[i] && diet >= 0.5) return INVERT_BUG;
		if (diet >= BUG_DIET_MAX) return this.gf[i] < 1 ? JUV_BUG : 0;
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
		const od = this.diet[i];
		const omni = od >= 0.33 && od < 0.66;
		const protShort = omni && this.nProt[i] < OMNI_SEEK;
		const pk = protShort ? OMNI_PROT_LURE : 1;
		const fk = protShort ? OMNI_FRUIT_CUT : omni && this.energy[i] < this.emax[i] * this.gf[i] * FAT_BURN ? OMNI_FRUIT_LURE : 1;
		const bugEff = bugs ? this._bugEff(i) * BUG_LURE * pk : 0;
		const carrion = plants.soil.carrion;
		const carrionLure = this.carrionEff[i] * CARRION_LURE * (1 + SCAV_LURE * this.scav[i]) * pk;
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
					if (fr > 0) food += fr * FRUIT_LURE * fk * (0.6 + plants.genome[j * PG + 9]);
				}
				if (av && plants.kind[pn + j] && plants.species[pn + j]) food *= 1 - this._aversion(av, plants.hue[pn + j]);
			}
			if (bugEff > 0) food += bugs.edibleAt(j) * bugEff;
			if (land && carrion[j] > 0) food += carrion[j] * carrionLure;
			if (land && eggHead && eggHead[j] >= 0) food += EGG_LURE * pk;
			const clim = this._clim(i, temp[j]);
			const dist = dist2d(tx - this.x[i], ty - this.y[i]);
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
					const dist = dist2d(tx - this.x[i], ty - this.y[i]);
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
		if (bestScore > MEM_GOOD) {
			this.mfx[i] = bx;
			this.mfy[i] = by;
		} else if (bestScore < MEM_LOW && this.mfx[i] >= 0) {
			const fx = this.mfx[i];
			const fy = this.mfy[i];
			if (this.rng.next() < MEM_USE * this.genome[i * AG + G_BRAIN] && dist2d(fx - this.x[i], fy - this.y[i]) < MEM_FAR) {
				this.brain.memFood++;
				bx = fx;
				by = fy;
				bestScore = MEM_LOW;
				this.mfx[i] = this.mfy[i] = -1;
			}
		}
		if (bird && bestScore < 0) {
			bx = Math.min(W - 1, Math.max(0, this.x[i] + (this.rng.next() * 2 - 1) * r * 3));
			by = Math.min(H - 1, Math.max(0, this.y[i] + my + (this.rng.next() * 2 - 1) * r * 3));
		}
		if (this.mdx[i] >= 0 && dist2d(bx - this.mdx[i], by - this.mdy[i]) < DANGER_R && this.rng.next() < MEM_USE * this.genome[i * AG + G_BRAIN]) {
			const ax = 2 * this.x[i] - bx;
			const ay = 2 * this.y[i] - by;
			if (this.canStand(dom, ax, ay)) {
				bx = ax;
				by = ay;
				this.brain.memDanger++;
			}
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
		const soc = this.genome[i * AG + G_SOCIAL];
		if (!this.dsp[i] && (herd > HERD_MIN || soc > SOC_MIN) && this._localCount(i) > 1) {
			const pref = 1 + SOC_GROUP * soc * soc;
			const gn = this.grp[i];
			let k = herd > HERD_MIN ? HERD_PULL * herd : 0;
			if (soc > SOC_MIN) {
				if (gn < pref) k = k > SOC_PULL * soc ? k : SOC_PULL * soc;
				else if (gn > pref * 1.5 + 1) k = -SOC_PUSH;
			}
			const hx = bx + (this._cx - bx) * k;
			const hy = by + (this._cy - by) * k;
			if (k !== 0 && this.canStand(dom, hx, hy)) {
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
			const e = dist2d(ex, ey);
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
		const zone = this.zone;
		const parasiteLoad = this.parasiteLoad;
		const D = this.disease && this.disease.on ? this.disease : null;
		const soil = plants.soil;
		const carrion = soil.carrion;
		const Wx = this.weather;
		const seasonT = Wx ? Wx.seasonT : 0;
		const droughtK = Wx && Wx.drought ? 0.4 : 0;
		const eggs = this.eggs;
		const dz = this.dis && this.dis.on ? this.dis : null;
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
			if (this.age[i] >= this.mature[i] || (tick + i) % 5 >= 5 * DEF_GROW || !this._deficient(i)) this.age[i]++;
			this._stage(i);
			if (this.lv[i] && this.age[i] >= this.mature[i] * META_AGE) this._metamorph(i);
			if (this.cr[i] > 0) this.cr[i]--;
			const gf = this.gf[i];
			const ef = this.ef[i];
			if (this.cool[i] > 0) this.cool[i]--;
			const tile = (this.y[i] | 0) * W + (this.x[i] | 0);
			if (dz && dz.haz[tile] && this.domain[i] !== 1 && this._hazard(i, dz.haz[tile], dz, Wx)) continue;
			if (this.dorm[i] && this._dormStep(i, tile, temp[tile] + seasonT, Wx, D)) {
				if (this.hx[i] >= 0 && this.terr[i] > TERR_MIN) holders++;
				continue;
			}
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
				const herdM = Wx.drought && this.cls[i] === CLS_MAMM && this.herd[i] > HERD_MIN;
				if (herdM) {
					if (this.ld[i]) this.life.ledT++;
					else this.life.loneT++;
				}
				let wv = this.water[i];
				if (Wx.waterDist[tile] <= 1 || Wx.wet[tile] > (amph || inv ? AMPH_DRINK_WET : DRINK_WET)) {
					if (wv < MEM_WATER_REC) {
						this.mwx[i] = this.x[i];
						this.mwy[i] = this.y[i];
					}
					wv = 1;
				}
				else {
					wv -= THIRST * (1 - 0.6 * this.dry[i]) * (0.6 + temp[tile] + seasonT - Wx.cool[tile] + droughtK) * (this.cold[i] > 0.5 ? 0.6 : 1) * (amph ? AMPH_DRY : 1) * (inv ? INVERT_THIRST : 1) * (herdM && this.ld[i] ? ELDER_THIRST : 1) * (this.walk[tile] & 64 ? 1 + ((amph ? SALT_THIRST_AMPH : SALT_THIRST) - 1) * (1 - 0.7 * this.dry[i]) : 1);
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
				hd = dist2d(this.x[i] - this.nx[i], this.y[i] - this.ny[i]);
				if ((hk === 3 && this.age[i] > this.mature[i]) || hd > NEST_FAR || (away && hk !== 3)) hk = this._dropHome(i);
			} else if (ng > NEST_MIN && (tick + i) % NEST_EVERY === 0 && this.age[i] > this.mature[i] && !thirsty && !away && this.state[i] !== 4) {
				hk = this._pickHome(i);
				if (hk) hd = dist2d(this.x[i] - this.nx[i], this.y[i] - this.ny[i]);
			}
			const ntile = hk ? (this.ny[i] | 0) * W + (this.nx[i] | 0) : -1;
			const atHome = hk > 0 && hd <= NEST_NEAR;
			const homeR = hk ? this._homeR(i) : 0;
			if (homeR === GUARD_R && hk === 1) eggs.guard(ntile, this.mass[i] * gf * (0.5 + ng), tick);
			if (hk && hk !== 3) {
				if (atHome && bugs && parasiteLoad[ntile] > 0) bugs.clean(ntile, CLEAN_K * ng);
				if ((tick + i) % FEED_EVERY === 0) this._feedYoung(i);
			}
			if (this.brd[i] > 0) {
				this.brd[i]--;
				if ((tick + i) % FEED_EVERY === 0) this._care(i, 0);
			} else if ((tick + i) % GRAN_EVERY === 0 && this.age[i] > this.maxAge[i] * ELDER_FERTILE && this.genome[i * AG + G_CARE] > GRAN_MIN) this._care(i, 1);
			const shelter = hk === 3 && atHome ? 1 - DEN_SHELTER * ng : 1;
			const homeK = this._homeK(i);
			if (homeK > 0 && ((tick + i) & 1) === 1) this._chaseRival(i);
			const sk0 = this.strain[i];
			const gq = this.grp[i] - 1;
			const rk = 2 - this.rnk[i];
			const comp = gq > 0 ? 1 - (SOC_COMP * gq < SOC_COMP_CAP ? SOC_COMP * gq : SOC_COMP_CAP) * (rk < 0.25 ? 0.25 : rk > 1.75 ? 1.75 : rk) : 1;
			const bite = comp * this.bite[i] * gf * ef * (1 + TERR_BITE * homeK) * (dom === 3 ? BIRD_BITE : 1) * (sk0 ? 1 - SICK_EAT * this.disease.sVir[sk0] : 1);
			const fat = this.fat[i];
			const em0 = this.emax[i] * gf;
			let climK = 1;
			if (fat > 0) {
				const fi = fat < em0 * FAT_HEAVY ? fat / (em0 * FAT_HEAVY) : 1;
				climK = temp[tile] + seasonT < this.pT[i] ? 1 - FAT_INS * fi : 1 + FAT_HOT * fi;
			}
			let cost = m75 * (1 + 1.3 * (1 - clim) * shelter * climK) * (flying ? FLY_META : 1);
			if (fat > em0 * FAT_HEAVY) cost *= 1 + FAT_META * this._heavy(i);
			if (this.cold[i] > 0.5) {
				const et = temp[tile] + seasonT;
				if (et < 0.5) cost += m75 * COLD_UPKEEP * (0.5 - et) * 2 * shelter;
			} else if (dom === 0) {
				const et = temp[tile] + seasonT;
				if (et < BERG_T) cost += m75 * BERG_K * ((BERG_T - et) / BERG_T) * (1 - this.genome[i * AG + G_SIZE]) * shelter;
			}
			const zn = zone[tile];
			if (zn === ZONE_ARID && dom === 0) cost += m75 * ARID_K * (ARID_BASE + ARID_SIZE * this.genome[i * AG + G_SIZE]) * (1 - this.dry[i]) * (this.cold[i] > 0.5 ? ARID_ECTO : 1) * shelter;
			else if (zn === ZONE_ALPINE && dom === 0) cost += m75 * ALPINE_AIR_K * this.genome[i * AG + G_SIZE] * shelter;
			else if (dom === 2 && zn >= ZONE_MIRE) cost *= 1 - (zn === ZONE_MIRE ? AMPH_MIRE : AMPH_FRESH) * (1 - 0.5 * this.dry[i]);
			if (dom === 1) cost += m75 * AQ_K * aquaMisfit(this.genome[i * AG + G_DEPTH], this.genome[i * AG + G_SALT], plants.depth[tile], plants.sal[tile]);
			if (!flying) {
				const lw = tileLoad[tile] + ((this.mass[i] * TILE_LOAD_SCALE + 0.5) | 0);
				tileLoad[tile] = lw < 65535 ? lw : 65535;
			}
			let drain = 0;
			const emax = em0;
			const e = this.energy[i];
			const mig = dom === 3 && temp[tile] - SEASON_T < this.pT[i];
			const prep = mig || temp[tile] < FAT_COLD_T;
			const fatCap = emax * FAT_MAX * this.app[i] * (prep ? FAT_MIG : 1);
			const full = fat < fatCap ? emax * (1 + APP_OVER * this.app[i]) : emax;
			const protShort = dg >= 0.33 && dg < 0.66 && this.nProt[i] < OMNI_SEEK;
			const landScav = !dom && this.scav[i] > 0.5 && this.diet[i] >= 0.33;
			let moved = 0;
			let acted = false;
			let poisonDead = false;
			if (this.seedTtl[i] > 0 && --this.seedTtl[i] === 0) this._dropSeed(i, tile, tick);

			if (this.dormT[i] < 0) this.dormT[i]++;
			else if (Wx && !flying && this.state[i] !== 4 && this.confuse[i] === 0 && (this.state[i] === 7 || (tick + i) % DORM_EVERY === 0)) {
				const dk = this._dormWant(i, tile, temp[tile] + seasonT, Wx, e, em0);
				if (dk) {
					if (dk < 3 && hk && hd > NEST_NEAR) moved = this._moveToward(i, this.nx[i], this.ny[i], 1);
					if (moved > 0) this.state[i] = 7;
					else this._dormEnter(i, dk);
					acted = true;
				} else if (this.state[i] === 7) this.state[i] = 0;
			}

			if (!acted && this.confuse[i] > 0) {
				this.confuse[i]--;
				const ang = rng.next() * Math.PI * 2;
				moved = this._moveToward(i, this.x[i] + Math.cos(ang) * 3, this.y[i] + Math.sin(ang) * 3, 0.8);
				this.state[i] = 0;
				this.ttl[i] = 0;
				acted = true;
			}

			if (!acted && this.diet[i] < 0.7 && (tick + i) % 2 === 0 && rng.next() < 0.7) {
				const gq = this.grp[i] - 1;
				const eyes = this.strain[i] || gq <= 0 ? 1 : 1 + SOC_EYES * this.genome[i * AG + G_SOCIAL] * (gq < SOC_N ? gq / SOC_N : 1);
				const fr = this.range[i] * 0.8 * eyes;
				const ls = this.lst[i];
				if (ls > 0) {
					this._learnSp = this.lsp[i];
					this._learnExt = 1 + LEARN_RANGE * ls * this.genome[i * AG + G_BRAIN];
				}
				const t = this._nearest(i, fr, 0);
				this._learnSp = 0;
				if (t >= 0) {
					if (ls > 0 && this.sp[t] === this.lsp[i] && dist2d(this.x[t] - this.x[i], this.y[t] - this.y[i]) > fr) this.brain.fledEarly++;
					const ax = this.x[i] - this.x[t];
					const ay = this.y[i] - this.y[t];
					const d = dist2d(ax, ay) || 1;
					this.tx[i] = this.x[i] + (ax / d) * 6;
					this.ty[i] = this.y[i] + (ay / d) * 6;
					this.ttl[i] = 3;
					this.state[i] = 4;
					const al = this.genome[i * AG + G_ALARM];
					if (al > ALARM_MIN && this.alm[i] === 0 && rng.next() < al) this._alarm(i, t);
				}
			}
			if (!acted && this.state[i] === 4 && this.ttl[i] > 0) {
				moved = this._moveToward(i, this.tx[i], this.ty[i], 1.1);
				this.ttl[i]--;
				if (this.ttl[i] <= 0) this.state[i] = 0;
				if (this.dsp[i]) this.dsp[i] = 0;
				acted = true;
			}

			if (this.lv[i] === 1) {
				if (!acted) {
					if (this.ttl[i] <= 0 || this.state[i] !== 1) {
						this.tx[i] = this.x[i] + (rng.next() * 2 - 1) * TAD_WANDER;
						this.ty[i] = this.y[i] + (rng.next() * 2 - 1) * TAD_WANDER;
						this.ttl[i] = 4 + ((rng.next() * 4) | 0);
					}
					this.state[i] = 1;
					moved = this._moveToward(i, this.tx[i], this.ty[i], 0.5);
					this.ttl[i]--;
					acted = true;
				}
				if (this.walk[tile] & 2 && this.energy[i] < full) this.energy[i] += this._eat(i, m75 * TAD_FOOD * this._algae(tile), FOOD_LEAF, sk0);
			}

			if (!acted && this.dsp[i] > 0) {
				if (thirsty) this.dsp[i] = 0;
				else {
					moved = this._moveToward(i, this.tx[i], this.ty[i], 1);
					const dd = dist2d(this.tx[i] - this.x[i], this.ty[i] - this.y[i]);
					if (--this.dsp[i] <= 0 || dd < 1.5 || moved <= 0) {
						this.dsp[i] = 0;
						this.fnd[i] = DISP_GEN;
						this.state[i] = 0;
						this.ttl[i] = 0;
					} else this.state[i] = 8;
					acted = true;
				}
			} else if (!acted && !thirsty && (tick + i) % DISP_EVERY === 0 && hk === 0 && this.hx[i] < 0 && this.pn[i] < 2 && this.age[i] > this.mature[i] && this.rnk[i] < DISP_REL) {
				const sc = this.genome[i * AG + G_SOCIAL];
				const pref = 1 + SOC_GROUP * sc * sc;
				if (this.grp[i] > (pref > DISP_N ? pref : DISP_N) && rng.next() < DISP_P && this._disperse(i)) {
					moved = this._moveToward(i, this.tx[i], this.ty[i], 1);
					acted = true;
				}
			}

			if (!acted && this.pn[i] > 1 && this.cool[i] === 0 && e < emax * PACK_JOIN) {
				const r = this._pr[i];
				const p = this._pt[r];
				if (p >= 0 && this.alive[p]) {
					if (this.state[i] !== 3) this.ttl[i] = 18;
					this.state[i] = 3;
					const d0 = dist2d(this.x[p] - this.x[i], this.y[p] - this.y[i]);
					moved = this._moveToward(i, this.x[p], this.y[p], (d0 < 4 ? PACK_PACE : 1) * (1 - (PACK_SICK_SLOW * this._pv[r]) / this.pn[i]));
					const d = dist2d(this.x[p] - this.x[i], this.y[p] - this.y[i]);
					if (d < 1) this._attack(i, p, tile, tick);
					else if (--this.ttl[i] <= 0) {
						this.cool[i] = 10;
						this.state[i] = 0;
					}
					acted = true;
				}
			}

			if (!acted && !thirsty && this.cool[i] === 0 && e < full * CLEAN_HUNGRY && this.genome[i * AG + G_CLEAN] > CLEAN_MIN && (dom === 1 || (dom === 3 && dg < 0.66 && !this.nic[i])) && this.age[i] >= this.mature[i] * JUV_HUNT && (this.state[i] >= 9 || (tick + i) % CLEAN_EVERY === 0)) {
				const cm = this._cleanStep(i, tick);
				if (!this.alive[i]) continue;
				if (cm >= 0) {
					moved = cm;
					acted = true;
				}
			}

			if (!acted && this.meatEff[i] > 0.25 && e < emax * (this.scav[i] > 0.5 ? SCAV_HUNT : this.nic[i] ? FISHER_HUNT : protShort ? OMNI_HUNT : 0.6) && this.cool[i] === 0 && this.age[i] >= this.mature[i] * JUV_HUNT) {
				const p = this._nearest(i, this.nic[i] ? this.range[i] * FISHER_RANGE : this.range[i], 1);
				if (p >= 0) {
					if (this.state[i] !== 3) this.ttl[i] = 18;
					this.state[i] = 3;
					const d0 = dist2d(this.x[p] - this.x[i], this.y[p] - this.y[i]);
					moved = this._moveToward(i, this.x[p], this.y[p], d0 < 4 ? 1.6 : 1);
					const d = dist2d(this.x[p] - this.x[i], this.y[p] - this.y[i]);
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
				if (p >= 0 && dist2d(this.x[p] - this.x[i], this.y[p] - this.y[i]) > 1.5) {
					moved = this._moveToward(i, this.x[p], this.y[p], 1);
					this.state[i] = 0;
					acted = true;
				}
			}

			if (eggs && (dg >= 0.33 || dom === 1) && this.energy[i] < full && eggs.head[tile] >= 0) {
				const got = eggs.eatAt(tile, dom !== 1, this.sp[i], (full - this.energy[i]) / EGG_FOOD, this.mass[i] * gf, tick);
				if (got > 0) this.energy[i] += this._eat(i, got * EGG_FOOD, FOOD_EGG, sk0);
				else if (got < 0 && !acted) this._flee(i, (tile % W) + 0.5, (tile - (tile % W)) / W + 0.5);
			}

			if (!acted && this.scav[i] > 0.5 && e < full * 0.92 && !(carrion[tile] > 0)) {
				if ((this.ttl[i] <= 0 || this.state[i] !== 2) && !this._pickCarrion(i)) this._pickForage(i);
				this.state[i] = 2;
				if (carrion[(this.ty[i] | 0) * W + (this.tx[i] | 0)] > 0) {
					moved = this._moveToward(i, this.tx[i], this.ty[i], 1);
					this.ttl[i]--;
					acted = true;
				}
			}

			if (!acted && this.plantEff[i] > 0.12 && e < full * 0.92 && !(dom === 3 && dg >= 0.33)) {
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
					const ff = plants.fruit[tile] > 0 && plants.species[tile] ? FOOD_SEED : FOOD_FRUIT;
					const eaten = plants.eatFruit(tile, bite, tall);
					if (eaten > 0) plants.fruitBonus(tile, eaten);
					const seedHit = plants.fruitSeedTox * 0.7 - this.toxR[i];
					const fg = eaten * FRUIT_ENERGY * (0.6 + plants.fruitSweet) * this.plantEff[i] * plantK * (1 - 1.6 * (seedHit > 0 ? seedHit : 0)) * (dom === 3 ? BIRD_FRUIT : 1);
					const ftk = ff === FOOD_SEED && fg > 0 ? this._tool(i) : 0;
					if (ftk > 0) this._toolUse(i, fg * TOOL_K * ftk);
					this.energy[i] += this._eat(i, fg * (1 + TOOL_K * ftk), ff, sk0);
					if (plants.fruitSp && !this.seedSp[i]) {
						this.seedSp[i] = plants.fruitSp;
						this.seedTtl[i] = (20 + ((rng.next() * 40) | 0)) * (dom === 3 ? BIRD_SEED : 1);
					}
					if (eaten > 0) this.water[i] = Math.min(1, this.water[i] + FRUIT_WATER);
					acted = true;
				} else if (avail > bite * 0.5) {
					this.state[i] = 1;
					const u = plants.n + tile;
					const ua = skip || !plants.species[u] || plants.kind[u] ? 0 : plants.biomass[u] - plants.floor[u] * (1 - reach);
					const eaten = plants.graze(tile, bite, reach, skip);
					if (eaten > 0) this.water[i] = Math.min(1, this.water[i] + GRAZE_WATER);
					const toxHit = Math.max(0, plants.grazeTox - this.toxR[i]);
					const ge = eaten * PLANT_ENERGY * this.plantEff[i] * plantK * (1 - 1.6 * toxHit);
					if (ge > 0) {
						const lf = ua > 0 ? (ua < bite ? ua : bite) / eaten : 0;
						const ls = lf < 1 ? lf : 1;
						this.energy[i] += this._eat(i, ge * ls, FOOD_LEAF, sk0) + this._eat(i, ge * (1 - ls), FOOD_GRASS, sk0);
					}
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
				if (this.mass[i] * gf < BUG_MASS && bugs.total[tile] > 0 && this.energy[i] < full) {
					const be = this._bugEff(i);
					if (be > 0) {
						const bg = this._eat(i, bugs.eat(tile, this.bite[i] * gf * ef * be) * (dom === 3 && dg >= 0.33 ? BIRD_BUG_ENERGY : BUG_ENERGY), FOOD_BUG, sk0);
						this.energy[i] += bg;
						if (gf < 1 && dg >= BUG_DIET_MAX) this.life.juvBug += bg;
					}
				}
				const pl = flying ? 0 : parasiteLoad[tile];
				if (pl > 0) {
					drain = pl * PARASITE_DRAIN * this.mass[i] * (1 - 0.6 * this.armor[i]) * (0.4 + 0.6 * gaussFit(this.genome[i * AG + G_SIZE], this.parasiteHost[tile], PARASITE_HOST_TOL)) * (hk === 3 && atHome ? 1 + DEN_PARA : 1);
					if (this.cln[i] > 0) {
						drain *= CLEAN_CUT;
						this.symb.protectedTicks++;
					}
					cost += drain;
					bugs.parasiteDrain += drain;
				}
			}
			if (this.cls[i] === CLS_INVT && !dom && dg < 0.5 && this.energy[i] < full && soil.litter[tile] > 0) this.energy[i] += this._eat(i, soil.consumeLitter(tile, bite) * LITTER_ENERGY * plantK, FOOD_LITTER, sk0);
			if (carrion[tile] > 0 && this.energy[i] < full * 0.92 && (dom !== 3 || this.walk[tile] & 1)) {
				const ce = this._eat(i, soil.consumeCarrion(tile, bite * (1 + SCAV_BITE * this.scav[i])) * MEAT_ENERGY * this.carrionEff[i] * meatK, FOOD_CARRION, sk0);
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
						if (this.lv[i] && D.vectorLoad[tile] < WATER_SHED) {
							D.vectorStrain[tile] = s;
							D.vectorLoad[tile] = WATER_SHED;
							this.life.shed++;
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
					if (!this.strain[i] && D.vectorLoad[tile] > 0 && this.cln[i] === 0) D.exposeAnimal(i, D.vectorStrain[tile], VECTOR_K * D.vectorLoad[tile]);
				}
			}
			this.pb[i] = drain / this.mass[i];
			if (this.cln[i] > 0) this.cln[i]--;
			if (landScav && this.energy[i] > e) this.scavEnergy += this.energy[i] - e;
			const dry = Wx && dom !== 1 && this.water[i] <= 0;
			if (dry) cost *= DEHYDRATE_COST;
			cost += moved * 0.012 * this.mass[i];
			if (dom === 1 && !this.lv[i]) {
				const o2 = this.plants.oxygen[tile];
				if (o2 < HYPOXIA) cost *= 1 + HYPOXIA_COST * (HYPOXIA - o2) / HYPOXIA;
			}
			this.energy[i] -= cost;
			const jv = gf < 1;
			const rt = (cost / emax) * NUT_K;
			const pd = drain > 0 ? (drain / emax) * NUT_K * PARA_NUT : 0;
			const np = this.nProt[i] - rt * this.needP[i] * (jv ? NEED_JUV_P : 1) - pd;
			const nm = this.nMin[i] - rt * this.needM[i] * (jv ? NEED_JUV_M : 1) - pd;
			this.nProt[i] = np > 0 ? np : 0;
			this.nMin[i] = nm > 0 ? nm : 0;
			const en = this.energy[i];
			if (en > emax) {
				this.energy[i] = emax;
				if (fat < fatCap) {
					const nf = fat + (en - emax) * FAT_EFF;
					this.fat[i] = nf < fatCap ? nf : fatCap;
				}
			} else if (!away && en > emax * (prep ? FAT_PREP_STORE : FAT_STORE) && fat < fatCap) {
				const lo = emax * (prep ? FAT_PREP_STORE : FAT_STORE);
				let mv = FAT_RATE * this.app[i] * emax * (prep ? FAT_PREP_RATE : 1);
				const room = (fatCap - fat) / FAT_EFF;
				if (mv > room) mv = room;
				if (mv > en - lo) mv = en - lo;
				this.energy[i] = en - mv;
				this.fat[i] = fat + mv * FAT_EFF;
			} else if (fat > 0) {
				const lo = emax * (away ? FAT_BURN_MIG : prep ? FAT_PREP_BURN : FAT_BURN);
				if (en < lo) {
					const want = lo - en;
					const take = want < fat ? want : fat;
					this.energy[i] = en + take;
					this.fat[i] = fat - take;
					this.fatBurned += take;
				}
			}

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
				this._thirstDeath(i);
				continue;
			}
			if (this.energy[i] <= 0) {
				this._kill(i);
				if (drain > cost * PARASITE_DEATH_SHARE) this.deaths.parasite++;
				else if (dry) this._thirstDeath(i);
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
				this.energy[i] + this.fat[i] > emax * 0.7 &&
				(this.count < this.maxAnimals || (this.diet[i] > 0.6 && this.count < this.maxAnimals + 1500)) &&
				(dom !== 2 || !Wx || Wx.waterDist[tile] <= 1 || (this.walk[tile] & 2) !== 0 || hk === 1) &&
				(hk === 0 || hk === 3 || dist2d(this.x[i] - this.nx[i], this.y[i] - this.ny[i]) <= NEST_NEAR) &&
				this._localCount(i) < (dom === 3 ? BIRD_CROWD : 14) &&
				(!this._deficient(i) || rng.next() >= DEF_FERT)
			) {
				const short = emax * 0.7 - this.energy[i];
				if (short > 0) {
					this.energy[i] += short;
					this.fat[i] -= short;
					this.fatBurned += short;
				}
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
			this._rs = new Float32Array(c);
		}
		const nsp = this.registry.nextId + 1;
		if (!this._spc || this._spc.length < nsp || !this._spe) {
			this._spc = new Int32Array(nsp + 256);
			this._sps = new Float64Array(nsp + 256);
			this._spe = new Int32Array(nsp + 256);
		}
		const rs = this._rs;
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
			if (this.alm[i] > 0) this.alm[i]--;
			const gf = this.gf[i];
			const ef = this.energy[i] / (this.emax[i] * gf);
			rs[i] = this.mass[i] * gf * this.ef[i] * (0.5 + (ef < 1 ? ef : 1)) * (this.strain[i] ? RANK_SICK : 1);
			if (!this.dorm[i] && !this.dsp[i] && this.diet[i] > 0.6 && this.scav[i] <= 0.5 && this.age[i] >= this.mature[i] && g[i * AG + G_PACK] > PACK_MIN) {
				pr[i] = -2;
				ps[i] = rs[i] * (this.strain[i] ? PACK_SICK_LEAD : 1);
				m++;
			}
		}
		this._rank();
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

	_rank() {
		const cnt = this._spc;
		const sum = this._sps;
		const ele = this._spe;
		const rs = this._rs;
		const items = this.gitems;
		const start = this.gstart;
		const nc = start.length - 1;
		for (let c = 0; c < nc; c++) {
			const a = start[c];
			const b = start[c + 1];
			if (a === b) continue;
			for (let k = a; k < b; k++) {
				const j = items[k];
				if (!this.alive[j]) continue;
				const s = this.sp[j];
				cnt[s]++;
				sum[s] += rs[j];
				if (this.ef[j] < 1 && !this.dorm[j]) ele[s]++;
			}
			for (let k = a; k < b; k++) {
				const j = items[k];
				if (!this.alive[j]) continue;
				const s = this.sp[j];
				const q = cnt[s];
				this.grp[j] = q;
				this.ld[j] = ele[s] > 0 ? 1 : 0;
				this.rnk[j] = q > 1 && sum[s] > 0 ? (rs[j] * q) / sum[s] : 1;
			}
			for (let k = a; k < b; k++) {
				const s = this.sp[items[k]];
				cnt[s] = 0;
				sum[s] = 0;
				ele[s] = 0;
			}
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
		const base = (mp * MEAT_ENERGY + (this.energy[p] + this.fat[p]) * 0.25) / n;
		const rs = this._rs;
		let rsum = 0;
		for (let k = 0; k < n; k++) rsum += rs[buf[k]];
		const ps = this.strain[p];
		const D = ps && this.disease && this.disease.on ? this.disease : null;
		const mf = this.domain[p] === 1 || this.cls[p] === CLS_FISH ? FOOD_FISH : FOOD_MEAT;
		for (let k = 0; k < n; k++) {
			const j = buf[k];
			const sh = rsum > 0 ? 1 - RANK_FEED + (RANK_FEED * n * rs[j]) / rsum : 1;
			let e = this.energy[j] + this._eat(j, sh * base * this.meatEff[j] * (1 - GEN_TAX * (1 - this._genT(j))), mf, this.strain[j]);
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

	_dormTrack(sp, s) {
		const n = s[AG];
		let kb = 1;
		for (let k = 2; k <= 3; k++) if (s[AG + 4 + k] > s[AG + 4 + kb]) kb = k;
		const sh = (s[AG + 5] + s[AG + 6] + s[AG + 7] + s[AG + 8]) / n;
		sp.dormShare = Math.round(sh * 1000) / 1000;
		const share = s[AG + 4 + kb] / n;
		if (!sp.dormAlert && share > DORM_EVENT && n >= DORM_EVENT_POP) {
			sp.dormAlert = true;
			this.log.push(this.tick, 'info', `${sp.name} went into ${DORM_NAMES[kb]}`, sp.id);
		} else if (sp.dormAlert && sh < DORM_REARM) sp.dormAlert = false;
	}

	_lifeTrack(sp, s) {
		const m = sp.mean;
		const layer = sp.domain !== 'land' || m[G_COLD] > 0.5;
		const lit = 1 + Math.round(3 * m[G_FEC]);
		const n = Math.max(1, Math.round(lit * (BROOD_LO + BROOD_SPAN * m[G_BROOD])));
		sp.clutch = layer ? Math.round(n * EGG_CLUTCH_MUL) : n;
		sp.careT = Math.round(CARE_TICKS * m[G_CARE]);
		sp.lifespan = sp.lifeN > 0 ? Math.round(sp.lifeSum / sp.lifeN) : sp.lifespan || 0;
		sp.larvae = s[AG + 10];
		const t = this.tick;
		if (!sp.lifeHist) {
			sp.lifeHist = [];
			sp.lifeStep = COND_EVERY;
		}
		if (t % sp.lifeStep === 0) {
			sp.lifeHist.push(t, sp.clutch, sp.careT, sp.lifespan);
			if (sp.lifeHist.length > LIFE_HIST) {
				const step = sp.lifeStep * 2;
				const next = [];
				for (let k = 0; k < sp.lifeHist.length; k += 4) if (sp.lifeHist[k] % step === 0) next.push(sp.lifeHist[k], sp.lifeHist[k + 1], sp.lifeHist[k + 2], sp.lifeHist[k + 3]);
				sp.lifeHist = next;
				sp.lifeStep = step;
			}
		}
	}

	_condTrack(sp) {
		const t = this.tick;
		if (!sp.condHist) {
			sp.condHist = [];
			sp.condStep = COND_EVERY;
		}
		if (t % sp.condStep === 0) {
			sp.condHist.push(t, sp.fat, Math.max(sp.protDef, sp.minDef));
			if (sp.condHist.length > COND_HIST) {
				const step = sp.condStep * 2;
				const next = [];
				for (let k = 0; k < sp.condHist.length; k += 3) if (sp.condHist[k] % step === 0) next.push(sp.condHist[k], sp.condHist[k + 1], sp.condHist[k + 2]);
				sp.condHist = next;
				sp.condStep = step;
			}
		}
		if (!sp.protAlert && sp.protDef > DEF_EVENT && sp.population >= DEF_EVENT_POP && t - sp.createdTick >= DEF_EVENT_AGE) {
			sp.protAlert = true;
			this.log.push(t, 'info', `${sp.name} is suffering from protein deficiency`, sp.id);
		} else if (sp.protAlert && sp.protDef < DEF_REARM) sp.protAlert = false;
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
		const gq = this.grp[i] - 1;
		const k = CONTACT_K * (1 + CROWD_K * (near < CROWD_N ? near / CROWD_N : 1)) * (1 + HERD_CONTACT * (this.pn[i] > 1 ? 1 : this.herd[i])) * (1 + GRP_CONTACT * (gq < SOC_N ? gq / SOC_N : 1));
		const sp = this.sp[i];
		for (let m = 0; m < rolls; m++) {
			const j = buf[m];
			D.exposeAnimal(j, s, this.sp[j] === sp ? k * (1 - SHUN_K * this.genome[j * AG + G_SOCIAL]) : k);
		}
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
			? 0.3 + Math.min(0.3, this.plants.cover(tile) * 0.6) + (this.walk[tile] & 128 ? REEF_COVER : 0)
			: Math.min(0.45, this.plants.cover(tile) * 0.5) + (this.home[p] > 1 && dist2d(this.x[p] - this.nx[p], this.y[p] - this.ny[p]) <= NEST_NEAR ? DEN_COVER * this.genome[p * AG + G_NEST] : 0);
		const tk = this.armor[p] > TOOL_ARMOR || this.cls[p] === CLS_INVT ? this._tool(i) : 0;
		let chance = 0.7 * sizeF * speedF * (1 - 0.6 * this.armor[p] * (1 - TOOL_CRACK * tk)) * (1 - cover * (1 - DISPLAY_SPOT * this.show[p] - (this.alm[p] > 0 ? ALARM_SPOT : 0))) * (1 - 0.5 * this.scav[i]);
		if (pn > 1) chance *= Math.min(PACK_CAP, 1 + PACK_K * (1 + SOC_PACK * (this.genome[i * AG + G_SOCIAL] - 0.5)) * (pn - 1));
		if (this.fat[p] > 0) chance *= 1 + FAT_CATCH * this._heavy(p);
		if (this.dorm[p]) chance = Math.min(0.95, chance * DORMANT_CATCH);
		if (this.domain[p] === 3 && this.domain[i] !== 3) chance *= BIRD_ESCAPE;
		if (this.lv[p] === 1) chance *= TAD_HIDE;
		if (this.cr[p] > 0) chance *= 1 - CARE_GUARD * this.genome[p * AG + G_CARE];
		const sp0 = this.genome[p * AG + G_SOCIAL];
		const herd = this.herd[p] > sp0 || sp0 <= SOC_MIN ? this.herd[p] : sp0;
		if (herd > 0) {
			const n = this.grp[p];
			chance *= 1 - (HERD_SAFE / Math.sqrt(pn)) * herd * (n < HERD_SAFE_N ? n / HERD_SAFE_N : 1) * (this.strain[p] ? SHUN_SAFE : 1);
		}
		if (pn > 1 && this.rng.next() < chance) {
			this._preyLearn(i, p, tick);
			this._packFeed(i, p, pn, mp);
			this._eaten(p);
			this._kill(p, CARCASS_EATEN);
			this.deaths.eaten++;
		} else if (pn === 1 && this.rng.next() < chance && !this._taste(i, p, tick)) {
			const mg = (mp * MEAT_ENERGY * this.meatEff[i] + (this.energy[p] + this.fat[p]) * 0.25) * (1 - GEN_TAX * (1 - this._genT(i)));
			if (tk > 0) this._toolUse(i, mg * TOOL_K * tk);
			this.energy[i] += this._eat(i, mg * (1 + TOOL_K * tk), this.domain[p] === 1 || this.cls[p] === CLS_FISH ? FOOD_FISH : FOOD_MEAT, this.strain[i]);
			if (this.domain[i] !== 1) this.water[i] = Math.min(1, this.water[i] + MEAT_WATER);
			const ps = this.strain[p];
			if (ps && this.disease.on) this.disease.exposeAnimal(i, ps, PREY_K);
			this._eaten(p);
			this._kill(p, CARCASS_EATEN);
			this.deaths.eaten++;
			this.cool[i] = 4;
		} else {
			this.cool[i] = 8;
			this.energy[i] -= this.meta[i] * 2;
			if (this.dorm[p]) this._dormWake(p);
			this.state[p] = 4;
			this.ttl[p] = 4;
			this.tx[p] = this.x[p] + (this.x[p] - this.x[i]) * 6;
			this.ty[p] = this.y[p] + (this.y[p] - this.y[i]) * 6;
			this._survive(p, i);
		}
	}

	_survive(p, i) {
		const b = this.genome[p * AG + G_BRAIN];
		const add = LEARN_ADD * (LEARN_BASE + b);
		const s = this.sp[i];
		if (this.lsp[p] === s) {
			const v = this.lst[p] + add;
			this.lst[p] = v < 1 ? v : 1;
		} else if (this.lst[p] < add) {
			this.lsp[p] = s;
			this.lst[p] = add < 1 ? add : 1;
		}
		this.mdx[p] = this.x[i];
		this.mdy[p] = this.y[i];
		this.brain.learned++;
	}

	_tool(i) {
		const c = this.cls[i];
		if (c !== CLS_MAMM && c !== CLS_BIRD) return 0;
		const v = (this.genome[i * AG + G_BRAIN] - TOOL_MIN) / TOOL_SPAN;
		return v <= 0 ? 0 : v < 1 ? v : 1;
	}

	_toolUse(i, gain) {
		this.tl[i]++;
		this.brain.toolUses++;
		this.brain.toolGain += gain;
	}

	_teach(i, j, k) {
		if (this.mwx[i] < 0 && this.mfx[i] < 0 && this.lst[i] <= 0) return;
		const f = k * this.genome[i * AG + G_BRAIN];
		const rng = this.rng;
		let got = false;
		if (this.mwx[i] >= 0 && this.mwx[j] < 0 && rng.next() < f) {
			this.mwx[j] = this.mwx[i];
			this.mwy[j] = this.mwy[i];
			got = true;
		}
		if (this.mfx[i] >= 0 && this.mfx[j] < 0 && rng.next() < f) {
			this.mfx[j] = this.mfx[i];
			this.mfy[j] = this.mfy[i];
			got = true;
		}
		const v = this.lst[i] * TEACH_KEEP;
		if (v > LEARN_MIN && v > this.lst[j] && rng.next() < f) {
			this.lsp[j] = this.lsp[i];
			this.lst[j] = v;
			this.mdx[j] = this.mdx[i];
			this.mdy[j] = this.mdy[i];
			got = true;
		}
		if (got) this.brain.taught++;
	}

	_look(sp, mimic) {
		const own = sp.hsl[0] / 360;
		const mh = this.modelHue[sp.cls];
		const w = (mimic - MIMIC_LO) / MIMIC_SPAN;
		if (mh < 0 || w <= 0 || this.modelSp[sp.cls] === sp.id) return own;
		let d = mh - own;
		if (d > 0.5) d -= 1;
		else if (d < -0.5) d += 1;
		const h = own + d * (w < 1 ? w : 1);
		return h < 0 ? h + 1 : h >= 1 ? h - 1 : h;
	}

	_preyAversion(av, hue, cls, spj) {
		let m = 0;
		for (const a of av) {
			if (a.cls !== cls) continue;
			const v = a.sp === spj ? a.strength : hueDist(a.hue, hue) <= PREY_HUE ? a.strength * PREY_GEN : 0;
			if (v > m) m = v;
		}
		return m;
	}

	_preyLearn(i, p, tick) {
		const sp = this.registry.get(this.sp[i]);
		if (!sp) return 0;
		if (!sp.preyAv) sp.preyAv = [];
		const tox = this.genome[p * AG + G_TOXIC];
		const hue = this.lk[p];
		const cls = this.cls[p];
		const psp = this.sp[p];
		let entry = null;
		let near = null;
		let bestD = PREY_HUE;
		for (const a of sp.preyAv) {
			if (a.cls !== cls) continue;
			if (a.sp === psp) entry = a;
			const d = hueDist(a.hue, hue);
			if (d <= bestD) {
				bestD = d;
				near = a;
			}
		}
		if (tox <= TOX_MIN) {
			const fool = entry || near;
			if (fool && fool.strength > 0) {
				fool.strength *= 1 - MIMIC_UNLEARN;
				this.symb.mimicFooled++;
			}
			return 0;
		}
		const hit = tox - this.toxR[i];
		if (hit > 0) this.energy[i] -= hit * TOX_HIT * this.emax[i] * this.gf[i];
		this.symb.toxHits++;
		if (!entry) {
			entry = { hue, cls, sp: psp, strength: 0 };
			sp.preyAv.push(entry);
		}
		entry.hue = hue;
		const before = entry.strength;
		const add = TOX_LEARN * tox;
		entry.strength = before + add < 1 ? before + add : 1;
		if (before <= PREY_AV_SKIP && entry.strength > PREY_AV_SKIP) {
			const msp = this.registry.get(this.sp[p]);
			const key = sp.id + '>' + this.sp[p];
			const last = this._avoidLogged.get(key);
			if (msp && (last === undefined || tick - last >= AVERSION_LOG_GAP)) {
				this._avoidLogged.set(key, tick);
				this.log.push(tick, 'info', `${sp.name} learned to avoid ${msp.name}`, sp.id);
			}
		}
		return hit;
	}

	_taste(i, p, tick) {
		const hit = this._preyLearn(i, p, tick);
		if (!(hit > 0) || this.rng.next() >= hit * TOX_SPIT) return false;
		this.symb.toxSpit++;
		this.cool[i] = 8;
		this.energy[p] -= this.emax[p] * this.gf[p] * 0.2;
		this.state[p] = 4;
		this.ttl[p] = 4;
		this.tx[p] = this.x[p] + (this.x[p] - this.x[i]) * 6;
		this.ty[p] = this.y[p] + (this.y[p] - this.y[i]) * 6;
		this._survive(p, i);
		return true;
	}

	_cleanStep(i, tick) {
		const csp = this.registry.get(this.sp[i]);
		const riding = this.state[i] === 9;
		this._cleanPref = csp ? csp.cleanOf | 0 : 0;
		this._cleanRide = riding;
		const h = this._nearest(i, riding ? 1.5 : this.range[i] * CLEAN_RANGE, 5);
		this._cleanRide = false;
		this._cleanPref = 0;
		if (h < 0) {
			if (this.state[i] >= 9) {
				this.state[i] = 0;
				this.ttl[i] = 0;
			}
			return -1;
		}
		if (riding) {
			this.x[i] = this.x[h];
			this.y[i] = this.y[h];
			if (--this.ttl[i] <= 0) {
				this.state[i] = 0;
				this.cool[i] = CLEAN_COOL;
			}
			return 0;
		}
		if (this.state[i] !== 10) this.ttl[i] = 12;
		this.state[i] = 10;
		let moved = 0;
		if (dist2d(this.x[h] - this.x[i], this.y[h] - this.y[i]) > 1) moved = this._moveToward(i, this.x[h], this.y[h], 1.2);
		if (dist2d(this.x[h] - this.x[i], this.y[h] - this.y[i]) <= 1) this._clean(i, h, tick, csp);
		else if (--this.ttl[i] <= 0) {
			this.state[i] = 0;
			this.cool[i] = CLEAN_COOL;
		}
		return moved;
	}

	_clean(i, h, tick, csp) {
		const tol = this.genome[h * AG + G_TOLER];
		const rng = this.rng;
		if (rng.next() >= 0.3 + 0.7 * tol) {
			this.symb.cleanFail++;
			this.state[i] = 0;
			this.cool[i] = CLEAN_COOL;
			if (this.diet[h] > 0.66 && rng.next() < CLEAN_EAT * (1 - tol)) {
				this.energy[h] += this._eat(h, this.mass[i] * this.gf[i] * MEAT_ENERGY * this.meatEff[h], FOOD_MEAT, this.strain[h]);
				this.symb.cleanEaten++;
				this._eaten(i);
				this._kill(i, CARCASS_EATEN);
				this.deaths.eaten++;
			}
			return;
		}
		const W = this.world.width;
		const tile = (this.y[h] | 0) * W + (this.x[h] | 0);
		const pb = this.pb[h];
		const sick = this.strain[h];
		const gain = CLEAN_GAIN * this.emax[i] * this.gf[i] * (0.3 + (pb < CLEAN_FULL ? pb / CLEAN_FULL : 1) + (sick ? 0.3 : 0));
		this.energy[i] += this._eat(i, gain, FOOD_BUG, this.strain[i]);
		this.cln[h] = CLEAN_TICKS;
		if (this.bugs && this.parasiteLoad[tile] > 0) this.bugs.clean(tile, CLEAN_TILE);
		const D = this.disease && this.disease.on ? this.disease : null;
		if (sick) {
			this.itime[h] = this.itime[h] > CLEAN_SICK ? this.itime[h] - CLEAN_SICK : 1;
			if (D && !this.strain[i]) {
				D.exposeAnimal(i, sick, CLEAN_CARRY);
				if (this.strain[i]) this.symb.cleanCarry++;
			}
		} else if (D && this.strain[i]) {
			D.exposeAnimal(h, this.strain[i], CLEAN_CARRY);
			if (this.strain[h]) this.symb.cleanCarry++;
		}
		this.x[i] = this.x[h];
		this.y[i] = this.y[h];
		this.state[i] = 9;
		this.ttl[i] = CLEAN_RIDE;
		this.symb.cleanings++;
		if (csp && csp.cleanN) {
			const hs = this.sp[h];
			csp.cleanN[hs] = (csp.cleanN[hs] || 0) + 1;
		}
	}

	_eaten(p) {
		if (this.diet[p] >= 0.66) return;
		const sp = this.registry.get(this.sp[p]);
		this.eatenBy[this.cls[p] * 2 + (sp && sp.mean[G_ALARM] > ALARM_MIN ? 1 : 0)]++;
	}

	_algae(tile) {
		const P = this.plants;
		let a = P.bloom[tile];
		const u = P.n + tile;
		if (P.water[tile] && P.species[u]) a += P.biomass[u];
		return 1 + TAD_ALGAE * (a < 1 ? a : 1);
	}

	_kill(i, frac = 1) {
		this.alive[i] = 0;
		if (this.domain[i] !== 1) this.landDeaths++;
		const ks = this.registry.get(this.sp[i]);
		if (ks) {
			ks.lifeSum = (ks.lifeSum || 0) * LIFE_DECAY + this.age[i];
			ks.lifeN = (ks.lifeN || 0) * LIFE_DECAY + 1;
		}
		this.registry.remove(ks);
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
		if (this.plants.plantSeed(tile, this.seedGenome, sp, tick)) this.plants.animalSeed(tile, sp);
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
		for (const t of cand) if (t >= 0 && (this.walk[t] & 6) === 6) return t;
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
		if (this.grp[i] >= 3 && this.rnk[i] < 1 && rng.next() < RANK_MATE * (1 - this.rnk[i])) {
			this.cool[i] = CHOOSY_WAIT;
			this.rankBlocked++;
			return;
		}
		const mate = this._chooseMate(i);
		if (mate === -2) return;
		const fd = this.fnd[i];
		const parentSp = this.registry.get(this.sp[i]);
		const childG = this.childGenome;
		const oi = i * AG;
		const om = mate >= 0 ? mate * AG : oi;
		const budget = this.emax[i] * 0.38;
		const young = Math.max(1, Math.round(litter * (BROOD_LO + BROOD_SPAN * this.genome[oi + G_BROOD])));
		const perChild = budget / young;
		const brood = layer ? Math.round(young * EGG_CLUTCH_MUL) : young;
		const ex = eggTile % W;
		const ey = (eggTile - ex) / W;
		let clutchSp = null;
		let spent = 0;
		const ni = this.natImm[i];
		const nm = mate >= 0 ? this.natImm[mate] : 0;
		const ca = layer && this.nMin[i] < EGG_CA_MIN ? 1 : 0;
		let split = fd === DISP_GEN && rng.next() < DISP_SPLIT_P && this.registry.canSplit(parentSp, DISP_SPLIT_POP);
		if (fd === DISP_GEN) this.fnd[i] = DISP_GEN - 1;
		let fsp = null;
		for (let c = 0; c < brood; c++) {
			if (this.count >= this.maxAnimals + 1500) break;
			for (let k = 0; k < AG; k++) childG[k] = rng.next() < 0.5 ? this.genome[oi + k] : this.genome[om + k];
			mutateGenes(childG, 0, childG, 0, AG, rng, 0.25, fd > 0 ? 0.04 * DISP_DRIFT : 0.04);
			this._clampClass(childG, this.cls[i]);
			if (dom !== 1) {
				childG[G_DEPTH] = this.genome[oi + G_DEPTH];
				childG[G_SALT] = this.genome[oi + G_SALT];
			}
			if (this.immune[i]) childG[G_RES] = Math.min(1, childG[G_RES] + RES_NUDGE);
			const ang = rng.next() * Math.PI * 2;
			const cx = this.x[i] + Math.cos(ang) * 0.8;
			const cy = this.y[i] + Math.sin(ang) * 0.8;
			const x = this.canStand(dom, cx, cy) ? cx : this.x[i];
			const y = this.canStand(dom, cx, cy) ? cy : this.y[i];
			let sp = parentSp;
			if (fsp) sp = fsp;
			else if (geneDistance(childG, 0, parentSp.mean, 0, ANIMAL_WEIGHTS) > ANIMAL_SPECIATION) {
				if (clutchSp && geneDistance(childG, 0, clutchSp.mean, 0, ANIMAL_WEIGHTS) < ANIMAL_SPECIATION) sp = clutchSp;
				else {
					sp = this.registry.matchDaughter(parentSp, childG, ANIMAL_WEIGHTS, ANIMAL_SPECIATION);
					if (!sp && !this.registry.canSplit(parentSp, ANIMAL_SPLIT_MIN_POP)) sp = parentSp;
				}
			}
			if (split) sp = null;
			if (!sp) {
				sp = this.newSpecies(childG, 0, parentSp.domain, parentSp, tick, null);
				if (split) {
					fsp = sp;
					split = false;
				}
				if (layer) clutchSp = sp;
				const label = ANIMAL_CATEGORY_LABEL[sp.category].toLowerCase();
				const rolePrev = parentSp.role;
				const shift = rolePrev !== sp.role ? ` — a new ${sp.role}!` : '';
				this.log.push(tick, 'speciation', `${sp.name} (${label}) branched from ${parentSp.name}${shift}`, sp.id);
				if (fd > 0) {
					sp.dispersal = true;
					this.dispSplits++;
				}
			}
			let im = ni && nm ? (rng.next() < 0.5 ? ni : nm) : ni || nm;
			if (D && rng.next() < NATIMM_P) {
				const ds = D.speciesStrain.get(parentSp.id);
				if (ds) im = ds;
			}
			if (layer) {
				const cost = perChild * EGG_COST;
				this.eggs.lay(sp, childG, 0, ex + 0.15 + 0.7 * rng.next(), ey + 0.15 + 0.7 * rng.next(), eggTile, cost, eggDom, im, nest, vs, ca, this.uid[i]);
				spent += cost;
				continue;
			}
			const j = this.spawn(sp, childG, 0, x, y, 0);
			this._hatch(j, -1, 0);
			this.energy[j] = Math.min(perChild, this.emax[j] * this.gf[j] * 0.6);
			this.natImm[j] = im;
			this.nProt[j] = this.nProt[i];
			this.nMin[j] = this.nMin[i];
			this.parent[j] = this.uid[i];
			this._teach(i, j, TEACH_LIVE);
			this.fnd[j] = fd > 0 ? fd - 1 : 0;
			if (ntile >= 0) {
				this.home[j] = 3;
				this.nx[j] = this.nx[i];
				this.ny[j] = this.ny[i];
			}
			spent += perChild;
			this.births++;
		}
		this.energy[i] -= spent * 1.1 * (1 - TERR_REPRO * this._homeK(i));
		if (layer && spent > 0) {
			if (ca) this.caClutches++;
			const m = this.nMin[i] - EGG_CA * (spent / perChild);
			this.nMin[i] = m > 0 ? m : 0;
		}
		this.cool[i] = Math.round(35 + 55 * this.genome[oi + G_SIZE] - 10 * this.genome[oi + G_FEC]);
		if (spent > 0) {
			const ct = Math.round(CARE_TICKS * this.genome[oi + G_CARE]);
			this.brd[i] = layer && this.genome[oi + G_CARE] > CARE_FOLLOW ? ct + Math.round(EGG_TIME + EGG_TIME_SIZE * this.genome[oi + G_SIZE]) : ct;
			this.cool[i] += Math.round(CARE_DELAY * ct);
		}
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
		const nest = new Map();
		const W = this.world.width;
		const ntiles = W * this.world.height;
		const bs = new Float64Array(6);
		const bn = new Float64Array(6);
		let learned = 0;
		for (let i = 0; i < this.count; i++) {
			const id = this.sp[i];
			let s = sums.get(id);
			if (!s) {
				s = new Float64Array(AG + 13);
				sums.set(id, s);
			}
			if (this.alive[i]) {
				const c = this.cls[i];
				bs[c] += this.genome[i * AG + G_BRAIN];
				bn[c]++;
			}
			s[AG + 11] += this.tl[i];
			this.tl[i] = 0;
			if (this.lst[i] > 0) {
				const v = this.lst[i] * (1 - LEARN_DECAY);
				if (v < LEARN_MIN) {
					this.lst[i] = 0;
					this.lsp[i] = 0;
					this.mdx[i] = this.mdy[i] = -1;
				} else {
					this.lst[i] = v;
					learned++;
					s[AG + 12]++;
				}
			}
			const o = i * AG;
			for (let k = 0; k < AG; k++) s[k] += this.genome[o + k];
			s[AG]++;
			if (this.strain[i]) s[AG + 1]++;
			s[AG + 2] += this.fat[i] / (this.emax[i] * this.gf[i]);
			if (this.nProt[i] < DEFICIT) s[AG + 3]++;
			if (this.nMin[i] < DEFICIT) s[AG + 4]++;
			if (this.dorm[i]) s[AG + 4 + this.dorm[i]]++;
			s[AG + 9] += this.grp[i];
			if (this.lv[i]) s[AG + 10]++;
			this.lk[i] = this._look(this.registry.get(id), this.genome[o + G_MIMIC]);
			const h = this.home[i];
			if (h === 1 || h === 2) {
				const key = id * ntiles + (this.ny[i] | 0) * W + (this.nx[i] | 0);
				nest.set(key, (nest.get(key) || 0) + 1);
			}
		}
		let ball = 0;
		let nall = 0;
		for (let c = 0; c < 6; c++) {
			this.brainCls[c] = bn[c] ? bs[c] / bn[c] : 0;
			ball += bs[c];
			nall += bn[c];
		}
		this.brainMean = nall ? ball / nall : 0;
		this.learnedN = learned;
		let tools = 0;
		const cols = new Map();
		for (const [key, c] of nest) {
			if (c < COLONY_N) continue;
			const id = Math.floor(key / ntiles);
			cols.set(id, (cols.get(id) || 0) + 1);
		}
		for (const [id, s] of sums) {
			const sp = this.registry.get(id);
			for (let k = 0; k < AG; k++) sp.mean[k] = s[k] / s[AG];
			sp.infected = s[AG + 1];
			sp.category = animalCategory(sp.mean, sp.domain, sp.cls, sp.nic | 0);
			sp.icon = animalIcon(sp.category, sp.id);
			sp.role = ANIMAL_ROLES[roleIndex(sp.mean[G_DIET], sp.mean[G_SCAV])];
			this._showTrack(sp);
			sp.fat = Math.round((s[AG + 2] / s[AG]) * 1000) / 1000;
			sp.protDef = Math.round((s[AG + 3] / s[AG]) * 1000) / 1000;
			sp.minDef = Math.round((s[AG + 4] / s[AG]) * 1000) / 1000;
			this._condTrack(sp);
			this._lifeTrack(sp, s);
			this._dormTrack(sp, s);
			sp.grpMean = Math.round((s[AG + 9] / s[AG]) * 100) / 100;
			sp.colonies = cols.get(id) || 0;
			if (!sp.colonyAlert && sp.colonies > 0 && s[AG] >= COLONY_POP) {
				sp.colonyAlert = true;
				this.log.push(this.tick, 'info', `${sp.name} formed a colony`, sp.id);
			}
			const av = sp.aversion;
			if (av && av.length) {
				for (const a of av) a.strength *= 1 - AVERSION_DECAY;
				sp.aversion = av.filter((a) => a.strength >= 0.05);
			}
			sp.toolN = (sp.toolN || 0) * TOOL_DECAY + s[AG + 11];
			sp.learnedN = s[AG + 12];
			if (sp.toolN >= TOOL_SP) tools++;
			if (!sp.tools && sp.toolN >= TOOL_LOG) {
				sp.tools = this.tick;
				this.log.push(this.tick, 'info', `${sp.name} started using tools`, sp.id);
			}
			const pa = sp.preyAv;
			if (pa && pa.length) {
				for (const a of pa) a.strength *= 1 - PREY_AV_DECAY;
				sp.preyAv = pa.filter((a) => a.strength >= 0.05);
			}
		}
		this.toolSp = tools;
		this._symbTrack(sums);
	}

	_symbTrack(sums) {
		const best = new Float64Array(6);
		const bestSp = new Int32Array(6);
		const cur = new Float64Array(6);
		let pairs = 0;
		for (const [id, s] of sums) {
			const sp = this.registry.get(id);
			const tox = sp.mean[G_TOXIC];
			if (id === this.modelSp[sp.cls] && tox > TOX_MIN && s[AG] >= MODEL_POP * MODEL_KEEP) cur[sp.cls] = s[AG] * tox;
			if (tox > TOX_MIN && s[AG] >= MODEL_POP && s[AG] * tox > best[sp.cls]) {
				best[sp.cls] = s[AG] * tox;
				bestSp[sp.cls] = id;
			}
			const cn = sp.cleanN;
			if (!cn) continue;
			let tot = 0;
			let top = 0;
			let topN = 0;
			for (const k in cn) {
				const v = cn[k] * CLEAN_COUNT_DECAY;
				if (v < 0.5) {
					delete cn[k];
					continue;
				}
				cn[k] = v;
				tot += v;
				if (v > topN) {
					topN = v;
					top = +k;
				}
			}
			const host = top ? this.registry.get(top) : null;
			if (host && host.population > 0 && topN >= CLEAN_PAIR_N && topN >= tot * CLEAN_PAIR_SHARE && s[AG] >= CLEAN_POP) {
				sp.cleanOf = top;
				pairs++;
				if (!sp.cleanLogged) sp.cleanLogged = [];
				if (sp.cleanLogged.indexOf(top) < 0) {
					sp.cleanLogged.push(top);
					this.log.push(this.tick, 'info', `${sp.name} became a cleaner of ${host.name}`, sp.id);
				}
			} else if (sp.cleanOf && !(host && host.population > 0 && top === sp.cleanOf)) sp.cleanOf = 0;
		}
		for (let c = 0; c < 6; c++) {
			if (cur[c] > 0 && best[c] < cur[c] * MODEL_SWITCH) bestSp[c] = this.modelSp[c];
			const m = bestSp[c] ? this.registry.get(bestSp[c]) : null;
			this.modelSp[c] = m ? m.id : 0;
			this.modelHue[c] = m ? m.hsl[0] / 360 : -1;
		}
		let mimicSp = 0;
		let mimics = 0;
		for (const [id, s] of sums) {
			const sp = this.registry.get(id);
			const mh = this.modelHue[sp.cls];
			sp.mimicOf = 0;
			if (mh < 0 || this.modelSp[sp.cls] === id || sp.mean[G_MIMIC] <= MIMIC_GENE || sp.mean[G_TOXIC] >= MIMIC_TOX) continue;
			if (hueDist(this._look(sp, sp.mean[G_MIMIC]), mh) > MIMIC_HUE) continue;
			sp.mimicOf = this.modelSp[sp.cls];
			mimicSp++;
			mimics += s[AG];
		}
		this.cleanerPairs = pairs;
		this.mimicSp = mimicSp;
		this.mimics = mimics;
	}
}
