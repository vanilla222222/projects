const DG = 4;
const D_TRANS = 0, D_VIR = 1, D_RANGE = 2, D_HUE = 3;
const DISEASE_WEIGHTS = [1, 1, 0.8, 0.3];
const DISEASE_SPECIATION = 0.1;
const DISEASE_SPLIT_MIN_POP = 10;
const DISEASE_KINDS = ['animal', 'plant'];
const VIR_TRADE = 0.75;
const DUR_BASE = 200;
const RES_DUR = 0.6;
const BLIGHT_DUR = 150;
const RANGE_BASE = 0.05;
const RANGE_SPAN = 0.25;
const JUMP_K = 0.02;
const JUMP_K_P = 0.001;
const JUMP_SPAN = 0.15;
const JUMP_CLS_K = 0.5;
const INVERT_EMERGE = 0.15;
const JUMP_LOG_GAP = 1200;
const PATHO_MUT = 0.015;
const PATHO_MUT_RATE = 0.5;
const PATHO_MUT_SD = 0.05;
const PATHO_DRIFT = 0.5;
const SEED_HOSTS = 10;
const SEED_TILES = 12;
const SEED_R = 6;
const SEED_TILE_R = 3;
const EMERGE_MIN_A = 40;
const EMERGE_MIN_P = 150;
const EMERGE_GAP = 900;
const EMERGE_P = 0.05;
const EMERGE_VIR = 0.45;
const EMERGE_SD = 0.08;
const BLIGHT_EVERY = 3;
const BLIGHT_DMG = 0.08;
const BLIGHT_SPREAD = 0.08;
const BLIGHT_RES = 0.8;
const MONO_BOOST = 2;
const CARCASS_DECAY = 0.97;
const VECTOR_DECAY = 0.95;
const LOAD_MIN = 0.02;
const DIEOFF_EVERY = 60;
const DIEOFF_WINDOW = 5;
const DIEOFF_MIN = 20;
const DIEOFF_FRAC = 0.3;
const STRAIN_ICONS = ['virus', 'bacterium', 'protozoan', 'prion', 'helminth'];
const BLIGHT_ICONS = ['blight', 'mold'];

class DiseaseLayer {
	constructor(world, plants, animals, registry, log, rng) {
		this.world = world;
		this.plants = plants;
		this.animals = animals;
		this.registry = registry;
		this.log = log;
		this.rng = rng;
		const n = world.width * world.height;
		this.n = n;
		this.on = true;
		this.dirty = false;
		this.carcassStrain = new Int32Array(n);
		this.carcassLoad = new Float32Array(n);
		this.vectorStrain = new Int32Array(n);
		this.vectorLoad = new Float32Array(n);
		this.bList = new Int32Array(2 * n);
		this.bIn = new Uint8Array(2 * n);
		this.bCount = 0;
		this.sTrans = new Float32Array(256);
		this.sVir = new Float32Array(256);
		this.sRange = new Float32Array(256);
		this.sDur = new Float32Array(256);
		this.live = new Set();
		this.speciesStrain = new Map();
		this.sickAnimals = 0;
		this.blightSlots = 0;
		this.animalDeaths = 0;
		this.plantDeaths = 0;
		this.created = 0;
		this.mutated = 0;
		this.jumps = 0;
		this.outbreaks = 0;
		this.blights = 0;
		this.lastHad = [0, 0];
		this.version = 0;
		this._jumped = false;
		this._child = new Float32Array(DG);
		this._jumpLogged = new Map();
		this._best = new Map();
	}

	_ensure(id) {
		let cap = this.sTrans.length;
		if (id < cap) return;
		while (cap <= id) cap *= 2;
		for (const f of ['sTrans', 'sVir', 'sRange', 'sDur']) {
			const a = new Float32Array(cap);
			a.set(this[f]);
			this[f] = a;
		}
	}

