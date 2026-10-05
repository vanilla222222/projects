const STAT_GROUPS = [
	{ key: 'fish', cls: 0, label: 'Fish', icon: 'fish' },
	{ key: 'amphib', cls: 1, label: 'Amphibians', icon: 'frog' },
	{ key: 'reptile', cls: 2, label: 'Reptiles', icon: 'lizard' },
	{ key: 'mammal', cls: 3, label: 'Mammals', icon: 'deer' },
	{ key: 'bird', cls: 4, label: 'Birds', icon: 'owl' },
	{ key: 'invert', cls: 5, label: 'Invertebrates', icon: 'crab' },
];
const ROLE_KEYS = ['herb', 'omni', 'carn', 'scav'];
const ROLE_LABELS = ['Herbivores', 'Omnivores', 'Predators', 'Scavengers'];
const MIGRATE_PREY = 150;
const BIRD_REVIVE = 16;

const HISTORY_EVERY = 5;
const MERGE_EVERY = 120;
const MERGE_MAX_AGE = 960;
const MERGE_POP = { plant: 6, animal: 2, bug: 6, pathogen: 2 };
const DISEASE_EVERY = 60;
const DISEASE_WINDOW = 8;
const OUTBREAK_MIN_POP = 30;
const THIRST_EVERY = 60;
const THIRST_WINDOW = 8;
const HERD_STAT_EVERY = 20;
const HERD_STAT_POP = 12;
const HERB_RESCUE = 30;
const SOLO_GROUP = 1.6;
const COLONY_GROUP = 5;
const SOC_STAT_POP = 10;

