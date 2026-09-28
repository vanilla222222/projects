'use strict';

'use strict';

function aiWander(game, e, dt){
  const node = game.currentRoom;
  e.pathTimer -= dt;
  if (e.pathTimer <= 0 || !e.pathDir) { e.pathDir = { x: Util.rand(-1, 1), y: Util.rand(-1, 1) }; e.pathTimer = Util.rand(0.6, 1.4); }
  const len = Math.hypot(e.pathDir.x, e.pathDir.y) || 1;
  tryMoveEntity(e, node, node.obstacles, (e.pathDir.x / len) * e.speed * dt * 0.5, (e.pathDir.y / len) * e.speed * dt * 0.5);
}

function aiFeared(game, e, dt){
  const node = game.currentRoom, player = game.player;
  const v = seekVector(e, player.x, player.y);
  tryMoveEntity(e, node, node.obstacles, -v.x * e.speed * dt, -v.y * e.speed * dt);
}

function aiCharmed(game, e, dt){
  aiWander(game, e, dt);
}

function seekVector(e, tx, ty){
  const dx = tx - e.x, dy = ty - e.y;
  const d = Math.hypot(dx, dy) || 1;
  return { x: dx / d, y: dy / d, d };
}

function makeIsBlockedFn(node, e){
  return (tx, ty) => {
    if (isTileSolidForEntity(node, tx, ty)) return true;
    if (!(e.flies || e.canFly)) {
      for (const ob of node.obstacles) {

        if (ob.destroyed || ob.isWalkable) continue;
        if (ob.tx === tx && ob.ty === ty) return true;
      }
    }
    return false;
  };
}

function hasLineOfSight(node, e, tx, ty){
  const flying = !!(e.flies || e.canFly);
  const dx = tx - e.x, dy = ty - e.y;
  const dist = Math.hypot(dx, dy) || 1;
  const steps = Math.max(1, Math.ceil(dist / (TILE * 0.5)));
  for (let i = 1; i <= steps; i++) {
    const px = e.x + (dx * i) / steps, py = e.y + (dy * i) / steps;
    if (isTileSolidForEntity(node, Math.floor(px / TILE), Math.floor(py / TILE))) return false;
    for (const ob of node.obstacles) {
      if (ob.destroyed || ob.isHazard || ob.isWalkable) continue;
      if (flying && !ob.alwaysBlocks) continue;
      if (Util.dist(px, py, ob.x, ob.y) < ob.radius + e.radius * 0.5) return false;
    }
  }
  return true;
}

function chaseSeek(game, e, tx, ty, speedMul, dt){
  const node = game.currentRoom;
  e.pathTimer -= dt;
  if (e.pathTimer <= 0) {
    e.pathTimer = 0.3 + RNG.random() * 0.2;
    if (hasLineOfSight(node, e, tx, ty)) {
      e.navPath = null;
    } else {
      const isBlocked = makeIsBlockedFn(node, e);
      e.navPath = bfsPath(node.tileW, node.tileH, isBlocked,
        Math.floor(e.x / TILE), Math.floor(e.y / TILE), Math.floor(tx / TILE), Math.floor(ty / TILE));
    }
  }
  if (e.navPath && e.navPath.length) {
    const wp = e.navPath[0];
    if (Util.dist(e.x, e.y, wp.x * TILE + TILE / 2, wp.y * TILE + TILE / 2) < TILE * 0.45) e.navPath.shift();
  }
  const target = (e.navPath && e.navPath.length) ? e.navPath[0] : null;
  const v = target ? seekVector(e, target.x * TILE + TILE / 2, target.y * TILE + TILE / 2) : seekVector(e, tx, ty);

  const player = game.player;
  const auraMult = (player.passives.calmingincense && Util.dist(e.x, e.y, player.x, player.y) < 150) ? 0.85 : 1;
  return tryMoveEntity(e, node, node.obstacles, v.x * e.speed * dt * speedMul * auraMult, v.y * e.speed * dt * speedMul * auraMult);
}

function aiChase(game, e, dt){
  const player = game.player;
  chaseSeek(game, e, player.x, player.y, 1, dt);
}

function fireProjectileAt(game, shooter, tx, ty, speed, damage, opts){
  const ang = Math.atan2(ty - shooter.y, tx - shooter.x);
  fireProjectileAngle(game, shooter, ang, speed, damage, opts);
}

function fireProjectileAngle(game, shooter, ang, speed, damage, opts){
  game.projectiles.push(new Projectile(shooter.x, shooter.y, Math.cos(ang) * speed, Math.sin(ang) * speed, damage, 'enemy',
    Object.assign({ fromBoss: !!shooter.isBoss, source: shooter }, opts)));
}

