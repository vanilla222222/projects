'use strict';

ENEMY_BEHAVIOR_HANDLERS.mbRustfangProwler = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.dashing) {
    tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
    e.dashTimer -= dt;
    if (e.dashTimer <= 0) { e.dashing = false; e.attackTimer = 1.8; }
    return;
  }
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 26) > 0) ? 0.1 : 0;
    if (e.telegraph <= 0) {
      const v = seekVector(e, player.x, player.y);
      e.dashing = true; e.dashTimer = 0.32;
      e.dashVX = v.x * e.speed * 4.6; e.dashVY = v.y * e.speed * 4.6;
    }
    return;
  }

  const v = seekVector(e, player.x, player.y);
  const ring = 150;
  const radial = (v.d - ring) * 0.02;
  const tangent = e.orbitDir * 0.9;
  const mx = v.x * radial + -v.y * tangent, my = v.y * radial + v.x * tangent;
  const len = Math.hypot(mx, my) || 1;
  tryMoveEntity(e, node, node.obstacles, (mx / len) * e.speed * dt, (my / len) * e.speed * dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0 && v.d < 260) { e.attackTimer = 999; e.telegraph = 0.45; }
};

ENEMY_BEHAVIOR_HANDLERS.mbChainReaver = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.dashing) {
    tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
    e.dashTimer -= dt;
    if (e.dashTimer <= 0) e.dashing = false;
    return;
  }
  const d = Util.dist(e.x, e.y, player.x, player.y);
  if (d < 110) {
    const v = seekVector(e, player.x, player.y);
    e.dashing = true; e.dashTimer = 0.3;
    e.dashVX = v.x * e.speed * 4; e.dashVY = v.y * e.speed * 4;
    return;
  }
  if (d > 220) chaseSeek(game, e, player.x, player.y, 0.6, dt);
  else {
    const v = seekVector(e, player.x, player.y);
    tryMoveEntity(e, node, node.obstacles, -v.x * e.speed * dt * 0.5, -v.y * e.speed * dt * 0.5);
  }
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && d < 340) {
    e.fireTimer = t.fireCooldown || 2.6;
    e.burstShots = 3; e.shotTimer = 0;
  }
  if (e.burstShots > 0) {
    e.shotTimer -= dt;
    if (e.shotTimer <= 0) {
      e.shotTimer = 0.12; e.burstShots--;
      fireProjectileAt(game, e, player.x, player.y, 230, e.dmg, { color:'#8a8a94', radius:5 });
    }
  }
};

ENEMY_BEHAVIOR_HANDLERS.mbCinderDuke = function(game, e, dt){
  const node = game.currentRoom, player = game.player;
  chaseSeek(game, e, player.x, player.y, 0.55, dt);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) {
    e.fireTimer = 0.55;

    if (e.lobTimer <= 0) {
      e.lobX = e.x; e.lobY = e.y;
      e.lobTime = 1.1; e.lobTimer = e.lobTime;
    }
  }
  if (e.lobTimer > 0) {
    e.lobTimer -= dt;
    if (e.lobTimer <= 0) {
      const R = e.type.burstRadius || 34;
      game.explosions.push(new Explosion(e.lobX, e.lobY, R));
      if (Util.dist(e.lobX, e.lobY, player.x, player.y) < R + player.radius) {
        damagePlayer(game, playerDamageAmount(game, e.isBoss, e.dmg), e.type.id);
      }
    }
  }
};

ENEMY_BEHAVIOR_HANDLERS.mbStaticChoir = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  const ring = 170;
  const radial = (v.d - ring) * 0.015;
  const tangent = e.orbitDir * 0.8;
  const mx = v.x * radial + -v.y * tangent, my = v.y * radial + v.x * tangent;
  const len = Math.hypot(mx, my) || 1;
  tryMoveEntity(e, node, node.obstacles, (mx / len) * e.speed * dt, (my / len) * e.speed * dt);
  e.spinAngle = (e.spinAngle || 0) + e.orbitDir * dt * 2.6;
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) {
    e.fireTimer = t.fireCooldown || 0.5;
    fireProjectileAngle(game, e, e.spinAngle, 210, e.dmg, { color:'#c79cff', radius:4.5 });
  }
};

ENEMY_BEHAVIOR_HANDLERS.mbMarrowColossus = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 20) > 0) ? 0.12 : 0;
    if (e.telegraph <= 0) {
      const R = t.burstRadius || 70;
      game.explosions.push(new Explosion(e.x, e.y, R));
      if (Util.dist(e.x, e.y, player.x, player.y) < R + player.radius) {
        damagePlayer(game, playerDamageAmount(game, e.isBoss, e.dmg), e.type.id);
      }

      for (let i = 0; i < 8; i++) fireProjectileAngle(game, e, (i / 8) * Math.PI * 2, 170, Math.max(1, e.dmg - 1), { color:'#c9c0a8', radius:4 });
      e.attackTimer = 3.4;
    }
    return;
  }
  chaseSeek(game, e, player.x, player.y, 0.55, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) { e.attackTimer = 999; e.telegraph = 0.7; }
};