class Ecosystem {
	constructor(world, seed, options = {}) {
		this.world = world;
		this.seed = seed;
		this.options = Object.assign({ migrations: true, seasons: true, disease: true, weather: true, disasters: true }, options);
		this.rng = new FastRng(seed * 7 + 11);
		this.tick = 0;
		this.log = new EventLog();
		this.registry = new SpeciesRegistry(new FastRng(seed + 99));
		this.plants = new PlantLayer(world, this.registry, new FastRng(seed + 555), this.log);
		this.animals = new AnimalPool(world, this.plants, this.registry, new FastRng(seed + 777), this.log);
		this.stats = { plants: 0, plantBiomass: 0, fruit: 0, fungi: 0, flowers: 0, litter: 0, carrion: 0, bugs: 0, pests: 0, detritivores: 0, parasites: 0, pollinators: 0, pollination: 0, sick: 0, blight: 0, strains: 0, diseaseDeaths: 0, diseaseShare: 0, worstOutbreak: null, swarms: 0, carrionShare: 0, weather: { storms: 0, rainTiles: 0, snowTiles: 0, drought: false, droughts: 0 }, meanWet: 0, thirstDeaths: 0, thirstShare: 0, herds: 0, territories: 0, deaths: {}, stages: { eggs: 0, juveniles: 0, adults: 0, elders: 0 }, eggs: { laid: 0, hatched: 0, eaten: 0, failed: 0 }, nests: { nests: 0, dens: 0, nesters: 0, natal: 0, nestEggs: 0, eggsPerNest: 0, raids: 0, repelled: 0, paraFailed: 0 }, plantStages: { seedTiles: 0, seedlings: 0, mature: 0, old: 0, oldDeaths: 0, germinated: 0, grazedSeedlings: 0 } };
		this.history = { tick: [], plants: [], bugs: [], sick: [], thirstDeaths: [], herds: [], territories: [], eggs: [], nests: [], dens: [] };
		this.stats.birdNiches = {};
		this.stats.birdMigrants = 0;
		this.stats.packs = 0;
		this.stats.packSize = 0;
		this.stats.packKills = 0;
		this.stats.bigKills = 0;
		this.stats.mateRefusals = 0;
		this.stats.packCls = {};
		this.history.packs = [];
		this.history.packSize = [];
		this.stats.nutrition = { lean: 0, fit: 0, heavy: 0, obese: 0, meanFat: 0, deficient: 0, defShare: 0, defProt: 0, defMin: 0, caFailed: 0, caClutches: 0, fatBurned: 0 };
		this.history.nutrition = [];
		this.history.meanFat = [];
		this.stats.dormancy = { total: 0, hib: 0, brum: 0, aest: 0, torpor: 0, entered: 0, starved: 0, eggDiapause: 0, diaHatched: 0, bugReserve: 0, bugWoke: 0, seedDormant: 0 };
		this.stats.dormCls = {};
		this.history.dormancy = [];
		this.stats.social = { alarms: 0, heard: 0, sentinel: 0, colonies: 0, colonySp: 0, dispersals: 0, dispSplits: 0, rankBlocked: 0, meanGroup: 0, solitary: 0, colonial: 0, callerLoss: 0, quietLoss: 0, lossCls: {} };
		this.socExposure = new Float64Array(12);
		this.history.alarms = [];
		this.stats.life = { tadpoles: 0, larvae: 0, cared: 0, metamorphs: 0, careGiven: 0, granGiven: 0, granFeeds: 0, juvBug: 0, shed: 0, ledMig: 0, ledRate: 0, loneRate: 0, ledT: 0, loneT: 0, headStarts: 0 };
		this.stats.stageCls = {};
		this.stats.symb = { cleanerPairs: 0, pollPairs: 0, mimicSp: 0, mimics: 0, models: 0, riding: 0, cleanings: 0, cleanFail: 0, cleanEaten: 0, cleanCarry: 0, toxHits: 0, toxSpit: 0, mimicFooled: 0, avoidSkips: 0, protectedTicks: 0, animalSeeded: 0, dispBonus: 0 };
		this.history.symb = [];
		this.stats.brain = { mean: 0, cls: [0, 0, 0, 0, 0, 0], toolSp: 0, learnedN: 0, toolUses: 0, toolGain: 0, learned: 0, fledEarly: 0, memWater: 0, memFood: 0, memDanger: 0, taught: 0 };
		this.history.brain = [];
		this.stats.disasters = { activeFires: 0, fires: 0, burnt: 0, burntShare: 0, floods: 0, flooded: 0, flooding: 0, droughts: 0, drought: false, windthrow: 0, felled: 0, killed: 0, drowned: 0, eggsLost: 0, plantsBurnt: 0, survived: 0, adaptShare: 0, recolonised: 0, scarTiles: 0, recovery: 0, pioneerYoung: 0, pioneerOld: 0 };
		this.history.disasters = [];
		for (const k of BIRD_NICHES) {
			this.stats.birdNiches[k] = 0;
			this.history['birdNiche.' + k] = [];
		}
		this.stats.roles = {};
		for (const g of STAT_GROUPS) {
			this.stats[g.key] = 0;
			this.stats.roles[g.key] = { herb: 0, omni: 0, carn: 0, scav: 0 };
			this.stats.dormCls[g.key] = 0;
			this.history[g.key] = [];
			for (const r of ROLE_KEYS) this.history[g.key + '.' + r] = [];
		}
		this.stats.speciations = this.registry.speciations;
		this.historyStep = HISTORY_EVERY;
		this._deathRing = new Float64Array(DISEASE_WINDOW * 2);
		this._deathIdx = 0;
		this._deathLast = [0, 0];
		this._outbreaks = [];
		this._obPeak = new Map();
		this._thirstRing = new Float64Array(THIRST_WINDOW * 2);
		this._thirstIdx = 0;
		this._thirstLast = [0, 0];
		this.weather = typeof WeatherLayer === 'function' ? new WeatherLayer(world, this.plants, this.log, new FastRng(seed + 888)) : null;
		if (this.weather) this.plants.moistMul = this.weather.moistMul;
		if (this.weather) this.plants.snow = this.weather.snow;
		this.animals.setWeather(this.weather);
		this.eggs = typeof EggPool === 'function' ? new EggPool(world, this.animals, this.registry) : null;
		this.animals.eggs = this.eggs;
		this.plants.refreshSpeciesMeans();
		for (const a of ANIMAL_ARCHETYPES) this._introduce(a, 'founder');
		this.bugs = typeof BugLayer === 'function' ? new BugLayer(world, this.plants, this.animals, this.registry, this.log, new FastRng(seed + 333)) : null;
		this.animals.bugs = this.bugs;
		if (this.bugs) this.bugs.refreshSpeciesMeans();
		this.disease = typeof DiseaseLayer === 'function' ? new DiseaseLayer(world, this.plants, this.animals, this.registry, this.log, new FastRng(seed + 444)) : null;
		this.animals.disease = this.disease;
		this.plants.disease = this.disease;
		this.plants.bugs = this.bugs;
		this.disasters = typeof DisasterLayer === 'function' ? new DisasterLayer(world, this.plants, this.weather, this.animals, this.eggs, this.bugs, this.log, new FastRng(seed + 999)) : null;
		this.animals.dis = this.disasters;
		this.log.push(0, 'info', 'A new world begins.');
		this._markSecretFounders();
		this._computeStats();
		this._sampleHistory(true);
	}

