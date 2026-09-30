// Generates the world grid: altitude / temperature / humidity fields,
// then hydrology (ocean vs lake via flood fill, rivers sourced from lakes
// and glaciers), then final biome classification per cell.

const ALTITUDE_CURVE = 1.2;

const HYDRO_MEANDER = 0.004;
const HYDRO_WIGGLE = 0.45;
const HYDRO_WIGGLE_FREQ = 0.045;
const HYDRO_VALLEY = 0.014;
const HYDRO_BANK_WET = 0.12;
const HYDRO_BANK_RANGE = 3;
const HYDRO_POND_DEPTH = 0.004;
const HYDRO_LAKE_DEPTH = 0.015;
const HYDRO_LAKE_MIN = 10;
const HYDRO_POND_MAX = 14;
const HYDRO_POND_MIN = 4;
const HYDRO_MELT = 2.5;
const HYDRO_RIVER_FLOW = 190;
const HYDRO_WIDE_1 = 5;
const HYDRO_WIDE_2 = 18;

class WorldMap {
	constructor(width, height, seed, options = {}) {
		this.width = width;
		this.height = height;
		this.seed = seed;
		this.options = Object.assign(
			{
				// Cells per noise period. Frequencies below are expressed relative to
				// this, in absolute cell units (not map-fraction), so larger maps get
				// *more* independent landmasses instead of one shape stretched wider.
				baseFeatureSize: 200,
				altitudeScale: 1,
				temperatureScale: 0.5,
				humidityScale: 0.7,
				fertilityScale: 0.9,
				warpStrength: 22, // cells of domain-warp displacement — bends terrain into less grid-aligned shapes
				riverCount: Math.max(14, Math.min(650, Math.round((width * height) / 2200))),
				pondCount: Math.max(6, Math.round((width * height) / 9000)),
				lakeCount: Math.max(3, Math.round((width * height) / 30000)),
			},
			options
		);

		this.altitude = new Float32Array(width * height);
		this.temperature = new Float32Array(width * height);
		this.humidity = new Float32Array(width * height);
		this.fertility = new Float32Array(width * height);
		this.isOcean = new Uint8Array(width * height);
		this.isLake = new Uint8Array(width * height);
		this.isRiver = new Uint8Array(width * height);
		this.isGlacier = new Uint8Array(width * height);
		this.isPond = new Uint8Array(width * height);
		this.riverFlow = new Float32Array(width * height);
		this.biome = new Uint8Array(width * height); // numeric BIOME_ID values, not the string keys

		this._generate();
	}

	idx(x, y) {
		return y * this.width + x;
	}

	inBounds(x, y) {
		return x >= 0 && y >= 0 && x < this.width && y < this.height;
	}

	// True for any standing/flowing water tile — used by animals to know
	// where they can drink from (they can't walk onto these, only be
	// adjacent to them).
	isWaterTile(x, y) {
		if (!this.inBounds(x, y)) return false;
		const i = this.idx(x, y);
		return !!(this.isOcean[i] || this.isLake[i] || this.isRiver[i] || this.isPond[i]);
	}

	_generate() {
		this._generateFields();
		this._carveLakeBasins();
		this._computeHydrologyBasins();
		this._computeGlacierMask();
		this._fillDepressions();
		this._markDepressionLakes();
		this._generateRivers();
		this._generatePonds();
		this._shapeRiverBanks();
		this._classifyBiomes();
	}

