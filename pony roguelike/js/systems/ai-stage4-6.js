'use strict';

function g1Ring(game, e, n, speed, dmg, opts, offset){
  for (let i = 0; i < n; i++) fireProjectileAngle(game, e, (offset || 0) + (i / n) * Math.PI * 2, speed, dmg, opts);
}

function g1Fan(game, e, aim, n, spread, speed, dmg, opts){
  if (n <= 1) { fireProjectileAngle(game, e, aim, speed, dmg, opts); return; }
  const step = spread / (n - 1);
  for (let i = 0; i < n; i++) fireProjectileAngle(game, e, aim - spread / 2 + step * i, speed, dmg, opts);
}

function g1AimAtPlayer(game, e){
  return Math.atan2(game.player.y - e.y, game.player.x - e.x);
}

function g1Dash(game, e, dt){
  if (!e.dashing) return false;
  const node = game.currentRoom;
  tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
  e.dashTimer -= dt;
  if (e.dashTimer <= 0) { e.dashing = false; e.dashVX = 0; e.dashVY = 0; }
  return true;
}

function g1StartDash(e, ang, mult, time){
  e.dashing = true; e.dashTimer = time;
  e.dashVX = Math.cos(ang) * e.speed * mult;
  e.dashVY = Math.sin(ang) * e.speed * mult;
}

function g1Blink(game, e, x, y){
  const node = game.currentRoom;
  const tx = Util.clamp(Math.floor(x / TILE), 1, node.tileW - 2);
  const ty = Util.clamp(Math.floor(y / TILE), 1, node.tileH - 2);
  const spot = findNearestFloor(node, tx, ty);
  e.x = spot.x * TILE + TILE / 2; e.y = spot.y * TILE + TILE / 2;
}

function g1Boom(game, e, R, dmg){
  const p = game.player;
  game.explosions.push(new Explosion(e.x, e.y, R));
  if (Util.dist(e.x, e.y, p.x, p.y) < R + p.radius) {
    damagePlayer(game, playerDamageAmount(game, !!e.isBoss, dmg), (e.type && e.type.id) || 'enemy');
  }
}

function g1Spawn(game, e, typeId, count, dist){
  const node = game.currentRoom, t = ENEMY_TYPES[typeId];
  if (!t) return;
  for (let i = 0; i < count; i++) {
    const ang = RNG.random() * Math.PI * 2, r = dist || 70;
    const spot = findNearestFloor(node, Math.floor((e.x + Math.cos(ang) * r) / TILE), Math.floor((e.y + Math.sin(ang) * r) / TILE));
    node.enemies.push(new Enemy(t, spot.x, spot.y, game.dungeon.floorNum));
  }
}

function g1Retreat(game, e, dt, mult){
  const node = game.currentRoom, v = seekVector(e, game.player.x, game.player.y);
  tryMoveEntity(e, node, node.obstacles, -v.x * e.speed * dt * (mult || 1), -v.y * e.speed * dt * (mult || 1));
}

function g1Strafe(game, e, dt, mult){
  const node = game.currentRoom, v = seekVector(e, game.player.x, game.player.y);
  const m = (mult || 1) * e.orbitDir;
  tryMoveEntity(e, node, node.obstacles, -v.y * e.speed * dt * m, v.x * e.speed * dt * m);
}

function g1ShovePlayer(game, dx, dy){
  const node = game.currentRoom;
  tryMoveEntity(game.player, node, node.obstacles, dx, dy);
}

const G1_ICE = { color:'#cfe8f5', radius:5 };

function aiFdRimeStalker(game, e, dt){
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 26) > 0) ? 0.12 : 0;
    if (e.telegraph <= 0) { g1Ring(game, e, 8, 165, e.dmg, G1_ICE, RNG.random() * 0.8); e.attackTimer = 2.6; }
    return;
  }
  chaseSeek(game, e, game.player.x, game.player.y, 1, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0 && Util.dist(e.x, e.y, game.player.x, game.player.y) < 170) e.telegraph = 0.5;
}

function aiFdGlacierCrawler(game, e, dt){
  const node = game.currentRoom;
  if (!e.pathDir) { const a = RNG.random() * Math.PI * 2; e.pathDir = { x: Math.cos(a), y: Math.sin(a) }; }
  const moved = tryMoveEntity(e, node, node.obstacles, e.pathDir.x * e.speed * dt, e.pathDir.y * e.speed * dt);
  if (!moved.movedX) e.pathDir.x = -e.pathDir.x;
  if (!moved.movedY) e.pathDir.y = -e.pathDir.y;

  const v = seekVector(e, game.player.x, game.player.y);
  e.pathDir.x += v.x * dt * 0.35; e.pathDir.y += v.y * dt * 0.35;
  const len = Math.hypot(e.pathDir.x, e.pathDir.y) || 1;
  e.pathDir.x /= len; e.pathDir.y /= len;
}

function aiFdSleetSpitter(game, e, dt){
  const d = Util.dist(e.x, e.y, game.player.x, game.player.y);
  if (d < 190) g1Retreat(game, e, dt, 0.9); else chaseSeek(game, e, game.player.x, game.player.y, 0.8, dt);
  g1Strafe(game, e, dt, 0.5);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && d < 400) {
    e.fireTimer = 1.5;
    g1Fan(game, e, g1AimAtPlayer(game, e) + 0.25 * e.orbitDir, 3, 0.5, 200, e.dmg, G1_ICE);
  }
}

function aiFdFrostMirage(game, e, dt){
  e.blinkTimer -= dt;
  if (e.blinkTimer <= 0) {
    e.blinkTimer = 1.9;
    e.g1step = ((e.g1step || 0) + 1) % 4;
    const ang = (e.g1step / 4) * Math.PI * 2 + 0.4;
    g1Blink(game, e, game.player.x + Math.cos(ang) * 150, game.player.y + Math.sin(ang) * 150);
    fireProjectileAngle(game, e, g1AimAtPlayer(game, e), 215, e.dmg, G1_ICE);
  }
}

function aiFdIcicleDrifter(game, e, dt){
  const node = game.currentRoom, v = seekVector(e, game.player.x, game.player.y);
  e.vx = (e.vx || 0) + v.x * e.speed * dt * 2.2;
  e.vy = (e.vy || 0) + v.y * e.speed * dt * 2.2;
  const sp = Math.hypot(e.vx, e.vy), cap = e.speed * 1.5;
  if (sp > cap) { e.vx = e.vx / sp * cap; e.vy = e.vy / sp * cap; }
  const moved = tryMoveEntity(e, node, node.obstacles, e.vx * dt, e.vy * dt);
  if (!moved.movedX) e.vx *= -0.4;
  if (!moved.movedY) e.vy *= -0.4;
}

