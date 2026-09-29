const $ = (id) => document.getElementById(id);

const GROUP_COLORS = {
	plants: '#7cc46e',
	landHerb: '#b5de8c',
	landOmni: '#e7b95c',
	landCarn: '#ec7a67',
	waterHerb: '#6fc3e6',
	waterOmni: '#c9a0e8',
	waterCarn: '#5c86e6',
};

function mixHex(hex, target, t) {
	const a = hexToRgb(hex);
	const b = hexToRgb(target);
	const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
	return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}

function paletteFor(hex) {
	return { body: hex, dark: mixHex(hex, '#0b120e', 0.45), light: mixHex(hex, '#ffffff', 0.45) };
}

const NEUTRAL = paletteFor('#a9bcb0');

const app = {
	world: null,
	eco: null,
	renderer: null,
	running: false,
	speed: 15,
	acc: 0,
	selected: null,
	tab: 'plant',
	eventFilter: 'all',
	hidden: new Set(),
	lastUi: 0,
	lastLogVersion: -1,
	msPerTick: 0,
	fps: 60,
	hover: null,
};

function readSize() {
	const [w, h] = $('sizeSelect').value.split('x').map(Number);
	return { w, h };
}

function newWorld() {
	let seed = parseInt($('seedInput').value, 10);
	if (!Number.isFinite(seed)) {
		seed = Math.floor(Math.random() * 1e6);
		$('seedInput').value = seed;
	}
	const { w, h } = readSize();
	const overlay = $('mapError');
	overlay.hidden = false;
	overlay.innerHTML = '<div><div class="spinner"></div>Growing a new world…</div>';
	setTimeout(() => {
		const t0 = performance.now();
		const world = new WorldMap(w, h, seed);
		const eco = new Ecosystem(world, seed, {
			seasons: $('optSeasons').checked,
			migrations: $('optMigrations').checked,
		});
		app.world = world;
		app.eco = eco;
		app.selected = null;
		app.acc = 0;
		app.lastLogVersion = -1;
		app.renderer.highlight = null;
		app.renderer.setWorld(world, eco);
		closeDetail();
		overlay.hidden = true;
		history.replaceState(null, '', '#' + seed);
		console.log(`World ${w}×${h} ready in ${Math.round(performance.now() - t0)} ms`);
		updateUi(true);
	}, 30);
}

let lastFrame = performance.now();

function frame(now) {
	const dt = Math.min(0.1, (now - lastFrame) / 1000);
	lastFrame = now;
	app.fps += (1 / Math.max(dt, 0.001) - app.fps) * 0.05;
	const eco = app.eco;
	if (eco && app.running) {
		app.acc += dt * app.speed;
		const t0 = performance.now();
		const budget = app.speed >= 600 ? 30 : 16;
		let steps = 0;
		while (app.acc >= 1 && performance.now() - t0 < budget) {
			eco.step();
			app.acc -= 1;
			steps++;
		}
		if (steps) {
			const per = (performance.now() - t0) / steps;
			app.msPerTick += (per - app.msPerTick) * 0.1;
		}
		if (app.acc > 2) app.acc = 1;
	}
	if (app.renderer && app.world) {
		const alpha = app.running ? Math.min(1, Math.max(0, app.acc)) : 1;
		app.renderer.draw(alpha, dt);
	}
	if (eco && now - app.lastUi > 250) {
		app.lastUi = now;
		updateUi(false);
		if (app.hover) updateTooltip();
	}
	requestAnimationFrame(frame);
}

function setRunning(on) {
	app.running = on;
	$('playBtn').classList.toggle('running', on);
	$('playLabel').textContent = on ? 'Pause' : 'Play';
}

function stepOnce() {
	if (!app.eco) return;
	setRunning(false);
	app.eco.step();
	app.acc = 1;
	updateUi(true);
}