const DEFAULT_SPREAD_PER_BOLT = 0.18;

function fireSpread(game, shooter, tx, ty, speed, damage, opts){
  const t = shooter.type || {};
  const n = Math.max(1, Math.round(t.shotCount || 1));
  const aim = Math.atan2(ty - shooter.y, tx - shooter.x);
  if (n === 1) { fireProjectileAngle(game, shooter, aim, speed, damage, opts); return; }
  const spread = (t.spreadAngle > 0) ? t.spreadAngle : DEFAULT_SPREAD_PER_BOLT * (n - 1);
  const step = spread / (n - 1);
  for (let i = 0; i < n; i++) fireProjectileAngle(game, shooter, aim - spread / 2 + step * i, speed, damage, opts);
}

function aiRanged(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  const d = Util.dist(e.x, e.y, player.x, player.y);
  const keep = t.keepDistance || 160;
  if (d < keep - 20) {

    const mx = e.x - player.x, my = e.y - player.y;
    const len = Math.hypot(mx, my) || 1;
    tryMoveEntity(e, node, node.obstacles, (mx / len) * e.speed * dt, (my / len) * e.speed * dt);
  } else if (d > keep + 20) {
    chaseSeek(game, e, player.x, player.y, 1, dt);
  }
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && d < (t.fireRange || 420)) {
    e.fireTimer = t.fireCooldown || 1.5;
    fireSpread(game, e, player.x, player.y, t.boltSpeed || 200, e.dmg,
      { color: t.boltColor || '#d9895a', radius: t.boltRadius || 5 });
  }
}

function aiFlyer(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  e.pathTimer -= dt;
  if (e.pathTimer <= 0 || !e.pathDir) { e.pathDir = { x: Util.rand(-1,1), y: Util.rand(-1,1) }; e.pathTimer = Util.rand(0.5, 1.2); }
  const v = seekVector(e, player.x, player.y);
  const mx = v.x * 0.6 + e.pathDir.x * 0.4, my = v.y * 0.6 + e.pathDir.y * 0.4;
  const len = Math.hypot(mx, my) || 1;
  tryMoveEntity(e, node, node.obstacles, (mx/len) * e.speed * dt, (my/len) * e.speed * dt);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && v.d < (t.fireRange || 380)) {
    e.fireTimer = t.fireCooldown || 1.5;
    fireSpread(game, e, player.x, player.y, t.boltSpeed || 200, e.dmg,
      { color: t.boltColor || '#e0b35a', radius: t.boltRadius || 4 });
  }
}

function aiBomber(game, e, dt){
  const player = game.player;
  if (!e.arming) {
    chaseSeek(game, e, player.x, player.y, 1, dt);
    if (Util.dist(e.x, e.y, player.x, player.y) < 34) { e.arming = true; e.fuseTimer = e.type.fuseTime || 0.9; }
  } else {
    e.fuseTimer -= dt;
    e.hitFlash = (Math.sin(e.fuseTimer * 20) > 0) ? 0.1 : 0;
    if (e.fuseTimer <= 0) {
      e.isDead = true;
      const R = e.type.blastRadius || 72;
      game.explosions.push(new Explosion(e.x, e.y, R));
      if (Util.dist(e.x, e.y, player.x, player.y) < R + player.radius) damagePlayer(game, playerDamageAmount(game, false, e.dmg), e.type.id);
      handleEnemyDeath(game, e);
    }
  }
}

function aiCharger(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.dashing) {
    tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
    e.dashTimer -= dt;
    if (e.dashTimer <= 0) e.dashing = false;
  } else if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 30) > 0) ? 0.12 : 0;
    if (e.telegraph <= 0) {
      const v = seekVector(e, player.x, player.y);
      const cs = t.chargeSpeed || 6;
      e.dashing = true; e.dashTimer = t.dashDuration || 0.4;
      e.dashVX = v.x * e.speed * cs; e.dashVY = v.y * e.speed * cs;
    }
  } else {
    chaseSeek(game, e, player.x, player.y, 0.7, dt);
    e.attackTimer -= dt;
    if (e.attackTimer <= 0 && Util.dist(e.x, e.y, player.x, player.y) < 260) {
      e.attackTimer = t.chargeCooldown || 2.2;
      e.telegraph = t.telegraphTime || 0.5;
    }
  }
}

