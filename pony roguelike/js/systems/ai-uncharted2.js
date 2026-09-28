'use strict';

ENEMY_BEHAVIOR_HANDLERS.uch2Junglestalker = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  e.uchCloak = (e.uchCloak === undefined) ? true : e.uchCloak;
  if (e.uchCloak) {
    e.alpha = 0.4;
    uchStep(game, e, dt, v.x, v.y, 0.7);
    if (v.d < 90) { e.uchCloak = false; e.uchDash = 0.5; e.uchDX = v.x; e.uchDY = v.y; }
  } else if (e.uchDash > 0) {
    e.alpha = 1;
    e.uchDash -= dt;
    uchStep(game, e, dt, e.uchDX, e.uchDY, 4);
    if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg + 1), t.id);
    if (e.uchDash <= 0) e.uchCloak = true;
  }
};

ENEMY_BEHAVIOR_HANDLERS.uch2Canopybeast = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  const enraged = e.hp < e.maxHp * 0.5;
  uchStep(game, e, dt, v.x, v.y, enraged ? 1.5 : 0.9);
  if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg + (enraged ? 1 : 0)), t.id);
};

ENEMY_BEHAVIOR_HANDLERS.uch2Pollenflyer = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.uchDrift === undefined) e.uchDrift = Util.rand(0, Math.PI * 2);
  e.uchDrift += dt * 1.4;
  const v = seekVector(e, player.x, player.y);
  const perp = Math.atan2(v.y, v.x) + Math.PI / 2;
  uchStep(game, e, dt, v.x + Math.cos(perp) * 0.6 * Math.sin(e.uchDrift), v.y + Math.sin(perp) * 0.6 * Math.sin(e.uchDrift), 1);
  if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
};

ENEMY_BEHAVIOR_HANDLERS.uch2Sporeburster = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (e.uchFuse > 0) {
    e.uchFuse -= dt; e.hitFlash = 0.1;
    if (e.uchFuse <= 0) {
      game.explosions.push(new Explosion(e.x, e.y, 60));
      if (Util.dist(e.x, e.y, player.x, player.y) < 60 + player.radius) damagePlayer(game, playerDamageAmount(game, false, e.dmg + 1), t.id);
      e.hp = 0;
    }
    return;
  }
  uchStep(game, e, dt, v.x, v.y, 1.1);
  if (v.d < 50) e.uchFuse = 0.6;
};

ENEMY_BEHAVIOR_HANDLERS.uch2Vineguard = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  uchStep(game, e, dt, v.x, v.y, 0.6);
  e.uchCycle = (e.uchCycle === undefined) ? 0 : e.uchCycle + dt;
  e.shielded = Math.sin(e.uchCycle * 1.2) > -0.3;
  if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
};

ENEMY_BEHAVIOR_HANDLERS.uch2Tuskcharger = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.uchState === undefined) { e.uchState = 'seek'; e.uchCd = 0; }
  const v = seekVector(e, player.x, player.y);
  if (e.uchState === 'telegraph') {
    e.uchTimer -= dt; e.hitFlash = 0.08;
    if (e.uchTimer <= 0) { e.uchState = 'charge'; e.uchDX = v.x; e.uchDY = v.y; }
    return;
  }
  if (e.uchState === 'charge') {
    const r = uchStep(game, e, dt, e.uchDX, e.uchDY, 6.5);
    if (Util.dist(e.x, e.y, player.x, player.y) < e.radius + player.radius) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
    if (!r.movedX && !r.movedY) { e.uchState = 'seek'; e.uchCd = 2.2; }
    return;
  }
  uchStep(game, e, dt, v.x, v.y, 0.8);
  e.uchCd -= dt;
  if (e.uchCd <= 0 && v.d < 260) { e.uchState = 'telegraph'; e.uchTimer = 0.5; }
};

