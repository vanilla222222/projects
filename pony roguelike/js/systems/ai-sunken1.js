'use strict';

function sunkStep(game, e, dt, dx, dy, mul){
  const node = game.currentRoom;
  const len = Math.hypot(dx, dy) || 1;
  return tryMoveEntity(e, node, node.obstacles, (dx / len) * e.speed * (mul || 1) * dt, (dy / len) * e.speed * (mul || 1) * dt);
}

function sunkAim(e, player){
  return Math.atan2(player.y - e.y, player.x - e.x);
}

function sunkArc(game, e, ang, count, spread, speed, opts){
  const start = ang - spread / 2;
  const step = count > 1 ? spread / (count - 1) : 0;
  for (let i = 0; i < count; i++) fireProjectileAngle(game, e, start + step * i, speed, e.dmg, opts);
}

function sunkSpawn(game, node, id, x, y){
  const def = ENEMY_TYPES[id];
  if (!def) return null;
  const spot = findNearestFloor(node, Math.floor(x / TILE), Math.floor(y / TILE));
  const en = new Enemy(def, spot.x, spot.y, game.dungeon.floorNum);
  node.enemies.push(en);
  return en;
}

ENEMY_BEHAVIOR_HANDLERS.snk1Subcrawler = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  const enraged = e.hp < e.maxHp * 0.5;
  sunkStep(game, e, dt, v.x, v.y, enraged ? 1.5 : 0.9);
  if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg + (enraged ? 1 : 0)), t.id);
};

ENEMY_BEHAVIOR_HANDLERS.snk1Bassbreaker = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (e.snkPulse === undefined) e.snkPulse = 0;
  e.snkPulse -= dt;
  const pulsing = e.snkPulse <= 0.4 && e.snkPulse > 0;
  sunkStep(game, e, dt, v.x, v.y, pulsing ? 1.9 : 1);
  if (e.snkPulse <= -1.5) e.snkPulse = 1.5;
  if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg + (pulsing ? 1 : 0)), t.id);
};

ENEMY_BEHAVIOR_HANDLERS.snk1Pressurelurker = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  e.snkCloak = (e.snkCloak === undefined) ? true : e.snkCloak;
  if (e.snkCloak) {
    e.alpha = 0.35;
    sunkStep(game, e, dt, v.x, v.y, 0.65);
    if (v.d < 85) { e.snkCloak = false; e.snkDash = 0.45; e.snkDX = v.x; e.snkDY = v.y; }
  } else if (e.snkDash > 0) {
    e.alpha = 1;
    e.snkDash -= dt;
    sunkStep(game, e, dt, e.snkDX, e.snkDY, 4.4);
    if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg + 1), t.id);
    if (e.snkDash <= 0) e.snkCloak = true;
  }
};

ENEMY_BEHAVIOR_HANDLERS.snk1Depthmortar = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 220) sunkStep(game, e, dt, -v.x, -v.y, 0.5);
  e.snkCd = (e.snkCd === undefined) ? 1.8 : e.snkCd - dt;
  if (e.snkCd <= 0) { e.snkLobX = player.x; e.snkLobY = player.y; e.snkLobT = 0.9; e.snkCd = 2.2; e.hitFlash = 0.1; }
  if (e.snkLobT > 0) {
    e.snkLobT -= dt;
    if (e.snkLobT <= 0) {
      game.explosions.push(new Explosion(e.snkLobX, e.snkLobY, 55));
      if (Util.dist(e.snkLobX, e.snkLobY, player.x, player.y) < 55 + player.radius) damagePlayer(game, playerDamageAmount(game, false, e.dmg + 1), t.id);
    }
  }
};

ENEMY_BEHAVIOR_HANDLERS.snk1Abyssmarksman = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 220) sunkStep(game, e, dt, -v.x, -v.y, 0.5);
  e.snkCharge = e.snkCharge || 0;
  e.snkCd = (e.snkCd === undefined) ? 1.5 : e.snkCd - dt;
  if (e.snkCd <= 0 && e.snkCharge === 0) e.snkCharge = 0.8;
  if (e.snkCharge > 0) {
    e.snkCharge -= dt; e.hitFlash = 0.05;
    if (e.snkCharge <= 0) { fireProjectileAngle(game, e, sunkAim(e, player), 340, e.dmg + 2, { pierce: 3, color: '#8ec8ec' }); e.snkCd = 2.2; }
  }
};

ENEMY_BEHAVIOR_HANDLERS.snk1Fathomblinker = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  e.snkCd = (e.snkCd === undefined) ? Util.rand(1.5, 2.5) : e.snkCd - dt;
  if (e.snkCd <= 0) {
    const ang = Util.rand(0, Math.PI * 2);
    e.x = player.x + Math.cos(ang) * 120;
    e.y = player.y + Math.sin(ang) * 120;
    e.snkCd = Util.rand(2, 3);
    e.hitFlash = 0.15;
  }
  if (v.d < 200) fireProjectileAngle(game, e, sunkAim(e, player), 200, e.dmg, { color: '#3a5aa0' });
};

