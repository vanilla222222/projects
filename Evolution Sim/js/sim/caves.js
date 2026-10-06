const CV_MIN = 4;
const CV_MAX = 8;
const CV_HILL = 0.06;
const CV_POOL = 0.35;
const CV_POOL_WET = 0.62;
const CV_NEAR = 12;
const CV_ROOT = 0.035;
const CV_ROOT_REF = 2.5;
const CV_ROOT_MAX = 6;
const CV_DETR = 0.045;
const CV_DETR_MOUTH = 2.2;
const CV_DETR_POOL = 1.6;
const CV_DETR_MAX = 8;
const CV_GUANO_DECAY = 0.996;
const CV_GUANO_MAX = 14;
const CV_BURROW_EVERY = 50;
const CV_BURROW_DECAY = 0.85;
const CV_SEED = 1616;

class CaveLayer {
	constructor(world, rng) {
		this.world = world;
		this.rng = rng;
		this.hibernated = 0;
		this.batForays = 0;
		this.guanoLaid = 0;
		this.caveKills = 0;
		this.dug = 0;
		this.burrowSaves = 0;
		this.ugCount = 0;
		this._build(world);
		const nc = this.nc;
		this.guano = new Float32Array(nc);
		this.detr = new Float32Array(nc);
		this.roots = new Float32Array(nc);
		for (let c = 0; c < nc; c++) {
			this.detr[c] = CV_DETR_MAX * 0.5;
			this.roots[c] = CV_ROOT_MAX * 0.3;
			this.guano[c] = CV_GUANO_MAX * 0.2;
		}
		this.burrow = new Uint8Array(world.width * world.height);
	}

	restoreDerived(world) {
		this.world = world;
		this._build(world);
		const nc = this.nc;
		for (const k of ['guano', 'detr', 'roots']) {
			const a = this[k];
			if (a && a.length === nc) continue;
			const b = new Float32Array(nc);
			if (a) b.set(a.subarray(0, Math.min(nc, a.length)));
			this[k] = b;
		}
		const n = world.width * world.height;
		if (!this.burrow || this.burrow.length !== n) this.burrow = new Uint8Array(n);
	}

	_build(world) {
		const W = world.width;
		const H = world.height;
		const n = W * H;
		const b = world.biome;
		const alt = world.altitude;
		const hill = BIOME_THRESHOLDS.hillLevel;
		const rng = new FastRng(world.seed + CV_SEED);
		const at = new Int32Array(n).fill(-1);
		const under = new Uint8Array(n);
		const tile = [];
		const cave = [];
		const par = [];
		const pool = [];
		const depth = [];
		const mouths = [];
		const ok = (i) => !world.isOcean[i] && !world.isLake[i] && !world.isRiver[i] && !world.isPond[i] && alt[i] >= hill - CV_HILL && at[i] < 0;
		const line = (a, c) => {
			const ax = a % W, ay = (a / W) | 0, cx = c % W, cy = (c / W) | 0;
			const s = Math.max(Math.abs(cx - ax), Math.abs(cy - ay));
			for (let k = 1; k < s; k++) {
				const t = Math.round(ay + ((cy - ay) * k) / s) * W + Math.round(ax + ((cx - ax) * k) / s);
				if (!under[t]) under[t] = 1;
			}
		};
		for (let i = 0; i < n; i++) {
			if (b[i] !== BIOME_ID.CAVE_MOUTH) continue;
			const id = mouths.length;
			mouths.push(i);
			const first = tile.length;
			at[i] = tile.length;
			tile.push(i);
			cave.push(id);
			par.push(-1);
			pool.push(0);
			depth.push(0);
			under[i] = 4;
			const want = CV_MIN + ((rng.next() * (CV_MAX - CV_MIN + 1)) | 0);
			for (let t = 0; t < want * 6 && tile.length - first < want; t++) {
				const from = first + ((rng.next() * (tile.length - first)) | 0);
				const f = tile[from];
				const a = rng.next() * Math.PI * 2;
				const d = 2 + ((rng.next() * 2) | 0);
				const x = (f % W) + Math.round(Math.cos(a) * d);
				const y = ((f / W) | 0) + Math.round(Math.sin(a) * d);
				if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue;
				const j = y * W + x;
				if (!ok(j)) continue;
				at[j] = tile.length;
				tile.push(j);
				cave.push(id);
				par.push(from);
				const p = rng.next() < CV_POOL || world.humidity[j] > CV_POOL_WET ? 1 : 0;
				pool.push(p);
				depth.push(depth[from] + 1);
				under[j] = p ? 3 : 2;
				line(f, j);
			}
		}
		const nc = tile.length;
		this.nc = nc;
		this.nCaves = mouths.length;
		this.mouths = Int32Array.from(mouths);
		this.ctile = Int32Array.from(tile);
		this.ccave = Int32Array.from(cave);
		this.cpar = Int32Array.from(par);
		this.cpool = Uint8Array.from(pool);
		this.cdepth = Uint8Array.from(depth);
		this.chamberAt = at;
		this.under = under;
		const deg = new Int32Array(nc + 1);
		for (let c = 0; c < nc; c++) if (par[c] >= 0) {
			deg[c + 1]++;
			deg[par[c] + 1]++;
		}
		for (let c = 0; c < nc; c++) deg[c + 1] += deg[c];
		const fill = deg.slice(0, nc);
		const lk = new Int32Array(deg[nc]);
		for (let c = 0; c < nc; c++) if (par[c] >= 0) {
			lk[fill[c]++] = par[c];
			lk[fill[par[c]]++] = c;
		}
		this.lstart = deg;
		this.links = lk;
		const npool = new Int32Array(this.nCaves).fill(-1);
		for (let c = nc - 1; c >= 0; c--) if (pool[c]) npool[cave[c]] = c;
		this.firstPool = npool;
		const near = new Int32Array(n).fill(-1);
		const nd = new Uint8Array(n).fill(255);
		for (let m = 0; m < mouths.length; m++) {
			const mx = mouths[m] % W;
			const my = (mouths[m] / W) | 0;
			for (let dy = -CV_NEAR; dy <= CV_NEAR; dy++) {
				const y = my + dy;
				if (y < 0 || y >= H) continue;
				for (let dx = -CV_NEAR; dx <= CV_NEAR; dx++) {
					const x = mx + dx;
					if (x < 0 || x >= W) continue;
					const d = Math.abs(dx) + Math.abs(dy);
					if (d > CV_NEAR) continue;
					const j = y * W + x;
					if (d < nd[j]) {
						nd[j] = d;
						near[j] = mouths[m];
					}
				}
			}
		}
		this.near = near;
		this.occ = new Uint8Array(n);
		this.cpop = new Uint16Array(nc);
	}

