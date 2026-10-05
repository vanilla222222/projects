const GOD_MAX_R = 16;
const GOD_MAX_PTS = 64;
const GOD_MAX_SPAWN = 200;
const GOD_CLIMATE_STEP = 0.05;
const GOD_OCEAN_TOP = 0.38;
const GOD_DEEP_TOP = 0.2;
const GOD_REEF_LO = 0.37;
const GOD_REEF_HI = 0.4;
const GOD_LAND_MIN = 0.43;
const GOD_PAINT_BRUSHES = ['biome', 'temp', 'moist'];

class GodTools {
	constructor() {
		this.edits = [];
		this.version = 0;
		this.spawned = 0;
		this.painted = 0;
		this.lastStroke = 0;
		this.lastCount = 0;
		this.lastText = '';
	}

	static paintable() {
		return BIOME_LIST.filter((k) => k !== 'CLIFF' && k !== 'FROZEN_DESERT');
	}

	static clean(world, a) {
		const W = world.width;
		const H = world.height;
		const pts = [];
		const src = Array.isArray(a.pts) ? a.pts : [];
		for (let k = 0; k + 1 < src.length && pts.length < GOD_MAX_PTS * 2; k += 2) {
			const x = +src[k];
			const y = +src[k + 1];
			if (!(x >= 0 && y >= 0 && x < W && y < H)) continue;
			pts.push(Math.round(x * 100) / 100, Math.round(y * 100) / 100);
		}
		const r = Math.max(0, Math.min(GOD_MAX_R, Math.round(+a.r || 0)));
		return { pts, r };
	}

	static tiles(world, pts, r) {
		const W = world.width;
		const H = world.height;
		const mark = new Uint8Array(W * H);
		const out = [];
		const rr = r * r + r;
		for (let k = 0; k + 1 < pts.length; k += 2) {
			const cx = Math.floor(pts[k]);
			const cy = Math.floor(pts[k + 1]);
			for (let dy = -r; dy <= r; dy++) {
				const y = cy + dy;
				if (y < 0 || y >= H) continue;
				for (let dx = -r; dx <= r; dx++) {
					const x = cx + dx;
					if (x < 0 || x >= W || dx * dx + dy * dy > rr) continue;
					const i = y * W + x;
					if (mark[i]) continue;
					mark[i] = 1;
					out.push(i);
				}
			}
		}
		out.sort((a, b) => a - b);
		return out;
	}

	static paintWorld(world, e) {
		const tiles = GodTools.tiles(world, e.pts, e.r);
		if (e.brush === 'biome') {
			const b = BIOME_ID[e.value];
			if (b === undefined) return [];
			const sea = BIOME_THRESHOLDS.seaLevel;
			const alt = world.altitude;
			for (const i of tiles) {
				world.biome[i] = b;
				world.isOcean[i] = 0;
				world.isLake[i] = 0;
				world.isRiver[i] = 0;
				world.isPond[i] = 0;
				world.isGlacier[i] = 0;
				world.isSalt[i] = 0;
				if (world.isDelta) world.isDelta[i] = 0;
				const flow = world.riverFlow[i];
				world.riverFlow[i] = 0;
				if (b === BIOME_ID.OCEAN_DEEP) {
					world.isOcean[i] = 1;
					alt[i] = Math.min(alt[i], GOD_DEEP_TOP);
				} else if (b === BIOME_ID.OCEAN || b === BIOME_ID.FROZEN_OCEAN) {
					world.isOcean[i] = 1;
					alt[i] = Math.max(BIOME_THRESHOLDS.deepOceanLevel + 0.01, Math.min(alt[i], GOD_OCEAN_TOP));
				} else if (b === BIOME_ID.CORAL_REEF) {
					world.isOcean[i] = 1;
					alt[i] = Math.max(GOD_REEF_LO, Math.min(alt[i], GOD_REEF_HI));
				} else if (b === BIOME_ID.LAKE) {
					world.isLake[i] = 1;
					alt[i] = Math.min(alt[i], sea - 0.01);
				} else if (b === BIOME_ID.RIVER) {
					world.isRiver[i] = 1;
					world.riverFlow[i] = Math.max(flow, 1);
					alt[i] = Math.min(alt[i], sea - 0.005);
				} else if (b === BIOME_ID.POND) {
					world.isPond[i] = 1;
					alt[i] = Math.min(alt[i], sea - 0.005);
				} else {
					alt[i] = Math.max(alt[i], GOD_LAND_MIN);
					if (b === BIOME_ID.GLACIER) world.isGlacier[i] = 1;
					else if (b === BIOME_ID.SALT_FLAT) world.isSalt[i] = 1;
				}
			}
		} else if (e.brush === 'temp' || e.brush === 'moist') {
			const arr = e.brush === 'temp' ? world.temperature : world.humidity;
			const d = (e.value > 0 ? 1 : -1) * GOD_CLIMATE_STEP;
			for (const i of tiles) {
				const v = arr[i] + d;
				arr[i] = v < 0 ? 0 : v > 1 ? 1 : v;
			}
		} else return [];
		return tiles;
	}