function aiFdSnowdriftLurker(game, e, dt){
  const d = Util.dist(e.x, e.y, game.player.x, game.player.y);
  if (e.submerged) {
    e.shielded = true;
    if (d < 90) { e.submerged = false; e.shielded = false; g1Boom(game, e, 78, e.dmg); e.attackTimer = 3.4; }
    return;
  }
  chaseSeek(game, e, game.player.x, game.player.y, 1.1, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0 && d > 150) { e.submerged = true; e.shielded = true; }
}

function aiFdHailWeaver(game, e, dt){
  const node = game.currentRoom, v = seekVector(e, game.player.x, game.player.y);
  const wantR = 165, err = (v.d - wantR) / wantR;
  const rx = v.x * Util.clamp(err, -1, 1), ry = v.y * Util.clamp(err, -1, 1);
  tryMoveEntity(e, node, node.obstacles,
    (rx - v.y * e.orbitDir) * e.speed * dt, (ry + v.x * e.orbitDir) * e.speed * dt);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) { e.fireTimer = 0.85; fireProjectileAngle(game, e, g1AimAtPlayer(game, e), 190, e.dmg, G1_ICE); }
}

function aiFdPermafrostShard(game, e, dt){
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) {
    e.fireTimer = 1.1;
    e.weavePhase += 0.42;
    g1Ring(game, e, 4, 175, e.dmg, { color:'#a8d8ef', radius:6 }, e.weavePhase);
  }
}

function aiFdWinterHound(game, e, dt){
  if (g1Dash(game, e, dt)) return;
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) {
    e.attackTimer = Util.rand(0.85, 1.25);
    g1StartDash(e, g1AimAtPlayer(game, e), 3.1, 0.34);
  }
}

function aiFdBlizzardMoth(game, e, dt){
  const node = game.currentRoom, v = seekVector(e, game.player.x, game.player.y);
  e.weavePhase += dt * 2.6;
  const w = Math.sin(e.weavePhase) * 0.85;
  const mx = v.x - v.y * w, my = v.y + v.x * w;
  const len = Math.hypot(mx, my) || 1;
  tryMoveEntity(e, node, node.obstacles, (mx / len) * e.speed * dt, (my / len) * e.speed * dt);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) {
    e.fireTimer = 0.7;
    const back = Math.atan2(-my, -mx);
    g1Fan(game, e, back, 2, 0.6, 85, e.dmg, { color:'#eaf6ff', radius:4 });
  }
}

function aiFdCryoWarden(game, e, dt){
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 22) > 0) ? 0.14 : 0;
    if (e.telegraph <= 0) { g1Boom(game, e, 108, e.dmg); e.attackTimer = 3; }
    return;
  }
  chaseSeek(game, e, game.player.x, game.player.y, 1, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0 && Util.dist(e.x, e.y, game.player.x, game.player.y) < 120) e.telegraph = 0.75;
}

function aiFdFrostCallow(game, e, dt){
  const d = Util.dist(e.x, e.y, game.player.x, game.player.y);
  if (d < 260) g1Retreat(game, e, dt, 1); else aiWander(game, e, dt);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && d < 430) {
    e.fireTimer = 2.1;
    fireProjectileAngle(game, e, g1AimAtPlayer(game, e), 150, e.dmg, { color:'#bfe4f7', radius:5, homing:0.9 });
  }
}

function aiFdIcewindDervish(game, e, dt){
  chaseSeek(game, e, game.player.x, game.player.y, 0.55, dt);
  e.weavePhase += dt * 3.4;
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) {
    e.fireTimer = 0.16;
    fireProjectileAngle(game, e, e.weavePhase, 160, e.dmg, { color:'#dff2ff', radius:4 });
  }
}

function aiFdThawling(game, e, dt){
  const frac = e.hp / Math.max(1, e.maxHp);
  if (g1Dash(game, e, dt)) return;
  chaseSeek(game, e, game.player.x, game.player.y, 1 + (1 - frac) * 0.9, dt);
  if (frac < 0.5) {
    e.attackTimer -= dt;
    if (e.attackTimer <= 0) { e.attackTimer = 1.4; g1StartDash(e, g1AimAtPlayer(game, e), 3.4, 0.3); }
  }
}

function aiFdGlassduneSkater(game, e, dt){
  if (g1Dash(game, e, dt)) return;
  const node = game.currentRoom, p = game.player;
  const dx = p.x - e.x, dy = p.y - e.y;
  e.attackTimer -= dt;
  if (Math.abs(dx) < 26 || Math.abs(dy) < 26) {
    if (e.attackTimer <= 0) {
      e.attackTimer = 1.6;
      g1StartDash(e, Math.abs(dy) < 26 ? (dx > 0 ? 0 : Math.PI) : (dy > 0 ? Math.PI / 2 : -Math.PI / 2), 3.6, 0.42);
      return;
    }
  }

  if (Math.abs(dx) > Math.abs(dy)) tryMoveEntity(e, node, node.obstacles, 0, Math.sign(dy) * e.speed * dt);
  else tryMoveEntity(e, node, node.obstacles, Math.sign(dx) * e.speed * dt, 0);
}

const G1_GRIT = { color:'#d9a860', radius:5 };

function aiBlDustDevil(game, e, dt){
  const node = game.currentRoom, p = game.player;
  e.weavePhase += dt * 1.9;
  const drift = { x: Math.cos(e.weavePhase) * 0.7, y: Math.sin(e.weavePhase * 1.3) * 0.7 };
  const v = seekVector(e, p.x, p.y);
  tryMoveEntity(e, node, node.obstacles, (v.x * 0.6 + drift.x) * e.speed * dt, (v.y * 0.6 + drift.y) * e.speed * dt);
  if (v.d < 130) {
    const pull = 42 * dt * (1 - v.d / 130);
    g1ShovePlayer(game, -v.x * pull, -v.y * pull);
  }
}

function aiBlRattler(game, e, dt){
  if (g1Dash(game, e, dt)) return;
  const p = game.player, dx = p.x - e.x, dy = p.y - e.y;
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 30) > 0) ? 0.15 : 0;
    if (e.telegraph <= 0) { e.submerged = false; e.shielded = false; g1StartDash(e, Math.atan2(dy, dx), 4.2, 0.45); }
    return;
  }
  if (Math.abs(dx) < 34 || Math.abs(dy) < 34) {
    e.attackTimer -= dt;
    if (e.attackTimer <= 0) { e.attackTimer = 2.6; e.telegraph = 0.55; e.submerged = true; e.shielded = true; }
  } else {
    chaseSeek(game, e, p.x, p.y, 0.5, dt);
    e.attackTimer = Math.max(e.attackTimer, 0.3);
  }
}

