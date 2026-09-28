'use strict';

ENEMY_BEHAVIOR_HANDLERS.reck2Frostbiter = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.reckRime === undefined) e.reckRime = 0;
  const v = seekVector(e, player.x, player.y);
  reckStep(game, e, dt, v.x, v.y, 1);
  if (v.d < e.radius + player.radius + 4) {
    e.reckRime += dt;
    if (e.reckRime > 0.4) { player.freezeTimer = Math.max(player.freezeTimer, 0.3); e.reckRime = 0; e.hitFlash = 0.1; }
    damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
  }
};

ENEMY_BEHAVIOR_HANDLERS.reck2Masonbrute = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.reckArmor === undefined) e.reckArmor = 1;
  const v = seekVector(e, player.x, player.y);
  reckStep(game, e, dt, v.x, v.y, e.hp < e.maxHp * 0.5 ? 1.4 : 1);
  if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
};

ENEMY_BEHAVIOR_HANDLERS.reck2Gustwing = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.reckGust === undefined) e.reckGust = RNG.random() * Math.PI * 2;
  e.reckGust += dt * 2.4;
  const v = seekVector(e, player.x, player.y);
  reckStep(game, e, dt, v.x + Math.cos(e.reckGust) * 0.5, v.y + Math.sin(e.reckGust) * 0.5, 1);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && v.d < 320) {
    e.fireTimer = t.fireCooldown || 1.7;
    fireProjectileAngle(game, e, reckAim(e, player), t.boltSpeed || 200, e.dmg, { color: t.boltColor || '#cfe8f7', radius: 4 });
  }
};

ENEMY_BEHAVIOR_HANDLERS.reck2Icebomber = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (e.reckFuse === undefined) e.reckFuse = 0;
  if (e.reckFuse > 0 || v.d < 60) {
    e.reckFuse += dt;
    e.hitFlash = Math.sin(e.reckFuse * 20) > 0 ? 0.2 : 0;
    if (e.reckFuse >= (t.fuseTime || 0.9)) {
      const r = t.blastRadius || 78;
      game.explosions.push(new Explosion(e.x, e.y, r));
      if (Util.dist(e.x, e.y, player.x, player.y) < r + player.radius) { damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id); player.freezeTimer = Math.max(player.freezeTimer, 0.5); }
      e.hp = 0;
    }
    return;
  }
  reckStep(game, e, dt, v.x, v.y, 1);
};

ENEMY_BEHAVIOR_HANDLERS.reck2Brickguard = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.reckPhase === undefined) { e.reckPhase = 0; e.reckTimer = t.shieldTime || 2.2; }
  const v = seekVector(e, player.x, player.y);
  reckStep(game, e, dt, v.x, v.y, e.reckPhase === 0 ? 0.5 : 1.1);
  e.shielded = e.reckPhase === 0;
  e.reckTimer -= dt;
  if (e.reckTimer <= 0) {
    e.reckPhase = 1 - e.reckPhase;
    e.reckTimer = e.reckPhase === 0 ? (t.shieldTime || 2.2) : (t.vulnTime || 1.8);
    e.hitFlash = 0.1;
  }
  if (v.d < 30) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
};

ENEMY_BEHAVIOR_HANDLERS.reck2Palisadecharger = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.reckState === undefined) { e.reckState = 'seek'; e.reckCd = 0; }
  const v = seekVector(e, player.x, player.y);
  if (e.reckState === 'telegraph') {
    e.reckTimer -= dt;
    e.hitFlash = 0.08;
    if (e.reckTimer <= 0) { e.reckState = 'charge'; e.reckTimer = 0.5; e.reckDX = v.x; e.reckDY = v.y; }
    return;
  }
  if (e.reckState === 'charge') {
    e.reckTimer -= dt;
    const r = reckStep(game, e, dt, e.reckDX, e.reckDY, t.chargeSpeed || 6.4);
    if (Util.dist(e.x, e.y, player.x, player.y) < e.radius + player.radius) damagePlayer(game, playerDamageAmount(game, false, e.dmg + 1), t.id);
    if ((!r.movedX && !r.movedY) || e.reckTimer <= 0) {
      if (!r.movedX && !r.movedY) { game.explosions.push(new Explosion(e.x, e.y, 40)); e.hp -= 1; }
      e.reckState = 'seek'; e.reckCd = 1.4;
    }
    return;
  }
  reckStep(game, e, dt, v.x, v.y, 1);
  e.reckCd -= dt;
  if (e.reckCd <= 0 && v.d < 260) { e.reckState = 'telegraph'; e.reckTimer = t.telegraphTime || 0.55; e.reckCd = t.chargeCooldown || 2; }
};

