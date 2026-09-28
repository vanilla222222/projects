'use strict';

function g3(e){
  return e._g3 || (e._g3 = {
    t: 0, t2: 0, t3: 0,
    n: 0, n2: 0,
    a: 0, a2: 0,
    dir: RNG.random() < 0.5 ? -1 : 1,
    on: false, on2: false,
    x: 0, y: 0,
    hist: null,
  });
}

function g3Blast(game, e, x, y, R){
  const player = game.player;
  game.explosions.push(new Explosion(x, y, R));
  if (Util.dist(x, y, player.x, player.y) < R + player.radius) {
    damagePlayer(game, playerDamageAmount(game, !!e.isBoss, e.dmg), e.type.id);
  }
}

function g3Converge(game, e, px, py, n, R, speed, dmg, color){
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2;
    const sx = px + Math.cos(ang) * R, sy = py + Math.sin(ang) * R;
    game.projectiles.push(new Projectile(sx, sy, -Math.cos(ang) * speed, -Math.sin(ang) * speed, dmg, 'enemy',
      { color: color, radius: 5, fromBoss: !!e.isBoss, source: e }));
  }
}

function g3Wall(game, e, cx, cy, ang, count, spacing, speed, dmg, color, gapIdx){
  const px = -Math.sin(ang), py = Math.cos(ang);
  const half = (count - 1) / 2;
  for (let i = 0; i < count; i++) {
    if (i === gapIdx) continue;
    const off = (i - half) * spacing;
    game.projectiles.push(new Projectile(cx + px * off, cy + py * off, Math.cos(ang) * speed, Math.sin(ang) * speed, dmg, 'enemy',
      { color: color, radius: 5, fromBoss: !!e.isBoss, source: e }));
  }
}

function g3Blink(game, e, wx, wy){
  const node = game.currentRoom;
  const spot = findNearestFloor(node, Math.floor(wx / TILE), Math.floor(wy / TILE));
  e.x = spot.x * TILE + TILE / 2; e.y = spot.y * TILE + TILE / 2;
  e.navPath = null; e.pathTimer = 0;
  e.hitFlash = 0.12;
}

function g3Spawn(game, e, typeId, count, dist){
  const node = game.currentRoom;
  const def = ENEMY_TYPES[typeId];
  if (!def) return;
  for (let i = 0; i < count; i++) {
    const ang = RNG.random() * Math.PI * 2;
    const spot = findNearestFloor(node, Math.floor((e.x + Math.cos(ang) * dist) / TILE), Math.floor((e.y + Math.sin(ang) * dist) / TILE));
    node.enemies.push(new Enemy(def, spot.x, spot.y, game.dungeon.floorNum));
  }
}

function g3Waves(game, e, idA, idB){
  if (!e.minionsSpawned && e.hp < e.maxHp * 0.62) {
    e.minionsSpawned = true;
    g3Spawn(game, e, idA, 3, 90);
  }
  if (!e.minions2 && e.hp < e.maxHp * 0.24) {
    e.minions2 = true;
    g3Spawn(game, e, idB, 2, 90);
  }
}

function g3Back(game, e, dt, mul){
  const node = game.currentRoom, player = game.player;
  const v = seekVector(e, player.x, player.y);
  tryMoveEntity(e, node, node.obstacles, -v.x * e.speed * dt * (mul || 1), -v.y * e.speed * dt * (mul || 1));
}

const G3_TD = '#3f7fc0';
const G3_DD = '#8aa0b8';
const G3_MR = '#00ffa8';
const G3_HS = '#ff4fd8';

ENEMY_BEHAVIOR_HANDLERS.g3TdCrusher = function aiG3TdCrusher(game, e, dt){
  const player = game.player, s = g3(e);
  if (s.t > 0) {
    s.t -= dt;
    e.hitFlash = (Math.sin(s.t * 26) > 0) ? 0.12 : 0;
    if (s.t <= 0) {
      dnbRing(game, e, 14, 150, e.dmg, G3_TD, RNG.random() * Math.PI * 2, Math.floor(RNG.random() * 14), 2);
      g3Blast(game, e, e.x, e.y, 74);
      e.attackTimer = Util.rand(2.2, 2.8);
    }
    return;
  }
  chaseSeek(game, e, player.x, player.y, 0.7, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0 && Util.dist(e.x, e.y, player.x, player.y) < 150) s.t = 0.55;
};

ENEMY_BEHAVIOR_HANDLERS.g3TdVent = function aiG3TdVent(game, e, dt){
  const s = g3(e);
  s.t -= dt;
  if (s.t <= 0) {
    s.t = 1.5;
    for (let i = 0; i < 4; i++) fireProjectileAngle(game, e, s.a + i * (Math.PI / 2), 175, e.dmg, { color: G3_TD, radius: 6 });
    s.a += Math.PI / 4;
  }
};

ENEMY_BEHAVIOR_HANDLERS.g3TdAngler = function aiG3TdAngler(game, e, dt){
  const node = game.currentRoom, player = game.player, s = g3(e);
  if (e.dashing) {
    tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
    e.dashTimer -= dt;
    if (e.dashTimer <= 0) { e.dashing = false; s.t = 2.0; e.submerged = true; e.shielded = true; }
    return;
  }
  if (s.t > 0) { s.t -= dt; g3Back(game, e, dt, 0.5); return; }
  e.submerged = true; e.shielded = true;
  if (Util.dist(e.x, e.y, player.x, player.y) < 175) {
    const v = seekVector(e, player.x, player.y);
    e.submerged = false; e.shielded = false;
    e.dashing = true; e.dashTimer = 0.5;
    e.dashVX = v.x * e.speed * 5.4; e.dashVY = v.y * e.speed * 5.4;
  }
};

ENEMY_BEHAVIOR_HANDLERS.g3TdBarbel = function aiG3TdBarbel(game, e, dt){
  const player = game.player, s = g3(e);
  const prevD = s.x || 0;
  const d = Util.dist(e.x, e.y, player.x, player.y);
  s.x = d;
  if (d > 210) chaseSeek(game, e, player.x, player.y, 1, dt);
  else if (d < 110) g3Back(game, e, dt, 1);
  s.t -= dt;
  if (s.t <= 0 && d > prevD + 0.2 && d < 380) {
    s.t = 0.9;
    const aim = Math.atan2(player.y - e.y, player.x - e.x);
    for (let i = -1; i <= 1; i++) fireProjectileAngle(game, e, aim + i * 0.16, 235, e.dmg, { color: G3_TD, radius: 5 });
  }
};

ENEMY_BEHAVIOR_HANDLERS.g3TdImploder = function aiG3TdImploder(game, e, dt){
  const player = game.player, s = g3(e);
  if (s.t > 0) {
    s.t -= dt;
    e.hitFlash = 0.1;
    if (s.t <= 0) {
      g3Converge(game, e, s.x, s.y, 10, 150, 165, e.dmg, G3_TD);
      e.attackTimer = Util.rand(2.6, 3.2);
    }
    return;
  }
  chaseSeek(game, e, player.x, player.y, 0.55, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) { s.x = player.x; s.y = player.y; s.t = 0.8; }
};

ENEMY_BEHAVIOR_HANDLERS.g3TdBrine = function aiG3TdBrine(game, e, dt){
  const s = g3(e);
  aiWander(game, e, dt);
  s.t -= dt;
  if (s.t <= 0) {
    s.t = 0.45;
    const ang = RNG.random() * Math.PI * 2;
    game.projectiles.push(new Projectile(e.x, e.y, Math.cos(ang) * 42, Math.sin(ang) * 42, e.dmg, 'enemy',
      { color: G3_TD, radius: 6, life: 3.4, source: e }));
  }
};

ENEMY_BEHAVIOR_HANDLERS.g3TdClamp = function aiG3TdClamp(game, e, dt){
  const node = game.currentRoom, player = game.player, s = g3(e);
  if (e.dashing) {
    tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
    e.dashTimer -= dt;
    if (e.dashTimer <= 0) {
      e.dashing = false;
      s.n--;
      s.t = (s.n > 0) ? 0.18 : 1.9;
    }
    return;
  }
  s.t -= dt;
  if (s.t > 0) { if (s.n <= 0) chaseSeek(game, e, player.x, player.y, 0.8, dt); return; }
  if (s.n <= 0 && Util.dist(e.x, e.y, player.x, player.y) > 130) { chaseSeek(game, e, player.x, player.y, 0.9, dt); return; }
  if (s.n <= 0) s.n = 3;
  const v = seekVector(e, player.x, player.y);
  e.dashing = true; e.dashTimer = 0.22;
  e.dashVX = v.x * e.speed * 4.2; e.dashVY = v.y * e.speed * 4.2;
};

ENEMY_BEHAVIOR_HANDLERS.g3TdSiphon = function aiG3TdSiphon(game, e, dt){
  const node = game.currentRoom, s = g3(e);
  g3Back(game, e, dt, 0.9);
  s.t -= dt;
  if (s.t > 0) return;
  s.t = 2.4;
  let spent = 0;
  for (const o of node.enemies) {
    if (o === e || o.isDead || o.isBoss || o.hp >= o.maxHp) continue;
    const amt = Math.max(1, Math.round(o.maxHp * 0.05));
    o.hp = Math.min(o.maxHp, o.hp + amt);
    game.floatTexts.push(new FloatText(o.x, o.y - o.radius - 6, '+' + amt, Theme.floatText.heal));
    spent += amt;
    if (spent > e.maxHp * 0.2) break;
  }
  if (spent > 0) {
    e.hp -= spent;
    e.hitFlash = 0.15;
    if (e.hp <= 0) { e.hp = 0; e.isDead = true; handleEnemyDeath(game, e); }
  }
};

ENEMY_BEHAVIOR_HANDLERS.g3TdSpire = function aiG3TdSpire(game, e, dt){
  const s = g3(e);
  s.t -= dt;
  if (s.t <= 0) {
    s.t = 0.22;
    fireProjectileAngle(game, e, s.a, 140, e.dmg, { color: G3_TD, radius: 6, life: 3.2 });
    s.a += 0.62 * s.dir;
  }
};

