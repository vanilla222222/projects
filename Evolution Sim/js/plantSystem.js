// Plant population simulation: founding species, per-tick aging/death/reproduction,
// genetic mutation, and speciation when a mutation is a severity outlier.

const PLANT_TYPES = { GRASS: 'grass', FUNGUS: 'fungus', TREE: 'tree', AQUATIC: 'aquatic' };

class Plant {
	constructor(id, speciesId, genome, x, y, plantType) {
		this.id = id;
		this.speciesId = speciesId;
		this.genome = genome;
		// Decoded once at birth and reused every tick — a genome never changes
		// after creation, so re-deriving this object every step would just be
		// wasted allocation multiplied by the whole population.
		this.traits = readTraits(genome);
		this.x = x;
		this.y = y;
		this.age = 0;
		this.mature = false;
		this.alive = true;
		this.plantType = plantType;
		// Trees aren't consumed when eaten — only their fruit is. They stand
		// bare until it regrows, instead of dying like grass/fungus would.
		this.hasFruit = true;
		this.fruitCooldown = 0;
	}
}

// Ten ecologically distinct starting archetypes (niche centers for
// temperature / humidity / altitude), spread across the biome space so the
// founders don't all compete for the same land.
const FOUNDER_ARCHETYPES = [
	{ prefTemperature: 0.82, prefHumidity: 0.12, prefAltitude: 0.5, plantType: PLANT_TYPES.GRASS }, // desert scrub
	{ prefTemperature: 0.72, prefHumidity: 0.38, prefAltitude: 0.48, plantType: PLANT_TYPES.GRASS }, // savanna grass
	{ prefTemperature: 0.8, prefHumidity: 0.85, prefAltitude: 0.5, plantType: PLANT_TYPES.TREE }, // jungle vine
	{ prefTemperature: 0.5, prefHumidity: 0.65, prefAltitude: 0.55, plantType: PLANT_TYPES.TREE }, // temperate tree
	{ prefTemperature: 0.5, prefHumidity: 0.45, prefAltitude: 0.48, plantType: PLANT_TYPES.GRASS }, // plains grass
	{ prefTemperature: 0.25, prefHumidity: 0.6, prefAltitude: 0.58, plantType: PLANT_TYPES.TREE }, // taiga conifer
	{ prefTemperature: 0.12, prefHumidity: 0.4, prefAltitude: 0.5, plantType: PLANT_TYPES.FUNGUS }, // tundra moss
	{ prefTemperature: 0.3, prefHumidity: 0.3, prefAltitude: 0.85, plantType: PLANT_TYPES.FUNGUS }, // alpine lichen
	{ prefTemperature: 0.58, prefHumidity: 0.92, prefAltitude: 0.43, plantType: PLANT_TYPES.GRASS }, // wetland reed
	{ prefTemperature: 0.45, prefHumidity: 0.2, prefAltitude: 0.5, plantType: PLANT_TYPES.GRASS }, // steppe shrub
	{ prefTemperature: 0.55, prefHumidity: 0.5, prefAltitude: 0.35, plantType: PLANT_TYPES.AQUATIC }, // kelp / shallow water
	{ prefTemperature: 0.78, prefHumidity: 0.5, prefAltitude: 0.38, plantType: PLANT_TYPES.AQUATIC }, // reef algae / warm shallows
	{ prefTemperature: 0.5, prefHumidity: 0.5, prefAltitude: 0.15, plantType: PLANT_TYPES.AQUATIC }, // plankton / open deep water
];

// Numeric BIOME_ID values (not string keys) since this is checked directly
// against the packed worldMap.biome grid in hot per-tile loops.
const WATER_BIOMES = new Set([
	BIOME_ID.OCEAN_DEEP,
	BIOME_ID.OCEAN,
	BIOME_ID.FROZEN_OCEAN,
	BIOME_ID.LAKE,
	BIOME_ID.RIVER,
	BIOME_ID.POND,
]);

const REGION_SIZE = 10;

