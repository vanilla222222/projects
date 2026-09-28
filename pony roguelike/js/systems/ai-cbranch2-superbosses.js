'use strict';

ENEMY_BEHAVIOR_HANDLERS.bossUndertow = function(game, e, dt){
  const player = game.player;
  if (!e.enraged && e.hp < e.maxHp * 0.5) { e.enraged = true; e.hitFlash = 0.3; }
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 18) > 0) ? 0.14 : 0;
    if (e.telegraph <= 0) {
      if (e.pattern === 0) {
        const range = e.enraged ? 260 : 220;
        const d = Util.dist(e.x, e.y, player.x, player.y);
        if (d < range) {
          const pull = Math.min(d - e.radius - player.radius, e.enraged ? 120 : 90);
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
        const n = e.enraged ? 3 : 5, spread = e.enraged ? 0.35 : 0.9;
        const opts = { color: '#6ab4c9', radius: 6, fromBoss: true };
        for (let i = 0; i < n; i++) fireProjectileAngle(game, e, aim - spread / 2 + (spread / (n - 1)) * i, e.enraged ? 240 : 200, e.dmg, opts);
      }
      e.pattern = (e.pattern + 1) % 2;
      e.attackTimer = e.enraged ? 1.7 : 2.4;
    }
    return;
  }
  chaseSeek(game, e, player.x, player.y, e.enraged ? 0.75 : 0.5, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) e.telegraph = 0.55;
};

ENEMY_BEHAVIOR_HANDLERS.bossRiptide = function(game, e, dt){
  const node = game.currentRoom, player = game.player;
  if (!e.enraged && e.hp < e.maxHp * 0.5) { e.enraged = true; e.hitFlash = 0.3; }
  if (e.dashing) {
    tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
    e.dashTimer -= dt;
    if (e.dashTimer <= 0) {
      e.dashing = false;
      if (Util.dist(e.x, e.y, player.x, player.y) < e.radius + player.radius + 16) damagePlayer(game, playerDamageAmount(game, true, e.dmg), e.type.id);
      e.dashesLeft--;
      if (e.dashesLeft > 0) e.telegraph = 0.15; else e.attackTimer = 2.4;
    }
    return;
  }
  if (e.armorTimer === undefined) { e.armorTimer = 3.4; e.shielded = true; }
  if (e.shielded) {
    e.armorTimer -= dt;
    if (e.armorTimer <= 0) { e.shielded = false; e.armorTimer = 2.4; }
    return;
  }
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 26) > 0) ? 0.14 : 0;
    if (e.telegraph <= 0) {
      const aim = Math.atan2(player.y - e.y, player.x - e.x);
      e.zigzagDir = -(e.zigzagDir || 1);
      const jitter = 0.6 * e.zigzagDir;
      e.dashing = true; e.dashTimer = 0.3;
      e.dashVX = Math.cos(aim + jitter) * e.speed * (e.enraged ? 4.2 : 3.6);
      e.dashVY = Math.sin(aim + jitter) * e.speed * (e.enraged ? 4.2 : 3.6);
    }
    return;
  }
  chaseSeek(game, e, player.x, player.y, 0.4, dt);
  e.armorTimer -= dt;
  if (e.armorTimer <= 0) { e.dashesLeft = e.enraged ? 5 : 3; e.telegraph = 0.3; }
};

ENEMY_BEHAVIOR_HANDLERS.bossThermocline = function(game, e, dt){
  const node = game.currentRoom, player = game.player;
  if (!e.enraged && e.hp < e.maxHp * 0.5) { e.enraged = true; e.hitFlash = 0.3; }
  if (e.erupting) {
    e.eruptGrow = (e.eruptGrow || 0) + dt;
    e.hitFlash = (Math.sin(e.eruptGrow * 14) > 0) ? 0.16 : 0;
    if (e.eruptGrow >= 1) {
      const R = e.pattern === 0 ? 110 : 90;
      game.explosions.push(new Explosion(e.x, e.y, R));
      if (Util.dist(e.x, e.y, player.x, player.y) < R + player.radius) damagePlayer(game, playerDamageAmount(game, true, e.dmg), e.type.id);
      e.erupting = false; e.eruptGrow = 0;
      e.pattern = (e.pattern + 1) % 2;
      e.attackTimer = e.enraged ? 1.6 : 2.3;
    }
    return;
  }
  aiWander(game, e, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) { e.erupting = true; e.eruptGrow = 0; game.explosions.push(new Explosion(e.x, e.y, 18)); }
  if (e.enraged) {
    e.summonTimer -= dt;
    if (e.summonTimer <= 0) {
      e.summonTimer = 6;
      const childType = ENEMY_TYPES['magmadartling'];
      if (childType) {
        for (let i = 0; i < 3; i++) {
          const ang = (i / 3) * Math.PI * 2;
          const spot = findNearestFloor(node, Math.floor((e.x + Math.cos(ang) * 45) / TILE), Math.floor((e.y + Math.sin(ang) * 45) / TILE));
          node.enemies.push(new Enemy(childType, spot.x, spot.y, game.dungeon.floorNum));
        }
      }
    }
  }
};

