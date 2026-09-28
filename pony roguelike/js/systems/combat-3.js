'use strict';

function checkRoomCleared(game, node){
  if (game.mode === 'wavedefense') return false;
  if (node.cleared) return false;
  const aliveHostile = node.enemies.some(e => !e.isDead);
  if (aliveHostile) return false;

  if (node.type === 'challenge' && node.challengeStarted && node.challengeWave < node.challengeTotalWaves) {
    spawnChallengeWave(game, node);
    return false;
  }
  if (node.type === 'challenge' && node.challengeStarted) bumpStat('challengeRoomsCompleted', 1, game);

  if (node.type === 'bosschallenge' && node.challengeStarted && node.challengeWave < node.challengeTotalWaves) {
    spawnBossChallengeWave(game, node);
    return false;
  }
  if (node.type === 'bosschallenge' && node.challengeStarted && !node.challengeRewarded) {
    node.challengeRewarded = true;
    bumpStat('bossChallengesCompleted', 1, game);
    const reward = pickAboveQuality1();
    if (reward) {
      const spot = findClearFloorSpot(node, Math.floor(node.tileW / 2), Math.floor(node.tileH / 2));
      addItemPedestal(node, reward, spot.x, spot.y);
    }
  }
  node.cleared = true; node.doorsOpen = true; return true;
}

function spawnBossChallengeWave(game, node){
  const floorNum = game.dungeon.floorNum;
  node.challengeWave++;
  const cx = Math.floor(node.tileW / 2), cy = Math.floor(node.tileH / 2);
  const spot = findClearFloorSpot(node, cx, Math.max(2, cy - 3));
  const boss = new Boss(resolveBossChallengeBoss(floorNum, game.floorBranch), spot.x, spot.y, floorNum);
  boss.isBoss = false;
  boss.isChallengeBoss = true;
  node.enemies.push(boss);
  game.toast('Boss challenge!');
}

function startBossChallengeRoom(game, node){
  if (node.challengeStarted) return;
  node.challengeStarted = true;
  node.doorsOpen = false;
  node.tileLayerDirty = true;
  spawnBossChallengeWave(game, node);
}

function spawnChallengeWave(game, node){
  const floorNum = game.dungeon.floorNum;
  node.challengeWave++;
  const n = Util.randi(3, 5);
  const cx = Math.floor(node.tileW / 2), cy = Math.floor(node.tileH / 2);
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + RNG.random() * 0.5;
    const spot = findClearFloorSpot(node, cx + Math.round(Math.cos(ang) * 3), cy + Math.round(Math.sin(ang) * 3));
    node.enemies.push(new Enemy(resolveGenericEnemy(floorNum, game.floorBranch), spot.x, spot.y, floorNum));
  }
  game.toast('Wave ' + node.challengeWave + ' / ' + node.challengeTotalWaves + '!');
}

function startChallengeRoom(game, node){
  if (node.challengeStarted) return;
  node.challengeStarted = true;
  node.doorsOpen = false;
  node.tileLayerDirty = true;
  spawnChallengeWave(game, node);
}

const _warnedBehaviors = new Set();

const ENEMY_BEHAVIOR_HANDLERS = {};

