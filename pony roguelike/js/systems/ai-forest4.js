'use strict';

ENEMY_BEHAVIOR_HANDLERS.fr4Mudstomper = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.fr4State === undefined) { e.fr4State = 'chase'; e.fr4Timer = 0; e.fr4Dir = { x: 0, y: 0 }; }
  const d = Util.dist(e.x, e.y, player.x, player.y);
  if (e.fr4State === 'chase') {
    const v = seekVector(e, player.x, player.y);
    forestStep(game, e, dt, v.x, v.y, 1);
    if (d < 140) { e.fr4State = 'telegraph'; e.fr4Timer = 0.5; }
    return;
  }
  if (e.fr4State === 'telegraph') {
    e.fr4Timer -= dt;
    e.hitFlash = (Math.sin(e.fr4Timer * 30) > 0) ? 0.16 : 0;
    if (e.fr4Timer <= 0) {
      const ang = forestAim(e, player);
      e.fr4Dir.x = Math.cos(ang); e.fr4Dir.y = Math.sin(ang);
      e.fr4State = 'charge'; e.fr4Timer = 0.7;
    }
    return;
  }
  if (e.fr4State === 'charge') {
    e.fr4Timer -= dt;
    forestStep(game, e, dt, e.fr4Dir.x, e.fr4Dir.y, t.chargeSpeed || 2.2);
    if (e.fr4Timer <= 0 || d < 42) {
      const R = t.stompRadius || 52;
      if (Util.dist(e.x, e.y, player.x, player.y) < R + player.radius) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
      e.hitFlash = 0.22;
      e.fr4State = 'recover'; e.fr4Timer = 0.55;
    }
    return;
  }
  if (e.fr4State === 'recover') {
    e.fr4Timer -= dt;
    if (e.fr4Timer <= 0) e.fr4State = 'chase';
  }
};

ENEMY_BEHAVIOR_HANDLERS.fr4Pollenshaman = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.fr4Nodes === undefined) { e.fr4Nodes = []; e.fr4Ang = RNG.random() * Math.PI * 2; e.fr4NodeTimer = t.nodeInterval || 1; }
  e.fr4Ang += dt * 0.6;
  const rad = t.orbitRadius || 120;
  const tx = player.x + Math.cos(e.fr4Ang) * rad, ty = player.y + Math.sin(e.fr4Ang) * rad;
  const v = seekVector(e, tx, ty);
  forestStep(game, e, dt, v.x, v.y, 1);
  e.fr4NodeTimer -= dt;
  if (e.fr4NodeTimer <= 0) {
    e.fr4Nodes.push({ x: e.x, y: e.y });
    e.hitFlash = 0.14;
    e.fr4NodeTimer = t.nodeInterval || 1;
    if (e.fr4Nodes.length >= (t.nodeCount || 3)) {
      for (const nd of e.fr4Nodes) {
        const ang = Math.atan2(player.y - nd.y, player.x - nd.x);
        const ox = e.x, oy = e.y;
        e.x = nd.x; e.y = nd.y;
        forestArc(game, e, ang, 3, 0.6, 165, { color: t.boltColor || '#e0c8f0', radius: 4 });
        e.x = ox; e.y = oy;
      }
      e.fr4Nodes.length = 0;
    }
  }
};

ENEMY_BEHAVIOR_HANDLERS.fr4Beetleclutch = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.fr4Erupted === undefined) { e.fr4Erupted = false; e.fr4Rest = 0; }
  const v = seekVector(e, player.x, player.y);
  if (e.fr4Erupted) {
    forestStep(game, e, dt, -v.x, -v.y, 1.15);
    return;
  }
  forestStep(game, e, dt, v.x, v.y, 0.85);
  if (v.d < (t.eruptRange || 110)) {
    const node = game.currentRoom;
    const count = t.gruBcount || 4;
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2;
      forestSpawn(game, node, 'sprout', e.x + Math.cos(ang) * 26, e.y + Math.sin(ang) * 26);
    }
    e.hitFlash = 0.2;
    e.fr4Erupted = true;
  }
};

ENEMY_BEHAVIOR_HANDLERS.fr4Stumplurker = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.fr4Lurk === undefined) { e.fr4Lurk = true; e.fr4BurstTimer = 0; }
  const d = Util.dist(e.x, e.y, player.x, player.y);
  if (e.fr4Lurk) {
    e.hitFlash = 0;
    if (d < (t.ambushRange || 70)) { e.fr4Lurk = false; e.fr4BurstTimer = 0.9; e.hitFlash = 0.2; }
    return;
  }
  const v = seekVector(e, player.x, player.y);
  forestStep(game, e, dt, v.x, v.y, t.burstSpeed || 2.6);
  e.fr4BurstTimer -= dt;
  if (e.fr4BurstTimer <= 0 || d > (t.ambushRange || 70) * 2.4) { e.fr4Lurk = true; }
};

ENEMY_BEHAVIOR_HANDLERS.fr4Battlebloom = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  forestStep(game, e, dt, -v.x, -v.y, v.d < 220 ? 1 : 0.2);
  const node = game.currentRoom;
  const rad = t.buffRadius || 130;
  const mul = t.buffMul || 1.4;
  for (const ally of node.enemies) {
    if (ally === e || ally.isDead || !ally.type) continue;
    if (Util.dist(e.x, e.y, ally.x, ally.y) <= rad) {
      if (!ally.fr4Bloomed) {
        ally.fr4Bloomed = true;
        ally.fr4BaseSpeed = ally.speed;
        ally.fr4BaseDmg = ally.dmg;
        ally.speed = ally.fr4BaseSpeed * mul;
        ally.dmg = Math.ceil(ally.fr4BaseDmg * mul);
      }
    } else if (ally.fr4Bloomed) {
      ally.speed = ally.fr4BaseSpeed;
      ally.dmg = ally.fr4BaseDmg;
      ally.fr4Bloomed = false;
    }
  }
};

