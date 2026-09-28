'use strict';

const FAMILIAR_DMG_GROWTH = 1.15;

function familiarDamage(baseDmg, floorNum, player){
  const mult = (player && player.familiarDamageMult) || 1;
  return Math.max(1, Math.round((baseDmg || 1) * Math.pow(FAMILIAR_DMG_GROWTH, floorNum || 0) * mult));
}

function familiarRateMult(player){
  if (player.trinketId === 'swarmcollar') return 0.85;
  if (player.trinketId === 'sk8t_stormcollar') return 0.88;
  return 1;
}

const WISP_FORMATION_ROTATE_SPEED = 2.2;
function updateFamiliars(game, dt){

  if (game.player.familiars.some(f => f.def.behavior === 'wisp')) {
    game.player.wispFormationAngle += WISP_FORMATION_ROTATE_SPEED * dt;
  }
  for (const f of game.player.familiars) {
    if (f.def.behavior === 'orbiter') updateOrbiterFamiliar(game, f, dt);
    else if (f.def.behavior === 'shooter') updateShooterFamiliar(game, f, dt);
    else if (f.def.behavior === 'proc') updateProcFamiliar(game, f, dt);
    else if (f.def.behavior === 'blocker') updateBlockerFamiliar(game, f, dt);
    else if (f.def.behavior === 'thief') updateThiefFamiliar(game, f, dt);
    else if (f.def.behavior === 'grower') updateGrowerFamiliar(game, f, dt);
    else if (f.def.behavior === 'detonator') updateDetonatorFamiliar(game, f, dt);
    else if (f.def.behavior === 'mirror') updateMirrorFamiliar(game, f, dt);
    else if (f.def.behavior === 'scavenger') updateScavengerFamiliar(game, f, dt);
    else if (f.def.behavior === 'berserker') updateBerserkerFamiliar(game, f, dt);
    else if (f.def.behavior === 'swarmer') updateSwarmerFamiliar(game, f, dt);
    else if (f.def.behavior === 'wisp') updateWispFamiliar(game, f, dt);
  }

  if (game.player.familiars.some(f => f.dead)) {
    game.player.familiars = game.player.familiars.filter(f => !f.dead);
  }
}

const WISP_CARDINAL_ANGLES = [0, Math.PI / 2, Math.PI, -Math.PI / 2];

const WISP_RING_CAPACITY = 6;
const WISP_RING_SPACING = 24;

function wispFormationPosition(game, f, player){
  const wisps = liveWisps(player);
  const rank = wisps.indexOf(f);
  const ring = Math.floor(rank / WISP_RING_CAPACITY);
  const ringStart = ring * WISP_RING_CAPACITY;
  const countInRing = Math.min(WISP_RING_CAPACITY, wisps.length - ringStart);
  const posInRing = rank - ringStart;
  const radius = (f.def.radius || 34) + ring * WISP_RING_SPACING;

  const dir = ring % 2 === 0 ? 1 : -1;
  const angle = player.wispFormationAngle * dir + (Math.PI * 2 / countInRing) * posInRing;
  return { x: player.x + Math.cos(angle) * radius, y: player.y + Math.sin(angle) * radius };
}