function buildStatCards() {
	const wrap = $('statCards');
	let html = `<div class="stat wide" data-key="plants">
		${iconSVG('tree', paletteFor(GROUP_COLORS.plants), 30)}
		<div class="stat-label">Plant biomass</div>
		<div class="stat-value" data-v>0</div>
		<canvas data-spark></canvas>
	</div>`;
	for (const g of STAT_GROUPS) {
		html += `<div class="stat" data-key="${g.key}" title="${g.domain ? 'Water' : 'Land'} ${g.role}s">
			${iconSVG(g.icon, paletteFor(GROUP_COLORS[g.key]), 28)}
			<div class="stat-label">${g.label}</div>
			<div class="stat-value" data-v>0</div>
			<canvas data-spark></canvas>
		</div>`;
	}
	wrap.innerHTML = html;

	const legend = $('popLegend');
	legend.innerHTML = [['plants', 'Plants ÷10'], ...STAT_GROUPS.map((g) => [g.key, g.label])]
		.map(([k, label]) => `<button data-key="${k}"><i style="background:${GROUP_COLORS[k]}"></i>${label}</button>`)
		.join('');
	legend.addEventListener('click', (e) => {
		const b = e.target.closest('button');
		if (!b) return;
		const k = b.dataset.key;
		if (app.hidden.has(k)) app.hidden.delete(k);
		else app.hidden.add(k);
		b.classList.toggle('off', app.hidden.has(k));
		drawPopChart();
	});
}

function updateStats() {
	const eco = app.eco;
	const s = eco.stats;
	const h = eco.history;
	for (const el of $('statCards').children) {
		const k = el.dataset.key;
		const v = k === 'plants' ? s.plantBiomass : s[k];
		el.querySelector('[data-v]').textContent = formatCount(v);
		el.classList.toggle('zero', k !== 'plants' && v === 0);
		drawSparkline(el.querySelector('[data-spark]'), k === 'plants' ? h.plants : h[k], GROUP_COLORS[k]);
	}
	drawPopChart();
}

function drawPopChart() {
	const h = app.eco.history;
	const series = [{ values: h.plants.map((v) => v / 10), color: GROUP_COLORS.plants, hidden: app.hidden.has('plants'), dim: true, width: 1.2 }];
	for (const g of STAT_GROUPS) series.push({ values: h[g.key], color: GROUP_COLORS[g.key], hidden: app.hidden.has(g.key) });
	drawPopulationChart($('popChart'), h.tick, series, { yearTicks: YEAR_TICKS });
}

function buildBiomeLegend() {
	const skip = new Set(['CLIFF', 'FROZEN_DESERT']);
	$('biomeLegend').innerHTML = BIOME_LIST.filter((k) => !skip.has(k))
		.map((k) => `<div class="biome-item"><i style="background:${BIOME_INFO[k].color}"></i>${BIOME_INFO[k].name}</div>`)
		.join('');
}

function updateClock() {
	const eco = app.eco;
	const season = eco.seasonName();
	$('seasonLabel').textContent = eco.options.seasons ? season : 'No seasons';
	$('seasonBadge').dataset.season = eco.options.seasons ? season : '';
	$('yearLabel').textContent = 'Year ' + eco.year();
	$('tickLabel').textContent = 'tick ' + eco.tick.toLocaleString();
	const ms = app.running ? app.msPerTick.toFixed(1) + ' ms/tick' : 'paused';
	$('perfLabel').textContent = `${ms} · ${Math.round(app.fps)} fps`;
}

function speciesInTab(tab) {
	const out = [];
	for (const sp of app.eco.registry.all.values()) {
		if (tab === 'plant' ? sp.group !== 'plant' : sp.group !== 'animal' || sp.domain !== tab) continue;
		out.push(sp);
	}
	return out;
}

function roleOf(sp) {
	return sp.group === 'plant' ? 'plant' : sp.role || dietRole(sp.mean[G_DIET]);
}

function categoryLabel(sp) {
	return sp.group === 'plant' ? PLANT_CATEGORY_LABEL[sp.category] || 'Plant' : ANIMAL_CATEGORY_LABEL[sp.category] || 'Animal';
}

