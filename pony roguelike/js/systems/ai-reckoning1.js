'use strict';

function reckStep(game, e, dt, dx, dy, mul){
  const node = game.currentRoom;
  const len = Math.hypot(dx, dy) || 1;
  return tryMoveEntity(e, node, node.obstacles, (dx / len) * e.speed * (mul || 1) * dt, (dy / len) * e.speed * (mul || 1) * dt);
}

function reckAim(e, player){
  return Math.atan2(player.y - e.y, player.x - e.x);
}

function reckArc(game, e, ang, count, spread, speed, opts){
  const start = ang - spread / 2;
  const step = count > 1 ? spread / (count - 1) : 0;
  for (let i = 0; i < count; i++) fireProjectileAngle(game, e, start + step * i, speed, e.dmg, opts);
}

function reckSpawn(game, node, id, x, y){
  const def = ENEMY_TYPES[id];
  if (!def) return null;
  const spot = findNearestFloor(node, Math.floor(x / TILE), Math.floor(y / TILE));
  const en = new Enemy(def, spot.x, spot.y, game.dungeon.floorNum);
  node.enemies.push(en);
  return en;
}

ENEMY_BEHAVIOR_HANDLERS.reck1Shadowcreeper = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.reckMeld === undefined) { e.reckMeld = 0; e.reckTimer = Util.rand(1.2, 2); }
  const v = seekVector(e, player.x, player.y);
  e.reckTimer -= dt;
  if (e.reckMeld > 0) {
    e.reckMeld -= dt;
    e.shielded = true;
    reckStep(game, e, dt, v.x, v.y, 1.9);
    if (e.reckMeld <= 0) { e.shielded = false; e.reckTimer = Util.rand(1.4, 2.2); }
    return;
  }
  reckStep(game, e, dt, v.x, v.y, 1);
  if (e.reckTimer <= 0 && v.d > 90) { e.reckMeld = 0.7; e.hitFlash = 0.1; }
  if (v.d < (t.contactRange || 26)) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
};

ENEMY_BEHAVIOR_HANDLERS.reck1Stormlurker = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.reckCharge === undefined) { e.reckCharge = 0; }
  const v = seekVector(e, player.x, player.y);
  reckStep(game, e, dt, v.x, v.y, 0.7);
  if (v.d < 220) e.reckCharge = Math.min(1, e.reckCharge + dt * 0.5);
  else e.reckCharge = Math.max(0, e.reckCharge - dt * 0.6);
  if (e.reckCharge >= 1) {
    e.reckCharge = 0;
    game.explosions.push(new Explosion(e.x, e.y, 60));
    if (Util.dist(e.x, e.y, player.x, player.y) < 60 + player.radius) damagePlayer(game, playerDamageAmount(game, false, e.dmg + 1), t.id);
    for (const en of game.currentRoom.enemies) {
      if (en !== e && en.type && en.type.floorKey === '9A' && Util.dist(e.x, e.y, en.x, en.y) < 130) en.reckCharge = 1;
    }
    e.hitFlash = 0.15;
  }
};

ENEMY_BEHAVIOR_HANDLERS.reck1Nightflyer = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.reckDive === undefined) { e.reckDive = 0; e.reckAng = RNG.random() * Math.PI * 2; }
  e.reckAng += dt * 1.6;
  const v = seekVector(e, player.x, player.y);
  if (e.reckDive > 0) {
    e.reckDive -= dt;
    reckStep(game, e, dt, e.reckDX, e.reckDY, 2.2);
    if (e.reckDive <= 0) e.fireTimer = t.fireCooldown || 1.8;
    return;
  }
  const orbit = Math.cos(e.reckAng), tang = Math.sin(e.reckAng);
  reckStep(game, e, dt, v.x * 0.5 + tang * 0.8, v.y * 0.5 - orbit * 0.8, 1);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && v.d < 340) {
    if (v.d < 150) { e.reckDive = 0.4; e.reckDX = v.x; e.reckDY = v.y; }
    else { fireProjectileAngle(game, e, reckAim(e, player), t.boltSpeed || 195, e.dmg, { color: t.boltColor || '#9c9cd0', radius: 4 }); e.fireTimer = t.fireCooldown || 1.8; }
  }
};

