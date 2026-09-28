// Herbivore genome: same normalized (0..1) gene-array approach as plants
// (see genetics.js), but with animal-relevant traits — mobility, senses,
// and metabolism — instead of growth/dispersal.

const ANIMAL_GENE_DEFS = [
	{ key: 'prefTemperature', min: 0, max: 1 },
	{ key: 'prefHumidity', min: 0, max: 1 },
	{ key: 'prefAltitude', min: 0, max: 1 },
	{ key: 'temperatureTolerance', min: 0.08, max: 0.5 },
	{ key: 'humidityTolerance', min: 0.08, max: 0.5 },
	{ key: 'altitudeTolerance', min: 0.06, max: 0.45 },
	{ key: 'speed', min: 1, max: 3 }, // cells moved per tick
	{ key: 'visionRange', min: 2, max: 9 }, // cells scanned for food
	{ key: 'metabolism', min: 0.2, max: 1.2 }, // energy spent per tick just living
	{ key: 'reproductionChance', min: 0.02, max: 0.16 }, // per-tick chance once mature & fed
	{ key: 'hardiness', min: 0, max: 1 }, // resilience to poor habitat / low food
	{ key: 'lifespan', min: 150, max: 2200 }, // max age, in ticks
	{ key: 'maxEnergy', min: 18, max: 45 }, // energy storage capacity
	{ key: 'flavorBitter', min: 0, max: 1 }, // this animal's own taste identity, as prey
	{ key: 'flavorSweet', min: 0, max: 1 },
	{ key: 'tastePreferBitter', min: 0, max: 1 }, // preferred taste in food
	{ key: 'tastePreferSweet', min: 0, max: 1 },
	{ key: 'tasteTolerance', min: 0.15, max: 0.6 }, // how picky about taste match
	{ key: 'toxicityTolerance', min: 0, max: 1 }, // resistance to toxic plants (herbivores only)
	{ key: 'evasion', min: 0, max: 1 }, // chance to flee a predator before capture
	{ key: 'camouflage', min: 0, max: 1 }, // chance to go unnoticed by a hunting predator
	{ key: 'defenseStrength', min: 0, max: 1 }, // fights off capture even when caught
	{ key: 'aggression', min: 0, max: 1 }, // predator's hunting drive/success (carnivores)
	{ key: 'litterSize', min: 1, max: 4 }, // offspring produced per reproduction event
	{ key: 'parentalInvestment', min: 0.2, max: 0.6 }, // fraction of energy given to a litter
	{ key: 'thirstRate', min: 0.004, max: 0.02 }, // thirst depleted per tick (1.0 = full)
];

const ANIMAL_GENE_COUNT = ANIMAL_GENE_DEFS.length;

function randomAnimalGenome(rng) {
	const g = new Float32Array(ANIMAL_GENE_COUNT);
	for (let i = 0; i < ANIMAL_GENE_COUNT; i++) g[i] = rng.next();
	return g;
}

function readAnimalTraits(genome) {
	const traits = {};
	for (let i = 0; i < ANIMAL_GENE_COUNT; i++) {
		const def = ANIMAL_GENE_DEFS[i];
		traits[def.key] = def.min + genome[i] * (def.max - def.min);
	}
	return traits;
}

function mutateAnimalGenome(parentGenome, rng, mutationRate = 0.15, mutationMagnitude = 0.08) {
	const child = new Float32Array(ANIMAL_GENE_COUNT);
	let sumSq = 0;
	for (let i = 0; i < ANIMAL_GENE_COUNT; i++) {
		let v = parentGenome[i];
		if (rng.next() < mutationRate) {
			const gauss = (rng.next() + rng.next() + rng.next() - 1.5) / 1.5;
			v += gauss * mutationMagnitude;
			v = Math.min(1, Math.max(0, v));
		}
		child[i] = v;
		const d = v - parentGenome[i];
		sumSq += d * d;
	}
	const severity = Math.sqrt(sumSq / ANIMAL_GENE_COUNT);
	return { genome: child, severity };
}

// Nudges a single gene by a fixed amount (used when a lineage crosses into
// a new diet — e.g. herbivore evolving into carnivore — and needs a push
// toward predator-shaped traits beyond normal mutation).
function bumpAnimalGene(genome, key, delta) {
	const idx = ANIMAL_GENE_DEFS.findIndex((d) => d.key === key);
	if (idx === -1) return;
	genome[idx] = Math.min(1, Math.max(0, genome[idx] + delta));
}

// How well-suited an animal's habitat preferences are to the terrain it's
// standing on — independent of food availability, which is handled by
// energy/eating in animalSystem.js. Takes already-decoded traits (see
// Animal's cached `.traits`) to avoid re-allocating a traits object every
// tick for every animal.
function computeHabitatFitnessFromTraits(t, altitude, temperature, humidity) {
	const fTemp = gaussianMatch(temperature, t.prefTemperature, t.temperatureTolerance);
	const fHum = gaussianMatch(humidity, t.prefHumidity, t.humidityTolerance);
	const fAlt = gaussianMatch(altitude, t.prefAltitude, t.altitudeTolerance);
	return fTemp * fHum * fAlt;
}

// Convenience wrapper for one-off calls where no cached traits exist yet.
function computeHabitatFitness(genome, altitude, temperature, humidity) {
	return computeHabitatFitnessFromTraits(readAnimalTraits(genome), altitude, temperature, humidity);
}