ENEMY_BEHAVIOR_HANDLERS.fr4Thicketguard = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.fr4Home === undefined) { e.fr4Home = { x: e.x, y: e.y }; e.fr4FireTimer = 1; }
  const homeD = Util.dist(e.x, e.y, e.fr4Home.x, e.fr4Home.y);
  const territory = t.territory || 160;
  const playerIn = Util.dist(e.x, e.y, player.x, player.y) < territory;
  if (playerIn) {
    const v = seekVector(e, player.x, player.y);
    forestStep(game, e, dt, v.x, v.y, 0.75);
    e.fr4FireTimer -= dt;
    if (e.fr4FireTimer <= 0) {
      forestArc(game, e, forestAim(e, player), 3, 0.5, 190, { color: t.boltColor || '#a0d090', radius: 4 });
      e.fr4FireTimer = 1.4;
    }
  } else if (homeD > 6) {
    const v = seekVector(e, e.fr4Home.x, e.fr4Home.y);
    forestStep(game, e, dt, v.x, v.y, 1);
  } else {
    e.y += Math.sin(game.runElapsed * 2) * 0.02;
  }
};

ENEMY_BEHAVIOR_HANDLERS.fr4Duskstalker = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.fr4Trail === undefined) { e.fr4Trail = []; e.fr4Sample = 0.1; e.fr4Lunge = 0; }
  e.fr4Sample -= dt;
  if (e.fr4Sample <= 0) {
    e.fr4Trail.push({ x: player.x, y: player.y, t: game.runElapsed });
    e.fr4Sample = 0.1;
    while (e.fr4Trail.length && game.runElapsed - e.fr4Trail[0].t > (t.trailLag || 1.05) + 0.5) e.fr4Trail.shift();
  }
  if (e.fr4Lunge > 0) {
    e.fr4Lunge -= dt;
    forestStep(game, e, dt, e.fr4LungeDir.x, e.fr4LungeDir.y, t.lungeSpeed || 3.1);
    return;
  }
  let target = null;
  for (const pt of e.fr4Trail) { if (game.runElapsed - pt.t >= (t.trailLag || 1.05)) target = pt; }
  if (!target) return;
  const v = seekVector(e, target.x, target.y);
  forestStep(game, e, dt, v.x, v.y, 1.1);
  if (v.d < 30) {
    const ang = forestAim(e, player);
    e.fr4LungeDir = { x: Math.cos(ang), y: Math.sin(ang) };
    e.fr4Lunge = 0.35;
    e.hitFlash = 0.18;
  }
};

ENEMY_BEHAVIOR_HANDLERS.fr4Gourdcannon = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.fr4Sweep === undefined) { e.fr4Sweep = RNG.random() * Math.PI * 2; e.fr4FireTimer = 0.4; }
  e.fr4Sweep += dt * (t.sweepRate || 1.15);
  e.fr4FireTimer -= dt;
  if (e.fr4FireTimer <= 0) {
    forestRing(game, e, 1, 175, { color: t.boltColor || '#f0b060', radius: 4 }, e.fr4Sweep);
    e.hitFlash = 0.14;
    e.fr4FireTimer = 0.5;
  }
};

ENEMY_BEHAVIOR_HANDLERS.fr4Briertrap = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.fr4RingTimer === undefined) { e.fr4RingTimer = 1.2; e.fr4Telegraph = 0; }
  const v = seekVector(e, player.x, player.y);
  forestStep(game, e, dt, v.x, v.y, v.d > 160 ? 1 : 0.15);
  if (e.fr4Telegraph > 0) {
    e.fr4Telegraph -= dt;
    e.hitFlash = (Math.sin(e.fr4Telegraph * 26) > 0) ? 0.18 : 0;
    if (e.fr4Telegraph <= 0) {
      const count = t.ringCount || 10;
      const gap = Math.floor(RNG.random() * count);
      const ox = e.x, oy = e.y;
      e.x = player.x; e.y = player.y;
      for (let i = 0; i < count; i++) {
        if (i === gap) continue;
        fireProjectileAngle(game, e, (i / count) * Math.PI * 2, 95, e.dmg, { color: t.boltColor || '#8ac04a', radius: 4 });
      }
      e.x = ox; e.y = oy;
      e.fr4RingTimer = t.ringCooldown || 3.6;
    }
    return;
  }
  e.fr4RingTimer -= dt;
  if (e.fr4RingTimer <= 0) e.fr4Telegraph = 0.5;
};

ENEMY_BEHAVIOR_HANDLERS.fr4Hedgehowl = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.fr4LastHp === undefined) { e.fr4LastHp = e.hp; e.fr4Recoil = 0; }
  if (e.fr4Recoil > 0) {
    e.fr4Recoil -= dt;
    const v = seekVector(e, player.x, player.y);
    forestStep(game, e, dt, -v.x, -v.y, 1.4);
  } else {
    const v = seekVector(e, player.x, player.y);
    forestStep(game, e, dt, v.x, v.y, 1);
  }
  if (e.hp < e.fr4LastHp) {
    forestRing(game, e, 6, 150, { color: t.boltColor || '#e0c090', radius: 4 }, RNG.random());
    e.fr4Recoil = t.recoilTime || 0.4;
    e.hitFlash = 0.2;
  }
  e.fr4LastHp = e.hp;
};