ENEMY_BEHAVIOR_HANDLERS.reck1Voidbomber = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (e.reckFuse === undefined) e.reckFuse = 0;
  if (e.reckFuse > 0 || v.d < 60) {
    e.reckFuse += dt;
    e.hitFlash = Math.sin(e.reckFuse * 20) > 0 ? 0.2 : 0;
    if (e.reckFuse >= (t.fuseTime || 0.9)) {
      const r = t.blastRadius || 78;
      game.explosions.push(new Explosion(e.x, e.y, r));
      if (Util.dist(e.x, e.y, player.x, player.y) < r + player.radius) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
      for (let i = 0; i < 3; i++) fireProjectileAngle(game, e, (i / 3) * Math.PI * 2, 140, 1, { color: '#4a2870', radius: 3 });
      e.hp = 0;
    }
    return;
  }
  reckStep(game, e, dt, v.x, v.y, 1);
};

ENEMY_BEHAVIOR_HANDLERS.reck1Duskguard = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.reckPhase === undefined) { e.reckPhase = 0; e.reckTimer = t.shieldTime || 2.1; }
  const v = seekVector(e, player.x, player.y);
  reckStep(game, e, dt, v.x, v.y, e.reckPhase === 0 ? 0.6 : 1);
  e.shielded = e.reckPhase === 0;
  e.reckTimer -= dt;
  if (e.reckTimer <= 0) {
    e.reckPhase = 1 - e.reckPhase;
    e.reckTimer = e.reckPhase === 0 ? (t.shieldTime || 2.1) : (t.vulnTime || 1.8);
    e.hitFlash = 0.1;
  }
  if (v.d < 30) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
};

ENEMY_BEHAVIOR_HANDLERS.reck1Tempestrusher = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.reckState === undefined) { e.reckState = 'seek'; e.reckTimer = 0; }
  const v = seekVector(e, player.x, player.y);
  if (e.reckState === 'telegraph') {
    e.reckTimer -= dt;
    e.hitFlash = 0.08;
    if (e.reckTimer <= 0) { e.reckState = 'charge'; e.reckTimer = 0.5; e.reckDX = v.x; e.reckDY = v.y; }
    return;
  }
  if (e.reckState === 'charge') {
    e.reckTimer -= dt;
    game.currentRoom.creepPatches = game.currentRoom.creepPatches || [];
    const r = reckStep(game, e, dt, e.reckDX, e.reckDY, t.chargeSpeed || 6.4);
    if (Util.dist(e.x, e.y, player.x, player.y) < e.radius + player.radius) damagePlayer(game, playerDamageAmount(game, false, e.dmg + 1), t.id);
    if ((!r.movedX && !r.movedY) || e.reckTimer <= 0) { e.reckState = 'seek'; e.reckCd = 1.4; }
    return;
  }
  reckStep(game, e, dt, v.x, v.y, 1);
  e.reckCd = (e.reckCd || 0) - dt;
  if (e.reckCd <= 0 && v.d < 260) { e.reckState = 'telegraph'; e.reckTimer = t.telegraphTime || 0.55; e.reckCd = t.chargeCooldown || 2; }
};

ENEMY_BEHAVIOR_HANDLERS.reck1Gloomturret = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.reckSweep === undefined) e.reckSweep = reckAim(e, player);
  e.fireTimer -= dt;
  const target = reckAim(e, player);
  const diff = Math.atan2(Math.sin(target - e.reckSweep), Math.cos(target - e.reckSweep));
  e.reckSweep += Util.clamp(diff, -dt * 1.3, dt * 1.3);
  if (e.fireTimer <= 0) {
    e.fireTimer = t.fireCooldown || 1.6;
    reckArc(game, e, e.reckSweep, 3, 0.35, t.boltSpeed || 205, { color: t.boltColor || '#8a8ac0', radius: 4 });
    e.hitFlash = 0.1;
  }
};

