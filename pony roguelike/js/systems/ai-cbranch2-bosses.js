'use strict';

ENEMY_BEHAVIOR_HANDLERS.bossSiltWarden = function(game, e, dt){
  const player = game.player;
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 18) > 0) ? 0.14 : 0;
    if (e.telegraph <= 0) {
      if (e.pattern === 0) {
        const d = Util.dist(e.x, e.y, player.x, player.y);
        if (d < 220) {
          const pull = Math.min(d - e.radius - player.radius, 90);
          if (pull > 0) {
            const ang = Math.atan2(e.y - player.y, e.x - player.x);
            player.x += Math.cos(ang) * pull; player.y += Math.sin(ang) * pull;
          }
          if (Util.dist(e.x, e.y, player.x, player.y) < e.radius + player.radius + 24) {
            damagePlayer(game, playerDamageAmount(game, true, e.dmg), e.type.id);
          }
        }
      } else {
        const aim = Math.atan2(player.y - e.y, player.x - e.x);
        const n = 5, spread = 0.9, opts = { color: '#6ab4c9', radius: 6, fromBoss: true };
        for (let i = 0; i < n; i++) fireProjectileAngle(game, e, aim - spread / 2 + (spread / (n - 1)) * i, 190, e.dmg, opts);
      }
      e.pattern = (e.pattern + 1) % 2;
      e.attackTimer = 2.4;
    }
    return;
  }
  chaseSeek(game, e, player.x, player.y, 0.5, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) e.telegraph = 0.6;
};

ENEMY_BEHAVIOR_HANDLERS.bossDrownedBellringer = function(game, e, dt){
  const player = game.player;
  if (e.tollActive) {
    e.tollGrow = (e.tollGrow || 0) + dt;
    e.hitFlash = (Math.sin(e.tollGrow * 12) > 0) ? 0.14 : 0;
    if (e.tollGrow >= 1.4) {
      if (Util.dist(e.x, e.y, player.x, player.y) < 130) {
        player.freezeTimer = Math.max(player.freezeTimer, 0.9);
        damagePlayer(game, playerDamageAmount(game, true, e.dmg), e.type.id);
        Sound.play('statusFreeze');
      }
      e.tollActive = false; e.tollGrow = 0;
      e.attackTimer = Util.rand(3.5, 4.5);
    }
    return;
  }
  chaseSeek(game, e, player.x, player.y, 0.7, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) { e.tollActive = true; e.tollGrow = 0; game.explosions.push(new Explosion(e.x, e.y, 24)); }
};

ENEMY_BEHAVIOR_HANDLERS.bossReefWraith = function(game, e, dt){
  const node = game.currentRoom, player = game.player;
  if (e.echoTimer > 0) {
    e.echoTimer -= dt;
    if (e.echoTimer <= 0) fireProjectileAt(game, e, player.x, player.y, 230, e.dmg, { color: '#e0a878', radius: 6, fromBoss: true });
    return;
  }
  e.blinkTimer -= dt;
  if (e.blinkTimer <= 0) {
    e.blinkTimer = 2.6;
    const ang = RNG.random() * Math.PI * 2, dist = Util.rand(120, 220);
    const spot = findNearestFloor(node, Math.floor((player.x + Math.cos(ang) * dist) / TILE), Math.floor((player.y + Math.sin(ang) * dist) / TILE));
    e.x = spot.x; e.y = spot.y;
    fireProjectileAt(game, e, player.x, player.y, 230, e.dmg, { color: '#e0a878', radius: 6, fromBoss: true });
    e.echoTimer = 0.3;
    return;
  }
  aiWander(game, e, dt);
};

ENEMY_BEHAVIOR_HANDLERS.bossBarnacleColossus = function(game, e, dt){
  const player = game.player;
  if (e.armorTimer === undefined) { e.armorTimer = 3.8; e.shielded = true; }
  if (e.shielded) {
    e.armorTimer -= dt;
    if (e.armorTimer <= 0) { e.shielded = false; e.armorTimer = 2.6; e.telegraph = 0.7; }
    return;
  }
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 20) > 0) ? 0.16 : 0;
    if (e.telegraph <= 0) {
      const R = 95;
      game.explosions.push(new Explosion(e.x, e.y, R));
      if (Util.dist(e.x, e.y, player.x, player.y) < R + player.radius) damagePlayer(game, playerDamageAmount(game, true, e.dmg), e.type.id);
    }
    return;
  }
  chaseSeek(game, e, player.x, player.y, 0.55, dt);
  e.armorTimer -= dt;
  if (e.armorTimer <= 0) { e.shielded = true; e.armorTimer = 3.8; }
};

