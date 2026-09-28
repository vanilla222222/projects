'use strict';

function aiLobber(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  const range = t.lobRange || 260;
  const d = Util.dist(e.x, e.y, player.x, player.y);
  if (e.lobTimer > 0) {
    e.lobTimer -= dt;
    if (e.lobTimer <= 0) {
      const R = t.burstRadius || 44;
      game.explosions.push(new Explosion(e.lobX, e.lobY, R));
      if (Util.dist(e.lobX, e.lobY, player.x, player.y) < R + player.radius) {
        damagePlayer(game, playerDamageAmount(game, false, e.dmg), e.type.id);
      }
      e.attackTimer = t.fireCooldown || 2.4;
    }
    return;
  }
  if (d > range * 0.85) chaseSeek(game, e, player.x, player.y, 1, dt);
  else if (d < range * 0.35) {
    const v = seekVector(e, player.x, player.y);
    tryMoveEntity(e, node, node.obstacles, -v.x * e.speed * dt, -v.y * e.speed * dt);
  }
  e.attackTimer -= dt;
  if (e.attackTimer <= 0 && d < range) {
    e.lobX = player.x; e.lobY = player.y;
    e.lobTime = t.lobTime || 1.0;
    e.lobTimer = e.lobTime;
  }
}

function aiWeaver(game, e, dt){
  const player = game.player, t = e.type;
  const amp = t.weaveAmplitude || 0.6, freq = t.weaveFrequency || 3;
  e.weavePhase += dt * freq;
  const v = seekVector(e, player.x, player.y);
  const off = Math.sin(e.weavePhase) * amp * Math.min(v.d, 140);
  const tx = player.x - v.y * off, ty = player.y + v.x * off;
  chaseSeek(game, e, tx, ty, 1, dt);
}

function aiSentry(game, e, dt){
  const player = game.player, t = e.type;
  const pspd = (e.lastPX === null) ? 0
    : Math.hypot(player.x - e.lastPX, player.y - e.lastPY) / Math.max(dt, 0.0001);
  e.lastPX = player.x; e.lastPY = player.y;
  const d = Util.dist(e.x, e.y, player.x, player.y);
  if (pspd < (t.sentryThreshold || 30) && d < (t.fireRange || 420)) {
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) {
      e.fireTimer = t.fireCooldown || 1.5;
      fireSpread(game, e, player.x, player.y, t.boltSpeed || 200, e.dmg,
        { color: t.boltColor || '#8ab0c9', radius: t.boltRadius || 5 });
    }
  } else {
    chaseSeek(game, e, player.x, player.y, 1, dt);
    e.fireTimer = Math.max(e.fireTimer, 0.25);
  }
}

function aiSkirmisher(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  const d = Util.dist(e.x, e.y, player.x, player.y);
  const engageRange = t.engageRange || 260, retreatRange = t.retreatRange || 140;
  if (d > engageRange) {
    chaseSeek(game, e, player.x, player.y, t.dashSpeed || 1.6, dt);
  } else if (d < retreatRange) {

    const v = seekVector(e, player.x, player.y);
    tryMoveEntity(e, node, node.obstacles, -v.x * e.speed * dt, -v.y * e.speed * dt);
  }
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) {
    e.fireTimer = t.fireCooldown || 1.4;
    fireSpread(game, e, player.x, player.y, t.boltSpeed || 260, e.dmg,
      { color: t.boltColor || '#c9895a', radius: t.boltRadius || 5 });
  }
}

function aiWhiplash(game, e, dt){
  const player = game.player, t = e.type;
  const whipRange = t.whipRange || 90;
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 30) > 0) ? 0.12 : 0;
    if (e.telegraph <= 0) {
      if (Util.dist(e.x, e.y, player.x, player.y) < whipRange + player.radius) {
        damagePlayer(game, playerDamageAmount(game, false, e.dmg * (t.whipDamageMult || 1)), e.type.id);
      }
      e.attackTimer = t.whipCooldown || 1.6;
    }
    return;
  }
  if (Util.dist(e.x, e.y, player.x, player.y) < whipRange) {
    e.attackTimer -= dt;
    if (e.attackTimer <= 0) e.telegraph = t.whipTelegraph || 0.5;
  } else {
    chaseSeek(game, e, player.x, player.y, 1, dt);
    e.attackTimer = Math.max(e.attackTimer, 0.2);
  }
}