	_params(st) {
		const id = st.id;
		this._ensure(id);
		const m = st.mean;
		const vir = m[D_VIR];
		this.sVir[id] = vir;
		this.sTrans[id] = m[D_TRANS] * (1 - VIR_TRADE * vir);
		this.sRange[id] = RANGE_BASE + RANGE_SPAN * m[D_RANGE];
		this.sDur[id] = (st.hostKind === 'plant' ? BLIGHT_DUR : DUR_BASE) * (1 - 0.5 * vir);
	}

	_newStrain(genome, kind, hostId, hostGenome, parent, tick, origin) {
		const r = this.rng;
		const hue = kind === 'plant' ? 18 + 50 * genome[D_HUE] : 55 + 95 * genome[D_HUE];
		const hsl = [hue, 0.5 + r.next() * 0.2, 0.42 + r.next() * 0.1];
		const sp = this.registry.create(
			{
				group: 'pathogen',
				domain: 'land',
				genome,
				parentId: parent ? parent.id : null,
				generation: parent ? parent.generation + 1 : 0,
				tick,
				origin,
			},
			hsl
		);
		sp.hostKind = kind;
		sp.hostId = hostId;
		sp.hostGenome = Float32Array.from(hostGenome);
		const hs = kind === 'animal' ? this.registry.get(hostId) : null;
		sp.hostCls = hs && hs.cls !== undefined ? hs.cls : -1;
		sp.category = kind === 'plant' ? 'blight' : 'virus';
		sp.icon = kind === 'plant' ? BLIGHT_ICONS[sp.id % BLIGHT_ICONS.length] : STRAIN_ICONS[sp.id % STRAIN_ICONS.length];
		sp.infected = 0;
		sp.deaths = 0;
		sp.recentDeaths = 0;
		sp.hosts = new Map();
		sp._dHist = new Float64Array(DIEOFF_WINDOW);
		sp._dIdx = 0;
		sp._dieoff = false;
		sp._jumps = null;
		this._params(sp);
		this.created++;
		return sp;
	}

	_compat(st, hostId, weights, jk) {
		this._jumped = false;
		if (hostId === st.hostId) return 1;
		const h = this.registry.get(hostId);
		const cross = st.hostCls >= 0 && h.cls !== undefined && h.cls !== st.hostCls;
		if (cross && (h.cls === CLS_INVT || st.hostCls === CLS_INVT)) return 0;
		const d = geneDistance(h.genome, 0, st.hostGenome, 0, weights);
		const r = this.sRange[st.id];
		if (d <= r) {
			if (!cross) return 1;
			this._jumped = true;
			return JUMP_CLS_K;
		}
		const c = 1 - (d - r) / JUMP_SPAN;
		if (!(c > 0)) return 0;
		this._jumped = true;
		return jk * c * (cross ? JUMP_CLS_K : 1);
	}

	_transmit(st, hostId, tick) {
		return this._jumped ? this._jump(st, hostId, tick) : this._mutate(st, tick);
	}

	_mutate(st, tick) {
		const rng = this.rng;
		if (rng.next() >= PATHO_MUT) return st;
		const c = this._child;
		mutateGenes(st.mean, 0, c, 0, DG, rng, PATHO_MUT_RATE, PATHO_MUT_SD);
		const far = geneDistance(c, 0, st.mean, 0, DISEASE_WEIGHTS) > DISEASE_SPECIATION;
		let sp = far ? this.registry.matchDaughter(st, c, DISEASE_WEIGHTS, DISEASE_SPECIATION) : null;
		if (!far || (!sp && !this.registry.canSplit(st, DISEASE_SPLIT_MIN_POP))) {
			const m = st.mean;
			for (let k = 0; k < DG; k++) m[k] += (c[k] - m[k]) * PATHO_DRIFT;
			this._params(st);
			return st;
		}
		if (!sp) {
			sp = this._newStrain(c, st.hostKind, st.hostId, st.hostGenome, st, tick, null);
			this.mutated++;
			this.log.push(tick, 'speciation', `${sp.name} (new strain) branched from ${st.name}`, sp.id);
		}
		return sp;
	}