ENEMY_BEHAVIOR_HANDLERS.bossVentMatriarch = function(game, e, dt){
  const node = game.currentRoom, player = game.player;
  if (e.erupting) {
    e.eruptGrow = (e.eruptGrow || 0) + dt;
    e.hitFlash = (Math.sin(e.eruptGrow * 14) > 0) ? 0.16 : 0;
    if (e.eruptGrow >= 1.1) {
      if (Util.dist(e.x, e.y, player.x, player.y) < 100) damagePlayer(game, playerDamageAmount(game, true, e.dmg), e.type.id);
      e.erupting = false; e.eruptGrow = 0;
      e.attackTimer = Util.rand(2.2, 3);
    }
    return;
  }
  aiWander(game, e, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) { e.erupting = true; e.eruptGrow = 0; game.explosions.push(new Explosion(e.x, e.y, 18)); }
  e.summonTimer -= dt;
  if (e.summonTimer <= 0 && e.minionsSpawned < 3) {
    e.summonTimer = 7;
    const childType = ENEMY_TYPES['magmadartling'];
    if (childType) {
      for (let i = 0; i < 2; i++) {
        const ang = RNG.random() * Math.PI * 2;
        const spot = findNearestFloor(node, Math.floor((e.x + Math.cos(ang) * 40) / TILE), Math.floor((e.y + Math.sin(ang) * 40) / TILE));
        node.enemies.push(new Enemy(childType, spot.x, spot.y, game.dungeon.floorNum));
      }
      e.minionsSpawned++;
    }
  }
};

ENEMY_BEHAVIOR_HANDLERS.bossPressureWraith = function(game, e, dt){
  const node = game.currentRoom, player = game.player;
  if (e.dashing) {
    tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
    e.dashTimer -= dt;
    if (e.dashTimer <= 0) e.dashing = false;
    return;
  }
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 24) > 0) ? 0.14 : 0;
    if (e.telegraph <= 0) {
      const R = 90;
      game.explosions.push(new Explosion(e.x, e.y, R));
      if (Util.dist(e.x, e.y, player.x, player.y) < R + player.radius) damagePlayer(game, playerDamageAmount(game, true, e.dmg), e.type.id);
      e.attackTimer = 2.4;
    }
    return;
  }
  aiWander(game, e, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) {
    if (e.pattern === 0) { e.telegraph = 0.6; e.pattern = 1; }
    else {
      const v = seekVector(e, player.x, player.y);
      e.dashing = true; e.dashTimer = 0.5;
      e.dashVX = v.x * e.speed * 4.5; e.dashVY = v.y * e.speed * 4.5;
      e.pattern = 0; e.attackTimer = 2;
    }
  }
};

ENEMY_BEHAVIOR_HANDLERS.bossChoirDrowned = function(game, e, dt){
  const node = game.currentRoom, player = game.player;
  aiWander(game, e, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) {
    e.attackTimer = Util.rand(3, 4);
    const R = 130;
    game.explosions.push(new Explosion(e.x, e.y, R * 0.5));
    if (Util.dist(e.x, e.y, player.x, player.y) < R) {
      player.freezeTimer = Math.max(player.freezeTimer, 0.8);
      Sound.play('statusFreeze');
    }
  }
  e.summonTimer -= dt;
  if (e.summonTimer <= 0 && e.minionsSpawned < 4) {
    e.summonTimer = 8;
    const childType = ENEMY_TYPES['chorusling'];
    if (childType) {
      for (let i = 0; i < 2; i++) {
        const ang = RNG.random() * Math.PI * 2;
        const spot = findNearestFloor(node, Math.floor((e.x + Math.cos(ang) * 35) / TILE), Math.floor((e.y + Math.sin(ang) * 35) / TILE));
        node.enemies.push(new Enemy(childType, spot.x, spot.y, game.dungeon.floorNum));
      }
      e.minionsSpawned += 2;
    }
  }
};

ENEMY_BEHAVIOR_HANDLERS.bossBellcaster = function(game, e, dt){
  const player = game.player;
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 28) > 0) ? 0.14 : 0;
    if (e.telegraph <= 0) {
      if (Util.dist(e.x, e.y, player.x, player.y) < 100 + player.radius) {
        damagePlayer(game, playerDamageAmount(game, true, e.dmg * 1.3), e.type.id);
      }
      e.attackTimer = 2;
    }
    return;
  }
  aiOrbiter(game, e, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) {
    const d = Util.dist(e.x, e.y, player.x, player.y);
    if (d < 130) { e.telegraph = 0.42; return; }
    const aim = Math.atan2(player.y - e.y, player.x - e.x);
    const n = 3, spread = 0.55, opts = { color: '#a89ad0', radius: 6, fromBoss: true };
    for (let i = 0; i < n; i++) fireProjectileAngle(game, e, aim - spread / 2 + (spread / (n - 1)) * i, 210, e.dmg, opts);
    e.attackTimer = 2.2;
  }
};