ENEMY_BEHAVIOR_HANDLERS.reck2Sentrytower = function(game, e, dt){
  const player = game.player, t = e.type;
  e.fireTimer -= dt;
  const v = seekVector(e, player.x, player.y);
  if (e.fireTimer <= 0 && v.d < 400) {
    e.fireTimer = t.fireCooldown || 1.6;
    e.reckBurst = (e.reckBurst || 0) + 1;
    if (e.reckBurst % 3 === 0) reckArc(game, e, reckAim(e, player), 3, 0.3, t.boltSpeed || 205, { color: t.boltColor || '#8a6a5a', radius: 4 });
    else fireProjectileAngle(game, e, reckAim(e, player), t.boltSpeed || 205, e.dmg, { color: t.boltColor || '#8a6a5a', radius: 4 });
    e.hitFlash = 0.08;
  }
};

ENEMY_BEHAVIOR_HANDLERS.reck2Frostleaper = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.reckLeap === undefined) { e.reckLeap = 0; e.reckCd = 0; }
  const v = seekVector(e, player.x, player.y);
  if (e.reckLeap > 0) {
    e.reckLeap -= dt;
    reckStep(game, e, dt, e.reckLX, e.reckLY, t.leapSpeed || 5.2);
    if (e.reckLeap <= 0) {
      e.reckCd = t.leapCooldown || 1.4;
      if (Util.dist(e.x, e.y, player.x, player.y) < 40) player.freezeTimer = Math.max(player.freezeTimer, 0.25);
    }
    return;
  }
  reckStep(game, e, dt, v.x, v.y, 1);
  e.reckCd -= dt;
  if (e.reckCd <= 0 && v.d < 200 && v.d > 50) { e.reckLeap = t.telegraphTime || 0.35; e.reckLX = v.x; e.reckLY = v.y; e.hitFlash = 0.1; }
};

ENEMY_BEHAVIOR_HANDLERS.reck2Chillarcher = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  const keep = t.keepDistance || 210;
  if (v.d < keep - 20) reckStep(game, e, dt, -v.x, -v.y, 1);
  else if (v.d > keep + 20) reckStep(game, e, dt, v.x, v.y, 1);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && v.d < keep + 140) {
    e.fireTimer = t.fireCooldown || 1.4;
    fireProjectileAngle(game, e, reckAim(e, player), t.boltSpeed || 220, e.dmg, { color: t.boltColor || '#cfe8f7', radius: 4 });
  }
};

ENEMY_BEHAVIOR_HANDLERS.reck2Gustwhisper = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  const keep = t.keepDistance || 175;
  if (v.d < keep) reckStep(game, e, dt, -v.x, -v.y, 1);
  else reckStep(game, e, dt, v.x, v.y, 0.7);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && v.d < keep + 160) {
    e.fireTimer = t.fireCooldown || 1.5;
    const ang = reckAim(e, player);
    fireProjectileAngle(game, e, ang + 0.25, t.boltSpeed || 215, e.dmg, { color: t.boltColor || '#eef0ea', radius: 4 });
    fireProjectileAngle(game, e, ang - 0.25, t.boltSpeed || 215, e.dmg, { color: t.boltColor || '#eef0ea', radius: 4 });
  }
};

