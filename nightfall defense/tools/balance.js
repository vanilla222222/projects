'use strict';
const C = require('../js/core.js');
if (process.env.TUNE) Object.assign(C.TUNE, JSON.parse(process.env.TUNE));

const DT = 1 / 20;
const OVERHEAD = 3;
const FARM_PER_LOSS = 3;
const LIMIT_H = Number(process.env.LIMIT_H) || 16;
const DIAG = Number(process.env.DIAG) || 0;
let diagDone = false;
const PLAN = { earth: [0, 1], unicorn: [0, 1], pegasus: [2, 4] };
const SHARE = { earth: 0.4, unicorn: 0.35, pegasus: 0.25 };

const MAP = C.getMap(process.env.MAP || 'moonlit');

function makeSlots() {
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
const SLOTS = makeSlots();

function freeSlot(S, race) {
  for (const s of SLOTS) {
    if (race !== 'earth' && s.row === 62 && SLOTS.filter(q => q.row === 62 && C.canPlace(S, q.x, q.y)).length < 12) continue;
    if (C.canPlace(S, s.x, s.y)) return s;
  }
  return null;
}

function options(S, n) {
  const opts = [];
  const total = S.towers.length || 1;
  for (const r of C.RACE_IDS) {
    const have = C.owned(S, r);
    let cost = C.nextTowerCost(S, r);
    let weight = cost * (1 + Math.max(0, have / total - SHARE[r]) * 4);
    if (r === 'pegasus' && have === 0 && n >= 5) weight = 0;
    if (r === 'unicorn' && have === 0 && n >= 7) weight = 0;
    if (r === 'pegasus' && have === 0 && n < 4) weight *= 3;
    opts.push({ cost, weight, kind: 'tower', race: r });
  }
  for (const t of S.towers) {
    for (const i of PLAN[t.race]) {
      if (t.paths[i] >= 10) continue;
      const c = C.nextNodeCost(t, i);
      opts.push({ cost: c, weight: c * 0.8, kind: 'node', t, i });
    }
    opts.push({ cost: C.infNext(t, 'dmg'), weight: C.infNext(t, 'dmg'), kind: 'infD', t });
    opts.push({ cost: C.infNext(t, 'rate'), weight: C.infNext(t, 'rate') * 1.1, kind: 'infR', t });
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
  S.events.length = 0;
  return { won: ev && ev.type === 'won', t: t + OVERHEAD };
}

function main() {
  const S = C.newState();
  S.map = MAP.id;
  S.fxOn = false;
  let time = 0, attempts = 0, farms = 0, losses = 0;
  const marks = {};
  const lossAt = {};
  const t0 = Date.now();
  while (S.cleared < C.MAX_WAVE && time < LIMIT_H * 3600) {
    const n = S.cleared + 1;
    shop(S, n);
    attempts++;
    const r = play(S, n);
    time += r.t;
    if (r.won) {
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
  console.log('fingerprint ' + h.toString(16));
  console.log('losses by wave: ' + Object.entries(lossAt).map(([k, v]) => k + 'x' + v).join(' '));
  console.log(`reached wave ${S.cleared} in ${(time / 3600).toFixed(2)}h of game time (${attempts} attempts, ${losses} losses, ${farms} farm runs)`);
  console.error(`${((Date.now() - t0) / 1000).toFixed(0)}s real`);
  console.log(`wave 50 at ${marks[50] ? (marks[50] / 3600).toFixed(2) + 'h' : 'not reached'} (target ~2h), wave 100 at ${marks[100] ? (marks[100] / 3600).toFixed(2) + 'h' : 'not reached'} (target ~6h)`);
}

main();
