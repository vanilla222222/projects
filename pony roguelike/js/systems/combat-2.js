'use strict';

function playerChargedBeamAttack(game, dt, input){
  const player = game.player;
  if (player.attackTimer > 0) { player.chargeTimer = 0; return; }
  player.chargeTimer += dt;
  if (player.chargeTimer < player.chargeTime) return;
  player.chargeTimer = 0;
  player.attackTimer = player.fireCooldown;

  if (player.crystalVolley || player.gemBreath || player.shardFan) playerCrystalVolleyAttack(game, input);
  else playerFireBreathAttack(game);
}

const CRYSTAL_VOLLEY_SPACING_DEFAULT = 34;
function playerCrystalVolleyAttack(game, input){
  const player = game.player;
  input = input || {};

  const count = player.crystalShardCount || 0;
  if (count <= 0) return;
  const offsets = [];
  const spacing = player.crystalVolleySpacing || CRYSTAL_VOLLEY_SPACING_DEFAULT;
  for (let i = 0; i < count; i++) offsets.push((i - (count - 1) / 2) * spacing);
  Sound.play('rangedShot');
  bumpStat('shotsFired', 1, game);

  let focusX, focusY;
  if (input.mouseActive) {
    focusX = input.mouseX + game.camX; focusY = input.mouseY + game.camY;
  } else {

    focusX = player.x + player.facing.x * player.rangeTiles * TILE;
    focusY = player.y + player.facing.y * player.rangeTiles * TILE;
  }
  const px = -player.facing.y, py = player.facing.x;

  const life = 999;
  const firedShards = [];

  const mods = resolveTearMods(player);
  const grantedScale = (player.def && player.def.crystalVolley) ? 1 : 0.5;
  for (const off of offsets) {
    const sx = player.x + px * off + player.facing.x * 10;
    const sy = player.y + py * off + player.facing.y * 10;

    let dx = focusX - sx, dy = focusY - sy;
    const len = Math.hypot(dx, dy);
    if (len < 0.001) { dx = player.facing.x; dy = player.facing.y; }
    else { dx /= len; dy /= len; }
    const appliedStatuses = rollTearStatus(player);
    const primaryStatus = appliedStatuses.includes(player.primedStatus) ? player.primedStatus : (appliedStatuses[0] || null);
    const proj = new Projectile(
      sx, sy, dx * player.boltSpeed * mods.speedMult, dy * player.boltSpeed * mods.speedMult, player.rangedDamage * mods.damageMult * grantedScale, 'player',
      { color: primaryStatus ? STATUS_TEAR_COLORS[primaryStatus] : '#a8e8ff', radius: 6 * mods.radiusMult, pierce: player.tearFlags.pierce, life,
        homing: player.tearFlags.homing, spectral: player.tearFlags.spectral, explosive: player.tearFlags.explosive,
        statusColor: primaryStatus ? STATUS_TEAR_COLORS[primaryStatus] : null, appliedStatus: appliedStatuses,
        shape: mods.shape, sizeMult: mods.sizeMult,
        chainLightning: player.tearFlags.chainLightning, splitOnHit: player.tearFlags.splitOnHit,
        knockbackPulse: player.tearFlags.knockbackPulse,
        pullPulse: player.tearFlags.pullPulse, chaosStatus: player.tearFlags.chaosStatus,
        creepOnHit: player.tearFlags.creepOnHit }
    );
    proj.attackTrigger = 'volley';
    if (mods.shapeDef.onSpawn) mods.shapeDef.onSpawn(proj);
    game.projectiles.push(proj);
    firedShards.push(proj);
  }
  runCastLayers(game, 'volley', { x: player.x, y: player.y, ang: Math.atan2(player.facing.y, player.facing.x), hits: [], dmg: player.rangedDamage, projectiles: firedShards });
}

function playerFireBreathAttack(game){
  const player = game.player, node = game.currentRoom;
  Sound.play('laserShot');
  bumpStat('shotsFired', 1, game);
  const ang = Math.atan2(player.facing.y, player.facing.x);
  const dx = Math.cos(ang), dy = Math.sin(ang);
  const maxDist = player.rangeTiles * TILE;
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
      if (!ob.attackable) continue;
      if (Util.circleIntersect(px, py, 2, ob.x, ob.y, ob.radius - 2)) hitObstacles.add(ob);
    }
  }
  for (const ob of hitObstacles) damageObstacleHit(game, ob);
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
    }
  }
  game.laserFX = { x1: player.x, y1: player.y, x2: player.x + dx * endDist, y2: player.y + dy * endDist, life: 0.16, maxLife: 0.16, color: '224,122,58', width: 8 };
}