const WISP_STATUS_SCALE = 0.2;
function updateWispFamiliar(game, f, dt){
  const player = game.player, node = game.currentRoom, def = f.def;

  if (f.buffTimer > 0) { f.buffTimer -= dt; if (f.buffTimer <= 0) f.buffMult = 1; }
  const pos = wispFormationPosition(game, f, player);
  f.x = pos.x; f.y = pos.y;

  const playerDmg = (player.attackType === 'melee' ? player.meleeDamage : player.rangedDamage) || 0;
  const wispDmgBase = playerDmg * (player.wispDamageRatio || 0.25);

  if (f.contactCooldown > 0) {
    f.contactCooldown -= dt;
  } else if (f.dyeNoContact) {

  } else {
    for (const e of node.enemies) {
      if (e.isDead) continue;
      if (Util.circleIntersect(f.x, f.y, 9, e.x, e.y, e.radius)) {
        const dmg = familiarDamage((wispDmgBase + (player.trinketId === 'houndwhistle' ? 1 : 0) + (f.augmentDmg || 0)) * (f.buffMult || 1) * (f.masteryDmgMult || 1), game.dungeon.floorNum, player);
        const applied = e.takeDamage(dmg, (e.x - f.x) * 0.04, (e.y - f.y) * 0.04);
        if (applied) {
          Sound.play('enemyHit');
          game.floatTexts.push(new FloatText(e.x, e.y - 20, String(dmg), '#fff', true));
          bumpBestiaryCount('familiarUseCount', def.id, 1, game);

          const freezeChance = (def.freezeChance || 0) + (f.augmentFreezeChance || 0);
          if (freezeChance && RNG.random() < freezeChance && !e.isBoss) { e.freezeTimer = Math.max(e.freezeTimer, 1.2); bumpStat('enemiesFrozen', 1, game); }
          applyOnHitStatuses(game, e, WISP_STATUS_SCALE);
          if (e.isDead) handleEnemyDeath(game, e);
        }

        f.contactCooldown = def.contactCooldown * familiarRateMult(player) * (f.dyeContactCooldownMult || 1);
        break;
      }
    }
  }
  f.wispShotTimer -= dt;
  if (f.wispShotTimer > 0) return;

  f.wispShotTimer = (def.wispShotCooldown || 1.4) * familiarRateMult(player) * (player.wispShotCooldownMult || 1) * (f.dyeShotCooldownMult || 1) * (f.augmentHasteMult || 1);
  const boltSpeed = def.boltSpeed || 260;

  const tearsPerDir = (f.tearCount || 1) + (f.augmentTears || 0);
  const speedMult = f.dyeShotSpeedMult || 1;
  const homing = f.dyeHoming || 0;
  const pierce = (f.dyePierce || 0) + (f.augmentPierce || 0);
  const explosive = f.dyeExplosive || 0;
  const dmg = familiarDamage((wispDmgBase + (f.augmentDmg || 0)) * (f.dyeDmgMult || 1) * (f.masteryDmgMult || 1), game.dungeon.floorNum, player);
  bumpBestiaryCount('familiarUseCount', def.id, 1, game);

  const mods = resolveTearMods(player, true);
  for (const ang of WISP_CARDINAL_ANGLES) {
    for (let i = 0; i < tearsPerDir; i++) {

      const a = tearsPerDir > 1 ? ang + (i - (tearsPerDir - 1) / 2) * 0.16 : ang;
      game.projectiles.push(new Projectile(
        f.x, f.y, Math.cos(a) * boltSpeed * speedMult * mods.speedMult, Math.sin(a) * boltSpeed * speedMult * mods.speedMult,
        dmg * mods.damageMult, 'familiar', { color: (f.dyeId && WISP_DYE_TYPES_BY_ID[f.dyeId].color) || def.color, radius: 4 * mods.radiusMult, homing, pierce, explosive, statusScale: WISP_STATUS_SCALE, sizeMult: mods.sizeMult }
      ));
    }
  }
  Sound.play('rangedShot');
}

const WISP_DYE_TYPES_BY_ID = {};
for (const _d of WISP_DYE_TYPES) WISP_DYE_TYPES_BY_ID[_d.id] = _d;
const WISP_AUGMENT_TYPES_BY_ID = {};
for (const _a of WISP_AUGMENT_TYPES) WISP_AUGMENT_TYPES_BY_ID[_a.id] = _a;

function liveWisps(player){
  return player.familiars.filter(f => f.def.behavior === 'wisp' && !f.dead);
}

const WISP_SWARM_MINIMUM = 2;
function resolveWispLethalHit(player, f){
  if (player.classId === 'snowpitymare' && liveWisps(player).filter(o => o !== f).length < WISP_SWARM_MINIMUM) {
    f.hp = 1;
    return;
  }
  f.dead = true;
}

function wispBaseHp(f, player){
  return (f.def.hp || 0) + ((player && player.wispHpBonus) || 0);
}

function recalcWispMaxHp(f, player){
  const base = wispBaseHp(f, player);
  f.maxHp = Math.max(1, base + (f.dyeHpDelta || 0) + (f.augmentHpBonus || 0));
}

