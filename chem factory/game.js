'use strict';
(() => {
const DT = 1 / 30, TP = 8;
let W = 160, H = 160, PW = 20;
const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
const KEY = 'chemfactory-save-v1';
const GAP = 0.25, BELT_V = 2 * DT, MINER_T = 2, PUMP_RATE = 60 * DT;
const PARTS = ['casting', 'plate', 'wire', 'motor', 'brick', 'lead_sheet', 'brass', 'cartridge', 'cylinder'];
const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
const tcv = document.createElement('canvas');
const tctx = tcv.getContext('2d');
const pcv = document.createElement('canvas');
const pctx = pcv.getContext('2d');
let pimg = null;
const $ = s => document.querySelector(s);
const panel = $('#panel'), tip = $('#tip'), modal = $('#modal'), hotbar = $('#hotbar');

let S, terrain, oreType, oreAmt, elev, occ, ents, patches, L = null;
let cam = { x: W / 2, y: H / 2, z: 32 };
let tool = null, toolDir = 1, sel = null, mining = null, drag = null;
const mouse = { x: 0, y: 0, tx: -1, ty: -1, fx: 0, fy: 0, l: false, r: false, m: false, in: false };
const keys = {};
let modalTab = null, modalKind = null, overlay = 0;

const nm = k => (ITEMS[k] || FLUIDS[k] || BUILD[k] || { n: k }).n;
const col = k => (ITEMS[k] || FLUIDS[k] || BUILD[k] || { c: '#888' }).c;
const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'k' : String(Math.floor(n));
const chip = (k, n, cls) => `<span class="chip ${cls || ''}"><i style="background:${col(k)}"></i>${n != null ? '<b>' + n + '</b> ' : ''}${nm(k)}</span>`;
const sum = o => { let s = 0; for (const k in o) s += o[k]; return s; };
const isGas = f => FLUIDS[f] && FLUIDS[f].gas && f !== 'steam';
const spills = (r, f) => isGas(f) || !!(r.bleed && r.bleed.includes(f));
const PC = 8, RAIN = 30;
const POL_W = { so2: 1, cl2: 3, co2: 0.02, h2: 0, steam: 0, water: 0, acid: 0.5, naoh: 0.3, liquor: 0.3, ticl4: 1, brine: 0.05, nh3: 0.5, hno3: 0.8, tar: 0.4, coalgas: 0.3, toluene: 0.3, nh4cl: 0.1, co: 0.1, phosgene: 1, sif4: 2, h2sif6: 0.5, hf: 1, h2s: 2, diesel: 0.3, bfw: 0, o2: 0, n2: 0, sihcl3: 1, vam: 0.4, dmc: 0.2, dpc: 0.4, ech: 1, propylene: 0.2, cumene: 0.4, phenol: 1, acetone: 0.3, acetic: 0.4, ac2o: 0.6, cyclohexane: 0.3, ka_oil: 0.3, n2o: 4, hmda: 0.5, olefins: 0.2, lab: 0.3, las: 0.8, methanol: 0.3, hcho: 1, ch3cl: 0.5, dmdcs: 1, bittern: 0.05, br2: 2, butadiene: 0.3, benzene: 0.5, styrene: 0.3 };
const polAt = (x, y) => S.pol[Math.floor(y / PC) * PW + Math.floor(x / PC)] || 0;

function mulberry32(a) {
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hash(x, y, s) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, s) {
  let t = 0, amp = 0.5, f = 1;
  for (let i = 0; i < 4; i++) { t += vnoise(x * f, y * f, s + i * 17) * amp; amp *= 0.5; f *= 2; }
  return t / 0.9375;
}

function patch(t, px, py, r, rich, seed, force) {
  let n0 = 0;
  for (let y = Math.floor(py - r * 1.4); y <= py + r * 1.4; y++) for (let x = Math.floor(px - r * 1.4); x <= px + r * 1.4; x++) {
    if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue;
    const d = Math.hypot(x - px, y - py), n = vnoise(x / 2.5, y / 2.5, seed + t * 131);
    if (d > r * (0.65 + 0.6 * n)) continue;
    const i = y * W + x;
    if (terrain[i] === 1 || terrain[i] === 4) { if (!force) continue; terrain[i] = 0; }
    oreType[i] = t;
    oreAmt[i] = Math.max(60, Math.round(rich * (1.15 - d / (r * 1.5)) * (0.7 + 0.6 * n)) + 60);
    n0++;
  }
  if (n0) patches.push({ t, x: Math.round(px), y: Math.round(py) });
}

function genLegacy(seed) {
  terrain = new Uint8Array(W * H); oreType = new Uint8Array(W * H); oreAmt = new Int32Array(W * H); patches = []; elev = null;
  const cx = W / 2, cy = H / 2;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, d = Math.hypot(x - cx, y - cy), n = fbm(x / 24, y / 24, seed);
    terrain[i] = n < 0.36 && d > 14 ? 1 : n > 0.6 ? 2 : 0;
  }
  const rng = mulberry32(seed);
  const base = rng() * Math.PI * 2, slot = Math.PI * 2 / 7;
  const lx = cx + Math.cos(base) * 11, ly = cy + Math.sin(base) * 11;
  for (let y = Math.floor(ly - 5); y <= ly + 5; y++) for (let x = Math.floor(lx - 5); x <= lx + 5; x++) {
    const dx = (x - lx) / 4.2, dy = (y - ly) / 3.4;
    if (dx * dx + dy * dy <= 1 + (hash(x, y, seed) - 0.5) * 0.4) terrain[y * W + x] = 1;
  }
  const near = [[4, 11, 4, 900], [1, 15, 5, 1500], [5, 15, 4, 1000], [2, 18, 5, 1300], [6, 20, 4, 1000], [3, 26, 5, 1200]];
  near.forEach(([t, dist, r, rich], k) => {
    const a = base + (k + 1) * slot + (rng() - 0.5) * 0.3;
    patch(t, cx + Math.cos(a) * dist, cy + Math.sin(a) * dist, r, rich, seed, true);
  });
  const weights = [0, 0.24, 0.2, 0.14, 0.18, 0.12, 0.12];
  for (let k = 0; k < 48; k++) {
    let x, y, tries = 0;
    do { x = 6 + rng() * (W - 12); y = 6 + rng() * (H - 12); tries++; } while (Math.hypot(x - cx, y - cy) < 34 && tries < 50);
    let r = rng(), t = 1;
    for (; t < 6; t++) { r -= weights[t]; if (r < 0) break; }
    const dist = Math.hypot(x - cx, y - cy);
    patch(t, x, y, 3 + rng() * 4, (1200 + rng() * 2000) * (0.8 + dist / 80), seed, false);
  }
  const r2 = mulberry32(seed + 99);
  for (let t = 7; t < ORES.length; t++) for (let k = 0; k < 3; k++) {
    const a = r2() * Math.PI * 2, dist = 36 + r2() * 30;
    patch(t, cx + Math.cos(a) * dist, cy + Math.sin(a) * dist, 3 + r2() * 3, 1500 + r2() * 1500, seed, false);
  }
}

const GEN_DEF = { size: 256, water: 1, ore: 1, hives: 2 };
const TER_N = ['Grassland', 'Water', 'Dry scrub', 'Desert sand', 'Bare rock', 'Marsh', 'Forest', 'Tundra'];
const sstep = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const ORE_BASE = [0, 11, 10, 7, 9, 6, 6, 3, 3, 3, 3, 3, 3, 3];
function oreSuit(t, i, temp, moist) {
  const b = terrain[i], m = elev[i], tp = temp[i], ms = moist[i];
  if (b === 1 || b === 4) return 0;
  switch (t) {
    case 1: return m > 0.6 ? 2 : 1;
    case 2: return m > 0.58 ? 2.5 : 0.4;
    case 3: return m > 0.6 ? 2.5 : 0.2;
    case 4: return b === 5 ? 3 : b === 6 ? 2 : b === 0 ? 0.6 : 0.2;
    case 5: return b === 0 ? 2 : b === 2 ? 1.5 : b === 6 ? 0.8 : 0.3;
    case 6: return b === 3 ? 3 : 0.4;
    case 7: return b === 3 ? 3 : b === 2 ? 1 : 0.1;
    case 8: return tp > 0.6 && ms > 0.5 ? 3.5 : tp > 0.55 ? 0.6 : 0.05;
    case 9: return b === 3 && m < 0.42 ? 4 : 0;
    case 10: return b === 3 && tp > 0.66 ? 3.5 : 0.05;
    case 11: return b === 0 || b === 2 ? 1.2 : b === 3 ? 1 : 0.2;
    case 12: return b === 3 || b === 5 ? 1.8 : 0.5;
    case 13: return b === 3 || b === 2 ? 1.5 : b === 7 ? 1 : 0.3;
  }
  return 1;
}
function genWorld(seed, g) {
  const N = W * H, cx = W / 2, cy = H / 2, rng = mulberry32(seed);
  terrain = new Uint8Array(N); oreType = new Uint8Array(N); oreAmt = new Int32Array(N); patches = []; elev = new Float32Array(N);
  const temp = new Float32Array(N), moist = new Float32Array(N), low = new Float32Array(N);
  const sea = 0.36 + 0.05 * (g.water - 1);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, d = Math.hypot(x - cx, y - cy), k = sstep(16, 44, d);
    const lo = fbm(x / 46, y / 46, seed), edge = Math.max(Math.abs(x - cx), Math.abs(y - cy)) / (W / 2), fall = Math.max(0, edge - 0.82) * 1.6;
    let e = lo * 0.72 + fbm(x / 13, y / 13, seed + 5) * 0.28;
    const ridge = 1 - Math.abs(2 * fbm(x / 30, y / 30, seed + 9) - 1);
    e += Math.max(0, ridge - 0.86) * 2.6 * sstep(0.44, 0.56, e);
    e -= fall;
    e = 0.52 + (e - 0.52) * k;
    low[i] = 0.52 + (lo - fall - 0.52) * k;
    elev[i] = e;
    const lat = y / H;
    temp[i] = 0.5 + ((0.18 + 0.64 * lat + (fbm(x / 60, y / 60, seed + 21) - 0.5) * 0.5 - Math.max(0, e - 0.6) * 0.7) - 0.5) * (0.35 + 0.65 * k);
    moist[i] = 0.5 + (fbm(x / 38, y / 38, seed + 33) - 0.5) * 1.5 * (0.4 + 0.6 * k);
  }
  for (let i = 0; i < N; i++) {
    const e = elev[i], t = temp[i], m = moist[i];
    terrain[i] = e < sea ? 1 : e > 0.72 ? 4 : t < 0.24 ? 7 : t > 0.64 && m < 0.48 ? 3 : m > 0.6 && e < sea + 0.07 ? 5 : m > 0.55 ? 6 : m < 0.4 ? 2 : 0;
  }
  const A = N / 25600, nr = Math.round((2 + 3 * A) * (0.4 + 0.6 * g.water)), seen = new Uint8Array(N);
  for (let r = 0; r < nr; r++) {
    let x = 0, y = 0, ok = false;
    for (let q = 0; q < 200 && !ok; q++) {
      x = Math.floor(4 + rng() * (W - 8)); y = Math.floor(4 + rng() * (H - 8));
      const i = y * W + x;
      ok = low[i] > 0.56 && elev[i] < 0.72 && Math.hypot(x - cx, y - cy) > 30 && !seen[i];
    }
    if (!ok) continue;
    const path = [];
    for (let s = 0; s < 600; s++) {
      const i = y * W + x;
      if (terrain[i] === 1 && path.length) break;
      if (Math.hypot(x - cx, y - cy) < 15 || seen[i]) break;
      seen[i] = 1; path.push(i);
      let bx = -1, by = -1, be = low[i] + 0.003;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const X = x + dx, Y = y + dy;
        if (X < 1 || Y < 1 || X >= W - 1 || Y >= H - 1) continue;
        const v = low[Y * W + X] + (hash(X, Y, seed + r) - 0.5) * 0.006 + (dx && dy ? 0.001 : 0);
        if (v < be && !seen[Y * W + X]) { be = v; bx = X; by = Y; }
      }
      if (bx < 0) {
        if (path.length > 12) for (let j = -3; j <= 3; j++) for (let i2 = -3; i2 <= 3; i2++) if (i2 * i2 + j * j <= 7 + hash(x + i2, y + j, seed) * 4) { const X = x + i2, Y = y + j; if (X > 0 && Y > 0 && X < W - 1 && Y < H - 1 && Math.hypot(X - cx, Y - cy) > 15) { terrain[Y * W + X] = 1; elev[Y * W + X] = sea - 0.01; } }
        break;
      }
      x = bx; y = by;
    }
    if (path.length < 10) continue;
    path.forEach((i, s) => {
      const w = s > path.length * 0.45 ? 1 : 0, px = i % W, py = (i - px) / W;
      for (let j = 0; j <= w; j++) for (let i2 = 0; i2 <= w; i2++) { const k = (py + j) * W + px + i2; terrain[k] = 1; elev[k] = Math.min(elev[k], sea - 0.01); }
    });
  }
  const shore = new Uint8Array(N);
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
    const i = y * W + x;
    if (terrain[i] === 1 || terrain[i] === 4 || terrain[i] === 7) continue;
    let w = 0;
    for (let j = -2; j <= 2 && !w; j++) for (let q = -2; q <= 2; q++) if (terrain[i + j * W + q] === 1 && elev[i + j * W + q] < sea - 0.02) { w = 1; break; }
    if (w && elev[i] < sea + 0.03) shore[i] = 1;
  }
  for (let i = 0; i < N; i++) if (shore[i]) terrain[i] = 3;
  const base = rng() * Math.PI * 2, slot = Math.PI * 2 / 7;
  const lx = cx + Math.cos(base) * 11, ly = cy + Math.sin(base) * 11;
  for (let y = Math.floor(ly - 5); y <= ly + 5; y++) for (let x = Math.floor(lx - 5); x <= lx + 5; x++) {
    const dx = (x - lx) / 4.2, dy = (y - ly) / 3.4;
    if (dx * dx + dy * dy <= 1 + (hash(x, y, seed) - 0.5) * 0.4) { terrain[y * W + x] = 1; elev[y * W + x] = sea - 0.03; }
  }
  const near = [[4, 11, 4, 900], [1, 15, 5, 1500], [5, 15, 4, 1000], [2, 18, 5, 1300], [6, 20, 4, 1000], [3, 26, 5, 1200]];
  near.forEach(([t, dist, r, rich], k) => {
    const a = base + (k + 1) * slot + (rng() - 0.5) * 0.3;
    patch(t, cx + Math.cos(a) * dist, cy + Math.sin(a) * dist, r, rich, seed, true);
  });
  const oc = [0.75, 1, 1.25][g.ore], or = [0.6, 1, 1.6][g.ore];
  for (let t = 1; t < ORES.length; t++) {
    const n = Math.max(2, Math.round((ORE_BASE[t] || 3) * A * oc)), dmin = t < 7 ? 30 : 36;
    for (let k = 0; k < n; k++) for (let q = 0; q < 120; q++) {
      const x = 6 + rng() * (W - 12), y = 6 + rng() * (H - 12), d = Math.hypot(x - cx, y - cy);
      if (d < dmin) continue;
      if (rng() * 4 >= oreSuit(t, Math.floor(y) * W + Math.floor(x), temp, moist)) continue;
      patch(t, x, y, 3 + rng() * (t < 7 ? 4 : 3), (1200 + rng() * 2000) * (0.8 + d / 80) * or, seed, false);
      break;
    }
  }
}
function setSize(w) {
  W = H = w; PW = W / PC;
  tcv.width = W * TP; tcv.height = H * TP;
  pcv.width = pcv.height = PW;
  pimg = pctx.createImageData(PW, PW);
}
function genMap(seed, g) {
  setSize(g && !g.legacy ? g.size : 160);
  if (g && !g.legacy) genWorld(seed, g); else genLegacy(seed);
}

const PAL = [['#3d5a2e', '#41602f', '#3a562b'], ['#1d4a73', '#20507b', '#1b466d'], ['#5a5135', '#5e5538', '#565033'], ['#b39f68', '#b8a46c', '#ad9962'], ['#5d5a54', '#635f59', '#57544e'], ['#34472f', '#31432b', '#394c33'], ['#2b4824', '#2e4d26', '#284421'], ['#c3ccd0', '#c9d1d5', '#bdc6ca']];
function drawTile(x, y) {
  const i = y * W + x, h = hash(x, y, 7);
  const b = terrain[i];
  tctx.fillStyle = PAL[b][Math.floor(h * 3)];
  if (b === 1 && elev) { const dp = Math.max(0, Math.min(1, (0.36 - elev[i]) * 9)); tctx.fillStyle = mix('#2a6491', '#123457', dp); }
  tctx.fillRect(x * TP, y * TP, TP, TP);
  if (b === 4) { tctx.fillStyle = '#46433e'; for (let k = 0; k < 3; k++) tctx.fillRect(x * TP + Math.floor(hash(x, y, k + 31) * 6), y * TP + Math.floor(hash(x, y, k + 41) * 6), 3, 2); tctx.fillStyle = '#7a766e'; tctx.fillRect(x * TP + Math.floor(h * 6), y * TP + 1, 2, 1); }
  else if (b === 6) { for (let k = 0; k < 2; k++) { const px = x * TP + 1 + Math.floor(hash(x, y, k + 51) * 5), py = y * TP + 1 + Math.floor(hash(x, y, k + 61) * 5); tctx.fillStyle = '#1c3518'; tctx.fillRect(px, py, 3, 3); tctx.fillStyle = '#3d6332'; tctx.fillRect(px, py, 2, 1); } }
  else if (b === 5) { tctx.fillStyle = '#4a6a6a'; if (h < 0.5) tctx.fillRect(x * TP + Math.floor(h * 10), y * TP + 3, 3, 1); tctx.fillStyle = '#5a6b3a'; tctx.fillRect(x * TP + Math.floor(hash(x, y, 71) * 7), y * TP + Math.floor(hash(x, y, 72) * 5), 1, 3); }
  else if (b === 3 && h > 0.6) { tctx.fillStyle = '#c8b57c'; tctx.fillRect(x * TP + Math.floor(hash(x, y, 81) * 6), y * TP + Math.floor(hash(x, y, 82) * 7), 2, 1); }
  else if (b === 7 && h > 0.7) { tctx.fillStyle = '#e8eef0'; tctx.fillRect(x * TP + Math.floor(hash(x, y, 91) * 6), y * TP + Math.floor(hash(x, y, 92) * 7), 2, 1); }
  const t = oreType[i];
  if (t) {
    const O = ORES[t];
    tctx.globalAlpha = oreAmt[i] < 150 ? 0.55 : 1;
    tctx.fillStyle = O.c;
    tctx.fillRect(x * TP, y * TP, TP, TP);
    tctx.fillStyle = O.s;
    for (let k = 0; k < 4; k++) tctx.fillRect(x * TP + Math.floor(hash(x, y, k * 3 + 11) * 6), y * TP + Math.floor(hash(x, y, k * 3 + 12) * 6), 2, 2);
    tctx.globalAlpha = 1;
  }
}
function drawTerrain() { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) drawTile(x, y); }

function at(x, y) {
  if (x < 0 || y < 0 || x >= W || y >= H) return null;
  const id = occ[y * W + x];
  return id ? ents.get(id) : null;
}
const kind = e => BUILD[e.type].kind;
const ENGINE_P = { mat: 'Steam chest', v: 60, g: 400, q: 200, bar: 1e9, tmax: 1e9, duct: 1, cw: 80, ua: 0.1 };
const AMB = 15, KX = 3, HEADS = [3, 5, 8, 12, 20, 30, 45];
const isNode = e => { const k = kind(e); return k === 'pipe' || k === 'engine'; };
const NP = e => e.type === 'engine' ? ENGINE_P : BUILD[e.type].P;
const pres = e => 10 * e.amt / NP(e).v;
const nodeOk = (e, f) => e.type === 'engine' ? f === 'steam' : (!e.fl || e.fl === f);
const RES_N = { acid: 'acid', cl: 'chlorides', alk: 'caustic', nit: 'nitric acid', hf: 'fluorides', br: 'bromine' };
const resName = r => r.split(' ').map(k => RES_N[k]).join(', ');
const resists = (P, f) => !f || !FLUIDS[f].ck || (P.res || '').split(' ').includes(FLUIDS[f].ck);
const weakTo = (P, f) => !!(f && P.weak && FLUIDS[f].ck && P.weak.split(' ').includes(FLUIDS[f].ck));
const srcT = f => FLUIDS[f].t != null ? FLUIDS[f].t : AMB;
function nodeGive(e, f, a, head, T) {
  if (!nodeOk(e, f)) return 0;
  const g = Math.min(a, head * NP(e).v / 10 - e.amt);
  if (g <= 0) return 0;
  e.tf = e.amt > 0.001 && e.fl === f ? (e.tf * e.amt + (T == null ? srcT(f) : T) * g) / (e.amt + g) : (T == null ? srcT(f) : T);
  e.fl = f; e.amt += g; e.mv = (e.mv || 0) + g;
  return g;
}

function perim(e) {
  const B = BUILD[e.type], p = [];
  for (let i = 0; i < B.w; i++) p.push({ x: e.x + i, y: e.y - 1, d: 0 });
  for (let i = 0; i < B.h; i++) p.push({ x: e.x + B.w, y: e.y + i, d: 1 });
  for (let i = 0; i < B.w; i++) p.push({ x: e.x + i, y: e.y + B.h, d: 2 });
  for (let i = 0; i < B.h; i++) p.push({ x: e.x - 1, y: e.y + i, d: 3 });
  return p;
}

function makeEnt(type, x, y, dir) {
  const e = { id: S.nextId++, type, x, y, dir: dir || 0 };
  switch (BUILD[type].kind) {
    case 'belt': e.items = []; break;
    case 'machine': Object.assign(e, { recipe: null, inv: {}, out: {}, fi: {}, fo: {}, cy: false, prog: 0 }); break;
    case 'chest': e.store = {}; break;
    case 'sorter': e.buf = null; e.filter = null; break;
    case 'pipe': Object.assign(e, { fl: null, amt: 0, tf: AMB, tw: AMB, fr: 0, strain: 0, wear: 0 }); break;
    case 'engine': Object.assign(e, { fl: 'steam', amt: 0, kw: 0, tf: AMB, tw: AMB }); break;
    case 'booster': e.head = 10; e.fr = 0; e.sat = 1; break;
    case 'miner': e.out = {}; e.prog = 0; e.k = 0; break;
    case 'turret': Object.assign(e, { ammo: 0, rd: 0, cd: 0, ang: -Math.PI / 2, sh: -1, kills: 0 }); break;
    case 'hive': Object.assign(e, { food: 0, sw: 0, dc: 0 }); break;
    case 'projector': Object.assign(e, { pay: {}, pw: 0, cd: 0, ang: -Math.PI / 2, sh: -9, shots: 0 }); break;
    case 'gun': Object.assign(e, { ammo: 0, wp: 0, cd: 0, ang: -Math.PI / 2, sh: -9, shots: 0 }); break;
    case 'ruin': e.done = 0; break;
  }
  if (BUILD[type].hp) e.hp = BUILD[type].hp;
  return e;
}

function addEnt(e) {
  const B = BUILD[e.type];
  ents.set(e.id, e);
  for (let j = 0; j < B.h; j++) for (let i = 0; i < B.w; i++) occ[(e.y + j) * W + e.x + i] = e.id;
  e.per = perim(e);
  e.rr = e.rr || 0;
  L = null;
}

function canPlace(type, x, y) {
  const B = BUILD[type];
  if (x < 0 || y < 0 || x + B.w > W || y + B.h > H) return 'Out of bounds';
  let ore = false, oil = false;
  for (let j = 0; j < B.h; j++) for (let i = 0; i < B.w; i++) {
    const k = (y + j) * W + x + i;
    if (occ[k]) return 'Something is in the way';
    if (type === 'pump') { if (terrain[k] !== 1) return 'Offshore pumps must go on water'; }
    else if (terrain[k] === 1) return 'Cannot build on water';
    else if (terrain[k] === 4) return 'Bare rock: too steep to build on';
    if (oreType[k] && !ORES[oreType[k]].fluid) ore = true;
    if (oreType[k] && ORES[oreType[k]].fluid) oil = true;
  }
  if (type === 'miner' && !ore) return 'A miner needs ore under it';
  if (B.well && !oil) return 'A pumpjack must stand on an oil seep';
  if (B.forest && !forestN(x, y, B.w, B.h)) return 'A timber harvester needs forest within 4 tiles';
  return null;
}

function place(type, x, y, dir, free) {
  const err = canPlace(type, x, y);
  if (err) return err;
  if (!free) {
    if (!(S.inv[type] > 0)) return 'You have no ' + nm(type) + ' (craft with E)';
    S.inv[type]--;
  }
  const e = makeEnt(type, x, y, dir);
  addEnt(e);
  return e;
}

function give(k, n) { if (n > 0) S.inv[k] = (S.inv[k] || 0) + n; }

function unlink(e) {
  const B = BUILD[e.type];
  for (let j = 0; j < B.h; j++) for (let i = 0; i < B.w; i++) occ[(e.y + j) * W + e.x + i] = 0;
  ents.delete(e.id);
  L = null;
}
function removeEnt(e) {
  unlink(e);
  give(e.type, 1);
  if (e.items) for (const it of e.items) give(it.i, 1);
  for (const o of [e.inv, e.out, e.store]) if (o) for (const k in o) give(k, o[k]);
  if (e.buf) give(e.buf, 1);
  if (e.cy && e.recipe && RECIPE[e.recipe].i) for (const k in RECIPE[e.recipe].i) give(k, RECIPE[e.recipe].i[k]);
  if (e.catK) catDrop(e);
  if (sel === e.id) closePanel();
}

function lists() {
  if (L) return L;
  L = { belt: [], sorter: [], node: [], pump: [], machine: [], miner: [], chest: [], engine: [], booster: [], stack: [], wall: [], turret: [], hive: [], projector: [], gun: [], ruin: [] };
  for (const e of ents.values()) {
    const k = kind(e);
    if (k === 'pipe') L.node.push(e);
    else if (k === 'engine') { L.node.push(e); L.engine.push(e); }
    else L[k].push(e);
  }
  L.pairs = [];
  const seen = new Set();
  for (const a of L.node) for (const p of a.per) {
    const b = at(p.x, p.y);
    if (!b || b.id <= a.id || !isNode(b) || seen.has(a.id * 1e6 + b.id)) continue;
    seen.add(a.id * 1e6 + b.id);
    L.pairs.push([a, b]);
  }
  return L;
}

function inCap(r, k) { return Math.max(r.i[k] * 2, 4); }
function outCap(r, k) { return Math.max(10, ((r.o && r.o[k]) || 1) * 2); }
function fiCap(r, f) { return Math.max(r.fi[f] * 2, 40); }
function foCap(r, f) { return Math.max(r.fo[f] * 2, 100); }

const CAT_CAP = 4, SPENT = { v_cat: 'spent_v_cat' };
function catEff(e) { return Math.min(1, (e.ca || 0) * 3); }
function catMul(e, r) { return r.cat && e.catK === r.cat && e.ca > 0 ? 1 + r.boost * catEff(e) : 1; }
function catSwap(e, r) {
  if (!r.cat || e.catK !== r.cat || e.ca > 0 || !(e.catN > 0)) return;
  e.catN--; e.ca = 1;
}
function catWear(e, r) {
  if (!r.cat || e.catK !== r.cat || !(e.ca > 0)) return;
  e.ca -= 1 / r.life;
  if (e.ca > 1e-9) return;
  e.ca = 0;
  const sp = SPENT[r.cat];
  if (sp) e.out[sp] = (e.out[sp] || 0) + 1;
  catSwap(e, r);
}
function catDrop(e) {
  if (e.catK && e.catN > 0) give(e.catK, e.catN);
  if (e.catK && e.ca > 0.5) give(e.catK, 1);
  else if (e.catK && e.ca > 0 && SPENT[e.catK]) give(SPENT[e.catK], 1);
  e.catK = null; e.catN = 0; e.ca = 0;
}
function catAdd(e, r, n) {
  if (e.catK !== r.cat) catDrop(e);
  e.catK = r.cat;
  const m = Math.min(n, CAT_CAP - (e.catN || 0) - (e.ca > 0 ? 1 : 0));
  if (m <= 0) return 0;
  e.catN = (e.catN || 0) + m;
  catSwap(e, r);
  return m;
}

function setRecipe(e, id) {
  if (e.recipe === id) return;
  if (e.catK && (!id || RECIPE[id].cat !== e.catK)) catDrop(e);
  if (e.cy && e.recipe && RECIPE[e.recipe].i) for (const k in RECIPE[e.recipe].i) give(k, RECIPE[e.recipe].i[k]);
  for (const k in e.inv) give(k, e.inv[k]);
  e.inv = {}; e.fi = {}; e.cy = false; e.prog = 0;
  for (const f in e.fo) if (!e.fo[f] || isGas(f)) delete e.fo[f];
  e.recipe = id || null;
}

function acceptItem(o, k) {
  const kd = kind(o);
  if (o.type === 'depot') return deliver(k, 1) > 0;
  if (kd === 'chest') {
    if (sum(o.store) >= 400) return false;
    o.store[k] = (o.store[k] || 0) + 1;
    return true;
  }
  if (kd === 'turret') {
    if (k !== 'cartridge' || o.ammo >= TUR_CAP) return false;
    o.ammo++;
    return true;
  }
  if (kd === 'projector') {
    if (k === 'black_powder') { if (o.pw >= POW_CAP) return false; o.pw++; return true; }
    if (!PAYLOADS.includes(k) || sum(o.pay) >= PROJ_CAP) return false;
    o.pay[k] = (o.pay[k] || 0) + 1;
    return true;
  }
  if (kd === 'gun') {
    if ((k !== 'shell' && k !== 'wp_shell') || o.ammo + (o.wp || 0) >= GUN_CAP) return false;
    if (k === 'shell') o.ammo++; else o.wp = (o.wp || 0) + 1;
    return true;
  }
  if (kd === 'sorter') {
    if (o.buf) return false;
    o.buf = k;
    return true;
  }
  if (kd === 'machine') {
    let r = RECIPE[o.recipe];
    if (!r) {
      r = RECIPES.find(q => q.b === o.type && (q.i && q.i[k] || q.cat === k) && avail(q));
      if (!r) return false;
      setRecipe(o, r.id);
    }
    if (r.cat === k) return catAdd(o, r, 1) > 0;
    if (!r.i || !r.i[k] || (o.inv[k] || 0) >= inCap(r, k)) return false;
    o.inv[k] = (o.inv[k] || 0) + 1;
    return true;
  }
  return false;
}