function dealPlayerDamage(game, enemy, ang, opts){
  const player = game.player;
  let dmg = player.attackType === 'melee' ? player.meleeDamage : player.rangedDamage;
  if (opts && opts.dmgMult) dmg *= opts.dmgMult;
  let crit = false;
  if (player.critChance && RNG.random() < player.critChance) { dmg *= player.critMultiplier; crit = true; }
  if (enemy.isBoss && player.bossDamageBonus) dmg *= (1 + player.bossDamageBonus);
  if (player.overcharge && player.overchargeTimer > 0) dmg *= OVERCHARGE_DAMAGE_MULT;
  dmg *= playerMechanicDamageMult(player);
  const kx = Math.cos(ang) * 4, ky = Math.sin(ang) * 4;
  const applied = enemy.takeDamage(dmg, kx, ky);
  if (applied) {
    player.onHitLanded(game);
    Sound.play(crit ? 'crit' : 'enemyHit');
    if (crit) { bumpStat('critsLanded', 1, game); if (game.runStats) game.runStats.crits++; enemy._lastHitCrit = true; }
    applyOnHitStatuses(game, enemy, playerMechanicStatusScale(player));
    game.floatTexts.push(new FloatText(enemy.x, enemy.y - 20, (crit ? 'CRIT ' : '') + dmg, crit ? '#ffcf5c' : '#fff', true));
    if (player.overcharge) gainOverchargeCharge(game);
    if (player.nirikNature) gainNirikHeat(game);
    if (player.bassDrop) gainBeatCombo(game);
    if (player.prismBloom) gainPrismCharge(game);
    if (enemy.isDead) { bumpStat('meleeKills', 1, game); handleEnemyDeath(game, enemy); }
    else if (player.stoopKill) tryStoopExecute(game, enemy);
  }
  return applied;
}

function gainOverchargeCharge(game){
  const player = game.player;
  if (player.overchargeTimer > 0) return;
  player.overchargeMeter = (player.overchargeMeter || 0) + 1;
  if (player.overchargeMeter < OVERCHARGE_THRESHOLD) return;
  player.overchargeMeter = 0;
  player.overchargeTimer = OVERCHARGE_DURATION;
  Sound.play('battery');
  game.explosions.push(new Explosion(player.x, player.y, OVERCHARGE_FX_RADIUS));
  game.floatTexts.push(new FloatText(player.x, player.y - 30, 'OVERCHARGE', '#8fe8ff', true));
}

function tryStoopExecute(game, e){
  if (e.isBoss || !e.maxHp) return;
  if (e.hp > e.maxHp * STOOP_EXECUTE_FRACTION) return;
  const applied = e.takeDamage(e.hp, 0, 0);
  if (!applied) return;
  Sound.play('crit');
  game.explosions.push(new Explosion(e.x, e.y, STOOP_EXECUTE_FX_RADIUS));
  game.floatTexts.push(new FloatText(e.x, e.y - 30, 'RIPPED', '#e8c060', true));
  if (e.isDead) handleEnemyDeath(game, e);
}

function applyOnHitStatuses(game, enemy, scale, tearStatus){
  if (enemy.isBoss) return;
  scale = scale == null ? 1 : scale;
  const player = game.player;

  const sd = player.trinketId === 'hexbrand' ? 1.5 : 1;
  if (tearStatus !== undefined) {
    const statuses = Array.isArray(tearStatus) ? tearStatus : [tearStatus];
    for (const s of statuses) {
      if (s === 'venomChance') { enemy.poisonTimer = Math.max(enemy.poisonTimer, 4 * sd); if (enemy.poisonTickTimer <= 0) enemy.poisonTickTimer = 0.8; Sound.play('statusPoison'); }
      else if (s === 'stunChance') { enemy.stunTimer = Math.max(enemy.stunTimer, 2 * sd); Sound.play('statusStun'); }
      else if (s === 'charmChance') { enemy.charmTimer = Math.max(enemy.charmTimer, 4 * sd); bumpStat('enemiesCharmed', 1, game); Sound.play('statusCharm'); }
      else if (s === 'freezeChance') { enemy.freezeTimer = Math.max(enemy.freezeTimer, 1.5 * sd); bumpStat('enemiesFrozen', 1, game); Sound.play('statusFreeze'); }
      else if (s === 'fearChance') { enemy.fearTimer = Math.max(enemy.fearTimer, 2.5 * sd); Sound.play('statusFear'); }
      else if (s === 'vulnerableChance') { enemy.vulnerableTimer = Math.max(enemy.vulnerableTimer, 3 * sd); bumpStat('enemiesMarkedVulnerable', 1, game); Sound.play('statusStun'); }
    }
    return;
  }
  if (player.venomChance && RNG.random() < player.venomChance * scale) { enemy.poisonTimer = Math.max(enemy.poisonTimer, 4 * sd); if (enemy.poisonTickTimer <= 0) enemy.poisonTickTimer = 0.8; Sound.play('statusPoison'); }
  if (player.stunChance && RNG.random() < player.stunChance * scale) { enemy.stunTimer = Math.max(enemy.stunTimer, 2 * sd); Sound.play('statusStun'); }
  if (player.charmChance && RNG.random() < player.charmChance * scale) { enemy.charmTimer = Math.max(enemy.charmTimer, 4 * sd); bumpStat('enemiesCharmed', 1, game); Sound.play('statusCharm'); }
  if (player.freezeChance && RNG.random() < player.freezeChance * scale) { enemy.freezeTimer = Math.max(enemy.freezeTimer, 1.5 * sd); bumpStat('enemiesFrozen', 1, game); Sound.play('statusFreeze'); }
  if (player.fearChance && RNG.random() < player.fearChance * scale) { enemy.fearTimer = Math.max(enemy.fearTimer, 2.5 * sd); Sound.play('statusFear'); }

  if (player.vulnerableChance && RNG.random() < player.vulnerableChance * scale) { enemy.vulnerableTimer = Math.max(enemy.vulnerableTimer, 3 * sd); bumpStat('enemiesMarkedVulnerable', 1, game); Sound.play('statusStun'); }
}

