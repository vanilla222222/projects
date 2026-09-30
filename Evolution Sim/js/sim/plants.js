const PG = 15;
const PLANT_WEIGHTS = [1.4, 1.4, 0.6, 1.2, 0.8, 0.5, 0.7, 0.7, 0.6, 0.5, 0.6, 0.6, 0.4, 0.6, 0.3];
const PLANT_SPECIATION = 0.13;
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
];

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
		formCap: 0.8 + 2.4 * wood,
		growth: 0.05 * (1 - 0.72 * wood) * (1 - 0.35 * tox) * (1 - 0.12 * disp) * (1 - 0.3 * shade) * (1 - 0.2 * root) * (1 - 0.25 * fruiting - 0.15 * sweet) * (1 - DEFENCE_COST * g[o + 13]) * (1 - BLIGHT_RES_COST * g[o + 14]),
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
	if (domain === 'water') return m > 0.45 ? (wood > 0.25 ? 'kelp' : 'plankton') : 'algae';
	if (wood < 0.3) {
		if (g[11] > 0.55) return 'flower';
		return t < 0.3 ? 'moss' : m > 0.75 ? 'reed' : 'grass';
	}
	if (wood < 0.62) return t > 0.62 && m < 0.32 ? 'cactus' : g[8] > 0.5 ? 'berrybush' : 'shrub';
	if (g[8] > 0.5) return 'fruittree';
	if (t < 0.38) return 'conifer';
	if (t > 0.7 && m > 0.6) return 'palm';
	return 'tree';
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
	plankton: 'Plankton',
	fruittree: 'Fruit tree',
	berrybush: 'Berry bush',
	flower: 'Wildflower',
	puffball: 'Puffball',
	inkcap: 'Inkcap',
	toadstool: 'Toadstool',
	truffle: 'Truffle',
};

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
		this.fruitEaten = 0;
		this.poisoned = [0, 0, 0];
		this.totalFruit = 0;
		this.fungusTiles = 0;
		this.flowerTiles = 0;
		this.seasonsOn = true;
		this.season = 0;
		this.bloomNow = 0.5;
		this.fruitNow = 0.5;
		this.soil = new SoilLayer(world);
		this._scratch = new Float32Array(PG);
		this._prepareClimate();
		this._seed();
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
		sp.icon = category;
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
		this.cap[p] = this.capFor(t, i);
		const floor = this.cap[p] * 0.55 * t.wood * t.wood;
		if (kind === 0) {
			this.growth[p] = t.growth * (1 - 0.2 * t.bloom);
			this.floor[p] = floor * (1 + 0.2 * (1 - t.fruiting));
			this.myco[p] = 0;
			this._fruitK[p] = !this.water[i] && t.wood >= 0.3 && t.fruiting > 0.2 ? t.fruiting * FRUIT_FRAC * FRUIT_WIND : 0;
			this._bloomK[p] = t.bloom * FLOWER_SEED_BONUS * FRUIT_WIND;
		} else {
			this.growth[p] = t.growth;
			this.floor[p] = floor;
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
		const a = skipUnder ? 0 : this._bite(u, amount, reach);
		const b = a < amount ? this._bite(i, amount - a, reach) : 0;
		const take = a + b;
		this.grazeTox = take > 0 ? (a * this.tox[u] + b * this.tox[i]) / take : 0;
		if (a > 0 && this.kind[u]) {
			this.grazeFungus = this.species[u];
			this.grazeToxType = toxinType(this.genome, u * PG);
			this.grazePotency = this.tox[u];
		} else this.grazeFungus = 0;
		return take;
	}

	damage(i, amount) {
		const u = this.n + i;
		const health = this.health;
		let a = 0;
		if (this.species[u] && !this.kind[u]) {
			a = this._bite(u, amount, 0);
			if (a > 0) {
				const h = health[u] - a * PEST_HEALTH;
				health[u] = h > 0 ? h : 0;
			}
		}
		let b = 0;
		if (a < amount && this.species[i]) {
			b = this._bite(i, amount - a, 0);
			if (b > 0) {
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
		return a + b;
	}

	step(tick) {
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
				if (under && species[i]) {
					const cb = bio[i];
					const sf = SHADE_MAX * (cb < SHADE_FULL_BIOMASS ? cb / SHADE_FULL_BIOMASS : 1);
					light = 1 - sf * (1 - shade[p]);
				}
				K = cap[p] * light;
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
			const sm = 1 + seasonAmp[i] * season;
			const r = growth[p] * (sm > 0.05 ? sm : 0.05) * light * (0.35 + 0.65 * h) * tax;
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
			const fq = fruitK[p];
			if (fq > 0) {
				const target = fq * b * fruitNow * h * (POLL_FRUIT_BASE + (1 - POLL_FRUIT_BASE) * poll[i]);
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
			if (h >= HEALTH_SPREAD_MIN && fullness > 0.3 && rng.next() < (0.006 + 0.045 * disp[p]) * fullness * (1 + bloomK[p] * bloomNow * (POLL_WIND + (1 - POLL_WIND) * poll[i]))) {
				this._spread(p, i, W, H, tick);
			}
		}
		let cover = 0;
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
		this.version++;
	}

	_spread(p, i, W, H, tick) {
		const rng = this.rng;
		const x = i % W;
		const y = (i / W) | 0;
		const reach = 1 + Math.floor(rng.next() * (1 + this.disp[p] * 4));
		const tx = x + Math.round((rng.next() * 2 - 1) * reach);
		const ty = y + Math.round((rng.next() * 2 - 1) * reach);
		if (tx < 0 || ty < 0 || tx >= W || ty >= H) return;
		const j = ty * W + tx;
		if (j === i || this.water[j] !== this.water[i]) return;

		const parentId = this.species[p];
		const same = this.species[p < this.n ? j : this.n + j] === parentId;
		if (same && rng.next() >= 0.5) return;
		const child = this._scratch;
		mutateGenes(this.genome, p * PG, child, 0, PG, rng, 0.2, 0.025);
		this.plantSeed(j, child, this.registry.get(parentId), tick);
	}

	plantSeed(j, genome, parentSp, tick) {
		if (!parentSp) return false;
		const rng = this.rng;
		const kind = parentSp.kind | 0;
		const wet = this.water[j];
		if (wet !== (parentSp.domain === 'water' ? 1 : 0)) return false;
		if (kind === 1) {
			genome[8] = 0;
			genome[9] = 0;
		}
		const bound = (0.8 + 2.4 * genome[3]) * (1 - 0.3 * genome[2]) * this.habit[j];
		if (bound < 0.04) return false;
		const pj = slotOf(genome, wet, 0, kind) * this.n + j;
		const parentId = parentSp.id;
		const resident = this.species[pj];
		let resK = 0;
		let resStrength = 0;
		const mixed = resident && pj >= this.n && this.kind[pj] !== kind && this.species[j];
		const sf = mixed ? SHADE_MAX * (this.biomass[j] < SHADE_FULL_BIOMASS ? this.biomass[j] / SHADE_FULL_BIOMASS : 1) : 0;
		if (resident) {
			resK = this.kind[pj] ? this.cap[pj] * this._fungusK(this.myco[pj] === 1, j) : this.cap[pj] * (1 - sf * (1 - this.shade[pj]));
			resStrength = resK * (0.45 + 0.55 * this.biomass[pj] / Math.max(resK, 1e-6)) * (0.5 + 0.5 * this.health[pj]);
			if (resident === parentId) {
				if (bound <= resK * 1.02) return false;
			} else if (bound * 0.85 <= resStrength) return false;
		}
		const tol = 0.09 + 0.22 * genome[2];
		let childK = bound * gaussFit(this.world.temperature[j], genome[0], tol) * gaussFit(this.moistAt(j), genome[1], tol * 1.2);
		if (kind === 1) childK *= this._fungusK(genome[11] > 0.5, j);
		else childK *= 1 - sf * (1 - genome[6]);
		if (!(childK >= 0.04)) return false;

		if (resident === parentId) {
			if (childK > resK * 1.02) {
				this._assign(pj, parentSp, genome, tick, false);
				return true;
			}
			return false;
		}
		if (resident) {
			const invStrength = childK * 0.85;
			if (invStrength <= resStrength) return false;
			if (rng.next() > (invStrength - resStrength) / invStrength) return false;
		}
		this._assign(pj, parentSp, genome, tick, true);
		return true;
	}

	_assign(pj, parentSp, child, tick, fresh) {
		let sp = parentSp;
		const j = pj < this.n ? pj : pj - this.n;
		const domain = this.water[j] ? 'water' : 'land';
		if (geneDistance(child, 0, parentSp.genome, 0, PLANT_WEIGHTS) > PLANT_SPECIATION) {
			sp = this.registry.matchDaughter(parentSp, child, PLANT_WEIGHTS, PLANT_SPECIATION * 0.8);
			if (!sp) {
				sp = this._newSpecies(child, domain, parentSp, tick, null);
				this.log.push(tick, 'speciation', `${sp.name} (${PLANT_CATEGORY_LABEL[sp.category]}) branched from ${parentSp.name}`, sp.id);
			}
		}
		if (fresh && this.species[pj]) this.soil.returnMatter(j, this.biomass[pj] + this.fruit[pj]);
		const keep = fresh ? 0.04 : this.biomass[pj];
		this._set(pj, sp, child, 0);
		this.biomass[pj] = Math.min(keep, this.cap[pj]);
	}

	refreshSpeciesMeans() {
		const sums = new Map();
		for (let p = 0; p < 2 * this.n; p++) {
			const id = this.species[p];
			if (!id) continue;
			let s = sums.get(id);
			if (!s) {
				s = new Float64Array(PG + 4);
				sums.set(id, s);
			}
			const base = p * PG;
			for (let k = 0; k < PG; k++) s[k] += this.genome[base + k];
			s[PG] += 1;
			s[PG + 1] += this.biomass[p];
			s[PG + 2] += this.health[p];
			if (this.blight[p]) s[PG + 3] += 1;
		}
		for (const [id, s] of sums) {
			const sp = this.registry.get(id);
			for (let k = 0; k < PG; k++) sp.mean[k] = s[k] / s[PG];
			sp.biomass = s[PG + 1];
			sp.health = s[PG + 2] / s[PG];
			sp.infected = s[PG + 3];
			sp.category = plantCategory(sp.mean, sp.domain, sp.kind | 0);
			sp.icon = sp.category;
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
]);
