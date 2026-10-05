const RIV_EVERY = 4;
const RIV_NUT = 0.05;
const RIV_LIT = 0.08;
const RIV_CARRION = 0.05;
const RIV_EGG = 0.3;
const RIV_LARVA = 0.3;
const RIV_WASH = 0.03;
const RIV_WASH_FLOW = 2;
const SALMON_RUN = 0.45;
const SALMON_READY = 0.45;
const SALMON_HEAD = 1.6;
const MUSSEL_FILTER = 0.05;
const MUSSEL_E = 2.4;
const MUSSEL_NUT = 0.5;
const FLOOD_AT = 60;
const FLOOD_PULSE = 0.08;
const RIV_FLOOD_R = 7;
const TURN_SPRING = 20;
const TURN_AUTUMN = 260;
const TURN_K = 0.35;
const BLOOM_FROM = 140;
const BLOOM_TO = 220;
const BLOOM_EVERY = 20;
const BLOOM_K = 0.4;
const RIV_BLOOM_USE = 0.25;
const BLOOM_NUT = 0.4;
const DAM_P = 0.004;
const DAM_MAX = 8;
const DAM_GAP = 160;
const DAM_LEN = 6;
const DAM_MIN = 2;
const DAM_TREE_R = 2;
const DAM_TREE_WOOD = 0.62;
const DAM_READY = 0.5;
const DAM_WET = 0.08;
const KIND_SALMON = 1;
const KIND_MUSSEL = 2;
const KIND_BEAVER = 3;
const RIVER_KIND = { salmon: KIND_SALMON, mussel: KIND_MUSSEL, beaver: KIND_BEAVER };

class RiverLayer {
	constructor(world, rng) {
		this.world = world;
		this.n = world.width * world.height;
		this.W = world.width;
		this.H = world.height;
		this.rng = rng;
		this.dams = 0;
		this.lastDam = -DAM_GAP;
		this.eggDrift = 0;
		this.larvaDrift = 0;
		this.runs = 0;
		this.filtered = 0;
		this.pulses = 0;
		this.turnovers = 0;
		this.blooms = 0;
		this.treesFelled = 0;
		this._build(world);
	}

	restoreDerived(world) {
		this._build(world);
	}

	static flowing(b) {
		return b === BIOME_ID.RIVER || b === BIOME_ID.RAPIDS;
	}

	_build(world) {
		const n = this.n;
		const W = this.W;
		const H = this.H;
		const bio = world.biome;
		const rf = world.riverFlow;
		const down = world.down;
		const dn = (this.dn = new Int32Array(n).fill(-1));
		const up = (this.up = new Int32Array(n).fill(-1));
		const fdx = (this.fdx = new Float32Array(n));
		const fdy = (this.fdy = new Float32Array(n));
		const flow = [];
		const flood = [];
		const still = [];
		const wet = (i) => WATER_BIOME_SET.has(bio[i]);
		for (let i = 0; i < n; i++) {
			const b = bio[i];
			if (b === BIOME_ID.FLOODPLAIN) flood.push(i);
			else if (b === BIOME_ID.LAKE || b === BIOME_ID.OXBOW || b === BIOME_ID.POND || b === BIOME_ID.BEAVER_POND) still.push(i);
			if (!RiverLayer.flowing(b)) continue;
			flow.push(i);
			const x = i % W;
			const y = (i - x) / W;
			let d = -1;
			const g = down ? down[i] : -1;
			if (g >= 0 && g !== i && wet(g)) {
				const gx = g % W;
				const gy = (g - gx) / W;
				if (Math.abs(gx - x) <= 1 && Math.abs(gy - y) <= 1) d = g;
			}
			if (d < 0) {
				let sink = -1;
				let best = -1;
				let bf = rf[i];
				for (let oy = -1; oy <= 1; oy++) {
					const yy = y + oy;
					if (yy < 0 || yy >= H) continue;
					for (let ox = -1; ox <= 1; ox++) {
						const xx = x + ox;
						if ((!ox && !oy) || xx < 0 || xx >= W) continue;
						const j = yy * W + xx;
						if (!wet(j)) continue;
						if (!RiverLayer.flowing(bio[j])) {
							if (sink < 0) sink = j;
						} else if (rf[j] > bf) {
							bf = rf[j];
							best = j;
						}
					}
				}
				d = sink >= 0 ? sink : best;
			}
			if (d < 0) continue;
			dn[i] = d;
			const dx = (d % W) - x;
			const dy = ((d - (d % W)) / W) - y;
			const l = Math.sqrt(dx * dx + dy * dy);
			fdx[i] = dx / l;
			fdy[i] = dy / l;
		}
		for (const i of flow) {
			const d = dn[i];
			if (d < 0 || !RiverLayer.flowing(bio[d])) continue;
			const u = up[d];
			if (u < 0 || rf[i] > rf[u] || (rf[i] === rf[u] && i < u)) up[d] = i;
		}
		flow.sort((a, b) => rf[b] - rf[a] || a - b);
		this.flow = Int32Array.from(flow);
		this.flood = Int32Array.from(flood);
		this.still = Int32Array.from(still);
	}

