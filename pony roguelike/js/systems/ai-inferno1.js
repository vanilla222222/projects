'use strict';

const INFERNO_ID_AI = {};

function infernoWrapById(fn){
  return function(game, e, dt){
    const o = INFERNO_ID_AI[(e.type && e.type.id) || ''];
    if (o) { o(game, e, dt); return; }
    fn(game, e, dt);
  };
}

function infernoStep(game, e, dt, dx, dy, mul){
  const node = game.currentRoom;
  const len = Math.hypot(dx, dy) || 1;
  return tryMoveEntity(e, node, node.obstacles, (dx / len) * e.speed * (mul || 1) * dt, (dy / len) * e.speed * (mul || 1) * dt);
}

function infernoRing(game, e, count, speed, opts, offset){
  for (let i = 0; i < count; i++) fireProjectileAngle(game, e, (offset || 0) + (i / count) * Math.PI * 2, speed, e.dmg, opts);
}

function infernoArc(game, e, ang, count, spread, speed, opts){
  const start = ang - spread / 2;
  const step = count > 1 ? spread / (count - 1) : 0;
  for (let i = 0; i < count; i++) fireProjectileAngle(game, e, start + step * i, speed, e.dmg, opts);
}

function infernoAim(e, player){
  return Math.atan2(player.y - e.y, player.x - e.x);
}

function infernoSpawn(game, node, id, x, y){
  const def = ENEMY_TYPES[id];
  if (!def) return null;
  const spot = findNearestFloor(node, Math.floor(x / TILE), Math.floor(y / TILE));
  const en = new Enemy(def, spot.x, spot.y, game.dungeon.floorNum);
  node.enemies.push(en);
  return en;
}

function infernoTrack(e, player, dt){
  if (e.inf1LX === undefined) { e.inf1LX = player.x; e.inf1LY = player.y; e.inf1VX = 0; e.inf1VY = 0; }
  if (dt > 0) {
    const k = Math.min(1, dt * 6);
    e.inf1VX += (((player.x - e.inf1LX) / dt) - e.inf1VX) * k;
    e.inf1VY += (((player.y - e.inf1LY) / dt) - e.inf1VY) * k;
  }
  e.inf1LX = player.x; e.inf1LY = player.y;
}

function infernoScorch(game, e, x, y, radius, dmg){
  game.explosions.push(new Explosion(x, y, radius));
  const player = game.player;
  if (Util.dist(x, y, player.x, player.y) < radius + player.radius) {
    damagePlayer(game, playerDamageAmount(game, false, dmg === undefined ? e.dmg : dmg), e.type.id);
  }
}

ENEMY_BEHAVIOR_HANDLERS.inf1Emberling = function(game, e, dt){
  const player = game.player;
  if (e.inf1Heat === undefined) { e.inf1Heat = 0; }
  const v = seekVector(e, player.x, player.y);
  if (v.d < 150) e.inf1Heat = Math.min(1, e.inf1Heat + dt * 0.55);
  else e.inf1Heat = Math.max(0, e.inf1Heat - dt * 0.7);
  e.hitFlash = e.inf1Heat > 0.75 ? 0.1 : 0;
  const r = infernoStep(game, e, dt, v.x, v.y, 1 + e.inf1Heat * 0.9);
  if (!r.movedX && !r.movedY) e.inf1Heat = 0;
};

ENEMY_BEHAVIOR_HANDLERS.inf1Cinderhound = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.inf1Side === undefined) { e.inf1Side = RNG.random() < 0.5 ? 1 : -1; e.inf1Pounce = 0; e.inf1Timer = Util.rand(0.8, 1.5); }
  const v = seekVector(e, player.x, player.y);
  if (e.inf1Pounce > 0) {
    e.inf1Pounce -= dt;
    const r = infernoStep(game, e, dt, e.inf1PX, e.inf1PY, 2.4);
    if ((!r.movedX && !r.movedY) || e.inf1Pounce <= 0) {
      e.inf1Pounce = 0;
      e.inf1Side = -e.inf1Side;
      e.inf1Timer = Util.rand(0.7, 1.3);
    }
    return;
  }
  e.inf1Timer -= dt;
  infernoStep(game, e, dt, v.x * 0.55 + (-v.y) * e.inf1Side, v.y * 0.55 + v.x * e.inf1Side, 1);
  if (e.inf1Timer <= 0 && v.d < (t.pounceRange || 220)) {
    e.inf1Pounce = 0.3;
    e.inf1PX = v.x; e.inf1PY = v.y;
    e.hitFlash = 0.12;
  }
};

