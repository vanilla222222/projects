'use strict';

ENEMY_BEHAVIOR_HANDLERS.tideDrag = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.dragAngle === undefined) e.dragAngle = RNG.random() * Math.PI * 2;
  const v = seekVector(e, player.x, player.y);
  const mix = t.dragStrength || 0.4;
  const mx = v.x * (1 - mix) + Math.cos(e.dragAngle) * mix;
  const my = v.y * (1 - mix) + Math.sin(e.dragAngle) * mix;
  const len = Math.hypot(mx, my) || 1;
  tryMoveEntity(e, node, node.obstacles, (mx / len) * e.speed * dt, (my / len) * e.speed * dt);
};

ENEMY_BEHAVIOR_HANDLERS.siltAmbush = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.submergeTimer === undefined) { e.submergeTimer = t.submergeTime || 2.2; e.submerged = false; }
  e.submergeTimer -= dt;
  if (e.submergeTimer <= 0) {
    e.submerged = !e.submerged;
    e.submergeTimer = e.submerged ? (t.submergeTime || 2.2) : (t.surfaceTime || 1.4);
    if (!e.submerged) {
      const aim = Math.atan2(player.y - e.y, player.x - e.x);
      const spread = 0.4, opts = { color: t.boltColor || '#6ab4c9', radius: 5 };
      for (let i = -1; i <= 1; i++) fireProjectileAngle(game, e, aim + i * spread, t.boltSpeed || 210, e.dmg, opts);
    }
  }
  if (e.submerged) { aiWander(game, e, dt); return; }
  chaseSeek(game, e, player.x, player.y, 0.6, dt);
};

ENEMY_BEHAVIOR_HANDLERS.drownedGrasp = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 20) > 0) ? 0.12 : 0;
    if (e.telegraph <= 0) {
      const d = Util.dist(e.x, e.y, player.x, player.y);
      if (d < (t.grabRange || 130)) {
        const pull = Math.min(d - e.radius - player.radius, t.pullDistance || 60);
        if (pull > 0) {
          const ang = Math.atan2(e.y - player.y, e.x - player.x);
          player.x += Math.cos(ang) * pull; player.y += Math.sin(ang) * pull;
        }
        if (Util.dist(e.x, e.y, player.x, player.y) < e.radius + player.radius + 20) {
          damagePlayer(game, playerDamageAmount(game, false, e.dmg), e.type.id);
        }
      }
      e.attackTimer = t.grabCooldown || 2.5;
    }
    return;
  }
  e.attackTimer -= dt;
  if (e.attackTimer <= 0 && Util.dist(e.x, e.y, player.x, player.y) < (t.grabRange || 130)) e.telegraph = t.telegraphTime || 0.5;
};

ENEMY_BEHAVIOR_HANDLERS.barnacleTurret = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.armorTimer === undefined) { e.armorTimer = t.shellTime || 3.5; e.shielded = true; }
  e.armorTimer -= dt;
  if (e.armorTimer <= 0) {
    e.shielded = !e.shielded;
    e.armorTimer = e.shielded ? (t.shellTime || 3.5) : (t.openTime || 2);
  }
  if (e.shielded) return;
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) {
    e.fireTimer = t.fireCooldown || 1.5;
    const aim = Math.atan2(player.y - e.y, player.x - e.x);
    const n = 3, spread = 0.5, opts = { color: t.boltColor || '#e0a878', radius: 5 };
    for (let i = 0; i < n; i++) fireProjectileAngle(game, e, aim - spread / 2 + (spread / (n - 1)) * i, t.boltSpeed || 200, e.dmg, opts);
  }
};

ENEMY_BEHAVIOR_HANDLERS.reefDart = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.dashing) {
    tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
    e.dashTimer -= dt;
    if (e.dashTimer <= 0) e.dashing = false;
    return;
  }
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) {
    e.attackTimer = t.dashCooldown || 0.5;
    const aim = Math.atan2(player.y - e.y, player.x - e.x);
    e.zigzagDir = -(e.zigzagDir || 1);
    const jitter = (t.zigzagAngle || 0.6) * e.zigzagDir;
    e.dashing = true; e.dashTimer = t.dashDuration || 0.3;
    e.dashVX = Math.cos(aim + jitter) * e.speed * (t.dashMult || 3.4);
    e.dashVY = Math.sin(aim + jitter) * e.speed * (t.dashMult || 3.4);
  }
};