ENEMY_BEHAVIOR_HANDLERS.uch2Totemturret = function(game, e, dt){
  const player = game.player, t = e.type;
  e.uchShot = (e.uchShot === undefined) ? Util.rand(0.6, 1.4) : e.uchShot - dt;
  if (e.uchShot <= 0) {
    e.uchBurst = (e.uchBurst || 0) + 1;
    const wide = e.uchBurst % 3 === 0;
    uchArc(game, e, uchAim(e, player), wide ? 5 : 1, wide ? Math.PI / 2 : 0, 210, { color: '#a8d868' });
    e.uchShot = 1.4;
    e.hitFlash = 0.1;
  }
};

ENEMY_BEHAVIOR_HANDLERS.uch2Foliagepouncer = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (e.uchLeap > 0) {
    e.uchLeap -= dt;
    uchStep(game, e, dt, e.uchLDX, e.uchLDY, 5);
    if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg + 1), t.id);
    if (e.uchLeap <= 0) e.uchCd = 1.6;
    return;
  }
  uchStep(game, e, dt, v.x, v.y, 0.75);
  e.uchCd = (e.uchCd === undefined) ? 0 : e.uchCd - dt;
  if (e.uchCd <= 0 && v.d < 180) { e.uchLeap = 0.4; e.uchLDX = v.x; e.uchLDY = v.y; }
};

ENEMY_BEHAVIOR_HANDLERS.uch2Thornarcher = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 160) uchStep(game, e, dt, -v.x, -v.y, 0.7);
  else if (v.d > 260) uchStep(game, e, dt, v.x, v.y, 0.7);
  e.uchShot = (e.uchShot === undefined) ? 1 : e.uchShot - dt;
  if (e.uchShot <= 0) { fireProjectileAngle(game, e, uchAim(e, player), 260, e.dmg, { color: '#9ad868' }); e.uchShot = 1.1; }
};

ENEMY_BEHAVIOR_HANDLERS.uch2Mistcaller = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 200) uchStep(game, e, dt, -v.x, -v.y, 0.6);
  e.uchShot = (e.uchShot === undefined) ? 1.4 : e.uchShot - dt;
  if (e.uchShot <= 0) {
    fireProjectileAngle(game, e, uchAim(e, player) + Util.rand(-0.15, 0.15), 200, e.dmg, { color: '#cfe8b0' });
    for (const en of game.currentRoom.enemies) {
      if (en !== e && en.type && en.type.floorKey === '10B' && en.uchShot !== undefined && Util.dist(e.x, e.y, en.x, en.y) < 200) en.uchShot = Math.min(en.uchShot, 0.15);
    }
    e.uchShot = 1.5;
  }
};

ENEMY_BEHAVIOR_HANDLERS.uch2Canopywarden = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  uchStep(game, e, dt, v.x, v.y, 0.6);
  e.uchCd = (e.uchCd === undefined) ? 3 : e.uchCd - dt;
  if (e.uchCd <= 0) {
    e.uchCd = 4; e.hitFlash = 0.15;
    for (const en of game.currentRoom.enemies) if (Util.dist(e.x, e.y, en.x, en.y) < 130) en.shielded = true;
    e.uchGrantT = 3;
  }
  if (e.uchGrantT > 0) { e.uchGrantT -= dt; if (e.uchGrantT <= 0) for (const en of game.currentRoom.enemies) en.shielded = false; }
  if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
};

ENEMY_BEHAVIOR_HANDLERS.uch2Gourdmortar = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 220) uchStep(game, e, dt, -v.x, -v.y, 0.5);
  e.uchCd = (e.uchCd === undefined) ? 1.8 : e.uchCd - dt;
  if (e.uchCd <= 0) { e.uchLobX = player.x; e.uchLobY = player.y; e.uchLobT = 0.9; e.uchCd = 2.2; e.hitFlash = 0.1; }
  if (e.uchLobT > 0) {
    e.uchLobT -= dt;
    if (e.uchLobT <= 0) {
      game.explosions.push(new Explosion(e.uchLobX, e.uchLobY, 55));
      if (Util.dist(e.uchLobX, e.uchLobY, player.x, player.y) < 55 + player.radius) damagePlayer(game, playerDamageAmount(game, false, e.dmg + 1), t.id);
    }
  }
};