function updateEnemy(game, e, dt){
  if (e.isDead) return;
  const node = game.currentRoom;
  if (e.hitFlash > 0) e.hitFlash -= dt;

  if (e.stuckTimer === undefined) e.stuckTimer = 0;
  if (collidesAt(e, e.x, e.y, node, node.obstacles)) {
    e.stuckTimer += dt;
    if (e.stuckTimer > 0.75) {
      const spot = findNearestFloor(node, Math.floor(e.x / TILE), Math.floor(e.y / TILE));
      e.x = spot.x * TILE + TILE / 2; e.y = spot.y * TILE + TILE / 2;
      e.stuckTimer = 0;

      e.dashing = false; e.dashVX = 0; e.dashVY = 0; e.knockX = 0; e.knockY = 0;
    }
  } else {
    e.stuckTimer = 0;
  }

  if (Math.abs(e.knockX) > 0.15 || Math.abs(e.knockY) > 0.15) {
    tryMoveEntity(e, node, node.obstacles, e.knockX, e.knockY);
    e.knockX *= 0.82; e.knockY *= 0.82;
  } else { e.knockX = 0; e.knockY = 0; }

  updateStatusEffects(game, e, dt);
  if (e.isDead) return;

  if (e.behavior === 'shielded') {
    e.shieldTimer -= dt;
    if (e.shieldTimer <= 0) {
      e.shielded = !e.shielded;
      e.shieldTimer = e.shielded ? (e.type.shieldTime || 2) : (e.type.vulnTime || 2);
    }
  } else if (e.grantedShield) {

    e.shieldTimer -= dt;
    if (e.shieldTimer <= 0) { e.shielded = false; e.grantedShield = false; e.shieldTimer = 0; }
  }

  let creepSpeedMult = 1;
  if (!e.isBoss && game.creep && game.creep.length) {
    let inCreep = false;
    for (const c of game.creep) {
      if (c.source !== 'player') continue;
      const dx = e.x - c.x, dy = e.y - c.y, rr2 = c.radius + e.radius;
      if (dx * dx + dy * dy <= rr2 * rr2) {
        inCreep = true;
        if (c.slowMult < creepSpeedMult) creepSpeedMult = c.slowMult;
      }
    }
    if (inCreep) {
      e.creepTickTimer -= dt;
      if (e.creepTickTimer <= 0) {
        e.creepTickTimer = 1.0;
        const pool = ['freezeChance', 'venomChance', 'stunChance', 'charmChance', 'fearChance'];
        applyOnHitStatuses(game, e, undefined, pool[Math.floor(Math.random() * pool.length)]);

        const applied = e.takeDamage(game.player.rangedDamage, 0, 0);
        if (applied && e.isDead) { handleEnemyDeath(game, e); return; }
      }
    } else {
      e.creepTickTimer = 0;
    }
  }

  if (!e.isBoss && e.chillTimer > 0 && e.chillStacks > 0) {
    const chillMult = Math.max(DEEP_CHILL_MIN_SPEED, 1 - e.chillStacks * DEEP_CHILL_SLOW_PER_STACK);
    if (chillMult < creepSpeedMult) creepSpeedMult = chillMult;
  }

  const origSpeed = e.speed;
  if (creepSpeedMult < 1) e.speed = origSpeed * creepSpeedMult;

  if (e.freezeTimer > 0) {

  } else if (e.stunTimer > 0) {
    aiWander(game, e, dt);
  } else if (e.charmTimer > 0) {
    aiCharmed(game, e, dt);
  } else if (e.fearTimer > 0) {
    aiFeared(game, e, dt);
  } else {
    switch (e.behavior) {
      case 'chaser': case 'shielded': aiChase(game, e, dt); break;
      case 'ranged': aiRanged(game, e, dt); break;
      case 'flyer': aiFlyer(game, e, dt); break;
      case 'bomber': aiBomber(game, e, dt); break;
      case 'charger': aiCharger(game, e, dt); break;
      case 'turret': aiTurret(game, e, dt); break;
      case 'leaper': aiLeaper(game, e, dt); break;
      case 'splitter': aiChase(game, e, dt); break;
      case 'orbiter': aiOrbiter(game, e, dt); break;
      case 'burrower': aiBurrower(game, e, dt); break;
      case 'summoner': aiSummoner(game, e, dt); break;
      case 'healer': aiHealer(game, e, dt); break;
      case 'sniper': aiSniper(game, e, dt); break;
      case 'swarm': aiSwarm(game, e, dt); break;
      case 'rootgrower': aiRootgrower(game, e, dt); break;
      case 'treeburner': aiTreeburner(game, e, dt); break;
      case 'oilrig': aiOilrig(game, e, dt); break;
      case 'ambusher': aiAmbusher(game, e, dt); break;
      case 'teleporter': aiTeleporter(game, e, dt); break;
      case 'shielder': aiShielder(game, e, dt); break;
      case 'lobber': aiLobber(game, e, dt); break;
      case 'weaver': aiWeaver(game, e, dt); break;
      case 'sentry': aiSentry(game, e, dt); break;
      case 'skirmisher': aiSkirmisher(game, e, dt); break;
      case 'whiplash': aiWhiplash(game, e, dt); break;
      case 'bossWarlord': aiBossWarlord(game, e, dt); break;
      case 'bossColossus': aiBossColossus(game, e, dt); break;
      case 'bossHiveMother': aiBossHiveMother(game, e, dt); break;
      case 'bossBoneSentinel': aiBossBoneSentinel(game, e, dt); break;
      case 'bossBrambleQueen': aiBossBrambleQueen(game, e, dt); break;
      case 'bossSandWyrm': aiBossSandWyrm(game, e, dt); break;
      case 'bossPolish': aiBossPolish(game, e, dt); break;
      case 'bossTyrone': aiBossTyrone(game, e, dt); break;
      case 'bossPineapple': aiBossPineapple(game, e, dt); break;
      case 'bossIsrael': aiBossIsrael(game, e, dt); break;
      case 'bossAshTyrant': aiBossAshTyrant(game, e, dt); break;
      case 'bossCinderColossus': aiBossCinderColossus(game, e, dt); break;
      case 'bossMagmaWraith': aiBossMagmaWraith(game, e, dt); break;
      case 'bossBrimstoneHorror': aiBossBrimstoneHorror(game, e, dt); break;
      case 'bossShadowStalker': aiBossShadowStalker(game, e, dt); break;
      case 'bossStormbringer': aiBossStormbringer(game, e, dt); break;
      case 'bossFrostSentinel': aiBossFrostSentinel(game, e, dt); break;
      case 'bossBrickGolem': aiBossBrickGolem(game, e, dt); break;
      case 'bossGlacierFiend': aiBossGlacierFiend(game, e, dt); break;
      case 'bossBlizzardWraith': aiBossBlizzardWraith(game, e, dt); break;
      case 'bossVineHorror': aiBossVineHorror(game, e, dt); break;
      case 'bossCanopyStalker': aiBossCanopyStalker(game, e, dt); break;
      case 'bossAlgae': aiBossAlgae(game, e, dt); break;
      case 'bossLilac': aiBossLilac(game, e, dt); break;

      case 'bossPlapper': aiBossPlapper(game, e, dt); break;
      case 'bossClapper': aiBossClapper(game, e, dt); break;
      case 'bossNhm': aiBossNhm(game, e, dt); break;
      case 'bossVanillaDnb': aiBossVanillaDnb(game, e, dt); break;
      case 'bossOneTrueDnb': aiBossOneTrueDnb(game, e, dt); break;

      case 'bossBoneCaller': aiBossBoneCaller(game, e, dt); break;
      case 'bossGraveChorus': aiBossGraveChorus(game, e, dt); break;
      case 'bossRotBloom': aiBossRotBloom(game, e, dt); break;
      case 'bossAntlerWarden': aiBossAntlerWarden(game, e, dt); break;
      case 'bossGlassScorpion': aiBossGlassScorpion(game, e, dt); break;
      case 'bossDuneRavager': aiBossDuneRavager(game, e, dt); break;
      case 'bossFurnaceHeart': aiBossFurnaceHeart(game, e, dt); break;
      case 'bossSlagbound': aiBossSlagbound(game, e, dt); break;
      case 'bossEclipseWraith': aiBossEclipseWraith(game, e, dt); break;
      case 'bossIronBastion': aiBossIronBastion(game, e, dt); break;
      default: {
        const key = String(e.behavior);

        const handler = ENEMY_BEHAVIOR_HANDLERS[key];
        if (handler) { handler(game, e, dt); break; }
        if (!_warnedBehaviors.has(key)) {
          _warnedBehaviors.add(key);
          console.warn('updateEnemy: unknown behavior "' + key + '" on enemy type "' +
            ((e.type && e.type.id) || '?') + '" — falling back to chaser');
        }
        aiChase(game, e, dt);
        break;
      }
    }
  }

  if (!e.isBoss) {
    if (e.shieldLockoutTimer > 0) {
      e.shieldLockoutTimer -= dt;
      if (e.shielded) { e.shielded = false; e.shieldHitCount = 0; e.shieldActiveTimer = 0; }
    } else if (e.shielded) {
      e.shieldActiveTimer = (e.shieldActiveTimer || 0) + dt;
      if (e.shieldActiveTimer >= 5) {
        e.shielded = false;
        e.shieldHitCount = 0;
        e.shieldActiveTimer = 0;
        e.shieldLockoutTimer = 5;
      }
    } else {
      e.shieldActiveTimer = 0;
      e.shieldHitCount = 0;
    }
  }

  if (creepSpeedMult < 1) e.speed = origSpeed;

  if (e.contactCooldown > 0) e.contactCooldown -= dt;
  const player = game.player;
  const rr = e.radius + player.radius;

  const suppressPlayerContact = e.submerged || e.freezeTimer > 0 || e.charmTimer > 0 || e.type.harmless || e.spent;
  if (!e.isDead && !suppressPlayerContact && Util.dist2(e.x, e.y, player.x, player.y) < rr * rr && e.contactCooldown <= 0) {
    damagePlayer(game, playerDamageAmount(game, e.isBoss, e.dmg), e.type.id);
    e.contactCooldown = e.isBoss ? 0.6 : (e.type.contactCooldown || 0.7);
    if (player.spikedBarding) {

      const applied = e.takeDamage(statusTickDamage(game.dungeon.floorNum), (e.x - player.x) * 0.03, (e.y - player.y) * 0.03);
      if (applied && e.isDead) handleEnemyDeath(game, e);
    }
  } else if (!e.isDead && e.charmTimer > 0 && e.contactCooldown <= 0) {

    for (const other of node.enemies) {
      if (other === e || other.isDead || other.charmTimer > 0) continue;
      const orr = e.radius + other.radius;
      if (Util.dist2(e.x, e.y, other.x, other.y) < orr * orr) {
        const applied = other.takeDamage(e.dmg, (other.x - e.x) * 0.03, (other.y - e.y) * 0.03);
        e.contactCooldown = e.type.contactCooldown || 0.7;
        if (applied && other.isDead) handleEnemyDeath(game, other);
        break;
      }
    }
  }

  if (!e.isDead && !suppressPlayerContact && e.type.behavior !== 'turret') {
    for (const f of player.familiars) {
      if (f.hp == null || f.dead) continue;
      if (f.hurtCooldown > 0) { f.hurtCooldown -= dt; continue; }
      const fr = e.radius + 9;
      if (Util.dist2(e.x, e.y, f.x, f.y) < fr * fr) {
        f.hp -= 1;
        f.hurtCooldown = e.type.contactCooldown || 0.7;
        if (f.hp <= 0) resolveWispLethalHit(player, f);
      }
    }
  }
}

