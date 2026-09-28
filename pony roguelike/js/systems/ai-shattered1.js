'use strict';

function shrStep(game, e, dt, dx, dy, mul){
  const node = game.currentRoom;
  const len = Math.hypot(dx, dy) || 1;
  return tryMoveEntity(e, node, node.obstacles, (dx / len) * e.speed * (mul || 1) * dt, (dy / len) * e.speed * (mul || 1) * dt);
}

function shrAim(e, player){
  return Math.atan2(player.y - e.y, player.x - e.x);
}

function shrArc(game, e, ang, count, spread, speed, opts){
  const start = ang - spread / 2;
  const step = count > 1 ? spread / (count - 1) : 0;
  for (let i = 0; i < count; i++) fireProjectileAngle(game, e, start + step * i, speed, e.dmg, opts);
}

function shrSpawn(game, node, id, x, y){
  const def = ENEMY_TYPES[id];
  if (!def) return null;
  const spot = findNearestFloor(node, Math.floor(x / TILE), Math.floor(y / TILE));
  const en = new Enemy(def, spot.x, spot.y, game.dungeon.floorNum);
  node.enemies.push(en);
  return en;
}

function shrContact(game, e, v, bonus){
  if (v.d < e.radius + game.player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg + (bonus || 0)), e.type.id);
}

function shrBlast(game, e, x, y, r, bonus){
  game.explosions.push(new Explosion(x, y, r));
  const p = game.player;
  if (Util.dist(x, y, p.x, p.y) < r + p.radius) damagePlayer(game, playerDamageAmount(game, false, e.dmg + (bonus || 0)), e.type.id);
}

ENEMY_BEHAVIOR_HANDLERS.shr1Glitchstalker = function(game, e, dt){
  const player = game.player;
  const v = seekVector(e, player.x, player.y);
  e.shrCd = (e.shrCd === undefined) ? Util.rand(1.5, 2.5) : e.shrCd - dt;
  if (e.shrCd <= 0 && v.d > 90) {
    shrStep(game, e, 1, v.x, v.y, 60 / e.speed);
    e.hitFlash = 0.1; e.shrCd = Util.rand(1.5, 2.5);
  }
  shrStep(game, e, dt, v.x, v.y, 0.8);
  shrContact(game, e, v);
};

ENEMY_BEHAVIOR_HANDLERS.shr1Fracturebrute = function(game, e, dt){
  const player = game.player;
  const v = seekVector(e, player.x, player.y);
  shrStep(game, e, dt, v.x, v.y, 0.7);
  if (!e.shrFractured && e.hp < e.maxHp * 0.5) {
    e.shrFractured = true; e.hitFlash = 0.3;
    shrArc(game, e, 0, 8, Math.PI * 2, 190, { color: '#c86aff' });
  }
  shrContact(game, e, v, e.shrFractured ? 1 : 0);
};

ENEMY_BEHAVIOR_HANDLERS.shr1Stutterleaper = function(game, e, dt){
  const player = game.player;
  const v = seekVector(e, player.x, player.y);
  if (e.shrHops === undefined) { e.shrHops = 0; e.shrCd = 1.2; }
  if (e.shrHops > 0) {
    e.shrTimer -= dt;
    shrStep(game, e, dt, e.shrDX, e.shrDY, 3.2);
    if (e.shrTimer <= 0) { e.shrHops--; e.shrTimer = 0.16; e.shrDX = v.x; e.shrDY = v.y; if (e.shrHops === 0) e.shrCd = 2; }
    shrContact(game, e, v);
    return;
  }
  e.shrCd -= dt;
  if (e.shrCd <= 0) { e.shrHops = 3; e.shrTimer = 0.16; e.shrDX = v.x; e.shrDY = v.y; e.hitFlash = 0.15; }
};

