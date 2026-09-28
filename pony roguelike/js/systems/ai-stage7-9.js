'use strict';

function s79Init(e, k, v){ if (e[k] === undefined) e[k] = v; }

function s79Aim(e, p){ return Math.atan2(p.y - e.y, p.x - e.x); }

function s79Ring(game, e, n, speed, dmg, color, offset, radius){
  for (let i = 0; i < n; i++) {
    fireProjectileAngle(game, e, offset + (i / n) * Math.PI * 2, speed, dmg, { color: color, radius: radius || 5 });
  }
}

function s79Arc(game, e, n, spread, speed, dmg, color, aim, radius){
  const step = (n > 1) ? spread / (n - 1) : 0;
  for (let i = 0; i < n; i++) {
    fireProjectileAngle(game, e, aim - spread / 2 + step * i, speed, dmg, { color: color, radius: radius || 5 });
  }
}

function s79Drag(game, e, strength, dt){
  const p = game.player, node = game.currentRoom;
  const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
  tryMoveEntity(p, node, node.obstacles, (dx / d) * strength * dt, (dy / d) * strength * dt);
}

function s79Pyre(e, x, y, t, r){ e.pyres.push({ x: x, y: y, t: t, r: r || 60 }); }

function s79Pyres(game, e, dt){
  const p = game.player;
  for (let i = e.pyres.length - 1; i >= 0; i--) {
    const q = e.pyres[i];
    q.t -= dt;
    if (q.t > 0) continue;
    const R = q.r || 60;
    game.explosions.push(new Explosion(q.x, q.y, R));
    if (Util.dist(q.x, q.y, p.x, p.y) < R + p.radius) damagePlayer(game, playerDamageAmount(game, !!e.isBoss, e.dmg), e.type.id);
    e.pyres.splice(i, 1);
  }
}

function s79Warp(game, e, x, y){
  const node = game.currentRoom;
  const spot = findNearestFloor(node, Math.floor(x / TILE), Math.floor(y / TILE));
  e.x = spot.x * TILE + TILE / 2;
  e.y = spot.y * TILE + TILE / 2;
  e.navPath = null; e.pathTimer = 0;
}

function s79Spawn(game, e, id, dist){
  const node = game.currentRoom;
  const type = ENEMY_TYPES[id];
  if (!type) return;
  const ang = RNG.random() * Math.PI * 2;
  const spot = findNearestFloor(node, Math.floor((e.x + Math.cos(ang) * (dist || 70)) / TILE),
                                     Math.floor((e.y + Math.sin(ang) * (dist || 70)) / TILE));
  node.enemies.push(new Enemy(type, spot.x, spot.y, game.dungeon.floorNum));
}

function aiOcSurge(game, e, dt){
  const p = game.player, node = game.currentRoom;
  s79Init(e, 'surgeVX', 0); s79Init(e, 'surgeVY', 0); s79Init(e, 'surgeTimer', 0.4);
  e.surgeTimer -= dt;
  if (e.surgeTimer <= 0) {
    e.surgeTimer = (e.type.surgePeriod || 1.1);
    const v = seekVector(e, p.x, p.y);
    e.surgeVX = v.x * e.speed * 2.6; e.surgeVY = v.y * e.speed * 2.6;
  }
  const decay = Math.max(0, e.surgeTimer / (e.type.surgePeriod || 1.1));
  tryMoveEntity(e, node, node.obstacles, e.surgeVX * decay * dt, e.surgeVY * decay * dt);
}

function aiOcJellyPulse(game, e, dt){
  const node = game.currentRoom;
  s79Init(e, 'driftAng', RNG.random() * Math.PI * 2);
  e.driftAng += 0.55 * dt;
  tryMoveEntity(e, node, node.obstacles, Math.cos(e.driftAng) * e.speed * dt, Math.sin(e.driftAng * 0.7) * e.speed * dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) {
    e.attackTimer = e.type.pulseCooldown || 2.1;
    s79Ring(game, e, 6, 150, e.dmg, e.type.boltColor || '#a8e0f0', e.driftAng, 5);
  }
}

function aiOcNetcast(game, e, dt){
  const p = game.player, node = game.currentRoom;
  const d = Util.dist(e.x, e.y, p.x, p.y);
  const keep = e.type.keepDistance || 210;
  if (d < keep - 25) { const v = seekVector(e, p.x, p.y); tryMoveEntity(e, node, node.obstacles, -v.x * e.speed * dt, -v.y * e.speed * dt); }
  else if (d > keep + 25) chaseSeek(game, e, p.x, p.y, 0.9, dt);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && d < 420) {
    e.fireTimer = e.type.fireCooldown || 2.6;
    s79Arc(game, e, 7, 1.5, 105, e.dmg, e.type.boltColor || '#cfe8f5', s79Aim(e, p), 7);
  }
}

function aiOcBubbleMine(game, e, dt){
  const p = game.player, node = game.currentRoom;
  s79Init(e, 'swell', 0);
  if (e.swell > 0) {
    e.swell -= dt;
    e.hitFlash = (Math.sin(e.swell * 26) > 0) ? 0.12 : 0;
    if (e.swell <= 0) {
      s79Ring(game, e, 8, 175, e.dmg, e.type.boltColor || '#bfe8ff', RNG.random() * Math.PI * 2, 5);
      e.isDead = true;
      handleEnemyDeath(game, e);
    }
    return;
  }
  chaseSeek(game, e, p.x, p.y, 0.55, dt);
  if (Util.dist(e.x, e.y, p.x, p.y) < (e.type.triggerRange || 96)) e.swell = e.type.fuseTime || 0.85;
}

function aiOcPassBy(game, e, dt){
  const p = game.player, node = game.currentRoom;
  if (e.dashing) {
    tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
    e.dashTimer -= dt;
    if (e.dashTimer <= 0) { e.dashing = false; e.attackTimer = e.type.passCooldown || 1.5; }
    return;
  }
  const R = e.type.standoff || 190;
  const bearing = Math.atan2(e.y - p.y, e.x - p.x) + 1.5 * e.orbitDir * 0.35;
  chaseSeek(game, e, p.x + Math.cos(bearing) * R, p.y + Math.sin(bearing) * R, 1, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) {
    const v = seekVector(e, p.x, p.y);
    e.dashing = true; e.dashTimer = e.type.passDuration || 0.75;
    e.dashVX = v.x * e.speed * 3.4; e.dashVY = v.y * e.speed * 3.4;
  }
}

function aiOcKrillDrift(game, e, dt){
  const p = game.player, node = game.currentRoom;
  s79Init(e, 'wobble', RNG.random() * Math.PI * 2);
  e.wobble += (4 + RNG.random() * 3) * dt;
  const v = seekVector(e, p.x, p.y);
  const amp = e.type.driftAmount || 0.75;
  const mx = v.x + Math.cos(e.wobble) * amp, my = v.y + Math.sin(e.wobble) * amp;
  const len = Math.hypot(mx, my) || 1;
  tryMoveEntity(e, node, node.obstacles, (mx / len) * e.speed * dt, (my / len) * e.speed * dt);
}

function aiOcLure(game, e, dt){
  const p = game.player, node = game.currentRoom;
  const d = Util.dist(e.x, e.y, p.x, p.y);
  if (e.dashing) {
    tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
    e.dashTimer -= dt;
    if (e.dashTimer <= 0) { e.dashing = false; e.telegraph = 0; e.triggered = false; }
    return;
  }
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = 0.14;
    if (e.telegraph <= 0) {
      const v = seekVector(e, p.x, p.y);
      e.dashing = true; e.dashTimer = 0.55;
      e.dashVX = v.x * e.speed * 4.4; e.dashVY = v.y * e.speed * 4.4;
    }
    return;
  }
  if (d < (e.type.triggerRange || 170)) e.telegraph = e.type.telegraphTime || 0.35;
}

function aiOcSpout(game, e, dt){
  s79Init(e, 'spoutStep', 0);
  e.fireTimer -= dt;
  if (e.fireTimer > 0) return;
  e.fireTimer = e.type.fireCooldown || 1.9;
  e.spoutStep = (e.spoutStep + 1) % 2;
  s79Ring(game, e, 4, 205, e.dmg, e.type.boltColor || '#7fd4e8', e.spoutStep * Math.PI / 4, 6);
}