function applyWispDye(game, dyeId){
  const player = game.player;
  const wisps = liveWisps(player);
  if (!wisps.length) { game.toast('No wisps to dye.'); Sound.play('uiDeny'); return; }
  const f = Util.choice(wisps);
  const baseHp = wispBaseHp(f, player);

  f.dyeId = dyeId;
  f.tearCount = 1;
  f.dyeHoming = 0;
  f.dyeShotSpeedMult = 1;
  f.dyeHpDelta = 0;
  f.dyeExplosive = 0;
  f.dyeContactCooldownMult = 1;
  f.dyePierce = 0;
  f.dyeNoContact = false;
  f.dyeShotCooldownMult = 1;
  f.dyeDmgMult = 1;
  switch (dyeId) {
    case 'reddye': f.tearCount = 2; f.dyeHpDelta = 1 - baseHp; break;
    case 'purpledye': f.dyeHoming = 1.8; f.dyeShotSpeedMult = 0.5; break;
    case 'golddye': f.tearCount = 3; break;
    case 'neondye': f.dyeHpDelta = 4 - baseHp; break;
    case 'blackdye': f.dyeExplosive = 1; f.dyeContactCooldownMult = 2; break;
    case 'bluedye': f.dyePierce = 2; f.dyeNoContact = true; break;
    case 'whitedye': f.dyeShotCooldownMult = 0.6; f.dyeHpDelta = -1; break;
    case 'orangedye': f.dyeDmgMult = 1.5; f.dyeShotCooldownMult = 2; break;
  }
  recalcWispMaxHp(f, player);
  f.hp = f.maxHp;
  const def = WISP_DYE_TYPES_BY_ID[dyeId];
  Sound.play('itemGet');
  game.toast(def.icon + ' ' + def.name + ' applied to a wisp!');
  game.floatTexts.push(new FloatText(f.x, f.y - 24, def.name, def.color));
}

function applyWispAugment(game, augmentId){
  const player = game.player;
  const wisps = liveWisps(player);
  if (!wisps.length) { game.toast('No wisps to augment.'); Sound.play('uiDeny'); return; }
  const f = Util.choice(wisps);
  f.augmentTears = f.augmentTears || 0;
  f.augmentDmg = f.augmentDmg || 0;
  f.augmentHpBonus = f.augmentHpBonus || 0;
  const healed = augmentId === 'healthaugment' || augmentId === 'goldaugment';
  if (augmentId === 'tearsaugment' || augmentId === 'goldaugment') f.augmentTears += 1;
  if (augmentId === 'damageaugment' || augmentId === 'goldaugment') f.augmentDmg += 1;
  if (healed) f.augmentHpBonus += 1;

  if (augmentId === 'pierceaugment') f.augmentPierce = (f.augmentPierce || 0) + 1;
  if (augmentId === 'hasteaugment') {

    f.augmentHasteBonus = Math.min(0.5, (f.augmentHasteBonus || 0) + 0.1);
    f.augmentHasteMult = 1 - f.augmentHasteBonus;
  }
  if (augmentId === 'freezeaugment') f.augmentFreezeChance = (f.augmentFreezeChance || 0) + 0.05;
  recalcWispMaxHp(f, player);
  if (healed) f.hp = Math.min(f.maxHp, (f.hp != null ? f.hp : f.maxHp) + 1);
  const def = WISP_AUGMENT_TYPES_BY_ID[augmentId];
  Sound.play('itemGet');
  game.toast(def.icon + ' ' + def.name + ' applied to a wisp!');
  game.floatTexts.push(new FloatText(f.x, f.y - 24, def.name, def.color));
}