ENEMY_BEHAVIOR_HANDLERS.inf1Ashwraith = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.inf1Phase === undefined) { e.inf1Phase = 0; e.inf1Timer = Util.rand(1.2, 2.2); }
  e.inf1Timer -= dt;
  const v = seekVector(e, player.x, player.y);
  if (e.inf1Phase === 1) {
    e.submerged = true;
    e.shielded = true;
    infernoStep(game, e, dt, e.inf1DX, e.inf1DY, 1.7);
    if (e.inf1Timer <= 0) {
      e.submerged = false; e.shielded = false;
      e.inf1Phase = 0;
      e.inf1Timer = Util.rand(1.4, 2.4);
      infernoArc(game, e, infernoAim(e, player), 2, 0.5, t.boltSpeed || 200, { color: t.boltColor || '#9a8a8a', radius: 4 });
      e.hitFlash = 0.12;
    }
    return;
  }
  infernoStep(game, e, dt, v.x, v.y, 0.85);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && v.d < (t.fireRange || 380)) {
    e.fireTimer = t.fireCooldown || 1.7;
    fireProjectileAngle(game, e, infernoAim(e, player), t.boltSpeed || 200, e.dmg, { color: t.boltColor || '#9a8a8a', radius: 4 });
  }
  if (e.inf1Timer <= 0) {
    e.inf1Phase = 1;
    e.inf1Timer = 0.8;
    e.inf1DX = v.x; e.inf1DY = v.y;
  }
};

ENEMY_BEHAVIOR_HANDLERS.inf1Brimstonebomber = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.inf1Drip === undefined) { e.inf1Drip = 0.9; }
  if (e.arming) {
    e.fuseTimer -= dt;
    e.hitFlash = (Math.sin(e.fuseTimer * 26) > 0) ? 0.14 : 0;
    if (e.fuseTimer <= 0) {
      e.isDead = true;
      infernoScorch(game, e, e.x, e.y, t.blastRadius || 85);
      infernoRing(game, e, 8, (t.boltSpeed || 150) * 0.9, { color: t.boltColor || '#ff7a2a', radius: 5 }, RNG.random());
      handleEnemyDeath(game, e);
    }
    return;
  }
  const v = seekVector(e, player.x, player.y);
  infernoStep(game, e, dt, v.x, v.y, 1.1);
  e.inf1Drip -= dt;
  if (e.inf1Drip <= 0) {
    e.inf1Drip = 0.85;
    infernoScorch(game, e, e.x, e.y, 26, Math.max(1, Math.floor(e.dmg / 2)));
  }
  if (v.d < 46) { e.arming = true; e.fuseTimer = t.fuseTime || 0.9; }
};

INFERNO_ID_AI.infernoguardian = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.inf1Pulse === undefined) { e.inf1Pulse = 0; e.inf1Spin = RNG.random() * Math.PI * 2; }
  const v = seekVector(e, player.x, player.y);
  if (e.shielded) {
    e.inf1Pulse -= dt;
    if (e.inf1Pulse <= 0) {
      e.inf1Pulse = 0.75;
      e.inf1Spin += 0.7;
      infernoRing(game, e, 3, (t.boltSpeed || 170), { color: t.boltColor || '#ff8a3a', radius: 5 }, e.inf1Spin);
    }
    return;
  }
  e.inf1Pulse = 0;
  infernoStep(game, e, dt, v.x, v.y, 1.9);
};

ENEMY_BEHAVIOR_HANDLERS.inf1Hellcharger = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.inf1Chain === undefined) { e.inf1Chain = 0; }
  if (e.dashing) {
    const r = infernoStep(game, e, dt, e.dashVX, e.dashVY, t.chargeSpeed || 6.6);
    e.dashTimer -= dt;
    if (!r.movedX && !r.movedY) {
      e.dashing = false;
      infernoScorch(game, e, e.x, e.y, 58);
      if (e.inf1Chain > 0) { e.inf1Chain--; e.telegraph = 0.18; }
      else e.attackTimer = t.chargeCooldown || 2;
      return;
    }
    if (e.dashTimer <= 0) {
      e.dashing = false;
      e.inf1Chain = 0;
      e.attackTimer = t.chargeCooldown || 2;
    }
    return;
  }
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 30) > 0) ? 0.14 : 0;
    if (e.telegraph <= 0) {
      const v = seekVector(e, player.x, player.y);
      e.dashing = true; e.dashTimer = 0.42;
      e.dashVX = v.x; e.dashVY = v.y;
    }
    return;
  }
  e.attackTimer -= dt;
  chaseSeek(game, e, player.x, player.y, 0.6, dt);
  if (e.attackTimer <= 0 && Util.dist(e.x, e.y, player.x, player.y) < 340) {
    e.inf1Chain = 2;
    e.telegraph = t.telegraphTime || 0.5;
  }
};