	_markSecretFounders() {
		const w = this.world;
		const A = this.animals;
		if (!w || !w.secretKinds || !A || !A.lin) return;
		const spots = [];
		if (w.secretKinds & 1) spots.push({ kind: 1, x: w.secretNx + 0.5, y: w.secretNy + 0.5, r: w.secretNr });
		if (w.secretKinds & 2) spots.push({ kind: 2, x: w.secretMx + 0.5, y: w.secretMy + 0.5, r: w.secretMr });
		for (const s of spots) {
			const reach = Math.max(18, s.r * 2.5);
			const near = [];
			let marked = 0;
			for (let i = 0; i < A.count; i++) {
				if (!A.alive[i] || A.lin[i]) continue;
				const d = Math.hypot(A.x[i] - s.x, A.y[i] - s.y);
				if (d <= reach) {
					A.lin[i] = s.kind;
					marked++;
				} else near.push(d, i);
			}
			if (marked < 16) {
				const order = [];
				for (let k = 0; k < near.length; k += 2) order.push(k);
				order.sort((a, b) => near[a] - near[b] || near[a + 1] - near[b + 1]);
				for (let k = 0; k < order.length && marked < 16; k++) {
					const i = near[order[k] + 1];
					if (A.lin[i]) continue;
					A.lin[i] = s.kind;
					marked++;
				}
			}
			const text = s.kind === 1 ? 'A strange glow on the horizon… something stirs in the cracked earth.' : 'A strange shimmer on the horizon… the air sparkles over a hidden glade.';
			this.log.push(0, 'secret', text);
		}
	}
	_introduce(arch, origin, count) {
		const A = this.animals;
		const W = this.world.width;
		const H = this.world.height;
		const rng = this.rng;
		const domain = domainIndex(arch.domain);
		const wd = domain === 2 && this.weather ? this.weather.waterDist : null;
		const genome = Float32Array.from(arch.g);
		const sp = A.newSpecies(genome, 0, arch.domain, null, this.tick, origin, arch.cls, arch.nic | 0);
		const total = count || arch.n;
		let placed = 0;
		let clusters = 0;
		for (let attempt = 0; attempt < 4000 && placed < total; attempt++) {
			const x = rng.next() * W;
			const y = rng.next() * H;
			if (!A.canStand(domain, x, y)) continue;
			const i = (y | 0) * W + (x | 0);
			if (wd && wd[i] > 2) continue;
			if (domain === 3 && !(A.walk[i] & 1)) continue;
			if (domain === 1 && attempt < 3000 && aquaMisfit(arch.g[G_DEPTH], arch.g[G_SALT], this.plants.depth[i], this.plants.sal[i]) > AQ_PLACE) continue;
			const clim = gaussFit(this.world.temperature[i], arch.g[G_TEMP], 0.08 + 0.3 * arch.g[G_TOL]);
			const food = arch.g[G_DIET] < 0.6 ? this.plants.edible(i) : 0.3;
			const need = attempt < 3000 ? 0.55 : 0.1;
			if (clim < need || food < 0.05) continue;
			const size = Math.min(total - placed, 4 + Math.floor(rng.next() * 5));
			for (let k = 0; k < size; k++) {
				const cx = x + (rng.next() - 0.5) * 4;
				const cy = y + (rng.next() - 0.5) * 4;
				const ok = A.canStand(domain, cx, cy);
				const idx = A.spawn(sp, genome, 0, ok ? cx : x, ok ? cy : y, 0.8);
				A.age[idx] = Math.floor(A.mature[idx] * (0.6 + rng.next()));
				placed++;
			}
			clusters++;
		}
		sp.category = animalCategory(genome, arch.domain, arch.cls, arch.nic | 0);
		return placed > 0 ? sp : null;
	}

	step() {
		this.tick++;
		this.registry.tick = this.tick;
		const plants = this.plants;
		if (!this.options.seasons) plants.seasonAmp.fill(0);
		else if (this._seasonsWereOff) plants._prepareClimate();
		this._seasonsWereOff = !this.options.seasons;
		plants.seasonsOn = !!this.options.seasons;
		const D = this.disease;
		if (D) {
			D.on = !!this.options.disease;
			if (!D.on) D.clearAll();
		}

		plants.step(this.tick);
		const Wx = this.weather;
		if (Wx) {
			Wx.setOn(!!this.options.weather, this.tick);
			Wx.step(this.tick, this.options.seasons ? plants.season : 0);
		}
		const Dz = this.disasters;
		if (Dz) {
			Dz.setOn(!!this.options.disasters);
			Dz.step(this.tick);
		}
		if (this.bugs) this.bugs.step(this.tick);
		this.animals.step(this.tick);
		if (this.eggs) this.eggs.step(Wx);
		if (D) D.step(this.tick);

		if (this.tick % 20 === 0) {
			if (this.tick % 40 === 0) plants.refreshSpeciesMeans();
			this.animals.refreshSpeciesMeans();
			this._herdStats();
			this._nestStats();
			this._packStats();
			this._nutStats();
			this._dormStats();
			this._socialStats();
			this._lifeStats();
			if (this.bugs && this.tick % 40 === 20) this.bugs.refreshSpeciesMeans();
			if (D) D.refreshSpeciesMeans();
			this._symbStats();
			this._brainStats();
			if (Dz) this.stats.disasters = Dz.stats();
		}
		if (this.tick % MERGE_EVERY === 0) this._mergePass();
		this._computeStats();
		this._logExtinctions();
		if (this.options.migrations && this.tick % 60 === 0) this._migrations();
		if (this.tick % THIRST_EVERY === 0) this._thirstStats();
		if (D && this.tick % DISEASE_EVERY === 0) {
			if (this.options.disease) D.maybeEmerge(this.tick);
			this._diseaseStats();
		}
		if (this.tick % HISTORY_EVERY === 0) this._sampleHistory(false);
	}

