const $ = (id) => document.getElementById(id);

const GROUP_COLORS = {
	plants: '#7cc46e',
	fish: '#5fb6e6',
	amphib: '#2fae94',
	reptile: '#b8901c',
	mammal: '#e7a25c',
	bird: '#c98ee8',
	invert: '#ec7a8f',
	bugs: '#ee7fb4',
	disease: '#a8c04a',
};

const TAB_GROUP = { plant: 'plant', animal: 'animal', bug: 'bug', disease: 'pathogen' };
const ROLE_COLORS = { herb: '#9fd98b', omni: '#e7b95c', carn: '#ec8a79', scav: '#c9a27a' };
const CLASS_NAME = ['Fish', 'Amphibian', 'Reptile', 'Mammal', 'Bird', 'Invertebrate'];
const OPEN_KEY = 'evo.openClasses';

const SWARM_NICHES = ['pest', 'detritivore', 'parasite', 'pollinator'];
const SWARM_NICHE_ICON = ['aphid', 'beetle', 'tick', 'bee'];
const SWARM_LABEL = { aphid: 'Aphid', locust: 'Locust', beetle: 'Beetle', worm: 'Worm', tick: 'Tick', leech: 'Leech', bee: 'Bee', butterfly: 'Butterfly' };

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

const STAT_EXTRA = [
	{ key: 'thirstDeaths', label: 'Thirst deaths', icon: 'drop', color: '#6fb7e0', sub: true },
	{ key: 'herds', label: 'Herds', icon: 'bison', color: '#c9a86a' },
	{ key: 'territories', label: 'Territories', icon: 'flag', color: '#e0906a' },
	{ key: 'packs', label: 'Hunting packs', icon: 'wolf', color: '#d07a5a', sub: true },
	{ key: 'alarms', label: 'Alarms', icon: 'owl', color: '#e8c25a', wide: true, sub: true },
	{ key: 'eggs', label: 'Eggs', icon: 'egg', color: '#e6d3a3', wide: true, sub: true },
	{ key: 'nests', label: 'Nests & dens', icon: 'nest', color: '#c79a5b', wide: true, sub: true },
	{ key: 'nutrition', label: 'Body condition', icon: 'boar', color: '#d9a066', wide: true, sub: true },
	{ key: 'dormancy', label: 'Dormancy', icon: 'bear', color: '#8fa7d6', wide: true, sub: true },
	{ key: 'symb', label: 'Symbioses', icon: 'bee', color: '#b48fd9', wide: true, sub: true },
	{ key: 'brain', label: 'Intelligence', icon: 'crow', color: '#e0a3c8', wide: true, sub: true },
	{ key: 'disasters', label: 'Disasters', icon: 'flame', color: '#e8743c', wide: true, sub: true },
	{ key: 'stages', label: 'Life stages · animals', icon: 'deer', color: '#9fd98b', wide: true, sub: true, noSpark: true },
];
const STAT_EXTRA_KEYS = new Set(STAT_EXTRA.map((x) => x.key));

const WEATHER_LOOK = {
	off: ['cloud', '#8b9c92'],
	clear: ['sun', '#e7b95c'],
	rain: ['rain', '#b9c8d2'],
	snow: ['snow', '#dbeef7'],
	storms: ['cloud', '#9fb2c0'],
	drought: ['sun', '#d9824a'],
};

const THEMES = ['auto', 'light', 'dark'];
const THEME_ICON = { auto: 'auto', light: 'sun', dark: 'moon' };
const THEME_KEY = 'evo.theme';
const CARDS_KEY = 'evo.collapsed';
const SPARK_POINTS = 24;

function storeGet(key) {
	try {
		return localStorage.getItem(key);
	} catch (e) {
		return null;
	}
}

function storeSet(key, value) {
	try {
		localStorage.setItem(key, value);
	} catch (e) {}
}

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
	theme: 'auto',
	tree: null,
	overlay: null,
	cls: -1,
	openClasses: new Set(),
	busy: false,
	messageTimer: 0,
};

function readSize() {
	const [w, h] = $('sizeSelect').value.split('x').map(Number);
	return { w, h };
}

function newWorld() {
	if (app.busy) return;
	let seed = parseInt($('seedInput').value, 10);
	if (!Number.isFinite(seed)) {
		seed = Math.floor(Math.random() * 1e6);
		$('seedInput').value = seed;
	}
	const { w, h } = readSize();
	showBusy('Growing a new world…');
	setTimeout(() => {
		const t0 = performance.now();
		SimClient.create(w, h, seed, {
			seasons: $('optSeasons').checked,
			migrations: $('optMigrations').checked,
			disease: $('optDisease').checked,
			weather: $('optWeather').checked,
			disasters: $('optDisasters').checked,
		}).then(
			({ world, eco }) => {
				installWorld(world, eco);
				hideBusy();
				console.log(`World ${w}×${h} ready in ${Math.round(performance.now() - t0)} ms`);
				updateUi(true);
			},
			(err) => {
				console.error(err);
				showMessage('Could not grow the world: ' + err.message);
			}
		);
	}, 30);
}

function installWorld(world, eco) {
	app.world = world;
	app.eco = eco;
	app.selected = null;
	app.acc = 0;
	app.lastLogVersion = -1;
	app.renderer.highlight = null;
	app.renderer.setWorld(world, eco);
	$('fastWrap').hidden = !SimClient.gpu;
	closeOverlay();
	closeDetail();
	history.replaceState(null, '', '#' + eco.seed);
}

const LAYER_SWITCHES = { showPlants: 'showPlants', showAnimals: 'showAnimals', showSwarms: 'showSwarms', showWeather: 'showWeather' };
const OPTION_SWITCHES = { seasons: 'optSeasons', migrations: 'optMigrations', disease: 'optDisease', weather: 'optWeather', disasters: 'optDisasters' };

function showBusy(text) {
	const box = $('mapError');
	clearTimeout(app.messageTimer);
	box.hidden = false;
	box.innerHTML = '<div><div class="spinner"></div><span></span></div>';
	box.querySelector('span').textContent = text;
}

function showMessage(text) {
	const box = $('mapError');
	box.hidden = false;
	box.textContent = text;
	clearTimeout(app.messageTimer);
	app.messageTimer = setTimeout(() => (box.hidden = true), 5000);
	box.onclick = () => {
		clearTimeout(app.messageTimer);
		box.hidden = true;
		box.onclick = null;
	};
}

function hideBusy() {
	$('mapError').hidden = true;
}

function saveMeta() {
	const r = app.renderer;
	const layers = {};
	for (const k of Object.keys(LAYER_SWITCHES)) layers[k] = !!r[k];
	return { speed: app.speed, mode: r.mode, cam: { x: r.cam.x, y: r.cam.y, zoom: r.cam.zoom }, layers };
}

function saveWorld() {
	if (!app.eco || app.busy) return;
	app.busy = true;
	showBusy('Saving the world…');
	setTimeout(async () => {
		try {
			const t0 = performance.now();
			const { name, bytes: data } = await SimClient.save(app.eco, saveMeta());
			const url = URL.createObjectURL(new Blob([data], { type: 'application/octet-stream' }));
			const a = document.createElement('a');
			a.href = url;
			a.download = name;
			document.body.appendChild(a);
			a.click();
			a.remove();
			setTimeout(() => URL.revokeObjectURL(url), 10000);
			hideBusy();
			console.log(`Saved ${name}: ${(data.length / 1048576).toFixed(1)} MB in ${Math.round(performance.now() - t0)} ms`);
		} catch (err) {
			console.error(err);
			showMessage('Could not save the world: ' + err.message);
		} finally {
			app.busy = false;
		}
	}, 30);
}

function loadWorld(file) {
	if (!file || app.busy) return;
	app.busy = true;
	setRunning(false);
	showBusy(`Loading ${file.name}…`);
	setTimeout(async () => {
		try {
			const t0 = performance.now();
			const bytes = new Uint8Array(await file.arrayBuffer());
			const { world, eco, meta } = await SimClient.load(bytes);
			applyLoaded(world, eco, meta);
			hideBusy();
			console.log(`Loaded ${file.name} (year ${yearOf(eco.tick)}) in ${Math.round(performance.now() - t0)} ms`);
		} catch (err) {
			console.warn(err);
			showMessage(`Could not load ${file.name}: ${err.message}. The current world was kept.`);
		} finally {
			app.busy = false;
		}
	}, 30);
}

