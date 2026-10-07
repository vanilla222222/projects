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

  const Cos = { looks: {}, fx: {}, names: true, season: '' };
  const SPR = new Map();
  function sprite(key, w, h, draw) {
    let c = SPR.get(key);
    if (c) return c;
    if (SPR.size > 700) SPR.clear();
    c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
    draw(c.getContext('2d'), c.width, c.height);
    SPR.set(key, c);
    return c;
  }
  function hexRgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map(x => x + x).join('');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function mixHex(a, b, t) {
    if (typeof a !== 'string' || a[0] !== '#' || typeof b !== 'string' || b[0] !== '#') return a;
    const x = hexRgb(a), y = hexRgb(b);
    return '#' + x.map((v, i) => Math.max(0, Math.min(255, Math.round(v + (y[i] - v) * t))).toString(16).padStart(2, '0')).join('');
  }
  function rgba(hex, a) { if (typeof hex !== 'string' || hex[0] !== '#') return hex; const c = hexRgb(hex); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function hue(now, off, l) { return 'hsl(' + Math.round(((now / 8 + off) % 360 + 360) % 360) + ',85%,' + (l || 66) + '%)'; }
  function frac(x) { return x - Math.floor(x); }
  function hsh(n) { return frac(Math.sin(n * 127.1 + 311.7) * 43758.5453); }
  const RAINBOW = ['#ff6b6b', '#ffb36b', '#ffe66b', '#7fd66a', '#6bb8ff', '#8b8bff', '#d68bff'];
  function glyph(kind, col) {
    return sprite('g|' + kind + '|' + col, 48, 48, (g, w, h) => {
      const cx = w / 2, cy = h / 2;
      if (kind === 'heart') {
        g.fillStyle = col; g.shadowColor = col; g.shadowBlur = 6;
        g.beginPath(); g.moveTo(cx, cy + 13);
        g.bezierCurveTo(cx - 19, cy - 1, cx - 10, cy - 17, cx, cy - 6);
        g.bezierCurveTo(cx + 10, cy - 17, cx + 19, cy - 1, cx, cy + 13);
        g.fill();
        g.shadowBlur = 0; g.fillStyle = 'rgba(255,255,255,.6)';
        g.beginPath(); g.arc(cx - 6, cy - 5, 3, 0, Math.PI * 2); g.fill();
      } else if (kind === 'spark') {
        g.fillStyle = col; g.shadowColor = col; g.shadowBlur = 8;
        g.beginPath();
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2, r = i % 2 ? 4 : 17; if (i) g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); else g.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
        g.closePath(); g.fill();
        g.shadowBlur = 0; g.fillStyle = '#fff'; g.beginPath(); g.arc(cx, cy, 3, 0, Math.PI * 2); g.fill();
      } else if (kind === 'flake') {
        g.strokeStyle = col; g.lineWidth = 2.6; g.lineCap = 'round'; g.shadowColor = col; g.shadowBlur = 5;
        g.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = i * Math.PI / 3, mx = cx + Math.cos(a) * 9, my = cy + Math.sin(a) * 9;
          g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * 16, cy + Math.sin(a) * 16);
          g.moveTo(mx, my); g.lineTo(mx + Math.cos(a + 0.8) * 5, my + Math.sin(a + 0.8) * 5);
          g.moveTo(mx, my); g.lineTo(mx + Math.cos(a - 0.8) * 5, my + Math.sin(a - 0.8) * 5);
        }
        g.stroke();
      } else if (kind === 'puff') {
        const gr = g.createRadialGradient(cx, cy, 0, cx, cy, 23);
        gr.addColorStop(0, rgba(col, 0.75)); gr.addColorStop(0.6, rgba(col, 0.35)); gr.addColorStop(1, rgba(col, 0));
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
      } else {
        const gr = g.createRadialGradient(cx, cy, 0, cx, cy, 23);
        gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.22, col); gr.addColorStop(0.5, rgba(col, 0.35)); gr.addColorStop(1, rgba(col, 0));
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
      }
    });
  }
  function blit(ctx, img, x, y, s, a) {
    if (a <= 0.01 || s <= 0.5) return;
    const ga = ctx.globalAlpha;
    ctx.globalAlpha = ga * Math.min(1, a);
    ctx.drawImage(img, x - s / 2, y - s / 2, s, s);
    ctx.globalAlpha = ga;
  }
  function drawAura(ctx, kind, col, x, y, size, now, seed, angle, front) {
    const t = now / 1000, s = (seed || 0) * 0.6180339;
    if (kind === 'halo') {
      if (!front) return;
      const hx = x + Math.cos(angle) * size * 0.4, hy = y + Math.sin(angle) * size * 0.4 - size * 0.67 + Math.sin(t * 2 + s) * size * 0.03;
      ctx.save();
      ctx.strokeStyle = rgba(col, 0.3); ctx.lineWidth = size * 0.11;
      ctx.beginPath(); ctx.ellipse(hx, hy, size * 0.22, size * 0.07, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, size * 0.035); ctx.stroke();
      ctx.restore();
      blit(ctx, glyph('spark', '#ffffff'), hx + Math.cos(t * 3 + s) * size * 0.22, hy + Math.sin(t * 3 + s) * size * 0.07, size * 0.24, 0.85);
      return;
    }
    if (kind === 'rainbow' || kind === 'wisps') {
      const rain = kind === 'rainbow', n = rain ? 1 : 3, m = rain ? 9 : 4;
      for (let i = 0; i < n; i++) {
        const a0 = t * (rain ? 2.2 : 1.6) + i * 2.094 + s;
        for (let j = 0; j < m; j++) {
          const aa = a0 - j * (rain ? 0.17 : 0.24);
          if ((Math.sin(aa) > 0) !== front) continue;
          const px = x + Math.cos(aa) * size * (rain ? 0.72 : 0.62), py = y + size * (rain ? 0.06 : 0.24) + Math.sin(aa) * size * (rain ? 0.32 : 0.2);
          blit(ctx, glyph('dot', rain ? RAINBOW[j % RAINBOW.length] : col), px, py, size * ((rain ? 0.34 : 0.26) - j * (rain ? 0.022 : 0.04)), (1 - j / m) * 0.95);
        }
      }
      return;
    }
    if (!front) return;
    if (kind === 'hearts') {
      const img = glyph('heart', col);
      for (let i = 0; i < 4; i++) {
        const ph = frac(t * 0.45 + i / 4 + s);
        blit(ctx, img, x + Math.sin(i * 2.4 + s * 7 + ph * 3) * size * 0.42, y + size * 0.1 - ph * size * 0.95, size * (0.2 + 0.08 * ph), Math.sin(ph * Math.PI));
      }
    } else if (kind === 'sparkle') {
      const img = glyph('spark', col);
      for (let i = 0; i < 5; i++) {
        const cyc = t * 0.7 + i / 5 + s, ph = frac(cyc), k = Math.floor(cyc);
        const ang = hsh(k * 13 + i) * Math.PI * 2, r = size * (0.35 + 0.3 * hsh(k * 7 + i + 3)), q = Math.sin(ph * Math.PI);
        blit(ctx, img, x + Math.cos(ang) * r, y - size * 0.05 + Math.sin(ang) * r * 0.75, size * 0.28 * (0.5 + 0.5 * q), q * q);
      }
    } else if (kind === 'embers') {
      const img = glyph('dot', col);
      for (let i = 0; i < 6; i++) {
        const ph = frac(t * 0.8 + i / 6 + s);
        blit(ctx, img, x + (hsh(i + seed) - 0.5) * size * 0.9 + Math.sin(t * 4 + i) * size * 0.06, y + size * 0.25 - ph * size * 1.1, size * 0.2 * (1 - ph * 0.5), (1 - ph) * Math.min(1, ph * 5));
      }
    } else if (kind === 'snow') {
      const img = glyph('flake', col);
      for (let i = 0; i < 6; i++) {
        const ph = frac(t * 0.35 + i / 6 + s);
        blit(ctx, img, x + (hsh(i * 3 + seed) - 0.5) * size * 1.1 + Math.sin(t * 1.5 + i) * size * 0.08, y - size * 0.75 + ph * size * 1.2, size * 0.2, Math.sin(ph * Math.PI) * 0.9);
      }
    } else if (kind === 'fireflies') {
      const img = glyph('dot', col);
      for (let i = 0; i < 4; i++) {
        blit(ctx, img, x + Math.sin(t * (0.7 + i * 0.13) + i * 2 + s) * size * 0.65, y - size * 0.1 + Math.sin(t * (1.1 + i * 0.17) + i) * size * 0.4, size * 0.24, 0.35 + 0.65 * Math.max(0, Math.sin(t * 3 + i * 1.7)));
      }
    }
  }
  function hatSprite(kind, col, size) {
    const b = Math.max(8, Math.round(size / 4) * 4);
    return sprite('h|' + kind + '|' + col + '|' + b, b * 1.8, b * 1.8, (g, w, h) => {
      const S = b * 2, bx = w / 2, by = h * 0.86;
      g.lineJoin = 'round'; g.lineCap = 'round';
      if (kind === 'tophat') {
        g.fillStyle = shade(col, -0.2);
        g.beginPath(); g.ellipse(bx, by, S * 0.25, S * 0.065, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = col; g.fillRect(bx - S * 0.14, by - S * 0.36, S * 0.28, S * 0.35);
        g.beginPath(); g.ellipse(bx, by - S * 0.36, S * 0.14, S * 0.04, 0, 0, Math.PI * 2); g.fillStyle = shade(col, 0.15); g.fill();
        g.fillStyle = '#e35b6a'; g.fillRect(bx - S * 0.14, by - S * 0.11, S * 0.28, S * 0.06);
        g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(bx - S * 0.1, by - S * 0.34, S * 0.04, S * 0.3);
      } else if (kind === 'witch') {
        g.fillStyle = shade(col, -0.25);
        g.beginPath(); g.ellipse(bx, by, S * 0.31, S * 0.075, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = col;
        g.beginPath(); g.moveTo(bx - S * 0.17, by - S * 0.02); g.quadraticCurveTo(bx - S * 0.06, by - S * 0.3, bx + S * 0.16, by - S * 0.58); g.quadraticCurveTo(bx + S * 0.04, by - S * 0.28, bx + S * 0.17, by - S * 0.02); g.closePath(); g.fill();
        g.fillStyle = '#ffd24a'; g.fillRect(bx - S * 0.165, by - S * 0.1, S * 0.33, S * 0.06);
        g.strokeStyle = '#7a5a1a'; g.lineWidth = S * 0.015; g.strokeRect(bx - S * 0.04, by - S * 0.105, S * 0.08, S * 0.07);
        g.fillStyle = '#c08bff'; g.beginPath(); g.arc(bx + S * 0.16, by - S * 0.58, S * 0.03, 0, Math.PI * 2); g.fill();
      } else if (kind === 'party') {
        g.save();
        g.beginPath(); g.moveTo(bx - S * 0.13, by); g.lineTo(bx + S * 0.13, by); g.lineTo(bx + S * 0.02, by - S * 0.46); g.closePath(); g.clip();
        g.fillStyle = col; g.fillRect(0, 0, w, h);
        g.fillStyle = '#fff2a8';
        for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(bx - S * 0.3, by - S * (0.04 + i * 0.12)); g.lineTo(bx + S * 0.3, by - S * (0.12 + i * 0.12)); g.lineTo(bx + S * 0.3, by - S * (0.16 + i * 0.12)); g.lineTo(bx - S * 0.3, by - S * (0.08 + i * 0.12)); g.closePath(); g.fill(); }
        g.restore();
        g.fillStyle = '#ff6bd0'; g.beginPath(); g.arc(bx + S * 0.02, by - S * 0.47, S * 0.05, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(bx + S * 0.005, by - S * 0.485, S * 0.018, 0, Math.PI * 2); g.fill();
      } else if (kind === 'crown') {
        g.fillStyle = col; g.shadowColor = col; g.shadowBlur = S * 0.05;
        g.beginPath(); g.moveTo(bx - S * 0.18, by);
        const pts = [[-0.18, -0.2], [-0.09, -0.1], [0, -0.26], [0.09, -0.1], [0.18, -0.2], [0.18, 0]];
        for (const p of pts) g.lineTo(bx + S * p[0], by + S * p[1]);
        g.closePath(); g.fill();
        g.shadowBlur = 0;
        g.fillStyle = shade(col, -0.25); g.fillRect(bx - S * 0.18, by - S * 0.05, S * 0.36, S * 0.05);
        g.fillStyle = '#e35b6a'; g.beginPath(); g.arc(bx, by - S * 0.1, S * 0.03, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#6bb8ff'; for (const s2 of [-1, 1]) { g.beginPath(); g.arc(bx + s2 * S * 0.11, by - S * 0.06, S * 0.022, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = '#fff'; for (const p of [[-0.18, -0.2], [0, -0.26], [0.18, -0.2]]) { g.beginPath(); g.arc(bx + S * p[0], by + S * p[1], S * 0.022, 0, Math.PI * 2); g.fill(); }
      } else if (kind === 'flowers') {
        const cols = [col, '#fff2a8', '#bfe8ff', '#ffb0c8', '#d6b8ff'];
        g.strokeStyle = '#5a9a4a'; g.lineWidth = S * 0.03;
        g.beginPath(); g.ellipse(bx, by - S * 0.04, S * 0.22, S * 0.07, 0, Math.PI, Math.PI * 2); g.stroke();
        for (let i = 0; i < 5; i++) {
          const a = Math.PI + (i + 0.5) / 5 * Math.PI, fx2 = bx + Math.cos(a) * S * 0.22, fy = by - S * 0.04 + Math.sin(a) * S * 0.07, r = S * 0.045;
          g.fillStyle = cols[i];
          for (let j = 0; j < 5; j++) { const pa = j * Math.PI * 0.4; g.beginPath(); g.arc(fx2 + Math.cos(pa) * r, fy + Math.sin(pa) * r, r * 0.75, 0, Math.PI * 2); g.fill(); }
          g.fillStyle = '#ffd24a'; g.beginPath(); g.arc(fx2, fy, r * 0.6, 0, Math.PI * 2); g.fill();
        }
      } else if (kind === 'laurel') {
        for (const s2 of [-1, 1]) {
          for (let i = 0; i < 5; i++) {
            const a = Math.PI * 1.5 + s2 * (0.35 + i * 0.28), lx = bx + Math.cos(a) * S * 0.2, ly = by - S * 0.02 + Math.sin(a) * S * 0.09;
            g.fillStyle = i % 2 ? col : shade(col, -0.2);
            g.beginPath(); g.ellipse(lx, ly, S * 0.06, S * 0.025, a + s2 * 1.2, 0, Math.PI * 2); g.fill();
          }
        }
        g.fillStyle = '#ffd24a'; g.beginPath(); g.arc(bx, by - S * 0.11, S * 0.025, 0, Math.PI * 2); g.fill();
      } else if (kind === 'bow') {
        const cx = bx + S * 0.13, cy = by - S * 0.08;
        g.fillStyle = col;
        for (const s2 of [-1, 1]) { g.beginPath(); g.moveTo(cx, cy); g.quadraticCurveTo(cx + s2 * S * 0.2, cy - S * 0.16, cx + s2 * S * 0.18, cy + S * 0.04); g.closePath(); g.fill(); }
        g.fillStyle = shade(col, -0.2);
        for (const s2 of [-1, 1]) { g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + s2 * S * 0.08, cy + S * 0.14); g.lineTo(cx + s2 * S * 0.03, cy + S * 0.13); g.closePath(); g.fill(); }
        g.fillStyle = shade(col, 0.2); g.beginPath(); g.arc(cx, cy, S * 0.04, 0, Math.PI * 2); g.fill();
      } else if (kind === 'lantern') {
        const lx = bx + S * 0.22, ly = by - S * 0.16;
        g.strokeStyle = '#6a4a2a'; g.lineWidth = S * 0.02;
        g.beginPath(); g.moveTo(bx + S * 0.05, by - S * 0.02); g.quadraticCurveTo(bx + S * 0.12, by - S * 0.42, lx, by - S * 0.36); g.lineTo(lx, ly - S * 0.08); g.stroke();
        g.shadowColor = col; g.shadowBlur = S * 0.12;
        g.fillStyle = col; g.beginPath(); g.ellipse(lx, ly, S * 0.07, S * 0.09, 0, 0, Math.PI * 2); g.fill();
        g.shadowBlur = 0;
        g.fillStyle = '#fff6d8'; g.beginPath(); g.ellipse(lx, ly, S * 0.03, S * 0.05, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#7a3a2a'; g.fillRect(lx - S * 0.04, ly - S * 0.1, S * 0.08, S * 0.025); g.fillRect(lx - S * 0.04, ly + S * 0.08, S * 0.08, S * 0.025);
      }
    });
  }
  const HATS = { tophat: 1, witch: 1, party: 1, crown: 1, flowers: 1, laurel: 1, bow: 1, lantern: 1 };
  function drawNeckAcc(ctx, kind, col, size, angle, now) {
    const nx = Math.cos(angle) * size * 0.24, ny = Math.sin(angle) * size * 0.24 + size * 0.02;
    if (kind === 'scarf') {
      const sway = Math.sin(now / 320) * size * 0.04, sd = Math.cos(angle) >= 0 ? -1 : 1;
      ctx.fillStyle = shade(col, -0.2);
      ctx.beginPath();
      ctx.moveTo(nx + sd * size * 0.12, ny);
      ctx.lineTo(nx + sd * size * 0.2 + sway, ny + size * 0.3);
      ctx.lineTo(nx + sd * size * 0.08 + sway, ny + size * 0.32);
      ctx.lineTo(nx + sd * size * 0.03, ny + size * 0.02);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.ellipse(nx, ny, size * 0.25, size * 0.1, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = shade(col, 0.35); ctx.lineWidth = Math.max(1, size * 0.025);
      ctx.beginPath(); ctx.ellipse(nx, ny, size * 0.25, size * 0.1, 0, 0.2, Math.PI - 0.2); ctx.stroke();
      ctx.fillStyle = '#fff6e8';
      for (let i = 0; i < 3; i++) ctx.fillRect(nx + sd * size * (0.11 + 0.03 * i) + sway * (i / 3), ny + size * 0.3, size * 0.015, size * 0.05);
    } else if (kind === 'bandana') {
      const fx2 = Math.cos(angle) * size * 0.08;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(nx - size * 0.24, ny - size * 0.04);
      ctx.quadraticCurveTo(nx, ny + size * 0.06, nx + size * 0.24, ny - size * 0.04);
      ctx.lineTo(nx + fx2, ny + size * 0.24);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(nx + fx2 * (i / 4) + (i - 1.5) * size * 0.07, ny + size * (0.03 + 0.04 * (i % 2)), Math.max(0.6, size * 0.014), 0, Math.PI * 2); ctx.fill(); }
    }
  }
  function drawFaceAcc(ctx, kind, col, hx, hy, size, angle) {
    const eyes = [-1, 1].map(s => [hx + Math.cos(angle) * size * 0.1 + Math.cos(angle + s * 1.2) * size * 0.12, hy + Math.sin(angle) * size * 0.1 + Math.sin(angle + s * 1.2) * size * 0.12]);
    ctx.save();
    ctx.lineWidth = Math.max(1, size * 0.025); ctx.strokeStyle = col;
    if (kind === 'glasses') {
      for (const [ex, ey] of eyes) { ctx.fillStyle = 'rgba(200,230,255,.25)'; ctx.beginPath(); ctx.arc(ex, ey, size * 0.085, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    } else {
      for (const [ex, ey] of eyes) { starShape(ctx, ex, ey, size * 0.12, col); starShape(ctx, ex, ey, size * 0.085, '#1a1028'); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(ex - size * 0.025, ey - size * 0.025, size * 0.015, 0, Math.PI * 2); ctx.fill(); }
    }
    const [ax, ay] = eyes[0], [bx, by] = eyes[1];
    ctx.beginPath(); ctx.moveTo(ax + (bx - ax) * 0.28, ay + (by - ay) * 0.28); ctx.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 - size * 0.03, ax + (bx - ax) * 0.72, ay + (by - ay) * 0.72); ctx.stroke();
    ctx.restore();
  }
  const FXT = {
    starlight: { c: '#ffe9a8', c2: '#ffffff', trail: '#ffd24a', glyph: 'spark', pal: ['#ffe9a8', '#fff2a8', '#ffffff'] },
    ember: { c: '#ff8a3a', c2: '#ffd24a', trail: '#ff6a2a', glyph: 'dot', pal: ['#ff8a3a', '#ffd24a', '#ff5a3a'] },
    frost: { c: '#bfe8ff', c2: '#ffffff', trail: '#9fd8ff', glyph: 'flake', pal: ['#bfe8ff', '#e6f4ff', '#9fd8ff'] },
    candy: { c: '#ff8fc8', c2: '#9fffe0', trail: '#ff8fc8', glyph: 'dot', pal: ['#ff8fc8', '#9fffe0', '#fff2a8', '#b48bff'] },
    shadow: { c: '#9a7cff', c2: '#2a1a40', trail: '#5a3a9a', glyph: 'dot', pal: ['#9a7cff', '#5a3a9a', '#c9b8ff'] },
  };
  function themeOf(kind) { const k = kind === 'swarm' ? 'bat' : kind; const th = Cos.fx[k]; return FXT[th] ? th : 'classic'; }
  function projHead(th) {
    return sprite('p|' + th, 64, 64, (g, w, h) => {
      const cx = w / 2, cy = h / 2, T = FXT[th];
      if (th === 'starlight') {
        g.shadowColor = T.trail; g.shadowBlur = 10;
        starShape(g, cx, cy, 24, T.c);
        g.shadowBlur = 0; starShape(g, cx, cy, 10, '#ffffff');
      } else if (th === 'ember') {
        const gr = g.createRadialGradient(cx, cy, 0, cx, cy, 30);
        gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.2, '#fff2a8'); gr.addColorStop(0.45, '#ff8a3a'); gr.addColorStop(1, 'rgba(255,90,30,0)');
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
      } else if (th === 'frost') {
        g.shadowColor = T.trail; g.shadowBlur = 8;
        g.fillStyle = T.c;
        g.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.lineTo(cx + Math.cos(a) * 16, cy + Math.sin(a) * 16); } g.closePath(); g.fill();
        g.shadowBlur = 0; g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.lineCap = 'round';
        g.beginPath(); for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; g.moveTo(cx + Math.cos(a) * 25, cy + Math.sin(a) * 25); g.lineTo(cx - Math.cos(a) * 25, cy - Math.sin(a) * 25); } g.stroke();
      } else if (th === 'candy') {
        g.save(); g.beginPath(); g.arc(cx, cy, 18, 0, Math.PI * 2); g.clip();
        g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
        g.fillStyle = T.c;
        for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, 20, i * Math.PI / 2, i * Math.PI / 2 + Math.PI / 4); g.closePath(); g.fill(); }
        g.restore();
        g.strokeStyle = shade(T.c, -0.2); g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, 18, 0, Math.PI * 2); g.stroke();
        g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(cx - 6, cy - 6, 4, 0, Math.PI * 2); g.fill();
      } else {
        const gr = g.createRadialGradient(cx, cy, 0, cx, cy, 30);
        gr.addColorStop(0, '#120a1e'); gr.addColorStop(0.45, '#2a1a40'); gr.addColorStop(0.62, '#9a7cff'); gr.addColorStop(1, 'rgba(122,74,255,0)');
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
      }
    });
  }
  const IMP = [];
  const projSeen = [];
  let impN = 1;
  function trackImpacts(S, now) {
    const cur = S.run ? S.run.proj : null;
    if (cur) for (const p of cur) p._seen = now;
    for (const p of projSeen) {
      if (p._seen === now || p.kind === 'hero') continue;
      const th = themeOf(p.kind);
      if (th !== 'classic' && IMP.length < 140) IMP.push({ x: p.x, y: p.y, th, t0: now, seed: (impN++ * 7919) % 9973, big: p.kind === 'unicorn' || p.kind === 'crystal' });
    }
    projSeen.length = 0;
    if (cur) for (const p of cur) projSeen.push(p);
  }
  function drawImpacts(ctx, now, sc) {
    let w = 0;
    for (let i = 0; i < IMP.length; i++) {
      const m = IMP[i], k = (now - m.t0) / 460;
      if (k >= 1 || k < 0) continue;
      IMP[w++] = m;
      const [sx, sy] = View.toScreen(m.x, m.y), T = FXT[m.th], R = (m.big ? 15 : 10) * Math.max(0.7, sc), a = 1 - k;
      if (m.th === 'starlight') {
        const img = glyph('spark', T.c);
        for (let j = 0; j < 5; j++) { const an = m.seed + j * 1.2566, d = R * (0.3 + 1.2 * k); blit(ctx, img, sx + Math.cos(an) * d, sy + Math.sin(an) * d, R * 1.1 * (1 - k * 0.5), a); }
        blit(ctx, glyph('dot', T.trail), sx, sy, R * 2.4 * (1 - k), a * 0.8);
      } else if (m.th === 'ember') {
        const img = glyph('dot', T.c);
        for (let j = 0; j < 6; j++) { const an = m.seed + j * 1.047; blit(ctx, img, sx + Math.cos(an) * R * k * 1.3, sy + Math.sin(an) * R * 0.6 * k - R * 1.6 * k, R * 0.8 * (1 - k * 0.6), a); }
        blit(ctx, glyph('dot', T.c2), sx, sy, R * 2 * (1 - k), a);
      } else if (m.th === 'frost') {
        blit(ctx, glyph('flake', T.c), sx, sy, R * 2.2 * (0.6 + 0.6 * k), a);
        const img = glyph('flake', T.c2);
        for (let j = 0; j < 4; j++) { const an = m.seed + j * 1.5708 + 0.4; blit(ctx, img, sx + Math.cos(an) * R * 1.4 * k, sy + Math.sin(an) * R * 1.4 * k, R * 0.7, a); }
      } else if (m.th === 'candy') {
        ctx.save(); ctx.globalAlpha = a;
        for (let j = 0; j < 8; j++) {
          const an = m.seed + j * 0.785, px = sx + Math.cos(an) * R * 1.6 * k, py = sy + Math.sin(an) * R * k + R * 1.8 * k * k, ww = R * 0.4 * Math.abs(Math.cos(now / 90 + j));
          ctx.fillStyle = T.pal[j % T.pal.length]; ctx.fillRect(px - ww / 2, py - R * 0.15, Math.max(0.8, ww), R * 0.3);
        }
        ctx.restore();
      } else {
        const img = glyph('puff', '#4a2a7a');
        for (let j = 0; j < 4; j++) { const an = m.seed + j * 1.5708; blit(ctx, img, sx + Math.cos(an) * R * 0.8 * k, sy + Math.sin(an) * R * 0.8 * k - R * 0.6 * k, R * (1.2 + 1.6 * k), a * 0.9); }
        ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = T.c; ctx.lineWidth = 1.5; circle(ctx, sx, sy, R * (0.4 + k * 1.3)); ctx.stroke(); ctx.restore();
      }
    }
    IMP.length = w;
  }
  const TITLE_COL = { veteran: '#c8cbe0', champion: '#e3c15b', legend: '#ff9ad8' };
  const LBL = new Map();
  function labelImg(text, tid) {
    const key = text + '|' + (tid || '');
    let c = LBL.get(key);
    if (c) return c;
    if (LBL.size > 300) LBL.clear();
    c = document.createElement('canvas');
    let g = c.getContext('2d');
    const f = '700 24px system-ui, sans-serif';
    g.font = f;
    const stars = tid ? (tid === 'legend' ? '★★★ ' : tid === 'champion' ? '★★ ' : '★ ') : '';
    const sw = stars ? g.measureText(stars).width : 0, tw = g.measureText(text).width;
    c.width = Math.ceil(sw + tw + 22); c.height = 36;
    g = c.getContext('2d');
    g.font = f; g.textBaseline = 'middle';
    g.fillStyle = 'rgba(10,8,18,.66)';
    g.beginPath();
    if (g.roundRect) g.roundRect(0, 0, c.width, c.height, 12); else g.rect(0, 0, c.width, c.height);
    g.fill();
    if (tid) { g.strokeStyle = rgba(TITLE_COL[tid], 0.6); g.lineWidth = 2; g.stroke(); g.fillStyle = TITLE_COL[tid]; g.fillText(stars, 11, 19); }
    g.fillStyle = '#f3f0fb'; g.fillText(text, 11 + sw, 19);
    LBL.set(key, c);
    return c;
  }
  function drawLabel(ctx, t, sx, sy, size, sc) {
    const T = C.titleOf(t), text = t.name || (T ? T.name : '');
    if (!text) return;
    const img = labelImg(text, T ? T.id : ''), h = Math.max(12, 15 * Math.min(1.2, sc)), w = img.width * h / img.height;
    ctx.drawImage(img, sx - w / 2, sy - size * 0.95 - h, w, h);
  }
  const SEASON_TINT = {
    autumn: { ground: '#4a2c12', gt: 0.4, grass: ['rgba(206,130,52,.32)', 'rgba(176,82,40,.3)'], flowers: ['#e07a2a', '#c43a2a', '#f0b03a', '#a0522d'], tree: '#2a160a', leaf: ['#e07a2a', '#c43a2a', '#f0b03a', '#b5651d'] },
    winter: { ground: '#a8bcd4', gt: 0.34, grass: ['rgba(225,238,252,.28)', 'rgba(185,208,232,.26)'], flowers: ['#e6f4ff', '#bfe0ff', '#ffffff'], tree: '#142230', roadLine: 'rgba(230,245,255,.14)' },
    spring: { ground: '#2a6a34', gt: 0.32, grass: ['rgba(126,220,112,.34)', 'rgba(92,186,102,.32)'], flowers: ['#ffb0d8', '#fff2a8', '#ffffff', '#c9a0ff', '#ff8fb0'], tree: '#123a1c' },
    festival: { ground: '#3a1e4a', gt: 0.24, grass: ['rgba(160,124,214,.24)', 'rgba(116,92,178,.26)'], flowers: ['#ff6b6b', '#ffd24a', '#4fd1c5', '#ff8fc8', '#9fd0ff'], tree: '#160e20' },
  };
  function seasonPal(P, s) {
    const T = SEASON_TINT[s];
    if (!T) return P;
    const o = Object.assign({}, P);
    o.ground = P.ground.map((c, i) => mixHex(c, T.ground, T.gt * (1 - i * 0.3)));
    o.grass = T.grass; o.flowers = T.flowers; o.tree = T.tree;
    if (T.roadLine) o.roadLine = T.roadLine;
    return o;
  }
  function treeDeco(g, s, tx, ty, h, w, rng) {
    if (s === 'winter') {
      g.fillStyle = 'rgba(240,248,255,.9)';
      g.beginPath(); g.moveTo(tx, ty - h); g.lineTo(tx - w * 0.42, ty - h * 0.55); g.quadraticCurveTo(tx, ty - h * 0.62, tx + w * 0.42, ty - h * 0.55); g.closePath(); g.fill();
    } else if (s === 'spring') {
      for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? '#ffb0d8' : '#fff0f6'; g.beginPath(); g.arc(tx + (rng() - 0.5) * w * 0.9, ty - h * (0.15 + rng() * 0.6), Math.max(1, w * 0.12), 0, Math.PI * 2); g.fill(); }
    } else if (s === 'autumn') {
      for (let i = 0; i < 5; i++) { g.fillStyle = SEASON_TINT.autumn.leaf[i % 4]; g.beginPath(); g.arc(tx + (rng() - 0.5) * w * 0.9, ty - h * (0.1 + rng() * 0.6), Math.max(1, w * 0.11), 0, Math.PI * 2); g.fill(); }
    } else if (s === 'festival') {
      g.save(); g.shadowColor = '#ffd24a'; g.shadowBlur = 8; starShape(g, tx, ty - h, Math.max(2, w * 0.2), '#ffd24a'); g.restore();
    }
  }
  function drawSeason(g, cw, ch, map, s, mini) {
    const sc = View.sc, rng = C.mulberry(map.decor.seed * 3 + 77), k = mini ? 0.3 : 1, z = Math.max(mini ? 0.35 : 0.6, sc);
    const spots = (n, gap) => {
      const out = [];
      for (let i = 0; i < n; i++) {
        const R = map.route[i % map.route.length];
        C.routePos(R, (0.08 + rng() * 0.84) * R.len, tmpPos);
        const o = (rng() < 0.5 ? -1 : 1) * (map.half + gap + rng() * 26);
        out.push(View.toScreen(tmpPos.x - tmpPos.ty * o, tmpPos.y + tmpPos.tx * o));
      }
      return out;
    };
    if (s === 'autumn') {
      const L = SEASON_TINT.autumn.leaf;
      for (let i = 0; i < 300 * k; i++) {
        const x = rng() * cw, y = rng() * ch, a = rng() * Math.PI;
        g.fillStyle = L[i % L.length]; g.globalAlpha = 0.55 + rng() * 0.35;
        g.beginPath(); g.ellipse(x, y, 2.6 * z, 1.3 * z, a, 0, Math.PI * 2); g.fill();
      }
      g.globalAlpha = 1;
      for (const [x, y] of spots(mini ? 3 : 10, 20)) {
        const r = 7 * z;
        g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x, y + r * 0.8, r * 1.3, r * 0.35, 0, 0, Math.PI * 2); g.fill();
        for (const o of [-0.5, 0.5, 0]) { g.fillStyle = o ? '#d8661e' : '#f08a2a'; g.beginPath(); g.ellipse(x + o * r, y, r * 0.7, r * 0.8, 0, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = '#4a7a2a'; g.fillRect(x - r * 0.1, y - r * 1.1, r * 0.2, r * 0.4);
        if (!mini && rng() < 0.5) { g.fillStyle = '#ffd24a'; g.beginPath(); g.moveTo(x - r * 0.35, y - r * 0.1); g.lineTo(x - r * 0.15, y - r * 0.35); g.lineTo(x + r * 0.05, y - r * 0.1); g.fill(); g.beginPath(); g.moveTo(x + r * 0.1, y - r * 0.1); g.lineTo(x + r * 0.3, y - r * 0.35); g.lineTo(x + r * 0.45, y - r * 0.1); g.fill(); }
      }
    } else if (s === 'winter') {
      for (let i = 0; i < 80 * k; i++) {
        const x = rng() * cw, y = rng() * ch, r = (10 + rng() * 34) * z;
        g.fillStyle = 'rgba(240,248,255,' + (0.12 + rng() * 0.2).toFixed(2) + ')';
        g.beginPath(); g.ellipse(x, y, r, r * 0.55, 0, 0, Math.PI * 2); g.fill();
      }
      g.lineJoin = 'round';
      for (const R of map.route) {
        const pts = routeScreen(R);
        g.strokeStyle = 'rgba(232,244,255,.22)'; g.lineWidth = map.half * sc * 2 + 3; g.setLineDash([Math.max(2, 6 * sc), Math.max(2, 9 * sc)]); strokePath(g, pts);
        g.setLineDash([]); g.strokeStyle = 'rgba(190,225,255,.08)'; g.lineWidth = map.half * sc * 1.2; strokePath(g, pts);
      }
      for (const [x, y] of spots(mini ? 1 : 3, 24)) {
        const r = 6 * z;
        g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(x, y + r * 1.1, r * 1.2, r * 0.3, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#f4f8ff';
        g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(x, y - r * 1.3, r * 0.7, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#1a1420'; g.beginPath(); g.arc(x - r * 0.22, y - r * 1.4, r * 0.1, 0, Math.PI * 2); g.arc(x + r * 0.22, y - r * 1.4, r * 0.1, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#f08a2a'; g.beginPath(); g.moveTo(x, y - r * 1.25); g.lineTo(x + r * 0.5, y - r * 1.18); g.lineTo(x, y - r * 1.1); g.fill();
        g.fillStyle = '#e35b6a'; g.fillRect(x - r * 0.6, y - r * 0.75, r * 1.2, r * 0.22);
      }
      g.fillStyle = 'rgba(255,255,255,.55)';
      for (let i = 0; i < 220 * k; i++) { g.beginPath(); g.arc(rng() * cw, rng() * ch, (0.6 + rng() * 0.8) * z, 0, Math.PI * 2); g.fill(); }
    } else if (s === 'spring') {
      const pet = ['#ffb0d8', '#ffd6ea', '#ffffff'];
      for (let i = 0; i < 240 * k; i++) {
        g.fillStyle = pet[i % 3]; g.globalAlpha = 0.5 + rng() * 0.4;
        g.beginPath(); g.ellipse(rng() * cw, rng() * ch, 2 * z, 1.2 * z, rng() * Math.PI, 0, Math.PI * 2); g.fill();
      }
      g.globalAlpha = 1;
      const fc = SEASON_TINT.spring.flowers;
      for (let i = 0; i < 70 * k; i++) {
        const x = rng() * cw, y = rng() * ch, r = 1.6 * z;
        g.fillStyle = fc[i % fc.length];
        for (let j = 0; j < 5; j++) { const a = j * 1.2566; g.beginPath(); g.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.8, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = '#ffd24a'; g.beginPath(); g.arc(x, y, r * 0.6, 0, Math.PI * 2); g.fill();
      }
      for (const [x, y] of spots(mini ? 3 : 8, 28)) {
        const r = 13 * z;
        g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x, y + r * 0.9, r * 1.1, r * 0.3, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#5a3a2a'; g.fillRect(x - r * 0.12, y - r * 0.2, r * 0.24, r * 1.1);
        for (let j = 0; j < 7; j++) {
          const a = j * 0.9 + rng(), d = r * (0.25 + rng() * 0.45);
          g.fillStyle = j % 3 === 0 ? '#ffd6ea' : j % 3 === 1 ? '#ff9ac8' : '#ffb8dc';
          g.beginPath(); g.arc(x + Math.cos(a) * d, y - r * 0.55 + Math.sin(a) * d * 0.7, r * 0.42, 0, Math.PI * 2); g.fill();
        }
        g.fillStyle = 'rgba(255,255,255,.7)';
        for (let j = 0; j < 4; j++) { g.beginPath(); g.arc(x + (rng() - 0.5) * r, y - r * 0.6 + (rng() - 0.5) * r * 0.6, r * 0.08, 0, Math.PI * 2); g.fill(); }
      }
    } else if (s === 'festival') {
      const fc = SEASON_TINT.festival.flowers;
      for (let i = 0; i < 280 * k; i++) {
        const x = rng() * cw, y = rng() * ch;
        g.save(); g.translate(x, y); g.rotate(rng() * Math.PI);
        g.fillStyle = fc[i % fc.length]; g.globalAlpha = 0.6 + rng() * 0.3;
        g.fillRect(-1.6 * z, -0.8 * z, 3.2 * z, 1.6 * z);
        g.restore();
      }
      {
        let li = 0;
        for (const R of map.route) {
          const step = mini ? 160 : 110, side = (li % 2 ? 1 : -1);
          let prev = null;
          for (let d = 40; d < R.len - 20; d += step) {
            C.routePos(R, d, tmpPos);
            const o = side * (map.half + 14);
            const p = View.toScreen(tmpPos.x - tmpPos.ty * o, tmpPos.y + tmpPos.tx * o);
            if (prev) {
              g.strokeStyle = 'rgba(40,24,30,.7)'; g.lineWidth = Math.max(0.6, 1.2 * z);
              g.beginPath(); g.moveTo(prev[0], prev[1]); g.quadraticCurveTo((prev[0] + p[0]) / 2, (prev[1] + p[1]) / 2 + 12 * z, p[0], p[1]); g.stroke();
              const mx = (prev[0] + p[0]) / 2, my = (prev[1] + p[1]) / 2 + 6 * z, col = fc[li % fc.length];
              g.save(); g.shadowColor = col; g.shadowBlur = mini ? 4 : 12;
              g.fillStyle = col; g.beginPath(); g.ellipse(mx, my + 4 * z, 3.6 * z, 4.6 * z, 0, 0, Math.PI * 2); g.fill();
              g.restore();
              g.fillStyle = 'rgba(255,246,216,.85)'; g.beginPath(); g.ellipse(mx, my + 4 * z, 1.4 * z, 2.4 * z, 0, 0, Math.PI * 2); g.fill();
              g.fillStyle = '#3a2418'; g.fillRect(mx - 2 * z, my - 1 * z, 4 * z, 1.2 * z);
              li++;
            }
            g.fillStyle = '#5a3a2a'; g.beginPath(); g.arc(p[0], p[1], Math.max(1, 1.6 * z), 0, Math.PI * 2); g.fill();
            prev = p;
          }
          li++;
        }
      }
    }
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
    const body = o.body, mane = o.rainbow ? hue(now, (o.seed || 0) * 40) : o.mane;
    const bob = Math.sin(now / 250 + (o.seed || 0)) * size * 0.015 - (o.hop || 0) * size * 0.25;
    ctx.save();
    ctx.translate(x, y + bob);
    if (o.aura) drawAura(ctx, o.aura, o.auraCol || '#ffe9a8', 0, 0, size, now, o.seed || 0, angle, false);
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.beginPath(); ctx.ellipse(0, size * 0.42 - bob, size * 0.45, size * 0.13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = shade(body, -0.35);
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * size * 0.24, size * 0.32, size * 0.115, size * 0.145, 0, 0, Math.PI * 2); ctx.fill(); }
    if (o.cape) drawCape(ctx, size, angle, o.cape, o.accent || o.cape, now);
    if (o.batWings) drawBatWings(ctx, size, body, mane, now, o.seed || 0);
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
    ctx.fillStyle = o.rainbow ? hue(now, (o.seed || 0) * 40 + 120) : mane;
    ctx.beginPath(); ctx.ellipse(tx, ty, size * 0.16, size * 0.24, ta + Math.PI / 2, 0, Math.PI * 2); ctx.fill();
    if (o.streak) { ctx.fillStyle = o.streak; ctx.beginPath(); ctx.ellipse(tx, ty, size * 0.06, size * 0.2, ta + Math.PI / 2, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = bodyShade(ctx, 0, size * 0.06, size * 0.5, body);
    ctx.beginPath(); ctx.ellipse(0, size * 0.06, size * 0.54, size * 0.39, 0, 0, Math.PI * 2); ctx.fill();
    if (o.spots) {
      ctx.save();
      ctx.beginPath(); ctx.ellipse(0, size * 0.06, size * 0.54, size * 0.39, 0, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = o.spots;
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse((hsh(i * 5 + 1) - 0.5) * size * 0.9, size * 0.06 + (hsh(i * 9 + 2) - 0.5) * size * 0.6, size * (0.06 + hsh(i + 7) * 0.06), size * (0.05 + hsh(i + 3) * 0.04), i, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
    ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.lineWidth = size * 0.02;
    ctx.beginPath(); ctx.ellipse(0, size * 0.06, size * 0.47, size * 0.33, 0, Math.PI * 1.1, Math.PI * 1.7); ctx.stroke();
    if (o.gem) drawFacets(ctx, 0, size * 0.06, size * 0.54, size * 0.39, body, o.glow, now, o.seed || 0);
    if (o.mark) {
      ctx.fillStyle = o.mark;
      ctx.beginPath(); ctx.arc(-Math.cos(angle) * size * 0.22, size * 0.1, size * 0.06, 0, Math.PI * 2); ctx.fill();
    }
    const hx = Math.cos(angle) * size * 0.4, hy = Math.sin(angle) * size * 0.4 - size * 0.05;
    if (o.acc === 'scarf' || o.acc === 'bandana') drawNeckAcc(ctx, o.acc, o.accCol || '#e35b6a', size, angle, now);
    const hg = bodyShade(ctx, hx, hy, size * 0.3, body);
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.arc(hx, hy, size * 0.285, 0, Math.PI * 2); ctx.fill();
    const mx = hx + Math.cos(angle) * size * 0.2, my = hy + Math.sin(angle) * size * 0.2;
    ctx.beginPath(); ctx.ellipse(mx, my, size * 0.15, size * 0.125, angle, 0, Math.PI * 2); ctx.fill();
    for (const s of [-1, 1]) {
      ctx.fillStyle = hg;
      ctx.beginPath();
      const tipY = o.tufts ? 0.5 : 0.42;
      ctx.moveTo(hx + s * size * 0.16, hy - size * 0.2);
      ctx.lineTo(hx + s * size * (o.tufts ? 0.3 : 0.26), hy - size * tipY);
      ctx.lineTo(hx + s * size * 0.04, hy - size * 0.28);
      ctx.closePath(); ctx.fill();
      if (o.tufts) {
        ctx.strokeStyle = mane; ctx.lineWidth = size * 0.03; ctx.lineCap = 'round';
        const ex = hx + s * size * 0.3, ey = hy - size * tipY;
        ctx.beginPath();
        for (let k = -1; k <= 1; k++) { ctx.moveTo(ex, ey); ctx.lineTo(ex + s * size * (0.05 + 0.03 * k), ey - size * (0.08 - 0.03 * k)); }
        ctx.stroke();
        ctx.fillStyle = shade(body, -0.35);
        ctx.beginPath();
        ctx.moveTo(hx + s * size * 0.15, hy - size * 0.24);
        ctx.lineTo(hx + s * size * 0.26, hy - size * 0.42);
        ctx.lineTo(hx + s * size * 0.09, hy - size * 0.28);
        ctx.closePath(); ctx.fill();
      }
      if (o.gem) {
        ctx.fillStyle = shade(o.glow || body, 0.3);
        ctx.globalAlpha *= 0.6;
        ctx.beginPath();
        ctx.moveTo(hx + s * size * 0.16, hy - size * 0.22);
        ctx.lineTo(hx + s * size * 0.24, hy - size * 0.38);
        ctx.lineTo(hx + s * size * 0.12, hy - size * 0.27);
        ctx.closePath(); ctx.fill();
        ctx.globalAlpha /= 0.6;
      }
    }
    if (o.gem) {
      ctx.save();
      ctx.shadowColor = o.glow || mane; ctx.shadowBlur = 8 + Math.sin(now / 260 + (o.seed || 0)) * 4;
      ctx.fillStyle = o.glow || mane;
      ctx.beginPath();
      ctx.moveTo(hx, hy - size * 0.5);
      ctx.lineTo(hx + size * 0.06, hy - size * 0.3);
      ctx.lineTo(hx, hy - size * 0.22);
      ctx.lineTo(hx - size * 0.06, hy - size * 0.3);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      ctx.beginPath(); ctx.moveTo(hx, hy - size * 0.48); ctx.lineTo(hx + size * 0.03, hy - size * 0.31); ctx.lineTo(hx, hy - size * 0.26); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    const drawHorn = () => {
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
    };
    if (o.horn) drawHorn();
    ctx.fillStyle = mane;
    ctx.beginPath();
    ctx.ellipse(hx - Math.cos(angle) * size * 0.08, hy - Math.sin(angle) * size * 0.08 - size * 0.04, size * 0.16, size * 0.22, angle, 0, Math.PI * 2);
    ctx.fill();
    if (o.streak) {
      ctx.fillStyle = o.streak;
      ctx.beginPath();
      ctx.ellipse(hx - Math.cos(angle) * size * 0.1, hy - Math.sin(angle) * size * 0.1 - size * 0.06, size * 0.055, size * 0.18, angle, 0, Math.PI * 2);
      ctx.fill();
    }
    if (o.crown) drawCrown(ctx, o.crown, hx, hy, size, angle, o.accent || '#ffe066', o.cape || mane, now);
    if (o.acc && HATS[o.acc] && size >= 6) {
      const img = hatSprite(o.acc, o.accCol || '#3a2a4a', size), dw = size * 0.9;
      ctx.drawImage(img, hx - dw / 2, hy - size * 0.24 - dw * 0.86, dw, dw);
      if (o.horn) drawHorn();
    }
    const blink = ((now + (o.seed || 0) * 700) % 3600) < 110;
    for (const s of [-1, 1]) {
      const ex = hx + Math.cos(angle) * size * 0.1 + Math.cos(angle + s * 1.2) * size * 0.12;
      const ey = hy + Math.sin(angle) * size * 0.1 + Math.sin(angle + s * 1.2) * size * 0.12;
      if (blink) { ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(ex, ey, size * 0.062, size * 0.01, angle, 0, Math.PI * 2); ctx.fill(); continue; }
      if (o.slit) {
        ctx.save();
        ctx.shadowColor = o.slit; ctx.shadowBlur = 5;
        ctx.fillStyle = o.slit;
        ctx.beginPath(); ctx.ellipse(ex, ey, size * 0.066, size * 0.052, angle, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        ctx.fillStyle = '#120c18';
        ctx.beginPath(); ctx.ellipse(ex + Math.cos(angle) * size * 0.01, ey, size * 0.011, size * 0.044, 0, 0, Math.PI * 2); ctx.fill();
        continue;
      }
      ctx.fillStyle = '#f5f0e6';
      ctx.beginPath(); ctx.ellipse(ex, ey, size * 0.062, size * 0.05, angle, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#171220';
      ctx.beginPath(); ctx.arc(ex + Math.cos(angle) * size * 0.012, ey, size * 0.036, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.beginPath(); ctx.arc(ex - size * 0.018, ey - size * 0.018, size * 0.015, 0, Math.PI * 2); ctx.fill();
    }
    if (o.acc === 'glasses' || o.acc === 'shades') drawFaceAcc(ctx, o.acc, o.accCol || '#2a2030', hx, hy, size, angle);
    if (o.aura) drawAura(ctx, o.aura, o.auraCol || '#ffe9a8', 0, 0, size, now, o.seed || 0, angle, true);
    ctx.restore();
  }

  function drawCape(ctx, size, angle, col, edge, now) {
    const sway = Math.sin(now / 300) * size * 0.05;
    const bx = -Math.cos(angle) * size * 0.5, by = -Math.sin(angle) * size * 0.2 + size * 0.22;
    ctx.save();
    ctx.fillStyle = shade(col, -0.15);
    ctx.beginPath();
    ctx.moveTo(-size * 0.34, -size * 0.12);
    ctx.quadraticCurveTo(bx - size * 0.45 + sway, by, bx - size * 0.3 + sway, by + size * 0.24);
    ctx.lineTo(bx + sway * 0.5, by + size * 0.3);
    ctx.lineTo(bx + size * 0.3 + sway, by + size * 0.24);
    ctx.quadraticCurveTo(bx + size * 0.45 + sway, by, size * 0.34, -size * 0.12);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = edge; ctx.lineWidth = size * 0.035;
    ctx.beginPath();
    ctx.moveTo(bx - size * 0.3 + sway, by + size * 0.24); ctx.lineTo(bx + sway * 0.5, by + size * 0.3); ctx.lineTo(bx + size * 0.3 + sway, by + size * 0.24);
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(0, -size * 0.12, size * 0.36, size * 0.1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = edge;
    ctx.beginPath(); ctx.arc(Math.cos(angle) * size * 0.2, -size * 0.1, size * 0.055, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function drawCrown(ctx, kind, hx, hy, size, angle, acc, col, now) {
    ctx.save();
    const top = hy - size * 0.27;
    if (kind === 'tiara') {
      ctx.fillStyle = acc; ctx.shadowColor = acc; ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(hx - size * 0.17, top + size * 0.04);
      ctx.lineTo(hx - size * 0.11, top - size * 0.06);
      ctx.lineTo(hx - size * 0.05, top);
      ctx.lineTo(hx, top - size * 0.12);
      ctx.lineTo(hx + size * 0.05, top);
      ctx.lineTo(hx + size * 0.11, top - size * 0.06);
      ctx.lineTo(hx + size * 0.17, top + size * 0.04);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#7a5cff';
      ctx.beginPath(); ctx.arc(hx, top - size * 0.03, size * 0.03, 0, Math.PI * 2); ctx.fill();
    } else if (kind === 'helm') {
      ctx.fillStyle = shade(acc, -0.1);
      ctx.beginPath(); ctx.ellipse(hx, top + size * 0.03, size * 0.22, size * 0.12, 0, Math.PI, Math.PI * 2); ctx.fill();
      ctx.fillStyle = acc;
      ctx.fillRect(hx - size * 0.23, top + size * 0.02, size * 0.46, size * 0.05);
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(hx - size * 0.03, top - size * 0.08); ctx.quadraticCurveTo(hx - size * 0.2, top - size * 0.28, hx - size * 0.28, top - size * 0.12); ctx.quadraticCurveTo(hx - size * 0.12, top - size * 0.12, hx + size * 0.03, top - size * 0.05); ctx.closePath(); ctx.fill();
    } else if (kind === 'goggles') {
      ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = size * 0.04;
      ctx.beginPath(); ctx.moveTo(hx - size * 0.24, top + size * 0.08); ctx.lineTo(hx + size * 0.24, top + size * 0.08); ctx.stroke();
      for (const s2 of [-1, 1]) {
        ctx.fillStyle = '#ffd24a';
        ctx.beginPath(); ctx.arc(hx + s2 * size * 0.09, top + size * 0.05, size * 0.075, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(160,230,255,.9)';
        ctx.beginPath(); ctx.arc(hx + s2 * size * 0.09, top + size * 0.05, size * 0.05, 0, Math.PI * 2); ctx.fill();
      }
    } else if (kind === 'hood') {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(hx - size * 0.3, hy + size * 0.05);
      ctx.quadraticCurveTo(hx - size * 0.32, top - size * 0.12, hx, top - size * 0.16);
      ctx.quadraticCurveTo(hx + size * 0.32, top - size * 0.12, hx + size * 0.3, hy + size * 0.05);
      ctx.quadraticCurveTo(hx, top + size * 0.02, hx - size * 0.3, hy + size * 0.05);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = acc; ctx.lineWidth = size * 0.025; ctx.stroke();
    }
    ctx.restore();
  }
  function drawBatWings(ctx, size, body, mane, now, seed) {
    const flap = Math.sin(now / 130 + seed) * 0.3;
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.translate(s * size * 0.26, -size * 0.04);
      ctx.rotate(s * -(0.25 + flap));
      const span = size * 0.62;
      const tips = [[0.95, -0.55], [1, -0.12], [0.78, 0.2], [0.45, 0.28]];
      ctx.fillStyle = shade(mane, 0.18);
      ctx.globalAlpha *= 0.92;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(s * span * 0.35, -span * 0.62);
      ctx.lineTo(s * span * tips[0][0], span * tips[0][1]);
      for (let i = 1; i < tips.length; i++) {
        const a = tips[i - 1], b = tips[i];
        ctx.quadraticCurveTo(s * span * (a[0] + b[0]) * 0.42, span * (a[1] + b[1]) * 0.42, s * span * b[0], span * b[1]);
      }
      ctx.quadraticCurveTo(s * span * 0.2, span * 0.12, 0, span * 0.1);
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha /= 0.92;
      ctx.strokeStyle = shade(body, -0.25); ctx.lineWidth = size * 0.028; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(s * span * 0.35, -span * 0.62); ctx.lineTo(s * span * tips[0][0], span * tips[0][1]);
      for (let i = 1; i < tips.length; i++) { ctx.moveTo(s * span * 0.35, -span * 0.62); ctx.lineTo(s * span * tips[i][0], span * tips[i][1]); }
      ctx.stroke();
      ctx.fillStyle = shade(body, 0.1);
      ctx.beginPath(); ctx.arc(s * span * 0.35, -span * 0.62, size * 0.03, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  function drawFacets(ctx, cx, cy, rx, ry, body, glow, now, seed) {
    ctx.save();
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.clip();
    const rng = C.mulberry(((seed | 0) * 131 + 7) >>> 0);
    const pts = [];
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + rng() * 0.3; pts.push([cx + Math.cos(a) * rx * 1.05, cy + Math.sin(a) * ry * 1.05]); }
    const mid = [[cx - rx * 0.25, cy - ry * 0.15], [cx + rx * 0.2, cy + ry * 0.1], [cx - rx * 0.05, cy + ry * 0.35]];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length], m = mid[i % mid.length];
      ctx.fillStyle = i % 3 === 0 ? shade(body, 0.32) : i % 3 === 1 ? shade(body, -0.12) : shade(body, 0.1);
      ctx.globalAlpha = 0.45;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(m[0], m[1]); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = Math.max(0.6, rx * 0.03);
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) { const m = mid[i % mid.length]; ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(m[0], m[1]); }
    ctx.moveTo(mid[0][0], mid[0][1]); ctx.lineTo(mid[1][0], mid[1][1]); ctx.lineTo(mid[2][0], mid[2][1]); ctx.closePath();
    ctx.stroke();
    const tw = (now / 900 + (seed || 0) * 0.37) % 1;
    const sp = pts[Math.floor(tw * pts.length) % pts.length];
    ctx.globalAlpha = Math.sin(tw * Math.PI);
    ctx.fillStyle = '#ffffff';
    const sx = (sp[0] + cx) / 2, sy = (sp[1] + cy) / 2, sr = rx * 0.12;
    ctx.beginPath(); ctx.moveTo(sx, sy - sr); ctx.lineTo(sx + sr * 0.3, sy); ctx.lineTo(sx, sy + sr); ctx.lineTo(sx - sr * 0.3, sy); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.18 + Math.sin(now / 400 + (seed || 0)) * 0.06;
    const g = ctx.createRadialGradient(cx, cy, rx * 0.2, cx, cy, rx * 1.5);
    g.addColorStop(0, glow || body); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx * 1.5, ry * 1.6, 0, 0, Math.PI * 2); ctx.fill();
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
    const sneaky = e.stealth && !e.burrowT;
    const ghost = sneaky && C.isHidden(e) && !e.seen;
    const baseA = e.burrowT > 0 ? 0.22 : ghost ? 0.12 : sneaky ? 0.6 : 1;
    if (e.burrowT > 0) drawMound(ctx, x, y, r, now, ph);
    if (e.elite && !e.burrowT && !ghost) {
      const p = 0.5 + 0.5 * Math.sin(now / 260 + ph);
      ctx.save();
      ctx.globalAlpha = 0.35 + 0.25 * p;
      const g = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 1.8);
      g.addColorStop(0, 'rgba(255,214,110,.85)'); g.addColorStop(1, 'rgba(255,214,110,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r * 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = baseA;
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
      ctx.globalAlpha = baseA;
    } else if (e.swarm) {
      const flap = Math.sin(now / 40 + ph) * 0.5;
      ctx.fillStyle = 'rgba(220,230,255,.55)';
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + s * r * 0.75, y - r * 0.55, r * 0.55, r * (0.22 + flap * 0.12), s * 0.5, 0, Math.PI * 2); ctx.fill(); }
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
    if (!flash) drawKind(ctx, e, x, y, r, hx, hy, now, ph, dark);
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
    if (e.wallSlow > 0) {
      ctx.fillStyle = 'rgba(159,230,255,.75)';
      for (let i = 0; i < 3; i++) {
        const a = Math.PI * (0.25 + i * 0.25), px = x + Math.cos(a) * r * 0.9, py = y + Math.sin(a) * r * 0.9;
        ctx.beginPath(); ctx.moveTo(px, py - r * 0.35); ctx.lineTo(px + r * 0.12, py); ctx.lineTo(px - r * 0.12, py); ctx.closePath(); ctx.fill();
      }
    }
    if (sneaky && !ghost) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      const sh = (now / 9 + ph * 13) % (r * 4) - r * 2;
      const g = ctx.createLinearGradient(x + sh - r, y - r, x + sh + r, y + r);
      g.addColorStop(0, 'rgba(200,220,255,0)'); g.addColorStop(0.5, 'rgba(220,235,255,.9)'); g.addColorStop(1, 'rgba(200,220,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(x, y - r * 0.3, r * 0.75, r * 1.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    if (ghost) {
      ctx.save();
      ctx.globalAlpha = 0.18 + 0.1 * Math.sin(now / 200 + ph);
      ctx.strokeStyle = '#c8d4ff'; ctx.lineWidth = 1; ctx.setLineDash([2, 4]);
      ctx.beginPath(); ctx.ellipse(x, y - r * 0.2, r * 0.8, r * 1.15, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
    if (e.sh > 0 && e.shMax > 0) {
      ctx.save();
      const f = Math.min(1, e.sh / e.shMax), hitP = e.shHit > 0 ? 0.3 : 0;
      ctx.globalAlpha = baseA * (0.25 + 0.35 * f + hitP);
      const g = ctx.createRadialGradient(x, y - r * 0.2, r * 0.6, x, y - r * 0.2, r * 1.35);
      g.addColorStop(0, 'rgba(120,190,255,0)'); g.addColorStop(0.8, 'rgba(140,200,255,.35)'); g.addColorStop(1, 'rgba(190,225,255,.9)');
      ctx.fillStyle = g;
      circle(ctx, x, y - r * 0.2, r * 1.35); ctx.fill();
      ctx.strokeStyle = 'rgba(200,232,255,.85)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(x, y - r * 0.2, r * 1.35, -Math.PI * 0.9, -Math.PI * 0.9 + Math.PI * 2 * f); ctx.stroke();
      ctx.restore();
    }
    if (e.revealT > 0) {
      ctx.strokeStyle = 'rgba(255,143,176,.85)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.arc(x, y, r + 7, now / 300, now / 300 + Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
    if (e.burrowT > 0 || ghost) return;
    if (!e.noBar && (e.hp < e.hpMax || e.boss)) {
      const bw = e.boss ? r * 2.6 : r * 1.8, bh = e.boss ? 5 : 3.5;
      const bx = x - bw / 2, by = y - r * 1.55 - (e.boss ? 6 : 0);
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
      ctx.fillStyle = e.boss ? '#e35b6a' : (magic ? '#c08bff' : (fl ? '#7fc8ff' : '#7fd66a'));
      ctx.fillRect(bx, by, bw * Math.max(0, e.hp / e.hpMax), bh);
      if (e.sh > 0 && e.shMax > 0) { ctx.fillStyle = '#9fd2ff'; ctx.fillRect(bx, by - 2.5, bw * Math.min(1, e.sh / e.shMax), 2); }
    }
  }

  function drawMound(ctx, x, y, r, now, ph) {
    ctx.save();
    ctx.fillStyle = 'rgba(96,70,44,.85)';
    ctx.beginPath(); ctx.ellipse(x, y + r * 0.5, r * 1.0, r * 0.38, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(160,128,90,.7)';
    for (let i = 0; i < 5; i++) {
      const a = now / 160 + ph + i * 1.3, k = (now / 420 + i * 0.2 + ph) % 1;
      circle(ctx, x + Math.cos(a) * r * (0.5 + k * 0.6), y + r * 0.4 - k * r * 0.9, Math.max(1, r * 0.12 * (1 - k)));
      ctx.fill();
    }
    ctx.restore();
  }

  function drawKind(ctx, e, x, y, r, hx, hy, now, ph, dark) {
    const t = e.type;
    if (t === 'healer') {
      ctx.fillStyle = '#b8f0a0'; ctx.shadowColor = '#7fe08a'; ctx.shadowBlur = 6;
      const w = r * 0.13, l = r * 0.36;
      ctx.fillRect(x - w, y - l + r * 0.05, w * 2, l * 2); ctx.fillRect(x - l, y - w + r * 0.05, l * 2, w * 2);
      ctx.shadowBlur = 0;
      const k = ((now / 1000 + (e.timers && e.timers.heal || 0)) % 1);
      ctx.strokeStyle = 'rgba(160,240,150,' + (0.5 * (1 - k)).toFixed(3) + ')'; ctx.lineWidth = 1.5;
      circle(ctx, x, y, r * (1 + k * 0.8)); ctx.stroke();
    } else if (t === 'splitter' || t === 'mini') {
      ctx.strokeStyle = 'rgba(255,220,240,.55)'; ctx.lineWidth = Math.max(1, r * 0.09);
      ctx.beginPath(); ctx.moveTo(x, y - r * 1.2); ctx.lineTo(x - r * 0.15, y - r * 0.6); ctx.lineTo(x + r * 0.12, y - r * 0.1); ctx.lineTo(x - r * 0.1, y + r * 0.5); ctx.stroke();
    } else if (t === 'stealth') {
      ctx.fillStyle = shade(dark, -0.25);
      ctx.beginPath(); ctx.moveTo(hx - r * 0.6, hy + r * 0.25); ctx.quadraticCurveTo(hx, hy - r * 1.1, hx + r * 0.6, hy + r * 0.25); ctx.lineTo(hx + r * 0.42, hy + r * 0.1); ctx.quadraticCurveTo(hx, hy - r * 0.6, hx - r * 0.42, hy + r * 0.1); ctx.closePath(); ctx.fill();
    } else if (t === 'burrower') {
      ctx.fillStyle = '#d8cbb0';
      for (const s of [-1, 1]) {
        const bx = x + s * r * 0.9, by = y + r * 0.35;
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(bx + s * i * r * 0.1, by); ctx.lineTo(bx + s * (i * r * 0.1 + r * 0.12), by + r * 0.3); ctx.lineTo(bx + s * (i * r * 0.1 - r * 0.04), by + r * 0.06); ctx.closePath(); ctx.fill(); }
      }
    } else if (t === 'shield') {
      ctx.fillStyle = '#8fa8c8'; ctx.strokeStyle = '#dfe8f4'; ctx.lineWidth = Math.max(1, r * 0.08);
      const sx = x + r * 0.7, sy = y + r * 0.1;
      ctx.beginPath(); ctx.moveTo(sx, sy - r * 0.55); ctx.lineTo(sx + r * 0.42, sy - r * 0.38); ctx.lineTo(sx + r * 0.36, sy + r * 0.2); ctx.lineTo(sx, sy + r * 0.55); ctx.lineTo(sx - r * 0.36, sy + r * 0.2); ctx.lineTo(sx - r * 0.42, sy - r * 0.38); ctx.closePath(); ctx.fill(); ctx.stroke();
      const k = (now / 1600 + ph) % 1;
      ctx.strokeStyle = 'rgba(150,205,255,' + (0.35 * (1 - k)).toFixed(3) + ')'; ctx.lineWidth = 1;
      circle(ctx, x, y, r * (1.2 + k)); ctx.stroke();
    }
    if (e.plate > 0 || t === 'armored') {
      ctx.strokeStyle = '#b8b2a6'; ctx.lineWidth = Math.max(1.5, r * 0.14);
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x, y - r * 0.15 + i * r * 0.3, r * 0.6, Math.PI * 0.15, Math.PI * 0.85, true); ctx.stroke(); }
      ctx.fillStyle = '#9a948a';
      ctx.beginPath(); ctx.arc(hx, hy, r * 0.52, Math.PI * 1.05, Math.PI * 1.95); ctx.lineTo(hx + r * 0.5, hy - r * 0.05); ctx.lineTo(hx - r * 0.5, hy - r * 0.05); ctx.closePath(); ctx.fill();
    }
    if (e.elite) {
      ctx.fillStyle = '#ffd66e';
      const sx = x - r * 0.75, sy = y - r * 1.25;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.12 : r * 0.28; ctx.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill();
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
  const PROJ_COL = { unicorn: '#c9a4ff', pegasus: '#bff4ee', earth: '#e3a95b', bat: '#ff5a7a', swarm: '#c9b8ff', crystal: '#9fe6ff' };
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
    const base = f.big ? 16 : f.crit ? 15 : f.dim ? 9.5 : 11;
    const size = Math.round((base * Math.max(0.75, sc) + 3) * pop);
    ctx.font = '800 ' + size + 'px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const y = sy - 6 - k * 30 * Math.max(0.7, sc);
    const s = f.crit ? f.s + '!' : f.s;
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,8,18,.85)';
    ctx.strokeText(s, sx + jit * sc, y);
    ctx.fillStyle = f.crit ? '#ffe066' : f.dim ? 'rgba(170,166,186,.85)' : f.big ? '#ffb4a8' : '#f3f0fb';
    ctx.fillText(s, sx + jit * sc, y);
  }

  function drawFx(ctx, S, f) {
    if (f.rc && f._th === undefined) { f._th = themeOf(f.rc); if (f._th !== 'classic' && f.c) f.c = FXT[f._th].c; }
    const k = f.t / f.life, sc = View.sc;
    const [sx, sy] = View.toScreen(f.x || 0, f.y || 0);
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - k);
    switch (f.k) {
      case 'ring': case 'stomp':
        ctx.strokeStyle = f.c; ctx.lineWidth = f.k === 'stomp' ? 3 : 2;
        circle(ctx, sx, sy, f.r * sc * (f.k === 'stomp' ? 0.4 + 0.6 * k : 0.3 + 0.7 * k)); ctx.stroke();
        if (f._th && f._th !== 'classic') {
          const T = FXT[f._th], img = glyph(T.glyph, T.c2 === '#2a1a40' ? T.c : T.c2), rr = f.r * sc * (f.k === 'stomp' ? 0.4 + 0.6 * k : 0.3 + 0.7 * k);
          for (let i = 0; i < 8; i++) { const an = i * 0.785 + (f.seed || 0) + k; blit(ctx, img, sx + Math.cos(an) * rr, sy + Math.sin(an) * rr, Math.max(4, 9 * sc) * (1 - k * 0.4), 1); }
        }
        break;
      case 'heal': {
        ctx.strokeStyle = 'rgba(150,240,140,.8)'; ctx.lineWidth = 2;
        circle(ctx, sx, sy, f.r * sc * (0.2 + 0.8 * k)); ctx.stroke();
        ctx.fillStyle = 'rgba(180,250,170,.9)';
        for (let i = 0; i < 6; i++) {
          const a = i * Math.PI / 3, rr = f.r * sc * 0.6 * k, px = sx + Math.cos(a) * rr, py = sy + Math.sin(a) * rr - k * 10;
          ctx.fillRect(px - 1, py - 3.5, 2, 7); ctx.fillRect(px - 3.5, py - 1, 7, 2);
        }
        break;
      }
      case 'shieldpop': {
        ctx.strokeStyle = 'rgba(190,225,255,.9)'; ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
          const a = i * Math.PI / 4 + 0.2, r0 = f.r * sc * (0.9 + k * 0.8);
          ctx.beginPath(); ctx.moveTo(sx + Math.cos(a) * r0, sy + Math.sin(a) * r0); ctx.lineTo(sx + Math.cos(a + 0.3) * r0 * 0.92, sy + Math.sin(a + 0.3) * r0 * 0.92); ctx.stroke();
        }
        break;
      }
      case 'dust': {
        ctx.fillStyle = 'rgba(150,118,80,.75)';
        for (let i = 0; i < 7; i++) {
          const a = (f.seed || 0) + i * 0.9, rr = f.r * sc * (0.3 + k * 0.9);
          circle(ctx, sx + Math.cos(a) * rr, sy + Math.sin(a) * rr * 0.5 - k * 6, f.r * sc * 0.22 * (1 - k * 0.5)); ctx.fill();
        }
        break;
      }
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
      case 'sonar':
        ctx.strokeStyle = f.c; ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) { const q = (k + i / 3) % 1; ctx.globalAlpha = Math.max(0, 1 - k) * (1 - q); circle(ctx, sx, sy, f.r * sc * q); ctx.stroke(); }
        break;
      case 'bite':
        ctx.strokeStyle = f.c; ctx.lineWidth = 2; ctx.lineCap = 'round';
        for (const s2 of [-1, 1]) {
          const o = (6 + 8 * (1 - k)) * Math.max(0.7, sc);
          ctx.beginPath(); ctx.moveTo(sx - 5 * sc, sy + s2 * o); ctx.lineTo(sx, sy + s2 * o * 0.3); ctx.lineTo(sx + 5 * sc, sy + s2 * o); ctx.stroke();
        }
        break;
      case 'bloodmoon': {
        ctx.fillStyle = 'rgba(255,58,92,.18)';
        circle(ctx, sx, sy, f.r * sc); ctx.fill();
        ctx.fillStyle = '#ff3a5c'; ctx.shadowColor = '#ff3a5c'; ctx.shadowBlur = 16;
        circle(ctx, sx, sy - 40 * sc - k * 10, 10 * Math.max(0.7, sc)); ctx.fill();
        break;
      }
      case 'screech':
        ctx.strokeStyle = f.c; ctx.lineWidth = 2.5;
        for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(sx, sy, f.r * sc * (0.2 + 0.8 * k) * (1 - i * 0.12), -0.6 + i, 0.6 + i); ctx.stroke(); ctx.beginPath(); ctx.arc(sx, sy, f.r * sc * (0.2 + 0.8 * k) * (1 - i * 0.12), Math.PI - 0.6 + i, Math.PI + 0.6 + i); ctx.stroke(); }
        break;
      case 'shards': {
        const rng = C.mulberry((f.seed || 1) * 17 + 3);
        ctx.fillStyle = f.c; ctx.shadowColor = f.c; ctx.shadowBlur = 8;
        for (let i = 0; i < 7; i++) {
          const a = rng() * Math.PI * 2, v = f.r * sc * (0.3 + 0.7 * k) * (0.5 + rng() * 0.5);
          const px = sx + Math.cos(a) * v, py = sy + Math.sin(a) * v, s2 = (3 + rng() * 3) * Math.max(0.7, sc);
          ctx.beginPath(); ctx.moveTo(px + Math.cos(a) * s2 * 1.6, py + Math.sin(a) * s2 * 1.6); ctx.lineTo(px - Math.sin(a) * s2 * 0.5, py + Math.cos(a) * s2 * 0.5); ctx.lineTo(px + Math.sin(a) * s2 * 0.5, py - Math.cos(a) * s2 * 0.5); ctx.closePath(); ctx.fill();
        }
        break;
      }
      case 'chorus': {
        const cols = ['#9fe6ff', '#d68bff', '#ffb0f0'];
        cols.forEach((c, i) => { ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.setLineDash([4, 6]); circle(ctx, sx, sy, f.r * sc * Math.min(1, k * 1.4 + i * 0.1)); ctx.stroke(); });
        ctx.setLineDash([]);
        break;
      }
      case 'wallpulse':
        ctx.fillStyle = 'rgba(159,230,255,.25)'; ctx.strokeStyle = '#bff4ff'; ctx.lineWidth = 2;
        circle(ctx, sx, sy, f.r * sc * (0.6 + 0.4 * k)); ctx.fill(); ctx.stroke(); break;
      case 'cataclysm': {
        const rng = C.mulberry((f.seed || 1) * 29 + 11);
        const grow = Math.min(1, k * 3);
        ctx.fillStyle = 'rgba(214,139,255,.2)'; circle(ctx, sx, sy, f.r * sc * grow); ctx.fill();
        ctx.shadowColor = '#d68bff'; ctx.shadowBlur = 14;
        for (let i = 0; i < 6; i++) {
          const a = -Math.PI / 2 + (rng() - 0.5) * 1.8, h = f.r * sc * (0.5 + rng() * 0.6) * grow, w2 = (5 + rng() * 6) * Math.max(0.7, sc);
          const bx = sx + (rng() - 0.5) * f.r * sc * 0.8, by = sy + (rng() - 0.3) * f.r * sc * 0.4;
          ctx.fillStyle = i % 2 ? '#d68bff' : '#9fe6ff';
          ctx.beginPath(); ctx.moveTo(bx - w2, by); ctx.lineTo(bx + Math.cos(a) * h, by + Math.sin(a) * h); ctx.lineTo(bx + w2, by); ctx.closePath(); ctx.fill();
        }
        break;
      }
      case 'nova': {
        const R = f.r * sc * (0.25 + 0.75 * Math.min(1, k * 2));
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, Math.max(1, R));
        g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(0.4, f.c); g.addColorStop(1, 'rgba(122,92,255,0)');
        ctx.fillStyle = g; circle(ctx, sx, sy, R); ctx.fill();
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * Math.PI * 2 + k * 2, r = R * 0.9;
          starShape(ctx, sx + Math.cos(a) * r, sy + Math.sin(a) * r, 6 * Math.max(0.6, sc), i % 2 ? f.c : f.c2);
        }
        break;
      }
      case 'quake': {
        ctx.globalAlpha = Math.min(1, (1 - k) * 3) * 0.8;
        const rng = C.mulberry(Math.floor(f.t * 8) + 5);
        ctx.fillStyle = 'rgba(140,100,60,.22)'; circle(ctx, sx, sy, f.r * sc); ctx.fill();
        ctx.strokeStyle = 'rgba(90,60,30,.9)'; ctx.lineWidth = 2;
        for (let i = 0; i < 7; i++) {
          const a = i / 7 * Math.PI * 2 + rng() * 0.4;
          ctx.beginPath(); ctx.moveTo(sx, sy);
          let px = sx, py = sy;
          for (let j = 1; j <= 3; j++) { const rr = f.r * sc * j / 3.2; px = sx + Math.cos(a + (rng() - 0.5) * 0.5) * rr; py = sy + Math.sin(a + (rng() - 0.5) * 0.5) * rr; ctx.lineTo(px, py); }
          ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(255,200,120,.5)'; circle(ctx, sx, sy, f.r * sc * ((f.t * 2) % 1)); ctx.stroke();
        break;
      }
      case 'roar': {
        ctx.strokeStyle = '#ff6a3a'; ctx.lineWidth = 3;
        for (let i = 0; i < 3; i++) { const q = Math.min(1, k * 1.4 + i * 0.12); ctx.globalAlpha = Math.max(0, 1 - q) * 0.8; circle(ctx, sx, sy, f.r * sc * q); ctx.stroke(); }
        break;
      }
      case 'levelup': {
        const H = S.hero;
        const [hx, hy] = H ? View.toScreen(H.x, H.y) : [sx, sy];
        ctx.shadowColor = '#ffe066'; ctx.shadowBlur = 16;
        ctx.strokeStyle = f.rank ? '#ffe066' : '#c9b8ff'; ctx.lineWidth = 3;
        circle(ctx, hx, hy, (20 + 60 * k) * Math.max(0.6, sc)); ctx.stroke();
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + k * 3; starShape(ctx, hx + Math.cos(a) * 34 * sc, hy - 20 * sc + Math.sin(a) * 18 * sc - k * 30 * sc, 5 * Math.max(0.7, sc), '#ffe066'); }
        ctx.font = '800 ' + Math.round(13 + 6 * Math.max(0.6, sc)) + 'px system-ui'; ctx.textAlign = 'center';
        ctx.fillStyle = f.rank ? '#ffe066' : '#f3f0fb';
        ctx.fillText(f.rank ? 'RANK UP!' : 'LEVEL UP!', hx, hy - 50 * Math.max(0.7, sc) - k * 20);
        break;
      }
      case 'starup': {
        const R = 260 * sc * (0.2 + 0.8 * Math.min(1, k * 1.6));
        ctx.globalAlpha = Math.max(0, 1 - k) * 0.9;
        ctx.shadowColor = '#ffe9a8'; ctx.shadowBlur = 24;
        ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 4 * Math.max(0.6, sc);
        circle(ctx, sx, sy, R); ctx.stroke();
        for (let i = 0; i < 12; i++) {
          const a = i / 12 * Math.PI * 2 + k * 1.2, r = R * (0.55 + 0.1 * (i % 3));
          starShape(ctx, sx + Math.cos(a) * r, sy + Math.sin(a) * r, (9 + (i % 3) * 4) * Math.max(0.6, sc), i % 2 ? '#ffe066' : '#c9b8ff');
        }
        starShape(ctx, sx, sy, 46 * Math.max(0.6, sc) * (1 + 0.2 * Math.sin(k * 12)), '#ffe066');
        break;
      }
    }
    ctx.restore();
  }

  function starShape(ctx, x, y, r, c) {
    ctx.fillStyle = c;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
      if (i) ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill();
  }

  function drawProj(ctx, p, sc) {
    if (p.kind === 'hero') { drawHeroProj(ctx, p, sc); return; }
    const col = PROJ_COL[p.kind] || '#fff';
    const tr = p._tr || (p._tr = []);
    tr.push(p.x, p.y);
    if (tr.length > 12) tr.splice(0, 2);
    const rr = (p.kind === 'unicorn' ? 5 : p.kind === 'crystal' ? 4 : 3) * Math.max(0.7, sc);
    const th = themeOf(p.kind);
    if (th !== 'classic') { drawThemedProj(ctx, p, tr, rr, th); return; }
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
    if (p.kind === 'bat' || p.kind === 'swarm') {
      const a = View.angle(p.a || 0), w = rr * 2.2, fl = Math.sin(performance.now() / 50 + (p.e ? p.e.id : 0)) * 0.6;
      ctx.translate(sx, sy); ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(rr, 0);
      ctx.lineTo(-rr * 0.4, -w * (0.6 + fl * 0.4)); ctx.lineTo(-rr * 0.2, -rr * 0.3);
      ctx.lineTo(-rr, 0);
      ctx.lineTo(-rr * 0.2, rr * 0.3); ctx.lineTo(-rr * 0.4, w * (0.6 + fl * 0.4));
      ctx.closePath(); ctx.fill();
    } else if (p.kind === 'crystal') {
      const a = View.angle(p.a || 0);
      ctx.translate(sx, sy); ctx.rotate(a);
      ctx.beginPath(); ctx.moveTo(rr * 1.8, 0); ctx.lineTo(0, -rr * 0.8); ctx.lineTo(-rr * 1.2, 0); ctx.lineTo(0, rr * 0.8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      ctx.beginPath(); ctx.moveTo(rr * 1.6, 0); ctx.lineTo(0, -rr * 0.5); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
    } else { circle(ctx, sx, sy, rr); ctx.fill(); }
    ctx.restore();
  }

  function drawThemedProj(ctx, p, tr, rr, th) {
    const T = FXT[th], now = performance.now(), n = tr.length;
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 2; i < n; i += 2) {
      const [ax, ay] = View.toScreen(tr[i - 2], tr[i - 1]);
      const [bx, by] = View.toScreen(tr[i], tr[i + 1]);
      ctx.globalAlpha = 0.1 + 0.55 * i / n;
      ctx.strokeStyle = th === 'candy' ? T.pal[(i / 2) % T.pal.length] : T.trail;
      ctx.lineWidth = rr * (th === 'shadow' ? 2.4 : 1.8) * i / n;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (n >= 6) {
      const img = glyph(T.glyph, th === 'shadow' ? T.c : T.c2), seed = p.e ? p.e.id : 0;
      for (let i = 0; i < n - 4; i += 4) {
        const [gx, gy] = View.toScreen(tr[i], tr[i + 1]), q = i / n;
        const jx = Math.sin(now / 90 + i + seed) * rr * 0.8, jy = th === 'ember' ? -rr * (1 - q) * 1.4 : Math.cos(now / 110 + i) * rr * 0.8;
        blit(ctx, img, gx + jx, gy + jy, rr * (th === 'frost' ? 2.2 : 1.8) * (0.4 + q), 0.25 + 0.6 * q);
      }
    }
    const [sx, sy] = View.toScreen(p.x, p.y), hs = rr * (th === 'ember' || th === 'shadow' ? 4.4 : 3.2);
    const img = projHead(th);
    if (th === 'starlight' || th === 'frost' || th === 'candy') {
      ctx.translate(sx, sy); ctx.rotate(now / (th === 'candy' ? 160 : 260));
      ctx.drawImage(img, -hs / 2, -hs / 2, hs, hs);
    } else ctx.drawImage(img, sx - hs / 2, sy - hs / 2, hs, hs);
    ctx.restore();
  }

  function drawHeroProj(ctx, p, sc) {
    const [sx, sy] = View.toScreen(p.x, p.y), rr = 5 * Math.max(0.7, sc), a = View.angle(p.a || 0);
    ctx.save();
    ctx.fillStyle = p.c; ctx.shadowColor = p.c; ctx.shadowBlur = 12;
    if (p.hk === 'nova') starShape(ctx, sx, sy, rr * 1.5, p.c);
    else if (p.hk === 'duskfang') {
      ctx.translate(sx, sy); ctx.rotate(a);
      ctx.beginPath(); ctx.arc(0, 0, rr * 1.4, -1.2, 1.2); ctx.arc(-rr * 0.6, 0, rr * 1.1, 1.1, -1.1, true); ctx.closePath(); ctx.fill();
    } else {
      ctx.translate(sx, sy); ctx.rotate(a);
      ctx.beginPath(); ctx.moveTo(rr * 2, 0); ctx.lineTo(-rr, -rr * 0.5); ctx.lineTo(-rr * 0.4, 0); ctx.lineTo(-rr, rr * 0.5); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  function heroOpts(id) {
    const d = C.HEROES[id];
    return {
      body: d.body, mane: d.mane, horn: !!d.horn, wings: !!d.wings, batWings: !!d.batWings, tufts: !!d.batWings, slit: d.batWings ? '#ff5c7a' : '',
      glow: d.accent, mark: d.accent, cape: d.cape, accent: d.accent, crown: d.crown, seed: 7,
    };
  }
  function drawHero(ctx, S, ui, now) {
    const h = S.hero;
    if (!h || !h.id) return;
    const d = C.HEROES[h.id], st = C.stats(h), sc = View.sc, W = C.WORLD;
    const [sx, sy] = View.toScreen(h.x, h.y);
    const size = W.towerR * 3.2 * sc;
    const selHero = ui.heroSel;
    ctx.save();
    const ar = st.auraR * sc;
    ctx.globalAlpha = selHero || ui.showAll ? 0.9 : 0.45;
    ctx.fillStyle = d.accent ? d.accent + '14' : 'rgba(255,255,255,.06)';
    ctx.strokeStyle = d.cape; ctx.lineWidth = 1.5; ctx.setLineDash([6, 8]); ctx.lineDashOffset = -now / 60;
    circle(ctx, sx, sy, ar); ctx.fill(); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    if (selHero) {
      drawRange(ctx, h.x, h.y, st.range, true, false, 0);
      if (Math.hypot(h.tx - h.x, h.ty - h.y) > 2) {
        const [tx, ty] = View.toScreen(h.tx, h.ty);
        ctx.save(); ctx.strokeStyle = 'rgba(255,224,102,.8)'; ctx.lineWidth = 2; ctx.setLineDash([4, 5]);
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]);
        circle(ctx, tx, ty, 8 * Math.max(0.7, sc)); ctx.stroke();
        ctx.restore();
      }
    }
    ctx.save();
    ctx.strokeStyle = selHero ? '#ffe066' : 'rgba(255,224,102,.45)'; ctx.lineWidth = selHero ? 2.5 : 1.5;
    ctx.beginPath(); ctx.ellipse(sx, sy + size * 0.42, size * 0.55, size * 0.18, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    const hop = h.anim > 0 ? Math.min(1, h.anim * 4) * 0.5 : h.moving ? Math.abs(Math.sin(h.walk * 9)) * 0.3 : 0;
    ctx.save();
    if (h.stunT > 0) ctx.globalAlpha = 0.75;
    if (h.frenzyT > 0) { ctx.shadowColor = '#ff3a5c'; ctx.shadowBlur = 18; }
    drawPony(ctx, sx, sy, size, Object.assign(heroOpts(h.id), { angle: View.angle(h.face || 0), now, hop }));
    ctx.restore();
    const prog = C.heroProg(h), maxed = prog.lv >= C.HERO_TUNE.maxLv;
    const fs = Math.round(Math.max(10, 9 + 4 * sc));
    ctx.save();
    ctx.font = '800 ' + fs + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const label = d.name + '  Lv ' + prog.lv;
    const tw = ctx.measureText(label).width + 14, ty = sy - size * 0.95;
    ctx.fillStyle = 'rgba(12,10,22,.82)';
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(sx - tw / 2, ty - fs * 0.75, tw, fs * 1.5 + 5, 6); else ctx.rect(sx - tw / 2, ty - fs * 0.75, tw, fs * 1.5 + 5); ctx.fill();
    ctx.strokeStyle = d.cape; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#f3f0fb'; ctx.fillText(label, sx, ty);
    const bw = tw - 10, by = ty + fs * 0.62;
    ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(sx - bw / 2, by, bw, 3);
    ctx.fillStyle = maxed ? '#ffe066' : '#9fe6ff'; ctx.fillRect(sx - bw / 2, by, bw * (maxed ? 1 : Math.min(1, prog.xp / C.xpNeed(prog.lv))), 3);
    if (h.stunT > 0) {
      for (let i = 0; i < 3; i++) { const a = now / 200 + i * 2.1; starShape(ctx, sx + Math.cos(a) * size * 0.35, sy - size * 0.55 + Math.sin(a) * size * 0.1, 4 * Math.max(0.7, sc), '#ffe066'); }
    }
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

  function paintMap(g, cw, ch, map, mini, season) {
    const P = seasonPal(map.palette, season), D = map.decor, srng = C.mulberry(D.seed + 991);
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
          if (season) { treeDeco(g, season, tx, ty + 10 * k, 30 * sc + 20 * k, 24 * sc + 12 * k, srng); g.fillStyle = P.tree; }
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
    if (season) drawSeason(g, cw, ch, map, season, mini);
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

  function drawCrystalWorks(ctx, S, sel, now) {
    const map = C.mapOf(S), sc = View.sc;
    for (const t of S.towers) {
      if (t.race !== 'crystal') continue;
      const s = C.stats(t);
      const [sx, sy] = View.toScreen(t.x, t.y);
      if (map.dark && s.lightR > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const rr = s.lightR * sc;
        const g = ctx.createRadialGradient(sx, sy, rr * 0.1, sx, sy, rr);
        g.addColorStop(0, 'rgba(127,232,255,.22)'); g.addColorStop(0.7, 'rgba(127,160,255,.08)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; circle(ctx, sx, sy, rr); ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.strokeStyle = 'rgba(127,232,255,.35)'; ctx.lineWidth = 1; ctx.setLineDash([3, 7]);
        circle(ctx, sx, sy, rr); ctx.stroke();
        ctx.restore();
      }
      if (t === sel && s.auraR > 0) {
        ctx.save();
        ctx.strokeStyle = 'rgba(214,139,255,.55)'; ctx.lineWidth = 1.2; ctx.setLineDash([2, 5]);
        circle(ctx, sx, sy, s.auraR * sc); ctx.stroke();
        ctx.restore();
      }
      if (s.wall > 0) {
        const W2 = t.wallPt || (t.wallPt = C.nearestOnMap(map, t.x, t.y));
        const [wx, wy] = View.toScreen(W2.x, W2.y);
        const R = s.wallR * sc;
        ctx.save();
        ctx.fillStyle = 'rgba(159,230,255,.1)'; ctx.strokeStyle = 'rgba(159,230,255,.45)'; ctx.lineWidth = 1;
        circle(ctx, wx, wy, R); ctx.fill(); ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
        const rng = C.mulberry(t.id * 53 + 5);
        ctx.shadowColor = '#9fe6ff'; ctx.shadowBlur = 6;
        const n = 5 + Math.round(s.wall * 10);
        for (let i = 0; i < n; i++) {
          const a = rng() * Math.PI * 2, d = Math.sqrt(rng()) * R * 0.85;
          const px = wx + Math.cos(a) * d, py = wy + Math.sin(a) * d;
          const h = (6 + rng() * 8) * Math.max(0.7, sc) * (1 + Math.sin(now / 500 + i) * 0.08), w = h * 0.35;
          ctx.fillStyle = i % 3 === 0 ? 'rgba(214,139,255,.8)' : 'rgba(159,230,255,.85)';
          ctx.beginPath(); ctx.moveTo(px - w, py); ctx.lineTo(px, py - h); ctx.lineTo(px + w, py); ctx.lineTo(px, py + w * 0.6); ctx.closePath(); ctx.fill();
        }
        ctx.restore();
      }
    }
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
    View, drawPony, drawDNB, shade, drawRange, heroOpts,
    heroIcon(c, id, now) {
      const g = c.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, c.width, c.height);
      drawPony(g, c.width / 2, c.height * 0.58, c.width * 0.62, Object.assign(heroOpts(id), { angle: Math.PI / 2, now: now || 0 }));
    },
    bg: null, bgKey: '', shakeT: 0, shakeAmp: 0, bossBar: false,
    cos: Cos,
    baseOpts(race, t) {
      const R = C.RACES[race];
      return {
        body: R.body, mane: R.mane, horn: race === 'unicorn', wings: race === 'pegasus', glow: R.accent, mark: R.accent, seed: t ? t.id : 0,
        batWings: race === 'bat', tufts: race === 'bat', slit: race === 'bat' ? '#ffcf4a' : '', gem: race === 'crystal',
      };
    },
    lookOpts(race, L, t) {
      const o = this.baseOpts(race, t);
      if (!L) return o;
      if (L.coat) { o.body = L.coat.body; if (L.coat.spots) o.spots = L.coat.spots; }
      if (L.mane) { o.mane = L.mane.mane; if (L.mane.streak) o.streak = L.mane.streak; if (L.mane.rainbow) o.rainbow = true; }
      if (L.acc) { o.acc = L.acc.acc; o.accCol = L.acc.col; }
      if (L.aura) { o.aura = L.aura.aura; o.auraCol = L.aura.col; }
      return o;
    },
    ponyOpts(race, t) { return this.lookOpts(race, Cos.looks[race], t); },
    ponyPreview(c, race, now, look, opt) {
      const g = c.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, c.width, c.height);
      const o = opt || {};
      const ang = o.spin ? Math.PI / 2 + Math.sin(now / 1400) * 1.1 : (o.angle === undefined ? Math.PI / 2 : o.angle);
      g.fillStyle = 'rgba(255,255,255,.04)';
      g.beginPath(); g.ellipse(c.width / 2, c.height * 0.8, c.width * 0.32, c.height * 0.07, 0, 0, Math.PI * 2); g.fill();
      if (o.sil) g.filter = 'brightness(0) opacity(.55)';
      drawPony(g, c.width / 2, c.height * 0.6, c.width * (o.scale || 0.5), Object.assign(this.lookOpts(race, look === undefined ? Cos.looks[race] : look, null), { angle: ang, now, seed: 3, hop: o.hop ? Math.max(0, Math.sin(now / 300)) * 0.5 : 0 }));
      g.filter = 'none';
    },
    fxPreview(c, theme, now) {
      const g = c.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, c.width, c.height);
      const w = c.width, h = c.height, ph = (now % 1200) / 1200, x0 = w * 0.12, x1 = w * 0.84;
      if (theme === 'classic' || !FXT[theme]) {
        const cols = ['#e8d36b', '#c08bff', '#7fd8ff'];
        cols.forEach((col, i) => {
          const q = frac(ph + i / 3), x = x0 + (x1 - x0) * q, y = h * (0.3 + 0.2 * i);
          g.strokeStyle = col; g.globalAlpha = 0.5; g.lineWidth = 3; g.lineCap = 'round';
          g.beginPath(); g.moveTo(Math.max(x0, x - 30), y); g.lineTo(x, y); g.stroke();
          g.globalAlpha = 1; g.fillStyle = col; g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.fill();
        });
        return;
      }
      const T = FXT[theme], y = h / 2, x = x0 + (x1 - x0) * Math.min(1, ph * 1.4);
      if (ph < 0.71) {
        for (let i = 0; i < 6; i++) {
          const tx = x - i * 9;
          if (tx < x0) break;
          blit(g, glyph(T.glyph, theme === 'shadow' ? T.c : T.c2), tx, y + Math.sin(now / 90 + i) * 3, 12 - i, 0.8 - i * 0.12);
        }
        g.save(); g.translate(x, y); if (theme !== 'ember' && theme !== 'shadow') g.rotate(now / 260); g.drawImage(projHead(theme), -12, -12, 24, 24); g.restore();
      } else {
        const k = (ph - 0.71) / 0.29, a = 1 - k;
        for (let j = 0; j < 7; j++) { const an = j * 0.9; blit(g, glyph(T.glyph, T.pal[j % T.pal.length]), x1 + Math.cos(an) * 22 * k, y + Math.sin(an) * 22 * k, 12 * (1 - k * 0.4), a); }
      }
    },
    kick(amp, dur) { this.shakeAmp = Math.max(this.shakeAmp, amp); this.shakeT = Math.max(this.shakeT, dur || 0.6); },
    dnbIcon(c, type, bossDef, now) {
      const g = c.getContext('2d');
      const d = C.ENEMIES[type];
      g.clearRect(0, 0, c.width, c.height);
      const e = {
        type, hit: 0, seed: 1, burrowT: 0, flying: !!d.flying, magical: !!d.magical, boss: type === 'boss', noBar: true, swarm: !!d.swarm, plate: d.plate || 0, stealth: !!d.stealth, seen: true, timers: {}, sh: 0, shMax: 0,
        color: bossDef ? bossDef.color : d.color, dark: bossDef ? bossDef.dark : d.dark, hp: 1, hpMax: 1, stunT: 0, slow: 0, hexT: 0, dispelT: 0,
      };
      if (bossDef) {
        e.bossDef = bossDef;
        const tr = bossDef.tricks ? Object.keys(bossDef.tricks) : [bossDef.trick];
        if (tr.includes('flying') || tr.includes('fly') || tr.includes('phase')) e.flying = true;
        if (tr.includes('magical') || tr.includes('magic')) e.magical = true;
        if (tr.includes('armor')) e.armor = true;
        if (tr.includes('plate')) e.plate = 1;
        if (tr.includes('cloak')) e.stealth = true;
        if (tr.includes('bubble') || tr.includes('aegis')) { e.sh = 1; e.shMax = 1; }
      }
      const sz = c.width * (d.swarm ? 0.17 : d.child ? 0.2 : 0.26);
      drawDNB(g, e, c.width / 2, c.height * 0.6, sz, now || 0);
    },
    buildBg(cw, ch, dpr, map) {
      map = map || C.getMap('moonlit');
      const key = cw + 'x' + ch + 'x' + dpr + (View.portrait ? 'p' : 'l') + map.id + Cos.season;
      if (this.bgKey === key) return;
      this.bgKey = key;
      const mk = () => { const c = document.createElement('canvas'); c.width = Math.round(cw * dpr); c.height = Math.round(ch * dpr); const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); return [c, g]; };
      const [c, g] = mk();
      paintMap(g, cw, ch, map, false, Cos.season);
      this.bg = c;
      this.bridgeImg = null;
      if (map.bridges) { const [c2, g2] = mk(); drawBridges(g2, map, map.palette, View.sc); this.bridgeImg = c2; }
    },
    drawMapPreview(canvas, map, season) {
      const keep = { portrait: View.portrait, sc: View.sc, ox: View.ox, oy: View.oy, cw: View.cw, ch: View.ch };
      View.portrait = false;
      const along = canvas.width, across = canvas.height;
      View.sc = Math.min(along / W.L, across / W.W);
      View.ox = (canvas.width - W.L * View.sc) / 2; View.oy = (canvas.height - W.W * View.sc) / 2;
      const g = canvas.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, canvas.width, canvas.height);
      paintMap(g, canvas.width, canvas.height, map, true, season || '');
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
        const br = C.RACES[ui.placing].range, lr = ui.placing === 'crystal' ? 1 : C.lightFor(S, ui.ghost.x, ui.ghost.y);
        drawRange(ctx, ui.ghost.x, ui.ghost.y, br * lr, ok, false, lr < 1 ? br : 0);
      }
      if (ui.placing) {
        ctx.strokeStyle = 'rgba(227,91,106,.25)'; ctx.lineWidth = 1;
        for (const t of S.towers) { const [tx, ty] = View.toScreen(t.x, t.y); circle(ctx, tx, ty, W.minGap * sc); ctx.stroke(); }
      }
      drawCrystalWorks(ctx, S, sel, now);
      const list = S.towers.slice().sort((a, b) => View.toScreen(a.x, a.y)[1] - View.toScreen(b.x, b.y)[1]);
      for (const t of list) {
        const [sx, sy] = View.toScreen(t.x, t.y);
        const ring = C.chosenPaths(t).reduce((a, i) => a + t.paths[i], 0);
        if (t === sel) { ctx.strokeStyle = '#4fd1c5'; ctx.lineWidth = 2; circle(ctx, sx, sy, W.towerR * sc * 1.25); ctx.stroke(); }
        if (t.id === ui.hoverId && t !== sel) { ctx.strokeStyle = 'rgba(79,209,197,.45)'; ctx.lineWidth = 1.5; circle(ctx, sx, sy, W.towerR * sc * 1.25); ctx.stroke(); }
        if (ring >= 10) { ctx.strokeStyle = ring >= 20 ? 'rgba(227,193,91,.7)' : 'rgba(169,139,255,.5)'; ctx.lineWidth = 1.5; circle(ctx, sx, sy + W.towerR * sc * 0.45, W.towerR * sc * 0.9); ctx.stroke(); }
        drawPony(ctx, sx, sy, W.towerR * 2.3 * sc, Object.assign(this.ponyOpts(t.race, t), { angle: View.angle(t.face), now, hop: t.anim > 0 ? Math.min(1, t.anim * 4) : 0 }));
      }
      if (Cos.names) for (const t of list) { const [sx, sy] = View.toScreen(t.x, t.y); drawLabel(ctx, t, sx, sy, W.towerR * 2.3 * sc, sc); }
      drawHero(ctx, S, ui, now);
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
      trackImpacts(S, now);
      if (IMP.length) drawImpacts(ctx, now, sc);
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
        ctx.fillText('Lives ' + Math.max(0, S.run.lives) + ' / ' + (S.run.livesMax || C.LIVES) + '   +' + C.fmt(S.run.earned) + ' this wave', 10, ch - 12);
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