	_computeStats() {
		const A = this.animals;
		const s = this.stats;
		const keys = STAT_GROUPS.map((g) => g.key);
		const roles = keys.map((k) => s.roles[k]);
		const counts = new Int32Array(keys.length * 4);
		const bn = new Int32Array(BIRD_NICHES.length);
		const st = s.stages;
		st.juveniles = st.adults = st.elders = 0;
		const sc = new Int32Array(keys.length * 3);
		for (let i = 0; i < A.count; i++) {
			const age = A.age[i];
			const k = age < A.mature[i] ? 0 : age > ELDER_AGE * A.maxAge[i] ? 2 : 1;
			if (k === 0) st.juveniles++;
			else if (k === 2) st.elders++;
			else st.adults++;
			sc[A.cls[i] * 3 + k]++;
			const ri = roleIndex(A.diet[i], A.scav[i]);
			counts[A.cls[i] * 4 + ri]++;
			if (A.cls[i] === CLS_BIRD) bn[A.nic[i] ? 2 : ri === 0 ? 0 : ri === 1 ? 1 : ri === 2 ? 3 : 4]++;
		}
		for (let k = 0; k < BIRD_NICHES.length; k++) s.birdNiches[BIRD_NICHES[k]] = bn[k];
		if (!s.stageCls) s.stageCls = {};
		for (let c = 0; c < keys.length; c++) s.stageCls[keys[c]] = [sc[c * 3], sc[c * 3 + 1], sc[c * 3 + 2]];
		s.birdMigrants = A.birdMigrants;
		for (let c = 0; c < keys.length; c++) {
			const r = roles[c];
			let t = 0;
			for (let k = 0; k < 4; k++) {
				r[ROLE_KEYS[k]] = counts[c * 4 + k];
				t += counts[c * 4 + k];
			}
			s[keys[c]] = t;
		}
		const E = this.eggs;
		if (E) {
			st.eggs = E.count;
			const se = s.eggs;
			se.laid = E.laid;
			se.hatched = E.hatched;
			se.eaten = E.eaten;
			se.failed = E.failed;
		}
		s.territories = A.holders;
		s.thirstDeaths = A.deaths.thirst;
		Object.assign(s.deaths, A.deaths);
		s.plants = this.plants.coverTiles;
		Object.assign(s.plantStages, this.plants.stages, { oldDeaths: this.plants.oldDeaths, germinated: this.plants.germinated, grazedSeedlings: this.plants.grazedSeedlings, clones: this.plants.clones });
		s.plantBiomass = this.plants.totalBiomass;
		s.fruit = this.plants.totalFruit;
		s.fungi = this.plants.fungusTiles;
		s.plantStrat = Object.assign({}, this.plants.strat);
		s.flowers = this.plants.flowerTiles;
		s.litter = this.plants.soil.totalLitter;
		s.carrion = this.plants.soil.totalCarrion;
		s.animals = A.count;
		s.pollination = this.plants.flowerPoll;
		const B = this.bugs;
		if (B) {
			s.bugs = Math.round(B.mass[0] + B.mass[1] + B.mass[2] + B.mass[3]);
			s.pests = B.tiles[0];
			s.detritivores = B.tiles[1];
			s.parasites = B.tiles[2];
			s.pollinators = B.tiles[3];
		}
		const D = this.disease;
		if (D) {
			s.sick = D.sickAnimals;
			s.blight = D.blightSlots;
			s.strains = D.live.size;
			s.diseaseDeaths = D.animalDeaths;
		}
		if (B) s.swarms = B.swarms;
		s.carrionShare = A.scavEnergy > 0 ? A.carrionEnergy / A.scavEnergy : 0;
		const Wx = this.weather;
		if (Wx) {
			const sw = s.weather;
			sw.storms = Wx.stormCount;
			sw.rainTiles = Wx.rainTiles;
			sw.snowTiles = Wx.snowTiles;
			sw.drought = Wx.drought;
			sw.droughts = Wx.droughts;
			s.meanWet = Wx.meanWet;
		}
	}

	_thirstStats() {
		const A = this.animals;
		const last = this._thirstLast;
		const land = A.landDeaths;
		const th = A.deaths.thirst;
		const ring = this._thirstRing;
		const idx = this._thirstIdx;
		ring[idx * 2] = land - last[0];
		ring[idx * 2 + 1] = th - last[1];
		last[0] = land;
		last[1] = th;
		this._thirstIdx = (idx + 1) % THIRST_WINDOW;
		let sumL = 0;
		let sumT = 0;
		for (let k = 0; k < THIRST_WINDOW; k++) {
			sumL += ring[k * 2];
			sumT += ring[k * 2 + 1];
		}
		this.stats.thirstShare = sumL > 0 ? sumT / sumL : 0;
	}

	_herdStats() {
		const R = this.registry;
		let n = 0;
		for (const id of R.living) {
			const sp = R.get(id);
			if (sp.group === 'animal' && sp.population >= HERD_STAT_POP && sp.mean[G_HERD] > HERD_MIN && sp.mean[G_TERR] <= TERR_MIN) n++;
		}
		this.stats.herds = n;
	}

