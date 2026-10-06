const DIS_EVERY = 8;
const FIRE_STEP = 2;
const FIRE_IGNITE = 0.08;
const FIRE_DROUGHT = 3;
const FIRE_SAMPLES = 12;
const FIRE_DRY = 0.5;
const FIRE_FUEL = 1.4;
const FIRE_SPREAD = 0.6;
const FIRE_WIND = 0.6;
const FIRE_BURN = 5;
const FIRE_OUT_WET = 0.6;
const FIRE_EVENT_CAP = 0.02;
const FIRE_YEAR_CAP = 0.035;
const FIRE_SURV = 0.1;
const FIRE_SURV_WOOD = 0.25;
const FIRE_SURV_ADAPT = 0.6;
const FIRE_CUE = 0.25;
const FIRE_LITTER = 0.8;
const FIRE_ASH = 0.5;
const FIRE_BUGS = 0.2;
const FIRE_KILL = 0.06;
const FIRE_LOG_END = 25;
const FLOOD_P = 0.12;
const FLOOD_RAIN = 0.26;
const FLOOD_R = 8;
const FLOOD_WET = 0.55;
const FLOOD_DIST = 2;
const FLOOD_MIN = 12;
const FLOOD_MAX = 500;
const FLOOD_LIFE = 4;
const FLOOD_COOL = 360;
const FLOOD_SILT = 0.25;
const FLOOD_DROWN = 0.03;
const FLOOD_UNDER = 0.6;
const FLOOD_CANOPY = 0.8;
const FLOOD_BUGS = 0.5;
const WIND_P = 0.06;
const WIND_R = 14;
const WIND_WOOD = 0.62;
const WIND_KNOCK = 0.7;
const WIND_COOL = 240;
const WIND_MIN = 3;
const SCAR_EVERY = 40;
const SCAR_MAX = 60;
const SCAR_YEAR = YEAR_TICKS / SCAR_EVERY;
const PIONEER_AGE = 18;
const PIONEER_P = 0.3;
const PIONEER_WOOD = 0.3;
const RECOL_LOG_EVERY = 480;

const AV_UNDER = 0.7;
const AV_KILL = 0.6;
const AV_CLIMB = 0.7;

class DisasterLayer {
	constructor(world, plants, weather, animals, eggs, bugs, log, rng) {
		this.world = world;
		this.plants = plants;
		this.weather = weather;
		this.animals = animals;
		this.eggs = eggs;
		this.bugs = bugs;
		this.log = log;
		this.rng = rng;
		const n = world.width * world.height;
		this.n = n;
		this.on = true;
		this.fire = new Uint8Array(n);
		this.flood = new Uint8Array(n);
		this.haz = new Uint8Array(n);
		this.scar = new Uint8Array(n);
		this.scarK = new Uint8Array(n);
		this.preBio = new Float32Array(n);
		this.risk = new Float32Array(n);
		this.fireList = new Int32Array(n);
		this.fireN = 0;
		this.floodList = new Int32Array(FLOOD_MAX);
		this.floodN = 0;
		this.floodX = 0;
		this.floodY = 0;
		this.eventBurnt = 0;
		this.eventLogged = false;
		this.burntYear = 0;
		this.fires = 0;
		this.burnt = 0;
		this.floods = 0;
		this.flooded = 0;
		this.windthrow = 0;
		this.felled = 0;
		this.killed = 0;
		this.drowned = 0;
		this.eggsLost = 0;
		this.plantsBurnt = 0;
		this.survived = 0;
		this.recolonised = 0;
		this.recovery = 0;
		this.pioneerYoung = 0;
		this.pioneerOld = 0;
		this.scarTiles = 0;
		this.adaptBurn = 0;
		this.lastFlood = -FLOOD_COOL;
		this.lastWind = -WIND_COOL;
		this.lastRecolLog = -RECOL_LOG_EVERY;
		this._scratch = new Float32Array(PG);
		let land = 0;
		for (let i = 0; i < n; i++) if (!plants.water[i]) land++;
		this.landTiles = land || 1;
	}

	setOn(on) {
		if (on === this.on) return;
		this.on = on;
		if (on) return;
		for (let k = 0; k < this.fireN; k++) {
			const i = this.fireList[k];
			this.fire[i] = 0;
			this.haz[i] = 0;
		}
		this.fireN = 0;
		this._endFlood();
	}

