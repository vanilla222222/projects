'use strict';

const DONATION_CAP = 5000;

const DONATION_SKILL_POINT_INTERVAL = 25;

const SHOP_BASE_PRICES = {

  heartRed: 3, heartBlue: 6, bomb: 5, key: 5, pill: 5, star: 7, sack: 8, battery: 9, trashbag: 10,
  pearl: 9, driftnet: 8, tideflask: 6,
  item: SHOP_ITEM_PRICE, trinket: SHOP_TRINKET_PRICE, familiar: SHOP_FAMILIAR_PRICE,
};

const SHOP_KIND_LABELS = {
  heartRed:'Red Heart', heartBlue:'Blue Heart', bomb:'Bomb', key:'Key', pill:'Pill', star:'Star',
  sack:'Sack', battery:'Battery', trashbag:'Trash Bag', item:'Item', trinket:'Trinket', familiar:'Familiar',
  pearl:'Pearl', driftnet:'Driftnet', tideflask:'Tide Flask',
};

function isDonationDiscountUnlocked(kind){
  const unlocks = ensureUnlockShape(loadUnlocks());
  return !!unlocks.donationDiscounts[kind];
}

const SHOP_FLOOR_PRICE_STEP = 0.055;
const SHOP_FLOOR_PRICE_MAX_FLOOR = 12;
function shopFloorPriceMult(floorNum){
  const f = Util.clamp(floorNum || 0, 0, SHOP_FLOOR_PRICE_MAX_FLOOR);
  return 1 + f * SHOP_FLOOR_PRICE_STEP;
}

function shopPrice(kind, floorNum){
  const base = SHOP_BASE_PRICES[kind] != null ? SHOP_BASE_PRICES[kind] : 8;
  const scaled = Math.max(1, Math.round(base * shopFloorPriceMult(floorNum)));
  return isDonationDiscountUnlocked(kind) ? Math.max(1, scaled - 1) : scaled;
}

function tryDonateMachine(game){
  const node = game.currentRoom, player = game.player;
  const machine = node.donationMachine;
  if (!machine) return;
  const px = machine.x * TILE, py = machine.y * TILE;
  if (Util.dist(player.x, player.y, px, py) > 30) return;

  const unlocks = ensureUnlockShape(loadUnlocks());
  if (unlocks.stats.donationTotal >= DONATION_CAP) { game.toast('The donation machine is fully funded.'); return; }
  if (player.coins < 1) { game.toast('No coins to donate.'); return; }

  player.coins -= 1;
  Sound.play('coin');
  game.floatTexts.push(new FloatText(player.x, player.y - 26, '-1c donated', '#e3c15b'));
  bumpStat('donationTotal', 1, game);
  awardDonationSkillPoints(game);
}

const REROLL_ALTAR_COSTS = [3, 6, 10, 15];
const REROLL_ALTAR_COST_STEP = 6;

function rerollAltarCost(altar){
  const uses = (altar && altar.uses) || 0;
  const last = REROLL_ALTAR_COSTS.length - 1;
  if (uses <= last) return REROLL_ALTAR_COSTS[uses];
  return REROLL_ALTAR_COSTS[last] + REROLL_ALTAR_COST_STEP * (uses - last);
}

function tryRerollAltar(game){
  const node = game.currentRoom, player = game.player;
  const altar = node.rerollAltar;
  if (!altar) return;
  const px = altar.x * TILE, py = altar.y * TILE;
  if (Util.dist(player.x, player.y, px, py) > 30) return;

  if (!countRerollableShopSlots(node)) { game.toast('Nothing left on the shelf to reroll.'); Sound.play('uiDeny'); return; }
  const cost = rerollAltarCost(altar);
  if (player.coins < cost) {
    Sound.play('uiDeny');
    game.toast('The altar wants ' + cost + 'c — need ' + (cost - player.coins) + ' more.');
    return;
  }

  player.coins -= cost;
  altar.uses++;
  const n = rerollShopSlots(node);
  Sound.play('itemGet');
  game.floatTexts.push(new FloatText(player.x, player.y - 26, '-' + cost + 'c reroll', '#a98bff'));
  bumpStat('coinsSpent', cost, game);
  bumpStat('rerollAltarUses', 1, game);
  game.toast('Rerolled ' + n + ' slot' + (n === 1 ? '' : 's') + ' — next reroll ' + rerollAltarCost(altar) + 'c.');
}