ENEMY_BEHAVIOR_HANDLERS.reck1Shadowleaper = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.reckLeap === undefined) { e.reckLeap = 0; e.reckCd = 0; }
  const v = seekVector(e, player.x, player.y);
  if (e.reckLeap > 0) {
    e.reckLeap -= dt;
    e.shielded = true;
    reckStep(game, e, dt, e.reckLX, e.reckLY, t.leapSpeed || 5.2);
    if (e.reckLeap <= 0) { e.shielded = false; e.reckCd = t.leapCooldown || 1.4; }
    return;
  }
  reckStep(game, e, dt, v.x, v.y, 1);
  e.reckCd -= dt;
  if (e.reckCd <= 0 && v.d < 200 && v.d > 50) { e.reckLeap = t.telegraphTime || 0.35; e.reckLX = v.x; e.reckLY = v.y; }
};

ENEMY_BEHAVIOR_HANDLERS.reck1Stormcaller = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  const keep = t.keepDistance || 210;
  if (v.d < keep - 20) reckStep(game, e, dt, -v.x, -v.y, 1);
  else if (v.d > keep + 20) reckStep(game, e, dt, v.x, v.y, 1);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && v.d < keep + 140) {
    e.fireTimer = t.fireCooldown || 1.4;
    fireProjectileAngle(game, e, reckAim(e, player), t.boltSpeed || 220, e.dmg, { color: t.boltColor || '#8a6ac9', radius: 4 });
    for (const en of game.currentRoom.enemies) {
      if (en !== e && en.type && en.type.floorKey === '9A' && en.type.behavior === 'reck1Stormcaller' && Util.dist(e.x, e.y, en.x, en.y) < 200) {
        fireProjectileAngle(game, en, reckAim(en, player), t.boltSpeed || 220, en.dmg, { color: '#8a6ac9', radius: 4 });
      }
    }
  }
};

ENEMY_BEHAVIOR_HANDLERS.reck1Voidwhisper = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  const keep = t.keepDistance || 175;
  if (v.d < keep) reckStep(game, e, dt, -v.x, -v.y, 1);
  else reckStep(game, e, dt, v.x, v.y, 0.7);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && v.d < keep + 160) {
    e.fireTimer = t.fireCooldown || 1.5;
    const ang = reckAim(e, player);
    fireProjectileAngle(game, e, ang + 0.2, t.boltSpeed || 215, e.dmg, { color: t.boltColor || '#8a3a9c', radius: 4, homing: 0.03 });
    fireProjectileAngle(game, e, ang - 0.2, t.boltSpeed || 215, e.dmg, { color: t.boltColor || '#8a3a9c', radius: 4, homing: 0.03 });
  }
};

ENEMY_BEHAVIOR_HANDLERS.reck1Voidmarksman = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 320) reckStep(game, e, dt, -v.x, -v.y, 0.5);
  if (e.reckAim === undefined) { e.reckAim = 0; e.fireTimer = t.fireCooldown || 2.6; }
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && v.d < (t.fireRange || 540)) {
    e.reckAim += dt;
    e.hitFlash = e.reckAim > (t.telegraphTime || 1.2) * 0.6 ? 0.12 : 0;
    if (e.reckAim >= (t.telegraphTime || 1.2)) {
      fireProjectileAngle(game, e, reckAim(e, player), t.boltSpeed || 440, e.dmg + 1, { color: t.boltColor || '#c9a6f0', radius: 4 });
      e.reckAim = 0; e.fireTimer = t.fireCooldown || 2.6;
    }
  } else e.reckAim = 0;
};

ENEMY_BEHAVIOR_HANDLERS.reck1Gloommites = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.reckWob === undefined) e.reckWob = RNG.random() * 10;
  e.reckWob += dt * 5;
  const v = seekVector(e, player.x, player.y);
  let cx = 0, cy = 0, n = 0;
  for (const en of game.currentRoom.enemies) {
    if (en !== e && en.type && en.type.behavior === 'reck1Gloommites' && Util.dist(e.x, e.y, en.x, en.y) < 40) { cx += en.x; cy += en.y; n++; }
  }
  let dx = v.x, dy = v.y;
  if (n > 0) { dx += (e.x - cx / n) * 0.02; dy += (e.y - cy / n) * 0.02; }
  reckStep(game, e, dt, dx + Math.cos(e.reckWob) * (t.driftAmount || 0.6), dy + Math.sin(e.reckWob) * (t.driftAmount || 0.6), 1);
  if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
};

