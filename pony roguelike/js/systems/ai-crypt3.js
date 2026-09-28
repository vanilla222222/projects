'use strict';

const CRYPT3_ID_AI = {};

function cryptWrapById(fn){
  return function(game, e, dt){
    const o = CRYPT3_ID_AI[(e.type && e.type.id) || ''];
    if (o) { o(game, e, dt); return; }
    fn(game, e, dt);
  };
}

function cryptStep(game, e, dt, dx, dy, mul){
  const node = game.currentRoom;
  const len = Math.hypot(dx, dy) || 1;
  return tryMoveEntity(e, node, node.obstacles, (dx / len) * e.speed * (mul || 1) * dt, (dy / len) * e.speed * (mul || 1) * dt);
}

function cryptRing(game, e, count, speed, opts, offset){
  for (let i = 0; i < count; i++) {
    fireProjectileAngle(game, e, (offset || 0) + (i / count) * Math.PI * 2, speed, e.dmg, opts);
  }
}

function cryptArc(game, e, ang, count, spread, speed, opts){
  const start = ang - spread / 2;
  const step = count > 1 ? spread / (count - 1) : 0;
  for (let i = 0; i < count; i++) fireProjectileAngle(game, e, start + step * i, speed, e.dmg, opts);
}

ENEMY_BEHAVIOR_HANDLERS.cr3Gravegrub = function(game, e, dt){
  const player = game.player;
  if (e.cr3Dive === undefined) { e.cr3Dive = 0; e.cr3Timer = 1.4; }
  e.cr3Timer -= dt;
  if (e.submerged) {
    chaseSeek(game, e, player.x, player.y, 2.1, dt);
    if (e.cr3Timer <= 0 || Util.dist(e.x, e.y, player.x, player.y) < e.radius + player.radius + 6) {
      e.submerged = false; e.shielded = false; e.hitFlash = 0.15;
      e.cr3Timer = 1.6;
    }
    return;
  }
  chaseSeek(game, e, player.x, player.y, 0.55, dt);
  if (e.cr3Timer <= 0) {
    e.submerged = true; e.shielded = true;
    e.cr3Timer = 1.3;
    e.navPath = null; e.pathTimer = 0;
  }
};

ENEMY_BEHAVIOR_HANDLERS.cr3Bonepicker = function(game, e, dt){
  const player = game.player;
  if (e.cr3Phase === undefined) { e.cr3Phase = 0; e.cr3Timer = Util.rand(0.4, 1); }
  e.cr3Timer -= dt;
  const v = seekVector(e, player.x, player.y);
  if (e.cr3Phase === 0) {
    if (v.d > 150) cryptStep(game, e, dt, v.x, v.y, 0.9);
    else cryptStep(game, e, dt, -v.y, v.x, 0.7);
    if (e.cr3Timer <= 0) { e.cr3Phase = 1; e.cr3Timer = 0.35; e.cr3DX = v.x; e.cr3DY = v.y; }
  } else if (e.cr3Phase === 1) {
    cryptStep(game, e, dt, e.cr3DX, e.cr3DY, 2.4);
    if (e.cr3Timer <= 0) { e.cr3Phase = 2; e.cr3Timer = 0.6; }
  } else {
    cryptStep(game, e, dt, -v.x, -v.y, 1.1);
    if (e.cr3Timer <= 0) { e.cr3Phase = 0; e.cr3Timer = Util.rand(0.5, 1); }
  }
};

ENEMY_BEHAVIOR_HANDLERS.cr3Cryptslinger = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  const los = hasLineOfSight(node, e, player.x, player.y);
  e.fireTimer -= dt;
  if (e.fireTimer > 0.35) {
    if (los) cryptStep(game, e, dt, -v.x + v.y * 0.8, -v.y - v.x * 0.8, 1);
    else cryptStep(game, e, dt, -v.y, v.x, 0.5);
    return;
  }
  if (!los) { cryptStep(game, e, dt, v.x, v.y, 0.9); return; }
  if (e.fireTimer <= 0) {
    e.fireTimer = t.fireCooldown || 1.6;
    const ang = Math.atan2(player.y - e.y, player.x - e.x);
    cryptArc(game, e, ang, 3, 0.5, t.boltSpeed || 195, { color: '#b9a6c9', radius: 4 });
  }
};

ENEMY_BEHAVIOR_HANDLERS.cr3Skullcharger = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.cr3Bounces === undefined) { e.cr3Bounces = 0; e.attackTimer = Util.rand(0.5, 1.5); }
  if (e.dashing) {
    const r = cryptStep(game, e, dt, e.cr3DX, e.cr3DY, t.chargeSpeed || 6.2);
    if (!r.movedX) e.cr3DX = -e.cr3DX;
    if (!r.movedY) e.cr3DY = -e.cr3DY;
    if ((!r.movedX || !r.movedY)) { e.cr3Bounces++; e.hitFlash = 0.12; }
    e.dashTimer -= dt;
    if (e.dashTimer <= 0 || e.cr3Bounces >= 3) { e.dashing = false; e.cr3Bounces = 0; e.attackTimer = t.chargeCooldown || 2.4; }
    return;
  }
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 30) > 0) ? 0.12 : 0;
    if (e.telegraph <= 0) {
      const v = seekVector(e, player.x, player.y);
      e.cr3DX = v.x; e.cr3DY = v.y; e.cr3Bounces = 0;
      e.dashing = true; e.dashTimer = 1.6;
    }
    return;
  }
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) e.telegraph = t.telegraphTime || 0.55;
  else chaseSeek(game, e, player.x, player.y, 0.5, dt);
};

CRYPT3_ID_AI.graveturret = function(game, e, dt){
  const t = e.type;
  if (e.cr3Sweep === undefined) { e.cr3Sweep = RNG.random() * Math.PI * 2; e.cr3Dir = 1; }
  e.cr3Sweep += e.cr3Dir * 1.15 * dt;
  const toPlayer = Math.atan2(game.player.y - e.y, game.player.x - e.x);
  let diff = Math.atan2(Math.sin(toPlayer - e.cr3Sweep), Math.cos(toPlayer - e.cr3Sweep));
  if (Math.abs(diff) < 0.12) e.cr3Dir = -e.cr3Dir;
  e.facingAngle = e.cr3Sweep;
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) {
    e.fireTimer = (t.fireCooldown || 1.8) * 0.28;
    fireProjectileAngle(game, e, e.cr3Sweep, t.boltSpeed || 190, e.dmg, { color: '#c9c2a0', radius: 4 });
    fireProjectileAngle(game, e, e.cr3Sweep + Math.PI, t.boltSpeed || 190, e.dmg, { color: '#c9c2a0', radius: 4 });
  }
};