INFERNO_ID_AI.obsidiansentinel = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.inf1Shots === undefined) { e.inf1Shots = 0; e.inf1Vent = 0; }
  if (e.inf1Vent > 0) {
    e.inf1Vent -= dt;
    e.shielded = true;
    if (e.inf1Vent <= 0) { e.shielded = false; e.inf1Shots = 0; e.fireTimer = 0.4; }
    return;
  }
  const d = Util.dist(e.x, e.y, player.x, player.y);
  const los = hasLineOfSight(node, e, player.x, player.y);
  e.fireTimer -= dt;
  if (!los || d > (t.fireRange || 420)) {
    e.inf1Shots = Math.max(0, e.inf1Shots - dt * 2);
    return;
  }
  if (e.fireTimer > 0) return;
  fireProjectileAngle(game, e, infernoAim(e, player), t.boltSpeed || 210, e.dmg, { color: t.boltColor || '#ff7a2a', radius: t.boltRadius || 5 });
  e.inf1Shots++;
  e.fireTimer = Math.max(0.42, (t.fireCooldown || 1.5) - e.inf1Shots * 0.2);
  if (e.inf1Shots >= 6) {
    infernoRing(game, e, 10, (t.boltSpeed || 210) * 0.8, { color: t.boltColor || '#ff7a2a', radius: 4 }, RNG.random());
    e.inf1Vent = 1.4;
    e.hitFlash = 0.16;
  }
};

ENEMY_BEHAVIOR_HANDLERS.inf1Magmaleaper = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  infernoTrack(e, player, dt);
  if (e.dashing) {
    infernoStep(game, e, dt, e.dashVX, e.dashVY, t.leapSpeed || 5.2);
    e.dashTimer -= dt;
    if (e.dashTimer <= 0) {
      e.dashing = false;
      infernoScorch(game, e, e.x, e.y, 52);
      infernoRing(game, e, 4, t.boltSpeed || 170, { color: t.boltColor || '#ff9a3a', radius: 5 }, RNG.random());
      e.attackTimer = t.leapCooldown || 1.4;
    }
    return;
  }
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 34) > 0) ? 0.14 : 0;
    if (e.telegraph <= 0) {
      const lx = player.x + e.inf1VX * 0.35, ly = player.y + e.inf1VY * 0.35;
      const v = seekVector(e, lx, ly);
      e.dashing = true;
      e.dashTimer = Util.clamp(v.d / (e.speed * (t.leapSpeed || 5.2)), 0.16, 0.5);
      e.dashVX = v.x; e.dashVY = v.y;
    }
    return;
  }
  e.attackTimer -= dt;
  const v = seekVector(e, player.x, player.y);
  if (v.d > 130) infernoStep(game, e, dt, v.x, v.y, 0.8);
  else infernoStep(game, e, dt, -v.y, v.x, 0.6);
  if (e.attackTimer <= 0 && v.d < 320 && hasLineOfSight(node, e, player.x, player.y)) e.telegraph = t.telegraphTime || 0.35;
};

ENEMY_BEHAVIOR_HANDLERS.inf1Emberarcher = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.inf1Draw === undefined) { e.inf1Draw = 0; }
  const v = seekVector(e, player.x, player.y);
  const keep = t.keepDistance || 210;
  if (e.inf1Draw > 0) {
    e.inf1Draw -= dt;
    e.hitFlash = (Math.sin(e.inf1Draw * 30) > 0) ? 0.12 : 0;
    infernoStep(game, e, dt, -v.x, -v.y, 0.9);
    if (e.inf1Draw <= 0) {
      const a = infernoAim(e, player);
      const sp = t.boltSpeed || 225;
      for (let i = 0; i < 3; i++) fireProjectileAngle(game, e, a, sp * (0.72 + i * 0.22), e.dmg, { color: t.boltColor || '#ffc04a', radius: 4 });
      e.fireTimer = t.fireCooldown || 1.3;
    }
    return;
  }
  if (v.d < keep - 40) infernoStep(game, e, dt, -v.x, -v.y, 1);
  else if (v.d > keep + 50) infernoStep(game, e, dt, v.x, v.y, 0.9);
  else infernoStep(game, e, dt, -v.y, v.x, 0.55);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && v.d < (t.fireRange || 420) && hasLineOfSight(node, e, player.x, player.y)) e.inf1Draw = 0.5;
};

