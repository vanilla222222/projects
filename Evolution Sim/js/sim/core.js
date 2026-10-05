class FastRng {
	constructor(seed) {
		this.s = new Int32Array(1);
		this.s[0] = (seed * 2654435761) ^ 0x5bd1e995 || 1;
		for (let i = 0; i < 8; i++) this.next();
	}
	next() {
		const s = this.s;
		let x = s[0];
		x ^= x << 13;
		x ^= x >>> 17;
		x ^= x << 5;
		s[0] = x;
		return (x >>> 0) * 2.3283064365386963e-10;
	}
}

function clamp01(v) {
	return v < 0 ? 0 : v > 1 ? 1 : v;
}

function dist2d(x, y) {
	return Math.sqrt(x * x + y * y);
}

function gaussFit(value, pref, tol) {
	const d = (value - pref) / tol;
	return Math.exp(-d * d);
}

function gaussRand(rng) {
	return (rng.next() + rng.next() + rng.next() + rng.next() - 2) * 1.732;
}

function mutateGenes(src, srcOff, dst, dstOff, n, rng, rate, sd) {
	for (let i = 0; i < n; i++) dst[dstOff + i] = src[srcOff + i];
	if (!(rate > 0)) return;
	if (rate >= 1) {
		for (let i = 0; i < n; i++) dst[dstOff + i] = clamp01(dst[dstOff + i] + gaussRand(rng) * sd);
		return;
	}
	const lq = 1 / Math.log(1 - rate);
	for (let i = Math.floor(Math.log(1 - rng.next()) * lq); i < n; i += 1 + Math.floor(Math.log(1 - rng.next()) * lq)) dst[dstOff + i] = clamp01(dst[dstOff + i] + gaussRand(rng) * sd);
}

function geneDistance(a, aOff, b, bOff, weights) {
	let sum = 0;
	let wsum = 0;
	for (let i = 0; i < weights.length; i++) {
		const d = a[aOff + i] - b[bOff + i];
		sum += d * d * weights[i];
		wsum += weights[i];
	}
	return Math.sqrt(sum / wsum);
}

function hslToHex(h, s, l) {
	h = ((h % 360) + 360) % 360;
	s = clamp01(s);
	l = clamp01(l);
	const k = (n) => (n + h / 30) % 12;
	const a = s * Math.min(l, 1 - l);
	const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
	const to = (x) => Math.round(x * 255).toString(16).padStart(2, '0');
	return '#' + to(f(0)) + to(f(8)) + to(f(4));
}