ENEMY_BEHAVIOR_HANDLERS.cr3Cryptcrawler = function(game, e, dt){
  const node = game.currentRoom, player = game.player;
  const minX = TILE * 1.5, maxX = (node.tileW - 2.5) * TILE;
  const minY = TILE * 1.5, maxY = (node.tileH - 2.5) * TILE;
  const alignedX = Math.abs(player.x - e.x) < 26, alignedY = Math.abs(player.y - e.y) < 26;
  if (alignedX || alignedY) {
    const v = seekVector(e, alignedX ? e.x : player.x, alignedY ? e.y : player.y);
    cryptStep(game, e, dt, v.x, v.y, 1.5);
    return;
  }
  if (e.cr3Lap === undefined) e.cr3Lap = 1;
  const dLeft = e.x - minX, dRight = maxX - e.x, dTop = e.y - minY, dBottom = maxY - e.y;
  const m = Math.min(dLeft, dRight, dTop, dBottom);
  if (m > TILE * 0.6) {
    const tx = Util.clamp(e.x, minX, maxX), ty = (dTop < dBottom) ? minY : maxY;
    const v = seekVector(e, tx, ty);
    cryptStep(game, e, dt, v.x, v.y, 1);
    return;
  }
  let mx = 0, my = 0;
  if (m === dTop) mx = e.cr3Lap; else if (m === dBottom) mx = -e.cr3Lap;
  else if (m === dLeft) my = -e.cr3Lap; else my = e.cr3Lap;
  const r = cryptStep(game, e, dt, mx, my, 1);
  if (!r.movedX && !r.movedY) e.cr3Lap = -e.cr3Lap;
};

ENEMY_BEHAVIOR_HANDLERS.cr3Tombguardian = function(game, e, dt){
  const player = game.player;
  if (e.cr3Stomp === undefined) { e.cr3Stomp = 0; e.attackTimer = 0; }
  if (e.cr3Stomp > 0) {
    e.cr3Stomp -= dt;
    e.hitFlash = (Math.sin(e.cr3Stomp * 26) > 0) ? 0.14 : 0;
    if (e.cr3Stomp <= 0) {
      cryptRing(game, e, 8, 130, { color: '#8a8070', radius: 6 }, RNG.random());
      game.explosions.push(new Explosion(e.x, e.y, 60));
      Sound.play('hit');
      e.attackTimer = 2.6;
    }
    return;
  }
  e.attackTimer -= dt;
  chaseSeek(game, e, player.x, player.y, 0.85, dt);
  if (e.attackTimer <= 0 && Util.dist(e.x, e.y, player.x, player.y) < 110) e.cr3Stomp = 0.5;
};

ENEMY_BEHAVIOR_HANDLERS.cr3Skeletalarcher = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.cr3Draw === undefined) e.cr3Draw = 0;
  if (e.cr3Draw > 0) {
    e.cr3Draw -= dt;
    e.hitFlash = (Math.sin(e.cr3Draw * 22) > 0) ? 0.1 : 0;
    if (e.cr3Draw <= 0) {
      const sp = t.boltSpeed || 210;
      const pvx = (player.x - (e.lastPX === undefined ? player.x : e.lastPX)) / Math.max(dt, 0.001);
      const pvy = (player.y - (e.lastPY === undefined ? player.y : e.lastPY)) / Math.max(dt, 0.001);
      const lead = Util.dist(e.x, e.y, player.x, player.y) / sp;
      fireProjectileAt(game, e, player.x + Util.clamp(pvx, -400, 400) * lead, player.y + Util.clamp(pvy, -400, 400) * lead, sp * 1.3, e.dmg, { color: '#e0d9bc', radius: 4 });
      e.fireTimer = t.fireCooldown || 1.5;
    }
    e.lastPX = player.x; e.lastPY = player.y;
    return;
  }
  e.lastPX = player.x; e.lastPY = player.y;
  e.fireTimer -= dt;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 150) cryptStep(game, e, dt, -v.x, -v.y, 1.2);
  else if (v.d > 260) cryptStep(game, e, dt, v.x, v.y, 1);
  else cryptStep(game, e, dt, -v.y, v.x, 0.8);
  if (e.fireTimer <= 0 && hasLineOfSight(node, e, player.x, player.y)) e.cr3Draw = 0.7;
};

ENEMY_BEHAVIOR_HANDLERS.cr3Gravewisp = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.cr3Ang === undefined) { e.cr3Ang = RNG.random() * Math.PI * 2; e.cr3Timer = 0; }
  e.cr3Ang += dt * 0.9;
  const v = seekVector(e, player.x, player.y);
  const drift = (v.d < 130) ? -1 : 0.55;
  cryptStep(game, e, dt, v.x * drift + Math.cos(e.cr3Ang) * 0.8, v.y * drift + Math.sin(e.cr3Ang) * 0.8, 1);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) {
    e.fireTimer = t.fireCooldown || 2;
    fireProjectileAngle(game, e, e.cr3Ang + Math.PI, (t.boltSpeed || 175) * 0.35, e.dmg, { color: '#8ec9d6', radius: 6 });
    fireProjectileAngle(game, e, e.cr3Ang + Math.PI * 0.8, (t.boltSpeed || 175) * 0.35, e.dmg, { color: '#8ec9d6', radius: 6 });
  }
};

