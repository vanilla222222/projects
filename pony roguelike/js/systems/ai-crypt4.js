'use strict';

function crypt4Step(game, e, dt, dx, dy, mul){
  const node = game.currentRoom;
  const len = Math.hypot(dx, dy) || 1;
  return tryMoveEntity(e, node, node.obstacles, (dx / len) * e.speed * (mul || 1) * dt, (dy / len) * e.speed * (mul || 1) * dt);
}

function crypt4Ring(game, e, count, speed, opts, offset){
  for (let i = 0; i < count; i++) {
    fireProjectileAngle(game, e, (offset || 0) + (i / count) * Math.PI * 2, speed, e.dmg, opts);
  }
}

function crypt4Arc(game, e, ang, count, spread, speed, opts){
  const start = ang - spread / 2;
  const step = count > 1 ? spread / (count - 1) : 0;
  for (let i = 0; i < count; i++) fireProjectileAngle(game, e, start + step * i, speed, e.dmg, opts);
}

function crypt4Bounds(node){
  return {
    minX: TILE * 1.5,
    maxX: (node.tileW - 2.5) * TILE,
    minY: TILE * 1.5,
    maxY: (node.tileH - 2.5) * TILE
  };
}

ENEMY_BEHAVIOR_HANDLERS.cr4Ossuarysaint = function(game, e, dt){
  const player = game.player;
  if (e.cr4AX === undefined) { e.cr4AX = e.x; e.cr4AY = e.y; e.cr4Spin = RNG.random() * Math.PI * 2; e.fireTimer = 1.2; }
  const guard = 150;
  const pd = Util.dist(e.cr4AX, e.cr4AY, player.x, player.y);
  if (pd > guard + 40) {
    e.cr4AX = player.x; e.cr4AY = player.y;
    const v = seekVector(e, e.cr4AX, e.cr4AY);
    crypt4Step(game, e, dt, v.x, v.y, 1);
    return;
  }
  e.cr4Spin += dt * 1.1;
  const tx = e.cr4AX + Math.cos(e.cr4Spin) * 76;
  const ty = e.cr4AY + Math.sin(e.cr4Spin) * 76;
  const v = seekVector(e, tx, ty);
  crypt4Step(game, e, dt, v.x, v.y, 1.15);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && hasLineOfSight(game.currentRoom, e, player.x, player.y)) {
    fireProjectileAt(game, e, player.x, player.y, 185, e.dmg, { color: '#e8dcb8', radius: 5 });
    e.fireTimer = 1.4;
  }
};

ENEMY_BEHAVIOR_HANDLERS.cr4Reliquarymite = function(game, e, dt){
  const player = game.player;
  if (e.cr4DX === undefined) {
    const v = seekVector(e, player.x, player.y);
    e.cr4DX = v.x; e.cr4DY = v.y; e.cr4Grace = 0;
  }
  e.cr4Grace -= dt;
  const r = crypt4Step(game, e, dt, e.cr4DX, e.cr4DY, 1);
  if ((!r.movedX || !r.movedY) && e.cr4Grace <= 0) {
    const v = seekVector(e, player.x, player.y);
    e.cr4DX = v.x + Util.rand(-0.35, 0.35);
    e.cr4DY = v.y + Util.rand(-0.35, 0.35);
    e.cr4Grace = 0.22;
    e.hitFlash = 0.1;
  }
};