function aiBlBuzzard(game, e, dt){
  const node = game.currentRoom;
  if (g1Dash(game, e, dt)) return;
  e.weavePhase += dt * 1.5;
  const cx = game.player.x + Math.cos(e.weavePhase) * 200, cy = game.player.y + Math.sin(e.weavePhase) * 200;
  const v = seekVector(e, cx, cy);
  tryMoveEntity(e, node, node.obstacles, v.x * e.speed * dt, v.y * e.speed * dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) {
    e.attackTimer = Util.rand(2.6, 3.6);
    e.lastPX = game.player.x; e.lastPY = game.player.y;
    g1StartDash(e, Math.atan2(e.lastPY - e.y, e.lastPX - e.x), 3.8, 0.5);
  }
}

function aiBlCanyonSlinger(game, e, dt){
  const p = game.player;
  if (e.lobTimer > 0) {
    e.lobTimer -= dt;
    if (e.lobTimer <= 0) {
      game.explosions.push(new Explosion(e.lobX, e.lobY, 70));
      if (Util.dist(e.lobX, e.lobY, p.x, p.y) < 70 + p.radius) damagePlayer(game, playerDamageAmount(game, false, e.dmg), e.type.id);
    }
  }
  const d = Util.dist(e.x, e.y, p.x, p.y);
  if (d < 220) g1Retreat(game, e, dt, 1); else if (d > 320) chaseSeek(game, e, p.x, p.y, 0.8, dt);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && d < 380) { e.fireTimer = 2.4; e.lobX = p.x; e.lobY = p.y; e.lobTimer = 1.05; }
}

function aiBlBandit(game, e, dt){
  const p = game.player;
  e.fireTimer -= dt;
  if ((e.g1shots || 0) > 0) {
    g1Retreat(game, e, dt, 0.4);
    if (e.fireTimer <= 0) {
      e.fireTimer = 0.18; e.g1shots--;
      fireProjectileAngle(game, e, g1AimAtPlayer(game, e), 260, e.dmg, { color:'#f0d089', radius:4 });
      if (e.g1shots <= 0) e.fireTimer = 2.3;
    }
    return;
  }
  chaseSeek(game, e, p.x, p.y, 0.9, dt);
  if (e.fireTimer <= 0 && Util.dist(e.x, e.y, p.x, p.y) < 380) { e.g1shots = 3; e.fireTimer = 0; }
}

function aiBlTumbleweed(game, e, dt){
  const node = game.currentRoom;
  if (!e.pathDir) { const a = RNG.random() * Math.PI * 2; e.pathDir = { x: Math.cos(a), y: Math.sin(a) }; }
  e.g1roll = Math.min((e.g1roll || 1) + dt * 0.35, 3);
  const moved = tryMoveEntity(e, node, node.obstacles,
    e.pathDir.x * e.speed * e.g1roll * dt, e.pathDir.y * e.speed * e.g1roll * dt);
  if (!moved.movedX) { e.pathDir.x = -e.pathDir.x; e.g1roll = Math.max(1, e.g1roll - 0.5); }
  if (!moved.movedY) { e.pathDir.y = -e.pathDir.y; e.g1roll = Math.max(1, e.g1roll - 0.5); }
}

function aiBlSunbaker(game, e, dt){
  e.fireTimer -= dt;
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 34) > 0) ? 0.16 : 0;
    if (e.telegraph <= 0) {
      const aim = g1AimAtPlayer(game, e);
      for (let i = -1; i <= 1; i++) fireProjectileAngle(game, e, aim + i * 0.3, 380, e.dmg, { color:'#ffb45a', radius:4 });
      e.fireTimer = 2.8;
    }
    return;
  }
  if (e.fireTimer <= 0 && Util.dist(e.x, e.y, game.player.x, game.player.y) < 520) e.telegraph = 1;
}

function aiBlMesaGuardian(game, e, dt){
  e.attackTimer -= dt;
  if (e.shielded) {
    chaseSeek(game, e, game.player.x, game.player.y, 0.6, dt);
    if (e.attackTimer <= 0) { e.shielded = false; e.attackTimer = 2.2; g1Boom(game, e, 96, e.dmg); }
  } else {
    chaseSeek(game, e, game.player.x, game.player.y, 1.05, dt);
    if (e.attackTimer <= 0) { e.shielded = true; e.grantedShield = false; e.attackTimer = 3.4; }
  }
}

function aiBlScorpling(game, e, dt){
  if (g1Dash(game, e, dt)) return;
  const v = seekVector(e, game.player.x, game.player.y);
  g1Strafe(game, e, dt, 1.1);
  if (v.d > 140) chaseSeek(game, e, game.player.x, game.player.y, 0.5, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0 && v.d < 130) { e.attackTimer = 1.9; g1StartDash(e, g1AimAtPlayer(game, e), 3.9, 0.26); }
}

function aiBlCoyote(game, e, dt){
  const p = game.player;
  if (g1Dash(game, e, dt)) return;
  const behind = Math.atan2(p.y - e.y, p.x - e.x) + Math.PI;
  const tx = p.x + Math.cos(behind + 0.9 * e.orbitDir) * 120;
  const ty = p.y + Math.sin(behind + 0.9 * e.orbitDir) * 120;
  chaseSeek(game, e, tx, ty, 1.1, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0 && Util.dist(e.x, e.y, tx, ty) < 60) { e.attackTimer = 2.4; g1StartDash(e, g1AimAtPlayer(game, e), 3.5, 0.4); }
}

function aiBlQuicksandMaw(game, e, dt){
  const v = seekVector(e, game.player.x, game.player.y);
  if (v.d < 250) {
    const pull = 95 * dt * (1 - v.d / 250);
    g1ShovePlayer(game, -v.x * pull, -v.y * pull);
  }
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) { e.fireTimer = 2.7; g1Ring(game, e, 6, 140, e.dmg, G1_GRIT, e.weavePhase += 0.5); }
}

function aiBlDynamiteHauler(game, e, dt){
  chaseSeek(game, e, game.player.x, game.player.y, 0.95, dt);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) {
    e.fireTimer = 2.2;
    const aim = g1AimAtPlayer(game, e);
    fireProjectileAngle(game, e, aim, 165, e.dmg, { color:'#e05a3a', radius:6 });
  }
}

