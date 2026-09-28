// Plant genome: a fixed-length array of normalized (0..1) genes, mutation,
// and the "mutation severity" measurement used to decide when an offspring
// diverges enough to be considered a new species.

// Each gene maps a 0..1 internal value onto a meaningful real-world range.
const GENE_DEFS = [
	{ key: 'prefTemperature', min: 0, max: 1 },
	{ key: 'prefHumidity', min: 0, max: 1 },
	{ key: 'prefAltitude', min: 0, max: 1 },
	{ key: 'temperatureTolerance', min: 0.06, max: 0.45 },
	{ key: 'humidityTolerance', min: 0.06, max: 0.45 },
	{ key: 'altitudeTolerance', min: 0.05, max: 0.4 },
	{ key: 'growthRate', min: 0.15, max: 1 }, // higher = matures faster
	{ key: 'reproductionChance', min: 0.01, max: 0.12 }, // per-tick chance once mature
	{ key: 'dispersal', min: 1, max: 14 }, // seed travel radius, in cells
	{ key: 'hardiness', min: 0, max: 1 }, // resilience to poor-fitness conditions
	{ key: 'lifespan', min: 200, max: 1400 }, // max age, in ticks
	{ key: 'flavorBitter', min: 0, max: 1 }, // taste identity, for herbivore preference matching
	{ key: 'flavorSweet', min: 0, max: 1 },
	{ key: 'toxicity', min: 0, max: 1 }, // defense: hurts herbivores that eat it past their tolerance
];

const GENE_COUNT = GENE_DEFS.length;

function randomGenome(rng) {
	const g = new Float32Array(GENE_COUNT);
	for (let i = 0; i < GENE_COUNT; i++) g[i] = rng.next();
	return g;
}

function readTraits(genome) {
	const traits = {};
	for (let i = 0; i < GENE_COUNT; i++) {
		const def = GENE_DEFS[i];
		traits[def.key] = def.min + genome[i] * (def.max - def.min);
	}
	return traits;
}

// Produces a mutated copy of a parent genome plus a severity score (0..~1+)
// describing how far the offspring drifted, in normalized gene-space.
function mutateGenome(parentGenome, rng, mutationRate = 0.15, mutationMagnitude = 0.08) {
	const child = new Float32Array(GENE_COUNT);
	let sumSq = 0;
	for (let i = 0; i < GENE_COUNT; i++) {
		let v = parentGenome[i];
		if (rng.next() < mutationRate) {
			// Sum of uniforms approximates a bell curve, cheap and dependency-free.
			const gauss = (rng.next() + rng.next() + rng.next() - 1.5) / 1.5;
			v += gauss * mutationMagnitude;
			v = Math.min(1, Math.max(0, v));
		}
		child[i] = v;
		const d = v - parentGenome[i];
		sumSq += d * d;
	}
	const severity = Math.sqrt(sumSq / GENE_COUNT);
	return { genome: child, severity };
}

// Gaussian falloff around a preferred value: 1 at a perfect match, decaying
// with distance at a rate set by `tolerance`. Shared by habitat fitness
// (genetics.js, animalGenetics.js) and taste-preference matching
// (animalSystem.js).
function gaussianMatch(value, pref, tolerance) {
	const d = (value - pref) / tolerance;
	return Math.exp(-(d * d));
}

// Gaussian-like suitability against actual cell conditions, from an
// already-decoded traits object. Traits never change after an organism is
// born (its genome is fixed), so callers should decode once at creation
// time (see Plant/Animal's cached `.traits`) and reuse it here every tick
// instead of paying readTraits()'s allocation cost repeatedly.
function computeFitnessFromTraits(t, altitude, temperature, humidity) {
	const fTemp = gaussianMatch(temperature, t.prefTemperature, t.temperatureTolerance);
	const fHum = gaussianMatch(humidity, t.prefHumidity, t.humidityTolerance);
	const fAlt = gaussianMatch(altitude, t.prefAltitude, t.altitudeTolerance);
	return fTemp * fHum * fAlt;
}

// Convenience wrapper for one-off calls where no cached traits exist yet
// (e.g. evaluating candidate seed locations before an organism is placed).
function computeFitness(genome, altitude, temperature, humidity) {
	return computeFitnessFromTraits(readTraits(genome), altitude, temperature, humidity);
}

// Ring-buffer of recent mutation severities, used to derive a live 99th
// percentile threshold. Below `minSamples` we don't have enough data to
// judge "outlier", so nothing can speciate yet.
class MutationTracker {
	constructor(capacity = 600, minSamples = 25) {
		this.capacity = capacity;
		this.minSamples = minSamples;
		this.buffer = [];
		this.cursor = 0;
	}

	record(severity) {
		if (this.buffer.length < this.capacity) {
			this.buffer.push(severity);
		} else {
			this.buffer[this.cursor] = severity;
			this.cursor = (this.cursor + 1) % this.capacity;
		}
	}

	// Returns true if `severity` exceeds the current 99th percentile of
	// previously recorded severities (evaluated BEFORE this one is recorded).
	isOutlier(severity) {
		if (this.buffer.length < this.minSamples) return false;
		const sorted = [...this.buffer].sort((a, b) => a - b);
		const idx = Math.min(sorted.length - 1, Math.ceil(0.99 * sorted.length) - 1);
		return severity > sorted[idx];
	}
}