ENEMY_BEHAVIOR_HANDLERS.cr3Deathrattler = function(game, e, dt){
  const player = game.player;
  const v = seekVector(e, player.x, player.y);
  if (e.cr3Fuse === undefined) e.cr3Fuse = 0;
  if (v.d < 70) {
    e.cr3Fuse += dt;
    e.hitFlash = (Math.sin(e.cr3Fuse * 30) > 0) ? 0.16 : 0;
    cryptStep(game, e, dt, v.x, v.y, 0.4);
    if (e.cr3Fuse >= 1.1) {
      game.explosions.push(new Explosion(e.x, e.y, e.type.blastRadius || 72));
      if (Util.dist(e.x, e.y, player.x, player.y) < (e.type.blastRadius || 72)) damagePlayer(game, playerDamageAmount(game, false, e.dmg), e.type.id);
      e.isDead = true; handleEnemyDeath(game, e);
    }
    return;
  }
  if (e.cr3Fuse > 0.25) cryptRing(game, e, 4, 170, { color: '#8a7a5a', radius: 5 }, RNG.random());
  e.cr3Fuse = 0;
  cryptStep(game, e, dt, v.x - v.y * 0.5, v.y + v.x * 0.5, 1);
};

CRYPT3_ID_AI.shellbone = function(game, e, dt){
  const player = game.player;
  if (e.shielded) {
    chaseSeek(game, e, player.x, player.y, 1.35, dt);
    e.cr3Vented = false;
    return;
  }
  if (!e.cr3Vented) {
    e.cr3Vented = true;
    cryptRing(game, e, 6, 150, { color: '#b0aa98', radius: 5 }, RNG.random());
    Sound.play('hit');
  }
};

CRYPT3_ID_AI.boneguard = function(game, e, dt){
  const player = game.player;
  const v = seekVector(e, player.x, player.y);
  if (e.shielded) {
    if (e.cr3Bash === undefined || e.cr3Bash <= 0) {
      if (v.d < 200) { e.cr3Bash = 0.55; e.cr3DX = v.x; e.cr3DY = v.y; }
      else chaseSeek(game, e, player.x, player.y, 0.9, dt);
      return;
    }
    e.cr3Bash -= dt;
    cryptStep(game, e, dt, e.cr3DX, e.cr3DY, 3.4);
    return;
  }
  e.cr3Bash = 0;
  cryptStep(game, e, dt, -v.x, -v.y, 1.2);
};

ENEMY_BEHAVIOR_HANDLERS.cr3Hollowknight = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.cr3Stage === undefined) { e.cr3Stage = 0; e.cr3Timer = Util.rand(0.6, 1.6); }
  e.cr3Timer -= dt;
  if (e.cr3Stage === 0) {
    chaseSeek(game, e, player.x, player.y, 0.6, dt);
    if (e.cr3Timer <= 0) { e.cr3Stage = 1; e.cr3Timer = t.telegraphTime || 0.55; }
  } else if (e.cr3Stage === 1) {
    e.hitFlash = (Math.sin(e.cr3Timer * 30) > 0) ? 0.12 : 0;
    if (e.cr3Timer <= 0) {
      const v = seekVector(e, player.x, player.y);
      e.cr3DX = v.x; e.cr3DY = v.y;
      e.cr3Stage = 2; e.cr3Timer = 0.5;
    }
  } else if (e.cr3Stage === 2) {
    cryptStep(game, e, dt, e.cr3DX, e.cr3DY, t.chargeSpeed || 6.2);
    if (e.cr3Timer <= 0) { e.cr3Stage = 3; e.cr3Timer = 0.4; e.shielded = true; e.shieldTimer = 0.4; }
  } else {
    if (e.cr3Timer <= 0) {
      e.shielded = false;
      cryptArc(game, e, Math.atan2(e.cr3DY, e.cr3DX), 5, 1.5, 200, { color: '#9aa0a8', radius: 5 });
      e.cr3Stage = 0; e.cr3Timer = t.chargeCooldown || 2.3;
    }
  }
};

CRYPT3_ID_AI.witchlantern = function(game, e, dt){
  const t = e.type, player = game.player;
  if (e.cr3Lit === undefined) { e.cr3Lit = true; e.cr3Timer = 1.6; }
  e.cr3Timer -= dt;
  if (e.cr3Timer <= 0) {
    e.cr3Lit = !e.cr3Lit;
    e.cr3Timer = e.cr3Lit ? 2.2 : 1.4;
    e.hitFlash = 0.15;
    if (e.cr3Lit) cryptRing(game, e, 4, (t.boltSpeed || 200) * 0.8, { color: '#b9a6d9', radius: 5 }, Math.PI / 4);
  }
  e.shielded = !e.cr3Lit;
  if (!e.cr3Lit) return;
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) {
    e.fireTimer = t.fireCooldown || 1.6;
    fireProjectileAt(game, e, player.x, player.y, (t.boltSpeed || 200) * 0.55, e.dmg, { color: '#e0c98a', radius: 7 });
  }
};

ENEMY_BEHAVIOR_HANDLERS.cr3Sarcophaguscrawler = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.cr3Timer === undefined) e.cr3Timer = Util.rand(0.5, 1.5);
  if (e.dashing) {
    cryptStep(game, e, dt, e.cr3DX, e.cr3DY, t.leapSpeed || 5);
    e.dashTimer -= dt;
    if (e.dashTimer <= 0) {
      e.dashing = false;
      e.cr3Timer = t.leapCooldown || 1.6;
      cryptArc(game, e, Math.atan2(e.cr3DY, e.cr3DX), 3, 0.9, 170, { color: '#a89a80', radius: 5 });
      game.explosions.push(new Explosion(e.x, e.y, 34));
    }
    return;
  }
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 28) > 0) ? 0.12 : 0;
    if (e.telegraph <= 0) {
      const v = seekVector(e, player.x, player.y);
      e.cr3DX = v.x; e.cr3DY = v.y;
      e.dashing = true; e.dashTimer = 0.4;
    }
    return;
  }
  e.cr3Timer -= dt;
  if (e.cr3Timer <= 0) e.telegraph = t.telegraphTime || 0.4;
};

ENEMY_BEHAVIOR_HANDLERS.cr3Wailingspecter = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.cr3Timer === undefined) e.cr3Timer = Util.rand(0.8, 2.6);
  const v = seekVector(e, player.x, player.y);
  if (e.cr3Wail > 0) {
    e.cr3Wail -= dt;
    cryptStep(game, e, dt, -v.x, -v.y, 1.4);
    if (e.cr3Wail <= 0) {
      cryptRing(game, e, 12, (t.boltSpeed || 210) * 0.55, { color: '#c9c9e0', radius: 4 }, RNG.random());
      e.cr3Timer = t.fireCooldown ? t.fireCooldown * 1.5 : 2.6;
    }
    return;
  }
  e.cr3Timer -= dt;
  if (v.d > 220) cryptStep(game, e, dt, v.x, v.y, 1);
  else cryptStep(game, e, dt, -v.y, v.x, 0.9);
  if (e.cr3Timer <= 0) { e.cr3Wail = 0.6; e.hitFlash = 0.15; }
};