ENEMY_BEHAVIOR_HANDLERS.reck1Dusklurker = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.reckHidden === undefined) { e.reckHidden = true; e.reckDash = 0; }
  const v = seekVector(e, player.x, player.y);
  if (e.reckDash > 0) {
    e.reckDash -= dt;
    const r = reckStep(game, e, dt, e.reckDX, e.reckDY, t.chargeSpeed || 6.6);
    if (Util.dist(e.x, e.y, player.x, player.y) < e.radius + player.radius) damagePlayer(game, playerDamageAmount(game, false, e.dmg + 1), t.id);
    if ((!r.movedX && !r.movedY) || e.reckDash <= 0) { e.reckDash = 0; e.reckHidden = true; e.reckCd = t.chargeCooldown || 2.2; }
    return;
  }
  e.shielded = e.reckHidden;
  e.alpha = e.reckHidden ? 0.35 : 1;
  if (e.reckHidden) {
    e.reckCd = (e.reckCd || 0) - dt;
    if (v.d < (t.triggerRange || 120) && e.reckCd <= 0) { e.reckHidden = false; e.reckTelegraph = t.telegraphTime || 0.3; e.hitFlash = 0.15; }
    return;
  }
  e.reckTelegraph -= dt;
  if (e.reckTelegraph <= 0) { e.reckDash = t.dashDuration || 0.5; e.reckDX = v.x; e.reckDY = v.y; }
};

ENEMY_BEHAVIOR_HANDLERS.reck1Voidblinker = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.reckBlink === undefined) e.reckBlink = t.blinkCooldown || 3.2;
  e.reckBlink -= dt;
  const v = seekVector(e, player.x, player.y);
  if (e.reckBlink <= 0 && v.d < (t.blinkRange || 220)) {
    const ang = RNG.random() * Math.PI * 2, dist = Util.rand(90, 160);
    const nx = player.x + Math.cos(ang) * dist, ny = player.y + Math.sin(ang) * dist;
    const spot = findNearestFloor(game.currentRoom, Math.floor(nx / TILE), Math.floor(ny / TILE));
    e.x = spot.x; e.y = spot.y;
    e.reckBlink = t.blinkCooldown || 3.2;
    e.hitFlash = 0.2;
  }
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && v.d < (t.fireRange || 420)) {
    e.fireTimer = t.fireCooldown || 1.4;
    fireProjectileAngle(game, e, reckAim(e, player), t.boltSpeed || 215, e.dmg, { color: t.boltColor || '#d98af0', radius: 5 });
  }
};

ENEMY_BEHAVIOR_HANDLERS.reck1Nightwarden = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  const keep = t.keepDistance || 200;
  if (v.d < keep) reckStep(game, e, dt, -v.x, -v.y, 0.7);
  else reckStep(game, e, dt, v.x, v.y, 0.7);
  e.reckGrant = (e.reckGrant || 0) - dt;
  if (e.reckGrant <= 0) {
    e.reckGrant = t.shieldCooldown || 5;
    for (const en of game.currentRoom.enemies) {
      if (en.type && en.type.floorKey === '9A' && Util.dist(e.x, e.y, en.x, en.y) < (t.shieldRadius || 140)) {
        en.shielded = true; en.reckShieldT = t.shieldGrantTime || 2.6;
      }
    }
    e.hitFlash = 0.12;
  }
  if (e.reckShieldT > 0) { e.reckShieldT -= dt; if (e.reckShieldT <= 0) e.shielded = false; }
};

ENEMY_BEHAVIOR_HANDLERS.reck1Stormmortar = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 150) reckStep(game, e, dt, -v.x, -v.y, 0.6);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && v.d < (t.lobRange || 290)) {
    e.fireTimer = t.fireCooldown || 2.3;
    const tx = player.x, ty = player.y;
    game.explosions.push(new Explosion(tx, ty, 10));
    e.reckLobT = t.lobTime || 1; e.reckLobX = tx; e.reckLobY = ty; e.reckLobR = t.burstRadius || 48;
    e.hitFlash = 0.1;
  }
  if (e.reckLobT > 0) {
    e.reckLobT -= dt;
    if (e.reckLobT <= 0) {
      game.explosions.push(new Explosion(e.reckLobX, e.reckLobY, e.reckLobR));
      if (Util.dist(e.reckLobX, e.reckLobY, player.x, player.y) < e.reckLobR + player.radius) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
    }
  }
};

