'use strict';

ENEMY_BEHAVIOR_HANDLERS.snk2Reefstalker = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  e.snkCloak = (e.snkCloak === undefined) ? true : e.snkCloak;
  if (e.snkCloak) {
    e.alpha = 0.4;
    sunkStep(game, e, dt, v.x, v.y, 0.7);
    if (v.d < 90) { e.snkCloak = false; e.snkDash = 0.5; e.snkDX = v.x; e.snkDY = v.y; }
  } else if (e.snkDash > 0) {
    e.alpha = 1;
    e.snkDash -= dt;
    sunkStep(game, e, dt, e.snkDX, e.snkDY, 4);
    if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg + 1), t.id);
    if (e.snkDash <= 0) e.snkCloak = true;
  }
};

ENEMY_BEHAVIOR_HANDLERS.snk2Tidebeast = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  const enraged = e.hp < e.maxHp * 0.5;
  sunkStep(game, e, dt, v.x, v.y, enraged ? 1.5 : 0.9);
  if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg + (enraged ? 1 : 0)), t.id);
};

ENEMY_BEHAVIOR_HANDLERS.snk2Echoflyer = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.snkDrift === undefined) e.snkDrift = Util.rand(0, Math.PI * 2);
  e.snkDrift += dt * 1.6;
  const v = seekVector(e, player.x, player.y);
  const perp = Math.atan2(v.y, v.x) + Math.PI / 2;
  sunkStep(game, e, dt, v.x + Math.cos(perp) * 0.6 * Math.sin(e.snkDrift), v.y + Math.sin(perp) * 0.6 * Math.sin(e.snkDrift), 1);
  if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
};

ENEMY_BEHAVIOR_HANDLERS.snk2Brinebomber = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (e.snkFuse > 0) {
    e.snkFuse -= dt; e.hitFlash = 0.1;
    if (e.snkFuse <= 0) {
      game.explosions.push(new Explosion(e.x, e.y, 60));
      if (Util.dist(e.x, e.y, player.x, player.y) < 60 + player.radius) damagePlayer(game, playerDamageAmount(game, false, e.dmg + 1), t.id);
      e.hp = 0;
    }
    return;
  }
  sunkStep(game, e, dt, v.x, v.y, 1.1);
  if (v.d < 50) e.snkFuse = 0.6;
};

ENEMY_BEHAVIOR_HANDLERS.snk2Coralguard = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  sunkStep(game, e, dt, v.x, v.y, 0.6);
  e.snkCycle = (e.snkCycle === undefined) ? 0 : e.snkCycle + dt;
  e.shielded = Math.sin(e.snkCycle * 1.2) > -0.3;
  if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
};

ENEMY_BEHAVIOR_HANDLERS.snk2Bloomcaller = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 200) sunkStep(game, e, dt, -v.x, -v.y, 0.6);
  if (e.snkSpawned === undefined) e.snkSpawned = 0;
  e.snkCd = (e.snkCd === undefined) ? Util.rand(2, 3) : e.snkCd - dt;
  if (e.snkCd <= 0 && e.snkSpawned < 3) {
    const ang = Util.rand(0, Math.PI * 2);
    sunkSpawn(game, game.currentRoom, 'reefstalker', e.x + Math.cos(ang) * 70, e.y + Math.sin(ang) * 70);
    e.snkSpawned++; e.snkCd = Util.rand(3.5, 5);
    e.hitFlash = 0.15;
  }
};

ENEMY_BEHAVIOR_HANDLERS.snk2Tidemender = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 150) sunkStep(game, e, dt, -v.x, -v.y, 0.55);
  e.snkCd = (e.snkCd === undefined) ? 2 : e.snkCd - dt;
  if (e.snkCd <= 0) {
    let best = null, bd = 200;
    for (const en of game.currentRoom.enemies) {
      if (en === e || !en.type || en.type.floorKey !== '11B' || en.hp >= en.maxHp) continue;
      const d = Util.dist(e.x, e.y, en.x, en.y);
      if (d < bd) { bd = d; best = en; }
    }
    if (best) { best.hp = Math.min(best.maxHp, best.hp + best.maxHp * 0.25); best.hitFlash = 0.2; e.snkCd = 2.5; }
    else e.snkCd = 0.8;
  }
};