function aiBossWarlord(game, e, dt){
  const node = game.currentRoom, player = game.player;
  if (e.dashing) {
    tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
    e.dashTimer -= dt;
    if (e.dashTimer <= 0) e.dashing = false;
  } else {
    e.attackTimer -= dt;
    chaseSeek(game, e, player.x, player.y, 1, dt);
    if (e.attackTimer <= 0) {
      e.attackTimer = Util.rand(2.2, 3.2);
      const v = seekVector(e, player.x, player.y);
      e.dashing = true; e.dashTimer = 0.45;
      e.dashVX = v.x * e.speed * 4.4; e.dashVY = v.y * e.speed * 4.4;
    }
  }
  if (!e.minionsSpawned && e.hp < e.maxHp * 0.5) {
    e.minionsSpawned = true;
    for (let i = 0; i < 2; i++) {
      const ang = RNG.random() * Math.PI * 2;
      const spot = findNearestFloor(node, Math.floor((e.x + Math.cos(ang)*60)/TILE), Math.floor((e.y + Math.sin(ang)*60)/TILE));
      node.enemies.push(new Enemy(ENEMY_TYPES.gravegrub, spot.x, spot.y, game.dungeon.floorNum));
    }
  }
}

function aiBossColossus(game, e, dt){
  const player = game.player;
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    if (e.telegraph <= 0) {
      const R = 150;
      game.explosions.push(new Explosion(e.x, e.y, R));
      if (Util.dist(e.x, e.y, player.x, player.y) < R + player.radius) damagePlayer(game, playerDamageAmount(game, true, e.dmg), e.type.id);
    }
  } else {
    chaseSeek(game, e, player.x, player.y, 1, dt);
    e.attackTimer -= dt;
    if (e.attackTimer <= 0) {
      e.attackTimer = Util.rand(3, 4);
      if (RNG.random() < 0.5) e.telegraph = 0.7;
      else fireProjectileAt(game, e, player.x, player.y, 140, 2, { color:'#8a8578', radius:9 });
    }
  }
}

function aiBossHiveMother(game, e, dt){
  const node = game.currentRoom, player = game.player;
  const d = Util.dist(e.x, e.y, player.x, player.y);
  if (d < 220) {
    const v = seekVector(e, player.x, player.y);
    tryMoveEntity(e, node, node.obstacles, -v.x * e.speed * dt, -v.y * e.speed * dt);
  } else {
    chaseSeek(game, e, player.x, player.y, 0.6, dt);
  }
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) {
    e.attackTimer = Util.rand(1.8, 2.6);
    const baseAng = Math.atan2(player.y - e.y, player.x - e.x);
    for (let i = -2; i <= 2; i++) {
      const ang = baseAng + i * 0.18;
      game.projectiles.push(new Projectile(e.x, e.y, Math.cos(ang)*180, Math.sin(ang)*180, 2, 'enemy', { color:'#c9668a', radius:5, fromBoss:true, source: e }));
    }
    if (!e.minionsSpawned && e.hp < e.maxHp * 0.6) {
      e.minionsSpawned = true;
      for (let i = 0; i < 3; i++) {
        const ang = RNG.random() * Math.PI * 2;
        const spot = findNearestFloor(node, Math.floor((e.x + Math.cos(ang)*70)/TILE), Math.floor((e.y + Math.sin(ang)*70)/TILE));
        node.enemies.push(new Enemy(ENEMY_TYPES.sandwisp, spot.x, spot.y, game.dungeon.floorNum));
      }
    }
  }
}

function aiBossBoneSentinel(game, e, dt){
  const node = game.currentRoom, player = game.player;
  if (e.shielded) {
    e.telegraph -= dt;
    chaseSeek(game, e, player.x, player.y, 0.3, dt);
    if (e.telegraph <= 0) { e.shielded = false; e.pattern = 0; e.attackTimer = 0.25; }
  } else if (e.dashing) {
    tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
    e.dashTimer -= dt;
    if (e.dashTimer <= 0) { e.dashing = false; e.pattern++; e.attackTimer = 0.35; }
  } else {
    e.attackTimer -= dt;
    if (e.attackTimer <= 0) {
      if (e.pattern >= 3) { e.shielded = true; e.telegraph = 2.4; e.pattern = 0; }
      else {
        const v = seekVector(e, player.x, player.y);
        e.dashing = true; e.dashTimer = 0.35;
        e.dashVX = v.x * e.speed * 4.6; e.dashVY = v.y * e.speed * 4.6;
      }
    } else {
      chaseSeek(game, e, player.x, player.y, 0.5, dt);
    }
  }
  if (!e.minionsSpawned && e.hp < e.maxHp * 0.5) {
    e.minionsSpawned = true;
    for (let i = 0; i < 2; i++) {
      const ang = RNG.random() * Math.PI * 2;
      const spot = findNearestFloor(node, Math.floor((e.x + Math.cos(ang)*70)/TILE), Math.floor((e.y + Math.sin(ang)*70)/TILE));
      node.enemies.push(new Enemy(ENEMY_TYPES.graveturret, spot.x, spot.y, game.dungeon.floorNum));
    }
  }
}

