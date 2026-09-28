'use strict';

'use strict';

function normalizeAngle(a){ while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }

const CONTACT_DMG_DEFAULT = 1;
const CURRENT_PUSH_SPEED = 90;
function playerDamageAmount(game, isBoss, dmgHalves){
  let halves = dmgHalves > 0 ? dmgHalves : CONTACT_DMG_DEFAULT;
  if (game.dungeon.floorNum >= 6) halves += 1;
  let amount = halves * 0.5;

  if (isBoss) amount *= game.player.bossDamageTakenMult;

  amount *= game.player.damageTakenMult || 1;
  amount *= playerMechanicDamageTakenMult(game.player);

  return Math.min(4, Math.max(0.5, Math.round(amount * 2) / 2));
}

function damagePlayer(game, amount, source){
  const player = game.player;
  const invulnBefore = player.invulnTimer;
  player.takeDamage(amount, source);
  const hitLanded = player.invulnTimer > invulnBefore;

  if (hitLanded && 'vibrate' in navigator) {
    try { navigator.vibrate(45); } catch (e) {  }
  }
  if (hitLanded && player.stubbornGround) gainGritStack(game);
  if (hitLanded && player.emberMolt) gainMoltStack(game);
  if (hitLanded && player.scrappySurge && player.scrappySurgeCooldown <= 0 && player.redCurrent <= SCRAPPY_SURGE_HP_THRESHOLD) triggerScrappySurge(game);
  if (hitLanded && player.spiteSwarm && player.spiteSwarmCooldown <= 0) releaseSpiteSwarm(game);
  if (hitLanded && player.passives.emberheart && Util.chance(0.10 * player.passives.emberheart)) {
    for (const e of game.currentRoom.enemies) {
      if (e.isDead || e.isBoss) continue;
      if (Util.dist(e.x, e.y, player.x, player.y) < 100) e.stunTimer = Math.max(e.stunTimer, 2);
    }
    Sound.play('statusStun');
  }
}

function isTileSolidForEntity(node, tx, ty){
  if (!Number.isFinite(tx) || !Number.isFinite(ty)) return true;
  if (tx < 0 || ty < 0 || tx >= node.tileW || ty >= node.tileH) return true;
  const t = node.tiles[ty][tx];
  if (t === T_VOID || t === T_WALL || t === T_SECRET) return true;
  if (t === T_DOOR) return !node.doorsOpen;
  return false;
}

function findNearestFloor(node, tx, ty){
  if (!Number.isFinite(tx) || !Number.isFinite(ty)) { tx = Math.floor(node.tileW / 2); ty = Math.floor(node.tileH / 2); }
  if (node.tiles[ty] && node.tiles[ty][tx] === T_FLOOR) return { x: tx, y: ty };
  for (let rad = 1; rad < 24; rad++) {
    for (let dy = -rad; dy <= rad; dy++) {
      for (let dx = -rad; dx <= rad; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== rad) continue;
        const nx = tx + dx, ny = ty + dy;
        if (ny < 0 || ny >= node.tileH || nx < 0 || nx >= node.tileW) continue;
        if (node.tiles[ny][nx] === T_FLOOR) return { x: nx, y: ny };
      }
    }
  }
  return { x: tx, y: ty };
}

function tileHasObstacle(node, tx, ty){
  for (const ob of node.obstacles) {

    if (ob.destroyed || ob.isWalkable) continue;
    if (ob.tx === tx && ob.ty === ty) return true;
  }
  return false;
}

function findClearFloorSpot(node, tx, ty){
  if (node.tiles[ty] && node.tiles[ty][tx] === T_FLOOR && !tileHasObstacle(node, tx, ty)) return { x: tx, y: ty };
  for (let rad = 1; rad < 24; rad++) {
    for (let dy = -rad; dy <= rad; dy++) {
      for (let dx = -rad; dx <= rad; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== rad) continue;
        const nx = tx + dx, ny = ty + dy;
        if (ny < 0 || ny >= node.tileH || nx < 0 || nx >= node.tileW) continue;
        if (node.tiles[ny][nx] === T_FLOOR && !tileHasObstacle(node, nx, ny)) return { x: nx, y: ny };
      }
    }
  }
  return findNearestFloor(node, tx, ty);
}

function collidesAt(entity, x, y, node, obstacles){
  const r = entity.radius;
  const flying = !!(entity.canFly || entity.flies || entity.groundless);
  const pts = [[0,0],[r*0.9,0],[-r*0.9,0],[0,r*0.9],[0,-r*0.9]];
  for (const [ox, oy] of pts) {
    const tx = Math.floor((x + ox) / TILE), ty = Math.floor((y + oy) / TILE);
    if (isTileSolidForEntity(node, tx, ty)) return true;
  }
  for (const ob of obstacles) {

    if (ob.destroyed || ob.isWalkable || (ob.isHazard && !ob.solid)) continue;
    if (flying && !ob.alwaysBlocks) continue;
    if (Util.circleIntersect(x, y, r, ob.x, ob.y, ob.radius - 2)) return true;
  }
  return false;
}

function tryPushObstacles(node, player, mx, my){
  if (mx === 0 && my === 0) return;
  for (const ob of node.obstacles) {
    if (ob.destroyed || !ob.pushable) continue;
    if (!Util.circleIntersect(player.x + mx, player.y + my, player.radius, ob.x, ob.y, ob.radius - 2)) continue;
    const nx = ob.x + mx, ny = ob.y + my;
    const tx = Math.floor(nx / TILE), ty = Math.floor(ny / TILE);
    if (isTileSolidForEntity(node, tx, ty)) continue;
    let blocked = false;
    for (const other of node.obstacles) {
      if (other === ob || other.destroyed || other.isPit || other.isWalkable) continue;
      if (Util.circleIntersect(nx, ny, ob.radius - 2, other.x, other.y, other.radius - 2)) { blocked = true; break; }
    }
    if (blocked) continue;
    ob.x = nx; ob.y = ny; ob.tx = tx; ob.ty = ty;
  }
}

function tryMoveEntity(entity, node, obstacles, mx, my){
  const startX = entity.x, startY = entity.y;
  const nx = entity.x + mx;
  if (!collidesAt(entity, nx, entity.y, node, obstacles)) entity.x = nx;
  const ny = entity.y + my;
  if (!collidesAt(entity, entity.x, ny, node, obstacles)) entity.y = ny;
  return { movedX: Math.abs(entity.x - startX) > 0.01, movedY: Math.abs(entity.y - startY) > 0.01 };
}

function clampToRoom(node, x, y){
  const tx = Util.clamp(Math.floor(x / TILE), 1, node.tileW - 2);
  const ty = Util.clamp(Math.floor(y / TILE), 1, node.tileH - 2);
  const f = findNearestFloor(node, tx, ty);
  return { x: f.x * TILE + TILE / 2, y: f.y * TILE + TILE / 2 };
}

