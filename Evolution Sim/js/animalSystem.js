// Animal population simulation, generic over "diet": a herbivore instance
// eats from a PlantSystem, a carnivore instance eats from a herbivore
// AnimalSystem. Both share genetics, movement, and speciation — only what
// counts as "food" differs. Mirrors plantSystem.js's mutation/speciation
// machinery but adds movement, energy, and taste/toxicity-driven nutrition.

class Animal {
	constructor(id, speciesId, genome, x, y) {
		this.id = id;
		this.speciesId = speciesId;
		this.genome = genome;
		// Decoded once at birth and reused every tick (genome is fixed for
		// life) — avoids re-allocating a traits object per animal per tick,
		// which matters a lot once populations run into the thousands.
		this.traits = readAnimalTraits(genome);
		this.x = x;
		this.y = y;
		this.age = 0;
		this.mature = false;
		this.energy = 0;
		this.thirst = 1; // 1 = fully hydrated, 0 = critical
		this.alive = true;
	}
}

// Five starting herbivore archetypes with distinct habitat preferences, so
// they spread across different parts of the map rather than one clump.
const HERBIVORE_ARCHETYPES = [
	{ prefTemperature: 0.5, prefHumidity: 0.45, prefAltitude: 0.48 }, // plains grazer
	{ prefTemperature: 0.5, prefHumidity: 0.65, prefAltitude: 0.55 }, // forest browser
	{ prefTemperature: 0.7, prefHumidity: 0.4, prefAltitude: 0.48 }, // savanna grazer
	{ prefTemperature: 0.2, prefHumidity: 0.45, prefAltitude: 0.5 }, // tundra grazer
	{ prefTemperature: 0.35, prefHumidity: 0.35, prefAltitude: 0.68 }, // highland grazer
];

// Two starting carnivore archetypes — fewer than herbivores, as befits an
// apex trophic level with a smaller sustainable population.
const CARNIVORE_ARCHETYPES = [
	{ prefTemperature: 0.5, prefHumidity: 0.45, prefAltitude: 0.5 }, // plains stalker
	{ prefTemperature: 0.45, prefHumidity: 0.62, prefAltitude: 0.55 }, // forest hunter
];

// Aquatic archetypes: prefAltitude sits underwater (below seaLevel), so
// these are only ever fit for ocean/lake/river/pond tiles. Mirrors the
// land archetypes structurally — same genetics, different habitat.
const AQUATIC_HERBIVORE_ARCHETYPES = [
	{ prefTemperature: 0.5, prefHumidity: 0.5, prefAltitude: 0.35 }, // reef grazer
	{ prefTemperature: 0.3, prefHumidity: 0.5, prefAltitude: 0.25 }, // open-water grazer
	{ prefTemperature: 0.65, prefHumidity: 0.5, prefAltitude: 0.38 }, // coastal grazer
];
const AQUATIC_CARNIVORE_ARCHETYPES = [
	{ prefTemperature: 0.45, prefHumidity: 0.5, prefAltitude: 0.3 }, // predatory fish
];

