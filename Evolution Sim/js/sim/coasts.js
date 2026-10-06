const TIDE_PERIOD = 48;
const TIDE_LOW = 0.4;
const TRAP_EVERY = 8;
const BLEACH_EVERY = 4;
const BLEACH_T = 0.9;
const BLEACH_DROUGHT = 0.04;
const BLEACH_STORM = 0.03;
const BLEACH_RATE = 0.25;
const BLEACH_REC = 0.003;
const BLEACH_ON = 0.5;
const BLEACH_BITE = 0.03;
const BLEACH_HEALTH = 0.6;
const BLEACH_EVENT = 0.1;
const BLEACH_CLEAR = 0.03;
const ISLE_MAX = 900;
const ISLE_K = 0.25;
const ISLE_OPT = 0.35;
const ISLE_DRIFT = 0.04;
const NEST_R = 5;
const COAST_R = 2;
const COAST_SALT = 0.5;
const FLAT_FOOD = 0.5;
const FLAT_LURE = 0.5;
const DIVER_DEPTH = 0.5;
const DIVER_REACH = 0.85;
const DIVER_MASS = 1.6;

class CoastLayer {
	constructor(world, rng) {
		this.world = world;
		this.rng = rng;
		this.tide = 0;
		this.low = false;
		this.bleach = new Float32Array(world.width * world.height);
		this.bleached = 0;
		this.bleachEvents = 0;
		this.bleachOn = false;
		this.trapped = 0;
		this.trappedSum = 0;
		this.flatMeals = 0;
		this.turtleNests = 0;
		this.hatchRuns = 0;
		this.isleBirths = 0;
		this.rescues = 0;
		this._build(world);
	}

	restoreDerived(world) {
		this.world = world;
		if (!this.bleach || this.bleach.length !== world.width * world.height) this.bleach = new Float32Array(world.width * world.height);
		this._build(world);
	}

	_build(world) {
		const W = world.width;
		const H = world.height;
		const n = W * H;
		const b = world.biome;
		const oc = world.isOcean;
		const B = BIOME_ID;
		const sea = (j) => oc[j] === 1 || OCEAN_SET.has(b[j]);
		const tidal = new Uint8Array(n);
		const isle = new Uint8Array(n);
		const shore = new Uint8Array(n);
		const seaward = new Int32Array(n).fill(-1);
		const beachNear = new Int32Array(n).fill(-1);
		const reefs = [];
		const beaches = [];
		for (let i = 0; i < n; i++) {
			const bi = b[i];
			if (bi === B.CORAL_REEF) reefs.push(i);
			if (bi === B.ROCKY_SHORE) {
				tidal[i] = 1;
				continue;
			}
			if (sea(i)) continue;
			const x = i % W;
			let s = -1;
			if (x + 1 < W && sea(i + 1)) s = i + 1;
			else if (x > 0 && sea(i - 1)) s = i - 1;
			else if (i + W < n && sea(i + W)) s = i + W;
			else if (i - W >= 0 && sea(i - W)) s = i - W;
			if (s >= 0) {
				shore[i] = 1;
				if (bi === B.BEACH || bi === B.ATOLL) {
					tidal[i] = 2;
					seaward[i] = s;
					beaches.push(i);
				}
			}
			if (bi === B.SALT_MARSH) tidal[i] = 2;
		}
		const comp = new Int32Array(n).fill(-1);
		const q = new Int32Array(n);
		for (let i = 0; i < n; i++) {
			if (comp[i] >= 0 || sea(i)) continue;
			let head = 0;
			let tail = 0;
			q[tail++] = i;
			comp[i] = i;
			while (head < tail) {
				const k = q[head++];
				const x = k % W;
				if (x + 1 < W && comp[k + 1] < 0 && !sea(k + 1)) { comp[k + 1] = i; q[tail++] = k + 1; }
				if (x > 0 && comp[k - 1] < 0 && !sea(k - 1)) { comp[k - 1] = i; q[tail++] = k - 1; }
				if (k + W < n && comp[k + W] < 0 && !sea(k + W)) { comp[k + W] = i; q[tail++] = k + W; }
				if (k - W >= 0 && comp[k - W] < 0 && !sea(k - W)) { comp[k - W] = i; q[tail++] = k - W; }
			}
			if (tail <= ISLE_MAX) for (let k = 0; k < tail; k++) isle[q[k]] = 1;
		}
		const coastal = new Uint8Array(n);
		for (let i = 0; i < n; i++) {
			const x = i % W;
			const si = sea(i);
			if (!((x + 1 < W && sea(i + 1) !== si) || (i + W < n && sea(i + W) !== si))) continue;
			const ty = (i - x) / W;
			for (let dy = -COAST_R; dy <= COAST_R; dy++) {
				const y = ty + dy;
				if (y < 0 || y >= H) continue;
				for (let dx = -COAST_R; dx <= COAST_R; dx++) if (x + dx >= 0 && x + dx < W) coastal[y * W + x + dx] = 1;
			}
		}
		const bd = new Float32Array(n).fill(1e9);
		for (const t of beaches) {
			const tx = t % W;
			const ty = (t - tx) / W;
			for (let dy = -NEST_R; dy <= NEST_R; dy++) {
				const y = ty + dy;
				if (y < 0 || y >= H) continue;
				for (let dx = -NEST_R; dx <= NEST_R; dx++) {
					const x = tx + dx;
					if (x < 0 || x >= W) continue;
					const j = y * W + x;
					if (!sea(j)) continue;
					const d = dx * dx + dy * dy;
					if (d < bd[j]) {
						bd[j] = d;
						beachNear[j] = t;
					}
				}
			}
		}
		this.tidal = tidal;
		this.isle = isle;
		this.shore = shore;
		this.coastal = coastal;
		this.seaward = seaward;
		this.beachNear = beachNear;
		this.reefs = Int32Array.from(reefs);
	}