	// Terrain noise alone doesn't always carve enough inland basins to feel
	// like a "wet" world — this deliberately lowers a handful of inland
	// depressions below sea level so _computeHydrologyBasins() picks them up
	// as guaranteed lakes, on top of whatever forms naturally.
	_carveLakeBasins() {
		const { width, height, options } = this;
		const rng = new SeededRandom(this.seed + 66778);
		const shoreNoise = new PerlinNoise(this.seed + 66779);
		const seaLevel = BIOME_THRESHOLDS.seaLevel;
		let placed = 0;
		let attempts = 0;
		const maxAttempts = options.lakeCount * 50;

		while (placed < options.lakeCount && attempts < maxAttempts) {
			attempts++;
			const cx = Math.floor(rng.next() * width);
			const cy = Math.floor(rng.next() * height);
			const centerAlt = this.altitude[this.idx(cx, cy)];
			// Stay well inland (not near the coast) and off mountains, so the
			// carved basin reads as a distinct lake rather than an ocean inlet.
			if (centerAlt < seaLevel + 0.12 || centerAlt > BIOME_THRESHOLDS.hillLevel) continue;

			const radius = 3 + Math.floor(rng.next() * 6);
			const reach = Math.ceil(radius * 1.6);
			const ang = rng.next() * Math.PI;
			const stretch = 1 + rng.next() * 0.8;
			const ca = Math.cos(ang);
			const sa = Math.sin(ang);
			const targetDepth = seaLevel - 0.12;
			for (let dy = -reach; dy <= reach; dy++) {
				const ny = cy + dy;
				if (ny < 0 || ny >= height) continue;
				for (let dx = -reach; dx <= reach; dx++) {
					const nx = cx + dx;
					if (nx < 0 || nx >= width) continue;
					const u = (dx * ca + dy * sa) / stretch;
					const v = (dy * ca - dx * sa) * (stretch > 1.4 ? 1.1 : 1);
					const dist = Math.sqrt(u * u + v * v) / radius + shoreNoise.noise2D(nx * 0.28, ny * 0.28) * 0.35;
					if (dist > 1) continue;
					const ni = this.idx(nx, ny);
					const falloff = 1 - dist;
					this.altitude[ni] = this.altitude[ni] * (1 - falloff) + targetDepth * falloff;
				}
			}
			placed++;
		}
	}