ENEMY_BEHAVIOR_HANDLERS.cr4Pallbearer = function(game, e, dt){
  const player = game.player;
  if (e.cr4Phase === undefined) { e.cr4Phase = 0; e.cr4Timer = 2.2; e.shielded = true; }
  e.cr4Timer -= dt;
  if (e.cr4Phase === 0) {
    e.shielded = true;
    const v = seekVector(e, player.x, player.y);
    crypt4Step(game, e, dt, v.x, v.y, 0.7);
    if (e.cr4Timer <= 0) {
      e.cr4Phase = 1; e.cr4Timer = 1.15;
      e.cr4LX = player.x; e.cr4LY = player.y;
      Sound.play('hit');
    }
    return;
  }
  if (e.cr4Phase === 1) {
    e.hitFlash = 0.12;
    if (e.cr4Timer <= 0) {
      game.explosions.push(new Explosion(e.cr4LX, e.cr4LY, 46));
      if (Util.dist(e.cr4LX, e.cr4LY, player.x, player.y) < 52) damagePlayer(game, playerDamageAmount(game, false, e.dmg), e.type.id);
      const saved = { x: e.x, y: e.y };
      e.x = e.cr4LX; e.y = e.cr4LY;
      crypt4Ring(game, e, 8, 150, { color: '#7a6f88', radius: 5 }, 0);
      e.x = saved.x; e.y = saved.y;
      e.cr4Phase = 2; e.cr4Timer = 2.4; e.shielded = false;
    }
    return;
  }
  const v = seekVector(e, player.x, player.y);
  crypt4Step(game, e, dt, v.x, v.y, 1.6);
  if (e.cr4Timer <= 0) { e.cr4Phase = 0; e.cr4Timer = 2.2; }
};

ENEMY_BEHAVIOR_HANDLERS.cr4Candlewake = function(game, e, dt){
  const player = game.player;
  const node = game.currentRoom;
  if (e.cr4Timer === undefined) { e.cr4Timer = 2.6; e.submerged = false; }
  e.cr4Timer -= dt;
  const d = Util.dist(e.x, e.y, player.x, player.y);
  if (d < 90 && !e.submerged) {
    crypt4Ring(game, e, 10, 165, { color: '#ffe6a8', radius: 5 }, RNG.random());
    game.explosions.push(new Explosion(e.x, e.y, 44));
    Sound.play('hit');
    const b = crypt4Bounds(node);
    e.x = player.x < (b.minX + b.maxX) / 2 ? b.maxX : b.minX;
    e.y = player.y < (b.minY + b.maxY) / 2 ? b.maxY : b.minY;
    e.submerged = true;
    e.cr4Timer = 1.6;
    return;
  }
  if (e.submerged) {
    if (e.cr4Timer <= 0) { e.submerged = false; e.hitFlash = 0.15; e.cr4Timer = 2.6; }
    return;
  }
  if (e.cr4Timer <= 0) {
    const b = crypt4Bounds(node);
    e.x = Util.clamp((e.x + player.x) / 2, b.minX, b.maxX);
    e.y = Util.clamp((e.y + player.y) / 2, b.minY, b.maxY);
    e.hitFlash = 0.2;
    const ang = Math.atan2(player.y - e.y, player.x - e.x);
    crypt4Arc(game, e, ang, 3, 0.7, 200, { color: '#ffe6a8', radius: 5 });
    e.cr4Timer = 3.3;
  }
};

ENEMY_BEHAVIOR_HANDLERS.cr4Batscout = function(game, e, dt){
  const player = game.player;
  if (e.cr4Timer === undefined) { e.cr4Timer = 1.9; e.cr4Dive = 0; e.cr4Wob = RNG.random() * Math.PI * 2; }
  const v = seekVector(e, player.x, player.y);
  if (e.cr4Dive > 0) {
    e.cr4Dive -= dt;
    crypt4Step(game, e, dt, e.cr4DX, e.cr4DY, 2.2);
    return;
  }
  e.cr4Timer -= dt;
  e.cr4Wob += dt * 4.2;
  const px = -v.y, py = v.x;
  const s = Math.sin(e.cr4Wob) * 1.3;
  crypt4Step(game, e, dt, v.x + px * s, v.y + py * s, 1);
  if (e.cr4Timer <= 0) {
    crypt4Ring(game, e, 6, 120, { color: '#6a5f7a', radius: 4 }, e.cr4Wob);
    Sound.play('hit');
    e.cr4DX = v.x; e.cr4DY = v.y;
    e.cr4Dive = 0.4;
    e.cr4Timer = 1.9;
  }
};