ENEMY_BEHAVIOR_HANDLERS.mbNightglassDuelist = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.dashing) {
    tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
    e.dashTimer -= dt;
    if (e.dashTimer <= 0) {
      e.dashing = false;

      const ang = RNG.random() * Math.PI * 2, dist = 220;
      e.x = Util.clamp(player.x + Math.cos(ang) * dist, e.radius + 20, node.tileW * TILE - e.radius - 20);
      e.y = Util.clamp(player.y + Math.sin(ang) * dist, e.radius + 20, node.tileH * TILE - e.radius - 20);
      e.blinkTimer = t.blinkCooldown || 2.4;
    }
    return;
  }
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    if (e.telegraph <= 0) {
      const v = seekVector(e, player.x, player.y);
      e.dashing = true; e.dashTimer = 0.3;
      e.dashVX = v.x * e.speed * 5; e.dashVY = v.y * e.speed * 5;
    }
    return;
  }
  e.blinkTimer -= dt;
  if (e.blinkTimer <= 0) {
    const ang = RNG.random() * Math.PI * 2, dist = 70;
    e.x = Util.clamp(player.x + Math.cos(ang) * dist, e.radius + 20, node.tileW * TILE - e.radius - 20);
    e.y = Util.clamp(player.y + Math.sin(ang) * dist, e.radius + 20, node.tileH * TILE - e.radius - 20);
    e.telegraph = 0.4;
  } else {
    aiWander(game, e, dt);
  }
};

ENEMY_BEHAVIOR_HANDLERS.mbVerdantWarden = function(game, e, dt){
  const t = e.type;
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) {
    e.fireTimer = t.fireCooldown || 1.3;
    e.spinAngle = (e.spinAngle || 0) + 0.4;
    for (let i = 0; i < 4; i++) fireProjectileAngle(game, e, e.spinAngle + (i / 4) * Math.PI * 2, 180, e.dmg, { color:'#7fd88a', radius:5 });
  }
};

ENEMY_BEHAVIOR_HANDLERS.mbRiptideHexer = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.dashing) {
    tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
    e.dashTimer -= dt;
    if (e.dashTimer <= 0) { e.dashing = false; e.fireTimer = 0.15; }
    return;
  }
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) {
    e.attackTimer = 2.4;
    const ang = RNG.random() * Math.PI * 2;
    e.dashing = true; e.dashTimer = 0.35;
    e.dashVX = Math.cos(ang) * e.speed * 3.2; e.dashVY = Math.sin(ang) * e.speed * 3.2;
    return;
  }
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && e.fireTimer > -900) {
    e.fireTimer = -999;
    const aim = Math.atan2(player.y - e.y, player.x - e.x);
    for (let i = -2; i <= 2; i++) fireProjectileAngle(game, e, aim + i * 0.22, 200, e.dmg, { color:'#5ac9e8', radius:5 });
  }
};

ENEMY_BEHAVIOR_HANDLERS.mbCinderwingReaper = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.dashing) {
    tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
    e.dashTimer -= dt;
    if (e.dashTimer <= 0) e.dashing = false;
    return;
  }
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 24) > 0) ? 0.1 : 0;
    if (e.telegraph <= 0) {
      const v = seekVector(e, player.x, player.y);
      e.dashing = true; e.dashTimer = 0.5;
      e.dashVX = v.x * e.speed * 4.2; e.dashVY = v.y * e.speed * 4.2;
    }
    return;
  }
  e.pathTimer -= dt;
  if (e.pathTimer <= 0 || !e.pathDir) { e.pathDir = { x: Util.rand(-1, 1), y: Util.rand(-1, 1) }; e.pathTimer = Util.rand(0.5, 1); }
  const v = seekVector(e, player.x, player.y);
  const mx = v.x * 0.4 + e.pathDir.x * 0.6, my = v.y * 0.4 + e.pathDir.y * 0.6;
  const len = Math.hypot(mx, my) || 1;
  tryMoveEntity(e, node, node.obstacles, (mx / len) * e.speed * dt, (my / len) * e.speed * dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) { e.attackTimer = t.chargeCooldown || 2.2; e.telegraph = 0.5; }
};

ENEMY_BEHAVIOR_HANDLERS.mbHollowSentinel = function(game, e, dt){
  const t = e.type;

  if (e.mbShieldTimer === undefined) { e.mbShieldTimer = 3; e.shielded = true; }
  e.mbShieldTimer -= dt;
  if (e.mbShieldTimer <= 0) {
    e.shielded = !e.shielded;
    e.mbShieldTimer = e.shielded ? 3 : 1.6;
  }
  if (!e.shielded) {
    const player = game.player;
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) {
      e.fireTimer = t.fireCooldown || 0.35;
      const aim = Math.atan2(player.y - e.y, player.x - e.x);
      fireProjectileAngle(game, e, aim, 220, e.dmg, { color:'#c9c9d4', radius:4.5 });
    }
  }
};