class AnimalSystem {
	constructor(worldMap, foodSystem, seed, options = {}) {
		this.worldMap = worldMap;
		this.foodSystem = foodSystem;
		this.kind = options.kind === 'carnivore' ? 'carnivore' : 'herbivore'; // eating/hunting behavior
		this.domain = options.domain === 'aquatic' ? 'aquatic' : 'land'; // movement rules
		const isCarnivore = this.kind === 'carnivore';
		const isAquatic = this.domain === 'aquatic';
		this.rng = new SeededRandom(seed + (isCarnivore ? 90210 : 31337) + (isAquatic ? 55011 : 0));

		const defaultArchetypes = isAquatic
			? isCarnivore
				? AQUATIC_CARNIVORE_ARCHETYPES
				: AQUATIC_HERBIVORE_ARCHETYPES
			: isCarnivore
			? CARNIVORE_ARCHETYPES
			: HERBIVORE_ARCHETYPES;

		this.options = Object.assign(
			{
				initialPerSpecies: isCarnivore ? 3 : 8,
				nutritionPerFood: isCarnivore ? 16 : 10,
				archetypes: defaultArchetypes,
			},
			options
		);

		// Naming/notability use a distinct pool for aquatic populations even
		// though the underlying behavior (herbivore/carnivore) is the same.
		const registryKind = isAquatic ? (isCarnivore ? 'aquaticCarnivore' : 'aquaticHerbivore') : this.kind;
		this.registry = new SpeciesRegistry(registryKind);
		this.mutationTracker = new MutationTracker();
		this.animals = [];
		this.nextAnimalId = 1;
		this.tick = 0;
		this.cellCounts = new Int16Array(worldMap.width * worldMap.height);
		this.animalsByCell = new Map(); // exposed so a predator system can prey on this one
		// Set from outside (main.js) after construction, once the predator
		// system exists — herbivores use it to spot and flee carnivores within
		// their field of view. Carnivores leave this null (nothing hunts them yet).
		this.threatSystem = options.threatSystem || null;
		// Also set from outside: the carnivore system a herbivore lineage can
		// evolve into. Only meaningful for herbivore instances.
		this.evolutionTarget = options.evolutionTarget || null;
		this._previousLivingIds = new Set();

		this._seedFounders();
		this._recordHistory();
	}

	_isWalkable(x, y) {
		if (!this.worldMap.inBounds(x, y)) return false;
		const i = this.worldMap.idx(x, y);
		const isWater = WATER_BIOMES.has(this.worldMap.biome[i]);
		return this.domain === 'aquatic' ? isWater : !isWater;
	}

	_seedFounders() {
		const { width, height } = this.worldMap;
		for (const archetype of this.options.archetypes) {
			const genome = randomAnimalGenome(this.rng);
			genome[0] = clamp01(archetype.prefTemperature + (this.rng.next() - 0.5) * 0.08);
			genome[1] = clamp01(archetype.prefHumidity + (this.rng.next() - 0.5) * 0.08);
			genome[2] = clamp01(archetype.prefAltitude + (this.rng.next() - 0.5) * 0.08);

			const species = this.registry.createFounder(genome, 0);
			const traits = readAnimalTraits(genome);

			let placed = 0;
			let attempts = 0;
			const maxAttempts = this.options.initialPerSpecies * 80;
			while (placed < this.options.initialPerSpecies && attempts < maxAttempts) {
				attempts++;
				const x = Math.floor(this.rng.next() * width);
				const y = Math.floor(this.rng.next() * height);
				if (!this._isWalkable(x, y)) continue;
				const cell = this.worldMap.getCell(x, y);
				const fitness = computeHabitatFitness(genome, cell.altitude, cell.temperature, cell.humidity);
				const requiredFitness = attempts < maxAttempts * 0.7 ? 0.25 : 0;
				if (fitness < requiredFitness) continue;
				this._place(species.id, genome, x, y, traits.maxEnergy * 0.85);
				placed++;
			}
		}
	}

	_place(speciesId, genome, x, y, energy) {
		const animal = new Animal(this.nextAnimalId++, speciesId, genome, x, y);
		animal.energy = energy;
		this.animals.push(animal);
		this._indexAdd(animal);
		this.registry.incrementPopulation(speciesId);
		return animal;
	}

	_indexAdd(animal) {
		const i = this.worldMap.idx(animal.x, animal.y);
		this.cellCounts[i]++;
		let arr = this.animalsByCell.get(i);
		if (!arr) {
			arr = [];
			this.animalsByCell.set(i, arr);
		}
		arr.push(animal);
	}

	_indexRemove(animal) {
		const i = this.worldMap.idx(animal.x, animal.y);
		this.cellCounts[i]--;
		const arr = this.animalsByCell.get(i);
		if (!arr) return;
		const idx = arr.indexOf(animal);
		if (idx !== -1) arr.splice(idx, 1);
		if (arr.length === 0) this.animalsByCell.delete(i);
	}

	_moveAnimalTo(animal, x, y) {
		if (x === animal.x && y === animal.y) return;
		this._indexRemove(animal);
		animal.x = x;
		animal.y = y;
		this._indexAdd(animal);
	}