function aiBlHeatHaze(game, e, dt){
  e.blinkTimer -= dt;
  if (e.blinkTimer <= 0) {
    e.blinkTimer = 1.15;
    const a = RNG.random() * Math.PI * 2;
    g1Blink(game, e, e.x + Math.cos(a) * 85, e.y + Math.sin(a) * 85);
  }
  chaseSeek(game, e, game.player.x, game.player.y, 0.45, dt);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) { e.fireTimer = 1.9; g1Fan(game, e, g1AimAtPlayer(game, e), 5, 1.1, 130, e.dmg, { color:'#ffd9a0', radius:5 }); }
}

function aiBlBoneKite(game, e, dt){
  const p = game.player;
  chaseSeek(game, e, p.x, p.y - 165, 1, dt);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && Math.abs(e.y - (p.y - 165)) < 90) {
    e.fireTimer = 1.6;
    g1Fan(game, e, Math.PI / 2, 5, 0.9, 175, e.dmg, { color:'#e8ddc0', radius:4 });
  }
}

function aiBlPetrifiedRider(game, e, dt){
  const node = game.currentRoom;
  e.g1ang = e.g1ang == null ? g1AimAtPlayer(game, e) : e.g1ang;
  const want = g1AimAtPlayer(game, e);
  let diff = ((want - e.g1ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  e.g1ang += Util.clamp(diff, -1.1 * dt, 1.1 * dt);
  const moved = tryMoveEntity(e, node, node.obstacles,
    Math.cos(e.g1ang) * e.speed * 1.7 * dt, Math.sin(e.g1ang) * e.speed * 1.7 * dt);
  if (!moved.movedX && !moved.movedY) e.g1ang += Math.PI * 0.6;
}

const G1_FOAM = { color:'#8fe0e8', radius:5 };

function aiBcSandCrab(game, e, dt){
  const v = seekVector(e, game.player.x, game.player.y);
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 30) > 0) ? 0.14 : 0;
    if (e.telegraph <= 0) { if (v.d < 62) damagePlayer(game, playerDamageAmount(game, false, e.dmg), e.type.id); e.attackTimer = 1.5; }
    return;
  }
  g1Strafe(game, e, dt, 1.1);
  if (v.d > 60) chaseSeek(game, e, game.player.x, game.player.y, 0.35, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0 && v.d < 58) e.telegraph = 0.4;
}

function aiBcGull(game, e, dt){
  const node = game.currentRoom, p = game.player;
  e.attackTimer -= dt;
  if ((e.g1phase || 0) === 0) {
    const tx = p.x + 230 * e.orbitDir, ty = p.y - 120;
    const v = seekVector(e, tx, ty);
    tryMoveEntity(e, node, node.obstacles, v.x * e.speed * dt * 1.1, v.y * e.speed * dt * 1.1);
    if (e.attackTimer <= 0 && v.d < 90) { e.g1phase = 1; e.attackTimer = 1; g1StartDash(e, g1AimAtPlayer(game, e), 3.2, 0.85); }
  } else {
    if (!g1Dash(game, e, dt)) { e.g1phase = 0; e.attackTimer = Util.rand(1, 1.6); e.orbitDir = -e.orbitDir; }
  }
}

function aiBcJellyDrifter(game, e, dt){
  aiWander(game, e, dt);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) {
    e.fireTimer = 2.4;
    e.weavePhase += 0.35;
    g1Ring(game, e, 10, 120, e.dmg, G1_FOAM, e.weavePhase);
  }
}

function aiBcTidecaller(game, e, dt){
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 18) > 0) ? 0.18 : 0;
    if (e.telegraph <= 0) {
      const aim = g1AimAtPlayer(game, e), perp = aim + Math.PI / 2;
      for (let i = -3; i <= 3; i++) {
        const ox = Math.cos(perp) * i * 26, oy = Math.sin(perp) * i * 26;
        game.projectiles.push(new Projectile(e.x + ox, e.y + oy, Math.cos(aim) * 150, Math.sin(aim) * 150,
          e.dmg, 'enemy', { color:'#6fd0e0', radius:6, source: e }));
      }
      e.attackTimer = 3.2;
    }
    return;
  }
  g1Retreat(game, e, dt, 0.5);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) e.telegraph = 1.1;
}

function aiBcSurfer(game, e, dt){
  const node = game.currentRoom;
  e.g1ang = e.g1ang == null ? RNG.random() * Math.PI * 2 : e.g1ang;
  const want = g1AimAtPlayer(game, e);
  const diff = ((want - e.g1ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  e.g1ang += Util.clamp(diff, -2.2 * dt, 2.2 * dt);
  const moved = tryMoveEntity(e, node, node.obstacles,
    Math.cos(e.g1ang) * e.speed * 1.35 * dt, Math.sin(e.g1ang) * e.speed * 1.35 * dt);
  if (!moved.movedX && !moved.movedY) e.g1ang += 1.4;
}

function aiBcUrchin(game, e, dt){
  e.attackTimer -= dt;
  if (e.shielded) {
    if (e.attackTimer <= 0) { e.shielded = false; e.attackTimer = 1.4; }
  } else {
    if (e.attackTimer <= 0) {
      e.attackTimer = 2.6; e.shielded = true;
      g1Ring(game, e, 8, 155, e.dmg, { color:'#c86ad0', radius:5 }, e.weavePhase += 0.39);
    }
  }
}

function aiBcHermitHusk(game, e, dt){
  if (g1Dash(game, e, dt)) { e.shielded = false; return; }
  const v = seekVector(e, game.player.x, game.player.y);
  e.shielded = true;
  chaseSeek(game, e, game.player.x, game.player.y, 0.7, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0 && v.d < 150) { e.attackTimer = 2.5; g1StartDash(e, g1AimAtPlayer(game, e), 4, 0.35); }
}

function aiBcPelican(game, e, dt){
  const node = game.currentRoom, p = game.player;
  if (e.lobTimer > 0) {
    e.lobTimer -= dt;
    if (e.lobTimer <= 0) {
      game.explosions.push(new Explosion(e.lobX, e.lobY, 62));
      if (Util.dist(e.lobX, e.lobY, p.x, p.y) < 62 + p.radius) damagePlayer(game, playerDamageAmount(game, false, e.dmg), e.type.id);
    }
  }
  const v = seekVector(e, p.x, p.y);
  tryMoveEntity(e, node, node.obstacles, v.x * e.speed * dt, v.y * e.speed * dt);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && v.d < 120) { e.fireTimer = 2; e.lobX = p.x; e.lobY = p.y; e.lobTimer = 0.9; }
}

function aiBcSandflea(game, e, dt){
  if (g1Dash(game, e, dt)) return;
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) {
    e.attackTimer = Util.rand(0.5, 0.8);
    g1StartDash(e, g1AimAtPlayer(game, e) + Util.rand(-0.4, 0.4), 4.6, 0.2);
  }
}