ENEMY_BEHAVIOR_HANDLERS.cr3Cryptcircler = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.cr3Rad === undefined) { e.cr3Rad = t.orbitRadius || 130; e.cr3In = 1; e.orbitDir = RNG.random() < 0.5 ? 1 : -1; }
  e.cr3Rad += e.cr3In * -70 * dt;
  if (e.cr3Rad < 46) { e.cr3In = -1; cryptRing(game, e, 6, 200, { color: '#b9a6d9', radius: 4 }, RNG.random()); }
  if (e.cr3Rad > (t.orbitRadius || 130)) { e.cr3In = 1; e.cr3Rad = t.orbitRadius || 130; }
  const ang = Math.atan2(e.y - player.y, e.x - player.x) + e.orbitDir * (t.orbitSpeed || 1.3) * dt;
  const tx = player.x + Math.cos(ang) * e.cr3Rad, ty = player.y + Math.sin(ang) * e.cr3Rad;
  const v = seekVector(e, tx, ty);
  cryptStep(game, e, dt, v.x, v.y, 1.4);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) {
    e.fireTimer = t.fireCooldown || 1.8;
    fireProjectileAngle(game, e, ang + Math.PI / 2 * e.orbitDir, t.boltSpeed || 190, e.dmg, { color: t.boltColor || '#b9a6d9', radius: t.boltRadius || 4 });
  }
};

ENEMY_BEHAVIOR_HANDLERS.cr3Gravedigger = function(game, e, dt){
  const node = game.currentRoom, player = game.player;
  if (e.cr3Timer === undefined) e.cr3Timer = Util.rand(1, 3.2);
  e.cr3Timer -= dt;
  const v = seekVector(e, player.x, player.y);
  if (e.submerged) {
    if (e.cr3Timer <= 0) {
      const ang = Math.atan2(e.y - player.y, e.x - player.x) + Math.PI;
      const spot = findNearestFloor(node, Math.floor((player.x + Math.cos(ang) * 90) / TILE), Math.floor((player.y + Math.sin(ang) * 90) / TILE));
      e.x = spot.x * TILE + TILE / 2; e.y = spot.y * TILE + TILE / 2;
      e.submerged = false; e.shielded = false; e.hitFlash = 0.15;
      e.navPath = null; e.pathTimer = 0;
      e.cr3Timer = 3.2;
    }
    return;
  }
  cryptStep(game, e, dt, -v.x, -v.y, 0.8);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) {
    e.fireTimer = 1.5;
    cryptArc(game, e, Math.atan2(player.y - e.y, player.x - e.x), 3, 0.7, 165, { color: '#6e5a44', radius: 6 });
  }
  if (e.cr3Timer <= 0) { e.submerged = true; e.shielded = true; e.cr3Timer = 1.2; }
};

ENEMY_BEHAVIOR_HANDLERS.cr3Bonecaller = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.cr3Chant === undefined) e.cr3Chant = 0;
  if (e.cr3Chant > 0) {
    e.cr3Chant -= dt;
    e.shielded = true;
    e.hitFlash = (Math.sin(e.cr3Chant * 24) > 0) ? 0.12 : 0;
    if (e.cr3Chant <= 0) {
      e.shielded = false;
      const def = ENEMY_TYPES[t.summonId || 'cryptmite'];
      const cap = t.maxSummons || 6;
      const n = Math.min(t.summonCount || 2, cap - e.minionsSpawned);
      for (let i = 0; def && i < n; i++) {
        const a = RNG.random() * Math.PI * 2;
        const spot = findNearestFloor(node, Math.floor((e.x + Math.cos(a) * 50) / TILE), Math.floor((e.y + Math.sin(a) * 50) / TILE));
        node.enemies.push(new Enemy(def, spot.x, spot.y, game.dungeon.floorNum));
        e.minionsSpawned++;
      }
      e.summonTimer = t.summonCooldown || 6.5;
    }
    return;
  }
  const v = seekVector(e, player.x, player.y);
  cryptStep(game, e, dt, -v.x, -v.y, v.d < 240 ? 1 : 0);
  e.summonTimer -= dt;
  if (e.summonTimer <= 0 && e.minionsSpawned < (t.maxSummons || 6)) e.cr3Chant = 1.1;
};

ENEMY_BEHAVIOR_HANDLERS.cr3Gravetender = function(game, e, dt){
  const node = game.currentRoom, t = e.type;
  let target = null, worst = 1;
  for (const o of node.enemies) {
    if (o === e || o.isDead || o.isBoss) continue;
    const frac = o.hp / (o.maxHp || 1);
    if (frac < worst) { worst = frac; target = o; }
  }
  if (!target) {
    const player = game.player;
    const v = seekVector(e, player.x, player.y);
    cryptStep(game, e, dt, -v.x, -v.y, 1);
    e.healTimer -= dt;
    if (e.healTimer <= 0) {
      e.healTimer = t.healCooldown || 3.2;
      cryptRing(game, e, 5, 165, { color: '#8a9c7a', radius: 5 }, RNG.random());
    }
    return;
  }
  const v = seekVector(e, target.x, target.y);
  if (v.d > 70) cryptStep(game, e, dt, v.x, v.y, 1.2);
  e.healTimer -= dt;
  if (e.healTimer <= 0 && v.d < (t.healRadius || 140)) {
    e.healTimer = t.healCooldown || 3.2;
    const amt = t.healAmount || 2;
    target.hp = Math.min(target.maxHp, target.hp + amt);
    target.shielded = true; target.grantedShield = true; target.shieldTimer = 1.2;
    game.floatTexts.push(new FloatText(target.x, target.y - target.radius - 6, '+' + amt, Theme.floatText.heal));
  }
};