function aiTurret(game, e, dt){
  const player = game.player, t = e.type;
  const d = Util.dist(e.x, e.y, player.x, player.y);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && d < (t.fireRange || 420)) {
    e.fireTimer = t.fireCooldown || 1.5;
    fireSpread(game, e, player.x, player.y, t.boltSpeed || 200, e.dmg,
      { color: t.boltColor || '#c9a25a', radius: t.boltRadius || 5 });
  }
}

function aiLeaper(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.dashing) {
    tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
    e.dashTimer -= dt;
    if (e.dashTimer <= 0) e.dashing = false;
  } else if (e.telegraph > 0) {
    e.telegraph -= dt;
    if (e.telegraph <= 0) {
      const v = seekVector(e, player.x, player.y);
      const ls = t.leapSpeed || 5;
      e.dashing = true; e.dashTimer = t.dashDuration || 0.3;
      e.dashVX = v.x * e.speed * ls; e.dashVY = v.y * e.speed * ls;
    }
  } else {
    e.attackTimer -= dt;
    if (e.attackTimer <= 0) {
      e.attackTimer = t.leapCooldown || 1.5;
      e.telegraph = t.telegraphTime || 0.5;
    } else {
      chaseSeek(game, e, player.x, player.y, 0.3, dt);
    }
  }
}

function aiOrbiter(game, e, dt){
  const player = game.player, t = e.type;
  const R = t.orbitRadius || 120;
  const bearing = Math.atan2(e.y - player.y, e.x - player.x);

  const ang = bearing + (t.orbitSpeed || 1.2) * e.orbitDir * 0.35;
  const tx = player.x + Math.cos(ang) * R, ty = player.y + Math.sin(ang) * R;
  if (Util.dist(e.x, e.y, tx, ty) > 6) chaseSeek(game, e, tx, ty, 1, dt);
  const d = Util.dist(e.x, e.y, player.x, player.y);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && d < (t.fireRange || 400)) {
    e.fireTimer = t.fireCooldown || 1.5;
    fireSpread(game, e, player.x, player.y, t.boltSpeed || 200, e.dmg,
      { color: t.boltColor || '#c98a5a', radius: t.boltRadius || 5 });
  }
}

function aiBurrower(game, e, dt){
  const player = game.player, t = e.type;
  e.burrowTimer -= dt;
  if (e.submerged) {
    chaseSeek(game, e, player.x, player.y, 1.5, dt);
    const adjacent = Util.dist(e.x, e.y, player.x, player.y) < e.radius + player.radius + 8;
    if (e.burrowTimer <= 0 || adjacent) {

      e.submerged = false; e.shielded = false;
      e.hitFlash = 0.12;
      e.burrowTimer = t.burrowCooldown || 3;
    }
  } else {
    chaseSeek(game, e, player.x, player.y, 1, dt);
    if (e.burrowTimer <= 0) {
      e.submerged = true; e.shielded = true;
      e.burrowTimer = t.burrowTime || 1.5;
      e.navPath = null; e.pathTimer = 0;
    }
  }
}

function aiSummoner(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  const keep = t.keepDistance || 190;
  const d = Util.dist(e.x, e.y, player.x, player.y);
  if (d < keep) {
    const v = seekVector(e, player.x, player.y);
    tryMoveEntity(e, node, node.obstacles, -v.x * e.speed * dt, -v.y * e.speed * dt);
  } else if (d > keep + 60) {
    chaseSeek(game, e, player.x, player.y, 0.7, dt);
  }
  e.summonTimer -= dt;
  const cap = t.maxSummons || 6;
  if (e.summonTimer > 0 || e.minionsSpawned >= cap) return;
  e.summonTimer = t.summonCooldown || 6;
  const def = ENEMY_TYPES[t.summonId || 'swarmerdnb'];
  if (!def) return;
  const n = Math.min(t.summonCount || 2, cap - e.minionsSpawned);
  for (let i = 0; i < n; i++) {
    const ang = RNG.random() * Math.PI * 2;
    const spot = findNearestFloor(node, Math.floor((e.x + Math.cos(ang) * 55) / TILE), Math.floor((e.y + Math.sin(ang) * 55) / TILE));
    node.enemies.push(new Enemy(def, spot.x, spot.y, game.dungeon.floorNum));
    e.minionsSpawned++;
  }
}

