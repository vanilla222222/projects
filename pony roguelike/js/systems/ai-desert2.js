'use strict';

ENEMY_BEHAVIOR_HANDLERS.ds10Duneskitter = function(game, e, dt){
  const player = game.player;
  if (e.skitterTimer === undefined) e.skitterTimer = Util.rand(0.3, 0.7);
  e.skitterTimer -= dt;
  const ang = desertAim(e, player);
  const jitter = (e.skitterTimer > 0.35) ? 0.5 : -0.5;
  desertStep(game, e, dt, Math.cos(ang + jitter * 0.4), Math.sin(ang + jitter * 0.4), 1.15);
  if (e.skitterTimer <= 0) e.skitterTimer = Util.rand(0.3, 0.7);
};

ENEMY_BEHAVIOR_HANDLERS.ds11Sandshell = function(game, e, dt){
  if (e.shellTimer === undefined) { e.shellTimer = e.shieldTime; e.shielded = true; }
  e.shellTimer -= dt;
  if (e.shellTimer <= 0) {
    e.shielded = !e.shielded;
    e.shellTimer = e.shielded ? e.shieldTime : e.vulnTime;
    e.hitFlash = 0.15;
  }
  if (!e.shielded) aiWander(game, e, dt);
};

ENEMY_BEHAVIOR_HANDLERS.ds12Cactusturret = function(game, e, dt){
  const player = game.player;
  if (e.fireTimer === undefined) e.fireTimer = Util.rand(0.3, e.fireCooldown);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) {
    e.fireTimer = e.fireCooldown;
    const ang = desertAim(e, player);
    fireProjectileAngle(game, e, ang, e.boltSpeed, e.dmg, { color: '#9fd88a' });
    fireProjectileAngle(game, e, ang, e.boltSpeed * 0.7, e.dmg, { color: '#6a9c4a', radius: 3 });
  }
};

ENEMY_BEHAVIOR_HANDLERS.ds13Sandcharger = function(game, e, dt){
  const player = game.player;
  if (e.charging === undefined) { e.charging = false; e.telegraph = 0; e.chargeTimer = Util.rand(0.6, 1.4); }
  if (e.charging) {
    desertStep(game, e, dt, e.chargeVX, e.chargeVY, e.chargeSpeed);
    e.chargeTime -= dt;
    if (e.chargeTime <= 0) { e.charging = false; e.chargeTimer = e.chargeCooldown; }
    return;
  }
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 30) > 0) ? 0.12 : 0;
    if (e.telegraph <= 0) {
      const ang = desertAim(e, player);
      e.chargeVX = Math.cos(ang); e.chargeVY = Math.sin(ang);
      e.charging = true; e.chargeTime = 0.8;
    }
    return;
  }
  e.chargeTimer -= dt;
  const dist = Util.dist(e.x, e.y, player.x, player.y);
  if (e.chargeTimer <= 0 && dist < 260) { e.telegraph = e.telegraphTime; return; }
  const ang = desertAim(e, player);
  desertStep(game, e, dt, Math.cos(ang), Math.sin(ang), 0.5);
};

ENEMY_BEHAVIOR_HANDLERS.ds14Sandwisp = function(game, e, dt){
  const player = game.player;
  if (e.bobPhase === undefined) { e.bobPhase = RNG.random() * Math.PI * 2; e.fireTimer = Util.rand(0.5, e.fireCooldown); }
  e.bobPhase += dt * 2.4;
  const ang = desertAim(e, player);
  const perp = ang + Math.PI / 2;
  const bob = Math.sin(e.bobPhase) * 0.4;
  desertStep(game, e, dt, Math.cos(ang) + Math.cos(perp) * bob, Math.sin(ang) + Math.sin(perp) * bob, 0.7);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && Util.dist(e.x, e.y, player.x, player.y) < 380) {
    e.fireTimer = e.fireCooldown;
    fireProjectileAngle(game, e, ang, e.boltSpeed, e.dmg, { color: '#f0d68a' });
  }
};

