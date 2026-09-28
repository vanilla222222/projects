'use strict';

function damageAllEnemies(game, amount){
  const node = game.currentRoom;
  for (const e of node.enemies) {
    if (e.isDead || e.isBoss) continue;
    const applied = e.takeDamage(amount, 0, 0);
    if (applied) {
      game.floatTexts.push(new FloatText(e.x, e.y - 20, String(amount), '#fff', true));
      if (e.isDead) handleEnemyDeath(game, e);
    }
  }
}

function freezeAllEnemies(game, duration){
  const node = game.currentRoom;
  let count = 0;
  for (const e of node.enemies) {
    if (e.isDead || e.isBoss) continue;
    e.freezeTimer = Math.max(e.freezeTimer, duration);
    count++;
  }
  if (count) { bumpStat('enemiesFrozen', count, game); Sound.play('statusFreeze'); }
}

function openSecretPassage(game, slot){
  const node = game.currentRoom;
  if (!slot || (slot.type !== 'secret' && slot.type !== 'supersecret') || slot.opened || !slot.cells) return;
  slot.opened = true;
  for (const c of slot.cells) node.tiles[c.y][c.x] = T_SECRET_OPEN;
  node.tileLayerDirty = true;
  const nSlot = slot.pairedSlot;
  if (nSlot) {
    const neighbor = nSlot.room;
    ensureRoomBuilt(neighbor);
    if ((nSlot.type === 'secret' || nSlot.type === 'supersecret') && !nSlot.opened && nSlot.cells) {
      nSlot.opened = true;
      for (const c of nSlot.cells) neighbor.tiles[c.y][c.x] = T_SECRET_OPEN;
      neighbor.tileLayerDirty = true;
    }

  }
  Sound.play('secretOpen');
  game.toast('A hidden passage crumbles open!');
  bumpStat('secretRoomsFound', 1, game);
}

function updateObstacles(game, dt){
  const node = game.currentRoom, player = game.player;
  for (const ob of node.obstacles) {
    if (ob.destroyed) continue;
    if (ob.hitFlash > 0) ob.hitFlash -= dt;
    if (ob.contactCooldownTimer > 0) ob.contactCooldownTimer -= dt;
    if (ob.kind === 'movingspike') updateMovingSpike(node, ob, dt);
    if (ob.isHazard) {
      const isFire = ob.kind === 'yellowfire' || ob.kind === 'redfire';
      const rr = ob.radius + player.radius;
      if (!(isFire && player.trinketId === 'cinderguard') &&
          Util.dist2(ob.x, ob.y, player.x, player.y) < rr * rr && ob.contactCooldownTimer <= 0) {

        const dmgAmt = ob.kind === 'spike' ? 1 : playerDamageAmount(game, false, ob.def.dmg);
        damagePlayer(game, dmgAmt, ob.kind);

        ob.contactCooldownTimer = ob.kind === 'spike' ? 1.0 : 0.6;
        if (ob.kind === 'spike') triggerSacrificeSpike(game, node, ob);
      }
    }

    if (ob.isHazard && ob.kind.indexOf('fire') !== -1) {
      for (const e of node.enemies) {
        if (e.isDead || e.flies || e.canFly) continue;
        if (e.fireContactTimer === undefined) e.fireContactTimer = 0;
        if (e.fireContactTimer > 0) { e.fireContactTimer -= dt; continue; }
        const err = ob.radius + e.radius;
        if (Util.dist2(ob.x, ob.y, e.x, e.y) < err * err) {
          const applied = e.takeDamage(statusTickDamage(game.dungeon.floorNum), (e.x - ob.x) * 0.03, (e.y - ob.y) * 0.03);
          e.fireContactTimer = 0.6;
          if (applied && e.isDead) handleEnemyDeath(game, e);
        }
      }
    }
    if (ob.isFreezeTrap) {
      const rr = ob.radius + player.radius;
      if (Util.dist2(ob.x, ob.y, player.x, player.y) < rr * rr && ob.contactCooldownTimer <= 0) {
        player.freezeTimer = Math.max(player.freezeTimer, ob.def.freezeDuration || 0.5);

        ob.contactCooldownTimer = 1.5;
        Sound.play('statusFreeze');
      }
    }
    if (ob.def.projectile) {
      ob.fireTimer -= dt;
      if (ob.fireTimer <= 0) {
        ob.fireTimer = ob.def.fireCooldown;

        const boltOpts = { color: ob.def.boltColor || '#e05a3a', radius: 5, homing: ob.def.homing || 0, explosive: ob.def.explosiveBolt ? 1 : 0 };
        if (ob.def.spin) {

          ob.spinAngle = (ob.spinAngle || 0) + 0.5;
          fireProjectileAngle(game, ob, ob.spinAngle, 150, ob.def.dmg || 1, boltOpts);
        } else if (ob.def.spreadShots) {

          if (Util.dist(ob.x, ob.y, player.x, player.y) < 320) {
            const aim = Math.atan2(player.y - ob.y, player.x - ob.x);
            const n = ob.def.spreadShots, spread = ob.def.spreadAngle || 0.5;
            const step = spread / (n - 1 || 1);
            for (let i = 0; i < n; i++) fireProjectileAngle(game, ob, aim - spread / 2 + step * i, 170, ob.def.dmg || 1, boltOpts);
          }
        } else if (ob.def.angles) {

          for (const ang of ob.def.angles) fireProjectileAngle(game, ob, ang, 170, ob.def.dmg || 1, boltOpts);
        } else if (ob.def.targeting) {

          fireProjectileAt(game, ob, player.x, player.y, 170, ob.def.dmg || 1, boltOpts);
        } else if (Util.dist(ob.x, ob.y, player.x, player.y) < 320) {

          fireProjectileAt(game, ob, player.x, player.y, 170, ob.def.dmg || 1, boltOpts);
        }
      }
    }
  }
}

