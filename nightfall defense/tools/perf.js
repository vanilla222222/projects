'use strict';
const path = require('path');
const C = require(path.resolve(process.argv[2] || path.join(__dirname, '../js/core.js')));

const N = Number(process.env.N) || 300;
const SPEED = Number(process.env.SPEED) || 4;
const FRAMES = Number(process.env.FRAMES) || 600;
const DT = 1 / 60;
const MAP = process.env.MAP || 'moonlit';

function setup() {
  const S = C.newState(MAP);
  S.cash = 1e15;
  const W = C.WORLD, races = C.RACE_IDS;
  let k = 0;
  for (let x = 40; x < W.L - 40 && S.towers.length < 24; x += 37) for (let y = 30; y < W.W - 30 && S.towers.length < 24; y += 41) {
    if (C.canPlace(S, x, y) && C.placeTower(S, races[k % races.length], x, y)) k++;
  }
  S.cleared = 60; S.sel = 60;
  C.startWave(S, 60);
  const run = S.run;
  run.hpMul = 1e6;
  run.lives = run.livesMax = 1e9;
  run.queue.length = 0;
  const types = ['basic', 'fast', 'tanky', 'flying', 'magical', 'swarm', 'armored', 'shield'].filter(t => C.ENEMIES[t]);
  for (let i = 0; i < N; i++) run.queue.push({ t: i * 0.02, type: types[i % types.length] });
  return S;
}

function measure() {
  const S = setup();
  const slow = () => { for (const e of S.run.enemies) if (!e.perfSlow) { e.perfSlow = 1; e.speed *= 0.12; } };
  for (let i = 0; i < 7 / DT; i++) { C.step(S, DT); slow(); }
  const alive0 = S.run.enemies.length;
  const times = [];
  let maxAlive = 0, minAlive = Infinity;
  for (let f = 0; f < FRAMES; f++) {
    const t0 = process.hrtime.bigint();
    for (let s = 0; s < SPEED; s++) { C.step(S, DT); if (S.run) slow(); }
    times.push(Number(process.hrtime.bigint() - t0) / 1e6);
    if (S.fx.length > 400) S.fx.length = 400;
    const a = S.run ? S.run.enemies.length : 0;
    maxAlive = Math.max(maxAlive, a); minAlive = Math.min(minAlive, a);
    if (!S.run) break;
  }
  times.sort((a, b) => a - b);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  return { towers: S.towers.length, alive0, minAlive, maxAlive, frames: times.length, avg, p50: times[times.length >> 1], p95: times[Math.floor(times.length * 0.95)], max: times[times.length - 1], pool: C.POOL ? { made: C.POOL.made, reused: C.POOL.reused, pMade: C.POOL.pMade, pReused: C.POOL.pReused, fMade: C.POOL.fMade, fReused: C.POOL.fReused } : null };
}

measure();
const r = measure();
const f = v => v.toFixed(3);
console.log('sim ' + MAP + ' ' + N + ' enemies at ' + SPEED + 'x, ' + r.towers + ' towers, alive ' + r.minAlive + '-' + r.maxAlive);
console.log('ms per frame: avg ' + f(r.avg) + ' p50 ' + f(r.p50) + ' p95 ' + f(r.p95) + ' max ' + f(r.max) + ' (budget 16.7)');
if (r.pool) console.log('pool: enemies made ' + r.pool.made + ' reused ' + r.pool.reused + ', projectiles made ' + r.pool.pMade + ' reused ' + r.pool.pReused + ', particles made ' + r.pool.fMade + ' reused ' + r.pool.fReused);