function aiBossBrambleQueen(game, e, dt){
  const node = game.currentRoom, player = game.player;
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    if (e.telegraph <= 0) {
      const n = 10;
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2;
        game.projectiles.push(new Projectile(e.x, e.y, Math.cos(ang)*150, Math.sin(ang)*150, 2, 'enemy', { color:'#5ba050', radius:5, fromBoss:true, source: e }));
      }
    }
  } else {
    chaseSeek(game, e, player.x, player.y, 0.5, dt);
    e.attackTimer -= dt;
    if (e.attackTimer <= 0) {
      e.attackTimer = Util.rand(3.2, 4);
      if (RNG.random() < 0.5) { e.telegraph = 0.6; }
      else {
        const baseAng = Math.atan2(player.y - e.y, player.x - e.x);
        for (let i = -1; i <= 1; i++) {
          const ang = baseAng + i * 0.22;
          game.projectiles.push(new Projectile(e.x, e.y, Math.cos(ang)*170, Math.sin(ang)*170, 2, 'enemy', { color:'#5ba050', radius:5, fromBoss:true, source: e }));
        }
      }
    }
  }
  if (!e.minionsSpawned && e.hp < e.maxHp * 0.55) {
    e.minionsSpawned = true;
    for (let i = 0; i < 2; i++) {
      const ang = RNG.random() * Math.PI * 2;
      const spot = findNearestFloor(node, Math.floor((e.x + Math.cos(ang)*70)/TILE), Math.floor((e.y + Math.sin(ang)*70)/TILE));
      node.enemies.push(new Enemy(ENEMY_TYPES.sapling, spot.x, spot.y, game.dungeon.floorNum));
    }
  }
}

function aiBossSandWyrm(game, e, dt){
  const node = game.currentRoom, player = game.player;
  if (e.submerged) {
    e.telegraph -= dt;
    if (e.telegraph <= 0) {
      const ang = RNG.random() * Math.PI * 2;
      const spot = findNearestFloor(node, Math.floor((player.x + Math.cos(ang)*60)/TILE), Math.floor((player.y + Math.sin(ang)*60)/TILE));
      e.x = spot.x * TILE + TILE / 2; e.y = spot.y * TILE + TILE / 2;
      e.submerged = false; e.shielded = false;
      const R = 90;
      game.explosions.push(new Explosion(e.x, e.y, R));
      if (Util.dist(e.x, e.y, player.x, player.y) < R + player.radius) damagePlayer(game, playerDamageAmount(game, true, e.dmg), e.type.id);
      e.attackTimer = Util.rand(2.2, 2.8);
    }
  } else {
    chaseSeek(game, e, player.x, player.y, 1, dt);
    e.attackTimer -= dt;
    if (e.attackTimer <= 0) { e.submerged = true; e.shielded = true; e.telegraph = 1.1; }
  }
  if (!e.minionsSpawned && e.hp < e.maxHp * 0.5) {
    e.minionsSpawned = true;
    for (let i = 0; i < 2; i++) {
      const ang = RNG.random() * Math.PI * 2;
      const spot = findNearestFloor(node, Math.floor((e.x + Math.cos(ang)*70)/TILE), Math.floor((e.y + Math.sin(ang)*70)/TILE));
      node.enemies.push(new Enemy(ENEMY_TYPES.duneskitter, spot.x, spot.y, game.dungeon.floorNum));
    }
  }
}