const UPGRADE_STATION_COST = 50;
const UPGRADE_STATION_MAX_TIER = 5;

const UPGRADE_STATION_TIER_LABELS = [
  'Unlocked nickels in the coin pool.',
  '+20% shop discount.',
  'Unlocked dimes in the coin pool.',
  '+10% shop discount.',
  '+5% melee and ranged damage.',
];

function applyUpgradeStationTier(game, tier){
  const player = game.player;
  if (tier === 1) game.wdNickelsUnlocked = true;
  else if (tier === 2) player.shopDiscountBonus += 0.20;
  else if (tier === 3) game.wdDimesUnlocked = true;
  else if (tier === 4) player.shopDiscountBonus += 0.10;
  else if (tier === 5) { player.meleeDamage += 0.05; player.rangedDamage += 0.05; }
}

function tryUpgradeStation(game){
  const node = game.currentRoom, player = game.player;
  const station = node.upgradeStation;
  if (!station) return;
  const px = station.x * TILE, py = station.y * TILE;
  if (Util.dist(player.x, player.y, px, py) > 30) return;

  if (station.tier >= UPGRADE_STATION_MAX_TIER) { game.toast('Upgrade station is maxed.'); return; }
  if (player.coins < UPGRADE_STATION_COST) {
    Sound.play('uiDeny');
    game.toast('The station wants ' + UPGRADE_STATION_COST + 'c — need ' + (UPGRADE_STATION_COST - player.coins) + ' more.');
    return;
  }

  player.coins -= UPGRADE_STATION_COST;
  station.tier++;
  applyUpgradeStationTier(game, station.tier);
  Sound.play('itemGet');
  game.floatTexts.push(new FloatText(player.x, player.y - 26, '-' + UPGRADE_STATION_COST + 'c upgrade', '#7fd9c9'));
  bumpStat('coinsSpent', UPGRADE_STATION_COST, game);
  game.toast('Tier ' + station.tier + ': ' + UPGRADE_STATION_TIER_LABELS[station.tier - 1]);
}

function donationProgressFrac(){
  const unlocks = ensureUnlockShape(loadUnlocks());
  return Util.clamp(unlocks.stats.donationTotal / DONATION_CAP, 0, 1);
}

const ARCADE_BOMB_REWARDS = ['cherrybomb', 'sparkfuse', 'demolitionrig', 'blastmaster'];
const ARCADE_KEY_REWARDS = ['skeletonkeyring', 'brasslockpick', 'vaultcrackerskit', 'mastervaultkey'];

const ARCADE_COIN_FILLY_REWARDS = ['heartRed', 'bomb', 'key', 'pill', 'star'];

const ARCADE_KEY_FILLY_CHEST_KINDS = [{ id:'grey', w:50 }, { id:'gold', w:30 }, { id:'stone', w:20 }];

function findNearestArcadeFixture(node, player){
  let best = null, bestDist = 30;
  const scan = (list, isFilly) => {
    if (!list) return;
    for (const f of list) {
      const px = f.x * TILE, py = f.y * TILE;
      const d = Util.dist(player.x, player.y, px, py);
      if (d <= bestDist) { best = { obj: f, isFilly }; bestDist = d; }
    }
  };
  scan(node.fillies, true);
  scan(node.machines, false);
  return best;
}

function tryArcadeInteract(game){
  const node = game.currentRoom, player = game.player;
  const found = findNearestArcadeFixture(node, player);
  if (!found) return;
  if (found.isFilly) feedArcadeFilly(game, found.obj);
  else useArcadeMachine(game, found.obj);
}

