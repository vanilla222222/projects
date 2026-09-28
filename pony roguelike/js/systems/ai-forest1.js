'use strict';

const FOREST_ID_AI = {};

function forestWrapById(fn){
  return function(game, e, dt){
    const o = FOREST_ID_AI[(e.type && e.type.id) || ''];
    if (o) { o(game, e, dt); return; }
    fn(game, e, dt);
  };
}

function forestStep(game, e, dt, dx, dy, mul){
  const node = game.currentRoom;
  const len = Math.hypot(dx, dy) || 1;
  return tryMoveEntity(e, node, node.obstacles, (dx / len) * e.speed * (mul || 1) * dt, (dy / len) * e.speed * (mul || 1) * dt);
}

function forestRing(game, e, count, speed, opts, offset){
  for (let i = 0; i < count; i++) fireProjectileAngle(game, e, (offset || 0) + (i / count) * Math.PI * 2, speed, e.dmg, opts);
}

function forestArc(game, e, ang, count, spread, speed, opts){
  const start = ang - spread / 2;
  const step = count > 1 ? spread / (count - 1) : 0;
  for (let i = 0; i < count; i++) fireProjectileAngle(game, e, start + step * i, speed, e.dmg, opts);
}

function forestAim(e, player){
  return Math.atan2(player.y - e.y, player.x - e.x);
}

function forestSpawn(game, node, id, x, y){
  const def = ENEMY_TYPES[id];
  if (!def) return null;
  const spot = findNearestFloor(node, Math.floor(x / TILE), Math.floor(y / TILE));
  const en = new Enemy(def, spot.x, spot.y, game.dungeon.floorNum);
  node.enemies.push(en);
  return en;
}

ENEMY_BEHAVIOR_HANDLERS.fr1Sporepopper = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.fr1Hop === undefined) { e.fr1Hop = 0; e.fr1Rest = 0; }
  if (e.arming) {
    e.fuseTimer -= dt;
    e.hitFlash = (Math.sin(e.fuseTimer * 24) > 0) ? 0.12 : 0;
    if (e.fuseTimer <= 0) {
      e.isDead = true;
      const R = t.blastRadius || 72;
      game.explosions.push(new Explosion(e.x, e.y, R));
      forestRing(game, e, 8, (t.boltSpeed || 120) * 0.8, { color: t.boltColor || '#9fbf72', radius: 5 }, RNG.random());
      if (Util.dist(e.x, e.y, player.x, player.y) < R + player.radius) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
      handleEnemyDeath(game, e);
    }
    return;
  }
  if (e.fr1Rest > 0) { e.fr1Rest -= dt; return; }
  e.fr1Hop -= dt;
  const v = seekVector(e, player.x, player.y);
  forestStep(game, e, dt, v.x, v.y, 1.5);
  if (e.fr1Hop <= 0) { e.fr1Hop = Util.rand(0.35, 0.6); e.fr1Rest = Util.rand(0.12, 0.28); }
  if (v.d < 40) { e.arming = true; e.fuseTimer = t.fuseTime || 1.1; }
};

ENEMY_BEHAVIOR_HANDLERS.fr1Firefly = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.fr1Glow === undefined) { e.fr1Glow = Util.rand(0, 6); e.fr1Burst = 0; e.fr1Shots = 0; }
  e.fr1Glow += dt;
  if (e.fr1Burst > 0) {
    e.fr1Burst -= dt;
    e.hitFlash = 0.14;
    if (e.fr1Burst <= 0 && e.fr1Shots > 0) {
      fireProjectileAngle(game, e, forestAim(e, player), t.boltSpeed || 175, e.dmg, { color: t.boltColor || '#f0e08a', radius: t.boltRadius || 4 });
      e.fr1Shots--;
      e.fr1Burst = e.fr1Shots > 0 ? 0.13 : 0;
      if (e.fr1Shots <= 0) e.fireTimer = t.fireCooldown || 2;
    }
    return;
  }
  const v = seekVector(e, player.x, player.y);
  const px = -v.y, py = v.x;
  const w = Math.sin(e.fr1Glow * 3.4) * 0.9;
  const drift = v.d > 190 ? 1 : (v.d < 110 ? -0.6 : 0.15);
  forestStep(game, e, dt, v.x * drift + px * w, v.y * drift + py * w, 1);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && v.d < (t.fireRange || 380)) { e.fr1Shots = 3; e.fr1Burst = 0.25; }
};

ENEMY_BEHAVIOR_HANDLERS.fr1Thornhide = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.fr1Curl === undefined) { e.fr1Curl = 0; e.fr1Timer = Util.rand(2, 3.4); }
  if (e.fr1Curl > 0) {
    e.fr1Curl -= dt;
    e.shielded = true;
    if (e.fr1Curl <= 0) {
      e.shielded = false;
      forestRing(game, e, 4, (t.boltSpeed || 190), { color: t.boltColor || '#7d6a4a', radius: 5 }, Math.PI / 4);
      e.fr1Timer = Util.rand(2.4, 3.8);
    }
    return;
  }
  e.fr1Timer -= dt;
  chaseSeek(game, e, player.x, player.y, 1, dt);
  if (e.fr1Timer <= 0 && Util.dist(e.x, e.y, player.x, player.y) < 200) e.fr1Curl = 0.9;
};