ENEMY_BEHAVIOR_HANDLERS.reck1Shadeweaver = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.reckPhase === undefined) e.reckPhase = 0;
  e.reckPhase += dt * (t.weaveFrequency || 3.4);
  const v = seekVector(e, player.x, player.y);
  const perp = Math.sin(e.reckPhase) * (t.weaveAmplitude || 0.7);
  reckStep(game, e, dt, v.x + (-v.y) * perp, v.y + v.x * perp, 1);
  e.shielded = Math.sin(e.reckPhase * 0.5) > 0.7;
  if (v.d < e.radius + player.radius + 4 && !e.shielded) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
};

ENEMY_BEHAVIOR_HANDLERS.reck1Duskwatcher = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  const moved = reckStep(game, e, dt, v.x, v.y, v.d > (t.fireRange || 440) * 0.7 ? 0.6 : 0);
  const still = !moved.movedX && !moved.movedY;
  e.reckCharge = still ? Math.min(1, (e.reckCharge || 0) + dt * 0.7) : Math.max(0, (e.reckCharge || 0) - dt * 1.5);
  e.hitFlash = e.reckCharge > 0.5 ? 0.1 : 0;
  e.fireTimer -= dt;
  if (e.reckCharge >= 1 && e.fireTimer <= 0 && v.d < (t.fireRange || 440)) {
    e.fireTimer = t.fireCooldown || 1.2;
    fireProjectileAngle(game, e, reckAim(e, player), (t.boltSpeed || 220) * 1.4, e.dmg + 1, { color: t.boltColor || '#b49ce0', radius: 5 });
    e.reckCharge = 0;
  }
};

ENEMY_BEHAVIOR_HANDLERS.reck1Stormcircler = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.reckOrbit === undefined) e.reckOrbit = RNG.random() * Math.PI * 2;
  e.reckOrbit += dt * (t.orbitSpeed || 1.4);
  const r = t.orbitRadius || 135;
  const tx = player.x + Math.cos(e.reckOrbit) * r, ty = player.y + Math.sin(e.reckOrbit) * r;
  const dx = tx - e.x, dy = ty - e.y;
  reckStep(game, e, dt, dx, dy, 1.3);
  e.fireTimer -= dt;
  const v = seekVector(e, player.x, player.y);
  if (e.fireTimer <= 0 && v.d < (t.fireRange || 390)) {
    e.fireTimer = t.fireCooldown || 1.6;
    reckArc(game, e, reckAim(e, player), t.shotCount || 2, t.spreadAngle || 0.24, t.boltSpeed || 205, { color: t.boltColor || '#c9c9f0', radius: 4 });
  }
};

ENEMY_BEHAVIOR_HANDLERS.reck1Umbraldelver = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.reckBurrow === undefined) { e.reckBurrow = 0; e.reckCd = 0; }
  const v = seekVector(e, player.x, player.y);
  if (e.reckBurrow > 0) {
    e.reckBurrow -= dt;
    e.submerged = true; e.shielded = true;
    if (e.reckBurrow <= 0) {
      e.submerged = false; e.shielded = false;
      const spot = findNearestFloor(game.currentRoom, Math.floor(player.x / TILE), Math.floor(player.y / TILE));
      e.x = spot.x; e.y = spot.y;
      game.explosions.push(new Explosion(e.x, e.y, 40));
      if (Util.dist(e.x, e.y, player.x, player.y) < 40 + player.radius) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
      e.reckCd = t.burrowCooldown || 2.9;
    }
    return;
  }
  reckStep(game, e, dt, v.x, v.y, 1);
  e.reckCd -= dt;
  if (e.reckCd <= 0 && v.d > 100) e.reckBurrow = t.burrowTime || 1.5;
};

