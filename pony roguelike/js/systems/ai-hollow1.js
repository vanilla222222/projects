'use strict';

function hlwStep(game, e, dt, dx, dy, mul){
  const node = game.currentRoom;
  const len = Math.hypot(dx, dy) || 1;
  return tryMoveEntity(e, node, node.obstacles, (dx / len) * e.speed * (mul || 1) * dt, (dy / len) * e.speed * (mul || 1) * dt);
}

function hlwAim(e, player){
  return Math.atan2(player.y - e.y, player.x - e.x);
}

function hlwArc(game, e, ang, count, spread, speed, opts){
  const start = ang - spread / 2;
  const step = count > 1 ? spread / (count - 1) : 0;
  for (let i = 0; i < count; i++) fireProjectileAngle(game, e, start + step * i, speed, e.dmg, opts);
}

function hlwSpawn(game, node, id, x, y){
  const def = ENEMY_TYPES[id];
  if (!def) return null;
  const spot = findNearestFloor(node, Math.floor(x / TILE), Math.floor(y / TILE));
  const en = new Enemy(def, spot.x, spot.y, game.dungeon.floorNum);
  node.enemies.push(en);
  return en;
}

function hlwContact(game, e, v, bonus){
  if (v.d < e.radius + game.player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg + (bonus || 0)), e.type.id);
}

function hlwBlast(game, e, x, y, r, bonus){
  game.explosions.push(new Explosion(x, y, r));
  const p = game.player;
  if (Util.dist(x, y, p.x, p.y) < r + p.radius) damagePlayer(game, playerDamageAmount(game, false, e.dmg + (bonus || 0)), e.type.id);
}

ENEMY_BEHAVIOR_HANDLERS.hlw1Onbeatstalker = function(game, e, dt){
  const player = game.player;
  const v = seekVector(e, player.x, player.y);
  e.hlwT = ((e.hlwT || 0) + dt) % 0.6;
  hlwStep(game, e, dt, v.x, v.y, e.hlwT < 0.15 ? 3.2 : 0.15);
  hlwContact(game, e, v);
};

ENEMY_BEHAVIOR_HANDLERS.hlw1Downbeatbrute = function(game, e, dt){
  const player = game.player;
  const v = seekVector(e, player.x, player.y);
  hlwStep(game, e, dt, v.x, v.y, 0.7);
  e.hlwCd = (e.hlwCd === undefined) ? 2 : e.hlwCd - dt;
  if (e.hlwCd <= 0 && v.d < 150) { e.hlwCd = 2.4; e.hitFlash = 0.2; hlwBlast(game, e, e.x, e.y, 85, 0); }
  hlwContact(game, e, v);
};

ENEMY_BEHAVIOR_HANDLERS.hlw1Crescendocharger = function(game, e, dt){
  const player = game.player;
  const v = seekVector(e, player.x, player.y);
  if (e.hlwState === undefined) { e.hlwState = 'idle'; e.hlwCd = 1.5; }
  if (e.hlwState === 'dash') {
    e.hlwRamp = Math.min(e.hlwRamp + dt * 3, 4.5);
    const r = hlwStep(game, e, dt, e.hlwDX, e.hlwDY, e.hlwRamp);
    hlwContact(game, e, v, 1);
    if (!r.movedX && !r.movedY) { e.hlwState = 'idle'; e.hlwCd = 2.2; }
    return;
  }
  hlwStep(game, e, dt, v.x, v.y, 0.5);
  e.hlwCd -= dt;
  if (e.hlwCd <= 0 && v.d < 300) { e.hlwState = 'dash'; e.hlwDX = v.x; e.hlwDY = v.y; e.hlwRamp = 1; e.hitFlash = 0.15; }
};

ENEMY_BEHAVIOR_HANDLERS.hlw1Apexmarksman = function(game, e, dt){
  const player = game.player;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 240) hlwStep(game, e, dt, -v.x, -v.y, 0.55);
  e.hlwCharge = e.hlwCharge || 0;
  e.hlwCd = (e.hlwCd === undefined) ? 1.5 : e.hlwCd - dt;
  if (e.hlwCd <= 0 && e.hlwCharge === 0) e.hlwCharge = 0.9;
  if (e.hlwCharge > 0) {
    e.hlwCharge -= dt; e.hitFlash = 0.05;
    if (e.hlwCharge <= 0) { fireProjectileAngle(game, e, hlwAim(e, player), 380, e.dmg + 2, { pierce: 4, color: '#f0d060' }); e.hlwCd = 2.4; }
  }
};

ENEMY_BEHAVIOR_HANDLERS.hlw1Codablinker = function(game, e, dt){
  const player = game.player;
  e.hlwCd = (e.hlwCd === undefined) ? 1.5 : e.hlwCd - dt;
  if (e.hlwCd <= 0) {
    const ang = Util.rand(0, Math.PI * 2);
    e.x = player.x + Math.cos(ang) * 160; e.y = player.y + Math.sin(ang) * 160;
    e.hlwCd = 2.6; e.hitFlash = 0.2;
    hlwArc(game, e, hlwAim(e, player), 5, 0.8, 220, { color: '#e0c050' });
  }
};

