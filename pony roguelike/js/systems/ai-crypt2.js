'use strict';

ENEMY_BEHAVIOR_HANDLERS.thief = function(game, e, dt){
  const node = game.currentRoom, player = game.player;
  if (e.stolenPickup) {
    const v = seekVector(e, player.x, player.y);
    tryMoveEntity(e, node, node.obstacles, -v.x * e.speed * dt, -v.y * e.speed * dt);
    return;
  }
  let target = null, bestD = Infinity;
  for (const p of node.pickups) {
    if (p.collected) continue;
    const d = Util.dist2(e.x, e.y, p.x, p.y);
    if (d < bestD) { bestD = d; target = p; }
  }
  if (!target) { aiChase(game, e, dt); return; }
  if (Util.dist(e.x, e.y, target.x, target.y) < e.radius + target.radius + 4) {
    const idx = node.pickups.indexOf(target);
    if (idx !== -1) node.pickups.splice(idx, 1);
    e.stolenPickup = target;
    return;
  }
  chaseSeek(game, e, target.x, target.y, 1, dt);
};

ENEMY_BEHAVIOR_HANDLERS.trapLid = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.spent) return;
  if (e.dashing) {
    tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
    e.dashTimer -= dt;
    if (e.dashTimer <= 0) { e.dashing = false; e.spent = true; }
    return;
  }
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 28) > 0) ? 0.14 : 0;
    if (e.telegraph <= 0) {
      const v = seekVector(e, player.x, player.y);
      e.dashing = true; e.dashTimer = t.lungeDuration || 0.5;
      e.dashVX = v.x * e.speed * (t.lungeSpeed || 6);
      e.dashVY = v.y * e.speed * (t.lungeSpeed || 6);
    }
    return;
  }
  if (Util.dist(e.x, e.y, player.x, player.y) < (t.triggerRange || 90)) e.telegraph = t.telegraphTime || 0.35;
};

ENEMY_BEHAVIOR_HANDLERS.chainlink = function(game, e, dt){
  const node = game.currentRoom, t = e.type;
  aiChase(game, e, dt);
  let partner = null, bestD = Infinity;
  for (const other of node.enemies) {
    if (other === e || other.isDead || other.type.id !== e.type.id) continue;
    const d = Util.dist2(e.x, e.y, other.x, other.y);
    if (d < bestD) { bestD = d; partner = other; }
  }
  if (!partner) return;
  const maxD = t.chainLength || 130;
  const d = Math.sqrt(bestD);
  if (d > maxD) {
    const dx = partner.x - e.x, dy = partner.y - e.y, len = d || 1;
    tryMoveEntity(e, node, node.obstacles, (dx / len) * e.speed * 1.4 * dt, (dy / len) * e.speed * 1.4 * dt);
  }
};

ENEMY_BEHAVIOR_HANDLERS.bonepiler = function(game, e, dt){
  const t = e.type;
  if (e.armorTimer === undefined) { e.armorTimer = t.exposedTime || 2.5; e.shielded = false; }
  e.armorTimer -= dt;
  if (e.armorTimer <= 0) {
    e.shielded = !e.shielded;
    e.armorTimer = e.shielded ? (t.pileTime || 5) : (t.exposedTime || 2.5);
  }
  aiWander(game, e, dt);
};

ENEMY_BEHAVIOR_HANDLERS.curser = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.curseTimer === undefined) e.curseTimer = Util.rand(1.2, 2);
  if (e.curseActive) {
    e.curseGrow += dt;
    e.hitFlash = (Math.sin(e.curseGrow * 14) > 0) ? 0.12 : 0;
    const growTime = t.curseGrowTime || 1.6;
    if (e.curseGrow >= growTime) {
      if (!e.curseApplied) {
        const R = t.curseMaxRadius || 90;
        if (Util.dist(e.x, e.y, player.x, player.y) < R) {
          player.freezeTimer = Math.max(player.freezeTimer, t.curseFreeze || 0.8);
          Sound.play('statusFreeze');
        }
        e.curseApplied = true;
      }
      e.curseFade = (e.curseFade || 0) + dt;
      if (e.curseFade > 0.4) {
        e.curseActive = false;
        e.curseTimer = Util.rand(t.curseCooldownMin || 3, t.curseCooldownMax || 4.5);
      }
    }
    return;
  }
  e.curseTimer -= dt;
  if (e.curseTimer <= 0) {
    e.curseActive = true; e.curseGrow = 0; e.curseApplied = false; e.curseFade = 0;
    game.explosions.push(new Explosion(e.x, e.y, 20));
    game.floatTexts.push(new FloatText(e.x, e.y - 22, '☠', '#b06ad0'));
  }
};