class PlantSystem {
	constructor(worldMap, seed, options = {}) {
		this.worldMap = worldMap;
		this.rng = new SeededRandom(seed + 555);
		this.options = Object.assign(
			{
				initialPerSpecies: 14,
				// Tile-level crowding is a hard rule, not a gradual one: up to 2
				// plants share a tile fine, but a 3rd is fatal (see step()), and
				// reproduction can never push a tile past 3 in the first place.
				crowdingThreshold: 2,
				hardCellCap: 3,
				deathFitnessThreshold: 0.12,
				// Regional dominance: beyond this many plants in a 10x10 block,
				// they compete for shared nutrients and fitness decays gradually
				// (unlike the hard tile-level cutoff above).
				regionCap: 50,
				regionDecay: 0.98,
			},
			options
		);

		this.registry = new SpeciesRegistry();
		this.mutationTracker = new MutationTracker();
		this.plants = [];
		this.nextPlantId = 1;
		this.tick = 0;

		// occupancyCounts: every living plant, regardless of edibility — what
		// tile crowding and regional dominance care about.
		this.occupancyCounts = new Int16Array(worldMap.width * worldMap.height);
		// cellCounts: currently-edible plants (grass/fungus always; trees only
		// while fruiting) — this is what herbivores search for as food.
		this.cellCounts = new Int16Array(worldMap.width * worldMap.height);
		this.plantsByCell = new Map(); // cellIndex -> Plant[], lets herbivores find food in O(1)

		this.regionCols = Math.ceil(worldMap.width / REGION_SIZE);
		this.regionRows = Math.ceil(worldMap.height / REGION_SIZE);
		this.regionCounts = new Int32Array(this.regionCols * this.regionRows);

		this._previousLivingIds = new Set();

		this._seedFounders();
		this._recordHistory(); // capture tick-0 populations
	}

	// Aquatic plants can only take root in water tiles; every other type is
	// the reverse (land only) — same check, opposite polarity.
	isPlantable(x, y, plantType) {
		if (!this.worldMap.inBounds(x, y)) return false;
		const i = this.worldMap.idx(x, y);
		const isWater = WATER_BIOMES.has(this.worldMap.biome[i]);
		return plantType === PLANT_TYPES.AQUATIC ? isWater : !isWater;
	}

	_regionIndex(x, y) {
		return Math.floor(y / REGION_SIZE) * this.regionCols + Math.floor(x / REGION_SIZE);
	}

	_isEdible(plant) {
		return plant.plantType !== PLANT_TYPES.TREE || plant.hasFruit;
	}

	_seedFounders() {
		const { width, height } = this.worldMap;
		for (const archetype of FOUNDER_ARCHETYPES) {
			const genome = randomGenome(this.rng);
			genome[0] = clamp01(archetype.prefTemperature + (this.rng.next() - 0.5) * 0.08);
			genome[1] = clamp01(archetype.prefHumidity + (this.rng.next() - 0.5) * 0.08);
			genome[2] = clamp01(archetype.prefAltitude + (this.rng.next() - 0.5) * 0.08);

			const species = this.registry.createFounder(genome, 0, archetype.plantType);

			let placed = 0;
			let attempts = 0;
			const maxAttempts = this.options.initialPerSpecies * 60;
			while (placed < this.options.initialPerSpecies && attempts < maxAttempts) {
				attempts++;
				const x = Math.floor(this.rng.next() * width);
				const y = Math.floor(this.rng.next() * height);
				if (!this.isPlantable(x, y, archetype.plantType)) continue;
				if (this._hasSameSpecies(this.worldMap.idx(x, y), species.id)) continue;
				const cell = this.worldMap.getCell(x, y);
				const fitness = computeFitness(genome, cell.altitude, cell.temperature, cell.humidity);
				// Early on, require decent fitness; relax if we're struggling to place enough.
				const requiredFitness = attempts < maxAttempts * 0.7 ? 0.2 : 0;
				if (fitness < requiredFitness) continue;
				this._place(species.id, genome, x, y, archetype.plantType);
				placed++;
			}
		}
	}

	_place(speciesId, genome, x, y, plantType) {
		const plant = new Plant(this.nextPlantId++, speciesId, genome, x, y, plantType);
		this.plants.push(plant);
		const i = this.worldMap.idx(x, y);
		this.occupancyCounts[i]++;
		this.cellCounts[i]++; // freshly placed plants always start edible
		this.regionCounts[this._regionIndex(x, y)]++;
		this._indexAdd(plant);
		this.registry.incrementPopulation(speciesId);
		return plant;
	}