ENEMY_BEHAVIOR_HANDLERS.snk1Sonarwarden = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  sunkStep(game, e, dt, v.x, v.y, 0.6);
  e.snkCd = (e.snkCd === undefined) ? 3 : e.snkCd - dt;
  if (e.snkCd <= 0) {
    e.snkCd = 4; e.hitFlash = 0.15;
    for (const en of game.currentRoom.enemies) if (Util.dist(e.x, e.y, en.x, en.y) < 130) en.shielded = true;
    e.snkGrantT = 3;
  }
  if (e.snkGrantT > 0) { e.snkGrantT -= dt; if (e.snkGrantT <= 0) for (const en of game.currentRoom.enemies) en.shielded = false; }
  if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
};

ENEMY_BEHAVIOR_HANDLERS.snk1Undertowmites = function(game, e, dt){
  const player = game.player, t = e.type;
  const node = game.currentRoom;
  let cx = 0, cy = 0, n = 0;
  for (const en of node.enemies) { if (en !== e && en.type && en.type.id === 'undertowmites') { cx += en.x; cy += en.y; n++; } }
  const v = seekVector(e, player.x, player.y);
  if (n > 0) {
    cx /= n; cy /= n;
    const cohesion = Util.dist(e.x, e.y, cx, cy) > 40 ? { x: cx - e.x, y: cy - e.y } : { x: 0, y: 0 };
    sunkStep(game, e, dt, v.x + cohesion.x * 0.02, v.y + cohesion.y * 0.02, 1.1);
  } else sunkStep(game, e, dt, v.x, v.y, 1.1);
  if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
};

ENEMY_BEHAVIOR_HANDLERS.snk1Abyssshade = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  e.snkCd = (e.snkCd === undefined) ? Util.rand(1.8, 2.6) : e.snkCd - dt;
  if (e.snkCd <= 0) {
    const ang = sunkAim(e, player);
    e.x = player.x - Math.cos(ang) * 60;
    e.y = player.y - Math.sin(ang) * 60;
    e.snkCd = Util.rand(2.2, 3.2);
    e.hitFlash = 0.15;
    e.snkStrike = 0.35;
  }
  if (e.snkStrike > 0) {
    e.snkStrike -= dt;
    if (v.d < e.radius + player.radius + 6) damagePlayer(game, playerDamageAmount(game, false, e.dmg + 1), t.id);
  } else sunkStep(game, e, dt, v.x, v.y, 0.7);
};

ENEMY_BEHAVIOR_HANDLERS.snk1Pressurehusk = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  sunkStep(game, e, dt, v.x, v.y, 0.85);
  if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
  if (e.hp <= 0 && !e.snkSplit) {
    e.snkSplit = true;
    sunkSpawn(game, game.currentRoom, 'subcrawler', e.x + 20, e.y);
    sunkSpawn(game, game.currentRoom, 'subcrawler', e.x - 20, e.y);
  }
};

ENEMY_BEHAVIOR_HANDLERS.snk1Trenchdelver = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.snkBurrow === undefined) { e.snkBurrow = 0; e.snkCd = Util.rand(0.5, 1.5); }
  if (e.snkBurrow > 0) {
    e.snkBurrow -= dt; e.submerged = true; e.shielded = true;
    if (e.snkBurrow <= 0) {
      e.submerged = false; e.shielded = false;
      const spot = findNearestFloor(game.currentRoom, Math.floor(player.x / TILE), Math.floor(player.y / TILE));
      e.x = spot.x; e.y = spot.y;
      if (Util.dist(e.x, e.y, player.x, player.y) < e.radius + player.radius + 20) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
      e.snkCd = 2.4; e.hitFlash = 0.15;
    }
    return;
  }
  e.snkCd -= dt;
  if (e.snkCd <= 0) e.snkBurrow = 1;
};

ENEMY_BEHAVIOR_HANDLERS.snk1Sonarcircler = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.snkAng === undefined) e.snkAng = Util.rand(0, Math.PI * 2);
  e.snkAng += dt * 1.1;
  const r = 130;
  const tx = player.x + Math.cos(e.snkAng) * r, ty = player.y + Math.sin(e.snkAng) * r;
  sunkStep(game, e, dt, tx - e.x, ty - e.y, 1);
  e.snkShot = (e.snkShot === undefined) ? 1 : e.snkShot - dt;
  if (e.snkShot <= 0) { fireProjectileAngle(game, e, sunkAim(e, player), 210, e.dmg, { color: '#78b0e0' }); e.snkShot = 1.3; }
};

