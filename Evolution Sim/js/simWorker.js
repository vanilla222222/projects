const DEFAULT_SCRIPTS = ['noise.js', 'biomes.js', 'mapGenerator.js', 'sim/core.js', 'sim/soil.js', 'sim/plants.js', 'sim/animals.js', 'sim/bugs.js', 'sim/disease.js', 'sim/weather.js', 'sim/eggs.js', 'sim/disasters.js', 'sim/ecosystem.js', 'save.js'];
const SNAP_LAYERS = ['plants', 'animals', 'eggs', 'bugs', 'weather', 'disease', 'disasters'];
const SNAP_POOLS = ['animals', 'eggs'];
const SNAP_GRIDS = {
	plants: ['species', 'biomass', 'cap', 'age', 'life', 'health', 'blight', 'kind', 'fruit', 'poll', 'pheno'],
	soil: ['nutrient', 'litter'],
	bugs: ['species', 'density', 'total', 'dorm'],
	weather: ['wet', 'snow', 'fresh', 'waterDist'],
	animals: ['terrSp', 'terrUid', 'terrUntil'],
	disasters: ['fire', 'flood', 'scar', 'scarK', 'risk'],
	disease: ['vectorLoad'],
};
const SNAP_VOLATILE = new Set(['plants.species', 'plants.biomass', 'plants.cap', 'plants.age', 'plants.life', 'plants.health', 'plants.kind', 'plants.fruit', 'plants.poll', 'soil.nutrient', 'soil.litter', 'bugs.species', 'bugs.density', 'bugs.total', 'weather.wet', 'weather.fresh']);
const SNAP_STATIC = { plants: ['water', 'depth'] };
const SNAP_PLANT_GENES = [8, 10, 11];
const FIELD_MS = 180;
const GENE_MS = 1000;
const SLOW_MS = 240;
const GRID_HOT = 3;
const GRID_RETRY = 24;
const SLICE_MS = 12;
const MAX_SPEED = 600;
const GPU_SCRIPTS = ['gpu/plantKernels.js', 'gpu/plantGpu.js'];

const sim = {
	eco: null,
	gen: 0,
	running: false,
	speed: 15,
	acc: 0,
	queue: 0,
	last: 0,
	msPerTick: 0,
	scheduled: false,
	sent: null,
	gpu: false,
	fast: false,
	attaching: 0,
	waiting: false,
	saving: false,
};

const wake = new MessageChannel();
wake.port1.onmessage = () => loop();

function schedule(delay) {
	if (sim.scheduled) return;
	sim.scheduled = true;
	if (delay) setTimeout(() => loop(), delay);
	else wake.port2.postMessage(0);
}

function gpuHold(eco) {
	if (sim.saving) return true;
	if (!sim.gpu || !PlantGpu.busy(eco.plants)) return false;
	if (!sim.waiting) {
		sim.waiting = true;
		PlantGpu.whenIdle(eco.plants).then(() => {
			sim.waiting = false;
			schedule(0);
		});
	}
	return true;
}

function fastOn() {
	if (sim.fast && !sim.attaching && sim.eco && !PlantGpu.active(sim.eco.plants)) sim.fast = false;
	return sim.fast;
}

function loop() {
	sim.scheduled = false;
	const eco = sim.eco;
	if (!eco) return;
	let held = false;
	const now = performance.now();
	const dt = Math.min(0.1, (now - sim.last) / 1000);
	sim.last = now;
	const max = sim.running && sim.speed >= MAX_SPEED;
	if (sim.running && !max) {
		sim.acc += dt * sim.speed;
		if (sim.acc > 2 + sim.speed * 0.05) sim.acc = 1;
	}
	let steps = 0;
	try {
		while (performance.now() - now < SLICE_MS) {
			if (gpuHold(eco)) {
				held = true;
				break;
			}
			if (sim.queue > 0) sim.queue--;
			else if (max) {}
			else if (sim.running && sim.acc >= 1) sim.acc -= 1;
			else break;
			eco.step();
			steps++;
		}
	} catch (err) {
		sim.running = false;
		sim.queue = 0;
		fail(null, err);
		return;
	}
	if (steps) {
		const per = (performance.now() - now) / steps;
		sim.msPerTick += (per - sim.msPerTick) * 0.1;
	}
	if (held) return;
	if (sim.queue > 0 || max || (sim.running && sim.acc >= 1)) schedule(0);
	else if (sim.running) schedule(Math.max(1, Math.min(50, ((1 - sim.acc) / sim.speed) * 1000)));
}