ENEMY_BEHAVIOR_HANDLERS.snk2Currentweaver = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.snkWeave === undefined) e.snkWeave = Util.rand(0, Math.PI * 2);
  e.snkWeave += dt * 3;
  const v = seekVector(e, player.x, player.y);
  const perp = Math.atan2(v.y, v.x) + Math.PI / 2;
  sunkStep(game, e, dt, v.x + Math.cos(perp) * Math.sin(e.snkWeave) * 1.2, v.y + Math.sin(perp) * Math.sin(e.snkWeave) * 1.2, 1);
  e.shielded = Math.sin(e.snkWeave) > 0.6;
  if (!e.shielded && v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
};

ENEMY_BEHAVIOR_HANDLERS.snk2Polypbloater = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  sunkStep(game, e, dt, v.x, v.y, 0.7);
  if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
  if (e.hp <= 0 && !e.snkSplit) {
    e.snkSplit = true;
    for (let i = 0; i < 2; i++) {
      const ang = Util.rand(0, Math.PI * 2);
      sunkSpawn(game, game.currentRoom, 'reefstalker', e.x + Math.cos(ang) * 24, e.y + Math.sin(ang) * 24);
    }
  }
};

ENEMY_BEHAVIOR_HANDLERS.snk2Kelplurker = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  e.snkCloak = (e.snkCloak === undefined) ? true : e.snkCloak;
  if (e.snkCloak) {
    e.alpha = 0.35;
    sunkStep(game, e, dt, v.x, v.y, 0.65);
    if (v.d < 80) { e.snkCloak = false; e.snkDash = 0.4; e.snkDX = v.x; e.snkDY = v.y; }
  } else if (e.snkDash > 0) {
    e.alpha = 1;
    e.snkDash -= dt;
    sunkStep(game, e, dt, e.snkDX, e.snkDY, 4.5);
    if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg + 1), t.id);
    if (e.snkDash <= 0) e.snkCloak = true;
  }
};

ENEMY_BEHAVIOR_HANDLERS.snk2Lagoonmarksman = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 220) sunkStep(game, e, dt, -v.x, -v.y, 0.5);
  e.snkCharge = e.snkCharge || 0;
  e.snkCd = (e.snkCd === undefined) ? 1.5 : e.snkCd - dt;
  if (e.snkCd <= 0 && e.snkCharge === 0) e.snkCharge = 0.8;
  if (e.snkCharge > 0) {
    e.snkCharge -= dt; e.hitFlash = 0.05;
    if (e.snkCharge <= 0) { fireProjectileAngle(game, e, sunkAim(e, player), 340, e.dmg + 2, { pierce: 3, color: '#5ad0b4' }); e.snkCd = 2.2; }
  }
};