function aiBcCoralLurker(game, e, dt){
  if (g1Dash(game, e, dt)) return;
  const v = seekVector(e, game.player.x, game.player.y);
  if (!e.triggered) {
    if (v.d < 145) { e.triggered = true; e.telegraph = 0.3; }
    return;
  }
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 34) > 0) ? 0.16 : 0;
    if (e.telegraph <= 0) g1StartDash(e, g1AimAtPlayer(game, e), 4.3, 0.42);
    return;
  }
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) {
    e.attackTimer = 3;
    const a = RNG.random() * Math.PI * 2;
    g1Blink(game, e, game.player.x + Math.cos(a) * 210, game.player.y + Math.sin(a) * 210);
    e.triggered = false;
  }
}

function aiBcRiptideWisp(game, e, dt){
  const v = seekVector(e, game.player.x, game.player.y);
  chaseSeek(game, e, game.player.x, game.player.y, 0.8, dt);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && v.d < 170) {
    e.fireTimer = 1.8;
    g1ShovePlayer(game, v.x * 46, v.y * 46);
    g1Ring(game, e, 6, 130, e.dmg, G1_FOAM, RNG.random());
  }
}

function aiBcSaltSpitter(game, e, dt){
  e.attackTimer -= dt;
  if (e.attackTimer > 0.7) { chaseSeek(game, e, game.player.x, game.player.y, 1.2, dt); return; }
  if (e.attackTimer <= 0) {
    e.attackTimer = 2.1;
    g1Fan(game, e, g1AimAtPlayer(game, e), 3, 0.32, 235, e.dmg, { color:'#f0f6d0', radius:4 });
  }
}

function aiBcBeachcomber(game, e, dt){
  const node = game.currentRoom, p = game.player;
  e.weavePhase += dt * 0.7;
  const cx = node.tileW * TILE / 2, cy = node.tileH * TILE / 2;
  const R = Math.min(cx, cy) - TILE * 1.5;
  const v = seekVector(e, cx + Math.cos(e.weavePhase) * R, cy + Math.sin(e.weavePhase) * R);
  tryMoveEntity(e, node, node.obstacles, v.x * e.speed * dt, v.y * e.speed * dt);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && (Math.abs(p.x - e.x) < 30 || Math.abs(p.y - e.y) < 30)) {
    e.fireTimer = 1.2;
    fireProjectileAngle(game, e, g1AimAtPlayer(game, e), 260, e.dmg, { color:'#d0c090', radius:5 });
  }
}

function aiBcKelpTangler(game, e, dt){
  const p = game.player, v = seekVector(e, p.x, p.y);
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 16) > 0) ? 0.2 : 0;
    if (e.telegraph <= 0) {
      if (v.d < 130) {
        p.freezeTimer = Math.max(p.freezeTimer || 0, 0.6);
        damagePlayer(game, playerDamageAmount(game, false, e.dmg), e.type.id);
      }
      e.attackTimer = 3;
    }
    return;
  }
  chaseSeek(game, e, p.x, p.y, 0.35, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0 && v.d < 150) e.telegraph = 0.85;
}

function aiBcSunbleachedHusk(game, e, dt){
  const node = game.currentRoom, v = seekVector(e, game.player.x, game.player.y);
  e.g1mo = Math.min((e.g1mo || 1) + dt * 0.5, 2.4);
  const moved = tryMoveEntity(e, node, node.obstacles, v.x * e.speed * e.g1mo * dt, v.y * e.speed * e.g1mo * dt);
  if (!moved.movedX && !moved.movedY) { e.g1mo = 1; chaseSeek(game, e, game.player.x, game.player.y, 0.8, dt); }
}

function aiBossFdHoarfrost(game, e, dt){
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 20) > 0) ? 0.16 : 0;
    if (e.telegraph <= 0) {
      g1Boom(game, e, 150, e.dmg);
      g1Ring(game, e, 12, 165, 2, G1_ICE, RNG.random());
      e.attackTimer = Util.rand(2.4, 3.2);
    }
    return;
  }
  chaseSeek(game, e, game.player.x, game.player.y, 0.75, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) {
    if (Util.dist(e.x, e.y, game.player.x, game.player.y) < 190) e.telegraph = 0.8;
    else { e.attackTimer = 1.6; g1Fan(game, e, g1AimAtPlayer(game, e), 5, 0.8, 185, 2, G1_ICE); }
  }
  if (!e.minionsSpawned && e.hp < e.maxHp * 0.5) { e.minionsSpawned = 1; g1Spawn(game, e, 'fdwinterhound', 2, 80); }
}

function aiBossFdWhiteout(game, e, dt){
  if (e.submerged) {
    e.shielded = true;
    e.telegraph -= dt;
    e.weavePhase += dt * 6;
    if (e.telegraph <= 0) {
      const a = RNG.random() * Math.PI * 2;
      g1Blink(game, e, game.player.x + Math.cos(a) * 180, game.player.y + Math.sin(a) * 180);
      e.submerged = false; e.shielded = false; e.attackTimer = 2.6; e.g1shots = 14;
    }
    return;
  }
  if ((e.g1shots || 0) > 0) {
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) {
      e.fireTimer = 0.1; e.g1shots--; e.weavePhase += 0.55;
      g1Ring(game, e, 2, 175, 2, G1_ICE, e.weavePhase);
    }
    return;
  }
  chaseSeek(game, e, game.player.x, game.player.y, 0.85, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) { e.submerged = true; e.shielded = true; e.telegraph = 1.2; }
  if (!e.minionsSpawned && e.hp < e.maxHp * 0.45) { e.minionsSpawned = 1; g1Spawn(game, e, 'fdblizzardmoth', 3, 70); }
}

function aiBossFdPermafrostWyrm(game, e, dt){
  if (e.submerged) {
    e.shielded = true;
    e.telegraph -= dt;
    if (e.telegraph <= 0) {
      g1Blink(game, e, game.player.x, game.player.y);
      e.submerged = false; e.shielded = false;
      e.g1tier = Math.min((e.g1tier || 0) + 1, 3);
      g1Boom(game, e, 96, e.dmg);
      g1Ring(game, e, 6 + e.g1tier * 3, 160, 2, { color:'#9fd4ea', radius:5 }, RNG.random());
      e.attackTimer = Util.rand(2, 2.6);
    }
    return;
  }
  chaseSeek(game, e, game.player.x, game.player.y, 1, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) { e.submerged = true; e.shielded = true; e.telegraph = 1; }
  if (!e.minionsSpawned && e.hp < e.maxHp * 0.5) { e.minionsSpawned = 1; g1Spawn(game, e, 'fdsnowdriftlurker', 2, 90); }
}

