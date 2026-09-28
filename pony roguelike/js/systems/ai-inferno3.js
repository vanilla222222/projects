'use strict';

ENEMY_BEHAVIOR_HANDLERS.inf3Cinderchoir = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.inf3Verse === undefined) { e.inf3Verse = 0; e.inf3Beat = 1; }
  let wounded = null, worst = 1, harmony = 0;
  for (const o of node.enemies) {
    if (o === e || o.isDead) continue;
    if (o.type.id === e.type.id && Util.dist(e.x, e.y, o.x, o.y) < 240) harmony++;
    if (o.isBoss || o.hp >= o.maxHp) continue;
    const f = o.hp / Math.max(1, o.maxHp);
    if (f < worst) { worst = f; wounded = o; }
  }
  const v = seekVector(e, player.x, player.y);
  if (v.d < 180) infernoStep(game, e, dt, -v.x, -v.y, 1.1);
  else if (wounded) {
    const w = seekVector(e, wounded.x, wounded.y);
    if (w.d > 120) infernoStep(game, e, dt, w.x, w.y, 0.9);
    else infernoStep(game, e, dt, -w.y, w.x, 0.5);
  } else infernoStep(game, e, dt, -v.y, v.x, 0.5);
  e.inf3Beat -= dt * (1 + harmony * 0.6);
  if (e.inf3Beat <= 0) {
    e.inf3Beat = 1;
    e.inf3Verse = Math.min(3, e.inf3Verse + 1);
    e.hitFlash = 0.1;
  }
  e.healTimer -= dt;
  if (e.healTimer > 0 || e.inf3Verse < 3 || !wounded) return;
  const amt = (t.healAmount || 2) * (1 + harmony);
  const R = t.healRadius || 140;
  for (const o of node.enemies) {
    if (o === e || o.isDead || o.isBoss || o.hp >= o.maxHp) continue;
    if (Util.dist(e.x, e.y, o.x, o.y) > R) continue;
    o.hp = Math.min(o.maxHp, o.hp + amt);
    game.floatTexts.push(new FloatText(o.x, o.y - o.radius - 6, '+' + amt, Theme.floatText.heal));
  }
  infernoRing(game, e, 6 + harmony * 2, 160, { color: '#ffb47a', radius: 4 }, RNG.random());
  e.inf3Verse = 0;
  e.healTimer = t.healCooldown || 3.2;
  e.hitFlash = 0.16;
};

ENEMY_BEHAVIOR_HANDLERS.inf3Pyrecircler = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.inf3Dir === undefined) { e.inf3Dir = RNG.random() < 0.5 ? 1 : -1; e.inf3Lap = 0; e.inf3Mark = 0; }
  const R = t.orbitRadius || 132;
  const step = e.inf3Dir * (t.orbitSpeed || 1.4) * dt;
  const bearing = Math.atan2(e.y - player.y, e.x - player.x) + step;
  const tx = player.x + Math.cos(bearing) * R, ty = player.y + Math.sin(bearing) * R;
  const v = seekVector(e, tx, ty);
  if (v.d > 5) infernoStep(game, e, dt, v.x, v.y, 1.2);
  e.inf3Lap += Math.abs(step);
  e.inf3Mark += Math.abs(step);
  if (e.inf3Mark >= 0.5) {
    e.inf3Mark = 0;
    infernoScorch(game, e, e.x, e.y, 24, Math.max(1, Math.floor(e.dmg / 2)));
  }
  if (e.inf3Lap >= Math.PI * 2) {
    e.inf3Lap = 0;
    e.inf3Dir = -e.inf3Dir;
    infernoRing(game, e, 8, (t.boltSpeed || 205) * 0.85, { color: t.boltColor || '#ffb47a', radius: t.boltRadius || 4 }, RNG.random());
    infernoScorch(game, e, e.x, e.y, 46);
    e.hitFlash = 0.16;
    return;
  }
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && Util.dist(e.x, e.y, player.x, player.y) < (t.fireRange || 390)) {
    e.fireTimer = t.fireCooldown || 1.7;
    fireProjectileAngle(game, e, infernoAim(e, player), t.boltSpeed || 205, e.dmg, { color: t.boltColor || '#ffb47a', radius: t.boltRadius || 4 });
  }
};