	_log(eco, stroke, text, count, speciesId) {
		const L = eco.log;
		const top = L.items[0];
		if (stroke && stroke === this.lastStroke && top && top.type === 'god' && top.text === this.lastText) {
			this.lastCount += count;
		} else {
			this.lastCount = count;
			L.push(eco.tick, 'god', '', speciesId || null);
		}
		this.lastStroke = stroke || 0;
		const item = L.items[0];
		item.text = text(this.lastCount);
		this.lastText = item.text;
		L.version++;
	}

	apply(eco, a) {
		if (!a || typeof a !== 'object') return { ok: false, count: 0 };
		if (a.kind === 'spawn') return this._spawn(eco, a);
		if (a.kind === 'paint') return this._paint(eco, a);
		return { ok: false, count: 0 };
	}

	_spawn(eco, a) {
		const sp = eco.registry.get(a.sp | 0);
		if (!sp || sp.population <= 0 || (sp.group !== 'animal' && sp.group !== 'plant')) return { ok: false, count: 0 };
		const { pts, r } = GodTools.clean(eco.world, a);
		if (!pts.length) return { ok: false, count: 0 };
		const n = Math.max(1, Math.min(GOD_MAX_SPAWN, a.n | 0));
		const count = sp.group === 'animal' ? this._spawnAnimals(eco, sp, pts, r, n) : this._spawnPlants(eco, sp, pts, r, n);
		if (count > 0) {
			this.spawned += count;
			const name = sp.name;
			this._log(eco, a.stroke | 0, (c) => `You spawned ${c} ${name}`, count, sp.id);
		}
		return { ok: count > 0, count };
	}

	_spawnAnimals(eco, sp, pts, r, n) {
		const A = eco.animals;
		const rng = eco.rng;
		const dom = domainIndex(sp.domain);
		const src = sp.mean || sp.genome;
		const g = new Float32Array(AG);
		const np = pts.length >> 1;
		const spread = Math.max(0.5, r);
		let placed = 0;
		for (let k = 0; k < n; k++) {
			if (A.count >= A.maxAnimals + 1500) break;
			const p = (k % np) * 2;
			let x = -1;
			let y = -1;
			for (let t = 0; t < 12; t++) {
				const cx = pts[p] + (rng.next() * 2 - 1) * spread;
				const cy = pts[p + 1] + (rng.next() * 2 - 1) * spread;
				if (A.canStand(dom, cx, cy)) {
					x = cx;
					y = cy;
					break;
				}
			}
			if (x < 0) continue;
			mutateGenes(src, 0, g, 0, AG, rng, 0.25, 0.04);
			A._clampClass(g, sp.cls);
			if (dom !== 1) {
				g[G_DEPTH] = src[G_DEPTH];
				g[G_SALT] = src[G_SALT];
			}
			const idx = A.spawn(sp, g, 0, x, y, 0.8);
			A.age[idx] = Math.floor(A.mature[idx] * (0.6 + rng.next()));
			placed++;
		}
		return placed;
	}