	step(tick, eco) {
		this.tide = tick % TIDE_PERIOD;
		this.low = this.tide < TIDE_PERIOD * TIDE_LOW;
		if (this.low && tick % TRAP_EVERY === 0) this._countTrapped(eco.animals);
		if (tick % BLEACH_EVERY === 0 && this.reefs.length) this._bleach(tick, eco);
	}

	_countTrapped(A) {
		const W = this.world.width;
		let c = 0;
		for (let i = 0; i < A.count; i++) {
			if (!A.alive[i] || A.domain[i] !== 1) continue;
			if (this.tidal[(A.y[i] | 0) * W + (A.x[i] | 0)] === 1) c++;
		}
		this.trapped = c;
		this.trappedSum += c;
	}

	_bleach(tick, eco) {
		const Wx = eco.weather;
		const P = eco.plants;
		const temp = this.world.temperature;
		const n = this.world.width * this.world.height;
		const add = (Wx ? Wx.seasonT + (Wx.drought ? BLEACH_DROUGHT : 0) - (Wx.stormCount > 0 ? BLEACH_STORM : 0) : 0);
		const bl = this.bleach;
		let on = 0;
		for (let k = 0; k < this.reefs.length; k++) {
			const t = this.reefs[k];
			const st = temp[t] + add;
			let v = bl[t];
			if (st > BLEACH_T) v = Math.min(1, v + BLEACH_RATE * (st - BLEACH_T));
			else if (v > 0) v = Math.max(0, v - BLEACH_REC);
			bl[t] = v;
			if (v < BLEACH_ON) continue;
			on++;
			for (let p = t; p < P.biomass.length; p += n) {
				if (!P.species[p]) continue;
				P.biomass[p] *= 1 - BLEACH_BITE * v;
				const h = 1 - BLEACH_HEALTH * v;
				if (P.health[p] > h) P.health[p] = h;
			}
		}
		this.bleached = on;
		const frac = on / this.reefs.length;
		if (!this.bleachOn && frac >= BLEACH_EVENT) {
			this.bleachOn = true;
			this.bleachEvents++;
			if (eco.log) eco.log.push(tick, 'info', `Coral bleaching — warm seas whitened ${Math.round(frac * 100)}% of the reefs`);
		} else if (this.bleachOn && frac < BLEACH_CLEAR) {
			this.bleachOn = false;
			if (eco.log) eco.log.push(tick, 'info', 'The reefs are recovering their colour');
		}
	}
}