function freshSent() {
	return { frameTick: -1, fieldTick: -1, fieldAt: 0, geneTick: -1, geneAt: 0, slowTick: -1, slowAt: 0, logVersion: -1, nextId: 1, living: new Set(), species: new Map(), history: new Map(), grids: new Map() };
}

function copyOf(a, n, transfer) {
	const out = n === undefined ? a.slice() : a.slice(0, n);
	transfer.push(out.buffer);
	return out;
}

function scalars(o) {
	const out = {};
	for (const k of Object.keys(o)) {
		const v = o[k];
		const t = typeof v;
		if (t === 'number' || t === 'boolean' || t === 'string' || v === null) out[k] = v;
	}
	return out;
}

function poolArrays(pool, out, transfer) {
	const cap = pool.cap;
	const n = pool.count;
	for (const k of Object.keys(pool)) {
		const v = pool[k];
		if (!ArrayBuffer.isView(v) || !cap || v.length % cap) continue;
		const per = v.length / cap;
		if (per > 64) continue;
		out[k] = copyOf(v, n * per, transfer);
	}
}

function gridArrays(o, keys, out, transfer) {
	for (const k of keys) if (o && ArrayBuffer.isView(o[k])) out[k] = copyOf(o[k], undefined, transfer);
}

function wordsOf(a) {
	return a.byteLength % 4 === 0 ? new Int32Array(a.buffer, a.byteOffset, a.byteLength >> 2) : new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
}

function sameWords(a, b) {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
	return true;
}

function gridChanged(id, a, force) {
	const grids = sim.sent.grids;
	let e = grids.get(id);
	if (!e) {
		e = { ref: null, shadow: null, words: null, hot: 0, wait: 0 };
		grids.set(id, e);
	}
	const same = e.ref === a;
	if (!force && same && e.words && sameWords(e.words, wordsOf(a))) {
		e.hot = 0;
		return false;
	}
	const tracked = same && e.words !== null;
	e.ref = a;
	e.hot = tracked ? e.hot + 1 : 0;
	if (e.hot >= GRID_HOT) {
		e.shadow = null;
		e.words = null;
		e.hot = 0;
		e.wait = GRID_RETRY;
	} else if (e.wait > 0) e.wait--;
	else {
		if (!e.shadow || e.shadow.length !== a.length || e.shadow.constructor !== a.constructor) {
			e.shadow = a.slice();
			e.words = wordsOf(e.shadow);
		} else e.shadow.set(a);
	}
	return true;
}

function changedGrids(name, o, keys, out, transfer, force) {
	for (const k of keys) {
		const a = o && o[k];
		if (!ArrayBuffer.isView(a)) continue;
		const id = name + '.' + k;
		if (SNAP_VOLATILE.has(id) || gridChanged(id, a, force)) out[k] = copyOf(a, undefined, transfer);
	}
}

function arrayDelta(key, arr, out) {
	const prev = sim.sent.history.get(key);
	sim.sent.history.set(key, { ref: arr, len: arr.length });
	if (prev && prev.ref === arr && arr.length >= prev.len) {
		if (arr.length === prev.len) return null;
		return { from: prev.len, tail: arr.slice(prev.len) };
	}
	return { full: arr.slice() };
}

function speciesRecord(sp) {
	const rec = {};
	for (const k of Object.keys(sp)) {
		if (k[0] === '_' || k === 'children' || k === 'history') continue;
		rec[k] = sp[k];
	}
	rec.childIds = sp.children.map((c) => c.id);
	const h = arrayDelta('sp' + sp.id, sp.history);
	if (h) rec.hist = h;
	return rec;
}

