const EGG_CLUTCH_MUL = 1.5;
const EGG_COST = 0.67;
const EGG_TIME = 25;
const EGG_TIME_SIZE = 30;
const EGG_FOOD = 0.8;
const EGG_WET = 0.5;
const EGG_COLD_RATE = 0.5;
const EGG_FAIL = 0.0015;
const EGG_PARA = 0.02;
const GUARD_K = 3;
const CA_FAIL = 0.35;
const DIA_MIN = 0.4;
const DIA_MAX = 400;

class EggPool {
	constructor(world, animals, registry) {
		this.world = world;
		this.animals = animals;
		this.registry = registry;
		this.n = world.width * world.height;
		this.cap = 0;
		this.count = 0;
		this._grow(512);
		this.head = new Int32Array(this.n).fill(-1);
		this.guardM = new Float32Array(this.n);
		this.guardT = new Int32Array(this.n).fill(-9);
		this.nestCell = new Int32Array(animals.gcols * animals.grows).fill(-1);
		this.raids = 0;
		this.repelled = 0;
		this.paraFailed = 0;
		this.nestLaid = 0;
		this.nestHatched = 0;
		this.laid = 0;
		this.hatched = 0;
		this.eaten = 0;
		this.failed = 0;
		this.caFailed = 0;
		this.diapause = 0;
		this.diaHatched = 0;
	}

	_grow(newCap) {
		const old = this.cap;
		const grow = (a, T, k) => {
			const b = new T(newCap * k);
			if (old) b.set(a);
			return b;
		};
		this.x = grow(this.x, Float32Array, 1);
		this.y = grow(this.y, Float32Array, 1);
		this.tile = grow(this.tile, Int32Array, 1);
		this.sp = grow(this.sp, Int32Array, 1);
		this.imm = grow(this.imm, Int32Array, 1);
		this.energy = grow(this.energy, Float32Array, 1);
		this.timer = grow(this.timer, Float32Array, 1);
		this.dom = grow(this.dom, Uint8Array, 1);
		this.nst = grow(this.nst, Uint8Array, 1);
		this.str = grow(this.str, Int32Array, 1);
		this.ca = grow(this.ca, Uint8Array, 1);
		this.dia = grow(this.dia, Uint16Array, 1);
		this.alive = grow(this.alive, Uint8Array, 1);
		this.next = grow(this.next, Int32Array, 1);
		this.genome = grow(this.genome, Float32Array, AG);
		this.cap = newCap;
	}

	lay(sp, genome, gOff, x, y, tile, energy, dom, imm, nst, str, ca) {
		if (this.count >= this.cap) this._grow(this.cap * 2);
		const e = this.count++;
		const o = e * AG;
		for (let k = 0; k < AG; k++) this.genome[o + k] = genome[gOff + k];
		this.x[e] = x;
		this.y[e] = y;
		this.tile[e] = tile;
		this.sp[e] = sp.id;
		this.imm[e] = imm;
		this.energy[e] = energy;
		this.timer[e] = EGG_TIME + EGG_TIME_SIZE * genome[gOff + G_SIZE];
		this.dom[e] = dom;
		this.nst[e] = nst ? 1 : 0;
		this.str[e] = str || 0;
		this.ca[e] = ca ? 1 : 0;
		this.dia[e] = 0;
		if (nst) this.nestLaid++;
		this.alive[e] = 1;
		this.next[e] = this.head[tile];
		this.head[tile] = e;
		this.laid++;
	}

	guard(tile, m, tick) {
		if (this.guardT[tile] !== tick) {
			this.guardT[tile] = tick;
			this.guardM[tile] = m;
		} else if (m > this.guardM[tile]) this.guardM[tile] = m;
	}

	eatAt(tile, landEater, sp, room, mass, tick) {
		let got = 0;
		let rolled = false;
		const guarded = tick - this.guardT[tile] <= 1;
		for (let e = this.head[tile]; e >= 0 && got < room; e = this.next[e]) {
			if (!this.alive[e] || this.sp[e] === sp) continue;
			if (landEater ? this.dom[e] === 1 : this.dom[e] !== 1) continue;
			if (this.nst[e]) {
				if (guarded && !rolled) {
					rolled = true;
					if (this.animals.rng.next() >= mass / (mass + this.guardM[tile] * GUARD_K)) {
						this.repelled++;
						return got > 0 ? got : -1;
					}
				}
				this.raids++;
			}
			this.alive[e] = 0;
			this.eaten++;
			got += this.energy[e];
		}
		return got;
	}

