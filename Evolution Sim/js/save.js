const SAVE_VERSION = 2;
const SAVE_MAGIC = 0x534f5645;
const SAVE_ALIGN = 8;

const EvoSave = (() => {
	const classTable = () => {
		const t = {};
		const add = (name, C) => typeof C === 'function' && (t[name] = C);
		add('Ecosystem', typeof Ecosystem === 'function' && Ecosystem);
		add('FastRng', typeof FastRng === 'function' && FastRng);
		add('Species', typeof Species === 'function' && Species);
		add('SpeciesRegistry', typeof SpeciesRegistry === 'function' && SpeciesRegistry);
		add('EventLog', typeof EventLog === 'function' && EventLog);
		add('PlantLayer', typeof PlantLayer === 'function' && PlantLayer);
		add('AnimalPool', typeof AnimalPool === 'function' && AnimalPool);
		add('SoilLayer', typeof SoilLayer === 'function' && SoilLayer);
		add('BugLayer', typeof BugLayer === 'function' && BugLayer);
		add('DiseaseLayer', typeof DiseaseLayer === 'function' && DiseaseLayer);
		add('WeatherLayer', typeof WeatherLayer === 'function' && WeatherLayer);
		add('EggPool', typeof EggPool === 'function' && EggPool);
		add('DisasterLayer', typeof DisasterLayer === 'function' && DisasterLayer);
		add('GodTools', typeof GodTools === 'function' && GodTools);
		add('RiverLayer', typeof RiverLayer === 'function' && RiverLayer);
		add('CoastLayer', typeof CoastLayer === 'function' && CoastLayer);
		return t;
	};

	const DERIVED = {
		PlantLayer: ['water', 'depth', 'sal', 'habit', 'seasonAmp', 'tox', 'disp', 'shade', 'root', 'form', 'sflag'],
		SoilLayer: ['base', 'own', 'tile', 'row', 'decayK', 'slope', 'down'],
		WeatherLayer: ['_evapK', '_queue'],
		BugLayer: ['app', 'mob', 'rate'],
		RiverLayer: ['dn', 'up', 'fdx', 'fdy', 'flow', 'flood', 'still'],
		CoastLayer: ['tidal', 'isle', 'shore', 'coastal', 'seaward', 'beachNear', 'reefs'],
	};
	const SHUFFLE_MIN = 4096;

	const TYPED = ['Float32Array', 'Float64Array', 'Int8Array', 'Int16Array', 'Int32Array', 'Uint8Array', 'Uint8ClampedArray', 'Uint16Array', 'Uint32Array'];
	const tagOf = (o) => Object.prototype.toString.call(o).slice(8, -1);

	function encodeNumber(v) {
		if (Number.isFinite(v) && !Object.is(v, -0)) return v;
		return { $n: Object.is(v, -0) ? '-0' : String(v) };
	}

	function decodeNumber(s) {
		return s === '-0' ? -0 : Number(s);
	}

	function shuffle(src, width) {
		const m = src.length / width;
		const out = new Uint8Array(src.length);
		for (let k = 0; k < width; k++) {
			const o = k * m;
			for (let i = 0, j = k; i < m; i++, j += width) out[o + i] = src[j];
		}
		return out;
	}

	function unshuffle(src, width) {
		const m = src.length / width;
		const out = new Uint8Array(src.length);
		for (let k = 0; k < width; k++) {
			const o = k * m;
			for (let i = 0, j = k; i < m; i++, j += width) out[j] = src[o + i];
		}
		return out;
	}

	const shuffles = (o, path) => o.BYTES_PER_ELEMENT > 1 && o.length >= SHUFFLE_MIN && !/enome$/.test(path);

	function serialize(eco) {
		const classes = classTable();
		const nameOf = new Map(Object.entries(classes).map(([k, C]) => [C.prototype, k]));
		const world = eco.world;
		const worldArrays = new Map();
		for (const k of Object.keys(world)) if (ArrayBuffer.isView(world[k])) worldArrays.set(world[k], k);
		const ids = new Map();
		const queue = [];
		const records = [];
		const chunks = [];
		let bytes = 0;

		const ref = (o, path) => {
			if (o === world) return { $w: 1 };
			if (worldArrays.has(o)) return { $wa: worldArrays.get(o) };
			let id = ids.get(o);
			if (id === undefined) {
				id = queue.length;
				ids.set(o, id);
				queue.push([o, path]);
			}
			return { $r: id };
		};

		const enc = (v, path) => {
			switch (typeof v) {
				case 'number':
					return encodeNumber(v);
				case 'string':
				case 'boolean':
					return v;
				case 'undefined':
					return { $u: 1 };
				case 'object':
					return v === null ? null : ref(v, path);
				default:
					throw new Error(`Cannot save ${typeof v} at ${path}`);
			}
		};

		ref(eco, 'eco');
		for (let i = 0; i < queue.length; i++) {
			const [o, path] = queue[i];
			const tag = tagOf(o);
			if (ArrayBuffer.isView(o)) {
				if (!TYPED.includes(tag)) throw new Error(`Cannot save ${tag} at ${path}`);
				const pad = (SAVE_ALIGN - (bytes % SAVE_ALIGN)) % SAVE_ALIGN;
				if (pad) chunks.push(new Uint8Array(pad));
				bytes += pad;
				const raw = new Uint8Array(o.buffer, o.byteOffset, o.byteLength);
				if (shuffles(o, path)) {
					records.push({ t: tag, o: bytes, n: o.length, x: 1 });
					chunks.push(shuffle(raw, o.BYTES_PER_ELEMENT));
				} else {
					records.push({ t: tag, o: bytes, n: o.length });
					chunks.push(raw);
				}
				bytes += o.byteLength;
			} else if (Array.isArray(o)) {
				records.push({ a: o.map((v, k) => enc(v, path + '[' + k + ']')) });
			} else if (tag === 'Map') {
				const m = [];
				for (const [k, v] of o) m.push([enc(k, path + '.key'), enc(v, path + '[' + k + ']')]);
				records.push({ m });
			} else if (tag === 'Set') {
				const s = [];
				for (const v of o) s.push(enc(v, path + '{}'));
				records.push({ s });
			} else {
				const proto = Object.getPrototypeOf(o);
				let c;
				if (proto === null) c = null;
				else if (Object.getPrototypeOf(proto) === null && tag === 'Object') c = 'Object';
				else c = nameOf.get(proto);
				if (c === undefined) throw new Error(`Cannot save ${(o.constructor && o.constructor.name) || tag} at ${path}`);
				const f = {};
				const skip = c && DERIVED[c] && typeof o.restoreDerived === 'function' ? DERIVED[c] : null;
				for (const k of Object.keys(o)) if (!skip || !skip.includes(k)) f[k] = enc(o[k], path + '.' + k);
				records.push({ c, f });
			}
		}
		return { records, chunks, bytes };
	}

	function deserialize(records, bin, world) {
		const classes = classTable();
		const objs = new Array(records.length);
		for (let i = 0; i < records.length; i++) {
			const r = records[i];
			if (r.t !== undefined) {
				const C = globalThis[r.t];
				if (!TYPED.includes(r.t) || typeof C !== 'function') throw new Error('Unknown array type ' + r.t);
				const len = r.n * C.BYTES_PER_ELEMENT;
				if (r.o + len > bin.byteLength) throw new Error('Save file is truncated');
				const part = bin.subarray(r.o, r.o + len);
				objs[i] = new C(r.x ? unshuffle(part, C.BYTES_PER_ELEMENT).buffer : bin.buffer.slice(bin.byteOffset + r.o, bin.byteOffset + r.o + len));
			} else if (r.a) objs[i] = new Array(r.a.length);
			else if (r.m) objs[i] = new Map();
			else if (r.s) objs[i] = new Set();
			else if (r.c === null) objs[i] = Object.create(null);
			else if (r.c === 'Object') objs[i] = {};
			else if (classes[r.c]) objs[i] = Object.create(classes[r.c].prototype);
			else throw new Error('Unknown class ' + r.c);
		}
		const dec = (v) => {
			if (v === null || typeof v !== 'object') return v;
			if (v.$r !== undefined) {
				const o = objs[v.$r];
				if (o === undefined) throw new Error('Bad reference ' + v.$r);
				return o;
			}
			if (v.$n !== undefined) return decodeNumber(v.$n);
			if (v.$u) return undefined;
			if (v.$w) return world;
			if (v.$wa !== undefined) {
				if (!ArrayBuffer.isView(world[v.$wa])) throw new Error('Unknown world layer ' + v.$wa);
				return world[v.$wa];
			}
			throw new Error('Bad value in save file');
		};
		for (let i = 0; i < records.length; i++) {
			const r = records[i];
			const o = objs[i];
			if (r.a) for (let k = 0; k < r.a.length; k++) o[k] = dec(r.a[k]);
			else if (r.m) for (const [k, v] of r.m) o.set(dec(k), dec(v));
			else if (r.s) for (const v of r.s) o.add(dec(v));
			else if (r.f) for (const k of Object.keys(r.f)) o[k] = dec(r.f[k]);
		}
		for (let i = 0; i < records.length; i++) {
			const r = records[i];
			const d = r.c && DERIVED[r.c];
			if (d && d.some((k) => !(k in r.f)) && typeof objs[i].restoreDerived === 'function') objs[i].restoreDerived(world);
		}
		return objs[0];
	}

	async function pipe(bytes, stream) {
		const out = await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer();
		return new Uint8Array(out);
	}

	async function encode(eco, meta = {}, flags = {}) {
		const { records, chunks, bytes } = serialize(eco);
		const header = {
			version: SAVE_VERSION,
			seed: eco.seed,
			w: eco.world.width,
			h: eco.world.height,
			worldGen: eco.world.gen || 2,
			secret: (eco.world.options && eco.world.options.secret) || undefined,
			cfg: eco.world.options && eco.world.options.cfg ? worldCfgOf(eco.world.options.cfg) : undefined,
			tick: eco.tick,
			meta,
			records,
			bin: bytes,
		};
		if (flags.fast) header.fast = true;
		if (eco.god && eco.god.edits && eco.god.edits.length) header.god = eco.god.edits;
		const json = new TextEncoder().encode(JSON.stringify(header));
		const head = new Uint8Array(8);
		const dv = new DataView(head.buffer);
		dv.setUint32(0, SAVE_MAGIC);
		dv.setUint32(4, json.length);
		const pad = (SAVE_ALIGN - ((8 + json.length) % SAVE_ALIGN)) % SAVE_ALIGN;
		const parts = [head, json, new Uint8Array(pad), ...chunks];
		const raw = new Uint8Array(8 + json.length + pad + bytes);
		let at = 0;
		for (const p of parts) {
			raw.set(p, at);
			at += p.length;
		}
		if (typeof CompressionStream !== 'function') return raw;
		try {
			return await pipe(raw, new CompressionStream('gzip'));
		} catch (e) {
			return raw;
		}
	}

	async function readHeader(gz) {
		let raw;
		if (gz.length >= 4 && new DataView(gz.buffer, gz.byteOffset, gz.byteLength).getUint32(0) === SAVE_MAGIC) raw = gz;
		else {
			if (typeof DecompressionStream !== 'function') throw new Error('This browser cannot read compressed save files');
			try {
				raw = await pipe(gz, new DecompressionStream('gzip'));
			} catch (e) {
				throw new Error('Not a save file (could not decompress)');
			}
		}
		if (raw.length < 8) throw new Error('Save file is empty');
		const dv = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
		if (dv.getUint32(0) !== SAVE_MAGIC) throw new Error('Not an Evolution Sim save file');
		const len = dv.getUint32(4);
		if (8 + len > raw.length) throw new Error('Save file is truncated');
		let header;
		try {
			header = JSON.parse(new TextDecoder().decode(raw.subarray(8, 8 + len)));
		} catch (e) {
			throw new Error('Save file header is corrupt');
		}
		if (header.version !== SAVE_VERSION) throw new Error(`Save version ${header.version} is not supported (expected ${SAVE_VERSION})`);
		const start = 8 + len + ((SAVE_ALIGN - ((8 + len) % SAVE_ALIGN)) % SAVE_ALIGN);
		const bin = raw.subarray(start);
		if (bin.length < header.bin) throw new Error('Save file is truncated');
		return { header, bin };
	}

	function upgradeLineage(eco) {
		const A = eco.animals;
		if (A && A.cap && (!A.lin || A.lin.length < A.cap)) A.lin = new Int32Array(A.cap);
		const E = eco.eggs;
		if (E && E.cap && (!E.lin || E.lin.length < E.cap)) E.lin = new Uint8Array(E.cap);
	}

	function upgrade(eco) {
		upgradeLineage(eco);
		if (typeof PG !== 'number') return;
		const grow = (o, k) => {
			if (o && o[k] && o[k].length < PG) o[k] = new Float32Array(PG);
		};
		grow(eco.animals, 'seedGenome');
		grow(eco.disasters, '_scratch');
		if (eco.plants && typeof eco.plants.upgradeGenes === 'function') eco.plants.upgradeGenes();
		if (eco.plants && !eco.plants.bugs && eco.bugs) eco.plants.bugs = eco.bugs;
		if (eco.weather && typeof eco.weather.upgrade === 'function') eco.weather.upgrade();
		if (typeof padAnimalGenes === 'function') upgradeAnimals(eco);
		if (!eco.rivers && typeof RiverLayer === 'function') eco.rivers = new RiverLayer(eco.world, new FastRng(eco.seed + 1212));
		if (eco.animals && eco.rivers) eco.animals.rivers = eco.rivers;
		if (!eco.coast && typeof CoastLayer === 'function') eco.coast = new CoastLayer(eco.world, new FastRng(eco.seed + 1414));
		if (eco.animals && eco.coast) eco.animals.coast = eco.coast;
	}

	function upgradeAnimals(eco) {
		const A = eco.animals;
		if (A && A.genome && A.cap) A.genome = padAnimalGenes(A.genome, A.cap);
		if (A && A.childGenome && A.childGenome.length < AG) A.childGenome = new Float32Array(AG);
		if (A && A.cap && typeof ANIMAL_FIELDS_F !== 'undefined') {
			for (const f of ANIMAL_FIELDS_F) if (!A[f] || A[f].length < A.cap) A[f] = new Float32Array(A.cap);
			for (const f of ANIMAL_FIELDS_I) if (!A[f] || A[f].length < A.cap) A[f] = new Int32Array(A.cap);
		}
		if (A && !A.toxfx && typeof toxFxStats === 'function') A.toxfx = toxFxStats();
		if (A && !A.sleep && typeof sleepStats === 'function') A.sleep = sleepStats();
		const E = eco.eggs;
		if (E && E.genome && E.cap) E.genome = padAnimalGenes(E.genome, E.cap);
		if (!eco.registry || !eco.registry.all) return;
		for (const sp of eco.registry.all.values()) {
			if (sp.group !== 'animal') continue;
			if (sp.mean && sp.mean.length < AG) sp.mean = padAnimalGenes(sp.mean, 1);
			if (sp.genome && sp.genome.length < AG) sp.genome = padAnimalGenes(sp.genome, 1);
		}
	}

	async function decode(gz, makeWorld) {
		const { header, bin } = await readHeader(gz);
		const wopts = { gen: header.worldGen || 2 };
		if (header.secret) wopts.secret = header.secret;
		if (header.cfg && typeof header.cfg === 'object') wopts.cfg = worldCfgOf(header.cfg);
		const world = makeWorld(header.w, header.h, header.seed, wopts);
		if (Array.isArray(header.god) && header.god.length) {
			if (typeof GodTools !== 'function') throw new Error('Save file needs the god tools');
			for (const e of header.god) GodTools.paintWorld(world, e);
		}
		const eco = deserialize(header.records, bin, world);
		if (!eco || eco.world !== world || eco.tick !== header.tick) throw new Error('Save file contents are inconsistent');
		upgrade(eco);
		return { eco, world, meta: header.meta || {}, fast: !!header.fast };
	}

	function fileName(eco) {
		const year = Math.floor(eco.tick / YEAR_TICKS) + 1;
		return `evosim-${eco.seed}-y${year}.evo`;
	}

	return { encode, decode, fileName, serialize };
})();