ENEMY_BEHAVIOR_HANDLERS.ds15Powderkeg = function(game, e, dt){
  const player = game.player;
  const dist = Util.dist(e.x, e.y, player.x, player.y);
  if (e.lit === undefined) e.lit = false;
  if (!e.lit) {
    if (dist < 90) { e.lit = true; e.fuseLeft = e.fuseTime; e.hitFlash = 0.2; }
    else { const ang = desertAim(e, player); desertStep(game, e, dt, Math.cos(ang), Math.sin(ang), 1); }
    return;
  }
  e.fuseLeft -= dt;
  e.hitFlash = (Math.sin(e.fuseLeft * 40) > 0) ? 0.2 : 0;
  if (e.fuseLeft <= 0) {
    game.explosions.push(new Explosion(e.x, e.y, e.blastRadius));
    if (Util.dist(e.x, e.y, player.x, player.y) < e.blastRadius) {
      damagePlayer(game, playerDamageAmount(game, false, e.dmg), 'powderkeg');
    }
    e.hp = 0;
  }
};

ENEMY_BEHAVIOR_HANDLERS.ds16Dunestalker = function(game, e, dt){
  const player = game.player;
  const ang = desertAim(e, player);
  const dist = Util.dist(e.x, e.y, player.x, player.y);
  const mul = dist > 260 ? 1.25 : 1;
  desertStep(game, e, dt, Math.cos(ang), Math.sin(ang), mul);
};

ENEMY_BEHAVIOR_HANDLERS.ds17Sunbleachedskull = function(game, e, dt){
  const player = game.player;
  if (e.groanTimer === undefined) e.groanTimer = Util.rand(2, 4);
  const ang = desertAim(e, player);
  desertStep(game, e, dt, Math.cos(ang), Math.sin(ang), 1);
  e.groanTimer -= dt;
  if (e.groanTimer <= 0) { e.groanTimer = Util.rand(3, 5); e.speed *= 1.6; e.groanBoost = 0.5; }
  if (e.groanBoost !== undefined) {
    e.groanBoost -= dt;
    if (e.groanBoost <= 0) { e.speed /= 1.6; e.groanBoost = undefined; }
  }
};

ENEMY_BEHAVIOR_HANDLERS.ds18Mirageslinger = function(game, e, dt){
  const player = game.player;
  if (e.fireTimer === undefined) e.fireTimer = Util.rand(0.4, e.fireCooldown);
  const v = seekVector(e, player.x, player.y);
  const ring = e.keepDistance;
  if (v.d < ring - 20) desertStep(game, e, dt, -v.x, -v.y, 1);
  else if (v.d > ring + 20) desertStep(game, e, dt, v.x, v.y, 1);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && v.d < 420) {
    e.fireTimer = e.fireCooldown;
    const jitterAng = Math.atan2(v.y, v.x) + (RNG.random() - 0.5) * 0.3;
    fireProjectileAngle(game, e, jitterAng, e.boltSpeed, e.dmg, { color: '#e8b45a' });
  }
};

ENEMY_BEHAVIOR_HANDLERS.ds19Duneguardian = function(game, e, dt){
  const player = game.player;
  if (e.shellTimer === undefined) { e.shellTimer = e.shieldTime; e.shielded = true; }
  e.shellTimer -= dt;
  if (e.shellTimer <= 0) {
    e.shielded = !e.shielded;
    e.shellTimer = e.shielded ? e.shieldTime : e.vulnTime;
    e.hitFlash = 0.15;
  }
  const ang = desertAim(e, player);
  desertStep(game, e, dt, Math.cos(ang), Math.sin(ang), e.shielded ? 0.3 : 1);
};