function roleTag(sp) {
	const r = roleOf(sp);
	const label = r === 'plant' ? (sp.domain === 'water' ? 'aquatic' : 'plant') : r;
	return `<span class="role-tag role-${r}">${label}</span>`;
}

function yearOf(tick) {
	return Math.floor(tick / YEAR_TICKS) + 1;
}

function updateTabCounts() {
	let p = 0;
	let l = 0;
	let w = 0;
	const reg = app.eco.registry;
	for (const id of reg.living) {
		const sp = reg.get(id);
		if (sp.group === 'plant') p++;
		else if (sp.domain === 'land') l++;
		else w++;
	}
	$('countPlant').textContent = p;
	$('countLand').textContent = l;
	$('countWater').textContent = w;
	$('speciesTotals').textContent = `${p + l + w} living species`;
}

function renderSpeciesList() {
	const list = $('speciesList');
	const showExtinct = $('showExtinct').checked;
	let items = speciesInTab(app.tab).filter((sp) => showExtinct || sp.population > 0);
	const sort = $('sortSelect').value;
	if (sort === 'pop') items.sort((a, b) => b.population - a.population || b.peak - a.peak);
	else if (sort === 'new') items.sort((a, b) => b.createdTick - a.createdTick);
	else items.sort((a, b) => a.name.localeCompare(b.name));
	const total = items.length;
	items = items.slice(0, 160);
	if (!items.length) {
		list.innerHTML = `<li class="empty">No ${showExtinct ? '' : 'living '}species here yet.</li>`;
		return;
	}
	let max = 1;
	for (const sp of items) if (sp.population > max) max = sp.population;
	const unit = app.tab === 'plant' ? ' tiles' : '';
	let html = '';
	for (const sp of items) {
		const dead = sp.population <= 0;
		const pct = (sp.population / max) * 100;
		html += `<li class="sp-row${dead ? ' extinct' : ''}${sp.id === app.selected ? ' selected' : ''}" data-id="${sp.id}">
			<div class="sp-icon">${iconSVG(sp.icon || sp.category, speciesColors(sp), 32)}</div>
			<div style="min-width:0">
				<div class="sp-name">${sp.name}</div>
				<div class="sp-sub">${roleTag(sp)}${categoryLabel(sp)}${dead ? ' · extinct Y' + yearOf(sp.extinctTick) : ''}</div>
			</div>
			<div>
				<div class="sp-pop">${dead ? '–' : formatCount(sp.population) + unit}</div>
				<div class="sp-bar"><i style="width:${pct}%;background:${sp.color}"></i></div>
			</div>
		</li>`;
	}
	if (total > items.length) html += `<li class="empty">+ ${total - items.length} more</li>`;
	const scroll = list.scrollTop;
	list.innerHTML = html;
	list.scrollTop = scroll;
}

const EVENT_GLYPH = { speciation: '+', extinction: '×', migration: '→', info: '•' };

function renderEvents(force) {
	const log = app.eco.log;
	if (!force && log.version === app.lastLogVersion) return;
	app.lastLogVersion = log.version;
	const f = app.eventFilter;
	const items = log.items.filter((e) => f === 'all' || e.type === f);
	if (!items.length) {
		$('eventList').innerHTML = '<li class="empty">Nothing has happened yet.</li>';
		return;
	}
	const seasons = ['Spring', 'Summer', 'Autumn', 'Winter'];
	$('eventList').innerHTML = items
		.map((e) => {
			const season = seasons[Math.floor(((e.tick % YEAR_TICKS) / YEAR_TICKS) * 4)];
			const click = e.speciesId ? ` clickable" data-id="${e.speciesId}` : '';
			return `<li class="event ev-${e.type}${click}">
				<span class="ev-dot">${EVENT_GLYPH[e.type] || '•'}</span>
				<div>${e.text}<time>Year ${yearOf(e.tick)} · ${season}</time></div>
			</li>`;
		})
		.join('');
}