function updateStatusEffects(game, e, dt){
  if (e.poisonTimer > 0) {
    e.poisonTimer = Math.max(0, e.poisonTimer - dt);
    e.poisonTickTimer -= dt;
    if (e.poisonTickTimer <= 0) {
      e.poisonTickTimer = 0.8;

      let tickDmg = statusTickDamage(game.dungeon.floorNum);
      if (e.vulnerableTimer > 0 && game.player.rotAndRuinActive) tickDmg *= 1.3;
      const applied = e.takeDamage(tickDmg, 0, 0);
      if (applied && e.isDead) { handleEnemyDeath(game, e); return; }
    }
  }
  if (e.stunTimer > 0) e.stunTimer = Math.max(0, e.stunTimer - dt);
  if (e.freezeTimer > 0) e.freezeTimer = Math.max(0, e.freezeTimer - dt);
  if (e.fearTimer > 0) e.fearTimer = Math.max(0, e.fearTimer - dt);
  if (e.charmTimer > 0) e.charmTimer = Math.max(0, e.charmTimer - dt);
  if (e.vulnerableTimer > 0) e.vulnerableTimer = Math.max(0, e.vulnerableTimer - dt);
  if (e.echoMarkTimer > 0) e.echoMarkTimer = Math.max(0, e.echoMarkTimer - dt);
  if (e.talonRendTimer > 0) {
    e.talonRendTimer = Math.max(0, e.talonRendTimer - dt);
    if (e.talonRendTimer <= 0) e.talonRendStacks = 0;
  }
  if (e.chillTimer > 0) {
    e.chillTimer = Math.max(0, e.chillTimer - dt);
    if (e.chillTimer <= 0) e.chillStacks = 0;
  }
}