function beltInsert(b, k, p) {
  const its = b.items;
  for (const it of its) if (Math.abs(it.p - p) < GAP - 1e-6) return false;
  let j = 0;
  while (j < its.length && its[j].p > p) j++;
  its.splice(j, 0, { i: k, p });
  return true;
}

function giveTo(from, o, d, k, mode) {
  const kd = kind(o);
  if (kd === 'belt') {
    if (o.dir === (d + 2) % 4) return false;
    if (mode === 'chest' && o.dir !== d) return false;
    return beltInsert(o, k, o.dir === d ? 0 : 0.5);
  }
  if (o.type === 'depot') return acceptItem(o, k);
  if (kd === 'chest' && mode === 'chest') return false;
  if (kd === 'chest' && (feeds(o, from) || wantsNear(from, k))) return false;
  if (kd === 'sorter' && o.dir !== d) return false;
  return acceptItem(o, k);
}

function feeds(c, m) {
  const r = m.recipe && RECIPE[m.recipe];
  if (!r || !r.i) return false;
  for (const k in r.i) if (c.store[k] > 0) return true;
  return false;
}

function wantsNear(m, k) {
  if (!m.per) return false;
  for (const p of m.per) {
    const o = at(p.x, p.y);
    if (!o || o === m) continue;
    const r = o.recipe && RECIPE[o.recipe];
    if (r && r.i && r.i[k]) return true;
  }
  return false;
}

function pushItems(e, src, mode) {
  let has = false;
  for (const k in src) if (src[k] > 0) { has = true; break; }
  if (!has) return;
  const per = e.per, n = per.length;
  for (let pass = 0; pass < 2; pass++) for (let t = 0; t < n; t++) {
    const idx = (e.rr + t) % n, p = per[idx], o = at(p.x, p.y);
    if (!o || o === e || (kind(o) === 'chest') !== (pass === 1)) continue;
    for (const k in src) {
      if (src[k] > 0 && giveTo(e, o, p.d, k, mode)) {
        if (--src[k] <= 0) delete src[k];
        e.rr = (idx + 1) % n;
        return;
      }
    }
  }
}

function beltTick(b) {
  const its = b.items;
  for (let j = 0; j < its.length; j++) {
    const it = its[j];
    let np = it.p + BELT_V;
    if (j === 0) {
      if (np >= 1) {
        const o = at(b.x + DX[b.dir], b.y + DY[b.dir]);
        let ok = false;
        if (o) {
          if (kind(o) === 'belt') ok = o.dir !== (b.dir + 2) % 4 && beltInsert(o, it.i, o.dir === b.dir ? 0 : 0.5);
          else ok = acceptItem(o, it.i);
        }
        if (ok) { its.shift(); j--; continue; }
        np = 1;
      }
    } else np = Math.min(np, its[j - 1].p - GAP);
    if (np > it.p) it.p = np;
  }
}

function sorterTick(e) {
  if (!e.buf) return;
  const d = !e.filter || e.buf === e.filter ? e.dir : (e.dir + 1) % 4;
  const o = at(e.x + DX[d], e.y + DY[d]);
  if (!o) return;
  let ok;
  if (kind(o) === 'belt') ok = o.dir !== (d + 2) % 4 && beltInsert(o, e.buf, o.dir === d ? 0 : 0.5);
  else ok = acceptItem(o, e.buf);
  if (ok) e.buf = null;
}

const SUB = 4;
function fluidStep(pairs) {
  const dt = DT / SUB, ms = new Float64Array(pairs.length);
  for (let n = 0; n < SUB; n++) {
    for (let i = 0; i < pairs.length; i++) {
      const [a, b] = pairs[i], A = NP(a), B = NP(b), pa = 10 * a.amt / A.v, pb = 10 * b.amt / B.v;
      const fwd = pa >= pb, src = fwd ? a : b, dst = fwd ? b : a, Ps = fwd ? A : B, Pd = fwd ? B : A;
      ms[i] = 0;
      if (!src.fl || src.amt < 0.001 || !nodeOk(dst, src.fl)) continue;
      const eq = (src.amt * Pd.v - dst.amt * Ps.v) / (Ps.v + Pd.v);
      const m = Math.min(2 / (1 / A.g + 1 / B.g) * Math.abs(pa - pb) * dt, Math.min(A.q, B.q) * dt, 0.45 * eq);
      ms[i] = fwd ? m : -m;
    }
    for (let i = 0; i < pairs.length; i++) {
      if (!ms[i]) continue;
      const fwd = ms[i] > 0, src = fwd ? pairs[i][0] : pairs[i][1], dst = fwd ? pairs[i][1] : pairs[i][0], f = src.fl;
      if (!f || !nodeOk(dst, f)) continue;
      const m = Math.min(Math.abs(ms[i]), src.amt);
      if (m <= 1e-7) continue;
      dst.tf = dst.amt > 0.001 && dst.fl === f ? (dst.tf * dst.amt + src.tf * m) / (dst.amt + m) : src.tf;
      src.amt -= m; dst.fl = f; dst.amt += m;
      src.mv = (src.mv || 0) + m; dst.mv = (dst.mv || 0) + m;
      if (src.amt < 1e-6) src.amt = 0;
    }
  }
}

function nodeHeat(e, fails) {
  const P = NP(e), Cw = P.cw;
  if (e.amt > 0.001 && e.fl) {
    const cp = FLUIDS[e.fl].cp || 2, Cf = e.amt * cp;
    e.ss = (e.tf < e.tw ? 1 : 0.3) * Math.abs(e.tf - e.tw) * Cf / (Cf + Cw);
    if (P.shock && e.ss > P.shock) fails.push([e, 'cracked from thermal shock']);
    const q = (e.tf - e.tw) * Math.min(1, KX * DT) * Cf * Cw / (Cf + Cw);
    e.tf -= q / Cf; e.tw += q / Cw;
    if (e.fl === 'steam' && e.tf < 100) {
      const c = Math.min(e.amt, (100 - e.tf) * Cf / 2260);
      e.amt -= c; e.tf = 100; e.cond = (e.cond || 0) + c;
    }
  } else { e.ss = 0; e.tf = e.tw; }
  e.tw -= P.ua * (e.tw - AMB) * DT / Cw;
  e.fr = (e.fr || 0) * 0.95 + ((e.mv || 0) / 2 / DT) * 0.05;
  e.mv = 0;
  if (e.type === 'engine') return;
  const p = pres(e);
  if (p > P.bar) {
    if (!P.duct) fails.push([e, `burst at ${p.toFixed(1)} bar (rated ${P.bar})`]);
    else { e.strain += (p / P.bar - 1) * DT; if (e.strain > P.duct) fails.push([e, `ruptured after bulging at ${p.toFixed(1)} bar (rated ${P.bar})`]); }
  }
  if (e.tw > P.tmax) fails.push([e, P.lined === 'glass' ? `glass lining spalled at ${Math.round(e.tw)}°C` : P.lined === 'rubber' ? `rubber lining blistered at ${Math.round(e.tw)}°C` : P.lined ? `lead lining melted at ${Math.round(e.tw)}°C` : P.plastic ? `softened and split at ${Math.round(e.tw)}°C` : `failed at ${Math.round(e.tw)}°C`]);
  const corr = e.fl && e.amt > 0.5 && !resists(P, e.fl) && FLUIDS[e.fl].corr;
  if (corr) e.wear += corr * (weakTo(P, e.fl) ? 3 : 1) * DT / 90;
  const rain = acidRain(e, P);
  if (rain) e.wear += rain * DT / 900;
  if (e.wear >= 1) fails.push([e, corr ? `corroded through by ${nm(e.fl)}` : 'eaten through by acid rain']);
}

function acidRain(e, P) {
  const p = polAt(e.x, e.y);
  return p > RAIN && !(P.res || '').split(' ').includes('acid') ? Math.min(3, (p - RAIN) / RAIN) : 0;
}

function emit(e, f, a) {
  const w = (POL_W[f] != null ? POL_W[f] : 0.1) * a;
  if (!(w > 0)) return;
  let st = null;
  if (e.per) for (const p of e.per) { const o = at(p.x, p.y); if (o && o.type === 'stack') { st = o; break; } }
  const src = st || e, r = st ? 2 : 0, n = (2 * r + 1) * (2 * r + 1);
  const cx = Math.floor(src.x / PC), cy = Math.floor(src.y / PC);
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const x = Math.max(0, Math.min(PW - 1, cx + dx)), y = Math.max(0, Math.min(PW - 1, cy + dy));
    S.pol[y * PW + x] += w / n;
  }
  if (st) st.puff = Math.min(3, (st.puff || 0) + w / 20);
}
function vent(e, f, a) {
  S.vent[f] = (S.vent[f] || 0) + a; e.pt = S.t; emit(e, f, a);
  if (f !== 'phosgene') return;
  e.leak = (e.leak || 0) + a;
  if (e.leak < 20) return;
  const c = ctr(e);
  S.clouds.push({ x: c.x, y: c.y, g: 'phos', m: e.leak, r: 1, s: Math.random() * 100, own: 1 });
  if (!(S.lk > S.t - 20)) toast(`Phosgene is leaking from the ${BUILD[e.type].n} at ${e.x},${e.y}. Pipe it away or it drifts over your works.`, true);
  S.lk = S.t;
  e.leak = 0;
}

function polStep() {
  const p = S.pol, n = new Array(PW * PW).fill(0), D = 0.05, K = 0.996;
  for (let y = 0; y < PW; y++) for (let x = 0; x < PW; x++) {
    const i = y * PW + x, v = p[i];
    if (!v) continue;
    let out = 0;
    if (x > 0) { n[i - 1] += v * D; out += D; }
    if (x < PW - 1) { n[i + 1] += v * D; out += D; }
    if (y > 0) { n[i - PW] += v * D; out += D; }
    if (y < PW - 1) { n[i + PW] += v * D; out += D; }
    n[i] += v * (1 - out);
  }
  for (let i = 0; i < n.length; i++) n[i] = n[i] * K < 0.01 ? 0 : n[i] * K;
  S.pol = n;
}

const fx = [];
function burst(e, why) {
  if (!ents.has(e.id)) return;
  if (e.fl && e.amt > 0.01) { S.spill[e.fl] = (S.spill[e.fl] || 0) + e.amt; emit(e, e.fl, e.amt); }
  unlink(e);
  if (sel === e.id) closePanel();
  fx.push({ x: e.x + 0.5, y: e.y + 0.5, t: 0, c: e.fl ? col(e.fl) : '#ccc' });
  S.fails = (S.fails || 0) + 1;
  return `${BUILD[e.type].n} at ${e.x},${e.y} ${why}`;
}

const TUR_CAP = 20, TUR_R = 10, BUG_V = 1.6, MAX_BUGS = 80, MAX_HIVES = 30, BUG_LIFE = 150;
const maxHp = e => BUILD[e.type].hp || 60 * BUILD[e.type].w * BUILD[e.type].h;
const ctr = e => ({ x: e.x + BUILD[e.type].w / 2, y: e.y + BUILD[e.type].h / 2 });
function wreck(e, why) {
  if (!ents.has(e.id)) return;
  const B = BUILD[e.type], c = ctr(e);
  if (e.fl && e.amt > 0.01) { S.spill[e.fl] = (S.spill[e.fl] || 0) + e.amt; emit(e, e.fl, e.amt); }
  if (e.fo) for (const f in e.fo) if (e.fo[f] > 0.01) { S.spill[f] = (S.spill[f] || 0) + e.fo[f]; emit(e, f, e.fo[f]); }
  unlink(e);
  if (sel === e.id) closePanel();
  fx.push({ x: c.x, y: c.y, t: 0, c: kind(e) === 'hive' ? '#a0c040' : '#8a7a6a' });
  if (kind(e) === 'hive') {
    S.hk = (S.hk || 0) + 1;
    toast('Crawler hive destroyed');
    if (Math.random() < 0.25) { const r = unlockRandom(); if (r) toast(`A lab notebook in the wreckage: ${r.n} (${BUILD[r.b].n})`); }
  }
  else if (why === 'gas') { S.lost = (S.lost || 0) + 1; toast(`${B.n} at ${e.x},${e.y} was corroded through by drifting gas`, true); }
  else if (why === 'fire') { S.lost = (S.lost || 0) + 1; toast(`${B.n} at ${e.x},${e.y} burned in a phosphorus fire`, true); }
  else { S.lost = (S.lost || 0) + 1; eatToast(B.n, e); }
}
function hurt(e, d, why) {
  if (e.hp == null) e.hp = maxHp(e);
  e.hp -= d;
  if (e.hp <= 0) wreck(e, why);
}
const avail = r => !r.lock || !!(S.unl && S.unl[r.id]);
const buildOk = t => !BUILD[t].lock || !!(S.unl && S.unl[BUILD[t].lock]);
function unlock(id) { S.unl[id] = 1; return RECIPE[id]; }
const BOOKS = [['haber', 'ostwald', 'amm_nitrate'], ['ammonal', 'he_drum', 'nh3_scrub'], ['tnt', 'shell', 'wp_shell'], ['phosgene', 'fill_phos']];
function labBook() {
  const left = BOOKS.map(b => b.filter(id => !S.unl[id])).filter(b => b.length);
  if (!left.length) { const r = unlockRandom(); return r ? [r] : null; }
  const b = left[0][0] === 'haber' ? left[0] : left[Math.floor(Math.random() * left.length)];
  return b.map(unlock);
}
function orderReach(k) {
  if (ORES.some(o => o && o.item === k)) return true;
  return RECIPES.some(r => r.o && r.o[k] && avail(r) && buildOk(r.b));
}
function fillOrders() {
  if (!S.orders) S.orders = [];
  const tier = 1 + Math.floor((S.odone || 0) / 3);
  while (S.orders.length < 3) {
    const l = ORDERS.map((o, i) => i).filter(i => ORDERS[i].tier <= tier && !S.orders.some(a => a.i === i) && i !== S.olast && orderReach(ORDERS[i].item));
    if (!l.length) break;
    const pick = l.filter(i => ORDERS[i].tier === Math.min(tier, 3));
    const from = pick.length && Math.random() < 0.6 ? pick : l;
    S.orders.push({ i: from[Math.floor(Math.random() * from.length)], got: 0 });
  }
}
function deliver(k, n) {
  if (!S.orders) return 0;
  const a = S.orders.find(a => ORDERS[a.i].item === k && a.got < ORDERS[a.i].n);
  if (!a) return 0;
  const m = Math.min(n, ORDERS[a.i].n - a.got);
  a.got += m;
  if (a.got >= ORDERS[a.i].n) completeOrder(a);
  return m;
}
function completeOrder(a) {
  const O = ORDERS[a.i];
  for (const k in O.rw) give(k, O.rw[k]);
  S.orders.splice(S.orders.indexOf(a), 1);
  S.olast = a.i;
  S.odone = (S.odone || 0) + 1;
  toast(`${O.c} paid: ${Object.keys(O.rw).map(k => O.rw[k] + ' ' + nm(k)).join(', ')}`);
  if (S.odone % 3 === 0) {
    const l = ['haber', 'ostwald', 'nh3_scrub'].filter(id => !S.unl[id]);
    if (l.length) toast(`The buyer sent a lab notebook: ${unlock(l[0] === 'haber' ? 'haber' : l[Math.floor(Math.random() * l.length)]).n} unlocked`);
    else { for (const k in O.rw) give(k, O.rw[k]); toast(`${O.c} paid a repeat-custom bonus: the reward again`); }
  }
  fillOrders();
}
function unlockRandom() {
  const l = RECIPES.filter(r => r.lock && !S.unl[r.id]);
  return l.length ? unlock(l[Math.floor(Math.random() * l.length)].id) : null;
}
function hiveSpot(x, y) {
  if (x < 1 || y < 1 || x > W - 3 || y > H - 3) return false;
  for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { const k = (y + j) * W + x + i; if (occ[k] || terrain[k] === 1 || terrain[k] === 4) return false; }
  return true;
}
function farFromBase(x, y, r) {
  for (const e of ents.values()) if (kind(e) !== 'hive' && kind(e) !== 'ruin' && Math.abs(e.x - x) < r && Math.abs(e.y - y) < r) return false;
  return true;
}
function addHive(x, y) {
  const h = makeEnt('hive', x, y, 0);
  addEnt(h);
  return h;
}
function spawnHives() {
  const rng = mulberry32(S.seed + 777), g = S.gen, big = g && !g.legacy;
  const max = big ? Math.round(10 * W * H / 25600 * [0, 0.5, 1, 1.6][g.hives]) : 10;
  let n = 0;
  for (let k = 0; k < 400 * Math.max(1, max / 10) && n < max; k++) {
    const a = rng() * Math.PI * 2, d = 48 + rng() * (big ? W * 0.68 - 48 : 30);
    const x = Math.round(W / 2 + Math.cos(a) * d), y = Math.round(H / 2 + Math.sin(a) * d);
    if (!hiveSpot(x, y) || !farFromBase(x, y, 14)) continue;
    let near = false;
    for (const e of lists().hive) if (Math.hypot(e.x - x, e.y - y) < 18) near = true;
    if (near) continue;
    addHive(x, y);
    n++;
  }
  S.hv = 1;
}
function ruinSpot(x, y) {
  if (x < 2 || y < 2 || x > W - 5 || y > H - 5) return false;
  for (let j = -1; j < 4; j++) for (let i = -1; i < 4; i++) { const k = (y + j) * W + x + i; if (occ[k] || terrain[k] === 1 || terrain[k] === 4) return false; }
  return true;
}
function spawnRuins() {
  const rng = mulberry32(S.seed + 4242), rs = [], g = S.gen, big = g && !g.legacy;
  const max = big ? Math.round(4 * W * H / 25600) : 4;
  for (let k = 0; k < 600 * Math.max(1, max / 4) && rs.length < max; k++) {
    const a = rng() * Math.PI * 2, d = 58 + rng() * (big ? W * 0.66 - 58 : 16);
    const x = Math.round(W / 2 + Math.cos(a) * d), y = Math.round(H / 2 + Math.sin(a) * d);
    if (!ruinSpot(x, y) || !farFromBase(x, y, 20) || rs.some(o => Math.hypot(o.x - x, o.y - y) < 30)) continue;
    const e = makeEnt('ruin', x, y, 0);
    addEnt(e);
    rs.push(e);
    let g = 0;
    for (let q = 0; q < 60 && g < (big && !S.gen.hives ? 0 : 3); q++) {
      const b = rng() * Math.PI * 2, r = 5 + rng() * 3;
      const hx = Math.round(x + 1 + Math.cos(b) * r - 1), hy = Math.round(y + 1 + Math.sin(b) * r - 1);
      if (!hiveSpot(hx, hy)) continue;
      addHive(hx, hy);
      g++;
    }
  }
  S.rv = 1;
}
function resHtml() {
  const gs = Object.keys(GAS).filter(g => resist(g) > 0.005);
  if (!gs.length) return '';
  return '<div class="sec">Crawler gas tolerance</div>' + gs.map(g => `<div class="gauge"><span>${GAS[g].n}</span>${bar(resist(g), 1, '#c07a4a')}<b>${Math.round(resist(g) * 100)}%</b></div>`).join('');
}
function guards(e) {
  const c = ctr(e);
  return lists().hive.filter(h => { const q = ctr(h); return Math.hypot(q.x - c.x, q.y - c.y) < 16; });
}
function searchRuin(e) {
  if (e.done) return toast('Already searched. Nothing left but rust.', true);
  const g = guards(e).length;
  if (g) return toast(`${g} hive${g > 1 ? 's' : ''} within 16 tiles still guard these works. Clear them first.`, true);
  e.done = 1;
  S.rs = (S.rs || 0) + 1;
  const loot = { pt_gauze: 2, motor: 3, plate: 12, cylinder: 4 };
  for (const k in loot) give(k, loot[k]);
  const r = labBook();
  toast(`Salvaged 2 platinum gauze, 3 motors, 12 plates, 4 cylinders`);
  if (r) toast(`The lab books describe ${r.map(q => q.n).join(', ')}. Recipes unlocked.`);
  renderHotbar();
}
const GUN_R = 44, GUN_MIN = 8, GUN_CAP = 12;
function gunTick(e) {
  e.cd -= DT;
  if (e.cd > 0) return;
  e.cd = 1;
  e.tgt = 0;
  const c = ctr(e);
  let h = null, bd = GUN_R * GUN_R;
  for (const o of lists().hive) { const q = ctr(o), d = (q.x - c.x) ** 2 + (q.y - c.y) ** 2; if (d < bd && d > GUN_MIN * GUN_MIN) { bd = d; h = o; } }
  if (!h) return;
  e.tgt = h.id;
  const wp = e.wp > 0;
  if (!wp && !(e.ammo > 0)) return;
  const q = ctr(h), a = Math.random() * Math.PI * 2, sc = Math.random() * Math.sqrt(bd) * 0.03;
  const tx = q.x + Math.cos(a) * sc, ty = q.y + Math.sin(a) * sc, dist = Math.hypot(tx - c.x, ty - c.y);
  if (wp) e.wp--; else e.ammo--;
  e.shots++;
  e.ang = Math.atan2(ty - c.y, tx - c.x);
  e.sh = S.t;
  e.cd = 5;
  S.shells.push({ sx: c.x, sy: c.y, tx, ty, t: 0, T: Math.max(1.2, dist / 18), k: wp ? 'wp_shell' : 'shell', pid: e.id });
}
const PROJ_R = 28, PROJ_CAP = 6, POW_CAP = 20, PAYLOADS = ['phos_cyl', 'nh3_cyl', 'cl2_cyl', 'he_drum'], CYL_GAS = { cl2_cyl: 'cl2', nh3_cyl: 'nh3', phos_cyl: 'phos' };
const GAS = { cl2: { n: 'Chlorine', v: 0.45, tau: 36, tox: 1, cor: 1.5, rgb: '190,214,70' }, nh3: { n: 'Ammonia', v: 1.4, tau: 16, tox: 4, rgb: '214,228,244' }, phos: { n: 'Phosgene', v: 0.35, tau: 40, tox: 6, cor: 0.6, vis: 0.7, rgb: '226,224,196' }, smoke: { n: 'Phosphorus smoke', v: 0.9, tau: 14, tox: 0, vis: 0.85, rgb: '242,242,236' } };
const FIRE_T = 14, FIRE_HIVE = 16, FIRE_BUG = 40, FIRE_ENT = 3;
const RES_MAX = 0.8, RES_STEP = 0.06;
const resist = g => (S.res && S.res[g]) || 0;
function projectorTick(e) {
  e.cd -= DT;
  if (e.cd > 0) return;
  e.cd = 1;
  const k = PAYLOADS.find(q => e.pay[q] > 0);
  e.tgt = 0;
  if (!k) return;
  const c = ctr(e);
  let h = null, bd = PROJ_R * PROJ_R;
  for (const o of lists().hive) { const q = ctr(o), d = (q.x - c.x) ** 2 + (q.y - c.y) ** 2; if (d < bd && d > 25) { bd = d; h = o; } }
  if (!h) return;
  e.tgt = h.id;
  if (!(e.pw > 0)) return;
  const q = ctr(h), a = Math.random() * Math.PI * 2, sc = Math.random() * 1.2;
  const tx = q.x + Math.cos(a) * sc, ty = q.y + Math.sin(a) * sc, dist = Math.hypot(tx - c.x, ty - c.y);
  if (!--e.pay[k]) delete e.pay[k];
  e.pw--;
  e.shots++;
  e.ang = Math.atan2(ty - c.y, tx - c.x);
  e.sh = S.t;
  e.cd = 4;
  S.shells.push({ sx: c.x, sy: c.y, tx, ty, t: 0, T: Math.max(1.5, dist / 12), k, pid: e.id });
}
function land(s) {
  if (s.k === 'shell') {
    fx.push({ x: s.tx, y: s.ty, t: 0, c: '#ffd070' }, { x: s.tx + 0.4, y: s.ty - 0.3, t: 0.1, c: '#4a4440' });
    S.booms.push({ x: s.tx, y: s.ty, t: 0 });
    for (const h of lists().hive.slice()) { const q = ctr(h), d = Math.hypot(q.x - s.tx, q.y - s.ty); if (d < 2.5) { h.lh = S.t; hurt(h, 220 * (1 - d / 3.5)); } }
    for (const b of S.bugs) if (Math.hypot(b.x - s.tx, b.y - s.ty) < 3) b.hp -= 100;
  } else if (s.k === 'wp_shell') {
    for (let n = 0; n < 8; n++) { const a = n / 8 * Math.PI * 2; fx.push({ x: s.tx + Math.cos(a) * 1.4, y: s.ty + Math.sin(a) * 1.4, t: 0.05, c: '#fff8e0' }); }
    S.booms.push({ x: s.tx, y: s.ty, t: 0.3 });
    S.fires.push({ x: s.tx, y: s.ty, t: 0, T: FIRE_T, r: 2.2, s: Math.random() * 100 });
    S.clouds.push({ x: s.tx, y: s.ty, g: 'smoke', m: 40, r: 1.6, s: Math.random() * 100 });
    for (const h of lists().hive.slice()) { const q = ctr(h), d = Math.hypot(q.x - s.tx, q.y - s.ty); if (d < 2.5) { h.lh = S.t; hurt(h, 60); } }
    for (const b of S.bugs) if (Math.hypot(b.x - s.tx, b.y - s.ty) < 3) b.hp -= 50;
  } else if (s.k === 'he_drum') {
    for (let n = 0; n < 3; n++) fx.push({ x: s.tx + (Math.random() - 0.5), y: s.ty + (Math.random() - 0.5), t: n * 0.1, c: n ? '#5a5048' : '#ffb347' });
    S.booms.push({ x: s.tx, y: s.ty, t: 0 });
    for (const h of lists().hive.slice()) { const q = ctr(h), d = Math.hypot(q.x - s.tx, q.y - s.ty); if (d < 3) { h.lh = S.t; hurt(h, 350 * (1 - d / 4)); } }
    for (const b of S.bugs) if (Math.hypot(b.x - s.tx, b.y - s.ty) < 3.5) b.hp -= 80;
  } else {
    const g = CYL_GAS[s.k];
    S.clouds.push({ x: s.tx, y: s.ty, g, m: 40, r: 1.2, s: Math.random() * 100 });
    fx.push({ x: s.tx, y: s.ty, t: 0.4, c: `rgb(${GAS[g].rgb})` });
    S.res = S.res || {};
    S.res[g] = Math.min(RES_MAX, resist(g) + RES_STEP * (1 - resist(g) / RES_MAX));
  }
  let h = null, bd = 64;
  for (const o of lists().hive) { const q = ctr(o), d = (q.x - s.tx) ** 2 + (q.y - s.ty) ** 2; if (d < bd) { bd = d; h = o; } }
  if (h && h.dc <= 0 && ents.has(s.pid)) { spawnBugs(h, 2 + Math.floor(S.evo * 3), s.pid); h.dc = 10; }
}
function shellStep() {
  for (let i = S.shells.length - 1; i >= 0; i--) {
    const s = S.shells[i];
    s.t += DT;
    if (s.t >= s.T) { S.shells.splice(i, 1); land(s); }
  }
  for (let i = S.booms.length - 1; i >= 0; i--) if ((S.booms[i].t += DT) > 0.8) S.booms.splice(i, 1);
}
function fireStep(dt) {
  for (let i = S.fires.length - 1; i >= 0; i--) {
    const f = S.fires[i];
    f.t += dt;
    if (f.t >= f.T) { S.fires.splice(i, 1); continue; }
    const k = f.t < f.T * 0.6 ? 1 : (f.T - f.t) / (f.T * 0.4), R2 = f.r * f.r;
    for (const b of S.bugs) if ((b.x - f.x) ** 2 + (b.y - f.y) ** 2 < R2) b.hp -= FIRE_BUG * k * dt;
    const r = Math.ceil(f.r) + 1, seen = new Set();
    for (let y = Math.max(0, Math.floor(f.y) - r); y <= Math.min(H - 1, Math.floor(f.y) + r); y++)
      for (let x = Math.max(0, Math.floor(f.x) - r); x <= Math.min(W - 1, Math.floor(f.x) + r); x++) {
        const id = occ[y * W + x];
        if (!id || seen.has(id) || (x + 0.5 - f.x) ** 2 + (y + 0.5 - f.y) ** 2 > R2 + 1) continue;
        seen.add(id);
        const e = ents.get(id), kd = e && kind(e);
        if (!e || kd === 'ruin') continue;
        if (kd === 'hive') { e.lh = S.t; hurt(e, FIRE_HIVE * k * dt); } else if (kd !== 'wall') hurt(e, FIRE_ENT * k * dt, 'fire');
      }
  }
}
function windStep() {
  const w = S.wind;
  w.a += (Math.random() - 0.5) * 0.25;
  w.v = Math.max(0.05, Math.min(0.7, w.v + (Math.random() - 0.5) * 0.08));
  if (S.res) for (const g in S.res) S.res[g] *= 0.998;
}
function cloudStep(dt) {
  const wx = Math.cos(S.wind.a) * S.wind.v, wy = Math.sin(S.wind.a) * S.wind.v, hs = lists().hive;
  for (let i = S.clouds.length - 1; i >= 0; i--) {
    const c = S.clouds[i], G = GAS[c.g];
    c.x += wx * G.v * dt; c.y += wy * G.v * dt;
    c.r = Math.sqrt(c.r * c.r + 0.8 * dt);
    c.m *= Math.exp(-dt / G.tau);
    if (c.m < 1.5 || c.x < -6 || c.y < -6 || c.x > W + 6 || c.y > H + 6) { S.clouds.splice(i, 1); continue; }
    const k = c.m / (Math.PI * c.r * c.r), R2 = c.r * c.r, tx = G.tox * (1 - resist(c.g));
    for (const b of S.bugs) if ((b.x - c.x) ** 2 + (b.y - c.y) ** 2 < R2) b.hp -= 20 * k * tx * dt;
    for (const h of hs) {
      if (!ents.has(h.id)) continue;
      const q = ctr(h);
      if ((q.x - c.x) ** 2 + (q.y - c.y) ** 2 < R2 + 1) { h.lh = S.t; hurt(h, 5 * k * tx * dt); }
    }
    if (!G.cor || k < 0.15) continue;
    const seen = new Set(), r = Math.ceil(c.r);
    for (let y = Math.max(0, Math.floor(c.y) - r); y <= Math.min(H - 1, Math.floor(c.y) + r); y++)
      for (let x = Math.max(0, Math.floor(c.x) - r); x <= Math.min(W - 1, Math.floor(c.x) + r); x++) {
        const id = occ[y * W + x];
        if (!id || seen.has(id) || (x + 0.5 - c.x) ** 2 + (y + 0.5 - c.y) ** 2 > R2) continue;
        seen.add(id);
        const e = ents.get(id), kd = e && kind(e);
        if (!e || kd === 'hive' || kd === 'ruin' || kd === 'wall') continue;
        hurt(e, G.cor * k * dt, 'gas');
      }
  }
}
function smell(x, y) {
  const cx = Math.floor(x / PC), cy = Math.floor(y / PC), r = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const X = cx + dx, Y = cy + dy;
    if (X >= 0 && Y >= 0 && X < PW && Y < PW) r.push(Y * PW + X);
  }
  return r;
}
function nearestEnt(x, y, r, pick) {
  let best = null, bd = r * r;
  for (const e of ents.values()) {
    const k = kind(e);
    if (k === 'hive' || k === 'belt' || k === 'ruin' || (pick && !pick(e))) continue;
    const c = ctr(e), d = (c.x - x) ** 2 + (c.y - y) ** 2;
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}
function spawnBugs(h, n, tid) {
  const c = ctr(h), mhp = 30 * (1 + 2 * S.evo);
  for (let i = 0; i < n && S.bugs.length < MAX_BUGS; i++) {
    const a = Math.random() * Math.PI * 2;
    S.bugs.push({ x: c.x + Math.cos(a) * 1.4, y: c.y + Math.sin(a) * 1.4, hp: mhp, mhp, tid, hx: c.x, hy: c.y, a, cd: 0, ph: Math.random() * 7, bt: S.t });
  }
}
function launch(h) {
  const c = ctr(h);
  const t = nearestEnt(c.x, c.y, 90, e => e.pt != null && S.t - e.pt < 30) || nearestEnt(c.x, c.y, 90, e => kind(e) === 'machine');
  if (!t) return;
  h.food -= 50;
  h.sw++;
  spawnBugs(h, Math.min(10, 3 + Math.floor(S.evo * 8)), t.id);
  if (h.sw % 8 === 0 && lists().hive.length < MAX_HIVES) expand(h);
}
function expand(h) {
  let best = null, bp = -1;
  for (let k = 0; k < 12; k++) {
    const a = Math.random() * Math.PI * 2, d = 6 + Math.random() * 8;
    const x = Math.round(h.x + Math.cos(a) * d), y = Math.round(h.y + Math.sin(a) * d);
    if (!hiveSpot(x, y) || !farFromBase(x, y, 12)) continue;
    const p = polAt(x, y);
    if (p > bp) { bp = p; best = { x, y }; }
  }
  if (best) addHive(best.x, best.y);
}
function hiveStep() {
  for (const h of lists().hive) {
    let got = 0;
    for (const i of smell(h.x, h.y)) {
      const a = Math.min(S.pol[i] * 0.05, 0.4);
      S.pol[i] -= a; got += a;
    }
    h.food = Math.min(100, h.food + got);
    S.evo = Math.min(1, S.evo + got / 30000);
    if (!(S.t - (h.lh || -99) < 15)) h.hp = Math.min(maxHp(h), h.hp + 2);
    h.dc = Math.max(0, h.dc - 1);
    if (h.food >= 50) launch(h);
  }
}
function bugStep() {
  const sp = BUG_V * DT, dmg = 6 * (1 + S.evo) * DT;
  for (let i = S.bugs.length - 1; i >= 0; i--) {
    const b = S.bugs[i];
    if (b.hp <= 0) { S.bugs.splice(i, 1); S.kills = (S.kills || 0) + 1; fx.push({ x: b.x, y: b.y, t: 0.5, c: '#a0c040' }); continue; }
    let t = b.tid > 0 ? ents.get(b.tid) : null;
    if (!t && b.tid > 0) { t = nearestEnt(b.x, b.y, 25); b.tid = t ? t.id : -1; }
    let tx = b.hx, ty = b.hy;
    if (t) { const c = ctr(t); tx = c.x; ty = c.y; }
    const dx = tx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy);
    if ((!t && d < 1) || S.t - (b.bt ?? S.t) > BUG_LIFE) { S.bugs.splice(i, 1); continue; }
    if (d < 1e-3) continue;
    b.a = Math.atan2(dy, dx);
    const wob = Math.sin(S.t * 5 + b.ph) * 0.35;
    const ux = dx / d - dy / d * wob, uy = dy / d + dx / d * wob;
    const tryMove = (nx, ny) => {
      const X = Math.floor(nx), Y = Math.floor(ny);
      if (X < 0 || Y < 0 || X >= W || Y >= H || terrain[Y * W + X] === 1 || terrain[Y * W + X] === 4) return 'water';
      const o = at(X, Y);
      if (o && kind(o) === 'ruin') return 'water';
      if (o && kind(o) !== 'belt' && kind(o) !== 'hive' && !(Math.floor(b.x) === X && Math.floor(b.y) === Y)) return o;
      b.x = nx; b.y = ny;
      return null;
    };
    let r = tryMove(b.x + ux * sp, b.y + uy * sp);
    if (r === 'water') r = tryMove(b.x + Math.sign(ux) * sp, b.y) && tryMove(b.x, b.y + Math.sign(uy) * sp) && tryMove(b.x - uy * sp, b.y + ux * sp);
    b.chew = r && r !== 'water' ? r.id : 0;
    if (b.chew) hurt(r, dmg);
  }
}
function turretTick(e) {
  e.cd -= DT;
  if (e.cd > 0) return;
  if (!e.rd) { if (e.ammo > 0) { e.ammo--; e.rd = 10; } else return; }
  const c = ctr(e), R2 = TUR_R * TUR_R;
  let best = null, bd = R2;
  for (const b of S.bugs) { const d = (b.x - c.x) ** 2 + (b.y - c.y) ** 2; if (b.hp > 0 && d < bd) { bd = d; best = b; } }
  let tx, ty;
  if (best) { best.hp -= 10; tx = best.x; ty = best.y; if (best.hp <= 0) e.kills++; }
  else {
    let h = null;
    for (const o of lists().hive) { const q = ctr(o), d = (q.x - c.x) ** 2 + (q.y - c.y) ** 2; if (d < bd) { bd = d; h = o; } }
    if (!h) return;
    const q = ctr(h);
    tx = q.x; ty = q.y;
    if (h.dc <= 0) { spawnBugs(h, 2 + Math.floor(S.evo * 3), e.id); h.dc = 10; }
    h.lh = S.t;
    hurt(h, 10);
  }
  e.rd--;
  e.cd = 0.25;
  e.ang = Math.atan2(ty - c.y, tx - c.x);
  e.sh = S.t; e.tx = tx; e.ty = ty;
}