function updatePlayer(game, input, dt){
  const player = game.player, node = game.currentRoom;
  if (player.isDead) { player.fireZone = null; return; }
  if (player.attackTimer > 0) player.attackTimer -= dt;
  if (player.invulnTimer > 0) player.invulnTimer -= dt;
  if (player.invincibleTimer > 0) player.invincibleTimer -= dt;
  if (player.speedBoostTimer > 0) player.speedBoostTimer -= dt;
  if (player.dmgFlashTimer > 0) player.dmgFlashTimer -= dt;
  if (player.freezeTimer > 0) player.freezeTimer -= dt;

  tickOrbitBlades(game, dt);
  tickDelayedActions(player, dt);

  let mx = 0, my = 0;
  if (input.left) mx -= 1;
  if (input.right) mx += 1;
  if (input.up) my -= 1;
  if (input.down) my += 1;
  if (mx !== 0 || my !== 0) {
    const len = Math.hypot(mx, my);
    mx /= len; my /= len;
    if (!input.mouseActive) player.facing = { x: mx, y: my };
  }
  if (input.mouseActive) {

    const worldMouseX = input.mouseX + game.camX, worldMouseY = input.mouseY + game.camY;
    const ang = Math.atan2(worldMouseY - player.y, worldMouseX - player.x);
    player.facing = { x: Math.cos(ang), y: Math.sin(ang) };
  }

  if (player.greenFireAttack) updateGreenFireAttack(game, input, dt);

  if (player.innateFireRing || player.innateStarRing || player.innateBlizzardRing) updateFireRingAttack(game, dt);

  updateChangelingSummons(game, dt);

  updateTurretBuild(game, dt, input);
  updatePlayerTurrets(game, dt);

  updateArcadeMachines(game, dt);

  updatePocketCharge(game, dt);

  const onMud = node.obstacles.some(ob => !ob.destroyed && ob.kind === 'mud' && Util.circleIntersect(player.x, player.y, player.radius, ob.x, ob.y, ob.radius));

  const onTar = game.creep.some(c => (c.kind === 'tar' || c.kind === 'quicksand') && c.source !== 'player' && Util.circleIntersect(player.x, player.y, player.radius, c.x, c.y, c.radius));

  const miredInOwnFire = player.greenFireAttack && !!player.fireZone;
  const spd = player.speed * Math.max(player.speedBoostTimer > 0 ? 1.5 : 1, player.starSpeedMult) * ((onMud || onTar) ? 0.5 : 1) * (miredInOwnFire ? (player.fireZoneRootMult != null ? player.fireZoneRootMult : 0.25) : 1);

  player.moving = (mx !== 0 || my !== 0) && player.freezeTimer <= 0;
  if (player.slipstreamSurge) {
    if (player.moving) player.slipstreamTimer = (player.slipstreamTimer || 0) + dt;
    else player.slipstreamTimer = 0;
    player.slipstreamReady = player.slipstreamTimer >= SLIPSTREAM_CHARGE_TIME;
  }
  if (player.echoHunt) {
    player.echoTimer = (player.echoTimer || 0) + dt;
    if (player.echoTimer >= ECHO_HUNT_INTERVAL) {
      player.echoTimer = 0;
      releaseEchoPulse(game);
    }
  }
  if (player.tidewatch) {
    player.tideTimer = (player.tideTimer || 0) + dt;
    if (player.tideTimer >= TIDEWATCH_INTERVAL) {
      player.tideTimer = 0;
      releaseTideSurge(game);
    }
  }
  if (player.overcharge && player.overchargeTimer > 0) {
    player.overchargeTimer = Math.max(0, player.overchargeTimer - dt);
    player.attackTimer = Math.max(0, player.attackTimer - dt * OVERCHARGE_HASTE);
  }
  if (player.nirikNature) {
    if (player.nirikBurning) {
      player.nirikHeat = Math.max(0, player.nirikHeat - dt * NIRIK_BURN_DECAY);
      if (player.nirikHeat <= 0) {
        player.nirikBurning = false;
        Sound.play('statusFreeze');
        game.floatTexts.push(new FloatText(player.x, player.y - 26, 'CALM', '#9fd8ff', true));
      }
    } else {
      player.nirikHeat = Math.max(0, player.nirikHeat - dt * NIRIK_CALM_DECAY);
      player.attackTimer = Math.max(0, player.attackTimer - dt * NIRIK_CALM_HASTE);
    }
  }
  if (player.deepChill) {
    player.deepChillTimer = (player.deepChillTimer || 0) + dt;
    if (player.deepChillTimer >= DEEP_CHILL_INTERVAL) {
      player.deepChillTimer = 0;
      spreadDeepChill(game);
    }
  }
  if (player.riptideLure) {
    player.riptideTimer = (player.riptideTimer || 0) + dt;
    if (player.riptideTimer >= RIPTIDE_INTERVAL) {
      player.riptideTimer = 0;
      releaseRiptideLure(game);
    }
    applyRiptidePull(game, dt);
  }
  if (player.bassDrop && player.beatWindowTimer > 0) {
    player.beatWindowTimer = Math.max(0, player.beatWindowTimer - dt);
    if (player.beatWindowTimer <= 0) player.beatCombo = 0;
  }
  if (player.stubbornGround) {
    player.gritDecayTimer = (player.gritDecayTimer || 0) + dt;
    if (player.gritDecayTimer >= GRIT_DECAY_TIME && player.gritStacks > 0) {
      player.gritDecayTimer = 0;
      player.gritStacks -= 1;
    }
  }
  if (player.tripleCrown) {
    player.crownTimer = (player.crownTimer || 0) + dt;
    if (player.crownTimer >= CROWN_CYCLE_INTERVAL) {
      player.crownTimer = 0;
      advanceCrownStance(game);
    }
    if (player.crownStance === 2) {
      player.attackTimer = Math.max(0, player.attackTimer - dt * CROWN_MAGIC_HASTE);
    }
  }
  if (player.stoneVigil) {
    if (player.moving) {
      if (player.vigilActive) releaseVigilShatter(game);
      player.vigilIdleTime = 0;
      player.vigilActive = false;
    } else {
      player.vigilIdleTime = (player.vigilIdleTime || 0) + dt;
      if (!player.vigilActive && player.vigilIdleTime >= STONE_VIGIL_TIME) {
        player.vigilActive = true;
        Sound.play('statusFreeze');
        game.floatTexts.push(new FloatText(player.x, player.y - 26, 'STONE VIGIL', '#9aa6b2', true));
      }
    }
  }
  if (player.emberMolt && player.moltStackTimer > 0) {
    player.moltStackTimer = Math.max(0, player.moltStackTimer - dt);
    if (player.moltStackTimer <= 0) player.moltStacks = 0;
  }
  if (player.royalDecree) {
    player.decreeTimer = (player.decreeTimer || 0) + dt;
    if (player.decreeTimer >= ROYAL_DECREE_INTERVAL) {
      player.decreeTimer = 0;
      pulseRoyalDecree(game);
    }
  }
  if (player.scrappySurge) {
    if (player.scrappySurgeCooldown > 0) player.scrappySurgeCooldown = Math.max(0, player.scrappySurgeCooldown - dt);
    if (player.scrappySurgeTimer > 0) player.scrappySurgeTimer = Math.max(0, player.scrappySurgeTimer - dt);
  }
  if (player.spiteSwarm) {
    if (player.spiteSwarmCooldown > 0) player.spiteSwarmCooldown = Math.max(0, player.spiteSwarmCooldown - dt);
    if (player.spiteSwarmTimer > 0) player.spiteSwarmTimer = Math.max(0, player.spiteSwarmTimer - dt);
  }

  if (player.freezeTimer <= 0) {
    let stepX = mx * spd * dt, stepY = my * spd * dt;

    for (const ob of node.obstacles) {
      if (!ob.destroyed && ob.def && ob.def.current && Util.circleIntersect(player.x, player.y, player.radius, ob.x, ob.y, ob.radius)) {
        stepX += ob.def.pushX * CURRENT_PUSH_SPEED * dt;
        stepY += ob.def.pushY * CURRENT_PUSH_SPEED * dt;
      }
    }
    tryPushObstacles(node, player, stepX, stepY);
    tryMoveEntity(player, node, node.obstacles, stepX, stepY);

    if (player.galeStep && player.moving) {
      player.galeDistance = (player.galeDistance || 0) + Math.hypot(stepX, stepY);
      if (player.galeDistance >= GALE_STEP_DISTANCE) {
        player.galeDistance = 0;
        releaseGaleStep(game);
      }
    }

    if (player.tunnelAmbush && player.moving) {
      player.tunnelAmbushDistance = (player.tunnelAmbushDistance || 0) + Math.hypot(stepX, stepY);
      if (player.tunnelAmbushDistance >= TUNNEL_AMBUSH_DISTANCE) {
        player.tunnelAmbushDistance = 0;
        releaseTunnelAmbush(game);
      }
    }

    if (player.rollingCharge && player.moving) {
      player.rollingChargeDistance = (player.rollingChargeDistance || 0) + Math.hypot(stepX, stepY);
      if (player.rollingChargeDistance >= ROLLING_CHARGE_DISTANCE) {
        player.rollingChargeDistance = 0;
        dropRollingCharge(game);
      }
    }
  }

  if (!player.noAttack && !player.greenFireAttack && !player.innateFireRing && !player.innateStarRing && !player.innateBlizzardRing) {
    if (input.attack) {
      if (player.attackType === 'melee') playerMeleeAttack(game);
      else if (player.charged) playerChargedBeamAttack(game, dt, input);
      else playerRangedAttack(game);
    } else if (player.charged) {
      player.chargeTimer = 0;
    }
  }

  checkDoorTransition(game, dt);
  updatePickups(game, dt);
  updateChests(game);
}

function playerMeleeAttack(game){
  const player = game.player, node = game.currentRoom;
  if (player.attackTimer > 0) return;
  player.attackTimer = player.meleeCooldown;
  Sound.play('meleeSwing');
  const ang = Math.atan2(player.facing.y, player.facing.x);
  const originX = player.x + Math.cos(ang) * 14;
  const originY = player.y + Math.sin(ang) * 14;
  game.swingFX = { x: originX, y: originY, ang, life: 0.14 };

  const coneHalfWidth = Math.min(Math.PI, Math.PI * 0.65 * (1 + 0.3 * (player.passives.mirrorshard || 0)));
  const surging = !!(player.slipstreamSurge && player.slipstreamReady);
  const surgeOpts = surging ? { dmgMult: SLIPSTREAM_SURGE_MULT } : undefined;
  const layerHits = [];
  for (const e of node.enemies) {
    if (e.isDead) continue;
    const d = Util.dist(originX, originY, e.x, e.y);
    if (d < player.meleeRange + e.radius) {
      const angTo = Math.atan2(e.y - player.y, e.x - player.x);
      if (Math.abs(normalizeAngle(angTo - ang)) < coneHalfWidth) {
        const echoMarked = !!(player.echoHunt && e.echoMarkTimer > 0);
        const hitOpts = echoMarked
          ? { dmgMult: (surging ? SLIPSTREAM_SURGE_MULT : 1) * ECHO_HUNT_DAMAGE_MULT }
          : surgeOpts;
        if (dealPlayerDamage(game, e, ang, hitOpts)) {
          if (echoMarked && e.isDead && player.redCurrent < player.redMax) player.heal(0.5);
          if (player.talonRend && !e.isDead) applyTalonRend(game, e);
          layerHits.push(e);
          runHitLayers(game, 'melee', { x: originX, y: originY, ang, hits: [e], dmg: player.meleeDamage });
        }
      }
    }
  }
  for (const ob of node.obstacles) {
    if (ob.destroyed || !ob.attackable) continue;
    const d = Util.dist(originX, originY, ob.x, ob.y);
    if (d < player.meleeRange + ob.radius) {
      const angTo = Math.atan2(ob.y - player.y, ob.x - player.x);
      if (Math.abs(normalizeAngle(angTo - ang)) < coneHalfWidth) damageObstacleHit(game, ob);
    }
  }

  if (player.shockwaveAttack) {
    for (const ob of node.obstacles) {
      if (ob.destroyed || (ob.kind !== 'rock' && ob.kind !== 'tallrock')) continue;
      const d = Util.dist(originX, originY, ob.x, ob.y);
      if (d >= player.meleeRange + ob.radius) continue;
      const angTo = Math.atan2(ob.y - player.y, ob.x - player.x);
      if (Math.abs(normalizeAngle(angTo - ang)) < coneHalfWidth) shatterRockByShockwave(game, ob);
    }
  }
  if (surging && layerHits.length) {
    player.slipstreamTimer = 0;
    player.slipstreamReady = false;
    Sound.play('crit');
    game.explosions.push(new Explosion(originX, originY, 34));
    for (const e of layerHits) {
      if (e.isDead) continue;
      const kang = Math.atan2(e.y - player.y, e.x - player.x);
      e.knockX = (e.knockX || 0) + Math.cos(kang) * SLIPSTREAM_KNOCKBACK;
      e.knockY = (e.knockY || 0) + Math.sin(kang) * SLIPSTREAM_KNOCKBACK;
    }
  }

  if (player.faultlineQuake) {
    player.quakeSwings = (player.quakeSwings || 0) + 1;
    if (player.quakeSwings >= FAULTLINE_SWING_INTERVAL) {
      player.quakeSwings = 0;
      releaseFaultlineQuake(game, originX, originY);
    }
  }

  if (player.bitterbrew && layerHits.length) {
    player.brewSwings = (player.brewSwings || 0) + 1;
    if (player.brewSwings >= BITTERBREW_SWING_INTERVAL) {
      player.brewSwings = 0;
      spillBitterbrew(game, originX, originY);
    }
  }

  runCastLayers(game, 'melee', { x: originX, y: originY, ang, hits: layerHits, dmg: player.meleeDamage });
}

