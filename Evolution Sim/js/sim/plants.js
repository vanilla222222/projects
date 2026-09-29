const PG = 6;
const PLANT_WEIGHTS = [1.4, 1.4, 0.6, 1.2, 0.8, 0.5];
const PLANT_SPECIATION = 0.13;
const YEAR_TICKS = 480;

const PLANT_ARCHETYPES = [
	{ g: [0.82, 0.12, 0.5, 0.45, 0.35, 0.4], domain: 'land' },
	{ g: [0.72, 0.35, 0.5, 0.08, 0.15, 0.7], domain: 'land' },
	{ g: [0.8, 0.82, 0.4, 0.9, 0.3, 0.3], domain: 'land' },
	{ g: [0.52, 0.65, 0.5, 0.85, 0.2, 0.3], domain: 'land' },
	{ g: [0.5, 0.42, 0.55, 0.1, 0.1, 0.7], domain: 'land' },
	{ g: [0.52, 0.5, 0.5, 0.5, 0.25, 0.5], domain: 'land' },
	{ g: [0.26, 0.58, 0.5, 0.85, 0.2, 0.35], domain: 'land' },
	{ g: [0.14, 0.42, 0.6, 0.05, 0.1, 0.6], domain: 'land' },
	{ g: [0.6, 0.88, 0.5, 0.2, 0.1, 0.6], domain: 'land' },
	{ g: [0.42, 0.2, 0.55, 0.3, 0.3, 0.55], domain: 'land' },
	{ g: [0.55, 0.15, 0.6, 0.05, 0.1, 0.8], domain: 'water' },
	{ g: [0.45, 0.5, 0.6, 0.35, 0.15, 0.6], domain: 'water' },
	{ g: [0.7, 0.75, 0.6, 0.05, 0.05, 0.9], domain: 'water' },
];

function plantTraitsFrom(g, o = 0) {
	const niche = g[o + 2];
	const wood = g[o + 3];
	const tox = g[o + 4];
	const disp = g[o + 5];
	return {
		prefTemp: g[o],
		prefMoist: g[o + 1],
		tol: 0.09 + 0.22 * niche,
		peak: 1 - 0.3 * niche,
		wood,
		tox,
		disp,
		formCap: 0.8 + 2.4 * wood,
		growth: 0.05 * (1 - 0.72 * wood) * (1 - 0.35 * tox) * (1 - 0.12 * disp),
	};
}

function plantCategory(g, domain) {
	const t = g[0];
	const m = g[1];
	const wood = g[3];
	if (domain === 'water') return m > 0.45 ? (wood > 0.25 ? 'kelp' : 'plankton') : 'algae';
	if (wood < 0.3) return t < 0.3 ? 'moss' : m > 0.75 ? 'reed' : 'grass';
	if (wood < 0.62) return t > 0.62 && m < 0.32 ? 'cactus' : 'shrub';
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
};

class PlantLayer {
	constructor(world, registry, rng, log) {
		this.world = world;
		this.registry = registry;
		this.rng = rng;
		this.log = log;
		const n = world.width * world.height;
		this.n = n;
		this.species = new Int32Array(n);
		this.biomass = new Float32Array(n);
		this.cap = new Float32Array(n);
		this.growth = new Float32Array(n);
		this.floor = new Float32Array(n);
		this.tox = new Float32Array(n);
		this.disp = new Float32Array(n);
		this.genome = new Float32Array(n * PG);
		this.water = new Uint8Array(n);
		this.depth = new Float32Array(n);
		this.habit = new Float32Array(n);
		this.seasonAmp = new Float32Array(n);
		this.version = 0;
		this.totalBiomass = 0;
		this.coverTiles = 0;
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
		const founders = PLANT_ARCHETYPES.map((a) => ({ ...a, t: plantTraitsFrom(a.g), sp: null }));
		for (let i = 0; i < this.n; i++) {
			const domain = this.water[i] ? 'water' : 'land';
			let best = null;
			let bestK = 0;
			for (const f of founders) {
				if (f.domain !== domain) continue;
				const k = this.capFor(f.t, i) * (0.7 + 0.6 * this.rng.next());
				if (k > bestK) {
					bestK = k;
					best = f;
				}
			}
			if (!best || bestK < 0.06 || this.rng.next() > 0.45) continue;
			if (!best.sp) {
				best.sp = this._newSpecies(best.g, best.domain, null, 0, 'founder');
			}
			this._set(i, best.sp, best.g, 0);
			this.biomass[i] = this.cap[i] * (0.4 + 0.4 * this.rng.next());
		}
	}

	_newSpecies(genome, domain, parent, tick, origin) {
		const r = this.rng;
		const wood = genome[3];
		const hue = domain === 'water' ? 150 + r.next() * 55 : 62 + r.next() * 88;
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
		sp.category = plantCategory(genome, domain);
		sp.icon = sp.category;
		return sp;
	}

	_set(i, sp, genome, off) {
		const prev = this.species[i];
		if (prev) this.registry.remove(this.registry.get(prev));
		this.species[i] = sp.id;
		this.registry.add(sp);
		const base = i * PG;
		for (let k = 0; k < PG; k++) this.genome[base + k] = genome[off + k];
		const t = plantTraitsFrom(this.genome, base);
		this.cap[i] = this.capFor(t, i);
		this.growth[i] = t.growth;
		this.floor[i] = this.cap[i] * 0.55 * t.wood * t.wood;
		this.tox[i] = t.tox;
		this.disp[i] = t.disp;
	}