function aiBossPolish(game, e, dt){
  const node = game.currentRoom, player = game.player;
  if (e.dashing) {
    tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
    e.dashTimer -= dt;
    if (e.dashTimer <= 0) e.dashing = false;
  } else {
    e.attackTimer -= dt;
    chaseSeek(game, e, player.x, player.y, 1, dt);
    if (e.attackTimer <= 0) {
      e.attackTimer = Util.rand(1.8, 2.6);
      if (RNG.random() < 0.6) {
        const v = seekVector(e, player.x, player.y);
        e.dashing = true; e.dashTimer = 0.4;
        e.dashVX = v.x * e.speed * 4.8; e.dashVY = v.y * e.speed * 4.8;
      } else {
        const baseAng = Math.atan2(player.y - e.y, player.x - e.x);
        for (let i = -2; i <= 2; i++) {
          const ang = baseAng + i * 0.2;
          game.projectiles.push(new Projectile(e.x, e.y, Math.cos(ang)*180, Math.sin(ang)*180, 2, 'enemy', { color:'#c9a35a', radius:5, fromBoss:true, source: e }));
        }
      }
    }
  }
  if (!e.minionsSpawned && e.hp < e.maxHp * 0.5) {
    e.minionsSpawned = true;
    for (let i = 0; i < 3; i++) {
      const ang = RNG.random() * Math.PI * 2;
      const spot = findNearestFloor(node, Math.floor((e.x + Math.cos(ang)*70)/TILE), Math.floor((e.y + Math.sin(ang)*70)/TILE));
      node.enemies.push(new Enemy(ENEMY_TYPES.duneskitter, spot.x, spot.y, game.dungeon.floorNum));
    }
  }
  if (!e.secondPhase && e.hp < e.maxHp * 0.25) { e.secondPhase = true; e.speed *= 1.3; }
}

function aiBossTyrone(game, e, dt){
  const node = game.currentRoom, player = game.player;
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    if (e.telegraph <= 0) {
      const R = 170;
      game.explosions.push(new Explosion(e.x, e.y, R));
      if (Util.dist(e.x, e.y, player.x, player.y) < R + player.radius) damagePlayer(game, playerDamageAmount(game, true, e.dmg), e.type.id);
    }
  } else if (e.dashing) {
    tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
    e.dashTimer -= dt;
    if (e.dashTimer <= 0) e.dashing = false;
  } else {
    chaseSeek(game, e, player.x, player.y, 1, dt);
    e.attackTimer -= dt;
    if (e.attackTimer <= 0) {
      e.attackTimer = Util.rand(2.6, 3.4);
      const r = RNG.random();
      if (r < 0.4) e.telegraph = 0.8;
      else if (r < 0.7) {
        const v = seekVector(e, player.x, player.y);
        e.dashing = true; e.dashTimer = 0.45; e.dashVX = v.x * e.speed * 4.4; e.dashVY = v.y * e.speed * 4.4;
      }
      else fireProjectileAt(game, e, player.x, player.y, 150, 3, { color:'#9c3a3a', radius:9 });
    }
  }
  if (!e.minionsSpawned && e.hp < e.maxHp * 0.5) {
    e.minionsSpawned = true;
    for (let i = 0; i < 3; i++) {
      const ang = RNG.random() * Math.PI * 2;
      const spot = findNearestFloor(node, Math.floor((e.x + Math.cos(ang)*80)/TILE), Math.floor((e.y + Math.sin(ang)*80)/TILE));
      node.enemies.push(new Enemy(ENEMY_TYPES.sandcharger, spot.x, spot.y, game.dungeon.floorNum));
    }
  }
  if (!e.minions2 && e.hp < e.maxHp * 0.2) {
    e.minions2 = true;
    for (let i = 0; i < 2; i++) {
      const ang = RNG.random() * Math.PI * 2;
      const spot = findNearestFloor(node, Math.floor((e.x + Math.cos(ang)*80)/TILE), Math.floor((e.y + Math.sin(ang)*80)/TILE));
      node.enemies.push(new Enemy(ENEMY_TYPES.skullcharger, spot.x, spot.y, game.dungeon.floorNum));
    }
  }
}