ENEMY_BEHAVIOR_HANDLERS.uch2Hummerwing = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.uchAng === undefined) e.uchAng = Util.rand(0, Math.PI * 2);
  e.uchAng += dt * 1.4;
  const r = 120;
  const tx = player.x + Math.cos(e.uchAng) * r, ty = player.y + Math.sin(e.uchAng) * r;
  uchStep(game, e, dt, tx - e.x, ty - e.y, 1.1);
  const v = seekVector(e, player.x, player.y);
  if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
};

ENEMY_BEHAVIOR_HANDLERS.uch2Rootdelver = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.uchBurrow === undefined) { e.uchBurrow = 0; e.uchCd = Util.rand(0.5, 1.5); }
  if (e.uchBurrow > 0) {
    e.uchBurrow -= dt; e.submerged = true; e.shielded = true;
    if (e.uchBurrow <= 0) {
      e.submerged = false; e.shielded = false;
      const spot = findNearestFloor(game.currentRoom, Math.floor(player.x / TILE), Math.floor(player.y / TILE));
      e.x = spot.x; e.y = spot.y;
      if (Util.dist(e.x, e.y, player.x, player.y) < e.radius + player.radius + 20) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
      e.uchCd = 2.4; e.hitFlash = 0.15;
    }
    return;
  }
  e.uchCd -= dt;
  if (e.uchCd <= 0) e.uchBurrow = 1;
};

ENEMY_BEHAVIOR_HANDLERS.uch2Hivecaller = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 200) uchStep(game, e, dt, -v.x, -v.y, 0.6);
  if (e.uchSpawned === undefined) e.uchSpawned = 0;
  e.uchCd = (e.uchCd === undefined) ? Util.rand(2, 3) : e.uchCd - dt;
  if (e.uchCd <= 0 && e.uchSpawned < 3) {
    const ang = Util.rand(0, Math.PI * 2);
    uchSpawn(game, game.currentRoom, 'midgecloud', e.x + Math.cos(ang) * 70, e.y + Math.sin(ang) * 70);
    e.uchSpawned++; e.uchCd = Util.rand(3.5, 5);
    e.hitFlash = 0.15;
  }
};

ENEMY_BEHAVIOR_HANDLERS.uch2Sapmender = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 150) uchStep(game, e, dt, -v.x, -v.y, 0.55);
  e.uchCd = (e.uchCd === undefined) ? 2 : e.uchCd - dt;
  if (e.uchCd <= 0) {
    let best = null, bd = 200;
    for (const en of game.currentRoom.enemies) {
      if (en === e || !en.type || en.type.floorKey !== '10B' || en.hp >= en.maxHp) continue;
      const d = Util.dist(e.x, e.y, en.x, en.y);
      if (d < bd) { bd = d; best = en; }
    }
    if (best) { best.hp = Math.min(best.maxHp, best.hp + best.maxHp * 0.25); best.hitFlash = 0.2; e.uchCd = 2.5; }
    else e.uchCd = 0.8;
  }
};

ENEMY_BEHAVIOR_HANDLERS.uch2Mistblinker = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  e.uchCd = (e.uchCd === undefined) ? Util.rand(1.5, 2.5) : e.uchCd - dt;
  if (e.uchCd <= 0) {
    const ang = Util.rand(0, Math.PI * 2);
    e.x = player.x + Math.cos(ang) * 120;
    e.y = player.y + Math.sin(ang) * 120;
    e.uchCd = Util.rand(2, 3);
    e.hitFlash = 0.15;
  }
  if (v.d < 200) fireProjectileAngle(game, e, uchAim(e, player), 200, e.dmg, { color: '#c8f0a8' });
};

ENEMY_BEHAVIOR_HANDLERS.uch2Vineweaver = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.uchWeave === undefined) e.uchWeave = Util.rand(0, Math.PI * 2);
  e.uchWeave += dt * 3;
  const v = seekVector(e, player.x, player.y);
  const perp = Math.atan2(v.y, v.x) + Math.PI / 2;
  uchStep(game, e, dt, v.x + Math.cos(perp) * Math.sin(e.uchWeave) * 1.2, v.y + Math.sin(perp) * Math.sin(e.uchWeave) * 1.2, 1);
  e.shielded = Math.sin(e.uchWeave) > 0.6;
  if (!e.shielded && v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
};

