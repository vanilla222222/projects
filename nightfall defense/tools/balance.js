'use strict';
const path = require('path');
const fs = require('fs');
const C = require('../js/core.js');
if (process.env.TUNE) Object.assign(C.TUNE, JSON.parse(process.env.TUNE));
if (process.env.STARTUNE) Object.assign(C.STAR, JSON.parse(process.env.STARTUNE));

const DT = 1 / 20;
const OVERHEAD = 3;
const FARM_PER_LOSS = 3;
const LIMIT_H = Number(process.env.LIMIT_H) || 16;
const DIAG = Number(process.env.DIAG) || 0;
let diagDone = false;
const PLAN = { earth: [0, 1], unicorn: [0, 1], pegasus: [2, 4], bat: [0, 3], crystal: [0, 3] };
const SHARE = { earth: 0.3, unicorn: 0.3, pegasus: 0.15, bat: 0.15, crystal: 0.1 };
const BOT_RACES = (process.env.BOT_RACES || C.RACE_IDS.join(',')).split(',').filter(r => C.RACES[r]);

if (!process.env.MAP) { if (process.env.PRESTIGE) runPrestige(); else runAll(); return; }

const MAP = C.getMap(process.env.MAP);
if (process.env.MAPTUNE) Object.assign(MAP, JSON.parse(process.env.MAPTUNE));

function legacySlots() {
  const W = C.WORLD, out = [];
  const cy = MAP.routes[0][0][1];
  for (const dy of [62, 108, 154]) {
    for (let x = 40; x <= W.L - 40; x += 46) {
      out.push({ x, y: cy - dy, row: dy }, { x, y: cy + dy, row: dy });
    }
  }
  out.sort((a, b) => a.row - b.row || Math.abs(a.x - 760) - Math.abs(b.x - 760));
  return out;
}

function routeSamples() {
  const out = [];
  const nR = MAP.route.length;
  MAP.route.forEach((P, ri) => {
    const pos = { x: 0, y: 0 };
    for (let d = 15; d < P.len; d += 12) { C.routePos(P, d, pos); out.push({ x: pos.x, y: pos.y, w: 1 / nR, ri }); }
  });
  return out;
}

function coverSlots() {
  const S0 = C.newState(MAP.id);
  const samples = routeSamples();
  const cands = [];
  for (let x = 30; x <= C.WORLD.L - 30; x += 23) {
    for (let y = 30; y <= C.WORLD.W - 30; y += 23) {
      if (!C.canPlace(S0, x, y)) continue;
      const light = C.lightAt(MAP, x, y);
      const score = {};
      for (const r of C.RACE_IDS) {
        const R = C.RACES[r].range * light, R2 = R * R;
        let s = 0;
        for (const p of samples) if ((p.x - x) ** 2 + (p.y - y) ** 2 <= R2) s += p.w;
        score[r] = s;
      }
      cands.push({ x, y, score });
    }
  }
  const lists = {};
  for (const r of C.RACE_IDS) lists[r] = cands.filter(c => c.score[r] > 0).sort((a, b) => b.score[r] - a.score[r]);
  return lists;
}

const LEGACY = MAP.id === 'moonlit';
const SLOTS = LEGACY ? legacySlots() : null;
const COVER = LEGACY ? null : coverSlots();

function auraScore(S, s) {
  const R = C.computeStats({ race: 'crystal', paths: [0, 0, 0, 0, 0], infD: 0, infR: 0 }).auraR;
  let v = 0;
  for (const t of S.towers) if (t.race !== 'crystal' && (t.x - s.x) ** 2 + (t.y - s.y) ** 2 <= R * R) v += 1;
  for (const t of S.towers) if (t.race === 'crystal' && (t.x - s.x) ** 2 + (t.y - s.y) ** 2 <= R * R) v -= 0.5;
  return v;
}
function crystalSlot(S) {
  const pool = LEGACY ? SLOTS : COVER.crystal;
  let best = null, bv = -1e9, seen = 0;
  for (const s of pool) {
    if (!C.canPlace(S, s.x, s.y)) continue;
    const v = auraScore(S, s) + (LEGACY ? 0 : s.score.crystal * 0.05);
    if (v > bv) { bv = v; best = s; }
    if (++seen >= 160) break;
  }
  return best;
}
function freeSlot(S, race) {
  if (race === 'crystal') return crystalSlot(S);
  if (!LEGACY) {
    for (const s of COVER[race]) if (C.canPlace(S, s.x, s.y)) return s;
    return null;
  }
  for (const s of SLOTS) {
    if (race !== 'earth' && s.row === 62 && SLOTS.filter(q => q.row === 62 && C.canPlace(S, q.x, q.y)).length < 12) continue;
    if (C.canPlace(S, s.x, s.y)) return s;
  }
  return null;
}

