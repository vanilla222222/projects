'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOM_TEMPLATES_DIR = path.join(__dirname, '..', 'js', 'data', 'roomTemplates');

const LOAD_ORDER = [
  'core.js', 'normal-1.js', 'normal-2.js', 'normal-3.js', 'normal-4.js',
  'firecolors.js', 'dnbfly-rooms.js', 'floorfeature.js', 'miniboss.js',
  'stage4-6-floorfeature.js', 'stage7-9-floorfeature.js', 'stage10-13-floorfeature.js',
];

const BLOCK = 10;

const SPECIAL_ROOM_TYPES = new Set([
  'boss', 'treasure', 'shop', 'secret', 'petshop', 'curse', 'sacrifice', 'vault', 'challenge', 'crystal', 'sombra', 'star',
  'cpathgate', 'planetarium', 'shrine', 'arcade', 'floorfeature', 'miniboss',
]);

const STRONG_EXACT_KINDS = new Set(['tintedrock', 'crushvent', 'lurehorn', 'dustvent', 'spikedrock']);
function isStrongKind(kind) {
  return typeof kind === 'string' && (kind.startsWith('turret') || STRONG_EXACT_KINDS.has(kind));
}
function isTurretKind(kind) {
  return typeof kind === 'string' && kind.startsWith('turret');
}

function loadRoomTemplates() {
  const sandbox = {};
  vm.createContext(sandbox);
  const origin = {};

  function snapshotLengths() {
    const RT = sandbox.ROOM_TEMPLATES;
    if (!RT) return {};
    const lens = {};
    for (const k of Object.keys(RT)) lens[k] = Array.isArray(RT[k]) ? RT[k].length : 1;
    return lens;
  }

  for (const file of LOAD_ORDER) {
    const before = snapshotLengths();
    const filePath = path.join(ROOM_TEMPLATES_DIR, file);
    const code = fs.readFileSync(filePath, 'utf8');
    vm.runInContext(code, sandbox, { filename: file });

    vm.runInContext('this.ROOM_TEMPLATES = ROOM_TEMPLATES;', sandbox, { filename: file + ':export' });
    const after = snapshotLengths();
    for (const k of Object.keys(after)) {
      const b = before[k] || 0, a = after[k];
      if (a > b) (origin[k] = origin[k] || []).push({ from: b, to: a, file });
    }
  }

  function fileForIndex(key, idx) {
    for (const r of (origin[key] || [])) if (idx >= r.from && idx < r.to) return r.file;
    return '(unknown file)';
  }

  return { ROOM_TEMPLATES: sandbox.ROOM_TEMPLATES, fileForIndex };
}

function expandObstacleSpawner(raw, badLines) {
  if (raw[2] !== 'o') return [];
  if (raw.length !== 6) return [{ x: raw[0], y: raw[1], kind: raw[3] }];
  const [x1, y1, , kind, x2, y2] = raw;
  if (x1 !== x2 && y1 !== y2) {
    badLines.push(raw);
    return [{ x: x1, y: y1, kind }];
  }
  const pts = [];
  if (x1 === x2) {
    const lo = Math.min(y1, y2), hi = Math.max(y1, y2);
    for (let y = lo; y <= hi; y++) pts.push({ x: x1, y, kind });
  } else {
    const lo = Math.min(x1, x2), hi = Math.max(x1, x2);
    for (let x = lo; x <= hi; x++) pts.push({ x, y: y1, kind });
  }
  return pts;
}

function isDoorDisabledLocal(d, col, row, dir) {
  if (!d) return false;
  if (typeof d === 'string') return d.includes(dir);
  for (const entry of d) {
    if (entry[0] === col && entry[1] === row && entry[2].includes(dir)) return true;
  }
  return false;
}

function doorFrontZone(bx, by, dir) {
  const ox = bx * BLOCK, oy = by * BLOCK;
  if (dir === 'N') return { xs: [ox + 5, ox + 6], ys: [oy + 1, oy + 2] };
  if (dir === 'S') return { xs: [ox + 5, ox + 6], ys: [oy + 9, oy + 10] };
  if (dir === 'W') return { xs: [ox + 1, ox + 2], ys: [oy + 5, oy + 6] };
   return { xs: [ox + 9, ox + 10], ys: [oy + 5, oy + 6] };
}
function inZone(pt, zone) { return zone.xs.includes(pt.x) && zone.ys.includes(pt.y); }

const DIRS = ['N', 'E', 'S', 'W'];

const DIR_STEP = { N: [0, -1], S: [0, 1], W: [-1, 0], E: [1, 0] };

function collectDoorZones(tmpl) {
  const mask = tmpl.m || [[1]];
  const zones = [];
  for (let by = 0; by < mask.length; by++) {
    for (let bx = 0; bx < mask[by].length; bx++) {
      if (!mask[by][bx]) continue;
      for (const dir of DIRS) {
        if (isDoorDisabledLocal(tmpl.d, bx, by, dir)) continue;
        const [dx, dy] = DIR_STEP[dir];
        const nx = bx + dx, ny = by + dy;
        const neighborOccupied = ny >= 0 && ny < mask.length && nx >= 0 && nx < mask[ny].length && mask[ny][nx];
        if (neighborOccupied) continue;
        zones.push({ dir, bx, by, zone: doorFrontZone(bx, by, dir) });
      }
    }
  }
  return zones;
}