ENEMY_BEHAVIOR_HANDLERS.reck2Masoncaller = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  const keep = t.keepDistance || 190;
  if (v.d < keep) reckStep(game, e, dt, -v.x, -v.y, 0.6);
  else reckStep(game, e, dt, v.x, v.y, 0.6);
  e.reckSummon = (e.reckSummon || 0) - dt;
  e.minionsSpawned = e.minionsSpawned || 0;
  if (e.reckSummon <= 0 && e.minionsSpawned < (t.maxSummons || 6)) {
    for (let i = 0; i < (t.summonCount || 3); i++) {
      const ang = (i / (t.summonCount || 3)) * Math.PI * 2;
      const spawned = reckSpawn(game, game.currentRoom, t.summonId || 'swarmerdnb', e.x + Math.cos(ang) * 50, e.y + Math.sin(ang) * 50);
      if (spawned) e.minionsSpawned++;
    }
    e.reckSummon = t.summonCooldown || 6.5;
    e.hitFlash = 0.12;
  }
};

ENEMY_BEHAVIOR_HANDLERS.reck2Hearthtender = function(game, e, dt){
  const player = game.player, t = e.type;
  let target = null, best = Infinity;
  for (const en of game.currentRoom.enemies) {
    if (en !== e && en.type && en.type.floorKey === '9B' && en.hp < en.maxHp) {
      const d = Util.dist(e.x, e.y, en.x, en.y);
      if (d < best) { best = d; target = en; }
    }
  }
  const v = seekVector(e, player.x, player.y);
  if (target && best < (t.healRadius || 150)) reckStep(game, e, dt, -v.x, -v.y, 0.7);
  else reckStep(game, e, dt, v.x, v.y, 0.5);
  e.reckHeal = (e.reckHeal || 0) - dt;
  if (e.reckHeal <= 0 && target && best < (t.healRadius || 150)) {
    target.hp = Math.min(target.maxHp, target.hp + (t.healAmount || 3));
    target.shielded = true; target.reckShieldT = 0.6;
    e.reckHeal = t.healCooldown || 3;
    e.hitFlash = 0.1;
  }
};

ENEMY_BEHAVIOR_HANDLERS.reck2Frostmarksman = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 260) reckStep(game, e, dt, -v.x, -v.y, 0.9);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && v.d < (t.fireRange || 540)) {
    e.reckAim = (e.reckAim || 0) + dt;
    e.hitFlash = 0.1;
    if (e.reckAim >= (t.telegraphTime || 1.2)) {
      fireProjectileAngle(game, e, reckAim(e, player), t.boltSpeed || 440, e.dmg + 1, { color: t.boltColor || '#dff2ff', radius: 4 });
      e.reckAim = 0; e.fireTimer = t.fireCooldown || 2.6;
    }
  } else e.reckAim = 0;
};

ENEMY_BEHAVIOR_HANDLERS.reck2Flurrymites = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.reckWob === undefined) e.reckWob = RNG.random() * 10;
  e.reckWob += dt * 5;
  const v = seekVector(e, player.x, player.y);
  let cx = 0, cy = 0, n = 0;
  for (const en of game.currentRoom.enemies) {
    if (en !== e && en.type && en.type.behavior === 'reck2Flurrymites' && Util.dist(e.x, e.y, en.x, en.y) < 40) { cx += en.x; cy += en.y; n++; }
  }
  let dx = v.x, dy = v.y;
  if (n > 0) { dx += (e.x - cx / n) * 0.02; dy += (e.y - cy / n) * 0.02; }
  reckStep(game, e, dt, dx + Math.cos(e.reckWob) * (t.driftAmount || 0.6), dy + Math.sin(e.reckWob) * (t.driftAmount || 0.6), 1);
  if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
};