const SLIPSTREAM_CHARGE_TIME = 1.5;
const SLIPSTREAM_SURGE_MULT = 2.2;
const SLIPSTREAM_KNOCKBACK = 9;
const FAULTLINE_SWING_INTERVAL = 3;
const FAULTLINE_RADIUS = 104;
const FAULTLINE_DAMAGE_MULT = 0.75;

function releaseFaultlineQuake(game, x, y){
  const node = game.currentRoom, player = game.player;
  Sound.play('explosion');
  game.explosions.push(new Explosion(x, y, FAULTLINE_RADIUS));

  const dmg = Math.max(1, Math.round(player.meleeDamage * FAULTLINE_DAMAGE_MULT));
  for (const e of node.enemies) {
    if (e.isDead) continue;
    if (Util.dist(x, y, e.x, e.y) >= FAULTLINE_RADIUS + e.radius) continue;
    const kang = Math.atan2(e.y - y, e.x - x);
    const applied = e.takeDamage(dmg, Math.cos(kang) * 5, Math.sin(kang) * 5);
    if (applied) {
      game.floatTexts.push(new FloatText(e.x, e.y - 20, dmg, '#d8a86a', true));
      if (e.isDead) handleEnemyDeath(game, e);
    }
  }

  for (const ob of node.obstacles) {
    if (ob.destroyed || (ob.kind !== 'rock' && ob.kind !== 'tallrock')) continue;
    if (Util.dist(x, y, ob.x, ob.y) >= FAULTLINE_RADIUS + ob.radius) continue;
    shatterRockByShockwave(game, ob);
  }
}

function shatterRockByShockwave(game, ob){
  const node = game.currentRoom, player = game.player;
  ob.destroyed = true;
  Sound.play('obstacleDestroy');
  bumpStat('obstaclesDestroyed', 1, game);
  bumpBestiaryCount('objectsDestroyed', ob.kind, 1);

  if (Util.chance(player.rockCoinChance || 0)) {
    node.pickups.push(new Pickup('coin', ob.tx, ob.ty, Util.weighted(COIN_TYPES)));
  }
}

function damageObstacleHit(game, ob){
  if (ob.destroyed || !ob.attackable) return;
  ob.hp -= 1;
  ob.hitFlash = 0.15;
  if (ob.hp <= 0) {
    ob.destroyed = true;
    Sound.play('obstacleDestroy');
    bumpStat('obstaclesDestroyed', 1, game);
    bumpBestiaryCount('objectsDestroyed', ob.kind, 1);

    if (ob.def.heartDropChance) {
      const fd = fireHeartDrop(ob.kind);
      if (fd) { if (Util.chance(fd.chance)) game.currentRoom.pickups.push(new Pickup(fd.id, ob.tx, ob.ty)); }
      else if (Util.chance(ob.def.heartDropChance)) game.currentRoom.pickups.push(new Pickup('heartRed', ob.tx, ob.ty));
    }

    if (ob.def.explodesOnDestroy) {
      bumpStat('bombBarrelsDetonated', 1, game);
      explodeAt(game, ob.x, ob.y, 92 * (game.player.bombRadiusMult || 1));
    }
  } else {
    Sound.play('obstacleHit');
  }
}

const ECHO_HUNT_INTERVAL = 2.5;
const ECHO_HUNT_DAMAGE_MULT = 1.6;
const ECHO_HUNT_RADIUS = 220;
const ECHO_MARK_DURATION = 4;

function releaseEchoPulse(game){
  const node = game.currentRoom, player = game.player;
  Sound.play('unlock');
  game.explosions.push(new Explosion(player.x, player.y, ECHO_HUNT_RADIUS));
  for (const e of node.enemies) {
    if (e.isDead) continue;
    if (Util.dist(player.x, player.y, e.x, e.y) >= ECHO_HUNT_RADIUS + e.radius) continue;
    e.echoMarkTimer = ECHO_MARK_DURATION;
  }
}

const BITTERBREW_SWING_INTERVAL = 3;
const BITTERBREW_RADIUS = 28;
const BITTERBREW_LIFE = 4;

function spillBitterbrew(game, x, y){
  Sound.play('statusPoison');
  game.creep.push(new Creep(x, y, BITTERBREW_RADIUS, BITTERBREW_LIFE, 'venom', 'player'));
}

const TALON_REND_STACKS_TO_BURST = 4;
const TALON_REND_TIMER = 5;
const TALON_REND_TICK_DAMAGE_MULT = 0.2;
const TALON_REND_BURST_DAMAGE_MULT = 1.1;

function applyTalonRend(game, e){
  const player = game.player;
  e.talonRendTimer = TALON_REND_TIMER;
  e.talonRendStacks = (e.talonRendStacks || 0) + 1;
  const tickDmg = Math.max(1, Math.round(player.meleeDamage * TALON_REND_TICK_DAMAGE_MULT));
  const applied = e.takeDamage(tickDmg, 0, 0);
  if (applied) {
    game.floatTexts.push(new FloatText(e.x, e.y - 20, tickDmg, '#c04848', true));
    if (e.isDead) handleEnemyDeath(game, e);
  }
  if (!e.isDead && e.talonRendStacks >= TALON_REND_STACKS_TO_BURST) {
    e.talonRendStacks = 0;
    e.talonRendTimer = 0;
    const burstDmg = Math.max(1, Math.round(player.meleeDamage * TALON_REND_BURST_DAMAGE_MULT));
    const burstApplied = e.takeDamage(burstDmg, 0, 0);
    if (burstApplied) {
      Sound.play('crit');
      game.floatTexts.push(new FloatText(e.x, e.y - 34, burstDmg, '#ff6060', true));
      if (e.isDead) handleEnemyDeath(game, e);
    }
  }
}

const TIDEWATCH_INTERVAL = 7;
const TIDE_SURGE_RADIUS = 170;
const TIDE_SURGE_KNOCKBACK = 7;
const TIDE_ROOT_DURATION = 1.2;
const TIDE_SURGE_HEAL = 0.5;

function releaseTideSurge(game){
  const node = game.currentRoom, player = game.player;
  Sound.play('statusFreeze');
  game.explosions.push(new Explosion(player.x, player.y, TIDE_SURGE_RADIUS));
  if (player.freezeTimer > 0) player.freezeTimer = 0;
  if (player.redCurrent < player.redMax) {
    player.heal(TIDE_SURGE_HEAL);
    game.floatTexts.push(new FloatText(player.x, player.y - 26, 'TIDE', '#7ad7f0', true));
  }
  for (const e of node.enemies) {
    if (e.isDead) continue;
    if (Util.dist(player.x, player.y, e.x, e.y) >= TIDE_SURGE_RADIUS + e.radius) continue;
    const kang = Math.atan2(e.y - player.y, e.x - player.x);
    e.knockX = (e.knockX || 0) + Math.cos(kang) * TIDE_SURGE_KNOCKBACK;
    e.knockY = (e.knockY || 0) + Math.sin(kang) * TIDE_SURGE_KNOCKBACK;
    e.freezeTimer = Math.max(e.freezeTimer || 0, TIDE_ROOT_DURATION);
  }
}

const OVERCHARGE_THRESHOLD = 12;
const OVERCHARGE_DURATION = 5;
const OVERCHARGE_DAMAGE_MULT = 1.4;
const OVERCHARGE_HASTE = 0.6;
const OVERCHARGE_FX_RADIUS = 96;
const STOOP_EXECUTE_FRACTION = 0.18;
const STOOP_EXECUTE_FX_RADIUS = 46;

