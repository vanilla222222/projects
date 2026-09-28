'use strict';

function desertStep(game, e, dt, dx, dy, mul){
  const node = game.currentRoom;
  const len = Math.hypot(dx, dy) || 1;
  return tryMoveEntity(e, node, node.obstacles, (dx / len) * e.speed * (mul || 1) * dt, (dy / len) * e.speed * (mul || 1) * dt);
}
function desertAim(e, player){
  return Math.atan2(player.y - e.y, player.x - e.x);
}
function desertRing(game, e, count, speed, opts, offset){
  for (let i = 0; i < count; i++) fireProjectileAngle(game, e, (offset || 0) + (i / count) * Math.PI * 2, speed, e.dmg, opts);
}
function desertArc(game, e, ang, count, spread, speed, opts){
  const start = ang - spread / 2;
  const step = count > 1 ? spread / (count - 1) : 0;
  for (let i = 0; i < count; i++) fireProjectileAngle(game, e, start + step * i, speed, e.dmg, opts);
}
function desertSpawn(game, node, id, x, y){
  const def = ENEMY_TYPES[id];
  if (!def) return null;
  const spot = findNearestFloor(node, Math.floor(x / TILE), Math.floor(y / TILE));
  const en = new Enemy(def, spot.x, spot.y, game.dungeon.floorNum);
  node.enemies.push(en);
  return en;
}

ENEMY_BEHAVIOR_HANDLERS.ds1Duneburrower = function(game, e, dt){
  const player = game.player;
  if (e.burrowed === undefined) { e.burrowed = false; e.burrowTimer = Util.rand(1.2, 2.2); }
  const dist = Util.dist(e.x, e.y, player.x, player.y);
  if (!e.burrowed) {
    e.burrowTimer -= dt;
    if (e.burrowTimer <= 0 || dist < 40) {
      e.burrowed = true;
      e.hitFlash = 0.15;
    } else {
      const ang = desertAim(e, player);
      desertStep(game, e, dt, Math.cos(ang), Math.sin(ang), 1);
    }
    return;
  }
  e.burrowTimer -= dt;
  if (e.burrowTimer <= -e.fuseTime) {
    const ang = desertAim(e, player);
    const nx = e.x + Math.cos(ang) * 50;
    const ny = e.y + Math.sin(ang) * 50;
    e.x = nx; e.y = ny;
    e.burrowed = false;
    e.burrowTimer = Util.rand(1.4, 2.4);
    game.explosions.push(new Explosion(e.x, e.y, e.blastRadius));
    if (Util.dist(e.x, e.y, player.x, player.y) < e.blastRadius) {
      damagePlayer(game, playerDamageAmount(game, false, e.dmg), 'duneburrower');
    }
  }
};

ENEMY_BEHAVIOR_HANDLERS.ds2Sandwraith = function(game, e, dt){
  const player = game.player;
  if (e.blinkTimer === undefined) e.blinkTimer = Util.rand(0.6, 1.2);
  e.blinkTimer -= dt;
  const dist = Util.dist(e.x, e.y, player.x, player.y);
  if (e.blinkTimer <= 0) {
    e.blinkTimer = e.blinkCooldown;
    const ang = RNG.random() * Math.PI * 2;
    const nx = player.x + Math.cos(ang) * (e.teleportRange * 0.4 + RNG.random() * e.teleportRange * 0.3);
    const ny = player.y + Math.sin(ang) * (e.teleportRange * 0.4 + RNG.random() * e.teleportRange * 0.3);
    const spot = findNearestFloor(game.currentRoom, Math.floor(nx / TILE), Math.floor(ny / TILE));
    e.x = spot.x; e.y = spot.y;
    e.hitFlash = 0.2;
    const aim = desertAim(e, player);
    fireProjectileAngle(game, e, aim, e.boltSpeed, e.dmg, { color: e.boltColor });
    return;
  }
  if (dist < 140) {
    const ang = desertAim(e, player) + Math.PI;
    desertStep(game, e, dt, Math.cos(ang), Math.sin(ang), 0.6);
  } else {
    aiWander(game, e, dt);
  }
};

ENEMY_BEHAVIOR_HANDLERS.ds3Scarabswarm = function(game, e, dt){
  const player = game.player;
  if (e.burstTimer === undefined) e.burstTimer = Util.rand(1.4, 2.2);
  const ang = desertAim(e, player);
  desertStep(game, e, dt, Math.cos(ang), Math.sin(ang), 1);
  e.burstTimer -= dt;
  if (e.burstTimer <= 0) {
    e.burstTimer = Util.rand(1.8, 2.6);
    desertRing(game, e, e.ringCount, e.boltSpeed, { color: e.boltColor }, RNG.random() * Math.PI * 2);
  }
};