ENEMY_BEHAVIOR_HANDLERS.snk1Basschanter = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 200) sunkStep(game, e, dt, -v.x, -v.y, 0.55);
  e.snkShot = (e.snkShot === undefined) ? 1 : e.snkShot - dt;
  if (e.snkShot <= 0) {
    fireProjectileAngle(game, e, sunkAim(e, player), 220, e.dmg, { color: '#4a78c0' });
    fireProjectileAngle(game, e, sunkAim(e, player) + 0.3, 220, e.dmg, { color: '#4a78c0' });
    e.snkShot = 1.3;
  }
};

ENEMY_BEHAVIOR_HANDLERS.snk1Depthsentry = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  e.snkLock = (e.snkLock === undefined) ? 0 : e.snkLock;
  if (v.d < 260) {
    e.snkLock += dt;
    if (e.snkLock >= 1.2) { fireProjectileAngle(game, e, sunkAim(e, player), 260, e.dmg + 1, { pierce: 2, color: '#5a8ac8' }); e.snkLock = 0; e.hitFlash = 0.1; }
  } else e.snkLock = 0;
};

ENEMY_BEHAVIOR_HANDLERS.snk1Hadalturret = function(game, e, dt){
  const player = game.player, t = e.type;
  e.snkShot = (e.snkShot === undefined) ? Util.rand(0.6, 1.4) : e.snkShot - dt;
  if (e.snkShot <= 0) {
    e.snkBurst = (e.snkBurst || 0) + 1;
    const wide = e.snkBurst % 3 === 0;
    sunkArc(game, e, sunkAim(e, player), wide ? 5 : 1, wide ? Math.PI / 2 : 0, 220, { color: '#2a4a8a' });
    e.snkShot = 1.4;
    e.hitFlash = 0.1;
  }
};

ENEMY_BEHAVIOR_HANDLERS.snk1Underswellcharger = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.snkState === undefined) { e.snkState = 'seek'; e.snkCd = 0; }
  const v = seekVector(e, player.x, player.y);
  if (e.snkState === 'telegraph') {
    e.snkTimer -= dt; e.hitFlash = 0.08;
    if (e.snkTimer <= 0) { e.snkState = 'charge'; e.snkDX = v.x; e.snkDY = v.y; }
    return;
  }
  if (e.snkState === 'charge') {
    const r = sunkStep(game, e, dt, e.snkDX, e.snkDY, 6.5);
    if (Util.dist(e.x, e.y, player.x, player.y) < e.radius + player.radius) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
    if (!r.movedX && !r.movedY) { e.snkState = 'seek'; e.snkCd = 2.2; }
    return;
  }
  sunkStep(game, e, dt, v.x, v.y, 0.8);
  e.snkCd -= dt;
  if (e.snkCd <= 0 && v.d < 260) { e.snkState = 'telegraph'; e.snkTimer = 0.5; }
};

ENEMY_BEHAVIOR_HANDLERS.snk1Brinemender = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 150) sunkStep(game, e, dt, -v.x, -v.y, 0.5);
  e.snkCd = (e.snkCd === undefined) ? 2 : e.snkCd - dt;
  if (e.snkCd <= 0) {
    let best = null, bd = 220;
    for (const en of game.currentRoom.enemies) {
      if (en === e || !en.type || en.type.floorKey !== '11A' || en.hp >= en.maxHp) continue;
      const d = Util.dist(e.x, e.y, en.x, en.y);
      if (d < bd) { bd = d; best = en; }
    }
    if (best) { best.hp = Math.min(best.maxHp, best.hp + best.maxHp * 0.3); best.hitFlash = 0.2; e.snkCd = 2.8; }
    else e.snkCd = 0.8;
  }
};

ENEMY_BEHAVIOR_HANDLERS.snk1Sinkerdrone = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  sunkStep(game, e, dt, v.x, v.y, 1.2);
  e.snkFuse = (e.snkFuse === undefined) ? -1 : e.snkFuse;
  if (e.snkFuse < 0 && v.d < 60) e.snkFuse = 0.5;
  if (e.snkFuse >= 0) {
    e.snkFuse -= dt; e.hitFlash = 0.1;
    if (e.snkFuse <= 0) {
      game.explosions.push(new Explosion(e.x, e.y, 50));
      if (Util.dist(e.x, e.y, player.x, player.y) < 50 + player.radius) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
      e.hp = 0;
    }
  }
};

ENEMY_BEHAVIOR_HANDLERS.snk1Leviathanspawn = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (e.snkLeap > 0) {
    e.snkLeap -= dt;
    sunkStep(game, e, dt, e.snkLDX, e.snkLDY, 5.5);
    if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg + 1), t.id);
    if (e.snkLeap <= 0) e.snkCd = 1.8;
    return;
  }
  sunkStep(game, e, dt, v.x, v.y, 0.7);
  e.snkCd = (e.snkCd === undefined) ? 0 : e.snkCd - dt;
  if (e.snkCd <= 0 && v.d < 170) { e.snkLeap = 0.35; e.snkLDX = v.x; e.snkLDY = v.y; }
};