ENEMY_BEHAVIOR_HANDLERS.cr3Cryptmarksman = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.cr3Lock === undefined) { e.cr3Lock = 0; e.cr3Shots = 0; }
  if (e.cr3Shots > 0) {
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) {
      e.fireTimer = 0.16;
      e.cr3Shots--;
      fireProjectileAt(game, e, e.cr3LX, e.cr3LY, t.boltSpeed || 420, e.dmg, { color: t.boltColor || '#e0d2a8', radius: t.boltRadius || 4 });
      if (e.cr3Shots <= 0) e.fireTimer = t.fireCooldown || 2.8;
    }
    return;
  }
  if (e.cr3Lock > 0) {
    e.cr3Lock -= dt;
    e.cr3LX += (player.x - e.cr3LX) * Math.min(1, 2.4 * dt);
    e.cr3LY += (player.y - e.cr3LY) * Math.min(1, 2.4 * dt);
    e.hitFlash = (Math.sin(e.cr3Lock * 30) > 0) ? 0.12 : 0;
    if (e.cr3Lock <= 0) { e.cr3Shots = 2; e.fireTimer = 0; }
    return;
  }
  e.fireTimer -= dt;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 200) cryptStep(game, e, dt, -v.x, -v.y, 1);
  else if (v.d > (t.fireRange || 520)) cryptStep(game, e, dt, v.x, v.y, 1);
  if (e.fireTimer <= 0 && hasLineOfSight(node, e, player.x, player.y)) {
    e.cr3Lock = t.telegraphTime || 1.2;
    e.cr3LX = player.x; e.cr3LY = player.y;
  }
};

ENEMY_BEHAVIOR_HANDLERS.cr3Cryptmite = function(game, e, dt){
  const node = game.currentRoom, player = game.player;
  let cx = 0, cy = 0, n = 0;
  for (const o of node.enemies) {
    if (o === e || o.isDead || o.type.id !== e.type.id) continue;
    if (Util.dist2(e.x, e.y, o.x, o.y) > 160 * 160) continue;
    cx += o.x; cy += o.y; n++;
  }
  const v = seekVector(e, player.x, player.y);
  let mx = v.x, my = v.y, mul = 0.8;
  if (n > 0) {
    const f = seekVector(e, cx / n, cy / n);
    const sep = f.d < 26 ? -1.4 : 0.5;
    mx += f.x * sep; my += f.y * sep;
    mul = 0.8 + Math.min(n, 5) * 0.16;
  }
  cryptStep(game, e, dt, mx, my, mul);
};

ENEMY_BEHAVIOR_HANDLERS.cr3Urnlurker = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.cr3Hidden === undefined) { e.cr3Hidden = true; e.cr3Timer = 0; }
  if (e.cr3Hidden) {
    e.shielded = true;
    if (Util.dist(e.x, e.y, player.x, player.y) < (t.triggerRange || 120)) {
      e.cr3Hidden = false; e.shielded = false; e.cr3Timer = 3;
      e.hitFlash = 0.2;
      cryptRing(game, e, 6, 210, { color: '#c9bda0', radius: 5 }, RNG.random());
      Sound.play('hit');
    }
    return;
  }
  e.cr3Timer -= dt;
  chaseSeek(game, e, player.x, player.y, 1.7, dt);
  if (e.cr3Timer <= 0) { e.cr3Hidden = true; e.shielded = true; }
};

ENEMY_BEHAVIOR_HANDLERS.cr3Barrowblink = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  e.blinkTimer -= dt;
  if (e.blinkTimer <= 0) {
    e.blinkTimer = t.blinkCooldown || 3.4;
    const mx = player.x + (player.x - e.x), my = player.y + (player.y - e.y);
    const spot = findNearestFloor(node, Math.floor(mx / TILE), Math.floor(my / TILE));
    e.x = spot.x * TILE + TILE / 2; e.y = spot.y * TILE + TILE / 2;
    e.navPath = null; e.pathTimer = 0; e.hitFlash = 0.15;
    fireProjectileAt(game, e, player.x, player.y, t.boltSpeed || 205, e.dmg, { color: t.boltColor || '#c9a6e0', radius: t.boltRadius || 5 });
    e.fireTimer = (t.fireCooldown || 1.4) * 0.5;
    return;
  }
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && Util.dist(e.x, e.y, player.x, player.y) < (t.fireRange || 400)) {
    e.fireTimer = t.fireCooldown || 1.4;
    const ang = Math.atan2(player.y - e.y, player.x - e.x);
    cryptArc(game, e, ang, 2, 0.35, t.boltSpeed || 205, { color: t.boltColor || '#c9a6e0', radius: t.boltRadius || 5 });
  }
};

ENEMY_BEHAVIOR_HANDLERS.cr3Cryptwarden = function(game, e, dt){
  const node = game.currentRoom, t = e.type;
  if (e.cr3WX === undefined) { e.cr3WX = e.x; e.cr3WY = e.y; e.cr3Timer = 0; }
  e.cr3Timer -= dt;
  if (e.cr3Timer <= 0) {
    e.cr3Timer = 4.5;
    e.cr3WX = e.x; e.cr3WY = e.y;
    e.hitFlash = 0.14;
  }
  let best = null, bd = 1e9;
  for (const o of node.enemies) {
    if (o === e || o.isDead || o.isBoss || o.shielded) continue;
    const d = Util.dist2(e.x, e.y, o.x, o.y);
    if (d < bd) { bd = d; best = o; }
  }
  if (best) {
    const v = seekVector(e, best.x, best.y);
    if (v.d > 80) cryptStep(game, e, dt, v.x, v.y, 1);
  } else {
    const v = seekVector(e, e.cr3WX, e.cr3WY);
    if (v.d > 30) cryptStep(game, e, dt, v.x, v.y, 0.7);
  }
  e.attackTimer -= dt;
  if (e.attackTimer > 0) return;
  const R = t.shieldRadius || 140;
  let granted = false;
  for (const o of node.enemies) {
    if (o === e || o.isDead || o.isBoss || o.shielded || o.submerged) continue;
    if (Util.dist(e.cr3WX, e.cr3WY, o.x, o.y) > R) continue;
    o.shielded = true; o.grantedShield = true; o.shieldTimer = t.shieldGrantTime || 2.5;
    granted = true;
  }
  if (granted) e.attackTimer = t.shieldCooldown || 5;
};