function aiOcClamp(game, e, dt){
  const p = game.player;
  s79Init(e, 'clampTimer', e.type.clampTime || 2.2);
  e.clampTimer -= dt;
  if (e.clampTimer <= 0) {
    e.shielded = !e.shielded;
    e.clampTimer = e.shielded ? (e.type.clampTime || 2.2) : (e.type.openTime || 1.6);
    e.hitFlash = 0.15;
  }
  if (!e.shielded) chaseSeek(game, e, p.x, p.y, 1.35, dt);
}

function aiOcUndertow(game, e, dt){
  const p = game.player;
  const d = Util.dist(e.x, e.y, p.x, p.y);
  if (d < (e.type.pullRange || 250)) s79Drag(game, e, e.type.pullStrength || 78, dt);
  chaseSeek(game, e, p.x, p.y, 0.35, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0 && d < 120) {
    e.attackTimer = 1.6;
    s79Ring(game, e, 5, 130, e.dmg, e.type.boltColor || '#2e6a86', RNG.random() * Math.PI * 2, 5);
  }
}

function aiOcBrineLob(game, e, dt){
  const p = game.player;
  s79Pyres(game, e, dt);
  chaseSeek(game, e, p.x, p.y, 0.45, dt);
  e.attackTimer -= dt;
  if (e.attackTimer > 0) return;
  e.attackTimer = e.type.fireCooldown || 3.0;
  for (let i = 0; i < 3; i++) {
    const a = RNG.random() * Math.PI * 2, r = RNG.random() * 55;
    s79Pyre(e, p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 0.9 + i * 0.12, e.type.burstRadius || 52);
  }
}

function aiOcDiveBomb(game, e, dt){
  const p = game.player, node = game.currentRoom;
  s79Init(e, 'diveTimer', 1.4);
  s79Pyres(game, e, dt);
  e.diveTimer -= dt;
  if (e.submerged) {

    const bearing = Math.atan2(e.y - p.y, e.x - p.x) + 1.9 * e.orbitDir * 0.35;
    chaseSeek(game, e, p.x + Math.cos(bearing) * 150, p.y + Math.sin(bearing) * 150, 1.5, dt);
    if (e.diveTimer <= 0) {
      s79Warp(game, e, p.x, p.y);
      s79Pyre(e, e.x, e.y, 0.45, e.type.blastRadius || 62);
      e.submerged = false; e.shielded = false;
      e.diveTimer = e.type.groundTime || 1.8;
    }
  } else {
    chaseSeek(game, e, p.x, p.y, 0.8, dt);
    if (e.diveTimer <= 0) { e.submerged = true; e.shielded = true; e.diveTimer = e.type.circleTime || 1.6; }
  }
}

function aiOcRicochet(game, e, dt){
  const node = game.currentRoom;
  s79Init(e, 'driftAng', RNG.random() * Math.PI * 2);

  const sx = Math.cos(e.driftAng) * e.speed * dt, sy = Math.sin(e.driftAng) * e.speed * dt;
  const ox = e.x, oy = e.y;
  tryMoveEntity(e, node, node.obstacles, sx, sy);
  const blockedX = Math.abs(e.x - ox) < Math.abs(sx) * 0.5;
  const blockedY = Math.abs(e.y - oy) < Math.abs(sy) * 0.5;
  if (blockedX || blockedY) {
    if (blockedX) e.driftAng = Math.PI - e.driftAng;
    if (blockedY) e.driftAng = -e.driftAng;
    s79Ring(game, e, 6, 145, e.dmg, e.type.boltColor || '#8ad0c0', e.driftAng, 4);
  }
}

function aiOcEelWeave(game, e, dt){
  const p = game.player, node = game.currentRoom;
  s79Init(e, 'coilPhase', RNG.random() * Math.PI * 2);
  e.coilPhase += (e.type.weaveFrequency || 5.2) * dt;
  const v = seekVector(e, p.x, p.y);
  const lat = Math.sin(e.coilPhase) * (e.type.weaveAmplitude || 0.95);
  const mx = v.x - v.y * lat, my = v.y + v.x * lat;
  const len = Math.hypot(mx, my) || 1;
  tryMoveEntity(e, node, node.obstacles, (mx / len) * e.speed * dt, (my / len) * e.speed * dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0 && v.d < 90) {
    e.attackTimer = 2.4;
    s79Ring(game, e, 10, 195, e.dmg, e.type.boltColor || '#d9f06a', 0, 4);
  }
}

function aiOcFoamWash(game, e, dt){
  const p = game.player, node = game.currentRoom;
  const v = seekVector(e, p.x, p.y);
  if (v.d < (e.type.keepDistance || 230)) tryMoveEntity(e, node, node.obstacles, -v.x * e.speed * dt, -v.y * e.speed * dt);
  else chaseSeek(game, e, p.x, p.y, 0.5, dt);
  e.attackTimer -= dt;
  if (e.attackTimer > 0) return;
  e.attackTimer = e.type.washCooldown || 3.4;
  e.hitFlash = 0.2;
  for (const o of node.enemies) {
    if (o === e || o.isDead) continue;
    const w = seekVector(o, p.x, p.y);
    tryMoveEntity(o, node, node.obstacles, w.x * 34, w.y * 34);
  }
}

function aiSfSiltStalk(game, e, dt){
  const p = game.player;
  s79Pyres(game, e, dt);
  e.burrowTimer -= dt;
  if (e.submerged) {
    chaseSeek(game, e, p.x, p.y, 1.7, dt);
    if (e.burrowTimer <= 0 || Util.dist(e.x, e.y, p.x, p.y) < e.radius + p.radius + 6) {
      e.submerged = false; e.shielded = false; e.hitFlash = 0.14;
      e.burrowTimer = e.type.burrowCooldown || 3.2;
    }
  } else {
    chaseSeek(game, e, p.x, p.y, 0.85, dt);
    if (e.burrowTimer <= 0) {
      s79Pyre(e, e.x, e.y, 0.7, e.type.burstRadius || 50);
      e.submerged = true; e.shielded = true;
      e.burrowTimer = e.type.burrowTime || 1.5;
      e.navPath = null; e.pathTimer = 0;
    }
  }
}

function aiSfGlowPulse(game, e, dt){
  s79Init(e, 'polypStep', 0);
  e.fireTimer -= dt;
  if (e.fireTimer > 0) return;
  e.polypStep = (e.polypStep + 1) % 2;
  if (e.polypStep === 0) {
    e.fireTimer = e.type.fireCooldown || 2.4;
    s79Ring(game, e, 12, 120, e.dmg, e.type.boltColor || '#7ae0c0', RNG.random() * Math.PI * 2, 5);
  } else {
    e.fireTimer = 0.9;
    s79Ring(game, e, 5, 260, e.dmg, e.type.boltColor2 || '#d9ffe8', RNG.random() * Math.PI * 2, 4);
  }
}

function aiSfSidleCrab(game, e, dt){
  const p = game.player, node = game.currentRoom;
  if (e.dashing) {
    tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
    e.dashTimer -= dt;
    if (e.dashTimer <= 0) { e.dashing = false; e.attackTimer = e.type.snapCooldown || 2.0; }
    return;
  }
  const v = seekVector(e, p.x, p.y);
  const sx = -v.y * e.orbitDir, sy = v.x * e.orbitDir;
  tryMoveEntity(e, node, node.obstacles, (sx + v.x * 0.35) * e.speed * dt, (sy + v.y * 0.35) * e.speed * dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0 && v.d < 165) {
    e.dashing = true; e.dashTimer = 0.32;
    e.dashVX = v.x * e.speed * 5.2; e.dashVY = v.y * e.speed * 5.2;
  }
}

function aiSfVentJet(game, e, dt){
  const p = game.player;
  s79Init(e, 'jetAng', s79Aim(e, p));
  s79Init(e, 'jetDir', 1);
  e.jetAng += (e.type.sweepSpeed || 1.15) * e.jetDir * dt;
  if (e.jetAng > Math.PI * 2) e.jetAng -= Math.PI * 2;
  if (e.jetAng < 0) e.jetAng += Math.PI * 2;
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) {
    e.attackTimer = 0.5;
    e.jetDir = (RNG.random() < 0.25) ? -e.jetDir : e.jetDir;
  }
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) {
    e.fireTimer = e.type.fireCooldown || 0.22;
    fireProjectileAngle(game, e, e.jetAng, e.type.boltSpeed || 210, e.dmg, { color: e.type.boltColor || '#ff9a5a', radius: 4 });
  }
}