function hexToRgb(hex) {
	const v = parseInt(hex.slice(1), 16);
	return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function shadeHsl(hsl, dl, ds = 0) {
	return hslToHex(hsl[0], hsl[1] + ds, hsl[2] + dl);
}

const NAME_PARTS = {
	plant: {
		a: ['Flor', 'Vir', 'Sylv', 'Ther', 'Xer', 'Hydr', 'Cry', 'Umbr', 'Chlor', 'Ver', 'Lum', 'Petr', 'Nem', 'Aur', 'Phyt', 'Glauc', 'Myr', 'Cal', 'Fil', 'Ros'],
		b: ['a', 'i', 'o', 'e', 'u'],
		c: ['anthus', 'folia', 'radix', 'phyllum', 'carpa', 'stemma', 'thallus', 'spora', 'gramma', 'dendron', 'cladus', 'bella'],
	},
	animal: {
		a: ['Grac', 'Brev', 'Long', 'Cursor', 'Velo', 'Ferr', 'Tard', 'Rufi', 'Lani', 'Mega', 'Micr', 'Dent', 'Ungu', 'Noct', 'Umbr', 'Arg', 'Cer', 'Stenn', 'Plac', 'Atr'],
		b: ['o', 'i', 'a', 'e'],
		c: ['therium', 'odon', 'pus', 'ceros', 'lagus', 'cyon', 'felis', 'raptor', 'gnathus', 'lestes', 'mys', 'bos', 'dorcas', 'sorex'],
	},
	fish: {
		a: ['Pisc', 'Branch', 'Squam', 'Pelag', 'Coral', 'Abyss', 'Naut', 'Und', 'Lacustr', 'Argent', 'Squal', 'Serr', 'Glauc', 'Thalass', 'Rhin'],
		b: ['i', 'o', 'a'],
		c: ['ichthys', 'pterus', 'donta', 'soma', 'lepis', 'branchus', 'nectes', 'selachus', 'rhynchus'],
	},
	pathogen: {
		a: ['Morb', 'Pest', 'Febr', 'Lu', 'Tab', 'Sept', 'Scab', 'Strept', 'Plasm', 'Rub', 'Varr', 'Cont', 'Putr', 'Rhabd', 'Clostr'],
		b: ['o', 'i', 'a', 'u'],
		c: ['virus', 'coccus', 'bacter', 'phage', 'myces', 'spora', 'plasma', 'vibrio', 'phthora', 'monas'],
	},
};

class Species {
	constructor(id, opts) {
		this.id = id;
		this.group = opts.group;
		this.domain = opts.domain;
		this.parentId = opts.parentId || null;
		this.createdTick = opts.tick || 0;
		this.generation = opts.generation || 0;
		this.origin = opts.origin || null;
		this.genome = Float32Array.from(opts.genome);
		this.mean = Float32Array.from(opts.genome);
		this.hsl = opts.hsl;
		this.color = hslToHex(...opts.hsl);
		this.name = opts.name;
		this.population = 0;
		this.peak = 0;
		this.extinctTick = null;
		this.children = [];
		this.history = [];
		this.historyStep = 1;
		this.category = null;
		this.icon = null;
		this.rgb = null;
		this._refreshPalette();
	}

	_refreshPalette() {
		const [h, s, l] = this.hsl;
		this.rgb = hexToRgb(this.color).map((c) => c / 255);
		this.rgbDark = hexToRgb(hslToHex(h, s * 0.9, Math.max(0.1, l - 0.28))).map((c) => c / 255);
		this.rgbLight = hexToRgb(hslToHex(h, s * 0.6, Math.min(0.94, l + 0.3))).map((c) => c / 255);
		this.colorDark = hslToHex(h, s * 0.9, Math.max(0.1, l - 0.28));
		this.colorLight = hslToHex(h, s * 0.6, Math.min(0.94, l + 0.3));
	}

	pushHistory(tick, value) {
		if (tick % this.historyStep !== 0) return;
		this.history.push(tick, value);
		if (this.history.length >= 1200) {
			const next = [];
			for (let i = 0; i < this.history.length; i += 4) next.push(this.history[i], this.history[i + 1]);
			this.history = next;
			this.historyStep *= 2;
		}
	}
}

const SPLIT_MIN_AGE = 480;

class SpeciesRegistry {
	constructor(rng) {
		this.rng = rng;
		this.all = new Map();
		this.living = new Set();
		this.nextId = 1;
		this.tick = 0;
		this.recentlyExtinct = [];
		this.names = new Set();
		this.speciations = { plant: 0, animal: 0, bug: 0, pathogen: 0 };
	}

	_name(pool) {
		const p = NAME_PARTS[pool];
		const r = this.rng;
		const pick = (arr) => arr[Math.floor(r.next() * arr.length)];
		let name;
		for (let tries = 0; tries < 8; tries++) {
			name = pick(p.a) + pick(p.b) + pick(p.c);
			if (!this.names.has(name)) break;
		}
		if (this.names.has(name)) name += ' ' + (this.nextId + 1);
		this.names.add(name);
		return name;
	}

	create(opts, hsl) {
		const id = this.nextId++;
		const pool = opts.group === 'pathogen' ? 'pathogen' : opts.group === 'plant' ? 'plant' : opts.domain === 'water' ? 'fish' : 'animal';
		const sp = new Species(id, { ...opts, hsl, name: this._name(pool) });
		this.all.set(id, sp);
		if (sp.parentId) {
			this.all.get(sp.parentId).children.push(sp);
			if (!sp.origin) this.speciations[sp.group]++;
		}
		return sp;
	}

	canSplit(parent, minPop) {
		return parent.population >= minPop && this.tick - parent.createdTick >= SPLIT_MIN_AGE;
	}

	matchDaughter(parent, genome, weights, threshold) {
		let best = null;
		let bestD = threshold;
		const grand = parent.parentId ? this.all.get(parent.parentId) : null;
		for (let pass = 0; pass < 2; pass++) {
			const list = pass === 0 ? parent.children : grand ? grand.children : null;
			if (!list) break;
			for (const c of list) {
				if (c.population <= 0 || c === parent) continue;
				const d = geneDistance(genome, 0, c.mean, 0, weights);
				if (d < bestD) {
					bestD = d;
					best = c;
				}
			}
		}
		return best;
	}

	merge(child, parent) {
		const n = child.population;
		child.merged = parent.id;
		this.remove(child, n);
		this.add(parent, n);
	}

	get(id) {
		return this.all.get(id);
	}

	add(sp, n = 1) {
		sp.population += n;
		if (sp.population > 0 && !this.living.has(sp.id)) {
			this.living.add(sp.id);
			sp.extinctTick = null;
		}
		if (sp.population > sp.peak) sp.peak = sp.population;
	}

	remove(sp, n = 1) {
		sp.population -= n;
		if (sp.population <= 0) {
			sp.population = 0;
			if (this.living.delete(sp.id)) {
				sp.extinctTick = this.tick;
				this.recentlyExtinct.push(sp);
			}
		}
	}

	livingList() {
		const out = [];
		for (const id of this.living) out.push(this.all.get(id));
		return out;
	}

	lineage(sp) {
		const chain = [];
		let cur = sp.parentId ? this.all.get(sp.parentId) : null;
		while (cur && chain.length < 12) {
			chain.push(cur);
			cur = cur.parentId ? this.all.get(cur.parentId) : null;
		}
		return chain;
	}
}

class EventLog {
	constructor(limit = 120) {
		this.limit = limit;
		this.items = [];
		this.version = 0;
	}

	push(tick, type, text, speciesId = null) {
		this.items.unshift({ tick, type, text, speciesId });
		if (this.items.length > this.limit) this.items.pop();
		this.version++;
	}
}