const COUNTER = {
  detect: [['unicorn', 1, 3], ['crystal', 3, 4], ['bat', 1, 1]],
  pierce: [['earth', 0, 6], ['unicorn', 0, 6]],
  swarm: [['pegasus', 4, 4], ['unicorn', 3, 3], ['crystal', 4, 3]],
};
const needCache = {};
function needs(S, n) {
  const key = MAP.id + ':' + n;
  if (needCache[key]) return needCache[key];
  const out = { detect: 0, pierce: 0, swarm: 0 };
  for (let k = n; k <= Math.min(C.MAX_WAVE, n + 3); k++) {
    const sp = C.waveSpec(k, MAP), tk = (sp.boss && sp.boss.tricks) || {};
    if (sp.counts.stealth || tk.cloak || (tk.stages && tk.stages.some(st => st.cloak)) || (k >= C.WAVEGEN.elite.combo && sp.counts.elite)) out.detect = 1;
    if (sp.counts.armored || tk.plate || (tk.stages && tk.stages.some(st => st.plate))) out.pierce = 1;
    if ((sp.counts.swarm || 0) + (sp.counts.splitter || 0) * 3 >= 10) out.swarm = 1;
  }
  return (needCache[key] = out);
}
function counterBoost(S, n, t, i) {
  const nd = needs(S, n);
  let m = 1;
  for (const k in COUNTER) {
    if (!nd[k]) continue;
    for (const [race, path, lv] of COUNTER[k]) {
      if (t.race !== race || i !== path) continue;
      const have = S.towers.filter(q => q.race === race && q.paths[path] >= lv).length;
      if (have < Math.max(1, Math.floor(S.towers.length / 8))) m *= t.paths[path] < lv ? 0.25 : 0.7;
    }
  }
  return m;
}

function options(S, n) {
  const opts = [];
  const total = S.towers.length || 1;
  for (const r of BOT_RACES) {
    const have = C.owned(S, r);
    let cost = C.nextTowerCost(S, r);
    let weight = cost * (1 + Math.max(0, have / total - SHARE[r]) * 4);
    if (r === 'pegasus' && have === 0 && n >= 5) weight = 0;
    if (r === 'unicorn' && have === 0 && n >= 7) weight = 0;
    if (r === 'pegasus' && have === 0 && n < 4) weight *= 3;
    if (r === 'crystal' && total < 6) weight *= 4;
    opts.push({ cost, weight, kind: 'tower', race: r });
  }
  for (const t of S.towers) {
    for (const i of PLAN[t.race]) {
      if (t.paths[i] >= 10) continue;
      const c = C.nextNodeCost(t, i);
      if (!isFinite(c)) continue;
      opts.push({ cost: c, weight: c * 0.8 * counterBoost(S, n, t, i), kind: 'node', t, i });
    }
    const sup = t.race === 'crystal' ? 4 : 1;
    opts.push({ cost: C.infNext(t, 'dmg'), weight: C.infNext(t, 'dmg') * sup, kind: 'infD', t });
    opts.push({ cost: C.infNext(t, 'rate'), weight: C.infNext(t, 'rate') * 1.1 * sup, kind: 'infR', t });
  }
  return opts.sort((a, b) => a.weight - b.weight);
}

