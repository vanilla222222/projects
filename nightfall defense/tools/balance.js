'use strict';
const C = require('../js/core.js');
if (process.env.TUNE) Object.assign(C.TUNE, JSON.parse(process.env.TUNE));

const DT = 1 / 20;
const OVERHEAD = 3;
const FARM_PER_LOSS = 3;
const LIMIT_H = 16;
const PLAN = { earth: [0, 1], unicorn: [0, 1], pegasus: [2, 4] };
const SHARE = { earth: 0.4, unicorn: 0.35, pegasus: 0.25 };

function makeSlots() {
  const W = C.WORLD, out = [];
  for (const dy of [62, 108, 154]) {
    for (let x = 40; x <= W.L - 40; x += 46) {
      out.push({ x, y: W.cy - dy, row: dy }, { x, y: W.cy + dy, row: dy });
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
  while (S.run && t < 600) { C.step(S, DT); t += DT; }
  const ev = S.events.find(e => e.type === 'won' || e.type === 'lost');
  S.events.length = 0;
  return { won: ev && ev.type === 'won', t: t + OVERHEAD };
}

function main() {
  const S = C.newState();
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
  console.log('losses by wave: ' + Object.entries(lossAt).map(([k, v]) => k + 'x' + v).join(' '));
  console.log(`reached wave ${S.cleared} in ${(time / 3600).toFixed(2)}h of game time (${attempts} attempts, ${losses} losses, ${farms} farm runs, ${((Date.now() - t0) / 1000).toFixed(0)}s real)`);
  console.log(`wave 50 at ${marks[50] ? (marks[50] / 3600).toFixed(2) + 'h' : 'not reached'} (target ~2h), wave 100 at ${marks[100] ? (marks[100] / 3600).toFixed(2) + 'h' : 'not reached'} (target ~6h)`);
}

main();