	_where(x, y) {
		const w = this.world;
		const W = w.width;
		const H = w.height;
		const i = Math.min(H - 1, Math.max(0, y | 0)) * W + Math.min(W - 1, Math.max(0, x | 0));
		const dx = x / W - 0.5;
		const dy = y / H - 0.5;
		const at = dx * dx + dy * dy < 0.02 ? 'the heartland' : 'the ' + COMPASS[(Math.round(Math.atan2(dx, -dy) / (Math.PI / 4)) + 8) % 8];
		const b = BIOME_INFO[BIOME_LIST[w.biome[i]]];
		return b ? `${b.name} in ${at}` : at;
	}

	_fuel(i) {
		const P = this.plants;
		const n = this.n;
		let f = P.soil.litter[i];
		if (P.species[i]) f += P.biomass[i];
		if (P.species[n + i] && !P.kind[n + i]) f += P.biomass[n + i];
		f /= FIRE_FUEL;
		return f < 1 ? f : 1;
	}

	_dry(i) {
		const Wx = this.weather;
		if (!Wx) return 0.5;
		if (Wx.snow[i] > 0.1) return 0;
		const d = 1 - Wx.wet[i] / FIRE_DRY;
		return d > 0 ? d : 0;
	}

	step(tick) {
		if (!this.on) return;
		if (tick % YEAR_TICKS === 0) this.burntYear = 0;
		if (this.fireN > 0 && tick % FIRE_STEP === 0) this._spreadFire(tick);
		if (tick % DIS_EVERY === 0) {
			if (this.floodN > 0) this._floodTick();
			if (this.fireN === 0) this._tryIgnite(tick);
			if (this.weather && this.weather.on && this.weather.stormCount > 0) this._storms(tick);
		}
		if (tick % SCAR_EVERY === 0) this._succession(tick);
		else if (tick % SCAR_EVERY === SCAR_EVERY / 2) this._riskMap();
	}

	_riskMap() {
		const P = this.plants;
		const risk = this.risk;
		for (let i = 0; i < this.n; i++) risk[i] = P.water[i] ? 0 : this._fuel(i) * this._dry(i);
	}

	_tryIgnite(tick) {
		if (this.burntYear >= FIRE_YEAR_CAP * this.landTiles) return;
		const P = this.plants;
		const Wx = this.weather;
		const rng = this.rng;
		const season = P.seasonsOn ? P.season : 0;
		let p = FIRE_IGNITE * (0.6 + 0.8 * (season > 0 ? season : 0));
		if (Wx && Wx.drought) p *= FIRE_DROUGHT;
		if (rng.next() >= p) return;
		const W = this.world.width;
		const H = this.world.height;
		const temp = this.world.temperature;
		const seasonT = Wx ? Wx.seasonT : 0;
		let best = -1;
		let bi = 0;
		for (let k = 0; k < FIRE_SAMPLES; k++) {
			const i = ((rng.next() * H) | 0) * W + ((rng.next() * W) | 0);
			if (P.water[i]) continue;
			const t = temp[i] + seasonT;
			const heat = t > 0.7 ? 1 : t > 0.2 ? (t - 0.2) * 2 : 0;
			const r = this._fuel(i) * this._dry(i) * heat;
			if (r > best) {
				best = r;
				bi = i;
			}
		}
		if (best <= 0 || rng.next() >= best) return;
		this.fires++;
		this.eventBurnt = 0;
		this.eventLogged = false;
		this._ignite(bi, tick);
		this.log.push(tick, 'disaster', `Wildfire in the ${this._where(bi % W, (bi / W) | 0)}${Wx && Wx.drought ? ' — the drought has left it tinder-dry' : ''}`);
	}

	_ignite(i, tick) {
		this.fire[i] = FIRE_BURN;
		this.haz[i] = 1;
		this.fireList[this.fireN++] = i;
		this.burnt++;
		this.burntYear++;
		this.eventBurnt++;
		this._burnTile(i);
	}