function aiHealer(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 200) tryMoveEntity(e, node, node.obstacles, -v.x * e.speed * dt, -v.y * e.speed * dt);
  else aiWander(game, e, dt);
  e.healTimer -= dt;
  if (e.healTimer > 0) return;
  const R = t.healRadius || 140, amt = t.healAmount || 2;
  let healed = false;
  for (const o of node.enemies) {
    if (o === e || o.isDead || o.isBoss || o.hp >= o.maxHp) continue;
    if (Util.dist(e.x, e.y, o.x, o.y) > R) continue;
    o.hp = Math.min(o.maxHp, o.hp + amt);
    game.floatTexts.push(new FloatText(o.x, o.y - o.radius - 6, '+' + amt, Theme.floatText.heal));
    healed = true;
  }
  if (healed) e.healTimer = t.healCooldown || 3;
}

function aiSniper(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  const range = t.fireRange || 520;
  const d = Util.dist(e.x, e.y, player.x, player.y);
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 30) > 0) ? 0.12 : 0;
    if (e.telegraph <= 0) {
      fireSpread(game, e, player.x, player.y, t.boltSpeed || 420, e.dmg,
        { color: t.boltColor || '#e0cf9a', radius: t.boltRadius || 4 });
      e.fireTimer = t.fireCooldown || 2.6;
    }
    return;
  }
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && d < range && hasLineOfSight(node, e, player.x, player.y)) {
    e.telegraph = t.telegraphTime || 1.2;
  } else if (d < range * 0.35) {
    const v = seekVector(e, player.x, player.y);
    tryMoveEntity(e, node, node.obstacles, -v.x * e.speed * dt, -v.y * e.speed * dt);
  } else if (d > range * 0.9) {
    chaseSeek(game, e, player.x, player.y, 1, dt);
  }
}

function aiSwarm(game, e, dt){
  const node = game.currentRoom, player = game.player;
  const w = Util.clamp(e.type.driftAmount || 0.5, 0, 0.9);
  e.pathTimer -= dt;
  if (e.pathTimer <= 0 || !e.pathDir) {
    e.pathDir = { x: Util.rand(-1, 1), y: Util.rand(-1, 1) };
    e.pathTimer = Util.rand(0.25, 0.6);
  }
  const v = seekVector(e, player.x, player.y);
  const mx = v.x * (1 - w) + e.pathDir.x * w, my = v.y * (1 - w) + e.pathDir.y * w;
  const len = Math.hypot(mx, my) || 1;
  tryMoveEntity(e, node, node.obstacles, (mx / len) * e.speed * dt, (my / len) * e.speed * dt);
}

function aiAmbusher(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.dashing) {
    tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
    e.dashTimer -= dt;
    if (e.dashTimer <= 0) { e.dashing = false; e.attackTimer = t.chargeCooldown || 2.2; }
    return;
  }
  if (!e.triggered) {
    if (Util.dist(e.x, e.y, player.x, player.y) < (t.triggerRange || 110)) {
      e.triggered = true;
      e.telegraph = t.telegraphTime || 0.3;
    }
    return;
  }
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 30) > 0) ? 0.12 : 0;
    if (e.telegraph <= 0) {
      const v = seekVector(e, player.x, player.y);
      const cs = t.chargeSpeed || 6;
      e.dashing = true; e.dashTimer = t.dashDuration || 0.5;
      e.dashVX = v.x * e.speed * cs; e.dashVY = v.y * e.speed * cs;
    }
    return;
  }
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) e.telegraph = t.telegraphTime || 0.3;
  else chaseSeek(game, e, player.x, player.y, 0.6, dt);
}

function aiTeleporter(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  e.blinkTimer -= dt;
  if (e.blinkTimer <= 0) {
    e.blinkTimer = t.blinkCooldown || 3.5;
    const range = Math.max(70, t.blinkRange || 200);
    const ang = RNG.random() * Math.PI * 2;
    const rad = 60 + RNG.random() * (range - 60);
    const spot = findNearestFloor(node, Math.floor((player.x + Math.cos(ang) * rad) / TILE), Math.floor((player.y + Math.sin(ang) * rad) / TILE));
    e.x = spot.x * TILE + TILE / 2; e.y = spot.y * TILE + TILE / 2;
    e.navPath = null; e.pathTimer = 0;
    e.hitFlash = 0.12;
    e.fireTimer = 0.3;
  }
  e.fireTimer -= dt;
  const d = Util.dist(e.x, e.y, player.x, player.y);
  if (e.fireTimer <= 0 && d < (t.fireRange || 420)) {
    e.fireTimer = t.fireCooldown || 1.5;
    fireSpread(game, e, player.x, player.y, t.boltSpeed || 200, e.dmg,
      { color: t.boltColor || '#a88ad9', radius: t.boltRadius || 5 });
  }
}