	step(Wx) {
		const A = this.animals;
		const R = this.registry;
		const n = this.count;
		const snow = Wx ? Wx.snow : null;
		const fresh = Wx ? Wx.fresh : null;
		const wet = Wx ? Wx.wet : null;
		const seasonT = Wx ? Wx.seasonT : 0;
		const temp = this.world.temperature;
		const rng = A.rng;
		const pl = A.parasiteLoad;
		const W = this.world.width;
		const D = A.disease && A.disease.on ? A.disease : null;
		const winter = Wx && Wx.season < DORM_SEASON;
		let paused = 0;
		for (let e = 0; e < n; e++) {
			if (!this.alive[e]) continue;
			const t = this.tile[e];
			const dom = this.dom[e];
			const bad = snow && dom !== 1 && (snow[t] > SNOW_SHOW || (dom === 2 && !fresh[t] && wet[t] <= EGG_WET));
			const canDia = dom !== 1 && this.genome[e * AG + G_DORMANCY] > DIA_MIN && this.dia[e] < DIA_MAX;
			if (rng.next() < EGG_FAIL || (bad && !canDia)) {
				this.alive[e] = 0;
				this.failed++;
				continue;
			}
			if (canDia && (bad || (winter && temp[t] + seasonT < DORM_T))) {
				this.dia[e]++;
				paused++;
				continue;
			}
			if (this.nst[e] && pl[t] > 0 && rng.next() < EGG_PARA * pl[t]) {
				this.alive[e] = 0;
				this.failed++;
				this.paraFailed++;
				continue;
			}
			let rate = 1;
			if (dom === 0) {
				const et = temp[t] + seasonT;
				if (et < 0.5) rate = Math.max(EGG_COLD_RATE, 1 - (0.5 - et) * 2 * (1 - EGG_COLD_RATE));
			}
			this.timer[e] -= rate;
			if (this.timer[e] > 0) continue;
			this.alive[e] = 0;
			if (this.ca[e] && rng.next() < CA_FAIL) {
				this.failed++;
				this.caFailed++;
				continue;
			}
			const sp = R.get(this.sp[e]);
			if (!sp || (sp.population <= 0 && sp.peak > 0) || A.count >= A.maxAnimals + 1500) {
				this.failed++;
				continue;
			}
			const j = A.spawn(sp, this.genome, e * AG, this.x[e], this.y[e], 0);
			A.energy[j] = Math.min(this.energy[e], A.emax[j] * A.gf[j] * 0.6);
			A.natImm[j] = this.imm[e];
			if (this.nst[e]) {
				this.nestHatched++;
				const tx = t % W;
				A.home[j] = 3;
				A.nx[j] = tx + 0.5;
				A.ny[j] = (t - tx) / W + 0.5;
				if (D && this.str[e]) D.exposeAnimal(j, this.str[e], 1);
			}
			this.hatched++;
			if (this.dia[e]) this.diaHatched++;
		}
		this.diapause = paused;
		this._compact();
	}

	_compact() {
		const head = this.head;
		for (let e = 0; e < this.count; e++) head[this.tile[e]] = -1;
		let w = 0;
		for (let e = 0; e < this.count; e++) {
			if (!this.alive[e]) continue;
			if (w !== e) {
				this.x[w] = this.x[e];
				this.y[w] = this.y[e];
				this.tile[w] = this.tile[e];
				this.sp[w] = this.sp[e];
				this.imm[w] = this.imm[e];
				this.energy[w] = this.energy[e];
				this.timer[w] = this.timer[e];
				this.dom[w] = this.dom[e];
				this.nst[w] = this.nst[e];
				this.str[w] = this.str[e];
				this.ca[w] = this.ca[e];
				this.dia[w] = this.dia[e];
				this.alive[w] = 1;
				this.genome.copyWithin(w * AG, e * AG, e * AG + AG);
			}
			w++;
		}
		this.count = w;
		const nc = this.nestCell;
		nc.fill(-1);
		const A = this.animals;
		const W = this.world.width;
		const cols = A.gcols;
		for (let e = 0; e < w; e++) {
			const t = this.tile[e];
			this.next[e] = head[t];
			head[t] = e;
			if (this.nst[e]) {
				const tx = t % W;
				nc[(((t - tx) / W / GRID) | 0) * cols + ((tx / GRID) | 0)] = t;
			}
		}
	}

	reassignSpecies(fromSp, toSp) {
		const from = fromSp.id;
		for (let e = 0; e < this.count; e++) if (this.sp[e] === from) this.sp[e] = toSp.id;
	}
}