function aiSfFlank(game, e, dt){
  const p = game.player, node = game.currentRoom;
  if (e.dashing) {
    tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
    e.dashTimer -= dt;
    if (e.dashTimer <= 0) { e.dashing = false; e.attackTimer = e.type.lungeCooldown || 2.6; }
    return;
  }

  const f = p.facing || { x: 0, y: 1 };
  const behind = Math.atan2(f.y, f.x) + Math.PI;
  const tx = p.x + Math.cos(behind) * 120, ty = p.y + Math.sin(behind) * 120;
  chaseSeek(game, e, tx, ty, 1, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0 && Util.dist(e.x, e.y, tx, ty) < 55) {
    const v = seekVector(e, p.x, p.y);
    e.dashing = true; e.dashTimer = 0.4;
    e.dashVX = v.x * e.speed * 4.6; e.dashVY = v.y * e.speed * 4.6;
  }
}

function aiSfShoalScatter(game, e, dt){
  const p = game.player, node = game.currentRoom;
  s79Init(e, 'scatterTimer', 0);
  s79Init(e, 'lastHp', e.hp);
  if (e.hp < e.lastHp) { e.scatterTimer = e.type.scatterTime || 0.85; e.lastHp = e.hp; }
  if (e.scatterTimer > 0) {
    e.scatterTimer -= dt;
    const v = seekVector(e, p.x, p.y);
    tryMoveEntity(e, node, node.obstacles, -v.x * e.speed * 1.6 * dt, -v.y * e.speed * 1.6 * dt);
    return;
  }
  chaseSeek(game, e, p.x, p.y, 1, dt);
}

function aiSfBelch(game, e, dt){
  const p = game.player;
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 22) > 0) ? 0.15 : 0;
    if (e.telegraph <= 0) s79Arc(game, e, 5, 0.62, 235, e.dmg, e.type.boltColor || '#8a7a4a', s79Aim(e, p), 6);
    return;
  }
  chaseSeek(game, e, p.x, p.y, 0.65, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0 && Util.dist(e.x, e.y, p.x, p.y) < 330) {
    e.attackTimer = e.type.fireCooldown || 3.0;
    e.telegraph = e.type.telegraphTime || 0.85;
  }
}

function aiSfSpiralIn(game, e, dt){
  const p = game.player;
  s79Init(e, 'spiralR', e.type.orbitRadius || 250);
  e.spiralR -= (e.type.closeRate || 42) * dt;
  if (e.spiralR < 45) e.spiralR = e.type.orbitRadius || 250;
  const bearing = Math.atan2(e.y - p.y, e.x - p.x) + 1.4 * e.orbitDir * 0.35;
  chaseSeek(game, e, p.x + Math.cos(bearing) * e.spiralR, p.y + Math.sin(bearing) * e.spiralR, 1, dt);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) {
    e.fireTimer = e.type.fireCooldown || 1.35;
    fireProjectileAngle(game, e, bearing + Math.PI / 2 * e.orbitDir, e.type.boltSpeed || 215, e.dmg,
      { color: e.type.boltColor || '#c0a8e0', radius: 5 });
  }
}

function aiSfPlow(game, e, dt){
  const node = game.currentRoom;
  s79Init(e, 'plowIdx', Math.floor(RNG.random() * 4));
  const DIRS4 = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  const d = DIRS4[e.plowIdx];
  const moved = tryMoveEntity(e, node, node.obstacles, d[0] * e.speed * dt, d[1] * e.speed * dt);
  if (!moved.movedX && !moved.movedY) {
    e.plowIdx = (e.plowIdx + (RNG.random() < 0.5 ? 1 : 3)) % 4;
    e.attackTimer = 0;
  }
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) {
    e.attackTimer = e.type.fireCooldown || 1.8;
    s79Arc(game, e, 3, 0.9, 165, e.dmg, e.type.boltColor || '#a89a7a', Math.atan2(d[1], d[0]), 5);
  }
}

function aiSfBlinkTrail(game, e, dt){
  const p = game.player;
  e.blinkTimer -= dt;
  if (e.blinkTimer > 0) return;
  e.blinkTimer = e.type.blinkCooldown || 1.15;
  const ang = s79Aim(e, p);
  const ox = e.x, oy = e.y;
  s79Warp(game, e, e.x + Math.cos(ang) * (e.type.blinkRange || 130), e.y + Math.sin(ang) * (e.type.blinkRange || 130));
  e.hitFlash = 0.12;
  fireProjectileAt(game, e, ox, oy, e.type.boltSpeed || 190, e.dmg, { color: e.type.boltColor || '#9ae0ff', radius: 5 });
  fireProjectileAt(game, e, p.x, p.y, e.type.boltSpeed || 190, e.dmg, { color: e.type.boltColor || '#9ae0ff', radius: 5 });
}

function aiSfSwell(game, e, dt){
  const p = game.player;
  s79Init(e, 'swellT', 0);
  s79Init(e, 'baseR', e.radius);
  e.swellT += dt;
  const k = Math.min(1, e.swellT / (e.type.swellTime || 12));
  e.radius = e.baseR * (1 + k * 0.8);
  chaseSeek(game, e, p.x, p.y, 0.5 + k * 0.7, dt);
  if (k >= 1) {
    const R = (e.type.blastRadius || 70) * 1.6;
    game.explosions.push(new Explosion(e.x, e.y, R));
    if (Util.dist(e.x, e.y, p.x, p.y) < R + p.radius) damagePlayer(game, playerDamageAmount(game, false, e.dmg), e.type.id);
    e.isDead = true;
    handleEnemyDeath(game, e);
  }
}

function aiSfWardPulse(game, e, dt){
  const p = game.player, node = game.currentRoom;
  const v = seekVector(e, p.x, p.y);
  if (v.d < (e.type.keepDistance || 250)) tryMoveEntity(e, node, node.obstacles, -v.x * e.speed * dt, -v.y * e.speed * dt);
  else chaseSeek(game, e, p.x, p.y, 0.6, dt);
  e.attackTimer -= dt;
  if (e.attackTimer > 0) return;
  e.attackTimer = e.type.wardCooldown || 4.6;
  let best = null, bestD = Infinity;
  for (const o of node.enemies) {
    if (o === e || o.isDead || o.shielded || o.isBoss) continue;
    const d = Util.dist(o.x, o.y, p.x, p.y);
    if (d < bestD) { bestD = d; best = o; }
  }
  if (!best) return;
  best.shielded = true; best.grantedShield = true;
  best.shieldTimer = e.type.wardTime || 2.4;
  e.hitFlash = 0.2;
}

function aiSfGraze(game, e, dt){
  const p = game.player;
  s79Init(e, 'lastHp', e.hp);
  if (!e.enraged && e.hp < e.lastHp) { e.enraged = true; e.hitFlash = 0.3; }
  e.lastHp = e.hp;
  if (!e.enraged) { aiWander(game, e, dt); return; }
  chaseSeek(game, e, p.x, p.y, e.type.rageSpeedMul || 1.6, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0 && Util.dist(e.x, e.y, p.x, p.y) < 300) {
    e.attackTimer = 2.2;
    fireProjectileAt(game, e, p.x, p.y, 250, e.dmg, { color: e.type.boltColor || '#e0a06a', radius: 6 });
  }
}

function aiSfHomingSpark(game, e, dt){
  const p = game.player;
  s79Init(e, 'sparks', []);
  for (let i = e.sparks.length - 1; i >= 0; i--) {
    const s = e.sparks[i];
    if (s.dead) { e.sparks.splice(i, 1); continue; }
    const a = Math.atan2(p.y - s.y, p.x - s.x);
    const sp = Math.hypot(s.vx, s.vy) || 1;
    s.vx += (Math.cos(a) * sp - s.vx) * (e.type.homing || 1.7) * dt;
    s.vy += (Math.sin(a) * sp - s.vy) * (e.type.homing || 1.7) * dt;
  }
  const v = seekVector(e, p.x, p.y);
  if (v.d < 200) tryMoveEntity(e, game.currentRoom, game.currentRoom.obstacles, -v.x * e.speed * dt, -v.y * e.speed * dt);
  else chaseSeek(game, e, p.x, p.y, 0.7, dt);
  e.fireTimer -= dt;
  if (e.fireTimer > 0) return;
  e.fireTimer = e.type.fireCooldown || 2.8;
  const ang = s79Aim(e, p);
  const sp = e.type.boltSpeed || 125;
  const proj = new Projectile(e.x, e.y, Math.cos(ang) * sp, Math.sin(ang) * sp, e.dmg, 'enemy',
    { color: e.type.boltColor || '#e0e07a', radius: 6, life: 5, source: e });
  game.projectiles.push(proj);
  e.sparks.push(proj);
}