function updateOrbiterFamiliar(game, f, dt){
  const player = game.player, node = game.currentRoom, def = f.def;

  if (f.buffTimer > 0) { f.buffTimer -= dt; if (f.buffTimer <= 0) f.buffMult = 1; }
  f.angle += def.orbitSpeed * dt;
  f.x = player.x + Math.cos(f.angle) * def.radius;
  f.y = player.y + Math.sin(f.angle) * def.radius;
  if (f.contactCooldown > 0) { f.contactCooldown -= dt; return; }
  for (const e of node.enemies) {
    if (e.isDead) continue;
    if (Util.circleIntersect(f.x, f.y, 9, e.x, e.y, e.radius)) {

      const dmg = familiarDamage((def.dmg + (player.trinketId === 'houndwhistle' ? 1 : 0) + (f.augmentDmg || 0)) * (f.buffMult || 1) * (f.masteryDmgMult || 1), game.dungeon.floorNum, player);
      const applied = e.takeDamage(dmg, (e.x - f.x) * 0.04, (e.y - f.y) * 0.04);
      if (applied) {
        Sound.play('enemyHit');
        game.floatTexts.push(new FloatText(e.x, e.y - 20, String(dmg), '#fff', true));
        bumpBestiaryCount('familiarUseCount', def.id, 1, game);
        if (def.freezeChance && RNG.random() < def.freezeChance && !e.isBoss) { e.freezeTimer = Math.max(e.freezeTimer, 1.2); bumpStat('enemiesFrozen', 1, game); }
        if (e.isDead) handleEnemyDeath(game, e);
      }
      f.contactCooldown = def.contactCooldown * familiarRateMult(player);
      break;
    }
  }
}

function updateShooterFamiliar(game, f, dt){
  const player = game.player, node = game.currentRoom, def = f.def;

  if (f.buffTimer > 0) { f.buffTimer -= dt; if (f.buffTimer <= 0) f.buffMult = 1; }

  f.angle += 0.6 * dt;
  const homeX = player.x + Math.cos(f.angle) * 30, homeY = player.y + Math.sin(f.angle) * 30 - 10;
  f.x += (homeX - f.x) * Math.min(1, dt * 4);
  f.y += (homeY - f.y) * Math.min(1, dt * 4);
  f.fireTimer -= dt;
  if (f.fireTimer > 0) return;
  let nearest = null, nearestD = Infinity;
  for (const e of node.enemies) {
    if (e.isDead) continue;
    const d = Util.dist2(f.x, f.y, e.x, e.y);
    if (d < nearestD) { nearestD = d; nearest = e; }
  }

  if (!nearest || nearestD > 300 * 300) { f.fireTimer = 0.3; return; }

  f.fireTimer = def.cooldown * familiarRateMult(player);
  const ang = Math.atan2(nearest.y - f.y, nearest.x - f.x);
  bumpBestiaryCount('familiarUseCount', def.id, 1, game);

  const fmods = resolveTearMods(player, true);
  game.projectiles.push(new Projectile(
    f.x, f.y, Math.cos(ang) * def.boltSpeed * fmods.speedMult, Math.sin(ang) * def.boltSpeed * fmods.speedMult,
    familiarDamage((def.dmg + (player.trinketId === 'houndwhistle' ? 1 : 0)) * (f.buffMult || 1) * (f.masteryDmgMult || 1), game.dungeon.floorNum, player) * fmods.damageMult, 'familiar',
    { color: def.color, radius: 4 * fmods.radiusMult, sizeMult: fmods.sizeMult }
  ));
}

function updateProcFamiliar(game, f, dt){
  const player = game.player, def = f.def;
  const homeX = player.x - 26, homeY = player.y - 30 - f.index * 4;
  f.x += (homeX - f.x) * Math.min(1, dt * 3);
  f.y += (homeY - f.y) * Math.min(1, dt * 3);
  f.procTimer -= dt;
  if (f.procTimer > 0) return;
  f.procTimer = def.interval;
  bumpBestiaryCount('familiarUseCount', def.id, 1, game);
  switch (def.procType) {
    case 'heal':
      if (player.redCurrent < player.redMax) {
        player.heal(def.amount);
        game.floatTexts.push(new FloatText(player.x, player.y - 30, '+heart', '#e35b6a'));
        Sound.play('heart');
      }
      break;
    case 'coin': {
      const spot = findClearFloorSpot(game.currentRoom, Math.floor(player.x / TILE), Math.floor(player.y / TILE));
      game.currentRoom.pickups.push(new Pickup('coin', spot.x, spot.y, Util.weighted(COIN_TYPES)));
      break;
    }
    case 'luckpulse':
      player.luckyPennies += def.amount;
      recalcPlayerStats(player);
      game.floatTexts.push(new FloatText(player.x, player.y - 30, '+' + def.amount + ' Luck', '#7fd66a'));
      Sound.play('itemGet');
      break;
    case 'charge':
      if (player.activeItem && player.activeCharge < player.activeItem.maxCharge) {
        player.activeCharge = Math.min(player.activeItem.maxCharge, player.activeCharge + def.amount);
        game.floatTexts.push(new FloatText(player.x, player.y - 30, '+charge', '#7fd6c9'));
        Sound.play('battery');
      }
      break;
  }
}