	// Called by a predator system to look at (without consuming) a candidate
	// prey animal, so hunt success can be rolled against its actual traits
	// before deciding whether it actually gets eaten.
	peekAnimalAt(x, y) {
		const arr = this.animalsByCell.get(this.worldMap.idx(x, y));
		return arr && arr.length ? arr[arr.length - 1] : null;
	}

	// Called by a predator system: consumes one animal on the given tile, if
	// any. Returns the eaten Animal (for its traits) or null.
	eatAnimalAt(x, y) {
		const i = this.worldMap.idx(x, y);
		const arr = this.animalsByCell.get(i);
		if (!arr || arr.length === 0) return null;
		const animal = arr.pop();
		if (arr.length === 0) this.animalsByCell.delete(i);
		animal.alive = false;
		this.cellCounts[i]--;
		this.registry.decrementPopulation(animal.speciesId);
		return animal;
	}

	_maturityAge(lifespan) {
		return Math.max(10, Math.round(lifespan * 0.12));
	}

	// Walks (cx,cy) up to `steps` cells toward (tx,ty), one tile at a time,
	// stopping short of any unwalkable tile (e.g. water it can approach but
	// not stand on). Shared by all of this animal's directed movement.
	_stepToward(cx, cy, tx, ty, steps) {
		for (let s = 0; s < steps && (cx !== tx || cy !== ty); s++) {
			const dx = Math.sign(tx - cx);
			const dy = Math.sign(ty - cy);
			const nx = cx + dx;
			const ny = cy + dy;
			if (!this._isWalkable(nx, ny)) break;
			cx = nx;
			cy = ny;
		}
		return { x: cx, y: cy };
	}

	_wander(cx, cy, steps) {
		const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
		for (let s = 0; s < steps; s++) {
			const [dx, dy] = dirs[Math.floor(this.rng.next() * dirs.length)];
			const nx = cx + dx;
			const ny = cy + dy;
			if (this._isWalkable(nx, ny)) {
				cx = nx;
				cy = ny;
			}
		}
		return { x: cx, y: cy };
	}

	// Scans the vision radius for the tile with the most food and steps
	// (up to `speed` cells) toward it; wanders randomly if nothing's in range.
	_moveTowardFood(animal, traits) {
		const range = Math.min(Math.round(traits.visionRange), 10);
		const { width, height } = this.worldMap;
		const foodCounts = this.foodSystem.cellCounts;
		let bestX = -1;
		let bestY = -1;
		let bestCount = 0;

		for (let dy = -range; dy <= range; dy++) {
			const ny = animal.y + dy;
			if (ny < 0 || ny >= height) continue;
			for (let dx = -range; dx <= range; dx++) {
				if (dx === 0 && dy === 0) continue;
				const nx = animal.x + dx;
				if (nx < 0 || nx >= width) continue;
				const count = foodCounts[this.worldMap.idx(nx, ny)];
				// Only chase food on a tile this animal could actually stand on —
				// land and aquatic populations can share one food source (e.g.
				// land + aquatic herbivores both eat from the same PlantSystem),
				// so a high count can legitimately sit on terrain this animal
				// will never be able to reach.
				if (count > bestCount && this._isWalkable(nx, ny)) {
					bestCount = count;
					bestX = nx;
					bestY = ny;
				}
			}
		}

		const steps = Math.max(1, Math.round(traits.speed));
		const dest =
			bestCount > 0
				? this._stepToward(animal.x, animal.y, bestX, bestY, steps)
				: this._wander(animal.x, animal.y, steps);
		this._moveAnimalTo(animal, dest.x, dest.y);
	}

	// A tile itself can't be water (animals can't walk onto it), so "near
	// water" means one of its neighbors is a water tile.
	_isNearWater(x, y) {
		for (let dy = -1; dy <= 1; dy++) {
			for (let dx = -1; dx <= 1; dx++) {
				if (dx === 0 && dy === 0) continue;
				if (this.worldMap.isWaterTile(x + dx, y + dy)) return true;
			}
		}
		return false;
	}

