'use strict';

ENEMY_BEHAVIOR_HANDLERS.ds41Chitinhusk = function(game, e, dt){
  const player = game.player;
  if (e.armorTimer === undefined) { e.armored = true; e.armorTimer = Util.rand(2.2, 3.2); }
  e.armorTimer -= dt;
  if (e.armorTimer <= 0) {
    e.armored = !e.armored;
    e.armorTimer = e.armored ? Util.rand(2.2, 3.2) : Util.rand(1.0, 1.6);
    e.hitFlash = 0.15;
  }
  const ang = desertAim(e, player);
  desertStep(game, e, dt, Math.cos(ang), Math.sin(ang), e.armored ? 0.55 : 1.15);
};

ENEMY_BEHAVIOR_HANDLERS.ds42Quicksandlurker = function(game, e, dt){
  const player = game.player;
  if (e.dashing === undefined) { e.dashing = false; e.telegraphing = false; e.hidden = true; }
  const dist = Util.dist(e.x, e.y, player.x, player.y);
  if (e.dashing) {
    e.dashTimer -= dt;
    desertStep(game, e, dt, e.dashVX, e.dashVY, e.chargeSpeed);
    if (e.dashTimer <= 0) { e.dashing = false; e.hidden = true; }
    return;
  }
  if (e.telegraphing) {
    e.telegraphTimer -= dt;
    e.hitFlash = 0.05;
    if (e.telegraphTimer <= 0) {
      e.telegraphing = false;
      e.dashing = true;
      e.dashTimer = e.dashDuration;
      const ang = desertAim(e, player);
      e.dashVX = Math.cos(ang);
      e.dashVY = Math.sin(ang);
      e.hidden = false;
    }
    return;
  }
  if (dist < e.triggerRange) {
    e.telegraphing = true;
    e.telegraphTimer = e.telegraphTime;
    e.hidden = false;
  } else {
    e.hidden = true;
    aiWander(game, e, dt * 0.4);
  }
};

ENEMY_BEHAVIOR_HANDLERS.ds43Glasspiketurret = function(game, e, dt){
  const player = game.player;
  if (e.spinAng === undefined) { e.spinAng = 0; e.fireTimer = Util.rand(0.6, 1.4); }
  e.spinAng += dt * 1.6;
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) {
    e.fireTimer = e.fireCooldown;
    e.hitFlash = 0.12;
    desertArc(game, e, e.spinAng, e.shotCount, e.spreadAngle, e.boltSpeed, { color: e.boltColor, radius: e.boltRadius });
  }
};

ENEMY_BEHAVIOR_HANDLERS.ds44Scarabdrone = function(game, e, dt){
  const player = game.player;
  if (e.diving === undefined) { e.diving = false; e.hoverTimer = Util.rand(0.8, 1.6); }
  const dist = Util.dist(e.x, e.y, player.x, player.y);
  if (e.diving) {
    const ang = desertAim(e, player);
    desertStep(game, e, dt, Math.cos(ang), Math.sin(ang), 2.0);
    e.fuseLeft -= dt;
    if (e.fuseLeft <= 0 || dist < 26) {
      game.explosions.push(new Explosion(e.x, e.y, e.blastRadius));
      if (Util.dist(e.x, e.y, player.x, player.y) < e.blastRadius) {
        damagePlayer(game, playerDamageAmount(game, false, e.dmg), 'scarabdrone');
      }
      handleEnemyDeath(game, e);
    }
    return;
  }
  e.hoverTimer -= dt;
  if (e.hoverTimer <= 0 && dist < 240) {
    e.diving = true;
    e.fuseLeft = e.fuseTime;
    e.hitFlash = 0.15;
    return;
  }
  aiWander(game, e, dt);
};