function aiSfLungeLine(game, e, dt){
  const p = game.player, node = game.currentRoom;
  if (e.dashing) {
    tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
    e.dashTimer -= dt;
    if (e.dashTimer <= 0) { e.dashing = false; e.attackTimer = e.type.lungeCooldown || 3.0; }
    return;
  }
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 28) > 0) ? 0.16 : 0;
    if (e.telegraph <= 0) {
      const ang = Math.atan2(e.lobY - e.y, e.lobX - e.x);
      e.dashing = true; e.dashTimer = e.type.lungeTime || 0.7;
      e.dashVX = Math.cos(ang) * e.speed * 5.0; e.dashVY = Math.sin(ang) * e.speed * 5.0;
    }
    return;
  }
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) {
    e.lobX = p.x; e.lobY = p.y;
    e.telegraph = e.type.telegraphTime || 0.8;
  }
}

function aiTrPhaseStrike(game, e, dt){
  const p = game.player;
  s79Init(e, 'phaseTimer', 1.2);
  e.phaseTimer -= dt;
  if (e.submerged) {
    chaseSeek(game, e, p.x, p.y, 1.25, dt);
    if (e.phaseTimer <= 0) {
      e.submerged = false; e.shielded = false; e.hitFlash = 0.2;
      e.phaseTimer = e.type.solidTime || 1.1;
      s79Arc(game, e, 3, 0.5, 240, e.dmg, e.type.boltColor || '#9a6ad9', s79Aim(e, p), 5);
    }
  } else {
    chaseSeek(game, e, p.x, p.y, 0.9, dt);
    if (e.phaseTimer <= 0) {
      e.submerged = true; e.shielded = true;
      e.phaseTimer = e.type.phaseTime || 1.4;
    }
  }
}

function aiTrStomp(game, e, dt){
  const p = game.player;
  chaseSeek(game, e, p.x, p.y, 1, dt);
  e.attackTimer -= dt;
  if (e.attackTimer > 0) return;
  e.attackTimer = e.type.stompCooldown || 2.0;
  e.hitFlash = 0.2;
  s79Ring(game, e, 8, 145, e.dmg, e.type.boltColor || '#7a6a5a', RNG.random() * Math.PI * 2, 6);
}

function aiTrCrossVolley(game, e, dt){
  s79Init(e, 'crossAng', RNG.random() * Math.PI * 2);
  e.fireTimer -= dt;
  if (e.fireTimer > 0) return;
  e.fireTimer = e.type.fireCooldown || 1.55;
  e.crossAng += Math.PI / 6;
  s79Ring(game, e, 4, 260, e.dmg, e.type.boltColor || '#5ae0ff', e.crossAng, 6);
}

function aiTrTighten(game, e, dt){
  const p = game.player;
  s79Init(e, 'coilR', e.type.orbitRadius || 230);
  e.coilR = Math.max(e.type.minRadius || 34, e.coilR - (e.type.tightenRate || 20) * dt);
  const bearing = Math.atan2(e.y - p.y, e.x - p.x) + (e.type.orbitSpeed || 2.1) * e.orbitDir * 0.35;
  chaseSeek(game, e, p.x + Math.cos(bearing) * e.coilR, p.y + Math.sin(bearing) * e.coilR, 1, dt);
}

function aiTrMirror(game, e, dt){
  const p = game.player, node = game.currentRoom;
  s79Init(e, 'lastPX', p.x); s79Init(e, 'lastPY', p.y);
  const pvx = p.x - e.lastPX, pvy = p.y - e.lastPY;
  e.lastPX = p.x; e.lastPY = p.y;
  const v = seekVector(e, p.x, p.y);

  tryMoveEntity(e, node, node.obstacles,
    -pvx * (e.type.mirrorGain || 1.05) + v.x * e.speed * 0.35 * dt,
    -pvy * (e.type.mirrorGain || 1.05) + v.y * e.speed * 0.35 * dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0 && v.d < 260) {
    e.attackTimer = e.type.fireCooldown || 2.5;
    fireProjectileAt(game, e, p.x, p.y, 230, e.dmg, { color: e.type.boltColor || '#c94a6a', radius: 5 });
  }
}

function aiTrGulp(game, e, dt){
  const p = game.player, node = game.currentRoom;
  if (e.dashing) {
    tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
    e.dashTimer -= dt;
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) {
      e.fireTimer = 0.16;
      const back = Math.atan2(-e.dashVY, -e.dashVX);
      s79Arc(game, e, 3, 0.7, 175, e.dmg, e.type.boltColor || '#6a9a7a', back, 5);
    }
    if (e.dashTimer <= 0) { e.dashing = false; e.attackTimer = e.type.chargeCooldown || 2.4; }
    return;
  }
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = 0.12;
    if (e.telegraph <= 0) {
      const v = seekVector(e, p.x, p.y);
      e.dashing = true; e.dashTimer = 0.55; e.fireTimer = 0;
      e.dashVX = v.x * e.speed * 4.2; e.dashVY = v.y * e.speed * 4.2;
    }
    return;
  }
  chaseSeek(game, e, p.x, p.y, 0.7, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0 && Util.dist(e.x, e.y, p.x, p.y) < 300) e.telegraph = e.type.telegraphTime || 0.5;
}

function aiTrErupt(game, e, dt){
  s79Pyres(game, e, dt);
  e.attackTimer -= dt;
  if (e.attackTimer > 0) return;
  e.attackTimer = e.type.eruptCooldown || 3.4;
  e.hitFlash = 0.25;
  const n = 6, R = e.type.eruptRadius || 105;
  const off = RNG.random() * Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const a = off + (i / n) * Math.PI * 2;
    s79Pyre(e, e.x + Math.cos(a) * R, e.y + Math.sin(a) * R, 0.85, 50);
  }
}

function aiTrZigzag(game, e, dt){
  const p = game.player, node = game.currentRoom;
  s79Init(e, 'zigTimer', 0);
  s79Init(e, 'zigVX', 0); s79Init(e, 'zigVY', 0);
  e.zigTimer -= dt;
  if (e.zigTimer <= 0) {
    e.zigTimer = e.type.zigPeriod || 0.24;
    const base = s79Aim(e, p);
    const kink = (RNG.random() < 0.5 ? -1 : 1) * (0.6 + RNG.random() * 0.5);
    e.zigVX = Math.cos(base + kink) * e.speed * 2.2;
    e.zigVY = Math.sin(base + kink) * e.speed * 2.2;
  }
  tryMoveEntity(e, node, node.obstacles, e.zigVX * dt, e.zigVY * dt);
}

function aiTrStillMend(game, e, dt){
  const p = game.player, node = game.currentRoom;
  s79Init(e, 'stillT', 0);
  const v = seekVector(e, p.x, p.y);
  if (v.d < (e.type.fleeRange || 150)) {
    e.stillT = 0;
    tryMoveEntity(e, node, node.obstacles, -v.x * e.speed * dt, -v.y * e.speed * dt);
    return;
  }
  e.stillT += dt;
  if (e.stillT < (e.type.chargeUp || 1.2)) return;
  e.healTimer -= dt;
  if (e.healTimer > 0) return;
  e.healTimer = e.type.healCooldown || 2.6;
  e.hitFlash = 0.2;
  for (const o of node.enemies) {
    if (o === e || o.isDead || o.isBoss || o.hp >= o.maxHp) continue;
    if (Util.dist(o.x, o.y, e.x, e.y) > (e.type.healRadius || 200)) continue;
    o.hp = Math.min(o.maxHp, o.hp + (e.type.healAmount || 3));
    o.hitFlash = 0.1;
  }
}