FOREST_ID_AI.sapling = function(game, e, dt){
  const player = game.player;
  if (e.fr1Root === undefined) { e.fr1Root = Util.rand(0.6, 1.4); e.fr1Run = 0; }
  if (e.fr1Root > 0) {
    e.fr1Root -= dt;
    e.hitFlash = e.fr1Root < 0.25 ? 0.1 : 0;
    if (e.fr1Root <= 0) e.fr1Run = Util.rand(0.7, 1.2);
    return;
  }
  e.fr1Run -= dt;
  const v = seekVector(e, player.x, player.y);
  forestStep(game, e, dt, v.x, v.y, 1.7);
  if (e.fr1Run <= 0) e.fr1Root = Util.rand(0.8, 1.5);
};

ENEMY_BEHAVIOR_HANDLERS.fr1Frogtongue = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.fr1Side === undefined) { e.fr1Side = RNG.random() < 0.5 ? 1 : -1; e.fr1Phase = 0; }
  if (e.dashing) {
    const r = forestStep(game, e, dt, e.dashVX, e.dashVY, e.fr1Phase === 1 ? 1 : 1);
    e.dashTimer -= dt;
    if ((!r.movedX && !r.movedY) || e.dashTimer <= 0) {
      e.dashing = false;
      if (e.fr1Phase === 1) { e.fr1Phase = 2; e.telegraph = 0.18; }
      else { e.fr1Phase = 0; e.attackTimer = t.leapCooldown || 1.6; e.fr1Side = -e.fr1Side; }
    }
    return;
  }
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 34) > 0) ? 0.12 : 0;
    if (e.telegraph <= 0) {
      const v = seekVector(e, player.x, player.y);
      const ls = t.leapSpeed || 4.8;
      e.dashing = true;
      e.dashTimer = 0.3;
      if (e.fr1Phase === 1) { e.dashVX = -v.y * e.fr1Side; e.dashVY = v.x * e.fr1Side; }
      else { e.dashVX = v.x; e.dashVY = v.y; }
      e.dashVX *= e.speed * ls * 0.01;
      e.dashVY *= e.speed * ls * 0.01;
      const n = Math.hypot(e.dashVX, e.dashVY) || 1;
      e.dashVX /= n; e.dashVY /= n;
    }
    return;
  }
  e.attackTimer -= dt;
  chaseSeek(game, e, player.x, player.y, 0.3, dt);
  if (e.attackTimer <= 0) { e.fr1Phase = 1; e.telegraph = t.telegraphTime || 0.35; }
};

ENEMY_BEHAVIOR_HANDLERS.fr1Vineslinger = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.fr1Sweep === undefined) { e.fr1Sweep = 0; e.fr1Left = 0; e.fr1Base = 0; e.fr1Dir = 1; }
  const keep = t.keepDistance || 190;
  const v = seekVector(e, player.x, player.y);
  if (e.fr1Left > 0) {
    e.fr1Sweep -= dt;
    if (e.fr1Sweep <= 0) {
      fireProjectileAngle(game, e, e.fr1Base + e.fr1Dir * (3 - e.fr1Left) * 0.22, t.boltSpeed || 205, e.dmg, { color: t.boltColor || '#6fa356', radius: t.boltRadius || 5 });
      e.fr1Left--;
      e.fr1Sweep = 0.11;
      if (e.fr1Left <= 0) { e.fireTimer = t.fireCooldown || 1.6; e.fr1Dir = -e.fr1Dir; }
    }
    return;
  }
  if (v.d < keep - 30) forestStep(game, e, dt, -v.x, -v.y, 1);
  else if (v.d > keep + 30) forestStep(game, e, dt, v.x, v.y, 0.8);
  else forestStep(game, e, dt, -v.y, v.x, 0.5);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && v.d < (t.fireRange || 420) && hasLineOfSight(node, e, player.x, player.y)) {
    e.fr1Base = forestAim(e, player) - e.fr1Dir * 0.33;
    e.fr1Left = 3;
    e.fr1Sweep = 0;
  }
};

ENEMY_BEHAVIOR_HANDLERS.fr1Thornbeast = function(game, e, dt){
  const player = game.player;
  if (e.fr1VX === undefined) { e.fr1VX = 0; e.fr1VY = 0; }
  const v = seekVector(e, player.x, player.y);
  e.fr1VX += (v.x - e.fr1VX) * Math.min(1, dt * 1.1);
  e.fr1VY += (v.y - e.fr1VY) * Math.min(1, dt * 1.1);
  const r = forestStep(game, e, dt, e.fr1VX, e.fr1VY, 1.35);
  if (!r.movedX) e.fr1VX = -e.fr1VX * 0.5;
  if (!r.movedY) e.fr1VY = -e.fr1VY * 0.5;
};

ENEMY_BEHAVIOR_HANDLERS.fr1Mosshide = function(game, e, dt){
  const player = game.player;
  if (e.fr1Armor === undefined) { e.fr1Armor = 0; e.fr1Timer = 2.2; }
  e.fr1Timer -= dt;
  if (e.fr1Timer <= 0) {
    e.fr1Armor = e.fr1Armor > 0 ? 0 : 1;
    e.shielded = e.fr1Armor > 0;
    e.fr1Timer = e.fr1Armor > 0 ? 1.6 : 2.6;
  }
  const v = seekVector(e, player.x, player.y);
  forestStep(game, e, dt, v.x, v.y, e.fr1Armor > 0 ? 0.55 : 1.15);
};