	_packStats() {
		const A = this.animals;
		const s = this.stats;
		let packs = 0;
		let members = 0;
		const by = {};
		for (const g of STAT_GROUPS) by[g.key] = [0, 0];
		for (let i = 0; i < A.count; i++) {
			if (A.pn[i] > 1 && A.pk[i] === A.uid[i]) {
				packs++;
				members += A.pn[i];
				const g = STAT_GROUPS[A.cls[i]];
				if (g) {
					by[g.key][0]++;
					by[g.key][1] += A.pn[i];
				}
			}
		}
		s.packCls = by;
		s.packs = packs;
		s.packSize = packs ? Math.round((members / packs) * 100) / 100 : 0;
		s.packKills = A.packKills;
		s.bigKills = A.bigKills;
		s.mateRefusals = A.mateRefusals;
	}

	_lifeStats() {
		const A = this.animals;
		if (!this.stats.life) this.stats.life = {};
		const s = this.stats.life;
		let tad = 0;
		let lar = 0;
		let cared = 0;
		for (let i = 0; i < A.count; i++) {
			if (!A.alive[i]) continue;
			if (A.lv[i] === 1) tad++;
			else if (A.lv[i] === 2) lar++;
			if (A.cr[i] > 0) cared++;
		}
		const L = A.life;
		s.tadpoles = tad;
		s.larvae = lar;
		s.cared = cared;
		s.metamorphs = L.metamorphs;
		s.careGiven = Math.round(L.careGiven);
		s.granGiven = Math.round(L.granGiven);
		s.granFeeds = L.granFeeds;
		s.juvBug = Math.round(L.juvBug);
		s.shed = L.shed;
		s.ledMig = L.ledMig;
		s.headStarts = L.headStarts;
		s.ledT = L.ledT;
		s.loneT = L.loneT;
		s.ledRate = L.ledT > 0 ? +((L.ledD * 1000) / L.ledT).toFixed(2) : 0;
		s.loneRate = L.loneT > 0 ? +((L.loneD * 1000) / L.loneT).toFixed(2) : 0;
	}

	_symbStats() {
		const A = this.animals;
		const P = this.plants;
		if (!this.stats.symb) this.stats.symb = {};
		const s = this.stats.symb;
		let riding = 0;
		const fxN = [0, 0, 0, 0, 0];
		let loaded = 0;
		const fx = A.fx;
		const gl = A.gl;
		for (let i = 0; i < A.count; i++) {
			if (!A.alive[i]) continue;
			if (A.state[i] === 9) riding++;
			if (fx) fxN[fx[i]]++;
			if (gl && gl[i] > 0.1) loaded++;
		}
		if (A.sleep) {
			const pat = [0, 0, 0, 0];
			const G = A.genome;
			for (let i = 0; i < A.count; i++) if (A.alive[i]) pat[actPattern(G[i * AG + G_ACT])]++;
			const t = A.sleep.sumAsleep + A.sleep.sumAwake;
			this.stats.sleep = Object.assign({}, A.sleep, { asleepShare: t > 0 ? A.sleep.sumAsleep / t : 0, patterns: { diurnal: pat[0], crepuscular: pat[1], nocturnal: pat[2], cathemeral: pat[3] } });
		}
		this.stats.toxins = Object.assign({}, A.toxfx, { nowPoisoned: fxN[1], nowTripping: fxN[2], nowStim: fxN[3], nowCrash: fxN[4], genoLoaded: loaded });
		let models = 0;
		for (let c = 0; c < 6; c++) if (A.modelSp[c]) models++;
		Object.assign(s, A.symb);
		s.cleanerPairs = A.cleanerPairs;
		s.pollPairs = this.bugs ? this.bugs.specPairs : 0;
		s.mimicSp = A.mimicSp;
		s.mimics = A.mimics;
		s.models = models;
		s.riding = riding;
		s.animalSeeded = P.animalSeeded;
		s.dispBonus = Math.round(P.dispBonus * 10) / 10;
	}

	_brainStats() {
		const A = this.animals;
		if (!this.stats.brain) this.stats.brain = {};
		const s = this.stats.brain;
		Object.assign(s, A.brain);
		s.toolGain = Math.round(A.brain.toolGain * 10) / 10;
		s.mean = Math.round(A.brainMean * 1000) / 1000;
		s.cls = Array.from(A.brainCls, (v) => Math.round(v * 1000) / 1000);
		s.toolSp = A.toolSp;
		s.learnedN = A.learnedN;
	}

