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

const WG_GEN = 4;
const WG_WATER = 0.34;
const WG_CONT_AREA = 22000;
const WG_ISLE_AREA = 4200;
const WG_COAST_WARP = 9;
const WG_RIDGE_FREQ = 1 / 95;
const WG_RIDGE_POW = 10;
const WG_RIDGE_K = 0.75;
const WG_LAND_CURVE = 1.0;
const WG_STRAIT = 0.2;
const WG_HUM_LO = 0.2;
const WG_HUM_HI = 0.72;
const WG_ORO = 5;
const WG_RAIN = 0.004;
const WG_RECHARGE = 0.1;
const WG_TRADE_LAT = 0.36;
const WG_SALT_HUM = 0.24;
const WG_OUTFLOW = 0.4;
const WG_DELTA_FLOW = 4;
const WG_DELTA_LEN = 12;
const WG_LAKE_MUL = 1.6;
const WG_POND_MUL = 2.5;
const WG_RIVER_K = 0.8;
const WG_SALT_BASIN = 0.003;
const WG_SALT_SHARE = 0.008;
const WG4_WARP = 14;
const WG4_BELT = 0.36;
const WG4_RIDGE_K = 0.55;
const WG4_CONTI = 0.2;
const WG4_HUM_LO = 0.1;
const WG4_HUM_HI = 0.8;
const WG4_RIVER_K = 0.7;
const WG4_POLAR_LAT = 0.72;
const WG4_VOLC_AREA = 40000;
const WG4_OASIS_AREA = 26000;

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
				gen: WG_GEN,
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
		this.isSalt = new Uint8Array(width * height);
		this.isDelta = new Uint8Array(width * height);
		this.gen = this.options.gen;

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
		const v3 = this.gen >= 3;
		if (v3) this._generateFieldsV3();
		else this._generateFields();
		this._carveLakeBasins();
		this._computeHydrologyBasins();
		this._computeGlacierMask();
		this._fillDepressions();
		this._markDepressionLakes();
		if (v3) this._markSaltBasins();
		this._generateRivers();
		if (v3) this._buildDeltas();
		this._generatePonds();
		if (this.gen >= 4) this._placeOases();
		this._shapeRiverBanks();
		if (this.gen >= 4) this._classifyBiomesV4();
		else if (v3) this._classifyBiomesV3();
		else this._classifyBiomes();
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
		const lakeCount = this.gen >= 3 ? Math.round(options.lakeCount * WG_LAKE_MUL) : options.lakeCount;
		const hiCap = this.gen >= 3 ? BIOME_THRESHOLDS.mountainLevel : BIOME_THRESHOLDS.hillLevel;
		const maxAttempts = lakeCount * 50;

		while (placed < lakeCount && attempts < maxAttempts) {
			attempts++;
			const cx = Math.floor(rng.next() * width);
			const cy = Math.floor(rng.next() * height);
			const centerAlt = this.altitude[this.idx(cx, cy)];
			// Stay well inland (not near the coast) and off mountains, so the
			// carved basin reads as a distinct lake rather than an ocean inlet.
			if (centerAlt < seaLevel + 0.12 || centerAlt > hiCap) continue;

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
		const v3 = this.gen >= 3;
		const out = v3 ? new Uint8Array(n) : null;
		for (let k = order.length - 1; k >= 0; k--) {
			const c = order[k];
			const d = down[c];
			if (d < 0) continue;
			if (v3) {
				if (this.isSalt[c]) continue;
				if ((this.isLake[c] || out[c]) && !this.isOcean[d]) out[d] = 1;
			}
			flow[d] += flow[c];
		}

		const scale = Math.sqrt((width * height) / 67200);
		const threshold = HYDRO_RIVER_FLOW * scale * (this.gen >= 4 ? WG4_RIVER_K : v3 ? WG_RIVER_K : 1);
		for (let i = 0; i < n; i++) {
			this.riverFlow[i] = this.isOcean[i] ? 0 : flow[i] / threshold;
		}

		for (let c = 0; c < n; c++) {
			if (this.isOcean[c] || this.isLake[c] || this.isGlacier[c]) continue;
			const f = this.riverFlow[c];
			if (f < (out && out[c] ? WG_OUTFLOW : 1) || this.isSalt[c]) continue;
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
		const want = Math.round(options.pondCount * (this.gen >= 3 ? WG_POND_MUL : 1));
		const maxAttempts = want * 60;

		while (placed < want && attempts < maxAttempts) {
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

	_generateFieldsV3() {
		const { width, height, seed, options } = this;
		const n = width * height;
		const sea = BIOME_THRESHOLDS.seaLevel;
		const rng = new SeededRandom(seed + 91001);
		const baseN = new PerlinNoise(seed);
		const coastN = new PerlinNoise(seed + 91002);
		const ridgeA = new PerlinNoise(seed + 91003);
		const ridgeB = new PerlinNoise(seed + 91004);
		const ridgeD = new PerlinNoise(seed + 91005);
		const midX = new PerlinNoise(seed + 91006);
		const midY = new PerlinNoise(seed + 91007);
		const tempNoise = new PerlinNoise(seed + 1000);
		const humNoise = new PerlinNoise(seed + 2000);
		const fertNoise = new PerlinNoise(seed + 3000);
		const warpNoiseX = new PerlinNoise(seed + 4001);
		const warpNoiseY = new PerlinNoise(seed + 4002);
		const freqT = options.temperatureScale / options.baseFeatureSize;
		const freqH = options.humidityScale / options.baseFeatureSize;
		const freqF = options.fertilityScale / options.baseFeatureSize;
		const warpFreq = 1 / (options.baseFeatureSize * 1.6);
		const margin = Math.max(12, Math.min(80, Math.round(Math.min(width, height) * 0.06)));
		const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
		const smooth = (v) => {
			const t = clamp01(v);
			return t * t * (3 - 2 * t);
		};
		const g4 = this.gen >= 4;
		const rng4 = g4 ? new SeededRandom(seed + 94000) : null;
		const w4x = g4 ? new PerlinNoise(seed + 94001) : null;
		const w4y = g4 ? new PerlinNoise(seed + 94002) : null;
		const belt4 = g4 ? new PerlinNoise(seed + 94003) : null;

		const nCont = Math.max(2, Math.min(12, Math.round(n / WG_CONT_AREA)));
		const conts = [];
		for (let c = 0; c < nCont; c++) {
			let bx = width / 2;
			let by = height / 2;
			let bestD = -1;
			for (let k = 0; k < 12; k++) {
				const x = margin * 1.5 + rng.next() * Math.max(1, width - margin * 3);
				const y = margin * 1.5 + rng.next() * Math.max(1, height - margin * 3);
				let d = 1e9;
				for (const o of conts) d = Math.min(d, Math.hypot(x - o.x, y - o.y));
				if (d > bestD) {
					bestD = d;
					bx = x;
					by = y;
				}
			}
			const r = Math.sqrt(n / nCont) * (0.36 + 0.18 * rng.next());
			const ang = rng.next() * Math.PI;
			conts.push({
				x: bx,
				y: by,
				rx: r * (1.05 + 0.5 * rng.next()),
				ry: r * (0.65 + 0.3 * rng.next()),
				ca: Math.cos(ang),
				sa: Math.sin(ang),
				h: 0.8 + 0.2 * rng.next(),
			});
		}
		if (g4) {
			for (const o of conts) {
				o.bOff = (rng4.next() - 0.5) * 0.6;
				o.bBend = (rng4.next() - 0.5) * 1.2;
				o.bW = 0.1 + 0.08 * rng4.next();
				o.bK = 0.75 + 0.5 * rng4.next();
				o.bLen = 0.7 + 0.35 * rng4.next();
			}
		}

		const isl = new Float32Array(n);
		const nIsle = Math.round(n / WG_ISLE_AREA);
		for (let k = 0; k < nIsle; k++) {
			const cx = margin + rng.next() * Math.max(1, width - margin * 2);
			const cy = margin + rng.next() * Math.max(1, height - margin * 2);
			const r = 2.5 + rng.next() * 7;
			const h = 0.55 + rng.next() * 0.4;
			const st = 1 + rng.next() * 0.8;
			const ang = rng.next() * Math.PI;
			const ca = Math.cos(ang);
			const sa = Math.sin(ang);
			const reach = Math.ceil(r * st * 1.6) + 2;
			const x0 = Math.max(0, Math.floor(cx - reach));
			const x1 = Math.min(width - 1, Math.ceil(cx + reach));
			const y0 = Math.max(0, Math.floor(cy - reach));
			const y1 = Math.min(height - 1, Math.ceil(cy + reach));
			for (let y = y0; y <= y1; y++) {
				for (let x = x0; x <= x1; x++) {
					const dx = x - cx;
					const dy = y - cy;
					const u = (dx * ca + dy * sa) / st;
					const v = dy * ca - dx * sa;
					const d = Math.sqrt(u * u + v * v) / r + coastN.noise2D(x * 0.21, y * 0.21) * 0.35;
					const val = h * smooth((1.25 - d) / 0.9);
					const i = y * width + x;
					if (val > isl[i]) isl[i] = val;
				}
			}
		}

		const raw = this.altitude;
		const cont = new Float32Array(n);
		let minA = Infinity;
		let maxA = -Infinity;
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const i = y * width + x;
				let wx = x + warpNoiseX.noise2D(x * warpFreq, y * warpFreq) * options.warpStrength + midX.noise2D(x / 48, y / 48) * WG_COAST_WARP;
				let wy = y + warpNoiseY.noise2D(x * warpFreq, y * warpFreq) * options.warpStrength + midY.noise2D(x / 48, y / 48) * WG_COAST_WARP;
				if (g4) {
					const qx = wx;
					const qy = wy;
					wx += w4x.noise2D(qx / 64, qy / 64) * WG4_WARP;
					wy += w4y.noise2D(qx / 64 + 5.2, qy / 64 - 1.3) * WG4_WARP;
				}
				let c = 0;
				let d1 = 1e9;
				let d2 = 1e9;
				let belt = 0;
				for (const o of conts) {
					const dx = wx - o.x;
					const dy = wy - o.y;
					const u = (dx * o.ca + dy * o.sa) / o.rx;
					const v = (dy * o.ca - dx * o.sa) / o.ry;
					const dd = Math.sqrt(u * u + v * v);
					const val = o.h * smooth((1.2 - dd) / 0.9);
					if (val > c) c = val;
					if (g4) {
						const bv = v - o.bOff - o.bBend * u * u;
						const bb = Math.exp(-((bv / o.bW) ** 2)) * smooth((o.bLen - Math.abs(u)) / 0.35) * o.bK;
						if (bb > belt) belt = bb;
					}
					if (dd < d1) {
						d2 = d1;
						d1 = dd;
					} else if (dd < d2) d2 = dd;
				}
				cont[i] = c;
				let a = Math.min(Math.max(c, isl[i]), 0.55) * 0.7;
				a += baseN.fbm(wx / 90, wy / 90, { octaves: 4, lacunarity: 2.05, gain: 0.5 }) * 0.25;
				a += coastN.fbm(wx / 14, wy / 14, { octaves: 3, lacunarity: 2.1, gain: 0.55 }) * 0.07;
				if (d1 < 1.6) a -= smooth(1 - (d2 - d1 + coastN.noise2D(wx / 22 - 4.4, wy / 22 + 8.8) * 0.12) / WG_STRAIT) * (0.3 + 0.25 * coastN.noise2D(wx / 40 + 9.1, wy / 40 - 3.7));
				const inland = smooth((c - 0.3) / 0.4);
				if (inland > 0) {
					const r1 = Math.pow(1 - Math.abs(ridgeA.fbm(wx * WG_RIDGE_FREQ, wy * WG_RIDGE_FREQ, { octaves: 3 })), WG_RIDGE_POW);
					const r2 = Math.pow(1 - Math.abs(ridgeB.fbm(wx * WG_RIDGE_FREQ * 1.7 + 17.3, wy * WG_RIDGE_FREQ * 1.7 - 5.1, { octaves: 3 })), WG_RIDGE_POW) * 0.5;
					const det = ridgeD.ridgedFbm(wx / 30, wy / 30, { octaves: 3 });
					if (g4) a += inland * Math.max(r1, r2) * WG4_RIDGE_K * (0.55 + 0.45 * det);
					else a += inland * Math.max(r1, r2) * WG_RIDGE_K * (0.55 + 0.45 * det);
				}
				if (g4 && belt > 0.01) {
					const rb = belt4.ridgedFbm(wx / 26, wy / 26, { octaves: 4 });
					a += belt * smooth((c - 0.2) / 0.35) * WG4_BELT * (0.35 + 0.65 * rb);
				}
				const edgeWobble = warpNoiseY.noise2D(x * warpFreq * 2.7 + 31.7, y * warpFreq * 2.7 - 12.3);
				const edgeDist = Math.min(x, width - 1 - x, y, height - 1 - y) + edgeWobble * margin * 0.9;
				const ef = smooth(edgeDist / (margin * 1.5));
				a -= (1 - ef) * 0.6;
				if (!(a > -10 && a < 10)) a = 0;
				raw[i] = a;
				if (a < minA) minA = a;
				if (a > maxA) maxA = a;
			}
		}

		const BINS = 4096;
		const hist = new Int32Array(BINS);
		const span = Math.max(1e-6, maxA - minA);
		for (let i = 0; i < n; i++) hist[Math.min(BINS - 1, Math.floor(((raw[i] - minA) / span) * BINS))]++;
		let acc = 0;
		let qBin = 0;
		let topBin = BINS - 1;
		const waterN = n * WG_WATER;
		const topN = n * 0.997;
		for (let b = 0; b < BINS; b++) {
			acc += hist[b];
			if (acc < waterN) qBin = b + 1;
			if (acc < topN) topBin = b + 1;
		}
		const q = minA + (qBin / BINS) * span;
		const top = Math.max(q + 1e-4, minA + (topBin / BINS) * span);
		for (let i = 0; i < n; i++) {
			const v = raw[i];
			if (v < q) raw[i] = sea * Math.pow(clamp01((v - minA) / Math.max(1e-6, q - minA)), 0.9) * 0.999;
			else raw[i] = sea + (1 - sea) * Math.pow(clamp01((v - q) / (top - q)), WG_LAND_CURVE);
		}

		const alt = raw;
		const air = new Float32Array(n);
		const oro = new Float32Array(n);
		const sAlt = Float32Array.from(alt);
		this._blurField(sAlt, 3);
		for (let y = 0; y < height; y++) {
			const lat = Math.abs(y / height - 0.5) * 2;
			const dir = lat < WG_TRADE_LAT || (g4 && lat > WG4_POLAR_LAT) ? -1 : 1;
			let M = 1;
			let prev = sea;
			for (let k = 0; k < width; k++) {
				const x = dir > 0 ? k : width - 1 - k;
				const i = y * width + x;
				const a = alt[i];
				if (a < sea) {
					M += (1 - M) * WG_RECHARGE;
					air[i] = M;
					prev = sea;
					continue;
				}
				const rise = Math.max(0, sAlt[i] - prev);
				prev = Math.max(sea, sAlt[i]);
				const rain = M * WG_RAIN + M * Math.min(0.2, rise * WG_ORO);
				air[i] = M;
				oro[i] = rain;
				M = Math.max(0, M - rain);
			}
		}
		this._blurField(air, 4);
		this._blurField(oro, 3);
		let landB = null;
		if (g4) {
			landB = new Float32Array(n);
			for (let i = 0; i < n; i++) landB[i] = alt[i] >= sea ? 1 : 0;
			this._blurField(landB, 9);
			this._blurField(landB, 9);
		}

		for (let y = 0; y < height; y++) {
			const lat = Math.abs(y / height - 0.5) * 2;
			const band = 0.12 * Math.exp(-((lat / 0.18) ** 2)) - 0.1 * Math.exp(-(((lat - 0.42) / 0.12) ** 2)) + 0.05 * Math.exp(-(((lat - 0.68) / 0.12) ** 2));
			for (let x = 0; x < width; x++) {
				const i = y * width + x;
				const a = alt[i];
				const above = Math.max(0, a - sea);
				let tn = (tempNoise.fbm(x * freqT, y * freqT, { octaves: 4, lacunarity: 2.0, gain: 0.5 }) + 1) / 2;
				let temp = (1 - Math.pow(lat, 1.4)) * 0.72 + tn * 0.25 + 0.04 - above * 0.75;
				this.temperature[i] = clamp01(temp);
				const hn = (humNoise.fbm(x * freqH, y * freqH, { octaves: 4, lacunarity: 2.0, gain: 0.5 }) + 1) / 2;
				let hum = 0.45 * hn + 0.38 * air[i] + oro[i] * 2.5 + band - above * 0.2 + 0.02;
				if (g4) hum -= WG4_CONTI * (landB[i] - 0.6);
				this.humidity[i] = clamp01(hum);
				let fert = (fertNoise.fbm(x * freqF, y * freqF, { octaves: 3, lacunarity: 2.0, gain: 0.55 }) + 1) / 2;
				fert *= 1 - Math.min(1, above * 1.4);
				this.fertility[i] = clamp01(fert);
			}
		}
		const hh = new Int32Array(256);
		let landN = 0;
		for (let i = 0; i < n; i++) {
			if (alt[i] < sea) continue;
			hh[Math.min(255, Math.floor(this.humidity[i] * 256))]++;
			landN++;
		}
		let p10 = 0;
		let p90 = 1;
		for (let b = 0, s = 0; b < 256; b++) {
			s += hh[b];
			if (s < landN * 0.1) p10 = (b + 1) / 256;
			if (s < landN * 0.9) p90 = (b + 1) / 256;
		}
		const hLo = g4 ? WG4_HUM_LO : WG_HUM_LO;
		const hk = ((g4 ? WG4_HUM_HI : WG_HUM_HI) - hLo) / Math.max(0.02, p90 - p10);
		for (let i = 0; i < n; i++) this.humidity[i] = clamp01(hLo + (this.humidity[i] - p10) * hk);
		this._sanitizeFields();
	}

	_blurField(f, r) {
		const { width, height } = this;
		const tmp = new Float32Array(f.length);
		const k = 2 * r + 1;
		for (let y = 0; y < height; y++) {
			const row = y * width;
			let s = 0;
			for (let x = -r; x <= r; x++) s += f[row + Math.min(width - 1, Math.max(0, x))];
			for (let x = 0; x < width; x++) {
				tmp[row + x] = s / k;
				s += f[row + Math.min(width - 1, x + r + 1)] - f[row + Math.max(0, x - r)];
			}
		}
		for (let x = 0; x < width; x++) {
			let s = 0;
			for (let y = -r; y <= r; y++) s += tmp[Math.min(height - 1, Math.max(0, y)) * width + x];
			for (let y = 0; y < height; y++) {
				f[y * width + x] = s / k;
				s += tmp[Math.min(height - 1, y + r + 1) * width + x] - tmp[Math.max(0, y - r) * width + x];
			}
		}
	}

	_sanitizeFields() {
		const fix = (f, d) => {
			for (let i = 0; i < f.length; i++) {
				const v = f[i];
				if (!(v >= 0)) f[i] = v < 0 ? 0 : d;
				else if (v > 1) f[i] = 1;
			}
		};
		fix(this.altitude, BIOME_THRESHOLDS.seaLevel);
		fix(this.temperature, 0.5);
		fix(this.humidity, 0.5);
		fix(this.fertility, 0.5);
	}

	_markSaltBasins() {
		const { width, height } = this;
		const n = width * height;
		const sea = BIOME_THRESHOLDS.seaLevel;
		const seen = new Uint8Array(n);
		const stack = [];
		const cells = [];
		const basins = [];
		for (let s = 0; s < n; s++) {
			if (!this.isLake[s] || seen[s]) continue;
			seen[s] = 1;
			stack.push(s);
			cells.length = 0;
			let hs = 0;
			let ts = 0;
			while (stack.length) {
				const i = stack.pop();
				cells.push(i);
				hs += this.humidity[i];
				ts += this.temperature[i];
				const x = i % width;
				const y = (i - x) / width;
				for (let d = 0; d < 4; d++) {
					const nx = x + (d === 0 ? 1 : d === 1 ? -1 : 0);
					const ny = y + (d === 2 ? 1 : d === 3 ? -1 : 0);
					if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
					const ni = ny * width + nx;
					if (this.isLake[ni] && !seen[ni]) {
						seen[ni] = 1;
						stack.push(ni);
					}
				}
			}
			if (hs / cells.length >= WG_SALT_HUM || ts / cells.length < 0.4) continue;
			basins.push({ h: hs / cells.length, cells: cells.slice() });
		}
		basins.sort((a, b) => a.h - b.h || a.cells[0] - b.cells[0]);
		let left = Math.floor(n * WG_SALT_SHARE);
		const cap = Math.floor(n * WG_SALT_BASIN);
		for (const b of basins) {
			const take = Math.min(b.cells.length, cap, left);
			if (take < HYDRO_LAKE_MIN) continue;
			if (take < b.cells.length) b.cells.sort((p, q) => this.altitude[q] - this.altitude[p] || p - q);
			left -= take;
			for (let k = 0; k < take; k++) {
				const i = b.cells[k];
				this.isLake[i] = 0;
				this.isSalt[i] = 1;
				this.altitude[i] = sea + 0.004;
				this.humidity[i] = Math.min(this.humidity[i], 0.12);
			}
		}
	}

	_buildDeltas() {
		const { width, height } = this;
		const n = width * height;
		const sea = BIOME_THRESHOLDS.seaLevel;
		const wob = new PerlinNoise(this.seed + 92002);
		const down = this.down;
		const cand = [];
		for (let c = 0; c < n; c++) {
			if (!this.isRiver[c] || this.riverFlow[c] < WG_DELTA_FLOW) continue;
			const d = down[c];
			if (d < 0 || !this.isOcean[d]) continue;
			cand.push(c);
		}
		cand.sort((a, b) => this.riverFlow[b] - this.riverFlow[a] || a - b);
		const mouths = [];
		for (const c of cand) {
			const x = c % width;
			const y = (c - x) / width;
			let ok = true;
			for (const m of mouths) if (Math.abs(m.x - x) <= 6 && Math.abs(m.y - y) <= 6) ok = false;
			if (ok) mouths.push({ x, y, c });
		}
		const fan = (cx, cy, r) => {
			for (let dy = -r; dy <= r; dy++) {
				for (let dx = -r; dx <= r; dx++) {
					const nx = cx + dx;
					const ny = cy + dy;
					if (nx < 1 || ny < 1 || nx >= width - 1 || ny >= height - 1) continue;
					const d = Math.sqrt(dx * dx + dy * dy) / (r + 0.5) + wob.noise2D(nx * 0.4, ny * 0.4) * 0.3;
					if (d > 1) continue;
					const i = ny * width + nx;
					if (!this.isOcean[i] || this.altitude[i] < sea - 0.03) continue;
					this.isOcean[i] = 0;
					this.altitude[i] = sea + 0.003;
					this.isDelta[i] = 1;
					this.humidity[i] = Math.max(this.humidity[i], 0.7);
					this.fertility[i] = Math.min(1, this.fertility[i] + 0.25);
				}
			}
		};
		for (const m of mouths) {
			let cur = m.c;
			for (let s = 0; s < WG_DELTA_LEN; s++) {
				const x = cur % width;
				const y = (cur - x) / width;
				let best = -1;
				let bf = -1;
				for (let dy = -1; dy <= 1; dy++) {
					for (let dx = -1; dx <= 1; dx++) {
						const nx = x + dx;
						const ny = y + dy;
						if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
						const ni = ny * width + nx;
						if (down[ni] === cur && this.isRiver[ni] && this.riverFlow[ni] > bf) {
							bf = this.riverFlow[ni];
							best = ni;
						}
					}
				}
				if (best < 0) break;
				cur = best;
			}
			const ax = cur % width;
			const ay = (cur - ax) / width;
			const vx = m.x - ax;
			const vy = m.y - ay;
			const len = Math.hypot(vx, vy);
			if (len < 3) continue;
			const base = Math.atan2(vy, vx);
			const apexFlow = this.riverFlow[cur];
			const R = len * 0.9 + 2;
			const mx = Math.round((ax + m.x) / 2);
			const my = Math.round((ay + m.y) / 2);
			const rr = Math.ceil(R);
			for (let dy = -rr; dy <= rr; dy++) {
				for (let dx = -rr; dx <= rr; dx++) {
					const nx = mx + dx;
					const ny = my + dy;
					if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
					const i = ny * width + nx;
					if (this.isOcean[i] || this.isLake[i] || this.isSalt[i]) continue;
					const w = 1 - Math.sqrt(dx * dx + dy * dy) / R;
					if (w <= 0 || this.altitude[i] > sea + 0.1) continue;
					this.altitude[i] = this.altitude[i] * (1 - w) + (sea + 0.006) * w;
					this.humidity[i] = Math.min(1, this.humidity[i] + 0.2 * w);
					this.fertility[i] = Math.min(1, this.fertility[i] + 0.25 * w);
					if (w > 0.25) this.isDelta[i] = 1;
				}
			}
			const arms = apexFlow >= WG_DELTA_FLOW * 2 ? [-1, 0, 1] : [-1, 1];
			for (const k of arms) {
				let ang = base + k * 0.55;
				const target = ang;
				let px = ax;
				let py = ay;
				for (let s = 0; s < WG_DELTA_LEN * 3; s++) {
					ang += wob.noise2D(px * 0.2 + k * 13.1, py * 0.2) * 0.35 + (target - ang) * 0.25;
					px += Math.cos(ang);
					py += Math.sin(ang);
					const ix = Math.round(px);
					const iy = Math.round(py);
					if (ix < 1 || iy < 1 || ix >= width - 1 || iy >= height - 1) break;
					const i = iy * width + ix;
					if (this.isOcean[i]) {
						fan(ix, iy, 2);
						break;
					}
					if (this.isLake[i] || this.isSalt[i]) break;
					this._markRiverCell(ix, iy);
					this.riverFlow[i] = Math.max(this.riverFlow[i], apexFlow * 0.3);
					this.isDelta[i] = 1;
				}
			}
			fan(m.x, m.y, 3);
		}
	}

	_distField(isSrc, through, maxD) {
		const { width, height } = this;
		const n = width * height;
		const dist = new Uint8Array(n).fill(255);
		let frontier = [];
		for (let i = 0; i < n; i++) {
			if (isSrc(i)) {
				dist[i] = 0;
				frontier.push(i);
			}
		}
		for (let d = 1; d <= maxD && frontier.length; d++) {
			const next = [];
			for (const i of frontier) {
				const x = i % width;
				const y = (i - x) / width;
				for (let k = 0; k < 4; k++) {
					const nx = x + (k === 0 ? 1 : k === 1 ? -1 : 0);
					const ny = y + (k === 2 ? 1 : k === 3 ? -1 : 0);
					if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
					const ni = ny * width + nx;
					if (dist[ni] !== 255 || !through(ni)) continue;
					dist[ni] = d;
					next.push(ni);
				}
			}
			frontier = next;
		}
		return dist;
	}

	_classifyBiomesV3() {
		const { width, height } = this;
		const sea = BIOME_THRESHOLDS.seaLevel;
		const v = BIOME_V3;
		const patch = new PerlinNoise(this.seed + 93001);
		const oceanD = this._distField((i) => this.isOcean[i], (i) => !this.isOcean[i], 3);
		const landD = this._distField((i) => !this.isOcean[i] && !this.isRiver[i], (i) => this.isOcean[i], 6);
		const riverD = this._distField((i) => this.isRiver[i], () => true, 3);
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const i = y * width + x;
				const a = this.altitude[i];
				const t = this.temperature[i];
				const h = this.humidity[i];
				if (this.isRiver[i] && a >= sea) {
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
					if (t >= v.reefTemp && a >= sea - v.reefDepth && a <= sea - v.reefMin && landD[i] <= 5 && riverD[i] > 3 && patch.noise2D(x * 0.09, y * 0.09) > -0.15) {
						this.biome[i] = BIOME_ID.CORAL_REEF;
					} else {
						this.biome[i] = BIOME_ID[classifyWaterBiome(a, t)];
					}
					continue;
				}
				if (this.isSalt[i]) {
					this.biome[i] = BIOME_ID.SALT_FLAT;
					continue;
				}
				if ((oceanD[i] <= 2 && a < sea + v.mangroveWidth && t >= v.mangroveTemp && h >= v.mangroveHumidity) || (this.isDelta[i] && t >= 0.55 && h >= v.mangroveHumidity)) {
					this.biome[i] = BIOME_ID.MANGROVE;
					continue;
				}
				if (this.isDelta[i]) {
					const cold = t < BIOME_THRESHOLDS.coldTemp;
					this.biome[i] = BIOME_ID[cold ? (t < v.bogTemp ? BIOME.TUNDRA_BOG : BIOME.BOG) : h > BIOME_THRESHOLDS.humidHumidity ? BIOME.SWAMP : BIOME.WETLAND];
					continue;
				}
				if (a < sea + BIOME_THRESHOLDS.beachWidth && this._touchesWater(x, y)) {
					this.biome[i] = BIOME_ID.BEACH;
					continue;
				}
				const slope = this._slopeAt(x, y);
				if (slope > BIOME_THRESHOLDS.cliffSlope) {
					this.biome[i] = BIOME_ID.CLIFF;
					continue;
				}
				if (h < v.saltHumidity && t > v.saltTemp && a < sea + v.saltRise && slope < v.saltSlope && patch.noise2D(x * 0.05 + 40.7, y * 0.05) > 0.1) {
					this.biome[i] = BIOME_ID.SALT_FLAT;
					continue;
				}
				this.biome[i] = BIOME_ID[classifyLandBiomeV3(a, t, h, slope)];
			}
		}
	}

	_placeOases() {
		const { width, height } = this;
		const n = width * height;
		const sea = BIOME_THRESHOLDS.seaLevel;
		const w4 = BIOME_V4;
		const rng = new SeededRandom(this.seed + 94200);
		const shape = new PerlinNoise(this.seed + 94201);
		const src = new Uint8Array(n);
		const want = Math.max(2, Math.round(n / WG4_OASIS_AREA));
		const spots = [];
		let attempts = 0;
		while (spots.length < want && attempts < want * 80) {
			attempts++;
			let best = -1;
			let bestH = Infinity;
			for (let k = 0; k < 10; k++) {
				const x = 5 + Math.floor(rng.next() * (width - 10));
				const y = 5 + Math.floor(rng.next() * (height - 10));
				const i = y * width + x;
				const a = this.altitude[i];
				if (a < sea + 0.02 || a > BIOME_THRESHOLDS.hillLevel) continue;
				if (this.isOcean[i] || this.isLake[i] || this.isRiver[i] || this.isPond[i] || this.isSalt[i] || this.isGlacier[i]) continue;
				const t = this.temperature[i];
				const h = this.humidity[i];
				if (t < w4.oasisTemp || h >= w4.oasisHum + 0.08) continue;
				let far = true;
				for (const s of spots) if (Math.abs(s.x - x) < 24 && Math.abs(s.y - y) < 24) far = false;
				if (!far) continue;
				if (h < bestH) {
					bestH = h;
					best = i;
				}
			}
			if (best < 0) continue;
			const cx = best % width;
			const cy = (best - cx) / width;
			const radius = 1.4 + rng.next() * 1.3;
			const r = Math.ceil(radius);
			const cells = [];
			let clear = true;
			for (let dy = -r; dy <= r && clear; dy++) {
				for (let dx = -r; dx <= r; dx++) {
					const nx = cx + dx;
					const ny = cy + dy;
					const d = Math.sqrt(dx * dx + dy * dy) / radius + shape.noise2D(nx * 0.5, ny * 0.5) * 0.35;
					if (d > 1) continue;
					const ni = ny * width + nx;
					if (this.isOcean[ni] || this.isLake[ni] || this.isGlacier[ni] || this.isSalt[ni] || this.altitude[ni] < sea) {
						clear = false;
						break;
					}
					if (!this.isRiver[ni]) cells.push(ni);
				}
			}
			if (!clear || cells.length < 3) continue;
			for (const ni of cells) {
				this.isPond[ni] = 1;
				src[ni] = 1;
			}
			spots.push({ x: cx, y: cy });
			const R = 7;
			for (let dy = -R; dy <= R; dy++) {
				for (let dx = -R; dx <= R; dx++) {
					const nx = cx + dx;
					const ny = cy + dy;
					if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
					const w = 1 - Math.sqrt(dx * dx + dy * dy) / (R + 1);
					if (w <= 0) continue;
					const ni = ny * width + nx;
					this.humidity[ni] = Math.min(1, this.humidity[ni] + 0.16 * w);
					this.fertility[ni] = Math.min(1, this.fertility[ni] + 0.2 * w);
				}
			}
		}
		this._oasisSrc = src;
	}

	_volcanicMask() {
		const { width, height } = this;
		const n = width * height;
		const sea = BIOME_THRESHOLDS.seaLevel;
		const rng = new SeededRandom(this.seed + 94100);
		const edge = new PerlinNoise(this.seed + 94101);
		const mask = new Uint8Array(n);
		const want = Math.max(1, Math.round(n / WG4_VOLC_AREA));
		const spots = [];
		for (let s = 0; s < want; s++) {
			let best = -1;
			let bestA = -1;
			for (let k = 0; k < 40; k++) {
				const x = 8 + Math.floor(rng.next() * (width - 16));
				const y = 8 + Math.floor(rng.next() * (height - 16));
				const i = y * width + x;
				if (this.isOcean[i] || this.isLake[i] || this.isGlacier[i] || this.isRiver[i]) continue;
				let far = true;
				for (const p of spots) if (Math.abs(p.x - x) < 40 && Math.abs(p.y - y) < 40) far = false;
				if (!far) continue;
				const a = this.altitude[i] + rng.next() * 0.08;
				if (a > bestA) {
					bestA = a;
					best = i;
				}
			}
			if (best < 0 || this.altitude[best] < sea + 0.08) continue;
			const cx = best % width;
			const cy = (best - cx) / width;
			spots.push({ x: cx, y: cy });
			const radius = 4 + rng.next() * 5;
			const r = Math.ceil(radius * 1.4);
			for (let dy = -r; dy <= r; dy++) {
				for (let dx = -r; dx <= r; dx++) {
					const nx = cx + dx;
					const ny = cy + dy;
					if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
					const d = Math.sqrt(dx * dx + dy * dy) / radius + edge.noise2D(nx * 0.18, ny * 0.18) * 0.4;
					if (d > 1) continue;
					const ni = ny * width + nx;
					if (this.isOcean[ni] || this.isLake[ni] || this.isRiver[ni] || this.isPond[ni] || this.isGlacier[ni] || this.isSalt[ni]) continue;
					mask[ni] = 1;
				}
			}
		}
		return mask;
	}

	_classifyBiomesV4() {
		const { width, height } = this;
		const n = width * height;
		const sea = BIOME_THRESHOLDS.seaLevel;
		const v = BIOME_V3;
		const w4 = BIOME_V4;
		const patch = new PerlinNoise(this.seed + 93001);
		const jt = new PerlinNoise(this.seed + 94301);
		const jh = new PerlinNoise(this.seed + 94302);
		const dn = new PerlinNoise(this.seed + 94303);
		const oasis = this._oasisSrc || new Uint8Array(n);
		const volc = this._volcanicMask();
		const oceanD = this._distField((i) => this.isOcean[i], (i) => !this.isOcean[i], 3);
		const landD = this._distField((i) => !this.isOcean[i] && !this.isRiver[i], (i) => this.isOcean[i], 6);
		const riverD = this._distField((i) => this.isRiver[i], () => true, 3);
		const wideD = this._distField((i) => this.isRiver[i] && this.riverFlow[i] >= HYDRO_WIDE_1, (i) => !this.isOcean[i] && !this.isLake[i], 4);
		const oasisD = this._distField((i) => oasis[i] === 1, (i) => !this.isOcean[i] && !this.isLake[i], 4);
		const generic = new Uint8Array(n);
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const i = y * width + x;
				const a = this.altitude[i];
				const t = this.temperature[i];
				const h = this.humidity[i];
				if (this.isRiver[i] && a >= sea) {
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
					if (t >= v.reefTemp && a >= sea - v.reefDepth && a <= sea - v.reefMin && landD[i] <= 5 && riverD[i] > 3 && patch.noise2D(x * 0.09, y * 0.09) > -0.15) {
						this.biome[i] = BIOME_ID.CORAL_REEF;
					} else {
						this.biome[i] = BIOME_ID[classifyWaterBiome(a, t)];
					}
					continue;
				}
				if (this.isSalt[i]) {
					this.biome[i] = BIOME_ID.SALT_FLAT;
					continue;
				}
				if ((oceanD[i] <= 2 && a < sea + v.mangroveWidth && t >= v.mangroveTemp && h >= v.mangroveHumidity) || (this.isDelta[i] && t >= 0.55 && h >= v.mangroveHumidity)) {
					this.biome[i] = BIOME_ID.MANGROVE;
					continue;
				}
				if (this.isDelta[i]) {
					const cold = t < BIOME_THRESHOLDS.coldTemp;
					this.biome[i] = BIOME_ID[cold ? (t < v.bogTemp ? BIOME.TUNDRA_BOG : BIOME.BOG) : h > BIOME_THRESHOLDS.humidHumidity ? BIOME.SWAMP : BIOME.WETLAND];
					continue;
				}
				if (a < sea + BIOME_THRESHOLDS.beachWidth && this._touchesWater(x, y)) {
					this.biome[i] = BIOME_ID.BEACH;
					continue;
				}
				const slope = this._slopeAt(x, y);
				if (volc[i]) {
					this.biome[i] = BIOME_ID.VOLCANIC;
					continue;
				}
				if (slope > BIOME_THRESHOLDS.cliffSlope) {
					this.biome[i] = BIOME_ID.CLIFF;
					continue;
				}
				if (oasisD[i] !== 255 && oasisD[i] > 0 && t >= w4.oasisTemp - 0.04) {
					this.biome[i] = BIOME_ID.OASIS;
					continue;
				}
				if (h < v.saltHumidity && t > v.saltTemp && a < sea + v.saltRise && slope < v.saltSlope && patch.noise2D(x * 0.05 + 40.7, y * 0.05) > 0.1) {
					this.biome[i] = BIOME_ID.SALT_FLAT;
					continue;
				}
				const tj = t + jt.noise2D(x * 0.13, y * 0.13) * w4.jitter;
				const hj = h + jh.noise2D(x * 0.13 + 7.7, y * 0.13 - 2.9) * w4.jitter;
				if (wideD[i] !== 255 && wideD[i] > 0 && a < sea + w4.floodRise && slope < w4.floodSlope && tj >= w4.floodTemp && hj >= w4.floodHum) {
					this.biome[i] = BIOME_ID.FLOODPLAIN;
					continue;
				}
				let b = classifyLandBiomeV4(a, tj, hj, slope);
				if (b === BIOME.DUNES && dn.noise2D(x * 0.06, y * 0.06) < -0.2) b = BIOME.DESERT;
				this.biome[i] = BIOME_ID[b];
				generic[i] = 1;
			}
		}
		const out = Uint8Array.from(this.biome);
		const cnt = new Uint8Array(BIOME_LIST.length);
		for (let y = 1; y < height - 1; y++) {
			for (let x = 1; x < width - 1; x++) {
				const i = y * width + x;
				if (!generic[i]) continue;
				let top = this.biome[i];
				let topN = 0;
				for (let dy = -1; dy <= 1; dy++) {
					for (let dx = -1; dx <= 1; dx++) {
						if (dx === 0 && dy === 0) continue;
						const j = i + dy * width + dx;
						if (!generic[j]) continue;
						const b = this.biome[j];
						const c = ++cnt[b];
						if (c > topN) {
							topN = c;
							top = b;
						}
					}
				}
				for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) cnt[this.biome[i + dy * width + dx]] = 0;
				if (topN >= 5 && top !== this.biome[i]) out[i] = top;
			}
		}
		this.biome.set(out);
		this._oasisSrc = null;
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