function aiTrAxisGuard(game, e, dt){
  const p = game.player;
  const dx = Math.abs(p.x - e.x), dy = Math.abs(p.y - e.y);
  const band = e.type.axisBand || 46;
  chaseSeek(game, e, p.x, p.y, 0.3, dt);
  e.fireTimer -= dt;
  if (e.fireTimer > 0) return;
  if (dy < band) {
    e.fireTimer = e.type.fireCooldown || 1.3;
    const dir = (p.x > e.x) ? 0 : Math.PI;
    s79Arc(game, e, 3, 0.22, 300, e.dmg, e.type.boltColor || '#e0d47a', dir, 5);
  } else if (dx < band) {
    e.fireTimer = e.type.fireCooldown || 1.3;
    const dir = (p.y > e.y) ? Math.PI / 2 : -Math.PI / 2;
    s79Arc(game, e, 3, 0.22, 300, e.dmg, e.type.boltColor || '#e0d47a', dir, 5);
  }
}

function aiTrFigureEight(game, e, dt){
  const p = game.player;
  s79Init(e, 'lissa', 0);
  s79Pyres(game, e, dt);
  e.lissa += (e.type.figureSpeed || 1.25) * dt;
  const R = e.type.figureRadius || 165;
  const tx = p.x + Math.sin(e.lissa) * R;
  const ty = p.y + Math.sin(e.lissa * 2) * R * 0.55;
  chaseSeek(game, e, tx, ty, 1, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) {
    e.attackTimer = e.type.dropCooldown || 1.5;
    s79Pyre(e, e.x, e.y, 1.0, e.type.burstRadius || 48);
  }
}

function aiTrLatch(game, e, dt){
  const p = game.player, node = game.currentRoom;
  s79Init(e, 'latched', false);
  s79Init(e, 'latchT', 0);
  if (e.latched) {
    e.latchT -= dt;
    tryMoveEntity(e, node, node.obstacles, (p.x - e.x) * 0.55, (p.y - e.y) * 0.55);

    if (e.latchT <= 0) { e.latched = false; e.latchT = 0; }
    return;
  }
  chaseSeek(game, e, p.x, p.y, 1, dt);
  if (Util.dist(e.x, e.y, p.x, p.y) < e.radius + p.radius + 4) {
    e.latched = true;
    e.latchT = e.type.latchTime || 2.6;
    e.hitFlash = 0.2;
  }
}

function aiTrArmorCycle(game, e, dt){
  const p = game.player;
  s79Init(e, 'cycleT', e.type.armorTime || 2.4);
  e.cycleT -= dt;
  if (e.cycleT <= 0) {
    e.shielded = !e.shielded;
    e.cycleT = e.shielded ? (e.type.armorTime || 2.4) : (e.type.softTime || 1.2);
    e.hitFlash = 0.15;
    e.fireTimer = 0;
  }
  if (e.shielded) { chaseSeek(game, e, p.x, p.y, 1, dt); return; }
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) {
    e.fireTimer = 0.35;
    fireProjectileAt(game, e, p.x, p.y, 265, e.dmg, { color: e.type.boltColor || '#e08a5a', radius: 5 });
  }
}

function aiTrLeadShot(game, e, dt){
  const p = game.player;
  s79Init(e, 'prevX', p.x); s79Init(e, 'prevY', p.y);
  const pvx = (p.x - e.prevX) / Math.max(dt, 0.0001), pvy = (p.y - e.prevY) / Math.max(dt, 0.0001);
  e.prevX = p.x; e.prevY = p.y;
  const v = seekVector(e, p.x, p.y);
  if (v.d < (e.type.keepDistance || 280)) {
    tryMoveEntity(e, game.currentRoom, game.currentRoom.obstacles, -v.x * e.speed * dt, -v.y * e.speed * dt);
  }
  e.fireTimer -= dt;
  if (e.fireTimer > 0) return;
  e.fireTimer = e.type.fireCooldown || 1.8;
  const sp = e.type.boltSpeed || 330;
  const lead = Math.min(1.1, v.d / sp);
  fireProjectileAt(game, e, p.x + pvx * lead, p.y + pvy * lead, sp, e.dmg,
    { color: e.type.boltColor || '#ff6a9a', radius: 5 });
}

function aiTrCaveIn(game, e, dt){
  const p = game.player;
  s79Pyres(game, e, dt);
  chaseSeek(game, e, p.x, p.y, 0.5, dt);
  e.attackTimer -= dt;
  if (e.attackTimer > 0) return;
  e.attackTimer = e.type.collapseCooldown || 3.2;
  const off = RNG.random() * Math.PI * 2, R = e.type.ringRadius || 90;
  for (let i = 0; i < 3; i++) {
    const a = off + (i / 3) * Math.PI * 2;
    s79Pyre(e, p.x + Math.cos(a) * R, p.y + Math.sin(a) * R, 0.95, e.type.burstRadius || 58);
  }
}

function aiBossTideCaller(game, e, dt){
  const p = game.player;
  s79Init(e, 'tideT', 0);
  if (e.tideT > 0) {
    e.tideT -= dt;
    e.hitFlash = (Math.sin(e.tideT * 16) > 0) ? 0.14 : 0;
    s79Drag(game, e, 120, dt);
    if (e.tideT <= 0) e.attackTimer = 1.1;
    return;
  }
  chaseSeek(game, e, p.x, p.y, 0.55, dt);
  e.attackTimer -= dt;
  if (e.attackTimer > 0) return;
  e.pattern = (e.pattern + 1) % 3;
  if (e.pattern === 0) {
    e.attackTimer = Util.rand(1.5, 1.9);
    s79Ring(game, e, 14, 165, 2, '#4fa8d6', RNG.random() * Math.PI * 2, 6);
  } else if (e.pattern === 1) {
    e.attackTimer = Util.rand(1.4, 1.8);
    s79Arc(game, e, 7, 1.35, 235, 2, '#cfe8f5', s79Aim(e, p), 6);
  } else {
    e.tideT = 1.5;
  }
}

function aiBossMaelstrom(game, e, dt){
  const p = game.player;
  s79Drag(game, e, 46, dt);
  e.spinAngle += (e.enraged ? 3.1 : 2.2) * dt;
  chaseSeek(game, e, p.x, p.y, 0.3, dt);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) {
    e.fireTimer = e.enraged ? 0.1 : 0.15;
    const arms = e.enraged ? 3 : 2;
    for (let i = 0; i < arms; i++) {
      fireProjectileAngle(game, e, e.spinAngle + (i / arms) * Math.PI * 2, 150, 2, { color: '#2e8ab0', radius: 6 });
    }
  }
  if (!e.enraged && e.hp < e.maxHp * 0.45) { e.enraged = true; e.hitFlash = 0.4; }
}

function aiBossLeviathanWake(game, e, dt){
  const p = game.player, node = game.currentRoom;
  s79Pyres(game, e, dt);
  if (e.submerged) {
    tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
    e.dashTimer -= dt;
    s79Init(e, 'wakeDrop', 0);
    e.wakeDrop -= dt;
    if (e.wakeDrop <= 0) { e.wakeDrop = 0.14; s79Pyre(e, e.x, e.y, 0.8, 62); }
    if (e.dashTimer <= 0) {
      e.submerged = false; e.shielded = false;
      s79Ring(game, e, 12, 185, 2, '#1f5b80', RNG.random() * Math.PI * 2, 6);
      e.attackTimer = Util.rand(2.2, 2.8);
    }
    return;
  }
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 30) > 0) ? 0.14 : 0;
    if (e.telegraph <= 0) {
      const v = seekVector(e, p.x, p.y);
      e.submerged = true; e.shielded = true;
      e.dashTimer = 1.1; e.wakeDrop = 0;
      e.dashVX = v.x * e.speed * 3.6; e.dashVY = v.y * e.speed * 3.6;
    }
    return;
  }
  chaseSeek(game, e, p.x, p.y, 0.6, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) {
    if (RNG.random() < 0.4) { e.attackTimer = Util.rand(1.3, 1.7); s79Arc(game, e, 5, 0.85, 215, 2, '#7fd4e8', s79Aim(e, p), 6); }
    else e.telegraph = 0.6;
  }
}