	_socialStats() {
		const A = this.animals;
		const R = this.registry;
		const s = this.stats.social;
		if (!this.socExposure) this.socExposure = new Float64Array(12);
		const ex = this.socExposure;
		const call = new Map();
		let gs = 0;
		let n = 0;
		for (let i = 0; i < A.count; i++) {
			if (!A.alive[i]) continue;
			gs += A.grp[i];
			n++;
			if (A.diet[i] >= 0.66) continue;
			const id = A.sp[i];
			let c = call.get(id);
			if (c === undefined) {
				const sp = R.get(id);
				c = sp && sp.mean[G_ALARM] > ALARM_MIN ? 1 : 0;
				call.set(id, c);
			}
			ex[A.cls[i] * 2 + c] += 20;
		}
		let solo = 0;
		let colonial = 0;
		let colonies = 0;
		let colonySp = 0;
		for (const id of R.living) {
			const sp = R.get(id);
			if (!sp || sp.group !== 'animal') continue;
			colonies += sp.colonies | 0;
			if (sp.colonies > 0) colonySp++;
			if (sp.population < SOC_STAT_POP || sp.grpMean === undefined) continue;
			if (sp.grpMean < SOLO_GROUP) solo++;
			else if (sp.grpMean >= COLONY_GROUP || sp.colonies > 0) colonial++;
		}
		const eb = A.eatenBy;
		let lq = 0;
		let lc = 0;
		let eq = 0;
		let ec = 0;
		const by = {};
		for (const g of STAT_GROUPS) {
			const k = g.cls * 2;
			lq += eb[k];
			lc += eb[k + 1];
			eq += ex[k];
			ec += ex[k + 1];
			by[g.key] = [ex[k] > 0 ? Math.round((eb[k] / ex[k]) * 1e5) / 100 : -1, ex[k + 1] > 0 ? Math.round((eb[k + 1] / ex[k + 1]) * 1e5) / 100 : -1];
		}
		s.lossCls = by;
		s.quietLoss = eq > 0 ? Math.round((lq / eq) * 1e5) / 100 : 0;
		s.callerLoss = ec > 0 ? Math.round((lc / ec) * 1e5) / 100 : 0;
		s.alarms = A.alarms;
		s.heard = A.alarmHeard;
		s.sentinel = A.sentinel;
		s.dispersals = A.dispersals;
		s.dispSplits = A.dispSplits;
		s.rangeSplits = A.rangeSplits | 0;
		s.rankBlocked = A.rankBlocked;
		s.colonies = colonies;
		s.colonySp = colonySp;
		s.solitary = solo;
		s.colonial = colonial;
		s.meanGroup = n ? Math.round((gs / n) * 100) / 100 : 0;
	}

	_dormStats() {
		const A = this.animals;
		const s = this.stats.dormancy;
		const k = [0, 0, 0, 0, 0];
		const c = [0, 0, 0, 0, 0, 0];
		for (let i = 0; i < A.count; i++) {
			const d = A.dorm[i];
			if (!d || !A.alive[i]) continue;
			k[d]++;
			c[A.cls[i]]++;
		}
		s.hib = k[1];
		s.brum = k[2];
		s.aest = k[3];
		s.torpor = k[4];
		s.total = k[1] + k[2] + k[3] + k[4];
		s.entered = A.dormEntered;
		s.starved = A.dormStarved;
		s.eggDiapause = this.eggs ? this.eggs.diapause : 0;
		s.diaHatched = this.eggs ? this.eggs.diaHatched : 0;
		s.bugReserve = this.bugs ? this.bugs.reserve : 0;
		s.bugWoke = this.bugs ? this.bugs.reserveWoke : 0;
		s.seedDormant = this.plants.stages.seedDormant | 0;
		for (const g of STAT_GROUPS) this.stats.dormCls[g.key] = c[g.cls];
	}

	_nutStats() {
		const A = this.animals;
		const s = this.stats.nutrition;
		let lean = 0;
		let fit = 0;
		let heavy = 0;
		let obese = 0;
		let fat = 0;
		let def = 0;
		let dp = 0;
		let dm = 0;
		for (let i = 0; i < A.count; i++) {
			if (!A.alive[i]) continue;
			const f = A.fat[i] / (A.emax[i] * A.gf[i]);
			fat += f;
			if (f < FAT_LEAN) lean++;
			else if (f < FAT_HEAVY) fit++;
			else if (f < FAT_OBESE) heavy++;
			else obese++;
			const p = A.nProt[i] < DEFICIT;
			const m = A.nMin[i] < DEFICIT;
			if (p) dp++;
			if (m) dm++;
			if (p || m) def++;
		}
		const n = lean + fit + heavy + obese;
		s.lean = lean;
		s.fit = fit;
		s.heavy = heavy;
		s.obese = obese;
		s.meanFat = n ? Math.round((fat / n) * 1000) / 1000 : 0;
		s.deficient = def;
		s.defShare = n ? Math.round((def / n) * 1000) / 1000 : 0;
		s.defProt = dp;
		s.defMin = dm;
		s.caFailed = this.eggs ? this.eggs.caFailed : 0;
		s.caClutches = A.caClutches;
		s.fatBurned = Math.round(A.fatBurned);
	}

