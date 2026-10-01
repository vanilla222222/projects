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
const BIRD_REVIVE = 5;

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

class Ecosystem {
	constructor(world, seed, options = {}) {
		this.world = world;
		this.seed = seed;
		this.options = Object.assign({ migrations: true, seasons: true, disease: true, weather: true }, options);
		this.rng = new FastRng(seed * 7 + 11);
		this.tick = 0;
		this.log = new EventLog();
		this.registry = new SpeciesRegistry(new FastRng(seed + 99));
		this.plants = new PlantLayer(world, this.registry, new FastRng(seed + 555), this.log);
		this.animals = new AnimalPool(world, this.plants, this.registry, new FastRng(seed + 777), this.log);
		this.stats = { plants: 0, plantBiomass: 0, fruit: 0, fungi: 0, flowers: 0, litter: 0, carrion: 0, bugs: 0, pests: 0, detritivores: 0, parasites: 0, pollinators: 0, pollination: 0, sick: 0, blight: 0, strains: 0, diseaseDeaths: 0, diseaseShare: 0, worstOutbreak: null, swarms: 0, carrionShare: 0, weather: { storms: 0, rainTiles: 0, snowTiles: 0, drought: false, droughts: 0 }, meanWet: 0, thirstDeaths: 0, thirstShare: 0, herds: 0, territories: 0, deaths: {}, stages: { eggs: 0, juveniles: 0, adults: 0, elders: 0 }, eggs: { laid: 0, hatched: 0, eaten: 0, failed: 0 }, plantStages: { seedTiles: 0, seedlings: 0, mature: 0, old: 0, oldDeaths: 0, germinated: 0, grazedSeedlings: 0 } };
		this.history = { tick: [], plants: [], bugs: [], sick: [], thirstDeaths: [], herds: [], territories: [], eggs: [] };
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
		for (const k of BIRD_NICHES) {
			this.stats.birdNiches[k] = 0;
			this.history['birdNiche.' + k] = [];
		}
		this.stats.roles = {};
		for (const g of STAT_GROUPS) {
			this.stats[g.key] = 0;
			this.stats.roles[g.key] = { herb: 0, omni: 0, carn: 0, scav: 0 };
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
		this.log.push(0, 'info', 'A new world begins.');
		this._computeStats();
		this._sampleHistory(true);
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
		if (this.bugs) this.bugs.step(this.tick);
		this.animals.step(this.tick);
		if (this.eggs) this.eggs.step(Wx);
		if (D) D.step(this.tick);

		if (this.tick % 20 === 0) {
			plants.refreshSpeciesMeans();
			this.animals.refreshSpeciesMeans();
			this._herdStats();
			this._packStats();
			if (this.bugs) this.bugs.refreshSpeciesMeans();
			if (D) D.refreshSpeciesMeans();
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
		for (let i = 0; i < A.count; i++) {
			const age = A.age[i];
			if (age < A.mature[i]) st.juveniles++;
			else if (age > ELDER_AGE * A.maxAge[i]) st.elders++;
			else st.adults++;
			const ri = roleIndex(A.diet[i], A.scav[i]);
			counts[A.cls[i] * 4 + ri]++;
			if (A.cls[i] === CLS_BIRD) bn[A.nic[i] ? 2 : ri === 0 ? 0 : ri === 1 ? 1 : ri === 2 ? 3 : 4]++;
		}
		for (let k = 0; k < BIRD_NICHES.length; k++) s.birdNiches[BIRD_NICHES[k]] = bn[k];
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
		Object.assign(s.plantStages, this.plants.stages, { oldDeaths: this.plants.oldDeaths, germinated: this.plants.germinated, grazedSeedlings: this.plants.grazedSeedlings });
		s.plantBiomass = this.plants.totalBiomass;
		s.fruit = this.plants.totalFruit;
		s.fungi = this.plants.fungusTiles;
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
		h.packs.push(this.stats.packs);
		h.packSize.push(this.stats.packSize);
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
}