	step(tick, eco) {
		if (tick % RIV_EVERY) return;
		const P = eco.plants;
		const S = P.soil;
		if (S) this._drift(P, S);
		if (eco.eggs) this._eggs(eco.eggs, P);
		this._animals(eco, tick);
		if (!eco.options || eco.options.seasons) {
			const ph = tick % YEAR_TICKS;
			if (ph === FLOOD_AT && S) this._pulse(eco, tick);
			if ((ph === TURN_SPRING || ph === TURN_AUTUMN) && S) this._turnover(P, S);
			if (ph >= BLOOM_FROM && ph < BLOOM_TO && ph % BLOOM_EVERY === 0 && S) this._bloom(P, S);
		}
	}

	_drift(P, S) {
		const flow = this.flow;
		const dn = this.dn;
		const nut = S.nutrient;
		const lit = S.litter;
		const car = S.carrion;
		const rf = this.world.riverFlow;
		for (let k = 0; k < flow.length; k++) {
			const i = flow[k];
			const d = dn[i];
			if (d < 0) continue;
			const mn = nut[i] * RIV_NUT;
			nut[i] -= mn;
			const v = nut[d] + mn;
			nut[d] = v < SOIL_MAX ? v : SOIL_MAX;
			const ml = lit[i] * RIV_LIT;
			lit[i] -= ml;
			lit[d] += ml;
			if (car[i] > 0) {
				const mc = car[i] * RIV_CARRION;
				car[i] -= mc;
				car[d] += mc;
			}
			if (P.species[i] && rf[i] > RIV_WASH_FLOW) {
				const lost = P.biomass[i] * RIV_WASH;
				P.biomass[i] -= lost;
				lit[d] += lost;
			}
		}
	}

	_eggs(E, P) {
		const dn = this.dn;
		const bio = this.world.biome;
		const rng = this.rng;
		const W = this.W;
		for (let e = 0; e < E.count; e++) {
			if (!E.alive[e] || E.dom[e] !== 1 || E.nst[e]) continue;
			const t = E.tile[e];
			if (!RiverLayer.flowing(bio[t])) continue;
			const d = dn[t];
			if (d < 0 || !P.water[d] || rng.next() >= RIV_EGG) continue;
			E.head[t] = -1;
			const dx = d % W;
			E.tile[e] = d;
			E.x[e] = dx + (E.x[e] - Math.floor(E.x[e]));
			E.y[e] = (d - dx) / W + (E.y[e] - Math.floor(E.y[e]));
			this.eggDrift++;
		}
	}

	_kinds(eco) {
		const R = eco.registry;
		const out = new Map();
		return (id) => {
			let k = out.get(id);
			if (k === undefined) {
				const sp = R.get(id);
				k = (sp && RIVER_KIND[sp.category]) || 0;
				out.set(id, k);
			}
			return k;
		};
	}

