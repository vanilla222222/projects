const STAT_GROUPS = [
	{ key: 'landHerb', label: 'Grazers', domain: 0, role: 'herbivore', icon: 'deer' },
	{ key: 'landOmni', label: 'Omnivores', domain: 0, role: 'omnivore', icon: 'boar' },
	{ key: 'landCarn', label: 'Predators', domain: 0, role: 'carnivore', icon: 'wolf' },
	{ key: 'waterHerb', label: 'Fish', domain: 1, role: 'herbivore', icon: 'fish' },
	{ key: 'waterOmni', label: 'Scavengers', domain: 1, role: 'omnivore', icon: 'crab' },
	{ key: 'waterCarn', label: 'Sea predators', domain: 1, role: 'carnivore', icon: 'shark' },
];

const HISTORY_EVERY = 5;

class Ecosystem {
	constructor(world, seed, options = {}) {
		this.world = world;
		this.seed = seed;
		this.options = Object.assign({ migrations: true, seasons: true, disease: true }, options);
		this.rng = new FastRng(seed * 7 + 11);
		this.tick = 0;
		this.log = new EventLog();
		this.registry = new SpeciesRegistry(new FastRng(seed + 99));
		this.plants = new PlantLayer(world, this.registry, new FastRng(seed + 555), this.log);
		this.animals = new AnimalPool(world, this.plants, this.registry, new FastRng(seed + 777), this.log);
		this.stats = { plants: 0, plantBiomass: 0, fruit: 0, fungi: 0, flowers: 0, litter: 0, bugs: 0, pests: 0, detritivores: 0, parasites: 0, pollinators: 0, pollination: 0, sick: 0, blight: 0, strains: 0, diseaseDeaths: 0 };
		this.history = { tick: [], plants: [], bugs: [], sick: [] };
		for (const g of STAT_GROUPS) {
			this.stats[g.key] = 0;
			this.history[g.key] = [];
		}
		this.historyStep = HISTORY_EVERY;
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
		const domain = arch.domain === 'water' ? 1 : 0;
		const genome = Float32Array.from(arch.g);
		const sp = A.newSpecies(genome, 0, arch.domain, null, this.tick, origin);
		const total = count || arch.n;
		let placed = 0;
		let clusters = 0;
		for (let attempt = 0; attempt < 4000 && placed < total; attempt++) {
			const x = rng.next() * W;
			const y = rng.next() * H;
			if (!A.canStand(domain, x, y)) continue;
			const i = (y | 0) * W + (x | 0);
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
		sp.category = animalCategory(genome, arch.domain);
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
		if (this.bugs) this.bugs.step(this.tick);
		this.animals.step(this.tick);
		if (D) D.step(this.tick);

		if (this.tick % 20 === 0) {
			plants.refreshSpeciesMeans();
			this.animals.refreshSpeciesMeans();
			if (this.bugs) this.bugs.refreshSpeciesMeans();
			if (D) D.refreshSpeciesMeans();
		}
		this._computeStats();
		this._logExtinctions();
		if (this.options.migrations && this.tick % 60 === 0) this._migrations();
		if (this.tick % HISTORY_EVERY === 0) this._sampleHistory(false);
	}

	_computeStats() {
		const A = this.animals;
		const s = this.stats;
		for (const g of STAT_GROUPS) s[g.key] = 0;
		for (let i = 0; i < A.count; i++) {
			const d = A.diet[i];
			const role = d < 0.33 ? 'Herb' : d < 0.66 ? 'Omni' : 'Carn';
			s[(A.domain[i] ? 'water' : 'land') + role]++;
		}
		s.plants = this.plants.coverTiles;
		s.plantBiomass = this.plants.totalBiomass;
		s.fruit = this.plants.totalFruit;
		s.fungi = this.plants.fungusTiles;
		s.flowers = this.plants.flowerTiles;
		s.litter = this.plants.soil.totalLitter;
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
	}

	_logExtinctions() {
		const list = this.registry.recentlyExtinct;
		if (!list.length) return;
		for (const sp of list) {
			const notable = sp.group === 'pathogen' ? sp.peak >= 15 : sp.group === 'plant' || sp.group === 'bug' ? sp.peak >= 60 : sp.peak >= 12;
			if (notable) this.log.push(this.tick, 'extinction', `${sp.name} ${sp.group === 'pathogen' ? 'burned out' : 'went extinct'} (peak ${sp.peak})`, sp.id);
			sp.pushHistory(this.tick, 0);
		}
		list.length = 0;
	}

	_migrations() {
		const s = this.stats;
		const pick = (domain, test) => {
			const opts = ANIMAL_ARCHETYPES.filter((a) => a.domain === domain && test(a.g[G_DIET]));
			return opts[Math.floor(this.rng.next() * opts.length)];
		};
		const tryIntro = (arch, why) => {
			const sp = this._introduce(arch, 'migrated', Math.ceil(arch.n * 0.6));
			if (sp) this.log.push(this.tick, 'migration', `${sp.name} migrated in — ${why}`, sp.id);
		};
		if (s.landHerb + s.landOmni < 20) tryIntro(pick('land', (d) => d < 0.33), 'grazers had vanished');
		else if (s.landCarn === 0 && s.landHerb > 250) tryIntro(pick('land', (d) => d > 0.66), 'unchecked prey drew predators');
		if (s.waterHerb + s.waterOmni < 20) tryIntro(pick('water', (d) => d < 0.33), 'the waters were empty');
		else if (s.waterCarn === 0 && s.waterHerb > 250) tryIntro(pick('water', (d) => d > 0.66), 'unchecked prey drew predators');
		const B = this.bugs;
		if (B) for (let k = 0; k < 4; k++) if (B.tiles[k] === 0) B.reintroduce(k);
		if (this.disease && this.options.disease) this.disease.maybeEmerge(this.tick);
	}

	_sampleHistory() {
		const h = this.history;
		h.tick.push(this.tick);
		h.plants.push(Math.round(this.stats.plantBiomass));
		h.bugs.push(this.stats.bugs);
		h.sick.push(this.stats.sick);
		for (const g of STAT_GROUPS) h[g.key].push(this.stats[g.key]);
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