function aiBossBellDiver(game, e, dt){
  const p = game.player;
  s79Pyres(game, e, dt);
  const v = seekVector(e, p.x, p.y);
  if (v.d < 190) tryMoveEntity(e, game.currentRoom, game.currentRoom.obstacles, -v.x * e.speed * dt, -v.y * e.speed * dt);
  else chaseSeek(game, e, p.x, p.y, 0.5, dt);
  s79Init(e, 'escortTimer', 3.0);
  e.escortTimer -= dt;
  const spawned = e.minionsSpawned || 0;
  if (e.escortTimer <= 0 && spawned < 6) {
    e.escortTimer = Util.rand(6.0, 7.0);
    s79Spawn(game, e, 'bubblemine', 80);
    s79Spawn(game, e, 'bubblemine', 80);
    e.minionsSpawned = spawned + 2;
    e.hitFlash = 0.25;
  }
  e.attackTimer -= dt;
  if (e.attackTimer > 0) return;
  e.attackTimer = Util.rand(2.0, 2.5);
  for (let i = 0; i < 4; i++) {
    const a = RNG.random() * Math.PI * 2, r = RNG.random() * 70;
    s79Pyre(e, p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 1.0 + i * 0.1, 58);
  }
}

function aiBossSiltMonarch(game, e, dt){
  const p = game.player;
  s79Pyres(game, e, dt);
  s79Init(e, 'diveT', 3.0);
  e.diveT -= dt;
  if (e.submerged) {
    chaseSeek(game, e, p.x, p.y, 1.5, dt);
    if (e.diveT <= 0) {
      e.submerged = false; e.shielded = false;
      s79Pyre(e, e.x, e.y, 0.5, 78);
      s79Ring(game, e, 10, 175, 2, '#8a7a4a', RNG.random() * Math.PI * 2, 6);
      e.diveT = Util.rand(3.4, 4.2);
    }
    return;
  }
  chaseSeek(game, e, p.x, p.y, 0.55, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) {
    e.attackTimer = Util.rand(1.5, 1.9);
    s79Ring(game, e, 13, 135, 2, '#a89a7a', RNG.random() * Math.PI * 2, 5);
  }
  if (e.diveT <= 0) { e.submerged = true; e.shielded = true; e.diveT = 1.6; e.navPath = null; e.pathTimer = 0; }
}

function aiBossLanternQueen(game, e, dt){
  const p = game.player;
  s79Init(e, 'litT', 4.0);
  e.litT -= dt;
  if (e.shielded) {

    e.spinAngle += 1.1 * dt;
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) {
      e.fireTimer = 0.85;
      const n = 14, gap = Math.floor(((e.spinAngle % (Math.PI * 2)) / (Math.PI * 2)) * n);
      for (let i = 0; i < n; i++) {
        if (i === gap || i === (gap + 1) % n) continue;
        fireProjectileAngle(game, e, (i / n) * Math.PI * 2, 115, 2, { color: '#7ae0c0', radius: 6 });
      }
    }
    if (e.litT <= 0) { e.shielded = false; e.litT = 4.2; e.hitFlash = 0.4; }
    return;
  }

  chaseSeek(game, e, p.x, p.y, 0.95, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) {
    e.attackTimer = Util.rand(1.0, 1.4);
    s79Arc(game, e, 2, 0.3, 285, 2, '#d9ffe8', s79Aim(e, p), 5);
  }
  if (e.litT <= 0) { e.shielded = true; e.litT = 3.4; e.fireTimer = 0; e.hitFlash = 0.4; }
}

function aiBossPressureHulk(game, e, dt){
  const p = game.player;
  if (e.exhaustTimer > 0) {
    e.exhaustTimer -= dt;
    e.hitFlash = (Math.sin(e.exhaustTimer * 8) > 0) ? 0.1 : 0;
    if (e.exhaustTimer <= 0) e.attackTimer = Util.rand(1.4, 1.9);
    return;
  }
  if (e.pulseCount > 0) {
    e.pulseTimer -= dt;
    if (e.pulseTimer <= 0) {
      const idx = 3 - e.pulseCount;
      e.pulseTimer = 0.42;
      s79Ring(game, e, 12 + idx * 2, 130 + idx * 55, 2, '#4a6a7a', idx * 0.31 + RNG.random() * 0.2, 6);
      e.pulseCount--;
      if (e.pulseCount <= 0) e.exhaustTimer = 1.6;
    }
    return;
  }
  chaseSeek(game, e, p.x, p.y, 0.5, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) { e.pulseCount = 3; e.pulseTimer = 0.2; }
}

function aiBossElderNautilus(game, e, dt){
  const p = game.player;
  s79Init(e, 'shellHp', e.maxHp);
  s79Init(e, 'shellT', 0);
  if (e.shielded) {
    e.shellT -= dt;
    e.spinAngle += 2.6 * dt;
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) {
      e.fireTimer = 0.13;
      fireProjectileAngle(game, e, e.spinAngle, 160, 2, { color: '#c0a8e0', radius: 5 });
      fireProjectileAngle(game, e, e.spinAngle + Math.PI, 160, 2, { color: '#c0a8e0', radius: 5 });
    }
    if (e.shellT <= 0) { e.shielded = false; e.shellHp = e.hp; e.hitFlash = 0.35; }
    return;
  }
  const R = 175;
  const bearing = Math.atan2(e.y - p.y, e.x - p.x) + 1.5 * e.orbitDir * 0.35;
  chaseSeek(game, e, p.x + Math.cos(bearing) * R, p.y + Math.sin(bearing) * R, 1, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) {
    e.attackTimer = Util.rand(1.1, 1.5);
    fireProjectileAngle(game, e, bearing + Math.PI / 2 * e.orbitDir, 250, 2, { color: '#e0d0ff', radius: 6 });
  }

  if (e.hp < e.shellHp - e.maxHp * 0.16) { e.shielded = true; e.shellT = 2.6; e.fireTimer = 0; e.hitFlash = 0.35; }
}

function aiBossHadalWarden(game, e, dt){
  const p = game.player;
  if (e.spinTimer > 0) {
    e.spinTimer -= dt;
    e.spinAngle += (e.enraged ? 1.9 : 1.35) * dt;
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) {
      e.fireTimer = 0.1;
      s79Ring(game, e, 4, 300, 2, '#5ae0ff', e.spinAngle, 5);
    }
    return;
  }
  chaseSeek(game, e, p.x, p.y, 0.7, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) {
    e.attackTimer = Util.rand(3.0, 3.6);
    e.spinTimer = e.enraged ? 2.6 : 2.0;
    e.spinAngle = s79Aim(e, p);
    e.fireTimer = 0;
  }
  if (!e.enraged && e.hp < e.maxHp * 0.4) { e.enraged = true; e.hitFlash = 0.4; }
}

function aiBossTheCrush(game, e, dt){
  const p = game.player;
  s79Init(e, 'squeeze', 0);
  s79Init(e, 'gapAng', 0);
  if (e.squeeze > 0) {
    e.squeeze -= dt;
    e.hitFlash = (Math.sin(e.squeeze * 18) > 0) ? 0.15 : 0;
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) {
      e.fireTimer = 0.5;
      e.gapAng += 0.8;
      const n = 18, gap = Math.floor(((e.gapAng % (Math.PI * 2)) / (Math.PI * 2)) * n);
      for (let i = 0; i < n; i++) {
        if (i === gap || i === (gap + 1) % n || i === (gap + 2) % n) continue;
        fireProjectileAngle(game, e, (i / n) * Math.PI * 2, 130, 2, { color: '#8a3a4a', radius: 7 });
      }
    }
    return;
  }
  chaseSeek(game, e, p.x, p.y, 1.15, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) {
    e.attackTimer = Util.rand(4.4, 5.2);
    e.squeeze = 2.1; e.fireTimer = 0;
    e.gapAng = s79Aim(e, p) + Math.PI;
  }
}

function aiBossSmokerColossus(game, e, dt){
  const p = game.player;
  s79Pyres(game, e, dt);
  chaseSeek(game, e, p.x, p.y, 0.28, dt);
  s79Init(e, 'ventT', 4.0);
  e.ventT -= dt;
  const spawned = e.minionsSpawned || 0;
  if (e.ventT <= 0 && spawned < 8) {
    e.ventT = Util.rand(5.5, 6.5);
    s79Spawn(game, e, 'blacksmoker', 110);
    e.minionsSpawned = spawned + 1;
    e.hitFlash = 0.3;
  }
  e.attackTimer -= dt;
  if (e.attackTimer > 0) return;
  e.attackTimer = Util.rand(2.4, 3.0);
  e.pattern = (e.pattern + 1) % 2;
  if (e.pattern === 0) {

    for (let ring = 1; ring <= 3; ring++) {
      const n = 4 + ring * 2, off = RNG.random() * Math.PI * 2;
      for (let i = 0; i < n; i++) {
        const a = off + (i / n) * Math.PI * 2;
        s79Pyre(e, e.x + Math.cos(a) * ring * 78, e.y + Math.sin(a) * ring * 78, 0.6 + ring * 0.25, 54);
      }
    }
  } else {

    const a = s79Aim(e, p);
    for (let i = 1; i <= 6; i++) s79Pyre(e, e.x + Math.cos(a) * i * 62, e.y + Math.sin(a) * i * 62, 0.35 + i * 0.13, 52);
  }
}