	_animals(eco, tick) {
		const A = eco.animals;
		const P = eco.plants;
		const S = P.soil;
		const W = this.W;
		const bio = this.world.biome;
		const rf = this.world.riverFlow;
		const fdx = this.fdx;
		const fdy = this.fdy;
		const up = this.up;
		const kind = this._kinds(eco);
		let dam = -1;
		let damSp = 0;
		const canDam = this.dams < DAM_MAX && tick - this.lastDam >= DAM_GAP;
		for (let i = 0; i < A.count; i++) {
			if (!A.alive[i]) continue;
			const x = A.x[i];
			const y = A.y[i];
			const t = (y | 0) * W + (x | 0);
			const flowing = RiverLayer.flowing(bio[t]);
			const dom = A.domain[i];
			if (dom === 1 && A.lv[i] > 0 && flowing && (fdx[t] || fdy[t])) {
				const nx = x + fdx[t] * RIV_LARVA;
				const ny = y + fdy[t] * RIV_LARVA;
				if (A.canStand(1, nx, ny) && A.walk[(ny | 0) * W + (nx | 0)] & 2) {
					A.x[i] = nx;
					A.y[i] = ny;
					this.larvaDrift++;
				}
				continue;
			}
			const k = kind(A.sp[i]);
			if (!k) continue;
			const full = A.emax[i] * A.gf[i];
			if (k === KIND_SALMON) {
				if (!flowing || A.age[i] < A.mature[i] || A.energy[i] < full * SALMON_READY) continue;
				const u = up[t];
				if (u < 0 || rf[t] <= SALMON_HEAD) continue;
				const ux = (u % W) + 0.5;
				const uy = (u - (u % W)) / W + 0.5;
				const dx = ux - x;
				const dy = uy - y;
				const l = Math.sqrt(dx * dx + dy * dy);
				if (l < 1e-4) continue;
				const s = l < SALMON_RUN ? l : SALMON_RUN;
				const nx = x + (dx / l) * s;
				const ny = y + (dy / l) * s;
				if (A.canStand(1, nx, ny)) {
					A.x[i] = nx;
					A.y[i] = ny;
					A.tx[i] = ux;
					A.ty[i] = uy;
					this.runs++;
				}
			} else if (k === KIND_MUSSEL) {
				if (!S || !P.water[t]) continue;
				const room = full - A.energy[i];
				if (room <= 0) continue;
				let f = S.litter[t] * MUSSEL_FILTER;
				if (f * MUSSEL_E > room) f = room / MUSSEL_E;
				if (f <= 0) continue;
				S.litter[t] -= f;
				const v = S.nutrient[t] + f * MUSSEL_NUT;
				S.nutrient[t] = v < SOIL_MAX ? v : SOIL_MAX;
				A.energy[i] += f * MUSSEL_E;
				this.filtered += f;
			} else if (k === KIND_BEAVER) {
				if (!canDam || dam >= 0 || !flowing || A.age[i] < A.mature[i] || A.energy[i] < full * DAM_READY) continue;
				if (this.rng.next() < DAM_P) {
					dam = t;
					damSp = A.sp[i];
				}
			}
		}
		if (dam >= 0) this._dam(eco, dam, damSp, tick);
	}