ENEMY_BEHAVIOR_HANDLERS.inf1Soulflame = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.inf1Spiral === undefined) { e.inf1Spiral = RNG.random() * Math.PI * 2; e.inf1Dir = RNG.random() < 0.5 ? 1 : -1; }
  const v = seekVector(e, player.x, player.y);
  const keep = t.keepDistance || 170;
  if (v.d < keep - 30) infernoStep(game, e, dt, -v.x + (-v.y) * e.inf1Dir, -v.y + v.x * e.inf1Dir, 1);
  else if (v.d > keep + 40) infernoStep(game, e, dt, v.x, v.y, 0.85);
  else infernoStep(game, e, dt, -v.y * e.inf1Dir, v.x * e.inf1Dir, 0.8);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && v.d < (t.fireRange || 400)) {
    e.fireTimer = t.fireCooldown || 1.5;
    e.inf1Spiral += 2.399963;
    const sp = t.boltSpeed || 215;
    fireProjectileAngle(game, e, e.inf1Spiral, sp * 0.72, e.dmg, { color: t.boltColor || '#c06ae0', radius: 5 });
    fireProjectileAngle(game, e, e.inf1Spiral + Math.PI, sp * 0.72, e.dmg, { color: t.boltColor || '#c06ae0', radius: 5 });
    fireProjectileAngle(game, e, infernoAim(e, player), sp, e.dmg, { color: t.boltColor || '#c06ae0', radius: 4 });
  }
};

ENEMY_BEHAVIOR_HANDLERS.inf1Ashlurker = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.inf1Left === undefined) { e.inf1Left = 0; e.inf1Buried = 1; }
  if (e.dashing) {
    const r = infernoStep(game, e, dt, e.dashVX, e.dashVY, t.chargeSpeed || 6.8);
    e.dashTimer -= dt;
    if ((!r.movedX && !r.movedY) || e.dashTimer <= 0) {
      e.dashing = false;
      if (e.inf1Left > 0) { e.inf1Left--; e.telegraph = 0.14; }
      else e.attackTimer = t.chargeCooldown || 2.2;
    }
    return;
  }
  if (e.inf1Buried) {
    e.submerged = true;
    e.shielded = true;
    if (Util.dist(e.x, e.y, player.x, player.y) < (t.triggerRange || 115)) {
      e.inf1Buried = 0;
      e.submerged = false;
      e.shielded = false;
      infernoScorch(game, e, e.x, e.y, 56);
      infernoRing(game, e, 6, t.boltSpeed || 180, { color: t.boltColor || '#8a7a6a', radius: 5 }, RNG.random());
      e.inf1Left = 2;
      e.telegraph = t.telegraphTime || 0.3;
    }
    return;
  }
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 34) > 0) ? 0.12 : 0;
    if (e.telegraph <= 0) {
      const v = seekVector(e, player.x, player.y);
      e.dashing = true; e.dashTimer = t.dashDuration || 0.5;
      e.dashVX = v.x; e.dashVY = v.y;
    }
    return;
  }
  e.attackTimer -= dt;
  const v = seekVector(e, player.x, player.y);
  if (v.d > 400) { e.inf1Buried = 1; return; }
  infernoStep(game, e, dt, v.x, v.y, 0.6);
  if (e.attackTimer <= 0) { e.inf1Left = 1; e.telegraph = t.telegraphTime || 0.3; }
};

ENEMY_BEHAVIOR_HANDLERS.inf1Flamewalker = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.inf1Step === undefined) { e.inf1Step = 0; e.inf1Base = RNG.random() * Math.PI * 2; }
  e.blinkTimer -= dt;
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && Util.dist(e.x, e.y, player.x, player.y) < (t.fireRange || 420)) {
    e.fireTimer = t.fireCooldown || 1.4;
    fireProjectileAngle(game, e, infernoAim(e, player), t.boltSpeed || 215, e.dmg, { color: t.boltColor || '#f0a03a', radius: t.boltRadius || 5 });
  }
  if (e.blinkTimer > 0) return;
  e.blinkTimer = t.blinkCooldown || 3.2;
  infernoScorch(game, e, e.x, e.y, 48);
  e.inf1Step = (e.inf1Step + 1) % 3;
  if (e.inf1Step === 0) e.inf1Base = RNG.random() * Math.PI * 2;
  const ang = e.inf1Base + e.inf1Step * (Math.PI * 2 / 3);
  const rad = Math.max(90, (t.blinkRange || 220) * 0.65);
  const spot = findNearestFloor(node, Math.floor((player.x + Math.cos(ang) * rad) / TILE), Math.floor((player.y + Math.sin(ang) * rad) / TILE));
  e.x = spot.x * TILE + TILE / 2; e.y = spot.y * TILE + TILE / 2;
  e.navPath = null; e.pathTimer = 0;
  e.hitFlash = 0.14;
  infernoArc(game, e, infernoAim(e, player), 5, 1.1, (t.boltSpeed || 215) * 0.85, { color: t.boltColor || '#f0a03a', radius: 4 });
};