const KEY_LOCKED_ROOM_TYPES = new Set(['treasure', 'shop', 'vault', 'star']);
function keyLockedRoomFor(node, slot){
  if (KEY_LOCKED_ROOM_TYPES.has(node.type) && !node.doorsOpen) return node;
  const other = slot.pairedSlot && slot.pairedSlot.room;
  if (other && KEY_LOCKED_ROOM_TYPES.has(other.type) && !other.doorsOpen) return other;
  return null;
}

function tryUnlockKeyDoor(game, node, lockedRoom){
  const player = game.player;
  if (player.keys > 0 || player.unlimitedKeysFloor) {
    if (!player.unlimitedKeysFloor) player.keys--;
    lockedRoom.doorsOpen = true;
    lockedRoom.tileLayerDirty = true;
    Sound.play('key');
    game.toast('Used a key to open the door.');
    bumpStat('keysUsed', 1, game);
    if (lockedRoom.type === 'vault') bumpStat('vaultsOpened', 1, game);
  } else if (node.keyToastCooldown <= 0) {
    node.keyToastCooldown = 1.5;
    Sound.play('uiDeny');
    game.toast('Locked — need a key.');
  }
}

const COIN_LOCKED_ROOM_TYPES = new Set(['arcade']);
const ARCADE_TOLL = 1;
function coinLockedRoomFor(node, slot){
  if (COIN_LOCKED_ROOM_TYPES.has(node.type) && !node.doorsOpen) return node;
  const other = slot.pairedSlot && slot.pairedSlot.room;
  if (other && COIN_LOCKED_ROOM_TYPES.has(other.type) && !other.doorsOpen) return other;
  return null;
}

function tryUnlockCoinDoor(game, node, lockedRoom){
  const player = game.player;
  if (player.coins >= ARCADE_TOLL) {
    player.coins -= ARCADE_TOLL;
    lockedRoom.doorsOpen = true;
    lockedRoom.tileLayerDirty = true;
    Sound.play('coin');
    game.toast('Paid 1c to enter.');
    bumpStat('coinsSpent', ARCADE_TOLL, game);
  } else if (node.keyToastCooldown <= 0) {

    node.keyToastCooldown = 1.5;
    Sound.play('uiDeny');
    game.toast('Locked — needs 1 coin.');
  }
}

function checkDoorTransition(game, dt){
  const node = game.currentRoom, player = game.player;
  if (node.keyToastCooldown > 0) node.keyToastCooldown -= dt;
  for (const slot of node.doorSlots) {
    if ((slot.type !== 'normal' && slot.type !== 'secret' && slot.type !== 'supersecret') || !slot.cells) continue;
    const cx = slot.cells.reduce((a, c) => a + c.x, 0) / slot.cells.length;
    const cy = slot.cells.reduce((a, c) => a + c.y, 0) / slot.cells.length;
    const px = cx * TILE + TILE / 2, py = cy * TILE + TILE / 2;
    const nearDoor = Util.dist(player.x, player.y, px, py) < 16;
    if (!nearDoor) continue;

    if (slot.type === 'normal') {
      const lockedRoom = keyLockedRoomFor(node, slot);
      if (lockedRoom) { tryUnlockKeyDoor(game, node, lockedRoom); return; }
      const coinLockedRoom = coinLockedRoomFor(node, slot);
      if (coinLockedRoom) { tryUnlockCoinDoor(game, node, coinLockedRoom); return; }
    }

    const isOpen = slot.type === 'normal' ? node.doorsOpen : !!slot.opened;
    if (!isOpen) continue;
    game.transitionThroughDoor(slot);
    return;
  }
}

