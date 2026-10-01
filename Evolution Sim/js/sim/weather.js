const WEATHER_EVERY = 4;
const WATER_DIST_MAX = 40;
const MAX_STORMS = 8;
const STORM_P = 0.2;
const STORM_SEASON = 0.8;
const STORM_R_MIN = 6;
const STORM_R_MAX = 18;
const STORM_RAIN = 0.25;
const STORM_SPEED = 0.7;
const STORM_LIFE_MIN = 120;
const STORM_LIFE_MAX = 360;
const STORM_SAMPLES = 5;
const WIND_TURN = 0.01;
const EVAP = 0.0017;
const SNOW_T = 0.28;
const SEASON_T = 0.08;
const SNOW_MELT = 0.02;
const SNOW_SHOW = 0.1;
const POOL_WET = 0.7;
const DROUGHT_P = 0.2;
const DROUGHT_MIN = 240;
const DROUGHT_MAX = 720;
const DROUGHT_STORMS = 0.2;
const DROUGHT_EVAP = 2;
const DROUGHT_MOIST = 0.8;
const DRY_FLOW = 0.5;
const MOIST_BASE = 0.8;
const MOIST_K = 0.4;
const STORM_LOG_R = 12;
const STORM_LOG_EVERY = 240;
const COMPASS = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];