ENEMY_BEHAVIOR_HANDLERS.cr3Bonelobber = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.cr3Air === undefined) e.cr3Air = 0;
  if (e.cr3Air > 0) {
    e.cr3Air -= dt;
    if (e.cr3Air <= 0) {
      const saved = { x: e.x, y: e.y };
      e.x = e.cr3LX; e.y = e.cr3LY;
      cryptRing(game, e, 6, 150, { color: '#a89a7a', radius: 5 }, RNG.random());
      game.explosions.push(new Explosion(e.cr3LX, e.cr3LY, t.burstRadius || 44));
      e.x = saved.x; e.y = saved.y;
      e.fireTimer = t.fireCooldown || 2.5;
    }
  }
  const v = seekVector(e, player.x, player.y);
  if (v.d < 160) cryptStep(game, e, dt, -v.x, -v.y, 1);
  else if (v.d > (t.lobRange || 270)) cryptStep(game, e, dt, v.x, v.y, 1);
  else cryptStep(game, e, dt, v.y, -v.x, 0.6);
  if (e.cr3Air > 0) return;
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) {
    e.cr3Air = t.lobTime || 1.1;
    e.cr3LX = player.x; e.cr3LY = player.y;
    e.hitFlash = 0.12;
  }
};

ENEMY_BEHAVIOR_HANDLERS.cr3Boulderroller = function(game, e, dt){
  const player = game.player;
  if (e.cr3DX === undefined) {
    const v = seekVector(e, player.x, player.y);
    e.cr3DX = v.x; e.cr3DY = v.y; e.cr3Roll = 1; e.cr3Stun = 0;
  }
  if (e.cr3Stun > 0) {
    e.cr3Stun -= dt;
    e.hitFlash = 0.1;
    if (e.cr3Stun <= 0) {
      const v = seekVector(e, player.x, player.y);
      e.cr3DX = v.x; e.cr3DY = v.y; e.cr3Roll = 1;
    }
    return;
  }
  e.cr3Roll = Math.min(3.4, e.cr3Roll + dt * 0.55);
  const r = cryptStep(game, e, dt, e.cr3DX, e.cr3DY, e.cr3Roll);
  if (!r.movedX || !r.movedY) {
    if (!r.movedX) e.cr3DX = -e.cr3DX;
    if (!r.movedY) e.cr3DY = -e.cr3DY;
    e.cr3Roll = 1;
    e.cr3Stun = 0.5;
    game.explosions.push(new Explosion(e.x, e.y, 26));
  }
};

ENEMY_BEHAVIOR_HANDLERS.cr3Shadestalker = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.cr3Cloak === undefined) { e.cr3Cloak = 0; e.blinkTimer = Util.rand(0.5, 2); }
  if (e.cr3Cloak > 0) {
    e.cr3Cloak -= dt;
    e.submerged = true; e.shielded = true;
    if (e.cr3Cloak <= 0) {
      e.submerged = false; e.shielded = false; e.hitFlash = 0.15;
      const back = Math.atan2(player.y - (e.lastPY === undefined ? player.y - 1 : e.lastPY), player.x - (e.lastPX === undefined ? player.x : e.lastPX)) + Math.PI;
      const spot = findNearestFloor(node, Math.floor((player.x + Math.cos(back) * 60) / TILE), Math.floor((player.y + Math.sin(back) * 60) / TILE));
      e.x = spot.x * TILE + TILE / 2; e.y = spot.y * TILE + TILE / 2;
      e.navPath = null; e.pathTimer = 0;
      e.blinkTimer = t.blinkCooldown || 3.3;
      fireProjectileAt(game, e, player.x, player.y, t.boltSpeed || 200, e.dmg, { color: t.boltColor || '#a8b4d9', radius: t.boltRadius || 5 });
    }
    return;
  }
  e.lastPX = player.x; e.lastPY = player.y;
  e.blinkTimer -= dt;
  chaseSeek(game, e, player.x, player.y, 0.9, dt);
  if (e.blinkTimer <= 0) e.cr3Cloak = 0.75;
};

ENEMY_BEHAVIOR_HANDLERS.cr3Boneskirmisher = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.cr3Node === undefined) { e.cr3Node = 0; }
  const base = Math.atan2(e.y - player.y, e.x - player.x);
  const ang = Math.round(base / (Math.PI * 2 / 3)) * (Math.PI * 2 / 3) + e.cr3Node * (Math.PI * 2 / 3);
  const R = t.retreatRange || 130;
  const tx = player.x + Math.cos(ang) * R, ty = player.y + Math.sin(ang) * R;
  const v = seekVector(e, tx, ty);
  if (v.d > 22) {
    cryptStep(game, e, dt, v.x, v.y, t.dashSpeed || 1.6);
    return;
  }
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) {
    e.fireTimer = t.fireCooldown || 1.4;
    fireProjectileAt(game, e, player.x, player.y, t.boltSpeed || 230, e.dmg, { color: t.boltColor || '#e0cf9a', radius: t.boltRadius || 4 });
    e.cr3Node = (e.cr3Node + 1) % 3;
  }
};

ENEMY_BEHAVIOR_HANDLERS.cr3Rattleraider = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.cr3Pass === undefined) { e.cr3Pass = 0; e.cr3Timer = Util.rand(0.4, 1.2); }
  e.cr3Timer -= dt;
  if (e.cr3Pass > 0) {
    cryptStep(game, e, dt, e.cr3DX, e.cr3DY, 2.6);
    e.cr3Pass -= dt;
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) {
      e.fireTimer = 0.22;
      const a = Math.atan2(e.cr3DY, e.cr3DX);
      fireProjectileAngle(game, e, a + Math.PI / 2, t.boltSpeed || 240, e.dmg, { color: t.boltColor || '#c9b98a', radius: t.boltRadius || 4 });
      fireProjectileAngle(game, e, a - Math.PI / 2, t.boltSpeed || 240, e.dmg, { color: t.boltColor || '#c9b98a', radius: t.boltRadius || 4 });
    }
    if (e.cr3Pass <= 0) e.cr3Timer = t.fireCooldown || 1.3;
    return;
  }
  const v = seekVector(e, player.x, player.y);
  if (v.d > (t.engageRange || 250)) cryptStep(game, e, dt, v.x, v.y, 1);
  else cryptStep(game, e, dt, -v.y, v.x, 0.8);
  if (e.cr3Timer <= 0) {
    const w = seekVector(e, player.x, player.y);
    e.cr3DX = w.x; e.cr3DY = w.y;
    e.cr3Pass = 0.85; e.fireTimer = 0;
  }
};