function boosterTick(e) {
  const b = (e.dir + 2) % 4, src = at(e.x + DX[b], e.y + DY[b]), dst = at(e.x + DX[e.dir], e.y + DY[e.dir]);
  let g = 0;
  if (src && dst && isNode(src) && src.fl && src.amt > 0.001) {
    const a = Math.min(200 * DT * e.sat, src.amt);
    if (isNode(dst)) g = nodeGive(dst, src.fl, a, e.head, src.tf);
    else if (kind(dst) === 'machine') g = fluidToMachine(dst, src.fl, a);
    src.amt -= g;
  }
  e.on = g > 1e-4;
  e.fr = (e.fr || 0) * 0.95 + (g / DT) * 0.05;
}

function machineFluidIn(e, r) {
  if (!r.fi) return;
  for (const f in r.fi) {
    const cap = fiCap(r, f);
    for (const p of e.per) {
      const room = cap - (e.fi[f] || 0);
      if (room <= 0.001) break;
      const o = at(p.x, p.y);
      if (o && isNode(o) && (o.fl === f || (f === 'water' && o.fl === 'bfw')) && o.amt > 0) {
        const g = Math.min(room, o.amt);
        o.amt -= g; e.fi[f] = (e.fi[f] || 0) + g;
        if (o.fl === 'bfw') e.soft = (e.soft || 0) + g;
      }
    }
  }
}

function fluidToMachine(o, f, a) {
  const r = RECIPE[o.recipe];
  const soft = f === 'bfw' && r && r.fi && r.fi.water;
  if (soft) f = 'water';
  if (!r || !r.fi || !r.fi[f]) return 0;
  const g = Math.min(fiCap(r, f) - (o.fi[f] || 0), a);
  if (g <= 0) return 0;
  o.fi[f] = (o.fi[f] || 0) + g;
  if (soft) o.soft = (o.soft || 0) + g;
  return g;
}

function machineFluidOut(e) {
  for (const f in e.fo) {
    if (e.fo[f] <= 0.001) continue;
    for (const p of e.per) {
      const o = at(p.x, p.y);
      if (!o || o === e) continue;
      if (isNode(o)) e.fo[f] -= nodeGive(o, f, e.fo[f], e.type === 'boiler' ? 7 : 5);
      else if (kind(o) === 'machine') e.fo[f] -= fluidToMachine(o, f, e.fo[f]);
      if (e.fo[f] <= 0.001) { e.fo[f] = 0; break; }
    }
  }
}

function pumpTick(e) {
  let left = PUMP_RATE;
  for (const p of e.per) {
    const o = at(p.x, p.y);
    if (!o) continue;
    if (isNode(o)) left -= nodeGive(o, 'water', left, 8, AMB);
    else if (kind(o) === 'machine') left -= fluidToMachine(o, 'water', left);
    if (left <= 0) break;
  }
  e.on = left < PUMP_RATE;
}

const FOREST_R = 4, FOREST_FULL = 50;
function forestN(x, y, w, h) {
  let n = 0;
  for (let j = y - FOREST_R; j < y + h + FOREST_R; j++) for (let i = x - FOREST_R; i < x + w + FOREST_R; i++) if (i >= 0 && j >= 0 && i < W && j < H && terrain[j * W + i] === 6) n++;
  return n;
}
function forestOf(e) { if (e.fc == null) e.fc = forestN(e.x, e.y, BUILD[e.type].w, BUILD[e.type].h); return e.fc; }
const forestMul = e => BUILD[e.type].forest ? Math.min(1, forestOf(e) / FOREST_FULL) : 1;
const SUN = [0.4, 0, 0.7, 1, 0, 0.15, 0.3, 0.1];
function sunAt(x, y, w, h) { let a = 0; for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) a += SUN[terrain[(y + j) * W + x + i]] || 0; return a / (w * h); }
function sunOf(e) { if (e.su == null) e.su = sunAt(e.x, e.y, BUILD[e.type].w, BUILD[e.type].h); return e.su; }
const WINDX = [0.8, 1, 1, 0.8, 1, 0.8, 0.45, 1];
function exposureAt(x, y, w, h) { let a = 0; for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) a += WINDX[terrain[(y + j) * W + x + i]] || 0; return a / (w * h); }
function exposureOf(e) { if (e.wx == null) e.wx = exposureAt(e.x, e.y, BUILD[e.type].w, BUILD[e.type].h); return e.wx; }
const windCurve = () => S.wind.v < 0.1 ? 0 : Math.min(1, Math.pow(S.wind.v / 0.5, 3));
const sunMul = e => BUILD[e.type].sun ? sunOf(e) : BUILD[e.type].wind ? exposureOf(e) * windCurve() : 1;
function tryStart(e, r) {
  if (r.well && !wellTiles(e).length) return 'empty';
  if (BUILD[e.type].forest && !forestOf(e)) return 'forest';
  if (e.desc > 0) return 'clean';
  if (e.type === 'boiler' && e.scale >= 1) return 'scale';
  if (r.i) for (const k in r.i) if ((e.inv[k] || 0) < r.i[k]) return 'input';
  if (r.fi) for (const f in r.fi) if ((e.fi[f] || 0) < r.fi[f] - 1e-6) return 'input';
  if (r.o) for (const k in r.o) if ((e.out[k] || 0) + r.o[k] > outCap(r, k)) return 'output';
  if (r.ch) for (const k in r.ch) if ((e.out[k] || 0) + 1 > outCap(r, k)) return 'output';
  if (r.fo) for (const f in r.fo) if (!spills(r, f) && (e.fo[f] || 0) + r.fo[f] > foCap(r, f)) return 'output';
  if (r.i) for (const k in r.i) { e.inv[k] -= r.i[k]; if (!e.inv[k]) delete e.inv[k]; }
  if (r.fi && r.fi.water) {
    const sf = Math.min(1, (e.soft || 0) / Math.max(e.fi.water, 1e-6));
    e.soft = Math.max(0, (e.soft || 0) - sf * r.fi.water);
    if (e.type === 'boiler') e.scale = Math.min(1, (e.scale || 0) + (1 - sf) * SCALE_RATE * r.fi.water / 60);
  }
  if (r.fi) for (const f in r.fi) e.fi[f] -= r.fi[f];
  e.cy = true;
  return null;
}

const SCALE_RATE = 0.0025;
const scaleMul = e => e.type === 'boiler' ? 1 - 0.6 * (e.scale || 0) : 1;
function finish(e, r) {
  e.cy = false; e.prog = 0;
  catWear(e, r);
  if (r.well) wellDraw(e);
  if (r.o) for (const k in r.o) { e.out[k] = (e.out[k] || 0) + r.o[k]; S.made[k] = (S.made[k] || 0) + r.o[k]; }
  if (r.ch) for (const k in r.ch) if (Math.random() < r.ch[k]) { e.out[k] = (e.out[k] || 0) + 1; S.made[k] = (S.made[k] || 0) + 1; }
  if (r.fo) for (const f in r.fo) {
    e.fo[f] = (e.fo[f] || 0) + r.fo[f];
    const cap = foCap(r, f);
    if (spills(r, f) && e.fo[f] > cap) { vent(e, f, e.fo[f] - cap); e.fo[f] = cap; }
    if (BUILD[e.type].gen) { vent(e, f, e.fo[f]); e.fo[f] = 0; }
  }
}

const solid = i => oreType[i] && !ORES[oreType[i]].fluid;
const oily = i => oreType[i] && ORES[oreType[i]].fluid;
function minerOre(e) {
  for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) if (solid((e.y + j) * W + e.x + i)) return true;
  return false;
}
function wellTiles(e) {
  const B = BUILD[e.type], l = [];
  for (let j = 0; j < B.h; j++) for (let i = 0; i < B.w; i++) { const q = (e.y + j) * W + e.x + i; if (oily(q)) l.push(q); }
  return l;
}
function wellDraw(e) {
  const l = wellTiles(e);
  if (!l.length) return;
  e.k = ((e.k || 0) + 1) % l.length;
  depleteTile(l[e.k]);
}
function minerDig(e) {
  for (let t = 0; t < 4; t++) {
    const q = (e.k + t) % 4, i = (e.y + (q >> 1)) * W + e.x + (q & 1);
    if (!solid(i)) continue;
    const item = ORES[oreType[i]].item;
    depleteTile(i);
    e.out[item] = (e.out[item] || 0) + 1;
    S.made[item] = (S.made[item] || 0) + 1;
    e.k = (q + 1) % 4;
    return;
  }
}
function depleteTile(i) {
  oreAmt[i]--;
  if (oreAmt[i] <= 0) { oreAmt[i] = 0; oreType[i] = 0; }
  S.dep[i] = oreAmt[i];
  if (oreAmt[i] === 0 || oreAmt[i] === 149) drawTile(i % W, Math.floor(i / W));
}

function tick() {
  const l = lists();
  S.t += DT;
  S.tk = (S.tk || 0) + 1;
  if (S.tk % 30 === 0) { polStep(); hiveStep(); windStep(); }
  if (S.tk % 3 === 0) { cloudStep(DT * 3); fireStep(DT * 3); }
  shellStep();
  for (const e of l.projector) projectorTick(e);
  for (const e of l.gun) gunTick(e);
  for (const e of l.stack) e.puff = (e.puff || 0) * 0.985;
  for (const b of l.belt) beltTick(b);
  for (const s of l.sorter) sorterTick(s);
  for (const p of l.pump) pumpTick(p);
  for (const e of l.booster) boosterTick(e);
  bugStep();
  for (const e of l.turret) turretTick(e);
  fluidStep(l.pairs);
  const fails = [];
  for (const e of l.node) nodeHeat(e, fails);
  const msgs = fails.map(([e, why]) => burst(e, why)).filter(Boolean);
  if (msgs.length) toast(msgs[0] + (msgs.length > 1 ? ` (+${msgs.length - 1} more)` : ''), true);
  let demand = 0;
  for (const e of l.booster) if (e.on) demand += BUILD.booster.kw;
  for (const e of l.machine) {
    if (BUILD[e.type].store) { e.cy = false; continue; }
    const r = RECIPE[e.recipe];
    if (!r) { e.st = 'none'; continue; }
    machineFluidIn(e, r);
    if (r.cat) catSwap(e, r);
    if (!e.cy) e.st = tryStart(e, r) || 'work';
    if (e.cy && BUILD[e.type].kw) demand += BUILD[e.type].kw;
    if (e.desc > 0) e.desc = Math.max(0, e.desc - DT);
    if (e.desc === 0) { e.desc = undefined; e.scale = 0; }
  }
  for (const e of l.miner) {
    e.cy = sum(e.out) < 5 && minerOre(e);
    e.st = e.cy ? 'work' : minerOre(e) ? 'output' : 'empty';
    if (e.cy) demand += BUILD.miner.kw;
  }
  let cap = 0, gcap = 0;
  for (const e of l.machine) if (e.cy && BUILD[e.type].gen) gcap += BUILD[e.type].gen * sunMul(e);
  for (const g of l.engine) { g.eff = g.amt > 0.01 && g.tf >= 99.9 ? 0.2 + 0.8 * Math.max(0, Math.min(1, (g.tf - 100) / 50)) : 0; g.cap = Math.min(1, g.amt) * 900 * g.eff; cap += g.cap; }
  cap += gcap;
  const bats = l.machine.filter(e => BUILD[e.type].store);
  let bout = 0, bch = 0, bmax = 0;
  for (const b of bats) { b.ch = b.ch || 0; b.dmax = Math.min(BUILD[b.type].rate, b.ch / DT); bout += b.dmax; }
  const dis = Math.min(Math.max(0, demand - cap), bout);
  let spare = Math.max(0, cap - demand), chg = 0;
  for (const b of bats) {
    const B = BUILD[b.type], d = bout > 0 ? dis * b.dmax / bout : 0;
    const c = Math.max(0, Math.min(B.rate, (B.store - b.ch) / DT / 0.85, spare));
    spare -= c; chg += c;
    b.ch = Math.max(0, Math.min(B.store, b.ch - d * DT + c * DT * 0.85));
    b.kw = d - c;
    b.st = d > 0.01 ? 'work' : c > 0.01 ? 'charge' : b.ch >= B.store - 1e-6 ? 'full' : 'idle';
    bch += b.ch; bmax += B.store;
  }
  const gen = Math.min(demand, cap + dis), sat = demand > 0 ? gen / demand : 1, load = cap > 0 ? Math.min(1, (Math.min(demand, cap) + chg) / cap) : 0;
  for (const g of l.engine) { g.kw = load * g.cap; g.amt = Math.max(0, g.amt - (g.eff > 0 ? g.kw / 900 / g.eff : 0)); }
  S.power = { gen, demand, cap, sat, bat: bch, bmax, bkw: dis - chg };
  for (const e of l.booster) e.sat = sat;
  for (const e of l.machine) {
    if (!e.cy) continue;
    const r = RECIPE[e.recipe], kw = BUILD[e.type].kw, gn = BUILD[e.type].gen;
    const sp = kw ? sat : gn ? load : 1;
    if (kw && sat < 0.05) e.st = 'power';
    if (gn) { e.kw = gn * sunMul(e) * load; e.st = load < 0.01 ? 'idle' : 'work'; }
    e.prog += DT * sp * catMul(e, r) * scaleMul(e) * forestMul(e) * sunMul(e) / r.t;
    if (e.prog >= 1) finish(e, r);
  }
  for (const e of l.miner) {
    if (!e.cy) continue;
    if (sat < 0.05) e.st = 'power';
    e.prog += DT * sat / MINER_T;
    if (e.prog >= 1) { e.prog -= 1; minerDig(e); }
  }
  for (const e of l.machine) { machineFluidOut(e); pushItems(e, e.out, 'machine'); }
  for (const e of l.miner) pushItems(e, e.out, 'machine');
  for (const e of l.chest) if (e.type === 'chest') pushItems(e, e.store, 'chest');
  if (l.chest.some(e => e.type === 'depot') && (S.orders || []).length < 3 && Math.floor(S.t * 30) % 30 === 0) fillOrders();
  if (mining) {
    const i = mining.y * W + mining.x;
    if (!mouse.l || tool || !solid(i) || occ[i] || mouse.tx !== mining.x || mouse.ty !== mining.y) mining = null;
    else if ((mining.p += DT / 0.5) >= 1) {
      mining.p = 0;
      const item = ORES[oreType[i]].item;
      depleteTile(i);
      give(item, 1);
      S.made[item] = (S.made[item] || 0) + 1;
    }
  }
}

function serialize() {
  const es = [];
  for (const e of ents.values()) {
    const o = Object.assign({}, e);
    delete o.per; delete o.st; delete o.cap; delete o.on; delete o.mv; delete o.ss; delete o.eff; delete o.puff; delete o.sh; delete o.tx; delete o.ty; delete o.tgt;
    es.push(o);
  }
  return JSON.stringify({ v: 1, seed: S.seed, gen: S.gen, inv: S.inv, dep: S.dep, vent: S.vent, spill: S.spill, fails: S.fails, made: S.made, bugs: S.bugs.map(b => ({ x: +b.x.toFixed(2), y: +b.y.toFixed(2), hp: b.hp, mhp: b.mhp, tid: b.tid, hx: b.hx, hy: b.hy, a: b.a, ph: b.ph, bt: b.bt })), evo: S.evo, lost: S.lost, kills: S.kills, hk: S.hk, hv: S.hv, rv: S.rv, rs: S.rs, res: S.res, unl: S.unl, wind: S.wind, clouds: S.clouds.map(c => ({ x: +c.x.toFixed(2), y: +c.y.toFixed(2), g: c.g, m: +c.m.toFixed(2), r: +c.r.toFixed(2), s: c.s })), fires: S.fires, shells: S.shells, orders: S.orders, odone: S.odone, olast: S.olast, pol: S.pol.map(v => Math.round(v * 10) / 10), t: S.t, nextId: S.nextId, cam, help: S.help, ents: es });
}
function save() { try { localStorage.setItem(KEY, serialize()); } catch (e) { } }

function initWorld(seed, g) {
  genMap(seed, g);
  occ = new Int32Array(W * H);
  ents = new Map();
  L = null;
}

function newGame(seed, opts) {
  seed = seed == null ? Math.floor(Math.random() * 1e9) : seed;
  const gen = opts && opts.legacy ? { legacy: 1 } : Object.assign({}, GEN_DEF, opts || {});
  setSize(gen.legacy ? 160 : gen.size);
  closePanel(); fx.length = 0; $('#toast').innerHTML = '';
  S = { seed, inv: Object.assign({}, START_INV), dep: {}, vent: {}, spill: {}, fails: 0, made: {}, pol: new Array(PW * PW).fill(0), t: 0, nextId: 1, help: !!(S && S.help), power: { gen: 0, demand: 0, cap: 0, sat: 1 }, bugs: [], evo: 0, lost: 0, kills: 0, hk: 0, res: {}, unl: {}, clouds: [], fires: [], shells: [], booms: [], wind: { a: Math.random() * 7, v: 0.3 }, orders: [], odone: 0, gen };
  initWorld(seed, gen);
  spawnRuins();
  spawnHives();
  cam = { x: W / 2, y: H / 2, z: 32 };
  tool = null; sel = null;
  drawTerrain();
}

function load() {
  let d;
  try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) { d = null; }
  if (!d || d.v !== 1) return false;
  closePanel(); fx.length = 0; $('#toast').innerHTML = '';
  const gen = d.gen || { legacy: 1 };
  setSize(gen.legacy ? 160 : gen.size);
  S = { seed: d.seed, gen, inv: d.inv || {}, dep: d.dep || {}, vent: d.vent || {}, spill: d.spill || {}, fails: d.fails || 0, made: d.made || {}, pol: d.pol && d.pol.length === PW * PW ? d.pol : new Array(PW * PW).fill(0), t: d.t || 0, nextId: d.nextId || 1, help: !!d.help, power: { gen: 0, demand: 0, cap: 0, sat: 1 }, bugs: d.bugs || [], evo: d.evo || 0, lost: d.lost || 0, kills: d.kills || 0, hk: d.hk || 0, hv: d.hv, rv: d.rv, rs: d.rs || 0, res: d.res || {}, unl: d.unl || {}, clouds: d.clouds || [], fires: d.fires || [], shells: d.shells || [], booms: [], wind: d.wind || { a: 0, v: 0.3 }, orders: d.orders || [], odone: d.odone || 0, olast: d.olast };
  initWorld(d.seed, gen);
  for (const k in S.dep) { const i = +k; oreAmt[i] = S.dep[k]; if (oreAmt[i] <= 0) { oreAmt[i] = 0; oreType[i] = 0; } }
  for (const o of d.ents || []) {
    if (!BUILD[o.type]) continue;
    const e = Object.assign(makeEnt(o.type, o.x, o.y, o.dir), o);
    addEnt(e);
    S.nextId = Math.max(S.nextId, e.id + 1);
  }
  if (!S.rv) spawnRuins();
  if (!S.hv) spawnHives();
  if (d.cam) cam = d.cam;
  drawTerrain();
  return true;
}

let eatEl = null, eatN = 0;
function eatToast(n, e) {
  if (eatEl && eatEl.isConnected && !eatEl.classList.contains('out')) {
    eatN++;
    eatEl.textContent = `${eatN} buildings eaten by crawlers near ${e.x},${e.y}`;
    return;
  }
  eatN = 1;
  eatEl = toast(`${n} at ${e.x},${e.y} was eaten by crawlers`, true);
}
function toast(msg, bad) {
  const t = document.createElement('div');
  t.className = 'toast' + (bad ? ' bad' : '');
  t.textContent = msg;
  const box = $('#toast');
  box.appendChild(t);
  while (box.children.length > 4) box.firstChild.remove();
  setTimeout(() => t.classList.add('out'), 2200);
  setTimeout(() => t.remove(), 2700);
  return t;
}

function resize() {
  const dpr = window.devicePixelRatio || 1;
  cv.width = Math.floor(cv.clientWidth * dpr);
  cv.height = Math.floor(cv.clientHeight * dpr);
}

function screenToTile(sx, sy) {
  const w = cv.clientWidth, h = cv.clientHeight;
  return { fx: (sx - w / 2) / cam.z + cam.x, fy: (sy - h / 2) / cam.z + cam.y };
}

function toolOrigin(type, fx, fy) {
  const B = BUILD[type];
  return { x: Math.floor(fx - B.w / 2 + 0.5), y: Math.floor(fy - B.h / 2 + 0.5) };
}

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, Math.round(((n >> 16) & 255) * f)));
  const g = Math.min(255, Math.max(0, Math.round(((n >> 8) & 255) * f)));
  const b = Math.min(255, Math.max(0, Math.round((n & 255) * f)));
  return `rgb(${r},${g},${b})`;
}

const ST_COL = { idle: '#8ac8e0', scale: '#e04a4a', clean: '#e0b84a', work: '#5fd06a', input: '#e0b84a', output: '#e07a3a', power: '#e04a4a', charge: '#8ad0a0', full: '#5fd06a', none: '#8a8f99', empty: '#8a8f99', forest: '#8a8f99' };
const ST_TXT = { idle: 'Idle, no load', scale: 'Tubes choked with scale', clean: 'Descaling', work: 'Working', input: 'Waiting for inputs', output: 'Output full', power: 'No power', charge: 'Charging', full: 'Fully charged', none: 'No recipe set', empty: 'Depleted', forest: 'No forest in reach' };