function updatePickups(game, dt){
  const node = game.currentRoom, player = game.player;
  if (player.magnetRadius > 0) {
    for (const p of node.pickups) {
      if (p.collected) continue;
      const d = Util.dist(p.x, p.y, player.x, player.y);
      if (d > 1 && d < player.magnetRadius) {
        const pull = Math.min(d, 240 * dt);
        p.x += (player.x - p.x) / d * pull;
        p.y += (player.y - p.y) / d * pull;
      }
    }
  }
  let changed = false;
  for (const p of node.pickups) {
    if (p.collected) continue;
    if (Util.circleIntersect(p.x, p.y, p.radius, player.x, player.y, player.radius)) {
      collectPickup(game, p);
      changed = true;
    }
  }
  if (changed) node.pickups = node.pickups.filter(p => !p.collected);
}

function coinSoundName(coin){
  if (!coin) return 'coin';
  switch (coin.id) {
    case 'nickel': return 'coinNickel';
    case 'dime': return 'coinDime';
    case 'luckypenny': return 'coinLucky';
    default: return 'coin';
  }
}

function grantPickupEffect(game, kind, x, y, coin, pillColor, starId, wispDyeId, wispAugmentId){
  const player = game.player;

  if (kind !== 'coin' && kind !== 'pill' && kind !== 'star' && kind !== 'wispdye' && kind !== 'wispaugment') markBestiarySeen('seenPickupKinds', kind);
  switch (kind) {
    case 'coin': {
      const c = coin || Util.weighted(COIN_TYPES);

      markBestiarySeen('seenPickupKinds', c.id);

      if (c.wisp) { const wispDef = FAMILIAR_TYPES.snowwisp; if (wispDef) addFamiliar(game, wispDef); break; }
      const coinMult = (player.trinketId === 'cursedcoin' ? 1.2 : player.trinketId === 'copperring' ? 1.1
        : player.trinketId === 'stackedcoin' ? 1.15 : player.trinketId === 'barnaclecluster' ? 1.2
        : player.trinketId === 'wovenboots' ? 1.15 : player.trinketId === 'solarscroll' ? 1.15 : player.trinketId === 'copperbelt' ? 1.1
        : player.trinketId === 'merchantscoin' ? 1.1
        : player.trinketId === 'sk8t_giltclasp' ? 1.12
        : 1) + 0.2 * (player.passives.gluttonyscoin || 0)

        + 0.35 * (player.passives.dragonshoardshard || 0) + 0.15 * (player.passives.coincollectorsglove || 0)

        + 0.1 * (player.passives.etchedchain || 0)
        + 0.2 * (player.passives.vividcompass || 0);
      const value = Math.round(c.value * coinMult);
      player.coins += value;
      bumpStat('coinsCollected', value, game);
      Sound.play(coinSoundName(c));
      game.floatTexts.push(new FloatText(x, y, '+' + value + 'c', '#e3c15b'));
      if (c.luck) {
        player.luckyPennies += c.luck;
        recalcPlayerStats(player);
        game.floatTexts.push(new FloatText(x, y - 16, '+' + c.luck + ' Luck', '#7fd66a'));
      }
      break;
    }

    case 'key': { const n = player.trinketId === 'masterbit' ? 2 : 1; player.keys += n; Sound.play('key'); game.floatTexts.push(new FloatText(x, y, '+' + n + ' key' + (n > 1 ? 's' : ''), '#dcdcdc')); break; }
    case 'doublekey': player.keys += 2; Sound.play('key'); game.floatTexts.push(new FloatText(x, y, '+2 keys', '#dcdcdc')); break;
    case 'goldkey': player.unlimitedKeysFloor = true; Sound.play('key'); game.floatTexts.push(new FloatText(x, y, 'Unlimited keys!', '#e3c15b')); break;
    case 'bomb': { const n = (player.trinketId === 'powderflask' || player.trinketId === 'sk8t_direkegcharm') ? 2 : 1; player.bombs += n; Sound.play('bombPickup'); game.floatTexts.push(new FloatText(x, y, '+' + n + ' bomb' + (n > 1 ? 's' : ''), '#dcdcdc')); break; }
    case 'doublebomb': player.bombs += 2; Sound.play('bombPickup'); game.floatTexts.push(new FloatText(x, y, '+2 bombs', '#dcdcdc')); break;
    case 'goldbomb': player.unlimitedBombsFloor = true; Sound.play('bombPickup'); game.floatTexts.push(new FloatText(x, y, 'Unlimited bombs!', '#e3c15b')); break;
    case 'heartRed': player.heal(1); Sound.play('heart'); game.floatTexts.push(new FloatText(x, y, '+heart', '#e35b6a')); break;
    case 'heartBlue': player.healBlue(1); Sound.play('heart'); game.floatTexts.push(new FloatText(x, y, '+heart', '#5b9ee3')); break;
    case 'halfheartRed': player.heal(0.5); Sound.play('heart'); game.floatTexts.push(new FloatText(x, y, '+½ heart', '#e35b6a')); break;
    case 'halfheartBlue': player.healBlue(0.5); Sound.play('heart'); game.floatTexts.push(new FloatText(x, y, '+½ heart', '#5b9ee3')); break;
    case 'doubleheart': player.heal(2); Sound.play('heart'); game.floatTexts.push(new FloatText(x, y, '+2 hearts', '#e35b6a')); break;
    case 'heartContainer': player.grantHeartContainer(1); Sound.play('heartContainer'); game.floatTexts.push(new FloatText(x, y, '+container', '#e35b6a')); break;

    case 'eternalheart':
      if (!player.eternalHeart) {
        player.eternalHeart = true;
        player.redMax += 0.5;
        player.redCurrent = Math.min(player.redMax, player.redCurrent + 0.5);
      }
      Sound.play('heartContainer');
      game.floatTexts.push(new FloatText(x, y, 'Eternal Heart!', '#e8e8e8'));
      break;

    case 'goldheart':
      player.goldHeart = true;
      Sound.play('heart');
      game.floatTexts.push(new FloatText(x, y, 'Gold Heart!', '#f0c85a'));
      break;

    case 'cursedpenny': {
      const outcome = Util.weighted([
        { id:'plus1', w:20 }, { id:'plus2', w:15 }, { id:'nothing', w:20 },
        { id:'minus1', w:20 }, { id:'minus2', w:15 }, { id:'explode', w:10 },
      ]).id;
      if (outcome === 'plus1') {
        player.coins += 1;
        Sound.play('coin');
        game.floatTexts.push(new FloatText(x, y, '+1 coin', '#e3c15b'));
      } else if (outcome === 'plus2') {
        player.coins += 2;
        Sound.play('coinLucky');
        game.floatTexts.push(new FloatText(x, y, '+2 coins', '#e3c15b'));
      } else if (outcome === 'nothing') {
        Sound.play('coin');
        game.floatTexts.push(new FloatText(x, y, '...nothing happens', '#8a86a0'));
      } else if (outcome === 'minus1') {
        player.coins = Math.max(0, player.coins - 1);
        Sound.play('coin');
        game.floatTexts.push(new FloatText(x, y, '-1 coin', '#a3617f'));
      } else if (outcome === 'minus2') {
        player.coins = Math.max(0, player.coins - 2);
        Sound.play('coin');
        game.floatTexts.push(new FloatText(x, y, '-2 coins', '#a3617f'));
      } else {

        Sound.play('explosion');
        game.floatTexts.push(new FloatText(x, y, 'It explodes!', '#e0895a'));
        game.toast('Cursed! The penny explodes.');
        player.takeDamage(0.5, 'explosion');
      }
      break;
    }
    case 'battery': {
      const charged = !!player.activeItem;
      if (charged) player.activeCharge = player.activeItem.maxCharge;
      Sound.play('battery');
      game.floatTexts.push(new FloatText(x, y, charged ? 'Charged!' : 'No active item', charged ? '#7fd6c9' : '#8a86a0'));
      break;
    }
    case 'minibattery': {
      const charged = !!player.activeItem;
      if (charged) player.activeCharge = Math.min(player.activeItem.maxCharge, player.activeCharge + 2);
      Sound.play('battery');
      game.floatTexts.push(new FloatText(x, y, charged ? '+2 charge' : 'No active item', charged ? '#7fd6c9' : '#8a86a0'));
      break;
    }
    case 'sack': {
      Sound.play('sack');
      game.floatTexts.push(new FloatText(x, y, 'Sack!', '#e0895a'));
      for (let i = 0; i < 3; i++) grantPickupEffect(game, rollGenericPickupKind(), x, y - 16 - i * 14);
      break;
    }

    case 'trashbag': {
      Sound.play('sack');
      const id = Util.chance(0.5) ? 'friendlybluefly' : 'friendlyyellowfly';
      game.floatTexts.push(new FloatText(x, y, 'Trash Bag!', '#8ac95a'));
      hatchFriendlyFly(game, id);
      break;
    }

    case 'pearl': {

      player.luckyPennies += 1;
      Sound.play('itemGet');
      game.floatTexts.push(new FloatText(x, y, '+1 Luck!', '#7fd66a'));
      recalcPlayerStats(player);
      break;
    }
    case 'driftnet': {

      Sound.play('sack');
      game.floatTexts.push(new FloatText(x, y, 'Driftnet!', '#6ab4c9'));
      for (let i = 0; i < 3; i++) grantPickupEffect(game, rollGenericPickupKind(), x, y - 16 - i * 14);
      break;
    }
    case 'tideflask': {

      const effect = Util.choice(PILL_EFFECT_LIST);
      applyPillEffect(game, effect.id);
      Sound.play(effect.good === false ? 'uiDeny' : 'itemGet');
      game.toast('🧪 Tide Flask: ' + effect.name + '!');
      break;
    }
    case 'pill': {
      const color = pillColor || rollRandomPillColorId();
      const previous = player.pillPocket;
      player.pillPocket = color;
      markBestiarySeen('seenPills', color);
      Sound.play('itemGet');
      const known = game.pillIdentified[color];
      const label = known ? (PILL_COLORS_BY_ID[color].name + ' (' + PILL_EFFECTS[game.pillEffectMap[color]].name + ')') : PILL_COLORS_BY_ID[color].name;
      game.toast('Picked up a ' + label + '!' + (previous ? ' (previous pill lost)' : ''));
      game.floatTexts.push(new FloatText(x, y, label, '#c9c3ff'));
      break;
    }
    case 'star': {

      const id = starId || rollRandomStarId();
      const previous = player.starPocket;
      player.starPocket = id;
      markBestiarySeen('seenStars', id);
      Sound.play('itemGet');
      const def = STAR_TYPES[id];
      game.toast('Picked up ' + def.name + '!' + (previous ? ' (previous star lost)' : ''));
      game.floatTexts.push(new FloatText(x, y, def.name, def.color));
      break;
    }

    case 'wispdye': {
      const id = wispDyeId || Util.choice(WISP_DYE_TYPES).id;
      markBestiarySeen('seenPickupKinds', id);
      applyWispDye(game, id);
      break;
    }
    case 'wispaugment': {
      const id = wispAugmentId || Util.choice(WISP_AUGMENT_TYPES).id;
      markBestiarySeen('seenPickupKinds', id);
      applyWispAugment(game, id);
      break;
    }
  }
}

