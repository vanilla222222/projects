// Generates the world grid: altitude / temperature / humidity fields,
// then hydrology (ocean vs lake via flood fill, rivers sourced from lakes
// and glaciers), then final biome classification per cell.

const ALTITUDE_CURVE = 1.2;

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
		this._generateRivers();
		this._generatePonds();
		this._classifyBiomes();
	}

	// Terrain noise alone doesn't always carve enough inland basins to feel
	// like a "wet" world — this deliberately lowers a handful of inland
	// depressions below sea level so _computeHydrologyBasins() picks them up
	// as guaranteed lakes, on top of whatever forms naturally.
	_carveLakeBasins() {
		const { width, height, options } = this;
		const rng = new SeededRandom(this.seed + 66778);
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

			const radius = 3 + Math.floor(rng.next() * 6); // 3-8 cells
			const targetDepth = seaLevel - 0.12;
			for (let dy = -radius; dy <= radius; dy++) {
				const ny = cy + dy;
				if (ny < 0 || ny >= height) continue;
				for (let dx = -radius; dx <= radius; dx++) {
					const nx = cx + dx;
					if (nx < 0 || nx >= width) continue;
					const dist = Math.sqrt(dx * dx + dy * dy);
					if (dist > radius) continue;
					const ni = this.idx(nx, ny);
					const falloff = 1 - dist / radius; // 1 at center, 0 at rim
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

	// Rivers are sourced from lake overflow points and glacier melt peaks, then
	// walk downhill to the ocean/another lake. A low-frequency noise field
	// nudges the path sideways among any near-equal-altitude neighbors so
	// rivers wind naturally instead of beelining straight downhill.
	_generateRivers() {
		const { width, height, options } = this;
		const rng = new SeededRandom(this.seed + 9999);
		const meanderNoise = new PerlinNoise(this.seed + 7777);

		const sources = [];
		for (const g of this.glacierSources) sources.push(g);
		for (const l of this.lakeOutlets) sources.push(l);

		for (let i = sources.length - 1; i > 0; i--) {
			const j = Math.floor(rng.next() * (i + 1));
			const tmp = sources[i];
			sources[i] = sources[j];
			sources[j] = tmp;
		}

		const maxSteps = width + height;
		const slack = 0.006;
		const acceptedPaths = [];
		let created = 0;

		for (const src of sources) {
			if (created >= options.riverCount) break;

			let x = src.x;
			let y = src.y;
			const path = [];
			const visitedThisRun = new Set();
			let reachedWater = false;

			for (let step = 0; step < maxSteps; step++) {
				const i = this.idx(x, y);
				if (this.isOcean[i] || this.isLake[i]) {
					reachedWater = path.length > 0;
					break;
				}
				if (visitedThisRun.has(i)) break; // stuck in a loop/basin
				visitedThisRun.add(i);
				path.push({ x, y, i });

				const curAlt = this.altitude[i];

				// Among neighbors at or below current altitude (+ small slack for
				// flat ground), pick by lowness blended with meander noise.
				let bestI = -1;
				let bestScore = Infinity;
				for (let dy = -1; dy <= 1; dy++) {
					for (let dx = -1; dx <= 1; dx++) {
						if (dx === 0 && dy === 0) continue;
						const nx = x + dx;
						const ny = y + dy;
						if (!this.inBounds(nx, ny)) continue;
						const ni = this.idx(nx, ny);
						const nAlt = this.altitude[ni];
						if (nAlt > curAlt + slack) continue;
						const meander = meanderNoise.noise2D(nx * 0.07, ny * 0.07);
						const score = nAlt * 2.2 + meander * 0.18;
						if (score < bestScore) {
							bestScore = score;
							bestI = ni;
						}
					}
				}

				if (bestI === -1) {
					// Flat/uphill dead end: fall back to strict steepest descent.
					let bestAlt = curAlt;
					for (let dy = -1; dy <= 1; dy++) {
						for (let dx = -1; dx <= 1; dx++) {
							if (dx === 0 && dy === 0) continue;
							const nx = x + dx;
							const ny = y + dy;
							if (!this.inBounds(nx, ny)) continue;
							const ni = this.idx(nx, ny);
							if (this.altitude[ni] < bestAlt) {
								bestAlt = this.altitude[ni];
								bestI = ni;
							}
						}
					}
				}

				if (bestI === -1) break; // true local minimum: abandon this river
				x = bestI % width;
				y = (bestI - x) / width;
			}

			if (reachedWater && path.length >= 2) {
				acceptedPaths.push(path);
				created++;
			}
		}

		// Flow accumulation: every accepted path adds +1 along its whole route,
		// so confluences downstream of multiple sources naturally read as wider.
		for (const path of acceptedPaths) {
			for (const step of path) this.riverFlow[step.i] += 1;
		}

		// Carve each path into the grid, thickening by flow strength and filling
		// the "corner" cells on diagonal moves so the line reads as continuous
		// instead of a staircase of touching-only-at-a-point pixels.
		for (const path of acceptedPaths) {
			for (let s = 0; s < path.length; s++) {
				const { x, y, i } = path[s];
				this.isRiver[i] = 1;

				const flow = this.riverFlow[i];
				const radius = flow >= 10 ? 2 : flow >= 4 ? 1 : 0;
				if (radius > 0) this._widenRiverAt(x, y, radius);

				if (s < path.length - 1) {
					const next = path[s + 1];
					const dx = next.x - x;
					const dy = next.y - y;
					if (dx !== 0 && dy !== 0) {
						// Diagonal step: fill both orthogonal corner cells.
						this._markRiverCell(x + dx, y);
						this._markRiverCell(x, y + dy);
					}
				}
			}
		}
	}

	_markRiverCell(x, y) {
		if (!this.inBounds(x, y)) return;
		const i = this.idx(x, y);
		if (this.isOcean[i] || this.isLake[i]) return;
		this.isRiver[i] = 1;
	}

	_widenRiverAt(cx, cy, radius) {
		for (let dy = -radius; dy <= radius; dy++) {
			for (let dx = -radius; dx <= radius; dx++) {
				if (dx * dx + dy * dy > radius * radius + 0.5) continue;
				this._markRiverCell(cx + dx, cy + dy);
			}
		}
	}

	// Scatters small standalone ponds across the land — unlike lakes (basins
	// below sea level) these are shallow water features dropped onto
	// ordinary land, giving animals more accessible drinking spots than
	// relying on the ocean/lake/river network alone.
	_generatePonds() {
		const { width, height, options } = this;
		const rng = new SeededRandom(this.seed + 55443);
		const seaLevel = BIOME_THRESHOLDS.seaLevel;
		let placed = 0;
		let attempts = 0;
		const maxAttempts = options.pondCount * 40;

		while (placed < options.pondCount && attempts < maxAttempts) {
			attempts++;
			const x = Math.floor(rng.next() * width);
			const y = Math.floor(rng.next() * height);
			const i = this.idx(x, y);
			const alt = this.altitude[i];
			if (alt < seaLevel + 0.05 || alt > BIOME_THRESHOLDS.hillLevel) continue;
			if (this.isOcean[i] || this.isLake[i] || this.isRiver[i] || this.isGlacier[i]) continue;

			const radius = 1 + Math.floor(rng.next() * 2); // 1-2 cell radius
			const cells = [];
			let clear = true;
			for (let dy = -radius; dy <= radius && clear; dy++) {
				for (let dx = -radius; dx <= radius; dx++) {
					if (dx * dx + dy * dy > radius * radius + 0.5) continue;
					const nx = x + dx;
					const ny = y + dy;
					if (!this.inBounds(nx, ny)) {
						clear = false;
						break;
					}
					const ni = this.idx(nx, ny);
					if (this.isOcean[ni] || this.isLake[ni] || this.isRiver[ni] || this.isGlacier[ni]) {
						clear = false;
						break;
					}
					if (this.altitude[ni] < seaLevel) {
						clear = false;
						break;
					}
					cells.push(ni);
				}
			}
			if (!clear || cells.length === 0) continue;

			for (const ni of cells) this.isPond[ni] = 1;
			placed++;
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