function shop(S, n) {
  const banned = new Set();
  for (let guard = 0; guard < 2000; guard++) {
    const opts = options(S, n).filter(o => !banned.has(o.kind + (o.race || '')));
    const o = opts[0];
    if (!o || o.cost > S.cash) {
      if (o && o.weight === 0) return;
      const any = opts.find(q => q.cost <= S.cash && q.weight <= o.weight * 1.2);
      if (!any) return;
      if (!buy(S, any)) banned.add(any.kind + (any.race || ''));
      continue;
    }
    if (!buy(S, o)) banned.add(o.kind + (o.race || ''));
  }
}
function buy(S, o) {
  if (o.kind === 'tower') { const s = freeSlot(S, o.race); return s ? !!C.placeTower(S, o.race, s.x, s.y) : false; }
  if (o.kind === 'node') return C.buyNode(S, o.t, o.i);
  if (o.kind === 'infD') return C.buyInf(S, o.t, 'dmg');
  if (o.kind === 'infR') return C.buyInf(S, o.t, 'rate');
  return false;
}

const LEAKS = {};
function play(S, n) {
  C.startWave(S, n);
  let t = 0;
  S.events.length = 0;
  const diag = DIAG === n && !diagDone;
  while (S.run && t < 600) {
    C.step(S, DT); t += DT;
    if (diag) for (const e of S.events) if (!e.at) e.at = t.toFixed(1) + 's enemies ' + (S.run ? S.run.enemies.map(q => q.type + (q.name ? '[' + q.name + ']' : '') + ':' + Math.round(100 * q.hp / q.hpMax) + '%@' + Math.round(q.d) + ' sp' + q.speed + ' sl' + q.slow.toFixed(2) + ' st' + q.stunT.toFixed(2) + ' im' + (q.stunImm||0).toFixed(2) + ' bu' + q.burrowT).join(',') : '-');
  }
  if (diag) { diagDone = true; console.log('diag wave ' + n + ': ' + S.events.map(e => e.type + (e.boss ? '(boss)' : '') + ' ' + e.at).join(' | ')); }
  const ev = S.events.find(e => e.type === 'won' || e.type === 'lost');
  if (ev && ev.type === 'lost') for (const e of S.events) if (e.type === 'leak') { const k = (e.boss ? 'boss' : e.dnb) + (e.elite ? '*' + e.elite : ''); LEAKS[k] = (LEAKS[k] || 0) + 1; }
  S.events.length = 0;
  return { won: ev && ev.type === 'won', t: t + OVERHEAD };
}

function netWorth(S) { return S.cash + S.towers.reduce((a, t) => a + t.spent, 0); }

