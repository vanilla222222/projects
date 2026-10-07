(() => {
  const SAVE_KEY = 'vanilla-incremental-save-v1';
  const SIZE = 10;

  const ORES = [
    { id: 'dirt', name: 'Dirt', color: '#8a6142', weight: 400 },
    { id: 'stone', name: 'Stone', color: '#8e8c94', weight: 250 },
    { id: 'copper', name: 'Copper', color: '#d27a3e', weight: 130 },
    { id: 'iron', name: 'Iron', color: '#b8a59a', weight: 90 },
    { id: 'gold', name: 'Gold', color: '#f0c43c', weight: 55 },
    { id: 'silver', name: 'Silver', color: '#d8e2ee', weight: 42 },
    { id: 'diamond', name: 'Diamond', color: '#6fe3f0', weight: 23 },
    { id: 'obsidian', name: 'Obsidian', color: '#7a4fc0', weight: 10 },
  ];
  const TOTAL_WEIGHT = ORES.reduce((s, o) => s + o.weight, 0);

  const UPGRADES = [
    { id: 'mult', label: o => `+1 ${o.name} multiplier`, cost: 10, growth: 1.22 },
    { id: 'base', label: o => `+1 base ${o.name}`, cost: 25, growth: 1.3 },
    { id: 'exp', label: o => `+0.01 ${o.name} exponent`, cost: 100, growth: 1.45 },
    { id: 'unique', label: () => 'Coming soon', cost: 10000, growth: 1, soon: true },
  ];

  const TABS = [
    { id: 'mines', name: 'Mines' },
    { id: 'soon', name: 'Coming soon', locked: true },
  ];

  const $ = id => document.getElementById(id);

  function fresh() {
    const S = { tab: 'mines', layer: 1, grid: null, ores: {} };
    for (const o of ORES) S.ores[o.id] = { amt: 0, total: 0, found: 0, mult: 0, base: 0, exp: 0, unique: 0 };
    S.grid = newGrid();
    return S;
  }

  function rollOre() {
    let r = Math.random() * TOTAL_WEIGHT;
    for (const o of ORES) { r -= o.weight; if (r < 0) return o.id; }
    return ORES[0].id;
  }

  function newGrid() {
    const g = [];
    for (let i = 0; i < SIZE * SIZE; i++) g.push({ ore: rollOre(), dug: 0 });
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
      if (Array.isArray(d.grid) && d.grid.length === SIZE * SIZE && d.grid.every(c => c && S.ores[c.ore])) S.grid = d.grid.map(c => ({ ore: c.ore, dug: c.dug ? 1 : 0 }));
      for (const o of ORES) {
        const src = d.ores && d.ores[o.id];
        if (!src) continue;
        for (const k of Object.keys(S.ores[o.id])) if (typeof src[k] === 'number' && isFinite(src[k])) S.ores[o.id][k] = src[k];
      }
    } catch (e) {}
    return S;
  }

  let S = load();

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

  const oreBase = id => 1 + S.ores[id].base;
  const oreMult = id => 1 + S.ores[id].mult;
  const oreExp = id => 1 + S.ores[id].exp * 0.01;
  const oreGain = id => Math.pow(oreBase(id) * oreMult(id), oreExp(id));

  function cost(u, lvl) { return Math.ceil(u.cost * Math.pow(u.growth, lvl)); }

  function buy(oreId, u) {
    if (u.soon) return;
    const st = S.ores[oreId];
    const c = cost(u, st[u.id]);
    if (st.amt < c) return;
    st.amt -= c;
    st[u.id]++;
    renderAll();
  }

  function dig(i, el) {
    const cell = S.grid[i];
    if (cell.dug) return;
    cell.dug = 1;
    const st = S.ores[cell.ore];
    const g = oreGain(cell.ore);
    st.amt += g;
    st.total += g;
    st.found++;
    paintTile(el, cell);
    floatText(el, `+${fmt(g)} ${ORES.find(o => o.id === cell.ore).name}`, ORES.find(o => o.id === cell.ore).color);
    if (S.grid.every(c => c.dug)) {
      setTimeout(() => { S.layer++; S.grid = newGrid(); renderGrid(); save(); }, 450);
    }
    renderAll(true);
  }

  function floatText(el, text, color) {
    const f = document.createElement('div');
    f.className = 'float';
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
      paintTile(b, cell);
      grid.appendChild(b);
    });
    updateMineHead();
  }

  function updateMineHead() {
    $('layer').textContent = S.layer;
    $('left').textContent = S.grid.filter(c => !c.dug).length;
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
      card.innerHTML = `<div class="orehead"><span class="dot" style="background:${o.color}"></span><h3>${o.name}</h3><span>${(o.weight / TOTAL_WEIGHT * 100).toFixed(1)}%</span></div><div class="stats"></div>`;
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
      cardEls[o.id] = { card, stats: card.querySelector('.stats'), btns };
    }
  }

  function renderUpgrades() {
    for (const o of ORES) {
      const st = S.ores[o.id];
      const el = cardEls[o.id];
      const found = st.found > 0;
      el.card.classList.toggle('locked', !found);
      el.stats.innerHTML = found
        ? `Per tile: <b>${fmt(oreGain(o.id))}</b> = (<b>${fmt(oreBase(o.id))}</b> × <b>${fmt(oreMult(o.id))}</b>)^<b>${oreExp(o.id).toFixed(2)}</b>`
        : 'Not discovered yet';
      UPGRADES.forEach((u, i) => {
        const b = el.btns[i];
        const lvl = st[u.id];
        const c = cost(u, lvl);
        b.querySelector('span').textContent = u.label(o) + (u.soon || !lvl ? '' : ` (${lvl})`);
        b.querySelector('small').textContent = `${fmt(c)} ${o.name}`;
        const can = !u.soon && found && st.amt >= c;
        b.disabled = u.soon || !found || !can;
        b.classList.toggle('can', can);
      });
    }
  }

  function buildTabs() {
    const nav = $('tabs');
    for (const t of TABS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = t.name;
      b.dataset.tab = t.id;
      b.disabled = !!t.locked;
      b.addEventListener('click', () => { S.tab = t.id; renderTabs(); });
      nav.appendChild(b);
    }
  }

  function renderTabs() {
    for (const b of $('tabs').children) b.classList.toggle('on', b.dataset.tab === S.tab);
    for (const sec of document.querySelectorAll('.tab')) sec.hidden = sec.dataset.tab !== S.tab;
  }

  function renderAll(skipGrid) {
    renderWallet();
    renderUpgrades();
    updateMineHead();
    if (!skipGrid) renderTabs();
  }

  $('saveBtn').addEventListener('click', () => { save(); $('saveBtn').textContent = 'Saved'; setTimeout(() => { $('saveBtn').textContent = 'Save'; }, 900); });
  $('resetBtn').addEventListener('click', () => {
    if (!confirm('Erase all progress?')) return;
    S = fresh();
    save();
    renderGrid();
    renderAll();
  });

  buildTabs();
  buildWallet();
  buildUpgrades();
  renderGrid();
  renderAll();
  setInterval(save, 5000);
  window.addEventListener('pagehide', save);
})();