ENEMY_BEHAVIOR_HANDLERS.ds45Carrioncaller = function(game, e, dt){
  const player = game.player;
  if (e.summonsOut === undefined) { e.summonsOut = 0; }
  const v = seekVector(e, player.x, player.y);
  if (v.d < e.keepDistance) desertStep(game, e, dt, -v.x, -v.y, 0.6);
  else if (v.d > e.keepDistance + 40) desertStep(game, e, dt, v.x, v.y, 0.6);
  e.summonTimer -= dt;
  if (e.summonTimer <= 0 && e.summonsOut < e.maxSummons) {
    e.summonTimer = e.summonCooldown;
    e.hitFlash = 0.2;
    for (let i = 0; i < e.summonCount; i++) {
      const ang = RNG.random() * Math.PI * 2;
      const child = desertSpawn(game, game.currentRoom, e.type.summonId, e.x + Math.cos(ang) * 40, e.y + Math.sin(ang) * 40);
      if (child) e.summonsOut++;
    }
  }
};

ENEMY_BEHAVIOR_HANDLERS.ds46Mirrormoth = function(game, e, dt){
  const player = game.player;
  if (e.orbitAng === undefined) { e.orbitAng = RNG.random() * Math.PI * 2; e.fireTimer = Util.rand(0.6, 1.2); }
  e.orbitAng += e.orbitSpeed * dt;
  const tx = player.x + Math.cos(e.orbitAng) * e.orbitRadius;
  const ty = player.y + Math.sin(e.orbitAng) * e.orbitRadius;
  const v = seekVector(e, tx, ty);
  desertStep(game, e, dt, v.x, v.y, 1);
  const dist = Util.dist(e.x, e.y, player.x, player.y);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && dist < e.fireRange) {
    e.fireTimer = e.fireCooldown;
    const ang = desertAim(e, player);
    fireProjectileAngle(game, e, ang, e.boltSpeed, e.dmg, { color: e.boltColor, radius: e.boltRadius });
  }
};

ENEMY_BEHAVIOR_HANDLERS.ds47Saltbloater = function(game, e, dt){
  const player = game.player;
  if (e.swellTimer === undefined) { e.swellTimer = Util.rand(1.8, 2.6); e.swollen = false; }
  const ang = desertAim(e, player);
  desertStep(game, e, dt, Math.cos(ang), Math.sin(ang), e.swollen ? 0.4 : 0.9);
  e.swellTimer -= dt;
  if (e.swellTimer <= 0) {
    e.swollen = !e.swollen;
    e.swellTimer = e.swollen ? Util.rand(1.4, 2.0) : Util.rand(1.8, 2.6);
    e.hitFlash = 0.15;
    if (e.swollen) {
      const dist = Util.dist(e.x, e.y, player.x, player.y);
      if (dist < 60) damagePlayer(game, playerDamageAmount(game, false, e.dmg), 'saltbloater');
    }
  }
};

ENEMY_BEHAVIOR_HANDLERS.ds48Sandtrapper = function(game, e, dt){
  const player = game.player;
  if (e.buried === undefined) { e.buried = true; e.dashing = false; e.telegraphing = false; }
  const dist = Util.dist(e.x, e.y, player.x, player.y);
  if (e.dashing) {
    e.dashTimer -= dt;
    desertStep(game, e, dt, e.dashVX, e.dashVY, e.chargeSpeed);
    if (e.dashTimer <= 0) { e.dashing = false; e.buried = true; }
    return;
  }
  if (e.telegraphing) {
    e.telegraphTimer -= dt;
    if (e.telegraphTimer <= 0) {
      e.telegraphing = false;
      e.dashing = true;
      e.dashTimer = e.dashDuration;
      const ang = desertAim(e, player);
      e.dashVX = Math.cos(ang);
      e.dashVY = Math.sin(ang);
      e.buried = false;
    }
    return;
  }
  if (dist < e.triggerRange) {
    e.telegraphing = true;
    e.telegraphTimer = e.telegraphTime;
    e.hitFlash = 0.1;
  } else {
    e.buried = true;
  }
};

