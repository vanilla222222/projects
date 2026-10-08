'use strict';
(() => {
const W = 160, H = 160, DT = 1 / 30, TP = 8;
const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
const KEY = 'chemfactory-save-v1';
const GAP = 0.25, BELT_V = 2 * DT, MINER_T = 2, PUMP_RATE = 60 * DT;
const PARTS = ['casting', 'plate', 'wire', 'motor', 'brick', 'lead_sheet', 'brass'];
const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
const tcv = document.createElement('canvas');
tcv.width = W * TP; tcv.height = H * TP;
const tctx = tcv.getContext('2d');
const $ = s => document.querySelector(s);
const panel = $('#panel'), tip = $('#tip'), modal = $('#modal'), hotbar = $('#hotbar');

let S, terrain, oreType, oreAmt, occ, ents, patches, L = null;
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
    if (terrain[i] === 1) { if (!force) continue; terrain[i] = 0; }
    oreType[i] = t;
    oreAmt[i] = Math.max(60, Math.round(rich * (1.15 - d / (r * 1.5)) * (0.7 + 0.6 * n)) + 60);
    n0++;
  }
  if (n0) patches.push({ t, x: Math.round(px), y: Math.round(py) });
}

function genMap(seed) {
  terrain = new Uint8Array(W * H); oreType = new Uint8Array(W * H); oreAmt = new Int32Array(W * H); patches = [];
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

const PAL = [['#3d5a2e', '#41602f', '#3a562b'], ['#1d4a73', '#20507b', '#1b466d'], ['#5a5135', '#5e5538', '#565033']];
function drawTile(x, y) {
  const i = y * W + x, h = hash(x, y, 7);
  tctx.fillStyle = PAL[terrain[i]][Math.floor(h * 3)];
  tctx.fillRect(x * TP, y * TP, TP, TP);
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
const RES_N = { acid: 'acid', cl: 'chlorides', alk: 'caustic' };
const resName = r => r.split(' ').map(k => RES_N[k]).join(', ');
const resists = (P, f) => !f || !FLUIDS[f].ck || (P.res || '').split(' ').includes(FLUIDS[f].ck);
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
  }
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
  let ore = false;
  for (let j = 0; j < B.h; j++) for (let i = 0; i < B.w; i++) {
    const k = (y + j) * W + x + i;
    if (occ[k]) return 'Something is in the way';
    if (type === 'pump') { if (terrain[k] !== 1) return 'Offshore pumps must go on water'; }
    else if (terrain[k] === 1) return 'Cannot build on water';
    if (oreType[k]) ore = true;
  }
  if (type === 'miner' && !ore) return 'A miner needs ore under it';
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
  if (sel === e.id) closePanel();
}

function lists() {
  if (L) return L;
  L = { belt: [], sorter: [], node: [], pump: [], machine: [], miner: [], chest: [], engine: [], booster: [] };
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

function setRecipe(e, id) {
  if (e.recipe === id) return;
  if (e.cy && e.recipe && RECIPE[e.recipe].i) for (const k in RECIPE[e.recipe].i) give(k, RECIPE[e.recipe].i[k]);
  for (const k in e.inv) give(k, e.inv[k]);
  e.inv = {}; e.fi = {}; e.cy = false; e.prog = 0;
  for (const f in e.fo) if (!e.fo[f] || isGas(f)) delete e.fo[f];
  e.recipe = id || null;
}

function acceptItem(o, k) {
  const kd = kind(o);
  if (kd === 'chest') {
    if (sum(o.store) >= 400) return false;
    o.store[k] = (o.store[k] || 0) + 1;
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
      r = RECIPES.find(q => q.b === o.type && q.i && q.i[k]);
      if (!r) return false;
      setRecipe(o, r.id);
    }
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
  if (e.tw > P.tmax) fails.push([e, P.lined ? `lead lining melted at ${Math.round(e.tw)}°C` : `failed at ${Math.round(e.tw)}°C`]);
  const corr = e.fl && e.amt > 0.5 && !resists(P, e.fl) && FLUIDS[e.fl].corr;
  if (corr) { e.wear += corr * DT / 90; if (e.wear >= 1) fails.push([e, `corroded through by ${nm(e.fl)}`]); }
}

const fx = [];
function burst(e, why) {
  if (!ents.has(e.id)) return;
  if (e.fl && e.amt > 0.01) S.spill[e.fl] = (S.spill[e.fl] || 0) + e.amt;
  unlink(e);
  if (sel === e.id) closePanel();
  fx.push({ x: e.x + 0.5, y: e.y + 0.5, t: 0, c: e.fl ? col(e.fl) : '#ccc' });
  S.fails = (S.fails || 0) + 1;
  return `${BUILD[e.type].n} at ${e.x},${e.y} ${why}`;
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
      if (o && isNode(o) && o.fl === f && o.amt > 0) {
        const g = Math.min(room, o.amt);
        o.amt -= g; e.fi[f] = (e.fi[f] || 0) + g;
      }
    }
  }
}