const NIRIK_HEAT_MAX = 10;
const NIRIK_HEAT_PER_HIT = 1;
const NIRIK_CALM_DECAY = 1.2;
const NIRIK_BURN_DECAY = 2.4;
const NIRIK_CALM_HASTE = 0.35;
const NIRIK_BURN_DAMAGE_MULT = 1.35;
const NIRIK_BURN_STATUS_SCALE = 1.6;
const NIRIK_FLIP_FX_RADIUS = 72;

function gainNirikHeat(game){
  const player = game.player;
  if (player.nirikBurning) return;
  player.nirikHeat = Math.min(NIRIK_HEAT_MAX, (player.nirikHeat || 0) + NIRIK_HEAT_PER_HIT);
  if (player.nirikHeat >= NIRIK_HEAT_MAX) {
    player.nirikBurning = true;
    Sound.play('flashpowder');
    game.explosions.push(new Explosion(player.x, player.y, NIRIK_FLIP_FX_RADIUS));
    game.floatTexts.push(new FloatText(player.x, player.y - 26, 'NIRIK', '#ff8a3c', true));
  }
}

const HOARDFIRE_PER_COIN = 0.004;
const HOARDFIRE_MAX = 0.35;

function playerMechanicDamageMult(player){
  let mult = 1;
  if (player.nirikNature && player.nirikBurning) mult *= NIRIK_BURN_DAMAGE_MULT;
  if (player.hoardfire) mult *= 1 + Math.min(HOARDFIRE_MAX, (player.coins || 0) * HOARDFIRE_PER_COIN);
  if (player.tripleCrown) {
    if (player.crownStance === 0 && player.attackType === 'melee') mult *= CROWN_MELEE_DAMAGE_MULT;
    else if (player.crownStance === 1 && player.attackType !== 'melee') mult *= CROWN_RANGED_DAMAGE_MULT;
  }
  if (player.scrappySurge && player.scrappySurgeTimer > 0) mult *= SCRAPPY_SURGE_DAMAGE_MULT;
  return mult;
}

function playerMechanicStatusScale(player){
  return (player.nirikNature && player.nirikBurning) ? NIRIK_BURN_STATUS_SCALE : 1;
}

function playerMechanicDamageTakenMult(player){
  let mult = 1;
  if (player.stoneVigil && player.vigilActive) mult *= STONE_VIGIL_DAMAGE_TAKEN_MULT;
  return mult;
}

const DEEP_CHILL_INTERVAL = 0.9;
const DEEP_CHILL_RADIUS = 122;
const DEEP_CHILL_MAX_STACKS = 5;
const DEEP_CHILL_DURATION = 2.6;
const DEEP_CHILL_SLOW_PER_STACK = 0.08;
const DEEP_CHILL_MIN_SPEED = 0.55;
const DEEP_CHILL_BITE_DAMAGE = 2;

function spreadDeepChill(game){
  const node = game.currentRoom, player = game.player;
  let bit = false;
  for (const e of node.enemies) {
    if (e.isDead) continue;
    if (Util.dist(player.x, player.y, e.x, e.y) >= DEEP_CHILL_RADIUS + e.radius) continue;
    e.chillStacks = Math.min(DEEP_CHILL_MAX_STACKS, (e.chillStacks || 0) + 1);
    e.chillTimer = DEEP_CHILL_DURATION;
    if (e.chillStacks >= DEEP_CHILL_MAX_STACKS) {
      bit = true;
      if (e.takeDamage(DEEP_CHILL_BITE_DAMAGE, 0, 0)) {
        game.floatTexts.push(new FloatText(e.x, e.y - 20, 'CHILL', '#9fd8ff', true));
        if (e.isDead) handleEnemyDeath(game, e);
      }
    }
  }
  if (bit) Sound.play('statusFreeze');
}

const RIPTIDE_INTERVAL = 6;
const RIPTIDE_RADIUS = 90;
const RIPTIDE_LIFE = 5;
const RIPTIDE_PULL_STRENGTH = 70;
const RIPTIDE_CORE_RADIUS = 26;
const RIPTIDE_DROWN_TIME = 1.2;
const RIPTIDE_DROWN_STUN = 1.5;
const RIPTIDE_DROWN_DAMAGE_MULT = 0.6;

function releaseRiptideLure(game){
  const player = game.player;
  Sound.play('statusFreeze');
  game.creep.push(new Creep(player.x, player.y, RIPTIDE_RADIUS, RIPTIDE_LIFE, 'lure', 'player'));
  game.floatTexts.push(new FloatText(player.x, player.y - 26, 'RIPTIDE', '#7ad7f0', true));
}

function applyRiptidePull(game, dt){
  const node = game.currentRoom, player = game.player;
  if (!game.creep || !game.creep.length) return;
  let lure = null;
  for (const c of game.creep) { if (c.kind === 'lure' && c.source === 'player') { lure = c; break; } }
  if (!lure) return;
  const dmg = Math.max(1, Math.round(player.meleeDamage * RIPTIDE_DROWN_DAMAGE_MULT));
  for (const e of node.enemies) {
    if (e.isDead || e.isBoss) continue;
    const d = Util.dist(lure.x, lure.y, e.x, e.y);
    if (d >= RIPTIDE_RADIUS + e.radius) { e.riptideDrownTimer = 0; continue; }
    const ang = Math.atan2(lure.y - e.y, lure.x - e.x);
    e.knockX = (e.knockX || 0) + Math.cos(ang) * RIPTIDE_PULL_STRENGTH * dt;
    e.knockY = (e.knockY || 0) + Math.sin(ang) * RIPTIDE_PULL_STRENGTH * dt;
    if (d <= RIPTIDE_CORE_RADIUS) {
      e.riptideDrownTimer = (e.riptideDrownTimer || 0) + dt;
      if (e.riptideDrownTimer >= RIPTIDE_DROWN_TIME) {
        e.riptideDrownTimer = 0;
        e.stunTimer = Math.max(e.stunTimer || 0, RIPTIDE_DROWN_STUN);
        const applied = e.takeDamage(dmg, 0, 0);
        if (applied) {
          game.floatTexts.push(new FloatText(e.x, e.y - 20, dmg, '#7ad7f0', true));
          if (e.isDead) { handleEnemyDeath(game, e); continue; }
        }
      }
    } else {
      e.riptideDrownTimer = 0;
    }
  }
}

const GALE_STEP_DISTANCE = 260;
const GALE_STEP_BURST = 46;
const GALE_STEP_RADIUS = 70;
const GALE_STEP_KNOCKBACK = 5;
const GALE_STEP_INVULN = 0.35;

function releaseGaleStep(game){
  const node = game.currentRoom, player = game.player;
  Sound.play('dodge');
  const ang = Math.atan2(player.facing.y, player.facing.x);
  tryMoveEntity(player, node, node.obstacles, Math.cos(ang) * GALE_STEP_BURST, Math.sin(ang) * GALE_STEP_BURST);
  player.invincibleTimer = Math.max(player.invincibleTimer, GALE_STEP_INVULN);
  game.explosions.push(new Explosion(player.x, player.y, GALE_STEP_RADIUS));
  for (const e of node.enemies) {
    if (e.isDead) continue;
    if (Util.dist(player.x, player.y, e.x, e.y) >= GALE_STEP_RADIUS + e.radius) continue;
    const kang = Math.atan2(e.y - player.y, e.x - player.x);
    e.knockX = (e.knockX || 0) + Math.cos(kang) * GALE_STEP_KNOCKBACK;
    e.knockY = (e.knockY || 0) + Math.sin(kang) * GALE_STEP_KNOCKBACK;
  }
  game.floatTexts.push(new FloatText(player.x, player.y - 26, 'GALE', '#bfe9ff', true));
}

const BASS_DROP_WINDOW = 1.4;
const BASS_DROP_THRESHOLD = 8;
const BASS_DROP_RADIUS = 110;
const BASS_DROP_DAMAGE_MULT = 1.3;
const BASS_DROP_STUN = 1.0;

function gainBeatCombo(game){
  const player = game.player;
  player.beatWindowTimer = BASS_DROP_WINDOW;
  player.beatCombo = (player.beatCombo || 0) + 1;
  if (player.beatCombo >= BASS_DROP_THRESHOLD) {
    player.beatCombo = 0;
    releaseBassDrop(game);
  }
}

function releaseBassDrop(game){
  const node = game.currentRoom, player = game.player;
  Sound.play('explosion');
  game.explosions.push(new Explosion(player.x, player.y, BASS_DROP_RADIUS));
  const dmg = Math.max(1, Math.round(player.rangedDamage * BASS_DROP_DAMAGE_MULT));
  for (const e of node.enemies) {
    if (e.isDead) continue;
    if (Util.dist(player.x, player.y, e.x, e.y) >= BASS_DROP_RADIUS + e.radius) continue;
    const kang = Math.atan2(e.y - player.y, e.x - player.x);
    const applied = e.takeDamage(dmg, Math.cos(kang) * 4, Math.sin(kang) * 4);
    if (applied) {
      e.stunTimer = Math.max(e.stunTimer || 0, BASS_DROP_STUN);
      game.floatTexts.push(new FloatText(e.x, e.y - 20, dmg, '#d86bd8', true));
      if (e.isDead) handleEnemyDeath(game, e);
    }
  }
  game.floatTexts.push(new FloatText(player.x, player.y - 26, 'DROP', '#d86bd8', true));
}