	_jump(st, hostId, tick) {
		let map = st._jumps;
		if (!map) map = st._jumps = new Map();
		const prev = map.get(hostId);
		if (prev && prev.population > 0) return prev;
		const h = this.registry.get(hostId);
		const sp = this._newStrain(st.mean, st.hostKind, hostId, h.genome, st, tick, 'jump');
		map.set(hostId, sp);
		this.jumps++;
		const key = st.id * 1e6 + hostId;
		const last = this._jumpLogged.get(key);
		if (last === undefined || tick - last >= JUMP_LOG_GAP) {
			this._jumpLogged.set(key, tick);
			const from = st.hostCls >= 0 && sp.hostCls >= 0 && st.hostCls !== sp.hostCls ? ` — from ${CLASS_PLURAL[st.hostCls]} to ${CLASS_PLURAL[sp.hostCls]}` : '';
			this.log.push(tick, 'outbreak', `${st.name} jumped to ${h.name} as ${sp.name}${from}`, sp.id);
		}
		return sp;
	}

	_add(st) {
		this.registry.add(st);
		st.infected = st.population;
		this.live.add(st);
		this.dirty = true;
	}

	_drop(st) {
		this.registry.remove(st);
		st.infected = st.population;
		if (st.population <= 0) this.live.delete(st);
	}

	exposeAnimal(j, s, k) {
		const A = this.animals;
		if (A.strain[j] || A.natImm[j] === s || (A.immune[j] === s && A.imTime[j] > 0)) return false;
		const st = this.registry.get(s);
		if (!st || st.population <= 0) return false;
		const r = this.rng.next();
		const b = k * this.sTrans[s] * (1 - RES_EFFECT * A.genome[j * AG + G_RES]) * (1 + (ELDER_INFECT * (1 - A.ef[j])) / (1 - ELDER_MIN)) * A._sus(j);
		if (r >= b) return false;
		const hsp = A.sp[j];
		if (r >= b * this._compat(st, hsp, ANIMAL_WEIGHTS, JUMP_K)) return false;
		this.infectAnimal(j, this._transmit(st, hsp, this.registry.tick).id);
		return true;
	}

	infectAnimal(i, s) {
		const A = this.animals;
		A.strain[i] = s;
		A.itime[i] = Math.max(1, (this.sDur[s] * (1 - RES_DUR * A.genome[i * AG + G_RES])) | 0);
		this._add(this.registry.get(s));
		this.sickAnimals++;
	}

	releaseAnimal(i) {
		const A = this.animals;
		const s = A.strain[i];
		if (!s) return 0;
		A.strain[i] = 0;
		A.itime[i] = 0;
		this._drop(this.registry.get(s));
		this.sickAnimals--;
		return s;
	}

	recoverAnimal(i) {
		const A = this.animals;
		A.immune[i] = this.releaseAnimal(i);
		A.imTime[i] = IMMUNE_TICKS;
	}

	countDeath(s) {
		this.registry.get(s).deaths++;
		this.animalDeaths++;
	}

	animalDied(i, tile, frac) {
		const s = this.releaseAnimal(i);
		if (!s || !this.on) return;
		this.carcassStrain[tile] = s;
		this.carcassLoad[tile] = frac;
	}

	infectPlant(p, s) {
		const P = this.plants;
		P.blight[p] = s;
		const d = this.sDur[s] | 0;
		P.blightT[p] = d < 65535 ? d : 65535;
		this._add(this.registry.get(s));
		this.blightSlots++;
		if (!this.bIn[p]) {
			this.bIn[p] = 1;
			this.bList[this.bCount++] = p;
		}
	}

	releasePlant(p) {
		const P = this.plants;
		const s = P.blight[p];
		if (!s) return;
		P.blight[p] = 0;
		P.blightT[p] = 0;
		this._drop(this.registry.get(s));
		this.blightSlots--;
	}

	blightDeath(p) {
		this.registry.get(this.plants.blight[p]).deaths++;
		this.plantDeaths++;
	}

