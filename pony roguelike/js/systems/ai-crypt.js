'use strict';

ENEMY_BEHAVIOR_HANDLERS.flee = function(game, e, dt){
  const node = game.currentRoom, player = game.player;
  const v = seekVector(e, player.x, player.y);
  tryMoveEntity(e, node, node.obstacles, -v.x * e.speed * dt, -v.y * e.speed * dt);
};

ENEMY_BEHAVIOR_HANDLERS.wallHugger = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  const minX = TILE * 1.5, maxX = (node.tileW - 2.5) * TILE;
  const minY = TILE * 1.5, maxY = (node.tileH - 2.5) * TILE;
  const dLeft = e.x - minX, dRight = maxX - e.x, dTop = e.y - minY, dBottom = maxY - e.y;
  const m = Math.min(dLeft, dRight, dTop, dBottom);
  let onVerticalWall = (m === dLeft || m === dRight);
  if (m === dLeft) e.x = minX;
  else if (m === dRight) e.x = maxX;
  else if (m === dTop) e.y = minY;
  else e.y = maxY;

  const trackX = onVerticalWall ? e.x : Util.clamp(player.x, minX, maxX);
  const trackY = onVerticalWall ? Util.clamp(player.y, minY, maxY) : e.y;
  const dx = trackX - e.x, dy = trackY - e.y, len = Math.hypot(dx, dy) || 1;
  tryMoveEntity(e, node, node.obstacles, (dx / len) * e.speed * dt, (dy / len) * e.speed * dt);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) {
    e.fireTimer = t.fireCooldown || 2.2;
    fireProjectileAt(game, e, player.x, player.y, t.boltSpeed || 200, e.dmg,
      { color: t.boltColor || '#a8a090', radius: t.boltRadius || 5 });
  }
};

ENEMY_BEHAVIOR_HANDLERS.cardinalBloat = function(game, e, dt){
  aiWander(game, e, dt);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) {
    e.fireTimer = e.type.fireCooldown || 2.0;
    const opts = { color: e.type.boltColor || '#7a9a5a', radius: e.type.boltRadius || 5 };
    const speed = e.type.boltSpeed || 190;
    fireProjectileAngle(game, e, 0, speed, e.dmg, opts);
    fireProjectileAngle(game, e, Math.PI / 2, speed, e.dmg, opts);
    fireProjectileAngle(game, e, Math.PI, speed, e.dmg, opts);
    fireProjectileAngle(game, e, -Math.PI / 2, speed, e.dmg, opts);
  }
};

ENEMY_BEHAVIOR_HANDLERS.randomJumper = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.dashing) {
    tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
    e.dashTimer -= dt;
    if (e.dashTimer <= 0) e.dashing = false;
    return;
  }
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 24) > 0) ? 0.1 : 0;
    if (e.telegraph <= 0) {
      const d = Util.dist(e.x, e.y, player.x, player.y);
      const ang = (d < (t.aimRange || 150)) ? Math.atan2(player.y - e.y, player.x - e.x) : RNG.random() * Math.PI * 2;
      const jumpSpeed = t.jumpSpeed || 5.2;
      e.dashing = true; e.dashTimer = t.jumpDuration || 0.4;
      e.dashVX = Math.cos(ang) * e.speed * jumpSpeed;
      e.dashVY = Math.sin(ang) * e.speed * jumpSpeed;
    }
    return;
  }
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) {
    e.attackTimer = Util.rand(t.jumpCooldownMin || 0.6, t.jumpCooldownMax || 1.2);
    e.telegraph = t.telegraphTime || 0.3;
  }
};

ENEMY_BEHAVIOR_HANDLERS.dvdStrider = function(game, e, dt){
  const node = game.currentRoom, t = e.type;
  if (!e.dashVX && !e.dashVY) {
    const ang = RNG.random() * Math.PI * 2;
    const sp = t.striderSpeed || e.speed;
    e.dashVX = Math.cos(ang) * sp; e.dashVY = Math.sin(ang) * sp;
  }
  const moved = tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
  if (!moved.movedX && Math.abs(e.dashVX) > 5) e.dashVX = -e.dashVX;
  if (!moved.movedY && Math.abs(e.dashVY) > 5) e.dashVY = -e.dashVY;
};

ENEMY_BEHAVIOR_HANDLERS.haunter = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.hauntTimer === undefined) e.hauntTimer = Util.rand(1.5, 2.5);
  if (e.hauntTarget) {
    const ob = e.hauntTarget;
    const d = Util.dist(e.x, e.y, ob.x, ob.y);
    if (d > 8) {
      const dx = ob.x - e.x, dy = ob.y - e.y, len = Math.hypot(dx, dy) || 1;
      tryMoveEntity(e, node, node.obstacles, (dx / len) * e.speed * 2.2 * dt, (dy / len) * e.speed * 2.2 * dt);
      return;
    }
    triggerHaunt(game, e, ob);
    e.hauntTarget = null;
    e.hauntTimer = Util.rand(t.hauntCooldownMin || 3, t.hauntCooldownMax || 5);
    return;
  }
  aiOrbiter(game, e, dt);
  e.hauntTimer -= dt;
  if (e.hauntTimer <= 0) {
    const pool = node.obstacles.filter(o => !o.destroyed);
    e.hauntTarget = pool.length ? Util.choice(pool) : { x: player.x + Util.rand(-70, 70), y: player.y + Util.rand(-70, 70) };
  }
};

function triggerHaunt(game, e, ob){
  const player = game.player;
  const R = 70;
  game.explosions.push(new Explosion(ob.x, ob.y, R * 0.6));
  if (ob.isPit) {
    const dx = player.x - ob.x, dy = player.y - ob.y, d = Math.hypot(dx, dy) || 1;
    if (d < 110) {
      const pull = Math.min(26, d);
      player.x -= (dx / d) * pull; player.y -= (dy / d) * pull;
      if (d < R) damagePlayer(game, playerDamageAmount(game, false, e.dmg), e.type.id);
    }
  } else if (ob.isHazard || ob.attackable) {
    const proxy = { x: ob.x, y: ob.y, isBoss: false };
    fireProjectileAt(game, proxy, player.x, player.y, 220, e.dmg, { color: '#c9a8e0', radius: 5 });
  } else if (ob.destructible) {
    const proxy = { x: ob.x, y: ob.y, isBoss: false };
    fireProjectileAt(game, proxy, player.x, player.y, 260, e.dmg + 1, { color: '#9a9488', radius: 7 });
  } else if (Util.dist(player.x, player.y, ob.x, ob.y) < R) {
    damagePlayer(game, playerDamageAmount(game, false, e.dmg), e.type.id);
  }
}