	_burnTile(i) {
		const P = this.plants;
		const n = this.n;
		const rng = this.rng;
		const g = P.genome;
		const soil = P.soil;
		const pre = (P.species[i] ? P.biomass[i] : 0) + (P.species[n + i] ? P.biomass[n + i] : 0);
		if (!this.scar[i] || this.scarK[i] !== 1) this.preBio[i] = pre;
		this.scar[i] = 1;
		this.scarK[i] = 1;
		for (let s = 0; s < 2; s++) {
			const p = s * n + i;
			const id = P.species[p];
			if (!id) continue;
			if (P.kind[p]) {
				P.biomass[p] *= 0.5;
				continue;
			}
			const f = g[p * PG + 16];
			const wood = g[p * PG + 3];
			if (rng.next() < FIRE_SURV + FIRE_SURV_WOOD * wood + FIRE_SURV_ADAPT * f) {
				P.biomass[p] *= 0.2 + 0.5 * f;
				P.health[p] *= 0.6;
				P.fruit[p] = 0;
				this.survived++;
				if (f > FIRE_CUE) this.adaptBurn++;
				continue;
			}
			if (f > FIRE_CUE) {
				const d = P.seedDens[i];
				if (d <= 0 || rng.next() < 0.6) {
					const base = i * PG;
					const src = p * PG;
					for (let k = 0; k < PG; k++) P.seedGenome[base + k] = g[src + k];
					P.seedSp[i] = id;
				}
				const v = d + SEED_ADD * 3;
				P.seedDens[i] = v < SEED_MAX ? v : SEED_MAX;
			}
			P._clear(p);
			this.plantsBurnt++;
		}
		if (P.seedDens[i] > 0 && P.seedGenome[i * PG + 16] <= FIRE_CUE) P.seedDens[i] *= 0.4;
		const L = soil.litter[i];
		const b = L * FIRE_LITTER;
		soil.litter[i] = L - b;
		const N = soil.nutrient[i] + b * FIRE_ASH;
		soil.nutrient[i] = N < SOIL_MAX ? N : SOIL_MAX;
		const B = this.bugs;
		if (B) for (let k = 0; k < 4; k++) B.density[k * n + i] *= FIRE_BUGS;
		this._killEggs(i);
	}

	_killEggs(i) {
		const E = this.eggs;
		if (!E) return;
		for (let e = E.head[i]; e >= 0; e = E.next[e]) {
			if (!E.alive[e] || E.dom[e] === 1) continue;
			E.alive[e] = 0;
			E.failed++;
			this.eggsLost++;
		}
	}

	_spreadFire(tick) {
		const P = this.plants;
		const Wx = this.weather;
		const W = this.world.width;
		const H = this.world.height;
		const alt = this.world.altitude;
		const rng = this.rng;
		const fire = this.fire;
		const list = this.fireList;
		const m = this.fireN;
		const wa = Wx ? Wx.windA : 0;
		const cw = Math.cos(wa);
		const sw = Math.sin(wa);
		const cap = this.eventBurnt < FIRE_EVENT_CAP * this.landTiles && this.burntYear < FIRE_YEAR_CAP * this.landTiles;
		for (let k = 0; k < m; k++) {
			const i = list[k];
			if (!fire[i]) continue;
			if (Wx && Wx.wet[i] > FIRE_OUT_WET) {
				fire[i] = 0;
				continue;
			}
			fire[i]--;
			if (!fire[i] || !cap) continue;
			const x = i % W;
			const y = (i - x) / W;
			for (let d = 0; d < 4; d++) {
				const dx = d === 0 ? 1 : d === 1 ? -1 : 0;
				const dy = d === 2 ? 1 : d === 3 ? -1 : 0;
				const nx = x + dx;
				const ny = y + dy;
				if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
				const j = ny * W + nx;
				if (fire[j] || P.water[j] || (this.scarK[j] === 1 && this.scar[j] > 0 && this.scar[j] < SCAR_YEAR)) continue;
				const fu = this._fuel(j);
				if (fu < 0.1) continue;
				const dr = this._dry(j);
				if (dr <= 0) continue;
				let sl = 1 + 3 * (alt[j] - alt[i]);
				sl = sl < 0.5 ? 0.5 : sl > 1.5 ? 1.5 : sl;
				const p = FIRE_SPREAD * fu * dr * (1 + FIRE_WIND * (dx * cw + dy * sw)) * sl;
				if (rng.next() < p) this._ignite(j, tick);
			}
		}
		let w = 0;
		for (let k = 0; k < this.fireN; k++) {
			const i = list[k];
			if (fire[i]) list[w++] = i;
			else if (this.haz[i] === 1) this.haz[i] = this.flood[i] ? 2 : 0;
		}
		this.fireN = w;
		if (w === 0 && this.eventBurnt >= FIRE_LOG_END) this.log.push(tick, 'disaster', `The wildfire burned out after scorching ${this.eventBurnt} tiles`);
	}