function roomCenterZone(tmpl) {
  const mask = tmpl.m || [[1]];
  const blockH = mask.length, blockW = mask[0].length;
  const width = blockW * BLOCK, height = blockH * BLOCK;
  const cx0 = width / 2, cy0 = height / 2;
  return { xs: [cx0, cx0 + 1], ys: [cy0, cy0 + 1] };
}

function lintTemplate(key, tmpl, fileName, idx) {
  const violations = [];
  const badLines = [];
  const obstaclePts = [];
  for (const raw of (tmpl.s || [])) {
    if (raw[2] !== 'o') continue;
    obstaclePts.push(...expandObstacleSpawner(raw, badLines));
  }
  for (const raw of badLines) {
    violations.push({ type: 'malformed-line-spawner', detail: `non-axis-aligned line spawner ${JSON.stringify(raw)}` });
  }

  const doorZones = collectDoorZones(tmpl);
  for (const pt of obstaclePts) {
    for (const dz of doorZones) {
      if (inZone(pt, dz.zone)) {
        violations.push({ type: 'door-adjacency', detail: `kind=${pt.kind} at (${pt.x},${pt.y}) blocks ${dz.dir} door of block (${dz.bx},${dz.by})` });
      }
    }
  }

  if (SPECIAL_ROOM_TYPES.has(key)) {
    const cz = roomCenterZone(tmpl);
    for (const pt of obstaclePts) {
      if (inZone(pt, cz)) {
        violations.push({ type: 'special-room-center', detail: `kind=${pt.kind} at (${pt.x},${pt.y}) sits in room center zone` });
      }
    }
  }

  const strongPts = obstaclePts.filter(p => isStrongKind(p.kind));
  const strongByBlock = new Map();
  for (const p of strongPts) {
    const bx = Math.floor((p.x - 1) / BLOCK), by = Math.floor((p.y - 1) / BLOCK);
    const key = bx + ',' + by;
    if (!strongByBlock.has(key)) strongByBlock.set(key, []);
    strongByBlock.get(key).push(p);
  }
  for (const [key, pts] of strongByBlock) {
    if (pts.length <= 1) continue;
    const list = pts.map(p => `${p.kind}@(${p.x},${p.y})`).join(', ');
    violations.push({ type: 'strong-obstacle-cap', detail: `block (${key}): ${pts.length} strong obstacles (limit 1 per block): ${list}` });
  }

  const pickupPts = (tmpl.s || []).filter(raw => raw[2] === 'p').map(raw => ({ x: raw[0], y: raw[1] }));
  const turretPts = obstaclePts.filter(p => isTurretKind(p.kind));
  for (const t of turretPts) {
    const nearDoor = doorZones.some(dz => inZone(t, dz.zone));
    if (nearDoor) {
      violations.push({ type: 'turret-safety', detail: `${t.kind} at (${t.x},${t.y}) sits in a door-adjacency zone` });
      continue;
    }
    for (const p of pickupPts) {
      const dist = Math.max(Math.abs(t.x - p.x), Math.abs(t.y - p.y));
      if (dist <= 2) {
        violations.push({ type: 'turret-safety', detail: `${t.kind} at (${t.x},${t.y}) is within 2 tiles of pickup spawner at (${p.x},${p.y})` });
        break;
      }
    }
  }

  return violations;
}

function main() {
  const { ROOM_TEMPLATES, fileForIndex } = loadRoomTemplates();
  const byFile = new Map();

  for (const key of Object.keys(ROOM_TEMPLATES)) {
    const arr = Array.isArray(ROOM_TEMPLATES[key]) ? ROOM_TEMPLATES[key] : [ROOM_TEMPLATES[key]];
    arr.forEach((tmpl, idx) => {
      if (!tmpl) return;
      const violations = lintTemplate(key, tmpl, null, idx);
      if (violations.length === 0) return;
      const file = fileForIndex(key, idx);
      if (!byFile.has(file)) byFile.set(file, []);
      byFile.get(file).push({ key, idx, violations });
    });
  }

  let totalViolations = 0;
  const files = Array.from(byFile.keys()).sort();
  if (files.length === 0) {
    console.log('lint-room-templates: no violations found.');
  } else {
    for (const file of files) {
      console.log(`\n=== ${file} ===`);
      for (const entry of byFile.get(file)) {
        for (const v of entry.violations) {
          totalViolations++;
          console.log(`  [${entry.key}][${entry.idx}] ${v.type}: ${v.detail}`);
        }
      }
    }
    console.log(`\nlint-room-templates: ${totalViolations} violation(s) across ${files.length} file(s).`);
  }
  process.exit(0);
}

main();