ENEMY_BEHAVIOR_HANDLERS.snk2Anemonewarden = function(game, e, dt){
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

ENEMY_BEHAVIOR_HANDLERS.snk2Reefblinker = function(game, e, dt){
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
  if (v.d < 200) fireProjectileAngle(game, e, sunkAim(e, player), 200, e.dmg, { color: '#3ec0a0' });
};

ENEMY_BEHAVIOR_HANDLERS.snk2Spawnmites = function(game, e, dt){
  const player = game.player, t = e.type;
  const node = game.currentRoom;
  let cx = 0, cy = 0, n = 0;
  for (const en of node.enemies) { if (en !== e && en.type && en.type.id === 'spawnmites') { cx += en.x; cy += en.y; n++; } }
  const v = seekVector(e, player.x, player.y);
  if (n > 0) {
    cx /= n; cy /= n;
    const cohesion = Util.dist(e.x, e.y, cx, cy) > 40 ? { x: cx - e.x, y: cy - e.y } : { x: 0, y: 0 };
    sunkStep(game, e, dt, v.x + cohesion.x * 0.02, v.y + cohesion.y * 0.02, 1.1);
  } else sunkStep(game, e, dt, v.x, v.y, 1.1);
  if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
};

ENEMY_BEHAVIOR_HANDLERS.snk2Coralspire = function(game, e, dt){
  const player = game.player, t = e.type;
  e.snkShot = (e.snkShot === undefined) ? Util.rand(0.5, 1.2) : e.snkShot - dt;
  if (e.snkShot <= 0) {
    e.snkStage = (e.snkStage || 0) + 1;
    sunkArc(game, e, sunkAim(e, player), Math.min(e.snkStage, 6), Math.PI / 3 + Math.min(e.snkStage, 6) * 0.08, 200, { color: '#88e0c0' });
    if (e.snkStage >= 6) e.snkStage = 0;
    e.snkShot = 1.2; e.hitFlash = 0.1;
  }
};

ENEMY_BEHAVIOR_HANDLERS.snk2Surgecharger = function(game, e, dt){
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

ENEMY_BEHAVIOR_HANDLERS.snk2Tidepoolmortar = function(game, e, dt){
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

ENEMY_BEHAVIOR_HANDLERS.snk2Siltdelver = function(game, e, dt){
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

ENEMY_BEHAVIOR_HANDLERS.snk2Nautilusdrifter = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.snkAng === undefined) e.snkAng = Util.rand(0, Math.PI * 2);
  e.snkAng += dt * 1.1;
  const r = 130;
  const tx = player.x + Math.cos(e.snkAng) * r, ty = player.y + Math.sin(e.snkAng) * r;
  sunkStep(game, e, dt, tx - e.x, ty - e.y, 1);
  e.snkShot = (e.snkShot === undefined) ? 1 : e.snkShot - dt;
  if (e.snkShot <= 0) { fireProjectileAngle(game, e, sunkAim(e, player), 210, e.dmg, { color: '#a8e8d0' }); e.snkShot = 1.3; }
};

ENEMY_BEHAVIOR_HANDLERS.snk2Anglerlantern = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 220) sunkStep(game, e, dt, -v.x, -v.y, 0.5);
  e.snkCharge = e.snkCharge || 0;
  e.snkCd = (e.snkCd === undefined) ? 1.7 : e.snkCd - dt;
  if (e.snkCd <= 0 && e.snkCharge === 0) e.snkCharge = 0.7;
  if (e.snkCharge > 0) {
    e.snkCharge -= dt; e.hitFlash = 0.05;
    if (e.snkCharge <= 0) { fireProjectileAngle(game, e, sunkAim(e, player), 320, e.dmg + 2, { pierce: 3, color: '#f0e090' }); e.snkCd = 2.4; }
  }
};

ENEMY_BEHAVIOR_HANDLERS.snk2Kelpweaver = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.snkWeave === undefined) e.snkWeave = Util.rand(0, Math.PI * 2);
  e.snkWeave += dt * 3;
  const v = seekVector(e, player.x, player.y);
  const perp = Math.atan2(v.y, v.x) + Math.PI / 2;
  sunkStep(game, e, dt, v.x + Math.cos(perp) * Math.sin(e.snkWeave) * 1.2, v.y + Math.sin(perp) * Math.sin(e.snkWeave) * 1.2, 1);
  e.shielded = Math.sin(e.snkWeave) > 0.6;
  if (!e.shielded && v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
};

ENEMY_BEHAVIOR_HANDLERS.snk2Pearlwarden = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  sunkStep(game, e, dt, v.x, v.y, 0.6);
  e.snkCd = (e.snkCd === undefined) ? 3.4 : e.snkCd - dt;
  if (e.snkCd <= 0) {
    e.snkCd = 4.4; e.hitFlash = 0.15;
    for (const en of game.currentRoom.enemies) if (Util.dist(e.x, e.y, en.x, en.y) < 120) en.shielded = true;
    e.snkGrantT = 2.6;
  }
  if (e.snkGrantT > 0) { e.snkGrantT -= dt; if (e.snkGrantT <= 0) for (const en of game.currentRoom.enemies) en.shielded = false; }
  if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
};
