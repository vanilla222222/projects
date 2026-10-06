const MTN_SLOPE_N = 0.05;
const MTN_HIGH = 0.04;
const MTN_SICK_ALT = 0.74;
const MTN_LIFT_SLOPE = 0.35;
const AV_EVERY = 6;
const AV_SAMPLES = 24;
const AV_SNOW = 0.7;
const AV_SLOPE = 0.45;
const AV_P = 0.05;
const AV_COOL = 40;
const AV_LEN = 18;
const AV_MIN = 4;

class MountainLayer {
	constructor(world, rng) {
		this.world = world;
		this.rng = rng;
		this.avalanches = 0;
		this.buried = 0;
		this.swept = 0;
		this.rescues = 0;
		this.lastAv = -AV_COOL;
		this._build(world);
	}

	restoreDerived(world) {
		this.world = world;
		this._build(world);
	}

	_build(world) {
		const W = world.width;
		const H = world.height;
		const n = W * H;
		const alt = world.altitude;
		const oc = world.isOcean;
		const b = world.biome;
		const B = BIOME_ID;
		const hill = BIOME_THRESHOLDS.hillLevel;
		this.slope = new Float32Array(n);
		this.sick = new Float32Array(n);
		this.lift = new Float32Array(n);
		this.cave = new Uint8Array(n);
		this.high = new Uint8Array(n);
		this.down = new Int32Array(n).fill(-1);
		const steep = [];
		for (let y = 0; y < H; y++) {
			for (let x = 0; x < W; x++) {
				const i = y * W + x;
				if (oc[i]) continue;
				const a = alt[i];
				if (b[i] === B.CAVE_MOUTH) this.cave[i] = 1;
				if (a < hill - 0.04) continue;
				let lo = a;
				let li = -1;
				let mx = 0;
				let ridge = true;
				for (let d = 0; d < 8; d++) {
					const nx = x + (d === 0 || d === 4 || d === 5 ? 1 : d === 1 || d === 6 || d === 7 ? -1 : 0);
					const ny = y + (d === 2 || d === 4 || d === 6 ? 1 : d === 3 || d === 5 || d === 7 ? -1 : 0);
					if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
					const j = ny * W + nx;
					const v = alt[j];
					if (v > a) ridge = false;
					const df = v > a ? v - a : a - v;
					if (d < 4 && df > mx) mx = df;
					if (v < lo) {
						lo = v;
						li = j;
					}
				}
				const s = mx / MTN_SLOPE_N;
				this.slope[i] = s > 1 ? 1 : s;
				this.down[i] = li;
				if (a >= hill + MTN_HIGH) this.high[i] = 1;
				if (a > MTN_SICK_ALT) {
					const k = (a - MTN_SICK_ALT) / (1 - MTN_SICK_ALT);
					this.sick[i] = k > 1 ? 1 : k;
				}
				if (a >= hill) {
					const l = (ridge ? 0.6 : 0) + (this.slope[i] > MTN_LIFT_SLOPE ? this.slope[i] * 0.6 : 0);
					this.lift[i] = l > 1 ? 1 : l;
				}
				if (this.slope[i] >= AV_SLOPE && a >= hill && li >= 0) steep.push(i);
			}
		}
		this.steep = Int32Array.from(steep);
	}

	step(tick, eco) {
		if (tick % AV_EVERY !== 0 || !this.steep.length) return;
		const D = eco.disasters;
		const Wx = eco.weather;
		if (!D || !D.on || !Wx || !Wx.snow || tick - this.lastAv < AV_COOL) return;
		const rng = this.rng;
		const st = this.steep;
		const snow = Wx.snow;
		for (let k = 0; k < AV_SAMPLES; k++) {
			const s = st[(rng.next() * st.length) | 0];
			if (snow[s] < AV_SNOW || rng.next() >= AV_P) continue;
			const tiles = [];
			let c = s;
			for (let g = 0; g < AV_LEN && c >= 0; g++) {
				tiles.push(c);
				snow[c] *= 0.2;
				const w = this.world.width;
				const cx = c % w;
				if (cx > 0) tiles.push(c - 1);
				if (cx < w - 1) tiles.push(c + 1);
				const nx = this.down[c];
				if (nx < 0 || this.world.isOcean[nx]) break;
				c = nx;
			}
			this.lastAv = tick;
			if (tiles.length < AV_MIN) return;
			const r = D.avalanche(tiles, s % this.world.width, (s / this.world.width) | 0, tick);
			this.avalanches++;
			this.swept += r.trees;
			this.buried += r.killed;
			return;
		}
	}
}