ENEMY_BEHAVIOR_HANDLERS.shr1Phasecircler = function(game, e, dt){
  const player = game.player;
  if (e.shrAng === undefined) { e.shrAng = Util.rand(0, Math.PI * 2); e.shrDir = 1; e.shrFlip = 3; e.shrCd = 1.5; }
  e.shrFlip -= dt;
  if (e.shrFlip <= 0) { e.shrDir = -e.shrDir; e.shrFlip = 3; e.shrCd = 0.2; }
  e.shrAng += dt * 1.3 * e.shrDir;
  const tx = player.x + Math.cos(e.shrAng) * 140, ty = player.y + Math.sin(e.shrAng) * 140;
  shrStep(game, e, dt, tx - e.x, ty - e.y, 1.8);
  e.shrCd -= dt;
  if (e.shrCd <= 0) { fireProjectileAngle(game, e, shrAim(e, player), 200, e.dmg, { color: '#a06aff' }); e.shrCd = 1.6; }
};

ENEMY_BEHAVIOR_HANDLERS.shr1Shardsplitter = function(game, e, dt){
  const player = game.player;
  const v = seekVector(e, player.x, player.y);
  shrStep(game, e, dt, v.x, v.y, 1);
  if (!e.shrSplit && e.hp < e.maxHp * 0.4) {
    e.shrSplit = true; e.hitFlash = 0.3;
    shrSpawn(game, game.currentRoom, 'glitchstalker', e.x + 24, e.y);
    shrSpawn(game, game.currentRoom, 'glitchstalker', e.x - 24, e.y);
  }
  shrContact(game, e, v);
};

ENEMY_BEHAVIOR_HANDLERS.shr1Discordmarksman = function(game, e, dt){
  const player = game.player;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 230) shrStep(game, e, dt, -v.x, -v.y, 0.6);
  e.shrCd = (e.shrCd === undefined) ? 1.5 : e.shrCd - dt;
  if (e.shrCd <= 0) {
    e.shrCd = 2.4; e.hitFlash = 0.1;
    for (let i = 0; i < 3; i++) fireProjectileAngle(game, e, shrAim(e, player) + Util.rand(-0.35, 0.35), 240 + i * 30, e.dmg, { color: '#e05ad0' });
  }
};

ENEMY_BEHAVIOR_HANDLERS.shr1Warpblinker = function(game, e, dt){
  const player = game.player;
  e.shrCd = (e.shrCd === undefined) ? 1.5 : e.shrCd - dt;
  if (e.shrCd <= 0) {
    const ang = Util.rand(0, Math.PI * 2);
    e.x = player.x + Math.cos(ang) * 150; e.y = player.y + Math.sin(ang) * 150;
    e.hitFlash = 0.2; e.shrCd = 2.6;
    shrArc(game, e, shrAim(e, player), 3, 0.4, 230, { color: '#7a6aff' });
  }
};

ENEMY_BEHAVIOR_HANDLERS.shr1Refrainsentry = function(game, e, dt){
  if (e.shrSpin === undefined) { e.shrSpin = Util.rand(0, Math.PI * 2); e.shrCd = 1; }
  e.shrSpin += dt * 0.8;
  e.shrCd -= dt;
  if (e.shrCd <= 0) {
    e.shrCd = 0.9;
    for (let i = 0; i < 3; i++) fireProjectileAngle(game, e, e.shrSpin + i * Math.PI * 2 / 3, 170, e.dmg, { color: '#c86aff' });
  }
};

ENEMY_BEHAVIOR_HANDLERS.shr1Riftsentinel = function(game, e, dt){
  const player = game.player;
  if (e.shrMode === undefined) { e.shrMode = 0; e.shrCd = 1.5; }
  e.shrCd -= dt;
  if (e.shrCd <= 0) {
    e.hitFlash = 0.15;
    if (e.shrMode === 0) shrArc(game, e, 0, 10, Math.PI * 2, 170, { color: '#8a5aff' });
    else shrArc(game, e, shrAim(e, player), 3, 0.5, 260, { color: '#ff5ab0' });
    e.shrMode = 1 - e.shrMode; e.shrCd = 1.8;
  }
};