function speciesDelta(full) {
	const reg = sim.eco.registry;
	const sent = sim.sent;
	const ids = new Set();
	for (let id = sent.nextId; id < reg.nextId; id++) {
		const sp = reg.get(id);
		if (!sp) continue;
		ids.add(id);
		if (sp.parentId) ids.add(sp.parentId);
	}
	if (full) {
		for (const id of reg.living) ids.add(id);
		for (const id of sent.living) ids.add(id);
		sent.living = new Set(reg.living);
	}
	sent.nextId = reg.nextId;
	const list = [];
	for (const id of ids) {
		const sp = reg.get(id);
		if (sp) list.push(speciesRecord(sp));
	}
	return { list, nextId: reg.nextId, living: full ? [...reg.living] : null, speciations: reg.speciations };
}

function historyDelta() {
	const h = sim.eco.history;
	const out = {};
	for (const k of Object.keys(h)) {
		const d = arrayDelta('eco.' + k, h[k]);
		if (d) out[k] = d;
	}
	return out;
}

function frameSnapshot(force) {
	const eco = sim.eco;
	const sent = sim.sent;
	const now = performance.now();
	const transfer = [];
	const msg = { type: 'frame', gen: sim.gen, tick: eco.tick, ms: sim.msPerTick, running: sim.running, fast: fastOn(), layers: {} };
	const tickMoved = eco.tick !== sent.frameTick;
	const slow = force || (eco.tick !== sent.slowTick && now - sent.slowAt > SLOW_MS);
	if (tickMoved || force) {
		sent.frameTick = eco.tick;
		for (const k of SNAP_LAYERS) {
			const L = eco[k];
			if (!L) continue;
			const out = scalars(L);
			if (SNAP_POOLS.includes(k)) poolArrays(L, out, transfer);
			msg.layers[k] = out;
		}
		if (eco.plants.soil) msg.layers.soil = scalars(eco.plants.soil);
		if (eco.weather) msg.storms = eco.weather.storms.map((s) => Object.assign({}, s));
		if (!slow) msg.species = speciesDelta(false);
	}
	if (force || (eco.tick !== sent.fieldTick && now - sent.fieldAt > FIELD_MS)) {
		sent.fieldTick = eco.tick;
		sent.fieldAt = now;
		const L = msg.layers;
		for (const k of Object.keys(SNAP_GRIDS)) {
			const src = k === 'soil' ? eco.plants.soil : eco[k];
			if (!src) continue;
			L[k] = L[k] || {};
			changedGrids(k, src, SNAP_GRIDS[k], L[k], transfer, force);
		}
	}
	if (force || (eco.tick !== sent.geneTick && now - sent.geneAt > GENE_MS)) {
		sent.geneTick = eco.tick;
		sent.geneAt = now;
		const P = eco.plants;
		const slots = 2 * P.n;
		const m = SNAP_PLANT_GENES.length;
		const g = new Float32Array(slots * m);
		const G = P.genome;
		for (let p = 0; p < slots; p++) {
			const o = p * PG;
			for (let j = 0; j < m; j++) g[p * m + j] = G[o + SNAP_PLANT_GENES[j]];
		}
		transfer.push(g.buffer);
		msg.plantGenes = { genes: SNAP_PLANT_GENES, data: g };
	}
	if (slow) {
		sent.slowTick = eco.tick;
		sent.slowAt = now;
		msg.species = speciesDelta(true);
		msg.stats = eco.stats;
		msg.history = historyDelta();
	}
	if (eco.log.version !== sent.logVersion) {
		sent.logVersion = eco.log.version;
		msg.log = { items: eco.log.items, version: eco.log.version };
	}
	post(msg, transfer);
}

function worldInit(world, transfer) {
	const out = {};
	for (const k of Object.keys(world)) {
		const v = world[k];
		if (ArrayBuffer.isView(v)) out[k] = copyOf(v, undefined, transfer);
		else if (v === null || typeof v !== 'object') out[k] = v;
	}
	out.options = Object.assign({}, world.options);
	return out;
}

