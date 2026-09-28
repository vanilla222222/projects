'use strict';

function crypt5Step(game, e, dt, dx, dy, mul){
  const node = game.currentRoom;
  const len = Math.hypot(dx, dy) || 1;
  return tryMoveEntity(e, node, node.obstacles, (dx / len) * e.speed * (mul || 1) * dt, (dy / len) * e.speed * (mul || 1) * dt);
}

function crypt5Ring(game, e, count, speed, opts, offset, skip){
  for (let i = 0; i < count; i++) {
    if (skip !== undefined && i === skip) continue;
    fireProjectileAngle(game, e, (offset || 0) + (i / count) * Math.PI * 2, speed, e.dmg, opts);
  }
}

function crypt5Arc(game, e, ang, count, spread, speed, opts){
  const start = ang - spread / 2;
  const step = count > 1 ? spread / (count - 1) : 0;
  for (let i = 0; i < count; i++) fireProjectileAngle(game, e, start + step * i, speed, e.dmg, opts);
}

function crypt5Bounds(node){
  return {
    minX: TILE * 1.5,
    maxX: (node.tileW - 2.5) * TILE,
    minY: TILE * 1.5,
    maxY: (node.tileH - 2.5) * TILE
  };
}

function crypt5FireFrom(game, e, x, y, fn){
  const sx = e.x, sy = e.y;
  e.x = x; e.y = y;
  fn();
  e.x = sx; e.y = sy;
}

ENEMY_BEHAVIOR_HANDLERS.cr5Inkscribe = function(game, e, dt){
  const player = game.player;
  const t = e.type || {};
  if (e.cr5Nodes === undefined) {
    e.cr5Nodes = [];
    e.cr5Timer = t.nodeInterval || 1.05;
    e.cr5Spin = RNG.random() * Math.PI * 2;
  }
  e.cr5Spin += dt * 0.9;
  const tx = player.x + Math.cos(e.cr5Spin) * 108;
  const ty = player.y + Math.sin(e.cr5Spin) * 108;
  const v = seekVector(e, tx, ty);
  crypt5Step(game, e, dt, v.x, v.y, 1);
  e.cr5Timer -= dt;
  if (e.cr5Timer <= 0) {
    e.cr5Nodes.push({ x: e.x, y: e.y });
    e.cr5Timer = t.nodeInterval || 1.05;
    e.hitFlash = 0.1;
    Sound.play('hit');
    if (e.cr5Nodes.length >= (t.nodeCount || 4)) {
      for (let i = 0; i < e.cr5Nodes.length; i++) {
        const nd = e.cr5Nodes[i];
        crypt5FireFrom(game, e, nd.x, nd.y, function(){
          fireProjectileAt(game, e, player.x, player.y, 195, e.dmg, { color: t.boltColor || '#9fc4e0', radius: 5 });
        });
        game.explosions.push(new Explosion(nd.x, nd.y, 14));
      }
      e.cr5Nodes.length = 0;
      e.cr5Timer = (t.nodeInterval || 1.05) * 1.8;
    }
  }
};

ENEMY_BEHAVIOR_HANDLERS.cr5Grudgebell = function(game, e, dt){
  const player = game.player;
  const t = e.type || {};
  const d = Util.dist(e.x, e.y, player.x, player.y);
  if (e.cr5Charge === undefined) { e.cr5Charge = 0; e.cr5PrevD = d; }
  const closing = d < e.cr5PrevD - 0.4;
  e.cr5PrevD = d;
  const need = t.chargeNeeded || 2.2;
  if (closing) {
    e.cr5Charge = Math.min(need, e.cr5Charge + dt);
    const v = seekVector(e, player.x, player.y);
    crypt5Step(game, e, dt, -v.x, -v.y, 0.9);
    e.hitFlash = Math.max(e.hitFlash || 0, 0.08 * (e.cr5Charge / need));
  } else {
    e.cr5Charge = Math.max(0, e.cr5Charge - dt * 0.35);
    const v = seekVector(e, player.x, player.y);
    crypt5Step(game, e, dt, v.x, v.y, 1);
  }
  if (e.cr5Charge >= need) {
    const off = RNG.random() * Math.PI * 2;
    crypt5Ring(game, e, 8, 130, { color: t.boltColor || '#f0d890', radius: 5 }, off);
    crypt5Ring(game, e, 8, 205, { color: t.boltColor || '#f0d890', radius: 4 }, off + Math.PI / 8);
    game.explosions.push(new Explosion(e.x, e.y, 30));
    Sound.play('hit');
    e.cr5Charge = 0;
  }
};

ENEMY_BEHAVIOR_HANDLERS.cr5Ashenwidow = function(game, e, dt){
  const player = game.player;
  const t = e.type || {};
  if (e.cr5LastHp === undefined) { e.cr5LastHp = e.hp; e.cr5Recoil = 0; }
  if (e.hp < e.cr5LastHp) {
    e.cr5Recoil = t.recoilTime || 0.45;
    const ang = Math.atan2(player.y - e.y, player.x - e.x);
    crypt5Arc(game, e, ang, 5, 1.25, 175, { color: t.boltColor || '#d09ab0', radius: 4 });
    Sound.play('hit');
  }
  e.cr5LastHp = e.hp;
  const v = seekVector(e, player.x, player.y);
  if (e.cr5Recoil > 0) {
    e.cr5Recoil -= dt;
    crypt5Step(game, e, dt, -v.x, -v.y, 2.4);
    return;
  }
  crypt5Step(game, e, dt, v.x, v.y, 1);
};