ENEMY_BEHAVIOR_HANDLERS.reck2Rubblelurker = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.reckHidden === undefined) e.reckHidden = true;
  const v = seekVector(e, player.x, player.y);
  if (e.reckDash > 0) {
    e.reckDash -= dt;
    const r = reckStep(game, e, dt, e.reckDX, e.reckDY, t.chargeSpeed || 6.6);
    if (Util.dist(e.x, e.y, player.x, player.y) < e.radius + player.radius) damagePlayer(game, playerDamageAmount(game, false, e.dmg + 1), t.id);
    if ((!r.movedX && !r.movedY) || e.reckDash <= 0) { e.reckDash = 0; e.reckHidden = true; e.reckCd = t.chargeCooldown || 2.3; }
    return;
  }
  e.shielded = e.reckHidden;
  e.alpha = e.reckHidden ? 0.3 : 1;
  if (e.reckHidden) {
    e.reckCd = (e.reckCd || 0) - dt;
    if (v.d < (t.triggerRange || 115) && e.reckCd <= 0) { e.reckHidden = false; e.reckTelegraph = t.telegraphTime || 0.3; e.hitFlash = 0.15; }
    return;
  }
  e.reckTelegraph -= dt;
  if (e.reckTelegraph <= 0) { e.reckDash = t.dashDuration || 0.5; e.reckDX = v.x; e.reckDY = v.y; }
};

ENEMY_BEHAVIOR_HANDLERS.reck2Rimeblinker = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.reckBlink === undefined) e.reckBlink = t.blinkCooldown || 3.3;
  e.reckBlink -= dt;
  const v = seekVector(e, player.x, player.y);
  if (e.reckBlink <= 0 && v.d < (t.blinkRange || 210)) {
    const ang = RNG.random() * Math.PI * 2, dist = Util.rand(90, 150);
    const nx = player.x + Math.cos(ang) * dist, ny = player.y + Math.sin(ang) * dist;
    const spot = findNearestFloor(game.currentRoom, Math.floor(nx / TILE), Math.floor(ny / TILE));
    e.x = spot.x; e.y = spot.y;
    e.reckBlink = t.blinkCooldown || 3.3;
    e.hitFlash = 0.2;
  }
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && v.d < (t.fireRange || 420)) {
    e.fireTimer = t.fireCooldown || 1.4;
    fireProjectileAngle(game, e, reckAim(e, player), t.boltSpeed || 215, e.dmg, { color: t.boltColor || '#eaf6ff', radius: 5 });
  }
};

ENEMY_BEHAVIOR_HANDLERS.reck2Bulwarkwarden = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  const keep = t.keepDistance || 200;
  if (v.d < keep) reckStep(game, e, dt, -v.x, -v.y, 0.7);
  else reckStep(game, e, dt, v.x, v.y, 0.7);
  e.reckGrant = (e.reckGrant || 0) - dt;
  if (e.reckGrant <= 0) {
    e.reckGrant = t.shieldCooldown || 5;
    for (const en of game.currentRoom.enemies) {
      if (en.type && en.type.floorKey === '9B' && Util.dist(e.x, e.y, en.x, en.y) < (t.shieldRadius || 140)) {
        en.shielded = true; en.reckShieldT = t.shieldGrantTime || 2.8;
      }
    }
    e.hitFlash = 0.12;
  }
  if (e.reckShieldT > 0) { e.reckShieldT -= dt; if (e.reckShieldT <= 0) e.shielded = false; }
};

ENEMY_BEHAVIOR_HANDLERS.reck2Kilnmortar = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 150) reckStep(game, e, dt, -v.x, -v.y, 0.6);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && v.d < (t.lobRange || 285)) {
    e.fireTimer = t.fireCooldown || 2.3;
    e.reckLobT = t.lobTime || 1; e.reckLobX = player.x; e.reckLobY = player.y; e.reckLobR = t.burstRadius || 48;
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

ENEMY_BEHAVIOR_HANDLERS.reck2Sleetweaver = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.reckPhase === undefined) e.reckPhase = 0;
  e.reckPhase += dt * (t.weaveFrequency || 3.4);
  const v = seekVector(e, player.x, player.y);
  const perp = Math.sin(e.reckPhase) * (t.weaveAmplitude || 0.7);
  reckStep(game, e, dt, v.x + (-v.y) * perp, v.y + v.x * perp, 1);
  if (v.d < e.radius + player.radius + 4) { damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id); player.freezeTimer = Math.max(player.freezeTimer, 0.15); }
};