ENEMY_BEHAVIOR_HANDLERS.ds20Scorpionrusher = function(game, e, dt){
  const player = game.player;
  if (e.charging === undefined) { e.charging = false; e.telegraph = 0; e.chargeTimer = Util.rand(0.6, 1.4); e.backstep = false; }
  if (e.charging) {
    desertStep(game, e, dt, e.chargeVX, e.chargeVY, e.chargeSpeed);
    e.chargeTime -= dt;
    if (e.chargeTime <= 0) { e.charging = false; e.chargeTimer = e.chargeCooldown; e.backstep = true; e.backstepTime = 0.3; }
    return;
  }
  if (e.backstep) {
    e.backstepTime -= dt;
    const ang = desertAim(e, player) + Math.PI;
    desertStep(game, e, dt, Math.cos(ang), Math.sin(ang), 0.6);
    if (e.backstepTime <= 0) e.backstep = false;
    return;
  }
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 30) > 0) ? 0.12 : 0;
    if (e.telegraph <= 0) {
      const ang = desertAim(e, player);
      e.chargeVX = Math.cos(ang); e.chargeVY = Math.sin(ang);
      e.charging = true; e.chargeTime = 0.8;
    }
    return;
  }
  e.chargeTimer -= dt;
  const dist = Util.dist(e.x, e.y, player.x, player.y);
  if (e.chargeTimer <= 0 && dist < 260) { e.telegraph = e.telegraphTime; return; }
  const ang = desertAim(e, player);
  desertStep(game, e, dt, Math.cos(ang), Math.sin(ang), 0.55);
};

ENEMY_BEHAVIOR_HANDLERS.ds21Obelisksentinel = function(game, e, dt){
  const player = game.player;
  if (e.rotAng === undefined) { e.rotAng = 0; e.fireTimer = Util.rand(0.3, e.fireCooldown); }
  e.rotAng += dt * 0.6;
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && Util.dist(e.x, e.y, player.x, player.y) < 460) {
    e.fireTimer = e.fireCooldown;
    desertArc(game, e, e.rotAng, 3, 0.6, e.boltSpeed, { color: '#8a7248' });
  }
};

ENEMY_BEHAVIOR_HANDLERS.ds22Jackaljumper = function(game, e, dt){
  const player = game.player;
  if (e.dashing) {
    desertStep(game, e, dt, e.dashVX, e.dashVY, e.leapSpeed);
    e.dashTimer -= dt;
    if (e.dashTimer <= 0) e.dashing = false;
    return;
  }
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 26) > 0) ? 0.1 : 0;
    if (e.telegraph <= 0) {
      const ang = desertAim(e, player);
      e.dashing = true; e.dashTimer = 0.32;
      e.dashVX = Math.cos(ang); e.dashVY = Math.sin(ang);
    }
    return;
  }
  if (e.leapCd === undefined) e.leapCd = 0;
  e.leapCd -= dt;
  const dist = Util.dist(e.x, e.y, player.x, player.y);
  if (e.leapCd <= 0 && dist < 240 && dist > 60) { e.telegraph = e.telegraphTime; e.leapCd = e.leapCooldown; return; }
  const ang = desertAim(e, player);
  desertStep(game, e, dt, Math.cos(ang), Math.sin(ang), 0.8);
};

ENEMY_BEHAVIOR_HANDLERS.ds23Sandvortex = function(game, e, dt){
  const player = game.player;
  if (e.fireTimer === undefined) { e.fireTimer = Util.rand(0.3, e.fireCooldown); e.spinAng = 0; }
  e.spinAng += dt * 3;
  const v = seekVector(e, player.x, player.y);
  const ring = e.keepDistance;
  const tangent = 0.9;
  const mx = v.x * (v.d - ring) * 0.015 + -v.y * tangent, my = v.y * (v.d - ring) * 0.015 + v.x * tangent;
  const len = Math.hypot(mx, my) || 1;
  desertStep(game, e, dt, mx / len, my / len, 1);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && v.d < 440) {
    e.fireTimer = e.fireCooldown;
    fireProjectileAngle(game, e, Math.atan2(v.y, v.x), e.boltSpeed, e.dmg, { color: '#e0d68a' });
  }
};