	step(tick) {
		if (!this.on) return;
		const n = this.n;
		const cs = this.carcassStrain;
		const cl = this.carcassLoad;
		const vs = this.vectorStrain;
		const vl = this.vectorLoad;
		for (let i = 0; i < n; i++) {
			let c = cl[i];
			if (c > 0) {
				c *= CARCASS_DECAY;
				if (c < LOAD_MIN) {
					c = 0;
					cs[i] = 0;
				}
				cl[i] = c;
			}
			let v = vl[i];
			if (v > 0) {
				v *= VECTOR_DECAY;
				if (v < LOAD_MIN) {
					v = 0;
					vs[i] = 0;
				}
				vl[i] = v;
			}
		}
		if (tick % BLIGHT_EVERY === 0 && this.bCount) this._blightPass(tick);
		if (tick % DIEOFF_EVERY === 0) this._dieoff(tick);
		this.version++;
	}

	_blightPass(tick) {
		const P = this.plants;
		const n = this.n;
		const W = this.world.width;
		const blight = P.blight;
		const bT = P.blightT;
		const imm = P.blightImm;
		const species = P.species;
		const health = P.health;
		const pg = P.genome;
		const list = this.bList;
		const inl = this.bIn;
		const cnt = this.bCount;
		let w = 0;
		for (let k = 0; k < cnt; k++) {
			const p = list[k];
			const s = blight[p];
			if (!s) {
				inl[p] = 0;
				continue;
			}
			list[w++] = p;
			health[p] -= BLIGHT_DMG * this.sVir[s] * (1 - BLIGHT_RES * pg[p * PG + 14]) * BLIGHT_EVERY;
			const t = bT[p];
			if (t <= BLIGHT_EVERY) {
				imm[p] = s;
				this.releasePlant(p);
				continue;
			}
			bT[p] = t - BLIGHT_EVERY;
			const i = p < n ? p : p - n;
			const q0 = p - i;
			const x = i % W;
			const sid = species[p];
			const te = this.sTrans[s] * BLIGHT_SPREAD;
			if (x > 0) this._blightTry(q0 + i - 1, s, sid, te, tick);
			if (x < W - 1) this._blightTry(q0 + i + 1, s, sid, te, tick);
			if (i >= W) this._blightTry(q0 + i - W, s, sid, te, tick);
			if (i + W < n) this._blightTry(q0 + i + W, s, sid, te, tick);
		}
		for (let k = cnt; k < this.bCount; k++) list[w++] = list[k];
		this.bCount = w;
	}

	_blightTry(q, s, sid, te, tick) {
		const P = this.plants;
		const qs = P.species[q];
		if (!qs || P.blight[q] || P.blightImm[q] === s) return;
		const same = qs === sid;
		const r = this.rng.next();
		const b = te * (same ? MONO_BOOST : 1) * (1 - BLIGHT_RES * P.genome[q * PG + 14]);
		if (r >= b) return;
		const st = this.registry.get(s);
		if (same) this._jumped = false;
		else if (r >= b * this._compat(st, qs, PLANT_WEIGHTS, JUMP_K_P)) return;
		this.infectPlant(q, this._transmit(st, qs, tick).id);
	}

	_dieoff(tick) {
		const R = this.registry;
		for (const st of this.live) {
			const h = st._dHist;
			const old = h[st._dIdx];
			h[st._dIdx] = st.deaths;
			st._dIdx = (st._dIdx + 1) % DIEOFF_WINDOW;
			st.recentDeaths = st.deaths - old;
			if (st._dieoff) continue;
			const host = R.get(st.hostId);
			const need = DIEOFF_FRAC * host.population;
			if (st.recentDeaths < (need > DIEOFF_MIN ? need : DIEOFF_MIN)) continue;
			st._dieoff = true;
			this.log.push(tick, 'outbreak', `${st.name} caused a mass die-off of ${host.name}`, st.id);
		}
	}

