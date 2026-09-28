'use strict';

function aiBossSlagbound(game, e, dt){
  const player = game.player;
  if (e.hp < e.prevHp) e.retaliation += e.prevHp - e.hp;
  e.prevHp = e.hp;
  const threshold = (e.hp < e.maxHp * 0.4) ? 2 : 4;
  if (e.retaliation >= threshold) {
    e.retaliation = 0;
    const n = 14, off = RNG.random() * Math.PI * 2;
    for (let i = 0; i < n; i++) fireProjectileAngle(game, e, off + (i / n) * Math.PI * 2, 165, 2, { color:'#9c3ac9', radius:5 });
  }
  chaseSeek(game, e, player.x, player.y, 0.85, dt);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) {
    e.attackTimer = Util.rand(2.8, 3.6);
    fireProjectileAt(game, e, player.x, player.y, 145, 2, { color:'#9c3ac9', radius:8 });
  }
}

function dnbRing(game, e, n, speed, dmg, color, offset, gapIdx, gapWidth){
  for (let i = 0; i < n; i++) {
    if (gapWidth > 0) {
      const off = ((i - gapIdx) % n + n) % n;
      if (off < gapWidth) continue;
    }
    fireProjectileAngle(game, e, offset + (i / n) * Math.PI * 2, speed, dmg, { color: color, radius: 5 });
  }
}

function aiBossPlapper(game, e, dt){
  const node = game.currentRoom, player = game.player;
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = 0.1;
    if (e.telegraph <= 0) {
      const n = 18;
      dnbRing(game, e, n, 150, 2, '#5a4ae0', RNG.random() * Math.PI * 2, Math.floor(RNG.random() * n), 2);
      const R = 92;
      game.explosions.push(new Explosion(e.x, e.y, R));
      if (Util.dist(e.x, e.y, player.x, player.y) < R + player.radius) damagePlayer(game, playerDamageAmount(game, true, e.dmg), e.type.id);
      e.beatTimer = Util.rand(1.0, 1.3);
    }
  } else if (e.burstShots > 0) {
    e.shotTimer -= dt;
    if (e.shotTimer <= 0) {
      e.shotTimer = 0.13;
      fireProjectileAt(game, e, player.x, player.y, 250, 2, { color:'#5a4ae0', radius:5 });
      e.burstShots--;
      if (e.burstShots <= 0) e.beatTimer = Util.rand(1.0, 1.3);
    }
  } else {
    chaseSeek(game, e, player.x, player.y, 0.9, dt);
    e.beatTimer -= dt;
    if (e.beatTimer <= 0) {
      e.barCount++;
      if (e.barCount % 3 === 0) e.telegraph = 0.7;
      else { e.burstShots = 5; e.shotTimer = 0; }
    }
  }
  if (!e.minionsSpawned && e.hp < e.maxHp * 0.6) {
    e.minionsSpawned = true;
    for (let i = 0; i < 3; i++) {
      const ang = RNG.random() * Math.PI * 2;
      const spot = findNearestFloor(node, Math.floor((e.x + Math.cos(ang)*80)/TILE), Math.floor((e.y + Math.sin(ang)*80)/TILE));
      node.enemies.push(new Enemy(ENEMY_TYPES.icecrawler, spot.x, spot.y, game.dungeon.floorNum));
    }
  }
  if (!e.minions2 && e.hp < e.maxHp * 0.25) {
    e.minions2 = true;
    for (let i = 0; i < 2; i++) {
      const ang = RNG.random() * Math.PI * 2;
      const spot = findNearestFloor(node, Math.floor((e.x + Math.cos(ang)*80)/TILE), Math.floor((e.y + Math.sin(ang)*80)/TILE));
      node.enemies.push(new Enemy(ENEMY_TYPES.glacierbeast, spot.x, spot.y, game.dungeon.floorNum));
    }
  }
}