const PLANT_TRAITS = [
	['Heat preference', 0, (v) => tempWord(v)],
	['Moisture / depth', 1, (v) => pct(v)],
	['Generalist', 2, (v) => pct(v)],
	['Woodiness', 3, (v) => pct(v)],
	['Toxicity', 4, (v) => pct(v)],
	['Seed dispersal', 5, (v) => pct(v)],
];

const ANIMAL_TRAITS = [
	['Body size', G_SIZE, (v) => pct(v)],
	['Speed', G_SPEED, (v) => pct(v)],
	['Senses', G_SENSE, (v) => pct(v)],
	['Diet (meat)', G_DIET, (v) => dietRole(v)],
	['Heat preference', G_TEMP, (v) => tempWord(v)],
	['Climate range', G_TOL, (v) => pct(v)],
	['Fertility', G_FEC, (v) => pct(v)],
	['Toxin resistance', G_TOXR, (v) => pct(v)],
	['Armor', G_ARMOR, (v) => pct(v)],
];

function pct(v) {
	return Math.round(v * 100) + '%';
}

function tempWord(v) {
	return v < 0.2 ? 'Frigid' : v < 0.38 ? 'Cold' : v < 0.55 ? 'Mild' : v < 0.72 ? 'Warm' : 'Hot';
}

function selectSpecies(id) {
	const sp = app.eco.registry.get(id);
	if (!sp) return;
	app.selected = id;
	app.renderer.highlight = id;
	app.renderer.vegDirty = true;
	if (sp.group === 'plant') setTab('plant', false);
	else setTab(sp.domain, false);
	$('detail').hidden = false;
	$('detail').scrollTop = 0;
	renderDetail();
	renderSpeciesList();
}

function closeDetail() {
	$('detail').hidden = true;
	app.selected = null;
	if (app.renderer) {
		app.renderer.highlight = null;
		app.renderer.vegDirty = true;
	}
	if (app.eco) renderSpeciesList();
}

function renderDetail() {
	const eco = app.eco;
	const sp = eco.registry.get(app.selected);
	if (!sp) return;
	const colors = speciesColors(sp);
	const alive = sp.population > 0;
	$('detailIcon').innerHTML = iconSVG(sp.icon || sp.category, colors, 54);
	$('detailName').textContent = sp.name;
	$('detailSub').textContent = `${categoryLabel(sp)} · ${sp.domain === 'water' ? 'aquatic' : 'terrestrial'}`;
	const origin = sp.origin === 'founder' ? 'Founder' : sp.origin === 'migrated' ? 'Migrant' : `Generation ${sp.generation}`;
	$('detailBadges').innerHTML = [
		roleTag(sp).replace('role-tag', 'badge role-tag'),
		alive ? '<span class="badge alive">Living</span>' : `<span class="badge dead">Extinct · Year ${yearOf(sp.extinctTick)}</span>`,
		`<span class="badge">${origin}</span>`,
	].join('');
	const unit = sp.group === 'plant' ? ' tiles' : '';
	const cells = [
		['Population', alive ? formatCount(sp.population) + unit : '0'],
		['Peak', formatCount(sp.peak) + unit],
		['Appeared', 'Year ' + yearOf(sp.createdTick)],
		[sp.group === 'plant' ? 'Biomass' : 'Descendants', sp.group === 'plant' ? formatCount(sp.biomass || 0) : sp.children.length],
	];
	$('detailGrid').innerHTML = cells.map(([k, v]) => `<div><small>${k}</small><strong>${v}</strong></div>`).join('');
	drawSpeciesChart($('speciesChart'), sp.history.concat(alive ? [eco.tick, sp.population] : []), sp.color, eco.tick);

	const defs = sp.group === 'plant' ? PLANT_TRAITS : ANIMAL_TRAITS;
	$('detailTraits').innerHTML = defs
		.map(([label, k, fmt]) => {
			const v = sp.mean[k];
			let lbl = label;
			if (sp.group === 'plant' && k === 1) lbl = sp.domain === 'water' ? 'Depth' : 'Moisture';
			return `<div class="trait"><span>${lbl}</span><div class="track"><i style="width:${Math.max(3, v * 100)}%;background:${sp.color}"></i></div><em>${fmt(v)}</em></div>`;
		})
		.join('');

	const chain = eco.registry.lineage(sp).reverse();
	const row = (s, cur) =>
		`<div class="lin-item${cur ? ' current' : ''}${s.population <= 0 ? ' gone' : ''}" data-id="${s.id}">${iconSVG(s.icon || s.category, speciesColors(s), 22)}<span>${s.name}</span><small>Y${yearOf(s.createdTick)}</small></div>`;
	$('detailLineage').innerHTML = chain.length ? chain.map((s) => row(s, false)).join('') + row(sp, true) : row(sp, true) + '<p class="muted" style="padding:4px 6px">An original lineage with no known ancestor.</p>';

	const kids = sp.children.slice(-40).reverse();
	$('detailChildrenWrap').hidden = !kids.length;
	$('detailChildren').innerHTML = kids
		.map((c) => `<span class="chip${c.population <= 0 ? ' gone' : ''}" data-id="${c.id}">${iconSVG(c.icon || c.category, speciesColors(c), 18)}${c.name}</span>`)
		.join('');
}