function updateProjectiles(game, dt){
  const node = game.currentRoom, player = game.player;
  for (const pr of game.projectiles) {

    const prShape = TEAR_SHAPES[pr.shape] || null;
    if (prShape && prShape.onUpdate) prShape.onUpdate(pr, dt, game);

    if (pr.homing && !(prShape && prShape.ignoresHoming) && (pr.owner === 'player' || pr.owner === 'familiar')) {
      let nearest = null, nd = 260;
      for (const e of node.enemies) {
        if (e.isDead) continue;
        const d = Util.dist(pr.x, pr.y, e.x, e.y);
        if (d < nd) { nd = d; nearest = e; }
      }
      if (nearest) {
        const speed = Math.hypot(pr.vx, pr.vy);
        const curAng = Math.atan2(pr.vy, pr.vx);
        const wantAng = Math.atan2(nearest.y - pr.y, nearest.x - pr.x);
        const turn = Math.min(1, 0.15 * pr.homing) * 5 * dt;
        const diff = normalizeAngle(wantAng - curAng);
        const newAng = curAng + Util.clamp(diff, -turn, turn);
        pr.vx = Math.cos(newAng) * speed; pr.vy = Math.sin(newAng) * speed;
      }
    } else if (pr.homing && pr.owner === 'enemy') {

      const speed = Math.hypot(pr.vx, pr.vy);
      const curAng = Math.atan2(pr.vy, pr.vx);
      const wantAng = Math.atan2(player.y - pr.y, player.x - pr.x);
      const turn = Math.min(1, 0.15 * pr.homing) * 5 * dt;
      const diff = normalizeAngle(wantAng - curAng);
      const newAng = curAng + Util.clamp(diff, -turn, turn);
      pr.vx = Math.cos(newAng) * speed; pr.vy = Math.sin(newAng) * speed;
    }
    const prevX = pr.x, prevY = pr.y;
    pr.x += pr.vx * dt; pr.y += pr.vy * dt; pr.life -= dt;
    const tx = Math.floor(pr.x / TILE), ty = Math.floor(pr.y / TILE);
    if (isTileSolidForEntity(node, tx, ty)) {

      if (pr.ricochet > 0) {
        pr.x = prevX; pr.y = prevY;
        const prevTx = Math.floor(prevX / TILE), prevTy = Math.floor(prevY / TILE);
        if (isTileSolidForEntity(node, tx, prevTy)) pr.vx = -pr.vx;
        if (isTileSolidForEntity(node, prevTx, ty)) pr.vy = -pr.vy;
        if (!isTileSolidForEntity(node, tx, prevTy) && !isTileSolidForEntity(node, prevTx, ty)) { pr.vx = -pr.vx; pr.vy = -pr.vy; }
        pr.ricochet--;
      } else {
        pr.dead = true;
      }
    }

    if (!pr.spectral) {
      for (const ob of node.obstacles) {
        if (ob.destroyed || ob.isPit || ob === pr.source) continue;
        if (ob.isWalkable) continue;
        if (ob.isHazard && !ob.attackable) continue;
        if (Util.circleIntersect(pr.x, pr.y, pr.radius, ob.x, ob.y, ob.radius - 2)) {
          if (ob.attackable && (pr.owner === 'player' || pr.owner === 'familiar')) damageObstacleHit(game, ob);
          pr.dead = true;
        }
      }
    }
    if (pr.life <= 0) pr.dead = true;
    if (pr.dead) { detonateExplosiveProjectile(game, pr); continue; }
    if (pr.owner === 'player' || pr.owner === 'familiar') {
      const isPlayerBolt = pr.owner === 'player';
      for (const e of node.enemies) {
        if (e.isDead || pr.hitEnemies.includes(e)) continue;
        if (Util.circleIntersect(pr.x, pr.y, pr.radius, e.x, e.y, e.radius)) {

          let dmg = pr.damage, crit = false;
          if (isPlayerBolt && player.critChance && RNG.random() < player.critChance) { dmg *= player.critMultiplier; crit = true; }
          if (e.isBoss && player.bossDamageBonus) dmg *= (1 + player.bossDamageBonus);
          if (isPlayerBolt) dmg *= playerMechanicDamageMult(player);
          const applied = e.takeDamage(dmg, pr.vx * 0.01, pr.vy * 0.01);
          if (applied) {

            if (isPlayerBolt) {
              player.onHitLanded(game);
              if (pr.statusScale) applyOnHitStatuses(game, e, pr.statusScale * playerMechanicStatusScale(player));
              else applyOnHitStatuses(game, e, playerMechanicStatusScale(player), pr.appliedStatus);
              if (player.nirikNature) gainNirikHeat(game);
              if (player.bassDrop) gainBeatCombo(game);
              if (player.prismBloom) gainPrismCharge(game);
            }
            else if (pr.statusScale) applyOnHitStatuses(game, e, pr.statusScale);
            Sound.play(crit ? 'crit' : 'enemyHit');
            if (crit) { bumpStat('critsLanded', 1, game); if (game.runStats) game.runStats.crits++; e._lastHitCrit = true; }
            game.floatTexts.push(new FloatText(e.x, e.y - 20, (crit ? 'CRIT ' : '') + dmg, crit ? '#ffcf5c' : '#fff', true));

            if (isPlayerBolt && player.arcaneEcho && !pr.isSplitChild) {
              player.arcaneEchoHits = (player.arcaneEchoHits || 0) + 1;
              if (player.arcaneEchoHits >= ARCANE_ECHO_INTERVAL) {
                player.arcaneEchoHits = 0;
                spawnArcaneEcho(game, pr, e);
              }
            }

            if (pr.chainLightning > 0) {
              let ce = null, cd = 140;
              for (const o of node.enemies) {
                if (o === e || o.isDead) continue;
                const d = Util.dist(e.x, e.y, o.x, o.y);
                if (d < cd) { cd = d; ce = o; }
              }
              if (ce) {
                const cdmg = Math.max(1, Math.round(dmg * Math.min(1.5, 0.5 * pr.chainLightning)));
                const cApplied = ce.takeDamage(cdmg, 0, 0);
                if (cApplied) {
                  game.floatTexts.push(new FloatText(ce.x, ce.y - 20, cdmg, '#8fd8ff', true));
                  if (ce.isDead) handleEnemyDeath(game, ce);
                }

                game.laserFX = { x1: e.x, y1: e.y, x2: ce.x, y2: ce.y, life: 0.16, maxLife: 0.16, color: '#8fd8ff', width: 2 };
              }
            }

            if (pr.splitOnHit > 0 && !pr.isSplitChild && isPlayerBolt) {
              const baseAng = Math.atan2(pr.vy, pr.vx) || 0;
              const spd = Math.hypot(pr.vx, pr.vy) || 200;
              for (const off of [-0.61, 0.61]) {
                const a = baseAng + off;
                const child = new Projectile(e.x, e.y, Math.cos(a) * spd, Math.sin(a) * spd,
                  Math.max(1, Math.round(pr.damage * 0.5)), 'player',
                  { color: pr.color, radius: pr.radius * 0.6, life: 0.7,
                    homing: (pr.homing || 0) * 0.5, spectral: pr.spectral,
                    chainLightning: pr.chainLightning, isSplitChild: true });
                child.shape = 'round';
                game.projectiles.push(child);
              }
            }

            if (pr.knockbackPulse > 0 && !e.isDead) {
              const kang = Math.atan2(pr.vy, pr.vx) || 0;
              const kmag = 2.2 * pr.knockbackPulse;
              e.knockX = (e.knockX || 0) + Math.cos(kang) * kmag;
              e.knockY = (e.knockY || 0) + Math.sin(kang) * kmag;
            }

            if (pr.pullPulse > 0 && !e.isDead) {
              const pang = Math.atan2(pr.vy, pr.vx) || 0;
              const pmag = 2.2 * pr.pullPulse;
              e.knockX = (e.knockX || 0) - Math.cos(pang) * pmag;
              e.knockY = (e.knockY || 0) - Math.sin(pang) * pmag;
            }

            if (pr.chaosStatus > 0 && isPlayerBolt) {
              const pool = ['freezeChance', 'venomChance', 'stunChance', 'charmChance', 'fearChance'];
              applyOnHitStatuses(game, e, undefined, pool[Math.floor(Math.random() * pool.length)]);
            }

            if (pr.creepOnHit > 0 && isPlayerBolt) {
              game.creep.push(new Creep(e.x, e.y, 28, 4, 'venom', 'player'));
            }

            if (e.isDead) { if (isPlayerBolt) bumpStat('rangedKills', 1, game); handleEnemyDeath(game, e); }

            if (isPlayerBolt && pr.attackTrigger) runHitLayers(game, pr.attackTrigger, { x: e.x, y: e.y, ang: Math.atan2(pr.vy, pr.vx), hits: [e], dmg });
          }

          pr.hitEnemies.push(e);
          if (pr.pierce > 0) pr.pierce--; else pr.dead = true;
          if (pr.dead) break;
        }
      }
    } else {

      const fromTurret = !!(pr.source && pr.source.type && pr.source.type.behavior === 'turret');
      let hitWisp = false;
      if (!fromTurret) for (const f of player.familiars) {
        if (f.hp == null || f.dead) continue;
        if (Util.circleIntersect(pr.x, pr.y, pr.radius, f.x, f.y, 9)) {
          f.hp -= 1;
          if (f.hp <= 0) resolveWispLethalHit(player, f);
          pr.dead = true;
          hitWisp = true;
          break;
        }
      }
      if (!hitWisp && Util.circleIntersect(pr.x, pr.y, pr.radius, player.x, player.y, player.radius)) {
        pr.dead = true;

        const srcId = pr.source ? (pr.source.type ? pr.source.type.id : pr.source.kind) : null;

        damagePlayer(game, playerDamageAmount(game, pr.fromBoss, pr.damage), srcId);
      }
    }
    if (pr.dead) detonateExplosiveProjectile(game, pr);
  }

  if (player.tearFlags && player.tearFlags.tearShield > 0) {
    for (const pr of game.projectiles) {
      if (pr.dead || (pr.owner !== 'player' && pr.owner !== 'familiar')) continue;
      for (const bolt of game.projectiles) {
        if (bolt.dead || bolt.owner !== 'enemy') continue;
        if (!Util.circleIntersect(pr.x, pr.y, pr.radius, bolt.x, bolt.y, bolt.radius)) continue;
        if (Math.random() >= player.tearFlags.tearShield) continue;
        pr.dead = true; bolt.dead = true;
        break;
      }
    }
  }
  game.projectiles = game.projectiles.filter(p => !p.dead);
}