ENEMY_BEHAVIOR_HANDLERS.inf3Slagmarksman = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.inf3Heat === undefined) { e.inf3Heat = 0; e.inf3Vent = 0; }
  infernoTrack(e, player, dt);
  if (e.inf3Vent > 0) {
    e.inf3Vent -= dt;
    const v = seekVector(e, player.x, player.y);
    infernoStep(game, e, dt, -v.x, -v.y, 1.1);
    if (e.inf3Vent <= 0) {
      infernoScorch(game, e, e.x, e.y, 40);
      e.inf3Heat = 0;
      e.fireTimer = 0.3;
    }
    return;
  }
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 20) > 0) ? 0.14 : 0;
    if (e.telegraph <= 0) {
      const sp = t.boltSpeed || 430;
      const d = Util.dist(e.x, e.y, player.x, player.y);
      const lead = Util.clamp(d / sp, 0, 0.6);
      const lx = player.x + e.inf1VX * lead, ly = player.y + e.inf1VY * lead;
      fireProjectileAngle(game, e, Math.atan2(ly - e.y, lx - e.x), sp, e.dmg, { color: t.boltColor || '#ffa06a', radius: t.boltRadius || 4 });
      e.inf3Heat++;
      e.fireTimer = Math.max(0.6, (t.fireCooldown || 2.7) - e.inf3Heat * 0.7);
      if (e.inf3Heat >= 3) { e.inf3Vent = 1.3; e.hitFlash = 0.18; }
    }
    return;
  }
  e.fireTimer -= dt;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 200) infernoStep(game, e, dt, -v.x, -v.y, 1);
  else if (v.d > (t.fireRange || 520) * 0.85) infernoStep(game, e, dt, v.x, v.y, 0.8);
  if (e.fireTimer <= 0 && v.d < (t.fireRange || 520) && hasLineOfSight(node, e, player.x, player.y)) {
    e.telegraph = Math.max(0.4, (t.telegraphTime || 1.15) - e.inf3Heat * 0.25);
  }
};

ENEMY_BEHAVIOR_HANDLERS.inf3Emberwarden = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.inf3Planted === undefined) { e.inf3Planted = 0; e.inf3Tick = 0; e.attackTimer = 0.6; }
  const R = t.shieldRadius || 140;
  const v = seekVector(e, player.x, player.y);
  if (e.inf3Planted) {
    e.inf3Tick -= dt;
    if (e.inf3Tick <= 0) {
      e.inf3Tick = 0.3;
      for (const o of node.enemies) {
        if (o === e || o.isDead || o.isBoss || o.submerged) continue;
        if (o.behavior === 'shielded') continue;
        if (Util.dist(e.x, e.y, o.x, o.y) > R) continue;
        o.shielded = true;
        o.grantedShield = true;
        o.shieldTimer = Math.max(o.shieldTimer || 0, t.shieldGrantTime || 2.5);
      }
    }
    e.hitFlash = e.inf3Tick > 0.22 ? 0.1 : 0;
    if (v.d < R * 0.55) {
      e.inf3Planted = 0;
      infernoScorch(game, e, e.x, e.y, R * 0.6);
      infernoRing(game, e, 8, 175, { color: '#ffa05a', radius: 5 }, RNG.random());
      e.attackTimer = t.shieldCooldown || 5;
      e.hitFlash = 0.18;
    }
    return;
  }
  e.attackTimer -= dt;
  const keep = t.keepDistance || 200;
  if (v.d < keep) infernoStep(game, e, dt, -v.x, -v.y, 1.2);
  else infernoStep(game, e, dt, -v.y, v.x, 0.6);
  if (e.attackTimer > 0 || v.d < keep * 0.9) return;
  let allies = 0;
  for (const o of node.enemies) {
    if (o === e || o.isDead || o.isBoss) continue;
    if (Util.dist(e.x, e.y, o.x, o.y) < R) allies++;
  }
  if (allies > 0) { e.inf3Planted = 1; e.inf3Tick = 0; e.hitFlash = 0.16; }
  else e.attackTimer = 0.8;
};