ENEMY_BEHAVIOR_HANDLERS.cr5Sableescort = function(game, e, dt){
  const player = game.player;
  const node = game.currentRoom;
  const t = e.type || {};
  const list = node && node.enemies ? node.enemies : [];
  if (e.cr5Ward && (e.cr5Ward.isDead || e.cr5Ward.hp <= 0)) e.cr5Ward = null;
  let best = null;
  for (let i = 0; i < list.length; i++) {
    const o = list[i];
    if (o === e || o.isDead || o.hp <= 0) continue;
    if (o.type && o.type.behavior === 'shielded') continue;
    if (!best || o.hp < best.hp) best = o;
  }
  if (e.cr5Ward && e.cr5Ward !== best) { e.cr5Ward.shielded = false; e.cr5Ward = null; }
  if (!best) {
    const v = seekVector(e, player.x, player.y);
    crypt5Step(game, e, dt, v.x, v.y, 1.5);
    return;
  }
  const v = seekVector(e, best.x, best.y);
  const rad = t.escortRadius || 34;
  if (v.d > rad) {
    crypt5Step(game, e, dt, v.x, v.y, 1.2);
    if (e.cr5Ward) { e.cr5Ward.shielded = false; e.cr5Ward = null; }
    return;
  }
  const pv = seekVector(e, player.x, player.y);
  crypt5Step(game, e, dt, -pv.x, -pv.y, 0.4);
  best.shielded = true;
  e.cr5Ward = best;
  e.hitFlash = Math.max(e.hitFlash || 0, 0.06);
};

ENEMY_BEHAVIOR_HANDLERS.cr5Cindermarrow = function(game, e, dt){
  const player = game.player;
  const t = e.type || {};
  if (e.cr5Marks === undefined) { e.cr5Marks = []; e.cr5Timer = t.markInterval || 0.9; }
  const v = seekVector(e, player.x, player.y);
  crypt5Step(game, e, dt, v.x, v.y, 1);
  e.cr5Timer -= dt;
  if (e.cr5Timer <= 0) {
    e.cr5Marks.push({ x: e.x, y: e.y, t: t.markFuse || 1.5 });
    e.cr5Timer = t.markInterval || 0.9;
  }
  const rad = t.markRadius || 40;
  for (let i = e.cr5Marks.length - 1; i >= 0; i--) {
    const m = e.cr5Marks[i];
    m.t -= dt;
    if (m.t <= 0) {
      game.explosions.push(new Explosion(m.x, m.y, rad));
      if (Util.dist(m.x, m.y, player.x, player.y) < rad + 6) damagePlayer(game, playerDamageAmount(game, false, e.dmg), e.type.id);
      e.cr5Marks.splice(i, 1);
    }
  }
};

ENEMY_BEHAVIOR_HANDLERS.cr5Rookossuary = function(game, e, dt){
  const player = game.player;
  const t = e.type || {};
  if (e.cr5Axis === undefined) { e.cr5Axis = 0; e.fireTimer = 1; }
  e.fireTimer -= dt;
  const tol = 14;
  if (e.cr5Axis === 0) {
    const dy = player.y - e.y;
    if (Math.abs(dy) > tol) {
      crypt5Step(game, e, dt, 0, dy, 1);
    } else if (e.fireTimer <= 0 && hasLineOfSight(game.currentRoom, e, player.x, player.y)) {
      const ang = player.x >= e.x ? 0 : Math.PI;
      fireProjectileAngle(game, e, ang, t.laneSpeed || 300, e.dmg, { color: t.boltColor || '#ded4b4', radius: 6 });
      Sound.play('hit');
      e.fireTimer = 1.5;
      e.cr5Axis = 1;
      e.hitFlash = 0.15;
    }
    return;
  }
  const dx = player.x - e.x;
  if (Math.abs(dx) > tol) {
    crypt5Step(game, e, dt, dx, 0, 1);
  } else if (e.fireTimer <= 0 && hasLineOfSight(game.currentRoom, e, player.x, player.y)) {
    const ang = player.y >= e.y ? Math.PI / 2 : -Math.PI / 2;
    fireProjectileAngle(game, e, ang, t.laneSpeed || 300, e.dmg, { color: t.boltColor || '#ded4b4', radius: 6 });
    Sound.play('hit');
    e.fireTimer = 1.5;
    e.cr5Axis = 0;
    e.hitFlash = 0.15;
  }
};

