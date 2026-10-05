const SimClient = (() => {
	const WORKER_URL = 'js/simWorker.js';
	const SIM_SCRIPT = /\/js\/(sim\/[^/?#]+|noise|biomes|mapGenerator|save)\.js([?#]|$)/;
	const START_TIMEOUT = 15000;

	const state = {
		mode: null,
		starting: null,
		worker: null,
		nextId: 1,
		pending: new Map(),
		gen: 0,
		view: null,
		gpu: false,
		fast: false,
		onFast: null,
	};

	function wantWorker() {
		try {
			if (new URLSearchParams(location.search).get('worker') === '0') return false;
		} catch (e) {}
		return typeof Worker === 'function';
	}

	function wantGpu() {
		try {
			if (new URLSearchParams(location.search).get('gpu') === '0') return false;
		} catch (e) {}
		return true;
	}

	function simScripts() {
		return [...document.scripts].map((s) => s.src).filter((src) => src && SIM_SCRIPT.test(src));
	}

	function layerClasses() {
		return {
			plants: typeof PlantLayer === 'function' ? PlantLayer : null,
			animals: typeof AnimalPool === 'function' ? AnimalPool : null,
			eggs: typeof EggPool === 'function' ? EggPool : null,
			bugs: typeof BugLayer === 'function' ? BugLayer : null,
			weather: typeof WeatherLayer === 'function' ? WeatherLayer : null,
			disease: typeof DiseaseLayer === 'function' ? DiseaseLayer : null,
			disasters: typeof DisasterLayer === 'function' ? DisasterLayer : null,
		};
	}

	function start() {
		if (state.starting) return state.starting;
		state.starting = new Promise((resolve) => {
			if (!wantWorker()) return resolve(useLocal());
			let worker;
			try {
				worker = new Worker(WORKER_URL);
			} catch (err) {
				console.warn('Sim worker unavailable, running on the main thread', err);
				return resolve(useLocal());
			}
			let settled = false;
			const fallback = (why) => {
				if (settled) return;
				settled = true;
				clearTimeout(timer);
				worker.terminate();
				console.warn('Sim worker failed to start, running on the main thread', why);
				resolve(useLocal());
			};
			const timer = setTimeout(() => fallback('timeout'), START_TIMEOUT);
			worker.onerror = (e) => {
				e.preventDefault();
				if (!settled) fallback(e.message || e);
				else console.error('Sim worker error', e.message || e);
			};
			worker.onmessage = (e) => {
				const m = e.data;
				if (!settled) {
					if (m.type === 'hello') {
						settled = true;
						clearTimeout(timer);
						state.worker = worker;
						state.mode = 'worker';
						state.gpu = !!m.gpu;
						worker.onmessage = (ev) => receive(ev.data);
						resolve('worker');
					} else if (m.type === 'error') fallback(m.message);
				}
			};
			worker.postMessage({ type: 'init', scripts: simScripts(), gpu: wantGpu() });
		});
		return state.starting;
	}

	function useLocal() {
		state.mode = 'local';
		return 'local';
	}

	function request(type, payload, transfer) {
		const id = state.nextId++;
		return new Promise((resolve, reject) => {
			state.pending.set(id, { resolve, reject });
			state.worker.postMessage(Object.assign({ type, id }, payload), transfer || []);
		});
	}

	function send(msg) {
		if (state.worker) state.worker.postMessage(msg);
	}

	function settle(id, ok, value) {
		const p = state.pending.get(id);
		if (!p) return false;
		state.pending.delete(id);
		if (ok) p.resolve(value);
		else p.reject(value);
		return true;
	}

	function receive(m) {
		if (m.type === 'ready') {
			state.gen = m.gen;
			state.view = buildView(m);
			return;
		}
		if (m.type === 'frame') {
			const v = state.view;
			if (!v || m.gen !== v.gen) return;
			v.waiting = false;
			if (m.stale) return;
			if (m.fast !== undefined) noteFast(m.fast);
			applyFrame(v, m);
			if (v.readyId) {
				const id = v.readyId;
				v.readyId = 0;
				settle(id, true, { world: v.eco.world, eco: v.eco, meta: v.meta });
			}
			return;
		}
		if (m.type === 'reply') {
			settle(m.id, true, m);
			return;
		}
		if (m.type === 'error') {
			const err = new Error(m.message);
			if (m.stack) err.stack = m.stack;
			if (m.id == null || !settle(m.id, false, err)) console.error('Sim worker error', err);
		}
	}

	function noteFast(on) {
		if (on === state.fast) return;
		state.fast = on;
		if (state.onFast) state.onFast(on);
	}

	async function setFast(on) {
		if (state.mode !== 'worker' || !state.gpu) return false;
		const r = await request('gpu', { on: !!on });
		noteFast(!!r.fast);
		return !!r.fast;
	}

	function setArray(obj, key, d) {
		if (d.full) {
			obj[key] = d.full;
			return;
		}
		let a = obj[key];
		if (!a) a = obj[key] = [];
		a.length = d.from;
		const t = d.tail;
		for (let i = 0; i < t.length; i++) a.push(t[i]);
	}

	function optionsProxy(initial) {
		return new Proxy(Object.assign({}, initial), {
			set(target, key, value) {
				target[key] = value;
				send({ type: 'option', key, value });
				return true;
			},
		});
	}

	function buildView(m) {
		const world = Object.assign(Object.create(WorldMap.prototype), m.world);
		const reg = Object.create(SpeciesRegistry.prototype);
		Object.assign(reg, { all: new Map(), living: new Set(), nextId: 1, tick: 0, recentlyExtinct: [], names: new Set(), speciations: {} });
		const log = Object.create(EventLog.prototype);
		Object.assign(log, { limit: 0, items: [], version: -1 });
		const eco = Object.create(Ecosystem.prototype);
		Object.assign(eco, { world, seed: m.seed, tick: 0, log, registry: reg, stats: {}, history: {}, options: optionsProxy(m.options) });
		const classes = layerClasses();
		for (const k of Object.keys(m.has)) {
			if (!m.has[k]) {
				eco[k] = null;
				continue;
			}
			const cls = classes[k];
			const L = Object.create(cls ? cls.prototype : Object.prototype);
			L.world = world;
			L.registry = reg;
			if (m.statics[k]) Object.assign(L, m.statics[k]);
			eco[k] = L;
		}
		if (eco.plants) eco.plants.soil = Object.create(typeof SoilLayer === 'function' ? SoilLayer.prototype : Object.prototype);
		if (eco.weather) eco.weather.storms = [];
		const v = {
			gen: m.gen,
			eco,
			meta: m.meta,
			readyId: m.id,
			waiting: false,
			running: null,
			speed: null,
			ms: 0,
			tickAt: performance.now(),
		};
		Object.assign(eco, {
			remote: true,
			sync(running, speed) {
				if (v !== state.view) return v.ms;
				if (running !== v.running || speed !== v.speed) {
					v.running = running;
					v.speed = speed;
					send({ type: 'run', running, speed });
				}
				if (!v.waiting) {
					v.waiting = true;
					send({ type: 'frame', gen: v.gen });
				}
				return v.ms;
			},
			step(n = 1) {
				send({ type: 'step', n });
			},
		});
		Object.defineProperty(eco, 'alpha', {
			get() {
				if (!v.running) return 1;
				return Math.max(0, Math.min(1, ((performance.now() - v.tickAt) * v.speed) / 1000));
			},
		});
		return v;
	}

	function applySpecies(reg, s) {
		const touched = [];
		for (const rec of s.list) {
			let sp = reg.all.get(rec.id);
			if (!sp) {
				sp = Object.create(Species.prototype);
				sp.children = [];
				sp.history = [];
				reg.all.set(rec.id, sp);
			}
			const { childIds, hist } = rec;
			delete rec.childIds;
			delete rec.hist;
			Object.assign(sp, rec);
			if (hist) setArray(sp, 'history', hist);
			if (!s.living && sp.population > 0) reg.living.add(sp.id);
			touched.push([sp, childIds]);
		}
		for (const [sp, ids] of touched) sp.children = ids.map((id) => reg.all.get(id)).filter(Boolean);
		if (s.living) reg.living = new Set(s.living);
		reg.nextId = s.nextId;
		reg.speciations = s.speciations;
	}

	function applyFrame(v, m) {
		const eco = v.eco;
		if (m.tick !== eco.tick) v.tickAt = performance.now();
		eco.tick = m.tick;
		eco.registry.tick = m.tick;
		v.ms = m.ms;
		for (const k of Object.keys(m.layers)) {
			const target = k === 'soil' ? eco.plants && eco.plants.soil : eco[k];
			if (target) Object.assign(target, m.layers[k]);
		}
		if (m.storms && eco.weather) eco.weather.storms = m.storms;
		if (m.world) Object.assign(eco.world, m.world);
		if (m.statics) for (const k of Object.keys(m.statics)) if (eco[k]) Object.assign(eco[k], m.statics[k]);
		if (m.worldVersion !== undefined) eco._godVersion = m.worldVersion;
		if (m.plantGenes && eco.plants) {
			const P = eco.plants;
			const slots = 2 * P.n;
			if (!P.genome || P.genome.length !== slots * PG) P.genome = new Float32Array(slots * PG);
			const G = P.genome;
			const genes = m.plantGenes.genes;
			const d = m.plantGenes.data;
			const w = genes.length;
			for (let p = 0; p < slots; p++) {
				const o = p * PG;
				for (let j = 0; j < w; j++) G[o + genes[j]] = d[p * w + j];
			}
		}
		if (m.species) applySpecies(eco.registry, m.species);
		if (m.stats) eco.stats = m.stats;
		if (m.history) for (const k of Object.keys(m.history)) setArray(eco.history, k, m.history[k]);
		if (m.log) {
			eco.log.items = m.log.items;
			eco.log.version = m.log.version;
		}
	}

	async function create(w, h, seed, options, worldOpts) {
		const mode = await start();
		if (mode === 'worker') return request('create', { w, h, seed, options, world: worldOpts || {} });
		const world = new WorldMap(w, h, seed, worldOpts || {});
		return { world, eco: new Ecosystem(world, seed, options) };
	}

	async function load(bytes) {
		const mode = await start();
		if (mode === 'worker') {
			const copy = bytes.slice();
			return request('load', { bytes: copy }, [copy.buffer]);
		}
		return EvoSave.decode(bytes, (w, h, seed, o) => new WorldMap(w, h, seed, o));
	}

	async function save(eco, meta) {
		if (eco && eco.remote) {
			const r = await request('save', { meta });
			return { name: r.name, bytes: r.bytes };
		}
		const name = EvoSave.fileName(eco);
		return { name, bytes: await EvoSave.encode(eco, meta) };
	}

	async function god(eco, action) {
		if (eco && eco.remote) {
			const r = await request('god', { action });
			return r.result;
		}
		return eco.applyGod(action);
	}

	async function stats(eco) {
		if (eco && eco.remote) {
			const r = await request('stats', {});
			return { tick: r.tick, json: r.json, idle: r.idle };
		}
		return { tick: eco.tick, json: JSON.stringify(eco.stats), idle: true };
	}

	return {
		create,
		load,
		save,
		god,
		stats,
		setFast,
		get mode() {
			return state.mode;
		},
		get gpu() {
			return state.mode === 'worker' && state.gpu;
		},
		get fast() {
			return state.fast;
		},
		set onFast(f) {
			state.onFast = f;
		},
	};
})();