function feedArcadeFilly(game, filly){
  const player = game.player;
  switch (filly.kind) {
    case 'coin': {
      if (filly.done) { game.toast('This one looks satisfied.'); return; }
      if (player.coins < 1) { Sound.play('uiDeny'); game.toast('No coins to feed it.'); return; }
      player.coins -= 1;
      filly.fedCount++;
      bumpStat('arcadeFilliesFed', 1, game);
      grantPickupEffect(game, Util.choice(ARCADE_COIN_FILLY_REWARDS), player.x, player.y - 26);
      if (filly.fedCount >= 5 && !filly.done) {
        filly.done = true;
        bumpStat('arcadeFillyCapstonesReached', 1, game);
        const item = pickItemFromPool('treasure');
        if (item) applyItemToPlayer(game, item);
        Sound.play('itemGet');
        FX.twinkle(player.x, player.y - 30, '#e3c15b');
        game.floatTexts.push(new FloatText(player.x, player.y - 46, 'The Coin Filly beams!', '#e3c15b'));
      }
      break;
    }
    case 'bomb': {
      if (filly.done) { game.toast('This one looks satisfied.'); return; }
      if (player.bombs < 1) { Sound.play('uiDeny'); game.toast('No bombs to feed it.'); return; }
      player.bombs -= 1;
      filly.fedCount++;
      bumpStat('arcadeFilliesFed', 1, game);
      const n = Util.randi(1, 3);
      player.coins += n;
      player.heal(0.5);
      Sound.play('coin');
      game.floatTexts.push(new FloatText(player.x, player.y - 26, '+' + n + 'c, +½ heart', '#e3c15b'));
      if (filly.fedCount >= 4 && !filly.done) {
        filly.done = true;
        bumpStat('arcadeFillyCapstonesReached', 1, game);
        const item = ITEMS[Util.choice(ARCADE_BOMB_REWARDS)];
        if (item) applyItemToPlayer(game, item);
        Sound.play('itemGet');
        FX.twinkle(player.x, player.y - 30, '#e0895a');
        game.floatTexts.push(new FloatText(player.x, player.y - 46, 'The Bomb Filly beams!', '#e0895a'));
      }
      break;
    }
    case 'key': {
      if (filly.done) { game.toast('This one looks satisfied.'); return; }
      if (player.keys < 1) { Sound.play('uiDeny'); game.toast('No keys to feed it.'); return; }
      player.keys -= 1;
      filly.fedCount++;
      bumpStat('arcadeFilliesFed', 1, game);
      const chestKind = Util.weighted(ARCADE_KEY_FILLY_CHEST_KINDS).id;
      const spot = findNearestFloor(game.currentRoom, filly.x, filly.y);
      game.currentRoom.chests.push(new Chest(chestKind, spot.x, spot.y));
      Sound.play('chestOpen');
      game.floatTexts.push(new FloatText(player.x, player.y - 26, 'A chest appears!', '#dcdcdc'));
      if (filly.fedCount >= 4 && !filly.done) {
        filly.done = true;
        bumpStat('arcadeFillyCapstonesReached', 1, game);
        const item = ITEMS[Util.choice(ARCADE_KEY_REWARDS)];
        if (item) applyItemToPlayer(game, item);
        Sound.play('itemGet');
        FX.twinkle(player.x, player.y - 30, '#dcdcdc');
        game.floatTexts.push(new FloatText(player.x, player.y - 46, 'The Key Filly beams!', '#dcdcdc'));
      }
      break;
    }
    case 'heart': {
      if (filly.done) { game.toast('This one looks satisfied.'); return; }

      if (player.totalHearts() <= 1) { Sound.play('uiDeny'); game.toast("Can't spare your last heart."); return; }
      player.spendHearts(1);
      filly.fedCount++;
      bumpStat('arcadeFilliesFed', 1, game);
      const rewardKind = Util.choice(['pill', 'star', 'trinket', 'blueHeart']);
      if (rewardKind === 'trinket') {
        const trinket = pickTrinketFromPool();

        if (trinket) addTrinketPedestal(game.currentRoom, trinket, filly.x, filly.y);
        else grantPickupEffect(game, 'star', player.x, player.y - 26);
      } else if (rewardKind === 'blueHeart') {
        grantPickupEffect(game, 'heartBlue', player.x, player.y - 26);
      } else {
        grantPickupEffect(game, rewardKind, player.x, player.y - 26);
      }
      if (filly.fedCount >= 4 && !filly.done) {
        filly.done = true;
        bumpStat('arcadeFillyCapstonesReached', 1, game);
        const item = pickItemFromPool('sombra');
        if (item) applyItemToPlayer(game, item);
        Sound.play('itemGet');
        FX.twinkle(player.x, player.y - 30, '#e35b6a');
        game.floatTexts.push(new FloatText(player.x, player.y - 46, 'The Heart Filly beams!', '#e35b6a'));
      }
      break;
    }
    case 'battery': {

      const charged = !!player.activeItem;
      if (!charged) { Sound.play('uiDeny'); game.toast('No active item.'); return; }
      if (player.coins < 3) { Sound.play('uiDeny'); game.toast('Needs 3 coins to charge.'); return; }
      player.coins -= 3;
      filly.fedCount++;
      bumpStat('arcadeFilliesFed', 1, game);
      player.activeCharge = Math.min(player.activeItem.maxCharge, player.activeCharge + 3);
      Sound.play('battery');
      game.floatTexts.push(new FloatText(player.x, player.y - 26, '+3 charge', '#7fd6c9'));
      break;
    }
  }
}