ENEMY_BEHAVIOR_HANDLERS.bossUndertowReaver = function(game, e, dt){
  const node = game.currentRoom, player = game.player;
  if (e.dashing) {
    tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
    e.dashTimer -= dt;
    if (e.dashTimer <= 0) e.dashing = false;
    return;
  }
  if (e.rideAngle === undefined) e.rideAngle = RNG.random() < 0.5 ? 0 : Math.PI;
  const moved = tryMoveEntity(e, node, node.obstacles, Math.cos(e.rideAngle) * e.speed * dt, Math.sin(e.rideAngle) * e.speed * dt);
  if (!moved.movedX && !moved.movedY) e.rideAngle += Math.PI;
  e.attackTimer -= dt;
  if (e.attackTimer <= 0 && Util.dist(e.x, e.y, player.x, player.y) < 220) {
    e.attackTimer = Util.rand(3, 4);
    const v = seekVector(e, player.x, player.y);
    e.dashing = true; e.dashTimer = 0.55;
    e.dashVX = v.x * e.speed * 4.6; e.dashVY = v.y * e.speed * 4.6;
    const aim = Math.atan2(v.y, v.x);
    const n = 3, spread = 0.4, opts = { color: '#4a6ac0', radius: 6, fromBoss: true };
    for (let i = 0; i < n; i++) fireProjectileAngle(game, e, aim - spread / 2 + (spread / (n - 1)) * i, 220, e.dmg, opts);
  }
};

ENEMY_BEHAVIOR_HANDLERS.bossLightlessMarshal = function(game, e, dt){
  const player = game.player;
  if (e.stalkTimer === undefined) { e.stalkTimer = 2.6; e.submerged = true; }
  e.stalkTimer -= dt;
  if (e.stalkTimer <= 0) {
    e.submerged = !e.submerged;
    e.stalkTimer = e.submerged ? 2.6 : 1.6;
    if (!e.submerged) {
      const R = 90;
      game.explosions.push(new Explosion(e.x, e.y, R));
      if (Util.dist(e.x, e.y, player.x, player.y) < R + player.radius) damagePlayer(game, playerDamageAmount(game, true, e.dmg), e.type.id);
    }
  }
  if (e.submerged) { aiWander(game, e, dt); return; }
  chaseSeek(game, e, player.x, player.y, 1.4, dt);
};

ENEMY_BEHAVIOR_HANDLERS.bossMawSentinel = function(game, e, dt){
  const node = game.currentRoom, player = game.player;
  if (e.dashing) {
    tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
    e.dashTimer -= dt;
    if (e.dashTimer <= 0) e.dashing = false;
    return;
  }
  const v = seekVector(e, player.x, player.y);
  const ring = 260, radial = (v.d - ring) * 0.015, tangent = e.orbitDir * 0.75;
  const mx = v.x * radial + -v.y * tangent, my = v.y * radial + v.x * tangent, len = Math.hypot(mx, my) || 1;
  tryMoveEntity(e, node, node.obstacles, (mx / len) * e.speed * dt, (my / len) * e.speed * dt);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) {
    e.fireTimer = 2;
    const aim = Math.atan2(player.y - e.y, player.x - e.x);
    const n = 4, spread = 0.7, opts = { color: '#8a4a4a', radius: 6, fromBoss: true };
    for (let i = 0; i < n; i++) fireProjectileAngle(game, e, aim - spread / 2 + (spread / (n - 1)) * i, 220, e.dmg, opts);
  }
  e.attackTimer -= dt;
  if (e.attackTimer <= 0 && v.d < 300) {
    e.attackTimer = Util.rand(3.5, 4.5);
    e.dashing = true; e.dashTimer = 0.55;
    e.dashVX = v.x * e.speed * 4.8; e.dashVY = v.y * e.speed * 4.8;
  }
};

ENEMY_BEHAVIOR_HANDLERS.bossLastDiver = function(game, e, dt){
  const node = game.currentRoom, player = game.player;
  if (e.dashing) {
    tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
    e.dashTimer -= dt;
    if (e.dashTimer <= 0) {
      e.dashing = false;
      if (Util.dist(e.x, e.y, player.x, player.y) < e.radius + player.radius + 18) {
        damagePlayer(game, playerDamageAmount(game, true, e.dmg), e.type.id);
      }
    }
    return;
  }
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 24) > 0) ? 0.14 : 0;
    if (e.telegraph <= 0) {
      const v = seekVector(e, player.x, player.y);
      e.dashing = true; e.dashTimer = 0.36;
      e.dashVX = v.x * e.speed * 5.2; e.dashVY = v.y * e.speed * 5.2;
    }
    return;
  }
  if (e.lastPX === null || e.lastPX === undefined) { e.lastPX = player.x; e.lastPY = player.y; e.stillTimer = 0; }
  const moved = Util.dist(player.x, player.y, e.lastPX, e.lastPY) > 6;
  if (moved) { e.stillTimer = 0; e.lastPX = player.x; e.lastPY = player.y; }
  else {
    e.stillTimer += dt;
    if (e.stillTimer >= 1.6 && Util.dist(e.x, e.y, player.x, player.y) < 150) {
      damagePlayer(game, playerDamageAmount(game, true, e.dmg), e.type.id);
      e.stillTimer = 0;
      game.explosions.push(new Explosion(player.x, player.y, 26));
    }
  }
  e.attackTimer -= dt;
  if (e.attackTimer <= 0 && Util.dist(e.x, e.y, player.x, player.y) < 170) { e.attackTimer = Util.rand(3, 4); e.telegraph = 0.4; }
  aiWander(game, e, dt);
};