	_spawnPlants(eco, sp, pts, r, n) {
		const P = eco.plants;
		const rng = eco.rng;
		const W = eco.world.width;
		const H = eco.world.height;
		const kind = sp.kind | 0;
		const wantWet = sp.domain === 'water' ? 1 : 0;
		const src = sp.mean || sp.genome;
		const g = new Float32Array(PG);
		const np = pts.length >> 1;
		const used = new Set();
		let placed = 0;
		for (let k = 0, t = 0; placed < n && t < n * 8; t++, k++) {
			const p = (k % np) * 2;
			const x = Math.floor(pts[p] + (rng.next() * 2 - 1) * (r + 0.5));
			const y = Math.floor(pts[p + 1] + (rng.next() * 2 - 1) * (r + 0.5));
			if (x < 0 || y < 0 || x >= W || y >= H) continue;
			const j = y * W + x;
			if (used.has(j) || P.water[j] !== wantWet) continue;
			mutateGenes(src, 0, g, 0, PG, rng, 0.2, 0.025);
			if (kind === 1) {
				g[8] = 0;
				g[9] = 0;
			}
			const slot = slotOf(g, P.water[j], 0, kind);
			const q = slot * P.n + j;
			if (P.species[q]) continue;
			used.add(j);
			P._set(q, sp, g, 0);
			if (!(P.cap[q] >= 0.02)) {
				P._clear(q);
				continue;
			}
			P.biomass[q] = P.cap[q] * 0.5;
			placed++;
		}
		if (placed) P.version++;
		return placed;
	}

	_paint(eco, a) {
		const brush = GOD_PAINT_BRUSHES.includes(a.brush) ? a.brush : null;
		if (!brush) return { ok: false, count: 0 };
		const { pts, r } = GodTools.clean(eco.world, a);
		if (!pts.length) return { ok: false, count: 0 };
		let value;
		if (brush === 'biome') {
			if (!GodTools.paintable().includes(a.value)) return { ok: false, count: 0 };
			value = a.value;
		} else value = +a.value > 0 ? 1 : -1;
		const edit = { brush, value, pts, r };
		const P = eco.plants;
		const before = { water: P.water.slice(), depth: P.depth.slice(), sal: P.sal.slice(), habit: P.habit.slice() };
		const tiles = GodTools.paintWorld(eco.world, edit);
		if (!tiles.length) return { ok: false, count: 0 };
		this.edits.push(edit);
		this.version++;
		this.painted += tiles.length;
		const lost = this._refresh(eco, tiles, before);
		const what = brush === 'biome' ? BIOME_INFO[value].name : brush === 'temp' ? (value > 0 ? 'warmer' : 'colder') : value > 0 ? 'wetter' : 'drier';
		const tail = lost > 0 ? ` (${lost} animals lost)` : '';
		if (brush === 'biome') this._log(eco, a.stroke | 0, (c) => `You painted ${c} tiles of ${what}${tail}`, tiles.length);
		else this._log(eco, a.stroke | 0, (c) => `You made ${c} tiles ${what}`, tiles.length);
		return { ok: true, count: tiles.length, lost };
	}

	_refresh(eco, tiles, before) {
		const P = eco.plants;
		const world = eco.world;
		const n = P.n;
		P._prepareClimate();
		if (eco.options && !eco.options.seasons) P.seasonAmp.fill(0);
		if (P.soil) P.soil._terrain(world);
		const touched = new Uint8Array(n);
		for (const i of tiles) touched[i] = 1;
		for (let i = 0; i < n; i++) {
			if (P.water[i] !== before.water[i] || P.depth[i] !== before.depth[i] || P.sal[i] !== before.sal[i] || P.habit[i] !== before.habit[i]) touched[i] = 1;
		}
		const Wx = eco.weather;
		if (Wx) {
			let land = 0;
			for (let i = 0; i < n; i++) {
				if (touched[i]) {
					Wx._evapK[i] = EVAP * (0.5 + world.temperature[i]);
					if (P.water[i]) Wx.wet[i] = 0;
					else if (before.water[i]) Wx.wet[i] = world.humidity[i];
				}
				if (!P.water[i]) land++;
			}
			Wx.landTiles = land;
			Wx._setFresh();
			Wx._buildWaterDist();
			Wx._updateTiles(false);
		}
		for (let i = 0; i < n; i++) if (touched[i]) this._replant(P, i);
		const B = eco.bugs;
		if (B) {
			for (let i = 0; i < n; i++) {
				if (!touched[i]) continue;
				for (let k = 0; k < 4; k++) {
					const q = k * n + i;
					if (!B.species[q]) continue;
					if (BUG_LAND_ONLY[k] && P.water[i]) B._clear(q);
					else {
						const f = B._fit(B.genome, q * BG, i);
						B.fit[q] = f > 0 ? f : 0;
					}
				}
			}
		}
		const lost = this._rewalk(eco);
		const D = eco.disasters;
		if (D) {
			let land = 0;
			for (let i = 0; i < n; i++) if (!P.water[i]) land++;
			D.landTiles = land || 1;
		}
		P.version++;
		return lost;
	}