ENEMY_BEHAVIOR_HANDLERS.fr1Willowisp = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.fr1T === undefined) { e.fr1T = Util.rand(0, 6); e.fr1Fade = 0; e.fr1Timer = Util.rand(3, 5); }
  e.fr1T += dt;
  if (e.fr1Fade > 0) {
    e.fr1Fade -= dt;
    e.submerged = true;
    e.shielded = true;
    if (e.fr1Fade <= 0) {
      e.submerged = false; e.shielded = false;
      const ang = RNG.random() * Math.PI * 2;
      const spot = findNearestFloor(node, Math.floor((player.x + Math.cos(ang) * 130) / TILE), Math.floor((player.y + Math.sin(ang) * 130) / TILE));
      e.x = spot.x * TILE + TILE / 2; e.y = spot.y * TILE + TILE / 2;
      e.navPath = null; e.pathTimer = 0;
      e.hitFlash = 0.12;
      e.fr1Timer = Util.rand(3.5, 5.5);
    }
    return;
  }
  e.fr1Timer -= dt;
  const v = seekVector(e, player.x, player.y);
  forestStep(game, e, dt, v.x + Math.cos(e.fr1T * 1.7) * 0.8, v.y + Math.sin(e.fr1T * 3.4) * 0.8, 1);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && v.d < (t.fireRange || 380)) {
    e.fireTimer = t.fireCooldown || 1.6;
    fireProjectileAngle(game, e, forestAim(e, player), t.boltSpeed || 180, e.dmg, { color: t.boltColor || '#a8e0d0', radius: t.boltRadius || 5 });
  }
  if (e.fr1Timer <= 0) e.fr1Fade = 0.7;
};

ENEMY_BEHAVIOR_HANDLERS.fr1Stingswarm = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.fr1Zig === undefined) { e.fr1Zig = 0; e.fr1Side = 1; }
  if (e.arming) {
    e.fuseTimer -= dt;
    e.hitFlash = (Math.sin(e.fuseTimer * 26) > 0) ? 0.12 : 0;
    if (e.fuseTimer <= 0) {
      e.isDead = true;
      forestRing(game, e, 6, (t.boltSpeed || 260), { color: t.boltColor || '#e0b45a', radius: 4 }, RNG.random());
      Sound.play('hit');
      handleEnemyDeath(game, e);
    }
    return;
  }
  e.fr1Zig -= dt;
  if (e.fr1Zig <= 0) { e.fr1Side = -e.fr1Side; e.fr1Zig = Util.rand(0.2, 0.4); }
  const v = seekVector(e, player.x, player.y);
  forestStep(game, e, dt, v.x + (-v.y) * 0.85 * e.fr1Side, v.y + v.x * 0.85 * e.fr1Side, 1.3);
  if (v.d < 38) { e.arming = true; e.fuseTimer = t.fuseTime || 0.9; }
};

FOREST_ID_AI.brambleknight = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.fr1Spin === undefined) { e.fr1Spin = 0; }
  const v = seekVector(e, player.x, player.y);
  if (e.fr1Spin > 0) {
    e.fr1Spin -= dt;
    forestStep(game, e, dt, v.x, v.y, 1.6);
    e.fr1SpinAng = (e.fr1SpinAng || 0) + dt * 9;
    e.fr1SpinTick = (e.fr1SpinTick || 0) - dt;
    if (e.fr1SpinTick <= 0) {
      e.fr1SpinTick = 0.16;
      forestArc(game, e, e.fr1SpinAng, 2, Math.PI, t.boltSpeed || 190, { color: t.boltColor || '#8a6f9c', radius: 5 });
    }
    return;
  }
  if (e.shielded) {
    forestStep(game, e, dt, v.x, v.y, 0.6);
  } else {
    if (v.d < 240) e.fr1Spin = 0.7;
    else forestStep(game, e, dt, v.x, v.y, 1.1);
  }
};

ENEMY_BEHAVIOR_HANDLERS.fr1Boarrusher = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.fr1Charges === undefined) { e.fr1Charges = 0; }
  if (e.dashing) {
    const r = forestStep(game, e, dt, e.dashVX, e.dashVY, t.chargeSpeed || 6.4);
    e.dashTimer -= dt;
    if (!r.movedX) e.dashVX = -e.dashVX;
    if (!r.movedY) e.dashVY = -e.dashVY;
    if (e.dashTimer <= 0) {
      e.dashing = false;
      if (e.fr1Charges > 0) { e.fr1Charges--; e.telegraph = 0.14; }
      else e.attackTimer = t.chargeCooldown || 2.4;
    }
    return;
  }
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 30) > 0) ? 0.12 : 0;
    if (e.telegraph <= 0) {
      const v = seekVector(e, player.x, player.y);
      e.dashing = true; e.dashTimer = 0.32;
      e.dashVX = v.x; e.dashVY = v.y;
    }
    return;
  }
  e.attackTimer -= dt;
  chaseSeek(game, e, player.x, player.y, 0.65, dt);
  if (e.attackTimer <= 0 && Util.dist(e.x, e.y, player.x, player.y) < 300) {
    e.fr1Charges = 1;
    e.telegraph = t.telegraphTime || 0.5;
  }
};