function install(eco, id, meta) {
	if (sim.gpu && sim.eco) PlantGpu.drop(sim.eco.plants);
	sim.eco = eco;
	sim.waiting = false;
	if (sim.fast) attachGpu(eco);
	sim.gen++;
	sim.sent = freshSent();
	sim.acc = 0;
	sim.queue = 0;
	sim.msPerTick = 0;
	sim.last = performance.now();
	const transfer = [];
	const statics = {};
	for (const k of Object.keys(SNAP_STATIC)) {
		statics[k] = {};
		gridArrays(eco[k], SNAP_STATIC[k], statics[k], transfer);
	}
	const has = {};
	for (const k of SNAP_LAYERS) has[k] = !!eco[k];
	post({ type: 'ready', id, gen: sim.gen, seed: eco.seed, options: Object.assign({}, eco.options), world: worldInit(eco.world, transfer), statics, has, meta: meta || null }, transfer);
	frameSnapshot(true);
	schedule(0);
}

function post(msg, transfer) {
	self.postMessage(msg, transfer || []);
}

function fail(id, err) {
	post({ type: 'error', id, message: (err && err.message) || String(err), stack: err && err.stack });
}

async function attachGpu(eco) {
	sim.attaching++;
	let ok = false;
	try {
		ok = await PlantGpu.attach(eco.plants);
	} finally {
		sim.attaching--;
	}
	if (!ok && sim.eco === eco) sim.fast = false;
	if (ok && sim.eco !== eco) PlantGpu.drop(eco.plants);
	return ok;
}

const handlers = {
	init(m) {
		importScripts(...(m.scripts && m.scripts.length ? m.scripts : DEFAULT_SCRIPTS));
		if (m.gpu && self.navigator && self.navigator.gpu) {
			try {
				importScripts(...GPU_SCRIPTS);
				sim.gpu = true;
			} catch (err) {
				console.warn('Fast mode unavailable, GPU scripts failed to load', err);
			}
		}
		post({ type: 'hello', gpu: sim.gpu });
	},
	create(m) {
		const world = new WorldMap(m.w, m.h, m.seed);
		install(new Ecosystem(world, m.seed, m.options), m.id);
	},
	async load(m) {
		const { eco, meta } = await EvoSave.decode(m.bytes, (w, h, seed, o) => new WorldMap(w, h, seed, o));
		install(eco, m.id, meta);
	},
	async save(m) {
		if (!sim.eco) throw new Error('No world to save');
		const eco = sim.eco;
		sim.saving = true;
		try {
			const fast = fastOn() && (await PlantGpu.sync(eco.plants));
			const name = EvoSave.fileName(eco);
			const bytes = await EvoSave.encode(eco, m.meta || {}, fast ? { fast: true } : undefined);
			post({ type: 'reply', id: m.id, name, bytes }, [bytes.buffer]);
		} finally {
			sim.saving = false;
			schedule(0);
		}
	},
	async gpu(m) {
		const on = !!m.on && sim.gpu;
		sim.fast = on;
		const eco = sim.eco;
		if (eco && on) await attachGpu(eco);
		else if (eco && sim.gpu) await PlantGpu.detach(eco.plants);
		schedule(0);
		post({ type: 'reply', id: m.id, fast: fastOn() });
	},
	run(m) {
		if (m.running && !sim.running) {
			sim.last = performance.now();
			sim.acc = 0;
		}
		sim.running = !!m.running;
		sim.speed = m.speed;
		schedule(0);
	},
	step(m) {
		sim.queue += Math.max(1, m.n | 0);
		schedule(0);
	},
	option(m) {
		if (sim.eco) sim.eco.options[m.key] = m.value;
	},
	frame(m) {
		if (!sim.eco || m.gen !== sim.gen) return post({ type: 'frame', gen: m.gen, stale: true });
		frameSnapshot(false);
	},
	stats(m) {
		const eco = sim.eco;
		post({ type: 'reply', id: m.id, tick: eco ? eco.tick : -1, json: eco ? JSON.stringify(eco.stats) : null, idle: sim.queue === 0 });
	},
};

self.onmessage = async (e) => {
	const m = e.data;
	const h = handlers[m.type];
	if (!h) return fail(m.id, new Error('Unknown command ' + m.type));
	try {
		await h(m);
	} catch (err) {
		fail(m.id, err);
	}
};