	_indexAdd(plant) {
		const i = this.worldMap.idx(plant.x, plant.y);
		let arr = this.plantsByCell.get(i);
		if (!arr) {
			arr = [];
			this.plantsByCell.set(i, arr);
		}
		arr.push(plant);
	}

	_indexRemove(plant) {
		const i = this.worldMap.idx(plant.x, plant.y);
		const arr = this.plantsByCell.get(i);
		if (!arr) return;
		const idx = arr.indexOf(plant);
		if (idx !== -1) arr.splice(idx, 1);
		if (arr.length === 0) this.plantsByCell.delete(i);
	}

	// A tile can host several *different* species (that's what the crowding
	// competition above is for) but never two individuals of the same
	// species — one plant already growing there crowds out its own kind.
	_hasSameSpecies(cellIdx, speciesId) {
		const arr = this.plantsByCell.get(cellIdx);
		return !!arr && arr.some((p) => p.speciesId === speciesId);
	}

	_killPlant(plant) {
		plant.alive = false;
		const i = this.worldMap.idx(plant.x, plant.y);
		this.occupancyCounts[i]--;
		if (this._isEdible(plant)) this.cellCounts[i]--;
		this.regionCounts[this._regionIndex(plant.x, plant.y)]--;
		this._indexRemove(plant);
		this.registry.decrementPopulation(plant.speciesId);
	}

	// Called by herbivores: consumes food on the given tile, if any.
	// Grass/fungus are fully consumed; a tree only loses its fruit and stays
	// standing, regrowing it after a cooldown. Returns the eaten Plant (for
	// its nutrition-relevant traits) or null.
	eatPlantAt(x, y) {
		const i = this.worldMap.idx(x, y);
		const arr = this.plantsByCell.get(i);
		if (!arr) return null;
		for (let k = arr.length - 1; k >= 0; k--) {
			const plant = arr[k];
			if (!this._isEdible(plant)) continue;

			if (plant.plantType === PLANT_TYPES.TREE) {
				plant.hasFruit = false;
				plant.fruitCooldown = Math.round(60 * (1 - plant.traits.growthRate) + 15);
				this.cellCounts[i]--;
			} else {
				arr.splice(k, 1);
				if (arr.length === 0) this.plantsByCell.delete(i);
				plant.alive = false;
				this.occupancyCounts[i]--;
				this.cellCounts[i]--;
				this.regionCounts[this._regionIndex(x, y)]--;
				this.registry.decrementPopulation(plant.speciesId);
			}
			return plant;
		}
		return null;
	}

	_maturityAge(growthRate) {
		return Math.max(4, Math.round(45 * (1 - growthRate) + 5));
	}

	// Beyond regionCap plants sharing a 10x10 block, fitness decays gradually
	// (shared nutrients running thin) rather than hitting a hard wall.
	_regionalFactor(x, y) {
		const count = this.regionCounts[this._regionIndex(x, y)];
		if (count <= this.options.regionCap) return 1;
		return Math.pow(this.options.regionDecay, count - this.options.regionCap);
	}