ENEMY_BEHAVIOR_HANDLERS.inf1Cinderwarden = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.inf1Charge === undefined) { e.inf1Charge = 0; e.inf1Grant = 0; e.inf1Gap = 0; }
  const v = seekVector(e, player.x, player.y);
  const keep = t.keepDistance || 200;
  if (e.inf1Grant > 0) {
    e.shielded = true;
    e.inf1Gap -= dt;
    if (e.inf1Gap <= 0) {
      e.inf1Gap = 0.25;
      const R = t.shieldRadius || 140;
      let best = null, bd = R;
      for (const o of node.enemies) {
        if (o === e || o.isDead || o.isBoss || o.shielded || o.submerged) continue;
        if (o.behavior === 'shielded') continue;
        const d = Util.dist(e.x, e.y, o.x, o.y);
        if (d < bd) { bd = d; best = o; }
      }
      if (best) { best.shielded = true; best.grantedShield = true; best.shieldTimer = t.shieldGrantTime || 2.6; }
      e.inf1Grant--;
      if (e.inf1Grant <= 0 || !best) { e.inf1Grant = 0; e.shielded = false; e.attackTimer = t.shieldCooldown || 5; }
    }
    return;
  }
  if (e.inf1Charge > 0) {
    e.inf1Charge -= dt;
    e.hitFlash = (Math.sin(e.inf1Charge * 28) > 0) ? 0.14 : 0;
    if (e.inf1Charge <= 0) { e.inf1Grant = 3; e.inf1Gap = 0; }
    return;
  }
  if (v.d < keep) infernoStep(game, e, dt, -v.x, -v.y, 1);
  else if (v.d > keep + 70) infernoStep(game, e, dt, v.x, v.y, 0.7);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) e.inf1Charge = 0.8;
};

ENEMY_BEHAVIOR_HANDLERS.inf1Magmamortar = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.inf1Salvo === undefined) { e.inf1Salvo = 0; e.inf1Gap = 0; e.inf1Bear = 0; }
  infernoTrack(e, player, dt);
  const range = t.lobRange || 290;
  const d = Util.dist(e.x, e.y, player.x, player.y);
  if (e.lobTimer > 0) {
    e.lobTimer -= dt;
    if (e.lobTimer <= 0) {
      const R = t.burstRadius || 50;
      infernoScorch(game, e, e.lobX, e.lobY, R);
      if (e.inf1Salvo <= 0) e.attackTimer = t.fireCooldown || 2.3;
    }
  }
  if (e.inf1Salvo > 0 && e.lobTimer <= 0) {
    e.inf1Gap -= dt;
    if (e.inf1Gap <= 0) {
      const spread = 74 * (2 - e.inf1Salvo);
      e.lobX = player.x + e.inf1VX * 0.4 + Math.cos(e.inf1Bear) * spread;
      e.lobY = player.y + e.inf1VY * 0.4 + Math.sin(e.inf1Bear) * spread;
      e.lobTime = t.lobTime || 1;
      e.lobTimer = e.lobTime;
      e.inf1Salvo--;
      e.inf1Gap = 0.3;
    }
    return;
  }
  if (e.lobTimer > 0) return;
  if (d > range * 0.9) chaseSeek(game, e, player.x, player.y, 1, dt);
  else if (d < range * 0.4) {
    const v = seekVector(e, player.x, player.y);
    infernoStep(game, e, dt, -v.x, -v.y, 1);
  }
  e.attackTimer -= dt;
  if (e.attackTimer <= 0 && d < range) {
    e.inf1Salvo = 3;
    e.inf1Gap = 0;
    e.inf1Bear = (Math.hypot(e.inf1VX, e.inf1VY) > 12) ? Math.atan2(e.inf1VY, e.inf1VX) : RNG.random() * Math.PI * 2;
    e.hitFlash = 0.12;
  }
};

ENEMY_BEHAVIOR_HANDLERS.inf1Emberweaver = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.inf1Phase === undefined) { e.inf1Phase = Util.rand(0, 6); e.inf1Last = 0; }
  const v = seekVector(e, player.x, player.y);
  const close = Util.clamp(1 - v.d / 420, 0, 1);
  const amp = (t.weaveAmplitude || 0.7) * (0.4 + close * 1.2);
  e.inf1Phase += dt * (t.weaveFrequency || 3.6);
  const s = Math.sin(e.inf1Phase);
  infernoStep(game, e, dt, v.x + (-v.y) * s * amp, v.y + v.x * s * amp, 1);
  const sign = s >= 0 ? 1 : -1;
  if (sign !== e.inf1Last && Math.abs(s) < 0.25) {
    e.inf1Last = sign;
    const perp = Math.atan2(v.x, -v.y) + (sign > 0 ? 0 : Math.PI);
    fireProjectileAngle(game, e, perp, t.boltSpeed || 160, e.dmg, { color: t.boltColor || '#ff6a2a', radius: 5 });
  }
};