ENEMY_BEHAVIOR_HANDLERS.inf3Wraithbat = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.inf3Still === undefined) { e.inf3Still = 0; e.inf3Fade = 0; }
  infernoTrack(e, player, dt);
  const moving = Math.hypot(e.inf1VX, e.inf1VY);
  if (e.telegraph > 0) {
    e.submerged = false;
    e.shielded = false;
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 30) > 0) ? 0.14 : 0;
    if (e.telegraph <= 0) {
      infernoArc(game, e, infernoAim(e, player), 2, 0.18, t.boltSpeed || 410, { color: '#a07ac0', radius: 4 });
      e.inf3Fade = 1;
      e.inf3Still = 0;
      e.fireTimer = t.fireCooldown || 2.3;
    }
    return;
  }
  e.submerged = e.inf3Fade > 0;
  e.shielded = e.inf3Fade > 0;
  const bearing = Math.atan2(e.y - player.y, e.x - player.x);
  const drift = Math.atan2(e.inf1VY, e.inf1VX);
  const want = bearing - Util.clamp(moving / 240, 0, 1) * (drift - bearing) * 0.5;
  const R = 250;
  const tx = player.x + Math.cos(want) * R, ty = player.y + Math.sin(want) * R;
  const s = seekVector(e, tx, ty);
  infernoStep(game, e, dt, s.x, s.y, e.inf3Fade > 0 ? 1.4 : 0.9);
  e.fireTimer -= dt;
  if (moving < 40) e.inf3Still += dt;
  else e.inf3Still = Math.max(0, e.inf3Still - dt * 1.5);
  if (e.fireTimer <= 0 && e.inf3Still > 0.45 && Util.dist(e.x, e.y, player.x, player.y) < (t.fireRange || 520) && hasLineOfSight(node, e, player.x, player.y)) {
    e.inf3Fade = 0;
    e.telegraph = t.telegraphTime || 1;
  }
};

ENEMY_BEHAVIOR_HANDLERS.inf3Phantomhawk = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.inf3Alt === undefined) { e.inf3Alt = 0; e.inf3Dir = RNG.random() < 0.5 ? 1 : -1; }
  infernoTrack(e, player, dt);
  if (e.dashing) {
    const s = seekVector(e, e.inf3TX, e.inf3TY);
    infernoStep(game, e, dt, s.x, s.y, (t.dashSpeed || 1.7) * 3.4);
    e.dashTimer -= dt;
    if (s.d < 26 || e.dashTimer <= 0) {
      e.dashing = false;
      e.inf3Alt = 1;
      infernoScorch(game, e, e.x, e.y, 52);
      infernoArc(game, e, infernoAim(e, player), 3, 0.7, (t.boltSpeed || 245) * 0.8, { color: '#d9a05a', radius: 4 });
      e.attackTimer = 0.9;
    }
    return;
  }
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 28) > 0) ? 0.14 : 0;
    if (e.telegraph <= 0) {
      e.inf3TX = player.x + e.inf1VX * 0.35;
      e.inf3TY = player.y + e.inf1VY * 0.35;
      e.dashing = true;
      e.dashTimer = 0.55;
      e.inf3Alt = 0;
    }
    return;
  }
  e.attackTimer -= dt;
  const R = (t.engageRange || 260) * (e.inf3Alt ? 1.3 : 1);
  if (e.inf3Alt) { e.shielded = true; if (e.attackTimer < 0.3) { e.shielded = false; e.inf3Alt = 0; } }
  const bearing = Math.atan2(e.y - player.y, e.x - player.x) + e.inf3Dir * 1.5 * dt;
  const tx = player.x + Math.cos(bearing) * R, ty = player.y + Math.sin(bearing) * R;
  const v = seekVector(e, tx, ty);
  infernoStep(game, e, dt, v.x, v.y, 1.25);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && Util.dist(e.x, e.y, player.x, player.y) < R + 120) {
    e.fireTimer = t.fireCooldown || 1.3;
    fireProjectileAngle(game, e, infernoAim(e, player), t.boltSpeed || 245, e.dmg, { color: '#d9a05a', radius: 4 });
  }
  if (e.attackTimer <= 0 && hasLineOfSight(node, e, player.x, player.y)) {
    e.inf3Dir = -e.inf3Dir;
    e.telegraph = 0.45;
  }
};