function render() {
  const dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight, z = cam.z;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#0d1014';
  ctx.fillRect(0, 0, w, h);
  const ox = w / 2 - cam.x * z, oy = h / 2 - cam.y * z;
  const x0 = Math.max(0, Math.floor(-ox / z)), y0 = Math.max(0, Math.floor(-oy / z));
  const x1 = Math.min(W, Math.ceil((w - ox) / z)), y1 = Math.min(H, Math.ceil((h - oy) / z));
  if (x1 <= x0 || y1 <= y0) return;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tcv, x0 * TP, y0 * TP, (x1 - x0) * TP, (y1 - y0) * TP, ox + x0 * z, oy + y0 * z, (x1 - x0) * z, (y1 - y0) * z);
  if (z >= 20) {
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = x0; x <= x1; x++) { ctx.moveTo(ox + x * z + 0.5, oy + y0 * z); ctx.lineTo(ox + x * z + 0.5, oy + y1 * z); }
    for (let y = y0; y <= y1; y++) { ctx.moveTo(ox + x0 * z, oy + y * z + 0.5); ctx.lineTo(ox + x1 * z, oy + y * z + 0.5); }
    ctx.stroke();
  }
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.strokeRect(ox, oy, W * z, H * z);
  const vis = [];
  for (const e of ents.values()) {
    const B = BUILD[e.type];
    if (e.x + B.w < x0 || e.y + B.h < y0 || e.x > x1 || e.y > y1) continue;
    vis.push(e);
  }
  for (const e of vis) if (kind(e) === 'pipe') drawPipe(e, ox, oy, z);
  for (const e of vis) if (e.type === 'belt') drawBelt(e, ox, oy, z);
  for (const e of vis) if (e.type === 'belt') drawBeltItems(e, ox, oy, z);
  for (const e of vis) if (kind(e) !== 'pipe' && e.type !== 'belt') drawBuilding(e, ox, oy, z);
  drawBugs(ox, oy, z, x0, y0, x1, y1);
  for (const e of vis) if (e.type === 'turret' && S.t - e.sh < 0.07) {
    const c = ctr(e);
    ctx.strokeStyle = 'rgba(255,230,140,0.9)'; ctx.lineWidth = Math.max(1, z * 0.05);
    ctx.beginPath(); ctx.moveTo(ox + (c.x + Math.cos(e.ang) * 0.9) * z, oy + (c.y + Math.sin(e.ang) * 0.9) * z); ctx.lineTo(ox + e.tx * z, oy + e.ty * z); ctx.stroke();
  }
  for (const e of vis) if (e.hp != null && e.hp < maxHp(e) && kind(e) !== 'wall') {
    const B = BUILD[e.type], X = ox + e.x * z, Y = oy + (e.y + B.h) * z - z * 0.16;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(X + 2, Y, B.w * z - 4, z * 0.12);
    ctx.fillStyle = e.hp / maxHp(e) > 0.5 ? '#7fe08a' : e.hp / maxHp(e) > 0.25 ? '#e0b84a' : '#e04a4a';
    ctx.fillRect(X + 2, Y, (B.w * z - 4) * e.hp / maxHp(e), z * 0.12);
  }
  if (overlay !== 3) drawSmog(ox, oy, z);
  drawGas(ox, oy, z);
  if (overlay) drawOverlay(vis, ox, oy, z);
  for (let i = fx.length - 1; i >= 0; i--) {
    const f = fx[i];
    f.t += 1 / 60;
    if (f.t > 1.2) { fx.splice(i, 1); continue; }
    ctx.globalAlpha = Math.max(0, 1 - f.t / 1.2);
    ctx.fillStyle = f.c;
    for (let k = 0; k < 10; k++) {
      const a = k * 0.628 + f.t, r = z * (0.3 + f.t * 1.6) * (0.6 + 0.4 * hash(k, i, 3));
      ctx.beginPath(); ctx.arc(ox + f.x * z + Math.cos(a) * r, oy + f.y * z + Math.sin(a) * r, z * 0.12 * (1.2 - f.t), 0, 7); ctx.fill();
    }
    ctx.strokeStyle = '#ffb347'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(ox + f.x * z, oy + f.y * z, z * (0.2 + f.t * 1.2), 0, 7); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  const se = sel && ents.get(sel);
  if (se) {
    const B = BUILD[se.type];
    ctx.strokeStyle = '#ffd34a';
    ctx.lineWidth = 2;
    ctx.strokeRect(ox + se.x * z + 1, oy + se.y * z + 1, B.w * z - 2, B.h * z - 2);
  }
  if (mining) {
    const cx = ox + (mining.x + 0.5) * z, cy = oy + (mining.y + 0.5) * z;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, z * 0.35, -Math.PI / 2, -Math.PI / 2 + mining.p * Math.PI * 2);
    ctx.stroke();
  }
  if (tool && mouse.in) drawGhost(ox, oy, z);
  else if (mouse.in && mouse.tx >= 0 && mouse.tx < W && mouse.ty >= 0 && mouse.ty < H) {
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(ox + mouse.tx * z + 0.5, oy + mouse.ty * z + 0.5, z - 1, z - 1);
  }
}

function pipeLinks(e, d) {
  const o = at(e.x + DX[d], e.y + DY[d]);
  if (!o) return false;
  const k = kind(o);
  if (k === 'booster') return o.dir % 2 === d % 2;
  return k === 'pipe' || k === 'engine' || k === 'pump' || k === 'machine';
}

function drawPipe(e, ox, oy, z) {
  const P = NP(e), cx = ox + (e.x + 0.5) * z, cy = oy + (e.y + 0.5) * z, t = z * (P.dn >= 100 ? 0.5 : 0.34);
  const rust = Math.min(1, e.wear || 0);
  ctx.fillStyle = rust > 0.05 ? mix(BUILD[e.type].c, '#9a4a1a', rust) : shade(BUILD[e.type].c, 0.8);
  for (let d = 0; d < 4; d++) if (pipeLinks(e, d)) {
    if (DX[d]) ctx.fillRect(DX[d] > 0 ? cx : cx - z / 2, cy - t / 2, z / 2, t);
    else ctx.fillRect(cx - t / 2, DY[d] > 0 ? cy : cy - z / 2, t, z / 2);
  }
  const bw = t * (0.7 + Math.min(0.35, (e.strain || 0) / P.duct * 0.35 || 0));
  ctx.fillRect(cx - bw, cy - bw, bw * 2, bw * 2);
  if (e.strain > 0.01) { ctx.strokeStyle = '#ff4a3a'; ctx.lineWidth = Math.max(1, z * 0.06); ctx.strokeRect(cx - bw, cy - bw, bw * 2, bw * 2); }
  if (P.lined && z >= 12) { ctx.fillStyle = '#c8cce0'; ctx.fillRect(cx - bw, cy - bw, bw * 2, Math.max(1, z * 0.04)); }
  if (e.fl && e.amt > 0.5) {
    ctx.fillStyle = col(e.fl);
    const f = Math.min(1, e.amt / P.v), s = t * 1.1 * Math.sqrt(f);
    ctx.fillRect(cx - s / 2, cy - s / 2, s, s);
  }
}

function mix(a, b, f) {
  const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16);
  const c = sh => Math.round(((x >> sh) & 255) * (1 - f) + ((y >> sh) & 255) * f);
  return `rgb(${c(16)},${c(8)},${c(0)})`;
}

function heat(v, lo, hi) {
  const f = Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
  const h = 240 - f * 240;
  return `hsl(${h},85%,55%)`;
}

function drawSmog(ox, oy, z) {
  let any = false;
  for (let i = 0; i < PW * PW; i++) {
    const v = S.pol[i], a = v < 2 ? 0 : Math.min(0.6, v / 90);
    pimg.data[i * 4] = 150; pimg.data[i * 4 + 1] = 128 - Math.min(40, v / 4); pimg.data[i * 4 + 2] = 60;
    pimg.data[i * 4 + 3] = Math.round(a * 255);
    if (a) any = true;
  }
  if (!any) return;
  pctx.putImageData(pimg, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(pcv, 0, 0, PW, PW, ox, oy, W * z, H * z);
  ctx.imageSmoothingEnabled = false;
  const s = PC * z, t = performance.now() / 1000;
  ctx.lineWidth = Math.max(1, z / 16);
  for (let i = 0; i < PW * PW; i++) {
    const v = S.pol[i];
    if (v <= RAIN) continue;
    const cx = ox + (i % PW) * s, cy = oy + Math.floor(i / PW) * s;
    if (cx > cv.width || cy > cv.height || cx + s < 0 || cy + s < 0) continue;
    const n = Math.min(40, Math.round((v - RAIN) / RAIN * 14) + 6), L = z * 0.5;
    ctx.strokeStyle = `rgba(190,200,120,${Math.min(0.7, 0.3 + (v - RAIN) / RAIN * 0.2)})`;
    ctx.beginPath();
    for (let k = 0; k < n; k++) {
      const hx = hash(i, k, 7), hy = hash(k, i, 11);
      const x = cx + hx * s, y = cy + ((hy + t * 0.8) % 1) * s;
      ctx.moveTo(x, y); ctx.lineTo(x - L * 0.25, y + L);
    }
    ctx.stroke();
  }
}

function drawOverlay(vis, ox, oy, z) {
  ctx.font = `bold ${Math.max(8, Math.floor(z * 0.26))}px system-ui,sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (overlay === 3) {
    const s = PC * z;
    ctx.font = `bold ${Math.max(9, Math.min(18, Math.floor(s * 0.2)))}px system-ui,sans-serif`;
    for (let cy = 0; cy < PW; cy++) for (let cx = 0; cx < PW; cx++) {
      const v = S.pol[cy * PW + cx], x = ox + cx * s, y = oy + cy * s;
      if (x > cv.clientWidth || y > cv.clientHeight || x + s < 0 || y + s < 0) continue;
      ctx.globalAlpha = v < 1 ? 0.12 : 0.5;
      ctx.fillStyle = v > RAIN ? mix('#e04a2a', '#ff1a1a', Math.min(1, (v - RAIN) / RAIN)) : heat(v, 0, RAIN);
      ctx.fillRect(x, y, s, s);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, s, s);
      if (s >= 36 && v >= 1) { ctx.fillStyle = '#000'; ctx.fillText(Math.round(v), x + s / 2, y + s / 2); }
    }
  }
  for (const e of vis) {
    if (overlay === 3) break;
    if (!isNode(e)) continue;
    const B = BUILD[e.type], P = NP(e);
    let c, v, txt;
    if (overlay === 1) { v = pres(e); c = v > P.bar ? '#ff2a2a' : heat(v / Math.min(P.bar, 30), 0, 1); txt = v.toFixed(v < 10 ? 1 : 0); }
    else { v = e.amt > 0.001 ? e.tf : e.tw; c = heat(v, 0, 400); txt = Math.round(v); }
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = c;
    ctx.fillRect(ox + e.x * z, oy + e.y * z, B.w * z, B.h * z);
    ctx.globalAlpha = 1;
    if (z >= 22) { ctx.fillStyle = '#000'; ctx.fillText(txt, ox + (e.x + B.w / 2) * z, oy + (e.y + B.h / 2) * z); }
  }
  const w = cv.clientWidth;
  const lbl = overlay === 1 ? ['Pressure (share of rating)', '0', 'rated', 'red = over rating'] : overlay === 2 ? ['Fluid temperature °C', '0', '400', ''] : ['Smog per 8×8 area', '0', String(RAIN), 'red = acid rain'];
  ctx.fillStyle = 'rgba(10,12,16,0.85)'; ctx.fillRect(w - 230, 10, 220, 52);
  const g = ctx.createLinearGradient(w - 220, 0, w - 20, 0);
  for (let i = 0; i <= 4; i++) g.addColorStop(i / 4, heat(i / 4, 0, 1));
  ctx.fillStyle = g; ctx.fillRect(w - 220, 34, 200, 10);
  ctx.fillStyle = '#ddd'; ctx.font = '12px system-ui,sans-serif'; ctx.textAlign = 'left';
  ctx.fillText(lbl[0] + '  (V)', w - 220, 22);
  ctx.font = '10px system-ui,sans-serif';
  ctx.fillText(lbl[1], w - 220, 54); ctx.textAlign = 'right'; ctx.fillText(lbl[2], w - 20, 54);
  ctx.textAlign = 'center'; ctx.fillStyle = '#ff6a5a'; ctx.fillText(lbl[3], w - 120, 54);
}

function drawBelt(e, ox, oy, z) {
  const x = ox + e.x * z, y = oy + e.y * z;
  ctx.fillStyle = '#2b2b2b';
  ctx.fillRect(x + 1, y + 1, z - 2, z - 2);
  ctx.fillStyle = '#3a3a3a';
  if (DX[e.dir]) { ctx.fillRect(x + 1, y + 1, z - 2, z * 0.12); ctx.fillRect(x + 1, y + z * 0.88 - 1, z - 2, z * 0.12); }
  else { ctx.fillRect(x + 1, y + 1, z * 0.12, z - 2); ctx.fillRect(x + z * 0.88 - 1, y + 1, z * 0.12, z - 2); }
  if (z < 10) return;
  const off = (S.t * 2) % 1;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x + 1, y + 1, z - 2, z - 2);
  ctx.clip();
  ctx.translate(x + z / 2, y + z / 2);
  ctx.rotate(e.dir * Math.PI / 2);
  ctx.strokeStyle = BUILD.belt.c;
  ctx.lineWidth = Math.max(1, z * 0.07);
  for (let k = -1; k < 2; k++) {
    const yy = z / 2 - (k + off) * z / 2 - z / 4;
    ctx.beginPath();
    ctx.moveTo(-z * 0.22, yy + z * 0.12);
    ctx.lineTo(0, yy - z * 0.06);
    ctx.lineTo(z * 0.22, yy + z * 0.12);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBeltItems(e, ox, oy, z) {
  const cx = ox + (e.x + 0.5) * z, cy = oy + (e.y + 0.5) * z, r = Math.max(1.5, z * 0.15);
  for (const it of e.items) {
    const px = cx + DX[e.dir] * (it.p - 0.5) * z, py = cy + DY[e.dir] * (it.p - 0.5) * z;
    ctx.fillStyle = col(it.i);
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
    if (z >= 14) { ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1; ctx.stroke(); }
  }
}

function arrow(cx, cy, d, s, c) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(d * Math.PI / 2);
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.lineTo(s * 0.8, s * 0.4);
  ctx.lineTo(-s * 0.8, s * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawBugs(ox, oy, z, x0, y0, x1, y1) {
  const now = performance.now() / 1000;
  for (const b of S.bugs) {
    if (b.x < x0 - 1 || b.y < y0 - 1 || b.x > x1 + 1 || b.y > y1 + 1) continue;
    const s = z * (0.22 + 0.08 * Math.min(1, b.mhp / 90)), X = ox + b.x * z, Y = oy + b.y * z;
    ctx.save();
    ctx.translate(X, Y); ctx.rotate(b.a);
    const g = Math.sin(now * (b.chew ? 30 : 18) + b.ph);
    ctx.strokeStyle = '#1a1214'; ctx.lineWidth = Math.max(1, s * 0.16);
    ctx.beginPath();
    for (let k = -1; k <= 1; k++) for (const sd of [-1, 1]) {
      const sw = (k % 2 === 0 ? g : -g) * sd * 0.35;
      ctx.moveTo(s * 0.3 * k, sd * s * 0.3);
      ctx.lineTo(s * (0.3 * k + sw), sd * s * 0.95);
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(s * 0.1, s * 0.15, s * 0.95, s * 0.5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#4a3038';
    ctx.beginPath(); ctx.ellipse(-s * 0.35, 0, s * 0.6, s * 0.45, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#5e3c46';
    ctx.beginPath(); ctx.ellipse(s * 0.3, 0, s * 0.42, s * 0.36, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#d8c84a'; ctx.lineWidth = Math.max(1, s * 0.1);
    ctx.beginPath(); ctx.moveTo(-s * 0.5, -s * 0.38); ctx.lineTo(-s * 0.5, s * 0.38); ctx.moveTo(-s * 0.2, -s * 0.42); ctx.lineTo(-s * 0.2, s * 0.42); ctx.stroke();
    ctx.strokeStyle = '#2a1a1e'; ctx.lineWidth = Math.max(1, s * 0.12);
    const m = b.chew ? 0.25 + 0.2 * g : 0.25;
    ctx.beginPath(); ctx.moveTo(s * 0.65, -s * 0.15); ctx.lineTo(s * 1.05, -s * m); ctx.moveTo(s * 0.65, s * 0.15); ctx.lineTo(s * 1.05, s * m); ctx.stroke();
    ctx.restore();
    if (b.hp < b.mhp && z >= 12) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(X - s, Y - s * 1.4, s * 2, Math.max(2, z * 0.06));
      ctx.fillStyle = '#e04a4a'; ctx.fillRect(X - s, Y - s * 1.4, s * 2 * Math.max(0, b.hp / b.mhp), Math.max(2, z * 0.06));
    }
  }
}
function drawHive(e, x, y, w, h, z) {
  const now = performance.now() / 1000, pu = 1 + 0.04 * Math.sin(now * 2 + e.id), cx = x + w / 2, cy = y + h / 2;
  ctx.fillStyle = 'rgba(40,20,30,0.45)';
  ctx.beginPath(); ctx.ellipse(cx, cy + h * 0.08, w * 0.62, h * 0.5, 0, 0, 7); ctx.fill();
  const g = ctx.createRadialGradient(cx - w * 0.12, cy - h * 0.15, w * 0.05, cx, cy, w * 0.55 * pu);
  g.addColorStop(0, '#9a6a7a'); g.addColorStop(0.6, '#6a4252'); g.addColorStop(1, '#3a2230');
  ctx.fillStyle = g;
  ctx.beginPath();
  for (let k = 0; k <= 16; k++) {
    const a = k / 16 * Math.PI * 2, r = w * 0.5 * pu * (0.85 + 0.15 * hash(k, e.id, 5));
    k ? ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.9) : ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.9);
  }
  ctx.fill();
  ctx.fillStyle = '#1a0c12';
  for (let k = 0; k < 5; k++) {
    const a = hash(k, e.id, 9) * 7, r = w * (0.1 + 0.25 * hash(e.id, k, 4));
    ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * r, cy + Math.sin(a) * r, w * 0.07, h * 0.05, a, 0, 7); ctx.fill();
  }
  const f = Math.min(1, e.food / 50);
  if (f > 0.05) {
    ctx.fillStyle = `rgba(216,200,74,${0.25 + 0.5 * f * (0.6 + 0.4 * Math.sin(now * 4 + e.id))})`;
    ctx.beginPath(); ctx.arc(cx, cy, w * 0.12, 0, 7); ctx.fill();
  }
}
function drawWall(e, x, y, z) {
  const B = BUILD[e.type], con = e.type === 'concrete_wall';
  ctx.fillStyle = shade(B.c, 0.5);
  ctx.fillRect(x, y, z, z);
  ctx.fillStyle = B.c;
  ctx.fillRect(x + z * 0.06, y + z * 0.04, z * 0.88, z * 0.84);
  ctx.strokeStyle = shade(B.c, 0.7); ctx.lineWidth = Math.max(1, z * 0.04);
  ctx.beginPath();
  if (con) { ctx.moveTo(x + z * 0.5, y + z * 0.04); ctx.lineTo(x + z * 0.5, y + z * 0.88); ctx.moveTo(x + z * 0.06, y + z * 0.46); ctx.lineTo(x + z * 0.94, y + z * 0.46); }
  else for (let r = 0; r < 4; r++) {
    const yy = y + z * (0.04 + r * 0.21);
    ctx.moveTo(x + z * 0.06, yy); ctx.lineTo(x + z * 0.94, yy);
    const o = r % 2 ? 0.25 : 0.5;
    ctx.moveTo(x + z * o, yy); ctx.lineTo(x + z * o, yy + z * 0.21);
    if (o === 0.25) { ctx.moveTo(x + z * 0.75, yy); ctx.lineTo(x + z * 0.75, yy + z * 0.21); }
  }
  ctx.stroke();
  const d = 1 - e.hp / maxHp(e);
  if (d > 0.05) {
    ctx.strokeStyle = 'rgba(20,10,10,0.8)'; ctx.lineWidth = Math.max(1, z * 0.05);
    ctx.beginPath();
    for (let k = 0; k < Math.ceil(d * 4); k++) {
      const a = hash(k, e.id, 2), b2 = hash(e.id, k, 3);
      ctx.moveTo(x + z * a, y + z * 0.1); ctx.lineTo(x + z * (a + b2 - 0.5) * 0.8, y + z * 0.5); ctx.lineTo(x + z * b2, y + z * 0.85);
    }
    ctx.stroke();
  }
}
function drawProjector(e, x, y, w, h, z) {
  const B = BUILD[e.type];
  ctx.fillStyle = '#4a4034';
  ctx.fillRect(x + z * 0.08, y + z * 0.08, w - z * 0.16, h - z * 0.16);
  ctx.fillStyle = '#5e5244';
  ctx.fillRect(x + z * 0.18, y + z * 0.18, w - z * 0.36, h - z * 0.36);
  const dx = Math.cos(e.ang) * z * 0.12, dy = Math.sin(e.ang) * z * 0.12;
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
    const cx = x + w * (0.27 + i * 0.23), cy = y + h * (0.27 + j * 0.23);
    ctx.fillStyle = shade(B.c, 0.8);
    ctx.beginPath(); ctx.arc(cx, cy, z * 0.17, 0, 7); ctx.fill();
    ctx.fillStyle = '#141210';
    ctx.beginPath(); ctx.arc(cx + dx, cy + dy, z * 0.11, 0, 7); ctx.fill();
  }
  const ks = PAYLOADS.filter(q => e.pay[q] > 0);
  let n = 0;
  for (const q of ks) for (let m = 0; m < e.pay[q] && n < PROJ_CAP; m++, n++) {
    ctx.fillStyle = q === 'he_drum' ? '#c05030' : q === 'cl2_cyl' ? '#b8d040' : q === 'phos_cyl' ? '#d8d8c0' : '#d8e4f4';
    ctx.fillRect(x + z * 0.2 + n * z * 0.26, y + h - z * 0.3, z * 0.2, z * 0.14);
  }
  const f = Math.min(1, e.pw / POW_CAP);
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x + w - z * 0.27, y + z * 0.2, z * 0.1, h - z * 0.55);
  ctx.fillStyle = f > 0 ? '#606060' : '#e04a4a';
  ctx.fillRect(x + w - z * 0.27, y + z * 0.2 + (h - z * 0.55) * (1 - f), z * 0.1, (h - z * 0.55) * f || Math.max(1, z * 0.04));
  const age = S.t - e.sh;
  if (age < 1.2) {
    ctx.globalAlpha = Math.max(0, 0.7 - age * 0.6);
    ctx.fillStyle = '#d8d0c0';
    for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(x + w / 2 + Math.cos(e.ang) * z * age * (0.6 + k * 0.2) + (hash(k, e.id, 5) - 0.5) * z, y + h / 2 + Math.sin(e.ang) * z * age * (0.6 + k * 0.2) + (hash(e.id, k, 5) - 0.5) * z - age * z * 0.6, z * (0.2 + age * 0.4), 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
    if (age < 0.08) { ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.arc(x + w / 2 + dx * 3, y + h / 2 + dy * 3, z * 0.3, 0, 7); ctx.fill(); }
  }
}
function drawRuin(e, x, y, w, h, z) {
  ctx.fillStyle = '#3e3a36';
  ctx.fillRect(x + z * 0.1, y + z * 0.1, w - z * 0.2, h - z * 0.2);
  for (let k = 0; k < 9; k++) {
    ctx.fillStyle = k % 2 ? '#4a4540' : '#35322e';
    ctx.fillRect(x + (k % 3) * z + z * 0.15, y + Math.floor(k / 3) * z + z * 0.15, z * 0.7 * (0.6 + 0.4 * hash(k, e.id, 2)), z * 0.7 * (0.6 + 0.4 * hash(e.id, k, 2)));
  }
  ctx.fillStyle = '#7a5a48';
  ctx.fillRect(x + z * 0.1, y + z * 0.1, w * 0.7, z * 0.25);
  ctx.fillRect(x + z * 0.1, y + z * 0.1, z * 0.25, h * 0.55);
  ctx.fillRect(x + w - z * 0.35, y + h * 0.5, z * 0.25, h * 0.5 - z * 0.1);
  ctx.fillStyle = '#5a4234';
  ctx.fillRect(x + w * 0.7 + z * 0.1, y + z * 0.1, z * 0.3, z * 0.25);
  ctx.fillStyle = '#8a5a3a';
  ctx.beginPath(); ctx.arc(x + w * 0.66, y + h * 0.38, z * 0.55, 0, 7); ctx.fill();
  ctx.fillStyle = '#6a4228';
  ctx.beginPath(); ctx.arc(x + w * 0.66, y + h * 0.38, z * 0.4, 0, 7); ctx.fill();
  ctx.fillStyle = '#9a6a42';
  ctx.fillRect(x + w * 0.3, y + h * 0.62, z * 0.6, z * 0.5);
  ctx.strokeStyle = '#2a2420'; ctx.lineWidth = Math.max(1, z * 0.04);
  ctx.beginPath(); ctx.moveTo(x + w * 0.2, y + h * 0.9); ctx.lineTo(x + w * 0.45, y + h * 0.55); ctx.lineTo(x + w * 0.4, y + h * 0.3); ctx.stroke();
  if (!e.done) {
    const t = performance.now() / 1000, a = 0.5 + 0.5 * Math.sin(t * 3 + e.id);
    ctx.globalAlpha = 0.4 + 0.6 * a;
    ctx.fillStyle = '#ffe68a';
    const gx = x + w * 0.45, gy = y + h * 0.72, r = z * (0.12 + 0.1 * a);
    ctx.beginPath(); ctx.moveTo(gx, gy - r * 2); ctx.lineTo(gx + r * 0.5, gy); ctx.lineTo(gx, gy + r * 2); ctx.lineTo(gx - r * 0.5, gy); ctx.fill();
    ctx.beginPath(); ctx.moveTo(gx - r * 2, gy); ctx.lineTo(gx, gy + r * 0.5); ctx.lineTo(gx + r * 2, gy); ctx.lineTo(gx, gy - r * 0.5); ctx.fill();
    ctx.globalAlpha = 1;
  }
}
function drawFires(ox, oy, z) {
  const t = performance.now() / 1000;
  for (const f of S.fires) {
    const k = f.t < f.T * 0.6 ? 1 : Math.max(0, (f.T - f.t) / (f.T * 0.4));
    const g = ctx.createRadialGradient(ox + f.x * z, oy + f.y * z, 0, ox + f.x * z, oy + f.y * z, f.r * z);
    g.addColorStop(0, `rgba(255,190,90,${0.45 * k})`); g.addColorStop(0.6, `rgba(220,90,30,${0.25 * k})`); g.addColorStop(1, 'rgba(120,40,10,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ox + f.x * z, oy + f.y * z, f.r * z, 0, 7); ctx.fill();
    for (let n = 0; n < 14; n++) {
      const a = hash(n, 3, Math.floor(f.s)) * 6.28, d = Math.sqrt(hash(n, 5, Math.floor(f.s))) * f.r * 0.9;
      const fl = 0.6 + 0.4 * Math.sin(t * 9 + n * 2.1 + f.s), px = ox + (f.x + Math.cos(a) * d) * z, py = oy + (f.y + Math.sin(a) * d) * z;
      ctx.globalAlpha = k * fl;
      ctx.fillStyle = n % 3 ? '#ff9a3a' : '#fff2b0';
      ctx.beginPath(); ctx.ellipse(px, py - z * 0.08 * fl, z * 0.1, z * 0.18 * fl, 0, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
function drawGas(ox, oy, z) {
  drawFires(ox, oy, z);
  for (const c of S.clouds) {
    const G = GAS[c.g], k = c.m / (Math.PI * c.r * c.r), a = Math.min(0.75, 0.15 + k * 1.2) * (G.vis || 1);
    if (a < 0.02) continue;
    const t = performance.now() / 1000;
    for (let n = 0; n < 5; n++) {
      const px = ox + (c.x + Math.cos(n * 1.26 + t * 0.2 + c.s) * c.r * 0.35) * z, py = oy + (c.y + Math.sin(n * 1.26 + t * 0.2 + c.s) * c.r * 0.35) * z, R = c.r * z * (n ? 0.75 : 1);
      const g = ctx.createRadialGradient(px, py, 0, px, py, R);
      g.addColorStop(0, `rgba(${G.rgb},${a * (n ? 0.5 : 0.8)})`);
      g.addColorStop(1, `rgba(${G.rgb},0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(px, py, R, 0, 7); ctx.fill();
    }
  }
  for (const s of S.shells) {
    const f = Math.min(1, s.t / s.T), X = s.sx + (s.tx - s.sx) * f, Y = s.sy + (s.ty - s.sy) * f, hgt = Math.sin(Math.PI * f) * s.T * 3;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(ox + X * z, oy + Y * z, z * 0.2, z * 0.1, 0, 0, 7); ctx.fill();
    ctx.fillStyle = s.k === 'shell' ? '#3a3a30' : s.k === 'wp_shell' ? '#e8e4d8' : s.k === 'he_drum' ? '#c05030' : s.k === 'cl2_cyl' ? '#b8d040' : s.k === 'phos_cyl' ? '#d8d8c0' : '#d8e4f4';
    ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(ox + X * z, oy + (Y - hgt) * z, z * (s.k === 'shell' || s.k === 'wp_shell' ? 0.1 : 0.16), 0, 7); ctx.fill(); ctx.stroke();
  }
  for (const b of S.booms) {
    const f = b.t / 0.8;
    ctx.globalAlpha = Math.max(0, 1 - f);
    ctx.fillStyle = '#fff2c0';
    if (f < 0.25) { ctx.beginPath(); ctx.arc(ox + b.x * z, oy + b.y * z, z * (0.8 + f * 6), 0, 7); ctx.fill(); }
    ctx.strokeStyle = '#ffb347'; ctx.lineWidth = Math.max(2, z * 0.12);
    ctx.beginPath(); ctx.arc(ox + b.x * z, oy + b.y * z, z * (0.5 + f * 4), 0, 7); ctx.stroke();
    ctx.globalAlpha = 1;
  }
}
function drawTurret(e, x, y, w, h, z) {
  const B = BUILD[e.type], cx = x + w / 2, cy = y + h / 2;
  ctx.fillStyle = shade(B.c, 0.5);
  ctx.fillRect(x + z * 0.1, y + z * 0.1, w - z * 0.2, h - z * 0.2);
  ctx.fillStyle = shade(B.c, 0.8);
  ctx.beginPath(); ctx.arc(cx, cy, w * 0.38, 0, 7); ctx.fill();
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(e.ang);
  const rc = S.t - e.sh < 0.08 ? z * 0.08 : 0;
  ctx.fillStyle = '#2a2e2a';
  ctx.fillRect(z * 0.1 - rc, -z * 0.09, z * 0.85, z * 0.18);
  ctx.fillStyle = B.c;
  ctx.beginPath(); ctx.arc(0, 0, w * 0.24, 0, 7); ctx.fill();
  ctx.fillStyle = shade(B.c, 1.3);
  ctx.fillRect(-w * 0.12, -w * 0.12, w * 0.12, w * 0.08);
  if (S.t - e.sh < 0.05) { ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.arc(z * 0.98, 0, z * 0.14, 0, 7); ctx.fill(); }
  ctx.restore();
  const f = Math.min(1, e.ammo / TUR_CAP);
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x + z * 0.15, y + z * 0.15, z * 0.12, h - z * 0.3);
  ctx.fillStyle = f > 0 ? '#c8a040' : '#e04a4a';
  ctx.fillRect(x + z * 0.15, y + z * 0.15 + (h - z * 0.3) * (1 - f), z * 0.12, (h - z * 0.3) * f || Math.max(1, z * 0.04));
}