ENEMY_BEHAVIOR_HANDLERS.inf1Slagsentry = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.inf1Awake === undefined) { e.inf1Awake = 0; e.inf1Left = 0; e.inf1Gap = 0; }
  const d = Util.dist(e.x, e.y, player.x, player.y);
  const los = hasLineOfSight(node, e, player.x, player.y);
  if (e.inf1Left > 0) {
    e.inf1Gap -= dt;
    if (e.inf1Gap <= 0) {
      fireProjectileAngle(game, e, infernoAim(e, player), t.boltSpeed || 220, e.dmg, { color: t.boltColor || '#f0762e', radius: t.boltRadius || 5 });
      e.inf1Left--;
      e.inf1Gap = 0.14;
      if (e.inf1Left <= 0) e.fireTimer = t.fireCooldown || 1.2;
    }
    return;
  }
  if (!e.inf1Awake) {
    e.shielded = true;
    const hurt = e.hp < e.maxHp;
    if ((hurt || d < (t.sentryThreshold || 30) * 9) && los) { e.inf1Awake = 1; e.shielded = false; e.hitFlash = 0.16; }
    return;
  }
  if (!los || d > (t.fireRange || 440) * 1.15) {
    e.inf1Awake = 0;
    e.shielded = true;
    e.hp = Math.min(e.maxHp, e.hp + 1);
    return;
  }
  const v = seekVector(e, player.x, player.y);
  if (d > 190) infernoStep(game, e, dt, v.x, v.y, 0.7);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && d < (t.fireRange || 440)) { e.inf1Left = 2; e.inf1Gap = 0; }
};

ENEMY_BEHAVIOR_HANDLERS.inf1Flarecircler = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.inf1Dir === undefined) { e.inf1Dir = RNG.random() < 0.5 ? 1 : -1; e.inf1T = RNG.random() * 6; e.inf1Quarter = 0; }
  e.inf1T += dt;
  const base = t.orbitRadius || 130;
  const R = base + Math.sin(e.inf1T * 1.3) * 38;
  const bearing = Math.atan2(e.y - player.y, e.x - player.x) + e.inf1Dir * (t.orbitSpeed || 1.5) * dt;
  const tx = player.x + Math.cos(bearing) * R, ty = player.y + Math.sin(bearing) * R;
  const v = seekVector(e, tx, ty);
  if (v.d > 5) infernoStep(game, e, dt, v.x, v.y, 1.2);
  const q = Math.floor(((bearing % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI / 2));
  if (q !== e.inf1Quarter) {
    e.inf1Quarter = q;
    if (q % 3 === 0) {
      const tangent = bearing + e.inf1Dir * Math.PI / 2;
      infernoArc(game, e, tangent, 2, 0.35, t.boltSpeed || 200, { color: t.boltColor || '#f0c96a', radius: t.boltRadius || 4 });
      e.hitFlash = 0.1;
    }
  }
};

ENEMY_BEHAVIOR_HANDLERS.inf1Magmadelver = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.inf1State === undefined) { e.inf1State = 0; e.inf1Timer = t.burrowCooldown || 2.8; e.inf1Gout = 0; }
  e.inf1Timer -= dt;
  if (e.inf1State === 1) {
    e.submerged = true; e.shielded = true;
    const v = seekVector(e, player.x, player.y);
    infernoStep(game, e, dt, v.x, v.y, 2);
    e.inf1Gout -= dt;
    if (e.inf1Gout <= 0) {
      e.inf1Gout = 0.45;
      infernoScorch(game, e, e.x, e.y, 34, Math.max(1, Math.floor(e.dmg / 2)));
    }
    if (e.inf1Timer <= 0 || v.d < 26) { e.inf1State = 2; e.inf1Timer = 0.35; }
    return;
  }
  if (e.inf1State === 2) {
    e.hitFlash = 0.14;
    if (e.inf1Timer <= 0) {
      e.submerged = false; e.shielded = false;
      infernoScorch(game, e, e.x, e.y, 62);
      infernoRing(game, e, 7, t.boltSpeed || 175, { color: t.boltColor || '#ff6a2a', radius: 5 }, RNG.random());
      e.inf1State = 0;
      e.inf1Timer = t.burrowCooldown || 2.8;
    }
    return;
  }
  chaseSeek(game, e, player.x, player.y, 0.8, dt);
  if (e.inf1Timer <= 0) {
    e.inf1State = 1;
    e.inf1Timer = t.burrowTime || 1.5;
    e.inf1Gout = 0.3;
    e.navPath = null; e.pathTimer = 0;
  }
};

