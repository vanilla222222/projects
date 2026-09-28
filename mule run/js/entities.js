// Game entities: the mule, obstacles, collectibles, and the scrolling
// background. Everything is drawn with plain canvas 2D calls + emoji,
// so there are no image assets to load.

class Mule {
  constructor(growthScale = 1) {
    this.growthScale = growthScale;
    this.x = CONFIG.MULE_X;
    this.size = CONFIG.MULE_SIZE * growthScale;
    this.groundY = CONFIG.GROUND_Y;
    this.y = this.groundY - this.size;
    this.velocityY = 0;
    this.onGround = true;
    this.runPhase = 0;
    this.squash = 1; // 1 = normal, <1 = squashed on landing
    this.smashActive = false;
    this.smashPhase = 0;
  }

  jump() {
    if (!this.onGround) return false;
    this.velocityY = CONFIG.JUMP_VELOCITY;
    this.onGround = false;
    return true;
  }

  update(speed) {
    if (this.onGround) {
      this.runPhase += speed * 0.05;
    } else {
      this.velocityY += CONFIG.GRAVITY;
      this.y += this.velocityY;
      const floor = this.groundY - this.size;
      if (this.y >= floor) {
        this.y = floor;
        this.velocityY = 0;
        if (!this.onGround) this.squash = 1.25; // land -> squash
        this.onGround = true;
      }
    }
    // ease squash back to normal
    this.squash += (1 - this.squash) * 0.25;

    if (this.smashActive) this.smashPhase += 0.3;
  }

  setSmashActive(active) {
    this.smashActive = active;
  }

  getBounds() {
    // Inset hitbox so near-misses feel fair against the emoji's padding.
    const pad = this.size * 0.22;
    return {
      x: this.x + pad,
      y: this.y + pad * 1.3,
      width: this.size - pad * 2,
      height: this.size - pad * 1.6,
    };
  }

  draw(ctx) {
    const bob = this.onGround ? Math.sin(this.runPhase) * 3 : 0;
    const tilt = this.onGround ? Math.sin(this.runPhase) * 0.05 : Math.min(this.velocityY * 0.02, 0.3);
    const cx = this.x + this.size / 2;
    const cy = this.y + this.size / 2 - bob;

    if (this.smashActive) {
      const pulse = 0.5 + Math.sin(this.smashPhase) * 0.5;
      ctx.save();
      const grad = ctx.createRadialGradient(cx, cy, this.size * 0.15, cx, cy, this.size * 0.85 + pulse * 6);
      grad.addColorStop(0, `rgba(140, 255, 80, ${0.45 + pulse * 0.2})`);
      grad.addColorStop(1, "rgba(140, 255, 80, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, this.size * 0.85 + pulse * 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(tilt);
    ctx.scale(1 / this.squash, this.squash);
    ctx.font = `${this.size}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🫏", 0, 2);
    if (this.smashActive) {
      ctx.font = `${this.size * 0.55}px serif`;
      ctx.save();
      ctx.rotate(-0.6 + Math.sin(this.smashPhase * 1.5) * 0.3);
      ctx.fillText("🔪", this.size * 0.42, -this.size * 0.1);
      ctx.restore();
    }
    ctx.restore();

    // dust puffs while running
    if (this.onGround) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = "#c98a4f";
      const puffOffset = (this.runPhase * 10) % 14;
      ctx.beginPath();
      ctx.ellipse(this.x + 6 - puffOffset, this.groundY - 2, 6, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

class Obstacle {
  constructor(type, x) {
    this.type = type;
    this.x = x;
    this.width = type.width;
    this.height = type.height;
    this.y = CONFIG.GROUND_Y - this.height;
    this.phase = Math.random() * Math.PI * 2; // used for the soyjak's excited jitter
  }

  update(speed) {
    this.x -= speed;
    this.phase += 0.25;
  }

  isOffscreen() {
    return this.x + this.width < -20;
  }

  getBounds() {
    const pad = this.width * 0.15;
    return {
      x: this.x + pad,
      y: this.y + pad,
      width: this.width - pad * 2,
      height: this.height - pad,
    };
  }

  draw(ctx) {
    if (this.type.custom === "soyjak") {
      drawSoyjak(ctx, this.x, this.y, this.width, this.height, this.phase);
      return;
    }
    if (this.type.custom === "larper") {
      drawLarper(ctx, this.x, this.y, this.width, this.height, this.phase);
      return;
    }
    ctx.font = `${this.height}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(this.type.emoji, this.x + this.width / 2, CONFIG.GROUND_Y + 4);
  }
}

// A little hand-drawn (canvas-drawn, not traced) hype-face guy — the generic
// wide-eyes / open-mouth reaction format used all over meme culture. Purely
// a silly cosmetic obstacle: no logos, no links, no site branding.
function drawSoyjak(ctx, x, y, w, h, phase) {
  const jitter = Math.sin(phase) * 1.5;
  const cx = x + w / 2;
  const headR = w * 0.42;
  const headCy = y + headR + 1 + jitter;
  const bodyTop = headCy + headR - 2;
  const bodyW = w * 0.68;

  ctx.save();

  // pointing arm, raised toward the trail ahead
  ctx.strokeStyle = "#e0a868";
  ctx.lineWidth = Math.max(2, w * 0.09);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx + bodyW * 0.32, bodyTop + 6);
  ctx.lineTo(cx + w * 0.62, headCy - headR * 0.3);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx + w * 0.62, headCy - headR * 0.3, w * 0.09, 0, Math.PI * 2);
  ctx.fillStyle = "#e0a868";
  ctx.fill();