ENEMY_BEHAVIOR_HANDLERS.inf3Duskfalcon = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.inf3Shots === undefined) { e.inf3Shots = 0; e.inf3Stoop = 0; e.inf3Gap = 0; e.inf3Dir = RNG.random() < 0.5 ? 1 : -1; }
  const wide = t.keepDistance || 210;
  const tight = wide * 0.42;
  const keep = e.inf3Stoop > 0 ? tight : wide;
  const v = seekVector(e, player.x, player.y);
  const radial = (v.d - keep) * 0.02;
  const tangent = e.inf3Dir * (e.inf3Stoop > 0 ? 0.5 : 0.95);
  infernoStep(game, e, dt, v.x * radial + (-v.y) * tangent, v.y * radial + v.x * tangent, e.inf3Stoop > 0 ? 1.5 : 1);
  if (e.inf3Stoop > 0) {
    if (v.d > tight + 60) return;
    e.inf3Gap -= dt;
    if (e.inf3Gap <= 0) {
      e.inf3Gap = 0.09;
      fireProjectileAngle(game, e, infernoAim(e, player), (t.boltSpeed || 250) * 1.15, e.dmg, { color: '#e0b46a', radius: 4 });
      e.inf3Stoop--;
      if (e.inf3Stoop <= 0) {
        e.inf3Dir = -e.inf3Dir;
        e.inf3Shots = 0;
        e.fireTimer = (t.fireCooldown || 1.15) * 1.6;
        e.hitFlash = 0.14;
      }
    }
    return;
  }
  e.fireTimer -= dt;
  if (e.fireTimer > 0) return;
  e.fireTimer = t.fireCooldown || 1.15;
  fireProjectileAngle(game, e, infernoAim(e, player), t.boltSpeed || 250, e.dmg, { color: '#e0b46a', radius: 4 });
  e.inf3Shots++;
  if (e.inf3Shots >= 4) { e.inf3Stoop = 5; e.inf3Gap = 0.2; e.hitFlash = 0.16; }
};

ENEMY_BEHAVIOR_HANDLERS.inf3Dnbhornet = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.inf3Jabs === undefined) { e.inf3Jabs = 0; e.inf3Buzz = RNG.random() * 6; e.inf3Back = 0; }
  const v = seekVector(e, player.x, player.y);
  if (e.inf3Back > 0) {
    e.inf3Back -= dt;
    infernoStep(game, e, dt, -v.x, -v.y, 1.5);
    if (e.inf3Back <= 0) e.attackTimer = t.chargeCooldown || 2.2;
    return;
  }
  if (e.inf3Jabs > 0) {
    e.inf3Back -= dt;
    if (e.dashing) {
      infernoStep(game, e, dt, e.dashVX, e.dashVY, (t.chargeSpeed || 5.6) * 0.45);
      e.dashTimer -= dt;
      if (e.dashTimer <= 0) { e.dashing = false; e.dashTimer = 0; e.inf3Jabs--; e.inf3Gap = 0.14; if (e.inf3Jabs <= 0) e.inf3Back = 0.45; }
      return;
    }
    e.inf3Gap -= dt;
    infernoStep(game, e, dt, -v.y, v.x, 0.5);
    if (e.inf3Gap <= 0) { e.dashing = true; e.dashTimer = 0.13; e.dashVX = v.x; e.dashVY = v.y; e.hitFlash = 0.1; }
    return;
  }
  if (e.dashing) {
    const r = infernoStep(game, e, dt, e.dashVX, e.dashVY, t.chargeSpeed || 5.6);
    e.dashTimer -= dt;
    if ((!r.movedX && !r.movedY) || e.dashTimer <= 0) {
      e.dashing = false;
      e.inf3Jabs = 3;
      e.inf3Gap = 0.12;
    }
    return;
  }
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 34) > 0) ? 0.12 : 0;
    if (e.telegraph <= 0) { e.dashing = true; e.dashTimer = t.dashDuration || 0.32; e.dashVX = v.x; e.dashVY = v.y; }
    return;
  }
  e.attackTimer -= dt;
  e.inf3Buzz += dt * 9;
  const w = Math.sin(e.inf3Buzz) * 0.8;
  infernoStep(game, e, dt, v.x + (-v.y) * w, v.y + v.x * w, 0.85);
  if (e.attackTimer <= 0 && v.d < 300) e.telegraph = t.telegraphTime || 0.35;
};

