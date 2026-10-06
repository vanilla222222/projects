(function (root) {
  'use strict';

  const WORLD = { L: 1400, W: 800, cy: 400, half: 38, towerR: 20, minGap: 44, startD: -40, endD: 1440 };
  const MAX_WAVE = 100;
  const LIVES = 10;

  const TUNE = {
    hp0: 14, hpLin: 0.10, hpGrowth: 1.15, hpGrowth2: 1.075, hpKnee: 50,
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
    basic: { id: 'basic', name: 'DNB Shambler', hp: 1, speed: 62, r: 13, cash: 1, color: '#8a6544', dark: '#4a3220' },
    fast: { id: 'fast', name: 'DNB Skitter', hp: 0.55, speed: 118, r: 11, cash: 0.8, color: '#a8805a', dark: '#5a3f26' },
    tanky: { id: 'tanky', name: 'DNB Brute', hp: 3.4, speed: 38, r: 18, cash: 2.5, color: '#6b4c31', dark: '#36261a' },
    flying: { id: 'flying', name: 'DNB Duskwing', hp: 0.8, speed: 78, r: 12, cash: 1.3, flying: true, color: '#7d5c48', dark: '#3f2c22' },
    magical: { id: 'magical', name: 'DNB Hexling', hp: 1.3, speed: 56, r: 13, cash: 1.5, magical: true, color: '#86606a', dark: '#46303a' },
    boss: { id: 'boss', name: 'Boss', hp: 26, speed: 36, r: 26, cash: 20, color: '#5e3f28', dark: '#2c1c12' },
  };

  const BOSSES = [
    { name: 'Mudmaw', trick: 'burrow', hpMul: 1, desc: 'Burrows underground every few seconds and cannot be hit while buried.', color: '#7a5634', dark: '#3a2616' },
    { name: 'Mother Mire', trick: 'brood', hpMul: 0.9, desc: 'Spits out a brood of Shamblers each time she loses a quarter of her HP.', color: '#6e5a3a', dark: '#352a1a' },
    { name: 'Skyrend', trick: 'flying', hpMul: 0.55, desc: 'A winged brute. Only pegasi and sky-sighted unicorns can hit it.', color: '#6b4d3c', dark: '#33231a' },
    { name: 'The Hexhulk', trick: 'magical', hpMul: 0.55, desc: 'Wrapped in dark magic. Only unicorns and ley-hoofed earth ponies can hurt it.', color: '#6e4a5c', dark: '#35222c' },
    { name: 'Gloamrunner', trick: 'sprint', hpMul: 1, desc: 'Breaks into a triple-speed sprint every 6 seconds.', color: '#8a6040', dark: '#432c1a' },
    { name: 'Bramble King', trick: 'regen', hpMul: 0.85, desc: 'Regrows 1.5% HP per second and heals DNBs around him.', color: '#5c5a34', dark: '#2c2a16' },
    { name: 'Duskwraith', trick: 'phase', hpMul: 0.6, desc: 'Flickers between flying and magical forms every 4 seconds.', color: '#5a4660', dark: '#2a2030' },
    { name: 'Stonehide Colossus', trick: 'armor', hpMul: 0.8, desc: 'A stone shell blocks 60% of damage until it drops below half HP.', color: '#6a6258', dark: '#34302a' },
    { name: 'Twin Shade', trick: 'split', hpMul: 0.3, desc: 'Splits into two smaller shades when slain.', color: '#4e3a30', dark: '#241a14' },
    { name: 'The Nightmother', trick: 'mother', hpMul: 0.35, desc: 'Sprints and summons, then takes to the air, then turns magical and regrows.', color: '#3e2a3a', dark: '#1c121a' },
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

  function hpFor(n) {
    const a = Math.min(n, TUNE.hpKnee) - 1, b = Math.max(0, n - TUNE.hpKnee);
    return TUNE.hp0 * (1 + TUNE.hpLin * (n - 1)) * Math.pow(TUNE.hpGrowth, a) * Math.pow(TUNE.hpGrowth2, b);
  }
  function killCash(n) { return TUNE.cash0 * Math.pow(TUNE.cashGrowth, n - 1); }
  function clearBonus(n) { return Math.round(TUNE.clear0 * (1 + 0.1 * n) * Math.pow(TUNE.clearGrowth, n - 1) * (n % 10 === 0 ? 2.5 : 1)); }
  function bossFor(n) { return n % 10 === 0 ? BOSSES[Math.min(9, n / 10 - 1)] : null; }

  function themeFor(n) {
    if (n % 10 === 0) return 'boss';
    if (n === 6 || n % 9 === 0) return 'flying';
    if (n === 8 || n % 11 === 6) return 'magical';
    if (n % 7 === 0) return 'fast';
    if (n % 8 === 4) return 'tanky';
    return '';
  }

  function waveSpec(n) {
    const rng = mulberry(n * 7919 + 17);
    const boss = bossFor(n);
    let count = 8 + Math.floor(n * 0.45);
    if (boss) count = Math.round(count * 0.6);
    const theme = themeFor(n);
    const w = {
      basic: 10,
      fast: n >= 3 ? 4 + (theme === 'fast' ? 10 : 0) : 0,
      tanky: n >= 5 ? 3 + (theme === 'tanky' ? 6 : 0) : 0,
      flying: n >= 6 ? 3 + (theme === 'flying' ? 8 : 0) : 0,
      magical: n >= 8 ? 3 + (theme === 'magical' ? 8 : 0) : 0,
    };
    const keys = Object.keys(w);
    const total = keys.reduce((a, k) => a + w[k], 0);
    const gap = Math.max(0.38, 1.05 - n * 0.007);
    const list = [];
    let t = 0;
    for (let i = 0; i < count; i++) {
      let r = rng() * total, type = 'basic';
      for (const k of keys) { r -= w[k]; if (r <= 0) { type = k; break; } }
      list.push({ t, type });
      t += gap * (type === 'tanky' ? 1.4 : type === 'fast' ? 0.6 : 1) * (0.8 + rng() * 0.4);
    }
    if (boss) list.push({ t: t + 1.5, type: 'boss' });
    const counts = {};
    for (const e of list) counts[e.type] = (counts[e.type] || 0) + 1;
    return { n, list, boss, counts, theme };
  }

  function towerCost(race, owned) { return Math.round(RACES[race].cost * Math.pow(TUNE.towerGrowth, owned)); }
  function nodeCost(race, k) { return Math.round(RACES[race].cost * TUNE.nodeBase * Math.pow(TUNE.nodeGrowth, k)); }
  function infCost(race, lv) { return Math.round(RACES[race].cost * TUNE.infBase * Math.pow(TUNE.infGrowth, lv)); }

  function newState() {
    return {
      v: 1, cash: TUNE.startCash, cleared: 0, sel: 1, auto: false, towers: [], nextId: 1,
      run: null, time: 0, fxOn: true, fx: [], events: [], buffsDirty: true, totalKills: 0, stats: { played: 0 },
    };
  }

  function owned(S, race) { let c = 0; for (const t of S.towers) if (t.race === race) c++; return c; }
  function nextTowerCost(S, race) { return towerCost(race, owned(S, race)); }

  function canPlace(S, x, y, ignore) {
    const R = WORLD.towerR;
    if (x < R || x > WORLD.L - R || y < R || y > WORLD.W - R) return false;
    if (Math.abs(y - WORLD.cy) < WORLD.half + R) return false;
    for (const t of S.towers) {
      if (t === ignore) continue;
      if ((t.x - x) ** 2 + (t.y - y) ** 2 < WORLD.minGap * WORLD.minGap) return false;
    }
    return true;
  }

  function makeTower(S, race, x, y) {
    return { id: S.nextId++, race, x, y, spent: 0, paths: [0, 0, 0, 0, 0], infD: 0, infR: 0, mode: 'first', cd: 0, sigT: 0, stomp: 0, boomT: 0, face: 0, kills: 0, anim: 0, _s: null };
  }

  function placeTower(S, race, x, y) {
    if (!canPlace(S, x, y)) return null;
    const cost = nextTowerCost(S, race);
    if (S.cash < cost) return null;
    S.cash -= cost;
    const t = makeTower(S, race, x, y);
    t.spent = cost;
    t.face = y < WORLD.cy ? Math.PI / 2 : -Math.PI / 2;
    S.towers.push(t);
    S.buffsDirty = true;
    return t;
  }

  function sellTower(S, t) {
    const i = S.towers.indexOf(t);
    if (i < 0) return 0;
    const refund = Math.floor(t.spent * TUNE.sellRate);
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
    s.dmg *= Math.pow(TUNE.infMul, t.infD);
    s.rate *= Math.pow(TUNE.infMul, t.infR);
    s.has = {};
    for (const k of s.sigs) s.has[k] = true;
    return s;
  }
  function stats(t) { if (!t._s) t._s = computeStats(t); return t._s; }

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

  function startWave(S, n) {
    if (S.run) return false;
    n = Math.max(1, Math.min(n || S.sel, Math.min(MAX_WAVE, S.cleared + 1)));
    S.sel = n;
    const spec = waveSpec(n);
    S.run = { n, spec, queue: spec.list.slice(), t: 0, lives: LIVES, enemies: [], proj: [], earned: 0, kills: 0, eid: 1, fresh: n > S.cleared, over: null };
    for (const t of S.towers) { t.cd = 0; t.sigT = 0; t.boomT = 0; t.stomp = 0; }
    S.stats.played++;
    emit(S, 'start', { n, boss: spec.boss });
    return true;
  }

  function emit(S, type, data) { S.events.push(Object.assign({ type }, data || {})); }
  function fx(S, o) { if (S.fxOn) { o.t = 0; S.fx.push(o); } }

  function spawnEnemy(S, run, type, d, opts) {
    const n = run.n;
    const def = ENEMIES[type];
    let hpMax = hpFor(n) * def.hp;
    const e = {
      id: run.eid++, type, d: d === undefined ? WORLD.startD : d, off: 0, x: 0, y: 0,
      hpMax, hp: hpMax, speed: def.speed, r: def.r, flying: !!def.flying, magical: !!def.magical,
      boss: type === 'boss', cash: def.cash, color: def.color, dark: def.dark, alive: true,
      slow: 0, slowT: 0, stunT: 0, hexAmp: 0, hexT: 0, doom: false, dispelT: 0, burrowT: 0, trickT: 0, sprintT: 0,
      quag: false, hit: 0, leak: 1, phase: 0, seed: (run.eid * 977) % 1000,
    };
    if (e.boss) {
      const b = run.spec.boss || BOSSES[0];
      e.bossDef = b; e.trick = b.trick; e.name = b.name; e.color = b.color; e.dark = b.dark; e.leak = 5;
      e.hpMax = e.hp = hpFor(n) * def.hp * (1 + n / 100) * (b.hpMul || 1);
      e.thresholds = [0.75, 0.5, 0.25];
      if (e.trick === 'flying' ) e.flying = true;
      if (e.trick === 'magical') e.magical = true;
      if (e.trick === 'armor') e.armor = true;
      if (e.trick === 'phase') e.flying = true;
    }
    if (opts) Object.assign(e, opts);
    const rng = mulberry(n * 131 + e.id * 31);
    e.off = (rng() - 0.5) * (e.boss ? 10 : 34);
    e.x = e.d; e.y = WORLD.cy + e.off;
    run.enemies.push(e);
    return e;
  }

  function isFly(e) { return e.flying; }
  function isMagic(e) { return e.magical && !(e.dispelT > 0); }
  function canHit(s, e) {
    if (!e.alive || e.burrowT > 0 || e.d < WORLD.startD + 15) return false;
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

  function damage(S, run, e, amt, t, kind) {
    if (!e.alive || amt <= 0) return;
    let m = 1 + (e.hexT > 0 ? e.hexAmp : 0) + (e.quag ? 0.15 : 0);
    if (e.armor && e.hp > e.hpMax * 0.5) m *= 0.4;
    e.hp -= amt * m;
    e.hit = 0.12;
    if (e.hp <= 0) { kill(S, run, e, t); return; }
    if (e.thresholds && (e.trick === 'brood' || e.trick === 'mother')) {
      while (e.thresholds.length && e.hp < e.hpMax * e.thresholds[0]) {
        e.thresholds.shift();
        for (let i = 0; i < 4; i++) {
          const m2 = spawnEnemy(S, run, 'basic', Math.max(WORLD.startD + 20, e.d - 12 - i * 14));
          m2.hpMax = m2.hp = hpFor(run.n) * 1.2;
        }
        fx(S, { k: 'ring', x: e.x, y: e.y, r: 60, c: '#a07a52', life: 0.5 });
      }
    }
  }

  function kill(S, run, e, t) {
    if (!e.alive) return;
    e.alive = false;
    const mult = t ? stats(t).cash : 1;
    const gain = killCash(run.n) * e.cash * mult;
    S.cash += gain; run.earned += gain; run.kills++; S.totalKills++;
    if (t) t.kills++;
    fx(S, { k: 'puff', x: e.x, y: e.y, r: e.r, c: e.color, life: 0.45 });
    if (e.boss || mult > 1.5) fx(S, { k: 'text', x: e.x, y: e.y - 20, s: '+' + fmt(gain), c: '#e3c15b', life: 1.1 });
    if (e.doom) {
      const R = 90, dmgAmt = e.hpMax * 0.25;
      fx(S, { k: 'ring', x: e.x, y: e.y, r: R, c: '#c06bff', life: 0.45 });
      for (const o of run.enemies) if (o !== e && o.alive && dist2(o, e) <= R * R) damage(S, run, o, dmgAmt, t, 'doom');
    }
    if (e.boss && e.trick === 'split' && !e.splitDone) {
      for (const s of [-1, 1]) {
        const c = spawnEnemy(S, run, 'boss', Math.max(WORLD.startD + 20, e.d - 160 + s * 18));
        c.hpMax = c.hp = e.hpMax * 0.25; c.splitDone = true; c.r = e.r * 0.75; c.leak = 3; c.speed = 46; c.name = 'Shade';
      }
      fx(S, { k: 'ring', x: e.x, y: e.y, r: 70, c: '#6b5a8a', life: 0.6 });
    }
  }

  function hitEnemy(S, run, t, s, e, base, opts) {
    if (!e.alive) return;
    let d = base;
    if (isFly(e)) d *= s.flyMul;
    if (isMagic(e) || (e.magical && s.has.leyrupture)) d *= s.magicMul;
    let crit = false;
    if (s.crit > 0 && Math.random() < s.crit) { crit = true; d *= (s.has.raptordive && isFly(e)) ? 5 : s.critMul; }
    damage(S, run, e, d, t);
    if (crit) fx(S, { k: 'spark', x: e.x, y: e.y, c: '#fff2a8', life: 0.3 });
    if (!e.alive) return;
    if (s.slow > 0) { e.slow = Math.max(e.slow, e.boss ? s.slow * 0.5 : s.slow); e.slowT = Math.max(e.slowT, s.slowDur); }
    if (s.stunCh > 0 && Math.random() < s.stunCh) e.stunT = Math.max(e.stunT, e.boss ? s.stunDur * 0.3 : s.stunDur);
    if (s.hex > 0) { e.hexAmp = Math.max(e.hexAmp, s.hex); e.hexT = 4; if (s.has.doomhex) e.doom = true; }
    if (s.knock > 0) e.d = Math.max(WORLD.startD + 16, e.d - s.knock * (e.boss ? 0.15 : 1));
    if (s.has.raptordive && isFly(e) && !e.boss && e.hp < e.hpMax * 0.2) kill(S, run, e, t);
  }

  function fire(S, run, t, s, targets, dmg) {
    const R = RACES[t.race];
    if (t.race === 'earth') {
      t.stomp++;
      let d = dmg, stun = 0;
      if (s.has.earthshatter && t.stomp % 4 === 0) { d *= 5; stun = 1; }
      for (const e of targets) {
        if (s.has.leyrupture && e.magical) e.dispelT = 3;
        hitEnemy(S, run, t, s, e, d);
        if (stun && e.alive) e.stunT = Math.max(e.stunT, e.boss ? 0.3 : stun);
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
      run.proj.push({ x: t.x, y: t.y - 10, e, t, dmg, sp: t.race === 'unicorn' ? 560 : 820, kind: t.race, life: 3 });
    }
  }

  function projHit(S, run, p) {
    const t = p.t, s = stats(t), e = p.e;
    if (S.towers.indexOf(t) < 0) return;
    if (!e.alive) return;
    if (t.race === 'unicorn') {
      let d = p.dmg;
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
      for (const o of run.enemies) if (o.alive && inRange(t, o, s.range)) o.stunT = Math.max(o.stunT, o.boss ? 0.5 : 1.5);
    }
    if (s.has.thunderhead && targets.length && every(5)) {
      const list = targets.slice().sort((a, b) => b.hp - a.hp).slice(0, 8);
      for (const o of list) { fx(S, { k: 'bolt', x: o.x, y: o.y, c: '#e6f4ff', life: 0.3 }); hitEnemy(S, run, t, s, o, dmg * 5); }
    }
    if (s.has.cyclone && targets.length && every(9)) {
      fx(S, { k: 'swirl', x: t.x, y: t.y, r: s.range, c: '#bdf5ee', life: 0.7 });
      for (const o of run.enemies) if (o.alive && !o.boss && inRange(t, o, s.range)) { o.d = Math.max(WORLD.startD + 16, o.d - 150); o.stunT = Math.max(o.stunT, 0.6); }
    }
    if (s.has.rainboom && targets.length && every(15)) {
      t.boomT = 4;
      fx(S, { k: 'rainbow', x: t.x, y: t.y, r: s.range, life: 0.9 });
    }
    if (s.has.stampede && every(12)) {
      let any = false;
      for (const o of run.enemies) {
        if (!o.alive || o.flying || o.burrowT > 0 || o.d < WORLD.startD + 15) continue;
        if (isMagic(o) && !s.canMagic) continue;
        any = true; hitEnemy(S, run, t, s, o, dmg * 6);
      }
      if (any) fx(S, { k: 'stampede', x: 0, y: WORLD.cy, life: 0.9 });
      else t.sigT = 12;
    }
  }

  function enemyUpdate(S, run, e, dt) {
    if (e.hit > 0) e.hit -= dt;
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
    e.x = e.d;
    e.y = WORLD.cy + e.off + (e.flying ? Math.sin(e.phase * 2.2 + e.seed) * 22 : 0);
    if (e.d >= WORLD.endD) {
      e.alive = false;
      run.lives -= e.leak;
      fx(S, { k: 'leak', x: WORLD.L, y: WORLD.cy, life: 0.6 });
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

  function step(S, dt) {
    S.time += dt;
    for (let i = S.fx.length - 1; i >= 0; i--) { const f = S.fx[i]; f.t += dt; if (f.t >= f.life) S.fx.splice(i, 1); }
    for (const t of S.towers) if (t.anim > 0) t.anim -= dt;
    const run = S.run;
    if (!run || run.over) return;
    if (S.buffsDirty) refreshBuffs(S);
    run.t += dt;
    if (!run.queue.length && !run.enrage && run.t > run.spec.list[run.spec.list.length - 1].t + 75) { run.enrage = true; emit(S, 'enrage', {}); }
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
      if (run.n > S.cleared) { bonus = clearBonus(run.n); S.cash += bonus; S.cleared = run.n; }
      emit(S, 'won', { n: run.n, bonus, earned: run.earned, fresh: bonus > 0, lives: run.lives });
      S.run = null;
    }
  }

  function serialize(S) {
    return JSON.stringify({
      v: 1, cash: S.cash, cleared: S.cleared, sel: S.sel, auto: S.auto, nextId: S.nextId, totalKills: S.totalKills,
      towers: S.towers.map(t => ({ id: t.id, race: t.race, x: t.x, y: t.y, spent: t.spent, paths: t.paths, infD: t.infD, infR: t.infR, mode: t.mode, kills: t.kills })),
    });
  }
  function deserialize(str) {
    const o = JSON.parse(str);
    if (!o || o.v !== 1) return null;
    const S = newState();
    S.cash = Number(o.cash) || 0; S.cleared = o.cleared | 0; S.sel = Math.max(1, o.sel | 0); S.auto = !!o.auto; S.nextId = o.nextId | 0 || 1; S.totalKills = o.totalKills | 0;
    for (const r of o.towers || []) {
      if (!RACES[r.race]) continue;
      const t = makeTower(S, r.race, +r.x, +r.y);
      t.id = r.id; t.spent = +r.spent || 0; t.paths = (r.paths || [0, 0, 0, 0, 0]).slice(0, 5).map(v => Math.max(0, Math.min(10, v | 0)));
      t.infD = r.infD | 0; t.infR = r.infR | 0; t.mode = r.mode || 'first'; t.kills = r.kills | 0;
      t.face = t.y < WORLD.cy ? Math.PI / 2 : -Math.PI / 2;
      S.towers.push(t);
    }
    S.nextId = Math.max(S.nextId, ...S.towers.map(t => t.id + 1), 1);
    S.sel = Math.min(S.sel, Math.min(MAX_WAVE, S.cleared + 1));
    return S;
  }

  function fmt(n) {
    if (!isFinite(n)) return '∞';
    const a = Math.abs(n);
    if (a < 1000) return (a < 10 && a % 1 !== 0 ? (Math.round(n * 10) / 10) : Math.floor(n)).toString();
    if (a >= 1e12) { const e = Math.floor(Math.log10(a)); return (n / Math.pow(10, e)).toFixed(2) + 'e' + e; }
    const units = [[1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
    for (const [v, u] of units) if (a >= v) { const x = n / v; return (x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2)) + u; }
    return String(Math.floor(n));
  }

  const API = {
    WORLD, MAX_WAVE, LIVES, TUNE, RACES, RACE_IDS, PATHS, ENEMIES, BOSSES,
    hpFor, killCash, clearBonus, waveSpec, bossFor, towerCost, nodeCost, infCost,
    newState, owned, nextTowerCost, canPlace, placeTower, sellTower, chosenPaths, pathState, nextNodeCost, buyNode, infNext, buyInf,
    stats, computeStats, effDmg, effRate, refreshBuffs, startWave, step, canHit, isMagic, isFly, serialize, deserialize, fmt, pct, mulberry,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.NDCore = API;
})(typeof window !== 'undefined' ? window : globalThis);