function aiBossPineapple(game, e, dt){
  const node = game.currentRoom, player = game.player;
  const d = Util.dist(e.x, e.y, player.x, player.y);
  if (d < 200) {
    const v = seekVector(e, player.x, player.y);
    tryMoveEntity(e, node, node.obstacles, -v.x * e.speed * dt, -v.y * e.speed * dt);
  } else {
    chaseSeek(game, e, player.x, player.y, 0.6, dt);
  }
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) {
    e.attackTimer = Util.rand(1.6, 2.2);
    const baseAng = Math.atan2(player.y - e.y, player.x - e.x);
    for (let i = -3; i <= 3; i++) {
      const ang = baseAng + i * 0.15;
      game.projectiles.push(new Projectile(e.x, e.y, Math.cos(ang)*190, Math.sin(ang)*190, 2, 'enemy', { color:'#e0d23a', radius:5, fromBoss:true, source: e }));
    }
  }
  if (!e.minionsSpawned && e.hp < e.maxHp * 0.6) {
    e.minionsSpawned = true;
    for (let i = 0; i < 4; i++) {
      const ang = RNG.random() * Math.PI * 2;
      const spot = findNearestFloor(node, Math.floor((e.x + Math.cos(ang)*80)/TILE), Math.floor((e.y + Math.sin(ang)*80)/TILE));
      node.enemies.push(new Enemy(ENEMY_TYPES.sandwisp, spot.x, spot.y, game.dungeon.floorNum));
    }
  }
  if (!e.minions2 && e.hp < e.maxHp * 0.25) {
    e.minions2 = true;
    for (let i = 0; i < 3; i++) {
      const ang = RNG.random() * Math.PI * 2;
      const spot = findNearestFloor(node, Math.floor((e.x + Math.cos(ang)*80)/TILE), Math.floor((e.y + Math.sin(ang)*80)/TILE));
      node.enemies.push(new Enemy(ENEMY_TYPES.firefly, spot.x, spot.y, game.dungeon.floorNum));
    }
  }
}

function aiBossIsrael(game, e, dt){
  const node = game.currentRoom, player = game.player;
  if (e.shielded) {
    e.telegraph -= dt;
    chaseSeek(game, e, player.x, player.y, 0.3, dt);
    if (e.telegraph <= 0) e.shielded = false;
  } else {
    chaseSeek(game, e, player.x, player.y, 0.5, dt);
    e.attackTimer -= dt;
    if (e.attackTimer <= 0) {
      e.attackTimer = Util.rand(2.4, 3.2);
      if (RNG.random() < 0.35) { e.shielded = true; e.telegraph = 2.2; }
      else {
        const n = 12;
        for (let i = 0; i < n; i++) {
          const ang = (i / n) * Math.PI * 2;
          game.projectiles.push(new Projectile(e.x, e.y, Math.cos(ang)*160, Math.sin(ang)*160, 2, 'enemy', { color:'#3a6ec9', radius:5, fromBoss:true, source: e }));
        }
      }
    }
  }
  if (!e.minionsSpawned && e.hp < e.maxHp * 0.5) {
    e.minionsSpawned = true;
    for (let i = 0; i < 3; i++) {
      const ang = RNG.random() * Math.PI * 2;
      const spot = findNearestFloor(node, Math.floor((e.x + Math.cos(ang)*80)/TILE), Math.floor((e.y + Math.sin(ang)*80)/TILE));
      node.enemies.push(new Enemy(ENEMY_TYPES.cryptslinger, spot.x, spot.y, game.dungeon.floorNum));
    }
  }
}

function aiBossAshTyrant(game, e, dt){
  const node = game.currentRoom, player = game.player;
  if (e.dashing) {
    tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
    e.dashTimer -= dt;
    if (e.dashTimer <= 0) e.dashing = false;
  } else {
    e.attackTimer -= dt;
    chaseSeek(game, e, player.x, player.y, 1, dt);
    if (e.attackTimer <= 0) {
      e.attackTimer = Util.rand(2.0, 2.8);
      const v = seekVector(e, player.x, player.y);
      e.dashing = true; e.dashTimer = 0.45;
      e.dashVX = v.x * e.speed * 4.6; e.dashVY = v.y * e.speed * 4.6;
    }
  }
  if (!e.minionsSpawned && e.hp < e.maxHp * 0.5) {
    e.minionsSpawned = true;
    for (let i = 0; i < 2; i++) {
      const ang = RNG.random() * Math.PI * 2;
      const spot = findNearestFloor(node, Math.floor((e.x + Math.cos(ang)*60)/TILE), Math.floor((e.y + Math.sin(ang)*60)/TILE));
      node.enemies.push(new Enemy(ENEMY_TYPES.emberling, spot.x, spot.y, game.dungeon.floorNum));
    }
  }
}