	_storms(tick) {
		const Wx = this.weather;
		const rng = this.rng;
		for (const s of Wx.storms) {
			if (!s.on) continue;
			if (!Wx.drought && this.floodN === 0 && tick - this.lastFlood >= FLOOD_COOL && s.rain >= FLOOD_RAIN && s.r >= FLOOD_R && rng.next() < FLOOD_P) this._startFlood(s, tick);
			if (s.r >= WIND_R && tick - this.lastWind >= WIND_COOL && rng.next() < WIND_P) this._windthrow(s, tick);
		}
	}

	_startFlood(s, tick) {
		const P = this.plants;
		const Wx = this.weather;
		const W = this.world.width;
		const H = this.world.height;
		const r = s.r * 0.8;
		const x0 = Math.max(0, Math.floor(s.x - r));
		const x1 = Math.min(W - 1, Math.ceil(s.x + r));
		const y0 = Math.max(0, Math.floor(s.y - r));
		const y1 = Math.min(H - 1, Math.ceil(s.y + r));
		const list = this.floodList;
		let c = 0;
		for (let y = y0; y <= y1 && c < FLOOD_MAX; y++) {
			for (let x = x0; x <= x1 && c < FLOOD_MAX; x++) {
				const dx = x + 0.5 - s.x;
				const dy = y + 0.5 - s.y;
				if (dx * dx + dy * dy > r * r) continue;
				const i = y * W + x;
				if (P.water[i] || Wx.waterDist[i] > FLOOD_DIST || Wx.wet[i] < FLOOD_WET || Wx.snow[i] > 0.1) continue;
				list[c++] = i;
			}
		}
		this.lastFlood = tick;
		if (c < FLOOD_MIN) return;
		this.floodN = c;
		this.floods++;
		this.flooded += c;
		this.floodX = s.x;
		this.floodY = s.y;
		for (let k = 0; k < c; k++) this._floodTile(list[k]);
		this.log.push(tick, 'disaster', `Flood in the ${this._where(s.x, s.y)} — the rivers burst their banks`);
	}

	_floodTile(i) {
		const P = this.plants;
		const Wx = this.weather;
		const n = this.n;
		const soil = P.soil;
		const B = this.bugs;
		this.flood[i] = FLOOD_LIFE;
		if (!this.haz[i]) this.haz[i] = 2;
		if (Wx) Wx.wet[i] = 1;
		const u = n + i;
		if (P.species[u] && !P.kind[u] && P.genome[u * PG + 3] < PIONEER_WOOD && this.rng.next() < FLOOD_UNDER) {
			if (!this.scar[i]) {
				this.preBio[i] = (P.species[i] ? P.biomass[i] : 0) + P.biomass[u];
				this.scar[i] = 1;
				this.scarK[i] = 2;
			}
			P._clear(u);
		}
		if (P.species[i]) {
			P.biomass[i] *= FLOOD_CANOPY;
			P.health[i] *= FLOOD_CANOPY;
		}
		P.seedDens[i] *= 0.5;
		const N = soil.nutrient[i] + FLOOD_SILT;
		soil.nutrient[i] = N < SOIL_MAX ? N : SOIL_MAX;
		if (B) for (let q = 0; q < 4; q++) B.density[q * n + i] *= FLOOD_BUGS;
		this._killEggs(i);
	}