function updateBlockerFamiliar(game, f, dt){
  const player = game.player, def = f.def;
  const homeX = player.x + 26, homeY = player.y - 30 - f.index * 4;
  f.x += (homeX - f.x) * Math.min(1, dt * 3);
  f.y += (homeY - f.y) * Math.min(1, dt * 3);
  f.procTimer -= dt;
  if (f.procTimer > 0) return;
  f.procTimer = def.interval;
  const max = def.maxShields || 1;
  if (player.shieldHits >= max) return;
  player.shieldHits = Math.min(max, player.shieldHits + 1);
  game.floatTexts.push(new FloatText(player.x, player.y - 30, '+shield', '#7fd6e0'));
  Sound.play('shieldBlock');
  bumpBestiaryCount('familiarUseCount', def.id, 1, game);
}

function updateThiefFamiliar(game, f, dt){
  const player = game.player, node = game.currentRoom, def = f.def;
  f.angle += def.orbitSpeed * dt;
  f.x = player.x + Math.cos(f.angle) * def.radius;
  f.y = player.y + Math.sin(f.angle) * def.radius;
  if (f.contactCooldown > 0) { f.contactCooldown -= dt; return; }
  for (const e of node.enemies) {
    if (e.isDead) continue;
    if (Util.circleIntersect(f.x, f.y, 9, e.x, e.y, e.radius)) {
      const dmg = familiarDamage((def.dmg + (player.trinketId === 'houndwhistle' ? 1 : 0)) * (f.masteryDmgMult || 1), game.dungeon.floorNum, player);
      const applied = e.takeDamage(dmg, (e.x - f.x) * 0.04, (e.y - f.y) * 0.04);
      if (applied) {
        Sound.play('enemyHit');
        game.floatTexts.push(new FloatText(e.x, e.y - 20, String(dmg), '#fff', true));
        bumpBestiaryCount('familiarUseCount', def.id, 1, game);
        if (RNG.random() < (def.stealChance || 0.1)) {
          const spot = findClearFloorSpot(node, Math.floor(e.x / TILE), Math.floor(e.y / TILE));
          node.pickups.push(new Pickup('coin', spot.x, spot.y, Util.weighted(COIN_TYPES)));
          game.floatTexts.push(new FloatText(e.x, e.y - 32, 'stolen!', '#e3c15b'));
        }
        if (e.isDead) handleEnemyDeath(game, e);
      }
      f.contactCooldown = def.contactCooldown * familiarRateMult(player);
      break;
    }
  }
}

function updateGrowerFamiliar(game, f, dt){
  const player = game.player, node = game.currentRoom, def = f.def;
  f.angle += def.orbitSpeed * dt;
  f.x = player.x + Math.cos(f.angle) * def.radius;
  f.y = player.y + Math.sin(f.angle) * def.radius;
  if (f.contactCooldown > 0) { f.contactCooldown -= dt; return; }
  const steps = Math.floor((game.runKills || 0) / (def.killsPerGrowth || 15));
  const mult = Math.min(def.maxGrowth || 3, 1 + steps * (def.growthStep || 0.25));
  for (const e of node.enemies) {
    if (e.isDead) continue;
    if (Util.circleIntersect(f.x, f.y, 9, e.x, e.y, e.radius)) {
      const base = (def.dmg + (player.trinketId === 'houndwhistle' ? 1 : 0)) * mult * (f.masteryDmgMult || 1);
      const dmg = familiarDamage(base, game.dungeon.floorNum, player);
      const applied = e.takeDamage(dmg, (e.x - f.x) * 0.04, (e.y - f.y) * 0.04);
      if (applied) {
        Sound.play('enemyHit');
        game.floatTexts.push(new FloatText(e.x, e.y - 20, String(dmg), '#fff', true));
        bumpBestiaryCount('familiarUseCount', def.id, 1, game);
        if (e.isDead) handleEnemyDeath(game, e);
      }
      f.contactCooldown = def.contactCooldown * familiarRateMult(player);
      break;
    }
  }
}

