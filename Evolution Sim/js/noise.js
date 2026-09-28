// Seeded 2D Perlin-style noise with fractal Brownian motion (fBm) support.
// No external dependencies so this works when the page is opened via file://.

class SeededRandom {
	constructor(seed) {
		this.seed = seed >>> 0;
	}
	next() {
		// mulberry32
		this.seed |= 0;
		this.seed = (this.seed + 0x6d2b79f5) | 0;
		let t = Math.imul(this.seed ^ (this.seed >>> 15), 1 | this.seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	}
}

class PerlinNoise {
	constructor(seed = 1) {
		const rng = new SeededRandom(seed);
		this.perm = new Uint8Array(512);
		const p = new Uint8Array(256);
		for (let i = 0; i < 256; i++) p[i] = i;
		for (let i = 255; i > 0; i--) {
			const j = Math.floor(rng.next() * (i + 1));
			const tmp = p[i];
			p[i] = p[j];
			p[j] = tmp;
		}
		for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
	}

	static fade(t) {
		return t * t * t * (t * (t * 6 - 15) + 10);
	}

	static lerp(a, b, t) {
		return a + t * (b - a);
	}

	static grad(hash, x, y) {
		const h = hash & 7;
		const u = h < 4 ? x : y;
		const v = h < 4 ? y : x;
		return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
	}

	// Returns noise in range [-1, 1]
	noise2D(x, y) {
		const X = Math.floor(x) & 255;
		const Y = Math.floor(y) & 255;
		x -= Math.floor(x);
		y -= Math.floor(y);
		const u = PerlinNoise.fade(x);
		const v = PerlinNoise.fade(y);
		const perm = this.perm;
		const aa = perm[perm[X] + Y];
		const ab = perm[perm[X] + Y + 1];
		const ba = perm[perm[X + 1] + Y];
		const bb = perm[perm[X + 1] + Y + 1];
		const x1 = PerlinNoise.lerp(
			PerlinNoise.grad(aa, x, y),
			PerlinNoise.grad(ba, x - 1, y),
			u
		);
		const x2 = PerlinNoise.lerp(
			PerlinNoise.grad(ab, x, y - 1),
			PerlinNoise.grad(bb, x - 1, y - 1),
			u
		);
		return PerlinNoise.lerp(x1, x2, v);
	}

	// Fractal Brownian motion: layers multiple octaves of noise.
	// Returns value roughly in [-1, 1].
	fbm(x, y, { octaves = 5, lacunarity = 2.0, gain = 0.5, frequency = 1.0 } = {}) {
		let amplitude = 1;
		let freq = frequency;
		let sum = 0;
		let maxAmp = 0;
		for (let i = 0; i < octaves; i++) {
			sum += this.noise2D(x * freq, y * freq) * amplitude;
			maxAmp += amplitude;
			amplitude *= gain;
			freq *= lacunarity;
		}
		return sum / maxAmp;
	}

	// Ridged fBm: folds each octave through 1-|n|, producing sharp creases
	// instead of smooth hills — used to sharpen mountain terrain into ranges
	// with real ridgelines rather than rounded blobs. Returns roughly 0..1.
	ridgedFbm(x, y, { octaves = 5, lacunarity = 2.0, gain = 0.5, frequency = 1.0 } = {}) {
		let amplitude = 1;
		let freq = frequency;
		let sum = 0;
		let maxAmp = 0;
		for (let i = 0; i < octaves; i++) {
			const n = this.noise2D(x * freq, y * freq);
			sum += (1 - Math.abs(n)) * amplitude;
			maxAmp += amplitude;
			amplitude *= gain;
			freq *= lacunarity;
		}
		return sum / maxAmp;
	}
}