function placeBombAt(game, x, y, owner, isBonusBomb){
  if (owner === 'player' && !game.player.unlimitedBombsFloor && !game.player.unlimitedBombsAlways) {
    if (game.player.bombs <= 0) return false;
    game.player.bombs--;
  }
  const bomb = new Bomb(x, y, owner);

  if (owner === 'player' && game.player.bombFuseTimeMult !== 1) bomb.timer *= game.player.bombFuseTimeMult;
  game.bombs.push(bomb);
  Sound.play('bombPlace');
  bumpStat('bombsPlaced', 1, game);

  if (owner === 'player' && !isBonusBomb && game.player.chadDoubleBombChance && RNG.random() < game.player.chadDoubleBombChance) {
    const ang = RNG.random() * Math.PI * 2;
    placeBombAt(game, x + Math.cos(ang) * 24, y + Math.sin(ang) * 24, 'player', true);
  }
  return true;
}

function updateBombs(game, dt){
  for (const b of game.bombs) {
    if (b.exploded) continue;
    b.timer -= dt;
    if (b.timer <= 0) { b.exploded = true; detonateBomb(game, b); }
  }
  game.bombs = game.bombs.filter(b => !b.exploded);
}

function detonateExplosiveProjectile(game, pr){
  if (!pr.explosive || pr.exploded) return;
  pr.exploded = true;
  explodeAt(game, pr.x, pr.y, 22 + 12 * pr.explosive);
}