	_diseaseStats() {
		const A = this.animals;
		const s = this.stats;
		const d = A.deaths;
		let total = 0;
		for (const k in d) total += d[k];
		const last = this._deathLast;
		const dt = total >= last[0] ? total - last[0] : total;
		const dd = d.disease >= last[1] ? d.disease - last[1] : d.disease;
		last[0] = total;
		last[1] = d.disease;
		const ring = this._deathRing;
		const idx = this._deathIdx;
		ring[idx * 2] = dt;
		ring[idx * 2 + 1] = dd;
		this._deathIdx = (idx + 1) % DISEASE_WINDOW;
		let sumT = 0;
		let sumD = 0;
		for (let k = 0; k < DISEASE_WINDOW; k++) {
			sumT += ring[k * 2];
			sumD += ring[k * 2 + 1];
		}
		s.diseaseShare = sumT > 0 ? sumD / sumT : 0;
		const R = this.registry;
		const sick = this.disease.speciesStrain;
		const peaks = this._obPeak;
		const list = this._outbreaks;
		for (const [id, pk] of peaks) {
			const sp = R.get(id);
			if (!sick.has(id) || sp.population <= 0) {
				if (sp.population <= 0 && !sp.merged && pk.from >= OUTBREAK_MIN_POP) list.push({ tick: this.tick, id, from: pk.from, to: 0, drop: 1 });
				peaks.delete(id);
			}
		}
		for (const id of sick.keys()) {
			const sp = R.get(id);
			if (!sp || sp.group !== 'animal') continue;
			let pk = peaks.get(id);
			if (!pk) {
				pk = { from: sp.population, low: sp.population };
				peaks.set(id, pk);
			}
			if (sp.population > pk.from) pk.from = pk.low = sp.population;
			if (sp.population < pk.low) pk.low = sp.population;
			if (pk.from >= OUTBREAK_MIN_POP && pk.low < pk.from) list.push({ tick: this.tick, id, from: pk.from, to: pk.low, drop: 1 - pk.low / pk.from });
		}
		let w = 0;
		let worst = null;
		for (const o of list) {
			if (this.tick - o.tick >= YEAR_TICKS) continue;
			list[w++] = o;
			if (!worst || o.drop > worst.drop) worst = o;
		}
		list.length = w;
		s.worstOutbreak = worst;
	}

	_mergePass() {
		const R = this.registry;
		const D = this.disease;
		const layers = { plant: this.plants, animal: this.animals, bug: this.bugs, pathogen: D };
		for (const sp of R.livingList()) {
			if (sp.origin || !sp.parentId || sp.population > MERGE_POP[sp.group] || this.tick - sp.createdTick >= MERGE_MAX_AGE) continue;
			const parent = R.get(sp.parentId);
			const layer = layers[sp.group];
			if (!layer || parent.population <= 0) continue;
			layer.reassignSpecies(sp, parent);
			if (sp.group === 'animal' && this.eggs) this.eggs.reassignSpecies(sp, parent);
			if (D && (sp.group === 'plant' || sp.group === 'animal')) D.remapHost(sp, parent);
			R.merge(sp, parent);
		}
	}

	_logExtinctions() {
		const list = this.registry.recentlyExtinct;
		if (!list.length) return;
		for (const sp of list) {
			const notable = sp.group === 'pathogen' ? sp.peak >= 15 : sp.group === 'plant' || sp.group === 'bug' ? sp.peak >= 60 : sp.peak >= 12;
			if (notable && !sp.merged) this.log.push(this.tick, 'extinction', `${sp.name} ${sp.group === 'pathogen' ? 'burned out' : 'went extinct'} (peak ${sp.peak})`, sp.id);
			sp.pushHistory(this.tick, 0);
		}
		list.length = 0;
	}

	_migrations() {
		const s = this.stats;
		const R = s.roles;
		const pick = (cls, role, domain, nic = 0) => {
			const opts = ANIMAL_ARCHETYPES.filter((a) => a.cls === cls && ROLE_KEYS[roleIndex(a.g[G_DIET], a.g[G_SCAV])] === role && (!domain || a.domain === domain) && (a.nic | 0) === nic);
			return opts.length ? opts[Math.floor(this.rng.next() * opts.length)] : null;
		};
		const tryIntro = (arch, why) => {
			if (!arch) return;
			const sp = this._introduce(arch, 'migrated', Math.ceil(arch.n * 0.6));
			if (sp) this.log.push(this.tick, 'migration', `${sp.name} migrated in — ${why}`, sp.id);
		};
		const m = R.mammal;
		if (m.herb < HERB_RESCUE) tryIntro(pick(CLS_MAMM, 'herb', 'land'), 'grazers had vanished');
		const f = R.fish;
		if (s.fish < 20 || f.herb === 0) tryIntro(pick(CLS_FISH, 'herb'), 'the waters were empty');
		const prey = { land: m.herb + m.omni + R.reptile.herb + R.invert.herb, water: f.herb + f.omni + R.invert.herb };
		const A = this.animals;
		const live = new Int32Array(STAT_GROUPS.length * 4 * 8);
		for (let i = 0; i < A.count; i++) live[(A.cls[i] * 4 + roleIndex(A.diet[i], A.scav[i])) * 8 + A.domain[i]]++;
		const done = new Set(['mammal.herb.land.0', 'fish.herb.water.0']);
		for (const a of ANIMAL_ARCHETYPES) {
			const g = STAT_GROUPS.find((x) => x.cls === a.cls);
			const ri = roleIndex(a.g[G_DIET], a.g[G_SCAV]);
			const role = ROLE_KEYS[ri];
			const nic = a.nic | 0;
			const key = g.key + '.' + role + '.' + (a.domain || 'land') + '.' + nic;
			if (done.has(key)) continue;
			done.add(key);
			const bird = a.cls === CLS_BIRD;
			if (bird ? s.birdNiches[BIRD_NICHES[birdNiche(a.g[G_DIET], a.g[G_SCAV], nic)]] >= BIRD_REVIVE : live[(a.cls * 4 + ri) * 8 + domainIndex(a.domain)] > 0) continue;
			const food = role === 'herb' ? Infinity : prey[a.domain === 'water' || nic ? 'water' : 'land'];
			if (food < MIGRATE_PREY) continue;
			const why = bird ? (nic ? 'fish in the shallows drew fishing birds' : role === 'carn' ? 'unchecked prey drew raptors' : role === 'scav' ? 'carcasses drew carrion birds' : 'the skies were empty') : role === 'carn' ? 'unchecked prey drew predators' : role === 'scav' ? 'carcasses drew scavengers' : `the ${g.label.toLowerCase()} had vanished`;
			tryIntro(pick(a.cls, role, a.domain, nic), why);
		}
		const B = this.bugs;
		if (B) for (let k = 0; k < 4; k++) if (B.tiles[k] === 0) B.reintroduce(k);
	}