ENEMY_BEHAVIOR_HANDLERS.reck1Gloomroller = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.reckState === undefined) { e.reckState = 'seek'; e.reckCd = 0; }
  const v = seekVector(e, player.x, player.y);
  if (e.reckState === 'telegraph') {
    e.reckTimer -= dt;
    e.hitFlash = 0.08;
    if (e.reckTimer <= 0) { e.reckState = 'charge'; e.reckSpeed = 1; e.reckDX = v.x; e.reckDY = v.y; }
    return;
  }
  if (e.reckState === 'charge') {
    e.reckSpeed = Math.min(t.chargeSpeed || 6, e.reckSpeed + dt * 4);
    const r = reckStep(game, e, dt, e.reckDX, e.reckDY, e.reckSpeed);
    if (Util.dist(e.x, e.y, player.x, player.y) < e.radius + player.radius) damagePlayer(game, playerDamageAmount(game, false, e.dmg + Math.round(e.reckSpeed / 3)), t.id);
    if (!r.movedX && !r.movedY) { e.reckState = 'seek'; e.reckCd = t.chargeCooldown || 2.5; }
    return;
  }
  reckStep(game, e, dt, v.x, v.y, 1);
  e.reckCd -= dt;
  if (e.reckCd <= 0 && v.d < 260) { e.reckState = 'telegraph'; e.reckTimer = t.telegraphTime || 0.6; }
};

ENEMY_BEHAVIOR_HANDLERS.reck1Eclipseherald = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  const keep = t.keepDistance || 200;
  if (v.d < keep) reckStep(game, e, dt, -v.x, -v.y, 0.8);
  else reckStep(game, e, dt, v.x, v.y, 0.6);
  if (e.reckDark === undefined) e.reckDark = 0;
  e.reckDark = (e.reckDark + dt * 0.4) % (Math.PI * 2);
  e.alpha = 0.55 + Math.sin(e.reckDark) * 0.35;
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && v.d < keep + 140) {
    e.fireTimer = (t.fireCooldown || 1.5) * (e.alpha < 0.6 ? 0.6 : 1);
    fireProjectileAngle(game, e, reckAim(e, player), t.boltSpeed || 210, e.dmg, { color: t.boltColor || '#3a3a6a', radius: 4 });
  }
};

ENEMY_BEHAVIOR_HANDLERS.reck1Galewraith = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.reckPhase === undefined) e.reckPhase = 0;
  e.reckPhase += dt * (t.weaveFrequency || 3.3);
  const v = seekVector(e, player.x, player.y);
  const perp = Math.sin(e.reckPhase) * (t.weaveAmplitude || 0.68);
  const r = reckStep(game, e, dt, v.x + (-v.y) * perp, v.y + v.x * perp, 1.1);
  if (v.d < e.radius + player.radius + 6) { damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id); }
};

ENEMY_BEHAVIOR_HANDLERS.reck1Stormsinger = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  const keep = t.keepDistance || 195;
  if (v.d < keep) reckStep(game, e, dt, -v.x, -v.y, 0.7);
  else reckStep(game, e, dt, v.x, v.y, 0.7);
  e.reckSummon = (e.reckSummon || 0) - dt;
  e.minionsSpawned = e.minionsSpawned || 0;
  if (e.reckSummon <= 0 && e.minionsSpawned < (t.maxSummons || 6)) {
    const ang = RNG.random() * Math.PI * 2;
    const spawned = reckSpawn(game, game.currentRoom, t.summonId || 'swarmerdnb', e.x + Math.cos(ang) * 50, e.y + Math.sin(ang) * 50);
    if (spawned) e.minionsSpawned++;
    e.reckSummon = t.summonCooldown || 6.3;
    e.hitFlash = 0.12;
  }
};

ENEMY_BEHAVIOR_HANDLERS.reck1Thunderhusk = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.reckBurrow === undefined) { e.reckBurrow = 0; e.reckCd = 0; }
  const v = seekVector(e, player.x, player.y);
  if (e.reckBurrow > 0) {
    e.reckBurrow -= dt;
    e.submerged = true; e.shielded = true;
    reckStep(game, e, dt, v.x, v.y, 1.6);
    if (e.reckBurrow <= 0) { e.submerged = false; e.shielded = false; e.reckCd = t.burrowCooldown || 3; game.explosions.push(new Explosion(e.x, e.y, 45)); }
    return;
  }
  reckStep(game, e, dt, v.x, v.y, 0.8);
  e.reckCd -= dt;
  if (e.reckCd <= 0 && v.d > 80) e.reckBurrow = t.burrowTime || 1.35;
  if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
};

