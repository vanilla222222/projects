// Wires up the UI controls to map generation, rendering, map zoom/pan, and
// the plant + herbivore + carnivore evolution simulation loop + species panels.

(function () {
	const canvas = document.getElementById('mapCanvas');
	const renderer = new MapRenderer(canvas);
	const mapViewport = document.getElementById('mapViewport');

	const seedInput = document.getElementById('seedInput');
	const widthInput = document.getElementById('widthInput');
	const heightInput = document.getElementById('heightInput');
	const viewModeSelect = document.getElementById('viewMode');
	const generateBtn = document.getElementById('generateBtn');
	const randomSeedBtn = document.getElementById('randomSeedBtn');
	const tooltip = document.getElementById('tooltip');
	const legend = document.getElementById('legend');

	const showPlantsInput = document.getElementById('showPlants');
	const showAnimalsInput = document.getElementById('showAnimals');
	const showCarnivoresInput = document.getElementById('showCarnivores');
	const showAquaticAnimalsInput = document.getElementById('showAquaticAnimals');
	const showAquaticCarnivoresInput = document.getElementById('showAquaticCarnivores');
	const playPauseBtn = document.getElementById('playPauseBtn');
	const stepBtn = document.getElementById('stepBtn');
	const speedInput = document.getElementById('speedInput');
	const speedLabel = document.getElementById('speedLabel');
	const statTick = document.getElementById('statTick');
	const statPlants = document.getElementById('statPlants');
	const statSpecies = document.getElementById('statSpecies');
	const statSpeciesEver = document.getElementById('statSpeciesEver');
	const statAnimals = document.getElementById('statAnimals');
	const statAnimalSpecies = document.getElementById('statAnimalSpecies');
	const statAnimalSpeciesEver = document.getElementById('statAnimalSpeciesEver');
	const statCarnivores = document.getElementById('statCarnivores');
	const statCarnivoreSpecies = document.getElementById('statCarnivoreSpecies');
	const statCarnivoreSpeciesEver = document.getElementById('statCarnivoreSpeciesEver');
	const statAquaticAnimals = document.getElementById('statAquaticAnimals');
	const statAquaticAnimalSpecies = document.getElementById('statAquaticAnimalSpecies');
	const statAquaticAnimalSpeciesEver = document.getElementById('statAquaticAnimalSpeciesEver');
	const statAquaticCarnivores = document.getElementById('statAquaticCarnivores');
	const statAquaticCarnivoreSpecies = document.getElementById('statAquaticCarnivoreSpecies');
	const statAquaticCarnivoreSpeciesEver = document.getElementById('statAquaticCarnivoreSpeciesEver');

	const zoomInBtn = document.getElementById('zoomInBtn');
	const zoomOutBtn = document.getElementById('zoomOutBtn');
	const zoomResetBtn = document.getElementById('zoomResetBtn');
	const zoomLabel = document.getElementById('zoomLabel');

	const speciesDetailEl = document.getElementById('speciesDetail');
	const detailNameEl = document.getElementById('detailName');
	const detailMetaEl = document.getElementById('detailMeta');
	const detailTraitsEl = document.getElementById('detailTraits');
	const speciesChartCanvas = document.getElementById('speciesChart');
	const closeDetailBtn = document.getElementById('closeDetailBtn');

	// Config-driven per-kind panel wiring: one entry per trophic level, each
	// pointing at its live-list / notable-list DOM nodes and an accessor for
	// its simulation system (systems don't exist until generate() runs).
	const KIND_PANELS = {
		plant: {
			icon: '🌿',
			listEl: document.getElementById('speciesList'),
			notableEl: document.getElementById('notableList'),
			emptyText: 'No living species.',
			notableEmptyText: 'None yet — reach 1000 population.',
			system: () => plantSystem,
		},
		herbivore: {
			icon: '🦌',
			listEl: document.getElementById('animalList'),
			notableEl: document.getElementById('notableAnimalList'),
			emptyText: 'No living herbivores.',
			notableEmptyText: 'None yet — reach 100 population.',
			system: () => herbivoreSystem,
		},
		carnivore: {
			icon: '🐺',
			listEl: document.getElementById('carnivoreList'),
			notableEl: document.getElementById('notableCarnivoreList'),
			emptyText: 'No living carnivores.',
			notableEmptyText: 'None yet — reach 25 population.',
			system: () => carnivoreSystem,
		},
		aquaticHerbivore: {
			icon: '🐟',
			listEl: document.getElementById('aquaticAnimalList'),
			notableEl: document.getElementById('notableAquaticAnimalList'),
			emptyText: 'No living aquatic herbivores.',
			notableEmptyText: 'None yet — reach 100 population.',
			system: () => aquaticHerbivoreSystem,
		},
		aquaticCarnivore: {
			icon: '🦈',
			listEl: document.getElementById('aquaticCarnivoreList'),
			notableEl: document.getElementById('notableAquaticCarnivoreList'),
			emptyText: 'No living aquatic carnivores.',
			notableEmptyText: 'None yet — reach 25 population.',
			system: () => aquaticCarnivoreSystem,
		},
	};

	let worldMap = null;
	let plantSystem = null;
	let herbivoreSystem = null;
	let carnivoreSystem = null;
	let aquaticHerbivoreSystem = null;
	let aquaticCarnivoreSystem = null;
	let running = false;
	let intervalHandle = null;
	let zoom = 1;
	let selectedKind = null; // 'plant' | 'herbivore' | 'carnivore' | 'aquaticHerbivore' | 'aquaticCarnivore'
	let selectedSpeciesId = null;

	const MIN_ZOOM = 0.05;
	const MAX_ZOOM = 20;

	function randomSeed() {
		return Math.floor(Math.random() * 1_000_000_000);
	}

	function clamp(v, min, max) {
		return Math.min(max, Math.max(min, v));
	}

	function buildBiomeLegend() {
		legend.innerHTML = '';
		for (const id of Object.keys(BIOME_INFO)) {
			const info = BIOME_INFO[id];
			const item = document.createElement('div');
			item.className = 'legend-item';
			const swatch = document.createElement('span');
			swatch.className = 'legend-swatch';
			swatch.style.background = info.color;
			const label = document.createElement('span');
			label.textContent = info.name;
			item.appendChild(swatch);
			item.appendChild(label);
			legend.appendChild(item);
		}
	}

	// --- Zoom / pan -----------------------------------------------------

	function applyZoom() {
		if (!worldMap) return;
		canvas.style.width = Math.round(worldMap.width * zoom) + 'px';
		canvas.style.height = Math.round(worldMap.height * zoom) + 'px';
		zoomLabel.textContent = Math.round(zoom * 100) + '%';
	}

	function fitZoom() {
		if (!worldMap) return 1;
		const vw = mapViewport.clientWidth - 4;
		const vh = mapViewport.clientHeight - 4;
		return clamp(Math.min(vw / worldMap.width, vh / worldMap.height), MIN_ZOOM, 1);
	}

	function setZoomAtPoint(newZoom, clientX, clientY) {
		const rect = mapViewport.getBoundingClientRect();
		const localX = clientX - rect.left + mapViewport.scrollLeft;
		const localY = clientY - rect.top + mapViewport.scrollTop;
		const worldX = localX / zoom;
		const worldY = localY / zoom;

		zoom = clamp(newZoom, MIN_ZOOM, MAX_ZOOM);
		applyZoom();

		mapViewport.scrollLeft = worldX * zoom - (clientX - rect.left);
		mapViewport.scrollTop = worldY * zoom - (clientY - rect.top);
	}

	zoomInBtn.addEventListener('click', () => {
		const rect = mapViewport.getBoundingClientRect();
		setZoomAtPoint(zoom * 1.4, rect.left + rect.width / 2, rect.top + rect.height / 2);
	});
	zoomOutBtn.addEventListener('click', () => {
		const rect = mapViewport.getBoundingClientRect();
		setZoomAtPoint(zoom / 1.4, rect.left + rect.width / 2, rect.top + rect.height / 2);
	});
	zoomResetBtn.addEventListener('click', () => {
		zoom = fitZoom();
		applyZoom();
		mapViewport.scrollLeft = 0;
		mapViewport.scrollTop = 0;
	});

	mapViewport.addEventListener(
		'wheel',
		(e) => {
			if (!worldMap) return;
			e.preventDefault();
			const factor = e.deltaY < 0 ? 1.18 : 1 / 1.18;
			setZoomAtPoint(zoom * factor, e.clientX, e.clientY);
		},
		{ passive: false }
	);

	let isPanning = false;
	let panStart = { x: 0, y: 0, scrollLeft: 0, scrollTop: 0 };
	canvas.addEventListener('mousedown', (e) => {
		isPanning = true;
		panStart = { x: e.clientX, y: e.clientY, scrollLeft: mapViewport.scrollLeft, scrollTop: mapViewport.scrollTop };
	});
	window.addEventListener('mousemove', (e) => {
		if (!isPanning) return;
		mapViewport.scrollLeft = panStart.scrollLeft - (e.clientX - panStart.x);
		mapViewport.scrollTop = panStart.scrollTop - (e.clientY - panStart.y);
	});
	window.addEventListener('mouseup', () => {
		isPanning = false;
	});

	// --- Rendering / stats ------------------------------------------------

	function redraw() {
		renderer.render(worldMap, viewModeSelect.value);
		if (showPlantsInput.checked && plantSystem) renderer.renderPlants(plantSystem);
		if (showAnimalsInput.checked && herbivoreSystem) renderer.renderAnimals(herbivoreSystem);
		if (showCarnivoresInput.checked && carnivoreSystem) renderer.renderAnimals(carnivoreSystem);
		if (showAquaticAnimalsInput.checked && aquaticHerbivoreSystem) renderer.renderAnimals(aquaticHerbivoreSystem);
		if (showAquaticCarnivoresInput.checked && aquaticCarnivoreSystem) renderer.renderAnimals(aquaticCarnivoreSystem);
	}

	function formatPlantTraits(genome) {
		const t = readTraits(genome);
		return {
			'Pref. temp': t.prefTemperature.toFixed(2),
			'Pref. humidity': t.prefHumidity.toFixed(2),
			'Pref. altitude': t.prefAltitude.toFixed(2),
			'Growth rate': t.growthRate.toFixed(2),
			'Repro. chance': t.reproductionChance.toFixed(3),
			Dispersal: t.dispersal.toFixed(1),
			Hardiness: t.hardiness.toFixed(2),
			Lifespan: Math.round(t.lifespan),
			'Flavor (bitter/sweet)': `${t.flavorBitter.toFixed(2)} / ${t.flavorSweet.toFixed(2)}`,
			Toxicity: t.toxicity.toFixed(2),
		};
	}

	function formatAnimalTraits(genome, kind) {
		const t = readAnimalTraits(genome);
		const traits = {
			'Pref. temp': t.prefTemperature.toFixed(2),
			'Pref. humidity': t.prefHumidity.toFixed(2),
			'Pref. altitude': t.prefAltitude.toFixed(2),
			Speed: t.speed.toFixed(1),
			Vision: t.visionRange.toFixed(1),
			Metabolism: t.metabolism.toFixed(2),
			'Repro. chance': t.reproductionChance.toFixed(3),
			Hardiness: t.hardiness.toFixed(2),
			Lifespan: Math.round(t.lifespan),
			'Max energy': Math.round(t.maxEnergy),
			'Flavor (bitter/sweet)': `${t.flavorBitter.toFixed(2)} / ${t.flavorSweet.toFixed(2)}`,
			'Taste pref. (bitter/sweet)': `${t.tastePreferBitter.toFixed(2)} / ${t.tastePreferSweet.toFixed(2)}`,
			'Taste tolerance': t.tasteTolerance.toFixed(2),
			Evasion: t.evasion.toFixed(2),
			Camouflage: t.camouflage.toFixed(2),
			Defense: t.defenseStrength.toFixed(2),
			Aggression: t.aggression.toFixed(2),
			'Litter size': Math.round(t.litterSize),
			'Parental investment': t.parentalInvestment.toFixed(2),
			'Thirst rate': t.thirstRate.toFixed(3),
		};
		if (kind === 'herbivore' || kind === 'aquaticHerbivore') traits['Toxicity tolerance'] = t.toxicityTolerance.toFixed(2);
		return traits;
	}

	function renderSpeciesDetail() {
		const panel = selectedKind ? KIND_PANELS[selectedKind] : null;
		const system = panel ? panel.system() : null;
		const species = system && selectedSpeciesId !== null ? system.registry.get(selectedSpeciesId) : null;
		if (!species) {
			speciesDetailEl.classList.add('hidden');
			return;
		}
		speciesDetailEl.classList.remove('hidden');
		detailNameEl.textContent = `${species.name} ${panel.icon}`;
		detailNameEl.style.color = species.color;

		const parent = species.parentId ? system.registry.get(species.parentId) : null;
		const subtypeLine = species.subtype ? `Type: ${species.subtype}<br>` : '';
		const ancestorLine = species.originNote
			? `Origin: ${species.originNote}<br>`
			: `Ancestor: ${parent ? parent.name : '— founding species —'}<br>`;
		detailMetaEl.innerHTML =
			subtypeLine +
			`Generation ${species.generation} · born tick ${species.createdTick}<br>` +
			ancestorLine +
			`Population now: ${species.population} · peak: ${species.peakPopulation}`;

		drawLineChart(speciesChartCanvas, species.history, { color: species.color });

		const traits =
			selectedKind === 'plant' ? formatPlantTraits(species.genome) : formatAnimalTraits(species.genome, selectedKind);
		detailTraitsEl.innerHTML = Object.entries(traits)
			.map(([k, v]) => `<span>${k}</span><strong>${v}</strong>`)
			.join('');
	}

	function selectSpecies(kind, id) {
		selectedKind = kind;
		selectedSpeciesId = id;
		refreshPanels();
		renderSpeciesDetail();
	}

	function renderList(container, species, kind, emptyText) {
		container.innerHTML = '';
		if (species.length === 0) {
			const note = document.createElement('div');
			note.className = 'empty-note';
			note.textContent = emptyText;
			container.appendChild(note);
			return;
		}
		for (const s of species) {
			const item = document.createElement('div');
			item.className = 'species-item' + (kind === selectedKind && s.id === selectedSpeciesId ? ' selected' : '');
			item.addEventListener('click', () => selectSpecies(kind, s.id));

			const swatch = document.createElement('span');
			swatch.className = 'species-swatch';
			swatch.style.background = s.color;

			const name = document.createElement('span');
			name.textContent = s.name;

			const pop = document.createElement('span');
			pop.className = 'pop';
			pop.textContent = s.population;

			item.appendChild(swatch);
			item.appendChild(name);
			item.appendChild(pop);
			container.appendChild(item);
		}
	}

	function renderNotableList(container, species, kind, emptyText) {
		container.innerHTML = '';
		if (species.length === 0) {
			const note = document.createElement('div');
			note.className = 'empty-note';
			note.textContent = emptyText;
			container.appendChild(note);
			return;
		}
		for (const s of species) {
			const item = document.createElement('div');
			item.className =
				`notable-item tier-${s.tier()}` + (kind === selectedKind && s.id === selectedSpeciesId ? ' selected' : '');
			item.addEventListener('click', () => selectSpecies(kind, s.id));

			const swatch = document.createElement('span');
			swatch.className = 'species-swatch';
			swatch.style.background = s.color;

			const name = document.createElement('span');
			name.className = 'name';
			name.textContent = s.name;

			const pop = document.createElement('span');
			pop.className = 'pop';
			pop.textContent = `peak ${s.peakPopulation}`;

			item.appendChild(swatch);
			item.appendChild(name);
			item.appendChild(pop);
			container.appendChild(item);
		}
	}

	function refreshPanels() {
		for (const kind of Object.keys(KIND_PANELS)) {
			const panel = KIND_PANELS[kind];
			const system = panel.system();
			if (!system) continue;
			const living = system.registry.livingSpecies().sort((a, b) => b.population - a.population);
			renderList(panel.listEl, living, kind, panel.emptyText);
			renderNotableList(panel.notableEl, system.registry.notableSpecies(), kind, panel.notableEmptyText);
		}
	}

	// Full species-list DOM rebuilds are comparatively expensive (one DOM
	// node per living species, across four panels) — while the sim is
	// running continuously we only need to refresh them a few times a
	// second, not on every single tick. The detail chart/stat numbers stay
	// smooth every tick regardless since those are cheap.
	const PANEL_REFRESH_INTERVAL = 5;

	function updateStats() {
		if (plantSystem) {
			const stats = plantSystem.getStats();
			statTick.textContent = stats.tick;
			statPlants.textContent = stats.totalPlants;
			statSpecies.textContent = stats.livingSpeciesCount;
			statSpeciesEver.textContent = stats.totalSpeciesEver;
		}
		if (herbivoreSystem) {
			const stats = herbivoreSystem.getStats();
			statAnimals.textContent = stats.totalAnimals;
			statAnimalSpecies.textContent = stats.livingSpeciesCount;
			statAnimalSpeciesEver.textContent = stats.totalSpeciesEver;
		}
		if (carnivoreSystem) {
			const stats = carnivoreSystem.getStats();
			statCarnivores.textContent = stats.totalAnimals;
			statCarnivoreSpecies.textContent = stats.livingSpeciesCount;
			statCarnivoreSpeciesEver.textContent = stats.totalSpeciesEver;
		}
		if (aquaticHerbivoreSystem) {
			const stats = aquaticHerbivoreSystem.getStats();
			statAquaticAnimals.textContent = stats.totalAnimals;
			statAquaticAnimalSpecies.textContent = stats.livingSpeciesCount;
			statAquaticAnimalSpeciesEver.textContent = stats.totalSpeciesEver;
		}
		if (aquaticCarnivoreSystem) {
			const stats = aquaticCarnivoreSystem.getStats();
			statAquaticCarnivores.textContent = stats.totalAnimals;
			statAquaticCarnivoreSpecies.textContent = stats.livingSpeciesCount;
			statAquaticCarnivoreSpeciesEver.textContent = stats.totalSpeciesEver;
		}
		renderSpeciesDetail();
		const tick = plantSystem ? plantSystem.tick : 0;
		if (!running || tick % PANEL_REFRESH_INTERVAL === 0) refreshPanels();
	}

	closeDetailBtn.addEventListener('click', () => selectSpecies(null, null));

	function stepOnce() {
		if (!plantSystem || !herbivoreSystem || !carnivoreSystem || !aquaticHerbivoreSystem || !aquaticCarnivoreSystem) {
			return;
		}
		plantSystem.step();
		herbivoreSystem.step();
		carnivoreSystem.step();
		aquaticHerbivoreSystem.step();
		aquaticCarnivoreSystem.step();
		redraw();
		updateStats();
	}

	function setRunning(next) {
		running = next;
		playPauseBtn.textContent = running ? '⏸ Pause' : '▶ Start';
		if (intervalHandle) {
			clearInterval(intervalHandle);
			intervalHandle = null;
		}
		if (running) {
			const ticksPerSecond = parseInt(speedInput.value, 10);
			intervalHandle = setInterval(stepOnce, 1000 / ticksPerSecond);
		}
	}

	function generate() {
		setRunning(false);
		selectedKind = null;
		selectedSpeciesId = null;

		const seed = parseInt(seedInput.value, 10) || 1;
		const width = Math.max(50, Math.min(2000, parseInt(widthInput.value, 10) || 300));
		const height = Math.max(50, Math.min(2000, parseInt(heightInput.value, 10) || 200));
		widthInput.value = width;
		heightInput.value = height;

		worldMap = new WorldMap(width, height, seed);
		plantSystem = new PlantSystem(worldMap, seed);
		herbivoreSystem = new AnimalSystem(worldMap, plantSystem, seed, { kind: 'herbivore' });
		carnivoreSystem = new AnimalSystem(worldMap, herbivoreSystem, seed, { kind: 'carnivore' });
		herbivoreSystem.threatSystem = carnivoreSystem; // lets herbivores spot and flee carnivores in their FOV
		herbivoreSystem.evolutionTarget = carnivoreSystem; // lets a herbivore lineage evolve into a carnivore one

		aquaticHerbivoreSystem = new AnimalSystem(worldMap, plantSystem, seed + 500, {
			kind: 'herbivore',
			domain: 'aquatic',
		});
		aquaticCarnivoreSystem = new AnimalSystem(worldMap, aquaticHerbivoreSystem, seed + 600, {
			kind: 'carnivore',
			domain: 'aquatic',
		});
		aquaticHerbivoreSystem.threatSystem = aquaticCarnivoreSystem;
		aquaticHerbivoreSystem.evolutionTarget = aquaticCarnivoreSystem;

		zoom = fitZoom();
		applyZoom();
		mapViewport.scrollLeft = 0;
		mapViewport.scrollTop = 0;

		redraw();
		updateStats();
	}

	generateBtn.addEventListener('click', generate);

	randomSeedBtn.addEventListener('click', () => {
		seedInput.value = randomSeed();
		generate();
	});

	viewModeSelect.addEventListener('change', redraw);
	showPlantsInput.addEventListener('change', redraw);
	showAnimalsInput.addEventListener('change', redraw);
	showCarnivoresInput.addEventListener('change', redraw);
	showAquaticAnimalsInput.addEventListener('change', redraw);
	showAquaticCarnivoresInput.addEventListener('change', redraw);

	playPauseBtn.addEventListener('click', () => setRunning(!running));
	stepBtn.addEventListener('click', () => {
		setRunning(false);
		stepOnce();
	});
	speedInput.addEventListener('input', () => {
		speedLabel.textContent = `${speedInput.value} ticks/s`;
		if (running) setRunning(true); // restart interval at new speed
	});

	canvas.addEventListener('mousemove', (e) => {
		if (!worldMap || isPanning) return;
		const rect = canvas.getBoundingClientRect();
		const scaleX = canvas.width / rect.width;
		const scaleY = canvas.height / rect.height;
		const x = Math.floor((e.clientX - rect.left) * scaleX);
		const y = Math.floor((e.clientY - rect.top) * scaleY);
		if (x < 0 || y < 0 || x >= worldMap.width || y >= worldMap.height) return;

		const cell = worldMap.getCell(x, y);
		const info = BIOME_INFO[cell.biome];
		tooltip.style.display = 'block';
		tooltip.style.left = e.clientX + 16 + 'px';
		tooltip.style.top = e.clientY + 16 + 'px';

		let html =
			`<strong>${info.name}</strong><br>` +
			`alt ${cell.altitude.toFixed(2)} · temp ${cell.temperature.toFixed(2)} · hum ${cell.humidity.toFixed(2)}`;

		// Spatial-index lookups (O(occupants of this one tile)) instead of
		// scanning the whole population every mousemove event.
		const cellIdx = worldMap.idx(x, y);
		if (plantSystem) {
			const occupants = plantSystem.plantsByCell.get(cellIdx);
			if (occupants && occupants.length) {
				html += `<br>🌿 ${occupants.map((p) => plantSystem.registry.get(p.speciesId).name).join(', ')}`;
			}
		}
		if (herbivoreSystem) {
			const occupants = herbivoreSystem.animalsByCell.get(cellIdx);
			if (occupants && occupants.length) {
				html += `<br>🦌 ${occupants.map((a) => herbivoreSystem.registry.get(a.speciesId).name).join(', ')}`;
			}
		}
		if (carnivoreSystem) {
			const occupants = carnivoreSystem.animalsByCell.get(cellIdx);
			if (occupants && occupants.length) {
				html += `<br>🐺 ${occupants.map((a) => carnivoreSystem.registry.get(a.speciesId).name).join(', ')}`;
			}
		}
		if (aquaticHerbivoreSystem) {
			const occupants = aquaticHerbivoreSystem.animalsByCell.get(cellIdx);
			if (occupants && occupants.length) {
				html += `<br>🐟 ${occupants.map((a) => aquaticHerbivoreSystem.registry.get(a.speciesId).name).join(', ')}`;
			}
		}
		if (aquaticCarnivoreSystem) {
			const occupants = aquaticCarnivoreSystem.animalsByCell.get(cellIdx);
			if (occupants && occupants.length) {
				html += `<br>🦈 ${occupants.map((a) => aquaticCarnivoreSystem.registry.get(a.speciesId).name).join(', ')}`;
			}
		}
		tooltip.innerHTML = html;
	});

	canvas.addEventListener('mouseleave', () => {
		tooltip.style.display = 'none';
	});

	window.addEventListener('resize', () => {
		if (!worldMap) return;
		zoom = fitZoom();
		applyZoom();
	});

	seedInput.value = randomSeed();
	buildBiomeLegend();
	speedLabel.textContent = `${speedInput.value} ticks/s`;
	generate();
})();