const PRISM_BLOOM_THRESHOLD = 6;
const PRISM_BLOOM_SHARDS = 3;
const PRISM_BLOOM_RADIUS = 260;
const PRISM_BLOOM_DAMAGE_MULT = 0.7;
const PRISM_BLOOM_SHARD_SPEED = 300;
const PRISM_BLOOM_SHARD_LIFE = 0.9;

function gainPrismCharge(game){
  const player = game.player;
  player.prismCharge = (player.prismCharge || 0) + 1;
  if (player.prismCharge >= PRISM_BLOOM_THRESHOLD) {
    player.prismCharge = 0;
    releasePrismBloom(game);
  }
}

function releasePrismBloom(game){
  const node = game.currentRoom, player = game.player;
  const targets = [];
  for (const e of node.enemies) {
    if (e.isDead) continue;
    const d = Util.dist(player.x, player.y, e.x, e.y);
    if (d < PRISM_BLOOM_RADIUS) targets.push({ e, d });
  }
  if (!targets.length) return;
  targets.sort((a, b) => a.d - b.d);
  const dmg = Math.max(1, Math.round(player.rangedDamage * PRISM_BLOOM_DAMAGE_MULT));
  Sound.play('statusFreeze');
  for (let i = 0; i < Math.min(PRISM_BLOOM_SHARDS, targets.length); i++) {
    const t = targets[i].e;
    const ang = Math.atan2(t.y - player.y, t.x - player.x);
    const shard = new Projectile(player.x, player.y, Math.cos(ang) * PRISM_BLOOM_SHARD_SPEED, Math.sin(ang) * PRISM_BLOOM_SHARD_SPEED,
      dmg, 'player', { color:'#bff6ff', radius:5, life:PRISM_BLOOM_SHARD_LIFE, homing:0.5 });
    shard.shape = 'round';
    game.projectiles.push(shard);
  }
  game.floatTexts.push(new FloatText(player.x, player.y - 26, 'PRISM', '#bff6ff', true));
}

const GRIT_MAX_STACKS = 5;
const GRIT_DECAY_TIME = 3;
const GRIT_KICKBACK_RADIUS = 100;
const GRIT_KICKBACK_KNOCKBACK = 7;
const GRIT_KICKBACK_STUN = 1.2;
const GRIT_KICKBACK_INVULN = 0.3;

function gainGritStack(game){
  const player = game.player;
  player.gritDecayTimer = 0;
  player.gritStacks = Math.min(GRIT_MAX_STACKS, (player.gritStacks || 0) + 1);
  if (player.gritStacks >= GRIT_MAX_STACKS) {
    player.gritStacks = 0;
    releaseKickback(game);
  }
}

function releaseKickback(game){
  const node = game.currentRoom, player = game.player;
  Sound.play('shieldBlock');
  game.explosions.push(new Explosion(player.x, player.y, GRIT_KICKBACK_RADIUS));
  const dmg = Math.max(1, Math.round(player.meleeDamage));
  for (const e of node.enemies) {
    if (e.isDead) continue;
    const d = Util.dist(player.x, player.y, e.x, e.y);
    if (d >= GRIT_KICKBACK_RADIUS + e.radius) continue;
    const ang = Math.atan2(e.y - player.y, e.x - player.x);
    const applied = e.takeDamage(dmg, Math.cos(ang) * GRIT_KICKBACK_KNOCKBACK, Math.sin(ang) * GRIT_KICKBACK_KNOCKBACK);
    if (applied) {
      e.stunTimer = Math.max(e.stunTimer || 0, GRIT_KICKBACK_STUN);
      game.floatTexts.push(new FloatText(e.x, e.y - 20, dmg, '#d8b16b', true));
      if (e.isDead) handleEnemyDeath(game, e);
    }
  }
  player.invincibleTimer = Math.max(player.invincibleTimer || 0, GRIT_KICKBACK_INVULN);
  game.floatTexts.push(new FloatText(player.x, player.y - 26, 'KICKBACK', '#d8b16b', true));
}

const CROWN_CYCLE_INTERVAL = 9;
const CROWN_MELEE_DAMAGE_MULT = 1.25;
const CROWN_RANGED_DAMAGE_MULT = 1.25;
const CROWN_MAGIC_HASTE = 0.4;
const CROWN_BURST_RADIUS = 90;
const CROWN_BURST_KNOCKBACK = 4.5;

function advanceCrownStance(game){
  const player = game.player;
  player.crownStance = (player.crownStance + 1) % 3;
  releaseCrownPulse(game);
}

function releaseCrownPulse(game){
  const node = game.currentRoom, player = game.player;
  Sound.play('battery');
  game.explosions.push(new Explosion(player.x, player.y, CROWN_BURST_RADIUS));
  for (const e of node.enemies) {
    if (e.isDead) continue;
    if (Util.dist(player.x, player.y, e.x, e.y) >= CROWN_BURST_RADIUS + e.radius) continue;
    const ang = Math.atan2(e.y - player.y, e.x - player.x);
    e.knockX = (e.knockX || 0) + Math.cos(ang) * CROWN_BURST_KNOCKBACK;
    e.knockY = (e.knockY || 0) + Math.sin(ang) * CROWN_BURST_KNOCKBACK;
  }
  const label = player.crownStance === 0 ? 'MELEE CROWN' : (player.crownStance === 1 ? 'RANGED CROWN' : 'MAGIC CROWN');
  game.floatTexts.push(new FloatText(player.x, player.y - 26, label, '#f4d97a', true));
}

const LOVE_HARVEST_MAX = 8;
const LOVE_HARVEST_RADIUS = 200;
const LOVE_HARVEST_FEAR_DURATION = 3;
const LOVE_HARVEST_HEAL = 1;

function gainLoveStack(game){
  const player = game.player;
  player.loveStacks = (player.loveStacks || 0) + 1;
  if (player.loveStacks >= LOVE_HARVEST_MAX) {
    player.loveStacks = 0;
    releaseSwarmPanic(game);
  }
}

function releaseSwarmPanic(game){
  const node = game.currentRoom, player = game.player;
  Sound.play('statusFear');
  game.explosions.push(new Explosion(player.x, player.y, LOVE_HARVEST_RADIUS));
  for (const e of node.enemies) {
    if (e.isDead || e.isBoss) continue;
    if (Util.dist(player.x, player.y, e.x, e.y) >= LOVE_HARVEST_RADIUS + e.radius) continue;
    e.fearTimer = Math.max(e.fearTimer, LOVE_HARVEST_FEAR_DURATION);
  }
  player.heal(LOVE_HARVEST_HEAL);
  game.floatTexts.push(new FloatText(player.x, player.y - 26, 'SWARM PANIC', '#ff8fc7', true));
}

const TUNNEL_AMBUSH_DISTANCE = 500;
const TUNNEL_AMBUSH_RANGE = 700;
const TUNNEL_AMBUSH_DAMAGE_MULT = 2;
const TUNNEL_AMBUSH_KNOCKBACK = 5;
const TUNNEL_AMBUSH_STUN = 1.5;
const TUNNEL_AMBUSH_INVULN = 0.3;
const TUNNEL_AMBUSH_TELEPORT_OFFSET = 40;

function releaseTunnelAmbush(game){
  const node = game.currentRoom, player = game.player;
  let target = null, bestDist = TUNNEL_AMBUSH_RANGE;
  for (const e of node.enemies) {
    if (e.isDead) continue;
    const d = Util.dist(player.x, player.y, e.x, e.y);
    if (d < bestDist) { bestDist = d; target = e; }
  }
  if (!target) return;
  const ang = Math.atan2(player.y - target.y, player.x - target.x);
  const spot = clampToRoom(node, target.x + Math.cos(ang) * TUNNEL_AMBUSH_TELEPORT_OFFSET, target.y + Math.sin(ang) * TUNNEL_AMBUSH_TELEPORT_OFFSET);
  player.x = spot.x; player.y = spot.y;
  player.invulnTimer = Math.max(player.invulnTimer, TUNNEL_AMBUSH_INVULN);

  const hitAng = Math.atan2(target.y - player.y, target.x - player.x);
  const dmg = player.meleeDamage * TUNNEL_AMBUSH_DAMAGE_MULT;
  const applied = target.takeDamage(dmg, Math.cos(hitAng) * TUNNEL_AMBUSH_KNOCKBACK, Math.sin(hitAng) * TUNNEL_AMBUSH_KNOCKBACK);
  Sound.play('obstacleHit');
  game.floatTexts.push(new FloatText(player.x, player.y - 26, 'TUNNEL AMBUSH', '#c9a06a', true));
  if (applied) {
    target.stunTimer = Math.max(target.stunTimer, TUNNEL_AMBUSH_STUN);
    game.floatTexts.push(new FloatText(target.x, target.y - 20, dmg, '#fff', true));
    if (target.isDead) handleEnemyDeath(game, target);
  }
}

const STONE_VIGIL_TIME = 1.1;
const STONE_VIGIL_DAMAGE_TAKEN_MULT = 0.4;
const STONE_VIGIL_SHATTER_RADIUS = 130;
const STONE_VIGIL_SHATTER_DAMAGE_MULT = 1.5;
const STONE_VIGIL_SHATTER_KNOCKBACK = 5.5;
const STONE_VIGIL_SHATTER_STUN = 1;