ENEMY_BEHAVIOR_HANDLERS.cr3Pallweaver = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.cr3Side === undefined) { e.cr3Side = RNG.random() < 0.5 ? 1 : -1; e.cr3Timer = 1.4; }
  e.cr3Timer -= dt;
  if (e.cr3Timer <= 0) { e.cr3Side = -e.cr3Side; e.cr3Timer = Util.rand(1.2, 2.2); }
  const v = seekVector(e, player.x, player.y);
  const push = v.d > 200 ? 0.5 : (v.d < 110 ? -0.5 : 0);
  const r = cryptStep(game, e, dt, -v.y * e.cr3Side + v.x * push, v.x * e.cr3Side + v.y * push, 1);
  if (!r.movedX && !r.movedY) e.cr3Side = -e.cr3Side;
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) {
    e.fireTimer = 0.28;
    fireProjectileAngle(game, e, Math.atan2(player.y - e.y, player.x - e.x), 14, e.dmg, { color: '#8a7a9c', radius: 7 });
  }
};

ENEMY_BEHAVIOR_HANDLERS.cr3Ossuarysentry = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  const pvx = (player.x - (e.lastPX === undefined ? player.x : e.lastPX));
  const pvy = (player.y - (e.lastPY === undefined ? player.y : e.lastPY));
  const spd = Math.hypot(pvx, pvy) / Math.max(dt, 0.001);
  e.lastPX = player.x; e.lastPY = player.y;
  if (e.cr3Burst === undefined) e.cr3Burst = 0;
  if (e.cr3Burst > 0) {
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) {
      e.fireTimer = 0.12;
      e.cr3Burst--;
      fireProjectileAt(game, e, player.x, player.y, t.boltSpeed || 200, e.dmg, { color: t.boltColor || '#d9d0b0', radius: t.boltRadius || 5 });
      if (e.cr3Burst <= 0) e.fireTimer = t.fireCooldown || 1.5;
    }
    return;
  }
  e.fireTimer -= dt;
  if (spd > (t.sentryThreshold || 32)) {
    if (e.fireTimer <= 0 && Util.dist(e.x, e.y, player.x, player.y) < (t.fireRange || 410) && hasLineOfSight(node, e, player.x, player.y)) {
      e.cr3Burst = 5; e.fireTimer = 0; e.hitFlash = 0.14;
    }
  } else {
    const v = seekVector(e, player.x, player.y);
    cryptStep(game, e, dt, v.x, v.y, 1);
  }
};

CRYPT3_ID_AI.tombbloater = function(game, e, dt){
  const player = game.player;
  if (e.cr3Inflate === undefined) { e.cr3Inflate = 0; e.cr3BaseR = e.radius; }
  e.cr3Inflate += dt;
  const f = Math.min(1, e.cr3Inflate / 6);
  e.radius = e.cr3BaseR * (1 + f * 0.45);
  chaseSeek(game, e, player.x, player.y, 0.7 + f * 0.9, dt);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) {
    e.fireTimer = 1.6 - f;
    fireProjectileAngle(game, e, RNG.random() * Math.PI * 2, 120 + f * 90, e.dmg, { color: '#7a8a6a', radius: 5 });
  }
  if (e.cr3Inflate >= 6) {
    game.explosions.push(new Explosion(e.x, e.y, 84));
    if (Util.dist(e.x, e.y, player.x, player.y) < 84) damagePlayer(game, playerDamageAmount(game, false, e.dmg), e.type.id);
    cryptRing(game, e, 8, 175, { color: '#7a8a6a', radius: 5 }, RNG.random());
    e.isDead = true; handleEnemyDeath(game, e);
  }
};

ENEMY_BEHAVIOR_HANDLERS.cr3Miasmadrifter = function(game, e, dt){
  const player = game.player;
  if (e.cr3Head === undefined) { e.cr3Head = RNG.random() * Math.PI * 2; }
  const want = Math.atan2(player.y - e.y, player.x - e.x);
  const diff = Math.atan2(Math.sin(want - e.cr3Head), Math.cos(want - e.cr3Head));
  e.cr3Head += Util.clamp(diff, -0.55 * dt, 0.55 * dt);
  const r = cryptStep(game, e, dt, Math.cos(e.cr3Head), Math.sin(e.cr3Head), 1);
  if (!r.movedX) e.cr3Head = Math.PI - e.cr3Head;
  if (!r.movedY) e.cr3Head = -e.cr3Head;
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) {
    e.fireTimer = 0.42;
    fireProjectileAngle(game, e, e.cr3Head + Math.PI, 10, e.dmg, { color: '#6a8a70', radius: 9 });
  }
};

ENEMY_BEHAVIOR_HANDLERS.cr3Dirgechanter = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.cr3Verse === undefined) { e.cr3Verse = 0; e.cr3Rest = 0; }
  const v = seekVector(e, player.x, player.y);
  if (e.cr3Rest > 0) {
    e.cr3Rest -= dt;
    e.hitFlash = (Math.sin(e.cr3Rest * 16) > 0) ? 0.1 : 0;
    if (e.cr3Rest <= 0) { e.cr3Verse = 0; e.fireTimer = 0.5; }
    return;
  }
  if (v.d < (t.keepDistance || 210)) cryptStep(game, e, dt, -v.x, -v.y, 1);
  else cryptStep(game, e, dt, v.x, v.y, 0.6);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) {
    const n = 1 + e.cr3Verse * 2;
    cryptArc(game, e, Math.atan2(player.y - e.y, player.x - e.x), n, (t.spreadAngle || 0.4) * e.cr3Verse, t.boltSpeed || 180,
      { color: t.boltColor || '#c9b4d9', radius: t.boltRadius || 4 });
    e.cr3Verse++;
    e.fireTimer = 0.55;
    if (e.cr3Verse >= 3) e.cr3Rest = t.fireCooldown || 2.2;
  }
};