ENEMY_BEHAVIOR_HANDLERS.shr1Echocaller = function(game, e, dt){
  const player = game.player;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 200) shrStep(game, e, dt, -v.x, -v.y, 0.7);
  if (e.shrSpawned === undefined) { e.shrSpawned = 0; e.shrCd = 2; }
  e.shrCd -= dt;
  if (e.shrCd <= 0 && e.shrSpawned < 4) {
    e.shrCd = 4; e.shrSpawned++; e.hitFlash = 0.15;
    shrSpawn(game, game.currentRoom, 'glitchstalker', e.x + Util.rand(-40, 40), e.y + Util.rand(-40, 40));
  }
};

ENEMY_BEHAVIOR_HANDLERS.shr1Staticdrone = function(game, e, dt){
  const player = game.player;
  const v = seekVector(e, player.x, player.y);
  if (e.shrJit === undefined) { e.shrJit = 0; e.shrFuse = -1; e.shrJX = 0; e.shrJY = 0; }
  e.shrJit -= dt;
  if (e.shrJit <= 0) { e.shrJit = 0.25; e.shrJX = Util.rand(-1, 1); e.shrJY = Util.rand(-1, 1); }
  shrStep(game, e, dt, v.x + e.shrJX * 1.2 * v.d / 100, v.y + e.shrJY * 1.2 * v.d / 100, 1.2);
  if (e.shrFuse < 0 && v.d < 70) e.shrFuse = 0.6;
  if (e.shrFuse >= 0) {
    e.shrFuse -= dt; e.hitFlash = 0.05;
    if (e.shrFuse <= 0) { shrBlast(game, e, e.x, e.y, 75, 1); e.hp = 0; }
  }
};

ENEMY_BEHAVIOR_HANDLERS.shr1Dissonanceweaver = function(game, e, dt){
  const player = game.player;
  const v = seekVector(e, player.x, player.y);
  e.shrT = (e.shrT || 0) + dt;
  const px = -v.y, py = v.x;
  const w = Math.sin(e.shrT * 4) * 1.5;
  shrStep(game, e, dt, v.x + px * w, v.y + py * w, 0.9);
  e.shrCd = (e.shrCd === undefined) ? 1.2 : e.shrCd - dt;
  if (e.shrCd <= 0) { e.shrCd = 1.4; const a = shrAim(e, player); fireProjectileAngle(game, e, a + 1.4, 180, e.dmg, { color: '#c86aff' }); fireProjectileAngle(game, e, a - 1.4, 180, e.dmg, { color: '#c86aff' }); }
  shrContact(game, e, v);
};

ENEMY_BEHAVIOR_HANDLERS.shr1Refrainchanter = function(game, e, dt){
  const player = game.player;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 200) shrStep(game, e, dt, -v.x, -v.y, 0.5);
  e.shrCd = (e.shrCd === undefined) ? 1.5 : e.shrCd - dt;
  if (e.shrEcho > 0) { e.shrEcho -= dt; if (e.shrEcho <= 0) shrArc(game, e, 0.26, 6, Math.PI * 2, 150, { color: '#8a6aff' }); }
  if (e.shrCd <= 0) { e.shrCd = 2.6; e.shrEcho = 0.5; e.hitFlash = 0.12; shrArc(game, e, 0, 6, Math.PI * 2, 150, { color: '#c86aff' }); }
};

ENEMY_BEHAVIOR_HANDLERS.shr1Glitchmender = function(game, e, dt){
  const player = game.player;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 180) shrStep(game, e, dt, -v.x, -v.y, 1);
  e.shrCd = (e.shrCd === undefined) ? 1.5 : e.shrCd - dt;
  if (e.shrCd <= 0) {
    e.shrCd = 2; e.hitFlash = 0.12;
    for (const en of game.currentRoom.enemies) if (en !== e && en.hp > 0 && en.hp < en.maxHp && Util.dist(e.x, e.y, en.x, en.y) < 140) en.hp = Math.min(en.maxHp, en.hp + 1);
  }
};

