'use strict';

const _reducedMotionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
let prefersReducedMotion = !!(_reducedMotionQuery && _reducedMotionQuery.matches);
if (_reducedMotionQuery && _reducedMotionQuery.addEventListener) {
  _reducedMotionQuery.addEventListener('change', (e) => { prefersReducedMotion = e.matches; });
}

function reducedCount(n){ return prefersReducedMotion ? Math.max(1, Math.round(n * 0.35)) : n; }

const FX = {
  MAX: 260,
  _p: null,
  _next: 0,
  shakeX: 0, shakeY: 0,
  _shakeMag: 0, _shakeT: 0, _shakeDur: 1,
  hitStopTimer: 0,

  init(){
    if (this._p) return;
    const p = new Array(this.MAX);
    for (let i = 0; i < this.MAX; i++) {
      p[i] = { life: 0, maxLife: 1, x: 0, y: 0, vx: 0, vy: 0, grav: 0, drag: 2.2, size: 1, color: '#fff', kind: 0 };
    }
    this._p = p;
  },

  reset(){
    this.init();
    for (let i = 0; i < this.MAX; i++) this._p[i].life = 0;
    this._shakeT = 0; this._shakeMag = 0; this.shakeX = 0; this.shakeY = 0;
    this.hitStopTimer = 0;
  },

  _take(){
    const q = this._p[this._next];
    this._next = (this._next + 1) % this.MAX;
    return q;
  },

  emit(x, y, vx, vy, life, size, color, kind, grav, drag){
    const q = this._take();
    q.x = x; q.y = y; q.vx = vx; q.vy = vy;
    q.life = life; q.maxLife = life;
    q.size = size; q.color = color; q.kind = kind || 0;
    q.grav = grav || 0; q.drag = drag === undefined ? 2.2 : drag;
    return q;
  },

  sparks(x, y, color, count){
    this.init();
    const n = reducedCount(count || 5);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 110;
      this.emit(x, y, Math.cos(a) * s, Math.sin(a) * s - 20, 0.16 + Math.random() * 0.12,
        1.2 + Math.random(), color || Theme.particle.hitSpark, 1, 240, 3.4);
    }
  },

  puff(x, y, color, count){
    this.init();
    const n = reducedCount(count || 8);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 8 + Math.random() * 30;
      this.emit(x, y + Util.rand(-4, 4), Math.cos(a) * s, Math.sin(a) * s - 22,
        0.32 + Math.random() * 0.24, 2 + Math.random() * 2.4, color || Theme.particle.bloodPuff, 2, -14, 1.6);
    }
  },

  dust(x, y){
    this.init();
    const a = Math.random() * Math.PI * 2;
    this.emit(x, y, Math.cos(a) * 10, Math.sin(a) * 5 - 6, 0.3 + Math.random() * 0.2,
      1.1 + Math.random() * 1.1, Theme.particle.dustSolid, 3, -8, 2.6);
  },

  sparkle(x, y, color){
    this.init();
    this.emit(x, y, Util.rand(-6, 6), -14 - Math.random() * 10, 0.5 + Math.random() * 0.3,
      1 + Math.random() * 0.8, color || Theme.particle.sparkle, 3, -6, 1.2);
  },

  twinkle(x, y, color, count){
    this.init();
    const n = reducedCount(count || 7);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
      const s = 26 + Math.random() * 34;
      this.emit(x, y, Math.cos(a) * s, Math.sin(a) * s - 30, 0.34 + Math.random() * 0.22,
        1.1 + Math.random() * 1.2, color || Theme.particle.sparkle, 3, -10, 1.7);
    }
  },

  burst(x, y, color, count, speed){
    this.init();
    const n = reducedCount(count || 10), sp = speed || 120;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
      const s = sp * (0.5 + Math.random() * 0.7);
      this.emit(x, y, Math.cos(a) * s, Math.sin(a) * s, 0.26 + Math.random() * 0.2,
        1.6 + Math.random() * 1.8, color, 1, 60, 3);
    }
  },

  shake(amount, duration){
    if (prefersReducedMotion) return;
    const d = duration || 0.2;
    const current = this._shakeMag * Math.max(0, this._shakeT / this._shakeDur);
    if (amount <= current) return;
    this._shakeMag = amount; this._shakeDur = d; this._shakeT = d;
  },

  hitStop(seconds){
    if (seconds > this.hitStopTimer) this.hitStopTimer = seconds;
  },
  frozen(){ return this.hitStopTimer > 0; },

  update(dt){
    this.init();
    if (this.hitStopTimer > 0) { this.hitStopTimer -= dt; return; }
    if (this._shakeT > 0) {
      this._shakeT -= dt;
      if (this._shakeT <= 0) { this._shakeT = 0; this._shakeMag = 0; this.shakeX = 0; this.shakeY = 0; }
      else {

        const k = this._shakeT / this._shakeDur, a = this._shakeMag * k * k;
        this.shakeX = (Math.random() * 2 - 1) * a;
        this.shakeY = (Math.random() * 2 - 1) * a;
      }
    }
    const p = this._p;
    for (let i = 0; i < this.MAX; i++) {
      const q = p[i];
      if (q.life <= 0) continue;
      q.life -= dt;
      if (q.life <= 0) continue;
      q.vy += q.grav * dt;
      const d = 1 - Math.min(0.95, q.drag * dt);
      q.vx *= d; q.vy *= d;
      q.x += q.vx * dt; q.y += q.vy * dt;
    }
  },

  draw(ctx){
    const p = this._p;
    if (!p) return;
    for (let i = 0; i < this.MAX; i++) {
      const q = p[i];
      if (q.life <= 0) continue;
      const t = q.life / q.maxLife;
      ctx.globalAlpha = t < 0.4 ? t / 0.4 : 1;
      if (q.kind === 1) {
        ctx.strokeStyle = q.color; ctx.lineWidth = q.size;
        ctx.beginPath();
        ctx.moveTo(q.x, q.y);
        ctx.lineTo(q.x - q.vx * 0.022, q.y - q.vy * 0.022);
        ctx.stroke();
      } else if (q.kind === 2) {
        ctx.fillStyle = q.color;
        ctx.beginPath(); ctx.arc(q.x, q.y, q.size * (1.9 - t), 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = q.color;
        ctx.beginPath(); ctx.arc(q.x, q.y, q.size * (0.4 + t * 0.6), 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  },
};
FX.init();

function roomFlavor(node, pal){
  if (node && (node.type === 'treasure' || node.type === 'crystal')) return 'crystal';
  return paletteFlavor(pal);
}

function paintFlavorFloorMark(ctx, px, py, x, y, pal, baseFloor, flavor){
  const r0 = tileRand(x, y, 320);
  if (r0 < 0.72) return;
  const a = tileRand(x, y, 321), b = tileRand(x, y, 322), c = tileRand(x, y, 323);
  const mx = px + 7 + a * 18, my = py + 7 + b * 18;
  ctx.save();
  if (flavor === 'bone') {
    ctx.strokeStyle = Util.shadeColor(baseFloor, 0.34);
    ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(mx - 3, my - 2 + c * 3); ctx.lineTo(mx + 3, my + 1 - c * 3);
    ctx.stroke();
  } else if (flavor === 'leaf') {
    ctx.globalAlpha = 0.34; ctx.fillStyle = pal.accent;
    for (let i = 0; i < 3; i++) {
      const lx = mx + (i - 1) * 4, ly = my + (i === 1 ? 3 : 0);
      ctx.beginPath(); ctx.ellipse(lx, ly, 2.4, 1.1, c * 3 + i, 0, Math.PI * 2); ctx.fill();
    }
  } else if (flavor === 'sand') {
    ctx.globalAlpha = 0.38; ctx.strokeStyle = Util.shadeColor(baseFloor, 0.2); ctx.lineWidth = 1;
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.arc(mx, my + i * 4 + 6, 8 + i * 2, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }
  } else if (flavor === 'fire') {
    ctx.globalAlpha = 0.3; ctx.fillStyle = Util.shadeColor(baseFloor, -0.5);
    ctx.beginPath(); ctx.ellipse(mx, my, 5 + c * 3, 3 + c * 2, a * 3, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.5; ctx.fillStyle = pal.accent;
    ctx.beginPath(); ctx.arc(mx + 1, my - 1, 0.9, 0, Math.PI * 2); ctx.fill();
  } else if (flavor === 'ice') {
    ctx.globalAlpha = 0.4; ctx.strokeStyle = Theme.shadow.sheen; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const ang = c * Math.PI + i * (Math.PI / 3);
      ctx.moveTo(mx - Math.cos(ang) * 4, my - Math.sin(ang) * 4);
      ctx.lineTo(mx + Math.cos(ang) * 4, my + Math.sin(ang) * 4);
    }
    ctx.stroke();
  } else if (flavor === 'rust') {
    ctx.globalAlpha = 0.22; ctx.fillStyle = pal.accent;
    ctx.beginPath(); ctx.ellipse(mx, my, 4 + c * 3, 3 + a * 2, b * 3, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.3; ctx.fillStyle = Util.shadeColor(baseFloor, -0.35);
    ctx.beginPath(); ctx.arc(mx + 2, my + 1, 1.2, 0, Math.PI * 2); ctx.fill();
  } else if (flavor === 'shell') {
    ctx.globalAlpha = 0.42; ctx.strokeStyle = Util.shadeColor(baseFloor, 0.3); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(mx, my, 3 + c * 1.5, Math.PI * 0.15, Math.PI * 1.25); ctx.stroke();
    ctx.beginPath(); ctx.arc(mx, my, 1.4 + c, Math.PI * 0.15, Math.PI * 1.25); ctx.stroke();
  } else if (flavor === 'tide') {
    ctx.globalAlpha = 0.3; ctx.strokeStyle = pal.accent; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + 3, my);
    ctx.quadraticCurveTo(px + 11, my - 3 - c * 2, px + 18, my);
    ctx.quadraticCurveTo(px + 25, my + 3 + c * 2, px + TILE - 3, my);
    ctx.stroke();
  } else if (flavor === 'silt') {
    ctx.globalAlpha = 0.26; ctx.fillStyle = Util.shadeColor(baseFloor, -0.3);
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(mx + (i - 1) * 5, my + (i === 1 ? 2 : -1), 3.5 - i * 0.6, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (flavor === 'abyss') {
    ctx.globalAlpha = 0.34; ctx.fillStyle = Util.shadeColor(baseFloor, -0.45);
    ctx.beginPath(); ctx.ellipse(mx, my, 7 + c * 4, 5 + a * 3, b * 3, 0, Math.PI * 2); ctx.fill();
  } else if (flavor === 'vent') {
    ctx.globalAlpha = 0.5; ctx.strokeStyle = Util.shadeColor(baseFloor, -0.45); ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(mx - 5, my + 2); ctx.lineTo(mx - 1, my - 2); ctx.lineTo(mx + 4, my + 1);
    ctx.stroke();
    ctx.globalAlpha = 0.38; ctx.fillStyle = pal.accent;
    ctx.beginPath(); ctx.arc(mx - 1, my - 2, 1.1, 0, Math.PI * 2); ctx.fill();
  } else if (flavor === 'void') {
    ctx.globalAlpha = 0.45; ctx.fillStyle = pal.accent;
    ctx.beginPath(); ctx.arc(mx, my, 0.8 + c * 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.18;
    ctx.beginPath(); ctx.arc(mx, my, 2.6 + c, 0, Math.PI * 2); ctx.fill();
  } else if (flavor === 'crystal') {
    ctx.globalAlpha = 0.34; ctx.fillStyle = Theme.shadow.glint;
    ctx.beginPath();
    ctx.moveTo(mx, my - 3.4); ctx.lineTo(mx + 2, my); ctx.lineTo(mx, my + 3.4); ctx.lineTo(mx - 2, my);
    ctx.closePath(); ctx.fill();
  } else if (flavor === 'moss') {
    ctx.globalAlpha = 0.24; ctx.fillStyle = pal.accent;
    ctx.beginPath(); ctx.ellipse(mx, my, 5 + c * 3, 3.4 + a * 2, b * 2, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.3;
    ctx.beginPath(); ctx.arc(mx + 3, my - 2, 1.3, 0, Math.PI * 2); ctx.fill();
  } else if (flavor === 'slime') {
    ctx.globalAlpha = 0.2; ctx.fillStyle = pal.accent;
    ctx.beginPath(); ctx.ellipse(mx, my, 4.5 + c * 2, 3 + a * 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.4; ctx.fillStyle = Theme.shadow.sheen;
    ctx.beginPath(); ctx.ellipse(mx - 1.4, my - 1.2, 1.3, 0.8, -0.5, 0, Math.PI * 2); ctx.fill();
  } else if (flavor === 'mud') {
    ctx.globalAlpha = 0.3; ctx.fillStyle = Util.shadeColor(baseFloor, -0.32);
    ctx.beginPath(); ctx.ellipse(mx, my, 6 + c * 3, 3 + a * 2, b * 3, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.22;
    ctx.beginPath(); ctx.arc(mx + 5, my + 2.5, 1.6, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.globalAlpha = 0.34; ctx.fillStyle = Util.shadeColor(baseFloor, -0.28);
    ctx.beginPath(); ctx.arc(mx, my, 1.1 + c * 1.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(mx + 4 + a * 3, my + 2 + b * 3, 0.8 + c * 0.7, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawDecorProp(ctx, p, pal){
  const dark = Util.shadeColor(pal.floorA, -0.4);
  const mid = Util.shadeColor(pal.floorA, -0.2);
  const light = Util.shadeColor(pal.floorA, 0.3);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(p.scale * p.flip, p.scale);
  ctx.globalAlpha = 0.85;
  const k = p.kind;
  if (k === 'pebble') {
    ctx.fillStyle = Theme.shadow.ground;
    ctx.beginPath(); ctx.ellipse(0.5, 2.2, 4, 1.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = mid;
    ctx.beginPath(); ctx.ellipse(0, 0, 3.4, 2.4, p.seed, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = light; ctx.globalAlpha = 0.4;
    ctx.beginPath(); ctx.ellipse(-1, -0.9, 1.2, 0.7, p.seed, 0, Math.PI * 2); ctx.fill();
  } else if (k === 'rubble') {
    ctx.fillStyle = Theme.shadow.ground;
    ctx.beginPath(); ctx.ellipse(0, 3, 6.5, 2.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = mid;
    for (let i = 0; i < 3; i++) {
      const a = p.seed + i * 2.1;
      const cx = Math.cos(a) * 3.4, cy = Math.sin(a) * 2;
      ctx.beginPath();
      ctx.moveTo(cx - 2.4, cy + 1.6); ctx.lineTo(cx - 0.6, cy - 2); ctx.lineTo(cx + 2.4, cy + 1.2);
      ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = dark; ctx.lineWidth = 0.7; ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.moveTo(-3, 1.8); ctx.lineTo(3.2, 1.2); ctx.stroke();
  } else if (k === 'bonechip') {
    ctx.fillStyle = Theme.shadow.ground;
    ctx.beginPath(); ctx.ellipse(0, 2.4, 5, 1.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#d8d2c2'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-4, 1); ctx.lineTo(4, -1.4); ctx.stroke();
    ctx.fillStyle = '#e6e1d2';
    ctx.beginPath(); ctx.arc(-4.2, 0.6, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(4.2, -1.8, 1.5, 0, Math.PI * 2); ctx.fill();
  } else if (k === 'skull') {
    ctx.fillStyle = Theme.shadow.ground;
    ctx.beginPath(); ctx.ellipse(0, 3.4, 5.4, 1.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ddd7c6';
    ctx.beginPath(); ctx.ellipse(0, 0, 4.4, 3.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0.4, 3.2, 2.4, 1.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a2622';
    ctx.beginPath(); ctx.ellipse(-1.7, -0.4, 1.2, 1.4, 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(1.7, -0.4, 1.2, 1.4, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(-0.5, 1.6, 1, 1.6);
  } else if (k === 'leaftuft') {
    ctx.fillStyle = Theme.shadow.ground;
    ctx.beginPath(); ctx.ellipse(0, 2.6, 6, 1.8, 0, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 4; i++) {
      const a = p.seed + i * 1.6;
      ctx.fillStyle = Util.shadeColor(pal.accent, -0.15 + i * 0.08);
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * 3.2, Math.sin(a) * 2.2, 3, 1.3, a, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (k === 'twig') {
    ctx.strokeStyle = Util.shadeColor('#6b5136', -0.05); ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-6, 2); ctx.lineTo(-1, -1); ctx.lineTo(5.5, 0.6);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-1, -1); ctx.lineTo(0.5, -4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(2.5, -0.2); ctx.lineTo(4.5, -3); ctx.stroke();
  } else if (k === 'mushroom') {
    ctx.fillStyle = Theme.shadow.ground;
    ctx.beginPath(); ctx.ellipse(0, 3.2, 4, 1.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#cfc2ab';
    ctx.fillRect(-0.9, -1, 1.8, 4);
    ctx.fillStyle = Util.shadeColor(pal.accent, -0.1);
    ctx.beginPath(); ctx.ellipse(0, -1.4, 3.6, 2.4, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = light; ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.arc(-1.2, -2.2, 0.7, 0, Math.PI * 2); ctx.fill();
  } else if (k === 'sandripple') {
    ctx.strokeStyle = light; ctx.globalAlpha = 0.4; ctx.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(0, 4 + i * 2.6, 5 + i * 1.6, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }
  } else if (k === 'ashpile') {
    ctx.fillStyle = Theme.shadow.ground;
    ctx.beginPath(); ctx.ellipse(0, 2.6, 7, 2.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a3230'; ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(-6, 2.4);
    ctx.quadraticCurveTo(-2.4, -3.2, 0.4, -1.2);
    ctx.quadraticCurveTo(3, -3.6, 6, 2.4);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#6d625c'; ctx.globalAlpha = 0.6;
    ctx.beginPath(); ctx.ellipse(-1.6, 0.8, 2, 0.9, 0.2, 0, Math.PI * 2); ctx.fill();
  } else if (k === 'ember') {
    ctx.fillStyle = '#2b1a14';
    ctx.beginPath(); ctx.ellipse(0, 1, 4.4, 2.4, p.seed * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = pal.accent;
    ctx.shadowColor = pal.accent; ctx.shadowBlur = 7;
    ctx.beginPath(); ctx.arc(-1.2, 0.4, 1.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(1.6, 1.4, 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  } else if (k === 'iceshard') {
    ctx.fillStyle = Theme.shadow.ground;
    ctx.beginPath(); ctx.ellipse(0, 3.4, 4.6, 1.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#bfe4f5'; ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.moveTo(-2.6, 3.2); ctx.lineTo(-0.8, -4.6); ctx.lineTo(1.2, 3.2);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(1, 3.2); ctx.lineTo(2.8, -1.6); ctx.lineTo(4, 3.2);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = Theme.shadow.sheen; ctx.lineWidth = 0.8; ctx.globalAlpha = 0.7;
    ctx.beginPath(); ctx.moveTo(-0.8, -4.2); ctx.lineTo(-0.4, 2.4); ctx.stroke();
  } else if (k === 'crystalshard') {
    ctx.fillStyle = Theme.shadow.ground;
    ctx.beginPath(); ctx.ellipse(0, 3.4, 4.4, 1.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = pal.accent; ctx.globalAlpha = 0.68;
    ctx.shadowColor = pal.accent; ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(0, -5.2); ctx.lineTo(2.4, -1); ctx.lineTo(1.4, 3.2); ctx.lineTo(-1.6, 3.2); ctx.lineTo(-2.4, -1);
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = Theme.shadow.glint; ctx.globalAlpha = 0.8;
    ctx.beginPath(); ctx.arc(-0.8, -2.4, 0.8, 0, Math.PI * 2); ctx.fill();
  } else if (k === 'rustflake') {
    ctx.fillStyle = Theme.shadow.ground;
    ctx.beginPath(); ctx.ellipse(0, 2.4, 5.4, 1.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = Util.shadeColor(pal.accent, -0.35);
    ctx.beginPath();
    ctx.moveTo(-4.6, 1.8); ctx.lineTo(-2.2, -2.2); ctx.lineTo(2.6, -1.4); ctx.lineTo(4.4, 2);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = Util.shadeColor(pal.accent, 0.1); ctx.lineWidth = 0.8; ctx.globalAlpha = 0.6;
    ctx.beginPath(); ctx.moveTo(-2.6, 0.4); ctx.lineTo(3, -0.2); ctx.stroke();
  } else if (k === 'shell') {
    ctx.fillStyle = Theme.shadow.ground;
    ctx.beginPath(); ctx.ellipse(0, 2.8, 4.6, 1.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8dcc6';
    ctx.beginPath(); ctx.ellipse(0, 0, 4.2, 3.4, p.seed * 0.2, Math.PI, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#b9a88c'; ctx.lineWidth = 0.7;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(i * 1.8, -3.2); ctx.stroke();
    }
  } else if (k === 'kelp') {
    ctx.strokeStyle = Util.shadeColor(pal.accent, -0.3); ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.quadraticCurveTo(-3, 0, -0.6, -5.5);
    ctx.stroke();
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0.6, 4); ctx.quadraticCurveTo(3.4, -0.4, 2.2, -4);
    ctx.stroke();
    ctx.fillStyle = Util.shadeColor(pal.accent, -0.1); ctx.globalAlpha = 0.6;
    ctx.beginPath(); ctx.ellipse(-1.4, -2.6, 1.8, 0.9, 0.6, 0, Math.PI * 2); ctx.fill();
  } else if (k === 'siltmound') {
    ctx.fillStyle = Util.shadeColor(pal.floorB, -0.24); ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(-6.5, 2.6);
    ctx.quadraticCurveTo(-2, -2.6, 1, -0.6);
    ctx.quadraticCurveTo(4, -2.4, 6.5, 2.6);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = dark; ctx.globalAlpha = 0.35;
    ctx.beginPath(); ctx.ellipse(1.8, 1.6, 2.4, 0.9, 0, 0, Math.PI * 2); ctx.fill();
  } else if (k === 'tubeworm') {
    ctx.fillStyle = Theme.shadow.ground;
    ctx.beginPath(); ctx.ellipse(0, 3.4, 4.4, 1.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#cdbfae'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-2.4, 3); ctx.quadraticCurveTo(-3.4, -2, -1.4, -4.4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(1.8, 3); ctx.quadraticCurveTo(3.2, -1, 2.2, -3.2); ctx.stroke();
    ctx.fillStyle = '#c9403c';
    ctx.beginPath(); ctx.arc(-1.4, -4.8, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(2.3, -3.6, 1, 0, Math.PI * 2); ctx.fill();
  } else if (k === 'stardust') {
    ctx.fillStyle = pal.accent;
    ctx.shadowColor = pal.accent; ctx.shadowBlur = 6;
    for (let i = 0; i < 4; i++) {
      const a = p.seed + i * 1.7;
      const r = 1.1 - i * 0.18;
      ctx.globalAlpha = 0.75 - i * 0.12;
      ctx.beginPath(); ctx.arc(Math.cos(a) * (2 + i), Math.sin(a) * (1.4 + i * 0.7), r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.shadowBlur = 0;
  } else if (k === 'mosspatch') {
    ctx.fillStyle = Util.shadeColor(pal.accent, -0.4); ctx.globalAlpha = 0.55;
    ctx.beginPath(); ctx.ellipse(0, 0, 6.4, 3.6, p.seed * 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = Util.shadeColor(pal.accent, -0.1); ctx.globalAlpha = 0.5;
    for (let i = 0; i < 3; i++) {
      const a = p.seed + i * 2.2;
      ctx.beginPath(); ctx.ellipse(Math.cos(a) * 3, Math.sin(a) * 1.8, 2, 1.2, a, 0, Math.PI * 2); ctx.fill();
    }
  } else if (k === 'mudsplat') {
    ctx.fillStyle = Util.shadeColor(pal.floorA, -0.36); ctx.globalAlpha = 0.75;
    ctx.beginPath(); ctx.ellipse(0, 0, 6.8, 3.2, p.seed * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(5.4, 2.2, 1.8, 1.1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-5, -1.8, 1.4, 0.9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = Theme.shadow.sheen; ctx.globalAlpha = 0.18;
    ctx.beginPath(); ctx.ellipse(-1.6, -0.8, 2.4, 1, -0.4, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.fillStyle = mid;
    ctx.beginPath(); ctx.ellipse(0, 0, 3, 2, p.seed, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

const Ambient = {
  MAX: 14,
  _p: [],
  _next: 0,
  _spawnT: 0,
  init(){
    for (let i = 0; i < this.MAX; i++) {
      this._p.push({ life: 0, maxLife: 1, x: 0, y: 0, vx: 0, vy: 0, size: 1, color: '#fff', kind: 0, phase: 0, sway: 0 });
    }
  },
  reset(){ for (const q of this._p) q.life = 0; this._spawnT = 0; },
  _take(){ const q = this._p[this._next]; this._next = (this._next + 1) % this.MAX; return q; },
  alive(){ let n = 0; for (const q of this._p) if (q.life > 0) n++; return n; },

  spawn(camX, camY, flavor, pal){
    const q = this._take();
    q.x = camX + Math.random() * CAMERA_W;
    q.y = camY + Math.random() * CAMERA_H;
    q.phase = Math.random() * Math.PI * 2;
    q.sway = 0;
    if (flavor === 'fire') {
      q.kind = 1; q.maxLife = q.life = Util.rand(1.6, 2.8);
      q.vx = Util.rand(-6, 6); q.vy = Util.rand(-22, -9);
      q.size = Util.rand(1, 2); q.color = Theme.particle.hitSpark;
    } else if (flavor === 'ice') {
      q.kind = 2; q.maxLife = q.life = Util.rand(3, 5);
      q.vx = Util.rand(-5, 5); q.vy = Util.rand(7, 16);
      q.sway = Util.rand(5, 14);
      q.size = Util.rand(1, 2.1); q.color = pal.accent;
    } else if (flavor === 'crystal') {
      q.kind = 3; q.maxLife = q.life = Util.rand(1.4, 2.4);
      q.vx = Util.rand(-4, 4); q.vy = Util.rand(-8, -2);
      q.size = Util.rand(1, 1.8); q.color = Theme.particle.sparkle;
    } else {
      q.kind = 0; q.maxLife = q.life = Util.rand(3, 5.5);
      q.vx = Util.rand(-8, 8); q.vy = Util.rand(-5, 3);
      q.size = Util.rand(1, 2); q.color = Theme.particle.dustSolid;
    }
  },

  update(dt, camX, camY, flavor, pal){
    const cap = prefersReducedMotion ? reducedCount(this.MAX) : this.MAX;
    this._spawnT -= dt;
    if (this._spawnT <= 0) {
      this._spawnT = flavor === 'fire' ? 0.28 : flavor === 'crystal' ? 0.34 : 0.42;
      if (this.alive() < cap) this.spawn(camX, camY, flavor, pal);
    }
    for (const q of this._p) {
      if (q.life <= 0) continue;
      q.life -= dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      if (q.kind === 1) q.vy -= 4 * dt;
      else if (q.kind === 2) q.x += Math.sin(q.phase + q.life * 1.6) * q.sway * dt;
    }
  },

  draw(ctx){
    for (const q of this._p) {
      if (q.life <= 0) continue;
      const t = q.life / q.maxLife;

      let a = t > 0.85 ? (1 - t) / 0.15 : t / 0.85;
      a *= q.kind === 3 ? 0.55 : q.kind === 1 ? 0.5 : 0.34;
      if (q.kind === 3) a *= 0.55 + 0.45 * Math.sin(q.phase + q.life * 7);
      if (a <= 0.01) continue;
      ctx.globalAlpha = a;
      ctx.fillStyle = q.color;
      ctx.beginPath(); ctx.arc(q.x, q.y, q.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  },
};
Ambient.init();

const LIGHT_R = 140;
let _lightSprite = null;
function playerLightSprite(){
  if (_lightSprite) return _lightSprite;
  const cv = document.createElement('canvas');
  cv.width = cv.height = LIGHT_R * 2;
  const c = cv.getContext('2d');
  const g = c.createRadialGradient(LIGHT_R, LIGHT_R, 0, LIGHT_R, LIGHT_R, LIGHT_R);

  g.addColorStop(0, 'rgba(255,226,170,0.10)');
  g.addColorStop(0.45, 'rgba(255,214,150,0.055)');
  g.addColorStop(0.78, 'rgba(255,200,140,0.018)');
  g.addColorStop(1, 'rgba(255,196,136,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, LIGHT_R * 2, LIGHT_R * 2);
  _lightSprite = cv;
  return cv;
}

const FIRE_LIGHT_R = 80;
const _fireLightSprites = new Map();
function fireLightSprite(color){
  let cv = _fireLightSprites.get(color);
  if (cv) return cv;

  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color || '');
  const rgb = m ? parseInt(m[1], 16) + ',' + parseInt(m[2], 16) + ',' + parseInt(m[3], 16) : '255,170,90';
  cv = document.createElement('canvas');
  cv.width = cv.height = FIRE_LIGHT_R * 2;
  const c = cv.getContext('2d');
  const g = c.createRadialGradient(FIRE_LIGHT_R, FIRE_LIGHT_R, 0, FIRE_LIGHT_R, FIRE_LIGHT_R, FIRE_LIGHT_R);

  g.addColorStop(0, 'rgba(' + rgb + ',0.15)');
  g.addColorStop(0.4, 'rgba(' + rgb + ',0.075)');
  g.addColorStop(0.75, 'rgba(' + rgb + ',0.022)');
  g.addColorStop(1, 'rgba(' + rgb + ',0)');
  c.fillStyle = g;
  c.fillRect(0, 0, FIRE_LIGHT_R * 2, FIRE_LIGHT_R * 2);
  _fireLightSprites.set(color, cv);
  return cv;
}

const GROUND_OBSTACLES = { pit: 1, mud: 1, sandtrap: 1 };

const SPARKLE_PICKUPS = { coin: 1, goldkey: 1, goldbomb: 1, star: 1, heartContainer: 1 };

const SORT_BY_Y = (a, b) => a.y - b.y;

function paintDoorSlab(ctx, px, py, color){

  ctx.fillStyle = Util.shadeColor(color, -0.4);
  ctx.fillRect(px, py, TILE, TILE);
  const f = 3;
  const i = f + 3;
  const panelW = TILE - i * 2, panelH = TILE - i * 2;
  const wash = ctx.createLinearGradient(px, py + i, px, py + i + panelH);
  wash.addColorStop(0, Util.shadeColor(color, 0.16));
  wash.addColorStop(1, Util.shadeColor(color, -0.14));
  ctx.fillStyle = wash;
  ctx.fillRect(px + i, py + i, panelW, panelH);

  ctx.lineWidth = 1;
  ctx.strokeStyle = Util.shadeColor(color, 0.3);
  ctx.beginPath();
  ctx.moveTo(px + i + 0.5, py + TILE - i - 0.5);
  ctx.lineTo(px + i + 0.5, py + i + 0.5);
  ctx.lineTo(px + TILE - i - 0.5, py + i + 0.5);
  ctx.stroke();
  ctx.strokeStyle = Util.shadeColor(color, -0.35);
  ctx.beginPath();
  ctx.moveTo(px + TILE - i - 0.5, py + i + 0.5);
  ctx.lineTo(px + TILE - i - 0.5, py + TILE - i - 0.5);
  ctx.lineTo(px + i + 0.5, py + TILE - i - 0.5);
  ctx.stroke();

  ctx.fillStyle = Util.shadeColor(color, -0.5);
  const rr = 1.1;
  ctx.beginPath(); ctx.arc(px + f + 1, py + f + 1, rr, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(px + TILE - f - 1, py + f + 1, rr, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(px + f + 1, py + TILE - f - 1, rr, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(px + TILE - f - 1, py + TILE - f - 1, rr, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = Util.shadeColor(color, 0.35);
  ctx.beginPath(); ctx.arc(px + f + 0.7, py + f + 0.7, 0.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(px + TILE - f - 1.3, py + f + 0.7, 0.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(px + f + 0.7, py + TILE - f - 1.3, 0.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(px + TILE - f - 1.3, py + TILE - f - 1.3, 0.5, 0, Math.PI * 2); ctx.fill();

  ctx.strokeStyle = Util.shadeColor(color, -0.5);
  ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
}

const DOOR_STYLES = {
  normal:        'panel',
  start:         'arch',
  boss:          'skull',
  treasure:      'gem',
  shop:          'awning',
  secret:        'cracked',
  petshop:       'paw',
  curse:         'thorn',
  sacrifice:     'drip',
  vault:         'vaultslab',
  challenge:     'blades',
  crystal:       'facet',
  sombra:        'eclipse',
  star:          'starburst',
  cpathgate:     'grate',
  planetarium:   'portal',
  shrine:        'candle',
  arcade:        'coinslot',
  supersecret:   'spiral',
  mirror:        'mirrorsplit',
  karma:         'yinyang',
  bosschallenge: 'warning',
};

function doorGlow(ctx, color, blur){
  ctx.shadowColor = Util.shadeColor(color, 0.55);
  ctx.shadowBlur = blur;
}

function doorGlowOff(ctx){
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
}

const DOOR_OVERLAYS = {

  arch(ctx, px, py, color){
    const cx = px + TILE / 2, base = py + TILE - 7;
    ctx.strokeStyle = Util.shadeColor(color, 0.42);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 8, base);
    ctx.lineTo(cx - 8, py + TILE * 0.44);
    ctx.arc(cx, py + TILE * 0.44, 8, Math.PI, 0);
    ctx.lineTo(cx + 8, base);
    ctx.stroke();
    ctx.fillStyle = Util.shadeColor(color, 0.2);
    ctx.fillRect(cx - 1.5, py + TILE * 0.44, 3, base - py - TILE * 0.44);
  },

  skull(ctx, px, py, color){
    const cx = px + TILE / 2, cy = py + TILE / 2;
    ctx.fillStyle = Util.shadeColor(color, 0.4);
    ctx.beginPath(); ctx.arc(cx, cy - 2, 6.5, Math.PI, 0); ctx.fill();
    ctx.fillRect(cx - 6.5, cy - 2, 13, 6);
    ctx.fillStyle = Util.shadeColor(color, -0.72);
    ctx.beginPath(); ctx.arc(cx - 3, cy - 2, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 3, cy - 2, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(cx - 1, cy + 1.5, 2, 2.5);
    ctx.fillStyle = Util.shadeColor(color, 0.3);
    ctx.fillRect(cx - 4.5, cy + 5, 9, 3);
    ctx.fillStyle = Util.shadeColor(color, -0.6);
    ctx.fillRect(cx - 2, cy + 5, 1, 3);
    ctx.fillRect(cx + 1, cy + 5, 1, 3);
  },

  gem(ctx, px, py, color){
    const cx = px + TILE / 2, cy = py + TILE / 2, r = 7;
    doorGlow(ctx, color, 6);
    ctx.fillStyle = Util.shadeColor(color, 0.45);
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r * 0.8, cy - r * 0.2);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r * 0.8, cy - r * 0.2);
    ctx.closePath(); ctx.fill();
    doorGlowOff(ctx);
    ctx.strokeStyle = Util.shadeColor(color, 0.75);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.8, cy - r * 0.2); ctx.lineTo(cx + r * 0.8, cy - r * 0.2);
    ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r);
    ctx.stroke();
  },

  awning(ctx, px, py, color){
    const top = py + 6;
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = Util.shadeColor(color, i % 2 === 0 ? 0.42 : -0.28);
      ctx.fillRect(px + 4 + i * 6, top, 6, 7);
    }
    ctx.fillStyle = Util.shadeColor(color, -0.5);
    ctx.fillRect(px + 4, top + 7, 24, 1.5);
    ctx.fillStyle = Util.shadeColor(color, 0.3);
    ctx.fillRect(px + 10, top + 12, 12, 10);
    ctx.fillStyle = Util.shadeColor(color, -0.45);
    ctx.fillRect(px + 12, top + 15, 8, 1.5);
    ctx.fillRect(px + 12, top + 18, 8, 1.5);
  },

  cracked(ctx, px, py, color){
    ctx.strokeStyle = Util.shadeColor(color, -0.7);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px + 6, py + 3);
    ctx.lineTo(px + 12, py + 11);
    ctx.lineTo(px + 9, py + 18);
    ctx.lineTo(px + 17, py + 27);
    ctx.moveTo(px + 12, py + 11);
    ctx.lineTo(px + 22, py + 8);
    ctx.moveTo(px + 9, py + 18);
    ctx.lineTo(px + 2, py + 22);
    ctx.stroke();
    ctx.strokeStyle = Util.shadeColor(color, 0.3);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + 7, py + 4);
    ctx.lineTo(px + 13, py + 12);
    ctx.stroke();
    ctx.fillStyle = Util.shadeColor(color, -0.55);
    ctx.beginPath(); ctx.arc(px + 24, py + 20, 2.2, 0, Math.PI * 2); ctx.fill();
  },

  paw(ctx, px, py, color){
    const cx = px + TILE / 2, cy = py + TILE / 2 + 2;
    ctx.fillStyle = Util.shadeColor(color, 0.45);
    ctx.beginPath(); ctx.ellipse(cx, cy + 2, 5.5, 4.5, 0, 0, Math.PI * 2); ctx.fill();
    const toes = [[-5.5, -5], [-2, -7.5], [2, -7.5], [5.5, -5]];
    for (const t of toes) {
      ctx.beginPath(); ctx.ellipse(cx + t[0], cy + t[1], 2.1, 2.6, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = Util.shadeColor(color, -0.4);
    ctx.beginPath(); ctx.ellipse(cx, cy + 2.5, 2.4, 1.8, 0, 0, Math.PI * 2); ctx.fill();
  },

  thorn(ctx, px, py, color){
    ctx.strokeStyle = Util.shadeColor(color, -0.6);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px + 4, py + TILE - 4);
    ctx.bezierCurveTo(px + 10, py + 20, px + 20, py + 14, px + TILE - 4, py + 4);
    ctx.stroke();
    ctx.fillStyle = Util.shadeColor(color, 0.4);
    const spikes = [[10, 21], [16, 17], [22, 12]];
    for (const s of spikes) {
      ctx.beginPath();
      ctx.moveTo(px + s[0], py + s[1]);
      ctx.lineTo(px + s[0] + 4, py + s[1] - 5);
      ctx.lineTo(px + s[0] + 1.5, py + s[1] + 1.5);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(px + s[0], py + s[1]);
      ctx.lineTo(px + s[0] - 4, py + s[1] + 5);
      ctx.lineTo(px + s[0] - 1.5, py + s[1] - 1.5);
      ctx.closePath(); ctx.fill();
    }
  },

  drip(ctx, px, py, color){
    ctx.fillStyle = Util.shadeColor(color, 0.38);
    ctx.fillRect(px + 5, py + 5, TILE - 10, 3);
    const runs = [[9, 14], [16, 21], [23, 11]];
    for (const r of runs) {
      ctx.fillRect(px + r[0], py + 8, 2.5, r[1]);
      ctx.beginPath(); ctx.arc(px + r[0] + 1.25, py + 8 + r[1], 2.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = Util.shadeColor(color, 0.7);
    for (const r of runs) {
      ctx.beginPath(); ctx.arc(px + r[0] + 0.6, py + 7.4 + r[1], 0.7, 0, Math.PI * 2); ctx.fill();
    }
  },

  vaultslab(ctx, px, py, color){
    ctx.fillStyle = Util.shadeColor(color, 0.32);
    ctx.fillRect(px + 3, py + 8, TILE - 6, 4);
    ctx.fillRect(px + 3, py + TILE - 12, TILE - 6, 4);
    ctx.fillStyle = Util.shadeColor(color, -0.55);
    ctx.fillRect(px + 3, py + 12, TILE - 6, 1.5);
    ctx.fillRect(px + 3, py + TILE - 8, TILE - 6, 1.5);
    const cx = px + TILE / 2, cy = py + TILE / 2;
    ctx.fillStyle = Util.shadeColor(color, 0.5);
    ctx.beginPath(); ctx.arc(cx, cy, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = Util.shadeColor(color, -0.5);
    ctx.beginPath(); ctx.arc(cx, cy, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = Util.shadeColor(color, 0.7);
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 3, cy + Math.sin(a) * 3);
      ctx.lineTo(cx + Math.cos(a) * 7.5, cy + Math.sin(a) * 7.5);
      ctx.stroke();
    }
  },

  blades(ctx, px, py, color){
    const cx = px + TILE / 2, cy = py + TILE / 2;
    for (const dir of [-1, 1]) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(dir * Math.PI / 4);
      ctx.fillStyle = Util.shadeColor(color, 0.5);
      ctx.beginPath();
      ctx.moveTo(0, -11);
      ctx.lineTo(2, -6);
      ctx.lineTo(2, 5);
      ctx.lineTo(-2, 5);
      ctx.lineTo(-2, -6);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = Util.shadeColor(color, -0.5);
      ctx.fillRect(-5, 5, 10, 2.2);
      ctx.fillRect(-1.2, 7, 2.4, 4);
      ctx.restore();
    }
  },

  facet(ctx, px, py, color){
    const cx = px + TILE / 2, cy = py + TILE / 2;
    doorGlow(ctx, color, 7);
    ctx.fillStyle = Util.shadeColor(color, 0.4);
    ctx.beginPath();
    ctx.moveTo(cx, cy - 10);
    ctx.lineTo(cx + 6, cy - 3);
    ctx.lineTo(cx + 4, cy + 9);
    ctx.lineTo(cx - 4, cy + 9);
    ctx.lineTo(cx - 6, cy - 3);
    ctx.closePath(); ctx.fill();
    doorGlowOff(ctx);
    ctx.strokeStyle = Util.shadeColor(color, 0.8);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - 3); ctx.lineTo(cx, cy + 2); ctx.lineTo(cx + 6, cy - 3);
    ctx.moveTo(cx, cy + 2); ctx.lineTo(cx, cy + 9);
    ctx.moveTo(cx, cy - 10); ctx.lineTo(cx, cy + 2);
    ctx.stroke();
    ctx.fillStyle = Theme.shadow.glint;
    ctx.beginPath(); ctx.arc(cx - 2, cy - 5, 1.1, 0, Math.PI * 2); ctx.fill();
  },

  eclipse(ctx, px, py, color){
    const cx = px + TILE / 2, cy = py + TILE / 2;
    ctx.fillStyle = Util.shadeColor(color, 0.6);
    ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = Util.shadeColor(color, -0.85);
    ctx.beginPath(); ctx.arc(cx - 2.5, cy - 1.5, 8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = Util.shadeColor(color, 0.75);
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.6;
    ctx.beginPath(); ctx.arc(cx, cy, 11.5, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  },

  starburst(ctx, px, py, color){
    const cx = px + TILE / 2, cy = py + TILE / 2;
    doorGlow(ctx, color, 8);
    ctx.fillStyle = Util.shadeColor(color, 0.6);
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5;
      const r = i % 2 === 0 ? 11 : 4.2;
      const fx = cx + Math.cos(a) * r, fy = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(fx, fy); else ctx.lineTo(fx, fy);
    }
    ctx.closePath(); ctx.fill();
    doorGlowOff(ctx);
    ctx.fillStyle = Util.shadeColor(color, 0.9);
    ctx.beginPath(); ctx.arc(cx, cy, 2.2, 0, Math.PI * 2); ctx.fill();
  },

  grate(ctx, px, py, color){
    ctx.fillStyle = Util.shadeColor(color, -0.7);
    ctx.fillRect(px + 5, py + 5, TILE - 10, TILE - 10);
    ctx.fillStyle = Util.shadeColor(color, 0.42);
    for (let i = 0; i < 4; i++) ctx.fillRect(px + 6 + i * 5.5, py + 5, 2.5, TILE - 10);
    ctx.fillRect(px + 5, py + 5, TILE - 10, 2);
    ctx.fillRect(px + 5, py + TILE - 7, TILE - 10, 2);
    ctx.strokeStyle = Util.shadeColor(color, -0.35);
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 4.5, py + 4.5, TILE - 9, TILE - 9);
  },

  candle(ctx, px, py, color){
    const cx = px + TILE / 2;
    ctx.fillStyle = Util.shadeColor(color, 0.25);
    ctx.fillRect(cx - 3.5, py + 15, 7, 11);
    ctx.fillStyle = Util.shadeColor(color, -0.4);
    ctx.fillRect(cx - 5, py + 25, 10, 2.5);
    doorGlow(ctx, color, 7);
    ctx.fillStyle = Util.shadeColor(color, 0.65);
    ctx.beginPath();
    ctx.moveTo(cx, py + 5);
    ctx.bezierCurveTo(cx + 4.5, py + 10, cx + 3.5, py + 15, cx, py + 15);
    ctx.bezierCurveTo(cx - 3.5, py + 15, cx - 4.5, py + 10, cx, py + 5);
    ctx.fill();
    doorGlowOff(ctx);
    ctx.fillStyle = Util.shadeColor(color, -0.3);
    ctx.beginPath(); ctx.ellipse(cx, py + 12, 1.4, 2.4, 0, 0, Math.PI * 2); ctx.fill();
  },

  coinslot(ctx, px, py, color){
    ctx.fillStyle = Util.shadeColor(color, 0.3);
    ctx.fillRect(px + 6, py + 5, TILE - 12, 12);
    ctx.fillStyle = Util.shadeColor(color, -0.75);
    ctx.fillRect(px + 8, py + 7, TILE - 16, 8);
    ctx.fillStyle = Util.shadeColor(color, 0.85);
    ctx.fillRect(px + 10, py + 9, 3, 4);
    ctx.fillRect(px + 15, py + 9, 3, 4);
    ctx.fillRect(px + 20, py + 9, 3, 4);
    ctx.fillStyle = Util.shadeColor(color, -0.6);
    ctx.fillRect(px + TILE / 2 - 5, py + 21, 10, 3);
    ctx.fillStyle = Util.shadeColor(color, 0.5);
    ctx.beginPath(); ctx.arc(px + TILE / 2, py + 27, 3.2, 0, Math.PI * 2); ctx.fill();
  },

  spiral(ctx, px, py, color){
    const cx = px + TILE / 2, cy = py + TILE / 2;
    ctx.fillStyle = Util.shadeColor(color, -0.7);
    ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = Util.shadeColor(color, 0.85);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      const a = t * Math.PI * 4;
      const r = 1 + t * 10.5;
      const sx = cx + Math.cos(a) * r, sy = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
    ctx.fillStyle = Util.shadeColor(color, 0.95);
    ctx.beginPath(); ctx.arc(cx, cy, 1.6, 0, Math.PI * 2); ctx.fill();
  },

  mirrorsplit(ctx, px, py, color){
    const cx = px + TILE / 2;
    const g = ctx.createLinearGradient(px + 5, py, px + TILE - 5, py);
    g.addColorStop(0, Util.shadeColor(color, 0.55));
    g.addColorStop(0.48, Util.shadeColor(color, 0.05));
    g.addColorStop(0.52, Util.shadeColor(color, 0.05));
    g.addColorStop(1, Util.shadeColor(color, 0.55));
    ctx.fillStyle = g;
    ctx.fillRect(px + 6, py + 6, TILE - 12, TILE - 12);
    ctx.fillStyle = Util.shadeColor(color, -0.8);
    ctx.fillRect(cx - 0.75, py + 4, 1.5, TILE - 8);
    ctx.strokeStyle = Util.shadeColor(color, 0.9);
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(px + 9, py + 22); ctx.lineTo(px + 13, py + 9);
    ctx.moveTo(px + TILE - 9, py + 22); ctx.lineTo(px + TILE - 13, py + 9);
    ctx.stroke();
    ctx.globalAlpha = 1;
  },

  yinyang(ctx, px, py, color){
    const cx = px + TILE / 2, cy = py + TILE / 2, r = 9;
    ctx.fillStyle = Util.shadeColor(color, 0.65);
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = Util.shadeColor(color, -0.75);
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2);
    ctx.arc(cx, cy + r / 2, r / 2, Math.PI / 2, -Math.PI / 2, true);
    ctx.arc(cx, cy - r / 2, r / 2, Math.PI / 2, -Math.PI / 2);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = Util.shadeColor(color, 0.65);
    ctx.beginPath(); ctx.arc(cx, cy + r / 2, r / 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = Util.shadeColor(color, -0.75);
    ctx.beginPath(); ctx.arc(cx, cy - r / 2, r / 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = Util.shadeColor(color, 0.4);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, r + 0.5, 0, Math.PI * 2); ctx.stroke();
  },

  warning(ctx, px, py, color){
    ctx.save();
    ctx.beginPath();
    ctx.rect(px + 5, py + 5, TILE - 10, TILE - 10);
    ctx.clip();
    ctx.fillStyle = Util.shadeColor(color, -0.7);
    ctx.fillRect(px + 5, py + 5, TILE - 10, TILE - 10);
    ctx.fillStyle = Util.shadeColor(color, 0.55);
    for (let i = -2; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(px + 5 + i * 9, py + 5);
      ctx.lineTo(px + 5 + i * 9 + 4.5, py + 5);
      ctx.lineTo(px + 5 + i * 9 + 4.5 + 22, py + TILE - 5);
      ctx.lineTo(px + 5 + i * 9 + 22, py + TILE - 5);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = Util.shadeColor(color, -0.45);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(px + 5, py + 5, TILE - 10, TILE - 10);
  },
};

const ROOM_TORCH_TYPES = new Set(['boss', 'miniboss', 'treasure', 'shop', 'vault', 'crystal', 'sombra', 'curse', 'supersecret', 'star']);

function roomTorchTiles(node){
  if (!ROOM_TORCH_TYPES.has(node.type)) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let y = 0; y < node.tileH; y++) {
    for (let x = 0; x < node.tileW; x++) {
      const t = node.tiles[y][x];
      if (t === T_FLOOR || t === T_DOOR || t === T_SECRET_OPEN) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (minX > maxX) return null;
  const torches = new Set();
  const tryTorch = (tx, ty) => { if (ty >= 0 && ty < node.tileH && tx >= 0 && tx < node.tileW && node.tiles[ty][tx] === T_WALL) torches.add(tx + ',' + ty); };
  tryTorch(minX, minY - 1);
  tryTorch(maxX, minY - 1);
  return torches;
}

function drawWallTorch(ctx, px, py, pal, x, y){
  const cx = px + TILE / 2, cy = py + TILE - 6;
  const lean = (tileRand(x, y, 231) - 0.5) * 5;
  ctx.fillStyle = Util.shadeColor(pal.wall, -0.42);
  ctx.fillRect(cx - 1.5, cy - 2, 3, 9);
  ctx.fillStyle = Util.shadeColor(pal.wall, -0.58);
  ctx.beginPath(); ctx.ellipse(cx, cy - 3, 4, 2.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.shadowColor = pal.accent; ctx.shadowBlur = 9;
  ctx.fillStyle = pal.accent;
  ctx.beginPath();
  ctx.moveTo(cx + lean, cy - 15);
  ctx.quadraticCurveTo(cx + 4.5, cy - 8, cx + 2.4, cy - 4);
  ctx.quadraticCurveTo(cx, cy - 6.5, cx - 2.4, cy - 4);
  ctx.quadraticCurveTo(cx - 4.5, cy - 8, cx + lean, cy - 15);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = Util.shadeColor(pal.accent, 0.35);
  ctx.beginPath(); ctx.ellipse(cx + lean * 0.4, cy - 8, 1.6, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function paintDoorTile(ctx, px, py, color, style){
  const s = style || 'panel';
  if (s === 'portal') { paintPortalTile(ctx, px, py, color); return; }
  paintDoorSlab(ctx, px, py, color);
  const fn = DOOR_OVERLAYS[s];
  if (fn) fn(ctx, px, py, color);
}

function doorStyleFor(type){
  return DOOR_STYLES[type] || DOOR_STYLES.normal;
}

function paintPortalTile(ctx, px, py, color){
  const cx = px + TILE / 2, cy = py + TILE / 2, r = TILE / 2;
  const g = ctx.createRadialGradient(cx - r * 0.22, cy - r * 0.22, 0, cx, cy, r);
  g.addColorStop(0, Util.shadeColor(color, 0.55));
  g.addColorStop(0.4, Util.shadeColor(color, 0.12));
  g.addColorStop(0.75, color);
  g.addColorStop(1, Util.shadeColor(color, -0.6));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cx, cy, r - 0.5, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 1.3;
  ctx.strokeStyle = Util.shadeColor(color, 0.62);
  ctx.globalAlpha = 0.85;
  ctx.beginPath(); ctx.arc(cx, cy, r - 2.5, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1;
  ctx.strokeStyle = Util.shadeColor(color, 0.2);
  ctx.globalAlpha = 0.5;
  ctx.beginPath(); ctx.arc(cx, cy, r - 6, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = Util.shadeColor(color, -0.4);
  ctx.beginPath(); ctx.arc(cx, cy, r - 0.75, 0, Math.PI * 2); ctx.stroke();
}

function paintStarfieldTile(ctx, px, py, tx, ty, pal, depth){

  const skyWash = ctx.createLinearGradient(px, py, px, py + TILE);
  skyWash.addColorStop(0, Util.shadeColor(pal.voidC, depth + 0.03));
  skyWash.addColorStop(1, Util.shadeColor(pal.voidC, depth - 0.03));
  ctx.fillStyle = skyWash;
  ctx.fillRect(px, py, TILE, TILE);
  const n = tileRand(tx, ty, 101) < 0.42 ? 0 : tileRand(tx, ty, 102) < 0.72 ? 1 : tileRand(tx, ty, 103) < 0.92 ? 2 : 3;
  for (let i = 0; i < n; i++) {
    const sx = px + 2 + tileRand(tx, ty, 110 + i) * (TILE - 4);
    const sy = py + 2 + tileRand(tx, ty, 120 + i) * (TILE - 4);
    const mag = tileRand(tx, ty, 130 + i);
    const rr = 0.5 + mag * mag * 1.9;

    ctx.fillStyle = mag > 0.9 ? pal.accent : 'rgba(226,232,255,' + (0.25 + mag * 0.6).toFixed(2) + ')';
    ctx.beginPath(); ctx.arc(sx, sy, rr, 0, Math.PI * 2); ctx.fill();
    if (mag > 0.93) {
      ctx.fillStyle = 'rgba(226,232,255,0.10)';
      ctx.beginPath(); ctx.arc(sx, sy, rr * 2.6, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function shopPickupIconObj(kind){
  if (kind === 'pill') return { kind: 'pill', pillColor: PILL_COLORS[0].id, x: 0, y: 0 };
  if (kind === 'star') return { kind: 'star', starId: STAR_LIST[0].id, x: 0, y: 0 };
  return { kind, x: 0, y: 0 };
}

function tileRand(x, y, salt){
  let h = (x * 374761393 + y * 668265263 + salt * 2246822519) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 4294967295;
}

Object.assign(Game.prototype, {

  currentPalette(){

    if (this.waveDefenseMode) return STAGES[(this.wdPaletteIndex || 0) % STAGES.length].palette;

    return floorPaletteFor(this.dungeon.floorNum, this.floorPath, this.floorBranch);
  },

  render(){
    if (this.state !== 'playing') return;
    const ctx = this.ctx;

    if (!this._ctxTuned) {
      ctx.imageSmoothingEnabled = true;
      if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
      this._ctxTuned = true;
    }

    const fxDt = this._fxLastNow ? Math.min(0.05, (this.now - this._fxLastNow) / 1000) : 0;
    this._fxLastNow = this.now;
    if (this._fxRoom !== this.currentRoom) { FX.reset(); Ambient.reset(); this._fxRoom = this.currentRoom; }

    if (this.freezeTimer > 0 || this.paused) { FX.shakeX = 0; FX.shakeY = 0; }
    else { FX.update(fxDt); this.updateAmbientFX(fxDt); }

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, CAMERA_W, CAMERA_H);
    ctx.save();

    ctx.translate(-Math.round(this.camX) + Math.round(FX.shakeX), -Math.round(this.camY) + Math.round(FX.shakeY));
    this.drawTiles();
    this.drawRoomDecor(this.currentRoom);
    this.drawLockedDoorPulse();
    this.drawGroundObstacles();
    this.drawCreep();
    this.drawDustDevils();
    this.drawItemPedestal();
    this.drawShop();
    this.drawDonationMachineFixture();
    this.drawRerollAltarFixture();
    this.drawUpgradeStationFixture();
    this.drawWdControlButton();
    this.drawKarmaFixtures();
    this.drawArcadeFixtures();
    this.drawPlayerTurrets();
    this.drawStairs();
    this.drawGreenFireZone();
    this.drawChangelingMinions();
    this.drawWorldSorted();
    this.drawProjectiles();
    this.drawBombsExplosions();
    this.drawSwingFX();
    this.drawLaserFX();
    FX.draw(ctx);
    Ambient.draw(ctx);
    this.drawFloatTexts();
    ctx.restore();

    this.drawVignette();
    this.drawPlayerLight();
    this.drawFireLight();
    if (this.currentRoom.type === 'boss' && !this.currentRoom.cleared) this.drawBossHealthBar();
    if (this.roomFadeTimer > 0) {
      const a = Util.clamp(this.roomFadeTimer / ROOM_FADE_TIME, 0, 1);
      const g = this.fadeGradient(this.roomFadeDir);
      if (g) {
        ctx.save();
        ctx.globalAlpha = a;
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, CAMERA_W, CAMERA_H);
        ctx.restore();
      } else {
        ctx.fillStyle = Theme.rgba(Theme.rgb.fadeVeil, a * 0.65);
        ctx.fillRect(0, 0, CAMERA_W, CAMERA_H);
      }
    }
  },

  drawPlayerLight(){
    const p = this.player;
    if (!p) return;
    const ctx = this.ctx;
    const sx = p.x - Math.round(this.camX) + Math.round(FX.shakeX);
    const sy = p.y - Math.round(this.camY) + Math.round(FX.shakeY);
    if (sx < -LIGHT_R || sy < -LIGHT_R || sx > CAMERA_W + LIGHT_R || sy > CAMERA_H + LIGHT_R) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(playerLightSprite(), sx - LIGHT_R, sy - LIGHT_R);
    ctx.restore();
  },

  drawFireLight(){
    const node = this.currentRoom;
    if (!node || !node.obstacles) return;
    const ctx = this.ctx;
    const ox = Math.round(this.camX) - Math.round(FX.shakeX);
    const oy = Math.round(this.camY) - Math.round(FX.shakeY);
    let opened = false;
    for (const ob of node.obstacles) {
      if (ob.destroyed || !ob.isHazard || ob.kind.indexOf('fire') === -1) continue;
      const col = ob.def && ob.def.color;
      if (!col) continue;
      const sx = ob.x - ox, sy = ob.y - oy;
      if (sx < -FIRE_LIGHT_R || sy < -FIRE_LIGHT_R || sx > CAMERA_W + FIRE_LIGHT_R || sy > CAMERA_H + FIRE_LIGHT_R) continue;
      if (!opened) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; opened = true; }
      ctx.drawImage(fireLightSprite(col), sx - FIRE_LIGHT_R, sy - FIRE_LIGHT_R);
    }
    if (opened) ctx.restore();
  },

  drawLockedDoorPulse(){
    const node = this.currentRoom;
    if (node.doorsOpen) return;
    const cells = node._lockedDoorCells;
    if (!cells || !cells.length) return;
    const ctx = this.ctx;

    const a = 0.05 + 0.05 * (0.5 + 0.5 * Math.sin(this.now / 560));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = prefersReducedMotion ? 0.05 : a;
    for (const c of cells) {
      ctx.fillStyle = c.color;
      ctx.fillRect(c.x * TILE + 3, c.y * TILE + 3, TILE - 6, TILE - 6);
    }
    ctx.restore();
  },

  fadeGradient(dir){
    if (!dir) return null;
    if (!this._fadeGrads) this._fadeGrads = {};
    let g = this._fadeGrads[dir];
    if (!g) {

      const x0 = dir === 'W' ? 0 : dir === 'E' ? CAMERA_W : CAMERA_W / 2;
      const y0 = dir === 'N' ? 0 : dir === 'S' ? CAMERA_H : CAMERA_H / 2;
      const x1 = dir === 'W' ? CAMERA_W : dir === 'E' ? 0 : CAMERA_W / 2;
      const y1 = dir === 'N' ? CAMERA_H : dir === 'S' ? 0 : CAMERA_H / 2;
      g = this.ctx.createLinearGradient(x0, y0, x1, y1);

      g.addColorStop(0, Theme.rgba(Theme.rgb.fadeVeil, 0.8));
      g.addColorStop(0.55, Theme.rgba(Theme.rgb.fadeVeil, 0.62));
      g.addColorStop(1, Theme.rgba(Theme.rgb.fadeVeil, 0.45));
      this._fadeGrads[dir] = g;
    }
    return g;
  },

  drawVignette(){
    if (!Theme.vignette.enabled) return;
    const ctx = this.ctx;
    let g = this._vignetteGrad;
    if (!g) {
      const cx = CAMERA_W / 2, cy = CAMERA_H / 2;
      g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(cx, cy));
      for (const [at, col] of Theme.vignette.stops) g.addColorStop(at, col);
      this._vignetteGrad = g;
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CAMERA_W, CAMERA_H);
  },

  updateAmbientFX(dt){
    const p = this.player, node = this.currentRoom;

    this._fxDustT = (this._fxDustT || 0) - dt;
    if (p.moving && this._fxDustT <= 0) {
      this._fxDustT = 0.085;
      FX.dust(p.x + Util.rand(-4, 4), p.y + p.radius * 0.6);
    }

    this._fxSparkT = (this._fxSparkT || 0) - dt;
    if (this._fxSparkT <= 0) {
      this._fxSparkT = 0.2;
      const list = node.pickups;
      if (list.length) {
        const pk = list[(Math.random() * list.length) | 0];
        if (SPARKLE_PICKUPS[pk.kind]) FX.sparkle(pk.x + Util.rand(-7, 7), pk.y + Util.rand(-8, 4));
      }
    }

    for (const e of node.enemies) {
      if (e.isDead && !e._fxDeath) {
        e._fxDeath = true;
        FX.puff(e.x, e.y, e.dark || e.color, e.isBoss ? 18 : 9);
        FX.shake(e.isBoss ? 5 : 1.4, e.isBoss ? 0.4 : 0.12);
      }
    }

    for (const ex of this.explosions) {
      if (!ex._fxSeen) {
        ex._fxSeen = true;
        FX.shake(6, 0.3);
        FX.burst(ex.x, ex.y, Theme.particle.hitSpark, 12, 170);
      }
    }

    const pal = this.currentPalette();
    Ambient.update(dt, this.camX, this.camY, roomFlavor(node, pal), pal);
  },

  rebuildPlanetariumTiles(node, pal, ctx){

    const nearFloor = (tx, ty) => {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const y = ty + dy, x = tx + dx;
        if (y < 0 || y >= node.tileH || x < 0 || x >= node.tileW) continue;
        const t = node.tiles[y][x];
        if (t === T_FLOOR || t === T_SECRET_OPEN) return true;
      }
      return false;
    };
    for (let y = 0; y < node.tileH; y++) {
      for (let x = 0; x < node.tileW; x++) {
        const t = node.tiles[y][x];
        const px = x * TILE, py = y * TILE;

        if (t === T_VOID || t === T_WALL || t === T_SECRET) {
          paintStarfieldTile(ctx, px, py, x, y, pal, nearFloor(x, y) ? 0.10 : 0);
          continue;
        }
        if (t === T_DOOR) {
          paintStarfieldTile(ctx, px, py, x, y, pal, 0.10);
          paintPortalTile(ctx, px, py, node.doorsOpen ? Theme.door.planetarium.open : Theme.door.planetarium.locked);
          continue;
        }

        const baseFloor = ((x + y) % 2 === 0) ? pal.floorA : pal.floorB;
        ctx.fillStyle = Util.shadeColor(baseFloor, 0.06 + (tileRand(x, y, 41) - 0.5) * 0.10);
        ctx.fillRect(px, py, TILE, TILE);

        const openAt = (tx, ty) => {
          if (ty < 0 || ty >= node.tileH || tx < 0 || tx >= node.tileW) return true;
          const tt = node.tiles[ty][tx];
          return tt === T_WALL || tt === T_SECRET || tt === T_VOID;
        };
        ctx.fillStyle = 'rgba(180,200,255,0.20)';
        const rw = Theme.shadow.aoWidth;
        if (openAt(x, y - 1)) ctx.fillRect(px, py, TILE, rw);
        if (openAt(x, y + 1)) ctx.fillRect(px, py + TILE - rw, TILE, rw);
        if (openAt(x - 1, y)) ctx.fillRect(px, py, rw, TILE);
        if (openAt(x + 1, y)) ctx.fillRect(px + TILE - rw, py, rw, TILE);

        if (tileRand(x, y, 7) < 0.14) {
          ctx.fillStyle = pal.accent + '22';
          const dx = 5 + tileRand(x, y, 50) * 22, dy = 5 + tileRand(x, y, 60) * 22;
          ctx.beginPath(); ctx.arc(px + dx, py + dy, 1 + tileRand(x, y, 70) * 1.5, 0, Math.PI * 2); ctx.fill();
        }
      }
    }

    for (const slot of node.doorSlots) {
      if (slot.type !== 'normal' || !slot.cells) continue;
      const neighbor = slot.pairedSlot ? slot.pairedSlot.room : null;
      const destType = neighbor ? neighbor.type : 'normal';
      const table = DOOR_COLORS[destType] || DOOR_COLORS.normal;
      const col = node.doorsOpen ? table.open : table.locked;
      const style = doorStyleFor(destType);
      for (const c of slot.cells) {
        paintStarfieldTile(ctx, c.x * TILE, c.y * TILE, c.x, c.y, pal, 0.10);
        paintDoorTile(ctx, c.x * TILE, c.y * TILE, col, style);
      }
    }
  },

  rebuildTileLayer(node, pal){
    const w = node.tileW * TILE, h = node.tileH * TILE;
    let cv = node._tileCanvas;
    if (!cv) { cv = document.createElement('canvas'); node._tileCanvas = cv; }
    const pw = Math.ceil(w * this.dpr), ph = Math.ceil(h * this.dpr);
    if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; }
    const ctx = cv.getContext('2d');
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    node._lockedDoorCells = [];
    const lockedCells = new Map();

    if (node.type === 'planetarium') {
      this.rebuildPlanetariumTiles(node, pal, ctx);
      node._tileLayerDoorsOpen = node.doorsOpen;
      node._tileLayerPalette = pal;
      node.tileLayerDirty = false;
      return;
    }

    const isSolid = (tx, ty) => {
      if (ty < 0 || ty >= node.tileH || tx < 0 || tx >= node.tileW) return true;
      const tt = node.tiles[ty][tx];
      return tt === T_WALL || tt === T_SECRET || tt === T_VOID;
    };

    const flavor = roomFlavor(node, pal);
    const torchTiles = roomTorchTiles(node);

    const ornateFloor = node.type === 'boss' || node.type === 'treasure' || flavor === 'crystal';
    for (let y = 0; y < node.tileH; y++) {
      for (let x = 0; x < node.tileW; x++) {
        const t = node.tiles[y][x];
        const px = x * TILE, py = y * TILE;
        if (t === T_VOID) {

          if (this.floorPath === 'D') { paintStarfieldTile(ctx, px, py, x, y, pal, 0); continue; }
          ctx.fillStyle = pal.voidC; ctx.fillRect(px, py, TILE, TILE); continue;
        }
        if (t === T_WALL || t === T_SECRET) {

          const shade = (tileRand(x, y, 11) - 0.5) * 0.22;
          const blockBase = Util.shadeColor(pal.wall, shade);
          const wallWash = ctx.createLinearGradient(px, py, px, py + TILE);
          wallWash.addColorStop(0, Util.shadeColor(blockBase, 0.09));
          wallWash.addColorStop(1, Util.shadeColor(blockBase, -0.12));
          ctx.fillStyle = wallWash;
          ctx.fillRect(px, py, TILE, TILE);

          const openN = !isSolid(x, y - 1), openE = !isSolid(x + 1, y);
          const openS = !isSolid(x, y + 1), openW = !isSolid(x - 1, y);
          const bevel = 2;
          if (openN) { ctx.fillStyle = Util.shadeColor(blockBase, 0.26); ctx.fillRect(px, py, TILE, bevel); }
          if (openW) { ctx.fillStyle = Util.shadeColor(blockBase, 0.22); ctx.fillRect(px, py, bevel, TILE); }
          if (openS) { ctx.fillStyle = Util.shadeColor(blockBase, -0.28); ctx.fillRect(px, py + TILE - bevel, TILE, bevel); }
          if (openE) { ctx.fillStyle = Util.shadeColor(blockBase, -0.24); ctx.fillRect(px + TILE - bevel, py, bevel, TILE); }

          if (tileRand(x, y, 201) > 0.4) {
            const courseY = py + TILE * (0.3 + tileRand(x, y, 202) * 0.12);
            ctx.strokeStyle = Util.shadeColor(blockBase, -0.16);
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(px + 2, courseY); ctx.lineTo(px + TILE - 2, courseY); ctx.stroke();
          }

          if (flavor === 'ice') {
            if (openN) {
              ctx.strokeStyle = Theme.shadow.rim; ctx.lineWidth = 2;
              ctx.beginPath(); ctx.moveTo(px + 2, py + 1); ctx.lineTo(px + TILE - 2, py + 1); ctx.stroke();
            }
            if (tileRand(x, y, 61) > 0.6) {
              const fromLeft = tileRand(x, y, 62) > 0.5;
              const fcx = fromLeft ? px + 3 : px + TILE - 3, fcy = py + TILE - 3;
              const reach = 8 + tileRand(x, y, 63) * 7, rise = 8 + tileRand(x, y, 64) * 6;
              ctx.fillStyle = Theme.shadow.sheen;
              ctx.globalAlpha = 0.32;
              ctx.beginPath();
              ctx.moveTo(fcx, fcy);
              ctx.lineTo(fcx + (fromLeft ? reach : -reach), fcy);
              ctx.lineTo(fcx, fcy - rise);
              ctx.closePath(); ctx.fill();
              ctx.globalAlpha = 1;
            }
          }

          if (flavor === 'fire' && tileRand(x, y, 203) > 0.72) {
            const edge = openN ? 0 : openS ? 1 : openE ? 2 : openW ? 3 : -1;
            if (edge >= 0) {
              const t2 = 6 + tileRand(x, y, 204) * 20;
              const ex = edge === 0 || edge === 1 ? px + t2 : (edge === 2 ? px + TILE - 3 : px + 3);
              const ey = edge === 2 || edge === 3 ? py + t2 : (edge === 0 ? py + 3 : py + TILE - 3);
              ctx.fillStyle = pal.accent;
              ctx.globalAlpha = 0.6;
              ctx.beginPath(); ctx.arc(ex, ey, 1.5, 0, Math.PI * 2); ctx.fill();
              ctx.globalAlpha = 1;
            }
          }

          ctx.lineWidth = 1;
          ctx.strokeStyle = pal.grout;
          ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
          ctx.strokeStyle = Util.shadeColor(pal.grout, 0.3);
          ctx.globalAlpha = 0.5;
          ctx.strokeRect(px + 1.5, py + 1.5, TILE - 3, TILE - 3);
          ctx.globalAlpha = 1;

          const wear = tileRand(x, y, 29);
          if (wear < 0.1) {
            ctx.strokeStyle = Util.shadeColor(pal.wall, -0.45); ctx.lineWidth = 1;
            const cx1 = px + 6 + tileRand(x, y, 3) * 20, cy1 = py + 4 + tileRand(x, y, 4) * 6;
            ctx.beginPath();
            ctx.moveTo(cx1, cy1);
            ctx.lineTo(cx1 + 4 - tileRand(x, y, 5) * 8, cy1 + 10 + tileRand(x, y, 6) * 8);
            ctx.lineTo(cx1 + 2 - tileRand(x, y, 7) * 6, cy1 + 18 + tileRand(x, y, 8) * 6);
            ctx.stroke();
          } else if (wear > 0.88) {
            ctx.fillStyle = pal.accent + '20';
            for (let i = 0; i < 3; i++) {
              const sx = px + 5 + tileRand(x, y, 210 + i) * 22, sy = py + 5 + tileRand(x, y, 215 + i) * 22;
              ctx.beginPath(); ctx.arc(sx, sy, 0.7 + tileRand(x, y, 220 + i) * 1.3, 0, Math.PI * 2); ctx.fill();
            }
          }

          if (torchTiles && torchTiles.has(x + ',' + y)) drawWallTorch(ctx, px, py, pal, x, y);
          continue;
        }
        if (t === T_DOOR) {
          paintDoorTile(ctx, px, py, node.doorsOpen ? pal.doorOpen : pal.doorLocked);
          if (!node.doorsOpen) lockedCells.set(y * node.tileW + x, { x, y, color: pal.doorLocked });
          continue;
        }
        if (t === T_SECRET_OPEN) { ctx.fillStyle = Theme.world.secretOpen; ctx.fillRect(px, py, TILE, TILE); continue; }

        const baseFloor = ((x + y) % 2 === 0) ? pal.floorA : pal.floorB;
        ctx.fillStyle = Util.shadeColor(baseFloor, (tileRand(x, y, 41) - 0.5) * 0.14);
        ctx.fillRect(px, py, TILE, TILE);

        ctx.strokeStyle = Util.shadeColor(baseFloor, 0.12);
        ctx.globalAlpha = 0.5;
        ctx.beginPath(); ctx.moveTo(px + 1, py + TILE - 1); ctx.lineTo(px + 1, py + 1); ctx.lineTo(px + TILE - 1, py + 1); ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = pal.grout;
        ctx.globalAlpha = 0.55;
        ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
        ctx.globalAlpha = 1;

        if (ornateFloor && tileRand(x, y, 53) > 0.93) {
          ctx.fillStyle = Util.shadeColor(baseFloor, 0.1);
          const cx = px + TILE / 2, cy = py + TILE / 2, r = TILE * 0.2;
          ctx.beginPath();
          ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy); ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r, cy);
          ctx.closePath(); ctx.fill();
          ctx.strokeStyle = Util.shadeColor(baseFloor, 0.16);
          ctx.lineWidth = 1;
          const s = r * 1.6;
          ctx.beginPath();
          ctx.moveTo(cx, cy - s); ctx.lineTo(cx, cy - r * 1.15);
          ctx.moveTo(cx, cy + s); ctx.lineTo(cx, cy + r * 1.15);
          ctx.moveTo(cx - s, cy); ctx.lineTo(cx - r * 1.15, cy);
          ctx.moveTo(cx + s, cy); ctx.lineTo(cx + r * 1.15, cy);
          ctx.stroke();

          if (flavor === 'crystal') {
            ctx.fillStyle = Theme.shadow.glint;
            ctx.beginPath(); ctx.arc(cx - r * 0.28, cy - r * 0.36, 1.1, 0, Math.PI * 2); ctx.fill();
          }
        }

        const aoW = Theme.shadow.aoWidth;
        ctx.fillStyle = Theme.shadow.ao;
        if (isSolid(x, y - 1)) ctx.fillRect(px, py, TILE, aoW);
        if (isSolid(x, y + 1)) ctx.fillRect(px, py + TILE - aoW, TILE, aoW);
        if (isSolid(x - 1, y)) ctx.fillRect(px, py, aoW, TILE);
        if (isSolid(x + 1, y)) ctx.fillRect(px + TILE - aoW, py, aoW, TILE);

        if (flavor === 'fire') {
          ctx.fillStyle = Theme.shadow.groundHard;
          if (isSolid(x, y - 1)) ctx.fillRect(px, py, TILE, 2);
          if (isSolid(x, y + 1)) ctx.fillRect(px, py + TILE - 2, TILE, 2);
          if (isSolid(x - 1, y)) ctx.fillRect(px, py, 2, TILE);
          if (isSolid(x + 1, y)) ctx.fillRect(px + TILE - 2, py, 2, TILE);
        }

        const sv = tileRand(x, y, 7);
        if (sv < 0.16) {
          ctx.strokeStyle = pal.accent + '22';
          ctx.lineWidth = 1;
          const n = sv < 0.05 ? 2 : 1;
          for (let i = 0; i < n; i++) {
            const dx = 5 + tileRand(x, y, 50 + i) * 22, dy = 5 + tileRand(x, y, 60 + i) * 22;
            const len = 1.5 + tileRand(x, y, 70 + i) * 2.2;
            const ang = tileRand(x, y, 80 + i) * Math.PI;
            ctx.beginPath();
            ctx.moveTo(px + dx - Math.cos(ang) * len, py + dy - Math.sin(ang) * len);
            ctx.lineTo(px + dx + Math.cos(ang) * len, py + dy + Math.sin(ang) * len);
            ctx.stroke();
          }
        }
        if (tileRand(x, y, 91) > 0.965) {
          ctx.strokeStyle = Util.shadeColor(baseFloor, -0.35); ctx.lineWidth = 1;
          const sx = px + 6 + tileRand(x, y, 92) * 8, sy = py + 6 + tileRand(x, y, 93) * 8;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + 8 + tileRand(x, y, 94) * 10, sy + 10 + tileRand(x, y, 95) * 8);
          ctx.stroke();
        }
        paintFlavorFloorMark(ctx, px, py, x, y, pal, baseFloor, flavor);
      }
    }

    for (const slot of node.doorSlots) {
      if (!slot.cells) continue;
      const isSecretSlot = slot.type === 'secret' || slot.type === 'supersecret';
      if (slot.type !== 'normal' && !isSecretSlot) continue;
      if (isSecretSlot && !slot.opened) continue;
      let destType;
      if (isSecretSlot) {
        destType = slot.type;
      } else {
        const neighbor = slot.pairedSlot ? slot.pairedSlot.room : null;
        destType = neighbor ? neighbor.type : 'normal';
      }
      const table = DOOR_COLORS[destType] || DOOR_COLORS.normal;
      const col = isSecretSlot ? table.open : (node.doorsOpen ? table.open : table.locked);
      const style = doorStyleFor(destType);
      for (const c of slot.cells) {
        paintDoorTile(ctx, c.x * TILE, c.y * TILE, col, style);
        if (!isSecretSlot && !node.doorsOpen) lockedCells.set(c.y * node.tileW + c.x, { x: c.x, y: c.y, color: col });
      }
    }
    node._lockedDoorCells = Array.from(lockedCells.values());

    node._tileLayerDoorsOpen = node.doorsOpen;
    node._tileLayerPalette = pal;
    node.tileLayerDirty = false;
  },

  drawTiles(){
    const node = this.currentRoom;
    const pal = this.currentPalette();
    const stale = !node._tileCanvas || node.tileLayerDirty ||
      node._tileLayerDoorsOpen !== node.doorsOpen || node._tileLayerPalette !== pal;

    const justUnlocked = node._tileLayerDoorsOpen === false && node.doorsOpen === true;
    if (stale) this.rebuildTileLayer(node, pal);
    if (justUnlocked) {
      for (const slot of node.doorSlots) {
        if (slot.type !== 'normal' || !slot.cells) continue;
        const neighbor = slot.pairedSlot ? slot.pairedSlot.room : null;
        const destType = neighbor ? neighbor.type : 'normal';
        const table = DOOR_COLORS[destType] || DOOR_COLORS.normal;
        for (const c of slot.cells) {
          const cx = c.x * TILE + TILE / 2, cy = c.y * TILE + TILE / 2;
          FX.sparks(cx, cy, table.open, 7);
          FX.sparkle(cx, cy, table.open);
        }
      }
    }
    this.ctx.drawImage(node._tileCanvas, 0, 0, node.tileW * TILE, node.tileH * TILE);
  },

  drawRoomDecor(node){
    const props = node && node.decorProps;
    if (!props || !props.length) return;
    const ctx = this.ctx;
    const pal = this.currentPalette();
    const x0 = this.camX - 48, y0 = this.camY - 48;
    const x1 = this.camX + CAMERA_W + 48, y1 = this.camY + CAMERA_H + 48;
    ctx.save();
    for (const p of props) {
      if (p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) continue;
      drawDecorProp(ctx, p, pal);
    }
    ctx.restore();
  },

  drawGroundObstacles(){
    const ctx = this.ctx;
    for (const ob of this.currentRoom.obstacles) {
      if (ob.destroyed || !GROUND_OBSTACLES[ob.kind]) continue;
      Util.drawObstacle(ctx, ob, this.now);
    }
  },

  drawCreep(){
    const list = this.creep;
    if (!list || !list.length) return;

    const CREEP_PALETTE = { tar: { base:'#1a1410', hi:'#2e2418' }, venom: { base:'#2e5e1a', hi:'#6fae2a' }, quicksand: { base:'#c2a05a', hi:'#e8cf8e' } };
    const ctx = this.ctx;
    const x0 = this.camX - 64, y0 = this.camY - 64;
    const x1 = this.camX + CAMERA_W + 64, y1 = this.camY + CAMERA_H + 64;
    ctx.save();
    for (const c of list) {
      if (c.x < x0 || c.x > x1 || c.y < y0 || c.y > y1) continue;
      const pal = CREEP_PALETTE[c.kind] || CREEP_PALETTE.tar;

      ctx.globalAlpha = 0.82 * (c.life < 1 ? c.life : 1);

      for (let i = 0; i < 3; i++) {
        const a = c.seed + i * 2.4;
        const ox = Math.cos(a) * c.radius * 0.34;
        const oy = Math.sin(a * 1.7) * c.radius * 0.28;
        const rr = c.radius * (0.66 + 0.12 * ((Math.sin(a * 3.1) + 1) / 2));
        ctx.fillStyle = pal.base;
        ctx.beginPath();
        ctx.ellipse(c.x + ox, c.y + oy, rr, rr * 0.7, a, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha *= 0.5;
      ctx.fillStyle = pal.hi;
      ctx.beginPath();
      ctx.ellipse(c.x + Math.cos(c.seed) * c.radius * 0.2, c.y - c.radius * 0.18,
        c.radius * 0.34, c.radius * 0.2, c.seed, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },

  drawDustDevils(){
    const list = this.dustDevils;
    if (!list || !list.length) return;

    const ctx = this.ctx;
    const x0 = this.camX - 100, y0 = this.camY - 100;
    const x1 = this.camX + CAMERA_W + 100, y1 = this.camY + CAMERA_H + 100;
    ctx.save();
    for (const d of list) {
      if (d.x < x0 || d.x > x1 || d.y < y0 || d.y > y1) continue;
      const fade = d.life < 1 ? d.life : 1;
      for (let i = 0; i < 4; i++) {
        const a = d.seed + this.now * (2.6 + i * 0.5) + i * 1.7;
        const rr = d.radius * (0.3 + i * 0.22);
        ctx.globalAlpha = 0.5 * fade * (1 - i * 0.18);
        ctx.strokeStyle = '#d8c48a';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(d.x + Math.cos(a) * rr * 0.15, d.y + Math.sin(a) * rr * 0.15, rr, a, a + Math.PI * 1.5);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.6 * fade;
      ctx.fillStyle = '#e8dcb0';
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.radius * 0.16, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },

  drawItemPedestal(){
    const node = this.currentRoom;
    if (!node.itemPedestals) return;
    const ctx = this.ctx;
    for (const ped of node.itemPedestals) {
      const px = ped.x * TILE, py = ped.y * TILE;

      if (ped.isTrinket) {
        if (!ped.taken) {
          ctx.fillStyle = Theme.shadow.pedestal;
          ctx.beginPath(); ctx.ellipse(px, py + 8, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
          const bob = Math.sin(this.now / 260 + px) * 3;
          Util.drawItemIcon(ctx, px, py - 4 + bob, ped.item, this.now);
        }
        continue;
      }
      ctx.fillStyle = Theme.shadow.pedestal;
      ctx.beginPath(); ctx.ellipse(px, py + 12, 17, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = Theme.world.pedestalBase; Util.drawRoundedRect(ctx, px - 16, py + 6, 32, 10, 2); ctx.fill();
      ctx.fillStyle = Util.bodyShade(ctx, px, py + 3, 14, Theme.world.pedestalTop); Util.drawRoundedRect(ctx, px - 12, py - 2, 24, 10, 2); ctx.fill();
      if (!ped.taken) {
        const bob = Math.sin(this.now / 260 + px) * 3;
        Util.drawItemIcon(ctx, px, py - 16 + bob, ped.item, this.now);

        if (ped.isDeal) {
          const player = this.player;
          let label;
          if (player.def.id === 'kirin') {
            label = player.dealFreebieUsed ? null : 'FREE';
          } else {
            const q = ped.item.quality || 1;
            const containerCost = q <= 2 ? 1 : 2;
            const blueCost = q <= 2 ? 2 : 3;
            const discount = Math.min(1, player.dealDiscount || 0);
            if (!player.def.noRedContainers && (player.redMax - containerCost) >= 1) {
              const effectiveCost = Math.max(0, Math.round(containerCost * (1 - discount)));
              label = effectiveCost > 0 ? ('-' + effectiveCost + ' ❤') : 'FREE';
            } else {
              const effectiveCost = Math.max(0, Math.round(blueCost * (1 - discount)));
              label = effectiveCost > 0 ? ('-' + effectiveCost + ' 💙') : 'FREE';
            }
          }
          if (label) {
            ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
            ctx.lineWidth = 3; ctx.strokeStyle = Theme.shadow.outline;
            ctx.strokeText(label, px, py + 30);
            ctx.fillStyle = Theme.ui.textDim;
            ctx.fillText(label, px, py + 30);
          }
        }
      }
    }
  },

  drawShop(){
    const node = this.currentRoom;
    if (!node.shopSlots) return;
    const ctx = this.ctx;
    for (const slot of node.shopSlots) {
      const px = slot.x * TILE, py = slot.y * TILE;
      ctx.fillStyle = Util.bodyShade(ctx, px, py + 11, 14, Theme.world.pedestalBase); Util.drawRoundedRect(ctx, px - 16, py + 6, 32, 10, 2); ctx.fill();
      if (slot.bought) continue;
      const bob = Math.sin(this.now / 260 + px) * 3;
      ctx.save();
      ctx.translate(px, py - 10 + bob);
      if (slot.kind === 'item' || slot.kind === 'trinket' || slot.kind === 'familiar') {
        const thing = slot.item || slot.trinket || slot.familiar;
        const glow = thing.quality ? Util.qualityGlow(thing.quality) : null;
        if (glow) { ctx.shadowColor = glow.color; ctx.shadowBlur = glow.blur; }
        ctx.fillStyle = Util.bodyShadeLocal(ctx, 0, 0, 12, thing.color);
        ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.font = '13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = Theme.ui.onIcon; ctx.fillText(thing.icon, 0, 1);
      } else {
        ctx.fillStyle = Util.bodyShadeLocal(ctx, 0, 0, 10, Theme.world.shopPickup);
        ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
        Util.drawPickupIcon(ctx, shopPickupIconObj(slot.pickup), 0);
      }
      ctx.restore();
      ctx.font = '11px sans-serif'; ctx.textAlign = 'center';

      ctx.lineWidth = 3; ctx.strokeStyle = Theme.shadow.outline;
      ctx.strokeText(slot.price + 'c', px, py + 30);
      ctx.fillStyle = this.player.coins >= slot.price ? Theme.ui.gold : Theme.ui.goldDim;
      ctx.fillText(slot.price + 'c', px, py + 30);
    }
  },

  drawDonationMachineFixture(){
    const node = this.currentRoom;
    if (!node.donationMachine) return;
    const ctx = this.ctx;
    const px = node.donationMachine.x * TILE, py = node.donationMachine.y * TILE;
    Util.drawDonationMachine(ctx, px, py, donationProgressFrac());

    const unlocks = ensureUnlockShape(loadUnlocks());
    ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = Theme.ui.textDim;
    ctx.fillText(Util.formatNum(unlocks.stats.donationTotal) + ' / ' + Util.formatNum(DONATION_CAP) + 'c', px, py + 28);
  },

  drawKarmaFixtures(){
    const node = this.currentRoom;
    if (!node.karmaMachines || !node.karmaMachines.length) return;
    const ctx = this.ctx;
    const unlocks = ensureUnlockShape(loadUnlocks());
    for (const m of node.karmaMachines) {
      const def = KARMA_MACHINE_DEFS[m.resource];
      if (!def) continue;
      const px = m.x * TILE, py = m.y * TILE;
      Util.drawDonationMachine(ctx, px, py, karmaMachineProgressFrac(m.resource));
      const donated = unlocks.stats[def.stat] || 0;
      const awarded = unlocks.stats[def.awardedStat] || 0;
      ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = def.color;
      ctx.fillText(def.label, px, py + 28);
      ctx.fillStyle = Theme.ui.textDim;
      ctx.fillText(Util.formatNum(donated) + ' · ' + awarded + '/' + def.totalUnlocks, px, py + 39);
    }
  },

  drawRerollAltarFixture(){
    const node = this.currentRoom;
    if (!node.rerollAltar) return;
    const ctx = this.ctx;
    const px = node.rerollAltar.x * TILE, py = node.rerollAltar.y * TILE;
    Util.drawRerollAltar(ctx, px, py, this.now);

    const live = countRerollableShopSlots(node) > 0;
    const cost = rerollAltarCost(node.rerollAltar);
    ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = live && this.player.coins >= cost ? Theme.ui.gold : Theme.ui.textDim;
    ctx.fillText('[G] Reroll ' + cost + 'c', px, py + 24);
  },

  drawUpgradeStationFixture(){
    const node = this.currentRoom;
    if (!node.upgradeStation) return;
    const ctx = this.ctx;
    const px = node.upgradeStation.x * TILE, py = node.upgradeStation.y * TILE;
    const station = node.upgradeStation;
    Util.drawUpgradeStation(ctx, px, py, station.tier, this.now);

    ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
    if (station.tier >= UPGRADE_STATION_MAX_TIER) {
      ctx.fillStyle = Theme.ui.textDim;
      ctx.fillText('Upgrade station maxed', px, py + 24);
    } else {
      ctx.fillStyle = this.player.coins >= UPGRADE_STATION_COST ? Theme.ui.gold : Theme.ui.textDim;
      ctx.fillText('[G] Upgrade ' + UPGRADE_STATION_COST + 'c (tier ' + station.tier + '/' + UPGRADE_STATION_MAX_TIER + ')', px, py + 24);
    }
  },

  drawWdControlButton(){
    const node = this.currentRoom;
    if (this.mode !== 'wavedefense' || !node.wdControlButton) return;
    const ctx = this.ctx;
    const px = node.wdControlButton.x * TILE, py = node.wdControlButton.y * TILE;
    const running = wdControlButtonState(this) === 'running';
    const pulse = 0.5 + 0.5 * Math.sin(this.now * 3);

    ctx.save();
    Util.drawRoundedRect(ctx, px - 13, py - 13, 26, 26, 6);
    ctx.fillStyle = '#2a2f3d';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = running ? '#e05a5a' : '#5ad07a';
    ctx.globalAlpha = 0.55 + 0.45 * pulse;
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.fillStyle = running ? '#e05a5a' : '#5ad07a';
    if (running) {
      ctx.fillRect(px - 6, py - 7, 4, 14);
      ctx.fillRect(px + 2, py - 7, 4, 14);
    } else {
      ctx.beginPath();
      ctx.moveTo(px - 5, py - 8);
      ctx.lineTo(px + 8, py);
      ctx.lineTo(px - 5, py + 8);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = Theme.ui.textDim;
    ctx.fillText(running ? '[H] Pause (-1 heart)' : '[H] Start', px, py + 26);
  },

  drawArcadeFixtures(){
    const node = this.currentRoom;
    const ctx = this.ctx;
    if (node.fillies) {
      for (const f of node.fillies) {
        Util.drawFilly(ctx, f.x * TILE, f.y * TILE, f.kind, this.now);
      }
    }
    if (node.machines) {
      for (const m of node.machines) {
        const px = m.x * TILE, py = m.y * TILE;
        if (m.kind === 'friendship') Util.drawFriendshipMachine(ctx, px, py, m, this.now);
        else if (m.kind === 'tools') Util.drawToolsMachine(ctx, px, py, m, this.now);
        else if (m.kind === 'dark') Util.drawDarkMachine(ctx, px, py);
      }
    }
  },

  drawPlayerTurrets(){
    const node = this.currentRoom;
    if (!node.playerTurrets) return;
    const ctx = this.ctx;
    for (const turret of node.playerTurrets) Util.drawPlayerTurret(ctx, turret, this.now);
  },

  drawChangelingMinions(){
    const minions = this.player && this.player.changelingMinions;
    if (!minions || !minions.length) return;
    const ctx = this.ctx;
    for (const m of minions) Util.drawChangelingMinion(ctx, m, this.now);
  },

  drawStairsPit(ctx, px, py, rx, ry, ringColor){
    const pulse = 0.5 + Math.sin(this.now / 340) * 0.5;
    const grad = ctx.createRadialGradient(px, py, 1, px, py, Math.max(rx, ry));
    grad.addColorStop(0, Theme.world.pitFill);
    grad.addColorStop(0.7, Theme.world.stairsPit);
    grad.addColorStop(1, Util.shadeColor(ringColor, -0.5));
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.shadowColor = ringColor; ctx.shadowBlur = 6 + pulse * 6;
    ctx.strokeStyle = ringColor; ctx.lineWidth = 2 + pulse * 0.6;
    ctx.stroke();
    ctx.restore();
  },

  drawStairs(){
    const node = this.currentRoom;
    const ctx = this.ctx;
    if (node.branchSpots) {
      for (const b of node.branchSpots) {
        const px = b.x * TILE, py = b.y * TILE;
        const ringColor = b.branch === 'B' ? Theme.world.branchB : Theme.world.branchA;
        this.drawStairsPit(ctx, px, py, 24, 18, ringColor);
        ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
        ctx.lineWidth = 3; ctx.strokeStyle = Theme.shadow.outline; ctx.strokeText(b.label, px, py + 34);
        ctx.fillStyle = ringColor; ctx.fillText(b.label, px, py + 34);
      }
      return;
    }
    if (!node.stairsSpot) return;
    const px = node.stairsSpot.x * TILE, py = node.stairsSpot.y * TILE;
    this.drawStairsPit(ctx, px, py, 26, 18, Theme.world.stairsRing);
    const label = this.isLastFloorOfRun() ? 'ESCAPE' : 'DOWN';
    ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
    ctx.lineWidth = 3; ctx.strokeStyle = Theme.shadow.outline; ctx.strokeText(label, px, py + 34);
    ctx.fillStyle = Theme.world.stairsRing; ctx.fillText(label, px, py + 34);
  },

  _drawEntry(i){
    const pool = this._drawPool || (this._drawPool = []);
    return pool[i] || (pool[i] = { y: 0, kind: 0, ref: null });
  },

  drawWorldSorted(){
    const node = this.currentRoom, ctx = this.ctx;
    const list = this._entityDrawScratch;
    list.length = 0;
    let n = 0;

    for (let i = 0; i < node.enemies.length; i++) {
      const e = node.enemies[i];
      if (e.isDead || !e.type.linkedDeath) continue;
      for (let j = i + 1; j < node.enemies.length; j++) {
        const o = node.enemies[j];
        if (o.isDead || o.type.id !== e.type.id) continue;
        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = Theme.shadow.outline;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(o.x, o.y); ctx.stroke();
        ctx.restore();
        break;
      }
    }
    for (const ob of node.obstacles) {
      if (ob.destroyed || GROUND_OBSTACLES[ob.kind]) continue;
      const en = this._drawEntry(n++); en.kind = 0; en.ref = ob; en.y = ob.y; list.push(en);
    }
    for (const pk of node.pickups) {
      const en = this._drawEntry(n++); en.kind = 1; en.ref = pk; en.y = pk.y; list.push(en);
    }
    for (const c of node.chests) {
      const en = this._drawEntry(n++); en.kind = 2; en.ref = c; en.y = c.y; list.push(en);
    }
    for (const e of node.enemies) {
      if (e.isDead) continue;
      const en = this._drawEntry(n++); en.kind = 3; en.ref = e; en.y = e.y; list.push(en);
    }
    for (const f of this.player.familiars) {
      const en = this._drawEntry(n++); en.kind = 4; en.ref = f; en.y = f.y; list.push(en);
    }
    const pe = this._drawEntry(n++); pe.kind = 5; pe.ref = this.player; pe.y = this.player.y; list.push(pe);

    list.sort(SORT_BY_Y);
    for (const en of list) {
      switch (en.kind) {
        case 0: Util.drawObstacle(ctx, en.ref, this.now); break;
        case 1: Util.drawPickupIcon(ctx, en.ref, Math.sin(this.now / 300 + en.ref.bobPhase) * 2); break;
        case 2: Util.drawChestIcon(ctx, en.ref); break;
        case 3: this.drawEnemy(en.ref); break;
        case 4: this.drawFamiliar(en.ref); break;
        default: this.drawPlayer(); break;
      }
    }
  },

  drawFamiliar(f){
    const ctx = this.ctx;
    const bob = f.def.behavior === 'orbiter' ? 0 : Math.sin(this.now / 260 + f.index) * 2;
    ctx.save();
    ctx.fillStyle = Theme.shadow.ground;
    ctx.beginPath(); ctx.ellipse(f.x, f.y + 9, 8, 3, 0, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = Util.bodyShade(ctx, f.x, f.y + bob, 11, (f.dyeId && WISP_DYE_TYPES_BY_ID[f.dyeId].color) || f.def.color);
    ctx.beginPath(); ctx.arc(f.x, f.y + bob, 11, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = Theme.rgba(Theme.rgb.white, .35); ctx.lineWidth = 1.5; ctx.stroke();
    ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = Theme.ui.onIcon;
    ctx.fillText(f.def.icon, f.x, f.y + bob + 1);
    ctx.restore();

    if (f.def.behavior === 'swarmer' && f.miniOrbs && f.miniOrbs.length) {
      for (const orb of f.miniOrbs) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, orb.life);
        ctx.fillStyle = Util.bodyShade(ctx, orb.x, orb.y, 5, f.def.color);
        ctx.beginPath(); ctx.arc(orb.x, orb.y, 5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = Theme.rgba(Theme.rgb.white, .5); ctx.lineWidth = 1; ctx.stroke();
        ctx.restore();
      }
    }
  },

  drawPlayer(){
    const ctx = this.ctx, p = this.player;
    const flash = p.invulnTimer > 0 && Math.floor(this.now / 80) % 2 === 0;

    const inv = p.invulnTimer || 0;
    if (inv > (this._fxPlayerInvuln || 0)) {
      FX.shake(4.5, 0.22);
      FX.sparks(p.x, p.y, Theme.floatText.playerHurt, 7);

      this._playerSquashAt = this.now;
    }
    this._fxPlayerInvuln = inv;
    const squashElapsed = this.now - (this._playerSquashAt || -9999);
    const squashT = Util.clamp(1 - squashElapsed / 250, 0, 1);
    ctx.save();
    if (p.invincibleTimer > 0) { ctx.shadowColor = Theme.status.invincibleGlow; ctx.shadowBlur = 16; }
    if (squashT > 0) { ctx.translate(p.x, p.y); ctx.scale(1 + 0.16 * squashT, 1 - 0.16 * squashT); ctx.translate(-p.x, -p.y); }
    Util.drawPony(ctx, p.x, p.y, 34 * (p.def.sizeMult || 1), Object.assign({}, Util.classPonyOpts(p.def), {

      hasWings: p.canFly,
      facing: p.facing, flash, moving: p.moving, now: this.now,
    }));
    ctx.restore();
    if (p.freezeTimer > 0) {
      ctx.strokeStyle = Theme.status.freezeRing; ctx.lineWidth = Theme.status.freezeWidth;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.radius + 8, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = Theme.status.freezeFillPlayer;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
    }
    if (p.charged && p.chargeTimer > 0) {
      const frac = Util.clamp(p.chargeTimer / p.chargeTime, 0, 1);
      const ex = p.x + p.facing.x * 20, ey = p.y + p.facing.y * 20;
      ctx.save();
      ctx.globalAlpha = 0.5 + frac * 0.5;
      ctx.shadowColor = Theme.fx.emberGlow; ctx.shadowBlur = 6 + frac * 10;
      ctx.fillStyle = Util.bodyShade(ctx, ex, ey, 4 + frac * 6, Theme.fx.ember);
      ctx.beginPath(); ctx.arc(ex, ey, 4 + frac * 6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  },

  drawEnemy(e){
    const ctx = this.ctx;

    const moving = e._lastX !== undefined && (Math.abs(e.x - e._lastX) > 0.05 || Math.abs(e.y - e._lastY) > 0.05);
    e._lastX = e.x; e._lastY = e.y;

    const hit = e.hitFlash > 0;
    if (hit && !e._fxHit) {

      if (e._lastHitCrit) {
        FX.sparks(e.x, e.y - e.radius * 0.25, Theme.particle.critSpark, 9);
        FX.twinkle(e.x, e.y - e.radius * 0.25, Theme.particle.critSpark, 5);
        e._lastHitCrit = false;
      } else {
        FX.sparks(e.x, e.y - e.radius * 0.25, Theme.particle.hitSpark, 5);
      }
    }
    e._fxHit = hit;

    if (e.lobTimer > 0) {
      const R = (e.type && e.type.burstRadius) || 44;
      const frac = 1 - Util.clamp(e.lobTimer / (e.lobTime || 1), 0, 1);
      ctx.save();
      ctx.globalAlpha = 0.3 + 0.4 * frac;
      ctx.fillStyle = Theme.shadow.outlineSoft;
      ctx.beginPath(); ctx.arc(e.lobX, e.lobY, R * frac, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = Theme.fx.fuseHot; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(e.lobX, e.lobY, R, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    if (e.submerged) ctx.globalAlpha = Theme.enemy.submergedAlpha;

    Util.drawBrownHumanoid(ctx, e, hit, false, this.now, moving, this.dpr);
    if (e.shielded && !e.submerged) {
      ctx.save();
      ctx.shadowColor = Theme.status.shieldRing; ctx.shadowBlur = 6;
      ctx.strokeStyle = Theme.status.shieldRing; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.radius + 5, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    this.drawStatusEffects(e);
    ctx.restore();
  },

  drawStatusEffects(e){
    const ctx = this.ctx;
    const ringR = e.radius + 8;

    if (e.freezeTimer > 0) {

      ctx.save();
      ctx.shadowColor = Theme.status.freezeRing; ctx.shadowBlur = 5;
      ctx.strokeStyle = Theme.status.freezeRing; ctx.lineWidth = Theme.status.freezeWidth;
      ctx.beginPath(); ctx.arc(e.x, e.y, ringR, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = Theme.status.freezeFill;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      ctx.beginPath(); ctx.arc(e.x - e.radius * 0.35, e.y - e.radius * 0.3, 1.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(e.x + e.radius * 0.3, e.y + e.radius * 0.2, 1, 0, Math.PI * 2); ctx.fill();
    }
    if (e.fearTimer > 0) {
      ctx.save();
      ctx.shadowColor = Theme.status.fearRing; ctx.shadowBlur = 5;
      ctx.strokeStyle = Theme.status.fearRing; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(e.x, e.y, ringR, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    if (e.poisonTimer > 0) {
      ctx.fillStyle = Theme.status.poisonAura;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.radius + 3, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = Theme.status.poisonBlob;
      ctx.beginPath(); ctx.arc(e.x + e.radius * 0.6, e.y - e.radius * 0.9, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(e.x - e.radius * 0.5, e.y - e.radius * 0.5, 1.8, 0, Math.PI * 2); ctx.fill();
    }
    if (e.vulnerableTimer > 0) {
      const pulse = 0.5 + Math.sin(this.now / 100) * 0.5;
      ctx.strokeStyle = Theme.status.vulnerableRing; ctx.lineWidth = 1.5 + pulse;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.radius + 4, 0, Math.PI * 2); ctx.stroke();
    }

    const icons = [];
    if (e.stunTimer > 0) icons.push(['☆', Theme.status.stun]);
    if (e.charmTimer > 0) icons.push(['♥', Theme.status.charm]);
    if (e.freezeTimer > 0) icons.push(['❄', Theme.status.freezeRing]);
    if (e.fearTimer > 0) icons.push(['!', Theme.status.fearRing]);
    if (e.vulnerableTimer > 0) icons.push(['✕', Theme.status.vulnerableMark]);
    if (icons.length) {
      const iy = e.y - e.radius - 12 + Math.sin(this.now / 130) * 2;
      const spacing = 13;
      const startX = e.x - spacing * (icons.length - 1) / 2;
      ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
      icons.forEach(([ch, color], i) => {
        const ix = startX + i * spacing;
        ctx.lineWidth = 2.5; ctx.strokeStyle = Theme.shadow.outline; ctx.strokeText(ch, ix, iy);
        ctx.fillStyle = color; ctx.fillText(ch, ix, iy);
      });
    }
  },

  drawBossHealthBar(){
    const boss = this.currentRoom.enemies.find(e => e.isBoss && !e.isDead);
    if (!boss) { this._bossBarBoss = null; return; }
    const ctx = this.ctx;
    const w = CAMERA_W * 0.7, x = (CAMERA_W - w) / 2, y = 10;
    const frac = Util.clamp(boss.hp / boss.maxHp, 0, 1);

    if (this._bossBarBoss !== boss) { this._bossBarBoss = boss; this._bossBarGhost = frac; this._bossBarGhostT = this.now; }
    const dt = Math.min(0.1, Math.max(0, (this.now - this._bossBarGhostT) / 1000));
    this._bossBarGhostT = this.now;
    this._bossBarGhost = frac >= this._bossBarGhost ? frac : Math.max(frac, this._bossBarGhost - dt * 0.35);

    const bloodied = frac < 0.25 && frac > 0;
    const bloodPulse = bloodied ? 0.5 + Math.sin(this.now / 110) * 0.5 : 0;
    ctx.save();
    ctx.shadowColor = bloodied ? '#ff3a4a' : Theme.ui.bossBarFill;
    ctx.shadowBlur = bloodied ? 10 + bloodPulse * 10 : 8;
    ctx.fillStyle = Theme.ui.bossBarBack; ctx.fillRect(x - 2, y - 2, w + 4, 14);
    ctx.restore();
    ctx.strokeStyle = bloodied ? `rgba(255,58,74,${0.4 + bloodPulse * 0.4})` : 'rgba(255,255,255,.18)';
    ctx.lineWidth = bloodied ? 1.5 : 1;
    ctx.strokeRect(x - 2.5, y - 2.5, w + 5, 15);

    ctx.fillStyle = Theme.ui.bossBarEmpty; ctx.fillRect(x, y, w, 10);

    if (this._bossBarGhost > frac) {
      ctx.fillStyle = 'rgba(227,91,106,.45)';
      ctx.fillRect(x + w * frac, y, w * (this._bossBarGhost - frac), 10);
    }

    const grad = ctx.createLinearGradient(x, y, x, y + 10);
    grad.addColorStop(0, '#ff8a96');
    grad.addColorStop(0.45, Theme.ui.bossBarFill);
    grad.addColorStop(1, '#a83040');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w * frac, 10);

    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1;
    for (const q of [0.25, 0.5, 0.75]) {
      const tx = x + w * q;
      ctx.beginPath(); ctx.moveTo(tx, y); ctx.lineTo(tx, y + 10); ctx.stroke();
    }

    ctx.fillStyle = Theme.ui.text; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,.9)'; ctx.shadowBlur = 4;
    ctx.fillText(boss.name, CAMERA_W / 2, y + 24);
    ctx.shadowBlur = 0;
  },

  drawProjectiles(){
    const ctx = this.ctx;
    for (const pr of this.projectiles) {

      if (pr.shape === 'needle') {

        const ang = Math.atan2(pr.vy, pr.vx);
        ctx.save();
        ctx.translate(pr.x, pr.y); ctx.rotate(ang); ctx.scale(1.9, 0.6);
        ctx.shadowColor = pr.color; ctx.shadowBlur = Theme.projectile.glowBlur;
        ctx.fillStyle = pr.color;
        ctx.beginPath(); ctx.arc(0, 0, pr.radius, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      } else {
        ctx.save();
        ctx.shadowColor = pr.color;
        ctx.shadowBlur = (pr.explosive || pr.shape === 'heavy') ? Theme.projectile.glowBlurBig : Theme.projectile.glowBlur;
        ctx.fillStyle = pr.color;
        ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.radius, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        ctx.fillStyle = Theme.projectile.glint;

        const gl = pr.shape === 'heavy' ? 0.5 : 0.35;
        ctx.beginPath(); ctx.arc(pr.x - pr.radius * 0.3, pr.y - pr.radius * 0.3, pr.radius * gl, 0, Math.PI * 2); ctx.fill();
      }

      if (pr.statusColor) {
        ctx.save();
        ctx.strokeStyle = pr.statusColor;
        ctx.lineWidth = 2;
        ctx.shadowColor = pr.statusColor; ctx.shadowBlur = Theme.projectile.glowBlur;
        ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.radius + 3, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
    }
  },

  drawBombsExplosions(){
    const ctx = this.ctx;
    for (const b of this.bombs) {
      const pulse = 1 + Math.sin(this.now / 100) * 0.15;
      ctx.fillStyle = Theme.shadow.groundSoft;
      ctx.beginPath(); ctx.ellipse(b.x, b.y + b.radius * 0.7, b.radius * 0.8, b.radius * 0.28, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = Util.bodyShade(ctx, b.x - b.radius * 0.2, b.y - b.radius * 0.2, b.radius * pulse, Theme.fx.bombBody);
      ctx.beginPath(); ctx.arc(b.x, b.y, b.radius * pulse, 0, Math.PI * 2); ctx.fill();
      const fuseCol = b.timer < 0.5 ? Theme.fx.fuseHot : Theme.fx.fuse;
      ctx.strokeStyle = fuseCol; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(b.x + 3, b.y - 6); ctx.lineTo(b.x + 7, b.y - 12); ctx.stroke();
      ctx.save();
      ctx.shadowColor = fuseCol; ctx.shadowBlur = b.timer < 0.5 ? 8 : 4;
      ctx.fillStyle = fuseCol;
      ctx.beginPath(); ctx.arc(b.x + 7, b.y - 12, 2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    for (const ex of this.explosions) {
      const t = 1 - ex.life / ex.maxLife;
      const r = ex.radius * Util.clamp(t * 1.4, 0, 1);
      const alpha = ex.life / ex.maxLife;
      if (!isFinite(ex.x) || !isFinite(ex.y) || !isFinite(r) || r <= 0) continue;
      const grad = ctx.createRadialGradient(ex.x, ex.y, Math.max(0.1, r * 0.1), ex.x, ex.y, r);
      grad.addColorStop(0, `rgba(${Theme.fx.blastCore},${alpha * 0.9})`);
      grad.addColorStop(0.45, `rgba(${Theme.fx.blastMidR},${Theme.fx.blastMidG + Math.floor(Theme.fx.blastMidGRamp * (1 - t))},${Theme.fx.blastMidB},${alpha * 0.6})`);
      grad.addColorStop(1, Theme.fx.blastEdge);
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(ex.x, ex.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `rgba(${Theme.fx.blastRing},${alpha * 0.5})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(ex.x, ex.y, r * 0.96, 0, Math.PI * 2); ctx.stroke();
    }
  },

  drawGreenFireZone(){
    const z = this.player && this.player.fireZone;
    if (!z) return;
    const ctx = this.ctx;
    const t = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
    ctx.save();
    const grad = ctx.createRadialGradient(z.x, z.y, z.radius * 0.15, z.x, z.y, z.radius);
    grad.addColorStop(0, 'rgba(180,255,210,.55)');
    grad.addColorStop(0.5, 'rgba(90,224,160,.35)');
    grad.addColorStop(1, 'rgba(40,140,90,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = 'rgba(140,255,190,.5)';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + t * 1.2;
      const r = z.radius * (0.45 + 0.35 * Math.abs(Math.sin(t * 3 + i)));
      const fx = z.x + Math.cos(a) * r, fy = z.y + Math.sin(a) * r;
      ctx.beginPath(); ctx.arc(fx, fy, 5 + 3 * Math.abs(Math.cos(t * 4 + i)), 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(90,224,160,.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  },

  drawSwingFX(){
    if (!this.swingFX) return;
    const ctx = this.ctx, fx = this.swingFX;
    const alpha = Util.clamp(fx.life / 0.14, 0, 1);
    const rad = this.player.meleeRange * 0.7;

    ctx.lineCap = 'round';
    ctx.strokeStyle = `rgba(${Theme.rgb.swingTrail},${alpha * 0.35})`;
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(fx.x, fx.y, rad, fx.ang - 0.7, fx.ang + 0.55); ctx.stroke();
    ctx.strokeStyle = `rgba(${Theme.rgb.white},${alpha * 0.85})`;
    ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.arc(fx.x, fx.y, rad, fx.ang - 0.7, fx.ang + 0.7); ctx.stroke();
    ctx.lineCap = 'butt';
  },

  drawLaserFX(){
    if (!this.laserFX) return;
    const ctx = this.ctx, fx = this.laserFX;
    const alpha = Util.clamp(fx.life / (fx.maxLife || 0.12), 0, 1);
    const rgb = fx.color || Theme.rgb.laser;
    ctx.save();
    ctx.strokeStyle = `rgba(${rgb},${alpha * 0.9})`;
    ctx.lineWidth = fx.width || 5;
    ctx.shadowColor = `rgba(${rgb},.8)`; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.moveTo(fx.x1, fx.y1); ctx.lineTo(fx.x2, fx.y2); ctx.stroke();
    ctx.strokeStyle = `rgba(${Theme.rgb.white},${alpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(fx.x1, fx.y1); ctx.lineTo(fx.x2, fx.y2); ctx.stroke();
    ctx.restore();
  },

  drawFloatTexts(){
    const ctx = this.ctx;
    ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';

    ctx.lineWidth = 3; ctx.strokeStyle = Theme.shadow.outline;
    for (const f of this.floatTexts) {

      if (f.isDamage && !damageNumbersEnabled) continue;
      const alpha = Util.clamp(f.life / f.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    }
  },

});