function setTab(tab, render = true) {
	app.tab = tab;
	for (const b of $('tabs').children) b.classList.toggle('active', b.dataset.tab === tab);
	$('speciesView').hidden = tab === 'events';
	$('eventsView').hidden = tab !== 'events';
	if (render) {
		if (tab === 'events') renderEvents(true);
		else renderSpeciesList();
	}
}

function updateUi(force) {
	if (!app.eco) return;
	updateClock();
	updateStats();
	updateTabCounts();
	if (!$('detail').hidden) renderDetail();
	else if (app.tab === 'events') renderEvents(force);
	else renderSpeciesList();
}

function pickAnimal(wx, wy) {
	const A = app.eco.animals;
	const r = Math.max(0.9, 10 / app.renderer.cam.zoom);
	let best = -1;
	let bestD = r * r;
	for (let i = 0; i < A.count; i++) {
		const dx = A.x[i] - wx;
		const dy = A.y[i] - wy;
		const d = dx * dx + dy * dy;
		if (d < bestD) {
			bestD = d;
			best = i;
		}
	}
	return best;
}

function tileAt(wx, wy) {
	const w = app.world;
	const x = Math.floor(wx);
	const y = Math.floor(wy);
	if (x < 0 || y < 0 || x >= w.width || y >= w.height) return -1;
	return y * w.width + x;
}

function updateTooltip() {
	const tt = $('tooltip');
	const h = app.hover;
	if (!h || !app.eco) {
		tt.hidden = true;
		return;
	}
	const [wx, wy] = app.renderer.screenToWorld(h.x, h.y);
	const t = tileAt(wx, wy);
	if (t < 0) {
		tt.hidden = true;
		return;
	}
	const w = app.world;
	const P = app.eco.plants;
	const A = app.eco.animals;
	const reg = app.eco.registry;
	const biome = BIOME_INFO[BIOME_LIST[w.biome[t]]];
	const temp = Math.round(w.temperature[t] * 50 - 15);
	let html = `<div class="tt-meta">${biome.name} · ${temp}°C · ${P.water[t] ? 'depth ' + pct(P.depth[t]) : 'moisture ' + pct(w.humidity[t])}</div>`;
	const a = pickAnimal(wx, wy);
	if (a >= 0) {
		const sp = reg.get(A.sp[a]);
		const states = ['resting', 'grazing', 'foraging', 'hunting', 'fleeing'];
		html += `<div class="tt-row">${iconSVG(sp.icon, speciesColors(sp), 30)}<div><strong>${sp.name}</strong><small>${roleTag(sp)}${categoryLabel(sp)}</small><small>${states[A.state[a]]} · energy ${pct(Math.max(0, A.energy[a] / A.emax[a]))} · age ${A.age[a]}</small></div></div>`;
	}
	if (P.species[t]) {
		const sp = reg.get(P.species[t]);
		html += `<div class="tt-row">${iconSVG(sp.icon, speciesColors(sp), 30)}<div><strong>${sp.name}</strong><small>${categoryLabel(sp)} · biomass ${P.biomass[t].toFixed(2)}</small></div></div>`;
	}
	tt.innerHTML = html;
	tt.hidden = false;
	const wrap = $('mapWrap').getBoundingClientRect();
	const bw = tt.offsetWidth;
	const bh = tt.offsetHeight;
	let x = h.x + 16;
	let y = h.y + 16;
	if (x + bw > wrap.width - 8) x = h.x - bw - 12;
	if (y + bh > wrap.height - 8) y = h.y - bh - 12;
	tt.style.left = Math.max(4, x) + 'px';
	tt.style.top = Math.max(4, y) + 'px';
}