function applyLoaded(world, eco, meta) {
	$('seedInput').value = eco.seed;
	const size = `${world.width}x${world.height}`;
	const sel = $('sizeSelect');
	if (![...sel.options].some((o) => o.value === size)) sel.add(new Option(`${world.width}×${world.height}`, size));
	sel.value = size;
	for (const [k, id] of Object.entries(OPTION_SWITCHES)) $(id).checked = !!eco.options[k];
	installWorld(world, eco);
	const r = app.renderer;
	const layers = meta.layers || {};
	for (const [k, id] of Object.entries(LAYER_SWITCHES)) {
		if (typeof layers[k] !== 'boolean') continue;
		$(id).checked = layers[k];
		r[k] = layers[k];
	}
	const modeBtn = [...$('viewModes').children].find((b) => b.dataset.mode === meta.mode);
	if (modeBtn) {
		for (const x of $('viewModes').children) x.classList.toggle('active', x === modeBtn);
		r.setMode(meta.mode);
	}
	const speedBtn = [...$('speedGroup').children].find((b) => Number(b.dataset.speed) === meta.speed);
	if (speedBtn) {
		app.speed = meta.speed;
		for (const x of $('speedGroup').children) x.classList.toggle('active', x === speedBtn);
	}
	const c = meta.cam;
	if (c && [c.x, c.y, c.zoom].every(Number.isFinite) && c.zoom > 0) Object.assign(r.cam, { x: c.x, y: c.y, zoom: c.zoom });
	updateUi(true);
}

let lastFrame = performance.now();