function updateDetonatorFamiliar(game, f, dt){
  const player = game.player, node = game.currentRoom, def = f.def;
  f.angle += 0.8 * dt;
  const homeX = player.x + Math.cos(f.angle) * 34, homeY = player.y + Math.sin(f.angle) * 34;
  f.x += (homeX - f.x) * Math.min(1, dt * 3);
  f.y += (homeY - f.y) * Math.min(1, dt * 3);
  f.procTimer -= dt;
  if (f.procTimer > 0) return;
  f.procTimer = def.interval * familiarRateMult(player);
  const radius = def.radius || 70;
  const dmg = familiarDamage((def.dmg + (player.trinketId === 'houndwhistle' ? 1 : 0)) * (f.masteryDmgMult || 1), game.dungeon.floorNum, player);
  Sound.play('bombExplode');
  bumpBestiaryCount('familiarUseCount', def.id, 1, game);
  for (const e of node.enemies) {
    if (e.isDead) continue;
    if (Util.dist(f.x, f.y, e.x, e.y) > radius + e.radius) continue;
    const applied = e.takeDamage(dmg, (e.x - f.x) * 0.05, (e.y - f.y) * 0.05);
    if (applied) {
      game.floatTexts.push(new FloatText(e.x, e.y - 20, String(dmg), '#fff', true));
      if (e.isDead) handleEnemyDeath(game, e);
    }
  }
}

function updateMirrorFamiliar(game, f, dt){
  const player = game.player, node = game.currentRoom, def = f.def;
  f.angle += 0.6 * dt;
  const homeX = player.x + Math.cos(f.angle) * 30, homeY = player.y + Math.sin(f.angle) * 30 - 10;
  f.x += (homeX - f.x) * Math.min(1, dt * 4);
  f.y += (homeY - f.y) * Math.min(1, dt * 4);
  f.fireTimer -= dt;
  if (f.fireTimer > 0) return;
  const aim = Math.atan2(player.facing.y, player.facing.x);
  const range = def.range || 300;
  let best = null, bestDiff = Infinity;
  for (const e of node.enemies) {
    if (e.isDead) continue;
    if (Util.dist2(player.x, player.y, e.x, e.y) > range * range) continue;

    let diff = Math.atan2(e.y - player.y, e.x - player.x) - aim;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    diff = Math.abs(diff);
    if (diff < bestDiff) { bestDiff = diff; best = e; }
  }

  if (!best || bestDiff > (def.arc || 1.0)) { f.fireTimer = 0.3; return; }
  f.fireTimer = def.cooldown * familiarRateMult(player);
  const ang = Math.atan2(best.y - f.y, best.x - f.x);
  bumpBestiaryCount('familiarUseCount', def.id, 1, game);

  const fmods = resolveTearMods(player, true);
  game.projectiles.push(new Projectile(
    f.x, f.y, Math.cos(ang) * def.boltSpeed * fmods.speedMult, Math.sin(ang) * def.boltSpeed * fmods.speedMult,
    familiarDamage((def.dmg + (player.trinketId === 'houndwhistle' ? 1 : 0)) * (f.masteryDmgMult || 1), game.dungeon.floorNum, player) * fmods.damageMult, 'familiar',
    { color: def.color, radius: 4 * fmods.radiusMult, sizeMult: fmods.sizeMult }
  ));
}

function updateScavengerFamiliar(game, f, dt){
  const player = game.player, node = game.currentRoom, def = f.def;
  const homeX = player.x - 30, homeY = player.y + 18 + f.index * 4;
  f.x += (homeX - f.x) * Math.min(1, dt * 3);
  f.y += (homeY - f.y) * Math.min(1, dt * 3);
  f.procTimer -= dt;
  if (f.procTimer > 0) return;
  f.procTimer = def.interval;
  const radius = def.radius || 120;
  let nearest = null, nearestD = Infinity;
  for (const p of node.pickups) {
    if (p.collected) continue;
    const d = Util.dist2(player.x, player.y, p.x, p.y);
    if (d < nearestD && d < radius * radius) { nearestD = d; nearest = p; }
  }
  if (!nearest) return;
  collectPickup(game, nearest);
  node.pickups = node.pickups.filter(p => !p.collected);
  bumpBestiaryCount('familiarUseCount', def.id, 1, game);
}