ENEMY_BEHAVIOR_HANDLERS.echoShot = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  const d = Util.dist(e.x, e.y, player.x, player.y);
  const keep = t.keepDistance || 200;
  if (d < keep - 20) {
    const mx = e.x - player.x, my = e.y - player.y, len = Math.hypot(mx, my) || 1;
    tryMoveEntity(e, node, node.obstacles, (mx / len) * e.speed * dt, (my / len) * e.speed * dt);
  } else if (d > keep + 20) {
    chaseSeek(game, e, player.x, player.y, 1, dt);
  }
  if (e.echoTimer > 0) {
    e.echoTimer -= dt;
    if (e.echoTimer <= 0) fireProjectileAt(game, e, player.x, player.y, t.boltSpeed || 220, e.dmg, { color: t.boltColor || '#c9a878', radius: 5 });
    return;
  }
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && d < (t.fireRange || 380)) {
    e.fireTimer = t.fireCooldown || 2.2;
    fireProjectileAt(game, e, player.x, player.y, t.boltSpeed || 220, e.dmg, { color: t.boltColor || '#c9a878', radius: 5 });
    e.echoTimer = t.echoDelay || 0.3;
  }
};

ENEMY_BEHAVIOR_HANDLERS.ventScalder = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.eruptTimer === undefined) e.eruptTimer = Util.rand(1.5, 2.5);
  if (e.erupting) {
    e.eruptGrow += dt;
    e.hitFlash = (Math.sin(e.eruptGrow * 14) > 0) ? 0.14 : 0;
    if (e.eruptGrow >= (t.eruptGrowTime || 1.2)) {
      const R = t.burnRadius || 80;
      if (Util.dist(e.x, e.y, player.x, player.y) < R) damagePlayer(game, playerDamageAmount(game, false, e.dmg), e.type.id);
      e.erupting = false;
      e.eruptTimer = Util.rand(t.eruptCooldownMin || 2.5, t.eruptCooldownMax || 4);
    }
    return;
  }
  e.eruptTimer -= dt;
  if (e.eruptTimer <= 0) { e.erupting = true; e.eruptGrow = 0; game.explosions.push(new Explosion(e.x, e.y, 16)); }
};

ENEMY_BEHAVIOR_HANDLERS.pressureCrusher = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 24) > 0) ? 0.12 : 0;
    if (e.telegraph <= 0) {
      const R = t.burstRadius || 70;
      game.explosions.push(new Explosion(e.x, e.y, R));
      if (Util.dist(e.x, e.y, player.x, player.y) < R + player.radius) damagePlayer(game, playerDamageAmount(game, false, e.dmg), e.type.id);
      e.attackTimer = t.crushCooldown || 2.6;
    }
    return;
  }
  aiWander(game, e, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) e.telegraph = t.telegraphTime || 0.6;
};

ENEMY_BEHAVIOR_HANDLERS.magmaDartFish = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.dashing) {
    tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
    e.dashTimer -= dt;
    if (e.dashTimer <= 0) e.dashing = false;
    return;
  }
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) {
    e.attackTimer = t.dartCooldown || 1.1;
    const v = seekVector(e, player.x, player.y);
    e.dartOut = !e.dartOut;
    const dir = e.dartOut ? 1 : -1;
    e.dashing = true; e.dashTimer = t.dashDuration || 0.32;
    e.dashVX = v.x * e.speed * (t.dashMult || 4) * dir;
    e.dashVY = v.y * e.speed * (t.dashMult || 4) * dir;
  }
};

ENEMY_BEHAVIOR_HANDLERS.choirWail = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.wailTimer === undefined) e.wailTimer = Util.rand(2, 3);
  e.wailTimer -= dt;
  if (e.wailTimer <= 0) {
    e.wailTimer = Util.rand(t.wailCooldownMin || 3.5, t.wailCooldownMax || 5);
    const R = t.wailRadius || 100;
    game.explosions.push(new Explosion(e.x, e.y, R * 0.5));
    if (Util.dist(e.x, e.y, player.x, player.y) < R) {
      player.freezeTimer = Math.max(player.freezeTimer, t.wailFreeze || 0.6);
      Sound.play('statusFreeze');
    }
  }
  aiWander(game, e, dt);
};