	// Field of view scan for the nearest water tile — used when thirst gets
	// critical and there's nothing to drink close by.
	_scanForWater(animal, traits) {
		const range = Math.min(Math.round(traits.visionRange), 10);
		const { width, height } = this.worldMap;
		let bestX = -1;
		let bestY = -1;
		let bestDist = Infinity;

		for (let dy = -range; dy <= range; dy++) {
			const ny = animal.y + dy;
			if (ny < 0 || ny >= height) continue;
			for (let dx = -range; dx <= range; dx++) {
				const nx = animal.x + dx;
				if (nx < 0 || nx >= width) continue;
				if (!this.worldMap.isWaterTile(nx, ny)) continue;
				const dist = dx * dx + dy * dy;
				if (dist < bestDist) {
					bestDist = dist;
					bestX = nx;
					bestY = ny;
				}
			}
		}
		return bestX === -1 ? null : { x: bestX, y: bestY };
	}

	_moveTowardWater(animal, traits, target) {
		const steps = Math.max(1, Math.round(traits.speed));
		const dest = this._stepToward(animal.x, animal.y, target.x, target.y, steps);
		this._moveAnimalTo(animal, dest.x, dest.y);
	}

	// Herbivore field-of-view scan for the nearest tile occupied by a
	// carnivore — this is what lets prey notice and flee danger instead of
	// only reacting once a hunter is standing right on top of them.
	_scanForThreat(animal, traits) {
		if (!this.threatSystem) return null;
		const range = Math.min(Math.round(traits.visionRange), 10);
		const { width, height } = this.worldMap;
		const threatCounts = this.threatSystem.cellCounts;
		let bestX = -1;
		let bestY = -1;
		let bestDist = Infinity;

		for (let dy = -range; dy <= range; dy++) {
			const ny = animal.y + dy;
			if (ny < 0 || ny >= height) continue;
			for (let dx = -range; dx <= range; dx++) {
				const nx = animal.x + dx;
				if (nx < 0 || nx >= width) continue;
				if (threatCounts[this.worldMap.idx(nx, ny)] <= 0) continue;
				const dist = dx * dx + dy * dy;
				if (dist < bestDist) {
					bestDist = dist;
					bestX = nx;
					bestY = ny;
				}
			}
		}
		return bestX === -1 ? null : { x: bestX, y: bestY };
	}

	_fleeFrom(animal, traits, threat) {
		const steps = Math.max(1, Math.round(traits.speed));
		// A point mirrored away from the threat, far past the map edge if
		// need be — _stepToward only cares about direction, not distance.
		const awayX = animal.x + (animal.x - threat.x) * 10;
		const awayY = animal.y + (animal.y - threat.y) * 10;
		const dest = this._stepToward(animal.x, animal.y, awayX, awayY, steps);
		this._moveAnimalTo(animal, dest.x, dest.y);
	}

	// Nutrition from eating `prey` depends on how well its flavor matches the
	// eater's taste preference, and — for herbivores eating plants — how
	// toxic it is relative to the eater's tolerance.
	_computeNutrition(eaterTraits, prey) {
		const preyTraits = prey.traits; // cached on both Plant and Animal at birth
		const tasteMatch =
			gaussianMatch(preyTraits.flavorBitter, eaterTraits.tastePreferBitter, eaterTraits.tasteTolerance) *
			gaussianMatch(preyTraits.flavorSweet, eaterTraits.tastePreferSweet, eaterTraits.tasteTolerance);

		let nutrition = this.options.nutritionPerFood * (0.5 + 0.5 * tasteMatch);
		let poisoned = false;

		if (preyTraits.toxicity !== undefined) {
			const toxicEffect = Math.max(0, preyTraits.toxicity - eaterTraits.toxicityTolerance);
			nutrition *= 1 - toxicEffect * 0.7;
			nutrition -= toxicEffect * this.options.nutritionPerFood * 0.8;
			if (toxicEffect > 0.5 && this.rng.next() < (toxicEffect - 0.5) * 0.6) poisoned = true;
		}

		return { nutrition, poisoned };
	}

