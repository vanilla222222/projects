const BG = 10;
const B_TEMP = 0, B_MOIST = 1, B_APPETITE = 2, B_MOBILITY = 3, B_FEC = 4, B_SWARM = 5, B_HUE = 6, B_SPEC = 7, B_HOST = 8, B_TONGUE = 9;
const BUG_NICHES = ['pest', 'detritivore', 'parasite', 'pollinator'];
const BUG_PEST = 0, BUG_DETRI = 1, BUG_PARA = 2, BUG_POLL = 3;
const BUG_NICHE_LABEL = { pest: 'Pest', detritivore: 'Detritivore', parasite: 'Parasite', pollinator: 'Pollinator' };
const BUG_CATEGORY_LABEL = {
	aphid: 'Aphid',
	locust: 'Locust',
	beetle: 'Beetle',
	worm: 'Worm',
	tick: 'Tick',
	leech: 'Leech',
	bee: 'Bee',
	butterfly: 'Butterfly',
};
const BUG_WEIGHTS = [1.4, 1.4, 0.8, 0.6, 0.6, 0.6, 0.8, 0.8, 0.5, 0.6];
const BUG_MASKS = [
	[1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
	[1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
	[1, 1, 1, 1, 1, 0, 0, 0, 1, 0],
	[1, 1, 1, 1, 1, 0, 1, 1, 0, 1],
];
const BUG_LAND_ONLY = [1, 0, 0, 1];
const BUG_HUES = [95, 28, 350, 45];
const BUG_SPECIATION = 0.2;
const BUG_SPLIT_MIN_POP = 40;
const BUG_EVERY = 6;
const BUG_MIN = 0.01;
const BUG_RESERVE = 0.03;
const BUG_RES_DIE = 0.012;
const BUG_RES_FIT = 0.05;
const BUG_SEED_D = 0.06;
const BUG_TOL = 0.2;
const BUG_R = 0.08;
const BUG_MORT = 0.006;
const BUG_K_SCALE = 0.7;
const BUG_CROWD = 1.5;
const BUG_DECLINE = 0.08;
const BUG_SPREAD = 0.1;
const BUG_MUT_RATE = 0.15;
const BUG_MUT_SD = 0.02;
const BUG_INIT_P = 0.25;
const BUG_INIT_K = 0.1;
const PEST_FULL = 1;
const PEST_BITE = 0.002;
const PEST_DEFENCE = 0.7;
const DETRI_FULL = 0.3;
const DETRI_RATE = 0.004;
const DETRI_RECYCLE = 0.5;
const PARA_FULL = 5;
const PARA_TRACE_DECAY = 0.95;
const POLL_FULL = 0.5;
const POLL_WINTER = 0.35;
const POLL_HUE_SPAN = 0.25;
const POLL_GENERALIST = 0.4;
const POLL_DRIFT = 0.1;
const TONGUE_SPAN = 0.35;
const TONGUE_DRIFT = 0.1;
const PAIR_SPEC = 0.55;
const PAIR_MATCH = 0.7;
const PAIR_CELLS = 12;
const BUG_TONGUE = [0.45, 0.75, 0.25, 0.45];
const LOCUST_DENSITY = 0.3;
const LOCUST_SWARM_GENE = 0.4;
const LOCUST_BARE = 0.3;
const LOCUST_FRAC = 0.7;
const LOCUST_COOLDOWN = 1440;
const LOCUST_GAP = 480;
const LOCUST_LOG_GAP = 480;
const COLLAPSE_FRAC = 0.25;
const COLLAPSE_GAP = 960;
const COLLAPSE_PEAK_DECAY = 0.999;
const COLLAPSE_MIN_PEAK = 30;
const REINTRO_TILES = 80;

const BUG_ARCHETYPES = [
	{ niche: BUG_PEST, g: [0.55, 0.5, 0.5, 0.4, 0.6, 0.2, 0.5, 0, 0] },
	{ niche: BUG_PEST, g: [0.72, 0.25, 0.6, 0.6, 0.55, 0.75, 0.5, 0, 0] },
	{ niche: BUG_PEST, g: [0.3, 0.55, 0.45, 0.35, 0.6, 0.3, 0.5, 0, 0] },
	{ niche: BUG_DETRI, g: [0.55, 0.4, 0.5, 0.35, 0.55, 0, 0.5, 0, 0] },
	{ niche: BUG_DETRI, g: [0.5, 0.78, 0.45, 0.25, 0.6, 0, 0.5, 0, 0] },
	{ niche: BUG_DETRI, g: [0.25, 0.55, 0.45, 0.3, 0.55, 0, 0.5, 0, 0] },
	{ niche: BUG_PARA, g: [0.5, 0.45, 0.5, 0.5, 0.6, 0, 0.5, 0, 0.4] },
	{ niche: BUG_PARA, g: [0.55, 0.8, 0.5, 0.45, 0.6, 0, 0.5, 0, 0.3] },
	{ niche: BUG_PARA, g: [0.3, 0.5, 0.45, 0.5, 0.55, 0, 0.5, 0, 0.6] },
	{ niche: BUG_POLL, g: [0.55, 0.5, 0.5, 0.55, 0.55, 0, 0.5, 0.2, 0] },
	{ niche: BUG_POLL, g: [0.6, 0.55, 0.45, 0.6, 0.5, 0, 0.83, 0.7, 0] },
	{ niche: BUG_POLL, g: [0.65, 0.4, 0.45, 0.6, 0.5, 0, 0.15, 0.7, 0] },
	{ niche: BUG_POLL, g: [0.3, 0.5, 0.5, 0.5, 0.55, 0, 0.5, 0.3, 0] },
];
BUG_ARCHETYPES.forEach((a, k) => {
	a.g[B_TONGUE] = a.niche === BUG_POLL ? BUG_TONGUE[k - 9] : 0;
});

function bugCategory(g, niche, wet = false, o = 0) {
	if (niche === BUG_PEST) return g[o + B_SWARM] > 0.6 ? 'locust' : 'aphid';
	if (niche === BUG_DETRI) return wet || g[o + B_MOIST] > 0.7 ? 'worm' : 'beetle';
	if (niche === BUG_PARA) return wet ? 'leech' : 'tick';
	return g[o + B_SPEC] > 0.55 ? 'butterfly' : 'bee';
}

const BUG_ICON_VARIANTS = {
	aphid: ['aphid', 'caterpillar'],
	beetle: ['beetle', 'ant'],
	worm: ['worm', 'snail'],
	tick: ['tick', 'mosquito'],
	bee: ['bee', 'moth'],
};

function bugIcon(category, id) {
	const v = BUG_ICON_VARIANTS[category];
	return v ? v[id % v.length] : category;
}

class BugLayer {
	constructor(world, plants, animals, registry, log, rng) {
		this.world = world;
		this.plants = plants;
		this.animals = animals;
		this.registry = registry;
		this.log = log;
		this.rng = rng;
		const n = world.width * world.height;
		this.n = n;
		this.species = new Int32Array(4 * n);
		this.density = new Float32Array(4 * n);
		this.fit = new Float32Array(4 * n);
		this.rate = new Float32Array(4 * n);
		this.app = new Float32Array(4 * n);
		this.mob = new Float32Array(4 * n);
		this.genome = new Float32Array(4 * n * BG);
		this.dorm = new Uint8Array(4 * n);
		this.reserve = 0;
		this.reserveWoke = 0;
		this.total = new Float32Array(n);
		this.trace = new Float32Array(n);
		this.tiles = [0, 0, 0, 0];
		this.mass = [0, 0, 0, 0];
		this.pestDamage = 0;
		this.detritusEaten = 0;
		this.parasiteDrain = 0;
		this.eaten = 0;
		this.swarms = 0;
		this._lastSwarm = -LOCUST_GAP;
		this.collapses = 0;
		this.pairCells = new Map();
		this.specPairs = 0;
		this.pairLogged = [];
		this.version = 0;
		this._pollPeak = 0;
		this._collapseTick = -COLLAPSE_GAP;
		this._swarmLogged = new Map();
		this._child = new Float32Array(BG);
		this._cmp = new Float32Array(BG);
		this._founders = BUG_ARCHETYPES.map((a) => ({ niche: a.niche, g: Float32Array.from(a.g), sp: null }));
		const A = animals;
		const W = world.width;
		for (let k = 0; k < A.count; k++) this.trace[(A.y[k] | 0) * W + (A.x[k] | 0)] += ((A.mass[k] * TILE_LOAD_SCALE + 0.5) | 0) / (1 - PARA_TRACE_DECAY);
		this._seed();
		this._sumTotals();
	}

	_fit(g, o, i) {
		return gaussFit(this.world.temperature[i], g[o + B_TEMP], BUG_TOL) * gaussFit(this.plants.moistAt(i), g[o + B_MOIST], BUG_TOL * 1.2);
	}

	_food(niche, g, o, i) {
		const P = this.plants;
		const n = this.n;
		if (niche === BUG_PEST) {
			if (P.water[i]) return 0;
			const u = n + i;
			let b = 0;
			let def = 0;
			if (P.species[i]) {
				const v = P.biomass[i];
				b += v;
				def += v * P.genome[i * PG + 13];
			}
			if (P.species[u] && !P.kind[u]) {
				const v = P.biomass[u];
				b += v;
				def += v * P.genome[u * PG + 13];
			}
			if (!(b > 0)) return 0;
			const f = (b < PEST_FULL ? b / PEST_FULL : 1) * (1 - (PEST_DEFENCE * def) / b);
			return f > 0 ? f : 0;
		}
		if (niche === BUG_DETRI) {
			const L = P.soil.litter[i];
			return L < DETRI_FULL ? L / DETRI_FULL : 1;
		}
		if (niche === BUG_PARA) {
			const t = this.trace[i];
			return t < PARA_FULL ? t / PARA_FULL : 1;
		}
		if (P.water[i]) return 0;
		const nec = P.nectar(i);
		if (!(nec > 0)) return 0;
		const spec = g[o + B_SPEC];
		const hd = hueDist(P.nectarHue, g[o + B_HUE]) / POLL_HUE_SPAN;
		const td = Math.abs(P.nectarDepth - g[o + B_TONGUE]) / TONGUE_SPAN;
		const match = (1 - spec * (hd < 1 ? hd : 1)) * (1 - spec * (td < 1 ? td : 1));
		const sf = POLL_WINTER + (1 - POLL_WINTER) * P.bloomNow;
		const f = (nec * sf * match * (1 + POLL_GENERALIST * (1 - spec))) / POLL_FULL;
		return f < 1 ? f : 1;
	}

	_seed() {
		const n = this.n;
		const rng = this.rng;
		const water = this.plants.water;
		for (let i = 0; i < n; i++) {
			for (let niche = 0; niche < 4; niche++) {
				if (rng.next() > BUG_INIT_P) continue;
				if (BUG_LAND_ONLY[niche] && water[i]) continue;
				let best = null;
				let bestK = 0;
				for (const f of this._founders) {
					if (f.niche !== niche) continue;
					const k = this._fit(f.g, 0, i) * (0.7 + 0.6 * rng.next());
					if (k > bestK) {
						bestK = k;
						best = f;
					}
				}
				if (!best) continue;
				const K = bestK * this._food(niche, best.g, 0, i);
				if (!(K >= BUG_INIT_K)) continue;
				if (!best.sp) best.sp = this._newSpecies(best.g, niche, water[i], null, 0, 'founder');
				this._set(niche * n + i, best.sp, best.g, 0, K * 0.5);
			}
		}
	}

	_newSpecies(genome, niche, wet, parent, tick, origin) {
		const r = this.rng;
		const base = niche === BUG_POLL ? genome[B_HUE] * 360 : BUG_HUES[niche];
		const hue = parent ? parent.hsl[0] + (r.next() - 0.5) * 50 : base + (r.next() - 0.5) * 40;
		const hsl = [((hue % 360) + 360) % 360, 0.5 + r.next() * 0.25, (niche === BUG_DETRI ? 0.36 : 0.5) + (r.next() - 0.5) * 0.1];
		const sp = this.registry.create(
			{
				group: 'bug',
				domain: wet ? 'water' : 'land',
				genome,
				parentId: parent ? parent.id : null,
				generation: parent ? parent.generation + 1 : 0,
				tick,
				origin,
			},
			hsl
		);
		sp.niche = BUG_NICHES[niche];
		sp.nicheIndex = niche;
		sp.category = bugCategory(genome, niche, !!wet);
		sp.icon = bugIcon(sp.category, sp.id);
		sp.density = 0;
		sp.wetFrac = wet ? 1 : 0;
		sp._swarmTick = -LOCUST_COOLDOWN;
		return sp;
	}

	_set(q, sp, genome, off, d, fit = -1) {
		const prev = this.species[q];
		if (prev) this.registry.remove(this.registry.get(prev));
		this.species[q] = sp.id;
		this.registry.add(sp);
		const base = q * BG;
		for (let k = 0; k < BG; k++) this.genome[base + k] = genome[off + k];
		const f = fit >= 0 ? fit : this._fit(this.genome, base, q % this.n);
		this.fit[q] = f > 0 ? f : 0;
		const app = this.genome[base + B_APPETITE];
		this.app[q] = app;
		this.mob[q] = this.genome[base + B_MOBILITY];
		this.rate[q] = BUG_R * BUG_EVERY * (0.5 + this.genome[base + B_FEC]) * (0.7 + 0.6 * app);
		this.density[q] = d < 1 ? d : 1;
		this.dorm[q] = 0;
	}

	_clear(q) {
		const id = this.species[q];
		if (!id) return;
		this.registry.remove(this.registry.get(id));
		this.species[q] = 0;
		this.density[q] = 0;
		this.dorm[q] = 0;
	}

	edibleAt(i) {
		const d = this.density;
		const n = this.n;
		return d[i] + d[n + i] + d[3 * n + i];
	}

	eat(i, amount) {
		const d = this.density;
		const n = this.n;
		const a = d[i];
		const b = d[n + i];
		const c = d[3 * n + i];
		const sum = a + b + c;
		if (!(sum > 0) || !(amount > 0)) return 0;
		const f = amount < sum ? amount / sum : 1;
		const keep = 1 - f;
		if (a > 0) {
			d[i] = a * keep;
			if (d[i] < BUG_MIN) this._clear(i);
		}
		if (b > 0) {
			d[n + i] = b * keep;
			if (d[n + i] < BUG_MIN) this._clear(n + i);
		}
		if (c > 0) {
			d[3 * n + i] = c * keep;
			if (d[3 * n + i] < BUG_MIN) this._clear(3 * n + i);
		}
		const took = sum * f;
		const t = this.total[i] - took;
		this.total[i] = t > 0 ? t : 0;
		this.eaten += took;
		return took;
	}

	clean(i, f) {
		const q = 2 * this.n + i;
		const a = this.density[q];
		if (!(a > 0)) return;
		let na = a * (1 - f);
		if (na < BUG_MIN) {
			this._clear(q);
			na = 0;
		} else this.density[q] = na;
		const t = this.total[i] - (a - na);
		this.total[i] = t > 0 ? t : 0;
		const pl = this.animals.parasiteLoad;
		pl[i] = a > 0 ? pl[i] * (na / a) : 0;
	}

	step(tick) {
		if (tick % BUG_EVERY !== 0) return;
		const n = this.n;
		const W = this.world.width;
		const H = this.world.height;
		const rng = this.rng;
		const P = this.plants;
		const A = this.animals;
		const soil = P.soil;
		const litter = soil.litter;
		const nut = soil.nutrient;
		const poll = P.poll;
		const species = this.species;
		const density = this.density;
		const genome = this.genome;
		const fitA = this.fit;
		const trace = this.trace;
		const tileLoad = A.tileLoad;
		const pLoad = A.parasiteLoad;
		const pHost = A.parasiteHost;
		const dt = BUG_EVERY;
		const decay = PARA_TRACE_DECAY;
		for (let i = 0; i < n; i++) trace[i] = trace[i] * decay + tileLoad[i];
		pLoad.fill(0);

		const rate = this.rate;
		const appA = this.app;
		const mobA = this.mob;
		const pbio = P.biomass;
		const pspecies = P.species;
		const pkind = P.kind;
		const pgen = P.genome;
		const bloomK = P._bloomK;
		const phue = P.hue;
		const sf = POLL_WINTER + (1 - POLL_WINTER) * P.bloomNow;
		const mort = BUG_MORT * dt;
		const decl = BUG_DECLINE * dt;
		const spreadP = BUG_SPREAD * dt;
		const Wx = A.weather;
		const winter = Wx && Wx.season < 0;
		const dormA = this.dorm;
		const pairs = this.pairCells;
		let reserve = 0;

		for (let niche = 0; niche < 4; niche++) {
			const q0 = niche * n;
			for (let i = 0; i < n; i++) {
				const q = q0 + i;
				const id = species[q];
				if (!id) continue;
				if (dormA[q]) {
					if (!winter || density[q] > 0) {
						dormA[q] = 0;
						if (density[q] < BUG_RESERVE) density[q] = BUG_RESERVE;
						this.reserveWoke++;
					} else {
						if (rng.next() < BUG_RES_DIE) this._clear(q);
						else reserve++;
						continue;
					}
				}
				const o = q * BG;
				const app = appA[q];
				let food;
				let eff = 0;
				if (niche === BUG_PEST) {
					const u = n + i;
					let b = 0;
					let def = 0;
					if (pspecies[i]) {
						const v = pbio[i];
						b = v;
						def = v * pgen[i * PG + 13];
					}
					if (pspecies[u] && !pkind[u]) {
						const v = pbio[u];
						b += v;
						def += v * pgen[u * PG + 13];
					}
					food = b > 0 ? (b < PEST_FULL ? b / PEST_FULL : 1) * (1 - (PEST_DEFENCE * def) / b) : 0;
				} else if (niche === BUG_DETRI) {
					const L = litter[i];
					food = L < DETRI_FULL ? L / DETRI_FULL : 1;
				} else if (niche === BUG_PARA) {
					const t = trace[i];
					food = t < PARA_FULL ? t / PARA_FULL : 1;
				} else {
					const u = n + i;
					const ba = pspecies[i] ? bloomK[i] : 0;
					const bb = pspecies[u] ? bloomK[u] : 0;
					const nec = ba + bb;
					if (nec > 0) {
						const top = ba >= bb ? i : u;
						const hue = phue[top];
						const spec = genome[o + B_SPEC];
						let hd = hue - genome[o + B_HUE];
						if (hd < 0) hd = -hd;
						if (hd > 0.5) hd = 1 - hd;
						hd /= POLL_HUE_SPAN;
						let td = pgen[top * PG + 15] - genome[o + B_TONGUE];
						if (td < 0) td = -td;
						td /= TONGUE_SPAN;
						const match = (1 - spec * (hd < 1 ? hd : 1)) * (1 - spec * (td < 1 ? td : 1));
						if (spec > PAIR_SPEC && match > PAIR_MATCH && density[q] > BUG_MIN) {
							const key = id * 1048576 + pspecies[top];
							pairs.set(key, (pairs.get(key) || 0) + 1);
						}
						const f = (nec * sf * match * (1 + POLL_GENERALIST * (1 - spec))) / POLL_FULL;
						food = f < 1 ? f : 1;
						eff = (0.5 + 0.5 * spec) * match;
					} else food = 0;
				}
				const K = fitA[q] * food * BUG_K_SCALE;
				let d = density[q];
				if (niche === BUG_PEST && d > LOCUST_DENSITY && genome[o + B_SWARM] > LOCUST_SWARM_GENE && P.edible(i) < LOCUST_BARE) {
					const sp = this.registry.get(id);
					if (tick - this._lastSwarm >= LOCUST_GAP && tick - sp._swarmTick >= LOCUST_COOLDOWN && this._swarm(q, i, d, sp, W, H, tick)) d = density[q];
				}
				if (d <= K) d += rate[q] * d * (1 - d / (K > 1e-6 ? K : 1e-6));
				else d -= (d - K) * decl;
				d -= mort * (0.5 + app) * (1 + BUG_CROWD * d) * d;
				if (d < BUG_MIN) {
					if (winter && fitA[q] > BUG_RES_FIT) {
						density[q] = 0;
						dormA[q] = 1;
						reserve++;
					} else this._clear(q);
					continue;
				}
				if (d > 1) d = 1;
				density[q] = d;
				if (niche === BUG_PEST) {
					this.pestDamage += P.damage(i, d * app * PEST_BITE * dt);
				} else if (niche === BUG_DETRI) {
					const L = litter[i];
					if (L > 0) {
						const took = soil.consumeLitter(i, L * d * DETRI_RATE * dt);
						this.detritusEaten += took;
						const N = nut[i] + took * DETRI_RECYCLE;
						nut[i] = N < SOIL_MAX ? N : SOIL_MAX;
					}
				} else if (niche === BUG_PARA) {
					pLoad[i] = d * app;
					pHost[i] = genome[o + B_HOST];
				} else if (food > 0) {
					const v = eff * d;
					if (v > poll[i]) poll[i] = v < 1 ? v : 1;
				}
				if (rng.next() < mobA[q] * d * spreadP) this._spread(q, niche, i, W, H, tick);
			}
		}
		this.reserve = reserve;
		this._sumTotals();
		this._checkCollapse(tick);
		this.version++;
	}

	_sumTotals() {
		const n = this.n;
		const d = this.density;
		const total = this.total;
		const tiles = this.tiles;
		const mass = this.mass;
		for (let k = 0; k < 4; k++) {
			tiles[k] = 0;
			mass[k] = 0;
		}
		for (let i = 0; i < n; i++) {
			const a = d[i];
			const b = d[n + i];
			const c = d[2 * n + i];
			const e = d[3 * n + i];
			total[i] = a + b + c + e;
			if (a > 0) {
				tiles[0]++;
				mass[0] += a;
			}
			if (b > 0) {
				tiles[1]++;
				mass[1] += b;
			}
			if (c > 0) {
				tiles[2]++;
				mass[2] += c;
			}
			if (e > 0) {
				tiles[3]++;
				mass[3] += e;
			}
		}
	}

	_checkCollapse(tick) {
		const m = this.mass[BUG_POLL];
		const peak = this._pollPeak * COLLAPSE_PEAK_DECAY;
		this._pollPeak = m > peak ? m : peak;
		if (this._pollPeak < COLLAPSE_MIN_PEAK || m >= this._pollPeak * COLLAPSE_FRAC) return;
		if (tick - this._collapseTick < COLLAPSE_GAP) return;
		this._collapseTick = tick;
		this._pollPeak = m;
		this.collapses++;
		this.log.push(tick, 'info', 'Pollinator collapse: flowers are going unvisited');
	}

	_swarm(q, i, d, sp, W, H, tick) {
		const rng = this.rng;
		const water = this.plants.water;
		const ang = rng.next() * Math.PI * 2;
		const dist = 4 + rng.next() * 4;
		const tx = Math.round((i % W) + Math.cos(ang) * dist);
		const ty = Math.round(((i / W) | 0) + Math.sin(ang) * dist);
		if (tx < 0 || ty < 0 || tx >= W || ty >= H) return false;
		const j = ty * W + tx;
		if (water[j]) return false;
		const moved = d * LOCUST_FRAC;
		if (this.species[j] === sp.id) {
			const v = this.density[j] + moved;
			this.density[j] = v < 1 ? v : 1;
		} else this._set(j, sp, this.genome, q * BG, moved);
		this.density[q] = d - moved;
		sp._swarmTick = tick;
		this._lastSwarm = tick;
		this.swarms++;
		const last = this._swarmLogged.get(sp.id);
		if (last === undefined || tick - last >= LOCUST_LOG_GAP) {
			this._swarmLogged.set(sp.id, tick);
			this.log.push(tick, 'info', `${sp.name} locusts are swarming`, sp.id);
		}
		return true;
	}

	_spread(q, niche, i, W, H, tick) {
		const rng = this.rng;
		const o = q * BG;
		const reachMax = this.genome[o + B_MOBILITY] > 0.7 ? 3 : 2;
		const reach = 1 + Math.floor(rng.next() * reachMax);
		const tx = (i % W) + Math.round((rng.next() * 2 - 1) * reach);
		const ty = ((i / W) | 0) + Math.round((rng.next() * 2 - 1) * reach);
		if (tx < 0 || ty < 0 || tx >= W || ty >= H) return;
		const j = ty * W + tx;
		if (j === i) return;
		const P = this.plants;
		if (BUG_LAND_ONLY[niche] && P.water[j]) return;
		const qj = niche * this.n + j;
		const parentId = this.species[q];
		const resident = this.species[qj];
		const d = this.density[q];
		if (resident === parentId) {
			const v = this.density[qj] + BUG_SEED_D * 0.5;
			this.density[qj] = v < 1 ? v : 1;
			return;
		}
		let food = this._food(niche, this.genome, o, j);
		if (!(food > 0)) return;
		if (resident && d <= this.density[qj] * this.fit[qj]) return;
		const child = this._child;
		mutateGenes(this.genome, o, child, 0, BG, rng, BUG_MUT_RATE, BUG_MUT_SD);
		const mask = BUG_MASKS[niche];
		for (let k = 0; k < BG; k++) if (!mask[k]) child[k] = this.genome[o + k];
		const childFit = this._fit(child, 0, j);
		if (niche === BUG_POLL) {
			let h = P.nectarHue - child[B_HUE];
			if (h > 0.5) h -= 1;
			else if (h < -0.5) h += 1;
			let v = child[B_HUE] + h * POLL_DRIFT;
			if (v < 0) v += 1;
			else if (v >= 1) v -= 1;
			child[B_HUE] = v;
			const t = child[B_TONGUE] + (P.nectarDepth - child[B_TONGUE]) * TONGUE_DRIFT;
			child[B_TONGUE] = t < 0 ? 0 : t > 1 ? 1 : t;
			food = this._food(niche, child, 0, j);
		}
		if (!(childFit * food >= BUG_MIN * 2)) return;
		if (resident) {
			const rs = this.density[qj] * this.fit[qj];
			const cs = d * childFit;
			if (cs <= rs) return;
			if (rng.next() > (cs - rs) / cs) return;
		}
		this._assign(qj, niche, j, this.registry.get(parentId), child, tick, childFit);
	}

	_assign(qj, niche, j, parentSp, child, tick, fit) {
		let sp = parentSp;
		const cmp = this._cmp;
		cmp.set(child);
		const dh = child[B_HUE] - parentSp.mean[B_HUE];
		if (dh > 0.5) cmp[B_HUE] -= 1;
		else if (dh < -0.5) cmp[B_HUE] += 1;
		if (geneDistance(cmp, 0, parentSp.mean, 0, BUG_WEIGHTS) > BUG_SPECIATION) {
			sp = this.registry.matchDaughter(parentSp, cmp, BUG_WEIGHTS, BUG_SPECIATION);
			if (!sp && !this.registry.canSplit(parentSp, BUG_SPLIT_MIN_POP)) sp = parentSp;
			if (!sp) {
				sp = this._newSpecies(child, niche, this.plants.water[j], parentSp, tick, null);
				this.log.push(tick, 'speciation', `${sp.name} (${BUG_CATEGORY_LABEL[sp.category]}) branched from ${parentSp.name}`, sp.id);
			}
		}
		this._set(qj, sp, child, 0, BUG_SEED_D, fit);
	}

	reintroduce(niche) {
		const rng = this.rng;
		const n = this.n;
		const water = this.plants.water;
		const opts = this._founders.filter((f) => f.niche === niche);
		const f = opts[Math.floor(rng.next() * opts.length)];
		let sp = null;
		let placed = 0;
		for (let attempt = 0; attempt < 6000 && placed < REINTRO_TILES; attempt++) {
			const i = Math.floor(rng.next() * n);
			if (BUG_LAND_ONLY[niche] && water[i]) continue;
			const q = niche * n + i;
			if (this.species[q]) continue;
			const K = this._fit(f.g, 0, i) * this._food(niche, f.g, 0, i);
			if (!(K >= 0.15)) continue;
			if (!sp) sp = this._newSpecies(f.g, niche, water[i], null, this.registry.tick, 'migrated');
			this._set(q, sp, f.g, 0, K * 0.5);
			placed++;
		}
		if (!sp) return null;
		this._sumTotals();
		this.log.push(this.registry.tick, 'migration', `${sp.name} (${BUG_CATEGORY_LABEL[sp.category]}) moved in — the ${BUG_NICHES[niche]}s had vanished`, sp.id);
		return sp;
	}

	reassignSpecies(fromSp, toSp) {
		const species = this.species;
		const from = fromSp.id;
		let moved = 0;
		for (let q = 0; q < 4 * this.n; q++) {
			if (species[q] !== from) continue;
			species[q] = toSp.id;
			moved++;
		}
		return moved;
	}

	refreshSpeciesMeans() {
		const sums = new Map();
		const water = this.plants.water;
		const n = this.n;
		const species = this.species, genome = this.genome, density = this.density;
		let lastId = 0, s = null, lastHue = NaN, hc = 0, hs = 0;
		for (let q = 0, c = 0; q < 4 * n; q++, c++) {
			if (c === n) c = 0;
			const id = species[q];
			if (!id) continue;
			if (id !== lastId) {
				s = sums.get(id);
				if (!s) {
					s = new Float64Array(BG + 5);
					sums.set(id, s);
				}
				lastId = id;
			}
			const base = q * BG;
			for (let k = 0; k < BG; k++) s[k] += genome[base + k];
			s[BG] += 1;
			s[BG + 1] += density[q];
			if (water[c]) s[BG + 2] += 1;
			const hue = genome[base + B_HUE];
			if (hue !== lastHue) {
				const a = hue * 2 * Math.PI;
				hc = Math.cos(a);
				hs = Math.sin(a);
				lastHue = hue;
			}
			s[BG + 3] += hc;
			s[BG + 4] += hs;
		}
		for (const [id, s] of sums) {
			const sp = this.registry.get(id);
			for (let k = 0; k < BG; k++) sp.mean[k] = s[k] / s[BG];
			const h = Math.atan2(s[BG + 4], s[BG + 3]) / (2 * Math.PI);
			sp.mean[B_HUE] = h < 0 ? h + 1 : h;
			sp.density = s[BG + 1] / s[BG];
			sp.wetFrac = s[BG + 2] / s[BG];
			sp.category = bugCategory(sp.mean, sp.nicheIndex, sp.wetFrac > 0.5);
			sp.icon = bugIcon(sp.category, sp.id);
			sp.pollOf = 0;
		}
		this._pairTrack();
	}

	_pairTrack() {
		const best = new Map();
		for (const [key, c] of this.pairCells) {
			if (c < PAIR_CELLS) continue;
			const b = Math.floor(key / 1048576);
			const p = key - b * 1048576;
			const cur = best.get(b);
			if (!cur || c > cur[1]) best.set(b, [p, c]);
		}
		this.pairCells.clear();
		let n = 0;
		for (const [b, [p]] of best) {
			const bs = this.registry.get(b);
			const ps = this.registry.get(p);
			if (!bs || !ps || bs.population <= 0 || ps.population <= 0) continue;
			n++;
			bs.pollOf = p;
			const key = b * 1048576 + p;
			if (this.pairLogged.indexOf(key) < 0) {
				this.pairLogged.push(key);
				this.log.push(this.registry.tick, 'info', `${bs.name} became a specialist pollinator of ${ps.name}`, b);
			}
		}
		this.specPairs = n;
	}
}