	chamberOf(i) {
		return this.chamberAt[i];
	}

	pick(c, rng) {
		const a = this.lstart[c];
		const e = this.lstart[c + 1];
		if (a === e) return c;
		return this.links[a + ((rng.next() * (e - a)) | 0)];
	}

	poolNeighbour(c, rng) {
		const a = this.lstart[c];
		const e = this.lstart[c + 1];
		if (a === e) return c;
		const k = this.links[a + ((rng.next() * (e - a)) | 0)];
		return this.cpool[k] ? k : c;
	}

	census(A) {
		const occ = this.occ;
		const pop = this.cpop;
		occ.fill(0);
		pop.fill(0);
		let u = 0;
		const n = A.count;
		const W = this.world.width;
		const nc = this.nc;
		if (!this.cstart || this.cstart.length !== nc + 2) this.cstart = new Int32Array(nc + 2);
		const cs = this.cstart;
		cs.fill(0);
		for (let i = 0; i < n; i++) {
			if (!A.alive[i] || !A.ug[i]) continue;
			u++;
			const t = (A.y[i] | 0) * W + (A.x[i] | 0);
			if (occ[t] < 255) occ[t]++;
			const c = this.chamberAt[t];
			if (c >= 0 && pop[c] < 65535) pop[c]++;
			if (c >= 0 && A.ug[i] === 1) cs[c + 2]++;
		}
		for (let c = 2; c < nc + 2; c++) cs[c] += cs[c - 1];
		if (!this.citems || this.citems.length < u) this.citems = new Int32Array(Math.max(64, u * 2));
		const it = this.citems;
		for (let i = 0; i < n; i++) {
			if (!A.alive[i] || A.ug[i] !== 1) continue;
			const c = this.chamberAt[(A.y[i] | 0) * W + (A.x[i] | 0)];
			if (c >= 0) it[cs[c + 1]++] = i;
		}
		this.ugCount = u;
	}

	step(tick, eco) {
		const P = eco.plants;
		const bio = P.biomass;
		const pn = P.n;
		const Wx = eco.weather;
		const wet = Wx && Wx.wet;
		const hum = this.world.humidity;
		for (let c = 0; c < this.nc; c++) {
			const t = this.ctile[c];
			const bm = bio[t] + bio[pn + t];
			const r = this.roots[c] + CV_ROOT * (bm < CV_ROOT_REF ? bm / CV_ROOT_REF : 1);
			this.roots[c] = r < CV_ROOT_MAX ? r : CV_ROOT_MAX;
			const w = wet ? wet[t] : hum[t];
			const d = this.detr[c] + CV_DETR * (0.3 + w) * (this.cdepth[c] === 0 ? CV_DETR_MOUTH : 1) * (this.cpool[c] ? CV_DETR_POOL : 1);
			this.detr[c] = d < CV_DETR_MAX ? d : CV_DETR_MAX;
			const g = this.guano[c] * CV_GUANO_DECAY;
			this.guano[c] = g < CV_GUANO_MAX ? g : CV_GUANO_MAX;
		}
		if (tick % CV_BURROW_EVERY === 0) {
			const bw = this.burrow;
			for (let i = 0; i < bw.length; i++) if (bw[i]) bw[i] = (bw[i] * CV_BURROW_DECAY) | 0;
		}
	}
}