ENEMY_BEHAVIOR_HANDLERS.uch2Idolsentry = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  e.uchLock = (e.uchLock === undefined) ? 0 : e.uchLock;
  if (v.d < 260) {
    e.uchLock += dt;
    if (e.uchLock >= 1.2) { fireProjectileAngle(game, e, uchAim(e, player), 250, e.dmg + 1, { pierce: 2, color: '#7a9c4a' }); e.uchLock = 0; e.hitFlash = 0.1; }
  } else e.uchLock = 0;
};

ENEMY_BEHAVIOR_HANDLERS.uch2Midgecloud = function(game, e, dt){
  const player = game.player, t = e.type;
  const node = game.currentRoom;
  let cx = 0, cy = 0, n = 0;
  for (const en of node.enemies) { if (en !== e && en.type && en.type.id === 'midgecloud') { cx += en.x; cy += en.y; n++; } }
  const v = seekVector(e, player.x, player.y);
  if (n > 0) {
    cx /= n; cy /= n;
    const cohesion = Util.dist(e.x, e.y, cx, cy) > 40 ? { x: cx - e.x, y: cy - e.y } : { x: 0, y: 0 };
    uchStep(game, e, dt, v.x + cohesion.x * 0.02, v.y + cohesion.y * 0.02, 1.1);
  } else uchStep(game, e, dt, v.x, v.y, 1.1);
  if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
};

ENEMY_BEHAVIOR_HANDLERS.uch2Venomcreeper = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.uchVenom === undefined) e.uchVenom = 0;
  const v = seekVector(e, player.x, player.y);
  uchStep(game, e, dt, v.x, v.y, 1);
  if (v.d < e.radius + player.radius + 4) {
    e.uchVenom -= dt;
    if (e.uchVenom <= 0) { damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id); e.uchVenom = 0.35; }
  } else e.uchVenom = 0;
};

ENEMY_BEHAVIOR_HANDLERS.uch2Fruitbloater = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  uchStep(game, e, dt, v.x, v.y, 0.7);
  if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
  if (e.hp <= 0 && !e.uchSplit) {
    e.uchSplit = true;
    for (let i = 0; i < 2; i++) {
      const ang = Util.rand(0, Math.PI * 2);
      uchSpawn(game, game.currentRoom, 'junglestalker', e.x + Math.cos(ang) * 24, e.y + Math.sin(ang) * 24);
    }
  }
};

ENEMY_BEHAVIOR_HANDLERS.uch2Bogmarksman = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 220) uchStep(game, e, dt, -v.x, -v.y, 0.5);
  e.uchCharge = e.uchCharge || 0;
  e.uchCd = (e.uchCd === undefined) ? 1.5 : e.uchCd - dt;
  if (e.uchCd <= 0 && e.uchCharge === 0) e.uchCharge = 0.8;
  if (e.uchCharge > 0) {
    e.uchCharge -= dt; e.hitFlash = 0.05;
    if (e.uchCharge <= 0) { fireProjectileAngle(game, e, uchAim(e, player), 340, e.dmg + 2, { pierce: 3, color: '#8ac05a' }); e.uchCd = 2.2; }
  }
};

ENEMY_BEHAVIOR_HANDLERS.uch2Thicketlurker = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  e.uchCloak = (e.uchCloak === undefined) ? true : e.uchCloak;
  if (e.uchCloak) {
    e.alpha = 0.35;
    uchStep(game, e, dt, v.x, v.y, 0.65);
    if (v.d < 80) { e.uchCloak = false; e.uchDash = 0.4; e.uchDX = v.x; e.uchDY = v.y; }
  } else if (e.uchDash > 0) {
    e.alpha = 1;
    e.uchDash -= dt;
    uchStep(game, e, dt, e.uchDX, e.uchDY, 4.5);
    if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg + 1), t.id);
    if (e.uchDash <= 0) e.uchCloak = true;
  }
};