ENEMY_BEHAVIOR_HANDLERS.g3TdDrifter = function aiG3TdDrifter(game, e, dt){
  const node = game.currentRoom, s = g3(e);
  if (!s.on) { s.on = true; s.a = RNG.random() * Math.PI * 2; }

  const moved = tryMoveEntity(e, node, node.obstacles, Math.cos(s.a) * e.speed * dt, Math.sin(s.a) * e.speed * dt);
  if (!moved.movedX && !moved.movedY) {
    s.a += Math.PI * (0.6 + RNG.random() * 0.8);
  }
};

ENEMY_BEHAVIOR_HANDLERS.g3TdMarrow = function aiG3TdMarrow(game, e, dt){
  const player = game.player, s = g3(e);
  s.t -= dt;
  if (s.t <= 0) { s.on = !s.on; s.t = s.on ? 1.1 : 1.3; e.shielded = s.on; }
  if (s.on) { e.hitFlash = 0.08; return; }
  chaseSeek(game, e, player.x, player.y, 1.5, dt);
};

ENEMY_BEHAVIOR_HANDLERS.g3TdGulper = function aiG3TdGulper(game, e, dt){
  const node = game.currentRoom, player = game.player, s = g3(e);
  if (s.t > 0) { s.t -= dt; e.shielded = false; if (s.t <= 0) e.submerged = false; return; }
  if (e.dashing) {
    tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
    e.dashTimer -= dt;
    if (Util.dist(e.x, e.y, player.x, player.y) < e.radius + player.radius + 4) {
      e.dashing = false; s.t = 2.0; e.submerged = true;
      return;
    }
    if (e.dashTimer <= 0) e.dashing = false;
    return;
  }
  chaseSeek(game, e, player.x, player.y, 0.85, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0 && Util.dist(e.x, e.y, player.x, player.y) < 240) {
    e.attackTimer = Util.rand(1.8, 2.4);
    const v = seekVector(e, player.x, player.y);
    e.dashing = true; e.dashTimer = 0.55;
    e.dashVX = v.x * e.speed * 4.4; e.dashVY = v.y * e.speed * 4.4;
  }
};

ENEMY_BEHAVIOR_HANDLERS.g3TdLamp = function aiG3TdLamp(game, e, dt){
  const player = game.player, s = g3(e);
  const d = Util.dist(e.x, e.y, player.x, player.y);
  if (d < 190) g3Back(game, e, dt, 0.8);
  else if (d > 300) chaseSeek(game, e, player.x, player.y, 0.7, dt);
  s.t -= dt;
  if (s.t <= 0) {
    s.t = 2.1;
    dnbRing(game, e, 12, 95, e.dmg, G3_TD, RNG.random() * Math.PI * 2, 0, 0);
  }
};

ENEMY_BEHAVIOR_HANDLERS.g3TdNautilus = function aiG3TdNautilus(game, e, dt){
  const player = game.player, s = g3(e);
  if (!s.on) { s.on = true; s.x = 260; }
  s.x = Math.max(70, s.x - 22 * dt);
  s.a += 1.5 * s.dir * dt;
  const tx = player.x + Math.cos(s.a) * s.x, ty = player.y + Math.sin(s.a) * s.x;
  chaseSeek(game, e, tx, ty, 1.15, dt);
  s.t -= dt;
  if (s.t <= 0) {
    s.t = 0.6;
    fireProjectileAngle(game, e, s.a + Math.PI / 2 * -s.dir, 190, e.dmg, { color: G3_TD, radius: 5 });
  }
  if (s.x <= 72) { s.x = 260; s.dir = -s.dir; }
};

ENEMY_BEHAVIOR_HANDLERS.g3TdColumn = function aiG3TdColumn(game, e, dt){
  const player = game.player;
  if (e.lobTimer > 0) {
    e.lobTimer -= dt;
    if (e.lobTimer <= 0) {
      g3Blast(game, e, e.lobX, e.lobY, e.type.burstRadius || 62);
      e.attackTimer = Util.rand(2.2, 2.8);
    }
    return;
  }
  chaseSeek(game, e, player.x, player.y, 0.6, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0 && Util.dist(e.x, e.y, player.x, player.y) < 330) {
    e.lobX = player.x; e.lobY = player.y;
    e.lobTime = 1.25; e.lobTimer = 1.25;
  }
};

ENEMY_BEHAVIOR_HANDLERS.g3DdStalker = function aiG3DdStalker(game, e, dt){
  const player = game.player;
  const d = Util.dist(e.x, e.y, player.x, player.y);
  const near = d < 90;
  e.submerged = !near; e.shielded = !near;
  chaseSeek(game, e, player.x, player.y, near ? 1.3 : 1, dt);
};

ENEMY_BEHAVIOR_HANDLERS.g3DdPounce = function aiG3DdPounce(game, e, dt){
  const node = game.currentRoom, player = game.player, s = g3(e);
  if (e.dashing) {
    tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
    e.dashTimer -= dt;
    if (e.dashTimer <= 0) { e.dashing = false; s.t = 1.6; }
    return;
  }
  if (s.t > 0) { s.t -= dt; return; }
  if (!hasLineOfSight(node, e, player.x, player.y)) return;
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 34) > 0) ? 0.14 : 0;
    if (e.telegraph <= 0) {
      const v = seekVector(e, player.x, player.y);
      e.dashing = true; e.dashTimer = 0.8;
      e.dashVX = v.x * e.speed * 6.2; e.dashVY = v.y * e.speed * 6.2;
    }
    return;
  }
  e.telegraph = 0.35;
};

ENEMY_BEHAVIOR_HANDLERS.g3DdChorus = function aiG3DdChorus(game, e, dt){
  const player = game.player, s = g3(e);
  const moved = Math.hypot(player.x - s.x, player.y - s.y) / Math.max(dt, 0.0001);
  s.x = player.x; s.y = player.y;
  if (moved > 34) { e.submerged = true; s.t = Math.max(s.t, 0.35); return; }
  e.submerged = false;
  s.t -= dt;
  if (s.t <= 0) {
    s.t = 0.5;
    dnbRing(game, e, 8, 190, e.dmg, G3_DD, Math.atan2(player.y - e.y, player.x - e.x), 0, 0);
  }
};

ENEMY_BEHAVIOR_HANDLERS.g3DdMaw = function aiG3DdMaw(game, e, dt){
  const node = game.currentRoom, player = game.player, s = g3(e);
  if (e.dashing) {
    tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
    e.dashTimer -= dt;
    if (e.dashTimer <= 0) { e.dashing = false; s.t = 0.9; }
    return;
  }
  s.t -= dt;
  if (s.t > 0) { g3Back(game, e, dt, 0.7); return; }
  const v = seekVector(e, player.x, player.y);
  e.dashing = true; e.dashTimer = 0.75;
  e.dashVX = v.x * e.speed * 4.0; e.dashVY = v.y * e.speed * 4.0;
};

ENEMY_BEHAVIOR_HANDLERS.g3DdLeech = function aiG3DdLeech(game, e, dt){
  const player = game.player, s = g3(e);
  s.a += 0.9 * s.dir * dt;
  const tx = player.x + Math.cos(s.a) * 34, ty = player.y + Math.sin(s.a) * 34;
  chaseSeek(game, e, tx, ty, 1.35, dt);
};

ENEMY_BEHAVIOR_HANDLERS.g3DdWhisper = function aiG3DdWhisper(game, e, dt){
  const player = game.player, s = g3(e);
  s.t -= dt;
  if (s.t <= 0) {
    s.t = 1.8;
    const ang = Math.atan2(e.y - player.y, e.x - player.x) + Math.PI;
    g3Blink(game, e, player.x + Math.cos(ang) * 62, player.y + Math.sin(ang) * 62);
  }
  chaseSeek(game, e, player.x, player.y, 0.55, dt);
};

ENEMY_BEHAVIOR_HANDLERS.g3DdGloom = function aiG3DdGloom(game, e, dt){
  const s = g3(e);
  aiWander(game, e, dt);
  s.t -= dt;
  if (s.t <= 0) {
    s.t = 3.0;
    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * Math.PI * 2 + s.a;
      game.projectiles.push(new Projectile(e.x, e.y, Math.cos(ang) * 52, Math.sin(ang) * 52, e.dmg, 'enemy',
        { color: G3_DD, radius: 6, life: 6.0, source: e }));
    }
    s.a += 0.31;
  }
};

ENEMY_BEHAVIOR_HANDLERS.g3DdFang = function aiG3DdFang(game, e, dt){
  const node = game.currentRoom, player = game.player;
  let pack = 0;
  for (const o of node.enemies) {
    if (o === e || o.isDead) continue;
    if (Util.dist(e.x, e.y, o.x, o.y) < 150) pack++;
  }
  chaseSeek(game, e, player.x, player.y, 0.6 + Math.min(pack, 4) * 0.22, dt);
};

ENEMY_BEHAVIOR_HANDLERS.g3DdMoth = function aiG3DdMoth(game, e, dt){
  const node = game.currentRoom, player = game.player, s = g3(e);
  s.t2 -= dt;
  if (s.t2 <= 0) { s.t2 = Util.rand(0.3, 0.7); s.a = RNG.random() * Math.PI * 2; }
  const v = seekVector(e, player.x, player.y);
  const mx = v.x * 0.45 + Math.cos(s.a) * 0.55, my = v.y * 0.45 + Math.sin(s.a) * 0.55;
  const len = Math.hypot(mx, my) || 1;
  tryMoveEntity(e, node, node.obstacles, (mx / len) * e.speed * dt, (my / len) * e.speed * dt);
  s.t -= dt;
  if (s.t <= 0 && v.d < 400) {
    s.t = 1.7;
    fireProjectileAt(game, e, player.x, player.y, 130, e.dmg, { color: G3_DD, radius: 5, homing: 2.4, life: 3.5 });
  }
};