	_clear(i) {
		const id = this.species[i];
		if (!id) return;
		this.registry.remove(this.registry.get(id));
		this.species[i] = 0;
		this.biomass[i] = 0;
		this.cap[i] = 0;
	}

	edible(i, reach = 0) {
		const e = this.biomass[i] - this.floor[i] * (1 - reach);
		return e > 0 ? e : 0;
	}

	graze(i, amount, reach = 0) {
		const lim = this.floor[i] * (1 - reach);
		const e = this.biomass[i] > lim ? this.biomass[i] - lim : 0;
		const take = e < amount ? e : amount;
		this.biomass[i] -= take;
		return take;
	}

	step(tick) {
		const { rng, world } = this;
		const W = world.width;
		const H = world.height;
		const season = Math.sin((tick / YEAR_TICKS) * Math.PI * 2);
		this.season = season;
		const species = this.species;
		const bio = this.biomass;
		const cap = this.cap;
		let total = 0;
		let cover = 0;

		for (let i = 0; i < this.n; i++) {
			const id = species[i];
			if (!id) continue;
			const K = cap[i];
			let b = bio[i];
			if (K < 0.015) {
				b -= 0.01;
				if (b <= 0) {
					this._clear(i);
					continue;
				}
				bio[i] = b;
				continue;
			}
			const sm = 1 + this.seasonAmp[i] * season;
			const r = this.growth[i] * (sm > 0.05 ? sm : 0.05);
			const bb = b > 0.03 ? b : 0.03;
			b += r * bb * (1 - b / K);
			if (b > K) b = K;
			if (b < 0.004) b = 0.004;
			bio[i] = b;
			total += b;
			cover++;

			const fullness = b / K;
			if (fullness > 0.3 && rng.next() < (0.006 + 0.045 * this.disp[i]) * fullness) {
				this._spread(i, W, H, tick);
			}
		}
		this.totalBiomass = total;
		this.coverTiles = cover;
		this.version++;
	}

	_spread(i, W, H, tick) {
		const rng = this.rng;
		const x = i % W;
		const y = (i / W) | 0;
		const reach = 1 + Math.floor(rng.next() * (1 + this.disp[i] * 4));
		const tx = x + Math.round((rng.next() * 2 - 1) * reach);
		const ty = y + Math.round((rng.next() * 2 - 1) * reach);
		if (tx < 0 || ty < 0 || tx >= W || ty >= H) return;
		const j = ty * W + tx;
		if (j === i || this.water[j] !== this.water[i]) return;

		const child = this._scratch;
		mutateGenes(this.genome, i * PG, child, 0, PG, rng, 0.2, 0.025);
		const ct = plantTraitsFrom(child);
		const childK = this.capFor(ct, j);
		if (childK < 0.04) return;

		const parentSp = this.registry.get(this.species[i]);
		const resident = this.species[j];
		if (resident) {
			const resK = this.cap[j];
			const resStrength = resK * (0.45 + 0.55 * this.biomass[j] / Math.max(resK, 1e-6));
			const invStrength = childK * 0.85;
			if (resident === parentSp.id) {
				if (childK > resK * 1.02 && rng.next() < 0.5) this._assign(j, parentSp, child, tick, false);
				return;
			}
			if (invStrength <= resStrength) return;
			if (rng.next() > (invStrength - resStrength) / invStrength) return;
		}
		this._assign(j, parentSp, child, tick, true);
	}

	_assign(j, parentSp, child, tick, fresh) {
		let sp = parentSp;
		const domain = this.water[j] ? 'water' : 'land';
		if (geneDistance(child, 0, parentSp.genome, 0, PLANT_WEIGHTS) > PLANT_SPECIATION) {
			sp = this.registry.matchDaughter(parentSp, child, PLANT_WEIGHTS, PLANT_SPECIATION * 0.8);
			if (!sp) {
				sp = this._newSpecies(child, domain, parentSp, tick, null);
				this.log.push(tick, 'speciation', `${sp.name} (${PLANT_CATEGORY_LABEL[sp.category]}) branched from ${parentSp.name}`, sp.id);
			}
		}
		const keep = fresh ? 0.04 : this.biomass[j];
		this._set(j, sp, child, 0);
		this.biomass[j] = Math.min(keep, this.cap[j]);
	}

	refreshSpeciesMeans() {
		const sums = new Map();
		for (let i = 0; i < this.n; i++) {
			const id = this.species[i];
			if (!id) continue;
			let s = sums.get(id);
			if (!s) {
				s = new Float64Array(PG + 2);
				sums.set(id, s);
			}
			const base = i * PG;
			for (let k = 0; k < PG; k++) s[k] += this.genome[base + k];
			s[PG] += 1;
			s[PG + 1] += this.biomass[i];
		}
		for (const [id, s] of sums) {
			const sp = this.registry.get(id);
			for (let k = 0; k < PG; k++) sp.mean[k] = s[k] / s[PG];
			sp.biomass = s[PG + 1];
			sp.category = plantCategory(sp.mean, sp.domain);
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