ENEMY_BEHAVIOR_HANDLERS.shr1Loopmites = function(game, e, dt){
  const player = game.player;
  if (e.shrAng === undefined) e.shrAng = Util.rand(0, Math.PI * 2);
  e.shrAng += dt * 3;
  const tx = player.x + Math.cos(e.shrAng) * 45, ty = player.y + Math.sin(e.shrAng) * 45;
  shrStep(game, e, dt, tx - e.x, ty - e.y, 1.6);
  shrContact(game, e, seekVector(e, player.x, player.y));
};

ENEMY_BEHAVIOR_HANDLERS.shr1Skipbrute = function(game, e, dt){
  const player = game.player;
  const v = seekVector(e, player.x, player.y);
  e.shrCd = (e.shrCd === undefined) ? 2 : e.shrCd - dt;
  if (e.shrCd <= 0) { e.shielded = !e.shielded; e.shrCd = 2; e.hitFlash = 0.1; }
  shrStep(game, e, dt, v.x, v.y, e.shielded ? 0.4 : 1.1);
  shrContact(game, e, v);
};

ENEMY_BEHAVIOR_HANDLERS.shr1Phaselurker = function(game, e, dt){
  const player = game.player;
  const v = seekVector(e, player.x, player.y);
  if (e.shrHidden === undefined) e.shrHidden = true;
  if (e.shrHidden) {
    e.submerged = true;
    shrStep(game, e, dt, v.x, v.y, 0.5);
    if (v.d < 110) { e.shrHidden = false; e.submerged = false; e.shrLunge = 0.5; e.hitFlash = 0.2; }
    return;
  }
  e.shrLunge -= dt;
  shrStep(game, e, dt, v.x, v.y, 2.4);
  shrContact(game, e, v, 1);
  if (e.shrLunge <= 0) e.shrHidden = true;
};

ENEMY_BEHAVIOR_HANDLERS.shr1Modmortar = function(game, e, dt){
  const player = game.player;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 220) shrStep(game, e, dt, -v.x, -v.y, 0.5);
  e.shrCd = (e.shrCd === undefined) ? 1.8 : e.shrCd - dt;
  if (e.shrCd <= 0) {
    e.shrCd = 3; e.shrQ = 0.9; e.shrTX = player.x; e.shrTY = player.y; e.hitFlash = 0.1;
    e.shrAX = Math.cos(shrAim(e, player)); e.shrAY = Math.sin(shrAim(e, player));
  }
  if (e.shrQ > 0) {
    e.shrQ -= dt;
    if (e.shrQ <= 0) for (let i = -1; i <= 1; i++) shrBlast(game, e, e.shrTX + e.shrAX * i * 50, e.shrTY + e.shrAY * i * 50, 45, 0);
  }
};

ENEMY_BEHAVIOR_HANDLERS.shr1Reversedelver = function(game, e, dt){
  const player = game.player;
  if (e.shrBurrow === undefined) { e.shrBurrow = 0; e.shrCd = Util.rand(0.5, 1.5); }
  if (e.shrBurrow > 0) {
    e.shrBurrow -= dt; e.submerged = true; e.shielded = true;
    if (e.shrBurrow <= 0) {
      e.submerged = false; e.shielded = false;
      const dx = player.x - e.x, dy = player.y - e.y, d = Math.hypot(dx, dy) || 1;
      const spot = findNearestFloor(game.currentRoom, Math.floor((player.x + dx / d * 50) / TILE), Math.floor((player.y + dy / d * 50) / TILE));
      e.x = spot.x; e.y = spot.y; e.hitFlash = 0.2; e.shrCd = 2.2;
      if (Util.dist(e.x, e.y, player.x, player.y) < e.radius + player.radius + 30) damagePlayer(game, playerDamageAmount(game, false, e.dmg), e.type.id);
    }
    return;
  }
  e.shrCd -= dt;
  if (e.shrCd <= 0) e.shrBurrow = 0.9;
};