ENEMY_BEHAVIOR_HANDLERS.uch2Canopydrone = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  uchStep(game, e, dt, v.x, v.y, 1.2);
  e.uchFuse = (e.uchFuse === undefined) ? -1 : e.uchFuse;
  if (e.uchFuse < 0 && v.d < 60) e.uchFuse = 0.5;
  if (e.uchFuse >= 0) {
    e.uchFuse -= dt; e.hitFlash = 0.1;
    if (e.uchFuse <= 0) {
      game.explosions.push(new Explosion(e.x, e.y, 50));
      if (Util.dist(e.x, e.y, player.x, player.y) < 50 + player.radius) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
      e.hp = 0;
    }
  }
};

ENEMY_BEHAVIOR_HANDLERS.uch2Frondchanter = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 200) uchStep(game, e, dt, -v.x, -v.y, 0.55);
  e.uchShot = (e.uchShot === undefined) ? 1 : e.uchShot - dt;
  if (e.uchShot <= 0) {
    fireProjectileAngle(game, e, uchAim(e, player), 220, e.dmg, { color: '#a8d878' });
    fireProjectileAngle(game, e, uchAim(e, player) + 0.3, 220, e.dmg, { color: '#a8d878' });
    e.uchShot = 1.3;
  }
};

ENEMY_BEHAVIOR_HANDLERS.uch2Rotbloater = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  uchStep(game, e, dt, v.x, v.y, 0.85);
  if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
  if (e.hp <= 0 && !e.uchSplit) {
    e.uchSplit = true;
    uchSpawn(game, game.currentRoom, 'junglestalker', e.x + 20, e.y);
    uchSpawn(game, game.currentRoom, 'junglestalker', e.x - 20, e.y);
  }
};

ENEMY_BEHAVIOR_HANDLERS.uch2Blightmarksman = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 220) uchStep(game, e, dt, -v.x, -v.y, 0.5);
  e.uchCharge = e.uchCharge || 0;
  e.uchCd = (e.uchCd === undefined) ? 1.7 : e.uchCd - dt;
  if (e.uchCd <= 0 && e.uchCharge === 0) e.uchCharge = 0.7;
  if (e.uchCharge > 0) {
    e.uchCharge -= dt; e.hitFlash = 0.05;
    if (e.uchCharge <= 0) { fireProjectileAngle(game, e, uchAim(e, player), 320, e.dmg + 2, { pierce: 3, color: '#6a8c3a' }); e.uchCd = 2.4; }
  }
};

ENEMY_BEHAVIOR_HANDLERS.uch2Tanglespire = function(game, e, dt){
  const player = game.player, t = e.type;
  e.uchShot = (e.uchShot === undefined) ? Util.rand(0.5, 1.2) : e.uchShot - dt;
  if (e.uchShot <= 0) {
    e.uchStage = (e.uchStage || 0) + 1;
    uchArc(game, e, uchAim(e, player), Math.min(e.uchStage, 6), Math.PI / 3 + Math.min(e.uchStage, 6) * 0.08, 200, { color: '#bcd888' });
    if (e.uchStage >= 6) e.uchStage = 0;
    e.uchShot = 1.2; e.hitFlash = 0.1;
  }
};

ENEMY_BEHAVIOR_HANDLERS.uch2Orchidmender = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 150) uchStep(game, e, dt, -v.x, -v.y, 0.5);
  e.uchCd = (e.uchCd === undefined) ? 2 : e.uchCd - dt;
  if (e.uchCd <= 0) {
    let best = null, bd = 220;
    for (const en of game.currentRoom.enemies) {
      if (en === e || !en.type || en.type.floorKey !== '10B' || en.hp >= en.maxHp) continue;
      const d = Util.dist(e.x, e.y, en.x, en.y);
      if (d < bd) { bd = d; best = en; }
    }
    if (best) { best.hp = Math.min(best.maxHp, best.hp + best.maxHp * 0.3); best.hitFlash = 0.2; e.uchCd = 2.8; }
    else e.uchCd = 0.8;
  }
};

