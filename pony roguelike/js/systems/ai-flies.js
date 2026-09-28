'use strict';

ENEMY_BEHAVIOR_HANDLERS.aimless = function(game, e, dt){
  aiWander(game, e, dt);
};

ENEMY_BEHAVIOR_HANDLERS.skitter = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.skitterBurst > 0) {
    e.skitterBurst -= dt;
    tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
    return;
  }
  e.skitterPause = (e.skitterPause === undefined) ? 0 : e.skitterPause;
  e.skitterPause -= dt;
  if (e.skitterPause <= 0) {
    const v = seekVector(e, player.x, player.y);

    const jitter = Util.rand(-0.7, 0.7);
    const ca = Math.cos(jitter), sa = Math.sin(jitter);
    const jx = v.x * ca - v.y * sa, jy = v.x * sa + v.y * ca;
    const burstSpeed = e.speed * (t.skitterBurstMult || 2.4);
    e.dashVX = jx * burstSpeed; e.dashVY = jy * burstSpeed;
    e.skitterBurst = t.skitterBurstTime || 0.22;
    e.skitterPause = Util.rand(t.skitterPauseMin || 0.15, t.skitterPauseMax || 0.4);
  }
};