function aiBossClapper(game, e, dt){
  const node = game.currentRoom, player = game.player;
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    if (e.telegraph <= 0) {
      const ang = RNG.random() * Math.PI * 2;
      const spot = findNearestFloor(node, Math.floor((player.x + Math.cos(ang)*95)/TILE), Math.floor((player.y + Math.sin(ang)*95)/TILE));
      e.x = spot.x * TILE + TILE / 2; e.y = spot.y * TILE + TILE / 2;
      e.submerged = false; e.shielded = false;
      dnbRing(game, e, 8, 215, 2, '#e08a3a', Math.atan2(player.y - e.y, player.x - e.x), 0, 0);
      e.clapCount--;
      e.attackTimer = (e.clapCount > 0) ? 0.55 : Util.rand(1.7, 2.3);
    }
  } else {
    chaseSeek(game, e, player.x, player.y, 0.8, dt);
    e.attackTimer -= dt;
    if (e.attackTimer <= 0) {
      if (e.clapCount <= 0) e.clapCount = (e.hp < e.maxHp * 0.5) ? 3 : 2;
      e.submerged = true; e.shielded = true; e.telegraph = 0.45;
    }
  }
  if (!e.minionsSpawned && e.hp < e.maxHp * 0.6) {
    e.minionsSpawned = true;
    for (let i = 0; i < 3; i++) {
      const ang = RNG.random() * Math.PI * 2;
      const spot = findNearestFloor(node, Math.floor((e.x + Math.cos(ang)*80)/TILE), Math.floor((e.y + Math.sin(ang)*80)/TILE));
      node.enemies.push(new Enemy(ENEMY_TYPES.junglestalker, spot.x, spot.y, game.dungeon.floorNum));
    }
  }
  if (!e.minions2 && e.hp < e.maxHp * 0.25) {
    e.minions2 = true;
    for (let i = 0; i < 2; i++) {
      const ang = RNG.random() * Math.PI * 2;
      const spot = findNearestFloor(node, Math.floor((e.x + Math.cos(ang)*80)/TILE), Math.floor((e.y + Math.sin(ang)*80)/TILE));
      node.enemies.push(new Enemy(ENEMY_TYPES.canopybeast, spot.x, spot.y, game.dungeon.floorNum));
    }
  }
}

function aiBossNhm(game, e, dt){
  const node = game.currentRoom, player = game.player;
  if (e.buildTimer > 0) {
    e.buildTimer -= dt;
    e.hitFlash = 0.1;
    const spawned = e.minionsSpawned || 0;
    e.summonTimer -= dt;
    if (e.summonTimer <= 0 && spawned < 8) {
      e.summonTimer = 0.85;
      const ang = RNG.random() * Math.PI * 2;
      const spot = findNearestFloor(node, Math.floor((e.x + Math.cos(ang)*80)/TILE), Math.floor((e.y + Math.sin(ang)*80)/TILE));
      node.enemies.push(new Enemy(ENEMY_TYPES.icecrawler, spot.x, spot.y, game.dungeon.floorNum));
      e.minionsSpawned = spawned + 1;
    }
    if (e.buildTimer <= 0) {
      e.dropShots = 4; e.shotTimer = 0;
      e.dropAngle = Math.atan2(player.y - e.y, player.x - e.x);
    }
  } else if (e.dropShots > 0) {
    e.shotTimer -= dt;
    if (e.shotTimer <= 0) {
      e.shotTimer = 0.18;
      const n = 14, wave = 4 - e.dropShots;
      dnbRing(game, e, n, 175, 2, '#2ec9a0', e.dropAngle, (wave * 3) % n, 3);
      e.dropShots--;
      if (e.dropShots <= 0) e.attackTimer = Util.rand(2.2, 2.8);
    }
  } else {
    chaseSeek(game, e, player.x, player.y, 0.55, dt);
    e.attackTimer -= dt;

    if (e.attackTimer <= 0) { e.buildTimer = 2.0; e.summonTimer = 0.5; }
  }
}