ENEMY_BEHAVIOR_HANDLERS.mourner = function(game, e, dt){
  const node = game.currentRoom, t = e.type;
  if (e.mournerDeadCount === undefined) e.mournerDeadCount = node.enemies.filter(x => x.isDead).length;
  const deadNow = node.enemies.filter(x => x.isDead).length;
  if (!e.enraged && deadNow > e.mournerDeadCount) {
    e.enraged = true;
    e.speed *= t.enrageSpeedMult || 1.8;
    e.dmg = Math.max(1, Math.round(e.dmg * (t.enrageDmgMult || 1.6)));
    game.floatTexts.push(new FloatText(e.x, e.y - 20, 'Enraged!', '#c93a3a'));
  }
  e.mournerDeadCount = deadNow;
  aiChase(game, e, dt);
};

ENEMY_BEHAVIOR_HANDLERS.sexton = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  aiWander(game, e, dt);
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 16) > 0) ? 0.1 : 0;
    if (e.telegraph <= 0) {
      const tx = Math.floor(e.lastPX / TILE), ty = Math.floor(e.lastPY / TILE);
      const already = node.obstacles.some(o => !o.destroyed && Math.floor(o.x / TILE) === tx && Math.floor(o.y / TILE) === ty);
      if (!already) {
        const spot = findNearestFloor(node, tx, ty);
        node.obstacles.push(new Obstacle('pit', spot.x, spot.y));
      }
    }
    return;
  }
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) {
    e.attackTimer = Util.rand(t.digCooldownMin || 3, t.digCooldownMax || 4.5);
    e.lastPX = player.x; e.lastPY = player.y;
    e.telegraph = t.telegraphTime || 1.2;
  }
};

function sarcophagusOpen(game, e, t){
  const node = game.currentRoom;
  const n = t.flySpawnCount || 3;
  const childType = ENEMY_TYPES[t.spawnFlyId || 'dnbfly'];
  if (!childType) return;
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + RNG.random() * 0.6;
    const spot = findNearestFloor(node, Math.floor((e.x + Math.cos(ang) * 40) / TILE), Math.floor((e.y + Math.sin(ang) * 40) / TILE));
    node.enemies.push(new Enemy(childType, spot.x, spot.y, game.dungeon.floorNum));
  }
  e.hitFlash = 0.3;
}

ENEMY_BEHAVIOR_HANDLERS.sarcophagus = function(game, e, dt){
  const t = e.type;
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) {
    e.attackTimer = Util.rand(t.openCooldownMin || 4, t.openCooldownMax || 6);
    sarcophagusOpen(game, e, t);
  }
};

ENEMY_BEHAVIOR_HANDLERS.sarcophagusArmored = function(game, e, dt){
  const t = e.type;
  if (e.armorTimer === undefined) { e.armorTimer = t.armorTime || 4; e.shielded = true; }
  e.armorTimer -= dt;
  if (e.armorTimer <= 0) {
    e.shielded = !e.shielded;
    e.armorTimer = e.shielded ? (t.armorTime || 4) : (t.vulnTime || 2.5);
  }
  e.attackTimer -= dt;
  if (e.attackTimer <= 0) {
    e.attackTimer = Util.rand(t.openCooldownMin || 4, t.openCooldownMax || 6);
    sarcophagusOpen(game, e, t);
  }
};