ENEMY_BEHAVIOR_HANDLERS.ds49Siroccochanter = function(game, e, dt){
  const player = game.player;
  if (e.fireTimer === undefined) { e.fireTimer = Util.rand(0.8, 1.6); e.strafeDir = RNG.random() < 0.5 ? 1 : -1; }
  const v = seekVector(e, player.x, player.y);
  if (v.d < e.keepDistance - 20) desertStep(game, e, dt, -v.x, -v.y, 0.7);
  else if (v.d > e.keepDistance + 20) desertStep(game, e, dt, v.x, v.y, 0.7);
  else desertStep(game, e, dt, -v.y * e.strafeDir, v.x * e.strafeDir, 0.5);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) {
    e.fireTimer = e.fireCooldown;
    const ang = desertAim(e, player);
    desertArc(game, e, ang, e.shotCount, e.spreadAngle, e.boltSpeed, { color: e.boltColor, radius: e.boltRadius });
  }
};

ENEMY_BEHAVIOR_HANDLERS.ds50Basaltpouncer = function(game, e, dt){
  const player = game.player;
  if (e.leapTimer === undefined) { e.leapTimer = Util.rand(0.8, 1.6); e.leaping = false; e.telegraphing = false; }
  if (e.leaping) {
    e.leapTime -= dt;
    desertStep(game, e, dt, e.leapVX, e.leapVY, e.leapSpeed);
    if (e.leapTime <= 0) {
      e.leaping = false;
      e.leapTimer = e.leapCooldown;
      const dist = Util.dist(e.x, e.y, player.x, player.y);
      if (dist < 50) damagePlayer(game, playerDamageAmount(game, false, e.dmg), 'basaltpouncer');
    }
    return;
  }
  if (e.telegraphing) {
    e.telegraphTimer -= dt;
    e.hitFlash = 0.08;
    if (e.telegraphTimer <= 0) {
      e.telegraphing = false;
      e.leaping = true;
      e.leapTime = 0.4;
      const ang = desertAim(e, player);
      e.leapVX = Math.cos(ang);
      e.leapVY = Math.sin(ang);
    }
    return;
  }
  e.leapTimer -= dt;
  const dist = Util.dist(e.x, e.y, player.x, player.y);
  if (e.leapTimer <= 0 && dist < 220) {
    e.telegraphing = true;
    e.telegraphTimer = e.telegraphTime;
    return;
  }
  const ang = desertAim(e, player);
  desertStep(game, e, dt, Math.cos(ang), Math.sin(ang), 0.5);
};

ENEMY_BEHAVIOR_HANDLERS.ds51Glasswake = function(game, e, dt){
  const player = game.player;
  if (e.dashing === undefined) { e.dashing = false; e.telegraphing = false; e.shimmer = 0; }
  e.shimmer += dt;
  const dist = Util.dist(e.x, e.y, player.x, player.y);
  if (e.dashing) {
    e.dashTimer -= dt;
    desertStep(game, e, dt, e.dashVX, e.dashVY, e.chargeSpeed);
    if (e.dashTimer <= 0) e.dashing = false;
    return;
  }
  if (e.telegraphing) {
    e.telegraphTimer -= dt;
    e.hitFlash = 0.06;
    if (e.telegraphTimer <= 0) {
      e.telegraphing = false;
      e.dashing = true;
      e.dashTimer = e.dashDuration;
      const ang = desertAim(e, player);
      e.dashVX = Math.cos(ang);
      e.dashVY = Math.sin(ang);
    }
    return;
  }
  if (dist < e.triggerRange) {
    e.telegraphing = true;
    e.telegraphTimer = e.telegraphTime;
  } else {
    const perp = Math.sin(e.shimmer * 1.4) * 0.5;
    const ang = desertAim(e, player);
    desertStep(game, e, dt, Math.cos(ang + perp), Math.sin(ang + perp), 0.4);
  }
};