const SPIKE_DIRS = [ { x:0, y:-1 }, { x:1, y:0 }, { x:0, y:1 }, { x:-1, y:0 } ];

function spikeTileOpen(node, tx, ty, self){
  if (tx < 0 || ty < 0 || ty >= node.tileH || tx >= node.tileW) return false;
  if (node.tiles[ty][tx] !== T_FLOOR) return false;
  for (const ob of node.obstacles) {
    if (ob === self || ob.destroyed || ob.isPit) continue;
    if (ob.tx === tx && ob.ty === ty) return false;
  }
  return true;
}

function spikeIsBoundary(node, tx, ty, self){
  for (const d of SPIKE_DIRS) if (!spikeTileOpen(node, tx + d.x, ty + d.y, self)) return true;
  return false;
}

function spikeFindWallDir(node, tx, ty, self, prefer){
  const order = prefer == null
    ? [0, 1, 2, 3]
    : [prefer, (prefer + 1) % 4, (prefer + 3) % 4, (prefer + 2) % 4];
  for (const idx of order) {
    const d = SPIKE_DIRS[idx];
    if (!spikeTileOpen(node, tx + d.x, ty + d.y, self)) return idx;
  }
  return -1;
}

function spikeSetTarget(node, ob, dirIdx, wallDirIdx){
  const d = SPIKE_DIRS[dirIdx];
  const ntx = ob.tx + d.x, nty = ob.ty + d.y;
  ob.spikeDir = dirIdx;
  ob.spikeTargetTx = ntx; ob.spikeTargetTy = nty;
  const wd = SPIKE_DIRS[wallDirIdx];
  if (!spikeTileOpen(node, ntx + wd.x, nty + wd.y, ob)) { ob.spikeWallDir = wallDirIdx; return; }
  const alt = spikeFindWallDir(node, ntx, nty, ob, wallDirIdx);
  ob.spikeWallDir = alt >= 0 ? alt : null;
}

function nearestSpikeBoundaryTile(node, ob){
  let best = null, bestD = Infinity;
  for (let ty = 0; ty < node.tileH; ty++) {
    for (let tx = 0; tx < node.tileW; tx++) {
      const d = Math.abs(tx - ob.tx) + Math.abs(ty - ob.ty);
      if (d === 0 || d >= bestD) continue;
      if (!spikeTileOpen(node, tx, ty, ob) || !spikeIsBoundary(node, tx, ty, ob)) continue;
      best = { tx: tx, ty: ty }; bestD = d;
    }
  }
  return best;
}