function frame(now) {
	const dt = Math.min(0.1, (now - lastFrame) / 1000);
	lastFrame = now;
	app.fps += (1 / Math.max(dt, 0.001) - app.fps) * 0.05;
	const eco = app.eco;
	if (eco && eco.remote) app.msPerTick = eco.sync(app.running, app.speed);
	else if (eco && app.running) {
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
		const alpha = eco && eco.remote ? eco.alpha : app.running ? Math.min(1, Math.max(0, app.acc)) : 1;
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
	</div>
	<div class="stat wide" data-key="bugs">
		${iconSVG('bug', paletteFor(GROUP_COLORS.bugs), 30)}
		<div class="stat-label">Bugs · swarm density</div>
		<div class="stat-value" data-v>0</div>
		<div class="stat-sub" data-sub></div>
		<canvas data-spark></canvas>
	</div>
	<div class="stat wide" data-key="disease">
		${iconSVG('virus', NEUTRAL, 30)}
		<div class="stat-label">Disease · sick animals</div>
		<div class="stat-value" data-v>0</div>
		<div class="stat-sub" data-sub></div>
		<canvas data-spark></canvas>
	</div>`;
	for (const g of STAT_GROUPS) {
		const rows = ROLE_KEYS.map((r, k) => `<button class="role-row" data-role="${r}" hidden><i style="background:${ROLE_COLORS[r]}"></i><span>${ROLE_LABELS[k]}</span><b data-n>0</b><canvas data-rspark></canvas></button>`).join('');
		const swarm = g.key === 'invert' ? `<button class="role-row" data-role="swarms" title="Bug swarms (open the Bugs tab)"><i style="background:${GROUP_COLORS.bugs}"></i><span>Swarms</span><b data-n>0</b><canvas data-rspark></canvas></button>` : '';
		html += `<div class="stat cls" data-key="${g.key}" role="button" tabindex="0" aria-expanded="false" title="${g.label}: click for the role breakdown">
			${iconSVG(g.icon, paletteFor(GROUP_COLORS[g.key]), 28)}
			<div class="stat-label">${g.label}<span class="chev"></span></div>
			<div class="stat-value" data-v>0</div>
			<canvas data-spark></canvas>
			<div class="stat-roles" data-roles>${rows}${swarm}</div>
		</div>`;
	}
	for (const x of STAT_EXTRA) {
		html += `<div class="stat${x.wide ? ' wide' : ''}" data-key="${x.key}">
			${iconSVG(x.icon, paletteFor(x.color), x.wide ? 30 : 28)}
			<div class="stat-label">${x.label}</div>
			<div class="stat-value" data-v>0</div>
			${x.sub ? '<div class="stat-sub" data-sub></div>' : ''}
			${x.noSpark ? '' : '<canvas data-spark></canvas>'}
		</div>`;
	}
	wrap.innerHTML = html;
	try {
		const open = JSON.parse(storeGet(OPEN_KEY) || '[]');
		if (Array.isArray(open)) app.openClasses = new Set(open);
	} catch (e) {}
	for (const el of wrap.querySelectorAll('.stat.cls')) setClassOpen(el, app.openClasses.has(el.dataset.key));
	const toggle = (e) => {
		const row = e.target.closest('.role-row');
		if (row && row.dataset.role === 'swarms') {
			if (!$('detail').hidden) closeDetail();
			setTab('bug');
			return;
		}
		const el = e.target.closest('.stat.cls');
		if (!el) return;
		const on = !el.classList.contains('open');
		setClassOpen(el, on);
		if (on) app.openClasses.add(el.dataset.key);
		else app.openClasses.delete(el.dataset.key);
		storeSet(OPEN_KEY, JSON.stringify([...app.openClasses]));
		if (app.eco) updateStats();
	};
	wrap.addEventListener('click', toggle);
	wrap.addEventListener('keydown', (e) => {
		if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.stat.cls')) {
			e.preventDefault();
			toggle(e);
		}
	});

	const legend = $('popLegend');
	legend.innerHTML = [['plants', 'Plants ÷10'], ...STAT_GROUPS.map((g) => [g.key, g.label]), ['bugs', 'Bugs']]
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

function setClassOpen(el, on) {
	el.classList.toggle('open', on);
	el.classList.toggle('wide', on);
	el.setAttribute('aria-expanded', String(on));
}

function updateClassRoles(el, k, s, h) {
	const roles = (s.roles && s.roles[k]) || {};
	for (const row of el.querySelectorAll('.role-row')) {
		const r = row.dataset.role;
		const swarm = r === 'swarms';
		const v = swarm ? s.bugs || 0 : roles[r] || 0;
		const hist = swarm ? h.bugs || [] : h[k + '.' + r] || [];
		const seen = swarm ? !!app.eco.bugs : v > 0 || hist.some((x) => x > 0);
		row.hidden = !seen;
		if (!seen) continue;
		row.classList.toggle('zero', v === 0);
		row.querySelector('[data-n]').textContent = formatCount(v);
		drawSparkline(row.querySelector('[data-rspark]'), hist, swarm ? GROUP_COLORS.bugs : ROLE_COLORS[r]);
		if (r === 'carn') packRow(row, k, s);
	}
}

function packRow(row, k, s) {
	const p = (s.packCls && s.packCls[k]) || [0, 0];
	const span = row.querySelector('span');
	const text = p[0] ? `Predators · ${p[0]} pack${p[0] === 1 ? '' : 's'}` : 'Predators';
	if (span.textContent !== text) span.textContent = text;
	row.title = p[0] ? `${p[0]} hunting pack${p[0] === 1 ? '' : 's'}, mean size ${(p[1] / p[0]).toFixed(1)}. All packs: ${formatCount(s.packKills || 0)} kills, ${formatCount(s.bigKills || 0)} of prey over 1.5× the hunter's mass` : '';
}

function updateStats() {
	const eco = app.eco;
	const s = eco.stats;
	const h = eco.history;
	for (const el of $('statCards').children) {
		const k = el.dataset.key;
		const dis = k === 'disease';
		if (STAT_EXTRA_KEYS.has(k)) {
			updateExtraStat(el, k, s, h);
			continue;
		}
		const v = (k === 'plants' ? s.plantBiomass : dis ? s.sick : s[k]) || 0;
		if (el.classList.contains('cls')) {
			el.hidden = v === 0 && !(h[k] || []).some((x) => x > 0);
			if (el.hidden) continue;
		}
		const dz = el.classList.contains('cls') && s.dormCls ? s.dormCls[k] || 0 : 0;
		el.querySelector('[data-v]').innerHTML = dz ? `${formatCount(v)}<small>${formatCount(dz)} dormant</small>` : formatCount(v);
		el.classList.toggle('zero', k !== 'plants' && v === 0 && (k !== 'bugs' || !!eco.bugs));
		if (k === 'bugs') el.querySelector('[data-sub]').innerHTML = bugStatLine(s);
		else if (dis) el.querySelector('[data-sub]').textContent = `${formatCount(s.strains || 0)} strains · ${formatCount(s.blight || 0)} blighted tiles`;
		drawSparkline(el.querySelector('[data-spark]'), k === 'plants' ? h.plants : dis ? h.sick || [] : h[k] || [], GROUP_COLORS[k]);
		if (el.classList.contains('open')) updateClassRoles(el, k, s, h);
	}
	drawPopChart();
}

function updateExtraStat(el, k, s, h) {
	const st = s.stages || {};
	const sub = el.querySelector('[data-sub]');
	const v = el.querySelector('[data-v]');
	if (k === 'stages') {
		const j = st.juveniles || 0;
		const a = st.adults || 0;
		const e = st.elders || 0;
		v.innerHTML = `${formatCount(j + a + e)}<small>${pct(j + a + e ? e / (j + a + e) : 0)} elders</small>`;
		const sc = s.stageCls || {};
		const li = s.life || {};
		const per = STAT_GROUPS.filter((g) => sc[g.key] && sc[g.key][0] + sc[g.key][1] + sc[g.key][2] > 0)
			.map((g) => `<span title="juveniles · adults · elders">${g.label} ${formatCount(sc[g.key][0])}/${formatCount(sc[g.key][1])}/${formatCount(sc[g.key][2])}</span>`)
			.join('');
		sub.innerHTML = `<span>${formatCount(j)} juveniles</span><span>${formatCount(a)} adults</span><span>${formatCount(e)} elders</span><span>${formatCount(li.tadpoles || 0)} tadpoles</span><span>${formatCount(li.larvae || 0)} larvae</span><span>${formatCount(li.cared || 0)} cared for</span>${per}`;
		return;
	}
	if (k === 'nutrition') {
		const nu = s.nutrition || {};
		v.innerHTML = `${pct(nu.defShare || 0)}<small>deficient</small>`;
		sub.innerHTML = `<span>${formatCount(nu.lean || 0)} lean</span><span>${formatCount(nu.fit || 0)} fit</span><span>${formatCount(nu.heavy || 0)} heavy</span><span>${formatCount(nu.obese || 0)} obese</span><span>${formatCount(nu.defProt || 0)} low protein</span><span>${formatCount(nu.defMin || 0)} low minerals</span><span>${formatCount(nu.caFailed || 0)} eggs failed (calcium)</span>`;
	} else if (k === 'dormancy') {
		const dm = s.dormancy || {};
		v.innerHTML = `${formatCount(dm.total || 0)}<small>dormant</small>`;
		sub.innerHTML = `<span>${formatCount(dm.hib || 0)} hibernating</span><span>${formatCount(dm.brum || 0)} brumating</span><span>${formatCount(dm.aest || 0)} aestivating</span><span>${formatCount(dm.torpor || 0)} in torpor</span><span>${formatCount(dm.starved || 0)} woke starving</span><span>${formatCount(dm.eggDiapause || 0)} eggs in diapause</span><span>${formatCount(dm.bugReserve || 0)} bug reserves</span><span>${formatCount(dm.seedDormant || 0)} resting seed banks</span>`;
	} else if (k === 'alarms') {
		const so = s.social || {};
		v.innerHTML = `${formatCount(so.alarms || 0)}<small>group ${(so.meanGroup || 0).toFixed(1)}</small>`;
		sub.innerHTML = `<span>${formatCount(so.heard || 0)} heard</span><span>${formatCount(so.sentinel || 0)} sentinel</span><span>${formatCount(so.colonies || 0)} colonies</span><span>${formatCount(so.dispersals || 0)} dispersals</span><span>${formatCount(so.dispSplits || 0)} dispersal splits</span><span>${formatCount(so.solitary || 0)} solitary · ${formatCount(so.colonial || 0)} colonial species</span><span>${formatCount(so.rankBlocked || 0)} outranked</span>`;
	} else if (k === 'symb') {
		const sy = s.symb || {};
		v.innerHTML = `${formatCount((sy.cleanerPairs || 0) + (sy.pollPairs || 0))}<small>pairs</small>`;
		sub.innerHTML = `<span>${formatCount(sy.cleanerPairs || 0)} cleaner pairs</span><span>${formatCount(sy.pollPairs || 0)} specialist pollinator pairs</span><span>${formatCount(sy.mimics || 0)} mimics · ${formatCount(sy.mimicSp || 0)} species</span><span>${formatCount(sy.models || 0)} toxic models</span><span>${formatCount(sy.riding || 0)} riding</span><span>${formatCount(sy.cleanings || 0)} cleanings</span><span>${formatCount(sy.toxHits || 0)} toxic bites</span><span>${formatCount(sy.animalSeeded || 0)} seeds sown by animals</span>`;
	} else if (k === 'brain') {
		const br = s.brain || {};
		const bc = br.cls || [];
		v.innerHTML = `${pct(br.mean || 0)}<small>mean brain</small>`;
		sub.innerHTML = `<span>${formatCount(br.toolSp || 0)} tool-using species</span><span>${formatCount(br.learnedN || 0)} learned avoidances</span><span>mammals ${pct(bc[3] || 0)} · birds ${pct(bc[4] || 0)}</span><span>${formatCount(br.toolUses || 0)} tool uses</span><span>${formatCount(br.fledEarly || 0)} fled early</span><span>${formatCount((br.memWater || 0) + (br.memFood || 0))} trips from memory</span><span>${formatCount(br.memDanger || 0)} danger spots avoided</span><span>${formatCount(br.taught || 0)} lessons taught</span>`;
	} else if (k === 'disasters') {
		const dz = s.disasters || {};
		v.innerHTML = `${formatCount(dz.activeFires || 0)}<small>burning · ${dz.burntShare || 0}% land burnt</small>`;
		sub.innerHTML = `<span>${formatCount(dz.fires || 0)} wildfires</span><span>${formatCount(dz.burnt || 0)} tiles burnt</span><span>${formatCount(dz.floods || 0)} floods${dz.flooding ? ' · flooding now' : ''}</span><span>${formatCount(dz.droughts || 0)} droughts${dz.drought ? ' · in drought' : ''}</span><span>${formatCount(dz.windthrow || 0)} windstorms · ${formatCount(dz.felled || 0)} trees felled</span><span>${formatCount((dz.killed || 0) + (dz.drowned || 0))} animals killed · ${formatCount(dz.eggsLost || 0)} eggs lost</span><span>${formatCount(dz.scarTiles || 0)} scarred tiles · ${dz.recovery || 0}% recovered</span><span>pioneers ${dz.pioneerYoung || 0}% young · ${dz.pioneerOld || 0}% old scars</span><span>${formatCount(dz.recolonised || 0)} recolonised</span><span>${dz.adaptShare || 0}% of survivors fire-adapted</span>`;
	} else if (k === 'eggs') {
		const eg = s.eggs || {};
		v.textContent = formatCount(st.eggs || 0);
		sub.innerHTML = ['laid', 'hatched', 'eaten', 'failed'].map((x) => `<span>${formatCount(eg[x] || 0)} ${x}</span>`).join('');
	} else if (k === 'nests') {
		const ns = s.nests || {};
		v.innerHTML = `${formatCount(ns.nests || 0)}<small>${formatCount(ns.dens || 0)} dens</small>`;
		sub.innerHTML = `<span>${formatCount(ns.nesters || 0)} parents</span><span>${formatCount(ns.natal || 0)} young at home</span><span>${(ns.eggsPerNest || 0).toFixed(1)} eggs/nest</span><span>${formatCount(ns.raids || 0)} raided</span><span>${formatCount(ns.repelled || 0)} raids repelled</span>`;
	} else {
		v.textContent = formatCount(s[k] || 0);
		if (k === 'thirstDeaths') sub.textContent = `${pct(s.thirstShare || 0)} of land deaths`;
		if (k === 'packs') sub.innerHTML = `<span>mean size ${(s.packSize || 0).toFixed(1)}</span><span>${formatCount(s.packKills || 0)} kills</span><span>${formatCount(s.bigKills || 0)} big game</span>`;
	}
	drawSparkline(el.querySelector('[data-spark]'), h[k] || [], STAT_EXTRA.find((d) => d.key === k).color);
}

function bugStatLine(s) {
	const keys = ['pests', 'detritivores', 'parasites', 'pollinators'];
	const pal = paletteFor(GROUP_COLORS.bugs);
	let html = keys.map((k, i) => `<span title="${SWARM_NICHES[i]} tiles">${iconSVG(SWARM_NICHE_ICON[i], pal, 13)}${formatCount(s[k] || 0)}</span>`).join('');
	if (typeof s.pollination === 'number') html += `<span title="Mean pollination on flowering tiles">pollination ${pct(s.pollination)}</span>`;
	return html;
}

function drawPopChart() {
	const h = app.eco.history;
	const series = [{ values: h.plants.map((v) => v / 10), color: GROUP_COLORS.plants, hidden: app.hidden.has('plants'), dim: true, width: 1.2 }];
	for (const g of STAT_GROUPS) series.push({ values: h[g.key], color: GROUP_COLORS[g.key], hidden: app.hidden.has(g.key) });
	if (h.bugs) series.push({ values: h.bugs, color: GROUP_COLORS.bugs, hidden: app.hidden.has('bugs') });
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
	updateWeatherBadge();
	const ms = app.running ? app.msPerTick.toFixed(1) + ' ms/tick' : 'paused';
	$('perfLabel').textContent = `${ms} · ${Math.round(app.fps)} fps`;
}

function updateWeatherBadge() {
	const eco = app.eco;
	const w = eco.stats.weather;
	const on = !!eco.weather && eco.options.weather !== false;
	const kind = !on ? 'off' : w.drought ? 'drought' : w.storms > 1 ? 'storms' : w.storms ? (w.rainTiles ? 'rain' : 'snow') : 'clear';
	const label = { off: 'Off', clear: 'Clear', rain: 'Rain', snow: 'Snow', storms: `Storms ×${w.storms}`, drought: 'Drought' }[kind];
	const badge = $('weatherBadge');
	if (badge.dataset.kind !== kind) {
		badge.dataset.kind = kind;
		const [icon, color] = WEATHER_LOOK[kind];
		$('weatherIcon').innerHTML = iconSVG(icon, paletteFor(color), 16);
	}
	badge.classList.toggle('off', !on);
	$('weatherLabel').textContent = label;
	badge.title = on ? `Weather: ${label}\nMean wetness ${pct(eco.stats.meanWet || 0)}\nRain on ${formatCount(w.rainTiles)} tiles · snow on ${formatCount(w.snowTiles)} tiles\n${formatCount(w.droughts)} drought${w.droughts === 1 ? '' : 's'} so far` : 'Weather is switched off';
}

function speciesInTab(tab) {
	const out = [];
	for (const sp of app.eco.registry.all.values()) {
		const g = TAB_GROUP[tab];
		if (!g || sp.group !== g) continue;
		if (tab === 'animal' && app.cls >= 0 && sp.cls !== app.cls) continue;
		out.push(sp);
	}
	return out;
}

function roleOf(sp) {
	return sp.group === 'plant' ? 'plant' : sp.group === 'bug' ? 'bug' : sp.group === 'pathogen' ? 'pathogen' : sp.role || dietRole(sp.mean[G_DIET]);
}

function bugNiche(sp) {
	const k = nicheIndex(sp);
	return k >= 0 ? SWARM_NICHES[k] : 'bug';
}

function nicheIndex(sp) {
	if (typeof sp.nicheIndex === 'number') return sp.nicheIndex;
	if (typeof sp.niche === 'number') return sp.niche;
	return SWARM_NICHES.indexOf(sp.niche);
}

function bugGeneShown(niche, k, fallback) {
	if (typeof BUG_MASKS !== 'undefined' && BUG_MASKS[niche]) return !!BUG_MASKS[niche][k];
	return !fallback || fallback.includes(niche);
}

function categoryLabel(sp) {
	if (sp.group === 'pathogen') return sp.hostKind === 'plant' ? 'Plant blight' : 'Animal disease';
	if (sp.group === 'bug') return (typeof BUG_CATEGORY_LABEL !== 'undefined' && BUG_CATEGORY_LABEL[sp.category]) || SWARM_LABEL[sp.icon || sp.category] || 'Bug';
	return sp.group === 'plant' ? PLANT_CATEGORY_LABEL[sp.category] || 'Plant' : ANIMAL_CATEGORY_LABEL[sp.category] || 'Animal';
}

function roleTag(sp) {
	const r = roleOf(sp);
	const label = r === 'plant' ? (sp.domain === 'water' ? 'aquatic' : 'plant') : r === 'bug' ? bugNiche(sp) : r === 'pathogen' ? (sp.hostKind === 'plant' ? 'blight' : 'disease') : r;
	return `<span class="role-tag role-${r === 'bug' ? 'bug-' + bugNiche(sp) : r}">${label}</span>`;
}

function yearOf(tick) {
	return Math.floor(tick / YEAR_TICKS) + 1;
}

function updateTabCounts() {
	let p = 0;
	let a = 0;
	let b = 0;
	let d = 0;
	const byCls = new Array(CLASS_NAME.length).fill(0);
	const reg = app.eco.registry;
	for (const id of reg.living) {
		const sp = reg.get(id);
		if (sp.group === 'plant') p++;
		else if (sp.group === 'bug') b++;
		else if (sp.group === 'pathogen') d++;
		else {
			a++;
			if (sp.cls >= 0) byCls[sp.cls]++;
		}
	}
	$('countPlant').textContent = formatCount(p);
	$('countAnimal').textContent = formatCount(a);
	$('countBug').textContent = formatCount(b);
	$('countDisease').textContent = formatCount(d);
	$('speciesTotals').textContent = `${p + a + b} living species${d ? ` · ${d} strains` : ''}`;
	for (const c of $('classChips').children) {
		const k = Number(c.dataset.cls);
		c.querySelector('em').textContent = formatCount(k < 0 ? a : byCls[k]);
	}
}

function sparkSVG(sp, alive) {
	const h = sp.history;
	const vals = [];
	for (let i = 1; i < h.length; i += 2) vals.push(h[i]);
	if (alive) vals.push(sp.population);
	if (vals.length < 2) return '<svg class="sp-spark" viewBox="0 0 60 18"></svg>';
	const m = Math.min(SPARK_POINTS, vals.length);
	let max = 1;
	const pts = [];
	for (let j = 0; j < m; j++) {
		const v = vals[Math.round((j / (m - 1)) * (vals.length - 1))];
		if (v > max) max = v;
		pts.push(v);
	}
	let d = '';
	for (let j = 0; j < m; j++) d += `${j ? 'L' : 'M'}${((j / (m - 1)) * 60).toFixed(1)} ${(17 - (pts[j] / max) * 15).toFixed(1)}`;
	return `<svg class="sp-spark" viewBox="0 0 60 18" preserveAspectRatio="none"><path d="${d}L60 18L0 18Z" fill="${sp.color}" fill-opacity=".16"/><path d="${d}" fill="none" stroke="${sp.color}" stroke-width="1.4" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;
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
		list.innerHTML = app.tab === 'disease' ? `<li class="empty">No ${showExtinct ? '' : 'active '}outbreaks yet.</li>` : `<li class="empty">No ${showExtinct ? '' : 'living '}species here yet.</li>`;
		return;
	}
	const unit = app.tab === 'plant' || app.tab === 'bug' ? ' tiles' : '';
	let html = '';
	for (const sp of items) {
		const dead = sp.population <= 0;
		html += `<li class="sp-row${dead ? ' extinct' : ''}${sp.id === app.selected ? ' selected' : ''}" data-id="${sp.id}">
			<div class="sp-icon">${iconSVG(sp.icon || sp.category, speciesColors(sp), 36)}</div>
			<div class="sp-main">
				<div class="sp-name">${sp.name}</div>
				<div class="sp-sub">${roleTag(sp)}<span class="cat-tag">${categoryLabel(sp)}</span>${dead ? '<span class="sp-gone">extinct Y' + yearOf(sp.extinctTick) + '</span>' : ''}</div>
			</div>
			<div class="sp-side">
				<div class="sp-pop">${dead ? '–' : formatCount(sp.population) + (sp.group === 'pathogen' ? (sp.hostKind === 'plant' ? ' tiles' : ' hosts') : unit)}</div>
				${sparkSVG(sp, !dead)}
			</div>
		</li>`;
	}
	if (total > items.length) html += `<li class="empty">+ ${total - items.length} more</li>`;
	const scroll = list.scrollTop;
	list.innerHTML = html;
	list.scrollTop = scroll;
}

const EVENT_GLYPH = { speciation: '+', extinction: '×', migration: '→', outbreak: '!', weather: '~', disaster: '^', info: '•' };

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
	['Toxicity', 4, (v) => pct(v), 'Toxin potency'],
	['Seed dispersal', 5, (v) => pct(v), 'Spore spread'],
	['Shade tolerance', 6, (v) => pct(v)],
	['Root vigour', 7, (v) => pct(v)],
	['Fruiting', 8, (v) => pct(v), null],
	['Sweetness', 9, (v) => pct(v), null],
	['Seed toxicity', 10, (v) => pct(v), 'Toxin type', (v) => TOXIN_WORDS[toxinIndex(v)]],
	['Bloom', 11, (v) => pct(v), 'Mycorrhizal', (v) => (v > 0.5 ? 'Symbiont' : 'Decomposer')],
	['Hue', 12, (v) => Math.round(v * 360) + '°'],
	['Pest defence', 13, (v) => pct(v), null],
	['Blight resistance', 14, (v) => pct(v)],
	['Flower depth', 15, (v) => pct(v), null],
	['Fire resistance', 16, (v) => pct(v), null],
];

const BUG_TRAITS = [
	['Heat preference', 0, (v) => tempWord(v)],
	['Moisture', 1, (v) => pct(v)],
	['Appetite', 2, (v) => pct(v)],
	['Mobility', 3, (v) => pct(v)],
	['Fecundity', 4, (v) => pct(v)],
	['Swarming', 5, (v) => pct(v), [0]],
	['Flower hue', 6, (v) => `<i style="display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:4px;vertical-align:-1px;background:hsl(${Math.round(v * 360)},62%,56%)"></i>${Math.round(v * 360)}°`, [3]],
	['Specialism', 7, (v) => pct(v), [3]],
	['Host size', 8, (v) => pct(v), [2]],
	['Tongue length', 9, (v) => pct(v), [3]],
];

const TOXIN_WORDS = ['Mild', 'Neurotoxic', 'Lethal'];

function toxinIndex(v) {
	return v < 0.33 ? 0 : v < 0.66 ? 1 : 2;
}

function fungusType(g, o = 0) {
	if (g[o + 11] > 0.5) return 'symbiont';
	const t = typeof toxinType === 'function' ? toxinType(g, o) : toxinIndex(g[o + 10] || 0);
	return TOXIN_WORDS[t].toLowerCase();
}

function hueSwatches(list) {
	return list
		.map((a) => `<i title="strength ${pct(Math.min(1, a.strength))}" style="display:inline-block;width:14px;height:14px;border-radius:4px;border:1px solid rgba(0,0,0,.35);background:hsl(${Math.round(a.hue * 360)},62%,52%);opacity:${(0.35 + 0.65 * Math.min(1, a.strength)).toFixed(2)}"></i>`)
		.join('');
}

function socialWord(v) {
	return (v < SOC_MIN ? 'Solitary' : v < COLONY_MIN ? 'Social' : 'Colonial') + ' · ' + pct(v);
}

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
	['Resistance', G_RES, (v) => pct(v)],
	['Scavenging', G_SCAV, (v) => pct(v)],
	['Territorial', G_TERR, (v) => pct(v)],
	['Herding', G_HERD, (v) => pct(v)],
	['Cold-blooded', G_COLD, (v) => (v > 0.5 ? 'Cold-blooded' : 'Warm-blooded')],
	['Drought tolerance', G_DRY, (v) => pct(v)],
	['Pack hunting', G_PACK, (v) => pct(v)],
	['Display', G_DISPLAY, (v) => pct(v)],
	['Choosiness', G_CHOOSY, (v) => pct(v)],
	['Appetite', G_APPETITE, (v) => pct(v)],
	['Dormancy', G_DORMANCY, (v) => pct(v)],
	['Alarm calls', G_ALARM, (v) => (v > ALARM_MIN ? 'Caller · ' : '') + pct(v)],
	['Sociality', G_SOCIAL, (v) => socialWord(v)],
	['Brood size', G_BROOD, (v) => (v < 0.4 ? 'Few young · ' : v > 0.6 ? 'Many young · ' : '') + pct(v)],
	['Parental care', G_CARE, (v) => pct(v)],
	['Cleaner', G_CLEAN, (v) => (v > CLEAN_MIN ? 'Cleaner · ' : '') + pct(v)],
	['Host tolerance', G_TOLER, (v) => pct(v)],
	['Toxicity', G_TOXIC, (v) => (v > TOX_MIN ? 'Toxic · ' : '') + pct(v)],
	['Mimicry', G_MIMIC, (v) => pct(v)],
	['Brain', G_BRAIN, (v) => (v > TOOL_MIN ? 'Tool user · ' : '') + pct(v)],
];

const DISEASE_TRAITS = [
	['Transmissibility', 0, (v) => pct(v)],
	['Virulence', 1, (v) => pct(v)],
	['Host range', 2, (v) => pct(v)],
];

function conditionWord(f) {
	return f < FAT_LEAN ? 'lean' : f < FAT_HEAVY ? 'fit' : f < FAT_OBESE ? 'heavy' : 'obese';
}

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
	if (app.overlay === 'tree' && app.tree.focus !== id) {
		app.tree.show(app.eco, id);
		$('overlayTitle').textContent = app.tree.title();
	}
	app.renderer.highlight = id;
	app.renderer.vegDirty = true;
	if (sp.group === 'pathogen') setTab('disease', false);
	else if (sp.group === 'plant' || sp.group === 'bug') setTab(sp.group, false);
	else {
		if (app.cls >= 0 && sp.cls !== app.cls) setClassFilter(-1, false);
		setTab('animal', false);
	}
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
	const patho = sp.group === 'pathogen';
	const host = patho ? eco.registry.get(sp.hostId) : null;
	$('detailSub').textContent = patho ? `${categoryLabel(sp)} · from ${host ? host.name : 'unknown host'}` : sp.group === 'bug' ? `${categoryLabel(sp)} swarm · ${bugNiche(sp)}` : `${categoryLabel(sp)} · ${sp.domain === 'water' ? 'aquatic' : sp.domain === 'amph' ? 'amphibious' : sp.domain === 'air' ? 'flying' : 'terrestrial'}`;
	const origin = sp.origin === 'founder' ? 'Founder' : sp.origin === 'migrated' ? 'Migrant' : sp.origin === 'emerged' ? 'Emerged' : sp.origin === 'jump' ? 'Host jump' : `Generation ${sp.generation}`;
	$('detailBadges').innerHTML = [
		roleTag(sp).replace('role-tag', 'badge role-tag'),
		alive ? `<span class="badge alive">${patho ? 'Active' : 'Living'}</span>` : `<span class="badge dead">${patho ? 'Burned out' : 'Extinct'} · Year ${yearOf(sp.extinctTick)}</span>`,
		`<span class="badge">${origin}</span>`,
		...(sp.group === 'plant' && sp.kind === 1 ? ['<span class="badge">Fungus</span>', `<span class="badge">${fungusType(sp.mean)[0].toUpperCase() + fungusType(sp.mean).slice(1)}</span>`] : []),
		...(sp.group === 'bug' && sp.domain ? [`<span class="badge">${sp.domain === 'water' ? 'Aquatic' : 'Land'}</span>`] : []),
	].join('');
	const bug = sp.group === 'bug';
	const unit = sp.group === 'plant' || bug ? ' tiles' : patho ? (sp.hostKind === 'plant' ? ' tiles' : ' hosts') : '';
	const cells = patho
		? [
				['Infected', alive ? formatCount(sp.population) + unit : '0'],
				['Peak', formatCount(sp.peak) + unit],
				['Deaths', formatCount(sp.deaths || 0)],
				['Appeared', 'Year ' + yearOf(sp.createdTick)],
			]
		: [
				['Population', alive ? formatCount(sp.population) + unit : '0'],
				['Peak', formatCount(sp.peak) + unit],
				['Appeared', 'Year ' + yearOf(sp.createdTick)],
				bug ? ['Mean density', alive ? pct(sp.density || 0) : '—'] : [sp.group === 'plant' ? 'Biomass' : 'Descendants', sp.group === 'plant' ? formatCount(sp.biomass || 0) : sp.children.length],
			];
	if (sp.group === 'plant') cells.push(['Health', alive ? pct(sp.health ?? 1) : '—']);
	const resK = sp.group === 'plant' ? 14 : sp.group === 'animal' ? G_RES : -1;
	if (resK >= 0 && sp.mean && resK < sp.mean.length) cells.push(['Avg resistance', pct(sp.mean[resK])]);
	if (!patho && sp.infected > 0) cells.push(['Infected', formatCount(sp.infected) + unit]);
	if (sp.group === 'animal') {
		cells.push(['Class', `${CLASS_NAME[sp.cls] || 'Animal'} · ${sp.role}`]);
		cells.push(['Habitat', (sp.domain === 'water' ? 'Water' : sp.domain === 'amph' ? 'Amphibious' : sp.domain === 'air' ? (sp.nic ? 'Air · fishes the shallows' : 'Air · perches on land') : 'Land') + (sp.mean[G_DRY] > 0.6 ? ' · dry-adapted' : '')]);
		const c = stageCounts(sp.id);
		if (sp.fat !== undefined) cells.push(['Body condition', `${conditionWord(sp.fat)} · fat ${pct(sp.fat)} · ${pct(Math.max(sp.protDef || 0, sp.minDef || 0))} deficient`, true]);
		if (sp.grpMean !== undefined) cells.push(['Mean group size', `${sp.grpMean.toFixed(1)}${sp.colonies ? ` · ${formatCount(sp.colonies)} colonies` : ''}${sp.dispersal ? ' · founded by dispersers' : ''}`]);
		cells.push(['Stages', `${formatCount(c[0])} juv · ${formatCount(c[1])} adult · ${formatCount(c[2])} elder · ${formatCount(c[3])} eggs`, true]);
	}
	$('detailGrid').innerHTML = cells.map(([k, v, wide]) => `<div${wide ? ' class="wide"' : ''}><small>${k}</small><strong>${v}</strong></div>`).join('');
	const hosts = patho && sp.hosts ? [...sp.hosts].sort((a, b) => b[1] - a[1]) : [];
	if (patho && !hosts.length && host) hosts.push([host.id, 0]);
	$('detailHostsWrap').hidden = !patho;
	$('detailHosts').innerHTML = hosts
		.map(([id, c]) => {
			const h = eco.registry.get(id);
			return h ? `<span class="chip${h.population <= 0 ? ' gone' : ''}" data-id="${h.id}">${iconSVG(h.icon || h.category, speciesColors(h), 18)}${h.name}<small>${c ? formatCount(c) : 'origin'}</small></span>` : '';
		})
		.join('');
	drawSpeciesChart($('speciesChart'), sp.history.concat(alive ? [eco.tick, sp.population] : []), sp.color, eco.tick);

	const defs = sp.group === 'plant' ? PLANT_TRAITS : bug ? BUG_TRAITS : patho ? DISEASE_TRAITS : ANIMAL_TRAITS;
	const fungus = sp.group === 'plant' && sp.kind === 1;
	const niche = bug ? nicheIndex(sp) : -1;
	const mean = sp.mean || sp.genome || [];
	let traits = defs
		.map(([label, k, fmt, fLabel, fFmt]) => {
			if (k >= mean.length) return '';
			if (bug) {
				if (!bugGeneShown(niche, k, fLabel)) return '';
				return `<div class="trait"><span>${label}</span><div class="track"><i style="width:${Math.max(3, mean[k] * 100)}%;background:${sp.color}"></i></div><em>${fmt(mean[k])}</em></div>`;
			}
			if (fungus && fLabel === null) return '';
			if (sp.group === 'plant' && sp.domain === 'water' && k >= 8 && k !== 14) return '';
			const v = sp.mean[k];
			let lbl = fungus && fLabel ? fLabel : label;
			const f = fungus && fFmt ? fFmt : fmt;
			if (sp.group === 'plant' && k === 1) lbl = sp.domain === 'water' ? 'Depth' : 'Moisture';
			return `<div class="trait"><span>${lbl}</span><div class="track"><i style="width:${Math.max(3, v * 100)}%;background:${sp.color}"></i></div><em>${f(v)}</em></div>`;
		})
		.join('');
	if (sp.group === 'animal') {
		const av = sp.aversion && sp.aversion.length ? sp.aversion : null;
		traits += `<div class="trait"><span>Avoids</span><div style="grid-column:span 2;display:flex;flex-wrap:wrap;gap:4px;align-items:center">${av ? hueSwatches(av) : '<em style="text-align:left;color:var(--muted)">nothing yet</em>'}</div></div>`;
		const pa = sp.preyAv && sp.preyAv.length ? sp.preyAv : null;
		if (pa) traits += `<div class="trait"><span>Avoids prey</span><div style="grid-column:span 2;display:flex;flex-wrap:wrap;gap:4px;align-items:center">${hueSwatches(pa)}</div></div>`;
		const nm = (id) => { const o = app.eco.registry.get(id); return o ? o.name : '#' + id; };
		if (sp.cleanOf) traits += `<div class="trait"><span>Cleaner of</span><em style="grid-column:span 2;text-align:left">${nm(sp.cleanOf)}</em></div>`;
		if (sp.mimicOf) traits += `<div class="trait"><span>Mimic of</span><em style="grid-column:span 2;text-align:left">${nm(sp.mimicOf)}</em></div>`;
		if (sp.tools) traits += `<div class="trait"><span>Tool use</span><em style="grid-column:span 2;text-align:left">since year ${Math.floor(sp.tools / YEAR_TICKS) + 1}${sp.toolN >= 1 ? ' · ' + Math.round(sp.toolN) + ' recent uses' : ''}</em></div>`;
		if (sp.learnedN) traits += `<div class="trait"><span>Wary of predators</span><em style="grid-column:span 2;text-align:left">${formatCount(sp.learnedN)} individuals</em></div>`;
	}
	if (sp.group === 'bug' && sp.pollOf) {
		const o = app.eco.registry.get(sp.pollOf);
		traits += `<div class="trait"><span>Pollinates</span><em style="grid-column:span 2;text-align:left">${o ? o.name : '#' + sp.pollOf}</em></div>`;
	}
	const showHist = sp.group === 'animal' && sp.showHist && sp.showHist.length >= 4 ? sp.showHist : null;
	if (showHist) traits += `<div class="trait" title="Mean display over time${sp.showy ? ' · showy' : ''}"><span>Display trend</span><canvas data-show-spark style="width:100%;height:20px;margin:0"></canvas><em>${pct(showHist[showHist.length - 1])}</em></div>`;
	const condHist = sp.group === 'animal' && sp.condHist && sp.condHist.length >= 6 ? sp.condHist : null;
	if (condHist) traits += `<div class="trait" title="Mean fat over time (body condition)"><span>Condition trend</span><canvas data-cond-spark style="width:100%;height:20px;margin:0"></canvas><em>${pct(condHist[condHist.length - 2])}</em></div>`;
	const lifeHist = sp.group === 'animal' && sp.lifeHist && sp.lifeHist.length >= 8 ? sp.lifeHist : null;
	if (sp.group === 'animal' && sp.clutch !== undefined) {
		const lifeCell = (lbl, n, val, tip) => `<div class="trait" title="${tip}"><span>${lbl}</span>${lifeHist ? `<canvas data-life-spark="${n}" style="width:100%;height:20px;margin:0"></canvas>` : '<i></i>'}<em>${val}</em></div>`;
		traits += lifeCell('Clutch size', 1, (sp.clutch || 0).toFixed(1), 'Young per breeding (eggs for egg layers)');
		traits += lifeCell('Care time', 2, `${sp.careT || 0} t`, 'Ticks a parent spends feeding and guarding its young');
		traits += lifeCell('Mean lifespan', 3, `${Math.round(sp.lifespan || 0)} t`, 'Mean age at death');
	}
	$('detailTraits').innerHTML = traits;
	if (lifeHist) for (const c of $('detailTraits').querySelectorAll('[data-life-spark]')) { const n = +c.dataset.lifeSpark; drawSparkline(c, lifeHist.filter((v, k) => k % 4 === n), sp.color); }
	if (condHist) drawSparkline($('detailTraits').querySelector('[data-cond-spark]'), condHist.filter((v, k) => k % 3 === 1), sp.color);
	if (showHist) drawSparkline($('detailTraits').querySelector('[data-show-spark]'), showHist.filter((v, k) => k % 2 === 1), sp.color);

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

function stageCounts(id) {
	const A = app.eco.animals;
	const out = [0, 0, 0, 0];
	for (let i = 0; i < A.count; i++) if (A.sp[i] === id) out[animalStage(A, i)]++;
	const E = app.eco.eggs;
	if (E) for (let e = 0; e < E.count; e++) if (E.alive[e] && E.sp[e] === id) out[3]++;
	return out;
}

function animalStage(A, i) {
	return A.age[i] < A.mature[i] ? 0 : A.age[i] > ELDER_AGE * A.maxAge[i] ? 2 : 1;
}

function setClassFilter(cls, render = true) {
	app.cls = cls;
	for (const c of $('classChips').children) c.classList.toggle('active', Number(c.dataset.cls) === cls);
	if (render) renderSpeciesList();
}

function buildClassChips() {
	const pal = (k) => paletteFor(k < 0 ? '#a9bcb0' : GROUP_COLORS[STAT_GROUPS[k].key]);
	$('classChips').innerHTML = [-1, ...STAT_GROUPS.map((g) => g.cls)]
		.map((k) => `<button data-cls="${k}" class="${k === app.cls ? 'active' : ''}" title="${k < 0 ? 'All animals' : STAT_GROUPS[k].label}">${k < 0 ? '' : iconSVG(STAT_GROUPS[k].icon, pal(k), 14)}<span>${k < 0 ? 'All' : STAT_GROUPS[k].label}</span><em>0</em></button>`)
		.join('');
}

function setTab(tab, render = true) {
	app.tab = tab;
	$('classChips').hidden = tab !== 'animal';
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
	if (app.overlay === 'tree') app.tree.draw();
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

function bugsAt(t) {
	const B = app.eco.bugs;
	const out = [];
	if (!B || !B.density || !B.species || t < 0) return out;
	const n = app.eco.plants.n;
	const niches = Math.min(SWARM_NICHES.length, Math.floor(B.density.length / n));
	for (let k = 0; k < niches; k++) {
		const q = k * n + t;
		const d = B.density[q];
		if (d > 0 && B.species[q]) out.push({ k, id: B.species[q], d });
	}
	return out;
}

function densestBug(t) {
	let best = 0;
	let bd = 0;
	for (const b of bugsAt(t)) {
		if (b.d > bd) {
			bd = b.d;
			best = b.id;
		}
	}
	return best;
}

function clickTarget(wx, wy) {
	const t = tileAt(wx, wy);
	const bug = densestBug(t);
	if (bug && app.renderer.mode === 'bugs') return bug;
	const a = pickAnimal(wx, wy);
	if (a >= 0) return app.eco.animals.sp[a];
	const plant = t >= 0 ? app.eco.plants.topSpecies(t) : 0;
	return plant || bug || 0;
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
	const poll = P.poll && !P.water[t] ? ' · pollination ' + pct(Math.min(1, P.poll[t])) : '';
	let html = `<div class="tt-meta">${biome.name} · ${temp}°C · ${P.water[t] ? 'depth ' + pct(P.depth[t]) : 'moisture ' + pct(w.humidity[t])} · nutrients ${pct(P.soil.nutrient[t] / SOIL_MAX)}${P.soil.litter ? ' · litter ' + P.soil.litter[t].toFixed(2) : ''}${poll}</div>`;
	const target = clickTarget(wx, wy);
	let bugHtml = '';
	for (const b of bugsAt(t)) {
		const sp = reg.get(b.id);
		if (!sp) continue;
		const hint = sp.id === target ? '<small class="tt-hint">click to inspect this swarm</small>' : '';
		bugHtml += `<div class="tt-row">${iconSVG(sp.icon || sp.category, speciesColors(sp), 30)}<div><strong>${sp.name}</strong><small>${roleTag(sp)}${categoryLabel(sp)} swarm</small><small>density ${pct(Math.min(1, b.d))}</small>${hint}</div></div>`;
	}
	if (app.renderer.mode === 'bugs') html += bugHtml;
	const a = pickAnimal(wx, wy);
	if (a >= 0) {
		const sp = reg.get(A.sp[a]);
		const states = ['resting', 'grazing', 'foraging', 'hunting', 'fleeing', 'seeking water', 'heading home', 'heading to den', 'dispersing', 'cleaning', 'seeking a host'];
		const dormWords = ['', 'hibernating', 'brumating', 'aestivating', 'in torpor'];
		const home = A.home && A.home[a] ? ` · ${['', 'has a nest', 'has a den', 'young of a den'][A.home[a]]}` : '';
		const st = A.strain && A.strain[a] ? reg.get(A.strain[a]) : null;
		const sick = st ? `<small class="tt-sick">sick: ${st.name}</small>` : '';
		const cap = A.emax[a] * A.gf[a];
		const fr = A.fat && cap > 0 ? A.fat[a] / cap : 0;
		const lowP = A.nProt && A.nProt[a] < DEFICIT;
		const lowM = A.nMin && A.nMin[a] < DEFICIT;
		const cond = A.fat ? `<small${lowP || lowM ? ' class="tt-sick"' : ''}>${conditionWord(fr)} · protein ${lowP ? 'low' : pct(Math.min(1, A.nProt[a]))} · minerals ${lowM ? 'low' : pct(Math.min(1, A.nMin[a]))}</small>` : '';
		const water = A.domain[a] !== 1 && A.water ? ` · water ${pct(Math.min(1, Math.max(0, A.water[a])))}` : '';
		html += `<div class="tt-row">${iconSVG(sp.icon, speciesColors(sp), 30)}<div><strong>${sp.name}</strong><small>${roleTag(sp)}${categoryLabel(sp)}</small><small>${A.domain[a] === 3 ? (A.fly[a] ? 'flying · ' : 'perched · ') : ''}${A.dorm && A.dorm[a] ? dormWords[A.dorm[a]] : states[A.state[a]]} · ${A.lv && A.lv[a] ? ['', 'tadpole', 'larva'][A.lv[a]] : ['juvenile', 'adult', 'elder'][animalStage(A, a)]}${A.cr && A.cr[a] > 0 ? ' · cared for' : ''}${A.ld && A.ld[a] ? ' · leads' : ''} · age ${A.age[a]}${home}</small><small>energy ${pct(cap > 0 ? Math.min(1, Math.max(0, A.energy[a] / cap)) : 0)}${water}</small>${cond}${sick}</div></div>`;
	}
	for (let slot = 0; slot < 2; slot++) {
		const p = slot * P.n + t;
		if (!P.species[p]) continue;
		const sp = reg.get(P.species[p]);
		const fungal = P.kind && P.kind[p] === 1;
		let extra = '';
		if (fungal) extra = ' · ' + fungusType(P.genome, p * PG);
		else if (P.fruit && (P.fruit[p] > 0.001 || P.genome[p * PG + 8] > 0.5)) extra = ' · fruit ' + P.fruit[p].toFixed(2);
		const bst = P.blight && P.blight[p] ? reg.get(P.blight[p]) : null;
		const blt = bst ? `<small class="tt-sick">blight: ${bst.name}</small>` : '';
		html += `<div class="tt-row">${iconSVG(sp.icon || sp.category, speciesColors(sp), 30)}<div><strong>${sp.name}</strong><small>${categoryLabel(sp)} · ${slot ? 'understory' : 'canopy'}${fungal ? ' · fungus' : ''}</small><small>biomass ${P.biomass[p].toFixed(2)} · health ${pct(P.health[p])}${extra}</small>${blt}</div></div>`;
	}
	if (app.renderer.mode !== 'bugs') html += bugHtml;
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
			const id = clickTarget(wx, wy);
			if (id) selectSpecies(id);
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
	$('saveBtn').onclick = saveWorld;
	$('loadBtn').onclick = () => !app.busy && $('loadInput').click();
	$('loadInput').onchange = (e) => {
		loadWorld(e.target.files[0]);
		e.target.value = '';
	};

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
	$('optDisease').onchange = (e) => app.eco && (app.eco.options.disease = e.target.checked);
	$('optDisasters').onchange = (e) => app.eco && (app.eco.options.disasters = e.target.checked);
	$('showSwarms').onchange = (e) => (app.renderer.showSwarms = e.target.checked);
	$('optWeather').onchange = (e) => {
		if (!app.eco) return;
		app.eco.options.weather = e.target.checked;
		updateWeatherBadge();
	};
	$('showWeather').onchange = (e) => (app.renderer.showWeather = e.target.checked);
	$('optFast').onchange = async (e) => {
		const box = e.target;
		if (box.checked && !confirm('Fast mode runs the plant and soil step on the GPU.\n\nRuns stop being exactly repeatable: the same seed and settings can play out differently. Saves still load in either mode.\n\nTurn fast mode on?')) {
			box.checked = false;
			return;
		}
		box.disabled = true;
		try {
			box.checked = await SimClient.setFast(box.checked);
		} catch (err) {
			console.warn('Fast mode could not be changed', err);
			box.checked = SimClient.fast;
		}
		box.disabled = false;
	};
	SimClient.onFast = (on) => ($('optFast').checked = on);

	$('tabs').addEventListener('click', (e) => {
		const b = e.target.closest('button');
		if (!b) return;
		if (!$('detail').hidden) closeDetail();
		setTab(b.dataset.tab);
	});
	for (const el of document.querySelectorAll('.tab-icon')) el.innerHTML = iconSVG(el.dataset.icon, NEUTRAL, 14);
	$('showExtinct').onchange = renderSpeciesList;
	$('classChips').addEventListener('click', (e) => {
		const b = e.target.closest('button');
		if (b) setClassFilter(Number(b.dataset.cls));
	});
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
	$('detailHosts').addEventListener('click', pickId);
	$('detailBack').onclick = closeDetail;
	$('treeBtn').onclick = () => openTree();
	$('helpBtn').onclick = () => (app.overlay === 'help' ? closeOverlay() : openHelp());
	$('overlayClose').onclick = closeOverlay;
	$('overlay').addEventListener('pointerdown', (e) => e.target === $('overlay') && closeOverlay());
	$('treeModes').addEventListener('click', (e) => {
		const b = e.target.closest('button');
		if (b) openTree(b.dataset.t);
	});

	document.addEventListener('keydown', (e) => {
		if (e.target.matches('input, select') || e.ctrlKey || e.metaKey || e.altKey) return;
		const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
		if (e.code === 'Space') {
			e.preventDefault();
			setRunning(!app.running);
		} else if (k === '.') stepOnce();
		else if (k === 'f') app.renderer.fit();
		else if (k === 't') openTree();
		else if (k === '?' || k === 'h') openHelp();
		else if (k === 'w') {
			const box = $('showWeather');
			box.checked = !box.checked;
			app.renderer.showWeather = box.checked;
		} else if (k === 'Escape') {
			if (app.overlay) closeOverlay();
			else closeDetail();
		}
	});

	$('brandMark').innerHTML = iconSVG('deer', paletteFor('#c9955c'), 28);
	$('themeBtn').onclick = () => setTheme(THEMES[(THEMES.indexOf(app.theme) + 1) % THEMES.length]);
	setupCards();
}

function showOverlay(view, title) {
	app.overlay = view;
	const el = $('overlay');
	el.dataset.view = view;
	el.hidden = false;
	$('overlayTitle').textContent = title;
	$('tooltip').hidden = true;
}

function openTree(mode) {
	if (!app.eco || !app.eco.registry.get(app.selected)) return;
	showOverlay('tree', '');
	for (const b of $('treeModes').children) b.classList.toggle('active', b.dataset.t === (mode || app.tree.mode));
	app.tree.show(app.eco, app.selected, mode);
	$('overlayTitle').textContent = app.tree.title();
}

function openHelp() {
	showOverlay('help', 'Help · views, controls and shortcuts');
	$('helpBody').scrollTop = 0;
}

function closeOverlay() {
	app.overlay = null;
	$('overlay').hidden = true;
	$('treeTip').hidden = true;
}

function setTheme(theme) {
	app.theme = THEMES.includes(theme) ? theme : 'auto';
	if (app.theme === 'auto') delete document.documentElement.dataset.theme;
	else document.documentElement.dataset.theme = app.theme;
	const btn = $('themeBtn');
	btn.innerHTML = iconSVG(THEME_ICON[app.theme], NEUTRAL, 18);
	btn.title = `Theme: ${app.theme} (click to change)`;
	storeSet(THEME_KEY, app.theme);
	if (app.eco) updateUi(true);
}

function setupCards() {
	let collapsed = [];
	try {
		collapsed = JSON.parse(storeGet(CARDS_KEY) || '[]');
	} catch (e) {}
	if (!Array.isArray(collapsed)) collapsed = [];
	const cards = document.querySelectorAll('.card[data-card]');
	const save = () => storeSet(CARDS_KEY, JSON.stringify([...cards].filter((c) => c.classList.contains('collapsed')).map((c) => c.dataset.card)));
	for (const card of cards) {
		const head = card.querySelector('.card-head');
		const set = (on) => {
			card.classList.toggle('collapsed', on);
			head.setAttribute('aria-expanded', String(!on));
		};
		set(collapsed.includes(card.dataset.card));
		const toggle = () => {
			set(!card.classList.contains('collapsed'));
			save();
			if (app.eco && !card.classList.contains('collapsed')) updateStats();
		};
		head.addEventListener('click', toggle);
		head.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				e.stopPropagation();
				toggle();
			}
		});
	}
}

function init() {
	const fromHash = parseInt(location.hash.slice(1), 10);
	$('seedInput').value = Number.isFinite(fromHash) ? fromHash : Math.floor(Math.random() * 1e6);
	setTheme(storeGet(THEME_KEY));
	buildStatCards();
	buildClassChips();
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
	app.tree = new FamilyTree($('treeCanvas'), $('treeTip'), selectSpecies);
	window.addEventListener('resize', () => {
		app.renderer.resize();
		if (app.overlay === 'tree') app.tree.draw();
	});
	newWorld();
	if (/[?&]play\b/.test(location.search)) setRunning(true);
	requestAnimationFrame(frame);
}

init();
