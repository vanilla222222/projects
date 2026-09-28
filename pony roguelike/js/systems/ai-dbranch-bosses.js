'use strict';

ENEMY_BEHAVIOR_HANDLERS.bossLensKeeper = function(game, e, dt){
  const player = game.player;
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 22) > 0) ? 0.14 : 0;
    if (e.telegraph <= 0) {
      const aim = Math.atan2(player.y - e.y, player.x - e.x);
      const n = 3, spread = 0.16, opts = { color: '#e8dca0', radius: 5, fromBoss: true };
      for (let i = 0; i < n; i++) fireProjectileAngle(game, e, aim - spread / 2 + (spread / (n - 1)) * i, 320, e.dmg, opts);
      e.attackTimer = Util.rand(2.4, 3.2);
    }
    return;
  }
  chaseSeek(game, e, player.x, player.y, 0.5, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) e.telegraph = 0.75;
};

ENEMY_BEHAVIOR_HANDLERS.bossDomeFracture = function(game, e, dt){
  const node = game.currentRoom, player = game.player;
  if (e.shardTimer > 0) {
    e.shardTimer -= dt;
    e.hitFlash = (Math.sin(e.shardTimer * 20) > 0) ? 0.14 : 0;
    if (e.shardTimer <= 0) {
      for (let i = 0; i < 3; i++) {
        const ang = RNG.random() * Math.PI * 2, dist = Util.rand(0, 90);
        const sx = player.x + Math.cos(ang) * dist, sy = player.y + Math.sin(ang) * dist;
        game.explosions.push(new Explosion(sx, sy, 30));
        if (Util.dist(sx, sy, player.x, player.y) < 30 + player.radius) damagePlayer(game, playerDamageAmount(game, true, e.dmg), e.type.id);
      }
      e.attackTimer = Util.rand(3, 4);
    }
    return;
  }
  aiWander(game, e, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) { e.shardTimer = 0.9; game.explosions.push(new Explosion(e.x, e.y, 16)); }
};