FOREST_ID_AI.owlsentinel = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.fr1Gaze === undefined) { e.fr1Gaze = RNG.random() * Math.PI * 2; e.fr1Dir = RNG.random() < 0.5 ? 1 : -1; e.fr1Left = 0; e.fr1Gap = 0; }
  if (e.fr1Left > 0) {
    e.fr1Gap -= dt;
    if (e.fr1Gap <= 0) {
      fireProjectileAngle(game, e, e.fr1Gaze, t.boltSpeed || 240, e.dmg, { color: t.boltColor || '#d8c89a', radius: t.boltRadius || 5 });
      e.fr1Left--;
      e.fr1Gap = 0.15;
      if (e.fr1Left <= 0) e.fireTimer = t.fireCooldown || 1.8;
    }
    return;
  }
  const aim = forestAim(e, player);
  let diff = aim - e.fr1Gaze;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const d = Util.dist(e.x, e.y, player.x, player.y);
  e.fireTimer -= dt;
  if (Math.abs(diff) < 0.35 && e.fireTimer <= 0 && d < (t.fireRange || 420) && hasLineOfSight(node, e, player.x, player.y)) {
    e.fr1Gaze = aim;
    e.fr1Left = 2;
    e.fr1Gap = 0;
    return;
  }
  if (Math.abs(diff) < 1.1) e.fr1Gaze += Util.clamp(diff, -1.8 * dt, 1.8 * dt);
  else e.fr1Gaze += e.fr1Dir * 1.15 * dt;
  e.facingAngle = e.fr1Gaze;
};

ENEMY_BEHAVIOR_HANDLERS.fr1Direfox = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.fr1Stage === undefined) { e.fr1Stage = 0; }
  if (e.dashing) {
    forestStep(game, e, dt, e.dashVX, e.dashVY, t.leapSpeed || 5.2);
    e.dashTimer -= dt;
    if (e.dashTimer <= 0) {
      e.dashing = false;
      if (e.fr1Stage === 1) {
        const v = seekVector(e, player.x, player.y);
        e.fr1Stage = 2;
        e.dashing = true; e.dashTimer = 0.22;
        e.dashVX = -v.x; e.dashVY = -v.y;
      } else {
        e.fr1Stage = 0;
        e.attackTimer = t.leapCooldown || 1.5;
      }
    }
    return;
  }
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    if (e.telegraph <= 0) {
      const v = seekVector(e, player.x, player.y);
      e.fr1Stage = 1;
      e.dashing = true; e.dashTimer = 0.26;
      e.dashVX = v.x; e.dashVY = v.y;
    }
    return;
  }
  e.attackTimer -= dt;
  const v = seekVector(e, player.x, player.y);
  if (v.d > 210) forestStep(game, e, dt, v.x, v.y, 0.9);
  else forestStep(game, e, dt, -v.y, v.x, 0.7);
  if (e.attackTimer <= 0 && v.d < 240) e.telegraph = t.telegraphTime || 0.3;
};

ENEMY_BEHAVIOR_HANDLERS.fr1Fernstalker = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.fr1Strafe === undefined) { e.fr1Strafe = 1; e.fr1Timer = Util.rand(1, 2); }
  e.fr1Timer -= dt;
  if (e.fr1Timer <= 0) { e.fr1Strafe = -e.fr1Strafe; e.fr1Timer = Util.rand(1.1, 2.2); }
  const v = seekVector(e, player.x, player.y);
  const los = hasLineOfSight(node, e, player.x, player.y);
  const keep = t.keepDistance || 200;
  if (!los) forestStep(game, e, dt, v.x, v.y, 1.1);
  else if (v.d < keep - 40) forestStep(game, e, dt, -v.x + (-v.y) * e.fr1Strafe, -v.y + v.x * e.fr1Strafe, 1);
  else forestStep(game, e, dt, -v.y * e.fr1Strafe, v.x * e.fr1Strafe, 0.9);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && los && v.d < (t.fireRange || 420)) {
    e.fireTimer = t.fireCooldown || 1.5;
    forestArc(game, e, forestAim(e, player), 2, 0.16, t.boltSpeed || 215, { color: t.boltColor || '#88b06a', radius: t.boltRadius || 4 });
  }
};

ENEMY_BEHAVIOR_HANDLERS.fr1Creepervine = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.fr1Anchor === undefined) { e.fr1Anchor = 0; e.fr1Wave = 0; }
  e.fr1Anchor -= dt;
  const v = seekVector(e, player.x, player.y);
  if (e.fr1Anchor <= 0) {
    if (v.d > (t.keepDistance || 150) + 60 || v.d < 70) forestStep(game, e, dt, v.d < 70 ? -v.x : v.x, v.d < 70 ? -v.y : v.y, 1);
    else e.fr1Anchor = Util.rand(2.5, 4.5);
  }
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && v.d < (t.fireRange || 400)) {
    e.fireTimer = t.fireCooldown || 1.7;
    e.fr1Wave = (e.fr1Wave || 0) + 1;
    const a = forestAim(e, player);
    const sp = t.boltSpeed || 140;
    forestArc(game, e, a, 2, 0.12 + 0.14 * (e.fr1Wave % 3), sp, { color: t.boltColor || '#5f8f4f', radius: t.boltRadius || 6 });
  }
};