	step() {
		this.tick++;
		const survivors = [];
		const newborns = [];

		for (const plant of this.plants) {
			if (!plant.alive) continue; // fully-eaten grass/fungus removed earlier this tick

			plant.age++;
			const idx = this.worldMap.idx(plant.x, plant.y);

			// Trees regrow fruit on a cooldown instead of needing to reproduce
			// to become edible again.
			if (plant.plantType === PLANT_TYPES.TREE && !plant.hasFruit) {
				plant.fruitCooldown--;
				if (plant.fruitCooldown <= 0) {
					plant.hasFruit = true;
					this.cellCounts[idx]++;
				}
			}

			const traits = plant.traits;
			// Soil fertility is a global richness multiplier, not a per-species
			// preference — even barren ground gives a 50% floor, not a dead zone.
			const soilFactor = 0.5 + 0.5 * this.worldMap.fertility[idx];
			const baseFitness =
				computeFitnessFromTraits(
					traits,
					this.worldMap.altitude[idx],
					this.worldMap.temperature[idx],
					this.worldMap.humidity[idx]
				) * soilFactor;
			const occupancy = this.occupancyCounts[idx];
			const overcrowded = occupancy > this.options.crowdingThreshold; // tile has hit 3
			const regionalFactor = this._regionalFactor(plant.x, plant.y);
			const fitness = overcrowded ? 0 : baseFitness * regionalFactor;

			const tooOld = plant.age > traits.lifespan;
			let starving;
			if (overcrowded) {
				// Hardcoded: a 3rd plant sharing a tile is never sustainable.
				// Whichever plants on that tile are processed first this tick
				// die, which — since occupancy updates immediately — settles
				// the tile back down to 2 within a single step().
				starving = true;
			} else {
				// Gentler, continuous death chance for ordinary bad-fit conditions
				// (not overcrowding) — hardiness softens it but never to zero.
				const shortfall =
					Math.max(0, this.options.deathFitnessThreshold - fitness) / this.options.deathFitnessThreshold;
				const deathChance = shortfall * 0.5 * (1 - traits.hardiness * 0.8);
				starving = this.rng.next() < deathChance;
			}

			if (tooOld || starving) {
				this._killPlant(plant);
				continue;
			}

			if (!plant.mature && plant.age >= this._maturityAge(traits.growthRate)) {
				plant.mature = true;
			}

			survivors.push(plant);

			if (plant.mature) {
				const reproChance = traits.reproductionChance * Math.max(0, fitness);
				if (this.rng.next() < reproChance) {
					this._tryReproduce(plant, traits, newborns);
				}
			}
		}

		this.plants = survivors.concat(newborns);
		this._recordHistory();
	}

	// Samples population for every currently-living species (cheap: bounded by
	// living count via registry.livingIds, not by how many species ever
	// existed), plus any species that just went extinct this tick so its
	// chart shows the drop to zero.
	_recordHistory() {
		const toRecord = new Set([...this.registry.livingIds, ...this._previousLivingIds]);
		for (const id of toRecord) {
			const species = this.registry.get(id);
			species.pushHistory(this.tick, species.population);
		}
		this._previousLivingIds = new Set(this.registry.livingIds);
	}

	_tryReproduce(parent, parentTraits, newborns) {
		const angle = this.rng.next() * Math.PI * 2;
		const dist = 1 + this.rng.next() * parentTraits.dispersal;
		const tx = Math.round(parent.x + Math.cos(angle) * dist);
		const ty = Math.round(parent.y + Math.sin(angle) * dist);

		if (!this.isPlantable(tx, ty, parent.plantType)) return;
		const targetIdx = this.worldMap.idx(tx, ty);
		if (this.occupancyCounts[targetIdx] >= this.options.hardCellCap) return;

		const { genome: childGenome, severity } = mutateGenome(parent.genome, this.rng);
		const isOutlier = this.mutationTracker.isOutlier(severity);
		this.mutationTracker.record(severity);

		let speciesId = parent.speciesId;
		if (isOutlier) {
			const parentSpecies = this.registry.get(parent.speciesId);
			const newSpecies = this.registry.createDescendant(parentSpecies, childGenome, this.tick);
			speciesId = newSpecies.id;
		}

		// A freshly speciated offspring is always unique on this tile; only the
		// stay-in-parent-species case can collide with an existing occupant.
		if (!isOutlier && this._hasSameSpecies(targetIdx, speciesId)) return;

		const species = this.registry.get(speciesId);
		const plant = new Plant(this.nextPlantId++, speciesId, childGenome, tx, ty, species.subtype);
		newborns.push(plant);
		this.occupancyCounts[targetIdx]++;
		this.cellCounts[targetIdx]++;
		this.regionCounts[this._regionIndex(tx, ty)]++;
		this._indexAdd(plant);
		this.registry.incrementPopulation(speciesId);
	}

	getStats() {
		const living = this.registry.livingSpecies().sort((a, b) => b.population - a.population);
		return {
			tick: this.tick,
			totalPlants: this.plants.length,
			livingSpeciesCount: living.length,
			totalSpeciesEver: this.registry.species.size,
			topSpecies: living.slice(0, 16),
		};
	}
}

function clamp01(v) {
	return Math.min(1, Math.max(0, v));
}