	_nestStats() {
		const A = this.animals;
		const E = this.eggs;
		const W = this.world.width;
		const nests = new Set();
		const dens = new Set();
		let nesters = 0;
		let natal = 0;
		for (let i = 0; i < A.count; i++) {
			const h = A.home[i];
			if (!h) continue;
			if (h === 3) {
				natal++;
				continue;
			}
			nesters++;
			const t = (A.ny[i] | 0) * W + (A.nx[i] | 0);
			if (h === 1) nests.add(t);
			else dens.add(t);
		}
		let ne = 0;
		if (E) for (let e = 0; e < E.count; e++) if (E.nst[e]) ne++;
		const s = this.stats.nests;
		s.nests = nests.size;
		s.dens = dens.size;
		s.nesters = nesters;
		s.natal = natal;
		s.nestEggs = ne;
		s.eggsPerNest = nests.size ? +(ne / nests.size).toFixed(2) : 0;
		s.raids = E ? E.raids : 0;
		s.repelled = E ? E.repelled : 0;
		s.paraFailed = E ? E.paraFailed : 0;
	}

	_sampleHistory() {
		const h = this.history;
		h.tick.push(this.tick);
		h.plants.push(Math.round(this.stats.plantBiomass));
		h.bugs.push(this.stats.bugs);
		h.sick.push(this.stats.sick);
		h.thirstDeaths.push(this.stats.thirstDeaths);
		h.herds.push(this.stats.herds);
		h.territories.push(this.stats.territories);
		h.eggs.push(this.stats.stages.eggs);
		h.nests.push(this.stats.nests.nests);
		h.dens.push(this.stats.nests.dens);
		h.packs.push(this.stats.packs);
		h.packSize.push(this.stats.packSize);
		h.nutrition.push(Math.round(this.stats.nutrition.defShare * 100));
		h.meanFat.push(this.stats.nutrition.meanFat);
		h.dormancy.push(this.stats.dormancy.total);
		if (h.alarms) h.alarms.push(this.stats.social.alarms);
		if (h.disasters) h.disasters.push(this.stats.disasters ? this.stats.disasters.scarTiles : 0);
		if (h.brain) h.brain.push(this.stats.brain ? this.stats.brain.mean : 0);
		if (h.symb) h.symb.push(this.stats.symb.cleanerPairs + this.stats.symb.pollPairs + this.stats.symb.mimicSp);
		for (const k of BIRD_NICHES) h['birdNiche.' + k].push(this.stats.birdNiches[k]);
		for (const g of STAT_GROUPS) {
			h[g.key].push(this.stats[g.key]);
			const r = this.stats.roles[g.key];
			for (const k of ROLE_KEYS) h[g.key + '.' + k].push(r[k]);
		}
		if (h.tick.length > 800) {
			for (const k of Object.keys(h)) h[k] = h[k].filter((_, idx) => idx % 2 === 0);
		}
		for (const id of this.registry.living) {
			const sp = this.registry.get(id);
			sp.pushHistory(this.tick, sp.population);
		}
	}

	seasonName() {
		const phase = ((this.tick % YEAR_TICKS) + YEAR_TICKS) % YEAR_TICKS / YEAR_TICKS;
		return ['Spring', 'Summer', 'Autumn', 'Winter'][Math.floor(phase * 4)];
	}

	year() {
		return Math.floor(this.tick / YEAR_TICKS) + 1;
	}

	applyGod(action) {
		if (typeof GodTools !== 'function') return { ok: false, count: 0 };
		if (!this.god) this.god = new GodTools();
		return this.god.apply(this, action);
	}

	godVersion() {
		return this.god ? this.god.version : this._godVersion || 0;
	}
}
