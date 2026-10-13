'use strict';
(() => {
const DT = 1 / 30, TP = 16;
let W = 160, H = 160, PW = 20;
const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
const KEY = 'chemfactory-save-v1';
const GAP = 0.25, BELT_V = 2 * DT, MINER_T = 2, PUMP_RATE = 60 * DT;
const PARTS = ['casting', 'plate', 'wire', 'motor', 'brick', 'lead_sheet', 'brass', 'cartridge', 'cylinder', 'wheel', 'chassis', 'diesel_engine', 'gearbox', 'windscreen', 'rail_bar', 'sleeper', 'traction_motor', 'bogie', 'hull_section', 'propeller', 'zinc_anode', 'sci1', 'sci2', 'sci3', 'sci4', 'sci5', 'sci_ag', 'sci_bio', 'sci_en', 'sci_met', 'sci_mil'];
const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
let tctx = null;
const CK = 16, RG = 128, tch = new Map(), ovc = document.createElement('canvas'), ovx = ovc.getContext('2d');
let rgd = null;
const pcv = document.createElement('canvas');
const pctx = pcv.getContext('2d');
let pimg = null;
const $ = s => document.querySelector(s);
const panel = $('#panel'), tip = $('#tip'), modal = $('#modal'), hotbar = $('#hotbar');

let S, terrain, oreType, oreAmt, elev, occ, ents, patches, L = null;
let cam = { x: W / 2, y: H / 2, z: 32 };
let tool = null, toolDir = 1, sel = null, mining = null, drag = null, altMode = false, clip = null;
let camFree = false, noAmmoT = 0, noFuelT = 0, selCar = null, selTrain = null, puffs = [], wakes = [];
const VEH = {
  car: { vmax: 22, acc: 9, turn: 2.6, hl: 0.95, hw: 0.48, hp: 450, burn: 2.4, slots: 20, c: ['#6a1814', '#c8382e', '#4a100c'] },
  truck: { vmax: 16, acc: 5, turn: 1.9, hl: 1.35, hw: 0.6, hp: 1350, burn: 3.6, slots: 60, c: ['#8a6010', '#e0a828', '#5a4008'] },
  etruck: { el: 1, cap: 900, vmax: 18, acc: 7.5, turn: 1.9, hl: 1.35, hw: 0.6, hp: 1350, burn: 1.3, slots: 60, c: ['#1e4a6a', '#3a8ac8', '#14324a'] },
  launch: { sea: true, vmax: 18, acc: 6, turn: 1.6, hl: 1.0, hw: 0.45, hp: 600, burn: 2.6, slots: 30, c: ['#d8d4c8', '#f0ece0', '#a8a49a'] },
  skiff: { sea: true, oar: true, vmax: 5.5, acc: 2.4, turn: 1.5, hl: 0.72, hw: 0.32, hp: 220, burn: 0, slots: 12, c: ['#6a4a2c', '#9a7048', '#4a3220'] },
  trawler: { sea: true, net: true, vmax: 12, acc: 3.5, turn: 1.2, hl: 1.25, hw: 0.52, hp: 1100, burn: 3.2, slots: 60, c: ['#1e3a5a', '#2c5a8a', '#14283e'] },
  barge: { sea: true, vmax: 10, acc: 2.6, turn: 0.9, hl: 1.8, hw: 0.75, hp: 1800, burn: 4, slots: 100, c: ['#3a4a5a', '#5a6a7a', '#2a3440'] },
};
const CAN_MJ = 720, FUEL_CAP = 5;
const TRAIN = { loco: { m: 1.5, loco: 1 }, eloco: { m: 1.8, loco: 1 }, wagon: { m: 0.5, slots: 40 } }, isLoco = c => !!TRAIN[c.type].loco, T_EV = 40, T_EBAT = 180000, T_EKW = 900, T_CL = 2, T_VMAX = 28, T_BRAKE = 5, T_FUEL = 10, T_BURN = 8;
const VSPD = { 0: 0.6, 2: 0.55, 3: 0.45, 5: 0.3, 6: 0.35, 7: 0.5 };
const PL_V = 6, PL_R = 0.28, REACH = 10, MINE_REACH = 3.5, PL_HP = 250, PL_GUN = 15;
const mouse = { x: 0, y: 0, tx: -1, ty: -1, fx: 0, fy: 0, l: false, r: false, m: false, in: false };
const keys = {};
let modalTab = null, modalKind = null, overlay = 0;

const nm = k => (ITEMS[k] || FLUIDS[k] || BUILD[k] || { n: k }).n;
const col = k => (ITEMS[k] || FLUIDS[k] || BUILD[k] || { c: '#888' }).c;
const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'k' : String(Math.floor(n));
const chip = (k, n, cls) => `<span class="chip ${cls || ''}" data-ck="${k}"><i style="background:${col(k)}"></i>${n != null ? '<b>' + n + '</b> ' : ''}${nm(k)}</span>`;
const sum = o => { let s = 0; for (const k in o) s += o[k]; return s; };
const isGas = f => FLUIDS[f] && FLUIDS[f].gas && f !== 'steam';
const spills = (r, f) => isGas(f) || !!(r.bleed && r.bleed.includes(f));
const PC = 8, RAIN = 30;
const POL_W = { acetylene: 0.5, vgo: 0.8, base_oil: 0.8, rinse: 1.0, tmg: 1.0, pickle_liq: 0.6, cs2: 1.2, lactic: 0.2, cyclohexanone: 0.4, has_liq: 0.4, pot_ale: 0.5, must: 0.2, wine: 0.2, wash: 0.2, aq_work: 0.6, ahq: 0.6, h2o2: 0.3, po: 1.5, pg: 0.2, na2wo4: 0.3, biogas: 0.8, methane: 1, ni_leach: 0.6, niso4: 0.8, acn: 1.2, acrylamide: 1.0, mma: 0.4, fatty_alc: 0.2, oxylene: 0.5, two_eh: 0.4, nitrobenzene: 1.2, aniline: 1.2, mcaa: 1.0, turpentine: 0.6, linalool: 0.3, ethyl_acetate: 0.6, veg_oil: 0.3, glycerol: 0.1, sicl4: 0.8, ibb: 0.3, ethanol: 0.1, recl3: 0.3, ndcl3: 0.3, fecl3: 0.4, etch: 0.6, uo2so4: 0.5, f2: 3, uf6: 3, leu: 3, xylene: 0.5, eo: 1.5, meg: 0.2, chcl3: 0.6, r22: 0.8, tfe: 0.4, so2: 1, cl2: 3, co2: 0.02, h2: 0, steam: 0, water: 0, acid: 0.5, naoh: 0.3, liquor: 0.3, ticl4: 1, brine: 0.05, nh3: 0.5, hno3: 0.8, tar: 0.4, coalgas: 0.3, toluene: 0.3, nh4cl: 0.1, co: 0.1, phosgene: 1, sif4: 2, h2sif6: 0.5, hf: 1, h2s: 2, diesel: 0.3, bfw: 0, o2: 0, n2: 0, sihcl3: 1, vam: 0.4, dmc: 0.2, dpc: 0.4, ech: 1, propylene: 0.2, cumene: 0.4, phenol: 1, acetone: 0.3, acetic: 0.4, ac2o: 0.6, cyclohexane: 0.3, ka_oil: 0.3, n2o: 4, hmda: 0.5, olefins: 0.2, lab: 0.3, las: 0.8, methanol: 0.3, hcho: 1, ch3cl: 0.5, dmdcs: 1, bittern: 0.05, br2: 2, butadiene: 0.3, benzene: 0.5, styrene: 0.3 };
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

function patch(t, px, py, r, rich, seed, force, clip) {
  let n0 = 0;
  for (let y = Math.floor(py - r * 1.4); y <= py + r * 1.4; y++) for (let x = Math.floor(px - r * 1.4); x <= px + r * 1.4; x++) {
    if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue;
    if (clip && (x < clip[0] || y < clip[1] || x >= clip[2] || y >= clip[3])) continue;
    const d = Math.hypot(x - px, y - py), n = vnoise(x / 2.5, y / 2.5, seed + t * 131);
    if (d > r * (0.65 + 0.6 * n)) continue;
    const i = y * W + x;
    if (terrain[i] === 1 || terrain[i] === 4) { if (!force) continue; terrain[i] = 0; }
    oreType[i] = t;
    oreAmt[i] = Math.max(60, Math.round(rich * (1.15 - d / (r * 1.5)) * (0.7 + 0.6 * n)) + 60);
    n0++;
  }
  if (n0 && (!clip || (px >= clip[0] && py >= clip[1] && px < clip[2] && py < clip[3]))) patches.push({ t, x: Math.round(px), y: Math.round(py) });
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

const GEN_DEF = { size: 256, water: 1, ore: 1, hives: 2, inf: 0 };
const TER_N = ['Grassland', 'Water', 'Dry scrub', 'Desert sand', 'Bare rock', 'Marsh', 'Forest', 'Tundra'];
const sstep = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const GW = { forest: [0.75, 0.64, 0.55, 0.47], rock: [0.76, 0.72, 0.68, 0.64], crag: [1, 1, 0.64, 0.57], clim: [-0.14, 0, 0.14], rain: [-0.12, 0, 0.1] };
function biome(e, t, m, sea, g, x, y, seed, cx, cy) {
  if (e < sea) return 1;
  const rk = g.rock ?? 1, cr = GW.crag[rk];
  if (e > GW.rock[rk] || (cr < 1 && e > sea + 0.05 && sstep(16, 44, Math.hypot(x - cx, y - cy)) > 0.95 && fbm(x / 22, y / 22, seed + 44) > cr)) return 4;
  return t < 0.24 ? 7 : t > 0.64 && m < 0.48 ? 3 : m > 0.6 && e < sea + 0.07 ? 5 : m > GW.forest[g.forest ?? 2] ? 6 : m < 0.4 ? 2 : 0;
}
const dgnMul = g => [0, 0.5, 1, 1.8][g && g.dgn != null ? g.dgn : 2];
const ORE_BASE = [0, 11, 10, 7, 9, 6, 6, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3];
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
    case 14: return m > 0.6 ? 2.5 : b === 7 ? 1 : 0.3;
    case 15: return tp > 0.6 && ms > 0.45 ? 3 : tp > 0.5 ? 0.6 : 0.1;
    case 16: return b === 7 ? 2.5 : m > 0.55 ? 1.5 : 0.3;
    case 17: return m > 0.55 && (b === 7 || b === 2) ? 3 : b === 3 ? 1 : 0.2;
    case 18: return b === 5 ? 3 : b === 0 && ms > 0.55 ? 2 : b === 6 ? 0.8 : 0.2;
    case 19: return b === 2 && m < 0.5 ? 3 : b === 3 ? 1.2 : 0.05;
    case 20: return (b === 0 || b === 6) && m > 0.45 && ms > 0.45 ? 3 : b === 0 ? 1 : 0.2;
    case 21: return m > 0.6 ? 3 : b === 7 ? 1 : b === 2 ? 0.6 : 0.1;
    case 22: return m > 0.62 ? 2.5 : b === 3 ? 1.2 : m > 0.52 ? 0.8 : 0.1;
    case 23: return b === 2 && m > 0.5 ? 2.5 : b === 2 ? 0.8 : m > 0.65 ? 0.6 : 0.05;
    case 24: return tp > 0.55 && ms > 0.5 && (b === 6 || b === 0) ? 3 : tp > 0.5 && b === 6 ? 1 : 0.08;
    case 25: return (b === 2 || b === 0) && m > 0.48 ? 2.5 : b === 2 ? 1.2 : b === 3 ? 0.6 : 0.15;
    case 26: return b === 2 || b === 3 ? 2.5 : b === 0 ? 0.8 : 0.2;
    case 27: return b === 4 ? 2.5 : b === 6 || b === 7 ? 0.9 : 0.2;
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
    temp[i] = 0.5 + GW.clim[g.clim ?? 1] * k + ((0.18 + 0.64 * lat + (fbm(x / 60, y / 60, seed + 21) - 0.5) * 0.5 - Math.max(0, e - 0.6) * 0.7) - 0.5) * (0.35 + 0.65 * k);
    moist[i] = 0.5 + GW.rain[g.rain ?? 1] * k + (fbm(x / 38, y / 38, seed + 33) - 0.5) * 1.5 * (0.4 + 0.6 * k);
  }
  for (let i = 0; i < N; i++) {
    const e = elev[i], t = temp[i], m = moist[i];
    terrain[i] = biome(e, t, m, sea, g, i % W, (i / W) | 0, seed, cx, cy);
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
  seaOil(seed, sea, 0, 0, W, H, null);
}
function seaPatch(px, py, r, rich, seed, clip, sea) {
  const t = ORES.findIndex(o => o && o.fluid);
  let n0 = 0;
  for (let y = Math.floor(py - r * 1.4); y <= py + r * 1.4; y++) for (let x = Math.floor(px - r * 1.4); x <= px + r * 1.4; x++) {
    if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue;
    if (clip && (x < clip[0] || y < clip[1] || x >= clip[2] || y >= clip[3])) continue;
    const d = Math.hypot(x - px, y - py), n = vnoise(x / 2.5, y / 2.5, seed + t * 137), i = y * W + x;
    if (d > r * (0.65 + 0.6 * n) || terrain[i] !== 1 || sea - elev[i] < 0.07) continue;
    oreType[i] = t;
    oreAmt[i] = Math.max(200, Math.round(rich * (1.15 - d / (r * 1.5)) * (0.7 + 0.6 * n)) + 200);
    n0++;
  }
  if (n0 && (!clip || (px >= clip[0] && py >= clip[1] && px < clip[2] && py < clip[3]))) patches.push({ t, x: Math.round(px), y: Math.round(py), sea: 1 });
  return n0;
}
function seaOil(seed, sea, X0, Y0, w, h, clip) {
  const r = mulberry32(((seed ^ 0x5eaf00d) + Math.imul(X0 + 11, 7919) + Math.imul(Y0 + 5, 104729)) >>> 0), nf = w * h / 65536 * 1.6;
  let k = Math.floor(nf) + (r() < nf % 1 ? 1 : 0);
  for (let q = 0; q < 300 && k > 0; q++) {
    const x = X0 + 8 + r() * (w - 16), y = Y0 + 8 + r() * (h - 16), i = Math.floor(y) * W + Math.floor(x);
    if (terrain[i] !== 1 || sea - elev[i] < 0.09 || Math.hypot(x - W / 2, y - H / 2) < 40) continue;
    if (seaPatch(x, y, 3 + r() * 2.5, 2500 + r() * 2500, seed, clip, sea) >= 6) k--;
  }
}
function setSize(w) {
  W = H = w; PW = W / PC;
  ovc.width = W; ovc.height = H; tch.clear();
  pcv.width = pcv.height = PW;
  pimg = pctx.createImageData(PW, PW);
}
function genMap(seed, g) {
  setSize(g && !g.legacy ? g.size : 160);
  rgd = null;
  if (isEndless(g)) { terrain = new Uint8Array(W * H).fill(4); oreType = new Uint8Array(W * H); oreAmt = new Int32Array(W * H); elev = new Float32Array(W * H).fill(0.8); patches = []; rgd = new Uint8Array((W / RG) * (H / RG)); }
  else if (g && !g.legacy) genWorld(seed, g); else genLegacy(seed);
}
const isEndless = g => !!(g && !g.legacy && g.size >= 1024);
function rgDone(x, y) { return !rgd || rgd[Math.floor(y / RG) * (W / RG) + Math.floor(x / RG)] === 1; }
function contAt(x, y, seed, g, d) {
  const wx = x + (fbm(x / 230, y / 230, seed + 81) - 0.5) * 260, wy = y + (fbm(x / 230, y / 230, seed + 83) - 0.5) * 260;
  const c = Math.max(fbm(wx / 400, wy / 400, seed + 71), 0.62 * (1 - sstep(100, 240, d)));
  return Math.max(-0.45, Math.min(0.1, (c - 0.54 - 0.025 * g.water) * 3.2));
}
function genRegion(seed, g, rx, ry) {
  const M = 3, X0 = rx * RG, Y0 = ry * RG, w = RG + 2 * M, N = w * w, cx = W / 2, cy = H / 2;
  const rng = mulberry32((seed + Math.imul(rx + 7, 73856093) + Math.imul(ry + 3, 19349663)) >>> 0);
  const E = new Float32Array(N), Tm = new Float32Array(N), Mo = new Float32Array(N), Lo = new Float32Array(N), Tr = new Uint8Array(N);
  const sea = 0.36 + 0.05 * (g.water - 1);
  for (let j = 0; j < w; j++) for (let i = 0; i < w; i++) {
    const x = X0 - M + i, y = Y0 - M + j, l = j * w + i, d = Math.hypot(x - cx, y - cy), k = sstep(16, 44, d);
    const cs = contAt(x, y, seed, g, d), lo = fbm(x / 46, y / 46, seed) + (fbm(x / 170, y / 170, seed + 13) - 0.5) * 0.3 + cs, edge = Math.max(Math.abs(x - cx), Math.abs(y - cy)) / (W / 2), fall = Math.max(0, edge - 0.94) * 8;
    let e = lo * 0.72 + fbm(x / 13, y / 13, seed + 5) * 0.28;
    const ridge = 1 - Math.abs(2 * fbm(x / 30, y / 30, seed + 9) - 1);
    e += Math.max(0, ridge - 0.86) * 2.6 * sstep(0.44, 0.56, e);
    e -= fall;
    e = 0.52 + (e - 0.52) * k;
    Lo[l] = 0.52 + (lo - fall - 0.52) * k;
    E[l] = e;
    const lat = 0.5 + 0.5 * Math.sin((y - cy) / 170);
    const t = Tm[l] = 0.5 + GW.clim[g.clim ?? 1] * k + ((0.18 + 0.64 * lat + (fbm(x / 60, y / 60, seed + 21) - 0.5) * 0.5 - Math.max(0, e - 0.6) * 0.7) - 0.5) * (0.35 + 0.65 * k);
    const m = Mo[l] = 0.5 + GW.rain[g.rain ?? 1] * k + (fbm(x / 38, y / 38, seed + 33) - 0.5) * 1.5 * (0.4 + 0.6 * k);
    Tr[l] = biome(e, t, m, sea, g, x, y, seed, cx, cy);
  }
  const inner = (i, j) => i > M && j > M && i < M + RG - 1 && j < M + RG - 1;
  const seen = new Uint8Array(N), nr = Math.round((1.2 + rng() * 2.4) * (0.4 + 0.6 * g.water));
  for (let r = 0; r < nr; r++) {
    let i = 0, j = 0, ok = false;
    for (let q = 0; q < 120 && !ok; q++) {
      i = M + 6 + Math.floor(rng() * (RG - 12)); j = M + 6 + Math.floor(rng() * (RG - 12));
      const l = j * w + i;
      ok = Lo[l] > 0.56 && E[l] < 0.72 && Math.hypot(X0 - M + i - cx, Y0 - M + j - cy) > 30 && !seen[l];
    }
    if (!ok) continue;
    const path = [];
    for (let s = 0; s < 500; s++) {
      const l = j * w + i, gx = X0 - M + i, gy = Y0 - M + j;
      if (Tr[l] === 1 && path.length) break;
      if (Math.hypot(gx - cx, gy - cy) < 15 || seen[l]) break;
      seen[l] = 1; path.push(l);
      let bi = -1, bj = -1, be = Lo[l] + 0.003;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const I = i + dx, J = j + dy;
        const v = Lo[J * w + I] + (hash(gx + dx, gy + dy, seed + r + rx * 31 + ry * 57) - 0.5) * 0.006 + (dx && dy ? 0.001 : 0);
        if (v < be && !seen[J * w + I]) { be = v; bi = I; bj = J; }
      }
      if (bi < 0 || !inner(bi, bj)) {
        if (path.length > 12) for (let b = -3; b <= 3; b++) for (let a = -3; a <= 3; a++) if (a * a + b * b <= 7 + hash(gx + a, gy + b, seed) * 4) { const I = i + a, J = j + b; if (inner(I, J) && Math.hypot(X0 - M + I - cx, Y0 - M + J - cy) > 15) { Tr[J * w + I] = 1; E[J * w + I] = sea - 0.01; } }
        break;
      }
      i = bi; j = bj;
    }
    if (path.length < 10) continue;
    path.forEach((l, s) => {
      const wd = s > path.length * 0.45 ? 1 : 0, pi = l % w, pj = (l - pi) / w;
      for (let b = 0; b <= wd; b++) for (let a = 0; a <= wd; a++) { if (!inner(pi + a, pj + b) && (a || b)) continue; const k = (pj + b) * w + pi + a; Tr[k] = 1; E[k] = Math.min(E[k], sea - 0.01); }
    });
  }
  const shore = [];
  for (let j = M; j < M + RG; j++) for (let i = M; i < M + RG; i++) {
    const l = j * w + i, b = Tr[l];
    if (b === 1 || b === 4 || b === 7) continue;
    let wt = 0;
    for (let q = -2; q <= 2 && !wt; q++) for (let p = -2; p <= 2; p++) { const k = l + q * w + p; if (Tr[k] === 1 && E[k] < sea - 0.02) { wt = 1; break; } }
    if (wt && E[l] < sea + 0.03) shore.push(l);
  }
  for (const l of shore) Tr[l] = 3;
  for (let j = M; j < M + RG; j++) for (let i = M; i < M + RG; i++) {
    const l = j * w + i, gi = (Y0 + j - M) * W + X0 + i - M;
    terrain[gi] = Tr[l]; elev[gi] = E[l]; oreType[gi] = 0; oreAmt[gi] = 0;
  }
  const clip = [X0, Y0, X0 + RG, Y0 + RG];
  if (X0 < cx + 48 && X0 + RG > cx - 48 && Y0 < cy + 48 && Y0 + RG > cy - 48) {
    const r0 = mulberry32(seed + 99), base = r0() * Math.PI * 2, slot = Math.PI * 2 / 7;
    const lx = cx + Math.cos(base) * 11, ly = cy + Math.sin(base) * 11;
    for (let y = Math.floor(ly - 5); y <= ly + 5; y++) for (let x = Math.floor(lx - 5); x <= lx + 5; x++) {
      if (x < X0 || y < Y0 || x >= X0 + RG || y >= Y0 + RG) continue;
      const dx = (x - lx) / 4.2, dy = (y - ly) / 3.4;
      if (dx * dx + dy * dy <= 1 + (hash(x, y, seed) - 0.5) * 0.4) { terrain[y * W + x] = 1; elev[y * W + x] = sea - 0.03; }
    }
    [[4, 11, 4, 900], [1, 15, 5, 1500], [5, 15, 4, 1000], [2, 18, 5, 1300], [6, 20, 4, 1000], [3, 26, 5, 1200]].forEach(([t, dist, r, rich], k) => {
      const a = base + (k + 1) * slot + (r0() - 0.5) * 0.3;
      patch(t, cx + Math.cos(a) * dist, cy + Math.sin(a) * dist, r, rich, seed, true, clip);
    });
  }
  const oc = [0.75, 1, 1.25][g.ore] * 0.4 * (g.inf ? 0.7 : 1), or = [0.6, 1, 1.6][g.ore], A = RG * RG / 25600;
  for (let t = 1; t < ORES.length; t++) {
    const nf = (ORE_BASE[t] || 3) * A * oc, n = Math.floor(nf) + (rng() < nf % 1 ? 1 : 0), dmin = t < 7 ? 30 : 36;
    for (let k = 0; k < n; k++) for (let q = 0; q < 60; q++) {
      const x = X0 + 10 + rng() * (RG - 20), y = Y0 + 10 + rng() * (RG - 20), d = Math.hypot(x - cx, y - cy);
      if (d < dmin) continue;
      const gi = Math.floor(y) * W + Math.floor(x), li = (Math.floor(y) - Y0 + M) * w + Math.floor(x) - X0 + M, tt = { [gi]: Tm[li] }, mm = { [gi]: Mo[li] };
      if (rng() * 4 >= oreSuit(t, gi, tt, mm)) continue;
      patch(t, x, y, 3 + rng() * (t < 7 ? 4 : 3), (1200 + rng() * 2000) * (0.8 + Math.min(d, 640) / 80) * or, seed, false, clip);
      break;
    }
  }
  seaOil(seed, sea, X0, Y0, RG, RG, clip);
}
function growRegion(rx, ry, spawn) {
  const nR = W / RG, r = ry * nR + rx;
  if (!rgd || rx < 0 || ry < 0 || rx >= nR || ry >= nR || rgd[r]) return;
  rgd[r] = 1;
  genRegion(S.seed, S.gen, rx, ry);
  const X0 = rx * RG, Y0 = ry * RG;
  for (const k in S.dep) { const i = +k, x = i % W, y = (i - x) / W; if (x >= X0 && y >= Y0 && x < X0 + RG && y < Y0 + RG) { oreAmt[i] = S.dep[k]; if (oreAmt[i] <= 0) { oreAmt[i] = 0; oreType[i] = 0; } } }
  paintOv(X0, Y0, RG, RG);
  for (const k of [...tch.keys()]) { const cx = k % 4096, cy = (k - cx) / 4096; if ((cx + 1) * CK >= X0 - 1 && cx * CK <= X0 + RG && (cy + 1) * CK >= Y0 - 1 && cy * CK <= Y0 + RG) tch.delete(k); }
  if (spawn) spawnRegion(rx, ry);
}
function spawnRegion(rx, ry) {
  const g = S.gen, rng = mulberry32((S.seed + 777 + Math.imul(rx, 977) + Math.imul(ry, 31337)) >>> 0), X0 = rx * RG, Y0 = ry * RG, cx = W / 2, cy = H / 2;
  const pick = m => [Math.floor(X0 + m + rng() * (RG - 2 * m)), Math.floor(Y0 + m + rng() * (RG - 2 * m))];
  const dc = Math.hypot(X0 + RG / 2 - cx, Y0 + RG / 2 - cy);
  if (rng() < 0.65) for (let k = 0; k < 80; k++) {
    const [x, y] = pick(6);
    if (Math.hypot(x - cx, y - cy) < 58 || !ruinSpot(x, y) || !farFromBase(x, y, 20) || lists().ruin.some(o => Math.hypot(o.x - x, o.y - y) < 30)) continue;
    addEnt(makeEnt('ruin', x, y, 0));
    let n = 0;
    for (let q = 0; q < 60 && n < (g.hives ? 3 : 0); q++) {
      const b = rng() * Math.PI * 2, rr = 5 + rng() * 3, hx = Math.round(x + Math.cos(b) * rr), hy = Math.round(y + Math.sin(b) * rr);
      if (!hiveSpot(hx, hy)) continue;
      addHive(hx, hy); n++;
    }
    break;
  }
  const nh = Math.round(10 * RG * RG / 25600 * [0, 0.5, 1, 1.6][g.hives] * Math.min(2, 0.6 + dc / 600));
  for (let k = 0, n = 0; k < 60 * Math.max(1, nh) && n < nh; k++) {
    const [x, y] = pick(3);
    if (Math.hypot(x - cx, y - cy) < 48 || !hiveSpot(x, y) || !farFromBase(x, y, 14) || lists().hive.some(e => Math.hypot(e.x - x, e.y - y) < 18)) continue;
    addHive(x, y); n++;
  }
  burrowRegion(rx, ry);
  mineRegion(rx, ry);
  xdgRegion(rx, ry);
}
function growNear(x, y, rad, max) {
  if (!rgd) return 0;
  const nR = W / RG, out = [];
  for (let ry = Math.max(0, Math.floor((y - rad) / RG)); ry <= Math.min(nR - 1, Math.floor((y + rad) / RG)); ry++) for (let rx = Math.max(0, Math.floor((x - rad) / RG)); rx <= Math.min(nR - 1, Math.floor((x + rad) / RG)); rx++) {
    if (rgd[ry * nR + rx]) continue;
    const X0 = rx * RG, Y0 = ry * RG, dx = Math.max(X0 - x, 0, x - X0 - RG), dy = Math.max(Y0 - y, 0, y - Y0 - RG);
    if (Math.hypot(dx, dy) <= rad) out.push([Math.hypot(dx, dy), rx, ry]);
  }
  out.sort((a, b) => a[0] - b[0]);
  let n = 0;
  for (const [, rx, ry] of out) { if (n >= max) break; growRegion(rx, ry, true); n++; }
  return n;
}
function ovCol(i) {
  const t = terrain[i];
  if (oreType[i] && ORGB) return ORGB[oreType[i]][0];
  if (t === 1) return wcol(elev ? seaLv() - elev[i] : 0.05);
  return PRGB[t][0];
}
function paintOv(x0, y0, w, h) {
  if (!ORGB) prepCorners();
  const im = ovx.createImageData(w, h), d = im.data;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const c = ovCol((y0 + j) * W + x0 + i), o = (j * w + i) * 4;
    d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
  }
  ovx.putImageData(im, x0, y0);
}
function ovPix(x, y) { if (!rgDone(x, y)) return; const c = ovCol(y * W + x); ovx.fillStyle = `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`; ovx.fillRect(x, y, 1, 1); }
function bakeChunk(cx, cy) {
  const c = document.createElement('canvas'), n = CK * TP;
  c.width = c.height = n;
  const x2 = c.getContext('2d'), img = x2.createImageData(n, n);
  prepCorners();
  for (let y = 0; y < CK; y++) for (let x = 0; x < CK; x++) if (cx * CK + x < W && cy * CK + y < H) tileBase(cx * CK + x, cy * CK + y, img.data, n, x * TP, y * TP);
  x2.putImageData(img, 0, 0);
  x2.setTransform(1, 0, 0, 1, -cx * n, -cy * n);
  tctx = x2;
  for (let y = 0; y < CK; y++) for (let x = 0; x < CK; x++) if (cx * CK + x < W && cy * CK + y < H) tileDeco(cx * CK + x, cy * CK + y);
  x2.setTransform(1, 0, 0, 1, 0, 0);
  return c;
}
function chunkCv(cx, cy, make) {
  const k = cy * 4096 + cx;
  let c = tch.get(k);
  if (c) { tch.delete(k); tch.set(k, c); return c; }
  if (!make) return null;
  c = bakeChunk(cx, cy);
  tch.set(k, c);
  if (tch.size > 360) tch.delete(tch.keys().next().value);
  return c;
}
function chunkMip(c, n) {
  const k = 'm' + n;
  if (c[k]) return c[k];
  const m = document.createElement('canvas');
  m.width = m.height = n;
  const x = m.getContext('2d');
  x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'medium';
  x.drawImage(n === 64 ? chunkMip(c, 128) : c, 0, 0, n, n);
  return c[k] = m;
}
function mapWin() {
  if (!rgd) return { x0: 0, y0: 0, sz: W };
  const sz = 512, c = v => Math.max(0, Math.min(W - sz, Math.round(v - sz / 2)));
  return { x0: c(cam.x), y0: c(cam.y), sz };
}

const PAL = [['#3d5a2e', '#41602f', '#3a562b'], ['#1d4a73', '#20507b', '#1b466d'], ['#5a5135', '#5e5538', '#565033'], ['#b39f68', '#b8a46c', '#ad9962'], ['#5d5a54', '#635f59', '#57544e'], ['#34472f', '#31432b', '#394c33'], ['#2b4824', '#2e4d26', '#284421'], ['#c3ccd0', '#c9d1d5', '#bdc6ca']];
const PRGB = PAL.map(r => r.map(h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]));
const SAND = [184, 166, 112], FOAM = [190, 222, 236];
let tpx = null, ORGB = null;
function hexRgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
function tcornAt(x, y) { return vnoise(x / 5, y / 5, 401) * 0.6 + vnoise(x / 1.7, y / 1.7, 402) * 0.4; }
const WRAMP = [[0, [74, 148, 162]], [0.02, [46, 110, 148]], [0.07, [29, 80, 124]], [0.16, [18, 52, 90]], [0.3, [10, 29, 58]]];
function wcol(d) {
  if (d <= 0) return WRAMP[0][1];
  for (let k = 1; k < WRAMP.length; k++) if (d < WRAMP[k][0]) { const [d0, c0] = WRAMP[k - 1], [d1, c1] = WRAMP[k], t = (d - d0) / (d1 - d0); return [c0[0] + (c1[0] - c0[0]) * t, c0[1] + (c1[1] - c0[1]) * t, c0[2] + (c1[2] - c0[2]) * t]; }
  return WRAMP[WRAMP.length - 1][1];
}
const seaLv = () => 0.36 + 0.05 * (((S.gen && S.gen.water) ?? 1) - 1);
function wdep(x, y, sl) {
  if (x < 0 || y < 0 || x >= W || y >= H) return 0.02;
  const i = y * W + x;
  return terrain[i] === 1 ? (elev ? sl - elev[i] : 0.05) : -0.015;
}
const cdep = (x, y, sl) => (wdep(x - 1, y - 1, sl) + wdep(x, y - 1, sl) + wdep(x - 1, y, sl) + wdep(x, y, sl)) / 4;
let CE_D = 0, CE_ID = 0, TR = 0, TG = 0, TB = 0;
function cellE(gx, gy, sz, s) {
  const cx = Math.floor(gx / sz), cy = Math.floor(gy / sz);
  let d1 = 1e9, d2 = 1e9;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const X = cx + i, Y = cy + j, px = (X + 0.15 + hash(X, Y, s) * 0.7) * sz, py = (Y + 0.15 + hash(X, Y, s + 1) * 0.7) * sz, d = (gx + 0.5 - px) ** 2 + (gy + 0.5 - py) ** 2;
    if (d < d1) { d2 = d1; d1 = d; CE_ID = hash(X, Y, s + 2); } else if (d < d2) d2 = d;
  }
  CE_D = Math.sqrt(d2) - Math.sqrt(d1);
}
function bioCol(t, gx, gy) {
  const c = PRGB[t][0], h = hash(gx, gy, 5);
  let f = 1, r = c[0], g = c[1], b = c[2];
  if (t === 0) {
    f += (hash(gx, gy >> 1, 6) - 0.5) * 0.16 + (vnoise(gx / 5, gy / 5, 7) - 0.5) * 0.14;
    const y = vnoise(gx / 48, gy / 48, 8) - 0.5; r += y * 26; g += y * 8;
  } else if (t === 2) {
    cellE(gx, gy, 7, 11); f += (CE_ID - 0.5) * 0.1 + (h - 0.5) * 0.08; if (CE_D < 0.8) f *= 0.8;
    if (hash(gx >> 1, gy >> 1, 12) < 0.035) { r = 100; g = 96; b = 62; }
  } else if (t === 3) {
    f += Math.sin(gx * 0.42 + gy * 0.16 + vnoise(gx / 14, gy / 14, 13) * 8) * 0.045 + (h - 0.5) * 0.08;
  } else if (t === 4) {
    cellE(gx, gy, 8, 15); f += (CE_ID - 0.5) * 0.16 + (h - 0.5) * 0.06; if (CE_D < 1) f *= 0.7; else if (CE_D < 2) f *= 1.06;
  } else if (t === 5) {
    const p = vnoise(gx / 7, gy / 7, 17);
    if (p > 0.68) { const k = Math.min(1, (p - 0.68) * 10); r += (40 - r) * k; g += (66 - g) * k; b += (70 - b) * k; f += (h - 0.5) * 0.04; }
    else f += (hash(gx, gy >> 1, 18) - 0.5) * 0.18;
  } else if (t === 6) {
    f += (vnoise(gx / 4, gy / 4, 19) - 0.5) * 0.24 + (h - 0.5) * 0.1;
    if (h < 0.05) { r = 72; g = 60; b = 36; }
  } else if (t === 7) {
    const s = vnoise(gx / 11, gy / 11, 21); r -= s * 22; g -= s * 13; b -= s * 3; f += (h - 0.5) * 0.04;
    if (h > 0.993) { r = g = b = 252; f = 1; }
  }
  TR = r * f; TG = g * f; TB = b * f;
}
const DIAG = [[1, -1, 1, 0], [1, 1, 1, 1], [-1, 1, 0, 1], [-1, -1, 0, 0]];
function tileBase(x, y, D, stride, bx, by) {
  const i = y * W + x, b = terrain[i], ot = oreType[i], sl = seaLv();
  const n00 = tcornAt(x, y), n10 = tcornAt(x + 1, y), n01 = tcornAt(x, y + 1), n11 = tcornAt(x + 1, y + 1);
  const T = (X, Y) => X < 0 || Y < 0 || X >= W || Y >= H ? b : terrain[Y * W + X];
  const nb = [0, 1, 2, 3].map(d => T(x + DX[d], y + DY[d]));
  const isW = b === 1, dg = DIAG.filter(([dx, dy]) => (T(x + dx, y + dy) === 1) !== isW && (T(x + dx, y) === 1) === isW && (T(x, y + dy) === 1) === isW);
  let d00 = 0, d10 = 0, d01 = 0, d11 = 0;
  if (isW) { d00 = cdep(x, y, sl); d10 = cdep(x + 1, y, sl); d01 = cdep(x, y + 1, sl); d11 = cdep(x + 1, y + 1, sl); }
  const rich = ot ? (oreAmt[i] < 150 ? 0.4 : 0.82) : 0, oc0 = ot && ORGB[ot];
  for (let py = 0; py < TP; py++) for (let px = 0; px < TP; px++) {
    const u = (px + 0.5) / TP, v = (py + 0.5) / TP, gx = x * TP + px, gy = y * TP + py;
    const f = 0.9 + ((n00 * (1 - u) + n10 * u) * (1 - v) + (n01 * (1 - u) + n11 * u) * v) * 0.2;
    let edge = 99;
    for (let d = 0; d < 4; d++) {
      if ((nb[d] === 1) === isW) continue;
      const dist = d === 0 ? py : d === 1 ? TP - 1 - px : d === 2 ? TP - 1 - py : px;
      if (dist < edge) edge = dist;
    }
    for (const q of dg) { const dd = Math.hypot(px + 0.5 - q[2] * TP, py + 0.5 - q[3] * TP) - 0.5; if (dd < edge) edge = dd; }
    let r, g, bl;
    if (isW) {
      const c = wcol((d00 * (1 - u) + d10 * u) * (1 - v) + (d01 * (1 - u) + d11 * u) * v);
      const k = f + Math.sin(gx * 0.55 + gy * 0.22 + vnoise(gx / 10, gy / 10, 25) * 9) * 0.03;
      r = c[0] * k; g = c[1] * k; bl = c[2] * k;
      if (edge < 3.5) { const m = Math.max(0, (1 - edge / 3.5) * (0.35 + 0.65 * vnoise(gx / 3, gy / 3, 26))) * 0.75; r += (FOAM[0] - r) * m; g += (FOAM[1] - g) * m; bl += (FOAM[2] - bl) * m; }
    } else {
      let t = b;
      for (let d = 0; d < 4; d++) {
        const o = nb[d];
        if (o === b || o === 1) continue;
        const dist = d === 0 ? py : d === 1 ? TP - 1 - px : d === 2 ? TP - 1 - py : px;
        if (dist < 6 && vnoise(gx / 3.2, gy / 3.2, 30 + o) < (1 - dist / 6) * 0.5) t = o;
      }
      bioCol(t, gx, gy);
      r = TR * f; g = TG * f; bl = TB * f;
      if (edge < 7 && b !== 4) {
        const bw = 2.5 + vnoise(gx / 4, gy / 4, 27) * 3.5;
        if (edge < bw) { const s = edge < 1 ? [112, 100, 70] : edge < 2.2 ? [148, 132, 90] : SAND, k = 0.95 + hash(gx, gy, 28) * 0.1; r = s[0] * k; g = s[1] * k; bl = s[2] * k; }
        else if (edge < bw + 1.2) { r = (r + SAND[0]) / 2; g = (g + SAND[1]) / 2; bl = (bl + SAND[2]) / 2; }
      } else if (edge < 2 && b === 4) { r *= 0.72; g *= 0.72; bl *= 0.74; }
    }
    if (ot && isW) {
      const s = vnoise(gx / 7, gy / 7, 61 + ot) * 0.7 + vnoise(gx / 3, gy / 3, 62) * 0.3;
      if (s > 0.48) { const a = Math.min(1, (s - 0.48) * 5) * 0.4, hh = (gx * 0.05 + gy * 0.035 + s * 8) * 6.283; r = r * (1 - a) + (120 + 80 * Math.sin(hh)) * a; g = g * (1 - a) + (110 + 80 * Math.sin(hh + 2.1)) * a; bl = bl * (1 - a) + (130 + 80 * Math.sin(hh + 4.2)) * a; }
      else if (s > 0.42) { r *= 0.86; g *= 0.86; bl *= 0.9; }
    } else if (ot) {
      r *= 0.9; g *= 0.9; bl *= 0.9;
      const cx = gx >> 2, cy = gy >> 2;
      let hit = 0;
      for (let j = -1; j <= 1 && hit < 2; j++) for (let ii = -1; ii <= 1; ii++) {
        const X = cx + ii, Y = cy + j;
        if ((X >> 2) !== x || (Y >> 2) !== y || hash(X, Y, ot * 7 + 3) > rich) continue;
        const sx = X * 4 + 1.4 + hash(X, Y, 91) * 1.2, sy = Y * 4 + 1.4 + hash(X, Y, 92) * 1.2, rr = 1.25 + hash(X, Y, 93) * 0.65;
        const dx = gx + 0.5 - sx, dy = gy + 0.5 - sy, q = (dx * dx + dy * dy) / (rr * rr);
        if (q < 1) {
          const oc = hash(X, Y, 95) < 0.2 ? oc0[1] : oc0[0], sh = Math.max(0.7, Math.min(1.25, 1.05 - 0.3 * (dx + dy) / rr)) * (q > 0.72 ? 0.8 : 1);
          r = oc[0] * sh; g = oc[1] * sh; bl = oc[2] * sh; hit = 2; break;
        }
        if (!hit && (dx - 0.9) ** 2 + (dy - 0.9) ** 2 < rr * rr) hit = 1;
      }
      if (hit === 1) { r *= 0.7; g *= 0.7; bl *= 0.7; }
    }
    const o4 = ((by + py) * stride + bx + px) * 4;
    D[o4] = r; D[o4 + 1] = g; D[o4 + 2] = bl; D[o4 + 3] = 255;
  }
}
const FLOW = ['#e8d84a', '#eceaf4', '#c86ad8', '#e07a5a', '#7ab0e8'];
function tileDeco(x, y) {
  const i = y * W + x, h = hash(x, y, 7), b = terrain[i], X = x * TP, Y = y * TP, c = tctx;
  if (oreType[i]) return;
  const rx = k => X + 2 + Math.floor(hash(x, y, k) * (TP - 5)), ry = k => Y + 2 + Math.floor(hash(x, y, k + 1) * (TP - 5));
  if (b === 4) {
    if (h > 0.42) return;
    for (let k = 0; k < (h < 0.12 ? 2 : 1); k++) {
      const px = rx(31 + k * 2) + 1, py = ry(31 + k * 2) + 1, s = 1.5 + hash(x, y, 40 + k) * 2.2, e = 0.6 + hash(x, y, 42 + k) * 0.3;
      c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(px + 0.8, py + 1, s, s * e, 0, 0, 7); c.fill();
      c.fillStyle = '#76716a'; c.beginPath(); c.ellipse(px, py, s, s * e, 0, 0, 7); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.18)'; c.beginPath(); c.ellipse(px - s * 0.3, py - s * e * 0.35, s * 0.5, s * e * 0.4, 0, 0, 7); c.fill();
    }
  } else if (b === 0 && h < 0.16) {
    for (let k = 0; k < 3; k++) { c.fillStyle = FLOW[Math.floor(hash(x, y, 50) * FLOW.length)]; c.fillRect(rx(51 + k * 2), ry(51 + k * 2), 1, 1); }
  } else if (b === 0 && h > 0.8) {
    c.fillStyle = '#4e7a3a'; const px = rx(57), py = ry(57); c.fillRect(px, py, 1, 3); c.fillRect(px + 2, py + 1, 1, 2); c.fillRect(px - 1, py + 1, 1, 2);
  } else if (b === 5 && h < 0.55) {
    for (let k = 0; k < 4; k++) { const px = rx(61 + k * 2), py = ry(61 + k * 2); c.fillStyle = '#5e7034'; c.fillRect(px, py, 1, 5); c.fillStyle = '#7a5a30'; c.fillRect(px, py, 1, 2); }
  } else if (b === 3 && h > 0.72) {
    c.fillStyle = h > 0.9 ? '#e8dcc0' : '#8a7a58'; c.fillRect(rx(71), ry(71), 2, 1);
  } else if (b === 7 && h > 0.86) {
    const px = rx(81), py = ry(81); c.fillStyle = '#6e7478'; c.fillRect(px, py, 3, 2); c.fillStyle = '#f4f8fa'; c.fillRect(px, py, 3, 1);
  } else if (b === 2 && h < 0.3) {
    const px = rx(91), py = ry(91); c.fillStyle = '#4a4a28'; c.fillRect(px, py + 1, 4, 2); c.fillStyle = '#6e6a38'; c.fillRect(px + 1, py, 2, 2); c.fillRect(px, py + 1, 1, 1);
  } else if (b === 6 && h < 0.25) {
    const px = rx(95), py = ry(95); c.fillStyle = '#5a4428'; c.fillRect(px, py, 4, 1);
  }
}
function prepCorners() {
  if (!ORGB) ORGB = ORES.map(O => O && O.c ? [hexRgb(O.c), hexRgb(O.s || O.c)] : null);
}
function drawTile(x, y) {
  if (!ORGB) prepCorners();
  ovPix(x, y);
  const cx = Math.floor(x / CK), cy = Math.floor(y / CK), c = tch.get(cy * 4096 + cx), n = CK * TP;
  if (!c) return;
  const x2 = c.getContext('2d');
  if (!tpx) tpx = x2.createImageData(TP, TP);
  tileBase(x, y, tpx.data, TP, 0, 0);
  x2.putImageData(tpx, x * TP - cx * n, y * TP - cy * n);
  x2.setTransform(1, 0, 0, 1, -cx * n, -cy * n);
  tctx = x2;
  tileDeco(x, y);
  x2.setTransform(1, 0, 0, 1, 0, 0);
}
function drawTerrain() {
  prepCorners();
  tch.clear();
  if (rgd) return;
  paintOv(0, 0, W, H);
  const px = S.pl ? S.pl.x / CK : W / CK / 2, py = S.pl ? S.pl.y / CK : H / CK / 2, L = [];
  for (let cy = 0; cy < H / CK; cy++) for (let cx = 0; cx < W / CK; cx++) L.push([Math.hypot(cx + 0.5 - px, cy + 0.5 - py), cx, cy]);
  L.sort((a, b) => a[0] - b[0]);
  for (const [, cx, cy] of L.slice(0, 300).reverse()) chunkCv(cx, cy, true);
}

function at(x, y) {
  if (x < 0 || y < 0 || x >= W || y >= H) return null;
  const id = occ[y * W + x];
  return id ? ents.get(id) : null;
}
const kind = e => BUILD[e.type].kind;
const ENGINE_P = { mat: 'Steam chest', v: 60, g: 400, q: 200, bar: 1e9, tmax: 1e9, duct: 1, cw: 80, ua: 0.1 };
const AMB = 15, KX = 3, HEADS = [3, 5, 8, 12, 20, 30, 45];
const isNode = e => { const k = kind(e); return k === 'pipe' || k === 'engine'; };
const belty = e => { const k = kind(e); return k === 'belt' || k === 'ubelt' || k === 'splitter'; };
const ugFace = o => !BUILD[o.type].ug || BUILD[o.type].kind !== 'pipe' ? null : (o.dir + 2) % 4;
function ugOk(o, e) {
  const f = ugFace(o);
  return f == null || at(o.x + DX[f], o.y + DY[f]) === e;
}
function ugPair(e) {
  const B = BUILD[e.type];
  if (!B.ug) return null;
  if (B.kind === 'pipe') {
    for (let n = 1; n <= B.ug; n++) { const o = at(e.x + DX[e.dir] * n, e.y + DY[e.dir] * n); if (o && o.type === e.type) return o.dir === (e.dir + 2) % 4 ? { o, n } : null; }
    return null;
  }
  const d = e.mode === 'out' ? (e.dir + 2) % 4 : e.dir;
  for (let n = 1; n <= B.ug; n++) { const o = at(e.x + DX[d] * n, e.y + DY[d] * n); if (o && o.type === e.type && o.dir === e.dir) return o.mode !== e.mode ? { o, n } : null; }
  return null;
}
function ugAuto(e) {
  const B = BUILD[e.type], b = (e.dir + 2) % 4;
  for (let n = 1; n <= B.ug; n++) {
    const o = at(e.x + DX[b] * n, e.y + DY[b] * n);
    if (!o || o.type !== e.type) continue;
    if (B.kind === 'pipe') { if (o.dir === e.dir && !ugPair(o)) e.dir = b; }
    else if (o.dir === e.dir && o.mode === 'in' && !ugPair(o)) e.mode = 'out';
    return;
  }
}
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
    case 'ubelt': e.items = []; e.mode = 'in'; break;
    case 'machine': Object.assign(e, { recipe: null, inv: {}, out: {}, fi: {}, fo: {}, cy: false, prog: 0 }); break;
    case 'chest': e.store = {}; break;
    case 'sorter': e.buf = null; e.filter = null; break;
    case 'splitter': e.items = []; e.sr = [0, 0]; break;
    case 'inserter': e.hand = null; e.hn = 0; e.ph = 0; break;
    case 'pipe': Object.assign(e, { fl: null, amt: 0, tf: AMB, tw: AMB, fr: 0, strain: 0, wear: 0 }); break;
    case 'engine': Object.assign(e, { fl: 'steam', amt: 0, kw: 0, tf: AMB, tw: AMB }); break;
    case 'booster': e.head = 10; e.fr = 0; e.sat = 1; break;
    case 'pole': e.w = []; break;
    case 'miner': e.out = {}; e.prog = 0; e.k = 0; break;
    case 'turret': Object.assign(e, { ammo: 0, rd: 0, cd: 0, ang: -Math.PI / 2, sh: -1, kills: 0 }); break;
    case 'hive': Object.assign(e, { food: 0, sw: 0, dc: 0 }); break;
    case 'projector': Object.assign(e, { pay: {}, pw: 0, cd: 0, ang: -Math.PI / 2, sh: -9, shots: 0 }); break;
    case 'gun': Object.assign(e, { ammo: 0, wp: 0, cd: 0, ang: -Math.PI / 2, sh: -9, shots: 0 }); break;
    case 'ruin': e.done = 0; break;
    case 'dock': { e.mode = 'load'; const used = new Set([...ents.values()].filter(o => o.type === 'dock').map(o => o.nm)); let i = 1; while (used.has('Dock ' + i)) i++; e.nm = 'Dock ' + i; break; }
    case 'buoy': { const used = new Set([...ents.values()].filter(o => o.type === 'buoy').map(o => o.nm)); let i = 1; while (used.has('Buoy ' + i)) i++; e.nm = 'Buoy ' + i; break; }
    case 'stop': { e.mode = 'load'; const used = new Set([...ents.values()].filter(o => o.type === 'train_stop').map(o => o.nm)); let i = 1; while (used.has('Stop ' + i)) i++; e.nm = 'Stop ' + i; break; }
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

function openSea(k0) {
  const seen = new Set([k0]), q = [k0];
  for (let h = 0; h < q.length; h++) {
    if (seen.size >= 4000) return true;
    const k = q[h], x = k % W, y = (k - x) / W;
    if (x <= 0 || y <= 0 || x >= W - 1 || y >= H - 1) return true;
    for (const n of [k - 1, k + 1, k - W, k + W]) if (!seen.has(n) && terrain[n] === 1) { seen.add(n); q.push(n); }
  }
  return false;
}
function canPlace(type, x, y) {
  const B = BUILD[type];
  if (x < 0 || y < 0 || x + B.w > W || y + B.h > H) return 'Out of bounds';
  let ore = false, oil = false;
  for (let j = 0; j < B.h; j++) for (let i = 0; i < B.w; i++) {
    const k = (y + j) * W + x + i;
    if (occ[k]) return 'Something is in the way';
    if (type === 'pump') { if (terrain[k] !== 1) return 'Offshore pumps must go on water'; }
    else if (type === 'buoy') { if (terrain[k] !== 1) return 'Buoys float: put them on water'; }
    else if (B.sea) {
      if (terrain[k] === 4) return 'Bare rock: too steep to build on';
      if (terrain[k] !== 1) { if (B.sea !== 3) return B.sea === 2 ? 'An oil platform stands on the seabed: build it out at sea' : B.tide ? 'A tidal turbine stands on the seabed: build it in the sea' : B.wind ? 'An offshore turbine stands in the sea: build it on water' : 'A ' + B.n.toLowerCase() + ' is anchored in the sea: build it on water'; }
      else if (B.sea !== 3) { const d = elev ? seaLv() - elev[k] : 0.05; if (B.sea === 2 && d < 0.07) return 'Too shallow: a jacket platform needs deep water (dark blue)'; if (B.sea === 1 && d >= 0.07) return B.wind ? 'Too deep for a monopile: keep to the light blue shelf' : 'Too deep to anchor: keep to the light blue shelf'; if (B.tide && !openSea(k)) return 'Lakes have no tide: build tidal turbines in the open sea'; }
    }
    else if (terrain[k] === 1) return 'Cannot build on water';
    else if (terrain[k] === 4) return 'Bare rock: too steep to build on';
    if (oreType[k] && !ORES[oreType[k]].fluid) ore = true;
    if (oreType[k] && ORES[oreType[k]].fluid) oil = true;
  }
  if (B.marine && !openSea(y * W + x)) return 'Lakes are fresh water: seaweed farms need the open sea';
  if (type === 'dock' && ![[0, -1], [1, 0], [0, 1], [-1, 0]].some(([i, j]) => x + i >= 0 && y + j >= 0 && x + i < W && y + j < H && terrain[(y + j) * W + x + i] === 1)) return 'A dock must stand on the shore, right next to water';
  if (B.kind === 'miner' && !ore) return 'A ' + B.n.toLowerCase() + ' needs ore under it';
  if (B.well && !oil) return B.sea ? 'An oil platform must stand over an offshore oil field' : 'A ' + B.n.toLowerCase() + ' must stand on an oil seep';
  if (B.soil && soilAt(x, y, B.w, B.h) < 0.1) return 'Nothing grows here. Farms need grassland, scrub or marsh';
  if (B.geo && !nearRock(x, y, B)) return 'Geothermal reservoirs lie under young volcanic ranges: build within 6 tiles of bare rock';
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
  if (BUILD[type].ug) ugAuto(e);
  addEnt(e);
  if (BUILD[type].kind === 'pole') autoWire(e);
  return e;
}

function give(k, n) { if (n > 0) S.inv[k] = (S.inv[k] || 0) + n; }

function unlink(e) {
  const B = BUILD[e.type];
  for (let j = 0; j < B.h; j++) for (let i = 0; i < B.w; i++) occ[(e.y + j) * W + e.x + i] = 0;
  if (e.w) for (const id of e.w) { const o = ents.get(id); if (o && o.w) o.w = o.w.filter(i => i !== e.id); }
  ents.delete(e.id);
  L = null;
}
function removeEnt(e) {
  unlink(e);
  give(e.type, 1);
  if (e.items) for (const it of e.items) give(it.i, 1);
  for (const o of [e.inv, e.out, e.store]) if (o) for (const k in o) give(k, o[k]);
  if (e.buf) give(e.buf, 1);
  if (e.hand && e.hn) give(e.hand, e.hn);
  if (e.cy && e.recipe && RECIPE[e.recipe].i) for (const k in RECIPE[e.recipe].i) give(k, RECIPE[e.recipe].i[k]);
  if (e.catK) catDrop(e);
  if (sel === e.id) closePanel();
}

function lists() {
  if (L) return L;
  L = { belt: [], ubelt: [], splitter: [], inserter: [], sorter: [], node: [], pump: [], machine: [], miner: [], chest: [], engine: [], booster: [], stack: [], wall: [], turret: [], hive: [], projector: [], gun: [], ruin: [], road: [], rail: [], stop: [], dock: [], buoy: [], pole: [] };
  for (const e of ents.values()) {
    const k = kind(e);
    if (k === 'pipe') L.node.push(e);
    else if (k === 'engine') { L.node.push(e); L.engine.push(e); }
    else L[k].push(e);
  }
  L.pairs = [];
  const seen = new Set();
  for (const a of L.node) {
    for (const p of a.per) {
      const b = at(p.x, p.y);
      if (!b || b.id <= a.id || !isNode(b) || seen.has(a.id * 1e6 + b.id) || !ugOk(a, b) || !ugOk(b, a)) continue;
      seen.add(a.id * 1e6 + b.id);
      L.pairs.push([a, b]);
    }
    const u = BUILD[a.type].ug && ugPair(a);
    if (u && u.o.id > a.id) L.pairs.push([a, u.o]);
  }
  const fd = (b, s) => { const o = at(b.x + DX[s], b.y + DY[s]); return !!o && o.dir === (s + 2) % 4 && (kind(o) === 'belt' || kind(o) === 'splitter' || (kind(o) === 'ubelt' && o.mode === 'out')); };
  for (const b of L.belt) {
    b.cv = 0;
    if (fd(b, (b.dir + 2) % 4)) continue;
    const l = fd(b, (b.dir + 3) % 4), r = fd(b, (b.dir + 1) % 4);
    if (l !== r) b.cv = (l ? (b.dir + 3) % 4 : (b.dir + 1) % 4) + 1;
  }
  L.sg = new Map();
  for (const s of L.splitter) {
    if (L.sg.has(s.id)) continue;
    const R = (s.dir + 1) % 4, same = o => !!o && kind(o) === 'splitter' && o.dir === s.dir;
    let a = s;
    while (same(at(a.x - DX[R], a.y - DY[R]))) a = at(a.x - DX[R], a.y - DY[R]);
    const g = [];
    for (let o = a; same(o); o = at(o.x + DX[R], o.y + DY[R])) g.push(o);
    for (const o of g) L.sg.set(o.id, g);
  }
  netCalc(L);
  return L;
}

const WMAX = 5, PWK = ['machine', 'miner', 'inserter', 'booster', 'engine'];
const wired = () => !!(S.gen && S.gen.wire);
function pwUser(e) { const k = kind(e), B = BUILD[e.type]; return k === 'miner' || k === 'booster' || k === 'engine' || (k === 'inserter' && !!B.kw) || (k === 'machine' && !!(B.kw || B.gen || B.store)); }
function supRect(p) { const B = BUILD[p.type], s = B.sup; return [p.x - s, p.y - s, p.x + B.w - 1 + s, p.y + B.h - 1 + s]; }
function netNew(id) { return { id, demand: 0, cap: 0, gen: 0, sat: 1, load: 0, bat: 0, bmax: 0, bkw: 0, poles: 0, use: 0 }; }
function netCalc(L) {
  L.nets = []; L.nc = 0;
  if (!wired()) {
    const n = netNew(0); L.nets.push(n);
    for (const p of L.pole) { p.pg = p.pn = 0; n.poles++; }
    for (const k of PWK) for (const e of L[k]) if (pwUser(e)) { e.pn = 0; n.use++; }
    return;
  }
  const par = new Map();
  const f = id => { let r = id; while (par.get(r) !== r) r = par.get(r); while (par.get(id) !== r) { const nx = par.get(id); par.set(id, r); id = nx; } return r; };
  for (const p of L.pole) par.set(p.id, p.id);
  for (const p of L.pole) for (const id of p.w) if (par.has(id)) { const a = f(p.id), b = f(id); if (a !== b) par.set(Math.max(a, b), Math.min(a, b)); }
  const gi = new Map(), bk = new Map();
  for (const p of L.pole) {
    const r = f(p.id);
    if (!gi.has(r)) { gi.set(r, L.nets.length); L.nets.push(netNew(L.nets.length)); }
    p.pg = p.pn = gi.get(r); L.nets[p.pg].poles++;
    const s = supRect(p);
    for (let by = s[1] >> 4; by <= s[3] >> 4; by++) for (let bx = s[0] >> 4; bx <= s[2] >> 4; bx++) { const key = by * 1e5 + bx; if (!bk.has(key)) bk.set(key, []); bk.get(key).push([s[0], s[1], s[2], s[3], p.pg]); }
  }
  for (const k of PWK) for (const e of L[k]) {
    if (!pwUser(e)) continue;
    const B = BUILD[e.type], ex = e.x + B.w - 1, ey = e.y + B.h - 1;
    let g = -1;
    for (let by = e.y >> 4; by <= ey >> 4; by++) for (let bx = e.x >> 4; bx <= ex >> 4; bx++) { const a = bk.get(by * 1e5 + bx); if (a) for (const r of a) if (e.x <= r[2] && ex >= r[0] && e.y <= r[3] && ey >= r[1] && (g < 0 || r[4] < g)) g = r[4]; }
    e.pn = g;
    if (g < 0) L.nc++; else L.nets[g].use++;
  }
}
function wireOk(a, b) { const p = ctr(a), q = ctr(b); return Math.hypot(p.x - q.x, p.y - q.y) <= Math.min(BUILD[a.type].reach, BUILD[b.type].reach) + 1e-6; }
function wireCands(p) {
  const c = ctr(p), d = o => { const q = ctr(o); return Math.hypot(q.x - c.x, q.y - c.y); };
  const out = lists().pole.filter(o => o !== p && !p.w.includes(o.id) && o.w.length < WMAX && wireOk(p, o)).sort((a, b) => d(a) - d(b));
  const seen = new Set([p.pg]), res = [];
  for (const o of out) { if (seen.has(o.pg)) continue; seen.add(o.pg); res.push(o); }
  return res.slice(0, Math.max(0, WMAX - p.w.length));
}
function wlink(a, b) { a.w.push(b.id); b.w.push(a.id); L = null; }
function wcut(a, b) { a.w = a.w.filter(i => i !== b.id); b.w = b.w.filter(i => i !== a.id); L = null; }
function autoWire(p) { const cs = wireCands(p); for (const o of cs) wlink(p, o); return cs.length; }
function wireToggle(a, b) {
  if (a.w.includes(b.id)) { wcut(a, b); return ['Wire cut', false]; }
  if (!wireOk(a, b)) return [`Too far: wire between these reaches ${Math.min(BUILD[a.type].reach, BUILD[b.type].reach)} tiles`, true];
  if (a.w.length >= WMAX || b.w.length >= WMAX) return [`A pole takes at most ${WMAX} wires`, true];
  wlink(a, b);
  return ['Wire strung', false];
}

function inCap(r, k) { return Math.max(r.i[k] * 2, 4); }
function outCap(r, k) { return Math.max(10, ((r.o && r.o[k]) || 1) * 2); }
function fiCap(r, f) { return Math.max(r.fi[f] * 2, 40); }
function foCap(r, f) { return Math.max(r.fo[f] * 2, 100); }

const CAT_CAP = 4, SPENT = { v_cat: 'spent_v_cat', fuel_asm: 'spent_fuel', carbon: 'spent_carbon', ro_membrane: 'spent_membrane', ldh_sorbent: 'spent_sorbent' };
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

const rMain = r => Object.keys(r.o || {})[0] || Object.keys(r.fo || {})[0] || r.id;
function copySet(e) {
  clip = { t: e.type, recipe: e.recipe, filter: e.filter, mode: e.mode, head: e.head };
  toast('Copied settings from ' + BUILD[e.type].n + (e.recipe && RECIPE[e.recipe] ? ': ' + (RECIPE[e.recipe].n || nm(rMain(RECIPE[e.recipe]))) : ''));
}
function pasteSet(e) {
  if (!clip) return;
  const k = kind(e);
  if (k === 'machine' && !BUILD[e.type].lab && clip.recipe !== undefined) {
    const r = clip.recipe && RECIPE[clip.recipe];
    if (r && !runs(e.type, r)) return toast(BUILD[e.type].n + ' cannot run ' + (r.n || nm(rMain(r))), true);
    if (r && !avail(r)) return toast('That recipe is not available yet', true);
    setRecipe(e, clip.recipe || null);
  } else if (e.type === 'sorter') e.filter = clip.filter || null;
  else if ((e.type === 'dock' || e.type === 'train_stop') && clip.mode) e.mode = clip.mode;
  else if (e.type === 'booster' && clip.head) e.head = clip.head;
  else return toast('Nothing to paste onto this', true);
  toast('Pasted settings onto ' + BUILD[e.type].n);
  if (sel === e.id) openPanel(e);
}
function quickTake(e) {
  const src = e.out || e.store;
  if (!src) return toast('Nothing to take', true);
  let n = 0;
  for (const k in src) { give(k, src[k]); n += src[k]; }
  if (e.out) e.out = {}; else e.store = {};
  toast(n ? `Took ${Math.floor(n)} items` : 'Nothing to take', !n);
  renderHotbar(); if (sel === e.id) renderPanelDyn();
}
function quickFill(e) {
  const r = RECIPE[e.recipe];
  if (!r || kind(e) !== 'machine') return toast('Set a recipe first', true);
  let moved = 0;
  if (r.i) for (const k in r.i) {
    const n = Math.min(S.inv[k] || 0, inCap(r, k) - (e.inv[k] || 0));
    if (n > 0) { S.inv[k] -= n; if (!S.inv[k]) delete S.inv[k]; e.inv[k] = (e.inv[k] || 0) + n; moved += n; }
  }
  toast(moved ? `Inserted ${moved} items` : 'You have none of the inputs', !moved);
  renderHotbar(); if (sel === e.id) renderPanelDyn();
}
function drawAlt(vis, ox, oy, z) {
  for (const e of vis) {
    const B = BUILD[e.type], k = kind(e);
    let ic = null;
    if (B.lab) ic = curTech();
    else if (k === 'machine' && e.recipe && RECIPE[e.recipe]) ic = rMain(RECIPE[e.recipe]);
    else if (e.type === 'sorter') ic = e.filter || null;
    else if (k === 'chest' && e.store) { let m = 0; for (const q in e.store) if (e.store[q] > m) { m = e.store[q]; ic = q; } }
    if (!ic) continue;
    const s = Math.min(B.w, B.h, 2) * z * 0.6, cx = ox + (e.x + B.w / 2) * z, cy = oy + (e.y + B.h / 2) * z;
    ctx.fillStyle = 'rgba(16,18,22,0.7)'; ctx.fillRect(cx - s / 2 - 2, cy - s / 2 - 2, s + 4, s + 4);
    ctx.drawImage(icoCv(ic), cx - s / 2, cy - s / 2, s, s);
  }
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
      r = RECIPES.find(q => runs(o.type, q) && (q.i && q.i[k] || q.cat === k) && avail(q));
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

let BT = 0;
function beltInsert(b, k, p, l) {
  l = l || 0;
  const its = b.items;
  for (const it of its) if ((it.l || 0) === l && Math.abs(it.p - p) < GAP - 1e-6) return false;
  let j = 0;
  while (j < its.length && its[j].p > p) j++;
  its.splice(j, 0, { i: k, p, l, m: BT });
  return true;
}

function beltIn(o, k, d, l, r) {
  if (kind(o) === 'ubelt' && o.mode !== 'in') return false;
  if (kind(o) === 'splitter' && o.dir !== d) return false;
  if (o.dir === (d + 2) % 4) return false;
  if (o.dir === d || (o.cv && o.cv - 1 === (d + 2) % 4)) return beltInsert(o, k, Math.min(r || 0, 0.2), l);
  return beltInsert(o, k, kind(o) === 'ubelt' ? 0 : 0.5, d === (o.dir + 1) % 4 ? 0 : 1);
}

function beltPut(from, o, k, d) {
  if (kind(o) === 'ubelt' && o.mode !== 'in') return false;
  if (kind(o) === 'splitter' && o.dir !== d) return false;
  if (o.dir === (d + 2) % 4) return false;
  if (o.dir === d) { const l = from.ln = (from.ln || 0) ^ 1; return beltInsert(o, k, 0, l) || beltInsert(o, k, 0, l ^ 1); }
  const n = d === (o.dir + 1) % 4 ? 0 : 1, p = kind(o) === 'ubelt' ? 0 : 0.5;
  return beltInsert(o, k, p, n ^ 1) || beltInsert(o, k, p, n);
}

function giveTo(from, o, d, k, mode) {
  const kd = kind(o);
  if (belty(o)) {
    if (mode === 'chest' && o.dir !== d) return false;
    return beltPut(from, o, k, d);
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

function laneTick(b, len, nx, ny, d, fo) {
  const its = b.items, V = (BUILD[b.type].v || 2) * DT, hd = [null, null];
  for (let j = 0; j < its.length; j++) {
    const it = its[j], l = it.l ? 1 : 0, h = hd[l];
    let np = it.m === BT ? it.p : it.p + V;
    if (!h) {
      if (np >= len - 1e-9) {
        if (fo) { if (fo(b, it.i, l, np - len)) { its.splice(j, 1); j--; continue; } }
        else if (nx != null) {
          const o = at(nx, ny);
          if (o && (belty(o) ? beltIn(o, it.i, d, l, np - len) : acceptItem(o, it.i))) { its.splice(j, 1); j--; continue; }
        }
        np = len;
      }
    } else np = Math.min(np, h.p - GAP);
    if (np > it.p) it.p = np;
    hd[l] = it;
  }
}

function beltTick(b) {
  if (b.items.length) laneTick(b, 1, b.x + DX[b.dir], b.y + DY[b.dir], b.dir);
}

function ubTick(e) {
  if (e.mode !== 'in' || !e.items.length) return;
  const u = ugPair(e);
  if (u) laneTick(e, u.n + 1, u.o.x + DX[e.dir], u.o.y + DY[e.dir], e.dir);
  else laneTick(e, 0.5, null);
}

function splitOut(e, k, l, r) {
  const g = (L && L.sg && L.sg.get(e.id)) || [e], rr = e.sr || (e.sr = [0, 0]);
  const tg = g.length > 1 ? g.map(o => [o.x + DX[o.dir], o.y + DY[o.dir], o.dir, 0]) : [e.dir, (e.dir + 3) % 4, (e.dir + 1) % 4].map((d, i) => [e.x + DX[d], e.y + DY[d], d, i]);
  const n = tg.length;
  for (let t = 0; t < n; t++) {
    const i = (rr[l] + t) % n, [x, y, d, side] = tg[i], o = at(x, y);
    if (!o || o === e) continue;
    if (side && (!belty(o) || o.dir !== d)) continue;
    if (belty(o) ? beltIn(o, k, d, l, r) : acceptItem(o, k)) { rr[l] = (i + 1) % n; return true; }
  }
  return false;
}

function splitTick(e) {
  if (e.items.length) laneTick(e, 1, null, null, e.dir, splitOut);
}

function wants(o, k) {
  if (belty(o)) return 99;
  const kd = kind(o);
  if (o.type === 'depot') { const a = (S.orders || []).find(a => ORDERS[a.i].item === k && a.got < ORDERS[a.i].n); return a ? ORDERS[a.i].n - a.got : 0; }
  if (kd === 'chest') return 400 - sum(o.store);
  if (kd === 'turret') return k === 'cartridge' ? TUR_CAP - o.ammo : 0;
  if (kd === 'gun') return k === 'shell' || k === 'wp_shell' ? GUN_CAP - o.ammo - (o.wp || 0) : 0;
  if (kd === 'projector') return k === 'black_powder' ? POW_CAP - o.pw : PAYLOADS.includes(k) ? PROJ_CAP - sum(o.pay) : 0;
  if (kd === 'sorter') return o.buf ? 0 : 1;
  if (kd === 'machine') {
    const r = RECIPE[o.recipe] || RECIPES.find(q => runs(o.type, q) && (q.i && q.i[k] || q.cat === k) && avail(q));
    if (!r) return 0;
    if (r.cat === k) return CAT_CAP - (o.catK === k ? (o.catN || 0) + (o.ca > 0 ? 1 : 0) : 0);
    return r.i && r.i[k] ? inCap(r, k) - (o.inv[k] || 0) : 0;
  }
  return 0;
}

function insPick(e, s, t, cap) {
  const kd = kind(s);
  if (belty(s)) {
    if (kd === 'ubelt' && s.mode !== 'in') return false;
    for (let j = 0; j < s.items.length; j++) {
      const it = s.items[j];
      if (kd === 'ubelt' && it.p > 0.5) continue;
      const w = Math.min(cap, wants(t, it.i));
      if (w <= 0) continue;
      e.hand = it.i; e.hn = 0;
      for (let q = j; q < s.items.length && e.hn < w; q++) {
        if (s.items[q].i !== e.hand || (kd === 'ubelt' && s.items[q].p > 0.5)) continue;
        s.items.splice(q, 1); q--; e.hn++;
      }
      return true;
    }
    return false;
  }
  const src = kd === 'chest' ? s.store : kd === 'machine' || kd === 'miner' ? s.out : null;
  if (!src) return false;
  for (const k in src) {
    if (!(src[k] > 0)) continue;
    const w = Math.min(cap, wants(t, k), src[k]);
    if (w <= 0) continue;
    e.hand = k; e.hn = w;
    if ((src[k] -= w) <= 0) delete src[k];
    return true;
  }
  return false;
}

function insDrop(e, o) {
  const k = e.hand, d = e.dir;
  if (kind(o) === 'ubelt') return o.mode === 'in' && (beltInsert(o, k, 0.25, 1) || beltInsert(o, k, 0.25, 0));
  if (d === (o.dir + 1) % 4) return beltInsert(o, k, 0.5, 1);
  if (d === (o.dir + 3) % 4) return beltInsert(o, k, 0.5, 0);
  return beltInsert(o, k, 0.5, 1) || beltInsert(o, k, 0.5, 0);
}

function insTick(e, sp) {
  const B = BUILD[e.type], r = B.r || 1, d = e.dir, v = 2 * DT * sp / B.sw;
  e.mv = false;
  const t = at(e.x + DX[d] * r, e.y + DY[d] * r);
  if (!e.hn) {
    e.hand = null;
    if (e.ph > 0) { e.ph = Math.max(0, e.ph - v); e.mv = true; return; }
    const s = at(e.x - DX[d] * r, e.y - DY[d] * r);
    if (!s || !t || s === t || s === e || t === e) return;
    if (insPick(e, s, t, B.hand)) e.mv = true;
    return;
  }
  if (e.ph < 1) { e.ph = Math.min(1, e.ph + v); e.mv = true; return; }
  if (!t || t === e) return;
  while (e.hn > 0 && (belty(t) ? insDrop(e, t) : acceptItem(t, e.hand))) e.hn--;
  if (!e.hn) e.hand = null;
}

function rotEnt(e) {
  const B = BUILD[e.type];
  if (B.kind === 'ubelt') {
    const u = ugPair(e);
    const its = [].concat(...(u ? [e, u.o] : [e]).map(o => o.items || []));
    for (const o of u ? [e, u.o] : [e]) { o.mode = o.mode === 'in' ? 'out' : 'in'; o.dir = (o.dir + 2) % 4; o.items = []; }
    const a = u && u.o.mode === 'in' ? u.o : e;
    if (a.mode === 'in') { const n = u ? u.n + 1 : 0.5; a.items = its.map(it => ({ ...it, p: Math.max(0, n - it.p), l: it.l ? 0 : 1 })).sort((x, y) => y.p - x.p); }
    else for (const it of its) S.inv[it.i] = (S.inv[it.i] || 0) + 1;
  } else e.dir = (e.dir + (B.ug ? 2 : 1)) % 4;
  L = null;
}

function sorterTick(e) {
  if (!e.buf) return;
  const d = !e.filter || e.buf === e.filter ? e.dir : (e.dir + 1) % 4;
  const o = at(e.x + DX[d], e.y + DY[d]);
  if (!o) return;
  let ok;
  if (belty(o)) ok = beltPut(e, o, e.buf, d);
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
  if (e.tw > P.tmax) fails.push([e, P.lined === 'glass' ? `glass lining spalled at ${Math.round(e.tw)}°C` : P.lined === 'rubber' ? `rubber lining blistered at ${Math.round(e.tw)}°C` : P.lined === 'ptfe' ? `PTFE lining crept loose at ${Math.round(e.tw)}°C` : P.lined ? `lead lining melted at ${Math.round(e.tw)}°C` : P.plastic ? `softened and split at ${Math.round(e.tw)}°C` : `failed at ${Math.round(e.tw)}°C`]);
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
const HIVE_T = [null, { n: 'Crawler Nest', hp: 600, sw: 0.6, gd: 2, gr: 500, sh: 6, su: 8 }, { n: 'Crawler Hive', hp: 1200, sw: 1, gd: 4, gr: 1500, sh: 12, su: 16 }, { n: 'Brood Mound', hp: 2400, sw: 1.5, gd: 6, sh: 24, su: 30 }];
const BUGK = [{ n: 'Crawler', hp: 1, v: 1, dm: 1 }, { n: 'Spitter', hp: 0.7, v: 0.85, dm: 0.8, rng: 4 }, { n: 'Brute', hp: 4, v: 0.6, dm: 3 }, { n: 'Plated Crawler', hp: 2, v: 1.05, dm: 1.6 }, { n: 'Behemoth', hp: 9, v: 0.5, dm: 5 }];
const htier = e => HIVE_T[e.tier || 2];
let spits = [];
const maxHp = e => BUILD[e.type].kind === 'hive' ? htier(e).hp : BUILD[e.type].hp || 60 * BUILD[e.type].w * BUILD[e.type].h;
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
    const T = htier(e);
    give('crawler_shell', T.sh); give('sulfur', T.su);
    toast(`${T.n} destroyed: ${T.sh} crawler shell and ${T.su} sulfur salvaged from the wreck`);
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
const runs = (t, r) => r.b === t || (BUILD[t] && BUILD[t].as === r.b);
const avail = r => (!r.lock || !!(S.unl && S.unl[r.id])) && !(r.o && Object.keys(r.o).some(k => !BUILD[k] && TECH[k] && !techOk(k)));
const XPK = ['sci_ag', 'sci_bio', 'sci_en', 'sci_met', 'sci_mil'];
let TKX = null;
const TECH = {}, TECHL = [], PACKN = [0, 8, 20, 40, 60, 100], PACKT = [0, 5, 10, 15, 20, 30];
(() => {
  const start = new Set(Object.keys(START_INV));
  for (const k in BUILD) if (!BUILD[k].cost || !Object.keys(BUILD[k].cost).length) start.add(k);
  for (const k of ['inserter', 'long_inserter', 'splitter', 'sorter', 'wood_pole', 'turret', 'brick_wall', 'road', 'skiff', 'stack']) if (BUILD[k]) start.add(k);
  const prod = {};
  for (const r of RECIPES) for (const k in Object.assign({}, r.o, r.fo, r.ch)) (prod[k] = prod[k] || []).push(r);
  const base = new Set(['water', 'seawater', 'air', 'wood', 'log', 'fish', 'steam', ...Object.keys(START_INV)]);
  for (const o of ORES) if (o) base.add(o.item);
  const L = {}, need = {}, N = k => base.has(k) ? 0 : need[k] ?? (prod[k] ? 1e9 : 0);
  const ins = r => Object.keys(Object.assign({}, r.i, r.fi));
  const lvl = r => { let m = L[r.b] ?? 1e9; for (const q of ins(r)) m = Math.max(m, N(q)); return m; };
  for (const k in BUILD) L[k] = start.has(k) ? 0 : 1e9;
  for (let it = 0; it < 80; it++) {
    let ch = 0;
    for (const k in prod) { let b = 1e9; for (const r of prod[k]) b = Math.min(b, lvl(r)); if (b !== need[k]) { need[k] = b; ch++; } }
    for (const k in BUILD) { if (start.has(k)) continue; let m = 0; for (const q in BUILD[k].cost) m = Math.max(m, N(q)); if (m + 1 !== L[k]) { L[k] = m + 1; ch++; } }
    if (!ch) break;
  }
  const pick = {};
  for (const k in prod) pick[k] = prod[k].find(r => lvl(r) === need[k]);
  const dm = {};
  const deps = k => {
    if (dm[k]) return dm[k];
    dm[k] = new Set();
    const r = pick[k];
    if (!r || base.has(k)) return dm[k];
    const s = new Set();
    if (!start.has(r.b)) s.add(r.b);
    for (const q of ins(r)) if (q !== k) for (const b of deps(q)) s.add(b);
    return dm[k] = s;
  };
  for (const t in BUILD) {
    if (start.has(t) || L[t] >= 1e9) continue;
    const req = new Set();
    for (const q in BUILD[t].cost) for (const b of deps(q)) if (b !== t && L[b] < L[t]) req.add(b);
    const lv = Math.min(5, L[t]);
    TECH[t] = { id: t, lv, req: [...req], n: PACKN[lv] + 2 * Math.min(10, req.size), ut: PACKT[lv] };
  }
  const RX = [['sci_mil', (t, B) => B.cat === 'Defence'], ['sci_ag', (t, B) => /farm|ranch|sheep_station|estate|apiary|grove|forest|field|paddy|sugarbush|shade|nopal|orchard|glasshouse|greenhouse|plantation|layer_house|broiler|pond|harvest|kerb|hatch|barn|silo|fertil|thresh|winnow|seed|nursery|aquacult|grow_room|ripening|rearing|honey|egg_|compost|fishmeal|curing_shed|withering|tea_|olive_mill|rice_mill|cane_mill|sugar_mill|juice|peel|cream_sep|churn|abattoir|granulator/.test(t)],
    ['sci_bio', (t, B) => /ferment|brew|pharma|enzyme|yeast|vaccine|culture|steril|malt|wine|cheese|spawn|koji|agar_plant|carrageen|refold|lnp|ultrafilter|ulc_|uv_tunnel|gel_cryst|sake|pickle|homogen|membrane_sep|starch_plant|tofu|ad_plant/.test(t)],
    ['sci_en', (t, B) => B.cat === 'Power' || /^pwr$|^centrifuge$|turbine|_gen|battery|solar|wind|fuel_cell|boiler|substation|pylon|cell_line|module_line|stack_line|electrode_coater|tidal/.test(t)],
    ['sci_met', (t, B) => B.cat === 'Smelting' || /forg|strip_mill|bar_mill|tube_mill|caster|anneal|extrud|draw_tower|furnace|foundry|sinter|plating|sputter|ebpvd|magnet|vac_coater|ion_bath|plate_press|hpht|engine_hall|frame_shop|component_works|smith|weld/.test(t)]];
  const pn = {};
  for (const x of XPK) pn[x] = need[x];
  const xadd = (t, T, x, lt) => {
    if (!(pn[x] < lt)) return;
    T.x = x;
    const rs = new Set(T.req);
    for (const b of deps(x)) if (b !== t && L[b] < lt && TECH[b]) rs.add(b);
    T.req = [...rs];
  };
  for (const t in TECH) { const f = RX.find(([, fn]) => fn(t, BUILD[t])); if (f) xadd(t, TECH[t], f[0], L[t]); }
  TKX = { need, deps, L, xadd };
  for (const t in TECH) {
    const T = TECH[t];
    T.dir = T.req.filter(p => !T.req.some(q => q !== p && TECH[q] && TECH[q].req.includes(p)));
    TECHL.push(t);
  }
  TECHL.sort((a, b) => TECH[a].lv - TECH[b].lv || BUILD[a].n.localeCompare(BUILD[b].n));
  RECIPE.study = { id: 'study', n: 'Research', b: 'rlab', t: 1, i: { sci1: 1, sci2: 1, sci3: 1, sci4: 1, sci5: 1, sci_ag: 1, sci_bio: 1, sci_en: 1, sci_met: 1, sci_mil: 1 }, o: {} };
})();
const techOk = t => !TECH[t] || !!(S.tech && S.tech[t]);
const techAvail = t => TECH[t].req.every(techOk);
const buildOk = t => techOk(t) && (!BUILD[t].lock || !!(S.unl && S.unl[BUILD[t].lock]));
const gate = k => BUILD[k] ? buildOk(k) : techOk(k);
const lockMsg = t => !techOk(t) ? `Needs research: ${nm(t)}. Press T to open research.` : 'Locked. The design is in the lab books of an abandoned works.';
const packs = t => [...Array.from({ length: TECH[t].lv }, (_, i) => 'sci' + (i + 1)), ...(TECH[t].x ? [TECH[t].x] : [])];
function curTech() {
  if (!S.rq) S.rq = [];
  while (S.rq.length && (!TECH[S.rq[0]] || S.tech[S.rq[0]])) S.rq.shift();
  return S.rq[0] || null;
}
function queueTech(t, front) {
  if (!TECH[t] || S.tech[t]) return;
  if (!S.rq) S.rq = [];
  const add = [], seen = new Set();
  const walk = x => { if (seen.has(x) || S.tech[x]) return; seen.add(x); for (const p of TECH[x].dir) walk(p); add.push(x); };
  walk(t);
  for (const x of TECH[t].req) if (!S.tech[x] && !seen.has(x)) { seen.add(x); add.unshift(x); }
  add.sort((a, b) => TECH[a].lv - TECH[b].lv);
  S.rq = S.rq.filter(x => !add.includes(x));
  S.rq = front ? [...add, ...S.rq] : [...S.rq, ...add];
}
function labStart(e) {
  const t = curTech();
  if (!t) return 'nores';
  const ps = packs(t);
  if (ps.some(p => !(e.inv[p] >= 1))) return 'input';
  for (const p of ps) { e.inv[p]--; if (!e.inv[p]) delete e.inv[p]; }
  e.rt = t; e.cy = true;
  return null;
}
function labDone(e) {
  const t = e.rt;
  if (!t || !TECH[t] || S.tech[t]) return;
  if (!S.rp) S.rp = {};
  S.rp[t] = (S.rp[t] || 0) + 1;
  if (S.rp[t] >= TECH[t].n) {
    S.tech[t] = 1; delete S.rp[t];
    curTech();
    toast(`Research complete: ${nm(t)}. You can now craft it.`);
    cSig = '';
    if (modalKind === 'tech') renderModal();
  }
}
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
function hiveTier(x, y) {
  const d = Math.hypot(x - W / 2, y - H / 2), u = hash(x, y, 31);
  return d < 110 ? (u < 0.7 ? 1 : 2) : d < 260 ? (u < 0.25 ? 1 : u < 0.85 ? 2 : 3) : (u < 0.45 ? 2 : 3);
}
function addHive(x, y, t) {
  const h = makeEnt('hive', x, y, 0);
  h.tier = t || hiveTier(x, y); h.gr = 0; h.hp = maxHp(h);
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
const DGN = 60, DG_VEIN = ['sulfur', 'sulfur', 'pbzn_ore', 'copper_ore', 'cassiterite', 'wolframite', 'pgm_ore'], DG_BRIM = ['sulfur', 'sulfur', 'sulfur', 'pyrite_conc', 'gypsum'];
const DGK = { nest: 'Crawler burrow', brim: 'Brimstone burrow', deep: 'Deep burrow', mine: 'Infested mine', lava: 'Lava tube', ice: 'Ice cave', works: 'Ammonia works' };
const DGQ = { nest: 'BURROW QUEEN', brim: 'BRIMSTONE QUEEN', deep: 'DEEP QUEEN', mine: 'BROOD TYRANT', lava: 'EMBER QUEEN', ice: 'FROST QUEEN', works: 'BROODMOTHER' };
const DG_LAVA = ['sulfur', 'sulfur', 'gypsum', 'pyrite_conc'], DG_ICE = ['cassiterite', 'wolframite', 'cassiterite', 'copper_ore'];
const XDG = { infested: 'mine', lavatube: 'lava', icecave: 'ice', nh3works: 'works' };
const dgRooms = ty => ty === 'mine' || ty === 'works';
const dgFull = ty => dgRooms(ty) || ty === 'lava' || ty === 'ice';
const DG_WR = [['motor', 1], ['wire', 6], ['gearbox', 1], ['cylinder', 2], ['cu_cat', 2], ['como_cat', 2], ['urea', 10], ['steel', 4], ['respirator', 1], ['plate', 12], ['cartridge', 6]];
const DGX = {
  mine: { done: 'The shaft is capped with concrete. Nothing is left down there.', reach: 'Walk up to the pithead first.', gone: 'Capped', info: '' },
  lava: { done: 'The roof of the tube has fallen in. Nothing is left down there.', reach: 'Walk up to the skylight first.', gone: 'Roof fallen in', info: 'A skylight into a lava tube, a tunnel left when the crust of a basalt flow froze and the molten core drained out. Fumaroles line the walls with sulfur, gypsum and pyrite. The floor is broken by pools that are still molten: they burn fast, so walk round them. An ember queen nests at the far end and spits burning globs that leave flames on the floor. Kill her and empty every cache and the roof comes down behind you.' },
  ice: { done: 'Meltwater has flooded the channel. Nothing is left down there.', reach: 'Walk up to the ice mouth first.', gone: 'Flooded', info: 'A meltwater channel under a glacier, cut down into granite with tin and tungsten veins. Glare ice on the floor makes you slide, so you keep going for a moment after you let go. Pools of near-freezing meltwater chill you and slow you down, and so does the spit of the frost queen at the far end. Kill her and empty every cache and the channel floods behind you.' },
  works: { done: 'The works are shut down and the gate is welded. Nothing is left in there.', reach: 'Walk up to the gate first.', gone: 'Shut down', info: 'A wrecked Haber-Bosch ammonia plant the crawlers moved into. Control rooms, compressor houses, a lab, stores and a shift converter bay, each with operators\' lockers. Some rooms still leak ammonia from cracked lines: close the red valve on the wall with F, or wear an ammonia respirator. The plant manager\'s safe holds the key to the gate of the synthesis hall, where a broodmother burrows under the cracked floor.' },
};
let dfx = [], dgc = null, dgMine = null, dgcam = { x: 0, y: 0, z: 36 }, dgDark = null;
const dgcc = {};
function dgBfs(N, g, sx, sy) {
  const d = new Int16Array(N * N).fill(-1), q = [sy * N + sx];
  d[q[0]] = 0;
  for (let h = 0; h < q.length; h++) {
    const k = q[h], x = k % N, y = (k - x) / N;
    for (const [i, j] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = (y + j) * N + x + i; if (!g[n] && d[n] < 0) { d[n] = d[k] + 1; q.push(n); } }
  }
  return d;
}
function dgGen(seed, ty) {
  ty = ty || 'nest';
  if (dgRooms(ty)) return mineGen(seed, ty);
  const r = mulberry32(seed >>> 0), N = ty === 'deep' ? 80 : ty === 'lava' ? 70 : ty === 'ice' ? 64 : DGN, g = new Uint8Array(N * N), wf = ty === 'lava' ? 0.52 : 0.46;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) g[y * N + x] = x < 1 || y < 1 || x >= N - 1 || y >= N - 1 || r() < wf ? 1 : 0;
  const nb = (x, y) => { let n = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if ((i || j) && (x + i < 0 || y + j < 0 || x + i >= N || y + j >= N || g[(y + j) * N + x + i])) n++; return n; };
  for (let it = 0; it < 5; it++) {
    const o = new Uint8Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const n = nb(x, y); o[y * N + x] = x < 1 || y < 1 || x >= N - 1 || y >= N - 1 ? 1 : n >= 5 ? 1 : n <= 3 ? 0 : g[y * N + x]; }
    g.set(o);
  }
  const dig = (x, y, rr) => { for (let j = -rr; j <= rr; j++) for (let i = -rr; i <= rr; i++) { const X = x + i, Y = y + j; if (X > 1 && Y > 1 && X < N - 2 && Y < N - 2 && i * i + j * j <= rr * rr + 1) g[Y * N + X] = 0; } };
  const ex = 5, ey = Math.floor(N / 2);
  let wx = ex, wy = ey;
  const gx = N - 7, gy = 6 + Math.floor(r() * (N - 12));
  for (let k = 0; k < 900 * N / DGN && (Math.abs(wx - gx) > 1 || Math.abs(wy - gy) > 1); k++) {
    if (r() < 0.62) { wx += Math.sign(gx - wx); wy += r() < 0.5 ? Math.sign(gy - wy) : 0; }
    else { wx += Math.floor(r() * 3) - 1; wy += Math.floor(r() * 3) - 1; }
    wx = Math.max(3, Math.min(N - 4, wx)); wy = Math.max(3, Math.min(N - 4, wy));
    dig(wx, wy, r() < (ty === 'lava' ? 0.75 : 0.3) ? 2 : 1);
  }
  dig(ex, ey, 2); dig(gx, gy, 3);
  let d = dgBfs(N, g, ex, ey);
  for (let k = 0; k < N * N; k++) if (d[k] < 0) g[k] = 1;
  let qk = 0;
  for (let k = 0; k < N * N; k++) if (d[k] > d[qk]) qk = k;
  const qx = qk % N, qy = (qk - qx) / N;
  dig(qx, qy, 3);
  d = dgBfs(N, g, ex, ey);
  for (let k = 0; k < N * N; k++) if (d[k] < 0) g[k] = 1;
  const md = d[qy * N + qx], caches = [];
  for (const f of ty === 'deep' ? [0.2, 0.32, 0.45, 0.56, 0.67, 0.78, 0.9] : [0.28, 0.45, 0.6, 0.75, 0.88]) {
    let best = -1, bs = -1;
    for (let k = 0; k < N * N; k++) {
      if (g[k] || d[k] < 4) continue;
      const x = k % N, y = (k - x) / N;
      if (Math.hypot(x - qx, y - qy) < 5 || caches.some(c => Math.hypot(c.x - x, c.y - y) < 7)) continue;
      const sc = -Math.abs(d[k] - f * md) + nb(x, y) * 1.5 + r() * 2;
      if (sc > bs) { bs = sc; best = k; }
    }
    if (best >= 0) caches.push({ x: best % N, y: Math.floor(best / N) });
  }
  const vein = new Map(), VL = ty === 'brim' ? DG_BRIM : ty === 'lava' ? DG_LAVA : ty === 'ice' ? DG_ICE : DG_VEIN, vd = ty === 'brim' ? 0.18 : ty === 'lava' ? 0.1 : ty === 'ice' ? 0.09 : ty === 'deep' ? 0.09 : 0.075;
  for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) {
    const k = y * N + x;
    if (!g[k] || !(!g[k - 1] || !g[k + 1] || !g[k - N] || !g[k + N])) continue;
    if (hash(x, y, seed & 0xffff) < vd) vein.set(k, VL[Math.floor(hash(y, x, seed & 0xfff) * VL.length)]);
  }
  const r2 = mulberry32((seed ^ 0x2545f491) >>> 0), eggs = [], pool = new Set();
  for (const f of ty === 'deep' ? [0.3, 0.42, 0.54, 0.66, 0.76, 0.86, 0.94] : [0.35, 0.55, 0.7, 0.85]) {
    let best = -1, bs = -1e9;
    for (let k = 0; k < N * N; k++) {
      if (g[k] || d[k] < 10) continue;
      const x = k % N, y = (k - x) / N;
      if (Math.hypot(x - qx, y - qy) < 4 || caches.some(c => Math.hypot(c.x - x, c.y - y) < 4) || eggs.some(c => Math.hypot(c.x - x, c.y - y) < 6)) continue;
      const sc = -Math.abs(d[k] - f * md) + nb(x, y) + r2() * 2;
      if (sc > bs) { bs = sc; best = k; }
    }
    if (best >= 0) eggs.push({ x: best % N, y: Math.floor(best / N) });
  }
  if (ty === 'brim') {
    for (let p = 0, t = 0; p < 7 && t < 400; t++) {
      const x = 2 + Math.floor(r2() * (N - 4)), y = 2 + Math.floor(r2() * (N - 4)), k = y * N + x;
      if (g[k] || d[k] < 12 || Math.hypot(x - qx, y - qy) < 4 || caches.some(c => Math.hypot(c.x - x, c.y - y) < 3) || eggs.some(c => Math.hypot(c.x - x, c.y - y) < 3)) continue;
      const q = [k], sz = 3 + Math.floor(r2() * 5);
      pool.add(k);
      for (let h = 0; h < q.length && pool.size < 999; h++) {
        const kk = q[h], xx = kk % N, yy = (kk - xx) / N;
        for (const [i, j] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const n = (yy + j) * N + xx + i;
          if (q.length >= sz || g[n] || pool.has(n) || d[n] < 10 || caches.some(c => c.y * N + c.x === n)) continue;
          if (r2() < 0.7) { pool.add(n); q.push(n); }
        }
      }
      p++;
    }
  }
  const ice = new Set();
  if (ty === 'lava' || ty === 'ice') {
    const ok = () => { const bl = new Uint8Array(g); for (const k of pool) bl[k] = 1; const dd = dgBfs(N, bl, ex, ey); return dd[qy * N + qx] >= 0 && caches.every(c => dd[c.y * N + c.x] >= 0); };
    for (let p = 0, t = 0; p < (ty === 'lava' ? 9 : 8) && t < 400; t++) {
      const x = 2 + Math.floor(r2() * (N - 4)), y = 2 + Math.floor(r2() * (N - 4)), k = y * N + x;
      if (g[k] || pool.has(k) || d[k] < 10 || Math.hypot(x - qx, y - qy) < 4 || caches.some(c => Math.hypot(c.x - x, c.y - y) < 3) || eggs.some(c => Math.hypot(c.x - x, c.y - y) < 3)) continue;
      const q = [k], sz = 3 + Math.floor(r2() * 6);
      for (let h = 0; h < q.length; h++) {
        const kk = q[h], xx = kk % N, yy = (kk - xx) / N;
        for (const [i, j] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const n = (yy + j) * N + xx + i;
          if (q.length >= sz || g[n] || q.includes(n) || pool.has(n) || d[n] < 8 || caches.some(c => c.y * N + c.x === n) || eggs.some(c => c.y * N + c.x === n)) continue;
          if (r2() < 0.7) q.push(n);
        }
      }
      for (const n of q) pool.add(n);
      if (!ok()) { for (const n of q) pool.delete(n); continue; }
      p++;
    }
    if (ty === 'ice') for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) { const k = y * N + x; if (!g[k] && !pool.has(k) && d[k] > 4 && fbm(x / 7, y / 7, (seed & 0xffff) + 909) > 0.56) ice.add(k); }
  }
  return { seed, ty, N, g, d, ex, ey, qx, qy, md, caches, vein, eggs, pool, ice, leak: new Set(), valves: [], deco: new Map(), lamps: [] };
}
const MINE_RK = ['store', 'lamp', 'drift', 'crusher', 'office', 'pump'];
const MINE_PROP = { store: ['crate', 'crate', 'barrel', 'rack'], lamp: ['rack', 'cabinet', 'rack'], drift: ['timber', 'cart', 'timber'], crusher: ['machine', 'cart', 'barrel'], office: ['desk', 'cabinet', 'cabinet'], pump: ['pumpset', 'barrel', 'machine'] };
const MINE_RN = { shaft: 'Shaft station', store: 'Storeroom', lamp: 'Lamp room', drift: 'Drift heading', crusher: 'Crusher chamber', office: 'Shift office', pump: 'Pump station', boss: 'Old pump hall' };
const WORKS_RK = ['control', 'compressor', 'lab', 'stores', 'converter', 'shop'];
const WORKS_PROP = { control: ['panel', 'panel', 'desk'], compressor: ['tank', 'pipe', 'machine'], lab: ['bench', 'cabinet', 'bench'], stores: ['drum', 'drum', 'rack'], converter: ['tank', 'pipe', 'tank'], shop: ['bench', 'rack', 'drum'] };
const WORKS_RN = { shaft: 'Gatehouse', control: 'Control room', compressor: 'Compressor house', lab: 'Lab', stores: 'Stores', converter: 'Shift converter bay', shop: 'Maintenance shop', boss: 'Synthesis hall' };
function mineGen(seed, ty) {
  const wk = ty === 'works', r = mulberry32((seed ^ (wk ? 0x6c8e9cf5 : 0x5bd1e995)) >>> 0), N = 64, g = new Uint8Array(N * N).fill(1), rm = new Int8Array(N * N).fill(-1), rooms = [], deco = new Map();
  rooms.push({ x: 3, y: 28, w: 7, h: 7, k: 'shaft' });
  for (let t = 0; t < 500 && rooms.length < 14; t++) {
    const w = 5 + Math.floor(r() * 6), h = 5 + Math.floor(r() * 5), x = 3 + Math.floor(r() * (41 - w)), y = 3 + Math.floor(r() * (N - 6 - h));
    if (rooms.some(o => x < o.x + o.w + 3 && o.x < x + w + 3 && y < o.y + o.h + 3 && o.y < y + h + 3)) continue;
    rooms.push({ x, y, w, h, k: (wk ? WORKS_RK : MINE_RK)[Math.floor(r() * MINE_RK.length)] });
  }
  const by = 10 + Math.floor(r() * (N - 32));
  rooms.push({ x: N - 16, y: by, w: 13, h: 11, k: 'boss' });
  const bi = rooms.length - 1, boss = rooms[bi];
  rooms.forEach((o, i) => { o.cx = o.x + Math.floor(o.w / 2); o.cy = o.y + Math.floor(o.h / 2); for (let j = 0; j < o.h; j++) for (let ii = 0; ii < o.w; ii++) { const k = (o.y + j) * N + o.x + ii; g[k] = 0; rm[k] = i; } });
  const hl = (x0, x1, y) => { for (let x = Math.min(x0, x1); x <= Math.max(x0, x1) + 1; x++) { g[y * N + x] = 0; g[(y + 1) * N + x] = 0; } };
  const vl = (y0, y1, x) => { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1) + 1; y++) { g[y * N + x] = 0; g[y * N + x + 1] = 0; } };
  const link = (a, b) => { if (r() < 0.5) { hl(a.cx, b.cx, a.cy); vl(a.cy, b.cy, b.cx); } else { vl(a.cy, b.cy, a.cx); hl(a.cx, b.cx, b.cy); } };
  const inT = [0], nb = bi;
  while (inT.length < nb) {
    let ba = -1, bb = -1, bd = 1e9;
    for (const a of inT) for (let b = 0; b < nb; b++) { if (inT.includes(b)) continue; const dd = Math.abs(rooms[a].cx - rooms[b].cx) + Math.abs(rooms[a].cy - rooms[b].cy); if (dd < bd) { bd = dd; ba = a; bb = b; } }
    link(rooms[ba], rooms[bb]); inT.push(bb);
  }
  for (let e = 0; e < 2 && nb > 3; e++) { const a = 1 + Math.floor(r() * (nb - 1)), b = Math.floor(r() * nb); if (a !== b) link(rooms[a], rooms[b]); }
  let near = 0;
  for (let i = 1; i < nb; i++) if (Math.hypot(rooms[i].cx - boss.cx, rooms[i].cy - boss.cy) < Math.hypot(rooms[near].cx - boss.cx, rooms[near].cy - boss.cy)) near = i;
  const nr = rooms[near];
  vl(nr.cy, boss.cy, nr.cx); hl(nr.cx, boss.x - 1, boss.cy);
  const door = [boss.cy * N + boss.x - 1, (boss.cy + 1) * N + boss.x - 1];
  const ex = rooms[0].cx, ey = rooms[0].cy;
  const reach = () => { const dd = dgBfs(N, g, ex, ey); let n = 0; for (let k = 0; k < N * N; k++) if (!g[k] && dd[k] < 0) n++; return n === 0; };
  const caches = [], eggs = [], lamps = [];
  for (const [i, j] of [[3, 3], [boss.w - 4, 3], [3, boss.h - 4], [boss.w - 4, boss.h - 4]]) { const k = (boss.y + j) * N + boss.x + i; g[k] = 1; deco.set(k, wk ? 'column' : 'pillar'); }
  const edge = (o, k) => {
    const x = k % N, y = (k - x) / N;
    if (g[k] || deco.has(k) || door.includes(k) || Math.abs(x - o.cx) + Math.abs(y - o.cy) < 2) return false;
    const L = x === o.x, R = x === o.x + o.w - 1, U = y === o.y, B = y === o.y + o.h - 1;
    if (!(L || R || U || B)) return false;
    if ((L && !g[k - 1]) || (R && !g[k + 1]) || (U && !g[k - N]) || (B && !g[k + N])) return false;
    for (const [ii, jj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = k + jj * N + ii; if (!g[n] && rm[n] < 0) return false; }
    return true;
  };
  const tiles = o => { const l = []; for (let j = 0; j < o.h; j++) for (let ii = 0; ii < o.w; ii++) l.push((o.y + j) * N + o.x + ii); return l; };
  for (let i = 1; i < nb; i++) {
    const o = rooms[i], PL = (wk ? WORKS_PROP : MINE_PROP)[o.k], cand = tiles(o).filter(k => edge(o, k));
    for (let p = 0, n = Math.floor(o.w * o.h / 10); p < n && cand.length; p++) {
      const k = cand.splice(Math.floor(r() * cand.length), 1)[0];
      if (g[k]) continue;
      g[k] = 1;
      if (!reach()) { g[k] = 0; continue; }
      deco.set(k, PL[Math.floor(r() * PL.length)]);
    }
    const cc = tiles(o).filter(k => edge(o, k));
    const ck = cc.length ? cc[Math.floor(r() * cc.length)] : o.cy * N + o.cx - 1;
    caches.push({ x: ck % N, y: Math.floor(ck / N), t: 'locker', r: i });
  }
  const d = dgBfs(N, g, ex, ey);
  let far = 0;
  caches.forEach((c, i) => { if (d[c.y * N + c.x] > d[caches[far].y * N + caches[far].x]) far = i; });
  if (caches.length) caches[far].t = 'safe';
  caches.push({ x: boss.x + boss.w - 2, y: boss.cy, t: 'boss', r: bi });
  rooms.forEach((o, i) => {
    if (i === 0 || i === bi || r() < 0.6) lamps.push({ x: o.cx, y: o.y, f: i !== 0 && r() < 0.4 ? 1 : 0 });
    if (i > 0 && i < bi && d[o.cy * N + o.cx] > 14 && r() < 0.55) eggs.push({ x: o.cx, y: o.cy });
  });
  const leak = new Set(), valves = [];
  if (wk) for (let i = 1; i < nb; i++) {
    if (r() > 0.45) continue;
    const o = rooms[i], cand = tiles(o).filter(k => edge(o, k) && !caches.some(c => c.y * N + c.x === k));
    let ok = false;
    while (cand.length && !ok) {
      const k = cand.splice(Math.floor(r() * cand.length), 1)[0];
      g[k] = 1;
      if (!reach()) { g[k] = 0; continue; }
      deco.set(k, 'valve'); valves.push({ x: k % N, y: Math.floor(k / N), r: i }); leak.add(i); ok = true;
    }
  }
  for (const k of door) { g[k] = 1; deco.set(k, 'door'); }
  const qx = boss.cx - 2, qy = boss.cy;
  return { seed, ty: wk ? 'works' : 'mine', N, g, d: wk ? dgBfs(N, g, ex, ey) : d, ex, ey, qx, qy, md: d[qy * N + qx], caches, vein: new Map(), eggs, pool: new Set(), ice: new Set(), leak, valves, deco, lamps, rm, rooms, door, boss: bi };
}
const dgSeed = e => (S.seed * 131 + e.x * 7919 + e.y * 104729) >>> 0;
function dgKind(e) {
  if (XDG[e.type]) return XDG[e.type];
  if (e.bk) return e.bk;
  if (e.oc || e.mv || e.qhp != null) return 'nest';
  const u = hash(e.x, e.y, 77);
  return u < 0.28 ? 'brim' : burrowTier(e) >= 2 && u < 0.62 ? 'deep' : 'nest';
}
function dgCaches(e) {
  const ty = dgKind(e), s = dgSeed(e), key = s + ty;
  return dgcc[key] || (dgcc[key] = dgGen(s, ty).caches.length);
}
const dgGrid = () => (dgc && dgc.seed === S.dg.seed && dgc.ty === (S.dg.ty || 'nest') ? dgc : (dgc = dgGen(S.dg.seed, S.dg.ty || 'nest')));
function dgSolid(x, y) {
  const G = dgGrid(), X = Math.floor(x), Y = Math.floor(y);
  if (X < 0 || Y < 0 || X >= G.N || Y >= G.N) return true;
  const k = Y * G.N + X;
  return !!G.g[k] && !(S.dg.mv && S.dg.mv[k]);
}
function dgFree(x, y, r) { return !dgSolid(x - r, y - r) && !dgSolid(x + r, y - r) && !dgSolid(x - r, y + r) && !dgSolid(x + r, y + r); }
function dgSee(ax, ay, bx, by) {
  const n = Math.ceil(Math.hypot(bx - ax, by - ay) * 3);
  for (let i = 1; i < n; i++) if (dgSolid(ax + (bx - ax) * i / n, ay + (by - ay) * i / n)) return false;
  return true;
}
const burrowTier = e => hiveTier(e.x, e.y);
function dgEnter(e) {
  const P = S.pl, xt = XDG[e.type], X = xt && DGX[xt];
  if (e.done) return toast(X ? X.done : 'The burrow has fallen in. Nothing lives down there now.', true);
  if (P.dead > 0 || P.car) return toast('Get out of the vehicle first.', true);
  if (!entReach(e, 3)) return toast(X ? X.reach : 'Walk up to the burrow mouth first.', true);
  const ty = dgKind(e), seed = dgSeed(e), mine = dgRooms(ty);
  if (!xt) e.bk = ty;
  S.dg = { bid: e.id, seed, ty, rx: P.x, ry: P.y, px: 0, py: 0, bugs: [], sp: [], t: 0 };
  dgc = null;
  const G = dgGrid(), T = burrowTier(e), ev = 1 + 2 * S.evo, D = S.dg;
  D.px = G.ex + 0.5; D.py = G.ey + 0.5;
  D.mv = Object.assign({}, e.mv || {});
  D.oc = (e.oc || []).slice();
  D.eg = (e.eg || []).slice();
  D.key = e.key || 0;
  if (xt) { D.vc = (e.vc || []).slice(); D.fire = []; }
  const eh = Math.round(50 * T * ev);
  D.eggs = [];
  G.eggs.forEach((o, i) => { if (!D.eg.includes(i)) D.eggs.push({ x: o.x + 0.5, y: o.y + 0.5, hp: eh, mhp: eh, cd: 2 + i % 4, i, egg: 1 }); });
  const qh = Math.round((ty === 'mine' ? 1500 : ty === 'works' ? 1400 : ty === 'deep' ? 1100 : ty === 'lava' || ty === 'ice' ? 900 : 700) * T * (1 + S.evo));
  D.q = { x: G.qx + 0.5, y: G.qy + 0.5, hp: e.qhp != null ? Math.min(e.qhp, qh) : qh, mhp: qh, cd: 2, sp: 4, aw: 0, a: Math.PI };
  if (ty === 'mine') Object.assign(D.q, { ty: 'tyrant', cd: 3, sp: 6, a: Math.PI });
  if (ty === 'works') Object.assign(D.q, { ty: 'brood', sp: 8, sub: 1 });
  if (ty === 'lava') D.q.ty = 'ember';
  if (ty === 'ice') D.q.ty = 'frost';
  if (D.q.hp <= 0) { D.q.hp = 0; D.q.dead = 1; D.q.sub = 0; }
  const rng = mulberry32(seed + 5), n = mine ? 14 + 6 * T : ty === 'deep' ? 16 + 7 * T : xt ? 13 + 6 * T : 10 + 5 * T;
  for (let k = 0, tries = 0; k < n && tries < 4000; tries++) {
    const x = 1 + Math.floor(rng() * (G.N - 2)), y = 1 + Math.floor(rng() * (G.N - 2)), i = y * G.N + x;
    if (G.g[i] || G.d[i] < 12 || (G.rm && G.rm[i] === G.boss) || G.pool.has(i)) continue;
    const u = rng(), gt = gearT(), k0 = T >= 2 && u < 0.12 + 0.05 * T + (ty === 'deep' ? 0.06 : 0) ? 2 : u < 0.4 ? 1 : 0, kk = k0 === 2 && gt > 0.55 && Math.random() < gt - 0.4 ? 4 : k0 === 0 && gt > 0.25 && Math.random() < 0.6 * gt ? 3 : k0, mhp = Math.round(30 * ev * (1 + 1.2 * gt) * BUGK[kk].hp);
    const b = { x: x + 0.5, y: y + 0.5, hp: mhp, mhp, a: rng() * 7, ph: rng() * 7, aw: 0, cd: 0 };
    if (kk) b.k = kk;
    D.bugs.push(b); k++;
  }
  P.x = e.x + 1; P.y = e.y + 1;
  mining = null; dgMine = null; tool = null; camFree = false;
  closePanel(); renderHotbar();
  S.dgn = (S.dgn || 0) + 1;
  S.dgk = S.dgk || {}; S.dgk[ty] = 1;
  if (ty === 'mine') S.mdn = (S.mdn || 0) + 1;
  if (ty === 'lava') S.lvn = (S.lvn || 0) + 1;
  if (ty === 'ice') S.icn = (S.icn || 0) + 1;
  if (ty === 'works') S.wkn = (S.wkn || 0) + 1;
  toast(ty === 'mine' ? `You ride the cage down into a tier ${T} infested mine. Crawlers have taken over the old roadways. The storerooms and lamp rooms still have their lockers, and the shift boss's safe holds the key to the blast door of the old pump hall, where something big has nested. Press F in the cage to ride back up.`
    : ty === 'works' ? `You slip in through the gate of a tier ${T} ammonia works. Crawlers nest among the compressors and control panels. Where you hear a hiss, a cracked line is still bleeding ammonia from the storage spheres: close the red valve on the wall with F, or wear an ammonia respirator. The plant manager's safe holds the key to the synthesis hall. Press F at the gate to leave.`
    : ty === 'lava' ? `You climb down through a skylight into a tier ${T} lava tube. The basalt walls are glazed smooth by the old flow and crusted yellow and white where fumaroles vent sulfur. Pools of lava still glow on the floor: they burn badly, so walk round them. An ember queen nests at the far end. Press F at the rope to climb out.`
    : ty === 'ice' ? `You climb down into a tier ${T} ice cave, a meltwater channel cut under the glacier into the granite below. Glare ice on the floor makes you slide, and the pools of meltwater are near freezing: they chill you and slow you down. Tin and tungsten veins glint in the walls. Press F at the rope to climb out.`
    : ty === 'brim' ? `You climb down into a tier ${T} brimstone burrow. These crawlers tunnel through native sulfur: yellow veins everywhere, and pools of sulfuric acid where their waste has soaked into pyrite. Stay out of the pools. Press F at the rope to climb out.`
    : ty === 'deep' ? `You climb down into a tier ${T} deep burrow. It runs much further than the others, with more caches, more egg clutches and a bigger queen at the bottom. Press F at the rope to climb out.`
    : `You climb down into a tier ${T} crawler burrow. Clear it, loot the old supply caches and find the queen. Press F at the rope to climb out.`);
}
function dgExit(dead) {
  const D = S.dg, P = S.pl, e = ents.get(D.bid), G = dgGrid();
  if (e) {
    e.mv = D.mv; e.oc = D.oc; e.eg = D.eg || []; if (D.key) e.key = 1; if (D.vc) e.vc = D.vc;
    if (dgFull(D.ty)) { e.qhp = Math.max(0, D.q.hp); if (D.q.hp <= 0 && D.oc.length >= G.caches.length) e.done = 1; }
    else { e.qhp = D.q.hp > 0 ? D.q.hp : undefined; if (D.q.hp <= 0) e.done = 1; }
  }
  S.dg = null; dgMine = null;
  if (e) {
    const c = ctr(e);
    let spot = null;
    for (let r = 1.6; r < 6 && !spot; r += 0.5) for (let a = 0; a < 16 && !spot; a++) { const x = c.x + Math.cos(a / 16 * Math.PI * 2 + Math.PI / 2) * r, y = c.y + Math.sin(a / 16 * Math.PI * 2 + Math.PI / 2) * r; if (plFree(x, y)) spot = { x, y }; }
    Object.assign(P, spot || { x: D.rx, y: D.ry });
  } else { P.x = D.rx; P.y = D.ry; }
  if (dead) { P.dead = 6; P.hp = 0; }
  camFree = false;
}
function dgFlow() {
  const G = dgGrid(), D = S.dg, N = G.N, f = new Int16Array(N * N).fill(-1), sx = Math.floor(D.px), sy = Math.floor(D.py), q = [sy * N + sx];
  f[q[0]] = 0;
  for (let h = 0; h < q.length; h++) {
    const k = q[h], x = k % N, y = (k - x) / N;
    if (f[k] > 30) continue;
    for (const [i, j] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const X = x + i, Y = y + j, n = Y * N + X;
      if (f[n] >= 0 || dgSolid(X, Y) || (i && j && (dgSolid(x + i, y) || dgSolid(x, y + j)))) continue;
      f[n] = f[k] + 1; q.push(n);
    }
  }
  D.ff = f;
}
function dgHurt(d, raw) {
  const P = S.pl;
  if (P.dead > 0 || !S.dg) return;
  if (!raw) d = armSoak(d);
  else if (S.dg.ty === 'lava' || S.dg.ty === 'ice') d *= 0.5 ** Math.min(2, eqN('aero_liner'));
  P.hp -= d; P.lh = S.t;
  if (P.hp <= 0) {
    const ty = S.dg.ty;
    fx.push({ x: P.x, y: P.y, t: 0, c: '#d07a2a' });
    dgExit(true);
    toast(raw && ty === 'works' ? 'The ammonia was too much. You black out, and a rescue party drags you clear and back to the landing site.' : raw && ty === 'lava' ? 'The heat was too much. A rescue party hauls you out of the tube and you wake up back at the landing site.' : raw && ty === 'ice' ? 'The cold was too much. A rescue party hauls you out of the ice and you wake up back at the landing site.' : 'The crawlers got you underground. A rescue party hauls you out and you wake up back at the landing site.', true);
  }
}
const DG_LR = [['motor', 1], ['jerrycan', 2], ['silver', 3], ['black_powder', 4], ['plate', 12], ['cylinder', 2], ['drill_bit', 1], ['carbide_insert', 2], ['powder_charge', 2], ['shell_vest', 1]];
function dgLoot(c, i) {
  const D = S.dg, rng = mulberry32(D.seed + i * 977), got = {}, t = c.t || 'cache';
  if (t === 'boss' && D.q.hp > 0) return toast(D.ty === 'works' ? 'The broodmother is still alive. Kill her before you crack the strongbox.' : 'The tyrant is still alive. Kill it before you crack the strongbox.', true);
  const add = (k, n) => { if (n > 0 && (ITEMS[k] || BUILD[k])) { give(k, n); got[k] = (got[k] || 0) + n; } };
  const pick = L => { const l = L.filter(([k]) => ITEMS[k] || BUILD[k]), [k, n] = l[Math.floor(rng() * l.length)]; add(k, n); };
  let msg = 'Old supply cache: ', ul = 0;
  if (t === 'cache') {
    add('sulfur', 6 + Math.floor(rng() * 10));
    if (D.ty === 'brim') add('sulfur', got.sulfur);
    if (D.ty === 'lava') add('pyrite_conc', 3 + Math.floor(rng() * 4));
    if (D.ty === 'ice') add('cassiterite', 3 + Math.floor(rng() * 4));
    add('crawler_shell', 2 + Math.floor(rng() * 4));
    add('cartridge', 2 + Math.floor(rng() * 3));
    const R = [['pt_gauze', 1], ['motor', 2], ['jerrycan', 3], ['gold', 2], ['silver', 4], ['black_powder', 4], ['plate', 15], ['cylinder', 3]];
    pick(R);
    if (D.ty === 'deep') pick(R);
    ul = rng() < 0.4;
  } else if (t === 'locker') {
    const wk = D.ty === 'works';
    msg = wk ? "Operator's locker: " : "Miner's locker: ";
    add('cartridge', 3 + Math.floor(rng() * 4));
    pick(wk ? DG_WR : DG_LR); pick(wk ? DG_WR : DG_LR);
    ul = rng() < 0.25;
  } else if (t === 'safe') {
    msg = D.ty === 'works' ? "Plant manager's safe: " : "Shift boss's safe: ";
    D.key = 1;
    add('gold', 3 + Math.floor(rng() * 3)); add('silver', 6);
    pick(D.ty === 'works' ? DG_WR : DG_LR);
    ul = 1;
  } else if (D.ty === 'works') {
    msg = 'Strongbox in the synthesis hall: ';
    add('fe_cat', 8); add('pt_gauze', 1); add('gold', 5); add('motor', 4); add('ap_cartridge', 20); add('respirator', 2);
    ul = 1;
  } else {
    msg = 'Strongbox in the pump hall: ';
    add('drill_bit', 4); add('carbide_insert', 6); add('gold', 5); add('motor', 4); add('ap_cartridge', 20);
    ul = 1;
  }
  D.oc.push(i);
  S.dgc = (S.dgc || 0) + 1;
  toast(msg + Object.keys(got).map(k => got[k] + ' ' + nm(k)).join(', '));
  if (t === 'safe') toast(D.ty === 'works' ? 'Behind the shift logs hangs a key tagged SYNTHESIS HALL. The gate at the east end of the plant will open now.' : 'Under the shift reports lies a brass key tagged PUMP HALL. The blast door at the end of the east roadway will open now.');
  if (ul) { const r = unlockRandom(); if (r) toast(`${t === 'cache' ? 'A waterlogged lab notebook in the cache' : D.ty === 'works' ? 'A plant operating manual among the papers' : 'A mine assay book among the papers'}: ${r.n} (${BUILD[r.b].n}) unlocked`); }
  renderHotbar();
}
function dgDoor(D, G) {
  if (!G.door || G.door.every(k => D.mv[k])) return false;
  if (!G.door.some(k => { const x = k % G.N, y = (k - x) / G.N; return Math.hypot(x + 0.5 - D.px, y + 0.5 - D.py) < 2.2; })) return false;
  if (!D.key) { toast(D.ty === 'works' ? 'A steel gate across the synthesis hall, chained and padlocked. The plant manager will have had the key.' : 'A steel blast door, chained and padlocked. The shift boss will have had the key.', true); return true; }
  for (const k of G.door) D.mv[k] = 1;
  D.ff = null;
  toast(D.ty === 'works' ? 'The key turns and the gate rolls back on its rusted track. Under the cracked floor of the hall something heavy is moving.' : 'The key turns, the chains drop and the blast door grinds open. Something huge shifts in the dark beyond.', true);
  return true;
}
function dgValve(D, G, idx) {
  if (!G.valves || !G.valves.length) return false;
  D.vc = D.vc || [];
  const i = idx != null ? idx : G.valves.findIndex((v, j) => !D.vc.includes(j) && Math.hypot(v.x + 0.5 - D.px, v.y + 0.5 - D.py) < 1.8);
  if (i < 0 || D.vc.includes(i)) return false;
  D.vc.push(i); S.vlv = (S.vlv || 0) + 1;
  toast(`You heave the handwheel round until the valve seats. The hiss stops and the ammonia in the ${WORKS_RN[G.rooms[G.valves[i].r].k].toLowerCase()} starts to clear.`);
  return true;
}
function dgUse() {
  const D = S.dg, G = dgGrid();
  if (Math.hypot(D.px - G.ex - 0.5, D.py - G.ey - 0.5) < 2) return dgExit(false);
  const i = G.caches.findIndex((c, k) => !D.oc.includes(k) && Math.hypot(c.x + 0.5 - D.px, c.y + 0.5 - D.py) < 1.8);
  if (i >= 0) return dgLoot(G.caches[i], i);
  if (dgDoor(D, G)) return;
  if (dgValve(D, G)) return;
  toast(D.ty === 'works' ? 'Walk back to the gate to leave, or stand next to a locker, a red valve or the hall gate.' : D.ty === 'mine' ? 'Walk back to the cage to ride up, or stand next to a locker or the blast door.' : 'Walk back to the rope under the shaft to climb out, or stand next to a supply cache to open it.', true);
}
function dgClick(fx, fy) {
  const D = S.dg, G = dgGrid(), X = Math.floor(fx), Y = Math.floor(fy), k = Y * G.N + X;
  if (Math.hypot(G.ex + 0.5 - fx, G.ey + 0.5 - fy) < 1.2) { if (Math.hypot(D.px - G.ex - 0.5, D.py - G.ey - 0.5) < 2.5) return dgExit(false); return toast(D.ty === 'works' ? 'Walk up to the gate first.' : D.ty === 'mine' ? 'Walk into the cage first.' : 'Walk up to the rope first.', true); }
  const ci = G.caches.findIndex(c => c.x === X && c.y === Y);
  if (ci >= 0) {
    if (D.oc.includes(ci)) return toast('Already emptied.', true);
    if (Math.hypot(X + 0.5 - D.px, Y + 0.5 - D.py) > 2.2) return toast(`Walk up to the ${G.caches[ci].t === 'locker' ? 'locker' : G.caches[ci].t === 'safe' ? 'safe' : G.caches[ci].t === 'boss' ? 'strongbox' : 'cache'} first.`, true);
    return dgLoot(G.caches[ci], ci);
  }
  if (G.door && G.door.includes(k) && !D.mv[k]) { if (!dgDoor(D, G)) toast(D.ty === 'works' ? 'Walk up to the hall gate first.' : 'Walk up to the blast door first.', true); return; }
  const vi = G.valves ? G.valves.findIndex(v => v.x === X && v.y === Y) : -1;
  if (vi >= 0) {
    if ((D.vc || []).includes(vi)) return toast('That valve is already shut.', true);
    if (Math.hypot(X + 0.5 - D.px, Y + 0.5 - D.py) > 2.2) return toast('Walk up to the valve first.', true);
    dgValve(D, G, vi); return;
  }
  if (dgSolid(fx, fy) && X > 0 && Y > 0 && X < G.N - 1 && Y < G.N - 1) {
    if (D.ty === 'works') return toast(G.deco.has(k) ? 'Plant equipment, bolted down and rusted solid. Leave it.' : 'Reinforced concrete. You cannot dig through it.', true);
    if (D.ty === 'mine') return toast(G.deco.has(k) ? 'Rusted mine gear, bolted down. Leave it.' : 'Shotcrete over steel mesh. You cannot dig through it.', true);
    if (Math.hypot(X + 0.5 - D.px, Y + 0.5 - D.py) > MINE_REACH) return toast('Too far to dig. Walk up to the rock.', true);
    dgMine = { k: Y * G.N + X, p: 0 };
  }
}
function dgShoot() {
  const P = S.pl, D = S.dg;
  if (P.cd > 0) return;
  const Q = D.q, list = Q.hp > 0 && !Q.sub ? D.bugs.concat([Q]) : D.bugs, see = b => dgSee(D.px, D.py, b.x, b.y);
  let r = wpnShot(D.px, D.py, list, null, see, 1, b => b.k >= 2 || b === Q);
  if (!r && D.eggs && D.eggs.length) r = wpnShot(D.px, D.py, D.eggs, null, see, 1, () => false);
  if (!r) return;
  for (const b of r.hits) { b.aw = 1; if (b !== Q && !b.egg && b.hp <= 0) S.pk = (S.pk || 0) + 1; }
}
function dgSlide(dt, mx, my, G) {
  const P = S.pl, D = S.dg, l = Math.hypot(mx, my), v = PL_V * 0.9 * (D.chill > 0 ? 0.6 : 1), on = G.ice.has(Math.floor(D.py) * G.N + Math.floor(D.px));
  let vx = D.vx || 0, vy = D.vy || 0;
  const tx = l ? mx / l * v : 0, ty = l ? my / l * v : 0;
  if (on) { const a = Math.min(1, dt * 1.6); vx += (tx - vx) * a; vy += (ty - vy) * a; } else { vx = tx; vy = ty; }
  if (Math.hypot(vx, vy) < 0.05) { D.vx = D.vy = 0; return false; }
  let left = dt;
  while (left > 1e-6) {
    const h = Math.min(0.04, left); left -= h;
    const nx = D.px + vx * h, ny = D.py + vy * h;
    if (dgFree(nx, ny, PL_R)) { D.px = nx; D.py = ny; }
    else if (dgFree(nx, D.py, PL_R)) { D.px = nx; vy = 0; }
    else if (dgFree(D.px, ny, PL_R)) { D.py = ny; vx = 0; }
    else { vx = 0; vy = 0; }
  }
  D.vx = vx; D.vy = vy;
  if (l && S.t - (P.sh || -9) > 0.4) P.f = Math.atan2(my, mx);
  if (l) P.wk += dt * Math.hypot(vx, vy) * 2.4;
  P.mv = true;
  return true;
}
function dgMove(dt, mx, my) {
  const P = S.pl, D = S.dg;
  P.mv = false;
  if (!(P.dead > 0) && D.ty === 'ice') return dgSlide(dt, mx, my, dgGrid());
  if (P.dead > 0 || !(mx || my)) return false;
  const l = Math.hypot(mx, my), v = PL_V * 0.9;
  let left = dt;
  while (left > 1e-6) {
    const h = Math.min(0.04, left); left -= h;
    const nx = D.px + mx / l * v * h, ny = D.py + my / l * v * h;
    if (dgFree(nx, ny, PL_R)) { D.px = nx; D.py = ny; }
    else if (dgFree(nx, D.py, PL_R)) D.px = nx;
    else if (dgFree(D.px, ny, PL_R)) D.py = ny;
  }
  if (S.t - (P.sh || -9) > 0.4) P.f = Math.atan2(my, mx);
  P.wk += dt * v * 2.4; P.mv = true;
  return true;
}
function dgSpawnAt(x, y, k) {
  const ev = 1 + 2 * S.evo, mhp = Math.round(30 * ev * (1 + 1.2 * gearT()) * BUGK[k].hp), a = Math.random() * 7;
  const b = { x: x + Math.cos(a) * 1.2, y: y + Math.sin(a) * 1.2, hp: mhp, mhp, a, ph: Math.random() * 7, aw: 1, cd: 0 };
  if (!dgFree(b.x, b.y, 0.2)) { b.x = x; b.y = y; }
  if (k) b.k = k;
  S.dg.bugs.push(b);
}
function dgStep(D, ff, N, b, v, r) {
  const fd = ff ? ff[Math.floor(b.y) * N + Math.floor(b.x)] : -1;
  let tx = D.px, ty = D.py;
  if (!(Math.hypot(D.px - b.x, D.py - b.y) < 1.5 && dgSee(b.x, b.y, D.px, D.py)) && fd > 0) {
    const x = Math.floor(b.x), y = Math.floor(b.y);
    let bv = fd;
    for (const [ii, jj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) { const w = ff[(y + jj) * N + x + ii]; if (w >= 0 && w < bv && !(ii && jj && (dgSolid(x + ii, y) || dgSolid(x, y + jj)))) { bv = w; tx = x + ii + 0.5; ty = y + jj + 0.5; } }
  }
  const dx = tx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy);
  if (d < 1e-3) return;
  b.a = Math.atan2(dy, dx);
  const nx = b.x + dx / d * v, ny = b.y + dy / d * v;
  if (dgFree(nx, ny, r)) { b.x = nx; b.y = ny; } else if (dgFree(nx, b.y, r)) b.x = nx; else if (dgFree(b.x, ny, r)) b.y = ny;
}
function tyrantTick(D, Q, pd0, dmg) {
  const pd = Math.hypot(D.px - Q.x, D.py - Q.y), see = dgSee(Q.x, Q.y, D.px, D.py);
  if (!Q.aw) { if (pd < 10 && see) { Q.aw = 1; toast('The brood tyrant rears up, plated like ten brutes. It charges in straight lines: sidestep, and let it slam into the walls.', true); } return; }
  if (pd0) return;
  Q.cd -= DT; Q.sp -= DT; Q.rg = (Q.rg ?? 4.5) - DT;
  if (Q.st > 0) { Q.st -= DT; return; }
  if (Q.wu > 0) { Q.wu -= DT; if (Q.wu <= 0) Q.ch = 1.6; return; }
  if (Q.ch > 0) {
    Q.ch -= DT;
    const v = 8 * DT, nx = Q.x + Math.cos(Q.a) * v, ny = Q.y + Math.sin(Q.a) * v;
    if (!dgFree(nx, ny, 0.45)) { Q.ch = 0; Q.st = 1.4; dfx.push({ x: Q.x + Math.cos(Q.a) * 0.8, y: Q.y + Math.sin(Q.a) * 0.8, t: 0.2, c: '#b0a090' }); return; }
    Q.x = nx; Q.y = ny;
    if (!Q.hit && Math.hypot(D.px - Q.x, D.py - Q.y) < 1.3) { Q.hit = 1; dgHurt(40 * (1 + S.evo)); }
    return;
  }
  Q.a = Math.atan2(D.py - Q.y, D.px - Q.x);
  if (Q.sp <= 0 && D.bugs.length < 40) { Q.sp = 12; for (let k = 0; k < 3; k++) dgSpawnAt(Q.x, Q.y, k === 2 && S.evo > 0.3 ? 2 : k === 1 ? 1 : 0); }
  if (Q.hp < Q.mhp * 0.5 && Q.rg <= 0 && see) { Q.rg = 4.5; for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; D.sp.push({ x: Q.x, y: Q.y, tx: Q.x + Math.cos(a) * 9, ty: Q.y + Math.sin(a) * 9, d: 14 * (1 + S.evo), q: 1 }); } }
  if (Q.cd <= 0 && see && pd > 2.5 && pd < 10) { Q.cd = 3.5; Q.wu = 0.6; Q.hit = 0; return; }
  if (pd < 1.6) { dgHurt(dmg * 5); return; }
  dgStep(D, D.ff, dgGrid().N, Q, BUG_V * DT * 0.75, 0.45);
}
function broodTick(D, Q, pd0, dmg) {
  const G = dgGrid(), N = G.N, pd = Math.hypot(D.px - Q.x, D.py - Q.y);
  if (!Q.aw) { if (pd < 10 && dgSee(Q.x, Q.y, D.px, D.py)) { Q.aw = 1; Q.sub = 0; Q.up = 3; toast('The broodmother heaves up out of the cracked floor of the synthesis hall, scattering concrete. She dives back under and comes up beneath you: watch for the red ring and step out of it. She can only be hurt while she is above the floor.', true); } return; }
  if (pd0) return;
  Q.sp -= DT;
  if (Q.sp <= 0 && D.bugs.length < 40) { Q.sp = 10; for (let k = 0; k < 3; k++) dgSpawnAt(Q.x, Q.y, k === 2 && S.evo > 0.3 ? 2 : k === 1 ? 1 : 0); }
  if (Q.up > 0) {
    Q.up -= DT; Q.sub = 0;
    Q.a = Math.atan2(D.py - Q.y, D.px - Q.x);
    if (pd < 1.6) dgHurt(dmg * 5);
    if (Q.up <= 0) { Q.sub = 1; Q.dv = 2.2; dfx.push({ x: Q.x, y: Q.y, t: 0.2, c: '#a09888' }); }
    return;
  }
  Q.sub = 1;
  if (Q.dv > 0) {
    Q.dv -= DT;
    if (Q.dv <= 0) {
      const inH = G.rm[Math.floor(D.py) * N + Math.floor(D.px)] === G.boss && !dgSolid(D.px, D.py);
      Q.gx = inH ? D.px : G.qx + 0.5; Q.gy = inH ? D.py : G.qy + 0.5; Q.wu = 1.2;
    }
    return;
  }
  if (Q.wu > 0) {
    Q.wu -= DT;
    if (Q.wu <= 0) {
      Q.x = Q.gx; Q.y = Q.gy; Q.sub = 0; Q.up = 3.5;
      dfx.push({ x: Q.x, y: Q.y, t: 0, c: '#b0a890' });
      if (Math.hypot(D.px - Q.x, D.py - Q.y) < 1.6) { dgHurt(35 * (1 + S.evo)); if (!S.dg) return; }
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + Math.random() * 0.3; D.sp.push({ x: Q.x, y: Q.y, tx: Q.x + Math.cos(a) * 6, ty: Q.y + Math.sin(a) * 6, d: 12 * (1 + S.evo), q: 1 }); }
    }
    return;
  }
  Q.dv = 2.2;
}
function dgTick() {
  const D = S.dg, P = S.pl, G = dgGrid(), N = G.N;
  D.t += DT;
  if (D.chill > 0) D.chill -= DT;
  D.eggs = D.eggs || []; D.eg = D.eg || [];
  P.cd = Math.max(0, (P.cd || 0) - DT);
  if (S.t - (P.lh ?? -99) > 8) P.hp = Math.min(PL_HP, P.hp + 8 * DT);
  if (keys[' ']) dgShoot();
  if (!D.ff || S.tk % 10 === 0) dgFlow();
  if (dgMine) {
    const X = dgMine.k % N, Y = Math.floor(dgMine.k / N);
    if (!mouse.l || !dgSolid(X, Y) || Math.hypot(X + 0.5 - D.px, Y + 0.5 - D.py) > MINE_REACH) dgMine = null;
    else if ((dgMine.p += DT / (G.vein.has(dgMine.k) ? 1.4 : 2.2)) >= 1) {
      D.mv[dgMine.k] = 1;
      const it = G.vein.get(dgMine.k);
      if (it) { const n = it === 'sulfur' ? 6 : 4; give(it, n); S.made[it] = (S.made[it] || 0) + n; toast(`Dug out ${n} ${nm(it)} from the vein`); }
      else if (D.ty !== 'lava' && D.ty !== 'ice') give('limestone', 1);
      dgMine = null; D.ff = null;
    }
  }
  const sp = BUG_V * DT * 1.15, dmg = 6 * (1 + S.evo) * (1 + gearT()) * DT, ff = D.ff, pd0 = P.dead > 0;
  const pk = Math.floor(D.py) * N + Math.floor(D.px);
  if (!pd0 && G.pool.has(pk)) {
    if (D.ty === 'lava') { if (!D.pt) { D.pt = 1; toast('Lava! Basalt melt at over 1000°C sets your boots and clothes smouldering. Get out of it now.', true); } dgHurt(30 * DT, 1); }
    else if (D.ty === 'ice') { if (!D.pt) { D.pt = 1; toast('Meltwater at 0°C. It numbs your legs and soaks your clothes: you stay chilled and slow until you warm up.', true); } D.chill = 4; dgHurt(5 * DT, 1); }
    else {
      if (!D.pt) { D.pt = 1; toast('Sulfuric acid! The pool eats through your boots. Get out of it.', true); }
      dgHurt(16 * DT);
    }
    if (!S.dg) return;
  }
  if (D.fire && D.fire.length) {
    for (let i = D.fire.length - 1; i >= 0; i--) {
      const f = D.fire[i];
      f.t -= DT;
      if (f.t <= 0) { D.fire.splice(i, 1); continue; }
      if (!pd0 && Math.hypot(D.px - f.x, D.py - f.y) < 0.6) { dgHurt(14 * DT, 1); if (!S.dg) return; }
    }
  }
  if (G.leak.size && !pd0 && G.leak.has(G.rm[pk]) && !G.valves.some((v, i) => v.r === G.rm[pk] && (D.vc || []).includes(i))) {
    if ((S.inv.respirator || 0) > 0) {
      if (!D.gt) { D.gt = 1; toast('Ammonia. The respirator cartridges catch most of it, but your eyes still sting. Each respirator lasts about 20 seconds in the gas.', true); }
      dgHurt(2 * DT, 1);
      D.rt = (D.rt || 0) + DT;
      if (D.rt >= 20) { D.rt = 0; if (--S.inv.respirator <= 0) delete S.inv.respirator; renderHotbar(); toast(S.inv.respirator ? 'Your cartridges are saturated. You swap to a fresh respirator.' : 'Your last respirator is saturated. Get out of the gas.', true); }
    } else {
      if (!D.gn) { D.gn = 1; toast('Ammonia! It burns your eyes, throat and lungs. Get out of the room, close the red valve on the wall with F, or come back wearing an ammonia respirator.', true); }
      dgHurt(10 * DT, 1);
    }
    if (!S.dg) return;
  }
  for (let i = D.eggs.length - 1; i >= 0; i--) {
    const o = D.eggs[i];
    if (o.hp <= 0) { D.eggs.splice(i, 1); D.eg.push(o.i); S.egk = (S.egk || 0) + 1; give('crawler_shell', 2); dfx.push({ x: o.x, y: o.y, t: 0, c: '#e0d890' }); continue; }
    if (pd0 || D.bugs.length >= 40) continue;
    if (Math.hypot(D.px - o.x, D.py - o.y) < 9 && dgSee(o.x, o.y, D.px, D.py)) { o.cd -= DT; if (o.cd <= 0) { o.cd = 8; o.ht = D.t; dgSpawnAt(o.x, o.y, Math.random() < 0.25 ? 1 : 0); } }
  }
  for (let i = D.bugs.length - 1; i >= 0; i--) {
    const b = D.bugs[i];
    if (b.hp <= 0) { D.bugs.splice(i, 1); S.kills = (S.kills || 0) + 1; dfx.push({ x: b.x, y: b.y, t: 0.5, c: '#a0c040' }); continue; }
    const K = BUGK[b.k || 0], pd = Math.hypot(D.px - b.x, D.py - b.y), bi = Math.floor(b.y) * N + Math.floor(b.x), fd = ff ? ff[bi] : -1;
    if (!b.aw && (pd < 6 || (fd >= 0 && fd < 9 && dgSee(b.x, b.y, D.px, D.py)))) b.aw = 1;
    if (!b.aw || pd0) { b.a += Math.sin(D.t + b.ph) * 0.02; continue; }
    if (pd < 0.7 && !K.rng) { b.a = Math.atan2(D.py - b.y, D.px - b.x); b.chew = 1; dgHurt(dmg * 2 * K.dm); if (!S.dg) return; continue; }
    b.chew = 0;
    if (K.rng && pd < K.rng && dgSee(b.x, b.y, D.px, D.py)) {
      b.a = Math.atan2(D.py - b.y, D.px - b.x); b.cd = (b.cd || 0) - DT;
      if (b.cd <= 0) { b.cd = 1.6; D.sp.push({ x: b.x, y: b.y, tx: D.px, ty: D.py, d: 12 * (1 + S.evo) * (1 + gearT()) }); }
      continue;
    }
    dgStep(D, ff, N, b, sp * K.v, 0.18);
  }
  const Q = D.q;
  if (Q.hp > 0) {
    if (Q.ty === 'tyrant') { tyrantTick(D, Q, pd0, dmg); if (!S.dg) return; }
    else if (Q.ty === 'brood') { broodTick(D, Q, pd0, dmg); if (!S.dg) return; }
    else {
      const pd = Math.hypot(D.px - Q.x, D.py - Q.y);
      if (!Q.aw && pd < 9 && dgSee(Q.x, Q.y, D.px, D.py)) { Q.aw = 1; toast(Q.ty === 'ember' ? 'The ember queen stirs, glowing like a coal from the fumarole she sleeps on. Her spit burns, and it keeps burning on the floor where it lands.' : Q.ty === 'frost' ? 'The frost queen uncurls from the ice. Her spit is a slush of meltwater that chills you and slows you down.' : 'The burrow queen stirs. She is calling her brood.', true); }
      if (Q.aw && !pd0) {
        Q.a = Math.atan2(D.py - Q.y, D.px - Q.x);
        Q.sp -= DT; Q.cd -= DT;
        if (Q.sp <= 0 && D.bugs.length < 40) { Q.sp = 7; for (let k = 0; k < 3; k++) dgSpawnAt(Q.x, Q.y, k === 2 && S.evo > 0.3 ? 2 : k === 1 ? 1 : 0); }
        if (Q.cd <= 0 && pd < 11 && dgSee(Q.x, Q.y, D.px, D.py)) { Q.cd = 2.2; for (const o of Q.ty === 'ember' ? [-0.5, -0.25, 0, 0.25, 0.5] : [-0.25, 0, 0.25]) { const a = Q.a + o, s = { x: Q.x, y: Q.y, tx: Q.x + Math.cos(a) * pd, ty: Q.y + Math.sin(a) * pd, d: (Q.ty === 'ember' ? 16 : 22) * (1 + S.evo), q: 1 }; if (Q.ty === 'ember') s.f = 1; if (Q.ty === 'frost') s.ch = 1; D.sp.push(s); } }
        if (pd < 1.6) dgHurt(dmg * 5);
        if (!S.dg) return;
      }
    }
  } else if (!Q.dead) {
    Q.dead = 1;
    if (Q.ty === 'tyrant') {
      S.tyk = (S.tyk || 0) + 1;
      give('queen_carapace', 3); give('crawler_shell', 20); give('gold', 6); give('pt_gauze', 1);
      dfx.push({ x: Q.x, y: Q.y, t: 0, c: '#ff6040' });
      toast('The brood tyrant is dead: 3 queen carapace, 20 crawler shell, 6 gold and a pack of platinum gauze it had dragged into its nest. The strongbox behind it is yours.');
      for (let k = 0; k < 2; k++) { const r = unlockRandom(); if (r) toast(`The pump hall log book: ${r.n} (${BUILD[r.b].n}) unlocked`); }
    } else if (Q.ty === 'brood') {
      S.wkk = (S.wkk || 0) + 1; Q.sub = 0;
      give('queen_carapace', 3); give('crawler_shell', 20); give('gold', 6); give('fe_cat', 4);
      dfx.push({ x: Q.x, y: Q.y, t: 0, c: '#d0d8a0' });
      toast('The broodmother is dead: 3 queen carapace, 20 crawler shell, 6 gold and 4 fused iron catalyst she had dragged out of the converter. The strongbox in the hall is yours.');
      for (let k = 0; k < 2; k++) { const r = unlockRandom(); if (r) toast(`The synthesis hall log book: ${r.n} (${BUILD[r.b].n}) unlocked`); }
    } else if (Q.ty === 'ember' || Q.ty === 'frost') {
      const em = Q.ty === 'ember';
      if (em) S.lvk = (S.lvk || 0) + 1; else S.ick = (S.ick || 0) + 1;
      give('queen_carapace', 2); give('crawler_shell', 12); give('gold', 4);
      if (em) { give('sulfur', 40); give('gypsum', 10); } else { give('cassiterite', 20); give('wolframite', 12); }
      dfx.push({ x: Q.x, y: Q.y, t: 0, c: em ? '#ff8030' : '#c0f0ff' });
      toast(em ? 'The ember queen is dead: 2 queen carapace, 12 crawler shell, 4 gold, and 40 sulfur and 10 gypsum from the fumarole crust she nested on. Empty every cache and the roof will come down once you climb out.' : 'The frost queen is dead: 2 queen carapace, 12 crawler shell, 4 gold, and 20 cassiterite and 12 wolframite from the vein she nested in. Empty every cache and the channel will flood once you climb out.');
      const r = unlockRandom(); if (r) toast(`${em ? 'A volcanologist\'s field book' : 'A glaciologist\'s field book'} lies in her nest: ${r.n} (${BUILD[r.b].n}) unlocked`);
    } else {
      S.qk = (S.qk || 0) + 1;
      const dp = D.ty === 'deep';
      give('queen_carapace', dp ? 2 : 1); give('crawler_shell', 12); give('sulfur', 30); give('gold', dp ? 6 : 3);
      if (dp) give('ap_cartridge', 10);
      dfx.push({ x: Q.x, y: Q.y, t: 0, c: '#c080ff' });
      toast(dp ? 'The deep queen is dead: 2 queen carapace, 12 crawler shell, 30 sulfur, 6 gold and 10 AP cartridges from a lost patrol. Without her the tunnels will fall in once you climb out.' : 'The burrow queen is dead: queen carapace, 12 crawler shell, 30 sulfur and 3 gold. Without her the tunnels will fall in once you climb out.');
      const r = unlockRandom(); if (r) toast(`Her chamber holds the bones of an old survey team and their notebook: ${r.n} (${BUILD[r.b].n}) unlocked`);
    }
    renderHotbar();
  }
  for (let i = D.sp.length - 1; i >= 0; i--) {
    const s = D.sp[i], dx = s.tx - s.x, dy = s.ty - s.y, d = Math.hypot(dx, dy), st = 7 * DT;
    s.t = (s.t || 0) + DT;
    if (d > st && s.t < 3 && !dgSolid(s.x + dx / d * st, s.y + dy / d * st)) { s.x += dx / d * st; s.y += dy / d * st; if (s.q && Math.hypot(D.px - s.x, D.py - s.y) < 0.5) { D.sp.splice(i, 1); if (s.ch) D.chill = 3; if (s.f && (D.fire = D.fire || []).length < 30) D.fire.push({ x: s.x, y: s.y, t: 5 }); dgHurt(s.d); if (!S.dg) return; } continue; }
    D.sp.splice(i, 1);
    dfx.push({ x: s.x, y: s.y, t: 0.35, c: s.f ? '#ff8030' : s.ch ? '#b0e8ff' : '#9ad040' });
    if (s.f && !dgSolid(s.x, s.y) && (D.fire = D.fire || []).length < 30) D.fire.push({ x: s.x, y: s.y, t: 5 });
    if (Math.hypot(D.px - s.x, D.py - s.y) < 0.8) { if (s.ch) D.chill = 3; dgHurt(s.d); if (!S.dg) return; }
  }
}
function dgPos(sx, sy) {
  const w = cv.clientWidth, h = cv.clientHeight;
  return { fx: (sx - w / 2) / dgcam.z + dgcam.x, fy: (sy - h / 2) / dgcam.z + dgcam.y };
}
function burrowAt(rng, x, y) {
  if (!ruinSpot(x, y) || !farFromBase(x, y, 20) || lists().ruin.some(o => Math.hypot(o.x - x, o.y - y) < 24)) return false;
  addEnt(makeEnt('burrow', x, y, 0));
  for (let q = 0, n = 0; q < 40 && n < 2; q++) {
    const b = rng() * Math.PI * 2, r = 4 + rng() * 3, hx = Math.round(x + Math.cos(b) * r), hy = Math.round(y + Math.sin(b) * r);
    if (hiveSpot(hx, hy)) { addHive(hx, hy); n++; }
  }
  return true;
}
function burrowRegion(rx, ry) {
  if (!S.gen || !S.gen.hives) return;
  const rng = mulberry32((S.seed + 9191 + Math.imul(rx, 977) + Math.imul(ry, 31337)) >>> 0), X0 = rx * RG, Y0 = ry * RG;
  if (rng() > 0.3 * dgnMul(S.gen)) return;
  for (let k = 0; k < 60; k++) {
    const x = Math.floor(X0 + 6 + rng() * (RG - 12)), y = Math.floor(Y0 + 6 + rng() * (RG - 12));
    if (Math.hypot(x - W / 2, y - H / 2) < 70) continue;
    if (burrowAt(rng, x, y)) break;
  }
}
function spawnBurrows() {
  const g = S.gen, big = g && !g.legacy;
  S.bv = 1;
  if (big && !g.hives) return;
  const rng = mulberry32(S.seed + 9191), max = Math.round((big ? Math.max(2, Math.round(1.4 * W * H / 25600)) : 2) * dgnMul(g));
  for (let k = 0, n = 0; k < 800 && n < max; k++) {
    const a = rng() * Math.PI * 2, d = big ? 70 + rng() * (W * 0.6 - 70) : 56 + rng() * 16;
    if (burrowAt(rng, Math.round(W / 2 + Math.cos(a) * d), Math.round(H / 2 + Math.sin(a) * d))) n++;
  }
}
function mineAt(rng, x, y) {
  if (!ruinSpot(x, y) || !farFromBase(x, y, 24) || lists().ruin.some(o => Math.hypot(o.x - x, o.y - y) < 30)) return false;
  addEnt(makeEnt('infested', x, y, 0));
  for (let q = 0, n = 0; q < 60 && n < (S.gen && S.gen.legacy ? 0 : 3); q++) {
    const b = rng() * Math.PI * 2, r = 5 + rng() * 4, hx = Math.round(x + 1 + Math.cos(b) * r), hy = Math.round(y + 1 + Math.sin(b) * r);
    if (hiveSpot(hx, hy)) { addHive(hx, hy); n++; }
  }
  return true;
}
function mineRegion(rx, ry) {
  if (!S.gen || !S.gen.hives) return;
  const rng = mulberry32((S.seed + 6161 + Math.imul(rx, 1031) + Math.imul(ry, 49157)) >>> 0), X0 = rx * RG, Y0 = ry * RG;
  if (rng() > 0.14 * dgnMul(S.gen)) return;
  for (let k = 0; k < 60; k++) {
    const x = Math.floor(X0 + 6 + rng() * (RG - 14)), y = Math.floor(Y0 + 6 + rng() * (RG - 14));
    if (Math.hypot(x - W / 2, y - H / 2) < 90) continue;
    if (mineAt(rng, x, y)) break;
  }
}
function spawnMines() {
  const g = S.gen, big = g && !g.legacy;
  S.iv = 1;
  if (big && !g.hives) return;
  if (rgd) { const nR = W / RG; for (let i = 0; i < rgd.length; i++) if (rgd[i]) mineRegion(i % nR, Math.floor(i / nR)); return; }
  const rng = mulberry32(S.seed + 6161), max = Math.round((big ? Math.max(1, Math.round(0.6 * W * H / 25600)) : 1) * dgnMul(g));
  for (let k = 0, n = 0; k < 800 && n < max; k++) {
    const a = rng() * Math.PI * 2, d = big ? 90 + rng() * (W * 0.6 - 90) : 60 + rng() * 14;
    if (mineAt(rng, Math.round(W / 2 + Math.cos(a) * d), Math.round(H / 2 + Math.sin(a) * d))) n++;
  }
}
const XTY = ['lavatube', 'icecave', 'nh3works'];
function terNear(x, y, r, t) { let n = 0; for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { const X = x + i, Y = y + j; if (X >= 0 && Y >= 0 && X < W && Y < H && terrain[Y * W + X] === t) n++; } return n; }
function xdgAt(rng, t, x, y) {
  const B = BUILD[t], c = Math.floor(B.w / 2);
  if (!ruinSpot(x, y) || !farFromBase(x, y, 22) || lists().ruin.some(o => Math.hypot(o.x - x, o.y - y) < 26)) return false;
  if (t === 'lavatube' && terNear(x + c, y + c, 6, 4) < 6) return false;
  if (t === 'icecave' && terNear(x + c, y + c, 4, 7) < 20 && terNear(x + c, y + c, 5, 4) < 14) return false;
  addEnt(makeEnt(t, x, y, 0));
  const nh = S.gen && S.gen.legacy ? 0 : t === 'nh3works' ? 3 : 2;
  for (let q = 0, n = 0; q < 60 && n < nh; q++) {
    const b = rng() * Math.PI * 2, r = 5 + rng() * 4, hx = Math.round(x + c + Math.cos(b) * r), hy = Math.round(y + c + Math.sin(b) * r);
    if (hiveSpot(hx, hy)) { addHive(hx, hy); n++; }
  }
  return true;
}
function xdgRegion(rx, ry) {
  if (!S.gen || !S.gen.hives) return;
  const dm = dgnMul(S.gen), X0 = rx * RG, Y0 = ry * RG;
  XTY.forEach((t, ti) => {
    const rng = mulberry32((S.seed + 5353 + ti * 101 + Math.imul(rx, 7907) + Math.imul(ry, 65537)) >>> 0);
    if (rng() > [0.22, 0.22, 0.12][ti] * dm) return;
    for (let k = 0; k < 60; k++) {
      const x = Math.floor(X0 + 6 + rng() * (RG - 14)), y = Math.floor(Y0 + 6 + rng() * (RG - 14));
      if (Math.hypot(x - W / 2, y - H / 2) < [70, 70, 80][ti]) continue;
      if (xdgAt(rng, t, x, y)) break;
    }
  });
}
function spawnXdg() {
  const g = S.gen, big = g && !g.legacy;
  S.xv = 1;
  if (!big || !g.hives) return;
  if (rgd) { const nR = W / RG; for (let i = 0; i < rgd.length; i++) if (rgd[i]) xdgRegion(i % nR, Math.floor(i / nR)); return; }
  const dm = dgnMul(g);
  XTY.forEach((t, ti) => {
    const rng = mulberry32(S.seed + 5353 + ti * 101), max = Math.round(Math.max(1, [0.5, 0.5, 0.35][ti] * W * H / 25600) * dm), d0 = [60, 60, 80][ti];
    for (let k = 0, n = 0; k < 1500 && n < max; k++) {
      const a = rng() * Math.PI * 2, d = d0 + rng() * Math.max(10, W * 0.62 - d0);
      if (xdgAt(rng, t, Math.round(W / 2 + Math.cos(a) * d), Math.round(H / 2 + Math.sin(a) * d))) n++;
    }
  });
}
function drawLavaTube(e, x, y, w, h, z) {
  const cx = x + w / 2, cy = y + h / 2, now = performance.now() / 1000;
  ctx.fillStyle = 'rgba(30,24,22,0.55)'; ctx.beginPath(); ctx.ellipse(cx, cy + h * 0.04, w * 0.62, h * 0.52, 0, 0, 7); ctx.fill();
  for (let k = 0; k < 16; k++) {
    const a = k / 16 * Math.PI * 2 + hash(k, e.id, 4), r = w * (0.34 + 0.16 * hash(e.id, k, 6));
    ctx.fillStyle = k % 3 ? '#2e2624' : '#443632';
    ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.8, z * (0.2 + 0.14 * hash(k, e.id, 9)), z * (0.14 + 0.1 * hash(e.id, k, 2)), a, 0, 7); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(60,46,40,0.9)'; ctx.lineWidth = Math.max(1, z * 0.05);
  for (let k = 0; k < 5; k++) { const a = hash(e.id, k, 11) * 7; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * w * 0.3, cy + Math.sin(a) * h * 0.26); ctx.lineTo(cx + Math.cos(a) * w * 0.55, cy + Math.sin(a) * h * 0.48); ctx.stroke(); }
  const g = ctx.createRadialGradient(cx, cy, w * 0.03, cx, cy, w * 0.34);
  g.addColorStop(0, e.done ? '#2a2422' : '#3a0c04'); g.addColorStop(0.6, e.done ? '#2e2826' : '#140806'); g.addColorStop(1, '#2a2220');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, cy, w * 0.32, h * 0.26, 0, 0, 7); ctx.fill();
  if (e.done) { ctx.fillStyle = '#3a3230'; for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(cx + (hash(k, e.id, 1) - 0.5) * w * 0.4, cy + (hash(e.id, k, 1) - 0.5) * h * 0.3, z * 0.16, 0, 7); ctx.fill(); } return; }
  ctx.fillStyle = `rgba(255,110,40,${0.18 + 0.1 * Math.sin(now * 1.7 + e.id)})`; ctx.beginPath(); ctx.ellipse(cx, cy, w * 0.2, h * 0.14, 0, 0, 7); ctx.fill();
  if (z >= 10) for (let k = 0; k < 3; k++) {
    const ph = (now * 0.25 + k / 3) % 1;
    ctx.fillStyle = `rgba(230,220,200,${0.35 * (1 - ph)})`; ctx.beginPath(); ctx.arc(cx + Math.sin(now + k * 2) * w * 0.06, cy - ph * h * 0.7, z * (0.12 + ph * 0.3), 0, 7); ctx.fill();
  }
  ctx.fillStyle = '#e0c840'; for (let k = 0; k < 4; k++) { const a = hash(k, e.id, 21) * 7; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * w * 0.36, cy + Math.sin(a) * h * 0.3, z * 0.06, 0, 7); ctx.fill(); }
  ctx.strokeStyle = '#a07a4a'; ctx.lineWidth = Math.max(1, z * 0.05);
  ctx.beginPath(); ctx.moveTo(cx - w * 0.4, cy - h * 0.36); ctx.lineTo(cx - w * 0.08, cy - h * 0.02); ctx.stroke();
}
function drawIceCave(e, x, y, w, h, z) {
  const cx = x + w / 2, cy = y + h / 2, now = performance.now() / 1000;
  ctx.fillStyle = 'rgba(220,235,245,0.6)'; ctx.beginPath(); ctx.ellipse(cx, cy + h * 0.05, w * 0.62, h * 0.52, 0, 0, 7); ctx.fill();
  for (let k = 0; k < 12; k++) {
    const a = k / 12 * Math.PI * 2 + hash(k, e.id, 4), r = w * (0.36 + 0.12 * hash(e.id, k, 6));
    ctx.fillStyle = k % 2 ? '#c8dcea' : '#a8c4d8';
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.8 - z * 0.3); ctx.lineTo(cx + Math.cos(a + 0.25) * r, cy + Math.sin(a + 0.25) * r * 0.8); ctx.lineTo(cx + Math.cos(a - 0.25) * r, cy + Math.sin(a - 0.25) * r * 0.8); ctx.fill();
  }
  const g = ctx.createRadialGradient(cx, cy - h * 0.04, w * 0.03, cx, cy, w * 0.34);
  g.addColorStop(0, e.done ? '#8aa0b0' : '#0a1a2a'); g.addColorStop(0.65, e.done ? '#9ab0c0' : '#2a5a7a'); g.addColorStop(1, '#8ab8d4');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, cy, w * 0.34, h * 0.26, 0, Math.PI, 0); ctx.lineTo(cx + w * 0.34, cy + h * 0.16); ctx.lineTo(cx - w * 0.34, cy + h * 0.16); ctx.fill();
  if (e.done) { ctx.fillStyle = '#e8f0f6'; for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(cx + (hash(k, e.id, 1) - 0.5) * w * 0.5, cy + (hash(e.id, k, 1) - 0.3) * h * 0.2, z * 0.18, 0, 7); ctx.fill(); } return; }
  ctx.fillStyle = '#e8f4fa';
  for (let k = 0; k < 7; k++) { const xx = cx - w * 0.3 + k * w * 0.1, l = h * (0.06 + 0.08 * hash(k, e.id, 13)); ctx.beginPath(); ctx.moveTo(xx - z * 0.08, cy - h * 0.2); ctx.lineTo(xx + z * 0.08, cy - h * 0.2); ctx.lineTo(xx, cy - h * 0.2 + l); ctx.fill(); }
  ctx.fillStyle = `rgba(120,200,240,${0.25 + 0.12 * Math.sin(now * 1.3 + e.id)})`; ctx.fillRect(cx - w * 0.06, cy + h * 0.14, w * 0.12, h * 0.36);
  if (z >= 10) for (let k = 0; k < 3; k++) { const ph = (now * 0.5 + k / 3) % 1; ctx.fillStyle = `rgba(230,245,255,${0.5 * (1 - ph)})`; ctx.fillRect(cx - w * 0.04 + hash(k, e.id, 3) * w * 0.08, cy + h * (0.16 + ph * 0.3), z * 0.05, z * 0.1); }
}
function drawWorks(e, x, y, w, h, z) {
  const cx = x + w / 2, cy = y + h / 2, now = performance.now() / 1000;
  ctx.fillStyle = '#5a5e62'; ctx.fillRect(x + z * 0.08, y + z * 0.08, w - z * 0.16, h - z * 0.16);
  ctx.fillStyle = 'rgba(0,0,0,0.14)'; for (let q = 1; q < 3; q++) { ctx.fillRect(x + q * w / 3, y + z * 0.08, 1, h - z * 0.16); ctx.fillRect(x + z * 0.08, y + q * h / 3, w - z * 0.16, 1); }
  for (let k = 0; k < 5; k++) { ctx.fillStyle = 'rgba(90,60,40,0.3)'; ctx.beginPath(); ctx.arc(x + w * hash(k, e.id, 3), y + h * hash(e.id, k, 5), z * (0.2 + 0.2 * hash(k, k, e.id)), 0, 7); ctx.fill(); }
  ctx.fillStyle = '#d8dcd8'; ctx.beginPath(); ctx.arc(x + w * 0.3, y + h * 0.32, w * 0.2, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.arc(x + w * 0.34, y + h * 0.36, w * 0.17, 0, 7); ctx.fill();
  ctx.fillStyle = '#e8ece8'; ctx.beginPath(); ctx.arc(x + w * 0.28, y + h * 0.3, w * 0.15, 0, 7); ctx.fill();
  if (z >= 12) { ctx.fillStyle = '#3a5a8a'; ctx.font = `bold ${Math.round(z * 0.32)}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText('NH₃', x + w * 0.3, y + h * 0.35); ctx.textAlign = 'left'; }
  ctx.fillStyle = '#7a7e84'; ctx.fillRect(x + w * 0.58, y + h * 0.12, w * 0.12, h * 0.6); ctx.fillRect(x + w * 0.76, y + h * 0.22, w * 0.1, h * 0.5);
  ctx.fillStyle = '#9a4a30'; ctx.fillRect(x + w * 0.58, y + h * 0.12, w * 0.12, h * 0.05);
  ctx.strokeStyle = '#8a8e94'; ctx.lineWidth = Math.max(1, z * 0.08);
  ctx.beginPath(); ctx.moveTo(x + w * 0.42, y + h * 0.3); ctx.lineTo(x + w * 0.64, y + h * 0.3); ctx.moveTo(x + w * 0.64, y + h * 0.55); ctx.lineTo(x + w * 0.81, y + h * 0.55); ctx.moveTo(x + w * 0.1, y + h * 0.78); ctx.lineTo(x + w * 0.9, y + h * 0.78); ctx.stroke();
  if (e.done) { ctx.fillStyle = 'rgba(40,40,40,0.35)'; ctx.fillRect(x + w * 0.38, y + h * 0.62, w * 0.24, h * 0.3); return; }
  ctx.fillStyle = '#1a1a1a'; ctx.fillRect(x + w * 0.4, y + h * 0.64, w * 0.2, h * 0.28);
  ctx.strokeStyle = '#a0a4a8'; ctx.lineWidth = 1; ctx.beginPath(); for (let q = 1; q < 4; q++) { ctx.moveTo(x + w * (0.4 + q * 0.05), y + h * 0.64); ctx.lineTo(x + w * (0.4 + q * 0.05), y + h * 0.92); } ctx.stroke();
  if (z >= 10) for (let k = 0; k < 4; k++) { const ph = (now * 0.3 + k / 4) % 1; ctx.fillStyle = `rgba(230,240,230,${0.3 * (1 - ph)})`; ctx.beginPath(); ctx.arc(x + w * 0.28 + ph * w * 0.3, y + h * 0.18 - ph * h * 0.3, z * (0.15 + ph * 0.4), 0, 7); ctx.fill(); }
}
function drawInfested(e, x, y, w, h, z) {
  const cx = x + w / 2, cy = y + h / 2, now = performance.now() / 1000;
  ctx.fillStyle = '#6a6862'; ctx.fillRect(x + z * 0.1, y + z * 0.1, w - z * 0.2, h - z * 0.2);
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  for (let q = 1; q < 3; q++) { ctx.fillRect(x + q * w / 3, y + z * 0.1, 1, h - z * 0.2); ctx.fillRect(x + z * 0.1, y + q * h / 3, w - z * 0.2, 1); }
  for (let k = 0; k < 6; k++) { ctx.fillStyle = 'rgba(70,50,30,0.35)'; ctx.beginPath(); ctx.arc(x + w * hash(k, e.id, 3), y + h * hash(e.id, k, 5), z * (0.2 + 0.2 * hash(k, k, e.id)), 0, 7); ctx.fill(); }
  ctx.fillStyle = '#4a4844'; ctx.fillRect(cx - w * 0.26, cy - h * 0.2, w * 0.52, h * 0.46);
  if (e.done) {
    ctx.fillStyle = '#8a8880'; ctx.fillRect(cx - w * 0.22, cy - h * 0.16, w * 0.44, h * 0.38);
    ctx.strokeStyle = '#5a5850'; ctx.lineWidth = Math.max(1, z * 0.04); ctx.beginPath(); ctx.moveTo(cx - w * 0.22, cy - h * 0.16); ctx.lineTo(cx + w * 0.22, cy + h * 0.22); ctx.moveTo(cx + w * 0.22, cy - h * 0.16); ctx.lineTo(cx - w * 0.22, cy + h * 0.22); ctx.stroke();
    return;
  }
  ctx.fillStyle = '#050403'; ctx.fillRect(cx - w * 0.2, cy - h * 0.14, w * 0.4, h * 0.34);
  ctx.strokeStyle = 'rgba(120,120,110,0.5)'; ctx.lineWidth = 1; ctx.beginPath();
  for (let q = 1; q < 4; q++) { ctx.moveTo(cx - w * 0.2 + q * w * 0.1, cy - h * 0.14); ctx.lineTo(cx - w * 0.2 + q * w * 0.1, cy + h * 0.2); }
  ctx.stroke();
  const L = cx - w * 0.34, R = cx + w * 0.34, T = y - h * 0.32, B = cy + h * 0.28;
  ctx.strokeStyle = '#8a4a2a'; ctx.lineWidth = Math.max(2, z * 0.12);
  ctx.beginPath(); ctx.moveTo(L, B); ctx.lineTo(cx - w * 0.06, T); ctx.lineTo(cx + w * 0.06, T); ctx.lineTo(R, B); ctx.stroke();
  ctx.lineWidth = Math.max(1, z * 0.06); ctx.strokeStyle = '#6a3a22';
  ctx.beginPath();
  for (let q = 1; q < 4; q++) { const f = q / 4, yy = B + (T - B) * f, xl = L + (cx - w * 0.06 - L) * f, xr = R + (cx + w * 0.06 - R) * f; ctx.moveTo(xl, yy); ctx.lineTo(xr, yy); if (q < 3) { const f2 = (q + 1) / 4, y2 = B + (T - B) * f2; ctx.moveTo(xl, yy); ctx.lineTo(R + (cx + w * 0.06 - R) * f2, y2); } }
  ctx.moveTo(R, B); ctx.lineTo(R + w * 0.2, B + h * 0.15);
  ctx.stroke();
  const a = now * 0.3;
  ctx.strokeStyle = '#a0a098'; ctx.lineWidth = Math.max(1, z * 0.07);
  ctx.beginPath(); ctx.arc(cx, T, w * 0.12, 0, 7); ctx.stroke();
  ctx.beginPath(); for (let q = 0; q < 3; q++) { const b = a + q * Math.PI / 3; ctx.moveTo(cx + Math.cos(b) * w * 0.12, T + Math.sin(b) * w * 0.12); ctx.lineTo(cx - Math.cos(b) * w * 0.12, T - Math.sin(b) * w * 0.12); } ctx.stroke();
  ctx.strokeStyle = '#3a3a36'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, T + w * 0.12); ctx.lineTo(cx, cy); ctx.stroke();
  if (z >= 10) {
    ctx.fillStyle = `rgba(160,192,64,${0.25 + 0.15 * Math.sin(now * 2 + e.id)})`;
    for (let k = 0; k < 4; k++) { const b = now * 0.6 + k * 1.6; ctx.beginPath(); ctx.arc(cx + Math.cos(b) * w * 0.12, cy + h * 0.04 + Math.sin(b) * h * 0.08, z * 0.06, 0, 7); ctx.fill(); }
  }
}
function drawBurrow(e, x, y, w, h, z) {
  const cx = x + w / 2, cy = y + h / 2, now = performance.now() / 1000;
  ctx.fillStyle = 'rgba(60,40,30,0.35)';
  ctx.beginPath(); ctx.ellipse(cx, cy + h * 0.05, w * 0.62, h * 0.5, 0, 0, 7); ctx.fill();
  for (let k = 0; k < 14; k++) {
    const a = k / 14 * Math.PI * 2 + hash(k, e.id, 4), r = w * (0.36 + 0.14 * hash(e.id, k, 6));
    ctx.fillStyle = k % 3 ? '#6a5240' : '#7e6450';
    ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.8, z * (0.16 + 0.12 * hash(k, e.id, 9)), 0, 7); ctx.fill();
  }
  const g = ctx.createRadialGradient(cx, cy, w * 0.04, cx, cy, w * 0.36);
  g.addColorStop(0, e.done ? '#3a3028' : '#020101'); g.addColorStop(0.7, e.done ? '#4a3e34' : '#1a110c'); g.addColorStop(1, '#4a3a2c');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(cx, cy, w * 0.34, h * 0.28, 0, 0, 7); ctx.fill();
  if (e.done) {
    ctx.fillStyle = '#5e4c3c';
    for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(cx + (hash(k, e.id, 1) - 0.5) * w * 0.4, cy + (hash(e.id, k, 1) - 0.5) * h * 0.3, z * 0.18, 0, 7); ctx.fill(); }
    return;
  }
  ctx.strokeStyle = '#a08060'; ctx.lineWidth = Math.max(1, z * 0.05);
  ctx.beginPath(); ctx.moveTo(cx - w * 0.36, cy - h * 0.34); ctx.lineTo(cx - w * 0.06, cy); ctx.moveTo(cx - w * 0.22, cy - h * 0.38); ctx.lineTo(cx - w * 0.36, cy - h * 0.34); ctx.stroke();
  if (z >= 10) {
    ctx.fillStyle = `rgba(160,192,64,${0.25 + 0.15 * Math.sin(now * 2 + e.id)})`;
    for (let k = 0; k < 3; k++) { const a = now * 0.7 + k * 2.1; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * w * 0.14, cy + Math.sin(a) * h * 0.1, z * 0.05, 0, 7); ctx.fill(); }
  }
}
function drawProp(t, X, Y, z, u, open) {
  const R = (c, a, b, w, h) => { ctx.fillStyle = c; ctx.fillRect(X + a * z, Y + b * z, w * z, h * z); };
  R('rgba(0,0,0,0.3)', 0.08, 0.8, 0.86, 0.14);
  if (t === 'crate') {
    R('#7a5a32', 0.1, 0.18, 0.8, 0.66); R('#5a3e1e', 0.1, 0.18, 0.8, 0.06); R('#5a3e1e', 0.1, 0.48, 0.8, 0.05); R('#5a3e1e', 0.1, 0.78, 0.8, 0.06);
    ctx.strokeStyle = '#4a3218'; ctx.lineWidth = Math.max(1, z * 0.05); ctx.beginPath(); ctx.moveTo(X + z * 0.12, Y + z * 0.2); ctx.lineTo(X + z * 0.88, Y + z * 0.82); ctx.stroke();
  } else if (t === 'barrel') {
    ctx.fillStyle = u < 0.5 ? '#3a5a7a' : '#7a3a2a'; ctx.beginPath(); ctx.ellipse(X + z * 0.5, Y + z * 0.55, z * 0.32, z * 0.36, 0, 0, 7); ctx.fill();
    R('rgba(0,0,0,0.35)', 0.18, 0.4, 0.64, 0.05); R('rgba(0,0,0,0.35)', 0.18, 0.66, 0.64, 0.05);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.ellipse(X + z * 0.5, Y + z * 0.26, z * 0.26, z * 0.09, 0, 0, 7); ctx.fill();
    if (u > 0.7) R('#d0b030', 0.4, 0.48, 0.2, 0.14);
  } else if (t === 'rack') {
    R('#5a5a58', 0.08, 0.1, 0.06, 0.78); R('#5a5a58', 0.86, 0.1, 0.06, 0.78);
    for (let q = 0; q < 3; q++) { R('#6e6e6a', 0.08, 0.2 + q * 0.24, 0.84, 0.05); for (let s = 0; s < 3; s++) R(['#a08050', '#6a7a8a', '#8a5a40'][(q + s + Math.floor(u * 9)) % 3], 0.16 + s * 0.24, 0.08 + q * 0.24, 0.16, 0.12); }
  } else if (t === 'cart') {
    R('#5a4030', 0.12, 0.3, 0.76, 0.4); R('#3a2a20', 0.12, 0.3, 0.76, 0.06);
    ctx.fillStyle = '#6a6a6a'; for (let q = 0; q < 2; q++) { ctx.beginPath(); ctx.arc(X + z * (0.28 + q * 0.44), Y + z * 0.74, z * 0.1, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#7a6a50'; for (let q = 0; q < 4; q++) { ctx.beginPath(); ctx.arc(X + z * (0.26 + q * 0.16), Y + z * 0.3, z * 0.09, 0, 7); ctx.fill(); }
  } else if (t === 'timber') {
    for (let q = 0; q < 4; q++) R(q % 2 ? '#8a6a40' : '#a07a48', 0.08, 0.2 + q * 0.16, 0.84, 0.12);
    ctx.fillStyle = '#c8a070'; for (let q = 0; q < 4; q++) { ctx.beginPath(); ctx.arc(X + z * 0.12, Y + z * (0.26 + q * 0.16), z * 0.06, 0, 7); ctx.fill(); }
  } else if (t === 'machine') {
    R('#5a6a5a', 0.1, 0.2, 0.8, 0.62); R('#3e4a3e', 0.1, 0.2, 0.8, 0.08);
    ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = Math.max(1, z * 0.04); ctx.beginPath(); ctx.arc(X + z * 0.38, Y + z * 0.52, z * 0.18, 0, 7); ctx.stroke();
    R('#8a3a2a', 0.66, 0.34, 0.14, 0.1); R('#c0b080', 0.66, 0.56, 0.14, 0.14);
  } else if (t === 'desk') {
    R('#6a4a2a', 0.06, 0.34, 0.88, 0.16); R('#4a3218', 0.1, 0.5, 0.08, 0.34); R('#4a3218', 0.82, 0.5, 0.08, 0.34);
    R('#d8d0b8', 0.24, 0.3, 0.22, 0.08); R('#c8c0a0', 0.5, 0.28, 0.16, 0.1);
  } else if (t === 'cabinet') {
    R('#5a6268', 0.18, 0.08, 0.64, 0.8); R('#3e464c', 0.18, 0.08, 0.64, 0.05);
    for (let q = 0; q < 3; q++) { R('#4a5258', 0.22, 0.18 + q * 0.24, 0.56, 0.2); R('#b0b0a0', 0.44, 0.26 + q * 0.24, 0.12, 0.04); }
  } else if (t === 'pumpset') {
    R('#2a4a6a', 0.06, 0.34, 0.5, 0.42); R('#1a3048', 0.06, 0.34, 0.5, 0.06);
    ctx.fillStyle = '#4a6a3a'; ctx.beginPath(); ctx.ellipse(X + z * 0.72, Y + z * 0.55, z * 0.2, z * 0.24, 0, 0, 7); ctx.fill();
    R('#6a6a68', 0.56, 0.12, 0.08, 0.3);
  } else if (t === 'pillar') {
    R('#6a6a64', 0.04, 0.04, 0.92, 0.84); R('#8a8a82', 0.04, 0.04, 0.92, 0.16); R('rgba(0,0,0,0.25)', 0.04, 0.74, 0.92, 0.14);
    ctx.strokeStyle = 'rgba(40,40,40,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X + z * 0.3, Y + z * 0.2); ctx.lineTo(X + z * 0.42, Y + z * 0.6); ctx.stroke();
  } else if (t === 'door') {
    if (open) { R('#3a3a3a', 0, 0, 0.16, 1); R('#3a3a3a', 0.84, 0, 0.16, 1); return; }
    R('#4a4c50', 0, 0, 1, 1);
    for (let q = 0; q < 4; q++) { ctx.fillStyle = q % 2 ? '#1a1a1a' : '#e0b020'; ctx.fillRect(X, Y + q * z * 0.25, z * 0.18, z * 0.25); ctx.fillRect(X + z * 0.82, Y + q * z * 0.25, z * 0.18, z * 0.25); }
    R('#6a6c70', 0.24, 0.1, 0.52, 0.8); R('#8a7a50', 0.44, 0.42, 0.12, 0.16);
  } else if (t === 'tank') {
    ctx.fillStyle = '#b8bcc0'; ctx.beginPath(); ctx.ellipse(X + z * 0.5, Y + z * 0.48, z * 0.4, z * 0.4, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(X + z * 0.38, Y + z * 0.32, z * 0.14, z * 0.1, -0.6, 0, 7); ctx.fill();
    R('#5a5e62', 0.18, 0.74, 0.06, 0.14); R('#5a5e62', 0.76, 0.74, 0.06, 0.14);
    R(u < 0.5 ? '#3a7ab0' : '#c8a020', 0.2, 0.46, 0.6, 0.06);
  } else if (t === 'valve') {
    R('#4a4e52', 0, 0, 1, 1); R('#62666a', 0, 0, 1, 0.14);
    R('#7a7e82', 0, 0.42, 1, 0.16); R('#2a2a2a', 0.46, 0.3, 0.08, 0.4);
    ctx.strokeStyle = open ? '#40a040' : '#d02020'; ctx.lineWidth = Math.max(2, z * 0.08);
    ctx.beginPath(); ctx.arc(X + z * 0.5, Y + z * 0.3, z * 0.22, 0, 7); ctx.moveTo(X + z * 0.28, Y + z * 0.3); ctx.lineTo(X + z * 0.72, Y + z * 0.3); ctx.moveTo(X + z * 0.5, Y + z * 0.08); ctx.lineTo(X + z * 0.5, Y + z * 0.52); ctx.stroke();
    if (!open) { R('rgba(250,250,240,0.5)', 0.6, 0.48, 0.3, 0.05); }
  } else if (t === 'drum') {
    for (let q = 0; q < 2; q++) {
      const cx = 0.3 + q * 0.4, col = (u + q * 0.37) % 1 < 0.5 ? '#2a5aa0' : '#d8d8d0';
      ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(X + z * cx, Y + z * 0.55, z * 0.18, z * 0.3, 0, 0, 7); ctx.fill();
      R('rgba(0,0,0,0.3)', cx - 0.17, 0.44, 0.34, 0.04); R('rgba(0,0,0,0.3)', cx - 0.17, 0.64, 0.34, 0.04);
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.ellipse(X + z * cx, Y + z * 0.3, z * 0.15, z * 0.06, 0, 0, 7); ctx.fill();
    }
  } else if (t === 'bench') {
    R('#7a7a74', 0.04, 0.36, 0.92, 0.12); R('#4a4a46', 0.08, 0.48, 0.06, 0.38); R('#4a4a46', 0.86, 0.48, 0.06, 0.38);
    R('#4a5a6a', 0.14, 0.2, 0.18, 0.16); R('#9a3a2a', 0.58, 0.26, 0.08, 0.1);
    ctx.strokeStyle = 'rgba(220,235,240,0.75)'; ctx.lineWidth = Math.max(1, z * 0.03); ctx.beginPath(); ctx.moveTo(X + z * 0.4, Y + z * 0.14); ctx.lineTo(X + z * 0.4, Y + z * 0.36); ctx.moveTo(X + z * 0.48, Y + z * 0.18); ctx.lineTo(X + z * 0.48, Y + z * 0.36); ctx.stroke();
  } else if (t === 'panel') {
    R('#4a5a52', 0.08, 0.06, 0.84, 0.82); R('#2a3430', 0.08, 0.06, 0.84, 0.06);
    R('#1a2a20', 0.16, 0.16, 0.68, 0.24);
    ctx.strokeStyle = '#60d080'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X + z * 0.18, Y + z * 0.32); for (let q = 1; q < 7; q++) ctx.lineTo(X + z * (0.18 + q * 0.105), Y + z * (0.3 - 0.08 * hash(q, Math.floor(u * 50), 3))); ctx.stroke();
    for (let q = 0; q < 6; q++) R(['#e04030', '#40c040', '#e0c030'][(q + Math.floor(u * 7)) % 3], 0.18 + (q % 3) * 0.22, 0.5 + Math.floor(q / 3) * 0.16, 0.08, 0.08);
  } else if (t === 'pipe') {
    R('#8a8e92', 0, 0.3, 1, 0.2); R('#6a6e72', 0, 0.46, 1, 0.04); R('#5a5e62', 0.2, 0.26, 0.08, 0.28); R('#5a5e62', 0.72, 0.26, 0.08, 0.28);
    R('#8a8e92', 0.4, 0.5, 0.2, 0.38); R('#c8a020', 0.4, 0.62, 0.2, 0.04);
  } else if (t === 'column') {
    R('#8a8c8e', 0.04, 0.04, 0.92, 0.84); R('#a8aaac', 0.04, 0.04, 0.92, 0.16); R('rgba(0,0,0,0.25)', 0.04, 0.74, 0.92, 0.14);
    R('#5a5c5e', 0.04, 0.4, 0.92, 0.04); R('#7a5a3a', 0.3, 0.5, 0.05, 0.22);
  }
}
function drawChest(c, X, Y, z, op, now) {
  const t = c.t || 'cache';
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(X + z * 0.1, Y + z * 0.8, z * 0.84, z * 0.12);
  if (t === 'locker' || t === 'safe') {
    const safe = t === 'safe';
    ctx.fillStyle = safe ? '#3a3e44' : '#4a6a5a'; ctx.fillRect(X + z * 0.16, Y + z * 0.04, z * 0.68, z * 0.84);
    ctx.fillStyle = safe ? '#25282c' : '#36503f'; ctx.fillRect(X + z * 0.16, Y + z * 0.04, z * 0.68, z * 0.06);
    if (safe) {
      ctx.strokeStyle = op ? '#6a6a6a' : '#c8b060'; ctx.lineWidth = Math.max(1, z * 0.05);
      ctx.beginPath(); ctx.arc(X + z * 0.5, Y + z * 0.44, z * 0.14, 0, 7); ctx.stroke();
      if (op) { ctx.fillStyle = '#121212'; ctx.fillRect(X + z * 0.22, Y + z * 0.12, z * 0.56, z * 0.7); }
    } else {
      for (let q = 0; q < 4; q++) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(X + z * 0.26, Y + z * (0.14 + q * 0.05), z * 0.48, z * 0.02); }
      ctx.fillStyle = '#c0c0b0'; ctx.fillRect(X + z * 0.68, Y + z * 0.44, z * 0.06, z * 0.1);
      if (op) { ctx.fillStyle = '#1a1a14'; ctx.fillRect(X + z * 0.2, Y + z * 0.1, z * 0.6, z * 0.74); ctx.fillStyle = '#4a6a5a'; ctx.fillRect(X - z * 0.04, Y + z * 0.08, z * 0.22, z * 0.78); }
    }
  } else if (t === 'boss') {
    ctx.fillStyle = '#5a5048'; ctx.fillRect(X + z * 0.06, Y + z * 0.28, z * 0.88, z * 0.56);
    ctx.fillStyle = '#7a6a50'; ctx.fillRect(X + z * 0.06, Y + z * 0.28, z * 0.88, z * 0.08);
    ctx.fillStyle = '#c8a040'; ctx.fillRect(X + z * 0.06, Y + z * 0.5, z * 0.88, z * 0.05); ctx.fillRect(X + z * 0.44, Y + z * 0.42, z * 0.12, z * 0.18);
    if (op) { ctx.fillStyle = '#121010'; ctx.fillRect(X + z * 0.1, Y + z * 0.3, z * 0.8, z * 0.14); }
    else if (S.dg.q.hp <= 0) { ctx.fillStyle = `rgba(255,220,120,${0.25 + 0.2 * Math.sin(now * 4)})`; ctx.beginPath(); ctx.arc(X + z * 0.5, Y + z * 0.5, z * 0.6, 0, 7); ctx.fill(); }
  } else {
    ctx.fillStyle = '#6a4a2a'; ctx.fillRect(X + z * 0.12, Y + z * 0.3, z * 0.76, z * 0.48);
    ctx.fillStyle = '#4a3218'; for (let q = 0; q < 3; q++) ctx.fillRect(X + z * 0.12, Y + z * (0.36 + q * 0.14), z * 0.76, z * 0.03);
    ctx.fillStyle = '#8a8a80'; ctx.fillRect(X + z * 0.22, Y + z * 0.3, z * 0.06, z * 0.48); ctx.fillRect(X + z * 0.72, Y + z * 0.3, z * 0.06, z * 0.48);
    if (op) { ctx.fillStyle = '#5a3e22'; ctx.save(); ctx.translate(X + z * 0.12, Y + z * 0.3); ctx.rotate(-0.5); ctx.fillRect(0, -z * 0.12, z * 0.76, z * 0.12); ctx.restore(); ctx.fillStyle = '#1a120a'; ctx.fillRect(X + z * 0.16, Y + z * 0.32, z * 0.68, z * 0.1); }
    else {
      ctx.fillStyle = '#7a5834'; ctx.fillRect(X + z * 0.08, Y + z * 0.2, z * 0.84, z * 0.14);
      ctx.fillStyle = '#c8a040'; ctx.fillRect(X + z * 0.46, Y + z * 0.3, z * 0.08, z * 0.1);
      if (z >= 18) { ctx.fillStyle = '#e8e0c8'; ctx.font = `bold ${Math.round(z * 0.16)}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText('SURVEY', X + z * 0.5, Y + z * 0.62); ctx.textAlign = 'left'; }
    }
  }
}
function drawDungeon(w, h) {
  const D = S.dg, G = dgGrid(), N = G.N, P = S.pl, z = Math.max(22, Math.min(64, cam.z)), now = performance.now() / 1000, ty = G.ty || 'nest', mine = dgRooms(ty), wk = ty === 'works', lv = ty === 'lava', ic = ty === 'ice';
  const lk = wk ? new Set([...G.leak].filter(i => !G.valves.some((v, j) => v.r === i && (D.vc || []).includes(j)))) : null;
  D.eggs = D.eggs || []; D.eg = D.eg || [];
  dgcam.x += (D.px - dgcam.x) * 0.25; dgcam.y += (D.py - dgcam.y) * 0.25; dgcam.z = z;
  if (Math.hypot(dgcam.x - D.px, dgcam.y - D.py) > 6) { dgcam.x = D.px; dgcam.y = D.py; }
  const ox = Math.round(w / 2 - dgcam.x * z), oy = Math.round(h / 2 - dgcam.y * z);
  ctx.fillStyle = '#050403'; ctx.fillRect(0, 0, w, h);
  const x0 = Math.max(0, Math.floor(-ox / z)), y0 = Math.max(0, Math.floor(-oy / z)), x1 = Math.min(N, Math.ceil((w - ox) / z)), y1 = Math.min(N, Math.ceil((h - oy) / z));
  const solid = (x, y) => dgSolid(x, y);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const X = ox + x * z, Y = oy + y * z, k = y * N + x;
    if (solid(x, y) && !G.deco.has(k)) continue;
    const qd = Math.hypot(x - G.qx, y - G.qy), u = hash(x, y, 71);
    if (mine) {
      const r = G.rm[k];
      if (r >= 0) {
        const bs = r === G.boss;
        ctx.fillStyle = bs ? (wk ? `rgb(${62 + u * 8},${62 + u * 8},${58 + u * 8})` : `rgb(${50 + u * 8},${46 + u * 8},${44 + u * 8})`) : wk ? `rgb(${96 + u * 8},${100 + u * 8},${100 + u * 8})` : `rgb(${84 + u * 10},${82 + u * 10},${76 + u * 8})`;
        ctx.fillRect(X, Y, z + 1, z + 1);
        ctx.fillStyle = 'rgba(0,0,0,0.16)';
        if ((x - G.rooms[r].x) % 3 === 0) ctx.fillRect(X, Y, Math.max(1, z * 0.04), z + 1);
        if ((y - G.rooms[r].y) % 3 === 0) ctx.fillRect(X, Y, z + 1, Math.max(1, z * 0.04));
        if (hash(x, y, 19) < 0.12) { ctx.fillStyle = bs ? 'rgba(90,30,30,0.35)' : 'rgba(60,50,40,0.3)'; ctx.beginPath(); ctx.ellipse(X + z * 0.5, Y + z * 0.5, z * 0.4, z * 0.25, u * 3, 0, 7); ctx.fill(); }
        if (wk && bs && hash(x, y, 23) < 0.3) { ctx.strokeStyle = 'rgba(20,18,16,0.6)'; ctx.lineWidth = Math.max(1, z * 0.03); ctx.beginPath(); ctx.moveTo(X + hash(x, y, 24) * z, Y); ctx.lineTo(X + z * 0.5, Y + z * 0.5); ctx.lineTo(X + hash(y, x, 25) * z, Y + z); ctx.stroke(); }
        if (wk && !bs && (x + y) % 9 === 0 && hash(x, y, 26) < 0.5) { ctx.fillStyle = 'rgba(220,180,40,0.55)'; ctx.fillRect(X, Y + z * 0.44, z + 1, z * 0.12); }
        if (lk && lk.has(r)) { ctx.fillStyle = `rgba(225,238,230,${0.16 + 0.1 * Math.sin(now * 1.7 + x * 0.6 + y * 0.4)})`; ctx.fillRect(X, Y, z + 1, z + 1); }
      } else {
        ctx.fillStyle = `rgb(${62 + u * 12},${58 + u * 10},${52 + u * 8})`;
        ctx.fillRect(X, Y, z + 1, z + 1);
        if (z >= 14) for (let q = 0; q < 5; q++) { ctx.fillStyle = q % 2 ? 'rgba(0,0,0,0.2)' : 'rgba(200,190,170,0.12)'; ctx.fillRect(X + hash(x, y, q + 3) * z * 0.85, Y + hash(y, x, q + 9) * z * 0.85, z * 0.1, z * 0.1); }
      }
    } else {
      const iy = ic && G.ice.has(k);
      ctx.fillStyle = iy ? `rgb(${150 + u * 14},${178 + u * 12},${196 + u * 10})` : qd < 6 ? (lv ? `rgb(${66 + u * 10},${34 + u * 8},${26 + u * 8})` : ic ? `rgb(${70 + u * 10},${80 + u * 8},${96 + u * 10})` : `rgb(${58 + u * 10},${40 + u * 8},${50 + u * 10})`) : lv ? `rgb(${38 + u * 10},${32 + u * 8},${32 + u * 8})` : ic ? `rgb(${66 + u * 10},${72 + u * 10},${80 + u * 10})` : ty === 'brim' ? `rgb(${66 + u * 12},${58 + u * 10},${30 + u * 8})` : ty === 'deep' ? `rgb(${40 + u * 10},${42 + u * 10},${50 + u * 10})` : `rgb(${52 + u * 12},${44 + u * 10},${36 + u * 8})`;
      ctx.fillRect(X, Y, z + 1, z + 1);
      if (z >= 16) for (let q = 0; q < 3; q++) { const a = hash(x, y, q + 3), b = hash(y, x, q + 9); ctx.fillStyle = q === 1 ? 'rgba(0,0,0,0.18)' : ty === 'brim' ? 'rgba(240,220,90,0.1)' : 'rgba(255,240,220,0.06)'; ctx.fillRect(X + a * z * 0.85, Y + b * z * 0.85, z * 0.12, z * 0.08); }
      if (iy) { ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = Math.max(1, z * 0.03); ctx.beginPath(); ctx.moveTo(X + hash(x, y, 30) * z * 0.5, Y + z * 0.2 + hash(y, x, 31) * z * 0.6); ctx.lineTo(X + z * 0.5 + hash(x, y, 32) * z * 0.5, Y + hash(y, x, 33) * z * 0.6); ctx.stroke(); }
      if (lv && hash(x, y, 34) < 0.08) { ctx.fillStyle = `rgba(255,${90 + 40 * Math.sin(now * 2 + k)},30,0.5)`; ctx.fillRect(X + hash(x, y, 35) * z * 0.6, Y + hash(y, x, 36) * z * 0.8, z * 0.4, Math.max(1, z * 0.04)); }
      if (D.mv[k]) { ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(X + z * 0.1, Y + z * 0.1, z * 0.8, z * 0.8); }
      if (qd < 5 && hash(x, y, 13) < 0.35) { ctx.fillStyle = 'rgba(200,190,170,0.5)'; ctx.fillRect(X + z * 0.3, Y + z * 0.45, z * 0.4, z * 0.07); ctx.beginPath(); ctx.arc(X + z * 0.3, Y + z * 0.48, z * 0.06, 0, 7); ctx.arc(X + z * 0.7, Y + z * 0.48, z * 0.06, 0, 7); ctx.fill(); }
    }
    if (G.pool.has(k)) {
      ctx.fillStyle = lv ? `rgba(${225 + 30 * Math.sin(now * 2 + k)},${90 + 45 * Math.sin(now * 1.3 + k * 0.7)},20,0.96)` : ic ? `rgba(${60 + 10 * Math.sin(now + k)},130,${180 + 15 * Math.sin(now * 1.4 + k)},0.82)` : `rgba(${150 + 20 * Math.sin(now * 2 + k)},190,60,0.78)`; ctx.fillRect(X, Y, z + 1, z + 1);
      if (lv) { ctx.strokeStyle = 'rgba(40,16,8,0.7)'; ctx.lineWidth = Math.max(1, z * 0.05); ctx.beginPath(); ctx.moveTo(X + hash(x, y, 87) * z, Y + z * 0.1); ctx.lineTo(X + z * 0.5, Y + z * (0.3 + 0.2 * Math.sin(now * 0.5 + k))); ctx.lineTo(X + hash(y, x, 88) * z, Y + z * 0.9); ctx.stroke(); }
      for (let q = 0; q < 2; q++) { const ph = (now * 0.7 + hash(x, y, q + 80)) % 1; ctx.strokeStyle = lv ? `rgba(255,230,120,${0.7 * (1 - ph)})` : ic ? `rgba(225,245,255,${0.6 * (1 - ph)})` : `rgba(230,250,150,${0.6 * (1 - ph)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(X + hash(x, y, q + 84) * z * 0.7 + z * 0.15, Y + hash(y, x, q + 86) * z * 0.7 + z * 0.15, z * 0.1 * (0.4 + ph), 0, 7); ctx.stroke(); }
    }
  }
  const WC = wk ? [78, 80, 84, 132, 134, 132] : mine ? [70, 70, 66, 112, 110, 102] : lv ? [26, 22, 22, 56, 46, 44] : ic ? [64, 78, 92, 168, 192, 210] : ty === 'brim' ? [56, 48, 22, 98, 86, 38] : ty === 'deep' ? [26, 30, 38, 50, 56, 68] : [34, 28, 24, 62, 52, 42];
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    if (!solid(x, y)) continue;
    const X = ox + x * z, Y = oy + y * z, k = y * N + x, u = hash(x, y, 33), open = !solid(x, y + 1);
    if (G.deco.has(k)) continue;
    let bare = true;
    for (let j = -1; j <= 1 && bare; j++) for (let i = -1; i <= 1; i++) if (!solid(x + i, y + j)) { bare = false; break; }
    if (bare) { ctx.fillStyle = '#0d0a08'; ctx.fillRect(X, Y, z + 1, z + 1); continue; }
    ctx.fillStyle = `rgb(${WC[0] + u * 10},${WC[1] + u * 8},${WC[2] + u * 6})`;
    ctx.fillRect(X, Y, z + 1, z + 1);
    ctx.fillStyle = `rgb(${WC[3] + u * 14},${WC[4] + u * 12},${WC[5] + u * 10})`;
    ctx.fillRect(X, Y, z + 1, z * 0.62);
    if (!solid(x, y - 1)) { ctx.fillStyle = 'rgba(255,235,200,0.12)'; ctx.fillRect(X, Y, z + 1, z * 0.12); }
    if (!solid(x - 1, y)) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(X, Y, z * 0.08, z); }
    if (!solid(x + 1, y)) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(X + z * 0.92, Y, z * 0.08, z); }
    if (open) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(X, Y + z, z + 1, z * 0.22); }
    if (mine) {
      if (z >= 14) { ctx.strokeStyle = 'rgba(40,40,40,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); for (let q = 1; q < 4; q++) { ctx.moveTo(X + q * z / 4, Y); ctx.lineTo(X + q * z / 4, Y + z * 0.62); ctx.moveTo(X, Y + q * z * 0.155); ctx.lineTo(X + z, Y + q * z * 0.155); } ctx.stroke(); }
      if (open && hash(x, y, 91) < 0.18) { ctx.fillStyle = wk ? '#5a6470' : '#7a5a30'; ctx.fillRect(X + z * 0.42, Y + z * 0.1, z * 0.16, z * 0.9); }
      if (hash(x, y, 93) < 0.1) { ctx.fillStyle = 'rgba(120,60,30,0.35)'; ctx.fillRect(X + z * 0.3, Y + z * 0.3, z * 0.1, z * 0.5); }
    } else {
      if (z >= 14) for (let q = 0; q < 2; q++) { ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(X + hash(x, y, q + 40) * z * 0.7, Y + hash(y, x, q + 44) * z * 0.45, z * 0.24, z * 0.05); }
      if (lv && hash(x, y, 95) < 0.14) { ctx.strokeStyle = `rgba(255,${100 + 50 * Math.sin(now * 1.5 + k)},30,0.75)`; ctx.lineWidth = Math.max(1, z * 0.04); ctx.beginPath(); ctx.moveTo(X + z * 0.2, Y + z * 0.1); ctx.lineTo(X + z * 0.45, Y + z * 0.35); ctx.lineTo(X + z * 0.38, Y + z * 0.58); ctx.stroke(); }
      if (ic && open) { ctx.fillStyle = 'rgba(220,240,255,0.85)'; for (let q = 0; q < 3; q++) if (hash(x, y, q + 96) < 0.6) { const ax = X + z * (0.15 + q * 0.3); ctx.beginPath(); ctx.moveTo(ax, Y + z * 0.98); ctx.lineTo(ax + z * 0.12, Y + z * 0.98); ctx.lineTo(ax + z * 0.06, Y + z * (1.1 + 0.15 * hash(y, x, q + 97))); ctx.fill(); } }
    }
    const vn = G.vein.get(k);
    if (vn) {
      const c = vn === 'sulfur' ? '#e8d040' : ITEMS[vn] ? ITEMS[vn].c : '#c0a080';
      for (let q = 0; q < 5; q++) { ctx.fillStyle = q % 2 ? c : shade(c, 0.7); ctx.beginPath(); ctx.arc(X + (0.18 + 0.64 * hash(x, y, q + 50)) * z, Y + (0.12 + 0.42 * hash(y, x, q + 55)) * z, z * (0.06 + 0.05 * hash(q, k, 2)), 0, 7); ctx.fill(); }
      if (Math.sin(now * 3 + k) > 0.92) { ctx.fillStyle = 'rgba(255,255,230,0.8)'; ctx.fillRect(X + hash(x, y, 60) * z * 0.7, Y + z * 0.2, z * 0.06, z * 0.06); }
    }
  }
  for (const [k, t] of G.deco) {
    const x = k % N, y = (k - x) / N;
    if (x < x0 - 1 || y < y0 - 1 || x > x1 || y > y1) continue;
    drawProp(t, ox + x * z, oy + y * z, z, hash(x, y, 7), t === 'valve' ? (D.vc || []).includes(G.valves.findIndex(v => v.y * N + v.x === k)) : !!D.mv[k]);
    if (t === 'valve' && !(D.vc || []).includes(G.valves.findIndex(v => v.y * N + v.x === k)) && z >= 16) for (let q = 0; q < 3; q++) { const ph = (now * 1.3 + q / 3) % 1; ctx.fillStyle = `rgba(235,245,240,${0.45 * (1 - ph)})`; ctx.beginPath(); ctx.arc(ox + (x + 0.75 + ph * 0.5) * z, oy + (y + 0.3 - ph * 0.3) * z, z * (0.08 + ph * 0.22), 0, 7); ctx.fill(); }
  }
  for (const l of G.lamps) {
    const X = ox + (l.x + 0.5) * z, Y = oy + l.y * z, on = !l.f || Math.sin(now * 23 + l.x) + Math.sin(now * 7.3 + l.y) > -0.6;
    ctx.fillStyle = '#3a3a3a'; ctx.fillRect(X - z * 0.04, Y, z * 0.08, z * 0.14);
    ctx.fillStyle = on ? '#fff2b0' : '#5a5040'; ctx.beginPath(); ctx.arc(X, Y + z * 0.2, z * 0.09, 0, 7); ctx.fill();
  }
  const ex = ox + (G.ex + 0.5) * z, ey = oy + (G.ey + 0.5) * z;
  if (wk) {
    ctx.fillStyle = 'rgba(20,20,20,0.5)'; ctx.fillRect(ex - z * 0.9, ey - z * 0.8, z * 1.8, z * 1.6);
    ctx.fillStyle = '#5a6068'; ctx.fillRect(ex - z * 0.95, ey - z * 1.2, z * 0.14, z * 2); ctx.fillRect(ex + z * 0.81, ey - z * 1.2, z * 0.14, z * 2);
    ctx.strokeStyle = 'rgba(170,175,180,0.7)'; ctx.lineWidth = Math.max(1, z * 0.025); ctx.beginPath();
    for (let q = 0; q < 7; q++) { ctx.moveTo(ex - z * 0.8 + q * z * 0.27, ey - z * 1.1); ctx.lineTo(ex - z * 0.8 + q * z * 0.27 + z * 0.5, ey + z * 0.7); ctx.moveTo(ex + z * 0.8 - q * z * 0.27, ey - z * 1.1); ctx.lineTo(ex + z * 0.8 - q * z * 0.27 - z * 0.5, ey + z * 0.7); }
    ctx.stroke();
    ctx.fillStyle = '#c8b030'; ctx.fillRect(ex - z * 0.5, ey - z * 1.45, z, z * 0.24); ctx.fillStyle = '#1a1a1a'; ctx.font = `bold ${Math.round(z * 0.17)}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText('GATE 2', ex, ey - z * 1.27); ctx.textAlign = 'left';
  } else if (mine) {
    ctx.fillStyle = 'rgba(20,20,20,0.6)'; ctx.fillRect(ex - z * 0.8, ey - z * 0.8, z * 1.6, z * 1.6);
    ctx.strokeStyle = '#8a8a84'; ctx.lineWidth = Math.max(2, z * 0.07); ctx.strokeRect(ex - z * 0.7, ey - z * 0.7, z * 1.4, z * 1.4);
    ctx.lineWidth = Math.max(1, z * 0.03); ctx.strokeStyle = 'rgba(160,160,150,0.6)'; ctx.beginPath();
    for (let q = 1; q < 6; q++) { ctx.moveTo(ex - z * 0.7 + q * z * 0.233, ey - z * 0.7); ctx.lineTo(ex - z * 0.7 + q * z * 0.233, ey - z * 0.5); ctx.moveTo(ex - z * 0.7 + q * z * 0.233, ey + z * 0.5); ctx.lineTo(ex - z * 0.7 + q * z * 0.233, ey + z * 0.7); }
    ctx.stroke();
    ctx.strokeStyle = '#c8b070'; ctx.lineWidth = Math.max(1, z * 0.04); ctx.beginPath(); ctx.moveTo(ex - z * 0.3, ey - z * 0.7); ctx.lineTo(ex, ey - z * 1.6); ctx.lineTo(ex + z * 0.3, ey - z * 0.7); ctx.stroke();
  } else {
    ctx.strokeStyle = '#a07a4a'; ctx.lineWidth = Math.max(2, z * 0.08);
    ctx.beginPath(); ctx.moveTo(ex - z * 0.15, ey - z * 1.2); ctx.lineTo(ex - z * 0.15, ey + z * 0.3); ctx.moveTo(ex + z * 0.15, ey - z * 1.2); ctx.lineTo(ex + z * 0.15, ey + z * 0.3); ctx.stroke();
    ctx.lineWidth = Math.max(1, z * 0.05);
    for (let k = 0; k < 5; k++) { const yy = ey - z * 1.1 + k * z * 0.32; ctx.beginPath(); ctx.moveTo(ex - z * 0.15, yy); ctx.lineTo(ex + z * 0.15, yy); ctx.stroke(); }
  }
  G.caches.forEach((c, i) => drawChest(c, ox + c.x * z, oy + c.y * z, z, D.oc.includes(i), now));
  if (D.fire) for (const f of D.fire) {
    const X = ox + f.x * z, Y = oy + f.y * z, a = Math.min(1, f.t);
    ctx.fillStyle = `rgba(60,20,10,${0.5 * a})`; ctx.beginPath(); ctx.ellipse(X, Y + z * 0.1, z * 0.45, z * 0.2, 0, 0, 7); ctx.fill();
    for (let q = 0; q < 4; q++) { const fl = 0.6 + 0.4 * Math.sin(now * 14 + q * 1.7 + f.x * 3); ctx.fillStyle = q % 2 ? `rgba(255,200,60,${0.8 * a})` : `rgba(255,100,30,${0.8 * a})`; ctx.beginPath(); ctx.ellipse(X + (q - 1.5) * z * 0.16, Y - z * 0.1 * fl, z * 0.09, z * 0.24 * fl, 0, 0, 7); ctx.fill(); }
  }
  for (const o of D.eggs) {
    const X = ox + o.x * z, Y = oy + o.y * z, pu = 1 + 0.06 * Math.sin(now * 3 + o.i) + (o.ht && D.t - o.ht < 0.4 ? 0.12 : 0);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(X, Y + z * 0.3, z * 0.42, z * 0.14, 0, 0, 7); ctx.fill();
    for (const [a, b, s] of [[-0.18, 0.04, 0.26], [0.2, 0.08, 0.24], [0, -0.14, 0.28]]) {
      ctx.fillStyle = '#d8d0a0'; ctx.beginPath(); ctx.ellipse(X + a * z, Y + b * z, s * z * 0.8 * pu, s * z * pu, 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(120,150,60,0.45)'; ctx.beginPath(); ctx.ellipse(X + a * z, Y + b * z + s * z * 0.2, s * z * 0.45 * pu, s * z * 0.5 * pu, 0, 0, 7); ctx.fill();
    }
    if (o.hp < o.mhp) { ctx.fillStyle = '#300'; ctx.fillRect(X - z * 0.4, Y - z * 0.55, z * 0.8, 3); ctx.fillStyle = '#e0d060'; ctx.fillRect(X - z * 0.4, Y - z * 0.55, z * 0.8 * o.hp / o.mhp, 3); }
  }
  const Q = D.q;
  const sb = S.bugs;
  S.bugs = D.bugs;
  drawBugs(ox, oy, z, x0 - 2, y0 - 2, x1 + 2, y1 + 2);
  const QX = ox + Q.x * z, QY = oy + Q.y * z;
  if (Q.ty === 'brood' && Q.hp > 0 && Q.wu > 0) {
    const RX = ox + Q.gx * z, RY = oy + Q.gy * z, fr = 1 - Q.wu / 1.2;
    ctx.fillStyle = `rgba(255,40,30,${0.12 + 0.2 * fr})`; ctx.beginPath(); ctx.arc(RX, RY, z * 1.6, 0, 7); ctx.fill();
    ctx.strokeStyle = `rgba(255,50,40,${0.5 + 0.4 * Math.sin(now * 25)})`; ctx.lineWidth = Math.max(2, z * 0.08); ctx.beginPath(); ctx.arc(RX, RY, z * 1.6, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.arc(RX, RY, z * 1.6 * fr, 0, 7); ctx.stroke();
  }
  if (Q.ty === 'tyrant' && (Q.hp > 0 || Q.dead)) {
    const qz = z * 2.3, qox = ox + Q.x * (z - qz), qoy = oy + Q.y * (z - qz);
    if (Q.hp > 0) {
      if (Q.wu > 0) { ctx.strokeStyle = `rgba(255,60,40,${0.4 + 0.4 * Math.sin(now * 30)})`; ctx.lineWidth = Math.max(2, z * 0.1); ctx.setLineDash([z * 0.3, z * 0.2]); ctx.beginPath(); ctx.moveTo(QX, QY); ctx.lineTo(QX + Math.cos(Q.a) * z * 7, QY + Math.sin(Q.a) * z * 7); ctx.stroke(); ctx.setLineDash([]); }
      S.bugs = [{ x: Q.x, y: Q.y, a: Q.a, ph: now, hp: Q.hp, mhp: Q.mhp, k: 2, chew: Q.ch > 0 ? 1 : 0 }];
      drawBugs(qox, qoy, qz, -1e9, -1e9, 1e9, 1e9);
      ctx.save(); ctx.translate(QX, QY); ctx.rotate(Q.a);
      for (let q = 0; q < 4; q++) { ctx.fillStyle = q % 2 ? '#8a2a20' : '#b03a2a'; ctx.beginPath(); ctx.ellipse(-z * (0.15 + q * 0.28), 0, z * 0.2, z * (0.42 - q * 0.05), 0, 0, 7); ctx.fill(); }
      ctx.fillStyle = Q.ch > 0 ? '#ffe040' : '#ff3020'; ctx.beginPath(); ctx.arc(z * 0.5, -z * 0.14, z * 0.08, 0, 7); ctx.arc(z * 0.5, z * 0.14, z * 0.08, 0, 7); ctx.fill();
      ctx.restore();
      if (Q.st > 0) for (let q = 0; q < 3; q++) { const a = now * 4 + q * 2.1; ctx.fillStyle = '#ffe060'; ctx.font = `bold ${Math.round(z * 0.4)}px sans-serif`; ctx.fillText('*', QX + Math.cos(a) * z * 0.7 - z * 0.1, QY - z * 1.1 + Math.sin(a) * z * 0.2); }
    } else { ctx.fillStyle = 'rgba(60,20,16,0.75)'; ctx.beginPath(); ctx.ellipse(QX, QY, z * 1.2, z * 0.7, Q.a, 0, 7); ctx.fill(); }
  } else if (Q.ty === 'brood' && Q.hp > 0 && Q.sub) {
    if (!Q.wu) {
      ctx.fillStyle = 'rgba(30,26,22,0.7)'; ctx.beginPath(); ctx.ellipse(QX, QY, z * 1.2, z * 0.8, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(15,12,10,0.8)'; ctx.lineWidth = Math.max(1, z * 0.05); ctx.beginPath();
      for (let q = 0; q < 7; q++) { const a = q * 0.9; ctx.moveTo(QX, QY); ctx.lineTo(QX + Math.cos(a) * z * (1.2 + 0.5 * hash(q, 3, 5)), QY + Math.sin(a) * z * (0.8 + 0.4 * hash(q, 4, 5))); }
      ctx.stroke();
      if (Q.dv > 0) for (let q = 0; q < 5; q++) { const ph = (now * 1.6 + q / 5) % 1; ctx.fillStyle = `rgba(160,150,130,${0.5 * (1 - ph)})`; ctx.beginPath(); ctx.arc(QX + Math.cos(q * 1.3) * z * ph, QY - z * ph * 0.8, z * (0.15 + ph * 0.3), 0, 7); ctx.fill(); }
    }
  } else if (Q.hp > 0 || Q.dead) {
    const qz = z * 2.8, qox = ox + Q.x * (z - qz), qoy = oy + Q.y * (z - qz), pu = 1 + 0.05 * Math.sin(now * 2.5);
    if (Q.hp > 0) {
      ctx.fillStyle = Q.ty === 'ember' ? 'rgba(255,130,50,0.6)' : Q.ty === 'frost' ? 'rgba(170,220,255,0.55)' : Q.ty === 'brood' ? 'rgba(170,180,150,0.6)' : ty === 'brim' ? 'rgba(220,200,110,0.55)' : 'rgba(200,170,190,0.55)';
      ctx.beginPath(); ctx.ellipse(QX - Math.cos(Q.a) * z * 1.1, QY - Math.sin(Q.a) * z * 1.1, z * 0.9 * pu, z * 0.65 * pu, Q.a, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(120,80,100,0.6)'; ctx.lineWidth = Math.max(1, z * 0.04);
      for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(QX - Math.cos(Q.a) * z * 1.1, QY - Math.sin(Q.a) * z * 1.1, z * (0.25 + k * 0.17) * pu, z * (0.18 + k * 0.12) * pu, Q.a, 0, 7); ctx.stroke(); }
      S.bugs = [{ x: Q.x, y: Q.y, a: Q.a, ph: 0, hp: Q.hp, mhp: Q.mhp || 90 * BUGK[2].hp, k: 2, chew: Q.aw ? 1 : 0 }];
      drawBugs(qox, qoy, qz, -1e9, -1e9, 1e9, 1e9);
      ctx.fillStyle = Q.ty === 'ember' ? `rgba(255,150,40,${0.35 + 0.25 * Math.sin(now * 4)})` : Q.ty === 'frost' ? `rgba(180,240,255,${0.3 + 0.2 * Math.sin(now * 4)})` : `rgba(200,120,255,${0.25 + 0.2 * Math.sin(now * 4)})`;
      ctx.beginPath(); ctx.arc(QX + Math.cos(Q.a) * z * 0.5, QY + Math.sin(Q.a) * z * 0.5, z * 0.16, 0, 7); ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(40,30,30,0.7)';
      ctx.beginPath(); ctx.ellipse(QX, QY, z * 1.1, z * 0.6, Q.a, 0, 7); ctx.fill();
    }
  }
  S.bugs = sb;
  for (const s of D.sp) { ctx.fillStyle = s.f ? '#ff8030' : s.ch ? '#b0e8ff' : s.q ? (wk ? '#c8c0a0' : mine ? '#ff7050' : '#d080ff') : '#9ad040'; ctx.beginPath(); ctx.arc(ox + s.x * z, oy + s.y * z, z * (s.q ? 0.14 : 0.1), 0, 7); ctx.fill(); }
  for (let i = dfx.length - 1; i >= 0; i--) {
    const f = dfx[i];
    f.t += 1 / 60;
    if (f.t > 1.2) { dfx.splice(i, 1); continue; }
    ctx.globalAlpha = Math.max(0, 1 - f.t / 1.2); ctx.fillStyle = f.c;
    for (let k = 0; k < 8; k++) { const a = k * 0.785 + f.t, r = z * (0.3 + f.t * 1.4); ctx.beginPath(); ctx.arc(ox + f.x * z + Math.cos(a) * r, oy + f.y * z + Math.sin(a) * r, z * 0.1 * (1.2 - f.t), 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  drawNades(ox, oy, z, true);
  const px = P.x, py = P.y;
  P.x = D.px; P.y = D.py;
  drawPlayer(ox, oy, z);
  P.x = px; P.y = py;
  if (dgMine) {
    const X = ox + (dgMine.k % N + 0.5) * z, Y = oy + (Math.floor(dgMine.k / N) + 0.5) * z;
    ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(X, Y, z * 0.4, -Math.PI / 2, -Math.PI / 2 + dgMine.p * Math.PI * 2); ctx.stroke();
  }
  if (!dgDark) dgDark = document.createElement('canvas');
  const dpr = window.devicePixelRatio || 1;
  if (dgDark.width !== cv.width || dgDark.height !== cv.height) { dgDark.width = cv.width; dgDark.height = cv.height; }
  const dc = dgDark.getContext('2d');
  dc.setTransform(dpr, 0, 0, dpr, 0, 0);
  dc.globalCompositeOperation = 'source-over';
  dc.clearRect(0, 0, w, h);
  dc.fillStyle = 'rgba(2,1,0,0.94)'; dc.fillRect(0, 0, w, h);
  dc.globalCompositeOperation = 'destination-out';
  const lamp = (X, Y, r, a) => { const g = dc.createRadialGradient(X, Y, 0, X, Y, r); g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(0.55, `rgba(0,0,0,${a * 0.75})`); g.addColorStop(1, 'rgba(0,0,0,0)'); dc.fillStyle = g; dc.beginPath(); dc.arc(X, Y, r, 0, 7); dc.fill(); };
  const PX = ox + D.px * z, PY = oy + D.py * z, fl = 1 + 0.03 * Math.sin(now * 13);
  lamp(PX, PY, z * 7.5 * fl, 1);
  const fa = P.f;
  dc.save(); dc.translate(PX, PY); dc.rotate(fa);
  const cg = dc.createRadialGradient(0, 0, z, 0, 0, z * 11);
  cg.addColorStop(0, 'rgba(0,0,0,0.85)'); cg.addColorStop(1, 'rgba(0,0,0,0)');
  dc.fillStyle = cg; dc.beginPath(); dc.moveTo(0, 0); dc.arc(0, 0, z * 11, -0.42, 0.42); dc.closePath(); dc.fill();
  dc.restore();
  lamp(ex, ey, z * 4, 0.9);
  for (const l of G.lamps) { const on = !l.f || Math.sin(now * 23 + l.x) + Math.sin(now * 7.3 + l.y) > -0.6; if (on) lamp(ox + (l.x + 0.5) * z, oy + (l.y + 0.4) * z, z * 5, 0.75); }
  if (G.pool.size) for (const k of G.pool) { const x = k % N, y = (k - x) / N; if (x >= x0 - 3 && y >= y0 - 3 && x <= x1 + 3 && y <= y1 + 3) lamp(ox + (x + 0.5) * z, oy + (y + 0.5) * z, z * (lv ? 2.6 : 1.4), lv ? 0.6 : 0.35); }
  if (D.fire) for (const f of D.fire) lamp(ox + f.x * z, oy + f.y * z, z * 1.8, 0.6);
  if (Q.hp > 0 && Q.aw) lamp(QX, QY, z * 3, 0.5);
  for (const s of D.sp) lamp(ox + s.x * z, oy + s.y * z, z * 0.8, 0.6);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(dgDark, 0, 0); ctx.restore();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalCompositeOperation = 'lighter';
  const sh = ctx.createRadialGradient(ex, ey - z, z * 0.2, ex, ey, z * 3);
  sh.addColorStop(0, 'rgba(255,240,200,0.22)'); sh.addColorStop(1, 'rgba(255,240,200,0)');
  ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(ex, ey, z * 3, 0, 7); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  if (D.chill > 0) { const a = Math.min(1, D.chill / 3), cg2 = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7); cg2.addColorStop(0, 'rgba(150,210,255,0)'); cg2.addColorStop(1, `rgba(170,225,255,${0.45 * a})`); ctx.fillStyle = cg2; ctx.fillRect(0, 0, w, h); }
  if (lk && lk.has(G.rm[Math.floor(D.py) * N + Math.floor(D.px)])) { ctx.fillStyle = `rgba(230,240,232,${0.14 + 0.05 * Math.sin(now * 2)})`; ctx.fillRect(0, 0, w, h); }
  const alive = D.bugs.length, left = G.caches.length - D.oc.length, eg = D.eggs.length, bar = Q.aw && Q.hp > 0;
  ctx.fillStyle = 'rgba(12,10,8,0.82)'; ctx.fillRect(w / 2 - 340, 10, 680, bar ? 58 : 38);
  ctx.strokeStyle = '#5a4a3a'; ctx.strokeRect(w / 2 - 339.5, 10.5, 679, bar ? 57 : 37);
  ctx.fillStyle = '#e8dcc8'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
  const door = mine ? (G.door.every(k => D.mv[k]) ? ' · door open' : D.key ? ' · key found' : ' · door locked') : '';
  ctx.fillText(`${DGK[ty]} · ${alive} crawler${alive === 1 ? '' : 's'} · ${eg} egg clutch${eg === 1 ? '' : 'es'} · ${left} ${mine ? 'chest' : 'cache'}${left === 1 ? '' : 's'} left · ${(wk ? 'broodmother' : mine ? 'tyrant' : 'queen') + (Q.hp > 0 ? ' alive' : ' dead')}${door}${wk && G.valves.length ? ` · ${lk.size} leak${lk.size === 1 ? '' : 's'}` : ''}${D.chill > 0 ? ' · chilled' : ''}`, w / 2, 26);
  ctx.font = '11px sans-serif'; ctx.fillStyle = '#a89880';
  const atEx = Math.hypot(D.px - G.ex - 0.5, D.py - G.ey - 0.5) < 2;
  ctx.fillText(atEx ? (wk ? 'Press F to leave through the gate' : mine ? 'Press F to ride the cage back to the surface' : 'Press F to climb the rope back to the surface')
    : wk ? `Space shoots · G throws a charge · F opens lockers, doors and shuts red valves · the plant manager's safe holds the key · ${S.inv.respirator || 0} respirator${S.inv.respirator === 1 ? '' : 's'} · ${wpnRounds(wpnCur())} rounds`
    : mine ? `Space shoots · G throws a charge · F opens lockers and the blast door · find the shift boss's safe for the key · ${wpnRounds(wpnCur())} rounds`
    : `Space shoots · G throws a charge · click rock to dig, veins glint · F opens a cache${ty === 'brim' ? ' · keep out of the acid' : lv ? ' · keep off the lava' : ic ? ' · glare ice is slippery, meltwater chills' : ''} · ${wpnRounds(wpnCur())} rounds`, w / 2, 41);
  if (bar) {
    ctx.fillStyle = '#2a1a24'; ctx.fillRect(w / 2 - 200, 50, 400, 10);
    ctx.fillStyle = wk ? '#a0a880' : mine ? '#e04a3a' : lv ? '#ff7a30' : ic ? '#80c8f0' : ty === 'brim' ? '#d0b040' : '#c070e0'; ctx.fillRect(w / 2 - 200, 50, 400 * Q.hp / Q.mhp, 10);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 9px sans-serif'; ctx.fillText(DGQ[ty], w / 2, 58.5);
  }
  ctx.textAlign = 'left';
  const mm = Math.max(2, Math.floor(180 / N)), mx0 = w - N * mm - 14, my0 = 14;
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(mx0 - 4, my0 - 4, N * mm + 8, N * mm + 8);
  D.seen = D.seen || {};
  const pr = 7, pxi = Math.floor(D.px), pyi = Math.floor(D.py);
  for (let j = -pr; j <= pr; j++) for (let i = -pr; i <= pr; i++) if (i * i + j * j <= pr * pr) D.seen[(pyi + j) * N + pxi + i] = 1;
  for (const k in D.seen) { const kk = +k, x = kk % N, y = Math.floor(kk / N); if (x >= 0 && y >= 0 && x < N && y < N && !solid(x, y)) { ctx.fillStyle = G.pool.has(kk) ? (lv ? '#e06020' : ic ? '#4a8ac0' : '#8aa040') : G.ice.has(kk) ? '#a8c8d8' : lk && lk.has(G.rm[kk]) ? '#8a9a90' : '#6a5a48'; ctx.fillRect(mx0 + x * mm, my0 + y * mm, mm, mm); } }
  ctx.fillStyle = '#ffe080'; ctx.fillRect(mx0 + G.ex * mm - 1, my0 + G.ey * mm - 1, mm + 2, mm + 2);
  if (wk) G.valves.forEach((v, i) => { if (D.seen[v.y * N + v.x]) { ctx.fillStyle = (D.vc || []).includes(i) ? '#60c060' : '#ff3030'; ctx.fillRect(mx0 + v.x * mm, my0 + v.y * mm, mm, mm); } });
  if (mine) for (const k of G.door) if (D.seen[k]) { ctx.fillStyle = D.mv[k] ? '#60c060' : '#e04030'; ctx.fillRect(mx0 + (k % N) * mm, my0 + Math.floor(k / N) * mm, mm, mm); }
  G.caches.forEach((c, i) => { if (D.seen[c.y * N + c.x] && !D.oc.includes(i)) { ctx.fillStyle = c.t === 'safe' || c.t === 'boss' ? '#ffd040' : '#c8a040'; ctx.fillRect(mx0 + c.x * mm, my0 + c.y * mm, mm, mm); } });
  for (const o of D.eggs) if (D.seen[Math.floor(o.y) * N + Math.floor(o.x)]) { ctx.fillStyle = '#e0e0b0'; ctx.fillRect(mx0 + Math.floor(o.x) * mm, my0 + Math.floor(o.y) * mm, mm, mm); }
  ctx.fillStyle = '#7fe0ff'; ctx.fillRect(mx0 + D.px * mm - 2, my0 + D.py * mm - 2, 4, 4);
  if (P.dead > 0) { ctx.fillStyle = 'rgba(40,0,0,0.5)'; ctx.fillRect(0, 0, w, h); }
}
const WPN = {
  rifle: { n: 'Rifle', am: 'cartridge', rk: 'rd', per: 10, dm: 12, hv: 12, cd: 0.2, r: PL_GUN },
  ap: { n: 'Rifle, AP rounds', am: 'ap_cartridge', rk: 'ra', per: 10, dm: 24, hv: 26, cd: 0.25, r: PL_GUN, arm: 2 },
  shotgun: { n: 'Pump Shotgun', am: 'shotshell', rk: 'rs', per: 8, dm: 18, hv: 24, cd: 0.7, r: 8, cone: 0.42, pel: 6, need: 'shotgun' },
  slug: { n: 'Pump Shotgun, slugs', am: 'slug_shell', rk: 'rs2', per: 8, dm: 55, hv: 50, cd: 0.7, r: 12, arm: 1.5, need: 'shotgun' },
  auto_shotgun: { n: 'Auto Shotgun', am: 'shotshell', rk: 'ra2', per: 8, dm: 18, hv: 24, cd: 0.28, r: 8, cone: 0.42, pel: 6, need: 'auto_shotgun' },
  lmg: { n: 'Light Machine Gun', am: 'ammo_belt', rk: 'rb', per: 50, dm: 10, hv: 10, cd: 0.08, r: PL_GUN, need: 'lmg' },
  marksman: { n: 'Marksman Rifle', am: 'match_round', rk: 'rm', per: 5, dm: 75, hv: 60, cd: 1.1, r: 22, arm: 1.5, need: 'marksman' },
  marksman_w: { n: 'Marksman Rifle, tungsten core', am: 'wcore_round', rk: 'rm2', per: 5, dm: 95, hv: 75, cd: 1.1, r: 22, arm: 3, need: 'marksman' },
  flechette: { n: 'Pump Shotgun, flechettes', am: 'flechette_shell', rk: 'rf', per: 8, dm: 12, hv: 18, cd: 0.7, r: 11, cone: 0.28, pel: 8, arm: 1.3, need: 'shotgun' },
  crossbow: { n: 'Crossbow', am: 'xbow_bolt', rk: 'rx', per: 1, dm: 24, hv: 18, cd: 1.0, r: 12, need: 'crossbow' },
  amr: { n: 'Anti-Materiel Rifle', am: 'wha_round', rk: 'rw', per: 5, dm: 160, hv: 120, cd: 2.2, r: 26, arm: 2.5, need: 'amr' },
  coilgun: { n: 'Coilgun', am: 'steel_slug', rk: 'rc', per: 10, dm: 40, hv: 30, cd: 0.45, r: 18, arm: 2, need: 'coilgun', en: 4000 },
  arc: { n: 'Arc Caster', am: 'spark_gap', rk: 'rq', per: 20, dm: 26, hv: 14, cd: 0.6, r: 7, need: 'arc_caster', en: 3000, ch: 3 },
  rotary: { n: 'Rotary Gun', am: 'ammo_belt', rk: 'rb2', per: 50, dm: 10, hv: 10, cd: 0.035, r: PL_GUN, need: 'rotary_gun', en: 60 },
};
const WORDER = ['rifle', 'ap', 'shotgun', 'slug', 'flechette', 'auto_shotgun', 'lmg', 'rotary', 'marksman', 'marksman_w', 'coilgun', 'crossbow', 'amr', 'arc'];
const ARMOR = {
  exoframe4: { a: 0.55, g: 14 },
  exoframe3: { a: 0.5, g: 12 },
  exoframe2: { a: 0.45, g: 10 },
  exoframe: { a: 0.35, g: 7 },
  blast_suit: { a: 0.68, s: 0.75 },
  heavy_carrier: { a: 0.48, g: 8, s: 0.9 },
  laminate_carrier: { a: 0.4, g: 6 },
  carrier: { a: 0.3, g: 5 },
  ceramic_vest: { a: 0.6 },
  steel_vest: { a: 0.42 },
  shell_vest: { a: 0.25 },
  mail_shirt: { a: 0.16 },
};
const EQ = {
  pv_film: { w: 1, h: 1, gen: 20 },
  tandem_film: { w: 1, h: 1, gen: 32 },
  ss_batt: { w: 1, h: 2, cap: 900000 },
  med_injector: { w: 1, h: 1 },
  batt_pack: { w: 1, h: 2, cap: 360000 },
  dmfc: { w: 2, h: 2, fc: 100 },
  exo_legs: { w: 2, h: 4, use: 150 },
  trauma_plate: { w: 2, h: 2, a: 0.12 },
  b4c_plate: { w: 2, h: 2, a: 0.15 },
  stf_pad: { w: 2, h: 2, a: 0.08 },
  sentry_arm: { w: 2, h: 2 },
  drill_arm: { w: 2, h: 2, use: 300 },
  aero_liner: { w: 2, h: 2 },
  thermal_sight: { w: 1, h: 1, use: 20 },
  coil_turret: { w: 2, h: 2 },
  knee_gen: { w: 1, h: 2, gen: 10 },
  sofc_pack: { w: 2, h: 2, fc: 300 },
  discharge_ring: { w: 2, h: 2 },
  supercap: { w: 1, h: 1, cap: 60000 },
  arm_brace: { w: 2, h: 2, use: 80 },
};
const NADE = {
  ammonal_charge: { r: 3.2, dm: 130, hv: 160, c: '#c8c8c0' },
  powder_charge: { r: 2.2, dm: 55, hv: 60, c: '#4a4844' },
};
const CMB = ['ap_cartridge', 'shotshell', 'shotgun', 'powder_charge', 'ammonal_charge', 'shell_vest', 'steel_vest', 'ceramic_vest', 'carrier', 'exoframe', 'exoframe2', 'pv_film', 'batt_pack', 'dmfc', 'meoh_cart', 'exo_legs', 'trauma_plate', 'stf_pad', 'sentry_arm', 'drill_arm', 'aero_liner', 'b4c_plate', 'crossbow', 'xbow_bolt', 'amr', 'wha_round', 'exoframe3', 'coil_turret', 'knee_gen', 'thermal_sight', 'thermal_cam', 'ultrasound_probe', 'surge_arrester', 'amorph_core', 'tig_electrode', 'mail_shirt', 'lmg', 'ammo_belt', 'marksman', 'match_round', 'coilgun', 'steel_slug', 'arc_caster', 'spark_gap', 'laminate_carrier', 'sofc_pack', 'supercap', 'slug_shell', 'rotary_gun', 'discharge_ring', 'tandem_film', 'hemostat', 'med_injector', 'blast_suit', 'ss_batt', 'flechette_shell', 'wcore_round', 'heavy_carrier', 'arm_brace', 'auto_shotgun', 'exoframe4'];
(() => {
  const { need, deps, L, xadd } = TKX;
  const its = new Set([...Object.values(WPN).map(w => w.need).filter(Boolean), ...Object.keys(ARMOR), ...Object.keys(EQ)].filter(k => !START_INV[k] && RECIPE[k] && need[k] < 1e9));
  const sub = (k, s, d) => { const r = RECIPE[k]; if (!r || d > 5) return; for (const q in r.i) { if (its.has(q)) s.add(q); else if (PARTS.includes(q) || CMB.includes(q)) sub(q, s, d + 1); } };
  for (const k of its) {
    const lt = need[k] + 1, lv = Math.max(1, Math.min(5, lt)), req = new Set();
    for (const b of deps(k)) if (TECH[b] && L[b] < lt) req.add(b);
    sub(k, req, 0); req.delete(k);
    const T = TECH[k] = { id: k, lv, req: [...req], n: PACKN[lv] + 2 * Math.min(10, req.size), ut: PACKT[lv], it: 1 };
    const E = EQ[k];
    xadd(k, T, E && (E.gen || E.cap || E.fc) ? 'sci_en' : k === 'med_injector' || k === 'hemostat' ? 'sci_bio' : 'sci_mil', lt);
    TECHL.push(k);
  }
  for (const k of its) { const T = TECH[k]; T.dir = T.req.filter(p => !T.req.some(q => q !== p && TECH[q] && TECH[q].req.includes(p))); }
  TECHL.sort((a, b) => TECH[a].lv - TECH[b].lv || nm(a).localeCompare(nm(b)));
})();
const nades = [];
const takeInv = k => { S.inv[k]--; if (!(S.inv[k] > 0)) delete S.inv[k]; };
function wpnHas(m) {
  const W = WPN[m], P = S.pl;
  if (W.need && !(S.inv[W.need] > 0)) return false;
  return m === 'rifle' || (P[W.rk] || 0) > 0 || S.inv[W.am] > 0;
}
function wpnCur() { const P = S.pl; if (!WPN[P.wm] || !wpnHas(P.wm)) P.wm = 'rifle'; return P.wm; }
const wpnRounds = m => (S.pl[WPN[m].rk] || 0) + (S.inv[WPN[m].am] || 0) * WPN[m].per;
function wpnCycle() {
  const P = S.pl, c = wpnCur(), i = WORDER.indexOf(c);
  for (let k = 1; k < WORDER.length; k++) {
    const m = WORDER[(i + k) % WORDER.length];
    if (wpnHas(m)) { P.wm = m; toast(`${WPN[m].n} · ${wpnRounds(m)} rounds`); return m; }
  }
  toast('Nothing else to switch to. Craft AP rounds, or another gun and its ammunition.', true);
  return c;
}
function wpnLoad(m, under) {
  const W = WPN[m], P = S.pl;
  if (P[W.rk] > 0) return true;
  if (S.inv[W.am] > 0) { takeInv(W.am); P[W.rk] = W.per; return true; }
  if (m !== 'rifle') { P.wm = 'rifle'; toast(`Out of ${nm(W.am).toLowerCase()}. Back to lead shot.`, true); return false; }
  if (S.t - noAmmoT > 3) { noAmmoT = S.t; toast(under ? 'Out of cartridges. Climb out and craft more in a workshop.' : 'Out of cartridges. Craft lead shot cartridges in a workshop.', true); }
  return false;
}
function wpnShot(ox, oy, list, hives, see, under, arm) {
  const P = S.pl, m = wpnCur(), W = WPN[m];
  const R = W.r * (eqN('thermal_sight') && eqOn() ? 1.25 : 1);
  let best = null, bd = R * R, h = null;
  for (const b of list) { const d = (b.x - ox) ** 2 + (b.y - oy) ** 2; if (b.hp > 0 && d < bd && (!see || see(b))) { bd = d; best = b; } }
  if (!best && hives) for (const o of hives) { const q = ctr(o), d = (q.x - ox) ** 2 + (q.y - oy) ** 2; if (d < bd) { bd = d; h = o; } }
  if (!best && !h) return null;
  if (W.en && !((P.arm?.en || 0) >= W.en)) { if (S.t - noAmmoT > 3) { noAmmoT = S.t; toast(`The ${W.n.toLowerCase()} needs ${W.en / 1000} kJ a shot. Wear armour with charged batteries.`, true); } return null; }
  if (!wpnLoad(m, under)) return null;
  const q = best || ctr(h), tx = q.x, ty = q.y, hits = [];
  if (best) {
    if (W.pel) {
      const a0 = Math.atan2(ty - oy, tx - ox), c = [];
      for (const b of list) {
        if (!(b.hp > 0)) continue;
        const dx = b.x - ox, dy = b.y - oy, d = Math.hypot(dx, dy);
        if (d > R) continue;
        let da = Math.abs(Math.atan2(dy, dx) - a0);
        if (da > Math.PI) da = Math.PI * 2 - da;
        if ((b === best || da < W.cone) && (!see || see(b))) c.push([d, b]);
      }
      c.sort((u, v) => u[0] - v[0]);
      for (const [d, b] of c.slice(0, W.pel)) { b.hp -= W.dm * (1 - 0.5 * d / R) * (arm(b) ? W.arm || 1 : 1); hits.push(b); }
    } else { best.hp -= W.dm * (arm(best) ? W.arm || 1 : 1); hits.push(best); }
    if (W.ch) {
      let cur = best, dm = W.dm;
      for (let k = 0; k < W.ch; k++) {
        let nx = null, nd = 12.25;
        for (const b of list) { const e = (b.x - cur.x) ** 2 + (b.y - cur.y) ** 2; if (b.hp > 0 && !hits.includes(b) && e < nd && (!see || see(b))) { nd = e; nx = b; } }
        if (!nx) break;
        dm *= 0.7; nx.hp -= dm; hits.push(nx); cur = nx;
      }
      P.ch = hits.map(b => [b.x, b.y]);
    }
  }
  P[W.rk]--; P.cd = W.cd * (eqN('arm_brace') && eqOn() ? 0.8 : 1);
  if (W.en) P.arm.en -= W.en;
  P.f = Math.atan2(ty - oy, tx - ox);
  P.sh = S.t; P.tx = tx; P.ty = ty; P.sw = m;
  if (W.pel && hits.filter(b => b.hp <= 0).length >= 3) P.sg3 = 1;
  return { hits, h, W };
}
function armWorn() { const A = S.pl.arm; return A && ARMOR[A.k] ? A.k : null; }
const eqN = k => { const A = S.pl.arm; return A ? A.g.filter(m => m.k === k).length : 0; };
function eqCap() { const A = S.pl.arm; return A && ARMOR[A.k].g ? 5000 + eqN('batt_pack') * EQ.batt_pack.cap + eqN('supercap') * EQ.supercap.cap + eqN('ss_batt') * EQ.ss_batt.cap : 0; }
const eqOn = () => (S.pl.arm?.en || 0) > 1;
function armRed() {
  const k = armWorn();
  if (!k) return 0;
  return Math.min(0.85, ARMOR[k].a + S.pl.arm.g.reduce((s, m) => s + (EQ[m.k]?.a || 0), 0));
}
function armSoak(d) { return d * (1 - armRed()); }
const eqSpd = () => (ARMOR[armWorn()]?.s || 1) * (eqOn() ? 1 + 0.3 * Math.min(2, eqN('exo_legs')) : 1);
const eqMine = () => eqOn() ? 1 + eqN('drill_arm') : 1;
function eqFits(A, k, x, y, skip) {
  const n = ARMOR[A.k].g, E = EQ[k];
  if (!n || x < 0 || y < 0 || x + E.w > n || y + E.h > n) return false;
  return !A.g.some((m, i) => i !== skip && x < m.x + EQ[m.k].w && m.x < x + E.w && y < m.y + EQ[m.k].h && m.y < y + E.h);
}
function eqPut(k, x, y) {
  const A = S.pl.arm;
  if (!A || !ARMOR[A.k].g) { toast('Wear armour with an equipment grid first', true); return false; }
  if (!(S.inv[k] > 0)) { toast('You have no ' + nm(k), true); return false; }
  if (!eqFits(A, k, x, y)) { toast('It does not fit there', true); return false; }
  takeInv(k); A.g.push({ k, x, y });
  return true;
}
function eqTake(i) {
  const A = S.pl.arm;
  if (!A || !A.g[i]) return;
  give(A.g[i].k, 1); A.g.splice(i, 1);
  A.en = Math.min(A.en || 0, eqCap());
}
function armWear(k) {
  const P = S.pl;
  if (!(S.inv[k] > 0) || !ARMOR[k]) return;
  armOff();
  takeInv(k); P.arm = { k, g: [], en: 0 };
}
function armOff() {
  const A = S.pl.arm;
  if (!A) return;
  for (const m of A.g) give(m.k, 1);
  give(A.k, 1); S.pl.arm = null;
}
function eqTick() {
  const P = S.pl, A = P.arm;
  if (!A || !ARMOR[A.k] || !ARMOR[A.k].g) return;
  const cap = eqCap();
  let gen = (S.dg ? 0 : eqN('pv_film') * EQ.pv_film.gen + eqN('tandem_film') * EQ.tandem_film.gen) + (P.mv && !P.car ? Math.min(2, eqN('knee_gen')) * EQ.knee_gen.gen : 0), use = 0;
  const fcs = eqN('dmfc');
  if (fcs && A.en < cap * 0.9) {
    if (!(P.fc > 0) && S.inv.meoh_cart > 0) { takeInv('meoh_cart'); P.fc = 450000; }
    if (P.fc > 0) { const f = fcs * EQ.dmfc.fc; gen += f; P.fc -= f * DT; }
  }
  const sos = eqN('sofc_pack');
  if (sos && A.en < cap * 0.9) {
    if (!(P.fc2 > 0) && S.inv.cng_cart > 0) { takeInv('cng_cart'); P.fc2 = 1800000; }
    if (P.fc2 > 0) { const f = sos * EQ.sofc_pack.fc; gen += f; P.fc2 -= f * DT; }
  }
  if (P.mv && !P.car) use += Math.min(2, eqN('exo_legs')) * EQ.exo_legs.use;
  if (mining && !S.dg) use += eqN('drill_arm') * EQ.drill_arm.use;
  use += Math.min(1, eqN('thermal_sight')) * EQ.thermal_sight.use;
  use += Math.min(1, eqN('arm_brace')) * EQ.arm_brace.use;
  A.en = Math.max(0, Math.min(cap, (A.en || 0) + (gen - use) * DT));
  if (S.dg || P.dead > 0 || P.car) return;
  if (eqN('med_injector') && !(P.dead > 0) && P.hp > 0 && P.hp < PL_HP / 3 && S.t >= (P.mcd || 0) && S.inv.hemostat > 0) { takeInv('hemostat'); P.hp = Math.min(PL_HP, P.hp + 80); P.mcd = S.t + 15; toast('Trauma injector fired: +80 health'); }
  P.dcd = (P.dcd || 0) - DT;
  if (eqN('discharge_ring') && P.dcd <= 0 && A.en >= 8000) {
    const nb = S.bugs.filter(b => b.hp > 0 && (b.x - P.x) ** 2 + (b.y - P.y) ** 2 < 6.25);
    if (nb.length) {
      for (const b of nb) { b.hp -= 30; if (b.hp <= 0) S.pk = (S.pk || 0) + 1; }
      A.en -= 8000; P.dcd = 2; P.dz = S.t;
    }
  }
  for (const T of TURRETS) {
    const sn = eqN(T.k);
    P[T.cd] = (P[T.cd] || 0) - DT;
    if (!sn || P[T.cd] > 0 || A.en < T.en) continue;
    let best = null, bd = T.r * T.r;
    for (const b of S.bugs) { const q = (b.x - P.x) ** 2 + (b.y - P.y) ** 2; if (b.hp > 0 && q < bd) { bd = q; best = b; } }
    if (!best) continue;
    if (!(P[T.rk] > 0)) { if (!(S.inv[T.am] > 0)) continue; takeInv(T.am); P[T.rk] = 10; }
    P[T.rk]--; A.en -= T.en; P[T.cd] = T.c / sn;
    best.hp -= T.dm;
    if (best.hp <= 0) S.pk = (S.pk || 0) + 1;
    P.st = S.t; P.stx = best.x; P.sty = best.y;
  }
}
const TURRETS = [
  { k: 'sentry_arm', am: 'cartridge', rk: 'sr', cd: 'scd', en: 250, r: 9, dm: 12, c: 0.6 },
  { k: 'coil_turret', am: 'steel_slug', rk: 'sr2', cd: 'scd2', en: 2500, r: 12, dm: 30, c: 1.2 },
];
const nadeKind = () => S.inv.ammonal_charge > 0 ? 'ammonal_charge' : S.inv.powder_charge > 0 ? 'powder_charge' : null;
function nadeThrow(tx, ty) {
  const P = S.pl;
  if (P.dead > 0 || (P.car && !S.dg) || (P.nc || 0) > S.t) return false;
  const k = nadeKind();
  if (!k) { toast('No charges to throw. Pack powder or ammonal charges in a workshop.', true); return false; }
  const ox = S.dg ? S.dg.px : P.x, oy = S.dg ? S.dg.py : P.y;
  let dx = tx - ox, dy = ty - oy, d = Math.hypot(dx, dy);
  if (d > 11) { dx *= 11 / d; dy *= 11 / d; d = 11; }
  if (S.dg) {
    let s = 0;
    while (s < d && !dgSolid(Math.floor(ox + dx * (s + 0.25) / d), Math.floor(oy + dy * (s + 0.25) / d))) s += 0.25;
    if (s < d) { dx *= s / d; dy *= s / d; d = s; }
  }
  takeInv(k);
  nades.push({ k, x: ox, y: oy, tx: ox + dx, ty: oy + dy, t: 0, T: 0.35 + d * 0.06, dg: !!S.dg, b: -1 });
  P.nc = S.t + 0.8;
  if (d > 0.1) P.f = Math.atan2(dy, dx);
  return true;
}
function nadeBoom(n) {
  const N = NADE[n.k];
  let kills = 0;
  const hit = b => {
    const d = Math.hypot(b.x - n.tx, b.y - n.ty);
    if (!(b.hp > 0) || d > N.r) return;
    b.hp -= N.dm * (1 - 0.6 * d / N.r); b.aw = 1;
    if (b.hp <= 0) kills++;
  };
  if (n.dg) {
    const D = S.dg;
    for (const b of D.bugs) if (dgSee(n.tx, n.ty, b.x, b.y)) hit(b);
    if (D.q.hp > 0 && !D.q.sub && dgSee(n.tx, n.ty, D.q.x, D.q.y)) { const k0 = kills; hit(D.q); kills = k0; }
    for (const o of D.eggs || []) if (dgSee(n.tx, n.ty, o.x, o.y)) { const k0 = kills; hit(o); kills = k0; }
    dfx.push({ x: n.tx, y: n.ty, t: 0, c: '#ffb347' });
  } else {
    for (const b of S.bugs) hit(b);
    for (const h of lists().hive) {
      const q = ctr(h), d = Math.hypot(q.x - n.tx, q.y - n.ty);
      if (d > N.r + 1) continue;
      h.lh = S.t;
      if (h.dc <= 0) { spawnBugs(h, 2 + Math.floor(S.evo * 3), -2); h.dc = 10; }
      hurt(h, N.hv * (1 - 0.5 * Math.max(0, d - 1) / N.r));
    }
    fx.push({ x: n.tx, y: n.ty, t: 0, c: '#ffb347' });
  }
  S.pk = (S.pk || 0) + kills;
  if (kills >= 5) S.pl.boom = 1;
}
function nadeTick() {
  for (let i = nades.length - 1; i >= 0; i--) {
    const n = nades[i];
    if (n.b >= 0) { n.b += DT; if (n.b > 0.5) nades.splice(i, 1); continue; }
    n.t += DT;
    if (n.t >= n.T) { if (n.dg === !!S.dg) nadeBoom(n); n.b = 0; }
  }
}
function drawNades(ox, oy, z, dg) {
  for (const n of nades) {
    if (n.dg !== dg) continue;
    if (n.b < 0) {
      const f = Math.min(1, n.t / n.T), x = ox + (n.x + (n.tx - n.x) * f) * z, y = oy + (n.y + (n.ty - n.y) * f) * z, hg = Math.sin(f * Math.PI) * Math.min(2.2, n.T * 2.4) * z;
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(x, y, z * 0.16, z * 0.08, 0, 0, 7); ctx.fill();
      ctx.save(); ctx.translate(x, y - hg); ctx.rotate(n.t * 14);
      ctx.fillStyle = NADE[n.k].c; ctx.fillRect(-z * 0.13, -z * 0.09, z * 0.26, z * 0.18);
      ctx.strokeStyle = '#222'; ctx.lineWidth = 1; ctx.strokeRect(-z * 0.13, -z * 0.09, z * 0.26, z * 0.18);
      ctx.fillStyle = Math.random() < 0.5 ? '#ffd24a' : '#ff7a2a'; ctx.beginPath(); ctx.arc(z * 0.17, -z * 0.1, z * 0.05, 0, 7); ctx.fill();
      ctx.restore();
    } else {
      const N = NADE[n.k], f = n.b / 0.5, X = ox + n.tx * z, Y = oy + n.ty * z, R = z * N.r * (0.4 + 0.6 * f);
      const g = ctx.createRadialGradient(X, Y, 0, X, Y, R);
      g.addColorStop(0, `rgba(255,250,225,${1 - f})`); g.addColorStop(0.35, `rgba(255,170,60,${0.85 * (1 - f)})`); g.addColorStop(0.75, `rgba(140,90,50,${0.5 * (1 - f)})`); g.addColorStop(1, 'rgba(60,50,40,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(X, Y, R, 0, 7); ctx.fill();
      ctx.strokeStyle = `rgba(255,220,160,${0.8 * (1 - f)})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(X, Y, z * N.r * f, 0, 7); ctx.stroke();
    }
  }
}
function drawWpnHud(w, h) {
  const P = S.pl;
  if (P.dead > 0 || (P.car && !S.dg)) return;
  const m = wpnCur(), W = WPN[m], ak = armWorn(), nk = nadeKind(), bx = 14, by = h - 70, bw = 236;
  ctx.fillStyle = 'rgba(14,16,20,0.8)'; ctx.beginPath(); ctx.roundRect(bx, by, bw, 58, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.textAlign = 'left'; ctx.fillStyle = '#e8e4d8'; ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText(W.n, bx + 10, by + 17);
  ctx.textAlign = 'right'; ctx.font = 'bold 13px ui-monospace, monospace'; ctx.fillStyle = wpnRounds(m) ? '#ffd27a' : '#e05a4a';
  ctx.fillText(wpnRounds(m) + ' rds', bx + bw - 10, by + 17);
  ctx.textAlign = 'left'; ctx.font = '11px system-ui, sans-serif'; ctx.fillStyle = '#9aa0a8';
  if (ak) {
    ctx.fillText(`${nm(ak)} · ${Math.round(armRed() * 100)}%`, bx + 10, by + 33);
    const cap = eqCap();
    if (cap) {
      const f = Math.min(1, (P.arm.en || 0) / cap);
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(bx + 168, by + 26, 58, 8);
      ctx.fillStyle = f > 0.25 ? '#e0d04a' : '#e04a4a'; ctx.fillRect(bx + 168, by + 26, 58 * f, 8);
    }
  } else ctx.fillText('No armour · P to wear', bx + 10, by + 33);
  ctx.fillStyle = '#9aa0a8';
  ctx.fillText(nk ? `${nm(nk)} ×${S.inv[nk]}` : 'No charges', bx + 10, by + 48);
  ctx.textAlign = 'right'; ctx.fillStyle = '#6a7078'; ctx.font = '10px system-ui, sans-serif';
  ctx.fillText('X switch · G throw', bx + bw - 10, by + 48);
  ctx.textAlign = 'left';
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
    if (k === 'hive' || k === 'belt' || k === 'road' || k === 'rail' || k === 'ruin' || (pick && !pick(e))) continue;
    const c = ctr(e), d = (c.x - x) ** 2 + (c.y - y) ** 2;
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}
let gearC = 0, gearCt = -9;
function gearT() {
  if (Math.abs(S.t - gearCt) < 2) return gearC;
  gearCt = S.t;
  let best = 0;
  for (const m in WPN) {
    const W = WPN[m];
    if (m !== 'rifle' && !wpnHas(m)) continue;
    best = Math.max(best, W.dm * (W.pel || 1) * (W.ch ? 2 : 1) * (W.arm ? 1.2 : 1) / W.cd);
  }
  const w = Math.max(0, Math.min(1, Math.log2(best / 60) / 4));
  gearC = 0.55 * w + 0.45 * Math.min(1, armRed() / 0.75);
  return gearC;
}
function bugKind(h) {
  const u = Math.random(), t = h.tier || 2, gt = gearT();
  if (gt > 0.55 && t >= 2 && u < 0.05 + 0.2 * (gt - 0.55)) return 4;
  if (gt > 0.25 && u < 0.1 + 0.35 * (gt - 0.25)) return 3;
  if (S.evo > 0.45 && t >= 2 && u < 0.08 + 0.3 * (S.evo - 0.45)) return 2;
  if (S.evo > 0.2 && u < 0.15 + 0.35 * S.evo) return 1;
  return 0;
}
function spawnBugs(h, n, tid) {
  const c = ctr(h);
  for (let i = 0; i < n && S.bugs.length < MAX_BUGS; i++) {
    const a = Math.random() * Math.PI * 2, k = bugKind(h), mhp = Math.round(30 * (1 + 2 * S.evo) * (1 + 1.2 * gearT()) * BUGK[k].hp);
    const b = { x: c.x + Math.cos(a) * 1.4, y: c.y + Math.sin(a) * 1.4, hp: mhp, mhp, tid, hx: c.x, hy: c.y, a, cd: 0, ph: Math.random() * 7, bt: S.t };
    if (k) b.k = k;
    if (tid === -3) b.hid = h.id;
    S.bugs.push(b);
  }
}
function launch(h) {
  const c = ctr(h);
  const t = nearestEnt(c.x, c.y, 90, e => e.pt != null && S.t - e.pt < 30) || nearestEnt(c.x, c.y, 90, e => kind(e) === 'machine');
  if (!t) return;
  h.food -= 50;
  h.sw++;
  spawnBugs(h, Math.round(Math.min(10, 3 + Math.floor(S.evo * 8)) * htier(h).sw), t.id);
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
  if (best) addHive(best.x, best.y, 1);
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
    h.gr = (h.gr || 0) + got;
    const T = htier(h);
    if (T.gr && h.gr >= T.gr) { const m0 = maxHp(h); h.tier = (h.tier || 2) + 1; h.gr = 0; h.hp = (h.hp ?? m0) + maxHp(h) - m0; }
    guardStep(h);
    if (!(S.t - (h.lh || -99) < 15)) h.hp = Math.min(maxHp(h), h.hp + 2);
    h.dc = Math.max(0, h.dc - 1);
    if (h.food >= 50) launch(h);
  }
}
function guardStep(h) {
  const P = S.pl, c = ctr(h), pd = Math.hypot(P.x - c.x, P.y - c.y);
  let n = 0;
  if (pd > 70) { for (let i = S.bugs.length - 1; i >= 0; i--) if (S.bugs[i].hid === h.id) S.bugs.splice(i, 1); return; }
  for (const b of S.bugs) if (b.hid === h.id) n++;
  if (pd < 40 && !(P.dead > 0) && !S.dg && n < htier(h).gd && !(h.gt > S.t)) { spawnBugs(h, 1, -3); h.gt = S.t + 5; }
}
function spitStep() {
  const P = S.pl;
  for (let i = spits.length - 1; i >= 0; i--) {
    const s = spits[i], dx = s.tx - s.x, dy = s.ty - s.y, d = Math.hypot(dx, dy), st = 7 * DT;
    s.t = (s.t || 0) + DT;
    if (d > st && s.t < 3) { s.x += dx / d * st; s.y += dy / d * st; continue; }
    spits.splice(i, 1);
    fx.push({ x: s.tx, y: s.ty, t: 0.35, c: '#9ad040' });
    if (s.p === -1) { if (Math.hypot(P.x - s.tx, P.y - s.ty) < 0.8) plHurt(s.d); }
    else { const e = ents.get(s.p); if (e) hurt(e, s.d); }
  }
}
function bugStep() {
  const sp = BUG_V * DT, dmg = 6 * (1 + S.evo) * DT, P = S.pl, gm = 1 + gearT();
  for (let i = S.bugs.length - 1; i >= 0; i--) {
    const b = S.bugs[i];
    if (b.hp <= 0) { S.bugs.splice(i, 1); S.kills = (S.kills || 0) + 1; fx.push({ x: b.x, y: b.y, t: 0.5, c: '#a0c040' }); continue; }
    let t = b.tid > 0 ? ents.get(b.tid) : null;
    if (!t && b.tid > 0) { t = nearestEnt(b.x, b.y, 25); b.tid = t ? t.id : -1; }
    let tx = b.hx, ty = b.hy, cr = b.tid === -2 ? 40 : 7;
    if (t) { const c = ctr(t); tx = c.x; ty = c.y; }
    const K = BUGK[b.k || 0];
    if (b.tid === -3) {
      const h = ents.get(b.hid);
      if (!h) { b.tid = -2; b.hid = 0; b.bt = S.t; cr = 40; }
      else {
        b.bt = S.t;
        tx = b.hx + Math.cos(S.t * 0.4 + b.ph) * 2.8; ty = b.hy + Math.sin(S.t * 0.4 + b.ph) * 2.8;
        const ang = S.t - (h.lh || -99) < 6;
        cr = Math.hypot(P.x - b.hx, P.y - b.hy) < (ang ? 34 : 16) ? (ang ? 34 : 10) : 0;
      }
    }
    const pd = P.dead > 0 || S.dg ? 1e9 : Math.hypot(P.x - b.x, P.y - b.y), chase = pd < cr;
    if (b.tid === -2 && P.dead > 0) b.tid = -1;
    if (chase) { tx = P.x; ty = P.y; if (pd < 0.7 && !K.rng) { b.a = Math.atan2(P.y - b.y, P.x - b.x); b.chew = 0; plHurt(dmg * 2 * K.dm * gm); continue; } }
    if (K.rng && (chase || t)) {
      const sd = Math.hypot(tx - b.x, ty - b.y);
      if (sd < K.rng + (chase ? 0 : 0.6)) {
        b.a = Math.atan2(ty - b.y, tx - b.x); b.chew = 0; b.cd = (b.cd || 0) - DT;
        if (b.cd <= 0) { b.cd = 1.6; spits.push({ x: b.x, y: b.y, tx, ty, p: chase ? -1 : t.id, d: 12 * (1 + S.evo) * (chase ? gm : 1) }); }
        continue;
      }
    }
    const dx = tx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy);
    if ((!t && !chase && d < 1 && b.tid !== -3) || S.t - (b.bt ?? S.t) > BUG_LIFE) { S.bugs.splice(i, 1); continue; }
    if (d < 1e-3) continue;
    b.a = Math.atan2(dy, dx);
    const wob = Math.sin(S.t * 5 + b.ph) * 0.35;
    const ux = dx / d - dy / d * wob, uy = dy / d + dx / d * wob;
    const tryMove = (nx, ny) => {
      const X = Math.floor(nx), Y = Math.floor(ny);
      if (X < 0 || Y < 0 || X >= W || Y >= H || terrain[Y * W + X] === 1 || terrain[Y * W + X] === 4) return 'water';
      const o = at(X, Y);
      if (o && kind(o) === 'ruin') return 'water';
      if (o && kind(o) !== 'belt' && kind(o) !== 'road' && kind(o) !== 'rail' && kind(o) !== 'hive' && !(Math.floor(b.x) === X && Math.floor(b.y) === Y)) return o;
      b.x = nx; b.y = ny;
      return null;
    };
    const v = sp * K.v;
    let r = tryMove(b.x + ux * v, b.y + uy * v);
    if (r === 'water') r = tryMove(b.x + Math.sign(ux) * v, b.y) && tryMove(b.x, b.y + Math.sign(uy) * v) && tryMove(b.x - uy * v, b.y + ux * v);
    b.chew = r && r !== 'water' ? r.id : 0;
    if (b.chew) hurt(r, dmg * K.dm);
  }
  spitStep();
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
  if (src && dst && isNode(src) && src.fl && src.amt > 0.001 && ugOk(src, e) && (!isNode(dst) || ugOk(dst, e))) {
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
      if (o && isNode(o) && (o.fl === f || (f === 'water' && o.fl === 'bfw')) && o.amt > 0 && ugOk(o, e)) {
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
      if (isNode(o)) { if (ugOk(o, e)) e.fo[f] -= nodeGive(o, f, e.fo[f], e.type === 'boiler' ? 7 : 5); }
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
    if (isNode(o)) { if (ugOk(o, e)) left -= nodeGive(o, 'water', left, 8, AMB); }
    else if (kind(o) === 'machine') left -= fluidToMachine(o, 'water', left);
    if (left <= 0) break;
  }
  e.on = left < PUMP_RATE;
}

const FOREST_R = 4, FOREST_FULL = 50;
function nearRock(x, y, B) {
  for (let j = y - 6; j < y + B.h + 6; j++) for (let i = x - 6; i < x + B.w + 6; i++) if (i >= 0 && j >= 0 && i < W && j < H && terrain[j * W + i] === 4) return true;
  return false;
}
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
const windCurve = (m = 1) => S.wind.v * m < 0.1 ? 0 : Math.min(1, Math.pow(S.wind.v * m / 0.5, 3));
const SOIL = [1, 0, 0.4, 0.05, 0, 0.35, 0.1, 0.1];
function soilAt(x, y, w, h) { let a = 0; for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) a += SOIL[terrain[(y + j) * W + x + i]] || 0; return a / (w * h); }
function soilOf(e) { if (e.sl == null) e.sl = soilAt(e.x, e.y, BUILD[e.type].w, BUILD[e.type].h); return e.sl; }
const TIDE_T = 300, tideOf = () => Math.abs(Math.sin(S.t * Math.PI / TIDE_T)) ** 3;
const sunMul = e => BUILD[e.type].tide ? tideOf() : BUILD[e.type].soil ? soilOf(e) : BUILD[e.type].sun ? sunOf(e) : BUILD[e.type].wind ? exposureOf(e) * windCurve(BUILD[e.type].sea ? 1.25 : 1) : 1;
function tryStart(e, r) {
  if (r.well && !wellTiles(e).length) return 'empty';
  if (BUILD[e.type].forest && !forestOf(e)) return 'forest';
  if (e.desc > 0) return 'clean';
  if (e.type === 'boiler' && e.scale >= 1) return 'scale';
  if (r.catReq && !(e.catK === r.cat && e.ca > 0)) return r.wear ? 'elem' : 'fuel';
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
  if (r.id === 'study') labDone(e);
  if (r.sea) S.osh = (S.osh || 0) + 1;
  if (r.id === 'hrsg_steam') S.hrsg = (S.hrsg || 0) + 1;
  if (r.id === 'geo_flash') S.geo = (S.geo || 0) + 1;
  if (r.id === 'dle') S.dle = (S.dle || 0) + 1;
  if (r.id === 'masterbatch_nr') S.nrt = (S.nrt || 0) + 1;
  if (r.o) for (const k in r.o) { e.out[k] = (e.out[k] || 0) + r.o[k]; S.made[k] = (S.made[k] || 0) + r.o[k]; }
  if (r.ch) for (const k in r.ch) if (Math.random() < r.ch[k]) { e.out[k] = (e.out[k] || 0) + 1; S.made[k] = (S.made[k] || 0) + 1; }
  if (r.fo) for (const f in r.fo) {
    e.fo[f] = (e.fo[f] || 0) + r.fo[f];
    const cap = foCap(r, f);
    if (spills(r, f) && e.fo[f] > cap) { vent(e, f, e.fo[f] - cap); e.fo[f] = cap; }
    if (BUILD[e.type].gen && !BUILD[e.type].ex) { vent(e, f, e.fo[f]); e.fo[f] = 0; }
  }
}

const solid = i => oreType[i] && !ORES[oreType[i]].fluid;
const choppable = i => !oreType[i] && terrain[i] === 6;
const oily = i => oreType[i] && ORES[oreType[i]].fluid;
function minerOre(e) {
  const B = BUILD[e.type];
  for (let j = 0; j < B.h; j++) for (let i = 0; i < B.w; i++) if (solid((e.y + j) * W + e.x + i)) return true;
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
  const B = BUILD[e.type], n = B.w * B.h;
  for (let t = 0; t < n; t++) {
    const q = (e.k + t) % n, i = (e.y + Math.floor(q / B.w)) * W + e.x + q % B.w;
    if (!solid(i)) continue;
    const item = ORES[oreType[i]].item;
    depleteTile(i);
    e.out[item] = (e.out[item] || 0) + 1;
    S.made[item] = (S.made[item] || 0) + 1;
    e.k = (q + 1) % n;
    return;
  }
}
function depleteTile(i) {
  if (S.gen && S.gen.inf) return;
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
  if (S.tk % 30 === 15) achCheck();
  if (rgd && S.tk % 15 === 0) { growNear(S.pl.x, S.pl.y, 200, 1); if (camFree) growNear(cam.x, cam.y, 120, 1); }
  if (S.tk % 3 === 0) { cloudStep(DT * 3); fireStep(DT * 3); }
  shellStep();
  if (S.cq && S.cq.length) cqStep(DT);
  for (const e of l.projector) projectorTick(e);
  for (const e of l.gun) gunTick(e);
  for (const e of l.stack) e.puff = (e.puff || 0) * 0.985;
  BT++; for (const b of l.belt) beltTick(b);
  for (const b of l.ubelt) ubTick(b);
  for (const s of l.splitter) splitTick(s);
  for (const s of l.sorter) sorterTick(s);
  for (const e of l.inserter) insTick(e, BUILD[e.type].kw ? (e.psat ?? 1) : 1);
  for (const p of l.pump) pumpTick(p);
  for (const e of l.booster) boosterTick(e);
  bugStep();
  for (const e of l.turret) turretTick(e);
  fluidStep(l.pairs);
  const fails = [];
  for (const e of l.node) nodeHeat(e, fails);
  const msgs = fails.map(([e, why]) => burst(e, why)).filter(Boolean);
  if (msgs.length) toast(msgs[0] + (msgs.length > 1 ? ` (+${msgs.length - 1} more)` : ''), true);
  const nets = l.nets, nop = netNew(-1);
  nop.sat = 0;
  const net = e => e.pn >= 0 && nets[e.pn] || nop;
  for (const n of nets) Object.assign(n, { demand: 0, cap: 0, bout: 0, bch: 0, bmax: 0, chg: 0, dis: 0, spare: 0 });
  for (const e of l.booster) if (e.on) net(e).demand += BUILD.booster.kw;
  for (const e of l.inserter) if (e.mv) net(e).demand += BUILD[e.type].kw || 0;
  for (const e of l.machine) {
    if (BUILD[e.type].store) { e.cy = false; continue; }
    if (BUILD[e.type].lab) e.recipe = 'study';
    const r = RECIPE[e.recipe];
    if (!r) { e.st = 'none'; continue; }
    machineFluidIn(e, r);
    if (r.cat) catSwap(e, r);
    if (!e.cy) e.st = (BUILD[e.type].lab ? labStart(e) : tryStart(e, r)) || 'work';
    if (e.cy && BUILD[e.type].kw) net(e).demand += BUILD[e.type].kw;
    if (e.desc > 0) e.desc = Math.max(0, e.desc - DT);
    if (e.desc === 0) { e.desc = undefined; e.scale = 0; }
  }
  for (const e of l.miner) {
    e.cy = sum(e.out) < 5 && minerOre(e);
    e.st = e.cy ? 'work' : minerOre(e) ? 'output' : 'empty';
    if (e.cy) net(e).demand += BUILD[e.type].kw;
  }
  for (const e of l.machine) if (e.cy && BUILD[e.type].gen) net(e).cap += BUILD[e.type].gen * sunMul(e);
  for (const g of l.engine) { g.eff = g.amt > 0.01 && g.tf >= 99.9 ? 0.2 + 0.8 * Math.max(0, Math.min(1, (g.tf - 100) / 50)) : 0; g.cap = g.pn >= 0 ? Math.min(1, g.amt) * 900 * g.eff : 0; net(g).cap += g.cap; }
  const bats = l.machine.filter(e => BUILD[e.type].store);
  for (const b of bats) { b.ch = b.ch || 0; b.dmax = b.pn >= 0 && !BUILD[b.type].tc ? Math.min(BUILD[b.type].rate, b.ch / DT) : 0; net(b).bout += b.dmax; }
  for (const n of nets) { n.dis = Math.min(Math.max(0, n.demand - n.cap), n.bout); n.spare = Math.max(0, n.cap - n.demand); }
  for (const b of bats) {
    const B = BUILD[b.type], n = net(b);
    if (n === nop) { b.kw = 0; b.st = 'nopole'; continue; }
    const d = n.bout > 0 ? n.dis * b.dmax / n.bout : 0;
    const ef = B.eff || 0.85, c = Math.max(0, Math.min(B.rate, (B.store - b.ch) / DT / ef, n.spare));
    n.spare -= c; n.chg += c;
    b.ch = Math.max(0, Math.min(B.store, b.ch - d * DT + c * DT * ef));
    b.kw = d - c;
    b.st = d > 0.01 ? 'work' : c > 0.01 ? 'charge' : b.ch >= B.store - 1e-6 ? 'full' : 'idle';
    n.bch += b.ch; n.bmax += B.store;
  }
  let pg = 0, pd = 0, pc = 0, pb = 0, pm = 0, pk = 0;
  for (const n of nets) {
    n.gen = Math.min(n.demand, n.cap + n.dis); n.sat = n.demand > 0 ? n.gen / n.demand : 1;
    n.load = n.cap > 0 ? Math.min(1, (Math.min(n.demand, n.cap) + n.chg) / n.cap) : 0;
    n.bat = n.bch; n.bkw = n.dis - n.chg;
    pg += n.gen; pd += n.demand; pc += n.cap; pb += n.bch; pm += n.bmax; pk += n.bkw;
  }
  for (const g of l.engine) { g.kw = net(g).load * g.cap; g.amt = Math.max(0, g.amt - (g.eff > 0 ? g.kw / 900 / g.eff : 0)); }
  S.power = { gen: pg, demand: pd, cap: pc, sat: pd > 0 ? pg / pd : 1, bat: pb, bmax: pm, bkw: pk, nets: nets.length, nc: l.nc || 0 };
  for (const e of l.booster) e.sat = net(e).sat;
  for (const e of l.inserter) e.psat = net(e).sat;
  for (const e of l.machine) {
    if (!e.cy) continue;
    const r = RECIPE[e.recipe], kw = BUILD[e.type].kw, gn = BUILD[e.type].gen, n = net(e);
    const sp = kw ? n.sat : gn ? n.load : 1;
    if (kw && n.sat < 0.05) e.st = n === nop ? 'nopole' : 'power';
    else if (kw && (e.st === 'power' || e.st === 'nopole')) e.st = 'work';
    if (gn) { e.kw = gn * sunMul(e) * n.load; e.st = n === nop ? 'nopole' : n.load < 0.01 ? 'idle' : 'work'; }
    e.prog += DT * sp * (BUILD[e.type].ms || 1) * catMul(e, r) * scaleMul(e) * forestMul(e) * sunMul(e) / (r.id === 'study' ? (TECH[e.rt] ? TECH[e.rt].ut : 5) / (BUILD[e.type].ls || 1) : r.t);
    if (e.prog >= 1) finish(e, r);
  }
  for (const e of l.miner) {
    if (!e.cy) continue;
    const n = net(e);
    if (n.sat < 0.05) e.st = n === nop ? 'nopole' : 'power';
    else if (e.st === 'power' || e.st === 'nopole') e.st = 'work';
    e.prog += DT * n.sat / (BUILD[e.type].mt || MINER_T);
    if (e.prog >= 1) { e.prog -= 1; minerDig(e); }
  }
  for (const e of l.machine) { machineFluidOut(e); pushItems(e, e.out, 'machine'); }
  for (const e of l.miner) pushItems(e, e.out, 'machine');
  for (const e of l.chest) if (e.type === 'chest') pushItems(e, e.store, 'chest');
  if (l.chest.some(e => e.type === 'depot') && (S.orders || []).length < 3 && Math.floor(S.t * 30) % 30 === 0) fillOrders();
  carTick();
  trainTick();
  if (S.dg) dgTick();
  nadeTick();
  eqTick();
  plTick();
  if (mining && !S.dg) {
    const i = mining.y * W + mining.x;
    if (!mouse.l || tool || !(solid(i) || choppable(i)) || occ[i] || mouse.tx !== mining.x || mouse.ty !== mining.y || !inReach(mining.x + 0.5, mining.y + 0.5, MINE_REACH)) mining = null;
    else if ((mining.p += DT * eqMine() / (oreType[i] ? 0.5 : 1.2)) >= 1) {
      mining.p = 0;
      const item = oreType[i] ? ORES[oreType[i]].item : 'wood';
      if (oreType[i]) depleteTile(i);
      give(item, 1);
      S.made[item] = (S.made[item] || 0) + 1;
    }
  }
}

function walkable(x, y) {
  if (x < 0 || y < 0 || x >= W || y >= H) return false;
  const t = terrain[y * W + x];
  if (t === 1 || t === 4) return false;
  const o = at(x, y);
  return !o || kind(o) === 'belt' || kind(o) === 'pipe' || kind(o) === 'road' || kind(o) === 'rail';
}
function spawnPt() {
  const cx = Math.floor(W / 2), cy = Math.floor(H / 2);
  for (let r = 0; r < W / 2; r++) for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
    if (Math.max(Math.abs(i), Math.abs(j)) !== r) continue;
    if (walkable(cx + i, cy + j) && walkable(cx + i + 1, cy + j) && walkable(cx + i, cy + j + 1)) return { x: cx + i + 0.5, y: cy + j + 0.5 };
  }
  return { x: cx + 0.5, y: cy + 0.5 };
}
function newPl() { return Object.assign(spawnPt(), { f: Math.PI / 2, wk: 0, hp: PL_HP, rd: 0 }); }
function plFree(x, y) {
  return !S.cars.some(v => v.id !== S.pl.car && inCar(v, x, y, PL_R)) && !S.trains.some(t => t.id !== S.pl.car && t.g && t.g.some(g => inTcar(g, x, y, PL_R))) && walkable(Math.floor(x - PL_R), Math.floor(y - PL_R)) && walkable(Math.floor(x + PL_R), Math.floor(y - PL_R)) && walkable(Math.floor(x - PL_R), Math.floor(y + PL_R)) && walkable(Math.floor(x + PL_R), Math.floor(y + PL_R));
}
const TSPD = { 5: 0.8, 6: 0.6, 7: 0.85 };
function plMove(dt, mx, my) {
  const P = S.pl;
  P.mv = false;
  if (P.dead > 0 || P.car) return false;
  let left = dt;
  while (left > 1e-6) {
    const h = Math.min(0.04, left); left -= h;
    const tx = Math.floor(P.x), ty = Math.floor(P.y), o = at(tx, ty);
    let vx = 0, vy = 0;
    if (mx || my) {
      const l = Math.hypot(mx, my), v = PL_V * eqSpd() * (o && (kind(o) === 'road' || kind(o) === 'rail') ? 1.1 : TSPD[terrain[ty * W + tx]] || 1);
      vx = mx / l * v; vy = my / l * v;
      if (S.t - (P.sh || -9) > 0.4) P.f = Math.atan2(my, mx);
      P.wk += h * v * 2.4; P.mv = true;
    }
    if (o && kind(o) === 'belt') { vx += DX[o.dir] * BUILD[o.type].v; vy += DY[o.dir] * BUILD[o.type].v; }
    if (!vx && !vy) break;
    const nx = P.x + vx * h, ny = P.y + vy * h;
    if (!plFree(P.x, P.y) || plFree(nx, ny)) { P.x = nx; P.y = ny; }
    else if (plFree(nx, P.y)) P.x = nx;
    else if (plFree(P.x, ny)) P.y = ny;
    P.x = Math.max(PL_R, Math.min(W - PL_R, P.x)); P.y = Math.max(PL_R, Math.min(H - PL_R, P.y));
  }
  return P.mv;
}
function inReach(x, y, r) { const P = S.pl; return !(P.dead > 0) && Math.hypot(x - P.x, y - P.y) <= r; }
function entReach(e, r) {
  const B = BUILD[e.type], P = S.pl;
  const cx = Math.max(e.x, Math.min(e.x + B.w, P.x)), cy = Math.max(e.y, Math.min(e.y + B.h, P.y));
  return inReach(cx, cy, r);
}
function plHurt(d) {
  const P = S.pl;
  if (P.dead > 0 || S.dg) return;
  if (P.car && trainOf(P.car)) return;
  const cv0 = P.car && carOf(P.car);
  if (cv0) { cv0.hp -= d; cv0.lh = S.t; if (cv0.hp <= 0) carWreck(cv0); return; }
  d = armSoak(d);
  P.hp -= d; P.lh = S.t;
  if (P.hp <= 0) {
    P.hp = 0; P.dead = 6; mining = null;
    fx.push({ x: P.x, y: P.y, t: 0, c: '#d07a2a' });
    toast('The crawlers got you. You will wake up back at the landing site.', true);
  }
}
function plShoot() {
  const P = S.pl;
  if (P.dead > 0 || P.cd > 0) return;
  const r = wpnShot(P.x, P.y, S.bugs, lists().hive, null, 0, b => b.k >= 2);
  if (!r) return;
  for (const b of r.hits) if (b.hp <= 0) S.pk = (S.pk || 0) + 1;
  if (r.h) {
    const h = r.h;
    if (h.dc <= 0) { spawnBugs(h, 2 + Math.floor(S.evo * 3), -2); h.dc = 10; }
    h.lh = S.t;
    hurt(h, r.W.hv);
  }
}
function plTick() {
  const P = S.pl;
  if (S.dg) return;
  if (P.dead > 0) {
    P.dead -= DT;
    if (P.dead <= 0) { P.dead = 0; Object.assign(P, spawnPt()); P.hp = PL_HP; P.lh = S.t; camFree = false; toast('You wake up back at the landing site.'); }
    return;
  }
  P.cd = Math.max(0, (P.cd || 0) - DT);
  if (S.t - (P.lh ?? -99) > 8) P.hp = Math.min(PL_HP, P.hp + 8 * DT);
  if (keys[' ']) plShoot();
}

const carOf = id => S.cars.find(v => v.id === id);
function inCar(v, x, y, pad) {
  const V = VEH[v.type], dx = x - v.x, dy = y - v.y, c = Math.cos(v.a), s = Math.sin(v.a);
  return Math.abs(dx * c + dy * s) < V.hl + pad && Math.abs(dy * c - dx * s) < V.hw + pad;
}
const carAt = (x, y) => S.cars.find(v => inCar(v, x, y, 0.05));
function carHit(v, x, y, a) {
  const V = VEH[v.type], c = Math.cos(a), s = Math.sin(a);
  for (const [l, w] of [[1, 1], [1, -1], [-1, 1], [-1, -1], [0, 1], [0, -1], [1, 0], [-1, 0], [0.5, 1], [-0.5, 1], [0.5, -1], [-0.5, -1]]) {
    const X = Math.floor(x + c * V.hl * l - s * V.hw * w), Y = Math.floor(y + s * V.hl * l + c * V.hw * w);
    if (!(V.sea ? floats(X, Y) : walkable(X, Y))) return { x: X, y: Y };
  }
  for (const o of S.cars) if (o !== v && Math.hypot(o.x - x, o.y - y) < VEH[o.type].hl + V.hw + 0.1 && (inCar(o, x, y, V.hw) || inCar(v, o.x, o.y, VEH[o.type].hw))) return { car: o };
  for (const t of S.trains) for (const g of t.g || []) if (Math.hypot(g.x - x, g.y - y) < 2.4 && (inTcar(g, x, y, V.hw) || [[1, 1], [1, -1], [-1, 1], [-1, -1]].some(([l, w]) => inTcar(g, x + c * V.hl * l - s * V.hw * w, y + s * V.hl * l + c * V.hw * w, 0)))) return { train: t };
  const P = S.pl;
  if (P.car !== v.id && !(P.dead > 0)) {
    const dx = P.x - x, dy = P.y - y;
    if (Math.abs(dx * c + dy * s) < V.hl + PL_R && Math.abs(dy * c - dx * s) < V.hw + PL_R) return { pl: 1 };
  }
  return null;
}
function carSlots(v) { let n = 0; for (const k in v.tr) n += Math.ceil(v.tr[k] / stk(k)); return n; }
function refuel(v, quiet) {
  if (v.fc > 0) { v.fc--; v.e = (v.e || 0) + CAN_MJ; return true; }
  if (S.inv.jerrycan > 0) { S.inv.jerrycan--; v.e = (v.e || 0) + CAN_MJ; if (!quiet) toast('You pour a jerrycan of diesel into the tank.'); renderHotbar(); return true; }
  if (!quiet && S.t - noFuelT > 3) { noFuelT = S.t; toast('Out of fuel. Fill jerrycans with diesel at a cylinder filler.', true); }
  return false;
}
function carCharge(v) {
  const V = VEH[v.type];
  if (Math.abs(v.v) > 0.2 || v.e >= V.cap) return;
  for (const e of lists().machine) {
    const B = BUILD[e.type];
    if (!B.tc || !(e.ch > 0) || Math.hypot(e.x + B.w / 2 - v.x, e.y + B.h / 2 - v.y) > 3) continue;
    const m = Math.min(B.rate * DT, e.ch, (V.cap - (v.e || 0)) * 1000);
    e.ch -= m; v.e = (v.e || 0) + m / 1000;
    if (v.e >= V.cap) return;
  }
}
function carWreck(v) {
  const P = S.pl;
  for (let i = 0; i < 4; i++) fx.push({ x: v.x + (Math.random() - 0.5), y: v.y + (Math.random() - 0.5), t: 0, c: '#e08a2a' });
  S.cars = S.cars.filter(o => o !== v);
  if (selCar === v.id) closePanel();
  if (P.car === v.id) { P.car = null; P.hp = Math.max(1, P.hp - 60); P.lh = S.t; }
  toast('The ' + nm(v.type).toLowerCase() + ' is wrecked. Its cargo is lost.', true);
}
function carStep(v, thr, steer) {
  const V = VEH[v.type], X = Math.floor(v.x), Y = Math.floor(v.y), o = at(X, Y);
  const cap = V.sea ? Math.min(v.net ? 6 : 99, V.vmax * (1 - 0.4 * (v.foul || 0))) : V.vmax * (o && kind(o) === 'road' ? 1 : VSPD[terrain[Y * W + X]] ?? 0.6);
  if (thr && V.el && !(v.e > 0) && S.pl.car === v.id && S.t - noFuelT > 3) { noFuelT = S.t; toast('Batteries flat. Push it within three tiles of a megawatt charger.', true); }
  if (thr && !V.oar && !V.el && !(v.e > 0)) { if (v.auto && S.pl.car !== v.id) { if (v.fc > 0) { v.fc--; v.e = (v.e || 0) + CAN_MJ; } } else refuel(v); }
  const fuel = V.oar || v.e > 0, same = thr && Math.sign(thr) === Math.sign(v.v || thr);
  if (thr && !same) { v.v += thr * V.acc * 1.8 * DT; if (V.el && Math.abs(v.v) > 1) v.e = Math.min(V.cap, (v.e || 0) + V.burn * 0.45 * DT); }
  else if (thr && fuel) { v.v += thr * V.acc * (thr < 0 ? 0.5 : 1) * DT; v.e = Math.max(0, v.e - V.burn * DT); }
  else { const d = Math.min(Math.abs(v.v), (V.sea ? 1.2 : 3) * DT); v.v -= Math.sign(v.v) * d; }
  if (fuel && !thr && !V.el) v.e = Math.max(0, v.e - V.burn * 0.08 * DT);
  v.v -= v.v * 0.15 * DT;
  if (v.v > cap) v.v = Math.max(cap, v.v - 14 * DT);
  if (v.v < -cap * 0.35) v.v = Math.min(-cap * 0.35, v.v + 14 * DT);
  if (steer && Math.abs(v.v) > 0.05) {
    const na = v.a + steer * V.turn * DT * Math.min(1, Math.abs(v.v) / 4) * Math.sign(v.v);
    if (!carHit(v, v.x, v.y, na)) v.a = na;
  }
  v.a = (v.a + Math.PI * 3) % (Math.PI * 2) - Math.PI;
  for (let k = 0; k < 2 && Math.abs(v.v) > 1e-3; k++) {
    const nx = v.x + Math.cos(v.a) * v.v * DT / 2, ny = v.y + Math.sin(v.a) * v.v * DT / 2, hit = carHit(v, nx, ny, v.a);
    if (!hit) { v.x = nx; v.y = ny; continue; }
    const sp = Math.abs(v.v);
    if (sp > 4) {
      const dmg = (sp - 4) * 8;
      v.hp -= dmg; v.lh = S.t;
      if (hit.car) { hit.car.hp -= dmg; hit.car.lh = S.t; if (hit.car.hp <= 0) carWreck(hit.car); }
      else if (hit.pl) plHurt(dmg);
      else if (!hit.train) { const e = at(hit.x, hit.y); if (e && kind(e) !== 'ruin') hurt(e, dmg, 'rammed by a vehicle'); }
      fx.push({ x: nx + Math.cos(v.a) * V.hl, y: ny + Math.sin(v.a) * V.hl, t: 0.3, c: '#d0d0d0' });
    }
    if (V.sea && hit.x != null) {
      const dx = v.x - hit.x - 0.5, dy = v.y - hit.y - 0.5, d = Math.hypot(dx, dy) || 1, px = v.x + dx / d * 0.05, py = v.y + dy / d * 0.05;
      if (!carHit(v, px, py, v.a)) { v.x = px; v.y = py; }
    }
    v.v = -v.v * (V.sea ? 0.1 : 0.25);
    break;
  }
  const sp = Math.abs(v.v);
  if (sp > 2) for (const b of S.bugs) if (b.hp > 0 && inCar(v, b.x, b.y, 0.25)) {
    b.hp -= sp * 6; v.hp -= 1; v.lh = S.t; v.v *= 0.97;
    if (b.hp <= 0) S.pk = (S.pk || 0) + 1;
  }
  if (V.sea) { if (Math.abs(v.v) > 1.5 && Math.random() < 0.25) wakes.push({ x: v.x - Math.cos(v.a) * V.hl, y: v.y - Math.sin(v.a) * V.hl, t: S.t, s: Math.min(1, Math.abs(v.v) / V.vmax) }); }
  else if (thr && fuel && !V.el && Math.random() < 0.35) puffs.push({ x: v.x - Math.cos(v.a) * V.hl, y: v.y - Math.sin(v.a) * V.hl, t: S.t });
  if (v.hp <= 0) carWreck(v);
}
const FCH = 16;
function fground(x, y) {
  const cx = Math.floor(x / FCH), cy = Math.floor(y / FCH);
  return { k: cy * 8192 + cx, rich: 0.5 + hash(cx, cy, (S.seed | 0) + 911) };
}
const fstock = key => { const s = S.fs && S.fs[key]; return s == null ? 1 : s; };
function fishTick(v) {
  const V = VEH[v.type], sp = Math.abs(v.v);
  if (sp < 0.8) { v.ct = 'gear dragging, too slow'; return; }
  const d = wdep(Math.floor(v.x), Math.floor(v.y), seaLv()), kel = d > 0.004 && d < 0.05, deep = d >= 0.07;
  if (!kel && !deep) { v.ck = ''; v.ct = 'between grounds'; return; }
  const g = fground(v.x, v.y), key = (kel ? 'k' : 'f') + g.k, it = kel ? 'kelp' : 'fish';
  let st = fstock(key);
  v.ck = it;
  v.cf = (v.cf || 0) + (kel ? 0.9 : 0.6) * g.rich * st * Math.min(1, sp / 4) * DT;
  v.ct = (kel ? 'cutting kelp' : 'trawling') + ', stock ' + Math.round(st * 100) + '%';
  S.fs = S.fs || {};
  while (v.cf >= 1) {
    v.cf -= 1;
    const cur = v.tr[it] || 0, room = (V.slots - carSlots(v)) * stk(it) + (cur % stk(it) ? stk(it) - cur % stk(it) : 0);
    if (room <= 0) { v.cf = 0; v.ct = 'hold full'; return; }
    v.tr[it] = cur + 1;
    st = Math.max(0, st - (kel ? 0.004 : 0.006)); S.fs[key] = st;
    S.made[it] = (S.made[it] || 0) + 1;
    if (!kel) { S.fk = (S.fk || 0) + 1; if (st < 0.25) S.fcr = 1; }
  }
}
function fishRegrow(dt) {
  if (!S.fs) return;
  for (const key in S.fs) {
    const s = S.fs[key], r = key[0] === 'k' ? 0.006 : 0.003, n = s + r * Math.max(s, 0.03) * (1 - s) * dt;
    if (n >= 0.999) delete S.fs[key]; else S.fs[key] = n;
  }
}
function netToggle(v) {
  if (!VEH[v.type].net) return false;
  v.net = v.net ? 0 : 1;
  toast(v.net ? 'Gear shot away. Keep under 12 knots while it is down.' : 'Gear hauled aboard.');
  return true;
}
function fishInfo(v) {
  const g = fground(v.x, v.y), f = fstock('f' + g.k), k = fstock('k' + g.k), lab = s => s < 0.1 ? 'collapsed' : s < 0.3 ? 'overfished' : s < 0.7 ? 'fished' : 'healthy';
  return `<div class="sec">Fishing ground here · ${g.rich > 1.1 ? 'rich' : g.rich > 0.8 ? 'fair' : 'poor'}</div><div class="gauge"><span>Fish</span>${bar(f, 1, f < 0.3 ? '#e0804a' : '#6ab0d0')}<b>${Math.round(f * 100)}% ${lab(f)}</b></div><div class="gauge"><span>Kelp</span>${bar(k, 1, k < 0.3 ? '#e0804a' : '#7aa040')}<b>${Math.round(k * 100)}%</b></div><p class="dim">Gear ${v.net ? 'down, ' + (v.ct || 'trawling') : 'stowed'}. Fish live in deep water and kelp in the shallows. A stock breeds back fastest at half strength; fished below a tenth it takes hours to recover.</p>`;
}
function carTick() {
  const P = S.pl, dv = P.car && carOf(P.car);
  if (P.car && !dv && !trainOf(P.car)) P.car = null;
  for (const v of S.cars.slice()) {
    let thr = 0, steer = 0;
    if (v === dv && !modalKind) {
      thr = (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0);
      steer = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
    }
    const V = VEH[v.type];
    if (V.net && v.auto && v !== dv) { const e = boatMark((v.sch || [])[v.si || 0]); v.net = e && e.type === 'buoy' && v.state !== 'wait' ? 1 : 0; }
    if (V.sea && !V.oar && v.auto && v !== dv) [thr, steer] = boatPilot(v);
    else if (v !== dv && v.v) v.v -= Math.sign(v.v) * Math.min(Math.abs(v.v), (V.sea ? 2 : 9) * DT);
    if (V.sea && !V.oar) { if (v.af > 0) v.af -= DT; else v.foul = Math.min(1, (v.foul || 0) + DT / 1800); }
    carStep(v, thr, steer);
    if (V.el) carCharge(v);
    if (V.net && v.net) fishTick(v);
    if (S.t - (v.lh ?? -99) > 10 && v.hp < VEH[v.type].hp) v.hp = Math.min(VEH[v.type].hp, v.hp + 2 * DT);
  }
  S.frt = (S.frt || 0) + DT; if (S.frt >= 1) { fishRegrow(S.frt); S.frt = 0; }
  const d2 = P.car && carOf(P.car);
  if (d2) { P.x = d2.x; P.y = d2.y; P.f = d2.a; }
  if (puffs.length > 80) puffs.splice(0, puffs.length - 80);
  if (wakes.length > 160) wakes.splice(0, wakes.length - 160);
}
function carToggle() {
  const P = S.pl;
  if (P.dead > 0) return;
  const tr = P.car && trainOf(P.car);
  if (tr) {
    if (!tr.g) trainGeo(tr);
    let i = tr.cars.findIndex(isLoco); if (i < 0) i = 0;
    const g = tr.g[i], c = Math.cos(g.a), s = Math.sin(g.a);
    for (const [l, w] of [[0, -1], [0, 1], [-0.6, -1], [0.6, 1], [0.6, -1], [-0.6, 1]]) {
      const ox = l * 0.92, oy = w * (0.42 + PL_R + 0.1), x = g.x + c * ox - s * oy, y = g.y + s * ox + c * oy;
      P.car = null;
      if (plFree(x, y)) { P.x = x; P.y = y; P.f = g.a - Math.PI / 2; return true; }
      P.car = tr.id;
    }
    toast('No room to get out here.', true);
    return false;
  }
  const v = P.car && carOf(P.car);
  if (v) {
    const V = VEH[v.type], c = Math.cos(v.a), s = Math.sin(v.a);
    for (const g of V.sea ? [0.45, 1, 1.6, 2.2] : [0.45]) for (const [l, w] of [[0, -1], [0, 1], [-1, 0], [1, 0], [0.6, -1], [-0.6, 1], [-0.6, -1], [0.6, 1]]) {
      const ox = l * (V.hl + g), oy = w * (V.hw + g), x = v.x + c * ox - s * oy, y = v.y + s * ox + c * oy;
      P.car = null;
      if (plFree(x, y)) { P.x = x; P.y = y; P.f = v.a - Math.PI / 2; if (V.sea) v.v = 0; return true; }
      P.car = v.id;
    }
    toast(V.sea ? 'Bring the boat alongside the shore to get off.' : 'No room to get out here.', true);
    return false;
  }
  let best = null, bd = 3;
  for (const o of S.cars) { const d = Math.hypot(o.x - P.x, o.y - P.y) - VEH[o.type].hw; if (d < bd) { bd = d; best = o; } }
  for (const t of S.trains) { if (!t.g) trainGeo(t); t.g.forEach((g, i) => { if (!isLoco(t.cars[i])) return; const d = Math.hypot(g.x - P.x, g.y - P.y) - 0.42; if (d < bd) { bd = d; best = t; } }); }
  if (!best) { toast('No vehicle nearby. Walk up to one and press F.', true); return false; }
  P.car = best.id; mining = null; camFree = false;
  if (VEH[best.type] && VEH[best.type].el) { if (!(best.e > 0)) toast('The batteries are flat. Push it within three tiles of a megawatt charger.', true); }
  else if (!(best.e > 0) && !best.fc && !(S.inv.jerrycan > 0)) toast('The tank is empty. Fill jerrycans with diesel at a cylinder filler.', true);
  return true;
}
function placeCar(t, fx, fy, dir) {
  const P = S.pl, V = VEH[t];
  if (!(S.inv[t] > 0)) return 'You have no ' + nm(t);
  if (!inReach(fx, fy, REACH + (V.sea ? 2 : 0))) return 'Out of reach. Walk closer.';
  const v = { id: S.nextId++, type: t, x: fx, y: fy, a: Math.atan2(DY[dir], DX[dir]), v: 0, hp: V.hp, e: V.el ? V.cap / 2 : 0, fc: 0, tr: {} };
  if (V.sea) Object.assign(v, { foul: 0, af: 3600, sch: [], si: 0, auto: false });
  const h = carHit(v, fx, fy, v.a);
  if (h) return h.pl ? 'You are standing there' : V.sea && h.x != null ? 'Boats go in the water, clear of the shore' : 'Something is in the way';
  S.inv[t]--;
  S.cars.push(v);
  return v;
}
function pickCar(v) {
  const P = S.pl;
  if (P.car === v.id) return toast('Get out first (F).', true);
  if (!inReach(v.x, v.y, REACH + (VEH[v.type].sea ? 2 : 0))) return toast('Out of reach. Walk closer.', true);
  give(v.type, 1); qbAdd(v.type);
  for (const k in v.tr) give(k, v.tr[k]);
  give('jerrycan', v.fc || 0);
  S.cars = S.cars.filter(o => o !== v);
  if (selCar === v.id) closePanel();
  toast('Picked up the ' + nm(v.type).toLowerCase() + (Object.keys(v.tr).length ? ' and its cargo.' : '.'));
  renderHotbar();
}

function floats(x, y) {
  if (x < 0 || y < 0 || x >= W || y >= H || terrain[y * W + x] !== 1) return false;
  const o = at(x, y);
  return !o || kind(o) === 'buoy' || BUILD[o.type].sea === 3;
}
const boatMark = id => { const e = ents.get(id); return e && (e.type === 'dock' || e.type === 'buoy') ? e : null; };
function boatGoal(e) {
  const out = [];
  if (e.type === 'buoy') { out.push(e.y * W + e.x); return out; }
  for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) {
    const x = e.x + i, y = e.y + j;
    if (Math.hypot(i, j) <= 2.3 && floats(x, y)) out.push(y * W + x);
  }
  return out;
}
function boatRoute(v, e) {
  const goal = new Set(boatGoal(e));
  if (!goal.size) return null;
  const sx = Math.floor(v.x), sy = Math.floor(v.y), s = sy * W + sx;
  const gx = e.x + 0.5, gy = e.y + 0.5, gr = e.type === 'buoy' ? 0 : 2.3, hu = k => { const x = k % W, y = (k - x) / W; return Math.max(0, Math.hypot(x + 0.5 - gx, y + 0.5 - gy) - gr - 0.8); };
  const dist = new Map([[s, 0]]), prev = new Map(), hp = [[hu(s), s]], done = new Set();
  const cc = new Map(), clear = (x, y) => { const k = y * W + x; let d = cc.get(k); if (d !== undefined) return d; d = 3; for (let r = 1; r <= 3 && d === 3; r++) for (let j = -r; j <= r && d === 3; j++) for (let i = -r; i <= r; i++) if ((Math.abs(i) === r || Math.abs(j) === r) && !floats(x + i, y + j)) { d = r - 1; break; } cc.set(k, d); return d; };
  const push = it => { hp.push(it); let i = hp.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (hp[p][0] <= hp[i][0]) break; [hp[p], hp[i]] = [hp[i], hp[p]]; i = p; } };
  const pop = () => { const top = hp[0], last = hp.pop(); if (hp.length) { hp[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < hp.length && hp[l][0] < hp[m][0]) m = l; if (r < hp.length && hp[r][0] < hp[m][0]) m = r; if (m === i) break; [hp[m], hp[i]] = [hp[i], hp[m]]; i = m; } } return top; };
  let end = -1, n = 0;
  while (hp.length && n++ < 400000) {
    const k = pop()[1];
    if (done.has(k)) continue;
    done.add(k);
    const d = dist.get(k);
    if (goal.has(k)) { end = k; break; }
    const x = k % W, y = (k - x) / W;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      if (!i && !j) continue;
      const nx = x + i, ny = y + j;
      if (!floats(nx, ny)) continue;
      if (i && j && !(floats(x + i, y) && floats(x, y + j))) continue;
      const nk = ny * W + nx, nd = d + (i && j ? 1.414 : 1) * (1 + [6, 2.5, 0.8, 0][clear(nx, ny)]);
      if (nd < (dist.get(nk) ?? 1e9)) { dist.set(nk, nd); prev.set(nk, k); push([nd + hu(nk), nk]); }
    }
  }
  if (end < 0) return null;
  const p = [];
  for (let k = end; k !== undefined && k !== s; k = prev.get(k)) p.push([k % W + 0.5, Math.floor(k / W) + 0.5]);
  p.reverse();
  return p;
}
function boatWork(v, e) {
  const V = VEH[v.type];
  v.wt = (v.wt || 0) + DT; v.tk = (v.tk || 0) + DT;
  v.st = 'At ' + e.nm + (e.mode === 'unload' ? ', unloading' : ', loading');
  if (v.tk < 0.25) return;
  v.tk = 0;
  let moved = 0;
  for (const c of lists().chest) {
    if (c.type !== 'chest' || !c.store || Math.max(Math.abs(c.x - e.x), Math.abs(c.y - e.y)) > 1) continue;
    const f = Math.min(c.store.jerrycan || 0, FUEL_CAP - (v.fc || 0));
    if (f > 0) { c.store.jerrycan -= f; if (!c.store.jerrycan) delete c.store.jerrycan; v.fc = (v.fc || 0) + f; moved += f; }
    let left = 20;
    if (e.mode === 'unload') {
      for (const k of Object.keys(v.tr)) {
        const m = Math.min(left, v.tr[k], 400 - sum(c.store));
        if (m <= 0) continue;
        v.tr[k] -= m; if (!v.tr[k]) delete v.tr[k];
        c.store[k] = (c.store[k] || 0) + m; left -= m; moved += m;
      }
    } else {
      for (const k of Object.keys(c.store)) {
        if (k === 'jerrycan' || !(c.store[k] > 0)) continue;
        const cur = v.tr[k] || 0, room = (V.slots - carSlots(v)) * stk(k) + (cur % stk(k) ? stk(k) - cur % stk(k) : 0);
        const m = Math.min(left, c.store[k], room);
        if (m <= 0) continue;
        c.store[k] -= m; if (!c.store[k]) delete c.store[k];
        v.tr[k] = cur + m; left -= m; moved += m;
      }
    }
  }
  if (moved) v.idle = 0; else v.idle = (v.idle || 0) + 0.25;
}
function boatPilot(v) {
  const V = VEH[v.type];
  v.sch = (v.sch || []).filter(id => boatMark(id));
  if (!v.sch.length) { v.st = 'No schedule'; return [v.v > 0.2 ? -0.5 : v.v < -0.2 ? 0.5 : 0, 0]; }
  if (!(v.si < v.sch.length)) v.si = 0;
  const e = boatMark(v.sch[v.si]);
  const dd = Math.hypot(e.x + 0.5 - v.x, e.y + 0.5 - v.y);
  if (v.state === 'wait') {
    boatWork(v, e);
    if (v.wt > 2 && v.idle >= 2) { v.state = 'go'; v.si = (v.si + 1) % v.sch.length; v.route = null; }
    return [v.v > 0.2 ? -0.6 : v.v < -0.2 ? 0.6 : 0, 0];
  }
  const near = e.type === 'buoy' ? dd < 1.4 : dd < V.hl + 1.8;
  if (near) {
    if (e.type === 'buoy') { v.si = (v.si + 1) % v.sch.length; v.route = null; return [0, 0]; }
    if (Math.abs(v.v) < 1.2) { v.state = 'wait'; v.wt = 0; v.tk = 0; v.idle = 0; v.route = null; return [0, 0]; }
  }
  if (!(v.e > 0) && !(v.fc > 0) && S.pl.car !== v.id) { v.st = 'Out of fuel'; return [0, 0]; }
  if (v.rev > 0) { v.rev -= DT; v.st = 'Backing off'; return [-1, v.rs || 1]; }
  if (!v.route || (v.rt = (v.rt || 0) - DT) < -20) {
    v.route = boatRoute(v, e); v.rp = 0; v.rt = 0;
    if (!v.route) { v.st = 'No water route to ' + e.nm; v.route = null; v.rt = -15; return [0, 0]; }
  }
  const R = v.route;
  let bj = v.rp, bd = 1e9;
  for (let j = v.rp; j < Math.min(R.length, v.rp + 10); j++) { const d = Math.hypot(R[j][0] - v.x, R[j][1] - v.y); if (d < bd) { bd = d; bj = j; } }
  v.rp = bj;
  if (bd > 4) { v.route = null; return [0, 0]; }
  const look = R[Math.min(R.length - 1, v.rp + (V.hl > 1.4 ? 3 : 2))] || [e.x + 0.5, e.y + 0.5];
  let da = Math.atan2(look[1] - v.y, look[0] - v.x) - v.a;
  while (da > Math.PI) da -= Math.PI * 2;
  while (da < -Math.PI) da += Math.PI * 2;
  const left = (R.length - v.rp) + 0.5;
  const vd = Math.min(V.vmax, 1.4 + left * 1.1, Math.abs(da) > 0.9 ? 2.5 : V.vmax);
  const thr = v.v < vd ? 1 : v.v > vd + 1 ? -0.4 : 0;
  v.st = 'Heading to ' + e.nm;
  v.stk = (v.stk || 0) + DT;
  if (v.stk > 3) {
    if (Math.hypot(v.x - (v.sx ?? 1e9), v.y - (v.sy ?? 1e9)) < 0.8) { v.rev = 1.5; v.rs = da > 0 ? -1 : 1; v.route = null; }
    v.stk = 0; v.sx = v.x; v.sy = v.y;
  }
  return [thr, Math.max(-1, Math.min(1, da * 2.5))];
}
function dockDyn(e) {
  const n = S.cars.filter(v => v.auto && v.sch && v.sch[v.si] === e.id).length;
  if (e.type === 'buoy') return `<div class="status"><i style="background:#e05a4a"></i>${e.nm} · ${n ? n + ' boat' + (n > 1 ? 's' : '') + ' heading here' : 'no boats heading here'}</div><p class="dim">A waypoint. Boats pass within a tile or so of it and carry on to the next entry on their route.</p>`;
  return `<div class="status"><i style="background:${e.mode === 'unload' ? '#4a8ae0' : '#7fe08a'}"></i>${e.nm} · ${n ? n + ' boat' + (n > 1 ? 's' : '') + ' heading here' : 'no boats heading here'}</div><p class="dim">Boats come alongside and ${e.mode === 'unload' ? 'empty their hold into' : 'fill their hold from'} chests touching the dock, 20 items every quarter second, and cast off once nothing has moved for 2 seconds. They also take jerrycans from those chests.</p>`;
}
const trainOf = id => S.trains.find(t => t.id === id);
const isRail = (x, y) => { const o = at(x, y); return !!o && kind(o) === 'rail'; };
const dirOf = (a, b) => b[0] > a[0] ? 1 : b[0] < a[0] ? 3 : b[1] > a[1] ? 2 : 0;
const tLen = t => t.cars.length * T_CL;
function trackPt(t, s) {
  const p = t.p, n = p.length, i = Math.max(0, Math.min(n - 1, Math.round(s))), u = s - i + 0.5, c = p[i];
  const din = i > 0 ? dirOf(p[i - 1], c) : n > 1 ? dirOf(c, p[1]) : 1;
  const dout = i < n - 1 ? dirOf(c, p[i + 1]) : din;
  const cx = c[0] + 0.5, cy = c[1] + 0.5;
  if (din === dout || dout === (din + 2) % 4) return [cx - DX[din] * 0.5 + DX[din] * u, cy - DY[din] * 0.5 + DY[din] * u];
  const ax = cx + (DX[dout] - DX[din]) * 0.5, ay = cy + (DY[dout] - DY[din]) * 0.5;
  const a0 = Math.atan2(-DY[dout], -DX[dout]), a1 = Math.atan2(DY[din], DX[din]);
  let da = a1 - a0;
  while (da > Math.PI) da -= Math.PI * 2;
  while (da < -Math.PI) da += Math.PI * 2;
  const a = a0 + da * Math.max(0, Math.min(1, u));
  return [ax + Math.cos(a) * 0.5, ay + Math.sin(a) * 0.5];
}
function trainGeo(t) {
  t.g = t.cars.map((c, i) => {
    const m = t.L - T_CL * (i + 0.5), f = trackPt(t, m + 0.8), b = trackPt(t, m - 0.8);
    return { x: (f[0] + b[0]) / 2, y: (f[1] + b[1]) / 2, a: Math.atan2(f[1] - b[1], f[0] - b[0]) };
  });
  return t.g;
}
function inTcar(g, x, y, pad) {
  const dx = x - g.x, dy = y - g.y, c = Math.cos(g.a), s = Math.sin(g.a);
  return Math.abs(dx * c + dy * s) < 0.92 + pad && Math.abs(dy * c - dx * s) < 0.42 + pad;
}
function trainAt(x, y) {
  for (const t of S.trains) { if (!t.g) trainGeo(t); for (let i = 0; i < t.g.length; i++) if (inTcar(t.g[i], x, y, 0.05)) return t; }
  return null;
}
function trainOcc(t) {
  t.occ = new Set();
  for (let i = Math.max(0, Math.round(t.L - tLen(t))); i < t.p.length; i++) t.occ.add(t.p[i][1] * W + t.p[i][0]);
}
const tileTaken = (t, x, y) => S.trains.some(o => o !== t && o.occ && o.occ.has(y * W + x));
const railBusy = e => S.trains.some(t => t.occ && t.occ.has(e.y * W + e.x));
function nextTile(t) {
  const p = t.p, n = p.length, a = p[n - 1], d = dirOf(p[n - 2], a);
  const opts = [d, (d + 3) % 4, (d + 1) % 4].map(dd => [a[0] + DX[dd], a[1] + DY[dd], dd]).filter(q => isRail(q[0], q[1]));
  let q = null;
  if (t.route && t.route.length) {
    const r = t.route[0];
    q = opts.find(o => o[0] === r[0] && o[1] === r[1]);
    if (!q) { t.route = null; return null; }
    if (tileTaken(t, q[0], q[1])) return null;
    t.route.shift();
    return [q[0], q[1]];
  }
  if (!opts.length) return null;
  if (t.turn) q = opts.find(o => o[2] === (d + (t.turn > 0 ? 1 : 3)) % 4);
  q = q || opts[0];
  if (tileTaken(t, q[0], q[1])) return null;
  return [q[0], q[1]];
}
function advance(t, d) {
  let moved = 0;
  while (d - moved > 1e-6) {
    while (t.L + 1.2 > t.p.length - 1) { const q = nextTile(t); if (!q) break; t.p.push(q); }
    const st = Math.min(d - moved, t.p.length - 0.6 - t.L, 0.5);
    if (st <= 1e-6) break;
    t.L += st; moved += st;
  }
  return moved;
}
function reverseTrain(t) {
  const n = t.p.length;
  t.p.reverse(); t.cars.reverse();
  t.L = n - 1 - (t.L - tLen(t));
  t.route = null; t.v = 0;
  trainGeo(t); trainOcc(t);
}
function trimTrain(t) {
  while (t.L - tLen(t) > 1.5 && t.p.length > 2) { t.p.shift(); t.L--; }
}
function railPath(t, goal) {
  const p = t.p, n = p.length, a = p[n - 1], d0 = dirOf(p[n - 2], a);
  const k0 = (a[1] * W + a[0]) * 4 + d0, par = new Map([[k0, -1]]), q = [k0];
  for (let h = 0; h < q.length && q.length < 60000; h++) {
    const k = q[h], d = k & 3, ti = k >> 2, x = ti % W, y = (ti - x) / W;
    for (const dd of [d, (d + 3) % 4, (d + 1) % 4]) {
      const nx = x + DX[dd], ny = y + DY[dd];
      if (!isRail(nx, ny)) continue;
      const nk = (ny * W + nx) * 4 + dd;
      if (par.has(nk)) continue;
      par.set(nk, k);
      if (goal.has(ny * W + nx)) {
        const out = [];
        for (let c = nk; c !== k0; c = par.get(c)) { const ci = c >> 2; out.push([ci % W, (ci - ci % W) / W]); }
        return out.reverse();
      }
      q.push(nk);
    }
  }
  return null;
}
function stopGoal(e) {
  const s = new Set();
  for (let d = 0; d < 4; d++) if (isRail(e.x + DX[d], e.y + DY[d])) s.add((e.y + DY[d]) * W + e.x + DX[d]);
  return s;
}
function autoDrive(t) {
  const r = { thr: 0, brake: 1, lim: Infinity };
  t.sch = (t.sch || []).filter(id => { const e = ents.get(id); return e && e.type === 'train_stop'; });
  if (!t.sch.length) { t.st = 'No stops in the schedule'; return r; }
  if (!t.cars.some(isLoco)) { t.st = 'No locomotive'; return r; }
  t.si = (t.si || 0) % t.sch.length;
  const stp = ents.get(t.sch[t.si]);
  if (t.state === 'wait') { stopWork(t, stp); return r; }
  const goal = stopGoal(stp), p = t.p, n = p.length;
  if (!goal.size) { t.st = stp.nm + ' has no track beside it'; return r; }
  let gi = -1;
  for (let i = n - 1; i >= 0; i--) if (goal.has(p[i][1] * W + p[i][0])) { gi = i; break; }
  if (gi >= 0 && gi <= t.L + 0.05 && gi >= t.L - tLen(t)) {
    t.v = 0; t.state = 'wait'; t.wt = 0; t.idle = 0; t.tk = 0; t.route = null;
    t.st = 'At ' + stp.nm;
    return r;
  }
  let dist;
  if (gi > t.L) dist = gi - t.L;
  else {
    if (!t.route || !t.route.length) {
      if (S.t - (t.rp ?? -9) > 1.5) { t.rp = S.t; t.route = railPath(t, goal); }
      if (!t.route || !t.route.length) {
        t.route = null; t.st = 'No path to ' + stp.nm;
        if (t.v < 0.05 && S.t - (t.rvT ?? -9) > 5) { t.rvT = S.t; reverseTrain(t); t.rp = -9; }
        return r;
      }
    }
    dist = n - 1 + t.route.length - t.L;
    for (let k = 0; k < t.route.length; k++) if (tileTaken(t, t.route[k][0], t.route[k][1])) { dist = Math.min(dist, n + k - 1 + 0.4 - t.L); break; }
  }
  dist = Math.max(0, dist);
  t.st = dist < 1.5 && gi < 0 && t.v < 0.1 ? 'Waiting for the line ahead' : 'Heading to ' + stp.nm;
  if (t.cars.some(q => q.type === 'loco') ? !(t.e > 0) && !t.fc && !(t.bc > 0) : !(t.bc > 0)) t.st = t.cars.some(q => q.type === 'loco') ? 'Out of fuel' : 'Batteries flat';
  const vt = Math.min(t.vm || T_VMAX, Math.sqrt(2 * 0.8 * T_BRAKE * dist));
  r.thr = t.v < vt - 0.3 ? 1 : 0; r.brake = t.v > vt + 0.3 ? 1 : 0; r.lim = dist;
  return r;
}
function stopWork(t, stp) {
  t.wt = (t.wt || 0) + DT; t.tk = (t.tk || 0) + DT;
  t.st = 'At ' + stp.nm + (stp.mode === 'unload' ? ', unloading' : ', loading');
  if (t.tk >= 0.25) {
    t.tk = 0;
    let moved = 0;
    if (!t.g) trainGeo(t);
    t.cars.forEach((c, i) => {
      const g = t.g[i], cs = Math.cos(g.a), sn = Math.sin(g.a);
      for (const e of lists().chest) {
        if (e.type !== 'chest' || !e.store) continue;
        const dx = e.x + 0.5 - g.x, dy = e.y + 0.5 - g.y;
        if (Math.abs(dx * cs + dy * sn) >= 1.5 || Math.abs(dy * cs - dx * sn) >= 1.6) continue;
        if (isLoco(c)) {
          if (c.type !== 'loco') continue;
          const m = Math.min(e.store.jerrycan || 0, T_FUEL - (t.fc || 0));
          if (m > 0) { e.store.jerrycan -= m; if (!e.store.jerrycan) delete e.store.jerrycan; t.fc = (t.fc || 0) + m; moved += m; }
          continue;
        }
        let left = 10;
        if (stp.mode === 'unload') {
          for (const k of Object.keys(c.tr)) {
            const m = Math.min(left, c.tr[k], 400 - sum(e.store));
            if (m <= 0) continue;
            c.tr[k] -= m; if (!c.tr[k]) delete c.tr[k];
            e.store[k] = (e.store[k] || 0) + m; left -= m; moved += m;
          }
        } else {
          for (const k of Object.keys(e.store)) {
            if (k === 'jerrycan' || !(e.store[k] > 0)) continue;
            const cur = c.tr[k] || 0, room = (TRAIN.wagon.slots - carSlots(c)) * stk(k) + (cur % stk(k) ? stk(k) - cur % stk(k) : 0);
            const m = Math.min(left, e.store[k], room);
            if (m <= 0) continue;
            e.store[k] -= m; if (!e.store[k]) delete e.store[k];
            c.tr[k] = cur + m; left -= m; moved += m;
          }
        }
      }
    });
    if (moved) t.idle = 0; else t.idle = (t.idle || 0) + 0.25;
  }
  if (t.wt > 2 && t.idle >= 2) { t.state = 'go'; t.si = (t.si + 1) % t.sch.length; t.route = null; t.rp = -9; }
}
function trainCollide(t) {
  const P = S.pl, rid = P.car === t.id;
  for (const g of t.g) {
    if (t.v > 1) for (const b of S.bugs) if (b.hp > 0 && inTcar(g, b.x, b.y, 0.25)) { b.hp -= t.v * 10; if (b.hp <= 0) S.pk = (S.pk || 0) + 1; }
    for (const v of S.cars.slice()) {
      if (Math.hypot(v.x - g.x, v.y - g.y) > 2.6) continue;
      const V = VEH[v.type], c = Math.cos(v.a), s = Math.sin(v.a);
      let hit = inTcar(g, v.x, v.y, V.hw);
      if (!hit) for (const [l, w] of [[1, 1], [1, -1], [-1, 1], [-1, -1], [0, 1], [0, -1]]) if (inTcar(g, v.x + c * V.hl * l - s * V.hw * w, v.y + s * V.hl * l + c * V.hw * w, 0)) { hit = true; break; }
      if (!hit) continue;
      if (t.v > 3) {
        v.hp -= t.v * 15; v.lh = S.t; t.v *= 0.85;
        fx.push({ x: v.x, y: v.y, t: 0.3, c: '#d0d0d0' });
        if (v.hp <= 0) carWreck(v);
      } else return true;
    }
    if (!rid && !P.car && !(P.dead > 0) && inTcar(g, P.x, P.y, PL_R)) {
      if (t.v > 1 && S.t - (t.ph ?? -9) > 0.6) { t.ph = S.t; plHurt(t.v * 5); }
      const c = Math.cos(g.a), s = Math.sin(g.a), lon = (P.x - g.x) * c + (P.y - g.y) * s, lat = (P.y - g.y) * c - (P.x - g.x) * s;
      const sg = lat < 0 ? -1 : 1, off = 0.42 + PL_R + 0.06;
      let ok = false;
      for (const k of [sg, -sg]) {
        const nx = g.x + c * lon - s * off * k, ny = g.y + s * lon + c * off * k;
        if (plFree(nx, ny)) { P.x = nx; P.y = ny; ok = true; break; }
      }
      if (!ok) return true;
    }
  }
  return false;
}
function trainCharge(t, ne) {
  const full = T_EBAT * ne;
  t.bc = Math.min(full, t.bc || 0);
  if (t.v > 0.1 || t.bc >= full) return;
  if (!t.g) trainGeo(t);
  for (const e of lists().machine) {
    if (!BUILD[e.type].tc || !(e.ch > 0)) continue;
    const cx = e.x + BUILD[e.type].w / 2, cy = e.y + BUILD[e.type].h / 2;
    if (!t.cars.some((c, i) => c.type === 'eloco' && t.g[i] && Math.hypot(t.g[i].x - cx, t.g[i].y - cy) < 3.5)) continue;
    const m = Math.min(BUILD[e.type].rate * DT, e.ch, full - t.bc);
    e.ch -= m; t.bc += m;
    if (t.bc >= full) return;
  }
}
function trainFuel(t, rid) { return t.fc > 0 ? refuel(t, true) : rid ? refuel(t) : false; }
function trainStep(t) {
  const P = S.pl, rid = P.car === t.id && !(P.dead > 0);
  let thr = 0, brake = 0, lim = Infinity;
  if (t.auto) { const r = autoDrive(t); thr = r.thr; brake = r.brake; lim = r.lim; }
  else if (rid) {
    t.st = 'Manual';
    if (!modalKind) {
      const w = keys.w || keys.arrowup, s = keys.s || keys.arrowdown;
      t.turn = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
      if (w) thr = 1;
      if (s) { if (t.v > 0.05) brake = 1; else if (!t.rl) { reverseTrain(t); t.rl = 1; } }
      else t.rl = 0;
    }
  } else { brake = 1; t.st = 'Parked'; }
  const nd = t.cars.filter(q => q.type === 'loco').length, ne = t.cars.filter(q => q.type === 'eloco').length, nl = nd + ne;
  t.vm = ne && !nd ? T_EV : T_VMAX;
  let mass = 0;
  for (const c of t.cars) mass += TRAIN[c.type].m + (c.type === 'wagon' ? carSlots(c) / TRAIN.wagon.slots : 0);
  if (ne) trainCharge(t, ne);
  if (thr && nl) {
    let f = 0;
    if (nd) {
      if (!(t.e > 0)) trainFuel(t, rid);
      if (t.e > 0) { f += 6 * nd; t.e = Math.max(0, t.e - T_BURN * nd * DT); if (Math.random() < 0.4 * nd) { const g = t.g[t.cars.findIndex(q => q.type === 'loco')]; if (g) puffs.push({ x: g.x, y: g.y, t: S.t }); } }
    }
    if (ne && t.bc > 0) { f += 8 * ne; t.bc = Math.max(0, t.bc - T_EKW * ne * DT); }
    else if (ne && !nd && rid && S.t - noFuelT > 3) { noFuelT = S.t; toast('The traction batteries are flat. Stop beside a powered rail charger.', true); }
    t.v += f / mass * DT;
  }
  if (brake) { if (ne && t.v > 1) t.bc = Math.min(T_EBAT * ne, (t.bc || 0) + T_EKW * 0.35 * ne * DT); t.v = Math.max(0, t.v - T_BRAKE * DT); }
  t.v = Math.max(0, Math.min(t.vm, t.v - t.v * 0.02 * DT - (thr ? 0 : 0.1 * DT)));
  if (t.v > 0) {
    const want = Math.min(t.v * DT, lim), L0 = t.L, got = advance(t, want);
    if (got < want - 1e-6) t.v = 0;
    trainGeo(t);
    if (trainCollide(t)) { t.L = L0; t.v = 0; trainGeo(t); }
    trimTrain(t);
    trainOcc(t);
  }
}
function trainTick() {
  const P = S.pl;
  for (const t of S.trains) { if (!t.g) trainGeo(t); trainOcc(t); }
  for (const t of S.trains) trainStep(t);
  const t = P.car && trainOf(P.car);
  if (t) { let i = t.cars.findIndex(isLoco); if (i < 0) i = 0; const g = t.g[i]; P.x = g.x; P.y = g.y; P.f = g.a; }
}
function placeTrain(type, fx, fy, dir) {
  if (!(S.inv[type] > 0)) return 'You have no ' + nm(type);
  if (!inReach(fx, fy, REACH)) return 'Out of reach. Walk closer.';
  const X = Math.floor(fx), Y = Math.floor(fy);
  if (!isRail(X, Y)) return 'Rolling stock goes on rails. Lay track first.';
  const car = { type, tr: {} };
  for (const t of S.trains) {
    if (!t.g) trainGeo(t);
    const h = trackPt(t, t.L), b = trackPt(t, t.L - tLen(t)), dh = Math.hypot(h[0] - fx, h[1] - fy), db = Math.hypot(b[0] - fx, b[1] - fy);
    if (Math.min(dh, db) >= 1.6) continue;
    if (t.v > 0.05) return 'Stop the train before coupling';
    const hd = dh < db;
    if (hd) reverseTrain(t);
    t.cars.push(car);
    let ok = true;
    while (t.L - tLen(t) < 0) {
      const a = t.p[0], d = dirOf(t.p[1], a);
      const q = [d, (d + 3) % 4, (d + 1) % 4].map(dd => [a[0] + DX[dd], a[1] + DY[dd]]).find(o => isRail(o[0], o[1]) && !tileTaken(t, o[0], o[1]));
      if (!q) { ok = false; break; }
      t.p.unshift(q); t.L++;
    }
    if (!ok) { t.cars.pop(); if (hd) reverseTrain(t); trainGeo(t); return 'Not enough track behind the train'; }
    if (hd) reverseTrain(t);
    trainGeo(t); trainOcc(t);
    S.inv[type]--;
    return t;
  }
  if (tileTaken(null, X, Y)) return 'Another train is in the way';
  let walk = null;
  for (const d0 of [(dir + 2) % 4, dir, (dir + 1) % 4, (dir + 3) % 4]) {
    const w = [[X, Y]];
    let d = d0, ok = true;
    for (let k = 0; k < T_CL; k++) {
      const a = w[w.length - 1];
      const q = (k === 0 ? [d] : [d, (d + 3) % 4, (d + 1) % 4]).map(dd => [a[0] + DX[dd], a[1] + DY[dd], dd]).find(o => isRail(o[0], o[1]) && !tileTaken(null, o[0], o[1]));
      if (!q) { ok = false; break; }
      w.push([q[0], q[1]]); d = q[2];
    }
    if (ok) { walk = w; break; }
  }
  if (!walk) return 'Not enough track here. Each car needs ' + T_CL + ' tiles.';
  const t = { id: S.nextId++, cars: [car], p: walk.reverse(), L: T_CL, v: 0, auto: false, sch: [], si: 0, state: 'go', route: null, e: 0, fc: 0, st: 'Parked', turn: 0 };
  trainGeo(t);
  if (S.cars.some(v => t.g.some(g => inTcar(g, v.x, v.y, VEH[v.type].hw)))) return 'Something is in the way';
  S.inv[type]--;
  S.trains.push(t); trainOcc(t);
  return t;
}
function pickTrain(t) {
  const P = S.pl;
  if (P.car === t.id) return toast('Get out first (F).', true);
  if (!t.g) trainGeo(t);
  if (!t.g.some(g => inReach(g.x, g.y, REACH))) return toast('Out of reach. Walk closer.', true);
  let cg = false;
  for (const c of t.cars) { give(c.type, 1); qbAdd(c.type); for (const k in c.tr) { give(k, c.tr[k]); cg = true; } }
  give('jerrycan', t.fc || 0);
  S.trains = S.trains.filter(o => o !== t);
  if (selTrain === t.id) closePanel();
  toast('Picked up the train' + (cg ? ' and its cargo.' : '.'));
  renderHotbar();
}

function serialize() {
  const es = [];
  for (const e of ents.values()) {
    const o = Object.assign({}, e);
    delete o.per; delete o.st; delete o.cap; delete o.on; delete o.mv; delete o.ss; delete o.eff; delete o.puff; delete o.sh; delete o.tx; delete o.ty; delete o.tgt; delete o.pn; delete o.pg; delete o.psat;
    es.push(o);
  }
  return JSON.stringify({ v: 1, seed: S.seed, gen: S.gen, inv: S.inv, dep: S.dep, vent: S.vent, spill: S.spill, fails: S.fails, made: S.made, bugs: S.bugs.map(b => ({ x: +b.x.toFixed(2), y: +b.y.toFixed(2), hp: b.hp, mhp: b.mhp, tid: b.tid, hx: b.hx, hy: b.hy, a: b.a, ph: b.ph, bt: b.bt, k: b.k, hid: b.hid })), evo: S.evo, lost: S.lost, kills: S.kills, hk: S.hk, hv: S.hv, rv: S.rv, rs: S.rs, res: S.res, unl: S.unl, tech: S.tech, tv: 1, rq: S.rq, rp: S.rp, wind: S.wind, clouds: S.clouds.map(c => ({ x: +c.x.toFixed(2), y: +c.y.toFixed(2), g: c.g, m: +c.m.toFixed(2), r: +c.r.toFixed(2), s: c.s })), fires: S.fires, shells: S.shells, orders: S.orders, odone: S.odone, olast: S.olast, pol: S.pol.map(v => Math.round(v * 10) / 10), t: S.t, nextId: S.nextId, cam, pl: { x: +S.pl.x.toFixed(2), y: +S.pl.y.toFixed(2), f: +S.pl.f.toFixed(2), hp: Math.round(S.pl.hp), rd: S.pl.rd || 0, wm: S.pl.wm, rb: S.pl.rb || 0, rm: S.pl.rm || 0, rc: S.pl.rc || 0, rx: S.pl.rx || 0, ra: S.pl.ra || 0, ra: S.pl.ra || 0, rs: S.pl.rs || 0, arm: S.pl.arm || null, fc: S.pl.fc || 0, fc2: S.pl.fc2 || 0, rw: S.pl.rw || 0, rq: S.pl.rq || 0, rs2: S.pl.rs2 || 0, rb2: S.pl.rb2 || 0, rm2: S.pl.rm2 || 0, rf: S.pl.rf || 0, ra2: S.pl.ra2 || 0, sr: S.pl.sr || 0, sr2: S.pl.sr2 || 0, boom: S.pl.boom, sg3: S.pl.sg3, dead: S.pl.dead || 0, car: S.pl.car || null }, trains: S.trains.map(t => { const o = Object.assign({}, t); delete o.g; delete o.occ; return o; }), cars: S.cars.map(v => Object.assign({}, v, { route: undefined, x: +v.x.toFixed(3), y: +v.y.toFixed(3), a: +v.a.toFixed(4), v: +v.v.toFixed(3) })), pk: S.pk || 0, fs: S.fs || {}, fk: S.fk || 0, osh: S.osh || 0, hrsg: S.hrsg || 0, geo: S.geo || 0, dle: S.dle || 0, nrt: S.nrt || 0, fcr: S.fcr, ach: S.ach || {}, rk: S.rk || 0, trk: S.trk || undefined, dg: S.dg ? Object.assign({}, S.dg, { ff: undefined, seen: undefined }) : undefined, dgn: S.dgn, dgc: S.dgc, qk: S.qk, bv: S.bv, iv: S.iv, mdn: S.mdn, tyk: S.tyk, egk: S.egk, lvn: S.lvn, lvk: S.lvk, icn: S.icn, ick: S.ick, vlv: S.vlv, wkk: S.wkk, wkn: S.wkn, dgk: S.dgk, xv: S.xv, help: S.help, qb: S.qb, cq: S.cq, rg: rgd ? Array.from(rgd).join('') : undefined, ents: es });
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
  S = { seed, inv: Object.assign({}, START_INV), dep: {}, vent: {}, spill: {}, fails: 0, made: {}, pol: new Array(PW * PW).fill(0), t: 0, nextId: 1, help: !!(S && S.help), power: { gen: 0, demand: 0, cap: 0, sat: 1 }, bugs: [], evo: 0, lost: 0, kills: 0, hk: 0, res: {}, unl: {}, tech: {}, rq: [], rp: {}, clouds: [], fires: [], shells: [], booms: [], wind: { a: Math.random() * 7, v: 0.3 }, orders: [], odone: 0, gen, cq: [], fs: {}, fk: 0 };
  if (gen.kit) for (const k in S.inv) S.inv[k] *= 2;
  if (gen.wire) S.inv.wood_pole = 20;
  initWorld(seed, gen);
  dgc = null; dgMine = null; dfx.length = 0; nades.length = 0;
  if (rgd) { growNear(W / 2, H / 2, 100, 99); S.hv = S.rv = S.bv = S.iv = S.xv = 1; }
  else { spawnRuins(); spawnHives(); spawnBurrows(); spawnMines(); spawnXdg(); }
  S.cars = []; S.trains = [];
  S.pl = newPl();
  cam = { x: S.pl.x, y: S.pl.y, z: 32 }; camFree = false;
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
  S = { seed: d.seed, gen, inv: d.inv || {}, dep: d.dep || {}, vent: d.vent || {}, spill: d.spill || {}, fails: d.fails || 0, made: d.made || {}, pol: d.pol && d.pol.length === PW * PW ? d.pol : new Array(PW * PW).fill(0), t: d.t || 0, nextId: d.nextId || 1, help: !!d.help, power: { gen: 0, demand: 0, cap: 0, sat: 1 }, bugs: d.bugs || [], evo: d.evo || 0, lost: d.lost || 0, kills: d.kills || 0, hk: d.hk || 0, hv: d.hv, rv: d.rv, rs: d.rs || 0, res: d.res || {}, unl: d.unl || {}, tech: d.tech || {}, rq: d.rq || [], rp: d.rp || {}, clouds: d.clouds || [], fires: d.fires || [], shells: d.shells || [], booms: [], wind: d.wind || { a: 0, v: 0.3 }, orders: d.orders || [], odone: d.odone || 0, olast: d.olast, qb: d.qb, cq: d.cq || [], pk: d.pk || 0, fs: d.fs || {}, fk: d.fk || 0, osh: d.osh || 0, hrsg: d.hrsg || 0, geo: d.geo || 0, dle: d.dle || 0, nrt: d.nrt || 0, fcr: d.fcr, ach: d.ach || {}, rk: d.rk || 0, trk: d.trk || null, dg: d.dg || null, dgn: d.dgn || 0, dgc: d.dgc || 0, qk: d.qk || 0, bv: d.bv, iv: d.iv, mdn: d.mdn || 0, tyk: d.tyk || 0, egk: d.egk || 0, lvn: d.lvn || 0, lvk: d.lvk || 0, icn: d.icn || 0, ick: d.ick || 0, vlv: d.vlv || 0, wkk: d.wkk || 0, wkn: d.wkn || 0, dgk: d.dgk || {}, xv: d.xv };
  dgc = null; dgMine = null; dfx.length = 0; nades.length = 0;
  initWorld(d.seed, gen);
  if (rgd && d.rg) for (let r = 0; r < rgd.length; r++) if (d.rg[r] === '1') growRegion(r % (W / RG), Math.floor(r / (W / RG)), false);
  for (const k in S.dep) { const i = +k; oreAmt[i] = S.dep[k]; if (oreAmt[i] <= 0) { oreAmt[i] = 0; oreType[i] = 0; } }
  for (const o of d.ents || []) {
    if (!BUILD[o.type]) continue;
    const e = Object.assign(makeEnt(o.type, o.x, o.y, o.dir), o);
    addEnt(e);
    S.nextId = Math.max(S.nextId, e.id + 1);
  }
  if (!d.tech) { for (const e of ents.values()) if (TECH[e.type]) S.tech[e.type] = 1; for (const k in S.inv) if (TECH[k]) S.tech[k] = 1; }
  if (!d.tv) { const A = S.pl && S.pl.arm; for (const k in TECH) if (TECH[k].it && ((S.inv[k] || 0) > 0 || (A && (A.k === k || A.g.some(m => m.k === k))) || (S.pl && WPN[S.pl.wm] && WPN[S.pl.wm].need === k))) S.tech[k] = 1; }
  S.tv = 1;
  if (!S.rv) spawnRuins();
  if (!S.hv) spawnHives();
  if (!S.bv) spawnBurrows();
  if (!S.iv) spawnMines();
  if (!S.xv) spawnXdg();
  if (S.dg && !ents.get(S.dg.bid)) S.dg = null;
  S.cars = d.cars || []; S.trains = d.trains || [];
  if (rgd) growNear(d.pl ? d.pl.x : W / 2, d.pl ? d.pl.y : H / 2, 100, 99);
  S.pl = d.pl ? Object.assign({ wk: 0, f: Math.PI / 2, hp: PL_HP, rd: 0 }, d.pl) : newPl();
  if (S.pl.arm === undefined) { S.pl.arm = null; const k = Object.keys(ARMOR).filter(k => S.inv[k] > 0).sort((a, b) => ARMOR[b].a - ARMOR[a].a)[0]; if (k) armWear(k); }
  delete S.pl.aw; delete S.pl.ak;
  if (d.cam) cam = d.cam;
  camFree = false;
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
const mk = k => (S.made && S.made[k]) || 0;
const ACH_G = { ind: 'Metallurgy', chem: 'Chemistry', life: 'Food and medicine', nrg: 'Energy and electronics', log: 'Logistics', eco: 'Trade and scale', def: 'Defence and safety' };
const ACH = [
  ['plate', 'ind', 'Iron Age', 'Cast your first iron plate.', () => mk('plate') >= 1],
  ['steel', 'ind', "Bessemer's Heir", 'Make 50 steel by blowing oxygen through pig iron.', () => mk('steel') >= 50],
  ['cathode', 'ind', 'Four Nines', 'Electrorefine a copper cathode, 99.99% pure.', () => mk('copper_cathode') >= 1],
  ['alu', 'ind', 'Hall–Héroult', 'Smelt aluminium from alumina dissolved in cryolite.', () => mk('aluminium') >= 1],
  ['ti', 'ind', 'Kroll Process', 'Reduce titanium tetrachloride to titanium metal.', () => mk('titanium') >= 1],
  ['gold', 'ind', 'Anode Slime', 'Recover gold from copper refinery slimes.', () => mk('gold') >= 1],
  ['stainless', 'ind', 'Chromium Shield', 'Make stainless steel.', () => mk('stainless') >= 1],
  ['nh3', 'chem', 'Bread from Air', 'Fix nitrogen from the air: ammonia, ammonium sulphate or urea.', () => mk('nh3_cyl') + mk('amm_sulfate') + mk('urea') >= 1],
  ['npk', 'chem', 'Green Revolution', 'Make 100 bags of NPK fertiliser.', () => mk('npk') >= 100],
  ['pe', 'chem', 'Plastic Age', 'Polymerise ethylene into polyethylene.', () => mk('polyethylene') >= 1],
  ['nylon', 'chem', 'Nylon 6,6', 'Spin nylon from adipic acid and hexamethylenediamine.', () => mk('nylon') >= 1],
  ['glass', 'chem', 'Sand to Glass', 'Melt sand, soda ash and lime into glass.', () => mk('glass') + mk('flat_glass') >= 1],
  ['film', 'chem', 'Silver Halide', 'Coat a box of X-ray film.', () => mk('xray_film') >= 1],
  ['match', 'chem', 'Strike on the Box', 'Make safety matches with a red phosphorus striker.', () => mk('matches') >= 1],
  ['vitc', 'life', 'Reichstein', 'Pack vitamin C made through sorbose.', () => mk('vitc_pack') >= 1],
  ['catch', 'eco', 'Full Nets', 'Land 200 fish with a trawler.', () => (S.fk || 0) >= 200],
  ['msy', 'eco', 'Sustainable Yield', 'Land 1000 fish without ever fishing a ground below a quarter of its stock.', () => (S.fk || 0) >= 1000 && !S.fcr],
  ['softgel', 'life', 'Cod Liver Oil, Refined', 'Fill fish oil softgels.', () => mk('softgel') >= 1],
  ['rig', 'nrg', 'Out of Sight of Land', 'Lift crude from an offshore platform for ten minutes.', () => (S.osh || 0) >= 600],
  ['ccgt', 'nrg', 'Combined Cycle', 'Raise steam from gas turbine exhaust in a heat recovery steam generator.', () => (S.hrsg || 0) >= 1],
  ['tidal', 'nrg', 'Slack Water', 'Run four tidal stream turbines.', () => { let n = 0; for (const e of ents.values()) if (e.type === 'tidal') n++; return n >= 4; }],
  ['geo', 'nrg', 'Larderello', 'Flash geothermal fluid into steam 100 times.', () => (S.geo || 0) >= 100],
  ['dle', 'nrg', 'Lithium Valley', 'Pull lithium from geothermal brine with a sorbent column 20 times.', () => (S.dle || 0) >= 20],
  ['owind', 'nrg', 'Horns Rev', 'Run five offshore wind turbines.', () => { let n = 0; for (const e of ents.values()) if (e.type === 'wind_offshore') n++; return n >= 5; }],
  ['kelp', 'chem', 'Courtois', 'Extract iodine from burnt seaweed.', () => mk('kelp_ash') >= 1 && mk('iodine') >= 1],
  ['soap', 'chem', 'Saponification', 'Boil fat with caustic soda into soap.', () => mk('soap') >= 1],
  ['glove', 'life', 'Hevea', 'Dip 100 latex gloves.', () => mk('latex_glove') >= 100],
  ['nrtyre', 'life', 'Para Rubber', 'Mix a masterbatch from smoked natural rubber sheet.', () => (S.nrt || 0) >= 1],
  ['olive', 'life', 'Liquid Gold', 'Bottle 100 litres of extra virgin olive oil.', () => mk('olive_bottle') >= 100],
  ['castile', 'life', 'Castile', 'Make 50 bars of olive oil soap.', () => mk('castile_soap') >= 50],
  ['cork', 'life', 'Montado', 'Punch 1000 natural cork stoppers.', () => mk('cork_stopper') >= 1000],
  ['linen', 'life', 'Linenopolis', 'Weave 100 bolts of linen.', () => mk('linen') >= 100],
  ['lino', 'life', 'Linoxyn', 'Lay 50 rolls of linoleum.', () => mk('linoleum') >= 50],
  ['rice', 'life', 'Paddy Fields', 'Polish 500 bags of white rice.', () => mk('white_rice') >= 500],
  ['sake', 'life', 'Junmai', 'Bottle 100 bottles of sake.', () => mk('sake_bottle') >= 100],
  ['tofu', 'life', 'Nigari', 'Press 200 blocks of tofu.', () => mk('tofu') >= 200],
  ['shoyu', 'life', 'Six Months in Brine', 'Bottle 100 bottles of soy sauce.', () => mk('shoyu_bottle') >= 100],
  ['citrus', 'life', 'Orange Grove', 'Bottle 200 bottles of orange juice.', () => mk('oj_bottle') >= 200],
  ['pectin', 'life', 'It Sets', 'Extract 50 bags of pectin.', () => mk('pectin') >= 50],
  ['carrageen', 'life', 'Irish Moss', 'Refine 50 bags of carrageenan.', () => mk('carrageenan') >= 50],
  ['agar', 'life', 'Fanny Hesse', 'Pour 500 agar plates.', () => mk('agar_plates') >= 500],
  ['maple', 'life', 'Sugaring Off', 'Fill 100 jugs of maple syrup.', () => mk('maple_jug') >= 100],
  ['vanilla', 'life', 'Edmond Albius', 'Cure 100 vanilla pods.', () => mk('vanilla_pods') >= 100],
  ['carmine', 'life', 'Grana Fina', 'Make 50 carmine.', () => mk('carmine') >= 50],
  ['record78', 'life', 'Seventy-Eight', 'Press 500 shellac records.', () => mk('record78') >= 500],
  ['tequila', 'life', 'Jimador', 'Bottle 100 tequila.', () => mk('tequila') >= 100],
  ['palm_kernel', 'life', 'Nut Cracker', 'Crack out 200 palm kernels.', () => mk('palm_kernel') >= 200],
  ['copra', 'life', 'Copra Trader', 'Dry 200 copra.', () => mk('copra') >= 200],
  ['bone_china', 'life', 'Spode\'s Recipe', 'Fire 50 pieces of bone china.', () => mk('bone_china') >= 50],
  ['dark_rum', 'life', 'Black Tot Day', 'Age 50 bottles of dark rum.', () => mk('dark_rum') >= 50],
  ['crisps', 'life', 'Saratoga Chips', 'Fry 200 bags of crisps.', () => mk('crisps') >= 200],
  ['nylon11', 'ind', 'Rilsan', 'Make 100 nylon 11 from castor beans.', () => mk('nylon11') >= 100],
  ['aspartame', 'life', 'Licked Finger', 'Make 100 aspartame.', () => mk('aspartame') >= 100],
  ['ketchup', 'life', 'Love Apple', 'Make 100 bottles of ketchup.', () => mk('ketchup') >= 100],
  ['bamboo_bike', 'eco', 'Grass Bike', 'Build 10 bamboo bicycles.', () => mk('bamboo_bike') >= 10],
  ['mushroom_punnet', 'life', 'Fairy Ring', 'Pack 200 punnets of mushrooms.', () => mk('mushroom_punnet') >= 200],
  ['ripe_banana', 'life', 'Top Banana', 'Ripen 500 bananas.', () => mk('ripe_banana') >= 500],
  ['egg_box', 'life', 'Egg-cellent', 'Box 300 dozen eggs.', () => mk('egg_box') >= 300],
  ['femn', 'ind', 'Seven Kilos a Tonne', 'Smelt ferromanganese in an arc furnace.', () => mk('femn') >= 1],
  ['kmno4', 'chem', 'Purple Crystals', 'Crystallise potassium permanganate.', () => mk('kmno4') >= 1],
  ['mn_steel', 'ind', "Hadfield's Steel", 'Make Hadfield manganese steel.', () => mk('mn_steel') >= 1],
  ['nmc_cell', 'nrg', 'Eight One One', 'Build NMC pouch cells.', () => mk('nmc_cell') >= 1],
  ['sb_metal', 'ind', 'Star Antimony', 'Cast antimony regulus.', () => mk('sb_metal') >= 1],
  ['babbitt', 'ind', 'White Metal', 'Alloy babbitt for plain bearings.', () => mk('babbitt') >= 1],
  ['bronze', 'ind', 'Age of Bronze', 'Melt tin bronze.', () => mk('bronze') >= 1],
  ['bell', 'ind', 'For Whom It Tolls', 'Cast a bronze bell.', () => mk('bell') >= 1],
  ['cuni', 'ind', 'Seawater Proof', 'Alloy 90/10 cupronickel.', () => mk('cuni') >= 1],
  ['invar', 'ind', "Guillaume's Alloy", 'Melt invar in the vacuum furnace.', () => mk('invar') >= 1],
  ['nitinol', 'ind', 'Shape Memory', 'Melt nitinol.', () => mk('nitinol') >= 1],
  ['aspirin', 'life', 'Willow Bark', 'Pack aspirin made from salicylic acid.', () => mk('aspirin_pack') >= 1],
  ['penicillin', 'life', "Fleming's Mould", 'Fill a vial of penicillin.', () => mk('penicillin_vial') >= 1],
  ['bread', 'life', 'Daily Bread', 'Bake bread from flour and yeast.', () => mk('bread') >= 1],
  ['choc', 'life', 'Conched', 'Make chocolate.', () => mk('chocolate') >= 1],
  ['water', 'life', 'Safe to Drink', 'Bottle drinking water.', () => mk('water_bottle') >= 1],
  ['solar', 'nrg', 'Photovoltaic', 'Make a silicon solar cell.', () => mk('solar_cell') >= 1],
  ['led', 'nrg', 'Blue Light', 'Assemble an LED lamp from gallium nitride chips.', () => mk('led_lamp') >= 1],
  ['li', 'nrg', 'Rocking Chair', 'Build a lithium-ion cell.', () => mk('li_cell') + mk('nca_cell') >= 1],
  ['pcb', 'nrg', 'Etched', 'Make a printed circuit board.', () => mk('pcb') >= 1],
  ['fuel', 'nrg', 'Fission Fuel', 'Assemble a low-enriched uranium fuel assembly.', () => mk('fuel_asm') >= 1],
  ['pwr', 'nrg', 'Pressurised', 'Build a pressurised water reactor.', c => (c.pwr || 0) >= 1],
  ['belts', 'log', 'Conveyor Mind', 'Have 200 belts laid.', c => (c.belt || 0) >= 200],
  ['car', 'log', 'Road Trip', 'Put a car or truck on the ground.', () => S.cars.some(v => v.type === 'car' || v.type === 'truck' || v.type === 'etruck')],
  ['boat', 'log', 'Sea Legs', 'Float a boat.', () => S.cars.some(v => VEH[v.type] && VEH[v.type].sea)],
  ['train', 'log', 'Timetable', 'Run a train on an automatic schedule.', () => S.trains.some(t => t.auto && t.sch && t.sch.length >= 2)],
  ['explore', 'log', 'Cartographer', 'Explore 40 regions of an endless world.', () => !!rgd && Array.from(rgd).filter(v => v === 1).length >= 40],
  ['order1', 'eco', 'First Customer', 'Fill an order at a depot.', () => (S.odone || 0) >= 1],
  ['order25', 'eco', 'Trusted Supplier', 'Fill 25 orders.', () => (S.odone || 0) >= 25],
  ['mega', 'eco', 'Megafactory', 'Make 50,000 items in one world.', () => Object.values(S.made || {}).reduce((a, b) => a + b, 0) >= 50000],
  ['notes', 'eco', 'Archivist', 'Learn 10 locked recipes from notebooks and wreckage.', () => Object.keys(S.unl || {}).length >= 10],
  ['kills', 'def', 'Pest Control', 'Kill 50 crawlers.', () => (S.kills || 0) + (S.pk || 0) >= 50],
  ['hive', 'def', 'Nest Breaker', 'Destroy a crawler hive.', () => (S.hk || 0) >= 1],
  ['delve', 'def', 'Delver', 'Climb down into a crawler burrow.', () => (S.dgn || 0) >= 1],
  ['cache', 'def', 'Lost Survey', 'Open 5 survey caches underground.', () => (S.dgc || 0) >= 5],
  ['queen', 'def', 'Regicide', 'Kill a burrow queen.', () => (S.qk || 0) >= 1],
  ['mine', 'def', 'Down the Shaft', 'Ride the cage down into an infested mine.', () => (S.mdn || 0) >= 1],
  ['tyrant', 'def', 'Tyrant Slayer', 'Kill the brood tyrant in the old pump hall of an infested mine.', () => (S.tyk || 0) >= 1],
  ['lavatube', 'def', 'Into the Tube', 'Climb down into a lava tube.', () => (S.lvn || 0) >= 1],
  ['ember', 'def', 'Fire Walker', 'Kill the ember queen of a lava tube.', () => (S.lvk || 0) >= 1],
  ['icecave', 'def', 'Under the Glacier', 'Climb down into an ice cave.', () => (S.icn || 0) >= 1],
  ['frost', 'def', 'Thaw', 'Kill the frost queen of an ice cave.', () => (S.ick || 0) >= 1],
  ['valves', 'def', 'Lockout Tagout', 'Close 5 leaking ammonia valves.', () => (S.vlv || 0) >= 5],
  ['brood', 'def', 'Plant Shutdown', 'Kill the broodmother in the synthesis hall of an ammonia works.', () => (S.wkk || 0) >= 1],
  ['xdelve', 'def', 'Spelunker', 'Go into every kind of dungeon: all three burrows, a mine, a lava tube, an ice cave and an ammonia works.', () => ['nest', 'brim', 'deep', 'mine', 'lava', 'ice', 'works'].every(k => S.dgk && S.dgk[k])],
  ['eggs', 'def', 'Egg Smasher', 'Destroy 15 crawler egg clutches underground.', () => (S.egk || 0) >= 15],
  ['boom', 'def', 'Quarry Blast', 'Kill 5 crawlers with a single thrown charge.', () => !!S.pl.boom],
  ['twelve', 'def', 'Twelve Bore', 'Kill 3 crawlers with one shotgun blast.', () => !!S.pl.sg3],
  ['armour', 'def', 'Plate Carrier', 'Make a ceramic plate carrier from silicon carbide and UHMWPE fibre.', () => (S.inv.ceramic_vest || 0) > 0 || S.pl.arm?.k === 'ceramic_vest'],
  ['clean', 'def', 'Clean Record', 'Run for an hour of game time without a single pipe or vessel failure.', () => S.t >= 3600 && !S.fails],
];
const achGlob = () => { try { return JSON.parse(localStorage.getItem('cfAch') || '{}') || {}; } catch (e) { return {}; } };
function achCounts() { const c = {}; for (const e of ents.values()) c[e.type] = (c[e.type] || 0) + 1; return c; }
function achCheck() {
  S.ach = S.ach || {};
  const c = achCounts(), nw = [];
  for (const [id, , n, d, f] of ACH) {
    if (S.ach[id] || !f(c)) continue;
    S.ach[id] = Math.max(1, Math.round(S.t));
    nw.push([n, d]);
  }
  if (nw.length) {
    const G = achGlob();
    for (const id in S.ach) G[id] = 1;
    try { localStorage.setItem('cfAch', JSON.stringify(G)); } catch (e) {}
    if (nw.length <= 3) for (const [n, d] of nw) toast('Achievement · ' + n + ' — ' + d).classList.add('ach');
    else toast('Achievement · ' + nw.length + ' earned — ' + nw.slice(0, 3).map(a => a[0]).join(', ') + ' and ' + (nw.length - 3) + ' more').classList.add('ach');
  }
  S.rk = S.rk || 0;
  const r = rankOf(achScore());
  while (S.rk < r) {
    S.rk++;
    const R = RANKS[S.rk];
    for (const k in R[2]) give(k, R[2][k]);
    toast('Promoted · ' + R[1] + ' — ' + achGift(R[2]) + ' delivered to your inventory').classList.add('ach');
  }
  achTrk(c);
}
const fmtT = t => { const m = Math.floor(t / 60), hh = Math.floor(m / 60); return hh ? hh + ' h ' + (m % 60) + ' min' : m + ' min ' + (t % 60) + ' s'; };
function toast(msg, bad) {
  const t = document.createElement('div');
  t.className = 'toast' + (bad ? ' bad' : '');
  t.textContent = msg;
  const box = $('#toast');
  box.appendChild(t);
  while (box.children.length > 4) box.firstChild.remove();
  setTimeout(() => t.classList.add('out'), /^(Achievement|Promoted)/.test(msg) ? 5200 : 2200);
  setTimeout(() => t.remove(), /^(Achievement|Promoted)/.test(msg) ? 5700 : 2700);
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

const ST_COL = { idle: '#8ac8e0', scale: '#e04a4a', clean: '#e0b84a', work: '#5fd06a', input: '#e0b84a', output: '#e07a3a', power: '#e04a4a', nopole: '#e04a4a', charge: '#8ad0a0', full: '#5fd06a', none: '#8a8f99', empty: '#8a8f99', forest: '#8a8f99', fuel: '#e0b84a', elem: '#e0b84a', nores: '#8ac8e0' };
const ST_TXT = { idle: 'Idle, no load', scale: 'Tubes choked with scale', clean: 'Descaling', work: 'Working', input: 'Waiting for inputs', output: 'Output full', power: 'No power', nopole: 'Not connected to a power pole', charge: 'Charging', full: 'Fully charged', none: 'No recipe set', empty: 'Depleted', forest: 'No forest in reach', fuel: 'No fuel loaded', elem: 'No elements loaded', nores: 'Nothing to research. Press T' };

let vig = null;
const TREE = { 0: ['#2f5a26', '#477a35'], 5: ['#3a5a30', '#567a40'], 6: ['#22461d', '#3a6a2c'], 7: ['#30503e', '#f4f8fa'] };
function drawNature(ox, oy, z, x0, y0, x1, y1) {
  if (z < 6) return;
  const now = performance.now() / 1000, sh = [], cn = [], hl = [];
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = y * W + x, b = terrain[i];
    if (b === 1) {
      if (z < 10) continue;
      const hh = hash(x, y, 23);
      if (hh > 0.35) continue;
      const a = Math.pow(Math.max(0, Math.sin(now * 0.9 + hh * 40)), 3) * 0.4;
      if (a < 0.02) continue;
      ctx.fillStyle = `rgba(225,242,255,${a.toFixed(3)})`;
      ctx.fillRect(ox + (x + hash(x, y, 24) * 0.6 + Math.sin(now * 0.5 + hh * 9) * 0.08) * z, oy + (y + 0.15 + hash(x, y, 25) * 0.7) * z, z * 0.34, Math.max(1, z * 0.045));
      continue;
    }
    const tc = TREE[b];
    if (!tc || oreType[i] || occ[i]) continue;
    const hh = hash(x, y, 27);
    if (b !== 6 && hh > (b === 5 ? 0.12 : b === 7 ? 0.025 : 0.05)) continue;
    const n = b === 6 && hh < 0.45 ? 2 : 1;
    for (let k = 0; k < n; k++) {
      const cx = ox + (x + 0.22 + hash(x, y, 30 + k) * 0.56) * z, cy = oy + (y + 0.22 + hash(x, y, 40 + k) * 0.56) * z, r = (0.24 + hash(x, y, 50 + k) * 0.16) * z;
      sh.push(cx + r * 0.45, cy + r * 0.55, r * 1.1);
      if (z < 12) { cn.push(cx, cy, r, tc); hl.push(cx - r * 0.3, cy - r * 0.32, r * 0.48, tc); continue; }
      const la = hash(x, y, 60 + k) * 6.28;
      cn.push(cx, cy, r, tc, cx + Math.cos(la) * r * 0.55, cy + Math.sin(la) * r * 0.55, r * 0.7, tc, cx + Math.cos(la + 2.4) * r * 0.5, cy + Math.sin(la + 2.4) * r * 0.5, r * 0.62, tc);
      hl.push(cx - r * 0.3, cy - r * 0.32, r * 0.48, tc, cx + Math.cos(la) * r * 0.45 - r * 0.15, cy + Math.sin(la) * r * 0.45 - r * 0.18, r * 0.3, tc);
    }
  }
  ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath();
  for (let i = 0; i < sh.length; i += 3) { ctx.moveTo(sh[i] + sh[i + 2], sh[i + 1]); ctx.ellipse(sh[i], sh[i + 1], sh[i + 2], sh[i + 2] * 0.75, 0, 0, 7); }
  ctx.fill();
  for (const tc of Object.values(TREE)) {
    let any = false;
    ctx.fillStyle = tc[0]; ctx.beginPath();
    for (let i = 0; i < cn.length; i += 4) if (cn[i + 3] === tc) { any = true; ctx.moveTo(cn[i] + cn[i + 2], cn[i + 1]); ctx.arc(cn[i], cn[i + 1], cn[i + 2], 0, 7); }
    if (!any) continue;
    ctx.fill();
    ctx.fillStyle = tc[1]; ctx.globalAlpha = 0.55; ctx.beginPath();
    for (let i = 0; i < hl.length; i += 4) if (hl[i + 3] === tc) { ctx.moveTo(hl[i] + hl[i + 2], hl[i + 1]); ctx.arc(hl[i], hl[i + 1], hl[i + 2], 0, 7); }
    ctx.fill(); ctx.globalAlpha = 1;
  }
}
function drawSmoke(vis, ox, oy, z) {
  if (z < 8) return;
  const now = performance.now() / 1000;
  for (const e of vis) {
    if (kind(e) !== 'machine' || !e.cy || !e.recipe || e.st === 'power' || e.st === 'nopole' || e.st === 'idle') continue;
    const r = RECIPE[e.recipe], B = BUILD[e.type];
    const gas = Object.keys(r.fo || {}).find(f => isGas(f) || f === 'steam');
    if (!gas && B.cat !== 'Smelting') continue;
    const wh = gas === 'steam' || gas === 'h2o_vap', bx = ox + (e.x + B.w * 0.78) * z, by = oy + (e.y + 0.3) * z;
    for (let k = 0; k < 4; k++) {
      const t = (now * 0.45 + k / 4 + e.id * 0.137) % 1;
      ctx.globalAlpha = 0.38 * (1 - t) * Math.min(1, t * 6);
      ctx.fillStyle = wh ? '#eef2f4' : '#9a948a';
      ctx.beginPath(); ctx.arc(bx + t * z * 0.7 + Math.sin(now * 1.3 + k * 2 + e.id) * z * 0.08, by - t * z * 1.5, z * (0.12 + t * 0.4), 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
function render() {
  const dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight, z = cam.z;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#0d1014';
  ctx.fillRect(0, 0, w, h);
  if (S.dg) { drawDungeon(w, h); return drawWpnHud(w, h); }
  const ox = w / 2 - cam.x * z, oy = h / 2 - cam.y * z;
  const x0 = Math.max(0, Math.floor(-ox / z)), y0 = Math.max(0, Math.floor(-oy / z));
  const x1 = Math.min(W, Math.ceil((w - ox) / z)), y1 = Math.min(H, Math.ceil((h - oy) / z));
  if (x1 <= x0 || y1 <= y0) return;
  ctx.imageSmoothingEnabled = false;
  const t0 = performance.now();
  let grew = 0;
  for (let cy = Math.floor(y0 / CK); cy <= Math.floor((y1 - 1) / CK); cy++) for (let cx = Math.floor(x0 / CK); cx <= Math.floor((x1 - 1) / CK); cx++) {
    if (!rgDone(cx * CK, cy * CK)) { if (!grew) { grew = 1; growRegion(Math.floor(cx * CK / RG), Math.floor(cy * CK / RG), true); } continue; }
    const c = chunkCv(cx, cy, performance.now() - t0 < 14);
    const dx = Math.floor(ox + cx * CK * z), dy = Math.floor(oy + cy * CK * z), dw = Math.floor(ox + (cx + 1) * CK * z) - dx, dh = Math.floor(oy + (cy + 1) * CK * z) - dy;
    if (c) ctx.drawImage(z < 12 ? chunkMip(c, z < 7 ? 64 : 128) : c, dx, dy, dw, dh);
    else ctx.drawImage(ovc, cx * CK, cy * CK, Math.min(CK, W - cx * CK), Math.min(CK, H - cy * CK), dx, dy, dw, dh);
  }
  if (z >= 20) {
    ctx.strokeStyle = 'rgba(0,0,0,0.07)';
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
  drawNature(ox, oy, z, x0, y0, x1, y1);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  for (const e of vis) {
    const k = kind(e);
    if (k === 'pipe' || k === 'belt' || k === 'ubelt' || k === 'splitter' || k === 'inserter' || k === 'hive' || k === 'ruin' || k === 'road' || k === 'rail' || k === 'stop' || k === 'buoy' || k === 'pole' || e.type === 'wind_offshore') continue;
    const B = BUILD[e.type];
    ctx.fillRect(ox + e.x * z + z * 0.18, oy + e.y * z + z * 0.24, B.w * z - z * 0.12, B.h * z - z * 0.12);
  }
  for (const e of vis) if (kind(e) === 'road') drawRoad(e, ox, oy, z);
  for (const e of vis) if (kind(e) === 'rail') drawRail(e, ox, oy, z);
  for (const e of vis) if (kind(e) === 'pipe') drawPipe(e, ox, oy, z);
  for (const e of vis) if (kind(e) === 'belt' || kind(e) === 'splitter') drawBelt(e, ox, oy, z);
  for (const e of vis) if (kind(e) === 'ubelt') drawUBelt(e, ox, oy, z);
  for (const e of vis) if (belty(e)) drawBeltItems(e, ox, oy, z);
  for (const e of vis) if (kind(e) === 'ubelt') drawUHood(e, ox, oy, z);
  for (const e of vis) if (kind(e) === 'splitter') drawSplit(e, ox, oy, z);
  for (const e of vis) if (kind(e) !== 'pipe' && !belty(e) && kind(e) !== 'road' && kind(e) !== 'rail' && kind(e) !== 'inserter') drawBuilding(e, ox, oy, z);
  for (const e of vis) if (kind(e) === 'inserter') drawIns(e, ox, oy, z);
  { const sp = sel && ents.get(sel), tk = tool && BUILD[tool] && BUILD[tool].kind;
    if (tk === 'pole' || (sp && kind(sp) === 'pole') || (wired() && tool && BUILD[tool] && pwUser({ type: tool }))) drawSupply(ox, oy, z, x0, y0, x1, y1, sp && kind(sp) === 'pole' ? sp.pg : -9); }
  drawWires(ox, oy, z, x0, y0, x1, y1);
  drawSmoke(vis, ox, oy, z);
  drawWakes(ox, oy, z);
  if (z >= 10) drawShoals(ox, oy, z, x0, y0, x1, y1);
  { const sv = selCar && carOf(selCar); if (sv && VEH[sv.type].sea && sv.auto && sv.route) drawBoatRoute(sv, ox, oy, z); }
  for (const v of S.cars) if (v.x > x0 - 3 && v.x < x1 + 3 && v.y > y0 - 3 && v.y < y1 + 3) drawCar(v, ox + v.x * z, oy + v.y * z, z);
  for (const t of S.trains) drawTrain(t, ox, oy, z);
  drawPuffs(ox, oy, z);
  if (!S.pl.car) drawPlayer(ox, oy, z);
  drawBugs(ox, oy, z, x0, y0, x1, y1);
  if (wired()) drawNoPw(vis, ox, oy, z);
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
  if (altMode) drawAlt(vis, ox, oy, z);
  drawNades(ox, oy, z, false);
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
  if (!vig || vig.w !== w || vig.h !== h) {
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.38, w / 2, h / 2, Math.hypot(w, h) * 0.62);
    g.addColorStop(0, 'rgba(10,8,4,0)'); g.addColorStop(1, 'rgba(10,8,4,0.45)');
    vig = { w, h, g };
  }
  ctx.fillStyle = vig.g; ctx.fillRect(0, 0, w, h);
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
  if (S.pl.dead > 0) {
    ctx.fillStyle = 'rgba(40,0,0,0.35)'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffd0c0'; ctx.font = 'bold 22px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Respawning in ' + Math.ceil(S.pl.dead) + '…', w / 2, h / 2 - 40);
    ctx.textAlign = 'left';
  }
  const dtr = S.pl.car && trainOf(S.pl.car);
  if (dtr) {
    const bx = 14, by = h - 98;
    ctx.fillStyle = 'rgba(14,16,20,0.84)'; ctx.beginPath(); ctx.roundRect(bx, by, 300, 84, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#e8e4d8'; ctx.font = 'bold 13px system-ui, sans-serif'; const dsl = dtr.cars.some(q => q.type === 'loco'), nel = dtr.cars.filter(q => q.type === 'eloco').length; ctx.fillText(nm(dsl ? 'loco' : 'eloco'), bx + 12, by + 22);
    ctx.textAlign = 'right'; ctx.font = 'bold 24px ui-monospace, monospace'; ctx.fillText(Math.round(dtr.v * 3.6), bx + 256, by + 28);
    ctx.font = '11px system-ui, sans-serif'; ctx.fillStyle = '#9aa0a8'; ctx.fillText('km/h', bx + 288, by + 28); ctx.textAlign = 'left';
    ctx.fillText(dsl ? 'Fuel' : 'Pack', bx + 12, by + 48); ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(bx + 60, by + 40, 110, 9);
    ctx.fillStyle = dsl ? '#d8b848' : '#5aa0e0'; ctx.fillRect(bx + 60, by + 40, 110 * Math.min(1, dsl ? (dtr.e || 0) / CAN_MJ : (dtr.bc || 0) / (T_EBAT * nel)), 9);
    ctx.fillStyle = '#9aa0a8'; ctx.fillText(!dsl ? Math.round((dtr.bc || 0) / 3600) + ' kWh' : dtr.fc ? '+' + dtr.fc + ' can' + (dtr.fc > 1 ? 's' : '') : (S.inv.jerrycan || 0) + ' in pack', bx + 178, by + 48);
    ctx.fillText(dtr.auto ? dtr.st || '' : 'Next junction: ' + (dtr.turn > 0 ? 'right' : dtr.turn < 0 ? 'left' : 'straight on'), bx + 12, by + 64);
    ctx.fillStyle = '#6a7078'; ctx.font = '10px system-ui, sans-serif'; ctx.fillText(dtr.auto ? 'Running on its schedule · F get out' : 'W throttle · S brake, then reverse · hold A/D at junctions · F get out', bx + 12, by + 78);
  }
  const dv = S.pl.car && carOf(S.pl.car);
  if (dv) {
    const bx = 14, by = h - 98, sp = Math.round(Math.abs(dv.v) * 3.6), V = VEH[dv.type];
    ctx.fillStyle = 'rgba(14,16,20,0.84)'; ctx.beginPath(); ctx.roundRect(bx, by, 240, 84, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#e8e4d8'; ctx.font = 'bold 13px system-ui, sans-serif'; ctx.fillText(nm(dv.type), bx + 12, by + 22);
    ctx.textAlign = 'right'; ctx.font = 'bold 24px ui-monospace, monospace'; ctx.fillText(sp, bx + 196, by + 28);
    ctx.font = '11px system-ui, sans-serif'; ctx.fillStyle = '#9aa0a8'; ctx.fillText('km/h', bx + 228, by + 28); ctx.textAlign = 'left';
    const gauge = (y, lab, f, col, txt) => { ctx.fillStyle = '#9aa0a8'; ctx.font = '11px system-ui, sans-serif'; ctx.fillText(lab, bx + 12, y + 8); ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(bx + 50, y, 120, 9); ctx.fillStyle = col; ctx.fillRect(bx + 50, y, 120 * Math.max(0, Math.min(1, f)), 9); ctx.fillStyle = '#c8c4b8'; ctx.fillText(txt, bx + 178, y + 8); };
    if (V.oar) gauge(by + 40, 'Hold', carSlots(dv) / V.slots, '#b08a5a', carSlots(dv) + ' / ' + V.slots);
    else if (V.el) gauge(by + 40, 'Pack', (dv.e || 0) / V.cap, '#5ab0e8', Math.round((dv.e || 0) / 3.6) + ' kWh');
    else gauge(by + 40, 'Fuel', (dv.e || 0) / CAN_MJ, '#d8b848', dv.fc ? '+' + dv.fc + ' can' + (dv.fc > 1 ? 's' : '') : (S.inv.jerrycan || 0) + ' in pack');
    gauge(by + 56, 'Body', dv.hp / V.hp, dv.hp / V.hp > 0.5 ? '#7fe08a' : dv.hp / V.hp > 0.25 ? '#e0b84a' : '#e04a4a', Math.round(dv.hp / V.hp * 100) + '%');
    ctx.fillStyle = '#6a7078'; ctx.font = '10px system-ui, sans-serif'; ctx.fillText(V.net ? (dv.net ? 'Gear down · ' + (dv.ct || 'trawling') + ' · N haul' : 'W/S throttle · A/D rudder · N shoot the gear') : V.oar ? 'W/S row ahead and astern · A/D turn · F get off at a shore' : V.sea ? (dv.foul > 0.3 ? 'Hull fouled: ' + Math.round(dv.foul * 40) + '% slower · repaint with antifouling' : 'W/S throttle and astern · A/D rudder · F get off at a shore') : V.el ? 'W/S throttle and regenerative brake · A/D steer · F get out' : 'W/S throttle and brake · A/D steer · F get out', bx + 12, by + 78);
  }
  if (!dv && !dtr) drawWpnHud(w, h);
  if (tool && mouse.in) {
    ctx.strokeStyle = 'rgba(255,255,255,0.32)'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.arc(ox + S.pl.x * z, oy + S.pl.y * z, REACH * z, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    drawGhost(ox, oy, z);
  }
  else if (mouse.in && mouse.tx >= 0 && mouse.tx < W && mouse.ty >= 0 && mouse.ty < H) {
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(ox + mouse.tx * z + 0.5, oy + mouse.ty * z + 0.5, z - 1, z - 1);
  }
}

function pipeLinks(e, d) {
  const f = ugFace(e);
  if (f != null && f !== d) return false;
  const o = at(e.x + DX[d], e.y + DY[d]);
  if (!o) return false;
  const k = kind(o);
  if (k === 'booster') return o.dir % 2 === d % 2;
  if (k === 'pipe' && !ugOk(o, e)) return false;
  return k === 'pipe' || k === 'engine' || k === 'pump' || k === 'machine';
}

function drawPipe(e, ox, oy, z) {
  const P = NP(e), cx = ox + (e.x + 0.5) * z, cy = oy + (e.y + 0.5) * z, t = z * (P.dn >= 100 ? 0.5 : 0.34);
  if (BUILD[e.type].sea && terrain[e.y * W + e.x] === 1) ctx.globalAlpha = 0.55;
  const rust = Math.min(1, e.wear || 0);
  ctx.fillStyle = rust > 0.05 ? mix(BUILD[e.type].c, '#9a4a1a', rust) : shade(BUILD[e.type].c, 0.8);
  for (let d = 0; d < 4; d++) if (pipeLinks(e, d)) {
    if (DX[d]) ctx.fillRect(DX[d] > 0 ? cx : cx - z / 2, cy - t / 2, z / 2, t);
    else ctx.fillRect(cx - t / 2, DY[d] > 0 ? cy : cy - z / 2, t, z / 2);
  }
  const bw = t * (0.7 + Math.min(0.35, (e.strain || 0) / P.duct * 0.35 || 0));
  if (BUILD[e.type].ug) {
    const f = ugFace(e), r = z * 0.36, hx = cx + DX[e.dir] * z * 0.08, hy = cy + DY[e.dir] * z * 0.08;
    ctx.fillStyle = shade(BUILD[e.type].c, 0.55); ctx.beginPath(); ctx.arc(hx, hy, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = shade(BUILD[e.type].c, 0.95); ctx.beginPath(); ctx.arc(hx, hy, r * 0.78, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#15171a'; ctx.beginPath(); ctx.arc(hx + DX[e.dir] * r * 0.25, hy + DY[e.dir] * r * 0.25, r * 0.42, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = shade(BUILD[e.type].c, 0.7);
    if (DX[f]) ctx.fillRect(cx + DX[f] * z * 0.3 - z * 0.04, cy - t * 0.75, z * 0.08, t * 1.5); else ctx.fillRect(cx - t * 0.75, cy + DY[f] * z * 0.3 - z * 0.04, t * 1.5, z * 0.08);
    if (e.fl && e.amt > 0.5) { ctx.fillStyle = col(e.fl); const s = r * 0.5 * Math.sqrt(Math.min(1, e.amt / P.v)); ctx.beginPath(); ctx.arc(hx - DX[e.dir] * r * 0.35, hy - DY[e.dir] * r * 0.35, s, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
    return;
  }
  ctx.fillRect(cx - bw, cy - bw, bw * 2, bw * 2);
  if (e.strain > 0.01) { ctx.strokeStyle = '#ff4a3a'; ctx.lineWidth = Math.max(1, z * 0.06); ctx.strokeRect(cx - bw, cy - bw, bw * 2, bw * 2); }
  if (P.lined && z >= 12) { ctx.fillStyle = '#c8cce0'; ctx.fillRect(cx - bw, cy - bw, bw * 2, Math.max(1, z * 0.04)); }
  if (e.fl && e.amt > 0.5) {
    ctx.fillStyle = col(e.fl);
    const f = Math.min(1, e.amt / P.v), s = t * 1.1 * Math.sqrt(f);
    ctx.fillRect(cx - s / 2, cy - s / 2, s, s);
  }
  ctx.globalAlpha = 1;
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

const LANE = 0.22;
function beltArc(e) {
  const s = e.cv - 1, d = e.dir;
  return { cx: e.x + 0.5 + (DX[s] + DX[d]) * 0.5, cy: e.y + 0.5 + (DY[s] + DY[d]) * 0.5, a0: Math.atan2(-DY[d], -DX[d]), a1: Math.atan2(-DY[s], -DX[s]), right: d === ((s + 2) % 4 + 1) % 4 };
}
function angLerp(a0, a1, f) {
  let da = a1 - a0;
  while (da > Math.PI) da -= 2 * Math.PI;
  while (da < -Math.PI) da += 2 * Math.PI;
  return a0 + da * f;
}
function beltPos(e, p, l) {
  if (kind(e) === 'belt' && e.cv) {
    const A = beltArc(e), inner = A.right ? l === 1 : l === 0, r = 0.5 + (inner ? -LANE : LANE), a = angLerp(A.a0, A.a1, Math.max(0, Math.min(1, p)));
    return { x: A.cx + Math.cos(a) * r, y: A.cy + Math.sin(a) * r };
  }
  const R = (e.dir + 1) % 4, o = l ? LANE : -LANE;
  return { x: e.x + 0.5 + DX[e.dir] * (p - 0.5) + DX[R] * o, y: e.y + 0.5 + DY[e.dir] * (p - 0.5) + DY[R] * o };
}

function beltDeck(B, z, off, y0, y1) {
  const h = (y1 - y0) * z;
  ctx.fillStyle = shade(B.c, 0.42); ctx.fillRect(-z / 2, y0 * z, z, h);
  ctx.fillStyle = '#34363a'; ctx.fillRect(-z * 0.4, y0 * z, z * 0.8, h);
  ctx.fillStyle = shade(B.c, 0.9); ctx.fillRect(-z / 2, y0 * z, z * 0.08, h); ctx.fillRect(z * 0.42, y0 * z, z * 0.08, h);
  if (z < 10) return;
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-z / 2 + z * 0.08, y0 * z, z * 0.03, h); ctx.fillRect(z * 0.39, y0 * z, z * 0.03, h);
  ctx.fillStyle = '#26272a';
  for (let k = -1; k < 6; k++) { const yy = 0.5 - (k + off) * 0.2; if (yy < y0 - 0.06 || yy > y1) continue; ctx.fillRect(-z * 0.4, Math.max(y0, yy) * z, z * 0.8, Math.max(1, z * 0.05)); }
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  for (let k = -1; k < 6; k++) { const yy = 0.5 - (k + off) * 0.2 + 0.05; if (yy < y0 || yy > y1) continue; ctx.fillRect(-z * 0.4, yy * z, z * 0.8, Math.max(1, z * 0.025)); }
  if (z >= 16) {
    ctx.strokeStyle = shade(B.c, 0.75); ctx.globalAlpha = 0.5; ctx.lineWidth = Math.max(1, z * 0.04);
    const yy = (y0 + y1) / 2 * z;
    ctx.beginPath(); ctx.moveTo(-z * 0.1, yy + z * 0.05); ctx.lineTo(0, yy - z * 0.05); ctx.lineTo(z * 0.1, yy + z * 0.05); ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function drawBelt(e, ox, oy, z) {
  const B = BUILD[e.type], x = ox + e.x * z, y = oy + e.y * z, off = (S.t * (B.v || 2) * 5) % 1;
  if (e.cv) {
    const A = beltArc(e), cx = ox + A.cx * z, cy = oy + A.cy * z, ccw = !A.right;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, z, z); ctx.clip();
    ctx.beginPath(); ctx.arc(cx, cy, z * 0.9, A.a0, A.a1, ccw); ctx.arc(cx, cy, z * 0.1, A.a1, A.a0, !ccw); ctx.closePath();
    ctx.fillStyle = '#34363a'; ctx.fill();
    ctx.lineWidth = z * 0.08; ctx.strokeStyle = shade(B.c, 0.9);
    ctx.beginPath(); ctx.arc(cx, cy, z * 0.96, A.a0, A.a1, ccw); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, z * 0.04 + 0.5, A.a0, A.a1, ccw); ctx.stroke();
    if (z >= 10) {
      ctx.strokeStyle = '#26272a'; ctx.lineWidth = Math.max(1, z * 0.05);
      for (let k = 0; k < 5; k++) {
        const a = angLerp(A.a0, A.a1, ((k + off) / 4) % 1.25);
        if ((k + off) / 4 > 1) continue;
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * z * 0.1, cy + Math.sin(a) * z * 0.1); ctx.lineTo(cx + Math.cos(a) * z * 0.9, cy + Math.sin(a) * z * 0.9); ctx.stroke();
      }
    }
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.translate(x + z / 2, y + z / 2);
  ctx.rotate(e.dir * Math.PI / 2);
  beltDeck(B, z, off, -0.5, 0.5);
  ctx.restore();
}

function drawUBelt(e, ox, oy, z) {
  const B = BUILD[e.type], x = ox + e.x * z, y = oy + e.y * z, off = (S.t * (B.v || 2) * 5) % 1;
  ctx.save();
  ctx.translate(x + z / 2, y + z / 2);
  ctx.rotate(e.dir * Math.PI / 2);
  if (e.mode === 'in') beltDeck(B, z, off, 0, 0.5); else beltDeck(B, z, off, -0.5, 0);
  ctx.restore();
}

function drawUHood(e, ox, oy, z) {
  const B = BUILD[e.type], x = ox + e.x * z, y = oy + e.y * z, inn = e.mode === 'in', ok = !!ugPair(e);
  ctx.save();
  ctx.translate(x + z / 2, y + z / 2);
  ctx.rotate(e.dir * Math.PI / 2);
  if (!inn) ctx.scale(1, -1);
  const y0 = -0.5 * z, y1 = 0.08 * z;
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-z * 0.46, y0 + z * 0.06, z * 0.96, y1 - y0);
  ctx.fillStyle = shade(B.c, 0.5); ctx.fillRect(-z * 0.5, y0, z, y1 - y0);
  ctx.fillStyle = shade(B.c, 0.85); ctx.fillRect(-z * 0.5, y0, z * 0.1, y1 - y0); ctx.fillRect(z * 0.4, y0, z * 0.1, y1 - y0);
  ctx.fillStyle = shade(B.c, 1.05); ctx.fillRect(-z * 0.4, y0, z * 0.8, z * 0.12);
  ctx.fillStyle = '#121315'; ctx.fillRect(-z * 0.36, y1 - z * 0.14, z * 0.72, z * 0.14);
  if (z >= 12) {
    ctx.fillStyle = ok ? shade(B.c, 1.2) : '#e05a4a';
    ctx.beginPath(); ctx.moveTo(0, y0 + z * 0.16); ctx.lineTo(z * 0.16, y0 + z * 0.34); ctx.lineTo(-z * 0.16, y0 + z * 0.34); ctx.closePath();
    if (!inn) { ctx.save(); ctx.translate(0, y0 + z * 0.25); ctx.scale(1, -1); ctx.translate(0, -(y0 + z * 0.25)); ctx.fill(); ctx.restore(); } else ctx.fill();
  }
  ctx.restore();
}

function drawSplit(e, ox, oy, z) {
  const B = BUILD[e.type], g = (lists().sg.get(e.id) || [e]).length;
  ctx.save();
  ctx.translate(ox + (e.x + 0.5) * z, oy + (e.y + 0.5) * z);
  ctx.rotate(e.dir * Math.PI / 2);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-z * 0.46, -z * 0.1, z * 0.96, z * 0.3);
  ctx.fillStyle = shade(B.c, 0.55); ctx.fillRect(-z * 0.5, -z * 0.16, z, z * 0.32);
  ctx.fillStyle = shade(B.c, 1.05); ctx.fillRect(-z * 0.5, -z * 0.16, z, z * 0.08);
  ctx.fillStyle = shade(B.c, 0.8); ctx.fillRect(-z * 0.5, -z * 0.16, z * 0.1, z * 0.32); ctx.fillRect(z * 0.4, -z * 0.16, z * 0.1, z * 0.32);
  if (z >= 12) {
    ctx.fillStyle = g > 1 ? shade(B.c, 1.3) : '#f0d070';
    ctx.beginPath(); ctx.moveTo(0, -z * 0.12); ctx.lineTo(z * 0.12, z * 0.06); ctx.lineTo(-z * 0.12, z * 0.06); ctx.closePath(); ctx.fill();
    if (g === 1) { ctx.fillRect(-z * 0.36, -z * 0.03, z * 0.14, z * 0.06); ctx.fillRect(z * 0.22, -z * 0.03, z * 0.14, z * 0.06); }
  }
  ctx.restore();
}

function drawIns(e, ox, oy, z) {
  const B = BUILD[e.type], r = B.r || 1, cx = ox + (e.x + 0.5) * z, cy = oy + (e.y + 0.5) * z;
  const a = -Math.PI / 2 + e.dir * Math.PI / 2 + Math.PI * (1 - (e.ph || 0)), L2 = r * z * 0.85;
  const hx = cx + Math.cos(a) * L2, hy = cy + Math.sin(a) * L2;
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(cx - z * 0.28, cy - z * 0.24, z * 0.62, z * 0.62);
  ctx.fillStyle = shade(B.c, 0.4); ctx.fillRect(cx - z * 0.32, cy - z * 0.32, z * 0.64, z * 0.64);
  ctx.fillStyle = shade(B.c, 0.7); ctx.fillRect(cx - z * 0.26, cy - z * 0.26, z * 0.52, z * 0.52);
  if (z >= 12) arrow(cx + DX[e.dir] * z * 0.16, cy + DY[e.dir] * z * 0.16, e.dir, z * 0.1, 'rgba(0,0,0,0.6)');
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = Math.max(2, z * 0.16);
  ctx.beginPath(); ctx.moveTo(cx + z * 0.06, cy + z * 0.08); ctx.lineTo(hx + z * 0.06, hy + z * 0.08); ctx.stroke();
  ctx.strokeStyle = shade(B.c, 0.85); ctx.lineWidth = Math.max(2, z * 0.12);
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(hx, hy); ctx.stroke();
  ctx.strokeStyle = shade(B.c, 1.25); ctx.lineWidth = Math.max(1, z * 0.04);
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(hx, hy); ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.fillStyle = shade(B.c, 1.1); ctx.beginPath(); ctx.arc(cx, cy, z * 0.15, 0, 7); ctx.fill();
  ctx.fillStyle = '#2a2c30'; ctx.beginPath(); ctx.arc(cx, cy, z * 0.06, 0, 7); ctx.fill();
  if (e.hn && e.hand) {
    ctx.fillStyle = col(e.hand); ctx.beginPath(); ctx.arc(hx, hy, Math.max(1.5, z * 0.13), 0, 7); ctx.fill();
    if (z >= 14) { ctx.strokeStyle = 'rgba(0,0,0,0.65)'; ctx.lineWidth = 1; ctx.stroke(); }
  }
  ctx.fillStyle = '#2a2c30';
  const px = -Math.sin(a) * z * 0.1, py = Math.cos(a) * z * 0.1;
  ctx.fillRect(hx + px - z * 0.03, hy + py - z * 0.03, z * 0.06, z * 0.06); ctx.fillRect(hx - px - z * 0.03, hy - py - z * 0.03, z * 0.06, z * 0.06);
}

function drawBeltItems(e, ox, oy, z) {
  const r = Math.max(1.5, z * 0.12);
  let len = 1, ex = null;
  if (kind(e) === 'ubelt') { if (e.mode !== 'in') return; const u = ugPair(e); if (u) { len = u.n + 1; ex = u.o; } }
  for (const it of e.items) {
    let q;
    if (kind(e) === 'ubelt') {
      if (it.p <= 0.5) q = beltPos(e, it.p, it.l || 0);
      else if (ex && it.p >= len - 0.5) q = beltPos(ex, it.p - len + 1, it.l || 0);
      else continue;
    } else q = beltPos(e, it.p, it.l || 0);
    const px = ox + q.x * z, py = oy + q.y * z;
    if (z >= 14) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.arc(px + r * 0.25, py + r * 0.35, r, 0, Math.PI * 2); ctx.fill(); }
    if (z >= 14) { const q2 = z * 0.42; ctx.drawImage(icoCv(it.i), px - q2 / 2, py - q2 / 2, q2, q2); continue; }
    ctx.fillStyle = col(it.i);
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
    if (z >= 14) {
      ctx.strokeStyle = 'rgba(0,0,0,0.65)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(px - r * 0.3, py - r * 0.3, r * 0.35, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawUgLinks(ox, oy, z, fam) {
  ctx.save();
  ctx.setLineDash([z * 0.18, z * 0.12]); ctx.lineWidth = Math.max(1, z * 0.06);
  for (const e of ents.values()) {
    const B = BUILD[e.type];
    if (!B.ug || B.kind !== fam || (fam === 'ubelt' && e.mode !== 'in')) continue;
    const u = ugPair(e);
    if (!u || (fam === 'pipe' && u.o.id < e.id)) continue;
    ctx.strokeStyle = fam === 'pipe' ? 'rgba(140,200,255,0.75)' : 'rgba(255,220,120,0.8)';
    ctx.beginPath(); ctx.moveTo(ox + (e.x + 0.5) * z, oy + (e.y + 0.5) * z); ctx.lineTo(ox + (u.o.x + 0.5) * z, oy + (u.o.y + 0.5) * z); ctx.stroke();
  }
  ctx.restore();
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

function drawPlayer(ox, oy, z) {
  const P = S.pl;
  if (P.dead > 0) return;
  const X = ox + P.x * z, Y = oy + P.y * z, s = z * 0.95, wk = P.mv ? Math.sin(P.wk) : 0;
  const fx = Math.cos(P.f), fy = Math.sin(P.f), side = Math.abs(fx) > 0.6, up = !side && fy < 0;
  if (S.t - (P.dz ?? -9) < 0.2) { ctx.strokeStyle = 'rgba(170,200,255,0.8)'; ctx.lineWidth = Math.max(1, z * 0.06); ctx.beginPath(); for (let j = 0; j <= 24; j++) { const a = j / 24 * Math.PI * 2, r = z * (2.5 + (Math.random() - 0.5) * 0.3); ctx.lineTo(X + Math.cos(a) * r, Y + Math.sin(a) * r); } ctx.stroke(); }
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.beginPath(); ctx.ellipse(X + s * 0.1, Y + s * 0.42, s * 0.3, s * 0.12, 0, 0, 7); ctx.fill();
  const leg = (dx, ph) => { ctx.fillStyle = '#2b3038'; ctx.fillRect(X + dx - s * 0.06, Y + s * 0.08, s * 0.12, s * 0.3 + ph * s * 0.06); ctx.fillStyle = '#16181c'; ctx.fillRect(X + dx - s * 0.07, Y + s * 0.34 + ph * s * 0.06, s * 0.14, s * 0.07); };
  if (side) { leg(fx * wk * s * 0.1, 0); leg(-fx * wk * s * 0.1, 0); } else { leg(-s * 0.09, wk); leg(s * 0.09, -wk); }
  const pack = () => { ctx.fillStyle = '#5a5e52'; ctx.fillRect(X - s * 0.17 - (side ? fx * s * 0.12 : 0), Y - s * 0.2, s * 0.34, s * 0.3); ctx.fillStyle = '#7a7e70'; ctx.fillRect(X - s * 0.14 - (side ? fx * s * 0.12 : 0), Y - s * 0.17, s * 0.28, s * 0.06); };
  if (!up) pack();
  const tg = ctx.createLinearGradient(X - s * 0.2, 0, X + s * 0.2, 0);
  tg.addColorStop(0, '#9a4e1c'); tg.addColorStop(0.45, '#e08a38'); tg.addColorStop(1, '#a8561e');
  ctx.fillStyle = tg;
  ctx.beginPath(); ctx.roundRect(X - s * 0.19, Y - s * 0.24, s * 0.38, s * 0.36, s * 0.08); ctx.fill();
  ctx.fillStyle = '#d8c040'; ctx.fillRect(X - s * 0.19, Y - s * 0.02, s * 0.38, s * 0.04);
  if (up) pack();
  const arm = (dx, ph) => { ctx.fillStyle = '#c4702c'; ctx.fillRect(X + dx - s * 0.05, Y - s * 0.2 + ph * s * 0.05, s * 0.1, s * 0.26); ctx.fillStyle = '#3a3a3a'; ctx.fillRect(X + dx - s * 0.05, Y + s * 0.04 + ph * s * 0.05, s * 0.1, s * 0.06); };
  if (side) arm(-fx * s * 0.02, -wk); else { arm(-s * 0.24, -wk); arm(s * 0.24, wk); }
  const hx = X + (side ? fx * s * 0.03 : 0), hy = Y - s * 0.36;
  ctx.fillStyle = up ? '#4a3a2a' : '#e2b08a';
  ctx.beginPath(); ctx.arc(hx, hy, s * 0.14, 0, 7); ctx.fill();
  ctx.fillStyle = '#e8c838';
  ctx.beginPath(); ctx.arc(hx, hy - s * 0.03, s * 0.15, Math.PI, 0); ctx.fill();
  ctx.fillRect(hx - s * 0.17, hy - s * 0.04, s * 0.34, s * 0.035);
  if (!up && z >= 14) { ctx.fillStyle = '#222'; const ex = side ? fx * s * 0.06 : 0; ctx.fillRect(hx + ex - s * 0.06, hy + s * 0.01, s * 0.03, s * 0.03); if (!side) ctx.fillRect(hx + s * 0.03, hy + s * 0.01, s * 0.03, s * 0.03); }
  if (S.t - (P.st || -9) < 0.08) { ctx.strokeStyle = 'rgba(160,230,255,0.9)'; ctx.lineWidth = Math.max(1, z * 0.03); ctx.beginPath(); ctx.moveTo(X, Y - s * 0.45); ctx.lineTo(ox + P.stx * z, oy + P.sty * z); ctx.stroke(); }
  if (S.t - (P.sh || -9) < 0.25) {
    const gx = X + fx * s * 0.25, gy = Y - s * 0.05 + fy * s * 0.25;
    ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = Math.max(2, s * 0.07);
    ctx.beginPath(); ctx.moveTo(X, Y - s * 0.05); ctx.lineTo(gx, gy); ctx.stroke();
    if (S.t - P.sh < 0.1) { ctx.strokeStyle = 'rgba(255,230,140,0.9)'; ctx.lineWidth = Math.max(1, z * 0.04); ctx.beginPath(); if (P.sw === 'arc' && P.ch) { ctx.strokeStyle = 'rgba(170,200,255,0.95)'; let px = gx, py = gy; for (const [cx, cy] of P.ch) { const X = ox + cx * z, Y = oy + cy * z; ctx.moveTo(px, py); for (let j = 1; j < 5; j++) ctx.lineTo(px + (X - px) * j / 5 + (Math.random() - 0.5) * z * 0.4, py + (Y - py) * j / 5 + (Math.random() - 0.5) * z * 0.4); ctx.lineTo(X, Y); px = X; py = Y; } } else if (P.sw === 'shotgun') { const a = Math.atan2(P.ty * z + oy - gy, P.tx * z + ox - gx), L = Math.hypot(P.ty * z + oy - gy, P.tx * z + ox - gx); for (let k = -2.5; k <= 2.5; k++) { ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.cos(a + k * 0.07) * L, gy + Math.sin(a + k * 0.07) * L); } } else { ctx.moveTo(gx, gy); ctx.lineTo(ox + P.tx * z, oy + P.ty * z); } ctx.stroke(); }
  }
  if (P.hp < PL_HP) {
    const bw = s * 0.7, by = hy - s * 0.32;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(X - bw / 2, by, bw, Math.max(3, s * 0.07));
    ctx.fillStyle = P.hp / PL_HP > 0.5 ? '#7fe08a' : P.hp / PL_HP > 0.25 ? '#e0b84a' : '#e04a4a';
    ctx.fillRect(X - bw / 2, by, bw * P.hp / PL_HP, Math.max(3, s * 0.07));
  }
}
function drawRoad(e, ox, oy, z) {
  const X = ox + e.x * z, Y = oy + e.y * z, cc = e.type === 'conc_road';
  const nb = d => { const o = at(e.x + DX[d], e.y + DY[d]); return o && kind(o) === 'road'; };
  ctx.fillStyle = cc ? '#9c9a92' : '#2c2d31';
  ctx.fillRect(X, Y, z + 0.5, z + 0.5);
  const hsh = ((e.x * 73856093) ^ (e.y * 19349663)) >>> 0;
  ctx.fillStyle = cc ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)';
  for (let i = 0; i < 4; i++) { const r = (hsh >> (i * 6)) & 63; ctx.fillRect(X + (r & 7) / 8 * z, Y + (r >> 3) / 8 * z, z * 0.08, z * 0.08); }
  const edge = cc ? 'rgba(60,58,52,0.55)' : 'rgba(150,150,140,0.35)';
  ctx.fillStyle = edge;
  const t = Math.max(1, z * 0.05);
  if (!nb(0)) ctx.fillRect(X, Y, z, t);
  if (!nb(2)) ctx.fillRect(X, Y + z - t, z, t);
  if (!nb(3)) ctx.fillRect(X, Y, t, z);
  if (!nb(1)) ctx.fillRect(X + z - t, Y, t, z);
  if (cc) { ctx.fillStyle = 'rgba(40,38,34,0.35)'; if (e.x % 3 === 0) ctx.fillRect(X, Y, Math.max(1, z * 0.02), z); if (e.y % 3 === 0) ctx.fillRect(X, Y, z, Math.max(1, z * 0.02)); return; }
  if (z < 10) return;
  ctx.fillStyle = 'rgba(232,220,150,0.75)';
  const h = nb(1) && nb(3), v = nb(0) && nb(2);
  if (h && !v && e.x % 2 === 0) ctx.fillRect(X + z * 0.1, Y + z * 0.47, z * 0.8, z * 0.06);
  if (v && !h && e.y % 2 === 0) ctx.fillRect(X + z * 0.47, Y + z * 0.1, z * 0.06, z * 0.8);
}
function drawCar(v, X, Y, z, al) {
  const V = VEH[v.type], L = V.hl * z, R = V.hw * z, tr = v.type === 'truck' || v.type === 'etruck', c = V.c;
  if (V.sea) return drawBoat(v, X, Y, z, al);
  ctx.save(); ctx.translate(X, Y); ctx.rotate(v.a);
  if (al != null) ctx.globalAlpha = al;
  const drv = S.pl.car === v.id;
  if (drv && v.v > 1) {
    const g = ctx.createLinearGradient(L, 0, L + z * 4, 0);
    g.addColorStop(0, 'rgba(255,244,200,0.16)'); g.addColorStop(1, 'rgba(255,244,200,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(L, -R * 0.8); ctx.lineTo(L + z * 4, -R * 2.6); ctx.lineTo(L + z * 4, R * 2.6); ctx.lineTo(L, R * 0.8); ctx.fill();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.roundRect(-L + z * 0.08, -R + z * 0.16, L * 2, R * 2, z * 0.2); ctx.fill();
  ctx.fillStyle = '#121214';
  for (const ax of tr ? [0.66, -0.38, -0.7] : [0.6, -0.6]) for (const sy of [-1, 1]) { ctx.beginPath(); ctx.roundRect(ax * L - z * 0.19, sy * R - z * 0.1, z * 0.38, z * 0.2, z * 0.05); ctx.fill(); }
  const g = ctx.createLinearGradient(0, -R, 0, R);
  g.addColorStop(0, c[0]); g.addColorStop(0.45, c[1]); g.addColorStop(1, c[2]);
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-L, -R, L * 2, R * 2, z * (tr ? 0.12 : 0.24)); ctx.fill();
  if (tr) {
    ctx.fillStyle = '#3e3428'; ctx.fillRect(-L + z * 0.08, -R + z * 0.08, L * 1.18, R * 2 - z * 0.16);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = Math.max(1, z * 0.025);
    for (let i = 1; i < 6; i++) { const x = -L + z * 0.08 + L * 1.18 * i / 6; ctx.beginPath(); ctx.moveTo(x, -R + z * 0.08); ctx.lineTo(x, R - z * 0.08); ctx.stroke(); }
    const n = Math.min(6, Math.ceil(carSlots(v) / 10));
    for (let i = 0; i < n; i++) { const cx = -L + z * 0.2 + (i % 3) * L * 0.36, cy = (i < 3 ? -1 : 1) * R * 0.45; ctx.fillStyle = '#a07840'; ctx.fillRect(cx, cy - R * 0.36, L * 0.3, R * 0.72); ctx.strokeStyle = '#6a4e28'; ctx.strokeRect(cx, cy - R * 0.36, L * 0.3, R * 0.72); }
    ctx.fillStyle = '#1c2630'; ctx.beginPath(); ctx.roundRect(L * 0.3, -R * 0.82, L * 0.5, R * 1.64, z * 0.08); ctx.fill();
    ctx.fillStyle = c[1]; ctx.beginPath(); ctx.roundRect(L * 0.32, -R * 0.74, L * 0.3, R * 1.48, z * 0.06); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(L * 0.34, -R * 0.7, L * 0.26, R * 0.3);
    ctx.fillStyle = 'rgba(160,210,235,0.55)'; ctx.beginPath(); ctx.moveTo(L * 0.64, -R * 0.72); ctx.lineTo(L * 0.78, -R * 0.78); ctx.lineTo(L * 0.78, R * 0.78); ctx.lineTo(L * 0.64, R * 0.72); ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(L * 0.5, -R * 0.08, L * 0.42, R * 0.16);
    ctx.fillStyle = '#1c2630'; ctx.beginPath(); ctx.roundRect(-L * 0.58, -R * 0.8, L * 1.06, R * 1.6, z * 0.14); ctx.fill();
    ctx.fillStyle = c[1]; ctx.beginPath(); ctx.roundRect(-L * 0.4, -R * 0.7, L * 0.64, R * 1.4, z * 0.12); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fillRect(-L * 0.34, -R * 0.62, L * 0.52, R * 0.26);
    ctx.fillStyle = 'rgba(160,210,235,0.55)'; ctx.beginPath(); ctx.moveTo(L * 0.27, -R * 0.68); ctx.lineTo(L * 0.46, -R * 0.76); ctx.lineTo(L * 0.46, R * 0.76); ctx.lineTo(L * 0.27, R * 0.68); ctx.fill();
    ctx.fillStyle = 'rgba(160,210,235,0.4)'; ctx.fillRect(-L * 0.56, -R * 0.62, L * 0.13, R * 1.24);
  }
  ctx.fillStyle = '#fff4c0'; ctx.fillRect(L - z * 0.07, -R * 0.8, z * 0.06, R * 0.36); ctx.fillRect(L - z * 0.07, R * 0.44, z * 0.06, R * 0.36);
  ctx.fillStyle = drv && v.v < -0.2 ? '#ffffff' : '#c42020'; ctx.fillRect(-L + z * 0.01, -R * 0.78, z * 0.05, R * 0.3); ctx.fillRect(-L + z * 0.01, R * 0.48, z * 0.05, R * 0.3);
  ctx.restore();
  const V0 = V.hp;
  if (v.hp < V0 && al == null) {
    const bw = z * 1.2, by = Y - (V.hl + 0.3) * z;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(X - bw / 2, by, bw, Math.max(3, z * 0.07));
    ctx.fillStyle = v.hp / V0 > 0.5 ? '#7fe08a' : v.hp / V0 > 0.25 ? '#e0b84a' : '#e04a4a';
    ctx.fillRect(X - bw / 2, by, bw * v.hp / V0, Math.max(3, z * 0.07));
  }
}
function drawBoat(v, X, Y, z, al) {
  const V = VEH[v.type], L = V.hl * z, R = V.hw * z, c = V.c, bg = v.type === 'barge';
  ctx.save(); ctx.translate(X, Y); ctx.rotate(v.a);
  if (al != null) ctx.globalAlpha = al;
  const bob = Math.sin(performance.now() / 600 + v.id) * z * 0.02;
  ctx.translate(0, bob);
  if (V.oar) {
    const row = S.pl.car === v.id && Math.abs(v.v) > 0.3, ph = row ? Math.sin(S.t * 5) : 0;
    ctx.fillStyle = 'rgba(10,30,50,0.35)'; ctx.beginPath(); ctx.ellipse(z * 0.05, z * 0.08, L * 1.02, R * 1.15, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#c8a878'; ctx.lineWidth = Math.max(1, z * 0.045); ctx.lineCap = 'round';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(-L * 0.05, s * R * 0.7); ctx.lineTo(-L * 0.05 - ph * L * 0.45, s * R * 2.3); ctx.stroke(); ctx.fillStyle = '#b08a58'; ctx.beginPath(); ctx.ellipse(-L * 0.05 - ph * L * 0.45, s * R * 2.3, z * 0.05, z * 0.1, 0, 0, 7); ctx.fill(); }
    const sk = () => { ctx.beginPath(); ctx.moveTo(-L * 0.85, -R * 0.75); ctx.quadraticCurveTo(L * 0.3, -R * 1.15, L, 0); ctx.quadraticCurveTo(L * 0.3, R * 1.15, -L * 0.85, R * 0.75); ctx.quadraticCurveTo(-L * 1.02, 0, -L * 0.85, -R * 0.75); ctx.closePath(); };
    const g2 = ctx.createLinearGradient(0, -R, 0, R); g2.addColorStop(0, c[0]); g2.addColorStop(0.5, c[1]); g2.addColorStop(1, c[2]);
    ctx.fillStyle = g2; sk(); ctx.fill(); ctx.strokeStyle = '#3a2614'; ctx.lineWidth = Math.max(1, z * 0.03); ctx.stroke();
    ctx.save(); sk(); ctx.clip(); ctx.strokeStyle = 'rgba(40,24,10,0.35)'; ctx.lineWidth = Math.max(1, z * 0.012);
    for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.ellipse(0, 0, L * (1 - k * 0.12), R * (1 - k * 0.2), 0, 0, 7); ctx.stroke(); }
    ctx.fillStyle = '#5a3e24'; ctx.beginPath(); ctx.ellipse(0, 0, L * 0.62, R * 0.55, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#b08a58'; for (const x of [-0.5, -0.05, 0.42]) ctx.fillRect(L * x - z * 0.04, -R * 0.62, z * 0.08, R * 1.24);
    ctx.restore();
    if (carSlots(v)) { ctx.fillStyle = '#a07840'; ctx.fillRect(L * 0.1, -R * 0.3, L * 0.25, R * 0.6); }
    ctx.restore();
    return;
  }
  ctx.fillStyle = 'rgba(10,30,50,0.35)'; ctx.beginPath(); ctx.ellipse(z * 0.06, z * 0.1, L * 1.02, R * 1.1, 0, 0, 7); ctx.fill();
  if (V.net && v.net) {
    const nx = -L - z * 2.4, sw = Math.sin(performance.now() / 700 + v.id) * z * 0.15, kel = v.ck === 'kelp';
    ctx.strokeStyle = 'rgba(30,30,30,0.7)'; ctx.lineWidth = Math.max(1, z * 0.025);
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(-L * 0.88, s * R * 0.8); ctx.lineTo(nx + z * 0.9, s * R * 1.7 + sw); ctx.stroke(); }
    ctx.fillStyle = kel ? 'rgba(110,140,60,0.35)' : 'rgba(200,220,215,0.22)'; ctx.strokeStyle = kel ? 'rgba(140,170,80,0.7)' : 'rgba(225,238,235,0.6)';
    ctx.beginPath(); ctx.moveTo(nx + z * 0.85, -R * 1.6 + sw); ctx.quadraticCurveTo(nx, -R * 0.7 + sw, nx - z * 0.7, sw); ctx.quadraticCurveTo(nx, R * 0.7 + sw, nx + z * 0.85, R * 1.6 + sw); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.lineWidth = Math.max(0.5, z * 0.01);
    for (let i = 1; i < 4; i++) { const x = nx + z * 0.85 - i * z * 0.38, w = R * 1.6 * (1 - i * 0.24); ctx.beginPath(); ctx.moveTo(x, -w + sw); ctx.lineTo(x, w + sw); ctx.stroke(); }
    ctx.fillStyle = '#c84a2a'; for (const s of [-1, 1]) ctx.fillRect(nx + z * 0.8, s * R * 1.7 + sw - z * 0.05, z * 0.22, z * 0.1);
    ctx.fillStyle = '#f0c020'; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(nx + z * 0.85 - Math.abs(i) * z * 0.05, i * R * 0.7 + sw, Math.max(1, z * 0.04), 0, 7); ctx.fill(); }
  }
  const hull = () => {
    ctx.beginPath();
    if (bg) { ctx.moveTo(-L, -R); ctx.lineTo(L * 0.78, -R); ctx.quadraticCurveTo(L, -R, L, -R * 0.4); ctx.lineTo(L, R * 0.4); ctx.quadraticCurveTo(L, R, L * 0.78, R); ctx.lineTo(-L, R); ctx.closePath(); }
    else { ctx.moveTo(-L, -R * 0.82); ctx.lineTo(L * 0.25, -R); ctx.quadraticCurveTo(L * 0.85, -R * 0.8, L, 0); ctx.quadraticCurveTo(L * 0.85, R * 0.8, L * 0.25, R); ctx.lineTo(-L, R * 0.82); ctx.closePath(); }
  };
  const fo = Math.min(1, v.foul || 0);
  ctx.fillStyle = fo > 0.3 ? `rgba(70,110,60,${0.25 + 0.4 * fo})` : 'rgba(140,40,30,0.55)';
  ctx.save(); ctx.scale(1.04, 1.12); hull(); ctx.fill(); ctx.restore();
  const g = ctx.createLinearGradient(0, -R, 0, R);
  g.addColorStop(0, c[0]); g.addColorStop(0.5, c[1]); g.addColorStop(1, c[2]);
  ctx.fillStyle = g; hull(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = Math.max(1, z * 0.03); ctx.stroke();
  if (bg) {
    ctx.fillStyle = '#2a2c30'; ctx.fillRect(-L * 0.5, -R * 0.74, L * 1.25, R * 1.48);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = Math.max(1, z * 0.02);
    for (let i = 1; i < 5; i++) { const x = -L * 0.5 + L * 1.25 * i / 5; ctx.beginPath(); ctx.moveTo(x, -R * 0.74); ctx.lineTo(x, R * 0.74); ctx.stroke(); }
    const used = carSlots(v), n = Math.min(10, Math.ceil(used / (V.slots / 10)));
    let top = null; for (const k in v.tr) if (!top || v.tr[k] > v.tr[top]) top = k;
    const cc = (top && ITEMS[top] && ITEMS[top].c) || '#a07840';
    for (let i = 0; i < n; i++) { const cx = -L * 0.46 + (i % 5) * L * 0.245, cy = (i < 5 ? -1 : 1) * R * 0.36; ctx.fillStyle = cc; ctx.fillRect(cx, cy - R * 0.3, L * 0.22, R * 0.6); ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.strokeRect(cx, cy - R * 0.3, L * 0.22, R * 0.6); }
    ctx.fillStyle = '#e8e4d8'; ctx.beginPath(); ctx.roundRect(-L * 0.92, -R * 0.62, L * 0.36, R * 1.24, z * 0.05); ctx.fill();
    ctx.fillStyle = '#1c2630'; ctx.fillRect(-L * 0.62, -R * 0.5, L * 0.05, R);
    ctx.fillStyle = '#2a2a2c'; ctx.beginPath(); ctx.arc(-L * 0.8, 0, R * 0.16, 0, 7); ctx.fill();
  } else if (V.net) {
    ctx.fillStyle = '#c84030'; ctx.beginPath(); ctx.moveTo(L * 0.55, -R * 0.7); ctx.quadraticCurveTo(L * 0.92, -R * 0.4, L * 0.96, 0); ctx.quadraticCurveTo(L * 0.92, R * 0.4, L * 0.55, R * 0.7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#6a6e6a'; ctx.fillRect(-L * 0.92, -R * 0.66, L * 0.95, R * 1.32);
    ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = Math.max(1, z * 0.012);
    for (let i = 1; i < 5; i++) { const x = -L * 0.92 + L * 0.95 * i / 5; ctx.beginPath(); ctx.moveTo(x, -R * 0.66); ctx.lineTo(x, R * 0.66); ctx.stroke(); }
    ctx.fillStyle = carSlots(v) ? (v.tr.kelp > (v.tr.fish || 0) ? '#5a6a2a' : '#a8c0cc') : '#3a3c3a'; ctx.fillRect(-L * 0.42, -R * 0.32, L * 0.32, R * 0.64);
    ctx.fillStyle = v.net ? '#2a3a32' : '#4a9a78'; ctx.beginPath(); ctx.ellipse(-L * 0.68, 0, L * 0.1, R * 0.55, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.stroke();
    ctx.fillStyle = '#f0ece0'; ctx.beginPath(); ctx.roundRect(L * 0.05, -R * 0.6, L * 0.44, R * 1.2, z * 0.05); ctx.fill();
    ctx.fillStyle = 'rgba(150,200,230,0.75)'; ctx.fillRect(L * 0.4, -R * 0.5, L * 0.06, R);
    ctx.fillStyle = '#c84030'; ctx.fillRect(L * 0.1, -R * 0.6, L * 0.08, R * 1.2);
    ctx.fillStyle = '#d8d4c8'; ctx.beginPath(); ctx.arc(L * 0.24, 0, R * 0.14, 0, 7); ctx.fill();
    ctx.strokeStyle = '#e0a020'; ctx.lineWidth = Math.max(1.5, z * 0.07); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-L * 0.9, -R * 0.95); ctx.lineTo(-L * 0.9, R * 0.95); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-L * 0.9, -R * 0.95); ctx.lineTo(-L * 0.7, -R * 0.75); ctx.moveTo(-L * 0.9, R * 0.95); ctx.lineTo(-L * 0.7, R * 0.75); ctx.stroke();
    if (!v.net) { ctx.fillStyle = '#c84a2a'; for (const s of [-1, 1]) ctx.fillRect(-L * 0.86, s * R * 0.98 - z * 0.04, L * 0.28, z * 0.08); }
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.moveTo(L * 0.3, -R * 0.55); ctx.quadraticCurveTo(L * 0.8, -R * 0.4, L * 0.88, 0); ctx.quadraticCurveTo(L * 0.8, R * 0.4, L * 0.3, R * 0.55); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8a6a48'; ctx.fillRect(-L * 0.78, -R * 0.62, L * 0.72, R * 1.24);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = Math.max(1, z * 0.015);
    for (let i = 1; i < 4; i++) { const y = -R * 0.62 + R * 1.24 * i / 4; ctx.beginPath(); ctx.moveTo(-L * 0.78, y); ctx.lineTo(-L * 0.06, y); ctx.stroke(); }
    if (carSlots(v)) { ctx.fillStyle = '#a07840'; ctx.fillRect(-L * 0.7, -R * 0.4, L * 0.3, R * 0.8); }
    ctx.fillStyle = '#1c2630'; ctx.beginPath(); ctx.roundRect(-L * 0.05, -R * 0.62, L * 0.36, R * 1.24, z * 0.06); ctx.fill();
    ctx.fillStyle = 'rgba(160,210,235,0.6)'; ctx.fillRect(L * 0.2, -R * 0.52, L * 0.08, R * 1.04);
    ctx.fillStyle = '#2a2a2c'; ctx.fillRect(-L - z * 0.12, -R * 0.2, z * 0.18, R * 0.4);
  }
  ctx.fillStyle = '#e02020'; ctx.beginPath(); ctx.arc(L * (bg ? 0.9 : 0.55), -R * 0.86, Math.max(1.2, z * 0.04), 0, 7); ctx.fill();
  ctx.fillStyle = '#20d040'; ctx.beginPath(); ctx.arc(L * (bg ? 0.9 : 0.55), R * 0.86, Math.max(1.2, z * 0.04), 0, 7); ctx.fill();
  ctx.restore();
  if (v.hp < V.hp && al == null) {
    const bw = z * 1.2, by = Y - (V.hl + 0.3) * z;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(X - bw / 2, by, bw, Math.max(3, z * 0.07));
    ctx.fillStyle = v.hp / V.hp > 0.5 ? '#7fe08a' : v.hp / V.hp > 0.25 ? '#e0b84a' : '#e04a4a';
    ctx.fillRect(X - bw / 2, by, bw * v.hp / V.hp, Math.max(3, z * 0.07));
  }
}
function drawShoals(ox, oy, z, x0, y0, x1, y1) {
  const sl = seaLv(), tm = performance.now() / 1000;
  for (let cy = Math.floor(y0 / FCH); cy <= Math.floor(y1 / FCH); cy++) for (let cx = Math.floor(x0 / FCH); cx <= Math.floor(x1 / FCH); cx++) {
    const k = cy * 8192 + cx, rich = 0.5 + hash(cx, cy, (S.seed | 0) + 911), fs = fstock('f' + k), ks = fstock('k' + k);
    const nf = Math.round(3 * rich * fs), nk = Math.round(18 * ks);
    for (let i = 0; i < nk; i++) {
      const x = Math.floor(cx * FCH + hash(cx * 31 + i, cy, 77) * FCH), y = Math.floor(cy * FCH + hash(cx, cy * 31 + i, 78) * FCH), d = wdep(x, y, sl);
      if (!(d > 0.004 && d < 0.05)) continue;
      const X = ox + (x + 0.5) * z, Y = oy + (y + 0.5) * z;
      ctx.fillStyle = `rgba(30,60,25,${0.12 + 0.18 * ks})`; ctx.beginPath(); ctx.ellipse(X, Y, z * 0.55, z * 0.45, hash(x, y, 3) * 3, 0, 7); ctx.fill();
      ctx.lineCap = 'round';
      for (let j = 0; j < 5; j++) { const a = j * 1.26 + hash(x, y, j) * 0.9, sw = Math.sin(tm * 0.8 + x + j) * 0.18, L = z * (0.45 + 0.25 * hash(y, x, j)), mx = X + Math.cos(a + sw) * L * 0.55, my = Y + Math.sin(a + sw) * L * 0.55, ex = X + Math.cos(a) * L, ey = Y + Math.sin(a) * L; ctx.strokeStyle = `rgba(95,120,40,${0.45 + 0.4 * ks})`; ctx.lineWidth = Math.max(1, z * 0.07); ctx.beginPath(); ctx.moveTo(X, Y); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke(); ctx.fillStyle = `rgba(150,140,50,${0.4 + 0.4 * ks})`; ctx.beginPath(); ctx.ellipse(ex, ey, z * 0.11, z * 0.05, a, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(mx, my, Math.max(1, z * 0.04), 0, 7); ctx.fill(); }
    }
    for (let i = 0; i < nf; i++) {
      const bx = cx * FCH + (hash(cx * 17 + i, cy, 91) * 0.7 + 0.15) * FCH, by = cy * FCH + (hash(cx, cy * 17 + i, 92) * 0.7 + 0.15) * FCH;
      const x = bx + Math.cos(tm * 0.15 + i * 2 + cx) * 2.5, y = by + Math.sin(tm * 0.11 + i * 3 + cy) * 2;
      if (wdep(Math.floor(x), Math.floor(y), sl) < 0.07) continue;
      const X = ox + x * z, Y = oy + y * z, hd = Math.atan2(Math.cos(tm * 0.11 + i * 3 + cy) * 0.22, -Math.sin(tm * 0.15 + i * 2 + cx) * 0.375);
      ctx.fillStyle = 'rgba(20,40,60,0.28)';
      for (let j = 0; j < 9; j++) { const fx = X + (hash(i, j, 5) - 0.5) * z * 1.6, fy = Y + (hash(j, i, 6) - 0.5) * z * 1.1; ctx.beginPath(); ctx.ellipse(fx, fy, z * 0.12, z * 0.04, hd, 0, 7); ctx.fill(); }
      ctx.fillStyle = 'rgba(230,245,255,0.22)'; ctx.beginPath(); ctx.ellipse(X, Y, z * 0.5, z * 0.32, hd, 0, 7); ctx.fill();
    }
  }
}
function drawWakes(ox, oy, z) {
  for (const p of wakes) {
    const a = S.t - p.t;
    if (a > 2.5 || a < 0) continue;
    ctx.strokeStyle = `rgba(230,245,255,${0.4 * (1 - a / 2.5)})`; ctx.lineWidth = Math.max(1, z * 0.05);
    ctx.beginPath(); ctx.arc(ox + p.x * z, oy + p.y * z, z * (0.15 + a * 0.35), 0, 7); ctx.stroke();
  }
}
function drawBoatRoute(v, ox, oy, z) {
  const R = v.route;
  if (!R || !R.length) return;
  ctx.strokeStyle = 'rgba(120,220,255,0.75)'; ctx.lineWidth = Math.max(1.5, z * 0.06); ctx.setLineDash([z * 0.25, z * 0.2]);
  ctx.beginPath(); ctx.moveTo(ox + v.x * z, oy + v.y * z);
  for (let i = v.rp || 0; i < R.length; i++) ctx.lineTo(ox + R[i][0] * z, oy + R[i][1] * z);
  ctx.stroke(); ctx.setLineDash([]);
  const q = R[R.length - 1];
  ctx.fillStyle = 'rgba(120,220,255,0.9)'; ctx.beginPath(); ctx.arc(ox + q[0] * z, oy + q[1] * z, Math.max(2, z * 0.12), 0, 7); ctx.fill();
}
function drawLabel(e, cx, y, z) {
  if (z <= 18) return;
  ctx.font = `bold ${Math.round(Math.min(14, z * 0.26))}px system-ui, sans-serif`; ctx.textAlign = 'center';
  const tw = ctx.measureText(e.nm || '').width;
  ctx.fillStyle = 'rgba(14,16,20,0.75)'; ctx.fillRect(cx - tw / 2 - 4, y - z * 0.3, tw + 8, Math.min(18, z * 0.34));
  ctx.fillStyle = '#9ce0ff'; ctx.fillText(e.nm || '', cx, y - z * 0.3 + Math.min(14, z * 0.26)); ctx.textAlign = 'left';
}
function drawDock(e, x, y, z) {
  const wd = [0, 1, 2, 3].find(d => { const X = e.x + DX[d], Y = e.y + DY[d]; return X >= 0 && Y >= 0 && X < W && Y < H && terrain[Y * W + X] === 1; }) ?? 1;
  const cx = x + z / 2, cy = y + z / 2;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.atan2(DY[wd], DX[wd]));
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-z * 0.42, -z * 0.36, z * 1.3, z * 0.8);
  ctx.fillStyle = '#5a4430'; for (const py of [-0.34, 0.34]) for (const px of [0.3, 0.8]) { ctx.beginPath(); ctx.arc(px * z, py * z, z * 0.06, 0, 7); ctx.fill(); }
  for (let i = 0; i < 7; i++) { ctx.fillStyle = i % 2 ? '#9a7a54' : '#8a6a46'; ctx.fillRect(-z * 0.46 + i * z * 0.19, -z * 0.4, z * 0.17, z * 0.8); }
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = Math.max(1, z * 0.02); ctx.strokeRect(-z * 0.46, -z * 0.4, z * 1.33, z * 0.8);
  ctx.fillStyle = '#2a2c30'; for (const py of [-0.3, 0.3]) { ctx.beginPath(); ctx.arc(z * 0.72, py * z, z * 0.07, 0, 7); ctx.fill(); }
  ctx.fillStyle = '#e8c040'; ctx.fillRect(z * 0.83, -z * 0.4, z * 0.04, z * 0.8);
  ctx.restore();
  ctx.fillStyle = e.mode === 'unload' ? '#2a5aa0' : '#2a8a4a'; ctx.beginPath(); ctx.roundRect(x + z * 0.18, y + z * 0.3, z * 0.64, z * 0.26, z * 0.05); ctx.fill();
  if (z > 12) { ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.round(z * 0.17)}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.fillText(e.mode === 'unload' ? 'UNLOAD' : 'LOAD', cx, y + z * 0.49); ctx.textAlign = 'left'; }
  drawLabel(e, cx, y, z);
}
function drawBuoy(e, x, y, z) {
  const cx = x + z / 2, cy = y + z / 2, t = performance.now() / 1000, bob = Math.sin(t * 1.7 + e.id) * z * 0.03;
  ctx.strokeStyle = 'rgba(230,245,255,0.35)'; ctx.lineWidth = Math.max(1, z * 0.03);
  ctx.beginPath(); ctx.arc(cx, cy, z * (0.3 + 0.08 * Math.sin(t * 2 + e.id)), 0, 7); ctx.stroke();
  ctx.fillStyle = 'rgba(0,20,40,0.35)'; ctx.beginPath(); ctx.ellipse(cx + z * 0.05, cy + z * 0.08, z * 0.2, z * 0.12, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#d83020'; ctx.beginPath(); ctx.arc(cx, cy + bob, z * 0.2, 0, 7); ctx.fill();
  ctx.fillStyle = '#f0f0e8'; ctx.fillRect(cx - z * 0.2, cy + bob - z * 0.04, z * 0.4, z * 0.08);
  ctx.fillStyle = '#2a2a2c'; ctx.fillRect(cx - z * 0.03, cy + bob - z * 0.34, z * 0.06, z * 0.2);
  const on = (t + e.id * 0.37) % 2 < 0.35;
  ctx.fillStyle = on ? '#fff060' : '#6a6030'; ctx.beginPath(); ctx.arc(cx, cy + bob - z * 0.36, z * 0.07, 0, 7); ctx.fill();
  if (on) { ctx.fillStyle = 'rgba(255,240,96,0.25)'; ctx.beginPath(); ctx.arc(cx, cy + bob - z * 0.36, z * 0.3, 0, 7); ctx.fill(); }
  drawLabel(e, cx, y, z);
}
function drawPuffs(ox, oy, z) {
  for (const p of puffs) {
    const a = S.t - p.t;
    if (a > 1.2 || a < 0) continue;
    ctx.fillStyle = `rgba(90,90,96,${0.35 * (1 - a / 1.2)})`;
    ctx.beginPath(); ctx.arc(ox + (p.x + a * 0.3) * z, oy + (p.y - a * 0.5) * z, z * (0.12 + a * 0.3), 0, 7); ctx.fill();
  }
}
function drawBugs(ox, oy, z, x0, y0, x1, y1) {
  const now = performance.now() / 1000;
  for (const b of S.bugs) {
    if (b.x < x0 - 1 || b.y < y0 - 1 || b.x > x1 + 1 || b.y > y1 + 1) continue;
    const bk = b.k || 0, s = z * (0.22 + 0.08 * Math.min(1, b.mhp / (90 * BUGK[bk].hp))) * (bk === 4 ? 2.3 : bk === 2 ? 1.6 : bk === 3 ? 1.15 : 1), X = ox + b.x * z, Y = oy + b.y * z;
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
    ctx.fillStyle = ['#4a3038', '#3e4a2a', '#2e2224', '#3a4048', '#22222a'][bk];
    ctx.beginPath(); ctx.ellipse(-s * 0.35, 0, s * 0.6, s * 0.45, 0, 0, 7); ctx.fill();
    if (bk === 1) { ctx.fillStyle = `rgba(160,220,70,${0.6 + 0.3 * Math.sin(now * 3 + b.ph)})`; ctx.beginPath(); ctx.ellipse(-s * 0.45, 0, s * 0.36, s * 0.28, 0, 0, 7); ctx.fill(); }
    ctx.fillStyle = ['#5e3c46', '#52603a', '#4a3436', '#58626e', '#3a3a46'][bk];
    ctx.beginPath(); ctx.ellipse(s * 0.3, 0, s * 0.42, s * 0.36, 0, 0, 7); ctx.fill();
    if (bk >= 2) { ctx.fillStyle = ['#6a4a40', '#8a96a4', '#5a5a68'][bk - 2]; for (const q of [-0.1, 0.25]) { ctx.beginPath(); ctx.ellipse(s * q, 0, s * 0.12, s * 0.42, 0, 0, 7); ctx.fill(); } }
    ctx.strokeStyle = ['#d8c84a', '#b8e050', '#c05030', '#a8c0d8', '#e04020'][bk]; ctx.lineWidth = Math.max(1, s * 0.1);
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
  for (const p of spits) {
    if (p.x < x0 - 1 || p.y < y0 - 1 || p.x > x1 + 1 || p.y > y1 + 1) continue;
    const X = ox + p.x * z, Y = oy + p.y * z;
    ctx.fillStyle = 'rgba(150,210,60,0.35)'; ctx.beginPath(); ctx.arc(X, Y, z * 0.2, 0, 7); ctx.fill();
    ctx.fillStyle = '#b8f060'; ctx.beginPath(); ctx.arc(X, Y, z * 0.1, 0, 7); ctx.fill();
  }
}
function drawHive(e, x, y, w0, h0, z) {
  const T = e.tier || 2, sc = [0, 0.72, 1, 1.25][T], w = w0 * sc, h = h0 * sc;
  const now = performance.now() / 1000, pu = 1 + 0.04 * Math.sin(now * 2 + e.id), cx = x + w0 / 2, cy = y + h0 / 2;
  ctx.fillStyle = 'rgba(40,20,30,0.45)';
  ctx.beginPath(); ctx.ellipse(cx, cy + h * 0.08, w * 0.62, h * 0.5, 0, 0, 7); ctx.fill();
  if (T === 3) {
    ctx.fillStyle = 'rgba(90,60,40,0.35)';
    ctx.beginPath(); ctx.ellipse(cx, cy, w * 0.8, h * 0.7, 0, 0, 7); ctx.fill();
  }
  const g = ctx.createRadialGradient(cx - w * 0.12, cy - h * 0.15, w * 0.05, cx, cy, w * 0.55 * pu);
  g.addColorStop(0, '#9a6a7a'); g.addColorStop(0.6, '#6a4252'); g.addColorStop(1, '#3a2230');
  ctx.fillStyle = g;
  ctx.beginPath();
  for (let k = 0; k <= 16; k++) {
    const a = k / 16 * Math.PI * 2, r = w * 0.5 * pu * (0.85 + 0.15 * hash(k, e.id, 5));
    k ? ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.9) : ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.9);
  }
  ctx.fill();
  if (T === 3) for (let k = 0; k < 6; k++) {
    const a = k / 6 * Math.PI * 2 + hash(e.id, k, 2), r = w * 0.42, bx = cx + Math.cos(a) * r, by = cy + Math.sin(a) * r * 0.9;
    ctx.fillStyle = '#4a2a38';
    ctx.beginPath(); ctx.moveTo(bx - w * 0.07, by + h * 0.04); ctx.lineTo(bx + w * 0.07, by + h * 0.04); ctx.lineTo(bx + Math.cos(a) * w * 0.05, by - h * 0.2); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = '#1a0c12';
  for (let k = 0; k < [0, 3, 5, 8][T]; k++) {
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

function drawRail(e, ox, oy, z) {
  const X = ox + e.x * z, Y = oy + e.y * z, cx = X + z / 2, cy = Y + z / 2;
  const cn = [0, 1, 2, 3].filter(d => isRail(e.x + DX[d], e.y + DY[d]));
  const pr = [];
  if (cn.length >= 2) { for (let i = 0; i < cn.length; i++) for (let j = i + 1; j < cn.length; j++) pr.push([cn[i], cn[j]]); }
  else { const d = cn.length ? cn[0] : (e.dir || 0); pr.push([d, (d + 2) % 4]); }
  const path = (a, b, off) => {
    ctx.beginPath();
    if (b === (a + 2) % 4) {
      const nx = -DY[a] * off * z, ny = DX[a] * off * z;
      ctx.moveTo(cx + DX[a] * z / 2 + nx, cy + DY[a] * z / 2 + ny); ctx.lineTo(cx + DX[b] * z / 2 + nx, cy + DY[b] * z / 2 + ny);
    } else {
      const ax = cx + (DX[a] + DX[b]) * z / 2, ay = cy + (DY[a] + DY[b]) * z / 2;
      const a1 = Math.atan2(-DY[b], -DX[b]), a2 = Math.atan2(-DY[a], -DX[a]);
      let da = a2 - a1; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
      ctx.arc(ax, ay, (0.5 + off) * z, a1, a1 + da, da < 0);
    }
  };
  ctx.lineCap = 'butt';
  ctx.strokeStyle = '#6e665c'; ctx.lineWidth = z * 0.8;
  for (const [a, b] of pr) { path(a, b, 0); ctx.stroke(); }
  if (z < 6) { ctx.strokeStyle = '#a8a8ac'; ctx.lineWidth = Math.max(1, z * 0.2); for (const [a, b] of pr) { path(a, b, 0); ctx.stroke(); } return; }
  const hsh = ((e.x * 73856093) ^ (e.y * 19349663)) >>> 0;
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (let i = 0; i < 5; i++) { const r = (hsh >> (i * 5)) & 31; ctx.fillRect(X + (0.15 + (r & 7) / 10) * z, Y + (0.15 + (r >> 3) / 6) * z, z * 0.06, z * 0.06); }
  ctx.fillStyle = '#9a968c';
  for (const [a, b] of pr) {
    if (b === (a + 2) % 4) {
      for (const f of [0.125, 0.375, 0.625, 0.875]) {
        const px = cx + DX[a] * z / 2 + (DX[b] - DX[a]) * z * f, py = cy + DY[a] * z / 2 + (DY[b] - DY[a]) * z * f;
        ctx.save(); ctx.translate(px, py); ctx.rotate(Math.atan2(DY[a], DX[a])); ctx.fillRect(-z * 0.05, -z * 0.31, z * 0.1, z * 0.62); ctx.restore();
      }
    } else {
      const ax = cx + (DX[a] + DX[b]) * z / 2, ay = cy + (DY[a] + DY[b]) * z / 2, a1 = Math.atan2(-DY[b], -DX[b]);
      let da = Math.atan2(-DY[a], -DX[a]) - a1; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
      for (const f of [1 / 6, 0.5, 5 / 6]) {
        const an = a1 + da * f;
        ctx.save(); ctx.translate(ax + Math.cos(an) * z / 2, ay + Math.sin(an) * z / 2); ctx.rotate(an); ctx.fillRect(-z * 0.31, -z * 0.05, z * 0.62, z * 0.1); ctx.restore();
      }
    }
  }
  for (const [w, c] of [[0.11, '#3a3634'], [0.06, '#b8b8bc']]) {
    ctx.strokeStyle = c; ctx.lineWidth = Math.max(1, z * w);
    for (const [a, b] of pr) for (const off of [-0.2, 0.2]) { path(a, b, off); ctx.stroke(); }
  }
}
function drawStop(e, x, y, z) {
  const cx = x + z / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(cx + z * 0.08, y + z * 0.86, z * 0.22, z * 0.08, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#4a4e54'; ctx.fillRect(cx - z * 0.04, y + z * 0.3, z * 0.08, z * 0.58);
  ctx.fillStyle = '#2a2e34'; ctx.fillRect(cx - z * 0.12, y + z * 0.82, z * 0.24, z * 0.08);
  ctx.fillStyle = e.mode === 'unload' ? '#2a5aa0' : '#2a8a4a'; ctx.beginPath(); ctx.roundRect(x + z * 0.12, y + z * 0.08, z * 0.76, z * 0.32, z * 0.05); ctx.fill();
  ctx.strokeStyle = '#e8e4d8'; ctx.lineWidth = Math.max(1, z * 0.025); ctx.stroke();
  if (z > 12) { ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.round(z * 0.2)}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.fillText(e.mode === 'unload' ? 'UNLOAD' : 'LOAD', cx, y + z * 0.31); ctx.textAlign = 'left'; }
  if (z > 18) {
    ctx.font = `bold ${Math.round(Math.min(14, z * 0.26))}px system-ui, sans-serif`; ctx.textAlign = 'center';
    const tw = ctx.measureText(e.nm || '').width;
    ctx.fillStyle = 'rgba(14,16,20,0.75)'; ctx.fillRect(cx - tw / 2 - 4, y - z * 0.3, tw + 8, Math.min(18, z * 0.34));
    ctx.fillStyle = '#ffe080'; ctx.fillText(e.nm || '', cx, y - z * 0.3 + Math.min(14, z * 0.26)); ctx.textAlign = 'left';
  }
}
function drawTrain(t, ox, oy, z, al) {
  if (!t.g) trainGeo(t);
  const L = 0.92 * z, R = 0.42 * z;
  ctx.save();
  if (al != null) ctx.globalAlpha = al;
  for (let i = 0; i + 1 < t.g.length; i++) {
    const a = t.g[i], b = t.g[i + 1];
    ctx.strokeStyle = '#1a1a1c'; ctx.lineWidth = Math.max(2, z * 0.12);
    ctx.beginPath(); ctx.moveTo(ox + (a.x - Math.cos(a.a) * 0.9) * z, oy + (a.y - Math.sin(a.a) * 0.9) * z); ctx.lineTo(ox + (b.x + Math.cos(b.a) * 0.9) * z, oy + (b.y + Math.sin(b.a) * 0.9) * z); ctx.stroke();
  }
  t.cars.forEach((c, i) => {
    const g = t.g[i];
    ctx.save(); ctx.translate(ox + g.x * z, oy + g.y * z); ctx.rotate(g.a);
    if (i === 0 && t.v > 1) {
      const gr = ctx.createLinearGradient(L, 0, L + z * 5, 0);
      gr.addColorStop(0, 'rgba(255,244,200,0.2)'); gr.addColorStop(1, 'rgba(255,244,200,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(L, -R * 0.6); ctx.lineTo(L + z * 5, -R * 3); ctx.lineTo(L + z * 5, R * 3); ctx.lineTo(L, R * 0.6); ctx.fill();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.roundRect(-L + z * 0.08, -R + z * 0.14, L * 2, R * 2, z * 0.08); ctx.fill();
    ctx.fillStyle = '#18181a';
    for (const bx of [-0.58, 0.58]) ctx.fillRect(bx * L - z * 0.22, -R - z * 0.04, z * 0.44, R * 2 + z * 0.08);
    if (isLoco(c)) {
      const gr = ctx.createLinearGradient(0, -R, 0, R), el = c.type === 'eloco';
      gr.addColorStop(0, el ? '#6aa8e0' : '#f0c840'); gr.addColorStop(0.45, el ? '#3a7ab8' : '#e0b020'); gr.addColorStop(1, el ? '#1a3a5a' : '#8a6a10');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.roundRect(-L, -R, L * 2, R * 2, z * 0.1); ctx.fill();
      ctx.fillStyle = el ? '#e8ecf0' : '#b02a1e'; ctx.fillRect(-L, -R, L * 2, R * 0.16); ctx.fillRect(-L, R * 0.84, L * 2, R * 0.16);
      ctx.fillStyle = '#5a5e64'; ctx.fillRect(-L * 0.56, -R * 0.62, L * 1.12, R * 1.24);
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = Math.max(1, z * 0.02);
      for (let k = 1; k < 7; k++) { const x = -L * 0.56 + L * 1.12 * k / 7; ctx.beginPath(); ctx.moveTo(x, -R * 0.62); ctx.lineTo(x, R * 0.62); ctx.stroke(); }
      ctx.fillStyle = '#2a2c30'; for (const fx2 of [-0.3, 0.12]) { ctx.beginPath(); ctx.arc(fx2 * L, 0, R * 0.34, 0, 7); ctx.fill(); }
      for (const sd of [-1, 1]) {
        ctx.fillStyle = '#1c2630'; ctx.beginPath(); ctx.roundRect(sd > 0 ? L * 0.6 : -L * 0.94, -R * 0.78, L * 0.34, R * 1.56, z * 0.04); ctx.fill();
        ctx.fillStyle = 'rgba(160,210,235,0.55)'; ctx.fillRect(sd > 0 ? L * 0.84 : -L * 0.92, -R * 0.66, L * 0.07, R * 1.32);
        ctx.fillStyle = sd > 0 ? '#fff4c0' : '#c42020'; ctx.fillRect(sd > 0 ? L - z * 0.05 : -L + z * 0.01, -R * 0.12, z * 0.04, R * 0.24);
      }
    } else {
      ctx.fillStyle = '#6a4a34'; ctx.beginPath(); ctx.roundRect(-L, -R, L * 2, R * 2, z * 0.05); ctx.fill();
      ctx.fillStyle = '#3a2a1e'; ctx.fillRect(-L * 0.92, -R * 0.78, L * 1.84, R * 1.56);
      const used = carSlots(c), f = Math.min(1, used / TRAIN.wagon.slots);
      if (used) {
        let top = null; for (const k in c.tr) if (!top || c.tr[k] > c.tr[top]) top = k;
        const col = (ITEMS[top] && ITEMS[top].c) || '#a08060';
        ctx.fillStyle = col; ctx.globalAlpha = (al ?? 1) * (0.55 + 0.45 * f);
        ctx.beginPath(); ctx.ellipse(0, 0, L * 0.9 * Math.sqrt(0.3 + 0.7 * f), R * 0.76, 0, 0, 7); ctx.fill();
        ctx.globalAlpha = al ?? 1;
        ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.ellipse(-L * 0.15, -R * 0.2, L * 0.4 * Math.sqrt(0.3 + 0.7 * f), R * 0.25, 0, 0, 7); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = Math.max(1, z * 0.02);
      for (const k of [-0.33, 0.33]) { ctx.beginPath(); ctx.moveTo(k * L, -R); ctx.lineTo(k * L, -R * 0.78); ctx.moveTo(k * L, R); ctx.lineTo(k * L, R * 0.78); ctx.stroke(); }
    }
    ctx.restore();
  });
  ctx.restore();
}
function drawRig(e, x, y, w, h, z) {
  const m = w * 0.08, on = e.cy && e.st !== 'idle' && e.st !== 'output', t = performance.now() / 1000, lw = Math.max(1, z * 0.05);
  ctx.fillStyle = 'rgba(8,20,32,0.35)'; ctx.fillRect(x + m + z * 0.25, y + m + z * 0.3, w - 2 * m, h - 2 * m);
  ctx.fillStyle = '#d8c070';
  for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { ctx.beginPath(); ctx.arc(x + m + a * (w - 2 * m), y + m + b * (h - 2 * m), z * 0.2, 0, 7); ctx.fill(); }
  ctx.fillStyle = '#34383e'; ctx.fillRect(x + m, y + m, w - 2 * m, h - 2 * m);
  ctx.fillStyle = '#6a7078'; ctx.fillRect(x + m + lw, y + m + lw, w - 2 * m - 2 * lw, h - 2 * m - 2 * lw);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
  for (let k = 1; k < 6; k++) { const gx = x + m + (w - 2 * m) * k / 6; ctx.beginPath(); ctx.moveTo(gx, y + m); ctx.lineTo(gx, y + h - m); ctx.stroke(); }
  ctx.fillStyle = '#e8e4da'; ctx.fillRect(x + w * 0.1, y + h * 0.5, w * 0.34, h * 0.4);
  ctx.fillStyle = '#e07a2a'; ctx.fillRect(x + w * 0.1, y + h * 0.5, w * 0.34, h * 0.06);
  if (z >= 10) { ctx.fillStyle = '#3a5a7a'; for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) ctx.fillRect(x + w * (0.13 + c * 0.075), y + h * (0.6 + r * 0.09), w * 0.04, h * 0.04); }
  const hx = x + w * 0.27, hy = y + h * 0.73, hr = w * 0.15;
  ctx.fillStyle = '#2c4a34'; ctx.beginPath(); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + Math.PI / 8; ctx[k ? 'lineTo' : 'moveTo'](hx + Math.cos(a) * hr, hy + Math.sin(a) * hr); } ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#e8d84a'; ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(hx, hy, hr * 0.62, 0, 7); ctx.stroke();
  if (z >= 8) { ctx.fillStyle = '#f4f4f0'; ctx.font = `bold ${Math.floor(hr * 0.9)}px system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('H', hx, hy + 1); }
  for (let k = 0; k < 2; k++) {
    const sy = y + h * (0.16 + k * 0.17), sx = x + w * 0.56;
    ctx.fillStyle = '#c89a3a'; ctx.fillRect(sx, sy, w * 0.3, h * 0.11);
    ctx.fillStyle = '#e8c060'; ctx.fillRect(sx, sy, w * 0.3, h * 0.03);
    ctx.fillStyle = '#7a5a2a'; ctx.beginPath(); ctx.arc(sx, sy + h * 0.055, h * 0.055, 0, 7); ctx.arc(sx + w * 0.3, sy + h * 0.055, h * 0.055, 0, 7); ctx.fill();
  }
  const dx = x + w * 0.62, dy = y + h * 0.66, ds = w * 0.13;
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(dx - ds + z * 0.15, dy - ds + z * 0.2, ds * 2, ds * 2);
  ctx.strokeStyle = '#c83a2a'; ctx.lineWidth = lw * 1.2;
  ctx.strokeRect(dx - ds, dy - ds, ds * 2, ds * 2);
  ctx.beginPath(); ctx.moveTo(dx - ds, dy - ds); ctx.lineTo(dx + ds, dy + ds); ctx.moveTo(dx + ds, dy - ds); ctx.lineTo(dx - ds, dy + ds); ctx.stroke();
  ctx.strokeRect(dx - ds * 0.4, dy - ds * 0.4, ds * 0.8, ds * 0.8);
  const ca = 0.6 + Math.sin(t * 0.3 + e.id) * 0.5, cx0 = x + w * 0.88, cy0 = y + h * 0.84;
  ctx.strokeStyle = '#e8c838'; ctx.lineWidth = lw * 1.5; ctx.beginPath(); ctx.moveTo(cx0, cy0); ctx.lineTo(cx0 - Math.cos(ca) * w * 0.3, cy0 - Math.sin(ca) * w * 0.3); ctx.stroke();
  ctx.fillStyle = '#e8c838'; ctx.beginPath(); ctx.arc(cx0, cy0, z * 0.12, 0, 7); ctx.fill();
  const fx0 = x + w - m, fy0 = y + m, fx = x + w + w * 0.2, fy = y - h * 0.2;
  ctx.strokeStyle = '#9aa0a8'; ctx.lineWidth = lw * 1.3; ctx.beginPath(); ctx.moveTo(fx0, fy0); ctx.lineTo(fx, fy); ctx.stroke();
  if (z >= 10) { ctx.lineWidth = 1; ctx.beginPath(); for (let k = 1; k < 6; k++) { const a = k / 6, px = fx0 + (fx - fx0) * a, py = fy0 + (fy - fy0) * a; ctx.moveTo(px - z * 0.08, py - z * 0.08); ctx.lineTo(px + z * 0.08, py + z * 0.08); } ctx.stroke(); }
  if (on) {
    const fl = z * (0.42 + 0.12 * Math.sin(t * 13 + e.id) + 0.08 * Math.sin(t * 29));
    const gr = ctx.createRadialGradient(fx, fy, 0, fx, fy, fl * 1.6);
    gr.addColorStop(0, 'rgba(255,250,200,0.95)'); gr.addColorStop(0.35, 'rgba(255,170,40,0.85)'); gr.addColorStop(0.7, 'rgba(230,80,20,0.4)'); gr.addColorStop(1, 'rgba(200,60,20,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(fx + fl * 0.3, fy - fl * 0.35, fl * 1.6, fl * 1.1, -0.8, 0, 7); ctx.fill();
  }
}
function drawOWT(e, x, y, w, h, z) {
  const cx = x + w / 2, cy = y + h / 2, R = Math.min(w, h) * 0.48, a0 = S.t * 0.2 * windCurve(1.25) + e.id, ya = S.wind.a || 0;
  ctx.fillStyle = 'rgba(230,245,255,0.35)'; ctx.beginPath(); ctx.arc(cx, cy, z * 0.48 + Math.sin(performance.now() / 600 + e.id) * z * 0.04, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(8,20,32,0.3)'; ctx.beginPath(); ctx.arc(cx + z * 0.2, cy + z * 0.25, z * 0.34, 0, 7); ctx.fill();
  ctx.fillStyle = '#e8c020'; ctx.beginPath(); ctx.arc(cx, cy, z * 0.34, 0, 7); ctx.fill();
  ctx.fillStyle = '#5a5e64'; ctx.beginPath(); ctx.arc(cx, cy, z * 0.2, 0, 7); ctx.fill();
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(ya);
  ctx.fillStyle = '#dfe3e8'; ctx.fillRect(-z * 0.5, -z * 0.15, z * 0.75, z * 0.3);
  ctx.restore();
  ctx.fillStyle = '#f4f6f8'; ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;
  for (let k = 0; k < 3; k++) {
    const a = a0 + k * Math.PI * 2 / 3, ca = Math.cos(a), sa = Math.sin(a), bw = R * 0.07;
    ctx.beginPath(); ctx.moveTo(cx - sa * bw, cy + ca * bw); ctx.lineTo(cx + ca * R, cy + sa * R); ctx.lineTo(cx + sa * bw, cy - ca * bw); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.fillStyle = '#c0c6cc'; ctx.beginPath(); ctx.arc(cx, cy, Math.max(1.5, R * 0.07), 0, 7); ctx.fill();
  if (z >= 12) { ctx.fillStyle = e.id % 2 ? '#e04a3a' : '#ff6a5a'; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(performance.now() / 400); ctx.beginPath(); ctx.arc(cx, cy, Math.max(1, z * 0.05), 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
}
function drawTidal(e, x, y, w, h, z) {
  const cx = x + w / 2, cy = y + h / 2, tv = tideOf(), dir = (S.t % (2 * TIDE_T)) < TIDE_T ? 1 : -1, now = performance.now() / 1000;
  ctx.fillStyle = 'rgba(10,30,50,0.35)'; ctx.beginPath(); ctx.ellipse(cx, cy, w * 0.42, h * 0.3, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(230,245,255,' + (0.15 + 0.5 * tv) + ')'; ctx.lineWidth = Math.max(1, z * 0.05);
  for (let k = 0; k < 4; k++) {
    const yy = y + h * (0.2 + k * 0.2), ph = ((now * (0.3 + tv) + k * 0.37 + e.id * 0.1) % 1), xx = dir > 0 ? x + w * ph : x + w * (1 - ph);
    ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx - dir * w * 0.22 * (0.3 + tv), yy); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(40,50,60,0.75)'; ctx.fillRect(cx - w * 0.32, cy - z * 0.12, w * 0.64, z * 0.24);
  ctx.fillStyle = '#c8ccd0'; ctx.fillRect(cx - z * 0.14, cy - h * 0.38, z * 0.28, h * 0.76);
  ctx.save(); ctx.translate(cx, cy); ctx.scale(1, Math.abs(Math.cos(e.r0 = (e.r0 || 0) + 0.02 * tv * dir)) * 0.8 + 0.2);
  ctx.fillStyle = 'rgba(20,30,40,0.8)'; ctx.fillRect(-z * 0.08, -h * 0.42, z * 0.16, h * 0.84); ctx.restore();
  ctx.fillStyle = '#e8c020'; ctx.beginPath(); ctx.arc(cx, cy, z * 0.22, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = Math.max(1, z * 0.04); ctx.stroke();
  ctx.fillStyle = '#3a3e44'; ctx.beginPath(); ctx.arc(cx, cy, z * 0.1, 0, 7); ctx.fill();
}
function drawPole(e, x, y, z) {
  const t = e.type, p = Math.max(1, z * 0.05);
  if (t === 'wood_pole' || t === 'steel_pole') {
    const wd = t === 'wood_pole', cx = x + z / 2, cy = y + z / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(cx + z * 0.16, cy + z * 0.2, z * 0.18, z * 0.12, 0.5, 0, 7); ctx.fill();
    ctx.fillStyle = wd ? '#6a4a2a' : '#8a9098'; ctx.beginPath(); ctx.arc(cx, cy, z * (wd ? 0.15 : 0.12), 0, 7); ctx.fill();
    ctx.strokeStyle = wd ? '#3a2814' : '#4a5058'; ctx.lineWidth = p; ctx.stroke();
    if (wd) { ctx.strokeStyle = 'rgba(40,24,10,0.6)'; ctx.beginPath(); ctx.arc(cx, cy, z * 0.08, 0, 7); ctx.stroke(); }
    ctx.fillStyle = wd ? '#5a3c20' : '#6a7078'; ctx.fillRect(cx - z * 0.42, cy - z * 0.055, z * 0.84, z * 0.11);
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = Math.max(1, z * 0.03); ctx.strokeRect(cx - z * 0.42, cy - z * 0.055, z * 0.84, z * 0.11);
    if (!wd) { ctx.fillStyle = '#5a646a'; ctx.fillRect(cx - z * 0.1, cy + z * 0.1, z * 0.2, z * 0.22); ctx.fillStyle = '#7a848a'; ctx.fillRect(cx - z * 0.1, cy + z * 0.1, z * 0.2, z * 0.05); }
    ctx.fillStyle = wd ? '#e4ded0' : '#a86a40';
    for (const k of [-0.34, 0, 0.34]) { ctx.beginPath(); ctx.arc(cx + k * z, cy - (k ? 0 : z * 0.17), z * 0.065, 0, 7); ctx.fill(); }
    return;
  }
  if (t === 'pylon') {
    const s = z * 2, cx = x + z, cy = y + z;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + z * 0.5, y + z * 0.6, s * 0.8, s * 0.75);
    ctx.strokeStyle = '#8a9298'; ctx.lineWidth = Math.max(1, z * 0.07);
    ctx.strokeRect(x + z * 0.22, y + z * 0.22, s - z * 0.44, s - z * 0.44);
    ctx.lineWidth = Math.max(1, z * 0.04); ctx.beginPath();
    ctx.moveTo(x + z * 0.22, y + z * 0.22); ctx.lineTo(x + s - z * 0.22, y + s - z * 0.22); ctx.moveTo(x + s - z * 0.22, y + z * 0.22); ctx.lineTo(x + z * 0.22, y + s - z * 0.22);
    ctx.moveTo(cx, y + z * 0.22); ctx.lineTo(x + s - z * 0.22, cy); ctx.lineTo(cx, y + s - z * 0.22); ctx.lineTo(x + z * 0.22, cy); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = '#b0b8be'; ctx.fillRect(cx - z * 0.22, cy - z * 0.22, z * 0.44, z * 0.44);
    ctx.fillStyle = '#9aa2a8'; ctx.fillRect(x - z * 0.15, cy - z * 0.09, s + z * 0.3, z * 0.18);
    ctx.strokeStyle = '#5a6268'; ctx.lineWidth = Math.max(1, z * 0.03); ctx.strokeRect(x - z * 0.15, cy - z * 0.09, s + z * 0.3, z * 0.18);
    ctx.fillStyle = '#a86a40';
    for (const k of [-0.95, 0.95]) for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(cx + k * z, cy + z * (0.16 + i * 0.1), z * 0.06, 0, 7); ctx.fill(); }
    return;
  }
  const s = z * 2;
  ctx.fillStyle = '#a8a6a0'; ctx.fillRect(x + z * 0.06, y + z * 0.06, s - z * 0.12, s - z * 0.12);
  ctx.strokeStyle = '#6a6862'; ctx.lineWidth = p; ctx.setLineDash([z * 0.12, z * 0.08]); ctx.strokeRect(x + z * 0.1, y + z * 0.1, s - z * 0.2, s - z * 0.2); ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x + z * 0.5, y + z * 0.58, z * 1.2, z * 1.1);
  ctx.fillStyle = '#5a6e5a'; ctx.fillRect(x + z * 0.38, y + z * 0.45, z * 1.24, z * 1.1);
  ctx.strokeStyle = '#3a4a3a'; ctx.lineWidth = Math.max(1, z * 0.025);
  for (let i = 1; i < 8; i++) { ctx.beginPath(); ctx.moveTo(x + z * (0.38 + i * 0.155), y + z * 0.45); ctx.lineTo(x + z * (0.38 + i * 0.155), y + z * 1.55); ctx.stroke(); }
  ctx.fillStyle = '#6e846e'; ctx.fillRect(x + z * 0.6, y + z * 0.62, z * 0.8, z * 0.7);
  ctx.fillStyle = '#a86a40';
  for (const k of [0.72, 1, 1.28]) { ctx.beginPath(); ctx.arc(x + k * z, y + z * 0.75, z * 0.08, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(x + k * z, y + z * 1.2, z * 0.06, 0, 7); ctx.fill(); }
  ctx.fillStyle = '#e0c84a'; ctx.beginPath(); ctx.moveTo(x + z * 1.62, y + z * 1.62); ctx.lineTo(x + z * 1.82, y + z * 1.62); ctx.lineTo(x + z * 1.72, y + z * 1.45); ctx.closePath(); ctx.fill();
}
function drawWires(ox, oy, z, x0, y0, x1, y1) {
  const ps = lists().pole;
  if (!ps.length) return;
  ctx.save(); ctx.lineCap = 'round';
  const segs = [];
  for (const p of ps) for (const id of p.w) {
    if (id <= p.id) continue;
    const q = ents.get(id);
    if (!q) continue;
    const a = ctr(p), b = ctr(q);
    if (Math.max(a.x, b.x) < x0 - 1 || Math.min(a.x, b.x) > x1 + 1 || Math.max(a.y, b.y) < y0 - 1 || Math.min(a.y, b.y) > y1 + 1) continue;
    segs.push([a, b, p.type === 'pylon' && q.type === 'pylon']);
  }
  for (const pass of [0, 1]) for (const [a, b, hv] of segs) {
    const L2 = Math.hypot(b.x - a.x, b.y - a.y), sg = Math.min(1.6, 0.05 * L2 + 0.15), sh = pass ? 0 : 0.9;
    const off = hv ? [-0.95, 0.95] : [0];
    for (const k of off) {
      const ax = ox + (a.x + k + sh * 0.5) * z, ay = oy + (a.y + sh * 0.6) * z, bx = ox + (b.x + k + sh * 0.5) * z, by = oy + (b.y + sh * 0.6) * z;
      ctx.strokeStyle = pass ? hv ? 'rgba(190,198,206,0.95)' : 'rgba(200,122,58,0.95)' : 'rgba(0,0,0,0.22)';
      ctx.lineWidth = Math.max(1, z * (hv ? 0.05 : 0.035));
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 + sg * z * (pass ? 1 : 0.4), bx, by); ctx.stroke();
    }
  }
  ctx.restore();
}
function drawSupply(ox, oy, z, x0, y0, x1, y1, hi) {
  ctx.save();
  for (const p of lists().pole) {
    const r = supRect(p);
    if (r[2] < x0 - 1 || r[0] > x1 || r[3] < y0 - 1 || r[1] > y1) continue;
    const on = p.pg === hi;
    ctx.fillStyle = on ? 'rgba(90,170,255,0.16)' : 'rgba(90,150,255,0.08)';
    ctx.fillRect(ox + r[0] * z, oy + r[1] * z, (r[2] - r[0] + 1) * z, (r[3] - r[1] + 1) * z);
    ctx.strokeStyle = on ? 'rgba(130,190,255,0.7)' : 'rgba(110,170,255,0.35)'; ctx.lineWidth = 1;
    ctx.strokeRect(ox + r[0] * z + 0.5, oy + r[1] * z + 0.5, (r[2] - r[0] + 1) * z - 1, (r[3] - r[1] + 1) * z - 1);
  }
  ctx.restore();
}
function drawNoPw(vis, ox, oy, z) {
  if (Math.floor(performance.now() / 600) % 2) return;
  for (const e of vis) {
    if (!(e.pn < 0) || !pwUser(e)) continue;
    const c = ctr(e), X = ox + c.x * z, Y = oy + c.y * z, r = Math.max(6, z * 0.32);
    ctx.fillStyle = 'rgba(30,10,10,0.8)'; ctx.beginPath(); ctx.arc(X, Y, r, 0, 7); ctx.fill();
    ctx.strokeStyle = '#e04a4a'; ctx.lineWidth = Math.max(1.5, r * 0.15); ctx.stroke();
    ctx.fillStyle = '#ffd34a'; ctx.beginPath();
    ctx.moveTo(X + r * 0.15, Y - r * 0.7); ctx.lineTo(X - r * 0.4, Y + r * 0.1); ctx.lineTo(X - r * 0.02, Y + r * 0.1); ctx.lineTo(X - r * 0.15, Y + r * 0.7); ctx.lineTo(X + r * 0.4, Y - r * 0.1); ctx.lineTo(X + r * 0.02, Y - r * 0.1); ctx.closePath(); ctx.fill();
  }
}
const TX = { m: new Map(), i: new Map(), lay: new Map(), css: null, url: new Map() };
function strH(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }
function hmix(a, b, t) { const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16), c = s => Math.round(((x >> s) & 255) * (1 - t) + ((y >> s) & 255) * t); return '#' + ((1 << 24) | (c(16) << 16) | (c(8) << 8) | c(0)).toString(16).slice(1); }
function hsh(a, f) { return f >= 1 ? hmix(a, '#ffffff', Math.min(1, f - 1)) : hmix(a, '#000000', 1 - f); }
function hlum(a) { const n = parseInt(a.slice(1), 16); return 0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255); }
function rrect(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function lgr(g, x0, y0, x1, y1, a, b, c) { const q = g.createLinearGradient(x0, y0, x1, y1); q.addColorStop(0, a); if (c) { q.addColorStop(0.5, b); q.addColorStop(1, c); } else q.addColorStop(1, b); return q; }
function rgr(g, x, y, r, a, b) { const q = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r); q.addColorStop(0, a); q.addColorStop(1, b); return q; }
function poly(g, p) { g.beginPath(); g.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); g.closePath(); }
function ell(g, x, y, rx, ry, a) { g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), a || 0, 0, Math.PI * 2); }
function dshad(g, x, y, rx, ry) { g.fillStyle = 'rgba(0,0,0,0.28)'; ell(g, x, y, rx, ry); g.fill(); }
function ink(g, w) { g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = w || 1.4; g.stroke(); }
function rockPts(cx, cy, R, r, n) { const p = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + r() * 0.4, d = R * (0.72 + r() * 0.36); p.push(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.82); } return p; }

const IP = {};
IP.ore = (g, c, r, n) => {
  const base = /salt|gypsum|lime|kaolin|feldspar|borax|cryolite|caliche/.test(n) ? hmix(c, '#d8d2c4', 0.35) : hmix(c, '#6b6259', 0.5), k = 1 + Math.floor(r() * 2);
  const at = k === 1 ? [[32, 36, 22]] : [[24, 40, 16], [42, 30, 14]];
  dshad(g, 32, 54, 24, 5);
  for (const [cx, cy, R] of at) {
    const p = rockPts(cx, cy, R, r, 7 + Math.floor(r() * 3));
    poly(g, p); g.fillStyle = lgr(g, cx - R, cy - R, cx + R, cy + R, hsh(base, 1.3), base, hsh(base, 0.55)); g.fill(); ink(g);
    g.save(); poly(g, p); g.clip();
    g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(cx - R * 0.2, cy - R * 0.1); g.lineTo(p[0], p[1]); g.moveTo(cx - R * 0.2, cy - R * 0.1); g.lineTo(p[6], p[7]); g.stroke();
    for (let i = 0; i < 14; i++) { const x = cx + (r() - 0.5) * R * 1.8, y = cy + (r() - 0.5) * R * 1.6, s = 1.5 + r() * 3.5; g.fillStyle = i % 3 ? hsh(c, 1.25) : hsh(c, 0.8); poly(g, [x, y - s, x + s, y, x, y + s * 0.8, x - s * 0.9, y]); g.fill(); }
    if (/gold|silver|pgm|reef/.test(n)) for (let i = 0; i < 5; i++) { g.fillStyle = '#ffe38a'; g.fillRect(cx + (r() - 0.5) * R, cy + (r() - 0.5) * R, 2, 2); }
    g.restore();
  }
};
IP.pile = (g, c, r, n) => {
  const top = 12 + r() * 10, wet = /mud|slime|digestate|press_mud|pomace|okara|compost|litter/.test(n);
  dshad(g, 32, 54, 27, 5);
  g.beginPath(); g.moveTo(4, 54); g.bezierCurveTo(14, 40, 22 + r() * 6, top, 32, top); g.bezierCurveTo(42 - r() * 6, top, 50, 40, 60, 54); g.closePath();
  g.fillStyle = lgr(g, 18, top, 46, 56, hsh(c, 1.35), c, hsh(c, 0.6)); g.fill();
  g.save(); g.clip();
  const gs = /sand|calcine|conc|ground|cinder|tailings|rougher|ash/.test(n) ? 1.2 : 2.4;
  for (let i = 0; i < 160; i++) { const x = 4 + r() * 56, y = top + r() * (56 - top), s = gs * (0.5 + r()); g.fillStyle = r() < 0.5 ? hsh(c, 0.7 + r() * 0.2) : hsh(c, 1.15 + r() * 0.25); g.fillRect(x, y, s, s); }
  if (wet) { g.fillStyle = 'rgba(255,255,255,0.22)'; ell(g, 26, top + 10, 10, 3, -0.2); g.fill(); }
  g.restore(); g.beginPath(); g.moveTo(4, 54); g.bezierCurveTo(14, 40, 22, top, 32, top); g.bezierCurveTo(42, top, 50, 40, 60, 54); ink(g, 1.2);
};
IP.coal = (g, c, r, n) => {
  const b = hlum(c) > 90 ? hsh(c, 0.6) : c;
  dshad(g, 32, 54, 25, 5);
  const at = [[20, 42, 12], [42, 42, 12], [31, 26, 13]];
  for (const [cx, cy, R] of at) {
    const p = rockPts(cx, cy, R, r, 6); poly(g, p);
    g.fillStyle = lgr(g, cx - R, cy - R, cx + R, cy + R, hsh(b, 1.5), b, hsh(b, 0.5)); g.fill(); ink(g, 1.2);
    g.strokeStyle = 'rgba(220,230,255,0.45)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx - R * 0.5, cy - R * 0.3); g.lineTo(cx, cy - R * 0.55); g.stroke();
    if (/coke|anode|graphite/.test(n)) { g.fillStyle = 'rgba(0,0,0,0.5)'; for (let i = 0; i < 6; i++) { ell(g, cx + (r() - 0.5) * R, cy + (r() - 0.5) * R, 1.3, 1); g.fill(); } }
  }
};
IP.jar = (g, c, r, n) => {
  const lid = ['#f0f0ec', '#2a5aa0', '#a03030', '#202428', '#e0b030', '#3a8a4a'][Math.floor(r() * 6)], liq = /acid|solution|liquid/.test(n);
  dshad(g, 32, 58, 18, 3);
  rrect(g, 15, 17, 34, 41, 7); g.fillStyle = 'rgba(210,225,235,0.35)'; g.fill();
  g.save(); rrect(g, 15, 17, 34, 41, 7); g.clip();
  const lv = 26 + r() * 8;
  g.fillStyle = lgr(g, 15, lv, 49, 58, hsh(c, 1.25), c, hsh(c, 0.7)); g.fillRect(15, lv, 34, 60 - lv);
  if (!liq) for (let i = 0; i < 60; i++) { g.fillStyle = r() < 0.5 ? hsh(c, 0.8) : hsh(c, 1.2); g.fillRect(15 + r() * 34, lv + r() * (58 - lv), 1.5, 1.5); }
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(18, 19, 4, 36);
  g.restore();
  rrect(g, 15, 17, 34, 41, 7); ink(g, 1.4);
  g.fillStyle = '#f4f1e8'; g.fillRect(19, 38, 26, 13); g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 1; g.strokeRect(19, 38, 26, 13);
  g.fillStyle = hsh(c, 0.8); g.fillRect(21, 40, 22, 3); g.fillStyle = '#555'; g.fillRect(21, 45, 14, 1.5); g.fillRect(21, 48, 18, 1.5);
  rrect(g, 17, 9, 30, 10, 3); g.fillStyle = lgr(g, 0, 9, 0, 19, hsh(lid, 1.3), lid, hsh(lid, 0.65)); g.fill(); ink(g, 1.2);
  g.strokeStyle = 'rgba(0,0,0,0.3)'; for (let x = 20; x < 46; x += 3) { g.beginPath(); g.moveTo(x, 10); g.lineTo(x, 18); g.stroke(); }
};
IP.sack = (g, c, r, n) => {
  const bag = ['#c8a878', '#e6e2d6', '#d4cfba', '#bfc8b0'][Math.floor(r() * 4)];
  dshad(g, 32, 58, 22, 4);
  g.beginPath(); g.moveTo(14, 20); g.quadraticCurveTo(8, 40, 12, 54); g.quadraticCurveTo(32, 60, 52, 54); g.quadraticCurveTo(56, 40, 50, 20); g.quadraticCurveTo(32, 15, 14, 20); g.closePath();
  g.fillStyle = lgr(g, 10, 20, 54, 58, hsh(bag, 1.15), bag, hsh(bag, 0.7)); g.fill(); ink(g);
  g.beginPath(); g.moveTo(14, 20); g.lineTo(20, 8); g.lineTo(44, 8); g.lineTo(50, 20); g.closePath(); g.fillStyle = hsh(bag, 0.9); g.fill(); ink(g, 1.1);
  g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; for (let x = 23; x < 44; x += 4) { g.beginPath(); g.moveTo(x, 9); g.lineTo(x - 1, 19); g.stroke(); }
  g.fillStyle = c; g.fillRect(16, 30, 32, 13); g.strokeStyle = 'rgba(0,0,0,0.35)'; g.strokeRect(16, 30, 32, 13);
  g.fillStyle = hlum(c) > 140 ? '#222' : '#fff'; g.fillRect(19, 33, 18, 2.5); g.fillRect(19, 38, 12, 2);
  g.beginPath(); g.arc(42, 36.5, 3.5, 0, 7); g.fill();
};
IP.pellet = (g, c, r, n) => {
  dshad(g, 32, 54, 25, 5);
  const ps = []; for (let i = 0; i < 26; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()); ps.push([32 + Math.cos(a) * d * 22, 44 + Math.sin(a) * d * 8 - (1 - d) * 18]); }
  ps.sort((a, b) => a[1] - b[1]);
  const cyl = /chips|nylon|pet\b|pbt/.test(n);
  for (const [x, y] of ps) { ell(g, x, y, cyl ? 4.5 : 4, cyl ? 3 : 3.6, r() * 3); g.fillStyle = rgr(g, x, y, 4.5, hsh(c, 1.45), hsh(c, 0.8)); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 0.8; g.stroke(); }
};
IP.ingot = (g, c, r, n) => {
  const k = /bullion|pig|ferro|regulus|matte|blister|dore|femn|simn/.test(n) ? 1 : 1 + Math.floor(r() * 3), m = hlum(c) < 60 ? hsh(c, 1.6) : c;
  dshad(g, 32, 54, 26, 5);
  const one = (x, y, w) => {
    const h = 9, t = 6;
    poly(g, [x, y, x + w, y, x + w - t, y - h, x + t, y - h]); g.fillStyle = hsh(m, 1.35); g.fill(); ink(g, 1);
    poly(g, [x - 3, y + 9, x + w + 3, y + 9, x + w, y, x, y]); g.fillStyle = lgr(g, 0, y, 0, y + 9, m, hsh(m, 0.6)); g.fill(); ink(g, 1);
    g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x + t + 2, y - h + 2); g.lineTo(x + w - t - 4, y - h + 2); g.stroke();
  };
  if (k === 1) { one(12, 40, 40); if (/dore/.test(n)) { g.fillStyle = '#ffe9a0'; ell(g, 32, 34, 4, 2); g.fill(); } }
  else if (k === 2) { one(8, 48, 30); one(26, 48, 30); one(17, 37, 30); }
  else { one(5, 50, 26); one(21, 50, 26); one(37, 50, 22); one(13, 39, 26); one(29, 39, 24); }
};
IP.cathode = (g, c, r, n) => {
  dshad(g, 32, 58, 22, 3);
  rrect(g, 13, 16, 38, 41, 2); g.fillStyle = lgr(g, 13, 16, 51, 57, hsh(c, 1.3), c, hsh(c, 0.65)); g.fill(); ink(g);
  for (let i = 0; i < 40; i++) { g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.2)'; ell(g, 16 + r() * 32, 20 + r() * 34, 1.2 + r() * 1.8, 1 + r() * 1.5); g.fill(); }
  g.fillStyle = '#8a8f96'; g.fillRect(6, 9, 52, 5); g.strokeStyle = '#333'; g.lineWidth = 1; g.strokeRect(6, 9, 52, 5);
  g.fillStyle = hsh(c, 0.8); g.fillRect(17, 12, 6, 6); g.fillRect(41, 12, 6, 6);
};
IP.sheet = (g, c, r, n) => {
  const glass = /glass|glazing|sapphire_glass|cover|pmma|acrylic sheet|polycarbonate|rooflight|cellophane|film|polariser/.test(n);
  const paper = /paper|carton|decor/.test(n) && !/sandpaper/.test(n);
  const board = /board|particle|cork|hpl|worktop|lino|vinyl|plaster/.test(n), k = 3 + Math.floor(r() * 2);
  dshad(g, 32, 54, 26, 5);
  for (let i = 0; i < k; i++) {
    const y = 44 - i * 6, x = 8 + i * 2;
    const p = [x, y, x + 36, y, x + 48, y - 16, x + 12, y - 16];
    poly(g, p);
    if (glass) { g.fillStyle = `rgba(${parseInt(c.slice(1, 3), 16)},${parseInt(c.slice(3, 5), 16)},${parseInt(c.slice(5, 7), 16)},0.5)`; g.fill(); g.strokeStyle = hsh(c, 0.6); g.lineWidth = 1.4; g.stroke(); g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x + 14, y - 3); g.lineTo(x + 22, y - 13); g.moveTo(x + 20, y - 3); g.lineTo(x + 25, y - 9); g.stroke(); }
    else {
      g.fillStyle = paper ? lgr(g, x, y - 16, x + 48, y, '#fbfaf4', hmix('#f0eee6', c, 0.25)) : lgr(g, x, y - 16, x + 48, y, hsh(c, 1.3), c, hsh(c, 0.75)); g.fill(); ink(g, 1);
      g.fillStyle = hsh(paper ? '#d8d4c8' : c, 0.6); poly(g, [x, y, x + 36, y, x + 36, y + 2.5, x, y + 2.5]); g.fill();
      if (board) { g.save(); poly(g, p); g.clip(); for (let j = 0; j < 30; j++) { g.fillStyle = r() < 0.5 ? hsh(c, 0.75) : hsh(c, 1.2); g.fillRect(x + r() * 48, y - 16 + r() * 16, 2, 1.2); } g.restore(); }
      else if (!paper) { g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + 6, y - 4); g.lineTo(x + 40, y - 4); g.moveTo(x + 10, y - 10); g.lineTo(x + 42, y - 10); g.stroke(); }
    }
  }
  if (paper) { g.fillStyle = hsh(c, 0.85); g.fillRect(20, 40 - (k - 1) * 6, 22, 2); }
};
IP.rod = (g, c, r, n) => {
  const tube = /tube|pipe|pole/.test(n), k = 4 + Math.floor(r() * 3), m = hlum(c) < 50 ? hsh(c, 1.7) : c;
  dshad(g, 32, 54, 26, 5);
  for (let i = 0; i < k; i++) {
    const o = (i - k / 2) * 6, x0 = 10 + o * 0.6, y0 = 48 + o * 0.4, x1 = 50 + o * 0.6, y1 = 18 + o * 0.4, w = tube ? 7 : 5;
    g.lineCap = 'round'; g.strokeStyle = '#2a2a2a'; g.lineWidth = w + 2; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    g.strokeStyle = m; g.lineWidth = w; g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x0 - 1, y0 - 2); g.lineTo(x1 - 1, y1 - 2); g.stroke();
    if (/rebar/.test(n)) { g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 1; for (let t = 0.1; t < 1; t += 0.12) { const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t; g.beginPath(); g.moveTo(x - 2, y - 2); g.lineTo(x + 2, y + 2); g.stroke(); } }
    g.fillStyle = hsh(m, 1.2); ell(g, x1, y1, w / 2, w / 2); g.fill(); ink(g, 0.8);
    if (tube) { g.fillStyle = '#1a1a1a'; ell(g, x1, y1, w / 4, w / 4); g.fill(); }
  }
  g.lineCap = 'butt';
};
IP.spool = (g, c, r, n) => {
  const fl = ['#b08a5a', '#3a3e44', '#d8d8d0', '#2a5aa0'][Math.floor(r() * 4)];
  dshad(g, 32, 58, 22, 3);
  g.fillStyle = lgr(g, 16, 0, 48, 0, hsh(c, 0.6), hsh(c, 1.3), hsh(c, 0.6)); g.fillRect(16, 14, 32, 38);
  g.strokeStyle = hsh(c, 0.5); g.lineWidth = 1; for (let y = 16; y < 52; y += 2.2) { g.beginPath(); g.moveTo(16, y); g.quadraticCurveTo(32, y + 1.4, 48, y); g.stroke(); }
  for (const y of [9, 51]) { rrect(g, 10, y, 44, 6, 2); g.fillStyle = lgr(g, 10, 0, 54, 0, hsh(fl, 0.7), hsh(fl, 1.25), hsh(fl, 0.7)); g.fill(); ink(g, 1); }
  g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(26, 16); g.lineTo(26, 50); g.stroke();
};
IP.coil = (g, c, r, n) => {
  const w = /rope|twine|net/.test(n) ? 4.5 : 3.4;
  dshad(g, 32, 52, 25, 6);
  for (let i = 0; i < 6; i++) { ell(g, 32, 40 - i * 2.4, 22 - i * 0.6, 10 - i * 0.3); g.strokeStyle = '#1e1e1e'; g.lineWidth = w + 1.6; g.stroke(); g.strokeStyle = i % 2 ? c : hsh(c, 1.2); g.lineWidth = w; g.stroke(); }
  if (/rope|twine/.test(n)) { g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; for (let a = 0; a < 6.28; a += 0.3) { const x = 32 + Math.cos(a) * 19, y = 28 + Math.sin(a) * 9; g.beginPath(); g.moveTo(x - 1.5, y - 1.5); g.lineTo(x + 1.5, y + 1.5); g.stroke(); } }
  g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(52, 30); g.quadraticCurveTo(60, 40, 54, 56); g.stroke();
};
IP.yarn = (g, c, r, n) => {
  dshad(g, 32, 58, 20, 3);
  if (r() < 0.5) {
    poly(g, [26, 6, 38, 6, 46, 56, 18, 56]); g.fillStyle = '#c8b898'; g.fill(); ink(g, 1);
    g.save(); poly(g, [22, 14, 42, 14, 48, 52, 16, 52]); g.clip();
    for (let y = 14; y < 54; y += 2) { g.strokeStyle = y % 4 ? c : hsh(c, 0.8); g.lineWidth = 2; g.beginPath(); g.moveTo(10, y); g.quadraticCurveTo(32, y + 3, 54, y - 1); g.stroke(); }
    g.restore(); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(24, 16, 4, 34);
  } else {
    g.beginPath(); g.arc(32, 34, 21, 0, 7); g.fillStyle = rgr(g, 32, 34, 21, hsh(c, 1.35), hsh(c, 0.7)); g.fill(); ink(g, 1.2);
    g.save(); g.beginPath(); g.arc(32, 34, 21, 0, 7); g.clip(); g.strokeStyle = hsh(c, 0.6); g.lineWidth = 1.2;
    for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(32, 34, 21, 6 + i * 2, 0.6 + i * 0.35, 0, Math.PI * 2); g.stroke(); }
    g.restore(); g.strokeStyle = c; g.lineWidth = 2; g.beginPath(); g.moveTo(48, 46); g.quadraticCurveTo(58, 52, 54, 60); g.stroke();
  }
};
IP.fluff = (g, c, r, n) => {
  dshad(g, 32, 54, 25, 5);
  for (let i = 0; i < 70; i++) { const y = 20 + r() * 30, x = 8 + r() * 48; g.strokeStyle = r() < 0.4 ? hsh(c, 0.75) : hsh(c, 1.15); g.lineWidth = 1 + r() * 1.5; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 8, y - 6 * r(), x + 14, y + 6 * r(), x + 18 * r() + 6, y + (r() - 0.5) * 8); g.stroke(); }
  if (/top|tow|lint/.test(n)) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(30, 18, 4, 34); }
};
IP.fabric = (g, c, r, n) => {
  dshad(g, 32, 56, 26, 4);
  for (let i = 0; i < 3; i++) {
    const y = 44 - i * 9; rrect(g, 8 + i * 2, y - 8, 48 - i * 4, 13, 4);
    g.fillStyle = lgr(g, 0, y - 8, 0, y + 5, hsh(c, 1.25), c, hsh(c, 0.7)); g.fill(); ink(g, 1);
    g.save(); rrect(g, 8 + i * 2, y - 8, 48 - i * 4, 13, 4); g.clip(); g.strokeStyle = 'rgba(0,0,0,0.13)'; g.lineWidth = 1;
    for (let x = 0; x < 64; x += 3) { g.beginPath(); g.moveTo(x, y - 9); g.lineTo(x + 6, y + 6); g.stroke(); }
    if (/denim/.test(n)) { g.strokeStyle = 'rgba(255,255,255,0.18)'; for (let x = 0; x < 64; x += 2.5) { g.beginPath(); g.moveTo(x, y - 9); g.lineTo(x + 8, y + 6); g.stroke(); } }
    if (/carpet|doormat/.test(n)) for (let j = 0; j < 40; j++) { g.fillStyle = r() < 0.5 ? hsh(c, 0.8) : hsh(c, 1.15); g.fillRect(10 + r() * 44, y - 8 + r() * 12, 1.5, 1.5); }
    g.restore();
  }
};
IP.garment = (g, c, r, n) => {
  dshad(g, 32, 58, 22, 3);
  g.fillStyle = lgr(g, 10, 10, 54, 56, hsh(c, 1.25), c, hsh(c, 0.7));
  if (/sock/.test(n)) { for (const o of [-9, 9]) { g.beginPath(); g.moveTo(26 + o, 8); g.lineTo(38 + o, 8); g.lineTo(38 + o, 40); g.quadraticCurveTo(38 + o, 54, 26 + o, 54); g.lineTo(18 + o, 54); g.quadraticCurveTo(12 + o, 46, 20 + o, 42); g.lineTo(26 + o, 40); g.closePath(); g.fill(); ink(g, 1.1); g.fillStyle = hsh(c, 0.7); g.fillRect(26 + o, 8, 12, 5); g.fillStyle = lgr(g, 10, 10, 54, 56, hsh(c, 1.25), c, hsh(c, 0.7)); } }
  else if (/tie/.test(n)) { poly(g, [28, 6, 36, 6, 34, 12, 40, 46, 32, 58, 24, 46, 30, 12]); g.fill(); ink(g, 1.2); g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 2; for (let y = 18; y < 52; y += 7) { g.beginPath(); g.moveTo(26, y + 4); g.lineTo(38, y - 2); g.stroke(); } }
  else if (/scarf/.test(n)) { poly(g, [8, 14, 44, 8, 56, 46, 20, 54]); g.fill(); ink(g, 1.2); for (let i = 0; i < 6; i++) { g.fillStyle = ['#e04a4a', '#f0d040', '#3a7ad0', '#40b060'][i % 4]; ell(g, 18 + r() * 28, 18 + r() * 28, 3, 3); g.fill(); } }
  else if (/shoe/.test(n)) { g.beginPath(); g.moveTo(8, 46); g.lineTo(10, 30); g.quadraticCurveTo(22, 22, 30, 32); g.quadraticCurveTo(46, 36, 56, 44); g.lineTo(56, 50); g.lineTo(8, 50); g.closePath(); g.fill(); ink(g, 1.2); g.fillStyle = '#2a1e18'; g.fillRect(8, 49, 48, 4); g.strokeStyle = '#eee'; g.lineWidth = 1; for (let x = 24; x < 36; x += 3) { g.beginPath(); g.moveTo(x, 30); g.lineTo(x + 3, 34); g.stroke(); } }
  else if (/glove/.test(n)) { g.beginPath(); g.moveTo(20, 56); g.lineTo(18, 30); for (let i = 0; i < 4; i++) { g.lineTo(18 + i * 7, 12 + (i === 0 || i === 3 ? 6 : 0)); g.lineTo(23 + i * 7, 12 + (i === 0 || i === 3 ? 6 : 0)); g.lineTo(24 + i * 7, 28); } g.lineTo(46, 34); g.lineTo(52, 26); g.lineTo(54, 30); g.lineTo(46, 44); g.lineTo(44, 56); g.closePath(); g.fill(); ink(g, 1.2); }
  else { poly(g, [22, 8, 42, 8, 56, 18, 52, 30, 46, 26, 46, 56, 18, 56, 18, 26, 12, 30, 8, 18]); g.fill(); ink(g, 1.2); g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1; g.beginPath(); g.arc(32, 8, 6, 0, Math.PI); g.stroke(); for (let y = 50; y < 56; y += 2) { g.beginPath(); g.moveTo(18, y); g.lineTo(46, y); g.stroke(); } }
};
IP.gear = (g, c, r, n) => {
  const m = hlum(c) < 50 ? hsh(c, 1.8) : c, T = 9 + Math.floor(r() * 6);
  const gear = (cx, cy, R, t, col) => {
    g.beginPath(); for (let i = 0; i < t * 2; i++) { const a = i / (t * 2) * Math.PI * 2, d = i % 2 ? R * 0.8 : R; g.lineTo(cx + Math.cos(a - 0.12) * d, cy + Math.sin(a - 0.12) * d); g.lineTo(cx + Math.cos(a + 0.12) * d, cy + Math.sin(a + 0.12) * d); } g.closePath();
    g.fillStyle = rgr(g, cx, cy, R, hsh(col, 1.4), hsh(col, 0.7)); g.fill(); ink(g, 1.2);
    g.beginPath(); g.arc(cx, cy, R * 0.28, 0, 7); g.fillStyle = '#1c1c1c'; g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, R * 0.55, 0, 7); g.stroke();
  };
  dshad(g, 32, 56, 24, 4);
  if (/box|group|movement|wheels/.test(n)) { gear(42, 22, 14, 10, hsh(m, 0.85)); gear(24, 38, 19, T, m); }
  else gear(32, 32, 24, T, m);
};
IP.motor = (g, c, r, n) => {
  const big = /engine|traction/.test(n);
  dshad(g, 32, 56, 26, 4);
  g.fillStyle = '#3a3e44'; g.fillRect(12, 48, 8, 6); g.fillRect(40, 48, 8, 6);
  rrect(g, 8, 20, 42, 30, 6); g.fillStyle = lgr(g, 0, 20, 0, 50, hsh(c, 1.35), c, hsh(c, 0.55)); g.fill(); ink(g);
  g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1.2; for (let x = 14; x < 46; x += 4) { g.beginPath(); g.moveTo(x, 22); g.lineTo(x, 48); g.stroke(); }
  g.fillStyle = '#9aa0a6'; g.fillRect(50, 32, 10, 5); ink(g, 1);
  if (big) { for (let i = 0; i < 4; i++) { rrect(g, 12 + i * 9, 8, 7, 14, 2); g.fillStyle = hsh(c, 0.9); g.fill(); ink(g, 1); } }
  else { rrect(g, 22, 10, 14, 11, 2); g.fillStyle = hsh(c, 0.75); g.fill(); ink(g, 1); }
  if (/pm_|magnet/.test(n)) { g.fillStyle = '#c0c0c8'; g.fillRect(8, 30, 4, 10); }
};
IP.battery = (g, c, r, n) => {
  dshad(g, 32, 58, 20, 3);
  if (/pouch|cell_line/.test(n)) { rrect(g, 12, 14, 40, 42, 4); g.fillStyle = lgr(g, 12, 14, 52, 56, '#e8eaee', '#a8adb4'); g.fill(); ink(g); g.fillStyle = '#c87a4a'; g.fillRect(20, 6, 7, 10); g.fillStyle = '#d0d4d8'; g.fillRect(37, 6, 7, 10); g.fillStyle = c; g.fillRect(16, 30, 32, 10); }
  else if (/button/.test(n)) { ell(g, 32, 40, 22, 9); g.fillStyle = '#7a7e84'; g.fill(); ink(g); g.fillRect(10, 30, 44, 10); ell(g, 32, 30, 22, 9); g.fillStyle = lgr(g, 10, 22, 54, 38, '#f0f2f4', '#9aa0a6'); g.fill(); ink(g); g.fillStyle = '#333'; g.font = 'bold 12px sans-serif'; g.textAlign = 'center'; g.fillText('+', 32, 35); }
  else if (/cell|alk/.test(n)) { rrect(g, 20, 10, 24, 46, 5); g.fillStyle = lgr(g, 20, 0, 44, 0, hsh(c, 0.6), hsh(c, 1.35), hsh(c, 0.6)); g.fill(); ink(g); g.fillStyle = '#c8ccd0'; g.fillRect(27, 5, 10, 6); g.fillStyle = '#e8e8e8'; g.fillRect(20, 14, 24, 4); g.fillStyle = hlum(c) > 140 ? '#222' : '#fff'; g.font = 'bold 11px sans-serif'; g.textAlign = 'center'; g.fillText('+', 32, 30); }
  else { rrect(g, 8, 18, 48, 38, 3); g.fillStyle = lgr(g, 0, 18, 0, 56, '#4a4e54', '#22262a'); g.fill(); ink(g); g.fillStyle = c; g.fillRect(8, 18, 48, 9); g.fillStyle = '#c03030'; g.fillRect(14, 10, 8, 8); g.fillStyle = '#303438'; g.fillRect(42, 10, 8, 8); g.fillStyle = '#fff'; g.font = 'bold 10px sans-serif'; g.textAlign = 'center'; g.fillText('+  −', 32, 44); }
};
IP.board = (g, c, r, n) => {
  dshad(g, 32, 56, 26, 4);
  rrect(g, 6, 12, 52, 40, 3); g.fillStyle = lgr(g, 0, 12, 0, 52, '#2f8a4a', '#1a5a2e'); g.fill(); ink(g);
  g.strokeStyle = '#d8b050'; g.lineWidth = 1; for (let i = 0; i < 10; i++) { const y = 16 + r() * 32, x = 8 + r() * 20; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 10, y); g.lineTo(x + 14, y + (r() - 0.5) * 10); g.lineTo(x + 30, y + (r() - 0.5) * 10); g.stroke(); }
  if (!/pcb|laminate/.test(n)) {
    g.fillStyle = '#1a1c1e'; g.fillRect(24, 22, 16, 16); g.fillStyle = '#c8ccd0'; for (let i = 0; i < 5; i++) { g.fillRect(22, 24 + i * 3, 2, 1.5); g.fillRect(40, 24 + i * 3, 2, 1.5); }
    for (let i = 0; i < 5; i++) { g.fillStyle = ['#c8a050', '#3a3e44', '#a03030', c][i % 4]; g.fillRect(10 + r() * 40, 16 + r() * 30, 5, 3); }
    g.fillStyle = c; g.fillRect(44, 40, 10, 8); ink(g, 0.6);
  }
  if (/laminate/.test(n)) { g.fillStyle = '#c87a4a'; g.fillRect(6, 12, 52, 40); g.strokeStyle = '#e8a070'; g.strokeRect(9, 15, 46, 34); }
};
IP.chip = (g, c, r, n) => {
  dshad(g, 32, 56, 24, 4);
  if (/mlcc|cap/.test(n)) { for (let i = 0; i < 6; i++) { const x = 10 + (i % 3) * 16, y = 18 + Math.floor(i / 3) * 18; g.fillStyle = /ta_/.test(n) ? '#d0a030' : '#8a6a4a'; g.fillRect(x, y, 12, 9); g.fillStyle = '#c8ccd0'; g.fillRect(x - 2, y, 3, 9); g.fillRect(x + 11, y, 3, 9); } return; }
  if (/connector/.test(n)) { rrect(g, 10, 18, 44, 24, 3); g.fillStyle = c; g.fill(); ink(g); g.fillStyle = '#222'; for (let i = 0; i < 6; i++) g.fillRect(14 + i * 6.5, 24, 4, 8); g.fillStyle = '#d8b050'; for (let i = 0; i < 6; i++) g.fillRect(15 + i * 6.5, 42, 2, 8); return; }
  g.fillStyle = '#c8ccd0'; for (let i = 0; i < 7; i++) { const o = 15 + i * 5; g.fillRect(o, 8, 2.5, 8); g.fillRect(o, 48, 2.5, 8); g.fillRect(8, o, 8, 2.5); g.fillRect(48, o, 8, 2.5); }
  rrect(g, 14, 14, 36, 36, 3); g.fillStyle = lgr(g, 14, 14, 50, 50, '#3a3e44', '#121416'); g.fill(); ink(g);
  g.fillStyle = 'rgba(255,255,255,0.15)'; g.beginPath(); g.arc(20, 20, 2, 0, 7); g.fill();
  g.fillStyle = c; g.fillRect(26, 26, 12, 12); g.strokeStyle = 'rgba(255,255,255,0.3)'; g.strokeRect(26, 26, 12, 12);
};
IP.wafer = (g, c, r, n) => {
  const die = /die|led_chip/.test(n) && !/wafer/.test(n);
  dshad(g, 32, 58, 22, 3);
  if (die) { rrect(g, 16, 16, 32, 32, 2); g.fillStyle = lgr(g, 16, 16, 48, 48, hsh(c, 1.4), '#5a4a8a', c); g.fill(); ink(g); g.strokeStyle = 'rgba(255,220,120,0.6)'; g.lineWidth = 1; for (let i = 0; i < 4; i++) g.strokeRect(20 + i * 3, 20 + i * 3, 24 - i * 6, 24 - i * 6); return; }
  g.save(); g.beginPath(); g.arc(32, 32, 26, 0.3 + Math.PI / 2, Math.PI * 2.5 - 0.3); g.closePath(); g.clip();
  const q = g.createLinearGradient(6, 6, 58, 58); q.addColorStop(0, hsh(c, 1.5)); q.addColorStop(0.35, c); q.addColorStop(0.55, '#8a6ab0'); q.addColorStop(0.75, '#4aa0a0'); q.addColorStop(1, hsh(c, 0.6)); g.fillStyle = q; g.fillRect(0, 0, 64, 64);
  if (!/sapphire|quartz|clean|ox_wafer|^wafer/.test(n)) { g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 0.8; for (let x = 8; x < 60; x += 5) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 64); g.stroke(); g.beginPath(); g.moveTo(0, x); g.lineTo(64, x); g.stroke(); } }
  g.fillStyle = 'rgba(255,255,255,0.25)'; ell(g, 22, 20, 12, 5, -0.6); g.fill();
  g.restore(); g.beginPath(); g.arc(32, 32, 26, 0.3 + Math.PI / 2, Math.PI * 2.5 - 0.3); g.closePath(); ink(g, 1.4);
};
IP.crystal = (g, c, r, n) => {
  dshad(g, 32, 58, 18, 3);
  const boule = /boule|bar\b|quartz_bar/.test(n);
  if (boule) { rrect(g, 20, 6, 24, 50, 12); g.fillStyle = lgr(g, 20, 0, 44, 0, hsh(c, 0.7), hsh(c, 1.5), hsh(c, 0.75)); g.fill(); ink(g); g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(26, 12, 3, 38); return; }
  const fac = [[32, 6, 46, 18, 32, 24], [32, 6, 18, 18, 32, 24], [18, 18, 32, 24, 32, 58], [46, 18, 32, 24, 32, 58], [18, 18, 14, 34, 32, 58], [46, 18, 50, 34, 32, 58]];
  const sh = [1.5, 1.25, 1.05, 0.8, 0.9, 0.6];
  fac.forEach((p, i) => { poly(g, p); g.fillStyle = hsh(c, sh[i]); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; g.stroke(); });
  g.fillStyle = '#fff'; poly(g, [48, 8, 49.5, 12, 54, 13, 49.5, 14, 48, 18, 46.5, 14, 42, 13, 46.5, 12]); g.fill();
};
IP.lens = (g, c, r, n) => {
  const mir = /mirror/.test(n);
  dshad(g, 32, 58, 22, 3);
  g.beginPath(); g.arc(32, 32, 24, 0, 7); g.fillStyle = mir ? lgr(g, 8, 8, 56, 56, '#f4f6f8', '#8a96a4', '#e0e6ec') : rgr(g, 32, 32, 24, 'rgba(255,255,255,0.75)', hmix(c, '#a0c0d8', 0.4)); g.fill(); g.strokeStyle = mir ? '#5a5e64' : hsh(c, 0.6); g.lineWidth = 3; g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 2.2; g.beginPath(); g.arc(32, 32, 17, 3.6, 4.6); g.stroke();
  if (/coated|achromat/.test(n)) { g.strokeStyle = 'rgba(160,80,200,0.5)'; g.lineWidth = 3; g.beginPath(); g.arc(32, 32, 12, 0.2, 1.6); g.stroke(); }
  if (/prism/.test(n)) { g.clearRect(0, 0, 64, 64); poly(g, [10, 52, 54, 52, 32, 12]); g.fillStyle = rgr(g, 32, 36, 26, 'rgba(255,255,255,0.8)', hmix(c, '#90b8d0', 0.5)); g.fill(); ink(g, 2); g.strokeStyle = '#e04040'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, 40); g.lineTo(24, 34); g.stroke(); for (const [col, y] of [['#e04040', 30], ['#f0d040', 36], ['#40c060', 42], ['#4080e0', 48]]) { g.strokeStyle = col; g.beginPath(); g.moveTo(40, 34); g.lineTo(64, y); g.stroke(); } }
};
IP.optic = (g, c, r, n) => {
  dshad(g, 32, 58, 24, 3);
  g.fillStyle = c; g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 1.4;
  if (/eyeglass/.test(n)) { g.lineWidth = 3; g.strokeStyle = c; for (const x of [18, 46]) { g.beginPath(); g.arc(x, 34, 11, 0, 7); g.fillStyle = 'rgba(180,220,240,0.6)'; g.fill(); g.stroke(); } g.beginPath(); g.moveTo(29, 32); g.quadraticCurveTo(32, 28, 35, 32); g.moveTo(7, 32); g.lineTo(2, 24); g.moveTo(57, 32); g.lineTo(62, 24); g.stroke(); }
  else if (/binoc/.test(n)) { for (const x of [14, 36]) { rrect(g, x, 12, 14, 40, 5); g.fillStyle = lgr(g, x, 0, x + 14, 0, hsh(c, 1.3), hsh(c, 0.6)); g.fill(); ink(g); g.fillStyle = '#1a2a3a'; ell(g, x + 7, 52, 6, 2.5); g.fill(); } g.fillStyle = '#333'; g.fillRect(27, 22, 10, 8); }
  else if (/telescope/.test(n)) { g.save(); g.translate(32, 28); g.rotate(-0.5); rrect(g, -24, -8, 48, 16, 3); g.fillStyle = lgr(g, 0, -8, 0, 8, hsh(c, 1.4), hsh(c, 0.6)); g.fill(); ink(g); g.fillStyle = '#222'; g.fillRect(20, -9, 5, 18); g.restore(); g.strokeStyle = '#444'; g.lineWidth = 2; g.beginPath(); g.moveTo(32, 32); g.lineTo(20, 58); g.moveTo(32, 32); g.lineTo(32, 58); g.moveTo(32, 32); g.lineTo(44, 58); g.stroke(); }
  else if (/microscope/.test(n)) { g.fillRect(14, 50, 36, 6); g.fillRect(36, 16, 8, 36); g.save(); g.translate(28, 22); g.rotate(-0.4); g.fillStyle = '#d8dce0'; g.fillRect(-4, -16, 8, 26); g.restore(); g.fillStyle = '#555'; g.fillRect(18, 38, 22, 3); g.fillStyle = '#d8dce0'; g.fillRect(22, 30, 5, 8); }
  else { rrect(g, 12, 16, 40, 34, 6); g.fillStyle = lgr(g, 0, 16, 0, 50, '#4a4e54', '#1a1c20'); g.fill(); ink(g); for (let i = 0; i < 4; i++) { g.strokeStyle = i % 2 ? '#888' : c; g.lineWidth = 2; g.beginPath(); g.moveTo(14, 20 + i * 8); g.lineTo(50, 20 + i * 8); g.stroke(); } g.beginPath(); g.arc(32, 33, 9, 0, 7); g.fillStyle = rgr(g, 32, 33, 9, '#8ab0e0', '#101828'); g.fill(); }
};
IP.bottle = (g, c, r, n) => {
  const cap = ['#c0a040', '#202020', '#a02828', '#e8e8e8', '#2a6a3a'][Math.floor(r() * 5)], clear = /water|vodka|sake|tequila|gin|rum\b|white/.test(n);
  const liq = clear ? hmix(c, '#dfeef8', 0.5) : c;
  dshad(g, 32, 59, 14, 3);
  let body;
  if (/jug|bleach|maple|jerrycan/.test(n)) body = () => { rrect(g, 14, 18, 34, 40, 6); };
  else if (/wine|whisky|olive|mead|soy|shoyu|tequila|rum|vodka|sake/.test(n)) body = () => { g.beginPath(); g.moveTo(26, 6); g.lineTo(38, 6); g.lineTo(38, 18); g.quadraticCurveTo(46, 22, 46, 30); g.lineTo(46, 58); g.lineTo(18, 58); g.lineTo(18, 30); g.quadraticCurveTo(18, 22, 26, 18); g.closePath(); };
  else if (/tincture|extract|perfume|french|propolis|liquid_smoke|flavour/.test(n)) body = () => { rrect(g, 20, 26, 24, 32, 4); };
  else body = () => { g.beginPath(); g.moveTo(27, 10); g.lineTo(37, 10); g.lineTo(37, 16); g.quadraticCurveTo(44, 20, 44, 28); g.lineTo(44, 58); g.lineTo(20, 58); g.lineTo(20, 28); g.quadraticCurveTo(20, 20, 27, 16); g.closePath(); };
  body(); g.fillStyle = clear ? 'rgba(220,235,245,0.45)' : 'rgba(200,215,225,0.3)'; g.fill();
  g.save(); body(); g.clip(); g.fillStyle = lgr(g, 14, 0, 50, 0, hsh(liq, 0.75), hsh(liq, 1.2), hsh(liq, 0.7)); g.fillRect(0, 30, 64, 34);
  g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(22, 14, 3, 42); g.restore();
  body(); ink(g, 1.4);
  if (/jug|bleach|maple|jerrycan/.test(n)) { rrect(g, 20, 8, 10, 10, 2); g.fillStyle = cap; g.fill(); ink(g, 1); g.strokeStyle = '#555'; g.lineWidth = 3; g.beginPath(); g.moveTo(36, 18); g.quadraticCurveTo(46, 8, 46, 22); g.stroke(); }
  else if (/tincture|extract|perfume|french|propolis|liquid_smoke|flavour/.test(n)) { g.fillStyle = cap; g.fillRect(27, 16, 10, 10); g.beginPath(); g.arc(32, 14, 5, 0, 7); g.fill(); }
  else { g.fillStyle = cap; g.fillRect(25, 3, 14, 7); }
  g.fillStyle = '#f6f2e6'; g.fillRect(19, 38, 26, 12); g.fillStyle = hsh(c, 0.8); g.fillRect(21, 41, 22, 3); g.fillStyle = '#666'; g.fillRect(21, 46, 14, 1.5);
};
IP.paintcan = (g, c, r, n) => {
  dshad(g, 32, 58, 22, 3);
  g.fillStyle = lgr(g, 10, 0, 54, 0, '#9aa0a6', '#e8eaec', '#80868c'); g.fillRect(10, 18, 44, 38); ell(g, 32, 56, 22, 5); g.fill(); ink(g, 1);
  g.fillStyle = c; g.fillRect(10, 28, 44, 18); g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(14, 30, 6, 14);
  ell(g, 32, 18, 22, 6); g.fillStyle = '#c0c4c8'; g.fill(); ink(g, 1.2); ell(g, 32, 18, 17, 4); g.fillStyle = c; g.fill();
  g.strokeStyle = '#666'; g.lineWidth = 1.5; g.beginPath(); g.arc(32, 22, 24, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
  g.fillStyle = c; g.beginPath(); g.moveTo(44, 46); g.quadraticCurveTo(46, 54, 44, 58); g.quadraticCurveTo(41, 54, 44, 46); g.fill();
};
IP.can = (g, c, r, n) => {
  dshad(g, 32, 59, 16, 3);
  g.fillStyle = lgr(g, 16, 0, 48, 0, '#8a9096', '#e8eaec', '#7a8086'); g.fillRect(16, 12, 32, 44); ell(g, 32, 56, 16, 4); g.fill();
  g.fillStyle = lgr(g, 16, 0, 48, 0, hsh(c, 0.7), hsh(c, 1.3), hsh(c, 0.65)); g.fillRect(16, 18, 32, 34);
  g.fillStyle = hlum(c) > 140 ? '#333' : '#fff'; g.fillRect(20, 28, 18, 3); g.fillRect(20, 34, 12, 2);
  if (/fish|sardine|tomato|food/.test(n)) { g.fillStyle = '#f0ece0'; g.fillRect(20, 38, 24, 9); g.fillStyle = hsh(c, 0.7); ell(g, 32, 42.5, 8, 3); g.fill(); }
  ell(g, 32, 12, 16, 4); g.fillStyle = '#c8ccd0'; g.fill(); ink(g, 1);
  if (/beer|cola|drink|tea/.test(n)) { g.fillStyle = '#888'; ell(g, 34, 12, 5, 1.6); g.fill(); }
};
IP.cyl = (g, c, r, n) => {
  dshad(g, 32, 60, 14, 3);
  rrect(g, 20, 14, 24, 46, 8); g.fillStyle = lgr(g, 20, 0, 44, 0, '#6a7078', '#c8ccd0', '#5a6068'); g.fill(); ink(g);
  g.save(); rrect(g, 20, 14, 24, 46, 8); g.clip(); g.fillStyle = lgr(g, 20, 0, 44, 0, hsh(c, 0.7), hsh(c, 1.35), hsh(c, 0.6)); g.fillRect(20, 14, 24, 14); g.restore();
  g.fillStyle = '#7a6040'; g.fillRect(28, 8, 8, 7); g.fillStyle = '#c0a050'; g.fillRect(24, 4, 16, 5); ink(g, 1);
  g.fillStyle = '#f4f0e4'; g.fillRect(24, 34, 16, 10); g.fillStyle = hsh(c, 0.7); g.fillRect(26, 36, 12, 2); g.fillRect(26, 40, 8, 1.5);
};
IP.drum = (g, c, r, n) => {
  const oak = /oak|cask/.test(n) && !/dry/.test(n), conc = /dry_cask/.test(n), haz = /waste|he_|du_|residue|ammonal|octanol/.test(n);
  dshad(g, 32, 59, 22, 4);
  const b = oak ? '#9a6a3a' : conc ? '#b8b4ac' : c;
  if (oak) { g.beginPath(); g.moveTo(14, 12); g.quadraticCurveTo(6, 34, 14, 56); g.lineTo(50, 56); g.quadraticCurveTo(58, 34, 50, 12); g.closePath(); g.fillStyle = lgr(g, 8, 0, 56, 0, hsh(b, 0.7), hsh(b, 1.25), hsh(b, 0.6)); g.fill(); ink(g); g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; for (let x = 18; x < 50; x += 5) { g.beginPath(); g.moveTo(x, 12); g.quadraticCurveTo(x + (x - 32) * 0.3, 34, x, 56); g.stroke(); } g.fillStyle = '#3a3a3a'; for (const y of [18, 48]) { g.fillRect(9, y, 46, 3); } ell(g, 32, 12, 18, 4); g.fillStyle = '#b0804a'; g.fill(); ink(g, 1); return; }
  g.fillStyle = lgr(g, 12, 0, 52, 0, hsh(b, 0.65), hsh(b, 1.3), hsh(b, 0.6)); g.fillRect(12, 14, 40, 42); ell(g, 32, 56, 20, 5); g.fill(); ink(g, 1);
  g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 1.5; for (const y of [26, 42]) { g.beginPath(); g.ellipse(32, y, 20, 5, 0, 0, Math.PI); g.stroke(); }
  ell(g, 32, 14, 20, 5); g.fillStyle = hsh(b, 1.15); g.fill(); ink(g, 1.2); g.fillStyle = '#333'; ell(g, 40, 14, 3, 1.2); g.fill();
  if (haz) { poly(g, [32, 28, 40, 36, 32, 44, 24, 36]); g.fillStyle = '#f0c020'; g.fill(); ink(g, 1); g.fillStyle = '#222'; g.fillRect(31, 32, 2, 6); g.fillRect(31, 39.5, 2, 2); }
  if (conc) { g.fillStyle = '#e8c020'; g.beginPath(); g.arc(32, 36, 7, 0, 7); g.fill(); g.fillStyle = '#222'; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(32, 36); g.arc(32, 36, 6, i * 2.09 - 0.5, i * 2.09 + 0.5); g.fill(); } }
};
IP.vial = (g, c, r, n) => {
  const capc = ['#e04a4a', '#3a7ad0', '#f0c030', '#40a060', '#a050c0'][Math.floor(r() * 5)];
  dshad(g, 32, 58, 24, 3);
  if (/pen\b|pens|needle/.test(n)) { g.save(); g.translate(32, 32); g.rotate(-0.7); rrect(g, -26, -6, 44, 12, 5); g.fillStyle = lgr(g, 0, -6, 0, 6, '#f4f4f4', '#b8bcc0'); g.fill(); ink(g); g.fillStyle = capc; g.fillRect(10, -6, 8, 12); g.fillStyle = 'rgba(160,210,240,0.7)'; g.fillRect(-14, -3, 14, 6); g.fillStyle = '#888'; g.fillRect(18, -1, 9, 2); g.restore(); return; }
  for (let i = 0; i < 3; i++) {
    const x = 10 + i * 16; rrect(g, x, 20, 12, 36, 3); g.fillStyle = 'rgba(220,235,245,0.45)'; g.fill();
    g.fillStyle = lgr(g, x, 0, x + 12, 0, hsh(c, 0.8), hsh(c, 1.3)); g.fillRect(x + 1, 34, 10, 21); rrect(g, x, 20, 12, 36, 3); ink(g, 1);
    g.fillStyle = '#c8ccd0'; g.fillRect(x - 1, 15, 14, 6); g.fillStyle = capc; g.fillRect(x + 1, 11, 10, 5);
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(x + 2, 22, 2, 30);
  }
};
IP.pack = (g, c, r, n) => {
  const cap = /cap|softgel|gel/.test(n);
  dshad(g, 32, 56, 26, 4);
  rrect(g, 6, 12, 52, 40, 4); g.fillStyle = lgr(g, 6, 12, 58, 52, '#f2f4f6', '#a8aeb4'); g.fill(); ink(g);
  for (let j = 0; j < 3; j++) for (let i = 0; i < 4; i++) {
    const x = 14 + i * 12, y = 20 + j * 12;
    ell(g, x, y, cap ? 5 : 4.5, cap ? 3 : 4.5); g.fillStyle = 'rgba(255,255,255,0.6)'; g.fill(); g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 1; g.stroke();
    ell(g, x, y, cap ? 4 : 3.5, cap ? 2.2 : 3.5); g.fillStyle = cap && /softgel|omega|fish|d3|lycopene/.test(n) ? 'rgba(220,170,40,0.9)' : c; g.fill();
    if (!cap) { g.strokeStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.moveTo(x - 2.5, y); g.lineTo(x + 2.5, y); g.stroke(); }
  }
};
IP.box = (g, c, r, n) => {
  const kr = /egg_box|boxed_egg|punnet/.test(n) ? '#b8b8b0' : '#c8a070';
  dshad(g, 32, 58, 26, 4);
  poly(g, [8, 26, 40, 26, 40, 56, 8, 56]); g.fillStyle = lgr(g, 8, 0, 40, 0, hsh(kr, 1.1), hsh(kr, 0.9)); g.fill(); ink(g, 1.2);
  poly(g, [40, 26, 56, 16, 56, 46, 40, 56]); g.fillStyle = hsh(kr, 0.72); g.fill(); ink(g, 1.2);
  poly(g, [8, 26, 24, 16, 56, 16, 40, 26]); g.fillStyle = hsh(kr, 1.2); g.fill(); ink(g, 1.2);
  g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2; g.beginPath(); g.moveTo(16, 21); g.lineTo(48, 21); g.stroke();
  g.fillStyle = c; g.fillRect(12, 32, 24, 16); g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1; g.strokeRect(12, 32, 24, 16);
  g.fillStyle = hlum(c) > 140 ? '#333' : '#fff'; g.fillRect(15, 36, 14, 2.5); g.fillRect(15, 41, 9, 2);
};
IP.catalyst = (g, c, r, n) => {
  dshad(g, 32, 56, 24, 4);
  if (/cordierite|converter|honeycomb/.test(n)) {
    rrect(g, 10, 12, 44, 40, /converter/.test(n) ? 12 : 3); g.fillStyle = /converter/.test(n) ? lgr(g, 10, 0, 54, 0, '#7a8088', '#d8dce0', '#6a7078') : hmix(c, '#e8e0d0', 0.4); g.fill(); ink(g);
    g.save(); rrect(g, 14, 16, 36, 32, 2); g.clip(); g.fillStyle = hsh(hmix(c, '#e8e0d0', 0.4), 0.85); g.fillRect(14, 16, 36, 32); g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; for (let i = 0; i < 40; i += 3.5) { g.beginPath(); g.moveTo(14 + i, 16); g.lineTo(14 + i, 48); g.moveTo(14, 16 + i); g.lineTo(50, 16 + i); g.stroke(); } g.restore(); return;
  }
  if (/gauze/.test(n)) { g.strokeStyle = hsh(c, 1.2); g.lineWidth = 1.2; rrect(g, 8, 10, 48, 44, 4); g.fillStyle = 'rgba(0,0,0,0.12)'; g.fill(); for (let i = 10; i < 56; i += 3) { g.beginPath(); g.moveTo(i, 10); g.lineTo(i, 54); g.moveTo(8, i); g.lineTo(56, i); g.stroke(); } return; }
  const ring = /ring|v_cat|fe_cat|como|cu_cat|ag_cat/.test(n), ps = [];
  for (let i = 0; i < 14; i++) { const a = r() * 6.28, d = Math.sqrt(r()); ps.push([32 + Math.cos(a) * d * 20, 42 + Math.sin(a) * d * 8 - (1 - d) * 16]); }
  ps.sort((a, b) => a[1] - b[1]);
  for (const [x, y] of ps) {
    if (ring) { ell(g, x, y, 6.5, 4.5); g.fillStyle = rgr(g, x, y, 6, hsh(c, 1.4), hsh(c, 0.7)); g.fill(); ink(g, 0.8); ell(g, x, y - 0.5, 2.5, 1.6); g.fillStyle = '#1a1a1a'; g.fill(); }
    else { g.beginPath(); g.arc(x, y, 4.5, 0, 7); g.fillStyle = rgr(g, x, y, 4.5, hsh(c, 1.5), hsh(c, 0.7)); g.fill(); ink(g, 0.7); }
  }
};
IP.brick = (g, c, r, n) => {
  dshad(g, 32, 56, 27, 4);
  const blk = (x, y, w, h, d) => {
    poly(g, [x, y, x + w, y, x + w, y + h, x, y + h]); g.fillStyle = lgr(g, 0, y, 0, y + h, c, hsh(c, 0.7)); g.fill(); ink(g, 1);
    poly(g, [x, y, x + d, y - d * 0.6, x + w + d, y - d * 0.6, x + w, y]); g.fillStyle = hsh(c, 1.3); g.fill(); ink(g, 1);
    poly(g, [x + w, y, x + w + d, y - d * 0.6, x + w + d, y + h - d * 0.6, x + w, y + h]); g.fillStyle = hsh(c, 0.55); g.fill(); ink(g, 1);
    g.fillStyle = 'rgba(0,0,0,0.12)'; for (let i = 0; i < 10; i++) g.fillRect(x + r() * w, y + r() * h, 1.5, 1.5);
  };
  if (/tile|paver/.test(n)) { for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { rrect(g, 10 + i * 23, 12 + j * 21, 20, 18, 2); g.fillStyle = lgr(g, 0, 12 + j * 21, 0, 30 + j * 21, hsh(c, 1.25), hsh(c, 0.8)); g.fill(); ink(g, 1); } return; }
  if (/precast|sleeper|rail_bar|beam|frog/.test(n)) { blk(6, 30, 46, 12, 8); if (/rail|frog/.test(n)) { g.fillStyle = '#5a5e64'; g.fillRect(6, 24, 46, 6); } return; }
  if (/concrete|block/.test(n)) { blk(10, 26, 38, 26, 8); g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(16, 31, 10, 16); g.fillRect(32, 31, 10, 16); return; }
  blk(6, 40, 24, 12, 6); blk(32, 40, 22, 12, 6); blk(18, 25, 24, 12, 6);
};
IP.fruit = (g, c, r, n) => {
  dshad(g, 32, 56, 24, 4);
  const sph = (x, y, R, col) => { g.beginPath(); g.arc(x, y, R, 0, 7); g.fillStyle = rgr(g, x, y, R, hsh(col, 1.45), hsh(col, 0.7)); g.fill(); ink(g, 1); };
  if (/banana|plantain/.test(n)) { const col = /ripe|chips|baby|flour/.test(n) ? '#e8c840' : /green|boxed|bunch/.test(n) ? '#8ab040' : c; for (let i = 0; i < 4; i++) { g.save(); g.translate(32, 50); g.rotate(-0.5 + i * 0.3); g.beginPath(); g.moveTo(-2, 0); g.quadraticCurveTo(-18, -24, -4, -42); g.quadraticCurveTo(-10, -22, 4, 0); g.closePath(); g.fillStyle = lgr(g, -14, 0, 4, 0, hsh(col, 0.75), hsh(col, 1.25)); g.fill(); ink(g, 1); g.restore(); } g.fillStyle = '#5a4020'; g.fillRect(29, 48, 6, 8); return; }
  if (/grape/.test(n)) { const col = c; for (let j = 0; j < 5; j++) for (let i = 0; i <= 4 - j; i++) sph(32 - (4 - j) * 4.5 + i * 9, 18 + j * 8, 5.5, col); g.strokeStyle = '#5a4020'; g.lineWidth = 2; g.beginPath(); g.moveTo(32, 14); g.lineTo(34, 4); g.stroke(); return; }
  if (/olive/.test(n)) { for (let i = 0; i < 7; i++) { const x = 14 + r() * 36, y = 24 + r() * 24; ell(g, x, y, 7, 5, r() * 3); g.fillStyle = rgr(g, x, y, 7, hsh(c, 1.5), hsh(c, 0.7)); g.fill(); ink(g, 1); } return; }
  if (/coconut/.test(n)) { sph(32, 34, 20, '#7a5030'); g.strokeStyle = 'rgba(200,160,110,0.5)'; g.lineWidth = 1; for (let i = 0; i < 30; i++) { const a = r() * 6.28, d = r() * 18; g.beginPath(); g.moveTo(32 + Math.cos(a) * d, 34 + Math.sin(a) * d); g.lineTo(32 + Math.cos(a) * d + 3, 34 + Math.sin(a) * d + 2); g.stroke(); } g.fillStyle = '#2a1a10'; for (const [x, y] of [[28, 26], [36, 26], [32, 32]]) { g.beginPath(); g.arc(x, y, 2, 0, 7); g.fill(); } return; }
  if (/potato/.test(n)) { for (const [x, y, a] of [[22, 40, 0.3], [40, 38, -0.4], [31, 26, 0.1]]) { ell(g, x, y, 13, 9, a); g.fillStyle = rgr(g, x, y, 13, hsh(c, 1.35), hsh(c, 0.65)); g.fill(); ink(g, 1); g.fillStyle = 'rgba(80,50,20,0.5)'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(x + (r() - 0.5) * 14, y + (r() - 0.5) * 8, 1, 0, 7); g.fill(); } } return; }
  if (/beet/.test(n)) { g.beginPath(); g.moveTo(32, 58); g.quadraticCurveTo(12, 40, 20, 26); g.quadraticCurveTo(32, 16, 44, 26); g.quadraticCurveTo(52, 40, 32, 58); g.fillStyle = rgr(g, 32, 36, 20, '#f4ece0', '#c8b898'); g.fill(); ink(g); g.fillStyle = '#4a8a3a'; for (let i = 0; i < 3; i++) { ell(g, 26 + i * 6, 14, 4, 10, -0.4 + i * 0.4); g.fill(); } return; }
  const k = /orange|tomato|coffee|cocoa|apple/.test(n) ? 3 : 2;
  const at = k === 3 ? [[20, 40, 12], [44, 40, 12], [32, 24, 12]] : [[24, 36, 15], [42, 40, 12]];
  for (const [x, y, R] of at) { if (/cocoa_beans|cocoa pod/.test(n)) { ell(g, x, y, R * 1.3, R * 0.7, 0.4); g.fillStyle = rgr(g, x, y, R, hsh(c, 1.4), hsh(c, 0.6)); g.fill(); ink(g, 1); } else sph(x, y, R, c); if (/orange/.test(n)) { g.fillStyle = 'rgba(0,0,0,0.12)'; for (let i = 0; i < 12; i++) { g.beginPath(); g.arc(x + (r() - 0.5) * R * 1.4, y + (r() - 0.5) * R * 1.4, 0.8, 0, 7); g.fill(); } } }
  if (/tomato|orange|apple/.test(n)) { g.fillStyle = '#3a8a2a'; const [x, y, R] = at[at.length - 1]; poly(g, [x, y - R - 2, x + 5, y - R + 2, x, y - R + 1, x - 5, y - R + 2]); g.fill(); }
};
IP.seeds = (g, c, r, n) => {
  dshad(g, 32, 54, 25, 5);
  const ps = []; for (let i = 0; i < 34; i++) { const a = r() * 6.28, d = Math.sqrt(r()); ps.push([32 + Math.cos(a) * d * 22, 44 + Math.sin(a) * d * 9 - (1 - d) * 18, r() * 3]); }
  ps.sort((a, b) => a[1] - b[1]);
  const big = /bean|nut|kernel|castor|coffee|cocoa|soy/.test(n);
  for (const [x, y, a] of ps) { ell(g, x, y, big ? 5 : 3.4, big ? 3.6 : 2.2, a); g.fillStyle = rgr(g, x, y, 4, hsh(c, 1.4), hsh(c, 0.7)); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 0.8; g.stroke(); if (big && /coffee|cocoa|soy/.test(n)) { g.beginPath(); g.moveTo(x - Math.cos(a) * 3, y - Math.sin(a) * 2); g.lineTo(x + Math.cos(a) * 3, y + Math.sin(a) * 2); g.stroke(); } }
};
IP.grain = (g, c, r, n) => {
  dshad(g, 32, 58, 20, 3);
  if (/maize|corn/.test(n)) { g.fillStyle = '#9ab060'; poly(g, [22, 58, 14, 20, 30, 50]); g.fill(); poly(g, [42, 58, 50, 20, 34, 50]); g.fill(); ell(g, 32, 32, 10, 24); g.fillStyle = '#e8c040'; g.fill(); ink(g, 1); g.fillStyle = 'rgba(160,110,0,0.35)'; for (let y = 12; y < 54; y += 4) for (let x = 25; x < 40; x += 4) { g.beginPath(); g.arc(x, y, 1.4, 0, 7); g.fill(); } return; }
  for (let s = 0; s < 3; s++) {
    const ox = 20 + s * 12, tw = (s - 1) * 0.15; g.strokeStyle = hsh(c, 0.8); g.lineWidth = 1.5; g.beginPath(); g.moveTo(ox + 4, 58); g.lineTo(ox, 18); g.stroke();
    for (let i = 0; i < 6; i++) for (const sd of [-1, 1]) { const y = 16 + i * 5; ell(g, ox + sd * 3.4, y, 2.4, 4.4, sd * 0.5 + tw); g.fillStyle = rgr(g, ox, y, 4, hsh(c, 1.35), hsh(c, 0.75)); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 0.7; g.stroke(); }
    if (/barley|rice|paddy/.test(n)) { g.strokeStyle = hsh(c, 0.9); g.lineWidth = 0.7; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(ox, 14 + i * 5); g.lineTo(ox + (r() - 0.5) * 10, 2 + i * 5); g.stroke(); } }
  }
};
IP.leaf = (g, c, r, n) => {
  dshad(g, 32, 56, 22, 4);
  const sea = /kelp|seaweed|cottonii|gracilaria/.test(n);
  for (let i = 0; i < 3; i++) {
    g.save(); g.translate(32 + (i - 1) * 9, 50); g.rotate((i - 1) * 0.45);
    if (sea) { g.beginPath(); g.moveTo(0, 0); for (let y = 0; y > -44; y -= 4) g.lineTo(Math.sin(y * 0.3) * 4 + 4, y); for (let y = -44; y < 0; y += 4) g.lineTo(Math.sin(y * 0.3) * 4 - 4, y); g.closePath(); }
    else { g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(14, -20, 0, -42); g.quadraticCurveTo(-14, -20, 0, 0); }
    g.fillStyle = lgr(g, -10, 0, 10, 0, hsh(c, 0.75), hsh(c, 1.3)); g.fill(); ink(g, 1);
    g.strokeStyle = hsh(c, 0.6); g.lineWidth = 1; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -40); g.stroke();
    if (!sea) for (let y = -8; y > -36; y -= 7) { g.beginPath(); g.moveTo(0, y); g.lineTo(6, y - 5); g.moveTo(0, y); g.lineTo(-6, y - 5); g.stroke(); }
    g.restore();
  }
};
IP.log = (g, c, r, n) => {
  dshad(g, 32, 56, 26, 4);
  if (/bamboo/.test(n)) { for (let i = 0; i < 4; i++) { const x = 12 + i * 11; g.fillStyle = lgr(g, x, 0, x + 9, 0, hsh(c, 0.8), hsh(c, 1.3), hsh(c, 0.75)); g.fillRect(x, 6, 9, 50); g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1; g.strokeRect(x, 6, 9, 50); for (let y = 14 + i * 3; y < 56; y += 14) { g.fillStyle = hsh(c, 0.6); g.fillRect(x - 1, y, 11, 2); } } return; }
  if (/straw|stalk|stem|flax|jute|sisal|abaca|cane|leaf|pseudostem/.test(n)) { for (let i = 0; i < 18; i++) { const x = 14 + i * 2 + (r() - 0.5) * 3; g.strokeStyle = r() < 0.5 ? c : hsh(c, 0.8); g.lineWidth = 2.4; g.beginPath(); g.moveTo(x, 6); g.quadraticCurveTo(x + (r() - 0.5) * 6, 32, x + (i - 9) * 0.6, 58); g.stroke(); } g.fillStyle = '#8a6a3a'; g.fillRect(12, 30, 40, 5); return; }
  const at = [[20, 44], [44, 44], [32, 26]];
  for (const [x, y] of at) {
    g.fillStyle = lgr(g, 0, y - 10, 0, y + 10, hsh(c, 1.1), hsh(c, 0.6)); g.fillRect(x - 20, y - 10, 20, 20);
    g.beginPath(); g.arc(x, y, 10, 0, 7); g.fillStyle = '#d8b880'; g.fill(); ink(g, 1.2);
    g.strokeStyle = 'rgba(120,80,40,0.6)'; g.lineWidth = 0.8; for (let k = 2; k < 10; k += 2.5) { g.beginPath(); g.arc(x, y, k, 0, 7); g.stroke(); }
  }
};
IP.animal = (g, c, r, n) => {
  dshad(g, 32, 56, 24, 4);
  if (/egg|cocoon|pupae/.test(n) && !/powder|breaker|grader/.test(n)) { const col = /cocoon/.test(n) ? '#f2eee0' : /pupae/.test(n) ? '#8a6a3a' : c; for (const [x, y] of [[22, 40], [42, 40], [32, 26]]) { ell(g, x, y, 9, 12); g.fillStyle = rgr(g, x, y, 12, hsh(col, 1.3), hsh(col, 0.75)); g.fill(); ink(g, 1); if (/cocoon/.test(n)) { g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 0.8; for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(x, y, 9, 12, k, 0, 3); g.stroke(); } } } return; }
  if (/chick\b|chicks|broiler/.test(n)) { const col = /broiler/.test(n) ? '#f2f0ea' : '#f0d040'; g.beginPath(); g.arc(28, 38, 15, 0, 7); g.arc(42, 24, 10, 0, 7); g.fillStyle = rgr(g, 32, 32, 20, hsh(col, 1.2), hsh(col, 0.8)); g.fill(); ink(g, 1); g.fillStyle = '#e08020'; poly(g, [51, 24, 58, 26, 51, 28]); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(45, 21, 1.6, 0, 7); g.fill(); if (/broiler/.test(n)) { g.fillStyle = '#d02020'; poly(g, [38, 14, 42, 10, 46, 14]); g.fill(); } return; }
  if (/fish|sardine/.test(n)) { g.beginPath(); g.moveTo(6, 32); g.quadraticCurveTo(26, 12, 46, 30); g.lineTo(58, 20); g.lineTo(56, 44); g.lineTo(46, 34); g.quadraticCurveTo(26, 52, 6, 32); g.fillStyle = lgr(g, 0, 18, 0, 46, hsh(c, 1.5), c, hsh(c, 0.75)); g.fill(); ink(g); g.fillStyle = '#111'; g.beginPath(); g.arc(14, 29, 2, 0, 7); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.arc(20, 32, 6, -1, 1); g.stroke(); return; }
  if (/chicken/.test(n)) { ell(g, 30, 36, 18, 14); g.fillStyle = rgr(g, 30, 36, 18, '#f8e8d0', '#d8b090'); g.fill(); ink(g); for (const s of [-1, 1]) { ell(g, 30 + s * 12, 50, 5, 8, s * 0.4); g.fill(); ink(g, 1); } return; }
  if (/bone/.test(n)) { for (const a of [-0.5, 0.4]) { g.save(); g.translate(32, 34); g.rotate(a); g.fillStyle = '#f0ead8'; g.fillRect(-18, -3.5, 36, 7); for (const x of [-20, 20]) for (const y of [-4, 4]) { g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); } g.strokeStyle = 'rgba(0,0,0,0.3)'; g.strokeRect(-18, -3.5, 36, 7); g.restore(); } return; }
  if (/feather/.test(n)) { g.save(); g.translate(32, 32); g.rotate(-0.6); ell(g, 0, 0, 9, 26); g.fillStyle = lgr(g, -9, 0, 9, 0, hsh(c, 0.85), hsh(c, 1.2)); g.fill(); ink(g, 1); g.strokeStyle = '#888'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, 30); g.lineTo(0, -26); g.stroke(); g.restore(); return; }
  if (/hide|pelt|wet_blue|leather/.test(n)) { g.beginPath(); g.moveTo(14, 10); g.lineTo(24, 16); g.lineTo(40, 16); g.lineTo(50, 10); g.lineTo(52, 26); g.lineTo(58, 34); g.lineTo(50, 40); g.lineTo(52, 56); g.lineTo(40, 50); g.lineTo(24, 50); g.lineTo(12, 56); g.lineTo(14, 40); g.lineTo(6, 34); g.lineTo(12, 26); g.closePath(); g.fillStyle = lgr(g, 8, 10, 56, 56, hsh(c, 1.25), c, hsh(c, 0.7)); g.fill(); ink(g); g.fillStyle = 'rgba(0,0,0,0.08)'; for (let i = 0; i < 30; i++) g.fillRect(14 + r() * 36, 18 + r() * 30, 2, 1); return; }
  ell(g, 32, 34, 22, 16, -0.15); g.fillStyle = rgr(g, 32, 34, 22, hsh(c, 1.3), hsh(c, 0.7)); g.fill(); ink(g);
  g.strokeStyle = 'rgba(255,240,230,0.7)'; g.lineWidth = 1.6; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(16 + r() * 8, 24 + i * 5); g.bezierCurveTo(26, 22 + i * 5 + r() * 6, 36, 28 + i * 4, 48, 24 + i * 5); g.stroke(); }
};
IP.food = (g, c, r, n) => {
  dshad(g, 32, 56, 24, 4);
  if (/chocolate|cocoa_butter/.test(n)) { g.save(); g.translate(32, 34); g.rotate(-0.25); rrect(g, -22, -14, 44, 28, 2); g.fillStyle = c; g.fill(); ink(g); for (let j = 0; j < 2; j++) for (let i = 0; i < 4; i++) { rrect(g, -20 + i * 10.5, -12 + j * 13, 9, 11, 1.5); g.fillStyle = hsh(c, 1.18); g.fill(); g.strokeStyle = hsh(c, 0.6); g.lineWidth = 0.8; g.stroke(); } g.fillStyle = '#c03030'; g.fillRect(6, -15, 17, 30); g.fillStyle = '#e8c040'; g.fillRect(6, -2, 17, 3); g.restore(); return; }
  if (/cheese/.test(n)) { poly(g, [8, 46, 56, 46, 56, 30, 18, 22]); g.fillStyle = hsh(c, 0.9); g.fill(); ink(g); poly(g, [8, 46, 18, 22, 18, 30, 8, 54]); poly(g, [8, 46, 56, 46, 56, 54, 8, 54]); g.fillStyle = c; g.fill(); ink(g); g.fillStyle = hsh(c, 0.75); for (const [x, y, R] of [[30, 36, 3], [44, 38, 2.5], [22, 50, 2]]) { g.beginPath(); g.arc(x, y, R, 0, 7); g.fill(); } return; }
  if (/bread|loaf/.test(n)) { g.beginPath(); g.moveTo(8, 50); g.lineTo(8, 32); g.quadraticCurveTo(8, 16, 32, 16); g.quadraticCurveTo(56, 16, 56, 32); g.lineTo(56, 50); g.closePath(); g.fillStyle = lgr(g, 0, 16, 0, 50, '#e0a050', '#9a5a20'); g.fill(); ink(g); g.strokeStyle = 'rgba(255,230,180,0.6)'; g.lineWidth = 2; for (const x of [20, 32, 44]) { g.beginPath(); g.moveTo(x - 4, 24); g.lineTo(x + 4, 30); g.stroke(); } return; }
  if (/candle|crayon|lipstick|balm/.test(n)) { const k = /crayon/.test(n) ? 5 : /lipstick|balm/.test(n) ? 1 : 3; for (let i = 0; i < k; i++) { const w = k === 5 ? 7 : k === 1 ? 14 : 10, x = 32 - k * (w + 2) / 2 + i * (w + 2), col = k === 5 ? ['#e04040', '#3a7ad0', '#f0c030', '#40a060', '#a050c0'][i] : c; if (k === 1) { g.fillStyle = '#c8b050'; g.fillRect(x, 32, w, 24); g.fillStyle = col; g.fillRect(x + 2, 14, w - 4, 20); poly(g, [x + 2, 14, x + w - 2, 8, x + w - 2, 14]); g.fill(); ink(g, 1); continue; } g.fillStyle = lgr(g, x, 0, x + w, 0, hsh(col, 0.8), hsh(col, 1.3)); g.fillRect(x, 22, w, 34); g.strokeStyle = 'rgba(0,0,0,0.45)'; g.strokeRect(x, 22, w, 34); if (k === 5) { poly(g, [x, 22, x + w / 2, 12, x + w, 22]); g.fill(); } else { g.strokeStyle = '#333'; g.beginPath(); g.moveTo(x + w / 2, 22); g.lineTo(x + w / 2, 17); g.stroke(); g.fillStyle = '#f0a020'; ell(g, x + w / 2, 12, 2.5, 5); g.fill(); g.fillStyle = '#fff4a0'; ell(g, x + w / 2, 13, 1.2, 2.5); g.fill(); } } return; }
  if (/gumm|gum\b|sugarfree/.test(n)) { for (let i = 0; i < 7; i++) { const x = 12 + r() * 40, y = 20 + r() * 30, col = ['#e04040', '#f0c030', '#40b060', '#f08030', c][i % 5]; g.fillStyle = col; g.globalAlpha = 0.85; g.beginPath(); g.arc(x, y - 5, 4, 0, 7); g.arc(x, y + 2, 5.5, 0, 7); g.fill(); g.globalAlpha = 1; ink(g, 0.8); } return; }
  if (/crisps|fries|chips/.test(n)) { rrect(g, 12, 10, 40, 46, 6); g.fillStyle = lgr(g, 12, 0, 52, 0, hsh(c, 0.8), hsh(c, 1.3), hsh(c, 0.7)); g.fill(); ink(g); g.fillStyle = '#f0c850'; for (let i = 0; i < 4; i++) { ell(g, 22 + i * 7, 34 + (i % 2) * 4, 7, 4, r()); g.fill(); ink(g, 0.6); } g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(16, 12, 4, 40); return; }
  if (/margarine|butter|miso|tub|mayonnaise|ketchup|paste|ice_cream/.test(n)) { g.fillStyle = lgr(g, 10, 0, 54, 0, hsh(c, 0.8), hsh(c, 1.25), hsh(c, 0.75)); poly(g, [12, 24, 52, 24, 48, 54, 16, 54]); g.fill(); ink(g); ell(g, 32, 24, 20, 6); g.fillStyle = '#f4f4f0'; g.fill(); ink(g, 1.2); g.fillStyle = hsh(c, 0.85); ell(g, 32, 23, 12, 3); g.fill(); return; }
  rrect(g, 10, 22, 44, 26, 6); g.fillStyle = lgr(g, 0, 22, 0, 48, hsh(c, 1.35), c, hsh(c, 0.7)); g.fill(); ink(g);
  g.fillStyle = 'rgba(255,255,255,0.4)'; rrect(g, 14, 25, 20, 5, 2.5); g.fill();
  if (/soap/.test(n)) { g.fillStyle = 'rgba(255,255,255,0.6)'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(44 + r() * 10, 14 + r() * 10, 2 + r() * 2.5, 0, 7); g.fill(); } }
};
IP.vest = (g, c, r, n) => {
  dshad(g, 32, 58, 22, 3);
  if (/tile/.test(n)) { poly(g, [32, 8, 54, 20, 54, 44, 32, 56, 10, 44, 10, 20]); g.fillStyle = lgr(g, 10, 8, 54, 56, hsh(c, 1.35), c, hsh(c, 0.65)); g.fill(); ink(g, 1.5); poly(g, [32, 16, 46, 24, 46, 40, 32, 48, 18, 40, 18, 24]); g.strokeStyle = 'rgba(255,255,255,0.3)'; g.stroke(); return; }
  if (/respirator/.test(n)) { g.beginPath(); g.moveTo(14, 26); g.quadraticCurveTo(32, 10, 50, 26); g.quadraticCurveTo(52, 44, 32, 50); g.quadraticCurveTo(12, 44, 14, 26); g.fillStyle = lgr(g, 14, 14, 50, 50, '#5a6068', '#2a2e34'); g.fill(); ink(g); for (const x of [10, 54]) { g.beginPath(); g.arc(x, 42, 9, 0, 7); g.fillStyle = c; g.fill(); ink(g); g.strokeStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.arc(x, 42, 5, 0, 7); g.stroke(); } g.strokeStyle = '#222'; g.lineWidth = 2; g.beginPath(); g.moveTo(14, 26); g.lineTo(4, 14); g.moveTo(50, 26); g.lineTo(60, 14); g.stroke(); return; }
  poly(g, [18, 6, 26, 6, 32, 14, 38, 6, 46, 6, 52, 18, 52, 56, 12, 56, 12, 18]); g.fillStyle = lgr(g, 12, 6, 52, 56, hsh(c, 1.25), c, hsh(c, 0.6)); g.fill(); ink(g, 1.5);
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(18, 22, 28, 22); g.strokeStyle = 'rgba(255,255,255,0.25)'; g.strokeRect(18, 22, 28, 22);
  g.fillStyle = '#2a2e34'; g.fillRect(12, 46, 40, 4);
};
IP.ammo = (g, c, r, n) => {
  dshad(g, 32, 58, 24, 3);
  if (/he shell|wp shell|^shell|wp_shell/.test(n) && !/vest|crawler/.test(n)) { g.beginPath(); g.moveTo(22, 58); g.lineTo(22, 24); g.quadraticCurveTo(22, 8, 32, 4); g.quadraticCurveTo(42, 8, 42, 24); g.lineTo(42, 58); g.closePath(); g.fillStyle = lgr(g, 22, 0, 42, 0, hsh(c, 0.7), hsh(c, 1.3), hsh(c, 0.65)); g.fill(); ink(g); g.fillStyle = '#c0a050'; g.fillRect(21, 46, 22, 5); g.fillStyle = '#f0d020'; g.fillRect(22, 30, 20, 3); return; }
  if (/charge|tnt|ammonal\b|black_powder|blasting/.test(n)) { for (let i = 0; i < 3; i++) { rrect(g, 10 + i * 15, 14, 13, 42, 3); g.fillStyle = lgr(g, 10 + i * 15, 0, 23 + i * 15, 0, hsh(c, 0.8), hsh(c, 1.3)); g.fill(); ink(g, 1); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(10 + i * 15, 24, 13, 2); g.fillRect(10 + i * 15, 44, 13, 2); } g.strokeStyle = '#444'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(31, 14); g.quadraticCurveTo(36, 4, 46, 6); g.stroke(); return; }
  const hull = /shotshell/.test(n) ? '#c03030' : '#c8a040';
  for (let i = 0; i < 4; i++) { const x = 11 + i * 12; g.fillStyle = lgr(g, x, 0, x + 9, 0, hsh(hull, 0.75), hsh(hull, 1.35)); g.fillRect(x, 26, 9, 30); g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1; g.strokeRect(x, 26, 9, 30); g.fillStyle = '#c8a040'; g.fillRect(x - 0.5, 50, 10, 6); g.fillStyle = /shotshell/.test(n) ? hsh(hull, 0.8) : lgr(g, x, 0, x + 9, 0, hsh(c, 0.8), hsh(c, 1.5)); g.beginPath(); g.moveTo(x, 26); if (/shotshell/.test(n)) g.lineTo(x + 9, 26); else g.quadraticCurveTo(x + 4.5, 6, x + 9, 26); g.closePath(); g.fill(); g.stroke(); }
};
IP.gun = (g, c, r, n) => {
  g.save(); g.translate(32, 34); g.rotate(-0.35);
  g.fillStyle = '#3a3e44'; g.fillRect(-28, -6, 50, 5); g.fillStyle = '#2a2e34'; g.fillRect(-26, -1, 40, 4);
  g.fillStyle = '#8a5a30'; g.fillRect(-14, 3, 14, 5); poly(g, [14, -6, 30, -2, 32, 8, 22, 8, 12, 2]); g.fill(); ink(g, 1);
  g.fillStyle = '#222'; g.fillRect(4, 2, 3, 7); g.restore();
};
IP.wheel = (g, c, r, n) => {
  const bike = /bike|bicycle/.test(n);
  dshad(g, 32, 58, 22, 3);
  g.beginPath(); g.arc(32, 32, 26, 0, 7); g.fillStyle = '#1e1e20'; g.fill();
  g.beginPath(); g.arc(32, 32, bike ? 23 : 17, 0, 7); g.fillStyle = bike ? 'rgba(0,0,0,0)' : lgr(g, 14, 14, 50, 50, '#e0e4e8', '#7a8086'); g.fill();
  if (bike) { g.save(); g.beginPath(); g.arc(32, 32, 23, 0, 7); g.clip(); g.clearRect(0, 0, 64, 64); g.restore(); g.strokeStyle = '#c8ccd0'; g.lineWidth = 2; g.beginPath(); g.arc(32, 32, 22, 0, 7); g.stroke(); g.lineWidth = 0.7; for (let i = 0; i < 16; i++) { const a = i / 16 * 6.28; g.beginPath(); g.moveTo(32, 32); g.lineTo(32 + Math.cos(a) * 21, 32 + Math.sin(a) * 21); g.stroke(); } g.fillStyle = '#888'; g.beginPath(); g.arc(32, 32, 3, 0, 7); g.fill(); }
  else { ink(g, 1); g.fillStyle = '#4a4e54'; for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28; g.beginPath(); g.arc(32 + Math.cos(a) * 9, 32 + Math.sin(a) * 9, 2.2, 0, 7); g.fill(); } g.beginPath(); g.arc(32, 32, 4, 0, 7); g.fill(); }
  g.strokeStyle = '#3a3a3c'; g.lineWidth = 2; for (let i = 0; i < 24; i++) { const a = i / 24 * 6.28; g.beginPath(); g.moveTo(32 + Math.cos(a) * 24, 32 + Math.sin(a) * 24); g.lineTo(32 + Math.cos(a) * 26.5, 32 + Math.sin(a) * 26.5); g.stroke(); }
  if (/tyre/.test(n) && !bike) { g.beginPath(); g.arc(32, 32, 17, 0, 7); g.fillStyle = '#d8d8d0'; g.globalCompositeOperation = 'destination-out'; g.fill(); g.globalCompositeOperation = 'source-over'; }
};
IP.bike = (g, c, r, n) => {
  g.strokeStyle = '#1e1e20'; g.lineWidth = 3; for (const x of [14, 50]) { g.beginPath(); g.arc(x, 42, 12, 0, 7); g.stroke(); }
  g.strokeStyle = /bamboo/.test(n) ? '#c8a050' : c; g.lineWidth = 3; g.lineCap = 'round';
  g.beginPath(); g.moveTo(14, 42); g.lineTo(26, 24); g.lineTo(44, 24); g.lineTo(50, 42); g.moveTo(26, 24); g.lineTo(32, 42); g.lineTo(14, 42); g.moveTo(32, 42); g.lineTo(44, 24); g.moveTo(44, 24); g.lineTo(42, 16); g.lineTo(48, 14); g.moveTo(26, 24); g.lineTo(24, 18); g.stroke();
  g.fillStyle = '#222'; g.fillRect(19, 15, 10, 3); g.lineCap = 'butt';
  if (/ebike/.test(n)) { g.fillStyle = '#3a3e44'; g.save(); g.translate(30, 33); g.rotate(-1); g.fillRect(-6, -2.5, 12, 5); g.restore(); }
  if (/frame/.test(n)) { g.clearRect(0, 30, 6, 30); g.clearRect(58, 30, 6, 30); }
};
IP.vehicle = (g, c, r, n) => {
  dshad(g, 32, 56, 28, 3);
  if (/fork/.test(n)) { rrect(g, 14, 22, 30, 26, 3); g.fillStyle = c; g.fill(); ink(g); g.fillStyle = '#9ad0f0'; g.fillRect(18, 26, 12, 10); g.fillStyle = '#333'; g.fillRect(44, 10, 3, 42); g.fillRect(44, 48, 16, 3); for (const x of [20, 38]) { g.beginPath(); g.arc(x, 50, 6, 0, 7); g.fill(); } return; }
  rrect(g, 4, 16, 56, 32, 4); g.fillStyle = lgr(g, 0, 16, 0, 48, hsh(c, 1.3), c, hsh(c, 0.7)); g.fill(); ink(g);
  g.fillStyle = '#9ad0f0'; for (let x = 8; x < 54; x += 9) g.fillRect(x, 20, 7, 10); g.fillStyle = '#e8e8e0'; g.fillRect(4, 36, 56, 3);
  g.fillStyle = '#1e1e20'; for (const x of [14, 48]) { g.beginPath(); g.arc(x, 48, 6, 0, 7); g.fill(); }
};
IP.device = (g, c, r, n) => {
  dshad(g, 32, 58, 22, 3);
  if (/smartphone|phone/.test(n)) { rrect(g, 18, 4, 28, 54, 5); g.fillStyle = '#1a1c1e'; g.fill(); ink(g); rrect(g, 20, 8, 24, 44, 2); g.fillStyle = lgr(g, 20, 8, 44, 52, '#4a8ad8', '#8a4ac8'); g.fill(); g.fillStyle = 'rgba(255,255,255,0.25)'; poly(g, [20, 8, 34, 8, 20, 30]); g.fill(); return; }
  if (/television|lcd_module|lcd_cell|display/.test(n)) { rrect(g, 4, 10, 56, 36, 3); g.fillStyle = '#18191b'; g.fill(); ink(g); g.fillStyle = lgr(g, 6, 12, 58, 44, '#2a6ab0', '#60c0e0', '#2a4a80'); g.fillRect(7, 13, 50, 30); if (/television/.test(n)) { g.fillStyle = '#333'; g.fillRect(28, 46, 8, 6); g.fillRect(18, 52, 28, 3); } return; }
  if (/watch|movement/.test(n)) { if (!/movement/.test(n)) { g.fillStyle = /gold/.test(n) ? '#6a3a20' : '#2a2e34'; g.fillRect(24, 2, 16, 60); } g.beginPath(); g.arc(32, 32, 17, 0, 7); g.fillStyle = /gold|mech/.test(n) ? '#d8b040' : '#c8ccd0'; g.fill(); ink(g); g.beginPath(); g.arc(32, 32, 14, 0, 7); g.fillStyle = /movement/.test(n) ? '#b8a070' : '#f6f4ee'; g.fill(); if (/movement|mech/.test(n)) { g.fillStyle = '#c03030'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(32 + Math.cos(i) * 8, 32 + Math.sin(i * 1.7) * 8, 1.4, 0, 7); g.fill(); } } g.strokeStyle = '#222'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(32, 32); g.lineTo(32, 22); g.moveTo(32, 32); g.lineTo(39, 35); g.stroke(); return; }
  if (/lamp|led_lamp/.test(n)) { g.beginPath(); g.arc(32, 24, 16, 0, 7); g.fillStyle = rgr(g, 32, 24, 16, '#ffffff', '#e8f0ff'); g.fill(); ink(g); g.fillStyle = '#c8ccd0'; g.fillRect(25, 38, 14, 10); g.fillStyle = '#888'; for (let y = 40; y < 48; y += 2.5) g.fillRect(25, y, 14, 1); g.fillStyle = '#8a7a50'; g.fillRect(28, 48, 8, 6); return; }
  if (/mri|scanner/.test(n)) { rrect(g, 6, 8, 52, 44, 10); g.fillStyle = lgr(g, 0, 8, 0, 52, '#f4f6f8', '#c0c6cc'); g.fill(); ink(g); g.beginPath(); g.arc(32, 30, 13, 0, 7); g.fillStyle = '#2a3038'; g.fill(); g.fillStyle = '#e8eaec'; g.fillRect(14, 44, 36, 6); g.fillStyle = c; g.fillRect(10, 12, 44, 3); return; }
  if (/pen/.test(n)) return IP.vial(g, c, r, n);
  rrect(g, 10, 12, 44, 40, 5); g.fillStyle = lgr(g, 0, 12, 0, 52, hsh(c, 1.3), c, hsh(c, 0.6)); g.fill(); ink(g);
  g.fillStyle = '#18303a'; g.fillRect(16, 18, 20, 12); g.fillStyle = '#5fe0a0'; g.fillRect(18, 21, 10, 2); g.fillRect(18, 25, 14, 2);
  g.fillStyle = '#333'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(44, 20 + i * 8, 3, 0, 7); g.fill(); }
  g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; for (let y = 36; y < 50; y += 3) { g.beginPath(); g.moveTo(16, y); g.lineTo(48, y); g.stroke(); }
};
IP.part = (g, c, r, n) => {
  dshad(g, 32, 58, 24, 3);
  const m = hlum(c) < 50 ? hsh(c, 1.8) : c;
  if (/drill_bit/.test(n)) { g.fillStyle = lgr(g, 26, 0, 38, 0, '#6a7078', '#c8ccd0', '#5a6068'); g.fillRect(28, 4, 8, 40); g.strokeStyle = 'rgba(0,0,0,0.4)'; for (let y = 8; y < 42; y += 4) { g.beginPath(); g.moveTo(28, y); g.lineTo(36, y + 3); g.stroke(); } g.beginPath(); g.arc(32, 48, 12, 0, 7); g.fillStyle = '#7a8088'; g.fill(); ink(g); g.fillStyle = '#2a2e34'; for (let i = 0; i < 7; i++) { g.beginPath(); g.arc(32 + Math.cos(i) * 8, 48 + Math.sin(i) * 8, 2, 0, 7); g.fill(); } return; }
  if (/insert/.test(n)) { poly(g, [32, 8, 56, 50, 8, 50]); g.fillStyle = lgr(g, 8, 8, 56, 50, '#9aa0a8', '#3a3e44'); g.fill(); ink(g, 1.5); g.beginPath(); g.arc(32, 36, 5, 0, 7); g.fillStyle = '#1a1a1a'; g.fill(); g.fillStyle = '#d8b050'; poly(g, [32, 8, 36, 16, 28, 16]); g.fill(); return; }
  if (/grinding|disc|turbine_disc/.test(n)) { g.beginPath(); g.arc(32, 32, 25, 0, 7); g.fillStyle = rgr(g, 32, 32, 25, hsh(m, 1.4), hsh(m, 0.65)); g.fill(); ink(g); if (/grinding/.test(n)) { g.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < 80; i++) { const a = r() * 6.28, d = 8 + r() * 16; g.fillRect(32 + Math.cos(a) * d, 32 + Math.sin(a) * d, 1.5, 1.5); } } else { g.strokeStyle = 'rgba(0,0,0,0.5)'; for (let i = 0; i < 24; i++) { const a = i / 24 * 6.28; g.beginPath(); g.moveTo(32 + Math.cos(a) * 21, 32 + Math.sin(a) * 21); g.lineTo(32 + Math.cos(a) * 25, 32 + Math.sin(a) * 25); g.stroke(); } } g.beginPath(); g.arc(32, 32, 6, 0, 7); g.fillStyle = '#151515'; g.fill(); return; }
  if (/blade|propeller/.test(n)) { const k = /propeller/.test(n) ? 3 : /fan_blade/.test(n) ? 1 : 1; if (k === 3) { for (let i = 0; i < 3; i++) { g.save(); g.translate(32, 32); g.rotate(i * 2.09); ell(g, 0, -15, 7, 15, 0.3); g.fillStyle = lgr(g, -7, 0, 7, 0, hsh(m, 1.4), hsh(m, 0.7)); g.fill(); ink(g, 1); g.restore(); } g.beginPath(); g.arc(32, 32, 6, 0, 7); g.fillStyle = hsh(m, 0.8); g.fill(); ink(g); return; } g.save(); g.translate(32, 32); g.rotate(-0.8); g.beginPath(); g.moveTo(-6, 26); g.quadraticCurveTo(-12, 0, -3, -28); g.quadraticCurveTo(10, -10, 6, 26); g.closePath(); g.fillStyle = lgr(g, -10, 0, 10, 0, hsh(m, 1.45), m, hsh(m, 0.6)); g.fill(); ink(g); g.fillStyle = '#6a7078'; g.fillRect(-8, 22, 16, 8); g.restore(); return; }
  if (/key/.test(n)) { g.beginPath(); g.arc(18, 32, 11, 0, 7); g.fillStyle = lgr(g, 0, 20, 0, 44, hsh(m, 1.4), hsh(m, 0.7)); g.fill(); ink(g); g.beginPath(); g.arc(15, 32, 3.5, 0, 7); g.fillStyle = '#fff'; g.globalCompositeOperation = 'destination-out'; g.fill(); g.globalCompositeOperation = 'source-over'; g.fillStyle = lgr(g, 0, 28, 0, 36, hsh(m, 1.4), hsh(m, 0.7)); g.fillRect(28, 28, 28, 8); for (let x = 36; x < 56; x += 5) g.fillRect(x, 36, 3, 4); return; }
  if (/bell/.test(n)) { g.beginPath(); g.moveTo(14, 50); g.quadraticCurveTo(18, 42, 20, 22); g.quadraticCurveTo(22, 8, 32, 8); g.quadraticCurveTo(42, 8, 44, 22); g.quadraticCurveTo(46, 42, 50, 50); g.closePath(); g.fillStyle = lgr(g, 14, 0, 50, 0, hsh(m, 0.7), hsh(m, 1.4), hsh(m, 0.6)); g.fill(); ink(g); g.fillStyle = hsh(m, 0.6); g.fillRect(12, 48, 40, 4); g.beginPath(); g.arc(32, 54, 4, 0, 7); g.fill(); return; }
  if (/coin/.test(n)) { for (let i = 0; i < 6; i++) { ell(g, 30, 50 - i * 5, 18, 6); g.fillStyle = lgr(g, 12, 0, 48, 0, hsh(m, 0.8), hsh(m, 1.35)); g.fill(); ink(g, 1); } ell(g, 30, 25, 18, 6); g.fillStyle = hsh(m, 1.3); g.fill(); ink(g, 1); return; }
  if (/chain/.test(n)) { g.strokeStyle = '#4a4e54'; g.lineWidth = 3.5; for (let i = 0; i < 6; i++) { g.save(); g.translate(10 + i * 9, 50 - i * 7); g.rotate(-0.7); ell(g, 0, 0, 6, 3.5); g.stroke(); g.restore(); } return; }
  if (/bearing/.test(n)) { g.beginPath(); g.arc(32, 32, 24, 0, 7); g.fillStyle = lgr(g, 8, 8, 56, 56, '#e0e4e8', '#7a8086'); g.fill(); ink(g); g.beginPath(); g.arc(32, 32, 17, 0, 7); g.fillStyle = '#3a3e44'; g.fill(); for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28; g.beginPath(); g.arc(32 + Math.cos(a) * 13, 32 + Math.sin(a) * 13, 3.6, 0, 7); g.fillStyle = rgr(g, 32 + Math.cos(a) * 13, 32 + Math.sin(a) * 13, 3.6, '#fff', '#8a9096'); g.fill(); } g.beginPath(); g.arc(32, 32, 9, 0, 7); g.fillStyle = lgr(g, 23, 23, 41, 41, '#d0d4d8', '#6a7078'); g.fill(); g.beginPath(); g.arc(32, 32, 6, 0, 7); g.fillStyle = '#151515'; g.fill(); return; }
  if (/spring/.test(n)) { g.strokeStyle = m; g.lineWidth = 2.5; g.beginPath(); for (let a = 0; a < 6.28 * 4; a += 0.2) { const d = 4 + a * 0.85; g.lineTo(32 + Math.cos(a) * d, 32 + Math.sin(a) * d); } g.stroke(); return; }
  if (/frame|chassis|scaffold/.test(n)) { g.strokeStyle = m; g.lineWidth = 4; g.lineCap = 'round'; if (/chassis/.test(n)) { g.beginPath(); g.moveTo(8, 20); g.lineTo(56, 20); g.moveTo(8, 44); g.lineTo(56, 44); for (const x of [12, 26, 40, 52]) { g.moveTo(x, 20); g.lineTo(x, 44); } g.stroke(); } else { g.beginPath(); g.moveTo(10, 46); g.lineTo(26, 22); g.lineTo(48, 22); g.lineTo(54, 46); g.moveTo(26, 22); g.lineTo(32, 46); g.lineTo(10, 46); g.moveTo(32, 46); g.lineTo(48, 22); g.stroke(); } g.lineCap = 'butt'; return; }
  rrect(g, 10, 14, 44, 36, 6); g.fillStyle = lgr(g, 0, 14, 0, 50, hsh(m, 1.35), m, hsh(m, 0.6)); g.fill(); ink(g);
  g.fillStyle = 'rgba(0,0,0,0.3)'; for (const [x, y] of [[16, 20], [44, 20], [16, 42], [44, 42]]) { g.beginPath(); g.arc(x, y, 2.4, 0, 7); g.fill(); }
  g.beginPath(); g.arc(32, 32, 8, 0, 7); g.fillStyle = hsh(m, 0.7); g.fill(); ink(g, 1);
  if (/nacelle|turbofan|combustor/.test(n)) { g.clearRect(0, 0, 64, 64); rrect(g, 6, 16, 52, 32, 16); g.fillStyle = lgr(g, 0, 16, 0, 48, '#e8eaec', '#8a9096'); g.fill(); ink(g); ell(g, 10, 32, 6, 15); g.fillStyle = '#2a2e34'; g.fill(); g.strokeStyle = '#888'; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(10, 32); g.lineTo(10 + Math.cos(i) * 5, 32 + Math.sin(i) * 13); g.stroke(); } }
};
IP.drop = (g, c, r, n, gas) => {
  if (gas) {
    const at = [[22, 38, 13], [40, 36, 14], [32, 24, 13], [46, 24, 9], [18, 26, 9]];
    for (const [x, y, R] of at) { g.beginPath(); g.arc(x, y, R, 0, 7); g.fillStyle = rgr(g, x, y, R, hmix(c, '#ffffff', 0.55), hsh(c, 0.8)); g.globalAlpha = 0.9; g.fill(); g.globalAlpha = 1; }
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1.2; for (const [x, y, R] of at) { g.beginPath(); g.arc(x, y, R, 0, 7); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,0.6)'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(14 + r() * 36, 18 + r() * 28, 1.5, 0, 7); g.fill(); }
    return;
  }
  dshad(g, 32, 58, 16, 3);
  g.beginPath(); g.moveTo(32, 4); g.bezierCurveTo(36, 18, 52, 28, 52, 40); g.arc(32, 40, 20, 0, Math.PI); g.bezierCurveTo(12, 28, 28, 18, 32, 4); g.closePath();
  g.fillStyle = rgr(g, 32, 40, 22, hmix(c, '#ffffff', 0.5), hsh(c, 0.7)); g.fill(); ink(g, 1.5);
  g.fillStyle = 'rgba(255,255,255,0.65)'; ell(g, 24, 38, 3.5, 7, 0.3); g.fill();
  if (/oil|tar|crude|bitumen|molasses|syrup|latex/.test(n)) { g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 1.5; g.beginPath(); g.arc(34, 44, 9, 0.2, 1.4); g.stroke(); }
};
const MET = (g, x0, y0, x1, y1, c) => lgr(g, x0, y0, x1, y1, hsh(c, 1.4), c, hsh(c, 0.58));
const mcol = c => hlum(c) < 50 ? hsh(c, 1.9) : c;
IP.cabinet = (g, c, r, n) => {
  const m = mcol(c);
  dshad(g, 32, 58, 22, 3);
  if (/hood/.test(n)) {
    rrect(g, 8, 4, 48, 54, 2); g.fillStyle = MET(g, 8, 0, 56, 0, '#d8dce0'); g.fill(); ink(g);
    g.fillStyle = 'rgba(150,200,230,0.75)'; g.fillRect(13, 12, 38, 22); g.strokeStyle = '#555'; g.lineWidth = 2; g.strokeRect(13, 12, 38, 22);
    g.fillStyle = '#3a3e44'; g.fillRect(13, 34, 38, 4); g.fillStyle = '#f2f2ee'; g.fillRect(13, 38, 38, 18); g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 1; g.strokeRect(13, 38, 18, 18); g.strokeRect(33, 38, 18, 18);
    g.fillStyle = '#8a9096'; g.fillRect(26, 0, 12, 5); return;
  }
  if (/jbox|junction/.test(n)) {
    rrect(g, 12, 14, 40, 36, 4); g.fillStyle = MET(g, 0, 14, 0, 50, '#9aa0a6'); g.fill(); ink(g);
    g.fillStyle = '#e0b030'; poly(g, [32, 22, 40, 36, 24, 36]); g.fill(); g.fillStyle = '#222'; g.fillRect(31, 26, 2, 6); g.fillRect(31, 33, 2, 2);
    g.fillStyle = '#2a2e34'; for (const x of [18, 32, 46]) { g.fillRect(x - 3, 50, 6, 7); } return;
  }
  const big = /breaker|ctrl|cnc|vfd|drive/.test(n);
  rrect(g, big ? 12 : 16, 4, big ? 40 : 32, 54, 3); g.fillStyle = MET(g, 12, 0, 52, 0, m); g.fill(); ink(g);
  g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(32, 6); g.lineTo(32, 56); g.stroke();
  if (/ctrl|cnc|drive|vfd/.test(n)) { g.fillStyle = '#10181e'; g.fillRect(18, 10, 28, 16); g.fillStyle = '#5fe0a0'; g.fillRect(20, 13, 14, 2); g.fillRect(20, 17, 20, 2); g.fillRect(20, 21, 9, 2); }
  if (/cnc|ctrl/.test(n)) { g.fillStyle = '#2a2e34'; for (let j = 0; j < 3; j++) for (let i = 0; i < 5; i++) g.fillRect(18 + i * 6, 30 + j * 5, 4, 3); g.fillStyle = '#c03030'; g.beginPath(); g.arc(40, 50, 4, 0, 7); g.fill(); ink(g, 1); }
  else if (/breaker/.test(n)) { g.fillStyle = '#2a2e34'; g.fillRect(18, 12, 28, 10); g.fillStyle = '#30a050'; g.fillRect(20, 26, 8, 6); g.fillStyle = '#c03030'; g.fillRect(36, 26, 8, 6); g.fillStyle = '#e8e8e0'; g.fillRect(22, 38, 20, 12); g.strokeStyle = '#555'; g.strokeRect(22, 38, 20, 12); }
  else { g.strokeStyle = 'rgba(0,0,0,0.4)'; for (let y = 32; y < 52; y += 3) { g.beginPath(); g.moveTo(18, y); g.lineTo(46, y); g.stroke(); } g.fillStyle = '#30d060'; g.beginPath(); g.arc(42, 13, 2, 0, 7); g.fill(); }
};
IP.vessel = (g, c, r, n) => {
  const m = mcol(c);
  dshad(g, 32, 58, 26, 3);
  if (/head/.test(n)) { g.beginPath(); g.moveTo(6, 46); g.quadraticCurveTo(6, 10, 32, 10); g.quadraticCurveTo(58, 10, 58, 46); g.closePath(); g.fillStyle = rgr(g, 32, 30, 30, hsh(m, 1.45), hsh(m, 0.6)); g.fill(); ink(g); g.fillStyle = hsh(m, 0.7); g.fillRect(4, 44, 56, 8); ink(g, 1); g.fillStyle = '#3a3e44'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(18 + i * 7, 26 - Math.abs(i - 2) * 2, 2.5, 0, 7); g.fill(); } return; }
  if (/condenser|tank|composite|fibreglass/.test(n)) {
    rrect(g, 4, 18, 56, 30, 15); g.fillStyle = MET(g, 0, 18, 0, 48, m); g.fill(); ink(g);
    if (/composite|fibreglass/.test(n)) { g.save(); rrect(g, 4, 18, 56, 30, 15); g.clip(); g.strokeStyle = 'rgba(0,0,0,0.22)'; g.lineWidth = 1; for (let x = -20; x < 70; x += 6) { g.beginPath(); g.moveTo(x, 18); g.lineTo(x + 18, 48); g.stroke(); } g.restore(); g.fillStyle = '#9aa0a6'; g.fillRect(56, 29, 6, 8); ink(g, 1); }
    else { g.strokeStyle = 'rgba(0,0,0,0.35)'; for (const x of [16, 48]) { g.beginPath(); g.moveTo(x, 18); g.lineTo(x, 48); g.stroke(); } g.fillStyle = hsh(m, 0.75); for (const x of [22, 42]) { g.fillRect(x - 4, 10, 8, 9); g.fillRect(x - 4, 47, 8, 7); } }
    return;
  }
  const sg = /steam_gen|steam generator/.test(n);
  if (sg) { rrect(g, 20, 4, 24, 20, 8); g.fillStyle = MET(g, 20, 0, 44, 0, m); g.fill(); ink(g); poly(g, [20, 22, 44, 22, 40, 30, 24, 30]); g.fill(); ink(g, 1); rrect(g, 24, 28, 16, 30, 6); g.fill(); ink(g); }
  else { rrect(g, 18, 4, 28, 54, 13); g.fillStyle = MET(g, 18, 0, 46, 0, m); g.fill(); ink(g); g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1; for (const y of [18, 30, 42]) { g.beginPath(); g.moveTo(18, y); g.lineTo(46, y); g.stroke(); } }
  g.fillStyle = hsh(m, 0.7); for (const y of sg ? [12, 40] : [16, 34]) { g.fillRect(sg ? 44 : 46, y, 8, 6); g.fillRect(sg ? 12 : 10, y + 4, 8, 6); }
};
IP.pump = (g, c, r, n) => {
  const m = mcol(c);
  dshad(g, 32, 58, 26, 3);
  if (/turbo/.test(n)) {
    rrect(g, 16, 22, 32, 34, 4); g.fillStyle = MET(g, 16, 0, 48, 0, '#c8ccd0'); g.fill(); ink(g);
    ell(g, 32, 20, 22, 8); g.fillStyle = MET(g, 10, 0, 54, 0, '#d8dce0'); g.fill(); ink(g); ell(g, 32, 20, 15, 5); g.fillStyle = '#2a2e34'; g.fill();
    g.strokeStyle = '#8a9096'; g.lineWidth = 1.2; for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28; g.beginPath(); g.moveTo(32, 20); g.lineTo(32 + Math.cos(a) * 14, 20 + Math.sin(a) * 4.6); g.stroke(); }
    g.fillStyle = m; g.fillRect(16, 40, 32, 5); g.fillStyle = '#3a3e44'; g.fillRect(48, 44, 8, 6); ink(g, 1); return;
  }
  if (/coolant|rcp/.test(n)) {
    rrect(g, 20, 4, 24, 26, 3); g.fillStyle = MET(g, 20, 0, 44, 0, m); g.fill(); ink(g); g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; for (let x = 23; x < 42; x += 3) { g.beginPath(); g.moveTo(x, 6); g.lineTo(x, 28); g.stroke(); }
    g.fillStyle = hsh(m, 0.7); g.fillRect(16, 30, 32, 5); ink(g, 1);
    g.beginPath(); g.arc(32, 46, 13, 0, 7); g.fillStyle = rgr(g, 32, 46, 13, '#d8dce0', '#6a7078'); g.fill(); ink(g); g.fillStyle = '#8a9096'; g.fillRect(4, 42, 16, 8); g.fillRect(44, 42, 16, 8); ink(g, 1); return;
  }
  if (/piston|axial/.test(n)) {
    rrect(g, 12, 18, 34, 28, 5); g.fillStyle = MET(g, 0, 18, 0, 46, m); g.fill(); ink(g);
    g.fillStyle = hsh(m, 0.75); g.fillRect(44, 14, 6, 36); ink(g, 1); g.fillStyle = '#c8ccd0'; g.fillRect(50, 28, 10, 8); ink(g, 1);
    g.fillStyle = hsh(m, 0.6); rrect(g, 18, 8, 14, 10, 2); g.fill(); ink(g, 1); rrect(g, 18, 46, 14, 8, 2); g.fill(); ink(g, 1); return;
  }
  g.beginPath(); g.arc(22, 34, 15, 0, 7); g.fillStyle = rgr(g, 22, 34, 15, hsh(m, 1.4), hsh(m, 0.6)); g.fill(); ink(g);
  g.fillStyle = hsh(m, 0.8); g.fillRect(16, 10, 12, 10); ink(g, 1); g.beginPath(); g.arc(22, 34, 5, 0, 7); g.fillStyle = '#2a2e34'; g.fill();
  rrect(g, 36, 24, 22, 22, 3); g.fillStyle = MET(g, 0, 24, 0, 46, '#4a6a8a'); g.fill(); ink(g); g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; for (let x = 40; x < 56; x += 3) { g.beginPath(); g.moveTo(x, 25); g.lineTo(x, 45); g.stroke(); }
  g.fillStyle = '#3a3e44'; g.fillRect(6, 50, 54, 5);
};
IP.instrument = (g, c, r, n) => {
  const m = mcol(c);
  dshad(g, 32, 58, 28, 3);
  if (/nmr|spectrometer/.test(n)) {
    g.fillStyle = '#3a3e44'; for (const x of [12, 28]) g.fillRect(x, 46, 3, 10);
    rrect(g, 8, 8, 28, 40, 10); g.fillStyle = MET(g, 8, 0, 36, 0, '#d8dce0'); g.fill(); ink(g); ell(g, 22, 10, 14, 4); g.fillStyle = '#b8bec4'; g.fill(); ink(g, 1);
    g.fillStyle = '#c8ccd0'; for (const x of [18, 26]) g.fillRect(x - 1.5, 0, 3, 8);
    rrect(g, 40, 22, 20, 34, 2); g.fillStyle = MET(g, 0, 22, 0, 56, m); g.fill(); ink(g); g.fillStyle = '#10181e'; g.fillRect(43, 26, 14, 10); g.fillStyle = '#5fe0a0'; g.fillRect(44, 32, 12, 1.5); g.fillRect(48, 28, 1.5, 5); return;
  }
  rrect(g, 4, 18, 56, 38, 3); g.fillStyle = MET(g, 0, 18, 0, 56, hlum(m) > 120 ? m : '#d8dce0'); g.fill(); ink(g);
  g.fillStyle = '#10181e'; g.fillRect(38, 24, 18, 13); g.fillStyle = '#5fe0a0'; g.beginPath(); g.moveTo(39, 34); for (let x = 0; x < 16; x++) g.lineTo(40 + x, 34 - (x % 5 === 2 ? 7 : x % 3 === 0 ? 3 : 1)); g.strokeStyle = '#5fe0a0'; g.lineWidth = 1; g.stroke();
  rrect(g, 9, 23, 24, 22, 2); g.fillStyle = 'rgba(0,0,0,0.18)'; g.fill(); g.strokeStyle = 'rgba(0,0,0,0.4)'; g.stroke(); g.fillStyle = '#8a9096'; g.fillRect(29, 30, 3, 8);
  g.fillStyle = m; g.fillRect(4, 48, 56, 3); g.fillStyle = '#c8ccd0'; g.fillRect(14, 10, 6, 9); ink(g, 1);
};
IP.magnet = (g, c, r, n) => {
  dshad(g, 32, 58, 24, 3);
  if (/alnico/.test(n)) { g.strokeStyle = '#c03030'; g.lineWidth = 12; g.beginPath(); g.arc(32, 28, 16, Math.PI, 0); g.lineTo(48, 44); g.moveTo(16, 28); g.lineTo(16, 44); g.stroke(); g.fillStyle = '#c8ccd0'; g.fillRect(10, 44, 12, 10); g.fillRect(42, 44, 12, 10); g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1.2; g.strokeRect(10, 44, 12, 10); g.strokeRect(42, 44, 12, 10); return; }
  if (/superconducting|nmr|sc_magnet|gradient|rf coil|rf_coil/.test(n)) {
    g.beginPath(); g.arc(32, 32, 26, 0, 7); g.fillStyle = rgr(g, 32, 32, 26, /rf/.test(n) ? '#f0d0a0' : '#eef0f2', /rf/.test(n) ? '#a06030' : '#8a9096'); g.fill(); ink(g);
    g.beginPath(); g.arc(32, 32, 12, 0, 7); g.fillStyle = '#1e2226'; g.fill(); ink(g, 1);
    g.strokeStyle = /rf|grad/.test(n) ? '#c87a40' : 'rgba(0,0,0,0.25)'; g.lineWidth = /rf|grad/.test(n) ? 2 : 1; for (const R of [16, 20, 23]) { g.beginPath(); g.arc(32, 32, R, 0, 7); g.stroke(); } return;
  }
  if (/core/.test(n)) {
    g.fillStyle = MET(g, 0, 8, 0, 56, /ferrite/.test(n) ? '#4a4e54' : '#8a9096'); g.fillRect(8, 8, 48, 48); g.fillStyle = 'rgba(0,0,0,0)';
    g.clearRect(18, 18, 8, 28); g.clearRect(38, 18, 8, 28); g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1.2; g.strokeRect(8, 8, 48, 48); g.strokeRect(18, 18, 8, 28); g.strokeRect(38, 18, 8, 28);
    if (!/ferrite/.test(n)) { g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 0.8; for (let y = 10; y < 56; y += 2.5) { g.beginPath(); g.moveTo(8, y); g.lineTo(56, y); g.stroke(); } }
    return;
  }
  const plated = /ndfeb|plated|neodym/.test(n), base = plated ? '#c8ccd0' : /ferrite/.test(n) ? '#3a3c40' : mcol(c);
  rrect(g, 8, 18, 48, 28, 3); g.fillStyle = MET(g, 0, 18, 0, 46, base); g.fill(); ink(g);
  if (!/bare|ground|block/.test(n)) { g.fillStyle = 'rgba(200,40,40,0.85)'; g.fillRect(10, 20, 22, 24); g.fillStyle = 'rgba(40,80,200,0.85)'; g.fillRect(32, 20, 22, 24); g.fillStyle = '#fff'; g.font = 'bold 14px sans-serif'; g.textAlign = 'center'; g.fillText('N', 21, 37); g.fillText('S', 43, 37); }
  else { g.strokeStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.moveTo(12, 22); g.lineTo(52, 22); g.stroke(); }
};
IP.comp = (g, c, r, n) => {
  dshad(g, 32, 58, 20, 3);
  const leads = (xs, y0, y1, col) => { g.strokeStyle = col || '#c8ccd0'; g.lineWidth = 2; for (const x of xs) { g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y1); g.stroke(); } };
  if (/mosfet|hemt|transistor/.test(n)) { rrect(g, 18, 4, 28, 16, 2); g.fillStyle = MET(g, 0, 4, 0, 20, '#c8ccd0'); g.fill(); ink(g, 1); g.beginPath(); g.arc(32, 11, 3.5, 0, 7); g.fillStyle = '#2a2e34'; g.fill(); leads([24, 32, 40], 40, 60); rrect(g, 16, 18, 32, 24, 2); g.fillStyle = '#1e2024'; g.fill(); ink(g, 1); g.fillStyle = '#8a9096'; g.font = '6px sans-serif'; g.textAlign = 'center'; g.fillText(/gan|hemt/.test(n) ? 'GaN' : 'SiC', 32, 32); return; }
  if (/piezo/.test(n)) { g.beginPath(); g.arc(32, 30, 22, 0, 7); g.fillStyle = rgr(g, 32, 30, 22, '#f0d890', '#a08030'); g.fill(); ink(g); g.beginPath(); g.arc(32, 30, 14, 0, 7); g.fillStyle = '#f2f0e8'; g.fill(); ink(g, 1); g.strokeStyle = '#c03030'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(32, 30); g.lineTo(54, 58); g.stroke(); g.strokeStyle = '#222'; g.beginPath(); g.moveTo(14, 40); g.lineTo(46, 60); g.stroke(); return; }
  if (/varistor|thermistor/.test(n)) { const R = /varistor/.test(n) ? 16 : 9; leads([28, 36], 26, 60); g.beginPath(); g.arc(32, 22, R, 0, 7); g.fillStyle = rgr(g, 32, 22, R, hsh(mcol(c), 1.4), hsh(mcol(c), 0.6)); g.fill(); ink(g); return; }
  if (/teg|thermoelectric/.test(n)) { rrect(g, 10, 10, 44, 40, 2); g.fillStyle = '#f2f0ea'; g.fill(); ink(g); g.strokeStyle = 'rgba(0,0,0,0.12)'; for (let i = 1; i < 8; i++) { g.beginPath(); g.moveTo(10 + i * 5.5, 10); g.lineTo(10 + i * 5.5, 50); g.stroke(); } g.strokeStyle = '#c03030'; g.lineWidth = 2; g.beginPath(); g.moveTo(14, 48); g.lineTo(10, 60); g.stroke(); g.strokeStyle = '#222'; g.beginPath(); g.moveTo(20, 48); g.lineTo(18, 60); g.stroke(); return; }
  if (/encoder/.test(n)) { g.beginPath(); g.arc(28, 30, 20, 0, 7); g.fillStyle = MET(g, 8, 10, 48, 50, '#c8ccd0'); g.fill(); ink(g); g.beginPath(); g.arc(28, 30, 13, 0, 7); g.fillStyle = '#2a2e34'; g.fill(); g.beginPath(); g.arc(28, 30, 4, 0, 7); g.fillStyle = '#c8ccd0'; g.fill(); g.strokeStyle = '#2a2e34'; g.lineWidth = 4; g.beginPath(); g.moveTo(44, 42); g.quadraticCurveTo(54, 50, 60, 60); g.stroke(); return; }
  if (/multiplier/.test(n)) { leads([22, 28, 36, 42], 48, 60); rrect(g, 16, 8, 32, 42, 10); g.fillStyle = 'rgba(200,220,235,0.55)'; g.fill(); ink(g); g.strokeStyle = '#c87a40'; g.lineWidth = 2; g.beginPath(); for (let i = 0; i < 6; i++) { g.moveTo(i % 2 ? 36 : 22, 14 + i * 6); g.lineTo(i % 2 ? 44 : 28, 14 + i * 6); } g.stroke(); return; }
  if (/interrupter/.test(n)) { g.fillStyle = '#c87a40'; g.fillRect(28, 2, 8, 10); g.fillRect(28, 52, 8, 8); rrect(g, 18, 10, 28, 44, 3); g.fillStyle = MET(g, 18, 0, 46, 0, '#f0eee6'); g.fill(); ink(g); g.fillStyle = '#c8ccd0'; g.fillRect(18, 28, 28, 6); ink(g, 1); return; }
  if (/arrester|surge/.test(n)) { g.fillStyle = '#8a9096'; g.fillRect(28, 2, 8, 56); for (let i = 0; i < 6; i++) { ell(g, 32, 10 + i * 8, 14, 3.5); g.fillStyle = '#9a9ea4'; g.fill(); ink(g, 1); } return; }
  if (/contact|cucr/.test(n)) { g.beginPath(); g.arc(32, 32, 22, 0, 7); g.fillStyle = rgr(g, 32, 32, 22, '#f0b080', '#9a5a30'); g.fill(); ink(g); g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 2; for (let i = 0; i < 4; i++) { const a = i * 1.571 + 0.4; g.beginPath(); g.moveTo(32 + Math.cos(a) * 8, 32 + Math.sin(a) * 8); g.lineTo(32 + Math.cos(a + 0.6) * 21, 32 + Math.sin(a + 0.6) * 21); g.stroke(); } g.beginPath(); g.arc(32, 32, 5, 0, 7); g.fillStyle = '#6a3a20'; g.fill(); return; }
  if (/probe/.test(n)) { g.save(); g.translate(30, 30); g.rotate(-0.5); rrect(g, -8, -22, 16, 34, 6); g.fillStyle = MET(g, -8, 0, 8, 0, '#e8eaec'); g.fill(); ink(g); g.fillStyle = '#2a2e34'; rrect(g, -10, -26, 20, 7, 3); g.fill(); g.restore(); g.strokeStyle = '#3a3e44'; g.lineWidth = 3; g.beginPath(); g.moveTo(36, 40); g.quadraticCurveTo(44, 58, 60, 54); g.stroke(); return; }
  if (/charger/.test(n)) { rrect(g, 12, 14, 34, 40, 6); g.fillStyle = MET(g, 12, 0, 46, 0, '#f4f4f2'); g.fill(); ink(g); g.fillStyle = '#c8ccd0'; g.fillRect(20, 4, 4, 11); g.fillRect(34, 4, 4, 11); g.fillStyle = '#2a2e34'; rrect(g, 22, 40, 14, 5, 2); g.fill(); return; }
  if (/hall|sensor|saw|filter/.test(n)) { rrect(g, 8, 26, 48, 26, 2); g.fillStyle = '#2f8a4a'; g.fill(); ink(g, 1); rrect(g, 20, 14, 24, 22, 2); g.fillStyle = MET(g, 0, 14, 0, 36, /saw/.test(n) ? '#c8ccd0' : '#1e2024'); g.fill(); ink(g, 1); g.fillStyle = '#d8b050'; for (let i = 0; i < 5; i++) { g.fillRect(14 + i * 9, 46, 5, 3); } return; }
  rrect(g, 16, 18, 32, 28, 2); g.fillStyle = '#1e2024'; g.fill(); ink(g); g.fillStyle = '#c8ccd0'; for (let i = 0; i < 5; i++) { g.fillRect(12, 21 + i * 5, 4, 2); g.fillRect(48, 21 + i * 5, 4, 2); }
};
IP.robot = (g, c, r, n) => {
  const m = hlum(c) < 60 ? '#e07a20' : c;
  dshad(g, 30, 58, 24, 3);
  if (/joint|module/.test(n)) { rrect(g, 12, 16, 40, 34, 8); g.fillStyle = MET(g, 0, 16, 0, 50, '#c8ccd0'); g.fill(); ink(g); ell(g, 52, 33, 6, 17); g.fillStyle = m; g.fill(); ink(g, 1); ell(g, 52, 33, 3, 8); g.fillStyle = '#2a2e34'; g.fill(); g.strokeStyle = '#2a2e34'; g.lineWidth = 3; g.beginPath(); g.moveTo(16, 40); g.quadraticCurveTo(6, 50, 4, 60); g.stroke(); return; }
  if (/casting/.test(n)) { g.save(); g.translate(32, 32); g.rotate(-0.6); rrect(g, -26, -8, 52, 16, 8); g.fillStyle = MET(g, 0, -8, 0, 8, '#b8bcc0'); g.fill(); ink(g); for (const x of [-18, 18]) { g.beginPath(); g.arc(x, 0, 9, 0, 7); g.fillStyle = '#9aa0a6'; g.fill(); ink(g, 1); g.beginPath(); g.arc(x, 0, 4, 0, 7); g.fillStyle = '#2a2e34'; g.fill(); } g.restore(); return; }
  g.fillStyle = '#3a3e44'; rrect(g, 8, 50, 28, 8, 2); g.fill(); ink(g, 1);
  rrect(g, 12, 38, 20, 14, 3); g.fillStyle = MET(g, 12, 0, 32, 0, m); g.fill(); ink(g, 1);
  const seg = (x0, y0, x1, y1, w) => { g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = w + 2.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.strokeStyle = m; g.lineWidth = w; g.stroke(); };
  seg(22, 40, 26, 16, 9); seg(26, 16, 48, 22, 7); seg(48, 22, 54, 34, 5); g.lineCap = 'butt';
  for (const [x, y, R] of [[22, 40, 6], [26, 16, 5.5], [48, 22, 4.5]]) { g.beginPath(); g.arc(x, y, R, 0, 7); g.fillStyle = '#3a3e44'; g.fill(); }
  g.fillStyle = '#2a2e34'; g.fillRect(50, 34, 3, 8); g.fillRect(56, 34, 3, 8); g.fillRect(50, 34, 9, 3);
};
IP.nozzle = (g, c, r, n) => {
  dshad(g, 32, 60, 14, 3);
  rrect(g, 22, 4, 20, 28, 3); g.fillStyle = MET(g, 22, 0, 42, 0, '#3a3e44'); g.fill(); ink(g);
  rrect(g, 18, 18, 28, 8, 2); g.fillStyle = MET(g, 18, 0, 46, 0, '#c8ccd0'); g.fill(); ink(g, 1);
  g.fillStyle = mcol(c); g.fillRect(22, 8, 20, 4);
  poly(g, [22, 32, 42, 32, 35, 52, 29, 52]); g.fillStyle = MET(g, 22, 0, 42, 0, '#d8b060'); g.fill(); ink(g);
  g.fillStyle = '#c87a40'; g.fillRect(29, 52, 6, 4); ink(g, 1);
  g.strokeStyle = '#e0b030'; g.lineWidth = 3; g.beginPath(); g.moveTo(42, 10); g.quadraticCurveTo(56, 8, 60, 2); g.stroke();
  g.strokeStyle = '#2a6ac0'; g.lineWidth = 2; g.beginPath(); g.moveTo(22, 14); g.quadraticCurveTo(8, 16, 4, 6); g.stroke();
};
IP.casting = (g, c, r, n) => {
  const m = mcol(c);
  dshad(g, 32, 58, 24, 3);
  if (/tooth|teeth|pick/.test(n)) { for (const [x, s] of /teeth/.test(n) ? [[20, 0.8], [44, 0.8]] : [[32, 1]]) { g.save(); g.translate(x, 34); g.scale(s, s); poly(g, [-12, 22, -12, -2, 0, -24, 12, -2, 12, 22]); g.fillStyle = MET(g, -12, 0, 12, 0, /pick/.test(n) ? '#8a7a6a' : m); g.fill(); ink(g); if (/carbide|pick/.test(n)) { poly(g, [-4, -14, 0, -26, 4, -14]); g.fillStyle = '#c8ccd0'; g.fill(); ink(g, 1); } g.restore(); } return; }
  if (/bucket/.test(n)) { g.beginPath(); g.moveTo(8, 14); g.lineTo(50, 10); g.quadraticCurveTo(58, 32, 46, 52); g.lineTo(8, 46); g.closePath(); g.fillStyle = MET(g, 0, 10, 0, 52, m); g.fill(); ink(g); g.fillStyle = '#5a5e64'; for (let i = 0; i < 4; i++) { poly(g, [6, 16 + i * 8, 0, 19 + i * 8, 6, 22 + i * 8]); g.fill(); } return; }
  if (/wax|pattern/.test(n)) { g.fillStyle = '#d8c070'; g.fillRect(29, 6, 6, 50); ink(g, 1); for (let i = 0; i < 4; i++) for (const s of [-1, 1]) { g.save(); g.translate(32 + s * 3, 14 + i * 11); g.scale(s, 1); ell(g, 10, 0, 9, 3.5, -0.2); g.fillStyle = '#e8d488'; g.fill(); ink(g, 1); g.restore(); } return; }
  if (/mould|mold|shell/.test(n)) { g.beginPath(); g.moveTo(20, 6); g.quadraticCurveTo(52, 10, 46, 30); g.quadraticCurveTo(54, 52, 32, 56); g.quadraticCurveTo(10, 52, 18, 30); g.quadraticCurveTo(10, 12, 20, 6); g.fillStyle = rgr(g, 30, 30, 28, '#f2efe6', '#a8a498'); g.fill(); ink(g); g.beginPath(); g.arc(30, 10, 5, 0, 7); g.fillStyle = '#5a564c'; g.fill(); return; }
  g.beginPath(); g.moveTo(10, 22); g.lineTo(24, 10); g.lineTo(46, 12); g.lineTo(56, 26); g.lineTo(52, 50); g.lineTo(28, 54); g.lineTo(10, 44); g.closePath(); g.fillStyle = MET(g, 10, 10, 56, 54, m); g.fill(); ink(g);
  g.fillStyle = 'rgba(0,0,0,0.18)'; for (let i = 0; i < 50; i++) g.fillRect(14 + r() * 38, 16 + r() * 32, 1.5, 1.5);
  g.beginPath(); g.arc(32, 32, 9, 0, 7); g.fillStyle = hsh(m, 0.55); g.fill(); ink(g, 1); g.beginPath(); g.arc(32, 32, 4, 0, 7); g.fillStyle = '#1e2024'; g.fill();
  g.fillStyle = 'rgba(0,0,0,0.4)'; for (const [x, y] of [[20, 24], [44, 22], [20, 44], [44, 44]]) { g.beginPath(); g.arc(x, y, 2.5, 0, 7); g.fill(); }
};
IP.ring = (g, c, r, n) => {
  const m = mcol(c);
  dshad(g, 32, 58, 26, 4);
  if (/seal/.test(n)) { for (const [x, y, R, w] of [[24, 26, 16, 4], [42, 36, 12, 3.5], [22, 46, 8, 3]]) { g.strokeStyle = '#1e2024'; g.lineWidth = w; g.beginPath(); g.arc(x, y, R, 0, 7); g.stroke(); g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 1; g.beginPath(); g.arc(x, y, R, 3.6, 4.6); g.stroke(); } return; }
  if (/flexspline/.test(n)) { ell(g, 32, 44, 24, 10); g.fillStyle = MET(g, 8, 0, 56, 0, '#c8ccd0'); g.fill(); ink(g); g.fillRect(8, 18, 48, 26); ell(g, 32, 18, 24, 10); g.fillStyle = '#d8dce0'; g.fill(); ink(g); ell(g, 32, 18, 19, 7); g.fillStyle = '#5a5e64'; g.fill(); g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 1; for (let x = 10; x < 56; x += 3) { g.beginPath(); g.moveTo(x, 22); g.lineTo(x, 30); g.stroke(); } return; }
  g.beginPath(); g.arc(32, 32, 27, 0, 7); g.arc(32, 32, /slew/.test(n) ? 18 : 15, 0, 7, true); g.fillStyle = MET(g, 5, 5, 59, 59, m); g.fill('evenodd'); ink(g);
  if (/clad/.test(n)) { g.strokeStyle = '#d8dce0'; g.lineWidth = 2.5; g.beginPath(); g.arc(32, 32, 16.5, 0, 7); g.stroke(); }
  if (/slew_ring|slewing ring\b/.test(n) && !/forging/.test(n)) { g.fillStyle = hsh(m, 0.6); for (let i = 0; i < 28; i++) { const a = i / 28 * 6.28; g.beginPath(); g.arc(32 + Math.cos(a) * 17, 32 + Math.sin(a) * 17, 1.6, 0, 7); g.fill(); } g.fillStyle = '#2a2e34'; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28; g.beginPath(); g.arc(32 + Math.cos(a) * 23, 32 + Math.sin(a) * 23, 1.6, 0, 7); g.fill(); } }
};
IP.shaft = (g, c, r, n) => {
  const m = mcol(c);
  dshad(g, 32, 58, 26, 3);
  g.save(); g.translate(32, 32); g.rotate(-0.6);
  if (/linear|guide/.test(n)) { g.fillStyle = MET(g, 0, -4, 0, 6, '#c8ccd0'); g.fillRect(-30, -3, 60, 8); g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1; g.strokeRect(-30, -3, 60, 8); g.fillStyle = '#2a2e34'; for (let x = -26; x < 30; x += 8) { g.beginPath(); g.arc(x, 1, 1.4, 0, 7); g.fill(); } rrect(g, -8, -9, 18, 16, 2); g.fillStyle = MET(g, 0, -9, 0, 7, '#4a6a8a'); g.fill(); ink(g, 1); g.restore(); return; }
  if (/screw/.test(n)) { g.fillStyle = MET(g, 0, -3, 0, 3, '#c8ccd0'); g.fillRect(-30, -3, 60, 6); g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 1; for (let x = -28; x < 30; x += 2.5) { g.beginPath(); g.moveTo(x, -3); g.lineTo(x + 2, 3); g.stroke(); } rrect(g, 0, -8, 14, 16, 2); g.fillStyle = MET(g, 0, -8, 0, 8, m); g.fill(); ink(g, 1); g.fillStyle = hsh(m, 0.7); g.fillRect(-2, -10, 3, 20); g.restore(); return; }
  if (/cyl|actuator|drive|piston/.test(n)) { g.fillStyle = MET(g, 0, -2, 0, 2, '#e8eaec'); g.fillRect(4, -2.5, 24, 5); rrect(g, -26, -7, 32, 14, 3); g.fillStyle = MET(g, 0, -7, 0, 7, m); g.fill(); ink(g, 1); for (const x of [-30, 30]) { g.beginPath(); g.arc(x, 0, 4.5, 0, 7); g.fillStyle = '#6a7078'; g.fill(); ink(g, 1); g.beginPath(); g.arc(x, 0, 1.8, 0, 7); g.fillStyle = '#1e2024'; g.fill(); } g.restore(); return; }
  for (const [x, w, h] of [[-30, 12, 6], [-18, 10, 12], [-8, 18, 18], [10, 10, 12], [20, 10, 6]]) { g.fillStyle = MET(g, 0, -h / 2, 0, h / 2, m); g.fillRect(x, -h / 2, w, h); g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1; g.strokeRect(x, -h / 2, w, h); }
  g.restore();
};
IP.panel = (g, c, r, n) => {
  dshad(g, 32, 58, 26, 3);
  if (/rooflight|translucent/.test(n)) { poly(g, [4, 20, 50, 8, 60, 40, 14, 52]); g.fillStyle = 'rgba(220,235,240,0.8)'; g.fill(); ink(g); g.strokeStyle = 'rgba(80,110,130,0.4)'; g.lineWidth = 1.5; for (let i = 1; i < 8; i++) { g.beginPath(); g.moveTo(4 + i * 5.7, 20 - i * 1.5); g.lineTo(14 + i * 5.7, 52 - i * 1.5); g.stroke(); } return; }
  poly(g, [6, 18, 48, 8, 58, 42, 16, 54]); g.fillStyle = '#c8ccd0'; g.fill(); ink(g, 1.5);
  poly(g, [9, 19, 47, 10, 55, 41, 18, 51]); g.fillStyle = lgr(g, 9, 10, 55, 51, '#2a4a8a', '#14244a'); g.fill();
  g.strokeStyle = 'rgba(200,210,230,0.6)'; g.lineWidth = 0.8; for (let i = 1; i < 6; i++) { const t = i / 6; g.beginPath(); g.moveTo(9 + 38 * t, 19 - 9 * t); g.lineTo(18 + 37 * t, 51 - 10 * t); g.stroke(); } for (let j = 1; j < 4; j++) { const t = j / 4; g.beginPath(); g.moveTo(9 + 9 * t, 19 + 32 * t); g.lineTo(47 + 8 * t, 10 + 31 * t); g.stroke(); }
  g.fillStyle = 'rgba(255,255,255,0.15)'; poly(g, [9, 19, 30, 14, 20, 30]); g.fill();
};
IP.bale = (g, c, r, n) => {
  dshad(g, 32, 58, 26, 3);
  const m = c;
  if (/pet_bale|bottle bale/.test(n)) { rrect(g, 8, 12, 48, 42, 3); g.fillStyle = 'rgba(180,215,230,0.9)'; g.fill(); ink(g); g.strokeStyle = 'rgba(40,90,140,0.5)'; g.lineWidth = 1; for (let i = 0; i < 18; i++) { const x = 10 + r() * 40, y = 14 + r() * 36; ell(g, x, y, 5, 2.5, r() * 3); g.stroke(); } g.fillStyle = '#2a2e34'; for (const y of [22, 42]) g.fillRect(6, y, 52, 2.5); return; }
  rrect(g, 8, 16, 48, 36, 7); g.fillStyle = lgr(g, 0, 16, 0, 52, hsh(m, 1.35), m, hsh(m, 0.6)); g.fill(); ink(g);
  g.fillStyle = 'rgba(255,255,255,0.22)'; rrect(g, 12, 19, 40, 6, 3); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(8, 30); g.lineTo(56, 26); g.moveTo(8, 42); g.lineTo(56, 40); g.stroke();
};
IP.bundle = (g, c, r, n) => {
  const m = mcol(c);
  dshad(g, 32, 60, 18, 3);
  if (/quadrupole|rod set|quad/.test(n)) { g.fillStyle = '#3a3e44'; for (const y of [10, 50]) { rrect(g, 14, y, 36, 5, 2); g.fill(); } for (const x of [20, 28, 36, 44]) { g.fillStyle = MET(g, x - 3, 0, x + 3, 0, '#d8dce0'); g.fillRect(x - 3, 4, 6, 56); g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1; g.strokeRect(x - 3, 4, 6, 56); } return; }
  const sp = /spider|cluster|control/.test(n);
  if (sp) { g.fillStyle = MET(g, 20, 0, 44, 0, '#8a9096'); g.fillRect(28, 2, 8, 12); for (let i = -3; i <= 3; i++) { g.strokeStyle = '#6a7078'; g.lineWidth = 2; g.beginPath(); g.moveTo(32, 8); g.lineTo(32 + i * 6, 14); g.stroke(); } for (let i = -3; i <= 3; i++) { g.fillStyle = MET(g, 0, 0, 4, 0, '#2a2e34'); g.fillRect(31 + i * 6, 14, 3, 44); } return; }
  rrect(g, 16, 2, 32, 7, 1); g.fillStyle = MET(g, 16, 0, 48, 0, '#b8bec4'); g.fill(); ink(g, 1); rrect(g, 16, 53, 32, 7, 1); g.fill(); ink(g, 1);
  for (let i = 0; i < 7; i++) { g.fillStyle = MET(g, 18 + i * 4, 0, 21 + i * 4, 0, /spent/.test(n) ? '#6a6458' : '#c8ccd0'); g.fillRect(18 + i * 4, 9, 3, 44); }
  g.fillStyle = hsh(m, 0.9); for (const y of [18, 30, 42]) { g.fillRect(16, y, 32, 3); }
  if (/spent/.test(n)) { g.fillStyle = 'rgba(60,140,255,0.25)'; g.fillRect(12, 2, 40, 58); }
};
IP.heavy = (g, c, r, n) => {
  const m = mcol(c);
  dshad(g, 32, 58, 28, 3);
  if (/transformer/.test(n)) {
    rrect(g, 14, 22, 36, 34, 2); g.fillStyle = MET(g, 0, 22, 0, 56, '#7a8a7a'); g.fill(); ink(g);
    g.fillStyle = '#6a7a6a'; for (let i = 0; i < 5; i++) { g.fillRect(4 + i * 2, 24, 1.5, 28); g.fillRect(51 + i * 2, 24, 1.5, 28); }
    for (const x of [22, 32, 42]) { g.fillStyle = '#a8603a'; for (let j = 0; j < 4; j++) { ell(g, x, 18 - j * 4, 4, 1.6); g.fill(); } g.fillRect(x - 1.5, 2, 3, 18); g.fillStyle = '#c8ccd0'; g.fillRect(x - 2, 0, 4, 3); }
    return;
  }
  if (/axle/.test(n)) { g.fillStyle = MET(g, 0, 28, 0, 36, '#8a9096'); g.fillRect(2, 29, 60, 6); g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1; g.strokeRect(2, 29, 60, 6); rrect(g, 18, 16, 28, 32, 6); g.fillStyle = MET(g, 0, 16, 0, 48, '#b8bec4'); g.fill(); ink(g); g.beginPath(); g.arc(32, 32, 9, 0, 7); g.fillStyle = m; g.fill(); ink(g, 1); for (const x of [4, 60]) { g.beginPath(); g.arc(x, 32, 5, 0, 7); g.fillStyle = '#5a5e64'; g.fill(); ink(g, 1); } g.fillStyle = '#e07a20'; g.fillRect(24, 10, 16, 6); ink(g, 1); return; }
  rrect(g, 4, 18, 44, 30, 12); g.fillStyle = MET(g, 0, 18, 0, 48, m); g.fill(); ink(g);
  rrect(g, 46, 24, 14, 18, 4); g.fillStyle = MET(g, 0, 24, 0, 42, hsh(m, 0.85)); g.fill(); ink(g, 1);
  g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1; for (const x of [16, 28, 40]) { g.beginPath(); g.moveTo(x, 18); g.lineTo(x, 48); g.stroke(); }
  g.fillStyle = '#c8ccd0'; g.fillRect(0, 30, 6, 6); g.fillStyle = '#3a3e44'; g.fillRect(8, 48, 6, 8); g.fillRect(36, 48, 6, 8);
};
IP.scoil = (g, c, r, n) => {
  const m = hmix(mcol(c), '#a4abb3', 0.65);
  dshad(g, 32, 58, 24, 3);
  g.fillStyle = '#5a4a3a'; poly(g, [12, 58, 52, 58, 46, 50, 18, 50]); g.fill();
  g.fillStyle = rgr(g, 26, 26, 30, hsh(m, 1.25), hsh(m, 0.7)); g.beginPath(); g.arc(32, 32, 25, 0, 6.283); g.fill(); ink(g);
  g.strokeStyle = 'rgba(0,0,0,0.22)'; g.lineWidth = 1; for (let q = 10; q < 25; q += 1.7) { g.beginPath(); g.arc(32, 32, q, 0, 6.283); g.stroke(); }
  g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 2; g.beginPath(); g.arc(32, 32, 20, 3.6, 4.6); g.stroke();
  g.fillStyle = '#2b2f36'; g.beginPath(); g.arc(32, 32, 9, 0, 6.283); g.fill(); g.strokeStyle = hsh(m, 0.5); g.lineWidth = 1.5; g.stroke();
  g.fillStyle = '#3a3e44'; g.fillRect(30, 7, 4, 16); g.fillRect(30, 41, 4, 16);
  if (/winding/.test(n)) { g.fillStyle = '#d8c070'; g.fillRect(6, 30, 52, 4); }
};
const IOV = {"laser_module":"nozzle","vfd":"cabinet","servo_drive":"cabinet","cnc_ctrl":"cabinet","breaker":"cabinet","jbox":"cabinet","fume_hood":"cabinet","rpv":"vessel","rpv_head":"vessel","steam_gen":"vessel","condenser":"vessel","comp_tank":"vessel","grp_tank":"vessel","hyd_pump":"pump","rcp":"pump","turbopump":"pump","gcms":"instrument","nmr":"instrument","ndfeb":"magnet","smco_magnet":"magnet","ba_ferrite":"magnet","alnico":"magnet","sc_magnet":"magnet","nmr_magnet":"magnet","ndfeb_block":"magnet","ndfeb_bare":"magnet","ndfeb_plated":"magnet","grad_coil":"magnet","rf_coil":"magnet","trafo_core":"magnet:core","amorph_core":"magnet:core","ferrite_core":"magnet:core","sic_mosfet":"comp","gan_hemt":"comp","saw_filter":"comp","varistor":"comp","ntc_thermistor":"comp","piezo_disc":"comp","teg":"comp","encoder":"comp","e_mult":"comp","vac_interrupter":"comp","surge_arrester":"comp","cucr":"comp","ultrasound_probe":"comp","gan_charger":"comp","graphene_hall":"comp","robot_arm":"robot","robot_joint":"robot","arm_casting":"robot","casting":"casting","pick_body":"casting","carbide_pick":"casting","bucket_tooth":"casting","bwe_bucket":"casting","mineral_cast":"casting","wax_pattern":"casting","ceramic_mould":"casting","green_shell":"casting","cutter_drum":"casting","slew_ring":"ring","slew_blank":"ring","rpv_ring":"ring","clad_ring":"ring","hyd_seal":"ring","flexspline":"ring","ball_screw":"shaft","linear_guide":"shaft","rotor_forging":"shaft","hyd_cyl":"shaft","crdm":"shaft","honed_tube":"shaft","solar_module":"panel","rooflight":"panel","sbr":"bale","neoprene":"bale","epdm":"bale","iir":"bale","nbr":"bale","pet_bale":"bale","fuel_asm":"bundle","control_rod":"bundle","spent_fuel":"bundle","quad_rods":"bundle","quadrupole":"bundle","transformer":"heavy","turbo_gen":"heavy","e_axle":"heavy","cork_board":"sheet","strand_board":"sheet","plasterboard":"sheet","particleboard":"sheet","hpl":"sheet","ccm":"sheet","tft_glass":"sheet","banana_paper":"sheet","bamboo_floor":"sheet","bipolar_plate":"sheet","pet_foam":"sheet","eggshell_membrane":"sheet","separator":"sheet","spar_cap":"sheet","mumetal":"sheet","shoyu_cake":"pile","palm_shell":"pile","coconut_shell":"pile","anode_slime":"pile","beet_pulp":"pile","bone_chip":"pile","steel_scrap":"pile","kelp_ash":"pile","mushroom_compost":"pile","spent_compost":"pile","ni_calcine":"pile","beta_spod":"pile","ndfeb_swarf":"pile","cullet":"pile","lino_cement":"pile","rape_meal":"pile","linseed_cake":"pile","copra_meal":"pile","pk_expeller":"pile","bran":"pile","rice_bran":"pile","bran_meal":"pile","husk_ash":"pile","rice_husk":"pile","rosin":"pile","shell_calcium":"sack","egg_powder":"sack","albumen_powder":"sack","feather_meal":"sack","potato_starch":"sack","banana_flour":"sack","potato_protein":"sack","sodium_nitrate":"sack","bio_detergent":"sack","wood_flour":"sack","linen_yarn":"yarn","bcf_yarn":"yarn","motor_oil":"bottle","choc_milk":"bottle","omega3":"bottle","rennet":"vial","lc_mix":"vial","ins_cartridge":"vial","grease":"paintcan","li_grease":"paintcan","ink":"paintcan","glaze":"paintcan","bike_cable":"coil","cord_belt":"coil","wire_rope":"coil","gc_column":"coil","acsr":"coil","pv_ribbon":"spool","metglas":"spool","ybco_tape":"spool","preform":"rod","rail_frog":"rod","ro_membrane":"rod","spent_membrane":"rod","mo_bar":"rod","superalloy":"ingot","soft_lead":"ingot","v_pig":"ingot","bismuth":"ingot","tellurium":"ingot","germanium":"ingot","alloy690":"ingot","tial":"ingot","wha":"ingot","solder":"ingot","sx_blade":"part:blade","spine_cage":"part","chrome_tap":"part","record78":"part:disc","pcd":"part:disc","ito_target":"part:disc","camera_lens":"lens","tel_mirror":"lens","flint_glass":"lens","cell_can":"can","traction_pack":"battery","bms_board":"board","graphite":"coal","bamboo_charcoal":"coal","crawler_shell":"ore","rutile":"ore","titanium":"ore","platinum":"ore","palladium":"ore","indium_sponge":"ore","cng_cart":"cyl","llzo":"pellet","ta_anode":"pellet","pva":"pellet","pfsa_resin":"pellet","ta_ox":"pellet","vial_stopper":"pellet","cork_stopper":"pellet","si3n4_ball":"pellet","led_chip":"chip","die":"chip","shoyu_koji":"grain","wheat_straw":"log","cork_plank":"log","tea_dhool":"leaf","citrus_peel":"fruit","tomato_peel":"fruit","palm_fruit":"fruit","retted_flax":"fluff","line_flax":"fluff","wetsuit":"garment","vaccine_shipper":"box","honey_frame":"box","agar_plates":"box","wax_cappings":"food","kiln_furniture":"brick","green_stack":"brick","grp_hull":"part:hull","cottonseed":"seeds"};
const ICLS = [
  [/flake\b/, 'pile'],
  [/hot band|pickled|decarburised|cold-rolled|grain-oriented|coated strip/, 'scoil'],
  [/winding/, 'coil'],
  [/insulin|mrna|plasmid|ivt enzymes|trypsin|lipid|lysozyme|inclusion bodies|nucleoside|\bdspc\b|^penicillin /, 'vial'],
  [/^(pom|pps|fep|emc|hot_melt|shellac|rosin_ester) /, 'pellet'],
  [/\bdross\b|heavies|mixed hydroxide|casing soil|molybdenite concentrate|coltan concentrate|barite concentrate|stibnite concentrate|potato pulp|wood chips|cane bagasse/, 'pile'],
  [/(kraft|bleached|dissolving|bagasse) pulp|carbonised strips|windscreen/, 'sheet'],
  [/(epoxy|alkyd|melamine|urea-formaldehyde) resin|oleoresin|sodium silicate|bitumen|orange concentrate/, 'drum'],
  [/instant coffee|baby food|^(lfp|nca|nmc) |lc cores/, 'jar'],
  [/yeast|polyacrylamide|bleaching earth|dicalcium phosphate|\bargol\b|soda ash|^potash /, 'sack'],
  [/aerogel|alcogel|green compact|porcelain body/, 'brick'],
  [/polysilicon/, 'ore'],
  [/^iodine /, 'crystal'],
  [/\brayon|oxidised pan/, 'fluff'],
  [/magazine|bracket/, 'part'],
  [/water filter/, 'cyl'],
  [/nanotubes$/, 'coal'],
  [/wheels and pinions/, 'gear'],
  [/^sulfur /, 'pile'],
  [/castor wax|stearin/, 'food'],
  [/scaffold/, 'log'],
  [/respirator|vest|armour tile|sic_tile/, 'vest'],
  [/shotgun/, 'gun'],
  [/cartridge(?!s)|shotshell|_shell\b|he shell|wp shell|powder_charge|ammonal_charge|black_powder|\btnt\b/, 'ammo'],
  [/_cyl\b|cylinder/, 'cyl'],
  [/drum\b|_drum|cask\b|keg/, 'drum'],
  [/insulin_pen|pen_needle|vial|contrast|ins_cartridge/, 'vial'],
  [/tablets|_pack|_tabs|caps\b|softgel/, 'pack'],
  [/smartphone|television|lcd_module|lcd_cell|watch|movement|led_lamp|mri|scanner|concentrator|cryocooler|camera\b|camera module|ecu\b|inverter|fc_stack|stack\b/, 'device'],
  [/eyeglass|binocular|telescope|microscope|camera_lens/, 'optic'],
  [/lens|mirror|prism|achromat/, 'lens'],
  [/bicycle|bike\b|road_bike|ebike|bamboo_bike|bike_frame|bamboo_frame|al_frame/, 'bike'],
  [/fc_bus|forklift/, 'vehicle'],
  [/tyre|wheel\b|road wheel|bike_wheel/, 'wheel'],
  [/battery|_cell\b|button_cell|pouch|alk_cell|li_cell|nca_cell|nmc_cell|solar_cell/, 'battery'],
  [/pcb|board\b|mainboard|control board|laminate|backplane|tft_array/, 'board'],
  [/microchip|mlcc|ta_cap|capacitor|connector|xtal|lead_frame/, 'chip'],
  [/wafer|\bdie\b|photomask|led_chip|tft_glass/, 'wafer'],
  [/boule|quartz_bar|ruby|sapphire\b|jewel|crystal\b|sapphire crystal|tuning_fork/, 'crystal'],
  [/gear|groupset|movement|watch_wheels/, 'gear'],
  [/motor\b|_motor|diesel_engine|traction/, 'motor'],
  [/drill_bit|insert|grinding|blade|propeller|turbine_disc|key_blank|\bbell\b|coins|bike_chain|bearing|spring|chassis|scaffold|nacelle|turbofan|combustor|hull_section|windscreen|jaw_plate|bogie|brake_pad|bipolar|zinc_anode|cat_converter|glass_seal/, 'part'],
  [/cordierite|honeycomb|_cat\b|catalyst|gauze|zeolite|sorbent|iex_resin|rp_silica|raney|ts1|ziegler|fcc_cat|pt_c|fe_cat|v_cat/, 'catalyst'],
  [/canned|tinned|food_can|beer_can|cola_can|\bcan\b/, 'can'],
  [/paint|antifouling|coating|french_polish|varnish/, 'paintcan'],
  [/bottle|bottled|jug|whisky|vodka|\brum\b|dark_rum|tequila|sake_bottle|mead|wine_bottle|perfume|tincture|sanitiser|shampoo|extract|syrup|jerrycan|adblue|motor_oil|soft drink|iced tea|soy sauce|olive oil|liquid smoke|flavouring|cleaner|de-icer|coconut oil|toothpaste/, 'bottle'],
  [/box|carton|punnet|crates|tea bags|bags\b|cubes|matches|odour/, 'box'],
  [/chocolate|cheese|bread|candle|crayon|lipstick|lip balm|gummy|gum\b|crisps|fries|margarine|butter\b|miso|mayonnaise|ketchup|tomato paste|ice cream|soap|tofu|cocoa butter|lanolin|beeswax|paraffin|jelly|grease/, 'food'],
  [/shoes|jumper|socks|scarf|silk_tie|gloves/, 'garment'],
  [/denim|linen|hessian|twill|silk fabric|carpet|prepreg|doormat|dressing|trawl|net\b|silk_fabric/, 'fabric'],
  [/wire|filament|bond_wire|optic_fibre|sc_wire|nitinol_wire|w_wire|copper_wire/, 'spool'],
  [/cable|rope|twine|fishing_line|suture|fuel_line/, 'coil'],
  [/yarn|thread|organzine|silk thread/, 'yarn'],
  [/fibre|fiber|_top\b|wool|lint|tow\b|raw_silk|degummed|bristles|seed cotton|stone_wool|coir/, 'fluff'],
  [/hide|pelt|wet_blue|leather|bones|feather|carcass|beef|fish\b|whole fish|sardine|chicken|broiler|chick\b|chicks|eggs|egg\b|hatching|cocoon|pupae|fat_trim/, 'animal'],
  [/banana|grape|olives|coconut\b|coconuts|potato|tomatoes|oranges|beet|apple|cocoa_beans|ffb|fruit bunch|pina|piña/, 'fruit'],
  [/wheat\b|barley|maize|paddy|brown_rice|white_rice|rice\b|hops/, 'grain'],
  [/seed|beans|nuts|kernel|copra\b|soybeans|castor_bean|linseed|rapeseed|cottonseed|nibs|coffee|malt\b|koji|spawn|vanilla_pods|green_vanilla|cochineal|sticklac|seedlac/, 'seeds'],
  [/leaf|leaves|kelp|seaweed|cottonii|gracilaria|mushroom|shiitake|oyster|hops/, 'leaf'],
  [/wood\b|pulpwood|log|bamboo|straw|stalk|culm|bark|cane\b|sugarcane|pseudostem|flax_straw|jute_stalk|sisal_leaf|abaca_stalk|pole/, 'log'],
  [/plate\b|sheet|foil|tinplate|galv|anodised|glazing|film|membrane|glass\b|float glass|polycarbonate|acrylic sheet|plasterboard|particleboard|board|worktop|linoleum|vinyl|paper|polariser|cellophane|sandpaper|hpl|cover_glass|touch_glass|disp_glass|cf_glass|cf_raw|invar_sheet|lead_sheet|copper_foil|decor|teabag_paper|banana_paper|kraft|photo_paper|xray|myco_tray|tableware|cups|pla_cup|tiles?\b|sponge|gdl|ccm|mea\b|pfsa/, 'sheet'],
  [/tube|rebar|rod|pole|rail\b|rail_bar|crmo_tube|cuni_tube|al_tube/, 'rod'],
  [/brick|concrete|precast|sleeper|block|paver|tiles|sanitaryware|insulator|greenware|bone_china|frog/, 'brick'],
  [/cathode\b|copper_cathode|zinc cathode|nickel cathode/, 'cathode'],
  [/pig_iron|ingot|bullion|blister|matte|ferro|femn|simn|regulus|_metal\b|steel\b|bronze|brass|pewter|babbitt|invar|kovar|monel|cupronickel|nickel silver|superalloy|inconel|ti-6|master alloy|niobium-titanium|chromoly steel|hadfield|^aluminium|^magnesium|lead bullion|^tin\b|zinc cathode|^silver|^gold|sponge|^chromium|^niobium|rhenium|^indium|titanium sponge|^sodium|^gallium|zircaloy|nitinol|doré|dore|^copper_matte|stainless|v_steel|mn_steel|ti64|in718|nbti|v_al|cuni\b|phos_bronze|anodised/, 'ingot'],
  [/pellets|chips\b|resin\b|polyethylene|polypropylene|pvc|ptfe|uhmwpe|\bpet\b|pla\b|abs\b|pbt\b|eva\b|nylon|silicone|pva\b|pmma|polymer|beads/, 'pellet'],
  [/coal\b|coke|charcoal|carbon black|graphite|pitch|black ash|carbon anode|activated carbon|anode\b|shell charcoal|spent carbon/, 'coal'],
  [/ore\b|_ore|reef|laterite|bauxite|chromite|spodumene|sylvinite|caliche|uraninite|cassiterite|wolframite|molybdenite|coltan\b|barite\b|fluorspar|phosphate rock|limestone|rock salt|gypsum\b|kaolin|feldspar|monazite|ilmenite|rutile|zircon\b|cryolite|borax|stibnite|carapace|crawler shell|crawler_shell|queen/, 'ore'],
  [/crushed|ground |_conc\b|concentrate|rougher|tailings|sand\b|calcine|cinder|slag|mud\b|sinter|clinker|cullet|husk|wood chips|granules|peat|digestate|litter|compost|press mud|pomace|bagasse|okara|spent|slime|residue|scrap|recycl|bale|asphalt|black_ash|smelt|salt cake|lime mud|tow|efb|empty fruit|meal\b|cake\b|expeller|ddgs|grains\b|pulp\b|bran\b|ash\b|shell\b|kasu|lees/, 'pile'],
  [/cement|fertil|potash|urea|npk|superphosphate|diammonium|flour|starch|feed|premix|fishmeal|detergent|washing powder|stucco|plaster of paris|sugar\b|raw sugar|salt\b|iodised|milk powder|whey protein|egg powder|white powder|baking powder|quicklime|slaked|soda ash|amm_sulfate|ammonium sulfate|ammonium nitrate|sodium nitrate|cocoa powder|instant coffee|tea\b|black_tea|green_tea|dextrin|gelatin|pectin|agar\b|carrageenan|alginate|impression|maple sugar|china clay/, 'sack']
];
function iArch(k, n) { if (IOV[k]) return IOV[k].split(':')[0]; const s = (k + ' ' + n).toLowerCase(); for (const [re, a] of ICLS) if (re.test(s)) return a; return 'jar'; }

const MARCH = [
  [/glasshouse|greenhouse|vertical farm/, 'glass'],
  [/pond|paddy|seaweed|aquacult|fish farm|salt pan|evap/, 'water'],
  [/grove|orchard|forest|estate|plantation|vanilla|lac_|palm|coconut|banana|bamboo|citrus|olive|cork|rubber|tea_|sugarbush|maple/, 'trees'],
  [/field|farm\b|^farm|cane|nopal|agave|harvester|garden/, 'field'],
  [/ranch|dairy|station|apiary|house\b|layer|broiler|kerb|stable|pig|hatch|coop|barn/, 'barn'],
  [/pumpjack|_well|well\b|geo_|inj_|gas_well/, 'well'],
  [/^miner|mine\b|quarry|drill/, 'mine'],
  [/rotary|kiln_rot|tan_drum|drum\b|tumbl|ball mill|dryer/, 'rotary'],
  [/furnace|kiln|oven|smelter|blast|cupola|roaster|converter|arc\b|^pot\b|retort|melter|kettle|pit\b|pusher|acheson|tank furnace|glass_tank|float|vim\b|ds_|fusion|forge|caster|cast\b|draw|verneuil/, 'furnace'],
  [/column|still|cdu|vdu|tower|cracker|distil|ostwald|ao_|claus|scrubber|absorb|adsorb|reformer|ix_|sx_|stripper|flash/, 'column'],
  [/centrifug|separat|spinner|cyclone|magsep|esep|spiral|flotation|decant|gin\b|skimmer/, 'centrifuge'],
  [/electro|_cell|cell\b|ew_|bath|plating|electrolys|anod|mn_cell|pot line/, 'electro'],
  [/reactor|autoclave|haber|hydrogenat|chlorinat|phos_|xanth|pla_|polymer|synth|precipitat|granulat|leach|nitr|digester|crystalli|cryst|solvay|producer|iodine|pgm|extractor/, 'reactor'],
  [/tank|ferment|brew|settler|thicken|clarif|water_works|ad_plant|ro_plant|treat|blender|disperser|mix|dairy|cheese|vat/, 'tank'],
  [/crush|grind|shred|mrf|pulver|chipper|mill\b|_mill|roller_mill|wet_mill|blunger|breaker|hammer/, 'crusher'],
  [/press|stamp|mould|molder|moulder|extrud|calender|roll|bar_mill|forging|sheet|rolling/, 'press'],
  [/pharma|wafer|fab\b|clean|litho|lab\b|pcb|chip|optic|fiber|fibre|draw_tower|semicon|assembl|battery_line|lens|sensor/, 'clean'],
  [/gen\b|_gen|turbine|boiler|fuel_cell|pwr|hrsg|recovery|engine|bank|reactor_pwr|power/, 'power'],
  [/line|loom|frame|weav|knit|bottler|fill|pack|range|machine|sew|shoe|bakery|layup|spray|tin_|board|paper|print|cann|label|wrap|assembly|conveyor|workshop/, 'line']
];
function mArch(t) { const B = BUILD[t], s = (t + ' ' + (B.n || '') + ' ' + (B.cat || '')).toLowerCase(); for (const [re, a] of MARCH) if (re.test(s)) return a; return 'plant'; }
function mLay(t) {
  if (TX.lay.has(t)) return TX.lay.get(t);
  const B = BUILD[t], W = B.w, H = B.h, r = mulberry32(strH(t)), a = mArch(t), F = [];
  const R = (lo, hi) => lo + (hi - lo) * r(), I = (lo, hi) => Math.floor(R(lo, hi + 1)), P = q => q[Math.floor(r() * q.length)];
  const add = (k, o) => F.push(Object.assign({ k }, o));
  const ground = ({ field: 'soil', trees: 'soil', barn: 'yard', water: 'yard', glass: 'yard', well: 'gravel', mine: 'gravel' })[a] || P(['pad', 'pad', 'gravel', 'plate']);
  const side = r() < 0.5, flip = r() < 0.5;
  if (a === 'furnace') {
    const hh = H * R(0.5, 0.66);
    add('house', { x: 0.12, y: H - hh - 0.1, w: W - 0.24, h: hh, roof: P(['ridge', 'flat', 'saw']) });
    add('glow', { x: W * R(0.3, 0.55), y: H - 0.24, w: W * R(0.18, 0.32), h: 0.12 });
    const ns = I(1, W >= 3 ? 3 : 2);
    for (let i = 0; i < ns; i++) add('stack', { x: W * (0.2 + 0.6 * (ns === 1 ? R(0.2, 0.8) : i / (ns - 1))), y: R(0.3, H - hh - 0.15), r: R(0.13, 0.22) });
    if (r() < 0.6) add('hopper', { x: flip ? W - 0.62 : 0.14, y: 0.1, w: 0.48, h: 0.42 });
    if (r() < 0.5) add('pipe', { x0: 0.1, y0: H * 0.28, x1: W - 0.1, y1: H * 0.28 });
  } else if (a === 'rotary') {
    const vert = r() < 0.3;
    add(vert ? 'drumv' : 'drum', vert ? { x: W * 0.5, y: 0.2, l: H - 0.4, r: R(0.32, 0.42) } : { x: 0.18, y: H * R(0.42, 0.58), l: W - 0.36, r: R(0.3, 0.42) });
    add('house', { x: flip ? W - 0.82 : 0.1, y: 0.1, w: 0.7, h: 0.55, roof: 'flat' });
    add('stack', { x: flip ? 0.4 : W - 0.4, y: 0.42, r: 0.16 });
    add('motor', { x: W * 0.5, y: H - 0.3 });
  } else if (a === 'column') {
    const n = I(1, Math.min(4, W + H - 3));
    for (let i = 0; i < n; i++) add('tower', { x: W * (0.25 + 0.5 * (n === 1 ? 0.5 : i / (n - 1))) + R(-0.1, 0.1), y: H * R(0.3, 0.5), r: R(0.26, 0.4) });
    add('rack', { x0: 0.12, y0: H * 0.78, x1: W - 0.12, y1: H * 0.78 });
    if (r() < 0.7) add('vessel', { x: flip ? 0.42 : W - 0.42, y: H - 0.4, r: 0.22 });
    if (r() < 0.6) add('fanbank', { x: 0.15, y: H - 0.42, w: Math.min(1.2, W * 0.4), h: 0.3 });
    if (r() < 0.5) add('flare', { x: flip ? W - 0.25 : 0.25, y: 0.25, r: 0.08 });
  } else if (a === 'tank') {
    const n = I(1, Math.min(4, W * H > 4 ? 4 : 2)), cols = n > 2 ? 2 : n, rows = Math.ceil(n / cols);
    for (let i = 0; i < n; i++) { const cx = (i % cols + 0.5) * W / cols, cy = (Math.floor(i / cols) + 0.5) * (H - 0.3) / rows + 0.05; add('tank', { x: cx, y: cy, r: Math.min(W / cols, (H - 0.3) / rows) * R(0.34, 0.42), agit: r() < 0.6 }); }
    add('rack', { x0: 0.1, y0: H - 0.2, x1: W - 0.1, y1: H - 0.2 });
    if (r() < 0.5) add('panel', { x: flip ? 0.1 : W - 0.42, y: H - 0.5, w: 0.32, h: 0.22 });
  } else if (a === 'reactor') {
    add('vessel', { x: W * R(0.42, 0.58), y: H * R(0.4, 0.5), r: Math.min(W, H) * R(0.24, 0.32), agit: true, dome: true });
    const nv = I(0, 2);
    for (let i = 0; i < nv; i++) add('vessel', { x: i ? 0.35 : W - 0.35, y: 0.32, r: 0.2 });
    add('pipe', { x0: 0.12, y0: H - 0.25, x1: W - 0.12, y1: H - 0.25 });
    add('pipe', { x0: side ? 0.2 : W - 0.2, y0: 0.15, x1: side ? 0.2 : W - 0.2, y1: H - 0.25 });
    add('panel', { x: flip ? 0.1 : W - 0.45, y: H - 0.6, w: 0.34, h: 0.26 });
    if (r() < 0.4) add('stack', { x: flip ? W - 0.28 : 0.28, y: H * 0.5, r: 0.11 });
  } else if (a === 'centrifuge') {
    const n = W * H >= 9 ? I(3, 4) : I(2, 3);
    for (let i = 0; i < n; i++) { const ang = i / n * Math.PI * 2 + R(0, 1); add('rotor', { x: W / 2 + Math.cos(ang) * W * 0.25, y: H / 2 - 0.05 + Math.sin(ang) * H * 0.22, r: Math.min(W, H) * R(0.16, 0.22) }); }
    add('pipe', { x0: 0.12, y0: H - 0.2, x1: W - 0.12, y1: H - 0.2 });
  } else if (a === 'electro') {
    const cols = I(2, Math.max(2, W + 1)), rows = I(2, Math.max(2, H));
    add('cells', { x: 0.18, y: 0.32, w: W - 0.36, h: H - 0.72, cols, rows });
    add('bus', { x0: 0.15, y0: 0.18, x1: W - 0.15, y1: 0.18 });
    add('bus', { x0: 0.15, y0: H - 0.28, x1: W - 0.15, y1: H - 0.28 });
    add('panel', { x: flip ? 0.1 : W - 0.45, y: 0.06, w: 0.35, h: 0.1 });
  } else if (a === 'press') {
    add('house', { x: 0.15, y: 0.12, w: W - 0.3, h: H * 0.42, roof: 'flat' });
    add('ram', { x: W * 0.5, y: H * 0.34, w: W * R(0.35, 0.55) });
    add('belt', { x: 0.08, y: H * 0.68, w: W - 0.16, h: 0.28, dir: flip ? -1 : 1 });
    if (r() < 0.6) add('cyl', { x: W * 0.25, y: H * 0.36 }), add('cyl', { x: W * 0.75, y: H * 0.36 });
  } else if (a === 'crusher') {
    add('hopper', { x: W * 0.5 - 0.5, y: 0.12, w: 1, h: H * 0.5 });
    add('jaw', { x: W * 0.5, y: H * 0.32, r: 0.26 });
    add('belt', { x: W * 0.5 - 0.17, y: H * 0.6, w: 0.34, h: H * 0.38, dir: 1, v: true });
    add('motor', { x: flip ? 0.35 : W - 0.35, y: H * 0.35 });
    if (r() < 0.5) add('pile', { x: flip ? W - 0.4 : 0.4, y: H - 0.4, r: 0.3 });
  } else if (a === 'clean') {
    add('house', { x: 0.08, y: 0.08, w: W - 0.16, h: H - 0.16, roof: 'white' });
    const nf = I(2, Math.min(6, W * H));
    for (let i = 0; i < nf; i++) add('fan', { x: 0.4 + (W - 0.8) * ((i % 3) / 2), y: 0.42 + (H - 0.84) * (Math.floor(i / 3) % 2), r: R(0.14, 0.2) });
    add('win', { x: 0.2, y: H - 0.3, w: W - 0.4, h: 0.1 });
  } else if (a === 'line') {
    const vert = H > W;
    add('belt', vert ? { x: W * 0.5 - 0.17, y: 0.1, w: 0.34, h: H - 0.2, dir: 1, v: true } : { x: 0.08, y: H * 0.5 - 0.15, w: W - 0.16, h: 0.3, dir: flip ? -1 : 1 });
    const n = I(2, Math.max(2, (vert ? H : W) + 1));
    for (let i = 0; i < n; i++) { const f = (i + 0.5) / n; add('station', vert ? { x: W * 0.5, y: 0.1 + f * (H - 0.2), s: R(0.3, 0.42) } : { x: 0.1 + f * (W - 0.2), y: H * 0.5, s: R(0.3, 0.42) }); }
    add('house', vert ? { x: side ? 0.08 : W - 0.48, y: 0.1, w: 0.4, h: H - 0.2, roof: 'saw' } : { x: 0.1, y: side ? 0.06 : H - 0.46, w: W - 0.2, h: 0.4, roof: 'saw' });
  } else if (a === 'power') {
    add('house', { x: 0.1, y: H * 0.35, w: W - 0.2, h: H * 0.55, roof: 'flat' });
    const nf = I(1, W);
    for (let i = 0; i < nf; i++) add('fan', { x: (i + 0.5) * W / nf, y: H * 0.6, r: Math.min(0.3, W / nf * 0.32) });
    add('stack', { x: flip ? 0.3 : W - 0.3, y: H * 0.22, r: R(0.12, 0.2) });
    add('vessel', { x: flip ? W - 0.4 : 0.4, y: H * 0.18, r: 0.16 });
  } else if (a === 'field' || a === 'trees') {
    if (a === 'field') add('rows', { x: 0.08, y: 0.08, w: W - 0.16, h: H - 0.16, n: I(4, 7) * Math.ceil(H / 2), vert: r() < 0.5 });
    else { const n = I(4, 6) * Math.ceil(W * H / 6); for (let i = 0; i < n; i++) add('tree', { x: R(0.35, W - 0.35), y: R(0.35, H - 0.6), r: R(0.22, 0.34) }); }
    add('shed', { x: flip ? W - 0.75 : 0.12, y: H - 0.6, w: 0.62, h: 0.48 });
  } else if (a === 'barn') {
    const n = I(1, Math.min(3, W - 1));
    for (let i = 0; i < n; i++) add('house', { x: 0.12 + i * (W - 0.24) / n, y: 0.12, w: (W - 0.24) / n - 0.1, h: H * 0.55, roof: 'ridge' });
    add('fence', { x: 0.1, y: H * 0.7, w: W - 0.2, h: H * 0.28 });
    const na = I(2, 5);
    for (let i = 0; i < na; i++) add('beast', { x: R(0.3, W - 0.3), y: H * R(0.76, 0.92), s: R(0.1, 0.14) });
    add('silo', { x: flip ? 0.3 : W - 0.3, y: H * 0.64, r: 0.16 });
  } else if (a === 'water') {
    add('pool', { x: 0.15, y: 0.15, w: W - 0.3, h: H - 0.5 });
    add('pipe', { x0: 0.1, y0: H - 0.22, x1: W - 0.1, y1: H - 0.22 });
    add('shed', { x: flip ? 0.12 : W - 0.74, y: H - 0.42, w: 0.6, h: 0.34 });
  } else if (a === 'glass') {
    add('glasshouse', { x: 0.08, y: 0.08, w: W - 0.16, h: H - 0.16, n: I(3, 5) });
    add('fan', { x: W - 0.3, y: 0.3, r: 0.14 });
  } else if (a === 'well') {
    add('jack', { x: W * 0.5, y: H * 0.55, l: W * 0.42 });
    add('vessel', { x: flip ? 0.38 : W - 0.38, y: 0.36, r: 0.24 });
    add('pipe', { x0: W * 0.5, y0: H * 0.55, x1: flip ? 0.38 : W - 0.38, y1: 0.36 });
  } else if (a === 'mine') {
    add('pit', { x: W * 0.5, y: H * 0.5, r: Math.min(W, H) * 0.34 });
    add('derrick', { x: W * 0.5, y: H * 0.5, r: Math.min(W, H) * 0.28 });
  } else {
    add('house', { x: 0.1, y: 0.1, w: W * R(0.5, 0.65), h: H - 0.2, roof: P(['flat', 'saw', 'ridge']) });
    add('tank', { x: W * 0.8, y: H * 0.32, r: Math.min(0.42, W * 0.15), agit: false });
    add('fan', { x: W * 0.8, y: H * 0.75, r: 0.2 });
    add('pipe', { x0: W * 0.6, y0: H * 0.32, x1: W * 0.8, y1: H * 0.32 });
  }
  const L = { a, F, ground, W, H, seed: strH(t) };
  TX.lay.set(t, L);
  return L;
}
function mGround(g, L, s, c, rr) {
  const W = L.W * s, H = L.H * s;
  const base = { soil: '#5a4630', yard: '#6e6a5c', gravel: '#77736b', pad: '#8d8a84', plate: '#646a70' }[L.ground];
  g.fillStyle = hsh(base, 0.7); g.fillRect(0, 0, W, H);
  g.fillStyle = lgr(g, 0, 0, W, H, hsh(base, 1.12), base, hsh(base, 0.86)); g.fillRect(s * 0.04, s * 0.04, W - s * 0.08, H - s * 0.08);
  if (L.ground === 'pad') { g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = Math.max(1, s * 0.015); for (let i = 1; i < L.W; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, H); g.stroke(); } for (let j = 1; j < L.H; j++) { g.beginPath(); g.moveTo(0, j * s); g.lineTo(W, j * s); g.stroke(); } }
  if (L.ground === 'plate') { g.fillStyle = 'rgba(255,255,255,0.08)'; for (let i = 0; i < L.W * L.H * 6; i++) { const x = rr() * W, y = rr() * H; g.fillRect(x, y, s * 0.12, s * 0.02); } }
  if (L.ground === 'gravel' || L.ground === 'yard') for (let i = 0; i < L.W * L.H * 40; i++) { g.fillStyle = rr() < 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.08)'; g.fillRect(rr() * W, rr() * H, s * 0.03, s * 0.03); }
  if (L.ground !== 'soil') { g.fillStyle = 'rgba(230,190,40,0.85)'; const hz = s * 0.05; for (let i = 0; i < L.W * 4; i++) if (i % 2 === 0) { g.fillRect(i * s / 4, 0, s / 4, hz); g.fillRect(i * s / 4, H - hz, s / 4, hz); } }
}
function mFeat(g, f, s, c, rr) {
  const X = v => v * s, lw = Math.max(1, s * 0.03), dk = hsh(c, 0.5), lt = hsh(c, 1.3), steel = '#8f969c';
  g.lineWidth = lw;
  switch (f.k) {
    case 'house': {
      const x = X(f.x), y = X(f.y), w = X(f.w), h = X(f.h);
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x + s * 0.05, y + s * 0.06, w, h);
      const rc = f.roof === 'white' ? '#dfe3e6' : c;
      g.fillStyle = lgr(g, x, y, x + w * 0.4, y + h, hsh(rc, 1.18), rc, hsh(rc, 0.78)); g.fillRect(x, y, w, h);
      g.strokeStyle = hsh(rc, 0.55); g.strokeRect(x + lw / 2, y + lw / 2, w - lw, h - lw);
      if (f.roof === 'ridge') { g.fillStyle = hsh(rc, 0.82); g.fillRect(x, y + h / 2, w, h / 2); g.strokeStyle = hsh(rc, 1.35); g.beginPath(); g.moveTo(x, y + h / 2); g.lineTo(x + w, y + h / 2); g.stroke(); }
      else if (f.roof === 'saw') { const n = Math.max(2, Math.round(f.w * 2.5)); for (let i = 0; i < n; i++) { g.fillStyle = hsh(rc, 0.75); g.fillRect(x + w * i / n, y, w / n * 0.35, h); g.fillStyle = 'rgba(160,200,230,0.55)'; g.fillRect(x + w * i / n + w / n * 0.35, y + lw, lw * 1.5, h - lw * 2); } }
      else { g.strokeStyle = 'rgba(0,0,0,0.12)'; for (let i = 1; i < f.w * 5; i++) { g.beginPath(); g.moveTo(x + i * s / 5, y + lw); g.lineTo(x + i * s / 5, y + h - lw); g.stroke(); } if (f.roof !== 'white') { g.fillStyle = hsh(rc, 0.6); g.fillRect(x + w * 0.1, y + h * 0.18, s * 0.22, s * 0.14); } }
      break;
    }
    case 'stack': {
      const x = X(f.x), y = X(f.y), R = X(f.r);
      dshad(g, x + R * 0.4, y + R * 0.5, R, R * 0.8);
      g.fillStyle = rgr(g, x, y, R, '#b4aca2', '#5e5852'); g.beginPath(); g.arc(x, y, R, 0, 7); g.fill();
      g.fillStyle = '#b8352e'; g.beginPath(); g.arc(x, y, R * 0.82, 0, 7); g.fill();
      g.fillStyle = '#e8e4de'; g.beginPath(); g.arc(x, y, R * 0.66, 0, 7); g.fill();
      g.fillStyle = '#16120f'; g.beginPath(); g.arc(x, y, R * 0.5, 0, 7); g.fill();
      break;
    }
    case 'glow': { const x = X(f.x), y = X(f.y), w = X(f.w), h = X(f.h); g.fillStyle = '#2a1a12'; g.fillRect(x - lw, y - lw, w + lw * 2, h + lw * 2); g.fillStyle = '#6a2a10'; g.fillRect(x, y, w, h); break; }
    case 'hopper': { const x = X(f.x), y = X(f.y), w = X(f.w), h = X(f.h); g.fillStyle = hsh(steel, 0.8); poly(g, [x, y, x + w, y, x + w * 0.7, y + h, x + w * 0.3, y + h]); g.fill(); g.strokeStyle = '#3a3e42'; g.stroke(); g.fillStyle = hsh(c, 0.45); poly(g, [x + w * 0.12, y + h * 0.1, x + w * 0.88, y + h * 0.1, x + w * 0.66, y + h * 0.8, x + w * 0.34, y + h * 0.8]); g.fill(); break; }
    case 'pipe': case 'rack': case 'bus': {
      const col2 = f.k === 'bus' ? '#c87a3a' : f.k === 'rack' ? '#7a7f84' : hmix(c, '#9aa0a6', 0.6);
      g.lineCap = 'round'; g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = s * (f.k === 'rack' ? 0.16 : 0.1) + 2; g.beginPath(); g.moveTo(X(f.x0), X(f.y0)); g.lineTo(X(f.x1), X(f.y1)); g.stroke();
      g.strokeStyle = col2; g.lineWidth = s * (f.k === 'rack' ? 0.16 : 0.1); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = Math.max(1, s * 0.025); g.stroke();
      if (f.k === 'rack') { g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = lw; const L = Math.hypot(f.x1 - f.x0, f.y1 - f.y0); for (let i = 0; i <= L * 3; i++) { const t = i / (L * 3), px = X(f.x0 + (f.x1 - f.x0) * t), py = X(f.y0 + (f.y1 - f.y0) * t); g.beginPath(); g.moveTo(px, py - s * 0.1); g.lineTo(px, py + s * 0.1); g.stroke(); } }
      g.lineCap = 'butt';
      break;
    }
    case 'drum': case 'drumv': {
      const vv = f.k === 'drumv', x = X(f.x), y = X(f.y), l = X(f.l), R = X(f.r);
      const bx = vv ? x - R : x, by = vv ? y : y - R, bw = vv ? 2 * R : l, bh = vv ? l : 2 * R;
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(bx + s * 0.06, by + s * 0.08, bw, bh);
      g.fillStyle = vv ? lgr(g, bx, 0, bx + bw, 0, hsh(c, 0.6), hsh(c, 1.3), hsh(c, 0.55)) : lgr(g, 0, by, 0, by + bh, hsh(c, 0.6), hsh(c, 1.3), hsh(c, 0.55));
      rrect(g, bx, by, bw, bh, R * 0.3); g.fill();
      g.fillStyle = '#3a3a3c'; for (const t of [0.22, 0.78]) vv ? g.fillRect(bx - lw, by + bh * t - s * 0.05, bw + lw * 2, s * 0.1) : g.fillRect(bx + bw * t - s * 0.05, by - lw, s * 0.1, bh + lw * 2);
      break;
    }
    case 'motor': { const x = X(f.x), y = X(f.y); g.fillStyle = '#2f4f6f'; rrect(g, x - s * 0.16, y - s * 0.1, s * 0.32, s * 0.2, s * 0.04); g.fill(); g.strokeStyle = '#1a2a3a'; g.stroke(); g.fillStyle = 'rgba(255,255,255,0.2)'; for (let i = 0; i < 4; i++) g.fillRect(x - s * 0.12 + i * s * 0.07, y - s * 0.08, lw, s * 0.16); break; }
    case 'tower': {
      const x = X(f.x), y = X(f.y), R = X(f.r);
      dshad(g, x + R * 0.5, y + R * 0.6, R * 1.05, R * 0.9);
      g.fillStyle = rgr(g, x, y, R, hsh(hmix(c, '#c8ccd0', 0.55), 1.25), hsh(hmix(c, '#c8ccd0', 0.55), 0.6)); g.beginPath(); g.arc(x, y, R, 0, 7); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.45)'; g.stroke();
      g.strokeStyle = '#d9b234'; g.lineWidth = Math.max(1, s * 0.035); g.beginPath(); g.arc(x, y, R * 1.08, -0.4, 1.9); g.stroke();
      g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = lw; for (const q of [0.4, 0.7]) { g.beginPath(); g.arc(x, y, R * q, 0, 7); g.stroke(); }
      g.fillStyle = '#4a4e52'; g.beginPath(); g.arc(x, y, R * 0.16, 0, 7); g.fill();
      break;
    }
    case 'vessel': case 'tank': case 'silo': {
      const x = X(f.x), y = X(f.y), R = X(f.r), bc = f.k === 'tank' ? hmix(c, '#d8dcdf', 0.6) : f.k === 'silo' ? '#b9bcbf' : hmix(c, '#a8b0b6', 0.4);
      dshad(g, x + R * 0.35, y + R * 0.45, R * 1.02, R * 0.85);
      g.fillStyle = rgr(g, x, y, R, hsh(bc, 1.3), hsh(bc, 0.62)); g.beginPath(); g.arc(x, y, R, 0, 7); g.fill();
      g.strokeStyle = hsh(bc, 0.45); g.lineWidth = lw; g.stroke();
      if (f.dome || f.k === 'silo') { g.strokeStyle = 'rgba(0,0,0,0.2)'; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.beginPath(); g.moveTo(x + Math.cos(a) * R * 0.2, y + Math.sin(a) * R * 0.2); g.lineTo(x + Math.cos(a) * R * 0.95, y + Math.sin(a) * R * 0.95); g.stroke(); } }
      else if (f.k === 'tank') { g.strokeStyle = 'rgba(0,0,0,0.15)'; g.beginPath(); g.arc(x, y, R * 0.72, 0, 7); g.stroke(); }
      if (f.agit) { g.fillStyle = '#3c5a78'; rrect(g, x - R * 0.28, y - R * 0.28, R * 0.56, R * 0.56, R * 0.1); g.fill(); g.strokeStyle = '#1e2e3e'; g.stroke(); }
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.arc(x - R * 0.4, y - R * 0.42, R * 0.18, 0, 7); g.fill();
      break;
    }
    case 'panel': { const x = X(f.x), y = X(f.y), w = X(f.w), h = X(f.h); g.fillStyle = '#d4d6d2'; g.fillRect(x, y, w, h); g.strokeStyle = '#555'; g.strokeRect(x, y, w, h); g.fillStyle = '#2a2e34'; g.fillRect(x + w * 0.12, y + h * 0.2, w * 0.45, h * 0.5); break; }
    case 'fanbank': { const x = X(f.x), y = X(f.y), w = X(f.w), h = X(f.h); g.fillStyle = '#5a6066'; g.fillRect(x, y, w, h); const n = Math.max(2, Math.round(f.w / 0.3)); g.fillStyle = '#23272b'; for (let i = 0; i < n; i++) { g.beginPath(); g.arc(x + (i + 0.5) * w / n, y + h / 2, Math.min(w / n, h) * 0.4, 0, 7); g.fill(); } break; }
    case 'flare': { const x = X(f.x), y = X(f.y); g.fillStyle = '#6a6e72'; g.beginPath(); g.arc(x, y, X(f.r), 0, 7); g.fill(); g.strokeStyle = '#d33'; g.stroke(); break; }
    case 'rotor': { const x = X(f.x), y = X(f.y), R = X(f.r); dshad(g, x + R * 0.3, y + R * 0.4, R, R * 0.8); g.fillStyle = rgr(g, x, y, R, '#e4e8ec', '#7c848c'); g.beginPath(); g.arc(x, y, R, 0, 7); g.fill(); g.strokeStyle = '#3c4044'; g.stroke(); g.fillStyle = hsh(c, 0.8); g.beginPath(); g.arc(x, y, R * 0.55, 0, 7); g.fill(); break; }
    case 'cells': {
      const x = X(f.x), y = X(f.y), w = X(f.w), h = X(f.h), cw = w / f.cols, ch = h / f.rows;
      for (let j = 0; j < f.rows; j++) for (let i = 0; i < f.cols; i++) {
        const cx = x + i * cw, cy = y + j * ch;
        g.fillStyle = '#3a3634'; g.fillRect(cx + lw, cy + lw, cw - lw * 2, ch - lw * 2);
        g.fillStyle = hmix(c, '#2a6a8a', 0.5); g.fillRect(cx + lw * 2.5, cy + lw * 2.5, cw - lw * 5, ch - lw * 5);
        g.fillStyle = '#b87333'; for (let q = 1; q < 4; q++) g.fillRect(cx + cw * q / 4 - lw / 2, cy + lw * 2.5, lw, ch - lw * 5);
      }
      break;
    }
    case 'ram': { const x = X(f.x), y = X(f.y), w = X(f.w); g.fillStyle = '#3c4046'; g.fillRect(x - w / 2, y - s * 0.16, w, s * 0.32); g.fillStyle = lgr(g, 0, y - s * 0.12, 0, y + s * 0.12, '#9aa2aa', '#5a6066'); g.fillRect(x - w / 2 + lw * 2, y - s * 0.12, w - lw * 4, s * 0.24); g.fillStyle = '#e0b830'; for (let i = 0; i < 6; i++) if (i % 2 === 0) g.fillRect(x - w / 2 + i * w / 6, y + s * 0.12, w / 6, s * 0.04); break; }
    case 'cyl': { const x = X(f.x), y = X(f.y); g.fillStyle = rgr(g, x, y, s * 0.1, '#e8ecef', '#6c7278'); g.beginPath(); g.arc(x, y, s * 0.1, 0, 7); g.fill(); break; }
    case 'belt': { const x = X(f.x), y = X(f.y), w = X(f.w), h = X(f.h); g.fillStyle = '#4a4a4a'; g.fillRect(x, y, w, h); g.fillStyle = '#1f1f1f'; g.fillRect(x + (f.v ? lw * 1.5 : 0), y + (f.v ? 0 : lw * 1.5), w - (f.v ? lw * 3 : 0), h - (f.v ? 0 : lw * 3)); break; }
    case 'jaw': { const x = X(f.x), y = X(f.y), R = X(f.r); g.fillStyle = '#2a2c2e'; g.fillRect(x - R, y - R * 0.5, R * 2, R); g.fillStyle = '#7a7f84'; for (let i = 0; i < 5; i++) { poly(g, [x - R + i * R * 0.4, y - R * 0.5, x - R + (i + 0.5) * R * 0.4, y, x - R + (i + 1) * R * 0.4, y - R * 0.5]); g.fill(); } break; }
    case 'pile': { const x = X(f.x), y = X(f.y), R = X(f.r); g.fillStyle = rgr(g, x, y, R, hsh(c, 1.2), hsh(c, 0.55)); g.beginPath(); g.ellipse(x, y, R, R * 0.75, 0, 0, 7); g.fill(); for (let i = 0; i < 14; i++) { g.fillStyle = rr() < 0.5 ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.18)'; g.fillRect(x + (rr() - 0.5) * R * 1.4, y + (rr() - 0.5) * R, s * 0.03, s * 0.03); } break; }
    case 'fan': { const x = X(f.x), y = X(f.y), R = X(f.r); g.fillStyle = '#4e545a'; g.fillRect(x - R * 1.15, y - R * 1.15, R * 2.3, R * 2.3); g.fillStyle = '#16191c'; g.beginPath(); g.arc(x, y, R, 0, 7); g.fill(); break; }
    case 'win': { const x = X(f.x), y = X(f.y), w = X(f.w), h = X(f.h); const n = Math.max(3, Math.round(f.w * 3)); for (let i = 0; i < n; i++) { g.fillStyle = 'rgba(120,170,210,0.85)'; g.fillRect(x + i * w / n + lw, y, w / n - lw * 2, h); } break; }
    case 'station': { const x = X(f.x), y = X(f.y), q = X(f.s); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x - q / 2 + s * 0.04, y - q / 2 + s * 0.05, q, q); g.fillStyle = lgr(g, x - q / 2, y - q / 2, x + q / 2, y + q / 2, hsh(c, 1.3), c, hsh(c, 0.7)); rrect(g, x - q / 2, y - q / 2, q, q, q * 0.15); g.fill(); g.strokeStyle = hsh(c, 0.45); g.stroke(); g.fillStyle = '#e0b830'; g.fillRect(x - q / 2, y - q / 2, q, lw * 1.2); break; }
    case 'rows': {
      const x = X(f.x), y = X(f.y), w = X(f.w), h = X(f.h), n = f.n;
      g.fillStyle = '#4b3826'; g.fillRect(x, y, w, h);
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        g.fillStyle = '#3a2a1c'; f.vert ? g.fillRect(x + t * w - s * 0.06, y, s * 0.12, h) : g.fillRect(x, y + t * h - s * 0.06, w, s * 0.12);
        const m = Math.round((f.vert ? f.h : f.w) * 5);
        for (let j = 0; j < m; j++) { const u = (j + 0.5) / m, px = f.vert ? x + t * w : x + u * w, py = f.vert ? y + u * h : y + t * h, R = s * (0.07 + rr() * 0.04); g.fillStyle = hsh(hmix(c, '#4f8a2f', 0.45), 0.8 + rr() * 0.4); g.beginPath(); g.arc(px, py, R, 0, 7); g.fill(); }
      }
      break;
    }
    case 'tree': { const x = X(f.x), y = X(f.y), R = X(f.r); dshad(g, x + R * 0.4, y + R * 0.6, R, R * 0.7); const lc = hmix(c, '#3f7a2a', 0.55); for (let i = 0; i < 5; i++) { const a = i * 1.26, q = R * 0.55; g.fillStyle = hsh(lc, 0.75 + rr() * 0.4); g.beginPath(); g.arc(x + Math.cos(a) * R * 0.38, y + Math.sin(a) * R * 0.38, q, 0, 7); g.fill(); } g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.arc(x - R * 0.25, y - R * 0.3, R * 0.3, 0, 7); g.fill(); if (rr() < 0.6) { g.fillStyle = hsh(c, 1.15); for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(x + (rr() - 0.5) * R, y + (rr() - 0.5) * R, s * 0.035, 0, 7); g.fill(); } } break; }
    case 'shed': { const x = X(f.x), y = X(f.y), w = X(f.w), h = X(f.h); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x + s * 0.04, y + s * 0.05, w, h); g.fillStyle = '#8a3a2a'; g.fillRect(x, y, w, h / 2); g.fillStyle = '#6e2c20'; g.fillRect(x, y + h / 2, w, h / 2); g.strokeStyle = '#3a1810'; g.strokeRect(x, y, w, h); break; }
    case 'fence': { const x = X(f.x), y = X(f.y), w = X(f.w), h = X(f.h); g.fillStyle = '#6a8a3a'; g.fillRect(x, y, w, h); g.strokeStyle = '#8a6a44'; g.lineWidth = Math.max(1, s * 0.025); g.strokeRect(x, y, w, h); break; }
    case 'beast': break;
    case 'pool': { const x = X(f.x), y = X(f.y), w = X(f.w), h = X(f.h); g.fillStyle = '#5a5248'; rrect(g, x - lw * 2, y - lw * 2, w + lw * 4, h + lw * 4, s * 0.15); g.fill(); g.fillStyle = lgr(g, x, y, x + w, y + h, '#3a7a8a', hmix(c, '#1f5a6e', 0.6)); rrect(g, x, y, w, h, s * 0.12); g.fill(); break; }
    case 'glasshouse': { const x = X(f.x), y = X(f.y), w = X(f.w), h = X(f.h); g.fillStyle = '#3e6a32'; g.fillRect(x, y, w, h); for (let i = 0; i < f.n; i++) { const bx = x + i * w / f.n; g.fillStyle = 'rgba(200,230,240,0.55)'; g.fillRect(bx + lw, y, w / f.n - lw * 2, h); g.strokeStyle = 'rgba(240,250,255,0.8)'; g.beginPath(); g.moveTo(bx + w / f.n / 2, y); g.lineTo(bx + w / f.n / 2, y + h); g.stroke(); } g.strokeStyle = '#d8dcdf'; g.lineWidth = lw; g.strokeRect(x, y, w, h); break; }
    case 'jack': { const x = X(f.x), y = X(f.y); g.fillStyle = '#4a4a4a'; g.fillRect(x - X(f.l), y + s * 0.12, X(f.l) * 2, s * 0.12); g.fillStyle = '#6a6a6a'; g.beginPath(); g.arc(x - X(f.l) * 0.8, y + s * 0.18, s * 0.12, 0, 7); g.fill(); break; }
    case 'pit': { const x = X(f.x), y = X(f.y), R = X(f.r); g.fillStyle = rgr(g, x, y, R, '#2a2420', hsh(c, 0.6)); g.beginPath(); g.arc(x, y, R, 0, 7); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.3)'; for (const q of [0.5, 0.75]) { g.beginPath(); g.arc(x, y, R * q, 0, 7); g.stroke(); } break; }
    case 'derrick': { const x = X(f.x), y = X(f.y), R = X(f.r); g.strokeStyle = '#d0a028'; g.lineWidth = Math.max(1, s * 0.05); for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + i * Math.PI / 2; g.beginPath(); g.moveTo(x + Math.cos(a) * R, y + Math.sin(a) * R); g.lineTo(x, y); g.stroke(); } g.strokeRect(x - R * 0.7, y - R * 0.7, R * 1.4, R * 1.4); break; }
  }
}
function mTex(t, z) {
  const zr = Math.max(4, Math.round(z)), key = t + '|' + zr;
  let cv = TX.m.get(key);
  if (cv) return cv;
  if (TX.m.size > 600) TX.m.clear();
  const B = BUILD[t], L = mLay(t);
  cv = document.createElement('canvas'); cv.width = Math.ceil(B.w * zr); cv.height = Math.ceil(B.h * zr);
  const g = cv.getContext('2d'), rr = mulberry32(L.seed ^ 0x9e37);
  mGround(g, L, zr, B.c, rr);
  for (const f of L.F) mFeat(g, f, zr, B.c, rr);
  g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = Math.max(1, zr * 0.04); g.strokeRect(0.5, 0.5, cv.width - 1, cv.height - 1);
  TX.m.set(key, cv);
  return cv;
}
function mAnim(e, L, x, y, z, on) {
  const t = S.t + (e.id || 0) * 0.37, X = v => v * z;
  for (const f of L.F) {
    switch (f.k) {
      case 'stack': if (on && z >= 8) for (let k = 0; k < 5; k++) { const q = (t * 0.5 + k / 5) % 1; ctx.globalAlpha = 0.45 * (1 - q); ctx.fillStyle = L.a === 'furnace' ? '#8a847c' : '#c8c8c8'; ctx.beginPath(); ctx.arc(x + X(f.x) + q * z * 0.9, y + X(f.y) - q * z * 1.4, X(f.r) * (0.7 + q * 2), 0, 7); ctx.fill(); } ctx.globalAlpha = 1; break;
      case 'glow': if (on) { ctx.globalAlpha = 0.65 + 0.3 * Math.sin(t * 9) * Math.sin(t * 3.3); ctx.fillStyle = '#ffb040'; ctx.fillRect(x + X(f.x), y + X(f.y), X(f.w), X(f.h)); ctx.globalAlpha = 1; } break;
      case 'flare': if (on && z >= 8) { const R = X(f.r) * (1.6 + 0.4 * Math.sin(t * 13)); ctx.fillStyle = 'rgba(255,170,40,0.85)'; ctx.beginPath(); ctx.arc(x + X(f.x), y + X(f.y) - R * 0.4, R, 0, 7); ctx.fill(); } break;
      case 'fan': if (z >= 10) { const cx = x + X(f.x), cy = y + X(f.y), R = X(f.r), a0 = on ? t * 9 : 0.3; ctx.fillStyle = '#9aa2aa'; for (let k = 0; k < 4; k++) { const a = a0 + k * Math.PI / 2; ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * R * 0.5, cy + Math.sin(a) * R * 0.5, R * 0.45, R * 0.18, a, 0, 7); ctx.fill(); } ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(cx, cy, R * 0.18, 0, 7); ctx.fill(); } break;
      case 'rotor': case 'vessel': case 'tank': if ((f.k === 'rotor' || f.agit) && z >= 10) { const cx = x + X(f.x), cy = y + X(f.y), R = X(f.r) * (f.k === 'rotor' ? 0.5 : 0.22), a = on ? t * (f.k === 'rotor' ? 14 : 4) : 0; ctx.strokeStyle = f.k === 'rotor' ? '#222' : '#cfd8e0'; ctx.lineWidth = Math.max(1, z * 0.04); ctx.beginPath(); ctx.moveTo(cx - Math.cos(a) * R, cy - Math.sin(a) * R); ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.stroke(); } break;
      case 'drum': case 'drumv': if (z >= 8) { const vv = f.k === 'drumv', R = X(f.r), l = X(f.l), n = 5; ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = Math.max(1, z * 0.03); for (let k = 0; k < n; k++) { const ph = ((on ? t * 0.8 : 0) + k / n) % 1, o = Math.cos(ph * Math.PI * 2) * R * 0.85; if (Math.sin(ph * Math.PI * 2) < 0) continue; ctx.beginPath(); if (vv) { ctx.moveTo(x + X(f.x) + o, y + X(f.y)); ctx.lineTo(x + X(f.x) + o, y + X(f.y) + l); } else { ctx.moveTo(x + X(f.x), y + X(f.y) + o); ctx.lineTo(x + X(f.x) + l, y + X(f.y) + o); } ctx.stroke(); } } break;
      case 'belt': if (z >= 8) { const bx = x + X(f.x), by = y + X(f.y), w = X(f.w), h = X(f.h), sp = z * 0.2, off = ((on ? t * 1.2 * z * (f.dir || 1) : 0) % sp + sp) % sp; ctx.fillStyle = 'rgba(160,160,160,0.35)'; if (f.v) for (let q = by + off - sp; q < by + h; q += sp) { if (q >= by) ctx.fillRect(bx + 1, q, w - 2, Math.max(1, z * 0.025)); } else for (let q = bx + off - sp; q < bx + w; q += sp) { if (q >= bx) ctx.fillRect(q, by + 1, Math.max(1, z * 0.025), h - 2); } if (on && e.recipe) { const r = RECIPE[e.recipe], k = Object.keys(r.o || r.fo || {})[0]; if (k) { ctx.fillStyle = col(k) || '#ccc'; for (let q = 0; q < 3; q++) { const u = ((t * 0.25 * (f.dir || 1) + q / 3) % 1 + 1) % 1; ctx.fillRect((f.v ? bx + w * 0.3 : bx + u * w - z * 0.05), (f.v ? by + u * h - z * 0.05 : by + h * 0.3), z * 0.1, z * 0.1); } } } } break;
      case 'ram': if (z >= 8) { const d = on ? (Math.sin(t * 5) * 0.5 + 0.5) * z * 0.12 : 0; ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x + X(f.x) - X(f.w) / 2, y + X(f.y) + z * 0.16 + d, X(f.w), z * 0.05); } break;
      case 'cells': if (on && z >= 12) { ctx.fillStyle = 'rgba(230,245,255,0.7)'; for (let k = 0; k < f.cols * f.rows * 2; k++) { const q = (t * 0.7 + k * 0.618) % 1, i = k % f.cols, j = Math.floor(k / f.cols) % f.rows; ctx.beginPath(); ctx.arc(x + X(f.x) + (i + 0.3 + 0.4 * ((k * 0.37) % 1)) * X(f.w) / f.cols, y + X(f.y) + (j + 0.85 - q * 0.7) * X(f.h) / f.rows, Math.max(0.8, z * 0.02), 0, 7); ctx.fill(); } } break;
      case 'jack': { const cx = x + X(f.x), cy = y + X(f.y), L2 = X(f.l), a = on ? Math.sin(t * 2.2) * 0.3 : 0.1; ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = Math.max(2, z * 0.12); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx - Math.cos(a) * L2, cy - Math.sin(a) * L2 * 0.6); ctx.lineTo(cx + Math.cos(a) * L2, cy + Math.sin(a) * L2 * 0.6); ctx.stroke(); ctx.lineCap = 'butt'; ctx.fillStyle = '#c84a2a'; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * L2, cy + Math.sin(a) * L2 * 0.6, z * 0.12, 0, 7); ctx.fill(); ctx.fillStyle = '#555'; ctx.fillRect(cx - z * 0.06, cy, z * 0.12, z * 0.25); break; }
      case 'beast': if (z >= 10) { const bx = x + X(f.x) + Math.sin(t * 0.3 + f.x * 7) * z * 0.15, by = y + X(f.y); ctx.fillStyle = BUILD[e.type].c; ctx.beginPath(); ctx.ellipse(bx, by, X(f.s), X(f.s) * 0.6, 0, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.arc(bx + X(f.s), by - X(f.s) * 0.2, X(f.s) * 0.35, 0, 7); ctx.fill(); } break;
      case 'pool': if (z >= 10) { ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1; for (let k = 0; k < 3; k++) { const q = (t * 0.2 + k / 3) % 1; ctx.beginPath(); ctx.moveTo(x + X(f.x) + X(f.w) * 0.1, y + X(f.y) + X(f.h) * q); ctx.lineTo(x + X(f.x) + X(f.w) * 0.6, y + X(f.y) + X(f.h) * q); ctx.stroke(); } } break;
      case 'derrick': if (z >= 8) { const a = on ? t * 3 : 0, cx = x + X(f.x), cy = y + X(f.y), R = X(f.r) * 0.6; ctx.strokeStyle = '#888'; ctx.lineWidth = Math.max(1, z * 0.06); ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.lineTo(cx - Math.cos(a) * R, cy - Math.sin(a) * R); ctx.stroke(); ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(cx, cy, R * 0.3, 0, 7); ctx.fill(); } break;
    }
  }
}
const NOTX = new Set(['solar', 'wind_turbine', 'engine']);
function drawMTex(e, B, x, y, w, h, z) {
  const L = mLay(e.type);
  ctx.drawImage(mTex(e.type, z), x, y, w, h);
  if (z >= 6) mAnim(e, L, x, y, z, e.cy && e.st && e.st !== 'power' && e.st !== 'nopole' && e.st !== 'idle');
}

const BKP = {
  belt(g, c, t) { g.fillStyle = '#2a2a2a'; g.fillRect(6, 14, 52, 36); g.fillStyle = hsh(c, 0.9); g.fillRect(6, 14, 52, 5); g.fillRect(6, 45, 52, 5); g.fillStyle = '#4a4a4a'; for (let i = 0; i < 6; i++) g.fillRect(10 + i * 8, 21, 4, 22); g.fillStyle = c; poly(g, [24, 24, 40, 32, 24, 40]); g.fill(); ink(g, 1); },
  ubelt(g, c) { g.fillStyle = '#3a3a3a'; rrect(g, 8, 18, 48, 34, 6); g.fill(); g.fillStyle = hsh(c, 1.1); rrect(g, 8, 10, 48, 16, 5); g.fill(); ink(g, 1.5); g.fillStyle = '#111'; rrect(g, 16, 30, 32, 18, 4); g.fill(); g.fillStyle = c; poly(g, [26, 33, 38, 39, 26, 45]); g.fill(); },
  splitter(g, c) { BKP.belt(g, c); g.fillStyle = hsh(c, 0.75); rrect(g, 26, 6, 12, 52, 3); g.fill(); ink(g, 1.5); g.fillStyle = '#e8e8e8'; g.fillRect(29, 10, 6, 44); },
  inserter(g, c, t) { const lg = /long/.test(t); g.fillStyle = '#3a3e42'; g.beginPath(); g.arc(20, 46, 10, 0, 7); g.fill(); ink(g, 1); g.strokeStyle = c; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(20, 46); g.lineTo(lg ? 30 : 34, lg ? 22 : 26); g.lineTo(lg ? 54 : 46, lg ? 10 : 20); g.stroke(); g.lineCap = 'butt'; g.fillStyle = '#555'; g.fillRect(lg ? 50 : 42, lg ? 6 : 15, 8, 10); g.fillStyle = hsh(c, 1.3); g.beginPath(); g.arc(lg ? 30 : 34, lg ? 22 : 26, 4, 0, 7); g.fill(); },
  sorter(g, c) { g.fillStyle = lgr(g, 0, 8, 0, 56, hsh(c, 1.3), hsh(c, 0.7)); rrect(g, 8, 8, 48, 48, 6); g.fill(); ink(g); g.fillStyle = '#1a1a1a'; poly(g, [20, 22, 44, 32, 20, 42]); g.fill(); g.fillStyle = '#e0b830'; g.fillRect(12, 12, 10, 10); },
  chest(g, c) { g.fillStyle = lgr(g, 0, 12, 0, 54, hsh(c, 1.25), hsh(c, 0.65)); rrect(g, 8, 14, 48, 40, 4); g.fill(); ink(g); g.fillStyle = hsh(c, 0.5); g.fillRect(8, 28, 48, 4); g.fillStyle = '#d8c070'; g.fillRect(28, 26, 8, 10); g.strokeStyle = hsh(c, 0.5); g.lineWidth = 1; for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(8 + i * 9.6, 32); g.lineTo(8 + i * 9.6, 54); g.stroke(); } },
  pipe(g, c, t) { const ug = /under|ug/.test(t); g.fillStyle = lgr(g, 0, 22, 0, 42, hsh(c, 1.4), c, hsh(c, 0.55)); g.fillRect(4, 22, 56, 20); ink(g, 0); g.fillStyle = hsh(c, 0.65); for (const x of [10, 50]) g.fillRect(x - 3, 18, 6, 28); if (ug) { g.fillStyle = '#2a2a2a'; g.fillRect(40, 16, 20, 32); } if (/pump/.test(t)) { g.beginPath(); g.arc(32, 32, 13, 0, 7); g.fillStyle = rgr(g, 32, 32, 13, '#cfe4ff', '#3a6a9a'); g.fill(); } },
  pole(g, c, t) { const big = /pylon|tower|sub/.test(t); g.strokeStyle = '#6a4a2a'; if (big) g.strokeStyle = '#8a9096'; g.lineWidth = big ? 4 : 6; g.beginPath(); g.moveTo(32, 58); g.lineTo(32, 10); g.moveTo(14, 18); g.lineTo(50, 18); if (big) { g.moveTo(18, 58); g.lineTo(32, 18); g.lineTo(46, 58); g.moveTo(20, 30); g.lineTo(44, 30); } g.stroke(); g.fillStyle = '#d8e0e8'; for (const x of [16, 48]) { g.beginPath(); g.arc(x, 15, 4, 0, 7); g.fill(); } g.strokeStyle = c; g.lineWidth = 1.5; g.beginPath(); g.moveTo(2, 20); g.quadraticCurveTo(9, 26, 16, 15); g.moveTo(48, 15); g.quadraticCurveTo(55, 26, 62, 20); g.stroke(); },
  wall(g, c) { for (let j = 0; j < 4; j++) for (let i = -1; i < 4; i++) { const x = 6 + i * 16 + (j % 2) * 8, y = 10 + j * 11; if (x + 15 < 6 || x > 58) continue; g.fillStyle = hsh(c, 0.85 + ((i + j) % 3) * 0.12); g.fillRect(Math.max(6, x), y, Math.min(58, x + 15) - Math.max(6, x), 10); } g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1; g.strokeRect(6, 10, 52, 44); },
  road(g, c) { g.fillStyle = '#3c3c3e'; g.fillRect(4, 8, 56, 48); g.fillStyle = '#e8d070'; for (let i = 0; i < 3; i++) g.fillRect(8 + i * 20, 30, 12, 4); g.fillStyle = '#ddd'; g.fillRect(4, 10, 56, 2); g.fillRect(4, 52, 56, 2); },
  rail(g) { g.fillStyle = '#6a5038'; for (let i = 0; i < 6; i++) g.fillRect(8 + i * 9, 10, 5, 44); g.fillStyle = '#a8b0b8'; g.fillRect(4, 20, 56, 4); g.fillRect(4, 40, 56, 4); },
  vehicle(g, c) { IP.vehicle(g, c, mulberry32(7), 'car'); },
  train(g, c, t) { rrect(g, 4, 18, 56, 28, 5); g.fillStyle = lgr(g, 0, 18, 0, 46, hsh(c, 1.3), hsh(c, 0.65)); g.fill(); ink(g); if (!/wagon|car/.test(t)) { g.fillStyle = '#a8d0f0'; g.fillRect(44, 22, 10, 8); } else { g.fillStyle = hsh(c, 0.6); for (let i = 0; i < 4; i++) g.fillRect(10 + i * 12, 22, 2, 20); } g.fillStyle = '#222'; for (const x of [14, 26, 38, 50]) { g.beginPath(); g.arc(x, 48, 5, 0, 7); g.fill(); } },
  stop(g, c) { BKP.rail(g); g.fillStyle = c; g.fillRect(26, 4, 12, 22); ink(g, 1); g.fillStyle = '#fff'; g.font = 'bold 12px sans-serif'; g.textAlign = 'center'; g.fillText('S', 32, 20); },
  dock(g, c) { g.fillStyle = '#2a6a9a'; g.fillRect(4, 34, 56, 26); g.fillStyle = '#7a6040'; g.fillRect(4, 8, 56, 28); g.fillStyle = '#5a4a32'; for (let i = 0; i < 6; i++) g.fillRect(8 + i * 9, 10, 2, 24); g.fillStyle = c; g.fillRect(40, 4, 6, 34); g.fillRect(28, 4, 24, 5); },
  buoy(g, c) { g.fillStyle = '#2a6a9a'; g.fillRect(4, 40, 56, 20); g.beginPath(); g.moveTo(20, 46); g.lineTo(32, 10); g.lineTo(44, 46); g.closePath(); g.fillStyle = c; g.fill(); ink(g); g.fillStyle = '#fff'; g.fillRect(24, 28, 16, 5); },
  turret(g, c) { g.beginPath(); g.arc(32, 36, 20, 0, 7); g.fillStyle = rgr(g, 32, 36, 20, hsh(c, 1.3), hsh(c, 0.6)); g.fill(); ink(g); g.fillStyle = '#333'; g.fillRect(30, 6, 5, 28); g.beginPath(); g.arc(32, 36, 8, 0, 7); g.fillStyle = '#555'; g.fill(); },
  gun(g, c) { BKP.turret(g, c); g.fillStyle = '#222'; g.fillRect(28, 2, 9, 26); },
  projector(g, c) { BKP.turret(g, c); g.fillStyle = 'rgba(120,200,255,0.6)'; g.beginPath(); g.arc(32, 36, 26, 0, 7); g.fill(); },
  hive(g, c) { IP.animal(g, c, mulberry32(3), 'bee hive'); },
  ruin(g, c) { g.fillStyle = '#6a645c'; poly(g, [6, 56, 10, 22, 24, 30, 30, 12, 42, 26, 56, 18, 58, 56]); g.fill(); ink(g); g.fillStyle = '#3a3630'; g.fillRect(26, 38, 12, 18); },
  booster(g, c) { BKP.pipe(g, c, 'pump'); },
  pump(g, c) { BKP.pipe(g, '#6a7a8a', 'pump'); },
  stack(g, c) { g.fillStyle = lgr(g, 20, 0, 44, 0, '#6a625a', '#c8c0b8', '#5a524a'); poly(g, [22, 58, 26, 8, 38, 8, 42, 58]); g.fill(); ink(g); g.fillStyle = '#b8352e'; g.fillRect(25, 12, 14, 5); g.fillStyle = 'rgba(160,150,140,0.6)'; g.beginPath(); g.arc(36, 6, 6, 0, 7); g.arc(44, 4, 5, 0, 7); g.fill(); },
  depot(g, c) { BKP.chest(g, c); g.fillStyle = '#7fe08a'; g.fillRect(14, 44, 36, 4); },
  engine(g, c) { IP.motor(g, c, mulberry32(9), 'steam engine'); },
  miner(g, c, t) { const cv = mTex(t, 32); g.drawImage(cv, 0, 0, 64, 64); }
};
function bIcon(g, k) {
  const B = BUILD[k], K = B.kind;
  if (K === 'machine' || K === 'miner' || K === 'engine' || K === 'stack') {
    if (K === 'machine' || K === 'miner') { if (NOTX.has(k)) return BKP.chest(g, B.c); const s = Math.min(60 / B.w, 60 / B.h), cv = mTex(k, s); g.drawImage(cv, (64 - B.w * s) / 2, (64 - B.h * s) / 2, B.w * s, B.h * s); return; }
    return BKP[K](g, B.c, k);
  }
  const f = BKP[K] || BKP.chest;
  f(g, B.c, (k + ' ' + B.n).toLowerCase());
}
function icoCv(k) {
  let cv = TX.i.get(k);
  if (cv) return cv;
  cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const g = cv.getContext('2d'), r = mulberry32(strH(k));
  try {
    if (BUILD[k]) {
      if (k === 'solar') { g.fillStyle = '#1a2a5a'; g.fillRect(6, 10, 52, 44); g.strokeStyle = '#c0c8d0'; g.lineWidth = 2; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(6 + i * 13, 10); g.lineTo(6 + i * 13, 54); g.stroke(); } for (let j = 0; j <= 3; j++) { g.beginPath(); g.moveTo(6, 10 + j * 14.67); g.lineTo(58, 10 + j * 14.67); g.stroke(); } }
      else if (k === 'wind_turbine') { g.fillStyle = '#ddd'; g.fillRect(30, 30, 4, 32); g.fillStyle = '#f4f6f8'; for (let i = 0; i < 3; i++) { g.save(); g.translate(32, 28); g.rotate(i * 2.094); poly(g, [-3, 0, 0, -26, 3, 0]); g.fill(); ink(g, 1); g.restore(); } }
      else bIcon(g, k);
    } else if (FLUIDS[k]) IP.drop(g, FLUIDS[k].c, r, (k + ' ' + FLUIDS[k].n).toLowerCase(), !!FLUIDS[k].gas);
    else if (CMBI[k]) CMBI[k](g);
    else { const I = ITEMS[k] || { c: '#888', n: k }, h = IOV[k] ? IOV[k].split(':')[1] || '' : '', n = (k + ' ' + I.n + ' ' + h).toLowerCase(); (IP[iArch(k, I.n)] || IP.jar)(g, I.c, r, n); }
  } catch (err) { g.clearRect(0, 0, 64, 64); g.fillStyle = col(k) || '#888'; g.beginPath(); g.arc(32, 32, 22, 0, 7); g.fill(); }
  TX.i.set(k, cv);
  return cv;
}
function icoClass(k) {
  let c = TX.url.get(k);
  if (c) return c;
  c = 'ix' + strH(k).toString(36);
  if (!TX.css) { TX.css = document.createElement('style'); document.head.appendChild(TX.css); }
  try { TX.css.sheet.insertRule(`.${c}{background-image:url(${icoCv(k).toDataURL()})}`, TX.css.sheet.cssRules.length); } catch (err) {}
  TX.url.set(k, c);
  return c;
}

function drawBuilding(e, ox, oy, z) {
  const B = BUILD[e.type], x = ox + e.x * z, y = oy + e.y * z, w = B.w * z, h = B.h * z, p = Math.max(1, z * 0.06);
  if (B.kind === 'hive') return drawHive(e, x, y, w, h, z);
  if (B.kind === 'pole') return drawPole(e, x, y, z);
  if (B.kind === 'stop') return drawStop(e, x, y, z);
  if (B.kind === 'dock') return drawDock(e, x, y, z);
  if (B.kind === 'buoy') return drawBuoy(e, x, y, z);
  if (B.kind === 'wall') return drawWall(e, x, y, z);
  if (B.kind === 'turret') return drawTurret(e, x, y, w, h, z);
  if (B.kind === 'projector') return drawProjector(e, x, y, w, h, z);
  if (B.kind === 'gun') return drawGun(e, x, y, w, h, z);
  if (B.kind === 'ruin') return e.type === 'burrow' ? drawBurrow(e, x, y, w, h, z) : e.type === 'infested' ? drawInfested(e, x, y, w, h, z) : e.type === 'lavatube' ? drawLavaTube(e, x, y, w, h, z) : e.type === 'icecave' ? drawIceCave(e, x, y, w, h, z) : e.type === 'nh3works' ? drawWorks(e, x, y, w, h, z) : drawRuin(e, x, y, w, h, z);
  if (e.type === 'oil_platform') return drawRig(e, x, y, w, h, z);
  if (e.type === 'wind_offshore') return drawOWT(e, x, y, w, h, z);
  if (e.type === 'tidal') return drawTidal(e, x, y, w, h, z);
  const tx = (B.kind === 'machine' || B.kind === 'miner') && !NOTX.has(e.type);
  if (tx) drawMTex(e, B, x, y, w, h, z);
  else {
  ctx.fillStyle = shade(B.c, 0.42);
  ctx.fillRect(x + p, y + p, w - 2 * p, h - 2 * p);
  const gr = ctx.createLinearGradient(x, y, x + w * 0.3, y + h);
  gr.addColorStop(0, shade(B.c, 1.2)); gr.addColorStop(0.55, B.c); gr.addColorStop(1, shade(B.c, 0.74));
  ctx.fillStyle = gr;
  ctx.fillRect(x + p * 2, y + p * 2, w - 4 * p, h - 4 * p);
  const ln = Math.max(1, p * 0.7);
  ctx.fillStyle = shade(B.c, 1.45);
  ctx.fillRect(x + p * 2, y + p * 2, w - 4 * p, ln); ctx.fillRect(x + p * 2, y + p * 2, ln, h - 4 * p);
  ctx.fillStyle = shade(B.c, 0.55);
  ctx.fillRect(x + p * 2, y + h - p * 2 - ln, w - 4 * p, ln); ctx.fillRect(x + w - p * 2 - ln, y + p * 2, ln, h - 4 * p);
  if (z >= 18 && B.w * B.h > 1) {
    ctx.fillStyle = shade(B.c, 0.5);
    const bs = Math.max(2, z * 0.07), m = p * 2 + z * 0.08;
    for (const [bx, by] of [[x + m, y + m], [x + w - m - bs, y + m], [x + m, y + h - m - bs], [x + w - m - bs, y + h - m - bs]]) ctx.fillRect(bx, by, bs, bs);
  }
  if (z >= 14 && (B.kind === 'machine' || B.kind === 'miner') && B.w >= 2 && B.h >= 2) machDetail(e, B, x, y, w, h, z);
  }
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
  if (!tx && z >= 14 && B.ab && e.type !== 'engine' && e.type !== 'solar' && e.type !== 'wind_turbine') {
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
    const st = e.cy && e.st !== 'power' && e.st !== 'nopole' && e.st !== 'idle' ? 'work' : e.st;
    if (z >= 10) {
      ctx.globalAlpha = st === 'work' ? 0.28 + 0.12 * Math.sin(performance.now() / 300 + e.id) : 0.2;
      ctx.fillStyle = ST_COL[st] || '#888';
      ctx.beginPath(); ctx.arc(x + w - p * 3 - z * 0.12, y + p * 3 + z * 0.12, Math.max(4, z * 0.26), 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = ST_COL[st] || '#888';
    ctx.beginPath();
    ctx.arc(x + w - p * 3 - z * 0.12, y + p * 3 + z * 0.12, Math.max(2, z * 0.11), 0, 7);
    ctx.fill();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function machDetail(e, B, x, y, w, h, z) {
  const on = e.cy && e.st !== 'power' && e.st !== 'nopole' && e.st !== 'idle';
  ctx.fillStyle = shade(B.c, 0.5);
  const gx = x + z * 0.22, gy = y + h - z * 0.62, gw = Math.min(w * 0.3, z * 0.8);
  for (let k = 0; k < 4; k++) ctx.fillRect(gx, gy + k * z * 0.1, gw, Math.max(1, z * 0.04));
  const fx2 = x + w - z * 0.48, fy = y + h - z * 0.56, R = z * 0.26;
  ctx.fillStyle = '#1e2124'; ctx.beginPath(); ctx.arc(fx2, fy, R, 0, 7); ctx.fill();
  ctx.strokeStyle = shade(B.c, 0.6); ctx.lineWidth = Math.max(1, z * 0.04); ctx.stroke();
  const a0 = on ? performance.now() / 1000 * 9 + e.id : e.id;
  ctx.fillStyle = on ? '#8a9096' : '#5a5f64';
  for (let k = 0; k < 3; k++) {
    const a = a0 + k * 2.094;
    ctx.beginPath(); ctx.moveTo(fx2, fy); ctx.arc(fx2, fy, R * 0.82, a, a + 0.75); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = '#2c3034'; ctx.beginPath(); ctx.arc(fx2, fy, R * 0.22, 0, 7); ctx.fill();
}
function drawGhost(ox, oy, z) {
  const B = BUILD[tool], o = toolOrigin(tool, mouse.fx, mouse.fy);
  if (B.kind === 'vehicle') {
    const v = { id: -1, type: tool, x: mouse.fx, y: mouse.fy, a: Math.atan2(DY[toolDir], DX[toolDir]), v: 0, hp: 1, tr: {} }, V = VEH[tool];
    const bad = carHit(v, v.x, v.y, v.a) || !inReach(v.x, v.y, REACH);
    drawCar(v, ox + v.x * z, oy + v.y * z, z, 0.6);
    ctx.save(); ctx.translate(ox + v.x * z, oy + v.y * z); ctx.rotate(v.a);
    ctx.strokeStyle = bad ? '#ff5a5a' : '#7fff8a'; ctx.lineWidth = 2; ctx.strokeRect(-V.hl * z, -V.hw * z, V.hl * z * 2, V.hw * z * 2);
    ctx.restore();
    return;
  }
  if (B.kind === 'train') {
    const X = Math.floor(mouse.fx), Y = Math.floor(mouse.fy), ok = isRail(X, Y) && inReach(mouse.fx, mouse.fy, REACH);
    const ns = isRail(X, Y - 1) || isRail(X, Y + 1), ew = isRail(X - 1, Y) || isRail(X + 1, Y);
    ctx.save(); ctx.translate(ox + (X + 0.5) * z, oy + (Y + 0.5) * z); ctx.rotate(ns && !ew ? Math.PI / 2 : ew && !ns ? 0 : Math.atan2(DY[toolDir], DX[toolDir]));
    ctx.globalAlpha = 0.55; ctx.fillStyle = B.c; ctx.fillRect(-0.92 * z, -0.42 * z, 1.84 * z, 0.84 * z); ctx.globalAlpha = 1;
    ctx.strokeStyle = ok ? '#7fff8a' : '#ff5a5a'; ctx.lineWidth = 2; ctx.strokeRect(-0.92 * z, -0.42 * z, 1.84 * z, 0.84 * z);
    ctx.restore();
    return;
  }
  const err = canPlace(tool, o.x, o.y) || plBlock(tool, o.x, o.y);
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = B.c;
  ctx.fillRect(ox + o.x * z, oy + o.y * z, B.w * z, B.h * z);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = err ? '#ff5a5a' : '#7fff8a';
  ctx.lineWidth = 2;
  ctx.strokeRect(ox + o.x * z + 1, oy + o.y * z + 1, B.w * z - 2, B.h * z - 2);
  if (B.kind === 'pole') {
    const g = { id: -1, type: tool, x: o.x, y: o.y, w: [], pg: -2 }, r = supRect(g), c = ctr(g);
    ctx.fillStyle = 'rgba(120,255,140,0.12)'; ctx.fillRect(ox + r[0] * z, oy + r[1] * z, (r[2] - r[0] + 1) * z, (r[3] - r[1] + 1) * z);
    ctx.strokeStyle = 'rgba(120,255,140,0.6)'; ctx.lineWidth = 1; ctx.strokeRect(ox + r[0] * z + 0.5, oy + r[1] * z + 0.5, (r[2] - r[0] + 1) * z - 1, (r[3] - r[1] + 1) * z - 1);
    if (!err) { ctx.strokeStyle = '#e09a5a'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); for (const q of wireCands(g)) { const d = ctr(q); ctx.beginPath(); ctx.moveTo(ox + c.x * z, oy + c.y * z); ctx.lineTo(ox + d.x * z, oy + d.y * z); ctx.stroke(); } ctx.setLineDash([]); }
  }
  if (B.kind === 'belt' || B.kind === 'ubelt' || B.kind === 'splitter' || B.kind === 'inserter' || B.ug || tool === 'sorter' || tool === 'booster') arrow(ox + (o.x + 0.5) * z, oy + (o.y + 0.5) * z, toolDir, z * 0.28, '#fff');
  if (B.ug) {
    drawUgLinks(ox, oy, z, B.kind);
    const g = { type: tool, x: o.x, y: o.y, dir: toolDir, mode: 'in' };
    const b = (toolDir + 2) % 4;
    let src = null;
    for (let n = 1; n <= B.ug; n++) { const q = at(o.x + DX[b] * n, o.y + DY[b] * n); if (q && q.type === tool) { if (B.kind === 'pipe' ? q.dir === toolDir && !ugPair(q) : q.dir === toolDir && q.mode === 'in' && !ugPair(q)) src = q; break; } }
    ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = src ? '#7fff8a' : '#ffffff';
    for (let n = 1; n <= B.ug; n++) { const tx = o.x + DX[toolDir] * n, ty = o.y + DY[toolDir] * n; if (!src) ctx.fillRect(ox + tx * z + 2, oy + ty * z + 2, z - 4, z - 4); }
    ctx.restore();
    if (src) { ctx.save(); ctx.setLineDash([z * 0.18, z * 0.12]); ctx.strokeStyle = '#7fff8a'; ctx.lineWidth = Math.max(1, z * 0.07); ctx.beginPath(); ctx.moveTo(ox + (src.x + 0.5) * z, oy + (src.y + 0.5) * z); ctx.lineTo(ox + (o.x + 0.5) * z, oy + (o.y + 0.5) * z); ctx.stroke(); ctx.restore(); }
    ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.max(9, Math.floor(z * 0.26))}px system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText(src ? (B.kind === 'pipe' ? 'joins' : 'exit') : (B.kind === 'pipe' ? 'start' : 'entrance'), ox + (o.x + 0.5) * z, oy + o.y * z - 2);
  }
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
    if (kind(e) === 'machine') s += `<br>${e.recipe ? RECIPE[e.recipe].n : 'No recipe'} · ${ST_TXT[e.cy && e.st !== 'power' && e.st !== 'nopole' && e.st !== 'idle' ? 'work' : e.st] || ''}`;
    if (kind(e) === 'pipe') s += `<br>${e.fl && e.amt > 0.01 ? nm(e.fl) + ' · ' + pres(e).toFixed(1) + ' bar · ' + Math.round(e.tf) + '°C' : 'Empty' + (e.fl ? ' (' + nm(e.fl) + ')' : '')}<br><span class="dim">${NP(e).mat}, DN${NP(e).dn}, rated ${NP(e).bar} bar</span>`;
    if (e.type === 'engine') s += `<br>${Math.round(e.kw)} kW · steam ${pres(e).toFixed(1)} bar · ${Math.round(e.tf)}°C`;
    if (e.type === 'booster') s += `<br>Outlet ${e.head} bar · ${Math.round(e.fr)}/s`;
    if (belty(e) && e.items.length) s += `<br>${e.items.map(i => nm(i.i)).join(', ')}`;
    if (BUILD[e.type].ug) s += `<br><span class="dim">${kind(e) === 'ubelt' ? (e.mode === 'in' ? 'Entrance' : 'Exit') : 'Pipe-to-ground'} · ${ugPair(e) ? 'joined ' + ugPair(e).n + ' tiles' : 'not joined'}</span>`;
    if (e.type === 'chest') s += `<br>${sum(e.store)}/400 items`;
    if (kind(e) === 'inserter') s += `<br>${e.hn ? e.hn + ' ' + nm(e.hand) : 'Empty hand'}`;
    if (e.type === 'boiler' && e.scale > 0.01) s += `<br>Scale ${Math.round(e.scale * 100)}%`;
    if (e.type === 'depot') s += `<br>${(S.orders || []).map(a => nm(ORDERS[a.i].item) + ' ' + a.got + '/' + ORDERS[a.i].n).join('<br>') || 'No open orders'}`;
    if (e.type === 'stack') s += `<br>${stackUsers(e).length} machines venting through it`;
    if (kind(e) === 'hive') s += `<br>${htier(e).n} · food ${Math.round(e.food)}/50 · ${e.sw} swarms sent`;
    if (e.type === 'projector') s += `<br>${sum(e.pay)} rounds loaded · ${e.pw} powder · ${e.shots} fired`;
    if (e.type === 'howitzer') s += `<br>${e.ammo} HE${e.wp ? ' + ' + e.wp + ' WP' : ''} shells · ${e.shots} fired`;
    if (e.type === 'burrow') s += `<br>${e.done ? 'Collapsed' : DGK[dgKind(e)] + ' · tier ' + burrowTier(e) + (e.qhp != null ? ' · queen wounded' : '') + ' · click to climb down'}`;
    if (XDG[e.type] && e.type !== 'infested') s += `<br>${e.done ? DGX[XDG[e.type]].gone : 'Tier ' + burrowTier(e) + (e.qhp === 0 ? ' · ' + DGQ[XDG[e.type]].toLowerCase() + ' dead' : e.qhp != null ? ' · ' + DGQ[XDG[e.type]].toLowerCase() + ' wounded' : '') + ' · click to go in'}`;
    if (e.type === 'infested') s += `<br>${e.done ? 'Capped' : 'Tier ' + burrowTier(e) + (e.qhp === 0 ? ' · tyrant dead' : e.qhp != null ? ' · tyrant wounded' : '') + ' · click to ride the cage down'}`;
    if (e.type === 'ruin') s += `<br>${e.done ? 'Searched' : guards(e).length ? guards(e).length + ' hives on guard' : 'Unguarded: click to search'}`;
    if (e.type === 'turret') s += `<br>${e.ammo} cartridges + ${e.rd} rounds · ${e.kills} kills`;
    if (e.hp != null && e.hp < maxHp(e)) s += `<br><span class="bad">Integrity ${Math.round(e.hp)}/${maxHp(e)}</span>`;
    return s;
  }
  const i = y * W + x;
  if (!rgDone(x, y)) return '<b>Unexplored</b><br><span class="dim">Walk closer to see what is out here</span>';
  if (oily(i) && terrain[i] === 1) return `<b>Offshore oil field</b><br>${S.gen && S.gen.inf ? 'Endless' : fmt(oreAmt[i]) + ' left'} · <span class="dim">Oil and gas trapped in rock under the seabed. A rainbow sheen marks seepage at the surface. Drill it from an offshore oil platform</span>`;
  if (oily(i)) return `<b>Oil seep</b><br>${S.gen && S.gen.inf ? 'Endless' : fmt(oreAmt[i]) + ' left'} · <span class="dim">Crude oil seeps up through the soil here. Drill it with a pumpjack</span>`;
  if (oreType[i]) return `<b>${nm(ORES[oreType[i]].item)}</b><br>${S.gen && S.gen.inf ? 'Endless' : fmt(oreAmt[i]) + ' left'} · <span class="dim">${ITEMS[ORES[oreType[i]].item].f}</span><br><span class="dim">Click and hold to mine by hand</span>`;
  return x >= 0 && y >= 0 && x < W && y < H && terrain[i] ? `<b>${TER_N[terrain[i]]}</b>` : '';
}

function powerHtml() {
  const p = S.power;
  const pct = Math.round(p.sat * 100);
  const cls = p.demand === 0 ? '' : pct >= 99 ? 'ok' : pct > 40 ? 'warn' : 'bad';
  let h = `<div class="hr"><span class="lbl">Power</span><b class="${cls}">${p.demand ? pct + '%' : 'idle'}</b></div><div class="hb ${cls}"><i style="width:${p.demand ? Math.min(100, pct) : 0}%"></i></div><div class="hs">${fmt(p.gen)} / ${fmt(p.demand)} kW · cap ${fmt(p.cap)}${wired() ? ` · ${p.nets || 0} grid${p.nets === 1 ? '' : 's'}` : ''}${p.nc ? ` · <span class="bad">${p.nc} unpowered</span>` : ''}</div>`;
  if (p.bmax) { const bp = Math.round(p.bat / p.bmax * 100); h += `<div class="hr"><span class="lbl">Battery</span><b>${bp}%</b></div><div class="hb"><i style="width:${bp}%"></i></div><div class="hs">${p.bkw > 0.5 ? 'discharging ' + fmt(p.bkw) + ' kW' : p.bkw < -0.5 ? 'charging ' + fmt(-p.bkw) + ' kW' : 'holding'}</div>`; }
  return h;
}
function powerHtmlOld() {
  const p = S.power;
  const pct = Math.round(p.sat * 100);
  const cls = p.demand === 0 ? '' : pct >= 99 ? 'ok' : pct > 40 ? 'warn' : 'bad';
  return (wired() ? `<span class="dim">${p.nets || 0} grid${p.nets === 1 ? '' : 's'}</span> ` + (p.nc ? `<span class="bad">⚡ ${p.nc} unpowered</span> ` : '') : '') + `<span class="lbl">Power</span><b class="${cls}">${fmt(p.gen)}</b> / ${fmt(p.demand)} kW <span class="dim">(cap ${fmt(p.cap)})</span> <span class="${cls}">${p.demand ? pct + '%' : 'idle'}</span>` + (p.bmax ? ` <span class="lbl">Battery</span><b>${Math.round(p.bat / p.bmax * 100)}%</b><span class="dim"> ${p.bkw > 0.5 ? '▼ ' + fmt(p.bkw) + ' kW' : p.bkw < -0.5 ? '▲ ' + fmt(-p.bkw) + ' kW' : ''}</span>` : '');
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
  let h = '';
  if (t > 0) h += `<div class="hr"><span class="lbl">Vented</span><b class="warn">${fmt(t)}</b></div>` + (parts ? `<div class="hs">${parts}</div>` : '');
  if (sp >= 1 || S.fails) h += `<div class="hr"><span class="lbl">Spilled</span><b class="bad">${fmt(sp)}</b></div><div class="hs">${S.fails || 0} pipe failures</div>`;
  if (S.bugs.length || S.evo > 0.001 || S.lost) h += `<div class="hr"><span class="lbl">Crawlers</span><b class="${S.bugs.length ? 'bad' : ''}">${S.bugs.length}</b></div><div class="hs">evolution ${Math.round(S.evo * 100)}% · gear threat ${Math.round(gearT() * 100)}%<br>${lists().hive.length} hives${S.lost ? ' · ' + S.lost + ' buildings lost' : ''}</div>`;
  if (S.clouds.length || lists().projector.length) h += `<div class="hr"><span class="lbl">Wind</span><b><span class="wind" style="display:inline-block;transform:rotate(${S.wind.a}rad)">→</span> ${(S.wind.v * 10).toFixed(1)} m/s</b></div>` + (S.clouds.length ? `<div class="hs">${S.clouds.length} gas clouds</div>` : '');
  if (pk >= 1) h += `<div class="hr"><span class="lbl">Smog</span><b class="${pk > RAIN ? 'bad' : pk > RAIN * 0.6 ? 'warn' : ''}">${Math.round(pk)}</b></div>` + (pk > RAIN ? '<div class="hs bad">acid rain</div>' : '');
  return h;
  return `<span class="lbl">Vented</span><b class="${t > 0 ? 'warn' : ''}">${fmt(t)}</b>` + (parts ? `<span class="dim"> · ${parts}</span>` : '') +
    (sp >= 1 || S.fails ? ` <span class="lbl">Spilled</span><b class="bad">${fmt(sp)}</b><span class="dim"> · ${S.fails || 0} pipe failures</span>` : '') +
    (S.bugs.length || S.evo > 0.001 || S.lost ? ` <span class="lbl">Crawlers</span><b class="${S.bugs.length ? 'bad' : ''}">${S.bugs.length}</b><span class="dim"> · evolution ${Math.round(S.evo * 100)}% · gear threat ${Math.round(gearT() * 100)}% · ${lists().hive.length} hives${S.lost ? ' · ' + S.lost + ' buildings lost' : ''}</span>` : '') +
    (S.clouds.length || lists().projector.length ? ` <span class="lbl">Wind</span><b><span class="wind" style="display:inline-block;transform:rotate(${S.wind.a}rad)">→</span> ${(S.wind.v * 10).toFixed(1)}</b><span class="dim"> m/s${S.clouds.length ? ' · ' + S.clouds.length + ' gas clouds' : ''}</span>` : '') +
    (pk >= 1 ? ` <span class="lbl">Smog</span><b class="${pk > RAIN ? 'bad' : pk > RAIN * 0.6 ? 'warn' : ''}">${Math.round(pk)}</b><span class="dim"> peak${pk > RAIN ? ', acid rain' : ''}</span>` : '');
}

const ORD = {};
{ let i = 0; for (const c of CATS) for (const t in BUILD) if (BUILD[t].cat === c) ORD[t] = i++; for (const k of PARTS) ORD[k] = i++; for (const k in ITEMS) if (!(k in ORD)) ORD[k] = i++; }
const MADE = {}, USED = {};
for (const r of RECIPES) {
  for (const k in r.o || {}) (MADE[k] = MADE[k] || new Set()).add(BUILD[r.b] ? BUILD[r.b].n : r.b);
  for (const k in r.i || {}) (USED[k] = USED[k] || new Set()).add(r.n || nm(r.id));
}
for (const t in BUILD) for (const k in BUILD[t].cost || {}) (USED[k] = USED[k] || new Set()).add(BUILD[t].n);
const stk = k => BUILD[k] ? (BUILD[k].kind === 'belt' || BUILD[k].kind === 'pipe' || BUILD[k].kind === 'road' || BUILD[k].kind === 'rail' ? 100 : BUILD[k].kind === 'vehicle' || BUILD[k].kind === 'train' ? 1 : 50) : 100;
const lum = h => { if (!h || h[0] !== '#') return 128; if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3]; const v = parseInt(h.slice(1, 7), 16); return ((v >> 16) * 299 + ((v >> 8) & 255) * 587 + (v & 255) * 114) / 1000; };
function abbr(k) {
  const B = BUILD[k];
  if (B) return (B.ab || '') + (B.kind === 'belt' ? '»' : B.kind === 'ubelt' ? '⇣' : B.kind === 'splitter' ? '⑂' : B.kind === 'inserter' ? '↷' : B.kind === 'pipe' ? (B.P.dn >= 100 ? '█' : '═') : '');
  const w = nm(k).replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  return w.length === 1 ? w[0].slice(0, 2) : w.slice(0, 2).map(x => x[0].toUpperCase()).join('');
}
function ico(k, big) { return `<span class="ic icx ${icoClass(k)}${big ? ' big' : ''}">${abbr(k)}</span>`; }
function defaultQB() { const q = new Array(20).fill(null); let i = 0; for (const t of Object.keys(S.inv).filter(t => BUILD[t] && S.inv[t] > 0).sort((a, b) => ORD[a] - ORD[b])) if (i < 20) q[i++] = t; return q; }
function qbAdd(t) { if (!S.qb || S.qb.length !== 20) S.qb = defaultQB(); if (!BUILD[t] || S.qb.includes(t)) return; const i = S.qb.indexOf(null); if (i >= 0) S.qb[i] = t; }
function qbSet(i, t) { S.qb = S.qb.map(x => x === t ? null : x); S.qb[i] = t; renderHotbar(); }
let hbSig = '';
function renderHotbar() {
  if (!S.qb || S.qb.length !== 20) S.qb = defaultQB();
  let h = '<div class="hand">' + (tool ? `${ico(tool, 1)}<div><b>${nm(tool)}</b><small>${fmt(S.inv[tool] || 0)} in inventory · R rotate · Q clear</small></div>` : '<div><b>Empty hand</b><small>WASD walk · Space shoot · 1–0 quickbar · Shift for row 2 · Q picks the building under the cursor</small></div>') + '</div><div class="qb">';
  for (let r = 0; r < 2; r++) {
    h += '<div class="qrow">';
    for (let j = 0; j < 10; j++) {
      const i = r * 10 + j, t = S.qb[i], n = t ? S.inv[t] || 0 : 0;
      h += `<button class="qs${t ? '' : ' empty'}${t && tool === t ? ' on' : ''}${t && !n ? ' zero' : ''}" data-q="${i}"${t ? ` data-tool="${t}" data-k="${t}" data-m="i"` : ''}><span class="qk">${r ? '⇧' : ''}${(j + 1) % 10}</span>${t ? ico(t) + `<span class="cnt">${fmt(n)}</span>` : ''}</button>`;
    }
    h += '</div>';
  }
  h += '</div><button class="invbtn" data-ui="craft">Inventory <kbd>E</kbd></button>';
  if (h !== hbSig) { hbSig = h; hotbar.innerHTML = h; }
}

function selectTool(t) {
  if (tool === t || !t) { tool = null; }
  else if (!(S.inv[t] > 0)) { toast('You have no ' + nm(t) + '. Craft one with E.', true); tool = null; }
  else { tool = t; closePanel(); }
  renderHotbar();
}

function openTrain(t) {
  sel = null; selCar = null; selTrain = t.id;
  const B = BUILD[(t.cars.find(isLoco) || { type: 'loco' }).type], stops = [...ents.values()].filter(e => e.type === 'train_stop');
  const nl = t.cars.filter(isLoco).length, nw = t.cars.length - nl;
  panel.innerHTML = `<div class="ph"><span class="sw big" style="background:${B.c}">${B.ab}</span><div class="pt"><b>Train · ${nl} locomotive${nl === 1 ? '' : 's'}, ${nw} wagon${nw === 1 ? '' : 's'}</b><small>${t.cars.some(q => q.type === 'loco') ? 'Diesel-electric. The engine turns a generator and the traction motors drive the axles.' : 'Battery-electric. Inverters feed the traction motors from the packs, and braking charges them.'} Click a stop below to add it to the schedule.</small></div><button class="x" data-act="close" title="Close">×</button></div><div id="pdyn"></div><div class="sec">Schedule</div><div class="sched">${(t.sch || []).map((id, i) => { const e = ents.get(id); return e ? `<div class="srow${t.auto && i === t.si ? ' on' : ''}"><span>${i + 1}. ${e.nm}</span><em>${e.mode === 'unload' ? 'unload' : 'load'}</em><button data-act="tdel" data-i="${i}" title="Remove">×</button></div>` : ''; }).join('') || '<span class="dim">No stops yet.</span>'}</div><label class="row">Add stop <select data-act="tadd"><option value="">Choose a stop</option>${stops.map(e => `<option value="${e.id}">${e.nm} (${e.mode === 'unload' ? 'unload' : 'load'})</option>`).join('')}</select></label><div class="pbtns"><button data-act="tauto">${t.auto ? 'Switch to manual' : 'Run automatically'}</button>${t.cars.some(q => q.type === 'loco') ? '<button data-act="tfuel">Add jerrycans</button>' : ''}<button data-act="tdrive">${S.pl.car === t.id ? 'Get out (F)' : 'Get in (F)'}</button><button data-act="ttake">Take all cargo</button><button class="danger" data-act="tpick">Pick up</button></div>`;
  panel.hidden = false;
  renderPanelDyn();
}
function trainDyn(t) {
  const col = t.auto ? (/Heading|At /.test(t.st) ? '#7fe08a' : '#e0b84a') : '#9aa0a8';
  let h = `<div class="status"><i style="background:${col}"></i>${t.auto ? t.st || 'Starting' : S.pl.car === t.id ? 'Manual, you are driving' : 'Manual, parked'} · ${Math.round(t.v * 3.6)} km/h</div>`;
  const ne = t.cars.filter(q => q.type === 'eloco').length;
  if (ne) h += `<div class="gauge"><span>Battery</span>${bar(t.bc || 0, T_EBAT * ne, '#5aa0e0')}<b>${Math.round((t.bc || 0) / 3600)} / ${Math.round(T_EBAT * ne / 3600)} kWh</b></div>`;
  if (!t.cars.some(q => q.type === 'loco')) h += '<p class="dim">Stop within three tiles of a powered rail charger to recharge.</p>';
  else h += `<div class="gauge"><span>Tank</span>${bar(t.e || 0, CAN_MJ, '#d8b848')}<b>${Math.round(t.e || 0)} MJ</b></div>`;
  if (t.cars.some(q => q.type === 'loco')) h += `<div class="sec">Fuel slot</div><div class="cgrid"><button class="cslot" data-act="tfuel" title="Add jerrycans from your pack">${ico('jerrycan')}<span class="cnt">${t.fc || 0}/${T_FUEL}</span></button></div><p class="dim">Locomotives take jerrycans from chests beside them at any stop.</p>`;
  t.cars.forEach((c, i) => {
    if (c.type !== 'wagon') return;
    h += `<div class="sec">Wagon ${t.cars.slice(0, i + 1).filter(q => q.type === 'wagon').length} · ${carSlots(c)} / ${TRAIN.wagon.slots} slots</div><div class="cgrid">`;
    const ks = Object.keys(c.tr).sort();
    h += ks.length ? ks.map(k => `<button class="cslot" data-act="ttk" data-w="${i}" data-k="${k}" title="Take ${nm(k)}">${ico(k)}<span class="cnt">${fmt(c.tr[k])}</span></button>`).join('') : '<span class="dim">Empty</span>';
    h += '</div>';
  });
  return h;
}
function trainAct(act, el) {
  const t = trainOf(selTrain);
  if (!t) return closePanel();
  if (act === 'tadd') { const id = +el.value; if (id) { t.sch.push(id); if (t.sch.length === 1) t.si = 0; } return openTrain(t); }
  if (act === 'tdel') { const i = +el.dataset.i; t.sch.splice(i, 1); if (t.si >= i && t.si > 0) t.si--; t.route = null; return openTrain(t); }
  if (act === 'tauto') {
    t.auto = !t.auto; t.state = 'go'; t.route = null; t.rp = -9;
    if (t.auto && !t.sch.length) toast('Add stops to the schedule first.', true);
    return openTrain(t);
  }
  if (act === 'tdrive') {
    if (S.pl.car !== t.id && !(t.g || trainGeo(t)).some(g => Math.hypot(g.x - S.pl.x, g.y - S.pl.y) < 3.5)) return toast('Walk up to it first.', true);
    carToggle(); return openTrain(t);
  }
  if (act === 'tpick') return pickTrain(t);
  if (!(t.g || trainGeo(t)).some(g => inReach(g.x, g.y, REACH))) return toast('Out of reach. Walk closer.', true);
  if (act === 'tfuel') {
    const n = Math.min(T_FUEL - (t.fc || 0), S.inv.jerrycan || 0);
    if (n <= 0) return toast(t.fc >= T_FUEL ? 'The fuel slot is full.' : 'You have no jerrycans. Fill them with diesel at a cylinder filler.', true);
    S.inv.jerrycan -= n; t.fc = (t.fc || 0) + n; toast('Loaded ' + n + ' jerrycan' + (n > 1 ? 's' : ''));
  } else if (act === 'ttk') { const c = t.cars[+el.dataset.w], k = el.dataset.k; if (c) { give(k, c.tr[k] || 0); delete c.tr[k]; } }
  else if (act === 'ttake') { for (const c of t.cars) { for (const q in c.tr) give(q, c.tr[q]); c.tr = {}; } }
  renderHotbar(); renderPanelDyn();
}
function stopDyn(e) {
  const n = S.trains.filter(t => t.auto && t.sch && t.sch[t.si] === e.id).length;
  return `<div class="status"><i style="background:${e.mode === 'unload' ? '#4a8ae0' : '#7fe08a'}"></i>${e.nm} · ${n ? n + ' train' + (n > 1 ? 's' : '') + ' heading here' : 'no trains heading here'}</div><p class="dim">A train stops with its front car on the track beside this sign. Each wagon then ${e.mode === 'unload' ? 'empties into' : 'fills from'} chests within a tile of its side, 10 items every quarter second, and leaves once nothing has moved for 2 seconds. Locomotives also take jerrycans from chests beside them.</p>`;
}
function closePanel() { sel = null; selCar = null; selTrain = null; panel.hidden = true; panel.innerHTML = ''; }
function openCar(v) {
  sel = null; selCar = v.id; selTrain = null;
  const B = BUILD[v.type];
  if (VEH[v.type].oar) {
    panel.innerHTML = `<div class="ph"><span class="sw big" style="background:${B.c}">${B.ab}</span><div class="pt"><b>${B.n}</b><small>${B.d}</small></div><button class="x" data-act="close" title="Close">×</button></div><div id="pdyn"></div><div class="pbtns"><button data-act="cdrive">${S.pl.car === v.id ? 'Get off (F)' : 'Get aboard (F)'}</button><button data-act="ctake">Take all cargo</button><button data-act="cstore">Load raw materials</button><button class="danger" data-act="cpick">Pick up</button></div>`;
    panel.hidden = false;
    return renderPanelDyn();
  }
  if (VEH[v.type].sea) {
    const marks = [...ents.values()].filter(e => e.type === 'dock' || e.type === 'buoy');
    const lab = e => e.type === 'buoy' ? 'pass' : e.mode === 'unload' ? 'unload' : 'load';
    panel.innerHTML = `<div class="ph"><span class="sw big" style="background:${B.c}">${B.ab}</span><div class="pt"><b>${B.n}</b><small>${B.d}</small></div><button class="x" data-act="close" title="Close">×</button></div><div id="pdyn"></div><div class="sec">Route</div><div class="sched">${(v.sch || []).map((id, i) => { const e = ents.get(id); return e ? `<div class="srow${v.auto && i === v.si ? ' on' : ''}"><span>${i + 1}. ${e.nm}</span><em>${lab(e)}</em><button data-act="bdel" data-i="${i}" title="Remove">×</button></div>` : ''; }).join('') || '<span class="dim">No docks or buoys yet.</span>'}</div><label class="row">Add <select data-act="badd"><option value="">Choose a dock or buoy</option>${marks.map(e => `<option value="${e.id}">${e.nm} (${lab(e)})</option>`).join('')}</select></label><div class="pbtns">${VEH[v.type].net ? `<button data-act="bnet">${v.net ? 'Haul gear (N)' : 'Shoot gear (N)'}</button>` : ''}<button data-act="bauto">${v.auto ? 'Switch to manual' : 'Run automatically'}</button><button data-act="cfuel">Add jerrycans</button><button data-act="bpaint">Repaint hull</button><button data-act="cdrive">${S.pl.car === v.id ? 'Get off (F)' : 'Get aboard (F)'}</button><button data-act="ctake">Take all cargo</button><button data-act="cstore">Load raw materials</button><button class="danger" data-act="cpick">Pick up</button></div>`;
    panel.hidden = false;
    return renderPanelDyn();
  }
  panel.innerHTML = `<div class="ph"><span class="sw big" style="background:${B.c}">${B.ab}</span><div class="pt"><b>${B.n}</b><small>${B.d}</small></div><button class="x" data-act="close" title="Close">×</button></div><div id="pdyn"></div><div class="pbtns">${VEH[v.type].el ? '' : '<button data-act="cfuel">Add jerrycans</button>'}<button data-act="cdrive">${S.pl.car === v.id ? 'Get out (F)' : 'Get in (F)'}</button><button data-act="ctake">Take all cargo</button><button data-act="cstore">Load raw materials</button><button class="danger" data-act="cpick">Pick up</button></div>`;
  panel.hidden = false;
  renderPanelDyn();
}
function carDyn(v) {
  const V = VEH[v.type], used = carSlots(v);
  let h = V.oar ? `<div class="status"><i style="background:${S.pl.car === v.id ? '#7fe08a' : '#9aa0a8'}"></i>${S.pl.car === v.id ? 'You are at the oars' : 'Drifting'} · ${(Math.abs(v.v) * 1.944).toFixed(1)} knots</div><p class="dim">Rowed by hand, so it needs no fuel and cannot run a schedule. Wood does not foul like a steel hull does.</p>` : V.sea ? `<div class="status"><i style="background:${v.auto ? (/Heading|At /.test(v.st) ? '#7fe08a' : '#e0b84a') : '#9aa0a8'}"></i>${v.auto ? v.st || 'Starting' : S.pl.car === v.id ? 'Manual, you are at the helm' : 'Manual, drifting'} · ${(Math.abs(v.v) * 1.944).toFixed(1)} knots</div><div class="gauge"><span>Fouling</span>${bar(v.foul || 0, 1, (v.foul || 0) > 0.5 ? '#e0b84a' : '#6ab07a')}<b>${Math.round((v.foul || 0) * 40)}% slower</b></div><p class="dim">${v.af > 0 ? 'Antifouling active for ' + Math.ceil(v.af / 60) + ' more minutes.' : 'The antifouling has worn off. Weed and barnacles are growing on the hull.'} Repainting uses one tin of antifouling paint.</p>` : '';
  h += `<div class="gauge"><span>Body</span>${bar(v.hp, V.hp, v.hp / V.hp > 0.5 ? '#7fe08a' : '#e0b84a')}<b>${Math.round(v.hp)} / ${V.hp}</b></div>`;
  if (V.net) h += fishInfo(v);
  if (V.el) h += `<div class="gauge"><span>Battery</span>${bar(v.e || 0, V.cap, '#5ab0e8')}<b>${Math.round((v.e || 0) / 3.6)} / ${Math.round(V.cap / 3.6)} kWh</b></div><p class="dim">${Math.round(Math.abs(v.v) * 3.6)} km/h. About ${Math.round(V.cap / V.burn / 60)} minutes at full throttle, and braking puts some back. Park within three tiles of a megawatt charger or rail charger to recharge.</p>`;
  else if (!V.oar) h += `<div class="gauge"><span>Tank</span>${bar(v.e || 0, CAN_MJ, '#d8b848')}<b>${Math.round(v.e || 0)} MJ</b></div>`;
  if (!V.oar && !V.el) h += `<div class="sec">Fuel slot</div><div class="cgrid"><button class="cslot" data-act="cfuel" title="Add jerrycans from your pack">${ico('jerrycan')}<span class="cnt">${v.fc || 0}/${FUEL_CAP}</span></button></div><p class="dim">${Math.round(Math.abs(v.v) * 3.6)} km/h. A jerrycan lasts about ${Math.round(CAN_MJ / V.burn / 60)} minutes at full throttle; spare cans in your pack are poured in when the tank runs dry.</p>`;
  h += `<div class="sec">Cargo · ${used} / ${V.slots} slots</div><div class="cgrid">`;
  const ks = Object.keys(v.tr).sort();
  h += ks.length ? ks.map(k => `<button class="cslot" data-act="ctk" data-k="${k}" title="Take ${nm(k)}">${ico(k)}<span class="cnt">${fmt(v.tr[k])}</span></button>`).join('') : '<span class="dim">Empty. Click items below to load them.</span>';
  h += `</div><div class="sec">Your inventory · click to load</div><div class="cgrid">`;
  const inv = Object.keys(S.inv).filter(k => S.inv[k] > 0 && !BUILD[k]).sort();
  h += inv.slice(0, 40).map(k => `<button class="cslot" data-act="cpt" data-k="${k}" title="Load ${nm(k)}">${ico(k)}<span class="cnt">${fmt(S.inv[k])}</span></button>`).join('') || '<span class="dim">Nothing to load.</span>';
  return h + '</div>';
}
function carPut(v, k, n) {
  const V = VEH[v.type], have = S.inv[k] || 0, cur = v.tr[k] || 0;
  const room = (V.slots - carSlots(v)) * stk(k) + (cur % stk(k) ? stk(k) - cur % stk(k) : 0);
  const m = Math.min(have, n, room);
  if (m <= 0) return 0;
  S.inv[k] = have - m; if (!S.inv[k]) delete S.inv[k];
  v.tr[k] = cur + m;
  return m;
}
function carAct(act, el) {
  const v = carOf(selCar);
  if (!v) return closePanel();
  const k = el.dataset.k;
  if (act === 'badd') { const id = +el.value; if (id) { v.sch = v.sch || []; v.sch.push(id); if (v.sch.length === 1) v.si = 0; } return openCar(v); }
  if (act === 'bdel') { const i = +el.dataset.i; v.sch.splice(i, 1); if (v.si >= i && v.si > 0) v.si--; v.route = null; return openCar(v); }
  if (act === 'bnet') { netToggle(v); return openCar(v); }
  if (act === 'bauto') {
    v.auto = !v.auto; v.state = 'go'; v.route = null; v.st = '';
    if (v.auto && !(v.sch || []).length) toast('Add docks or buoys to the route first.', true);
    return openCar(v);
  }
  if (act === 'cfuel') {
    const n = Math.min(FUEL_CAP - (v.fc || 0), S.inv.jerrycan || 0);
    if (n <= 0) return toast(v.fc >= FUEL_CAP ? 'The fuel slot is full.' : 'You have no jerrycans. Fill them with diesel at a cylinder filler.', true);
    S.inv.jerrycan -= n; v.fc = (v.fc || 0) + n; toast('Loaded ' + n + ' jerrycan' + (n > 1 ? 's' : ''));
  } else if (act === 'cdrive') { if (S.pl.car !== v.id && Math.hypot(v.x - S.pl.x, v.y - S.pl.y) > 3 + VEH[v.type].hw) return toast('Walk up to it first.', true); carToggle(); return openCar(v); }
  else if (act === 'cpick') return pickCar(v);
  else if (!inReach(v.x, v.y, REACH)) return toast('Out of reach. Walk closer.', true);
  else if (act === 'bpaint') {
    if (!(S.inv.antifouling > 0)) return toast('You need a tin of antifouling paint. Disperse cuprous oxide and rosin in xylene.', true);
    S.inv.antifouling--; v.foul = 0; v.af = 3600; toast('Hull scraped and repainted. Clean for an hour.');
  }
  else if (act === 'ctk') { give(k, v.tr[k] || 0); delete v.tr[k]; }
  else if (act === 'cpt') { if (!carPut(v, k, S.inv[k] || 0)) toast('The cargo bed is full.', true); }
  else if (act === 'ctake') { for (const q in v.tr) give(q, v.tr[q]); v.tr = {}; }
  else if (act === 'cstore') { let n = 0; for (const q of Object.keys(S.inv)) if (ORES.some(o => o && o.item === q)) n += carPut(v, q, S.inv[q]); toast(n ? 'Loaded ' + n + ' raw materials' : 'No raw materials to load', !n); }
  renderHotbar(); renderPanelDyn();
}

function openPanel(e) {
  sel = e.id; selCar = null; selTrain = null;
  const B = BUILD[e.type];
  let h = `<div class="ph"><span class="sw big" style="background:${B.c}">${B.ab || ''}</span><div class="pt"><b>${B.n}</b><small>${B.d}</small></div><button class="x" data-act="close" title="Close">×</button></div>`;
  if (B.lab) { const t = curTech(); h += `<div class="row">Researching <b>${t ? BUILD[t].n : 'nothing'}</b>${B.ls ? ` at ×${B.ls} speed` : ''} <button data-act="tech">Research (T)</button></div>`; }
  if (kind(e) === 'machine' && !B.store && !B.lab) {
    const rl = RECIPES.filter(r => runs(e.type, r) && (avail(r) || e.recipe === r.id));
    h += `<div class="sec">Recipe <small class="dim">${e.recipe ? 'Shift+right-click copies it, Shift+click pastes' : 'pick one'}</small></div><div class="rpick">${rl.map(r => `<button class="rs ok rp${e.recipe === r.id ? ' on' : ''}" data-act="rpick" data-r="${r.id}" data-k="${r.id}" data-m="x">${ico(rMain(r))}</button>`).join('')}${e.recipe ? '<button class="rs no rpx" data-act="rpick" data-r="" title="Clear recipe">×</button>' : ''}</div>`;
  }
  if (e.type === 'sorter') {
    h += `<label class="row">Filter <select data-act="filter"><option value="">None (all forward)</option>${Object.keys(ITEMS).map(k => `<option value="${k}" ${e.filter === k ? 'selected' : ''}>${ITEMS[k].n}</option>`).join('')}</select></label>`;
  }
  if (e.type === 'dock') h += `<label class="row">Mode <select data-act="smode"><option value="load" ${e.mode !== 'unload' ? 'selected' : ''}>Load boats</option><option value="unload" ${e.mode === 'unload' ? 'selected' : ''}>Unload boats</option></select></label>`;
  if (e.type === 'train_stop') h += `<label class="row">Mode <select data-act="smode"><option value="load" ${e.mode !== 'unload' ? 'selected' : ''}>Load wagons</option><option value="unload" ${e.mode === 'unload' ? 'selected' : ''}>Unload wagons</option></select></label>`;
  h += '<div id="pdyn"></div><div class="pbtns">';
  if (e.type === 'boiler') h += '<button data-act="descale">Descale (20 s outage)</button>';
  if (kind(e) === 'machine' && !B.store) h += '<button data-act="insert">Insert from inventory</button><button data-act="take">Take outputs</button>';
  if (kind(e) === 'miner') h += '<button data-act="take">Take ore</button>';
  if (e.type === 'depot') h += '<button data-act="deliver">Deliver from inventory</button>';
  if (e.type === 'chest') h += '<button data-act="takeall">Take all</button><button data-act="store">Store raw materials</button>';
  if (e.type === 'booster') h += `<label class="row">Outlet pressure <select data-act="head">${HEADS.concat(e.head).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b).map(v => `<option value="${v}" ${e.head === v ? 'selected' : ''}>${v} bar</option>`).join('')}</select></label>`;
  if (kind(e) === 'pipe') h += '<button data-act="flush">Flush network</button>';
  if (belty(e) || B.ug || kind(e) === 'inserter' || e.type === 'sorter' || e.type === 'booster') h += '<button data-act="rotate">Rotate (R)</button>';
  if (e.type === 'turret') h += '<button data-act="load">Load cartridges</button>';
  if (e.type === 'projector') h += '<button data-act="pload">Load from inventory</button>';
  if (e.type === 'howitzer') h += '<button data-act="gload">Load shells</button>';
  if (e.type === 'burrow') h += `<button data-act="delve" ${e.done ? 'disabled' : ''}>Climb down the rope</button>`;
  if (e.type === 'infested') h += `<button data-act="delve" ${e.done ? 'disabled' : ''}>Ride the cage down</button>`;
  if (e.type === 'lavatube' || e.type === 'icecave') h += `<button data-act="delve" ${e.done ? 'disabled' : ''}>Climb down the rope</button>`;
  if (e.type === 'nh3works') h += `<button data-act="delve" ${e.done ? 'disabled' : ''}>Go in through the gate</button>`;
  if (e.type === 'ruin') h += `<button data-act="search" ${e.done ? 'disabled' : ''}>Search the works</button>`;
  if (kind(e) === 'pole') h += '<button data-act="wauto">Connect to nearby grids</button><button data-act="wcut">Cut all wires</button>';
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
    (r.catReq && r.wear ? `<div class="note">Needs ${chip(r.cat)}, one lasts about ${r.life} cycles</div>` : r.catReq ? `<div class="note">Burns ${chip(r.cat)}, one lasts about ${r.life} cycles</div>` : r.cat ? `<div class="note">Catalyst ${chip(r.cat)} up to ${1 + r.boost}× speed, a charge lasts about ${r.life} batches</div>` : '') +
    (r.eq ? `<div class="eq">${r.eq}</div>` : '') + (r.note ? `<div class="note">${r.note}</div>` : '');
}

function catHtml(e, r) {
  const on = e.catK === r.cat && e.ca > 0, sp = on ? e.catN || 0 : 0;
  if (r.catReq) {
    if (r.wear) {
      let f = `<div class="sec">Elements</div><div class="slots"><div class="slot">${chip(r.cat, (on ? 1 : 0) + sp + '/' + CAT_CAP)}</div></div>`;
      if (on) f += `<div class="gauge"><span>${r.wear}</span>${bar(1 - e.ca, 1, '#a09060')}<b>${Math.round((1 - e.ca) * 100)}%</b></div><p class="dim">${sp ? sp + ' spare loaded, the next one goes in when this one is worn out.' : 'No spare loaded. Add another before this one is worn out.'}${SPENT[r.cat] ? ` Worn ones come out as ${ITEMS[SPENT[r.cat]].n}.` : ' Worn ones are scrapped.'}</p>`;
      else f += `<p class="bad">It cannot run without ${ITEMS[r.cat].n}. Chests and belts feed it too.</p>`;
      return f;
    }
    let f = `<div class="sec">Core</div><div class="slots"><div class="slot">${chip(r.cat, (on ? 1 : 0) + sp + '/' + CAT_CAP)}</div></div>`;
    if (on) f += `<div class="gauge"><span>Burnup</span>${bar(1 - e.ca, 1, '#c88a30')}<b>${Math.round((1 - e.ca) * 100)}%</b></div><p class="dim">${sp ? sp + ' spare in the pool, the next one goes in when this one is spent.' : 'No spare assembly. Load another before this one is spent.'} Spent assemblies come out as ${ITEMS[SPENT[r.cat]].n}.</p>`;
    else f += `<p class="bad">No fuel. Load ${ITEMS[r.cat].n} to start it. Chests and belts feed it too.</p>`;
    return f;
  }
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

function poleDyn(e) {
  const B = BUILD[e.type], l = lists(), n = l.nets[e.pn];
  let h = '';
  if (!wired()) h += '<p class="note">This world was made with power lines off: every machine shares one grid, so poles only carry wire for show. Pick <b>Power lines: Required</b> when you generate a world to run separate grids.</p>';
  if (n) {
    const pct = Math.round(n.sat * 100), cls = n.demand === 0 ? '' : pct >= 99 ? 'ok' : pct > 40 ? 'warn' : 'bad';
    h += `<div class="status"><i style="background:${n.cap > 0 ? n.sat >= 0.99 ? ST_COL.work : ST_COL.input : ST_COL.power}"></i>${wired() ? `Grid ${n.id + 1} of ${l.nets.length}` : 'Shared grid'} · ${n.poles} pole${n.poles === 1 ? '' : 's'} · ${n.use} machine${n.use === 1 ? '' : 's'}</div>`;
    h += `<div class="gauge"><span>Supply</span>${bar(n.gen, Math.max(1, n.demand), '#e0c84a')}<b class="${cls}">${fmt(n.gen)} / ${fmt(n.demand)} kW</b></div>`;
    h += `<div class="gauge"><span>Load</span>${bar(n.load, 1, '#6ab0e0')}<b>${Math.round(n.load * 100)}% of ${fmt(n.cap)} kW</b></div>`;
    if (n.bmax) h += `<div class="gauge"><span>Battery</span>${bar(n.bat, n.bmax, '#8ad0a0')}<b>${Math.round(n.bat / n.bmax * 100)}%</b></div>`;
    if (wired() && n.demand > 0 && n.cap === 0 && !n.bat) h += '<p class="bad">Nothing on this grid generates power. Wire it to a pole that touches an engine or generator.</p>';
  }
  h += `<p class="dim">${e.w.length} / ${WMAX} wires · supplies machines touching its ${2 * B.sup + B.w}×${2 * B.sup + B.h} area · wire reaches ${B.reach} tiles. Shift-click another pole while this one is selected to string or cut a wire.</p>`;
  return h;
}
function renderPanelDyn() {
  if (selCar) { const v = carOf(selCar), box = document.getElementById('pdyn'); if (!v) return closePanel(); if (box) box.innerHTML = carDyn(v); return; }
  if (selTrain) { const t = trainOf(selTrain), box = document.getElementById('pdyn'); if (!t) return closePanel(); if (box) box.innerHTML = trainDyn(t); return; }
  const e = sel && ents.get(sel), box = document.getElementById('pdyn');
  if (!e || !box) return;
  let h = '';
  const k = kind(e);
  if (k === 'stop') { box.innerHTML = stopDyn(e); return; }
  if (k === 'dock' || k === 'buoy') { box.innerHTML = dockDyn(e); return; }
  if (k === 'pole') { box.innerHTML = poleDyn(e); return; }
  if (k === 'machine' && BUILD[e.type].store) {
    const B = BUILD[e.type], ch = e.ch || 0, kw = e.kw || 0;
    h += `<div class="status"><i style="background:${ST_COL[e.st] || '#888'}"></i>${ST_TXT[e.st] || 'Idle, no load'}${kw > 0.5 ? ` · giving ${Math.round(kw)} kW` : kw < -0.5 ? ` · taking ${Math.round(-kw)} kW` : ''}</div>`;
    h += `<div class="sec">Charge</div><div class="gauge"><span>Stored</span>${bar(ch, B.store, '#8ad0a0')}<b>${Math.round(ch / B.store * 100)}%</b></div><p class="dim">${(ch / 3600).toFixed(1)} of ${(B.store / 3600).toFixed(0)} kWh. Up to ${B.rate} kW in or out, ${Math.round((B.eff || 0.85) * 100)}% round trip. It charges only from capacity nothing else is using, and discharges when generators fall short.</p>`;
    h += recipeHtml(RECIPE[e.recipe] || RECIPES.find(r => runs(e.type, r)) || RECIPE.store);
  } else if (k === 'machine') {
    const r = RECIPE[e.recipe];
    if (!r) h += '<p class="dim">Pick a recipe, or feed it an item and it will choose one.</p>';
    else {
      h += recipeHtml(r);
      const st = e.cy && e.st !== 'power' && e.st !== 'nopole' && e.st !== 'idle' ? 'work' : e.st;
      h += `<div class="status"><i style="background:${ST_COL[st]}"></i>${e.type === 'boiler' && st === 'output' ? 'Steam full, waiting for demand' : ST_TXT[st] || ''}${BUILD[e.type].kw ? ` · ${BUILD[e.type].kw} kW` : BUILD[e.type].gen ? ` · ${Math.round(e.cy ? e.kw || 0 : 0)} / ${BUILD[e.type].gen} kW out` : BUILD[e.type].sun || BUILD[e.type].marine ? ' · needs no power' : ' · fuel-fired'}</div>`;
      h += `<div class="prog">${bar(e.cy ? e.prog : 0, 1, '#7fe08a')}</div>`;
      if (r.cat) h += catHtml(e, r);
      if (e.type === 'boiler') h += `<div class="sec">Tube scale</div><div class="gauge"><span>Scale</span>${bar(e.scale || 0, 1, '#d8c8a0')}<b>${Math.round((e.scale || 0) * 100)}%</b></div><p class="dim">${e.desc > 0 ? `Descaling, back in ${Math.ceil(e.desc)} s.` : (e.soft || 0) > 1 ? 'Fed softened water: no new scale.' : 'Hard water bakes chalk onto the tubes, and steam output falls as the scale thickens. Feed softened water, or shut down and descale.'} Steam rate ${Math.round(scaleMul(e) * 100)}%.</p>`;
      if (BUILD[e.type].soil) h += `<div class="sec">Climate</div><div class="gauge"><span>Soil</span>${bar(soilOf(e), 1, '#8ab040')}<b>${Math.round(soilOf(e) * 100)}%</b></div><p class="dim">How well crops grow on this ground. Grassland is best, scrub and marsh give less, and forest, tundra and desert hardly anything.</p>`;
      if (BUILD[e.type].sun) h += `<div class="sec">Climate</div><div class="gauge"><span>Sun</span>${bar(sunOf(e), 1, '#e0c050')}<b>${Math.round(sunOf(e) * 100)}%</b></div><p class="dim">${e.type === 'solar' ? 'Sunlight reaching the panels. Arrays give most on desert sand and least in forest, marsh and tundra.' : e.type === 'copra_dryer' ? 'Sun-drying rate here. Copra dries fastest in hot sun and goes mouldy in damp, cloudy places.' : e.type === 'agave_field' ? 'Sunshine here. Agave and sisal thrive on hot, dry ground and grow slowly in cold or wet places.' : e.type === 'nopalry' ? 'Sunshine here. Prickly pear and its insects do best on hot desert sand and worst on tundra and marsh.' : e.type === 'curing_shed' ? 'Sun-drying rate here. Pods dry fastest on desert sand and slowest on tundra and marsh.' : 'Evaporation rate here. Ponds run fastest on desert sand and slowest on tundra and marsh.'}</p>`;
      if (BUILD[e.type].wind) h += `<div class="sec">Climate</div><div class="gauge"><span>Exposure</span>${bar(exposureOf(e), 1, '#80b0d0')}<b>${Math.round(exposureOf(e) * 100)}%</b></div><div class="gauge"><span>Wind</span>${bar(windCurve(), 1, '#a0c8e0')}<b>${(S.wind.v * 10).toFixed(1)} m/s</b></div><p class="dim">Output follows the wind speed cubed, times how open the ground is. Steppe and tundra are best; trees slow the wind.</p>`;
      if (BUILD[e.type].tide) { const ph = (S.t % (2 * TIDE_T)) < TIDE_T; h += `<div class="sec">Tide</div><div class="gauge"><span>Current</span>${bar(tideOf(), 1, '#60a0c8')}<b>${Math.round(tideOf() * 100)}%</b></div><p class="dim">${ph ? 'Flood tide' : 'Ebb tide'}, turning in ${Math.ceil(TIDE_T - S.t % TIDE_T)} s. Power follows the current speed cubed, so it peaks at mid-tide and drops to nothing at slack water. Batteries carry the grid through the turn.</p>`; }
      if (BUILD[e.type].forest) h += `<div class="sec">Forest</div><div class="gauge"><span>Stand</span>${bar(forestOf(e), FOREST_FULL, '#4a8a3a')}<b>${Math.round(forestMul(e) * 100)}%</b></div><p class="dim">${forestOf(e)} forest tiles within ${FOREST_R} tiles. It runs at full speed with ${FOREST_FULL} or more.</p>`;
      if (r.well) { const l = wellTiles(e), left = l.reduce((a, q) => a + oreAmt[q], 0); h += `<div class="sec">Reservoir</div><div class="spec">${l.length} of ${BUILD[e.type].w * BUILD[e.type].h} tiles on oil · ${fmt(left * Object.values(r.fo)[0])} ${FLUIDS[Object.keys(r.fo)[0]].n.toLowerCase()} left</div>`; }
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
    const MB = BUILD[e.type];
    for (let j = 0; j < MB.h; j++) for (let i = 0; i < MB.w; i++) { const q = (e.y + j) * W + e.x + i; if (solid(q)) ores[ORES[oreType[q]].item] = (ores[ORES[oreType[q]].item] || 0) + oreAmt[q]; }
    h += `<div class="status"><i style="background:${ST_COL[e.st] || '#888'}"></i>${ST_TXT[e.st] || ''} · ${MB.kw} kW · ${+(1 / (MB.mt || MINER_T)).toFixed(2)} ore/s</div><div class="prog">${bar(e.prog, 1, '#7fe08a')}</div>`;
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
    if (wired() && e.pn < 0) h += '<p class="bad">Not connected to a power pole, so its power goes nowhere. Put a pole so its blue supply area touches the engine.</p>';
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
    const T = htier(e), gd = S.bugs.filter(b => b.hid === e.id).length;
    h += `<div class="status"><i style="background:${['', '#b0a060', '#c07a4a', '#e04a4a'][e.tier || 2]}"></i>${T.n} · ${gd} of ${T.gd} guards out · swarms ${T.sw}× normal size</div>`;
    if (T.gr) h += `<div class="gauge"><span>Growth</span>${bar(e.gr || 0, T.gr, '#a04a6a')}<b>${Math.round(e.gr || 0)} / ${T.gr}</b></div>`;
    h += `<div class="spec">Smog around it ${Math.round(polAt(e.x + 1, e.y + 1))} · ${e.sw} swarms sent · crawler evolution ${Math.round(S.evo * 100)}%</div>`;
    h += resHtml();
    h += '<p class="dim">The hive breathes in smog from the 24×24 tiles around it. Each 50 food sends a swarm at whatever vented most recently. Every eighth swarm founds a new hive, as close to the smog as it can. Guns or poison gas are the only ways to clear one, and they defend themselves. Smog it eats also makes it grow: a nest becomes a hive, then a brood mound with more guards and bigger swarms. Guards circle the mound and go for anyone who comes close. Once evolution passes 20% some crawlers hatch as spitters that lob acid from 4 tiles away, and past 45% big armoured brutes appear. The wreck gives up crawler shell, a source of chitin, and the sulfur granules the crawlers hoard in their guts.</p>';
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
  } else if (e.type === 'burrow') {
    const T = burrowTier(e), oc = (e.oc || []).length;
    h += `<div class="status"><i style="background:${e.done ? ST_COL.none : ST_COL.input}"></i>${e.done ? 'Collapsed' : DGK[dgKind(e)] + ' · tier ' + T + ' · queen ' + (e.qhp != null ? 'wounded' : 'unhurt') + ' · ' + oc + ' of ' + dgCaches(e) + ' caches opened'}</div>`;
    h += `<p class="dim">${e.done ? 'With the queen dead the tunnels have fallen in.' : 'Climb down with plenty of cartridges. It is dark below: your lamp shows a few tiles, crawlers wake when they see or hear you, and the queen at the far end keeps laying more until she dies. Dig rock with the mouse, glinting veins give sulfur and ore. Killing the queen drops her carapace and collapses the burrow when you climb out.'}</p>`;
  } else if (e.type === 'infested') {
    const T = burrowTier(e), oc = (e.oc || []).length, n = dgCaches(e);
    h += `<div class="status"><i style="background:${e.done ? ST_COL.none : ST_COL.input}"></i>${e.done ? 'Capped' : 'Tier ' + T + ' mine · tyrant ' + (e.qhp === 0 ? 'dead' : e.qhp != null ? 'wounded' : 'unhurt') + ' · ' + oc + ' of ' + n + ' chests opened' + (e.key ? ' · pump hall key found' : '')}</div>`;
    h += `<p class="dim">${e.done ? 'Cleared and capped. The headframe will rust in peace.' : 'An abandoned sulfide mine the crawlers moved into. The cage still runs. Below are shotcrete roadways, storerooms, lamp rooms and pump stations with miners\' lockers, egg clutches that keep hatching while you are near, and a padlocked blast door to the old pump hall where a brood tyrant has nested. The key is in the shift boss\'s safe. The mine is capped once the tyrant is dead and every chest is open.'}</p>`;
  } else if (XDG[e.type] && e.type !== 'infested') {
    const T = burrowTier(e), oc = (e.oc || []).length, n = dgCaches(e), ty = XDG[e.type], qn = DGQ[ty].toLowerCase();
    h += `<div class="status"><i style="background:${e.done ? ST_COL.none : ST_COL.input}"></i>${e.done ? DGX[ty].gone : DGK[ty] + ' · tier ' + T + ' · ' + qn + ' ' + (e.qhp === 0 ? 'dead' : e.qhp != null ? 'wounded' : 'unhurt') + ' · ' + oc + ' of ' + n + (ty === 'works' ? ' lockers' : ' caches') + ' opened' + (e.key ? ' · hall key found' : '')}</div>`;
    h += `<p class="dim">${e.done ? DGX[ty].gone + '.' : DGX[ty].info}</p>`;
  } else if (k === 'ruin') {
    const g = guards(e).length;
    h += `<div class="status"><i style="background:${e.done ? ST_COL.none : g ? ST_COL.input : ST_COL.work}"></i>${e.done ? 'Searched' : g ? g + ' hive' + (g > 1 ? 's' : '') + ' within 16 tiles' : 'Unguarded'}</div>`;
    h += `<p class="dim">${e.done ? 'Only rust and broken glass are left.' : g ? 'Crawlers have nested around the old works. Clear every hive within 16 tiles, then search it for salvage and the lab books.' : 'Nothing stops you now. The stores may still hold platinum catalyst gauze, motors and cylinders, and the lab books will teach you a lost process.'}</p>`;
  } else if (k === 'pump') {
    h += `<div class="status"><i style="background:${e.on ? ST_COL.work : ST_COL.output}"></i>${e.on ? 'Pumping' : 'Nothing to pump into'}</div>`;
  } else if (k === 'inserter') {
    const IB = BUILD[e.type];
    h += `<div class="status"><i style="background:${e.hn ? ST_COL.work : ST_COL.none}"></i>${e.hn ? 'Carrying ' + e.hn + ' ' + nm(e.hand) : 'Waiting for something the target can use'}</div>`;
    h += `<p class="dim">Reach ${IB.r || 1} tile${(IB.r || 1) > 1 ? 's' : ''} · hand ${IB.hand} · swing ${IB.sw}s · up to ${(IB.hand / IB.sw).toFixed(1)} items/s · ${IB.kw} kW while moving</p><p class="dim">Picks from the tile behind and drops on the tile in front. It only picks items the target can use, so one arm can feed a machine from a mixed belt.</p>`;
  } else if (k === 'belt' || k === 'ubelt' || k === 'splitter') {
    if (k === 'splitter') { const g = (lists().sg.get(e.id) || [e]).length; h += `<div class="status"><i style="background:${g > 1 ? ST_COL.work : ST_COL.input}"></i>${g > 1 ? 'Sharing items across ' + g + ' outputs' : 'On its own: splits forward, left and right'}</div>`; }
    if (k === 'ubelt') { const u = ugPair(e); h += `<div class="status"><i style="background:${u ? ST_COL.work : ST_COL.input}"></i>${e.mode === 'in' ? 'Entrance' : 'Exit'} · ${u ? 'joined to the ' + (e.mode === 'in' ? 'exit' : 'entrance') + ' ' + u.n + ' tiles away' : 'not joined: place a matching ' + (e.mode === 'in' ? 'exit' : 'entrance') + ' within ' + (B.ug - 1) + ' tiles'}</div>`; }
    const its = k === 'ubelt' && e.mode !== 'in' ? ((ugPair(e) || {}).o || { items: [] }).items : e.items;
    const ln = l => its.filter(q => (q.l || 0) === l).map(q => `<div class="slot">${chip(q.i)}</div>`).join('') || '<span class="dim">Empty</span>';
    h += `<p class="dim">Speed ${BUILD[e.type].v} tiles/s</p><p class="dim">Left lane</p><div class="slots">${ln(0)}</div><p class="dim">Right lane</p><div class="slots">${ln(1)}</div>`;
  } else if (k === 'sorter') {
    h += `<div class="slots"><div class="slot">${e.buf ? chip(e.buf) : '<span class="dim">Empty</span>'}</div></div><p class="dim">Filtered item goes straight on. Everything else turns right.</p>`;
  }
  if (k !== 'hive' && e.hp != null && e.hp < maxHp(e)) h += `<div class="gauge"><span>Integrity</span>${bar(e.hp, maxHp(e), '#e04a4a')}<b>${Math.round(e.hp)} / ${maxHp(e)}</b></div><p class="dim">Pick it up and put it back to rebuild it.</p>`;
  box.innerHTML = h;
}

function panelAct(act, el) {
  const e = sel && ents.get(sel);
  if (act === 'close') return closePanel();
  if (act === 'tech') return openModal('tech');
  if (selCar) return carAct(act, el);
  if (selTrain) return trainAct(act, el);
  if (!e) return;
  if (act === 'smode') { e.mode = el.value === 'unload' ? 'unload' : 'load'; return renderPanelDyn(); }
  if (act === 'rpick') { setRecipe(e, el.dataset.r || null); return openPanel(e); }
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
      if (!ITEMS[k] || PARTS.includes(k) || CMB.includes(k)) continue;
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
  } else if (act === 'wauto') {
    const n = autoWire(e);
    toast(n ? `Strung ${n} wire${n > 1 ? 's' : ''}` : 'No other grid within reach', !n); renderPanelDyn();
  } else if (act === 'wcut') {
    for (const id of e.w.slice()) { const o = ents.get(id); if (o) wcut(e, o); }
    e.w = []; L = null; toast('Wires cut'); renderPanelDyn();
  } else if (act === 'rotate') { rotEnt(e); }
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
  else if (act === 'delve') { dgEnter(e); return; }
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
  modalTab = tab || (kind === 'craft' ? 'craft' : kind === 'ency' ? 'index' : kind === 'world' ? 'world' : kind === 'map' ? 'map' : kind === 'ach' ? 'ach' : kind === 'tech' ? 'tech' : 'help');
  modal.hidden = false;
  modal.querySelector('.mwin').classList.toggle('wide', kind === 'craft');
  modal.querySelector('.mwin').classList.toggle('mapw', kind === 'map');
  if (kind === 'map') mapOpen();
  if (kind === 'ency') { eQ = ''; ePush(); }
  cSig = '';
  renderModal();
}
function closeModal() { modal.hidden = true; modalKind = null; ftip.hidden = true; ftipK = ''; }

const TABS = {
  craft: [['craft', 'Inventory and crafting'], ['equip', 'Armour']],
  ency: [['index', 'Index'], ['chains', 'Chains'], ['recipes', 'Recipes'], ['mats', 'Materials'], ['pipes', 'Pipes']],
  help: [['help', 'How to play']],
  world: [['world', 'New world']],
  map: [['map', 'World map']],
  ach: [['ach', 'Achievements']],
  tech: [['tech', 'Research']],
};
let wcfg = null;
const parseSeed = v => { v = String(v).trim(); if (/^\d+$/.test(v)) return +v % 2147483647; let h = 7; for (const c of v) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h % 2147483647; };
const sel3 = (id, cur, opts) => `<select id="${id}">${opts.map(([v, n]) => `<option value="${v}" ${String(v) === String(cur) ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
const TER_LEG = [0, 6, 5, 2, 3, 7, 4, 1];
function legendHtml() { return '<div class="wleg">' + TER_LEG.map(t => `<span><i style="background:${t === 1 ? '#20507b' : PAL[t][0]}"></i>${TER_N[t]}</span>`).join('') + '</div>'; }
function worldHtml() {
  if (!wcfg) wcfg = { seed: String(Math.floor(Math.random() * 1e9)), size: 256, water: 1, ore: 1, hives: 2, inf: 0, wire: 1, forest: 2, rock: 1, clim: 1, rain: 1, dgn: 2, kit: 0 };
  return `<div class="wgen"><div class="wopts"><p class="dim">Every world is generated from its seed. The same seed and settings always give the same map: continents, rivers, mountain ranges, and ore fields that follow the geology. Hot dry south, cold north. Endless worlds are continents and islands with open sea between them, so you will need boats.</p>
<label>Seed <span class="row"><input id="wseed" value="${wcfg.seed}" spellcheck="false"><button data-world="dice">Random</button></span></label>
<label>Size ${sel3('wsize', wcfg.size, [[160, 'Small · 160×160'], [256, 'Normal · 256×256'], [384, 'Large · 384×384'], [512, 'Huge · 512×512'], [2048, 'Endless · land is made as you explore']])}</label>
<label>Water ${sel3('wwater', wcfg.water, [[0, 'Dry · few lakes and rivers'], [1, 'Normal'], [2, 'Wet · big lakes, many rivers']])}</label>
<label>Ore fields ${sel3('wore', wcfg.ore, [[0, 'Poor · fewer, leaner deposits'], [1, 'Normal'], [2, 'Rich · more, fatter deposits']])}</label>
<label>Crawlers ${sel3('whives', wcfg.hives, [[0, 'None · peaceful'], [1, 'Few'], [2, 'Normal'], [3, 'Many']])}</label>
<label>Ore depletion ${sel3('winf', wcfg.inf, [[0, 'Finite · deposits run out'], [1, 'Endless · deposits never run out']])}</label>
<label>Power lines ${sel3('wwire', wcfg.wire, [[1, 'Required · poles carry power to machines'], [0, 'Wireless · every machine shares one grid']])}</label>
<label>Forests ${sel3('wforest', wcfg.forest ?? 2, [[0, 'Sparse · open country, few woods'], [1, 'Fewer'], [2, 'Normal'], [3, 'Dense · woods wherever it is wet']])}</label>
<label>Bare rock ${sel3('wrock', wcfg.rock ?? 1, [[0, 'Low · only the highest peaks'], [1, 'Normal'], [2, 'Rugged · rocky outcrops everywhere'], [3, 'Badlands · rock walls cut up the land']])}</label>
<label>Climate ${sel3('wclim', wcfg.clim ?? 1, [[0, 'Cold · more tundra, less desert'], [1, 'Temperate'], [2, 'Hot · more desert, little tundra']])}</label>
<label>Rainfall ${sel3('wrain', wcfg.rain ?? 1, [[0, 'Arid · scrub and dunes'], [1, 'Normal'], [2, 'Wet · forests and marshes']])}</label>
<label>Dungeons ${sel3('wdgn', wcfg.dgn ?? 2, [[0, 'None · no burrows, mines, caves or works'], [1, 'Few'], [2, 'Normal'], [3, 'Many']])}</label>
<label>Starting kit ${sel3('wkit', wcfg.kit ?? 0, [[0, 'Normal'], [1, 'Generous · twice the starting items']])}</label>
<div class="dim">On an endless world, ore fields are sparser than usual but grow richer the farther you travel from the start. Endless ore keeps every deposit at its first amount forever.</div>
<div class="dim">Ores by geology: copper and lead-zinc in the hills, coal under swamps and forests, salt, caliche and potash in deserts, bauxite in hot wet laterite, mineral sands on beaches, oil in sedimentary basins.</div>
<button data-world="go" class="danger big">Generate and start</button><div class="dim">Your current factory will be lost.</div></div>
<div class="wprev"><canvas id="wprev"></canvas>${legendHtml()}</div></div>`;
}
function wgen() { return { size: +wcfg.size, water: +wcfg.water, ore: +wcfg.ore, hives: +wcfg.hives, inf: +wcfg.inf || 0, wire: +wcfg.wire || 0, forest: +(wcfg.forest ?? 2), rock: +(wcfg.rock ?? 1), clim: +(wcfg.clim ?? 1), rain: +(wcfg.rain ?? 1), dgn: +(wcfg.dgn ?? 2), kit: +(wcfg.kit ?? 0) }; }
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
  if (isEndless(g)) {
    terrain = new Uint8Array(W * H).fill(4); oreType = new Uint8Array(W * H); oreAmt = new Int32Array(W * H); elev = new Float32Array(W * H).fill(0.8); patches = [];
    const sd = parseSeed(wcfg.seed), a = W / 2 / RG - 2;
    for (let ry = a; ry < a + 4; ry++) for (let rx = a; rx < a + 4; rx++) genRegion(sd, g, rx, ry);
    const o = a * RG, n = 4 * RG, T = new Uint8Array(n * n), O = new Uint8Array(n * n), E = new Float32Array(n * n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const k = (o + y) * W + o + x; T[y * n + x] = terrain[k]; O[y * n + x] = oreType[k]; E[y * n + x] = elev[k]; }
    terrain = T; oreType = O; elev = E; W = H = n;
  } else genWorld(parseSeed(wcfg.seed), g);
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
const entCol = (e, k) => k === 'hive' ? '#e04040' : e.type === 'burrow' ? (e.done ? '#6a5a4a' : '#e0a040') : e.type === 'infested' ? (e.done ? '#6a5a4a' : '#e06a40') : e.type === 'lavatube' ? (e.done ? '#6a5a4a' : '#ff5020') : e.type === 'icecave' ? (e.done ? '#6a5a4a' : '#a0e0ff') : e.type === 'nh3works' ? (e.done ? '#6a5a4a' : '#c0c8d0') : k === 'ruin' ? '#c080ff' : k === 'road' ? '#8a8a8a' : k === 'rail' ? '#b09070' : '#ffe080';
const mv = { x: 0, y: 0, z: 2 };
let mDrag = null;
function mapHtml() { return `<div class="fmap"><canvas id="wmap"></canvas><details class="fleg" open><summary>Legend</summary>${legendHtml()}<div class="wleg"><span><i style="background:#e04040"></i>Crawler hive</span><span><i style="background:#c080ff"></i>Abandoned works</span><span><i style="background:#e0a040"></i>Crawler burrow</span><span><i style="background:#e06a40"></i>Infested mine</span><span><i style="background:#ff5020"></i>Lava tube</span><span><i style="background:#a0e0ff"></i>Ice cave</span><span><i style="background:#c0c8d0"></i>Ammonia works</span><span><i style="background:#ffe080"></i>Your buildings</span><span><i style="background:#ff4050"></i>Crawlers</span><span><i style="background:#4ae0ff"></i>You</span></div><p class="dim">Seed ${S.seed}${S.gen && !S.gen.legacy ? '' : ' · classic map'} · ${rgd ? 'endless world, unexplored land stays dark' : W + '×' + H}${S.gen && S.gen.inf ? ' · endless ore' : ''}</p></details><div class="fzb"><button data-fz="1" title="Zoom in">+</button><button data-fz="-1" title="Zoom out">−</button><button data-fz="0" title="Centre on you">◎</button></div><div class="fpos"></div><div class="fhint">Drag to pan · Wheel to zoom · Click to look there · M or Esc to close</div></div>`; }
function mapOpen() { mv.x = cam.x; mv.y = cam.y; mv.z = rgd ? 2 : Math.max(1, Math.min(4, 700 / W)); }
function mapZoom(f, px, py) {
  const c = document.getElementById('wmap');
  if (!c) return;
  const cw = c.width, ch = c.height;
  if (px == null) { px = cw / 2; py = ch / 2; }
  const wx = mv.x + (px - cw / 2) / mv.z, wy = mv.y + (py - ch / 2) / mv.z;
  mv.z = Math.max(0.25, Math.min(32, mv.z * f));
  mv.x = wx - (px - cw / 2) / mv.z; mv.y = wy - (py - ch / 2) / mv.z;
  drawMapView();
}
function drawEnts(x2, x0, y0, x1, y1, s, minS) {
  for (const e of ents.values()) {
    const B = BUILD[e.type];
    if (e.x + B.w < x0 || e.y + B.h < y0 || e.x > x1 || e.y > y1) continue;
    const k = kind(e), big = k === 'hive' || k === 'ruin';
    x2.fillStyle = entCol(e, k);
    x2.fillRect((e.x - x0) * s, (e.y - y0) * s, Math.max(big ? 4 : minS, B.w * s), Math.max(big ? 4 : minS, B.h * s));
  }
}
function drawMapView() {
  const c = document.getElementById('wmap');
  if (!c) return;
  const w = Math.max(50, Math.round(c.clientWidth)), hh = Math.max(50, Math.round(c.clientHeight));
  if (c.width !== w || c.height !== hh) { c.width = w; c.height = hh; }
  const x2 = c.getContext('2d'), s = mv.z, x0 = mv.x - w / 2 / s, y0 = mv.y - hh / 2 / s, x1 = x0 + w / s, y1 = y0 + hh / s;
  x2.setTransform(1, 0, 0, 1, 0, 0);
  x2.fillStyle = '#06080a'; x2.fillRect(0, 0, w, hh);
  x2.imageSmoothingEnabled = s < 1;
  const sx = Math.max(0, Math.floor(x0)), sy = Math.max(0, Math.floor(y0)), ex = Math.min(W, Math.ceil(x1)), ey = Math.min(H, Math.ceil(y1));
  if (ex > sx && ey > sy) x2.drawImage(ovc, sx, sy, ex - sx, ey - sy, (sx - x0) * s, (sy - y0) * s, (ex - sx) * s, (ey - sy) * s);
  if (s >= 4) { x2.strokeStyle = 'rgba(0,0,0,0.25)'; x2.lineWidth = 1; x2.beginPath(); const st = s >= 12 ? 1 : CK; for (let gx = Math.ceil(x0 / st) * st; gx < x1; gx += st) { x2.moveTo(Math.round((gx - x0) * s) + 0.5, 0); x2.lineTo(Math.round((gx - x0) * s) + 0.5, hh); } for (let gy = Math.ceil(y0 / st) * st; gy < y1; gy += st) { x2.moveTo(0, Math.round((gy - y0) * s) + 0.5); x2.lineTo(w, Math.round((gy - y0) * s) + 0.5); } x2.stroke(); }
  drawEnts(x2, x0, y0, x1, y1, s, 1.5);
  x2.fillStyle = '#ff4050';
  for (const b of S.bugs) if (b.hp > 0 && b.x > x0 && b.x < x1 && b.y > y0 && b.y < y1) x2.fillRect((b.x - x0) * s - 1.5, (b.y - y0) * s - 1.5, 3, 3);
  for (const v of S.cars) { x2.fillStyle = VEH[v.type].sea ? '#7fe0ff' : '#fff'; x2.fillRect((v.x - x0) * s - 2.5, (v.y - y0) * s - 2.5, 5, 5); }
  x2.fillStyle = '#e0b020'; for (const t of S.trains) { if (!t.g) trainGeo(t); for (const q of t.g) x2.fillRect((q.x - x0) * s - 2.5, (q.y - y0) * s - 2.5, 5, 5); }
  const vw = cv.clientWidth / cam.z, vh = cv.clientHeight / cam.z;
  x2.strokeStyle = 'rgba(255,255,255,0.8)'; x2.lineWidth = 1.5;
  x2.strokeRect((cam.x - vw / 2 - x0) * s, (cam.y - vh / 2 - y0) * s, vw * s, vh * s);
  x2.fillStyle = '#4ae0ff'; x2.strokeStyle = '#000';
  x2.beginPath(); x2.arc((S.pl.x - x0) * s, (S.pl.y - y0) * s, 5, 0, 7); x2.fill(); x2.stroke();
  const fp = c.parentNode.querySelector('.fpos');
  if (fp) fp.textContent = `${Math.round(mv.x)}, ${Math.round(mv.y)} · ${s >= 1 ? s.toFixed(s < 4 ? 1 : 0) + ' px/tile' : (1 / s).toFixed(0) + ' tiles/px'}`;
}
let mz = 2, miniT = 0;
try { const v = +localStorage.getItem('cf_mz'); if (v >= 0.5 && v <= 8) mz = v; if (localStorage.getItem('cf_hud') === '0') $('#hud').classList.add('hide'); } catch (e) {}
function drawMini() {
  const c = $('#mini');
  if (!c || !c.offsetParent) return;
  const x2 = c.getContext('2d'), n = c.width, s = mz;
  x2.setTransform(1, 0, 0, 1, 0, 0);
  x2.fillStyle = '#06080a'; x2.fillRect(0, 0, n, n);
  if (S.dg) { x2.fillStyle = '#8a7a6a'; x2.font = '13px sans-serif'; x2.textAlign = 'center'; x2.fillText('Underground', n / 2, n / 2); return; }
  const cx = camFree ? cam.x : S.pl.x, cy = camFree ? cam.y : S.pl.y, x0 = cx - n / 2 / s, y0 = cy - n / 2 / s, x1 = x0 + n / s, y1 = y0 + n / s;
  x2.imageSmoothingEnabled = false;
  const sx = Math.max(0, Math.floor(x0)), sy = Math.max(0, Math.floor(y0)), ex = Math.min(W, Math.ceil(x1)), ey = Math.min(H, Math.ceil(y1));
  if (ex > sx && ey > sy) x2.drawImage(ovc, sx, sy, ex - sx, ey - sy, (sx - x0) * s, (sy - y0) * s, (ex - sx) * s, (ey - sy) * s);
  drawEnts(x2, x0, y0, x1, y1, s, 1);
  x2.fillStyle = '#ff4050';
  for (const b of S.bugs) if (b.hp > 0 && b.x > x0 && b.x < x1 && b.y > y0 && b.y < y1) x2.fillRect((b.x - x0) * s - 1, (b.y - y0) * s - 1, 2.5, 2.5);
  for (const v of S.cars) if (v.x > x0 && v.x < x1 && v.y > y0 && v.y < y1) { x2.fillStyle = VEH[v.type].sea ? '#7fe0ff' : '#fff'; x2.fillRect((v.x - x0) * s - 2, (v.y - y0) * s - 2, 4, 4); }
  const vw = cv.clientWidth / cam.z, vh = cv.clientHeight / cam.z;
  x2.strokeStyle = 'rgba(255,255,255,0.55)'; x2.lineWidth = 1;
  x2.strokeRect((cam.x - vw / 2 - x0) * s + 0.5, (cam.y - vh / 2 - y0) * s + 0.5, vw * s, vh * s);
  const px = (S.pl.x - x0) * s, py = (S.pl.y - y0) * s, a = S.pl.f || 0;
  x2.fillStyle = '#4ae0ff'; x2.strokeStyle = '#000'; x2.lineWidth = 1.2;
  x2.beginPath(); x2.moveTo(px + Math.cos(a) * 6, py + Math.sin(a) * 6); x2.lineTo(px + Math.cos(a + 2.5) * 4.5, py + Math.sin(a + 2.5) * 4.5); x2.lineTo(px + Math.cos(a - 2.5) * 4.5, py + Math.sin(a - 2.5) * 4.5); x2.closePath(); x2.fill(); x2.stroke();
}
function miniZoom(d) { mz = Math.max(0.5, Math.min(8, d > 0 ? mz * 2 : mz / 2)); try { localStorage.setItem('cf_mz', mz); } catch (e) {} drawMini(); }
$('#mini').addEventListener('click', () => openModal('map'));
$('#mini').addEventListener('wheel', ev => { ev.preventDefault(); miniZoom(-ev.deltaY); }, { passive: false });
$('#hud').addEventListener('click', ev => { const b = ev.target.closest('[data-mz]'); if (b) miniZoom(+b.dataset.mz); });
$('#hstog').addEventListener('click', () => { const h = $('#hud').classList.toggle('hide'); try { localStorage.setItem('cf_hud', h ? '0' : '1'); } catch (e) {} });

let eQ = '', eItem = null, eCat = 'Buildings', eHist = [], eHi = -1, hovCk = null;
function ePush() { const s = [modalTab, eItem, eCat]; const c = eHist[eHi]; if (c && c[0] === s[0] && c[1] === s[1] && c[2] === s[2]) return; eHist = eHist.slice(0, eHi + 1); eHist.push(s); if (eHist.length > 60) eHist.shift(); eHi = eHist.length - 1; }
function eGo(d) { const s = eHist[eHi + d]; if (!s) return; eHi += d; [modalTab, eItem, eCat] = s; eQ = ''; modal.querySelector('.mbody').scrollTop = 0; renderModal(); }
function encyOpen(k) {
  if (!(ITEMS[k] || FLUIDS[k] || BUILD[k])) return;
  if (modalKind !== 'ency') openModal('ency');
  modalTab = 'item'; eItem = k; eQ = ''; ePush();
  modal.querySelector('.mbody').scrollTop = 0;
  renderModal();
}
const eTile = k => `<span class="eic" data-ck="${k}" title="${nm(k).replace(/"/g, '&quot;')}">${ico(k)}</span>`;
let ECATS = null;
function eCats() {
  if (ECATS) return ECATS;
  const used = new Set(), cs = [];
  const add = (n, ks) => { ks = ks.filter(k => (ITEMS[k] || FLUIDS[k] || BUILD[k]) && !used.has(k)); ks.forEach(k => used.add(k)); if (ks.length) cs.push({ n, ks }); };
  add('Buildings', Object.keys(BUILD).filter(t => BUILD[t].cost));
  const cmb = []; for (const m in WPN) { if (WPN[m].need) cmb.push(WPN[m].need); cmb.push(WPN[m].am); }
  add('Weapons and armour', cmb.concat(Object.keys(ARMOR), Object.keys(EQ), CMB));
  add('Ores', ORES.filter(o => o && !o.fluid).map(o => o.item));
  add('Fluids and gases', Object.keys(FLUIDS));
  add('Intermediates', PARTS.slice());
  const by = {};
  for (const r of RECIPES) for (const k in r.o || {}) if (!used.has(k) && ITEMS[k] && !by[k]) by[k] = BUILD[r.b] ? BUILD[r.b].cat || 'Processing' : 'Processing';
  for (const c of CATS) add('Made by ' + c.toLowerCase() + ' buildings', Object.keys(by).filter(k => by[k] === c));
  add('Other', Object.keys(ITEMS));
  return ECATS = cs;
}
function encyIndex() {
  const cs = eCats(), cur = cs.find(c => c.n === eCat) || cs[0];
  return `<div class="ecats">${cs.map(c => `<button class="${c === cur ? 'on' : ''}" data-ecat="${c.n}">${c.n} <span class="dim">${c.ks.length}</span></button>`).join('')}</div><div class="egrid">${cur.ks.map(eTile).join('')}</div><p class="dim">Click any icon or chip to open its page. Hover an item anywhere in the game and press H to look it up.</p>`;
}
function encySearch(q) {
  q = q.toLowerCase();
  const hit = k => nm(k).toLowerCase().includes(q) || k.includes(q.replace(/ /g, '_'));
  const ks = [...Object.keys(BUILD).filter(t => BUILD[t].cost), ...Object.keys(ITEMS), ...Object.keys(FLUIDS)].filter(hit);
  const uniq = [...new Set(ks)];
  let h = `<h3>${uniq.length} match${uniq.length === 1 ? '' : 'es'}</h3><div class="elist">${uniq.slice(0, 150).map(k => chip(k, null, FLUIDS[k] ? 'fl' : '')).join('')}${uniq.length > 150 ? `<span class="dim">and ${uniq.length - 150} more, keep typing</span>` : ''}</div>`;
  const cs = CHAINS.filter(c => c.n.toLowerCase().includes(q) || c.d.toLowerCase().includes(q));
  if (cs.length) h += `<h3>Production chains</h3>` + cs.slice(0, 12).map(chainHtml).join('');
  return h;
}
const recUses = (r, k) => (r.i && k in r.i) || (r.fi && k in r.fi) || r.cat === k;
const recMakes = (r, k) => (r.o && k in r.o) || (r.fo && k in r.fo) || (r.ch && k in r.ch);
const eRec = r => `<div class="erec ${avail(r) ? '' : 'locked'}"><span class="rb">${chip(r.b)}<b>${r.n || nm(rMain(r))}</b></span>${avail(r) ? '' : ' <span class="bad">Locked</span>'}${recipeHtml(r)}</div>`;
function encyItem(k) {
  if (!k) return '';
  const B = BUILD[k], I = ITEMS[k], F = FLUIDS[k];
  let h = `<div class="eitem"><div class="eih">${ico(k, true)}<div><h2>${nm(k)}</h2><span class="dim">${B ? 'Building · ' + (B.cat || 'Placed') : F ? (isGas(k) ? 'Gas' : 'Fluid') : 'Item'}${S.inv[k] ? ' · ' + fmt(S.inv[k]) + ' in inventory' : ''}</span></div></div>`;
  h += `<p>${B ? B.d || '' : I ? I.f || '' : F ? F.f || '' : ''}</p>`;
  const st = [];
  if (B) { if (B.kw) st.push(['Power', B.kw + ' kW']); if (B.gen) st.push(['Output', B.gen + ' kW']); st.push(['Size', B.w + '×' + B.h]); if (B.P) st.push(['Pipe', `DN${B.P.dn} · ${B.P.bar} bar · ${B.P.tmax}°C`]); }
  for (const m in WPN) { const w = WPN[m]; if (w.need === k || (m === 'rifle' && k === 'rifle')) st.push(['Weapon', `${w.dm} damage${w.pel ? ' × ' + w.pel + ' pellets' : ''} · ${(1 / w.cd).toFixed(1)} shots/s · range ${w.r} · ammo ${nm(w.am)}`]); if (w.am === k) st.push(['Ammunition', `${w.per} rounds for the ${w.n.toLowerCase()} · ${w.dm} damage${w.arm ? ' · pierces ' + w.arm + '× armour' : ''}`]); }
  if (ARMOR[k]) st.push(['Armour', `takes ${Math.round(ARMOR[k].a * 100)}% off every bite${ARMOR[k].g ? ' · ' + ARMOR[k].g + '×' + ARMOR[k].g + ' equipment grid' : ''}`]);
  if (EQ[k]) { const E = EQ[k]; st.push(['Equipment', `${E.w}×${E.h}${E.use ? ' · uses ' + E.use + ' W' : ''}${E.gen ? ' · makes ' + E.gen + ' W' : ''}${E.cap ? ' · stores ' + fmt(E.cap / 1000) + ' kJ' : ''}`]); }
  if (F && FLUIDS[k].ck) st.push(['Corrosive', 'needs a resistant pipe']);
  if (st.length) h += `<div class="estat">${st.map(([a, b]) => `<span>${a}</span><span>${b}</span>`).join('')}</div>`;
  if (B && B.cost) h += `<h3>Built from</h3><div class="elist">${Object.keys(B.cost).map(q => chip(q, B.cost[q])).join('')}</div>`;
  const mk = RECIPES.filter(r => recMakes(r, k)), us = RECIPES.filter(r => recUses(r, k)), here = B ? RECIPES.filter(r => r.b === k) : [];
  const ub = Object.keys(BUILD).filter(t => BUILD[t].cost && k in BUILD[t].cost);
  if (mk.length) h += `<h3>Made by ${mk.length} recipe${mk.length === 1 ? '' : 's'}</h3>` + mk.slice(0, 30).map(eRec).join('');
  else if (!B) h += `<h3>Made by</h3><p class="dim">${ORES.some(o => o && o.item === k) ? 'Mined from ore fields.' : 'Not made by any recipe. Find it, harvest it or salvage it.'}</p>`;
  if (here.length) h += `<h3>Runs ${here.length} recipe${here.length === 1 ? '' : 's'}</h3>` + here.slice(0, 60).map(eRec).join('') + (here.length > 60 ? `<p class="dim">and ${here.length - 60} more</p>` : '');
  if (us.length) h += `<h3>Used in ${us.length} recipe${us.length === 1 ? '' : 's'}</h3>` + us.slice(0, 40).map(eRec).join('') + (us.length > 40 ? `<p class="dim">and ${us.length - 40} more</p>` : '');
  if (ub.length) h += `<h3>Used to build</h3><div class="elist">${ub.map(t => chip(t, BUILD[t].cost[k])).join('')}</div>`;
  const cs = CHAINS.filter(c => JSON.stringify(c.l).includes(`"${k}"`));
  if (cs.length) h += `<h3>Production chains</h3>` + cs.slice(0, 6).map(chainHtml).join('');
  return h + '</div>';
}
function chainHtml(c) {
  let h = `<div class="chain"><h3>${c.n}</h3>`;
  for (const line of c.l) h += `<div class="cl">${line.map(s => typeof s === 'string' ? (ITEMS[s] || FLUIDS[s] ? chip(s) : `<span class="via">${viaTxt(s)}</span>`) : `<span class="via">${viaTxt(s[0])}</span>`).join('<span class="arr">→</span>').split('<span class="arr">→</span><span class="via">+</span><span class="arr">→</span>').join('<span class="arr">+</span>')}</div>`;
  return h + `<p class="note">${c.d}</p></div>`;
}
function encyPut(body, h) {
  let bar = body.querySelector('.ebar');
  if (!bar) { body.innerHTML = `<div class="ebar"><button data-eb="-1" title="Back (Backspace or mouse back)">‹</button><button data-eb="1" title="Forward">›</button><input id="esearch" placeholder="Search items, fluids, buildings and chains" spellcheck="false" autocomplete="off"><span class="dim">/ to search</span></div><div id="eres"></div>`; modalHtml = ''; bar = body.querySelector('.ebar'); }
  bar.children[0].disabled = eHi <= 0; bar.children[1].disabled = eHi >= eHist.length - 1;
  const s = bar.querySelector('#esearch'); if (s.value !== eQ) s.value = eQ;
  if (modalHtml !== h) { body.querySelector('#eres').innerHTML = h; modalHtml = h; }
}

function renderModal() {
  if (!modalKind) return;
  const th = TABS[modalKind].concat(modalKind === 'ency' && eItem ? [['item', nm(eItem)]] : []).map(([id, n]) => `<button class="tab ${modalTab === id ? 'on' : ''}" data-tab="${id}">${n}</button>`).join('');
  const tabs = modal.querySelector('.tabs');
  if (tabs.innerHTML !== th) tabs.innerHTML = th;
  const body = modal.querySelector('.mbody'), st = body.scrollTop;
  if (modalKind === 'craft') return modalTab === 'equip' ? renderEquip(body) : renderCraft(body);
  if (modalKind === 'tech') return renderTech(body);
  let h = '';
  if (modalKind === 'ency' && eQ.trim()) h = encySearch(eQ.trim());
  else if (modalTab === 'item') h = encyItem(eItem);
  else if (modalTab === 'index') h = encyIndex();
  else if (modalTab === 'chains') {
    for (const c of CHAINS) h += chainHtml(c);
  } else if (modalTab === 'recipes') {
    for (const t in BUILD) {
      const rs = RECIPES.filter(r => r.b === t);
      if (!rs.length) continue;
      const B = BUILD[t];
      h += `<h3><span class="sw" style="background:${B.c}">${B.ab}</span> ${B.n}${B.kw ? ` <span class="dim">${B.kw} kW</span>` : B.gen ? ` <span class="dim">${B.gen} kW out</span>` : B.sun || B.marine ? ' <span class="dim">needs no power</span>' : ' <span class="dim">fuel-fired</span>'}</h3>`;
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
  if (modalKind === 'ency') return encyPut(body, h);
  if (modalTab === 'ach') h = achHtml();
  if (modalHtml !== h) { body.innerHTML = h; modalHtml = h; body.scrollTop = st; if (modalTab === 'world') drawPreview(); }
  if (modalTab === 'map') drawMapView();
}

const viaTxt = t => BUILD[t] && !ITEMS[t] && !FLUIDS[t] ? BUILD[t].n : t.replace(/\b[a-z][a-z0-9_]*\b/g, (w, i) => { const d = ITEMS[w] || FLUIDS[w]; return d && !/([a-z]ic|[A-Z][a-z]*) $/.test(t.slice(0, i)) ? d.n.toLowerCase() : w; });
const CHAINS = [
  { n: 'Power', l: [['Offshore pump', 'water', 'Boiler + coal', 'steam', 'Steam engine']], d: 'Pumps go on water. Pipe the water into a boiler, give it coal by hand or belt, and let the steam reach an engine (touching or by pipe). One engine gives 900 kW from 30 steam/s. Furnaces and ovens burn fuel and need no power.' },
  { n: 'Iron', l: [['iron_ore', 'Crusher', 'crushed_iron', 'Ball mill + water', 'ground_iron', 'Magnetic separator', 'iron_conc'], ['iron_conc', 'Blast furnace + coke + crushed limestone', 'pig_iron', 'Converter', 'steel']], d: 'Banded iron ore is only about a third iron. Crushing and grinding free the iron mineral grains from the quartz, the magnet pulls them out, and the blast furnace strips the oxygen with carbon monoxide from burning coke.' },
  { n: 'Copper', l: [['copper_ore', 'Crusher', 'crushed_copper', 'Ball mill + water', 'ground_copper', 'Flotation + water', 'copper_conc'], ['copper_conc', 'Roaster', 'copper_calcine', 'Flash smelter + sand', 'copper_matte', 'Converter', 'blister_copper'], ['blister_copper', 'Anode furnace + wood', 'copper_anode', 'Electrolysis + acid', 'copper_cathode']], d: 'Copper sits in chalcopyrite, a copper-iron sulfide. Roasting burns off part of the sulfur as SO₂, silica slags off the iron, the converter burns the rest of the sulfur, the anode furnace fire-refines it, and electrolysis gives 99.99% copper.' },
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
  { n: 'Soda and glass', l: [['brine', 'Solvay tower + nh3 + co2', 'nahco3', '+', 'nh4cl'], ['nh4cl', 'Distillation column + quicklime + steam', 'nh3', '+', 'cacl2'], ['nahco3', 'Lime kiln', 'soda_ash', '+', 'co2'], ['sand', 'Batch house + soda_ash + crushed_lime', 'glass_batch'], ['glass_batch', 'Glass tank furnace', 'glass'], ['soda_ash', 'Leach tank + quicklime + water', 'naoh']], d: 'The Solvay process makes soda ash from salt and limestone, with ammonia going round and round as a carrier. The lime kiln supplies both the CO₂ and the quicklime that frees the ammonia again. Soda ash makes glass for glass-lined pipe, and lime turns it into caustic soda without any electricity.' },
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
  { n: 'Green hydrogen', l: [['bfw', 'PEM electrolyser', 'h2', '+', 'o2'], ['h2', 'Fuel cell + o2', 'Electricity'], ['h2', 'Cylinder filler + cylinder', 'h2_cyl']], d: 'Spare power splits pure water into hydrogen and oxygen. A fuel cell burns them back to water to make electricity when the wind drops. It loses more power than a battery but can store as much as you have tanks for.' },
  { n: 'Stainless steel', l: [['chromite', 'Arc furnace + coke + sand', 'ferrochrome', '+', 'slag'], ['laterite', 'Lime kiln + coal', 'ni_calcine', 'Arc furnace + coke', 'ferronickel'], ['steel', 'Converter + ferrochrome + ferronickel + quicklime + o2 + n2', 'stainless', 'Craft menu', 'Stainless steel pipe']], d: 'Chromite comes from mountains and nickel laterite from wet tropical soils. Both are smelted to ferroalloys in the arc furnace. In the converter, oxygen diluted with nitrogen burns carbon out of the melt without taking the chromium too. Stainless makes pipe that holds 100 bar and 800°C, but chlorides pit it.' },
  { n: 'Fluoropolymers', l: [['ch3cl', 'Chlorinator + cl2', 'chcl3', '+', 'hcl'], ['chcl3', 'Pressure reactor + hf', 'r22', '+', 'hcl'], ['r22', 'Tube furnace', 'tfe', '+', 'hcl'], ['tfe', 'Pressure reactor + water', 'ptfe', 'Craft menu', 'PTFE-lined pipe']], d: 'Chloroform from chloromethane and chlorine is fluorinated with hydrofluoric acid to R-22. Cracking R-22 gives TFE gas, which polymerises in water to PTFE. Every step gives off hydrogen chloride, which goes back to make chloromethane. PTFE lines pipe that resists every fluid in the game.' },
  { n: 'Lithium batteries', l: [['spodumene', 'Lime kiln + coal', 'beta_spod', 'Leach tank + acid + water', 'li2so4'], ['li2so4', 'Leach tank + soda_ash', 'li2co3'], ['li2co3', 'Pressure reactor + iron_conc + carbon_black + h3po4', 'lfp'], ['coke', 'Arc furnace + pitch', 'graphite'], ['li2co3', 'Pressure reactor + phosphorus + hf + cl2', 'lipf6', 'Pressure reactor + dmc', 'li_elyte'], ['lfp', 'Battery plant + graphite + aluminium + copper + polypropylene + electrolyte', 'li_cell', 'Li-ion bank', 'Electricity']], d: 'Spodumene from cold highland pegmatites is roasted until it crumbles, leached with sulfuric acid, and the lithium precipitated with soda ash. Lithium iron phosphate on aluminium foil, graphite on copper foil, and LiPF₆ in dimethyl carbonate make a cell that stores three times what lead-acid does and gives back 95%.' },
  { n: 'Polyester', l: [['naphtha', 'Catalytic reformer', 'xylene', '+', 'h2'], ['xylene', 'Pressure reactor + o2 + acetic', 'pta'], ['ethylene', 'Pressure reactor + o2 + silver catalyst', 'eo'], ['eo', 'Pressure reactor + water', 'meg'], ['pta', 'Pressure reactor + meg', 'pet'], ['pet', 'Melt spinner', 'polyester'], ['pet', 'Blow moulder', 'pet_bottle']], d: 'Reforming naphtha over platinum gives p-xylene and a lot of hydrogen. Oxidise the xylene to terephthalic acid, turn ethylene into glycol through ethylene oxide, and the two condense into PET. Spin it into yarn or stretch-blow it into bottles.' },
  { n: 'Nuclear fuel', l: [['uraninite', 'Leach tank + acid + o2', 'uo2so4'], ['uo2so4', 'Precipitator + nh3', 'yellowcake'], ['yellowcake', 'Pressure reactor + h2 + hf', 'uf4'], ['hf', 'Electrolysis cell', 'f2', '+', 'h2'], ['uf4', 'Pressure reactor + f2', 'uf6'], ['uf6', 'Gas centrifuge hall', 'leu', '+', 'du_cyl'], ['du_cyl', 'Lime kiln + steam + h2', 'du_oxide', '+', 'hf'], ['leu', 'Lime kiln + steam + h2', 'uo2', '+', 'hf'], ['zircon', 'Chlorinator + coke + cl2', 'zrcl4', 'Hunter retort + magnesium', 'zirconium'], ['uo2', 'Workshop + zirconium + stainless', 'fuel_asm'], ['fuel_asm', 'Pressurised water reactor + bfw', 'steam', '+', 'spent_fuel'], ['spent_fuel', 'Workshop + concrete + steel', 'dry_cask']], d: 'Uranium is leached, dropped out as yellowcake, turned to UF₆ gas with hydrogen fluoride and fluorine, and spun in centrifuges until it holds 4% U-235. Pellets go into Zircaloy tubes, because zirconium lets neutrons through. One reactor makes as much steam as eight coal boilers, and the hydrogen fluoride comes back at every step.' },
  { n: 'Tin and electronics', l: [['cassiterite', 'Gravity spiral + water', 'tin_conc', 'Arc furnace + coke', 'tin'], ['tin', 'Tinning line + plate + acid', 'tinplate', 'Workshop', 'food_can'], ['copper_cathode', 'Electrolysis cell + acid', 'copper_foil'], ['glass_fibre', 'PCB line + epoxy + copper_foil + br2', 'laminate'], ['laminate', 'PCB line + fecl3', 'pcb', '+', 'etch'], ['etch', 'Electrolysis cell', 'fecl3', '+', 'copper_cathode'], ['pcb', 'PCB line + solder + wafer', 'board']], d: 'Cassiterite collects in marsh and river gravels. Gravity spirals concentrate it and the arc furnace reduces it with coke. Tin plated onto steel makes cans, and tin with a little copper makes solder. Glass cloth, brominated epoxy and copper foil press into laminate, ferric chloride etches the circuit, and the spent etchant is electrolysed back to ferric chloride and copper.' },
  { n: 'Mining machines', l: [['butadiene', 'Pressure reactor + acn + water', 'nbr', 'Tyre curing press + ptfe + carbon_black', 'hyd_seal'], ['chromoly', 'Plating line + chromic_acid + acid', 'chrome_rod', '+', 'honed_tube'], ['base_oil', 'Compounding room + zddp', 'hyd_oil'], ['honed_tube', 'CNC machine shop + chrome_rod + hyd_seal + hyd_oil', 'hyd_cyl', '+', 'hyd_pump'], ['hyd_cyl', 'Hydraulic excavator + hyd_pump + chromoly'], ['chromoly', 'Isothermal forge', 'pick_body', 'Induction furnace + wc + brass', 'carbide_pick', 'CNC machine shop + gearbox', 'cutter_drum'], ['sic_inverter', 'Workshop + board', 'vfd'], ['cutter_drum', 'Continuous miner + pm_motor + vfd + hyd_cyl']], d: 'Faster miners need hydraulics. Nitrile rubber and PTFE make the seals, chromoly becomes hard-chromed rods and burnished tubes, and the machine shop builds them into cylinders and swashplate pumps. A hydraulic excavator digs twice as fast as a miner. A continuous miner adds a drum of carbide picks, permanent-magnet motors and variable-speed drives, and digs five times as fast over a 3×3 patch.' },
  { n: 'Transformers and switchgear', l: [['sand', 'Arc furnace + coke + iron_conc', 'ferrosilicon', 'Converter + steel + argon', 'si_slab'], ['si_slab', 'Hot strip mill', 'si_hotband', 'Pickling line + hcl', 'si_pickled', 'Sendzimir mill', 'si_cold'], ['mgoh2', 'Lime kiln', 'mgo'], ['si_cold', 'Annealing line + mgo + h2', 'si_decarb', 'Box annealer + h2', 'goes'], ['goes', 'Transformer works', 'trafo_core', '+', 'hv_winding'], ['base_oil', 'Compounding room + n2', 'trafo_oil'], ['trafo_core', 'Transformer works + hv_winding + trafo_oil + insulator', 'transformer'], ['copper_cathode', 'Sinter-HIP furnace + chromium', 'cucr', 'Sinter-HIP furnace + alumina_tube + silver', 'vac_interrupter', 'Workshop + board', 'breaker'], ['transformer', 'Substation + breaker']], d: 'A substation needs a real transformer and real breakers. Steel with 3% silicon is hot rolled, pickled, cold rolled thin, decarburised and annealed for days until its grains all point the same way, which halves its magnetic losses. Stacked into a core, wound with paper-wrapped copper and sealed in dry oil, it becomes a transformer. Copper-chromium contacts brazed into evacuated ceramic bottles make the vacuum breakers that clear faults.' },
  { n: 'Reactor plant', l: [['steel', 'Converter + ferronickel + femn + molybdenum + argon', 'sa508'], ['sa508', 'Heavy forging press', 'rpv_ring', 'CNC machine shop + stainless strip', 'clad_ring'], ['sa508', 'Heavy forging press', 'rpv_head'], ['clad_ring', 'Heavy vessel shop + vessel head', 'rpv'], ['nickel', 'Vacuum induction furnace + chromium', 'alloy690', 'Tube drawing mill', 'sg_tube', 'Heavy vessel shop + SA-508', 'steam_gen'], ['b4c', 'Workshop + stainless + helium', 'control_rod'], ['chrome_rod', 'CNC machine shop + stainless + wire', 'crdm'], ['hyd_seal', 'CNC machine shop + motor + bearings', 'rcp'], ['rpv', 'Steam generators + pumps + rods', 'Pressurised water reactor']], d: 'A reactor is a forging job before it is a nuclear one. Low-alloy steel is vacuum degassed, forged into seamless rings and heads, lined with stainless and welded into a vessel 20 cm thick. High-chromium nickel alloy tubes carry reactor water through the steam generators, boron carbide rods stop the reaction, and flywheel pumps keep water moving.' },
  { n: 'Steam turbines', l: [['steel', 'Converter + ferronickel + ferrochrome + molybdenum + argon', 'nicrmov', 'Heavy forging press', 'rotor_forging'], ['steel', 'Converter + ferrochrome + oxygen + argon', 'cr12', 'Isothermal forge press', 'steam_blade'], ['rotor_forging', 'CNC machine shop + 24 blades', 'turbine_rotor'], ['rotor_forging', 'Heavy vessel shop + GOES + copper + hydrogen', 'turbo_gen'], ['titanium', 'Tube drawing mill + argon', 'ti_tube', 'Heavy vessel shop + steel', 'condenser'], ['steam', 'Steam turbine set', 'bfw']], d: 'Steam from a reactor, boiler or HRSG ends up in a turbine. Rotors are forged from one vacuum-poured ingot, blades from 12% chromium steel, and a titanium-tubed condenser pulls a vacuum so the steam expands as far as it can. The condensate goes back to make steam again.' },
  { n: 'Solar modules', l: [['flat_glass', 'Tempering furnace + antireflective coat', 'solar_glass'], ['eva', 'Cast film line', 'eva_film'], ['pet', 'Cast film line + PVDF', 'backsheet'], ['wire', 'Tinning line + tin', 'pv_ribbon'], ['solar_cell', 'PV module line + glass + EVA + backing + ribbon + junction box', 'solar_module', 'Aluminium racking', 'Solar array']], d: 'A cell alone would crack and corrode in a week. Strung with tinned copper ribbon, sealed in EVA between low-iron solar glass and a fluoropolymer backsheet and framed, it lasts twenty-five years on a roof or in a field.' },
  { n: 'Long blades', l: [['pet', 'Cast film line + carbon dioxide', 'pet_foam'], ['carbon_fibre', 'Pultrusion line + epoxy', 'spar_cap'], ['steel', 'CNC machine shop', 'root_insert'], ['glass_fibre', 'Blade mould + epoxy + foam + spar caps + bushings', 'long_blade', 'Tower + nacelle', 'Offshore and direct-drive turbines']], d: 'Blades over a hundred metres long need a stiff carbon spine so they do not bend into the tower. Glass and epoxy shells wrap a foam core, and steel bushings cast into the root bolt it on.' },
  { n: 'Overhead lines', l: [['aluminium', 'Continuous rod mill', 'al_rod', 'Wire drawing machine', 'al_wire'], ['steel', 'Wire drawing machine (patented)', 'hc_wire', 'Galvanising kettle + zinc', 'core_wire'], ['al_wire', 'Planetary strander + 7 core wires', 'acsr', 'Galvanised tower + porcelain', 'Lattice pylon']], d: 'High-voltage lines are aluminium on a steel spine. Rod is cast and rolled in one pass, drawn hard, and stranded in layers around galvanised high-carbon steel wire.' },
  { n: 'Copper wire rod', l: [['copper_cathode', 'Continuous rod mill', 'cu_rod', 'Wire drawing machine', 'wire']], d: 'Cathodes melted and cast straight into rod, then drawn through dies, give twice the wire a workshop gets from hand-cutting cathode.' },
  { n: 'Grid batteries', l: [['aluminium', 'Foil rolling mill', 'al_foil', 'Electrode coater + LFP, NMP', 'lfp_sheet'], ['polypropylene', 'Cast film line, stretched, ceramic coat', 'separator'], ['lfp_sheet', 'Cell assembly line + graphite sheet, can, electrolyte', 'green_cell', 'Formation rack', 'li_cell'], ['li_cell', 'Cell assembly line + 16 in series, BMS', 'battery_module', 'Inverters + transformer', 'Battery container']], d: 'Rolled foil, coated electrodes and a stretched separator are stacked into cans in a dry room, filled and given a slow first charge. Formed cells go into modules, and eight modules fill a container that stores twenty times what a rack bank does.' },
  { n: 'Electric locomotive', l: [['battery_module', 'Cell assembly line + BMS, glycol', 'traction_pack'], ['traction_pack', '+ SiC inverters, traction motors, bogies', 'Battery-electric locomotive'], ['battery_module', '+ inverters, power transformer', 'Rail charger']], d: 'Grid battery modules repackaged for rail. Two traction packs and SiC inverters replace the diesel engine; a wayside charger with its own buffer battery refills the locomotive at stops, and braking puts charge back on the way.' },
  { n: 'Electric haul truck', l: [['chromoly', 'Forge press', 'gear_blank', 'Machine shop + base_oil', 'gear_cut'], ['gear_cut', 'Carburising furnace + methane, n2, base_oil', 'gear_hard', '+', 'co2'], ['gear_hard', 'Machine shop + bearing', 'planetary'], ['pm_motor', '+ sic_inverter, planetary, casting', 'e_axle'], ['e_axle', '+ traction_pack, chassis, wheel', 'Electric haul truck'], ['wire', 'Workshop + silicone, meg', 'charge_cable', '+ sic_inverter, battery_module', 'Megawatt charger']], d: 'Forged gears are hobbed soft, then carburised so a hard skin forms over a tough core, and ground into planetary sets. Two drive axles and three traction packs turn the haul truck electric; a fast charger with a buffer battery refills it.' },
  { n: 'Bucket-wheel excavator', l: [['mn_steel', 'Workshop + water', 'bucket_tooth', 'Heavy vessel shop + plate', 'bwe_bucket'], ['chromoly', 'Forge press + fuel_gas', 'slew_blank', 'Machine shop + bearing', 'slew_ring'], ['sbr', 'Calender + hc_wire, carbon_black, sulfur', 'cord_belt'], ['hc_wire', 'Planetary strander + base_oil', 'wire_rope'], ['bwe_bucket', '+ slew_ring, cord_belt, wire_rope, planetary', 'Bucket-wheel excavator']], d: 'Self-sharpening manganese steel teeth, ring-rolled slewing bearings, steel-cord belting and wire-rope stays come together in the biggest digging machine there is. It mines five times faster than a plain miner.' },
  { n: 'Analytical laboratory', l: [['molybdenum', 'Pusher furnace + h2', 'mo_bar', 'Machine shop + alumina', 'quad_rods', 'Electronics line + w_wire, board', 'quadrupole'], ['al7075', 'Machine shop + hybrid_bearing, pm_motor', 'turbopump'], ['litharge', 'Pusher furnace + glass, h2', 'e_mult'], ['preform', 'Fibre draw tower + silicone', 'gc_column'], ['quadrupole', '+ turbopump, e_mult, gc_column, helium', 'gcms'], ['sc_wire', 'Magnet hall + lhe', 'nmr_magnet', '+ rf_coil, cryocooler', 'nmr'], ['gcms', '+ nmr, fume_hood', 'Analytical Laboratory']], d: 'A mass spectrometer built from molybdenum rods, a turbopump and a lead-glass electron multiplier, and a 400 MHz NMR on a persistent superconducting magnet. Together they make a laboratory that researches three times faster.' },
  { n: 'Industrial robot', l: [['chromoly', 'Machine shop + base_oil', 'flexspline', '+ casting, bearing', 'strain_wave'], ['ndfeb', 'Electronics line + board', 'encoder'], ['pm_motor', 'Workshop + strain_wave, encoder, bearing', 'robot_joint'], ['aluminium', 'Induction furnace + sand', 'arm_casting'], ['sic_mosfet', 'Electronics line + board, film_cap', 'servo_drive'], ['robot_joint', '+ arm_casting, servo_drive, microchip', 'robot_arm', '+ board, steel, glass', 'Robotic Assembly Cell']], d: 'Strain wave gears, absolute encoders and servo drives make six-axis robots. Two of them in a fenced cell run any Workshop recipe three times as fast.' },
  { n: '5-axis machining centre', l: [['chromoly', 'Machine shop + bearing, cbn_wheel', 'ball_screw'], ['steel', 'Machine shop + bearing', 'linear_guide'], ['hybrid_bearing', 'Machine shop + pm_motor, chromoly', 'spindle'], ['epoxy', 'Workshop + sand', 'mineral_cast'], ['servo_drive', 'Electronics line + microchip, board', 'cnc_ctrl'], ['carbide_insert', 'Workshop + steel, motor', 'tool_magazine'], ['ball_screw', '+ linear_guide, spindle, mineral_cast, cnc_ctrl, tool_magazine', '5-Axis Machining Centre']], d: 'Ground ball screws and guides, a ceramic-bearing motor spindle and a polymer concrete bed make a machine that cuts every Machine Shop part two and a half times as fast.' },
  { n: 'Radial tyre', l: [['sbr', 'Internal mixer + carbon_black, zinc_oxide, base_oil', 'masterbatch'], ['masterbatch', 'Internal mixer + sulfur, mbt (cool)', 'tread_compound'], ['hc_wire', 'Strander + brass', 'steel_cord'], ['hc_wire', 'Wire drawer + bronze', 'bead_wire'], ['polyester', 'Calender + tread_compound', 'ply_fabric'], ['steel_cord', 'Calender + tread_compound', 'belt_ply'], ['iir', 'Calender + carbon_black', 'inner_liner'], ['tread_compound', 'Tyre builder + ply, belts, bead, liner', 'green_tyre'], ['green_tyre', 'Curing press + steam', 'tyre']], d: 'Two mixing stages, brass-plated cord, calendered plies and a butyl liner are built on a drum and cured in one shot.' },
  { n: 'Paper machine', l: [['bleached_pulp', 'Disc refiner + pcc, starch, water', 'paper_stock'], ['paper_stock', 'Paper machine + paam, steam', 'paper']], d: 'Refined fibre with filler and starch goes through the headbox, wire, presses and dryers.' },
  { n: 'Polyolefins', l: [['ethylene', 'Slurry loop + ziegler, h2, hexane', 'pe_fluff'], ['propylene', 'Slurry loop + ziegler, h2', 'pp_powder'], ['phenol', 'Pressure reactor + isobutylene', 'antioxidant'], ['tallow', 'Pressure reactor + slaked_lime, steam', 'ca_stearate', '+', 'glycerol'], ['pe_fluff', 'Compounding extruder + antioxidant, ca_stearate', 'polyethylene'], ['pp_powder', 'Compounding extruder + antioxidant, ca_stearate', 'polypropylene']], d: 'A Ziegler catalyst grows polymer grains in a loop reactor. The compounding extruder melts them with antioxidant and acid scavenger and cuts pellets, getting far more plastic from the same monomer than the high-pressure route.' },
  { n: 'PVC', l: [['vcm', 'Pressure reactor + water', 'pvc_slurry'], ['pvc_slurry', 'Stripper and dryer + steam', 'pvc']], d: 'Suspension polymerisation, then steam stripping of leftover monomer, centrifuging and drying.' },
  { n: 'Portland cement', l: [['crushed_lime', 'Vertical roller mill + kaolin, sand, iron_conc', 'raw_meal'], ['raw_meal', 'Preheater kiln line + coal', 'clinker', '+', 'co2'], ['clinker', 'Ball mill + gypsum', 'cement'], ['cement', 'Workshop + sand', 'concrete']], d: 'Limestone and clay are ground to raw meal, burned to clinker through a cyclone preheater, precalciner and rotary kiln, then ground with gypsum.' },
  { n: 'Copper refining', l: [['copper_matte', 'Converter', 'blister_copper', '+', 'so2'], ['blister_copper', 'Anode furnace + wood or fuel_gas', 'copper_anode'], ['copper_anode', 'Electrolysis cell + acid', 'copper_cathode', '+', 'anode_slime']], d: 'Blister copper is fire-refined and cast into anodes, which dissolve in acid copper sulfate while pure copper plates onto the cathodes.' },
  { n: 'Flat glass', l: [['sand', 'Batch house + soda_ash + crushed_lime', 'glass_batch'], ['glass_batch', 'Float glass line + n2 + h2', 'flat_glass'], ['sand', 'Silica sand plant + water', 'low_iron_sand'], ['low_iron_sand', 'Batch house + soda_ash + crushed_lime + salt_cake', 'lo_fe_batch'], ['lo_fe_batch', 'Float glass line + n2 + h2', 'lo_fe_glass'], ['lo_fe_glass', 'Glass tempering furnace + fuel_gas + teos', 'solar_glass'], ['flat_glass', 'Magnetron sputter line + silver + argon', 'low_e_glass'], ['low_e_glass', 'Insulating glass line + spacer_bar + iir + silicone + argon', 'glazing']], d: 'Raw materials are weighed into a batch and melted, then floated on tin into flat sheet. Cleaner sand gives extra-clear glass for solar modules, and a silver coating turns ordinary float into low-E panes for insulating glass units.' },
  { n: 'Flat steel', l: [['iron_conc', 'Sinter plant + crushed_lime + coke', 'sinter'], ['sinter', 'Blast furnace + coke + o2', 'pig_iron', '+', 'slag'], ['pig_iron', 'Converter + quicklime + o2', 'steel'], ['steel', 'Ladle furnace + quicklime + aluminium + argon', 'ladle_steel'], ['ladle_steel', 'Continuous slab caster + water', 'steel_slab'], ['steel_slab', 'Hot strip mill + fuel_gas', 'hr_coil'], ['hr_coil', 'Pickling line + hcl', 'p_coil'], ['p_coil', 'Tandem cold mill + h2 + n2', 'cr_coil'], ['cr_coil', 'Continuous galvanising line + zinc', 'galv_coil'], ['galv_coil', 'Transfer press line + casting', 'chassis']], d: 'Ore fines are sintered and smelted, the iron is blown to steel and refined in the ladle, then cast continuously into slabs. Hot rolling, pickling, cold rolling and galvanising turn each slab into bright coated coil for car bodies and appliances.' },
  { n: 'Aluminium smelter', l: [['pet_coke', 'Coke calciner', 'cpc'], ['cpc', 'Anode paste plant + anode_butt + pitch', 'green_anode'], ['green_anode', 'Ring baking furnace + fuel_gas', 'anode'], ['al_hydroxide', 'Pressure reactor + hf', 'alf3'], ['alumina', 'Prebake reduction cell + anode + alf3', 'aluminium', '+', 'anode_butt'], ['aluminium', 'Cast house + magnesium + si_metal + argon', 'al_billet'], ['al_billet', 'Extrusion press', 'al_profile', '+', 'al_scrap']], d: 'A smelter makes its own anodes from calcined coke and pitch, and the stubs left in the cells go back into new ones. Prebake cells with aluminium fluoride make more metal per anode, and the cast house alloys it into billets for extrusion.' },
  { n: 'Rare earth magnets', l: [['monazite', 'Digester + naoh', 're_oh', 'Leach tank + hcl + water', 'recl3', '+', 'th_cake'], ['recl3', 'Solvent extraction + diesel', 'ndcl3', '+', 'ce_oxide'], ['ndcl3', 'Precipitator + soda_ash', 'ndpr_oxide', 'Electrolysis cell + anode + hf', 'nd_metal'], ['borax', 'Arc furnace + pig_iron + coke', 'ferroboron'], ['nd_metal', 'Vacuum induction furnace + ferroboron + steel + argon', 'ndfeb_strip', 'HD vessel + h2', 'hd_powder', 'Jet mill + n2', 'ndfeb_fine'], ['ndfeb_fine', 'Field press + n2', 'ndfeb_green', 'Sinter-HIP furnace + argon', 'ndfeb_block', 'Multi-wire saw + diamond_grit + water', 'ndfeb_bare'], ['ndfeb_bare', 'Plating line + copper_cathode + niso4', 'ndfeb_plated', 'Pulse magnetiser', 'ndfeb', 'Workshop + wire + plate', 'pm_motor'], ['ndfeb_swarf', 'Leach tank + hcl + water', 'ndcl3'], ['th_cake', 'Workshop + concrete + plate', 'waste_drum']], d: 'Monazite from the mineral sand separator is cracked with caustic soda and dissolved in hydrochloric acid, leaving thorium behind. Hundreds of solvent extraction stages split off neodymium and praseodymium, with cerium as a by-product. Reduced to metal and alloyed with iron and boron from desert borax, they make the strongest magnets there are, for direct-drive wind turbines and compact motors.' },
  { n: 'Water treatment', l: [['al_hydroxide', 'Pressure reactor + acid', 'alum'], ['water', 'Water treatment works + alum + cl2 + carbon bed', 'potable'], ['spent_carbon', 'Kiln + steam', 'carbon'], ['nylon', 'Workshop + polyester + glass_fibre', 'ro_membrane'], ['water', 'Reverse osmosis + membranes', 'potable'], ['potable', 'Blow moulder + pet', 'water_bottle'], ['bleach', 'Blow moulder + polyethylene', 'bleach_jug']], d: 'Alum makes dirt clump into flocs that settle and filter out, and a little chlorine disinfects what is left. An activated carbon bed doubles the rate but fills up and has to be reactivated in a kiln. Reverse osmosis needs only power and membranes, which slowly foul and need replacing.' },
  { n: 'Farming and fermentation', l: [['npk', 'Farm + water', 'sugar_beet'], ['npk', 'Farm + water', 'maize'], ['sugar_beet', 'Sugar factory + quicklime + co2 + water', 'sugar', '+', 'molasses'], ['molasses', 'Fermenter + water', 'ethanol', '+', 'co2'], ['maize', 'Fermenter + water', 'ethanol', '+', 'ddgs'], ['ethanol', 'Pressure reactor', 'ethylene'], ['molasses', 'Fermenter + o2 + quicklime + acid', 'citric', '+', 'gypsum'], ['ethanol', 'Blow moulder + polyethylene', 'sanitiser']], d: 'Fertiliser and water grow sugar beet and maize. The sugar factory cleans beet juice with lime and carbon dioxide, so it soaks up CO₂ from your kilns. Yeast turns molasses and maize into ethanol, which hot alumina dehydrates to ethylene for green plastics. A mould turns molasses into citric acid.' },
  { n: 'Pharmaceuticals', l: [['phenol', 'Pressure reactor + hno3', 'nitrophenol'], ['nitrophenol', 'Pressure reactor + h2', 'aminophenol'], ['aminophenol', 'Precipitator + ac2o', 'paracetamol', '+', 'acetic'], ['paracetamol', 'Tablet line + pvc + aluminium', 'paracetamol_pack'], ['molasses', 'Fermenter + maize + o2 + nh3', 'penicillin'], ['penicillin', 'Sterile fill line + glass', 'penicillin_vial'], ['toluene', 'Pressure reactor + propylene', 'ibb'], ['ibb', 'Pressure reactor + ac2o + h2 + co', 'ibuprofen'], ['ibuprofen', 'Tablet line + sugar + pvc + aluminium', 'ibuprofen_pack']], d: 'Three medicines from three kinds of chemistry. Paracetamol is nitration, hydrogenation and acetylation of phenol. Penicillin is grown by a mould on molasses and maize. Ibuprofen is the three-step catalytic BHC route from toluene and propylene.' },
  { n: 'Glass and fibre optics', l: [['sand', 'Float glass line + soda_ash + crushed_lime + n2 + h2', 'flat_glass'], ['flat_glass', 'Workshop + aluminium + argon', 'glazing'], ['argon', 'Cylinder filler', 'ar_cyl'], ['si_metal', 'Chlorinator + cl2', 'sicl4'], ['sicl4', 'Fibre draw tower + o2', 'preform', '+', 'cl2'], ['preform', 'Fibre draw tower', 'optic_fibre'], ['optic_fibre', 'Workshop + polyethylene + steel', 'fibre_cable']], d: 'Float glass sets on a bath of molten tin under nitrogen and hydrogen. The air separation unit can take argon off the middle of its column, for double glazing and welding gas. Silicon burned in chlorine gives silicon tetrachloride, which oxygen turns back into glass pure enough to carry light for kilometres.' },
  { n: 'Recycling', l: [['recyclables', 'Materials recovery facility', 'waste_paper', '+', 'steel_scrap'], ['recyclables', 'Materials recovery facility', 'al_scrap', '+', 'pet_bale'], ['al_scrap', 'Rotary melting furnace + salt', 'aluminium', '+', 'salt_slag'], ['salt_slag', 'Leach tank + water', 'salt', '+', 'alumina'], ['steel_scrap', 'Electric arc furnace + quicklime', 'steel'], ['pet_bale', 'Pressure reactor + naoh + water', 'pet'], ['cullet', 'Glass tank furnace', 'glass'], ['waste_paper', 'Flotation cell + naoh + water', 'pulp']], d: 'A collection depot brings in mixed recycling and the materials recovery facility splits it into paper, steel, aluminium, PET and glass. Each goes back into the process that made it, using far less energy than starting from ore, oil or sand.' },
  { n: 'Oilseeds', l: [['npk', 'Farm + water', 'rapeseed'], ['rapeseed', 'Oil mill', 'veg_oil', '+', 'rape_meal'], ['veg_oil', 'Pressure reactor + methanol + naoh', 'diesel', '+', 'glycerol'], ['veg_oil', 'Pressure reactor + naoh + salt', 'soap', '+', 'glycerol'], ['glycerol', 'Pressure reactor + hcl + naoh', 'ech'], ['veg_oil', 'Pressure reactor + h2', 'margarine']], d: 'Rapeseed is pressed into oil and protein meal. The oil becomes biodiesel with methanol, soap with caustic soda, or margarine with hydrogen. Biodiesel and soap both leave glycerol, which turns into epichlorohydrin for epoxy.' },
  { n: 'Building materials', l: [['gypsum', 'Lime kiln', 'stucco'], ['stucco', 'Plasterboard line + paper + water', 'plasterboard'], ['slag', 'Ball mill + clinker + gypsum', 'cement'], ['slag', 'Stone wool cupola + crushed_lime + coke', 'stone_wool'], ['crushed_lime', 'Asphalt plant + sand + bitumen', 'asphalt'], ['steel', 'Bar rolling mill', 'rebar'], ['rebar', 'Workshop + cement + sand + crushed_lime + water', 'precast']], d: 'Flue gas gypsum becomes plasterboard, and blast furnace slag becomes cement and stone wool insulation. Limestone aggregate and refinery bitumen make road asphalt. Rolled rebar and concrete make precast beams.' },
  { n: 'Flavours and fragrances', l: [['wood_chips', 'Steam still + steam', 'turpentine'], ['turpentine', 'Pressure reactor + h2 + o2', 'linalool'], ['linalool', 'Compounding room + ethanol + glass', 'perfume'], ['bl', 'Pressure reactor + o2', 'vanillin'], ['vanillin', 'Compounding room + sugar + ethanol + water', 'flavouring'], ['ethanol', 'Pressure reactor + acetic', 'ethyl_acetate'], ['ethyl_acetate', 'Compounding room + carbon_black + nylon', 'ink']], d: 'Pine chips give turpentine, which becomes the lavender scent linalool. Pulp mill black liquor oxidises to vanillin. Ethanol and acetic acid make ethyl acetate, the solvent in fast-drying printing ink.' },
  { n: 'Cotton and denim', l: [['npk', 'Farm + water', 'seed_cotton'], ['seed_cotton', 'Cotton gin', 'cotton_lint', '+', 'cottonseed'], ['cottonseed', 'Oil mill', 'veg_oil', '+', 'rape_meal'], ['cotton_lint', 'Ring spinning frame', 'cotton_yarn'], ['benzene', 'Pressure reactor + hno3 + acid', 'nitrobenzene'], ['nitrobenzene', 'Pressure reactor + h2', 'aniline'], ['acetic', 'Pressure reactor + cl2', 'mcaa', '+', 'hcl'], ['aniline', 'Pressure reactor + mcaa + naoh', 'indigo'], ['cotton_yarn', 'Indigo dye range + indigo + naoh', 'denim']], d: 'Cotton is ginned into lint and seed. The seed gives oil, and the lint is spun into yarn. Benzene becomes aniline through nitrobenzene, and with chloroacetic acid it makes synthetic indigo. Dip the yarn in reduced indigo to dye it blue for denim.' },
  { n: 'Leather', l: [['maize', 'Cattle ranch + Rapeseed Meal + water', 'hide'], ['chromite', 'Lime kiln + soda_ash', 'chromate'], ['chromate', 'Pressure reactor + acid', 'dichromate', '+', 'salt_cake'], ['dichromate', 'Pressure reactor + so2', 'chrome_tan'], ['hide', 'Tanning drum + quicklime + water', 'pelt'], ['pelt', 'Tanning drum + Chrome Tanning Salt + acid', 'wet_blue'], ['wet_blue', 'Tanning drum + Vegetable Oil', 'leather'], ['leather', 'Shoe factory + Nylon 6,6 Chips', 'shoes']], d: 'Cattle ranches turn maize and oilseed meal into hides. Roast chromite with soda ash to get yellow chromate, acidify it to dichromate and reduce that with sulfur dioxide to green trivalent chromium salt. In the drum, lime opens up the hide, chromium cross-links the collagen into wet blue, and oil keeps the leather soft.' },
  { n: 'Grain and bakery', l: [['npk', 'Farm + water', 'wheat'], ['wheat', 'Flour mill', 'flour', '+', 'bran'], ['maize', 'Corn wet mill + water + so2', 'starch', '+', 'gluten'], ['starch', 'Pressure reactor + water', 'glucose_syrup'], ['glucose_syrup', 'Pressure reactor', 'hfcs'], ['molasses', 'Fermenter + o2 + nh3', 'yeast'], ['flour', 'Bakery + Baker\'s Yeast + Salt + water', 'bread'], ['hfcs', 'Bottling line + PET Bottle + Citric Acid + co2', 'soft_drink']], d: 'Roller mills split wheat into flour and bran. Wet milling takes maize apart into starch, protein and oil. Enzymes turn starch into glucose syrup and then into fructose syrup. Grow baker\'s yeast on molasses with air and ammonia, bake bread, and bottle syrup with carbonated water in PET.' },
  { n: 'Alkyds and plasticisers', l: [['naphtha', 'Catalytic reformer', 'oxylene', '+', 'h2'], ['oxylene', 'Pressure reactor + o2 + V₂O₅ catalyst', 'phthalic'], ['phthalic', 'Pressure reactor + glycerol + Vegetable Oil', 'alkyd'], ['alkyd', 'Paint disperser + Titanium White + turpentine', 'gloss_paint'], ['propylene', 'Pressure reactor + co + h2', 'two_eh'], ['pta', 'Pressure reactor + 2-ethylhexanol', 'dotp'], ['pvc', 'Calender + Crushed Lime + DOTP Plasticiser', 'vinyl_floor']], d: 'Reforming can be run for o-xylene, which vanadium catalyst oxidises to phthalic anhydride. Cook that with glycerol and vegetable oil for alkyd resin and make gloss paint. Hydroformylate propylene to 2-ethylhexanol, esterify it with terephthalic acid into a plasticiser, and calender soft PVC into flooring.' },
  { n: 'Ceramics', l: [['kaolin', 'Blunger + water', 'china_clay', '+', 'sand'], ['gypsum', 'Lime kiln', 'plaster'], ['china_clay', 'Blunger + Feldspar + Quartz Sand + water', 'clay_body'], ['sand', 'Glass tank furnace + Borax + Crushed Lime', 'frit'], ['frit', 'Ball mill + Zircon + China Clay + water', 'glaze'], ['clay_body', 'Tunnel kiln + Glaze Slip + fuel_gas', 'tiles'], ['clay_body', 'Slip caster + Plaster of Paris', 'greenware'], ['greenware', 'Tunnel kiln + Glaze Slip + fuel_gas', 'sanitaryware'], ['clay_body', 'Tunnel kiln + Alumina + Glaze Slip + fuel_gas', 'insulator']], d: 'Kaolin is rotted granite found under damp grassland and forest. Wash out the china clay and keep the sand and feldspar, mix the three into a porcelain body, and melt a borax frit that zircon turns into white glaze. Fire tiles, slip-cast basins in plaster moulds, or add alumina for power-line insulators.' },
  { n: 'Toothpaste and shampoo', l: [['water_glass', 'Pressure reactor + acid', 'silica', '+', 'salt_cake'], ['glucose_syrup', 'Pressure reactor + h2', 'sorbitol'], ['hf', 'Pressure reactor + naoh', 'naf'], ['veg_oil', 'Pressure reactor + methanol + h2', 'fatty_alc', '+', 'glycerol'], ['fatty_alc', 'Pressure reactor + eo', 'alc_eth'], ['alc_eth', 'Pressure reactor + acid + naoh', 'sles'], ['silica', 'Tube filler + Sodium Fluoride + Polyethylene Pellets + sorbitol + sles', 'toothpaste'], ['sles', 'Compounding room + Salt + Polyethylene Pellets + linalool', 'shampoo'], ['quicklime', 'Pressure reactor + water + co2', 'pcc']], d: 'Acid on water glass gives a gentle silica abrasive. Hydrogenate glucose to sorbitol and neutralise hydrofluoric acid to sodium fluoride. Turn vegetable oil into fatty alcohol, ethoxylate and sulfate it into SLES, the foaming agent in toothpaste and shampoo. Carbon dioxide and lime make a white filler for paper.' },
  { n: 'Acrylics and ABS', l: [['propylene', 'Pressure reactor + nh3 + o2', 'acn'], ['acn', 'Melt spinner + vam', 'acrylic'], ['acn', 'Pressure reactor + butadiene + styrene', 'abs'], ['abs', 'Injection moulder', 'toy_bricks'], ['ethylene', 'Pressure reactor + co + methanol', 'methyl_prop'], ['methyl_prop', 'Pressure reactor + hcho', 'mma'], ['mma', 'Pressure reactor', 'pmma'], ['acn', 'Fermenter + water', 'acrylamide'], ['acrylamide', 'Pressure reactor', 'paam']], d: 'Propylene, ammonia and air make acrylonitrile in one step. Spin it into acrylic wool, or graft it with butadiene and styrene into ABS and mould toy bricks. Ethylene, carbon monoxide and methanol lead to methyl methacrylate and clear acrylic sheet. Bacterial enzymes turn acrylonitrile into acrylamide for water treatment flocculant.' },
  { n: 'Nickel and cobalt', l: [['laterite', 'HPAL autoclave + acid + steam', 'ni_leach'], ['ni_leach', 'Pressure reactor + quicklime', 'mhp', '+', 'gypsum'], ['mhp', 'Solvent extraction + acid', 'niso4', '+', 'coso4'], ['niso4', 'Electrowinning tankhouse', 'nickel', '+', 'acid'], ['li2co3', 'Pressure reactor + quicklime + water', 'lioh'], ['niso4', 'Pressure reactor + coso4 + lioh + alumina + o2', 'nca'], ['nca', 'Battery plant + graphite + li_elyte', 'nca_cell'], ['nickel', 'Workshop + copper_cathode', 'coins']], d: 'Hot sulfuric acid under pressure dissolves the nickel out of tropical laterite and leaves the iron behind. Lime drops a mixed hydroxide, solvent extraction parts cobalt from nickel, and electrowinning plates out pure metal. Nickel sulfate with cobalt, aluminium and lithium hydroxide makes the NCA cathodes inside long-range car batteries.' },
  { n: 'Carbon fibre', l: [['acn', 'Melt spinner + mma', 'pan_fibre'], ['pan_fibre', 'Oxidation oven', 'ox_pan'], ['ox_pan', 'Carbonisation furnace + n2', 'carbon_fibre'], ['carbon_fibre', 'Compounding room + epoxy', 'prepreg'], ['prepreg', 'Composite autoclave', 'bike_frame'], ['carbon_fibre', 'Composite autoclave + epoxy + polyethylene', 'comp_tank']], d: 'Spin acrylonitrile into a pure precursor, bake it in air until it turns black and will not burn, then drive off everything but carbon under nitrogen. Soak the fibre in epoxy and cure it under pressure for bicycle frames and hydrogen tanks.' },
  { n: 'Brewing and soft drinks', l: [['barley', 'Malt house + water', 'malt'], ['malt', 'Brewhouse + hops + water', 'wort', '+', 'spent_grain'], ['wort', 'Fermenter + yeast', 'beer', '+', 'co2'], ['beer', 'Canning line + aluminium', 'beer_can'], ['sugar', 'Canning line + co2 + h3po4 + aluminium', 'cola_can']], d: 'Sprout barley into malt, mash it with hot water and boil the sweet wort with hops. Yeast turns it into beer and carbon dioxide, which is kept to fizz the drinks. Cans are drawn from aluminium, and the same line makes cola from sugar, phosphoric acid and CO₂.' },
  { n: 'Dairy and cheese', l: [['spent_grain', 'Dairy farm + maize + water', 'milk', '+', 'methane'], ['glucose_syrup', 'Fermenter + water', 'rennet'], ['milk', 'Cheese dairy + rennet + salt', 'cheese', '+', 'whey'], ['whey', 'Spray tower', 'whey_protein'], ['milk', 'Spray tower', 'milk_powder']], d: 'Cows turn brewers\' spent grain and maize into milk, and burp out methane as they do. Rennet from a fermenter curdles milk into cheese, leaving whey that is filtered and dried into protein powder. Spray-dry milk for a powder that keeps without a fridge.' },
  { n: 'Anaerobic digestion', l: [['spent_grain', 'Anaerobic digester + whey', 'biogas', '+', 'digestate'], ['maize', 'Anaerobic digester + water', 'biogas', '+', 'digestate'], ['biogas', 'Gas scrubber + water', 'fuel_gas', '+', 'co2'], ['biogas', 'Boiler + water', 'steam'], ['digestate', 'Farm + water', 'maize']], d: 'Microbes in a warm, airless tank turn whey, spent grain or maize silage into biogas. Wash out the carbon dioxide with water and the methane can replace natural gas, or burn the raw gas under a boiler. The leftover digestate goes back on the fields to grow more maize.' },
  { n: 'Coffee', l: [['coffee_beans', 'Supercritical CO₂ extractor + co2 + water', 'decaf_beans', '+', 'caffeine'], ['coffee_beans', 'Drum roaster + fuel_gas', 'roast_coffee'], ['decaf_beans', 'Drum roaster + fuel_gas', 'roast_coffee'], ['roast_coffee', 'Spray tower + water', 'instant_coffee']], d: 'Farms grow green coffee. Supercritical carbon dioxide pulls the caffeine out without a solvent, and the caffeine sells on its own. Roast either kind of bean in a gas-fired drum, then brew and spray-dry it into instant coffee.' },
  { n: 'Cream, butter and ice cream', l: [['milk', 'Cream separator', 'cream', '+', 'skim_milk'], ['cream', 'Butter churn', 'butter', '+', 'skim_milk'], ['cream', 'Ice cream freezer + skim_milk + sugar + flavouring', 'ice_cream'], ['skim_milk', 'Spray tower', 'milk_powder']], d: 'A centrifuge splits milk into cream and skimmed milk. Churn cream into butter, or freeze cream, skimmed milk, sugar and vanilla flavouring into ice cream. Spare skimmed milk dries into powder.' },
  { n: 'Chocolate', l: [['cocoa_beans', 'Drum roaster + fuel_gas', 'cocoa_nibs'], ['cocoa_nibs', 'Cocoa press', 'cocoa_butter', '+', 'cocoa_powder'], ['cocoa_nibs', 'Conche + cocoa_butter + sugar + milk_powder', 'chocolate']], d: 'Roast fermented cocoa beans and crack them into nibs. Pressing splits nibs into cocoa butter and cocoa powder. Knead nibs with extra cocoa butter, sugar and milk powder in a conche for chocolate.' },
  { n: 'Tungsten and hard metal', l: [['wolframite', 'Gravity spiral + water', 'w_conc', '+', 'sand'], ['w_conc', 'HPAL autoclave + naoh', 'na2wo4'], ['na2wo4', 'Solvent extraction + acid + nh3', 'apt'], ['apt', 'Lime kiln', 'wo3', '+', 'nh3'], ['wo3', 'Pusher furnace + h2', 'w_powder'], ['w_powder', 'Pusher furnace + Carbon Black + h2', 'wc'], ['coso4', 'Electrowinning + water', 'cobalt'], ['wc', 'Sinter-HIP furnace + Cobalt Powder', 'carbide_insert'], ['carbide_insert', 'Workshop + Steel Plate', 'drill_bit'], ['w_powder', 'Bar rolling mill', 'w_wire']], d: 'Wolframite from the hills is concentrated by density, digested in caustic and turned into ammonium paratungstate. Calcine it to yellow oxide, reduce it with hydrogen to metal powder and carburise that into tungsten carbide. Sintered with cobalt it becomes the hard metal of cutting tools and rock drills.' },
  { n: 'Hydrogen peroxide', l: [['phthalic', 'Pressure reactor + benzene + ethylene + acid', 'eaq'], ['eaq', 'Pressure reactor + xylene', 'aq_work'], ['aq_work', 'Pressure reactor + h2 + Raney Nickel', 'ahq'], ['ahq', 'Autoxidation column + o2 + water', 'h2o2', '+', 'aq_work'], ['propylene', 'Pressure reactor + h2o2 + methanol + TS-1', 'po'], ['po', 'Pressure reactor + water', 'pg'], ['pg', 'Bottling line + Steel Plate', 'de_icer'], ['h2o2', 'Granulator + Soda Ash', 'percarbonate'], ['h2o2', 'Leach tank + Kraft Pulp + naoh', 'bleached_pulp']], d: 'An anthraquinone dissolved in solvent picks up hydrogen and hands it to oxygen as peroxide, then goes round again. Peroxide bleaches pulp without chlorine, makes oxygen bleach with soda ash, and oxidises propylene to propylene oxide with only water left over.' },
  { n: 'Wine and whisky', l: [['grapes', 'Wine press', 'must'], ['must', 'Fermenter + Baker\'s Yeast', 'wine', '+', 'argol'], ['wine', 'Bottling line + Glass', 'wine_bottle'], ['argol', 'Leach tank + water', 'cream_tartar'], ['cream_tartar', 'Compounding room + Sodium Bicarbonate + Corn Starch', 'baking_powder'], ['malt', 'Brewhouse + water', 'wort'], ['wort', 'Fermenter + Baker\'s Yeast', 'wash'], ['wash', 'Copper pot still', 'new_make', '+', 'pot_ale'], ['wood', 'Workshop + Steel Plate', 'oak_cask'], ['new_make', 'Bonded warehouse + Oak Cask + Glass', 'whisky'], ['pot_ale', 'Anaerobic digester', 'biogas']], d: 'Press grapes and ferment the must into wine, which leaves a tartar crust that becomes cream of tartar for baking powder. Ferment unhopped wort into wash, double-distil it in a copper pot still and age the spirit in oak for whisky. Pot ale from the still feeds the digester.' },
  { n: 'Molybdenum', l: [['molybdenite', 'Flotation + water', 'mo_conc', '+', 'sand'], ['mo_conc', 'Multiple hearth roaster + o2', 'moo3', '+', 'so2'], ['moo3', 'Leach tank + nh3', 'adm'], ['mo_conc', 'Leach tank + hcl', 'mos2'], ['mos2', 'Pressure reactor + lioh + gas_oil + veg_oil', 'grease'], ['adm', 'Lime kiln + alumina + coso4', 'como_cat'], ['moo3', 'Thermite pit + aluminium + pyrite_cinder', 'ferromoly', '+', 'slag'], ['ferromoly', 'Converter + steel + ferrochrome', 'chromoly'], ['chromoly', 'Bar mill', 'crmo_tube']], d: 'Float molybdenite from mountain porphyry and roast it to oxide, sending the SO₂ to acid. Ammonia dissolves the oxide for catalyst salts, and a thermite burn turns it into ferromolybdenum for chromoly steel. The cobalt-moly catalyst speeds up the hydrotreater.' },
  { n: 'Nylon 6 and carpet', l: [['ka_oil', 'Pressure reactor', 'cyclohexanone', '+', 'h2'], ['nh3', 'Pressure reactor + so2 + o2 + water', 'has_liq', '+', 'amm_sulfate'], ['cyclohexanone', 'Pressure reactor + has_liq + nh3', 'oxime', '+', 'amm_sulfate'], ['oxime', 'Pressure reactor + acid + nh3', 'caprolactam', '+', 'amm_sulfate'], ['caprolactam', 'VK tube + water', 'nylon6'], ['nylon6', 'Melt spinner', 'bcf_yarn'], ['nylon6', 'Melt spinner', 'fishing_line'], ['bcf_yarn', 'Tufting machine + polypropylene + sbr', 'carpet']], d: 'Dehydrogenate KA oil to cyclohexanone and react it with hydroxylamine to the oxime. Strong acid rearranges the oxime into caprolactam, and the VK tube opens the rings into nylon 6. Every step that uses ammonia also makes ammonium sulfate fertiliser.' },
  { n: 'Platinum group metals', l: [['pgm_ore', 'Flotation + water', 'pgm_conc', '+', 'sand'], ['pgm_conc', 'Arc furnace + crushed_lime + o2', 'pgm_matte', '+', 'so2'], ['pgm_matte', 'HPAL autoclave + acid + o2', 'pgm_residue', '+', 'ni_leach'], ['pgm_residue', 'Leach tank + hcl + cl2', 'pgm_liq'], ['pgm_liq', 'Precious metals refinery + nh3', 'platinum', '+', 'palladium'], ['platinum', 'Workshop + rhodium', 'pt_gauze'], ['kaolin', 'Tunnel kiln + alumina + mgoh2', 'cordierite'], ['cordierite', 'Coating line + ce_oxide + palladium + rhodium', 'cat_converter']], d: 'Float the Merensky Reef in dry scrub country, smelt it to matte and leach out the nickel and copper. Chlorine dissolves the precious residue, and the refinery splits it into platinum, palladium and rhodium. Platinum and rhodium weave the ammonia burner gauze, and palladium and rhodium coat ceramic honeycomb into catalytic converters.' },
  { n: 'PLA bioplastic', l: [['glucose_syrup', 'Fermenter + quicklime + acid', 'lactic', '+', 'gypsum'], ['tin', 'Pressure reactor + two_eh + o2', 'sn_oct'], ['lactic', 'Distillation column (tin octoate catalyst)', 'lactide'], ['lactide', 'Lactide polymeriser + sn_oct', 'pla'], ['pla', 'Melt spinner', 'pla_filament'], ['pla', 'Injection moulder', 'pla_cup']], d: 'Bacteria ferment glucose syrup to lactic acid, kept neutral with lime and freed with sulfuric acid. Vacuum and tin catalyst close it into the lactide ring, which opens again into long PLA chains for 3D printer filament and compostable cups.' },
  { n: 'Tall oil and adhesives', l: [['bl', 'Soap skimmer', 'tall_soap'], ['tall_soap', 'Pressure reactor + acid', 'cto', '+', 'salt_cake'], ['cto', 'Distillation column + steam', 'tofa', '+', 'rosin'], ['rosin', 'Pressure reactor + glycerol', 'rosin_ester'], ['ethylene', 'Pressure reactor + vam', 'eva'], ['eva', 'Hot melt kettle + rosin_ester + polyethylene', 'hot_melt'], ['tofa', 'Pressure reactor + phthalic + glycerol', 'alkyd'], ['kraft_paper', 'Corrugator + starch + hot_melt + steam', 'carton']], d: 'Skim the pine soap off black liquor and free it with sulfuric acid; the sodium sulfate goes back to recovery. Vacuum columns split crude tall oil into fatty acids for alkyd paint and rosin for tackifier. EVA, rosin ester and polyethylene make hot melt, which seals the corrugated cartons made from your kraft paper.' },
  { n: 'Viscose and cellophane', l: [['wood_chips', 'Digester + steam + wl', 'dissolving_pulp', '+', 'bl'], ['cotton_lint', 'Leach tank + naoh', 'dissolving_pulp'], ['methane', 'Pressure reactor + sulfur', 'cs2', '+', 'h2s'], ['dissolving_pulp', 'Xanthation churn + naoh + cs2', 'viscose'], ['viscose', 'Spinning bath + acid + znso4', 'rayon', '+', 'salt_cake'], ['viscose', 'Spinning bath + acid + glycerol', 'cellophane', '+', 'salt_cake'], ['viscose', 'Pressure reactor + salt_cake + cotton_lint + steam', 'sponge']], d: 'Steam wood chips before the kraft cook to wash out the hemicellulose, or boil cotton linters, to get dissolving pulp. Natural gas and sulfur make carbon disulfide, and the hydrogen sulfide goes to a Claus unit. Caustic and CS₂ turn the pulp into viscose, which an acid bath sets back into rayon fibre or cellophane film, releasing CS₂ to reuse and sodium sulfate for sponges or the recovery boiler.' },
  { n: 'Iodine', l: [['crushed_caliche', 'Leach tank + water', 'iodate_brine', '+', 'sodium_nitrate'], ['iodate_brine', 'Iodine plant + so2', 'iodine', '+', 'acid'], ['vam', 'Pressure reactor + methanol', 'pva'], ['pva', 'Polariser line + iodine + water', 'polariser'], ['salt', 'Compounding room + iodine + naoh', 'iodised_salt'], ['iodine', 'Compounding room + ethanol + naoh', 'tincture']], d: 'Heap leach crushed caliche to get iodate liquor and sodium nitrate. Sulfur dioxide reduces the iodate to iodine and leaves dilute sulfuric acid. Polymerise vinyl acetate and swap its acetate for OH to get PVA, then stain and stretch it with iodine into polariser film. Iodine also goes into table salt and antiseptic.' },
  { n: 'Abrasives and phenolics', l: [['sand', 'Acheson furnace + pet_coke + wood_chips', 'sic', '+', 'co'], ['bauxite', 'Electric arc furnace + coke', 'fused_alumina'], ['phenol', 'Pressure reactor + hcho', 'phenolic'], ['sic', 'Abrasive coating line + kraft_paper + phenolic', 'sandpaper'], ['fused_alumina', 'Tunnel kiln + kaolin + feldspar', 'grinding_wheel'], ['phenolic', 'Tyre curing press + plate + fused_alumina', 'brake_pad']], d: 'Bake sand with petroleum coke at 2500°C into silicon carbide, and fuse bauxite in an arc into brown alumina grit. Phenol and formaldehyde make phenolic resin, which bonds silicon carbide to paper and binds brake pads. Fused alumina in a vitrified clay bond makes grinding wheels. The Acheson furnace gives off carbon monoxide you can feed to acetic acid.' },
  { n: 'Pigments', l: [['steel', 'Pickling line + acid + water', 'plate', '+', 'pickle_liq'], ['pickle_liq', 'Pressure reactor + steel_scrap + o2 + water', 'iron_yellow'], ['iron_yellow', 'Roaster', 'iron_red'], ['kaolin', 'Tunnel kiln + soda_ash + sulfur + coal', 'ultramarine', '+', 'so2'], ['alkyd', 'Paint disperser + iron_red + ultramarine', 'artist_paint'], ['cement', 'Workshop + sand + iron_red', 'paver']], d: 'Pickling steel in sulfuric acid leaves green iron sulfate liquor. Bubble air through it over scrap iron to grow yellow iron oxide, then roast it red. Clay, soda ash, sulfur and coal fired in a kiln become ultramarine blue. Grind the pigments into alkyd for artist paint, or mix iron red into concrete pavers.' },
  { n: 'Zeolites', l: [['carbon', 'Workshop + polypropylene', 'carbon_filter'], ['water_glass', 'Zeolite crystalliser + alumina + caustic soda + steam', 'zeolite_a'], ['zeolite_a', 'Spray tower + water_glass + LAS', 'detergent'], ['zeolite_a', 'Spray tower + kaolin + water_glass', 'fcc_cat'], ['zeolite_a', 'Workshop + motor + plate', 'o2_concentrator']], d: 'Sodium silicate and alumina dissolved in caustic soda crystallise into zeolite A, which can replace phosphate in washing powder. Zeolite also goes into cracking catalyst and medical oxygen concentrators. Activated carbon packed into polypropylene cartridges makes water filters.' },
  { n: 'Gallium and LEDs', l: [['gallium', 'Pressure reactor + magnesium + ch3cl', 'tmg'], ['alumina', 'Crystal puller', 'sapphire'], ['sapphire', 'MOCVD reactor + tmg + nh3 + h2', 'led_wafer', '+', 'methane'], ['led_wafer', 'Cell line + gold', 'led_chip'], ['re_oh', 'Tunnel kiln + alumina + ce_oxide', 'phosphor'], ['led_chip', 'Workshop + phosphor + aluminium + pcb', 'led_lamp']], d: 'Gallium comes as a by-product of the Bayer process. React it with chloromethane to make trimethylgallium. Pull sapphire crystals from molten alumina, then grow gallium nitride on the wafers in an MOCVD reactor with ammonia. Cut the wafers into blue LED chips. Cover a chip with yellow YAG phosphor fired from rare earths to get a white LED lamp.' },
  { n: 'Plating and galvanising', l: [['dichromate', 'Pressure reactor + acid', 'chromic_acid', '+', 'salt_cake'], ['brass', 'Electroplating line + nickel + chromic_acid + acid', 'chrome_tap', '+', 'rinse'], ['aluminium', 'Electroplating line + acid', 'anodised_al', '+', 'rinse'], ['steel', 'Galvanising kettle + zinc + hcl + nh4cl', 'galv_steel'], ['dichromate', 'Roaster + sulfur', 'chrome_green'], ['rinse', 'Pressure reactor + crushed_lime + so2', 'water', '+', 'gypsum']], d: 'Strong acid turns dichromate into chromic acid. Plate brass taps with nickel and then chrome, or anodise aluminium in sulfuric acid. Dip steel in molten zinc to galvanise it. Every tank line gives off plating rinse, so treat it with sulfur dioxide and limestone to get clean water and gypsum back. Roasting dichromate with sulfur makes chrome oxide green pigment.' },
  { n: 'Lubricants and wax', l: [['bitumen', 'Vacuum column + steam', 'vgo', '+', 'bitumen'], ['vgo', 'Solvent dewaxer + h2', 'base_oil', '+', 'paraffin_wax'], ['phosphorus', 'Pressure reactor + sulfur + zinc_calcine + two_eh', 'zddp', '+', 'h2s'], ['base_oil', 'Compounding room + zddp + polyethylene', 'motor_oil'], ['paraffin_wax', 'Workshop + cotton_yarn', 'candle'], ['paraffin_wax', 'Workshop + iron_red + ultramarine', 'crayon'], ['base_oil', 'Compounding room + paraffin_wax', 'petroleum_jelly']], d: 'Distil the heavy crude residue again under vacuum to boil off waxy gas oil. Hydrotreat and chill it to separate clear base oil from paraffin wax. Blend the base oil with zinc anti-wear additive for motor oil, or with wax for petroleum jelly. Pour the wax into candles and crayons.' },
  { n: 'Carbide and acetylene', l: [['quicklime', 'Carbide furnace + coke', 'cac2', '+', 'co'], ['cac2', 'Pressure reactor + water', 'acetylene', '+', 'slaked_lime'], ['slaked_lime', 'Lime kiln + coal', 'quicklime'], ['acetylene', 'Workshop + steel + acetone', 'acet_cyl'], ['acetylene', 'Pressure reactor + hcho + h2', 'bdo'], ['pta', 'Pressure reactor + bdo', 'pbt'], ['pbt', 'Workshop + wire + tin', 'pbt_connector']], d: 'An electric arc melts lime and coke into calcium carbide, which gives off acetylene when it hits water. The leftover slaked lime goes back to the kiln. Acetylene dissolved in acetone fills welding cylinders, or reacts with formaldehyde and hydrogen to make butanediol. Butanediol and terephthalic acid make PBT, the plastic in car connectors.' },
  { n: 'Melamine and laminates', l: [['urea', 'Pressure reactor', 'melamine', '+', 'nh3'], ['melamine', 'Pressure reactor + hcho', 'mf_resin'], ['paper', 'Workshop + mf_resin + ink', 'decor_paper'], ['kraft_paper', 'Laminate press + phenolic + decor_paper + steam', 'hpl'], ['hpl', 'Workshop + particleboard', 'worktop'], ['mf_resin', 'Laminate press + pulp', 'melamine_ware'], ['urea', 'Compounding room + water + polyethylene', 'adblue']], d: 'Heat urea and it turns into melamine, giving back ammonia for the urea plant. Melamine and formalin make a hard, clear resin. Soak printed paper in it and press it over phenolic kraft paper to make laminate for kitchen worktops, or mould it with pulp into unbreakable plates. Urea in pure water is AdBlue for diesel trucks.' },
  { n: 'Amino acids and enzymes', l: [['molasses', 'Fermenter + nh3 + o2', 'glutamic'], ['glutamic', 'Pressure reactor + naoh', 'msg'], ['msg', 'Workshop + salt + starch + veg_oil', 'stock_cube'], ['molasses', 'Fermenter + nh3 + o2', 'lysine'], ['ddgs', 'Compounding room + lysine + crushed_lime', 'feed_premix'], ['starch', 'Fermenter + nh3 + o2 + water', 'enzyme_broth'], ['enzyme_broth', 'Ultrafiltration skid', 'enzyme'], ['detergent', 'Compounding room + enzyme', 'bio_detergent']], d: 'Bacteria fed molasses and ammonia make amino acids: glutamic acid for MSG and stock cubes, or lysine to boost animal feed. Bacillus grown on starch makes protease and amylase, which are concentrated with membranes into enzyme granules for washing powder that cleans at 30°C.' },
  { n: 'Fibreglass', l: [['benzene', 'Pressure reactor + o2 + V₂O₅ catalyst', 'maleic'], ['maleic', 'Pressure reactor + phthalic + pg + styrene', 'upr'], ['glass_fibre', 'GRP moulding shop + upr + coso4', 'grp_hull'], ['glass_fibre', 'GRP moulding shop + upr + coso4', 'grp_tank'], ['glass_fibre', 'GRP moulding shop + upr', 'rooflight']], d: 'A vanadium catalyst oxidises benzene to maleic anhydride. Cooked with phthalic anhydride and propylene glycol, then dissolved in styrene, it makes polyester resin. Rolled into glass mat with a little cobalt as accelerator, it cures into boat hulls, water tanks and rooflights.' },
  { n: 'Film and fixer', l: [['pelt', 'Pressure reactor + water + steam', 'gelatin'], ['agno3', 'Pressure reactor + nabr + gelatin + water', 'agbr_emulsion'], ['pet', 'Polariser line', 'film_base'], ['film_base', 'Emulsion coating line + agbr_emulsion', 'xray_film'], ['soda_ash', 'Pressure reactor + sulfur + so2 + water', 'hypo']], d: 'Gelatin is the medium that made photography practical. It lets silver bromide crystals grow and ripen, then sets so the emulsion can be washed and coated. Exposed crystals carry a few silver atoms that developer uses as a seed to turn the whole grain black. Hypo dissolves the rest.' },
  { n: 'Vitamin C', l: [['sorbitol', 'Fermenter + o2 + water', 'sorbose'], ['sorbose', 'Pressure reactor + acetone + o2 + hcl', 'ascorbic', '+', 'acetone'], ['ascorbic', 'Tablet line + starch + polypropylene', 'vitc_pack']], d: 'The Reichstein process, 1933: glucose to sorbitol with hydrogen, sorbitol to sorbose with bacteria, then acetone protection, oxidation and acid lactonisation. Most of the acetone comes back out, so pipe it to the reactor again.' },
  { n: 'Safety matches', l: [['potash', 'Electrolysis cell + water', 'kclo3', '+', 'h2'], ['phosphorus', 'Pressure reactor', 'red_p'], ['wood', 'Workshop + kclo3 + sulfur + gelatin + red_p + carton', 'matches']], d: 'A match head is a tiny fuel and oxidiser mix: chlorate gives oxygen, sulfur burns, gelatin glues it, and powdered glass adds friction. Red phosphorus on the box catches from the heat of rubbing and lights the head.' },
  { n: 'Sea harvest', l: [['trawl_net', 'Stern trawler in deep water', 'fish'], ['fish', 'Fishmeal plant + steam', 'fishmeal', '+', 'fish_oil'], ['fishmeal', 'Granulator + flour + fish_oil', 'aquafeed'], ['fish_oil', 'Pressure reactor + ethanol + naoh', 'fish_ee', '+', 'glycerol'], ['fish_ee', 'Short-path still', 'omega3', '+', 'diesel'], ['omega3', 'Tablet line + gelatin + glycerol', 'softgel'], ['fish', 'Canning line + food_can + salt + veg_oil', 'canned_fish']], d: 'Shoot the trawl over deep water and land the catch at a dock. Most of the world\'s wild catch of small oily fish is cooked, pressed and dried into meal and oil. The oil can be hardened to margarine with hydrogen, or turned into ethyl esters and distilled for omega-3 capsules. Every ground breeds back fastest at half strength, so fish a circuit of grounds instead of one.' },
  { n: 'Power stations', l: [['methane', 'Gas turbine', 'Power', '+', 'gt_exhaust'], ['gt_exhaust', 'Heat recovery steam generator + water', 'steam', 'Steam engine', 'Power'], ['tidal', 'Gravity base on the shallow shelf', 'Power at mid-tide']], d: 'A gas turbine burns natural gas, fuel gas or biogas and turns about 38% of it into power. Pipe its exhaust into a heat recovery steam generator and the steam drives steam engines for half as much again: a combined cycle. Tidal stream turbines stand on the shallow shelf and peak at mid-tide, with nothing at slack water.' },
  { n: 'Geothermal', l: [['geo_well', 'Near bare volcanic rock', 'geo_fluid'], ['geo_fluid', 'Flash separator', 'steam', 'Steam engine', 'Power'], ['geo_brine', 'Reactor-clarifier + slaked_lime', 'clear_brine', '+', 'silica'], ['clear_brine', 'DLE column + ldh_sorbent + water', 'licl_sol', '+', 'spent_brine', 'inj_well'], ['licl_sol', 'Leach tank + soda_ash', 'li2co3'], ['licl_sol', 'Electrolyser + water', 'lioh', '+', 'cl2']], d: 'Under young volcanic ranges, brine at 280°C sits two kilometres down. A well brings it up flashing, a separator splits the steam off for steam engines, and the hot brine is full of silica that will scale every pipe unless lime and seed settle it out first. The clarified brine still carries lithium. A column of layered aluminium hydroxide sorbent holds the lithium and lets the sodium past, fresh water washes it off as chloride, and the spent brine goes back down an injection well.' },
  { n: 'Offshore', l: [['oil_platform', 'Jacket over a sea oil field', 'crude', '+', 'methane'], ['crude', 'Subsea pipeline to shore', 'Distillation column'], ['wind_offshore', 'Monopile on the shallow shelf', '2 MW in a fresh breeze']], d: 'Oil fields lie under the sea as well as the land. A rainbow sheen on deep water marks seepage from one. Build a jacket platform over it and lay a subsea pipeline back to shore; boats sail straight over the line. The platform burns its own gas, so it needs no power. In the shallows, monopile wind turbines catch stronger, steadier wind than any on land.' },
  { n: 'Seaweed', l: [['trawler', 'Cutter bar in the shallows', 'kelp'], ['kelp', 'Leach tank + soda_ash + cacl2 + hcl', 'alginate'], ['alginate', 'Compounding room + gypsum + silica', 'impression'], ['alginate', 'Viscose spinning bath + cacl2', 'dressing'], ['kelp', 'Lime kiln', 'kelp_ash'], ['kelp_ash', 'Iodine plant + water + cl2', 'iodine', '+', 'potash']], d: 'Kelp beds grow in shallow water near the coast and regrow quickly. Alginate from the weed gels the moment it meets calcium, which makes dental impressions and wound dressings. Burnt to ash it gave Europe its first iodine.' },
  { n: 'Smartphones', l: [['barite', 'Gravity spiral + water', 'barite_conc', 'Kiln + coke', 'black_ash', 'Leach tank + steam', 'bas_liq', 'Precipitator + co2', 'baco3', 'Tunnel kiln + tio2', 'batio3'], ['propylene', 'Pressure reactor + co + h2 + rhodium', 'butanal', 'Pressure reactor + pva', 'pvb'], ['nickel', 'Pressure reactor + co', 'ni_powder'], ['batio3', 'MLCC line + pvb + ni_powder', 'green_stack', 'Sinter-HIP + copper + tin + h2', 'mlcc'], ['tantalum', 'Sinter-HIP', 'ta_anode', 'Electroplating line + h3po4', 'ta_ox', 'Electroplating line + pyrrole + fecl3', 'ta_pp', 'Chip assembly line', 'ta_cap'], ['wood', 'Digester + acid + steam', 'furfural', 'Pressure reactor + palladium', 'furan', 'Pressure reactor + nh3 + alumina', 'pyrrole'], ['coso4', 'Precipitator + soda ash', 'coco3', 'Roaster', 'co3o4', 'Tunnel kiln + li2co3', 'lco'], ['acetylene', 'Pressure reactor + hf', 'hfc152a', 'Chlorinator + cl2', 'r142b', 'Tube furnace', 'vdf', 'Pressure reactor', 'pvdf'], ['bdo', 'Pressure reactor', 'gbl', 'Pressure reactor + methylamine', 'nmp'], ['lco', 'Electrode coater + pvdf + nmp', 'cathode_sheet', 'Battery plant + anode_sheet + li_elyte', 'pouch_cell'], ['sodium_nitrate', 'Precipitator + potash', 'kno3'], ['sand', 'Fusion draw tower + alumina + soda ash', 'as_glass', 'Ion exchange furnace + kno3', 'cover_glass', 'Sputter line + ITO target', 'touch_glass'], ['pcb', 'Electronics assembly line + microchip + mlcc + ta_cap', 'mainboard', 'Electronics assembly line + lcd_module + touch_glass + pouch_cell + camera', 'smartphone']], d: 'A phone gathers almost every chain in the game. Barium titanate from barite fills the MLCCs, tantalum from coltan makes the bulk capacitors with a polypyrrole cathode from wood, cobalt and lithium make the cathode, fluorochemistry gives the PVDF binder, and the cover glass is toughened in molten saltpetre made from Chile nitrate and potash.' },
  { n: 'MRI', l: [['Gas wellhead on an oil seep', 'raw_gas', 'Gas scrubber + mdea', 'sweet_gas', '+', 'h2s'], ['methylamine', 'Pressure reactor + eo', 'mdea'], ['sweet_gas', 'Nitrogen rejection unit', 'methane', '+', 'crude_he', 'Nitrogen rejection unit (PSA)', 'helium', 'Helium liquefier', 'lhe'], ['niobium', 'Vacuum furnace + titanium + argon', 'nbti', 'Bar mill + copper', 'sc_wire', 'Magnet hall + stainless + aluminium + epoxy', 'sc_magnet'], ['wire', 'Magnet hall + epoxy + glass_fibre', 'grad_coil'], ['copper_foil', 'Electronics assembly line + ptfe + mlcc', 'rf_coil'], ['gd2o3', 'Magnet hall + lead + motor + helium', 'cryocooler'], ['sc_magnet', 'Magnet hall + grad_coil + rf_coil + cryocooler + mainboard + lhe', 'mri']], d: 'Natural gas from a wellhead on an oil seep is sweetened with amine, then chilled in the nitrogen rejection unit: methane liquefies and the helium is left over. The liquefier turns it into liquid helium at 4 K, cold enough for niobium-titanium to superconduct. Wind the wire into a magnet, add copper gradient coils, an RF coil and a cold head, fill it with liquid helium, and it is a scanner.' },
  { n: 'Contrast agent', l: [['recl3', 'Solvent extraction plant + hcl', 'gdcl3', 'Precipitator + oxalic', 'gd2o3'], ['co', 'Pressure reactor + naoh + acid', 'oxalic'], ['edc', 'Pressure reactor + nh3 + naoh', 'teta'], ['meg', 'Pressure reactor + o2 + silver catalyst', 'glyoxal'], ['ethylene', 'Pressure reactor + br2', 'dbe'], ['teta', 'Pressure reactor + glyoxal + dbe', 'cyclen', 'Pressure reactor + mcaa + naoh', 'dota'], ['acetic', 'Chlorinator + cl2', 'mcaa'], ['glucose_syrup', 'Pressure reactor + methylamine + h2 + Raney nickel', 'meglumine'], ['gd2o3', 'Pressure reactor + dota + meglumine + upw', 'gd_dota', 'Sterile fill line + glass', 'contrast']], d: 'Gadolinium is split from the rare earth chloride in a second solvent extraction bank and dropped out as oxalate. The cage that holds it safely in the body, DOTA, is built from ethyleneamines, glyoxal and dibromoethane, then given four chloroacetic acid arms. Meglumine from glucose makes the complex soluble.' },
  { n: 'Watches', l: [['alumina', 'Flame fusion furnace + chrome_green', 'ruby', 'Workshop', 'jewels'], ['alumina', 'Flame fusion furnace', 'sapphire_boule', 'Workshop + sic', 'sapphire_glass'], ['sand', 'Hydrothermal autoclave + soda_ash', 'quartz_bar', 'Workshop + sic', 'quartz_wafer', 'Wet bench + gold + boe', 'tuning_fork', 'Assembly line', 'xtal'], ['agno3', 'Precipitator + naoh', 'ag2o', 'Battery plant + zinc + koh', 'button_cell'], ['xtal', 'Electronics assembly line + microchip + step_motor + jewels', 'movement', 'Watchmaking atelier + watch_case + sapphire_glass + leather', 'quartz_watch'], ['litho_wafer', 'CVD reactor + sf6', 'spring_wafer', 'Diffusion furnace', 'hairspring'], ['cobalt', 'Vacuum furnace + nickel + ferrochrome + molybdenum', 'nivaflex', 'Bar mill', 'mainspring'], ['watch_wheels', 'Watchmaking atelier + mainspring + hairspring + jewels', 'mech_movement', 'Watchmaking atelier + gold_case + sapphire_glass', 'mech_watch']], d: 'Flame fusion turns alumina into ruby for jewel bearings and sapphire for scratch-proof crystals. Quartz grown in an autoclave is sliced and etched into 32,768 Hz tuning forks; with a chip, a stepping motor and a silver oxide cell they make a quartz watch. A mechanical watch needs a cobalt alloy mainspring, brass wheels and a silicon hairspring cut by deep plasma etching and oxidised to cancel temperature drift.' },
  { n: 'Optics', l: [['recl3', 'Solvent extraction plant + nh3', 'la_oxide', 'Optical glass melter + sand + boric_acid + baco3', 'crown_glass', 'Lens grinding line + sic', 'lens_ground', 'Lens grinding line + ce_oxide', 'lens'], ['tio2', 'Optical glass melter + sand + nb2o5 + potash', 'flint_glass', 'Lens grinding line + sic + ce_oxide', 'flint_lens', 'Optics assembly room + lens + epoxy', 'achromat'], ['mgcl2', 'Precipitator + hf', 'mgf2', 'Vacuum box coater + lens + tio2', 'coated_lens'], ['sand', 'Glass tank furnace + boric_acid', 'mirror_blank', 'Lens grinding line + ce_oxide', 'mirror_fig', 'Vacuum box coater + aluminium', 'tel_mirror', 'Optics assembly room', 'telescope'], ['polycarbonate', 'Injection moulder', 'spec_blank', 'Vacuum box coater + mgf2 + teos', 'spec_lens', 'Optics assembly room + titanium', 'eyeglasses'], ['crown_glass', 'Lens grinding line + ce_oxide', 'prism', 'Optics assembly room + achromat + coated_lens', 'binoculars']], d: 'Lanthanum split from the rare earths goes into crown glass, and titanium and niobium oxides into flint glass, both melted in platinum. Lenses are ground with silicon carbide and polished with ceria; a crown and a flint lens cemented together cancel colour fringes. Vacuum-evaporated layers of titanium dioxide and magnesium fluoride stop reflections, and aluminium turns a figured borosilicate disc into a telescope mirror.' },
  { n: 'Insulin', l: [['glucose_syrup', 'Fermenter + nh3 + o2', 'ib_broth', 'High-pressure homogeniser', 'incl_bodies', 'Refolding tank + urea', 'proinsulin', 'Refolding tank + trypsin', 'insulin_crude'], ['methanol', 'Fermenter + glucose_syrup', 'trypsin'], ['styrene', 'Pressure reactor + acid', 'iex_resin'], ['teos', 'Pressure reactor + sihcl3 + ethylene', 'rp_silica'], ['insulin_crude', 'Chromatography skid + iex_resin', 'insulin_iex', 'Chromatography skid + rp_silica + ethanol', 'insulin_rp', 'Precipitator + zinc + citric', 'insulin_api'], ['insulin_api', 'Sterile fill line + glass + phenol + glycerol', 'ins_cartridge', 'Medical device line + polypropylene', 'insulin_pen'], ['stainless', 'Medical device line + polypropylene', 'pen_needle']], d: 'E. coli carrying the human proinsulin gene packs it into dense granules. The cells are burst, the granules dissolved in urea and refolded in dilute alkali, and trypsin cuts out the C-peptide. Cation exchange and C8 reversed-phase columns purify the insulin, zinc crystallises it, and it is filled into vials and pen cartridges.' },
  { n: 'Fuel cells', l: [['tfe', 'Pressure reactor + sulfuric acid + hf', 'psepve', 'Pressure reactor + tfe', 'pfsa_resin', 'Ionomer membrane line + koh + hno3', 'pfsa_membrane'], ['platinum', 'Precipitator + carbon_black + hcl + hno3 + meg', 'pt_c', 'Electrode coater + pfsa_membrane + ipa', 'ccm'], ['carbon_fibre', 'Calender + ptfe + carbon_black', 'gdl', 'Fuel cell stack line + ccm + silicone', 'mea'], ['stainless', 'Bipolar plate press + acetylene', 'bipolar_plate', 'Fuel cell stack line + mea + steel', 'fc_stack'], ['fc_stack', 'Fuel cell stack line + comp_tank + motor + battery', 'fc_forklift'], ['fc_stack', 'Fuel cell stack line + comp_tank + pouch_cell + aluminium', 'fc_bus']], d: 'TFE and a sulfonyl fluoride vinyl ether copolymerise into a resin that is extruded into film and hydrolysed into a proton-conducting PFSA membrane. Platinum nanoparticles on carbon are coated onto both faces, sandwiched between PTFE-treated carbon paper and stacked hundreds high between carbon-coated stainless bipolar plates.' },
  { n: 'Bicycles', l: [['aluminium', 'Tube drawing mill + magnesium + si_metal', 'al_tube', 'Frame welding shop + powder_coat + argon', 'al_frame'], ['pta', 'Paint disperser + epoxy + tio2 + meg', 'powder_coat'], ['steel', 'Component works + nickel + methane', 'bike_chain'], ['steel', 'Component works + chromium', 'bearing', 'Component works + bike_chain + aluminium', 'groupset'], ['sbr', 'Tyre curing press + nylon + silica + sulfur', 'bike_tyre', 'Bicycle assembly line + al_tube + bearing', 'bike_wheel'], ['al_frame', 'Bicycle assembly line + bike_wheel + groupset', 'bicycle'], ['bike_frame', 'Bicycle assembly line + bike_wheel + groupset', 'road_bike'], ['al_frame', 'Bicycle assembly line + motor + pouch_cell', 'ebike']], d: 'Extrude and draw aluminium alloy into butted tubes, weld and heat-treat them into frames, and powder coat them. Make chains, bearings, cables and groupsets from hardened steel, tyres from rubber and nylon, then lace wheels and build commuter, carbon racing and electric bikes.' },
  { n: 'mRNA vaccines', l: [['glucose_syrup', 'Fermenter + glycerol + nh3', 'pdna_broth', 'Chromatography skid + naoh + acetic', 'plasmid'], ['yeast', 'IVT reactor + salt + h3po4', 'ntp', 'IVT reactor + plasmid + ivt_enzymes', 'mrna_crude', 'Chromatography skid + oligo_dt', 'mrna'], ['veg_oil', 'Pressure reactor + eo + nh3', 'ion_lipid'], ['veg_oil', 'Pressure reactor + h2 + h3po4 + eo', 'dspc'], ['fish_oil', 'Short-path still', 'cholesterol'], ['eo', 'Pressure reactor + veg_oil + methanol', 'peg_lipid'], ['mrna', 'LNP mixer + ion_lipid + dspc + cholesterol + peg_lipid', 'lnp_raw', 'Ultrafiltration skid + sugar', 'lnp'], ['lnp', 'Sterile fill line + glass', 'vaccine_vial', 'Ultra-low freezer store + co2', 'vaccine_shipper']], d: 'Grow plasmid DNA in E. coli and purify it, then copy it into capped messenger RNA with T7 polymerase and modified nucleotides. Purify the mRNA on its poly(A) tail, wrap it in four lipids in a microfluidic mixer, filter, fill and freeze it at -70°C for shipping in dry ice.' },
  { n: 'Wool', l: [['maize', 'Sheep station', 'greasy_wool', 'Wool scour + detergent + soda_ash', 'scoured_wool', 'Ring spinning frame', 'wool_top'], ['wool_top', 'Superwash line + cl2 + ech', 'sw_top', 'Ring spinning frame', 'wool_yarn'], ['aniline', 'Pressure reactor + naphthalene + nano2', 'acid_dye'], ['wool_yarn', 'Dye range + acid_dye + acetic', 'dyed_yarn', 'Flat knitting machine', 'jumper'], ['greasy_wool', 'Wool scour', 'lanolin', 'Pressure reactor + naoh + acetone', 'cholesterol'], ['cholesterol', 'Pressure reactor + br2', 'dhc', 'UV photoreactor + ethanol', 'vitamin_d3', 'Tablet line', 'vit_d_tabs']], d: 'Shear merino sheep, scour the fleece and recover its grease as lanolin. Comb, superwash, spin and acid-dye the wool, then knit jumpers and socks. Turn lanolin into cholesterol, then 7-dehydrocholesterol, and break it open with ultraviolet light to make vitamin D3.' },
  { n: 'Silk', l: [['npk', 'Farm', 'mulberry_leaf', 'Silkworm rearing house', 'cocoon', 'Stifling chamber + steam', 'dried_cocoon'], ['dried_cocoon', 'Reeling machine', 'raw_silk', 'Dye range + soap + soda_ash', 'degummed_silk', 'Ring spinning frame', 'silk_thread'], ['silk_thread', 'Jacquard loom', 'silk_fabric', 'Dye range + acid_dye', 'silk_scarf'], ['silk_thread', 'Dye range + acid_dye', 'dyed_silk', 'Jacquard loom + wool_yarn', 'silk_tie'], ['degummed_silk', 'Sterile fill line + silicone + eo', 'silk_suture'], ['raw_silk', 'Dye range boil-off', 'sericin_liquor', 'Ultrafiltration skid', 'sericin'], ['dried_cocoon', 'Reeling machine', 'silk_pupae', 'Oil mill', 'feed_premix']], d: 'Grow mulberry, rear silkworms and stifle the cocoons. Reel the long filaments into raw silk, boil off the sericin gum and recover it with membranes, throw the silk into organzine, then weave and print scarves, dye and weave ties, and braid sterile sutures. Leftover pupae go to the oil mill.' },
  { n: 'Tea', l: [['npk', 'Tea estate', 'tea_leaf', 'Withering trough', 'withered_leaf', 'CTC machine', 'tea_dhool', 'Fluid bed dryer + fuel_gas', 'black_tea'], ['bleached_pulp', 'Paper machine + polypropylene', 'teabag_paper'], ['black_tea', 'Tea bag machine + teabag_paper + carton', 'tea_bags'], ['black_tea', 'Brewhouse + water', 'tea_liquor', 'Bottling line + sugar + citric', 'iced_tea'], ['tea_leaf', 'Fluid bed dryer + steam', 'green_tea', 'Solvent extraction + ethyl_acetate', 'egcg', 'Tablet line + gelatin', 'tea_caps']], d: 'Pluck tea and wither it, then crush, tear and curl it so its catechins oxidise into the red-brown pigments of black tea, and dry it. Pack it in heat-sealable paper as tea bags or brew it for bottled iced tea. Steam fresh leaf instead to keep it green, and extract EGCG from it for supplements.' },
  { n: 'Manganese', l: [['mn_ore', 'Gravity spiral + water', 'mn_conc'], ['mn_conc', 'Electric arc furnace + coke + limestone', 'femn'], ['mn_conc', 'Electric arc furnace + slag + sand + coke', 'simn'], ['mn_conc', 'Kiln + coke', 'mno_calcine'], ['mno_calcine', 'Leach tank + acid', 'mnso4_raw'], ['mnso4_raw', 'Precipitator + mn_conc + nh3 + h2s', 'mnso4'], ['mnso4', 'Manganese cell house + nh3', 'mn_metal'], ['mnso4', 'Manganese cell house', 'emd'], ['emd', 'Battery plant + zinc + graphite + steel + koh', 'alk_cell'], ['mn_conc', 'Alkali fusion kettle + koh + o2', 'k2mno4'], ['k2mno4', 'Electrolysis cell + water', 'kmno4'], ['mnso4', 'Precipitator + nh3 + o2', 'mn3o4'], ['mn3o4', 'Tunnel kiln + iron_red + zinc_oxide', 'ferrite_core'], ['steel', 'Electric arc furnace + femn + water', 'mn_steel'], ['mn_steel', 'Workshop', 'rail_frog'], ['mn_steel', 'Workshop', 'jaw_plate'], ['niso4', 'Precipitator + mnso4 + coso4 + naoh + nh3', 'nmc_pre'], ['nmc_pre', 'Tunnel kiln + lioh + o2', 'nmc'], ['nmc', 'Battery plant + graphite + aluminium + copper_cathode + li_elyte', 'nmc_cell']], d: 'Black manganese ore goes two ways. Smelted with coke it becomes ferromanganese and silicomanganese for steel, or Hadfield steel for crossings and crusher jaws. Roasted, leached and purified, it is plated as electrolytic manganese or grown as EMD for alkaline cells, fused with potash into permanganate, or turned into ferrite cores and NMC battery cathode.' },
  { n: 'Antimony', l: [['sb_ore', 'Flotation cell + water', 'sb_conc'], ['sb_conc', 'Roaster', 'sb2o3'], ['sb_conc', 'Induction furnace + steel scrap', 'sb_metal'], ['sb2o3', 'Induction furnace + coke + soda ash', 'sb_metal'], ['sb_metal', 'Induction furnace + tin + copper', 'babbitt'], ['babbitt', 'Workshop + steel', 'plain_bearing'], ['sb_metal', 'Induction furnace + tin', 'pewter']], d: 'Stibnite is floated, then either roasted so white antimony trioxide fumes off for flame retardants, or melted with scrap iron that swaps places with the antimony. The metal hardens tin into babbitt bearing metal and lead-free pewter.' },
  { n: 'Copper alloys', l: [['copper_cathode', 'Induction furnace + tin', 'bronze'], ['bronze', 'Workshop + tin + sand', 'bell'], ['copper_cathode', 'Induction furnace + phosphorus', 'cu3p'], ['cu3p', 'Induction furnace + copper + tin', 'phos_bronze'], ['phos_bronze', 'Workshop + acid', 'contact_spring'], ['copper_cathode', 'Induction furnace + nickel + mn_metal', 'cuni'], ['cuni', 'Tube drawing mill', 'cuni_tube'], ['copper_cathode', 'Induction furnace + zinc + nickel', 'nickel_silver'], ['nickel_silver', 'Workshop', 'key_blank']], d: 'The induction furnace melts and stirs copper alloys. Tin gives bronze and bell metal; phosphor copper deoxidises phosphor bronze for springs; nickel and a little iron and manganese give seawater-proof cupronickel; zinc and nickel give nickel silver.' },
  { n: 'Nickel alloys', l: [['nickel', 'Induction furnace + copper', 'monel'], ['nickel', 'Vacuum induction furnace + steel + argon', 'invar'], ['invar', 'Workshop', 'invar_sheet'], ['nickel', 'Vacuum induction furnace + cobalt + steel + argon', 'kovar'], ['kovar', 'Workshop + glass + h2', 'glass_seal'], ['nickel', 'Vacuum induction furnace + titanium + argon', 'nitinol'], ['nitinol', 'Workshop', 'nitinol_wire']], d: 'Nickel with copper is monel. Melted under argon in the vacuum furnace, nickel and iron make invar that barely expands, add cobalt for kovar that matches glass, or alloy it with titanium for shape-memory nitinol.' },
  { n: 'Ammonia respirator', l: [['coke', 'Producer + steam', 'carbon'], ['carbon', 'Workshop + silicone + polypropylene', 'respirator']], d: 'Activated carbon soaked in an acid such as phosphoric or sulfuric acid holds ammonia as an ammonium salt, which plain carbon does poorly. Packed into cartridges on a silicone half-mask it lets you work in a leaking ammonia works.' },
  { n: 'Eggs and poultry', l: [['maize', 'Compounding room + soy_meal + crushed_lime', 'layer_feed'], ['layer_feed', 'Layer house + water', 'egg'], ['egg', 'Egg grading station + bagasse_tableware + water', 'egg_box'], ['egg', 'Egg breaking plant', 'egg_white'], ['egg', 'Egg breaking plant', 'liquid_egg'], ['liquid_egg', 'Spray tower', 'egg_powder'], ['egg_white', 'Spray tower + yeast', 'albumen_powder'], ['egg_white', 'Ion exchange column + salt', 'lysozyme'], ['egg_yolk', 'High-pressure homogeniser + veg_oil + vinegar + salt + glass', 'mayonnaise'], ['eggshell', 'Eggshell membrane separator + water', 'eggshell_membrane'], ['eggshell', 'Ball mill + fuel_gas', 'shell_calcium'], ['fertile_egg', 'Hatchery', 'chick'], ['chick', 'Broiler house + layer_feed + water', 'broiler'], ['broiler', 'Meatpacking plant + polyethylene + water', 'chicken'], ['feathers', 'Rendering plant + steam', 'feather_meal'], ['poultry_litter', 'Fluid bed dryer + fuel_gas', 'litter_pellet'], ['litter_pellet', 'Compounding room + potash', 'npk']], d: 'Hens turn maize, soy and limestone into eggs. Graded eggs go to the shops; broken ones are split into white for powder and lysozyme and yolk for mayonnaise, and the shells give membrane and calcium. Broilers hatched from breeder eggs give meat, and their feathers and litter go back as feed and fertiliser.' },
  { n: 'Bananas', l: [['banana_plantation', 'Banana plantation + npk + water', 'banana_bunch'], ['banana_bunch', 'Banana packing station + carton + alum + water', 'boxed_banana'], ['boxed_banana', 'Ripening room + ethylene', 'ripe_banana'], ['banana_bunch', 'Continuous fryer + sugar + coconut_oil', 'banana_chips'], ['banana_bunch', 'Fluid bed dryer + fuel_gas', 'banana_flour'], ['ripe_banana', 'Pulper-finisher', 'banana_puree'], ['banana_puree', 'Compounding room + glass + ascorbic', 'baby_food'], ['pseudostem', 'Decorticator + water', 'banana_fibre'], ['banana_fibre', 'Paper machine + water', 'banana_paper'], ['banana_plantation', 'Banana plantation + npk + water', 'abaca_stalk'], ['abaca_stalk', 'Decorticator + water', 'abaca_fibre'], ['abaca_fibre', 'Ring frame', 'manila_rope'], ['abaca_fibre', 'Paper machine + polypropylene + water', 'teabag_paper']], d: 'Green bananas boxed for the ship and ripened with ethylene at the other end, chips and flour from unripe fruit, purée for baby food, and fibre from the trunks of bananas and their cousin abaca.' },
  { n: 'Mushrooms', l: [['wheat_straw', 'Compost wharf + spent_grain + gypsum + water', 'raw_compost'], ['raw_compost', 'Pasteurisation tunnel + steam', 'mushroom_compost'], ['wheat', 'Spawn laboratory + crushed_lime + steam', 'grain_spawn'], ['coco_peat', 'Compounding room + crushed_lime + water', 'casing_soil'], ['mushroom_compost', 'Growing room + grain_spawn + casing_soil + water', 'button_mushroom'], ['button_mushroom', 'Trim and pack line + carton', 'mushroom_punnet'], ['button_mushroom', 'UV-B pulse tunnel', 'vit_d_mushroom'], ['mushroom_stem', 'Leach tank + naoh + water', 'chitosan'], ['wheat_straw', 'Bagging line + grain_spawn + polyethylene + steam', 'oyster_bag'], ['oyster_bag', 'Growing room + water', 'oyster_mushroom'], ['wood_chips', 'Bagging line + bran + grain_spawn + polypropylene + steam', 'shiitake_block'], ['shiitake_block', 'Growing room + water', 'shiitake'], ['shiitake', 'Fluid bed dryer + fuel_gas', 'dried_shiitake'], ['rice_husk', 'Bagging line + flour + grain_spawn + steam', 'myco_tray'], ['spent_compost', 'Compost wharf', 'npk']], d: 'Fungi turn straw, sawdust and husks into food: composted straw for button mushrooms, pasteurised straw for oysters, sterilised sawdust for shiitake, and mycelium grown into packaging.' },
  { n: 'Bamboo', l: [['bamboo_grove', 'Bamboo grove + water', 'bamboo_culm'], ['bamboo_culm', 'Bamboo strip mill', 'bamboo_strip'], ['bamboo_strip', 'Steam carboniser + steam', 'carbonised_strip'], ['carbonised_strip', 'Laminate press + uf_resin + steam', 'bamboo_floor'], ['carbonised_strip', 'Laminate press + phenolic + steam', 'strand_board'], ['bamboo_culm', 'Leach tank + borax + water', 'bamboo_pole'], ['bamboo_pole', 'Workshop + polypropylene', 'scaffold'], ['bamboo_pole', 'Workshop + linen_yarn + epoxy', 'bamboo_frame'], ['bamboo_frame', 'Bicycle assembly line + bike_wheel + groupset + bike_cable', 'bamboo_bike'], ['bamboo_culm', 'Bamboo charcoal kiln', 'bamboo_charcoal'], ['bamboo_vinegar', 'Compounding room + glass', 'liquid_smoke'], ['bamboo_charcoal', 'Gas producer + steam', 'carbon'], ['bamboo_culm', 'Digester + steam + wl', 'dissolving_pulp']], d: 'A giant grass cut every year without replanting: strips for floors and decking, borax-treated poles for scaffolds and bikes, and charcoal with its smoke caught as vinegar.' },
  { n: 'Tomatoes', l: [['tomato_field', 'Tomato field + npk + water', 'tomato'], ['glasshouse', 'Glasshouse + npk + stone_wool + water + co2', 'tomato'], ['tomato', 'Hot-break tank + steam', 'tomato_pulp'], ['tomato_pulp', 'Pulper-finisher', 'tomato_juice'], ['tomato_juice', 'Juice evaporator + steam', 'tomato_paste'], ['ethanol', 'Acetator + oxygen + water', 'vinegar'], ['tomato_paste', 'Compounding room + vinegar + sugar + salt + polyethylene', 'ketchup'], ['tomato', 'Canning line + food_can + cacl2 + tomato_juice', 'tinned_tomato'], ['tomato_pomace', 'Fluid bed dryer + fuel_gas', 'tomato_peel'], ['tomato_seed', 'Oil mill', 'tomato_seed_oil'], ['tomato_peel', 'Supercritical CO₂ extractor + co2', 'lycopene'], ['lycopene', 'Tablet line + gelatin + tomato_seed_oil + glycerol', 'lycopene_caps']], d: 'Field or glasshouse tomatoes broken hot, sieved and boiled down to paste for ketchup, with the skins and seeds turned into lycopene and seed oil.' },
  { n: 'Sweeteners', l: [['stevia_field', 'Stevia field + npk + water', 'stevia_leaf'], ['stevia_leaf', 'Leach tank + water', 'stevia_extract'], ['stevia_extract', 'Resin adsorption column + ethanol', 'reb_a'], ['cane_bagasse', 'Digester + acid + steam', 'xylose_liquor'], ['xylose_liquor', 'Ion exchange column + naoh + hcl', 'xylose_syrup'], ['xylose_syrup', 'Hydrogenator + h2', 'xylitol_syrup'], ['xylitol_syrup', 'Cooling crystalliser', 'xylitol'], ['glucose_syrup', 'Fermenter + oxygen + nh3', 'erythritol_broth'], ['erythritol_broth', 'Cooling crystalliser', 'erythritol'], ['maleic', 'Pressure reactor + water + hcl', 'fumaric'], ['fumaric', 'Pressure reactor + nh3', 'aspartic'], ['glucose_syrup', 'Fermenter + nh3 + oxygen', 'phe_broth'], ['phe_broth', 'Cooling crystalliser', 'phenylalanine'], ['aspartic', 'Pressure reactor + phenylalanine + methanol + h2', 'aspartame'], ['aspartame', 'Canning line + aluminium + h3po4 + co2', 'diet_cola'], ['pva_em', 'Pressure reactor + rosin_ester', 'gum_base'], ['gum_base', 'Compounding room + xylitol + linalool', 'sugarfree_gum']], d: 'Sweetness without sugar: a leaf glycoside, two sugar alcohols from wood sugar and fermentation, and a dipeptide stitched together from two amino acids.' },
  { n: 'Castor', l: [['castor_field', 'Castor field + npk + water', 'castor_bean'], ['castor_bean', 'Oil mill', 'castor_oil'], ['castor_cake', 'Pressure reactor + steam', 'castor_meal'], ['castor_oil', 'Hydrogenator + h2', 'hco'], ['hco', 'Pressure reactor + water + steam', 'hsa'], ['hsa', 'Pressure reactor + lioh + gas_oil', 'li_grease'], ['castor_oil', 'Alkali fusion kettle + naoh', 'sebacate'], ['sebacate', 'Precipitator + acid', 'sebacic_acid'], ['sebacic_acid', 'Pressure reactor + hmda', 'nylon610'], ['nylon610', 'Melt spinner + water', 'bristles'], ['castor_oil', 'Pressure reactor + methanol + naoh', 'castor_ester'], ['castor_ester', 'Tube furnace + steam', 'undecylenate'], ['undecylenate', 'Pressure reactor + hbr + water', 'bromo_acid'], ['bromo_acid', 'Pressure reactor + nh3', 'amino11'], ['amino11', 'Pressure reactor', 'nylon11'], ['nylon11', 'Tube extruder + water', 'fuel_line']], d: 'An oil with a hydroxyl group on every chain. Saturate it for wax and grease, split it with molten caustic soda for sebacic acid and octanol, or crack its ester into the eleven-carbon monomer of nylon 11.' },
  { n: 'Potatoes', l: [['potato_field', 'Potato field + npk + water', 'potato'], ['potato', 'Steam peeler + steam + water', 'peeled_potato'], ['peeled_potato', 'Continuous fryer + veg_oil + salt', 'crisps'], ['peeled_potato', 'Continuous fryer + veg_oil + liquid nitrogen', 'fries'], ['potato', 'Potato starch plant + water', 'potato_starch'], ['potato_juice', 'Reactor + steam + hcl', 'potato_protein'], ['potato_starch', 'Dextrin roaster + hcl', 'dextrin'], ['potato', 'Fermenter + malt + yeast + steam', 'potato_wash'], ['potato_wash', 'Distillation column + steam', 'vodka_spirit'], ['vodka_spirit', 'Bottling line + glass + carbon', 'vodka'], ['potato_peel', 'Anaerobic digester + potato_pulp + water', 'biogas']], d: 'A tuber that is four-fifths water. Fry it, freeze it, wash the starch out of it, roast the starch into glue, or mash and distil it into vodka.' },
  { n: 'Sugarcane and rum', l: [['cane_field', 'Sugarcane field + water', 'sugarcane'], ['sugarcane', 'Cane mill + water', 'cane_juice'], ['cane_juice', 'Juice evaporator + slaked_lime + steam', 'cane_syrup'], ['cane_syrup', 'Vacuum pan + steam', 'raw_sugar'], ['raw_sugar', 'Vacuum pan + slaked_lime + carbon + co2', 'sugar'], ['molasses', 'Fermenter + yeast + water', 'rum_wash'], ['rum_wash', 'Distillation column + steam', 'cane_spirit'], ['cane_spirit', 'Bottling line + glass + carbon', 'rum'], ['cane_spirit', 'Bonded warehouse + oak_cask + molasses', 'dark_rum'], ['cane_juice', 'Fermenter, then distillation column', 'ethanol'], ['cane_bagasse', 'Boiler + water', 'steam'], ['cane_bagasse', 'Digester + naoh + steam', 'bagasse_pulp'], ['bagasse_pulp', 'Pulp moulder + water + steam', 'bagasse_tableware']], d: 'Cane is the world\'s biggest crop by weight. The juice gives sugar, the molasses gives rum, and the fibre fires the boilers and moulds into plates.' },
  { n: 'Meat and rendering', l: [['ranch', 'Cattle ranch + maize + soy_meal + water', 'carcass'], ['carcass', 'Meatpacking plant + water', 'beef'], ['fat_trim', 'Rendering plant + steam', 'tallow'], ['bones', 'Rendering plant + water + steam', 'bone_chip'], ['bone_chip', 'Leach tank + slaked_lime + hydrochloric acid', 'ossein'], ['ossein', 'Reactor + slaked_lime + steam', 'gelatin'], ['gelatin', 'Starch mogul + sugar + glucose_syrup', 'gummy_bears'], ['gelatin', 'Softgel encapsulator + glycerol + veg_oil', 'vitd_softgel'], ['bones', 'Lime kiln, in air', 'bone_ash'], ['bone_ash', 'Tunnel kiln + china_clay + feldspar + glaze', 'bone_china'], ['tallow', 'Reactor + naoh + salt', 'soap'], ['tallow', 'Reactor + methanol + naoh', 'diesel']], d: 'Only about 40% of a steer ends up as meat. Rendering turns the fat into tallow, acid turns bone into gelatin and feed phosphate, and burnt bone is the white in bone china.' },
  { n: 'Coconut', l: [['coconut_grove', 'Coconut palms + water', 'coconut'], ['coconut', 'Copra dryer, in the sun', 'copra'], ['copra', 'Oil mill', 'coconut_oil'], ['coconut_oil', 'Edible oil refinery + bleaching_earth + glass + steam', 'coconut_jar'], ['coconut_oil', 'Reactor + methanol + h2', 'fatty_alc'], ['coconut_husk', 'Decorticator + water', 'coir'], ['coir', 'Jacquard loom', 'doormat'], ['coconut_shell', 'Lime kiln, no air', 'shell_charcoal'], ['shell_charcoal', 'Gas producer + steam', 'carbon']], d: 'Nothing on a coconut goes to waste. The dried meat is pressed for lauric oil, the husk gives coir fibre and coco peat, and the shell chars into the best activated carbon.' },
  { n: 'Oil palm', l: [['palm_estate', 'Oil palms + npk + water', 'ffb'], ['ffb', 'Palm oil mill + steam', 'palm_fruit'], ['palm_fruit', 'Palm oil mill + steam + water', 'cpo'], ['palm_nut', 'Palm oil mill', 'palm_kernel'], ['palm_kernel', 'Oil mill', 'pko'], ['kaolin', 'Leach + acid', 'bleaching_earth'], ['cpo', 'Edible oil refinery + bleaching_earth + h3po4 + steam', 'rbd_palm'], ['rbd_palm', 'Edible oil refinery, crystallise', 'palm_stearin'], ['palm_stearin', 'Workshop + cotton_yarn', 'candle'], ['pko', 'Reactor + methanol + h2', 'fatty_alc'], ['pfad', 'Reactor + methanol + acid', 'diesel'], ['pome', 'Anaerobic digester', 'biogas']], d: 'The world\'s biggest vegetable oil. Steamed bunches give orange crude oil from the flesh and lauric kernel oil from the nut. Physical refining strips the colour and free fatty acids, and fractionation splits liquid olein for frying from hard stearin for shortening, soap and candles. Shell and empty bunches fire the boilers, and the effluent goes to a digester instead of open ponds.' },
  { n: 'Agave', l: [['agave_field', 'Blue agave + water, in the sun', 'agave_pina'], ['agave_pina', 'Agave oven + steam', 'cooked_pina'], ['cooked_pina', 'Agave mill + water', 'agave_juice'], ['agave_juice', 'Fermenter + yeast', 'agave_wash'], ['agave_wash', 'Copper pot still, first pass', 'ordinario'], ['ordinario', 'Copper pot still, second pass', 'tequila_spirit'], ['tequila_spirit', 'Bottling line + glass + water', 'tequila'], ['tequila_spirit', 'Bonded warehouse + oak_cask + glass', 'tequila_reposado'], ['agave_juice', 'Juice evaporator + steam', 'agave_syrup'], ['agave_field', 'Sisal + water, in the sun', 'sisal_leaf'], ['sisal_leaf', 'Decorticator + water', 'sisal_fibre'], ['sisal_fibre', 'Ring spinning frame', 'baler_twine']], d: 'Agave stores sugar as inulin instead of starch. Steaming splits it into fructose, and the juice is fermented and twice distilled in copper into tequila, or concentrated into syrup. Its cousin sisal gives hard fibre for twine. Bagasse fires the boilers and vinasse feeds the digester.' },
  { n: 'Cochineal and lac', l: [['nopalry', 'Prickly pear pads + water', 'cochineal'], ['cochineal', 'Carmine works + steam + water', 'carminic'], ['carminic', 'Carmine works + alum + cacl2', 'carmine'], ['carmine', 'Compounding room + beeswax + veg_oil + polyethylene', 'lipstick'], ['lac_orchard', 'Brood lac on kusum trees', 'sticklac'], ['sticklac', 'Lac factory + soda_ash + water', 'seedlac'], ['seedlac', 'Lac factory + steam, or + ethanol to dewax', 'shellac'], ['shellac', 'Compounding room + ethanol + glass', 'french_polish'], ['shellac', 'Record press + crushed_lime + carbon_black + steam', 'record78']], d: 'Two insects make two old industries. Cochineal scale on desert cactus yields carminic acid, which alum and calcium fix into the crimson pigment carmine. Lac insects coat tree branches in resin that is washed, melted or dissolved in alcohol into shellac, for French polish and the first gramophone records.' },
  { n: 'Vanilla', l: [['vanilla_shade', 'Hand-pollinated orchids + npk + water', 'green_vanilla'], ['green_vanilla', 'Curing shed + steam + water', 'vanilla_pods'], ['vanilla_pods', 'Compounding room + ethanol + water + glass', 'vanilla_extract'], ['phenol', 'Hydroxylation reactor + h2o2', 'catechol', '+', 'hydroquinone'], ['catechol', 'Vanillin plant + methanol', 'guaiacol'], ['glyoxal', 'Pressure reactor + hno3 + o2', 'glyoxylic'], ['guaiacol', 'Vanillin plant + glyoxylic + naoh', 'vma'], ['vma', 'Vanillin plant + o2', 'vanillin'], ['catechol', 'Vanillin plant + ethanol', 'guaethol'], ['guaethol', 'Vanillin plant + glyoxylic + naoh + o2', 'ethylvanillin']], d: 'Hand-pollinated orchids give green pods with no flavour until they are scalded, sweated and sun-dried, which frees vanillin from glucovanillin. Soak the cured pods in alcohol for extract. Most vanillin is synthetic: hydrogen peroxide puts a second hydroxyl on phenol, methanol caps one of them to make guaiacol, and glyoxylic acid adds the carbon that becomes the aldehyde.' },
  { n: 'Maple syrup', l: [['sugarbush', 'Sugarbush tapping and tubing', 'maple_sap'], ['maple_sap', 'Sap RO unit', 'sap_conc', '+', 'water'], ['sap_conc', 'Sugarhouse + wood', 'maple_syrup'], ['maple_syrup', 'Bottling line + glass', 'maple_jug'], ['maple_syrup', 'Sugarhouse + wood', 'maple_sugar']], d: 'A sugarbush gives thin sap, about 2% sugar. Reverse osmosis takes three quarters of the water out cold, then a wood-fired evaporator boils the concentrate down to 66% syrup, browning it on the way. Syrup is jugged hot, or boiled further and stirred into maple sugar.' },
  { n: 'Red seaweed', l: [['seaweed_farm', 'Seaweed farm on the shallow shelf', 'cottonii'], ['seaweed_farm', 'Seaweed farm on the shallow shelf', 'gracilaria'], ['cottonii', 'Carrageenan plant + koh + water', 'src_chips'], ['cottonii', 'Carrageenan plant + potash + koh + steam + water', 'carrageenan'], ['gracilaria', 'Agar plant + naoh + steam + water', 'agar'], ['agar', 'Agar plant + yeast + glass + steam + water', 'agar_plates'], ['carrageenan', 'Compounding room + milk + cocoa_powder + sugar + pet_bottle', 'choc_milk']], d: 'Red seaweeds are farmed on ropes in warm shallow sea and need nothing but light. Cottonii cooked in hot potash gives semi-refined carrageenan chips; extracted, filtered and gelled with potassium chloride it gives refined carrageenan, a dairy stabiliser. Gracilaria cooked in caustic soda, extracted and freeze-thawed gives agar, which sets the plates microbiologists grow bacteria on.' },
  { n: 'Citrus', l: [['npk', 'Citrus grove + water', 'oranges'], ['oranges', 'Juice extractor + water', 'orange_juice', '+', 'citrus_peel', '+', 'limonene'], ['orange_juice', 'Juice evaporator + steam', 'fcoj'], ['orange_juice', 'Bottling line + pet_bottle', 'oj_bottle'], ['citrus_peel', 'Peel processing plant + hno3 + steam + ipa', 'pectin'], ['citrus_peel', 'Peel processing plant + quicklime + steam', 'peel_pellets', '+', 'limonene'], ['limonene', 'Compounding room + las + naoh + water + pet_bottle', 'citrus_cleaner']], d: 'Citrus groves need good soil, NPK and water. The juice extractor squeezes whole oranges, keeping juice, peel and peel oil apart. Juice is bottled fresh or concentrated under vacuum and frozen. Hot nitric acid frees pectin from the peel and isopropanol precipitates it; the rest of the peel is limed, pressed and dried into cattle feed, and the oil stripped from it is d-limonene, a grease-cutting solvent.' },
  { n: 'Soybeans', l: [['water', 'Farm', 'soybeans'], ['soybeans', 'Soybean crushing plant + hexane + steam', 'soy_meal', '+', 'crude_soy_oil'], ['crude_soy_oil', 'Pressure reactor + water + steam', 'veg_oil', '+', 'lecithin'], ['soybeans', 'Tofu works + water + steam', 'soy_milk', '+', 'okara'], ['soy_milk', 'Tofu works + mgcl2', 'tofu'], ['soybeans', 'Koji room + wheat + steam', 'shoyu_koji'], ['shoyu_koji', 'Fermenter + brine', 'shoyu_moromi', 'Sake press', 'soy_sauce', '+', 'shoyu_cake'], ['soy_sauce', 'Bottling line + glass', 'shoyu_bottle'], ['koji', 'Fermenter + soybeans + salt', 'miso']], d: 'Soybeans fix their own nitrogen, so the farm needs only water. Crushing flakes the beans and washes the oil out with hexane, leaving toasted meal for feed; degumming the crude oil gives lecithin. Boiled and strained, soybeans make soy milk, which magnesium chloride curdles into tofu. Soy and roasted wheat koji fermented in brine and pressed give soy sauce; rice koji, soybeans and salt make miso.' },
  { n: 'Rice and sake', l: [['npk', 'Rice paddy + water', 'paddy_rice'], ['paddy_rice', 'Rice mill', 'brown_rice', '+', 'rice_husk'], ['brown_rice', 'Rice mill', 'white_rice', '+', 'rice_bran'], ['white_rice', 'Koji room + steam', 'koji'], ['koji', 'Fermenter + white_rice + yeast + water', 'moromi', 'Sake press', 'sake', '+', 'sake_kasu'], ['sake', 'Bottling line + glass', 'sake_bottle'], ['rice_bran', 'Oil mill', 'rice_bran_oil', 'Pressure reactor + naoh + steam', 'veg_oil'], ['rice_husk', 'Boiler + water', 'steam', '+', 'husk_ash'], ['husk_ash', 'Pressure reactor + naoh', 'water_glass']], d: 'Flooded paddies grow rice, and give off methane from the waterlogged soil. The rice mill hulls the paddy and polishes off the bran. Koji mould grown on steamed white rice turns starch into sugar while yeast turns sugar into alcohol in the same moromi tank; the sake press separates clear sake from the lees. Bran is pressed for oil, husks fire the boiler, and their silica-rich ash dissolves in caustic soda as water glass.' },
  { n: 'Flax, jute and linoleum', l: [['npk', 'Flax field', 'flax_straw', '+', 'linseed'], ['flax_straw', 'Retting tanks + water', 'retted_flax', 'Scutching mill', 'line_flax', '+', 'tow'], ['line_flax', 'Ring frame + water', 'linen_yarn', 'Jacquard loom', 'linen'], ['linseed', 'Oil mill', 'linseed_oil', '+', 'linseed_cake'], ['linseed_oil', 'Pressure reactor + rosin + o2', 'lino_cement'], ['npk', 'Jute field + water', 'jute_stalk', 'Retting tanks + water', 'jute_fibre', 'Jacquard loom', 'hessian'], ['wood', 'Ball mill', 'wood_flour'], ['lino_cement', 'Linoleum calender + cork_granule + wood_flour + limestone + tio2 + hessian + steam', 'linoleum']], d: 'Flax gives both fibre and seed. Bacteria in warm retting tanks free the bast from the stalk, the scutching mill combs out long line flax and short tow, and line flax is wet-spun and woven into linen. Pressed linseed oil, blown with oxygen and cooked with rosin, becomes linoleum cement; pressed with cork, wood flour, chalk and titanium white onto jute hessian, it cures into linoleum.' },
  { n: 'Cork', l: [['cork_forest', 'On good soil', 'cork_bark'], ['cork_bark', 'Cork works + water + steam', 'cork_plank', 'Cork works + h2o2 + water', 'cork_stopper', '+', 'cork_granule'], ['cork_granule', 'Cork autoclave + steam', 'cork_board']], d: 'Cork oak montados need good soil and nothing else; strippers take the bark every few years without felling the tree. Boiled and flattened in the cork works, planks are punched into wine stoppers and washed in hydrogen peroxide. The waste is ground to granules and baked in superheated steam into expanded cork insulation board, held together by the cork\'s own resin.' },
  { n: 'Olive oil', l: [['npk', 'Olive grove', 'olives'], ['olives', 'Olive mill + water', 'evoo', '+', 'pomace', '+', 'veg_water'], ['evoo', 'Bottling line + glass + n2', 'olive_bottle'], ['evoo', 'Pressure reactor + naoh + salt', 'castile_soap', '+', 'glycerol'], ['naphtha', 'Distillation column + h2', 'hexane'], ['pomace', 'Pomace extraction plant + hexane + steam', 'pomace_oil', 'Pressure reactor + naoh + steam', 'veg_oil'], ['exh_pomace', 'Boiler + water', 'steam'], ['olives', 'Olive curing vats + naoh + salt + water', 'table_olives']], d: 'Olive groves grow on good soil with a little fertiliser. The mill crushes olives, stirs the paste and spins out extra virgin oil, wet pomace and vegetation water, which is dumped. Hexane washes the last oil out of dried pomace; refined, it becomes ordinary vegetable oil, and the spent pomace fires boilers. Lye and brine cure raw olives for the table, and olive oil saponified with lye makes Castile soap.' },
  { n: 'Natural rubber', l: [['nh3', 'Rubber estate', 'field_latex'], ['field_latex', 'Latex centrifuge + nh3', 'conc_latex', '+', 'skim_latex'], ['conc_latex', 'Pressure reactor + sulfur + zinc_oxide + mbt', 'prevulc_latex', 'Glove dipping line + cacl2 + water', 'latex_glove'], ['field_latex', 'Coagulating trough + acetic', 'wet_sheet', 'Smokehouse + wood', 'smoked_sheet', 'Tyre press + carbon_black + sulfur + steel + zinc_oxide', 'tyre'], ['zinc', 'Lime kiln', 'zinc_oxide'], ['aniline', 'Pressure reactor + cs2 + sulfur', 'mbt']], d: 'Rubber trees grow on any good soil. Tappers collect field latex with a little ammonia to stop it souring. A centrifuge spins it to 60% concentrate, which is cured in the liquid state with sulfur, zinc oxide and MBT accelerator and dipped into gloves. Field latex clotted with acid and dried in wood smoke makes ribbed smoked sheet, the natural rubber of truck tyres.' },
  { n: 'Honey and beeswax', l: [['sugar', 'Apiary', 'honey_frame', 'Honey extraction room', 'raw_honey', 'Bottling line + glass', 'honey_jar'], ['honey_frame', 'Honey extraction room', 'wax_cappings', 'Wax melter + steam', 'beeswax', 'Workshop + cotton_yarn', 'beeswax_candle'], ['beeswax', 'Tube filler + lanolin + veg_oil', 'lip_balm'], ['raw_honey', 'Fermenter + yeast', 'mead', 'Bottling line', 'mead_bottle'], ['sugar', 'Apiary', 'propolis', 'Blender + ethanol', 'propolis_tincture']], d: 'Keep bees, uncap the comb and spin the honey out in a centrifuge, then jar it. Render the cappings into beeswax for candles and lip balm, ferment honey into mead, and dissolve bee glue in ethanol for propolis tincture.' },
  { n: 'Displays', l: [['zinc_calcine', 'Leach tank + acid + steam', 'in_liq', 'Solvent extraction + hcl', 'incl3', 'Precipitator + aluminium', 'indium_sponge', 'Electrolysis cell', 'indium'], ['indium', 'Pressure reactor + tin + hno3 + nh3', 'ito_powder', 'Sinter-HIP + copper', 'ito_target'], ['sand', 'Fusion draw tower + alumina + boric acid + lime', 'disp_glass'], ['sihcl3', 'Pressure reactor', 'silane'], ['disp_glass', 'CVD + molybdenum + silane + nh3', 'tft_glass', 'Stepper + photomask', 'tft_array', 'Sputter line + ITO target', 'backplane'], ['phthalic', 'Pressure reactor + urea + copper', 'cupc', 'Chlorinator + cl2', 'pg7'], ['toluene', 'Pressure reactor + cl2', 'cl_tol', 'Pressure reactor + nh3 + v_cat', 'cl_bn', 'Pressure reactor + dips + sodium', 'pr254'], ['disp_glass', 'Colour filter line + pigments', 'cf_raw', 'Sputter line + ITO target', 'cf_glass'], ['aniline', 'Pressure reactor + nano2 + hf', 'fbz', 'Pressure reactor + br2', 'bfb', 'Pressure reactor + mg + tmb', 'fpba', 'Pressure reactor + palladium', 'lc_core', 'Compounding room', 'lc_mix'], ['backplane', 'Cell assembly line + colour filter + LC + epoxy', 'lcd_cell', 'Display module line + polarisers + chips + LEDs', 'lcd_module', 'Display module line', 'television']], d: 'A flat screen is two sheets of special glass. One carries a transistor and an indium tin oxide electrode for every sub-pixel; the other carries the colour filter. Indium comes from zinc calcine, the liquid crystals are built by Suzuki coupling from fluorobenzene, and the pigments are copper phthalocyanine blue and green and DPP red.' },
  { n: 'Microchips', l: [['potable', 'Reverse osmosis + ro_membrane', 'upw'], ['tar', 'Distillation still', 'naphthalene', 'Pressure reactor + acid + hno3', 'dnq'], ['phenol', 'Pressure reactor + hcho', 'novolac', 'Disperser + dnq + eth_lactate', 'resist'], ['methanol', 'Pressure reactor + nh3', 'tma', 'Pressure reactor + ch3cl', 'tmac', 'Electrolyser + upw', 'tmah'], ['wafer', 'Wet bench + h2o2 + nh3 + hcl', 'clean_wafer', 'Diffusion furnace + o2 + h2', 'ox_wafer'], ['ox_wafer', 'Stepper + resist + tmah + photomask', 'litho_wafer', 'Wet bench + boe', 'etch_wafer'], ['etch_wafer', 'Ion implanter + bf3', 'impl_wafer', 'Diffusion furnace + teos', 'fe_wafer'], ['fe_wafer', 'CVD reactor + wf6 + h2', 'w_wafer', 'Plating and CMP + cuso4 + slurry', 'be_wafer'], ['be_wafer', 'Assembly line', 'die', 'Assembly + lead_frame + bond_wire + emc', 'microchip'], ['microchip', 'PCB line + pcb + solder', 'ecu']], d: 'The longest chain in the game. Ultrapure water, a resist from coal tar and phenol, a metal-free developer from methanol and ammonia, boron from desert lakes, tungsten and fluorine, chromium for the masks, gold for the wires. A wafer goes through cleaning, oxidation, lithography, etching, implant, anneal, tungsten and copper before it is cut into chips.' },
  { n: 'Jet engines', l: [['coltan', 'Gravity spiral + water', 'coltan_conc'], ['coltan_conc', 'Digester + hf + acid', 'taf_liq', 'Solvent extraction + cyclohexanone', 'h2taf7', '+', 'nb_liq'], ['h2taf7', 'Precipitator + potash', 'k2taf7', 'Pressure reactor + sodium', 'tantalum'], ['nb_liq', 'Precipitator + nh3', 'nb2o5', 'Thermite pit + aluminium', 'niobium'], ['mo_conc', 'Multiple hearth roaster + water scrub', 'hreo4', 'Solvent extraction + nh3', 'apr', 'Pusher furnace + h2', 'rhenium'], ['nickel', 'Vacuum induction furnace + cobalt + chromium + tungsten + tantalum + rhenium', 'superalloy'], ['paraffin_wax', 'Injection moulder', 'wax_pattern', 'Shell room + slurry', 'green_shell', 'Autoclave + steam', 'ceramic_mould'], ['superalloy', 'DS furnace + ceramic mould', 'sx_blade', 'EB-PVD + NiCrAlY + YSZ', 'hot_blade'], ['zrcl4', 'Pressure reactor + water', 'zirconia', 'Ball mill + yttria', 'ysz'], ['titanium', 'Vacuum furnace + aluminium + V-Al', 'ti64', 'Forge press', 'fan_blade'], ['in718', 'Forge press', 'turbine_disc'], ['fan_blade', 'Engine hall + hot blades + discs + combustor + nacelle + ECU', 'turbofan']], d: 'A turbofan draws on nearly every chain. Tantalum and niobium from coltan, rhenium from moly roaster gas, yttria from rare earths, zirconia from zircon, vanadium for titanium alloy, nickel and cobalt from laterite, tungsten, chromium and the microchip fab for its controller. Lost-wax casting grows each turbine blade as one crystal.' },
  { n: 'By-products', l: [['ground_copper', 'Flotation', 'copper_conc', '+', 'pyrite_conc'], ['pyrite_conc', 'Roaster', 'pyrite_cinder', 'Blast furnace', 'pig_iron'], ['anode_slime', 'Roaster', 'dore', 'Leach tank + acid', 'silver']], d: 'Nothing is waste. Pyrite gives SO₂ for acid and its cinder is iron ore. Anode slime from copper refining yields selenium, silver and gold.' },
];

const ACH_X = ['Gas warfare', 'Phosgene', 'Ammunition', 'Coal tar and TNT'];
const ACH_MK = new Set();
for (const r of RECIPES) { for (const k in r.o || {}) ACH_MK.add(k); for (const k in r.ch || {}) ACH_MK.add(k); }
const achDone = id => !!(S.ach && S.ach[id]);
const fN = v => Math.floor(v).toLocaleString('en');
const achGift = g => Object.entries(g).map(([k, n]) => n + ' ' + nm(k)).join(', ');
const ACH_CH = [];
Object.assign(ACH_G, { chain: 'Complete chains', scale: 'Milestones', meta: 'Collection' });
for (const ch of CHAINS) {
  if (ACH_X.includes(ch.n)) continue;
  const its = [];
  for (const l of ch.l) for (let i = 2; i < l.length; i += 2) if (ITEMS[l[i]] && ACH_MK.has(l[i]) && !its.includes(l[i])) its.push(l[i]);
  if (its.length < 2) continue;
  const id = 'ch_' + ch.n.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  ACH_CH.push(id);
  ACH.push([id, 'chain', ch.n, `Make every product of the ${ch.n} chain at least once, ${its.length} in all.`, () => its.every(k => mk(k) > 0), () => [its.filter(k => mk(k) > 0).length, its.length], Math.min(60, 10 + its.length * 2), its]);
}
const ACH_TIER = [['Batch', 1, 10], ['Works', 10, 20], ['Industry', 100, 40]];
for (const [k, b] of [['plate', 1000], ['steel', 1000], ['copper_cathode', 1000], ['aluminium', 1000], ['glass', 1000], ['polyethylene', 1000], ['npk', 1000], ['cement', 1000], ['concrete', 1000], ['brick', 1000], ['paper', 1000], ['wire', 1000], ['sulfur', 1000], ['soda_ash', 1000], ['pvc', 1000], ['polypropylene', 1000], ['pet', 1000], ['nylon', 1000], ['titanium', 100], ['stainless', 1000], ['motor', 100], ['board', 100], ['pcb', 100], ['microchip', 100], ['li_cell', 100], ['solar_cell', 100], ['tyre', 100]]) for (const [tn, m, p] of ACH_TIER) ACH.push(['ms_' + k + '_' + m, 'scale', nm(k) + ' · ' + tn, `Make ${fN(b * m)} ${nm(k)} in one world.`, () => mk(k) >= b * m, () => [mk(k), b * m], p]);
const ACH_EL = ['aluminium', 'titanium', 'copper_cathode', 'lead', 'zinc', 'gold', 'silver', 'tin', 'nickel', 'cobalt', 'w_powder', 'molybdenum', 'platinum', 'palladium', 'rhodium', 'gallium', 'polysilicon', 'sulfur', 'phosphorus', 'iodine', 'magnesium', 'chromium', 'tantalum', 'indium', 'sodium', 'graphite', 'selenium', 'zirconium', 'niobium', 'pig_iron', 'rhenium', 'nd_metal'].filter(k => ITEMS[k]);
const achSum = o => Object.values(o).reduce((a, b) => a + b, 0);
const achMeta = (id, n, d, v, x, p) => ACH.push([id, 'meta', n, d, c => v(c) >= x, c => [v(c), x], p]);
const vItems = () => Object.keys(S.made || {}).filter(k => S.made[k] > 0).length;
const vTypes = c => Object.keys(c).length;
const vEnts = c => achSum(c);
const vEarned = () => ACH.filter(a => achDone(a[0])).length;
const vChains = () => ACH_CH.filter(achDone).length;
const vPow = () => Math.round((S.power && S.power.gen) || 0);
const vRg = () => rgd ? Array.from(rgd).filter(v => v === 1).length : 0;
const vEl = () => ACH_EL.filter(k => mk(k) > 0).length;
[[50, 'Broad Church', 20], [150, 'Catalogue', 40], [300, 'Universal Works', 80], [600, 'Everything Factory', 150]].forEach(([x, n, p]) => achMeta('mi_' + x, n, `Make ${x} different products in one world.`, vItems, x, p));
[[25, 'Mixed Site', 15], [75, 'Industrial Estate', 40], [150, 'Chemical Park', 80]].forEach(([x, n, p]) => achMeta('mt_' + x, n, `Have ${x} different kinds of building standing at once.`, vTypes, x, p));
[[250, 'Small Works', 15], [1000, 'Big Works', 30], [5000, 'Company Town', 80]].forEach(([x, n, p]) => achMeta('me_' + x, n, `Have ${fN(x)} buildings, belts, pipes and poles placed.`, vEnts, x, p));
[[25, 'Decorated', 20], [75, 'Honours List', 40], [150, 'Hall of Fame', 80], [300, 'Completionist', 200]].forEach(([x, n, p]) => achMeta('ma_' + x, n, `Earn ${x} achievements in one world.`, vEarned, x, p));
[[5, 'Vertical Integration', 30], [25, 'Supply Chain', 60], [60, 'Conglomerate', 120], [ACH_CH.length, 'Every Chain', 300]].forEach(([x, n, p]) => achMeta('mc_' + x, n, `Complete ${x === ACH_CH.length ? 'every one' : x} of the production chains.`, vChains, x, p));
[[1000, 'Megawatt', 10], [10000, 'Grid Operator', 25], [100000, 'Baseload', 60], [1000000, 'Gigawatt', 150]].forEach(([x, n, p]) => achMeta('mp_' + x, n, `Generate ${x >= 1e6 ? fN(x / 1e6) + ' GW' : fN(x / 1000) + ' MW'} of electricity at once.`, vPow, x, p));
[[100, 'Preferred Supplier', 40], [500, 'Order Book', 100]].forEach(([x, n, p]) => achMeta('mo_' + x, n, `Fill ${x} orders.`, () => S.odone || 0, x, p));
[[500, 'Exterminator', 30], [2500, 'Scourge of the Swarm', 80]].forEach(([x, n, p]) => achMeta('mk_' + x, n, `Kill ${fN(x)} crawlers.`, () => (S.kills || 0) + (S.pk || 0), x, p));
[[10, 'Hive Clearer', 25], [50, 'Burn the Nests', 60]].forEach(([x, n, p]) => achMeta('mh_' + x, n, `Destroy ${x} crawler hives.`, () => S.hk || 0, x, p));
[[100, 'Surveyor', 30], [250, 'Mapmaker', 60]].forEach(([x, n, p]) => achMeta('mr_' + x, n, `Explore ${x} regions of an endless world.`, vRg, x, p));
[[36000, 'Long Shift', 30], [180000, 'Lifer', 80]].forEach(([x, n, p]) => ACH.push(['mg_' + x, 'meta', n, `Keep one world running for ${x / 3600} hours of game time.`, () => S.t >= x, () => [Math.floor(S.t / 3600), x / 3600], p]));
[[250000, 'Mass Production', 40], [1000000, 'Million Units', 100]].forEach(([x, n, p]) => achMeta('mu_' + x, n, `Make ${fN(x)} items in one world.`, () => achSum(S.made || {}), x, p));
[[10, 'Element Hunter', 20], [20, 'Mendeleev', 50], [ACH_EL.length, 'Periodic Table', 120]].forEach(([x, n, p]) => achMeta('mel_' + x, n, `Isolate ${x === ACH_EL.length ? 'all ' + x : x} of the pure elements you can make as solids, from aluminium to zirconium.`, vEl, x, p));
const RANKS = [[0, 'Lab Assistant', {}], [100, 'Shift Chemist', { plate: 100, steel: 20 }], [300, 'Process Engineer', { steel: 60, motor: 10 }], [700, 'Plant Manager', { stainless: 40, motor: 20, board: 10 }], [1500, 'Works Director', { stainless: 100, board: 30, pcb: 20 }], [3000, 'Chief Chemist', { board: 60, pcb: 60, microchip: 20 }], [5000, 'Nobel Laureate', { microchip: 100, stainless: 200 }]];
const achPts = a => a[6] || 10;
const achScore = () => ACH.reduce((s, a) => s + (achDone(a[0]) ? achPts(a) : 0), 0);
const rankOf = p => { let r = 0; RANKS.forEach((R, i) => { if (p >= R[0]) r = i; }); return r; };
const achFrac = (a, c) => { if (!a[5]) return 0; const [x, y] = a[5](c); return y > 0 ? Math.min(1, x / y) : 0; };
let achF = 'all';
const achShow = (a, c) => achF === 'all' || (achF === 'on' ? achDone(a[0]) : !achDone(a[0]) && (achF === 'off' || achFrac(a, c) >= 0.5));
const achQ = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
let tF = 'avail', tQ = '', tX = '';
function techCard(t) {
  const T = TECH[t], done = techOk(t), av = techAvail(t), qi = (S.rq || []).indexOf(t), p = (S.rp && S.rp[t]) || 0;
  const miss = done ? [] : T.dir.filter(x => !techOk(x));
  return `<button class="tc ${done ? 'done' : av ? 'av' : 'lkd'}${qi >= 0 ? ' q' : ''}" data-tech="${t}" data-k="${t}" data-m="t">${ico(t, 1)}<span class="tn">${nm(t)}</span><span class="tp">${packs(t).map(x => ico(x)).join('')}<em>× ${T.n} · ${T.ut}s</em></span>${miss.length ? `<span class="tr">Needs ${miss.map(nm).join(', ')}</span>` : ''}${qi >= 0 ? `<span class="tqn">${qi + 1}</span>` : ''}${p && !done ? `<i class="tb" style="width:${p / T.n * 100}%"></i>` : ''}</button>`;
}
function techHtml() {
  const cur = curTech(), q = tQ.toLowerCase();
  let h = '<div class="tq"><b>Queue</b>';
  h += (S.rq || []).length ? S.rq.map((t, i) => `<button class="tqi${i ? '' : ' on'}" data-tech="${t}" data-k="${t}" data-m="t">${ico(t)}<span>${nm(t)}</span>${i ? '' : `<i class="tb" style="width:${((S.rp && S.rp[t]) || 0) / TECH[t].n * 100}%"></i>`}</button>`).join('') : '<span class="dim">Empty. Click a technology below to research it. Its missing prerequisites are queued first.</span>';
  h += `</div><div class="tfil">${[['avail', 'Available'], ['all', 'All'], ['done', 'Researched']].map(([id, n]) => `<button class="tab ${tF === id ? 'on' : ''}" data-tf="${id}">${n}</button>`).join('')}<span class="txs">${['', ...XPK].map(x => `<button class="tab ${tX === x ? 'on' : ''}" data-tx="${x}" data-k="${x}" data-m="${x ? 'i' : ''}">${x ? ico(x) : 'Any kit'}</button>`).join('')}</span><span class="dim">${Object.keys(S.tech).filter(t => TECH[t]).length} / ${TECHL.length} researched</span></div>`;
  const l = TECHL.filter(t => (!tX || TECH[t].x === tX) && (q ? nm(t).toLowerCase().includes(q) : tF === 'all' || (tF === 'done' ? techOk(t) : !techOk(t) && techAvail(t))));
  for (let lv = 1; lv <= 5; lv++) {
    const ll = l.filter(t => TECH[t].lv === lv);
    if (ll.length) h += `<h3>${ico('sci' + lv)} Tier ${lv}: ${nm('sci' + lv)}</h3><div class="tgrid">${ll.map(techCard).join('')}</div>`;
  }
  return h + (l.length ? '' : '<p class="dim">Nothing here.</p>') + (cur ? '' : '<p class="dim">Labs only work while something is queued.</p>');
}
function renderTech(body) {
  if (!body.querySelector('#tview')) { body.innerHTML = '<div id="tview"><input id="tsearch" placeholder="Search technologies" spellcheck="false"><div id="tlist"></div></div>'; $('#tsearch').value = tQ; modalHtml = ''; }
  const h = techHtml();
  if (h !== modalHtml) { const st = body.scrollTop; $('#tlist').innerHTML = h; modalHtml = h; body.scrollTop = st; }
}
function achHtml() {
  const G = achGlob(), c = achCounts(), got = ACH.filter(a => achDone(a[0])).length, p = achScore(), r = rankOf(p), R = RANKS[r], N = RANKS[r + 1];
  const tot = ACH.reduce((s, a) => s + achPts(a), 0);
  let h = `<div class="achrank"><div class="achrk"><small>Rank ${r + 1} of ${RANKS.length}</small><span>${R[1]}</span></div><div class="achpts"><div><b>${fN(p)}</b> points <small>of ${fN(tot)}</small></div><div class="achbar"><i style="width:${N ? ((p - R[0]) / (N[0] - R[0]) * 100).toFixed(1) : 100}%"></i></div><small>${N ? `${fN(N[0] - p)} more points to ${N[1]}. Promotion sends ${achGift(N[2])}.` : 'The highest rank there is.'}</small></div></div>`;
  h += `<p class="dim">${got} of ${ACH.length} earned in this world · ${ACH.filter(a => G[a[0]]).length} across all your worlds. Click a card to pin it on screen. Press J to open this page.</p><div class="achbar"><i style="width:${(got / ACH.length * 100).toFixed(1)}%"></i></div>`;
  h += '<div class="achf">' + [['all', 'All'], ['on', 'Earned'], ['off', 'Not yet'], ['near', 'Half way or more']].map(([k, n]) => `<button data-achf="${k}" class="${achF === k ? 'on' : ''}">${n}</button>`).join('') + '</div>';
  let any = false;
  for (const g in ACH_G) {
    const L = ACH.filter(a => a[1] === g), sh = L.filter(a => achShow(a, c));
    if (!sh.length) continue;
    any = true;
    h += `<h3>${ACH_G[g]} <small>${L.filter(a => achDone(a[0])).length} / ${L.length}</small></h3><div class="achs">`;
    for (const a of sh) {
      const [id, , n, d] = a, t = S.ach && S.ach[id], pr = !t && a[5] ? a[5](c) : null, miss = !t && a[7] ? a[7].filter(k => !mk(k)).map(nm) : [];
      h += `<div class="achc ${t ? 'on' : G[id] ? 'old' : ''}${S.trk === id ? ' trk' : ''}" data-acht="${id}"${miss.length ? ` title="Still to make: ${achQ(miss.join(', '))}"` : ''}><b>${t ? '★' : G[id] ? '☆' : '·'}</b><div><span>${n}</span><i class="achp">${achPts(a)}</i><p>${d}</p>`;
      if (pr) h += `<div class="achbar sm"><i style="width:${(Math.min(1, pr[1] > 0 ? pr[0] / pr[1] : 0) * 100).toFixed(1)}%"></i></div>`;
      if (miss.length && pr && pr[0] > 0) h += `<p class="miss">Still to make: ${achQ(miss.slice(0, 3).join(', '))}${miss.length > 3 ? ' and ' + (miss.length - 3) + ' more' : ''}</p>`;
      h += `<em>${t ? 'Earned at ' + fmtT(t) : G[id] ? 'Earned in another world' : pr ? fN(pr[0]) + ' / ' + fN(pr[1]) : 'Not yet'}</em></div></div>`;
    }
    h += '</div>';
  }
  if (!any) h += '<p class="dim">Nothing here yet.</p>';
  return h;
}
function achTrk(c) {
  let el = $('#achtrk');
  const a = S.trk && ACH.find(x => x[0] === S.trk);
  if (!a) { if (el) el.hidden = true; return; }
  if (!el) { el = document.createElement('div'); el.id = 'achtrk'; $('#stage').appendChild(el); el.addEventListener('click', () => openModal('ach')); }
  el.hidden = false;
  const t = achDone(a[0]), pr = !t && a[5] ? a[5](c || achCounts()) : null, miss = !t && a[7] ? a[7].filter(k => !mk(k)).map(nm) : [];
  let h = `<b>${t ? '★' : '☆'} ${a[2]}</b><p>${a[3]}</p>`;
  if (pr) h += `<div class="achbar sm"><i style="width:${(Math.min(1, pr[1] > 0 ? pr[0] / pr[1] : 0) * 100).toFixed(1)}%"></i></div><em>${fN(pr[0])} / ${fN(pr[1])}</em>`;
  if (miss.length) h += `<p class="miss">Next: ${achQ(miss.slice(0, 4).join(', '))}${miss.length > 4 ? ' …' : ''}</p>`;
  if (t) h += '<em>Earned</em>';
  if (el.innerHTML !== h) el.innerHTML = h;
}

const HELP = `<div class="help">
<p>Build a factory that turns real ore into metal using real chemistry.</p>
<h3>Controls</h3>
<ul>
<li><b>T</b> opens research. Build a <b>research lab</b>, feed it science kits, and queue technologies to unlock new machines, guns, armour and equipment. Farm, biology, power, metallurgy and defence technologies also take their own field kit. Starting machines need no research.</li>
<li><b>Left click</b> a building in the bar at the bottom, then click the map to place it. Drag to lay belts and pipes.</li>
<li><b>P</b> opens your armour. Wear a plate carrier or an exoframe and fit modules into its grid: solar film, batteries, a methanol fuel cell, exoskeleton legs, trauma plates, a shoulder sentry or a drill arm.</li>
<li><b>R</b> rotates. <b>Q</b> or <b>Esc</b> puts the tool away.</li>
<li><b>Right click</b> picks a building up again, with its contents.</li>
<li><b>Click</b> a building to inspect it, set its recipe, insert items or take outputs.</li>
<li><b>Click and hold</b> on ore to mine it by hand.</li>
<li><b>WASD</b> or arrows walk your engineer. Forest, marsh and snow slow you down and belts carry you along. <b>Mouse wheel</b> zooms. Middle drag or a click on the map looks around, and walking snaps the view back.</li>
<li>You can build and pick up within 10 tiles and mine ore by hand within 3.5 tiles. Buildings can be inspected from anywhere.</li>
<li><b>Space</b> fires at the nearest crawler or hive within 15 tiles, using cartridges from your inventory. <b>X</b> switches between lead shot, armour-piercing rounds and a shotgun. <b>G</b> throws a blasting charge at the mouse. Vests in your pack soak up part of every bite until they wear out. Crawlers attack you if you get close. If they kill you, you wake up back at the landing site with your inventory.</li>
<li><b>F</b> gets in or out of a car or a locomotive. Drag to lay <b>railway track</b>, put a locomotive on it and place wagons at either end to couple them. Click a train to give it a schedule of train stops.</li>
<li><b>Boats</b> are launched on water. Build <b>docks</b> on the shore with chests beside them and <b>buoys</b> as waypoints, then give a boat a route and it plots its own course through open water. Hulls foul over time and slow down; repaint them with antifouling.</li>
<li><b>Alt</b> toggles alt mode: every machine shows its recipe, sorters their filter and chests what they hold. <b>Shift+right-click</b> copies a building's recipe or setting and <b>Shift+click</b> pastes it onto another. <b>Ctrl+click</b> takes everything out of a machine or chest and <b>Ctrl+right-click</b> fills a machine's inputs from your inventory. <b>Q</b> over a building picks one from your inventory.</li>
<li>In crafting, <b>click</b> queues one, <b>right-click</b> five and <b>Shift+click</b> as many as you can make. <b>/</b> or <b>Ctrl+F</b> jumps to the search box.</li>
<li><b>E</b> opens crafting. <b>H</b> opens the encyclopedia. <b>V</b> cycles the pressure, temperature and smog overlays.</li>
</ul>
<h3>Getting started</h3>
<ol>
<li>Put an <b>Offshore pump</b> on the lake, run <b>pipe</b> to a <b>Boiler</b>, and put a <b>Steam engine</b> next to the boiler.</li>
<li>Mine some coal by hand and insert it into the boiler. Then plant <b>Wooden poles</b> from the engine out to your machines: a machine runs only when it touches a pole's blue supply area and that pole is wired back to the engine.</li>
<li>Place <b>Miners</b> on ore. They drop ore onto any belt that touches them and does not point into them.</li>
<li>Belts that point into a machine feed it. Machines hand their outputs to touching machines and belts first, and only put an output into a touching chest when no touching machine uses it.</li>
<li>A chest that holds a machine's inputs feeds that machine and does not take its outputs.</li>
<li>Follow the <b>Ore chains</b> in the encyclopedia: crush, grind, separate, then smelt.</li>
</ol>
<h3>Electricity</h3>
<p>Poles carry power. A pole powers every electric machine that touches its <b>supply area</b>, shown in blue while you hold a pole or click one, and strings wire on its own to the nearest pole of each grid within reach. Poles joined by wire form a <b>grid</b>. Each grid balances its own engines, generators, batteries and machines, so a brown-out on one leaves the others running; the HUD counts grids and machines left without a pole, and those blink a red bolt. Shift-click a second pole while one is selected to string or cut a wire by hand. A pole holds 5 wires. <b>Wooden poles</b> (creosoted pine) reach 8 tiles and supply 5×5. <b>Steel distribution poles</b> reach 10 and supply 7×7. <b>Lattice pylons</b> carry high-voltage ACSR line 30 tiles but supply only their own footprint. <b>Substations</b> step that voltage down and supply 18×18. Worlds generated with <b>Power lines: Wireless</b>, and saves from before poles existed, keep one shared grid with no poles needed.</p>
<p>A <b>gas turbine</b> burns gas only as fast as its grid draws power, and vents 600°C exhaust. Pipe that exhaust with water into a <b>heat recovery steam generator</b> to raise steam for steam engines: two turbines' exhaust runs about three engines. <b>Tidal stream turbines</b> go on the light blue shelf. Click one to see the tide: the current turns every five minutes, so pair them with batteries.</p>
<p><b>Geothermal</b> wells only reach a hot reservoir near bare volcanic rock. The fluid flashes to steam in a <b>flash separator</b>; its brine must be desilicated in a <b>reactor-clarifier</b> before anything else touches it. A <b>DLE column</b> loaded with LDH sorbent then extracts lithium chloride, and an <b>injection well</b> takes the spent brine back down.</p>
<h3>Belts</h3>
<p>Every belt has two lanes. Machines and chests put items on the far lane first, and a belt that runs into the side of another loads onto its near lane, so two lines can share one belt. When a belt is the only feed of the belt in front, that belt bends into a curve and both lanes follow it round. Every tier is 2 tiles/s faster: <b>Fast</b> 4, <b>Express</b> 6, <b>Turbo</b> 8, <b>Hyper</b> 10, <b>Titanium</b> 12, <b>Carbon</b> 14, <b>Linear</b> 16, <b>Maglev</b> 18 and <b>Superconducting</b> 20, and each tier of underground belt reaches 2 tiles further. An <b>Underground belt</b> is placed as an entrance, then a second one further on in the same direction becomes the exit; items pass under anything in between. <b>Pipe-to-ground</b> works the same way for fluids, up to 9 tiles, and connects only on its open face.</p>
<h3>Splitters and inserters</h3>
<p>A <b>splitter</b> takes a belt from behind. Put two or more side by side facing the same way and they share everything that arrives between all of their outputs, keeping each lane on its lane and skipping an output that is backed up. A splitter on its own splits forward, left and right onto belts leading away from it. An <b>inserter</b> swings items from the tile behind it to the tile in front, and a <b>long inserter</b> reaches two tiles each way, over a belt or a pipe. Inserters pick from belts, chests and machine outputs, and only pick what the target can use: a machine's recipe inputs up to its buffer, or a chest with room. They draw power while they move and slow down when power runs short. All five families come in ten tiers. Each tier is built from the one before, so the top tiers need aluminium, PTFE, titanium, carbon fibre, NdFeB magnets, superalloy, chips, superconducting wire and cryocoolers.</p>
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
<p>Every world is generated from a seed. Press <b>New world</b> to pick a seed, size, water, ore richness and crawler density, how much forest and bare rock there is, a cold or hot climate, dry or wet weather, how many dungeons, and a normal or generous starting kit, with a live preview. Your start is always temperate with a lake and the six basic ores nearby. Further out, the land follows its climate: cold <b>tundra</b> to the north, hot <b>deserts</b> to the south, <b>forests</b> and <b>marshes</b> where it is wet, rivers running down from the hills to the sea. <b>Bare rock</b> ridges are too steep to build on and block crawlers. Ores follow geology, so prospect by biome: copper and lead-zinc in the hills, coal under swamps and forests, salt, caliche and potash in deserts, bauxite in hot wet laterite, mineral sands on beaches. Press <b>M</b> for the world map.</p>
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
<h3>Green hydrogen</h3>
<p>The <b>PEM electrolyser</b> splits <b>softened water</b> into hydrogen and oxygen, using 300 kW. A <b>Fuel cell</b> turns hydrogen and oxygen back into up to 120 kW. Like other generators it only uses gas when there is demand, so tanks of hydrogen work as long-term storage: about 40% comes back, compared with 85% for batteries, but a tank holds far more than a battery bank. Electrolysers and fuel cells both need platinum, which only comes from the old works.</p>
<h3>Stainless steel</h3>
<p>Two new ores: black <b>chromite</b> in the mountains and red <b>nickel laterite</b> in hot, wet lowlands. Chromite and coke make <b>ferrochrome</b> in the arc furnace. Laterite is calcined in a lime kiln, then smelted to <b>ferronickel</b>. A <b>converter</b> fed with steel, both ferroalloys, quicklime, oxygen and nitrogen makes <b>stainless steel</b>. <b>Stainless pipe</b> is rated 100 bar and 800°C, so it suits steam and caustic. Keep brine, chlorine and hydrochloric acid out of it, because chlorides corrode it three times faster than plain steel.</p>
<h3>Fluoropolymers</h3>
<p>Chlorinate <b>chloromethane</b> to <b>chloroform</b>, then react it with <b>hydrofluoric acid</b> to make R-22. The tube furnace cracks R-22 to <b>TFE</b>, and the pressure reactor polymerises that in water to <b>PTFE</b>. Each step makes HCl, which you can feed back to the chloromethane reactor. <b>PTFE-lined pipe</b> resists every acid, chlorides, caustic, bromine and fluorides, but it is rated only 16 bar and 260°C. Venting R-22 counts heavily towards smog.</p>
<h3>Lithium batteries</h3>
<p><b>Spodumene</b> is a new ore found in tundra and highlands. Roast it in a lime kiln, leach it with sulfuric acid, and precipitate <b>lithium carbonate</b> with soda ash. The pressure reactor makes <b>LFP cathode</b> from lithium carbonate, iron concentrate, carbon black and phosphoric acid. It also makes <b>LiPF₆</b>, which dissolves in dimethyl carbonate to give the electrolyte. The arc furnace bakes coke and pitch into <b>graphite</b>. The battery plant assembles <b>Li-ion cells</b>, and twelve cells make a <b>Li-ion battery bank</b>: 30 kWh, 600 kW and 95% round trip, against 10 kWh, 250 kW and 85% for lead-acid. The electrolyte turns to HF with any moisture, so pipe it like hydrofluoric acid.</p>
<h3>Polyester</h3>
<p>The <b>catalytic reformer</b> turns naphtha into <b>p-xylene</b>, some benzene and plenty of <b>hydrogen</b>. Oxidise p-xylene with oxygen in a pressure reactor, with a little acetic acid lost as solvent, to get <b>terephthalic acid</b>. Ethylene and oxygen make <b>ethylene oxide</b>, which runs 2.5× faster on a <b>silver catalyst</b> bed (silver on alumina, made in the workshop). Ethylene oxide and water give <b>ethylene glycol</b>. Terephthalic acid and glycol condense into <b>PET</b>, which the melt spinner turns into yarn and the <b>blow moulder</b> into bottles. Ethylene oxide is toxic, so venting it raises smog fast.</p>
<h3>Nuclear power</h3>
<p><b>Uraninite</b> is a new ore in highland tundra and dry scrub. Leach it with sulfuric acid and oxygen, and precipitate <b>yellowcake</b> with ammonia. Hydrogen and hydrofluoric acid make green salt, and <b>fluorine</b> from an electrolysis cell turns it into <b>UF₆</b>. The <b>gas centrifuge hall</b> enriches it to reactor grade and leaves depleted cylinders, which the lime kiln turns back into oxide and hydrofluoric acid. The kiln also makes <b>UO₂ pellets</b> from enriched UF₆. Zircon goes through the chlorinator and the retort to become <b>Zircaloy</b>. The workshop puts pellets, Zircaloy and stainless steel together into a <b>fuel assembly</b>.</p>
<p>The <b>pressurised water reactor</b> needs softened water and fuel in its core. It makes 120 steam a second, enough for four steam engines. Each assembly lasts about ten minutes and comes out as spent fuel. Pack spent fuel into <b>dry casks</b> with concrete and steel.</p>
<h3>Tin and electronics</h3>
<p><b>Cassiterite</b> is a new ore found in marshes and wet grassland. Wash it on a <b>gravity spiral</b> and reduce the concentrate with coke in the <b>arc furnace</b> to get <b>tin</b>. The <b>tinning line</b> plates tin onto steel plate for <b>food cans</b>. The workshop alloys tin with copper into lead-free <b>solder</b>. For circuit boards, plate <b>copper foil</b> in an electrolysis cell and make <b>ferric chloride</b> from iron and chlorine. The <b>PCB line</b> presses glass fibre, epoxy, foil and a little bromine into laminate, etches it with ferric chloride, and solders chips cut from silicon wafers onto it to make <b>control boards</b>. Send the spent etchant back to an electrolysis cell to recover copper and regenerate the ferric chloride.</p>
<h3>Rare earths</h3>
<p>Monazite comes off the electrostatic separator in the mineral sand chain. Crack it with caustic soda in the <b>Bayer digester</b>, then leach with hydrochloric acid. The rare earths dissolve and <b>thorium residue</b> stays behind. Drum the residue with concrete before it fills the tank. The <b>solvent extraction plant</b> separates <b>NdPr</b> from cerium and loses a little diesel each pass. Precipitate NdPr oxide with soda ash, reduce it in an electrolysis cell with carbon anodes, and alloy it in the arc furnace with steel and <b>ferroboron</b>. Ferroboron comes from <b>borax</b>, a new ore on dry scrub and desert flats. <b>NdFeB magnets</b> build the <b>direct-drive wind turbine</b>, which gives three times the output of the small one, and permanent-magnet motors.</p>
<h3>Water treatment</h3>
<p>Dissolve aluminium hydroxide in sulfuric acid to make <b>alum</b>. The <b>water treatment works</b> takes raw water, alum and a little chlorine and gives <b>drinking water</b>. Load <b>activated carbon</b> into it to double its speed. The carbon slowly fills up and comes out as spent carbon, which a kiln with steam turns back into fresh carbon. The <b>reverse osmosis plant</b> needs no chemicals, only <b>membrane elements</b> (nylon, polyester and glass fibre, made in the workshop). It will not start without one, and each element fouls after a few hundred cycles. The <b>blow moulder</b> fills PET bottles with drinking water and HDPE jugs with bleach.</p>
<h3>Farming</h3>
<p>A <b>Farm</b> turns fertiliser (NPK) and water into <b>sugar beet</b> or <b>maize</b>. It grows at full speed on grassland, and slower on scrub and marsh. Desert, forest and tundra hardly work, and the panel shows the soil rating. The <b>Sugar factory</b> needs quicklime and carbon dioxide as well as beet, so pipe in the CO₂ your kilns and fermenters make. The <b>Fermenter</b> turns molasses or maize into <b>ethanol</b>, with CO₂ and distillers grains for feed. A pressure reactor dehydrates ethanol into <b>ethylene</b>, a second source for polyethylene and PVC. Molasses, oxygen, lime and sulfuric acid in a fermenter give <b>citric acid</b> and gypsum.</p>
<h3>Medicines</h3>
<p><b>Paracetamol</b>: nitrate phenol with nitric acid, hydrogenate the <b>4-nitrophenol</b> to <b>4-aminophenol</b>, and acetylate it with acetic anhydride in a precipitator. The acetic acid that comes back can be cracked to anhydride again. <b>Penicillin</b> grows slowly in a fermenter on molasses, maize, oxygen and ammonia, and the <b>Sterile fill line</b> seals it into glass vials. <b>Ibuprofen</b> starts from toluene and propylene, which make <b>isobutylbenzene</b>. That then takes acetic anhydride, hydrogen and carbon monoxide (producer gas). The Tablet line presses and blisters both painkillers.</p>
<h3>Glass and fibre</h3>
<p>The <b>Float glass line</b> melts the same batch as the glass tank furnace but floats it on molten tin. It needs nitrogen and a little hydrogen, and makes <b>float glass</b>. Switch an air separation unit to the argon recipe to get <b>argon</b> as well as oxygen and nitrogen. Argon fills <b>double glazing</b> in the workshop and <b>argon cylinders</b> for welders. For optical fibre, burn silicon in chlorine to make <b>silicon tetrachloride</b>. The <b>Fibre draw tower</b> oxidises it into a <b>preform</b>, giving back most of the chlorine, and then draws the preform into fibre. The workshop cables the fibre.</p>
<h3>Recycling</h3>
<p>A <b>Collection depot</b> needs only power and turns out <b>mixed recycling</b>. The <b>Materials recovery facility</b> sorts it into waste paper, steel scrap, aluminium scrap, PET bales and glass cullet. Aluminium remelts in a <b>Rotary melting furnace</b> under salt flux. The salt slag can be leached back into salt and alumina. Steel scrap melts in the arc furnace with no coke. PET bales are caustic-washed back into PET chips, cullet goes straight into the glass furnace, and waste paper is de-inked in a flotation cell.</p>
<h3>Oilseeds</h3>
<p>Farms grow <b>rapeseed</b>, which the <b>Oil mill</b> presses into <b>rapeseed oil</b> and <b>rapeseed meal</b> for animal feed. In a pressure reactor the oil makes <b>biodiesel</b> (with methanol and a little caustic soda), <b>soap</b> (with caustic soda and salt) or <b>margarine</b> (with hydrogen). Biodiesel comes out as ordinary diesel, so it can fuel generators. Biodiesel and soap both give off <b>glycerol</b>, which can be turned into <b>epichlorohydrin</b> with hydrogen chloride and caustic soda.</p>
<h3>Building materials</h3>
<p>Heat <b>gypsum</b> in a lime kiln to make <b>stucco</b>, then pour it between paper on the <b>Plasterboard line</b>. Gypsum from flue gas scrubbers works well. Grind blast furnace <b>slag</b> with a little clinker and gypsum in a ball mill for <b>slag cement</b>, which needs much less kiln time. The <b>Stone wool cupola</b> melts slag with limestone and coke into insulation. The <b>Asphalt plant</b> glues crushed limestone and sand with bitumen. The <b>Bar rolling mill</b> rolls steel into <b>rebar</b>, which the workshop casts into <b>precast beams</b>.</p>
<h3>Flavours and fragrances</h3>
<p>The <b>Steam still</b> blows steam through wood chips to collect <b>turpentine</b>. A pressure reactor with hydrogen and oxygen turns it into <b>linalool</b>, and the <b>Compounding room</b> blends linalool, ethanol and glass bottles into <b>perfume</b>. Black liquor from the pulp mill, oxidised in a pressure reactor, gives <b>vanillin</b> for <b>vanilla flavouring</b>. Ethanol and acetic acid make <b>ethyl acetate</b>, the solvent in <b>printing ink</b>. These solvents count towards smog if vented.</p>
<h3>Cotton and denim</h3>
<p>Farms grow <b>seed cotton</b>, which needs lots of water. The <b>Cotton gin</b> separates it into <b>lint</b> and <b>cottonseed</b>. The oil mill presses the seed into oil and meal, and the <b>Ring spinning frame</b> spins lint into <b>cotton yarn</b>. For dye, nitrate benzene in a pressure reactor with nitric and sulfuric acid, then hydrogenate the <b>nitrobenzene</b> to <b>aniline</b>. Chlorinate acetic acid to <b>chloroacetic acid</b>, and react the two with caustic soda to make <b>indigo</b>. The <b>Indigo dye range</b> dyes yarn into <b>denim</b>. Aniline and nitrobenzene are toxic, so venting them raises smog quickly.</p>
<h3>Leather</h3>
<p>A <b>Cattle ranch</b> needs grassland like a farm, and turns maize, rapeseed meal and water into <b>hides</b>. Roast chromite with soda ash in the lime kiln to get <b>sodium chromate</b>, then acidify it in a pressure reactor to <b>sodium dichromate</b> and salt cake. Sulfur dioxide reduces dichromate to <b>chrome tanning salt</b>. The <b>Tanning drum</b> limes hides into pelts, tans pelts with chrome salt and a little acid into <b>wet blue</b>, and finishes wet blue with vegetable oil into <b>leather</b>. The <b>Shoe factory</b> sews leather onto nylon soles.</p>
<h3>Grain and bakery</h3>
<p>Farms can grow <b>wheat</b>. The <b>Flour mill</b> rolls it into <b>flour</b> and bran. The <b>Corn wet mill</b> steeps maize in water with a little sulfur dioxide and separates it into <b>corn starch</b>, gluten meal and corn oil. In a pressure reactor, enzymes turn starch into <b>glucose syrup</b>, and a second pass turns that into <b>high-fructose syrup</b>. The fermenter grows <b>baker's yeast</b> on molasses, oxygen and ammonia. The <b>Bakery</b> makes bread from flour, yeast, salt and water. The <b>Bottling line</b> fills PET bottles with fructose syrup, citric acid, carbon dioxide and water.</p>
<h3>Alkyds and plasticisers</h3>
<p>Set the <b>Catalytic reformer</b> to its o-xylene recipe. In a pressure reactor, <b>o-xylene</b> and oxygen give <b>phthalic anhydride</b>, twice as fast with a V₂O₅ catalyst bed. Phthalic anhydride, glycerol and vegetable oil cook into <b>alkyd resin</b>, and the <b>Paint disperser</b> mixes it with titanium white and turpentine into <b>gloss paint</b>. Propylene, carbon monoxide and hydrogen make <b>2-ethylhexanol</b>, which esterifies terephthalic acid into <b>DOTP plasticiser</b>. The <b>Calender</b> rolls PVC, chalk and plasticiser into <b>vinyl flooring</b>.</p>
<h3>Ceramics</h3>
<p><b>Kaolin</b> is a new ore. It forms where granite rotted under a warm, wet climate, so look for pale patches in damp grassland and forest. The <b>Blunger</b> washes it into <b>china clay</b> and quartz sand, with some <b>feldspar</b> left over. Mix clay, feldspar and sand in the blunger for <b>porcelain body</b>. For glaze, melt sand, borax and crushed lime into <b>frit</b> in the glass tank, then mill it with zircon and clay. The <b>Tunnel kiln</b> burns refinery fuel gas to fire body and glaze into <b>tiles</b>, or with alumina into <b>porcelain insulators</b>. For basins, calcine gypsum in the lime kiln to <b>plaster of Paris</b>, cast <b>greenware</b> in the <b>Slip casting shop</b> and glaze-fire it.</p>
<h3>Toothpaste and shampoo</h3>
<p>Sulfuric acid on <b>water glass</b> precipitates <b>silica</b>, the abrasive, with salt cake as a by-product. Hydrogen turns glucose syrup into <b>sorbitol</b>, and hydrofluoric acid with caustic soda gives <b>sodium fluoride</b>. Vegetable oil, methanol and hydrogen make <b>fatty alcohol</b>. Add ethylene oxide for <b>alcohol ethoxylate</b>, then sulfate and neutralise it to <b>SLES</b>. The <b>Tube filling line</b> packs silica, fluoride, sorbitol and SLES into polyethylene tubes. In the compounding room, SLES, water, salt and a little linalool become <b>shampoo</b>. Lime, water and carbon dioxide also make <b>precipitated calcium carbonate</b>, which paper mills buy as filler.</p>
<h3>Acrylics and ABS</h3>
<p>Propylene, ammonia and oxygen in a pressure reactor give <b>acrylonitrile</b>. The melt spinner turns it, with a little vinyl acetate, into <b>acrylic fibre</b>. With butadiene and styrene it becomes <b>ABS</b>, which the <b>Injection moulder</b> shapes into <b>toy bricks</b>. For clear plastic, join ethylene, carbon monoxide and methanol into <b>methyl propionate</b>, add formalin to get <b>methyl methacrylate</b>, and polymerise it into <b>acrylic sheet</b>. A fermenter's enzymes add water to acrylonitrile to make <b>acrylamide</b>, which polymerises into the <b>polyacrylamide</b> flocculant water companies use. Acrylonitrile and acrylamide are toxic, so do not vent them.</p>
<h3>Nickel and cobalt</h3>
<p>The <b>HPAL autoclave</b> digests <b>nickel laterite</b> with sulfuric acid and steam into <b>nickel leach liquor</b>, rejecting the iron as residue. Quicklime in a pressure reactor precipitates <b>mixed hydroxide</b> and gypsum. The <b>solvent extraction plant</b> redissolves it in acid and splits it into <b>nickel sulfate solution</b> and <b>cobalt sulfate</b>. The <b>electrowinning tankhouse</b> plates nickel sulfate into <b>nickel cathode</b> and returns most of the acid. Causticise lithium carbonate with lime for <b>lithium hydroxide</b>, then combine nickel sulfate, cobalt sulfate, alumina, lithium hydroxide, caustic and oxygen into <b>NCA cathode</b>. The battery plant turns it into <b>NCA cells</b>, two per batch. The workshop alloys nickel with copper into <b>coins</b>.</p>
<h3>Carbon fibre</h3>
<p>The melt spinner turns acrylonitrile with a little methyl methacrylate into <b>PAN precursor</b>. The <b>oxidation oven</b> stabilises it into black, flameproof <b>oxidised PAN</b>. The <b>carbonisation furnace</b> heats it under nitrogen into <b>carbon fibre</b>. Fibre and epoxy make <b>prepreg</b> in the compounding room, and the <b>composite autoclave</b> cures prepreg into <b>bike frames</b>. It also winds fibre, epoxy and a polyethylene liner into <b>composite pressure tanks</b> for hydrogen.</p>
<h3>Brewing and soft drinks</h3>
<p>Farms grow <b>barley</b> and <b>hops</b>. The <b>malt house</b> sprouts and kilns barley into <b>malt</b>. The <b>brewhouse</b> mashes malt with water and boils it with hops into <b>wort</b>, leaving <b>spent grain</b> for cattle feed. A fermenter with yeast turns wort into <b>beer</b> and carbon dioxide. The <b>canning line</b> fills beer into aluminium cans. It also makes <b>cola</b> from sugar, water, carbon dioxide and phosphoric acid.</p>
<h3>Dairy and cheese</h3>
<p>The <b>dairy farm</b> feeds cows on maize and spent grain from the brewery. It gives <b>milk</b> and vents a little methane, which counts as smog. Fermenters grow <b>chymosin</b> on glucose syrup. The <b>cheese dairy</b> sets milk with chymosin and salt into <b>cheddar</b>, leaving <b>whey</b>. The spray tower dries whey into <b>whey protein</b> and milk into <b>milk powder</b>.</p>
<h3>Anaerobic digestion</h3>
<p>The <b>anaerobic digester</b> turns spent grain with whey, or maize with water, into <b>biogas</b> and a cake of <b>digestate</b>. Wash biogas in a <b>gas scrubber</b> to strip the carbon dioxide and get <b>fuel gas</b> that every furnace, cracker and boiler can use. Raw biogas also fires a boiler directly. Farms can grow maize on digestate instead of NPK, with a slightly smaller crop. Venting biogas releases methane and raises smog.</p>
<h3>Coffee</h3>
<p>Farms grow <b>green coffee</b> on NPK. The <b>supercritical CO₂ extractor</b> takes carbon dioxide and water and strips out the <b>caffeine</b>, leaving <b>decaf beans</b>. Most of the CO₂ is recycled and the small loss is vented. A gas-fired <b>drum roaster</b> roasts either kind of bean, and the spray tower brews and dries roasted coffee into <b>instant coffee</b>. CO₂ from fermenters, steam reformers or biogas upgrading can feed the extractor.</p>
<h3>Cream, butter and ice cream</h3>
<p>The <b>cream separator</b> spins milk into a little <b>cream</b> and a lot of <b>skimmed milk</b>. The <b>butter churn</b> turns cream into <b>butter</b> and gives back buttermilk as skimmed milk. The <b>ice cream freezer</b> takes cream, skimmed milk, sugar and vanilla <b>flavouring</b>. Skimmed milk left over can be spray-dried into milk powder.</p>
<h3>Chocolate</h3>
<p>Farms grow <b>cocoa beans</b>. The drum roaster turns them into <b>cocoa nibs</b>. The <b>cocoa press</b> squeezes nibs into <b>cocoa butter</b> and <b>cocoa powder</b>. The <b>conche</b> makes <b>milk chocolate</b> from nibs, cocoa butter, sugar and milk powder, or dark chocolate with more nibs and no milk.</p>
<h3>Tungsten and hard metal</h3>
<p><b>Wolframite</b> is found in hills and tundra, far from the start. Wash it on a <b>gravity spiral</b> into concentrate, then digest it with caustic soda in the <b>HPAL autoclave</b> to get <b>sodium tungstate liquor</b>. The solvent extraction plant with a little acid and ammonia crystallises <b>ammonium paratungstate</b>, which the lime kiln calcines to yellow <b>tungsten trioxide</b> and gives some ammonia back. The new <b>pusher furnace</b> reduces the oxide with hydrogen to <b>tungsten powder</b>, and carburises powder and carbon black into <b>tungsten carbide</b>. Electrowin <b>cobalt powder</b> from cobalt sulfate, and the <b>sinter-HIP furnace</b> bonds carbide and cobalt into <b>carbide inserts</b>. The workshop sets them into <b>rock drill bits</b>, and the bar rolling mill swages tungsten powder into <b>tungsten wire</b>.</p>
<h3>Hydrogen peroxide</h3>
<p>Make <b>2-ethylanthraquinone</b> from phthalic anhydride, benzene, ethylene and sulfuric acid, and dissolve it in xylene as <b>working solution</b>. A pressure reactor hydrogenates it, 2.5× faster on a <b>Raney nickel</b> bed (nickel and aluminium leached with caustic). The new <b>autoxidation column</b> blows oxygen through it and washes out <b>hydrogen peroxide</b>, sending 90% of the working solution back, so pipe it in a loop. Peroxide and propylene over a <b>TS-1 catalyst</b> give <b>propylene oxide</b>, which water turns into <b>propylene glycol</b> for <b>aircraft de-icer</b>. Peroxide on soda ash makes <b>sodium percarbonate</b>, and with caustic it bleaches pulp without chlorine.</p>
<h3>Wine and whisky</h3>
<p>Farm <b>wine grapes</b>, crush them in the <b>wine press</b> to <b>grape must</b> and ferment it with yeast into <b>wine</b>. The fermenter also leaves <b>argol</b>, which the leach tank purifies into <b>cream of tartar</b>. Mixed with bicarbonate and corn starch it makes <b>baking powder</b>. For whisky, mash malt without hops into wort, ferment it to <b>wash</b> and run it through the <b>copper pot still</b> for <b>new make spirit</b>. The <b>bonded warehouse</b> ages it in <b>oak casks</b> (wood and steel from the workshop) and bottles it, venting a little ethanol as the angels' share. The still's <b>pot ale</b> goes to the anaerobic digester for biogas.</p>
<h3>Molybdenum</h3>
<p><b>Molybdenite</b> sits in high mountains and some dry country. Float it into concentrate, then roast it with oxygen in the <b>multiple hearth roaster</b> to get <b>technical moly oxide</b>. The roaster gives off a lot of SO₂, so pipe it to an acid plant. Ammonia water in a leach tank turns the oxide into <b>ammonium dimolybdate</b>, and calcining that on alumina with cobalt sulfate makes the <b>cobalt-moly catalyst</b>. Load it into a pressure reactor running hydrotreating and it runs up to 2.6 times as fast. Hydrochloric acid cleans concentrate into <b>MoS₂ powder</b> for <b>moly grease</b>. The <b>thermite pit</b> burns oxide with aluminium and pyrite cinder into <b>ferromolybdenum</b>, which the converter alloys with steel and ferrochrome into <b>chromoly</b> for tube.</p>
<h3>Nylon 6 and carpet</h3>
<p>Take <b>KA oil</b> from the nylon chain and run it through a pressure reactor to get <b>cyclohexanone</b>. A copper-zinc catalyst speeds this up. A second reactor makes <b>hydroxylamine sulfate liquor</b> from ammonia, SO₂, oxygen and water. React the two with more ammonia to get the <b>oxime</b>, then rearrange it with sulfuric acid into <b>caprolactam</b>. The <b>VK tube</b> polymerises caprolactam into <b>nylon 6 chips</b>. The melt spinner turns them into <b>carpet yarn</b> or <b>fishing line</b>, and the <b>tufting machine</b> punches the yarn into a polypropylene backing with rubber latex. Expect plenty of <b>ammonium sulfate</b>, which sells as fertiliser.</p>
<h3>Platinum group metals</h3>
<p><b>Merensky Reef ore</b> lies under dry scrub, best on higher ground. Float it, then smelt the concentrate in the arc furnace with lime and oxygen into <b>converter matte</b>, sending the SO₂ to acid. The HPAL autoclave dissolves the nickel and copper as nickel leach liquor, which feeds your nickel line, and leaves <b>PGM residue</b>. Hydrochloric acid and chlorine in a leach tank turn the residue into <b>PGM chloride liquor</b>. The <b>precious metals refinery</b> splits it with ammonia into <b>platinum</b>, <b>palladium</b> and <b>rhodium</b> and hands back HCl. Platinum and rhodium make <b>platinum gauze</b> in the workshop, so you no longer depend on loot for nitric acid plants, electrolysers and fuel cells. The tunnel kiln fires kaolin, alumina and magnesium hydroxide into <b>cordierite honeycomb</b>, and the <b>catalyst coating line</b> coats it with ceria, palladium and rhodium into <b>catalytic converters</b>.</p>
<h3>PLA bioplastic</h3>
<p>Ferment <b>glucose syrup</b> from corn starch with quicklime and sulfuric acid to get <b>lactic acid</b> and some gypsum. React tin with 2-ethylhexanol and oxygen to make <b>tin octoate</b>. A distillation column turns lactic acid into <b>lactide</b>; load tin octoate into it as a catalyst and it runs up to twice as fast. The <b>lactide polymeriser</b> uses a little more tin octoate to open the rings into <b>PLA pellets</b>. The melt spinner makes <b>3D printer filament</b> and the injection moulder makes <b>compostable cups</b>.</p>
<h3>Tall oil and adhesives</h3>
<p>Put a <b>soap skimmer</b> on your black liquor line to collect <b>tall oil soap</b>. Acidulate it with sulfuric acid in a pressure reactor to get <b>crude tall oil</b> and salt cake, which feeds straight back into the recovery boiler. A distillation column with steam splits the oil into <b>tall oil fatty acids</b> and <b>rosin</b>. TOFA can replace vegetable oil in alkyd resin. Esterify rosin with glycerol into <b>rosin ester</b>, and copolymerise ethylene with vinyl acetate into <b>EVA</b>. The <b>hot melt kettle</b> blends EVA, rosin ester and polyethylene into <b>hot melt adhesive</b>. The <b>corrugator</b> glues kraft paper with starch, uses steam on its hot rolls and seals the boxes with hot melt to make <b>corrugated cartons</b>.</p>
<h3>Viscose and cellophane</h3>
<p>Viscose needs <b>dissolving pulp</b>, which is nearly pure cellulose. Make it in a digester by steaming wood chips before a kraft cook, or by boiling cotton lint in caustic in a leach tank. A pressure reactor makes <b>carbon disulfide</b> from methane and sulfur. Send the hydrogen sulfide it gives off to a Claus unit to get the sulfur back. The <b>xanthation churn</b> mixes pulp, caustic soda and CS₂ into orange <b>viscose dope</b>. In the <b>viscose spinning bath</b>, sulfuric acid sets the dope back into cellulose: with zinc sulfate you get <b>rayon</b> fibre, and with glycerol you get <b>cellophane</b> film. Both release a little CS₂, so pipe it back to the churn rather than letting it pile up. They also give salt cake, which a pressure reactor can foam with viscose and cotton into <b>cellulose sponges</b>.</p>
<h3>Iodine</h3>
<p>Caliche holds a little sodium iodate along with its nitrate. Heap leach crushed caliche with water in a leach tank to get <b>iodate liquor</b> and some sodium nitrate. In the <b>iodine plant</b>, sulfur dioxide reduces the iodate to <b>iodine</b>, leaving dilute sulfuric acid you can reuse. A pressure reactor turns vinyl acetate and methanol into <b>polyvinyl alcohol</b>. The <b>polariser line</b> soaks PVA in iodine and stretches it into <b>polariser film</b>. In the compounding room, iodine with a little caustic soda becomes <b>iodised salt</b>, or with ethanol becomes <b>iodine tincture</b>.</p>
<h3>Abrasives and phenolics</h3>
<p>The <b>Acheson furnace</b> bakes sand, petroleum coke and some sawdust into <b>silicon carbide</b>. It uses a lot of power and gives off carbon monoxide, which a pressure reactor can turn into acetic acid. An electric arc furnace with a little coke melts bauxite into <b>fused alumina</b>. Phenol and formalin react in a pressure reactor to make <b>phenolic resin</b>. On the <b>abrasive coating line</b>, phenolic resin bonds silicon carbide grit to kraft paper to make <b>sandpaper</b>. Fire fused alumina with kaolin and feldspar in a tunnel kiln to make <b>grinding wheels</b>. A tyre curing press bonds phenolic resin, alumina grit and steel plate into <b>brake pads</b>.</p>
<h3>Pigments</h3>
<p>The <b>pickling line</b> cleans steel in sulfuric acid, turning it into plate and leaving <b>spent pickle liquor</b>, which pollutes badly if it leaks. Don't dump it. In a pressure reactor, oxygen and scrap iron turn the liquor into <b>iron oxide yellow</b>, and a roaster turns that into <b>iron oxide red</b>. Firing kaolin, soda ash, sulfur and coal in a tunnel kiln makes <b>ultramarine blue</b>, but the kiln gives off sulfur dioxide that you can send to an acid plant. A paint disperser grinds pigments into alkyd to make <b>artist paint</b>, and a workshop mixes iron red into cement and sand to make <b>coloured pavers</b>.</p>
<h3>Zeolites</h3>
<p>A <b>zeolite crystalliser</b> turns sodium silicate, alumina and caustic soda into <b>zeolite A</b>. The spray tower has a phosphate-free washing powder recipe that uses zeolite in place of STPP. It can also make <b>FCC catalyst</b>. A workshop packs activated carbon into water filter cartridges and builds <b>oxygen concentrators</b>.</p>
<h3>Gallium and LEDs</h3>
<p>The Bayer precipitator sometimes drops a little <b>gallium</b> as a by-product, so keep it. React it with magnesium and chloromethane to make <b>trimethylgallium</b>. The crystal puller can grow <b>sapphire wafers</b> from alumina. The <b>MOCVD reactor</b> grows gallium nitride on the sapphire using trimethylgallium, ammonia and hydrogen. It vents methane and returns most of the hydrogen. The cell line cuts the epiwafers into <b>blue LED chips</b>. A tunnel kiln makes <b>YAG phosphor</b>, and a workshop combines chips, phosphor, aluminium and boards into <b>LED lamps</b>.</p>
<h3>Plating and galvanising</h3>
<p>The <b>electroplating line</b> nickel and chrome plates brass taps, using <b>chromic acid</b> made from dichromate, and anodises aluminium. The <b>galvanising kettle</b> pickles steel in hydrogen chloride, fluxes it with ammonium chloride and dips it in molten zinc. Both give off <b>plating rinse</b>, which pollutes badly if it is dumped. In a pressure reactor, sulfur dioxide and crushed limestone turn the rinse back into clean water and gypsum. Roasting dichromate with sulfur makes <b>chrome oxide green</b>, a pigment that never fades.</p>
<h3>Lubricants and wax</h3>
<p>Feed the <b>vacuum column</b> two bitumen and you get one back plus <b>vacuum gas oil</b>, so the column can run in a loop with the asphalt plant. The <b>solvent dewaxer</b> hydrotreats the gas oil with hydrogen and chills it into <b>base oil</b> and <b>paraffin wax</b>. To make <b>ZDDP</b> anti-wear additive, react phosphorus, sulfur and zinc calcine with 2-ethylhexanol in a pressure reactor. It gives off hydrogen sulfide, which a Claus unit can turn back into sulfur. The compounding room blends <b>motor oil</b> and <b>petroleum jelly</b>, and a workshop pours wax into <b>candles</b> and <b>crayons</b>.</p>
<h3>Carbide and acetylene</h3>
<p>The <b>carbide furnace</b> uses a lot of power to melt quicklime and coke into <b>calcium carbide</b>, and gives off producer gas (CO) that you can burn or pipe away. In a pressure reactor, carbide and water make <b>acetylene</b> and <b>slaked lime</b>. Burn the slaked lime in a lime kiln and it turns back into quicklime, closing the loop. A workshop makes <b>acetylene cylinders</b> from steel and acetone. The Reppe route makes <b>1,4-butanediol</b> from acetylene, formalin and hydrogen, and butanediol with terephthalic acid makes <b>PBT</b>, which a workshop moulds into <b>electrical connectors</b> using wire and tin.</p>
<h3>Melamine and laminates</h3>
<p>A pressure reactor turns urea into <b>melamine</b> and gives off ammonia and CO₂, which you can pipe straight back to the urea reactor. Melamine and formalin make <b>melamine resin</b>. A workshop prints and soaks white paper to make <b>decor paper</b>. The <b>laminate press</b> bonds phenolic-soaked kraft paper and a decor sheet with steam into <b>laminate sheet</b>, which glued onto particleboard makes a <b>kitchen worktop</b>. The same press moulds melamine resin and pulp into <b>tableware</b>. Urea, water and a polyethylene can make <b>AdBlue</b>.</p>
<h3>Amino acids and enzymes</h3>
<p>A fermenter fed molasses, ammonia and oxygen grows bacteria that make <b>glutamic acid</b> or <b>lysine</b>. Caustic soda turns glutamic acid into <b>MSG</b> for <b>stock cubes</b>, and lysine goes into <b>feed premix</b> with distillers grains. Fermenting starch makes <b>enzyme broth</b>, which the <b>ultrafiltration skid</b> concentrates into <b>detergent enzymes</b>. Mix those into washing powder to make <b>biological washing powder</b>.</p>
<h3>Fibreglass</h3>
<p>Put a <b>V₂O₅ catalyst</b> in a pressure reactor with benzene and oxygen to make <b>maleic anhydride</b>; the catalyst wears out like it does for phthalic anhydride. Maleic and phthalic anhydride, propylene glycol and styrene make <b>polyester resin</b>. The <b>GRP moulding shop</b> lays the resin into glass fibre to make <b>boat hulls</b>, <b>water tanks</b> and <b>rooflights</b>. Hulls and tanks also need a little cobalt sulfate as accelerator.</p>
<h3>Film, vitamins and matches</h3>
<p>Cook limed pelt in hot water and steam to extract <b>gelatin</b>. Silver nitrate and sodium bromide run into gelatin make <b>silver bromide emulsion</b>. The polariser line can stretch PET into <b>polyester film base</b>, and the <b>emulsion coating line</b> coats both together into <b>X-ray film</b>. Sulfur, soda ash and SO₂ make <b>hypo</b> fixer. For vitamin C, ferment sorbitol into <b>L-sorbose</b>, then convert it with acetone, oxygen and HCl to <b>ascorbic acid</b>; most of the acetone comes back. An electrolysis cell turns potash brine into <b>potassium chlorate</b> and hydrogen, and heating white phosphorus without air gives safe <b>red phosphorus</b> for the striker of <b>safety matches</b>.</p>
<h3>Offshore oil and wind</h3>
<p>Some oil fields lie under deep water. Look for a <b>rainbow sheen</b> on the dark blue sea and hover it: it reads <b>Offshore oil field</b>. An <b>offshore oil platform</b> (3×3) must stand in deep water over the field. It lifts 30 crude and 6 methane a second, runs on its own gas turbines, and needs no power line. Lay <b>subsea pipeline</b> from the platform to shore: it goes on water or land, and boats pass over it. Gas with nowhere to go is flared. On the light blue shelf, an <b>offshore wind turbine</b> stands on a monopile and gives up to 2 MW. Sea wind is a quarter faster than over land, which is almost twice the power.</p>
<h3>Fishing and seaweed</h3>
<p>Weave a <b>trawl net</b> from monofilament, lead and polyethylene, and build a <b>stern trawler</b>. Drive it to sea and press <b>N</b> to shoot the gear. Over deep water (dark blue) it catches <b>fish</b>; dragged through the shallows it cuts <b>kelp</b>. The net slows you to about 12 knots. Shoals show as dark flickers under the water and kelp beds as olive fronds near the coast. Each 16×16 patch of sea has its own stock, shown in the boat panel. It breeds back fastest at half strength, and fished below a tenth it takes hours to recover. On a schedule the gear goes down on legs heading to a buoy and comes up for docks, so a ring of buoys over the grounds and a dock with chests makes an automatic fishery. Fish go to the <b>fishmeal plant</b> for meal and <b>fish oil</b>, or to the canning line. Kelp makes <b>sodium alginate</b>, and kelp ash makes <b>iodine</b> and potash.</p>
<h3>Boiler water</h3>
<p>Raw water is hard. Every boiler batch on it bakes a little chalk onto the tubes, steam output falls as the <b>scale</b> builds, and a fully choked boiler stops. Shut it down to <b>Descale</b> from its panel (a 20 second outage), or feed it <b>softened water</b>: run water through a leach tank with quicklime and the hardness settles out as crushed limestone you can send back to the kiln. Any machine that takes water also takes softened water.</p>
<h3>Sulfur and diesel</h3>
<p>The <b>Pressure reactor</b> hydrotreats gas oil with hydrogen into <b>diesel</b>, giving off hydrogen sulfide. Vented H₂S is a bad pollutant; a <b>Claus unit</b> with a little water turns it into sulfur and steam. Burn sulfur in a roaster for clean SO₂ to feed an acid plant. The <b>Diesel generator</b> gives up to 600 kW and burns fuel only for the power actually drawn. It runs on raw gas oil too, but then sends SO₂ up the exhaust.</p>
<h3>Fertilisers</h3>
<p>Pink-and-red <b>sylvinite</b> beds hold potash. Crush it and float it in a <b>Flotation cell</b> fed with brine: the KCl floats, the rock salt sinks. Sulfuric acid on crushed phosphate in the <b>Granulator drum</b> gives single superphosphate. In a leach tank it gives <b>phosphoric acid</b> plus gypsum, which makes triple superphosphate, or DAP with ammonia. The <b>Pressure reactor</b> turns ammonia and CO₂ into urea. DAP, potash and urea granulate together into NPK.</p>
<h3>Rail depot and orders</h3>
<p>Build a <b>Rail depot</b> and customers post up to three orders, each for something your factory can already make. Feed the goods in from touching belts, chests or machines, or load them by hand from the depot panel. Each filled order pays in parts and buildings. Every third order also brings a lab notebook from the buyer's own works (Haber ammonia first, then Ostwald nitric acid and the ammonia scrubber), or a repeat-custom bonus once you know them all, and bigger, better-paying customers turn up as you fill more.</p>
<h3>Smartphones</h3>
<p>Wash <b>barite</b> on spirals, roast it with coke to black ash, leach out barium sulfide and bubble CO₂ through it for <b>barium carbonate</b>. Fire it with titania into <b>barium titanate</b>. The <b>MLCC line</b> casts it into tape with PVB binder (from PVA and oxo butyraldehyde) and prints carbonyl nickel electrodes; co-fire the stacks in hydrogen. <b>Tantalum capacitors</b> are sintered tantalum pellets, anodised in phosphoric acid and filled with polypyrrole, made from wood by way of furfural and furan. For the battery, turn cobalt sulfate into carbonate, oxide and then <b>lithium cobalt oxide</b>; coat it on aluminium with PVDF in NMP in the <b>electrode coater</b>. PVDF comes from acetylene and HF through HFC-152a and HCFC-142b; NMP from butanediol and methylamine. The <b>ion exchange furnace</b> toughens fusion-drawn aluminosilicate glass in molten potassium nitrate. The <b>electronics assembly line</b> builds cameras, mainboards and finally the phone.</p>
<h3>MRI</h3>
<p>A <b>gas wellhead</b> stands on an oil seep like a pumpjack and flows raw natural gas. Wash out the H₂S and CO₂ with <b>MDEA</b> in a gas scrubber (send the H₂S to a Claus unit). The <b>nitrogen rejection unit</b> chills the sweet gas until methane liquefies, leaving nitrogen and <b>crude helium</b>; a second recipe in the same unit purifies it to 99.999%. The <b>helium liquefier</b> makes liquid helium at 4.2 K. Melt <b>niobium-titanium</b> in the vacuum furnace, draw it with copper into superconducting wire, and wind it into a magnet in the <b>magnet hall</b>. Add a copper gradient coil, an RF coil from the electronics line, a cryocooler with a gadolinium regenerator, two mainboards, and 40 units of liquid helium.</p>
<h3>Contrast agent</h3>
<p>Run rare earth chloride through the <b>gadolinium extraction</b> recipe in the solvent extraction plant and precipitate the oxalate (oxalic acid comes from carbon monoxide and caustic) to get <b>gadolinium oxide</b>. Build <b>cyclen</b> from TETA, glyoxal and dibromoethane, then add chloroacetic acid to get <b>DOTA</b>. Complex the gadolinium with DOTA and meglumine and fill it into vials.</p>
<h3>Watches</h3>
<p>The <b>flame fusion furnace</b> melts alumina powder in a hydrogen-oxygen flame: add chromium oxide green for <b>ruby</b> (cut into jewel bearings) or leave it pure for <b>sapphire</b> watch glass. The <b>hydrothermal autoclave</b> grows quartz from sand in hot soda solution; saw it into wafers and etch tuning forks on a wet bench. Silver oxide comes from silver nitrate and caustic, and <b>caustic potash</b> from potash in an electrolysis cell. The quartz movement is built on the electronics assembly line, and everything is cased in the <b>watchmaking atelier</b>.</p>
<p>A mechanical watch needs a <b>silicon hairspring</b>: etch a patterned wafer right through with SF₆ plasma in the CVD reactor, then oxidise it in the diffusion furnace. Melt the cobalt spring alloy in the vacuum furnace and roll it into mainsprings.</p>
<h3>Optics</h3>
<p>Split <b>lanthanum oxide</b> off the mixed rare earth chlorides in the solvent extraction plant. The <b>optical glass melter</b> stirs it with sand, boric acid and barium carbonate in a platinum crucible to make <b>crown glass</b>; titanium white, niobium oxide and potash make <b>flint glass</b>. The <b>lens grinding line</b> shapes blanks with silicon carbide and polishes them with cerium oxide. Cement a crown and a flint lens together in the <b>optics assembly room</b> for an achromatic doublet, and coat lenses with titanium dioxide and magnesium fluoride (from magnesium chloride and HF) in the <b>vacuum box coater</b>.</p>
<p>Telescope mirrors start as borosilicate blanks from the glass tank furnace, are figured on the grinding line and aluminised in the coater. Spectacle lenses are moulded from polycarbonate and given a TEOS hard coat. Microscopes, binoculars, telescopes, camera lenses and eyeglasses are put together in the assembly room.</p>
<h3>Insulin</h3>
<p>The <b>fermenter</b> grows E. coli on glucose syrup until each cell is packed with granules of proinsulin. The <b>high-pressure homogeniser</b> bursts the cells and spins out the <b>inclusion bodies</b>. In the <b>refolding tank</b> they are dissolved in urea and diluted into alkaline ultrapure water so the chains fold, then <b>trypsin</b> from methanol-fed Pichia yeast cuts out the C-peptide.</p>
<p>The <b>chromatography skid</b> needs a column loaded before it runs: <b>cation exchange resin</b> from styrene and sulfuric acid for capture, then <b>C8 silica</b> from TEOS, trichlorosilane and ethylene for the ethanol polish. Columns wear out and must be replaced. Zinc and citric acid crystallise the insulin in the precipitator, the sterile fill line puts it into vials and cartridges, and the <b>medical device line</b> makes pens and needles.</p>
<h3>Fuel cells</h3>
<p>In the pressure reactor, TFE reacts with sulfur trioxide from sulfuric acid and with HF to make the <b>PSEPVE</b> monomer, then copolymerises with more TFE into <b>PFSA precursor resin</b>. The <b>ionomer membrane line</b> extrudes it into film and turns it into acid with caustic potash and nitric acid. Platinum dissolved in aqua regia is reduced onto carbon black by hot ethylene glycol in the precipitator to make <b>platinum on carbon</b>.</p>
<p>The electrode coater sprays catalyst ink onto both sides of the membrane. The calender makes <b>gas diffusion layers</b> from carbon fibre, PTFE and carbon black. The <b>bipolar plate press</b> stamps stainless steel and coats it with carbon from acetylene. The <b>fuel cell stack line</b> presses membrane electrode assemblies, builds stacks, and fits them into forklifts and buses.</p>
<h3>Bicycles</h3>
<p>The <b>tube drawing mill</b> alloys aluminium with magnesium and silicon and draws it into butted <b>6061 tube</b>. The <b>frame welding shop</b> welds frames under argon, heat-treats them back to full strength and bakes on <b>powder coating</b> made in the paint disperser. The <b>bicycle component works</b> makes carburised chains, chromium-steel bearings, PTFE-lined cables and whole groupsets. The tyre press vulcanises <b>bicycle tyres</b>, and the <b>bicycle assembly line</b> laces wheels and builds commuter bikes, carbon road bikes and e-bikes.</p>
<h3>mRNA vaccines</h3>
<p>The fermenter grows E. coli carrying a <b>plasmid</b>, which the chromatography skid frees with caustic and purifies on ion exchange resin. The <b>IVT reactor</b> makes <b>nucleoside triphosphates</b> from yeast RNA and copies the plasmid into capped <b>mRNA</b> with T7 polymerase. A second chromatography step on <b>oligo-dT resin</b> keeps only full-length RNA. The pressure reactor makes the <b>ionisable lipid</b>, <b>DSPC</b> and <b>PEG lipid</b>, and the short-path still recovers <b>cholesterol</b> from fish oil.</p>
<p>The <b>microfluidic LNP mixer</b> combines lipids in ethanol with mRNA in acidic buffer to form nanoparticles. The ultrafiltration skid swaps them into sucrose buffer, the sterile fill line fills vials, and the <b>ultra-low freezer store</b> freezes them and packs them in dry ice shippers.</p>
<h3>Wool</h3>
<p>The <b>sheep station</b> grows greasy wool. The <b>wool scour</b> washes it in detergent and soda ash and spins out <b>lanolin</b>. The ring spinning frame combs the wool into <b>top</b>, the <b>superwash line</b> makes it machine-washable with chlorine and resin, and the frame spins it into <b>worsted yarn</b>. The dye range dyes it with an <b>acid dye</b> made in the pressure reactor, and the <b>flat knitting machine</b> knits jumpers and socks.</p>
<p>The pressure reactor saponifies lanolin to free its <b>cholesterol</b>, then adds a second double bond to make <b>7-dehydrocholesterol</b>. The <b>UV photoreactor</b> does what sunlight does in skin and opens it into <b>vitamin D3</b>, which the tablet line presses into supplements.</p>
<h3>Silk</h3>
<p>The farm grows <b>mulberry leaves</b>, which the <b>silkworm rearing house</b> turns into <b>cocoons</b>. The <b>stifling chamber</b> kills the pupae with hot air before the moths can cut the thread. The <b>reeling machine</b> unwinds several cocoons at once into <b>raw silk</b>, and the leftover pupae are pressed in the oil mill into oil and feed.</p>
<p>The dye range boils raw silk in soap and soda ash to remove the sericin gum. The <b>degumming liquor</b> goes to the ultrafiltration skid, which recovers <b>sericin</b> for cosmetics. The ring spinning frame throws the <b>degummed silk</b> into <b>organzine</b>, which the <b>jacquard loom</b> weaves into twill for printed scarves or, once dyed, into ties. The sterile fill line braids, coats and packs <b>silk sutures</b>.</p>
<h3>Tea</h3>
<p>The <b>tea estate</b> grows fresh leaf. The <b>withering trough</b> blows air through it until it goes limp. The <b>CTC machine</b> crushes, tears and curls it, and the leaf's own enzymes oxidise its catechins into theaflavins and thearubigins, turning it coppery. The <b>fluid bed dryer</b> stops the reaction and gives <b>black tea</b>.</p>
<p>The paper machine makes porous <b>tea bag paper</b> from long-fibre pulp and a little polypropylene, and the <b>tea bag machine</b> packs the tea. The brewhouse brews <b>tea liquor</b> for the bottling line to make iced tea. Steaming fresh leaf in the dryer kills the enzymes at once and gives <b>green tea</b>. The solvent extraction plant pulls <b>EGCG</b> out of it with ethyl acetate, with caffeine as a by-product, and the tablet line fills capsules.</p>
<h3>Manganese</h3>
<p>Wash black <b>manganese ore</b> on spirals. Smelt it with coke and limestone in the arc furnace for <b>ferromanganese</b>, then recharge the manganese-rich slag with quartz for <b>silicomanganese</b>; both go into steel. For chemicals, roast the ore with coke to green <b>MnO calcine</b>, leach it in acid and clean the liquor with raw ore, ammonia and hydrogen sulfide. The <b>manganese cell house</b> plates <b>electrolytic manganese</b> from it, or grows <b>EMD</b> on its anodes for <b>alkaline cells</b>. Fuse ore with caustic potash and air to green <b>potassium manganate</b> and oxidise it in an electrolysis cell to purple <b>permanganate</b>; the KOH comes back. Precipitate <b>Mn₃O₄</b> and fire it with iron oxide red and zinc oxide into <b>ferrite cores</b>. Melt steel with ferromanganese and quench it for <b>Hadfield steel</b> frogs and crusher jaws. Co-precipitate nickel, manganese and cobalt into <b>NMC precursor</b>, calcine it with lithium hydroxide in oxygen and build <b>NMC pouch cells</b>.</p>
<h3>Antimony</h3>
<p>Mine grey <b>stibnite ore</b> from veins in rocky ground and float it to <b>stibnite concentrate</b>. Roast it with a tight air supply and white <b>antimony trioxide</b> fumes off to the bag filters, the flame-retardant synergist for cables. For metal, throw steel scrap into molten concentrate in the <b>coreless induction furnace</b> (iron takes the sulfur) or reduce the oxide with coke. Alloy antimony with tin and copper into <b>babbitt</b> for <b>plain bearings</b>, or into lead-free <b>pewter</b>.</p>
<h3>Copper and nickel alloys</h3>
<p>The induction furnace stirs copper alloys as it heats them. Ten percent tin gives <b>tin bronze</b> for <b>bells</b>. Dissolve phosphorus in copper for <b>phosphor copper</b>, then use it to deoxidise <b>phosphor bronze</b> for <b>contact springs</b>. Copper with nickel, iron and manganese makes seawater-proof <b>cupronickel</b> for <b>condenser tubes</b>; with zinc and nickel it makes <b>nickel silver</b> for keys. Nickel with copper is acid-proof <b>monel</b>. In the vacuum furnace under argon, nickel and steel make <b>invar</b>, which barely expands, for LNG tank <b>membrane</b>; adding cobalt gives <b>kovar</b> for <b>glass-to-metal seals</b>; nickel and titanium make shape-memory <b>nitinol</b> for <b>superelastic wire</b>.</p>
<h3>Eggs and poultry</h3>
<p>Mix <b>layer feed</b> from maize, soybean meal and limestone grit in a compounding room; the limestone becomes eggshell. A <b>layer house</b> turns feed and water into eggs and litter and vents ammonia. The <b>egg grading station</b> washes, candles and boxes eggs in moulded pulp. The <b>egg breaking plant</b> splits eggs into pasteurised white and yolk, or liquid whole egg for the spray tower. Egg white is desugared with yeast and dried, or passed through an ion exchange column to catch lysozyme, a cheese preservative. Yolk, oil and vinegar go through the homogeniser as mayonnaise. The <b>eggshell membrane separator</b> floats off the membrane and leaves calcium carbonate. Breeder flocks lay hatching eggs for the <b>hatchery</b>; chicks grow in a <b>broiler house</b> and are processed at the meatpacking plant, and feathers are cooked under steam into feather meal.</p>
<h3>Bananas</h3>
<p>A <b>banana plantation</b> needs fertiliser and plenty of water and gives bunches and spent pseudostems; it can also grow abaca. The <b>banana packing station</b> cuts the hands off, bleeds the latex away in alum water and boxes them green. A <b>ripening room</b> doses the boxes with ethylene, the same hormone bananas make themselves, and vents the CO₂. Unripe bunches go to the continuous fryer for chips or a dryer for green banana flour; ripe ones go through a pulper-finisher to purée, jarred with ascorbic acid as baby food. The decorticator scrapes fibre from pseudostems for banana paper and from abaca for Manila rope and tea bag paper.</p>
<h3>Mushrooms</h3>
<p>The <b>wheat and straw</b> farm recipe bales straw alongside the grain. On the <b>compost wharf</b>, straw, brewers spent grain, gypsum and water heat up into phase I compost, venting ammonia; the <b>pasteurisation tunnel</b> steams it until the ammonia is gone. The <b>spawn laboratory</b> grows pure mycelium on sterilised wheat. In the <b>mushroom growing room</b>, compost, spawn and a casing of coco peat and limestone crop button mushrooms and leave spent compost, which goes back to the wharf to become fertiliser. The <b>trim and pack line</b> fills punnets and cuts off stem ends that a leach tank turns into fungal chitosan; the <b>UV-B pulse tunnel</b> gives mushrooms vitamin D. The <b>substrate bagging line</b> makes straw bags for oyster mushrooms, sterilised sawdust blocks for shiitake, and husk mouldings that mycelium binds into packaging.</p>
<h3>Bamboo</h3>
<p>A <b>bamboo grove</b> needs only water and is never replanted. The <b>bamboo strip mill</b> splits and planes culms into strips; the <b>steam carboniser</b> turns them amber, and the laminate press glues them into flooring with UF resin or crushes and presses them with phenolic resin into strand-woven decking. Soak whole culms in borax in a leach tank to get treated poles for scaffolding and, wrapped with linen yarn and epoxy, bike frames. The <b>bamboo charcoal kiln</b> makes charcoal for odour bags or steam activation, and its condenser catches bamboo vinegar, which settles into liquid smoke. Bamboo also cooks into dissolving pulp for viscose.</p>
<h3>Tomatoes</h3>
<p>Grow tomatoes in a <b>tomato field</b> or, at higher yield, a <b>glasshouse</b> fed with stone wool slabs and CO₂. The <b>hot-break tank</b> chops them into steam-heated pulp, and the <b>pulper-finisher</b> sieves it into juice, pushing out skins and seeds as pomace. Boil the juice down to paste in a juice evaporator. Make spirit vinegar from ethanol in the <b>acetator</b>, then blend paste, vinegar, sugar and salt into ketchup. Whole tomatoes go into food cans with juice and calcium chloride. Dry the pomace to separate seeds for tomato seed oil and skins for lycopene, extracted with supercritical CO₂ or ethyl acetate and packed into softgels.</p>
<h3>Sweeteners</h3>
<p>A <b>stevia field</b> grows sweet leaves. Steep them in a leach tank and pass the extract through the <b>resin adsorption column</b> with ethanol to get Reb A. For xylitol, hydrolyse bagasse or birch wood with dilute acid in a digester, clean the liquor in the <b>ion exchange column</b> with caustic and hydrochloric acid, hydrogenate it, and grow crystals in the <b>cooling crystalliser</b>. Ferment glucose syrup with oxygen into erythritol or phenylalanine broth and crystallise those too. Aspartame needs L-aspartic acid, made by isomerising maleic anhydride to fumaric acid and adding ammonia, joined to phenylalanine with methanol and a hydrogenation step. Aspartame goes into diet cola and sweetener tablets; xylitol and a PVA gum base make sugar-free gum.</p>
<h3>Castor</h3>
<p>A <b>castor field</b> grows oil-rich beans on soil with compound fertiliser and water. Press them in the oil mill and steam the toxic cake in a reactor before selling it as fertiliser. Castor oil has three routes. The <b>hydrogenator</b> saturates it with hydrogen into castor wax, which is split with hot water into 12-hydroxystearic acid and cooked with lithium hydroxide and gas oil into lithium grease. The <b>alkali fusion kettle</b> melts it with caustic soda into sebacate liquor, 2-octanol and hydrogen, which can feed the hydrogenator. Acidify the liquor for sebacic acid and polymerise it with hexamethylenediamine into nylon 6,10 for toothbrush bristles. For nylon 11, swap the glycerol for methanol, crack the ester in a tube furnace into methyl undecylenate and heptanal, add hydrogen bromide, then ammonia, polymerise, and draw fuel line from the <b>tube extruder</b>. Heptanal goes into perfume.</p>
<h3>Potatoes</h3>
<p>A <b>potato field</b> needs soil, compound fertiliser and water. The <b>steam peeler</b> flashes the skins off. Peeled potatoes go to the <b>continuous fryer</b>, which makes crisps with oil and salt, or par-fries chips and freezes them in liquid nitrogen. The <b>potato starch plant</b> rasps whole tubers into starch, pulp and fruit juice. Heat the juice with a little hydrochloric acid in a reactor to coagulate potato protein, and roast the starch with acid in the <b>dextrin roaster</b> for envelope gum. For vodka, ferment potatoes with malt and yeast, rectify the wash in a distillation column, then cut and charcoal-filter it at the bottling line. Peel and pulp feed an anaerobic digester.</p>
<h3>Sugarcane and rum</h3>
<p>Plant a <b>sugarcane field</b> on soil and water it. The <b>cane mill</b> crushes the stalks with a little water into cane juice and bagasse. Lime and steam in a juice evaporator clarify the juice into syrup and leave press mud. The <b>vacuum pan</b> boils syrup into raw sugar and molasses, and refines raw sugar into white sugar with lime, carbon dioxide and activated carbon. Ferment molasses (or cane juice) with yeast in a fermenter, then run the wash through a distillation column for cane spirit, or for fuel ethanol. Bottle the spirit as white rum, or age it in oak casks in a bonded warehouse for dark rum. Bagasse fires boilers, or a digester cooks it with caustic soda into pulp for the <b>pulp moulder</b> to press into compostable tableware.</p>
<h3>Meat and rendering</h3>
<p>Switch a <b>cattle ranch</b> to beef cattle and feed it maize, soybean meal and water. Each steer gives a carcass and a hide. The <b>meatpacking plant</b> breaks carcasses into boxed beef, bones and fat trimmings. The <b>rendering plant</b> cooks trimmings into tallow and meat and bone meal, and boils bones into degreased chips. Soak the chips in hydrochloric acid with lime in a leach tank to get ossein and dicalcium phosphate. Then extract the ossein with hot water in a reactor to make gelatin. The <b>starch mogul</b> turns gelatin, sugar and glucose syrup into gummy bears, and the <b>softgel encapsulator</b> wraps vegetable oil in gelatin and glycerol shells. Burn bones to ash in a lime kiln and fire the ash with clay and feldspar in a tunnel kiln for bone china. Tallow makes soap or biodiesel.</p>
<h3>Coconut</h3>
<p>The <b>coconut grove</b> needs good soil and water. The <b>copra dryer</b> needs no power: it husks and splits the nuts and dries the meat in the sun into copra, leaving husk and shell. Press copra in the oil mill. Refine the oil into jars in the edible oil refinery, or hydrogenate it to fatty alcohol. The decorticator turns husk into coir and coco peat, and the loom weaves coir into doormats. Char the shells in a lime kiln and activate the charcoal with steam in a gas producer.</p>
<h3>Oil palm</h3>
<p>The <b>oil palm estate</b> needs good soil, fertiliser and water. Fresh fruit bunches go to the <b>palm oil mill</b>, which sterilises and threshes them, presses the fruit into crude palm oil and POME, and cracks the nuts into kernels and shell. Kernels press into palm kernel oil in the oil mill. Activate kaolin with acid into bleaching earth, then refine crude oil in the <b>edible oil refinery</b> to RBD palm oil plus fatty acid distillate, and fractionate it into vegetable oil (olein) and stearin. Shell and empty bunches burn in boilers, and POME feeds the anaerobic digester.</p>
<h3>Agave</h3>
<p>The <b>agave field</b> needs no power and grows fastest in hot sun. Blue agave piñas are steamed in the <b>agave oven</b> and crushed in the <b>agave mill</b> into mosto and bagasse. Ferment the mosto with yeast, then run it twice through the <b>copper pot still</b>: once to ordinario and once to tequila spirit. Bottle it as blanco or rest it in oak casks in the bonded warehouse as reposado. Both passes leave hot acid <b>vinasse</b>, which the anaerobic digester turns into biogas. Bagasse burns in a boiler. Sisal leaves go through the <b>decorticator</b> for fibre, which the ring frame spins into baler twine.</p>
<h3>Cochineal and lac</h3>
<p>The <b>nopal cochineal farm</b> needs only water and sun, and runs fastest on desert sand. The <b>carmine works</b> boils the insects into carminic acid extract and precipitates it with alum and calcium chloride as <b>carmine</b>, which goes into <b>lipstick</b>. The <b>lac orchard</b> grows sticklac on good soil. The <b>lac factory</b> washes it into seedlac and makes <b>shellac</b>, either by melting it with steam or by dissolving it in ethanol, which gives twice the yield and vents a little alcohol. Shellac makes <b>French polish</b> and, on the <b>record press</b>, 78 rpm records.</p>
<h3>Vanilla</h3>
<p>The <b>vanilla shadehouse</b> grows green beans on soil from fertiliser and water. The <b>curing shed</b> scalds them with steam and sun-dries them into cured pods, faster in sunny country. The <b>Compounding room</b> steeps pods in ethanol for <b>vanilla extract</b>. For synthetic vanillin, the <b>hydroxylation reactor</b> turns phenol and peroxide into <b>catechol</b> and <b>hydroquinone</b>. The <b>vanillin plant</b> methylates catechol to <b>guaiacol</b>, condenses it with <b>glyoxylic acid</b> from a pressure reactor, and oxidises the product to <b>vanillin</b>. Ethanol in place of methanol leads to <b>ethyl vanillin</b>.</p>
<h3>Maple syrup</h3>
<p>A <b>sugarbush</b> on good soil taps maple sap with no inputs. The <b>sap RO unit</b> concentrates it, venting the permeate water. The <b>sugarhouse</b> burns pulpwood to boil the concentrate into hot maple syrup, or syrup into maple sugar. Jug the syrup in glass on the bottling line.</p>
<h3>Red seaweed</h3>
<p>A <b>seaweed farm</b> goes on light blue shallow water in the open sea and grows cottonii or gracilaria with no power or inputs. The <b>carrageenan plant</b> turns cottonii into semi-refined chips with caustic potash, or into refined carrageenan with potash, caustic potash and steam. The <b>agar plant</b> extracts agar from gracilaria with caustic soda and steam, and pours agar plates from agar, yeast and glass. Carrageenan, milk, cocoa powder and sugar make chocolate milk in the compounding room.</p>
<h3>Citrus</h3>
<p>The <b>citrus grove</b> grows oranges on good soil with NPK and water. The <b>juice extractor</b> gives orange juice, peel and d-limonene. Bottle juice in PET or concentrate it in the <b>juice evaporator</b>. The <b>peel processing plant</b> extracts pectin with nitric acid, steam and isopropanol (most of the isopropanol comes back out), or limes and dries peel into feed pellets. Limonene, LAS, caustic soda and water make citrus cleaner in the compounding room.</p>
<h3>Soybeans</h3>
<p>Grow <b>soybeans</b> on a farm with water alone. The <b>soybean crushing plant</b> uses hexane and steam to split them into soy meal and crude soy oil; degum the oil in a pressure reactor for vegetable oil and lecithin. The <b>tofu works</b> makes soy milk and okara, then curdles soy milk with magnesium chloride into <b>tofu</b>. Grow shoyu koji from soybeans and wheat in the koji room, ferment it in brine, press it in the sake press and bottle the <b>soy sauce</b>. Rice koji, soybeans and salt ferment into <b>miso</b>.</p>
<h3>Rice and sake</h3>
<p>The <b>rice paddy</b> needs good soil, NPK and plenty of water, and vents methane. The <b>rice mill</b> hulls paddy into brown rice and husk, then polishes brown rice into white rice and bran. Steam white rice in the <b>koji room</b>, then ferment koji, white rice, yeast and water in a fermenter into moromi. The <b>sake press</b> gives sake and sake lees; bottle the sake with glass. Press bran in the oil mill for rice bran oil, burn husks in a boiler for steam and ash, and dissolve the ash in caustic soda for sodium silicate.</p>
<h3>Flax, jute and linoleum</h3>
<p>The <b>flax field</b> gives flax straw and linseed from NPK. Soak straw in <b>retting tanks</b>, then the <b>scutching mill</b> splits it into line flax and tow. Line flax is wet-spun on the ring frame and woven into <b>linen</b>. Press linseed in the oil mill and blow the oil with oxygen and rosin in a pressure reactor for <b>linoleum cement</b>. Jute from a <b>jute field</b> is retted and woven into <b>hessian</b>. The <b>linoleum calender</b> presses cement, cork granules, wood flour, limestone and titanium white onto hessian.</p>
<h3>Cork</h3>
<p>A <b>cork oak montado</b> needs good soil and gives <b>cork bark</b> with no inputs. The <b>cork works</b> boils bark with water and steam into planks, then punches them into <b>natural cork stoppers</b>, washed with hydrogen peroxide. The punching waste, <b>cork granules</b>, goes to the <b>cork autoclave</b> with steam to make expanded cork insulation board.</p>
<h3>Olive oil</h3>
<p>An <b>olive grove</b> needs good soil and NPK. The <b>olive mill</b> turns olives and a little water into <b>extra virgin olive oil</b> and <b>pomace</b>; its vegetation water is dumped. Bottle the oil under nitrogen, or saponify it with caustic soda for <b>Castile soap</b>. The <b>pomace extraction plant</b> pulls crude pomace oil out with hexane and steam; refine it in a pressure reactor into vegetable oil. <b>Exhausted pomace</b> burns in a boiler like coal. <b>Olive curing vats</b> make table olives from raw olives, lye, salt and water.</p>
<h3>Natural rubber</h3>
<p>A <b>rubber estate</b> needs good soil and a little ammonia, and gives <b>field latex</b>. The <b>latex centrifuge</b> spins it to concentrate; its skim is dumped unless you find a use. Cure concentrate in a pressure reactor with sulfur, <b>zinc oxide</b> (burn zinc in the lime kiln) and <b>MBT</b> (aniline, carbon disulfide and sulfur), then the <b>glove dipping line</b> turns it into gloves. Or clot field latex with acetic acid in a <b>coagulating trough</b> and dry the sheets in a <b>smokehouse</b> to make tyres from natural rubber.</p>
<h3>Honey and beeswax</h3>
<p>The <b>apiary</b> works best on good soil, with a little sugar for winter feed, and gives capped frames of honey plus some <b>propolis</b>. The <b>honey extraction room</b> slices off the wax cappings and spins out <b>raw honey</b>, which the bottling line jars. The <b>wax melter</b> renders the cappings into <b>beeswax</b>. The workshop pours candles from it, and the tube filler blends it with lanolin from the wool scour and vegetable oil into <b>lip balm</b>.</p>
<p>The fermenter turns honey and water into <b>mead</b> for the bottling line. The blender soaks propolis in ethanol to make a <b>tincture</b>.</p>
<h3>Displays</h3>
<p>Leach <b>zinc calcine</b> in hot strong acid to get indium liquor, extract it, cement it onto aluminium and electrorefine it. Co-precipitate <b>ITO powder</b> with tin and sinter it into a <b>target</b>, which wears out in the <b>sputter line</b> like a catalyst. The <b>fusion draw tower</b> makes alkali-free <b>display glass</b>. Coat it with molybdenum and silane films in the CVD reactor, pattern it with a photomask and sputter pixel electrodes to make the <b>backplane</b>. The <b>colour filter line</b> needs copper phthalocyanine blue, its chlorinated green, DPP red from chlorobenzonitrile and succinate, and carbon black. <b>Liquid crystals</b> start from aniline: diazotise it in HF to fluorobenzene, brominate, make the boronic acid with magnesium and trimethyl borate, and couple over palladium. Recover bromine from the HBr with chlorine. Seal the cell, add polarisers, driver chips and an LED backlight, and build televisions.</p>
<h3>Microchips</h3>
<p>A wafer from the Czochralski puller passes through seven fab tools. The <b>Wet bench</b> cleans and etches, the <b>Diffusion furnace</b> grows oxide and anneals, the <b>Stepper</b> prints the pattern (it needs a <b>Photomask</b> loaded like a catalyst, which hazes and wears out), the <b>Ion implanter</b> dopes with boron, the <b>CVD reactor</b> lays tungsten and the <b>Plating and CMP tool</b> inlays copper wiring. The <b>Chip assembly line</b> saws the finished wafer into dies and packages them. Most steps need <b>ultrapure water</b> from a reverse osmosis plant and dump rinse water that must be treated.</p>
<h3>Jet engines</h3>
<p><b>Coltan</b> is found in hot, wet forest and grassland. Wash it on a spiral, digest the concentrate in HF and acid, and split tantalum from niobium by solvent extraction. Potash crystallises <b>K₂TaF₇</b>, which sodium reduces to <b>tantalum powder</b>; ammonia and a thermite burn give <b>niobium</b>. Switch a moly roaster to rhenium recovery with a water scrub to collect <b>perrhenic acid</b>, then make <b>ammonium perrhenate</b> and reduce it with hydrogen. The <b>vacuum induction furnace</b> melts single-crystal superalloy, Inconel 718 and Ti-6Al-4V. Lost-wax casting runs from wax patterns through the <b>shell room</b> and a steam dewax in the autoclave to the <b>DS furnace</b>, which grows each blade as one crystal. The <b>EB-PVD coater</b> adds a NiCrAlY bond coat and a YSZ thermal barrier. The <b>forge press</b> makes discs and fan blades, and the <b>engine assembly hall</b> puts it all together with an ECU as the engine controller.</p>
<h3>Catalysts and vanadium</h3>
<p>The <b>Acid plant</b> and the <b>Ammonia converter</b> have a catalyst bed. Empty, the acid plant runs as a slow lead chamber; loaded with <b>V₂O₅ catalyst rings</b> it becomes a Contact plant at up to 2.5× speed. Fused iron catalyst doubles a Haber converter. Each charge lasts a few hundred batches and loses activity in its last third, and the bed holds four charges. Vanadium comes from the iron in ilmenite: blow that pig iron in a converter to skim off vanadium slag, salt-roast it with soda ash, leach with Solvay ammonium chloride and calcine. Spent rings leach back with caustic. V₂O₅ reduced with aluminium into steel gives <b>vanadium steel</b> for armour walls.</p>
<h3>Arms and armour</h3>
<p>A workshop loads <b>AP cartridges</b> with a tungsten carbide core in a copper jacket. They do double damage, and four times as much to armoured brutes and burrow queens. A <b>pump shotgun</b> fires <b>shotshells</b> of lead shot in a polyethylene hull: the cone hits up to six crawlers at short range. Press <b>X</b> to switch. <b>Powder charges</b> and <b>ammonal charges</b> are quarry blasting tins: press <b>G</b> to throw one at the mouse. Underground the blast only reaches what it can see.</p>
<p>Burrows come in three kinds. An ordinary <b>crawler burrow</b>; a <b>brimstone burrow</b> dug through native sulfur, with rich yellow veins and pools of sulfuric acid where crawler waste has soaked into pyrite (pyrite oxidising in water really does make sulfuric acid, the same chemistry as acid mine drainage), so stay out of the pools; and on tier 2 ground and beyond, a <b>deep burrow</b> that runs further, with more caches and a bigger queen. Pale <b>egg clutches</b> hatch a crawler every few seconds while you are close and in sight: shoot them first.</p>
<p>Far from the landing site stand the headframes of <b>infested mines</b>. Ride the cage down into shotcrete roadways and rooms: storerooms, lamp rooms, drift headings, crusher chambers, shift offices and pump stations. Every room has a miner's locker. The farthest one is the <b>shift boss's safe</b>, which holds the key to the blast door of the old pump hall. Behind it waits the <b>brood tyrant</b>: it winds up, then charges in a straight line and is stunned when it hits a wall, so sidestep and shoot it while it reels. Below half health it sprays acid in a ring. Kill it to open the strongbox. The mine is capped once the tyrant is dead and every chest is empty.</p>
<p>Three more kinds of dungeon lie out in the wild. <b>Lava tubes</b> open among bare rock: tunnels left when the crust of a basalt flow froze and the molten core drained away. Fumaroles still line their walls with sulfur, gypsum and pyrite, and the floor is broken by pools of lava that burn you badly. Their <b>ember queen</b> spits a fan of burning globs that leave flames on the floor. <b>Ice caves</b> are meltwater channels under glaciers in the tundra and the mountains. Patches of glare ice make you slide, so you keep going after you let go of the keys, and pools of near-freezing meltwater chill you and slow you down. Tin and tungsten veins run through the granite, and the <b>frost queen</b> spits ice that chills you too. <b>Ammonia works</b> are wrecked Haber-Bosch plants. Some rooms still leak ammonia from cracked lines: close the red valve on the wall with F, or wear an <b>ammonia respirator</b> (a half-mask with acid-treated activated carbon cartridges, made at a workshop). Without one the gas burns your eyes and lungs fast. The plant manager's safe holds the key to the synthesis hall, where a <b>broodmother</b> burrows under the cracked floor and surfaces in a shower of acid. Watch the red ring and step away from it.</p>
<p>Any vest in your pack takes part of every bite. A <b>shell vest</b> is crawler shell laced on steel. A <b>steel plate vest</b> sews plate into woven nylon. The <b>ceramic plate carrier</b> is the best: silicon carbide tiles, sintered with a little carbon, backed with <b>UHMWPE fibre</b>. That fibre starts with a <b>Ziegler catalyst</b> made from TiCl₄ on magnesium chloride with triethylaluminium. Run cold with only ethylene, it grows chains of millions of carbons. The powder is dissolved in hot base oil, spun as a gel and drawn out a hundred times, which makes it fifteen times stronger than steel for its weight.</p>
<h3>Crawlers</h3>
<p>Crawler hives sit in the wilds. The crawlers' gut bacteria live on sulfur, so hives breathe in the smog that drifts to them and send swarms at whatever vented last. They chew through anything in their path except belts, and every eighth swarm founds a new nest closer to the smog. Nests that keep eating grow into hives and then brood mounds, which keep more guards and send bigger swarms. As crawlers evolve they hatch acid-spitting and armoured brute forms. Wrecked hives give crawler shell: dissolve the chalk out with hydrochloric acid to get chitin, then boil it in caustic soda for chitosan, which wineries and waterworks buy as a fining agent and flocculant. The cleaner you run, the hungrier they stay. Gun turrets need lead shot cartridges, made from Chilean nitrate, sulfur and coal. Brick and concrete walls buy the guns time.</p>
</div>`;

let cGrp = 'Logistics', cSig = '', iQ = '', cQ = '';
const kindOf = k => { const B = BUILD[k]; return B ? B.kind + (B.kind === 'machine' ? B.w + 'x' + B.h : '') : 'part'; };
const CGROUPS = [...CATS.map(c => ({ id: c, n: c, ks: Object.keys(BUILD).filter(t => BUILD[t].cat === c && BUILD[t].cost) })), { id: 'Parts', n: 'Intermediates', ks: PARTS.filter(k => !/^sci/.test(k)) }, { id: 'Science', n: 'Science', ks: ['rlab', 'sci1', 'sci2', 'sci3', 'sci4', 'sci5', ...XPK] }, { id: 'Combat', n: 'Combat', ks: CMB.slice() }];
for (const g of CGROUPS) { const o = [...new Set(g.ks.map(kindOf))]; g.ks.sort((a, b) => o.indexOf(kindOf(a)) - o.indexOf(kindOf(b))); }
const craftCost = k => BUILD[k] ? BUILD[k].cost : RECIPE[k].i;
const craftMakes = k => BUILD[k] ? BUILD[k].makes || 1 : RECIPE[k].o[k];
function craftTime(k) { if (BUILD[k]) { let s = 0; for (const q in BUILD[k].cost) s += BUILD[k].cost[q]; return Math.min(4, 0.5 + 0.04 * s); } return Math.max(0.3, (RECIPE[k].t || 1) * 0.5); }
function planCraft(cost, n, inv, steps, d) {
  for (const k in cost) {
    const need = cost[k] * n, have = inv[k] || 0;
    if (have >= need) { inv[k] = have - need; continue; }
    if (!PARTS.includes(k) && !CMB.includes(k) || d > 4 || !techOk(k)) return false;
    const r = RECIPE[k], runs = Math.ceil((need - have) / r.o[k]);
    inv[k] = 0;
    if (!planCraft(r.i, runs, inv, steps, d + 1)) return false;
    steps.push({ k, runs });
    inv[k] = (inv[k] || 0) + runs * r.o[k] - (need - have);
  }
  return true;
}
function maxCraft(k) {
  if (!gate(k)) return 0;
  const cost = craftCost(k), ok = n => planCraft(cost, n, Object.assign({}, S.inv), [], 0);
  if (!ok(1)) return 0;
  let lo = 1, hi = 2;
  while (hi <= 4096 && ok(hi)) { lo = hi; hi *= 2; }
  if (hi > 4096) return lo;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (ok(m)) lo = m; else hi = m; }
  return lo;
}
function enqueue(k, n) {
  if (!gate(k)) return toast(lockMsg(k), true);
  const inv = Object.assign({}, S.inv), steps = [];
  if (!(n > 0) || !planCraft(craftCost(k), n, inv, steps, 0)) return toast('Not enough materials', true);
  const ref = {};
  for (const q of new Set([...Object.keys(S.inv), ...Object.keys(inv)])) {
    const d = (S.inv[q] || 0) - (inv[q] || 0);
    if (d) ref[q] = d;
    if (inv[q] > 0) S.inv[q] = inv[q]; else delete S.inv[q];
  }
  if (!S.cq) S.cq = [];
  const g = S.cq.reduce((m, e) => Math.max(m, e.g), 0) + 1;
  for (const st of steps) S.cq.push({ k: st.k, n: st.runs * RECIPE[st.k].o[st.k], t: craftTime(st.k) * st.runs, el: 0, g, sub: 1 });
  S.cq.push({ k, n: n * craftMakes(k), t: craftTime(k) * n, el: 0, g, ref });
  cSig = ''; renderQueue(); renderModal(); renderHotbar();
}
function doCraft(t, n) { enqueue(t, n); }
function doPart(id, n) { enqueue(id, n); }
function cqStep(dt) {
  const e = S.cq[0];
  e.el += dt;
  if (e.el < e.t) return;
  S.cq.shift();
  if (!e.sub) { give(e.k, e.n); qbAdd(e.k); cSig = ''; renderHotbar(); }
}
function cqCancel(i) {
  const e = S.cq[i];
  if (!e) return;
  const f = S.cq.find(x => x.g === e.g && x.ref);
  S.cq = S.cq.filter(x => x.g !== e.g);
  if (f) for (const q in f.ref) { const v = (S.inv[q] || 0) + f.ref[q]; if (v > 0) S.inv[q] = v; else delete S.inv[q]; }
  cSig = ''; toast('Crafting cancelled, ingredients returned'); renderQueue(); renderHotbar();
}
const cqEl = document.createElement('div'); cqEl.id = 'cq'; $('#stage').appendChild(cqEl);
let cqSig = '';
function renderQueue() {
  const q = S.cq || [], key = q.slice(0, 18).map(e => e.k + ':' + e.n + (e.sub ? 's' : '') + e.g).join() + '|' + q.length;
  if (key !== cqSig) {
    cqSig = key;
    cqEl.innerHTML = q.slice(0, 18).map((e, i) => `<button class="cqs${e.sub ? ' sub' : ''}" data-cq="${i}" data-k="${e.k}" data-m="q">${ico(e.k)}<span class="cnt">${e.n}</span>${i === 0 ? '<i class="cqb"></i>' : ''}</button>`).join('') + (q.length > 18 ? `<span class="more">+${q.length - 18}</span>` : '');
  }
  if (ftipEl && !ftipEl.isConnected && !ftip.hidden) { ftip.hidden = true; ftipK = ''; ftipEl = null; }
  const b = cqEl.querySelector('.cqb');
  if (b && q[0]) b.style.width = Math.min(100, q[0].el / q[0].t * 100) + '%';
}
cqEl.addEventListener('click', ev => { const b = ev.target.closest('[data-cq]'); if (b) cqCancel(+b.dataset.cq); });
const ftip = document.createElement('div'); ftip.id = 'ftip'; ftip.hidden = true; document.body.appendChild(ftip);
let ftipK = '', ftipEl = null;
function tipHtml(k, m) {
  if (m === 'x') { const r = RECIPE[k]; return `<div class="fth">${ico(rMain(r))}<b>${r.n || nm(rMain(r))}</b><span>${r.t} s</span></div><div class="ftb">${recipeHtml(r)}</div>`; }
  const B = BUILD[k];
  let h = `<div class="fth">${ico(k)}<b>${nm(k)}</b>${m === 'r' ? '<span>Recipe</span>' : m === 'q' ? '<span>Crafting</span>' : ''}</div><div class="ftb">`;
  if (m === 'r') {
    if (!gate(k)) h += `<p class="bad">${lockMsg(k)}</p>`;
    const c = craftCost(k);
    h += '<div class="ftl">Ingredients</div>' + Object.keys(c).map(q => { const hv = S.inv[q] || 0; return `<div class="fti${hv >= c[q] ? '' : PARTS.includes(q) ? ' sub' : ' no'}">${ico(q)}<span>${c[q]} × ${nm(q)}</span><em>${fmt(hv)}</em></div>`; }).join('');
    if (Object.keys(c).some(q => (S.inv[q] || 0) < c[q] && PARTS.includes(q))) h += '<p class="warn">Missing parts in yellow are hand-crafted first, automatically.</p>';
    h += `<div class="ftl">Crafting time <b>${craftTime(k).toFixed(1)} s</b> · makes <b>${craftMakes(k)}</b></div>`;
    if (B && B.kw) h += `<div class="ftl">Power <b>${B.kw} kW</b></div>`;
    if (B) h += `<p>${B.d}</p>`;
    h += `<div class="ftk">Click: craft 1 · Right-click: craft 5 · Shift-click: craft all (${maxCraft(k)})</div>`;
  } else if (m === 'q') h += '<p>Click to cancel this craft. The ingredients go back into your inventory.</p>';
  else {
    h += `<div class="ftl">In inventory <b>${fmt(S.inv[k] || 0)}</b></div><p>${B ? B.d : ITEMS[k] ? ITEMS[k].f || '' : ''}</p>`;
    if (MADE[k]) h += `<div class="ftl">Made in</div><p class="dim">${[...MADE[k]].slice(0, 6).join(', ')}</p>`;
    if (USED[k]) h += `<div class="ftl">Used in</div><p class="dim">${[...USED[k]].slice(0, 8).join(', ')}${USED[k].size > 8 ? ' and ' + (USED[k].size - 8) + ' more' : ''}</p>`;
    if (B) h += '<div class="ftk">Click: take into hand · Drag onto a quickbar slot · Right-click a quickbar slot to clear it</div>';
  }
  return h + '</div>';
}
document.addEventListener('mousemove', ev => {
  const el = ev.target.closest && ev.target.closest('[data-k]');
  if (!el) { if (!ftip.hidden) { ftip.hidden = true; ftipK = ''; } return; }
  const key = el.dataset.k + el.dataset.m;
  ftipEl = el;
  if (key !== ftipK) { ftipK = key; ftip.innerHTML = tipHtml(el.dataset.k, el.dataset.m); ftip.hidden = false; }
  const r = ftip.getBoundingClientRect();
  let x = ev.clientX + 18, y = ev.clientY + 18;
  if (x + r.width > innerWidth - 8) x = ev.clientX - r.width - 14;
  if (y + r.height > innerHeight - 8) y = Math.max(8, innerHeight - r.height - 8);
  ftip.style.left = x + 'px'; ftip.style.top = y + 'px';
});
document.addEventListener('click', () => { ftipK = ''; }, true);
let eSel = null, eSig = '';
function renderEquip(body) {
  const P = S.pl, A = P.arm, n = A && ARMOR[A.k].g;
  const sig = JSON.stringify([A && A.k, A && A.g, eSel, Object.keys(ARMOR).concat(Object.keys(EQ)).map(k => S.inv[k] || 0)]);
  if (body.querySelector('#eview') && sig === eSig) return eqDyn();
  eSig = sig;
  if (eSel && !(S.inv[eSel] > 0)) eSel = null;
  const st = k => { const E = EQ[k]; return E.gen ? `+${E.gen} W` : E.cap ? `${E.cap / 1000} kJ` : E.fc ? `+${E.fc} W on ${k === 'sofc_pack' ? 'methane' : 'methanol'}` : E.a ? `+${E.a * 100}% armour` : k === 'coil_turret' ? '2.5 kJ a shot' : k === 'discharge_ring' ? '8 kJ a pulse' : k === 'med_injector' ? `+80 health (${S.inv.hemostat || 0} hemostats)` : k === 'thermal_sight' ? '+25% gun range, −20 W' : k === 'arm_brace' ? '20% faster fire, −80 W' : E.use ? `−${E.use} W` : k === 'aero_liner' ? 'halves heat and cold' : '250 J a shot'; };
  let h = '<div id="eview"><section class="cpane"><div class="ctop"><b>Worn armour</b></div>';
  h += A ? `<div class="eworn">${ico(A.k)}<div><b>${nm(A.k)}</b><div class="dim">${n ? n + '×' + n + ' grid' : 'No equipment grid'}</div></div><button class="rs ok ebtn" data-eqoff="1">Take off</button></div>` : '<div class="dim">Nothing worn. Click an armour below to put it on.</div>';
  const ar = Object.keys(ARMOR).filter(k => S.inv[k] > 0);
  h += '<div class="sec">Armour in your pack</div><div class="elist">' + (ar.length ? ar.map(k => `<button class="rs ok" data-eqa="${k}" data-k="${k}" data-m="i">${ico(k)}<span class="cnt">${S.inv[k]}</span></button>`).join('') : '<span class="dim">None. Craft some under Combat.</span>') + '</div>';
  h += '<div class="sec">Modules in your pack</div><div class="elist">';
  const ms = Object.keys(EQ).filter(k => S.inv[k] > 0);
  h += ms.length ? ms.map(k => `<button class="rs ok${eSel === k ? ' on' : ''}" data-eqm="${k}" data-k="${k}" data-m="i">${ico(k)}<span class="cnt">${S.inv[k]}</span></button>`).join('') : '<span class="dim">None. Craft modules under Combat.</span>';
  h += '</div><div id="estat"></div></section><section class="cpane"><div class="ctop"><b>Equipment grid</b></div>';
  if (n) {
    const cs = Math.min(40, Math.floor(400 / n));
    h += `<div class="egrid" style="width:${cs * n}px;height:${cs * n}px;background-size:${cs}px ${cs}px">`;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) h += `<div class="ecell" data-ex="${x}" data-ey="${y}" style="left:${x * cs}px;top:${y * cs}px;width:${cs}px;height:${cs}px"></div>`;
    A.g.forEach((m, i) => { const E = EQ[m.k]; h += `<div class="emod" data-eqr="${i}" data-k="${m.k}" data-m="i" style="left:${m.x * cs}px;top:${m.y * cs}px;width:${E.w * cs}px;height:${E.h * cs}px;background:${ITEMS[m.k].c}">${ico(m.k)}</div>`; });
    h += '</div><div class="dim">' + (eSel ? `Click a cell to fit the ${nm(eSel)} (${EQ[eSel].w}×${EQ[eSel].h}, ${st(eSel)}) with its top left corner there.` : 'Pick a module on the left, then click the grid. Click or right click a fitted module to take it out.') + '</div>';
  } else h += '<div class="dim">This armour has no grid. Wear a Modular Plate Carrier or an Exoframe to fit modules.</div>';
  h += '</section></div>';
  body.innerHTML = h;
  eqDyn();
}
function eqDyn() {
  const el = $('#estat');
  if (!el) return;
  const P = S.pl, A = P.arm, cap = eqCap();
  let h = `<div class="sec">Effects</div><div class="gauge"><span>Armour</span>${bar(armRed(), 1, '#7fb0e0')}<b>${Math.round(armRed() * 100)}%</b></div>`;
  if (cap) {
    h += `<div class="gauge"><span>Energy</span>${bar(A.en || 0, cap, '#e0d04a')}<b>${Math.round((A.en || 0) / 1000)} kJ</b></div>`;
    const gen = eqN('pv_film') * EQ.pv_film.gen + eqN('tandem_film') * EQ.tandem_film.gen, fc = eqN('dmfc') * EQ.dmfc.fc, so = eqN('sofc_pack') * EQ.sofc_pack.fc;
    h += `<div class="dim">Solar ${gen} W${fc ? ` · fuel cell ${fc} W (${S.inv.meoh_cart || 0} cartridges)` : ''}${so ? ` · SOFC ${so} W (${S.inv.cng_cart || 0} methane)` : ''} · walk ×${eqSpd().toFixed(1)} · mine ×${eqMine()}${eqN('sentry_arm') ? ` · sentry ${S.inv.cartridge || 0} cartridges` : ''}</div>`;
  }
  if (el.innerHTML !== h) el.innerHTML = h;
}
function renderCraft(body) {
  if (!body.querySelector('#cview')) {
    modalHtml = '';
    body.innerHTML = `<div id="cview"><section class="cpane"><div class="ctop"><b>Character</b><input id="isearch" placeholder="Search inventory" spellcheck="false"></div><div id="islots"></div><div id="iinfo" class="dim"></div></section><section class="cpane"><div class="ctop"><b>Crafting</b><input id="csearch" placeholder="Search recipes" spellcheck="false"></div><div id="cgroups"></div><div id="crecs"></div><div class="dim">Click a recipe to queue it. Parts you lack are hand-crafted first. The queue runs at the bottom left of the screen; click an entry there to cancel it.</div></section></div>`;
    $('#isearch').value = iQ; $('#csearch').value = cQ;
    cSig = '';
  }
  const sig = cGrp + '|' + iQ + '|' + cQ + '|' + Object.entries(S.inv).join(';') + '|' + Object.keys(S.unl || {}).length + '|' + Object.keys(S.tech || {}).length;
  if (sig === cSig) return;
  cSig = sig;
  const iq = iQ.toLowerCase(), cq = cQ.toLowerCase();
  const ks = Object.keys(S.inv).filter(k => S.inv[k] >= 1 && (ITEMS[k] || BUILD[k]) && (!iq || nm(k).toLowerCase().includes(iq))).sort((a, b) => (ORD[a] ?? 1e9) - (ORD[b] ?? 1e9));
  let h = '', used = 0;
  for (const k of ks) {
    let n = Math.floor(S.inv[k]);
    const sz = stk(k);
    while (n > 0) { const c = Math.min(sz, n); n -= c; used++; if (used <= 400) h += `<div class="slot" data-k="${k}" data-m="i"${BUILD[k] ? ` data-pick="${k}" draggable="true"` : ''}>${ico(k)}<span class="cnt">${fmt(c)}</span></div>`; }
  }
  for (let i = used; i < Math.max(80, Math.ceil(Math.min(used, 400) / 10) * 10); i++) h += '<div class="slot e"></div>';
  $('#islots').innerHTML = h;
  $('#iinfo').textContent = `${used} slots used · ${ks.length} kinds of item${used > 400 ? ' · first 400 slots shown' : ''}`;
  $('#cgroups').innerHTML = CGROUPS.map(g => { const any = cq && g.ks.some(k => nm(k).toLowerCase().includes(cq)); return `<button class="cg${g.id === cGrp && !cq ? ' on' : ''}${cq && !any ? ' dimg' : ''}" data-grp="${g.id}">${ico(g.id === 'Parts' ? 'motor' : g.id === 'Science' ? 'sci1' : g.ks[0], 1)}<span>${g.n}</span></button>`; }).join('');
  const g = CGROUPS.find(x => x.id === cGrp) || CGROUPS[0];
  const list = cq ? CGROUPS.flatMap(x => x.ks).filter(k => nm(k).toLowerCase().includes(cq)) : g.ks;
  let rows = '', prev = null;
  for (const k of list) {
    const B = BUILD[k], sub = kindOf(k);
    if (!cq && prev !== null && sub !== prev) rows += '<div class="rbrk"></div>';
    prev = sub;
    const lk = !gate(k), mx = lk ? 0 : maxCraft(k);
    rows += `<button class="rs ${lk ? 'lk' : mx ? 'ok' : 'no'}" ${B ? `data-craft="${k}"` : `data-part="${k}"`} data-n="1" data-k="${k}" data-m="r">${ico(k)}${mx ? `<span class="cnt">${mx > 999 ? '999+' : mx}</span>` : ''}${lk ? '<span class="lock">🔒</span>' : ''}</button>`;
  }
  $('#crecs').innerHTML = rows || '<div class="dim" style="grid-column:1/-1">No recipe matches.</div>';
}

function plBlock(t, x, y) {
  const B = BUILD[t], P = S.pl;
  if (!inReach(x + B.w / 2, y + B.h / 2, REACH)) return 'Out of reach. Walk closer.';
  if (B.kind === 'belt' || (B.kind === 'pipe' && !B.ug) || B.kind === 'road' || B.kind === 'rail') return null;
  if (P.x + PL_R > x && P.x - PL_R < x + B.w && P.y + PL_R > y && P.y - PL_R < y + B.h) return 'You are standing there';
  return null;
}
function placeAt(fx, fy) {
  if (BUILD[tool].kind === 'vehicle') { const r = placeCar(tool, fx, fy, toolDir); if (typeof r !== 'string') { if (!(S.inv[tool] > 0)) tool = null; renderHotbar(); } return r; }
  if (BUILD[tool].kind === 'train') { const r = placeTrain(tool, fx, fy, toolDir); if (typeof r !== 'string') { if (!(S.inv[tool] > 0)) tool = null; renderHotbar(); } return r; }
  const o = toolOrigin(tool, fx, fy);
  const pb = plBlock(tool, o.x, o.y);
  if (pb) return pb;
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
    if (BUILD[tool].kind === 'belt') {
      toolDir = d;
      const prev = drag.last && ents.get(drag.last);
      if (prev && kind(prev) === 'belt' && prev.dir !== d) { prev.dir = d; L = null; }
    }
    drag.x += DX[d]; drag.y += DY[d];
    if (!tool) break;
    if (plBlock(tool, drag.x, drag.y)) continue;
    const r = place(tool, drag.x, drag.y, toolDir);
    drag.last = typeof r === 'string' ? null : r.id;
    if (!(S.inv[tool] > 0)) { tool = null; break; }
  }
  renderHotbar();
}

cv.addEventListener('contextmenu', ev => ev.preventDefault());
cv.addEventListener('mousedown', ev => {
  updateMouse(ev);
  if (ev.button === 1) { mouse.m = true; camFree = true; mouse.px = ev.clientX; mouse.py = ev.clientY; ev.preventDefault(); return; }
  if (ev.button === 2) {
    mouse.r = true;
    if (!S.dg && !tool && (ev.shiftKey || ev.ctrlKey || ev.metaKey)) {
      const e = at(mouse.tx, mouse.ty);
      if (e && BUILD[e.type].cost) {
        if (ev.shiftKey) copySet(e);
        else if (!entReach(e, REACH)) toast('Out of reach. Walk closer.', true);
        else quickFill(e);
      }
      return;
    }
    if (S.dg) return;
    const vc = carAt(mouse.fx, mouse.fy);
    if (vc) return pickCar(vc);
    const tc = trainAt(mouse.fx, mouse.fy);
    if (tc) return pickTrain(tc);
    const e = at(mouse.tx, mouse.ty);
    if (e && kind(e) === 'hive') toast('Hives cannot be picked up. Shoot or gas them.', true);
    else if (e && kind(e) === 'ruin') toast(e.type === 'burrow' ? 'A burrow cannot be moved. Click it to climb down.' : e.type === 'infested' ? 'A mine headframe cannot be moved. Click it to ride the cage down.' : XDG[e.type] ? 'That is part of the landscape now. Click it to go in.' : 'The old works are too far gone to move. Click to search them.', true);
    else if (e && !entReach(e, REACH)) toast('Out of reach. Walk closer.', true);
    else if (e && kind(e) === 'rail' && railBusy(e)) toast('A train is standing on this track.', true);
    else if (e) { removeEnt(e); renderHotbar(); }
    else if (tool) { tool = null; renderHotbar(); }
    return;
  }
  if (ev.button !== 0) return;
  mouse.l = true;
  if (S.dg) { if (tool) { tool = null; renderHotbar(); } const p = dgPos(mouse.x, mouse.y); dgClick(p.fx, p.fy); return; }
  if (tool) {
    const r = placeAt(mouse.fx, mouse.fy);
    if (typeof r === 'string') { toast(r, true); return; }
    if (BUILD[r.type] && !BUILD[r.type].ug && ['belt', 'pipe', 'wall', 'road', 'rail'].includes(BUILD[r.type].kind)) drag = { x: r.x, y: r.y, last: r.id };
    return;
  }
  const vc = carAt(mouse.fx, mouse.fy);
  if (vc) { openCar(vc); return; }
  const tc = trainAt(mouse.fx, mouse.fy);
  if (tc) { openTrain(tc); return; }
  const e = at(mouse.tx, mouse.ty);
  if (e && ev.shiftKey && kind(e) === 'pole') { const s = sel && ents.get(sel); if (s && s !== e && kind(s) === 'pole') { const [m, bad] = wireToggle(s, e); toast(m, bad); renderPanelDyn(); return; } }
  if (e && ev.shiftKey && clip && kind(e) !== 'pole') { pasteSet(e); return; }
  if (e && (ev.ctrlKey || ev.metaKey) && (e.out || e.store)) { if (!entReach(e, REACH)) toast('Out of reach. Walk closer.', true); else quickTake(e); return; }
  if (e && kind(e) !== 'road' && kind(e) !== 'rail') { openPanel(e); return; }
  closePanel();
  if (S.pl.car) return toast('Get out of the vehicle to mine (F).', true);
  const i = mouse.ty * W + mouse.tx;
  if (mouse.tx >= 0 && mouse.ty >= 0 && mouse.tx < W && mouse.ty < H && (solid(i) || choppable(i))) {
    if (inReach(mouse.tx + 0.5, mouse.ty + 0.5, MINE_REACH)) mining = { x: mouse.tx, y: mouse.ty, p: 0 };
    else toast('Too far to mine by hand. Walk up to the ore.', true);
  }
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
  if (mouse.r && (ptx !== mouse.tx || pty !== mouse.ty)) { const e = at(mouse.tx, mouse.ty); if (e && (belty(e) || kind(e) === 'pipe' || kind(e) === 'road' || (kind(e) === 'rail' && !railBusy(e))) && entReach(e, REACH)) { removeEnt(e); renderHotbar(); } }
  if (drag && mouse.l && tool && (drag.x !== mouse.tx || drag.y !== mouse.ty)) dragTo(mouse.tx, mouse.ty);
  const info = tool || S.dg ? '' : tileInfo(mouse.tx, mouse.ty);
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
  if (ev.target.tagName === 'SELECT' || ev.target.tagName === 'INPUT') { if (ev.key === 'Escape') ev.target.blur(); return; }
  if (/^Digit\d$/.test(ev.code) && !modalKind) {
    const d = +ev.code[5], i = (d + 9) % 10 + (ev.shiftKey ? 10 : 0);
    renderHotbar();
    if (S.qb[i]) selectTool(S.qb[i]); else if (tool) { tool = null; renderHotbar(); }
    return;
  }
  const k = ev.key.toLowerCase();
  if (k === 'alt') { ev.preventDefault(); altMode = !altMode; toast(altMode ? 'Alt mode on: recipes, filters and chest contents shown on the map' : 'Alt mode off'); return; }
  if (modalKind === 'ency' && (k === '/' || ((ev.ctrlKey || ev.metaKey) && k === 'f'))) { ev.preventDefault(); const s = $('#esearch'); if (s) s.focus(); return; }
  if (modalKind === 'ency' && k === 'backspace') { ev.preventDefault(); return eGo(-1); }
  if (k === 'h' && hovCk && hovCk.isConnected) { const hk = hovCk.dataset.ck || (hovCk.dataset.m === 'x' && RECIPE[hovCk.dataset.k] ? rMain(RECIPE[hovCk.dataset.k]) : hovCk.dataset.k); if (ITEMS[hk] || FLUIDS[hk] || BUILD[hk]) { keys[k] = true; return encyOpen(hk); } }
  if ((modalKind === 'craft' || modalKind === 'tech') && (k === '/' || ((ev.ctrlKey || ev.metaKey) && k === 'f'))) { ev.preventDefault(); const s = $(modalKind === 'craft' ? '#csearch' : '#tsearch'); if (s) s.focus(); return; }
  keys[k] = true;
  if (k === 'e' || k === 'i') { modalKind === 'craft' ? closeModal() : openModal('craft'); }
  else if (k === 'p') { modalKind === 'craft' && modalTab === 'equip' ? closeModal() : openModal('craft', 'equip'); }
  else if (k === 'h') { modalKind === 'ency' ? closeModal() : openModal('ency'); }
  else if (k === 'm') { modalKind === 'map' ? closeModal() : openModal('map'); }
  else if (k === 'j') { modalKind === 'ach' ? closeModal() : openModal('ach'); }
  else if (k === 't') { modalKind === 'tech' ? closeModal() : openModal('tech'); }
  else if (k === 'escape') { if (modalKind) closeModal(); else if (tool) { tool = null; renderHotbar(); } else closePanel(); }
  else if (k === 'q') {
    if (modalKind) closeModal();
    else {
      const e = at(mouse.tx, mouse.ty);
      if (e && BUILD[e.type].cost && tool !== e.type) { if (S.inv[e.type] > 0) { tool = e.type; toolDir = e.dir || 0; closePanel(); qbAdd(e.type); renderHotbar(); } else toast('You have no ' + nm(e.type) + '. Craft one with E.', true); }
      else if (tool) { tool = null; renderHotbar(); } else closePanel();
    }
  }
  else if (k === 'r') {
    if (tool) toolDir = (toolDir + 1) % 4;
    else { const e = at(mouse.tx, mouse.ty); if (e && (belty(e) || BUILD[e.type].ug || kind(e) === 'inserter' || e.type === 'sorter' || e.type === 'booster')) rotEnt(e); }
  }
  else if ((k === 'f' || k === 'enter') && !modalKind) S.dg ? dgUse() : carToggle();
  else if (k === 'x' && !modalKind) wpnCycle();
  else if (k === 'n' && !modalKind) { const dv = S.pl.car && carOf(S.pl.car); if (dv && VEH[dv.type].net) { netToggle(dv); if (selCar === dv.id) openCar(dv); } }
  else if (k === 'g' && !modalKind) { const p = S.dg ? dgPos(mouse.x, mouse.y) : screenToTile(mouse.x, mouse.y); nadeThrow(p.fx, p.fy); }
  else if (k === 'v') { overlay = (overlay + 1) % 4; toast(['Overlay off', 'Pressure overlay', 'Temperature overlay', 'Smog overlay'][overlay]); }
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) ev.preventDefault();
});
window.addEventListener('keyup', ev => { if (ev.key === 'Alt') ev.preventDefault(); keys[ev.key.toLowerCase()] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.l = mouse.r = mouse.m = false; });

hotbar.addEventListener('click', ev => {
  if (ev.target.closest('[data-ui]')) return openModal('craft');
  const b = ev.target.closest('[data-q]');
  if (!b) return;
  const i = +b.dataset.q, t = S.qb[i];
  if (t) selectTool(t); else if (tool && BUILD[tool]) qbSet(i, tool);
});
hotbar.addEventListener('contextmenu', ev => { const b = ev.target.closest('[data-q]'); if (!b) return; ev.preventDefault(); S.qb[+b.dataset.q] = null; renderHotbar(); });
hotbar.addEventListener('dragover', ev => { if (ev.target.closest('[data-q]')) ev.preventDefault(); });
hotbar.addEventListener('drop', ev => { const b = ev.target.closest('[data-q]'), t = ev.dataTransfer.getData('text/plain'); if (!b || !BUILD[t]) return; ev.preventDefault(); qbSet(+b.dataset.q, t); });
panel.addEventListener('click', ev => { const b = ev.target.closest('button[data-act]'); if (b) panelAct(b.dataset.act, b); });
panel.addEventListener('change', ev => { const s = ev.target.closest('select[data-act]'); if (s) panelAct(s.dataset.act, s); });
modal.addEventListener('click', ev => {
  if (ev.target === modal) return closeModal();
  const t = ev.target.closest('[data-tab]');
  if (t) { modalTab = t.dataset.tab; if (modalKind === 'ency') { eQ = ''; ePush(); } modal.querySelector('.mbody').scrollTop = 0; return renderModal(); }
  const ebk = ev.target.closest('[data-eb]');
  if (ebk) return eGo(+ebk.dataset.eb);
  const ecat = ev.target.closest('[data-ecat]');
  if (ecat) { eCat = ecat.dataset.ecat; ePush(); return renderModal(); }
  const ck = ev.target.closest('[data-ck]');
  if (ck && modalKind === 'ency') return encyOpen(ck.dataset.ck);
  const fz = ev.target.closest('[data-fz]');
  if (fz) { if (+fz.dataset.fz) mapZoom(+fz.dataset.fz > 0 ? 1.5 : 1 / 1.5); else { mv.x = S.pl.x; mv.y = S.pl.y; drawMapView(); } return; }
  const tc = ev.target.closest('[data-tech]');
  if (tc) { const t = tc.dataset.tech; if (techOk(t)) return; if ((S.rq || []).includes(t) && tc.classList.contains('tqi')) S.rq = S.rq.filter(x => x !== t); else queueTech(t, ev.shiftKey); return renderModal(); }
  const tfb = ev.target.closest('[data-tf]');
  if (tfb) { tF = tfb.dataset.tf; return renderModal(); }
  const txb = ev.target.closest('[data-tx]');
  if (txb) { tX = txb.dataset.tx; return renderModal(); }
  const af = ev.target.closest('[data-achf]');
  if (af) { achF = af.dataset.achf; return renderModal(); }
  const at = ev.target.closest('[data-acht]');
  if (at) { S.trk = S.trk === at.dataset.acht ? null : at.dataset.acht; achTrk(); return renderModal(); }
  const c = ev.target.closest('[data-craft]');
  if (c) return doCraft(c.dataset.craft, ev.shiftKey ? maxCraft(c.dataset.craft) : +c.dataset.n);
  const p = ev.target.closest('[data-part]');
  if (p) return doPart(p.dataset.part, ev.shiftKey ? maxCraft(p.dataset.part) : +p.dataset.n);
  const gb = ev.target.closest('[data-grp]');
  if (gb) { cGrp = gb.dataset.grp; cQ = ''; const cs = $('#csearch'); if (cs) cs.value = ''; cSig = ''; return renderModal(); }
  const eqa = ev.target.closest('[data-eqa]');
  if (eqa) { armWear(eqa.dataset.eqa); return renderModal(); }
  if (ev.target.closest('[data-eqoff]')) { armOff(); return renderModal(); }
  const eqm = ev.target.closest('[data-eqm]');
  if (eqm) { eSel = eSel === eqm.dataset.eqm ? null : eqm.dataset.eqm; return renderModal(); }
  const eqr = ev.target.closest('[data-eqr]');
  if (eqr) { eqTake(+eqr.dataset.eqr); return renderModal(); }
  const ec = ev.target.closest('[data-ex]');
  if (ec) { if (eSel && eqPut(eSel, +ec.dataset.ex, +ec.dataset.ey) && !(S.inv[eSel] > 0)) eSel = null; return renderModal(); }
  const pk = ev.target.closest('[data-pick]');
  if (pk) { const t = pk.dataset.pick; qbAdd(t); closeModal(); if (tool !== t) selectTool(t); return; }
  const wb = ev.target.closest('[data-world]');
  if (wb && wb.dataset.world === 'dice') { wcfg.seed = String(Math.floor(Math.random() * 1e9)); $('#wseed').value = wcfg.seed; return drawPreview(); }
  if (wb && wb.dataset.world === 'go') return startWorld();
  if (ev.target.id === 'wmap') {
    if (mDrag && mDrag.moved) { mDrag = null; return; }
    const r = ev.target.getBoundingClientRect();
    cam.x = mv.x + (ev.clientX - r.left - r.width / 2) / mv.z; cam.y = mv.y + (ev.clientY - r.top - r.height / 2) / mv.z; camFree = true;
    return closeModal();
  }
  if (ev.target.closest('[data-ui="close"]')) closeModal();
});
modal.addEventListener('mousedown', ev => { if (ev.target.id === 'wmap' && ev.button === 0) { mDrag = { x: ev.clientX, y: ev.clientY, moved: false }; ev.target.classList.add('drag'); } });
window.addEventListener('mousemove', ev => {
  hovCk = ev.target.closest ? ev.target.closest('[data-ck],[data-k]') : null;
  if (!mDrag || modalKind !== 'map') return;
  const dx = ev.clientX - mDrag.x, dy = ev.clientY - mDrag.y;
  if (!mDrag.moved && dx * dx + dy * dy < 16) return;
  mDrag.moved = true; mv.x -= dx / mv.z; mv.y -= dy / mv.z; mDrag.x = ev.clientX; mDrag.y = ev.clientY;
  drawMapView();
});
window.addEventListener('mouseup', ev => { const c = document.getElementById('wmap'); if (c) c.classList.remove('drag'); if (mDrag) { const m = mDrag; setTimeout(() => { if (mDrag === m) mDrag = null; }, 0); } });
modal.addEventListener('wheel', ev => { if (ev.target.id !== 'wmap') return; ev.preventDefault(); const r = ev.target.getBoundingClientRect(); mapZoom(ev.deltaY < 0 ? 1.25 : 0.8, ev.clientX - r.left, ev.clientY - r.top); }, { passive: false });
modal.addEventListener('mouseup', ev => { if (modalKind === 'ency' && (ev.button === 3 || ev.button === 4)) { ev.preventDefault(); eGo(ev.button === 3 ? -1 : 1); } });
modal.addEventListener('contextmenu', ev => {
  const er = ev.target.closest('[data-eqr]');
  if (er) { ev.preventDefault(); eqTake(+er.dataset.eqr); return renderModal(); }
  const c = ev.target.closest('[data-craft],[data-part]');
  if (!c) return;
  ev.preventDefault();
  enqueue(c.dataset.craft || c.dataset.part, 5);
});
modal.addEventListener('input', ev => {
  if (ev.target.id === 'esearch') { eQ = ev.target.value; return renderModal(); }
  if (ev.target.id === 'isearch') iQ = ev.target.value;
  else if (ev.target.id === 'csearch') cQ = ev.target.value;
  else if (ev.target.id === 'tsearch') { tQ = ev.target.value; return renderModal(); }
  else return;
  cSig = ''; renderModal();
});
modal.addEventListener('dragstart', ev => { const pk = ev.target.closest('[data-pick]'); if (pk) ev.dataTransfer.setData('text/plain', pk.dataset.pick); });
modal.addEventListener('change', ev => {
  const m = { wseed: 'seed', wsize: 'size', wwater: 'water', wore: 'ore', whives: 'hives', winf: 'inf', wwire: 'wire', wforest: 'forest', wrock: 'rock', wclim: 'clim', wrain: 'rain', wdgn: 'dgn', wkit: 'kit' }[ev.target.id];
  if (!m || !wcfg) return;
  wcfg[m] = ev.target.value;
  drawPreview();
});
document.getElementById('top').addEventListener('click', ev => {
  const b = ev.target.closest('[data-ui]');
  if (!b) return;
  const u = b.dataset.ui;
  if (u === 'craft' || u === 'ency' || u === 'help' || u === 'map' || u === 'ach') openModal(u);
  else if (u === 'reset') openModal('world');
});

let last = performance.now(), acc = 0, uiT = 0;
function frame(now) {
  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;
  const mx = modalKind ? 0 : (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0), my = modalKind ? 0 : (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
  if ((S.dg ? dgMove(dt, mx, my) : plMove(dt, mx, my)) || (S.pl.car && (mx || my))) camFree = false;
  if (!camFree) { const k = Math.min(1, dt * 10); cam.x += (S.pl.x - cam.x) * k; cam.y += (S.pl.y - cam.y) * k; }
  cam.x = Math.max(0, Math.min(W, cam.x)); cam.y = Math.max(0, Math.min(H, cam.y));
  acc += dt;
  let n = 0;
  while (acc >= DT && n < 10) { tick(); acc -= DT; n++; }
  if (n >= 10) acc = 0;
  render();
  renderQueue();
  uiT += dt;
  if (uiT > 0.2) {
    uiT = 0;
    $('#power').innerHTML = powerHtml();
    $('#vent').innerHTML = ventHtml();
    renderPanelDyn();
    if (modalKind === 'craft' || modalKind === 'tech') renderModal();
    if (modalKind === 'map' && !mDrag) drawMapView();
  }
  miniT += dt;
  if (miniT > 0.1) {
    miniT = 0;
    drawMini();
    panel.classList.toggle('shift', !panel.hidden);
  }
  requestAnimationFrame(frame);
}

new ResizeObserver(resize).observe(cv);
window.addEventListener('beforeunload', save);
setInterval(save, 10000);

if (!load()) newGame(undefined, { wire: 1 });
resize();
renderHotbar();
if (!S.help) { S.help = true; openModal('help'); }
requestAnimationFrame(frame);

const CMBI = (() => {
  const met = (g, x0, y0, x1, y1, c) => lgr(g, x0, y0, x1, y1, hsh(c, 1.35), c, hsh(c, 0.6));
  const box = (g, x, y, w, h, c, r) => { rrect(g, x, y, w, h, r || 1); g.fillStyle = met(g, x, y, x, y + h, c); g.fill(); ink(g, 1); };
  const gun = (g, o) => {
    dshad(g, 32, 58, 26, 3);
    g.save(); g.translate(32, 32); g.rotate(-0.38); g.scale((o.s || 0.95) * 1.1, (o.s || 0.95) * 1.1);
    const L = o.L || 30, bc = o.bc || '#2e3238', wc = o.wc || '#8a5a30';
    if (o.bipod) { g.strokeStyle = '#1e2024'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(L - 12, 0); g.lineTo(L - 17, 14); g.moveTo(L - 12, 0); g.lineTo(L - 7, 14); g.stroke(); }
    if (o.stock === 'wood') { poly(g, [-8, -4, -8, 3, -14, 5, -31, 8, -31, -1, -15, -3]); g.fillStyle = lgr(g, 0, -4, 0, 8, hsh(wc, 1.3), wc, hsh(wc, 0.65)); g.fill(); ink(g, 1); }
    else if (o.stock === 'black') { poly(g, [-8, -4, -8, 3, -16, 4, -30, 8, -30, -2, -16, -3]); g.fillStyle = lgr(g, 0, -4, 0, 8, '#4a4e54', '#1e2024'); g.fill(); ink(g, 1); g.fillStyle = '#111'; g.fillRect(-31, -2, 2, 10); }
    else if (o.stock === 'skel') { g.strokeStyle = o.sc || '#3a3e44'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(-8, -3); g.lineTo(-28, -2); g.lineTo(-28, 7); g.lineTo(-10, 2); g.stroke(); }
    else if (o.stock === 'cross') { poly(g, [-6, -3, -6, 3, -30, 7, -30, 0]); g.fillStyle = lgr(g, 0, -4, 0, 8, hsh(wc, 1.3), wc, hsh(wc, 0.65)); g.fill(); ink(g, 1); }
    if (o.barrels) { for (let i = 0; i < 3; i++) { g.fillStyle = lgr(g, 0, -6 + i * 3, 0, -4 + i * 3, '#8a9098', '#2a2e34'); g.fillRect(8, -6 + i * 3, L - 8, 2.4); } g.fillStyle = '#4a4e54'; g.fillRect(L - 9, -7, 3, 10); g.fillRect(18, -7, 3, 10); }
    else { g.fillStyle = lgr(g, 0, -4, 0, -0.5, '#6a7078', '#24282c'); g.fillRect(8, -4, L - 8, o.bw || 3.2); }
    if (o.brake) { g.fillStyle = '#3a3e44'; g.fillRect(L - 1, -5.5, 6, 6); g.fillStyle = '#111'; for (const x of [L, L + 2.6]) g.fillRect(x, -5.5, 1.2, 6); }
    if (o.tube) { g.fillStyle = '#2a2e34'; g.fillRect(8, -0.6, L - 12, 2.6); }
    if (o.pump) { rrect(g, 11, -2, 11, 5.5, 1.5); g.fillStyle = lgr(g, 0, -2, 0, 3.5, hsh(o.pc || wc, 1.3), o.pc || wc); g.fill(); ink(g, 0.8); for (let x = 13; x < 21; x += 2) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x, -1.5, 0.8, 4.5); } }
    if (o.guard) { rrect(g, 8, -4.5, o.guard, 6, 1.5); g.fillStyle = lgr(g, 0, -4.5, 0, 1.5, '#4a4e54', '#1e2024'); g.fill(); ink(g, 0.8); }
    if (o.coils) { for (let x = 10; x < L - 2; x += 4.2) { g.fillStyle = lgr(g, 0, -6, 0, 2, '#f0b070', '#c87533', '#7a4018'); g.fillRect(x, -6.5, 3, 8.5); g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 0.6; g.strokeRect(x, -6.5, 3, 8.5); } box(g, 4, 3, 16, 5, '#4a5a6a'); }
    if (o.arc) { for (let x = 11; x < L - 4; x += 4) { ell(g, x, -2.2, 1.8, 4.6); g.fillStyle = '#e8e4da'; g.fill(); ink(g, 0.6); } g.strokeStyle = '#9aa0a8'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(L - 4, -4); g.lineTo(L + 2, -6); g.moveTo(L - 4, -0.5); g.lineTo(L + 2, 1.5); g.stroke(); g.strokeStyle = '#9ad8ff'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(L + 2, -6); g.lineTo(L + 1, -3.5); g.lineTo(L + 3, -2.5); g.lineTo(L + 2, 1.5); g.stroke(); g.fillStyle = 'rgba(140,210,255,0.35)'; g.beginPath(); g.arc(L + 2, -2, 5, 0, 7); g.fill(); box(g, 2, 3, 14, 5, '#5a5040'); }
    rrect(g, -9, -5.5, 19, o.rh || 8.5, 1.5); g.fillStyle = lgr(g, 0, -5.5, 0, 3, hsh(bc, 1.5), bc, hsh(bc, 0.6)); g.fill(); ink(g, 1);
    if (o.motor) { ell(g, -11, -1.5, 5, 6); g.fillStyle = met(g, -16, -7, -16, 5, '#5a6068'); g.fill(); ink(g, 1); g.fillStyle = '#c03030'; g.fillRect(-13, -3, 4, 1.5); }
    if (o.grip !== false) { poly(g, [-4, 3, 0.5, 3, -1.5, 11, -6, 11]); g.fillStyle = '#24272b'; g.fill(); ink(g, 0.8); g.strokeStyle = '#24272b'; g.lineWidth = 1; g.beginPath(); g.arc(3, 4, 2.6, 0, Math.PI); g.stroke(); }
    if (o.mag === 'box') { poly(g, [3, 3, 8, 3, 10, 13, 5, 13.5]); g.fillStyle = lgr(g, 3, 0, 10, 0, '#4a4e54', '#1a1c20'); g.fill(); ink(g, 0.8); }
    else if (o.mag === 'curve') { g.beginPath(); g.moveTo(3, 3); g.lineTo(8, 3); g.quadraticCurveTo(10, 10, 14, 15); g.lineTo(9, 17); g.quadraticCurveTo(5, 11, 3, 3); g.fillStyle = '#2a2d31'; g.fill(); ink(g, 0.8); }
    else if (o.mag === 'drum') { g.beginPath(); g.arc(6, 10, 6.5, 0, 7); g.fillStyle = rgr(g, 6, 10, 6.5, '#5a5e64', '#1a1c20'); g.fill(); ink(g, 1); g.fillStyle = '#888'; g.beginPath(); g.arc(6, 10, 1.6, 0, 7); g.fill(); }
    else if (o.mag === 'belt') { box(g, -1, 3, 11, 9, '#4a5040'); g.fillStyle = '#c8a040'; for (let i = 0; i < 4; i++) { g.save(); g.translate(-3 - i * 2.5, 6 + i * 3.2); g.rotate(-0.9 + i * 0.25); g.fillRect(-1.2, -4, 2.4, 6); g.fillStyle = '#8a6a30'; g.fillRect(-1.2, -4, 2.4, 1.6); g.fillStyle = '#c8a040'; g.restore(); } }
    if (o.handle) { g.strokeStyle = '#1e2024'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(-3, -5.5); g.quadraticCurveTo(2, -11, 7, -5.5); g.stroke(); }
    if (o.scope) { const sl = o.scope; g.fillStyle = '#1e2024'; g.fillRect(-2, -8, 2, 3); g.fillRect(sl - 10, -8, 2, 3); rrect(g, -6, -12, sl, 4.6, 2); g.fillStyle = lgr(g, 0, -12, 0, -7.4, '#5a6068', '#14161a'); g.fill(); ink(g, 0.8); ell(g, -6 + sl, -12, 3.6, 3.6); g.fillStyle = '#1e2024'; g.fillRect(sl - 9, -13.5, 6, 7.6); g.fillStyle = o.lens || '#5ab0e0'; g.fillRect(sl - 3.5, -12.8, 1.4, 6); }
    if (o.bow) { g.strokeStyle = '#3a3e44'; g.lineWidth = 2.6; g.beginPath(); g.moveTo(14, -19); g.quadraticCurveTo(24, -2, 14, 17); g.stroke(); g.strokeStyle = '#e8e0c8'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(14, -19); g.lineTo(2, -1); g.lineTo(14, 17); g.stroke(); g.fillStyle = '#c03030'; poly(g, [2, -3, 26, -2, 2, -0.5]); g.fill(); g.fillStyle = '#ddd'; poly(g, [26, -3, 30, -1.8, 26, -0.5]); g.fill(); }
    g.restore();
  };
  const rnds = (g, o) => {
    dshad(g, 32, 58, 24, 3);
    const n = o.n || 4, w = o.w || 9, gap = o.gap || 3, h = o.h || 30, x0 = 32 - (n * w + (n - 1) * gap) / 2, bot = 56, cs = o.cs || '#c8a040';
    for (let i = 0; i < n; i++) {
      const x = x0 + i * (w + gap), top = bot - h, nk = o.neck ? 6 : 0;
      g.fillStyle = lgr(g, x, 0, x + w, 0, hsh(cs, 0.7), hsh(cs, 1.4), hsh(cs, 0.75));
      g.beginPath(); g.moveTo(x, bot); g.lineTo(x, top + nk + 4); if (nk) { g.lineTo(x + w * 0.2, top + 4); } g.lineTo(x + w * (nk ? 0.8 : 1), top + 4); if (nk) g.lineTo(x + w, top + nk + 4); g.lineTo(x + w, bot); g.closePath(); g.fill(); ink(g, 0.8);
      g.fillStyle = hsh(cs, 0.6); g.fillRect(x - 0.5, bot - 4, w + 1, 1.2);
      const bx = x + (nk ? w * 0.2 : 0), bw = nk ? w * 0.6 : w, bl = o.bl || 12;
      g.fillStyle = lgr(g, bx, 0, bx + bw, 0, hsh(o.bc || '#b87333', 0.75), hsh(o.bc || '#b87333', 1.4), hsh(o.bc || '#b87333', 0.7));
      g.beginPath(); g.moveTo(bx, top + 4); g.lineTo(bx, top + 4 - bl * 0.45); g.quadraticCurveTo(bx, top + 4 - bl, bx + bw / 2, top + 4 - bl - (o.pt ? 3 : 0)); g.quadraticCurveTo(bx + bw, top + 4 - bl, bx + bw, top + 4 - bl * 0.45); g.lineTo(bx + bw, top + 4); g.closePath(); g.fill(); ink(g, 0.8);
      if (o.tip) { g.save(); g.beginPath(); g.moveTo(bx, top + 4 - bl * 0.45); g.quadraticCurveTo(bx, top + 4 - bl, bx + bw / 2, top + 4 - bl - (o.pt ? 3 : 0)); g.quadraticCurveTo(bx + bw, top + 4 - bl, bx + bw, top + 4 - bl * 0.45); g.clip(); g.fillStyle = o.tip; g.fillRect(bx - 1, top - bl - 4, bw + 2, bl * 0.42); g.restore(); }
    }
  };
  const shells = (g, hull, nose) => {
    dshad(g, 32, 58, 24, 3);
    for (let i = 0; i < 4; i++) {
      const x = 9 + i * 12;
      g.fillStyle = lgr(g, x, 0, x + 10, 0, hsh(hull, 0.7), hsh(hull, 1.35), hsh(hull, 0.75)); g.fillRect(x, 22, 10, 32); g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1; g.strokeRect(x, 22, 10, 32);
      g.fillStyle = lgr(g, x, 0, x + 10, 0, '#8a6a30', '#f0d080', '#9a7a38'); g.fillRect(x - 0.5, 46, 11, 8); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x - 0.5, 52, 11, 1);
      if (nose === 'slug') { g.fillStyle = lgr(g, x, 0, x + 10, 0, '#5a5e64', '#b8bcc4', '#4a4e54'); g.beginPath(); g.moveTo(x + 1, 22); g.quadraticCurveTo(x + 5, 12, x + 9, 22); g.fill(); ink(g, 0.8); g.strokeStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.moveTo(x + 3, 18); g.lineTo(x + 7, 18); g.stroke(); }
      else { g.fillStyle = hsh(hull, 0.75); g.beginPath(); g.moveTo(x, 22); g.lineTo(x + 5, 25); g.lineTo(x + 10, 22); g.closePath(); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.45)'; for (let a = 0; a < 3; a++) { g.beginPath(); g.moveTo(x + 2 + a * 3, 22); g.lineTo(x + 5, 25); g.stroke(); } }
      if (nose === 'fl') { g.fillStyle = '#d8dce0'; g.fillRect(x + 3, 30, 4, 1.2); g.fillRect(x + 3, 33, 4, 1.2); }
    }
  };
  const vestShape = (g, c) => { poly(g, [17, 6, 25, 6, 32, 13, 39, 6, 47, 6, 52, 16, 53, 56, 11, 56, 12, 16]); g.fillStyle = lgr(g, 12, 6, 52, 56, hsh(c, 1.25), c, hsh(c, 0.6)); g.fill(); ink(g, 1.5); };
  const carrier = (g, c, heavy) => {
    dshad(g, 32, 59, 24, 3);
    if (heavy) { for (const s of [-1, 1]) { poly(g, [32 + s * 18, 8, 32 + s * 28, 12, 32 + s * 28, 26, 32 + s * 20, 24]); g.fillStyle = hsh(c, 0.8); g.fill(); ink(g, 1); } }
    vestShape(g, c);
    rrect(g, 17, 16, 30, 22, 4); g.fillStyle = hsh(c, 1.15); g.fill(); ink(g, 1);
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; for (let y = 20; y < 36; y += 4) { g.beginPath(); g.moveTo(19, y); g.lineTo(45, y); g.stroke(); }
    for (let i = 0; i < 3; i++) { rrect(g, 14 + i * 12.5, 40, 10.5, 13, 2); g.fillStyle = hsh(c, 0.85); g.fill(); ink(g, 1); g.fillStyle = hsh(c, 0.65); g.fillRect(14 + i * 12.5, 40, 10.5, 4); }
    if (heavy) { poly(g, [22, 56, 42, 56, 38, 63, 26, 63]); g.fillStyle = hsh(c, 0.75); g.fill(); ink(g, 1); }
  };
  const exo = (g, c, acc) => {
    dshad(g, 32, 60, 18, 2.5);
    g.lineCap = 'round'; g.lineJoin = 'round';
    const bar = (pts, w, col) => { g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = w + 2; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.stroke(); g.strokeStyle = col; g.lineWidth = w; g.stroke(); };
    bar([32, 6, 32, 30], 4, c);
    bar([14, 10, 50, 10], 3.5, c);
    bar([14, 10, 12, 30], 3, c); bar([50, 10, 52, 30], 3, c);
    bar([20, 32, 44, 32], 4.5, hsh(c, 0.8));
    bar([22, 34, 20, 46, 22, 58], 3.5, c); bar([42, 34, 44, 46, 42, 58], 3.5, c);
    bar([17, 58, 26, 58], 3, hsh(c, 0.7)); bar([38, 58, 47, 58], 3, hsh(c, 0.7));
    for (const [x, y] of [[14, 10], [50, 10], [20, 46], [44, 46], [22, 34], [42, 34]]) { g.beginPath(); g.arc(x, y, 3.4, 0, 7); g.fillStyle = acc; g.fill(); ink(g, 1); }
    rrect(g, 27, 14, 10, 12, 2); g.fillStyle = hsh(c, 0.7); g.fill(); ink(g, 1); g.fillStyle = acc; g.fillRect(29, 16, 6, 2);
    g.lineCap = 'butt'; g.lineJoin = 'miter';
  };
  const plate = (g, c, inner) => {
    dshad(g, 32, 58, 20, 3);
    poly(g, [20, 6, 44, 6, 52, 16, 52, 54, 12, 54, 12, 16]); g.fillStyle = lgr(g, 12, 6, 52, 54, hsh(c, 1.4), c, hsh(c, 0.55)); g.fill(); ink(g, 1.5);
    poly(g, [22, 11, 42, 11, 47, 18, 47, 49, 17, 49, 17, 18]); g.strokeStyle = 'rgba(255,255,255,0.22)'; g.lineWidth = 1.2; g.stroke();
    if (inner) inner();
  };
  const T = {};
  const flask = (g, x, y, c) => { poly(g, [x - 3, y - 14, x + 3, y - 14, x + 3, y - 6, x + 10, y + 6, x - 10, y + 6, x - 3, y - 6]); g.fillStyle = 'rgba(220,235,245,0.55)'; g.fill(); ink(g, 1); poly(g, [x - 6.5, y - 1, x + 6.5, y - 1, x + 10, y + 6, x - 10, y + 6]); g.fillStyle = c; g.fill(); };
  T.sci1 = g => {
    dshad(g, 32, 56, 24, 4);
    poly(g, [14, 18, 40, 18, 36, 50, 18, 50]); g.fillStyle = lgr(g, 14, 0, 40, 0, '#e8c8a0', '#c89870', '#8a6040'); g.fill(); ink(g, 1.2);
    g.fillStyle = '#c8503a'; g.fillRect(16, 26, 22, 4);
    ell(g, 27, 18, 13, 3); g.fillStyle = '#5a3a28'; g.fill(); ink(g, 1);
    ell(g, 46, 48, 12, 5); g.fillStyle = lgr(g, 0, 43, 0, 53, '#f0ece4', '#b8b0a0'); g.fill(); ink(g, 1);
    ell(g, 46, 46, 8, 2.6); g.fillStyle = '#d8d0c0'; g.fill();
    g.beginPath(); g.arc(46, 45.5, 2.4, 0, 7); g.fillStyle = lgr(g, 44, 43, 48, 48, '#fff4c0', '#e8c040', '#a07820'); g.fill();
  };
  T.sci2 = g => {
    dshad(g, 32, 57, 22, 3);
    g.fillStyle = '#8a7040'; g.fillRect(12, 54, 40, 3); g.fillRect(14, 6, 3, 48); g.fillRect(14, 12, 12, 3);
    rrect(g, 27, 4, 6, 30, 2); g.fillStyle = 'rgba(220,235,245,0.6)'; g.fill(); ink(g, 1);
    g.fillStyle = '#4aa860'; g.fillRect(28, 14, 4, 19);
    g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 0.8; for (let y = 8; y < 33; y += 4) { g.beginPath(); g.moveTo(27, y); g.lineTo(30, y); g.stroke(); }
    g.fillStyle = met(g, 25, 34, 35, 34, '#c8a040'); g.fillRect(25, 34, 10, 3); g.fillRect(29, 37, 2, 4);
    flask(g, 30, 48, 'rgba(232,140,180,0.85)');
  };
  T.sci3 = g => {
    dshad(g, 32, 58, 12, 3);
    rrect(g, 25, 10, 14, 42, 2); g.fillStyle = 'rgba(220,235,245,0.6)'; g.fill(); ink(g, 1);
    g.fillStyle = '#f2f0e8'; g.fillRect(26, 14, 12, 34);
    [['#e8c040', 18], ['#4a7ad8', 26], ['#c84a6a', 36], ['#4aa860', 42]].forEach(([c, y]) => { g.fillStyle = c; g.fillRect(26, y, 12, 4); });
    box(g, 22, 6, 20, 6, '#b8c0c8', 2); box(g, 22, 50, 20, 6, '#b8c0c8', 2);
    g.fillStyle = '#e8e8f0'; g.fillRect(30, 1, 4, 6); g.fillRect(30, 56, 4, 6);
  };
  T.sci4 = g => {
    dshad(g, 32, 56, 26, 4);
    box(g, 6, 22, 52, 30, '#4a4e5a', 3);
    rrect(g, 12, 30, 40, 8, 1); g.fillStyle = (() => { const q = g.createLinearGradient(12, 0, 52, 0); ['#6a2aa8', '#2a4ae8', '#2ab8e8', '#3ac850', '#e8e030', '#e88a20', '#d82a2a'].forEach((c, i) => q.addColorStop(i / 6, c)); return q; })(); g.fill(); ink(g, 1);
    g.fillStyle = '#111'; for (const x of [22, 31, 44]) g.fillRect(x, 30, 1.6, 8);
    rrect(g, 26, 8, 10, 18, 1); g.fillStyle = 'rgba(220,235,245,0.6)'; g.fill(); ink(g, 1); g.fillStyle = 'rgba(160,80,200,0.75)'; g.fillRect(27, 15, 8, 10);
    g.strokeStyle = '#e8a040'; g.lineWidth = 2; g.beginPath(); g.moveTo(8, 46); g.bezierCurveTo(-2, 40, 4, 12, 24, 14); g.stroke();
    g.fillStyle = '#a050c8'; g.fillRect(44, 42, 8, 5);
  };
  T.sci5 = g => {
    dshad(g, 32, 56, 22, 4);
    box(g, 10, 12, 44, 40, '#2a5a3a', 3);
    g.fillStyle = '#d8b040'; for (let i = 0; i < 6; i++) { g.fillRect(13 + i * 7, 45, 4, 5); }
    g.strokeStyle = '#9ad0f0'; g.lineWidth = 2; g.beginPath(); g.moveTo(16, 18); for (let i = 0; i < 4; i++) { const x = 16 + i * 8; g.lineTo(x, 38); g.lineTo(x + 4, 38); g.lineTo(x + 4, 18); g.lineTo(x + 8, 18); } g.stroke();
    g.beginPath(); g.arc(48, 20, 4, 0, 7); g.fillStyle = '#3a6af0'; g.fill(); g.beginPath(); g.arc(47, 19, 1.6, 0, 7); g.fillStyle = '#c8e0ff'; g.fill();
    g.fillStyle = '#e8c040'; g.fillRect(40, 30, 10, 8);
  };
  T.sci_ag = g => {
    dshad(g, 32, 57, 24, 3);
    rrect(g, 10, 8, 14, 46, 6); g.fillStyle = 'rgba(220,235,245,0.55)'; g.fill(); ink(g, 1);
    g.save(); rrect(g, 10, 8, 14, 46, 6); g.clip();
    [['#4aa860', 18, 10], ['#7a5a3a', 28, 8], ['#a07a50', 36, 8], ['#c8a878', 44, 12]].forEach(([c, y, h]) => { g.fillStyle = c; g.fillRect(10, y, 14, h); }); g.restore();
    g.fillStyle = '#e8e0c8'; g.fillRect(9, 6, 16, 4);
    box(g, 30, 12, 26, 40, '#f4f0e4', 2);
    ['#d84a3a', '#e8903a', '#e8d040', '#8ac040', '#3a9a6a', '#3a6ab8'].forEach((c, i) => { g.fillStyle = c; g.fillRect(34, 15 + i * 6, 8, 4); });
    g.fillStyle = '#7a5a3a'; g.fillRect(45, 15, 7, 3); g.fillStyle = '#4aa860'; g.fillRect(45, 21, 7, 3);
  };
  T.sci_mil = g => {
    dshad(g, 32, 56, 26, 4);
    poly(g, [8, 26, 40, 26, 40, 52, 8, 52]); g.fillStyle = 'rgba(232,196,120,0.88)'; g.fill(); ink(g, 1.2);
    poly(g, [8, 26, 20, 16, 52, 16, 40, 26]); g.fillStyle = 'rgba(244,220,160,0.92)'; g.fill(); ink(g, 1);
    poly(g, [40, 26, 52, 16, 52, 42, 40, 52]); g.fillStyle = 'rgba(200,160,90,0.9)'; g.fill(); ink(g, 1);
    g.beginPath(); g.moveTo(10, 39); g.lineTo(20, 36); g.quadraticCurveTo(28, 33, 34, 39); g.quadraticCurveTo(28, 45, 20, 42); g.closePath(); g.fillStyle = 'rgba(120,60,30,0.45)'; g.fill();
    g.strokeStyle = 'rgba(90,40,20,0.7)'; g.lineWidth = 1; for (const a of [-0.6, -0.2, 0.2, 0.6]) { g.beginPath(); g.moveTo(26, 39); g.lineTo(26 + Math.cos(a) * 9, 39 + Math.sin(a) * 9); g.stroke(); }
    g.beginPath(); g.ellipse(36, 39, 3.5, 2, 0, 0, 7); g.fillStyle = '#b07a30'; g.fill(); ink(g, 0.8);
  };
  T.sci_en = g => {
    dshad(g, 32, 58, 18, 3);
    rrect(g, 18, 18, 28, 38, 4); g.fillStyle = lgr(g, 18, 0, 46, 0, '#c8d0d8', '#8a949e', '#4a525a'); g.fill(); ink(g, 1.2);
    rrect(g, 15, 12, 34, 9, 2); g.fillStyle = lgr(g, 15, 0, 49, 0, '#d8dee4', '#7a848e', '#4a525a'); g.fill(); ink(g, 1);
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 0.8; for (let x = 18; x < 48; x += 3) { g.beginPath(); g.moveTo(x, 12); g.lineTo(x, 21); g.stroke(); }
    g.fillStyle = '#c8a040'; g.fillRect(29, 4, 6, 9); g.fillRect(26, 6, 12, 3);
    g.fillStyle = '#3a3e44'; g.fillRect(21, 7, 3, 6); g.fillRect(40, 7, 3, 6);
    g.strokeStyle = '#e88a30'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(22, 7); g.quadraticCurveTo(14, 0, 6, 8); g.moveTo(41, 7); g.quadraticCurveTo(50, 0, 58, 8); g.stroke();
    g.fillStyle = '#e8c040'; g.fillRect(22, 34, 20, 6);
  };
  T.sci_met = g => {
    dshad(g, 32, 56, 26, 4);
    g.fillStyle = lgr(g, 0, 30, 0, 52, '#8a949e', '#4a525a'); g.fillRect(8, 30, 48, 16);
    ell(g, 32, 46, 24, 7); g.fill(); ink(g, 1.2);
    g.fillStyle = '#4a525a'; g.fillRect(8, 30, 1.4, 16); g.fillRect(54.6, 30, 1.4, 16);
    ell(g, 32, 30, 24, 7); g.fillStyle = lgr(g, 8, 23, 56, 37, '#eef2f6', '#b8c0c8', '#8a949e'); g.fill(); ink(g, 1.2);
    for (const [x, y] of [[20, 30], [30, 27], [40, 31], [27, 33]]) { ell(g, x, y, 2.6, 1.2); g.fillStyle = '#4a525a'; g.fill(); }
    g.fillStyle = '#d8a040'; g.fillRect(30, 40, 14, 3);
    g.beginPath(); g.arc(46, 14, 8, 0, 7); g.fillStyle = (() => { const q = g.createRadialGradient(43, 11, 1, 46, 14, 9); q.addColorStop(0, '#d0d0d8'); q.addColorStop(1, '#3a3a42'); return q; })(); g.fill(); ink(g, 1);
  };
  T.sci_bio = g => {
    dshad(g, 32, 56, 26, 4);
    ell(g, 32, 34, 26, 18); g.fillStyle = 'rgba(220,235,245,0.55)'; g.fill(); ink(g, 1.2);
    ell(g, 32, 34, 22, 15); g.fillStyle = '#e8d8a0'; g.fill();
    for (const [x, y, r, c] of [[22, 30, 3, '#f4f4e8'], [36, 26, 2.4, '#e8a040'], [40, 38, 3.4, '#f4f4e8'], [28, 40, 2, '#c84a6a'], [44, 30, 1.8, '#f4f4e8'], [18, 38, 1.6, '#e8a040'], [32, 34, 2.2, '#f4f4e8']]) { ell(g, x, y, r, r * 0.7); g.fillStyle = c; g.fill(); ink(g, 0.6); }
    ell(g, 32, 31, 26, 18); g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 1.2; g.stroke();
  };
  T.rifle = g => gun(g, { L: 30, stock: 'wood', mag: 'box', guard: 12, wc: '#8a5a30' });
  T.shotgun = g => gun(g, { L: 30, stock: 'wood', tube: 1, pump: 1, wc: '#7a4a28', bw: 3.6 });
  T.auto_shotgun = g => gun(g, { L: 28, stock: 'black', mag: 'drum', bw: 3.8, guard: 14 });
  T.lmg = g => gun(g, { L: 31, stock: 'black', mag: 'belt', bipod: 1, handle: 1, guard: 10, bc: '#3a3c40' });
  T.marksman = g => gun(g, { L: 33, stock: 'wood', mag: 'box', scope: 18, wc: '#6a5a40', bw: 2.6, s: 0.9 });
  T.amr = g => gun(g, { L: 34, stock: 'skel', mag: 'box', scope: 18, bipod: 1, brake: 1, bw: 4, s: 0.82, rh: 9.5 });
  T.crossbow = g => gun(g, { L: 12, stock: 'cross', bow: 1, grip: true, wc: '#5a4a38', s: 0.95 });
  T.coilgun = g => gun(g, { L: 30, stock: 'skel', coils: 1, sc: '#2a2a2a', bc: '#3a4a5a' });
  T.arc_caster = g => gun(g, { L: 26, stock: 'black', arc: 1, bc: '#3a3e44' });
  T.rotary_gun = g => gun(g, { L: 31, stock: 'none', barrels: 1, motor: 1, mag: 'belt', handle: 1, bc: '#3a3e44' });
  T.cartridge = g => rnds(g, { bc: '#7a7a80' });
  T.ap_cartridge = g => rnds(g, { bc: '#b87333', tip: '#1a1a1a', pt: 1 });
  T.match_round = g => rnds(g, { n: 3, w: 9, gap: 5, h: 32, bl: 15, bc: '#c87a40', neck: 1, pt: 1 });
  T.wcore_round = g => rnds(g, { n: 3, w: 9, gap: 5, h: 32, bl: 15, bc: '#c87a40', neck: 1, pt: 1, tip: '#9aa8b8' });
  T.wha_round = g => rnds(g, { n: 2, w: 13, gap: 7, h: 38, bl: 16, bc: '#b87333', neck: 1, pt: 1, tip: '#1a1a1a' });
  T.shotshell = g => shells(g, '#c03030');
  T.slug_shell = g => shells(g, '#3a7a40', 'slug');
  T.flechette_shell = g => shells(g, '#2a5ab0', 'fl');
  T.ammo_belt = g => {
    dshad(g, 32, 58, 26, 3);
    g.save(); g.translate(32, 34); g.rotate(-0.5);
    for (let i = 0; i < 6; i++) { const x = -26 + i * 9; g.fillStyle = lgr(g, x, 0, x + 6, 0, '#8a6a28', '#f0d080', '#8a6a28'); g.fillRect(x, -10, 6, 18); g.fillStyle = lgr(g, x, 0, x + 6, 0, '#5a5e64', '#c0c4cc', '#5a5e64'); g.beginPath(); g.moveTo(x, -10); g.quadraticCurveTo(x + 3, -20, x + 6, -10); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 0.8; g.strokeRect(x, -10, 6, 18); }
    g.fillStyle = '#3a3e44'; for (let i = 0; i < 6; i++) { const x = -27 + i * 9; g.fillRect(x, -6, 8, 3); g.fillRect(x, 2, 8, 3); }
    g.restore();
  };
  T.xbow_bolt = g => {
    dshad(g, 32, 58, 24, 3);
    for (let i = 0; i < 3; i++) { g.save(); g.translate(14 + i * 9, 50 - i * 2); g.rotate(-0.85); g.fillStyle = '#5a4a38'; g.fillRect(0, -1.2, 40, 2.4); g.fillStyle = '#b8bcc4'; poly(g, [40, -2.4, 47, 0, 40, 2.4]); g.fill(); ink(g, 0.6); g.fillStyle = ['#d04030', '#e8e0c8', '#d04030'][i]; poly(g, [0, -1, 9, -1, 4, -5]); g.fill(); poly(g, [0, 1, 9, 1, 4, 5]); g.fill(); g.restore(); }
  };
  T.steel_slug = g => {
    dshad(g, 32, 58, 22, 3);
    for (const [x, y] of [[14, 44], [30, 46], [46, 44], [22, 32], [38, 32], [30, 20]]) { rrect(g, x - 6, y - 5, 12, 11, 2); g.fillStyle = lgr(g, x - 6, 0, x + 6, 0, '#5a5e64', '#d0d4dc', '#5a5e64'); g.fill(); ink(g, 1); ell(g, x, y - 5, 6, 1.8); g.fillStyle = '#e0e4ea'; g.fill(); ink(g, 0.6); }
  };
  T.spark_gap = g => {
    dshad(g, 32, 58, 20, 3);
    for (const x of [18, 46]) { rrect(g, x - 9, 14, 18, 40, 8); g.fillStyle = lgr(g, x - 9, 0, x + 9, 0, 'rgba(200,220,240,0.35)', 'rgba(255,255,255,0.7)', 'rgba(200,220,240,0.35)'); g.fill(); ink(g, 1); g.fillStyle = met(g, x - 9, 0, x + 9, 0, '#9aa0a8'); g.fillRect(x - 9, 8, 18, 8); g.fillRect(x - 9, 50, 18, 8); g.fillStyle = '#5a5e64'; g.fillRect(x - 2, 16, 4, 12); g.fillRect(x - 2, 36, 4, 14); g.strokeStyle = '#7ad0ff'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, 28); g.lineTo(x - 2, 31); g.lineTo(x + 2, 33); g.lineTo(x, 36); g.stroke(); }
  };
  T.carrier = g => carrier(g, '#8a7a58');
  T.laminate_carrier = g => carrier(g, '#6a7058');
  T.heavy_carrier = g => carrier(g, '#4a5044', 1);
  T.mail_shirt = g => {
    dshad(g, 32, 59, 24, 3);
    poly(g, [20, 6, 44, 6, 58, 18, 54, 28, 48, 24, 50, 58, 14, 58, 16, 24, 10, 28, 6, 18]); g.fillStyle = lgr(g, 6, 6, 58, 58, '#b0b4ba', '#7a7e84', '#4a4e54'); g.fill(); ink(g, 1.5);
    g.save(); g.clip(); g.strokeStyle = 'rgba(30,32,36,0.65)'; g.lineWidth = 0.9; for (let y = 6; y < 60; y += 3.4) for (let x = 4 + ((y / 3.4) % 2) * 1.7; x < 60; x += 3.4) { g.beginPath(); g.arc(x, y, 1.6, 0, 7); g.stroke(); } g.restore();
    g.beginPath(); g.arc(32, 7, 6, 0, Math.PI); g.fillStyle = '#2a2d31'; g.fill();
  };
  T.blast_suit = g => {
    dshad(g, 32, 60, 22, 3);
    poly(g, [14, 26, 50, 26, 54, 58, 10, 58]); g.fillStyle = lgr(g, 10, 26, 54, 58, '#7a8460', '#5a6448', '#3a4230'); g.fill(); ink(g, 1.5);
    rrect(g, 8, 20, 48, 12, 6); g.fillStyle = '#4a5238'; g.fill(); ink(g, 1.2);
    g.beginPath(); g.arc(32, 16, 13, 0, 7); g.fillStyle = rgr(g, 32, 16, 13, '#8a9470', '#3a4230'); g.fill(); ink(g, 1.5);
    rrect(g, 22, 11, 20, 9, 3); g.fillStyle = lgr(g, 22, 11, 42, 20, '#9ac8e0', '#2a4a60'); g.fill(); ink(g, 1); g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(24, 12, 6, 2);
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; for (let y = 36; y < 56; y += 5) { g.beginPath(); g.moveTo(14, y); g.lineTo(50, y); g.stroke(); }
  };
  T.exoframe = g => exo(g, '#7a8088', '#c8a040');
  T.exoframe2 = g => exo(g, '#b8c0c8', '#40a0c0');
  T.exoframe3 = g => exo(g, '#2a2d31', '#e07030');
  T.exoframe4 = g => exo(g, '#8a94a8', '#4ad0ff');
  T.trauma_plate = g => plate(g, '#7a7e84');
  T.b4c_plate = g => plate(g, '#3a3c40', () => { g.fillStyle = 'rgba(255,255,255,0.08)'; for (let i = 0; i < 6; i++) g.fillRect(16, 18 + i * 5, 32, 2); });
  T.stf_pad = g => {
    dshad(g, 32, 58, 22, 3);
    rrect(g, 10, 8, 44, 48, 10); g.fillStyle = lgr(g, 10, 8, 54, 56, '#c0c8d0', '#9aa4b0', '#5a6470'); g.fill(); ink(g, 1.5);
    g.save(); g.clip(); g.strokeStyle = 'rgba(40,50,60,0.45)'; g.lineWidth = 1; g.setLineDash([2, 2]); for (let d = -40; d < 80; d += 10) { g.beginPath(); g.moveTo(d, 0); g.lineTo(d + 64, 64); g.moveTo(d + 64, 0); g.lineTo(d, 64); g.stroke(); } g.restore(); g.setLineDash([]);
  };
  T.aero_liner = g => {
    dshad(g, 32, 58, 24, 3);
    for (let i = 0; i < 3; i++) { rrect(g, 8 + i * 3, 12 + i * 12, 46, 14, 5); g.fillStyle = lgr(g, 0, 12 + i * 12, 0, 26 + i * 12, '#eaf2ff', '#b8cce8'); g.globalAlpha = 0.92; g.fill(); g.globalAlpha = 1; ink(g, 1); g.fillStyle = 'rgba(120,150,200,0.3)'; for (let x = 14 + i * 3; x < 52; x += 8) g.fillRect(x, 14 + i * 12, 1, 10); }
  };
  T.batt_pack = g => {
    dshad(g, 32, 60, 18, 3);
    box(g, 16, 6, 32, 52, '#3a4a5a', 4);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 4; j++) { g.beginPath(); g.arc(25 + i * 14, 15 + j * 11, 4.5, 0, 7); g.fillStyle = rgr(g, 25 + i * 14, 15 + j * 11, 4.5, '#7ac0e0', '#2a5a7a'); g.fill(); ink(g, 0.8); }
    g.fillStyle = '#c03030'; g.fillRect(20, 2, 6, 5); g.fillStyle = '#222'; g.fillRect(38, 2, 6, 5);
  };
  T.ss_batt = g => {
    dshad(g, 32, 60, 18, 3);
    for (let i = 0; i < 5; i++) { rrect(g, 14, 8 + i * 10, 36, 8, 2); g.fillStyle = met(g, 14, 8 + i * 10, 14, 16 + i * 10, i % 2 ? '#c8ccd0' : '#8a9098'); g.fill(); ink(g, 0.8); }
    g.fillStyle = '#c8a040'; g.fillRect(18, 2, 6, 6); g.fillStyle = '#9aa0a8'; g.fillRect(40, 2, 6, 6);
  };
  T.supercap = g => {
    dshad(g, 32, 58, 22, 3);
    for (const x of [20, 44]) { rrect(g, x - 10, 14, 20, 40, 4); g.fillStyle = lgr(g, x - 10, 0, x + 10, 0, '#1a3a6a', '#4a7ac0', '#1a2a4a'); g.fill(); ink(g, 1); g.fillStyle = '#e8e8e8'; g.fillRect(x - 10, 20, 20, 2); ell(g, x, 14, 10, 3); g.fillStyle = '#b8bcc4'; g.fill(); ink(g, 0.8); g.fillStyle = '#9aa0a8'; g.fillRect(x - 5, 6, 2, 8); g.fillRect(x + 3, 6, 2, 8); }
  };
  T.dmfc = g => {
    dshad(g, 32, 58, 24, 3);
    box(g, 8, 16, 34, 38, '#4a5a4a', 3);
    for (let y = 20; y < 50; y += 3) { g.fillStyle = y % 6 ? '#2a3a2a' : '#8a9a8a'; g.fillRect(12, y, 26, 1.6); }
    rrect(g, 42, 10, 14, 30, 3); g.fillStyle = lgr(g, 42, 0, 56, 0, '#a0b8d0', '#e0ecf8', '#a0b8d0'); g.fill(); ink(g, 1); g.fillStyle = '#3a6ab0'; g.fillRect(44, 18, 10, 14);
  };
  T.sofc_pack = g => {
    dshad(g, 32, 58, 24, 3);
    box(g, 8, 12, 48, 42, '#6a6e74', 3);
    for (let i = 0; i < 9; i++) { g.fillStyle = i % 2 ? '#e8e0c8' : '#3a6a4a'; g.fillRect(14, 16 + i * 4, 36, 2.6); }
    g.fillStyle = '#c86030'; g.fillRect(8, 6, 8, 7); g.fillRect(48, 6, 8, 7);
  };
  T.meoh_cart = g => {
    dshad(g, 32, 58, 16, 3);
    for (const x of [22, 42]) { rrect(g, x - 8, 10, 16, 46, 4); g.fillStyle = lgr(g, x - 8, 0, x + 8, 0, '#a8b8c8', '#eef4fa', '#a8b8c8'); g.fill(); ink(g, 1); g.fillStyle = 'rgba(90,140,200,0.4)'; g.fillRect(x - 6, 24, 12, 30); g.fillStyle = '#3a4a5a'; g.fillRect(x - 4, 4, 8, 7); }
  };
  T.med_injector = g => {
    dshad(g, 32, 58, 22, 3);
    g.save(); g.translate(32, 32); g.rotate(-0.75);
    rrect(g, -24, -6, 48, 12, 5); g.fillStyle = lgr(g, 0, -6, 0, 6, '#f4f4f0', '#c8ccd0'); g.fill(); ink(g, 1.2);
    g.fillStyle = '#e8a020'; rrect(g, 16, -6.5, 10, 13, 3); g.fill(); ink(g, 1);
    g.fillStyle = '#3a6ab0'; rrect(g, -27, -6.5, 8, 13, 3); g.fill(); ink(g, 1);
    g.fillStyle = 'rgba(200,60,60,0.7)'; g.fillRect(-10, -3, 14, 6); g.restore();
  };
  T.hemostat = g => {
    dshad(g, 32, 58, 22, 3);
    rrect(g, 10, 14, 44, 36, 4); g.fillStyle = '#f0ece0'; g.fill(); ink(g, 1.2);
    g.fillStyle = '#d0c4a0'; g.fillRect(10, 26, 44, 12); g.fillStyle = '#c03030'; g.fillRect(28, 18, 8, 8); g.fillRect(24, 20, 16, 4);
  };
  T.exo_legs = g => {
    dshad(g, 32, 60, 20, 2.5); g.lineCap = 'round';
    for (const s of [-1, 1]) { const x = 32 + s * 10; g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 6; g.beginPath(); g.moveTo(x, 6); g.lineTo(x + s * 2, 30); g.lineTo(x, 54); g.stroke(); g.strokeStyle = '#8a94a0'; g.lineWidth = 4; g.stroke(); g.fillStyle = '#c8a040'; g.beginPath(); g.arc(x + s * 2, 30, 4.5, 0, 7); g.fill(); ink(g, 1); box(g, x - 4 - s * 3, 14, 6, 10, '#3a3e44'); g.strokeStyle = '#3a3e44'; g.lineWidth = 3; g.beginPath(); g.moveTo(x - 6, 57); g.lineTo(x + 6, 57); g.stroke(); }
    g.strokeStyle = '#5a6068'; g.lineWidth = 4; g.beginPath(); g.moveTo(20, 6); g.lineTo(44, 6); g.stroke(); g.lineCap = 'butt';
  };
  T.knee_gen = g => {
    dshad(g, 32, 60, 16, 2.5); g.lineCap = 'round';
    g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 7; g.beginPath(); g.moveTo(30, 4); g.lineTo(34, 32); g.lineTo(28, 60); g.stroke(); g.strokeStyle = '#8a94a0'; g.lineWidth = 5; g.stroke(); g.lineCap = 'butt';
    for (const y of [12, 50]) { g.fillStyle = '#3a3e44'; g.fillRect(20, y, 24, 5); }
    g.beginPath(); g.arc(34, 32, 11, 0, 7); g.fillStyle = met(g, 23, 21, 23, 43, '#c8a040'); g.fill(); ink(g, 1.2);
    g.fillStyle = '#5a4a20'; for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; g.fillRect(34 + Math.cos(a) * 10 - 1.5, 32 + Math.sin(a) * 10 - 1.5, 3, 3); }
    g.beginPath(); g.arc(34, 32, 4, 0, 7); g.fillStyle = '#3a3e44'; g.fill();
  };
  T.arm_brace = g => {
    dshad(g, 32, 58, 22, 3);
    g.save(); g.translate(32, 32); g.rotate(-0.6);
    rrect(g, -24, -9, 48, 18, 8); g.fillStyle = lgr(g, 0, -9, 0, 9, '#9aa4b0', '#4a5460'); g.fill(); ink(g, 1.2);
    g.fillStyle = '#2a2d31'; for (const x of [-14, 0, 14]) g.fillRect(x - 2.5, -10, 5, 20);
    g.fillStyle = '#c8a040'; g.beginPath(); g.arc(-24, 0, 5, 0, 7); g.fill(); ink(g, 1); g.restore();
  };
  T.sentry_arm = g => {
    dshad(g, 32, 58, 22, 3); g.lineCap = 'round';
    g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 7; g.beginPath(); g.moveTo(10, 52); g.lineTo(20, 30); g.lineTo(34, 24); g.stroke(); g.strokeStyle = '#7a8088'; g.lineWidth = 5; g.stroke(); g.lineCap = 'butt';
    for (const [x, y] of [[20, 30], [10, 52]]) { g.beginPath(); g.arc(x, y, 4, 0, 7); g.fillStyle = '#c8a040'; g.fill(); ink(g, 1); }
    box(g, 30, 16, 18, 14, '#3a3e44', 3); g.fillStyle = lgr(g, 0, 20, 0, 25, '#6a7078', '#1e2024'); g.fillRect(48, 20, 12, 4); g.fillStyle = '#c03030'; g.beginPath(); g.arc(36, 23, 2, 0, 7); g.fill();
  };
  T.drill_arm = g => {
    dshad(g, 32, 58, 22, 3); g.lineCap = 'round';
    g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 7; g.beginPath(); g.moveTo(10, 52); g.lineTo(20, 30); g.lineTo(30, 26); g.stroke(); g.strokeStyle = '#d8a030'; g.lineWidth = 5; g.stroke(); g.lineCap = 'butt';
    box(g, 26, 18, 14, 16, '#3a3e44', 3);
    g.beginPath(); g.moveTo(40, 20); g.lineTo(62, 26); g.lineTo(40, 32); g.closePath(); g.fillStyle = lgr(g, 40, 20, 40, 32, '#e0e4e8', '#6a7078'); g.fill(); ink(g, 1);
    g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 1; for (let x = 43; x < 58; x += 4) { g.beginPath(); g.moveTo(x, 21 + (x - 40) * 0.27); g.lineTo(x + 3, 31 - (x - 40) * 0.27); g.stroke(); }
  };
  T.coil_turret = g => {
    dshad(g, 32, 58, 22, 3);
    poly(g, [14, 56, 50, 56, 44, 42, 20, 42]); g.fillStyle = met(g, 14, 42, 14, 56, '#4a4e54'); g.fill(); ink(g, 1);
    g.beginPath(); g.arc(32, 36, 12, 0, 7); g.fillStyle = rgr(g, 32, 36, 12, '#7a8a9a', '#2a3a4a'); g.fill(); ink(g, 1.2);
    g.save(); g.translate(32, 36); g.rotate(-0.6); g.fillStyle = '#2a2d31'; g.fillRect(0, -3, 28, 6); for (let x = 6; x < 26; x += 4.5) { g.fillStyle = lgr(g, 0, -5, 0, 5, '#f0b070', '#c87533', '#7a4018'); g.fillRect(x, -5, 3, 10); } g.restore();
  };
  T.discharge_ring = g => {
    dshad(g, 32, 58, 22, 3);
    g.beginPath(); g.arc(32, 32, 22, 0, 7); g.arc(32, 32, 13, 0, 7, true); g.fillStyle = lgr(g, 10, 10, 54, 54, '#e8e4da', '#b8b0a0'); g.fill(); ink(g, 1.2);
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28, c = Math.cos(a), s = Math.sin(a); g.strokeStyle = '#5a5e64'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(32 + c * 20, 32 + s * 20); g.lineTo(32 + c * 28, 32 + s * 28); g.stroke(); g.fillStyle = '#9ad8ff'; g.beginPath(); g.arc(32 + c * 29, 32 + s * 29, 1.8, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(140,210,255,0.25)'; g.beginPath(); g.arc(32, 32, 12, 0, 7); g.fill();
  };
  T.thermal_sight = g => {
    dshad(g, 32, 58, 22, 3);
    rrect(g, 8, 22, 42, 16, 7); g.fillStyle = lgr(g, 0, 22, 0, 38, '#5a6068', '#1e2024'); g.fill(); ink(g, 1.2);
    ell(g, 50, 30, 6, 10); g.fillStyle = '#2a2d31'; g.fill(); ink(g, 1); ell(g, 51, 30, 3.5, 7.5); g.fillStyle = lgr(g, 48, 22, 54, 38, '#e8a040', '#7a3a60'); g.fill();
    g.fillStyle = '#1e2024'; g.fillRect(18, 38, 4, 8); g.fillRect(36, 38, 4, 8); g.fillRect(14, 46, 30, 3);
    g.fillStyle = '#c03030'; g.beginPath(); g.arc(14, 30, 2, 0, 7); g.fill();
  };
  T.thermal_cam = g => {
    dshad(g, 32, 58, 20, 3);
    box(g, 12, 10, 40, 30, '#4a5a6a', 4); g.fillStyle = '#18181c'; g.fillRect(16, 14, 32, 22);
    g.fillStyle = lgr(g, 16, 14, 48, 36, '#2a2a8a', '#c03060', '#f0c040'); g.fillRect(18, 16, 28, 18);
    poly(g, [22, 40, 36, 40, 34, 58, 24, 58]); g.fillStyle = '#2a2d31'; g.fill(); ink(g, 1);
  };
  T.film_cap = g => {
    dshad(g, 32, 58, 22, 3);
    for (const x of [20, 44]) { rrect(g, x - 10, 16, 20, 34, 3); g.fillStyle = lgr(g, x - 10, 0, x + 10, 0, '#b8a860', '#f0e4a0', '#a89850'); g.fill(); ink(g, 1); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x - 6, 24, 12, 2); g.fillRect(x - 6, 28, 8, 2); g.fillStyle = '#9aa0a8'; g.fillRect(x - 6, 50, 2, 8); g.fillRect(x + 4, 50, 2, 8); }
  };
  T.ammonal_charge = g => IP.ammo(g, '#c8c8c0', () => 0.5, 'ammonal_charge');
  T.powder_charge = g => IP.ammo(g, '#4a4844', () => 0.5, 'powder_charge');
  return T;
})();
window.game = { tech: { TECH, TECHL, queueTech, curTech, techOk },
  get S() { return S; }, get W() { return W; }, get ents() { return ents; }, get patches() { return patches; }, get cam() { return cam; },
  place: (t, x, y, d) => place(t, x, y, d, true), at, buildOk, canPlace, setRecipe, removeEnt, save, load, newGame,
  step(n) { for (let i = 0; i < n; i++) tick(); render(); $('#power').innerHTML = powerHtml(); $('#vent').innerHTML = ventHtml(); renderPanelDyn(); renderHotbar(); renderQueue(); },
  terrain: () => terrain, encyOpen, eGo, drawMini, mv, mapZoom, get eHist() { return eHist; }, ACH, achCheck, ACH_CH, RANKS, achScore, rankOf, wpnCycle, wpnCur, wpnRounds, nadeThrow, armSoak, armWorn, armWear, armOff, eqPut, eqTake, eqCap, armRed, EQ, ARMOR, nades, plShoot, plHurt, dgHurt, enqueue, maxCraft, WPN, ore: (x, y) => ({ t: oreType[y * W + x], a: oreAmt[y * W + x] }),
  select(e) { e ? openPanel(e) : closePanel(); }, openModal, closeModal, refresh: renderHotbar,
  setCam(x, y, z) { cam.x = x; cam.y = y; if (z) cam.z = z; camFree = true; },
  get pl() { return S.pl; }, plMove, plShoot, keys, walkable, get camFree() { return camFree; }, carToggle, placeCar, carAt, openCar, pickCar, get trains() { return S.trains; }, placeTrain, trainAt, openTrain, openPanel, pickTrain, trainGeo, reverseTrain, railBusy, get puffs() { return puffs; }, get H() { return H; }, get wakes() { return wakes; }, floats, boatRoute, boatPilot, carStep, carHit, fishTick, fishRegrow, seaOil, seaPatch, oily, sunMul, get oreAmt() { return oreAmt; }, fground, fstock, netToggle, wdep, seaLv,
  htier, spits: () => spits, gearT, gearReset() { gearCt = -99; }, spawnBugs, hiveTier, guardStep, addHive, bugKind, maxHp, hurt, rgd: () => rgd, tileInfo0, growNear, genRegion, tch: () => tch, ovc, mapWin, depleteTile,
  dgEnter, dgExit, dgTick, dgShoot, dgMove, dgUse, dgClick, dgGrid, dgGen, dgSolid, dgSee, dgPos, spawnBurrows, mineGen, dgKind, dgCaches, spawnMines, dgDoor, spawnXdg, dgValve, broodTick, xdgAt, biome, terNear, get dfx() { return dfx; },
  rotEnt, ugPair, lists: () => lists(), wireToggle, autoWire, wired, setTool(t) { tool = t; },
  tx: { CMBI, bIcon, IP, iArch, mArch, icoClass, icoCv, mLay, mulberry32 }, setOverlay(v) { overlay = v; }, elev: () => elev, drawPreview, startWorld, get wcfg() { return wcfg; },
};
})();