ENEMY_BEHAVIOR_HANDLERS.g3DdHusk = function aiG3DdHusk(game, e, dt){
  const player = game.player;
  const d = Util.dist(e.x, e.y, player.x, player.y);
  e.shielded = d > 120;
  chaseSeek(game, e, player.x, player.y, e.shielded ? 0.85 : 1.2, dt);
};

ENEMY_BEHAVIOR_HANDLERS.g3DdBrood = function aiG3DdBrood(game, e, dt){
  const player = game.player, s = g3(e);
  const d = Util.dist(e.x, e.y, player.x, player.y);
  if (d < 210) g3Back(game, e, dt, 1);
  else if (d > 290) chaseSeek(game, e, player.x, player.y, 0.6, dt);
  s.t -= dt;
  if (s.t <= 0 && e.minionsSpawned < 6) {
    s.t = 4.5;
    e.minionsSpawned += 2;
    g3Spawn(game, e, 'ddcrawler', 2, 55);
  }
};

ENEMY_BEHAVIOR_HANDLERS.g3DdVeil = function aiG3DdVeil(game, e, dt){
  const player = game.player, s = g3(e);
  chaseSeek(game, e, player.x, player.y, 0.45, dt);
  s.t -= dt;
  if (s.t <= 0) {
    s.t = 2.3;
    const ang = Math.atan2(player.y - e.y, player.x - e.x);
    g3Wall(game, e, e.x, e.y, ang, 7, 26, 150, e.dmg, G3_DD, -1);
  }
};

ENEMY_BEHAVIOR_HANDLERS.g3DdClatter = function aiG3DdClatter(game, e, dt){
  const player = game.player, s = g3(e);
  chaseSeek(game, e, player.x, player.y, 0.75, dt);
  s.t -= dt;
  if (s.t <= 0) {
    s.t = 1.1;
    game.projectiles.push(new Projectile(e.x, e.y, 0, 0, e.dmg, 'enemy',
      { color: G3_DD, radius: 7, life: 10, source: e }));
  }
};

ENEMY_BEHAVIOR_HANDLERS.g3DdBreath = function aiG3DdBreath(game, e, dt){
  const player = game.player, s = g3(e);
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 24) > 0) ? 0.12 : 0;
    if (e.telegraph <= 0) {
      const aim = Math.atan2(player.y - e.y, player.x - e.x);
      for (let i = -4; i <= 4; i++) fireProjectileAngle(game, e, aim + i * 0.11, 205, e.dmg, { color: G3_DD, radius: 5 });
      s.t = 2.6;
    }
    return;
  }
  s.t -= dt;
  if (s.t <= 0 && Util.dist(e.x, e.y, player.x, player.y) < 330) { e.telegraph = 0.8; return; }
  chaseSeek(game, e, player.x, player.y, 0.8, dt);
};

ENEMY_BEHAVIOR_HANDLERS.g3DdCrawler = function aiG3DdCrawler(game, e, dt){
  const player = game.player, s = g3(e);
  s.t -= dt;
  if (e.submerged) {
    chaseSeek(game, e, player.x, player.y, 1.7, dt);
    if (s.t <= 0 || Util.dist(e.x, e.y, player.x, player.y) < 26) {
      e.submerged = false; e.shielded = false;
      g3Blast(game, e, e.x, e.y, 44);
      s.t = 2.6;
    }
    return;
  }
  chaseSeek(game, e, player.x, player.y, 0.9, dt);
  if (s.t <= 0) { e.submerged = true; e.shielded = true; s.t = 1.4; e.navPath = null; e.pathTimer = 0; }
};

ENEMY_BEHAVIOR_HANDLERS.g3MrGlitch = function aiG3MrGlitch(game, e, dt){
  const player = game.player, s = g3(e);
  s.t -= dt;
  if (s.t <= 0) {
    s.t = 0.42;
    const v = seekVector(e, player.x, player.y);
    const ang = Math.atan2(v.y, v.x) + Util.rand(-1.1, 1.1);
    g3Blink(game, e, e.x + Math.cos(ang) * 58, e.y + Math.sin(ang) * 58);
  }
};

ENEMY_BEHAVIOR_HANDLERS.g3MrClone = function aiG3MrClone(game, e, dt){
  const node = game.currentRoom, player = game.player, s = g3(e);
  chaseSeek(game, e, player.x, player.y, 1, dt);
  if (e.minionsSpawned >= 1) return;
  let clones = 0;
  for (const o of node.enemies) if (!o.isDead && o.type === e.type) clones++;
  if (clones >= 6) return;
  s.t -= dt;
  if (s.t <= 0 && e.hp < e.maxHp * 0.75) {
    s.t = 99;
    e.minionsSpawned = 1;
    g3Spawn(game, e, 'mrclone', 1, 40);
    e.hitFlash = 0.2;
  }
};

ENEMY_BEHAVIOR_HANDLERS.g3MrRewind = function aiG3MrRewind(game, e, dt){
  const player = game.player, s = g3(e);
  if (!s.hist) s.hist = [];
  s.t2 -= dt;
  if (s.t2 <= 0) {
    s.t2 = 0.15;
    s.hist.push({ x: e.x, y: e.y });
    if (s.hist.length > 12) s.hist.shift();
  }
  chaseSeek(game, e, player.x, player.y, 1.25, dt);
  s.t -= dt;
  if (s.t <= 0) {
    s.t = 2.4;
    const p = s.hist[0];
    if (p) { g3Blink(game, e, p.x, p.y); s.hist.length = 0; }
  }
};

ENEMY_BEHAVIOR_HANDLERS.g3MrInvert = function aiG3MrInvert(game, e, dt){
  const node = game.currentRoom, player = game.player, s = g3(e);
  const pvx = (player.x - s.x) / Math.max(dt, 0.0001), pvy = (player.y - s.y) / Math.max(dt, 0.0001);
  s.x = player.x; s.y = player.y;
  const len = Math.hypot(pvx, pvy);
  if (len > 12) tryMoveEntity(e, node, node.obstacles, (pvx / len) * e.speed * dt, (pvy / len) * e.speed * dt);
  s.t -= dt;
  if (s.t <= 0) {
    s.t = 1.3;
    fireProjectileAt(game, e, player.x, player.y, 215, e.dmg, { color: G3_MR, radius: 5 });
  }
};

ENEMY_BEHAVIOR_HANDLERS.g3MrFourthWall = function aiG3MrFourthWall(game, e, dt){
  const node = game.currentRoom, player = game.player, s = g3(e);
  g3Back(game, e, dt, 0.5);
  s.t -= dt;
  if (s.t > 0) return;
  s.t = 1.9;
  const W = node.tileW * TILE, H = node.tileH * TILE;
  const shots = [
    { x: 4, y: player.y, vx: 1, vy: 0 },
    { x: W - 4, y: player.y, vx: -1, vy: 0 },
    { x: player.x, y: 4, vx: 0, vy: 1 },
    { x: player.x, y: H - 4, vx: 0, vy: -1 },
  ];
  const pick = shots[Math.floor(RNG.random() * shots.length)];
  game.projectiles.push(new Projectile(pick.x, pick.y, pick.vx * 250, pick.vy * 250, e.dmg, 'enemy',
    { color: G3_MR, radius: 6, life: 4, source: e }));
};

ENEMY_BEHAVIOR_HANDLERS.g3MrOutOfBounds = function aiG3MrOutOfBounds(game, e, dt){
  const player = game.player, s = g3(e);
  s.t -= dt;
  if (s.t <= 0) {
    s.t = 3.2;
    const ang = RNG.random() * Math.PI * 2;
    g3Blink(game, e, player.x + Math.cos(ang) * 210, player.y + Math.sin(ang) * 210);
    dnbRing(game, e, 9, 175, e.dmg, G3_MR, ang, 0, 0);
  }
  chaseSeek(game, e, player.x, player.y, 0.7, dt);
};

ENEMY_BEHAVIOR_HANDLERS.g3MrNull = function aiG3MrNull(game, e, dt){
  const player = game.player, s = g3(e);
  s.t -= dt;
  if (s.t <= 0) {
    s.on = !s.on;
    s.t = s.on ? 0.9 : 1.4;
    e.submerged = s.on; e.shielded = s.on;
  }
  chaseSeek(game, e, player.x, player.y, s.on ? 1.6 : 0.9, dt);
};

ENEMY_BEHAVIOR_HANDLERS.g3MrFrameskip = function aiG3MrFrameskip(game, e, dt){
  const player = game.player, s = g3(e);
  s.t -= dt;
  if (s.t <= 0) {
    s.t = 0.55;
    const v = seekVector(e, player.x, player.y);
    const step = Math.min(72, v.d);
    g3Blink(game, e, e.x + v.x * step, e.y + v.y * step);
  }
};

ENEMY_BEHAVIOR_HANDLERS.g3MrOverflow = function aiG3MrOverflow(game, e, dt){
  const player = game.player, s = g3(e);
  const d = Util.dist(e.x, e.y, player.x, player.y);
  if (d > 260) chaseSeek(game, e, player.x, player.y, 0.8, dt);
  else if (d < 150) g3Back(game, e, dt, 0.8);
  s.t -= dt;
  if (s.t <= 0) {
    s.t = 1.4;
    s.n = (s.n >= 9) ? 1 : s.n + 1;
    const aim = Math.atan2(player.y - e.y, player.x - e.x);
    const half = (s.n - 1) / 2;
    for (let i = 0; i < s.n; i++) fireProjectileAngle(game, e, aim + (i - half) * 0.15, 220, e.dmg, { color: G3_MR, radius: 5 });
  }
};

ENEMY_BEHAVIOR_HANDLERS.g3MrParser = function aiG3MrParser(game, e, dt){
  const node = game.currentRoom, player = game.player, s = g3(e);
  const cx = node.tileW * TILE / 2, cy = node.tileH * TILE / 2;
  chaseSeek(game, e, cx * 2 - player.x, cy * 2 - player.y, 1.1, dt);
  s.t -= dt;
  if (s.t <= 0) {
    s.t = 1.6;
    fireProjectileAt(game, e, player.x, player.y, 240, e.dmg, { color: G3_MR, radius: 5 });
  }
};