  // body (simple shirt)
  ctx.fillStyle = "#4d8a63";
  const bodyH = y + h - bodyTop;
  ctx.beginPath();
  ctx.roundRect(cx - bodyW / 2, bodyTop, bodyW, bodyH, 4);
  ctx.fill();

  // head
  ctx.fillStyle = "#f2c879";
  ctx.beginPath();
  ctx.arc(cx, headCy, headR, 0, Math.PI * 2);
  ctx.fill();

  // eyebrows, raised in excitement
  ctx.strokeStyle = "#7a5230";
  ctx.lineWidth = Math.max(1.5, headR * 0.12);
  ctx.beginPath();
  ctx.moveTo(cx - headR * 0.6, headCy - headR * 0.5);
  ctx.lineTo(cx - headR * 0.15, headCy - headR * 0.68);
  ctx.moveTo(cx + headR * 0.15, headCy - headR * 0.68);
  ctx.lineTo(cx + headR * 0.6, headCy - headR * 0.5);
  ctx.stroke();

  // wide eyes, one slightly bigger for that unhinged meme energy
  drawEye(ctx, cx - headR * 0.42, headCy - headR * 0.1, headR * 0.32);
  drawEye(ctx, cx + headR * 0.44, headCy - headR * 0.08, headR * 0.4);

