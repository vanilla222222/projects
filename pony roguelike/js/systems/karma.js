'use strict';

const KARMA_MACHINE_DEFS = {
  key: { label: 'key', totalUnlocks: 10, perUnlock: 25, stat: 'karmaKeysDonated', awardedStat: 'karmaKeyUnlocks', color: '#e8d98a' },
  bomb: { label: 'bomb', totalUnlocks: 10, perUnlock: 25, stat: 'karmaBombsDonated', awardedStat: 'karmaBombUnlocks', color: '#c9c9d6' },
  heart: { label: 'heart', totalUnlocks: 20, perUnlock: 50, stat: 'karmaHeartsDonated', awardedStat: 'karmaHeartUnlocks', color: '#e35b6a' },
  familiar: { label: 'familiar', totalUnlocks: 10, perUnlock: 3, stat: 'karmaFamiliarsDonated', awardedStat: 'karmaFamiliarUnlocks', color: '#8fd6a8' },
};

const KARMA_MACHINE_ORDER = ['key', 'bomb', 'heart', 'familiar'];

function karmaMachineProgressFrac(resource){
  const def = KARMA_MACHINE_DEFS[resource];
  if (!def) return 0;
  const unlocks = ensureUnlockShape(loadUnlocks());
  const donated = unlocks.stats[def.stat] || 0;
  return Util.clamp(donated / (def.totalUnlocks * def.perUnlock), 0, 1);
}

function karmaMachineFull(resource){
  const def = KARMA_MACHINE_DEFS[resource];
  if (!def) return true;
  const unlocks = ensureUnlockShape(loadUnlocks());
  return (unlocks.stats[def.awardedStat] || 0) >= def.totalUnlocks;
}

function findNearestKarmaMachine(node, player){
  if (!node || !node.karmaMachines || !node.karmaMachines.length) return null;
  let best = null, bestD = 30;
  for (const m of node.karmaMachines) {
    const d = Util.dist(player.x, player.y, m.x * TILE, m.y * TILE);
    if (d <= bestD) { bestD = d; best = m; }
  }
  return best;
}

function awardKarmaUnlocks(game, resource){
  const def = KARMA_MACHINE_DEFS[resource];
  if (!def) return;
  const unlocks = ensureUnlockShape(loadUnlocks());
  const donated = unlocks.stats[def.stat] || 0;
  const eligible = Math.min(def.totalUnlocks, Math.floor(donated / def.perUnlock));
  const already = unlocks.stats[def.awardedStat] || 0;
  const gained = eligible - already;
  if (gained <= 0) return;
  unlocks.stats[def.awardedStat] = eligible;
  unlocks.skillTree.points += gained;
  unlocks.skillTree.lifetimeEarned = (unlocks.skillTree.lifetimeEarned || 0) + gained;
  saveUnlocks(unlocks);
  Sound.play('skillPointGain');
  if (game && game.toast) game.toast('💠 +' + gained + ' skill point' + (gained === 1 ? '' : 's') + ' from the ' + def.label + ' machine!');
}

function karmaSpendResource(game, resource){
  const player = game.player;
  if (resource === 'key') {
    if (player.keys < 1) { Sound.play('uiDeny'); game.toast('No keys to donate.'); return false; }
    player.keys -= 1;
    Sound.play('key');
    return true;
  }
  if (resource === 'bomb') {
    if (player.bombs < 1) { Sound.play('uiDeny'); game.toast('No bombs to donate.'); return false; }
    player.bombs -= 1;
    Sound.play('bomb');
    return true;
  }
  if (resource === 'heart') {
    if (player.totalHearts() <= 1) { Sound.play('uiDeny'); game.toast("Can't spare your last heart."); return false; }
    player.spendHearts(1);
    Sound.play('heart');
    return true;
  }
  if (resource === 'familiar') {
    if (!player.familiars || !player.familiars.length) { Sound.play('uiDeny'); game.toast('No familiars to donate.'); return false; }
    player.familiars.pop();
    Sound.play('itemGet');
    return true;
  }
  return false;
}

function tryDonateKarmaMachine(game, resourceType){
  if (resourceType === 'coin') { tryDonateMachine(game); return; }
  const node = game.currentRoom, player = game.player;
  if (!node) return;
  let resource = resourceType;
  if (!resource) {
    const machine = findNearestKarmaMachine(node, player);
    if (!machine) { tryDonateMachine(game); return; }
    resource = machine.resource;
  } else {
    const machine = (node.karmaMachines || []).find(m => m.resource === resource);
    if (!machine) return;
    if (Util.dist(player.x, player.y, machine.x * TILE, machine.y * TILE) > 30) return;
  }

  const def = KARMA_MACHINE_DEFS[resource];
  if (!def) return;
  if (karmaMachineFull(resource)) {
    Sound.play('uiDeny');
    game.toast('The ' + def.label + ' machine is fully funded.');
    return;
  }
  if (!karmaSpendResource(game, resource)) return;

  game.floatTexts.push(new FloatText(player.x, player.y - 26, '-1 ' + def.label + ' donated', def.color));
  bumpStat(def.stat, 1, game);
  awardKarmaUnlocks(game, resource);
  game.logEvent('karma', 'Donated a ' + def.label);
}