ENEMY_BEHAVIOR_HANDLERS.bellSwing = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 30) > 0) ? 0.12 : 0;
    if (e.telegraph <= 0) {
      if (Util.dist(e.x, e.y, player.x, player.y) < (t.swingRange || 85) + player.radius) {
        damagePlayer(game, playerDamageAmount(game, false, e.dmg * (t.swingDamageMult || 1.3)), e.type.id);
      }
      e.attackTimer = t.swingCooldown || 2.2;
    }
    return;
  }
  aiOrbiter(game, e, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0 && Util.dist(e.x, e.y, player.x, player.y) < (t.swingRange || 85) + 40) e.telegraph = t.telegraphTime || 0.4;
};

ENEMY_BEHAVIOR_HANDLERS.hymnistSummoner = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  e.summonTimer -= dt;
  if (e.summonTimer <= 0 && e.minionsSpawned < (t.maxSummons || 4)) {
    e.summonTimer = t.summonCooldown || 6;
    const childType = ENEMY_TYPES[t.summonId];
    if (childType) {
      for (let i = 0; i < 2; i++) {
        const ang = RNG.random() * Math.PI * 2;
        const spot = findNearestFloor(node, Math.floor((e.x + Math.cos(ang) * 30) / TILE), Math.floor((e.y + Math.sin(ang) * 30) / TILE));
        node.enemies.push(new Enemy(childType, spot.x, spot.y, game.dungeon.floorNum));
        e.minionsSpawned++;
      }
    }
  }
  const d = Util.dist(e.x, e.y, player.x, player.y);
  const keep = t.keepDistance || 190;
  if (d < keep - 20) {
    const mx = e.x - player.x, my = e.y - player.y, len = Math.hypot(mx, my) || 1;
    tryMoveEntity(e, node, node.obstacles, (mx / len) * e.speed * dt, (my / len) * e.speed * dt);
  } else if (d > keep + 20) {
    chaseSeek(game, e, player.x, player.y, 1, dt);
  }
};

ENEMY_BEHAVIOR_HANDLERS.currentRider = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.dashing) {
    tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
    e.dashTimer -= dt;
    if (e.dashTimer <= 0) e.dashing = false;
    return;
  }
  if (e.rideAngle === undefined) e.rideAngle = RNG.random() < 0.5 ? 0 : Math.PI;
  const moved = tryMoveEntity(e, node, node.obstacles, Math.cos(e.rideAngle) * e.speed * dt, Math.sin(e.rideAngle) * e.speed * dt);
  if (!moved.movedX && !moved.movedY) e.rideAngle += Math.PI;
  e.lungeTimer = (e.lungeTimer || 0) - dt;
  if (Util.dist(e.x, e.y, player.x, player.y) < (t.lungeRange || 90) && e.lungeTimer <= 0) {
    const perp = e.rideAngle + (Math.PI / 2) * (RNG.random() < 0.5 ? 1 : -1);
    e.dashing = true; e.dashTimer = t.lungeDuration || 0.3;
    e.dashVX = Math.cos(perp) * e.speed * (t.lungeMult || 3.5);
    e.dashVY = Math.sin(perp) * e.speed * (t.lungeMult || 3.5);
    e.lungeTimer = t.lungeCooldown || 2;
  }
};

ENEMY_BEHAVIOR_HANDLERS.voidPulse = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.pulseTimer === undefined) { e.pulseTimer = t.pulseCooldown || 1.8; e.pulseStage = 0; }
  e.pulseTimer -= dt;
  if (e.pulseTimer <= 0) {
    e.pulseTimer = t.pulseCooldown || 1.8;
    const R = (t.pulseBaseRadius || 40) + e.pulseStage * (t.pulseStep || 35);
    game.explosions.push(new Explosion(e.x, e.y, R));
    if (Util.dist(e.x, e.y, player.x, player.y) < R + player.radius) damagePlayer(game, playerDamageAmount(game, false, e.dmg), e.type.id);
    e.pulseStage = (e.pulseStage + 1) % (t.pulseCycles || 3);
  }
};