class WeatherLayer {
	constructor(world, plants, log, rng) {
		this.world = world;
		this.plants = plants;
		this.log = log;
		this.rng = rng;
		const n = world.width * world.height;
		this.n = n;
		this.on = true;
		this.wet = new Float32Array(n);
		this.snow = new Float32Array(n);
		this.moistMul = new Float32Array(n).fill(1);
		this.fresh = new Uint8Array(n);
		this.waterDist = new Uint8Array(n);
		this._evapK = new Float32Array(n);
		this._mark = new Int32Array(n);
		this._queue = new Int32Array(n);
		this._pass = 0;
		this.storms = [];
		for (let k = 0; k < MAX_STORMS; k++) this.storms.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, r: 0, rain: 0, life: 0, p1: 0, p2: 0 });
		this.stormCount = 0;
		this.windA = rng.next() * Math.PI * 2;
		this.season = 0;
		this.seasonT = 0;
		this.drought = false;
		this.droughtEnd = 0;
		this.lastDroughtEnd = -YEAR_TICKS;
		this.droughts = 0;
		this.lastStormLog = -STORM_LOG_EVERY;
		this.rainTiles = 0;
		this.snowTiles = 0;
		this.meanWet = 0;
		this.meanMoist = 1;
		this.landTiles = 0;
		const w = world;
		const water = plants.water;
		for (let i = 0; i < n; i++) {
			this._evapK[i] = EVAP * (0.5 + w.temperature[i]);
			if (!water[i]) {
				this.wet[i] = w.humidity[i];
				this.landTiles++;
			}
		}
		this._setFresh();
		this._buildWaterDist();
		this._updateTiles(false);
	}

	effTemp(i) {
		return this.world.temperature[i] + this.seasonT;
	}

	_setFresh() {
		const w = this.world;
		const fresh = this.fresh;
		const dry = this.drought;
		for (let i = 0; i < this.n; i++) {
			let f = w.isLake[i] || w.isRiver[i] || w.isPond[i] ? 1 : 0;
			if (f && dry && !w.isLake[i] && w.riverFlow[i] < DRY_FLOW) f = 0;
			fresh[i] = f;
		}
	}

	_buildWaterDist() {
		const w = this.world;
		const W = w.width;
		const H = w.height;
		const dist = this.waterDist;
		const q = this._queue;
		const fresh = this.fresh;
		const ocean = w.isOcean;
		let head = 0;
		let tail = 0;
		for (let i = 0; i < this.n; i++) {
			if (fresh[i] && (w.isLake[i] || w.isRiver[i] || w.isPond[i])) {
				dist[i] = 0;
				q[tail++] = i;
			} else dist[i] = WATER_DIST_MAX;
		}
		while (head < tail) {
			const i = q[head++];
			const d = dist[i] + 1;
			if (d >= WATER_DIST_MAX) continue;
			const x = i % W;
			const y = (i - x) / W;
			if (x + 1 < W) tail = this._visit(i + 1, d, tail, ocean);
			if (x > 0) tail = this._visit(i - 1, d, tail, ocean);
			if (y + 1 < H) tail = this._visit(i + W, d, tail, ocean);
			if (y > 0) tail = this._visit(i - W, d, tail, ocean);
		}
	}

	_visit(j, d, tail, ocean) {
		if (ocean[j] || this.waterDist[j] <= d) return tail;
		this.waterDist[j] = d;
		this._queue[tail] = j;
		return tail + 1;
	}

	setOn(on, tick) {
		if (on === this.on) return;
		this.on = on;
		if (on) return;
		this.moistMul.fill(1);
		for (const s of this.storms) s.on = false;
		this.stormCount = 0;
		this.rainTiles = 0;
		if (this.drought) this._endDrought(tick, true);
		this.meanMoist = 1;
	}

	step(tick, season) {
		this.season = season;
		this.seasonT = SEASON_T * season;
		if (!this.on || tick % WEATHER_EVERY !== 0) return;
		if (this.drought && tick >= this.droughtEnd) this._endDrought(tick, false);
		if (tick % YEAR_TICKS === 0 && !this.drought && tick - this.lastDroughtEnd >= YEAR_TICKS && this.rng.next() < DROUGHT_P) this._startDrought(tick);
		this.windA += WIND_TURN * (0.5 + this.rng.next());
		let p = STORM_P * (1 - STORM_SEASON * season);
		if (this.drought) p *= DROUGHT_STORMS;
		if (this.stormCount < MAX_STORMS && this.rng.next() < p) this._spawnStorm(tick);
		this._pass++;
		this.rainTiles = 0;
		for (const s of this.storms) if (s.on) this._moveStorm(s);
		this._updateTiles(true);
	}

	_startDrought(tick) {
		this.drought = true;
		this.droughtEnd = tick + DROUGHT_MIN + Math.floor(this.rng.next() * (DROUGHT_MAX - DROUGHT_MIN));
		this.droughts++;
		this._setFresh();
		this._buildWaterDist();
		this.log.push(tick, 'weather', 'A drought has begun — streams and ponds are drying up');
	}

	_endDrought(tick, silent) {
		this.drought = false;
		this.lastDroughtEnd = tick;
		this._setFresh();
		this._buildWaterDist();
		if (!silent) this.log.push(tick, 'weather', 'The drought has broken');
	}

	_spawnStorm(tick) {
		const w = this.world;
		const W = w.width;
		const H = w.height;
		const rng = this.rng;
		let s = null;
		for (const t of this.storms) if (!t.on) s = t;
		if (!s) return;
		let bx = 0;
		let by = 0;
		let best = -1;
		for (let k = 0; k < STORM_SAMPLES; k++) {
			const x = rng.next() * W;
			const y = rng.next() * H;
			const h = w.humidity[(y | 0) * W + (x | 0)];
			if (h > best) {
				best = h;
				bx = x;
				by = y;
			}
		}
		const a = this.windA + (rng.next() - 0.5) * 0.8;
		const sp = STORM_SPEED * (0.6 + 0.8 * rng.next());
		s.on = true;
		s.x = bx;
		s.y = by;
		s.vx = Math.cos(a) * sp;
		s.vy = Math.sin(a) * sp;
		s.r = STORM_R_MIN + rng.next() * (STORM_R_MAX - STORM_R_MIN);
		s.rain = STORM_RAIN * (0.6 + 0.8 * rng.next());
		s.life = STORM_LIFE_MIN + Math.floor(rng.next() * (STORM_LIFE_MAX - STORM_LIFE_MIN));
		s.p1 = rng.next() * 6.283;
		s.p2 = rng.next() * 6.283;
		this.stormCount++;
		if (s.r >= STORM_LOG_R && tick - this.lastStormLog >= STORM_LOG_EVERY) this._logStorm(tick, s);
	}

	_logStorm(tick, s) {
		const w = this.world;
		const W = w.width;
		const H = w.height;
		const i = Math.min(H - 1, Math.max(0, s.y | 0)) * W + Math.min(W - 1, Math.max(0, s.x | 0));
		const dx = s.x / W - 0.5;
		const dy = s.y / H - 0.5;
		const at = dx * dx + dy * dy < 0.02 ? 'the heartland' : 'the ' + COMPASS[(Math.round(Math.atan2(dx, -dy) / (Math.PI / 4)) + 8) % 8];
		const b = BIOME_INFO[BIOME_LIST[w.biome[i]]];
		const where = b ? `${b.name} in ${at}` : at;
		this.lastStormLog = tick;
		this.log.push(tick, 'weather', this.effTemp(i) < SNOW_T ? `Blizzard over the ${where}` : `Storm over the ${where}`);
	}

	_moveStorm(s) {
		const w = this.world;
		const W = w.width;
		const H = w.height;
		const wa = this.windA;
		s.vx += (Math.cos(wa) * STORM_SPEED - s.vx) * 0.05;
		s.vy += (Math.sin(wa) * STORM_SPEED - s.vy) * 0.05;
		s.x += s.vx * WEATHER_EVERY;
		s.y += s.vy * WEATHER_EVERY;
		s.life -= WEATHER_EVERY;
		const r = s.r;
		if (s.life <= 0 || s.x < -r || s.y < -r || s.x > W + r || s.y > H + r) {
			s.on = false;
			this.stormCount--;
			return;
		}
		const fade = s.life < 40 ? s.life / 40 : 1;
		const reach = r * 1.25;
		const x0 = Math.max(0, Math.floor(s.x - reach));
		const x1 = Math.min(W - 1, Math.ceil(s.x + reach));
		const y0 = Math.max(0, Math.floor(s.y - reach));
		const y1 = Math.min(H - 1, Math.ceil(s.y + reach));
		const temp = w.temperature;
		const water = this.plants.water;
		const wet = this.wet;
		const snow = this.snow;
		const mark = this._mark;
		const pass = this._pass;
		const sT = SNOW_T - this.seasonT;
		const rain = s.rain * fade;
		for (let y = y0; y <= y1; y++) {
			const dy = y + 0.5 - s.y;
			const ny = Math.sin(y * 0.53 + s.p2);
			for (let x = x0; x <= x1; x++) {
				const dx = x + 0.5 - s.x;
				const d2 = dx * dx + dy * dy;
				if (d2 > reach * reach) continue;
				const rr = r * (0.75 + 0.125 * (2 + Math.sin(x * 0.47 + s.p1) + ny));
				const d = Math.sqrt(d2);
				if (d >= rr) continue;
				const i = y * W + x;
				if (water[i]) continue;
				const a = rain * (1 - d / rr);
				if (temp[i] < sT) {
					const v = snow[i] + a;
					snow[i] = v > 1 ? 1 : v;
				} else {
					const v = wet[i] + a;
					wet[i] = v > 1 ? 1 : v;
					if (mark[i] !== pass) {
						mark[i] = pass;
						this.rainTiles++;
					}
				}
			}
		}
	}

	_updateTiles(live) {
		const n = this.n;
		const temp = this.world.temperature;
		const water = this.plants.water;
		const wet = this.wet;
		const snow = this.snow;
		const mm = this.moistMul;
		const fresh = this.fresh;
		const evapK = this._evapK;
		const w = this.world;
		const drought = this.drought;
		const ev = drought ? DROUGHT_EVAP : 1;
		const sT = SNOW_T - this.seasonT;
		let sumWet = 0;
		let sumMoist = 0;
		let snowTiles = 0;
		for (let i = 0; i < n; i++) {
			if (water[i]) continue;
			let v = wet[i];
			if (live) {
				v -= v * evapK[i] * ev;
				const sn = snow[i];
				if (sn > 0 && temp[i] > sT) {
					const m = sn < SNOW_MELT ? sn : SNOW_MELT;
					snow[i] = sn - m;
					v += m;
					if (v > 1) v = 1;
				}
				wet[i] = v;
			}
			if (snow[i] > SNOW_SHOW) snowTiles++;
			let k = MOIST_BASE + MOIST_K * v;
			if (drought && v < 0.1) k *= DROUGHT_MOIST;
			mm[i] = k;
			sumWet += v;
			sumMoist += k;
			const base = w.isRiver[i] || w.isPond[i] || w.isLake[i];
			fresh[i] = v > POOL_WET ? 1 : base && (!drought || w.isLake[i] || w.riverFlow[i] >= DRY_FLOW) ? 1 : 0;
		}
		const L = this.landTiles || 1;
		this.meanWet = sumWet / L;
		this.meanMoist = sumMoist / L;
		this.snowTiles = snowTiles;
	}
}