ENEMY_BEHAVIOR_HANDLERS.cr5Boneloom = function(game, e, dt){
  const player = game.player;
  const t = e.type || {};
  if (e.cr5Ang === undefined) {
    e.cr5Ang = Math.atan2(player.y - e.y, player.x - e.x);
    e.cr5Dir = 1;
    e.cr5Prev = 0;
    e.fireTimer = 0;
  }
  const rate = t.sweepRate || 1.35;
  e.cr5Ang += rate * e.cr5Dir * dt;
  if (e.cr5Ang > Math.PI) e.cr5Ang -= Math.PI * 2;
  if (e.cr5Ang < -Math.PI) e.cr5Ang += Math.PI * 2;
  const pang = Math.atan2(player.y - e.y, player.x - e.x);
  let diff = pang - e.cr5Ang;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (e.cr5Prev !== 0 && Math.sign(diff) !== Math.sign(e.cr5Prev) && Math.abs(diff) < 1) {
    e.cr5Dir *= -1;
    e.hitFlash = 0.12;
  }
  e.cr5Prev = diff;
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) {
    fireProjectileAngle(game, e, e.cr5Ang, 170, e.dmg, { color: t.boltColor || '#efe4c2', radius: 4 });
    e.fireTimer = 0.16;
  }
};

ENEMY_BEHAVIOR_HANDLERS.cr5Vaultjailer = function(game, e, dt){
  const player = game.player;
  const t = e.type || {};
  if (e.cr5Timer === undefined) e.cr5Timer = (t.cageCooldown || 4.2) * 0.5;
  const v = seekVector(e, player.x, player.y);
  crypt5Step(game, e, dt, v.x, v.y, v.d < 70 ? -0.6 : 1);
  e.cr5Timer -= dt;
  if (e.cr5Timer <= 0) {
    const count = t.cageCount || 11;
    const gap = Util.randi(0, count - 1);
    const px = player.x, py = player.y;
    crypt5FireFrom(game, e, px, py, function(){
      crypt5Ring(game, e, count, 95, { color: t.boltColor || '#8fd0c4', radius: 5 }, RNG.random(), gap);
    });
    game.explosions.push(new Explosion(px, py, 16));
    Sound.play('hit');
    e.cr5Timer = t.cageCooldown || 4.2;
    e.hitFlash = 0.18;
  }
};

ENEMY_BEHAVIOR_HANDLERS.cr5Gristlehound = function(game, e, dt){
  const player = game.player;
  const t = e.type || {};
  if (e.cr5Trail === undefined) { e.cr5Trail = []; e.cr5Clock = 0; e.cr5Sample = 0; e.cr5Lunge = 0; }
  e.cr5Clock += dt;
  e.cr5Sample -= dt;
  if (e.cr5Sample <= 0) {
    e.cr5Trail.push({ x: player.x, y: player.y, t: e.cr5Clock });
    e.cr5Sample = 0.1;
    if (e.cr5Trail.length > 64) e.cr5Trail.shift();
  }
  if (e.cr5Lunge > 0) {
    e.cr5Lunge -= dt;
    const pv = seekVector(e, player.x, player.y);
    crypt5Step(game, e, dt, pv.x, pv.y, t.lungeSpeed || 3.4);
    return;
  }
  const lag = t.trailLag || 1.15;
  let target = e.cr5Trail[0];
  for (let i = 0; i < e.cr5Trail.length; i++) {
    if (e.cr5Clock - e.cr5Trail[i].t <= lag) { target = e.cr5Trail[i]; break; }
  }
  if (!target) return;
  const v = seekVector(e, target.x, target.y);
  crypt5Step(game, e, dt, v.x, v.y, 1);
  if (v.d < 22 && Util.dist(e.x, e.y, player.x, player.y) < 110) {
    e.cr5Lunge = 0.38;
    e.hitFlash = 0.16;
    Sound.play('hit');
  }
};

ENEMY_BEHAVIOR_HANDLERS.cr5Relicwarden = function(game, e, dt){
  const player = game.player;
  const node = game.currentRoom;
  const t = e.type || {};
  if (e.cr5HX === undefined) {
    e.cr5HX = e.x; e.cr5HY = e.y;
    e.cr5Bob = RNG.random() * Math.PI * 2;
    e.fireTimer = 0.9;
  }
  const terr = t.territory || 150;
  const inside = Util.dist(e.cr5HX, e.cr5HY, player.x, player.y) < terr;
  if (inside) {
    const v = seekVector(e, player.x, player.y);
    if (v.d > 60) crypt5Step(game, e, dt, v.x, v.y, 1.45);
    e.fireTimer -= dt;
    if (e.fireTimer <= 0 && hasLineOfSight(node, e, player.x, player.y)) {
      crypt5Arc(game, e, Math.atan2(player.y - e.y, player.x - e.x), 2, 0.34, 210, { color: t.boltColor || '#a8d8f0', radius: 5 });
      e.fireTimer = 1.5;
    }
    return;
  }
  e.cr5Bob += dt * 1.6;
  const hv = seekVector(e, e.cr5HX, e.cr5HY);
  if (hv.d > 12) {
    crypt5Step(game, e, dt, hv.x, hv.y, 0.9);
  } else {
    crypt5Step(game, e, dt, Math.cos(e.cr5Bob), Math.sin(e.cr5Bob), 0.18);
  }
  e.fireTimer = 0.9;
};