ENEMY_BEHAVIOR_HANDLERS.g3MrAssert = function aiG3MrAssert(game, e, dt){
  const node = game.currentRoom, s = g3(e);
  aiWander(game, e, dt);
  if (s.t2 > 0) {
    s.t2 -= dt;

    if (e.lobTimer > 0) e.lobTimer -= dt;
    if (s.t2 <= 0) {
      for (let i = 0; i < 3; i++) g3Blast(game, e, s.hist[i].x, s.hist[i].y, 46);
      s.hist = null;
      e.lobTimer = 0;
    }
    return;
  }
  s.t -= dt;
  if (s.t <= 0) {
    s.t = 3.0; s.t2 = 1.0;
    s.hist = [];
    for (let i = 0; i < 3; i++) {
      const tx = 1 + Math.floor(RNG.random() * Math.max(1, node.tileW - 2));
      const ty = 1 + Math.floor(RNG.random() * Math.max(1, node.tileH - 2));
      const spot = findNearestFloor(node, tx, ty);
      s.hist.push({ x: spot.x * TILE + TILE / 2, y: spot.y * TILE + TILE / 2 });
    }

    e.lobX = s.hist[0].x; e.lobY = s.hist[0].y; e.lobTime = 1.0; e.lobTimer = 1.0;
  }
};

ENEMY_BEHAVIOR_HANDLERS.g3MrGhost = function aiG3MrGhost(game, e, dt){
  const node = game.currentRoom, player = game.player;
  const v = seekVector(e, player.x, player.y);

  e.x += v.x * e.speed * dt;
  e.y += v.y * e.speed * dt;
  e.x = Util.clamp(e.x, TILE, node.tileW * TILE - TILE);
  e.y = Util.clamp(e.y, TILE, node.tileH * TILE - TILE);
};

ENEMY_BEHAVIOR_HANDLERS.g3MrLoop = function aiG3MrLoop(game, e, dt){
  const node = game.currentRoom, s = g3(e);
  if (!s.on) { s.on = true; s.x = e.x; s.y = e.y; }
  s.a += 1.6 * s.dir * dt;
  const tx = s.x + Math.cos(s.a) * 90, ty = s.y + Math.sin(s.a) * 90;
  const v = seekVector(e, tx, ty);
  tryMoveEntity(e, node, node.obstacles, v.x * e.speed * dt, v.y * e.speed * dt);
  s.t -= dt;
  if (s.t <= 0) {
    s.t = 0.34;
    fireProjectileAngle(game, e, s.a + Math.PI / 2 * s.dir, 210, e.dmg, { color: G3_MR, radius: 5 });
  }
};

ENEMY_BEHAVIOR_HANDLERS.g3MrSegfault = function aiG3MrSegfault(game, e, dt){
  const node = game.currentRoom, player = game.player, s = g3(e);
  if (e.dashing) {
    tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
    e.dashTimer -= dt;
    if (e.dashTimer <= 0) e.dashing = false;
    return;
  }
  aiWander(game, e, dt);
  s.t -= dt;
  if (s.t <= 0) {
    s.t = Util.rand(1.6, 3.2);
    const v = seekVector(e, player.x, player.y);
    e.dashing = true; e.dashTimer = 0.6;
    e.dashVX = v.x * e.speed * 7.5; e.dashVY = v.y * e.speed * 7.5;
  }
};

ENEMY_BEHAVIOR_HANDLERS.g3MrEditor = function aiG3MrEditor(game, e, dt){
  const node = game.currentRoom, player = game.player, s = g3(e);

  let target = null, best = Infinity;
  for (const ob of node.obstacles) {
    if (ob.destroyed) continue;
    const d = Util.dist2(e.x, e.y, ob.x, ob.y);
    if (d < best) { best = d; target = ob; }
  }
  if (target) {
    chaseSeek(game, e, target.x, target.y, 1, dt);
    if (Util.dist(e.x, e.y, target.x, target.y) < e.radius + target.radius) {
      target.destroyed = true;
      node.tileLayerDirty = true;
      e.hitFlash = 0.15;
    }
  } else {
    chaseSeek(game, e, player.x, player.y, 1.1, dt);
  }
  s.t -= dt;
  if (s.t <= 0) {
    s.t = 2.0;
    fireProjectileAt(game, e, player.x, player.y, 200, e.dmg, { color: G3_MR, radius: 5 });
  }
};

ENEMY_BEHAVIOR_HANDLERS.g3HsLancer = function aiG3HsLancer(game, e, dt){
  const node = game.currentRoom, player = game.player, s = g3(e);
  if (e.dashing) {
    tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
    e.dashTimer -= dt;
    if (e.dashTimer <= 0) { e.dashing = false; s.t = 0.7; }
    return;
  }
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 40) > 0) ? 0.14 : 0;
    if (e.telegraph <= 0) {
      const v = seekVector(e, player.x, player.y);
      e.dashing = true; e.dashTimer = 0.9;
      e.dashVX = v.x * e.speed * 6.0; e.dashVY = v.y * e.speed * 6.0;
    }
    return;
  }
  s.t -= dt;
  if (s.t <= 0) e.telegraph = 0.28;
  else chaseSeek(game, e, player.x, player.y, 0.5, dt);
};

ENEMY_BEHAVIOR_HANDLERS.g3HsWarp = function aiG3HsWarp(game, e, dt){
  const player = game.player, s = g3(e);
  s.t -= dt;
  if (s.t <= 0) {
    s.t = 1.5;
    const ang = RNG.random() * Math.PI * 2;
    g3Blink(game, e, player.x + Math.cos(ang) * 170, player.y + Math.sin(ang) * 170);
    const aim = Math.atan2(player.y - e.y, player.x - e.x);
    for (let i = -2; i <= 2; i++) fireProjectileAngle(game, e, aim + i * 0.13, 265, e.dmg, { color: G3_HS, radius: 5 });
  }
};

ENEMY_BEHAVIOR_HANDLERS.g3HsComet = function aiG3HsComet(game, e, dt){
  const player = game.player, s = g3(e);
  if (!s.on) { s.on = true; s.x = 300; }
  s.x = Math.max(40, s.x - 62 * dt);
  s.a += (1.2 + (300 - s.x) / 130) * s.dir * dt;
  chaseSeek(game, e, player.x + Math.cos(s.a) * s.x, player.y + Math.sin(s.a) * s.x, 1.6, dt);
  s.t -= dt;
  if (s.t <= 0) {
    s.t = 0.16;
    game.projectiles.push(new Projectile(e.x, e.y, 0, 0, e.dmg, 'enemy', { color: G3_HS, radius: 5, life: 1.6, source: e }));
  }
  if (s.x <= 42) s.x = 300;
};

ENEMY_BEHAVIOR_HANDLERS.g3HsPulsar = function aiG3HsPulsar(game, e, dt){
  const s = g3(e);
  s.a += 1.05 * s.dir * dt;
  s.t -= dt;
  if (s.t <= 0) {
    s.t = 0.15;
    for (let i = 0; i < 6; i++) fireProjectileAngle(game, e, s.a + i * (Math.PI / 3), 175, e.dmg, { color: G3_HS, radius: 5 });
  }
};

ENEMY_BEHAVIOR_HANDLERS.g3HsNova = function aiG3HsNova(game, e, dt){
  const player = game.player, s = g3(e);
  if (s.t2 > 0) { s.t2 -= dt; e.shielded = false; return; }
  e.shielded = true;
  s.t -= dt;
  e.hitFlash = (Math.sin(s.t * 12) > 0) ? 0.1 : 0;
  chaseSeek(game, e, player.x, player.y, 0.35, dt);
  if (s.t <= 0) {
    s.t = 4.0; s.t2 = 2.0;
    e.shielded = false;
    for (let w = 0; w < 3; w++) dnbRing(game, e, 16, 140 + w * 45, e.dmg, G3_HS, w * 0.2, Math.floor(RNG.random() * 16), 2);
    g3Blast(game, e, e.x, e.y, 90);
  }
};

ENEMY_BEHAVIOR_HANDLERS.g3HsQuasar = function aiG3HsQuasar(game, e, dt){
  const s = g3(e);
  if (!s.on) { s.on = true; s.a = RNG.random() * Math.PI * 2; }
  s.a += 0.55 * s.dir * dt;
  s.t -= dt;
  if (s.t <= 0) {
    s.t = 0.1;
    fireProjectileAngle(game, e, s.a, 300, e.dmg, { color: G3_HS, radius: 4, life: 2.2 });
    fireProjectileAngle(game, e, s.a + Math.PI, 300, e.dmg, { color: G3_HS, radius: 4, life: 2.2 });
  }
};

ENEMY_BEHAVIOR_HANDLERS.g3HsFold = function aiG3HsFold(game, e, dt){
  const node = game.currentRoom, player = game.player, s = g3(e);
  chaseSeek(game, e, player.x, player.y, 0.75, dt);
  s.t -= dt;
  if (s.t <= 0) {
    s.t = 2.2;
    const cx = node.tileW * TILE / 2, cy = node.tileH * TILE / 2;
    const ang = Math.atan2(player.y - e.y, player.x - e.x);
    g3Wall(game, e, e.x, e.y, ang, 5, 30, 190, e.dmg, G3_HS, 2);
    g3Blink(game, e, cx * 2 - e.x, cy * 2 - e.y);
  }
};

ENEMY_BEHAVIOR_HANDLERS.g3HsSingularity = function aiG3HsSingularity(game, e, dt){
  const player = game.player, s = g3(e);
  g3Back(game, e, dt, 0.6);
  s.t -= dt;
  if (s.t <= 0) {
    s.t = 2.0;
    g3Converge(game, e, player.x, player.y, 14, 190, 240, e.dmg, G3_HS);
  }
};