ENEMY_BEHAVIOR_HANDLERS.fr1Thicketweaver = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.fr1Phase === undefined) { e.fr1Phase = Util.rand(0, 6); }
  e.fr1Phase += dt * (t.weaveFrequency || 3.2);
  const v = seekVector(e, player.x, player.y);
  const amp = t.weaveAmplitude || 0.65;
  const s = Math.sin(e.fr1Phase) * amp;
  forestStep(game, e, dt, v.x + (-v.y) * s, v.y + v.x * s, 1);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && v.d < 380) {
    e.fireTimer = t.fireCooldown || 1.4;
    fireProjectileAngle(game, e, forestAim(e, player) + Math.PI, t.boltSpeed || 150, e.dmg, { color: t.boltColor || '#7fa05f', radius: t.boltRadius || 5 });
  }
};

ENEMY_BEHAVIOR_HANDLERS.fr1Barkwatcher = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.fr1Wake === undefined) { e.fr1Wake = 0; e.fr1Left = 0; e.fr1Gap = 0; }
  const d = Util.dist(e.x, e.y, player.x, player.y);
  if (e.fr1Left > 0) {
    e.fr1Gap -= dt;
    if (e.fr1Gap <= 0) {
      fireProjectileAngle(game, e, forestAim(e, player), t.boltSpeed || 230, e.dmg, { color: t.boltColor || '#b0906a', radius: t.boltRadius || 5 });
      e.fr1Left--;
      e.fr1Gap = 0.12;
      if (e.fr1Left <= 0) { e.fr1Wake = 0; e.shielded = true; e.fireTimer = t.fireCooldown || 2.2; }
    }
    return;
  }
  if (!e.fr1Wake) {
    e.shielded = true;
    if (d < (t.sentryThreshold || 30) * 10 && hasLineOfSight(node, e, player.x, player.y)) { e.fr1Wake = 1; e.shielded = false; e.hitFlash = 0.14; }
    return;
  }
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && d < (t.fireRange || 420)) { e.fr1Left = 3; e.fr1Gap = 0; }
  if (d > (t.fireRange || 420) * 1.2) { e.fr1Wake = 0; e.shielded = true; }
};

ENEMY_BEHAVIOR_HANDLERS.fr1Glowmoth = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.fr1R === undefined) { e.fr1R = t.orbitRadius || 125; e.fr1Dir = RNG.random() < 0.5 ? 1 : -1; e.fr1Timer = 3; }
  e.fr1Timer -= dt;
  e.fr1R -= dt * 26;
  if (e.fr1R < 46) {
    forestRing(game, e, 7, t.boltSpeed || 190, { color: t.boltColor || '#e8d89a', radius: 4 }, RNG.random());
    e.fr1R = t.orbitRadius || 125;
    e.fr1Dir = -e.fr1Dir;
    e.hitFlash = 0.14;
  }
  const bearing = Math.atan2(e.y - player.y, e.x - player.x) + e.fr1Dir * 1.5 * dt;
  const tx = player.x + Math.cos(bearing) * e.fr1R, ty = player.y + Math.sin(bearing) * e.fr1R;
  const v = seekVector(e, tx, ty);
  if (v.d > 5) forestStep(game, e, dt, v.x, v.y, 1.2);
};

ENEMY_BEHAVIOR_HANDLERS.fr1Rootburrower = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.fr1State === undefined) { e.fr1State = 0; e.fr1Timer = t.burrowCooldown || 3; }
  e.fr1Timer -= dt;
  if (e.fr1State === 1) {
    e.submerged = true; e.shielded = true;
    const v = seekVector(e, player.x, player.y);
    forestStep(game, e, dt, v.x, v.y, 1.8);
    if (e.fr1Timer <= 0 || v.d < 26) {
      e.fr1State = 2;
      e.fr1Timer = 0.35;
    }
    return;
  }
  if (e.fr1State === 2) {
    e.hitFlash = 0.12;
    if (e.fr1Timer <= 0) {
      e.submerged = false; e.shielded = false;
      game.explosions.push(new Explosion(e.x, e.y, 46));
      forestRing(game, e, 6, t.boltSpeed || 160, { color: t.boltColor || '#8a6a45', radius: 5 }, RNG.random());
      e.fr1State = 0;
      e.fr1Timer = t.burrowCooldown || 3;
    }
    return;
  }
  chaseSeek(game, e, player.x, player.y, 0.85, dt);
  if (e.fr1Timer <= 0) {
    e.fr1State = 1;
    e.fr1Timer = t.burrowTime || 1.5;
    e.navPath = null; e.pathTimer = 0;
  }
};

ENEMY_BEHAVIOR_HANDLERS.fr1Sporeseeder = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.fr1Seed === undefined) { e.fr1Seed = 0; }
  const v = seekVector(e, player.x, player.y);
  if (v.d < 210) forestStep(game, e, dt, -v.x, -v.y, 1);
  else forestStep(game, e, dt, -v.y, v.x, 0.6);
  if (e.fr1Seed > 0) {
    e.fr1Seed -= dt;
    e.hitFlash = (Math.sin(e.fr1Seed * 22) > 0) ? 0.12 : 0;
    if (e.fr1Seed <= 0 && e.minionsSpawned < (t.maxSummons || 6)) {
      const ang = forestAim(e, player) + Util.rand(-0.5, 0.5);
      const rad = Math.min(v.d * 0.6, 170);
      if (forestSpawn(game, node, t.summonId || 'sprout', e.x + Math.cos(ang) * rad, e.y + Math.sin(ang) * rad)) e.minionsSpawned++;
      game.explosions.push(new Explosion(e.x + Math.cos(ang) * rad, e.y + Math.sin(ang) * rad, 22));
      e.summonTimer = t.summonCooldown || 6;
    }
    return;
  }
  e.summonTimer -= dt;
  if (e.summonTimer <= 0 && e.minionsSpawned < (t.maxSummons || 6)) e.fr1Seed = 0.6;
};

