'use strict';

'use strict';

const PIT_N = 1, PIT_E = 2, PIT_S = 4, PIT_W = 8;

const ROCK_SHAPE_VERTS = 12;
const ROCK_SHAPES = [
  [1.0, 0.92, 1.06, 0.95, 1.08, 0.93, 1.02, 0.9, 1.1, 0.94, 1.04, 0.91],
  [1.18, 0.8, 1.12, 0.82, 1.2, 0.78, 1.14, 0.83, 1.22, 0.79, 1.1, 0.86],
  [1.15, 1.04, 0.86, 0.8, 0.87, 1.03, 1.2, 1.06, 0.88, 0.78, 0.88, 1.05],
  [0.85, 0.9, 1.28, 1.18, 0.96, 0.82, 0.9, 1.06, 0.84, 0.96, 1.12, 0.9],
  [1.02, 1.08, 0.94, 1.12, 0.92, 1.1, 0.96, 1.14, 0.9, 1.08, 0.98, 1.04],
];
const ROCK_CONNECT_DIRS = [[PIT_N, -Math.PI / 2], [PIT_E, 0], [PIT_S, Math.PI / 2], [PIT_W, Math.PI]];

function rockShapePoints(x, y, radius, shapeIdx, mask){
  const shape = ROCK_SHAPES[shapeIdx] || ROCK_SHAPES[0];
  const reach = TILE / 2 + 3;
  const dirs = [];
  if (mask) for (const [bit, ang] of ROCK_CONNECT_DIRS) if (mask & bit) dirs.push(ang);
  const pts = [];
  for (let i = 0; i < ROCK_SHAPE_VERTS; i++) {
    const ang = (i / ROCK_SHAPE_VERTS) * Math.PI * 2 - Math.PI / 2;
    let r = radius * shape[i];
    for (const dAng of dirs) {
      let diff = ang - dAng;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      const w = Math.max(0, Math.cos(diff));
      if (w > 0) {
        const w3 = w * w * w;
        const cand = r * (1 - w3) + reach * w3;
        if (cand > r) r = cand;
      }
    }
    pts.push(x + Math.cos(ang) * r, y + Math.sin(ang) * r);
  }
  return pts;
}

function fillRockPolygon(ctx, pts){
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath();
  ctx.fill();
}

const PONY_VISUALS = {
  earth:          { build:'stout',   tail:'fluffy', ear:'round',   eye:'round', pattern:'none' },
  pegasus:        { build:'lean',    wing:'feather', tail:'plume',  ear:'pointed', eye:'round', pattern:'fade' },
  unicorn:        { build:'lanky',   horn:'spiral', tail:'plume',  ear:'pointed', eye:'glow', pattern:'none' },
  batpony:        { build:'compact', wing:'membrane', tail:'forked', ear:'long', eye:'slit', pattern:'none' },
  zebra:          { build:'lean',    tail:'whip',   ear:'pointed', eye:'round', pattern:'none' },
  hypogriff:      { build:'lean',    wing:'feather', tail:'fin',   ear:'tufted', eye:'round', pattern:'patches' },
  seapony:        { build:'round',   tail:'fin',    ear:'notched', eye:'round', pattern:'fade', aura:'bubble', auraColor:'#bff0ff' },
  ponybot:        { build:'angular', tail:'stubby', ear:'notched', eye:'glow', pattern:'circuit', flourish:'antenna' },
  griffin:        { build:'stout',   wing:'feather', tail:'plume', ear:'tufted', eye:'round', pattern:'spots' },
  kirin:          { build:'lanky',   horn:'antler', tail:'plume',  ear:'pointed', eye:'slit', pattern:'scalepat', aura:'ember', auraColor:'#ffb04a', flourish:'flamering' },
  dragon:         { build:'stout',   horn:'pairhorn', wing:'membrane', tail:'forked', ear:'notched', eye:'slit', pattern:'scalepat', aura:'ember', auraColor:'#ff6a2a', flourish:'spineridge' },
  windigo:        { build:'lanky',   horn:'crystal', wing:'tattered', tail:'whip', ear:'pointed', eye:'glow', pattern:'fade', aura:'frost', auraColor:'#dff2ff', flourish:'frosttrail' },
  kelpie:         { build:'lean',    tail:'fin',    ear:'notched', eye:'slit', pattern:'scalepat', aura:'ooze', auraColor:'#3fae86' },
  breezie:        { build:'compact', wing:'insect', tail:'stubby', ear:'long', eye:'facet', pattern:'none', aura:'sparkle', auraColor:'#ffd0e6' },
  dnbpony:        { build:'lanky',   horn:'straight', tail:'whip', ear:'pointed', eye:'glow', pattern:'fade', aura:'static', auraColor:'#3ef0e0' },
  crystalpony:    { build:'angular', horn:'crystal', tail:'plume', ear:'pointed', eye:'facet', pattern:'facets', aura:'sparkle', auraColor:'#bfeaff', flourish:'shards' },
  mule:           { build:'stout',   tail:'stubby', ear:'long',    eye:'round', pattern:'patches' },
  alicorn:        { build:'lanky',   horn:'spiral', wing:'feather', tail:'plume', ear:'pointed', eye:'glow', pattern:'fade', aura:'sparkle', auraColor:'#f6dcff', flourish:'halo' },
  changeling:     { build:'lean',    horn:'curved', wing:'insect', tail:'whip', ear:'notched', eye:'facet', pattern:'holes', aura:'ooze', auraColor:'#5ae0a0' },
  diamonddog:     { build:'stout',   tail:'stubby', ear:'round',   eye:'round', pattern:'spots', aura:'dust', auraColor:'#c9b48a' },
  gargoyle:       { build:'angular', horn:'pairhorn', wing:'stone', tail:'forked', ear:'tufted', eye:'glow', pattern:'cracks', aura:'dust', auraColor:'#aab2c0', flourish:'stoneplate' },
  changedling:    { build:'lean',    horn:'curved', wing:'insect', tail:'plume', ear:'notched', eye:'round', pattern:'fade', aura:'sparkle', auraColor:'#7aeeb0' },
  changelingqueen:{ build:'lanky',   horn:'curved', wing:'insect', tail:'plume', ear:'long', eye:'facet', pattern:'holes', aura:'ooze', auraColor:'#f4d35e', flourish:'crown' },
  filly:          { build:'round',   tail:'fluffy', ear:'round',   eye:'round', pattern:'spots', aura:'petal', auraColor:'#ffc7de' },
  engineerpony:   { build:'compact', tail:'stubby', ear:'notched', eye:'round', pattern:'patches', flourish:'goggles' },
  chudfilly:      { build:'round',   tail:'stubby', ear:'round',   eye:'slit', pattern:'patches' },
  chadfilly:      { build:'compact', tail:'fluffy', ear:'pointed', eye:'glow', pattern:'fade' },
  snowpitymare:   { build:'lean',    tail:'fluffy', ear:'tufted',  eye:'round', pattern:'fade', aura:'frost', auraColor:'#eaf6ff' },
};