function pickNextSpikeTile(node, ob){

  if (ob.spikeWallDir == null) {
    const w = spikeFindWallDir(node, ob.tx, ob.ty, ob, ob.spikeDir == null ? null : (ob.spikeDir + 3) % 4);
    if (w >= 0) {
      ob.spikeWallDir = w;

      if (ob.spikeDir == null || (ob.spikeDir + 3) % 4 !== w) ob.spikeDir = (w + 1) % 4;
    }
  }
  if (ob.spikeWallDir != null) {
    const w = ob.spikeWallDir;
    let f = ob.spikeDir != null ? ob.spikeDir : (w + 1) % 4;
    if ((f + 3) % 4 !== w) { f = (w + 1) % 4; ob.spikeDir = f; }
    const wd = SPIKE_DIRS[w];

    if (spikeTileOpen(node, ob.tx + wd.x, ob.ty + wd.y, ob)) { spikeSetTarget(node, ob, w, (w + 3) % 4); return; }
    const fd = SPIKE_DIRS[f];

    if (spikeTileOpen(node, ob.tx + fd.x, ob.ty + fd.y, ob)) { spikeSetTarget(node, ob, f, w); return; }

    const r = (f + 1) % 4, rd = SPIKE_DIRS[r];
    if (spikeTileOpen(node, ob.tx + rd.x, ob.ty + rd.y, ob)) { spikeSetTarget(node, ob, r, f); return; }

    const b = (f + 2) % 4, bd = SPIKE_DIRS[b];
    if (spikeTileOpen(node, ob.tx + bd.x, ob.ty + bd.y, ob)) { spikeSetTarget(node, ob, b, (b + 3) % 4); return; }
  }

  let hasOpen = false;
  for (const d of SPIKE_DIRS) if (spikeTileOpen(node, ob.tx + d.x, ob.ty + d.y, ob)) { hasOpen = true; break; }
  if (!hasOpen) { ob.spikeTargetTx = ob.tx; ob.spikeTargetTy = ob.ty; return; }

  const order = ob.spikeDir == null
    ? Util.shuffle([0, 1, 2, 3])
    : [(ob.spikeDir + 1) % 4, ob.spikeDir, (ob.spikeDir + 3) % 4, (ob.spikeDir + 2) % 4];
  for (const idx of order) {
    const d = SPIKE_DIRS[idx];
    const ntx = ob.tx + d.x, nty = ob.ty + d.y;
    if (spikeTileOpen(node, ntx, nty, ob) && spikeIsBoundary(node, ntx, nty, ob)) {
      ob.spikeDir = idx; ob.spikeWallDir = null; ob.spikeTargetTx = ntx; ob.spikeTargetTy = nty; return;
    }
  }

  const goal = nearestSpikeBoundaryTile(node, ob);
  if (goal) {
    let bestIdx = -1, bestD = Infinity;
    for (let idx = 0; idx < 4; idx++) {
      const d = SPIKE_DIRS[idx];
      const ntx = ob.tx + d.x, nty = ob.ty + d.y;
      if (!spikeTileOpen(node, ntx, nty, ob)) continue;
      const dd = Math.abs(ntx - goal.tx) + Math.abs(nty - goal.ty);
      if (dd < bestD) { bestD = dd; bestIdx = idx; }
    }
    if (bestIdx >= 0) {
      const d = SPIKE_DIRS[bestIdx];
      ob.spikeDir = bestIdx; ob.spikeWallDir = null;
      ob.spikeTargetTx = ob.tx + d.x; ob.spikeTargetTy = ob.ty + d.y; return;
    }
  }

  for (const idx of order) {
    const d = SPIKE_DIRS[idx];
    const ntx = ob.tx + d.x, nty = ob.ty + d.y;
    if (spikeTileOpen(node, ntx, nty, ob)) {
      ob.spikeDir = idx; ob.spikeWallDir = null; ob.spikeTargetTx = ntx; ob.spikeTargetTy = nty; return;
    }
  }
  ob.spikeTargetTx = ob.tx; ob.spikeTargetTy = ob.ty;
}