ENEMY_BEHAVIOR_HANDLERS.ds24Sandwarden = function(game, e, dt){
  const player = game.player;
  if (e.shieldTimer === undefined) e.shieldTimer = 0;
  const v = seekVector(e, player.x, player.y);
  const ring = e.keepDistance;
  if (v.d < ring - 20) desertStep(game, e, dt, -v.x, -v.y, 0.8);
  else if (v.d > ring + 20) desertStep(game, e, dt, v.x, v.y, 0.8);
  e.shieldTimer -= dt;
  if (e.shieldTimer <= 0) {
    e.shieldTimer = e.shieldCooldown;
    const node = game.currentRoom;
    for (const other of node.enemies) {
      if (other !== e && Util.dist(other.x, other.y, e.x, e.y) < e.shieldRadius) {
        other.shielded = true;
        other.shieldGrantLeft = e.shieldGrantTime;
      }
    }
    e.hitFlash = 0.2;
  }
  for (const other of game.currentRoom.enemies) {
    if (other.shieldGrantLeft !== undefined) {
      other.shieldGrantLeft -= dt;
      if (other.shieldGrantLeft <= 0) { other.shielded = false; other.shieldGrantLeft = undefined; }
    }
  }
};

ENEMY_BEHAVIOR_HANDLERS.ds25Sandmortar = function(game, e, dt){
  const player = game.player;
  if (e.fireTimer === undefined) e.fireTimer = Util.rand(0.6, e.fireCooldown);
  const dist = Util.dist(e.x, e.y, player.x, player.y);
  if (dist > e.lobRange * 0.6) {
    const ang = desertAim(e, player);
    desertStep(game, e, dt, Math.cos(ang), Math.sin(ang), 0.6);
  } else if (dist < e.lobRange * 0.35) {
    const ang = desertAim(e, player) + Math.PI;
    desertStep(game, e, dt, Math.cos(ang), Math.sin(ang), 0.6);
  }
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && dist < e.lobRange) {
    e.fireTimer = e.fireCooldown;
    game.explosions.push(new Explosion(player.x, player.y, e.burstRadius, e.lobTime));
    game.pendingLobs = game.pendingLobs || [];
    game.pendingLobs.push({ x: player.x, y: player.y, t: e.lobTime, radius: e.burstRadius, dmg: e.dmg, src: 'sandmortar' });
  }
  if (game.pendingLobs) {
    for (let i = game.pendingLobs.length - 1; i >= 0; i--) {
      const lob = game.pendingLobs[i];
      lob.t -= dt;
      if (lob.t <= 0) {
        if (Util.dist(lob.x, lob.y, player.x, player.y) < lob.radius) damagePlayer(game, playerDamageAmount(game, false, lob.dmg), lob.src);
        game.pendingLobs.splice(i, 1);
      }
    }
  }
};

ENEMY_BEHAVIOR_HANDLERS.ds26Sidewinder = function(game, e, dt){
  const player = game.player;
  if (e.weavePhase === undefined) e.weavePhase = RNG.random() * Math.PI * 2;
  e.weavePhase += dt * e.weaveFrequency;
  const ang = desertAim(e, player);
  const perp = ang + Math.PI / 2;
  const w = Math.sin(e.weavePhase) * e.weaveAmplitude;
  desertStep(game, e, dt, Math.cos(ang) + Math.cos(perp) * w, Math.sin(ang) + Math.sin(perp) * w, 1);
};

ENEMY_BEHAVIOR_HANDLERS.ds27Sunsentry = function(game, e, dt){
  const player = game.player;
  const dist = Util.dist(e.x, e.y, player.x, player.y);
  if (e.fireTimer === undefined) e.fireTimer = Util.rand(0.3, e.fireCooldown);
  if (dist > e.sentryThreshold) {
    const ang = desertAim(e, player);
    desertStep(game, e, dt, Math.cos(ang), Math.sin(ang), 1);
    return;
  }
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && dist < e.fireRange) {
    e.fireTimer = e.fireCooldown;
    fireProjectileAt(game, e, player.x, player.y, e.boltSpeed, e.dmg, { color: e.boltColor, radius: e.boltRadius });
  }
};

