(function () {
  'use strict';
  const C = window.NDCore;
  const W = C.WORLD;

  function shade(hex, amt) {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    let r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
    if (amt >= 0) { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
    else { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
    return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  }
  function bodyShade(ctx, x, y, r, col) {
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.1);
    g.addColorStop(0, shade(col, 0.22));
    g.addColorStop(0.6, col);
    g.addColorStop(1, shade(col, -0.3));
    return g;
  }

  const View = {
    portrait: false, sc: 1, ox: 0, oy: 0, cw: 0, ch: 0,
    fit(cw, ch) {
      this.cw = cw; this.ch = ch;
      this.portrait = ch > cw * 1.05;
      const along = this.portrait ? ch : cw, across = this.portrait ? cw : ch;
      this.sc = Math.min(along / W.L, across / W.W);
      const aw = W.L * this.sc, cw2 = W.W * this.sc;
      if (this.portrait) { this.ox = (cw - cw2) / 2; this.oy = (ch - aw) / 2; }
      else { this.ox = (cw - aw) / 2; this.oy = (ch - cw2) / 2; }
    },
    toScreen(x, y) {
      return this.portrait ? [this.ox + y * this.sc, this.oy + x * this.sc] : [this.ox + x * this.sc, this.oy + y * this.sc];
    },
    toWorld(sx, sy) {
      return this.portrait ? [(sy - this.oy) / this.sc, (sx - this.ox) / this.sc] : [(sx - this.ox) / this.sc, (sy - this.oy) / this.sc];
    },
    angle(a) { return this.portrait ? Math.PI / 2 - a : a; },
  };

  function drawPony(ctx, x, y, size, o) {
    const now = o.now || 0;
    const angle = o.angle === undefined ? Math.PI / 2 : o.angle;
    const body = o.body, mane = o.mane;
    const bob = Math.sin(now / 250 + (o.seed || 0)) * size * 0.015 - (o.hop || 0) * size * 0.25;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.beginPath(); ctx.ellipse(0, size * 0.42 - bob, size * 0.45, size * 0.13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = shade(body, -0.35);
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * size * 0.24, size * 0.32, size * 0.115, size * 0.145, 0, 0, Math.PI * 2); ctx.fill(); }
    if (o.wings) {
      const flap = Math.sin(now / 160 + (o.seed || 0)) * 0.25;
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.translate(s * size * 0.28, -size * 0.02);
        ctx.rotate(s * -(0.3 + flap));
        ctx.fillStyle = shade(body, 0.12);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(s * size * 0.3, -size * 0.38, s * size * 0.55, -size * 0.2);
        ctx.lineTo(s * size * 0.42, -size * 0.08);
        ctx.lineTo(s * size * 0.46, size * 0.02);
        ctx.lineTo(s * size * 0.3, size * 0.02);
        ctx.lineTo(s * size * 0.32, size * 0.12);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = shade(body, -0.25); ctx.lineWidth = size * 0.02; ctx.stroke();
        ctx.restore();
      }
    }
    const ta = angle + Math.PI + Math.sin(now / 800) * 0.1;
    const tx = Math.cos(ta) * size * 0.48, ty = Math.sin(ta) * size * 0.3 + size * 0.1;
    ctx.fillStyle = mane;
    ctx.beginPath(); ctx.ellipse(tx, ty, size * 0.16, size * 0.24, ta + Math.PI / 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = bodyShade(ctx, 0, size * 0.06, size * 0.5, body);
    ctx.beginPath(); ctx.ellipse(0, size * 0.06, size * 0.54, size * 0.39, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.lineWidth = size * 0.02;
    ctx.beginPath(); ctx.ellipse(0, size * 0.06, size * 0.47, size * 0.33, 0, Math.PI * 1.1, Math.PI * 1.7); ctx.stroke();
    if (o.mark) {
      ctx.fillStyle = o.mark;
      ctx.beginPath(); ctx.arc(-Math.cos(angle) * size * 0.22, size * 0.1, size * 0.06, 0, Math.PI * 2); ctx.fill();
    }
    const hx = Math.cos(angle) * size * 0.4, hy = Math.sin(angle) * size * 0.4 - size * 0.05;
    const hg = bodyShade(ctx, hx, hy, size * 0.3, body);
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.arc(hx, hy, size * 0.285, 0, Math.PI * 2); ctx.fill();
    const mx = hx + Math.cos(angle) * size * 0.2, my = hy + Math.sin(angle) * size * 0.2;
    ctx.beginPath(); ctx.ellipse(mx, my, size * 0.15, size * 0.125, angle, 0, Math.PI * 2); ctx.fill();
    for (const s of [-1, 1]) {
      ctx.fillStyle = hg;
      ctx.beginPath();
      ctx.moveTo(hx + s * size * 0.16, hy - size * 0.2);
      ctx.lineTo(hx + s * size * 0.26, hy - size * 0.42);
      ctx.lineTo(hx + s * size * 0.04, hy - size * 0.28);
      ctx.closePath(); ctx.fill();
    }
    if (o.horn) {
      const glow = o.glow || mane;
      ctx.save();
      ctx.shadowColor = glow; ctx.shadowBlur = 6 + Math.sin(now / 200) * 3;
      ctx.fillStyle = '#ece4cc';
      ctx.beginPath();
      ctx.moveTo(hx - size * 0.05, hy - size * 0.22);
      ctx.lineTo(hx + size * 0.03, hy - size * 0.62);
      ctx.lineTo(hx + size * 0.07, hy - size * 0.2);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = mane;
    ctx.beginPath();
    ctx.ellipse(hx - Math.cos(angle) * size * 0.08, hy - Math.sin(angle) * size * 0.08 - size * 0.04, size * 0.16, size * 0.22, angle, 0, Math.PI * 2);
    ctx.fill();
    const blink = ((now + (o.seed || 0) * 700) % 3600) < 110;
    for (const s of [-1, 1]) {
      const ex = hx + Math.cos(angle) * size * 0.1 + Math.cos(angle + s * 1.2) * size * 0.12;
      const ey = hy + Math.sin(angle) * size * 0.1 + Math.sin(angle + s * 1.2) * size * 0.12;
      if (blink) { ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(ex, ey, size * 0.062, size * 0.01, angle, 0, Math.PI * 2); ctx.fill(); continue; }
      ctx.fillStyle = '#f5f0e6';
      ctx.beginPath(); ctx.ellipse(ex, ey, size * 0.062, size * 0.05, angle, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#171220';
      ctx.beginPath(); ctx.arc(ex + Math.cos(angle) * size * 0.012, ey, size * 0.036, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.beginPath(); ctx.arc(ex - size * 0.018, ey - size * 0.018, size * 0.015, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawDNB(ctx, e, x, y, r, now) {
    const flash = e.hit > 0;
    const col = flash ? '#ffffff' : e.color, dark = flash ? '#eeeeee' : e.dark;
    const ph = e.seed || 0;
    ctx.save();
    if (e.burrowT > 0) ctx.globalAlpha = 0.25;
    const magic = C.isMagic(e);
    if (magic) {
      const p = 0.5 + 0.5 * Math.sin(now / 220 + ph);
      ctx.save();
      ctx.globalAlpha *= 0.35 + 0.25 * p;
      const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 1.7);
      g.addColorStop(0, 'rgba(192,139,255,.9)'); g.addColorStop(1, 'rgba(192,139,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r * 1.7, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    const fl = e.flying;
    ctx.beginPath(); ctx.ellipse(x, y + r * (fl ? 1.35 : 0.7), r * (fl ? 0.5 : 0.8), r * (fl ? 0.15 : 0.28), 0, 0, Math.PI * 2); ctx.fill();
    if (fl) {
      const flap = Math.sin(now / 90 + ph) * 0.45;
      ctx.globalAlpha *= 0.92;
      ctx.fillStyle = flash ? '#fff' : shade(col, -0.15);
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x + s * r * 0.4, y - r * 0.2);
        ctx.lineTo(x + s * r * 1.35, y - r * (0.75 + flap * 0.6));
        ctx.lineTo(x + s * r * 1.15, y - r * 0.1);
        ctx.lineTo(x + s * r * 1.3, y + r * 0.2 - flap * r * 0.2);
        ctx.lineTo(x + s * r * 0.5, y + r * 0.15);
        ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = e.burrowT > 0 ? 0.25 : 1;
    } else {
      const swing = Math.sin(now / 110 + ph) * r * 0.22;
      ctx.fillStyle = flash ? '#eee' : shade(dark, -0.15);
      ctx.beginPath(); ctx.ellipse(x - r * 0.3, y + r * 0.55 + swing, r * 0.22, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + r * 0.3, y + r * 0.55 - swing, r * 0.22, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = dark; ctx.lineWidth = Math.max(2, r * 0.22); ctx.lineCap = 'round';
    const armSw = Math.sin(now / 140 + ph) * r * 0.12;
    ctx.beginPath(); ctx.moveTo(x - r * 0.55, y - r * 0.1); ctx.lineTo(x - r * 0.9, y + r * 0.35 + armSw); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + r * 0.55, y - r * 0.1); ctx.lineTo(x + r * 0.9, y + r * 0.35 - armSw); ctx.stroke();
    ctx.fillStyle = flash ? col : bodyShade(ctx, x, y - r * 0.3, r, col);
    ctx.beginPath(); ctx.ellipse(x, y, r * 0.62, r * 0.85, 0, 0, Math.PI * 2); ctx.fill();
    const hx = x, hy = y - r * 0.75;
    ctx.beginPath(); ctx.arc(hx, hy, r * 0.5, 0, Math.PI * 2); ctx.fill();
    if (!flash) {
      ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.lineWidth = Math.max(1, r * 0.1);
      ctx.beginPath(); ctx.ellipse(x, y, r * 0.6, r * 0.82, 0, Math.PI * 1.12, Math.PI * 1.62); ctx.stroke();
    }
    if (e.type === 'tanky' || (e.boss && !fl)) {
      ctx.fillStyle = flash ? '#eee' : '#e8e4dc';
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(hx + s * r * 0.35, hy - r * 0.15); ctx.lineTo(hx + s * r * 0.6, hy - r * 0.55); ctx.lineTo(hx + s * r * 0.12, hy - r * 0.32); ctx.closePath(); ctx.fill();
      }
    }
    if (e.type === 'fast') {
      ctx.strokeStyle = 'rgba(255,230,200,.35)'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x - r * (1.1 + i * 0.1), y - r * 0.4 + i * r * 0.4); ctx.lineTo(x - r * (1.8 + i * 0.2), y - r * 0.4 + i * r * 0.4); ctx.stroke(); }
    }
    if (magic && !flash) {
      ctx.save();
      ctx.fillStyle = '#d8b4ff'; ctx.shadowColor = '#c08bff'; ctx.shadowBlur = 8;
      const a = now / 500 + ph;
      for (let i = 0; i < 3; i++) {
        const aa = a + i * Math.PI * 2 / 3;
        ctx.beginPath(); ctx.arc(x + Math.cos(aa) * r * 1.05, y - r * 0.2 + Math.sin(aa) * r * 0.4, Math.max(1.2, r * 0.1), 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    if (e.armor && e.hp > e.hpMax * 0.5) {
      ctx.strokeStyle = '#9a9488'; ctx.lineWidth = Math.max(2, r * 0.18);
      ctx.beginPath(); ctx.arc(x, y - r * 0.1, r * 0.95, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
    }
    if (e.boss && !e.splitDone) {
      ctx.fillStyle = '#e3c15b';
      ctx.beginPath();
      ctx.moveTo(hx - r * 0.35, hy - r * 0.42); ctx.lineTo(hx - r * 0.3, hy - r * 0.78); ctx.lineTo(hx - r * 0.12, hy - r * 0.55);
      ctx.lineTo(hx, hy - r * 0.86); ctx.lineTo(hx + r * 0.12, hy - r * 0.55); ctx.lineTo(hx + r * 0.3, hy - r * 0.78); ctx.lineTo(hx + r * 0.35, hy - r * 0.42);
      ctx.closePath(); ctx.fill();
    }
    const eyeCol = e.boss ? '#ff6a5a' : (magic ? '#e8c8ff' : '#1a1420');
    ctx.fillStyle = flash ? '#1a1420' : eyeCol;
    if (e.boss || magic) { ctx.shadowColor = eyeCol; ctx.shadowBlur = 6; }
    ctx.beginPath(); ctx.arc(x - r * 0.18, y - r * 0.78, r * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.18, y - r * 0.78, r * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    if (e.stunT > 0) {
      ctx.fillStyle = '#ffe58a'; ctx.font = `${Math.max(9, r * 0.8)}px sans-serif`; ctx.textAlign = 'center';
      ctx.fillText('☆', x + Math.sin(now / 120) * r * 0.4, y - r * 1.45);
    }
    if (e.slow > 0 || e.quag) {
      ctx.strokeStyle = 'rgba(120,200,255,.7)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y + r * 0.2, r * 1.05, 0.2, Math.PI - 0.2); ctx.stroke();
    }
    if (e.hexT > 0) {
      ctx.strokeStyle = 'rgba(214,107,255,.8)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, r + 4, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
    if (e.hp < e.hpMax || e.boss) {
      const bw = e.boss ? r * 2.6 : r * 1.8, bh = e.boss ? 5 : 3.5;
      const bx = x - bw / 2, by = y - r * 1.55 - (e.boss ? 6 : 0);
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
      ctx.fillStyle = e.boss ? '#e35b6a' : (magic ? '#c08bff' : (fl ? '#7fc8ff' : '#7fd66a'));
      ctx.fillRect(bx, by, bw * Math.max(0, e.hp / e.hpMax), bh);
    }
  }

  const Render = {
    View, drawPony, drawDNB, shade,
    bg: null, bgKey: '',
    ponyOpts(race, t) {
      const R = C.RACES[race];
      return { body: R.body, mane: R.mane, horn: race === 'unicorn', wings: race === 'pegasus', glow: R.accent, mark: R.accent, seed: t ? t.id : 0 };
    },
    buildBg(cw, ch, dpr) {
      const key = cw + 'x' + ch + 'x' + dpr + (View.portrait ? 'p' : 'l');
      if (this.bgKey === key) return;
      this.bgKey = key;
      const c = document.createElement('canvas');
      c.width = Math.round(cw * dpr); c.height = Math.round(ch * dpr);
      const g = c.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const grd = g.createRadialGradient(cw * 0.5, ch * 0.45, 10, cw * 0.5, ch * 0.5, Math.max(cw, ch) * 0.8);
      grd.addColorStop(0, '#1d2a2c'); grd.addColorStop(0.55, '#141c22'); grd.addColorStop(1, '#0a0b13');
      g.fillStyle = grd; g.fillRect(0, 0, cw, ch);
      const rng = C.mulberry(1234);
      const sc = View.sc;
      for (let i = 0; i < 900; i++) {
        const sx = rng() * cw, sy = rng() * ch;
        const k = rng();
        g.strokeStyle = k < 0.5 ? 'rgba(90,140,110,.22)' : 'rgba(60,100,90,.25)';
        g.lineWidth = 1;
        g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx - 2, sy - 5 * Math.max(0.6, sc)); g.moveTo(sx, sy); g.lineTo(sx + 2, sy - 4 * Math.max(0.6, sc)); g.stroke();
      }
      for (let i = 0; i < 40; i++) {
        const sx = rng() * cw, sy = rng() * ch;
        g.fillStyle = ['#c9a0dc', '#a0c4ff', '#ffe1a8'][i % 3];
        g.globalAlpha = 0.45;
        g.beginPath(); g.arc(sx, sy, 1.6, 0, Math.PI * 2); g.fill();
      }
      g.globalAlpha = 1;
      for (let i = 0; i < 26; i++) {
        const sx = rng() * cw, sy = rng() * ch, rr = (4 + rng() * 6) * Math.max(0.5, sc);
        g.fillStyle = 'rgba(70,72,90,.55)';
        g.beginPath(); g.ellipse(sx, sy, rr, rr * 0.7, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(255,255,255,.06)';
        g.beginPath(); g.ellipse(sx - rr * 0.2, sy - rr * 0.2, rr * 0.5, rr * 0.3, 0, 0, Math.PI * 2); g.fill();
      }
      const half = W.half * sc;
      const [px, py] = View.toScreen(0, W.cy);
      g.save();
      if (View.portrait) { g.translate(px, 0); g.rotate(0); }
      const pathRect = View.portrait ? [px - half, 0, half * 2, ch] : [0, py - half, cw, half * 2];
      g.fillStyle = 'rgba(0,0,0,.35)';
      g.fillRect(pathRect[0] - (View.portrait ? 4 : 0) - (View.portrait ? px : 0), pathRect[1] - (View.portrait ? 0 : 4), pathRect[2] + (View.portrait ? 8 : 0), pathRect[3] + (View.portrait ? 0 : 8));
      g.restore();
      const pg = View.portrait ? g.createLinearGradient(px - half, 0, px + half, 0) : g.createLinearGradient(0, py - half, 0, py + half);
      pg.addColorStop(0, '#3a2c2a'); pg.addColorStop(0.5, '#4d3a33'); pg.addColorStop(1, '#3a2c2a');
      g.fillStyle = pg;
      g.fillRect(...pathRect);
      g.strokeStyle = 'rgba(255,230,200,.07)'; g.lineWidth = 2; g.setLineDash([10, 14]);
      g.beginPath();
      if (View.portrait) { g.moveTo(px - half * 0.4, 0); g.lineTo(px - half * 0.4, ch); g.moveTo(px + half * 0.4, 0); g.lineTo(px + half * 0.4, ch); }
      else { g.moveTo(0, py - half * 0.4); g.lineTo(cw, py - half * 0.4); g.moveTo(0, py + half * 0.4); g.lineTo(cw, py + half * 0.4); }
      g.stroke(); g.setLineDash([]);
      for (let i = 0; i < 120; i++) {
        const along = rng() * (View.portrait ? ch : cw), across = (rng() - 0.5) * half * 1.8;
        g.fillStyle = 'rgba(120,100,90,.35)';
        const sx = View.portrait ? px + across : along, sy = View.portrait ? along : py + across;
        g.beginPath(); g.arc(sx, sy, 1 + rng() * 1.8, 0, Math.PI * 2); g.fill();
      }
      g.strokeStyle = 'rgba(20,14,12,.6)'; g.lineWidth = 2;
      g.beginPath();
      if (View.portrait) { g.moveTo(px - half, 0); g.lineTo(px - half, ch); g.moveTo(px + half, 0); g.lineTo(px + half, ch); }
      else { g.moveTo(0, py - half); g.lineTo(cw, py - half); g.moveTo(0, py + half); g.lineTo(cw, py + half); }
      g.stroke();
      const [sx0, sy0] = View.toScreen(-10, W.cy);
      for (let i = 0; i < 9; i++) {
        const a = (i - 4) * 0.2;
        const tx = View.portrait ? sx0 + (i - 4) * half * 0.6 : sx0 + 10 + rng() * 20;
        const ty = View.portrait ? sy0 + 10 + rng() * 20 : sy0 + (i - 4) * half * 0.6;
        g.fillStyle = '#0c1210';
        g.beginPath(); g.moveTo(tx, ty - 30 * sc - 10); g.lineTo(tx - 12 * sc - 6, ty + 10); g.lineTo(tx + 12 * sc + 6, ty + 10); g.closePath(); g.fill();
        void a;
      }
      const [gx, gy] = View.toScreen(W.L - 14, W.cy);
      g.save();
      g.shadowColor = '#e3c15b'; g.shadowBlur = 24;
      g.fillStyle = 'rgba(227,193,91,.75)';
      for (const s of [-1, 1]) {
        const lx = View.portrait ? gx + s * (half + 12 * sc + 4) : gx, ly = View.portrait ? gy : gy + s * (half + 12 * sc + 4);
        g.beginPath(); g.arc(lx, ly, Math.max(3, 7 * sc), 0, Math.PI * 2); g.fill();
      }
      g.restore();
      this.bg = c;
    },
  };
  window.NDRender = Render;
})();