ENEMY_BEHAVIOR_HANDLERS.ds4Cactusguard = function(game, e, dt){
  const player = game.player;
  if (e.sweepAng === undefined) { e.sweepAng = RNG.random() * Math.PI * 2; e.spineTimer = Util.rand(1.6, 2.4); }
  e.sweepAng += e.sweepRate * dt;
  e.spineTimer -= dt;
  if (e.spineTimer <= 0) {
    e.spineTimer = Util.rand(2.2, 3.0);
    desertRing(game, e, e.spineCount, 160, { color: e.boltColor }, e.sweepAng);
  }
};

ENEMY_BEHAVIOR_HANDLERS.ds5Mirageduplicate = function(game, e, dt){
  const player = game.player;
  if (e.decayLeft === undefined) { e.decayLeft = e.decayTime; e.fireTimer = Util.rand(0.8, 1.4); }
  e.decayLeft -= dt;
  if (e.decayLeft <= 0) {
    handleEnemyDeath(game, e);
    return;
  }
  const ang = desertAim(e, player);
  desertStep(game, e, dt, Math.cos(ang), Math.sin(ang), 1);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) {
    e.fireTimer = Util.rand(1.2, 1.8);
    fireProjectileAngle(game, e, ang, e.boltSpeed, e.dmg, { color: e.boltColor });
  }
};

ENEMY_BEHAVIOR_HANDLERS.ds6Sandviper = function(game, e, dt){
  const player = game.player;
  if (e.dashing === undefined) { e.dashing = false; e.dashCooldownTimer = Util.rand(0.6, 1.2); }
  if (e.dashing) {
    e.dashTimer -= dt;
    desertStep(game, e, dt, e.dashVX, e.dashVY, e.lungeSpeed);
    if (e.dashTimer <= 0) e.dashing = false;
    return;
  }
  e.dashCooldownTimer -= dt;
  const dist = Util.dist(e.x, e.y, player.x, player.y);
  if (e.dashCooldownTimer <= 0 && dist < 220) {
    const ang = desertAim(e, player);
    e.dashVX = Math.cos(ang);
    e.dashVY = Math.sin(ang);
    e.dashing = true;
    e.dashTimer = 0.35;
    e.dashCooldownTimer = e.dashCooldown;
    return;
  }
  const ang = desertAim(e, player);
  desertStep(game, e, dt, Math.cos(ang), Math.sin(ang), 0.7);
};

ENEMY_BEHAVIOR_HANDLERS.ds7Quicksandbloom = function(game, e, dt){
  if (e.patchTimer === undefined) e.patchTimer = Util.rand(0.5, 1.5);
  e.patchTimer -= dt;
  if (e.patchTimer <= 0) {
    e.patchTimer = e.patchCooldown;
    e.hitFlash = 0.15;
    game.creep.push(new Creep(e.x, e.y, e.patchRadius, e.patchLife, 'quicksand', 'enemy'));
  }
};

ENEMY_BEHAVIOR_HANDLERS.ds8Dunecrawler = function(game, e, dt){
  const player = game.player;
  if (e.charging === undefined) { e.charging = false; e.chargeTimer = Util.rand(1.0, 1.8); }
  if (e.charging) {
    desertStep(game, e, dt, e.chargeVX, e.chargeVY, e.chargeSpeed);
    e.chargeTime -= dt;
    if (e.chargeTime <= 0) { e.charging = false; e.chargeTimer = e.chargeCooldown; }
    return;
  }
  e.chargeTimer -= dt;
  const dist = Util.dist(e.x, e.y, player.x, player.y);
  if (e.chargeTimer <= 0 && dist < 260) {
    const ang = desertAim(e, player);
    e.chargeVX = Math.cos(ang);
    e.chargeVY = Math.sin(ang);
    e.charging = true;
    e.chargeTime = 0.9;
    return;
  }
  const ang = desertAim(e, player);
  desertStep(game, e, dt, Math.cos(ang), Math.sin(ang), 0.5);
};

ENEMY_BEHAVIOR_HANDLERS.ds9Sirocco = function(game, e, dt){
  const player = game.player;
  if (e.devilTimer === undefined) e.devilTimer = Util.rand(1.0, 2.0);
  aiWander(game, e, dt);
  e.devilTimer -= dt;
  if (e.devilTimer <= 0) {
    e.devilTimer = e.devilCooldown;
    e.hitFlash = 0.2;
    const ang = RNG.random() * Math.PI * 2;
    const spawnX = e.x + Math.cos(ang) * 60;
    const spawnY = e.y + Math.sin(ang) * 60;
    const spot = findNearestFloor(game.currentRoom, Math.floor(spawnX / TILE), Math.floor(spawnY / TILE));
    game.dustDevils.push(new DustDevil(spot.x, spot.y, e.devilRadius, e.devilLife, 'enemy'));
  }
};