function collectPickup(game, p){
  grantPickupEffect(game, p.kind, p.x, p.y - 10, p.coin, p.pillColor, p.starId, p.wispDyeId, p.wispAugmentId);
  p.collected = true;
}

function updateChests(game){
  const node = game.currentRoom, player = game.player;
  for (const c of node.chests) {
    if (c.opened) continue;
    if (c.def.requires === 'bomb') continue;
    const touching = Util.circleIntersect(c.x, c.y, c.radius, player.x, player.y, player.radius + 4);

    if (c.reopenLock) { if (!touching) c.reopenLock = false; continue; }
    if (touching) tryOpenChest(game, c);
  }
}

function tryOpenChest(game, c){
  const player = game.player;
  if (c.def.requires === 'key') {
    if (!player.unlimitedKeysFloor) {
      if (player.keys <= 0) return;
      player.keys--;
    }
  } else if (c.def.requires === 'hearts') {
    const cost = player.passives.cursedlocket ? Math.max(0.5, c.def.heartCost - 1) : c.def.heartCost;
    const avail = player.redCurrent + player.blueCurrent;
    if (avail <= cost) return;
    player.spendHearts(cost);
  }
  openChestContents(game, c);
}

function openChestContents(game, c){
  const node = game.currentRoom, player = game.player;
  c.opened = true;
  Sound.play('chestOpen');
  const minPickups = player.passives.midastouch ? 3 : 1;
  const n = Util.randi(minPickups, 5);
  for (let i = 0; i < n; i++) {
    const tx = Util.clamp(Math.floor(c.x / TILE) + Util.randi(-1, 1), 1, node.tileW - 2);
    const ty = Util.clamp(Math.floor(c.y / TILE) + Util.randi(-1, 1), 1, node.tileH - 2);
    const spot = findClearFloorSpot(node, tx, ty);

    const kind = c.kind === 'wood' ? (Util.chance(0.5) ? 'pill' : 'star') : rollGenericPickupKind();
    spawnResolvedPickup(node, kind, spot.x, spot.y);
  }
  const itemChance = c.def.itemChance + (player.trinketId === 'brasskey' ? 0.05 : 0);
  if (Util.chance(itemChance)) {

    if (c.kind === 'wood') {
      const trinket = pickTrinketFromPool();
      if (trinket) addTrinketPedestal(node, trinket, Math.floor(c.x / TILE), Math.floor(c.y / TILE));
    } else {
      const familiar = Util.chance(0.10) ? pickFamiliarFromPool() : null;
      const trinket = !familiar && Util.chance(0.15) ? pickTrinketFromPool() : null;
      if (familiar) addFamiliar(game, familiar);
      else if (trinket) addTrinketPedestal(node, trinket, Math.floor(c.x / TILE), Math.floor(c.y / TILE));
      else applyItemToPlayer(game, pickItemFromPool('chest'));
    }
  }
  game.toast(c.def.name + ' opened!');
  bumpStat('chestsOpened', 1, game);
  if (c.kind === 'cursed') bumpStat('cursedChestsOpened', 1, game);
  if (c.kind === 'gold') bumpStat('goldChestsOpened', 1, game);
  if (c.kind === 'stone') bumpStat('stoneChestsOpened', 1, game);

  if (c.kind === 'eternal' && Util.chance(0.5)) { c.opened = false; c.reopenLock = true; }
}