function setupMapInput() {
	const canvas = $('map');
	const pointers = new Map();
	let drag = null;
	let pinch = null;

	const local = (e) => {
		const r = canvas.getBoundingClientRect();
		return [e.clientX - r.left, e.clientY - r.top];
	};

	canvas.addEventListener('pointerdown', (e) => {
		canvas.setPointerCapture(e.pointerId);
		const [x, y] = local(e);
		pointers.set(e.pointerId, [x, y]);
		if (pointers.size === 1) drag = { x, y, moved: 0 };
		else if (pointers.size === 2) {
			const [a, b] = [...pointers.values()];
			pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) };
			drag = null;
		}
	});

	canvas.addEventListener('pointermove', (e) => {
		const [x, y] = local(e);
		if (pointers.has(e.pointerId)) pointers.set(e.pointerId, [x, y]);
		if (pinch && pointers.size === 2) {
			const [a, b] = [...pointers.values()];
			const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
			app.renderer.zoomAt(d / pinch.d, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
			pinch.d = d;
			return;
		}
		if (drag) {
			const dx = x - drag.x;
			const dy = y - drag.y;
			drag.moved += Math.abs(dx) + Math.abs(dy);
			if (drag.moved > 4) canvas.classList.add('dragging');
			app.renderer.pan(dx, dy);
			drag.x = x;
			drag.y = y;
			$('tooltip').hidden = true;
			return;
		}
		app.hover = { x, y };
		updateTooltip();
	});

	const end = (e) => {
		pointers.delete(e.pointerId);
		if (drag && drag.moved <= 4 && app.eco) {
			const [x, y] = local(e);
			const [wx, wy] = app.renderer.screenToWorld(x, y);
			const a = pickAnimal(wx, wy);
			const t = tileAt(wx, wy);
			if (a >= 0) selectSpecies(app.eco.animals.sp[a]);
			else if (t >= 0 && app.eco.plants.species[t]) selectSpecies(app.eco.plants.species[t]);
			else closeDetail();
		}
		if (pointers.size < 2) pinch = null;
		drag = null;
		canvas.classList.remove('dragging');
	};
	canvas.addEventListener('pointerup', end);
	canvas.addEventListener('pointercancel', end);
	canvas.addEventListener('pointerleave', () => {
		app.hover = null;
		$('tooltip').hidden = true;
	});

	canvas.addEventListener(
		'wheel',
		(e) => {
			e.preventDefault();
			const [x, y] = local(e);
			const k = e.deltaMode === 1 ? 0.05 : 0.0016;
			app.renderer.zoomAt(Math.exp(-e.deltaY * k), x, y);
			$('mapHint').style.opacity = 0;
		},
		{ passive: false }
	);

	const zoomCenter = (f) => app.renderer.zoomAt(f, app.renderer.cssW / 2, app.renderer.cssH / 2);
	$('zoomIn').onclick = () => zoomCenter(1.5);
	$('zoomOut').onclick = () => zoomCenter(1 / 1.5);
	$('zoomFit').onclick = () => app.renderer.fit();
}

