(() => {
  const SAVE_KEY = 'vanilla-incremental-save-v1';
  const SIZE = 10;

  const ORES = [
    { id: 'dirt', name: 'Dirt', color: '#8a6142', weight: 40 },
    { id: 'stone', name: 'Stone', color: '#8e8c94', weight: 25 },
    { id: 'copper', name: 'Copper', color: '#d27a3e', weight: 13 },
    { id: 'iron', name: 'Iron', color: '#b8a59a', weight: 9 },
    { id: 'gold', name: 'Gold', color: '#f0c43c', weight: 5.5 },
    { id: 'silver', name: 'Silver', color: '#d8e2ee', weight: 4.2 },
    { id: 'diamond', name: 'Diamond', color: '#6fe3f0', weight: 2.3 },
    { id: 'obsidian', name: 'Obsidian', color: '#7a4fc0', weight: 1 },
  ];
  ORES.forEach((o, i) => { o.points = i + 1; o.perPoint = i >= 6 ? 0.25 : i >= 4 ? 0.5 : 1; });
  let ALLOC = {};
  const oreWeight = o => o.weight + (ALLOC[o.id] || 0) * o.perPoint;
  const totalWeight = () => ORES.reduce((s, o) => s + oreWeight(o), 0);
  const REBIRTH = { min: 1e8 };

  const UPGRADES = [
    { id: 'mult', label: o => `+1 ${o.name} multiplier`, cost: 10, growth: 1.35 },
    { id: 'base', label: o => `+1 base ${o.name}`, cost: 25, growth: 1.45 },
    { id: 'exp', label: o => `+0.01 ${o.name} exponent`, cost: 100, growth: 1.75 },
    { id: 'unique', label: o => UNIQUES[o.id] ? UNIQUES[o.id].label : 'Coming soon', cost: 10000, growth: 1, max: 1 },
  ];

  const UNIQUES = {
    dirt: { label: 'Unlock Mastery' },
    stone: { label: 'Unlock Autominer' },
    copper: { label: 'Unlock Rebirth', cost: 100000 },
    gold: { label: 'Unlock Offline Mining' },
    silver: { label: 'Unlock Pickaxe' },
    obsidian: { label: 'Unlock Special Tiles', cost: 10 },
  };

  const SPECIALS = {
    chest: { name: 'Chest', icon: '🎁', chance: 0.01, color: '#f0c43c', tiles: 10 },
    tnt: { name: 'TNT', icon: '🧨', chance: 0.02, color: '#ff6b4a' },
    vein: { name: 'Vein', icon: '✨', chance: 0.015, color: '#9fe8ff', digs: 5 },
  };
  let SPECIAL_ON = false;

  const MASTERY = { cost: 100000, growth: 10 };
  const AUTO = {
    bulk: { cost: 10, growth: 4, max: 99 },
    speed: { cost: 5, growth: 4.5, factor: 0.8, min: 0.1 },
  };

  const OFFLINE = { base: 0.25, step: 0.15, max: 5, cost: 25000, growth: 4, cap: 86400, min: 30 };
  const PICKS = [
    { name: 'Single tile', r: 0, sq: 0 },
    { name: 'Plus', r: 1, sq: 0 },
    { name: '3x3', r: 1, sq: 1 },
    { name: 'Diamond', r: 2, sq: 0 },
    { name: '5x5', r: 2, sq: 1 },
    { name: 'Star', r: 3, sq: 0 },
    { name: '7x7', r: 3, sq: 1 },
  ];
  const PICK = { cost: 50000, growth: 10 };
  const BUYS = [1, 5, 10, 100, 'max'];

  const TABS = [
    { id: 'mines', name: 'Mines' },
    { id: 'mastery', name: 'Mastery', unlock: () => S.ores.dirt.unique > 0 },
    { id: 'rebirth', name: 'Rebirth', unlock: () => S.ores.copper.unique > 0 },
    { id: 'stats', name: 'Stats' },
    { id: 'soon', name: 'Coming soon', locked: true },
  ];

  const $ = id => document.getElementById(id);

  function fresh() {
    const S = { tab: 'mines', layer: 1, grid: null, ores: {}, auto: { bulk: 0, speed: 0, off: 0 }, pick: 0, buy: 1, vein: 0, seen: Date.now(), rb: { count: 0, points: 0, alloc: {} }, stats: { time: 0, clicks: 0, tiles: 0, layers: 0, best: 0, chest: 0, tnt: 0, vein: 0, offline: 0 } };
    for (const o of ORES) S.ores[o.id] = { amt: 0, total: 0, run: 0, found: 0, mult: 0, base: 0, exp: 0, unique: 0, mastery: 0 };
    S.grid = newGrid();
    return S;
  }

  function rollOre() {
    let r = Math.random() * totalWeight();
    for (const o of ORES) { r -= oreWeight(o); if (r < 0) return o.id; }
    return ORES[0].id;
  }

  function newGrid() {
    const g = [];
    for (let i = 0; i < SIZE * SIZE; i++) {
      const c = { ore: rollOre(), dug: 0 };
      if (SPECIAL_ON) {
        let r = Math.random();
        for (const k in SPECIALS) { r -= SPECIALS[k].chance; if (r < 0) { c.sp = k; break; } }
      }
      g.push(c);
    }
    return g;
  }

  function load() {
    const S = fresh();
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return S;
      const d = JSON.parse(raw);
      if (typeof d.layer === 'number') S.layer = d.layer;
      if (typeof d.tab === 'string' && TABS.some(t => t.id === d.tab && !t.locked)) S.tab = d.tab;
      if (d.rb) {
        for (const k of ['count', 'points']) if (typeof d.rb[k] === 'number' && isFinite(d.rb[k])) S.rb[k] = d.rb[k];
        if (d.rb.alloc) for (const o of ORES) if (typeof d.rb.alloc[o.id] === 'number' && d.rb.alloc[o.id] > 0) S.rb.alloc[o.id] = Math.floor(d.rb.alloc[o.id]);
        let used = 0;
        for (const o of ORES) { const a = Math.min(S.rb.alloc[o.id] || 0, S.rb.points - used); S.rb.alloc[o.id] = a; used += a; }
      }
      if (d.auto) for (const k of ['bulk', 'speed', 'off']) if (typeof d.auto[k] === 'number' && isFinite(d.auto[k])) S.auto[k] = d.auto[k];
      if (Array.isArray(d.grid) && d.grid.length === SIZE * SIZE && d.grid.every(c => c && S.ores[c.ore])) S.grid = d.grid.map(c => SPECIALS[c.sp] ? { ore: c.ore, dug: c.dug ? 1 : 0, sp: c.sp } : { ore: c.ore, dug: c.dug ? 1 : 0 });
      if (BUYS.includes(d.buy)) S.buy = d.buy;
      for (const k of ['pick', 'seen']) if (typeof d[k] === 'number' && isFinite(d[k])) S[k] = d[k];
      if (d.stats) for (const k of Object.keys(S.stats)) if (typeof d.stats[k] === 'number' && isFinite(d.stats[k])) S.stats[k] = d.stats[k];
      if (typeof d.vein === 'number' && isFinite(d.vein)) S.vein = Math.max(0, d.vein);
      for (const o of ORES) {
        const src = d.ores && d.ores[o.id];
        if (!src) continue;
        for (const k of Object.keys(S.ores[o.id])) if (typeof src[k] === 'number' && isFinite(src[k])) S.ores[o.id][k] = src[k];
      }
    } catch (e) {}
    return S;
  }

  let S = load();
  ALLOC = S.rb.alloc;
  SPECIAL_ON = S.ores.obsidian.unique > 0;

  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {}
  }

  function fmt(n) {
    if (n < 1000) return n < 10 && n % 1 ? n.toFixed(2) : String(Math.floor(n));
    const units = ['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No'];
    let i = -1;
    while (n >= 1000 && i < units.length - 1) { n /= 1000; i++; }
    if (n >= 1000) return n.toExponential(2).replace('+', '');
    return n.toFixed(n < 10 ? 2 : n < 100 ? 1 : 0) + units[i];
  }

  const ALLOC_BONUS = { base: 0.25, mult: 0.25, exp: 0.0025 };
  const allocOf = id => S.rb.alloc[id] || 0;
  const oreBase = id => 1 + S.ores[id].base + allocOf(id) * ALLOC_BONUS.base;
  const oreMult = id => 1 + S.ores[id].mult + allocOf(id) * ALLOC_BONUS.mult;
  const oreExp = id => 1 + S.ores[id].exp * 0.01 + allocOf(id) * ALLOC_BONUS.exp;
  const oreMastery = id => Math.pow(2, S.ores[id].mastery);
  const oreGain = id => Math.pow(oreBase(id) * oreMult(id), oreExp(id)) * oreMastery(id);
  const hasAuto = () => S.ores.stone.unique > 0;
  const autoBulk = () => 1 + S.auto.bulk;
  const autoInterval = () => Math.max(AUTO.speed.min, Math.pow(AUTO.speed.factor, S.auto.speed));
  const autoCostAt = (k, l) => Math.ceil(AUTO[k].cost * Math.pow(AUTO[k].growth, l));
  const autoCap = k => k === 'bulk' ? AUTO.bulk.max : Math.ceil(Math.log(AUTO.speed.min) / Math.log(AUTO.speed.factor));
  const autoMaxed = k => S.auto[k] >= autoCap(k);
  const masteryCost = l => Math.ceil(MASTERY.cost * Math.pow(MASTERY.growth, l));

  function plan(costAt, lvl, have, cap = Infinity) {
    const max = S.buy === 'max';
    const want = max ? Infinity : S.buy;
    let n = 0, total = 0;
    while (n < want && lvl + n < cap && n < 10000) {
      const c = costAt(lvl + n);
      if (max && total + c > have) break;
      total += c;
      n++;
    }
    if (max && !n && lvl < cap) return { n: 1, total: costAt(lvl), can: false };
    return { n, total, can: n > 0 && total <= have };
  }

  const xN = n => n > 1 ? ` ×${n}` : '';

  const hasOffline = () => S.ores.gold.unique > 0;
  const offEff = () => OFFLINE.base + OFFLINE.step * S.auto.off;
  const offCostAt = l => Math.ceil(OFFLINE.cost * Math.pow(OFFLINE.growth, l));
  const pickTier = () => S.ores.silver.unique > 0 ? 1 + S.pick : 0;
  const pickCostAt = l => Math.ceil(PICK.cost * Math.pow(PICK.growth, l));
  const inPick = (p, dx, dy) => p.sq ? Math.max(Math.abs(dx), Math.abs(dy)) <= p.r : Math.abs(dx) + Math.abs(dy) <= p.r;

  function cost(u, lvl, oreId) {
    const c = u.id === 'unique' && UNIQUES[oreId] && UNIQUES[oreId].cost || u.cost;
    return Math.ceil(c * Math.pow(u.growth, lvl));
  }

  const isSoon = (oreId, u) => u.id === 'unique' && !UNIQUES[oreId];
  const isMaxed = (st, u) => u.max && st[u.id] >= u.max;

  function upgPlan(oreId, u) {
    const st = S.ores[oreId];
    if (u.max) {
      const c = cost(u, st[u.id], oreId);
      return { n: isMaxed(st, u) ? 0 : 1, total: c, can: !isMaxed(st, u) && st.amt >= c };
    }
    return plan(l => cost(u, l, oreId), st[u.id], st.amt);
  }
  const mastPlan = oreId => plan(masteryCost, S.ores[oreId].mastery, S.ores[oreId].amt);
  const autoPlan = k => plan(l => autoCostAt(k, l), S.auto[k], S.ores.obsidian.amt, autoCap(k));
  const offPlan = () => plan(offCostAt, S.auto.off, S.ores.gold.amt, OFFLINE.max);
  const pickPlan = () => plan(pickCostAt, S.pick, S.ores.silver.amt, PICKS.length - 2);

  function buy(oreId, u) {
    if (isSoon(oreId, u)) return;
    const st = S.ores[oreId];
    const pl = upgPlan(oreId, u);
    if (!pl.can) return;
    st.amt -= pl.total;
    st[u.id] += pl.n;
    if (u.id === 'unique') { SPECIAL_ON = S.ores.obsidian.unique > 0; buildTabs(); renderAll(); return; }
    renderAll(true);
  }

  function buyMastery(oreId) {
    const pl = mastPlan(oreId);
    if (!pl.can) return;
    S.ores[oreId].amt -= pl.total;
    S.ores[oreId].mastery += pl.n;
    renderAll(true);
  }

  function buyAuto(k) {
    const pl = autoPlan(k);
    if (!pl.can) return;
    S.ores.obsidian.amt -= pl.total;
    S.auto[k] += pl.n;
    renderAll(true);
  }

  function buyOffline() {
    const pl = offPlan();
    if (!pl.can) return;
    S.ores.gold.amt -= pl.total;
    S.auto.off += pl.n;
    renderAll(true);
  }

  function buyPick() {
    const pl = pickPlan();
    if (!pickTier() || !pl.can) return;
    S.ores.silver.amt -= pl.total;
    S.pick += pl.n;
    renderAll(true);
  }

  let layerTimer = 0;

  function give(oreId, g) {
    const st = S.ores[oreId];
    st.amt += g;
    st.total += g;
    st.run += g;
  }

  function collect(cell) {
    cell.dug = 1;
    const st = S.ores[cell.ore];
    let g = oreGain(cell.ore);
    if (S.vein > 0) { g *= 2; S.vein--; }
    S.stats.tiles++;
    if (g > S.stats.best) S.stats.best = g;
    st.amt += g;
    st.total += g;
    st.run += g;
    if (!st.found++) buildTabs();
    return g;
  }

  function nextLayer() {
    clearTimeout(layerTimer);
    layerTimer = 0;
    S.layer++;
    S.stats.layers++;
    S.grid = newGrid();
    renderGrid();
  }

  function digAt(i, list, events) {
    const cell = S.grid[i];
    if (cell.dug) return 0;
    const g = collect(cell);
    list.push(i);
    if (!cell.sp) return g;
    const sp = cell.sp;
    S.stats[sp]++;
    if (sp === 'chest') {
      for (const o of ORES) if (S.ores[o.id].found) give(o.id, oreGain(o.id) * SPECIALS.chest.tiles);
    } else if (sp === 'vein') {
      S.vein += SPECIALS.vein.digs;
    }
    if (events) events.push({ i, sp });
    if (sp === 'tnt') {
      const x = i % SIZE, y = Math.floor(i / SIZE);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if ((dx || dy) && nx >= 0 && ny >= 0 && nx < SIZE && ny < SIZE) digAt(ny * SIZE + nx, list, events);
      }
    }
    return g;
  }

  function dig(i, el) {
    const cell = S.grid[i];
    if (cell.dug || layerTimer) return;
    const list = [];
    const events = [];
    S.stats.clicks++;
    const g = digAt(i, list, events);
    const p = PICKS[pickTier()];
    const x = i % SIZE, y = Math.floor(i / SIZE);
    for (let dy = -p.r; dy <= p.r; dy++) for (let dx = -p.r; dx <= p.r; dx++) {
      const nx = x + dx, ny = y + dy;
      if ((dx || dy) && inPick(p, dx, dy) && nx >= 0 && ny >= 0 && nx < SIZE && ny < SIZE) digAt(ny * SIZE + nx, list, events);
    }
    const o = ORES.find(x => x.id === cell.ore);
    const tiles = $('grid').querySelectorAll('.tile');
    for (const j of list) paintTile(tiles[j], S.grid[j]);
    floatText(el, `+${fmt(g)} ${o.name}`, o.color);
    for (const e of events) floatText(tiles[e.i], `${SPECIALS[e.sp].icon} ${SPECIALS[e.sp].name}!`, SPECIALS[e.sp].color, 1);
    if (S.grid.every(c => c.dug)) layerTimer = setTimeout(nextLayer, 450);
    renderAll(true);
  }

  function autoDig(n) {
    let newLayer = false;
    const painted = [];
    for (let k = 0; k < n; k++) {
      const open = [];
      S.grid.forEach((c, i) => { if (!c.dug) open.push(i); });
      if (!open.length) {
        clearTimeout(layerTimer);
        layerTimer = 0;
        S.layer++;
        S.stats.layers++;
        S.grid = newGrid();
        newLayer = true;
        k--;
        continue;
      }
      const i = open[Math.floor(Math.random() * open.length)];
      const before = painted.length;
      digAt(i, painted);
      k += painted.length - before - 1;
    }
    if (newLayer) { renderGrid(); return; }
    const tiles = $('grid').querySelectorAll('.tile');
    for (const i of painted) paintTile(tiles[i], S.grid[i]);
    if (!layerTimer && S.grid.every(c => c.dug)) layerTimer = setTimeout(nextLayer, 450);
  }

  let autoAcc = 0;
  let last = performance.now();
  function tick(now) {
    const dt = Math.min(1, (now - last) / 1000);
    last = now;
    const wall = Date.now();
    const gap = (wall - S.seen) / 1000;
    S.seen = wall;
    if (gap >= OFFLINE.min) {
      const r = offlineGain(gap);
      if (r) { showOffline(r); buildTabs(); renderGrid(); renderAll(); }
    }
    S.stats.time += dt;
    if (S.tab === 'stats' && Math.floor(S.stats.time) !== Math.floor(S.stats.time - dt)) renderStats();
    if (hasAuto()) {
      autoAcc += dt;
      const iv = autoInterval();
      let mines = 0;
      while (autoAcc >= iv) { autoAcc -= iv; mines++; }
      if (mines) { autoDig(mines * autoBulk()); renderAll(true); }
      $('autoBar').style.width = Math.min(100, autoAcc / iv * 100) + '%';
    }
    requestAnimationFrame(tick);
  }

  function offlineGain(sec) {
    if (!hasOffline() || !hasAuto() || sec < OFFLINE.min) return null;
    sec = Math.min(sec, OFFLINE.cap);
    const digs = Math.floor(sec / autoInterval() * autoBulk() * offEff());
    if (!digs) return null;
    const tw = totalWeight();
    const got = [];
    for (const o of ORES) {
      const n = digs * oreWeight(o) / tw;
      if (n < 1 && !S.ores[o.id].found) continue;
      const g = n * oreGain(o.id);
      give(o.id, g);
      S.ores[o.id].found += Math.floor(n);
      got.push([o, g]);
    }
    const layers = Math.floor(digs / (SIZE * SIZE));
    S.layer += layers;
    S.stats.layers += layers;
    S.stats.tiles += digs;
    S.stats.offline += sec;
    return { sec, digs, got };
  }

  function dur(sec) {
    sec = Math.floor(sec);
    const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
    return h ? `${h}h ${m}m` : m ? `${m}m ${s}s` : `${s}s`;
  }

  function showOffline(r) {
    if (!r) return;
    $('offTime').textContent = `You were away for ${dur(r.sec)}. Your autominer dug ${fmt(r.digs)} tiles at ${Math.round(offEff() * 100)}% speed.`;
    $('offList').innerHTML = r.got.map(([o, g]) => `<div class="offrow"><span class="dot" style="background:${o.color}"></span><span>${o.name}</span><b>+${fmt(g)}</b></div>`).join('');
    $('offline').hidden = false;
  }

  function floatText(el, text, color, big) {
    const f = document.createElement('div');
    f.className = big ? 'float big' : 'float';
    f.textContent = text;
    f.style.color = color;
    f.style.left = (el.offsetLeft + el.offsetWidth / 2) + 'px';
    f.style.top = el.offsetTop + 'px';
    $('grid').appendChild(f);
    setTimeout(() => f.remove(), 900);
  }

  function paintTile(el, cell) {
    if (!cell.dug) return;
    const o = ORES.find(x => x.id === cell.ore);
    el.classList.remove('sp', 'sp-chest', 'sp-tnt', 'sp-vein');
    el.removeAttribute('data-icon');
    el.classList.add('dug');
    el.style.setProperty('--c', o.color);
    el.title = o.name;
    el.disabled = true;
  }

  function renderGrid() {
    const grid = $('grid');
    grid.replaceChildren();
    S.grid.forEach((cell, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tile';
      b.setAttribute('aria-label', 'Dig tile');
      b.addEventListener('click', () => dig(i, b));
      if (cell.sp && !cell.dug) {
        const sp = SPECIALS[cell.sp];
        b.classList.add('sp', 'sp-' + cell.sp);
        b.dataset.icon = sp.icon;
        b.style.setProperty('--g', sp.color);
        b.title = sp.name;
      }
      paintTile(b, cell);
      grid.appendChild(b);
    });
    updateMineHead();
  }

  function updateMineHead() {
    $('layer').textContent = S.layer;
    $('left').textContent = S.grid.filter(c => !c.dug).length;
    $('vein').hidden = !S.vein;
    $('veinLeft').textContent = S.vein;
    $('spHint').hidden = !SPECIAL_ON;
  }

  const walletEls = {};
  function buildWallet() {
    const w = $('wallet');
    for (const o of ORES) {
      const d = document.createElement('div');
      d.className = 'coin';
      d.innerHTML = `<span class="dot" style="background:${o.color}"></span><small>${o.name}</small><b></b>`;
      w.appendChild(d);
      walletEls[o.id] = d;
    }
  }

  function renderWallet() {
    for (const o of ORES) {
      const st = S.ores[o.id];
      walletEls[o.id].classList.toggle('hide', !st.found);
      walletEls[o.id].querySelector('b').textContent = fmt(st.amt);
    }
  }

  const cardEls = {};
  function buildUpgrades() {
    const box = $('upgrades');
    for (const o of ORES) {
      const card = document.createElement('div');
      card.className = 'ore';
      card.style.setProperty('--c', o.color);
      card.innerHTML = `<div class="orehead"><span class="dot" style="background:${o.color}"></span><h3>${o.name}</h3><span class="chance"></span></div><div class="stats"></div>`;
      const btns = UPGRADES.map(u => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'upg';
        b.innerHTML = '<span></span><small></small>';
        b.addEventListener('click', () => buy(o.id, u));
        card.appendChild(b);
        return b;
      });
      box.appendChild(card);
      cardEls[o.id] = { card, stats: card.querySelector('.stats'), chance: card.querySelector('.chance'), btns };
    }
  }

  function renderUpgrades() {
    for (const o of ORES) {
      const st = S.ores[o.id];
      const el = cardEls[o.id];
      const found = st.found > 0;
      el.card.classList.toggle('locked', !found);
      el.chance.textContent = (oreWeight(o) / totalWeight() * 100).toFixed(1) + '%';
      el.stats.innerHTML = found
        ? `Per tile: <b>${fmt(oreGain(o.id))}</b> = (<b>${fmt(oreBase(o.id))}</b> × <b>${fmt(oreMult(o.id))}</b>)^<b>${+oreExp(o.id).toFixed(4)}</b>${st.mastery ? ` × <b>${fmt(oreMastery(o.id))}</b>` : ''}`
        : 'Not discovered yet';
      UPGRADES.forEach((u, i) => {
        const b = el.btns[i];
        const lvl = st[u.id];
        const pl = upgPlan(o.id, u);
        const soon = isSoon(o.id, u);
        const maxed = isMaxed(st, u);
        b.querySelector('span').textContent = u.label(o) + (soon || u.max ? '' : xN(pl.n)) + (soon || u.max || !lvl ? '' : ` (${lvl})`);
        b.querySelector('small').textContent = maxed ? 'Unlocked' : `${fmt(pl.total)} ${o.name}`;
        const can = !soon && found && pl.can;
        b.disabled = !can;
        b.classList.toggle('done', maxed);
        b.classList.toggle('can', can);
      });
    }
  }

  const tabOpen = t => !t.locked && (!t.unlock || t.unlock());

  function buildTabs() {
    const nav = $('tabs');
    nav.replaceChildren();
    for (const t of TABS) {
      if (t.unlock && !t.unlock()) continue;
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = t.name;
      b.dataset.tab = t.id;
      b.disabled = !!t.locked;
      b.addEventListener('click', () => { S.tab = t.id; renderTabs(); renderMastery(); renderRebirth(); renderStats(); });
      nav.appendChild(b);
    }
  }

  function renderTabs() {
    if (!TABS.some(t => t.id === S.tab && tabOpen(t))) S.tab = 'mines';
    for (const b of $('tabs').children) b.classList.toggle('on', b.dataset.tab === S.tab);
    for (const sec of document.querySelectorAll('.tab')) sec.hidden = sec.dataset.tab !== S.tab;
  }

  const masteryEls = {};
  function buildMastery() {
    const box = $('masteryList');
    for (const o of ORES) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'mast';
      b.style.setProperty('--c', o.color);
      b.innerHTML = `<span class="dot" style="background:${o.color}"></span><span class="mname">${o.name}</span><span class="mlvl"></span><small></small>`;
      b.addEventListener('click', () => buyMastery(o.id));
      box.appendChild(b);
      masteryEls[o.id] = b;
    }
  }

  function renderMastery() {
    if (S.tab !== 'mastery') return;
    for (const o of ORES) {
      const st = S.ores[o.id];
      const b = masteryEls[o.id];
      const pl = mastPlan(o.id);
      b.hidden = !st.found;
      b.querySelector('.mlvl').textContent = `×${fmt(oreMastery(o.id))} → ×${fmt(oreMastery(o.id) * Math.pow(2, pl.n))}`;
      b.querySelector('small').textContent = `${fmt(pl.total)} ${o.name}`;
      b.disabled = !pl.can;
      b.classList.toggle('can', pl.can);
    }
  }

  function renderAuto() {
    $('auto').hidden = !hasAuto();
    if (!hasAuto()) return;
    const iv = autoInterval();
    $('autoRate').textContent = `${autoBulk()} tile${autoBulk() > 1 ? 's' : ''} every ${iv.toFixed(2)}s (${fmt(autoBulk() / iv)}/s)`;
    for (const k of ['bulk', 'speed']) {
      const b = $(k === 'bulk' ? 'autoBulk' : 'autoSpeed');
      const maxed = autoMaxed(k);
      const pl = autoPlan(k);
      b.querySelector('span').textContent = (k === 'bulk' ? 'Bulk: +1 tile per dig' : 'Speed: dig 20% faster') + xN(pl.n);
      b.querySelector('small').textContent = maxed ? 'Maxed' : `${fmt(pl.total)} Obsidian`;
      const can = pl.can;
      b.disabled = !can;
      b.classList.toggle('can', can);
    }
    const ob = $('autoOff');
    ob.hidden = !hasOffline();
    $('autoRate').textContent += hasOffline() ? ` · offline ${Math.round(offEff() * 100)}%` : '';
    if (hasOffline()) {
      const maxed = S.auto.off >= OFFLINE.max;
      const pl = offPlan();
      ob.querySelector('span').textContent = 'Offline: +15% speed while away' + xN(pl.n);
      ob.querySelector('small').textContent = maxed ? 'Maxed' : `${fmt(pl.total)} Gold`;
      const can = pl.can;
      ob.disabled = !can;
      ob.classList.toggle('can', can);
    }
  }

  function countPick(p) {
    let n = 0;
    for (let dy = -p.r; dy <= p.r; dy++) for (let dx = -p.r; dx <= p.r; dx++) if (inPick(p, dx, dy)) n++;
    return n;
  }

  function renderPick() {
    const t = pickTier();
    $('pick').hidden = !t;
    if (!t) return;
    const p = PICKS[t];
    $('pickName').textContent = `${p.name} · ${countPick(p)} tiles per click`;
    const b = $('pickUp');
    const maxed = t >= PICKS.length - 1;
    const pl = pickPlan();
    const to = PICKS[Math.min(PICKS.length - 1, t + Math.max(1, pl.n))];
    b.querySelector('span').textContent = maxed ? 'Best pickaxe' : `Upgrade to ${to.name} (${countPick(to)} tiles)`;
    b.querySelector('small').textContent = maxed ? 'Maxed' : `${fmt(pl.total)} Silver`;
    const can = pl.can;
    b.disabled = !can;
    b.classList.toggle('can', can);
  }

  function renderStats() {
    if (S.tab !== 'stats') return;
    const st = S.stats;
    const rows = [
      ['Time played', dur(st.time)],
      ['Time offline', dur(st.offline)],
      ['Clicks', fmt(st.clicks)],
      ['Tiles dug', fmt(st.tiles)],
      ['Layers cleared', fmt(st.layers)],
      ['Current layer', fmt(S.layer)],
      ['Best single tile', fmt(st.best)],
      ['Rebirths', fmt(S.rb.count)],
      ['Ore points', fmt(S.rb.points)],
      ['🎁 Chests', fmt(st.chest)],
      ['🧨 TNT', fmt(st.tnt)],
      ['✨ Veins', fmt(st.vein)],
    ];
    $('statGrid').innerHTML = rows.map(([k, v]) => `<div class="stat"><small>${k}</small><b>${v}</b></div>`).join('');
    $('oreStats').innerHTML = `<table class="stable"><tr><th>Ore</th><th>Tiles</th><th>Earned</th><th>Per tile</th></tr>` + ORES.filter(o => S.ores[o.id].found).map(o => {
      const os = S.ores[o.id];
      return `<tr><td><span class="dot" style="background:${o.color}"></span> ${o.name}</td><td>${fmt(os.found)}</td><td>${fmt(os.total)}</td><td>${fmt(oreGain(o.id))}</td></tr>`;
    }).join('') + '</table>';
  }

  const runPoints = () => ORES.reduce((s, o) => s + S.ores[o.id].run * o.points, 0);
  const rebirthGain = p => p >= REBIRTH.min ? Math.floor(Math.log10(p / REBIRTH.min)) + 1 : 0;
  const allocUsed = () => ORES.reduce((s, o) => s + (S.rb.alloc[o.id] || 0), 0);

  function doRebirth() {
    const gain = rebirthGain(runPoints());
    if (!gain || !confirm(`Rebirth for ${gain} ore point${gain > 1 ? 's' : ''}? Your ores, upgrades, mastery and autominer levels reset.`)) return;
    S.rb.count++;
    S.rb.points += gain;
    for (const o of ORES) Object.assign(S.ores[o.id], { amt: 0, run: 0, mult: 0, base: 0, exp: 0, mastery: 0 });
    S.auto = { bulk: 0, speed: 0, off: 0 };
    S.pick = 0;
    clearTimeout(layerTimer);
    layerTimer = 0;
    S.layer = 1;
    S.grid = newGrid();
    renderGrid();
    save();
    renderAll(true);
  }

  function shiftAlloc(oreId, d) {
    const cur = S.rb.alloc[oreId] || 0;
    const n = Math.max(0, Math.min(cur + d, cur + S.rb.points - allocUsed()));
    if (n === cur) return;
    S.rb.alloc[oreId] = n;
    renderAll(true);
  }

  const allocEls = {};
  function buildRebirth() {
    $('rebirthBtn').addEventListener('click', doRebirth);
    $('allocReset').addEventListener('click', () => { for (const o of ORES) S.rb.alloc[o.id] = 0; renderAll(true); });
    const box = $('allocList');
    for (const o of ORES) {
      const row = document.createElement('div');
      row.className = 'alloc';
      row.style.setProperty('--c', o.color);
      row.innerHTML = `<span class="dot" style="background:${o.color}"></span><span class="aname">${o.name} <small>${o.points} pt · +${o.perPoint} weight, +0.25 base, +0.25 mult, +0.0025 exp per point</small></span><button type="button" class="step">−</button><b class="acount"></b><button type="button" class="step">+</button><span class="aw"></span>`;
      const [minus, plus] = row.querySelectorAll('.step');
      minus.addEventListener('click', e => shiftAlloc(o.id, e.shiftKey ? -10 : -1));
      plus.addEventListener('click', e => shiftAlloc(o.id, e.shiftKey ? 10 : 1));
      box.appendChild(row);
      allocEls[o.id] = { row, minus, plus, count: row.querySelector('.acount'), w: row.querySelector('.aw') };
    }
  }

  function renderRebirth() {
    if (S.tab !== 'rebirth') return;
    const p = runPoints();
    const gain = rebirthGain(p);
    $('rbPoints').textContent = fmt(p);
    $('rbNeed').textContent = fmt(REBIRTH.min);
    $('rbCount').textContent = S.rb.count;
    $('rbGain').textContent = gain ? `+${gain} ore point${gain > 1 ? 's' : ''}` : `Need ${fmt(REBIRTH.min)} points`;
    $('rbNext').textContent = gain ? `Next point at ${fmt(REBIRTH.min * Math.pow(10, gain))}` : '';
    $('rebirthBtn').disabled = !gain;
    const free = S.rb.points - allocUsed();
    $('rbFree').textContent = free;
    $('rbTotal').textContent = S.rb.points;
    const tw = totalWeight();
    for (const o of ORES) {
      const el = allocEls[o.id];
      const a = S.rb.alloc[o.id] || 0;
      el.count.textContent = a;
      el.minus.disabled = !a;
      el.plus.disabled = !free;
      el.w.textContent = `${+oreWeight(o).toFixed(2)} weight · ${(oreWeight(o) / tw * 100).toFixed(1)}%`;
    }
  }

  function buildBuy() {
    const box = $('buyAmt');
    for (const v of BUYS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = v === 'max' ? 'Max' : `${v}x`;
      b.dataset.v = v;
      b.addEventListener('click', () => { S.buy = v; renderAll(true); });
      box.appendChild(b);
    }
  }

  function renderBuy() {
    for (const b of $('buyAmt').children) b.classList.toggle('on', String(S.buy) === b.dataset.v);
  }

  function renderAll(skipGrid) {
    renderBuy();
    renderWallet();
    renderUpgrades();
    renderMastery();
    renderAuto();
    renderRebirth();
    renderPick();
    renderStats();
    updateMineHead();
    if (!skipGrid) renderTabs();
  }

  $('saveBtn').addEventListener('click', () => { save(); $('saveBtn').textContent = 'Saved'; setTimeout(() => { $('saveBtn').textContent = 'Save'; }, 900); });
  $('resetBtn').addEventListener('click', () => {
    if (!confirm('Erase all progress?')) return;
    S = fresh();
    ALLOC = S.rb.alloc;
    SPECIAL_ON = false;
    save();
    buildTabs();
    renderGrid();
    renderAll();
  });

  $('autoBulk').addEventListener('click', () => buyAuto('bulk'));
  $('autoSpeed').addEventListener('click', () => buyAuto('speed'));
  $('autoOff').addEventListener('click', buyOffline);
  $('pickUp').addEventListener('click', buyPick);
  $('offOk').addEventListener('click', () => { $('offline').hidden = true; });
  const away = offlineGain((Date.now() - S.seen) / 1000);
  S.seen = Date.now();
  buildTabs();
  buildWallet();
  buildUpgrades();
  buildMastery();
  buildRebirth();
  buildBuy();
  renderGrid();
  renderAll();
  showOffline(away);
  requestAnimationFrame(tick);
  setInterval(save, 5000);
  window.addEventListener('pagehide', save);
})();