ENEMY_BEHAVIOR_HANDLERS.uch2Mireshrieker = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.uchState === undefined) { e.uchState = 'seek'; e.uchCd = Util.rand(1, 2); e.uchBuffed = []; }
  const v = seekVector(e, player.x, player.y);
  for (let i = e.uchBuffed.length - 1; i >= 0; i--) {
    const b = e.uchBuffed[i];
    b.t -= dt;
    if (b.t <= 0 || b.en.hp <= 0) { if (b.en.hp > 0) b.en.speed = b.base; e.uchBuffed.splice(i, 1); }
  }
  e.uchCd -= dt;
  if (e.uchCd <= 0 && v.d < 220 && e.uchState === 'seek') {
    e.uchState = 'shriek'; e.uchTimer = 0.4;
    for (const en of game.currentRoom.enemies) {
      if (en !== e && en.type && en.type.floorKey === '10B' && Util.dist(e.x, e.y, en.x, en.y) < 160) {
        const base = en.speed;
        en.speed = base * 1.5;
        e.uchBuffed.push({ en, base, t: 3 });
      }
    }
  }
  if (e.uchState === 'shriek') {
    e.uchTimer -= dt; e.hitFlash = 0.15;
    if (e.uchTimer <= 0) { e.uchState = 'seek'; e.uchCd = 4; }
    return;
  }
  uchStep(game, e, dt, v.x, v.y, 0.8);
  if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
};

ENEMY_BEHAVIOR_HANDLERS.uch2Orchidlurker = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  e.uchCloak = (e.uchCloak === undefined) ? true : e.uchCloak;
  if (e.uchCloak) {
    e.alpha = 0.35;
    uchStep(game, e, dt, v.x, v.y, 0.6);
    if (v.d < 85) { e.uchCloak = false; e.uchDash = 0.45; e.uchDX = v.x; e.uchDY = v.y; }
  } else if (e.uchDash > 0) {
    e.alpha = 1;
    e.uchDash -= dt;
    uchStep(game, e, dt, e.uchDX, e.uchDY, 4.2);
    if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg + 1), t.id);
    if (e.uchDash <= 0) e.uchCloak = true;
  }
};

ENEMY_BEHAVIOR_HANDLERS.uch2Plumescreamer = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.uchDrift === undefined) e.uchDrift = Util.rand(0, Math.PI * 2);
  e.uchDrift += dt * 2;
  const v = seekVector(e, player.x, player.y);
  const perp = Math.atan2(v.y, v.x) + Math.PI / 2;
  uchStep(game, e, dt, v.x + Math.cos(perp) * 0.8 * Math.sin(e.uchDrift), v.y + Math.sin(perp) * 0.8 * Math.sin(e.uchDrift), 1.2);
  if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
};

ENEMY_BEHAVIOR_HANDLERS.uch2Vinemender = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 150) uchStep(game, e, dt, -v.x, -v.y, 0.55);
  e.uchCd = (e.uchCd === undefined) ? 2.2 : e.uchCd - dt;
  if (e.uchCd <= 0) {
    let best = null, bd = 210;
    for (const en of game.currentRoom.enemies) {
      if (en === e || !en.type || en.type.floorKey !== '10B' || en.hp >= en.maxHp) continue;
      const d = Util.dist(e.x, e.y, en.x, en.y);
      if (d < bd) { bd = d; best = en; }
    }
    if (best) { best.hp = Math.min(best.maxHp, best.hp + best.maxHp * 0.25); best.hitFlash = 0.2; e.uchCd = 2.6; }
    else e.uchCd = 0.8;
  }
};

ENEMY_BEHAVIOR_HANDLERS.uch2Idolcircler = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.uchAng === undefined) e.uchAng = Util.rand(0, Math.PI * 2);
  e.uchAng += dt * 1.1;
  const r = 130;
  const tx = player.x + Math.cos(e.uchAng) * r, ty = player.y + Math.sin(e.uchAng) * r;
  uchStep(game, e, dt, tx - e.x, ty - e.y, 1);
  e.uchShot = (e.uchShot === undefined) ? 1 : e.uchShot - dt;
  if (e.uchShot <= 0) { fireProjectileAngle(game, e, uchAim(e, player), 210, e.dmg, { color: '#7ab84a' }); e.uchShot = 1.3; }
};