	// Whether a carnivore's hunt on a specific prey animal succeeds: its
	// aggression against the prey's blended evasion/camouflage/defense.
	// Centered at 50/50 when the two are equal.
	_rollHuntSuccess(hunterTraits, prey) {
		const preyTraits = prey.traits;
		const preyDefenseScore =
			preyTraits.evasion * 0.4 + preyTraits.camouflage * 0.3 + preyTraits.defenseStrength * 0.3;
		const huntChance = clamp01(0.5 + (hunterTraits.aggression - preyDefenseScore));
		return this.rng.next() < huntChance;
	}

	step() {
		this.tick++;
		const survivors = [];
		const newborns = [];

		for (const animal of this.animals) {
			if (!animal.alive) continue; // eaten by a predator earlier this tick

			animal.age++;
			const traits = animal.traits;
			const animalIdx = this.worldMap.idx(animal.x, animal.y);
			const habitatFitness = computeHabitatFitnessFromTraits(
				traits,
				this.worldMap.altitude[animalIdx],
				this.worldMap.temperature[animalIdx],
				this.worldMap.humidity[animalIdx]
			);

			// Living costs energy; poor habitat and low hardiness both raise the cost.
			const metabolicCost = traits.metabolism * (1.15 - 0.35 * habitatFitness) * (1 - 0.3 * traits.hardiness);
			animal.energy -= metabolicCost;

			// Thirst: depletes every tick, refills instantly when adjacent to any
			// water tile (ocean/lake/river/pond all count equally). Running dry
			// drains energy on top of the normal metabolic cost.
			animal.thirst = Math.max(0, animal.thirst - traits.thirstRate);
			if (this._isNearWater(animal.x, animal.y)) animal.thirst = 1;
			if (animal.thirst <= 0) {
				animal.energy -= 0.6 * (1 - traits.hardiness * 0.5);
			}

			// Field of view drives one action per tick, in priority order:
			// flee a spotted predator, eat if standing on food, seek out water
			// if critically thirsty, otherwise seek food (or wander blind).
			const threat = this.kind === 'herbivore' ? this._scanForThreat(animal, traits) : null;
			const onFood = this.foodSystem.cellCounts[animalIdx] > 0;

			if (threat) {
				this._fleeFrom(animal, traits, threat);
			} else if (onFood) {
				if (this.kind === 'carnivore') {
					// Prey can flee, hide, or fight off the attempt — a carnivore
					// finding a herbivore no longer guarantees a kill.
					const prey = this.foodSystem.peekAnimalAt(animal.x, animal.y);
					if (prey && this._rollHuntSuccess(traits, prey)) {
						const eaten = this.foodSystem.eatAnimalAt(animal.x, animal.y);
						if (eaten) {
							const { nutrition } = this._computeNutrition(traits, eaten);
							animal.energy = Math.min(traits.maxEnergy, animal.energy + nutrition);
						}
					}
				} else {
					const eaten = this.foodSystem.eatPlantAt(animal.x, animal.y);
					if (eaten) {
						const { nutrition, poisoned } = this._computeNutrition(traits, eaten);
						animal.energy = Math.min(traits.maxEnergy, animal.energy + nutrition);
						if (poisoned) animal.energy = -1; // fatal dose, resolved as starvation below
					}
				}
			} else if (animal.thirst < 0.35) {
				const water = this._scanForWater(animal, traits);
				if (water) this._moveTowardWater(animal, traits, water);
				else this._moveTowardFood(animal, traits);
			} else {
				this._moveTowardFood(animal, traits);
			}

			const tooOld = animal.age > traits.lifespan;
			const starved = animal.energy <= 0;
			if (tooOld || starved) {
				animal.alive = false;
				this._indexRemove(animal);
				this.registry.decrementPopulation(animal.speciesId);
				continue;
			}

			if (!animal.mature && animal.age >= this._maturityAge(traits.lifespan)) {
				animal.mature = true;
			}

			survivors.push(animal);

			if (animal.mature && animal.energy > traits.maxEnergy * 0.55) {
				const reproChance = traits.reproductionChance * habitatFitness;
				if (this.rng.next() < reproChance) {
					this._tryReproduce(animal, traits, newborns);
				}
			}
		}

		this.animals = survivors.concat(newborns);
		this._recordHistory();
	}