function updateBerserkerFamiliar(game, f, dt){
  const player = game.player, node = game.currentRoom, def = f.def;
  f.angle += def.orbitSpeed * dt;
  f.x = player.x + Math.cos(f.angle) * def.radius;
  f.y = player.y + Math.sin(f.angle) * def.radius;
  if (f.contactCooldown > 0) { f.contactCooldown -= dt; return; }
  const frac = player.redMax > 0 ? Math.max(0, Math.min(1, player.redCurrent / player.redMax)) : 1;
  const mult = 1 + (def.berserkPower || 1) * (1 - frac);
  for (const e of node.enemies) {
    if (e.isDead) continue;
    if (Util.circleIntersect(f.x, f.y, 9, e.x, e.y, e.radius)) {
      const base = (def.dmg + (player.trinketId === 'houndwhistle' ? 1 : 0)) * mult * (f.masteryDmgMult || 1);
      const dmg = familiarDamage(base, game.dungeon.floorNum, player);
      const applied = e.takeDamage(dmg, (e.x - f.x) * 0.04, (e.y - f.y) * 0.04);
      if (applied) {
        Sound.play('enemyHit');
        game.floatTexts.push(new FloatText(e.x, e.y - 20, String(dmg), '#e35b6a', true));
        bumpBestiaryCount('familiarUseCount', def.id, 1, game);
        if (e.isDead) handleEnemyDeath(game, e);
      }
      f.contactCooldown = def.contactCooldown * familiarRateMult(player);
      break;
    }
  }
}

function updateSwarmerFamiliar(game, f, dt){
  const player = game.player, node = game.currentRoom, def = f.def;
  if (f.miniOrbs === undefined) f.miniOrbs = [];
  f.angle += 0.7 * dt;
  const homeX = player.x + Math.cos(f.angle) * 32, homeY = player.y + Math.sin(f.angle) * 32;
  f.x += (homeX - f.x) * Math.min(1, dt * 3);
  f.y += (homeY - f.y) * Math.min(1, dt * 3);
  f.procTimer -= dt;
  if (f.procTimer <= 0) {
    f.procTimer = def.interval;
    const count = def.orbCount || 3;
    for (let i = 0; i < count; i++) {
      f.miniOrbs.push({ angle: (Math.PI * 2 / count) * i, life: def.orbLife || 4, cd: 0 });
    }
  }
  if (!f.miniOrbs.length) return;
  const dmg = familiarDamage((def.dmg + (player.trinketId === 'houndwhistle' ? 1 : 0)) * (f.masteryDmgMult || 1), game.dungeon.floorNum, player);
  const orbRadius = def.orbRadius || 26;
  for (const orb of f.miniOrbs) {
    orb.life -= dt;
    orb.angle += (def.orbSpeed || 4.5) * dt;
    orb.x = f.x + Math.cos(orb.angle) * orbRadius;
    orb.y = f.y + Math.sin(orb.angle) * orbRadius;
    if (orb.cd > 0) { orb.cd -= dt; continue; }
    for (const e of node.enemies) {
      if (e.isDead) continue;
      if (!Util.circleIntersect(orb.x, orb.y, 6, e.x, e.y, e.radius)) continue;
      const applied = e.takeDamage(dmg, (e.x - orb.x) * 0.03, (e.y - orb.y) * 0.03);
      if (applied) {
        Sound.play('enemyHit');
        game.floatTexts.push(new FloatText(e.x, e.y - 20, String(dmg), '#fff', true));
        bumpBestiaryCount('familiarUseCount', def.id, 1, game);
        if (e.isDead) handleEnemyDeath(game, e);
      }
      orb.cd = def.contactCooldown || 0.5;
      break;
    }
  }
  f.miniOrbs = f.miniOrbs.filter(o => o.life > 0);
}