ENEMY_BEHAVIOR_HANDLERS.ds28Miragedancer = function(game, e, dt){
  const player = game.player;
  if (e.orbitAng === undefined) { e.orbitAng = RNG.random() * Math.PI * 2; e.fireTimer = Util.rand(0.4, e.fireCooldown); }
  e.orbitAng += e.orbitSpeed * dt;
  const tx = player.x + Math.cos(e.orbitAng) * e.orbitRadius;
  const ty = player.y + Math.sin(e.orbitAng) * e.orbitRadius;
  const v = seekVector(e, tx, ty);
  desertStep(game, e, dt, v.x, v.y, 1);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && Util.dist(e.x, e.y, player.x, player.y) < e.fireRange) {
    e.fireTimer = e.fireCooldown;
    desertArc(game, e, desertAim(e, player), e.shotCount, e.spreadAngle, e.boltSpeed, { color: e.boltColor, radius: e.boltRadius });
  }
};

ENEMY_BEHAVIOR_HANDLERS.ds29Dunediver = function(game, e, dt){
  const player = game.player;
  if (e.burrowed === undefined) { e.burrowed = false; e.burrowTimer = e.burrowCooldown; }
  if (e.burrowed) {
    e.burrowTimer -= dt;
    if (e.burrowTimer <= 0) {
      e.burrowed = false;
      e.burrowTimer = e.burrowCooldown;
      const spot = findNearestFloor(game.currentRoom, Math.floor(player.x / TILE), Math.floor(player.y / TILE));
      e.x = spot.x; e.y = spot.y;
      e.hitFlash = 0.2;
    }
    return;
  }
  e.burrowTimer -= dt;
  if (e.burrowTimer <= 0) { e.burrowed = true; e.burrowTimer = e.burrowTime; return; }
  const ang = desertAim(e, player);
  desertStep(game, e, dt, Math.cos(ang), Math.sin(ang), 0.9);
};

ENEMY_BEHAVIOR_HANDLERS.ds30Scarabcaller = function(game, e, dt){
  const player = game.player;
  if (e.summons === undefined) { e.summons = []; }
  const v = seekVector(e, player.x, player.y);
  const ring = e.keepDistance;
  if (v.d < ring - 20) desertStep(game, e, dt, -v.x, -v.y, 0.8);
  else if (v.d > ring + 20) desertStep(game, e, dt, v.x, v.y, 0.8);
  e.summons = e.summons.filter(s => s.hp > 0);
  e.summonTimer -= dt;
  if (e.summonTimer <= 0 && e.summons.length < e.maxSummons) {
    e.summonTimer = e.summonCooldown;
    e.hitFlash = 0.2;
    for (let i = 0; i < e.summonCount; i++) {
      const ang = RNG.random() * Math.PI * 2;
      const s = desertSpawn(game, game.currentRoom, e.summonId, e.x + Math.cos(ang) * 40, e.y + Math.sin(ang) * 40);
      if (s) e.summons.push(s);
    }
  }
};

ENEMY_BEHAVIOR_HANDLERS.ds31Oasistender = function(game, e, dt){
  const player = game.player;
  if (e.healTimer === undefined) e.healTimer = Util.rand(0.5, e.healCooldown);
  const v = seekVector(e, player.x, player.y);
  if (v.d < 160) desertStep(game, e, dt, -v.x, -v.y, 0.9);
  else aiWander(game, e, dt);
  e.healTimer -= dt;
  if (e.healTimer <= 0) {
    e.healTimer = e.healCooldown;
    const node = game.currentRoom;
    let healed = false;
    for (const other of node.enemies) {
      if (other !== e && other.hp < other.maxHp && Util.dist(other.x, other.y, e.x, e.y) < e.healRadius) {
        other.hp = Math.min(other.maxHp, other.hp + e.healAmount);
        healed = true;
      }
    }
    if (healed) e.hitFlash = 0.25;
  }
};

