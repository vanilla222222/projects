const AG = 9;
const G_SIZE = 0, G_SPEED = 1, G_SENSE = 2, G_DIET = 3, G_TEMP = 4, G_TOL = 5, G_FEC = 6, G_TOXR = 7, G_ARMOR = 8;
const ANIMAL_WEIGHTS = [1.3, 1, 0.7, 1.8, 1.2, 0.5, 0.8, 0.5, 0.8];
const ANIMAL_SPECIATION = 0.12;
const GRID = 6;
const PLANT_ENERGY = 3.2;
const MEAT_ENERGY = 20;

const ANIMAL_ARCHETYPES = [
	{ domain: 'land', n: 50, g: [0.12, 0.5, 0.45, 0.04, 0.5, 0.65, 0.85, 0.3, 0.08] },
	{ domain: 'land', n: 40, g: [0.45, 0.62, 0.55, 0.05, 0.45, 0.5, 0.4, 0.35, 0.2] },
	{ domain: 'land', n: 25, g: [0.85, 0.28, 0.35, 0.04, 0.55, 0.5, 0.15, 0.55, 0.7] },
	{ domain: 'land', n: 35, g: [0.32, 0.72, 0.5, 0.06, 0.8, 0.45, 0.5, 0.6, 0.15] },
	{ domain: 'land', n: 30, g: [0.55, 0.45, 0.45, 0.05, 0.18, 0.45, 0.35, 0.3, 0.35] },
	{ domain: 'land', n: 24, g: [0.42, 0.42, 0.45, 0.45, 0.5, 0.55, 0.55, 0.4, 0.2] },
	{ domain: 'land', n: 10, g: [0.3, 0.68, 0.7, 0.88, 0.55, 0.6, 0.55, 0.3, 0.1] },
	{ domain: 'land', n: 8, g: [0.62, 0.72, 0.75, 0.92, 0.42, 0.6, 0.35, 0.3, 0.25] },
	{ domain: 'water', n: 60, g: [0.18, 0.5, 0.45, 0.04, 0.5, 0.6, 0.85, 0.3, 0.1] },
	{ domain: 'water', n: 40, g: [0.32, 0.45, 0.45, 0.06, 0.78, 0.45, 0.6, 0.4, 0.3] },
	{ domain: 'water', n: 24, g: [0.35, 0.3, 0.4, 0.45, 0.45, 0.55, 0.6, 0.3, 0.5] },
	{ domain: 'water', n: 8, g: [0.4, 0.66, 0.65, 0.85, 0.35, 0.6, 0.5, 0.3, 0.15] },
	{ domain: 'water', n: 6, g: [0.75, 0.72, 0.75, 0.92, 0.6, 0.55, 0.3, 0.3, 0.3] },
];

function dietRole(diet) {
	return diet < 0.33 ? 'herbivore' : diet < 0.66 ? 'omnivore' : 'carnivore';
}

function animalCategory(g, domain) {
	const size = g[G_SIZE];
	const role = dietRole(g[G_DIET]);
	if (domain === 'water') {
		if (role === 'herbivore') return size < 0.45 ? 'fish' : 'turtle';
		if (role === 'omnivore') return 'crab';
		return size < 0.58 ? 'pike' : 'shark';
	}
	if (role === 'herbivore') return size < 0.28 ? 'rabbit' : size < 0.66 ? 'deer' : 'bison';
	if (role === 'omnivore') return size < 0.35 ? 'mouse' : size < 0.72 ? 'boar' : 'bear';
	return size < 0.42 ? 'fox' : size < 0.74 ? 'wolf' : 'bigcat';
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
	fish: 'Grazing fish',
	turtle: 'Large grazer (aquatic)',
	crab: 'Scavenger',
	pike: 'Predatory fish',
	shark: 'Apex predator (aquatic)',
};