function fluidToMachine(o, f, a) {
  const r = RECIPE[o.recipe];
  if (!r || !r.fi || !r.fi[f]) return 0;
  const g = Math.min(fiCap(r, f) - (o.fi[f] || 0), a);
  if (g <= 0) return 0;
  o.fi[f] = (o.fi[f] || 0) + g;
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

function tryStart(e, r) {
  if (r.i) for (const k in r.i) if ((e.inv[k] || 0) < r.i[k]) return 'input';
  if (r.fi) for (const f in r.fi) if ((e.fi[f] || 0) < r.fi[f] - 1e-6) return 'input';
  if (r.o) for (const k in r.o) if ((e.out[k] || 0) + r.o[k] > outCap(r, k)) return 'output';
  if (r.ch) for (const k in r.ch) if ((e.out[k] || 0) + 1 > outCap(r, k)) return 'output';
  if (r.fo) for (const f in r.fo) if (!spills(r, f) && (e.fo[f] || 0) + r.fo[f] > foCap(r, f)) return 'output';
  if (r.i) for (const k in r.i) { e.inv[k] -= r.i[k]; if (!e.inv[k]) delete e.inv[k]; }
  if (r.fi) for (const f in r.fi) e.fi[f] -= r.fi[f];
  e.cy = true;
  return null;
}

function finish(e, r) {
  e.cy = false; e.prog = 0;
  if (r.o) for (const k in r.o) { e.out[k] = (e.out[k] || 0) + r.o[k]; S.made[k] = (S.made[k] || 0) + r.o[k]; }
  if (r.ch) for (const k in r.ch) if (Math.random() < r.ch[k]) { e.out[k] = (e.out[k] || 0) + 1; S.made[k] = (S.made[k] || 0) + 1; }
  if (r.fo) for (const f in r.fo) {
    e.fo[f] = (e.fo[f] || 0) + r.fo[f];
    const cap = foCap(r, f);
    if (spills(r, f) && e.fo[f] > cap) { S.vent[f] = (S.vent[f] || 0) + e.fo[f] - cap; e.fo[f] = cap; }
  }
}

function minerOre(e) {
  for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) if (oreType[(e.y + j) * W + e.x + i]) return true;
  return false;
}
function minerDig(e) {
  for (let t = 0; t < 4; t++) {
    const q = (e.k + t) % 4, i = (e.y + (q >> 1)) * W + e.x + (q & 1);
    if (!oreType[i]) continue;
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
  for (const b of l.belt) beltTick(b);
  for (const s of l.sorter) sorterTick(s);
  for (const p of l.pump) pumpTick(p);
  for (const e of l.booster) boosterTick(e);
  fluidStep(l.pairs);
  const fails = [];
  for (const e of l.node) nodeHeat(e, fails);
  const msgs = fails.map(([e, why]) => burst(e, why)).filter(Boolean);
  if (msgs.length) toast(msgs[0] + (msgs.length > 1 ? ` (+${msgs.length - 1} more)` : ''), true);
  let demand = 0;
  for (const e of l.booster) if (e.on) demand += BUILD.booster.kw;
  for (const e of l.machine) {
    const r = RECIPE[e.recipe];
    if (!r) { e.st = 'none'; continue; }
    machineFluidIn(e, r);
    if (!e.cy) e.st = tryStart(e, r) || 'work';
    if (e.cy && BUILD[e.type].kw) demand += BUILD[e.type].kw;
  }
  for (const e of l.miner) {
    e.cy = sum(e.out) < 5 && minerOre(e);
    e.st = e.cy ? 'work' : minerOre(e) ? 'output' : 'empty';
    if (e.cy) demand += BUILD.miner.kw;
  }
  let cap = 0;
  for (const g of l.engine) { g.eff = g.amt > 0.01 && g.tf >= 99.9 ? 0.2 + 0.8 * Math.max(0, Math.min(1, (g.tf - 100) / 50)) : 0; g.cap = Math.min(1, g.amt) * 900 * g.eff; cap += g.cap; }
  const gen = Math.min(demand, cap), sat = demand > 0 ? gen / demand : 1;
  for (const g of l.engine) { g.kw = cap > 0 ? gen / cap * g.cap : 0; g.amt = Math.max(0, g.amt - (g.eff > 0 ? g.kw / 900 / g.eff : 0)); }
  S.power = { gen, demand, cap, sat };
  for (const e of l.booster) e.sat = sat;
  for (const e of l.machine) {
    if (!e.cy) continue;
    const r = RECIPE[e.recipe], kw = BUILD[e.type].kw;
    const sp = kw ? sat : 1;
    if (kw && sat < 0.05) e.st = 'power';
    e.prog += DT * sp / r.t;
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
  for (const e of l.chest) pushItems(e, e.store, 'chest');
  if (mining) {
    const i = mining.y * W + mining.x;
    if (!mouse.l || tool || !oreType[i] || occ[i] || mouse.tx !== mining.x || mouse.ty !== mining.y) mining = null;
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
    delete o.per; delete o.st; delete o.cap; delete o.on; delete o.mv; delete o.ss; delete o.eff;
    es.push(o);
  }
  return JSON.stringify({ v: 1, seed: S.seed, inv: S.inv, dep: S.dep, vent: S.vent, spill: S.spill, fails: S.fails, made: S.made, t: S.t, nextId: S.nextId, cam, help: S.help, ents: es });
}
function save() { try { localStorage.setItem(KEY, serialize()); } catch (e) { } }

function initWorld(seed) {
  genMap(seed);
  occ = new Int32Array(W * H);
  ents = new Map();
  L = null;
}

function newGame(seed) {
  seed = seed == null ? Math.floor(Math.random() * 1e9) : seed;
  closePanel(); fx.length = 0; $('#toast').innerHTML = '';
  S = { seed, inv: Object.assign({}, START_INV), dep: {}, vent: {}, spill: {}, fails: 0, made: {}, t: 0, nextId: 1, help: !!(S && S.help), power: { gen: 0, demand: 0, cap: 0, sat: 1 } };
  initWorld(seed);
  cam = { x: W / 2, y: H / 2, z: 32 };
  tool = null; sel = null;
  drawTerrain();
}

function load() {
  let d;
  try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) { d = null; }
  if (!d || d.v !== 1) return false;
  closePanel(); fx.length = 0; $('#toast').innerHTML = '';
  S = { seed: d.seed, inv: d.inv || {}, dep: d.dep || {}, vent: d.vent || {}, spill: d.spill || {}, fails: d.fails || 0, made: d.made || {}, t: d.t || 0, nextId: d.nextId || 1, help: !!d.help, power: { gen: 0, demand: 0, cap: 0, sat: 1 } };
  initWorld(d.seed);
  for (const k in S.dep) { const i = +k; oreAmt[i] = S.dep[k]; if (oreAmt[i] <= 0) { oreAmt[i] = 0; oreType[i] = 0; } }
  for (const o of d.ents || []) {
    if (!BUILD[o.type]) continue;
    const e = Object.assign(makeEnt(o.type, o.x, o.y, o.dir), o);
    addEnt(e);
    S.nextId = Math.max(S.nextId, e.id + 1);
  }
  if (d.cam) cam = d.cam;
  drawTerrain();
  return true;
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

const ST_COL = { work: '#5fd06a', input: '#e0b84a', output: '#e07a3a', power: '#e04a4a', none: '#8a8f99', empty: '#8a8f99' };
const ST_TXT = { work: 'Working', input: 'Waiting for inputs', output: 'Output full', power: 'No power', none: 'No recipe set', empty: 'Ore depleted' };

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

function drawOverlay(vis, ox, oy, z) {
  ctx.font = `bold ${Math.max(8, Math.floor(z * 0.26))}px system-ui,sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const e of vis) {
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
  const lbl = overlay === 1 ? ['Pressure (share of rating)', '0', 'rated', 'red = over rating'] : ['Fluid temperature °C', '0', '400', ''];
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

function drawBuilding(e, ox, oy, z) {
  const B = BUILD[e.type], x = ox + e.x * z, y = oy + e.y * z, w = B.w * z, h = B.h * z, p = Math.max(1, z * 0.06);
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
  if (z >= 14 && B.ab && e.type !== 'engine') {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.font = `bold ${Math.floor(Math.min(w, h) * 0.26)}px system-ui,sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(B.ab, x + w / 2, y + h / 2);
  }
  if (kind(e) === 'machine' && e.recipe) {
    const r = RECIPE[e.recipe], k = Object.keys(r.o || r.fo)[0];
    const s = Math.max(4, z * 0.32);
    ctx.fillStyle = '#111';
    ctx.fillRect(x + p * 3 - 1, y + p * 3 - 1, s + 2, s + 2);
    ctx.fillStyle = col(k);
    ctx.fillRect(x + p * 3, y + p * 3, s, s);
  }
  if ((kind(e) === 'machine' || kind(e) === 'miner') && e.st) {
    if (e.cy) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(x + p * 3, y + h - p * 3 - z * 0.12, w - p * 6, z * 0.12);
      ctx.fillStyle = '#7fe08a';
      ctx.fillRect(x + p * 3, y + h - p * 3 - z * 0.12, (w - p * 6) * Math.min(1, e.prog), z * 0.12);
    }
    const st = e.cy && e.st !== 'power' ? 'work' : e.st;
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
  const e = at(x, y);
  if (e) {
    const B = BUILD[e.type];
    let s = `<b>${B.n}</b>`;
    if (kind(e) === 'machine') s += `<br>${e.recipe ? RECIPE[e.recipe].n : 'No recipe'} · ${ST_TXT[e.cy && e.st !== 'power' ? 'work' : e.st] || ''}`;
    if (kind(e) === 'pipe') s += `<br>${e.fl && e.amt > 0.01 ? nm(e.fl) + ' · ' + pres(e).toFixed(1) + ' bar · ' + Math.round(e.tf) + '°C' : 'Empty' + (e.fl ? ' (' + nm(e.fl) + ')' : '')}<br><span class="dim">${NP(e).mat}, DN${NP(e).dn}, rated ${NP(e).bar} bar</span>`;
    if (e.type === 'engine') s += `<br>${Math.round(e.kw)} kW · steam ${pres(e).toFixed(1)} bar · ${Math.round(e.tf)}°C`;
    if (e.type === 'booster') s += `<br>Outlet ${e.head} bar · ${Math.round(e.fr)}/s`;
    if (e.type === 'belt' && e.items.length) s += `<br>${e.items.map(i => nm(i.i)).join(', ')}`;
    if (e.type === 'chest') s += `<br>${sum(e.store)}/400 items`;
    return s;
  }
  const i = y * W + x;
  if (oreType[i]) return `<b>${nm(ORES[oreType[i]].item)}</b><br>${fmt(oreAmt[i])} left · <span class="dim">${ITEMS[ORES[oreType[i]].item].f}</span><br><span class="dim">Click and hold to mine by hand</span>`;
  return terrain[i] === 1 ? '<b>Water</b>' : '';
}

function powerHtml() {
  const p = S.power;
  const pct = Math.round(p.sat * 100);
  const cls = p.demand === 0 ? '' : pct >= 99 ? 'ok' : pct > 40 ? 'warn' : 'bad';
  return `<span class="lbl">Power</span><b class="${cls}">${fmt(p.gen)}</b> / ${fmt(p.demand)} kW <span class="dim">(cap ${fmt(p.cap)})</span> <span class="${cls}">${p.demand ? pct + '%' : 'idle'}</span>`;
}
function ventHtml() {
  const t = sum(S.vent);
  const parts = Object.keys(S.vent).filter(f => S.vent[f] >= 1).map(f => `${nm(f)} ${fmt(S.vent[f])}`).join(', ');
  const sp = sum(S.spill || {});
  return `<span class="lbl">Vented</span><b class="${t > 0 ? 'warn' : ''}">${fmt(t)}</b>` + (parts ? `<span class="dim"> · ${parts}</span>` : '') +
    (sp >= 1 || S.fails ? ` <span class="lbl">Spilled</span><b class="bad">${fmt(sp)}</b><span class="dim"> · ${S.fails || 0} pipe failures</span>` : '');
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
  if (kind(e) === 'machine') {
    h += `<label class="row">Recipe <select data-act="recipe"><option value="">Choose a recipe</option>${RECIPES.filter(r => r.b === e.type).map(r => `<option value="${r.id}" ${e.recipe === r.id ? 'selected' : ''}>${r.n}</option>`).join('')}</select></label>`;
  }
  if (e.type === 'sorter') {
    h += `<label class="row">Filter <select data-act="filter"><option value="">None (all forward)</option>${Object.keys(ITEMS).map(k => `<option value="${k}" ${e.filter === k ? 'selected' : ''}>${ITEMS[k].n}</option>`).join('')}</select></label>`;
  }
  h += '<div id="pdyn"></div><div class="pbtns">';
  if (kind(e) === 'machine') h += '<button data-act="insert">Insert from inventory</button><button data-act="take">Take outputs</button>';
  if (e.type === 'miner') h += '<button data-act="take">Take ore</button>';
  if (e.type === 'chest') h += '<button data-act="takeall">Take all</button><button data-act="store">Store raw materials</button>';
  if (e.type === 'booster') h += `<label class="row">Outlet pressure <select data-act="head">${HEADS.concat(e.head).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b).map(v => `<option value="${v}" ${e.head === v ? 'selected' : ''}>${v} bar</option>`).join('')}</select></label>`;
  if (kind(e) === 'pipe') h += '<button data-act="flush">Flush network</button>';
  if (e.type === 'belt' || e.type === 'sorter' || e.type === 'booster') h += '<button data-act="rotate">Rotate (R)</button>';
  h += '<button class="danger" data-act="remove">Pick up</button></div>';
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
    (r.eq ? `<div class="eq">${r.eq}</div>` : '') + (r.note ? `<div class="note">${r.note}</div>` : '');
}

function bar(v, max, c) {
  return `<span class="bar"><i style="width:${Math.min(100, v / max * 100)}%;background:${c}"></i></span>`;
}

function renderPanelDyn() {
  const e = sel && ents.get(sel), box = document.getElementById('pdyn');
  if (!e || !box) return;
  let h = '';
  const k = kind(e);
  if (k === 'machine') {
    const r = RECIPE[e.recipe];
    if (!r) h += '<p class="dim">Pick a recipe, or feed it an item and it will choose one.</p>';
    else {
      h += recipeHtml(r);
      const st = e.cy && e.st !== 'power' ? 'work' : e.st;
      h += `<div class="status"><i style="background:${ST_COL[st]}"></i>${e.type === 'boiler' && st === 'output' ? 'Steam full, waiting for demand' : ST_TXT[st] || ''}${BUILD[e.type].kw ? ` · ${BUILD[e.type].kw} kW` : ' · fuel-fired'}</div>`;
      h += `<div class="prog">${bar(e.cy ? e.prog : 0, 1, '#7fe08a')}</div>`;
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
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { const q = (e.y + j) * W + e.x + i; if (oreType[q]) ores[ORES[oreType[q]].item] = (ores[ORES[oreType[q]].item] || 0) + oreAmt[q]; }
    h += `<div class="status"><i style="background:${ST_COL[e.st] || '#888'}"></i>${ST_TXT[e.st] || ''} · 90 kW</div><div class="prog">${bar(e.prog, 1, '#7fe08a')}</div>`;
    h += '<div class="sec">Ore underneath</div><div class="slots">' + (Object.keys(ores).map(q => `<div class="slot">${chip(q, fmt(ores[q]))}</div>`).join('') || '<span class="dim">None</span>') + '</div>';
    h += '<div class="sec">Output</div><div class="slots">' + (Object.keys(e.out).map(q => `<div class="slot">${chip(q, e.out[q])}</div>`).join('') || '<span class="dim">Empty</span>') + '</div>';
    h += '<p class="dim">Outputs onto any touching belt that does not point into it, or into chests and machines.</p>';
  } else if (k === 'chest') {
    h += `<div class="sec">Contents ${sum(e.store)}/400</div><div class="slots">` + (Object.keys(e.store).map(q => `<div class="slot">${chip(q, e.store[q])}</div>`).join('') || '<span class="dim">Empty</span>') + '</div>';
  } else if (k === 'pipe') {
    const P = NP(e), p = pres(e);
    h += `<div class="spec">${P.mat} · DN${P.dn} · rated ${P.bar} bar · max ${P.tmax}°C · ${P.duct ? 'ductile' : 'brittle'}${P.res ? ' · resists ' + resName(P.res) : ''}</div>`;
    h += `<div class="slots"><div class="slot">${e.fl ? chip(e.fl, Math.round(e.amt) + '/' + P.v, 'fl') + bar(e.amt, P.v, col(e.fl)) : '<span class="dim">Empty, no fluid assigned</span>'}</div></div>`;
    h += `<div class="gauge"><span>Pressure</span>${bar(p, P.bar, p > P.bar ? '#e04a4a' : p > P.bar * 0.8 ? '#e0b84a' : '#5fd06a')}<b>${p.toFixed(1)} / ${P.bar} bar</b></div>`;
    h += `<div class="gauge"><span>Flow</span>${bar(e.fr, P.q, '#6ab0e0')}<b>${Math.round(e.fr)} / ${P.q} per s</b></div>`;
    h += `<div class="gauge"><span>Fluid</span>${bar(e.tf, P.tmax, heat(e.tf, 0, 400))}<b>${Math.round(e.tf)}°C</b></div>`;
    h += `<div class="gauge"><span>Wall</span>${bar(e.tw, P.tmax, heat(e.tw, 0, 400))}<b>${Math.round(e.tw)} / ${P.tmax}°C</b></div>`;
    if (P.shock) h += `<div class="gauge"><span>Thermal stress</span>${bar(e.ss || 0, P.shock, '#e07a3a')}<b>${Math.round(e.ss || 0)} / ${P.shock}</b></div>`;
    if (P.duct) h += `<div class="gauge"><span>Bulging</span>${bar(e.strain, P.duct, '#e04a4a')}<b>${Math.round(e.strain / P.duct * 100)}%</b></div>`;
    if (e.wear > 0 || !resists(P, e.fl)) h += `<div class="gauge"><span>Corrosion</span>${bar(e.wear, 1, '#9a4a1a')}<b>${Math.round(e.wear * 100)}%</b></div>`;
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
  } else if (k === 'pump') {
    h += `<div class="status"><i style="background:${e.on ? ST_COL.work : ST_COL.output}"></i>${e.on ? 'Pumping' : 'Nothing to pump into'}</div>`;
  } else if (k === 'belt') {
    h += '<div class="slots">' + (e.items.map(q => `<div class="slot">${chip(q.i)}</div>`).join('') || '<span class="dim">Empty</span>') + '</div>';
  } else if (k === 'sorter') {
    h += `<div class="slots"><div class="slot">${e.buf ? chip(e.buf) : '<span class="dim">Empty</span>'}</div></div><p class="dim">Filtered item goes straight on. Everything else turns right.</p>`;
  }
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
    toast(moved ? `Inserted ${moved} items` : r.i ? 'You have none of the inputs' : 'This recipe only uses fluids', !moved);
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
  else if (act === 'remove') { removeEnt(e); renderHotbar(); return; }
  renderPanelDyn();
  renderHotbar();
}

function canAfford(cost, n) { for (const k in cost) if ((S.inv[k] || 0) < cost[k] * n) return false; return true; }
function pay(cost, n) { for (const k in cost) { S.inv[k] -= cost[k] * n; if (!S.inv[k]) delete S.inv[k]; } }
function costHtml(cost, n) { return Object.keys(cost).map(k => chip(k, cost[k] * n, (S.inv[k] || 0) >= cost[k] * n ? 'have' : 'need')).join(''); }

let modalHtml = '';
function openModal(kind, tab) {
  modalKind = kind;
  modalTab = tab || (kind === 'craft' ? 'build' : kind === 'ency' ? 'chains' : 'help');
  modal.hidden = false;
  renderModal();
}
function closeModal() { modal.hidden = true; modalKind = null; }

const TABS = {
  craft: [['build', 'Buildings'], ['parts', 'Parts'], ['inv', 'Inventory']],
  ency: [['chains', 'Ore chains'], ['recipes', 'Recipes'], ['mats', 'Materials'], ['pipes', 'Pipes']],
  help: [['help', 'How to play']],
};

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
        const ok = canAfford(B.cost, 1), ok5 = canAfford(B.cost, 5);
        h += `<div class="crow"><span class="sw" style="background:${B.c}">${B.ab || ''}</span><div class="cinfo"><b>${B.n}</b> <span class="dim">have ${S.inv[t] || 0}${B.makes ? ' · makes ' + B.makes : ''}</span><div class="cost">${costHtml(B.cost, 1)}</div></div><button data-craft="${t}" data-n="1" ${ok ? '' : 'disabled'}>Craft</button><button data-craft="${t}" data-n="5" ${ok5 ? '' : 'disabled'}>×5</button></div>`;
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
      for (const line of c.l) h += `<div class="cl">${line.map(s => typeof s === 'string' ? (ITEMS[s] || FLUIDS[s] ? chip(s) : `<span class="via">${s}</span>`) : `<span class="via">${s[0]}</span>`).join('<span class="arr">→</span>').split('<span class="arr">→</span><span class="via">+</span><span class="arr">→</span>').join('<span class="arr">+</span>')}</div>`;
      h += `<p class="note">${c.d}</p></div>`;
    }
  } else if (modalTab === 'recipes') {
    for (const t in BUILD) {
      const rs = RECIPES.filter(r => r.b === t);
      if (!rs.length) continue;
      const B = BUILD[t];
      h += `<h3><span class="sw" style="background:${B.c}">${B.ab}</span> ${B.n}${B.kw ? ` <span class="dim">${B.kw} kW</span>` : ' <span class="dim">fuel-fired</span>'}</h3>`;
      for (const r of rs) h += `<div class="erec"><b>${r.n}</b>${recipeHtml(r)}</div>`;
    }
  } else if (modalTab === 'mats') {
    h += '<h3>Ores</h3><div class="mats">';
    for (let t = 1; t < ORES.length; t++) { const k = ORES[t].item; h += `<div class="mat">${chip(k)}<span>${ITEMS[k].f}</span></div>`; }
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
      h += `<tr><td>${chip(t)}<br><span class="dim">${P.mat}</span></td><td>DN${P.dn}</td><td>${P.bar} bar</td><td>${P.q}/s</td><td>${P.tmax}°C</td><td>${P.duct ? 'Bulges, then ruptures' : 'Cracks at once; thermal shock'}</td><td>${P.res ? resName(P.res) : 'Nothing'}</td></tr>`;
    }
    h += '</table><h3>How pipes fail</h3><ul class="plist">';
    h += '<li><b>Overpressure.</b> Brittle grey cast iron fractures the moment it passes its rating. Ductile steel yields and bulges first, and only ruptures if it stays overpressured. A bulge never goes back. Lead-lined pipe is rated 6 bar, so feed it from machines (5 bar), never straight from an 8 bar offshore pump.</li>';
    h += '<li><b>Thermal shock.</b> Cast iron cannot stretch. A cold fluid hitting a hot wall shrinks the inner surface and puts it in tension, and cast iron is weak in tension, so it cracks. Hot fluid into a cold pipe squeezes the surface instead, which cast iron tolerates about three times better. Cold water into a hot steam line is the classic way to crack it.</li>';
    h += '<li><b>Heat.</b> Every pipe has a top temperature. Lead softens far below steel.</li>';
    h += '<li><b>Corrosion.</b> Dilute sulfuric acid eats iron and steel (Fe + H₂SO₄ → FeSO₄ + H₂). Lead forms an insoluble PbSO₄ skin and stops corroding, which is why acid plants were lined with lead. But caustic soda dissolves lead as plumbite, so caustic and aluminate liquor go in steel. Brine and wet chlorine pit iron and steel; titanium\'s TiO₂ film shrugs them off, though hot sulfuric acid strips it. Match the pipe to the fluid: hover a fluid in the Materials tab to see what attacks what.</li>';
    h += '<li><b>Heat loss.</b> Pipes lose heat to the air. Steam cools along a long line and condenses below 100°C, so engines far from boilers make less power.</li>';
    h += '</ul><p class="dim">A failed pipe is destroyed and its contents spill. Press V for pressure and temperature overlays.</p>';
  } else if (modalTab === 'help') {
    h += HELP;
  }
  if (modalHtml !== h) { body.innerHTML = h; modalHtml = h; body.scrollTop = st; }
}