  // wide open mouth
  ctx.fillStyle = "#3a2418";
  ctx.beginPath();
  ctx.ellipse(cx, headCy + headR * 0.48, headR * 0.34, headR * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c94f4f";
  ctx.beginPath();
  ctx.ellipse(cx, headCy + headR * 0.6, headR * 0.18, headR * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// A LARPer blocking the trail: cloak, helmet with a plume, and a foam
// sword that swings back and forth. All shapes, no costume-brand references.
function drawLarper(ctx, x, y, w, h, phase) {
  const cx = x + w / 2;
  const bodyTop = y + h * 0.42;
  const bodyH = y + h - bodyTop;
  const bodyW = w * 0.6;
  const headR = w * 0.28;
  const headCy = y + headR + 3;

  ctx.save();

  // cape
  ctx.fillStyle = "#6b3fa0";
  ctx.beginPath();
  ctx.moveTo(cx - bodyW * 0.5, bodyTop + 2);
  ctx.lineTo(cx - bodyW * 0.75 - 3, y + h);
  ctx.lineTo(cx - bodyW * 0.1, y + h);
  ctx.closePath();
  ctx.fill();

  // tunic
  ctx.fillStyle = "#8a5a2b";
  ctx.beginPath();
  ctx.roundRect(cx - bodyW / 2, bodyTop, bodyW, bodyH, 3);
  ctx.fill();
  ctx.fillStyle = "#4d3120";
  ctx.fillRect(cx - bodyW / 2, bodyTop + bodyH * 0.4, bodyW, 3);

  // head + helmet
  ctx.fillStyle = "#f2c879";
  ctx.beginPath();
  ctx.arc(cx, headCy, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#9aa0a6";
  ctx.beginPath();
  ctx.ellipse(cx, headCy - headR * 0.3, headR * 1.05, headR * 0.55, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#d64545";
  ctx.beginPath();
  ctx.moveTo(cx, headCy - headR * 0.85);
  ctx.lineTo(cx - 4, headCy - headR * 1.7);
  ctx.lineTo(cx + 4, headCy - headR * 1.7);
  ctx.closePath();
  ctx.fill();

  // eyes
  ctx.fillStyle = "#2a1810";
  ctx.beginPath();
  ctx.arc(cx - headR * 0.35, headCy + headR * 0.1, headR * 0.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + headR * 0.35, headCy + headR * 0.1, headR * 0.13, 0, Math.PI * 2);
  ctx.fill();

  // swinging arm + foam sword
  const swingAngle = Math.sin(phase) * 0.55 - 0.25;
  const shoulderX = cx + bodyW * 0.45;
  const shoulderY = bodyTop + 4;
  const handX = shoulderX + Math.cos(swingAngle) * w * 0.4;
  const handY = shoulderY + Math.sin(swingAngle) * w * 0.4 - 4;

  ctx.strokeStyle = "#f2c879";
  ctx.lineWidth = Math.max(2, w * 0.08);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(shoulderX, shoulderY);
  ctx.lineTo(handX, handY);
  ctx.stroke();

  ctx.save();
  ctx.translate(handX, handY);
  ctx.rotate(swingAngle - Math.PI / 2.2);
  ctx.fillStyle = "#4d3120";
  ctx.fillRect(-2, 0, 4, 7);
  ctx.fillStyle = "#f4d35e";
  ctx.beginPath();
  ctx.roundRect(-3, -h * 0.5, 6, h * 0.5, 3);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

function drawEye(ctx, ex, ey, r) {
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(ex, ey, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a2418";
  ctx.lineWidth = Math.max(1, r * 0.18);
  ctx.stroke();
  ctx.fillStyle = "#2a1810";
  ctx.beginPath();
  ctx.arc(ex + r * 0.15, ey + r * 0.1, r * 0.42, 0, Math.PI * 2);
  ctx.fill();
}

class Collectible {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.baseY = y;
    this.size = 26;
    this.phase = Math.random() * Math.PI * 2;
    this.collected = false;
  }

  update(speed) {
    this.x -= speed;
    this.phase += 0.12;
    this.y = this.baseY + Math.sin(this.phase) * 6;
  }

  isOffscreen() {
    return this.x + this.size < -20;
  }

  getBounds() {
    const pad = this.size * 0.2;
    return {
      x: this.x + pad,
      y: this.y + pad,
      width: this.size - pad * 2,
      height: this.size - pad * 2,
    };
  }

  draw(ctx) {
    ctx.font = `${this.size}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(CONFIG.COLLECTIBLE_EMOJI, this.x + this.size / 2, this.y + this.size / 2);
  }
}

class RocketMonkey {
  constructor(x) {
    const cfg = CONFIG.ROCKET_MONKEY;
    this.x = x;
    this.size = cfg.SIZE;
    this.phase = Math.random() * Math.PI * 2;
    this.baseY = cfg.BASE_Y + (Math.random() * cfg.BASE_Y_JITTER * 2 - cfg.BASE_Y_JITTER);
    this.y = this.baseY;
    this.prevY = this.y;
    this.trail = [];
  }

  update(speed) {
    const cfg = CONFIG.ROCKET_MONKEY;
    this.phase += cfg.FREQUENCY;
    this.prevY = this.y;
    this.y = this.baseY + Math.sin(this.phase) * cfg.AMPLITUDE;
    this.x -= speed * cfg.SPEED_MULTIPLIER;

    // rocket exhaust trail, spawned at the tail and drifting/fading behind
    this.trail.push({
      x: this.x + this.size * 0.55,
      y: this.y + this.size * 0.35,
      alpha: 0.55,
      size: 3 + Math.random() * 3,
    });
    for (const p of this.trail) {
      p.alpha -= 0.045;
      p.x += 1.4;
      p.y += (Math.random() - 0.5) * 0.6;
    }
    this.trail = this.trail.filter((p) => p.alpha > 0);
  }

  isOffscreen() {
    return this.x + this.size < -40;
  }

  getBounds() {
    const pad = this.size * 0.28;
    return {
      x: this.x + pad,
      y: this.y + pad,
      width: this.size - pad * 2,
      height: this.size - pad * 2,
    };
  }

  draw(ctx) {
    for (const p of this.trail) {
      ctx.save();
      ctx.globalAlpha = Math.max(p.alpha, 0);
      ctx.fillStyle = p.alpha > 0.3 ? "#ffb347" : "#ff6b3d";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const verticalVel = this.y - this.prevY;
    const bank = Math.max(-0.35, Math.min(0.35, -verticalVel * 0.08));

    ctx.save();
    ctx.translate(this.x + this.size / 2, this.y + this.size / 2);
    ctx.rotate(bank);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${this.size * 0.85}px serif`;
    ctx.fillText("🚀", 5, 6); // rocket body, trailing behind/below the rider
    ctx.font = `${this.size * 0.8}px serif`;
    ctx.fillText("🐒", -3, -6); // monkey up front
    ctx.restore();
  }
}

// Rare glowing pickup. Grabbing it starts "smash mode" (handled in game.js) —
// a temporary window where hitting an obstacle destroys it instead of
// ending the run. Uses a kitchen-knife emoji dyed radioactive green since
// Unicode has no dedicated machete glyph.
class MacheteItem {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.baseY = y;
    this.size = CONFIG.MACHETE.SIZE;
    this.phase = Math.random() * Math.PI * 2;
    this.collected = false;
  }

  update(speed) {
    this.x -= speed;
    this.phase += 0.12;
    this.y = this.baseY + Math.sin(this.phase) * 8;
  }

  isOffscreen() {
    return this.x + this.size < -30;
  }

  getBounds() {
    const pad = this.size * 0.22;
    return {
      x: this.x + pad,
      y: this.y + pad,
      width: this.size - pad * 2,
      height: this.size - pad * 2,
    };
  }

  draw(ctx) {
    const pulse = 0.5 + Math.sin(this.phase * 2.2) * 0.5;
    const cx = this.x + this.size / 2;
    const cy = this.y + this.size / 2;

    ctx.save();
    const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, this.size * 0.9 + pulse * 4);
    grad.addColorStop(0, `rgba(140, 255, 80, ${0.55 + pulse * 0.25})`);
    grad.addColorStop(1, "rgba(140, 255, 80, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, this.size * 0.9 + pulse * 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(cx, cy);
    ctx.rotate(-0.5);
    ctx.font = `${this.size * 0.85}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🔪", 0, 2);
    ctx.restore();
  }
}

// A boss: slides in from the right, holds position for a screen-space duel,
// and periodically telegraphs then launches an attack. Defeated either by
// surviving/destroying enough attacks, or by touching it during smash mode.
class Boss {
  constructor(def) {
    this.def = def;
    this.width = def.width;
    this.height = def.height;
    this.x = CONFIG.WIDTH + this.width;
    this.holdX = CONFIG.WIDTH - this.width - CONFIG.BOSS.HOLD_MARGIN;
    this.y = CONFIG.GROUND_Y - this.height;
    this.phase = Math.random() * Math.PI * 2;
    this.telegraph = false;
    this.telegraphPhase = 0;
  }

  isHolding() {
    return this.x <= this.holdX + 0.5;
  }

  update() {
    this.phase += 0.06;
    if (this.x > this.holdX) {
      this.x = Math.max(this.holdX, this.x - CONFIG.BOSS.SLIDE_IN_SPEED);
    }
    if (this.telegraph) this.telegraphPhase += 0.35;
  }

  getBounds() {
    const padX = this.width * 0.2;
    const padY = this.height * 0.12;
    return {
      x: this.x + padX,
      y: this.y + padY,
      width: this.width - padX * 2,
      height: this.height - padY,
    };
  }

  draw(ctx) {
    const bob = Math.sin(this.phase) * 3;
    ctx.save();
    ctx.translate(0, bob);

    if (this.telegraph) {
      const flash = 0.5 + Math.sin(this.telegraphPhase) * 0.5;
      ctx.save();
      ctx.globalAlpha = flash * 0.3;
      ctx.fillStyle = "#ff4d4d";
      ctx.beginPath();
      ctx.ellipse(this.x + this.width / 2, this.y + this.height / 2, this.width * 0.75, this.height * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    switch (this.def.id) {
      case "bear":
        drawBossBear(ctx, this);
        break;
      case "nyx":
        drawBossNyx(ctx, this);
        break;
      case "ukraine":
        drawBossKing(ctx, this);
        break;
      case "hugeponer":
        drawBossHugeponer(ctx, this);
        break;
    }

    ctx.restore();
  }
}

function drawBossBear(ctx, boss) {
  const { x, y, width: w, height: h, def } = boss;
  const cx = x + w / 2;

  ctx.fillStyle = def.bodyColor;
  ctx.beginPath();
  ctx.roundRect(cx - w * 0.32, y + h * 0.75, w * 0.22, h * 0.25, 6);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(cx + w * 0.1, y + h * 0.75, w * 0.22, h * 0.25, 6);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(cx, y + h * 0.55, w * 0.42, h * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = def.bellyColor;
  ctx.beginPath();
  ctx.ellipse(cx, y + h * 0.6, w * 0.24, h * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();

  // candy-wrapper stripe (nod to the theme, no actual logo)
  ctx.fillStyle = def.accentColor;
  ctx.fillRect(cx - w * 0.22, y + h * 0.58, w * 0.44, h * 0.06);

  ctx.fillStyle = def.bodyColor;
  ctx.beginPath();
  ctx.ellipse(cx - w * 0.42, y + h * 0.55, w * 0.12, h * 0.18, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + w * 0.42, y + h * 0.55, w * 0.12, h * 0.18, -0.3, 0, Math.PI * 2);
  ctx.fill();

  const headR = w * 0.28;
  const headCy = y + h * 0.22;
  ctx.beginPath();
  ctx.arc(cx, headCy, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx - headR * 0.75, headCy - headR * 0.75, headR * 0.32, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + headR * 0.75, headCy - headR * 0.75, headR * 0.32, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = def.bellyColor;
  ctx.beginPath();
  ctx.ellipse(cx, headCy + headR * 0.35, headR * 0.5, headR * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#2a1810";
  ctx.beginPath();
  ctx.arc(cx - headR * 0.32, headCy - headR * 0.1, headR * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + headR * 0.32, headCy - headR * 0.1, headR * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, headCy + headR * 0.3, headR * 0.1, 0, Math.PI * 2);
  ctx.fill();
}

function drawBossNyx(ctx, boss) {
  const { x, y, width: w, height: h, def } = boss;
  const cx = x + w / 2;
  const bodyCy = y + h * 0.62;

  ctx.fillStyle = def.bodyColor;
  ctx.beginPath();
  ctx.roundRect(cx - w * 0.28, bodyCy + h * 0.12, w * 0.12, h * 0.28, 5);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(cx + w * 0.14, bodyCy + h * 0.12, w * 0.12, h * 0.28, 5);
  ctx.fill();

  ctx.fillStyle = def.maneColor;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.42, bodyCy);
  ctx.quadraticCurveTo(cx - w * 0.6, bodyCy + h * 0.3, cx - w * 0.5, bodyCy + h * 0.5);
  ctx.quadraticCurveTo(cx - w * 0.38, bodyCy + h * 0.3, cx - w * 0.32, bodyCy);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = def.bodyColor;
  ctx.beginPath();
  ctx.ellipse(cx, bodyCy, w * 0.38, h * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();

  // bat wing
  ctx.fillStyle = def.wingColor;
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.05, bodyCy - h * 0.05);
  ctx.quadraticCurveTo(cx + w * 0.35, bodyCy - h * 0.55, cx + w * 0.5, bodyCy - h * 0.2);
  ctx.quadraticCurveTo(cx + w * 0.3, bodyCy - h * 0.15, cx + w * 0.2, bodyCy + h * 0.02);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.1, bodyCy - h * 0.1);
  ctx.lineTo(cx + w * 0.4, bodyCy - h * 0.35);
  ctx.stroke();

  // neck + head
  const headCx = cx + w * 0.32;
  const headCy = bodyCy - h * 0.4;
  const headR = w * 0.16;
  ctx.fillStyle = def.bodyColor;
  ctx.beginPath();
  ctx.ellipse(cx + w * 0.2, bodyCy - h * 0.22, w * 0.12, h * 0.22, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(headCx, headCy, headR, 0, Math.PI * 2);
  ctx.fill();

  // bat ear
  ctx.beginPath();
  ctx.moveTo(headCx - headR * 0.6, headCy - headR * 0.8);
  ctx.lineTo(headCx - headR * 0.9, headCy - headR * 1.8);
  ctx.lineTo(headCx - headR * 0.1, headCy - headR * 0.9);
  ctx.closePath();
  ctx.fill();

  // mane
  ctx.fillStyle = def.maneColor;
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.05, bodyCy - h * 0.45);
  ctx.quadraticCurveTo(cx + w * 0.15, bodyCy - h * 0.65, headCx - headR * 0.3, headCy - headR * 0.6);
  ctx.quadraticCurveTo(cx + w * 0.05, bodyCy - h * 0.3, cx - w * 0.05, bodyCy - h * 0.2);
  ctx.closePath();
  ctx.fill();

  // eye + fang
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(headCx + headR * 0.3, headCy - headR * 0.05, headR * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c62828";
  ctx.beginPath();
  ctx.arc(headCx + headR * 0.35, headCy, headR * 0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(headCx + headR * 0.55, headCy + headR * 0.5);
  ctx.lineTo(headCx + headR * 0.62, headCy + headR * 0.75);
  ctx.lineTo(headCx + headR * 0.68, headCy + headR * 0.5);
  ctx.closePath();
  ctx.fill();
}

function drawBossKing(ctx, boss) {
  const { x, y, width: w, height: h, def } = boss;
  const cx = x + w / 2;
  const bodyTop = y + h * 0.38;
  const bodyW = w * 0.62;

  ctx.fillStyle = def.robeColor;
  ctx.beginPath();
  ctx.moveTo(cx - bodyW * 0.55, bodyTop);
  ctx.lineTo(cx - bodyW * 0.7, y + h);
  ctx.lineTo(cx + bodyW * 0.7, y + h);
  ctx.lineTo(cx + bodyW * 0.55, bodyTop);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = def.trimColor;
  ctx.fillRect(cx - bodyW * 0.62, y + h - 8, bodyW * 1.24, 8);
  ctx.fillRect(cx - bodyW * 0.5, bodyTop, bodyW, 5);

  const headR = w * 0.22;
  const headCy = y + headR + 4;
  ctx.fillStyle = "#f2c879";
  ctx.beginPath();
  ctx.arc(cx, headCy, headR, 0, Math.PI * 2);
  ctx.fill();

  // beard
  ctx.fillStyle = "#e0e0e0";
  ctx.beginPath();
  ctx.moveTo(cx - headR * 0.8, headCy + headR * 0.3);
  ctx.quadraticCurveTo(cx, headCy + headR * 1.6, cx + headR * 0.8, headCy + headR * 0.3);
  ctx.quadraticCurveTo(cx, headCy + headR * 0.7, cx - headR * 0.8, headCy + headR * 0.3);
  ctx.fill();

  // crown
  ctx.fillStyle = def.trimColor;
  ctx.beginPath();
  ctx.moveTo(cx - headR * 0.9, headCy - headR * 0.9);
  ctx.lineTo(cx - headR * 0.9, headCy - headR * 1.5);
  ctx.lineTo(cx - headR * 0.45, headCy - headR * 1.1);
  ctx.lineTo(cx, headCy - headR * 1.6);
  ctx.lineTo(cx + headR * 0.45, headCy - headR * 1.1);
  ctx.lineTo(cx + headR * 0.9, headCy - headR * 1.5);
  ctx.lineTo(cx + headR * 0.9, headCy - headR * 0.9);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#2a1810";
  ctx.beginPath();
  ctx.arc(cx - headR * 0.3, headCy - headR * 0.05, headR * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + headR * 0.3, headCy - headR * 0.05, headR * 0.1, 0, Math.PI * 2);
  ctx.fill();

  // scepter with a sunflower head
  const scX = cx + bodyW * 0.5;
  const scY = y + h * 0.2;
  ctx.strokeStyle = "#7a5230";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(scX, bodyTop + 6);
  ctx.lineTo(scX, scY);
  ctx.stroke();
  ctx.fillStyle = "#f4d35e";
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    ctx.save();
    ctx.translate(scX, scY);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.ellipse(0, -6, 3, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = "#6b4226";
  ctx.beginPath();
  ctx.arc(scX, scY, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawBossHugeponer(ctx, boss) {
  const { x, y, width: w, height: h, def } = boss;
  const cx = x + w / 2;
  const bodyW = w * 0.68;

  ctx.fillStyle = "#2b2b2b";
  ctx.beginPath();
  ctx.roundRect(cx - bodyW * 0.32, y + h * 0.82, bodyW * 0.26, h * 0.18, 4);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(cx + bodyW * 0.06, y + h * 0.82, bodyW * 0.26, h * 0.18, 4);
  ctx.fill();

  // striped shirt over a big belly, clipped to an oval torso
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, y + h * 0.62, bodyW * 0.55, h * 0.32, 0, 0, Math.PI * 2);
  ctx.clip();
  const stripeH = h * 0.08;
  let sy = y + h * 0.3;
  let i = 0;
  while (sy < y + h * 0.95) {
    ctx.fillStyle = def.shirtColors[i % def.shirtColors.length];
    ctx.fillRect(cx - bodyW * 0.6, sy, bodyW * 1.2, stripeH);
    sy += stripeH;
    i++;
  }
  ctx.restore();

  ctx.fillStyle = def.skinColor;
  ctx.beginPath();
  ctx.ellipse(cx - bodyW * 0.55, y + h * 0.55, w * 0.1, h * 0.2, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + bodyW * 0.55, y + h * 0.5, w * 0.1, h * 0.2, -0.5, 0, Math.PI * 2);
  ctx.fill();

  // pint glass
  ctx.fillStyle = "rgba(255, 220, 130, 0.85)";
  ctx.fillRect(cx + bodyW * 0.6, y + h * 0.35, w * 0.09, h * 0.16);
  ctx.fillStyle = "#fff";
  ctx.fillRect(cx + bodyW * 0.6, y + h * 0.35, w * 0.09, h * 0.03);

  const headR = w * 0.22;
  const headCy = y + headR + 4;
  ctx.fillStyle = def.skinColor;
  ctx.beginPath();
  ctx.arc(cx, headCy, headR, 0, Math.PI * 2);
  ctx.fill();

  // balding — hair only at the sides
  ctx.fillStyle = "#8a7050";
  ctx.beginPath();
  ctx.arc(cx - headR * 0.85, headCy + headR * 0.3, headR * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + headR * 0.85, headCy + headR * 0.3, headR * 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 120, 120, 0.4)";
  ctx.beginPath();
  ctx.arc(cx - headR * 0.5, headCy + headR * 0.3, headR * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + headR * 0.5, headCy + headR * 0.3, headR * 0.22, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#8a7050";
  ctx.beginPath();
  ctx.ellipse(cx, headCy + headR * 0.45, headR * 0.5, headR * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#2a1810";
  ctx.beginPath();
  ctx.arc(cx - headR * 0.3, headCy - headR * 0.05, headR * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + headR * 0.3, headCy - headR * 0.05, headR * 0.1, 0, Math.PI * 2);
  ctx.fill();
}

// A boss's projectile. Nyx throws a glowing purple bolt (procedural); the
// others lob a themed emoji prop. Ground-level, dodged the same way as a
// regular obstacle — and just as sliceable in smash mode.
class BossAttack {
  constructor(boss) {
    this.emoji = boss.def.attackEmoji;
    this.isBolt = boss.def.id === "nyx";
    this.size = CONFIG.BOSS.PROJECTILE_SIZE;
    this.x = boss.x + boss.width * 0.15;
    this.y = CONFIG.GROUND_Y - this.size - (this.isBolt ? 30 + Math.random() * 20 : 0);
    this.phase = Math.random() * Math.PI * 2;
    this.destroyed = false;
  }

  update(speed) {
    this.x -= speed * CONFIG.BOSS.PROJECTILE_SPEED_MULT;
    this.phase += 0.3;
  }

  isOffscreen() {
    return this.x + this.size < -30;
  }

  getBounds() {
    const pad = this.size * 0.22;
    return {
      x: this.x + pad,
      y: this.y + pad,
      width: this.size - pad * 2,
      height: this.size - pad * 2,
    };
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x + this.size / 2, this.y + this.size / 2);
    if (this.isBolt) {
      ctx.rotate(this.phase * 0.5);
      const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, this.size * 0.7);
      grad.addColorStop(0, "rgba(180, 120, 230, 0.9)");
      grad.addColorStop(1, "rgba(180, 120, 230, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, this.size * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#8e5fc4";
      ctx.beginPath();
      ctx.moveTo(-this.size * 0.3, 0);
      ctx.quadraticCurveTo(0, -this.size * 0.35, this.size * 0.3, 0);
      ctx.quadraticCurveTo(0, this.size * 0.15, -this.size * 0.3, 0);
      ctx.fill();
    } else {
      ctx.rotate(this.phase * 0.4);
      ctx.font = `${this.size * 0.9}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(this.emoji, 0, 2);
    }
    ctx.restore();
  }
}

class Background {
  constructor() {
    this.farOffset = 0;
    this.nearOffset = 0;
    this.groundOffset = 0;
    this.sunX = CONFIG.WIDTH * 0.78;

    // Fixed random mountain silhouettes so they don't reshuffle every frame.
    this.farPeaks = this.generatePeaks(6, 40, 90);
    this.nearPeaks = this.generatePeaks(4, 60, 130);
    this.pebbles = Array.from({ length: 40 }, () => ({
      x: Math.random() * CONFIG.WIDTH * 2,
      size: 1 + Math.random() * 2,
    }));
  }

  generatePeaks(count, minH, maxH) {
    const peaks = [];
    const segment = (CONFIG.WIDTH * 2) / count;
    for (let i = 0; i < count; i++) {
      peaks.push({
        x: i * segment + Math.random() * segment * 0.3,
        h: minH + Math.random() * (maxH - minH),
        w: segment * (0.8 + Math.random() * 0.4),
      });
    }
    return peaks;
  }

  update(speed) {
    this.farOffset = (this.farOffset + speed * 0.15) % (CONFIG.WIDTH * 2);
    this.nearOffset = (this.nearOffset + speed * 0.4) % (CONFIG.WIDTH * 2);
    this.groundOffset = (this.groundOffset + speed) % 40;
  }

  drawPeaks(ctx, peaks, offset, color, baseY) {
    ctx.fillStyle = color;
    for (const p of peaks) {
      let x = p.x - offset;
      if (x < -p.w) x += CONFIG.WIDTH * 2;
      if (x > CONFIG.WIDTH + p.w) x -= CONFIG.WIDTH * 2;
      ctx.beginPath();
      ctx.moveTo(x - p.w / 2, baseY);
      ctx.lineTo(x, baseY - p.h);
      ctx.lineTo(x + p.w / 2, baseY);
      ctx.closePath();
      ctx.fill();
    }
  }

  draw(ctx) {
    // sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, CONFIG.GROUND_Y);
    grad.addColorStop(0, "#ffd68a");
    grad.addColorStop(1, "#ff9c5b");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.GROUND_Y);

    // sun
    ctx.save();
    ctx.fillStyle = "#fff3c4";
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(this.sunX, 60, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    this.drawPeaks(ctx, this.farPeaks, this.farOffset, "rgba(150, 78, 48, 0.35)", CONFIG.GROUND_Y - 10);
    this.drawPeaks(ctx, this.nearPeaks, this.nearOffset, "rgba(120, 58, 34, 0.5)", CONFIG.GROUND_Y);

    // ground
    ctx.fillStyle = "#c98a4f";
    ctx.fillRect(0, CONFIG.GROUND_Y, CONFIG.WIDTH, CONFIG.HEIGHT - CONFIG.GROUND_Y);
    ctx.fillStyle = "#b87840";
    ctx.fillRect(0, CONFIG.GROUND_Y, CONFIG.WIDTH, 4);

    // scrolling pebble texture
    ctx.fillStyle = "rgba(90, 50, 25, 0.5)";
    for (const pebble of this.pebbles) {
      const x = ((pebble.x - this.nearOffset) % (CONFIG.WIDTH * 2) + CONFIG.WIDTH * 2) % (CONFIG.WIDTH * 2);
      if (x > CONFIG.WIDTH) continue;
      ctx.beginPath();
      ctx.arc(x, CONFIG.GROUND_Y + 14 + (pebble.size * 6) % 20, pebble.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