function aiBossFdSleetMarshal(game, e, dt){
  if (g1Dash(game, e, dt)) return;
  e.attackTimer -= dt;
  if (e.attackTimer > 0) { chaseSeek(game, e, game.player.x, game.player.y, 0.7, dt); return; }
  e.g1combo = (e.g1combo || 0) + 1;
  const aim = g1AimAtPlayer(game, e);
  g1Fan(game, e, aim, 3, 0.55, 210, 2, G1_ICE);
  g1StartDash(e, aim, 4, 0.35);
  if (e.g1combo >= 3) { e.g1combo = 0; e.attackTimer = 2.6; g1Ring(game, e, 10, 150, 2, G1_ICE, RNG.random()); }
  else e.attackTimer = 0.7;
  if (!e.minionsSpawned && e.hp < e.maxHp * 0.5) { e.minionsSpawned = 1; g1Spawn(game, e, 'fdsleetspitter', 2, 80); }
}

function aiBossBlMesaTyrant(game, e, dt){
  const p = game.player;
  if (g1Dash(game, e, dt)) return;
  if (e.lobTimer > 0) {
    e.lobTimer -= dt;
    if (e.lobTimer <= 0) {
      game.explosions.push(new Explosion(e.lobX, e.lobY, 88));
      if (Util.dist(e.lobX, e.lobY, p.x, p.y) < 88 + p.radius) damagePlayer(game, playerDamageAmount(game, true, e.dmg), e.type.id);
    }
  }
  chaseSeek(game, e, p.x, p.y, 0.6, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) {
    e.attackTimer = Util.rand(2.2, 3);
    if (RNG.random() < 0.55) g1StartDash(e, g1AimAtPlayer(game, e), 4.6, 0.7);
    else { e.lobX = p.x; e.lobY = p.y; e.lobTimer = 1.1; }
  }
  if (!e.minionsSpawned && e.hp < e.maxHp * 0.5) { e.minionsSpawned = 1; g1Spawn(game, e, 'blscorpling', 3, 80); }
}

function aiBossBlDustDevilPrime(game, e, dt){
  const node = game.currentRoom, v = seekVector(e, game.player.x, game.player.y);
  if (v.d < 240) g1ShovePlayer(game, -v.x * 60 * dt, -v.y * 60 * dt);
  if ((e.g1shots || 0) > 0) {
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) { e.fireTimer = 0.08; e.g1shots--; e.weavePhase += 0.62; g1Ring(game, e, 3, 170, 2, G1_GRIT, e.weavePhase); }
    return;
  }
  const wantR = 170, err = Util.clamp((v.d - wantR) / wantR, -1, 1);
  tryMoveEntity(e, node, node.obstacles,
    (v.x * err - v.y * e.orbitDir) * e.speed * dt * 1.2, (v.y * err + v.x * e.orbitDir) * e.speed * dt * 1.2);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) { e.attackTimer = 3.4; e.g1shots = 18; }
  if (!e.minionsSpawned && e.hp < e.maxHp * 0.45) { e.minionsSpawned = 1; g1Spawn(game, e, 'bldustdevil', 2, 100); }
}

function aiBossBlBuzzardKing(game, e, dt){
  const node = game.currentRoom;
  if (g1Dash(game, e, dt)) return;
  e.weavePhase += dt * 1.6;
  const cx = game.player.x + Math.cos(e.weavePhase) * 215, cy = game.player.y + Math.sin(e.weavePhase) * 215;
  const v = seekVector(e, cx, cy);
  tryMoveEntity(e, node, node.obstacles, v.x * e.speed * dt * 1.15, v.y * e.speed * dt * 1.15);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) {
    e.attackTimer = Util.rand(2, 2.8);
    g1Fan(game, e, g1AimAtPlayer(game, e), 7, 1.5, 165, 2, { color:'#c9b48a', radius:5 });
    g1StartDash(e, g1AimAtPlayer(game, e), 4.4, 0.55);
  }
  if (!e.minionsSpawned && e.hp < e.maxHp * 0.5) { e.minionsSpawned = 1; g1Spawn(game, e, 'blbuzzard', 2, 110); }
}

function aiBossBlRattleback(game, e, dt){
  if (g1Dash(game, e, dt)) return;
  if (e.submerged) {
    e.shielded = true;
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 28) > 0) ? 0.15 : 0;
    if (e.telegraph <= 0) {
      e.submerged = false; e.shielded = false;
      g1Blink(game, e, game.player.x - Math.cos(g1AimAtPlayer(game, e)) * 170, game.player.y - Math.sin(g1AimAtPlayer(game, e)) * 170);
      g1StartDash(e, g1AimAtPlayer(game, e), 4.8, 0.55);
      e.g1combo = (e.g1combo || 0) + 1;
      if (e.g1combo >= 3) { e.g1combo = 0; e.attackTimer = 3; g1Ring(game, e, 12, 150, 2, G1_GRIT, RNG.random()); }
      else e.attackTimer = 0.9;
    }
    return;
  }
  chaseSeek(game, e, game.player.x, game.player.y, 0.7, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) { e.submerged = true; e.shielded = true; e.telegraph = 0.7; }
  if (!e.minionsSpawned && e.hp < e.maxHp * 0.5) { e.minionsSpawned = 1; g1Spawn(game, e, 'blrattler', 2, 90); }
}

function aiBossBcTideWarden(game, e, dt){
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 16) > 0) ? 0.18 : 0;
    if (e.telegraph <= 0) {
      const aim = g1AimAtPlayer(game, e), perp = aim + Math.PI / 2;
      for (let i = -5; i <= 5; i++) {
        if (i === 0) continue;
        const ox = Math.cos(perp) * i * 28, oy = Math.sin(perp) * i * 28;
        game.projectiles.push(new Projectile(e.x + ox, e.y + oy, Math.cos(aim) * 165, Math.sin(aim) * 165,
          2, 'enemy', { color:'#6fd0e0', radius:6, fromBoss:true, source: e }));
      }
      e.attackTimer = Util.rand(2.2, 3);
    }
    return;
  }
  chaseSeek(game, e, game.player.x, game.player.y, 0.65, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) e.telegraph = 1;
  if (!e.minionsSpawned && e.hp < e.maxHp * 0.5) { e.minionsSpawned = 1; g1Spawn(game, e, 'bcjellydrifter', 2, 90); }
}