function climb(S) {
  for (const k in LEAKS) delete LEAKS[k];
  let time = 0, attempts = 0, farms = 0, losses = 0;
  const marks = {};
  const lossAt = {};
  let worth50 = null, towers50 = null;
  const t0 = Date.now();
  while (S.cleared < C.MAX_WAVE && time < LIMIT_H * 3600) {
    const n = S.cleared + 1;
    shop(S, n);
    attempts++;
    const r = play(S, n);
    time += r.t;
    if (r.won) {
      if (S.cleared === 50) { worth50 = netWorth(S); towers50 = S.towers.length; }
      if (S.cleared % 10 === 0) {
        marks[S.cleared] = time;
        const peak = Math.max(...S.towers.map(t => t.paths.reduce((a, b) => a + b, 0)));
        console.log(`wave ${String(S.cleared).padStart(3)}  ${(time / 3600).toFixed(2)}h  cash ${C.fmt(S.cash).padStart(8)}  towers ${S.towers.length}  maxNodes ${peak}  infD ${Math.max(...S.towers.map(t => t.infD))}  losses ${losses}  farms ${farms}`);
      }
      continue;
    }
    losses++;
    lossAt[n] = (lossAt[n] || 0) + 1;
    for (let i = 0; i < FARM_PER_LOSS && S.cleared > 0; i++) { shop(S, n); time += play(S, S.cleared).t; farms++; }
  }
  const segs = [];
  for (let w = 10; w <= C.MAX_WAVE; w += 10) if (marks[w] != null) segs.push((marks[w] - (marks[w - 10] || 0)) / 3600);
  console.log('decade hours: ' + segs.map((h, i) => (i * 10 + 1) + '-' + (i * 10 + 10) + ' ' + h.toFixed(2)).join('  '));
  let jump = 0;
  for (let i = 1; i < segs.length; i++) jump = Math.max(jump, segs[i] / Math.max(0.01, segs[i - 1]));
  const worst = Math.max(0, ...Object.values(lossAt));
  console.log(`smoothness: worst decade-to-decade ratio ${jump.toFixed(2)}x, most losses on one wave ${worst}`);
  let h = 2166136261;
  for (const ch of JSON.stringify([marks, lossAt, S.cash, S.towers.map(t => [t.race, t.paths, t.infD, t.infR])])) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const fp = h.toString(16);
  console.log('fingerprint ' + fp);
  console.log('leaks on lost waves: ' + Object.entries(LEAKS).sort((x, y) => y[1] - x[1]).map(([k, v]) => k + 'x' + v).join(' '));
  console.log('losses by wave: ' + Object.entries(lossAt).map(([k, v]) => k + 'x' + v).join(' '));
  console.log(`reached wave ${S.cleared} in ${(time / 3600).toFixed(2)}h of game time (${attempts} attempts, ${losses} losses, ${farms} farm runs)`);
  console.error(`${((Date.now() - t0) / 1000).toFixed(0)}s real`);
  console.log(`wave 50 at ${marks[50] ? (marks[50] / 3600).toFixed(2) + 'h' : 'not reached'} (target ~2h), wave 100 at ${marks[100] ? (marks[100] / 3600).toFixed(2) + 'h' : 'not reached'} (target ~6h)`);
  if (worth50 != null) console.log(`net worth at wave 50: ${C.fmt(worth50)} (${worth50.toExponential(3)}) with ${towers50} towers`);
  const res = {
    map: MAP.id, name: MAP.name, hpShift: MAP.hpShift || 0, hpMul: MAP.hpMul, cashMul: MAP.cashMul, startCash: C.mapStartCash(MAP, S), star: C.starOf(S),
    races: BOT_RACES.join(','), owned: Object.fromEntries(C.RACE_IDS.map(r => [r, C.owned(S, r)])),
    reached: S.cleared, hours: +(time / 3600).toFixed(3),
    w50h: marks[50] ? +(marks[50] / 3600).toFixed(3) : null, w100h: marks[100] ? +(marks[100] / 3600).toFixed(3) : null,
    decades: segs.map(v => +v.toFixed(3)), worth50, towers50, losses, attempts, farms, worstWaveLosses: worst, fingerprint: fp,
    wave1Hp: C.hpFor(1, MAP), wave50Hp: C.hpFor(50, MAP), wave1Cash: C.killCash(1, MAP), wave50Cash: C.killCash(50, MAP),
  };
  return res;
}

const PRIORITY = {
  pony_dmg: 3, pony_rate: 2.5, pony_earth: 2, pony_unicorn: 2, pony_pegasus: 1.6, pony_bat: 1.6, pony_crystal: 1.6, pony_cheap: 1.2, pony_range: 1.4,
  eco_kill: 2, eco_start: 1.5, eco_first: 1.6, eco_boss: 1.2, eco_interest: 1.3, eco_sell: 0.6, eco_master: 1.5,
  abil_power: 1.6, abil_cd: 1.4, abil_crit: 1.3, abil_aura: 1.3, abil_stun: 1, abil_first: 1, abil_master: 1.4,
  util_lives: 1.5, util_skip: 2, util_leak: 1.2, util_moon: 1.3, util_star: 1.1, util_auto: 0.4, util_master: 1.2,
};
function buyResearch(S) {
  const bought = [];
  for (let guard = 0; guard < 200; guard++) {
    let best = null, bv = Infinity;
    for (const r of C.RESEARCH) {
      if (C.researchState(S, r.id) !== 'afford') continue;
      const v = C.researchCost(r.id, C.rl(S, r.id)) / (PRIORITY[r.id] || 1);
      if (v < bv) { bv = v; best = r.id; }
    }
    if (!best) break;
    C.buyResearch(S, best);
    bought.push(best);
  }
  return bought;
}