ENEMY_BEHAVIOR_HANDLERS.ds52Mirageoracle = function(game, e, dt){
  const player = game.player;
  if (e.fireTimer === undefined) e.fireTimer = Util.rand(0.6, 1.2);
  const dist = Util.dist(e.x, e.y, player.x, player.y);
  const active = dist <= e.sentryThreshold * 5 || dist <= e.fireRange;
  if (!active) return;
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && dist < e.fireRange) {
    e.fireTimer = e.fireCooldown;
    e.hitFlash = 0.12;
    const ang = desertAim(e, player);
    fireProjectileAngle(game, e, ang, e.boltSpeed, e.dmg, { color: e.boltColor, radius: e.boltRadius });
    fireProjectileAngle(game, e, ang + 0.3, e.boltSpeed * 0.85, e.dmg, { color: e.boltColor, radius: e.boltRadius });
    fireProjectileAngle(game, e, ang - 0.3, e.boltSpeed * 0.85, e.dmg, { color: e.boltColor, radius: e.boltRadius });
  }
};

ENEMY_BEHAVIOR_HANDLERS.ds53Gildedscarab = function(game, e, dt){
  const player = game.player;
  if (e.burrowed === undefined) { e.burrowed = false; e.burrowTimer = Util.rand(1.0, 1.8); }
  if (e.burrowed) {
    e.burrowTimer -= dt;
    if (e.burrowTimer <= 0) {
      e.burrowed = false;
      e.burrowTimer = Util.rand(1.6, 2.4);
      const spot = findNearestFloor(game.currentRoom, Math.floor(player.x / TILE), Math.floor(player.y / TILE));
      e.x = spot.x; e.y = spot.y;
      e.hitFlash = 0.2;
    }
    return;
  }
  e.burrowTimer -= dt;
  if (e.burrowTimer <= 0) {
    e.burrowed = true;
    e.burrowTimer = e.burrowTime;
    return;
  }
  const ang = desertAim(e, player);
  desertStep(game, e, dt, Math.cos(ang), Math.sin(ang), 0.8);
};

ENEMY_BEHAVIOR_HANDLERS.ds54Sunveilmoth = function(game, e, dt){
  const player = game.player;
  if (e.fireTimer === undefined) { e.fireTimer = Util.rand(0.6, 1.2); e.weaveT = RNG.random() * Math.PI * 2; }
  e.weaveT += dt * 3.2;
  const ang = desertAim(e, player);
  const weave = Math.sin(e.weaveT) * 0.5;
  desertStep(game, e, dt, Math.cos(ang + weave), Math.sin(ang + weave), 1);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) {
    e.fireTimer = e.fireCooldown;
    fireProjectileAngle(game, e, ang, e.boltSpeed, e.dmg, {});
  }
};

ENEMY_BEHAVIOR_HANDLERS.ds55Gravedrift = function(game, e, dt){
  const player = game.player;
  if (e.fireTimer === undefined) { e.fireTimer = Util.rand(0.4, 1.0); e.driftAng = RNG.random() * Math.PI * 2; }
  e.driftAng += dt * 0.8;
  desertStep(game, e, dt, Math.cos(e.driftAng), Math.sin(e.driftAng), 0.5);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) {
    e.fireTimer = e.fireCooldown;
    const ang = desertAim(e, player);
    fireProjectileAngle(game, e, ang, e.boltSpeed, e.dmg, {});
  }
};

ENEMY_BEHAVIOR_HANDLERS.ds56Banshee = function(game, e, dt){
  const player = game.player;
  if (e.fireTimer === undefined) e.fireTimer = Util.rand(0.6, 1.2);
  const v = seekVector(e, player.x, player.y);
  if (v.d < e.keepDistance - 20) desertStep(game, e, dt, -v.x, -v.y, 0.75);
  else if (v.d > e.keepDistance + 20) desertStep(game, e, dt, v.x, v.y, 0.75);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) {
    e.fireTimer = e.fireCooldown;
    const ang = desertAim(e, player);
    fireProjectileAngle(game, e, ang, e.boltSpeed, e.dmg, {});
    fireProjectileAngle(game, e, ang + 0.5, e.boltSpeed, e.dmg, {});
  }
};
