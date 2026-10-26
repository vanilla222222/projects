'use strict';
// Depicts every stored and overlay reference the way the inspector does, so a
// depiction that throws or renders nothing becomes a counted failure instead of
// the structure viewer's silent "Depiction unavailable" fallback. Full coverage
// costs several CPU-minutes, so the work is sharded over worker threads; the
// shard assignment is a fixed stride, which keeps the audit deterministic.
const assert = require('node:assert/strict');
const os = require('node:os');
const { Worker, isMainThread, workerData, parentPort } = require('node:worker_threads');

function references() {
  globalThis.CURATED_REFERENCES = require('../data/curated-references.js').CURATED_REFERENCES;
  const curated = require('../js/curated-references.js');
  const { LIBRARY } = require('../data/library.js');
  return { entries: curated.library(LIBRARY), stored: LIBRARY.length };
}

function audit(entries, shard, shards) {
  for (const file of ['smiles', 'mol', 'stereo', 'depict']) Object.assign(global, require('../js/' + file + '.js'));
  const failures = [];
  let marks = 0;
  let audited = 0;
  for (let index = shard; index < entries.length; index += shards) {
    const entry = entries[index];
    audited += 1;
    let svg;
    try {
      svg = depictSvg(buildMolecule(parseSmiles(entry.smiles)), { scale: 32, pad: 28, title: entry.name + ' — stored structure' });
    } catch (error) {
      failures.push({ index, reason: entry.name + ': depiction threw ' + String(error && error.message || error) });
      continue;
    }
    if (typeof svg !== 'string' || svg.indexOf('<svg') !== 0) {
      failures.push({ index, reason: entry.name + ': depiction is not an SVG document' });
      continue;
    }
    const box = /^<svg[^>]* viewBox="0 0 ([0-9.]+) ([0-9.]+)"/.exec(svg);
    if (!box || !(Number(box[1]) > 0) || !(Number(box[2]) > 0)) {
      failures.push({ index, reason: entry.name + ': depiction has no positive viewBox' });
      continue;
    }
    let drawn = 0;
    for (const mark of ['class="bond', 'class="wedge', 'class="atom']) {
      let at = svg.indexOf(mark);
      while (at !== -1) { drawn += 1; at = svg.indexOf(mark, at + mark.length); }
    }
    if (drawn === 0) {
      failures.push({ index, reason: entry.name + ': depiction drew no bonds or atom labels' });
      continue;
    }
    marks += drawn;
  }
  return { failures, marks, audited };
}

if (!isMainThread) {
  const { entries } = references();
  parentPort.postMessage(audit(entries, workerData.shard, workerData.shards));
} else {
  const { entries, stored } = references();
  assert.ok(entries.length >= stored, 'Overlay must cover at least the stored library');
  const shards = Math.max(1, Math.min(4, (os.availableParallelism ? os.availableParallelism() : os.cpus().length)));
  const results = new Array(shards);
  let pending = shards;
  for (let shard = 0; shard < shards; shard += 1) {
    const worker = new Worker(__filename, { workerData: { shard, shards } });
    worker.on('message', (result) => { results[shard] = result; });
    worker.on('error', (error) => { throw error; });
    worker.on('exit', (code) => {
      assert.equal(code, 0, 'Depiction shard ' + shard + ' exited with ' + code);
      pending -= 1;
      if (pending === 0) report();
    });
  }
  function report() {
    const failures = [];
    let marks = 0;
    let audited = 0;
    for (const result of results) {
      assert.ok(result, 'Every depiction shard must report');
      failures.push(...result.failures);
      marks += result.marks;
      audited += result.audited;
    }
    assert.equal(audited, entries.length, 'Shards must audit every reference exactly once');
    failures.sort((a, b) => a.index - b.index);
    assert.equal(failures.length, 0, failures.length + ' of ' + entries.length
      + ' reference depictions failed:\n' + failures.slice(0, 20).map((f) => f.reason).join('\n'));
    console.log('Library depiction audit: ' + entries.length + ' stored and overlay references depicted across '
      + shards + ' shards, ' + marks + ' bond and atom marks drawn, 0 fallback renders');
  }
}