function aiBossBcCrabKing(game, e, dt){
  const v = seekVector(e, game.player.x, game.player.y);
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 24) > 0) ? 0.16 : 0;
    if (e.telegraph <= 0) {
      g1Boom(game, e, 132, e.dmg);
      g1Fan(game, e, g1AimAtPlayer(game, e), 5, 1.6, 155, 2, { color:'#e88a6a', radius:5 });
      e.shielded = true; e.attackTimer = 2.4;
    }
    return;
  }
  g1Strafe(game, e, dt, 1.15);
  if (v.d > 130) chaseSeek(game, e, game.player.x, game.player.y, 0.5, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) { e.shielded = false; if (v.d < 160) e.telegraph = 0.7; else e.attackTimer = 0.6; }
  if (!e.minionsSpawned && e.hp < e.maxHp * 0.5) { e.minionsSpawned = 1; g1Spawn(game, e, 'bcsandcrab', 3, 80); }
}

function aiBossBcGullTyrant(game, e, dt){
  const node = game.currentRoom, p = game.player;
  if (e.dashing) {
    tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
    e.dashTimer -= dt;
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) { e.fireTimer = 0.18; fireProjectileAngle(game, e, Math.PI / 2, 150, 2, { color:'#f0f0e0', radius:5 }); }
    if (e.dashTimer <= 0) { e.dashing = false; e.attackTimer = Util.rand(1.1, 1.7); }
    return;
  }
  chaseSeek(game, e, p.x, p.y - 150, 1, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) g1StartDash(e, g1AimAtPlayer(game, e), 3.6, 0.9);
  if (!e.minionsSpawned && e.hp < e.maxHp * 0.5) { e.minionsSpawned = 1; g1Spawn(game, e, 'bcgull', 3, 110); }
}

function aiBossBcJellySovereign(game, e, dt){
  aiWander(game, e, dt);
  const v = seekVector(e, game.player.x, game.player.y);
  if (v.d > 300) chaseSeek(game, e, game.player.x, game.player.y, 0.4, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) {
    e.attackTimer = 0.55;
    e.g1combo = (e.g1combo || 0) + 1;
    e.weavePhase += (e.g1combo % 2 === 0) ? 0.31 : -0.31;
    g1Ring(game, e, 11, (e.g1combo % 2 === 0) ? 135 : 185, 2, G1_FOAM, e.weavePhase);
    if (e.g1combo % 4 === 0) e.attackTimer = 2.6;
  }
  if (!e.minionsSpawned && e.hp < e.maxHp * 0.5) { e.minionsSpawned = 1; g1Spawn(game, e, 'bcriptidewisp', 2, 90); }
}

function aiBossIceAgentDnb(game, e, dt){
  e.g1phase = e.g1phase || 0;
  e.g1t = (e.g1t || 0) + dt;
  if (g1Dash(game, e, dt)) return;

  if (e.g1phase === 0) {
    chaseSeek(game, e, game.player.x, game.player.y, 0.95, dt);
    e.attackTimer -= dt;
    if (e.attackTimer <= 0) {
      e.attackTimer = 1.15;
      const aim = g1AimAtPlayer(game, e);
      g1Fan(game, e, aim, 5, 0.9, 225, 2, G1_ICE);
      g1StartDash(e, aim, 4.2, 0.4);
    }
    if (e.g1t > 7) { e.g1t = 0; e.g1phase = 1; e.g1shots = 4; e.attackTimer = 0; }

  } else if (e.g1phase === 1) {
    e.attackTimer -= dt;
    e.shielded = true;
    if (e.attackTimer <= 0) {
      e.attackTimer = 0.75;
      e.g1shots = (e.g1shots || 0) - 1;
      const a = ((e.g1shots || 0) / 4) * Math.PI * 2 + 0.5;
      g1Blink(game, e, game.player.x + Math.cos(a) * 165, game.player.y + Math.sin(a) * 165);
      g1Ring(game, e, 9, 190, 2, G1_ICE, a);
      if (e.g1shots <= 0) { e.shielded = false; e.g1phase = 2; e.g1t = 0; e.attackTimer = 0.4; e.g1combo = 22; }
    }

  } else {
    e.attackTimer -= dt;
    if (e.attackTimer <= 0) {
      e.attackTimer = 0.13;
      e.g1combo = (e.g1combo || 0) - 1;
      e.weavePhase += 0.44;
      fireProjectileAngle(game, e, e.weavePhase, 185, 2, G1_ICE);
      fireProjectileAngle(game, e, -e.weavePhase + Math.PI, 185, 2, G1_ICE);
      if (e.g1combo <= 0) { e.g1phase = 0; e.g1t = 0; e.attackTimer = 0.6; }
    }
  }

  if (!e.minionsSpawned && e.hp < e.maxHp * 0.6) { e.minionsSpawned = 1; g1Spawn(game, e, 'fdwinterhound', 3, 90); }
  if (e.minionsSpawned === 1 && e.hp < e.maxHp * 0.3) { e.minionsSpawned = 2; g1Spawn(game, e, 'fdfrostmirage', 3, 120); }
}

function aiBossMexicoDnb(game, e, dt){
  e.g1phase = e.g1phase || 0;
  if (g1Dash(game, e, dt)) return;

  if (e.g1phase === 0) {
    g1Strafe(game, e, dt, 0.8);
    chaseSeek(game, e, game.player.x, game.player.y, 0.4, dt);
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) {
      e.fireTimer = 0.24;
      e.g1shots = (e.g1shots == null ? 6 : e.g1shots) - 1;
      fireProjectileAngle(game, e, g1AimAtPlayer(game, e) + Util.rand(-0.14, 0.14), 300, 2, { color:'#ffd07a', radius:5 });
      if (e.g1shots <= 0) { e.g1phase = 1; e.attackTimer = 1.8; e.g1shots = null; }
    }

  } else if (e.g1phase === 1) {
    e.attackTimer -= dt;
    e.hitFlash = (Math.sin(e.attackTimer * 12) > 0) ? 0.1 : 0;
    if (e.attackTimer <= 0) { e.g1phase = 2; e.g1combo = 3; e.attackTimer = 0; }

  } else {
    e.attackTimer -= dt;
    if (e.attackTimer <= 0) {
      e.g1combo = (e.g1combo || 0) - 1;
      g1Ring(game, e, 10, 150, 2, G1_GRIT, RNG.random());
      g1StartDash(e, g1AimAtPlayer(game, e), 5, 0.6);
      e.attackTimer = 1;
      if (e.g1combo <= 0) { e.g1phase = 0; e.fireTimer = 0.8; e.g1shots = 6; }
    } else {
      chaseSeek(game, e, game.player.x, game.player.y, 0.6, dt);
    }
  }

  if (!e.minionsSpawned && e.hp < e.maxHp * 0.6) { e.minionsSpawned = 1; g1Spawn(game, e, 'blbandit', 3, 100); }
  if (e.minionsSpawned === 1 && e.hp < e.maxHp * 0.3) { e.minionsSpawned = 2; g1Spawn(game, e, 'bldynamitehauler', 2, 110); }
}

