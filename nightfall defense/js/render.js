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

  function drawHorns(ctx, kind, hx, hy, r, col) {
    ctx.fillStyle = col;
    ctx.strokeStyle = col;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      if (kind === 'antler') {
        ctx.lineWidth = Math.max(1.5, r * 0.09); ctx.lineCap = 'round';
        ctx.moveTo(hx + s * r * 0.25, hy - r * 0.35); ctx.lineTo(hx + s * r * 0.55, hy - r * 1.0);
        ctx.moveTo(hx + s * r * 0.4, hy - r * 0.65); ctx.lineTo(hx + s * r * 0.75, hy - r * 0.8);
        ctx.moveTo(hx + s * r * 0.5, hy - r * 0.88); ctx.lineTo(hx + s * r * 0.38, hy - r * 1.12);
        ctx.stroke(); continue;
      }
      if (kind === 'ears') { ctx.moveTo(hx + s * r * 0.18, hy - r * 0.35); ctx.lineTo(hx + s * r * 0.42, hy - r * 0.95); ctx.lineTo(hx + s * r * 0.44, hy - r * 0.25); }
      else if (kind === 'spike') { ctx.moveTo(hx + s * r * 0.1, hy - r * 0.42); ctx.lineTo(hx + s * r * 0.22, hy - r * 1.05); ctx.lineTo(hx + s * r * 0.32, hy - r * 0.38); }
      else if (kind === 'curl') {
        ctx.lineWidth = Math.max(2, r * 0.14); ctx.lineCap = 'round';
        ctx.arc(hx + s * r * 0.5, hy - r * 0.35, r * 0.28, s > 0 ? Math.PI * 0.9 : Math.PI * 0.1, s > 0 ? Math.PI * 2.3 : -Math.PI * 1.3, s < 0);
        ctx.stroke(); continue;
      }
      else { ctx.moveTo(hx + s * r * 0.35, hy - r * 0.15); ctx.lineTo(hx + s * r * 0.7, hy - r * 0.7); ctx.lineTo(hx + s * r * 0.12, hy - r * 0.32); }
      ctx.closePath(); ctx.fill();
    }
  }

  function drawDNB(ctx, e, x, y, r, now) {
    const look = e.bossDef && e.bossDef.look;
    if (look && look.size && !e.splitDone) r *= look.size;
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
    if (look && look.aura && !flash) {
      const p = 0.5 + 0.5 * Math.sin(now / 300 + ph);
      ctx.save();
      ctx.globalAlpha *= 0.3 + 0.2 * p;
      const g = ctx.createRadialGradient(x, y, r * 0.3, x, y, r * 2);
      g.addColorStop(0, look.aura); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r * 2, 0, Math.PI * 2); ctx.fill();
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
    if (look && look.spikes) {
      ctx.fillStyle = flash ? '#eee' : shade(dark, -0.2);
      for (let i = 0; i < 4; i++) {
        const a = Math.PI * (0.62 + i * 0.25);
        const bx = x + Math.cos(a) * r * 0.6, by = y + Math.sin(a) * r * 0.82;
        ctx.beginPath(); ctx.moveTo(bx - r * 0.1, by); ctx.lineTo(bx + Math.cos(a) * r * 0.42, by + Math.sin(a) * r * 0.42); ctx.lineTo(bx + r * 0.1, by + r * 0.08); ctx.closePath(); ctx.fill();
      }
    }
    if (look) {
      if (look.horns !== 'none') drawHorns(ctx, look.horns || 'tusk', hx, hy, r, flash ? '#eee' : '#e8e4dc');
    } else if (e.type === 'tanky' || (e.boss && !fl)) {
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
    if (e.cut > 0) {
      ctx.save();
      ctx.strokeStyle = e.shellT > 0 ? '#e8dcc0' : '#9a9488'; ctx.lineWidth = Math.max(2, r * 0.2);
      ctx.globalAlpha *= 0.5 + e.cut * 0.5;
      if (e.shellT > 0) { ctx.shadowColor = '#fff0c8'; ctx.shadowBlur = 8; circle(ctx, x, y - r * 0.1, r * 1.08); ctx.stroke(); }
      else { ctx.beginPath(); ctx.arc(x, y - r * 0.1, r * 0.95, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke(); }
      ctx.restore();
    }
    if (e.hasteT > 0) {
      ctx.strokeStyle = 'rgba(255,220,120,.55)'; ctx.lineWidth = 1.2;
      for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.moveTo(x - r * 1.0, y - r * 0.2 + i * r * 0.5); ctx.lineTo(x - r * 1.6, y - r * 0.2 + i * r * 0.5); ctx.stroke(); }
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
    const eyeCol = look && look.eyes ? look.eyes : e.boss ? '#ff6a5a' : (magic ? '#e8c8ff' : '#1a1420');
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
    if (!e.noBar && (e.hp < e.hpMax || e.boss)) {
      const bw = e.boss ? r * 2.6 : r * 1.8, bh = e.boss ? 5 : 3.5;
      const bx = x - bw / 2, by = y - r * 1.55 - (e.boss ? 6 : 0);
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
      ctx.fillStyle = e.boss ? '#e35b6a' : (magic ? '#c08bff' : (fl ? '#7fc8ff' : '#7fd66a'));
      ctx.fillRect(bx, by, bw * Math.max(0, e.hp / e.hpMax), bh);
    }
  }

  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); }

  function routeScreen(P) { return P.pts.map(p => View.toScreen(p[0], p[1])); }
  function strokePath(g, pts) {
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.stroke();
  }

  const tmpPos = { x: 0, y: 0, tx: 1, ty: 0 };
  const PROJ_COL = { unicorn: '#c9a4ff', pegasus: '#bff4ee', earth: '#e3a95b' };
  const BURST_N = 9, BURST_BIG = 22;

  function drawRange(ctx, x, y, range, ok, faint, base) {
    const [sx, sy] = View.toScreen(x, y);
    if (base && base > range + 0.5) {
      circle(ctx, sx, sy, base * View.sc);
      ctx.strokeStyle = faint ? 'rgba(160,150,200,.18)' : 'rgba(160,150,200,.45)';
      ctx.lineWidth = 1; ctx.setLineDash([2, 6]); ctx.stroke(); ctx.setLineDash([]);
      if (!faint) {
        ctx.save();
        ctx.font = '700 11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillStyle = 'rgba(200,190,240,.8)';
        ctx.fillText('dark: ' + Math.round(100 * range / base) + '% range', sx, sy - range * View.sc - 4);
        ctx.restore();
      }
    }
    circle(ctx, sx, sy, range * View.sc);
    ctx.fillStyle = ok ? (faint ? 'rgba(79,209,197,.035)' : 'rgba(79,209,197,.08)') : 'rgba(227,91,106,.1)';
    ctx.fill();
    ctx.strokeStyle = ok ? (faint ? 'rgba(79,209,197,.32)' : 'rgba(79,209,197,.6)') : 'rgba(227,91,106,.7)';
    ctx.lineWidth = faint ? 1 : 1.5; ctx.setLineDash([6, 5]); ctx.stroke(); ctx.setLineDash([]);
  }

  function drawBurst(ctx, f, sx, sy, k, sc) {
    const n = f.big ? BURST_BIG : BURST_N;
    const rng = C.mulberry(f.seed || 1);
    const R = f.r * sc;
    for (let i = 0; i < n; i++) {
      const a = rng() * Math.PI * 2, v = (0.6 + rng() * 0.9) * R * (f.big ? 3.2 : 2.2);
      const px = sx + Math.cos(a) * v * k, py = sy + Math.sin(a) * v * k + k * k * R * 1.4;
      const pr = Math.max(1, R * (0.12 + rng() * 0.16) * (1 - k * 0.7));
      ctx.fillStyle = i % 3 === 0 ? f.c2 : f.c;
      circle(ctx, px, py, pr); ctx.fill();
    }
    ctx.globalAlpha *= 0.5;
    ctx.strokeStyle = f.big ? '#e3c15b' : 'rgba(255,240,220,.6)'; ctx.lineWidth = f.big ? 3 : 1.5;
    circle(ctx, sx, sy, R * (0.6 + k * (f.big ? 2.6 : 1.3))); ctx.stroke();
  }

  function drawNum(ctx, f, sx, sy, k, sc) {
    const jit = ((f.seed || 0) * 37 % 21) - 10;
    const pop = k < 0.15 ? 0.7 + 2 * k : 1;
    const base = f.big ? 16 : f.crit ? 15 : 11;
    const size = Math.round((base * Math.max(0.75, sc) + 3) * pop);
    ctx.font = '800 ' + size + 'px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const y = sy - 6 - k * 30 * Math.max(0.7, sc);
    const s = f.crit ? f.s + '!' : f.s;
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,8,18,.85)';
    ctx.strokeText(s, sx + jit * sc, y);
    ctx.fillStyle = f.crit ? '#ffe066' : f.big ? '#ffb4a8' : '#f3f0fb';
    ctx.fillText(s, sx + jit * sc, y);
  }

  function drawFx(ctx, S, f) {
    const k = f.t / f.life, sc = View.sc;
    const [sx, sy] = View.toScreen(f.x || 0, f.y || 0);
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - k);
    switch (f.k) {
      case 'ring': case 'stomp':
        ctx.strokeStyle = f.c; ctx.lineWidth = f.k === 'stomp' ? 3 : 2;
        circle(ctx, sx, sy, f.r * sc * (f.k === 'stomp' ? 0.4 + 0.6 * k : 0.3 + 0.7 * k)); ctx.stroke(); break;
      case 'puff':
        ctx.fillStyle = f.c; circle(ctx, sx, sy, f.r * sc * (1 + k)); ctx.globalAlpha *= 0.5; ctx.fill(); break;
      case 'burst': drawBurst(ctx, f, sx, sy, k, sc); break;
      case 'num':
        ctx.globalAlpha = k < 0.6 ? 1 : Math.max(0, 1 - (k - 0.6) / 0.4);
        drawNum(ctx, f, sx, sy, k, sc); break;
      case 'text':
        ctx.fillStyle = f.c; ctx.font = '700 ' + Math.max(11, 14 * sc + 4) + 'px system-ui'; ctx.textAlign = 'center';
        ctx.fillText(f.s, sx, sy - k * 24); break;
      case 'spark':
        ctx.fillStyle = f.c; circle(ctx, sx, sy, (4 + 6 * k) * Math.max(0.6, sc)); ctx.fill(); break;
      case 'zap': case 'bolt': {
        const [ax, ay] = f.k === 'zap' ? View.toScreen(f.x1, f.y1) : [sx, sy - 200 * sc];
        const [bx, by] = f.k === 'zap' ? View.toScreen(f.x2, f.y2) : [sx, sy];
        ctx.strokeStyle = f.c; ctx.lineWidth = f.k === 'bolt' ? 3 : 2; ctx.shadowColor = f.c; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.moveTo(ax, ay);
        for (let i = 1; i < 5; i++) { const q = i / 5; ctx.lineTo(ax + (bx - ax) * q + (Math.random() - 0.5) * 10, ay + (by - ay) * q + (Math.random() - 0.5) * 10); }
        ctx.lineTo(bx, by); ctx.stroke(); break;
      }
      case 'star':
        ctx.fillStyle = f.c; ctx.shadowColor = f.c; ctx.shadowBlur = 20;
        circle(ctx, sx, sy, f.r * sc * (0.3 + 0.7 * k)); ctx.globalAlpha *= 0.4; ctx.fill(); break;
      case 'swirl':
        ctx.strokeStyle = f.c; ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(sx, sy, f.r * sc * (0.3 + 0.25 * i), k * 6 + i, k * 6 + i + 2.4); ctx.stroke(); }
        break;
      case 'rainbow': {
        const cols = ['#ff6b6b', '#ffb36b', '#ffe66b', '#7fd66a', '#6bb8ff', '#b48bff'];
        cols.forEach((c, i) => { ctx.strokeStyle = c; ctx.lineWidth = 3; circle(ctx, sx, sy, f.r * sc * k * (1 - i * 0.05)); ctx.stroke(); });
        break;
      }
      case 'stampede': {
        const map = C.mapOf(S);
        ctx.fillStyle = 'rgba(210,168,108,.35)';
        for (const P of map.route) {
          C.routePos(P, P.len * k, tmpPos);
          const [ax, ay] = View.toScreen(tmpPos.x, tmpPos.y);
          circle(ctx, ax, ay, map.half * sc * 1.2); ctx.fill();
        }
        break;
      }
      case 'leak':
        ctx.fillStyle = 'rgba(227,91,106,.35)';
        circle(ctx, sx, sy, 60 * sc * (0.5 + k)); ctx.fill(); break;
    }
    ctx.restore();
  }

  function drawProj(ctx, p, sc) {
    const col = PROJ_COL[p.kind] || '#fff';
    const tr = p._tr || (p._tr = []);
    tr.push(p.x, p.y);
    if (tr.length > 12) tr.splice(0, 2);
    const rr = (p.kind === 'unicorn' ? 5 : 3) * Math.max(0.7, sc);
    ctx.save();
    ctx.strokeStyle = col; ctx.lineCap = 'round';
    for (let i = 2; i < tr.length; i += 2) {
      const [ax, ay] = View.toScreen(tr[i - 2], tr[i - 1]);
      const [bx, by] = View.toScreen(tr[i], tr[i + 1]);
      ctx.globalAlpha = 0.12 + 0.5 * i / tr.length;
      ctx.lineWidth = rr * 1.6 * i / tr.length;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    const [sx, sy] = View.toScreen(p.x, p.y);
    ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 10;
    circle(ctx, sx, sy, rr); ctx.fill();
    ctx.restore();
  }

  function drawBossBar(ctx, S, cw) {
    const b = C.bossStatus(S.run);
    if (!b) return false;
    const w = Math.min(cw - 24, 440), x = (cw - w) / 2, y = cw < 640 ? 46 : 10, h = 12;
    ctx.save();
    ctx.fillStyle = 'rgba(12,10,20,.82)';
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - 8, y - 4, w + 16, h + 26, 8) : ctx.rect(x - 8, y - 4, w + 16, h + 26); ctx.fill();
    ctx.strokeStyle = 'rgba(227,91,106,.6)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.font = '800 12px system-ui, sans-serif'; ctx.textBaseline = 'top';
    ctx.fillStyle = '#e3c15b'; ctx.textAlign = 'left';
    ctx.fillText(b.name + (b.count > 1 ? ' x' + b.count : ''), x, y);
    ctx.fillStyle = 'rgba(243,240,251,.85)'; ctx.textAlign = 'right';
    ctx.fillText(C.fmt(b.hp) + ' / ' + C.fmt(b.max), x + w, y);
    const by = y + 16;
    ctx.fillStyle = '#2a1820'; ctx.fillRect(x, by, w, h - 4);
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, '#b8323f'); g.addColorStop(1, '#ff7a6b');
    ctx.fillStyle = g; ctx.fillRect(x, by, w * Math.max(0, Math.min(1, b.frac)), h - 4);
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    for (const q of [0.25, 0.5, 0.75]) ctx.fillRect(x + w * q - 0.5, by, 1, h - 4);
    ctx.restore();
    return true;
  }

  function worldPoly(g, pts) {
    g.beginPath();
    pts.forEach((p, i) => { const [sx, sy] = View.toScreen(p[0], p[1]); if (i) g.lineTo(sx, sy); else g.moveTo(sx, sy); });
    g.closePath();
  }

  function drawBlock(g, b, P, sc, rng) {
    const [bx, by] = View.toScreen(b.x, b.y);
    const r = b.r * sc;
    if (b.kind === 'tree') {
      const cols = P.canopy || [P.tree, P.tree, P.tree];
      g.fillStyle = 'rgba(0,0,0,.35)';
      g.beginPath(); g.ellipse(bx + r * 0.25, by + r * 0.35, r * 1.05, r * 0.7, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#2a1e14';
      g.fillRect(bx - r * 0.12, by, r * 0.24, r * 0.55);
      for (let i = 0; i < 5; i++) {
        const a = rng() * Math.PI * 2, d = r * 0.35 * rng();
        g.fillStyle = cols[i % cols.length];
        circle(g, bx + Math.cos(a) * d, by - r * 0.15 + Math.sin(a) * d, r * (0.55 + rng() * 0.3)); g.fill();
      }
      g.fillStyle = 'rgba(200,255,180,.08)';
      circle(g, bx - r * 0.3, by - r * 0.45, r * 0.4); g.fill();
      return;
    }
    if (b.kind === 'crystal') {
      const cols = P.crystal || ['#b48bff'];
      g.save();
      g.shadowColor = cols[0]; g.shadowBlur = 18;
      for (let i = 0; i < 4; i++) {
        const a = -Math.PI / 2 + (i - 1.5) * 0.45, h = r * (1.6 - Math.abs(i - 1.5) * 0.35), w = r * 0.34;
        const tx = bx + Math.cos(a) * h, ty = by + Math.sin(a) * h;
        const nx = -Math.sin(a) * w, ny = Math.cos(a) * w;
        g.fillStyle = cols[i % cols.length];
        g.beginPath(); g.moveTo(bx + nx, by + ny); g.lineTo(tx, ty); g.lineTo(bx - nx, by - ny); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,.35)';
        g.beginPath(); g.moveTo(bx + nx * 0.2, by + ny * 0.2); g.lineTo(tx, ty); g.lineTo(bx - nx * 0.6, by - ny * 0.6); g.closePath(); g.fill();
      }
      g.restore();
      return;
    }
    if (b.kind === 'stalagmite') {
      g.fillStyle = 'rgba(0,0,0,.35)';
      g.beginPath(); g.ellipse(bx, by + r * 0.4, r, r * 0.4, 0, 0, Math.PI * 2); g.fill();
      for (const [ox, h, w] of [[-0.45, 1.3, 0.45], [0.35, 1.7, 0.55], [0, 2.1, 0.6]]) {
        const gr = g.createLinearGradient(bx + ox * r - w * r, 0, bx + ox * r + w * r, 0);
        gr.addColorStop(0, '#2a2638'); gr.addColorStop(0.5, '#4e4864'); gr.addColorStop(1, '#1c1a28');
        g.fillStyle = gr;
        g.beginPath(); g.moveTo(bx + ox * r - w * r, by + r * 0.4); g.lineTo(bx + ox * r, by + r * 0.4 - h * r); g.lineTo(bx + ox * r + w * r, by + r * 0.4); g.closePath(); g.fill();
      }
      return;
    }
    if (b.kind === 'boulder') {
      g.fillStyle = 'rgba(0,0,0,.35)';
      g.beginPath(); g.ellipse(bx + r * 0.2, by + r * 0.3, r * 1.05, r * 0.75, 0, 0, Math.PI * 2); g.fill();
      const gr = g.createRadialGradient(bx - r * 0.3, by - r * 0.4, r * 0.1, bx, by, r * 1.1);
      gr.addColorStop(0, '#8a8680'); gr.addColorStop(0.6, '#5a5650'); gr.addColorStop(1, '#2e2c2a');
      g.fillStyle = gr;
      g.beginPath(); g.ellipse(bx, by, r, r * 0.82, rng() * 0.6, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(20,18,16,.5)'; g.lineWidth = Math.max(1, r * 0.06);
      g.beginPath(); g.moveTo(bx - r * 0.2, by - r * 0.6); g.lineTo(bx, by - r * 0.1); g.lineTo(bx - r * 0.15, by + r * 0.4); g.stroke();
      return;
    }
    if (b.kind === 'pillar' || b.kind === 'keep') {
      const cols = P.stone || ['#3a343e', '#4a424e', '#2a2430'];
      g.fillStyle = 'rgba(0,0,0,.4)';
      g.beginPath(); g.ellipse(bx + r * 0.2, by + r * 0.3, r * 1.1, r * 0.8, 0, 0, Math.PI * 2); g.fill();
      if (b.kind === 'pillar') {
        g.fillStyle = cols[2]; circle(g, bx, by, r); g.fill();
        g.fillStyle = cols[1]; circle(g, bx, by - r * 0.15, r * 0.82); g.fill();
        g.strokeStyle = cols[0]; g.lineWidth = Math.max(1, r * 0.1); circle(g, bx, by - r * 0.15, r * 0.55); g.stroke();
        return;
      }
      const s = r * 1.05;
      g.fillStyle = cols[2]; g.fillRect(bx - s, by - s, s * 2, s * 2);
      g.fillStyle = cols[1]; g.fillRect(bx - s * 0.85, by - s * 0.85, s * 1.7, s * 1.7);
      g.fillStyle = cols[0];
      for (let i = 0; i < 4; i++) for (const [qx, qy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const t = -0.85 + i * 0.5;
        g.fillRect(bx + (qy === qx ? t : qx * 0.85) * s - s * 0.08, by + (qy === qx ? qy * 0.85 : t) * s - s * 0.08, s * 0.16, s * 0.16);
      }
      g.save();
      g.shadowColor = P.gate; g.shadowBlur = 22;
      g.fillStyle = 'rgba(255,106,138,.75)';
      circle(g, bx, by, s * 0.35); g.fill();
      g.restore();
      return;
    }
    g.fillStyle = P.rock; circle(g, bx, by, r); g.fill();
  }

  function drawBridges(g, map, P, sc) {
    const cols = P.bridge || ['#5a4430', '#7a5c40', '#3a2a1c'];
    for (const R of map.route) {
      for (const c of C.crossings(R)) {
        const L = map.half + 34, Wd = map.half + 6;
        const ax = c.tx, ay = c.ty, nx = -ay, ny = ax;
        const corner = (u, v) => [c.x + ax * u + nx * v, c.y + ay * u + ny * v];
        g.save();
        g.fillStyle = 'rgba(0,0,0,.45)';
        worldPoly(g, [corner(-L, -Wd - 10), corner(L, -Wd - 10), corner(L, Wd + 10), corner(-L, Wd + 10)]); g.fill();
        g.fillStyle = cols[0];
        worldPoly(g, [corner(-L, -Wd), corner(L, -Wd), corner(L, Wd), corner(-L, Wd)]); g.fill();
        g.strokeStyle = cols[2]; g.lineWidth = Math.max(1, 2 * sc);
        for (let u = -L + 6; u < L; u += 9) {
          const [x1, y1] = View.toScreen(...corner(u, -Wd)), [x2, y2] = View.toScreen(...corner(u, Wd));
          g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
        }
        g.strokeStyle = cols[1]; g.lineWidth = Math.max(2, 5 * sc);
        for (const v of [-Wd, Wd]) {
          const [x1, y1] = View.toScreen(...corner(-L, v)), [x2, y2] = View.toScreen(...corner(L, v));
          g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
          g.fillStyle = cols[2];
          for (let u = -L; u <= L; u += L / 2) { const [px, py] = View.toScreen(...corner(u, v)); circle(g, px, py, Math.max(2, 4.5 * sc)); g.fill(); }
        }
        g.restore();
      }
    }
  }

  function paintMap(g, cw, ch, map, mini) {
    const P = map.palette, D = map.decor;
    const sc = View.sc;
    const grd = g.createRadialGradient(cw * 0.5, ch * 0.45, 10, cw * 0.5, ch * 0.5, Math.max(cw, ch) * 0.8);
    grd.addColorStop(0, P.ground[0]); grd.addColorStop(0.55, P.ground[1]); grd.addColorStop(1, P.ground[2]);
    g.fillStyle = grd; g.fillRect(0, 0, cw, ch);
    const rng = C.mulberry(D.seed);
    const k = mini ? 0.25 : 1;
    g.lineWidth = 1;
    for (let i = 0; i < D.grass * k; i++) {
      const sx = rng() * cw, sy = rng() * ch;
      g.strokeStyle = P.grass[rng() < 0.5 ? 0 : 1];
      g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx - 2, sy - 5 * Math.max(0.6, sc)); g.moveTo(sx, sy); g.lineTo(sx + 2, sy - 4 * Math.max(0.6, sc)); g.stroke();
    }
    g.globalAlpha = 0.45;
    for (let i = 0; i < D.flowers; i++) {
      const sx = rng() * cw, sy = rng() * ch;
      g.fillStyle = P.flowers[i % P.flowers.length];
      g.beginPath(); g.arc(sx, sy, mini ? 0.8 : 1.6, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
    for (let i = 0; i < D.rocks; i++) {
      const sx = rng() * cw, sy = rng() * ch, rr = (4 + rng() * 6) * Math.max(mini ? 0.2 : 0.5, sc);
      g.fillStyle = P.rock;
      g.beginPath(); g.ellipse(sx, sy, rr, rr * 0.7, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,.06)';
      g.beginPath(); g.ellipse(sx - rr * 0.2, sy - rr * 0.2, rr * 0.5, rr * 0.3, 0, 0, Math.PI * 2); g.fill();
    }
    const half = map.half * sc;
    g.lineJoin = 'round'; g.lineCap = 'butt';
    for (const R of map.route) {
      const pts = routeScreen(R);
      g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = half * 2 + 8 * Math.min(1, sc * 2); strokePath(g, pts);
    }
    for (const R of map.route) {
      const pts = routeScreen(R);
      g.strokeStyle = P.roadEdge; g.lineWidth = half * 2 + 3 * Math.min(1, sc * 2); strokePath(g, pts);
      g.strokeStyle = P.road[0]; g.lineWidth = half * 2; strokePath(g, pts);
    }
    for (const R of map.route) {
      const pts = routeScreen(R);
      g.strokeStyle = P.road[1]; g.lineWidth = half * 1.1; g.globalAlpha = 0.8; strokePath(g, pts); g.globalAlpha = 1;
      if (P.stone) {
        g.strokeStyle = 'rgba(10,8,12,.35)'; g.lineWidth = half * 2; g.setLineDash([Math.max(1, 1.5 * sc), Math.max(3, 14 * sc)]); strokePath(g, pts); g.setLineDash([]);
        g.strokeStyle = 'rgba(255,220,235,.05)'; g.lineWidth = half * 1.6; g.setLineDash([Math.max(2, 10 * sc), Math.max(2, 6 * sc)]); strokePath(g, pts); g.setLineDash([]);
      } else if (!mini) {
        g.strokeStyle = P.roadLine; g.lineWidth = 2; g.setLineDash([10, 14]); strokePath(g, pts); g.setLineDash([]);
      }
      if (!mini) {
        g.fillStyle = P.pebble;
        const nPeb = Math.round(R.len / 12);
        for (let i = 0; i < nPeb; i++) {
          C.routePos(R, rng() * R.len, tmpPos);
          const o = (rng() - 0.5) * map.half * 1.8;
          const [sx, sy] = View.toScreen(tmpPos.x - tmpPos.ty * o, tmpPos.y + tmpPos.tx * o);
          g.beginPath(); g.arc(sx, sy, 1 + rng() * 1.8, 0, Math.PI * 2); g.fill();
        }
      }
    }
    drawBridges(g, map, P, sc);
    const starts = new Set();
    for (const R of map.route) {
      const s0 = R.segs[0];
      const key = s0.x1 + ',' + s0.y1;
      if (!starts.has(key)) {
        starts.add(key);
        g.fillStyle = P.tree;
        for (let i = 0; i < D.trees; i++) {
          const o = (i - (D.trees - 1) / 2) * map.half * 0.6;
          const along = 30 + rng() * 20;
          const [tx, ty] = View.toScreen(s0.x1 + s0.tx * along - s0.ty * o, s0.y1 + s0.ty * along + s0.tx * o);
          g.beginPath(); g.moveTo(tx, ty - 30 * sc - 10 * k); g.lineTo(tx - 12 * sc - 6 * k, ty + 10 * k); g.lineTo(tx + 12 * sc + 6 * k, ty + 10 * k); g.closePath(); g.fill();
        }
        if (map.route.length > 1 && !mini) {
          g.save();
          g.shadowColor = '#ff4a4a'; g.shadowBlur = 16; g.fillStyle = 'rgba(255,90,90,.55)';
          const [gx, gy] = View.toScreen(Math.max(14, Math.min(C.WORLD.L - 14, s0.x1 + s0.tx * 60)), s0.y1 + s0.ty * 60);
          circle(g, gx, gy, Math.max(3, 6 * sc)); g.fill();
          g.restore();
        }
      }
      const sl = R.segs[R.segs.length - 1];
      const ex = Math.min(C.WORLD.L - 14, sl.x2), ey = sl.y2;
      g.save();
      g.shadowColor = P.gate; g.shadowBlur = mini ? 8 : 24;
      g.fillStyle = 'rgba(227,193,91,.75)';
      for (const s of [-1, 1]) {
        const o = s * (map.half + 16);
        const [lx, ly] = View.toScreen(ex - sl.ty * o, ey + sl.tx * o);
        g.beginPath(); g.arc(lx, ly, Math.max(mini ? 1.5 : 3, 7 * sc), 0, Math.PI * 2); g.fill();
      }
      g.restore();
    }
    const brng = C.mulberry(D.seed + 7);
    const blocks = map.blocks.slice().sort((a, b) => View.toScreen(a.x, a.y)[1] - View.toScreen(b.x, b.y)[1]);
    for (const b of blocks) drawBlock(g, b, P, sc, brng);
    if (map.dark) {
      const c = document.createElement('canvas');
      c.width = g.canvas.width; c.height = g.canvas.height;
      const d = c.getContext('2d');
      d.setTransform(g.getTransform());
      d.fillStyle = 'rgba(4,2,12,.55)'; d.fillRect(0, 0, cw, ch);
      d.globalCompositeOperation = 'destination-out';
      for (const q of map.crystals) {
        const [qx, qy] = View.toScreen(q.x, q.y);
        const rr = q.r * sc;
        const gr = d.createRadialGradient(qx, qy, rr * 0.2, qx, qy, rr);
        gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.8, 'rgba(0,0,0,.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        d.fillStyle = gr; circle(d, qx, qy, rr); d.fill();
      }
      g.save();
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.drawImage(c, 0, 0);
      g.restore();
      const cols = P.crystal || ['#b48bff'];
      map.crystals.forEach((q, i) => {
        const [qx, qy] = View.toScreen(q.x, q.y);
        const rr = q.r * sc;
        g.save();
        g.globalAlpha = 0.16;
        const gr = g.createRadialGradient(qx, qy, 0, qx, qy, rr);
        gr.addColorStop(0, cols[i % cols.length]); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; circle(g, qx, qy, rr); g.fill();
        g.globalAlpha = 0.35; g.strokeStyle = cols[i % cols.length]; g.lineWidth = 1; g.setLineDash([3, 7]);
        circle(g, qx, qy, rr); g.stroke();
        g.restore();
      });
    }
  }

  function drawWind(ctx, run, now, cw, ch) {
    const w = run.map.wind;
    if (!w) return;
    const sc = View.sc;
    const a = run.gustOn ? run.gust : run.gustWarn * 0.25;
    if (a > 0.01) {
      ctx.save();
      ctx.strokeStyle = 'rgba(220,235,255,1)'; ctx.lineCap = 'round';
      const back = run.gustKind === 'back';
      const dx = back ? -1 : 0, dy = back ? 0 : run.gustDir;
      const rng = C.mulberry(77);
      const t = now / 1000;
      for (let i = 0; i < 46; i++) {
        const spd = 260 + rng() * 260;
        const len = 40 + rng() * 60;
        let x = rng() * C.WORLD.L, y = rng() * C.WORLD.W;
        if (back) x = (((x - t * spd) % C.WORLD.L) + C.WORLD.L) % C.WORLD.L;
        else y = (((y + dy * t * spd) % C.WORLD.W) + C.WORLD.W) % C.WORLD.W;
        const [x1, y1] = View.toScreen(x, y), [x2, y2] = View.toScreen(x - dx * len, y - dy * len);
        ctx.globalAlpha = a * (0.25 + rng() * 0.35);
        ctx.lineWidth = Math.max(1, (1 + rng() * 1.5) * sc * 1.4);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      }
      ctx.restore();
    }
    const gx = 10, gy = ch - 52, gw = 150;
    ctx.save();
    ctx.fillStyle = 'rgba(12,10,20,.75)';
    ctx.fillRect(gx - 4, gy - 16, gw + 8, 28);
    ctx.font = '700 11px system-ui, sans-serif'; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    const c = run.windT % w.every;
    const frac = run.gustOn ? 1 : Math.min(1, c / (w.every - w.dur));
    const arrow = run.gustKind === 'back' ? (View.portrait ? '↑' : '←') : ((run.gustDir > 0) === View.portrait ? (View.portrait ? '→' : '↓') : (View.portrait ? '←' : '↑'));
    let label = 'Wind calm';
    if (run.gustOn) label = 'GUST ' + arrow + ' flyers pushed ' + (run.gustKind === 'back' ? 'back' : 'aside');
    else if (run.gustWarn > 0) label = 'Gust incoming ' + arrow;
    ctx.fillStyle = run.gustOn ? '#bfe8ff' : run.gustWarn > 0 ? '#ffd27a' : 'rgba(243,240,251,.7)';
    ctx.fillText(label, gx, gy - 3);
    ctx.fillStyle = '#1e2430'; ctx.fillRect(gx, gy + 1, gw, 5);
    ctx.fillStyle = run.gustOn ? '#bfe8ff' : run.gustWarn > 0 ? '#ffd27a' : '#6a8aa8';
    ctx.fillRect(gx, gy + 1, gw * frac, 5);
    ctx.restore();
  }

  function underBridge(map, e) {
    if (e.flying || !map.bridges) return false;
    for (const b of map.bridges) if (b.route === e.path && Math.abs(e.d - b.dUnder) < map.half + 40) return true;
    return false;
  }
  for (const id of C.MAP_IDS) {
    const m = C.MAPS[id], list = [];
    m.route.forEach((R, ri) => { for (const c of C.crossings(R)) list.push({ route: ri, dUnder: c.dUnder }); });
    m.bridges = list.length ? list : null;
  }

  const Render = {
    View, drawPony, drawDNB, shade, drawRange,
    bg: null, bgKey: '', shakeT: 0, shakeAmp: 0, bossBar: false,
    ponyOpts(race, t) {
      const R = C.RACES[race];
      return { body: R.body, mane: R.mane, horn: race === 'unicorn', wings: race === 'pegasus', glow: R.accent, mark: R.accent, seed: t ? t.id : 0 };
    },
    kick(amp, dur) { this.shakeAmp = Math.max(this.shakeAmp, amp); this.shakeT = Math.max(this.shakeT, dur || 0.6); },
    dnbIcon(c, type, bossDef, now) {
      const g = c.getContext('2d');
      const d = C.ENEMIES[type];
      g.clearRect(0, 0, c.width, c.height);
      const e = {
        type, hit: 0, seed: 1, burrowT: 0, flying: !!d.flying, magical: !!d.magical, boss: type === 'boss', noBar: true,
        color: bossDef ? bossDef.color : d.color, dark: bossDef ? bossDef.dark : d.dark, hp: 1, hpMax: 1, stunT: 0, slow: 0, hexT: 0, dispelT: 0,
      };
      if (bossDef) {
        e.bossDef = bossDef;
        const tr = bossDef.tricks ? Object.keys(bossDef.tricks) : [bossDef.trick];
        if (tr.includes('flying') || tr.includes('fly') || tr.includes('phase')) e.flying = true;
        if (tr.includes('magical') || tr.includes('magic')) e.magical = true;
        if (tr.includes('armor')) e.armor = true;
      }
      drawDNB(g, e, c.width / 2, c.height * 0.6, c.width * 0.26, now || 0);
    },
    buildBg(cw, ch, dpr, map) {
      map = map || C.getMap('moonlit');
      const key = cw + 'x' + ch + 'x' + dpr + (View.portrait ? 'p' : 'l') + map.id;
      if (this.bgKey === key) return;
      this.bgKey = key;
      const mk = () => { const c = document.createElement('canvas'); c.width = Math.round(cw * dpr); c.height = Math.round(ch * dpr); const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); return [c, g]; };
      const [c, g] = mk();
      paintMap(g, cw, ch, map, false);
      this.bg = c;
      this.bridgeImg = null;
      if (map.bridges) { const [c2, g2] = mk(); drawBridges(g2, map, map.palette, View.sc); this.bridgeImg = c2; }
    },
    drawMapPreview(canvas, map) {
      const keep = { portrait: View.portrait, sc: View.sc, ox: View.ox, oy: View.oy, cw: View.cw, ch: View.ch };
      View.portrait = false;
      const along = canvas.width, across = canvas.height;
      View.sc = Math.min(along / W.L, across / W.W);
      View.ox = (canvas.width - W.L * View.sc) / 2; View.oy = (canvas.height - W.W * View.sc) / 2;
      const g = canvas.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, canvas.width, canvas.height);
      paintMap(g, canvas.width, canvas.height, map, true);
      Object.assign(View, keep);
    },
    drawScene(ctx, S, ui, now, dt, cw, ch, dpr) {
      const W = C.WORLD, sc = View.sc;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#0b0a13'; ctx.fillRect(0, 0, cw, ch);
      let shook = false;
      if (this.shakeT > 0) {
        this.shakeT -= dt;
        const a = this.shakeAmp * Math.min(1, this.shakeT / 0.4);
        ctx.translate((Math.random() - 0.5) * 2 * a, (Math.random() - 0.5) * 2 * a);
        shook = true;
        if (this.shakeT <= 0) this.shakeAmp = 0;
      }
      if (this.bg) ctx.drawImage(this.bg, 0, 0, cw, ch);
      const sel = ui.sel;
      if (ui.showAll) for (const t of S.towers) if (t !== sel) { const st = C.stats(t); drawRange(ctx, t.x, t.y, st.range, true, true, st.baseRange); }
      if (sel) { const st = C.stats(sel); drawRange(ctx, sel.x, sel.y, st.range, true, false, st.baseRange); }
      if (ui.placing && ui.ghost) {
        const ok = C.canPlace(S, ui.ghost.x, ui.ghost.y) && S.cash >= C.nextTowerCost(S, ui.placing);
        const br = C.RACES[ui.placing].range, lr = C.lightAt(C.mapOf(S), ui.ghost.x, ui.ghost.y);
        drawRange(ctx, ui.ghost.x, ui.ghost.y, br * lr, ok, false, lr < 1 ? br : 0);
      }
      if (ui.placing) {
        ctx.strokeStyle = 'rgba(227,91,106,.25)'; ctx.lineWidth = 1;
        for (const t of S.towers) { const [tx, ty] = View.toScreen(t.x, t.y); circle(ctx, tx, ty, W.minGap * sc); ctx.stroke(); }
      }
      const list = S.towers.slice().sort((a, b) => View.toScreen(a.x, a.y)[1] - View.toScreen(b.x, b.y)[1]);
      for (const t of list) {
        const [sx, sy] = View.toScreen(t.x, t.y);
        const ring = C.chosenPaths(t).reduce((a, i) => a + t.paths[i], 0);
        if (t === sel) { ctx.strokeStyle = '#4fd1c5'; ctx.lineWidth = 2; circle(ctx, sx, sy, W.towerR * sc * 1.25); ctx.stroke(); }
        if (t.id === ui.hoverId && t !== sel) { ctx.strokeStyle = 'rgba(79,209,197,.45)'; ctx.lineWidth = 1.5; circle(ctx, sx, sy, W.towerR * sc * 1.25); ctx.stroke(); }
        if (ring >= 10) { ctx.strokeStyle = ring >= 20 ? 'rgba(227,193,91,.7)' : 'rgba(169,139,255,.5)'; ctx.lineWidth = 1.5; circle(ctx, sx, sy + W.towerR * sc * 0.45, W.towerR * sc * 0.9); ctx.stroke(); }
        drawPony(ctx, sx, sy, W.towerR * 2.3 * sc, Object.assign(this.ponyOpts(t.race, t), { angle: View.angle(t.face), now, hop: t.anim > 0 ? Math.min(1, t.anim * 4) : 0 }));
      }
      if (S.run) {
        const es = S.run.enemies.slice().sort((a, b) => a.y - b.y);
        const m = S.run.map;
        if (this.bridgeImg && m.bridges) {
          for (const e of es) if (underBridge(m, e)) { const [sx, sy] = View.toScreen(e.x, e.y); drawDNB(ctx, e, sx, sy, e.r * sc, now); }
          ctx.drawImage(this.bridgeImg, 0, 0, cw, ch);
          for (const e of es) if (!underBridge(m, e)) { const [sx, sy] = View.toScreen(e.x, e.y); drawDNB(ctx, e, sx, sy, e.r * sc, now); }
        } else for (const e of es) { const [sx, sy] = View.toScreen(e.x, e.y); drawDNB(ctx, e, sx, sy, e.r * sc, now); }
        for (const p of S.run.proj) drawProj(ctx, p, sc);
      }
      for (const f of S.fx) drawFx(ctx, S, f);
      if (ui.placing && ui.ghost) {
        const [sx, sy] = View.toScreen(ui.ghost.x, ui.ghost.y);
        ctx.save(); ctx.globalAlpha = 0.6;
        drawPony(ctx, sx, sy, W.towerR * 2.3 * sc, Object.assign(this.ponyOpts(ui.placing), { angle: View.angle(C.faceRoad(C.mapOf(S), ui.ghost.x, ui.ghost.y)), now }));
        ctx.restore();
      }
      if (shook) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (S.run && S.run.map.wind) drawWind(ctx, S.run, now, cw, ch);
      this.bossBar = S.run ? drawBossBar(ctx, S, cw) : false;
      if (S.run) {
        ctx.save();
        ctx.font = '700 13px system-ui'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = 'rgba(243,240,251,.85)';
        ctx.fillText('Lives ' + Math.max(0, S.run.lives) + ' / ' + C.LIVES + '   +' + C.fmt(S.run.earned) + ' this wave', 10, ch - 12);
        ctx.restore();
      }
      if (ui.paused) {
        ctx.save();
        ctx.fillStyle = 'rgba(8,6,16,.35)'; ctx.fillRect(0, 0, cw, ch);
        ctx.font = '800 22px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(243,240,251,.9)';
        ctx.fillText('Paused', cw / 2, ch / 2);
        ctx.restore();
      }
    },
  };
  window.NDRender = Render;
})();