ENEMY_BEHAVIOR_HANDLERS.ds32Dunemarksman = function(game, e, dt){
  const player = game.player;
  if (e.telegraph === undefined) { e.telegraph = 0; e.fireTimer = Util.rand(0.5, e.fireCooldown); }
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 20) > 0) ? 0.15 : 0;
    if (e.telegraph <= 0) {
      fireProjectileAt(game, e, player.x, player.y, e.boltSpeed, e.dmg, { color: e.boltColor, radius: e.boltRadius });
    }
    return;
  }
  const v = seekVector(e, player.x, player.y);
  if (v.d < e.fireRange * 0.6) desertStep(game, e, dt, -v.x, -v.y, 0.7);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && v.d < e.fireRange) { e.fireTimer = e.fireCooldown; e.telegraph = e.telegraphTime; }
};

ENEMY_BEHAVIOR_HANDLERS.ds33Locustfleck = function(game, e, dt){
  const player = game.player;
  if (e.driftPhase === undefined) e.driftPhase = RNG.random() * Math.PI * 2;
  e.driftPhase += dt * 5;
  const ang = desertAim(e, player);
  const drift = Math.sin(e.driftPhase) * e.driftAmount;
  desertStep(game, e, dt, Math.cos(ang + drift), Math.sin(ang + drift), 1.2);
};

ENEMY_BEHAVIOR_HANDLERS.ds34Glarewisp = function(game, e, dt){
  const player = game.player;
  if (e.fireTimer === undefined) e.fireTimer = Util.rand(0.4, e.fireCooldown);
  const v = seekVector(e, player.x, player.y);
  const ring = e.keepDistance;
  if (v.d < ring - 15) desertStep(game, e, dt, -v.x, -v.y, 1);
  else if (v.d > ring + 15) desertStep(game, e, dt, v.x, v.y, 1);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && v.d < 420) {
    e.fireTimer = e.fireCooldown;
    fireProjectileAngle(game, e, Math.atan2(v.y, v.x), e.boltSpeed, e.dmg, { color: '#f2d9b0' });
    e.hitFlash = 0.08;
  }
};

ENEMY_BEHAVIOR_HANDLERS.ds35Duneshade = function(game, e, dt){
  const player = game.player;
  if (e.blinkTimer === undefined) e.blinkTimer = Util.rand(0.5, e.blinkCooldown);
  if (e.fireTimer === undefined) e.fireTimer = Util.rand(0.3, e.fireCooldown);
  const dist = Util.dist(e.x, e.y, player.x, player.y);
  e.blinkTimer -= dt;
  if (e.blinkTimer <= 0 && dist < 150) {
    e.blinkTimer = e.blinkCooldown;
    const ang = RNG.random() * Math.PI * 2;
    const nx = player.x + Math.cos(ang) * e.blinkRange;
    const ny = player.y + Math.sin(ang) * e.blinkRange;
    const spot = findNearestFloor(game.currentRoom, Math.floor(nx / TILE), Math.floor(ny / TILE));
    e.x = spot.x; e.y = spot.y;
    e.hitFlash = 0.2;
  }
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && dist < e.fireRange) {
    e.fireTimer = e.fireCooldown;
    fireProjectileAt(game, e, player.x, player.y, e.boltSpeed, e.dmg, { color: e.boltColor, radius: e.boltRadius });
  }
};

ENEMY_BEHAVIOR_HANDLERS.ds36Ironsentinel = function(game, e, dt){
  const player = game.player;
  const dist = Util.dist(e.x, e.y, player.x, player.y);
  if (e.fireTimer === undefined) e.fireTimer = Util.rand(0.3, e.fireCooldown);
  if (dist > e.sentryThreshold) {
    const ang = desertAim(e, player);
    desertStep(game, e, dt, Math.cos(ang), Math.sin(ang), 0.85);
  }
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && dist < e.fireRange) {
    e.fireTimer = e.fireCooldown;
    desertArc(game, e, desertAim(e, player), 2, 0.3, e.boltSpeed, { color: e.boltColor, radius: e.boltRadius });
  }
};