ENEMY_BEHAVIOR_HANDLERS.inf3Dnbwasp = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.inf3HP === undefined) { e.inf3HP = e.hp; e.inf3Dir = RNG.random() < 0.5 ? 1 : -1; e.inf3Rage = 0; }
  if (e.hp < e.inf3HP) {
    e.inf3HP = e.hp;
    e.inf3Dir = -e.inf3Dir;
    e.inf3Rage = 0.7;
    infernoArc(game, e, infernoAim(e, player), 3, 0.55, t.boltSpeed || 230, { color: '#ff8a4a', radius: 4 });
    e.hitFlash = 0.16;
  }
  const v = seekVector(e, player.x, player.y);
  const ring = (t.keepDistance || 100) * (e.inf3Rage > 0 ? 1.7 : 1);
  const radial = (v.d - ring) * 0.022;
  const tangent = e.inf3Dir * 0.9;
  infernoStep(game, e, dt, v.x * radial + (-v.y) * tangent, v.y * radial + v.x * tangent, e.inf3Rage > 0 ? 1.6 : 1);
  if (e.inf3Rage > 0) { e.inf3Rage -= dt; return; }
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && v.d < (t.fireRange || 420)) {
    e.fireTimer = t.fireCooldown || 1.2;
    fireProjectileAngle(game, e, infernoAim(e, player), t.boltSpeed || 230, e.dmg, { color: '#ff8a4a', radius: 4 });
  }
};

ENEMY_BEHAVIOR_HANDLERS.inf3Cinderpouncer = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.inf3Coil === undefined) { e.inf3Coil = 0; e.inf3Power = 0; e.attackTimer = Util.rand(0.2, 0.8); }
  if (e.dashing) {
    const r = infernoStep(game, e, dt, e.dashVX, e.dashVY, (t.leapSpeed || 5.8) * (0.7 + e.inf3Power * 0.6));
    e.dashTimer -= dt;
    if ((!r.movedX && !r.movedY) || e.dashTimer <= 0) {
      e.dashing = false;
      infernoScorch(game, e, e.x, e.y, 30 + e.inf3Power * 44);
      if (e.inf3Power > 0.6) infernoRing(game, e, 6, 170, { color: '#e0662e', radius: 5 }, RNG.random());
      e.inf3Coil = 0;
      e.attackTimer = 0.9;
    }
    return;
  }
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 32) > 0) ? 0.14 : 0;
    if (e.telegraph <= 0) {
      const v = seekVector(e, player.x, player.y);
      e.dashing = true;
      e.dashTimer = 0.28 + e.inf3Power * 0.3;
      e.dashVX = v.x; e.dashVY = v.y;
    }
    return;
  }
  e.attackTimer = (e.attackTimer || 0) - dt;
  const v = seekVector(e, player.x, player.y);
  if (e.attackTimer > 0) { infernoStep(game, e, dt, -v.x, -v.y, 0.7); return; }
  e.inf3Coil = Math.min(1, e.inf3Coil + dt * 0.5);
  e.submerged = e.inf3Coil < 0.99;
  const reach = (t.pounceRange || 170) * (0.4 + e.inf3Coil);
  if (v.d < reach || e.inf3Coil >= 1) {
    e.inf3Power = e.inf3Coil;
    e.submerged = false;
    e.telegraph = 0.22;
  }
};

