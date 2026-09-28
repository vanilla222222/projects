// Species bookkeeping: identity, lineage, color, and a light naming scheme.

const SPECIES_NAME_POOLS = {
	plant: {
		prefixes: ['Flor', 'Vira', 'Sylv', 'Ther', 'Xero', 'Hydro', 'Cryo', 'Pyro', 'Ombro', 'Aer',
			'Ver', 'Rubi', 'Glaci', 'Umbra', 'Luci', 'Petro', 'Fung', 'Radi', 'Nema', 'Chloro'],
		suffixes: ['anthus', 'folia', 'radix', 'flora', 'phyllum', 'nema', 'carpa', 'stemma', 'thallus', 'grass'],
	},
	herbivore: {
		prefixes: ['Grazi', 'Brows', 'Ambly', 'Cerat', 'Steno', 'Macro', 'Micro', 'Longi', 'Brevi', 'Duro',
			'Placi', 'Tardi', 'Agili', 'Rufo', 'Lani', 'Cursi', 'Grega', 'Timi', 'Vaga', 'Pasco'],
		suffixes: ['odon', 'therium', 'pod', 'ceros', 'hoof', 'grazer', 'muzzle', 'browser', 'herd', 'trot'],
	},
	carnivore: {
		prefixes: ['Fero', 'Sanguini', 'Velo', 'Rex', 'Toxo', 'Sicari', 'Umbro', 'Noctu', 'Rapax', 'Dente',
			'Ungui', 'Feralis', 'Vora', 'Preda', 'Sceler', 'Atro', 'Cruo', 'Malo', 'Spectri', 'Onych'],
		suffixes: ['raptor', 'fang', 'claw', 'stalker', 'gnathus', 'saurus', 'hunter', 'maw', 'talon', 'lurker'],
	},
	aquaticHerbivore: {
		prefixes: ['Pisci', 'Branchi', 'Squama', 'Fluvi', 'Marina', 'Litor', 'Pelagi', 'Corali', 'Kelpi', 'Abyssi',
			'Nauti', 'Undi', 'Riva', 'Lacus', 'Glauci', 'Argenti', 'Perli', 'Concha', 'Algi', 'Reefi'],
		suffixes: ['fin', 'gill', 'scale', 'finna', 'pisces', 'minnow', 'shoal', 'drift', 'glide', 'fry'],
	},
	aquaticCarnivore: {
		prefixes: ['Squali', 'Tibur', 'Preda', 'Vora', 'Denta', 'Feroci', 'Abyssi', 'Sangui', 'Rapa', 'Morsu',
			'Umbra', 'Noctu', 'Serra', 'Cursi', 'Atro', 'Glauci', 'Barra', 'Cruci', 'Spina', 'Gnathi'],
		suffixes: ['shark', 'fang', 'jaw', 'maw', 'strike', 'hunter', 'stalker', 'tooth', 'ripper', 'gnasher'],
	},
};

// Notability tiers scale with how populous a kind of organism realistically
// gets — each trophic level supports far fewer individuals than the one
// below it, so the bar drops sharply from plants to herbivores to carnivores.
const TIER_THRESHOLDS = {
	plant: { bronze: 1000, silver: 5000, gold: 10000 },
	herbivore: { bronze: 100, silver: 250, gold: 500 },
	carnivore: { bronze: 25, silver: 50, gold: 100 },
	aquaticHerbivore: { bronze: 100, silver: 250, gold: 500 },
	aquaticCarnivore: { bronze: 25, silver: 50, gold: 100 },
};

class Species {
	constructor(id, { genome, parentId = null, tick = 0, color, generation = 0, kind = 'plant', subtype = null }) {
		this.id = id;
		this.genome = genome;
		this.parentId = parentId;
		this.createdTick = tick;
		this.generation = generation;
		this.color = color;
		this.kind = kind;
		// A fixed lineage trait (e.g. plant type: grass/fungus/tree) — set once
		// at founding and inherited unchanged by every descendant. It never
		// mutates, unlike genome-encoded traits.
		this.subtype = subtype;
		this.name = Species.generateName(id, kind);
		this.population = 0;
		this.peakPopulation = 0;
		this.history = []; // { tick, population } samples over time, decimated when large
	}

	pushHistory(tick, population) {
		this.history.push({ tick, population });
		if (this.history.length > 2000) {
			const decimated = [];
			for (let i = 0; i < this.history.length; i += 2) decimated.push(this.history[i]);
			this.history = decimated;
		}
	}

	// Notability tier from all-time peak population: none / bronze / silver / gold.
	tier() {
		const t = TIER_THRESHOLDS[this.kind] || TIER_THRESHOLDS.plant;
		if (this.peakPopulation >= t.gold) return 'gold';
		if (this.peakPopulation >= t.silver) return 'silver';
		if (this.peakPopulation >= t.bronze) return 'bronze';
		return null;
	}

	static generateName(id, kind = 'plant') {
		const pool = SPECIES_NAME_POOLS[kind] || SPECIES_NAME_POOLS.plant;
		const prefix = pool.prefixes[id % pool.prefixes.length];
		const suffix = pool.suffixes[Math.floor(id / pool.prefixes.length) % pool.suffixes.length];
		return `${prefix}${suffix}`;
	}
}

class SpeciesRegistry {
	constructor(kind = 'plant') {
		this.kind = kind;
		this.species = new Map();
		this.nextId = 1;
		// Maintained incrementally at population-change time (see
		// increment/decrementPopulation) so livingSpecies()/notableSpecies()
		// don't have to rescan every species ever created — with heavy
		// speciation over a long run that list can get far larger than the
		// living population actually is.
		this.livingIds = new Set();
		this.notableIds = new Set();
	}

	static colorForId(id) {
		// Golden-ratio hue spacing keeps successive species visually distinct.
		const hue = (id * 137.508) % 360;
		return `hsl(${hue.toFixed(1)}, 70%, 55%)`;
	}

	createFounder(genome, tick = 0, subtype = null) {
		const id = this.nextId++;
		const species = new Species(id, {
			genome,
			parentId: null,
			tick,
			color: SpeciesRegistry.colorForId(id),
			generation: 0,
			kind: this.kind,
			subtype,
		});
		this.species.set(id, species);
		return species;
	}

	createDescendant(parentSpecies, genome, tick) {
		const id = this.nextId++;
		const species = new Species(id, {
			genome,
			parentId: parentSpecies.id,
			tick,
			color: SpeciesRegistry.colorForId(id),
			generation: parentSpecies.generation + 1,
			kind: this.kind,
			subtype: parentSpecies.subtype,
		});
		this.species.set(id, species);
		return species;
	}

	get(id) {
		return this.species.get(id);
	}

	incrementPopulation(id) {
		const species = this.species.get(id);
		species.population++;
		if (species.population === 1) this.livingIds.add(id);
		if (species.population > species.peakPopulation) {
			species.peakPopulation = species.population;
			if (!this.notableIds.has(id) && species.tier() !== null) this.notableIds.add(id);
		}
	}

	decrementPopulation(id) {
		const species = this.species.get(id);
		species.population--;
		if (species.population <= 0) this.livingIds.delete(id);
	}

	// Species with zero living population but still on record (for lineage/history).
	livingSpecies() {
		const result = [];
		for (const id of this.livingIds) result.push(this.species.get(id));
		return result;
	}

	// Species that ever crossed this kind's peak-population notability bar;
	// stays listed permanently even after the species goes extinct.
	notableSpecies() {
		const result = [];
		for (const id of this.notableIds) result.push(this.species.get(id));
		return result.sort((a, b) => b.peakPopulation - a.peakPopulation);
	}
}