ENEMY_BEHAVIOR_HANDLERS.cr4Ravenpicker = function(game, e, dt){
  const player = game.player;
  const node = game.currentRoom;
  if (e.cr4PX === undefined) {
    const b = crypt4Bounds(node);
    e.cr4PX = b.minX; e.cr4PY = b.minY; e.cr4Flying = 0; e.fireTimer = 1.6;
  }
  const b = crypt4Bounds(node);
  const d = Util.dist(e.x, e.y, player.x, player.y);
  if (e.cr4Flying <= 0 && d < 140) {
    const corners = [[b.minX, b.minY], [b.maxX, b.minY], [b.minX, b.maxY], [b.maxX, b.maxY]];
    let best = corners[0], bd = -1;
    for (let i = 0; i < corners.length; i++) {
      const cd = Util.dist(corners[i][0], corners[i][1], player.x, player.y);
      if (cd > bd) { bd = cd; best = corners[i]; }
    }
    e.cr4PX = best[0]; e.cr4PY = best[1];
    e.cr4Flying = 1.6;
    e.hitFlash = 0.12;
  }
  const pd = Util.dist(e.x, e.y, e.cr4PX, e.cr4PY);
  if (e.cr4Flying > 0) {
    e.cr4Flying -= dt;
    const v = seekVector(e, e.cr4PX, e.cr4PY);
    crypt4Step(game, e, dt, v.x, v.y, 1.9);
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) {
      fireProjectileAngle(game, e, Math.atan2(v.y, v.x) + Math.PI / 2, 150, e.dmg, { color: '#3a3a44', radius: 4 });
      fireProjectileAngle(game, e, Math.atan2(v.y, v.x) - Math.PI / 2, 150, e.dmg, { color: '#3a3a44', radius: 4 });
      e.fireTimer = 0.5;
    }
    if (pd < 20) e.cr4Flying = 0;
    return;
  }
  if (pd > 20) {
    const v = seekVector(e, e.cr4PX, e.cr4PY);
    crypt4Step(game, e, dt, v.x, v.y, 1);
  }
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && hasLineOfSight(node, e, player.x, player.y)) {
    fireProjectileAt(game, e, player.x, player.y, 200, e.dmg, { color: '#4a4a58', radius: 5 });
    e.fireTimer = 1.6;
  }
};

ENEMY_BEHAVIOR_HANDLERS.cr4Dnbmoth = function(game, e, dt){
  const player = game.player;
  if (e.cr4FX === undefined) {
    e.cr4FX = e.x; e.cr4FY = e.y; e.cr4Spin = RNG.random() * Math.PI * 2; e.fireTimer = 2.1; e.cr4Dive = 0;
  }
  if (e.cr4Dive > 0) {
    e.cr4Dive -= dt;
    const v = seekVector(e, player.x, player.y);
    crypt4Step(game, e, dt, v.x, v.y, 2);
    if (e.cr4Dive <= 0) { e.cr4FX = e.x; e.cr4FY = e.y; }
    return;
  }
  const fv = seekVector(e, player.x, player.y);
  e.cr4FX += (player.x - e.cr4FX) * 0.35 * dt;
  e.cr4FY += (player.y - e.cr4FY) * 0.35 * dt;
  e.cr4Spin += dt * 1.5;
  const radius = 96;
  const tx = e.cr4FX + Math.cos(e.cr4Spin) * radius;
  const ty = e.cr4FY + Math.sin(e.cr4Spin) * radius;
  const v = seekVector(e, tx, ty);
  crypt4Step(game, e, dt, v.x, v.y, 1.2);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) {
    fireProjectileAngle(game, e, e.cr4Spin + Math.PI / 2, 150, e.dmg, { color: '#e0d8b0', radius: 4 });
    e.fireTimer = 2.1;
  }
  if (Math.abs(Util.dist(e.cr4FX, e.cr4FY, player.x, player.y) - radius) < 22 && fv.d < 130) e.cr4Dive = 0.6;
};