	godFlood(tiles, x, y, tick) {
		const P = this.plants;
		const Wx = this.weather;
		const list = this.floodList;
		let w = 0;
		for (let k = 0; k < this.floodN; k++) if (this.flood[list[k]]) list[w++] = list[k];
		const start = w;
		for (const i of tiles) {
			if (w >= FLOOD_MAX) break;
			if (P.water[i] || this.flood[i] || (Wx && Wx.snow[i] > 0.1)) continue;
			list[w++] = i;
		}
		this.floodN = w;
		const c = w - start;
		if (!c) return 0;
		this.floods++;
		this.flooded += c;
		this.floodX = x;
		this.floodY = y;
		this.lastFlood = tick;
		for (let k = start; k < w; k++) this._floodTile(list[k]);
		return c;
	}

	_floodTick() {
		const Wx = this.weather;
		const list = this.floodList;
		let live = 0;
		for (let k = 0; k < this.floodN; k++) {
			const i = list[k];
			if (!this.flood[i]) continue;
			this.flood[i]--;
			if (this.flood[i]) {
				live++;
				if (Wx && Wx.wet[i] < 0.9) Wx.wet[i] = 0.9;
			} else if (this.haz[i] === 2) this.haz[i] = 0;
		}
		if (!live) this.floodN = 0;
	}

	_endFlood() {
		for (let k = 0; k < this.floodN; k++) {
			const i = this.floodList[k];
			this.flood[i] = 0;
			if (this.haz[i] === 2) this.haz[i] = 0;
		}
		this.floodN = 0;
	}

	_windthrow(s, tick) {
		const P = this.plants;
		const W = this.world.width;
		const H = this.world.height;
		const rng = this.rng;
		const a = rng.next() * 6.283;
		const d = rng.next() * s.r * 0.7;
		const cx = s.x + Math.cos(a) * d;
		const cy = s.y + Math.sin(a) * d;
		const r = 2 + rng.next() * 3;
		const x0 = Math.max(0, Math.floor(cx - r));
		const x1 = Math.min(W - 1, Math.ceil(cx + r));
		const y0 = Math.max(0, Math.floor(cy - r));
		const y1 = Math.min(H - 1, Math.ceil(cy + r));
		let c = 0;
		for (let y = y0; y <= y1; y++) {
			for (let x = x0; x <= x1; x++) {
				const dx = x + 0.5 - cx;
				const dy = y + 0.5 - cy;
				if (dx * dx + dy * dy > r * r) continue;
				const i = y * W + x;
				if (P.water[i] || !P.species[i] || P.kind[i] || P.genome[i * PG + 3] < WIND_WOOD || rng.next() >= WIND_KNOCK) continue;
				if (!this.scar[i] || this.scarK[i] === 3) {
					this.preBio[i] = P.biomass[i] + (P.species[this.n + i] ? P.biomass[this.n + i] : 0);
					this.scar[i] = 1;
					this.scarK[i] = 3;
				}
				P._clear(i);
				c++;
			}
		}
		this.lastWind = tick;
		if (c < WIND_MIN) return;
		this.windthrow++;
		this.felled += c;
		this.log.push(tick, 'disaster', `A windstorm flattened ${c} trees in the ${this._where(cx, cy)}`);
	}

	avalanche(tiles, cx, cy, tick) {
		const P = this.plants;
		const A = this.animals;
		const n = this.n;
		const rng = this.rng;
		const hit = new Uint8Array(n);
		let trees = 0;
		for (const i of tiles) {
			if (hit[i]) continue;
			hit[i] = 1;
			if (P.water[i]) continue;
			if (P.species[i] && !P.kind[i]) {
				if (!this.scar[i] || this.scarK[i] === 3) {
					this.preBio[i] = P.biomass[i] + (P.species[n + i] ? P.biomass[n + i] : 0);
					this.scar[i] = 1;
					this.scarK[i] = 3;
				}
				if (P.genome[i * PG + 3] >= WIND_WOOD) trees++;
				P._clear(i);
			}
			const u = n + i;
			if (P.species[u] && !P.kind[u] && rng.next() < AV_UNDER) P._clear(u);
			this._killEggs(i);
		}
		let killed = 0;
		if (A) {
			const W = this.world.width;
			for (let a = 0; a < A.count; a++) {
				if (!A.alive[a] || A.domain[a] === 1 || (A.ug && A.ug[a]) || (A.domain[a] === 3 && A.fly[a] === 1)) continue;
				const t = (A.y[a] | 0) * W + (A.x[a] | 0);
				if (!hit[t]) continue;
				if (rng.next() >= AV_KILL * (1 - AV_CLIMB * A.genome[a * AG + G_CLIMB])) continue;
				A.deaths.avalanche = (A.deaths.avalanche || 0) + 1;
				A._kill(a);
				killed++;
			}
		}
		this.avalanches = (this.avalanches || 0) + 1;
		this.log.push(tick, 'disaster', `An avalanche swept down the ${this._where(cx, cy)}${killed ? ` and buried ${killed} animal${killed > 1 ? 's' : ''}` : ''}`);
		return { trees, killed };
	}