function aiBossG5Dnb(game, e, dt){
  e.g1phase = e.g1phase || 0;
  const v = seekVector(e, game.player.x, game.player.y);
  if (g1Dash(game, e, dt)) {
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) {
      e.fireTimer = 0.15;
      const perp = Math.atan2(e.dashVY, e.dashVX) + Math.PI / 2;
      fireProjectileAngle(game, e, perp, 140, 2, G1_FOAM);
      fireProjectileAngle(game, e, perp + Math.PI, 140, 2, G1_FOAM);
    }
    return;
  }

  if (e.g1phase === 0) {
    chaseSeek(game, e, game.player.x, game.player.y, 0.7, dt);
    e.attackTimer -= dt;
    if (e.attackTimer <= 0) {
      e.attackTimer = 0.5;
      e.weavePhase += 0.5;
      e.g1combo = (e.g1combo || 0) + 1;
      g1Ring(game, e, 5, 195, 2, { color:'#7fe6f0', radius:6 }, e.weavePhase);
      if (e.g1combo >= 8) { e.g1combo = 0; e.g1phase = 1; e.g1shots = 3; e.attackTimer = 0.5; }
    }

  } else if (e.g1phase === 1) {
    e.attackTimer -= dt;
    if (e.attackTimer <= 0) {
      e.g1shots = (e.g1shots || 0) - 1;
      g1ShovePlayer(game, v.x * 55, v.y * 55);
      g1StartDash(e, g1AimAtPlayer(game, e), 4.8, 0.7);
      e.attackTimer = 1.1;
      if (e.g1shots <= 0) { e.g1phase = 2; e.attackTimer = 0.4; e.g1combo = 10; }
    } else {
      chaseSeek(game, e, game.player.x, game.player.y, 0.5, dt);
    }

  } else {
    if (v.d < 300) g1ShovePlayer(game, -v.x * 70 * dt, -v.y * 70 * dt);
    e.attackTimer -= dt;
    if (e.attackTimer <= 0) {
      e.attackTimer = 0.42;
      e.g1combo = (e.g1combo || 0) - 1;
      e.weavePhase -= 0.28;
      g1Ring(game, e, 12, 145, 2, G1_FOAM, e.weavePhase);
      if (e.g1combo <= 0) { e.g1phase = 0; e.attackTimer = 0.8; }
    }
  }

  if (!e.minionsSpawned && e.hp < e.maxHp * 0.65) { e.minionsSpawned = 1; g1Spawn(game, e, 'bcjellydrifter', 3, 100); }
  if (e.minionsSpawned === 1 && e.hp < e.maxHp * 0.35) { e.minionsSpawned = 2; g1Spawn(game, e, 'bcsandflea', 4, 120); }
}

Object.assign(ENEMY_BEHAVIOR_HANDLERS, {

  fdRimeStalker: aiFdRimeStalker,
  fdGlacierCrawler: aiFdGlacierCrawler,
  fdSleetSpitter: aiFdSleetSpitter,
  fdFrostMirage: aiFdFrostMirage,
  fdIcicleDrifter: aiFdIcicleDrifter,
  fdSnowdriftLurker: aiFdSnowdriftLurker,
  fdHailWeaver: aiFdHailWeaver,
  fdPermafrostShard: aiFdPermafrostShard,
  fdWinterHound: aiFdWinterHound,
  fdBlizzardMoth: aiFdBlizzardMoth,
  fdCryoWarden: aiFdCryoWarden,
  fdFrostCallow: aiFdFrostCallow,
  fdIcewindDervish: aiFdIcewindDervish,
  fdThawling: aiFdThawling,
  fdGlassduneSkater: aiFdGlassduneSkater,

  blDustDevil: aiBlDustDevil,
  blRattler: aiBlRattler,
  blBuzzard: aiBlBuzzard,
  blCanyonSlinger: aiBlCanyonSlinger,
  blBandit: aiBlBandit,
  blTumbleweed: aiBlTumbleweed,
  blSunbaker: aiBlSunbaker,
  blMesaGuardian: aiBlMesaGuardian,
  blScorpling: aiBlScorpling,
  blCoyote: aiBlCoyote,
  blQuicksandMaw: aiBlQuicksandMaw,
  blDynamiteHauler: aiBlDynamiteHauler,
  blHeatHaze: aiBlHeatHaze,
  blBoneKite: aiBlBoneKite,
  blPetrifiedRider: aiBlPetrifiedRider,

  bcSandCrab: aiBcSandCrab,
  bcGull: aiBcGull,
  bcJellyDrifter: aiBcJellyDrifter,
  bcTidecaller: aiBcTidecaller,
  bcSurfer: aiBcSurfer,
  bcUrchin: aiBcUrchin,
  bcHermitHusk: aiBcHermitHusk,
  bcPelican: aiBcPelican,
  bcSandflea: aiBcSandflea,
  bcCoralLurker: aiBcCoralLurker,
  bcRiptideWisp: aiBcRiptideWisp,
  bcSaltSpitter: aiBcSaltSpitter,
  bcBeachcomber: aiBcBeachcomber,
  bcKelpTangler: aiBcKelpTangler,
  bcSunbleachedHusk: aiBcSunbleachedHusk,

  bossFdHoarfrost: aiBossFdHoarfrost,
  bossFdWhiteout: aiBossFdWhiteout,
  bossFdPermafrostWyrm: aiBossFdPermafrostWyrm,
  bossFdSleetMarshal: aiBossFdSleetMarshal,
  bossBlMesaTyrant: aiBossBlMesaTyrant,
  bossBlDustDevilPrime: aiBossBlDustDevilPrime,
  bossBlBuzzardKing: aiBossBlBuzzardKing,
  bossBlRattleback: aiBossBlRattleback,
  bossBcTideWarden: aiBossBcTideWarden,
  bossBcCrabKing: aiBossBcCrabKing,
  bossBcGullTyrant: aiBossBcGullTyrant,
  bossBcJellySovereign: aiBossBcJellySovereign,

  bossIceAgentDnb: aiBossIceAgentDnb,
  bossMexicoDnb: aiBossMexicoDnb,
  bossG5Dnb: aiBossG5Dnb,
});