const Util = {
  rand(min, max){ return RNG.random() * (max - min) + min; },
  randi(min, max){ return Math.floor(Util.rand(min, max + 1)); },
  choice(arr){ return arr[Math.floor(RNG.random() * arr.length)]; },
  chance(p){ return RNG.random() < p; },
  clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); },
  lerp(a, b, t){ return a + (b - a) * t; },

  easeOutCubic(t){ const p = 1 - Util.clamp(t, 0, 1); return 1 - p * p * p; },
  easeInOutQuad(t){ t = Util.clamp(t, 0, 1); return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; },
  easeOutElastic(t){
    t = Util.clamp(t, 0, 1);
    if (t === 0 || t === 1) return t;
    const c4 = (2 * Math.PI) / 3;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },

  formatSigned(n, decimals = 0){
    const r = Number(n.toFixed(decimals));
    return (r >= 0 ? '+' : '') + r;
  },
  formatSignedPercent(frac, decimals = 1){
    return Util.formatSigned(frac * 100, decimals) + '%';
  },
  dist(ax, ay, bx, by){ return Math.hypot(ax - bx, ay - by); },
  dist2(ax, ay, bx, by){ const dx = ax-bx, dy = ay-by; return dx*dx+dy*dy; },
  angleTo(ax, ay, bx, by){ return Math.atan2(by - ay, bx - ax); },

  formatNum(n){ return Math.round(n).toLocaleString('en-US'); },

  formatDuration(seconds){
    seconds = Math.max(0, Math.floor(seconds));
    const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = seconds % 60;
    const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
    const ss = String(s).padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  },

  weighted(items){
    let total = 0;
    for (const it of items) total += it.w;
    let r = RNG.random() * total;
    for (const it of items) {
      if (r < it.w) return it;
      r -= it.w;
    }
    return items[items.length - 1];
  },

  shuffle(arr){
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(RNG.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },

  circleIntersect(ax, ay, ar, bx, by, br){
    return Util.dist2(ax, ay, bx, by) <= (ar + br) * (ar + br);
  },

  drawHeart(ctx, x, y, size, fillFrac, fillColor, outlineColor){
    ctx.save();
    ctx.translate(x, y);
    const s = size / 16;
    ctx.scale(s, s);

    const path = new Path2D(
      'M8 14 C8 14 1 9.6 1 5.2 C1 2.4 3 0.8 5.2 0.8 C6.8 0.8 7.6 1.6 8 2.4 ' +
      'C8.4 1.6 9.2 0.8 10.8 0.8 C13 0.8 15 2.4 15 5.2 C15 9.6 8 14 8 14 Z'
    );

    ctx.lineWidth = 1.1;
    ctx.strokeStyle = outlineColor || Theme.ui.onIcon;
    ctx.fillStyle = Theme.shadow.outline;
    ctx.fill(path);
    ctx.stroke(path);

    if (fillFrac > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, 16 * Util.clamp(fillFrac, 0, 1), 16);
      ctx.clip();
      ctx.fillStyle = fillColor;
      ctx.fill(path);

      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.beginPath(); ctx.ellipse(4.4, 4.2, 1.5, 0.9, -0.6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  },

  drawRoundedRect(ctx, x, y, w, h, r){
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },

  key(x, y){ return x + ',' + y; },

  _shadeCache: new Map(),
  shadeColor(hex, pct){
    const key = hex + '|' + pct;
    const hit = Util._shadeCache.get(key);
    if (hit !== undefined) return hit;
    const num = parseInt(hex.slice(1), 16);
    let r = (num >> 16) & 0xff, g = (num >> 8) & 0xff, b = num & 0xff;
    if (pct >= 0) { r += (255 - r) * pct; g += (255 - g) * pct; b += (255 - b) * pct; }
    else { r *= (1 + pct); g *= (1 + pct); b *= (1 + pct); }
    const out = `rgb(${Util.clamp(Math.round(r), 0, 255)},${Util.clamp(Math.round(g), 0, 255)},${Util.clamp(Math.round(b), 0, 255)})`;
    if (Util._shadeCache.size > 4096) Util._shadeCache.clear();
    Util._shadeCache.set(key, out);
    return out;
  },

  bodyShade(ctx, cx, cy, r, color){
    if (!isFinite(cx) || !isFinite(cy) || !isFinite(r) || r <= 0) return color;
    const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, Math.max(0.1, r * 0.1), cx, cy, r * 1.15);
    g.addColorStop(0, Util.shadeColor(color, 0.4));
    g.addColorStop(0.6, color);
    g.addColorStop(1, Util.shadeColor(color, -0.3));
    return g;
  },

  _bodyGradCache: new WeakMap(),
  bodyShadeLocal(ctx, cx, cy, r, color){
    let m = Util._bodyGradCache.get(ctx);
    if (!m) { m = new Map(); Util._bodyGradCache.set(ctx, m); }
    const key = color + '|' + cx + '|' + cy + '|' + r;
    let g = m.get(key);
    if (g === undefined) {
      if (m.size > 512) m.clear();
      g = Util.bodyShade(ctx, cx, cy, r, color);
      m.set(key, g);
    }
    return g;
  },

  qualityGlow(q){
    if (q >= 4) return Theme.quality.q4;
    if (q === 3) return Theme.quality.q3;
    if (q === 2) return Theme.quality.q2;
    return null;
  },

  classPonyOpts(def){
    const id = def.id;
    return {
      bodyColor: def.color, maneColor: def.mane,
      hasWings: !!def.canFly,

      hasHorn: id === 'unicorn' || id === 'dnbpony' || id === 'alicorn' || id === 'changeling' || id === 'crystalpony',
      hasStripes: !!def.stripes,
      hasFangs: id === 'batpony' || id === 'changeling',
      hasBeak: id === 'griffin' || id === 'hypogriff',

      hasTalons: id === 'griffin' || id === 'diamonddog',
      hasFinTail: id === 'seapony' || id === 'kelpie',
      isRobot: id === 'ponybot',

      flameMane: id === 'kirin' || id === 'dnbpony',

      hasScales: id === 'kirin' || id === 'dragon' || id === 'kelpie' || id === 'changeling' || id === 'gargoyle',

      ghostly: id === 'windigo' || id === 'crystalpony',

      ...Util.ponyVisuals(id),
    };
  },

  ponyVisuals(id){
    const v = PONY_VISUALS[id];
    if (!v) return { build:'stout', hornStyle:'straight', wingStyle:'feather', tailStyle:'fluffy', earStyle:'pointed', eyeStyle:'round', pattern:'none', aura:null, auraColor:null, flourish:null };
    return {
      build: v.build || 'stout',
      hornStyle: v.horn || 'straight',
      wingStyle: v.wing || 'feather',
      tailStyle: v.tail || 'fluffy',
      earStyle: v.ear || 'pointed',
      eyeStyle: v.eye || 'round',
      pattern: v.pattern || 'none',
      aura: v.aura || null,
      auraColor: v.auraColor || null,
      flourish: v.flourish || null,
      extraHorn: !!v.horn,
    };
  },

  pitGrad(ctx, ob){
    if (ob._pitGrad && ob._pitGradCtx === ctx) return ob._pitGrad;
    const g = ctx.createRadialGradient(ob.x, ob.y, 1, ob.x, ob.y, TILE * 0.8);
    g.addColorStop(0, Theme.world.pitFill);
    g.addColorStop(1, Util.shadeColor(Theme.world.pitFill, 0.16));
    ob._pitGrad = g; ob._pitGradCtx = ctx;
    return g;
  },

  obstacleRadius(kind){ return kind === 'pit' ? TILE / 2 : 14; },

  drawObstacle(ctx, ob, now){
    const flash = ob.hitFlash > 0;
    const HIT = Theme.obstacle.flash, HIT_SOFT = Theme.obstacle.flashSoft;

    const vtx = ob.tx | 0, vty = ob.ty | 0;
    if (ob.kind === 'pit') {
      const x0 = ob.x - TILE / 2, y0 = ob.y - TILE / 2;
      const m = ob._pitMask;
      if (typeof m !== 'number') {

        ctx.fillStyle = Theme.world.pitFill;
        ctx.fillRect(x0, y0, TILE, TILE);
        ctx.strokeStyle = Theme.world.pitEdge; ctx.lineWidth = 1;
        ctx.strokeRect(x0 + 0.5, y0 + 0.5, TILE - 1, TILE - 1);
      } else {

        ctx.fillStyle = Util.pitGrad(ctx, ob);
        ctx.fillRect(x0, y0, TILE, TILE);

        const pitV = Math.floor(tileRand(vtx, vty, 200) * 5);
        if (!(m & PIT_N)) {
          ctx.fillStyle = Util.shadeColor(Theme.world.pitEdge, -0.4 + pitV * 0.05);
          ctx.fillRect(x0, y0, TILE, 5);
        }
        if (pitV === 2) {

          ctx.fillStyle = Util.shadeColor(Theme.world.pitEdge, -0.1);
          ctx.beginPath(); ctx.ellipse(ob.x - 5, ob.y + 3, 2.4, 1.6, 0.3, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(ob.x + 6, ob.y - 2, 1.8, 1.3, -0.2, 0, Math.PI * 2); ctx.fill();
        } else if (pitV === 3) {

          ctx.strokeStyle = Util.shadeColor(Theme.world.pitEdge, -0.15); ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(ob.x - 7, ob.y - 4); ctx.lineTo(ob.x - 1, ob.y + 2); ctx.lineTo(ob.x + 6, ob.y - 3);
          ctx.stroke();
        } else if (pitV === 4) {

          ctx.fillStyle = Util.shadeColor(Theme.world.pitEdge, 0.05);
          ctx.beginPath(); ctx.ellipse(ob.x - 3, ob.y + 5, 3, 1, 0.5, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(ob.x + 4, ob.y + 2, 3, 1, -0.4, 0, Math.PI * 2); ctx.fill();
        }
        ctx.strokeStyle = Theme.world.pitEdge; ctx.lineWidth = 1;
        ctx.beginPath();
        if (!(m & PIT_N)) { ctx.moveTo(x0, y0 + 0.5); ctx.lineTo(x0 + TILE, y0 + 0.5); }
        if (!(m & PIT_E)) { ctx.moveTo(x0 + TILE - 0.5, y0); ctx.lineTo(x0 + TILE - 0.5, y0 + TILE); }
        if (!(m & PIT_S)) { ctx.moveTo(x0, y0 + TILE - 0.5); ctx.lineTo(x0 + TILE, y0 + TILE - 0.5); }
        if (!(m & PIT_W)) { ctx.moveTo(x0 + 0.5, y0); ctx.lineTo(x0 + 0.5, y0 + TILE); }
        ctx.stroke();

        if (!flash && !(m & PIT_N)) {
          ctx.fillStyle = Theme.shadow.glint;
          ctx.beginPath(); ctx.arc(x0 + TILE * 0.5, y0 + 1, 1, 0, Math.PI * 2); ctx.fill();
        }
      }
    } else if (ob.kind === 'cactus') {
      ctx.fillStyle = Theme.shadow.ground;
      ctx.beginPath(); ctx.ellipse(ob.x, ob.y + 9, 11, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = flash ? HIT : Util.bodyShade(ctx, ob.x, ob.y, 10, ob.def.color);

      const cacV = Math.floor(tileRand(vtx, vty, 201) * 5);
      const armL = cacV === 1 ? -2 : cacV === 4 ? -6 : 2, armR = cacV === 1 ? 4 : cacV === 4 ? -6 : 2;
      const noArms = cacV === 3;

      if (!flash) { ctx.shadowColor = ob.def.color; ctx.shadowBlur = 6; }
      ctx.beginPath(); ctx.ellipse(ob.x, ob.y, cacV === 3 ? 9 : 7, cacV === 2 ? 11 : cacV === 3 ? 12 : 13, 0, 0, Math.PI * 2); ctx.fill();
      if (!noArms) {
        ctx.beginPath(); ctx.ellipse(ob.x - 9, ob.y + armL, 4, 8, 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(ob.x + 9, ob.y + armR, 4, 8, -0.3, 0, Math.PI * 2); ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.strokeStyle = flash ? HIT : ob.def.dark; ctx.lineWidth = 1;
      const ribs = cacV === 2 ? 0 : cacV === 4 ? 3 : 1;
      const ribTop = cacV === 3 ? -16 : -10, ribBot = cacV === 3 ? -6 : -6;
      for (let i = -ribs; i <= ribs; i++) { ctx.beginPath(); ctx.moveTo(ob.x + i * 4, ob.y + ribTop); ctx.lineTo(ob.x + i * 4, ob.y + ribBot); ctx.stroke(); }
      if (!flash) {
        ctx.fillStyle = Theme.shadow.glint;
        ctx.beginPath(); ctx.arc(ob.x - 2, ob.y + ribTop + 1, 1, 0, Math.PI * 2); ctx.fill();
      }

    } else if (ob.kind === 'yellowfire' || ob.kind === 'redfire' || ob.kind === 'bluefire' || ob.kind === 'purplefire'
        || ob.kind === 'greenfire' || ob.kind === 'whitefire' || ob.kind === 'blackfire') {
      const frac = ob.def.maxHp ? Util.clamp(ob.hp / ob.def.maxHp, 0.25, 1) : 1;
      const flick = Math.sin((now || 0) / 70 + ob.x) * 3;

      const fireV = Math.floor(tileRand(vtx, vty, 202) * 5);

      const LOG = '#6d4c2f', LOG_DK = '#3d2a19';
      const logAngles = fireV === 1 ? [-0.5, 0.05, 0.55] : fireV === 2 ? [-0.16, 0.62]
        : fireV === 3 ? [0.7] : fireV === 4 ? [-0.6, -0.15, 0.15, 0.6] : [-0.35, 0.35];
      for (const la of logAngles) {
        ctx.save();
        ctx.translate(ob.x, ob.y + 8);
        ctx.rotate(la);
        ctx.fillStyle = flash ? HIT : LOG;
        ctx.fillRect(-10, -2.4, 20, 4.8);
        if (!flash) {
          ctx.fillStyle = LOG_DK;
          ctx.beginPath(); ctx.ellipse(-10, 0, 1.4, 2.4, 0, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(10, 0, 1.4, 2.4, 0, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }

      const lean = fireV === 1 ? -2 : fireV === 2 ? 2 : fireV === 3 ? 4 : 0;
      ctx.fillStyle = Theme.shadow.groundSoft;
      ctx.beginPath(); ctx.ellipse(ob.x, ob.y + 9, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.55 + frac * 0.45;
      ctx.fillStyle = flash ? HIT : ob.def.dark;

      if (!flash) { ctx.shadowColor = ob.def.color; ctx.shadowBlur = 7 * frac; }
      ctx.beginPath();
      ctx.moveTo(ob.x, ob.y + 10);
      ctx.quadraticCurveTo(ob.x - 10, ob.y - 2, ob.x - 3 + lean, ob.y - 16 - flick * frac);
      ctx.quadraticCurveTo(ob.x + lean, ob.y - 8, ob.x + 3 + lean, ob.y - 16 - flick * frac);
      ctx.quadraticCurveTo(ob.x + 10, ob.y - 2, ob.x, ob.y + 10);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = flash ? HIT : ob.def.color;
      ctx.beginPath();
      ctx.moveTo(ob.x, ob.y + 8);
      ctx.quadraticCurveTo(ob.x - 6, ob.y - 2, ob.x - 2 + lean * 0.6, ob.y - 12 - flick * frac * 0.6);
      ctx.quadraticCurveTo(ob.x + lean * 0.6, ob.y - 6, ob.x + 2 + lean * 0.6, ob.y - 12 - flick * frac * 0.6);
      ctx.quadraticCurveTo(ob.x + 6, ob.y - 2, ob.x, ob.y + 8);
      ctx.fill();

      if (!flash) {
        ctx.fillStyle = Theme.shadow.glint;
        ctx.beginPath(); ctx.arc(ob.x + lean * 0.6, ob.y - 12 - flick * frac * 0.6, 1, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (ob.kind === 'spike' || ob.kind === 'spiketrap' || ob.kind === 'movingspike') {

      ctx.fillStyle = Theme.shadow.groundSoft;
      ctx.beginPath(); ctx.ellipse(ob.x, ob.y + 8, 11, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = flash ? HIT : ob.def.dark;
      ctx.beginPath(); ctx.arc(ob.x, ob.y, 5.5, 0, Math.PI * 2); ctx.fill();

      const spkV = Math.floor(tileRand(vtx, vty, 300) * 5);
      const baseR = 4.5, bw = 2.1;
      let spikes;
      if (spkV === 0) {
        spikes = []; for (let i = 0; i < 8; i++) spikes.push({ a: (i / 8) * Math.PI * 2, l: 13 });
      } else if (spkV === 1) {
        spikes = []; for (let i = 0; i < 6; i++) spikes.push({ a: (i / 6) * Math.PI * 2 + 0.2, l: 14 });
      } else if (spkV === 2) {
        spikes = []; for (let i = 0; i < 5; i++) spikes.push({ a: -1.3 + i * 0.65, l: 13 });
      } else if (spkV === 3) {
        spikes = []; for (let i = 0; i < 10; i++) spikes.push({ a: (i / 10) * Math.PI * 2, l: 9 });
      } else {
        spikes = []; for (let i = 0; i < 8; i++) spikes.push({ a: (i / 8) * Math.PI * 2 + 0.39, l: i % 2 === 0 ? 14 : 8 });
      }
      ctx.fillStyle = flash ? HIT_SOFT : ob.def.color;
      ctx.strokeStyle = flash ? Theme.shadow.outlineHard : ob.def.dark;
      ctx.lineWidth = 1;

      if (!flash) { ctx.shadowColor = ob.def.color; ctx.shadowBlur = 6; }
      let longest = spikes[0];
      for (const sp of spikes) {
        if (sp.l > longest.l) longest = sp;
        const dx = Math.cos(sp.a), dy = Math.sin(sp.a);
        const px = -dy, py = dx;
        const bx1 = ob.x + dx * baseR + px * bw, by1 = ob.y + dy * baseR + py * bw;
        const bx2 = ob.x + dx * baseR - px * bw, by2 = ob.y + dy * baseR - py * bw;
        const tipX = ob.x + dx * sp.l, tipY = ob.y + dy * sp.l;
        ctx.beginPath(); ctx.moveTo(bx1, by1); ctx.lineTo(tipX, tipY); ctx.lineTo(bx2, by2); ctx.closePath();
        ctx.fill(); ctx.stroke();
      }
      ctx.shadowBlur = 0;
      if (!flash) {
        ctx.fillStyle = Theme.shadow.glint;
        ctx.beginPath(); ctx.arc(ob.x + Math.cos(longest.a) * longest.l, ob.y + Math.sin(longest.a) * longest.l, 1, 0, Math.PI * 2); ctx.fill();
      }
    } else if (ob.kind === 'spikedrock') {

      ctx.fillStyle = ob.def.dark;
      ctx.beginPath(); ctx.arc(ob.x, ob.y + 3, ob.radius * 0.9, 0, Math.PI * 2); ctx.fill();
      const sdrRkV = Math.floor(tileRand(vtx, vty, 211) * 5);
      ctx.fillStyle = flash ? HIT : Util.bodyShade(ctx, ob.x, ob.y, ob.radius * 1.35, ob.def.color);
      fillRockPolygon(ctx, rockShapePoints(ob.x, ob.y, ob.radius, sdrRkV, ob._rockMask));

      const sdV = Math.floor(tileRand(vtx, vty, 301) * 5);
      const studSets = [
        [0, Math.PI * 0.66, Math.PI * 1.33],
        [0, Math.PI * 0.4, Math.PI * 0.8, Math.PI * 1.2, Math.PI * 1.6],
        [Math.PI * 0.15, Math.PI * 0.85, Math.PI * 1.5],
        [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5],
        [Math.PI * 0.25, Math.PI * 0.6, Math.PI * 1.0, Math.PI * 1.4, Math.PI * 1.75],
      ];
      const studs = studSets[sdV];
      ctx.fillStyle = flash ? HIT_SOFT : ob.def.color;
      ctx.strokeStyle = flash ? Theme.shadow.outlineHard : ob.def.dark;
      ctx.lineWidth = 1;
      const studBaseR = ob.radius * 0.75, studLen = ob.radius + 5, studBw = 2.4;

      if (!flash) { ctx.shadowColor = ob.def.color; ctx.shadowBlur = 6; }
      for (const a of studs) {
        const dx = Math.cos(a), dy = Math.sin(a);
        const px = -dy, py = dx;
        const bx1 = ob.x + dx * studBaseR + px * studBw, by1 = ob.y + dy * studBaseR + py * studBw;
        const bx2 = ob.x + dx * studBaseR - px * studBw, by2 = ob.y + dy * studBaseR - py * studBw;
        const tipX = ob.x + dx * studLen, tipY = ob.y + dy * studLen;
        ctx.beginPath(); ctx.moveTo(bx1, by1); ctx.lineTo(tipX, tipY); ctx.lineTo(bx2, by2); ctx.closePath();
        ctx.fill(); ctx.stroke();
      }
      ctx.shadowBlur = 0;
      if (!flash) {
        ctx.strokeStyle = Theme.shadow.rim; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(ob.x, ob.y, ob.radius * 0.72, Math.PI * 1.1, Math.PI * 1.7); ctx.stroke();
        ctx.fillStyle = Theme.shadow.glint;
        const gx = ob.x + Math.cos(Math.PI * 1.1) * ob.radius * 0.72, gy = ob.y + Math.sin(Math.PI * 1.1) * ob.radius * 0.72;
        ctx.beginPath(); ctx.arc(gx, gy, 1, 0, Math.PI * 2); ctx.fill();
      }
    } else if (ob.kind.indexOf('turret') === 0 && ob.kind !== 'turretspinner') {
      ctx.fillStyle = Theme.shadow.groundSoft;
      ctx.beginPath(); ctx.ellipse(ob.x, ob.y + 9, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = flash ? HIT : ob.def.dark;
      ctx.beginPath(); ctx.arc(ob.x, ob.y, 13, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = flash ? HIT_SOFT : Util.bodyShade(ctx, ob.x, ob.y, 9, ob.def.color);
      ctx.beginPath(); ctx.arc(ob.x, ob.y, 9, 0, Math.PI * 2); ctx.fill();

      ctx.strokeStyle = ob.def.boltColor || Theme.projectile.turretBolt;
      ctx.lineWidth = 3;
      for (const ang of (ob.def.angles || [])) {
        ctx.beginPath();
        ctx.moveTo(ob.x + Math.cos(ang) * 6, ob.y + Math.sin(ang) * 6);
        ctx.lineTo(ob.x + Math.cos(ang) * 16, ob.y + Math.sin(ang) * 16);
        ctx.stroke();
      }

      if (!flash) {
        const turV = Math.floor(tileRand(vtx, vty, 204) * 5);
        if (turV === 1) {
          ctx.fillStyle = ob.def.dark;
          for (let i = 0; i < 4; i++) {
            const a = Math.PI / 4 + i * Math.PI / 2;
            ctx.beginPath(); ctx.arc(ob.x + Math.cos(a) * 11, ob.y + Math.sin(a) * 11, 1.4, 0, Math.PI * 2); ctx.fill();
          }
        } else if (turV === 2) {
          ctx.strokeStyle = ob.def.dark; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(ob.x - 8, ob.y - 8); ctx.lineTo(ob.x + 8, ob.y + 8); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(ob.x - 8, ob.y + 8); ctx.lineTo(ob.x + 8, ob.y - 8); ctx.stroke();
        } else if (turV === 3) {
          ctx.strokeStyle = ob.def.dark; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(ob.x, ob.y, 11.5, 0, Math.PI * 2); ctx.stroke();
        } else if (turV === 4) {
          ctx.fillStyle = ob.def.dark;
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            ctx.beginPath(); ctx.arc(ob.x + Math.cos(a) * 11.5, ob.y + Math.sin(a) * 11.5, 1.1, 0, Math.PI * 2); ctx.fill();
          }
        }

        ctx.shadowColor = ob.def.color; ctx.shadowBlur = 6;
        ctx.strokeStyle = ob.def.dark; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(ob.x, ob.y, 9, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = Theme.shadow.glint;
        ctx.beginPath(); ctx.arc(ob.x - 5, ob.y - 5, 1, 0, Math.PI * 2); ctx.fill();
      }
      if (ob.def.targeting) {
        ctx.fillStyle = ob.def.boltColor || Theme.projectile.turretEye;
        ctx.beginPath(); ctx.arc(ob.x, ob.y, 3.5, 0, Math.PI * 2); ctx.fill();
      }
    } else if (ob.kind === 'thornbush') {

      ctx.fillStyle = Theme.shadow.ground;
      ctx.beginPath(); ctx.ellipse(ob.x, ob.y + 9, 11, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = flash ? HIT : Util.bodyShade(ctx, ob.x, ob.y, 11, ob.def.color);

      if (!flash) { ctx.shadowColor = ob.def.color; ctx.shadowBlur = 6; }
      ctx.beginPath(); ctx.arc(ob.x, ob.y, 11, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = flash ? HIT : ob.def.dark; ctx.lineWidth = 1.5;

      const thV = Math.floor(tileRand(vtx, vty, 205) * 5);
      if (thV === 3) {
        const thorns = 6;
        for (let i = 0; i < thorns; i++) {
          const ang = -1.1 + i * 0.44;
          const ix = ob.x + Math.cos(ang) * 8, iy = ob.y + Math.sin(ang) * 8;
          const ox = ob.x + Math.cos(ang) * 14, oy = ob.y + Math.sin(ang) * 14;
          ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(ox, oy); ctx.stroke();
        }
      } else if (thV === 4) {
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * Math.PI * 2;
          const ix = ob.x + Math.cos(ang) * 8, iy = ob.y + Math.sin(ang) * 8;
          const ox = ob.x + Math.cos(ang) * 12, oy = ob.y + Math.sin(ang) * 12;
          ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(ox, oy); ctx.stroke();
        }
        for (let i = 0; i < 5; i++) {
          const ang = (i / 5) * Math.PI * 2 + 0.3;
          const ix = ob.x + Math.cos(ang) * 7, iy = ob.y + Math.sin(ang) * 7;
          const ox = ob.x + Math.cos(ang) * 14.5, oy = ob.y + Math.sin(ang) * 14.5;
          ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(ox, oy); ctx.stroke();
        }
      } else {
        const thorns = thV === 1 ? 7 : thV === 2 ? 10 : 8;
        const thSpin = thV === 0 ? 0 : Math.PI / thorns;
        for (let i = 0; i < thorns; i++) {
          const ang = (i / thorns) * Math.PI * 2 + thSpin;
          const ix = ob.x + Math.cos(ang) * 8, iy = ob.y + Math.sin(ang) * 8;
          const ox = ob.x + Math.cos(ang) * 13, oy = ob.y + Math.sin(ang) * 13;
          ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(ox, oy); ctx.stroke();
        }
      }
      if (!flash) {
        ctx.fillStyle = Theme.shadow.glint;
        ctx.beginPath(); ctx.arc(ob.x, ob.y - 8, 1, 0, Math.PI * 2); ctx.fill();
      }
    } else if (ob.kind === 'luckcrystal') {

      ctx.fillStyle = Theme.shadow.groundSoft;
      ctx.beginPath(); ctx.ellipse(ob.x, ob.y + 9, 11, 4, 0, 0, Math.PI * 2); ctx.fill();

      const lcV = Math.floor(tileRand(vtx, vty, 206) * 5);
      const facets = lcV === 1 ? [{ dx:2, dy:-3, s:0.95 }, { dx:-7, dy:2, s:0.75 }, { dx:6, dy:4, s:0.6 }]
        : lcV === 2 ? [{ dx:-3, dy:-2, s:1 }, { dx:6, dy:3, s:0.8 }]
        : lcV === 3 ? [{ dx:0, dy:-5, s:0.7 }, { dx:-6, dy:1, s:0.65 }, { dx:6, dy:1, s:0.65 }, { dx:0, dy:6, s:0.6 }]
        : lcV === 4 ? [{ dx:-1, dy:0, s:1.05 }, { dx:7, dy:-4, s:0.45 }, { dx:6, dy:5, s:0.4 }]
        : [{ dx:0, dy:-2, s:1 }, { dx:-6, dy:3, s:0.7 }, { dx:6, dy:3, s:0.75 }];

      if (!flash) { ctx.save(); ctx.shadowColor = ob.def.color; ctx.shadowBlur = 8; }
      for (const f of facets) {
        const fx = ob.x + f.dx, fy = ob.y + f.dy, r = 11 * f.s;
        ctx.fillStyle = flash ? HIT : ob.def.dark;
        ctx.beginPath();
        ctx.moveTo(fx, fy - r); ctx.lineTo(fx + r * 0.6, fy); ctx.lineTo(fx, fy + r); ctx.lineTo(fx - r * 0.6, fy);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = flash ? HIT_SOFT : ob.def.color;
        ctx.beginPath();
        ctx.moveTo(fx, fy - r * 0.7); ctx.lineTo(fx + r * 0.4, fy); ctx.lineTo(fx, fy + r * 0.5); ctx.lineTo(fx - r * 0.4, fy);
        ctx.closePath(); ctx.fill();

        if (!flash) {
          ctx.fillStyle = Theme.shadow.glint;
          ctx.beginPath(); ctx.arc(fx, fy - r * 0.55, 1, 0, Math.PI * 2); ctx.fill();
        }
      }
      if (!flash) ctx.restore();
    } else if (ob.kind === 'mud') {

      if (!flash) {
        const g = ctx.createRadialGradient(ob.x, ob.y, 1, ob.x, ob.y, 14);
        g.addColorStop(0, Util.shadeColor(ob.def.color, -0.15));
        g.addColorStop(1, Util.shadeColor(ob.def.color, 0.1));
        ctx.fillStyle = g;
      } else {
        ctx.fillStyle = HIT;
      }
      ctx.beginPath(); ctx.ellipse(ob.x, ob.y, 14, 10, 0, 0, Math.PI * 2); ctx.fill();

      const mudV = Math.floor(tileRand(vtx, vty, 207) * 5);
      ctx.fillStyle = flash ? HIT_SOFT : ob.def.dark;
      if (mudV === 3) {
        ctx.beginPath(); ctx.ellipse(ob.x - 1, ob.y, 5, 3.4, 0.1, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = flash ? HIT_SOFT : Util.shadeColor(ob.def.dark, 0.2); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(ob.x - 1, ob.y, 8, 5.4, 0.1, 0, Math.PI * 2); ctx.stroke();
      } else if (mudV === 4) {
        const spots = [[-6, -3], [5, -2], [-4, 4], [6, 5]];
        for (const [sx, sy] of spots) { ctx.beginPath(); ctx.ellipse(ob.x + sx, ob.y + sy, 1.8, 1.3, 0, 0, Math.PI * 2); ctx.fill(); }
      } else {
        const ms = mudV === 1 ? -1 : 1;
        ctx.beginPath(); ctx.ellipse(ob.x - 4 * ms, ob.y - 2, 3, 2, 0.4 * ms, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(ob.x + 5 * ms, ob.y + 2, 4, 2.5, -0.3 * ms, 0, Math.PI * 2); ctx.fill();
        if (mudV !== 2) { ctx.beginPath(); ctx.ellipse(ob.x, ob.y + 4, 2.5, 1.5, 0.2, 0, Math.PI * 2); ctx.fill(); }
        else { ctx.beginPath(); ctx.ellipse(ob.x - 7, ob.y + 4, 2, 1.3, -0.2, 0, Math.PI * 2); ctx.fill(); }
      }

      if (!flash) {
        ctx.fillStyle = 'rgba(255,255,255,.18)';
        ctx.beginPath(); ctx.ellipse(ob.x - 6, ob.y - 5, 3, 1.2, -0.4, 0, Math.PI * 2); ctx.fill();
      }
    } else if (ob.kind === 'sandtrap') {
      ctx.fillStyle = flash ? HIT : ob.def.color;
      ctx.beginPath(); ctx.ellipse(ob.x, ob.y, 14, 10, 0, 0, Math.PI * 2); ctx.fill();

      const stV = Math.floor(tileRand(vtx, vty, 208) * 5);
      ctx.strokeStyle = flash ? HIT : ob.def.dark; ctx.lineWidth = 1.5;
      if (stV === 3) {
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.ellipse(ob.x - 3, ob.y + i * 2.6, 8 - Math.abs(i) * 2, 2.6, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (stV === 4) {
        ctx.beginPath(); ctx.ellipse(ob.x, ob.y, 7, 2.6, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = flash ? HIT : ob.def.dark;
        const specks = [[-9, -3], [8, -2], [-7, 4], [9, 3]];
        for (const [sx, sy] of specks) { ctx.beginPath(); ctx.arc(ob.x + sx, ob.y + sy, 0.9, 0, Math.PI * 2); ctx.fill(); }
      } else {
        const rings = stV === 2 ? 2 : 1, gap = stV === 1 ? 2.2 : 3;
        for (let i = -rings; i <= rings; i++) {
          ctx.beginPath();
          ctx.ellipse(ob.x, ob.y + i * gap, 10 - Math.abs(i) * 2, 3, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      if (!flash) {
        ctx.fillStyle = Theme.shadow.glint;
        ctx.beginPath(); ctx.arc(ob.x - 6, ob.y - 4, 1, 0, Math.PI * 2); ctx.fill();
      }
    } else if (ob.kind === 'bombbarrel' || ob.kind === 'pushablebombbarrel') {
      ctx.fillStyle = Theme.shadow.groundSoft;
      ctx.beginPath(); ctx.ellipse(ob.x, ob.y + 10, 11, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = flash ? HIT : ob.def.dark;
      ctx.beginPath(); ctx.ellipse(ob.x, ob.y, 11, 13, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = flash ? HIT_SOFT : Util.bodyShade(ctx, ob.x, ob.y, 11, ob.def.color);
      ctx.beginPath(); ctx.ellipse(ob.x, ob.y, 9.5, 11.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = flash ? Theme.shadow.outlineHard : ob.def.dark; ctx.lineWidth = 1.5;

      const bbV = Math.floor(tileRand(vtx, vty, 209) * 5);
      ctx.beginPath(); ctx.ellipse(ob.x, ob.y - 5, 9, 2.4, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(ob.x, ob.y + 5, 9, 2.4, 0, 0, Math.PI * 2); ctx.stroke();
      if (bbV === 2) { ctx.beginPath(); ctx.ellipse(ob.x, ob.y, 9.5, 2.4, 0, 0, Math.PI * 2); ctx.stroke(); }
      if (bbV === 3) {
        ctx.fillStyle = flash ? HIT : Util.shadeColor(ob.def.dark, 0.15);
        for (const ry of [-5, 5]) {
          for (const rx of [-8, 0, 8]) { ctx.beginPath(); ctx.arc(ob.x + rx, ob.y + ry, 0.9, 0, Math.PI * 2); ctx.fill(); }
        }
      } else if (bbV === 4) {
        ctx.strokeStyle = flash ? HIT : Util.shadeColor(ob.def.dark, 0.25); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(ob.x, ob.y - 1.5, 9.3, 2.4, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(ob.x, ob.y + 1.5, 9.3, 2.4, 0, 0, Math.PI * 2); ctx.stroke();
      }

      const fz = (bbV === 1 || bbV === 4) ? -1 : 1;
      ctx.strokeStyle = Theme.fx.fuseCord; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ob.x, ob.y - 12); ctx.quadraticCurveTo(ob.x + 4 * fz, ob.y - 17, ob.x + 1 * fz, ob.y - 20); ctx.stroke();

      if (!flash) { ctx.shadowColor = Theme.fx.fuseSpark; ctx.shadowBlur = 6; }
      ctx.fillStyle = flash ? HIT : Theme.fx.fuseSpark;
      ctx.beginPath(); ctx.arc(ob.x + 1 * fz, ob.y - 20, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      if (!flash) {
        ctx.fillStyle = Theme.shadow.glint;
        ctx.beginPath(); ctx.arc(ob.x - 3, ob.y - 8, 1, 0, Math.PI * 2); ctx.fill();
      }
    } else if (ob.def && ob.def.current) {

      const ang = Math.atan2(ob.def.pushY, ob.def.pushX);
      ctx.save();

      if (!flash) { ctx.shadowColor = ob.def.color; ctx.shadowBlur = 8; }
      ctx.fillStyle = ob.def.color; ctx.globalAlpha = 0.35;
      ctx.beginPath(); ctx.ellipse(ob.x, ob.y, 15, 15, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      ctx.translate(ob.x, ob.y); ctx.rotate(ang);
      const scroll = ((now || 0) / 260) % 12;

      ctx.strokeStyle = flash ? HIT : ob.def.dark;
      const curV = Math.floor(tileRand(vtx, vty, 210) * 5);
      ctx.lineWidth = curV === 1 ? 2 : curV === 2 ? 3 : curV === 4 ? 3.4 : 2.5;
      for (let i = -1; i <= 1; i++) {
        const cx = -12 + ((i * 12 + scroll) % 24 + 24) % 24 - 12;
        ctx.beginPath();
        ctx.moveTo(cx - 4, -6); ctx.lineTo(cx + 4, 0); ctx.lineTo(cx - 4, 6);
        ctx.stroke();
        if (curV === 3) {
          ctx.fillStyle = flash ? HIT : ob.def.dark;
          ctx.beginPath(); ctx.arc(cx + 4, 0, 1.2, 0, Math.PI * 2); ctx.fill();
        } else if (curV === 4) {
          ctx.strokeStyle = flash ? HIT_SOFT : Util.shadeColor(ob.def.dark, 0.3); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(cx - 4, -3); ctx.lineTo(cx + 1.5, 0); ctx.lineTo(cx - 4, 3); ctx.stroke();
          ctx.strokeStyle = flash ? HIT : ob.def.dark; ctx.lineWidth = 3.4;
        }
      }

      if (!flash) {
        ctx.fillStyle = Theme.shadow.glint;
        ctx.beginPath(); ctx.arc(9, -3, 1, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    } else if (ob.kind === 'tintedrock') {

      const veinColor = Util.shadeColor(ob.def.color, 0.55);
      ctx.fillStyle = ob.def.dark;
      ctx.beginPath(); ctx.arc(ob.x, ob.y + 3, ob.radius * 0.9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = flash ? HIT : Util.bodyShade(ctx, ob.x, ob.y, ob.radius, ob.def.color);
      ctx.beginPath(); ctx.arc(ob.x, ob.y, ob.radius, 0, Math.PI * 2); ctx.fill();
      if (!flash) {
        const tintV = Math.floor(tileRand(vtx, vty, 302) * 5);
        ctx.strokeStyle = veinColor; ctx.lineWidth = 1.6;
        ctx.shadowColor = veinColor; ctx.shadowBlur = 4;
        if (tintV === 0) {
          ctx.beginPath(); ctx.moveTo(ob.x - 8, ob.y - 9); ctx.lineTo(ob.x - 1, ob.y + 1); ctx.lineTo(ob.x + 7, ob.y + 8); ctx.stroke();
        } else if (tintV === 1) {
          ctx.beginPath(); ctx.moveTo(ob.x, ob.y - 9); ctx.lineTo(ob.x, ob.y); ctx.lineTo(ob.x - 6, ob.y + 8); ctx.moveTo(ob.x, ob.y); ctx.lineTo(ob.x + 6, ob.y + 7); ctx.stroke();
        } else if (tintV === 2) {
          ctx.beginPath(); ctx.moveTo(ob.x - 7, ob.y - 7); ctx.lineTo(ob.x + 7, ob.y + 7); ctx.moveTo(ob.x - 7, ob.y + 7); ctx.lineTo(ob.x + 7, ob.y - 7); ctx.stroke();
        } else if (tintV === 3) {
          ctx.beginPath(); ctx.arc(ob.x, ob.y, ob.radius * 0.55, 0.4, Math.PI * 1.3); ctx.stroke();
        } else {
          for (const [dx, dy] of [[-5, -4], [4, -2], [-1, 6]]) {
            ctx.beginPath();
            ctx.moveTo(ob.x + dx, ob.y + dy - 2); ctx.lineTo(ob.x + dx + 1.6, ob.y + dy); ctx.lineTo(ob.x + dx, ob.y + dy + 2); ctx.lineTo(ob.x + dx - 1.6, ob.y + dy); ctx.closePath();
            ctx.fill();
          }
        }
        ctx.shadowBlur = 0;

        ctx.fillStyle = Theme.shadow.glint;
        ctx.beginPath(); ctx.arc(ob.x - ob.radius * 0.4, ob.y - ob.radius * 0.5, 1, 0, Math.PI * 2); ctx.fill();
      }
    } else if (ob.kind === 'dustvent') {

      ctx.fillStyle = Theme.shadow.groundSoft;
      ctx.beginPath(); ctx.ellipse(ob.x, ob.y, 12, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = flash ? HIT : ob.def.dark;
      ctx.beginPath(); ctx.ellipse(ob.x, ob.y, 7, 4.5, 0, 0, Math.PI * 2); ctx.fill();
      const dvV = Math.floor(tileRand(vtx, vty, 303) * 5);
      ctx.strokeStyle = flash ? HIT_SOFT : (ob.def.boltColor || ob.def.color);
      ctx.lineWidth = 2;

      if (!flash) { ctx.shadowColor = ob.def.boltColor || ob.def.color; ctx.shadowBlur = 6; }
      for (const ang of (ob.def.angles || [])) {
        ctx.beginPath();
        ctx.moveTo(ob.x + Math.cos(ang) * 4, ob.y + Math.sin(ang) * 4);
        ctx.lineTo(ob.x + Math.cos(ang) * (dvV === 2 ? 10 : 13), ob.y + Math.sin(ang) * (dvV === 2 ? 10 : 13));
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      if (!flash) {
        ctx.fillStyle = Util.shadeColor(ob.def.color, 0.2);
        if (dvV === 1 || dvV === 3) {
          for (const ang of (ob.def.angles || [])) {
            ctx.beginPath(); ctx.arc(ob.x + Math.cos(ang) * 15, ob.y + Math.sin(ang) * 15, 1.6, 0, Math.PI * 2); ctx.fill();
          }
        } else if (dvV === 4) {
          ctx.beginPath(); ctx.arc(ob.x + 4, ob.y - 4, 2, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = Theme.shadow.glint;
        ctx.beginPath(); ctx.arc(ob.x - 5, ob.y - 3, 1, 0, Math.PI * 2); ctx.fill();
      }
    } else if (ob.kind === 'crushvent') {

      ctx.fillStyle = Theme.shadow.ground;
      ctx.beginPath(); ctx.ellipse(ob.x, ob.y + 9, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = flash ? HIT : ob.def.dark;
      ctx.beginPath(); ctx.arc(ob.x, ob.y, 13, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = flash ? HIT_SOFT : Util.bodyShade(ctx, ob.x, ob.y, 9.5, ob.def.color);
      ctx.beginPath(); ctx.arc(ob.x, ob.y, 9.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = ob.def.boltColor || Theme.projectile.turretBolt;
      ctx.lineWidth = 3;

      if (!flash) { ctx.shadowColor = ob.def.boltColor || Theme.projectile.turretBolt; ctx.shadowBlur = 7; }
      for (const ang of (ob.def.angles || [])) {
        ctx.beginPath();
        ctx.moveTo(ob.x + Math.cos(ang) * 6, ob.y + Math.sin(ang) * 6);
        ctx.lineTo(ob.x + Math.cos(ang) * 17, ob.y + Math.sin(ang) * 17);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      if (!flash) {
        const cvV = Math.floor(tileRand(vtx, vty, 304) * 5);
        ctx.strokeStyle = Util.shadeColor(ob.def.dark, 0.3); ctx.lineWidth = 1;
        if (cvV === 0) {
          ctx.beginPath(); ctx.moveTo(ob.x - 6, ob.y - 3); ctx.lineTo(ob.x - 1, ob.y + 2); ctx.stroke();
        } else if (cvV === 1) {
          ctx.beginPath(); ctx.arc(ob.x, ob.y, 11.5, 0, Math.PI * 2); ctx.stroke();
        } else if (cvV === 2) {
          ctx.fillStyle = Util.shadeColor(ob.def.dark, 0.35);
          for (let i = 0; i < 4; i++) {
            const a = Math.PI / 4 + i * Math.PI / 2;
            ctx.beginPath(); ctx.arc(ob.x + Math.cos(a) * 11, ob.y + Math.sin(a) * 11, 1.2, 0, Math.PI * 2); ctx.fill();
          }
        } else if (cvV === 3) {
          ctx.beginPath(); ctx.moveTo(ob.x - 5, ob.y - 6); ctx.lineTo(ob.x, ob.y - 1); ctx.lineTo(ob.x - 4, ob.y + 5); ctx.stroke();
        } else {
          ctx.fillStyle = Util.shadeColor(ob.def.color, -0.3);
          ctx.beginPath(); ctx.arc(ob.x, ob.y, 3, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = Theme.shadow.glint;
        ctx.beginPath(); ctx.arc(ob.x - 5, ob.y - 5, 1, 0, Math.PI * 2); ctx.fill();
      }
    } else if (ob.kind === 'lurehorn') {

      ctx.fillStyle = Theme.shadow.groundSoft;
      ctx.beginPath(); ctx.ellipse(ob.x, ob.y + 9, 10, 3.5, 0, 0, Math.PI * 2); ctx.fill();
      const lhV = Math.floor(tileRand(vtx, vty, 305) * 5);
      const curl = lhV === 1 ? -1 : 1;
      const sweep = lhV === 3 ? 1.5 : lhV === 4 ? 0.7 : 1.1;
      ctx.fillStyle = flash ? HIT : ob.def.dark;
      ctx.beginPath(); ctx.arc(ob.x, ob.y + 6, 7, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = flash ? HIT_SOFT : Util.bodyShade(ctx, ob.x, ob.y, 6, ob.def.color);
      ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ob.x - curl * 4, ob.y + 8);
      ctx.quadraticCurveTo(ob.x + curl * 10 * sweep, ob.y + 2, ob.x + curl * 2, ob.y - 10);
      ctx.stroke();
      ctx.lineCap = 'butt';
      if (lhV === 2) {
        ctx.strokeStyle = Util.shadeColor(ob.def.dark, 0.3); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(ob.x, ob.y + 6, 4, 0, Math.PI * 2); ctx.stroke();
      }
      const tipX = ob.x + curl * 2, tipY = ob.y - 10;
      const glow = ob.def.boltColor || Theme.projectile.turretEye;
      if (!flash) { ctx.shadowColor = glow; ctx.shadowBlur = lhV === 4 ? 9 : 5; }
      ctx.fillStyle = flash ? HIT : glow;
      ctx.beginPath(); ctx.arc(tipX, tipY, lhV === 4 ? 3 : 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    } else if (ob.kind === 'glimmerrock') {

      ctx.fillStyle = ob.def.dark;
      ctx.beginPath(); ctx.arc(ob.x, ob.y + 3, ob.radius * 0.9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = flash ? HIT : Util.bodyShade(ctx, ob.x, ob.y, ob.radius, ob.def.dark);
      ctx.beginPath(); ctx.arc(ob.x, ob.y, ob.radius, 0, Math.PI * 2); ctx.fill();

      const grV = Math.floor(tileRand(vtx, vty, 306) * 5);
      const shards = grV === 0 ? [[0, -12, 4]] : grV === 1 ? [[-4, -10, 3], [4, -9, 3]]
        : grV === 2 ? [[-5, -8, 2.6], [0, -12, 3], [5, -8, 2.6]]
        : grV === 3 ? [[-6, -6, 5], [4, -7, 4]]
        : [[-3, -11, 3], [3, -6, 2.5]];
      if (!flash) { ctx.shadowColor = ob.def.color; ctx.shadowBlur = 6; }
      ctx.fillStyle = flash ? HIT_SOFT : ob.def.color;
      for (const [sx, sy, sr] of shards) {
        ctx.beginPath();
        ctx.moveTo(ob.x + sx, ob.y + sy - sr);
        ctx.lineTo(ob.x + sx + sr * 0.7, ob.y + sy);
        ctx.lineTo(ob.x + sx, ob.y + sy + sr * 0.6);
        ctx.lineTo(ob.x + sx - sr * 0.7, ob.y + sy);
        ctx.closePath(); ctx.fill();
      }
      ctx.shadowBlur = 0;
      if (!flash) {
        ctx.fillStyle = Theme.shadow.glint;
        ctx.beginPath(); ctx.arc(ob.x + shards[0][0] - 1, ob.y + shards[0][1] - shards[0][2] * 0.5, 1, 0, Math.PI * 2); ctx.fill();
      }
    } else if (ob.kind === 'frostvent') {

      ctx.fillStyle = Util.shadeColor(ob.def.dark, -0.1);
      ctx.beginPath(); ctx.ellipse(ob.x, ob.y, 12, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = flash ? HIT_SOFT : ob.def.color;
      ctx.globalAlpha = 0.55;
      ctx.beginPath(); ctx.ellipse(ob.x, ob.y, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;

      const fvV = Math.floor(tileRand(vtx, vty, 307) * 5);
      const motes = fvV === 0 ? [[-5, -4], [0, -8], [5, -4]]
        : fvV === 1 ? [[-6, -5], [6, -5]]
        : fvV === 2 ? [[-4, -5], [-1, -9], [2, -6], [5, -9]]
        : fvV === 3 ? [[0, -10]]
        : [[-6, -4], [-2, -8], [1, -5], [4, -9], [6, -4]];
      if (!flash) { ctx.shadowColor = ob.def.color; ctx.shadowBlur = 6; }
      ctx.fillStyle = flash ? HIT : ob.def.color;
      for (const [mx, my] of motes) {
        ctx.beginPath(); ctx.arc(ob.x + mx, ob.y + my, 1.4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.shadowBlur = 0;
      if (!flash) {
        ctx.fillStyle = Theme.shadow.glint;
        ctx.beginPath(); ctx.arc(ob.x + motes[0][0] + 1, ob.y + motes[0][1] - 1, 1, 0, Math.PI * 2); ctx.fill();
      }
    } else if (ob.kind === 'thornspire') {

      ctx.fillStyle = Theme.shadow.groundSoft;
      ctx.beginPath(); ctx.ellipse(ob.x, ob.y + 8, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = ob.def.dark;
      ctx.beginPath(); ctx.arc(ob.x, ob.y + 4, 5, 0, Math.PI * 2); ctx.fill();

      const tsV = Math.floor(tileRand(vtx, vty, 308) * 5);
      const lean = tsV === 1 ? -4 : tsV === 2 ? 4 : tsV === 4 ? 2 : 0;
      const wide = tsV === 3 ? 5 : 3;
      if (!flash) { ctx.shadowColor = ob.def.color; ctx.shadowBlur = 6; }
      ctx.fillStyle = flash ? HIT : ob.def.color;
      ctx.beginPath();
      ctx.moveTo(ob.x - wide, ob.y + 6);
      ctx.lineTo(ob.x + lean, ob.y - 20);
      ctx.lineTo(ob.x + wide, ob.y + 6);
      ctx.closePath(); ctx.fill();
      if (tsV === 4) {
        ctx.beginPath();
        ctx.moveTo(ob.x + lean * 0.5, ob.y - 6);
        ctx.lineTo(ob.x + lean + 7, ob.y - 10);
        ctx.lineTo(ob.x + lean * 0.5, ob.y - 2);
        ctx.closePath(); ctx.fill();
      }
      ctx.shadowBlur = 0;
      if (!flash) {
        ctx.fillStyle = Theme.shadow.glint;
        ctx.beginPath(); ctx.arc(ob.x + lean - 1, ob.y - 17, 1, 0, Math.PI * 2); ctx.fill();
      }
    } else if (ob.kind === 'cinderkeg') {

      ctx.fillStyle = ob.def.dark;
      ctx.beginPath(); ctx.ellipse(ob.x, ob.y + 2, 9, 11, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = flash ? HIT_SOFT : Util.bodyShade(ctx, ob.x, ob.y + 2, 9, ob.def.color);
      ctx.beginPath(); ctx.ellipse(ob.x, ob.y + 2, 7, 9, 0, 0, Math.PI * 2); ctx.fill();

      const ckV = Math.floor(tileRand(vtx, vty, 309) * 5);
      ctx.strokeStyle = ob.def.dark; ctx.lineWidth = 1.6;
      const bandYs = ckV === 0 ? [-3, 5] : ckV === 1 ? [1] : ckV === 2 ? [-5, 0, 6]
        : ckV === 3 ? [4] : [-4, 4];
      for (const by of bandYs) {
        ctx.beginPath(); ctx.ellipse(ob.x, ob.y + 2 + by, 7, 2, 0, 0, Math.PI * 2); ctx.stroke();
      }
      if (ckV === 4) {
        ctx.beginPath(); ctx.moveTo(ob.x - 6, ob.y - 6); ctx.lineTo(ob.x + 6, ob.y + 10); ctx.stroke();
      }

      ctx.strokeStyle = ob.def.dark; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ob.x, ob.y - 9); ctx.lineTo(ob.x + 2, ob.y - 14); ctx.stroke();
      if (!flash) { ctx.shadowColor = Theme.fx.fuseSpark; ctx.shadowBlur = 6; }
      ctx.fillStyle = flash ? HIT : Theme.fx.fuseSpark;
      ctx.beginPath(); ctx.arc(ob.x + 2, ob.y - 14, 1.6, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      if (!flash) {
        ctx.fillStyle = Theme.shadow.glint;
        ctx.beginPath(); ctx.arc(ob.x - 3, ob.y - 4, 1, 0, Math.PI * 2); ctx.fill();
      }
    } else if (ob.kind === 'stunspore') {

      ctx.fillStyle = Util.shadeColor(ob.def.dark, -0.1);
      ctx.beginPath(); ctx.ellipse(ob.x, ob.y + 5, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = flash ? HIT_SOFT : Util.bodyShade(ctx, ob.x, ob.y, 7, ob.def.color);
      ctx.beginPath(); ctx.arc(ob.x, ob.y, 7, Math.PI, Math.PI * 2); ctx.fill();

      const ssV = Math.floor(tileRand(vtx, vty, 310) * 5);
      const spores = ssV === 0 ? [[-5, -8], [0, -11], [5, -8]]
        : ssV === 1 ? [[-6, -7], [6, -7]]
        : ssV === 2 ? [[-4, -8], [-1, -12], [2, -9], [5, -12]]
        : ssV === 3 ? [[0, -12]]
        : [[-6, -6], [-2, -10], [1, -7], [4, -11], [6, -6]];
      if (!flash) { ctx.shadowColor = ob.def.color; ctx.shadowBlur = 5; }
      ctx.fillStyle = flash ? HIT : ob.def.color;
      for (const [px, py] of spores) {
        ctx.beginPath(); ctx.arc(ob.x + px, ob.y + py, 1.2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.shadowBlur = 0;
      if (!flash) {
        ctx.fillStyle = Theme.shadow.glint;
        ctx.beginPath(); ctx.arc(ob.x - 2, ob.y - 2, 1, 0, Math.PI * 2); ctx.fill();
      }
    } else if (ob.kind === 'turretspinner') {

      ctx.fillStyle = Theme.shadow.groundSoft;
      ctx.beginPath(); ctx.ellipse(ob.x, ob.y + 9, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = flash ? HIT : ob.def.dark;
      ctx.beginPath(); ctx.arc(ob.x, ob.y, 13, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = flash ? HIT_SOFT : Util.bodyShade(ctx, ob.x, ob.y, 9, ob.def.color);
      ctx.beginPath(); ctx.arc(ob.x, ob.y, 9, 0, Math.PI * 2); ctx.fill();

      const tspV = Math.floor(tileRand(vtx, vty, 311) * 5);
      const barrels = tspV === 1 ? 3 : tspV === 3 ? 2 : tspV === 4 ? 6 : 4;
      const rate = tspV === 1 || tspV === 2 ? 3.2 : 1.4;
      const dir = tspV === 2 ? -1 : 1;
      const base = dir * rate * now;
      ctx.strokeStyle = ob.def.boltColor || Theme.projectile.turretBolt;
      ctx.lineWidth = 3;
      for (let i = 0; i < barrels; i++) {
        const ang = base + (i / barrels) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(ob.x + Math.cos(ang) * 6, ob.y + Math.sin(ang) * 6);
        ctx.lineTo(ob.x + Math.cos(ang) * 16, ob.y + Math.sin(ang) * 16);
        ctx.stroke();
      }
      if (!flash) {
        ctx.shadowColor = ob.def.color; ctx.shadowBlur = 6;
        ctx.strokeStyle = ob.def.dark; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(ob.x, ob.y, 9, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = Theme.shadow.glint;
        ctx.beginPath(); ctx.arc(ob.x - 5, ob.y - 5, 1, 0, Math.PI * 2); ctx.fill();
      }
    } else if (ob.kind === 'glasscolumn') {

      ctx.fillStyle = Theme.shadow.groundSoft;
      ctx.beginPath(); ctx.ellipse(ob.x, ob.y + 10, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = flash ? HIT : ob.def.color;
      ctx.beginPath(); ctx.moveTo(ob.x - 5, ob.y + 9); ctx.lineTo(ob.x - 4, ob.y - 13); ctx.lineTo(ob.x + 4, ob.y - 13); ctx.lineTo(ob.x + 5, ob.y + 9); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = ob.def.dark; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(ob.x - 5, ob.y + 9); ctx.lineTo(ob.x - 4, ob.y - 13); ctx.lineTo(ob.x + 4, ob.y - 13); ctx.lineTo(ob.x + 5, ob.y + 9); ctx.closePath(); ctx.stroke();

      const gcV = Math.floor(tileRand(vtx, vty, 312) * 5);
      if (!flash) { ctx.shadowColor = ob.def.color; ctx.shadowBlur = 5; }
      ctx.strokeStyle = flash ? HIT_SOFT : Util.shadeColor(ob.def.dark, 0.3); ctx.lineWidth = 1;
      if (gcV === 1) { ctx.beginPath(); ctx.moveTo(ob.x - 3, ob.y - 10); ctx.lineTo(ob.x + 2, ob.y + 6); ctx.stroke(); }
      else if (gcV === 2) { ctx.beginPath(); ctx.moveTo(ob.x - 2, ob.y - 10); ctx.lineTo(ob.x + 2, ob.y - 2); ctx.lineTo(ob.x - 2, ob.y + 6); ctx.stroke(); }
      else if (gcV === 3) { ctx.beginPath(); ctx.moveTo(ob.x - 4, ob.y); ctx.lineTo(ob.x + 4, ob.y - 2); ctx.stroke(); }
      else if (gcV === 4) { ctx.beginPath(); ctx.moveTo(ob.x - 3, ob.y - 9); ctx.lineTo(ob.x + 3, ob.y + 5); ctx.moveTo(ob.x + 3, ob.y - 9); ctx.lineTo(ob.x - 3, ob.y + 5); ctx.stroke(); }
      ctx.shadowBlur = 0;
      if (!flash) {
        ctx.fillStyle = Theme.shadow.glint;
        ctx.beginPath(); ctx.arc(ob.x - 2, ob.y - 9, 1, 0, Math.PI * 2); ctx.fill();
      }
    } else if (ob.kind === 'sparkbush') {

      ctx.fillStyle = ob.def.dark;
      ctx.beginPath(); ctx.ellipse(ob.x, ob.y + 4, 10, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = flash ? HIT_SOFT : Util.bodyShade(ctx, ob.x, ob.y + 2, 9, ob.def.color);
      ctx.beginPath(); ctx.ellipse(ob.x, ob.y + 2, 9, 7, 0, 0, Math.PI * 2); ctx.fill();

      const sbV = Math.floor(tileRand(vtx, vty, 313) * 5);
      const buds = sbV === 0 ? [[-6, -6], [0, -9], [6, -6]]
        : sbV === 1 ? [[-2, -8], [0, -9], [2, -8]]
        : sbV === 2 ? [[-8, -4], [0, -9], [8, -4]]
        : sbV === 3 ? [[-7, -7], [-1, -9], [3, -5]]
        : [[-3, -5], [1, -9], [7, -7]];
      if (!flash) { ctx.shadowColor = ob.def.boltColor || ob.def.color; ctx.shadowBlur = 6; }
      ctx.fillStyle = flash ? HIT : (ob.def.boltColor || ob.def.color);
      for (const [bx, by] of buds) {
        ctx.beginPath(); ctx.arc(ob.x + bx, ob.y + by, 1.8, 0, Math.PI * 2); ctx.fill();
      }
      ctx.shadowBlur = 0;
      if (!flash) {
        ctx.fillStyle = Theme.shadow.glint;
        ctx.beginPath(); ctx.arc(ob.x + buds[1][0] - 1, ob.y + buds[1][1] - 1, 1, 0, Math.PI * 2); ctx.fill();
      }
    } else if (ob.kind === 'magmapod') {

      ctx.fillStyle = ob.def.dark;
      ctx.beginPath(); ctx.arc(ob.x, ob.y + 2, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = flash ? HIT_SOFT : Util.bodyShade(ctx, ob.x, ob.y, 9, ob.def.dark);
      ctx.beginPath(); ctx.arc(ob.x, ob.y, 9, 0, Math.PI * 2); ctx.fill();

      const mpV = Math.floor(tileRand(vtx, vty, 314) * 5);
      if (!flash) { ctx.shadowColor = ob.def.color; ctx.shadowBlur = 7; }
      ctx.strokeStyle = flash ? HIT : ob.def.color; ctx.lineWidth = 1.6;
      if (mpV === 0) { ctx.beginPath(); ctx.moveTo(ob.x - 4, ob.y - 5); ctx.lineTo(ob.x + 1, ob.y); ctx.lineTo(ob.x - 2, ob.y + 6); ctx.stroke(); }
      else if (mpV === 1) { ctx.beginPath(); ctx.moveTo(ob.x, ob.y - 6); ctx.lineTo(ob.x, ob.y); ctx.lineTo(ob.x - 4, ob.y + 5); ctx.moveTo(ob.x, ob.y); ctx.lineTo(ob.x + 4, ob.y + 5); ctx.stroke(); }
      else if (mpV === 2) { ctx.beginPath(); ctx.moveTo(ob.x - 4, ob.y - 5); ctx.lineTo(ob.x - 3, ob.y + 5); ctx.moveTo(ob.x + 3, ob.y - 5); ctx.lineTo(ob.x + 4, ob.y + 5); ctx.stroke(); }
      else if (mpV === 3) { ctx.beginPath(); ctx.arc(ob.x, ob.y, 5, 0, Math.PI * 1.5); ctx.stroke(); }
      else { ctx.beginPath(); ctx.moveTo(ob.x, ob.y - 6); ctx.lineTo(ob.x, ob.y + 6); ctx.moveTo(ob.x - 6, ob.y); ctx.lineTo(ob.x + 6, ob.y); ctx.moveTo(ob.x - 4, ob.y - 4); ctx.lineTo(ob.x + 4, ob.y + 4); ctx.moveTo(ob.x - 4, ob.y + 4); ctx.lineTo(ob.x + 4, ob.y - 4); ctx.stroke(); }
      ctx.shadowBlur = 0;
      if (!flash) {
        ctx.fillStyle = Theme.shadow.glint;
        ctx.beginPath(); ctx.arc(ob.x - 3, ob.y - 4, 1, 0, Math.PI * 2); ctx.fill();
      }
    } else {

      const tall = ob.tall;
      const plain = ob.kind !== 'phantomwall';
      const isRockFamily = ob.kind === 'rock' || ob.kind === 'hardrock' || ob.kind === 'tallrock' || ob.kind === 'tallhardrock';

      const rkV = plain ? Math.floor(tileRand(vtx, vty, 211) * 5) : 0;
      const cy = ob.y - (tall ? 6 : 0);
      ctx.fillStyle = ob.def.dark;
      ctx.beginPath(); ctx.arc(ob.x, ob.y + 3, ob.radius * 0.9, 0, Math.PI * 2); ctx.fill();
      if (tall) { ctx.beginPath(); ctx.ellipse(ob.x, ob.y - 6, ob.radius * 0.85, ob.radius * 1.05, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = flash ? HIT : Util.bodyShade(ctx, ob.x, cy, ob.radius * (isRockFamily ? 1.35 : 1), ob.def.color);
      if (isRockFamily) {
        fillRockPolygon(ctx, rockShapePoints(ob.x, cy, ob.radius, rkV, ob._rockMask));
      } else {
        ctx.beginPath(); ctx.arc(ob.x, cy, ob.radius, 0, Math.PI * 2); ctx.fill();
      }
      if (ob.kind === 'hardrock' || ob.kind === 'tallhardrock') { ctx.strokeStyle = Theme.obstacle.hardOutline; ctx.lineWidth = 2; ctx.stroke(); }

      if (!flash) {

        ctx.shadowColor = ob.def.color; ctx.shadowBlur = 6;
        ctx.strokeStyle = Theme.shadow.rim; ctx.lineWidth = tall ? 2 : 1.4;
        const a0 = Math.PI * (rkV === 1 ? 1.22 : rkV === 2 ? 1.02 : rkV === 3 ? 0.92 : rkV === 4 ? 1.35 : 1.1);
        ctx.beginPath(); ctx.arc(ob.x, cy, ob.radius * (tall ? 0.6 : 0.72), a0, a0 + Math.PI * 0.6); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = Theme.shadow.glint;
        const gx = ob.x + Math.cos(a0) * ob.radius * (tall ? 0.6 : 0.72), gy = cy + Math.sin(a0) * ob.radius * (tall ? 0.6 : 0.72);
        ctx.beginPath(); ctx.arc(gx, gy, 1, 0, Math.PI * 2); ctx.fill();
        if (rkV === 2) {
          ctx.fillStyle = ob.def.dark;
          ctx.beginPath(); ctx.ellipse(ob.x + ob.radius * 0.28, cy + ob.radius * 0.18, 2.2, 1.6, 0.4, 0, Math.PI * 2); ctx.fill();
        } else if (rkV === 3) {
          ctx.strokeStyle = ob.def.dark; ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(ob.x - ob.radius * 0.4, cy - ob.radius * 0.3);
          ctx.lineTo(ob.x - ob.radius * 0.05, cy + ob.radius * 0.1);
          ctx.lineTo(ob.x + ob.radius * 0.35, cy - ob.radius * 0.15);
          ctx.stroke();
        } else if (rkV === 4) {
          ctx.fillStyle = ob.def.dark;
          ctx.beginPath(); ctx.ellipse(ob.x - ob.radius * 0.25, cy - ob.radius * 0.15, 1.7, 1.3, 0.2, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(ob.x + ob.radius * 0.15, cy + ob.radius * 0.32, 1.4, 1.1, -0.3, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
  },

  drawKeyIcon(ctx, x, y, color){
    ctx.strokeStyle = color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x - 4, y, 4, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 8, y);
    ctx.moveTo(x + 5, y); ctx.lineTo(x + 5, y + 4);
    ctx.moveTo(x + 8, y); ctx.lineTo(x + 8, y + 4);
    ctx.stroke();

    ctx.fillStyle = Theme.shadow.glint;
    ctx.beginPath(); ctx.arc(x - 5.5, y - 1.5, 1.1, 0, Math.PI * 2); ctx.fill();
  },

  drawBombIcon(ctx, x, y, bodyColor, fuseColor){

    ctx.fillStyle = Util.bodyShade(ctx, x, y + 2, 8, bodyColor);
    ctx.beginPath(); ctx.arc(x, y + 2, 8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = fuseColor; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + 3, y - 6); ctx.lineTo(x + 7, y - 11); ctx.stroke();
  },

  drawSackIcon(ctx, x, y, bodyColor, seamColor){

    ctx.fillStyle = Util.bodyShade(ctx, x, y, 10, bodyColor || Theme.icon.sack);
    ctx.beginPath();
    ctx.moveTo(x - 8, y - 2);
    ctx.quadraticCurveTo(x - 10, y + 10, x, y + 11);
    ctx.quadraticCurveTo(x + 10, y + 10, x + 8, y - 2);
    ctx.quadraticCurveTo(x + 6, y - 8, x, y - 8);
    ctx.quadraticCurveTo(x - 6, y - 8, x - 8, y - 2);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = seamColor || Theme.icon.sackSeam; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.strokeStyle = Theme.icon.sackTie; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - 5, y - 8); ctx.lineTo(x + 5, y - 8); ctx.stroke();
  },

  drawPearlIcon(ctx, x, y){
    ctx.fillStyle = Util.bodyShade(ctx, x, y, 9, Theme.icon.pearlBody);
    ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = Theme.icon.pearlShine; ctx.lineWidth = 1; ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = Theme.shadow.glint;
    ctx.beginPath(); ctx.arc(x - 3, y - 3, 2.4, 0, Math.PI * 2); ctx.fill();
  },

  drawFlaskIcon(ctx, x, y){
    ctx.fillStyle = Theme.icon.flaskCork;
    ctx.fillRect(x - 3, y - 11, 6, 4);
    ctx.fillStyle = Util.bodyShade(ctx, x, y + 2, 8, Theme.icon.flaskGlass);
    ctx.beginPath();
    ctx.moveTo(x - 3, y - 7); ctx.lineTo(x - 3, y - 2);
    ctx.quadraticCurveTo(x - 9, y + 4, x - 7, y + 9);
    ctx.quadraticCurveTo(x, y + 12, x + 7, y + 9);
    ctx.quadraticCurveTo(x + 9, y + 4, x + 3, y - 2);
    ctx.lineTo(x + 3, y - 7);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = Theme.icon.flaskLiquid;
    ctx.beginPath();
    ctx.moveTo(x - 6, y + 3);
    ctx.quadraticCurveTo(x - 7, y + 7, x - 5, y + 9);
    ctx.quadraticCurveTo(x, y + 11, x + 5, y + 9);
    ctx.quadraticCurveTo(x + 7, y + 7, x + 6, y + 3);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = Theme.shadow.groundHard; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 3, y - 7); ctx.lineTo(x - 3, y - 2);
    ctx.quadraticCurveTo(x - 9, y + 4, x - 7, y + 9);
    ctx.quadraticCurveTo(x, y + 12, x + 7, y + 9);
    ctx.quadraticCurveTo(x + 9, y + 4, x + 3, y - 2);
    ctx.lineTo(x + 3, y - 7);
    ctx.stroke();
  },

  drawWispDyeIcon(ctx, x, y, color){
    ctx.fillStyle = Theme.icon.flaskCork;
    ctx.fillRect(x - 3, y - 11, 6, 4);
    ctx.fillStyle = Util.bodyShade(ctx, x, y + 2, 8, color);
    ctx.beginPath();
    ctx.moveTo(x - 3, y - 7); ctx.lineTo(x - 3, y - 2);
    ctx.quadraticCurveTo(x - 9, y + 4, x - 7, y + 9);
    ctx.quadraticCurveTo(x, y + 12, x + 7, y + 9);
    ctx.quadraticCurveTo(x + 9, y + 4, x + 3, y - 2);
    ctx.lineTo(x + 3, y - 7);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = Theme.shadow.groundHard; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = Theme.shadow.glint;
    ctx.beginPath(); ctx.arc(x - 2, y - 1, 1.6, 0, Math.PI * 2); ctx.fill();
  },

  drawWispAugmentIcon(ctx, x, y, color){
    ctx.fillStyle = Util.bodyShade(ctx, x, y, 8, color);
    ctx.beginPath();
    ctx.moveTo(x, y - 9); ctx.lineTo(x + 7, y - 1); ctx.lineTo(x, y + 9); ctx.lineTo(x - 7, y - 1);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = Theme.shadow.groundHard; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = Theme.shadow.glint;
    ctx.beginPath(); ctx.arc(x - 2, y - 3, 1.6, 0, Math.PI * 2); ctx.fill();
  },

  drawBatteryIcon(ctx, x, y, frac){
    const w = 12, h = 18 * frac;
    ctx.fillStyle = Theme.icon.batteryShell;
    ctx.fillRect(x - w / 2, y - h / 2, w, h);

    ctx.save();
    ctx.shadowColor = Theme.icon.batteryCharge; ctx.shadowBlur = 4;
    ctx.fillStyle = Theme.icon.batteryCharge;
    ctx.fillRect(x - w / 2 + 2, y - h / 2 + 2, w - 4, Math.max(0, h - 4));
    ctx.restore();
    ctx.fillStyle = Theme.icon.batteryShell;
    ctx.fillRect(x - 3, y - h / 2 - 4, 6, 4);
  },

  drawPillIcon(ctx, x, y, color){
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = Theme.icon.pillHalf; ctx.fillRect(x - 9, y - 9, 9, 18);
    ctx.fillStyle = color; ctx.fillRect(x, y - 9, 9, 18);

    ctx.fillStyle = 'rgba(255,255,255,.4)';
    ctx.beginPath(); ctx.ellipse(x - 3, y - 4, 4, 1.6, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = Theme.shadow.outline; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.stroke();
  },

  drawStarIcon(ctx, x, y, color){
    ctx.save();
    ctx.shadowColor = color; ctx.shadowBlur = 6;
    ctx.fillStyle = Util.bodyShade(ctx, x, y, 10, color);
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const ang = -Math.PI / 2 + i * Math.PI / 5;
      const r = i % 2 === 0 ? 10 : 4.2;
      const px = x + Math.cos(ang) * r, py = y + Math.sin(ang) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = Theme.shadow.outline; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
  },

  drawPickupIcon(ctx, p, bob){
    const x = p.x !== undefined ? p.x : 0, y = (p.y !== undefined ? p.y : 0) + (bob || 0);
    switch (p.kind) {
      case 'coin':
        ctx.fillStyle = Util.bodyShade(ctx, x, y, p.coin.radius, p.coin.color);
        ctx.beginPath(); ctx.arc(x, y, p.coin.radius, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = Theme.shadow.groundHard; ctx.stroke();

        ctx.fillStyle = Theme.shadow.glint;
        ctx.beginPath(); ctx.arc(x - p.coin.radius * 0.32, y - p.coin.radius * 0.32, p.coin.radius * 0.22, 0, Math.PI * 2); ctx.fill();
        break;
      case 'key': Util.drawKeyIcon(ctx, x, y, Theme.icon.key); break;
      case 'doublekey':
        Util.drawKeyIcon(ctx, x - 3, y - 2, Theme.icon.key);
        Util.drawKeyIcon(ctx, x + 3, y + 2, Theme.icon.key);
        break;
      case 'goldkey':
        ctx.save(); ctx.shadowColor = Theme.icon.keyGold; ctx.shadowBlur = Theme.icon.goldGlowBlur;
        Util.drawKeyIcon(ctx, x, y, Theme.icon.keyGold);
        ctx.restore();
        break;
      case 'bomb': Util.drawBombIcon(ctx, x, y, Theme.icon.bombBody, Theme.icon.bombFuse); break;
      case 'doublebomb':
        Util.drawBombIcon(ctx, x - 5, y + 2, Theme.icon.bombBody, Theme.icon.bombFuse);
        Util.drawBombIcon(ctx, x + 5, y - 2, Theme.icon.bombBody, Theme.icon.bombFuse);
        break;
      case 'goldbomb':
        ctx.save(); ctx.shadowColor = Theme.icon.keyGold; ctx.shadowBlur = Theme.icon.goldGlowBlur;
        Util.drawBombIcon(ctx, x, y, Theme.icon.bombBodyGold, Theme.icon.bombFuseGold);
        ctx.restore();
        break;
      case 'heartRed': Util.drawHeart(ctx, x - 9, y - 9, 18, 1, Theme.icon.heartRed, Theme.icon.heartRedLine); break;
      case 'heartBlue': Util.drawHeart(ctx, x - 9, y - 9, 18, 1, Theme.icon.heartBlue, Theme.icon.heartBlueLine); break;
      case 'halfheartRed': Util.drawHeart(ctx, x - 9, y - 9, 18, 0.5, Theme.icon.heartRed, Theme.icon.heartRedLine); break;
      case 'halfheartBlue': Util.drawHeart(ctx, x - 9, y - 9, 18, 0.5, Theme.icon.heartBlue, Theme.icon.heartBlueLine); break;
      case 'doubleheart':
        Util.drawHeart(ctx, x - 12, y - 7, 18, 1, Theme.icon.heartRed, Theme.icon.heartRedLine);
        Util.drawHeart(ctx, x - 6, y - 11, 18, 1, Theme.icon.heartRed, Theme.icon.heartRedLine);
        break;
      case 'heartContainer': Util.drawHeart(ctx, x - 11, y - 11, 22, 1, Theme.icon.heartContainer, Theme.icon.heartRedLine); break;

      case 'eternalheart': Util.drawHeart(ctx, x - 9, y - 9, 18, 1, Theme.icon.pillHalf, Theme.icon.heartRedLine); break;
      case 'sack': Util.drawSackIcon(ctx, x, y); break;
      case 'trashbag': Util.drawSackIcon(ctx, x, y, Theme.icon.trashBag, Theme.icon.trashBagSeam); break;
      case 'driftnet': Util.drawSackIcon(ctx, x, y, Theme.icon.driftnet, Theme.icon.driftnetSeam); break;
      case 'pearl': Util.drawPearlIcon(ctx, x, y); break;
      case 'tideflask': Util.drawFlaskIcon(ctx, x, y); break;
      case 'battery': Util.drawBatteryIcon(ctx, x, y, 1); break;
      case 'minibattery': Util.drawBatteryIcon(ctx, x, y, 0.7); break;
      case 'pill': Util.drawPillIcon(ctx, x, y, PILL_COLORS_BY_ID[p.pillColor].color); break;
      case 'star': Util.drawStarIcon(ctx, x, y, STAR_TYPES[p.starId].color); break;

      case 'wispdye': Util.drawWispDyeIcon(ctx, x, y, WISP_DYE_TYPES_BY_ID[p.wispDyeId].color); break;
      case 'wispaugment': Util.drawWispAugmentIcon(ctx, x, y, WISP_AUGMENT_TYPES_BY_ID[p.wispAugmentId].color); break;
    }
  },

  drawChestIcon(ctx, c){
    const def = c.def;
    const baseColor = c.opened ? def.dark : def.color;
    const grad = ctx.createLinearGradient(c.x, c.y - 9, c.x, c.y + 9);
    grad.addColorStop(0, Util.shadeColor(baseColor, 0.3));
    grad.addColorStop(1, Util.shadeColor(baseColor, -0.2));
    ctx.fillStyle = grad;
    ctx.fillRect(c.x - 13, c.y - 9, 26, 18);
    ctx.fillStyle = def.lidColor;
    ctx.fillRect(c.x - 13, c.y - 9, 26, 5);
    if (!c.opened) {

      ctx.strokeStyle = Theme.shadow.sheen; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(c.x - 12, c.y - 3.5); ctx.lineTo(c.x + 12, c.y - 3.5); ctx.stroke();
    }
    if (c.opened) return;
    ctx.strokeStyle = Theme.shadow.outline; ctx.lineWidth = 1;
    ctx.strokeRect(c.x - 13 + 0.5, c.y - 9 + 0.5, 25, 17);
    if (def.requires === 'bomb') {
      ctx.fillStyle = Theme.chest.lockBomb;
      ctx.beginPath(); ctx.arc(c.x, c.y + 2, 3.5, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = 'rgba(0,0,0,.4)';
      ctx.beginPath(); ctx.arc(c.x, c.y + 1.2, 1, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(c.x - 0.6, c.y + 1.5, 1.2, 2);
    } else if (def.requires === 'key') {
      ctx.fillStyle = Theme.chest.lockKey;
      ctx.beginPath(); ctx.arc(c.x, c.y + 2, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.4)';
      ctx.beginPath(); ctx.arc(c.x, c.y + 1.2, 0.9, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(c.x - 0.5, c.y + 1.4, 1, 1.8);
    } else if (def.requires === 'hearts') {
      ctx.fillStyle = Theme.chest.lockHeart; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('♥', c.x, c.y + 3);
    } else {
      ctx.fillStyle = Theme.chest.lockPlain;
      ctx.beginPath(); ctx.arc(c.x, c.y + 2, 3, 0, Math.PI * 2); ctx.fill();
    }
  },

  drawItemIcon(ctx, x, y, item, now){
    const q = item.quality || 0;
    const glow = q ? Util.qualityGlow(q) : null;
    ctx.save();
    ctx.translate(x, y);
    if (glow) {
      const pulse = 1 + Math.sin((now || 0) / 260) * 0.12;
      if (glow.ring) {

        const top = q >= 4;
        ctx.strokeStyle = glow.color;
        ctx.globalAlpha = top ? 0.7 : 0.5; ctx.lineWidth = top ? 3 : 2;
        ctx.beginPath(); ctx.arc(0, 0, 17 * pulse, 0, Math.PI * 2); ctx.stroke();
        if (top) {
          ctx.globalAlpha = 0.22; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(0, 0, 21 * pulse, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      ctx.shadowColor = glow.color; ctx.shadowBlur = glow.blur;
    }
    ctx.fillStyle = Util.bodyShadeLocal(ctx, 0, 0, 13, item.color);
    ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = Theme.shadow.rim;
    ctx.beginPath(); ctx.arc(0, 0, 11.6, Math.PI * 0.85, Math.PI * 1.75); ctx.stroke();
    ctx.strokeStyle = Theme.shadow.outlineSoft;
    ctx.beginPath(); ctx.arc(0, 0, 11.6, Math.PI * -0.15, Math.PI * 0.75); ctx.stroke();
    ctx.fillStyle = Theme.shadow.sheen;
    ctx.beginPath(); ctx.ellipse(-4.5, -5.5, 3.6, 2.2, -0.6, 0, Math.PI * 2); ctx.fill();

    ctx.lineWidth = 1;
    ctx.strokeStyle = glow ? glow.color : Theme.icon.itemRing;
    ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.stroke();
    ctx.font = '14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = Theme.ui.onIcon;

    ctx.shadowColor = Theme.shadow.groundHard; ctx.shadowBlur = 2;
    ctx.fillText(item.icon, 0, 1);
    ctx.shadowBlur = 0;
    ctx.restore();
  },

  _humanoidSprites: new Map(),

  _humanoidSprite(e, flash, scale){
    const tuft = !!(e.type && (e.type.id === 'sapling' || e.type.id === 'sprout'));
    const key = (e.behavior || '') + '|' + e.color + '|' + e.dark + '|' + e.radius + '|' +
      (flash ? 1 : 0) + '|' + (e.shielded ? 1 : 0) + '|' + (tuft ? 1 : 0) + '|' + scale;
    let sp = Util._humanoidSprites.get(key);
    if (sp) return sp;
    const r = e.radius;
    const turret = (e.behavior || '') === 'turret';

    const up = (v) => Math.ceil(v * scale) / scale;
    const ox = up(turret ? r * 1.05 : r * 1.4);
    const oyTop = up(turret ? r * 1.05 : r * 1.95);
    const oyBot = up(turret ? r * 1.05 : r * 1.15);
    const cv = document.createElement('canvas');

    const pw = Math.max(1, Math.ceil(ox * 2 * scale)), ph = Math.max(1, Math.ceil((oyTop + oyBot) * scale));
    cv.width = pw; cv.height = ph;
    const bctx = cv.getContext('2d');
    bctx.setTransform(scale, 0, 0, scale, 0, 0);

    bctx.translate(ox - e.x, oyTop - e.y);
    if (turret) Util._turretStatic(bctx, e, flash); else Util._humanoidStatic(bctx, e, flash);
    sp = { cv, ox, oy: oyTop, w: pw / scale, h: ph / scale };

    while (Util._humanoidSprites.size >= 256) {
      Util._humanoidSprites.delete(Util._humanoidSprites.keys().next().value);
    }
    Util._humanoidSprites.set(key, sp);
    return sp;
  },

  _blitSprite(ctx, sp, e, scale){

    ctx.drawImage(sp.cv,
      Math.round((e.x - sp.ox) * scale) / scale,
      Math.round((e.y - sp.oy) * scale) / scale,
      sp.w, sp.h);
  },
};