ENEMY_BEHAVIOR_HANDLERS.ds37Sandskirmisher = function(game, e, dt){
  const player = game.player;
  if (e.fireTimer === undefined) e.fireTimer = Util.rand(0.3, e.fireCooldown);
  const v = seekVector(e, player.x, player.y);
  if (v.d > e.engageRange) desertStep(game, e, dt, v.x, v.y, e.dashSpeed);
  else if (v.d < e.retreatRange) desertStep(game, e, dt, -v.x, -v.y, e.dashSpeed);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && v.d < e.engageRange * 1.2) {
    e.fireTimer = e.fireCooldown;
    fireProjectileAngle(game, e, Math.atan2(v.y, v.x), e.boltSpeed, e.dmg, { color: e.boltColor, radius: e.boltRadius });
  }
};

ENEMY_BEHAVIOR_HANDLERS.ds38Dustraider = function(game, e, dt){
  const player = game.player;
  if (e.fireTimer === undefined) e.fireTimer = Util.rand(0.3, e.fireCooldown);
  const v = seekVector(e, player.x, player.y);
  if (v.d > e.engageRange) desertStep(game, e, dt, v.x, v.y, e.dashSpeed);
  else if (v.d < e.retreatRange) desertStep(game, e, dt, -v.x, -v.y, e.dashSpeed);
  else {
    const tangent = 0.5;
    const mx = -v.y * tangent, my = v.x * tangent;
    const len = Math.hypot(mx, my) || 1;
    desertStep(game, e, dt, mx / len, my / len, 0.6);
  }
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && v.d < e.engageRange * 1.2) {
    e.fireTimer = e.fireCooldown;
    fireProjectileAngle(game, e, Math.atan2(v.y, v.x), e.boltSpeed, e.dmg, { color: e.boltColor, radius: e.boltRadius });
  }
};

ENEMY_BEHAVIOR_HANDLERS.ds39Sandwraith = function(game, e, dt){
  const player = game.player;
  if (e.fireTimer === undefined) { e.fireTimer = Util.rand(0.4, e.fireCooldown); e.driftAng = RNG.random() * Math.PI * 2; }
  const dist = Util.dist(e.x, e.y, player.x, player.y);
  e.driftAng += dt * 1.6;
  if (dist > 90) {
    const ang = desertAim(e, player);
    const wob = Math.sin(e.driftAng) * 0.5;
    desertStep(game, e, dt, Math.cos(ang + wob), Math.sin(ang + wob), 1);
  } else {
    const ang = desertAim(e, player) + Math.PI;
    desertStep(game, e, dt, Math.cos(ang), Math.sin(ang), 0.6);
  }
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) {
    e.fireTimer = e.fireCooldown;
    fireProjectileAngle(game, e, desertAim(e, player), e.boltSpeed, e.dmg, { color: '#f0e4b8' });
  }
};

ENEMY_BEHAVIOR_HANDLERS.ds40Scarabswarm = function(game, e, dt){
  const player = game.player;
  if (e.fuseTimer === undefined) { e.fuseTimer = -1; e.armed = false; }
  const dist = Util.dist(e.x, e.y, player.x, player.y);
  if (!e.armed) {
    const ang = desertAim(e, player);
    desertStep(game, e, dt, Math.cos(ang), Math.sin(ang), 1.1);
    if (dist < 46) {
      e.armed = true;
      e.fuseTimer = e.fuseTime;
      e.hitFlash = 0.15;
    }
    return;
  }
  e.fuseTimer -= dt;
  if (e.fuseTimer <= 0) {
    game.explosions.push(new Explosion(e.x, e.y, e.blastRadius));
    if (Util.dist(e.x, e.y, player.x, player.y) < e.blastRadius) {
      damagePlayer(game, playerDamageAmount(game, false, e.dmg), 'scarabswarm');
    }
    handleEnemyDeath(game, e);
  }
};
