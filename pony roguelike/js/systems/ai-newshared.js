'use strict';

ENEMY_BEHAVIOR_HANDLERS.pouncer = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.dashing) {
    tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
    e.dashTimer -= dt;
    if (e.dashTimer <= 0) e.dashing = false;
    return;
  }
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 26) > 0) ? 0.1 : 0;
    if (e.telegraph <= 0) {
      const v = seekVector(e, player.x, player.y);
      const ls = t.leapSpeed || 5.5;
      e.dashing = true; e.dashTimer = t.dashDuration || 0.35;
      e.dashVX = v.x * e.speed * ls; e.dashVY = v.y * e.speed * ls;
    }
    return;
  }
  if (Util.dist(e.x, e.y, player.x, player.y) < (t.pounceRange || 170)) { e.telegraph = t.telegraphTime || 0.4; return; }
  aiWander(game, e, dt);
};

ENEMY_BEHAVIOR_HANDLERS.strafer = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  const ring = t.keepDistance || 180;
  const radial = (v.d - ring) * 0.018;
  const tangent = e.orbitDir * 0.85;
  const mx = v.x * radial + -v.y * tangent, my = v.y * radial + v.x * tangent;
  const len = Math.hypot(mx, my) || 1;
  tryMoveEntity(e, node, node.obstacles, (mx / len) * e.speed * dt, (my / len) * e.speed * dt);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && v.d < (t.fireRange || 420)) {
    e.fireTimer = t.fireCooldown || 1.4;
    fireProjectileAt(game, e, player.x, player.y, t.boltSpeed || 210, e.dmg, { color: t.boltColor || '#d9895a', radius: t.boltRadius || 5 });
  }
};

ENEMY_BEHAVIOR_HANDLERS.splitshot = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  const d = Util.dist(e.x, e.y, player.x, player.y);
  const keep = t.keepDistance || 150;
  if (d < keep - 20) {
    const mx = e.x - player.x, my = e.y - player.y;
    const len = Math.hypot(mx, my) || 1;
    tryMoveEntity(e, node, node.obstacles, (mx / len) * e.speed * dt, (my / len) * e.speed * dt);
  } else if (d > keep + 20) {
    chaseSeek(game, e, player.x, player.y, 1, dt);
  }
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && d < (t.fireRange || 380)) {
    e.fireTimer = t.fireCooldown || 1.8;
    const aim = Math.atan2(player.y - e.y, player.x - e.x);
    const gap = t.splitAngle || 0.5;
    const opts = { color: t.boltColor || '#d9895a', radius: t.boltRadius || 5 };
    fireProjectileAngle(game, e, aim - gap, t.boltSpeed || 200, e.dmg, opts);
    fireProjectileAngle(game, e, aim + gap, t.boltSpeed || 200, e.dmg, opts);
  }
};