function aiBossTrenchmaw(game, e, dt){
  const p = game.player, node = game.currentRoom;
  if (e.dashing) {
    tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
    e.dashTimer -= dt;
    if (e.dashTimer <= 0) {
      e.dashing = false;
      s79Arc(game, e, 7, 1.1, 250, 3, '#c94a6a', Math.atan2(e.dashVY, e.dashVX), 6);
      e.attackTimer = Util.rand(2.0, 2.6);
    }
    return;
  }
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    s79Drag(game, e, 165, dt);
    e.hitFlash = (Math.sin(e.telegraph * 26) > 0) ? 0.16 : 0;
    if (e.telegraph <= 0) {
      const v = seekVector(e, p.x, p.y);
      e.dashing = true; e.dashTimer = 0.7;
      e.dashVX = v.x * e.speed * 4.6; e.dashVY = v.y * e.speed * 4.6;
    }
    return;
  }
  s79Drag(game, e, 62, dt);
  chaseSeek(game, e, p.x, p.y, 0.55, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) {
    if (RNG.random() < 0.35) { e.attackTimer = Util.rand(1.2, 1.6); s79Ring(game, e, 11, 175, 2, '#6a1e30', RNG.random() * Math.PI * 2, 6); }
    else e.telegraph = 0.8;
  }
}

function s79Phase(game, e, dt, bands, ringColor){
  const frac = e.hp / e.maxHp;
  let want = 0;
  for (let i = 0; i < bands.length; i++) if (frac <= bands[i]) want = i + 1;
  if (want !== e.phaseIndex) {
    e.phaseIndex = want;
    e.phaseShift = 1.0;
    e.attackTimer = 0.25; e.telegraph = 0; e.fireTimer = 0;
    e.spinTimer = 0; e.pulseCount = 0; e.dashing = false;
    e.submerged = false; e.shielded = false;
    s79Ring(game, e, 16, 145, 3, ringColor, RNG.random() * Math.PI * 2, 6);
  }
  if (e.phaseShift > 0) {
    e.phaseShift -= dt;
    e.hitFlash = 0.12;
    return true;
  }
  return false;
}

function aiBossJapanDnb(game, e, dt){
  const p = game.player, node = game.currentRoom;
  s79Pyres(game, e, dt);
  if (s79Phase(game, e, dt, [0.75, 0.5, 0.25], '#e0f4ff')) return;
  const ph = e.phaseIndex;
  s79Drag(game, e, 24 + ph * 22, dt);

  if (ph === 0) {

    chaseSeek(game, e, p.x, p.y, 0.6, dt);
    e.attackTimer -= dt;
    if (e.attackTimer <= 0) {
      e.attackTimer = Util.rand(1.4, 1.8);
      e.pattern = (e.pattern + 1) % 2;
      const aim = s79Aim(e, p) + (e.pattern ? 0.35 : -0.35);
      s79Arc(game, e, 9, 1.8, 215, 3, '#ffd0a0', aim, 6);
    }
    return;
  }
  if (ph === 1) {

    if (e.spinTimer > 0) {
      e.spinTimer -= dt;
      e.fireTimer -= dt;
      if (e.fireTimer <= 0) {
        e.fireTimer = 0.55;
        e.spinAngle += 0.95;
        const n = 16, gap = Math.floor(((e.spinAngle % (Math.PI * 2)) / (Math.PI * 2)) * n);
        for (let i = 0; i < n; i++) {
          if (i === gap || i === (gap + 1) % n) continue;
          fireProjectileAngle(game, e, (i / n) * Math.PI * 2, 140, 3, { color: '#4fa8d6', radius: 7 });
        }
      }
      return;
    }
    chaseSeek(game, e, p.x, p.y, 0.5, dt);
    e.attackTimer -= dt;
    if (e.attackTimer <= 0) {
      e.attackTimer = Util.rand(2.6, 3.2);
      e.spinTimer = 2.3; e.fireTimer = 0;
      e.spinAngle = s79Aim(e, p) + Math.PI;
    }
    return;
  }
  if (ph === 2) {

    if (e.dashing) {
      tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
      e.dashTimer -= dt;
      s79Init(e, 'wakeDrop', 0);
      e.wakeDrop -= dt;
      if (e.wakeDrop <= 0) { e.wakeDrop = 0.12; s79Pyre(e, e.x, e.y, 0.75, 64); }
      if (e.dashTimer <= 0) { e.dashing = false; e.attackTimer = Util.rand(1.1, 1.5); s79Ring(game, e, 10, 195, 3, '#cfe8f5', RNG.random() * Math.PI * 2, 6); }
      return;
    }
    if (e.telegraph > 0) {
      e.telegraph -= dt;
      e.hitFlash = (Math.sin(e.telegraph * 30) > 0) ? 0.15 : 0;
      if (e.telegraph <= 0) {
        const v = seekVector(e, p.x, p.y);
        e.dashing = true; e.dashTimer = 0.85; e.wakeDrop = 0;
        e.dashVX = v.x * e.speed * 4.0; e.dashVY = v.y * e.speed * 4.0;
      }
      return;
    }
    chaseSeek(game, e, p.x, p.y, 0.8, dt);
    e.attackTimer -= dt;
    if (e.attackTimer <= 0) e.telegraph = 0.5;
    return;
  }

  e.spinAngle += 1.45 * dt;
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) {
    e.fireTimer = 0.17;
    for (let i = 0; i < 3; i++) fireProjectileAngle(game, e, e.spinAngle + (i / 3) * Math.PI * 2, 145, 3, { color: '#2e8ab0', radius: 6 });
  }
  chaseSeek(game, e, p.x, p.y, 0.3, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) {
    e.attackTimer = Util.rand(1.7, 2.1);
    s79Arc(game, e, 7, 1.2, 250, 3, '#ffd0a0', s79Aim(e, p), 6);
  }
}

function aiBossDeanNb(game, e, dt){
  const p = game.player, node = game.currentRoom;
  s79Pyres(game, e, dt);
  if (s79Phase(game, e, dt, [0.72, 0.45, 0.2], '#7ae0c0')) return;
  const ph = e.phaseIndex;
  s79Init(e, 'cycleT', 3.6);
  s79Init(e, 'lit', true);
  e.cycleT -= dt;
  if (e.cycleT <= 0) {
    e.lit = !e.lit;
    e.shielded = !e.lit;
    e.cycleT = e.lit ? (3.6 - ph * 0.6) : (2.0 + ph * 0.35);
    e.fireTimer = 0; e.attackTimer = 0.3;
    e.hitFlash = 0.4;
  }

  if (!e.lit) {

    e.spinAngle += (0.9 + ph * 0.25) * dt;
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) {
      e.fireTimer = 0.7;
      const n = 14 + ph * 2, gap = Math.floor(((e.spinAngle % (Math.PI * 2)) / (Math.PI * 2)) * n);
      for (let i = 0; i < n; i++) {
        if (i === gap || i === (gap + 1) % n) continue;
        fireProjectileAngle(game, e, (i / n) * Math.PI * 2, 120, 3, { color: '#7ae0c0', radius: 6 });
      }
    }
    if (ph >= 2) {
      e.attackTimer -= dt;
      if (e.attackTimer <= 0) { e.attackTimer = 1.3; s79Pyre(e, p.x, p.y, 0.95, 60); }
    }
    return;
  }

  chaseSeek(game, e, p.x, p.y, 0.85 + ph * 0.1, dt);
  s79Init(e, 'escortT', 2.5);
  e.escortT -= dt;
  const spawned = e.minionsSpawned || 0;
  if (e.escortT <= 0 && spawned < 8) {
    e.escortT = Util.rand(5.0, 6.0);
    s79Spawn(game, e, 'lanternshoal', 90);
    s79Spawn(game, e, 'lanternshoal', 90);
    e.minionsSpawned = spawned + 2;
  }
  e.attackTimer -= dt;
  if (e.attackTimer > 0) return;
  if (ph === 0) {
    e.attackTimer = Util.rand(1.0, 1.4);
    s79Arc(game, e, 3, 0.45, 275, 3, '#d9ffe8', s79Aim(e, p), 5);
  } else if (ph === 1) {
    e.attackTimer = Util.rand(1.1, 1.4);
    s79Ring(game, e, 11, 185, 3, '#d9ffe8', RNG.random() * Math.PI * 2, 5);
  } else {
    e.attackTimer = Util.rand(0.9, 1.2);
    s79Arc(game, e, 5, 0.7, 285, 3, '#d9ffe8', s79Aim(e, p), 5);
    if (ph >= 3) s79Ring(game, e, 8, 165, 3, '#7ae0c0', RNG.random() * Math.PI * 2, 5);
  }
}