ENEMY_BEHAVIOR_HANDLERS.abyssalStalker = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.stalkTimer === undefined) { e.stalkTimer = t.hiddenTime || 3; e.submerged = true; }
  e.stalkTimer -= dt;
  if (e.stalkTimer <= 0) {
    e.submerged = !e.submerged;
    e.stalkTimer = e.submerged ? (t.hiddenTime || 3) : (t.exposedTime || 1.2);
  }
  if (e.submerged) { aiWander(game, e, dt); return; }
  chaseSeek(game, e, player.x, player.y, 1.3, dt);
};

ENEMY_BEHAVIOR_HANDLERS.mawSnapper = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.dashing) {
    tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
    e.dashTimer -= dt;
    if (e.dashTimer <= 0) {
      e.dashing = false;
      if (Util.dist(e.x, e.y, player.x, player.y) < e.radius + player.radius + 16) {
        damagePlayer(game, playerDamageAmount(game, false, e.dmg), e.type.id);
        player.freezeTimer = Math.max(player.freezeTimer, t.biteFreeze || 0.4);
      }
    }
    return;
  }
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 26) > 0) ? 0.12 : 0;
    if (e.telegraph <= 0) {
      const v = seekVector(e, player.x, player.y);
      e.dashing = true; e.dashTimer = t.biteDuration || 0.32;
      e.dashVX = v.x * e.speed * (t.biteSpeed || 5.4);
      e.dashVY = v.y * e.speed * (t.biteSpeed || 5.4);
    }
    return;
  }
  if (Util.dist(e.x, e.y, player.x, player.y) < (t.biteRange || 160)) { e.telegraph = t.telegraphTime || 0.4; return; }
  aiWander(game, e, dt);
};

ENEMY_BEHAVIOR_HANDLERS.depthWarden = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.dashing) {
    tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
    e.dashTimer -= dt;
    if (e.dashTimer <= 0) e.dashing = false;
    return;
  }
  const v = seekVector(e, player.x, player.y);
  const ring = t.keepDistance || 240;
  const radial = (v.d - ring) * 0.016;
  const tangent = e.orbitDir * 0.8;
  const mx = v.x * radial + -v.y * tangent, my = v.y * radial + v.x * tangent;
  const len = Math.hypot(mx, my) || 1;
  tryMoveEntity(e, node, node.obstacles, (mx / len) * e.speed * dt, (my / len) * e.speed * dt);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) {
    e.fireTimer = t.fireCooldown || 2;
    const aim = Math.atan2(player.y - e.y, player.x - e.x);
    const n = 3, spread = 0.55, opts = { color: t.boltColor || '#a89ad0', radius: 5 };
    for (let i = 0; i < n; i++) fireProjectileAngle(game, e, aim - spread / 2 + (spread / (n - 1)) * i, t.boltSpeed || 210, e.dmg, opts);
  }
  e.attackTimer -= dt;
  if (e.attackTimer <= 0 && v.d < (t.chargeRange || 300)) {
    e.attackTimer = Util.rand(t.chargeCooldownMin || 4, t.chargeCooldownMax || 6);
    e.dashing = true; e.dashTimer = t.chargeDuration || 0.5;
    e.dashVX = v.x * e.speed * (t.chargeMult || 4.5);
    e.dashVY = v.y * e.speed * (t.chargeMult || 4.5);
  }
};

ENEMY_BEHAVIOR_HANDLERS.crushTide = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.lastPX === null || e.lastPX === undefined) { e.lastPX = player.x; e.lastPY = player.y; e.stillTimer = 0; }
  const moved = Util.dist(player.x, player.y, e.lastPX, e.lastPY) > (t.stillThreshold || 6);
  if (moved) { e.stillTimer = 0; e.lastPX = player.x; e.lastPY = player.y; }
  else {
    e.stillTimer += dt;
    if (e.stillTimer >= (t.stillTime || 1.8) && Util.dist(e.x, e.y, player.x, player.y) < (t.crushRadius || 140)) {
      damagePlayer(game, playerDamageAmount(game, false, e.dmg), e.type.id);
      e.stillTimer = 0;
      game.explosions.push(new Explosion(player.x, player.y, 24));
    }
  }
  aiWander(game, e, dt);
};