ENEMY_BEHAVIOR_HANDLERS.inf3Ashstrafer = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.inf3Dir === undefined) { e.inf3Dir = RNG.random() < 0.5 ? 1 : -1; }
  let mate = null, md = 999999;
  for (const o of node.enemies) {
    if (o === e || o.isDead || o.type.id !== e.type.id) continue;
    const d = Util.dist(e.x, e.y, o.x, o.y);
    if (d < md) { md = d; mate = o; }
  }
  const ring = t.keepDistance || 180;
  const v = seekVector(e, player.x, player.y);
  let paired = 0;
  if (mate) {
    const mb = Math.atan2(mate.y - player.y, mate.x - player.x);
    const want = mb + Math.PI;
    const tx = player.x + Math.cos(want) * ring, ty = player.y + Math.sin(want) * ring;
    const s = seekVector(e, tx, ty);
    infernoStep(game, e, dt, s.x, s.y, 1.15);
    paired = s.d < 70 ? 1 : 0;
  } else {
    const radial = (v.d - ring) * 0.018;
    infernoStep(game, e, dt, v.x * radial + (-v.y) * e.inf3Dir * 0.85, v.y * radial + v.x * e.inf3Dir * 0.85, 1);
  }
  e.fireTimer -= dt;
  if (e.fireTimer > 0 || v.d > (t.fireRange || 420)) return;
  e.fireTimer = (t.fireCooldown || 1.3) * (paired ? 0.6 : 1);
  const opts = { color: t.boltColor || '#e0602e', radius: 5 };
  if (paired) infernoArc(game, e, infernoAim(e, player), 3, 0.4, t.boltSpeed || 210, opts);
  else fireProjectileAngle(game, e, infernoAim(e, player), t.boltSpeed || 210, e.dmg, opts);
  infernoScorch(game, e, e.x, e.y, 22, Math.max(1, Math.floor(e.dmg / 2)));
};

ENEMY_BEHAVIOR_HANDLERS.inf3Twinflameimp = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.inf3Gap2 === undefined) { e.inf3Gap2 = t.splitAngle || 0.5; e.inf3Bear = infernoAim(e, player); e.inf3Alt = 0; }
  const keep = t.keepDistance || 150;
  const v = seekVector(e, player.x, player.y);
  if (v.d < keep - 20) infernoStep(game, e, dt, -v.x, -v.y, 1);
  else if (v.d > keep + 20) infernoStep(game, e, dt, v.x, v.y, 0.95);
  else infernoStep(game, e, dt, -v.y, v.x, 0.45);
  e.fireTimer -= dt;
  if (e.fireTimer > 0 || v.d > (t.fireRange || 380)) return;
  const aim = infernoAim(e, player);
  let swing = aim - e.inf3Bear;
  while (swing > Math.PI) swing -= Math.PI * 2;
  while (swing < -Math.PI) swing += Math.PI * 2;
  e.inf3Bear = aim;
  const base = t.splitAngle || 0.5;
  if (Math.abs(swing) > 0.35) e.inf3Gap2 = base;
  else e.inf3Gap2 = Math.max(0.07, e.inf3Gap2 * 0.68);
  const opts = { color: t.boltColor || '#f0a03a', radius: 5 };
  const sp = t.boltSpeed || 200;
  e.inf3Alt = 1 - e.inf3Alt;
  const lead = e.inf3Alt ? 1 : -1;
  fireProjectileAngle(game, e, aim + e.inf3Gap2 * lead, sp, e.dmg, opts);
  fireProjectileAngle(game, e, aim - e.inf3Gap2 * lead, sp * 0.92, e.dmg, opts);
  if (e.inf3Gap2 <= 0.08) {
    fireProjectileAngle(game, e, aim, sp * 1.35, e.dmg, { color: '#ffd28a', radius: 6 });
    e.inf3Gap2 = base;
    e.fireTimer = (t.fireCooldown || 1.9) * 1.4;
    e.hitFlash = 0.18;
    return;
  }
  e.fireTimer = (t.fireCooldown || 1.9) * 0.6;
};