	_recordHistory() {
		const toRecord = new Set([...this.registry.livingIds, ...this._previousLivingIds]);
		for (const id of toRecord) {
			const species = this.registry.get(id);
			species.pushHistory(this.tick, species.population);
		}
		this._previousLivingIds = new Set(this.registry.livingIds);
	}

	// Rare event: instead of a normal litter, this reproduction produces a
	// single offspring that crosses into the carnivore population entirely.
	// More aggressive-tempered herbivores are more likely to make the jump —
	// aggression was otherwise a mostly-dormant trait for herbivores, so this
	// gives it a real payoff.
	_maybeEvolveToCarnivore(parent, parentTraits) {
		if (this.kind !== 'herbivore' || !this.evolutionTarget) return false;
		const evoChance = 0.003 + parentTraits.aggression * 0.012;
		if (this.rng.next() >= evoChance) return false;

		const target = this.evolutionTarget;
		const angle = this.rng.next() * Math.PI * 2;
		const dist = 1 + this.rng.next() * 2;
		const tx = Math.round(parent.x + Math.cos(angle) * dist);
		const ty = Math.round(parent.y + Math.sin(angle) * dist);
		if (!target._isWalkable(tx, ty)) return false;

		// Crossing diets is a bigger genetic leap than an ordinary speciation
		// event, so mutate harder and push explicitly toward predator traits.
		const { genome: childGenome } = mutateAnimalGenome(parent.genome, this.rng, 0.35, 0.18);
		bumpAnimalGene(childGenome, 'aggression', 0.3);
		bumpAnimalGene(childGenome, 'speed', 0.1);
		bumpAnimalGene(childGenome, 'evasion', -0.15);

		const parentSpeciesName = this.registry.get(parent.speciesId).name;
		const newSpecies = target.registry.createFounder(childGenome, target.tick);
		newSpecies.originNote = `evolved from ${parentSpeciesName}`;

		const energyGiven = parent.energy * parentTraits.parentalInvestment;
		parent.energy -= energyGiven;
		target._place(newSpecies.id, childGenome, tx, ty, energyGiven);
		return true;
	}

	// Produces a litter (1-4, genome-controlled) of offspring, each with an
	// independent mutation roll — litter-mates can end up in different
	// species if one drifts far enough. Energy is split across the litter,
	// so a large litter from a low-energy parent is a real gamble.
	_tryReproduce(parent, parentTraits, newborns) {
		if (this._maybeEvolveToCarnivore(parent, parentTraits)) return;

		const litterSize = Math.max(1, Math.round(parentTraits.litterSize));
		const totalEnergyGiven = parent.energy * parentTraits.parentalInvestment;
		parent.energy -= totalEnergyGiven;
		const energyPerOffspring = totalEnergyGiven / litterSize;

		for (let n = 0; n < litterSize; n++) {
			const angle = this.rng.next() * Math.PI * 2;
			const dist = 1 + this.rng.next() * 2;
			const tx = Math.round(parent.x + Math.cos(angle) * dist);
			const ty = Math.round(parent.y + Math.sin(angle) * dist);
			if (!this._isWalkable(tx, ty)) continue;

			const { genome: childGenome, severity } = mutateAnimalGenome(parent.genome, this.rng);
			const isOutlier = this.mutationTracker.isOutlier(severity);
			this.mutationTracker.record(severity);

			let speciesId = parent.speciesId;
			if (isOutlier) {
				const parentSpecies = this.registry.get(parent.speciesId);
				const newSpecies = this.registry.createDescendant(parentSpecies, childGenome, this.tick);
				speciesId = newSpecies.id;
			}

			const child = new Animal(this.nextAnimalId++, speciesId, childGenome, tx, ty);
			child.energy = energyPerOffspring;
			newborns.push(child);
			this._indexAdd(child);
			this.registry.incrementPopulation(speciesId);
		}
	}

	getStats() {
		const living = this.registry.livingSpecies().sort((a, b) => b.population - a.population);
		return {
			tick: this.tick,
			totalAnimals: this.animals.length,
			livingSpeciesCount: living.length,
			totalSpeciesEver: this.registry.species.size,
		};
	}
}
// clamp01() is defined in plantSystem.js and reused here (both load before this file).