	_dam(eco, t, spId, tick) {
		const world = this.world;
		const bio = world.biome;
		const up = this.up;
		const W = this.W;
		const tiles = [];
		let c = t;
		while (c >= 0 && tiles.length < DAM_LEN && RiverLayer.flowing(bio[c])) {
			tiles.push(c);
			c = up[c];
		}
		if (tiles.length < DAM_MIN) return false;
		tiles.sort((a, b) => a - b);
		if (!eco.god) eco.god = new GodTools();
		const G = eco.god;
		const P = eco.plants;
		const x = t % W;
		const y = (t - x) / W;
		const edit = { brush: 'dam', value: 0, pts: [x + 0.5, y + 0.5], r: 0, t: tiles };
		const before = { water: P.water.slice(), depth: P.depth.slice(), sal: P.sal.slice(), habit: P.habit.slice() };
		const done = GodTools.paintWorld(world, edit);
		if (!done.length) return false;
		G.edits.push(edit);
		G.version++;
		G._refresh(eco, done, before);
		this._fell(P, t);
		this.dams++;
		this.lastDam = tick;
		this._build(world);
		const sp = eco.registry.get(spId);
		eco.log.push(tick, 'info', `${sp ? sp.name : 'Beavers'} dammed a river — ${done.length} tiles became a beaver pond`, sp ? sp.id : null);
		return true;
	}

	_fell(P, t) {
		const W = this.W;
		const H = this.H;
		const S = P.soil;
		const x0 = t % W;
		const y0 = (t - x0) / W;
		for (let dy = -DAM_TREE_R; dy <= DAM_TREE_R; dy++) {
			const y = y0 + dy;
			if (y < 0 || y >= H) continue;
			for (let dx = -DAM_TREE_R; dx <= DAM_TREE_R; dx++) {
				const x = x0 + dx;
				if (x < 0 || x >= W) continue;
				const i = y * W + x;
				if (P.water[i] || !P.species[i] || P.kind[i] || P.genome[i * PG + 3] < DAM_TREE_WOOD) continue;
				if (S) S.litter[i] += P.biomass[i];
				P._clear(i);
				this.treesFelled++;
			}
		}
	}

	_pulse(eco, tick) {
		const fl = this.flood;
		if (!fl.length) return;
		const S = eco.plants.soil;
		const nut = S.nutrient;
		for (let k = 0; k < fl.length; k++) {
			const i = fl[k];
			const v = nut[i] + FLOOD_PULSE;
			nut[i] = v < SOIL_MAX ? v : SOIL_MAX;
		}
		this.pulses++;
		const Dz = eco.disasters;
		if (!Dz || (eco.options && !eco.options.disasters) || typeof Dz.godFlood !== 'function') return;
		const c = fl[(this.rng.next() * fl.length) | 0];
		const W = this.W;
		const cx = c % W;
		const cy = (c - cx) / W;
		const pick = [];
		const rr = RIV_FLOOD_R * RIV_FLOOD_R;
		for (let k = 0; k < fl.length; k++) {
			const i = fl[k];
			const dx = (i % W) - cx;
			const dy = (i - (i % W)) / W - cy;
			if (dx * dx + dy * dy <= rr) pick.push(i);
		}
		Dz.godFlood(pick, cx + 0.5, cy + 0.5, tick);
	}

	_turnover(P, S) {
		const st = this.still;
		const nut = S.nutrient;
		const lit = S.litter;
		for (let k = 0; k < st.length; k++) {
			const i = st[k];
			if (P.sal[i] !== 0) continue;
			const m = lit[i] * TURN_K;
			lit[i] -= m;
			const v = nut[i] + m;
			nut[i] = v < SOIL_MAX ? v : SOIL_MAX;
		}
		this.turnovers++;
	}

	_bloom(P, S) {
		const st = this.still;
		const nut = S.nutrient;
		const R = P.registry;
		let c = 0;
		for (let k = 0; k < st.length; k++) {
			const i = st[k];
			const id = P.species[i];
			if (!id || P.sal[i] !== 0 || nut[i] < BLOOM_NUT) continue;
			const sp = R.get(id);
			if (!sp || sp.category !== 'floatmat') continue;
			const room = P.cap[i] - P.biomass[i];
			if (room <= 0) continue;
			const g = Math.min(room, room * BLOOM_K * nut[i]);
			P.biomass[i] += g;
			nut[i] -= g * RIV_BLOOM_USE;
			if (nut[i] < 0) nut[i] = 0;
			c++;
		}
		if (c) this.blooms++;
	}
}