	_generateFields() {
		const { width, height, seed, options } = this;
		const altNoise = new PerlinNoise(seed);
		const tempNoise = new PerlinNoise(seed + 1000);
		const humNoise = new PerlinNoise(seed + 2000);
		const fertNoise = new PerlinNoise(seed + 3000);
		const warpNoiseX = new PerlinNoise(seed + 4001);
		const warpNoiseY = new PerlinNoise(seed + 4002);

		const freqA = options.altitudeScale / options.baseFeatureSize;
		const freqT = options.temperatureScale / options.baseFeatureSize;
		const freqH = options.humidityScale / options.baseFeatureSize;
		const freqF = options.fertilityScale / options.baseFeatureSize;
		const warpFreq = 1 / (options.baseFeatureSize * 1.6); // slow, large-scale bends

		// Edge margin in cells: land fades to ocean near the border so the map
		// reads as a bounded world, but the margin no longer eats a fixed 15%
		// of every map — on large maps that left no room for separate
		// continents/islands away from one central blob.
		const edgeMargin = Math.max(12, Math.min(80, Math.round(Math.min(width, height) * 0.06)));

		let minAlt = Infinity;
		let maxAlt = -Infinity;

		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				// Domain warp: displace the sampling point itself by a slow noise
				// field before reading altitude, so coastlines/ranges bend into
				// organic shapes instead of tracing plain Perlin contours.
				const warpX = x + warpNoiseX.noise2D(x * warpFreq, y * warpFreq) * options.warpStrength;
				const warpY = y + warpNoiseY.noise2D(x * warpFreq, y * warpFreq) * options.warpStrength;

				// Altitude: fBm noise sampled at absolute cell frequency, so doubling
				// the map doubles how many continent-scale features fit on it.
				let a = altNoise.fbm(warpX * freqA, warpY * freqA, {
					octaves: 6,
					lacunarity: 2.05,
					gain: 0.5,
				});
				a = (a + 1) / 2; // 0..1

				// Sharpen high terrain into ridged mountain ranges instead of
				// smooth blobby peaks, blending in only where it's already high.
				if (a > 0.55) {
					const ridge = altNoise.ridgedFbm(warpX * freqA * 2, warpY * freqA * 2, {
						octaves: 4,
						lacunarity: 2.1,
						gain: 0.5,
					});
					const blend = Math.min(1, (a - 0.55) / 0.3);
					a = a * (1 - blend * 0.45) + ridge * blend * 0.45;
				}

				const edgeWobble = warpNoiseY.noise2D(x * warpFreq * 2.7 + 31.7, y * warpFreq * 2.7 - 12.3);
				const edgeDist = Math.min(x, width - 1 - x, y, height - 1 - y) + edgeWobble * edgeMargin * 0.9;
				const e = Math.max(0, Math.min(1, edgeDist / (edgeMargin * 1.5)));
				const edgeFalloff = e * e * (3 - 2 * e);
				a = a * (0.35 + 0.65 * edgeFalloff);

				this.altitude[this.idx(x, y)] = a;
				if (a < minAlt) minAlt = a;
				if (a > maxAlt) maxAlt = a;
			}
		}

		// Normalize altitude to fill 0..1 range for better contrast.
		const range = Math.max(1e-6, maxAlt - minAlt);
		for (let i = 0; i < this.altitude.length; i++) {
			this.altitude[i] = Math.pow((this.altitude[i] - minAlt) / range, ALTITUDE_CURVE);
		}

		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const ny = y / height;
				const i = this.idx(x, y);
				const a = this.altitude[i];

				// Temperature: latitude gradient (cold at top/bottom edges, hot at equator
				// which we place at the vertical center) plus noise variation, minus a
				// lapse-rate cooling term for higher altitude.
				const latitude = Math.abs(ny - 0.5) * 2; // 0 at equator, 1 at poles
				let tempNoiseVal = tempNoise.fbm(x * freqT, y * freqT, {
					octaves: 4,
					lacunarity: 2.0,
					gain: 0.5,
				});
				tempNoiseVal = (tempNoiseVal + 1) / 2;
				let temp = (1 - Math.pow(latitude, 1.4)) * 0.72 + tempNoiseVal * 0.25 + 0.04;
				const altitudeAboveSea = Math.max(0, a - BIOME_THRESHOLDS.seaLevel);
				temp -= altitudeAboveSea * 0.75;
				temp = Math.min(1, Math.max(0, temp));
				this.temperature[i] = temp;

				// Humidity: noise field, boosted near the equator (more rain), reduced
				// at very high altitude (rain shadow / dry peaks).
				let hum = humNoise.fbm(x * freqH, y * freqH, {
					octaves: 4,
					lacunarity: 2.0,
					gain: 0.5,
				});
				hum = (hum + 1) / 2;
				hum = hum * 0.85 + (1 - latitude) * 0.15;
				hum -= altitudeAboveSea * 0.3;
				hum = Math.min(1, Math.max(0, hum));
				this.humidity[i] = hum;

				// Fertility: an independent soil-richness layer (nothing to do
				// with climate) that thins out on high, rocky ground — a global
				// multiplier on plant fitness, not a per-species preference.
				let fert = fertNoise.fbm(x * freqF, y * freqF, { octaves: 3, lacunarity: 2.0, gain: 0.55 });
				fert = (fert + 1) / 2;
				fert *= 1 - Math.min(1, altitudeAboveSea * 1.4);
				this.fertility[i] = Math.min(1, Math.max(0, fert));
			}
		}
	}

	// Flood fill from the map border across all-connected below-sea-level cells
	// to find the true ocean; any remaining below-sea-level cells are inland lakes.
	_computeHydrologyBasins() {
		const { width, height } = this;
		const seaLevel = BIOME_THRESHOLDS.seaLevel;
		const visited = new Uint8Array(width * height);
		const stack = [];

		const pushIfWater = (x, y) => {
			if (!this.inBounds(x, y)) return;
			const i = this.idx(x, y);
			if (visited[i]) return;
			if (this.altitude[i] >= seaLevel) return;
			visited[i] = 1;
			stack.push(i);
		};

		for (let x = 0; x < width; x++) {
			pushIfWater(x, 0);
			pushIfWater(x, height - 1);
		}
		for (let y = 0; y < height; y++) {
			pushIfWater(0, y);
			pushIfWater(width - 1, y);
		}

		while (stack.length) {
			const i = stack.pop();
			this.isOcean[i] = 1;
			const x = i % width;
			const y = (i - x) / width;
			pushIfWater(x + 1, y);
			pushIfWater(x - 1, y);
			pushIfWater(x, y + 1);
			pushIfWater(x, y - 1);
		}

		for (let i = 0; i < width * height; i++) {
			if (this.altitude[i] < seaLevel && !this.isOcean[i]) {
				this.isLake[i] = 1;
			}
		}

		this._computeLakeGroups();
	}

	// Groups connected lake cells into distinct bodies of water and picks each
	// one's overflow point: the lowest-altitude bordering land cell, which is
	// where a river will be sourced from.
	_computeLakeGroups() {
		const { width, height } = this;
		const groupId = new Int32Array(width * height).fill(-1);
		this.lakeOutlets = [];
		const stack = [];

		for (let start = 0; start < width * height; start++) {
			if (!this.isLake[start] || groupId[start] !== -1) continue;

			groupId[start] = 0; // mark visited (value unused beyond -1 check)
			stack.push(start);
			let size = 0;
			let bestOutlet = null;

			while (stack.length) {
				const i = stack.pop();
				size++;
				const x = i % width;
				const y = (i - x) / width;
				for (let dy = -1; dy <= 1; dy++) {
					for (let dx = -1; dx <= 1; dx++) {
						if (dx === 0 && dy === 0) continue;
						const nx = x + dx;
						const ny = y + dy;
						if (!this.inBounds(nx, ny)) continue;
						const ni = this.idx(nx, ny);
						if (this.isLake[ni]) {
							if (groupId[ni] === -1) {
								groupId[ni] = 0;
								stack.push(ni);
							}
						} else if (!this.isOcean[ni]) {
							const alt = this.altitude[ni];
							if (!bestOutlet || alt < bestOutlet.altitude) {
								bestOutlet = { x: nx, y: ny, altitude: alt };
							}
						}
					}
				}
			}

			if (bestOutlet && size >= 4) {
				this.lakeOutlets.push({ x: bestOutlet.x, y: bestOutlet.y });
			}
		}
	}

	_computeGlacierMask() {
		for (let i = 0; i < this.altitude.length; i++) {
			this.isGlacier[i] = isGlacierConditions(this.altitude[i], this.temperature[i]) ? 1 : 0;
		}
		this._computeGlacierSources();
	}

	// Groups connected glacier cells and picks each icefield's highest point
	// as its meltwater river source.
	_computeGlacierSources() {
		const { width, height } = this;
		const visited = new Uint8Array(width * height);
		this.glacierSources = [];
		const stack = [];

		for (let start = 0; start < width * height; start++) {
			if (!this.isGlacier[start] || visited[start]) continue;

			visited[start] = 1;
			stack.push(start);
			let peakI = start;
			let peakAlt = this.altitude[start];

			while (stack.length) {
				const i = stack.pop();
				if (this.altitude[i] > peakAlt) {
					peakAlt = this.altitude[i];
					peakI = i;
				}
				const x = i % width;
				const y = (i - x) / width;
				for (let dy = -1; dy <= 1; dy++) {
					for (let dx = -1; dx <= 1; dx++) {
						if (dx === 0 && dy === 0) continue;
						const nx = x + dx;
						const ny = y + dy;
						if (!this.inBounds(nx, ny)) continue;
						const ni = this.idx(nx, ny);
						if (this.isGlacier[ni] && !visited[ni]) {
							visited[ni] = 1;
							stack.push(ni);
						}
					}
				}
			}

			const px = peakI % width;
			const py = (peakI - px) / width;
			this.glacierSources.push({ x: px, y: py });
		}
	}

	_fillDepressions() {
		const { width, height } = this;
		const n = width * height;
		const alt = this.altitude;
		const filled = new Float32Array(n);
		const down = new Int32Array(n).fill(-1);
		const done = new Uint8Array(n);
		const order = new Int32Array(n);
		const heapI = new Int32Array(n + 8);
		const heapK = new Float32Array(n + 8);
		const jitter = new PerlinNoise(this.seed + 7777);
		let size = 0;
		let count = 0;

		const push = (i, k) => {
			let c = size++;
			while (c > 0) {
				const p = (c - 1) >> 1;
				if (heapK[p] <= k) break;
				heapI[c] = heapI[p];
				heapK[c] = heapK[p];
				c = p;
			}
			heapI[c] = i;
			heapK[c] = k;
		};
		const pop = () => {
			const top = heapI[0];
			const li = heapI[--size];
			const lk = heapK[size];
			let c = 0;
			for (;;) {
				let m = 2 * c + 1;
				if (m >= size) break;
				if (m + 1 < size && heapK[m + 1] < heapK[m]) m++;
				if (heapK[m] >= lk) break;
				heapI[c] = heapI[m];
				heapK[c] = heapK[m];
				c = m;
			}
			heapI[c] = li;
			heapK[c] = lk;
			return top;
		};

		let seeded = 0;
		for (let i = 0; i < n; i++) {
			if (!this.isOcean[i]) continue;
			done[i] = 1;
			filled[i] = alt[i];
			push(i, alt[i]);
			seeded++;
		}
		if (seeded === 0) {
			for (let i = 0; i < n; i++) {
				const x = i % width;
				const y = (i - x) / width;
				if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
					done[i] = 1;
					filled[i] = alt[i];
					push(i, alt[i]);
				}
			}
		}

		while (size > 0) {
			const c = pop();
			order[count++] = c;
			const x = c % width;
			const y = (c - x) / width;
			const fc = filled[c];
			for (let dy = -1; dy <= 1; dy++) {
				const ny = y + dy;
				if (ny < 0 || ny >= height) continue;
				for (let dx = -1; dx <= 1; dx++) {
					if (dx === 0 && dy === 0) continue;
					const nx = x + dx;
					if (nx < 0 || nx >= width) continue;
					const ni = ny * width + nx;
					if (done[ni]) continue;
					done[ni] = 1;
					const f = Math.max(alt[ni], fc + 1e-5);
					filled[ni] = f;
					down[ni] = c;
					push(ni, f + (jitter.noise2D(nx * 0.09, ny * 0.09) + 1) * HYDRO_MEANDER);
				}
			}
		}

		const rank = new Int32Array(n);
		for (let k = 0; k < count; k++) rank[order[k]] = k;
		const wiggle = new PerlinNoise(this.seed + 7778);
		for (let c = 0; c < n; c++) {
			if (down[c] < 0) continue;
			const x = c % width;
			const y = (c - x) / width;
			const fc = filled[c];
			const rc = rank[c];
			let maxDrop = 1e-6;
			for (let dy = -1; dy <= 1; dy++) {
				const ny = y + dy;
				if (ny < 0 || ny >= height) continue;
				for (let dx = -1; dx <= 1; dx++) {
					if (dx === 0 && dy === 0) continue;
					const nx = x + dx;
					if (nx < 0 || nx >= width) continue;
					const ni = ny * width + nx;
					if (rank[ni] >= rc) continue;
					const drop = (fc - filled[ni]) / (dx !== 0 && dy !== 0 ? 1.4142 : 1);
					if (drop > maxDrop) maxDrop = drop;
				}
			}
			const bend = wiggle.noise2D(x * HYDRO_WIGGLE_FREQ, y * HYDRO_WIGGLE_FREQ) * Math.PI * 2;
			const bx = Math.cos(bend);
			const by = Math.sin(bend);
			let best = down[c];
			let bestScore = -Infinity;
			for (let dy = -1; dy <= 1; dy++) {
				const ny = y + dy;
				if (ny < 0 || ny >= height) continue;
				for (let dx = -1; dx <= 1; dx++) {
					if (dx === 0 && dy === 0) continue;
					const nx = x + dx;
					if (nx < 0 || nx >= width) continue;
					const ni = ny * width + nx;
					if (rank[ni] >= rc) continue;
					const diag = dx !== 0 && dy !== 0;
					const dist = diag ? 1.4142 : 1;
					const drop = (fc - filled[ni]) / dist;
					const score = drop / maxDrop + ((dx * bx + dy * by) / dist) * HYDRO_WIGGLE;
					if (score > bestScore) {
						bestScore = score;
						best = ni;
					}
				}
			}
			down[c] = best;
		}

		this.filled = filled;
		this.down = down;
		this.flowOrder = order.subarray(0, count);
	}

	_markDepressionLakes() {
		const { width, height } = this;
		const n = width * height;
		const deep = new Uint8Array(n);
		for (let i = 0; i < n; i++) {
			if (this.isOcean[i] || this.isGlacier[i]) continue;
			const depth = this.filled[i] - this.altitude[i];
			if (depth > HYDRO_POND_DEPTH) deep[i] = depth > HYDRO_LAKE_DEPTH ? 2 : 1;
		}
		const seen = new Uint8Array(n);
		const stack = [];
		const cells = [];
		for (let s = 0; s < n; s++) {
			if (!deep[s] || seen[s]) continue;
			seen[s] = 1;
			stack.push(s);
			cells.length = 0;
			let hasDeep = false;
			while (stack.length) {
				const i = stack.pop();
				cells.push(i);
				if (deep[i] === 2) hasDeep = true;
				const x = i % width;
				const y = (i - x) / width;
				for (let d = 0; d < 4; d++) {
					const nx = x + (d === 0 ? 1 : d === 1 ? -1 : 0);
					const ny = y + (d === 2 ? 1 : d === 3 ? -1 : 0);
					if (!this.inBounds(nx, ny)) continue;
					const ni = ny * width + nx;
					if (deep[ni] && !seen[ni]) {
						seen[ni] = 1;
						stack.push(ni);
					}
				}
			}
			if (hasDeep && cells.length >= HYDRO_LAKE_MIN) {
				for (const i of cells) this.isLake[i] = 1;
			} else if (cells.length >= HYDRO_POND_MIN && cells.length <= HYDRO_POND_MAX) {
				for (const i of cells) this.isPond[i] = 1;
			}
		}
	}

	_generateRivers() {
		const { width, height } = this;
		const n = width * height;
		const flow = new Float32Array(n);
		const order = this.flowOrder;
		const down = this.down;
		for (let i = 0; i < n; i++) {
			if (this.isOcean[i]) continue;
			flow[i] = 0.25 + this.humidity[i] + (this.isGlacier[i] ? HYDRO_MELT : 0);
		}
		for (let k = order.length - 1; k >= 0; k--) {
			const c = order[k];
			const d = down[c];
			if (d >= 0) flow[d] += flow[c];
		}

		const scale = Math.sqrt((width * height) / 67200);
		const threshold = HYDRO_RIVER_FLOW * scale;
		for (let i = 0; i < n; i++) {
			this.riverFlow[i] = this.isOcean[i] ? 0 : flow[i] / threshold;
		}

		for (let c = 0; c < n; c++) {
			if (this.isOcean[c] || this.isLake[c] || this.isGlacier[c]) continue;
			const f = this.riverFlow[c];
			if (f < 1) continue;
			const x = c % width;
			const y = (c - x) / width;
			this._markRiverCell(x, y);
			const radius = f >= HYDRO_WIDE_2 ? 2 : f >= HYDRO_WIDE_1 ? 1 : 0;
			if (radius > 0) this._widenRiverAt(x, y, radius);
			const d = down[c];
			if (d >= 0) {
				const nx = d % width;
				const ny = (d - nx) / width;
				if (nx !== x && ny !== y) this._markRiverCell(nx, y);
			}
		}
	}

	_markRiverCell(x, y) {
		if (!this.inBounds(x, y)) return;
		const i = this.idx(x, y);
		if (this.isOcean[i] || this.isLake[i] || this.isGlacier[i]) return;
		this.isRiver[i] = 1;
		this.isPond[i] = 0;
	}

	_widenRiverAt(cx, cy, radius) {
		for (let dy = -radius; dy <= radius; dy++) {
			for (let dx = -radius; dx <= radius; dx++) {
				if (dx * dx + dy * dy > radius * radius + 0.5) continue;
				this._markRiverCell(cx + dx, cy + dy);
			}
		}
	}

	_generatePonds() {
		const { width, height, options } = this;
		const rng = new SeededRandom(this.seed + 55443);
		const shape = new PerlinNoise(this.seed + 55444);
		const seaLevel = BIOME_THRESHOLDS.seaLevel;
		const blocked = (i) => this.isOcean[i] || this.isLake[i] || this.isRiver[i] || this.isGlacier[i] || this.isPond[i];
		let placed = 0;
		let attempts = 0;
		const maxAttempts = options.pondCount * 60;

		while (placed < options.pondCount && attempts < maxAttempts) {
			attempts++;
			let best = -1;
			let bestScore = -Infinity;
			for (let k = 0; k < 6; k++) {
				const x = 3 + Math.floor(rng.next() * (width - 6));
				const y = 3 + Math.floor(rng.next() * (height - 6));
				const i = this.idx(x, y);
				const alt = this.altitude[i];
				if (alt < seaLevel + 0.03 || alt > BIOME_THRESHOLDS.hillLevel || blocked(i)) continue;
				const score = this.humidity[i] + Math.min(1, this.riverFlow[i]) * 0.8 - this._slopeAt(x, y) * 40;
				if (score > bestScore) {
					bestScore = score;
					best = i;
				}
			}
			if (best < 0) continue;
			const cx = best % width;
			const cy = (best - cx) / width;
			const radius = 1.8 + rng.next() * 1.8;
			const r = Math.ceil(radius);
			const cells = [];
			let clear = true;
			for (let dy = -r; dy <= r && clear; dy++) {
				for (let dx = -r; dx <= r; dx++) {
					const nx = cx + dx;
					const ny = cy + dy;
					const dist = Math.sqrt(dx * dx + dy * dy) / radius + shape.noise2D(nx * 0.45, ny * 0.45) * 0.45;
					if (dist > 1) continue;
					if (!this.inBounds(nx, ny)) {
						clear = false;
						break;
					}
					const ni = this.idx(nx, ny);
					if (this.isOcean[ni] || this.isLake[ni] || this.isGlacier[ni] || this.altitude[ni] < seaLevel) {
						clear = false;
						break;
					}
					if (!this.isRiver[ni]) cells.push(ni);
				}
			}
			if (!clear || cells.length < HYDRO_POND_MIN) continue;
			for (const ni of cells) this.isPond[ni] = 1;
			placed++;
		}
	}

	_shapeRiverBanks() {
		const { width, height } = this;
		const n = width * height;
		const seaLevel = BIOME_THRESHOLDS.seaLevel;
		const dist = new Uint8Array(n).fill(255);
		let frontier = [];
		for (let i = 0; i < n; i++) {
			if (this.isRiver[i] || this.isPond[i] || this.isLake[i]) {
				dist[i] = 0;
				frontier.push(i);
			}
		}
		for (let d = 1; d <= HYDRO_BANK_RANGE && frontier.length; d++) {
			const next = [];
			for (const i of frontier) {
				const x = i % width;
				const y = (i - x) / width;
				for (let k = 0; k < 4; k++) {
					const nx = x + (k === 0 ? 1 : k === 1 ? -1 : 0);
					const ny = y + (k === 2 ? 1 : k === 3 ? -1 : 0);
					if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
					const ni = ny * width + nx;
					if (dist[ni] !== 255 || this.isOcean[ni]) continue;
					dist[ni] = d;
					next.push(ni);
				}
			}
			frontier = next;
		}
		for (let i = 0; i < n; i++) {
			const d = dist[i];
			if (d === 255 || this.isOcean[i]) continue;
			const w = 1 - d / (HYDRO_BANK_RANGE + 1);
			this.humidity[i] = Math.min(1, this.humidity[i] + HYDRO_BANK_WET * w);
			if (this.isRiver[i]) {
				const cut = HYDRO_VALLEY * Math.min(1, this.riverFlow[i] / HYDRO_WIDE_1);
				this.altitude[i] = Math.max(seaLevel + 0.002, this.altitude[i] - cut);
			} else if (d > 0 && !this.isLake[i] && !this.isPond[i]) {
				this.altitude[i] = Math.max(seaLevel + 0.002, this.altitude[i] - HYDRO_VALLEY * 0.5 * w * w);
			}
		}
	}

	_classifyBiomes() {
		const { width, height } = this;
		const seaLevel = BIOME_THRESHOLDS.seaLevel;

		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const i = this.idx(x, y);
				const a = this.altitude[i];
				const t = this.temperature[i];
				const h = this.humidity[i];

				if (this.isRiver[i] && a >= seaLevel) {
					this.biome[i] = BIOME_ID.RIVER;
					continue;
				}
				if (this.isLake[i]) {
					this.biome[i] = BIOME_ID.LAKE;
					continue;
				}
				if (this.isPond[i]) {
					this.biome[i] = BIOME_ID.POND;
					continue;
				}
				if (this.isOcean[i]) {
					this.biome[i] = BIOME_ID[classifyWaterBiome(a, t)];
					continue;
				}

				// Coastal fringe: warm + humid shorelines get mangroves (a slightly
				// wider band than plain beach), everything else near water gets a
				// thin sandy beach line.
				const nearShore = a < seaLevel + BIOME_THRESHOLDS.mangroveWidth && this._touchesWater(x, y);
				if (
					nearShore &&
					t >= BIOME_THRESHOLDS.mangroveTemp &&
					h >= BIOME_THRESHOLDS.mangroveHumidity
				) {
					this.biome[i] = BIOME_ID.MANGROVE;
					continue;
				}
				if (a < seaLevel + BIOME_THRESHOLDS.beachWidth && this._touchesWater(x, y)) {
					this.biome[i] = BIOME_ID.BEACH;
					continue;
				}

				// Sheer terrain: wherever altitude jumps sharply between adjacent
				// tiles (steep mountainsides, canyon walls), it reads as a cliff
				// face regardless of what the smoother climate-based rules would
				// have picked.
				if (this._slopeAt(x, y) > BIOME_THRESHOLDS.cliffSlope) {
					this.biome[i] = BIOME_ID.CLIFF;
					continue;
				}

				this.biome[i] = BIOME_ID[classifyLandBiome(a, t, h)];
			}
		}
	}

	_slopeAt(x, y) {
		const a = this.altitude[this.idx(x, y)];
		let maxDiff = 0;
		for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
			const nx = x + dx;
			const ny = y + dy;
			if (!this.inBounds(nx, ny)) continue;
			const diff = Math.abs(this.altitude[this.idx(nx, ny)] - a);
			if (diff > maxDiff) maxDiff = diff;
		}
		return maxDiff;
	}

	_touchesWater(x, y) {
		for (let dy = -1; dy <= 1; dy++) {
			for (let dx = -1; dx <= 1; dx++) {
				if (dx === 0 && dy === 0) continue;
				const nx = x + dx;
				const ny = y + dy;
				if (!this.inBounds(nx, ny)) continue;
				const ni = this.idx(nx, ny);
				if (this.isOcean[ni] || this.isLake[ni]) return true;
			}
		}
		return false;
	}

	getCell(x, y) {
		const i = this.idx(x, y);
		return {
			altitude: this.altitude[i],
			temperature: this.temperature[i],
			humidity: this.humidity[i],
			biome: BIOME_LIST[this.biome[i]], // string key, for external callers
			isOcean: !!this.isOcean[i],
			isLake: !!this.isLake[i],
			isRiver: !!this.isRiver[i],
		};
	}
}