function releaseVigilShatter(game){
  const node = game.currentRoom, player = game.player;
  Sound.play('obstacleDestroy');
  game.explosions.push(new Explosion(player.x, player.y, STONE_VIGIL_SHATTER_RADIUS));
  const dmg = player.meleeDamage * STONE_VIGIL_SHATTER_DAMAGE_MULT;
  for (const e of node.enemies) {
    if (e.isDead) continue;
    if (Util.dist(player.x, player.y, e.x, e.y) >= STONE_VIGIL_SHATTER_RADIUS + e.radius) continue;
    const ang = Math.atan2(e.y - player.y, e.x - player.x);
    const applied = e.takeDamage(dmg, Math.cos(ang) * STONE_VIGIL_SHATTER_KNOCKBACK, Math.sin(ang) * STONE_VIGIL_SHATTER_KNOCKBACK);
    if (applied) {
      e.stunTimer = Math.max(e.stunTimer, STONE_VIGIL_SHATTER_STUN);
      if (e.isDead) handleEnemyDeath(game, e);
    }
  }
}

const EMBER_MOLT_WINDOW = 6;
const EMBER_MOLT_THRESHOLD = 4;
const EMBER_MOLT_RADIUS = 120;
const EMBER_MOLT_DAMAGE_MULT = 1.4;
const EMBER_MOLT_FEAR_DURATION = 2;
const EMBER_MOLT_INVULN = 1;

function gainMoltStack(game){
  const player = game.player;
  player.moltStackTimer = EMBER_MOLT_WINDOW;
  player.moltStacks = (player.moltStacks || 0) + 1;
  if (player.moltStacks >= EMBER_MOLT_THRESHOLD) {
    player.moltStacks = 0;
    releaseEmberMolt(game);
  }
}

function releaseEmberMolt(game){
  const node = game.currentRoom, player = game.player;
  Sound.play('explosion');
  game.explosions.push(new Explosion(player.x, player.y, EMBER_MOLT_RADIUS));
  const dmg = Math.max(1, Math.round((player.rangedDamage || player.meleeDamage) * EMBER_MOLT_DAMAGE_MULT));
  for (const e of node.enemies) {
    if (e.isDead) continue;
    if (Util.dist(player.x, player.y, e.x, e.y) >= EMBER_MOLT_RADIUS + e.radius) continue;
    const ang = Math.atan2(e.y - player.y, e.x - player.x);
    const applied = e.takeDamage(dmg, Math.cos(ang) * 4, Math.sin(ang) * 4);
    if (applied) {
      e.fearTimer = Math.max(e.fearTimer, EMBER_MOLT_FEAR_DURATION);
      game.floatTexts.push(new FloatText(e.x, e.y - 20, dmg, '#7aeeb0', true));
      if (e.isDead) handleEnemyDeath(game, e);
    }
  }
  player.invulnTimer = Math.max(player.invulnTimer, EMBER_MOLT_INVULN);
  game.floatTexts.push(new FloatText(player.x, player.y - 26, 'MOLT', '#7aeeb0', true));
}

const ROYAL_DECREE_INTERVAL = 5;
const ROYAL_DECREE_RADIUS = 160;
const ROYAL_DECREE_VULN_DURATION = 4;

function pulseRoyalDecree(game){
  const node = game.currentRoom, player = game.player;
  Sound.play('activeUse');
  game.explosions.push(new Explosion(player.x, player.y, ROYAL_DECREE_RADIUS));
  for (const e of node.enemies) {
    if (e.isDead || e.isBoss) continue;
    if (Util.dist(player.x, player.y, e.x, e.y) >= ROYAL_DECREE_RADIUS + e.radius) continue;
    e.vulnerableTimer = Math.max(e.vulnerableTimer, ROYAL_DECREE_VULN_DURATION);
  }
  game.floatTexts.push(new FloatText(player.x, player.y - 26, 'DECREE', '#f4d35e', true));
}

const SCRAPPY_SURGE_HP_THRESHOLD = 1;
const SCRAPPY_SURGE_COOLDOWN = 12;
const SCRAPPY_SURGE_DURATION = 3.5;
const SCRAPPY_SURGE_DAMAGE_MULT = 1.3;
const SCRAPPY_SURGE_INVULN = 0.6;

function triggerScrappySurge(game){
  const player = game.player;
  player.scrappySurgeTimer = SCRAPPY_SURGE_DURATION;
  player.scrappySurgeCooldown = SCRAPPY_SURGE_COOLDOWN;
  player.speedBoostTimer = Math.max(player.speedBoostTimer, SCRAPPY_SURGE_DURATION);
  player.invulnTimer = Math.max(player.invulnTimer, SCRAPPY_SURGE_INVULN);
  Sound.play('dodge');
  game.floatTexts.push(new FloatText(player.x, player.y - 26, 'SCRAPPY!', '#f0a8c9', true));
}

const SALVAGE_PROTOCOL_KILLS = 6;
const SALVAGE_TURRET_SIGHT_TILES = 3;

function gainSalvageScrap(game, enemy){
  const node = game.currentRoom, player = game.player;
  player.salvageKills = (player.salvageKills || 0) + 1;
  if (player.salvageKills < SALVAGE_PROTOCOL_KILLS) return;
  player.salvageKills = 0;
  if (!node.playerTurrets) node.playerTurrets = [];
  if (node.playerTurrets.length < player.maxTurrets) {
    node.playerTurrets.push({ x: enemy.x, y: enemy.y, sightRange: SALVAGE_TURRET_SIGHT_TILES * TILE, fireTimer: 0,
      dmg: player.rangedDamage * player.turretDamageMult, ang: 0, kind: 'metal' });
    Sound.play('itemGet');
    bumpStat('turretsBuilt', 1, game);
    game.floatTexts.push(new FloatText(enemy.x, enemy.y - 20, 'SALVAGE', '#5a7a9a', true));
  } else {
    for (const t of node.playerTurrets) t.fireTimer = 0;
    Sound.play('battery');
    game.floatTexts.push(new FloatText(player.x, player.y - 26, 'OVERCLOCK', '#e0c25a', true));
  }
}

const SPITE_SWARM_COOLDOWN = 1.2;
const SPITE_SWARM_WINDOW = 4;
const SPITE_SWARM_RANGE = 280;
const SPITE_SWARM_SPEED = 300;
const SPITE_SWARM_DAMAGE = 2;
const SPITE_SWARM_LIFE = 0.9;

function releaseSpiteSwarm(game){
  const node = game.currentRoom, player = game.player;
  const fams = player.familiars || [];
  if (fams.length === 0) return;
  const volleys = player.spiteSwarmTimer > 0 ? 2 : 1;
  player.spiteSwarmCooldown = SPITE_SWARM_COOLDOWN;
  player.spiteSwarmTimer = SPITE_SWARM_WINDOW;
  let fired = 0;
  for (const f of fams) {
    if (f.dead) continue;
    let target = null, best = SPITE_SWARM_RANGE;
    for (const e of node.enemies) {
      if (e.isDead) continue;
      const d = Util.dist(f.x, f.y, e.x, e.y);
      if (d < best) { best = d; target = e; }
    }
    if (!target) continue;
    for (let i = 0; i < volleys; i++) {
      const ang = Math.atan2(target.y - f.y, target.x - f.x) + (i === 0 ? 0 : 0.14);
      const proj = new Projectile(f.x, f.y, Math.cos(ang) * SPITE_SWARM_SPEED, Math.sin(ang) * SPITE_SWARM_SPEED,
        SPITE_SWARM_DAMAGE, 'player', { color: '#8fae4a', radius: 4, life: SPITE_SWARM_LIFE });
      proj.attackTrigger = 'familiar';
      game.projectiles.push(proj);
      fired++;
    }
  }
  if (fired > 0) {
    Sound.play('statusPoison');
    game.floatTexts.push(new FloatText(player.x, player.y - 26, 'SPITE', '#8fae4a', true));
  }
}

const ROLLING_CHARGE_DISTANCE = 240;
const ROLLING_CHARGE_TRAIL = 12;

function dropRollingCharge(game){
  const player = game.player;
  const bx = player.x - player.facing.x * ROLLING_CHARGE_TRAIL;
  const by = player.y - player.facing.y * ROLLING_CHARGE_TRAIL;
  if (placeBombAt(game, bx, by, 'player', true)) {
    game.floatTexts.push(new FloatText(bx, by - 18, 'ROLL', '#c98a4b', true));
  }
}

const SHATTERFROST_SHARDS = 6;
const SHATTERFROST_SHARD_DAMAGE = 3;
const SHATTERFROST_SHARD_SPEED = 320;
const SHATTERFROST_SHARD_LIFE = 0.55;
const SHATTERFROST_RIME_KILLS = 4;
const SHATTERFROST_RIME_RANGE = 320;
const SHATTERFROST_FREEZE_TIME = 1.6;

function triggerShatterfrost(game, enemy){
  const node = game.currentRoom, player = game.player;
  if (enemy.freezeTimer > 0) {
    player.shatterfrostRime = 0;
    const base = RNG.random() * Math.PI * 2;
    for (let i = 0; i < SHATTERFROST_SHARDS; i++) {
      const ang = base + (i / SHATTERFROST_SHARDS) * Math.PI * 2;
      const proj = new Projectile(enemy.x, enemy.y, Math.cos(ang) * SHATTERFROST_SHARD_SPEED, Math.sin(ang) * SHATTERFROST_SHARD_SPEED,
        SHATTERFROST_SHARD_DAMAGE, 'player', { color: '#bfe4f5', radius: 5, life: SHATTERFROST_SHARD_LIFE });
      proj.attackTrigger = 'familiar';
      game.projectiles.push(proj);
    }
    Sound.play('statusFreeze');
    game.floatTexts.push(new FloatText(enemy.x, enemy.y - 20, 'SHATTER', '#bfe4f5', true));
    return;
  }
  player.shatterfrostRime = (player.shatterfrostRime || 0) + 1;
  if (player.shatterfrostRime < SHATTERFROST_RIME_KILLS) return;
  player.shatterfrostRime = 0;
  let target = null, best = SHATTERFROST_RIME_RANGE;
  for (const e of node.enemies) {
    if (e.isDead) continue;
    const d = Util.dist(player.x, player.y, e.x, e.y);
    if (d < best) { best = d; target = e; }
  }
  if (!target) return;
  target.freezeTimer = Math.max(target.freezeTimer, SHATTERFROST_FREEZE_TIME);
  bumpStat('enemiesFrozen', 1, game);
  Sound.play('statusFreeze');
  game.floatTexts.push(new FloatText(target.x, target.y - 20, 'RIME', '#9ac9e0', true));
}

