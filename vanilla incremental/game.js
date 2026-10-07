(() => {
  const SAVE_KEY = 'vanilla-incremental-save-v1';
  const SIZE = 10;

  const ORES = [
    { id: 'dirt', name: 'Dirt', color: '#8a6142', weight: 40 },
    { id: 'stone', name: 'Stone', color: '#8e8c94', weight: 25 },
    { id: 'copper', name: 'Copper', color: '#d27a3e', weight: 13 },
    { id: 'iron', name: 'Iron', color: '#b8a59a', weight: 9 },
    { id: 'zinc', name: 'Zinc', color: '#8fb3c9', weight: 7, lock: 1 },
    { id: 'gold', name: 'Gold', color: '#f0c43c', weight: 5.5 },
    { id: 'silver', name: 'Silver', color: '#d8e2ee', weight: 4.2 },
    { id: 'diamond', name: 'Diamond', color: '#6fe3f0', weight: 2.3 },
    { id: 'obsidian', name: 'Obsidian', color: '#7a4fc0', weight: 1 },
  ];
  const POINTS = { dirt: 1, stone: 2, copper: 3, iron: 4, zinc: 4, gold: 5, silver: 6, diamond: 7, obsidian: 8 };
  ORES.forEach(o => { o.points = POINTS[o.id]; o.perPoint = o.points >= 7 ? 0.25 : o.points >= 5 ? 0.5 : 1; });
  let ALLOC = {};
  let ZINC_ON = false;
  const oreOpen = o => !o.lock || ZINC_ON;
  const oreWeight = o => oreOpen(o) ? o.weight + (ALLOC[o.id] || 0) * o.perPoint : 0;
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
    iron: { label: 'Unlock Smeltery' },
    zinc: { label: 'Unlock Smeltery 2' },
    diamond: { label: 'Unlock Achievements' },
    obsidian: { label: 'Unlock Special Tiles', cost: 10 },
  };

  const SPECIALS = {
    chest: { name: 'Chest', icon: '🎁', chance: 0.01, color: '#f0c43c', tiles: 10 },
    tnt: { name: 'TNT', icon: '🧨', chance: 0.02, color: '#ff6b4a' },
    vein: { name: 'Vein', icon: '✨', chance: 0.015, color: '#9fe8ff', digs: 5 },
  };
  let SPECIAL_ON = false;
  let PICKING = -1;

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
  const SMELT = { slots: 10, input: 1000, time: 10, speed: 0.8, min: 1 };
  const RECIPES = [
    { id: 'copper', name: 'Copper', in: { copper: 1000 }, ups: [
      { id: 'omult', label: '+2 Copper multiplier', cost: 10, growth: 2 },
      { id: 'base', label: '+1 base Copper Ingot per smelt', cost: 25, growth: 2.5 },
      { id: 'mult', label: '+1 Copper Ingot multiplier', cost: 50, growth: 2.5 },
      { id: 'speed', label: 'Copper Ingots smelt 20% faster', cost: 50, growth: 3, max: 10 },
      { id: 'zinc', label: 'Add Zinc to the mines', cost: 100, growth: 1, max: 1 },
    ] },
    { id: 'zinc', name: 'Zinc', in: { zinc: 1000 }, ups: [
      { id: 'omult', label: '+2 Zinc multiplier', cost: 10, growth: 2 },
      { id: 'base', label: '+1 base Zinc Ingot per smelt', cost: 25, growth: 2.5 },
      { id: 'mult', label: '+1 Zinc Ingot multiplier', cost: 50, growth: 2.5 },
      { id: 'speed', label: 'Zinc Ingots smelt 20% faster', cost: 50, growth: 3, max: 10 },
      { id: 'brass', label: 'Unlock Brass Ingot smelting', pay: { copper: 10, zinc: 10 }, max: 1 },
    ] },
    { id: 'brass', name: 'Brass', in: { copper: 1000, zinc: 1000 }, ups: [
      { id: 'base', label: '+1 base Brass Ingot per smelt', cost: 25, growth: 2.5 },
      { id: 'mult', label: '+1 Brass Ingot multiplier', cost: 50, growth: 2.5 },
      { id: 'speed', label: 'Brass Ingots smelt 20% faster', cost: 50, growth: 3, max: 10 },
      { id: 'rb10', label: '×10 rebirth points', cost: 100, growth: 1, max: 1 },
      { id: 'smup', label: 'Unlock new smelting upgrades', cost: 250, growth: 1, max: 1 },
      { id: 'auto1', label: 'Autobuy Dirt, Stone & Copper upgrades', cost: 500, growth: 1, max: 1, auto: ['dirt', 'stone', 'copper'] },
    ] },
    { id: 'gold', name: 'Gold', in: { gold: 1000 }, ups: [
      { id: 'omult', label: '+2 Gold multiplier', cost: 10, growth: 2 },
      { id: 'base', label: '+1 base Gold Ingot per smelt', cost: 25, growth: 2.5 },
      { id: 'mult', label: '+1 Gold Ingot multiplier', cost: 50, growth: 2.5 },
      { id: 'speed', label: 'Gold Ingots smelt 20% faster', cost: 50, growth: 3, max: 10 },
      { id: 'auto2', label: 'Autobuy Iron, Zinc & Gold upgrades', cost: 100, growth: 1, max: 1, auto: ['iron', 'zinc', 'gold'] },
    ] },
  ];
  const RECIPE = Object.fromEntries(RECIPES.map(x => [x.id, x]));
  const SMELT_UPS = [
    { id: 'speed', label: '2× smelter speed', ore: 'obsidian', cost: 1e8 },
    { id: 'out', label: '2× smelter output', ore: 'dirt', cost: 1e11 },
    { id: 'slot3', label: 'Unlock smelter slot 3', ore: 'gold', cost: 1e9 },
    { id: 'slot4', label: 'Unlock smelter slot 4', ore: 'gold', cost: 1e10, req: 'slot3' },
    { id: 'gold', label: 'Unlock Gold Ingot', ore: 'gold', cost: 1e11 },
  ];
  const ACH_BONUS = 0.02;
  const ACHS = [];
  const ach = (id, name, desc, test) => ACHS.push({ id, name, desc, test });
  [[1e3, 'Digger'], [1e4, 'Excavator'], [1e5, 'Tunneler'], [1e6, 'Earthmover']].forEach(([n, name]) => ach('tiles' + n, name, `Dig ${fmt(n)} tiles`, () => S.stats.tiles >= n));
  [[10, 'Going down'], [100, 'Deep dive'], [1000, 'Bedrock?']].forEach(([n, name]) => ach('layers' + n, name, `Clear ${fmt(n)} layers`, () => S.stats.layers >= n));
  [[1e3, 'Clicker'], [1e4, 'Sore finger']].forEach(([n, name]) => ach('clicks' + n, name, `Click ${fmt(n)} times`, () => S.stats.clicks >= n));
  [['chest', 10, 'Treasure hunter'], ['chest', 100, 'Hoarder'], ['tnt', 25, 'Boom'], ['tnt', 250, 'Demolition'], ['vein', 10, 'Lucky strike'], ['vein', 100, 'Motherlode']].forEach(([k, n, name]) => ach(k + n, name, `Find ${n} ${SPECIALS[k].name}${n > 1 ? (k === 'chest' ? 's' : k === 'vein' ? 's' : '') : ''}`, () => S.stats[k] >= n));
  [[1, 'Born again'], [5, 'Cycle'], [25, 'Eternal']].forEach(([n, name]) => ach('rb' + n, name, `Rebirth ${n} time${n > 1 ? 's' : ''}`, () => S.rb.count >= n));
  ORES.forEach(o => ach('ore' + o.id, `${o.name} millionaire`, `Earn 1M ${o.name} in total`, () => S.ores[o.id].total >= 1e6));
  ach('ingot100', 'Smelter', 'Make 100 Copper Ingots', () => S.smelt.total.copper >= 100);
  ach('ingot1000', 'Foundry', 'Make 1,000 Copper Ingots', () => S.smelt.total.copper >= 1000);
  ach('zinc', 'New metal', 'Add Zinc to the mines', () => S.smelt.up.copper.zinc > 0);
  ach('pick', 'Master pickaxe', 'Get the best pickaxe', () => S.pick >= PICKS.length - 2 && S.ores.silver.unique > 0);
  ach('offline', 'Never sleeps', 'Max out offline speed', () => S.auto.off >= OFFLINE.max);

  const TABS = [
    { id: 'mines', name: 'Mines' },
    { id: 'mastery', name: 'Mastery', unlock: () => S.ores.dirt.unique > 0 },
    { id: 'rebirth', name: 'Rebirth', unlock: () => S.ores.copper.unique > 0 },
    { id: 'smelt', name: 'Smeltery', unlock: () => S.ores.iron.unique > 0 },
    { id: 'ach', name: 'Achievements', unlock: () => S.ores.diamond.unique > 0 },
    { id: 'stats', name: 'Stats' },
    { id: 'soon', name: 'Coming soon', locked: true },
  ];

  const $ = id => document.getElementById(id);

  function fresh() {
    const S = { tab: 'mines', layer: 1, grid: null, ores: {}, auto: { bulk: 0, speed: 0, off: 0 }, pick: 0, buy: 1, vein: 0, seen: Date.now(), rb: { count: 0, points: 0, alloc: {} }, smelt: { ingots: {}, total: {}, slots: [], up: {}, extra: {}, abOff: {} }, ach: {}, stats: { time: 0, clicks: 0, tiles: 0, layers: 0, best: 0, chest: 0, tnt: 0, vein: 0, offline: 0 } };
    for (const o of ORES) S.ores[o.id] = { amt: 0, total: 0, run: 0, found: 0, mult: 0, base: 0, exp: 0, unique: 0, mastery: 0 };
    for (const x of RECIPES) { S.smelt.ingots[x.id] = 0; S.smelt.total[x.id] = 0; S.smelt.up[x.id] = Object.fromEntries(x.ups.map(u => [u.id, 0])); }
    for (const u of SMELT_UPS) S.smelt.extra[u.id] = 0;
    for (let i = 0; i < SMELT.slots; i++) S.smelt.slots.push({ rec: '', busy: 0, t: 0 });
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
      if (d.smelt) {
        const num = v => typeof v === 'number' && isFinite(v);
        for (const k of ['ingots', 'total']) {
          if (num(d.smelt[k])) S.smelt[k].copper = d.smelt[k];
          else if (d.smelt[k]) for (const x of RECIPES) if (num(d.smelt[k][x.id])) S.smelt[k][x.id] = d.smelt[k][x.id];
        }
        const up = d.smelt.up;
        if (up && num(up.cmult)) up.copper = { omult: up.cmult, base: up.base, mult: up.mult, speed: up.speed, zinc: up.zinc };
        if (d.smelt.extra) for (const u of SMELT_UPS) if (d.smelt.extra[u.id]) S.smelt.extra[u.id] = 1;
        if (d.smelt.abOff) for (const k of Object.keys(d.smelt.abOff)) if (d.smelt.abOff[k]) S.smelt.abOff[k] = 1;
        if (up) for (const x of RECIPES) if (up[x.id]) for (const k of Object.keys(S.smelt.up[x.id])) if (num(up[x.id][k])) S.smelt.up[x.id][k] = up[x.id][k];
        if (Array.isArray(d.smelt.slots)) d.smelt.slots.slice(0, SMELT.slots).forEach((x, i) => { if (x && typeof x === 'object') S.smelt.slots[i] = { rec: RECIPE[x.rec] ? x.rec : x.on ? 'copper' : '', busy: x.busy ? 1 : 0, t: num(x.t) ? x.t : 0 }; });
      }
      if (d.ach && typeof d.ach === 'object') for (const k in d.ach) if (d.ach[k]) S.ach[k] = 1;
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
  ZINC_ON = S.smelt.up.copper.zinc > 0;

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
  const oreMult = id => 1 + S.ores[id].mult + allocOf(id) * ALLOC_BONUS.mult + (S.smelt.up[id] ? 2 * S.smelt.up[id].omult : 0);
  const oreExp = id => 1 + S.ores[id].exp * 0.01 + allocOf(id) * ALLOC_BONUS.exp;
  const oreMastery = id => Math.pow(2, S.ores[id].mastery);
  const achCount = () => ACHS.filter(a => S.ach[a.id]).length;
  const achMult = () => 1 + ACH_BONUS * achCount();
  const oreGain = id => Math.pow(oreBase(id) * oreMult(id), oreExp(id)) * oreMastery(id) * achMult();
  const smeltTime = r => Math.max(SMELT.min, SMELT.time * Math.pow(SMELT.speed, S.smelt.up[r].speed)) / (S.smelt.extra.speed ? 2 : 1);
  const smeltYield = r => (1 + S.smelt.up[r].base) * (1 + S.smelt.up[r].mult) * (S.smelt.extra.out ? 2 : 1);
  const slotCount = () => 1 + (S.ores.zinc.unique > 0 ? 1 : 0) + S.smelt.extra.slot3 + S.smelt.extra.slot4;
  const REC_OPEN = { copper: () => true, zinc: () => ZINC_ON, brass: () => S.smelt.up.zinc.brass > 0, gold: () => S.smelt.extra.gold > 0 };
  const recOpen = r => REC_OPEN[r]();
  const extraOpen = () => S.smelt.up.brass.smup > 0;
  const recIn = r => Object.entries(RECIPE[r].in).map(([k, v]) => `${fmt(v)} ${RECIPE[k].name}`).join(' + ');
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
  function ingotPlan(r, u) {
    const lvl = S.smelt.up[r][u.id];
    if (u.soon) return { n: 1, total: 0, can: false };
    if (u.pay) return { n: 1, total: 0, can: lvl < u.max && Object.entries(u.pay).every(([k, v]) => S.smelt.ingots[k] >= v) };
    return plan(l => Math.ceil(u.cost * Math.pow(u.growth, l)), lvl, S.smelt.ingots[r], u.max || Infinity);
  }
  const ingotCost = (r, u, pl) => u.soon ? '' : u.pay ? Object.entries(u.pay).map(([k, v]) => `${fmt(v)} ${RECIPE[k].name}`).join(' + ') + ' Ingots' : `${fmt(pl.total)} ${RECIPE[r].name} Ingots`;

  function buyExtra(u) {
    const o = S.ores[u.ore];
    if (S.smelt.extra[u.id] || (u.req && !S.smelt.extra[u.req]) || o.amt < u.cost) return;
    o.amt -= u.cost;
    S.smelt.extra[u.id] = 1;
    renderAll();
  }

  const autoOn = id => RECIPES.some(x => x.ups.some(u => u.auto && u.auto.includes(id) && S.smelt.up[x.id][u.id] && !S.smelt.abOff[u.id]));

  function autoBuy() {
    let any = 0;
    for (const x of RECIPES) for (const u of x.ups) {
      if (!u.auto || !S.smelt.up[x.id][u.id] || S.smelt.abOff[u.id]) continue;
      for (const id of u.auto) {
        const st = S.ores[id];
        for (const g of UPGRADES) {
          if (g.max) continue;
          let n = 0;
          while (n < 1000) {
            const c = cost(g, st[g.id], id);
            if (st.amt < c) break;
            st.amt -= c;
            st[g.id]++;
            n++;
          }
          any += n;
        }
      }
    }
    return any;
  }

  function buyIngot(r, u) {
    if (u.auto && S.smelt.up[r][u.id]) { S.smelt.abOff[u.id] = S.smelt.abOff[u.id] ? 0 : 1; renderSmelt(); return; }
    const pl = ingotPlan(r, u);
    if (!pl.can) return;
    if (u.pay) for (const [k, v] of Object.entries(u.pay)) S.smelt.ingots[k] -= v;
    else S.smelt.ingots[r] -= pl.total;
    S.smelt.up[r][u.id] += pl.n;
    if (u.id === 'zinc') { ZINC_ON = true; buildTabs(); renderAll(); return; }
    renderAll(true);
  }

  function smeltStep(dt) {
    let done = 0;
    S.smelt.slots.slice(0, slotCount()).forEach(sl => {
      const r = sl.rec;
      if (!r) return;
      const T = smeltTime(r);
      let left = dt;
      let n = 0;
      while (left > 0) {
        if (!sl.busy) {
          const need = Object.entries(RECIPE[r].in);
          if (need.some(([k, v]) => S.ores[k].amt < v)) break;
          for (const [k, v] of need) S.ores[k].amt -= v;
          sl.busy = 1;
          sl.t = 0;
        }
        const step = Math.min(left, T - sl.t);
        sl.t += step;
        left -= step;
        if (sl.t >= T) { sl.busy = 0; sl.t = 0; n++; }
      }
      if (n) {
        const g = n * smeltYield(r);
        S.smelt.ingots[r] += g;
        S.smelt.total[r] += g;
        done += n;
      }
    });
    return done;
  }

  function setRecipe(i, r) {
    const sl = S.smelt.slots[i];
    if (sl.rec === r) return;
    if (sl.busy && sl.rec) for (const [k, v] of Object.entries(RECIPE[sl.rec].in)) S.ores[k].amt += v;
    sl.rec = r;
    sl.busy = 0;
    sl.t = 0;
  }

  function checkAch() {
    if (!S.ores.diamond.unique) return;
    let got = 0;
    for (const a of ACHS) if (!S.ach[a.id] && a.test()) { S.ach[a.id] = 1; toast(`🏆 ${a.name}`); got++; }
    if (got) renderAll(true);
  }

  let toastTimer = 0;
  function toast(text) {
    const t = $('toast');
    t.textContent = text;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2500);
  }

  const pickPlan = () => plan(pickCostAt, S.pick, S.ores.silver.amt, PICKS.length - 2);

  function buy(oreId, u) {
    if (isSoon(oreId, u)) return;
    const st = S.ores[oreId];
    const pl = upgPlan(oreId, u);
    if (!pl.can) return;
    st.amt -= pl.total;
    st[u.id] += pl.n;
    if (u.id === 'unique') { PICKING = -1; SPECIAL_ON = S.ores.obsidian.unique > 0; buildTabs(); renderAll(); return; }
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
    if (S.ores.iron.unique) {
      if (smeltStep(dt)) renderAll(true);
      if (S.tab === 'smelt') renderSmeltBars();
    }
    if (Math.floor(S.stats.time) !== Math.floor(S.stats.time - dt)) { checkAch(); if (autoBuy()) renderAll(true); }
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
    if (S.ores.iron.unique) smeltStep(sec * offEff());
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
      el.card.hidden = !oreOpen(o);
      el.chance.textContent = (oreWeight(o) / totalWeight() * 100).toFixed(1) + '%';
      el.stats.innerHTML = found
        ? `Per tile: <b>${fmt(oreGain(o.id))}</b> = (<b>${fmt(oreBase(o.id))}</b> × <b>${fmt(oreMult(o.id))}</b>)^<b>${+oreExp(o.id).toFixed(4)}</b>${st.mastery ? ` × <b>${fmt(oreMastery(o.id))}</b>` : ''}${achCount() ? ` × <b>${achMult().toFixed(2)}</b>` : ''}`
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
        const ab = !u.max && autoOn(o.id);
        b.disabled = !can;
        b.classList.toggle('done', !!maxed);
        b.classList.toggle('can', can && !ab);
        b.classList.toggle('ab', ab);
        if (ab) b.querySelector('small').textContent = `Auto · ${fmt(pl.total)} ${o.name}`;
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
      b.addEventListener('click', () => { S.tab = t.id; renderTabs(); renderMastery(); renderRebirth(); renderStats(); renderSmelt(); renderAch(); });
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

  function buildSmelt() {
    const box = $('slots');
    for (let i = 0; i < SMELT.slots; i++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'slot';
      b.innerHTML = '<span class="sname"></span><small></small><div class="bar"><div></div></div>';
      b.addEventListener('click', () => {
        if (i >= slotCount()) return;
        PICKING = PICKING === i ? -1 : i;
        renderSmelt();
      });
      box.appendChild(b);
    }
    const pk = $('recipePick');
    pk.innerHTML = '<small class="pl"></small>';
    for (const r of ['', ...RECIPES.map(x => x.id)]) {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.rec = r;
      b.textContent = r ? `${RECIPE[r].name} Ingot` : 'Nothing';
      b.addEventListener('click', () => {
        if (PICKING < 0) return;
        setRecipe(PICKING, r);
        PICKING = -1;
        renderSmelt();
      });
      pk.appendChild(b);
    }
    const eb = $('smeltUps');
    for (const u of SMELT_UPS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'upg';
      b.innerHTML = '<span></span><small></small>';
      b.addEventListener('click', () => buyExtra(u));
      eb.appendChild(b);
    }
    const iw = $('ingotWrap');
    for (const x of RECIPES) {
      const g = document.createElement('div');
      g.className = 'masterybox';
      g.dataset.rec = x.id;
      g.innerHTML = `<h2>${x.name} Ingot upgrades</h2><div class="allochead"><span><b class="icount">0</b> ${x.name} Ingots</span><span class="hint iinfo"></span></div><div class="ingotups"></div>`;
      const ub = g.querySelector('.ingotups');
      for (const u of x.ups) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'upg';
        b.innerHTML = '<span></span><small></small>';
        b.addEventListener('click', () => buyIngot(x.id, u));
        ub.appendChild(b);
      }
      iw.appendChild(g);
    }
  }

  const slotStatus = sl => !sl.rec ? 'Click to choose' : sl.busy ? 'Smelting…' : `Needs ${Object.keys(RECIPE[sl.rec].in).map(k => RECIPE[k].name).join(' + ')}`;

  function renderSmeltBars() {
    [...$('slots').children].forEach((b, i) => {
      const sl = S.smelt.slots[i];
      if (i >= slotCount()) return;
      b.querySelector('.bar div').style.width = sl.busy ? Math.min(100, sl.t / smeltTime(sl.rec) * 100) + '%' : '0%';
      b.querySelector('small').textContent = slotStatus(sl);
    });
  }

  function renderSmelt() {
    if (S.tab !== 'smelt') return;
    const n = slotCount();
    [...$('slots').children].forEach((b, i) => {
      const sl = S.smelt.slots[i];
      const open = i < n;
      b.disabled = !open;
      b.classList.toggle('on', open && !!sl.rec);
      b.classList.toggle('zinc', open && sl.rec === 'zinc');
      b.classList.toggle('brass', open && sl.rec === 'brass');
      b.classList.toggle('gold', open && sl.rec === 'gold');
      b.classList.toggle('sel', PICKING === i);
      b.querySelector('.sname').textContent = !open ? 'Locked' : sl.rec ? `${RECIPE[sl.rec].name} Ingot` : 'Empty';
      b.querySelector('small').textContent = open ? slotStatus(sl) : '🔒';
    });
    const pk = $('recipePick');
    pk.hidden = PICKING < 0 || PICKING >= n;
    if (!pk.hidden) {
      pk.querySelector('.pl').textContent = `Smeltery ${PICKING + 1} smelts:`;
      [...pk.querySelectorAll('button')].forEach(b => {
        b.hidden = !!b.dataset.rec && !recOpen(b.dataset.rec);
        b.classList.toggle('on', S.smelt.slots[PICKING].rec === b.dataset.rec);
      });
    }
    $('smeltExtra').hidden = !extraOpen();
    [...$('smeltUps').children].forEach((b, i) => {
      const u = SMELT_UPS[i];
      const got = S.smelt.extra[u.id];
      const can = !got && (!u.req || S.smelt.extra[u.req]) && S.ores[u.ore].amt >= u.cost;
      b.querySelector('span').textContent = u.label;
      b.querySelector('small').textContent = got ? 'Unlocked' : u.req && !S.smelt.extra[u.req] ? 'Needs slot 3' : `${fmt(u.cost)} ${RECIPE[u.ore] ? RECIPE[u.ore].name : ORES.find(o => o.id === u.ore).name}`;
      b.disabled = !can;
      b.classList.toggle('can', can);
      b.classList.toggle('done', !!got);
    });
    [...$('ingotWrap').children].forEach(g => {
      const r = g.dataset.rec;
      const x = RECIPE[r];
      g.hidden = !recOpen(r);
      if (g.hidden) return;
      g.querySelector('.icount').textContent = fmt(S.smelt.ingots[r]);
      const y = smeltYield(r);
      g.querySelector('.iinfo').textContent = `${recIn(r)} → ${fmt(y)} ${x.name} Ingot${y > 1 ? 's' : ''} every ${smeltTime(r).toFixed(1)}s`;
      [...g.querySelector('.ingotups').children].forEach((b, i) => {
        const u = x.ups[i];
        const lvl = S.smelt.up[r][u.id];
        const maxed = u.max && lvl >= u.max;
        const pl = ingotPlan(r, u);
        b.querySelector('span').textContent = u.label + (u.max === 1 ? '' : xN(pl.n) + (lvl ? ` (${lvl})` : ''));
        const tog = u.auto && maxed;
        b.querySelector('small').textContent = tog ? (S.smelt.abOff[u.id] ? 'OFF · click to turn on' : 'ON · click to turn off') : maxed ? (u.max === 1 ? 'Unlocked' : 'Maxed') : ingotCost(r, u, pl);
        b.disabled = !pl.can && !tog;
        b.classList.toggle('can', pl.can || (tog && !S.smelt.abOff[u.id]));
        b.classList.toggle('done', !!maxed && !tog);
      });
    });
    renderSmeltBars();
  }

  function renderAch() {
    if (S.tab !== 'ach') return;
    $('achSum').textContent = `${achCount()} / ${ACHS.length} earned · all ore gains ×${achMult().toFixed(2)}`;
    $('achList').innerHTML = ACHS.map(a => `<div class="ach${S.ach[a.id] ? ' got' : ''}"><b>${S.ach[a.id] ? '🏆' : '🔒'} ${a.name}</b><small>${a.desc}</small></div>`).join('');
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
      ['Copper Ingots made', fmt(S.smelt.total.copper)],
      ['Zinc Ingots made', fmt(S.smelt.total.zinc)],
      ['Brass Ingots made', fmt(S.smelt.total.brass)],
      ['Gold Ingots made', fmt(S.smelt.total.gold)],
      ['Achievements', `${achCount()} / ${ACHS.length}`],
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
  const rbSteps = p => p >= REBIRTH.min ? Math.floor(Math.log10(p / REBIRTH.min)) + 1 : 0;
  const rbMult = () => S.smelt.up.brass.rb10 > 0 ? 10 : 1;
  const rebirthGain = p => rbSteps(p) * rbMult();
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
    $('rbNext').textContent = gain ? `Next +${rbMult()} at ${fmt(REBIRTH.min * Math.pow(10, rbSteps(p)))}` : '';
    $('rebirthBtn').disabled = !gain;
    const free = S.rb.points - allocUsed();
    $('rbFree').textContent = free;
    $('rbTotal').textContent = S.rb.points;
    const tw = totalWeight();
    for (const o of ORES) {
      const el = allocEls[o.id];
      el.row.hidden = !oreOpen(o);
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
    renderSmelt();
    renderAch();
    updateMineHead();
    if (!skipGrid) renderTabs();
  }

  $('saveBtn').addEventListener('click', () => { save(); $('saveBtn').textContent = 'Saved'; setTimeout(() => { $('saveBtn').textContent = 'Save'; }, 900); });
  $('resetBtn').addEventListener('click', () => {
    if (!confirm('Erase all progress?')) return;
    S = fresh();
    ALLOC = S.rb.alloc;
    SPECIAL_ON = false;
    ZINC_ON = false;
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
  buildSmelt();
  renderGrid();
  renderAll();
  showOffline(away);
  requestAnimationFrame(tick);
  setInterval(save, 5000);
  window.addEventListener('pagehide', save);
})();
