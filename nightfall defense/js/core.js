(function (root) {
  'use strict';

  const WORLD = { L: 1400, W: 800, towerR: 20, minGap: 44 };
  const MAX_WAVE = 100;
  const LIVES = 10;
  const SAVE_VER = 2;
  const SPAWN_GUARD = 15;

  const TUNE = {
    hp0: 14,
    hpCurve: [[1, 1.23], [10, 1.21], [20, 1.19], [30, 1.165], [40, 1.15], [50, 1.12], [60, 1.085], [70, 1.072], [85, 1.066], [100, 1.06]],
    cash0: 2.2, cashGrowth: 1.2,
    clear0: 45, clearGrowth: 1.2,
    towerGrowth: 1.5, sellRate: 0.7,
    nodeBase: 0.6, nodeGrowth: 2.1,
    infBase: 4, infGrowth: 4, infMul: 1.25,
    startCash: 160,
  };

  const RACES = {
    earth: {
      id: 'earth', name: 'Earth Pony', cost: 50, range: 100, dmg: 9, rate: 0.85,
      body: '#d2a86c', mane: '#7a4a2a', accent: '#e3a95b',
      role: 'Melee stomper',
      ability: 'Stomp: every attack hits all ground DNBs in its short range. Cannot reach flyers or harm magical DNBs.',
    },
    unicorn: {
      id: 'unicorn', name: 'Unicorn', cost: 90, range: 175, dmg: 26, rate: 0.55,
      body: '#ece4f7', mane: '#8b5cf6', accent: '#a98bff',
      role: 'Arcane artillery',
      ability: 'Arcane Bolt: slow, heavy magic bolts. The only base pony that can harm magical DNBs. Cannot see flyers.',
    },
    pegasus: {
      id: 'pegasus', name: 'Pegasus', cost: 70, range: 150, dmg: 5, rate: 2.0,
      body: '#a9cdea', mane: '#4fd1c5', accent: '#4fd1c5',
      role: 'Sky skirmisher',
      ability: 'Skyward Eye: rapid feather darts. The only base pony that can see and hit flying DNBs. Cannot harm magical DNBs.',
    },
  };
  const RACE_IDS = ['earth', 'unicorn', 'pegasus'];

  function pct(v) { return Math.round(v * 100) + '%'; }

  const PATHS = {
    earth: [
      { id: 'stonehoof', name: 'Stonehoof', blurb: 'Harder stomps that rattle DNBs senseless.',
        node: '+20% damage. From node 5, stomps may stun.',
        sig: 'Earthshatter', sigDesc: 'Every 4th stomp deals 5x damage and stuns everything hit for 1s.',
        apply(lv, s) { s.dmg *= 1 + 0.2 * lv; if (lv >= 5) { s.stunCh = Math.max(s.stunCh, 0.15); s.stunDur = Math.max(s.stunDur, 0.4); } if (lv >= 10) s.sigs.push('earthshatter'); } },
      { id: 'leyhooves', name: 'Ley Hooves', blurb: 'Hooves tuned to the ley lines. Lets an earth pony hurt magical DNBs.',
        node: 'Node 1 unlocks damage to magical DNBs. +10% damage, +12% vs magical.',
        sig: 'Leyline Rupture', sigDesc: 'Stomps strip magic from DNBs for 3s so any pony can hit them, and deal double damage to magical foes.',
        apply(lv, s) { if (lv >= 1) s.canMagic = true; s.dmg *= 1 + 0.1 * lv; s.magicMul *= 1 + 0.12 * lv; if (lv >= 10) { s.magicMul *= 2; s.sigs.push('leyrupture'); } } },
      { id: 'harvest', name: 'Golden Harvest', blurb: 'A farmer\'s eye for value. Kills by this pony pay more.',
        node: '+8% cash from this pony\'s kills, +5% damage.',
        sig: 'Harvest Moon', sigDesc: 'Kills by this pony pay triple cash.',
        apply(lv, s) { s.cash += 0.08 * lv; s.dmg *= 1 + 0.05 * lv; if (lv >= 10) { s.cash *= 3; s.sigs.push('harvestmoon'); } } },
      { id: 'mudslide', name: 'Mudslide', blurb: 'Churned earth that bogs DNBs down.',
        node: '+5% range, stomps slow by +4% for 1.2s.',
        sig: 'Quagmire', sigDesc: 'A permanent bog: ground DNBs in range move at half speed and take 15% more damage.',
        apply(lv, s) { s.range *= 1 + 0.05 * lv; s.slow = Math.max(s.slow, 0.04 * lv); s.slowDur = Math.max(s.slowDur, 1.2); if (lv >= 10) s.sigs.push('quagmire'); } },
      { id: 'herdcall', name: 'Herd Call', blurb: 'A rallying whinny that lifts the whole herd.',
        node: 'Ponies within 170 gain +3% damage, this pony +3% attack speed.',
        sig: 'Stampede', sigDesc: 'The aura also grants +25% attack speed, and every 12s a stampede hits every ground DNB on the map for 6x damage.',
        apply(lv, s) { if (lv > 0) { s.auraR = 170; s.auraDmg += 0.03 * lv; } s.rate *= 1 + 0.03 * lv; if (lv >= 10) { s.auraRate += 0.25; s.sigs.push('stampede'); } } },
    ],
    unicorn: [
      { id: 'arcanist', name: 'Arcanist', blurb: 'Pure study of the destructive arts.',
        node: '+20% damage.',
        sig: 'Starfall', sigDesc: 'Every 6s a falling star strikes the toughest DNB in range for 12x damage in a wide blast that hits anything.',
        apply(lv, s) { s.dmg *= 1 + 0.2 * lv; if (lv >= 10) s.sigs.push('starfall'); } },
      { id: 'skyward', name: 'Skyward Sight', blurb: 'A far-seeing spell that tracks DNBs in the air.',
        node: 'Node 1 lets this unicorn target flyers. +6% range, +12% vs flyers.',
        sig: 'Aurora Lance', sigDesc: 'Bolts deal 3x damage to flyers and arc to 2 more flyers.',
        apply(lv, s) { if (lv >= 1) s.canFly = true; s.range *= 1 + 0.06 * lv; s.flyMul *= 1 + 0.12 * lv; if (lv >= 10) { s.flyMul *= 3; s.sigs.push('aurora'); } } },
      { id: 'chrono', name: 'Chronomancy', blurb: 'Bends the moments around each bolt.',
        node: 'Bolts slow by +4% for 1.5s, +5% attack speed.',
        sig: 'Time Stop', sigDesc: 'Every 10s freezes every DNB in range for 1.5s (bosses 0.5s).',
        apply(lv, s) { s.slow = Math.max(s.slow, 0.04 * lv); s.slowDur = Math.max(s.slowDur, 1.5); s.rate *= 1 + 0.05 * lv; if (lv >= 10) s.sigs.push('timestop'); } },
      { id: 'prismatic', name: 'Prismatic', blurb: 'Bolts that shatter into light on impact.',
        node: 'Bolts splash (radius grows), +6% damage.',
        sig: 'Prism Burst', sigDesc: 'Each bolt also splits into 4 shards that seek nearby DNBs for half damage.',
        apply(lv, s) { if (lv > 0) s.splash = Math.max(s.splash, 24 + 6 * lv); s.dmg *= 1 + 0.06 * lv; if (lv >= 10) s.sigs.push('prismburst'); } },
      { id: 'hexweaver', name: 'Hexweaver', blurb: 'Curses that make DNBs brittle for the whole herd.',
        node: 'Hits hex the target: it takes +4% damage from every source for 4s. +3% damage.',
        sig: 'Doomhex', sigDesc: 'Hexed DNBs burst on death, dealing 25% of their max HP to DNBs nearby.',
        apply(lv, s) { s.hex = Math.max(s.hex, 0.04 * lv); s.dmg *= 1 + 0.03 * lv; if (lv >= 10) s.sigs.push('doomhex'); } },
    ],
    pegasus: [
      { id: 'stormwing', name: 'Stormwing', blurb: 'Feathers charged with storm static.',
        node: 'Hits chain lightning to +1 DNB at nodes 2, 5 and 8. +6% damage.',
        sig: 'Thunderhead', sigDesc: 'Every 5s lightning strikes up to 8 DNBs in range for 5x damage.',
        apply(lv, s) { s.chain += (lv >= 2) + (lv >= 5) + (lv >= 8); s.dmg *= 1 + 0.06 * lv; if (lv >= 10) s.sigs.push('thunderhead'); } },
      { id: 'galeforce', name: 'Galeforce', blurb: 'Wingbeats that shove DNBs back down the road.',
        node: 'Hits push DNBs back (+5 each node), +5% attack speed.',
        sig: 'Cyclone', sigDesc: 'Every 9s a cyclone throws every non-boss DNB in range 150 back and stuns it.',
        apply(lv, s) { s.knock += 5 * lv; s.rate *= 1 + 0.05 * lv; if (lv >= 10) s.sigs.push('cyclone'); } },
      { id: 'swiftfeather', name: 'Swiftfeather', blurb: 'Faster, faster, faster.',
        node: '+12% attack speed.',
        sig: 'Sonic Rainboom', sigDesc: 'Every 15s a rainboom triples attack speed for 4s.',
        apply(lv, s) { s.rate *= 1 + 0.12 * lv; if (lv >= 10) s.sigs.push('rainboom'); } },
      { id: 'skyhunter', name: 'Skyhunter', blurb: 'A raptor\'s eye for anything with wings.',
        node: '+15% vs flyers, +2% crit chance (2.5x).',
        sig: 'Raptor Dive', sigDesc: 'Crits deal 5x to flyers, and non-boss flyers below 20% HP are executed.',
        apply(lv, s) { s.flyMul *= 1 + 0.15 * lv; s.crit += 0.02 * lv; if (lv >= 10) s.sigs.push('raptordive'); } },
      { id: 'volley', name: 'Feather Volley', blurb: 'Why throw one feather when you can throw five?',
        node: '+1 extra target at nodes 3, 6 and 9. +6% damage.',
        sig: 'Feather Storm', sigDesc: 'Every attack fires at every valid DNB in range.',
        apply(lv, s) { s.multi += (lv >= 3) + (lv >= 6) + (lv >= 9); s.dmg *= 1 + 0.06 * lv; if (lv >= 10) s.sigs.push('featherstorm'); } },
    ],
  };

  const ENEMIES = {
    basic: { id: 'basic', name: 'DNB Shambler', short: 'Shambler', trait: 'Plain and steady.', hp: 1, speed: 62, r: 13, cash: 1, color: '#8a6544', dark: '#4a3220' },
    fast: { id: 'fast', name: 'DNB Skitter', short: 'Skitter', trait: 'Fast and frail.', hp: 0.55, speed: 118, r: 11, cash: 0.8, color: '#a8805a', dark: '#5a3f26' },
    tanky: { id: 'tanky', name: 'DNB Brute', short: 'Brute', trait: 'Slow, with 3.4x HP.', hp: 3.4, speed: 38, r: 18, cash: 2.5, color: '#6b4c31', dark: '#36261a' },
    flying: { id: 'flying', name: 'DNB Duskwing', short: 'Duskwing', trait: 'Flies. Only pegasi and sky-sighted unicorns can hit it.', hp: 0.8, speed: 78, r: 12, cash: 1.3, flying: true, color: '#7d5c48', dark: '#3f2c22' },
    magical: { id: 'magical', name: 'DNB Hexling', short: 'Hexling', trait: 'Magical. Only unicorns and ley-hoofed earth ponies can hurt it.', hp: 1.3, speed: 56, r: 13, cash: 1.5, magical: true, color: '#86606a', dark: '#46303a' },
    boss: { id: 'boss', name: 'Boss', short: 'Boss', trait: 'A wave boss. Leaking it costs 5 lives.', hp: 26, speed: 36, r: 26, cash: 20, color: '#5e3f28', dark: '#2c1c12' },
  };

  const BOSSES = [
    { id: 'mudmaw', name: 'Mudmaw', trick: 'burrow', hpMul: 1, desc: 'Burrows underground every few seconds and cannot be hit while buried.', color: '#7a5634', dark: '#3a2616' },
    { id: 'mother-mire', name: 'Mother Mire', trick: 'brood', hpMul: 0.9, desc: 'Spits out a brood of Shamblers each time she loses a quarter of her HP.', color: '#6e5a3a', dark: '#352a1a' },
    { id: 'skyrend', name: 'Skyrend', trick: 'flying', hpMul: 0.55, desc: 'A winged brute. Only pegasi and sky-sighted unicorns can hit it.', color: '#6b4d3c', dark: '#33231a' },
    { id: 'hexhulk', name: 'The Hexhulk', trick: 'magical', hpMul: 0.55, desc: 'Wrapped in dark magic. Only unicorns and ley-hoofed earth ponies can hurt it.', color: '#6e4a5c', dark: '#35222c' },
    { id: 'gloamrunner', name: 'Gloamrunner', trick: 'sprint', hpMul: 1, desc: 'Breaks into a triple-speed sprint every 6 seconds.', color: '#8a6040', dark: '#432c1a' },
    { id: 'bramble-king', name: 'Bramble King', trick: 'regen', hpMul: 0.5, desc: 'Regrows 1.5% HP per second and heals DNBs around him.', color: '#5c5a34', dark: '#2c2a16' },
    { id: 'duskwraith', name: 'Duskwraith', trick: 'phase', hpMul: 0.6, desc: 'Flickers between flying and magical forms every 4 seconds.', color: '#5a4660', dark: '#2a2030' },
    { id: 'colossus', name: 'Stonehide Colossus', trick: 'armor', hpMul: 0.8, desc: 'A stone shell blocks 60% of damage until it drops below half HP.', color: '#6a6258', dark: '#34302a' },
    { id: 'twin-shade', name: 'Twin Shade', trick: 'split', hpMul: 0.17, desc: 'Splits into two smaller shades when slain.', color: '#4e3a30', dark: '#241a14' },
    { id: 'nightmother', name: 'The Nightmother', trick: 'mother', hpMul: 0.16, desc: 'Sprints and summons, then takes to the air, then turns magical and regrows.', color: '#3e2a3a', dark: '#1c121a' },
  ];

  function mulberry(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashSeed(a, b, c) {
    let h = (a >>> 0) ^ Math.imul(b | 0, 0x9E3779B1) ^ Math.imul((c | 0) + 1, 0x85EBCA77);
    h = Math.imul(h ^ (h >>> 16), 0x7FEB352D);
    h = Math.imul(h ^ (h >>> 15), 0x846CA68B);
    return (h ^ (h >>> 16)) >>> 0;
  }

  const WAVEGEN = {
    count: { base: 8, per: 0.45, bossMul: 0.6 },
    gap: { base: 1.05, per: 0.007, min: 0.38, jitter: 0.4 },
    spacing: { tanky: 1.4, fast: 0.6 },
    types: [
      { id: 'basic', from: 1, w: 10, theme: 0 },
      { id: 'fast', from: 3, w: 4, theme: 10 },
      { id: 'tanky', from: 5, w: 3, theme: 6 },
      { id: 'flying', from: 6, w: 3, theme: 8 },
      { id: 'magical', from: 8, w: 3, theme: 8 },
    ],
    themes: [
      { id: 'boss', mod: 10, rem: 0 },
      { id: 'flying', at: [6], mod: 9, rem: 0 },
      { id: 'magical', at: [8], mod: 11, rem: 6 },
      { id: 'fast', mod: 7, rem: 0 },
      { id: 'tanky', mod: 8, rem: 4 },
    ],
    bossEvery: 10, bossLead: 1.5,
  };

  const MAPS = {
    moonlit: {
      id: 'moonlit', name: 'Moonlit Road', order: 1,
      routes: [[[-40, 400], [1440, 400]]],
      half: 38,
      blocks: [],
      hpMul: 1, cashMul: 1,
      bosses: ['mudmaw', 'mother-mire', 'skyrend', 'hexhulk', 'gloamrunner', 'bramble-king', 'duskwraith', 'colossus', 'twin-shade', 'nightmother'],
      waves: WAVEGEN,
      palette: {
        ground: ['#1d2a2c', '#141c22', '#0a0b13'], grass: ['rgba(90,140,110,.22)', 'rgba(60,100,90,.25)'],
        flowers: ['#c9a0dc', '#a0c4ff', '#ffe1a8'], rock: 'rgba(70,72,90,.55)',
        road: ['#3a2c2a', '#4d3a33'], roadEdge: 'rgba(20,14,12,.6)', roadLine: 'rgba(255,230,200,.07)', pebble: 'rgba(120,100,90,.35)',
        tree: '#0c1210', gate: '#e3c15b',
      },
      decor: { grass: 900, flowers: 40, rocks: 26, trees: 9, seed: 1234 },
    },
  };
  const MAP_IDS = ['moonlit'];
  const BOSS_BY_ID = {};
  for (const b of BOSSES) BOSS_BY_ID[b.id] = b;

  function buildRoute(pts) {
    const segs = [];
    let len = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
      const l = Math.hypot(x2 - x1, y2 - y1);
      segs.push({ x1, y1, x2, y2, tx: (x2 - x1) / l, ty: (y2 - y1) / l, l, s: len });
      len += l;
    }
    return { pts, segs, len };
  }
  for (const id of MAP_IDS) MAPS[id].route = MAPS[id].routes.map(buildRoute);

  function getMap(id) { return MAPS[id] || MAPS.moonlit; }
  function mapOf(S) { return getMap(S.map); }

  function routePos(P, d, out) {
    const segs = P.segs;
    let s = segs[segs.length - 1];
    if (d <= 0) s = segs[0];
    else for (let i = 0; i < segs.length; i++) if (d < segs[i].s + segs[i].l) { s = segs[i]; break; }
    const k = d - s.s;
    out.x = s.x1 + s.tx * k; out.y = s.y1 + s.ty * k; out.tx = s.tx; out.ty = s.ty;
    return out;
  }
  function nearestOnMap(map, x, y) {
    let best = { dist: Infinity, x: 0, y: 0 };
    for (const P of map.route) {
      for (const s of P.segs) {
        const k = Math.max(0, Math.min(s.l, (x - s.x1) * s.tx + (y - s.y1) * s.ty));
        const px = s.x1 + s.tx * k, py = s.y1 + s.ty * k;
        const dd = Math.hypot(x - px, y - py);
        if (dd < best.dist) best = { dist: dd, x: px, y: py };
      }
    }
    return best;
  }
  function faceRoad(map, x, y) {
    const p = nearestOnMap(map, x, y);
    return Math.atan2(p.y - y, p.x - x);
  }

  let hpCache = null, hpCacheKey = null;
  function growthAt(curve, n) {
    if (n <= curve[0][0]) return curve[0][1];
    for (let i = 1; i < curve.length; i++) {
      const [n1, g1] = curve[i];
      if (n <= n1) { const [n0, g0] = curve[i - 1]; return g0 + (g1 - g0) * (n - n0) / (n1 - n0); }
    }
    return curve[curve.length - 1][1];
  }
  function hpBase(n) {
    if (hpCacheKey !== TUNE.hpCurve || hpCache.hp0 !== TUNE.hp0) { hpCache = [TUNE.hp0]; hpCache.hp0 = TUNE.hp0; hpCacheKey = TUNE.hpCurve; }
    n = Math.max(1, n | 0);
    while (hpCache.length < n) hpCache.push(hpCache[hpCache.length - 1] * growthAt(TUNE.hpCurve, hpCache.length + 1));
    return hpCache[n - 1];
  }
  function hpFor(n, map) { return hpBase(n) * (map ? map.hpMul : 1); }
  function killCash(n, map) { return TUNE.cash0 * Math.pow(TUNE.cashGrowth, n - 1) * (map ? map.cashMul : 1); }
  function clearBonus(n, map) { return Math.round(TUNE.clear0 * (1 + 0.1 * n) * Math.pow(TUNE.clearGrowth, n - 1) * (n % 10 === 0 ? 2.5 : 1) * (map ? map.cashMul : 1)); }
  function bossFor(n, map) {
    map = map || MAPS.moonlit;
    const every = map.waves.bossEvery;
    if (n % every !== 0) return null;
    const list = map.bosses;
    return BOSS_BY_ID[list[Math.min(list.length - 1, n / every - 1)]] || null;
  }

  function themeFor(n, gen) {
    gen = gen || WAVEGEN;
    for (const r of gen.themes) if ((r.at && r.at.indexOf(n) >= 0) || (r.mod && n % r.mod === r.rem)) return r.id;
    return '';
  }

  const specCache = {};
  function waveSpec(n, map) {
    map = map || MAPS.moonlit;
    const key = map.id + ':' + n;
    if (specCache[key]) return specCache[key];
    const gen = map.waves;
    const rng = mulberry(n * 7919 + 17);
    const boss = bossFor(n, map);
    let count = gen.count.base + Math.floor(n * gen.count.per);
    if (boss) count = Math.round(count * gen.count.bossMul);
    const theme = themeFor(n, gen);
    const pool = [];
    let total = 0;
    for (const ty of gen.types) {
      const w = n >= ty.from ? ty.w + (theme === ty.id ? ty.theme : 0) : 0;
      pool.push([ty.id, w]); total += w;
    }
    const gap = Math.max(gen.gap.min, gen.gap.base - n * gen.gap.per);
    const list = [];
    let t = 0;
    for (let i = 0; i < count; i++) {
      let r = rng() * total, type = pool[0][0];
      for (const [k, w] of pool) { r -= w; if (r <= 0) { type = k; break; } }
      list.push({ t, type });
      t += gap * (gen.spacing[type] || 1) * (1 - gen.gap.jitter / 2 + rng() * gen.gap.jitter);
    }
    if (boss) list.push({ t: t + gen.bossLead, type: 'boss' });
    const counts = {};
    for (const e of list) counts[e.type] = (counts[e.type] || 0) + 1;
    const spec = { n, list, boss, counts, theme, map: map.id, duration: list.length ? list[list.length - 1].t : 0 };
    specCache[key] = spec;
    return spec;
  }

  function towerCost(race, owned) { return Math.round(RACES[race].cost * Math.pow(TUNE.towerGrowth, owned)); }
  function nodeCost(race, k) { return Math.round(RACES[race].cost * TUNE.nodeBase * Math.pow(TUNE.nodeGrowth, k)); }
  function infCost(race, lv) { return Math.round(RACES[race].cost * TUNE.infBase * Math.pow(TUNE.infGrowth, lv)); }

  const DEFAULT_SETTINGS = { sound: true, vol: 0.6, shake: true, dmgNums: true, numFmt: 'short', speed: 1 };
  const NUM_FORMATS = ['short', 'sci', 'full'];
  const SPEEDS = [1, 2, 4];

  function newState() {
    return {
      ver: SAVE_VER, map: 'moonlit', seed: 0x2545F491,
      cash: TUNE.startCash, cleared: 0, sel: 1, auto: false, towers: [], nextId: 1,
      run: null, time: 0, fxOn: true, fx: [], events: [], buffsDirty: true, totalKills: 0,
      stats: { played: 0, dmg: 0, bossKills: 0, earned: 0 },
      settings: Object.assign({}, DEFAULT_SETTINGS),
      sfx: { hit: 0, crit: 0, kill: 0, leak: 0 },
    };
  }

  function owned(S, race) { let c = 0; for (const t of S.towers) if (t.race === race) c++; return c; }
  function nextTowerCost(S, race) { return towerCost(race, owned(S, race)); }

  function canPlace(S, x, y, ignore) {
    const R = WORLD.towerR, map = mapOf(S);
    if (x < R || x > WORLD.L - R || y < R || y > WORLD.W - R) return false;
    if (nearestOnMap(map, x, y).dist < map.half + R) return false;
    for (const b of map.blocks) if ((b.x - x) ** 2 + (b.y - y) ** 2 < (b.r + R) ** 2) return false;
    for (const t of S.towers) {
      if (t === ignore) continue;
      if ((t.x - x) ** 2 + (t.y - y) ** 2 < WORLD.minGap * WORLD.minGap) return false;
    }
    return true;
  }

  function makeTower(S, race, x, y) {
    return {
      id: S.nextId++, race, x, y, spent: 0, paths: [0, 0, 0, 0, 0], infD: 0, infR: 0, mode: 'first',
      cd: 0, sigT: 0, stomp: 0, boomT: 0, face: 0, kills: 0, dmg: 0, wDmg: 0, wKills: 0, anim: 0, _s: null,
    };
  }

  function placeTower(S, race, x, y) {
    if (!canPlace(S, x, y)) return null;
    const cost = nextTowerCost(S, race);
    if (S.cash < cost) return null;
    S.cash -= cost;
    const t = makeTower(S, race, x, y);
    t.spent = cost;
    t.face = faceRoad(mapOf(S), x, y);
    S.towers.push(t);
    S.buffsDirty = true;
    return t;
  }

  function sellValue(t) { return Math.floor(t.spent * TUNE.sellRate); }
  function sellTower(S, t) {
    const i = S.towers.indexOf(t);
    if (i < 0) return 0;
    const refund = sellValue(t);
    S.cash += refund;
    S.towers.splice(i, 1);
    S.buffsDirty = true;
    return refund;
  }

  function chosenPaths(t) { const out = []; t.paths.forEach((lv, i) => { if (lv > 0) out.push(i); }); return out; }
  function pathState(t, i) {
    const ch = chosenPaths(t);
    if (t.paths[i] >= 10) return 'maxed';
    if (t.paths[i] > 0) return 'chosen';
    return ch.length >= 2 ? 'locked' : 'open';
  }
  function nextNodeCost(t, i) { return t.paths[i] >= 10 ? Infinity : nodeCost(t.race, t.paths[i]); }
  function buyNode(S, t, i) {
    const st = pathState(t, i);
    if (st === 'locked' || st === 'maxed') return false;
    const c = nextNodeCost(t, i);
    if (S.cash < c) return false;
    S.cash -= c; t.spent += c; t.paths[i]++; t._s = null; S.buffsDirty = true;
    return true;
  }
  function infNext(t, which) { return infCost(t.race, which === 'dmg' ? t.infD : t.infR); }
  function buyInf(S, t, which) {
    const c = infNext(t, which);
    if (S.cash < c) return false;
    S.cash -= c; t.spent += c;
    if (which === 'dmg') t.infD++; else t.infR++;
    t._s = null;
    return true;
  }

  function upgradeOptions(t) {
    const out = [];
    for (const i of chosenPaths(t)) if (t.paths[i] < 10) out.push({ kind: 'node', i, cost: nextNodeCost(t, i) });
    out.push({ kind: 'inf', which: 'dmg', cost: infNext(t, 'dmg') });
    out.push({ kind: 'inf', which: 'rate', cost: infNext(t, 'rate') });
    return out.sort((a, b) => a.cost - b.cost);
  }
  function buyMaxAffordable(S, t) {
    let count = 0, spent = 0;
    for (let guard = 0; guard < 1000; guard++) {
      const o = upgradeOptions(t)[0];
      if (!o || o.cost > S.cash) break;
      const ok = o.kind === 'node' ? buyNode(S, t, o.i) : buyInf(S, t, o.which);
      if (!ok) break;
      count++; spent += o.cost;
    }
    return { count, spent };
  }
  function maxAffordablePreview(S, t) {
    const clone = { race: t.race, paths: t.paths.slice(), infD: t.infD, infR: t.infR, spent: 0, _s: null };
    const sim = { cash: S.cash, buffsDirty: false };
    const r = buyMaxAffordable(sim, clone);
    return { count: r.count, spent: r.spent, paths: clone.paths, infD: clone.infD, infR: clone.infR };
  }

  function computeStats(t) {
    const r = RACES[t.race];
    const s = {
      range: r.range, dmg: r.dmg, rate: r.rate,
      canFly: t.race === 'pegasus', canMagic: t.race === 'unicorn',
      flyMul: 1, magicMul: 1, splash: 0, chain: 0, slow: 0, slowDur: 0, stunCh: 0, stunDur: 0,
      knock: 0, multi: 1, crit: 0, critMul: 2.5, hex: 0, cash: 1, auraR: 0, auraDmg: 0, auraRate: 0, sigs: [],
    };
    PATHS[t.race].forEach((p, i) => { if (t.paths[i] > 0) p.apply(t.paths[i], s); });
    s.slow = Math.min(0.6, s.slow);
    s.dmg *= Math.pow(TUNE.infMul, t.infD || 0);
    s.rate *= Math.pow(TUNE.infMul, t.infR || 0);
    s.has = {};
    for (const k of s.sigs) s.has[k] = true;
    return s;
  }
  function stats(t) { if (!t._s) t._s = computeStats(t); return t._s; }

  function nodeInfo(t, i, k) {
    const a = t.paths.slice(), b = t.paths.slice();
    a[i] = k - 1; b[i] = k;
    const s0 = computeStats({ race: t.race, paths: a, infD: 0, infR: 0 });
    const s1 = computeStats({ race: t.race, paths: b, infD: 0, infR: 0 });
    const lines = [];
    const rel = (x, y, label) => { if (Math.abs(y / x - 1) > 0.001) lines.push((y > x ? '+' : '') + Math.round((y / x - 1) * 1000) / 10 + '% ' + label); };
    rel(s0.dmg, s1.dmg, 'damage');
    rel(s0.rate, s1.rate, 'attack speed');
    rel(s0.range, s1.range, 'range');
    if (s1.canFly && !s0.canFly) lines.push('Can target flyers');
    if (s1.canMagic && !s0.canMagic) lines.push('Can harm magical DNBs');
    if (s1.flyMul > s0.flyMul) rel(s0.flyMul, s1.flyMul, 'vs flyers');
    if (s1.magicMul > s0.magicMul) rel(s0.magicMul, s1.magicMul, 'vs magical');
    if (s1.chain > s0.chain) lines.push('+1 chain target');
    if (s1.multi > s0.multi) lines.push('+1 extra target');
    if (s1.crit > s0.crit) lines.push('+' + Math.round((s1.crit - s0.crit) * 100) + '% crit chance');
    if (s1.stunCh > s0.stunCh) lines.push('Stomps may stun (' + pct(s1.stunCh) + ')');
    if (s1.slow > s0.slow) lines.push('Slow ' + pct(s1.slow));
    if (s1.splash > s0.splash) lines.push('Splash radius ' + Math.round(s1.splash));
    if (s1.knock > s0.knock) lines.push('Knockback ' + s1.knock);
    if (s1.hex > s0.hex) lines.push('Hex +' + pct(s1.hex) + ' damage taken');
    if (s1.cash > s0.cash) lines.push('Kill cash x' + (Math.round(s1.cash * 100) / 100));
    if (s1.auraDmg > s0.auraDmg) lines.push('Herd aura +' + pct(s1.auraDmg) + ' damage');
    const p = PATHS[t.race][i];
    if (k === 10) lines.push('Signature: ' + p.sig);
    return { name: p.name, k, cost: nodeCost(t.race, k - 1), lines, sig: k === 10 ? p.sigDesc : '' };
  }

  function refreshBuffs(S) {
    for (const t of S.towers) t.buff = { dmg: 0, rate: 0 };
    for (const a of S.towers) {
      const s = stats(a);
      if (!s.auraR) continue;
      for (const b of S.towers) {
        if (a === b) continue;
        if ((a.x - b.x) ** 2 + (a.y - b.y) ** 2 <= s.auraR * s.auraR) { b.buff.dmg += s.auraDmg; b.buff.rate += s.auraRate; }
      }
    }
    S.buffsDirty = false;
  }

  function effDmg(t) { return stats(t).dmg * (1 + ((t.buff && t.buff.dmg) || 0)); }
  function effRate(t) { return stats(t).rate * (1 + ((t.buff && t.buff.rate) || 0)) * (t.boomT > 0 ? 3 : 1); }

  function topWave(S) { return Math.min(MAX_WAVE, S.cleared + 1); }

  function startWave(S, n) {
    if (S.run) return false;
    n = Math.max(1, Math.min(n || S.sel, topWave(S)));
    S.sel = n;
    const map = mapOf(S);
    const spec = waveSpec(n, map);
    S.stats.played++;
    S.run = {
      n, spec, map, route: map.route, queue: spec.list.slice(), t: 0, lives: LIVES, enemies: [], proj: [], earned: 0, kills: 0, eid: 1,
      fresh: n > S.cleared, over: null, rng: mulberry(hashSeed(S.seed, n, S.stats.played)), bossIds: [],
    };
    for (const t of S.towers) { t.cd = 0; t.sigT = 0; t.boomT = 0; t.stomp = 0; t.wDmg = 0; t.wKills = 0; }
    emit(S, 'start', { n, boss: spec.boss });
    return true;
  }

  function emit(S, type, data) { S.events.push(Object.assign({ type }, data || {})); }
  function fx(S, o) { if (S.fxOn && S.fx.length < 700) { o.t = 0; S.fx.push(o); } }

  function spawnEnemy(S, run, type, d, opts) {
    const n = run.n;
    const def = ENEMIES[type];
    const hpMax = hpFor(n, run.map) * def.hp;
    const e = {
      id: run.eid++, type, path: 0, d: d === undefined ? 0 : d, off: 0, x: 0, y: 0, tx: 1, ty: 0,
      hpMax, hp: hpMax, speed: def.speed, r: def.r, flying: !!def.flying, magical: !!def.magical,
      boss: type === 'boss', cash: def.cash, color: def.color, dark: def.dark, alive: true,
      slow: 0, slowT: 0, stunT: 0, hexAmp: 0, hexT: 0, doom: false, dispelT: 0, burrowT: 0, trickT: 0, sprintT: 0,
      quag: false, hit: 0, leak: 1, phase: 0, seed: (run.eid * 977) % 1000, dn: 0, dnT: 0, dnCrit: false,
    };
    if (e.boss) {
      const b = run.spec.boss || BOSSES[0];
      e.bossDef = b; e.trick = b.trick; e.name = b.name; e.color = b.color; e.dark = b.dark; e.leak = 5;
      e.hpMax = e.hp = hpFor(n, run.map) * def.hp * (1 + n / 100) * (b.hpMul || 1);
      e.thresholds = [0.75, 0.5, 0.25];
      if (e.trick === 'flying') e.flying = true;
      if (e.trick === 'magical') e.magical = true;
      if (e.trick === 'armor') e.armor = true;
      if (e.trick === 'phase') e.flying = true;
    }
    if (opts) Object.assign(e, opts);
    const rng = mulberry(n * 131 + e.id * 31);
    e.off = (rng() - 0.5) * (e.boss ? 10 : 34);
    placeOnRoute(run, e);
    run.enemies.push(e);
    if (e.boss && !e.splitDone) { run.bossIds.push(e.id); emit(S, 'boss', { name: e.name, n }); }
    return e;
  }

  function placeOnRoute(run, e) {
    routePos(run.route[e.path] || run.route[0], e.d, e);
    const o = e.off + (e.flying ? Math.sin(e.phase * 2.2 + e.seed) * 22 : 0);
    e.x += -e.ty * o; e.y += e.tx * o;
  }

  function isFly(e) { return e.flying; }
  function isMagic(e) { return e.magical && !(e.dispelT > 0); }
  function canHit(s, e) {
    if (!e.alive || e.burrowT > 0 || e.d < SPAWN_GUARD) return false;
    if (isFly(e) && !s.canFly) return false;
    if (isMagic(e) && !s.canMagic) return false;
    return true;
  }
  function dist2(a, b) { return (a.x - b.x) ** 2 + (a.y - b.y) ** 2; }
  function inRange(t, e, R) { return (t.x - e.x) ** 2 + (t.y - e.y) ** 2 <= (R + e.r * 0.5) ** 2; }

  function targetsFor(run, t, s) {
    const out = [];
    for (const e of run.enemies) if (canHit(s, e) && inRange(t, e, s.range)) out.push(e);
    return out;
  }
  function pick(list, mode, t) {
    let best = null, bv = -Infinity;
    for (const e of list) {
      let v;
      if (mode === 'last') v = -e.d;
      else if (mode === 'strong') v = e.hp;
      else if (mode === 'close') v = -((e.x - t.x) ** 2 + (e.y - t.y) ** 2);
      else v = e.d;
      if (v > bv) { bv = v; best = e; }
    }
    return best;
  }

  function flushNum(S, e) {
    if (e.dn > 0 && S.settings.dmgNums) fx(S, { k: 'num', x: e.x, y: e.y - e.r, s: fmt(e.dn), crit: e.dnCrit, big: e.boss, life: e.dnCrit ? 0.95 : 0.75, seed: e.id });
    e.dn = 0; e.dnCrit = false; e.dnT = 0;
  }

  function damage(S, run, e, amt, t, crit) {
    if (!e.alive || amt <= 0) return;
    let m = 1 + (e.hexT > 0 ? e.hexAmp : 0) + (e.quag ? 0.15 : 0);
    if (e.armor && e.hp > e.hpMax * 0.5) m *= 0.4;
    const dealt = amt * m;
    const real = Math.min(e.hp, dealt);
    S.stats.dmg += real;
    if (t) { t.dmg += real; t.wDmg += real; }
    e.hp -= dealt;
    e.hit = 0.12;
    S.sfx.hit++;
    if (S.fxOn) { if (e.dn === 0) e.dnT = 0.16; e.dn += real; if (crit) e.dnCrit = true; }
    if (e.hp <= 0) { kill(S, run, e, t); return; }
    if (e.thresholds && (e.trick === 'brood' || e.trick === 'mother')) {
      while (e.thresholds.length && e.hp < e.hpMax * e.thresholds[0]) {
        e.thresholds.shift();
        for (let i = 0; i < 4; i++) {
          const m2 = spawnEnemy(S, run, 'basic', Math.max(20, e.d - 12 - i * 14));
          m2.hpMax = m2.hp = hpFor(run.n, run.map) * 1.2;
        }
        fx(S, { k: 'ring', x: e.x, y: e.y, r: 60, c: '#a07a52', life: 0.5 });
      }
    }
  }

  function kill(S, run, e, t) {
    if (!e.alive) return;
    e.alive = false;
    if (S.fxOn) flushNum(S, e);
    const mult = t ? stats(t).cash : 1;
    const gain = killCash(run.n, run.map) * e.cash * mult;
    S.cash += gain; run.earned += gain; run.kills++; S.totalKills++; S.stats.earned += gain;
    S.sfx.kill++;
    if (t) { t.kills++; t.wKills++; }
    fx(S, { k: 'puff', x: e.x, y: e.y, r: e.r, c: e.color, life: 0.45 });
    fx(S, { k: 'burst', x: e.x, y: e.y, r: e.r, c: e.color, c2: e.dark, seed: e.id * 7 + run.n, life: e.boss ? 0.9 : 0.5, big: e.boss });
    if (e.boss || mult > 1.5) fx(S, { k: 'text', x: e.x, y: e.y - 20, s: '+' + fmt(gain), c: '#e3c15b', life: 1.1 });
    if (e.boss) { S.stats.bossKills++; emit(S, 'bossDown', { name: e.name, split: !!e.splitDone }); }
    if (e.doom) {
      const R = 90, dmgAmt = e.hpMax * 0.25;
      fx(S, { k: 'ring', x: e.x, y: e.y, r: R, c: '#c06bff', life: 0.45 });
      for (const o of run.enemies) if (o !== e && o.alive && dist2(o, e) <= R * R) damage(S, run, o, dmgAmt, t);
    }
    if (e.boss && e.trick === 'split' && !e.splitDone) {
      for (const s of [-1, 1]) {
        const c = spawnEnemy(S, run, 'boss', Math.max(20, e.d - 160 + s * 18), { path: e.path });
        c.hpMax = c.hp = e.hpMax * 0.25; c.splitDone = true; c.r = e.r * 0.75; c.leak = 3; c.speed = 46; c.name = 'Shade';
      }
      fx(S, { k: 'ring', x: e.x, y: e.y, r: 70, c: '#6b5a8a', life: 0.6 });
    }
  }

  function hitEnemy(S, run, t, s, e, base) {
    if (!e.alive) return;
    let d = base;
    if (isFly(e)) d *= s.flyMul;
    if (isMagic(e) || (e.magical && s.has.leyrupture)) d *= s.magicMul;
    let crit = false;
    if (s.crit > 0 && run.rng() < s.crit) { crit = true; d *= (s.has.raptordive && isFly(e)) ? 5 : s.critMul; S.sfx.crit++; }
    damage(S, run, e, d, t, crit);
    if (crit) fx(S, { k: 'spark', x: e.x, y: e.y, c: '#fff2a8', life: 0.3 });
    if (!e.alive) return;
    if (s.slow > 0) { e.slow = Math.max(e.slow, e.boss ? s.slow * 0.5 : s.slow); e.slowT = Math.max(e.slowT, s.slowDur); }
    if (s.stunCh > 0 && run.rng() < s.stunCh) stunE(e, e.boss ? s.stunDur * 0.3 : s.stunDur);
    if (s.hex > 0) { e.hexAmp = Math.max(e.hexAmp, s.hex); e.hexT = 4; if (s.has.doomhex) e.doom = true; }
    if (s.knock > 0) e.d = Math.max(16, e.d - s.knock * (e.boss ? 0.15 : 1));
    if (s.has.raptordive && isFly(e) && !e.boss && e.hp < e.hpMax * 0.2) kill(S, run, e, t);
  }

  function fire(S, run, t, s, targets, dmg) {
    if (t.race === 'earth') {
      t.stomp++;
      let d = dmg, stun = 0;
      if (s.has.earthshatter && t.stomp % 4 === 0) { d *= 5; stun = 1; }
      for (const e of targets) {
        if (s.has.leyrupture && e.magical) e.dispelT = 3;
        hitEnemy(S, run, t, s, e, d);
        if (stun && e.alive) stunE(e, e.boss ? 0.3 : stun);
      }
      t.anim = 0.25;
      fx(S, { k: 'stomp', x: t.x, y: t.y, r: s.range, c: stun ? '#ffd27a' : (s.has.leyrupture ? '#b48bff' : '#c9a36b'), life: 0.35 });
      return;
    }
    const first = pick(targets, t.mode, t);
    t.face = Math.atan2(first.y - t.y, first.x - t.x);
    t.anim = 0.2;
    let list;
    if (s.has.featherstorm) list = targets;
    else {
      list = [first];
      if (s.multi > 1) {
        const rest = targets.filter(e => e !== first).sort((a, b) => b.d - a.d);
        for (let i = 0; i < s.multi - 1 && i < rest.length; i++) list.push(rest[i]);
      }
    }
    for (const e of list) {
      run.proj.push({ x: t.x, y: t.y - 10, e, t, dmg, sp: t.race === 'unicorn' ? 560 : 820, kind: t.race, life: 3, a: 0 });
    }
  }

  function projHit(S, run, p) {
    const t = p.t, s = stats(t), e = p.e;
    if (S.towers.indexOf(t) < 0) return;
    if (!e.alive) return;
    if (t.race === 'unicorn') {
      const d = p.dmg;
      hitEnemy(S, run, t, s, e, d);
      if (s.splash > 0) {
        fx(S, { k: 'ring', x: p.x, y: p.y, r: s.splash, c: '#d6b8ff', life: 0.3 });
        for (const o of run.enemies) if (o !== e && canHit(s, o) && dist2(o, p) <= s.splash * s.splash) hitEnemy(S, run, t, s, o, d * 0.6);
      }
      if (s.has.prismburst) {
        const near = run.enemies.filter(o => o !== e && canHit(s, o) && dist2(o, p) <= 110 * 110).sort((a, b) => dist2(a, p) - dist2(b, p)).slice(0, 4);
        for (const o of near) { fx(S, { k: 'zap', x1: p.x, y1: p.y, x2: o.x, y2: o.y, c: '#ffc8f4', life: 0.2 }); hitEnemy(S, run, t, s, o, d * 0.5); }
      }
      if (s.has.aurora && e.flying) {
        const fl = run.enemies.filter(o => o !== e && o.alive && o.flying && canHit(s, o) && dist2(o, p) <= 160 * 160).slice(0, 2);
        for (const o of fl) { fx(S, { k: 'zap', x1: p.x, y1: p.y, x2: o.x, y2: o.y, c: '#7dffcf', life: 0.25 }); hitEnemy(S, run, t, s, o, d); }
      }
    } else {
      hitEnemy(S, run, t, s, e, p.dmg);
      if (s.chain > 0) {
        const hit = new Set([e]);
        let from = { x: p.x, y: p.y };
        for (let i = 0; i < s.chain; i++) {
          let best = null, bd = 130 * 130;
          for (const o of run.enemies) { if (hit.has(o) || !canHit(s, o)) continue; const dd = dist2(o, from); if (dd < bd) { bd = dd; best = o; } }
          if (!best) break;
          hit.add(best);
          fx(S, { k: 'zap', x1: from.x, y1: from.y, x2: best.x, y2: best.y, c: '#bfe8ff', life: 0.18 });
          hitEnemy(S, run, t, s, best, p.dmg * 0.6);
          from = { x: best.x, y: best.y };
        }
      }
    }
  }

  function signatures(S, run, t, s, dt, targets, dmg) {
    if (!s.sigs.length) return;
    t.sigT += dt;
    if (t.boomT > 0) t.boomT -= dt;
    const every = (sec) => { if (t.sigT >= sec) { t.sigT = 0; return true; } return false; };
    if (s.has.starfall && targets.length && every(6)) {
      let best = targets[0]; for (const e of targets) if (e.hp > best.hp) best = e;
      const R = 75;
      fx(S, { k: 'star', x: best.x, y: best.y, r: R, c: '#ffe9a8', life: 0.6 });
      for (const o of run.enemies) if (o.alive && o.burrowT <= 0 && dist2(o, best) <= R * R) damage(S, run, o, dmg * 12, t);
    }
    if (s.has.timestop && targets.length && every(10)) {
      fx(S, { k: 'ring', x: t.x, y: t.y, r: s.range, c: '#9fe3ff', life: 0.6 });
      for (const o of run.enemies) if (o.alive && inRange(t, o, s.range)) stunE(o, o.boss ? 0.5 : 1.5);
    }
    if (s.has.thunderhead && targets.length && every(5)) {
      const list = targets.slice().sort((a, b) => b.hp - a.hp).slice(0, 8);
      for (const o of list) { fx(S, { k: 'bolt', x: o.x, y: o.y, c: '#e6f4ff', life: 0.3 }); hitEnemy(S, run, t, s, o, dmg * 5); }
    }
    if (s.has.cyclone && targets.length && every(9)) {
      fx(S, { k: 'swirl', x: t.x, y: t.y, r: s.range, c: '#bdf5ee', life: 0.7 });
      for (const o of run.enemies) if (o.alive && !o.boss && inRange(t, o, s.range)) { o.d = Math.max(16, o.d - 150); stunE(o, 0.6); }
    }
    if (s.has.rainboom && targets.length && every(15)) {
      t.boomT = 4;
      fx(S, { k: 'rainbow', x: t.x, y: t.y, r: s.range, life: 0.9 });
    }
    if (s.has.stampede && every(12)) {
      let any = false;
      for (const o of run.enemies) {
        if (!o.alive || o.flying || o.burrowT > 0 || o.d < SPAWN_GUARD) continue;
        if (isMagic(o) && !s.canMagic) continue;
        any = true; hitEnemy(S, run, t, s, o, dmg * 6);
      }
      if (any) fx(S, { k: 'stampede', x: 0, y: 0, life: 0.9 });
      else t.sigT = 12;
    }
  }

  function stunE(e, dur) { if (e.stunT > 0 || e.stunImm > 0) return; e.stunT = dur; }

  function enemyUpdate(S, run, e, dt) {
    if (e.hit > 0) e.hit -= dt;
    if (e.dn > 0) { e.dnT -= dt; if (e.dnT <= 0) flushNum(S, e); }
    if (e.hexT > 0) { e.hexT -= dt; if (e.hexT <= 0) { e.hexAmp = 0; } }
    if (e.dispelT > 0) e.dispelT -= dt;
    if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slow = 0; }
    if (e.boss) bossTrick(S, run, e, dt);
    if (e.stunImm > 0) e.stunT = 0;
    let sp = e.speed * (1 - e.slow) * (e.quag ? 0.5 : 1) * (e.sprintT > 0 ? 3 : 1);
    if (e.stunT > 0) { e.stunT -= dt; sp = 0; if (e.stunT <= 0) e.stunImm = e.boss ? 2.5 : 1.2; }
    if (e.stunImm > 0) e.stunImm -= dt;
    if (run.enrage) { e.stunT = 0; e.slow = 0; sp = e.speed * 1.6; }
    e.d += sp * dt;
    e.phase += dt * (sp > 0 ? 1 : 0.2);
    placeOnRoute(run, e);
    const P = run.route[e.path] || run.route[0];
    if (e.d >= P.len) {
      e.alive = false;
      run.lives -= e.leak;
      S.sfx.leak++;
      const end = P.pts[P.pts.length - 1];
      fx(S, { k: 'leak', x: Math.min(WORLD.L, end[0]), y: end[1], life: 0.6 });
      emit(S, 'leak', { boss: e.boss, lives: run.lives });
    }
  }

  function bossTrick(S, run, e, dt) {
    e.trickT += dt;
    if (e.burrowT > 0) e.burrowT -= dt;
    if (e.sprintT > 0) e.sprintT -= dt;
    const tr = e.trick;
    if (tr === 'burrow' && e.trickT >= 5) { e.trickT = 0; e.burrowT = 1.6; fx(S, { k: 'puff', x: e.x, y: e.y, r: 30, c: '#5a4030', life: 0.5 }); }
    if (tr === 'sprint' && e.trickT >= 6) { e.trickT = 0; e.sprintT = 1.5; }
    if (tr === 'regen' || (tr === 'mother' && e.hp < e.hpMax * 0.33)) {
      e.hp = Math.min(e.hpMax, e.hp + e.hpMax * 0.015 * dt);
      for (const o of run.enemies) if (o !== e && o.alive && !o.boss && dist2(o, e) < 120 * 120) o.hp = Math.min(o.hpMax, o.hp + o.hpMax * 0.03 * dt);
    }
    if (tr === 'phase' && e.trickT >= 4) { e.trickT = 0; e.flying = !e.flying; e.magical = !e.flying; fx(S, { k: 'ring', x: e.x, y: e.y, r: 40, c: e.magical ? '#c08bff' : '#9fd0ff', life: 0.4 }); }
    if (tr === 'mother') {
      const f = e.hp / e.hpMax;
      if (f > 0.66) { if (e.trickT >= 7) { e.trickT = 0; e.sprintT = 1.2; } e.flying = false; e.magical = false; }
      else if (f > 0.33) { e.flying = true; e.magical = false; }
      else { e.flying = false; e.magical = true; }
    }
  }

  function bossStatus(run) {
    if (!run) return null;
    let hp = 0, max = 0, name = '', def = null, count = 0;
    for (const e of run.enemies) {
      if (!e.boss || !e.alive) continue;
      hp += Math.max(0, e.hp); max += e.hpMax; count++;
      if (!def) { def = e.bossDef; name = e.splitDone ? e.bossDef.name + ' (shades)' : e.name; }
    }
    if (!count) return null;
    const lead = run.enemies.find(e => e.boss && e.alive);
    return { name, def, hp, max, count, frac: max ? hp / max : 0, lead };
  }

  function step(S, dt) {
    S.time += dt;
    for (let i = S.fx.length - 1; i >= 0; i--) { const f = S.fx[i]; f.t += dt; if (f.t >= f.life) S.fx.splice(i, 1); }
    for (const t of S.towers) if (t.anim > 0) t.anim -= dt;
    const run = S.run;
    if (!run || run.over) return;
    if (S.buffsDirty) refreshBuffs(S);
    run.t += dt;
    if (!run.queue.length && !run.enrage && run.t > run.spec.duration + 75) { run.enrage = true; emit(S, 'enrage', {}); }
    while (run.queue.length && run.queue[0].t <= run.t) spawnEnemy(S, run, run.queue.shift().type);

    for (const e of run.enemies) e.quag = false;
    for (const t of S.towers) {
      const s = stats(t);
      if (!s.has.quagmire) continue;
      for (const e of run.enemies) if (e.alive && !e.flying && inRange(t, e, s.range)) e.quag = true;
    }

    for (const e of run.enemies) if (e.alive) enemyUpdate(S, run, e, dt);

    for (const t of S.towers) {
      const s = stats(t);
      const dmg = effDmg(t);
      const targets = targetsFor(run, t, s);
      signatures(S, run, t, s, dt, targets, dmg);
      t.cd -= dt;
      if (t.cd > 0) continue;
      if (!targets.length) { t.cd = 0; continue; }
      t.cd += 1 / effRate(t);
      if (t.cd < 0) t.cd = 0;
      fire(S, run, t, s, targets, dmg);
    }

    for (let i = run.proj.length - 1; i >= 0; i--) {
      const p = run.proj[i];
      p.life -= dt;
      const e = p.e;
      if (!e.alive || p.life <= 0 || e.burrowT > 0) { run.proj.splice(i, 1); continue; }
      const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy), mv = p.sp * dt;
      if (d <= mv + e.r * 0.5) { p.x = e.x; p.y = e.y; run.proj.splice(i, 1); projHit(S, run, p); }
      else { p.x += dx / d * mv; p.y += dy / d * mv; p.a = Math.atan2(dy, dx); }
    }

    run.enemies = run.enemies.filter(e => e.alive);

    if (run.lives <= 0) {
      run.over = 'lost';
      emit(S, 'lost', { n: run.n, earned: run.earned });
      S.run = null;
      return;
    }
    if (!run.queue.length && !run.enemies.length) {
      run.over = 'won';
      let bonus = 0;
      if (run.n > S.cleared) { bonus = clearBonus(run.n, run.map); S.cash += bonus; S.cleared = run.n; }
      emit(S, 'won', { n: run.n, bonus, earned: run.earned, fresh: bonus > 0, lives: run.lives });
      S.run = null;
    }
  }

  function serialize(S) {
    return JSON.stringify({
      ver: SAVE_VER, map: S.map, seed: S.seed,
      cash: S.cash, cleared: S.cleared, sel: S.sel, auto: S.auto, nextId: S.nextId, totalKills: S.totalKills,
      stats: S.stats, settings: S.settings,
      towers: S.towers.map(t => ({ id: t.id, race: t.race, x: t.x, y: t.y, spent: t.spent, paths: t.paths, infD: t.infD, infR: t.infR, mode: t.mode, kills: t.kills, dmg: t.dmg })),
    });
  }

  const MIGRATIONS = {
    1(o) {
      o.map = 'moonlit';
      o.seed = 0x2545F491;
      o.stats = { played: 0, dmg: 0, bossKills: 0, earned: 0 };
      o.settings = Object.assign({}, DEFAULT_SETTINGS);
      for (const t of o.towers || []) t.dmg = 0;
      o.ver = 2;
      delete o.v;
      return o;
    },
  };
  function saveVersion(o) { return o.ver | 0 || (o.v === 1 ? 1 : 0); }
  function migrate(o) {
    if (!o || typeof o !== 'object') return null;
    let ver = saveVersion(o);
    if (!ver || ver > SAVE_VER) return null;
    while (ver < SAVE_VER) {
      if (!MIGRATIONS[ver]) return null;
      o = MIGRATIONS[ver](o);
      ver = o.ver;
    }
    return o;
  }

  function cleanSettings(src) {
    const out = Object.assign({}, DEFAULT_SETTINGS);
    if (!src || typeof src !== 'object') return out;
    for (const k of ['sound', 'shake', 'dmgNums']) if (k in src) out[k] = !!src[k];
    if (isFinite(src.vol)) out.vol = Math.max(0, Math.min(1, +src.vol));
    if (NUM_FORMATS.indexOf(src.numFmt) >= 0) out.numFmt = src.numFmt;
    if (SPEEDS.indexOf(src.speed) >= 0) out.speed = src.speed;
    return out;
  }

  function deserialize(str) {
    const o = migrate(JSON.parse(str));
    if (!o) return null;
    const S = newState();
    S.map = MAPS[o.map] ? o.map : 'moonlit';
    S.seed = o.seed >>> 0 || S.seed;
    S.cash = Number(o.cash) || 0; S.cleared = Math.max(0, Math.min(MAX_WAVE, o.cleared | 0)); S.sel = Math.max(1, o.sel | 0); S.auto = !!o.auto; S.nextId = o.nextId | 0 || 1; S.totalKills = o.totalKills | 0;
    const st = o.stats || {};
    S.stats = { played: st.played | 0, dmg: +st.dmg || 0, bossKills: st.bossKills | 0, earned: +st.earned || 0 };
    S.settings = cleanSettings(o.settings);
    setNumFormat(S.settings.numFmt);
    const map = mapOf(S);
    for (const r of o.towers || []) {
      if (!RACES[r.race]) continue;
      const t = makeTower(S, r.race, +r.x, +r.y);
      t.id = r.id; t.spent = +r.spent || 0; t.paths = (r.paths || [0, 0, 0, 0, 0]).slice(0, 5).map(v => Math.max(0, Math.min(10, v | 0)));
      while (t.paths.length < 5) t.paths.push(0);
      t.infD = r.infD | 0; t.infR = r.infR | 0; t.mode = r.mode || 'first'; t.kills = r.kills | 0; t.dmg = +r.dmg || 0;
      t.face = faceRoad(map, t.x, t.y);
      S.towers.push(t);
    }
    S.nextId = Math.max(S.nextId, ...S.towers.map(t => t.id + 1), 1);
    S.sel = Math.min(S.sel, topWave(S));
    return S;
  }

  let numFmt = 'short';
  function setNumFormat(m) { if (NUM_FORMATS.indexOf(m) >= 0) numFmt = m; return numFmt; }
  const UNITS = [[1e33, 'Dc'], [1e30, 'No'], [1e27, 'Oc'], [1e24, 'Sp'], [1e21, 'Sx'], [1e18, 'Qi'], [1e15, 'Qa'], [1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
  function sci(n) {
    const a = Math.abs(n);
    const e = Math.floor(Math.log10(a));
    let m = n / Math.pow(10, e);
    if (Math.abs(m) >= 9.995) return (m / 10).toFixed(2) + 'e' + (e + 1);
    return m.toFixed(2) + 'e' + e;
  }
  function fmt(n) {
    if (!isFinite(n)) return '∞';
    const a = Math.abs(n);
    if (a < 1000) return (a < 10 && a % 1 !== 0 ? (Math.round(n * 10) / 10) : Math.floor(n)).toString();
    if (numFmt === 'sci') return sci(n);
    if (numFmt === 'full') return a < 1e15 ? Math.floor(n).toLocaleString('en-US') : sci(n);
    if (a >= 1e36) return sci(n);
    for (const [v, u] of UNITS) if (a >= v) { const x = n / v; const s = x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2); return (s === '1000' ? '999' : s) + u; }
    return String(Math.floor(n));
  }

  const API = {
    WORLD, MAX_WAVE, LIVES, SAVE_VER, TUNE, RACES, RACE_IDS, PATHS, ENEMIES, BOSSES, BOSS_BY_ID, MAPS, MAP_IDS, WAVEGEN,
    DEFAULT_SETTINGS, NUM_FORMATS, SPEEDS,
    hpFor, killCash, clearBonus, waveSpec, bossFor, themeFor, towerCost, nodeCost, infCost, getMap, mapOf, routePos, nearestOnMap, faceRoad,
    newState, owned, nextTowerCost, canPlace, placeTower, sellTower, sellValue, chosenPaths, pathState, nextNodeCost, buyNode, infNext, buyInf,
    upgradeOptions, buyMaxAffordable, maxAffordablePreview, nodeInfo, topWave, bossStatus,
    stats, computeStats, effDmg, effRate, refreshBuffs, startWave, step, canHit, isMagic, isFly,
    serialize, deserialize, migrate, cleanSettings, fmt, setNumFormat, pct, mulberry, hashSeed,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.NDCore = API;
})(typeof window !== 'undefined' ? window : globalThis);