	_succession(tick) {
		const P = this.plants;
		const n = this.n;
		const W = this.world.width;
		const H = this.world.height;
		const rng = this.rng;
		const scar = this.scar;
		const sp = P.species;
		const bio = P.biomass;
		const g = P.genome;
		let tiles = 0;
		let recN = 0;
		let recS = 0;
		let yU = 0;
		let yT = 0;
		let oU = 0;
		let oT = 0;
		let logSp = null;
		for (let i = 0; i < n; i++) {
			const a = scar[i];
			if (!a) continue;
			if (a >= SCAR_MAX) {
				scar[i] = 0;
				this.scarK[i] = 0;
				continue;
			}
			scar[i] = a + 1;
			tiles++;
			const c = sp[i] ? bio[i] : 0;
			const u = sp[n + i] && !P.kind[n + i] ? bio[n + i] : 0;
			if (a <= SCAR_YEAR) {
				yU += u;
				yT += u + c;
			} else if (a > 2 * SCAR_YEAR) {
				oU += u;
				oT += u + c;
			}
			if (a >= SCAR_YEAR && this.preBio[i] > 0.05) {
				const r = (c + u) / this.preBio[i];
				recS += r < 1.5 ? r : 1.5;
				recN++;
			}
			if (a > PIONEER_AGE || sp[n + i] || this.fire[i] || this.flood[i] || rng.next() >= PIONEER_P) continue;
			const x = i % W;
			const y = (i - x) / W;
			for (let t = 0; t < 3; t++) {
				const nx = x + ((rng.next() * 5) | 0) - 2;
				const ny = y + ((rng.next() * 5) | 0) - 2;
				if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
				const j = n + ny * W + nx;
				const id = sp[j];
				if (!id || P.kind[j] || g[j * PG + 3] >= PIONEER_WOOD || P.water[j - n]) continue;
				const parent = P.registry.get(id);
				if (!parent) continue;
				const child = this._scratch;
				mutateGenes(g, j * PG, child, 0, PG, rng, 0.2, 0.025);
				if (P.plantSeed(i, child, parent, tick, false)) {
					this.recolonised++;
					if (!logSp) logSp = parent;
				}
				break;
			}
		}
		this.scarTiles = tiles;
		this.recovery = recN ? recS / recN : 0;
		this.pioneerYoung = yT > 0 ? yU / yT : 0;
		this.pioneerOld = oT > 0 ? oU / oT : 0;
		if (logSp && tick - this.lastRecolLog >= RECOL_LOG_EVERY) {
			this.lastRecolLog = tick;
			this.log.push(tick, 'disaster', `${logSp.name} recolonised the burn`, logSp.id);
		}
	}

	stats() {
		const Wx = this.weather;
		return {
			activeFires: this.fireN,
			fires: this.fires,
			burnt: this.burnt,
			burntShare: Math.round((this.burnt / this.landTiles) * 1000) / 10,
			floods: this.floods,
			flooded: this.flooded,
			flooding: this.floodN,
			droughts: Wx ? Wx.droughts : 0,
			drought: !!(Wx && Wx.drought),
			windthrow: this.windthrow,
			felled: this.felled,
			killed: this.killed,
			drowned: this.drowned,
			eggsLost: this.eggsLost,
			plantsBurnt: this.plantsBurnt,
			survived: this.survived,
			adaptShare: this.survived ? Math.round((this.adaptBurn / this.survived) * 100) : 0,
			recolonised: this.recolonised,
			scarTiles: this.scarTiles,
			recovery: Math.round(this.recovery * 100),
			pioneerYoung: Math.round(this.pioneerYoung * 100),
			pioneerOld: Math.round(this.pioneerOld * 100),
		};
	}
}