function aiBossIsraelPrimePrime(game, e, dt){
  const p = game.player, node = game.currentRoom;
  s79Pyres(game, e, dt);
  if (s79Phase(game, e, dt, [0.8, 0.6, 0.4, 0.2], '#5ae0ff')) return;
  const ph = e.phaseIndex;

  s79Init(e, 'blinkT', 2.4);
  e.blinkT -= dt;
  if (e.blinkT <= 0 && !e.dashing) {
    e.blinkT = Math.max(1.1, 2.6 - ph * 0.35);
    const a = RNG.random() * Math.PI * 2, r = 150 + RNG.random() * 90;
    s79Ring(game, e, 6, 180, 3, '#3a6ec9', a, 5);
    s79Warp(game, e, p.x + Math.cos(a) * r, p.y + Math.sin(a) * r);
    e.hitFlash = 0.25;
  }

  if (ph === 0) {

    e.spinAngle += 1.15 * dt;
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) { e.fireTimer = 0.22; s79Ring(game, e, 4, 300, 3, '#5ae0ff', e.spinAngle, 6); }
    chaseSeek(game, e, p.x, p.y, 0.4, dt);
    return;
  }
  if (ph === 1) {

    e.spinAngle += 1.5 * dt;
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) {
      e.fireTimer = 0.16;
      s79Ring(game, e, 3, 205, 3, '#5ae0ff', e.spinAngle, 6);
      s79Ring(game, e, 3, 165, 3, '#c94a6a', -e.spinAngle * 1.3, 6);
    }
    chaseSeek(game, e, p.x, p.y, 0.35, dt);
    return;
  }
  if (ph === 2) {

    chaseSeek(game, e, p.x, p.y, 0.5, dt);
    e.attackTimer -= dt;
    if (e.attackTimer <= 0) {
      e.attackTimer = Util.rand(1.7, 2.1);
      const off = RNG.random() * Math.PI * 2;
      for (let ring = 3; ring >= 1; ring--) {
        const n = 3 + ring * 2;
        for (let i = 0; i < n; i++) {
          const a = off + (i / n) * Math.PI * 2;
          s79Pyre(e, p.x + Math.cos(a) * ring * 72, p.y + Math.sin(a) * ring * 72, 0.5 + (4 - ring) * 0.28, 56);
        }
      }
    }
    return;
  }
  if (ph === 3) {

    if (e.spinTimer > 0) {
      e.spinTimer -= dt;
      e.fireTimer -= dt;
      if (e.fireTimer <= 0) {
        e.fireTimer = 0.42;
        e.spinAngle += 0.75;
        const n = 20, gap = Math.floor(((e.spinAngle % (Math.PI * 2)) / (Math.PI * 2)) * n);
        for (let i = 0; i < n; i++) {
          if (i === gap || i === (gap + 1) % n) continue;
          fireProjectileAngle(game, e, (i / n) * Math.PI * 2, 135, 3, { color: '#1e4a6a', radius: 7 });
        }
      }
      return;
    }
    chaseSeek(game, e, p.x, p.y, 0.45, dt);
    e.attackTimer -= dt;
    if (e.attackTimer <= 0) {
      e.attackTimer = Util.rand(2.4, 2.9);
      s79Arc(game, e, 5, 0.8, 300, 3, '#5ae0ff', s79Aim(e, p), 6);
      e.spinTimer = 2.0; e.fireTimer = 0;
      e.spinAngle = s79Aim(e, p) + Math.PI;
    }
    return;
  }

  e.spinAngle += 1.25 * dt;
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) {
    e.fireTimer = 0.3;
    s79Ring(game, e, 4, 285, 3, '#5ae0ff', e.spinAngle, 6);
    s79Ring(game, e, 2, 170, 3, '#c94a6a', -e.spinAngle * 1.4, 6);
  }
  chaseSeek(game, e, p.x, p.y, 0.55, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) {
    e.attackTimer = Util.rand(1.5, 1.9);
    const off = RNG.random() * Math.PI * 2;
    for (let i = 0; i < 4; i++) {
      const a = off + (i / 4) * Math.PI * 2;
      s79Pyre(e, p.x + Math.cos(a) * 88, p.y + Math.sin(a) * 88, 0.9, 58);
    }
    s79Arc(game, e, 5, 0.9, 265, 3, '#e0f4ff', s79Aim(e, p), 6);
  }
}

Object.assign(ENEMY_BEHAVIOR_HANDLERS, {

  ocSurge: aiOcSurge,
  ocJellyPulse: aiOcJellyPulse,
  ocNetcast: aiOcNetcast,
  ocBubbleMine: aiOcBubbleMine,
  ocPassBy: aiOcPassBy,
  ocKrillDrift: aiOcKrillDrift,
  ocLure: aiOcLure,
  ocSpout: aiOcSpout,
  ocClamp: aiOcClamp,
  ocUndertow: aiOcUndertow,
  ocBrineLob: aiOcBrineLob,
  ocDiveBomb: aiOcDiveBomb,
  ocRicochet: aiOcRicochet,
  ocEelWeave: aiOcEelWeave,
  ocFoamWash: aiOcFoamWash,

  sfSiltStalk: aiSfSiltStalk,
  sfGlowPulse: aiSfGlowPulse,
  sfSidleCrab: aiSfSidleCrab,
  sfVentJet: aiSfVentJet,
  sfFlank: aiSfFlank,
  sfShoalScatter: aiSfShoalScatter,
  sfBelch: aiSfBelch,
  sfSpiralIn: aiSfSpiralIn,
  sfPlow: aiSfPlow,
  sfBlinkTrail: aiSfBlinkTrail,
  sfSwell: aiSfSwell,
  sfWardPulse: aiSfWardPulse,
  sfGraze: aiSfGraze,
  sfHomingSpark: aiSfHomingSpark,
  sfLungeLine: aiSfLungeLine,

  trPhaseStrike: aiTrPhaseStrike,
  trStomp: aiTrStomp,
  trCrossVolley: aiTrCrossVolley,
  trTighten: aiTrTighten,
  trMirror: aiTrMirror,
  trGulp: aiTrGulp,
  trErupt: aiTrErupt,
  trZigzag: aiTrZigzag,
  trStillMend: aiTrStillMend,
  trAxisGuard: aiTrAxisGuard,
  trFigureEight: aiTrFigureEight,
  trLatch: aiTrLatch,
  trArmorCycle: aiTrArmorCycle,
  trLeadShot: aiTrLeadShot,
  trCaveIn: aiTrCaveIn,

  bossTideCaller: aiBossTideCaller,
  bossMaelstrom: aiBossMaelstrom,
  bossLeviathanWake: aiBossLeviathanWake,
  bossBellDiver: aiBossBellDiver,
  bossSiltMonarch: aiBossSiltMonarch,
  bossLanternQueen: aiBossLanternQueen,
  bossPressureHulk: aiBossPressureHulk,
  bossElderNautilus: aiBossElderNautilus,
  bossHadalWarden: aiBossHadalWarden,
  bossTheCrush: aiBossTheCrush,
  bossSmokerColossus: aiBossSmokerColossus,
  bossTrenchmaw: aiBossTrenchmaw,

  bossJapanDnb: aiBossJapanDnb,
  bossDeanNb: aiBossDeanNb,
  bossIsraelPrimePrime: aiBossIsraelPrimePrime,
});