ENEMY_BEHAVIOR_HANDLERS.reck2Parapetsentry = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  const moved = reckStep(game, e, dt, v.x, v.y, v.d > (t.fireRange || 440) * 0.7 ? 0.6 : 0);
  const still = !moved.movedX && !moved.movedY;
  e.reckCharge = still ? Math.min(1, (e.reckCharge || 0) + dt * 0.7) : Math.max(0, (e.reckCharge || 0) - dt * 1.5);
  e.hitFlash = e.reckCharge > 0.5 ? 0.1 : 0;
  e.fireTimer -= dt;
  if (e.reckCharge >= 1 && e.fireTimer <= 0 && v.d < (t.fireRange || 440)) {
    e.fireTimer = t.fireCooldown || 1.2;
    fireProjectileAngle(game, e, reckAim(e, player), (t.boltSpeed || 220) * 1.4, e.dmg + 1, { color: t.boltColor || '#cfe8f7', radius: 5 });
    e.reckCharge = 0;
  }
};

ENEMY_BEHAVIOR_HANDLERS.reck2Rimehusk = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  reckStep(game, e, dt, v.x, v.y, 0.85);
  if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
  if (e.hp <= 0 && !e.reckSplit) {
    e.reckSplit = true;
    for (let i = 0; i < 2; i++) {
      const ang = (i / 2) * Math.PI * 2 + RNG.random();
      reckSpawn(game, game.currentRoom, t.splitInto || 'flurrymites', e.x + Math.cos(ang) * 20, e.y + Math.sin(ang) * 20);
    }
  }
};

ENEMY_BEHAVIOR_HANDLERS.reck2Cairncircler = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.reckOrbit === undefined) e.reckOrbit = RNG.random() * Math.PI * 2;
  e.reckOrbit += dt * (t.orbitSpeed || 1.38);
  const r = t.orbitRadius || 132;
  const tx = player.x + Math.cos(e.reckOrbit) * r, ty = player.y + Math.sin(e.reckOrbit) * r;
  reckStep(game, e, dt, tx - e.x, ty - e.y, 1.3);
  const v = seekVector(e, player.x, player.y);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && v.d < (t.fireRange || 385)) {
    e.fireTimer = t.fireCooldown || 1.6;
    reckArc(game, e, reckAim(e, player), t.shotCount || 2, t.spreadAngle || 0.24, t.boltSpeed || 205, { color: t.boltColor || '#eef4fa', radius: 4 });
  }
};

ENEMY_BEHAVIOR_HANDLERS.reck2Quarrydelver = function(game, e, dt){
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
      e.reckCd = t.burrowCooldown || 2.8;
    }
    return;
  }
  reckStep(game, e, dt, v.x, v.y, 1);
  e.reckCd -= dt;
  if (e.reckCd <= 0 && v.d > 100) e.reckBurrow = t.burrowTime || 1.5;
};

ENEMY_BEHAVIOR_HANDLERS.reck2Glacierdrone = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (e.reckFuse === undefined) e.reckFuse = 0;
  if (v.d < 70) e.reckFuse += dt;
  else e.reckFuse = Math.max(0, e.reckFuse - dt * 2);
  e.hitFlash = e.reckFuse > 0.3 ? 0.15 : 0;
  if (e.reckFuse >= (t.fuseTime || 0.85)) {
    const r = t.blastRadius || 84;
    game.explosions.push(new Explosion(e.x, e.y, r));
    if (Util.dist(e.x, e.y, player.x, player.y) < r + player.radius) { damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id); player.freezeTimer = Math.max(player.freezeTimer, 0.4); }
    e.hp = 0;
    return;
  }
  reckStep(game, e, dt, v.x, v.y, 1.2);
};

ENEMY_BEHAVIOR_HANDLERS.reck2Mortarwright = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  const keep = t.keepDistance || 190;
  if (v.d < keep) reckStep(game, e, dt, -v.x, -v.y, 0.8);
  else reckStep(game, e, dt, v.x, v.y, 0.6);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && v.d < keep + 130) {
    e.fireTimer = t.fireCooldown || 2;
    reckArc(game, e, reckAim(e, player), t.shotCount || 3, t.spreadAngle || 0.44, t.boltSpeed || 200, { color: t.boltColor || '#e0c0a0', radius: 4 });
  }
};