ENEMY_BEHAVIOR_HANDLERS.inf3Slagambusher = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.inf3Phase === undefined) { e.inf3Phase = 0; e.attackTimer = Util.rand(0.6, 1.4); }
  infernoTrack(e, player, dt);
  if (e.inf3Phase === 1) {
    e.lobTimer -= dt;
    const s = seekVector(e, e.lobX, e.lobY);
    if (e.lobTimer <= 0.55) infernoStep(game, e, dt, s.x, s.y, (t.leapSpeed || 4.6) * 1.1);
    if (e.lobTimer <= 0) {
      infernoScorch(game, e, e.lobX, e.lobY, 66);
      infernoRing(game, e, 7, 165, { color: '#c9482e', radius: 5 }, RNG.random());
      e.inf3Phase = 0;
      e.attackTimer = 2;
      e.hitFlash = 0.18;
    }
    return;
  }
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 24) > 0) ? 0.14 : 0;
    if (e.telegraph <= 0) {
      e.lobX = player.x + e.inf1VX * 0.55;
      e.lobY = player.y + e.inf1VY * 0.55;
      const spot = findNearestFloor(node, Math.floor(e.lobX / TILE), Math.floor(e.lobY / TILE));
      e.lobX = spot.x * TILE + TILE / 2;
      e.lobY = spot.y * TILE + TILE / 2;
      e.lobTime = 1.1;
      e.lobTimer = e.lobTime;
      e.inf3Phase = 1;
    }
    return;
  }
  e.attackTimer -= dt;
  const v = seekVector(e, player.x, player.y);
  infernoStep(game, e, dt, v.x, v.y, 0.65);
  if (e.attackTimer <= 0 && v.d < (t.pounceRange || 135) * 2.4) e.telegraph = 0.5;
};

ENEMY_BEHAVIOR_HANDLERS.inf3Embermarksman = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.inf3Sight === undefined) { e.inf3Sight = 0; e.inf3Burst = 0; e.inf3Gap = 0; }
  const v = seekVector(e, player.x, player.y);
  const keep = t.keepDistance || 240;
  if (e.inf3Burst > 0) {
    e.inf3Gap -= dt;
    if (e.inf3Gap <= 0) {
      e.inf3Gap = 0.13;
      fireProjectileAngle(game, e, e.inf3Lock, (t.boltSpeed || 210) * (1 + e.inf3Burst * 0.18), e.dmg, { color: t.boltColor || '#ffcf7a', radius: 5 });
      e.inf3Burst--;
      if (e.inf3Burst <= 0) { e.inf3Sight = 0; e.fireTimer = t.fireCooldown || 1.7; }
    }
    return;
  }
  const los = hasLineOfSight(node, e, player.x, player.y);
  if (los && v.d > keep * 0.7) e.inf3Sight += dt;
  else e.inf3Sight = Math.max(0, e.inf3Sight - dt * 2.5);
  e.hitFlash = e.inf3Sight > 0.9 ? 0.1 : 0;
  if (v.d < keep - 30) infernoStep(game, e, dt, -v.x, -v.y, 1.2);
  else if (v.d > keep + 60) infernoStep(game, e, dt, v.x, v.y, 0.85);
  else if (!los) infernoStep(game, e, dt, -v.y, v.x, 0.9);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && e.inf3Sight >= 1.3 && los) {
    e.inf3Lock = infernoAim(e, player);
    e.inf3Burst = 3;
    e.inf3Gap = 0;
    e.hitFlash = 0.16;
  }
};