ENEMY_BEHAVIOR_HANDLERS.inf1Pyrecaller = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.inf1Build === undefined) { e.inf1Build = 0; }
  const v = seekVector(e, player.x, player.y);
  const keep = t.keepDistance || 200;
  if (e.inf1Build > 0) {
    e.shielded = true;
    e.inf1Build -= dt;
    e.hitFlash = (Math.sin(e.inf1Build * 24) > 0) ? 0.14 : 0;
    if (e.inf1Build <= 0) {
      e.shielded = false;
      const cap = t.maxSummons || 6;
      const n = Math.min(t.summonCount || 3, cap - e.minionsSpawned);
      for (let i = 0; i < n; i++) {
        const ang = (i / Math.max(1, n)) * Math.PI * 2 + RNG.random();
        if (infernoSpawn(game, node, t.summonId || 'swarmerdnb', e.x + Math.cos(ang) * 52, e.y + Math.sin(ang) * 52)) e.minionsSpawned++;
      }
      infernoRing(game, e, 6, 165, { color: '#c06ae0', radius: 5 }, RNG.random());
      e.summonTimer = t.summonCooldown || 6.5;
    }
    return;
  }
  if (v.d < keep) infernoStep(game, e, dt, -v.x, -v.y, 1);
  else infernoStep(game, e, dt, -v.y, v.x, 0.5);
  e.summonTimer -= dt;
  if (e.summonTimer <= 0 && e.minionsSpawned < (t.maxSummons || 6)) e.inf1Build = 1.2;
};

ENEMY_BEHAVIOR_HANDLERS.inf1Embertender = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  let target = null, worst = 1;
  for (const o of node.enemies) {
    if (o === e || o.isDead || o.isBoss || o.hp >= o.maxHp) continue;
    const f = o.hp / Math.max(1, o.maxHp);
    if (f < worst) { worst = f; target = o; }
  }
  e.healTimer -= dt;
  if (target) {
    const v = seekVector(e, target.x, target.y);
    if (v.d > 48) { infernoStep(game, e, dt, v.x, v.y, 1.25); return; }
    if (e.healTimer > 0) { infernoStep(game, e, dt, -v.y, v.x, 0.5); return; }
    const amt = (t.healAmount || 3) * 2;
    target.hp = Math.min(target.maxHp, target.hp + amt);
    game.floatTexts.push(new FloatText(target.x, target.y - target.radius - 6, '+' + amt, Theme.floatText.heal));
    infernoScorch(game, e, e.x, e.y, t.healRadius ? Math.min(t.healRadius, 70) : 70);
    e.healTimer = t.healCooldown || 3.2;
    e.hitFlash = 0.14;
    return;
  }
  const pv = seekVector(e, player.x, player.y);
  if (pv.d < 210) infernoStep(game, e, dt, -pv.x, -pv.y, 1);
  else aiWander(game, e, dt);
};

ENEMY_BEHAVIOR_HANDLERS.inf1Cinderwisp = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.inf1Bob === undefined) { e.inf1Bob = RNG.random() * 6; e.inf1Keep = t.keepDistance || 205; }
  e.inf1Bob += dt * 4.2;
  const v = seekVector(e, player.x, player.y);
  const w = Math.sin(e.inf1Bob) * 1.1;
  const drift = v.d > e.inf1Keep + 30 ? 0.9 : (v.d < e.inf1Keep - 40 ? -0.8 : 0.1);
  infernoStep(game, e, dt, v.x * drift + (-v.y) * w, v.y * drift + v.x * w, 1);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && Math.sin(e.inf1Bob) > 0.93 && v.d < (t.fireRange || 420)) {
    fireProjectileAngle(game, e, infernoAim(e, player), t.boltSpeed || 230, e.dmg, { color: t.boltColor || '#ff8a4a', radius: 4 });
    e.fireTimer = t.fireCooldown || 1.3;
    e.inf1Keep -= 22;
    if (e.inf1Keep < 100) e.inf1Keep = t.keepDistance || 205;
  }
};

ENEMY_BEHAVIOR_HANDLERS.inf1Ashskitter = function(game, e, dt){
  const player = game.player;
  if (e.inf1Count === undefined) { e.inf1Count = 0; e.inf1Dash = 0; e.inf1Rest = 0; }
  if (e.inf1Dash > 0) {
    e.inf1Dash -= dt;
    const r = infernoStep(game, e, dt, e.inf1DX, e.inf1DY, 1.7);
    if ((!r.movedX && !r.movedY) || e.inf1Dash <= 0) { e.inf1Dash = 0; e.inf1Rest = Util.rand(0.08, 0.18); }
    return;
  }
  if (e.inf1Rest > 0) { e.inf1Rest -= dt; return; }
  const v = seekVector(e, player.x, player.y);
  e.inf1Count++;
  if (e.inf1Count % 4 === 0) {
    const s = RNG.random() < 0.5 ? 1 : -1;
    e.inf1DX = v.x * 1.1 + (-v.y) * 0.85 * s;
    e.inf1DY = v.y * 1.1 + v.x * 0.85 * s;
    e.inf1Dash = 0.42;
    e.hitFlash = 0.1;
  } else {
    e.inf1DX = v.x; e.inf1DY = v.y;
    e.inf1Dash = Util.rand(0.2, 0.32);
  }
};