ENEMY_BEHAVIOR_HANDLERS.reck2Masonhusk = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  reckStep(game, e, dt, v.x, v.y, 0.75);
  if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
  if (e.hp <= 0 && !e.reckSplit) {
    e.reckSplit = true;
    for (let i = 0; i < 2; i++) {
      const ang = (i / 2) * Math.PI * 2 + RNG.random();
      reckSpawn(game, game.currentRoom, t.splitInto || 'frostbiter', e.x + Math.cos(ang) * 20, e.y + Math.sin(ang) * 20);
    }
  }
};

ENEMY_BEHAVIOR_HANDLERS.reck2Hoarfrostspire = function(game, e, dt){
  const player = game.player, t = e.type;
  e.fireTimer -= dt;
  const v = seekVector(e, player.x, player.y);
  if (e.fireTimer <= 0 && v.d < 460) {
    e.fireTimer = t.fireCooldown || 2.2;
    e.reckVolley = (e.reckVolley || 0) + 1;
    const spread = (t.spreadAngle || 0.72) * (1 + (e.reckVolley % 3) * 0.3);
    reckArc(game, e, reckAim(e, player), t.shotCount || 4, spread, t.boltSpeed || 200, { color: t.boltColor || '#eaf6ff', radius: 5 });
    e.hitFlash = 0.1;
  }
};

ENEMY_BEHAVIOR_HANDLERS.reck2Chiselcharger = function(game, e, dt){
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

ENEMY_BEHAVIOR_HANDLERS.reck2Sleetlurker = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.reckHidden === undefined) e.reckHidden = true;
  const v = seekVector(e, player.x, player.y);
  if (e.reckDash > 0) {
    e.reckDash -= dt;
    const r = reckStep(game, e, dt, e.reckDX, e.reckDY, t.chargeSpeed || 7.2);
    if (Util.dist(e.x, e.y, player.x, player.y) < e.radius + player.radius) damagePlayer(game, playerDamageAmount(game, false, e.dmg + 1), t.id);
    if ((!r.movedX && !r.movedY) || e.reckDash <= 0) { e.reckDash = 0; e.reckHidden = true; e.reckCd = t.chargeCooldown || 2; }
    return;
  }
  e.shielded = e.reckHidden;
  e.alpha = e.reckHidden ? 0.3 : 1;
  if (e.reckHidden) {
    e.reckCd = (e.reckCd || 0) - dt;
    if (v.d < (t.triggerRange || 100) && e.reckCd <= 0) { e.reckHidden = false; e.reckTelegraph = t.telegraphTime || 0.26; e.hitFlash = 0.15; }
    return;
  }
  e.reckTelegraph -= dt;
  if (e.reckTelegraph <= 0) { e.reckDash = t.dashDuration || 0.42; e.reckDX = v.x; e.reckDY = v.y; }
};

ENEMY_BEHAVIOR_HANDLERS.reck2Brickmender = function(game, e, dt){
  const player = game.player, t = e.type;
  let target = null, best = Infinity;
  for (const en of game.currentRoom.enemies) {
    if (en !== e && en.type && en.type.floorKey === '9B' && en.hp < en.maxHp) {
      const d = Util.dist(e.x, e.y, en.x, en.y);
      if (d < best) { best = d; target = en; }
    }
  }
  const v = seekVector(e, player.x, player.y);
  if (target && best < (t.healRadius || 175)) reckStep(game, e, dt, -v.x, -v.y, 0.6);
  else reckStep(game, e, dt, v.x, v.y, 0.4);
  e.reckHeal = (e.reckHeal || 0) - dt;
  if (e.reckHeal <= 0 && target && best < (t.healRadius || 175)) {
    target.hp = Math.min(target.maxHp, target.hp + (t.healAmount || 2));
    e.reckHeal = t.healCooldown || 2.2;
    e.hitFlash = 0.1;
  }
};