function detonateBomb(game, bomb){
  const R = 92 * (game.player.bombRadiusMult || 1);

  const dmgMult = bomb.owner === 'player' ? (game.player.bombDamageMult || 1) : 1;
  explodeAt(game, bomb.x, bomb.y, R, dmgMult);
}

const ARCANE_ECHO_INTERVAL = 4;
const ARCANE_ECHO_RANGE = 240;
const ARCANE_ECHO_DAMAGE_MULT = 0.6;

function spawnArcaneEcho(game, pr, hitEnemy){
  const node = game.currentRoom;
  let target = null, best = ARCANE_ECHO_RANGE;
  for (const o of node.enemies) {
    if (o === hitEnemy || o.isDead) continue;
    const d = Util.dist(hitEnemy.x, hitEnemy.y, o.x, o.y);
    if (d < best) { best = d; target = o; }
  }
  const ang = target ? Math.atan2(target.y - hitEnemy.y, target.x - hitEnemy.x)
                     : (Math.atan2(pr.vy, pr.vx) || 0) + Math.PI;
  const spd = Math.max(180, Math.hypot(pr.vx, pr.vy) * 0.8);
  const echo = new Projectile(hitEnemy.x, hitEnemy.y, Math.cos(ang) * spd, Math.sin(ang) * spd,
    Math.max(1, Math.round(pr.damage * ARCANE_ECHO_DAMAGE_MULT)), 'player',
    { color: '#d9b6ff', radius: pr.radius * 0.8, life: 1.0, homing: 0.9,
      spectral: pr.spectral, isSplitChild: true });
  echo.hitEnemies.push(hitEnemy);
  game.projectiles.push(echo);
  Sound.play('rangedShot');
}

