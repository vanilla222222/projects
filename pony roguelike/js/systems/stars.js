'use strict';

function useHeldStar(game){
  const player = game.player;
  if (!player.starPocket) { game.toast('No star to use.'); return; }
  const starId = player.starPocket;
  player.starPocket = null;

  if (applyStarEffect(game, starId) === false) return;
  bumpStat('starsUsed', 1, game);
  game.logEvent('star', STAR_TYPES[starId].name);
}

function refundStar(game, starId, msg){
  game.player.starPocket = starId;
  game.toast(msg);
  return false;
}

const TELEPORT_ROOM_NAMES = {
  treasure: 'Treasure Room', shop: 'Shop', secret: 'Secret Room',
  petshop: 'Pet Shop', curse: 'Curse Room', sacrifice: 'Sacrifice Room',
  vault: 'Vault', challenge: 'Challenge Room', crystal: 'Crystal Room',
  sombra: 'Sombra Room', star: 'Star Room'
};

function applyStarEffect(game, starId){
  const player = game.player;
  const star = STAR_TYPES[starId];

  if (starId.startsWith('teleport_')) {
    const roomType = starId.slice('teleport_'.length);
    let target = null, bestDist = Infinity;
    for (const node of game.dungeon.rooms.values()) {

      if (node.type !== roomType || node === game.currentRoom) continue;
      const d = Math.hypot(node.gx - game.currentRoom.gx, node.gy - game.currentRoom.gy);
      if (d < bestDist) { bestDist = d; target = node; }
    }
    if (!target) {
      return refundStar(game, starId, 'No ' + (TELEPORT_ROOM_NAMES[roomType] || 'room') + ' found on this floor.');
    }
    game.enterRoom(target, null);

    if (KEY_LOCKED_ROOM_TYPES.has(target.type) && !target.doorsOpen) {
      target.doorsOpen = true;
      target.tileLayerDirty = true;
    }
  }

  switch (starId) {
    case 'alcyone':
      player.starDamageBonus += 3;
      recalcPlayerStats(player);
      break;
    case 'atlas':
      player.healBlue(2);
      break;
    case 'electra':
      player.starSpeedMult = Math.max(player.starSpeedMult, 1.5);
      break;
    case 'maia':
      scatterStarPickups(game, 'heartRed', 4);
      break;
    case 'merope':
      scatterStarPickups(game, 'key', 2);
      break;
    case 'taygeta':
      destroyAllObstacles(game);
      break;
    case 'pleione':
      scatterStarPickups(game, 'bomb', 3);
      break;
    case 'celaeno':
      scatterStarPickups(game, 'pill', 2);
      break;
    case 'antares':

      damageAllEnemies(game, Math.max(1, Math.round(4 * enemyHpScale(game.dungeon.floorNum))));
      break;
    case 'polaris':
      freezeAllEnemies(game, 3);
      break;
    case 'achernar':
      player.heal(3);
      break;
    case 'vega':
      player.starSpeedMult = Math.max(player.starSpeedMult, 2);
      break;

    case 'deneb': {
      const prize = rerollOnePedestal(game.currentRoom);
      if (!prize) return refundStar(game, starId, 'Nothing here to reroll.');
      game.toast('Deneb — rerolled into ' + (prize.icon ? prize.icon + ' ' : '') + prize.name + '!');
      Sound.play('itemGet');
      return;
    }
    case 'altair': {
      const n = rerollRoomHazards(game.currentRoom);
      if (!n) return refundStar(game, starId, 'No hazards here to reroll.');
      break;
    }
    case 'capella': {
      const n = rerollRoomEnemies(game.currentRoom, game.dungeon.floorNum, game.floorBranch);
      if (!n) return refundStar(game, starId, 'No enemies here to reroll.');
      break;
    }
    case 'bellatrix': {
      const n = championizeRoomEnemies(game.currentRoom);
      if (!n) return refundStar(game, starId, 'No enemies to promote.');
      break;
    }

    case 'arcturus':
      player.starDamageBonus += 5;
      recalcPlayerStats(player);
      break;
    case 'dubhe':
      player.starDamageBonus += 8;
      recalcPlayerStats(player);
      break;
    case 'alkaid':
      player.invincibleTimer = Math.max(player.invincibleTimer, 10);
      break;

    case 'aldebaran':
      player.shieldHits += 1;
      break;
    case 'megrez':
      player.shieldHits += 3;
      break;
    case 'mizar':
      player.redCurrent = player.redMax;
      break;
    case 'procyon':
      player.grantHeartContainer(1);
      break;
    case 'spica':
      player.luckyPennies += 1;
      recalcPlayerStats(player);
      break;
    case 'antlia':
      player.keys += 2;
      player.bombs += 2;
      break;
    case 'merak':
      if (!player.activeItem) return refundStar(game, starId, 'No active item to charge.');
      player.activeCharge = player.activeItem.maxCharge;
      break;
    case 'alnitak':

      player.eyeUsed = true;
      player.revealMap = true;
      break;

    case 'phecda':
      freezeAllEnemies(game, 8);
      break;
    case 'alnilam':
      applyRoomWideStatus(game, 'fearTimer', 8, 'statusFear');
      break;
    case 'mintaka': {
      const targets = game.currentRoom.enemies.filter(e => !e.isDead && !e.isBoss);
      if (!targets.length) return refundStar(game, starId, 'No one here to charm.');
      const t = Util.choice(targets);
      t.charmTimer = Math.max(t.charmTimer, 12);
      Sound.play('statusCharm');
      break;
    }
    case 'saiph':
      knockbackNova(game, 6);
      break;
    case 'rigel': {
      const alive = game.currentRoom.enemies.filter(e => !e.isDead && !e.isBoss);
      if (!alive.length) return refundStar(game, starId, 'Nothing here to strike down.');
      let weakest = alive[0];
      for (const e of alive) if (e.hp < weakest.hp) weakest = e;

      if (weakest.takeDamage(weakest.hp, 0, 0) && weakest.isDead) handleEnemyDeath(game, weakest);
      break;
    }
    case 'sirius':
      damageAllEnemies(game, Math.max(1, Math.round(6 * enemyHpScale(game.dungeon.floorNum))));
      freezeAllEnemies(game, 4);
      break;

    case 'betelgeuse':
      scatterStarPickups(game, 'coin', 6);
      break;
    case 'castor':
      scatterStarPickups(game, 'star', 2);
      break;
    case 'pollux': {
      const node = game.currentRoom;
      const spot = findClearFloorSpot(node, Math.floor(player.x / TILE), Math.floor(player.y / TILE) - 1);
      addItemOrTrinketPedestal(node, itemPoolForRoomType(node.type), spot.x, spot.y);
      break;
    }
    case 'regulus': {
      const node = game.currentRoom;
      const spot = findClearFloorSpot(node, Math.floor(player.x / TILE), Math.floor(player.y / TILE) - 1);
      node.chests.push(new Chest(Util.weighted(CHEST_TYPE_POOL).id, spot.x, spot.y));
      break;
    }

    case 'vindemiatrix':
      if (!applyRoomWideStatus(game, 'poisonTimer', 10, 'statusPoison')) return refundStar(game, starId, 'Nothing here to poison.');
      break;
    case 'zubeneschamali':
      if (!applyRoomWideStatus(game, 'stunTimer', 5, 'statusStun')) return refundStar(game, starId, 'Nothing here to stun.');
      break;
    case 'gacrux':
      if (!applyRoomWideStatus(game, 'vulnerableTimer', 12, 'statusVulnerable')) return refundStar(game, starId, 'Nothing here to mark.');
      break;
    case 'acrux':
      if (!applyRoomWideStatus(game, 'charmTimer', 10, 'statusCharm')) return refundStar(game, starId, 'No one here to charm.');
      break;
    case 'shaula':
    {
      const alive = game.currentRoom.enemies.filter(e => !e.isDead);
      if (!alive.length) return refundStar(game, starId, 'Nothing here to wound.');
      for (const e of alive) if (e.takeDamage(e.hp / 2, 0, 0) && e.isDead) handleEnemyDeath(game, e);
      break;
    }
    case 'sabik':
      player.healBlue(4);
      break;
    case 'nunki':
      scatterStarPickups(game, 'key', 3);
      scatterStarPickups(game, 'bomb', 3);
      break;
    case 'ascella':
    {
      const node = game.currentRoom;
      for (let i = -1; i <= 1; i += 2) {
        const spot = findClearFloorSpot(node, Math.floor(player.x / TILE) + i * 2, Math.floor(player.y / TILE) - 1);
        addItemOrTrinketPedestal(node, itemPoolForRoomType(node.type), spot.x, spot.y);
      }
      break;
    }
    case 'kausaustralis':
      damageAllEnemies(game, Math.max(1, Math.round(3 * enemyHpScale(game.dungeon.floorNum))));
      knockbackNova(game, 9);
      break;
    case 'rasalhague':
      freezeAllEnemies(game, 12);
      break;
    case 'alphecca':
      player.luckyPennies += 2;
      recalcPlayerStats(player);
      break;
    case 'izar':
      player.starRangeBonus = (player.starRangeBonus || 0) + 2;
      recalcPlayerStats(player);
      break;
    case 'mirfak':
      player.shieldHits += 5;
      break;
    case 'algol':
    {
      const alive = game.currentRoom.enemies.filter(e => !e.isDead && !e.isBoss);
      if (!alive.length) return refundStar(game, starId, 'Nothing here to strike down.');
      let strongest = alive[0];
      for (const e of alive) if (e.hp > strongest.hp) strongest = e;
      if (strongest.takeDamage(strongest.hp, 0, 0) && strongest.isDead) handleEnemyDeath(game, strongest);
      break;
    }
    case 'almach':
      player.redCurrent = player.redMax;
      player.healBlue(2);
      break;
    case 'hamal':
      player.grantHeartContainer(2);
      break;
    case 'menkar':
      scatterStarPickups(game, 'bomb', 5);
      destroyAllObstacles(game);
      break;
    case 'diphda':
      scatterStarPickups(game, 'coin', 12);
      break;
    case 'markab':
      scatterStarPickups(game, 'pill', 4);
      break;
    case 'scheat':
      player.invincibleTimer = Math.max(player.invincibleTimer, 20);
      break;
    case 'algenib':
    {
      let n = 0, last = null;
      while (n < 12) { const prize = rerollOnePedestal(game.currentRoom); if (!prize) break; last = prize; n++; }
      if (!n) return refundStar(game, starId, 'Nothing here to reroll.');
      game.toast('Algenib — rerolled ' + n + ' pedestal' + (n === 1 ? '' : 's') + ', last into ' + (last.icon ? last.icon + ' ' : '') + last.name + '!');
      Sound.play('itemGet');
      return;
    }
    case 'enif':
      player.eyeUsed = true;
      player.revealMap = true;
      scatterStarPickups(game, 'key', 2);
      break;
    case 'sadalsuud':
      scatterStarPickups(game, 'star', 3);
      break;
    case 'zosma':
    {
      const n = championizeRoomEnemies(game.currentRoom);
      if (!n) return refundStar(game, starId, 'No enemies to promote.');
      applyRoomWideStatus(game, 'vulnerableTimer', 15, 'statusVulnerable');
      break;
    }
    case 'alphard':
    {
      player.starDamageBonus += 12;
      player.redCurrent = Math.min(player.redCurrent, 1);
      recalcPlayerStats(player);
      break;
    }

    case 'sk8s_pyrrha':
      player.starDamageBonus += 4;
      recalcPlayerStats(player);
      break;
    case 'sk8s_borealis':
      player.starSpeedMult = Math.max(player.starSpeedMult, 1.6);
      break;
    case 'sk8s_thessaly':
      player.heal(2);
      break;
    case 'sk8s_wren':
      player.healBlue(3);
      break;
    case 'sk8s_gilded':
      player.redCurrent = player.redMax;
      player.healBlue(999);
      break;
    case 'sk8s_cinder':
      damageAllEnemies(game, Math.max(1, Math.round(3 * enemyHpScale(game.dungeon.floorNum))));
      break;
    case 'sk8s_frostbind':
      freezeAllEnemies(game, 6);
      break;
    case 'sk8s_thornveil':
      player.shieldHits += 2;
      break;
    case 'sk8s_aegis':
      player.invincibleTimer = Math.max(player.invincibleTimer, 15);
      break;
    case 'sk8s_venomkiss':
      if (!applyRoomWideStatus(game, 'poisonTimer', 8, 'statusPoison')) return refundStar(game, starId, 'Nothing here to poison.');
      break;
    case 'sk8s_dreadhowl':
      if (!applyRoomWideStatus(game, 'fearTimer', 6, 'statusFear')) return refundStar(game, starId, 'No one here to frighten.');
      break;
    case 'sk8s_puppeteer': {
      const targets = game.currentRoom.enemies.filter(e => !e.isDead && !e.isBoss);
      if (!targets.length) return refundStar(game, starId, 'No one here to charm.');
      let strongest = targets[0];
      for (const e of targets) if (e.hp > strongest.hp) strongest = e;
      strongest.charmTimer = Math.max(strongest.charmTimer, 14);
      Sound.play('statusCharm');
      break;
    }
    case 'sk8s_direstrike': {
      const alive = game.currentRoom.enemies.filter(e => !e.isDead && !e.isBoss);
      if (!alive.length) return refundStar(game, starId, 'Nothing here to strike.');
      let strongest = alive[0];
      for (const e of alive) if (e.hp > strongest.hp) strongest = e;
      if (strongest.takeDamage(strongest.hp * 0.75, 0, 0) && strongest.isDead) handleEnemyDeath(game, strongest);
      break;
    }
    case 'sk8s_gale':
      knockbackNova(game, 5);
      break;
    case 'sk8s_fortune':
      player.luckyPennies += 1;
      recalcPlayerStats(player);
      break;
    case 'sk8s_farsight':
      player.starRangeBonus = (player.starRangeBonus || 0) + 1;
      recalcPlayerStats(player);
      break;
    case 'sk8s_battery':
      if (!player.activeItem) return refundStar(game, starId, 'No active item to charge.');
      player.activeCharge = player.activeItem.maxCharge;
      break;
    case 'sk8s_cartographer':
      player.eyeUsed = true;
      player.revealMap = true;
      break;
    case 'sk8s_demolition':
      destroyAllObstacles(game);
      break;
    case 'sk8s_prospector':
      scatterStarPickups(game, 'coin', 5);
      break;
    case 'sk8s_medic':
      scatterStarPickups(game, 'heartRed', 3);
      break;
    case 'sk8s_quartermaster':
      scatterStarPickups(game, 'key', 2);
      scatterStarPickups(game, 'bomb', 2);
      break;
    case 'sk8s_alchemist':
      scatterStarPickups(game, 'pill', 3);
      break;
    case 'sk8s_pyroclast':
      scatterStarPickups(game, 'bomb', 4);
      break;
    case 'sk8s_shrine': {
      const node = game.currentRoom;
      const spot = findClearFloorSpot(node, Math.floor(player.x / TILE), Math.floor(player.y / TILE) - 1);
      addItemOrTrinketPedestal(node, itemPoolForRoomType(node.type), spot.x, spot.y);
      break;
    }

    case 'canopus':
      scatterStarPickups(game, 'bomb', 6);
      destroyAllObstacles(game);
      break;
    case 'achird':
      scatterStarPickups(game, 'coin', 15);
      break;
    case 'alderamin': {
      const node = game.currentRoom;
      for (let i = -1; i <= 1; i += 2) {
        const spot = findClearFloorSpot(node, Math.floor(player.x / TILE) + i * 2, Math.floor(player.y / TILE) - 1);
        node.chests.push(new Chest(Util.weighted(CHEST_TYPE_POOL).id, spot.x, spot.y));
      }
      break;
    }
    case 'kochab':
      player.shieldHits += 4;
      break;
    case 'errai':
      player.starRangeBonus = (player.starRangeBonus || 0) + 3;
      recalcPlayerStats(player);
      break;
    case 'thuban':
      player.grantHeartContainer(3);
      break;
    case 'miaplacidus':
      if (!applyRoomWideStatus(game, 'poisonTimer', 14, 'statusPoison')) return refundStar(game, starId, 'Nothing here to poison.');
      break;
    case 'avior':
    {
      player.starDamageBonus += 15;
      player.redCurrent = Math.min(player.redCurrent, 1);
      recalcPlayerStats(player);
      break;
    }
    case 'naos':
      scatterStarPickups(game, 'bomb', 7);
      break;
    case 'wezen': {
      const n = rerollRoomHazards(game.currentRoom);
      if (!n) return refundStar(game, starId, 'No hazards here to reroll.');
      scatterStarPickups(game, 'bomb', 2);
      break;
    }
    case 'adhara': {
      const targets = game.currentRoom.enemies.filter(e => !e.isDead && !e.isBoss);
      if (!targets.length) return refundStar(game, starId, 'No one here to charm.');
      targets.sort((a, b) => b.hp - a.hp);
      for (const t of targets.slice(0, 2)) t.charmTimer = Math.max(t.charmTimer, 12);
      Sound.play('statusCharm');
      break;
    }
    case 'ankaa':
      if (!applyRoomWideStatus(game, 'fearTimer', 10, 'statusFear')) return refundStar(game, starId, 'No one here to frighten.');
      break;
    case 'peacock': {
      const node = game.currentRoom;
      const spot = findClearFloorSpot(node, Math.floor(player.x / TILE), Math.floor(player.y / TILE) - 1);
      addItemOrTrinketPedestal(node, itemPoolForRoomType(node.type), spot.x, spot.y);
      scatterStarPickups(game, 'key', 2);
      break;
    }
    case 'hadar':
      freezeAllEnemies(game, 15);
      break;
    case 'rigilkent':
      if (!applyRoomWideStatus(game, 'charmTimer', 10, 'statusCharm')) return refundStar(game, starId, 'No one here to charm.');
      break;
    case 'menkalinan':
      if (!applyRoomWideStatus(game, 'stunTimer', 7, 'statusStun')) return refundStar(game, starId, 'Nothing here to stun.');
      break;
    case 'alhena':
      if (!applyRoomWideStatus(game, 'vulnerableTimer', 18, 'statusVulnerable')) return refundStar(game, starId, 'Nothing here to mark.');
      break;
    case 'elnath': {
      const alive = game.currentRoom.enemies.filter(e => !e.isDead && !e.isBoss);
      if (!alive.length) return refundStar(game, starId, 'Nothing here to strike down.');
      alive.sort((a, b) => a.hp - b.hp);
      for (const e of alive.slice(0, 2)) if (e.takeDamage(e.hp, 0, 0) && e.isDead) handleEnemyDeath(game, e);
      break;
    }
    case 'mirach': {
      const n = championizeRoomEnemies(game.currentRoom);
      if (!n) return refundStar(game, starId, 'No enemies to promote.');
      knockbackNova(game, 7);
      break;
    }
    case 'sargas':
      player.redCurrent = player.redMax;
      player.shieldHits += 2;
      break;

    case 'algorab':
      player.starDamageBonus += 6;
      recalcPlayerStats(player);
      break;
    case 'gienah':
      player.starSpeedMult = Math.max(player.starSpeedMult, 1.7);
      break;
    case 'kraz':
      player.healBlue(3);
      break;
    case 'minkar':
      player.redCurrent = player.redMax;
      break;
    case 'zaurak':
      player.shieldHits += 3;
      break;
    case 'cursa':
      player.invincibleTimer = Math.max(player.invincibleTimer, 12);
      break;
    case 'tejat':
      player.grantHeartContainer(1);
      break;
    case 'mebsuta':
      player.luckyPennies += 1;
      recalcPlayerStats(player);
      break;
    case 'alzirr':
      player.starRangeBonus = (player.starRangeBonus || 0) + 2;
      recalcPlayerStats(player);
      break;
    case 'propus':
      if (!applyRoomWideStatus(game, 'poisonTimer', 12, 'statusPoison')) return refundStar(game, starId, 'Nothing here to poison.');
      break;
    case 'muscida':
      if (!applyRoomWideStatus(game, 'fearTimer', 9, 'statusFear')) return refundStar(game, starId, 'No one here to frighten.');
      break;
    case 'talitha':
      if (!applyRoomWideStatus(game, 'stunTimer', 6, 'statusStun')) return refundStar(game, starId, 'Nothing here to stun.');
      break;
    case 'yildun':
      if (!applyRoomWideStatus(game, 'vulnerableTimer', 15, 'statusVulnerable')) return refundStar(game, starId, 'Nothing here to mark.');
      break;
    case 'pherkad':
      if (!applyRoomWideStatus(game, 'charmTimer', 9, 'statusCharm')) return refundStar(game, starId, 'No one here to charm.');
      break;
    case 'chara':
      freezeAllEnemies(game, 10);
      break;
    case 'denebola':
      damageAllEnemies(game, Math.max(1, Math.round(4 * enemyHpScale(game.dungeon.floorNum))));
      break;
    case 'seginus': {
      const alive = game.currentRoom.enemies.filter(e => !e.isDead && !e.isBoss);
      if (!alive.length) return refundStar(game, starId, 'Nothing here to strike down.');
      let weakest = alive[0];
      for (const e of alive) if (e.hp < weakest.hp) weakest = e;
      if (weakest.takeDamage(weakest.hp, 0, 0) && weakest.isDead) handleEnemyDeath(game, weakest);
      break;
    }
    case 'nekkar': {
      player.starDamageBonus += 10;
      player.redCurrent = Math.min(player.redCurrent, 1);
      recalcPlayerStats(player);
      break;
    }
    case 'sadalmelik':
      scatterStarPickups(game, 'coin', 10);
      break;
    case 'dabih':
      player.keys += 3;
      player.bombs += 3;
      break;
  }
  Sound.play('itemGet');
  game.toast(star.name + ' — ' + star.desc);
}

function applyRoomWideStatus(game, timerField, duration, sfx){
  let count = 0;
  for (const e of game.currentRoom.enemies) {
    if (e.isDead || e.isBoss) continue;
    e[timerField] = Math.max(e[timerField], duration);
    count++;
  }
  if (count && sfx) Sound.play(sfx);
  return count;
}

function knockbackNova(game, strength){
  const player = game.player;
  for (const e of game.currentRoom.enemies) {
    if (e.isDead) continue;
    const dx = e.x - player.x, dy = e.y - player.y;
    const d = Math.hypot(dx, dy) || 1;
    e.takeDamage(0, (dx / d) * strength, (dy / d) * strength);
  }
}

function scatterStarPickups(game, kind, count){
  const node = game.currentRoom, player = game.player;
  const baseTx = Math.floor(player.x / TILE), baseTy = Math.floor(player.y / TILE);
  for (let i = 0; i < count; i++) {
    const spot = findClearFloorSpot(node, baseTx + Util.randi(-2, 2), baseTy + Util.randi(-2, 2));
    spawnResolvedPickup(node, kind, spot.x, spot.y);
  }
}