ENEMY_BEHAVIOR_HANDLERS.cr4Dnbmayfly = function(game, e, dt){
  const player = game.player;
  if (e.cr4Life === undefined) { e.cr4Life = 0; e.cr4Wob = RNG.random() * Math.PI * 2; }
  e.cr4Life += dt;
  const span = 11;
  const t = Util.clamp(e.cr4Life / span, 0, 1);
  const mul = 0.6 + t * 1.6;
  e.cr4Wob += dt * 3;
  const v = seekVector(e, player.x, player.y);
  const px = -v.y, py = v.x;
  const s = Math.sin(e.cr4Wob) * (0.7 - t * 0.6);
  crypt4Step(game, e, dt, v.x + px * s, v.y + py * s, mul);
  if (t > 0.85) e.hitFlash = (Math.sin(e.cr4Life * 22) > 0) ? 0.16 : 0;
  if (e.cr4Life >= span) {
    crypt4Ring(game, e, 4, 130, { color: '#e8dcc0', radius: 4 }, RNG.random());
    game.explosions.push(new Explosion(e.x, e.y, 26));
    e.isDead = true;
    handleEnemyDeath(game, e);
  }
};

ENEMY_BEHAVIOR_HANDLERS.cr4Gravelurker = function(game, e, dt){
  const player = game.player;
  const node = game.currentRoom;
  if (e.cr4Phase === undefined) { e.cr4Phase = 0; e.submerged = true; e.shielded = true; e.cr4Timer = 0; }
  const v = seekVector(e, player.x, player.y);
  if (e.cr4Phase === 0) {
    e.submerged = true; e.shielded = true;
    if (v.d < 160) {
      e.cr4Phase = 1; e.cr4Timer = 0.35;
      e.submerged = false; e.shielded = false; e.hitFlash = 0.2;
      e.cr4DX = v.x; e.cr4DY = v.y;
      Sound.play('hit');
    }
    return;
  }
  if (e.cr4Phase === 1) {
    e.cr4Timer -= dt;
    if (e.cr4Timer <= 0) { e.cr4Phase = 2; e.cr4Timer = 0.7; }
    return;
  }
  if (e.cr4Phase === 2) {
    e.cr4Timer -= dt;
    crypt4Step(game, e, dt, e.cr4DX, e.cr4DY, 5.2);
    if (e.cr4Timer <= 0) { e.cr4Phase = 3; e.cr4Timer = 0.9; }
    return;
  }
  e.cr4Timer -= dt;
  const b = crypt4Bounds(node);
  const bx = Util.clamp(e.x + Util.rand(-40, 40), b.minX, b.maxX);
  const by = Util.clamp(e.y + Util.rand(-40, 40), b.minY, b.maxY);
  const bv = seekVector(e, bx, by);
  crypt4Step(game, e, dt, bv.x, bv.y, 0.6);
  if (e.cr4Timer <= 0) { e.cr4Phase = 0; }
};

ENEMY_BEHAVIOR_HANDLERS.cr4Bonerattler = function(game, e, dt){
  const player = game.player;
  if (e.cr4Charge === undefined) { e.cr4Charge = 0; e.cr4Burst = 0; e.cr4Spin = RNG.random() < 0.5 ? 1 : -1; e.fireTimer = 0; }
  const v = seekVector(e, player.x, player.y);
  const keep = 170;
  const radial = (v.d - keep) / 60;
  const px = -v.y * e.cr4Spin, py = v.x * e.cr4Spin;
  crypt4Step(game, e, dt, px + v.x * Util.clamp(radial, -1, 1), py + v.y * Util.clamp(radial, -1, 1), 1);
  if (e.cr4Burst > 0) {
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) {
      fireProjectileAt(game, e, player.x, player.y, 240, e.dmg, { color: '#c9c2b0', radius: 5 });
      e.cr4Burst -= 1;
      e.fireTimer = 0.14;
    }
    return;
  }
  if (v.d < 110) { e.cr4Charge = 0; return; }
  e.cr4Charge += dt;
  e.hitFlash = e.cr4Charge > 1 ? 0.1 : 0;
  if (e.cr4Charge >= 1.8) {
    e.cr4Charge = 0;
    e.cr4Burst = 3;
    e.fireTimer = 0;
    Sound.play('hit');
  }
};

