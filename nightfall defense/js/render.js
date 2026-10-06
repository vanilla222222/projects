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

  function drawRange(ctx, x, y, range, ok, faint) {
    const [sx, sy] = View.toScreen(x, y);
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
      if (bossDef) { if (bossDef.trick === 'flying' || bossDef.trick === 'phase') e.flying = true; if (bossDef.trick === 'magical') e.magical = true; if (bossDef.trick === 'armor') e.armor = true; }
      drawDNB(g, e, c.width / 2, c.height * 0.6, c.width * 0.26, now || 0);
    },
    buildBg(cw, ch, dpr, map) {
      map = map || C.getMap('moonlit');
      const key = cw + 'x' + ch + 'x' + dpr + (View.portrait ? 'p' : 'l') + map.id;
      if (this.bgKey === key) return;
      this.bgKey = key;
      const P = map.palette, D = map.decor;
      const c = document.createElement('canvas');
      c.width = Math.round(cw * dpr); c.height = Math.round(ch * dpr);
      const g = c.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const grd = g.createRadialGradient(cw * 0.5, ch * 0.45, 10, cw * 0.5, ch * 0.5, Math.max(cw, ch) * 0.8);
      grd.addColorStop(0, P.ground[0]); grd.addColorStop(0.55, P.ground[1]); grd.addColorStop(1, P.ground[2]);
      g.fillStyle = grd; g.fillRect(0, 0, cw, ch);
      const rng = C.mulberry(D.seed);
      const sc = View.sc;
      g.lineWidth = 1;
      for (let i = 0; i < D.grass; i++) {
        const sx = rng() * cw, sy = rng() * ch;
        g.strokeStyle = P.grass[rng() < 0.5 ? 0 : 1];
        g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx - 2, sy - 5 * Math.max(0.6, sc)); g.moveTo(sx, sy); g.lineTo(sx + 2, sy - 4 * Math.max(0.6, sc)); g.stroke();
      }
      g.globalAlpha = 0.45;
      for (let i = 0; i < D.flowers; i++) {
        const sx = rng() * cw, sy = rng() * ch;
        g.fillStyle = P.flowers[i % P.flowers.length];
        g.beginPath(); g.arc(sx, sy, 1.6, 0, Math.PI * 2); g.fill();
      }
      g.globalAlpha = 1;
      for (let i = 0; i < D.rocks; i++) {
        const sx = rng() * cw, sy = rng() * ch, rr = (4 + rng() * 6) * Math.max(0.5, sc);
        g.fillStyle = P.rock;
        g.beginPath(); g.ellipse(sx, sy, rr, rr * 0.7, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(255,255,255,.06)';
        g.beginPath(); g.ellipse(sx - rr * 0.2, sy - rr * 0.2, rr * 0.5, rr * 0.3, 0, 0, Math.PI * 2); g.fill();
      }
      for (const b of map.blocks) {
        const [bx, by] = View.toScreen(b.x, b.y);
        g.fillStyle = P.rock; circle(g, bx, by, b.r * sc); g.fill();
      }
      const half = map.half * sc;
      g.lineJoin = 'round'; g.lineCap = 'butt';
      for (const R of map.route) {
        const pts = routeScreen(R);
        g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = half * 2 + 8; strokePath(g, pts);
        g.strokeStyle = P.roadEdge; g.lineWidth = half * 2 + 3; strokePath(g, pts);
        g.strokeStyle = P.road[0]; g.lineWidth = half * 2; strokePath(g, pts);
        g.strokeStyle = P.road[1]; g.lineWidth = half * 1.1; g.globalAlpha = 0.8; strokePath(g, pts); g.globalAlpha = 1;
        g.strokeStyle = P.roadLine; g.lineWidth = 2; g.setLineDash([10, 14]); strokePath(g, pts); g.setLineDash([]);
        g.fillStyle = P.pebble;
        const nPeb = Math.round(R.len / 12);
        for (let i = 0; i < nPeb; i++) {
          C.routePos(R, rng() * R.len, tmpPos);
          const o = (rng() - 0.5) * map.half * 1.8;
          const [sx, sy] = View.toScreen(tmpPos.x - tmpPos.ty * o, tmpPos.y + tmpPos.tx * o);
          g.beginPath(); g.arc(sx, sy, 1 + rng() * 1.8, 0, Math.PI * 2); g.fill();
        }
        const s0 = R.segs[0];
        g.fillStyle = P.tree;
        for (let i = 0; i < D.trees; i++) {
          const o = (i - (D.trees - 1) / 2) * map.half * 0.6;
          const along = 30 + rng() * 20;
          const [tx, ty] = View.toScreen(s0.x1 + s0.tx * along - s0.ty * o, s0.y1 + s0.ty * along + s0.tx * o);
          g.beginPath(); g.moveTo(tx, ty - 30 * sc - 10); g.lineTo(tx - 12 * sc - 6, ty + 10); g.lineTo(tx + 12 * sc + 6, ty + 10); g.closePath(); g.fill();
        }
        const sl = R.segs[R.segs.length - 1];
        const ex = Math.min(C.WORLD.L - 14, sl.x2), ey = sl.y2;
        g.save();
        g.shadowColor = P.gate; g.shadowBlur = 24;
        g.fillStyle = 'rgba(227,193,91,.75)';
        for (const s of [-1, 1]) {
          const o = s * (map.half + 16);
          const [lx, ly] = View.toScreen(ex - sl.ty * o, ey + sl.tx * o);
          g.beginPath(); g.arc(lx, ly, Math.max(3, 7 * sc), 0, Math.PI * 2); g.fill();
        }
        g.restore();
      }
      this.bg = c;
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
      if (ui.showAll) for (const t of S.towers) if (t !== sel) drawRange(ctx, t.x, t.y, C.stats(t).range, true, true);
      if (sel) drawRange(ctx, sel.x, sel.y, C.stats(sel).range, true);
      if (ui.placing && ui.ghost) {
        const ok = C.canPlace(S, ui.ghost.x, ui.ghost.y) && S.cash >= C.nextTowerCost(S, ui.placing);
        drawRange(ctx, ui.ghost.x, ui.ghost.y, C.RACES[ui.placing].range, ok);
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
        for (const e of es) { const [sx, sy] = View.toScreen(e.x, e.y); drawDNB(ctx, e, sx, sy, e.r * sc, now); }
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
