'use strict';
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const C = require('../js/core.js');

const SETS = (process.env.SET || 'base,perm,daily').split(',');
const PAR = Number(process.env.PAR) || 4;
const DAYS = Number(process.env.DAYS) || 30;
const DAY0 = Number(process.env.DAY0) || C.dayIndex(Date.now());
const PAIR_AT = (process.env.PAIR_AT || 'castle:11').split(',').map(s => { const [map, from] = s.split(':'); return { map, from: Number(from) || 1 }; });

const jobs = [];
for (const set of SETS) {
  if (set === 'base') for (const map of C.MAP_IDS) for (const from of C.DAILY_BANDS[map]) jobs.push({ set, label: `${map} ${from}-${from + 19} none`, def: { id: 'base', kind: 'perm', map, from, to: from + 19, mods: [] } });
  if (set === 'perm') for (const c of C.CHALLENGES) jobs.push({ set, label: `${c.id} (${c.diff})`, def: c });
  if (set === 'daily') for (let d = 0; d < DAYS; d++) { const def = C.dailyDef(DAY0 + d); jobs.push({ set, label: `${C.dayLabel(def.day)} ${def.map} ${def.from} ${def.mods.join('+')}${def.cap ? ' cap' + def.cap : ''}`, def }); }
  if (set === 'pairs') {
    for (const at of PAIR_AT) for (let i = 0; i < C.DAILY_MODS.length; i++) for (let j = i + 1; j < C.DAILY_MODS.length; j++) {
      const a = C.DAILY_MODS[i], b = C.DAILY_MODS[j];
      if (C.chalClash(a, b)) continue;
      const mods = [a, b];
      const def = { id: 'pair', kind: 'perm', map: at.map, from: at.from, to: at.from + 19, mods, cap: mods.indexOf('limit') >= 0 ? 8 : 0 };
      def.lives = mods.indexOf('onelife') >= 0 ? 1 : mods.indexOf('glass') >= 0 ? 10 : 20;
      jobs.push({ set, label: `${at.map} ${at.from} ${mods.join('+')}`, def });
    }
  }
}

function run(job) {
  return new Promise(done => {
    const env = Object.assign({}, process.env, { CHAL: JSON.stringify(job.def), MAP: job.def.map });
    delete env.SET;
    const c = spawn(process.execPath, [path.join(__dirname, 'balance.js')], { env });
    let out = '';
    c.stdout.on('data', d => { out += d; });
    c.on('close', () => {
      const line = out.split('\n').find(l => l.startsWith('RESULT '));
      done(line ? JSON.parse(line.slice(7)) : { error: true });
    });
  });
}

async function main() {
  const t0 = Date.now();
  const results = new Array(jobs.length);
  let next = 0;
  async function worker() {
    while (next < jobs.length) {
      const k = next++;
      const r = await run(jobs[k]);
      results[k] = Object.assign({ set: jobs[k].set, label: jobs[k].label }, r);
      const x = results[k];
      console.log(`${x.set.padEnd(6)} ${x.label.padEnd(52)} ${x.error ? 'ERROR' : (x.won ? 'WIN ' : 'LOSS') + ' waves ' + x.waves + '/' + x.total + ' lives ' + x.lives + '/' + x.livesMax + ' try ' + x.attempts + ' score ' + x.score}`);
    }
  }
  await Promise.all(Array.from({ length: PAR }, worker));
  const bySet = {};
  for (const r of results) { const b = bySet[r.set] || (bySet[r.set] = { n: 0, won: 0, first: 0 }); b.n++; if (r.won) { b.won++; if (r.attempts === 1) b.first++; } }
  console.log('\nset     runs  won  first-try');
  for (const k in bySet) console.log(`${k.padEnd(7)} ${String(bySet[k].n).padEnd(5)} ${String(bySet[k].won).padEnd(4)} ${bySet[k].first}`);
  const lost = results.filter(r => !r.won);
  if (lost.length) console.log('\nnot won: ' + lost.map(r => r.label).join(' | '));
  if (process.env.WRITE) {
    const file = path.join(__dirname, 'challenge-results.json');
    fs.writeFileSync(file, JSON.stringify({ generated: new Date().toISOString().slice(0, 10), day0: DAY0, eco: C.CHAL_ECO, summary: bySet, results }, null, 2) + '\n');
    console.log('wrote ' + path.relative(process.cwd(), file));
  }
  console.error(`${((Date.now() - t0) / 1000).toFixed(0)}s real`);
}
main();