function prestige() {
  const S = C.newState(MAP.id);
  S.fxOn = false;
  if (process.env.RESEARCH) Object.assign(S.research, C.cleanResearch(JSON.parse(process.env.RESEARCH)));
  S.moon = Number(process.env.MOON) || 0;
  const target = Number(process.env.STARS) || (MAP.id === 'moonlit' ? C.MAX_STARS : 1);
  const runs = [];
  const t0 = Date.now();
  if (process.env.RESEARCH || Number(process.env.FROM_STAR) > 1) {
    S.cleared = C.MAX_WAVE;
    runs.push({ star: 0, skipped: true });
  } else {
    console.log('== ' + MAP.id + ' 0 stars');
    const r = climb(S);
    runs.push({ star: 0, hours: r.hours, w50h: r.w50h, w100h: r.w100h, losses: r.losses, worst: r.worstWaveLosses, reached: r.reached });
  }
  const from = Number(process.env.FROM_STAR) || 0;
  if (from > 1 && !process.env.RESEARCH) {
    runs.length = 0;
    S.cleared = C.MAX_WAVE;
    while (C.starOf(S) < from - 1) {
      const up = C.starUp(S);
      if (up.star > 0) C.grantMoon(S, 10 * (1 + C.rl(S, 'util_star')) * C.moonMul(S));
      const bought = buyResearch(S);
      runs.push({ star: up.star, skipped: true, gain: up.gain, bought });
      console.log(`== ${MAP.id} fast star up to ${up.star}: +${up.gain} Moonstones, bought ${bought.join(',') || 'nothing'}, ${S.moon} left`);
      S.cleared = C.MAX_WAVE;
    }
  }
  while (C.starOf(S) < target && S.cleared >= C.MAX_WAVE) {
    const up = C.starUp(S);
    const bought = buyResearch(S);
    console.log(`== ${MAP.id} star up to ${up.star}: +${up.gain} Moonstones, skip ${up.skip}, bought ${bought.join(',') || 'nothing'}, ${S.moon} left, lives ${C.livesFor(S)}`);
    const r = climb(S);
    runs.push({ star: up.star, hours: r.hours, w50h: r.w50h, w100h: r.w100h, losses: r.losses, worst: r.worstWaveLosses, reached: r.reached, gain: up.gain, skip: up.skip, bought, moonAfter: S.moon, moonTotal: S.moonTotal });
  }
  console.error(`${((Date.now() - t0) / 1000).toFixed(0)}s real prestige`);
  console.log('runs: ' + runs.map(r => r.star + '* ' + (r.skipped ? 'skipped' : (r.reached < 100 ? 'stuck at ' + r.reached : r.hours + 'h'))).join('  '));
  const res = { map: MAP.id, runs, research: S.research, moon: S.moon, moonTotal: S.moonTotal };
  console.log('RESULT ' + JSON.stringify(res));
}

function main() {
  if (process.env.PRESTIGE) { prestige(); return; }
  const S = C.newState(MAP.id);
  S.fxOn = false;
  console.log('RESULT ' + JSON.stringify(climb(S)));
}