function updateMovingSpike(node, ob, dt){
  if (ob.spikeTargetTx === null) pickNextSpikeTile(node, ob);
  const targetPx = ob.spikeTargetTx * TILE + TILE / 2, targetPy = ob.spikeTargetTy * TILE + TILE / 2;
  const dx = targetPx - ob.x, dy = targetPy - ob.y;
  const dist = Math.hypot(dx, dy);
  const speed = 46;
  if (dist < 2) {
    ob.x = targetPx; ob.y = targetPy;
    ob.tx = ob.spikeTargetTx; ob.ty = ob.spikeTargetTy;
    pickNextSpikeTile(node, ob);
  } else {
    ob.x += dx / dist * Math.min(dist, speed * dt);
    ob.y += dy / dist * Math.min(dist, speed * dt);
  }
}

function triggerSacrificeSpike(game, node, ob){
  ob.sacrificeStep = (ob.sacrificeStep || 0) + 1;
  const step = ob.sacrificeStep;
  const floorNum = game.dungeon.floorNum;
  bumpStat('sacrificeSpikesTriggered', 1, game);

  function spot(){ return findClearFloorSpot(node, ob.tx + Util.randi(-2, 2), ob.ty + Util.randi(-2, 2)); }
  function spawnPickups(kind, n){ for (let i = 0; i < n; i++) { const s = spot(); spawnResolvedPickup(node, kind, s.x, s.y); } }
  function spawnEnemies(n){ for (let i = 0; i < n; i++) { const s = spot(); node.enemies.push(new Enemy(resolveGenericEnemy(floorNum, game.floorBranch), s.x, s.y, floorNum)); } }

  if (step === 1) { if (Util.chance(0.5)) spawnPickups('coin:penny', 1); }
  else if (step === 2) { if (Util.chance(0.5)) { const s = spot(); node.chests.push(new Chest(Util.weighted(CHEST_TYPE_POOL).id, s.x, s.y)); } }
  else if (step === 3) { if (Util.chance(0.5)) spawnPickups('heartRed', 2); }
  else if (step === 4) { if (Util.chance(0.75)) spawnPickups('coin:penny', 3); }
  else if (step === 5) { spawnEnemies(1); }
  else if (step >= 6 && step <= 10) { if (Util.chance(0.5)) spawnPickups(rollGenericPickupKind(), 1); else spawnEnemies(3); }
  else if (step === 11) { if (Util.chance(0.5)) { const item = pickItemFromPool('treasure'); if (item) addItemPedestal(node, item, ob.tx, ob.ty - 1); } }
  else { if (Util.chance(0.5)) spawnPickups('coin:penny', 1); }
}

function updateExplosions(game, dt){
  for (const ex of game.explosions) ex.life -= dt;
  game.explosions = game.explosions.filter(e => e.life > 0);
}

function updateCreep(game, dt){
  for (const c of game.creep) c.life -= dt;
  game.creep = game.creep.filter(c => c.life > 0);
}

function updateDustDevils(game, dt){
  if (!game.dustDevils || !game.dustDevils.length) return;
  const node = game.currentRoom, player = game.player;
  for (const d of game.dustDevils) {
    d.life -= dt;
    d.ang += d.turnRate * dt;
    const nx = d.x + Math.cos(d.ang) * d.speed * dt;
    const ny = d.y + Math.sin(d.ang) * d.speed * dt;
    const spot = findNearestFloor(node, Math.floor(nx / TILE), Math.floor(ny / TILE));
    if (Util.dist(nx, ny, spot.x, spot.y) < TILE) { d.x = nx; d.y = ny; }
    else d.ang += Math.PI * 0.6;

    if (d.source === 'enemy') {
      const dist = Util.dist(d.x, d.y, player.x, player.y);
      if (dist < d.pullRadius) {
        const pull = (1 - dist / d.pullRadius) * 90;
        const a = Math.atan2(d.y - player.y, d.x - player.x);
        player.x += Math.cos(a) * pull * dt;
        player.y += Math.sin(a) * pull * dt;
        d.tickTimer -= dt;
        if (dist < d.radius && d.tickTimer <= 0) {
          d.tickTimer = 1;
          damagePlayer(game, playerDamageAmount(game, false, 1), 'dustdevil');
        }
      }
    }
  }
  game.dustDevils = game.dustDevils.filter(d => d.life > 0);
}

function updateFloatTexts(game, dt){
  for (const f of game.floatTexts) { f.life -= dt; f.y -= dt * 18; }
  game.floatTexts = game.floatTexts.filter(f => f.life > 0);
}