function explodeAt(game, x, y, R, dmgMult){
  const node = game.currentRoom, player = game.player;
  game.explosions.push(new Explosion(x, y, R));
  Sound.play('explosion');

  const blastDmg = Math.max(1, Math.round(explosionDamage(game.dungeon.floorNum) * (dmgMult || 1)));
  for (const e of node.enemies) {
    if (e.isDead) continue;
    if (Util.dist(x, y, e.x, e.y) < R + e.radius) {
      const applied = e.takeDamage(blastDmg, (e.x - x) * 0.06, (e.y - y) * 0.06);
      if (applied && e.isDead) handleEnemyDeath(game, e);
    }
  }

  if (!player.passives.blastplating && player.trinketId !== 'blastward'
      && player.attackType !== 'melee' && Util.dist(x, y, player.x, player.y) < R + player.radius) damagePlayer(game, playerDamageAmount(game, false), 'explosion');

  for (const ob of node.obstacles) {
    if (ob.destroyed || (!ob.destructible && !ob.attackable)) continue;
    if (Util.dist(x, y, ob.x, ob.y) < R + ob.radius) {
      ob.destroyed = true;
      Sound.play('obstacleDestroy');
      bumpStat('obstaclesDestroyed', 1, game);
      bumpBestiaryCount('objectsDestroyed', ob.kind, 1);

      if (ob.def.heartDropChance) {
        const fd = fireHeartDrop(ob.kind);
        if (fd) { if (Util.chance(fd.chance)) node.pickups.push(new Pickup(fd.id, ob.tx, ob.ty)); }
        else if (Util.chance(ob.def.heartDropChance)) node.pickups.push(new Pickup('heartRed', ob.tx, ob.ty));
      }
      if (ob.kind === 'rock' || ob.kind === 'tallrock') {
        bumpStat('rocksBombed', 1, game);
        if (player.passives.prospectorspick) node.pickups.push(new Pickup('coin', ob.tx, ob.ty, Util.weighted(wdCoinPool(game, COIN_TYPES))));

        else if (player.trinketId === 'prospectorschip' && Util.chance(0.5)) node.pickups.push(new Pickup('coin', ob.tx, ob.ty, Util.weighted(wdCoinPool(game, COIN_TYPES))));
      } else if (ob.kind === 'tintedrock') {
        bumpStat('rocksBombed', 1, game);
        const roll = RNG.random();
        if (roll < 0.75) {
          for (let i = 0; i < 2; i++) {
            const s = findClearFloorSpot(node, ob.tx + Util.randi(-1, 1), ob.ty + Util.randi(-1, 1));
            node.pickups.push(new Pickup('heartBlue', s.x, s.y));
          }
        } else if (roll < 0.95) {
          node.pickups.push(new Pickup('coin', ob.tx, ob.ty, wdCoinDef(game, COIN_TYPES.find(c => c.id === 'dime'))));
        } else {
          addItemPedestal(node, ITEMS.damageup, ob.tx, ob.ty);
        }

      } else if (ob.kind === 'luckcrystal') {
        bumpStat('rocksBombed', 1, game);
        const roll = RNG.random();
        if (roll < 0.70) {
          for (let i = 0; i < 2; i++) {
            const s = findClearFloorSpot(node, ob.tx + Util.randi(-1, 1), ob.ty + Util.randi(-1, 1));
            node.pickups.push(new Pickup('coin', s.x, s.y, Util.weighted(wdCoinPool(game, COIN_TYPES))));
          }
        } else if (roll < 0.95) {
          node.pickups.push(new Pickup('coin', ob.tx, ob.ty, COIN_TYPES.find(c => c.id === 'luckypenny')));
        } else {
          addItemPedestal(node, ITEMS.luckup, ob.tx, ob.ty);
        }
      } else if (ob.def.explodesOnDestroy) {
        bumpStat('bombBarrelsDetonated', 1, game);
        explodeAt(game, ob.x, ob.y, R);
      } else if (ob.kind.indexOf('turret') === 0) {
        bumpStat('turretsDestroyed', 1, game);
      }
    }
  }

  for (const slot of node.doorSlots) {
    if ((slot.type !== 'secret' && slot.type !== 'supersecret') || slot.opened || !slot.cells) continue;
    for (const c of slot.cells) {
      const cx = c.x * TILE + TILE / 2, cy = c.y * TILE + TILE / 2;
      if (Util.dist(x, y, cx, cy) < R + 20) { openSecretPassage(game, slot); break; }
    }
  }

  for (const c of node.chests) {
    if (c.opened || c.def.requires !== 'bomb') continue;
    if (Util.dist(x, y, c.x, c.y) < R + c.radius) openChestContents(game, c);
  }
}