ENEMY_BEHAVIOR_HANDLERS.g3HsDrone = function aiG3HsDrone(game, e, dt){
  const node = game.currentRoom, player = game.player, s = g3(e);
  s.t -= dt;
  if (s.t <= 0) { s.t = Util.rand(0.15, 0.35); s.a = RNG.random() * Math.PI * 2; }
  const v = seekVector(e, player.x, player.y);
  const mx = v.x * 0.8 + Math.cos(s.a) * 0.2, my = v.y * 0.8 + Math.sin(s.a) * 0.2;
  const len = Math.hypot(mx, my) || 1;
  tryMoveEntity(e, node, node.obstacles, (mx / len) * e.speed * dt, (my / len) * e.speed * dt);
};

ENEMY_BEHAVIOR_HANDLERS.g3HsEcho = function aiG3HsEcho(game, e, dt){
  const player = game.player, s = g3(e);
  if (!s.hist) s.hist = [];
  s.t2 -= dt;
  if (s.t2 <= 0) {
    s.t2 = 0.2;
    s.hist.push({ x: player.x, y: player.y });
    if (s.hist.length > 6) s.hist.shift();
  }
  const d = Util.dist(e.x, e.y, player.x, player.y);
  if (d > 250) chaseSeek(game, e, player.x, player.y, 0.9, dt);
  else if (d < 140) g3Back(game, e, dt, 0.9);
  s.t -= dt;
  if (s.t <= 0) {
    s.t = 1.2;
    fireProjectileAt(game, e, player.x, player.y, 250, e.dmg, { color: G3_HS, radius: 5 });
    const old = s.hist[0];
    if (old) fireProjectileAt(game, e, old.x, old.y, 250, e.dmg, { color: G3_HS, radius: 5 });
  }
};

ENEMY_BEHAVIOR_HANDLERS.g3HsShard = function aiG3HsShard(game, e, dt){
  const player = game.player, s = g3(e);
  chaseSeek(game, e, player.x, player.y, 1.05, dt);
  s.t -= dt;
  if (s.t <= 0 && e.minionsSpawned < 4) {
    s.t = 5.0;
    e.minionsSpawned += 2;
    g3Spawn(game, e, 'hsdrone', 2, 45);
    dnbRing(game, e, 8, 200, e.dmg, G3_HS, RNG.random() * Math.PI * 2, 0, 0);
  }
};

ENEMY_BEHAVIOR_HANDLERS.g3HsPrism = function aiG3HsPrism(game, e, dt){
  const player = game.player, s = g3(e);
  if (s.n > 0) {
    s.t2 -= dt;
    if (s.t2 <= 0) {
      s.t2 = 0.3;
      const spread = 0.1 + (3 - s.n) * 0.14;
      for (let i = -2; i <= 2; i++) fireProjectileAngle(game, e, s.a + i * spread, 230, e.dmg, { color: G3_HS, radius: 5 });
      s.n--;
      if (s.n <= 0) s.t = 2.0;
    }
    return;
  }
  chaseSeek(game, e, player.x, player.y, 0.7, dt);
  s.t -= dt;
  if (s.t <= 0) { s.n = 3; s.t2 = 0; s.a = Math.atan2(player.y - e.y, player.x - e.x); }
};

ENEMY_BEHAVIOR_HANDLERS.g3HsWake = function aiG3HsWake(game, e, dt){
  const player = game.player, s = g3(e);
  chaseSeek(game, e, player.x, player.y, 1.45, dt);
  s.t -= dt;
  if (s.t <= 0) {
    s.t = 0.2;
    game.projectiles.push(new Projectile(e.x, e.y, 0, 0, e.dmg, 'enemy', { color: G3_HS, radius: 6, life: 4.5, source: e }));
  }
};

ENEMY_BEHAVIOR_HANDLERS.g3HsZenith = function aiG3HsZenith(game, e, dt){
  const player = game.player, s = g3(e);
  s.t -= dt;
  if (s.t <= 0) { s.on = !s.on; s.t = s.on ? 1.4 : 1.1; e.shielded = s.on; }
  if (s.on) { chaseSeek(game, e, player.x, player.y, 1.7, dt); return; }
  s.t2 -= dt;
  if (s.t2 <= 0) {
    s.t2 = 0.26;
    fireProjectileAt(game, e, player.x, player.y, 280, e.dmg, { color: G3_HS, radius: 5 });
  }
};

ENEMY_BEHAVIOR_HANDLERS.g3HsTerminus = function aiG3HsTerminus(game, e, dt){
  const player = game.player, s = g3(e);
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 30) > 0) ? 0.12 : 0;
    if (e.telegraph <= 0) {
      g3Wall(game, e, e.x, e.y, s.a, 9, 28, 200, e.dmg, G3_HS, 4);
      g3Wall(game, e, e.x, e.y, s.a + Math.PI / 2, 9, 28, 200, e.dmg, G3_HS, 4);
      s.a += 0.4;
      s.t = 2.4;
    }
    return;
  }
  s.t -= dt;
  if (s.t <= 0) { e.telegraph = 0.5; return; }
  chaseSeek(game, e, player.x, player.y, 0.6, dt);
};

ENEMY_BEHAVIOR_HANDLERS.g3BossAbyssalMaw = function aiG3BossAbyssalMaw(game, e, dt){
  const node = game.currentRoom, player = game.player, s = g3(e);
  const enraged = e.hp < e.maxHp * 0.5;
  if (e.dashing) {
    tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
    e.dashTimer -= dt;
    if (e.dashTimer <= 0) {
      e.dashing = false;
      if (enraged) { dnbRing(game, e, 16, 165, 2, G3_TD, RNG.random() * Math.PI * 2, Math.floor(RNG.random() * 16), 2); g3Blast(game, e, e.x, e.y, 80); }
      e.attackTimer = Util.rand(1.5, 2.1);
    }
    return;
  }
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 26) > 0) ? 0.12 : 0;
    if (e.telegraph <= 0) {
      if (s.on) {
        const v = seekVector(e, player.x, player.y);
        e.dashing = true; e.dashTimer = 0.55;
        e.dashVX = v.x * e.speed * 4.8; e.dashVY = v.y * e.speed * 4.8;
      } else {
        dnbRing(game, e, 18, 155, 2, G3_TD, RNG.random() * Math.PI * 2, Math.floor(RNG.random() * 18), 3);
        g3Blast(game, e, e.x, e.y, 92);
        e.attackTimer = Util.rand(1.6, 2.2);
      }
    }
    return;
  }
  chaseSeek(game, e, player.x, player.y, enraged ? 0.85 : 0.65, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) { s.on = RNG.random() < 0.5; e.telegraph = s.on ? 0.4 : 0.6; }
};

ENEMY_BEHAVIOR_HANDLERS.g3BossCrushChoir = function aiG3BossCrushChoir(game, e, dt){
  const player = game.player, s = g3(e);
  const d = Util.dist(e.x, e.y, player.x, player.y);
  if (d < 200) g3Back(game, e, dt, 0.9);
  else if (d > 320) chaseSeek(game, e, player.x, player.y, 0.6, dt);
  if (s.t2 > 0) {
    s.t2 -= dt;
    e.hitFlash = 0.1;
    if (s.t2 <= 0) {
      g3Converge(game, e, s.x, s.y, 12, 170, 190, 2, G3_TD);
      s.n++;
      if (s.n % 3 === 0) dnbRing(game, e, 14, 85, 2, G3_TD, RNG.random() * Math.PI * 2, 0, 0);
      s.t = Util.rand(1.6, 2.2);
    }
    return;
  }
  s.t -= dt;
  if (s.t <= 0) { s.x = player.x; s.y = player.y; s.t2 = 0.75; }
  g3Waves(game, e, 'tdcrusher', 'tdimploder');
};

ENEMY_BEHAVIOR_HANDLERS.g3BossHadalAnchor = function aiG3BossHadalAnchor(game, e, dt){
  const node = game.currentRoom, player = game.player, s = g3(e);
  const loose = e.hp < e.maxHp * 0.34;
  s.a += (loose ? 0.85 : 0.5) * dt;
  s.t -= dt;
  if (s.t <= 0) {
    s.t = loose ? 0.45 : 0.7;
    for (let i = 0; i < 4; i++) fireProjectileAngle(game, e, s.a + i * (Math.PI / 2), 165, 2, { color: G3_TD, radius: 6 });
  }
  if (loose) { chaseSeek(game, e, player.x, player.y, 0.6, dt); g3Waves(game, e, 'tdvent', 'tdcolumn'); return; }
  if (e.dashing) {
    tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
    e.dashTimer -= dt;
    if (e.dashTimer <= 0) { e.dashing = false; e.attackTimer = Util.rand(2.6, 3.4); }
    return;
  }
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) {
    const v = seekVector(e, player.x, player.y);
    e.dashing = true; e.dashTimer = 0.9;
    e.dashVX = v.x * e.speed * 2.6; e.dashVY = v.y * e.speed * 2.6;
  }
  g3Waves(game, e, 'tdvent', 'tdcolumn');
};

ENEMY_BEHAVIOR_HANDLERS.g3BossVentTyrant = function aiG3BossVentTyrant(game, e, dt){
  const node = game.currentRoom, player = game.player, s = g3(e);
  chaseSeek(game, e, player.x, player.y, 0.55, dt);
  if (s.t2 > 0) {
    s.t2 -= dt;
    if (e.lobTimer > 0) e.lobTimer -= dt;
    if (s.t2 <= 0 && s.hist) {
      for (const p of s.hist) g3Blast(game, e, p.x, p.y, 64);
      s.hist = null;
      s.t = Util.rand(1.3, 1.9);
    }
    return;
  }
  s.t -= dt;
  if (s.t <= 0) {
    const count = e.hp < e.maxHp * 0.45 ? 5 : 3;
    s.hist = [];

    for (let i = 0; i < count; i++) {
      const ang = RNG.random() * Math.PI * 2, rad = (i === 0) ? 0 : Util.rand(60, 190);
      const spot = findNearestFloor(node, Math.floor((player.x + Math.cos(ang) * rad) / TILE), Math.floor((player.y + Math.sin(ang) * rad) / TILE));
      s.hist.push({ x: spot.x * TILE + TILE / 2, y: spot.y * TILE + TILE / 2 });
    }
    e.lobX = s.hist[0].x; e.lobY = s.hist[0].y; e.lobTime = 1.1; e.lobTimer = 1.1;
    s.t2 = 1.1;
  }
  g3Waves(game, e, 'tdvent', 'tdcrusher');
};

