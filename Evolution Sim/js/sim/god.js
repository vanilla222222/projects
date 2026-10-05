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
const GOD_DIS_R = 12;
const GOD_FIRE_FUEL = 0.05;
const GOD_DROUGHT_BASE = 240;
const GOD_DROUGHT_PER_R = 20;
const GOD_DROUGHT_DRY = 0.15;
const GOD_CRATER_DEPTH = 0.06;
const GOD_CRATER_RIM = 0.03;
const GOD_CRATER_WATER_R = 4;
const GOD_SICK_ANIMALS = 40;
const GOD_SICK_PLANTS = 60;
const GOD_LOCUST_STRIP = 0.3;
const GOD_LOCUST_SWARM = 0.75;
const GOD_PLANT_CLS = 6;
const GOD_FEED_FAT = 0.5;
const GOD_FERT = 0.5;
const GOD_BLIGHT = 0.3;
const GOD_STER_MIN = 10;
const GOD_STER_MAX = 5000;
const GOD_FX_MAX = 12;
const GOD_BLESS = ['feed', 'heal', 'sterile', 'cull'];

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

	static setBiome(world, i, b) {
		const sea = BIOME_THRESHOLDS.seaLevel;
		const alt = world.altitude;
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

	static crater(world, e) {
		const b = BIOME_ID[e.value];
		if (b === undefined || (e.value !== 'OCEAN' && e.value !== 'LAKE' && e.value !== 'VOLCANIC')) return [];
		const W = world.width;
		const alt = world.altitude;
		const sea = BIOME_THRESHOLDS.seaLevel;
		const inner = GodTools.tiles(world, e.pts, e.r);
		const outer = GodTools.tiles(world, e.pts, e.r + 1);
		const cx = Math.floor(e.pts[0]) + 0.5;
		const cy = Math.floor(e.pts[1]) + 0.5;
		const span = e.r + 1;
		const mark = new Set(inner);
		for (const i of inner) {
			GodTools.setBiome(world, i, b);
			const dx = (i % W) + 0.5 - cx;
			const dy = Math.floor(i / W) + 0.5 - cy;
			const k = 1 - Math.sqrt(dx * dx + dy * dy) / span;
			const bowl = k > 0 ? k : 0;
			if (b === BIOME_ID.OCEAN) alt[i] = Math.max(BIOME_THRESHOLDS.deepOceanLevel + 0.01, alt[i] - GOD_CRATER_DEPTH * bowl);
			else if (b === BIOME_ID.LAKE) alt[i] = Math.max(0, Math.min(alt[i], sea - 0.01) - GOD_CRATER_DEPTH * bowl);
			else alt[i] = Math.max(GOD_LAND_MIN, alt[i] - GOD_CRATER_DEPTH * bowl);
		}
		const out = inner.slice();
		for (const i of outer) {
			if (mark.has(i) || world.isOcean[i] || world.isLake[i] || world.isRiver[i] || world.isPond[i]) continue;
			GodTools.setBiome(world, i, BIOME_ID.VOLCANIC);
			const v = alt[i] + GOD_CRATER_RIM;
			alt[i] = v < 1 ? v : 1;
			out.push(i);
		}
		out.sort((a, b2) => a - b2);
		return out;
	}

	static paintWorld(world, e) {
		if (e.brush === 'crater') return GodTools.crater(world, e);
		const tiles = GodTools.tiles(world, e.pts, e.r);
		if (e.brush === 'biome') {
			const b = BIOME_ID[e.value];
			if (b === undefined) return [];
			for (const i of tiles) GodTools.setBiome(world, i, b);
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
		if (a.kind === 'fire') return this._fire(eco, a);
		if (a.kind === 'flood') return this._flood(eco, a);
		if (a.kind === 'drought') return this._drought(eco, a);
		if (a.kind === 'meteor') return this._meteor(eco, a);
		if (a.kind === 'disease') return this._disease(eco, a);
		if (a.kind === 'locust') return this._locust(eco, a);
		if (GOD_BLESS.includes(a.kind)) return this._bless(eco, a);
		if (a.kind === 'fertilise' || a.kind === 'blight') return this._soil(eco, a);
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
		const tail = lost > 0 ? ` (${lost} animal${lost === 1 ? '' : 's'} lost)` : '';
		if (brush === 'biome') this._log(eco, a.stroke | 0, (c) => `You painted ${c} tiles of ${what}${tail}`, tiles.length);
		else this._log(eco, a.stroke | 0, (c) => `You made ${c} tiles ${what}`, tiles.length);
		return { ok: true, count: tiles.length, lost };
	}

	_spot(eco, a, min) {
		const c = GodTools.clean(eco.world, a);
		if (!c.pts.length) return null;
		const r = Math.max(min, Math.min(GOD_DIS_R, c.r));
		const pts = [c.pts[0], c.pts[1]];
		return { pts, r, x: pts[0], y: pts[1], tiles: GodTools.tiles(eco.world, pts, r) };
	}

	_count(key) {
		this[key] = (this[key] | 0) + 1;
	}

	_where(eco, x, y) {
		const Dz = eco.disasters;
		return Dz ? Dz._where(x, y) : 'that spot';
	}

	_fire(eco, a) {
		const Dz = eco.disasters;
		if (!Dz || !Dz.on) return { ok: false, count: 0, reason: 'off' };
		const s = this._spot(eco, a, 0);
		if (!s) return { ok: false, count: 0 };
		const c = this._light(eco, s.tiles);
		if (!c) return { ok: false, count: 0, reason: 'fuel' };
		this._count('fires');
		const where = Dz._where(s.x, s.y);
		this._log(eco, 0, () => `You set a wildfire in the ${where} (${c} tile${c === 1 ? '' : 's'} alight)`, c);
		return { ok: true, count: c };
	}

	_light(eco, tiles) {
		const Dz = eco.disasters;
		const P = eco.plants;
		const fresh = Dz.fireN === 0;
		let c = 0;
		for (const i of tiles) {
			if (P.water[i] || Dz.fire[i] || Dz._fuel(i) < GOD_FIRE_FUEL) continue;
			if (fresh && !c) {
				Dz.eventBurnt = 0;
				Dz.eventLogged = false;
			}
			Dz._ignite(i, eco.tick);
			c++;
		}
		if (c && fresh) Dz.fires++;
		return c;
	}

	_flood(eco, a) {
		const Dz = eco.disasters;
		if (!Dz || !Dz.on || !eco.weather) return { ok: false, count: 0, reason: 'off' };
		const s = this._spot(eco, a, 1);
		if (!s) return { ok: false, count: 0 };
		const c = Dz.godFlood(s.tiles, s.x, s.y, eco.tick);
		if (!c) return { ok: false, count: 0, reason: 'land' };
		this._count('floods');
		const where = Dz._where(s.x, s.y);
		this._log(eco, 0, () => `You flooded ${c} tile${c === 1 ? '' : 's'} in the ${where}`, c);
		return { ok: true, count: c };
	}

	_drought(eco, a) {
		const Wx = eco.weather;
		if (!Wx || !Wx.on) return { ok: false, count: 0, reason: 'off' };
		const s = this._spot(eco, a, 0);
		if (!s) return { ok: false, count: 0 };
		const was = Wx.drought;
		const c = Wx.godDrought(eco.tick, s.tiles, GOD_DROUGHT_BASE + GOD_DROUGHT_PER_R * s.r, GOD_DROUGHT_DRY);
		this._count('droughts');
		const where = this._where(eco, s.x, s.y);
		this._log(eco, 0, () => (was ? `You deepened the drought, parching ${c} tiles in the ${where}` : `You called down a drought, parching ${c} tiles in the ${where}`), c);
		return { ok: true, count: c };
	}

	_meteor(eco, a) {
		const s = this._spot(eco, a, 2);
		if (!s) return { ok: false, count: 0 };
		const world = eco.world;
		const P = eco.plants;
		const A = eco.animals;
		const B = eco.bugs;
		const E = eco.eggs;
		const Dz = eco.disasters;
		const n = P.n;
		const W = world.width;
		const R = s.r;
		const rc = Math.max(1, Math.round(R * 0.5));
		const cx = Math.floor(s.x) + 0.5;
		const cy = Math.floor(s.y) + 0.5;
		const inner = GodTools.tiles(world, s.pts, rc);
		const rim = GodTools.tiles(world, s.pts, rc + 1);
		let wet = rc >= GOD_CRATER_WATER_R;
		for (const i of inner) if (P.water[i]) wet = true;
		let sea = false;
		for (const i of rim) if (world.isOcean[i]) sea = true;
		const value = wet ? (sea ? 'OCEAN' : 'LAKE') : 'VOLCANIC';
		const rr = R * R + R;
		let killed = 0;
		for (let k = 0; k < A.count; k++) {
			if (!A.alive[k]) continue;
			const dx = A.x[k] - cx;
			const dy = A.y[k] - cy;
			if (dx * dx + dy * dy > rr) continue;
			A._kill(k, 1);
			killed++;
		}
		if (killed) A._compact();
		const blast = s.tiles;
		const pre = new Float32Array(blast.length);
		const soil = P.soil;
		for (let t = 0; t < blast.length; t++) {
			const i = blast[t];
			pre[t] = (P.species[i] ? P.biomass[i] : 0) + (P.species[n + i] ? P.biomass[n + i] : 0);
			P._clear(i);
			P._clear(n + i);
			P.seedDens[i] = 0;
			const L = soil.litter[i];
			soil.litter[i] = 0;
			const N = soil.nutrient[i] + L * FIRE_ASH;
			soil.nutrient[i] = N < SOIL_MAX ? N : SOIL_MAX;
			if (B) for (let k = 0; k < 4; k++) B._clear(k * n + i);
			if (E) {
				for (let e = E.head[i]; e >= 0; e = E.next[e]) {
					if (!E.alive[e]) continue;
					E.alive[e] = 0;
					E.failed++;
				}
			}
		}
		const where = this._where(eco, s.x, s.y);
		const edit = { brush: 'crater', value, pts: s.pts, r: rc };
		const before = { water: P.water.slice(), depth: P.depth.slice(), sal: P.sal.slice(), habit: P.habit.slice() };
		const tiles = GodTools.paintWorld(world, edit);
		this.edits.push(edit);
		this.version++;
		this.painted += tiles.length;
		killed += this._refresh(eco, tiles, before);
		let burning = 0;
		if (Dz) {
			for (let t = 0; t < blast.length; t++) {
				const i = blast[t];
				if (P.water[i]) continue;
				Dz.preBio[i] = pre[t];
				Dz.scar[i] = 1;
				Dz.scarK[i] = 1;
			}
			if (Dz.on) {
				const ring = GodTools.tiles(world, s.pts, R + 2);
				const edge = [];
				for (const i of ring) {
					const dx = (i % W) + 0.5 - cx;
					const dy = Math.floor(i / W) + 0.5 - cy;
					if (dx * dx + dy * dy > rr) edge.push(i);
				}
				burning = this._light(eco, edge);
			}
		}
		if (B) {
			B._sumTotals();
			B.version++;
		}
		this.meteorKills = (this.meteorKills | 0) + killed;
		this._count('meteors');
		const what = value === 'VOLCANIC' ? 'a rocky crater' : value === 'OCEAN' ? 'a flooded sea crater' : 'a crater lake';
		const tail = killed ? `, killing ${killed} animal${killed === 1 ? '' : 's'}` : '';
		const fire = burning ? ' and setting the edge alight' : '';
		this._log(eco, 0, () => `A meteor struck the ${where}, leaving ${what}${tail}${fire}`, 1);
		return { ok: true, count: blast.length, killed, x: cx, y: cy, r: R, crater: value };
	}

	_disease(eco, a) {
		const D = eco.disease;
		if (!D || !D.on) return { ok: false, count: 0, reason: 'off' };
		const s = this._spot(eco, a, 3);
		if (!s) return { ok: false, count: 0 };
		const Rg = eco.registry;
		const A = eco.animals;
		const P = eco.plants;
		const n = P.n;
		const rr = s.r * s.r + s.r;
		let host = null;
		let isP = false;
		if (a.sp) {
			host = Rg.get(a.sp | 0);
			if (!host || !(host.population > 0) || (host.group !== 'animal' && host.group !== 'plant') || host.kind | 0) return { ok: false, count: 0, reason: 'host' };
			isP = host.group === 'plant';
		} else {
			const cls = a.cls | 0;
			if (cls < 0 || cls > GOD_PLANT_CLS) return { ok: false, count: 0, reason: 'host' };
			isP = cls === GOD_PLANT_CLS;
			const tally = new Map();
			if (isP) {
				for (const i of s.tiles) {
					for (let k = 0; k < 2; k++) {
						const q = k * n + i;
						const id = P.species[q];
						if (id && !P.kind[q] && !P.blight[q]) tally.set(id, (tally.get(id) || 0) + 1);
					}
				}
			} else {
				for (let k = 0; k < A.count; k++) {
					if (!A.alive[k] || A.cls[k] !== cls || A.strain[k]) continue;
					const dx = A.x[k] - s.x;
					const dy = A.y[k] - s.y;
					if (dx * dx + dy * dy > rr) continue;
					tally.set(A.sp[k], (tally.get(A.sp[k]) || 0) + 1);
				}
			}
			let best = 0;
			let bid = 0;
			for (const [id, c] of tally) {
				if (c > best || (c === best && id < bid)) {
					best = c;
					bid = id;
				}
			}
			host = bid ? Rg.get(bid) : null;
			if (!host) return { ok: false, count: 0, reason: 'none' };
		}
		const hosts = [];
		if (isP) {
			for (const i of s.tiles) {
				for (let k = 0; k < 2 && hosts.length < GOD_SICK_PLANTS; k++) {
					const q = k * n + i;
					if (P.species[q] === host.id && !P.blight[q]) hosts.push(q);
				}
			}
		} else {
			for (let k = 0; k < A.count && hosts.length < GOD_SICK_ANIMALS; k++) {
				if (!A.alive[k] || A.sp[k] !== host.id || A.strain[k]) continue;
				const dx = A.x[k] - s.x;
				const dy = A.y[k] - s.y;
				if (dx * dx + dy * dy <= rr) hosts.push(k);
			}
		}
		if (!hosts.length) return { ok: false, count: 0, reason: 'none' };
		const rng = D.rng;
		const g = new Float32Array(DG);
		g[D_TRANS] = clamp01(0.5 + gaussRand(rng) * EMERGE_SD);
		g[D_VIR] = clamp01(EMERGE_VIR + gaussRand(rng) * EMERGE_SD);
		g[D_RANGE] = clamp01(0.3 + gaussRand(rng) * EMERGE_SD);
		g[D_HUE] = rng.next();
		const kind = isP ? 'plant' : 'animal';
		const st = D._newStrain(g, kind, host.id, host.genome, null, eco.tick, 'emerged');
		for (const h of hosts) {
			if (isP) D.infectPlant(h, st.id);
			else D.infectAnimal(h, st.id);
		}
		D.lastHad[isP ? 1 : 0] = eco.tick;
		if (isP) D.blights++;
		else D.outbreaks++;
		this._count('plagues');
		const c = hosts.length;
		const hname = host.name;
		const sname = st.name;
		this._log(eco, 0, () => (isP ? `You blighted ${c} ${hname} with ${sname}` : `You infected ${c} ${hname} with ${sname}`), c, st.id);
		return { ok: true, count: c, strain: st.id, host: host.id };
	}

	_locust(eco, a) {
		const B = eco.bugs;
		if (!B) return { ok: false, count: 0, reason: 'off' };
		const s = this._spot(eco, a, 1);
		if (!s) return { ok: false, count: 0 };
		const P = eco.plants;
		const n = P.n;
		const land = s.tiles.filter((i) => !P.water[i]);
		if (!land.length) return { ok: false, count: 0, reason: 'land' };
		const Rg = eco.registry;
		let sp = null;
		for (const id of Rg.living) {
			const x = Rg.get(id);
			if (x && x.group === 'bug' && x.nicheIndex === BUG_PEST && x.category === 'locust' && x.population > 0 && (!sp || x.population > sp.population)) sp = x;
		}
		const g = new Float32Array(BG);
		if (sp) {
			const src = sp.mean && sp.mean.length >= BG ? sp.mean : sp.genome;
			for (let k = 0; k < BG; k++) g[k] = src[k];
		} else {
			const arch = BUG_ARCHETYPES[1].g;
			for (let k = 0; k < BG && k < arch.length; k++) g[k] = arch[k];
		}
		if (g[B_SWARM] < GOD_LOCUST_SWARM) g[B_SWARM] = GOD_LOCUST_SWARM;
		if (!sp) sp = B._newSpecies(g, BUG_PEST, 0, null, eco.tick, 'migrated');
		let stripped = 0;
		for (const i of land) {
			B._set(i, sp, g, 0, 1);
			const u = n + i;
			if (P.species[i]) {
				stripped += P.biomass[i] * (1 - GOD_LOCUST_STRIP);
				P.biomass[i] *= GOD_LOCUST_STRIP;
				P.fruit[i] = 0;
			}
			if (P.species[u] && !P.kind[u]) {
				stripped += P.biomass[u] * (1 - GOD_LOCUST_STRIP);
				P.biomass[u] *= GOD_LOCUST_STRIP;
				P.fruit[u] = 0;
			}
		}
		B.pestDamage += stripped;
		B._sumTotals();
		B.version++;
		P.version++;
		this._count('locusts');
		const c = land.length;
		const name = sp.name;
		this._log(eco, 0, () => `You loosed a plague of ${name} locusts over ${c} tiles`, c, sp.id);
		return { ok: true, count: c, sp: sp.id };
	}

	_aim(eco, a) {
		const Rg = eco.registry;
		let sp = 0;
		let cls = -1;
		let label = 'animals';
		if (a.sp) {
			const h = Rg.get(a.sp | 0);
			if (!h || !(h.population > 0) || h.group !== 'animal') return { reason: 'host' };
			sp = h.id;
			label = h.name;
		} else if (a.cls !== undefined && a.cls !== null && a.cls !== '') {
			cls = a.cls | 0;
			if (cls < 0 || cls >= CLASS_PLURAL.length) return { reason: 'host' };
			label = CLASS_PLURAL[cls];
		}
		const all = !!a.all && (sp > 0 || cls >= 0);
		let s = null;
		if (!all) {
			const c = GodTools.clean(eco.world, a);
			if (!c.pts.length) return { reason: 'spot' };
			s = { x: c.pts[0], y: c.pts[1], r: Math.max(1, c.r) };
		}
		const A = eco.animals;
		const rr = s ? s.r * s.r + s.r : 0;
		const list = [];
		for (let k = 0; k < A.count; k++) {
			if (!A.alive[k]) continue;
			if (sp && A.sp[k] !== sp) continue;
			if (cls >= 0 && A.cls[k] !== cls) continue;
			if (s) {
				const dx = A.x[k] - s.x;
				const dy = A.y[k] - s.y;
				if (dx * dx + dy * dy > rr) continue;
			}
			list.push(k);
		}
		return { list, s, sp, cls, all, label };
	}

	_fx(eco, t, list) {
		if (t.s) return [t.s.x, t.s.y, t.s.r];
		const A = eco.animals;
		const out = [];
		const n = list.length;
		const step = n > GOD_FX_MAX ? n / GOD_FX_MAX : 1;
		for (let j = 0; j < GOD_FX_MAX && Math.floor(j * step) < n; j++) {
			const k = list[Math.floor(j * step)];
			out.push(Math.round(A.x[k] * 100) / 100, Math.round(A.y[k] * 100) / 100, 2);
		}
		return out;
	}

	_bless(eco, a) {
		const t = this._aim(eco, a);
		if (t.reason) return { ok: false, count: 0, reason: t.reason };
		const A = eco.animals;
		const D = eco.disease;
		const kind = a.kind;
		let hit = [];
		let ticks = 0;
		if (kind === 'feed') {
			for (const k of t.list) {
				const em = A.emax[k] * A.gf[k];
				const cap = em * FAT_MAX * A.app[k];
				const want = cap * GOD_FEED_FAT;
				let did = false;
				if (A.energy[k] < em) {
					A.energy[k] = em;
					did = true;
				}
				if (A.fat[k] < want) {
					A.fat[k] = want;
					did = true;
				}
				if (did) hit.push(k);
			}
		} else if (kind === 'heal') {
			for (const k of t.list) {
				let did = false;
				if (A.strain[k]) {
					if (D) D.recoverAnimal(k);
					else {
						A.strain[k] = 0;
						A.itime[k] = 0;
					}
					did = true;
				}
				if (A.fx[k] || A.confuse[k] || A.gl[k] > 0 || A.crv[k]) {
					A.fx[k] = 0;
					A.fxT[k] = 0;
					A.crv[k] = 0;
					A.confuse[k] = 0;
					A.gl[k] = 0;
					did = true;
				}
				if (did) hit.push(k);
			}
		} else if (kind === 'sterile') {
			ticks = Math.max(GOD_STER_MIN, Math.min(GOD_STER_MAX, Math.round(+a.ticks || 0)));
			if (t.list.length && !A.ster) A.ster = new Int32Array(A.cap);
			const until = eco.tick + ticks;
			for (const k of t.list) {
				if (A.ster[k] < until) A.ster[k] = until;
				hit.push(k);
			}
		} else {
			const frac = Math.max(0.05, Math.min(1, +a.frac || 0));
			const n = t.list.length;
			const k = n ? Math.max(1, Math.min(n, Math.round(frac * n))) : 0;
			const pick = t.list.slice();
			const rng = eco.rng;
			for (let j = 0; j < k; j++) {
				const q = j + Math.floor(rng.next() * (n - j));
				const v = pick[q];
				pick[q] = pick[j];
				pick[j] = v;
			}
			hit = pick.slice(0, k).sort((x, y) => x - y);
		}
		const c = hit.length;
		if (!c) return { ok: false, count: 0, reason: t.list.length ? 'none' : 'empty', fx: this._fx(eco, t, t.list) };
		const fx = this._fx(eco, t, hit);
		if (kind === 'cull') {
			for (const k of hit) A._kill(k, 1);
			A._compact();
			A.deaths.divine = (A.deaths.divine | 0) + c;
		}
		const key = kind === 'feed' ? 'fed' : kind === 'heal' ? 'healed' : kind === 'sterile' ? 'sterilised' : 'culled';
		this[key] = (this[key] | 0) + c;
		const label = t.label;
		const where = t.all ? ' everywhere' : ` in the ${this._where(eco, t.s.x, t.s.y)}`;
		const verb = kind === 'feed' ? 'fed' : kind === 'heal' ? 'healed' : kind === 'sterile' ? 'sterilised' : 'struck down';
		const tail = kind === 'sterile' ? ` for ${ticks} ticks` : '';
		this._log(eco, 0, () => `You ${verb} ${c} ${label}${where}${tail}`, c, t.sp || null);
		return { ok: true, count: c, kind, curse: kind === 'sterile' || kind === 'cull', fx, ticks };
	}

	_soil(eco, a) {
		const P = eco.plants;
		const n = P.n;
		let sp = null;
		if (a.sp) {
			sp = eco.registry.get(a.sp | 0);
			if (!sp || !(sp.population > 0) || sp.group !== 'plant') return { ok: false, count: 0, reason: 'host' };
		}
		const all = !!a.all && !!sp;
		let tiles;
		let fx = [];
		if (all) {
			tiles = [];
			for (let i = 0; i < n; i++) if (P.species[i] === sp.id || P.species[n + i] === sp.id) tiles.push(i);
		} else {
			const c = GodTools.clean(eco.world, a);
			if (!c.pts.length) return { ok: false, count: 0, reason: 'spot' };
			tiles = GodTools.tiles(eco.world, c.pts, c.r);
			const np = c.pts.length >> 1;
			const every = Math.max(1, Math.ceil(np / 6));
			for (let k = 0; k < np; k += every) fx.push(c.pts[k * 2], c.pts[k * 2 + 1], Math.max(1, c.r));
		}
		const fert = a.kind === 'fertilise';
		const soil = P.soil;
		const W = eco.world.width;
		const hit = [];
		for (const i of tiles) {
			if (P.water[i]) continue;
			let s0 = !!P.species[i];
			let s1 = !!P.species[n + i] && !P.kind[n + i];
			if (sp) {
				s0 = s0 && P.species[i] === sp.id;
				s1 = s1 && P.species[n + i] === sp.id;
				if (!s0 && !s1) continue;
			}
			if (fert) {
				if (!soil || soil.nutrient[i] >= SOIL_MAX) continue;
				const v = soil.nutrient[i] + GOD_FERT;
				soil.nutrient[i] = v < SOIL_MAX ? v : SOIL_MAX;
				hit.push(i);
			} else {
				if (!s0 && !s1) continue;
				if (s0) {
					P.biomass[i] *= GOD_BLIGHT;
					P.fruit[i] = 0;
				}
				if (s1) {
					P.biomass[n + i] *= GOD_BLIGHT;
					P.fruit[n + i] = 0;
				}
				hit.push(i);
			}
		}
		if (all) {
			const step = hit.length > GOD_FX_MAX ? hit.length / GOD_FX_MAX : 1;
			for (let j = 0; j < GOD_FX_MAX && Math.floor(j * step) < hit.length; j++) {
				const i = hit[Math.floor(j * step)];
				fx.push((i % W) + 0.5, Math.floor(i / W) + 0.5, 2);
			}
		}
		const c = hit.length;
		if (!c) return { ok: false, count: 0, reason: 'none', fx };
		P.version++;
		const key = fert ? 'fertilised' : 'blighted';
		this[key] = (this[key] | 0) + c;
		const name = sp ? sp.name : '';
		const text = fert ? (k) => `You fertilised ${k} tiles${name ? ` of ${name}` : ''}${all ? ' everywhere' : ''}` : (k) => `You withered ${k} tiles of ${name || 'plants'}${all ? ' everywhere' : ''}`;
		this._log(eco, all ? 0 : a.stroke | 0, text, c, sp ? sp.id : null);
		return { ok: true, count: c, kind: a.kind, curse: !fert, fx };
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