function destroyAllObstacles(game){
  const node = game.currentRoom, player = game.player;
  for (const ob of node.obstacles) {
    if (ob.destroyed || (!ob.destructible && !ob.attackable)) continue;
    ob.destroyed = true;
    Sound.play('obstacleDestroy');
    bumpStat('obstaclesDestroyed', 1, game);
    bumpBestiaryCount('objectsDestroyed', ob.kind, 1);

    if (ob.def.heartDropChance) {
      const fd = fireHeartDrop(ob.kind);
      if (fd) { if (Util.chance(fd.chance)) node.pickups.push(new Pickup(fd.id, ob.tx, ob.ty)); }
      else if (Util.chance(ob.def.heartDropChance)) node.pickups.push(new Pickup('heartRed', ob.tx, ob.ty));
    }
    if (ob.kind === 'rock' || ob.kind === 'tallrock') {
      bumpStat('rocksBombed', 1, game);
      if (player.passives.prospectorspick) node.pickups.push(new Pickup('coin', ob.tx, ob.ty, Util.weighted(wdCoinPool(game, COIN_TYPES))));
    } else if (ob.kind === 'tintedrock') {
      bumpStat('rocksBombed', 1, game);
      const roll = RNG.random();
      if (roll < 0.75) {
        for (let i = 0; i < 2; i++) {
          const s = findClearFloorSpot(node, ob.tx + Util.randi(-1, 1), ob.ty + Util.randi(-1, 1));
          node.pickups.push(new Pickup('heartBlue', s.x, s.y));
        }
      } else if (roll < 0.95) {
        node.pickups.push(new Pickup('coin', ob.tx, ob.ty, wdCoinDef(game, COIN_TYPES.find(c => c.id === 'dime'))));
      } else {
        addItemPedestal(node, ITEMS.damageup, ob.tx, ob.ty);
      }

    } else if (ob.kind === 'luckcrystal') {
      bumpStat('rocksBombed', 1, game);
      const roll = RNG.random();
      if (roll < 0.70) {
        for (let i = 0; i < 2; i++) {
          const s = findClearFloorSpot(node, ob.tx + Util.randi(-1, 1), ob.ty + Util.randi(-1, 1));
          node.pickups.push(new Pickup('coin', s.x, s.y, Util.weighted(wdCoinPool(game, COIN_TYPES))));
        }
      } else if (roll < 0.95) {
        node.pickups.push(new Pickup('coin', ob.tx, ob.ty, COIN_TYPES.find(c => c.id === 'luckypenny')));
      } else {
        addItemPedestal(node, ITEMS.luckup, ob.tx, ob.ty);
      }
    } else if (ob.def.explodesOnDestroy) {
      bumpStat('bombBarrelsDetonated', 1, game);
      explodeAt(game, ob.x, ob.y, 92 * (player.bombRadiusMult || 1));
    } else if (ob.kind.indexOf('turret') === 0) {
      bumpStat('turretsDestroyed', 1, game);
    }
  }
}