function drawGun(e, x, y, w, h, z) {
  const B = BUILD[e.type], cx = x + w / 2, cy = y + h / 2, age = S.t - e.sh;
  ctx.fillStyle = '#4a4436';
  ctx.beginPath(); ctx.ellipse(cx, cy, w * 0.48, h * 0.48, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#6a604c';
  for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * w * 0.42, cy + Math.sin(a) * h * 0.42, z * 0.12, 0, 7); ctx.fill(); }
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(e.ang);
  const rc = age < 0.3 ? z * 0.25 * (1 - age / 0.3) : 0;
  ctx.fillStyle = shade(B.c, 0.6);
  ctx.fillRect(-z * 0.9, -z * 0.1, z * 0.8, z * 0.07); ctx.fillRect(-z * 0.9, z * 0.03, z * 0.8, z * 0.07);
  ctx.fillStyle = '#2a2a24';
  ctx.beginPath(); ctx.arc(-z * 0.55, -z * 0.42, z * 0.2, 0, 7); ctx.arc(-z * 0.55, z * 0.42, z * 0.2, 0, 7); ctx.fill();
  ctx.fillStyle = B.c;
  ctx.fillRect(-z * 0.4, -z * 0.38, z * 0.6, z * 0.76);
  ctx.fillStyle = '#2e3026';
  ctx.fillRect(z * 0.05 - rc, -z * 0.11, z * 1.0, z * 0.22);
  ctx.fillStyle = '#1a1a16';
  ctx.fillRect(z * 0.95 - rc, -z * 0.13, z * 0.12, z * 0.26);
  ctx.fillStyle = shade(B.c, 1.3);
  ctx.fillRect(-z * 0.3, -z * 0.3, z * 0.25, z * 0.12);
  if (age < 0.07) { ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.arc(z * 1.25, 0, z * 0.32, 0, 7); ctx.fill(); }
  ctx.restore();
  if (age < 1.5) {
    ctx.globalAlpha = Math.max(0, 0.6 - age * 0.4);
    ctx.fillStyle = '#d0c8b8';
    for (let k = 0; k < 5; k++) { const d = z * (1.1 + age * (1 + k * 0.4)); ctx.beginPath(); ctx.arc(cx + Math.cos(e.ang) * d + (hash(k, e.id, 7) - 0.5) * z * 0.6, cy + Math.sin(e.ang) * d - age * z * 0.5, z * (0.25 + age * 0.35), 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  for (let n = 0; n < Math.min(e.ammo + (e.wp || 0), GUN_CAP); n++) {
    ctx.fillStyle = '#b08a40'; ctx.fillRect(x + z * 0.14 + (n % 6) * z * 0.12, y + h - z * (n < 6 ? 0.3 : 0.5), z * 0.08, z * 0.16);
    ctx.fillStyle = n < (e.wp || 0) ? '#f0ecdc' : '#3a3a30'; ctx.fillRect(x + z * 0.14 + (n % 6) * z * 0.12, y + h - z * (n < 6 ? 0.36 : 0.56), z * 0.08, z * 0.07);
  }
}

function drawBuilding(e, ox, oy, z) {
  const B = BUILD[e.type], x = ox + e.x * z, y = oy + e.y * z, w = B.w * z, h = B.h * z, p = Math.max(1, z * 0.06);
  if (B.kind === 'hive') return drawHive(e, x, y, w, h, z);
  if (B.kind === 'wall') return drawWall(e, x, y, z);
  if (B.kind === 'turret') return drawTurret(e, x, y, w, h, z);
  if (B.kind === 'projector') return drawProjector(e, x, y, w, h, z);
  if (B.kind === 'gun') return drawGun(e, x, y, w, h, z);
  if (B.kind === 'ruin') return drawRuin(e, x, y, w, h, z);
  ctx.fillStyle = shade(B.c, 0.55);
  ctx.fillRect(x + p, y + p, w - 2 * p, h - 2 * p);
  ctx.fillStyle = B.c;
  ctx.fillRect(x + p * 2, y + p * 2, w - 4 * p, h - 4 * p);
  ctx.fillStyle = shade(B.c, 1.25);
  ctx.fillRect(x + p * 2, y + p * 2, w - 4 * p, Math.max(1, p));
  if (e.type === 'sorter') {
    arrow(x + w / 2, y + h / 2, e.dir, z * 0.28, '#1a1a1a');
    if (e.filter) { ctx.fillStyle = col(e.filter); ctx.fillRect(x + p * 3, y + p * 3, z * 0.22, z * 0.22); }
    if (e.buf && z >= 14) { ctx.fillStyle = col(e.buf); ctx.beginPath(); ctx.arc(x + w - z * 0.25, y + h - z * 0.25, z * 0.12, 0, 7); ctx.fill(); }
    return;
  }
  if (e.type === 'booster') {
    ctx.fillStyle = shade(B.c, 0.6);
    if (DX[e.dir]) ctx.fillRect(x, y + h * 0.33, w, h * 0.34); else ctx.fillRect(x + w * 0.33, y, w * 0.34, h);
    ctx.fillStyle = '#cfe4ff';
    ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, z * 0.25, 0, 7); ctx.fill();
    arrow(x + w / 2, y + h / 2, e.dir, z * 0.2, e.on ? '#1a4a8a' : '#556');
    return;
  }
  if (e.type === 'pump') {
    ctx.fillStyle = '#9ad0ff';
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2, z * 0.16 * (e.on ? 1 + 0.2 * Math.sin(S.t * 10) : 1), 0, 7);
    ctx.fill();
    return;
  }
  if (e.type === 'stack') {
    const cx = x + w / 2, cy = y + h / 2;
    ctx.fillStyle = shade(B.c, 0.7); ctx.beginPath(); ctx.arc(cx, cy, z * 0.4, 0, 7); ctx.fill();
    ctx.fillStyle = '#1a1614'; ctx.beginPath(); ctx.arc(cx, cy, z * 0.24, 0, 7); ctx.fill();
    ctx.strokeStyle = '#c8b8a8'; ctx.lineWidth = Math.max(1, z * 0.05); ctx.beginPath(); ctx.arc(cx, cy, z * 0.33, 0, 7); ctx.stroke();
    const pf = Math.min(1, e.puff || 0);
    if (pf > 0.03) for (let k = 0; k < 6; k++) {
      const t = (S.t * 0.6 + k / 6) % 1;
      ctx.globalAlpha = pf * 0.55 * (1 - t);
      ctx.fillStyle = '#9a9488';
      ctx.beginPath(); ctx.arc(cx + t * z * 1.6, cy - t * z * 2.2, z * (0.2 + t * 0.5), 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    return;
  }
  if (e.type === 'depot') {
    ctx.strokeStyle = 'rgba(30,30,30,0.8)'; ctx.lineWidth = Math.max(1, p);
    for (const f of [0.3, 0.7]) { ctx.beginPath(); ctx.moveTo(x + p * 2, y + h * f); ctx.lineTo(x + w - p * 2, y + h * f); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(120,90,60,0.9)';
    for (let k = 1; k < 9; k++) { const tx = x + w * k / 9; ctx.beginPath(); ctx.moveTo(tx, y + h * 0.24); ctx.lineTo(tx, y + h * 0.76); ctx.stroke(); }
    if (z >= 14 && S.orders) S.orders.forEach((a, k) => { const O = ORDERS[a.i]; ctx.fillStyle = '#222'; ctx.fillRect(x + p * 3, y + h * (0.82 + k * 0.05), w - p * 6, h * 0.035); ctx.fillStyle = '#7fe08a'; ctx.fillRect(x + p * 3, y + h * (0.82 + k * 0.05), (w - p * 6) * a.got / O.n, h * 0.035); });
    return;
  }
  if (e.type === 'chest') {
    ctx.fillStyle = shade(B.c, 0.6);
    ctx.fillRect(x + p * 2, y + h * 0.42, w - 4 * p, Math.max(1, p * 1.5));
    if (z >= 18) {
      const n = sum(e.store);
      if (n) { ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.floor(z * 0.3)}px system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(fmt(n), x + w / 2, y + h * 0.72); }
    }
    return;
  }
  if (e.type === 'engine' && z >= 10) {
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(S.t * (e.kw / 900) * 8);
    ctx.strokeStyle = 'rgba(20,20,20,0.7)';
    ctx.lineWidth = Math.max(1, z * 0.08);
    ctx.beginPath();
    ctx.arc(0, 0, z * 0.55, 0, 7);
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * z * 0.55, Math.sin(a) * z * 0.55); }
    ctx.stroke();
    ctx.restore();
    const f = Math.min(1, e.amt / 60);
    ctx.fillStyle = '#222';
    ctx.fillRect(x + p * 3, y + h - p * 3 - z * 0.12, w - p * 6, z * 0.12);
    ctx.fillStyle = FLUIDS.steam.c;
    ctx.fillRect(x + p * 3, y + h - p * 3 - z * 0.12, (w - p * 6) * f, z * 0.12);
  }
  if (e.type === 'solar' && z >= 8) {
    const cw = (w - p * 6) / 4, chh = (h - p * 6) / 3;
    for (let j = 0; j < 3; j++) for (let i = 0; i < 4; i++) {
      ctx.fillStyle = '#1a2a5a';
      ctx.fillRect(x + p * 3 + i * cw + 1, y + p * 3 + j * chh + 1, cw - 2, chh - 2);
      ctx.fillStyle = 'rgba(160,190,255,0.18)';
      ctx.fillRect(x + p * 3 + i * cw + 1, y + p * 3 + j * chh + 1, cw - 2, (chh - 2) * 0.35);
    }
  }
  if (BUILD[e.type].store && z >= 6) {
    const f = (e.ch || 0) / BUILD[e.type].store, bw = w * 0.5, bh = h * 0.5, bx = x + (w - bw) / 2, by = y + (h - bh) / 2;
    ctx.fillStyle = '#1a1e24'; ctx.fillRect(bx, by, bw, bh);
    ctx.fillRect(bx + bw * 0.35, by - bh * 0.1, bw * 0.3, bh * 0.1);
    ctx.fillStyle = f > 0.5 ? '#5fd06a' : f > 0.2 ? '#e0b84a' : '#e04a4a';
    ctx.fillRect(bx + 2, by + 2 + (bh - 4) * (1 - f), bw - 4, (bh - 4) * f);
  }
  if (e.type === 'wind_turbine' && z >= 6) {
    const cx = x + w / 2, cy = y + h / 2, R = Math.min(w, h) * 0.46, a0 = S.t * 0.25 * windCurve() + e.id;
    ctx.fillStyle = '#8a9098';
    ctx.beginPath(); ctx.arc(cx, cy, Math.max(2, R * 0.16), 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f4f6f8'; ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;
    for (let k = 0; k < 3; k++) {
      const a = a0 + k * Math.PI * 2 / 3, ca = Math.cos(a), sa = Math.sin(a), bw = R * 0.09;
      ctx.beginPath();
      ctx.moveTo(cx - sa * bw, cy + ca * bw);
      ctx.lineTo(cx + ca * R, cy + sa * R);
      ctx.lineTo(cx + sa * bw, cy - ca * bw);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = '#c0c6cc';
    ctx.beginPath(); ctx.arc(cx, cy, Math.max(1.5, R * 0.08), 0, Math.PI * 2); ctx.fill();
  }
  if (z >= 14 && B.ab && e.type !== 'engine' && e.type !== 'solar' && e.type !== 'wind_turbine') {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.font = `bold ${Math.floor(Math.min(w, h) * 0.26)}px system-ui,sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(B.ab, x + w / 2, y + h / 2);
  }
  if (kind(e) === 'machine' && e.recipe) {
    const r = RECIPE[e.recipe], k = Object.keys(r.o || r.fo || {})[0];
    const s = Math.max(4, z * 0.32);
    if (k) {
      ctx.fillStyle = '#111';
      ctx.fillRect(x + p * 3 - 1, y + p * 3 - 1, s + 2, s + 2);
      ctx.fillStyle = col(k);
      ctx.fillRect(x + p * 3, y + p * 3, s, s);
    }
  }
  if ((kind(e) === 'machine' || kind(e) === 'miner') && e.st) {
    if (e.cy) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(x + p * 3, y + h - p * 3 - z * 0.12, w - p * 6, z * 0.12);
      ctx.fillStyle = '#7fe08a';
      ctx.fillRect(x + p * 3, y + h - p * 3 - z * 0.12, (w - p * 6) * Math.min(1, e.prog), z * 0.12);
    }
    const st = e.cy && e.st !== 'power' && e.st !== 'idle' ? 'work' : e.st;
    ctx.fillStyle = ST_COL[st] || '#888';
    ctx.beginPath();
    ctx.arc(x + w - p * 3 - z * 0.12, y + p * 3 + z * 0.12, Math.max(2, z * 0.11), 0, 7);
    ctx.fill();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawGhost(ox, oy, z) {
  const B = BUILD[tool], o = toolOrigin(tool, mouse.fx, mouse.fy);
  const err = canPlace(tool, o.x, o.y);
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = B.c;
  ctx.fillRect(ox + o.x * z, oy + o.y * z, B.w * z, B.h * z);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = err ? '#ff5a5a' : '#7fff8a';
  ctx.lineWidth = 2;
  ctx.strokeRect(ox + o.x * z + 1, oy + o.y * z + 1, B.w * z - 2, B.h * z - 2);
  if (tool === 'belt' || tool === 'sorter' || tool === 'booster') arrow(ox + (o.x + 0.5) * z, oy + (o.y + 0.5) * z, toolDir, z * 0.28, '#fff');
}

function tileInfo(x, y) {
  if (x < 0 || y < 0 || x >= W || y >= H) return '';
  const s = tileInfo0(x, y), p = polAt(x, y);
  return p < 1 ? s : s + `${s ? '<br>' : ''}<span class="${p > RAIN ? 'bad' : 'dim'}">Smog ${Math.round(p)}${p > RAIN ? ', acid rain' : ''}</span>`;
}
function tileInfo0(x, y) {
  const e = at(x, y);
  if (e) {
    const B = BUILD[e.type];
    let s = `<b>${B.n}</b>`;
    if (kind(e) === 'machine') s += `<br>${e.recipe ? RECIPE[e.recipe].n : 'No recipe'} · ${ST_TXT[e.cy && e.st !== 'power' && e.st !== 'idle' ? 'work' : e.st] || ''}`;
    if (kind(e) === 'pipe') s += `<br>${e.fl && e.amt > 0.01 ? nm(e.fl) + ' · ' + pres(e).toFixed(1) + ' bar · ' + Math.round(e.tf) + '°C' : 'Empty' + (e.fl ? ' (' + nm(e.fl) + ')' : '')}<br><span class="dim">${NP(e).mat}, DN${NP(e).dn}, rated ${NP(e).bar} bar</span>`;
    if (e.type === 'engine') s += `<br>${Math.round(e.kw)} kW · steam ${pres(e).toFixed(1)} bar · ${Math.round(e.tf)}°C`;
    if (e.type === 'booster') s += `<br>Outlet ${e.head} bar · ${Math.round(e.fr)}/s`;
    if (e.type === 'belt' && e.items.length) s += `<br>${e.items.map(i => nm(i.i)).join(', ')}`;
    if (e.type === 'chest') s += `<br>${sum(e.store)}/400 items`;
    if (e.type === 'boiler' && e.scale > 0.01) s += `<br>Scale ${Math.round(e.scale * 100)}%`;
    if (e.type === 'depot') s += `<br>${(S.orders || []).map(a => nm(ORDERS[a.i].item) + ' ' + a.got + '/' + ORDERS[a.i].n).join('<br>') || 'No open orders'}`;
    if (e.type === 'stack') s += `<br>${stackUsers(e).length} machines venting through it`;
    if (kind(e) === 'hive') s += `<br>Food ${Math.round(e.food)}/50 · ${e.sw} swarms sent`;
    if (e.type === 'projector') s += `<br>${sum(e.pay)} rounds loaded · ${e.pw} powder · ${e.shots} fired`;
    if (e.type === 'howitzer') s += `<br>${e.ammo} HE${e.wp ? ' + ' + e.wp + ' WP' : ''} shells · ${e.shots} fired`;
    if (e.type === 'ruin') s += `<br>${e.done ? 'Searched' : guards(e).length ? guards(e).length + ' hives on guard' : 'Unguarded: click to search'}`;
    if (e.type === 'turret') s += `<br>${e.ammo} cartridges + ${e.rd} rounds · ${e.kills} kills`;
    if (e.hp != null && e.hp < maxHp(e)) s += `<br><span class="bad">Integrity ${Math.round(e.hp)}/${maxHp(e)}</span>`;
    return s;
  }
  const i = y * W + x;
  if (oily(i)) return `<b>Oil seep</b><br>${fmt(oreAmt[i])} left · <span class="dim">Crude oil seeps up through the soil here. Drill it with a pumpjack</span>`;
  if (oreType[i]) return `<b>${nm(ORES[oreType[i]].item)}</b><br>${fmt(oreAmt[i])} left · <span class="dim">${ITEMS[ORES[oreType[i]].item].f}</span><br><span class="dim">Click and hold to mine by hand</span>`;
  return x >= 0 && y >= 0 && x < W && y < H && terrain[i] ? `<b>${TER_N[terrain[i]]}</b>` : '';
}

function powerHtml() {
  const p = S.power;
  const pct = Math.round(p.sat * 100);
  const cls = p.demand === 0 ? '' : pct >= 99 ? 'ok' : pct > 40 ? 'warn' : 'bad';
  return `<span class="lbl">Power</span><b class="${cls}">${fmt(p.gen)}</b> / ${fmt(p.demand)} kW <span class="dim">(cap ${fmt(p.cap)})</span> <span class="${cls}">${p.demand ? pct + '%' : 'idle'}</span>` + (p.bmax ? ` <span class="lbl">Battery</span><b>${Math.round(p.bat / p.bmax * 100)}%</b><span class="dim"> ${p.bkw > 0.5 ? '▼ ' + fmt(p.bkw) + ' kW' : p.bkw < -0.5 ? '▲ ' + fmt(-p.bkw) + ' kW' : ''}</span>` : '');
}
function stackUsers(st) {
  const u = [];
  for (const p of st.per) { const o = at(p.x, p.y); if (o && kind(o) === 'machine' && !u.includes(o)) u.push(o); }
  return u;
}
function ventHtml() {
  const pk = Math.max(0, ...S.pol);
  const t = sum(S.vent);
  const parts = Object.keys(S.vent).filter(f => S.vent[f] >= 1).map(f => `${nm(f)} ${fmt(S.vent[f])}`).join(', ');
  const sp = sum(S.spill || {});
  return `<span class="lbl">Vented</span><b class="${t > 0 ? 'warn' : ''}">${fmt(t)}</b>` + (parts ? `<span class="dim"> · ${parts}</span>` : '') +
    (sp >= 1 || S.fails ? ` <span class="lbl">Spilled</span><b class="bad">${fmt(sp)}</b><span class="dim"> · ${S.fails || 0} pipe failures</span>` : '') +
    (S.bugs.length || S.evo > 0.001 || S.lost ? ` <span class="lbl">Crawlers</span><b class="${S.bugs.length ? 'bad' : ''}">${S.bugs.length}</b><span class="dim"> · evolution ${Math.round(S.evo * 100)}% · ${lists().hive.length} hives${S.lost ? ' · ' + S.lost + ' buildings lost' : ''}</span>` : '') +
    (S.clouds.length || lists().projector.length ? ` <span class="lbl">Wind</span><b><span class="wind" style="display:inline-block;transform:rotate(${S.wind.a}rad)">→</span> ${(S.wind.v * 10).toFixed(1)}</b><span class="dim"> m/s${S.clouds.length ? ' · ' + S.clouds.length + ' gas clouds' : ''}</span>` : '') +
    (pk >= 1 ? ` <span class="lbl">Smog</span><b class="${pk > RAIN ? 'bad' : pk > RAIN * 0.6 ? 'warn' : ''}">${Math.round(pk)}</b><span class="dim"> peak${pk > RAIN ? ', acid rain' : ''}</span>` : '');
}

function renderHotbar() {
  let h = '';
  for (const c of CATS) {
    h += `<div class="grp"><div class="gl">${c}</div><div class="gb">`;
    for (const t in BUILD) {
      const B = BUILD[t];
      if (B.cat !== c) continue;
      const n = S.inv[t] || 0;
      h += `<button class="hb ${tool === t ? 'on' : ''} ${n ? '' : 'zero'}" data-tool="${t}" title="${B.n}: ${B.d}"><span class="sw" style="background:${B.c}">${B.ab || ''}${t === 'belt' ? '»' : B.kind === 'pipe' ? (B.P.dn >= 100 ? '█' : '═') : ''}</span><span class="cnt">${n}</span></button>`;
    }
    h += '</div></div>';
  }
  hotbar.innerHTML = h;
}

function selectTool(t) {
  if (tool === t || !t) { tool = null; }
  else if (!(S.inv[t] > 0)) { toast('You have no ' + nm(t) + '. Craft one with E.', true); tool = null; }
  else { tool = t; closePanel(); }
  renderHotbar();
}

function closePanel() { sel = null; panel.hidden = true; panel.innerHTML = ''; }

function openPanel(e) {
  sel = e.id;
  const B = BUILD[e.type];
  let h = `<div class="ph"><span class="sw big" style="background:${B.c}">${B.ab || ''}</span><div class="pt"><b>${B.n}</b><small>${B.d}</small></div><button class="x" data-act="close" title="Close">×</button></div>`;
  if (kind(e) === 'machine' && !B.store) {
    h += `<label class="row">Recipe <select data-act="recipe"><option value="">Choose a recipe</option>${RECIPES.filter(r => r.b === e.type && (avail(r) || e.recipe === r.id)).map(r => `<option value="${r.id}" ${e.recipe === r.id ? 'selected' : ''}>${r.n}</option>`).join('')}</select></label>`;
  }
  if (e.type === 'sorter') {
    h += `<label class="row">Filter <select data-act="filter"><option value="">None (all forward)</option>${Object.keys(ITEMS).map(k => `<option value="${k}" ${e.filter === k ? 'selected' : ''}>${ITEMS[k].n}</option>`).join('')}</select></label>`;
  }
  h += '<div id="pdyn"></div><div class="pbtns">';
  if (e.type === 'boiler') h += '<button data-act="descale">Descale (20 s outage)</button>';
  if (kind(e) === 'machine' && !B.store) h += '<button data-act="insert">Insert from inventory</button><button data-act="take">Take outputs</button>';
  if (e.type === 'miner') h += '<button data-act="take">Take ore</button>';
  if (e.type === 'depot') h += '<button data-act="deliver">Deliver from inventory</button>';
  if (e.type === 'chest') h += '<button data-act="takeall">Take all</button><button data-act="store">Store raw materials</button>';
  if (e.type === 'booster') h += `<label class="row">Outlet pressure <select data-act="head">${HEADS.concat(e.head).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b).map(v => `<option value="${v}" ${e.head === v ? 'selected' : ''}>${v} bar</option>`).join('')}</select></label>`;
  if (kind(e) === 'pipe') h += '<button data-act="flush">Flush network</button>';
  if (e.type === 'belt' || e.type === 'sorter' || e.type === 'booster') h += '<button data-act="rotate">Rotate (R)</button>';
  if (e.type === 'turret') h += '<button data-act="load">Load cartridges</button>';
  if (e.type === 'projector') h += '<button data-act="pload">Load from inventory</button>';
  if (e.type === 'howitzer') h += '<button data-act="gload">Load shells</button>';
  if (e.type === 'ruin') h += `<button data-act="search" ${e.done ? 'disabled' : ''}>Search the works</button>`;
  if (kind(e) !== 'hive' && kind(e) !== 'ruin') h += '<button class="danger" data-act="remove">Pick up</button>';
  h += '</div>';
  panel.innerHTML = h;
  panel.hidden = false;
  renderPanelDyn();
}

function recipeHtml(r) {
  const ins = [], outs = [];
  if (r.i) for (const k in r.i) ins.push(chip(k, r.i[k]));
  if (r.fi) for (const f in r.fi) ins.push(chip(f, r.fi[f], 'fl'));
  if (r.o) for (const k in r.o) outs.push(chip(k, r.o[k]));
  if (r.ch) for (const k in r.ch) outs.push(chip(k, Math.round(r.ch[k] * 100) + '%'));
  if (r.fo) for (const f in r.fo) outs.push(chip(f, r.fo[f], 'fl'));
  return `<div class="rec">${ins.join('')}<span class="arr">→ ${r.t}s →</span>${outs.join('')}</div>` +
    (r.cat ? `<div class="note">Catalyst ${chip(r.cat)} up to ${1 + r.boost}× speed, a charge lasts about ${r.life} batches</div>` : '') +
    (r.eq ? `<div class="eq">${r.eq}</div>` : '') + (r.note ? `<div class="note">${r.note}</div>` : '');
}

function catHtml(e, r) {
  const on = e.catK === r.cat && e.ca > 0, sp = on ? e.catN || 0 : 0;
  let h = `<div class="sec">Catalyst bed</div><div class="slots"><div class="slot">${chip(r.cat, (on ? 1 : 0) + sp + '/' + CAT_CAP)}</div></div>`;
  if (on) {
    h += `<div class="gauge"><span>Charge life</span>${bar(e.ca, 1, e.ca > 0.34 ? '#7fe08a' : '#e0b84a')}<b>${Math.round(e.ca * 100)}%</b></div>`;
    h += `<div class="gauge"><span>Activity</span>${bar(catEff(e), 1, '#c88a30')}<b>${catMul(e, r).toFixed(2)}× speed</b></div>`;
    if (catEff(e) < 1) h += `<p class="bad">The bed is fading. ${sp ? 'A spare charge drops in when it is spent.' : 'Load fresh catalyst.'}</p>`;
  } else h += `<p class="dim">No catalyst, so it runs at the uncatalysed rate. Load ${ITEMS[r.cat].n} for up to ${1 + r.boost}× speed. Chests and belts feed it too.</p>`;
  return h;
}

function bar(v, max, c) {
  return `<span class="bar"><i style="width:${Math.min(100, v / max * 100)}%;background:${c}"></i></span>`;
}

function renderPanelDyn() {
  const e = sel && ents.get(sel), box = document.getElementById('pdyn');
  if (!e || !box) return;
  let h = '';
  const k = kind(e);
  if (k === 'machine' && BUILD[e.type].store) {
    const B = BUILD[e.type], ch = e.ch || 0, kw = e.kw || 0;
    h += `<div class="status"><i style="background:${ST_COL[e.st] || '#888'}"></i>${ST_TXT[e.st] || 'Idle, no load'}${kw > 0.5 ? ` · giving ${Math.round(kw)} kW` : kw < -0.5 ? ` · taking ${Math.round(-kw)} kW` : ''}</div>`;
    h += `<div class="sec">Charge</div><div class="gauge"><span>Stored</span>${bar(ch, B.store, '#8ad0a0')}<b>${Math.round(ch / B.store * 100)}%</b></div><p class="dim">${(ch / 3600).toFixed(1)} of ${(B.store / 3600).toFixed(0)} kWh. Up to ${B.rate} kW in or out. It charges only from capacity nothing else is using, and discharges when generators fall short.</p>`;
    h += recipeHtml(RECIPE.store);
  } else if (k === 'machine') {
    const r = RECIPE[e.recipe];
    if (!r) h += '<p class="dim">Pick a recipe, or feed it an item and it will choose one.</p>';
    else {
      h += recipeHtml(r);
      const st = e.cy && e.st !== 'power' && e.st !== 'idle' ? 'work' : e.st;
      h += `<div class="status"><i style="background:${ST_COL[st]}"></i>${e.type === 'boiler' && st === 'output' ? 'Steam full, waiting for demand' : ST_TXT[st] || ''}${BUILD[e.type].kw ? ` · ${BUILD[e.type].kw} kW` : BUILD[e.type].gen ? ` · ${Math.round(e.cy ? e.kw || 0 : 0)} / ${BUILD[e.type].gen} kW out` : ' · fuel-fired'}</div>`;
      h += `<div class="prog">${bar(e.cy ? e.prog : 0, 1, '#7fe08a')}</div>`;
      if (r.cat) h += catHtml(e, r);
      if (e.type === 'boiler') h += `<div class="sec">Tube scale</div><div class="gauge"><span>Scale</span>${bar(e.scale || 0, 1, '#d8c8a0')}<b>${Math.round((e.scale || 0) * 100)}%</b></div><p class="dim">${e.desc > 0 ? `Descaling, back in ${Math.ceil(e.desc)} s.` : (e.soft || 0) > 1 ? 'Fed softened water: no new scale.' : 'Hard water bakes chalk onto the tubes, and steam output falls as the scale thickens. Feed softened water, or shut down and descale.'} Steam rate ${Math.round(scaleMul(e) * 100)}%.</p>`;
      if (BUILD[e.type].sun) h += `<div class="sec">Climate</div><div class="gauge"><span>Sun</span>${bar(sunOf(e), 1, '#e0c050')}<b>${Math.round(sunOf(e) * 100)}%</b></div><p class="dim">${e.type === 'solar' ? 'Sunlight reaching the panels. Arrays give most on desert sand and least in forest, marsh and tundra.' : 'Evaporation rate here. Ponds run fastest on desert sand and slowest on tundra and marsh.'}</p>`;
      if (BUILD[e.type].wind) h += `<div class="sec">Climate</div><div class="gauge"><span>Exposure</span>${bar(exposureOf(e), 1, '#80b0d0')}<b>${Math.round(exposureOf(e) * 100)}%</b></div><div class="gauge"><span>Wind</span>${bar(windCurve(), 1, '#a0c8e0')}<b>${(S.wind.v * 10).toFixed(1)} m/s</b></div><p class="dim">Output follows the wind speed cubed, times how open the ground is. Steppe and tundra are best; trees slow the wind.</p>`;
      if (BUILD[e.type].forest) h += `<div class="sec">Forest</div><div class="gauge"><span>Stand</span>${bar(forestOf(e), FOREST_FULL, '#4a8a3a')}<b>${Math.round(forestMul(e) * 100)}%</b></div><p class="dim">${forestOf(e)} forest tiles within ${FOREST_R} tiles. It runs at full speed with ${FOREST_FULL} or more.</p>`;
      if (r.well) { const l = wellTiles(e), left = l.reduce((a, q) => a + oreAmt[q], 0); h += `<div class="sec">Reservoir</div><div class="spec">${l.length} of ${BUILD[e.type].w * BUILD[e.type].h} tiles on oil · ${fmt(left * r.fo.crude)} crude left</div>`; }
      h += '<div class="sec">Input buffer</div><div class="slots">';
      if (r.i) for (const q in r.i) h += `<div class="slot">${chip(q, Math.floor(e.inv[q] || 0) + '/' + inCap(r, q))}</div>`;
      if (r.fi) for (const f in r.fi) h += `<div class="slot">${chip(f, Math.round(e.fi[f] || 0) + '/' + fiCap(r, f), 'fl')}${bar(e.fi[f] || 0, fiCap(r, f), col(f))}</div>`;
      h += '</div><div class="sec">Output buffer</div><div class="slots">';
      const outs = new Set([...Object.keys(r.o || {}), ...Object.keys(r.ch || {}), ...Object.keys(e.out)]);
      for (const q of outs) h += `<div class="slot">${chip(q, e.out[q] || 0)}</div>`;
      if (r.fo) for (const f in r.fo) h += `<div class="slot">${chip(f, Math.round(e.fo[f] || 0) + '/' + foCap(r, f), 'fl')}${bar(e.fo[f] || 0, foCap(r, f), col(f))}${isGas(f) ? '<small class="dim">vents when full</small>' : spills(r, f) ? '<small class="dim">bled off when full</small>' : ''}</div>`;
      h += '</div>';
    }
  } else if (k === 'miner') {
    const ores = {};
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { const q = (e.y + j) * W + e.x + i; if (solid(q)) ores[ORES[oreType[q]].item] = (ores[ORES[oreType[q]].item] || 0) + oreAmt[q]; }
    h += `<div class="status"><i style="background:${ST_COL[e.st] || '#888'}"></i>${ST_TXT[e.st] || ''} · 90 kW</div><div class="prog">${bar(e.prog, 1, '#7fe08a')}</div>`;
    h += '<div class="sec">Ore underneath</div><div class="slots">' + (Object.keys(ores).map(q => `<div class="slot">${chip(q, fmt(ores[q]))}</div>`).join('') || '<span class="dim">None</span>') + '</div>';
    h += '<div class="sec">Output</div><div class="slots">' + (Object.keys(e.out).map(q => `<div class="slot">${chip(q, e.out[q])}</div>`).join('') || '<span class="dim">Empty</span>') + '</div>';
    h += '<p class="dim">Outputs onto any touching belt that does not point into it, or into chests and machines.</p>';
  } else if (e.type === 'depot') {
    fillOrders();
    h += `<div class="sec">Open orders · ${S.odone || 0} filled · next notebook in ${3 - (S.odone || 0) % 3}</div>`;
    for (const a of S.orders) {
      const O = ORDERS[a.i];
      h += `<div class="order"><div class="row"><b>${O.c}</b><small class="dim">tier ${O.tier}</small></div><div class="slot">${chip(O.item, a.got + '/' + O.n)}${bar(a.got, O.n, '#7fe08a')}</div><small>${O.d}</small><div class="rw">Pays ${Object.keys(O.rw).map(q => chip(q, O.rw[q])).join(' ')}</div></div>`;
    }
    if (!S.orders.length) h += '<p class="dim">No customer wants anything you can make yet. Build up your chains.</p>';
    h += '<p class="dim">Belts, chests and machines touching the depot load ordered goods straight onto the wagons. Anything else is refused.</p>';
  } else if (k === 'chest') {
    h += `<div class="sec">Contents ${sum(e.store)}/400</div><div class="slots">` + (Object.keys(e.store).map(q => `<div class="slot">${chip(q, e.store[q])}</div>`).join('') || '<span class="dim">Empty</span>') + '</div>';
  } else if (k === 'pipe') {
    const P = NP(e), p = pres(e);
    h += `<div class="spec">${P.mat} · DN${P.dn} · rated ${P.bar} bar · max ${P.tmax}°C · ${P.duct ? 'ductile' : 'brittle'}${P.res ? ' · resists ' + resName(P.res) : ''}${P.weak ? ' · <span class="bad">attacked fast by ' + resName(P.weak) + '</span>' : ''}</div>`;
    h += `<div class="slots"><div class="slot">${e.fl ? chip(e.fl, Math.round(e.amt) + '/' + P.v, 'fl') + bar(e.amt, P.v, col(e.fl)) : '<span class="dim">Empty, no fluid assigned</span>'}</div></div>`;
    h += `<div class="gauge"><span>Pressure</span>${bar(p, P.bar, p > P.bar ? '#e04a4a' : p > P.bar * 0.8 ? '#e0b84a' : '#5fd06a')}<b>${p.toFixed(1)} / ${P.bar} bar</b></div>`;
    h += `<div class="gauge"><span>Flow</span>${bar(e.fr, P.q, '#6ab0e0')}<b>${Math.round(e.fr)} / ${P.q} per s</b></div>`;
    h += `<div class="gauge"><span>Fluid</span>${bar(e.tf, P.tmax, heat(e.tf, 0, 400))}<b>${Math.round(e.tf)}°C</b></div>`;
    h += `<div class="gauge"><span>Wall</span>${bar(e.tw, P.tmax, heat(e.tw, 0, 400))}<b>${Math.round(e.tw)} / ${P.tmax}°C</b></div>`;
    if (P.shock) h += `<div class="gauge"><span>Thermal stress</span>${bar(e.ss || 0, P.shock, '#e07a3a')}<b>${Math.round(e.ss || 0)} / ${P.shock}</b></div>`;
    if (P.duct) h += `<div class="gauge"><span>Bulging</span>${bar(e.strain, P.duct, '#e04a4a')}<b>${Math.round(e.strain / P.duct * 100)}%</b></div>`;
    if (e.wear > 0 || !resists(P, e.fl)) h += `<div class="gauge"><span>Corrosion</span>${bar(e.wear, 1, '#9a4a1a')}<b>${Math.round(e.wear * 100)}%</b></div>`;
    if (acidRain(e, P)) h += `<p class="bad">Acid rain (smog ${Math.round(polAt(e.x, e.y))}) is eating this pipe. Only lead-lined pipe shrugs it off. Cut the SO₂ and chlorine upwind.</p>`;
    h += '<p class="dim">A pipe keeps the first fluid that enters it. Flush to change it. Pressure is set by pumps and machines and drops along long lines.</p>';
  } else if (k === 'booster') {
    h += `<div class="status"><i style="background:${e.on ? ST_COL.work : ST_COL.input}"></i>${e.on ? 'Pumping' : 'Nothing to pump'} · ${BUILD.booster.kw} kW</div>`;
    h += `<div class="gauge"><span>Flow</span>${bar(e.fr, 200, '#6ab0e0')}<b>${Math.round(e.fr)} / 200 per s</b></div>`;
    h += '<p class="dim">The arrow points to the outlet. It pushes the outlet up to the set pressure. Above a pipe\'s rating, cast iron bursts and steel bulges.</p>';
  } else if (k === 'engine') {
    h += `<div class="status"><i style="background:${e.kw > 1 ? ST_COL.work : ST_COL.input}"></i>${Math.round(e.kw)} / 900 kW</div>${bar(e.kw, 900, '#e0c84a')}`;
    h += `<div class="slots"><div class="slot">${chip('steam', Math.round(e.amt) + '/60', 'fl')}${bar(e.amt, 60, col('steam'))}</div></div>`;
    h += `<div class="gauge"><span>Steam</span>${bar(e.tf, 165, heat(e.tf, 0, 400))}<b>${Math.round(e.tf)}°C · ${Math.round((e.eff || 0) * 100)}% output</b></div>`;
    h += '<p class="dim">Steam below 150°C gives less power, and below 100°C it condenses. Keep steam lines short.</p>';
  } else if (k === 'stack') {
    const u = stackUsers(e);
    h += `<div class="status"><i style="background:${(e.puff || 0) > 0.03 ? ST_COL.work : ST_COL.none}"></i>${u.length} machine${u.length === 1 ? '' : 's'} venting through it</div>`;
    h += `<div class="gauge"><span>Smog here</span>${bar(polAt(e.x, e.y), RAIN * 2, polAt(e.x, e.y) > RAIN ? '#e04a4a' : '#b0a060')}<b>${Math.round(polAt(e.x, e.y))}</b></div>`;
    h += '<p class="dim">Gas vented by touching machines leaves 100 m up and spreads over 40×40 tiles instead of one 8×8 area. That keeps the ground below acid rain, but the same amount of pollution still comes down somewhere. Tall stacks fixed British smog in the 1960s and sent acid rain to Scandinavia instead.</p>';
  } else if (k === 'hive') {
    h += `<div class="gauge"><span>Integrity</span>${bar(e.hp, maxHp(e), '#a04a6a')}<b>${Math.round(e.hp)} / ${maxHp(e)}</b></div>`;
    h += `<div class="gauge"><span>Food</span>${bar(e.food, 50, '#d8c84a')}<b>${Math.round(e.food)} / 50</b></div>`;
    h += `<div class="spec">Smog around it ${Math.round(polAt(e.x + 1, e.y + 1))} · ${e.sw} swarms sent · crawler evolution ${Math.round(S.evo * 100)}%</div>`;
    h += resHtml();
    h += '<p class="dim">The hive breathes in smog from the 24×24 tiles around it. Each 50 food sends a swarm at whatever vented most recently. Every eighth swarm founds a new hive, as close to the smog as it can. Guns or poison gas are the only ways to clear one, and they defend themselves.</p>';
  } else if (k === 'turret') {
    h += `<div class="status"><i style="background:${e.ammo || e.rd ? (S.t - e.sh < 0.5 ? ST_COL.work : ST_COL.none) : ST_COL.input}"></i>${!e.ammo && !e.rd ? 'Out of ammunition' : S.t - e.sh < 0.5 ? 'Firing' : 'Watching'} · range ${TUR_R} tiles · ${e.kills} kills</div>`;
    h += `<div class="gauge"><span>Cartridges</span>${bar(e.ammo, TUR_CAP, '#c8a040')}<b>${e.ammo} / ${TUR_CAP} + ${e.rd} rounds</b></div>`;
    h += '<p class="dim">Ten rounds per cartridge, four shots a second, 10 damage each. Chests and belts touching it top it up.</p>';
  } else if (k === 'projector') {
    const tg = e.tgt && ents.get(e.tgt), ld = PAYLOADS.some(q => e.pay[q] > 0);
    const st = !ld ? 'No rounds loaded' : !tg ? `No hive within ${PROJ_R} tiles` : !(e.pw > 0) ? 'No blasting powder' : S.t - e.sh < 4.5 ? 'Firing' : 'Laying on target';
    h += `<div class="status"><i style="background:${st === 'Firing' || st === 'Laying on target' ? ST_COL.work : ST_COL.input}"></i>${st} · ${e.shots} rounds fired</div>`;
    h += '<div class="sec">Rounds</div><div class="slots">' + (PAYLOADS.filter(q => e.pay[q] > 0).map(q => `<div class="slot">${chip(q, e.pay[q])}</div>`).join('') || '<span class="dim">Empty</span>') + `</div>`;
    h += `<div class="gauge"><span>Powder</span>${bar(e.pw, POW_CAP, '#808080')}<b>${e.pw} / ${POW_CAP}</b></div>`;
    h += `<div class="spec">Wind ${(S.wind.v * 10).toFixed(1)} m/s toward ${Math.round((S.wind.a * 180 / Math.PI % 360 + 360) % 360)}°</div>`;
    h += resHtml();
    h += '<p class="dim">Holds 6 rounds and 20 charges of black powder; chests and belts touching it top it up. Chlorine is 2.5 times heavier than air: the cloud hugs the ground, creeps with the wind and lingers, and if it drifts back over your works it corrodes them. Ammonia is lighter than air and much nastier to crawlers, whose sulfur-loving gut bacteria cannot stand alkali, but it rises and thins out fast. Phosgene is about six times deadlier than chlorine, heavier still and almost invisible. High explosive drums smash hives directly. Every round stirs up defenders who come for the projector, and the crawlers that survive a gas breed a tolerance to it, so switch gases. The tolerance fades over several minutes once you stop.</p>';
  } else if (k === 'gun') {
    const tg = e.tgt && ents.get(e.tgt);
    const st = !e.ammo && !e.wp ? 'No shells' : !tg ? `No hive between ${GUN_MIN} and ${GUN_R} tiles` : S.t - e.sh < 5.5 ? 'Firing' : 'Laying on target';
    h += `<div class="status"><i style="background:${st === 'Firing' || st === 'Laying on target' ? ST_COL.work : ST_COL.input}"></i>${st} · ${e.shots} shells fired</div>`;
    h += `<div class="gauge"><span>HE shells</span>${bar(e.ammo, GUN_CAP, '#b08a40')}<b>${e.ammo} / ${GUN_CAP}</b></div>`;
    if (e.wp || S.unl.wp_shell) h += `<div class="gauge"><span>WP shells</span>${bar(e.wp || 0, GUN_CAP, '#e8e4d8')}<b>${e.wp || 0}</b></div>`;
    h += '<p class="dim">One round every 5 seconds. A TNT shell bursts with about four times the energy of the same weight of black powder and wrecks a hive in five hits, but it cannot fire at anything closer than 8 tiles. White phosphorus shells go first when loaded: they set the ground burning for 14 seconds, which no tolerance helps against, and hide the target in thick white smoke. Each shell stirs up defenders, so guard the gun with turrets.</p>';
  } else if (k === 'ruin') {
    const g = guards(e).length;
    h += `<div class="status"><i style="background:${e.done ? ST_COL.none : g ? ST_COL.input : ST_COL.work}"></i>${e.done ? 'Searched' : g ? g + ' hive' + (g > 1 ? 's' : '') + ' within 16 tiles' : 'Unguarded'}</div>`;
    h += `<p class="dim">${e.done ? 'Only rust and broken glass are left.' : g ? 'Crawlers have nested around the old works. Clear every hive within 16 tiles, then search it for salvage and the lab books.' : 'Nothing stops you now. The stores may still hold platinum catalyst gauze, motors and cylinders, and the lab books will teach you a lost process.'}</p>`;
  } else if (k === 'pump') {
    h += `<div class="status"><i style="background:${e.on ? ST_COL.work : ST_COL.output}"></i>${e.on ? 'Pumping' : 'Nothing to pump into'}</div>`;
  } else if (k === 'belt') {
    h += '<div class="slots">' + (e.items.map(q => `<div class="slot">${chip(q.i)}</div>`).join('') || '<span class="dim">Empty</span>') + '</div>';
  } else if (k === 'sorter') {
    h += `<div class="slots"><div class="slot">${e.buf ? chip(e.buf) : '<span class="dim">Empty</span>'}</div></div><p class="dim">Filtered item goes straight on. Everything else turns right.</p>`;
  }
  if (k !== 'hive' && e.hp != null && e.hp < maxHp(e)) h += `<div class="gauge"><span>Integrity</span>${bar(e.hp, maxHp(e), '#e04a4a')}<b>${Math.round(e.hp)} / ${maxHp(e)}</b></div><p class="dim">Pick it up and put it back to rebuild it.</p>`;
  box.innerHTML = h;
}

function panelAct(act, el) {
  const e = sel && ents.get(sel);
  if (act === 'close') return closePanel();
  if (!e) return;
  if (act === 'recipe') { setRecipe(e, el.value); renderPanelDyn(); }
  else if (act === 'filter') { e.filter = el.value || null; }
  else if (act === 'head') { e.head = +el.value; }
  else if (act === 'insert') {
    const r = RECIPE[e.recipe];
    if (!r) return toast('Set a recipe first', true);
    let moved = 0;
    if (r.i) for (const k in r.i) {
      const n = Math.min(S.inv[k] || 0, inCap(r, k) - (e.inv[k] || 0));
      if (n > 0) { S.inv[k] -= n; if (!S.inv[k]) delete S.inv[k]; e.inv[k] = (e.inv[k] || 0) + n; moved += n; }
    }
    if (r.cat && S.inv[r.cat] > 0) {
      const n = catAdd(e, r, S.inv[r.cat]);
      if (n > 0) { S.inv[r.cat] -= n; if (!S.inv[r.cat]) delete S.inv[r.cat]; moved += n; }
    }
    toast(moved ? `Inserted ${moved} items` : r.i || r.cat ? 'You have none of the inputs' : 'This recipe only uses fluids', !moved);
  } else if (act === 'descale') {
    if (!(e.scale > 0.01)) return toast('The tubes are clean', true);
    if (e.desc > 0) return toast('Already descaling', true);
    e.desc = 20; toast('Boiler shut down for an acid wash');
  } else if (act === 'deliver') {
    let n = 0;
    for (const a of S.orders.slice()) { const k = ORDERS[a.i].item, m = deliver(k, S.inv[k] || 0); if (m) { S.inv[k] -= m; if (!S.inv[k]) delete S.inv[k]; n += m; } }
    toast(n ? `Loaded ${n} items onto the wagons` : 'You carry nothing the customers want', !n);
    renderPanelDyn();
  } else if (act === 'take' || act === 'takeall') {
    const src = e.out || e.store;
    let n = 0;
    for (const k in src) { give(k, src[k]); n += src[k]; }
    if (e.out) e.out = {}; else e.store = {};
    toast(n ? `Took ${n} items` : 'Nothing to take', !n);
  } else if (act === 'store') {
    let n = 0;
    for (const k in S.inv) {
      if (!ITEMS[k] || PARTS.includes(k)) continue;
      const m = Math.min(S.inv[k], 400 - sum(e.store));
      if (m <= 0) break;
      e.store[k] = (e.store[k] || 0) + m; S.inv[k] -= m; if (!S.inv[k]) delete S.inv[k]; n += m;
    }
    toast(n ? `Stored ${n} items` : 'No raw materials to store', !n);
  } else if (act === 'flush') {
    const seen = new Set([e.id]), q = [e];
    while (q.length) {
      const c = q.pop();
      c.fl = null; c.amt = 0;
      for (const p of c.per) { const o = at(p.x, p.y); if (o && kind(o) === 'pipe' && !seen.has(o.id)) { seen.add(o.id); q.push(o); } }
    }
    toast(`Flushed ${seen.size} pipes`);
  } else if (act === 'rotate') { e.dir = (e.dir + 1) % 4; }
  else if (act === 'load') {
    const n = Math.min(S.inv.cartridge || 0, TUR_CAP - e.ammo);
    if (n > 0) { S.inv.cartridge -= n; if (!S.inv.cartridge) delete S.inv.cartridge; e.ammo += n; }
    toast(n ? `Loaded ${n} cartridges` : e.ammo >= TUR_CAP ? 'Turret is full' : 'You have no cartridges', !n);
  }
  else if (act === 'pload') {
    let n = 0;
    const p = Math.min(S.inv.black_powder || 0, POW_CAP - e.pw);
    if (p > 0) { S.inv.black_powder -= p; if (!S.inv.black_powder) delete S.inv.black_powder; e.pw += p; }
    for (const q of PAYLOADS) {
      const m = Math.min(S.inv[q] || 0, PROJ_CAP - sum(e.pay));
      if (m > 0) { S.inv[q] -= m; if (!S.inv[q]) delete S.inv[q]; e.pay[q] = (e.pay[q] || 0) + m; n += m; }
    }
    toast(n || p ? `Loaded ${n} rounds and ${p} powder` : 'You have no gas cylinders, HE drums or black powder to load', !(n || p));
  }
  else if (act === 'gload') {
    const n = Math.min(S.inv.shell || 0, GUN_CAP - e.ammo - (e.wp || 0));
    if (n > 0) { S.inv.shell -= n; if (!S.inv.shell) delete S.inv.shell; e.ammo += n; }
    const m = Math.min(S.inv.wp_shell || 0, GUN_CAP - e.ammo - (e.wp || 0));
    if (m > 0) { S.inv.wp_shell -= m; if (!S.inv.wp_shell) delete S.inv.wp_shell; e.wp = (e.wp || 0) + m; }
    toast(n || m ? `Loaded ${n} HE${m ? ' and ' + m + ' WP' : ''} shells` : e.ammo + (e.wp || 0) >= GUN_CAP ? 'Howitzer is full' : 'You have no shells', !(n || m));
  }
  else if (act === 'search') { searchRuin(e); openPanel(e); return; }
  else if (act === 'remove') { if (kind(e) === 'hive' || kind(e) === 'ruin') return; removeEnt(e); renderHotbar(); return; }
  renderPanelDyn();
  renderHotbar();
}

function canAfford(cost, n) { for (const k in cost) if ((S.inv[k] || 0) < cost[k] * n) return false; return true; }
function pay(cost, n) { for (const k in cost) { S.inv[k] -= cost[k] * n; if (!S.inv[k]) delete S.inv[k]; } }
function costHtml(cost, n) { return Object.keys(cost).map(k => chip(k, cost[k] * n, (S.inv[k] || 0) >= cost[k] * n ? 'have' : 'need')).join(''); }

let modalHtml = '';
function openModal(kind, tab) {
  modalKind = kind;
  modalTab = tab || (kind === 'craft' ? 'build' : kind === 'ency' ? 'chains' : kind === 'world' ? 'world' : kind === 'map' ? 'map' : 'help');
  modal.hidden = false;
  renderModal();
}
function closeModal() { modal.hidden = true; modalKind = null; }

const TABS = {
  craft: [['build', 'Buildings'], ['parts', 'Parts'], ['inv', 'Inventory']],
  ency: [['chains', 'Ore chains'], ['recipes', 'Recipes'], ['mats', 'Materials'], ['pipes', 'Pipes']],
  help: [['help', 'How to play']],
  world: [['world', 'New world']],
  map: [['map', 'World map']],
};
let wcfg = null;
const parseSeed = v => { v = String(v).trim(); if (/^\d+$/.test(v)) return +v % 2147483647; let h = 7; for (const c of v) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h % 2147483647; };
const sel3 = (id, cur, opts) => `<select id="${id}">${opts.map(([v, n]) => `<option value="${v}" ${String(v) === String(cur) ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
const TER_LEG = [0, 6, 5, 2, 3, 7, 4, 1];
function legendHtml() { return '<div class="wleg">' + TER_LEG.map(t => `<span><i style="background:${t === 1 ? '#20507b' : PAL[t][0]}"></i>${TER_N[t]}</span>`).join('') + '</div>'; }
function worldHtml() {
  if (!wcfg) wcfg = { seed: String(Math.floor(Math.random() * 1e9)), size: 256, water: 1, ore: 1, hives: 2 };
  return `<div class="wgen"><div class="wopts"><p class="dim">Every world is generated from its seed. The same seed and settings always give the same map: continents, rivers, mountain ranges, and ore fields that follow the geology. Hot dry south, cold north.</p>
<label>Seed <span class="row"><input id="wseed" value="${wcfg.seed}" spellcheck="false"><button data-world="dice">Random</button></span></label>
<label>Size ${sel3('wsize', wcfg.size, [[160, 'Small · 160×160'], [256, 'Normal · 256×256'], [384, 'Large · 384×384']])}</label>
<label>Water ${sel3('wwater', wcfg.water, [[0, 'Dry · few lakes and rivers'], [1, 'Normal'], [2, 'Wet · big lakes, many rivers']])}</label>
<label>Ore fields ${sel3('wore', wcfg.ore, [[0, 'Poor · fewer, leaner deposits'], [1, 'Normal'], [2, 'Rich · more, fatter deposits']])}</label>
<label>Crawlers ${sel3('whives', wcfg.hives, [[0, 'None · peaceful'], [1, 'Few'], [2, 'Normal'], [3, 'Many']])}</label>
<div class="dim">Ores by geology: copper and lead-zinc in the hills, coal under swamps and forests, salt, caliche and potash in deserts, bauxite in hot wet laterite, mineral sands on beaches, oil in sedimentary basins.</div>
<button data-world="go" class="danger big">Generate and start</button><div class="dim">Your current factory will be lost.</div></div>
<div class="wprev"><canvas id="wprev"></canvas>${legendHtml()}</div></div>`;
}
function wgen() { return { size: +wcfg.size, water: +wcfg.water, ore: +wcfg.ore, hives: +wcfg.hives }; }
function paintTiles(c, n) {
  const x2 = c.getContext('2d'), im = x2.createImageData(n, n), d = im.data, rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const pal = PAL.map(p => rgb(p[0])), oc = ORES.map(o => o ? rgb(o.c) : null), sh = rgb('#2a6491'), dp = rgb('#123457');
  for (let i = 0; i < n * n; i++) {
    const t = terrain[i];
    let c3 = oreType[i] ? oc[oreType[i]] : pal[t];
    if (t === 1 && elev) { const f = Math.max(0, Math.min(1, (0.36 - elev[i]) * 9)); c3 = [0, 1, 2].map(k => sh[k] + (dp[k] - sh[k]) * f); }
    d[i * 4] = c3[0]; d[i * 4 + 1] = c3[1]; d[i * 4 + 2] = c3[2]; d[i * 4 + 3] = 255;
  }
  x2.putImageData(im, 0, 0);
}
function drawPreview() {
  const c = document.getElementById('wprev');
  if (!c) return;
  const keep = [W, terrain, oreType, oreAmt, elev, patches], g = wgen();
  W = H = g.size;
  genWorld(parseSeed(wcfg.seed), g);
  c.width = c.height = W;
  paintTiles(c, W);
  const x2 = c.getContext('2d');
  x2.fillStyle = '#fff'; x2.fillRect(W / 2 - 3, W / 2 - 0.5, 6, 1); x2.fillRect(W / 2 - 0.5, W / 2 - 3, 1, 6);
  [W, terrain, oreType, oreAmt, elev, patches] = keep; H = W;
}
function startWorld() {
  const g = wgen();
  newGame(parseSeed(wcfg.seed), g);
  wcfg = null;
  closeModal(); renderHotbar(); save();
  toast('New world generated');
}
function mapHtml() { return `<div class="wmap"><canvas id="wmap" width="720" height="720"></canvas><div class="wside">${legendHtml()}<div class="wleg"><span><i style="background:#e04040"></i>Crawler hive</span><span><i style="background:#c080ff"></i>Abandoned works</span><span><i style="background:#ffe080"></i>Your buildings</span></div><p class="dim">Seed ${S.seed}${S.gen && !S.gen.legacy ? '' : ' · classic map'} · ${W}×${H}<br>Click anywhere to move the camera there.</p></div></div>`; }
function drawMapView() {
  const c = document.getElementById('wmap');
  if (!c) return;
  const x2 = c.getContext('2d'), n = c.width, s = n / W;
  x2.imageSmoothingEnabled = true;
  x2.drawImage(tcv, 0, 0, W * TP, H * TP, 0, 0, n, n);
  for (const e of ents.values()) {
    const k = kind(e), B = BUILD[e.type];
    x2.fillStyle = k === 'hive' ? '#e04040' : k === 'ruin' ? '#c080ff' : '#ffe080';
    const r = k === 'hive' || k === 'ruin' ? Math.max(4, B.w * s) : Math.max(1.5, B.w * s);
    x2.fillRect(e.x * s, e.y * s, r, Math.max(k === 'hive' || k === 'ruin' ? 4 : 1.5, B.h * s));
  }
  const vw = cv.clientWidth / cam.z, vh = cv.clientHeight / cam.z;
  x2.strokeStyle = '#fff'; x2.lineWidth = 1.5;
  x2.strokeRect((cam.x - vw / 2) * s, (cam.y - vh / 2) * s, vw * s, vh * s);
}

function renderModal() {
  if (!modalKind) return;
  const th = TABS[modalKind].map(([id, n]) => `<button class="tab ${modalTab === id ? 'on' : ''}" data-tab="${id}">${n}</button>`).join('');
  const tabs = modal.querySelector('.tabs');
  if (tabs.innerHTML !== th) tabs.innerHTML = th;
  const body = modal.querySelector('.mbody'), st = body.scrollTop;
  let h = '';
  if (modalTab === 'build') {
    for (const c of CATS) {
      h += `<h3>${c}</h3><div class="crows">`;
      for (const t in BUILD) {
        const B = BUILD[t];
        if (B.cat !== c) continue;
        const lk = !buildOk(t), ok = !lk && canAfford(B.cost, 1), ok5 = !lk && canAfford(B.cost, 5);
        h += `<div class="crow"><span class="sw" style="background:${B.c}">${B.ab || ''}</span><div class="cinfo"><b>${B.n}</b> <span class="dim">have ${S.inv[t] || 0}${B.makes ? ' · makes ' + B.makes : ''}</span><div class="cost">${lk ? '<span class="bad">Locked: search abandoned works</span>' : costHtml(B.cost, 1)}</div></div><button data-craft="${t}" data-n="1" ${ok ? '' : 'disabled'}>Craft</button><button data-craft="${t}" data-n="5" ${ok5 ? '' : 'disabled'}>×5</button></div>`;
      }
      h += '</div>';
    }
  } else if (modalTab === 'parts') {
    h += '<p class="dim">Hand-crafting parts is instant. A Workshop does the same automatically.</p><div class="crows">';
    for (const id of PARTS) {
      const r = RECIPE[id], ok = canAfford(r.i, 1), ok10 = canAfford(r.i, 10);
      h += `<div class="crow"><span class="sw" style="background:${col(id)}"></span><div class="cinfo"><b>${nm(id)}</b> <span class="dim">have ${S.inv[id] || 0} · makes ${r.o[id]}</span><div class="cost">${costHtml(r.i, 1)}</div></div><button data-part="${id}" data-n="1" ${ok ? '' : 'disabled'}>Craft</button><button data-part="${id}" data-n="10" ${ok10 ? '' : 'disabled'}>×10</button></div>`;
    }
    h += '</div>';
  } else if (modalTab === 'inv') {
    const ks = Object.keys(S.inv).filter(k => S.inv[k] > 0 && ITEMS[k]);
    h += '<h3>Materials</h3><div class="invgrid">' + (ks.map(k => `<div class="ig" title="${ITEMS[k].f}">${chip(k, fmt(S.inv[k]))}</div>`).join('') || '<span class="dim">Nothing yet. Click ore on the map to mine it by hand.</span>') + '</div>';
    const bs = Object.keys(S.inv).filter(k => S.inv[k] > 0 && BUILD[k]);
    h += '<h3>Buildings</h3><div class="invgrid">' + bs.map(k => `<div class="ig">${chip(k, S.inv[k])}</div>`).join('') + '</div>';
  } else if (modalTab === 'chains') {
    for (const c of CHAINS) {
      h += `<div class="chain"><h3>${c.n}</h3>`;
      for (const line of c.l) h += `<div class="cl">${line.map(s => typeof s === 'string' ? (ITEMS[s] || FLUIDS[s] ? chip(s) : `<span class="via">${viaTxt(s)}</span>`) : `<span class="via">${viaTxt(s[0])}</span>`).join('<span class="arr">→</span>').split('<span class="arr">→</span><span class="via">+</span><span class="arr">→</span>').join('<span class="arr">+</span>')}</div>`;
      h += `<p class="note">${c.d}</p></div>`;
    }
  } else if (modalTab === 'recipes') {
    for (const t in BUILD) {
      const rs = RECIPES.filter(r => r.b === t);
      if (!rs.length) continue;
      const B = BUILD[t];
      h += `<h3><span class="sw" style="background:${B.c}">${B.ab}</span> ${B.n}${B.kw ? ` <span class="dim">${B.kw} kW</span>` : ' <span class="dim">fuel-fired</span>'}</h3>`;
      for (const r of rs) h += `<div class="erec ${avail(r) ? '' : 'locked'}"><b>${r.n}</b>${avail(r) ? '' : ' <span class="bad">Locked: search abandoned works or hive wreckage</span>'}${recipeHtml(r)}</div>`;
    }
  } else if (modalTab === 'mats') {
    h += '<h3>Ores</h3><div class="mats">';
    for (let t = 1; t < ORES.length; t++) { const k = ORES[t].item; h += ORES[t].fluid ? `<div class="mat">${chip(k, null, 'fl')}<span>Oil seeps: ${FLUIDS[k].f}. Drill with a pumpjack</span></div>` : `<div class="mat">${chip(k)}<span>${ITEMS[k].f}</span></div>`; }
    h += '</div><h3>Fluids</h3><div class="mats">';
    for (const f in FLUIDS) h += `<div class="mat">${chip(f, null, 'fl')}<span>${FLUIDS[f].f}${isGas(f) ? ' · gas, vents if it has nowhere to go' : ''}${FLUIDS[f].ck ? ' · <b>corrosive</b>, safe in ' + Object.keys(BUILD).filter(t => BUILD[t].P && resists(BUILD[t].P, f)).map(t => BUILD[t].n).join(', ') : ''}</span></div>`;
    h += '</div><h3>Materials</h3><div class="mats">';
    for (const k in ITEMS) if (!ORES.some(o => o && o.item === k)) h += `<div class="mat">${chip(k)}<span>${ITEMS[k].f}</span></div>`;
    h += '</div>';
  } else if (modalTab === 'pipes') {
    h += '<p class="dim">Every pipe holds a volume of fluid. Pressure is how full it is: a full pipe is at 10 bar. Fluid flows from high to low pressure, and a long line loses pressure along the way. Offshore pumps push to 8 bar, machines to 5 bar and boilers to 7 bar. Booster pumps push higher.</p>';
    h += '<table class="ptab"><tr><th>Pipe</th><th>Size</th><th>Rating</th><th>Max flow</th><th>Max temp</th><th>Failure</th><th>Resists</th></tr>';
    for (const t in BUILD) {
      const P = BUILD[t].P;
      if (!P) continue;
      h += `<tr><td>${chip(t)}<br><span class="dim">${P.mat}</span></td><td>DN${P.dn}</td><td>${P.bar} bar</td><td>${P.q}/s</td><td>${P.tmax}°C</td><td>${P.duct ? 'Bulges, then ruptures' : P.shock ? 'Cracks at once; thermal shock' : 'Shatters at once'}${P.plastic ? '; softens when hot' : ''}</td><td>${P.res ? resName(P.res) : 'Nothing'}${P.weak ? '<br><span class="bad">weak to ' + resName(P.weak) + '</span>' : ''}</td></tr>`;
    }
    h += '</table><h3>How pipes fail</h3><ul class="plist">';
    h += '<li><b>Overpressure.</b> Brittle grey cast iron fractures the moment it passes its rating. Ductile steel yields and bulges first, and only ruptures if it stays overpressured. A bulge never goes back. Lead-lined pipe is rated 6 bar, so feed it from machines (5 bar), never straight from an 8 bar offshore pump.</li>';
    h += '<li><b>Thermal shock.</b> Cast iron cannot stretch. A cold fluid hitting a hot wall shrinks the inner surface and puts it in tension, and cast iron is weak in tension, so it cracks. Hot fluid into a cold pipe squeezes the surface instead, which cast iron tolerates about three times better. Cold water into a hot steam line is the classic way to crack it.</li>';
    h += '<li><b>Heat.</b> Every pipe has a top temperature. Lead softens far below steel.</li>';
    h += '<li><b>Corrosion.</b> Dilute sulfuric acid eats iron and steel (Fe + H₂SO₄ → FeSO₄ + H₂). Lead forms an insoluble PbSO₄ skin and stops corroding, which is why acid plants were lined with lead. But caustic soda dissolves lead as plumbite, so caustic and aluminate liquor go in steel. Brine and wet chlorine pit iron and steel; titanium\'s TiO₂ film shrugs them off, though hot sulfuric acid strips it. Match the pipe to the fluid: hover a fluid in the Materials tab to see what attacks what.</li>';
    h += '<li><b>Heat loss.</b> Pipes lose heat to the air. Steam cools along a long line and condenses below 100°C, so engines far from boilers make less power.</li>';
    h += '</ul><p class="dim">A failed pipe is destroyed and its contents spill. Press V for pressure, temperature and smog overlays. Smog above ' + RAIN + ' brings acid rain, which corrodes every pipe but lead-lined ones.</p>';
  } else if (modalTab === 'help') {
    h += HELP;
  } else if (modalTab === 'world') {
    h += worldHtml();
  } else if (modalTab === 'map') {
    h += mapHtml();
  }
  if (modalHtml !== h) { body.innerHTML = h; modalHtml = h; body.scrollTop = st; if (modalTab === 'world') drawPreview(); }
  if (modalTab === 'map') drawMapView();
}

const viaTxt = t => t.replace(/\b[a-z][a-z0-9_]*\b/g, w => { const d = ITEMS[w] || FLUIDS[w]; return d ? d.n.toLowerCase() : w; });
const CHAINS = [
  { n: 'Power', l: [['Offshore pump', 'water', 'Boiler + coal', 'steam', 'Steam engine']], d: 'Pumps go on water. Pipe the water into a boiler, give it coal by hand or belt, and let the steam reach an engine (touching or by pipe). One engine gives 900 kW from 30 steam/s. Furnaces and ovens burn fuel and need no power.' },
  { n: 'Iron', l: [['iron_ore', 'Crusher', 'crushed_iron', 'Ball mill + water', 'ground_iron', 'Magnetic separator', 'iron_conc'], ['iron_conc', 'Blast furnace + coke + crushed limestone', 'pig_iron', 'Converter', 'steel']], d: 'Banded iron ore is only about a third iron. Crushing and grinding free the iron mineral grains from the quartz, the magnet pulls them out, and the blast furnace strips the oxygen with carbon monoxide from burning coke.' },
  { n: 'Copper', l: [['copper_ore', 'Crusher', 'crushed_copper', 'Ball mill + water', 'ground_copper', 'Flotation + water', 'copper_conc'], ['copper_conc', 'Roaster', 'copper_calcine', 'Flash smelter + sand', 'copper_matte', 'Converter', 'blister_copper'], ['blister_copper', 'Electrolysis + acid', 'copper_cathode']], d: 'Copper sits in chalcopyrite, a copper-iron sulfide. Roasting burns off part of the sulfur as SO₂, silica slags off the iron, the converter burns the rest of the sulfur, and electrolysis gives 99.99% copper.' },
  { n: 'Lead and zinc', l: [['pbzn_ore', 'Crusher', 'crushed_pbzn', 'Ball mill + water', 'ground_pbzn', 'Flotation (lead)', 'galena_conc'], ['galena_conc', 'Roaster', 'lead_oxide', 'Blast furnace + coke', 'lead'], ['zinc_rougher', 'Flotation (zinc)', 'sphalerite_conc', 'Roaster', 'zinc_calcine'], ['zinc_calcine', 'Leach tank + acid', 'znso4', 'Electrolysis', 'zinc']], d: 'Galena and sphalerite grow together. Lead floats first while the zinc mineral is held down, then the leftover zinc rougher is floated again. Zinc electrowinning returns the sulfuric acid to the leach tank.' },
  { n: 'Fuel and flux', l: [['coal', 'Coke oven', 'coke'], ['limestone', 'Crusher', 'crushed_lime'], ['limestone', 'Lime kiln + coal', 'quicklime'], ['sand', 'Workshop + quicklime', 'brick']], d: 'Coke is the fuel and reducing agent of the blast furnace. Crushed limestone is the flux that turns quartz into slag. Quicklime and sand make refractory bricks for furnaces.' },
  { n: 'Sulfuric acid', l: [['so2', 'Acid plant + water', 'acid']], d: 'Every roaster and the copper converter give off SO₂. Pipe it to an acid plant instead of venting it. The acid feeds copper refining and zinc leaching.' },
  { n: 'Salt and chlorine', l: [['rock_salt', 'Crusher', 'salt', 'Leach tank + water', 'brine'], ['brine', 'Electrolysis (chlor-alkali)', 'cl2', '+', 'naoh', '+', 'h2'], ['salt', 'Electrolysis (Downs cell)', 'sodium', '+', 'cl2'], ['h2', 'Boiler + water', 'steam']], d: 'Splitting brine gives three products at once: chlorine, caustic soda and hydrogen. Chlorine and brine pit steel, so use lead-lined or titanium pipe; caustic eats lead, so use steel. Burn the spare hydrogen in a boiler.' },
  { n: 'Aluminium', l: [['bauxite', 'Crusher', 'crushed_bauxite', 'Digester + naoh + steam', 'liquor', 'Precipitator', 'al_hydroxide'], ['al_hydroxide', 'Lime kiln + coal', 'alumina', 'Reduction pot + anode', 'aluminium'], ['coke', 'Coke oven', 'anode']], d: 'The Bayer process dissolves alumina in hot caustic, leaving iron oxides behind as red mud, then precipitates it again and returns the caustic. The Hall-Héroult pot needs 600 kW: aluminium is "solid electricity". Gallium turns up in the liquor now and then.' },
  { n: 'Mineral sands and titanium', l: [['mineral_sand', 'Gravity spiral + water', 'heavy_conc', 'Magnetic separator', 'ilmenite'], ['nonmag', 'Electrostatic separator', 'rutile', '+', 'zircon'], ['ilmenite', 'Arc furnace + coke', 'ti_slag', '+', 'v_pig'], ['rutile', 'Chlorinator + coke + cl2', 'ticl4', 'Hunter retort + sodium', 'titanium']], d: 'Black beach sand holds titanium and zirconium minerals. Gravity, magnetism and static charge split them. Titanium dioxide is too stable to reduce with carbon, so it goes through chlorine: TiCl₄ meets molten sodium, and the salt that results goes back to the Downs cell. Titanium makes pipe that laughs at chlorine.' },
  { n: 'Clean air', l: [['so2', 'Gas scrubber + water + crushed limestone', 'gypsum'], ['cl2', 'Gas scrubber + caustic soda', 'bleach'], ['Roaster', 'Chimney stack', 'Smog spread thin']], d: 'Vented SO₂ and chlorine become smog, and smog over ' + RAIN + ' brings acid rain. An acid plant turns SO₂ into something useful; when it cannot keep up, a limestone scrubber locks the sulfur into gypsum. A stack only dilutes: the same sulfur still falls somewhere.' },
  { n: 'Cement', l: [['crushed_lime', 'Lime kiln + sand + coal', 'clinker'], ['clinker', 'Ball mill + gypsum', 'cement'], ['slag', 'Ball mill + clinker + gypsum', 'cement'], ['cement', 'Workshop + sand', 'concrete']], d: 'Portland cement needs gypsum from the scrubber, and blast furnace slag can replace half the clinker. Concrete blocks build walls.' },
  { n: 'Ammunition', l: [['caliche', 'Crusher', 'crushed_caliche', 'Leach tank + steam + water', 'sodium_nitrate', '+', 'salt'], ['pyrite_conc', 'Lime kiln + coal', 'sulfur', '+', 'pyrite_cinder'], ['sodium_nitrate', 'Ball mill + sulfur + coal', 'black_powder'], ['black_powder', 'Workshop + brass + lead', 'cartridge']], d: 'Crawlers smell SO₂ and come for whatever vents it. Turrets hold them off with lead shot. The powder is nitrate, sulfur and carbon: the nitrate supplies the oxygen, so it burns sealed in a brass case. Brick and concrete walls slow them down while the guns work.' },
  { n: 'Gas warfare', l: [['plate', 'Workshop', 'cylinder'], ['cl2', 'Cylinder filler + cylinder', 'cl2_cyl'], ['cl2_cyl', '+', 'black_powder', 'Livens projector', 'Gas cloud']], d: 'A Livens projector is a battery of buried tubes that throws a cylinder 1.5 km and bursts it on target. Chlorine is heavy and slow: watch the wind arrow in the top bar, because a cloud that drifts back eats your own works. Clear the hives guarding an abandoned works, then search it for salvage and lost processes.' },
  { n: 'Nitrogen', l: [['h2', 'Ammonia converter (Haber-Bosch)', 'nh3'], ['nh3', 'Ostwald burner + water', 'hno3'], ['sodium_nitrate', 'Retort + acid', 'hno3'], ['nh3', 'Leach tank + hno3', 'amm_nitrate', 'Ball mill + aluminium + coal', 'ammonal'], ['ammonal', 'Workshop + cylinder + black_powder', 'he_drum'], ['so2', 'Gas scrubber + nh3 + water', 'amm_sulfate']], d: 'Fritz Haber fixed nitrogen from air over an iron catalyst at 200 bar in 1909; Carl Bosch scaled it up. Ammonia burned over platinum gauze gives nitric acid, and the two together make ammonium nitrate, the base of fertiliser and of ammonal. The converter and the burner\'s platinum gauze only turn up in the ruins of the old works. Before Haber, nitric acid came from Chilean nitrate and sulfuric acid in a retort.' },
  { n: 'Coal tar and TNT', l: [['coal', 'Coke oven (by-products)', 'coke', '+', 'tar', '+', 'coalgas'], ['tar', 'Distillation column + steam', 'toluene', '+', 'pitch'], ['coke', 'Coke oven + pitch', 'anode'], ['toluene', 'Nitrator + hno3 + acid', 'tnt'], ['tnt', 'Workshop + plate + brass + black_powder', 'shell', 'Field howitzer', 'Hive']], d: 'A by-product coke oven keeps what a beehive oven burns off: tar and a hydrogen-rich gas that fires boilers. Distilled tar gives toluene for TNT and pitch that binds anodes. TNT needs mixed nitric and sulfuric acid: nitric acid dissolves lead, so pipe it in titanium or glass-lined pipe. The nitrator and the shell drawings are in the old works.' },
  { n: 'Phosgene', l: [['coke', 'Gas producer + co2', 'co'], ['coke', 'Gas producer + steam', 'carbon'], ['co', '+', 'cl2', 'Phosgene reactor + carbon', 'phosgene'], ['phosgene', 'Cylinder filler + cylinder', 'phos_cyl', 'Livens projector', 'Gas cloud']], d: 'Blow flue-gas CO₂ through white-hot coke and it comes out as carbon monoxide. Steam the coke instead and it turns into activated carbon, the catalyst on which CO and chlorine join into phosgene. Any phosgene the reactor cannot pass on leaks out as a cloud over your own works. Crawlers that survive a gas breed a tolerance to it, so rotate chlorine, ammonia, phosgene and explosives. The reactor drawings are in the old works.' },
  { n: 'Oil and plastics', l: [['crude', 'Crude distillation unit + steam', 'fuel_gas', '+', 'naphtha', '+', 'gas_oil', '+', 'bitumen'], ['naphtha', 'Tube furnace + steam (cracking)', 'ethylene', 'Pressure reactor', 'polyethylene'], ['ethylene', 'Pressure reactor + chlorine', 'edc', 'Tube furnace', 'vcm', '+', 'hcl'], ['hcl', 'Chlorinator + ethylene (oxychlorination)', 'edc'], ['vcm', 'Pressure reactor + water', 'pvc'], ['fuel_gas', 'Tube furnace + steam (reforming)', 'h2'], ['bitumen', 'Coke oven', 'pet_coke', 'Coke oven + pitch', 'anode']], d: 'Pumpjacks stand on oil seeps far from the start. The distillation unit splits crude by boiling point. Naphtha cracks to ethylene, the building block for polyethylene and PVC. Fuel gas fires the furnaces, raises steam, or reforms into hydrogen for ammonia. PVC and HDPE pipe resist acid and chlorine, but melt at 60°C.' },
  { n: 'Sulfur and clean fuel', l: [['gas_oil', 'Pressure reactor + h2', 'diesel', '+', 'h2s'], ['h2s', 'Claus unit + water', 'sulfur', '+', 'steam'], ['sulfur', 'Roaster', 'so2', 'Acid plant', 'acid'], ['diesel', 'Diesel generator', 'Power'], ['water', 'Leach tank + quicklime', 'bfw', '+', 'crushed_lime'], ['bfw', 'Boiler', 'steam']], d: 'Crude oil carries sulfur. Hydrotreating pulls it out as hydrogen sulfide and leaves clean diesel. The Claus unit burns a third of the H₂S and reacts the rest over alumina to sulfur, raising steam as it goes. Burning that sulfur gives strong, clean SO₂ for acid, which is where most of the world\'s sulfuric acid comes from today. Hard water scales boilers; lime softening drops the calcium out as chalk.' },
  { n: 'Fertilisers', l: [['sylvinite', 'Crusher', 'crushed_sylv', 'Flotation cell + brine', 'potash', '+', 'salt'], ['crushed_phos', 'Leach tank + acid + water', 'h3po4', '+', 'gypsum', '+', 'sif4'], ['crushed_phos', 'Granulator drum + acid', 'ssp'], ['crushed_phos', 'Granulator drum + h3po4', 'tsp'], ['nh3', 'Granulator drum + h3po4', 'dap'], ['nh3', 'Pressure reactor + co2', 'urea'], ['dap', 'Granulator drum + potash + urea', 'npk', 'Rail depot', 'Orders']], d: 'Plants need nitrogen, phosphorus and potassium, and a harvest carries them off the field. Lawes patented superphosphate in 1842 by pouring sulfuric acid on bones and rock. The wet process makes phosphoric acid, leaving mountains of phosphogypsum. Potash is mined as sylvinite, a mix of KCl and rock salt, and parted by flotation in brine. Haber ammonia ends up mostly as urea and DAP. Farmers pay well for all of it at the rail depot.' },
  { n: 'Vanadium and catalysts', l: [['v_pig', 'Converter', 'steel', '+', 'v_slag'], ['v_slag', 'Roaster + soda_ash', 'na_vanadate', 'Leach tank + nh4cl + water', 'amv'], ['amv', 'Lime kiln', 'v2o5', 'Workshop + sand', 'v_cat', 'Acid plant', 'acid'], ['spent_v_cat', 'Leach tank + naoh', 'na_vanadate'], ['iron_conc', 'Arc furnace + alumina + crushed_lime', 'fe_cat', 'Ammonia converter', 'nh3'], ['v2o5', 'Converter + steel + aluminium', 'v_steel', 'Armour wall', 'Defence']], d: 'Rudolf Knietsch at BASF worked out the Contact process on platinum in the 1890s; vanadium pentoxide replaced the easily poisoned platinum in the 1920s and still makes nearly all the world\'s sulfuric acid. A catalyst is not used up by the reaction, but dust, heat and poisons slowly kill it, so beds are screened and recharged. Mittasch\'s fused iron for Haber-Bosch came out of 20,000 trials and has barely changed since.' },
  { n: 'Phosphorus and fluorine', l: [['phosphate_rock', 'Crusher', 'crushed_phos'], ['crushed_phos', 'Arc furnace + sand + coke', 'phosphorus', '+', 'slag', '+', 'sif4'], ['sif4', 'Gas scrubber + water', 'h2sif6', 'Leach tank + crushed_lime', 'fluorspar'], ['fluorspar', 'Retort + acid', 'hf', 'Leach tank + al_hydroxide + naoh', 'cryolite'], ['cryolite', 'Reduction pot + alumina + anode', 'aluminium'], ['phosphorus', 'Workshop + brass + plate + powder', 'wp_shell', 'Field howitzer', 'Fire']], d: 'Phosphate rock sits in a few far-off beds. Most of the world\'s phosphate becomes fertiliser, but an electric furnace boils the element itself out of it as white phosphorus, which burns on contact with air. The fluorine in the apatite comes off as SiF₄ fume; scrub it, fix it with lime as fluorspar, and turn that into hydrofluoric acid and synthetic cryolite to top up your aluminium pots. Fluorides eat glass-lined and titanium pipe, so run them in lead.' },
  { n: 'Soda and glass', l: [['brine', 'Solvay tower + nh3 + co2', 'nahco3', '+', 'nh4cl'], ['nh4cl', 'Distillation column + quicklime + steam', 'nh3', '+', 'cacl2'], ['nahco3', 'Lime kiln', 'soda_ash', '+', 'co2'], ['sand', 'Glass tank + soda_ash + crushed_lime', 'glass'], ['soda_ash', 'Leach tank + quicklime + water', 'naoh']], d: 'The Solvay process makes soda ash from salt and limestone, with ammonia going round and round as a carrier. The lime kiln supplies both the CO₂ and the quicklime that frees the ammonia again. Soda ash makes glass for glass-lined pipe, and lime turns it into caustic soda without any electricity.' },
  { n: 'Pulp and paper', l: [['Timber harvester in forest', 'wood', 'Crusher', 'wood_chips'], ['wood_chips', 'Digester + wl + steam', 'pulp', '+', 'bl'], ['bl', 'Recovery boiler + water', 'smelt', '+', 'steam'], ['smelt', 'Leach tank + water', 'gl', 'Leach tank + quicklime', 'wl', '+', 'lime_mud'], ['lime_mud', 'Lime kiln + coal', 'quicklime'], ['salt', 'Roaster + acid', 'salt_cake', '+', 'hcl'], ['pulp', 'Leach tank + bleach + water', 'bleached_pulp', 'Paper machine + steam', 'paper']], d: 'The kraft process turns forest into paper and recycles almost all of its chemicals. White liquor cooks the lignin out of wood chips, leaving strong cellulose fibre. The spent black liquor is burnt in a recovery boiler: the lignin raises steam, and the sodium salts run out as smelt. Dissolved and treated with lime, the smelt becomes white liquor again, and the lime mud goes back to the kiln. Each loop loses about a tenth of the sodium; top it up with salt cake, or with caustic soda through a soda cook.' },
  { n: 'Salt and magnesium', l: [['Evaporation pond + water', 'salt', '+', 'bittern'], ['bittern', 'Leach tank + quicklime', 'mgoh2', '+', 'cacl2'], ['mgoh2', 'Leach tank + hcl', 'mgcl2', 'Electrolysis cell', 'magnesium', '+', 'cl2'], ['ticl4', 'Hunter retort + magnesium', 'titanium', '+', 'mgcl2']], d: 'Sun and wind are the cheapest energy there is. Salt works in dry climates have evaporated seawater and salt lakes for thousands of years, and the bitter liquor left behind holds the magnesium. In 1941 Dow began pulling magnesium out of the sea with lime, and the Kroll process that followed made titanium affordable: magnesium strips the chlorine from TiCl₄, and electrolysis gives back both the magnesium and the chlorine.' },
  { n: 'Bromine and photography', l: [['bittern', 'Distillation column + cl2 + steam', 'br2'], ['br2', 'Gas scrubber + naoh', 'nabr'], ['silver', 'Leach tank + hno3', 'agno3'], ['paper', 'Paper machine + agno3 + nabr', 'photo_paper']], d: 'Bittern holds bromide as well as magnesium. Chlorine is the stronger oxidiser, so it pushes bromine out of the brine, and steam carries it away as a red vapour. Bromine went into the first photographic emulsions in the 1870s: silver bromide is far more sensitive to light than the chloride, and bromide paper let a print be enlarged from a small negative in seconds.' },
  { n: 'Rubber and tyres', l: [['naphtha', 'Tube furnace + steam (C4 cut)', 'ethylene', '+', 'butadiene'], ['toluene', 'Tube furnace + h2', 'benzene'], ['benzene', 'Pressure reactor + ethylene + steam', 'styrene', '+', 'h2'], ['butadiene', 'Pressure reactor + styrene + water', 'sbr'], ['gas_oil', 'Tube furnace + fuel_gas', 'carbon_black', '+', 'co'], ['sbr', 'Tyre curing press + carbon_black + sulfur + steel + steam', 'tyre']], d: 'Synthetic rubber was a crash programme: when the plantations of Malaya fell in 1942, America built a whole industry to copolymerise butadiene with styrene. Carbon black from starved oil flames makes it tough, and sulfur from the Claus unit crosslinks it in a steam-heated press. Rubber also lines steel pipe, which then carries hydrochloric acid and brine at full steel pressure, as long as it stays below 90°C.' },
  { n: 'Air separation', l: [['Air separation unit (power only)', 'o2', '+', 'n2'], ['pig_iron', 'Converter + o2 + quicklime', 'steel', '+', 'slag'], ['n2', 'Ammonia converter + h2', 'nh3'], ['o2', 'Cylinder filler + cylinder', 'o2_cyl']], d: 'Linde liquefied air in 1895 and was distilling it into oxygen and nitrogen by 1902. Cheap tonnage oxygen changed steelmaking: an oxygen converter gives three tonnes of steel where a Bessemer gave two, ten times faster, with no nitrogen to make the steel brittle. The nitrogen goes to the ammonia loop.' },
  { n: 'Silicon and solar', l: [['sand', 'Arc furnace + coke', 'si_metal'], ['si_metal', 'Chlorinator + hcl', 'sihcl3', '+', 'h2'], ['sihcl3', 'Siemens reactor + h2', 'polysilicon', '+', 'hcl'], ['polysilicon', 'Crystal puller', 'wafer'], ['wafer', 'Cell line + phosphorus + silver', 'solar_cell']], d: 'Sand becomes the purest material people make. Arc-furnace silicon is turned into a liquid that can be distilled, then grown back into silicon nine nines pure, drawn into one flawless crystal and sliced. The cells go into solar arrays that make power from nothing but daylight, best in the desert.' },
  { n: 'Methanol and silicones', l: [['fuel_gas', 'Tube furnace + steam', 'co', '+', 'h2'], ['co', 'Pressure reactor + h2 + cu_cat', 'methanol'], ['methanol', 'Ostwald burner + water', 'hcho'], ['urea', 'Pressure reactor + hcho', 'uf_resin'], ['wood_chips', 'Curing press + uf_resin + steam', 'particleboard'], ['methanol', 'Pressure reactor + hcl', 'ch3cl'], ['si_metal', 'Chlorinator + ch3cl + cu_cat', 'dmdcs'], ['dmdcs', 'Pressure reactor + water', 'silicone', '+', 'hcl']], d: 'Methanol is the simplest alcohol and a building block for half of organic chemistry. Burn it to formaldehyde and the urea plant gives you glue for particleboard. Turn it into chloromethane, blow that through hot silicon with copper and you get the chlorosilanes that become silicone rubber, with the HCl coming back round.' },
  { n: 'Detergents', l: [['ethylene', 'Pressure reactor', 'olefins'], ['benzene', 'Pressure reactor + olefins + hf', 'lab'], ['lab', 'Pressure reactor + acid', 'las'], ['h3po4', 'Kiln + soda_ash', 'stpp'], ['sand', 'Glass tank + soda_ash', 'water_glass'], ['las', 'Spray tower + naoh + stpp + water_glass', 'detergent']], d: 'Soap curdles in hard water; a synthetic surfactant does not. Ethylene is strung into long chains, hung on benzene and sulfonated. Neutralised with caustic and mixed with phosphate to soften the water and silicate to protect the machine, it is spray-dried into washing powder.' },
  { n: 'Nylon', l: [['benzene', 'Pressure reactor + h2', 'cyclohexane'], ['cyclohexane', 'Pressure reactor + o2', 'ka_oil'], ['ka_oil', 'Pressure reactor + hno3', 'adipic_acid', '+', 'n2o'], ['n2o', 'Scrubber', 'n2'], ['adipic_acid', 'Pressure reactor + nh3 + h2', 'hmda'], ['hmda', 'Precipitator + adipic_acid + water', 'nylon_salt'], ['nylon_salt', 'Pressure reactor', 'nylon'], ['nylon', 'Melt spinner', 'nylon_fibre']], d: 'Two six-carbon molecules, both made from benzene, one with acid ends and one with amine ends. Pair them exactly and heat them, and they link into chains thousands of units long. The nitric acid step gives off nitrous oxide, a strong greenhouse gas, so run it through a scrubber.' },
  { n: 'Aspirin', l: [['naphtha', 'Tube furnace + steam', 'propylene'], ['benzene', 'Pressure reactor + propylene', 'cumene'], ['cumene', 'Pressure reactor + o2 + acid', 'phenol', '+', 'acetone'], ['methanol', 'Pressure reactor + co', 'acetic'], ['acetic', 'Tube furnace', 'ac2o'], ['phenol', 'Pressure reactor + naoh + co2 + acid', 'salicylic'], ['salicylic', 'Precipitator + ac2o', 'aspirin', '+', 'acetic'], ['aspirin', 'Tablet line + pvc + aluminium', 'aspirin_pack']], d: 'Willow bark has been chewed for pain since the Sumerians. Its salicylic acid is now made from phenol and CO₂, and acetic anhydride caps it into aspirin. The acetic acid comes from methanol and carbon monoxide and goes round in a loop.' },
  { n: 'Polycarbonate, epoxy and wind', l: [['methanol', 'Pressure reactor + co + o2', 'dmc'], ['dmc', 'Pressure reactor + phenol', 'dpc', '+', 'methanol'], ['phenol', 'Pressure reactor + acetone + acid', 'bpa'], ['bpa', 'Pressure reactor + dpc', 'polycarbonate', '+', 'phenol'], ['propylene', 'Pressure reactor + cl2 + naoh', 'ech'], ['bpa', 'Pressure reactor + ech + naoh', 'epoxy'], ['sand', 'Glass tank + limestone + alumina', 'glass_fibre'], ['glass_fibre', 'Blade mould + epoxy', 'blade']], d: 'Acetone from the phenol plant joins two phenols into bisphenol A. Carbonate made from methanol links it into polycarbonate, and epichlorohydrin caps it into epoxy. Epoxy and glass fibre make wind turbine blades.' },
  { n: 'Polypropylene and batteries', l: [['propylene', 'Pressure reactor + ticl4', 'polypropylene'], ['lead', 'Battery plant + lead_oxide + polypropylene + acid', 'battery']], d: 'A Ziegler-Natta catalyst turns propylene into polypropylene for battery cases. Lead, lead oxide and sulfuric acid make the cells. A bank of them stores spare wind and solar power for when the wind drops.' },
  { n: 'Titanium white and paint', l: [['ticl4', 'Pressure reactor + o2', 'tio2', '+', 'cl2'], ['ethylene', 'Pressure reactor + acetic + o2', 'vam'], ['vam', 'Pressure reactor + water', 'pva_em'], ['tio2', 'Paint disperser + limestone + plate + pva_em', 'paint']], d: 'Titanium tetrachloride burned in oxygen gives the whitest pigment there is and hands its chlorine back. Ethylene and acetic acid make vinyl acetate, which is polymerised in water into the binder for emulsion paint.' },
  { n: 'By-products', l: [['ground_copper', 'Flotation', 'copper_conc', '+', 'pyrite_conc'], ['pyrite_conc', 'Roaster', 'pyrite_cinder', 'Blast furnace', 'pig_iron'], ['anode_slime', 'Roaster', 'dore', 'Leach tank + acid', 'silver']], d: 'Nothing is waste. Pyrite gives SO₂ for acid and its cinder is iron ore. Anode slime from copper refining yields selenium, silver and gold.' },
];

const HELP = `<div class="help">
<p>Build a factory that turns real ore into metal using real chemistry.</p>
<h3>Controls</h3>
<ul>
<li><b>Left click</b> a building in the bar at the bottom, then click the map to place it. Drag to lay belts and pipes.</li>
<li><b>R</b> rotates. <b>Q</b> or <b>Esc</b> puts the tool away.</li>
<li><b>Right click</b> picks a building up again, with its contents.</li>
<li><b>Click</b> a building to inspect it, set its recipe, insert items or take outputs.</li>
<li><b>Click and hold</b> on ore to mine it by hand.</li>
<li><b>WASD</b> or arrows move the camera. <b>Mouse wheel</b> zooms. Middle drag pans.</li>
<li><b>E</b> opens crafting. <b>H</b> opens the encyclopedia. <b>V</b> cycles the pressure, temperature and smog overlays.</li>
</ul>
<h3>Getting started</h3>
<ol>
<li>Put an <b>Offshore pump</b> on the lake, run <b>pipe</b> to a <b>Boiler</b>, and put a <b>Steam engine</b> next to the boiler.</li>
<li>Mine some coal by hand and insert it into the boiler. Engines power every electric machine on the map.</li>
<li>Place <b>Miners</b> on ore. They drop ore onto any belt that touches them and does not point into them.</li>
<li>Belts that point into a machine feed it. Machines hand their outputs to touching machines and belts first, and only put an output into a touching chest when no touching machine uses it.</li>
<li>A chest that holds a machine's inputs feeds that machine and does not take its outputs.</li>
<li>Follow the <b>Ore chains</b> in the encyclopedia: crush, grind, separate, then smelt.</li>
</ol>
<h3>Pipes</h3>
<p>Pipes have real pressure, flow and temperature. Cast iron is cheap but brittle and bursts above 16 bar. Steel pipe carries four times the flow and bulges before it bursts. Acid, brine and chlorine eat both, so carry them in lead-lined or titanium pipe, and caustic in steel. Booster pumps push fluid further. See <b>Pipes</b> in the encyclopedia.</p>
<h3>Smog and acid rain</h3>
<p>Gas a machine cannot pass on is vented. SO₂ and chlorine hang over the area as brown smog, drift to neighbouring areas and slowly wash out. Where smog passes ${RAIN}, acid rain falls and eats every pipe except lead-lined ones. Capture SO₂ in an acid plant or a gas scrubber, absorb chlorine with caustic, or touch the venting machine to a chimney stack to spread its fumes thin. CO₂ counts for little smog but is tallied in the top bar.</p>
<h3>Gas, wind and the old works</h3>
<p>Fill steel cylinders with chlorine or ammonia in a <b>Cylinder filler</b> and load them, with black powder, into a <b>Livens projector</b>. It lobs them at the nearest hive within 28 tiles. The gas cloud drifts with the wind shown in the top bar, spreads and thins out. Chlorine is heavy and lingers, and it corrodes any building it settles on, yours included. Ammonia is lighter than air and harsher on crawlers but disperses fast. Abandoned chemical works lie far out in the wilds, guarded by hives. Clear the hives within 16 tiles and search the works for platinum gauze, motors, cylinders and a lost process such as Haber-Bosch ammonia. Hive wreckage sometimes holds a lab notebook too.</p>
<h3>Coal tar, soda and glass</h3>
<p>Set a coke oven to <b>Coke + by-products</b> and pipe away its tar; the oven gas burns in a boiler. A <b>Distillation column</b> splits tar into toluene and pitch, and also boils the ammonia back out of Solvay liquor. The <b>Solvay tower</b> needs brine, ammonia and CO₂ from a lime kiln, and its soda ash melts with sand and limestone into glass. Glass-lined pipe holds any acid but cracks on a sudden temperature change. With the lost drawings, a <b>Nitrator</b> turns toluene into TNT for the shells of a <b>Field howitzer</b>, which shells hives up to 44 tiles away.</p>
<h3>Phosgene and tolerance</h3>
<p>A <b>Gas producer</b> turns coke and CO₂ into carbon monoxide, or coke and steam into water gas or activated carbon. A <b>Phosgene reactor</b> joins CO and chlorine over the carbon. Phosgene is about six times as deadly as chlorine and drifts low and slow. If its output pipe backs up, the reactor leaks and the cloud settles on your own buildings. Each gas you fire breeds tolerance in the crawlers, up to 80%, which fades over several minutes. The hive and projector panels show it.</p>
<h3>Phosphorus and fluorine</h3>
<p>Mine <b>phosphate rock</b> and smelt it in the <b>Electric arc furnace</b> with sand and coke to get white phosphorus. The furnace also gives off CO and SiF₄. Vented SiF₄ is a heavy pollutant, so scrub it to fluorosilicic acid and turn that into fluorspar with crushed limestone. Fluorspar in a retort with sulfuric acid makes hydrofluoric acid, and HF with aluminium hydroxide and caustic makes cryolite, which lets reduction pots run faster. Fluorides dissolve glass-lined and titanium pipe three times faster than steel; lead-lined pipe resists them. <b>WP shells</b> from the old works' books set the ground burning for 14 seconds. The fire ignores gas tolerance but also burns your own buildings.</p>
<h3>Oil and plastics</h3>
<p>Dark, glistening <b>oil seeps</b> lie far from the start. A <b>Pumpjack</b> placed on one lifts crude oil and slowly drains the tiles under it. The <b>Crude distillation unit</b> needs a little steam and splits crude into fuel gas, naphtha, gas oil and bitumen. The <b>Tube furnace</b> burns fuel gas to crack naphtha into ethylene, reform fuel gas into hydrogen, or crack EDC into vinyl chloride. Ethylene polymerises to polyethylene in the <b>Pressure reactor</b>, or takes on chlorine to make EDC. Feed the HCl from EDC cracking back into a chlorinator with more ethylene. Plastic pipe shrugs off acid and chlorine but softens at 60°C.</p>
<h3>The world</h3>
<p>Every world is generated from a seed. Press <b>New world</b> to pick a seed, size, water, ore richness and crawler density, with a live preview. Your start is always temperate with a lake and the six basic ores nearby. Further out, the land follows its climate: cold <b>tundra</b> to the north, hot <b>deserts</b> to the south, <b>forests</b> and <b>marshes</b> where it is wet, rivers running down from the hills to the sea. <b>Bare rock</b> ridges are too steep to build on and block crawlers. Ores follow geology, so prospect by biome: copper and lead-zinc in the hills, coal under swamps and forests, salt, caliche and potash in deserts, bauxite in hot wet laterite, mineral sands on beaches. Press <b>M</b> for the world map.</p>
<h3>Pulp and paper</h3>
<p>Forests are now a resource. A <b>Timber harvester</b> placed in or beside forest cuts pulpwood forever, faster the more forest is within 4 tiles. Chip the logs in a crusher, then cook the chips in a <b>Digester</b> with white liquor and steam. The <b>Recovery boiler</b> burns the black liquor for steam and gives smelt, which a leach tank dissolves to green liquor and then causticises with quicklime back to white liquor. Burn the lime mud back to quicklime in a kiln. To start a mill, or to top up what the loop loses, run a <b>soda cook</b> on caustic soda, or feed the recovery boiler <b>salt cake</b> made from salt and acid in a roaster. A <b>Paper machine</b> turns pulp into kraft paper, or bleached pulp into white paper, for customers at the rail depot.</p>
<h3>Salt and magnesium</h3>
<p>An <b>Evaporation pond</b> needs no fuel or power: pipe lake water in and the sun leaves salt and <b>bittern</b>, a brine rich in magnesium. It only works well in hot, dry country, so build ponds on desert sand. A leach tank with quicklime turns bittern into magnesium hydroxide (and calcium chloride, which the highways buy for de-icing); dissolve that in HCl and split the chloride in an electrolysis cell. Magnesium in the <b>Hunter retort</b> runs the <b>Kroll process</b>, which reduces TiCl₄ and returns its own MgCl₂ to the cell.</p>
<h3>Bromine and photography</h3>
<p>Run bittern through a <b>Distillation column</b> with chlorine and steam to strip out <b>bromine</b>, a red, corrosive liquid. Keep it in glass-lined or lead-lined pipe; it eats titanium, plastics and rubber. A gas scrubber with caustic soda turns it into sodium bromide, which oilfields buy as a dense completion brine. Dissolve silver in nitric acid for silver nitrate, then coat white paper with both in the paper machine to make <b>photographic paper</b>. The bittern can go on to the magnesium plant first or after, since only part of it is used.</p>
<h3>Rubber and tyres</h3>
<p>Set a tube furnace to <b>Steam cracking (C₄ cut)</b> for butadiene as well as ethylene. Toluene and hydrogen in another furnace give benzene, which a pressure reactor turns into styrene with ethylene and steam. Polymerise the two together for <b>synthetic rubber</b>. A tube furnace burning gas oil short of air makes carbon black. The <b>Tyre curing press</b> vulcanises rubber, black, sulfur and steel into tyres with steam. Rubber also makes <b>rubber-lined pipe</b>: full-bore steel at 25 bar that resists acid, chlorides, caustic and fluorides, but keep it below 90°C and away from nitric acid and bromine.</p>
<h3>Air separation</h3>
<p>The <b>Air separation unit</b> needs only power (400 kW), and makes oxygen and nitrogen from thin air. Set a converter to <b>Steel (basic oxygen)</b> and feed it oxygen and quicklime: it turns 3 pig iron into 3 steel, twice as fast as the Bessemer blow. Nitrogen fed into the ammonia converter gives more ammonia from the same hydrogen. Fill cylinders with oxygen for the hospital. Spare nitrogen vents harmlessly.</p>
<h3>Silicon and solar</h3>
<p>Quartz sand and coke in the <b>Arc furnace</b> give metallurgical silicon. A chlorinator turns it with HCl into <b>trichlorosilane</b> and hydrogen; pipe both to a <b>Siemens reactor</b>, which grows polysilicon and hands most of the HCl back. Make up the rest by burning chlorine in hydrogen. The <b>Crystal puller</b> grows wafers, and the <b>Cell line</b> dopes them with phosphorus and prints silver contacts. A <b>Solar array</b> needs no fuel, and gives its full 150 kW on desert sand but only a fraction in forest or tundra, so site your arrays where ponds do best.</p>
<h3>Methanol and silicones</h3>
<p>Set a tube furnace to <b>Syngas (reforming)</b> for carbon monoxide and hydrogen in one stream, and pipe it to a pressure reactor on <b>Methanol</b>. Load a <b>copper-zinc catalyst</b> (made in the precipitator from copper, zinc, alumina and nitric acid) or it will crawl. An Ostwald burner turns methanol into <b>formalin</b>; cook that with urea for <b>UF resin</b> and press it with wood chips into particleboard. For silicones, react methanol with HCl into chloromethane, run it through ground silicon in a chlorinator (the <b>Rochow</b> process), and hydrolyse the product with water. The HCl that comes off feeds the chloromethane reactor again.</p>
<h3>Detergents</h3>
<p>A pressure reactor strings ethylene into <b>linear olefins</b>; another hangs them on benzene with a little HF as catalyst, and a third sulfonates the result with sulfuric acid into <b>LAS acid</b>. A kiln makes <b>sodium tripolyphosphate</b> from phosphoric acid and soda ash, and the glass tank makes <b>sodium silicate</b> from sand and soda ash. The <b>Spray tower</b> neutralises the LAS with caustic soda, mixes in the builders and dries it with a gas flame into washing powder.</p>
<h3>Nylon</h3>
<p>Hydrogenate benzene to <b>cyclohexane</b>, oxidise it with oxygen to <b>KA oil</b>, and open the ring with nitric acid to get <b>adipic acid</b>. That step vents <b>nitrous oxide</b>, which pollutes heavily; a <b>Scrubber</b> set to N₂O abatement turns it into nitrogen. Half the adipic acid goes with ammonia and hydrogen to <b>hexamethylenediamine</b>; the precipitator pairs it with the other half as <b>nylon salt</b>. The pressure reactor polymerises the salt, and the <b>Melt spinner</b> draws the chips into yarn.</p>
<h3>Aspirin</h3>
<p>The tube furnace can crack naphtha for <b>propylene</b>. A pressure reactor joins it to benzene as <b>cumene</b>, and another oxidises cumene and splits it into <b>phenol</b> and <b>acetone</b>. Phenol, caustic soda and CO₂ make <b>salicylic acid</b>. Separately, methanol and carbon monoxide make <b>acetic acid</b>, which the tube furnace turns into <b>acetic anhydride</b>. The precipitator combines the two into aspirin and gives back acetic acid. The <b>Tablet line</b> presses it and packs it in PVC and aluminium blisters.</p>
<h3>Polycarbonate, epoxy and wind</h3>
<p>Phenol and acetone make <b>bisphenol A</b>. Methanol, CO and oxygen make <b>dimethyl carbonate</b>, which swaps its methyls for phenol as <b>diphenyl carbonate</b>; melted with BPA it gives <b>polycarbonate</b> and returns the phenol. Propylene, chlorine and caustic make <b>epichlorohydrin</b>, which turns BPA into <b>epoxy</b>. The glass tank draws <b>E-glass fibre</b>, and the <b>Blade mould</b> infuses it with epoxy into rotor blades for the <b>Wind turbine</b>. A turbine gives up to 400 kW. Its output follows the live wind speed cubed and how open the ground is: open steppe or tundra is best, forest worst.</p>
<h3>Polypropylene and batteries</h3>
<p>The pressure reactor turns <b>propylene</b> into <b>polypropylene</b>, using a little titanium tetrachloride as the Ziegler-Natta catalyst. The <b>Battery plant</b> makes <b>lead-acid batteries</b> from lead, lead oxide, polypropylene and sulfuric acid. A <b>Battery bank</b> holds 10 kWh. It charges only from generating capacity nothing else is using, at up to 250 kW, and gets 85% of it back. When demand is more than your generators can give, it discharges at up to 250 kW. The power bar shows total charge, with ▲ while charging and ▼ while discharging. Banks smooth out wind and solar and keep the plant running through a lull.</p>
<h3>Titanium white and paint</h3>
<p>Burn <b>titanium tetrachloride</b> with oxygen to get <b>titanium white</b>. The chlorine comes back out, so pipe it to the chlorinator. <b>Vinyl acetate</b> is made from ethylene, acetic acid and oxygen, then polymerised with water into <b>PVA emulsion</b>. The <b>Paint disperser</b> mixes pigment, limestone filler and binder and fills the paint into steel tins.</p>
<h3>Boiler water</h3>
<p>Raw water is hard. Every boiler batch on it bakes a little chalk onto the tubes, steam output falls as the <b>scale</b> builds, and a fully choked boiler stops. Shut it down to <b>Descale</b> from its panel (a 20 second outage), or feed it <b>softened water</b>: run water through a leach tank with quicklime and the hardness settles out as crushed limestone you can send back to the kiln. Any machine that takes water also takes softened water.</p>
<h3>Sulfur and diesel</h3>
<p>The <b>Pressure reactor</b> hydrotreats gas oil with hydrogen into <b>diesel</b>, giving off hydrogen sulfide. Vented H₂S is a bad pollutant; a <b>Claus unit</b> with a little water turns it into sulfur and steam. Burn sulfur in a roaster for clean SO₂ to feed an acid plant. The <b>Diesel generator</b> gives up to 600 kW and burns fuel only for the power actually drawn. It runs on raw gas oil too, but then sends SO₂ up the exhaust.</p>
<h3>Fertilisers</h3>
<p>Pink-and-red <b>sylvinite</b> beds hold potash. Crush it and float it in a <b>Flotation cell</b> fed with brine: the KCl floats, the rock salt sinks. Sulfuric acid on crushed phosphate in the <b>Granulator drum</b> gives single superphosphate. In a leach tank it gives <b>phosphoric acid</b> plus gypsum, which makes triple superphosphate, or DAP with ammonia. The <b>Pressure reactor</b> turns ammonia and CO₂ into urea. DAP, potash and urea granulate together into NPK.</p>
<h3>Rail depot and orders</h3>
<p>Build a <b>Rail depot</b> and customers post up to three orders, each for something your factory can already make. Feed the goods in from touching belts, chests or machines, or load them by hand from the depot panel. Each filled order pays in parts and buildings. Every third order also brings a lab notebook from the buyer's own works (Haber ammonia first, then Ostwald nitric acid and the ammonia scrubber), or a repeat-custom bonus once you know them all, and bigger, better-paying customers turn up as you fill more.</p>
<h3>Catalysts and vanadium</h3>
<p>The <b>Acid plant</b> and the <b>Ammonia converter</b> have a catalyst bed. Empty, the acid plant runs as a slow lead chamber; loaded with <b>V₂O₅ catalyst rings</b> it becomes a Contact plant at up to 2.5× speed. Fused iron catalyst doubles a Haber converter. Each charge lasts a few hundred batches and loses activity in its last third, and the bed holds four charges. Vanadium comes from the iron in ilmenite: blow that pig iron in a converter to skim off vanadium slag, salt-roast it with soda ash, leach with Solvay ammonium chloride and calcine. Spent rings leach back with caustic. V₂O₅ reduced with aluminium into steel gives <b>vanadium steel</b> for armour walls.</p>
<h3>Crawlers</h3>
<p>Crawler hives sit in the wilds. The crawlers' gut bacteria live on sulfur, so hives breathe in the smog that drifts to them and send swarms at whatever vented last. They chew through anything in their path except belts, and every eighth swarm founds a new hive closer to the smog. The cleaner you run, the hungrier they stay. Gun turrets need lead shot cartridges, made from Chilean nitrate, sulfur and coal. Brick and concrete walls buy the guns time.</p>
</div>`;

function doCraft(t, n) {
  const B = BUILD[t];
  if (!buildOk(t)) return toast('Locked. The design is in the lab books of an abandoned works.', true);
  if (!canAfford(B.cost, n)) return toast('Not enough materials', true);
  pay(B.cost, n);
  give(t, (B.makes || 1) * n);
  toast(`Crafted ${(B.makes || 1) * n} ${B.n}`);
  renderModal(); renderHotbar();
}
function doPart(id, n) {
  const r = RECIPE[id];
  if (!canAfford(r.i, n)) return toast('Not enough materials', true);
  pay(r.i, n);
  give(id, r.o[id] * n);
  toast(`Crafted ${r.o[id] * n} ${nm(id)}`);
  renderModal(); renderHotbar();
}

function placeAt(fx, fy) {
  const o = toolOrigin(tool, fx, fy);
  const r = place(tool, o.x, o.y, toolDir);
  if (typeof r === 'string') return r;
  if (!(S.inv[tool] > 0)) tool = null;
  renderHotbar();
  return r;
}

function dragTo(tx, ty) {
  while (drag.x !== tx || drag.y !== ty) {
    const dx = tx - drag.x, dy = ty - drag.y;
    let d;
    if (Math.abs(dx) >= Math.abs(dy)) d = dx > 0 ? 1 : 3; else d = dy > 0 ? 2 : 0;
    if (tool === 'belt') {
      toolDir = d;
      const prev = drag.last && ents.get(drag.last);
      if (prev && prev.type === 'belt') prev.dir = d;
    }
    drag.x += DX[d]; drag.y += DY[d];
    if (!tool) break;
    const r = place(tool, drag.x, drag.y, toolDir);
    drag.last = typeof r === 'string' ? null : r.id;
    if (!(S.inv[tool] > 0)) { tool = null; break; }
  }
  renderHotbar();
}

cv.addEventListener('contextmenu', ev => ev.preventDefault());
cv.addEventListener('mousedown', ev => {
  updateMouse(ev);
  if (ev.button === 1) { mouse.m = true; mouse.px = ev.clientX; mouse.py = ev.clientY; ev.preventDefault(); return; }
  if (ev.button === 2) {
    mouse.r = true;
    const e = at(mouse.tx, mouse.ty);
    if (e && kind(e) === 'hive') toast('Hives cannot be picked up. Shoot or gas them.', true);
    else if (e && kind(e) === 'ruin') toast('The old works are too far gone to move. Click to search them.', true);
    else if (e) { removeEnt(e); renderHotbar(); }
    else if (tool) { tool = null; renderHotbar(); }
    return;
  }
  if (ev.button !== 0) return;
  mouse.l = true;
  if (tool) {
    const r = placeAt(mouse.fx, mouse.fy);
    if (typeof r === 'string') { toast(r, true); return; }
    if (['belt', 'pipe', 'wall'].includes(BUILD[r.type].kind)) drag = { x: r.x, y: r.y, last: r.id };
    return;
  }
  const e = at(mouse.tx, mouse.ty);
  if (e) { openPanel(e); return; }
  closePanel();
  const i = mouse.ty * W + mouse.tx;
  if (mouse.tx >= 0 && mouse.ty >= 0 && mouse.tx < W && mouse.ty < H && solid(i)) mining = { x: mouse.tx, y: mouse.ty, p: 0 };
});
window.addEventListener('mouseup', ev => {
  if (ev.button === 0) { mouse.l = false; drag = null; }
  if (ev.button === 1) mouse.m = false;
  if (ev.button === 2) mouse.r = false;
});
function updateMouse(ev) {
  const r = cv.getBoundingClientRect();
  mouse.x = ev.clientX - r.left; mouse.y = ev.clientY - r.top;
  const t = screenToTile(mouse.x, mouse.y);
  mouse.fx = t.fx; mouse.fy = t.fy;
  mouse.tx = Math.floor(t.fx); mouse.ty = Math.floor(t.fy);
}
cv.addEventListener('mousemove', ev => {
  const ptx = mouse.tx, pty = mouse.ty;
  updateMouse(ev);
  mouse.in = true;
  if (mouse.m) { cam.x -= (ev.clientX - mouse.px) / cam.z; cam.y -= (ev.clientY - mouse.py) / cam.z; mouse.px = ev.clientX; mouse.py = ev.clientY; }
  if (mouse.r && (ptx !== mouse.tx || pty !== mouse.ty)) { const e = at(mouse.tx, mouse.ty); if (e && (e.type === 'belt' || kind(e) === 'pipe')) { removeEnt(e); renderHotbar(); } }
  if (drag && mouse.l && tool && (drag.x !== mouse.tx || drag.y !== mouse.ty)) dragTo(mouse.tx, mouse.ty);
  const info = tool ? '' : tileInfo(mouse.tx, mouse.ty);
  if (info) {
    tip.innerHTML = info; tip.hidden = false;
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    tip.style.left = Math.min(ev.clientX + 16, window.innerWidth - tw - 8) + 'px';
    tip.style.top = Math.min(ev.clientY + 16, window.innerHeight - th - 8) + 'px';
  } else tip.hidden = true;
});
cv.addEventListener('mouseleave', () => { mouse.in = false; tip.hidden = true; });
cv.addEventListener('wheel', ev => {
  ev.preventDefault();
  updateMouse(ev);
  const before = { x: mouse.fx, y: mouse.fy };
  cam.z = Math.max(6, Math.min(72, cam.z * (ev.deltaY < 0 ? 1.15 : 1 / 1.15)));
  const after = screenToTile(mouse.x, mouse.y);
  cam.x += before.x - after.fx; cam.y += before.y - after.fy;
}, { passive: false });

window.addEventListener('keydown', ev => {
  if (ev.target.tagName === 'SELECT' || ev.target.tagName === 'INPUT') return;
  const k = ev.key.toLowerCase();
  keys[k] = true;
  if (k === 'e') { modalKind === 'craft' ? closeModal() : openModal('craft'); }
  else if (k === 'h') { modalKind === 'ency' ? closeModal() : openModal('ency'); }
  else if (k === 'm') { modalKind === 'map' ? closeModal() : openModal('map'); }
  else if (k === 'escape' || k === 'q') { if (modalKind) closeModal(); else if (tool) { tool = null; renderHotbar(); } else closePanel(); }
  else if (k === 'r') {
    if (tool) toolDir = (toolDir + 1) % 4;
    else { const e = at(mouse.tx, mouse.ty); if (e && (e.type === 'belt' || e.type === 'sorter' || e.type === 'booster')) e.dir = (e.dir + 1) % 4; }
  }
  else if (k === 'v') { overlay = (overlay + 1) % 4; toast(['Overlay off', 'Pressure overlay', 'Temperature overlay', 'Smog overlay'][overlay]); }
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) ev.preventDefault();
});
window.addEventListener('keyup', ev => { keys[ev.key.toLowerCase()] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.l = mouse.r = mouse.m = false; });

hotbar.addEventListener('click', ev => { const b = ev.target.closest('[data-tool]'); if (b) selectTool(b.dataset.tool); });
panel.addEventListener('click', ev => { const b = ev.target.closest('button[data-act]'); if (b) panelAct(b.dataset.act, b); });
panel.addEventListener('change', ev => { const s = ev.target.closest('select[data-act]'); if (s) panelAct(s.dataset.act, s); });
modal.addEventListener('click', ev => {
  if (ev.target === modal) return closeModal();
  const t = ev.target.closest('[data-tab]');
  if (t) { modalTab = t.dataset.tab; modal.querySelector('.mbody').scrollTop = 0; return renderModal(); }
  const c = ev.target.closest('[data-craft]');
  if (c) return doCraft(c.dataset.craft, +c.dataset.n);
  const p = ev.target.closest('[data-part]');
  if (p) return doPart(p.dataset.part, +p.dataset.n);
  const wb = ev.target.closest('[data-world]');
  if (wb && wb.dataset.world === 'dice') { wcfg.seed = String(Math.floor(Math.random() * 1e9)); $('#wseed').value = wcfg.seed; return drawPreview(); }
  if (wb && wb.dataset.world === 'go') return startWorld();
  if (ev.target.id === 'wmap') {
    const r = ev.target.getBoundingClientRect();
    cam.x = (ev.clientX - r.left) / r.width * W; cam.y = (ev.clientY - r.top) / r.height * H;
    return closeModal();
  }
  if (ev.target.closest('[data-ui="close"]')) closeModal();
});
modal.addEventListener('change', ev => {
  const m = { wseed: 'seed', wsize: 'size', wwater: 'water', wore: 'ore', whives: 'hives' }[ev.target.id];
  if (!m || !wcfg) return;
  wcfg[m] = ev.target.value;
  drawPreview();
});
document.getElementById('top').addEventListener('click', ev => {
  const b = ev.target.closest('[data-ui]');
  if (!b) return;
  const u = b.dataset.ui;
  if (u === 'craft' || u === 'ency' || u === 'help' || u === 'map') openModal(u);
  else if (u === 'reset') openModal('world');
});

let last = performance.now(), acc = 0, uiT = 0;
function frame(now) {
  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;
  const sp = 18 / cam.z * dt * 60;
  if (keys.w || keys.arrowup) cam.y -= sp * 0.5;
  if (keys.s || keys.arrowdown) cam.y += sp * 0.5;
  if (keys.a || keys.arrowleft) cam.x -= sp * 0.5;
  if (keys.d || keys.arrowright) cam.x += sp * 0.5;
  cam.x = Math.max(0, Math.min(W, cam.x)); cam.y = Math.max(0, Math.min(H, cam.y));
  acc += dt;
  let n = 0;
  while (acc >= DT && n < 10) { tick(); acc -= DT; n++; }
  if (n >= 10) acc = 0;
  render();
  uiT += dt;
  if (uiT > 0.2) {
    uiT = 0;
    $('#power').innerHTML = powerHtml();
    $('#vent').innerHTML = ventHtml();
    renderPanelDyn();
    if (modalKind === 'craft') renderModal();
  }
  requestAnimationFrame(frame);
}

new ResizeObserver(resize).observe(cv);
window.addEventListener('beforeunload', save);
setInterval(save, 10000);

if (!load()) newGame();
resize();
renderHotbar();
if (!S.help) { S.help = true; openModal('help'); }
requestAnimationFrame(frame);

window.game = {
  get S() { return S; }, get W() { return W; }, get ents() { return ents; }, get patches() { return patches; }, get cam() { return cam; },
  place: (t, x, y, d) => place(t, x, y, d, true), at, buildOk, setRecipe, removeEnt, save, load, newGame,
  step(n) { for (let i = 0; i < n; i++) tick(); render(); $('#power').innerHTML = powerHtml(); $('#vent').innerHTML = ventHtml(); renderPanelDyn(); renderHotbar(); },
  terrain: () => terrain, ore: (x, y) => ({ t: oreType[y * W + x], a: oreAmt[y * W + x] }),
  select(e) { openPanel(e); }, openModal, closeModal, refresh: renderHotbar,
  setCam(x, y, z) { cam.x = x; cam.y = y; if (z) cam.z = z; },
  setOverlay(v) { overlay = v; }, elev: () => elev, drawPreview, startWorld, get wcfg() { return wcfg; },
};
})();