ENEMY_BEHAVIOR_HANDLERS.cr3Shroudmoth = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.cr3Flutter === undefined) { e.cr3Flutter = RNG.random() * Math.PI * 2; e.cr3Dive = 0; }
  e.cr3Flutter += dt * 7;
  const v = seekVector(e, player.x, player.y);
  if (e.cr3Dive > 0) {
    e.cr3Dive -= dt;
    cryptStep(game, e, dt, e.cr3DX, e.cr3DY, 2.6);
    return;
  }
  if (v.d < 90) {
    e.cr3Dive = 0.45;
    e.cr3DX = v.x; e.cr3DY = v.y;
    e.hitFlash = 0.12;
    return;
  }
  const w = Math.sin(e.cr3Flutter) * 0.9;
  cryptStep(game, e, dt, v.x + -v.y * w, v.y + v.x * w, 1);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && v.d < (t.fireRange || 350)) {
    e.fireTimer = t.fireCooldown || 2;
    fireProjectileAt(game, e, player.x, player.y, t.boltSpeed || 185, e.dmg, { color: t.boltColor || '#c9c0e0', radius: t.boltRadius || 4 });
  }
};

ENEMY_BEHAVIOR_HANDLERS.cr3Charnelmites = function(game, e, dt){
  const node = game.currentRoom, player = game.player;
  let lead = null, bd = 1e9;
  const myD = Util.dist2(e.x, e.y, player.x, player.y);
  for (const o of node.enemies) {
    if (o === e || o.isDead || o.type.id !== e.type.id) continue;
    const od = Util.dist2(o.x, o.y, player.x, player.y);
    if (od >= myD) continue;
    const d = Util.dist2(e.x, e.y, o.x, o.y);
    if (d < bd) { bd = d; lead = o; }
  }
  if (lead) {
    const v = seekVector(e, lead.x, lead.y);
    cryptStep(game, e, dt, v.x, v.y, v.d < 22 ? 0.3 : 1.15);
    return;
  }
  e.pathTimer -= dt;
  if (e.pathTimer <= 0 || !e.pathDir) { e.pathDir = { x: Util.rand(-1, 1), y: Util.rand(-1, 1) }; e.pathTimer = Util.rand(0.3, 0.7); }
  const v = seekVector(e, player.x, player.y);
  cryptStep(game, e, dt, v.x + e.pathDir.x * 0.35, v.y + e.pathDir.y * 0.35, 1);
};

ENEMY_BEHAVIOR_HANDLERS.cr3Cryptleech = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.cr3Latch === undefined) { e.cr3Latch = 0; e.cr3Flee = 0; e.cr3Timer = Util.rand(0.3, 1.2); }
  if (e.cr3Latch > 0) {
    e.cr3Latch -= dt;
    e.x += (player.x - e.x) * Math.min(1, 14 * dt);
    e.y += (player.y - e.y) * Math.min(1, 14 * dt);
    e.cr3Drain = (e.cr3Drain || 0) + dt;
    if (e.cr3Drain >= 0.5) {
      e.cr3Drain = 0;
      damagePlayer(game, playerDamageAmount(game, false, 1), e.type.id);
      e.hp = Math.min(e.maxHp, e.hp + 1);
    }
    if (e.cr3Latch <= 0) { e.cr3Flee = 1.6; }
    return;
  }
  const v = seekVector(e, player.x, player.y);
  if (e.cr3Flee > 0) {
    e.cr3Flee -= dt;
    cryptStep(game, e, dt, -v.x, -v.y, 1.5);
    if (e.cr3Flee <= 0) e.cr3Timer = t.leapCooldown || 1.4;
    return;
  }
  e.cr3Timer -= dt;
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 30) > 0) ? 0.12 : 0;
    if (e.telegraph <= 0) e.cr3Latch = 1.5;
    return;
  }
  cryptStep(game, e, dt, v.x, v.y, 1);
  if (e.cr3Timer <= 0 && v.d < 170) e.telegraph = t.telegraphTime || 0.35;
};

ENEMY_BEHAVIOR_HANDLERS.cr3Tombtoller = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.cr3Toll === undefined) { e.cr3Toll = 0; e.cr3Timer = Util.rand(0.8, 2.4); }
  if (e.cr3Toll > 0) {
    e.cr3Toll -= dt;
    e.shielded = true;
    e.hitFlash = (Math.sin(e.cr3Toll * 20) > 0) ? 0.14 : 0;
    if (e.cr3Toll <= 0) {
      e.shielded = false;
      cryptRing(game, e, 16, t.boltSpeed || 150, { color: t.boltColor || '#b0a8c9', radius: t.boltRadius || 6 }, RNG.random());
      game.explosions.push(new Explosion(e.x, e.y, 40));
      Sound.play('hit');
      e.cr3Timer = t.fireCooldown || 2.5;
    }
    return;
  }
  e.cr3Timer -= dt;
  const v = seekVector(e, player.x, player.y);
  if (v.d > (t.keepDistance || 150)) cryptStep(game, e, dt, v.x, v.y, 1);
  if (e.cr3Timer <= 0) e.cr3Toll = 1.5;
};

ENEMY_BEHAVIOR_HANDLERS.cr3Boneskitter = function(game, e, dt){
  const player = game.player;
  if (e.cr3Burst === undefined) { e.cr3Burst = 0; e.cr3Timer = 0; e.cr3DX = 1; e.cr3DY = 0; }
  e.cr3Timer -= dt;
  if (e.cr3Burst > 0) {
    e.cr3Burst -= dt;
    const r = cryptStep(game, e, dt, e.cr3DX, e.cr3DY, 1.8);
    if (!r.movedX && !r.movedY) e.cr3Burst = 0;
    if (e.cr3Burst <= 0) e.cr3Timer = Util.rand(0.12, 0.3);
    return;
  }
  if (e.cr3Timer <= 0) {
    const v = seekVector(e, player.x, player.y);
    const snap = (RNG.random() < 0.5) ? 1 : -1;
    if (RNG.random() < 0.55) { e.cr3DX = v.x; e.cr3DY = v.y; }
    else { e.cr3DX = -v.y * snap; e.cr3DY = v.x * snap; }
    e.cr3Burst = Util.rand(0.18, 0.34);
  }
};

aiChase = cryptWrapById(aiChase);
aiTurret = cryptWrapById(aiTurret);