function aiBossVanillaDnb(game, e, dt){
  const player = game.player;
  if (e.shielded) {
    e.regenTimer -= dt;
    e.hitFlash = 0.1;
    chaseSeek(game, e, player.x, player.y, 0.2, dt);
    e.healTimer -= dt;
    if (e.healTimer <= 0) {
      e.healTimer = 0.5;
      e.hp = Math.min(e.maxHp, e.hp + Math.max(1, Math.round(e.maxHp * 0.005)));
    }
    if (e.regenTimer <= 0) { e.shielded = false; e.attackTimer = Util.rand(1.0, 1.6); }
  } else if (e.sweepTimer > 0) {
    e.sweepTimer -= dt;
    e.spinAngle += 1.5 * e.sweepDir * dt;
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) {
      e.fireTimer = 0.1;
      for (let a = 0; a < 3; a++) {
        fireProjectileAngle(game, e, e.spinAngle + a * (Math.PI * 2 / 3), 165, 2, { color:'#f0e0c0', radius:5 });
      }
    }
    if (e.sweepTimer <= 0) e.attackTimer = Util.rand(1.4, 2.0);
  } else {
    chaseSeek(game, e, player.x, player.y, 0.6, dt);
    e.attackTimer -= dt;
    if (e.attackTimer <= 0) {
      if (RNG.random() < 0.35) { e.shielded = true; e.regenTimer = 2.4; e.healTimer = 0.5; }
      else {
        e.sweepTimer = 3.0;
        e.sweepDir = RNG.random() < 0.5 ? -1 : 1;
        e.spinAngle = Math.atan2(player.y - e.y, player.x - e.x);
        e.fireTimer = 0;
      }
    }
  }
}