ENEMY_BEHAVIOR_HANDLERS.g3BossUnlit = function aiG3BossUnlit(game, e, dt){
  const player = game.player, s = g3(e);
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    if (e.telegraph <= 0) {
      e.submerged = false; e.shielded = false;
      dnbRing(game, e, 12, 195, 2, G3_DD, Math.atan2(player.y - e.y, player.x - e.x), 0, 0);
      s.t = 1.5;
    }
    return;
  }
  if (s.t > 0) {
    s.t -= dt;
    chaseSeek(game, e, player.x, player.y, 1.1, dt);
    if (s.t <= 0) { e.submerged = true; e.shielded = true; s.t2 = Util.rand(1.4, 2.0); }
    return;
  }
  e.submerged = true; e.shielded = true;
  chaseSeek(game, e, player.x, player.y, 1.35, dt);
  s.t2 -= dt;
  if (s.t2 <= 0) {
    const ang = RNG.random() * Math.PI * 2;
    g3Blink(game, e, player.x + Math.cos(ang) * 90, player.y + Math.sin(ang) * 90);
    e.telegraph = 0.5;
  }
  g3Waves(game, e, 'ddstalker', 'ddcrawler');
};

ENEMY_BEHAVIOR_HANDLERS.g3BossLongQuiet = function aiG3BossLongQuiet(game, e, dt){
  const player = game.player, s = g3(e);
  const moved = Math.hypot(player.x - s.x, player.y - s.y) / Math.max(dt, 0.0001);
  s.x = player.x; s.y = player.y;
  if (moved > 40) {
    e.hitFlash = 0.05;
    chaseSeek(game, e, player.x, player.y, 0.35, dt);
    s.t = Math.max(s.t, 0.3);
    s.n = 0;
    return;
  }
  s.t -= dt;
  if (s.t <= 0) {
    s.n++;
    s.t = 0.42;

    const aim = Math.atan2(player.y - e.y, player.x - e.x);
    const arms = Math.min(2 + s.n, 9);
    for (let i = 0; i < arms; i++) fireProjectileAngle(game, e, aim + (i - (arms - 1) / 2) * 0.16, 215, 2, { color: G3_DD, radius: 5 });
    if (s.n >= 6) { dnbRing(game, e, 16, 160, 2, G3_DD, RNG.random() * Math.PI * 2, Math.floor(RNG.random() * 16), 2); s.n = 0; }
  }
  g3Waves(game, e, 'ddchorus', 'ddveil');
};

ENEMY_BEHAVIOR_HANDLERS.g3BossBlindHunter = function aiG3BossBlindHunter(game, e, dt){
  const node = game.currentRoom, player = game.player, s = g3(e);
  if (e.dashing) {
    tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
    e.dashTimer -= dt;
    if (e.dashTimer <= 0) {
      e.dashing = false;
      s.n--;
      g3Wall(game, e, e.x, e.y, Math.atan2(e.dashVY, e.dashVX) + Math.PI / 2, 5, 30, 165, 2, G3_DD, 2);
      s.t = (s.n > 0) ? 0.55 : Util.rand(2.0, 2.6);
    }
    return;
  }
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 32) > 0) ? 0.13 : 0;
    if (e.telegraph <= 0) {
      const v = seekVector(e, s.x, s.y);
      e.dashing = true; e.dashTimer = 0.7;
      e.dashVX = v.x * e.speed * 5.2; e.dashVY = v.y * e.speed * 5.2;
    }
    return;
  }
  s.t -= dt;
  if (s.t > 0) { chaseSeek(game, e, player.x, player.y, 0.5, dt); return; }
  if (s.n <= 0) s.n = 3;
  s.x = player.x; s.y = player.y;
  e.telegraph = 0.42;
  g3Waves(game, e, 'ddpounce', 'ddfang');
};

ENEMY_BEHAVIOR_HANDLERS.g3BossGloomweaver = function aiG3BossGloomweaver(game, e, dt){
  const player = game.player, s = g3(e);
  const d = Util.dist(e.x, e.y, player.x, player.y);
  if (d < 130) {
    const ang = Math.atan2(e.y - player.y, e.x - player.x);
    g3Blink(game, e, player.x + Math.cos(ang) * 250, player.y + Math.sin(ang) * 250);
  } else {
    chaseSeek(game, e, player.x, player.y, 0.45, dt);
  }
  s.t -= dt;
  if (s.t <= 0) {
    s.t = e.hp < e.maxHp * 0.5 ? 1.1 : 1.7;
    s.a += 0.37;
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2 + s.a;
      game.projectiles.push(new Projectile(e.x, e.y, Math.cos(ang) * 62, Math.sin(ang) * 62, 2, 'enemy',
        { color: G3_DD, radius: 6, life: 7.0, fromBoss: true, source: e }));
    }
  }
  s.t2 -= dt;
  if (s.t2 <= 0) {
    s.t2 = 3.4;
    fireProjectileAt(game, e, player.x, player.y, 150, 2, { color: G3_DD, radius: 6, homing: 2.2, life: 4 });
  }
  g3Waves(game, e, 'ddgloom', 'ddclatter');
};

ENEMY_BEHAVIOR_HANDLERS.g3BossPatchNotes = function aiG3BossPatchNotes(game, e, dt){
  const player = game.player, s = g3(e);
  const frac = e.hp / e.maxHp;
  const want = (frac > 0.75) ? 0 : (frac > 0.5) ? 1 : (frac > 0.25) ? 2 : 3;
  if (want !== s.n2) {
    s.n2 = want;
    s.t = 0.8; s.t2 = 0; s.n = 0;
    e.shielded = false; e.submerged = false;
    dnbRing(game, e, 14, 130, 2, G3_MR, RNG.random() * Math.PI * 2, 0, 0);
  }
  if (s.t > 0) { s.t -= dt; e.hitFlash = 0.1; return; }

  s.t2 -= dt;
  if (s.n2 === 0) {

    chaseSeek(game, e, player.x, player.y, 0.8, dt);
    if (s.t2 <= 0) { s.t2 = 1.1; for (let i = -1; i <= 1; i++) fireProjectileAngle(game, e, Math.atan2(player.y - e.y, player.x - e.x) + i * 0.17, 235, 2, { color: G3_MR, radius: 5 }); }
  } else if (s.n2 === 1) {

    if (s.t2 <= 0) {
      s.t2 = 0.6;
      const v = seekVector(e, player.x, player.y);
      g3Blink(game, e, e.x + v.x * Math.min(110, v.d), e.y + v.y * Math.min(110, v.d));
      fireProjectileAt(game, e, player.x, player.y, 250, 2, { color: G3_MR, radius: 5 });
    }
  } else if (s.n2 === 2) {

    const node = game.currentRoom;
    chaseSeek(game, e, player.x, player.y, 0.5, dt);
    if (s.t2 <= 0) {
      s.t2 = 0.9;
      const W = node.tileW * TILE, H = node.tileH * TILE;
      g3Wall(game, e, W / 2, 6, Math.PI / 2, 9, 34, 210, 2, G3_MR, Math.floor(RNG.random() * 9));
      g3Wall(game, e, 6, H / 2, 0, 9, 34, 210, 2, G3_MR, Math.floor(RNG.random() * 9));
    }
  } else {

    chaseSeek(game, e, player.x, player.y, 0.7, dt);
    if (s.t2 <= 0) {
      s.t2 = 0.75;
      s.n++;
      if (s.n % 3 === 0) g3Converge(game, e, player.x, player.y, 12, 175, 210, 2, G3_MR);
      else dnbRing(game, e, 15, 185, 2, G3_MR, RNG.random() * Math.PI * 2, Math.floor(RNG.random() * 15), 2);
    }
  }
  g3Waves(game, e, 'mrglitch', 'mrnull');
};

ENEMY_BEHAVIOR_HANDLERS.g3BossNullPointer = function aiG3BossNullPointer(game, e, dt){
  const player = game.player, s = g3(e);
  s.t -= dt;
  if (s.t <= 0) {
    s.on = !s.on;
    s.t = s.on ? 1.6 : 2.2;
    e.submerged = s.on; e.shielded = s.on;
    dnbRing(game, e, 10, 175, 2, G3_MR, RNG.random() * Math.PI * 2, 0, 0);
  }
  if (s.on) {

    chaseSeek(game, e, player.x, player.y, 1.5, dt);
    return;
  }
  chaseSeek(game, e, player.x, player.y, 0.5, dt);
  s.t2 -= dt;
  if (s.t2 <= 0) {
    s.t2 = 0.3;
    fireProjectileAt(game, e, player.x, player.y, 245, 2, { color: G3_MR, radius: 5 });
  }
  g3Waves(game, e, 'mrnull', 'mrframeskip');
};

ENEMY_BEHAVIOR_HANDLERS.g3BossRenderGhost = function aiG3BossRenderGhost(game, e, dt){
  const node = game.currentRoom, player = game.player, s = g3(e);
  const v = seekVector(e, player.x, player.y);
  e.x += v.x * e.speed * dt * (e.hp < e.maxHp * 0.4 ? 1.35 : 1);
  e.y += v.y * e.speed * dt * (e.hp < e.maxHp * 0.4 ? 1.35 : 1);
  e.x = Util.clamp(e.x, TILE, node.tileW * TILE - TILE);
  e.y = Util.clamp(e.y, TILE, node.tileH * TILE - TILE);
  s.t -= dt;
  if (s.t <= 0) {
    s.t = 2.6;
    let target = null, best = Infinity;
    for (const ob of node.obstacles) {
      if (ob.destroyed) continue;
      const d = Util.dist2(e.x, e.y, ob.x, ob.y);
      if (d < best) { best = d; target = ob; }
    }
    if (target) { target.destroyed = true; node.tileLayerDirty = true; }
    dnbRing(game, e, 13, 170, 2, G3_MR, RNG.random() * Math.PI * 2, Math.floor(RNG.random() * 13), 2);
  }
  g3Waves(game, e, 'mrghost', 'mreditor');
};