ENEMY_BEHAVIOR_HANDLERS.fr1Hive = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.fr1Left === undefined) { e.fr1Left = 0; e.fr1Gap = 0; }
  const v = seekVector(e, player.x, player.y);
  if (e.fr1Left > 0) {
    e.shielded = true;
    e.fr1Gap -= dt;
    if (e.fr1Gap <= 0) {
      const ang = RNG.random() * Math.PI * 2;
      if (e.minionsSpawned < (t.maxSummons || 6) && forestSpawn(game, node, t.summonId || 'bumblebee', e.x + Math.cos(ang) * 44, e.y + Math.sin(ang) * 44)) e.minionsSpawned++;
      e.fr1Left--;
      e.fr1Gap = 0.3;
      if (e.fr1Left <= 0) { e.shielded = false; e.summonTimer = t.summonCooldown || 6; }
    }
    return;
  }
  if (v.d < 140) forestStep(game, e, dt, -v.x, -v.y, 0.7);
  e.summonTimer -= dt;
  if (e.summonTimer <= 0 && e.minionsSpawned < (t.maxSummons || 6)) { e.fr1Left = 2; e.fr1Gap = 0.2; }
};

ENEMY_BEHAVIOR_HANDLERS.fr1Waspine = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.fr1Rush === undefined) { e.fr1Rush = 0; }
  const v = seekVector(e, player.x, player.y);
  if (e.fr1Rush > 0) {
    e.fr1Rush -= dt;
    forestStep(game, e, dt, v.x, v.y, 1.6);
    return;
  }
  forestStep(game, e, dt, v.x, v.y, 0.75);
  e.summonTimer -= dt;
  if (e.summonTimer <= 0) {
    e.summonTimer = t.summonCooldown || 6;
    e.fr1Rush = 1.1;
    const n = Math.min(t.summonCount || 2, (t.maxSummons || 6) - e.minionsSpawned);
    for (let i = 0; i < n; i++) {
      const ang = forestAim(e, player) + (i - (n - 1) / 2) * 0.6;
      if (forestSpawn(game, node, t.summonId || 'forestwasp', e.x + Math.cos(ang) * 50, e.y + Math.sin(ang) * 50)) e.minionsSpawned++;
    }
  }
};

ENEMY_BEHAVIOR_HANDLERS.fr1Mossmender = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  let target = null, worst = 1;
  for (const o of node.enemies) {
    if (o === e || o.isDead || o.isBoss || o.hp >= o.maxHp) continue;
    const f = o.hp / Math.max(1, o.maxHp);
    if (f < worst) { worst = f; target = o; }
  }
  if (target) {
    const v = seekVector(e, target.x, target.y);
    if (v.d > 70) forestStep(game, e, dt, v.x, v.y, 1.1);
  } else {
    const pv = seekVector(e, player.x, player.y);
    if (pv.d < 220) forestStep(game, e, dt, -pv.x, -pv.y, 1);
    else aiWander(game, e, dt);
  }
  e.healTimer -= dt;
  if (e.healTimer > 0) return;
  const R = t.healRadius || 150, amt = t.healAmount || 2;
  let healed = false;
  for (const o of node.enemies) {
    if (o === e || o.isDead || o.isBoss || o.hp >= o.maxHp) continue;
    if (Util.dist(e.x, e.y, o.x, o.y) > R) continue;
    o.hp = Math.min(o.maxHp, o.hp + amt);
    game.floatTexts.push(new FloatText(o.x, o.y - o.radius - 6, '+' + amt, Theme.floatText.heal));
    healed = true;
  }
  if (healed) { e.healTimer = t.healCooldown || 3; e.hitFlash = 0.1; }
  else e.healTimer = 0.4;
};

ENEMY_BEHAVIOR_HANDLERS.fr1Treelinesniper = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.fr1Reposition === undefined) { e.fr1Reposition = 0; e.fr1RX = e.x; e.fr1RY = e.y; }
  const range = t.fireRange || 540;
  const d = Util.dist(e.x, e.y, player.x, player.y);
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.fr1AimX = player.x; e.fr1AimY = player.y;
    e.hitFlash = (Math.sin(e.telegraph * 36) > 0) ? 0.14 : 0;
    if (e.telegraph <= 0) {
      fireProjectileAngle(game, e, Math.atan2(e.fr1AimY - e.y, e.fr1AimX - e.x), t.boltSpeed || 460, e.dmg, { color: t.boltColor || '#cfe09a', radius: t.boltRadius || 4 });
      e.fireTimer = t.fireCooldown || 2.6;
      e.fr1Reposition = 1.2;
      const ang = RNG.random() * Math.PI * 2;
      const spot = findNearestFloor(node, Math.floor((e.x + Math.cos(ang) * 120) / TILE), Math.floor((e.y + Math.sin(ang) * 120) / TILE));
      e.fr1RX = spot.x * TILE + TILE / 2; e.fr1RY = spot.y * TILE + TILE / 2;
    }
    return;
  }
  if (e.fr1Reposition > 0) {
    e.fr1Reposition -= dt;
    const v = seekVector(e, e.fr1RX, e.fr1RY);
    if (v.d > 14) forestStep(game, e, dt, v.x, v.y, 1.3);
    else e.fr1Reposition = 0;
    return;
  }
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && d < range && hasLineOfSight(node, e, player.x, player.y)) e.telegraph = t.telegraphTime || 1.3;
  else if (d > range) chaseSeek(game, e, player.x, player.y, 0.9, dt);
};