const ARCADE_SPIN_DELAY = 0.45;

function useArcadeMachine(game, machine){
  const player = game.player;
  switch (machine.kind) {
    case 'friendship': {
      if (player.coins < 1) { Sound.play('uiDeny'); game.toast('No coins to feed it.'); return; }
      player.coins -= 1;
      bumpStat('arcadeMachinesUsed', 1, game);
      const win = RNG.random() < 0.5;
      machine.spinning = true;
      machine.spinTimer = ARCADE_SPIN_DELAY;
      machine.pendingOutcome = win ? { win: true, kind: Util.weighted(COMMON_HEART_POOL).id } : { win: false };
      break;
    }
    case 'tools': {
      if (player.coins < 2) { Sound.play('uiDeny'); game.toast('Needs 2 coins.'); return; }
      player.coins -= 2;
      bumpStat('arcadeMachinesUsed', 1, game);
      const win = RNG.random() < 0.5;
      machine.spinning = true;
      machine.spinTimer = ARCADE_SPIN_DELAY;
      machine.pendingOutcome = win ? { win: true, kind: Util.choice(['key', 'bomb']) } : { win: false };
      break;
    }
    case 'dark': {
      if (player.coins < 4) { Sound.play('uiDeny'); game.toast('Needs 4 coins.'); return; }
      player.coins -= 4;
      bumpStat('arcadeMachinesUsed', 1, game);
      grantPickupEffect(game, Util.choice(['pill', 'star']), player.x, player.y - 26);
      break;
    }
  }
}

function updateArcadeMachines(game, dt){
  const node = game.currentRoom;
  if (!node || !node.machines) return;
  const player = game.player;
  for (const m of node.machines) {
    if (!m.spinning) continue;
    m.spinTimer -= dt;
    if (m.spinTimer > 0) continue;
    m.spinning = false;
    const outcome = m.pendingOutcome;
    m.pendingOutcome = null;
    if (outcome && outcome.win) {
      FX.twinkle(m.x * TILE, m.y * TILE - 14, Theme.machine.spinRing);
      grantPickupEffect(game, outcome.kind, player.x, player.y - 26);
    } else {
      Sound.play('machineWhiff');
      game.toast('Nothing this time.');
    }
  }
}