ENEMY_BEHAVIOR_HANDLERS.hlw1Resonancewarden = function(game, e, dt){
  const player = game.player;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 190) hlwStep(game, e, dt, -v.x, -v.y, 0.6);
  e.hlwCd = (e.hlwCd === undefined) ? 2 : e.hlwCd - dt;
  if (e.hlwCd <= 0) {
    e.hlwCd = 4; e.hitFlash = 0.15; e.hlwHold = 2.5;
    e.hlwWarded = [];
    for (const en of game.currentRoom.enemies) if (en !== e && en.hp > 0 && Util.dist(e.x, e.y, en.x, en.y) < 150) { en.shielded = true; e.hlwWarded.push(en); }
  }
  if (e.hlwHold > 0) { e.hlwHold -= dt; if (e.hlwHold <= 0) { for (const en of e.hlwWarded) en.shielded = false; e.hlwWarded = []; } }
};

ENEMY_BEHAVIOR_HANDLERS.hlw1Finalemortar = function(game, e, dt){
  const player = game.player;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 230) hlwStep(game, e, dt, -v.x, -v.y, 0.5);
  e.hlwCd = (e.hlwCd === undefined) ? 1.8 : e.hlwCd - dt;
  if (e.hlwCd <= 0) { e.hlwCd = 3.2; e.hlwSeq = 3; e.hlwTick = 0.5; e.hlwIdx = 0; e.hlwAng = hlwAim(e, player); e.hlwD = Math.min(v.d, 400); e.hitFlash = 0.1; }
  if (e.hlwSeq > 0) {
    e.hlwTick -= dt;
    if (e.hlwTick <= 0) {
      e.hlwTick = 0.4; e.hlwSeq--; e.hlwIdx++;
      const d = e.hlwD * e.hlwIdx / 3;
      hlwBlast(game, e, e.x + Math.cos(e.hlwAng) * d, e.y + Math.sin(e.hlwAng) * d, 50, 0);
    }
  }
};

ENEMY_BEHAVIOR_HANDLERS.hlw1Goldenmites = function(game, e, dt){
  const player = game.player;
  if (e.hlwAng === undefined) e.hlwAng = Util.rand(0, Math.PI * 2);
  e.hlwAng += dt * 3.4;
  hlwStep(game, e, dt, player.x + Math.cos(e.hlwAng) * 50 - e.x, player.y + Math.sin(e.hlwAng) * 50 - e.y, 1.7);
  hlwContact(game, e, seekVector(e, player.x, player.y));
};

ENEMY_BEHAVIOR_HANDLERS.hlw1Polyrhythm = function(game, e, dt){
  const player = game.player;
  const v = seekVector(e, player.x, player.y);
  e.hlwT = (e.hlwT || 0) + dt;
  const w = Math.sin(e.hlwT * 3);
  hlwStep(game, e, dt, v.x - v.y * w, v.y + v.x * w, 0.8);
  e.hlwA = (e.hlwA === undefined) ? 0.9 : e.hlwA - dt;
  e.hlwB = (e.hlwB === undefined) ? 1.35 : e.hlwB - dt;
  if (e.hlwA <= 0) { e.hlwA = 0.9; fireProjectileAngle(game, e, hlwAim(e, player), 200, e.dmg, { color: '#f0c050' }); }
  if (e.hlwB <= 0) { e.hlwB = 1.35; hlwArc(game, e, hlwAim(e, player) + Math.PI / 2, 2, Math.PI, 170, { color: '#c0a040' }); }
  hlwContact(game, e, v);
};

ENEMY_BEHAVIOR_HANDLERS.hlw1Fermatasentry = function(game, e, dt){
  if (e.hlwState === undefined) { e.hlwState = 'rest'; e.hlwCd = 1.5; }
  e.hlwCd -= dt;
  if (e.hlwState === 'rest' && e.hlwCd <= 0) { e.hlwState = 'hold'; e.hlwCd = 1.5; }
  else if (e.hlwState === 'hold') {
    e.hitFlash = 0.05;
    if (e.hlwCd <= 0) { hlwArc(game, e, Util.rand(0, 1), 12, Math.PI * 2, 180, { color: '#ffd860' }); e.hlwState = 'rest'; e.hlwCd = 2; }
  }
};

ENEMY_BEHAVIOR_HANDLERS.hlw1Syncopehopper = function(game, e, dt){
  const player = game.player;
  const v = seekVector(e, player.x, player.y);
  if (e.hlwHop === undefined) { e.hlwHop = 0; e.hlwCd = 0.8; }
  if (e.hlwHop > 0) {
    e.hlwHop -= dt;
    hlwStep(game, e, dt, e.hlwDX, e.hlwDY, 4);
    hlwContact(game, e, v, 1);
    return;
  }
  e.hlwCd -= dt;
  if (e.hlwCd <= 0) { e.hlwHop = 0.22; e.hlwDX = v.x; e.hlwDY = v.y; e.hlwCd = [0.4, 0.9, 0.3, 1.2][Math.floor(Math.random() * 4)]; }
};

ENEMY_BEHAVIOR_HANDLERS.hlw1Tremorswarm = function(game, e, dt){
  const player = game.player;
  const node = game.currentRoom;
  const v = seekVector(e, player.x, player.y);
  let cx = 0, cy = 0, n = 0;
  for (const en of node.enemies) if (en !== e && en.type && en.type.id === 'tremorswarm') { cx += en.x; cy += en.y; n++; }
  e.hlwJit = (e.hlwJit === undefined) ? 0 : e.hlwJit - dt;
  if (e.hlwJit <= 0) { e.hlwJit = 0.12; e.hlwJX = Util.rand(-1, 1); e.hlwJY = Util.rand(-1, 1); }
  let mx = v.x + e.hlwJX * 0.8, my = v.y + e.hlwJY * 0.8;
  if (n > 0) { mx += (cx / n - e.x) * 0.004; my += (cy / n - e.y) * 0.004; }
  hlwStep(game, e, dt, mx, my, 1.3);
  hlwContact(game, e, v);
};