const ANIMAL_FIELDS_F = [
	'x', 'y', 'px', 'py', 'energy', 'age', 'tx', 'ty',
	'mass', 'spd', 'range', 'plantEff', 'meatEff', 'emax', 'meta', 'mature', 'maxAge',
	'litter', 'pT', 'tol', 'toxR', 'armor', 'diet', 'bite',
];
const ANIMAL_FIELDS_I = ['sp', 'uid', 'cool', 'ttl', 'face', 'domain', 'alive', 'state'];

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
		this.walk = new Uint8Array(n);
		for (let i = 0; i < n; i++) {
			const b = world.biome[i];
			if (b === BIOME_ID.RIVER || b === BIOME_ID.POND) this.walk[i] = 3;
			else if (WATER_BIOME_SET.has(b)) this.walk[i] = 2;
			else this.walk[i] = b === BIOME_ID.GLACIER ? 0 : 1;
		}
		this.childGenome = new Float32Array(AG);
		this.deaths = { starved: 0, eaten: 0, old: 0 };
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

	canStand(domain, x, y) {
		const W = this.world.width;
		if (x < 0 || y < 0 || x >= W || y >= this.world.height) return false;
		const w = this.walk[(y | 0) * W + (x | 0)];
		return (w & (domain ? 2 : 1)) !== 0;
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
		const mass = 0.35 + 2.5 * size;
		const m75 = Math.pow(mass, 0.75);
		this.mass[i] = mass;
		this.spd[i] = (0.35 + 1.05 * speed) * (1 - 0.3 * armor);
		this.range[i] = 3 + 9 * sense;
		this.diet[i] = diet;
		this.plantEff[i] = 1 - diet * diet;
		this.meatEff[i] = Math.pow(diet, 1.2);
		this.emax[i] = 22 * mass;
		this.meta[i] = 0.05 * m75 * (1 + 0.9 * speed * speed + 0.35 * sense + 0.3 * armor + 0.2 * toxR + 0.15 * g[o + G_TOL]);
		this.mature[i] = 45 + 110 * size;
		this.maxAge[i] = 500 + 1300 * size;
		this.litter[i] = 1 + Math.round(3 * g[o + G_FEC]);
		this.pT[i] = g[o + G_TEMP];
		this.tol[i] = 0.08 + 0.3 * g[o + G_TOL];
		this.toxR[i] = toxR;
		this.armor[i] = armor;
		this.bite[i] = 0.058 * m75;
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
		this.sp[i] = sp.id;
		this.uid[i] = this.nextUid++;
		this.cool[i] = 0;
		this.ttl[i] = 0;
		this.face[i] = this.rng.next() < 0.5 ? 1 : -1;
		this.domain[i] = sp.domain === 'water' ? 1 : 0;
		this.alive[i] = 1;
		this.state[i] = 0;
		this.registry.add(sp);
		return i;
	}

	newSpecies(genome, gOff, domain, parent, tick, origin) {
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
		sp.category = animalCategory(g, domain);
		sp.icon = sp.category;
		sp.role = dietRole(diet);
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
		const mass = this.mass[i];
		const sp = this.sp[i];
		let best = -1;
		let bestD = r * r;
		for (let gy = r0; gy <= r1; gy++) {
			for (let gx = c0; gx <= c1; gx++) {
				const c = gy * cols + gx;
				for (let k = this.gstart[c], e = this.gstart[c + 1]; k < e; k++) {
					const j = this.gitems[k];
					if (j === i || !this.alive[j] || this.domain[j] !== dom) continue;
					if (mode === 0) {
						if (this.diet[j] - diet < 0.3 || this.meatEff[j] < 0.3 || mass > this.mass[j] * 1.8) continue;
					} else if (mode === 1) {
						if (diet - this.diet[j] < 0.3 || this.mass[j] > mass * (diet > 0.66 ? 1.8 : 0.6)) continue;
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
		for (let k = this.gstart[c], e = this.gstart[c + 1]; k < e; k++) {
			if (this.sp[this.gitems[k]] === sp) n++;
		}
		return n;
	}

	_moveToward(i, tx, ty, frac) {
		const x = this.x[i];
		const y = this.y[i];
		let dx = tx - x;
		let dy = ty - y;
		const d = Math.hypot(dx, dy);
		if (d < 1e-4) return 0;
		const step = Math.min(d, this.spd[i] * frac);
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

	_reach(i) {
		const d = Math.abs(this.diet[i] - 0.5);
		return d < 0.3 ? 0.6 * (1 - d / 0.3) : 0;
	}

	_pickForage(i) {
		const W = this.world.width;
		const H = this.world.height;
		const r = this.range[i];
		const dom = this.domain[i];
		const temp = this.world.temperature;
		let bestScore = -1;
		let bx = this.x[i];
		let by = this.y[i];
		const needFood = this.plantEff[i] > 0.15;
		const reach = this._reach(i);
		for (let s = 0; s < 8; s++) {
			const tx = this.x[i] + (this.rng.next() * 2 - 1) * r;
			const ty = this.y[i] + (this.rng.next() * 2 - 1) * r;
			if (tx < 0 || ty < 0 || tx >= W || ty >= H) continue;
			if (!this.canStand(dom, tx, ty)) continue;
			const j = (ty | 0) * W + (tx | 0);
			const food = needFood ? this.plants.edible(j, reach) : 0.2;
			const clim = gaussFit(temp[j], this.pT[i], this.tol[i]);
			const dist = Math.hypot(tx - this.x[i], ty - this.y[i]);
			const score = (food + 0.02) * (0.25 + clim) / (1 + dist * 0.08) + this.rng.next() * 0.002;
			if (score > bestScore) {
				bestScore = score;
				bx = tx;
				by = ty;
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
		this._buildGrid();
		this.births = 0;

		for (let i = 0; i < n; i++) {
			if (!this.alive[i]) continue;
			this.px[i] = this.x[i];
			this.py[i] = this.y[i];
			this.age[i]++;
			if (this.cool[i] > 0) this.cool[i]--;
			const tile = (this.y[i] | 0) * W + (this.x[i] | 0);
			const clim = gaussFit(temp[tile], this.pT[i], this.tol[i]);
			const m75 = this.meta[i];
			let cost = m75 * (1 + 1.3 * (1 - clim));
			const emax = this.emax[i];
			const e = this.energy[i];
			let moved = 0;
			let acted = false;

			if (this.diet[i] < 0.7 && (tick + i) % 2 === 0 && rng.next() < 0.7) {
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
			if (this.state[i] === 4 && this.ttl[i] > 0) {
				moved = this._moveToward(i, this.tx[i], this.ty[i], 1.1);
				this.ttl[i]--;
				if (this.ttl[i] <= 0) this.state[i] = 0;
				acted = true;
			}

			if (!acted && this.meatEff[i] > 0.25 && e < emax * 0.6 && this.cool[i] === 0) {
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

			if (!acted && this.plantEff[i] > 0.12 && e < emax * 0.92) {
				const ok = (this.walk[tile] & (this.domain[i] ? 2 : 1)) !== 0;
				const reach = this._reach(i);
				const avail = ok ? plants.edible(tile, reach) : 0;
				if (avail > this.bite[i] * 0.5) {
					this.state[i] = 1;
					const eaten = plants.graze(tile, this.bite[i], reach);
					const toxHit = Math.max(0, plants.tox[tile] - this.toxR[i]);
					this.energy[i] += eaten * PLANT_ENERGY * this.plantEff[i] * (1 - 1.6 * toxHit);
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

			cost += moved * 0.012 * this.mass[i];
			this.energy[i] -= cost;
			if (this.energy[i] > emax) this.energy[i] = emax;

			if (this.energy[i] <= 0) {
				this._kill(i);
				this.deaths.starved++;
				continue;
			}
			if (this.age[i] > this.maxAge[i] && rng.next() < 0.05) {
				this._kill(i);
				this.deaths.old++;
				continue;
			}

			if (
				this.age[i] > this.mature[i] &&
				this.cool[i] === 0 &&
				this.energy[i] > emax * 0.7 &&
				(this.count < this.maxAnimals || (this.diet[i] > 0.6 && this.count < this.maxAnimals + 1500)) &&
				this._localCount(i) < 14
			) {
				this._reproduce(i, tick);
			}
		}
		this._compact();
	}

	_attack(i, p, tile, tick) {
		const massRatio = this.mass[i] / this.mass[p];
		const sizeF = Math.min(1.2, Math.max(0.15, massRatio * 0.85));
		const speedF = this.spd[i] / (this.spd[i] + this.spd[p] * 0.7);
		const cover = this.domain[p]
			? 0.3 + Math.min(0.3, this.plants.floor[tile] * 0.6)
			: Math.min(0.45, this.plants.floor[tile] * 0.5);
		const chance = 0.7 * sizeF * speedF * (1 - 0.6 * this.armor[p]) * (1 - cover);
		if (this.rng.next() < chance) {
			this.energy[i] += this.mass[p] * MEAT_ENERGY * this.meatEff[i] + this.energy[p] * 0.25;
			this._kill(p);
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

	_kill(i) {
		this.alive[i] = 0;
		this.registry.remove(this.registry.get(this.sp[i]));
	}

	_reproduce(i, tick) {
		const rng = this.rng;
		const litter = this.litter[i];
		const mate = this._nearest(i, this.range[i], 2);
		const parentSp = this.registry.get(this.sp[i]);
		const childG = this.childGenome;
		const oi = i * AG;
		const om = mate >= 0 ? mate * AG : oi;
		const budget = this.emax[i] * 0.38;
		const perChild = budget / litter;
		let spent = 0;
		for (let c = 0; c < litter; c++) {
			if (this.count >= this.maxAnimals + 1500) break;
			for (let k = 0; k < AG; k++) childG[k] = rng.next() < 0.5 ? this.genome[oi + k] : this.genome[om + k];
			mutateGenes(childG, 0, childG, 0, AG, rng, 0.25, 0.04);
			const ang = rng.next() * Math.PI * 2;
			const cx = this.x[i] + Math.cos(ang) * 0.8;
			const cy = this.y[i] + Math.sin(ang) * 0.8;
			const dom = this.domain[i];
			const x = this.canStand(dom, cx, cy) ? cx : this.x[i];
			const y = this.canStand(dom, cx, cy) ? cy : this.y[i];
			let sp = parentSp;
			if (geneDistance(childG, 0, parentSp.genome, 0, ANIMAL_WEIGHTS) > ANIMAL_SPECIATION) {
				sp = this.registry.matchDaughter(parentSp, childG, ANIMAL_WEIGHTS, ANIMAL_SPECIATION * 0.8);
			}
			if (!sp) {
				sp = this.newSpecies(childG, 0, parentSp.domain, parentSp, tick, null);
				const label = ANIMAL_CATEGORY_LABEL[sp.category].toLowerCase();
				const rolePrev = parentSp.role;
				const shift = rolePrev !== sp.role ? ` — a new ${sp.role}!` : '';
				this.log.push(tick, 'speciation', `${sp.name} (${label}) branched from ${parentSp.name}${shift}`, sp.id);
			}
			const j = this.spawn(sp, childG, 0, x, y, 0);
			this.energy[j] = Math.min(perChild, this.emax[j] * 0.6);
			spent += perChild;
			this.births++;
		}
		this.energy[i] -= spent * 1.1;
		this.cool[i] = Math.round(35 + 55 * this.genome[oi + G_SIZE] - 10 * this.genome[oi + G_FEC]);
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

	refreshSpeciesMeans() {
		const sums = new Map();
		for (let i = 0; i < this.count; i++) {
			const id = this.sp[i];
			let s = sums.get(id);
			if (!s) {
				s = new Float64Array(AG + 1);
				sums.set(id, s);
			}
			const o = i * AG;
			for (let k = 0; k < AG; k++) s[k] += this.genome[o + k];
			s[AG]++;
		}
		for (const [id, s] of sums) {
			const sp = this.registry.get(id);
			for (let k = 0; k < AG; k++) sp.mean[k] = s[k] / s[AG];
			sp.category = animalCategory(sp.mean, sp.domain);
			sp.icon = sp.category;
			sp.role = dietRole(sp.mean[G_DIET]);
		}
	}
}