function aiBossOneTrueDnb(game, e, dt){
  const node = game.currentRoom, player = game.player;
  const frac = e.hp / e.maxHp;
  const want = (frac > 0.78) ? 0 : (frac > 0.56) ? 1 : (frac > 0.34) ? 2 : (frac > 0.15) ? 3 : 4;
  if (want !== e.phaseIndex) {
    e.phaseIndex = want;
    e.phaseShift = 1.0;
    e.burstShots = 0; e.dropShots = 0; e.clapCount = 0;
    e.sweepTimer = 0; e.buildTimer = 0; e.telegraph = 0;
    e.submerged = false; e.shielded = false;
    e.attackTimer = 0.2;
    dnbRing(game, e, 16, 130, 2, '#ffd447', RNG.random() * Math.PI * 2, 0, 0);
  }
  if (e.phaseShift > 0) {
    e.phaseShift -= dt;
    e.hitFlash = 0.1;
    return;
  }

  if (e.phaseIndex === 0) {

    if (e.burstShots > 0) {
      e.shotTimer -= dt;
      if (e.shotTimer <= 0) {
        e.shotTimer = 0.12;
        fireProjectileAt(game, e, player.x, player.y, 260, 2, { color:'#ffd447', radius:5 });
        e.burstShots--;
        if (e.burstShots <= 0) e.attackTimer = Util.rand(1.0, 1.4);
      }
    } else {
      chaseSeek(game, e, player.x, player.y, 0.9, dt);
      e.attackTimer -= dt;
      if (e.attackTimer <= 0) {
        e.barCount++;
        if (e.barCount % 3 === 0) {
          dnbRing(game, e, 18, 155, 2, '#ffd447', RNG.random() * Math.PI * 2, Math.floor(RNG.random() * 18), 2);
          e.attackTimer = Util.rand(1.2, 1.6);
        } else { e.burstShots = 5; e.shotTimer = 0; }
      }
    }
  } else if (e.phaseIndex === 1) {

    if (e.telegraph > 0) {
      e.telegraph -= dt;
      if (e.telegraph <= 0) {
        const ang = RNG.random() * Math.PI * 2;
        const spot = findNearestFloor(node, Math.floor((player.x + Math.cos(ang)*95)/TILE), Math.floor((player.y + Math.sin(ang)*95)/TILE));
        e.x = spot.x * TILE + TILE / 2; e.y = spot.y * TILE + TILE / 2;
        e.submerged = false; e.shielded = false;
        dnbRing(game, e, 8, 215, 2, '#ffd447', Math.atan2(player.y - e.y, player.x - e.x), 0, 0);
        e.clapCount--;
        e.attackTimer = (e.clapCount > 0) ? 0.55 : Util.rand(1.4, 1.9);
      }
    } else {
      chaseSeek(game, e, player.x, player.y, 0.8, dt);
      e.attackTimer -= dt;
      if (e.attackTimer <= 0) {
        if (e.clapCount <= 0) e.clapCount = 2;
        e.submerged = true; e.shielded = true; e.telegraph = 0.45;
      }
    }
  } else if (e.phaseIndex === 2) {

    if (e.buildTimer > 0) {
      e.buildTimer -= dt;
      e.hitFlash = 0.1;
      if (e.buildTimer <= 0) {
        e.dropShots = 3; e.shotTimer = 0;
        e.dropAngle = Math.atan2(player.y - e.y, player.x - e.x);
      }
    } else if (e.dropShots > 0) {
      e.shotTimer -= dt;
      if (e.shotTimer <= 0) {
        e.shotTimer = 0.18;
        const n = 14, wave = 3 - e.dropShots;
        dnbRing(game, e, n, 180, 2, '#ffd447', e.dropAngle, (wave * 3) % n, 3);
        e.dropShots--;
        if (e.dropShots <= 0) e.attackTimer = Util.rand(1.8, 2.4);
      }
    } else {
      chaseSeek(game, e, player.x, player.y, 0.55, dt);
      e.attackTimer -= dt;
      if (e.attackTimer <= 0) e.buildTimer = 1.1;
    }
  } else if (e.phaseIndex === 3) {

    if (e.sweepTimer > 0) {
      e.sweepTimer -= dt;
      e.spinAngle += 1.5 * e.sweepDir * dt;
      e.fireTimer -= dt;
      if (e.fireTimer <= 0) {
        e.fireTimer = 0.11;
        for (let a = 0; a < 3; a++) {
          fireProjectileAngle(game, e, e.spinAngle + a * (Math.PI * 2 / 3), 170, 2, { color:'#ffd447', radius:5 });
        }
      }
      if (e.sweepTimer <= 0) e.attackTimer = Util.rand(1.3, 1.8);
    } else {
      chaseSeek(game, e, player.x, player.y, 0.6, dt);
      e.attackTimer -= dt;
      if (e.attackTimer <= 0) {
        e.sweepTimer = 2.6;
        e.sweepDir = RNG.random() < 0.5 ? -1 : 1;
        e.spinAngle = Math.atan2(player.y - e.y, player.x - e.x);
        e.fireTimer = 0;
      }
    }
  } else {

    e.spinAngle += 1.4 * e.sweepDir * dt;
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) {
      e.fireTimer = 0.12;
      for (let a = 0; a < 3; a++) {
        fireProjectileAngle(game, e, e.spinAngle + a * (Math.PI * 2 / 3), 160, 2, { color:'#ffd447', radius:5 });
      }
    }
    chaseSeek(game, e, player.x, player.y, 0.35, dt);
    if (e.telegraph > 0) {
      e.telegraph -= dt;
      e.hitFlash = 0.1;
      if (e.telegraph <= 0) {
        dnbRing(game, e, 14, 210, 2, '#ffd447', Math.atan2(player.y - e.y, player.x - e.x), 0, 0);
        e.attackTimer = Util.rand(2.2, 2.8);
      }
    } else {
      e.attackTimer -= dt;
      if (e.attackTimer <= 0) e.telegraph = 0.5;
    }
  }

  if (!e.minionsSpawned && e.hp < e.maxHp * 0.56) {
    e.minionsSpawned = true;
    for (let i = 0; i < 3; i++) {
      const ang = RNG.random() * Math.PI * 2;
      const spot = findNearestFloor(node, Math.floor((e.x + Math.cos(ang)*90)/TILE), Math.floor((e.y + Math.sin(ang)*90)/TILE));
      node.enemies.push(new Enemy(ENEMY_TYPES.junglestalker, spot.x, spot.y, game.dungeon.floorNum));
    }
  }
  if (!e.minions2 && e.hp < e.maxHp * 0.2) {
    e.minions2 = true;
    for (let i = 0; i < 2; i++) {
      const ang = RNG.random() * Math.PI * 2;
      const spot = findNearestFloor(node, Math.floor((e.x + Math.cos(ang)*90)/TILE), Math.floor((e.y + Math.sin(ang)*90)/TILE));
      node.enemies.push(new Enemy(ENEMY_TYPES.glacierbeast, spot.x, spot.y, game.dungeon.floorNum));
    }
  }
}