ENEMY_BEHAVIOR_HANDLERS.reck1Voidhusk = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  reckStep(game, e, dt, v.x, v.y, 0.85);
  if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
  if (e.hp <= 0 && !e.reckSplit) {
    e.reckSplit = true;
    for (let i = 0; i < 2; i++) {
      const ang = (i / 2) * Math.PI * 2 + RNG.random();
      reckSpawn(game, game.currentRoom, t.splitInto || 'gloommites', e.x + Math.cos(ang) * 20, e.y + Math.sin(ang) * 20);
    }
  }
};

ENEMY_BEHAVIOR_HANDLERS.reck1Shadecaller = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  const keep = t.keepDistance || 200;
  if (v.d < keep) reckStep(game, e, dt, -v.x, -v.y, 0.7);
  else reckStep(game, e, dt, v.x, v.y, 0.7);
  e.reckSummon = (e.reckSummon || 0) - dt;
  e.minionsSpawned = e.minionsSpawned || 0;
  if (e.reckSummon <= 0 && e.minionsSpawned < (t.maxSummons || 6)) {
    const spawned = reckSpawn(game, game.currentRoom, t.summonId || 'gloommites', e.x + Util.rand(-40, 40), e.y + Util.rand(-40, 40));
    if (spawned) e.minionsSpawned++;
    e.reckSummon = t.summonCooldown || 5.5;
    e.hitFlash = 0.12;
  }
};

ENEMY_BEHAVIOR_HANDLERS.reck1Duskmender = function(game, e, dt){
  const player = game.player, t = e.type;
  let target = null, best = Infinity;
  for (const en of game.currentRoom.enemies) {
    if (en !== e && en.type && en.type.floorKey === '9A' && en.hp < en.maxHp) {
      const d = Util.dist(e.x, e.y, en.x, en.y);
      if (d < best) { best = d; target = en; }
    }
  }
  const v = seekVector(e, player.x, player.y);
  if (target && best < (t.healRadius || 155)) reckStep(game, e, dt, -v.x, -v.y, 0.6);
  else reckStep(game, e, dt, v.x, v.y, 0.4);
  e.reckHeal = (e.reckHeal || 0) - dt;
  if (e.reckHeal <= 0 && target && best < (t.healRadius || 155)) {
    target.hp = Math.min(target.maxHp, target.hp + (t.healAmount || 3));
    e.reckHeal = t.healCooldown || 2.8;
    e.hitFlash = 0.1;
  }
};

ENEMY_BEHAVIOR_HANDLERS.reck1Thunderdrone = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (e.reckFuse === undefined) e.reckFuse = 0;
  if (v.d < 70) e.reckFuse += dt;
  else e.reckFuse = Math.max(0, e.reckFuse - dt * 2);
  e.hitFlash = e.reckFuse > 0.3 ? 0.15 : 0;
  if (e.reckFuse >= (t.fuseTime || 0.85)) {
    const r = t.blastRadius || 86;
    game.explosions.push(new Explosion(e.x, e.y, r));
    if (Util.dist(e.x, e.y, player.x, player.y) < r + player.radius) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
    e.hp = 0;
    return;
  }
  reckStep(game, e, dt, v.x, v.y, 1.2);
};

ENEMY_BEHAVIOR_HANDLERS.reck1Galechanter = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  const keep = t.keepDistance || 195;
  if (v.d < keep) reckStep(game, e, dt, -v.x, -v.y, 0.8);
  else reckStep(game, e, dt, v.x, v.y, 0.6);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && v.d < keep + 130) {
    e.fireTimer = t.fireCooldown || 2;
    reckArc(game, e, reckAim(e, player), t.shotCount || 3, t.spreadAngle || 0.42, t.boltSpeed || 205, { color: t.boltColor || '#c9b4f0', radius: 4 });
  }
};

ENEMY_BEHAVIOR_HANDLERS.reck1Nullmarksman = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 260) reckStep(game, e, dt, -v.x, -v.y, 0.9);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && v.d < (t.fireRange || 500)) {
    e.reckAim = (e.reckAim || 0) + dt;
    e.hitFlash = 0.1;
    if (e.reckAim >= (t.telegraphTime || 0.95)) {
      fireProjectileAngle(game, e, reckAim(e, player), t.boltSpeed || 470, e.dmg, { color: t.boltColor || '#e0c9f0', radius: 4, pierce: 2 });
      e.reckAim = 0; e.fireTimer = t.fireCooldown || 2.2;
    }
  } else e.reckAim = 0;
};