function aiBossCinderColossus(game, e, dt){
  const node = game.currentRoom, player = game.player;
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    if (e.telegraph <= 0) {
      const R = 160;
      game.explosions.push(new Explosion(e.x, e.y, R));
      if (Util.dist(e.x, e.y, player.x, player.y) < R + player.radius) damagePlayer(game, playerDamageAmount(game, true, e.dmg), e.type.id);
    }
  } else {
    chaseSeek(game, e, player.x, player.y, 1, dt);
    e.attackTimer -= dt;
    if (e.attackTimer <= 0) {
      e.attackTimer = Util.rand(3, 4);
      if (RNG.random() < 0.5) e.telegraph = 0.7;
      else fireProjectileAt(game, e, player.x, player.y, 150, 2, { color:'#e0592f', radius:9 });
    }
  }
  if (!e.minionsSpawned && e.hp < e.maxHp * 0.5) {
    e.minionsSpawned = true;
    for (let i = 0; i < 2; i++) {
      const ang = RNG.random() * Math.PI * 2;
      const spot = findNearestFloor(node, Math.floor((e.x + Math.cos(ang)*70)/TILE), Math.floor((e.y + Math.sin(ang)*70)/TILE));
      node.enemies.push(new Enemy(ENEMY_TYPES.cinderhound, spot.x, spot.y, game.dungeon.floorNum));
    }
  }
}

function aiBossMagmaWraith(game, e, dt){
  const node = game.currentRoom, player = game.player;
  if (e.submerged) {
    e.telegraph -= dt;
    if (e.telegraph <= 0) {
      const ang = RNG.random() * Math.PI * 2;
      const spot = findNearestFloor(node, Math.floor((player.x + Math.cos(ang)*60)/TILE), Math.floor((player.y + Math.sin(ang)*60)/TILE));
      e.x = spot.x * TILE + TILE / 2; e.y = spot.y * TILE + TILE / 2;
      e.submerged = false; e.shielded = false;
      const R = 90;
      game.explosions.push(new Explosion(e.x, e.y, R));
      if (Util.dist(e.x, e.y, player.x, player.y) < R + player.radius) damagePlayer(game, playerDamageAmount(game, true, e.dmg), e.type.id);
      e.attackTimer = Util.rand(2.0, 2.6);
    }
  } else {
    chaseSeek(game, e, player.x, player.y, 1, dt);
    e.attackTimer -= dt;
    if (e.attackTimer <= 0) { e.submerged = true; e.shielded = true; e.telegraph = 1.0; }
  }
  if (!e.minionsSpawned && e.hp < e.maxHp * 0.5) {
    e.minionsSpawned = true;
    for (let i = 0; i < 2; i++) {
      const ang = RNG.random() * Math.PI * 2;
      const spot = findNearestFloor(node, Math.floor((e.x + Math.cos(ang)*70)/TILE), Math.floor((e.y + Math.sin(ang)*70)/TILE));
      node.enemies.push(new Enemy(ENEMY_TYPES.magmaleaper, spot.x, spot.y, game.dungeon.floorNum));
    }
  }
}

function aiBossBrimstoneHorror(game, e, dt){
  const node = game.currentRoom, player = game.player;
  const d = Util.dist(e.x, e.y, player.x, player.y);
  if (d < 210) {
    const v = seekVector(e, player.x, player.y);
    tryMoveEntity(e, node, node.obstacles, -v.x * e.speed * dt, -v.y * e.speed * dt);
  } else {
    chaseSeek(game, e, player.x, player.y, 0.6, dt);
  }
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) {
    e.attackTimer = Util.rand(1.8, 2.4);
    const baseAng = Math.atan2(player.y - e.y, player.x - e.x);
    for (let i = -2; i <= 2; i++) {
      const ang = baseAng + i * 0.18;
      game.projectiles.push(new Projectile(e.x, e.y, Math.cos(ang)*180, Math.sin(ang)*180, 2, 'enemy', { color:'#8a3a1a', radius:5, fromBoss:true, source: e }));
    }
    if (!e.minionsSpawned && e.hp < e.maxHp * 0.6) {
      e.minionsSpawned = true;
      for (let i = 0; i < 2; i++) {
        const ang2 = RNG.random() * Math.PI * 2;
        const spot = findNearestFloor(node, Math.floor((e.x + Math.cos(ang2)*70)/TILE), Math.floor((e.y + Math.sin(ang2)*70)/TILE));
        node.enemies.push(new Enemy(ENEMY_TYPES.brimstonebomber, spot.x, spot.y, game.dungeon.floorNum));
      }
    }
  }
}