ENEMY_BEHAVIOR_HANDLERS.g3BossAuthorsMargin = function aiG3BossAuthorsMargin(game, e, dt){
  const node = game.currentRoom, player = game.player, s = g3(e);
  const cx = node.tileW * TILE / 2, cy = node.tileH * TILE / 2;
  chaseSeek(game, e, cx * 2 - player.x, cy * 2 - player.y, 0.9, dt);
  if (s.n > 0) {
    s.t2 -= dt;
    if (e.lobTimer > 0) e.lobTimer -= dt;
    if (s.t2 <= 0) {
      s.t2 = 0.42;
      const p = s.hist && s.hist[s.hist.length - s.n];
      if (p) g3Blast(game, e, p.x, p.y, 60);
      s.n--;
      if (s.n <= 0) { s.hist = null; s.t = Util.rand(1.6, 2.2); }
      else if (s.hist) {
        const nx = s.hist[s.hist.length - s.n];
        if (nx) { e.lobX = nx.x; e.lobY = nx.y; e.lobTime = 0.42; e.lobTimer = 0.42; }
      }
    }
    return;
  }
  s.t -= dt;
  if (s.t <= 0) {
    const count = e.hp < e.maxHp * 0.45 ? 7 : 5;
    s.hist = [];
    const baseAng = Math.atan2(player.y - e.y, player.x - e.x);

    for (let i = 0; i < count; i++) {
      const rad = 70 + i * 62;
      const spot = findNearestFloor(node, Math.floor((e.x + Math.cos(baseAng) * rad) / TILE), Math.floor((e.y + Math.sin(baseAng) * rad) / TILE));
      s.hist.push({ x: spot.x * TILE + TILE / 2, y: spot.y * TILE + TILE / 2 });
    }
    s.n = count; s.t2 = 0.55;
    e.lobX = s.hist[0].x; e.lobY = s.hist[0].y; e.lobTime = 0.55; e.lobTimer = 0.55;
  }
  g3Waves(game, e, 'mrassert', 'mrparser');
};

ENEMY_BEHAVIOR_HANDLERS.g3BossFoldLine = function aiG3BossFoldLine(game, e, dt){
  const node = game.currentRoom, player = game.player, s = g3(e);
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 30) > 0) ? 0.12 : 0;
    if (e.telegraph <= 0) {
      const seam = Math.floor(RNG.random() * 11);
      g3Wall(game, e, e.x, e.y, s.a, 11, 30, 215, 2, G3_HS, seam);
      g3Wall(game, e, e.x, e.y, s.a + Math.PI / 2, 11, 30, 215, 2, G3_HS, seam);
      s.a += 0.5;
      s.n++;
      if (s.n % 2 === 0) {
        const cx = node.tileW * TILE / 2, cy = node.tileH * TILE / 2;
        g3Blink(game, e, cx * 2 - e.x, cy * 2 - e.y);
      }
      s.t = e.hp < e.maxHp * 0.4 ? 1.0 : 1.6;
    }
    return;
  }
  s.t -= dt;
  if (s.t <= 0) { e.telegraph = 0.45; return; }
  chaseSeek(game, e, player.x, player.y, 0.5, dt);
  g3Waves(game, e, 'hsdrone', 'hsprism');
};

ENEMY_BEHAVIOR_HANDLERS.g3BossEventHorizon = function aiG3BossEventHorizon(game, e, dt){
  const player = game.player, s = g3(e);
  chaseSeek(game, e, player.x, player.y, 0.55, dt);
  s.t -= dt;
  if (s.t <= 0) {
    s.n++;
    const late = e.hp < e.maxHp * 0.45;
    s.t = late ? 1.15 : 1.7;

    if (s.n % 2 === 0) g3Converge(game, e, player.x, player.y, 16, 230, 165, 2, G3_HS);
    else g3Converge(game, e, player.x, player.y, 10, 130, 260, 2, G3_HS);
    if (late && s.n % 4 === 0) dnbRing(game, e, 18, 190, 2, G3_HS, RNG.random() * Math.PI * 2, Math.floor(RNG.random() * 18), 2);
  }
  g3Waves(game, e, 'hssingularity', 'hscomet');
};

ENEMY_BEHAVIOR_HANDLERS.g3BossLightYear = function aiG3BossLightYear(game, e, dt){
  const node = game.currentRoom, player = game.player, s = g3(e);
  if (e.dashing) {
    tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
    e.dashTimer -= dt;
    if (e.dashTimer <= 0) {
      e.dashing = false;
      dnbRing(game, e, 10, 225, 2, G3_HS, Math.atan2(player.y - e.y, player.x - e.x), 0, 0);
      s.n--;
      s.t = (s.n > 0) ? 0.3 : 1.1;
    }
    return;
  }
  s.t -= dt;
  if (s.t > 0) { if (s.n <= 0) e.hitFlash = 0.06; return; }
  if (s.n <= 0) s.n = (e.hp < e.maxHp * 0.4) ? 4 : 3;
  const v = seekVector(e, player.x, player.y);
  e.dashing = true; e.dashTimer = 0.5;
  e.dashVX = v.x * e.speed * 6.4; e.dashVY = v.y * e.speed * 6.4;
  g3Waves(game, e, 'hslancer', 'hswake');
};

ENEMY_BEHAVIOR_HANDLERS.g3BossLastExit = function aiG3BossLastExit(game, e, dt){
  const player = game.player, s = g3(e);
  const late = e.hp < e.maxHp * 0.5;
  s.a += 0.95 * s.dir * dt;
  s.t -= dt;
  if (s.t <= 0) {
    s.t = 0.16;
    for (let i = 0; i < 6; i++) fireProjectileAngle(game, e, s.a + i * (Math.PI / 3), 180, 2, { color: G3_HS, radius: 5 });
  }
  chaseSeek(game, e, player.x, player.y, 0.42, dt);
  s.t2 -= dt;
  if (s.t2 <= 0) {
    s.t2 = late ? 2.0 : 2.8;
    g3Converge(game, e, player.x, player.y, 12, 175, 215, 2, G3_HS);
    s.dir = -s.dir;
  }
  if (late) {
    s.t3 -= dt;
    if (s.t3 <= 0) {
      s.t3 = 1.5;
      const aim = Math.atan2(player.y - e.y, player.x - e.x);
      for (let i = -2; i <= 2; i++) fireProjectileAngle(game, e, aim + i * 0.14, 265, 2, { color: G3_HS, radius: 5 });
    }
  }
  g3Waves(game, e, 'hszenith', 'hsterminus');
};

ENEMY_BEHAVIOR_HANDLERS.g3SbPalestine = function aiG3SbPalestine(game, e, dt){
  const node = game.currentRoom, player = game.player, s = g3(e);
  const frac = e.hp / e.maxHp;
  const want = (frac > 0.66) ? 0 : (frac > 0.33) ? 1 : 2;
  if (want !== s.n2) {
    s.n2 = want;
    s.t = 0; s.t2 = 0; s.t3 = 0; s.n = 0;
    e.dashing = false; e.telegraph = 0;
    e.shielded = false;
    s.on = true;
    s.t3 = 0.9;
    dnbRing(game, e, 20, 150, 2, G3_TD, RNG.random() * Math.PI * 2, 0, 0);
  }
  if (s.on) {
    s.t3 -= dt;
    e.hitFlash = 0.1;
    if (s.t3 <= 0) s.on = false;
    return;
  }

  s.t -= dt;
  if (s.t <= 0) {
    s.t = (s.n2 === 0) ? 2.2 : (s.n2 === 1) ? 1.8 : 1.3;
    g3Converge(game, e, player.x, player.y, 12 + s.n2 * 3, 195, 180 + s.n2 * 25, 2, G3_TD);
  }

  if (s.n2 >= 1) {
    s.a += 0.7 * dt;
    s.t2 -= dt;
    if (s.t2 <= 0) {
      s.t2 = 0.42;
      const arms = s.n2 >= 2 ? 6 : 4;
      for (let i = 0; i < arms; i++) fireProjectileAngle(game, e, s.a + i * (Math.PI * 2 / arms), 170, 2, { color: G3_TD, radius: 6 });
    }
  }

  if (s.n2 >= 2) {
    if (e.dashing) {
      tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
      e.dashTimer -= dt;
      if (e.dashTimer <= 0) { e.dashing = false; g3Blast(game, e, e.x, e.y, 86); e.attackTimer = Util.rand(2.0, 2.6); }
    } else {
      chaseSeek(game, e, player.x, player.y, 0.5, dt);
      e.attackTimer -= dt;
      if (e.attackTimer <= 0) {
        const v = seekVector(e, player.x, player.y);
        e.dashing = true; e.dashTimer = 0.5;
        e.dashVX = v.x * e.speed * 4.6; e.dashVY = v.y * e.speed * 4.6;
      }
    }
  } else {
    chaseSeek(game, e, player.x, player.y, 0.4, dt);
  }
  g3Waves(game, e, 'tdcrusher', 'tdimploder');
};