function handleEnemyDeath(game, enemy){
  const node = game.currentRoom, player = game.player;
  player.onKill();
  if (player.loveHarvest) gainLoveStack(game);
  if (player.salvageProtocol) gainSalvageScrap(game, enemy);
  if (player.shatterfrost) triggerShatterfrost(game, enemy);
  Sound.play(enemy.isBoss ? 'bossDeath' : 'enemyDeath');

  if (enemy.isBoss) FX.hitStop(0.06);
  bumpStat('enemiesKilled', 1, game);

  if (enemy.flies) bumpStat('fliesKilled', 1, game);

  if (player.chudExtraFlyChance && RNG.random() < player.chudExtraFlyChance) {
    const flyDef = pickChudFlyFamiliar();
    if (flyDef) addFamiliar(game, flyDef);
  }

  if (bumpBestiaryCount('enemyKills', enemy.type.id, 1) && !enemy.isBoss) {
    game.toast('📖 New Bestiary entry: ' + enemy.type.name + '!', false, 'info');
  }

  if (HOLLOWCHORUS_FINALWAVEFORM_WATCH_IDS.has(enemy.type.id)) checkHollowChorusFinalWaveformCollection(game);

  if (MANGROVES_WATCH_IDS.has(enemy.type.id)) checkMangrovesCollection(game);

  if (OBSERVATORY_WATCH_IDS.has(enemy.type.id)) checkObservatoryCollection(game);

  if (ORRERY_WATCH_IDS.has(enemy.type.id)) checkOrreryCollection(game);

  if (VOIDBETWEEN_WATCH_IDS.has(enemy.type.id)) checkVoidBetweenCollection(game);

  if (VOIDBETWEEN2_WATCH_IDS.has(enemy.type.id)) checkVoidBetween2Collection(game);
  game.runKills++;
  if (game.runStats) { game.runStats.kills++; if (enemy.isBoss) game.runStats.bossKills++; }
  if (enemy.isBoss) bumpStat('bossesKilled', 1, game);
  if (enemy.type && enemy.type.id === 'swarmerdnb') bumpStat('swarmerdnbKilled', 1, game);

  if (!enemy.splitDone && enemy.type.splitInto) {
    enemy.splitDone = true;
    const childType = ENEMY_TYPES[enemy.type.splitInto];
    if (childType) {
      for (let i = 0; i < 2; i++) {
        const ang = RNG.random() * Math.PI * 2;
        const spot = findNearestFloor(node, Math.floor((enemy.x + Math.cos(ang) * 22) / TILE), Math.floor((enemy.y + Math.sin(ang) * 22) / TILE));
        node.enemies.push(new Enemy(childType, spot.x, spot.y, game.dungeon.floorNum));
      }
    }
  }

  if (enemy.type.spawnFliesOnDeath) {
    const cfg = enemy.type.spawnFliesOnDeath;
    const childType = ENEMY_TYPES[cfg.id];
    if (childType) {
      for (let i = 0; i < cfg.count; i++) {
        const ang = RNG.random() * Math.PI * 2;
        const r = Util.rand(cfg.minRadius || 10, cfg.radius || 40);
        const spot = findNearestFloor(node, Math.floor((enemy.x + Math.cos(ang) * r) / TILE), Math.floor((enemy.y + Math.sin(ang) * r) / TILE));
        node.enemies.push(new Enemy(childType, spot.x, spot.y, game.dungeon.floorNum));
      }
    }
  }
  if (enemy.type.spawnBombsOnDeath) {
    for (let i = 0; i < enemy.type.spawnBombsOnDeath; i++) {
      const ang = RNG.random() * Math.PI * 2;
      const r = Util.rand(14, 40);
      placeBombAt(game, enemy.x + Math.cos(ang) * r, enemy.y + Math.sin(ang) * r, 'enemy');
    }
  }

  if (enemy.type.linkedDeath) {
    const partner = node.enemies.find(o => o !== enemy && !o.isDead && o.type.id === enemy.type.id);
    if (partner) { partner.isDead = true; handleEnemyDeath(game, partner); }
  }

  if (enemy.stolenPickup) {
    const spot = findClearFloorSpot(node, Math.floor(enemy.x / TILE), Math.floor(enemy.y / TILE));
    const p = enemy.stolenPickup;
    p.x = spot.x; p.y = spot.y; p.collected = false; p.bobPhase = RNG.random() * Math.PI * 2;
    node.pickups.push(p);
  }

  if (enemy.isBoss) {
    node.bossDefeated = true;
    const spot = findNearestFloor(node, Math.floor(enemy.x / TILE), Math.floor(enemy.y / TILE));
    addItemPedestal(node, pickItemFromPool('boss'), spot.x, spot.y);
    game.onBossDefeated(enemy);
  } else if (enemy.isMirrorBoss) {
    bumpStat('mirrorBossesDefeated', 1, game);
  } else if (enemy.isMiniboss) {

    const spot = findClearFloorSpot(node, Math.floor(enemy.x / TILE), Math.floor(enemy.y / TILE));
    const drop = Util.choice(['penny', 'chest', 'item', 'star']);
    if (drop === 'penny') {
      node.pickups.push(new Pickup('coin', spot.x, spot.y, COIN_TYPES.find(c => c.id === 'luckypenny') || Util.weighted(COIN_TYPES)));
    } else if (drop === 'chest') {
      node.chests.push(new Chest(Util.weighted(CHEST_TYPE_POOL).id, spot.x, spot.y));
    } else if (drop === 'item') {
      addItemPedestal(node, pickItemFromPool('boss'), spot.x, spot.y);
    } else {
      node.pickups.push(new Pickup('star', spot.x, spot.y, rollRandomStarId()));
    }
  } else if (player.trinketId === 'shinyshell' && Util.chance(0.08)) {
    const spot = findClearFloorSpot(node, Math.floor(enemy.x / TILE), Math.floor(enemy.y / TILE));
    node.pickups.push(new Pickup('heartRed', spot.x, spot.y));
  } else if (player.trinketId === 'gravekeeperstoken' && Util.chance(0.06)) {

    const spot = findClearFloorSpot(node, Math.floor(enemy.x / TILE), Math.floor(enemy.y / TILE));
    node.pickups.push(new Pickup('coin', spot.x, spot.y, Util.weighted(COIN_TYPES)));
  } else if (player.trinketId === 'powderpouch' && Util.chance(0.04)) {
    const spot = findClearFloorSpot(node, Math.floor(enemy.x / TILE), Math.floor(enemy.y / TILE));
    node.pickups.push(new Pickup('bomb', spot.x, spot.y));
  } else if (player.trinketId === 'ossuarykey' && Util.chance(0.04)) {
    const spot = findClearFloorSpot(node, Math.floor(enemy.x / TILE), Math.floor(enemy.y / TILE));
    node.pickups.push(new Pickup('key', spot.x, spot.y));
  } else if (player.trinketId === 'sk8t_boneshakerpouch' && Util.chance(0.05)) {

    const spot = findClearFloorSpot(node, Math.floor(enemy.x / TILE), Math.floor(enemy.y / TILE));
    node.pickups.push(new Pickup('bomb', spot.x, spot.y));
  }

  if (!enemy.isBoss && player.passives.flyjar && Util.chance(0.02 * player.passives.flyjar)) hatchFriendlyFly(game, 'friendlybluefly');
  if (!enemy.isBoss && player.passives.honeycomb && Util.chance(0.02 * player.passives.honeycomb)) hatchFriendlyFly(game, 'friendlyyellowfly');

  if (enemy.isChampion && Util.chance(0.5)) {
    const spot = findClearFloorSpot(node, Math.floor(enemy.x / TILE), Math.floor(enemy.y / TILE));
    spawnResolvedPickup(node, rollGenericPickupKind(), spot.x, spot.y);
  }

  if (checkRoomCleared(game, node)) {

    if (player.passives.rottingcarcass && Util.chance(0.25 * player.passives.rottingcarcass)) {
      hatchFriendlyFly(game, Util.chance(0.5) ? 'friendlybluefly' : 'friendlyyellowfly');
    }
    game.onRoomJustCleared();
  }
}

function hatchFriendlyFly(game, id){
  addFamiliar(game, FAMILIAR_TYPES[id]);
}