ENEMY_BEHAVIOR_HANDLERS.bossMeridianClockwork = function(game, e, dt){
  const node = game.currentRoom, player = game.player;
  aiOrbiter(game, e, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) {
    e.attackTimer = 2.4;
    const aim = Math.atan2(player.y - e.y, player.x - e.x);
    const n = 4, spread = 0.8, opts = { color: '#e8b458', radius: 6, fromBoss: true };
    for (let i = 0; i < n; i++) fireProjectileAngle(game, e, aim - spread / 2 + (spread / (n - 1)) * i, 200, e.dmg, opts);
  }
  e.summonTimer -= dt;
  if (e.summonTimer <= 0 && e.minionsSpawned < 3) {
    e.summonTimer = 7.5;
    const childType = ENEMY_TYPES['cogmites'];
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

ENEMY_BEHAVIOR_HANDLERS.bossGearwarden = function(game, e, dt){
  const node = game.currentRoom, player = game.player;
  if (e.dashing) {
    tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
    e.dashTimer -= dt;
    if (e.dashTimer <= 0) {
      e.dashing = false;
      const R = 80;
      game.explosions.push(new Explosion(e.x, e.y, R));
      if (Util.dist(e.x, e.y, player.x, player.y) < R + player.radius) damagePlayer(game, playerDamageAmount(game, true, e.dmg), e.type.id);
    }
    return;
  }
  aiWander(game, e, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) {
    e.attackTimer = Util.rand(3, 4);
    if (e.pattern === 0) {
      const v = seekVector(e, player.x, player.y);
      e.dashing = true; e.dashTimer = 0.5;
      e.dashVX = v.x * e.speed * 4.4; e.dashVY = v.y * e.speed * 4.4;
      e.pattern = 1;
    } else {
      const aim = Math.atan2(player.y - e.y, player.x - e.x);
      const n = 3, spread = 0.6, opts = { color: '#c89858', radius: 6, fromBoss: true };
      for (let i = 0; i < n; i++) fireProjectileAngle(game, e, aim - spread / 2 + (spread / (n - 1)) * i, 210, e.dmg, opts);
      e.pattern = 0;
    }
  }
};

ENEMY_BEHAVIOR_HANDLERS.bossColdDrifter = function(game, e, dt){
  const node = game.currentRoom, player = game.player;
  if (e.tollActive) {
    e.tollGrow = (e.tollGrow || 0) + dt;
    e.hitFlash = (Math.sin(e.tollGrow * 14) > 0) ? 0.14 : 0;
    if (e.tollGrow >= 1.1) {
      if (Util.dist(e.x, e.y, player.x, player.y) < 120) {
        player.freezeTimer = Math.max(player.freezeTimer, 1);
        damagePlayer(game, playerDamageAmount(game, true, e.dmg), e.type.id);
        Sound.play('statusFreeze');
      }
      e.tollActive = false; e.tollGrow = 0;
      e.blinkTimer = 2.6;
    }
    return;
  }
  e.blinkTimer -= dt;
  if (e.blinkTimer <= 0) {
    e.blinkTimer = 3;
    const ang = RNG.random() * Math.PI * 2, dist = Util.rand(80, 160);
    const spot = findNearestFloor(node, Math.floor((player.x + Math.cos(ang) * dist) / TILE), Math.floor((player.y + Math.sin(ang) * dist) / TILE));
    e.x = spot.x; e.y = spot.y;
    e.tollActive = true; e.tollGrow = 0;
    return;
  }
  aiWander(game, e, dt);
};

ENEMY_BEHAVIOR_HANDLERS.bossEventHorizon = function(game, e, dt){
  const node = game.currentRoom, player = game.player;
  if (e.pullActive) {
    e.pullGrow = (e.pullGrow || 0) + dt;
    e.hitFlash = (Math.sin(e.pullGrow * 12) > 0) ? 0.14 : 0;
    const d = Util.dist(e.x, e.y, player.x, player.y);
    if (d < 260) {
      const pull = Math.min(d - e.radius - player.radius, 60) * dt * 1.6;
      if (pull > 0) {
        const ang = Math.atan2(e.y - player.y, e.x - player.x);
        player.x += Math.cos(ang) * pull; player.y += Math.sin(ang) * pull;
      }
    }
    if (e.pullGrow >= 1.6) {
      if (Util.dist(e.x, e.y, player.x, player.y) < e.radius + player.radius + 30) {
        damagePlayer(game, playerDamageAmount(game, true, e.dmg), e.type.id);
      }
      e.pullActive = false; e.pullGrow = 0;
      e.attackTimer = Util.rand(3, 4);
    }
    return;
  }
  aiWander(game, e, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) { e.pullActive = true; e.pullGrow = 0; game.explosions.push(new Explosion(e.x, e.y, 20)); }
  e.summonTimer -= dt;
  if (e.summonTimer <= 0 && e.minionsSpawned < 3) {
    e.summonTimer = 8;
    const childType = ENEMY_TYPES['embermites'];
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

ENEMY_BEHAVIOR_HANDLERS.bossLastLight = function(game, e, dt){
  const node = game.currentRoom, player = game.player;
  if (e.dashing) {
    tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
    e.dashTimer -= dt;
    if (e.dashTimer <= 0) {
      e.dashing = false;
      const R = 90;
      game.explosions.push(new Explosion(e.x, e.y, R));
      if (Util.dist(e.x, e.y, player.x, player.y) < R + player.radius) damagePlayer(game, playerDamageAmount(game, true, e.dmg), e.type.id);
    }
    return;
  }
  if (e.dimTimer === undefined) { e.dimTimer = 3.2; e.dimmed = false; }
  e.dimTimer -= dt;
  if (e.dimTimer <= 0) {
    e.dimmed = !e.dimmed;
    e.dimTimer = e.dimmed ? 1.8 : 3.2;
  }
  if (e.dimmed) { aiWander(game, e, dt); return; }
  chaseSeek(game, e, player.x, player.y, 0.6, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) {
    e.attackTimer = Util.rand(2.6, 3.4);
    if (e.pattern === 0) {
      const aim = Math.atan2(player.y - e.y, player.x - e.x);
      const n = 5, spread = 1, opts = { color: '#f0e8c0', radius: 6, fromBoss: true };
      for (let i = 0; i < n; i++) fireProjectileAngle(game, e, aim - spread / 2 + (spread / (n - 1)) * i, 230, e.dmg, opts);
      e.pattern = 1;
    } else {
      const v = seekVector(e, player.x, player.y);
      e.dashing = true; e.dashTimer = 0.5;
      e.dashVX = v.x * e.speed * 4.8; e.dashVY = v.y * e.speed * 4.8;
      e.pattern = 0;
    }
  }
};