function setupControls() {
	$('playBtn').onclick = () => setRunning(!app.running);
	$('stepBtn').onclick = stepOnce;
	$('newWorldBtn').onclick = newWorld;
	$('randomSeedBtn').onclick = () => {
		$('seedInput').value = Math.floor(Math.random() * 1e6);
		newWorld();
	};
	$('seedInput').addEventListener('keydown', (e) => {
		if (e.key === 'Enter') newWorld();
	});
	$('sizeSelect').onchange = newWorld;

	$('speedGroup').addEventListener('click', (e) => {
		const b = e.target.closest('button');
		if (!b) return;
		app.speed = Number(b.dataset.speed);
		for (const x of $('speedGroup').children) x.classList.toggle('active', x === b);
		if (!app.running) setRunning(true);
	});

	$('viewModes').addEventListener('click', (e) => {
		const b = e.target.closest('button');
		if (!b) return;
		for (const x of $('viewModes').children) x.classList.toggle('active', x === b);
		app.renderer.setMode(b.dataset.mode);
	});
	$('showPlants').onchange = (e) => (app.renderer.showPlants = e.target.checked);
	$('showAnimals').onchange = (e) => (app.renderer.showAnimals = e.target.checked);
	$('optSeasons').onchange = (e) => app.eco && (app.eco.options.seasons = e.target.checked);
	$('optMigrations').onchange = (e) => app.eco && (app.eco.options.migrations = e.target.checked);

	$('tabs').addEventListener('click', (e) => {
		const b = e.target.closest('button');
		if (!b) return;
		if (!$('detail').hidden) closeDetail();
		setTab(b.dataset.tab);
	});
	for (const el of document.querySelectorAll('.tab-icon')) el.innerHTML = iconSVG(el.dataset.icon, NEUTRAL, 14);
	$('showExtinct').onchange = renderSpeciesList;
	$('sortSelect').onchange = renderSpeciesList;
	$('eventFilter').addEventListener('click', (e) => {
		const b = e.target.closest('button');
		if (!b) return;
		app.eventFilter = b.dataset.f;
		for (const x of $('eventFilter').children) x.classList.toggle('active', x === b);
		renderEvents(true);
	});

	const pickId = (e) => {
		const el = e.target.closest('[data-id]');
		if (el && !el.classList.contains('current')) selectSpecies(Number(el.dataset.id));
	};
	$('speciesList').addEventListener('click', pickId);
	$('eventList').addEventListener('click', pickId);
	$('detailLineage').addEventListener('click', pickId);
	$('detailChildren').addEventListener('click', pickId);
	$('detailBack').onclick = closeDetail;

	document.addEventListener('keydown', (e) => {
		if (e.target.matches('input, select')) return;
		if (e.code === 'Space') {
			e.preventDefault();
			setRunning(!app.running);
		} else if (e.key === '.') stepOnce();
		else if (e.key === 'f') app.renderer.fit();
		else if (e.key === 'Escape') closeDetail();
	});

	$('brandMark').innerHTML = iconSVG('deer', paletteFor('#c9955c'), 28);
}

function init() {
	const fromHash = parseInt(location.hash.slice(1), 10);
	$('seedInput').value = Number.isFinite(fromHash) ? fromHash : Math.floor(Math.random() * 1e6);
	buildStatCards();
	buildBiomeLegend();
	setupControls();
	try {
		app.renderer = new WorldRenderer($('map'));
	} catch (err) {
		const box = $('mapError');
		box.hidden = false;
		box.textContent = 'Could not start the WebGL2 renderer: ' + err.message;
		console.error(err);
		return;
	}
	setupMapInput();
	window.addEventListener('resize', () => app.renderer.resize());
	newWorld();
	if (/[?&]play\b/.test(location.search)) setRunning(true);
	requestAnimationFrame(frame);
}

init();