function aiShielder(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  const keep = t.keepDistance || 200;
  const d = Util.dist(e.x, e.y, player.x, player.y);
  if (d < keep) {
    const v = seekVector(e, player.x, player.y);
    tryMoveEntity(e, node, node.obstacles, -v.x * e.speed * dt, -v.y * e.speed * dt);
  } else if (d > keep + 70) {
    chaseSeek(game, e, player.x, player.y, 0.7, dt);
  }
  e.attackTimer -= dt;
  if (e.attackTimer > 0) return;
  const R = t.shieldRadius || 130;
  let granted = false;
  for (const o of node.enemies) {

    if (o === e || o.isDead || o.isBoss || o.shielded || o.submerged) continue;
    if (o.behavior === 'shielded') continue;
    if (Util.dist(e.x, e.y, o.x, o.y) > R) continue;
    o.shielded = true; o.grantedShield = true; o.shieldTimer = t.shieldGrantTime || 2.5;
    granted = true;
  }
  if (granted) e.attackTimer = t.shieldCooldown || 5;
}

function aiRootgrower(game, e, dt){
  const player = game.player, t = e.type;
  if (e.rootStrike > 0) {

    e.rootStrike -= dt;
    e.lobTimer = e.rootStrike;
    if (e.rootStrike <= 0) {
      e.lobTimer = 0;
      const R = t.burstRadius || 34;

      game.explosions.push(new Explosion(e.lobX, e.lobY, R));
      if (Util.dist(e.lobX, e.lobY, player.x, player.y) < R + player.radius) {
        damagePlayer(game, playerDamageAmount(game, false, e.dmg), e.type.id);
      }
      e.submerged = true; e.shielded = true;
      e.rootTimer = t.rootCycle || 2.4;
      e.navPath = null; e.pathTimer = 0;
    }
    return;
  }
  e.rootTimer -= dt;
  chaseSeek(game, e, player.x, player.y, e.submerged ? 1.5 : 1, dt);
  if (e.rootTimer <= 0) {
    e.submerged = false; e.shielded = false;
    e.hitFlash = 0.12;
    e.rootStrike = t.rootTelegraph || 0.5;

    e.lobX = player.x; e.lobY = player.y;
    e.lobTime = e.rootStrike; e.lobTimer = e.rootStrike;
  }
}

function aiTreeburner(game, e, dt){
  const player = game.player, t = e.type;
  if (e.burnFlash > 0) e.burnFlash -= dt;
  chaseSeek(game, e, player.x, player.y, 1, dt);
  if (e.burnPulse >= 0) {
    e.burnPulse -= dt;
    if (e.burnPulse <= 0) {
      e.burnPulse = -1;
      treeburnerPulse(game, e, t.burstRadius2 || 55);
      e.burnTimer = t.burnCooldown || 3;
    }
    return;
  }
  e.burnTimer -= dt;
  if (e.burnTimer <= 0) {
    treeburnerPulse(game, e, t.burstRadius || 30);
    e.burnPulse = t.burnGap || 0.25;
  }
}

function treeburnerPulse(game, e, R){
  const player = game.player;
  game.explosions.push(new Explosion(e.x, e.y, R));
  e.burnFlash = 0.18;
  if (Util.dist(e.x, e.y, player.x, player.y) < R + player.radius) {
    damagePlayer(game, playerDamageAmount(game, false, e.dmg), e.type.id);
  }
}

function aiOilrig(game, e, dt){
  const node = game.currentRoom, player = game.player;
  const t = e.type;
  const w = Util.clamp(t.driftAmount || 0.75, 0, 0.9);
  e.pathTimer -= dt;
  if (e.pathTimer <= 0 || !e.pathDir) {
    e.pathDir = { x: Util.rand(-1, 1), y: Util.rand(-1, 1) };
    e.pathTimer = Util.rand(0.25, 0.6);
  }
  const v = seekVector(e, player.x, player.y);
  const mx = v.x * (1 - w) + e.pathDir.x * w, my = v.y * (1 - w) + e.pathDir.y * w;
  const len = Math.hypot(mx, my) || 1;
  const ox = e.x, oy = e.y;
  tryMoveEntity(e, node, node.obstacles, (mx / len) * e.speed * dt, (my / len) * e.speed * dt);
  e.tarTimer -= dt;
  if (e.tarTimer <= 0) {
    e.tarTimer = t.tarInterval || 0.4;

    if (Math.abs(e.x - ox) + Math.abs(e.y - oy) > 0.5) {
      game.creep.push(new Creep(e.x, e.y, t.tarRadius || 16, t.tarLife || 5, 'tar'));
    }
  }
}