function playerRangedAttack(game){
  const player = game.player;
  if (player.laser) { playerLaserAttack(game); return; }
  if (player.attackTimer > 0) return;
  player.attackTimer = player.fireCooldown;
  Sound.play('rangedShot');
  bumpStat('shotsFired', 1, game);
  const baseAng = Math.atan2(player.facing.y, player.facing.x);
  const count = 1 + player.multishotExtra;
  const spread = 0.16;

  const life = player.unlimitedRange ? 999 : (player.rangeTiles * TILE) / player.boltSpeed;
  const firedBolts = [];

  const mods = resolveTearMods(player);
  for (let i = 0; i < count; i++) {
    const ang = baseAng + (count === 1 ? 0 : (i - (count - 1) / 2) * spread);
    const vx = Math.cos(ang) * player.boltSpeed * mods.speedMult, vy = Math.sin(ang) * player.boltSpeed * mods.speedMult;
    const appliedStatuses = rollTearStatus(player);
    const primaryStatus = appliedStatuses.includes(player.primedStatus) ? player.primedStatus : (appliedStatuses[0] || null);
    const proj = new Projectile(
      player.x + Math.cos(ang) * 16, player.y + Math.sin(ang) * 16,
      vx, vy, player.rangedDamage * mods.damageMult, 'player', { color: primaryStatus ? STATUS_TEAR_COLORS[primaryStatus] : '#c9c3ff', radius: 6 * mods.radiusMult, pierce: player.tearFlags.pierce, life,
        homing: player.tearFlags.homing, spectral: player.tearFlags.spectral, explosive: player.tearFlags.explosive,
        statusColor: primaryStatus ? STATUS_TEAR_COLORS[primaryStatus] : null, appliedStatus: appliedStatuses,
        shape: mods.shape, sizeMult: mods.sizeMult,
        chainLightning: player.tearFlags.chainLightning, splitOnHit: player.tearFlags.splitOnHit,
        knockbackPulse: player.tearFlags.knockbackPulse,
        pullPulse: player.tearFlags.pullPulse, chaosStatus: player.tearFlags.chaosStatus,
        creepOnHit: player.tearFlags.creepOnHit }
    );
    proj.attackTrigger = 'ranged';
    if (mods.shapeDef.onSpawn) mods.shapeDef.onSpawn(proj);
    game.projectiles.push(proj);
    firedBolts.push(proj);
  }
  runCastLayers(game, 'ranged', { x: player.x, y: player.y, ang: baseAng, hits: [], dmg: player.rangedDamage, projectiles: firedBolts });
}

function updateGreenFireAttack(game, input, dt){
  const player = game.player, node = game.currentRoom;
  if (!input.attack) { player.fireZone = null; return; }

  const range = player.fireZoneRange || 40;
  if (!player.fireZone) {
    player.fireZone = {
      x: player.x + player.facing.x * range,
      y: player.y + player.facing.y * range,
      radius: player.fireZoneRadius || 50,
      tickTimer: 0,
    };
    Sound.play('rangedShot');
  }
  const zone = player.fireZone;
  const dps = player.rangedDamage * (1 / Math.max(0.01, player.fireCooldown));
  const dmg = dps * dt;
  zone.tickTimer -= dt;
  const feedback = zone.tickTimer <= 0;
  if (feedback) zone.tickTimer = player.fireCooldown;
  const layerHits = [];
  for (const e of node.enemies) {
    if (e.isDead) continue;
    if (Util.dist(zone.x, zone.y, e.x, e.y) > zone.radius + e.radius) continue;
    const applied = e.takeDamage(dmg, 0, 0);
    if (!applied) continue;
    if (feedback) {
      player.onHitLanded(game);
      Sound.play('enemyHit');
      applyOnHitStatuses(game, e);
      game.floatTexts.push(new FloatText(e.x, e.y - 20, (dps * player.fireCooldown).toFixed(1), '#5ae0a0', true));
      layerHits.push(e);
      runHitLayers(game, 'firezone', { x: e.x, y: e.y, ang: Math.atan2(player.facing.y, player.facing.x), hits: [e], dmg: dps * player.fireCooldown });
    }
    if (e.isDead) { bumpStat('rangedKills', 1, game); handleEnemyDeath(game, e); }
  }
  if (feedback) runCastLayers(game, 'firezone', { x: zone.x, y: zone.y, ang: Math.atan2(player.facing.y, player.facing.x), hits: layerHits, dmg: dps * player.fireCooldown });

  if (feedback) {
    for (const ob of node.obstacles) {
      if (ob.destroyed || !ob.attackable) continue;
      if (Util.dist(zone.x, zone.y, ob.x, ob.y) > zone.radius + ob.radius) continue;
      damageObstacleHit(game, ob);
    }
  }
}

function updateFireRingAttack(game, dt){
  const player = game.player, node = game.currentRoom;

  const radius = player.fireRingRadius || 60;
  if (!player.fireZone) {
    player.fireZone = { x: player.x, y: player.y, radius, tickTimer: 0 };
    Sound.play('rangedShot');
  }
  const zone = player.fireZone;
  zone.x = player.x; zone.y = player.y;
  const dps = player.rangedDamage * (1 / Math.max(0.01, player.fireCooldown));
  const dmg = dps * dt;
  zone.tickTimer -= dt;
  const feedback = zone.tickTimer <= 0;
  if (feedback) zone.tickTimer = player.fireCooldown;
  const layerHits = [];
  for (const e of node.enemies) {
    if (e.isDead) continue;
    if (Util.dist(zone.x, zone.y, e.x, e.y) > zone.radius + e.radius) continue;
    const applied = e.takeDamage(dmg, 0, 0);
    if (!applied) continue;
    if (feedback) {
      player.onHitLanded(game);
      Sound.play('enemyHit');
      applyOnHitStatuses(game, e);
      game.floatTexts.push(new FloatText(e.x, e.y - 20, (dps * player.fireCooldown).toFixed(1), '#7aeeb0', true));
      layerHits.push(e);
      bumpStat('fireRingHits', 1, game);
      runHitLayers(game, 'firering', { x: e.x, y: e.y, ang: Math.atan2(player.facing.y, player.facing.x), hits: [e], dmg: dps * player.fireCooldown });
    }
    if (e.isDead) { bumpStat('rangedKills', 1, game); handleEnemyDeath(game, e); }
  }
  if (feedback) runCastLayers(game, 'firering', { x: zone.x, y: zone.y, ang: Math.atan2(player.facing.y, player.facing.x), hits: layerHits, dmg: dps * player.fireCooldown });
  if (feedback) {
    for (const ob of node.obstacles) {
      if (ob.destroyed || !ob.attackable) continue;
      if (Util.dist(zone.x, zone.y, ob.x, ob.y) > zone.radius + ob.radius) continue;
      damageObstacleHit(game, ob);
    }
  }
}