ENEMY_BEHAVIOR_HANDLERS.inf1Moltensentinel = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.inf1Mode === undefined) { e.inf1Mode = 0; e.inf1Timer = Util.rand(2.2, 3.2); }
  e.inf1Timer -= dt;
  const d = Util.dist(e.x, e.y, player.x, player.y);
  if (e.inf1Mode === 1) {
    e.shielded = false;
    const v = seekVector(e, player.x, player.y);
    infernoStep(game, e, dt, v.x, v.y, 1.6);
    if (e.inf1Timer <= 0) {
      e.inf1Mode = 0;
      e.inf1Timer = Util.rand(2.4, 3.4);
      infernoScorch(game, e, e.x, e.y, 46);
    }
    return;
  }
  e.shielded = true;
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && d < (t.fireRange || 440) && hasLineOfSight(node, e, player.x, player.y)) {
    e.fireTimer = t.fireCooldown || 1.3;
    infernoArc(game, e, infernoAim(e, player), 3, 0.42, t.boltSpeed || 220, { color: t.boltColor || '#ffb46a', radius: t.boltRadius || 5 });
  }
  if (e.inf1Timer <= 0) { e.inf1Mode = 1; e.inf1Timer = 1.3; e.shielded = false; e.hitFlash = 0.14; }
};

ENEMY_BEHAVIOR_HANDLERS.inf1Cinderlash = function(game, e, dt){
  const player = game.player, t = e.type;
  const reach = t.whipRange || 95;
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 30) > 0) ? 0.14 : 0;
    const v = seekVector(e, player.x, player.y);
    infernoStep(game, e, dt, -v.y, v.x, 0.4);
    if (e.telegraph <= 0) {
      const a = infernoAim(e, player);
      const d = Util.dist(e.x, e.y, player.x, player.y);
      let diff = a - (e.inf1Face || a);
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (d < reach + player.radius && Math.abs(diff) < Math.PI / 2) {
        damagePlayer(game, playerDamageAmount(game, false, e.dmg * (t.whipDamageMult || 1)), e.type.id);
      }
      infernoArc(game, e, e.inf1Face || a, 3, Math.PI, 150, { color: '#ff6a2a', radius: 5 });
      e.attackTimer = t.whipCooldown || 1.5;
    }
    return;
  }
  e.attackTimer -= dt;
  const d = Util.dist(e.x, e.y, player.x, player.y);
  if (d > reach * 1.8) { chaseSeek(game, e, player.x, player.y, 1, dt); e.attackTimer = Math.max(e.attackTimer, 0.2); return; }
  const v = seekVector(e, player.x, player.y);
  infernoStep(game, e, dt, v.x * 0.5 + (-v.y) * 0.9, v.y * 0.5 + v.x * 0.9, 0.9);
  if (e.attackTimer <= 0 && d < reach * 1.4) {
    e.inf1Face = infernoAim(e, player);
    e.telegraph = t.whipTelegraph || 0.45;
  }
};

ENEMY_BEHAVIOR_HANDLERS.inf1Emberwhip = function(game, e, dt){
  const player = game.player, t = e.type;
  const reach = t.whipRange || 88;
  if (e.inf1Crack === undefined) { e.inf1Crack = 0; }
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 36) > 0) ? 0.14 : 0;
    if (e.telegraph <= 0) {
      const second = e.inf1Crack > 0;
      const span = second ? reach * 1.6 : reach;
      if (second) {
        const v = seekVector(e, player.x, player.y);
        infernoStep(game, e, dt, v.x, v.y, 6);
      }
      if (Util.dist(e.x, e.y, player.x, player.y) < span + player.radius) {
        damagePlayer(game, playerDamageAmount(game, false, e.dmg * (t.whipDamageMult || 1)), e.type.id);
      }
      if (second) {
        infernoArc(game, e, infernoAim(e, player), 2, 0.6, 190, { color: '#ff7a3a', radius: 4 });
        e.inf1Crack = 0;
        e.attackTimer = t.whipCooldown || 1.4;
      } else {
        e.inf1Crack = 1;
        e.telegraph = 0.2;
      }
    }
    return;
  }
  e.attackTimer -= dt;
  const d = Util.dist(e.x, e.y, player.x, player.y);
  const v = seekVector(e, player.x, player.y);
  if (d > reach * 2) infernoStep(game, e, dt, v.x, v.y, 1.1);
  else infernoStep(game, e, dt, -v.y * 0.9 + v.x * 0.3, v.x * 0.9 + v.y * 0.3, 0.85);
  if (e.attackTimer <= 0 && d < reach * 1.5) { e.inf1Crack = 0; e.telegraph = t.whipTelegraph || 0.4; }
};

aiChase = infernoWrapById(aiChase);
aiTurret = infernoWrapById(aiTurret);