ENEMY_BEHAVIOR_HANDLERS.g3SbWarden = function aiG3SbWarden(game, e, dt){
  const player = game.player, s = g3(e);
  const frac = e.hp / e.maxHp;

  if (s.t2 > 0) {

    s.t2 -= dt;
    e.submerged = false; e.shielded = false;
    chaseSeek(game, e, player.x, player.y, 0.7, dt);
    s.t3 -= dt;
    if (s.t3 <= 0) {
      s.t3 = 0.5;
      const aim = Math.atan2(player.y - e.y, player.x - e.x);
      for (let i = -3; i <= 3; i++) fireProjectileAngle(game, e, aim + i * 0.12, 225, 2, { color: G3_DD, radius: 5 });
    }
    if (s.t2 <= 0) { e.submerged = true; e.shielded = true; dnbRing(game, e, 14, 175, 2, G3_DD, RNG.random() * Math.PI * 2, 0, 0); }
    return;
  }

  e.submerged = true; e.shielded = true;
  chaseSeek(game, e, player.x, player.y, 0.85, dt);
  s.a += (frac > 0.5 ? 1.15 : 1.7) * s.dir * dt;
  s.t -= dt;
  if (s.t <= 0) {
    s.t = 0.24;

    fireProjectileAngle(game, e, s.a, 205, 2, { color: G3_DD, radius: 5, life: 2.4 });
    fireProjectileAngle(game, e, s.a + Math.PI, 205, 2, { color: G3_DD, radius: 5, life: 2.4 });

    const toPlayer = Math.atan2(player.y - e.y, player.x - e.x);
    let diff = Math.abs(((toPlayer - s.a + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    diff = Math.min(diff, Math.abs(Math.PI - diff));
    if (diff < 0.22) {
      s.t2 = 2.0; s.t3 = 0.2;
      e.hitFlash = 0.2;
      g3Converge(game, e, player.x, player.y, 12, 175, 205, 2, G3_DD);
    }
  }
  s.t3 -= dt;
  if (s.t3 <= 0) {

    s.t3 = frac > 0.5 ? 2.2 : 1.4;
    game.projectiles.push(new Projectile(e.x, e.y, 0, 0, 2, 'enemy', { color: G3_DD, radius: 7, life: 12, fromBoss: true, source: e }));
  }
  g3Waves(game, e, 'ddstalker', 'ddbreath');
};

ENEMY_BEHAVIOR_HANDLERS.g3SbNotch = function aiG3SbNotch(game, e, dt){
  const node = game.currentRoom, player = game.player, s = g3(e);
  const frac = e.hp / e.maxHp;
  if (!s.hist) s.hist = [];

  s.t3 -= dt;
  if (s.t3 <= 0) {
    s.t3 = 0.4;
    s.hist.push({ x: e.x, y: e.y });
    if (s.hist.length > 8) s.hist.shift();
  }

  if (s.on) {

    s.t -= dt;
    e.hitFlash = 0.08;
    if (s.t <= 0) {
      s.n--;
      s.t = 0.34;
      const ang = s.a + s.n * (Math.PI / 5);
      g3Wall(game, e, e.x, e.y, ang, 9, 30, 195, 2, G3_MR, 4);
      if (s.n <= 0) { s.on = false; s.t = frac > 0.4 ? 2.0 : 1.3; }
    }
    return;
  }

  chaseSeek(game, e, player.x, player.y, frac > 0.4 ? 0.7 : 0.95, dt);
  s.t -= dt;
  if (s.t <= 0) {
    const roll = RNG.random();
    if (roll < 0.34) {

      s.on = true; s.n = 3; s.t = 0.2;
      s.a = Math.atan2(player.y - e.y, player.x - e.x);
    } else if (roll < 0.62) {

      let target = null, best = Infinity;
      for (const ob of node.obstacles) {
        if (ob.destroyed) continue;
        const d = Util.dist2(player.x, player.y, ob.x, ob.y);
        if (d < best) { best = d; target = ob; }
      }
      if (target) {
        g3Blast(game, e, target.x, target.y, 62);
        target.destroyed = true;
        node.tileLayerDirty = true;
      }
      dnbRing(game, e, 16, 190, 2, G3_MR, RNG.random() * Math.PI * 2, Math.floor(RNG.random() * 16), 2);
      s.t = 1.6;
    } else if (roll < 0.82) {

      const p = s.hist[0];
      if (p) g3Blink(game, e, p.x, p.y);
      s.hist.length = 0;
      g3Converge(game, e, player.x, player.y, 12, 180, 215, 2, G3_MR);
      s.t = 1.5;
    } else {

      g3Spawn(game, e, frac > 0.5 ? 'mrglitch' : 'mrsegfault', 2, 95);
      s.t = 2.0;
    }
  }

  if (frac <= 0.25 && !s.on2) {

    s.on2 = true;
    for (const ob of node.obstacles) ob.destroyed = true;
    node.tileLayerDirty = true;
    for (let w = 0; w < 3; w++) dnbRing(game, e, 18, 150 + w * 40, 2, G3_MR, w * 0.25, Math.floor(RNG.random() * 18), 2);
  }
  g3Waves(game, e, 'mrclone', 'mreditor');
};

ENEMY_BEHAVIOR_HANDLERS.g3SbKirkinator = function aiG3SbKirkinator(game, e, dt){
  const node = game.currentRoom, player = game.player, s = g3(e);
  const frac = e.hp / e.maxHp;
  const want = (frac > 0.8) ? 0 : (frac > 0.6) ? 1 : (frac > 0.4) ? 2 : (frac > 0.2) ? 3 : 4;
  if (want !== s.n2) {
    s.n2 = want;
    s.t = 0; s.t2 = 0; s.n = 0;
    e.dashing = false; e.telegraph = 0; e.shielded = false; e.submerged = false;
    s.on = true; s.t3 = 1.0;
    dnbRing(game, e, 22, 145, 2, G3_HS, RNG.random() * Math.PI * 2, 0, 0);
  }
  if (s.on) {
    s.t3 -= dt;
    e.hitFlash = 0.1;
    if (s.t3 <= 0) { s.on = false; s.t = 0.3; }
    return;
  }

  const cx = node.tileW * TILE / 2, cy = node.tileH * TILE / 2;

  if (s.n2 === 0) {

    if (e.telegraph > 0) {
      e.telegraph -= dt;
      e.hitFlash = (Math.sin(e.telegraph * 30) > 0) ? 0.12 : 0;
      if (e.telegraph <= 0) {
        const seam = Math.floor(RNG.random() * 11);
        g3Wall(game, e, e.x, e.y, s.a, 11, 30, 220, 2, G3_HS, seam);
        g3Wall(game, e, e.x, e.y, s.a + Math.PI / 2, 11, 30, 220, 2, G3_HS, seam);
        s.a += 0.55;
        s.n++;
        if (s.n % 2 === 0) g3Blink(game, e, cx * 2 - e.x, cy * 2 - e.y);
        s.t = 1.4;
      }
    } else {
      chaseSeek(game, e, player.x, player.y, 0.5, dt);
      s.t -= dt;
      if (s.t <= 0) e.telegraph = 0.45;
    }
  } else if (s.n2 === 1) {

    chaseSeek(game, e, player.x, player.y, 0.55, dt);
    s.t -= dt;
    if (s.t <= 0) {
      s.n++;
      s.t = 1.35;
      if (s.n % 2 === 0) g3Converge(game, e, player.x, player.y, 18, 240, 175, 2, G3_HS);
      else g3Converge(game, e, player.x, player.y, 11, 140, 265, 2, G3_HS);
    }
  } else if (s.n2 === 2) {

    if (e.dashing) {
      tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
      e.dashTimer -= dt;
      if (e.dashTimer <= 0) {
        e.dashing = false;
        dnbRing(game, e, 12, 230, 2, G3_HS, Math.atan2(player.y - e.y, player.x - e.x), 0, 0);
        s.n--;
        s.t = (s.n > 0) ? 0.28 : 1.2;
      }
    } else {
      s.t -= dt;
      if (s.t <= 0) {
        if (s.n <= 0) s.n = 3;
        const v = seekVector(e, player.x, player.y);
        e.dashing = true; e.dashTimer = 0.5;
        e.dashVX = v.x * e.speed * 6.2; e.dashVY = v.y * e.speed * 6.2;
      }
    }
  } else if (s.n2 === 3) {

    s.a += 1.1 * s.dir * dt;
    s.t -= dt;
    if (s.t <= 0) {
      s.t = 0.15;
      for (let i = 0; i < 6; i++) fireProjectileAngle(game, e, s.a + i * (Math.PI / 3), 185, 2, { color: G3_HS, radius: 5 });
    }
    s.t2 -= dt;
    if (s.t2 <= 0) { s.t2 = 3.0; s.dir = -s.dir; }
    chaseSeek(game, e, player.x, player.y, 0.45, dt);
  } else {

    s.a += 1.25 * s.dir * dt;
    s.t2 -= dt;
    if (s.t2 <= 0) {
      s.t2 = 0.14;
      for (let i = 0; i < 6; i++) fireProjectileAngle(game, e, s.a + i * (Math.PI / 3), 180, 2, { color: G3_HS, radius: 5 });
    }
    if (e.dashing) {
      tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
      e.dashTimer -= dt;
      if (e.dashTimer <= 0) { e.dashing = false; g3Blast(game, e, e.x, e.y, 92); s.t = 1.0; }
    } else {
      chaseSeek(game, e, player.x, player.y, 0.4, dt);
      s.t -= dt;
      if (s.t <= 0) {
        s.n++;
        const pick = s.n % 3;
        if (pick === 0) {
          const seam = Math.floor(RNG.random() * 11);
          g3Wall(game, e, e.x, e.y, s.a, 11, 30, 225, 2, G3_HS, seam);
          g3Wall(game, e, e.x, e.y, s.a + Math.PI / 2, 11, 30, 225, 2, G3_HS, seam);
          g3Blink(game, e, cx * 2 - e.x, cy * 2 - e.y);
          s.t = 1.5;
        } else if (pick === 1) {
          g3Converge(game, e, player.x, player.y, 16, 210, 235, 2, G3_HS);
          s.t = 1.4;
        } else {
          const v = seekVector(e, player.x, player.y);
          e.dashing = true; e.dashTimer = 0.45;
          e.dashVX = v.x * e.speed * 6.0; e.dashVY = v.y * e.speed * 6.0;
        }
      }
    }
  }

  g3Waves(game, e, 'hsdrone', 'hslancer');
  if (!s.on2 && e.hp < e.maxHp * 0.12) {

    s.on2 = true;
    g3Spawn(game, e, 'hsterminus', 2, 110);
    for (let w = 0; w < 3; w++) dnbRing(game, e, 20, 150 + w * 45, 2, G3_HS, w * 0.3, Math.floor(RNG.random() * 20), 2);
  }
};