function child(id, extra) {
  const { spawn } = require('child_process');
  return new Promise(done => {
    const c = spawn(process.execPath, [__filename], { env: Object.assign({}, process.env, { MAP: id }, extra) });
    let out = '';
    c.stdout.on('data', d => { out += d; });
    c.stderr.on('data', d => { out += d; });
    c.on('close', () => {
      const line = out.split('\n').find(l => l.startsWith('RESULT '));
      console.log(out.split('\n').filter(l => l && !l.startsWith('RESULT ')).join('\n'));
      done(line ? JSON.parse(line.slice(7)) : { map: id, error: true });
    });
  });
}
async function runPrestige() {
  const t0 = Date.now();
  const base = JSON.parse(fs.readFileSync(path.join(__dirname, 'balance-results.json'), 'utf8')).results;
  let first;
  if (process.env.FIRST) {
    const line = fs.readFileSync(process.env.FIRST, 'utf8').split('\n').find(l => l.startsWith('RESULT '));
    first = JSON.parse(line.slice(7));
  } else first = await child('moonlit', {});
  const others = C.MAP_IDS.filter(id => id !== 'moonlit');
  const rest = await Promise.all(others.map(id => child(id, { RESEARCH: JSON.stringify(first.research || {}), MOON: String(first.moon || 0), STARS: '1' })));
  const all = [first].concat(rest);
  console.log('\nmap        star  w50     w100    losses  worst  vs 0-star');
  for (const r of all) {
    const b = base.find(x => x.map === r.map);
    for (const run of r.runs || []) {
      if (run.skipped) continue;
      const ratio = b && run.w100h ? (run.w100h / b.w100h).toFixed(2) : '-';
      console.log(`${r.map.padEnd(10)} ${String(run.star).padEnd(5)} ${String(run.w50h).padEnd(7)} ${String(run.w100h).padEnd(7)} ${String(run.losses).padEnd(7)} ${String(run.worst).padEnd(6)} ${ratio}`);
    }
  }
  const file = path.join(__dirname, 'prestige-results.json');
  fs.writeFileSync(file, JSON.stringify({ generated: new Date().toISOString().slice(0, 10), dt: DT, star: C.STAR, baseline: base.map(b => ({ map: b.map, w50h: b.w50h, w100h: b.w100h })), results: all }, null, 2) + '\n');
  console.log('wrote ' + path.relative(process.cwd(), file));
  console.error(`${((Date.now() - t0) / 1000).toFixed(0)}s real total`);
}

function runAll() {
  const { spawn } = require('child_process');
  const ids = (process.env.MAPS || C.MAP_IDS.join(',')).split(',');
  const par = Number(process.env.PAR) || 3;
  const results = {};
  let next = 0, live = 0;
  const t0 = Date.now();
  const launch = () => {
    while (live < par && next < ids.length) {
      const id = ids[next++];
      live++;
      const child = spawn(process.execPath, [__filename], { env: Object.assign({}, process.env, { MAP: id }) });
      let out = '';
      child.stdout.on('data', d => { out += d; });
      child.on('close', () => {
        live--;
        const line = out.split('\n').find(l => l.startsWith('RESULT '));
        results[id] = line ? JSON.parse(line.slice(7)) : { map: id, error: true };
        console.log(`== ${id}\n` + out.split('\n').filter(l => l && !l.startsWith('RESULT ')).join('\n'));
        if (live === 0 && next >= ids.length) finish();
        else launch();
      });
    }
  };
  const finish = () => {
    const rows = C.MAP_IDS.filter(id => results[id]).map(id => results[id]);
    console.log('\nmap        w50     w100    reached  hpMul      cashMul    startCash  worth50');
    for (const r of rows) console.log(`${r.map.padEnd(10)} ${String(r.w50h).padEnd(7)} ${String(r.w100h).padEnd(7)} ${String(r.reached).padEnd(8)} ${Number(r.hpMul).toExponential(2).padEnd(10)} ${Number(r.cashMul).toExponential(2).padEnd(10)} ${Number(r.startCash).toExponential(2).padEnd(10)} ${r.worth50 != null ? r.worth50.toExponential(2) : '-'}`);
    for (let i = 1; i < rows.length; i++) {
      const a = rows[i - 1], b = rows[i];
      if (a.wave50Hp && b.wave1Hp) console.log(`${b.map} wave 1 vs ${a.map} wave 50: hp x${(b.wave1Hp / a.wave50Hp).toFixed(2)}, kill cash x${(b.wave1Cash / a.wave50Cash).toFixed(2)}, start cash vs worth50 x${a.worth50 ? (b.startCash / a.worth50).toFixed(2) : '-'}`);
    }
    if (!process.env.MAPS) {
      const file = path.join(__dirname, 'balance-results.json');
      fs.writeFileSync(file, JSON.stringify({ generated: new Date().toISOString().slice(0, 10), dt: DT, results: rows }, null, 2) + '\n');
      console.log('wrote ' + path.relative(process.cwd(), file));
    }
    console.error(`${((Date.now() - t0) / 1000).toFixed(0)}s real total`);
  };
  launch();
}

main();
