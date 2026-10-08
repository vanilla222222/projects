const World = (() => {
  const PALETTES = [
    { name: "Morning", skyTop: "#7ec8e3", skyBot: "#ffe2b0", sun: "#fff6d5", glow: "#ffe9b8", far: "#e7b391", mid: "#d08a5e", near: "#b56b42", groundTop: "#eab074", ground: "#d6955b", groundDark: "#b87542", strata: "#c98450", cloud: "#ffffff", tint: "#ffffff", stars: 0 },
    { name: "High Noon", skyTop: "#4fa8de", skyBot: "#bfe6f5", sun: "#fffbe8", glow: "#fff7d0", far: "#d9a982", mid: "#c47f52", near: "#a65f37", groundTop: "#efb879", ground: "#dc9c60", groundDark: "#bd7a45", strata: "#cf8a55", cloud: "#ffffff", tint: "#ffffff", stars: 0 },
    { name: "Sunset", skyTop: "#5a3a7a", skyBot: "#ff9a5a", sun: "#ffd27a", glow: "#ff8a4c", far: "#b0607a", mid: "#8e4560", near: "#6b3248", groundTop: "#d98a5a", ground: "#b8674a", groundDark: "#93503a", strata: "#a65b42", cloud: "#ffb8a0", tint: "#ffe0d0", stars: 0.15 },
    { name: "Night", skyTop: "#0d1430", skyBot: "#2b3a6b", sun: "#f2f0ff", glow: "#8fa6ff", far: "#2e3a63", mid: "#232c50", near: "#1a2040", groundTop: "#5a5a8a", ground: "#45456e", groundDark: "#363658", strata: "#3e3e66", cloud: "#4a5688", tint: "#8c97d6", stars: 1 },
    { name: "Dawn", skyTop: "#3d5a9a", skyBot: "#ffb48a", sun: "#ffe0b0", glow: "#ffb08a", far: "#a8789a", mid: "#8a5a7a", near: "#6e4560", groundTop: "#d69a72", ground: "#b87a5c", groundDark: "#985f46", strata: "#a86a50", cloud: "#ffd0c0", tint: "#ffe8e0", stars: 0.3 },
  ];

  function hex(c) {
    const n = parseInt(c.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const cache = PALETTES.map((p) => {
    const o = {};
    for (const k in p) if (typeof p[k] === "string" && p[k][0] === "#") o[k] = hex(p[k]);
    return o;
  });

  function mix(a, b, t) {
    return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`;
  }

  function smooth(t) {
    return t * t * (3 - 2 * t);
  }

  function rand(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function ridge(seed, period, n, minH, maxH, mesa) {
    const r = rand(seed);
    const pts = [];
    let x = 0;
    while (x < period) {
      const w = period / n * (0.6 + r() * 0.8);
      const hgt = minH + r() * (maxH - minH);
      if (mesa && r() < 0.6) {
        pts.push([x, 0.25 * hgt]);
        pts.push([x + w * 0.18, hgt * 0.95]);
        pts.push([x + w * 0.22, hgt]);
        pts.push([x + w * 0.7, hgt]);
        pts.push([x + w * 0.76, hgt * 0.92]);
      } else {
        pts.push([x, hgt * 0.3]);
        pts.push([x + w * 0.45, hgt]);
        pts.push([x + w * 0.55, hgt * 0.96]);
      }
      x += w;
    }
    pts.push([period, pts[0][1]]);
    return pts;
  }

  class Background {
    constructor() {
      this.far = ridge(11, 2400, 5, 70, 150, true);
      this.mid = ridge(23, 1800, 6, 40, 110, true);
      this.near = ridge(37, 1400, 7, 20, 60, false);
      const r = rand(91);
      this.cacti = Array.from({ length: 9 }, () => ({ x: r() * 1400, h: 18 + r() * 26, s: r() }));
      this.clouds = Array.from({ length: 7 }, () => ({ x: r() * 2000, y: 30 + r() * 120, s: 0.6 + r() * 0.8 }));
      this.stars = Array.from({ length: 90 }, () => ({ x: r(), y: r(), s: 0.5 + r() * 1.4, p: r() * 6 }));
      this.pebbles = Array.from({ length: 50 }, () => ({ x: r() * 1000, y: r(), s: 1 + r() * 2.4 }));
      this.tufts = Array.from({ length: 8 }, () => ({ x: r() * 1600, s: 0.7 + r() * 0.8 }));
      this.birds = Array.from({ length: 3 }, () => ({ x: r() * 1600, y: 60 + r() * 60, p: r() * 6 }));
      this.offset = 0;
      this.cycleAt = 0;
      this.pal = {};
      this.paletteName = PALETTES[0].name;
      this.setCycle(0);
    }

    setCycle(dist) {
      const n = PALETTES.length;
      const f = ((dist / CONFIG.DAY_CYCLE) % 1 + 1) % 1 * n;
      const i = Math.floor(f);
      const raw = f - i;
      const t = smooth(Math.max(0, Math.min(1, (raw - 0.6) / 0.4)));
      const a = cache[i];
      const b = cache[(i + 1) % n];
      for (const k in a) this.pal[k] = mix(a[k], b[k], t);
      this.pal.stars = PALETTES[i].stars + (PALETTES[(i + 1) % n].stars - PALETTES[i].stars) * t;
      this.pal.tintK = this.pal.stars;
      this.sunT = f / n;
      this.paletteName = t < 0.5 ? PALETTES[i].name : PALETTES[(i + 1) % n].name;
    }

    update(dt, speed, dist) {
      this.offset += speed * dt;
      this.setCycle(dist);
    }

    layer(ctx, pts, period, par, baseY, scaleH, color, viewW) {
      const off = (this.offset * par) % period;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-10, baseY);
      for (let rep = -1; rep * period - off < viewW + period; rep++) {
        const ox = rep * period - off;
        if (ox > viewW + 10 || ox + period < -10) continue;
        for (const p of pts) ctx.lineTo(ox + p[0], baseY - p[1] * scaleH);
      }
      ctx.lineTo(viewW + 10, baseY);
      ctx.closePath();
      ctx.fill();
    }

    drawSky(ctx, v, time) {
      const P = this.pal;
      const top = -v.groundY;
      const g = ctx.createLinearGradient(0, top, 0, 0);
      g.addColorStop(0, P.skyTop);
      g.addColorStop(1, P.skyBot);
      ctx.fillStyle = g;
      ctx.fillRect(-20, top - 20, v.w + 40, v.groundY + 40);

      if (P.stars > 0.02) {
        ctx.save();
        for (const s of this.stars) {
          const tw = 0.6 + Math.sin(time * 2 + s.p) * 0.4;
          ctx.globalAlpha = P.stars * tw * 0.9;
          ctx.fillStyle = "#fff";
          ctx.fillRect(s.x * v.w, top + s.y * (v.groundY - 120), s.s, s.s);
        }
        ctx.restore();
      }

      const fp = (this.sunT * 5 + 0.4) % 5;
      const isMoon = fp > 3.4;
      const k = isMoon ? (fp - 3.4) / 1.6 : fp / 3.4;
      const sx = v.w * (0.1 + k * 0.8);
      const sy = -v.groundY * 0.25 - Math.sin(k * Math.PI) * Math.min(230, v.groundY * 0.6);
      ctx.save();
      const gl = ctx.createRadialGradient(sx, sy, 10, sx, sy, 140);
      gl.addColorStop(0, P.glow);
      gl.addColorStop(1, "rgba(255,255,255,0)");
      ctx.globalAlpha = isMoon ? 0.35 : 0.55;
      ctx.fillStyle = gl;
      ctx.fillRect(sx - 140, sy - 140, 280, 280);
      ctx.globalAlpha = 1;
      ctx.fillStyle = P.sun;
      ctx.beginPath();
      ctx.arc(sx, sy, isMoon ? 22 : 32, 0, Math.PI * 2);
      ctx.fill();
      if (isMoon) {
        ctx.fillStyle = "rgba(120,130,180,0.35)";
        ctx.beginPath();
        ctx.arc(sx - 7, sy - 5, 5, 0, Math.PI * 2);
        ctx.arc(sx + 6, sy + 7, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      ctx.save();
      ctx.fillStyle = P.cloud;
      ctx.globalAlpha = 0.75;
      const cp = 2000;
      for (const c of this.clouds) {
        const x = ((c.x - this.offset * 0.04 * c.s) % cp + cp) % cp - 150;
        if (x > v.w + 100) continue;
        const y = -v.groundY + c.y * Math.max(1, v.groundY / 300);
        const s = c.s;
        ctx.beginPath();
        ctx.ellipse(x, y, 46 * s, 12 * s, 0, 0, Math.PI * 2);
        ctx.ellipse(x - 18 * s, y - 6 * s, 20 * s, 13 * s, 0, 0, Math.PI * 2);
        ctx.ellipse(x + 12 * s, y - 10 * s, 24 * s, 16 * s, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = "rgba(40,25,30,0.55)";
      ctx.lineWidth = 1.6;
      ctx.lineCap = "round";
      for (const b of this.birds) {
        const x = ((b.x - this.offset * 0.08 + time * 30) % 1600 + 1600) % 1600 - 100;
        if (x > v.w + 20) continue;
        const y = -v.groundY * 0.55 + b.y * 0.5 + Math.sin(time + b.p) * 6;
        const f = Math.sin(time * 8 + b.p) * 4;
        ctx.beginPath();
        ctx.moveTo(x - 6, y - f);
        ctx.quadraticCurveTo(x - 3, y - 3, x, y);
        ctx.quadraticCurveTo(x + 3, y - 3, x + 6, y - f);
        ctx.stroke();
      }
      ctx.restore();
    }

    drawBack(ctx, v, time) {
      const P = this.pal;
      this.drawSky(ctx, v, time);
      const hs = Math.min(1.6, Math.max(1, v.groundY / 300));
      this.layer(ctx, this.far, 2400, 0.08, -24, hs, P.far, v.w);
      const hz = ctx.createLinearGradient(0, -90 * hs, 0, -10);
      hz.addColorStop(0, "rgba(255,255,255,0)");
      hz.addColorStop(1, P.skyBot);
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = hz;
      ctx.fillRect(-10, -90 * hs, v.w + 20, 80 * hs);
      ctx.restore();
      this.layer(ctx, this.mid, 1800, 0.2, -10, hs, P.mid, v.w);
      this.layer(ctx, this.near, 1400, 0.45, 0, hs, P.near, v.w);
      ctx.fillStyle = P.near;
      const off = (this.offset * 0.45) % 1400;
      for (let rep = -1; rep < 3; rep++) {
        for (const c of this.cacti) {
          const x = c.x + rep * 1400 - off;
          if (x < -20 || x > v.w + 20) continue;
          const h = c.h * hs;
          ctx.fillRect(x - 2.5, -h - 4, 5, h + 4);
          ctx.fillRect(x - 9, -h * 0.6 - 4, 4, h * 0.35);
          ctx.fillRect(x - 9, -h * 0.3 - 4, 9, 3.5);
          ctx.fillRect(x + 5, -h * 0.75 - 4, 4, h * 0.35);
          ctx.fillRect(x, -h * 0.45 - 4, 9, 3.5);
        }
      }
    }

    drawGround(ctx, v) {
      const P = this.pal;
      const depth = v.h - v.groundY + 20;
      ctx.fillStyle = P.ground;
      ctx.fillRect(-20, 0, v.w + 40, depth);
      ctx.fillStyle = P.strata;
      for (let i = 0; i < 6; i++) {
        const y = 22 + i * 26 + i * i * 6;
        if (y > depth) break;
        ctx.fillRect(-20, y, v.w + 40, 3 + i);
      }
      ctx.fillStyle = P.groundDark;
      ctx.fillRect(-20, 6, v.w + 40, 3);
      ctx.fillStyle = P.groundTop;
      ctx.fillRect(-20, -2, v.w + 40, 8);
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(-20, -2, v.w + 40, 2);

      const off = this.offset % 1000;
      ctx.fillStyle = P.groundDark;
      for (let rep = 0; rep < Math.ceil(v.w / 1000) + 2; rep++) {
        for (const p of this.pebbles) {
          const x = p.x + rep * 1000 - off;
          if (x < -10 || x > v.w + 10) continue;
          const y = 14 + p.y * Math.min(70, depth - 20);
          ctx.beginPath();
          ctx.ellipse(x, y, p.s * 1.6, p.s, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      const doff = this.offset % 46;
      ctx.fillStyle = P.groundDark;
      ctx.globalAlpha = 0.5;
      for (let x = -doff; x < v.w + 46; x += 46) ctx.fillRect(x, 1, 14, 2);
      ctx.globalAlpha = 1;
    }

    drawFront(ctx, v) {
      const P = this.pal;
      const off = (this.offset * 1.35) % 1600;
      const by = Math.min(v.h - v.groundY - 6, 60);
      for (let rep = 0; rep < Math.ceil(v.w / 1600) + 2; rep++) {
        for (const t of this.tufts) {
          const x = t.x + rep * 1600 - off;
          if (x < -40 || x > v.w + 40) continue;
          ctx.fillStyle = P.groundDark;
          ctx.beginPath();
          ctx.ellipse(x, by + 6, 22 * t.s, 9 * t.s, 0, Math.PI, 0);
          ctx.fill();
          ctx.strokeStyle = P.near;
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let i = -3; i <= 3; i++) {
            ctx.moveTo(x + i * 4 * t.s, by + 2);
            ctx.lineTo(x + i * 6 * t.s, by - 12 * t.s + Math.abs(i) * 2);
          }
          ctx.stroke();
        }
      }
    }

    tint(ctx, v) {
      const k = this.pal.tintK;
      if (k < 0.02) return;
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      ctx.globalAlpha = Math.min(1, k) * 0.55;
      ctx.fillStyle = this.pal.tint;
      ctx.fillRect(-30, -v.groundY - 30, v.w + 60, v.h + 60);
      ctx.restore();
    }
  }

  return { Background, PALETTES };
})();
