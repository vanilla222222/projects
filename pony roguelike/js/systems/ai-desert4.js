'use strict';

ENEMY_BEHAVIOR_HANDLERS.ds57Dunepouncer = function(game, e, dt){
  const player = game.player;
  if (e.leapTimer === undefined) { e.leapTimer = Util.rand(0.6, 1.2); e.leaping = false; e.telegraphing = false; e.buried = true; }
  const dist = Util.dist(e.x, e.y, player.x, player.y);
  if (e.leaping) {
    e.leapTime -= dt;
    desertStep(game, e, dt, e.leapVX, e.leapVY, e.leapSpeed);
    if (e.leapTime <= 0) {
      e.leaping = false;
      e.leapTimer = Util.rand(1.0, 1.6);
      e.buried = true;
      if (Util.dist(e.x, e.y, player.x, player.y) < 46) damagePlayer(game, playerDamageAmount(game, false, e.dmg), 'dunepouncer');
    }
    return;
  }
  if (e.telegraphing) {
    e.telegraphTimer -= dt;
    e.hitFlash = 0.08;
    e.buried = false;
    if (e.telegraphTimer <= 0) {
      e.telegraphing = false;
      e.leaping = true;
      e.leapTime = 0.35;
      const ang = desertAim(e, player);
      e.leapVX = Math.cos(ang);
      e.leapVY = Math.sin(ang);
    }
    return;
  }
  e.leapTimer -= dt;
  if (e.leapTimer <= 0 && dist < e.pounceRange) {
    e.telegraphing = true;
    e.telegraphTimer = 0.35;
    return;
  }
  e.buried = dist > e.pounceRange * 0.6;
};

ENEMY_BEHAVIOR_HANDLERS.ds58Miragestrafer = function(game, e, dt){
  const player = game.player;
  if (e.fireTimer === undefined) { e.fireTimer = Util.rand(0.5, 1.0); e.orbitAng = RNG.random() * Math.PI * 2; e.orbitDir = RNG.random() < 0.5 ? 1 : -1; }
  e.orbitAng += dt * 0.9 * e.orbitDir;
  const tx = player.x + Math.cos(e.orbitAng) * e.keepDistance;
  const ty = player.y + Math.sin(e.orbitAng) * e.keepDistance;
  const v = seekVector(e, tx, ty);
  desertStep(game, e, dt, v.x, v.y, 0.9);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) {
    e.fireTimer = e.fireCooldown;
    const ang = desertAim(e, player);
    fireProjectileAngle(game, e, ang, e.boltSpeed || 190, e.dmg, { color: e.boltColor });
  }
};

ENEMY_BEHAVIOR_HANDLERS.ds59Twinfangviper = function(game, e, dt){
  const player = game.player;
  if (e.fireTimer === undefined) { e.fireTimer = Util.rand(0.7, 1.4); e.keepDistance = 170; }
  const v = seekVector(e, player.x, player.y);
  if (v.d < e.keepDistance - 20) desertStep(game, e, dt, -v.x, -v.y, 0.6);
  else if (v.d > e.keepDistance + 20) desertStep(game, e, dt, v.x, v.y, 0.6);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) {
    e.fireTimer = e.fireCooldown;
    e.hitFlash = 0.12;
    const ang = desertAim(e, player);
    fireProjectileAngle(game, e, ang + e.splitAngle, e.boltSpeed || 200, e.dmg, { color: e.boltColor });
    fireProjectileAngle(game, e, ang - e.splitAngle, e.boltSpeed || 200, e.dmg, { color: e.boltColor });
  }
};

ENEMY_BEHAVIOR_HANDLERS.ds60Sandambusher = function(game, e, dt){
  const player = game.player;
  if (e.buried === undefined) { e.buried = true; e.leaping = false; e.telegraphing = false; e.leapTimer = Util.rand(0.5, 1.0); }
  const dist = Util.dist(e.x, e.y, player.x, player.y);
  if (e.leaping) {
    e.leapTime -= dt;
    desertStep(game, e, dt, e.leapVX, e.leapVY, e.leapSpeed);
    if (e.leapTime <= 0) {
      e.leaping = false;
      e.buried = true;
      e.leapTimer = Util.rand(1.2, 1.8);
      if (Util.dist(e.x, e.y, player.x, player.y) < 50) damagePlayer(game, playerDamageAmount(game, false, e.dmg), 'sandambusher');
    }
    return;
  }
  if (e.telegraphing) {
    e.telegraphTimer -= dt;
    e.buried = false;
    e.hitFlash = 0.1;
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
  if (e.leapTimer <= 0 && dist < e.pounceRange) {
    e.telegraphing = true;
    e.telegraphTimer = 0.45;
  } else {
    e.buried = dist > e.pounceRange * 0.5;
  }
};

ENEMY_BEHAVIOR_HANDLERS.ds61Heatwavegunner = function(game, e, dt){
  const player = game.player;
  if (e.fireTimer === undefined) { e.fireTimer = Util.rand(0.5, 1.1); e.strafeDir = RNG.random() < 0.5 ? 1 : -1; e.strafeTimer = Util.rand(1.0, 2.0); }
  const v = seekVector(e, player.x, player.y);
  e.strafeTimer -= dt;
  if (e.strafeTimer <= 0) { e.strafeDir *= -1; e.strafeTimer = Util.rand(1.0, 2.0); }
  if (v.d < e.keepDistance - 20) desertStep(game, e, dt, -v.x, -v.y, 0.7);
  else if (v.d > e.keepDistance + 20) desertStep(game, e, dt, v.x, v.y, 0.7);
  else desertStep(game, e, dt, -v.y * e.strafeDir, v.x * e.strafeDir, 0.55);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) {
    e.fireTimer = e.fireCooldown;
    const ang = desertAim(e, player);
    fireProjectileAngle(game, e, ang, e.boltSpeed || 210, e.dmg, { color: e.boltColor });
  }
};

ENEMY_BEHAVIOR_HANDLERS.ds62Dnbgnatswarm = function(game, e, dt){
  const player = game.player;
  if (e.driftAng === undefined) e.driftAng = RNG.random() * Math.PI * 2;
  e.driftAng += (RNG.random() - 0.5) * dt * 3.5;
  const ang = desertAim(e, player);
  const drift = e.driftAmount || 0.4;
  const finalAng = ang + Math.sin(e.driftAng) * drift;
  desertStep(game, e, dt, Math.cos(finalAng), Math.sin(finalAng), 1.05);
};

ENEMY_BEHAVIOR_HANDLERS.ds63Dnbfirefly = function(game, e, dt){
  const player = game.player;
  if (e.fireTimer === undefined) { e.fireTimer = Util.rand(0.8, 1.6); e.blinkTimer = Util.rand(0.6, 1.2); }
  const v = seekVector(e, player.x, player.y);
  if (v.d < 160) desertStep(game, e, dt, -v.x, -v.y, 0.5);
  e.blinkTimer -= dt;
  if (e.blinkTimer <= 0) {
    e.blinkTimer = Util.rand(0.8, 1.4);
    e.hitFlash = 0.2;
  }
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) {
    e.fireTimer = e.fireCooldown;
    const ang = desertAim(e, player);
    fireProjectileAngle(game, e, ang, e.boltSpeed || 170, e.dmg, {});
  }
};