ENEMY_BEHAVIOR_HANDLERS.bossRequiem = function(game, e, dt){
  const node = game.currentRoom, player = game.player;
  if (!e.enraged && e.hp < e.maxHp * 0.5) { e.enraged = true; e.hitFlash = 0.3; }
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 28) > 0) ? 0.14 : 0;
    if (e.telegraph <= 0) {
      if (Util.dist(e.x, e.y, player.x, player.y) < 100 + player.radius) damagePlayer(game, playerDamageAmount(game, true, e.dmg * 1.3), e.type.id);
      e.attackTimer = 2.2;
    }
    return;
  }
  aiWander(game, e, dt);
  if (e.enraged && Util.dist(e.x, e.y, player.x, player.y) < 140) {
    e.attackTimer -= dt;
    if (e.attackTimer <= 0) { e.telegraph = 0.4; return; }
  } else {
    e.wailTimer -= dt;
    if (e.wailTimer <= 0) {
      e.wailTimer = Util.rand(2.8, 3.6);
      const R = 130;
      game.explosions.push(new Explosion(e.x, e.y, R * 0.5));
      if (Util.dist(e.x, e.y, player.x, player.y) < R) {
        player.freezeTimer = Math.max(player.freezeTimer, 0.9);
        Sound.play('statusFreeze');
      }
    }
  }
  e.summonTimer -= dt;
  if (e.summonTimer <= 0 && e.minionsSpawned < 6) {
    e.summonTimer = e.enraged ? 5 : 7;
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

ENEMY_BEHAVIOR_HANDLERS.bossAbyssal = function(game, e, dt){
  const node = game.currentRoom, player = game.player;
  if (!e.enraged && e.hp < e.maxHp * 0.5) { e.enraged = true; e.hitFlash = 0.3; }
  if (e.submerged) {
    e.stalkTimer -= dt;
    if (e.stalkTimer <= 0) { e.submerged = false; e.stalkTimer = 1.4; }
    aiWander(game, e, dt);
    return;
  }
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
  if (e.attackTimer <= 0 && Util.dist(e.x, e.y, player.x, player.y) < 240) {
    e.attackTimer = Util.rand(2.6, 3.4);
    const v = seekVector(e, player.x, player.y);
    e.dashing = true; e.dashTimer = 0.5;
    e.dashVX = v.x * e.speed * (e.enraged ? 5.2 : 4.4); e.dashVY = v.y * e.speed * (e.enraged ? 5.2 : 4.4);
    if (e.enraged) { e.submerged = true; e.stalkTimer = 2.2; }
  }
  e.pulseTimer = (e.pulseTimer === undefined) ? 1.8 : e.pulseTimer - dt;
  if (e.pulseTimer <= 0) {
    e.pulseTimer = 1.8;
    const R = 44 + (e.pulseStage = ((e.pulseStage || 0) + 1) % 3) * 35;
    game.explosions.push(new Explosion(e.x, e.y, R));
    if (Util.dist(e.x, e.y, player.x, player.y) < R + player.radius) damagePlayer(game, playerDamageAmount(game, true, e.dmg), e.type.id);
  }
};

ENEMY_BEHAVIOR_HANDLERS.bossLeviathan = function(game, e, dt){
  const node = game.currentRoom, player = game.player;
  if (!e.enraged && e.hp < e.maxHp * 0.5) { e.enraged = true; e.hitFlash = 0.4; }
  if (e.dashing) {
    tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
    e.dashTimer -= dt;
    if (e.dashTimer <= 0) {
      e.dashing = false;
      if (Util.dist(e.x, e.y, player.x, player.y) < e.radius + player.radius + 20) {
        damagePlayer(game, playerDamageAmount(game, true, e.dmg), e.type.id);
        player.freezeTimer = Math.max(player.freezeTimer, 0.5);
      }
    }
    return;
  }
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 26) > 0) ? 0.16 : 0;
    if (e.telegraph <= 0) {
      const v = seekVector(e, player.x, player.y);
      e.dashing = true; e.dashTimer = 0.4;
      e.dashVX = v.x * e.speed * (e.enraged ? 5.6 : 5); e.dashVY = v.y * e.speed * (e.enraged ? 5.6 : 5);
    }
    return;
  }
  if (e.lastPX === null || e.lastPX === undefined) { e.lastPX = player.x; e.lastPY = player.y; e.stillTimer = 0; }
  const moved = Util.dist(player.x, player.y, e.lastPX, e.lastPY) > 6;
  if (moved) { e.stillTimer = 0; e.lastPX = player.x; e.lastPY = player.y; }
  else {
    e.stillTimer += dt;
    if (e.stillTimer >= 1.5 && Util.dist(e.x, e.y, player.x, player.y) < 170) {
      damagePlayer(game, playerDamageAmount(game, true, e.dmg), e.type.id);
      e.stillTimer = 0;
      game.explosions.push(new Explosion(player.x, player.y, 30));
    }
  }
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) {
    e.fireTimer = e.enraged ? 1.5 : 2.1;
    const aim = Math.atan2(player.y - e.y, player.x - e.x);
    const n = e.enraged ? 5 : 4, spread = 0.75, opts = { color: '#c9382e', radius: 6, fromBoss: true };
    for (let i = 0; i < n; i++) fireProjectileAngle(game, e, aim - spread / 2 + (spread / (n - 1)) * i, 220, e.dmg, opts);
  }
  e.attackTimer -= dt;
  if (e.attackTimer <= 0 && Util.dist(e.x, e.y, player.x, player.y) < 320) {
    e.attackTimer = Util.rand(e.enraged ? 2.2 : 3.4, e.enraged ? 3 : 4.4);
    e.telegraph = 0.4;
  }
  aiWander(game, e, dt);
};