ENEMY_BEHAVIOR_HANDLERS.shr1Nullshade = function(game, e, dt){
  const player = game.player;
  const node = game.currentRoom;
  const cx = (node.tileW || 0) * TILE / 2, cy = (node.tileH || 0) * TILE / 2;
  e.shrCd = (e.shrCd === undefined) ? 1.5 : e.shrCd - dt;
  if (e.shrCd <= 0) {
    const spot = findNearestFloor(node, Math.floor((2 * cx - player.x) / TILE), Math.floor((2 * cy - player.y) / TILE));
    e.x = spot.x; e.y = spot.y; e.hitFlash = 0.2; e.shrCd = 2.5;
    fireProjectileAngle(game, e, shrAim(e, player), 240, e.dmg, { color: '#5a5a7a' });
  }
  const v = seekVector(e, player.x, player.y);
  shrStep(game, e, dt, v.x, v.y, 0.6);
  shrContact(game, e, v);
};

ENEMY_BEHAVIOR_HANDLERS.shr1Rasterswarm = function(game, e, dt){
  const player = game.player;
  e.shrCd = (e.shrCd === undefined) ? 0 : e.shrCd - dt;
  if (e.shrCd <= 0) { e.shrAxis = e.shrAxis === 'x' ? 'y' : 'x'; e.shrCd = 0.35; }
  const dx = player.x - e.x, dy = player.y - e.y;
  if (e.shrAxis === 'x') shrStep(game, e, dt, Math.sign(dx), 0, 1.3);
  else shrStep(game, e, dt, 0, Math.sign(dy), 1.3);
  shrContact(game, e, seekVector(e, player.x, player.y));
};

ENEMY_BEHAVIOR_HANDLERS.shr1Segfaultmortar = function(game, e, dt){
  const player = game.player;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 230) shrStep(game, e, dt, -v.x, -v.y, 0.5);
  e.shrCd = (e.shrCd === undefined) ? 2 : e.shrCd - dt;
  if (e.shrCd <= 0) { e.shrCd = 3.4; e.shrQ = 0.8; e.shrTX = player.x; e.shrTY = player.y; e.hitFlash = 0.1; e.shrStage = 0; }
  if (e.shrQ > 0) {
    e.shrQ -= dt;
    if (e.shrQ <= 0) {
      shrBlast(game, e, e.shrTX, e.shrTY, 50, 1);
      if (e.shrStage === 0) { e.shrStage = 1; e.shrQ = 0.5; e.shrTX += Util.rand(-70, 70); e.shrTY += Util.rand(-70, 70); }
    }
  }
};

ENEMY_BEHAVIOR_HANDLERS.shr1Checksumwarden = function(game, e, dt){
  const player = game.player;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 190) shrStep(game, e, dt, -v.x, -v.y, 0.6);
  e.shrCd = (e.shrCd === undefined) ? 2 : e.shrCd - dt;
  if (e.shrCd <= 0) {
    e.shrCd = 3.5; e.hitFlash = 0.12;
    let best = null, bd = 1e9;
    for (const en of game.currentRoom.enemies) if (en !== e && en.hp > 0) { const d = Util.dist(e.x, e.y, en.x, en.y); if (d < bd) { bd = d; best = en; } }
    if (best) { best.shielded = true; e.shrWard = best; e.shrWardT = 2.5; }
  }
  if (e.shrWardT > 0) { e.shrWardT -= dt; if (e.shrWardT <= 0 && e.shrWard) { e.shrWard.shielded = false; e.shrWard = null; } }
};