	maybeEmerge(tick) {
		for (let k = 0; k < 2; k++) {
			const kind = DISEASE_KINDS[k];
			let live = 0;
			for (const st of this.live) if (st.hostKind === kind) live++;
			if (live) this.lastHad[k] = tick;
			if ((!live && tick - this.lastHad[k] >= EMERGE_GAP) || this.rng.next() < EMERGE_P) this.emerge(kind, tick);
		}
	}

	emerge(kind, tick = this.registry.tick) {
		if (!this.on) return null;
		const R = this.registry;
		const rng = this.rng;
		const isP = kind === 'plant';
		const group = isP ? 'plant' : 'animal';
		const min = isP ? EMERGE_MIN_P : EMERGE_MIN_A;
		const weight = (sp) => sp.population * (sp.cls === CLS_INVT ? INVERT_EMERGE : 1);
		let total = 0;
		for (const id of R.living) {
			const sp = R.get(id);
			if (sp.group === group && !(sp.kind | 0) && sp.population >= min) total += weight(sp);
		}
		if (!total) return null;
		let r = rng.next() * total;
		let host = null;
		for (const id of R.living) {
			const sp = R.get(id);
			if (sp.group !== group || sp.kind | 0 || sp.population < min) continue;
			host = sp;
			r -= weight(sp);
			if (r < 0) break;
		}
		const c = this._child;
		c[D_TRANS] = clamp01(0.5 + gaussRand(rng) * EMERGE_SD);
		c[D_VIR] = clamp01(EMERGE_VIR + gaussRand(rng) * EMERGE_SD);
		c[D_RANGE] = clamp01(0.3 + gaussRand(rng) * EMERGE_SD);
		c[D_HUE] = rng.next();
		const st = this._newStrain(c, kind, host.id, host.genome, null, tick, 'emerged');
		const got = isP ? this._seedPlants(st, host) : this._seedAnimals(st, host);
		if (!got) return null;
		this.lastHad[isP ? 1 : 0] = tick;
		if (isP) {
			this.blights++;
			this.log.push(tick, 'outbreak', `${st.name} blight broke out in ${host.name}`, st.id);
		} else {
			this.outbreaks++;
			this.log.push(tick, 'outbreak', `${st.name} broke out among ${host.name}`, st.id);
		}
		return st;
	}

	_seedAnimals(st, host) {
		const A = this.animals;
		const cnt = A.count;
		const hid = host.id;
		let m = (this.rng.next() * host.population) | 0;
		let i0 = -1;
		for (let i = 0; i < cnt; i++) {
			if (A.sp[i] !== hid || !A.alive[i]) continue;
			i0 = i;
			if (m-- <= 0) break;
		}
		if (i0 < 0) return 0;
		const x0 = A.x[i0];
		const y0 = A.y[i0];
		const r2 = SEED_R * SEED_R;
		let got = 0;
		if (!A.strain[i0]) {
			this.infectAnimal(i0, st.id);
			got++;
		}
		for (let i = 0; i < cnt && got < SEED_HOSTS; i++) {
			if (A.sp[i] !== hid || !A.alive[i] || A.strain[i]) continue;
			const dx = A.x[i] - x0;
			const dy = A.y[i] - y0;
			if (dx * dx + dy * dy > r2) continue;
			this.infectAnimal(i, st.id);
			got++;
		}
		return got;
	}

	_seedPlants(st, host) {
		const P = this.plants;
		const n = this.n;
		const W = this.world.width;
		const H = this.world.height;
		const hid = host.id;
		const species = P.species;
		let m = (this.rng.next() * host.population) | 0;
		let p0 = -1;
		for (let p = 0; p < 2 * n; p++) {
			if (species[p] !== hid || P.blight[p]) continue;
			p0 = p;
			if (m-- <= 0) break;
		}
		if (p0 < 0) return 0;
		const i0 = p0 < n ? p0 : p0 - n;
		const q0 = p0 - i0;
		const x0 = i0 % W;
		const y0 = (i0 / W) | 0;
		let got = 0;
		for (let dy = -SEED_TILE_R; dy <= SEED_TILE_R && got < SEED_TILES; dy++) {
			const y = y0 + dy;
			if (y < 0 || y >= H) continue;
			for (let dx = -SEED_TILE_R; dx <= SEED_TILE_R && got < SEED_TILES; dx++) {
				const x = x0 + dx;
				if (x < 0 || x >= W) continue;
				const q = q0 + y * W + x;
				if (species[q] !== hid || P.blight[q]) continue;
				this.infectPlant(q, st.id);
				got++;
			}
		}
		return got;
	}