const CHANGELING_MINION_LIFE = 15;
const CHANGELING_MINION_TICK = 0.5;
const CHANGELING_MINION_CHASE_SPEED = 150;
function updateChangelingSummons(game, dt){
  const player = game.player, node = game.currentRoom;

  if (!player.summonsChangelings && !player.summonsRoostmates && !player.summonsThralls && !player.summonsHive && !player.summonsBrood) return;

  if (player._changelingSummonTimer > 0) player._changelingSummonTimer -= dt;
  if (player.changelingMinions.length < player.maxChangelingMinions && player._changelingSummonTimer <= 0) {
    const ang = RNG.random() * Math.PI * 2;
    player.changelingMinions.push({
      x: player.x + Math.cos(ang) * 24, y: player.y + Math.sin(ang) * 24,
      angle: ang, life: CHANGELING_MINION_LIFE, tickTimer: 0,
    });
    player._changelingSummonTimer = player.changelingSummonCooldown;
    bumpStat('changelingMinionsSummoned', 1, game);
    Sound.play('rangedShot');
  }

  for (let i = player.changelingMinions.length - 1; i >= 0; i--) {
    const m = player.changelingMinions[i];
    m.life -= dt;
    if (m.life <= 0) { player.changelingMinions.splice(i, 1); continue; }

    let target = null, targetD2 = Infinity;
    for (const e of node.enemies) {
      if (e.isDead) continue;
      const d2 = Util.dist2(m.x, m.y, e.x, e.y);
      if (d2 < targetD2) { targetD2 = d2; target = e; }
    }
    if (target) {

      const targetD = Math.sqrt(targetD2) || 1;
      const standoff = Math.min(player.changelingMinionRadius * 0.6, targetD);
      const ang = Math.atan2(target.y - m.y, target.x - m.x);
      const goalX = target.x - Math.cos(ang) * standoff, goalY = target.y - Math.sin(ang) * standoff;
      const dx = goalX - m.x, dy = goalY - m.y;
      const distToGoal = Math.hypot(dx, dy);
      const step = CHANGELING_MINION_CHASE_SPEED * dt;
      if (distToGoal <= step || distToGoal < 0.001) { m.x = goalX; m.y = goalY; }
      else { m.x += (dx / distToGoal) * step; m.y += (dy / distToGoal) * step; }
    } else {
      m.angle += 0.6 * dt;
      const homeX = player.x + Math.cos(m.angle) * 34, homeY = player.y + Math.sin(m.angle) * 34;
      m.x += (homeX - m.x) * Math.min(1, dt * 3);
      m.y += (homeY - m.y) * Math.min(1, dt * 3);
    }

    m.tickTimer -= dt;
    const feedback = m.tickTimer <= 0;
    if (feedback) m.tickTimer = CHANGELING_MINION_TICK;
    const dmg = player.changelingMinionDmg * dt;
    const layerHits = [];
    for (const e of node.enemies) {
      if (e.isDead) continue;
      if (Util.dist(m.x, m.y, e.x, e.y) > player.changelingMinionRadius + e.radius) continue;
      const applied = e.takeDamage(dmg, 0, 0);
      if (!applied) continue;
      if (feedback) {
        player.onHitLanded(game);
        Sound.play('enemyHit');
        applyOnHitStatuses(game, e);
        game.floatTexts.push(new FloatText(e.x, e.y - 20, (player.changelingMinionDmg * CHANGELING_MINION_TICK).toFixed(1), '#5ae0a0', true));
        layerHits.push(e);
        runHitLayers(game, 'firezone', { x: e.x, y: e.y, ang: 0, hits: [e], dmg: player.changelingMinionDmg * CHANGELING_MINION_TICK });
      }
      if (e.isDead) { bumpStat('rangedKills', 1, game); handleEnemyDeath(game, e); }
    }
    if (feedback) runCastLayers(game, 'firezone', { x: m.x, y: m.y, ang: 0, hits: layerHits, dmg: player.changelingMinionDmg * CHANGELING_MINION_TICK });
  }
}

function updateTurretBuild(game, dt, input){
  const player = game.player, node = game.currentRoom;

  if (!player.canBuildTurrets && !player.canPlantMarkers && !player.canDropStacks && !player.canConjureWards && !player.canPlantSentries) return;
  if (!input.build) { player.turretBuildTimer = 0; return; }
  player.turretBuildTimer += dt;
  if (player.turretBuildTimer < player.fireCooldown) return;
  player.turretBuildTimer = 0;
  if (!node.playerTurrets) node.playerTurrets = [];

  if (node.playerTurrets.length >= player.maxTurrets) {
    Sound.play('uiDeny');
    game.toast('Maximum turrets already built.');
    return;
  }

  node.playerTurrets.push({ x: player.x, y: player.y, sightRange: 3 * TILE, fireTimer: 0, dmg: player.rangedDamage * player.turretDamageMult, ang: 0, kind: player.canPlantSentries ? 'crystal' : 'metal' });
  Sound.play('itemGet');
  bumpStat('turretsBuilt', 1, game);
}

const TURRET_STATUS_SCALE = 0.5;

function updatePlayerTurrets(game, dt){
  const node = game.currentRoom, player = game.player;
  if (!node.playerTurrets || node.playerTurrets.length === 0) return;
  for (const turret of node.playerTurrets) {
    if (turret.fireTimer > 0) { turret.fireTimer -= dt; continue; }
    let nearest = null, nearestD = Infinity;
    for (const e of node.enemies) {
      if (e.isDead) continue;
      const d = Util.dist2(turret.x, turret.y, e.x, e.y);
      if (d < nearestD) { nearestD = d; nearest = e; }
    }
    if (!nearest || nearestD > turret.sightRange * turret.sightRange) continue;
    turret.fireTimer = 1.0;
    const ang = Math.atan2(nearest.y - turret.y, nearest.x - turret.x);
    turret.ang = ang;
    const boltSpeed = 320;
    const mods = resolveTearMods(player);
    const proj = new Projectile(
      turret.x, turret.y, Math.cos(ang) * boltSpeed, Math.sin(ang) * boltSpeed,
      turret.dmg, 'player', { color: player.tearColor || '#7fc1e3', radius: 4 * mods.radiusMult,
        pierce: player.tearFlags.pierce, homing: player.tearFlags.homing, spectral: player.tearFlags.spectral,
        explosive: player.tearFlags.explosive, statusColor: player.tearColor, statusScale: TURRET_STATUS_SCALE,
        shape: mods.shape, sizeMult: mods.sizeMult, chainLightning: player.tearFlags.chainLightning,
        splitOnHit: player.tearFlags.splitOnHit, knockbackPulse: player.tearFlags.knockbackPulse,
        pullPulse: player.tearFlags.pullPulse, creepOnHit: player.tearFlags.creepOnHit }
    );
    proj.attackTrigger = 'turret';
    if (mods.shapeDef.onSpawn) mods.shapeDef.onSpawn(proj);
    game.projectiles.push(proj);
    Sound.play('rangedShot');
  }
}

function destroyTurret(game){
  const node = game.currentRoom, player = game.player;
  if (!node.playerTurrets || node.playerTurrets.length === 0) return false;
  let nearestIdx = 0, nearestD = Infinity;
  node.playerTurrets.forEach((t, i) => {
    const d = Util.dist2(player.x, player.y, t.x, t.y);
    if (d < nearestD) { nearestD = d; nearestIdx = i; }
  });
  node.playerTurrets.splice(nearestIdx, 1);
  Sound.play('uiDeny');
  return true;
}

const POCKET_CHARGE_RATE = 1 / 20;

const POCKET_CHARGE_UNDER5_MULT = 1.6;
function updatePocketCharge(game, dt){
  const player = game.player;
  if (!player.pocketActive || player.pocketCharge >= player.pocketActive.maxCharge) return;
  const wispCount = player.familiars.filter(f => f.def.behavior === 'wisp').length;
  const rateMult = wispCount < 5 ? POCKET_CHARGE_UNDER5_MULT : 1 / (1 + Math.max(0, wispCount - 5));

  player.pocketChargeAccum += dt * (POCKET_CHARGE_RATE * rateMult) * (player.pocketChargeRateMult || 1);
  if (player.pocketChargeAccum >= 1) {
    player.pocketChargeAccum -= 1;
    player.pocketCharge = Math.min(player.pocketActive.maxCharge, player.pocketCharge + 1);
  }
}

function playerLaserAttack(game){
  const player = game.player, node = game.currentRoom;
  if (player.attackTimer > 0) return;
  player.attackTimer = player.fireCooldown;
  Sound.play('laserShot');
  bumpStat('shotsFired', 1, game);
  const ang = Math.atan2(player.facing.y, player.facing.x);
  const dx = Math.cos(ang), dy = Math.sin(ang);
  const maxDist = (node.tileW + node.tileH) * TILE;
  const step = 6;
  const hitSet = new Set();
  const hitObstacles = new Set();
  let endDist = maxDist;
  for (let dist = 0; dist < maxDist; dist += step) {
    const px = player.x + dx * dist, py = player.y + dy * dist;
    if (isTileSolidForEntity(node, Math.floor(px / TILE), Math.floor(py / TILE))) { endDist = dist; break; }
    for (const e of node.enemies) {
      if (e.isDead || hitSet.has(e)) continue;
      if (Util.dist2(px, py, e.x, e.y) < e.radius * e.radius) hitSet.add(e);
    }

    for (const ob of node.obstacles) {
      if (ob.destroyed || ob.isPit || ob.isWalkable || hitObstacles.has(ob)) continue;
      if (ob.isHazard && !ob.attackable) continue;
      if (!ob.attackable) continue;
      if (Util.circleIntersect(px, py, 2, ob.x, ob.y, ob.radius - 2)) hitObstacles.add(ob);
    }
  }
  for (const ob of hitObstacles) damageObstacleHit(game, ob);
  const layerHits = [];
  for (const e of hitSet) {
    let dmg = player.rangedDamage, crit = false;
    if (player.critChance && RNG.random() < player.critChance) { dmg *= player.critMultiplier; crit = true; }
    if (e.isBoss && player.bossDamageBonus) dmg *= (1 + player.bossDamageBonus);
    const applied = e.takeDamage(dmg, dx * 3, dy * 3);
    if (applied) {
      player.onHitLanded(game);
      Sound.play(crit ? 'crit' : 'enemyHit');
      if (crit) { bumpStat('critsLanded', 1, game); if (game.runStats) game.runStats.crits++; e._lastHitCrit = true; }
      applyOnHitStatuses(game, e);
      game.floatTexts.push(new FloatText(e.x, e.y - 20, (crit ? 'CRIT ' : '') + dmg, crit ? '#ffcf5c' : '#fff', true));
      if (e.isDead) { bumpStat('rangedKills', 1, game); handleEnemyDeath(game, e); }
      layerHits.push(e);
      runHitLayers(game, 'laser', { x: e.x, y: e.y, ang, hits: [e], dmg });
    }
  }
  runCastLayers(game, 'laser', { x: player.x, y: player.y, ang, hits: layerHits, dmg: player.rangedDamage });
  game.laserFX = { x1: player.x, y1: player.y, x2: player.x + dx * endDist, y2: player.y + dy * endDist, life: 0.12, maxLife: 0.12 };
}