const CHAINS = [
  { n: 'Power', l: [['Offshore pump', 'water', 'Boiler + coal', 'steam', 'Steam engine']], d: 'Pumps go on water. Pipe the water into a boiler, give it coal by hand or belt, and let the steam reach an engine (touching or by pipe). One engine gives 900 kW from 30 steam/s. Furnaces and ovens burn fuel and need no power.' },
  { n: 'Iron', l: [['iron_ore', 'Crusher', 'crushed_iron', 'Ball mill + water', 'ground_iron', 'Magnetic separator', 'iron_conc'], ['iron_conc', 'Blast furnace + coke + crushed limestone', 'pig_iron', 'Converter', 'steel']], d: 'Banded iron ore is only about a third iron. Crushing and grinding free the iron mineral grains from the quartz, the magnet pulls them out, and the blast furnace strips the oxygen with carbon monoxide from burning coke.' },
  { n: 'Copper', l: [['copper_ore', 'Crusher', 'crushed_copper', 'Ball mill + water', 'ground_copper', 'Flotation + water', 'copper_conc'], ['copper_conc', 'Roaster', 'copper_calcine', 'Flash smelter + sand', 'copper_matte', 'Converter', 'blister_copper'], ['blister_copper', 'Electrolysis + acid', 'copper_cathode']], d: 'Copper sits in chalcopyrite, a copper-iron sulfide. Roasting burns off part of the sulfur as SO₂, silica slags off the iron, the converter burns the rest of the sulfur, and electrolysis gives 99.99% copper.' },
  { n: 'Lead and zinc', l: [['pbzn_ore', 'Crusher', 'crushed_pbzn', 'Ball mill + water', 'ground_pbzn', 'Flotation (lead)', 'galena_conc'], ['galena_conc', 'Roaster', 'lead_oxide', 'Blast furnace + coke', 'lead'], ['zinc_rougher', 'Flotation (zinc)', 'sphalerite_conc', 'Roaster', 'zinc_calcine'], ['zinc_calcine', 'Leach tank + acid', 'znso4', 'Electrolysis', 'zinc']], d: 'Galena and sphalerite grow together. Lead floats first while the zinc mineral is held down, then the leftover zinc rougher is floated again. Zinc electrowinning returns the sulfuric acid to the leach tank.' },
  { n: 'Fuel and flux', l: [['coal', 'Coke oven', 'coke'], ['limestone', 'Crusher', 'crushed_lime'], ['limestone', 'Lime kiln + coal', 'quicklime'], ['sand', 'Workshop + quicklime', 'brick']], d: 'Coke is the fuel and reducing agent of the blast furnace. Crushed limestone is the flux that turns quartz into slag. Quicklime and sand make refractory bricks for furnaces.' },
  { n: 'Sulfuric acid', l: [['so2', 'Acid plant + water', 'acid']], d: 'Every roaster and the copper converter give off SO₂. Pipe it to an acid plant instead of venting it. The acid feeds copper refining and zinc leaching.' },
  { n: 'Salt and chlorine', l: [['rock_salt', 'Crusher', 'salt', 'Leach tank + water', 'brine'], ['brine', 'Electrolysis (chlor-alkali)', 'cl2', '+', 'naoh', '+', 'h2'], ['salt', 'Electrolysis (Downs cell)', 'sodium', '+', 'cl2'], ['h2', 'Boiler + water', 'steam']], d: 'Splitting brine gives three products at once: chlorine, caustic soda and hydrogen. Chlorine and brine pit steel, so use lead-lined or titanium pipe; caustic eats lead, so use steel. Burn the spare hydrogen in a boiler.' },
  { n: 'Aluminium', l: [['bauxite', 'Crusher', 'crushed_bauxite', 'Digester + naoh + steam', 'liquor', 'Precipitator', 'al_hydroxide'], ['al_hydroxide', 'Lime kiln + coal', 'alumina', 'Reduction pot + anode', 'aluminium'], ['coke', 'Coke oven', 'anode']], d: 'The Bayer process dissolves alumina in hot caustic, leaving iron oxides behind as red mud, then precipitates it again and returns the caustic. The Hall-Héroult pot needs 600 kW: aluminium is "solid electricity". Gallium turns up in the liquor now and then.' },
  { n: 'Mineral sands and titanium', l: [['mineral_sand', 'Gravity spiral + water', 'heavy_conc', 'Magnetic separator', 'ilmenite'], ['nonmag', 'Electrostatic separator', 'rutile', '+', 'zircon'], ['ilmenite', 'Arc furnace + coke', 'ti_slag', '+', 'pig_iron'], ['rutile', 'Chlorinator + coke + cl2', 'ticl4', 'Hunter retort + sodium', 'titanium']], d: 'Black beach sand holds titanium and zirconium minerals. Gravity, magnetism and static charge split them. Titanium dioxide is too stable to reduce with carbon, so it goes through chlorine: TiCl₄ meets molten sodium, and the salt that results goes back to the Downs cell. Titanium makes pipe that laughs at chlorine.' },
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
<li><b>E</b> opens crafting. <b>H</b> opens the encyclopedia. <b>V</b> cycles the pressure and temperature overlays.</li>
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
<p class="dim">Gases like CO₂ and SO₂ are vented into the air when nothing collects them. The top bar counts it.</p>
</div>`;

function doCraft(t, n) {
  const B = BUILD[t];
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
    if (e) { removeEnt(e); renderHotbar(); }
    else if (tool) { tool = null; renderHotbar(); }
    return;
  }
  if (ev.button !== 0) return;
  mouse.l = true;
  if (tool) {
    const r = placeAt(mouse.fx, mouse.fy);
    if (typeof r === 'string') { toast(r, true); return; }
    if (BUILD[r.type].kind === 'belt' || BUILD[r.type].kind === 'pipe') drag = { x: r.x, y: r.y, last: r.id };
    return;
  }
  const e = at(mouse.tx, mouse.ty);
  if (e) { openPanel(e); return; }
  closePanel();
  const i = mouse.ty * W + mouse.tx;
  if (mouse.tx >= 0 && mouse.ty >= 0 && mouse.tx < W && mouse.ty < H && oreType[i]) mining = { x: mouse.tx, y: mouse.ty, p: 0 };
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
  else if (k === 'escape' || k === 'q') { if (modalKind) closeModal(); else if (tool) { tool = null; renderHotbar(); } else closePanel(); }
  else if (k === 'r') {
    if (tool) toolDir = (toolDir + 1) % 4;
    else { const e = at(mouse.tx, mouse.ty); if (e && (e.type === 'belt' || e.type === 'sorter' || e.type === 'booster')) e.dir = (e.dir + 1) % 4; }
  }
  else if (k === 'v') { overlay = (overlay + 1) % 3; toast(['Overlay off', 'Pressure overlay', 'Temperature overlay'][overlay]); }
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
  if (ev.target.closest('[data-ui="close"]')) closeModal();
});
document.getElementById('top').addEventListener('click', ev => {
  const b = ev.target.closest('[data-ui]');
  if (!b) return;
  const u = b.dataset.ui;
  if (u === 'craft' || u === 'ency' || u === 'help') openModal(u);
  else if (u === 'reset' && confirm('Start a new map? Your factory will be lost.')) { newGame(); renderHotbar(); closePanel(); save(); }
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
  get S() { return S; }, get ents() { return ents; }, get patches() { return patches; }, get cam() { return cam; },
  place: (t, x, y, d) => place(t, x, y, d, true), at, setRecipe, removeEnt, save, load, newGame,
  step(n) { for (let i = 0; i < n; i++) tick(); render(); $('#power').innerHTML = powerHtml(); $('#vent').innerHTML = ventHtml(); renderPanelDyn(); renderHotbar(); },
  terrain: () => terrain, ore: (x, y) => ({ t: oreType[y * W + x], a: oreAmt[y * W + x] }),
  select(e) { openPanel(e); }, openModal, closeModal, refresh: renderHotbar,
  setCam(x, y, z) { cam.x = x; cam.y = y; if (z) cam.z = z; },
};
})();
