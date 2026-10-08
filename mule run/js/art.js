const Art = (() => {
  const OUT = "#2b1a12";
  const TAU = Math.PI * 2;

  function paint(ctx, fill, lw = 2.4, stroke = OUT) {
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (lw > 0) {
      ctx.lineWidth = lw;
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
  }

  function ellipse(ctx, x, y, rx, ry, rot = 0) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
  }

  function circle(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0.1, r), 0, TAU);
  }

  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }

  function shadow(ctx, x, w, alpha = 0.22, lift = 0) {
    const k = Math.max(0.35, 1 - lift / 220);
    ctx.save();
    ctx.globalAlpha = alpha * k;
    ctx.fillStyle = "#3a1d0c";
    ellipse(ctx, x, 1.5, (w / 2) * k, 4 * k);
    ctx.fill();
    ctx.restore();
  }

  function leg(ctx, hx, hy, a, bend, len, color, hoof, lw) {
    const l1 = len * 0.52;
    const l2 = len * 0.5;
    const kx = hx + Math.sin(a) * l1;
    const ky = hy + Math.cos(a) * l1;
    const b = a + bend;
    const fx = kx + Math.sin(b) * l2;
    const fy = ky + Math.cos(b) * l2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = OUT;
    ctx.lineWidth = lw + 4.2;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(kx, ky);
    ctx.lineTo(fx, fy);
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.stroke();
    ctx.fillStyle = hoof;
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(-b);
    rrect(ctx, -3.6, -1, 7.2, 5, 1.5);
    paint(ctx, hoof, 2);
    ctx.restore();
  }

  function mule(ctx, m, skin, time) {
    const s = m.scale;
    ctx.save();
    ctx.translate(m.x, m.y);
    if (m.deadSpin) {
      ctx.translate(0, -30 * s);
      ctx.rotate(m.deadSpin);
      ctx.translate(0, 30 * s);
    }
    ctx.scale(s * m.sx, s * m.sy);
    ctx.rotate(m.tilt);

    const ph = m.runPhase;
    const air = !m.onGround;
    const bob = air ? 0 : -Math.abs(Math.sin(ph)) * 3;

    if (m.glow) {
      const g = ctx.createRadialGradient(4, -34, 6, 4, -34, 62);
      g.addColorStop(0, m.glow + "88");
      g.addColorStop(1, m.glow + "00");
      ctx.fillStyle = g;
      circle(ctx, 4, -34, 62);
      ctx.fill();
    }

    const legs = [
      { x: 16, off: 0, front: true, far: true },
      { x: -17, off: Math.PI * 0.5, front: false, far: true },
      { x: 18, off: Math.PI, front: true, far: false },
      { x: -15, off: Math.PI * 1.5, front: false, far: false },
    ];

    function drawLeg(L) {
      let a;
      let bend;
      if (air) {
        const tuck = Math.min(1, Math.abs(m.vy) / 600);
        a = L.front ? -0.9 - tuck * 0.2 : 0.8 + tuck * 0.2;
        bend = L.front ? 1.4 : -1.1;
        if (L.far) a += 0.15;
      } else {
        const p = ph + L.off;
        a = Math.sin(p) * 0.62;
        const lift = Math.max(0, Math.cos(p));
        bend = L.front ? lift * 1.1 : -lift * 0.9;
      }
      leg(ctx, L.x, -24 + bob, a, bend, 24, L.far ? skin.dark : skin.coat, "#2b1a12", 6.5);
    }

    legs.filter((L) => L.far).forEach(drawLeg);

    const tailA = Math.sin(time * 9 + ph * 0.5) * 0.35 + (air ? -0.5 : 0);
    ctx.save();
    ctx.translate(-26, -36 + bob);
    ctx.rotate(tailA);
    ctx.lineCap = "round";
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 6.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-8, 6, -8, 16);
    ctx.stroke();
    ctx.strokeStyle = skin.coat;
    ctx.lineWidth = 3;
    ctx.stroke();
    ellipse(ctx, -8, 19, 4.5, 7, 0.2);
    paint(ctx, skin.mane, 2.2);
    ctx.restore();

    ctx.save();
    ctx.translate(0, bob);
    ellipse(ctx, 0, -33, 28, 15);
    paint(ctx, skin.coat, 2.6);
    if (skin.patches) {
      ctx.save();
      ellipse(ctx, 0, -33, 26.8, 13.8);
      ctx.clip();
      ctx.fillStyle = skin.patches;
      ellipse(ctx, -14, -36, 9, 7, 0.4);
      ctx.fill();
      ellipse(ctx, 10, -26, 7, 5, -0.2);
      ctx.fill();
      ellipse(ctx, -2, -46, 6, 4);
      ctx.fill();
      ctx.restore();
    }
    ctx.save();
    ellipse(ctx, 0, -33, 26.8, 13.8);
    ctx.clip();
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ellipse(ctx, 2, -42, 20, 5);
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ellipse(ctx, 0, -20, 26, 6);
    ctx.fill();
    ctx.restore();

    rrect(ctx, -12, -48, 22, 17, 4);
    paint(ctx, skin.blanket, 2.2);
    ctx.fillStyle = skin.trim;
    ctx.fillRect(-11, -36, 20, 3);
    rrect(ctx, -8, -55, 15, 10, 3);
    paint(ctx, "#8a5a2b", 2.2);
    ctx.strokeStyle = "#5a3418";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-0.5, -55);
    ctx.lineTo(-0.5, -45);
    ctx.stroke();
    if (skin.hat) {
      ctx.strokeStyle = "#7a7a7a";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-14, -58);
      ctx.lineTo(4, -51);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-16, -53);
      ctx.quadraticCurveTo(-14, -61, -9, -62);
      ctx.stroke();
    }
    ctx.restore();

    legs.filter((L) => !L.far).forEach(drawLeg);

    ctx.save();
    ctx.translate(18, -40 + bob);
    const headTilt = air ? Math.max(-0.35, Math.min(0.3, m.vy / 1600)) : Math.sin(ph * 2) * 0.05;
    ctx.rotate(headTilt);

    ctx.beginPath();
    ctx.moveTo(-8, 6);
    ctx.quadraticCurveTo(-2, -14, 6, -20);
    ctx.lineTo(16, -12);
    ctx.quadraticCurveTo(8, 0, 6, 10);
    ctx.closePath();
    paint(ctx, skin.coat, 2.4);

    const earFlop = m.earFlop;
    for (const e of [{ x: 8, a: -0.35, far: true }, { x: 13, a: -0.05, far: false }]) {
      ctx.save();
      ctx.translate(e.x, -19);
      ctx.rotate(e.a + earFlop * (e.far ? 1.1 : 0.9));
      ellipse(ctx, 0, -12, 4.4, 13);
      paint(ctx, e.far ? skin.dark : skin.coat, 2.2);
      ellipse(ctx, 0, -11, 1.9, 8.5);
      ctx.fillStyle = "rgba(255,170,150,0.55)";
      ctx.fill();
      ctx.restore();
    }

    ellipse(ctx, 14, -12, 12, 9, 0.45);
    paint(ctx, skin.coat, 2.4);
    ellipse(ctx, 22, -6, 7.5, 6.5, 0.3);
    paint(ctx, skin.muzzle, 2.2);
    ctx.fillStyle = OUT;
    ellipse(ctx, 26, -8, 1.4, 1.1, 0.3);
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    if (m.dead) {
      ctx.moveTo(19, -2);
      ctx.quadraticCurveTo(22, -5, 26, -2);
    } else {
      ctx.moveTo(20, -2);
      ctx.quadraticCurveTo(23, 0, 26, -1.5);
    }
    ctx.stroke();

    ctx.fillStyle = skin.mane;
    ctx.beginPath();
    ctx.moveTo(-6, 2);
    ctx.quadraticCurveTo(-4, -14, 6, -21);
    ctx.lineTo(9, -17);
    ctx.quadraticCurveTo(0, -10, -1, 4);
    ctx.closePath();
    paint(ctx, skin.mane, 2);
    ctx.beginPath();
    ctx.moveTo(6, -21);
    ctx.quadraticCurveTo(14, -27, 16, -20);
    ctx.quadraticCurveTo(12, -19, 9, -17);
    ctx.closePath();
    paint(ctx, skin.mane, 2);

    if (m.dead) {
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(10, -18);
      ctx.lineTo(15, -13);
      ctx.moveTo(15, -18);
      ctx.lineTo(10, -13);
      ctx.stroke();
    } else if (m.blink > 0) {
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(9.5, -15);
      ctx.lineTo(15.5, -15);
      ctx.stroke();
    } else {
      circle(ctx, 12.5, -15.5, 3.4);
      paint(ctx, "#fff", 1.6);
      circle(ctx, 13.6, -15.2, 2);
      ctx.fillStyle = skin.glowEyes ? "#9ef0ff" : OUT;
      ctx.fill();
      circle(ctx, 14.2, -16.2, 0.7);
      ctx.fillStyle = "#fff";
      ctx.fill();
      if (skin.glowEyes) {
        ctx.save();
        ctx.globalAlpha = 0.35 + Math.sin(time * 4) * 0.15;
        circle(ctx, 13.6, -15.2, 6);
        ctx.fillStyle = "#9ef0ff";
        ctx.fill();
        ctx.restore();
      }
    }

    if (skin.hat) {
      ctx.save();
      ctx.translate(9, -21);
      ctx.rotate(-0.12);
      ellipse(ctx, 0, 0, 15, 3.6);
      paint(ctx, "#6b4a2b", 2.2);
      rrect(ctx, -8, -10, 16, 10, [5, 5, 1, 1]);
      paint(ctx, "#7d5833", 2.2);
      ctx.fillStyle = "#c9a227";
      ctx.fillRect(-7.5, -3.5, 15, 2.5);
      ctx.restore();
    }
    if (skin.crown) {
      ctx.save();
      ctx.translate(9, -22);
      ctx.rotate(-0.1);
      ctx.beginPath();
      ctx.moveTo(-8, 0);
      ctx.lineTo(-9, -9);
      ctx.lineTo(-4, -5);
      ctx.lineTo(0, -11);
      ctx.lineTo(4, -5);
      ctx.lineTo(9, -9);
      ctx.lineTo(8, 0);
      ctx.closePath();
      paint(ctx, "#ffd34d", 2);
      circle(ctx, 0, -3, 1.6);
      ctx.fillStyle = "#d6453a";
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    if (m.machete) {
      ctx.save();
      ctx.translate(30, -30 + bob);
      ctx.rotate(-0.9 + Math.sin(time * 18) * 0.25);
      machete(ctx, 1);
      ctx.restore();
    }

    if (skin.sparkle) {
      for (let i = 0; i < 3; i++) {
        const k = (time * 0.9 + i / 3) % 1;
        const sx = Math.sin(i * 12.9 + Math.floor(time * 0.9 + i / 3) * 7.1) * 22;
        const sy = -30 + Math.cos(i * 4.1 + Math.floor(time * 0.9 + i / 3) * 3.3) * 14;
        sparkleStar(ctx, sx, sy, 4 * Math.sin(k * Math.PI), "#fff8d0");
      }
    }
    ctx.restore();
  }

  function sparkleStar(ctx, x, y, r, color) {
    if (r <= 0.1) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -r * 2);
    ctx.quadraticCurveTo(0, 0, r * 2, 0);
    ctx.quadraticCurveTo(0, 0, 0, r * 2);
    ctx.quadraticCurveTo(0, 0, -r * 2, 0);
    ctx.quadraticCurveTo(0, 0, 0, -r * 2);
    ctx.fill();
    ctx.restore();
  }

  function machete(ctx, k) {
    ctx.save();
    ctx.scale(k, k);
    rrect(ctx, -2.5, 0, 5, 9, 2);
    paint(ctx, "#4a2c18", 2);
    ctx.beginPath();
    ctx.moveTo(-3.5, 0);
    ctx.lineTo(-3, -24);
    ctx.quadraticCurveTo(2, -30, 6, -24);
    ctx.lineTo(3.5, 0);
    ctx.closePath();
    paint(ctx, "#b6ff7a", 2);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillRect(-1.5, -22, 1.6, 19);
    ctx.restore();
  }

  function saguaro(ctx, cx, w, h, seed, flower) {
    const tw = w * 0.5;
    const green = "#4f9a4a";
    const armY1 = -h * (0.45 + (seed % 3) * 0.06);
    const armY2 = -h * (0.58 - (seed % 2) * 0.08);
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(cx - tw / 2, 0);
    ctx.lineTo(cx - tw / 2, armY1 + 6);
    ctx.lineTo(cx - w * 0.5 + 4, armY1 + 6);
    ctx.quadraticCurveTo(cx - w * 0.5 - 2, armY1 + 6, cx - w * 0.5 - 2, armY1);
    ctx.lineTo(cx - w * 0.5 - 2, armY1 - h * 0.18);
    ctx.arc(cx - w * 0.5 + 2.5, armY1 - h * 0.18, 4.5, Math.PI, 0);
    ctx.lineTo(cx - w * 0.5 + 7, armY1 - 1);
    ctx.lineTo(cx - tw / 2, armY1 - 1);
    ctx.lineTo(cx - tw / 2, -h + tw / 2);
    ctx.arc(cx, -h + tw / 2, tw / 2, Math.PI, 0);
    ctx.lineTo(cx + tw / 2, armY2 - 1);
    ctx.lineTo(cx + w * 0.5 - 7, armY2 - 1);
    ctx.lineTo(cx + w * 0.5 - 7, armY2 - h * 0.16);
    ctx.arc(cx + w * 0.5 - 2.5, armY2 - h * 0.16, 4.5, Math.PI, 0);
    ctx.lineTo(cx + w * 0.5 + 2, armY2);
    ctx.quadraticCurveTo(cx + w * 0.5 + 2, armY2 + 6, cx + w * 0.5 - 4, armY2 + 6);
    ctx.lineTo(cx + tw / 2, armY2 + 6);
    ctx.lineTo(cx + tw / 2, 0);
    ctx.closePath();
    paint(ctx, green, 2.6);
    ctx.save();
    ctx.clip();
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(cx - tw / 2 + 2, -h, tw * 0.25, h);
    ctx.fillStyle = "rgba(0,0,0,0.14)";
    ctx.fillRect(cx + tw * 0.15, -h, tw * 0.35, h);
    ctx.restore();
    ctx.strokeStyle = "rgba(30,70,30,0.6)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx, -h + 6);
    ctx.lineTo(cx, -3);
    ctx.stroke();
    ctx.fillStyle = "#fff6d8";
    for (let i = 0; i < 6; i++) {
      const yy = -h + 10 + i * (h - 16) / 6;
      ctx.fillRect(cx - tw / 2 - 1.5, yy, 2, 1);
      ctx.fillRect(cx + tw / 2 - 0.5, yy + 3, 2, 1);
    }
    if (flower) {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU;
        ellipse(ctx, cx + Math.cos(a) * 3, -h - 1 + Math.sin(a) * 3, 2.6, 2.6);
        ctx.fillStyle = "#ff6fa5";
        ctx.fill();
      }
      circle(ctx, cx, -h - 1, 1.8);
      ctx.fillStyle = "#ffd34d";
      ctx.fill();
    }
  }

  function rock(ctx, w, h) {
    ctx.beginPath();
    ctx.moveTo(2, 0);
    ctx.lineTo(0, -h * 0.4);
    ctx.lineTo(w * 0.18, -h * 0.85);
    ctx.lineTo(w * 0.5, -h);
    ctx.lineTo(w * 0.82, -h * 0.8);
    ctx.lineTo(w, -h * 0.3);
    ctx.lineTo(w - 2, 0);
    ctx.closePath();
    paint(ctx, "#9a8778", 2.6);
    ctx.save();
    ctx.clip();
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.beginPath();
    ctx.moveTo(w * 0.18, -h * 0.85);
    ctx.lineTo(w * 0.5, -h);
    ctx.lineTo(w * 0.45, -h * 0.55);
    ctx.lineTo(w * 0.1, -h * 0.4);
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    ctx.beginPath();
    ctx.moveTo(w * 0.6, 0);
    ctx.lineTo(w * 0.7, -h * 0.6);
    ctx.lineTo(w, -h * 0.3);
    ctx.lineTo(w, 0);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "rgba(43,26,18,0.5)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(w * 0.45, -h * 0.55);
    ctx.lineTo(w * 0.55, -h * 0.25);
    ctx.stroke();
  }

  function scorpion(ctx, w, h, t) {
    const body = "#b5462e";
    ctx.lineCap = "round";
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const lx = 10 + i * 6;
      const k = Math.sin(t * 18 + i) * 2;
      ctx.beginPath();
      ctx.moveTo(lx, -6);
      ctx.lineTo(lx - 3 + k, 0);
      ctx.stroke();
    }
    const sway = Math.sin(t * 5) * 0.15;
    ctx.save();
    ctx.translate(w * 0.75, -8);
    ctx.rotate(sway);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(14, -4, 10, -16);
    ctx.quadraticCurveTo(6, -24, -4, -20);
    ctx.stroke();
    ctx.strokeStyle = body;
    ctx.lineWidth = 3.6;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-4, -20);
    ctx.lineTo(-10, -16);
    ctx.lineTo(-5, -24);
    ctx.closePath();
    paint(ctx, "#2b1a12", 1.5);
    ctx.restore();
    ellipse(ctx, w * 0.45, -7, w * 0.32, 6);
    paint(ctx, body, 2.4);
    circle(ctx, w * 0.12, -7, 5);
    paint(ctx, body, 2.2);
    const pinch = Math.abs(Math.sin(t * 6)) * 0.3;
    for (const dy of [-3, 3]) {
      ctx.save();
      ctx.translate(2, -7 + dy);
      ctx.rotate(dy < 0 ? -pinch : pinch);
      ellipse(ctx, -5, 0, 5, 2.6);
      paint(ctx, body, 1.8);
      ctx.restore();
    }
    circle(ctx, w * 0.1, -9, 1.2);
    ctx.fillStyle = "#111";
    ctx.fill();
  }

  function tumbleweed(ctx, r, rot) {
    ctx.save();
    ctx.rotate(rot);
    circle(ctx, 0, 0, r);
    ctx.fillStyle = "rgba(160,120,60,0.35)";
    ctx.fill();
    ctx.strokeStyle = "#7a5a2e";
    ctx.lineWidth = 1.8;
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * r * 0.25, Math.sin(a) * r * 0.25, r * 0.75, r * 0.4, a * 1.7, 0, TAU);
      ctx.stroke();
    }
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2.2;
    circle(ctx, 0, 0, r);
    ctx.stroke();
    ctx.restore();
  }

  function eye(ctx, ex, ey, r) {
    circle(ctx, ex, ey, r);
    paint(ctx, "#fff", Math.max(1, r * 0.25));
    circle(ctx, ex + r * 0.2, ey + r * 0.1, r * 0.45);
    ctx.fillStyle = OUT;
    ctx.fill();
  }

  function fan(ctx, w, h, t) {
    const j = Math.sin(t * 15) * 1.5;
    const cx = w / 2;
    const headR = w * 0.42;
    const headCy = -h + headR + 1 + j;
    const bodyTop = headCy + headR - 3;
    const bodyW = w * 0.72;
    ctx.lineCap = "round";
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(cx - bodyW * 0.2, -10);
    ctx.lineTo(cx - bodyW * 0.25, 0);
    ctx.moveTo(cx + bodyW * 0.2, -10);
    ctx.lineTo(cx + bodyW * 0.25, 0);
    ctx.stroke();
    ctx.strokeStyle = "#3a4a6b";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 5.5;
    ctx.beginPath();
    ctx.moveTo(cx - bodyW * 0.35, bodyTop + 6);
    ctx.lineTo(cx - w * 0.7, headCy - headR * 0.4);
    ctx.stroke();
    ctx.strokeStyle = "#f2c879";
    ctx.lineWidth = 3;
    ctx.stroke();
    rrect(ctx, cx - bodyW / 2, bodyTop, bodyW, -10 - bodyTop, 5);
    paint(ctx, "#4d8a63", 2.4);
    circle(ctx, cx, headCy, headR);
    paint(ctx, "#f2c879", 2.4);
    ctx.strokeStyle = "#7a5230";
    ctx.lineWidth = Math.max(1.5, headR * 0.12);
    ctx.beginPath();
    ctx.moveTo(cx - headR * 0.75, headCy - headR * 0.45);
    ctx.lineTo(cx - headR * 0.25, headCy - headR * 0.68);
    ctx.moveTo(cx + headR * 0.05, headCy - headR * 0.68);
    ctx.lineTo(cx + headR * 0.5, headCy - headR * 0.5);
    ctx.stroke();
    eye(ctx, cx - headR * 0.5, headCy - headR * 0.12, headR * 0.3);
    eye(ctx, cx + headR * 0.28, headCy - headR * 0.1, headR * 0.37);
    ellipse(ctx, cx - headR * 0.1, headCy + headR * 0.48, headR * 0.34, headR * 0.4);
    paint(ctx, "#3a2418", 1.5);
    ellipse(ctx, cx - headR * 0.1, headCy + headR * 0.62, headR * 0.18, headR * 0.15);
    ctx.fillStyle = "#c94f4f";
    ctx.fill();
  }

  function larper(ctx, w, h, t) {
    const cx = w / 2;
    const bodyTop = -h * 0.58;
    const bodyW = w * 0.62;
    const headR = w * 0.3;
    const headCy = -h + headR + 4;
    ctx.beginPath();
    ctx.moveTo(cx + bodyW * 0.4, bodyTop + 2);
    ctx.lineTo(cx + bodyW * 0.85 + 3, 0);
    ctx.lineTo(cx + bodyW * 0.05, 0);
    ctx.closePath();
    paint(ctx, "#6b3fa0", 2.2);
    ctx.lineCap = "round";
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(cx - 4, -12);
    ctx.lineTo(cx - 5, 0);
    ctx.moveTo(cx + 4, -12);
    ctx.lineTo(cx + 5, 0);
    ctx.stroke();
    ctx.strokeStyle = "#5a3a22";
    ctx.lineWidth = 3;
    ctx.stroke();
    rrect(ctx, cx - bodyW / 2, bodyTop, bodyW, -12 - bodyTop, 3);
    paint(ctx, "#8a5a2b", 2.4);
    ctx.fillStyle = "#4d3120";
    ctx.fillRect(cx - bodyW / 2 + 1, bodyTop + (-12 - bodyTop) * 0.55, bodyW - 2, 3);
    circle(ctx, cx, headCy, headR);
    paint(ctx, "#f2c879", 2.2);
    ctx.beginPath();
    ctx.ellipse(cx, headCy - headR * 0.25, headR * 1.12, headR * 0.62, 0, Math.PI, 0);
    ctx.closePath();
    paint(ctx, "#a8aeb4", 2.2);
    ctx.beginPath();
    ctx.moveTo(cx, headCy - headR * 0.85);
    ctx.quadraticCurveTo(cx + 2, headCy - headR * 1.9, cx + 9, headCy - headR * 1.7);
    ctx.quadraticCurveTo(cx + 4, headCy - headR * 1.2, cx + 3, headCy - headR * 0.85);
    ctx.closePath();
    paint(ctx, "#d64545", 1.8);
    ctx.fillStyle = OUT;
    circle(ctx, cx - headR * 0.45, headCy + headR * 0.15, headR * 0.13);
    ctx.fill();
    circle(ctx, cx - headR * 0.0, headCy + headR * 0.15, headR * 0.13);
    ctx.fill();
    const sw = Math.sin(t * 9) * 0.6 - 0.3;
    const shX = cx - bodyW * 0.4;
    const shY = bodyTop + 4;
    const hx = shX - Math.cos(sw) * w * 0.4;
    const hy = shY + Math.sin(sw) * w * 0.4 - 4;
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 5.5;
    ctx.beginPath();
    ctx.moveTo(shX, shY);
    ctx.lineTo(hx, hy);
    ctx.stroke();
    ctx.strokeStyle = "#f2c879";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(-sw - 0.4);
    rrect(ctx, -2, 0, 4, 7, 1);
    paint(ctx, "#4d3120", 1.6);
    rrect(ctx, -3.5, -h * 0.5, 7, h * 0.5, 3.5);
    paint(ctx, "#f4d35e", 2);
    ctx.restore();
  }

  function buzzard(ctx, w, h, t) {
    const flap = Math.sin(t * 12);
    ctx.save();
    ctx.translate(w / 2, -h / 2);
    for (const far of [true, false]) {
      ctx.save();
      ctx.scale(1, far ? 0.8 : 1);
      ctx.beginPath();
      ctx.moveTo(-4, -2);
      ctx.quadraticCurveTo(6, -6 - flap * 18, 14 + (far ? -6 : 0), -14 - flap * 20);
      ctx.quadraticCurveTo(10, -4 - flap * 6, 10, 0);
      ctx.closePath();
      paint(ctx, far ? "#2e2430" : "#43364a", 2.2);
      ctx.restore();
    }
    ellipse(ctx, 0, 0, 18, 7);
    paint(ctx, "#43364a", 2.4);
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(26, -4);
    ctx.lineTo(24, 3);
    ctx.closePath();
    paint(ctx, "#43364a", 2);
    circle(ctx, -18, -4, 5.5);
    paint(ctx, "#d9837a", 2.2);
    ctx.beginPath();
    ctx.moveTo(-22, -4);
    ctx.lineTo(-28, -1);
    ctx.lineTo(-22, -1);
    ctx.closePath();
    paint(ctx, "#e8c47a", 1.6);
    circle(ctx, -19, -5, 1.2);
    ctx.fillStyle = OUT;
    ctx.fill();
    ellipse(ctx, -12, -5, 4, 3);
    ctx.fillStyle = "#e9e1d6";
    ctx.fill();
    ctx.restore();
  }

  function rocketMonkey(ctx, w, h, t, bank) {
    ctx.save();
    ctx.translate(w / 2, -h / 2);
    ctx.rotate(bank);
    const fl = 8 + Math.sin(t * 40) * 3;
    ctx.beginPath();
    ctx.moveTo(18, -4);
    ctx.lineTo(18 + fl * 1.6, 0);
    ctx.lineTo(18, 4);
    ctx.closePath();
    ctx.fillStyle = "#ffb347";
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(18, -2);
    ctx.lineTo(18 + fl, 0);
    ctx.lineTo(18, 2);
    ctx.closePath();
    ctx.fillStyle = "#fff4c2";
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(10, -6);
    ctx.lineTo(19, -12);
    ctx.lineTo(19, -4);
    ctx.closePath();
    paint(ctx, "#d6453a", 2);
    ctx.beginPath();
    ctx.moveTo(10, 6);
    ctx.lineTo(19, 12);
    ctx.lineTo(19, 4);
    ctx.closePath();
    paint(ctx, "#d6453a", 2);
    ctx.beginPath();
    ctx.moveTo(-22, 0);
    ctx.quadraticCurveTo(-14, -8, 0, -7);
    ctx.lineTo(18, -6);
    ctx.lineTo(18, 6);
    ctx.lineTo(0, 7);
    ctx.quadraticCurveTo(-14, 8, -22, 0);
    ctx.closePath();
    paint(ctx, "#eef0f2", 2.4);
    ctx.save();
    ctx.clip();
    ctx.fillStyle = "#d6453a";
    ctx.fillRect(-24, -10, 9, 20);
    ctx.fillRect(4, -10, 4, 20);
    ctx.restore();
    circle(ctx, -6, 0, 3);
    paint(ctx, "#7fd4ff", 1.6);
    ctx.translate(2, -10);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(8, 2);
    ctx.quadraticCurveTo(18, 0, 16 + Math.sin(t * 8) * 3, -10);
    ctx.stroke();
    ctx.strokeStyle = "#8a5a35";
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ellipse(ctx, 2, -2, 8, 7);
    paint(ctx, "#8a5a35", 2.2);
    circle(ctx, -4, -10, 7.5);
    paint(ctx, "#8a5a35", 2.2);
    circle(ctx, 3, -12, 3);
    paint(ctx, "#8a5a35", 1.8);
    ellipse(ctx, -6, -9, 5, 4.5);
    ctx.fillStyle = "#e8c49a";
    ctx.fill();
    circle(ctx, -8, -11, 1.3);
    ctx.fillStyle = OUT;
    ctx.fill();
    circle(ctx, -4.5, -11, 1.3);
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(-6.5, -8, 2.2, 0.2, Math.PI - 0.2);
    ctx.stroke();
    ctx.strokeStyle = "#8a5a35";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-2, 0);
    ctx.lineTo(-10, 7);
    ctx.stroke();
    ctx.restore();
  }

  function carrot(ctx, r, t, gold) {
    ctx.save();
    ctx.rotate(0.6 + Math.sin(t * 3) * 0.12);
    const leaf = gold ? "#ffe680" : "#4caf50";
    for (const a of [-0.45, 0, 0.45]) {
      ctx.save();
      ctx.translate(0, -r * 0.9);
      ctx.rotate(a);
      ellipse(ctx, 0, -r * 0.5, r * 0.22, r * 0.55);
      paint(ctx, leaf, 1.6);
      ctx.restore();
    }
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, -r * 0.9);
    ctx.quadraticCurveTo(0, -r * 1.15, r * 0.5, -r * 0.9);
    ctx.quadraticCurveTo(r * 0.3, r * 0.2, 0, r * 1.1);
    ctx.quadraticCurveTo(-r * 0.3, r * 0.2, -r * 0.5, -r * 0.9);
    ctx.closePath();
    paint(ctx, gold ? "#ffcf3f" : "#ff8a2b", 2);
    ctx.strokeStyle = gold ? "#c9961c" : "#c8601a";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, -r * 0.4);
    ctx.lineTo(r * 0.05, -r * 0.35);
    ctx.moveTo(-r * 0.1, r * 0.15);
    ctx.lineTo(r * 0.2, r * 0.2);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ellipse(ctx, -r * 0.22, -r * 0.55, r * 0.09, r * 0.25, 0.1);
    ctx.fill();
    ctx.restore();
  }

  function powerIcon(ctx, kind, t) {
    if (kind === "machete") {
      ctx.save();
      ctx.rotate(0.6);
      ctx.translate(0, 9);
      machete(ctx, 0.85);
      ctx.restore();
    } else if (kind === "magnet") {
      ctx.save();
      ctx.rotate(-0.5);
      ctx.lineCap = "butt";
      ctx.beginPath();
      ctx.arc(0, 0, 8, Math.PI, 0, true);
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 8.5;
      ctx.stroke();
      ctx.strokeStyle = "#ff5d5d";
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.fillStyle = OUT;
      ctx.fillRect(-12.2, -6.5, 8.4, 7);
      ctx.fillRect(3.8, -6.5, 8.4, 7);
      ctx.fillStyle = "#e6eef2";
      ctx.fillRect(-10.6, -5, 5.2, 4.6);
      ctx.fillRect(5.4, -5, 5.2, 4.6);
      ctx.restore();
    } else if (kind === "feather") {
      ctx.save();
      ctx.rotate(-0.7);
      ellipse(ctx, 0, -2, 5.5, 12);
      paint(ctx, "#f4fbff", 2);
      ctx.strokeStyle = "#7fd4ff";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(0, 12);
      ctx.lineTo(0, -12);
      for (let i = -8; i < 8; i += 4) {
        ctx.moveTo(0, i);
        ctx.lineTo(-4, i - 3);
        ctx.moveTo(0, i);
        ctx.lineTo(4, i - 3);
      }
      ctx.stroke();
      ctx.restore();
    } else if (kind === "shield") {
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(10, -8);
      ctx.quadraticCurveTo(10, 6, 0, 12);
      ctx.quadraticCurveTo(-10, 6, -10, -8);
      ctx.closePath();
      paint(ctx, "#ffd34d", 2.2);
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(5.5, -4.5);
      ctx.quadraticCurveTo(5.5, 3.5, 0, 7);
      ctx.closePath();
      ctx.fillStyle = "#ff9f1c";
      ctx.fill();
    }
  }

  function powerOrb(ctx, kind, t) {
    const color = CONFIG.POWERUPS[kind].color;
    const p = 0.5 + Math.sin(t * 5) * 0.5;
    const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 30 + p * 4);
    g.addColorStop(0, color + "aa");
    g.addColorStop(1, color + "00");
    ctx.fillStyle = g;
    circle(ctx, 0, 0, 30 + p * 4);
    ctx.fill();
    circle(ctx, 0, 0, 16);
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.fill();
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.save();
    ctx.rotate(Math.sin(t * 3) * 0.15);
    powerIcon(ctx, kind, t);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = "#fff";
    ellipse(ctx, -6, -8, 4, 2.4, -0.6);
    ctx.fill();
    ctx.restore();
  }

  function bossBear(ctx, b) {
    const { w, h, def } = b;
    const cx = 0;
    for (const s of [-1, 1]) {
      rrect(ctx, cx + s * w * 0.21 - w * 0.11, -h * 0.25, w * 0.22, h * 0.25, 7);
      paint(ctx, def.body, 2.6);
    }
    ellipse(ctx, cx, -h * 0.45, w * 0.42, h * 0.36);
    paint(ctx, def.body, 2.8);
    ellipse(ctx, cx, -h * 0.4, w * 0.25, h * 0.24);
    ctx.fillStyle = def.belly;
    ctx.fill();
    ctx.fillStyle = def.accent;
    ctx.fillRect(cx - w * 0.24, -h * 0.43, w * 0.48, h * 0.07);
    ctx.fillStyle = "#fff";
    ctx.fillRect(cx - w * 0.24, -h * 0.43, w * 0.48, 2);
    const arm = b.windup * 0.9;
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.translate(cx + s * w * 0.4, -h * 0.55);
      ctx.rotate(s * 0.3 - (s < 0 ? arm : 0));
      ellipse(ctx, 0, h * 0.1, w * 0.12, h * 0.18);
      paint(ctx, def.body, 2.6);
      ctx.restore();
    }
    const hr = w * 0.28;
    const hy = -h * 0.8;
    for (const s of [-1, 1]) {
      circle(ctx, cx + s * hr * 0.78, hy - hr * 0.75, hr * 0.33);
      paint(ctx, def.body, 2.4);
      circle(ctx, cx + s * hr * 0.78, hy - hr * 0.75, hr * 0.16);
      ctx.fillStyle = def.belly;
      ctx.fill();
    }
    circle(ctx, cx, hy, hr);
    paint(ctx, def.body, 2.8);
    ellipse(ctx, cx - hr * 0.2, hy + hr * 0.35, hr * 0.5, hr * 0.36);
    paint(ctx, def.belly, 2);
    ctx.fillStyle = OUT;
    circle(ctx, cx - hr * 0.2, hy + hr * 0.22, hr * 0.13);
    ctx.fill();
    const angry = b.telegraph ? 1 : 0;
    for (const s of [-1, 1]) {
      circle(ctx, cx + s * hr * 0.36 - hr * 0.15, hy - hr * 0.12, hr * 0.1);
      ctx.fillStyle = OUT;
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(cx + s * hr * 0.55 - hr * 0.15, hy - hr * (0.4 + angry * 0.05));
      ctx.lineTo(cx + s * hr * 0.15 - hr * 0.15, hy - hr * (0.32 - angry * 0.08));
      ctx.stroke();
    }
  }

  function bossNyx(ctx, b, t) {
    const { w, h, def } = b;
    const cx = 0;
    const bodyCy = -h * 0.42;
    for (const s of [-0.24, -0.08, 0.14, 0.28]) {
      rrect(ctx, cx + s * w - 5, bodyCy + h * 0.05, 10, -bodyCy - h * 0.05, 4);
      paint(ctx, def.body, 2.4);
    }
    ctx.beginPath();
    ctx.moveTo(cx + w * 0.38, bodyCy - 4);
    ctx.quadraticCurveTo(cx + w * 0.62, bodyCy + h * 0.2, cx + w * 0.52, bodyCy + h * 0.36);
    ctx.quadraticCurveTo(cx + w * 0.42, bodyCy + h * 0.2, cx + w * 0.3, bodyCy + 4);
    ctx.closePath();
    paint(ctx, def.mane, 2.4);
    ellipse(ctx, cx, bodyCy, w * 0.38, h * 0.2);
    paint(ctx, def.body, 2.8);
    const flap = Math.sin(t * 6) * 0.25;
    ctx.save();
    ctx.translate(cx + w * 0.02, bodyCy - h * 0.08);
    ctx.rotate(flap);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(w * 0.1, -h * 0.55, w * 0.45, -h * 0.4);
    ctx.quadraticCurveTo(w * 0.3, -h * 0.28, w * 0.34, -h * 0.12);
    ctx.quadraticCurveTo(w * 0.2, -h * 0.14, w * 0.18, 0);
    ctx.closePath();
    paint(ctx, def.wing, 2.4);
    ctx.restore();
    const hx = cx - w * 0.32;
    const hy = bodyCy - h * 0.38;
    const hr = w * 0.16;
    ellipse(ctx, cx - w * 0.2, bodyCy - h * 0.2, w * 0.12, h * 0.22, 0.4);
    paint(ctx, def.body, 2.6);
    ctx.beginPath();
    ctx.moveTo(hx + hr * 0.6, hy - hr * 0.7);
    ctx.lineTo(hx + hr * 0.9, hy - hr * 1.9);
    ctx.lineTo(hx + hr * 0.05, hy - hr * 0.9);
    ctx.closePath();
    paint(ctx, def.body, 2.2);
    circle(ctx, hx, hy, hr);
    paint(ctx, def.body, 2.6);
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.05, bodyCy - h * 0.18);
    ctx.quadraticCurveTo(cx - w * 0.12, bodyCy - h * 0.6, hx + hr * 0.4, hy - hr * 0.8);
    ctx.quadraticCurveTo(cx - w * 0.05, bodyCy - h * 0.38, cx + w * 0.05, bodyCy - h * 0.14);
    ctx.closePath();
    paint(ctx, def.mane, 2.2);
    circle(ctx, hx - hr * 0.3, hy - hr * 0.05, hr * 0.3);
    paint(ctx, "#fff", 1.6);
    circle(ctx, hx - hr * 0.38, hy, hr * 0.15);
    ctx.fillStyle = b.telegraph ? "#ff3b3b" : "#c62828";
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(hx - hr * 0.55, hy + hr * 0.5);
    ctx.lineTo(hx - hr * 0.62, hy + hr * 0.8);
    ctx.lineTo(hx - hr * 0.7, hy + hr * 0.5);
    ctx.closePath();
    paint(ctx, "#fff", 1.2);
  }

  function bossKing(ctx, b) {
    const { w, h, def } = b;
    const cx = 0;
    const bodyTop = -h * 0.62;
    const bodyW = w * 0.64;
    ctx.beginPath();
    ctx.moveTo(cx - bodyW * 0.5, bodyTop);
    ctx.lineTo(cx - bodyW * 0.72, 0);
    ctx.lineTo(cx + bodyW * 0.72, 0);
    ctx.lineTo(cx + bodyW * 0.5, bodyTop);
    ctx.closePath();
    paint(ctx, def.robe, 2.8);
    ctx.fillStyle = def.trim;
    ctx.fillRect(cx - bodyW * 0.7, -9, bodyW * 1.4, 7);
    ctx.fillRect(cx - bodyW * 0.48, bodyTop, bodyW * 0.96, 6);
    ctx.fillRect(cx - 3, bodyTop, 6, -bodyTop - 9);
    const hr = w * 0.24;
    const hy = -h + hr + 10;
    circle(ctx, cx, hy, hr);
    paint(ctx, "#f2c879", 2.6);
    ctx.beginPath();
    ctx.moveTo(cx - hr * 0.85, hy + hr * 0.2);
    ctx.quadraticCurveTo(cx, hy + hr * 1.8, cx + hr * 0.85, hy + hr * 0.2);
    ctx.quadraticCurveTo(cx, hy + hr * 0.7, cx - hr * 0.85, hy + hr * 0.2);
    paint(ctx, "#ececec", 2);
    ctx.beginPath();
    ctx.moveTo(cx - hr * 0.95, hy - hr * 0.8);
    ctx.lineTo(cx - hr * 0.95, hy - hr * 1.5);
    ctx.lineTo(cx - hr * 0.45, hy - hr * 1.1);
    ctx.lineTo(cx, hy - hr * 1.7);
    ctx.lineTo(cx + hr * 0.45, hy - hr * 1.1);
    ctx.lineTo(cx + hr * 0.95, hy - hr * 1.5);
    ctx.lineTo(cx + hr * 0.95, hy - hr * 0.8);
    ctx.closePath();
    paint(ctx, def.trim, 2.2);
    ctx.fillStyle = OUT;
    circle(ctx, cx - hr * 0.35, hy - hr * 0.05, hr * 0.11);
    ctx.fill();
    circle(ctx, cx + hr * 0.25, hy - hr * 0.05, hr * 0.11);
    ctx.fill();
    const raise = b.windup * 14;
    const sx = cx - bodyW * 0.6;
    const sy = -h * 0.82 - raise;
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(sx, bodyTop + 30);
    ctx.lineTo(sx, sy);
    ctx.stroke();
    ctx.strokeStyle = "#7a5230";
    ctx.lineWidth = 3;
    ctx.stroke();
    flower(ctx, sx, sy, 1);
  }

  function flower(ctx, x, y, k) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(k, k);
    for (let i = 0; i < 9; i++) {
      ctx.save();
      ctx.rotate((i / 9) * TAU);
      ellipse(ctx, 0, -8, 3.4, 6.5);
      paint(ctx, "#ffd34d", 1.4);
      ctx.restore();
    }
    circle(ctx, 0, 0, 5.5);
    paint(ctx, "#6b4226", 1.8);
    ctx.restore();
  }

  function bossHuge(ctx, b) {
    const { w, h, def } = b;
    const cx = 0;
    const bw = w * 0.7;
    for (const s of [-1, 1]) {
      rrect(ctx, cx + s * bw * 0.2 - bw * 0.13, -h * 0.2, bw * 0.26, h * 0.2, 4);
      paint(ctx, "#2b2b2b", 2.4);
    }
    ctx.save();
    ellipse(ctx, cx, -h * 0.4, bw * 0.55, h * 0.33);
    ctx.clip();
    const st = h * 0.08;
    let i = 0;
    for (let y = -h * 0.75; y < 0; y += st) {
      ctx.fillStyle = def.shirt[i % 3];
      ctx.fillRect(cx - bw * 0.6, y, bw * 1.2, st);
      i++;
    }
    ctx.restore();
    ellipse(ctx, cx, -h * 0.4, bw * 0.55, h * 0.33);
    paint(ctx, null, 2.8);
    const raise = b.windup;
    ctx.save();
    ctx.translate(cx - bw * 0.52, -h * 0.52);
    ctx.rotate(0.4 + raise * 1.2);
    ellipse(ctx, 0, h * 0.1, w * 0.1, h * 0.18);
    paint(ctx, def.skin, 2.4);
    ctx.translate(0, h * 0.26);
    pint(ctx, 0.9);
    ctx.restore();
    ellipse(ctx, cx + bw * 0.55, -h * 0.45, w * 0.1, h * 0.18, -0.3);
    paint(ctx, def.skin, 2.4);
    const hr = w * 0.22;
    const hy = -h + hr + 6;
    circle(ctx, cx, hy, hr);
    paint(ctx, def.skin, 2.6);
    ctx.fillStyle = "#8a7050";
    for (const s of [-1, 1]) {
      circle(ctx, cx + s * hr * 0.85, hy + hr * 0.2, hr * 0.3);
      paint(ctx, "#8a7050", 1.8);
    }
    ctx.fillStyle = "rgba(255,110,110,0.45)";
    circle(ctx, cx - hr * 0.55, hy + hr * 0.3, hr * 0.2);
    ctx.fill();
    circle(ctx, cx + hr * 0.4, hy + hr * 0.3, hr * 0.2);
    ctx.fill();
    ellipse(ctx, cx - hr * 0.1, hy + hr * 0.45, hr * 0.48, hr * 0.14);
    ctx.fillStyle = "#8a7050";
    ctx.fill();
    ctx.fillStyle = OUT;
    circle(ctx, cx - hr * 0.38, hy - hr * 0.05, hr * 0.1);
    ctx.fill();
    circle(ctx, cx + hr * 0.2, hy - hr * 0.05, hr * 0.1);
    ctx.fill();
  }

  function pint(ctx, k) {
    ctx.save();
    ctx.scale(k, k);
    rrect(ctx, -7, -9, 14, 18, 2);
    paint(ctx, "#f2b632", 2.2);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(-5, -6, 3, 13);
    ellipse(ctx, 0, -10, 8, 3.5);
    paint(ctx, "#fffaf0", 1.8);
    ctx.beginPath();
    ctx.arc(8, 0, 4.5, -1.2, 1.2);
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = OUT;
    ctx.stroke();
    ctx.restore();
  }

  function choc(ctx) {
    rrect(ctx, -13, -7, 26, 14, 2);
    paint(ctx, "#5a3018", 2.2);
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (const x of [-6.5, 0, 6.5]) {
      ctx.moveTo(x, -6);
      ctx.lineTo(x, 6);
    }
    ctx.moveTo(-12, 0);
    ctx.lineTo(12, 0);
    ctx.stroke();
    rrect(ctx, 2, -8, 12, 16, 1.5);
    paint(ctx, "#c62828", 2);
    ctx.fillStyle = "#fff";
    ctx.fillRect(4, -2, 8, 3);
  }

  function bolt(ctx, t) {
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 22);
    g.addColorStop(0, "rgba(200,140,255,0.95)");
    g.addColorStop(1, "rgba(160,100,230,0)");
    ctx.fillStyle = g;
    circle(ctx, 0, 0, 22);
    ctx.fill();
    ctx.save();
    ctx.rotate(t * 6);
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 4 : 11;
      const a = (i / 10) * TAU;
      ctx[i ? "lineTo" : "moveTo"](Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    paint(ctx, "#e6ccff", 2, "#5b3a8a");
    ctx.restore();
  }

  function projectile(ctx, kind, t, spin) {
    ctx.save();
    if (kind === "bolt") {
      bolt(ctx, t);
    } else {
      ctx.rotate(spin);
      if (kind === "choc") choc(ctx);
      else if (kind === "flower") flower(ctx, 0, 0, 1.25);
      else pint(ctx, 1.05);
    }
    ctx.restore();
  }

  function boss(ctx, b, t) {
    if (b.def.id === "bear") bossBear(ctx, b);
    else if (b.def.id === "nyx") bossNyx(ctx, b, t);
    else if (b.def.id === "king") bossKing(ctx, b);
    else bossHuge(ctx, b);
  }

  return {
    OUT,
    paint,
    circle,
    ellipse,
    rrect,
    shadow,
    mule,
    saguaro,
    rock,
    scorpion,
    tumbleweed,
    fan,
    larper,
    buzzard,
    rocketMonkey,
    carrot,
    powerOrb,
    powerIcon,
    sparkleStar,
    boss,
    projectile,
  };
})();