	_replant(P, i) {
		const n = P.n;
		const wet = P.water[i];
		for (let s = 0; s < 2; s++) {
			const p = s * n + i;
			const id = P.species[p];
			if (!id) continue;
			const sp = P.registry.get(id);
			const kind = P.kind[p];
			const base = p * PG;
			const fits = sp && (kind ? !wet : (sp.domain === 'water' ? 1 : 0) === wet) && slotOf(P.genome, wet, base, kind) === s;
			if (!fits) {
				P._clear(p);
				continue;
			}
			const keep = {
				biomass: P.biomass[p],
				age: P.age[p],
				life: P.life[p],
				health: P.health[p],
				sat: P.sat[p],
				fruit: P.fruit[p],
				fruitMax: P.fruitMax[p],
				induced: P.induced[p],
				floor: P.floor[p],
				blight: P.blight[p],
				blightT: P.blightT[p],
				blightImm: P.blightImm[p],
			};
			const peak = sp.peak;
			P.blight[p] = 0;
			P.species[p] = 0;
			P._set(p, sp, P.genome, base);
			sp.population--;
			sp.peak = peak;
			P.age[p] = keep.age;
			P.life[p] = keep.life;
			P.health[p] = keep.health;
			P.sat[p] = keep.sat;
			P.fruit[p] = keep.fruit;
			P.fruitMax[p] = keep.fruitMax;
			P.induced[p] = keep.induced;
			P.blight[p] = keep.blight;
			P.blightT[p] = keep.blightT;
			P.blightImm[p] = keep.blightImm;
			P.floor[p] = keep.floor > 0 ? P.floorM[p] : 0;
			P.biomass[p] = keep.biomass < P.cap[p] ? keep.biomass : P.cap[p];
		}
	}

	_rewalk(eco) {
		const A = eco.animals;
		const world = eco.world;
		const n = world.width * world.height;
		const walk = A.walk;
		for (let i = 0; i < n; i++) {
			const b = world.biome[i];
			let w;
			if (b === BIOME_ID.RIVER || b === BIOME_ID.POND) w = 3;
			else if (WATER_BIOME_SET.has(b)) w = 2;
			else w = b === BIOME_ID.GLACIER ? 0 : b === BIOME_ID.BEACH || b === BIOME_ID.CLIFF ? 17 : 1;
			w |= 8;
			if (b === BIOME_ID.HILLS || b === BIOME_ID.BADLANDS || b === BIOME_ID.MOUNTAINS || b === BIOME_ID.CLIFF || b === BIOME_ID.VOLCANIC || b === BIOME_ID.ALPINE_MEADOW) w |= 32;
			if (b === BIOME_ID.SALT_FLAT || b === BIOME_ID.MANGROVE) w |= 64;
			if (b === BIOME_ID.TUNDRA_BOG || b === BIOME_ID.BOG || b === BIOME_ID.CORAL_REEF) w |= 128;
			walk[i] = w;
			A.zone[i] = BIOME_ZONE[b];
		}
		A.setWeather(A.weather);
		let lost = 0;
		for (let k = 0; k < A.count; k++) {
			if (!A.alive[k] || A.canStand(A.domain[k], A.x[k], A.y[k])) continue;
			A._kill(k, 1);
			lost++;
		}
		if (lost) A._compact();
		return lost;
	}
}