ENEMY_BEHAVIOR_HANDLERS.fr1Gnatcloud = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.fr1Mode === undefined) { e.fr1Mode = 0; e.fr1Timer = Util.rand(1.2, 2.2); }
  e.fr1Timer -= dt;
  const v = seekVector(e, player.x, player.y);
  if (e.fr1Mode === 1) {
    forestStep(game, e, dt, e.fr1DX, e.fr1DY, 2.1);
    if (e.fr1Timer <= 0) { e.fr1Mode = 0; e.fr1Timer = Util.rand(1.4, 2.4); }
    return;
  }
  const w = Util.clamp(t.driftAmount || 0.6, 0, 0.9);
  e.pathTimer -= dt;
  if (e.pathTimer <= 0 || !e.pathDir) { e.pathDir = { x: Util.rand(-1, 1), y: Util.rand(-1, 1) }; e.pathTimer = Util.rand(0.18, 0.4); }
  forestStep(game, e, dt, v.x * (1 - w) + e.pathDir.x * w, v.y * (1 - w) + e.pathDir.y * w, 1);
  if (e.fr1Timer <= 0) { e.fr1Mode = 1; e.fr1Timer = 0.55; e.fr1DX = v.x; e.fr1DY = v.y; e.hitFlash = 0.1; }
};

ENEMY_BEHAVIOR_HANDLERS.fr1Bramblelurker = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.fr1Left === undefined) { e.fr1Left = 0; }
  if (e.dashing) {
    const r = forestStep(game, e, dt, e.dashVX, e.dashVY, t.chargeSpeed || 6);
    e.dashTimer -= dt;
    if ((!r.movedX && !r.movedY) || e.dashTimer <= 0) {
      e.dashing = false;
      if (e.fr1Left > 0) { e.fr1Left--; e.telegraph = 0.12; }
      else e.attackTimer = t.chargeCooldown || 2.2;
    }
    return;
  }
  if (!e.triggered) {
    e.shielded = true;
    if (Util.dist(e.x, e.y, player.x, player.y) < (t.triggerRange || 110)) {
      e.triggered = true;
      e.shielded = false;
      e.fr1Left = 2;
      e.telegraph = t.telegraphTime || 0.3;
    }
    return;
  }
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 34) > 0) ? 0.12 : 0;
    if (e.telegraph <= 0) {
      const v = seekVector(e, player.x, player.y);
      e.dashing = true; e.dashTimer = 0.24;
      e.dashVX = v.x; e.dashVY = v.y;
    }
    return;
  }
  e.attackTimer -= dt;
  chaseSeek(game, e, player.x, player.y, 0.5, dt);
  if (e.attackTimer <= 0) { e.fr1Left = 2; e.telegraph = t.telegraphTime || 0.3; }
};

ENEMY_BEHAVIOR_HANDLERS.fr1Wispblinker = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.fr1Corner === undefined) { e.fr1Corner = RNG.random() * Math.PI * 2; e.fr1Step = 0; }
  e.blinkTimer -= dt;
  if (e.blinkTimer <= 0) {
    e.blinkTimer = t.blinkCooldown || 2.4;
    e.fr1Step = (e.fr1Step + 1) % 3;
    const ang = e.fr1Corner + e.fr1Step * (Math.PI * 2 / 3);
    const rad = Math.max(80, (t.blinkRange || 200) * 0.7);
    const spot = findNearestFloor(node, Math.floor((player.x + Math.cos(ang) * rad) / TILE), Math.floor((player.y + Math.sin(ang) * rad) / TILE));
    e.x = spot.x * TILE + TILE / 2; e.y = spot.y * TILE + TILE / 2;
    e.hitFlash = 0.12;
    forestArc(game, e, forestAim(e, player), 3, 0.3, t.boltSpeed || 200, { color: t.boltColor || '#b0a0e8', radius: t.boltRadius || 5 });
    if (e.fr1Step === 0) e.fr1Corner = RNG.random() * Math.PI * 2;
  }
};

ENEMY_BEHAVIOR_HANDLERS.fr1Rootroller = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.fr1DX === undefined) {
    const v = seekVector(e, player.x, player.y);
    e.fr1DX = v.x; e.fr1DY = v.y; e.fr1Speed = 1; e.fr1Timer = Util.rand(2, 3.5);
  }
  e.fr1Timer -= dt;
  e.fr1Speed = Math.min(t.chargeSpeed || 6, e.fr1Speed + dt * 0.9);
  const r = forestStep(game, e, dt, e.fr1DX, e.fr1DY, e.fr1Speed);
  if (!r.movedX) { e.fr1DX = -e.fr1DX; e.fr1Speed = Math.max(1, e.fr1Speed * 0.6); }
  if (!r.movedY) { e.fr1DY = -e.fr1DY; e.fr1Speed = Math.max(1, e.fr1Speed * 0.6); }
  if (e.fr1Timer <= 0) {
    const v = seekVector(e, player.x, player.y);
    e.fr1DX = v.x; e.fr1DY = v.y;
    e.fr1Speed = 1;
    e.fr1Timer = Util.rand(2.2, 3.8);
    e.hitFlash = 0.1;
  }
};