ENEMY_BEHAVIOR_HANDLERS.reck1Riftcircler = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.reckOrbit === undefined) e.reckOrbit = RNG.random() * Math.PI * 2;
  e.reckOrbit += dt * (t.orbitSpeed || 1.55) * (RNG.random() < 0.002 ? -1 : 1);
  const r = t.orbitRadius || 115;
  const tx = player.x + Math.cos(e.reckOrbit) * r, ty = player.y + Math.sin(e.reckOrbit) * r;
  reckStep(game, e, dt, tx - e.x, ty - e.y, 1.3);
  const v = seekVector(e, player.x, player.y);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && v.d < (t.fireRange || 370)) {
    e.fireTimer = t.fireCooldown || 1.5;
    fireProjectileAngle(game, e, reckAim(e, player), t.boltSpeed || 215, e.dmg, { color: t.boltColor || '#e0b4ff', radius: 4 });
  }
};

ENEMY_BEHAVIOR_HANDLERS.reck1Sableroller = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.reckState === undefined) { e.reckState = 'seek'; e.reckCd = 0; }
  const v = seekVector(e, player.x, player.y);
  if (e.reckState === 'telegraph') {
    e.reckTimer -= dt;
    e.hitFlash = 0.08;
    if (e.reckTimer <= 0) { e.reckState = 'charge'; e.reckDX = v.x; e.reckDY = v.y; e.reckBounces = 2; }
    return;
  }
  if (e.reckState === 'charge') {
    const r = reckStep(game, e, dt, e.reckDX, e.reckDY, t.chargeSpeed || 7);
    if (Util.dist(e.x, e.y, player.x, player.y) < e.radius + player.radius) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
    if (!r.movedX && !r.movedY) {
      if (e.reckBounces > 0) { e.reckBounces--; e.reckDX = -e.reckDX + Util.rand(-0.4, 0.4); e.reckDY = -e.reckDY + Util.rand(-0.4, 0.4); }
      else { e.reckState = 'seek'; e.reckCd = t.chargeCooldown || 1.8; }
    }
    return;
  }
  reckStep(game, e, dt, v.x, v.y, 1);
  e.reckCd -= dt;
  if (e.reckCd <= 0 && v.d < 240) { e.reckState = 'telegraph'; e.reckTimer = t.telegraphTime || 0.45; }
};

ENEMY_BEHAVIOR_HANDLERS.reck1Wraithspire = function(game, e, dt){
  const player = game.player, t = e.type;
  e.fireTimer -= dt;
  const v = seekVector(e, player.x, player.y);
  if (e.fireTimer <= 0 && v.d < 460) {
    e.fireTimer = t.fireCooldown || 2.1;
    e.reckVolley = (e.reckVolley || 0) + 1;
    const spread = (t.spreadAngle || 0.7) * (1 + (e.reckVolley % 3) * 0.3);
    reckArc(game, e, reckAim(e, player), t.shotCount || 4, spread, t.boltSpeed || 195, { color: t.boltColor || '#b4a0e8', radius: 5 });
    e.hitFlash = 0.1;
  }
};

ENEMY_BEHAVIOR_HANDLERS.reck1Hollowdelver = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.reckBurrow === undefined) { e.reckBurrow = 0; e.reckCd = 0; }
  const v = seekVector(e, player.x, player.y);
  if (e.reckBurrow > 0) {
    e.reckBurrow -= dt;
    e.submerged = true; e.shielded = true;
    if (e.reckBurrow <= 0) {
      e.submerged = false; e.shielded = false;
      const ang = reckAim(e, player);
      const nx = player.x - Math.cos(ang) * 40, ny = player.y - Math.sin(ang) * 40;
      const spot = findNearestFloor(game.currentRoom, Math.floor(nx / TILE), Math.floor(ny / TILE));
      e.x = spot.x; e.y = spot.y;
      e.reckCd = t.burrowCooldown || 2.4;
      e.hitFlash = 0.15;
    }
    return;
  }
  reckStep(game, e, dt, v.x, v.y, 1.1);
  e.reckCd -= dt;
  if (e.reckCd <= 0 && v.d > 120) e.reckBurrow = t.burrowTime || 1.2;
  if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
};
