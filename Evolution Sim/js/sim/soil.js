const SOIL_MAX = 1.5;
const SOIL_REFILL = 0.003;
const SOIL_UPTAKE = 0.0004;
const SOIL_SUPPLY = 0.006;
const SOIL_SAME_TILE_W = 1.5;
const SOIL_NEIGHBOUR_W = 0.35;
const SOIL_RECYCLE = 0.15;
const LITTER_DECAY = 0.004;
const LITTER_INIT = 0.2;
const CARCASS_FRAC = 0.6;
const CARRION_SHARE = 0.6;
const CARRION_DECAY = 0.005;
const CARRION_CELL_EVERY = 10;

class SoilLayer {
	constructor(world) {
		const n = world.width * world.height;
		this.n = n;
		this.W = world.width;
		this.H = world.height;
		this.base = new Float32Array(n);
		this.nutrient = new Float32Array(n);
		this.litter = new Float32Array(n);
		this.carrion = new Float32Array(n);
		for (let i = 0; i < n; i++) {
			const f = world.fertility[i];
			const v = f > 0 ? (f < SOIL_MAX ? f : SOIL_MAX) : 0;
			this.base[i] = v;
			this.nutrient[i] = v;
			this.litter[i] = v * LITTER_INIT;
		}
		this.totalLitter = 0;
		this.totalCarrion = 0;
		this.ccols = Math.ceil(this.W / GRID);
		this.carrionCell = new Float32Array(this.ccols * Math.ceil(this.H / GRID));
		this._cellTick = 0;
		this.own = new Float32Array(n * 2);
		this.tile = new Float32Array(n);
		this.row = new Float32Array(n);
	}

	step(P) {
		this._uptake(P.biomass, P.root, P.kind);
		this._rows();
		this._flow(P.sat, P.kind);
		if (this._cellTick++ % CARRION_CELL_EVERY === 0) this._buildCarrionCells();
	}

	_uptake(bio, root, kind) {
		const n = this.n;
		const own = this.own;
		const tile = this.tile;
		for (let i = 0; i < n; i++) {
			const u = n + i;
			let a = bio[i] * SOIL_UPTAKE * (0.5 + root[i]);
			let b = kind[u] ? 0 : bio[u] * SOIL_UPTAKE * (0.5 + root[u]);
			if (!(a > 0)) a = 0;
			if (!(b > 0)) b = 0;
			own[i] = a;
			own[u] = b;
			tile[i] = a + b;
		}
	}

	_rows() {
		const W = this.W;
		const H = this.H;
		const tile = this.tile;
		const row = this.row;
		for (let y = 0; y < H; y++) {
			const o = y * W;
			const last = o + W - 1;
			for (let i = o; i <= last; i++) {
				let s = tile[i];
				if (i > o) s += tile[i - 1];
				if (i < last) s += tile[i + 1];
				row[i] = s;
			}
		}
	}

	_flow(sat, kind) {
		const n = this.n;
		const W = this.W;
		const own = this.own;
		const tile = this.tile;
		const row = this.row;
		const nut = this.nutrient;
		const base = this.base;
		const litter = this.litter;
		const carrion = this.carrion;
		const tail = n - W;
		let totalLitter = 0;
		let totalCarrion = 0;
		for (let i = 0; i < n; i++) {
			let around = row[i] - tile[i];
			if (i >= W) around += row[i - W];
			if (i < tail) around += row[i + W];
			around *= SOIL_NEIGHBOUR_W;
			let N = nut[i];
			const a = own[i];
			const b = own[n + i];
			const pa = a + SOIL_SAME_TILE_W * b + around;
			const pb = b + SOIL_SAME_TILE_W * a + around;
			const sa = pa > 0 ? (N * SOIL_SUPPLY) / pa : 1;
			const sb = pb > 0 ? (N * SOIL_SUPPLY) / pb : 1;
			const va = sa < 1 ? sa : 1;
			const vb = sb < 1 ? sb : 1;
			sat[i] = va;
			sat[n + i] = kind[n + i] ? 1 : vb;
			const take = a * va + b * vb;
			N -= take;
			if (N < 0) N = 0;
			N += (base[i] - N) * SOIL_REFILL;
			const C = carrion[i];
			if (C > 0) {
				const dc = C * CARRION_DECAY;
				carrion[i] = C - dc;
				totalCarrion += C - dc;
				litter[i] += dc;
			}
			const L = litter[i];
			if (L > 0) {
				const d = L * LITTER_DECAY;
				litter[i] = L - d;
				totalLitter += L - d;
				N += d * SOIL_RECYCLE;
				if (N > SOIL_MAX) N = SOIL_MAX;
			}
			nut[i] = N;
		}
		this.totalLitter = totalLitter;
		this.totalCarrion = totalCarrion;
	}

	_buildCarrionCells() {
		const cells = this.carrionCell;
		const carrion = this.carrion;
		const W = this.W;
		const cols = this.ccols;
		cells.fill(0);
		for (let y = 0; y < this.H; y++) {
			const o = y * W;
			const r = ((y / GRID) | 0) * cols;
			for (let x = 0; x < W; x++) {
				const c = carrion[o + x];
				if (c > 0) cells[r + ((x / GRID) | 0)] += c;
			}
		}
	}

	returnMatter(i, amount) {
		if (!(amount > 0)) return;
		this.litter[i] += amount;
	}

	consumeLitter(i, amount) {
		const L = this.litter[i];
		if (!(amount > 0) || !(L > 0)) return 0;
		const take = amount < L ? amount : L;
		this.litter[i] = L - take;
		return take;
	}

	addCarcass(i, mass) {
		if (!(mass > 0)) return;
		this.carrion[i] += mass * CARRION_SHARE;
		this.litter[i] += mass * (1 - CARRION_SHARE) * CARCASS_FRAC;
	}

	consumeCarrion(i, amount) {
		const C = this.carrion[i];
		if (!(amount > 0) || !(C > 0)) return 0;
		const take = amount < C ? amount : C;
		this.carrion[i] = C - take;
		return take;
	}
}