ENEMY_BEHAVIOR_HANDLERS.fr1Staticwisp = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.fr1Charge === undefined) { e.fr1Charge = 0; }
  const v = seekVector(e, player.x, player.y);
  const keep = t.keepDistance || 200;
  if (e.fr1Charge > 0) {
    e.fr1Charge -= dt;
    e.hitFlash = (Math.sin(e.fr1Charge * 40) > 0) ? 0.16 : 0;
    forestStep(game, e, dt, -v.y, v.x, 0.4);
    if (e.fr1Charge <= 0) {
      forestArc(game, e, forestAim(e, player), 5, 1.0, t.boltSpeed || 195, { color: t.boltColor || '#bfe8f0', radius: t.boltRadius || 4 });
      e.fireTimer = t.fireCooldown || 2.1;
    }
    return;
  }
  if (v.d < keep - 30) forestStep(game, e, dt, -v.x, -v.y, 1.1);
  else if (v.d > keep + 40) forestStep(game, e, dt, v.x, v.y, 0.9);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && v.d < (t.fireRange || 420)) e.fr1Charge = 0.75;
};

ENEMY_BEHAVIOR_HANDLERS.fr1Venomskitter = function(game, e, dt){
  const player = game.player;
  if (e.fr1DX === undefined) { e.fr1DX = 1; e.fr1DY = 0; e.fr1Timer = 0; e.fr1Rest = 0; }
  if (e.fr1Rest > 0) { e.fr1Rest -= dt; return; }
  e.fr1Timer -= dt;
  if (e.fr1Timer <= 0) {
    const v = seekVector(e, player.x, player.y);
    if (RNG.random() < 0.5) { e.fr1DX = v.x; e.fr1DY = v.y; }
    else {
      const s = RNG.random() < 0.5 ? 1 : -1;
      e.fr1DX = -v.y * s; e.fr1DY = v.x * s;
    }
    e.fr1Timer = Util.rand(0.22, 0.45);
    if (RNG.random() < 0.3) e.fr1Rest = Util.rand(0.1, 0.22);
  }
  const r = forestStep(game, e, dt, e.fr1DX, e.fr1DY, 1.25);
  if (!r.movedX && !r.movedY) e.fr1Timer = 0;
};

ENEMY_BEHAVIOR_HANDLERS.fr1Brambleflail = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.fr1Ang === undefined) { e.fr1Ang = RNG.random() * Math.PI * 2; e.fr1Timer = Util.rand(1.5, 2.6); }
  const R = (t.whipRange || 90) + 30;
  e.fr1Timer -= dt;
  if (e.fr1Sweep > 0) {
    e.fr1Sweep -= dt;
    const v = seekVector(e, player.x, player.y);
    forestStep(game, e, dt, -v.y, v.x, 2.2);
    e.fr1Tick = (e.fr1Tick || 0) - dt;
    if (e.fr1Tick <= 0) {
      e.fr1Tick = 0.12;
      fireProjectileAngle(game, e, forestAim(e, player) + Util.rand(-0.4, 0.4), t.boltSpeed || 210, e.dmg, { color: t.boltColor || '#7a5f3f', radius: 5 });
    }
    if (e.fr1Sweep <= 0) e.fr1Timer = Util.rand(1.8, 3);
    return;
  }
  e.fr1Ang += dt * 1.1;
  const tx = player.x + Math.cos(e.fr1Ang) * R, ty = player.y + Math.sin(e.fr1Ang) * R;
  const v = seekVector(e, tx, ty);
  if (v.d > 8) forestStep(game, e, dt, v.x, v.y, 1.15);
  if (e.fr1Timer <= 0) { e.fr1Sweep = 0.8; e.fr1Tick = 0; }
};

ENEMY_BEHAVIOR_HANDLERS.fr1Vinewhip = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.fr1Crack === undefined) { e.fr1Crack = 0; e.fr1Timer = Util.rand(1, 2); }
  const v = seekVector(e, player.x, player.y);
  const reach = t.whipRange || 85;
  if (e.fr1Crack > 0) {
    e.fr1Crack -= dt;
    forestStep(game, e, dt, v.x, v.y, 2.6);
    if (e.fr1Crack <= 0) {
      forestArc(game, e, forestAim(e, player), 3, 0.8, t.boltSpeed || 180, { color: t.boltColor || '#6b9a4f', radius: 5 });
      e.fr1Timer = Util.rand(1.4, 2.4);
    }
    return;
  }
  e.fr1Timer -= dt;
  if (v.d > reach + 60) forestStep(game, e, dt, v.x, v.y, 0.9);
  else forestStep(game, e, dt, -v.x * 0.4 + -v.y, -v.y * 0.4 + v.x, 0.8);
  if (e.fr1Timer <= 0 && v.d < 260) { e.fr1Crack = 0.32; e.hitFlash = 0.12; }
};

aiChase = forestWrapById(aiChase);
aiTurret = forestWrapById(aiTurret);