	clearAll() {
		if (!this.dirty) return;
		const A = this.animals;
		for (let i = 0; i < A.count; i++) if (A.strain[i]) this.releaseAnimal(i);
		const P = this.plants;
		const list = this.bList;
		for (let k = 0; k < this.bCount; k++) {
			const p = list[k];
			if (P.blight[p]) this.releasePlant(p);
			this.bIn[p] = 0;
		}
		this.bCount = 0;
		this.carcassStrain.fill(0);
		this.carcassLoad.fill(0);
		this.vectorStrain.fill(0);
		this.vectorLoad.fill(0);
		this.speciesStrain.clear();
		this.dirty = false;
		this.version++;
	}

	refreshSpeciesMeans() {
		const R = this.registry;
		for (const st of this.live) {
			st.hosts.clear();
			st.infected = st.population;
		}
		const A = this.animals;
		for (let i = 0; i < A.count; i++) {
			const s = A.strain[i];
			if (!s) continue;
			const h = R.get(s).hosts;
			const id = A.sp[i];
			h.set(id, (h.get(id) || 0) + 1);
		}
		const P = this.plants;
		const list = this.bList;
		for (let k = 0; k < this.bCount; k++) {
			const p = list[k];
			const s = P.blight[p];
			if (!s) continue;
			const h = R.get(s).hosts;
			const id = P.species[p];
			h.set(id, (h.get(id) || 0) + 1);
		}
		const best = this._best;
		const ss = this.speciesStrain;
		best.clear();
		ss.clear();
		for (const st of this.live) {
			for (const [h, c] of st.hosts) {
				if (c > (best.get(h) || 0)) {
					best.set(h, c);
					ss.set(h, st.id);
				}
			}
		}
	}

	reassignSpecies(fromSp, toSp) {
		const from = fromSp.id;
		const to = toSp.id;
		const A = this.animals;
		let moved = 0;
		for (let i = 0; i < A.count; i++) {
			if (A.strain[i] === from) {
				A.strain[i] = to;
				if (A.alive[i]) moved++;
			}
			if (A.immune[i] === from) A.immune[i] = to;
			if (A.natImm[i] === from) A.natImm[i] = to;
		}
		const P = this.plants;
		for (let p = 0; p < 2 * this.n; p++) {
			if (P.blight[p] === from) {
				P.blight[p] = to;
				moved++;
			}
			if (P.blightImm[p] === from) P.blightImm[p] = to;
		}
		const cs = this.carcassStrain;
		const vs = this.vectorStrain;
		for (let i = 0; i < this.n; i++) {
			if (cs[i] === from) cs[i] = to;
			if (vs[i] === from) vs[i] = to;
		}
		this.live.delete(fromSp);
		fromSp.infected = 0;
		return moved;
	}

	remapHost(fromSp, toSp) {
		for (const st of this.live) if (st.hostId === fromSp.id) st.hostId = toSp.id;
	}

	hostIndices(strainId, out = []) {
		out.length = 0;
		const R = this.registry.get(strainId);
		if (!R) return out;
		if (R.hostKind === 'plant') {
			const P = this.plants;
			for (let k = 0; k < this.bCount; k++) if (P.blight[this.bList[k]] === strainId) out.push(this.bList[k]);
		} else {
			const A = this.animals;
			for (let i = 0; i < A.count; i++) if (A.strain[i] === strainId) out.push(i);
		}
		return out;
	}
}