ENEMY_BEHAVIOR_HANDLERS.cr4Sepulchertwin = function(game, e, dt){
  const player = game.player;
  const node = game.currentRoom;
  const cx = (node.tileW * TILE) / 2, cy = (node.tileH * TILE) / 2;
  if (e.fireTimer === undefined) e.fireTimer = 2;
  const b = crypt4Bounds(node);
  const tx = Util.clamp(cx * 2 - player.x, b.minX, b.maxX);
  const ty = Util.clamp(cy * 2 - player.y, b.minY, b.maxY);
  const mv = seekVector(e, tx, ty);
  if (mv.d > 18) crypt4Step(game, e, dt, mv.x, mv.y, 1);
  e.fireTimer -= dt;
  if (mv.d <= 40 && e.fireTimer <= 0 && hasLineOfSight(node, e, player.x, player.y)) {
    const ang = Math.atan2(player.y - e.y, player.x - e.x);
    crypt4Arc(game, e, ang, 2, 0.5, 210, { color: '#8a7fc0', radius: 5 });
    e.fireTimer = 2;
    e.hitFlash = 0.12;
  }
};

ENEMY_BEHAVIOR_HANDLERS.cr4Coffincrawler = function(game, e, dt){
  const player = game.player;
  if (e.cr4Open === undefined) { e.cr4Open = 0; e.cr4Timer = 2.4; e.shielded = true; }
  const v = seekVector(e, player.x, player.y);
  if (e.cr4Open > 0) {
    e.cr4Open -= dt;
    e.shielded = false;
    crypt4Step(game, e, dt, v.x, v.y, 1.8);
    if (e.cr4Open <= 0) { e.shielded = true; e.cr4Timer = 2.4; }
    return;
  }
  e.cr4Timer -= dt;
  e.shielded = true;
  crypt4Step(game, e, dt, v.x, v.y, 0.75);
  if (e.cr4Timer <= 0) {
    e.cr4Open = 1.1;
    e.hitFlash = 0.2;
    Sound.play('hit');
    crypt4Arc(game, e, Math.atan2(v.y, v.x), 5, 1.1, 175, { color: '#6a6250', radius: 5 });
  }
};

ENEMY_BEHAVIOR_HANDLERS.cr4Wraitharcher = function(game, e, dt){
  const player = game.player;
  const node = game.currentRoom;
  if (e.cr4Phase === undefined) { e.cr4Phase = 0; e.cr4Timer = 0.9; e.submerged = true; e.shielded = true; }
  e.cr4Timer -= dt;
  if (e.cr4Phase === 0) {
    e.submerged = true; e.shielded = true;
    const b = crypt4Bounds(node);
    if (e.cr4TX === undefined || Util.dist(e.x, e.y, e.cr4TX, e.cr4TY) < 16) {
      const ang = RNG.random() * Math.PI * 2;
      e.cr4TX = Util.clamp(player.x + Math.cos(ang) * 210, b.minX, b.maxX);
      e.cr4TY = Util.clamp(player.y + Math.sin(ang) * 210, b.minY, b.maxY);
    }
    const v = seekVector(e, e.cr4TX, e.cr4TY);
    crypt4Step(game, e, dt, v.x, v.y, 1.5);
    if (e.cr4Timer <= 0 && hasLineOfSight(node, e, player.x, player.y)) {
      e.cr4Phase = 1; e.cr4Timer = 0.6;
      e.submerged = false; e.shielded = false; e.hitFlash = 0.2;
      e.cr4TX = undefined;
    }
    return;
  }
  e.hitFlash = (Math.sin(e.cr4Timer * 24) > 0) ? 0.12 : 0;
  if (e.cr4Timer <= 0) {
    const ang = Math.atan2(player.y - e.y, player.x - e.x);
    crypt4Arc(game, e, ang, 3, 0.34, 260, { color: '#c0c8e0', radius: 5 });
    Sound.play('hit');
    e.cr4Phase = 0; e.cr4Timer = 1.2;
  }
};
