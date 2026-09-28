'use strict';

const ACHIEVEMENTS_BY_ID = {};
const _ACHV_BY_STATKEY = new Map();
const _ACHV_BY_BESTIARY_ID = new Map();
const _ACHV_BY_BESTIARY_SECTION = new Map();
const _ACHV_BY_CATEGORY = new Map();
function _indexPush(map, key, def){
  const arr = map.get(key);
  if (arr) arr.push(def); else map.set(key, [def]);
}
function indexAchievement(def){
  ACHIEVEMENTS_BY_ID[def.id] = def;
  if (def.statKey) _indexPush(_ACHV_BY_STATKEY, def.statKey, def);
  if (def.bestiarySection) {
    if (def.bestiaryId && def.threshold != null) _indexPush(_ACHV_BY_BESTIARY_ID, def.bestiarySection + '/' + def.bestiaryId, def);
    if (def.distinctThreshold != null) _indexPush(_ACHV_BY_BESTIARY_SECTION, def.bestiarySection, def);
  }
  _indexPush(_ACHV_BY_CATEGORY, def.category || 'Miscellaneous', def);
}
for (const a of ACHIEVEMENTS) indexAchievement(a);
_achvIndexReady = true;

function ensureUnlockShape(unlocks){
  if (!unlocks.achievements) unlocks.achievements = {};
  if (!unlocks.unlockedItems) unlocks.unlockedItems = {};
  if (!unlocks.unlockedPickups) unlocks.unlockedPickups = {};
  if (!unlocks.unlockedTrinkets) unlocks.unlockedTrinkets = {};
  if (!unlocks.unlockedFamiliars) unlocks.unlockedFamiliars = {};
  if (!unlocks.unlockedStars) unlocks.unlockedStars = {};

  if (!unlocks.unlockedPillColors) unlocks.unlockedPillColors = {};
  if (!unlocks.unlockedEnemies) unlocks.unlockedEnemies = {};

  if (!unlocks.unlockedPaths) unlocks.unlockedPaths = { C:false, D:false };
  if (!unlocks.winsByClass) unlocks.winsByClass = {};

  if (!unlocks.donationDiscounts) unlocks.donationDiscounts = {};

  if (!unlocks.bestiary) unlocks.bestiary = {};
  const b = unlocks.bestiary;
  if (!b.enemyKills) b.enemyKills = {};
  if (!b.enemyDeaths) b.enemyDeaths = {};

  if (!b.familiarUseCount) b.familiarUseCount = {};
  if (!b.objectsSeen) b.objectsSeen = {};
  if (!b.objectsDestroyed) b.objectsDestroyed = {};
  if (!b.seenItems) b.seenItems = {};
  if (!b.seenTrinkets) b.seenTrinkets = {};
  if (!b.seenFamiliars) b.seenFamiliars = {};
  if (!b.seenStars) b.seenStars = {};
  if (!b.seenPills) b.seenPills = {};
  if (!b.seenPickupKinds) b.seenPickupKinds = {};
  if (!b.seenRoomTypes) b.seenRoomTypes = {};
  if (!b.seenStages) b.seenStages = {};

  if (!b.itemsCollectedCount) b.itemsCollectedCount = {};
  if (!b.trinketsEquippedCount) b.trinketsEquippedCount = {};
  if (!b.familiarsCollectedCount) b.familiarsCollectedCount = {};
  if (!b.starsUsedCount) b.starsUsedCount = {};
  if (!b.pillsDrunkCount) b.pillsDrunkCount = {};
  if (!b.pickupKindsCollectedCount) b.pickupKindsCollectedCount = {};
  if (!b.roomTypesVisitedCount) b.roomTypesVisitedCount = {};
  if (!b.stagesVisitedCount) b.stagesVisitedCount = {};

  if (!b.tiersAwarded) b.tiersAwarded = {};

  if (!unlocks.skillTree) unlocks.skillTree = { points: 0, spent: {}, unlockedNodes: {} };
  if (unlocks.skillTree.points == null) unlocks.skillTree.points = 0;
  if (!unlocks.skillTree.spent) unlocks.skillTree.spent = {};
  if (!unlocks.skillTree.unlockedNodes) unlocks.skillTree.unlockedNodes = {};

  if (unlocks.skillTree.lifetimeEarned == null) {
    let spentTotal = 0;
    for (const k in unlocks.skillTree.spent) spentTotal += unlocks.skillTree.spent[k] || 0;
    unlocks.skillTree.lifetimeEarned = unlocks.skillTree.points + spentTotal;
  }

  const statDefaults = {
    secretRoomsFound:0, chestsOpened:0, rocksBombed:0, coinsSpent:0, cursedChestsOpened:0,
    enemiesKilled:0, bossesKilled:0, coinsCollected:0, goldChestsOpened:0, stoneChestsOpened:0,
    obstaclesDestroyed:0, bombsPlaced:0, shotsFired:0, critsLanded:0, itemsCollected:0,
    trinketsEquipped:0, familiarsCollected:0, deaths:0, wins:0, roomsCleared:0,
    shopPurchases:0, activeItemUses:0, meleeKills:0, rangedKills:0, donationTotal:0, pillsUsed:0, keysUsed:0, starsUsed:0,

    donationSkillPointsAwarded:0,

    petshopsVisited:0, curseRoomsVisited:0, sacrificeSpikesTriggered:0, vaultsOpened:0,
    challengeRoomsCompleted:0, crystalRoomsVisited:0, sombraDealsTaken:0, crystalDealsTaken:0, swarmerdnbKilled:0,
    turretsDestroyed:0, bombBarrelsDetonated:0,

    treasureRoomsVisited:0, shopRoomsVisited:0, secretRoomsVisited:0,
    sacrificeRoomsVisited:0, vaultRoomsVisited:0, challengeRoomsVisited:0,
    sombraRoomsVisited:0, shrineRoomsVisited:0,

    arcadeRoomsVisited:0,

    starRoomsVisited:0, rerollAltarUses:0,

    cBranchFloorsVisited:0, cBranchRunsCompleted:0,

    dBranchFloorsVisited:0, dBranchRunsCompleted:0,

    enemiesFrozen:0,

    fliesKilled:0,

    enemiesMarkedVulnerable:0,

    fireRingHits:0, changelingMinionsSummoned:0, enemiesCharmed:0, turretsBuilt:0,

    ecosystemSetActivations:0, arcadeFilliesFed:0, arcadeMachinesUsed:0, arcadeFillyCapstonesReached:0,

    mirrorRoomsVisited:0, karmaRoomsVisited:0, bossChallengeRoomsVisited:0, bossChallengesCompleted:0,
    mirrorBossesDefeated:0,

    karmaKeysDonated:0, karmaBombsDonated:0, karmaHeartsDonated:0, karmaFamiliarsDonated:0,
    karmaKeyUnlocks:0, karmaBombUnlocks:0, karmaHeartUnlocks:0, karmaFamiliarUnlocks:0,

    runsStarted:0, totalPlaytime:0,

    deepestFloor:0, fastestWinSeconds:null,

    bestWaveReached:0,
  };
  unlocks.stats = Object.assign({}, statDefaults, unlocks.stats || {});
  if (unlocks.donationTotal) {
    unlocks.stats.donationTotal = Math.max(unlocks.stats.donationTotal, unlocks.donationTotal);
    delete unlocks.donationTotal;
  }
  return unlocks;
}

function isItemUnlocked(itemId){
  return !!currentUnlocks().unlockedItems[itemId];
}

function unlockAchievement(achId, game){
  const def = ACHIEVEMENTS_BY_ID[achId];
  if (!def) return;
  const unlocks = ensureUnlockShape(loadUnlocks());
  if (unlocks.achievements[achId]) return;
  unlocks.achievements[achId] = true;

  let rewardItem = null;
  let rewardTrinket = null;
  let rewardFamiliar = null;
  let rewardStar = null;
  let rewardPillColor = null;
  let rewardEnemy = null;
  if (def.classId) {
    unlocks[def.classId] = true;
  } else if (def.itemId) {
    unlocks.unlockedItems[def.itemId] = true;
    rewardItem = ITEMS[def.itemId];
  } else if (def.pickupKind) {
    unlocks.unlockedPickups[def.pickupKind] = true;
  } else if (def.trinketId) {
    unlocks.unlockedTrinkets[def.trinketId] = true;
    rewardTrinket = TRINKETS[def.trinketId];
  } else if (def.familiarId) {
    unlocks.unlockedFamiliars[def.familiarId] = true;
    rewardFamiliar = FAMILIAR_TYPES[def.familiarId];
  } else if (def.starId) {
    unlocks.unlockedStars[def.starId] = true;
    rewardStar = STAR_TYPES[def.starId];
  } else if (def.pillColorId) {
    unlocks.unlockedPillColors[def.pillColorId] = true;
    rewardPillColor = PILL_COLORS_BY_ID[def.pillColorId];
  } else if (def.enemyId) {
    unlocks.unlockedEnemies[def.enemyId] = true;
    rewardEnemy = ENEMY_TYPES[def.enemyId];
  } else if (def.shopDiscount) {
    unlocks.donationDiscounts[def.shopDiscount] = true;
  } else if (def.skillPoints) {

    unlocks.skillTree.points += def.skillPoints;
    unlocks.skillTree.lifetimeEarned = (unlocks.skillTree.lifetimeEarned || 0) + def.skillPoints;
  }
  saveUnlocks(unlocks);

  if (def.classId) {
    const cls = CLASSES[def.classId];
    Sound.play('unlock');
    toast('New class unlocked: ' + (cls ? cls.name : def.classId) + '!', false, 'good');
  } else {
    Sound.play('achievement');

    const rewardIcon = rewardItem ? rewardItem.icon : rewardTrinket ? rewardTrinket.icon : rewardFamiliar ? rewardFamiliar.icon : rewardStar ? rewardStar.icon
      : rewardPillColor ? '💊' : rewardEnemy ? '👾' : def.skillPoints ? '💠' : '';
    const rewardLabel = rewardItem ? ('"' + rewardItem.name + '"')
      : rewardTrinket ? ('trinket "' + rewardTrinket.name + '"')
      : rewardFamiliar ? ('familiar "' + rewardFamiliar.name + '"')
      : rewardStar ? ('star "' + rewardStar.name + '"')
      : rewardPillColor ? ('pill color "' + rewardPillColor.name + '"')
      : rewardEnemy ? ('enemy "' + rewardEnemy.name + '"')
      : def.pickupKind ? PICKUP_KIND_LABELS[def.pickupKind]
      : def.shopDiscount ? (SHOP_KIND_LABELS[def.shopDiscount] + ' price -1c, permanently')
      : def.skillPoints ? (def.skillPoints + ' skill point' + (def.skillPoints === 1 ? '' : 's')) : null;
    toast('🏆 Achievement: ' + def.name + (rewardLabel ? ' — unlocked ' + (rewardIcon ? rewardIcon + ' ' : '') + rewardLabel : ''), true, 'good');
  }

  if (def.category === 'Superbosses') {
    const classId = achId.slice(achId.lastIndexOf('_') + 1);
    const bossIds = Object.keys(SUPERBOSSES);
    const gotAll = bossIds.every(b => unlocks.achievements['sb_' + b + '_' + classId]);
    if (gotAll) unlockAchievement('completionist_' + classId, game);
  }
}

function unlockPath(path, game){
  const unlocks = ensureUnlockShape(loadUnlocks());
  if (unlocks.unlockedPaths[path]) return;
  unlocks.unlockedPaths[path] = true;
  saveUnlocks(unlocks);
  if (game && game.toast) game.toast('🗝️ A new path has opened — look for its gate on your next run!');
}

function bumpStat(key, amount, game){
  const unlocks = ensureUnlockShape(loadUnlocks());
  unlocks.stats[key] = (unlocks.stats[key] || 0) + amount;
  saveUnlocks(unlocks);

  const watchers = _ACHV_BY_STATKEY.get(key);
  if (watchers) for (const a of watchers) {
    if (unlocks.stats[key] >= a.threshold) unlockAchievement(a.id, game);
  }
}

function awardDonationSkillPoints(game){
  const unlocks = ensureUnlockShape(loadUnlocks());
  const eligible = Math.floor((unlocks.stats.donationTotal || 0) / DONATION_SKILL_POINT_INTERVAL);
  const already = unlocks.stats.donationSkillPointsAwarded || 0;
  const gained = eligible - already;
  if (gained <= 0) return;
  unlocks.stats.donationSkillPointsAwarded = eligible;
  unlocks.skillTree.points += gained;
  unlocks.skillTree.lifetimeEarned = (unlocks.skillTree.lifetimeEarned || 0) + gained;
  saveUnlocks(unlocks);
  Sound.play('skillPointGain');
  if (game && game.toast) game.toast('💠 +' + gained + ' skill point' + (gained === 1 ? '' : 's') + ' from donating!');
}

function setStatMax(key, value){
  const unlocks = ensureUnlockShape(loadUnlocks());
  if (value > (unlocks.stats[key] || 0)) { unlocks.stats[key] = value; saveUnlocks(unlocks); return true; }
  return false;
}
function setStatMin(key, value){
  const unlocks = ensureUnlockShape(loadUnlocks());
  if (unlocks.stats[key] == null || value < unlocks.stats[key]) { unlocks.stats[key] = value; saveUnlocks(unlocks); return true; }
  return false;
}

const _BESTIARY_SEEN_TIER_MAP = {
  seenItems:       { category:'item',     countBucket:'itemsCollectedCount' },
  seenTrinkets:    { category:'trinket',  countBucket:'trinketsEquippedCount' },
  seenFamiliars:   { category:'familiar', countBucket:'familiarsCollectedCount' },
  seenStars:       { category:'star',     countBucket:'starsUsedCount' },
  seenPills:       { category:'pill',     countBucket:'pillsDrunkCount' },
  seenPickupKinds: { category:'pickup',   countBucket:'pickupKindsCollectedCount' },
  seenRoomTypes:   { category:'roomtype', countBucket:'roomTypesVisitedCount' },
  seenStages:      { category:'stage',    countBucket:'stagesVisitedCount' },
};

function bestiaryTierCategoryForEnemy(id){
  if (typeof SUPERBOSSES !== 'undefined' && SUPERBOSSES[id]) return 'superboss';
  if (typeof BOSS_TYPES !== 'undefined' && BOSS_TYPES[id]) return 'boss';
  return 'enemy';
}

function checkBestiaryTierUp(unlocks, category, id, count){
  const key = category + '/' + id;
  const prevTier = unlocks.bestiary.tiersAwarded[key] || 0;
  const newTier = bestiaryTierFor(category, count);
  if (newTier > prevTier) {
    unlocks.bestiary.tiersAwarded[key] = newTier;
    const gained = newTier - prevTier;
    unlocks.skillTree.points += gained;
    unlocks.skillTree.lifetimeEarned = (unlocks.skillTree.lifetimeEarned || 0) + gained;
    return newTier;
  }
  return 0;
}

function bumpBestiaryCount(section, id, amount, game){
  if (!id) return false;
  const unlocks = ensureUnlockShape(loadUnlocks());
  const bucket = unlocks.bestiary[section];
  const wasNew = !bucket[id];
  bucket[id] = (bucket[id] || 0) + amount;

  if (section === 'enemyKills') checkBestiaryTierUp(unlocks, bestiaryTierCategoryForEnemy(id), id, bucket[id]);
  else if (section === 'objectsDestroyed') checkBestiaryTierUp(unlocks, 'object', id, bucket[id]);
  else if (section === 'familiarUseCount') checkBestiaryTierUp(unlocks, 'familiarUseCount', id, bucket[id]);
  saveUnlocks(unlocks);
  checkBestiaryAchievements(section, id, bucket, game, true);
  return wasNew;
}

function markBestiarySeen(section, id, game){
  if (!id) return;
  const unlocks = ensureUnlockShape(loadUnlocks());
  const bucket = unlocks.bestiary[section];
  const wasNew = !bucket[id];
  if (wasNew) bucket[id] = true;
  const tierInfo = _BESTIARY_SEEN_TIER_MAP[section];
  if (tierInfo) {
    const counts = unlocks.bestiary[tierInfo.countBucket];
    counts[id] = (counts[id] || 0) + 1;
    checkBestiaryTierUp(unlocks, tierInfo.category, id, counts[id]);
  }
  if (wasNew || tierInfo) saveUnlocks(unlocks);

  if (wasNew) checkBestiaryAchievements(section, id, bucket, game, false);
}

function activeGame(){
  try { return typeof game !== 'undefined' ? game : null; } catch (e) { return null; }
}

function checkBestiaryAchievements(section, id, bucket, game, checkCount){
  const g = game || activeGame();
  if (checkCount) {
    const watchers = _ACHV_BY_BESTIARY_ID.get(section + '/' + id);
    if (watchers) {
      const count = bucket[id] || 0;
      for (const a of watchers) if (count >= a.threshold) unlockAchievement(a.id, g);
    }
  }
  const breadth = _ACHV_BY_BESTIARY_SECTION.get(section);
  if (breadth) {
    const distinct = Object.keys(bucket).length;
    for (const a of breadth) if (distinct >= a.distinctThreshold) unlockAchievement(a.id, g);
  }
}

function recordWin(game, classId){
  bumpStat('wins', 1, game);
  const unlocks = ensureUnlockShape(loadUnlocks());
  unlocks.winsByClass[classId] = true;
  saveUnlocks(unlocks);
  if (Object.keys(unlocks.winsByClass).length >= 3) unlockAchievement('triplethreat', game);
  if (Object.keys(unlocks.winsByClass).length >= 8) unlockAchievement('challenge_wins_8classes', game);
  if (Object.keys(unlocks.winsByClass).length >= 20) unlockAchievement('challenge_wins_allclasses', game);
  if (game.player.redMax <= 1) unlockAchievement('onehearted', game);
  if (game.player.redMax <= 1 && !game.player.tookDamageThisRun) unlockAchievement('challenge_onehearted_flawless', game);

  if (!game.player.visitedShopThisRun) unlockAchievement('challenge_frugal_run', game);
}

const ACHIEVEMENT_CATEGORY_ORDER = [
  'Characters', 'Superbosses', 'Completionist',
  'Mastery', 'Exploration', 'Collection', 'Challenge',
  'Donations', 'Miscellaneous',
];

let _achvFilter = 'all';

function buildAchievementsPanel(){
  const wrap = document.getElementById('achievementsList');
  if (!wrap) return;
  wrap.innerHTML = '';
  const unlocks = ensureUnlockShape(loadUnlocks());

  const totalDone = ACHIEVEMENTS.filter(a => unlocks.achievements[a.id]).length;
  const summaryEl = document.getElementById('achievementsSummary');
  if (summaryEl) summaryEl.textContent = totalDone + ' / ' + ACHIEVEMENTS.length + ' unlocked';

  const categories = ACHIEVEMENT_CATEGORY_ORDER.slice();
  for (const cat of _ACHV_BY_CATEGORY.keys()) if (categories.indexOf(cat) === -1) categories.push(cat);

  const distinctCounts = {};
  const distinctSeen = section => {
    if (distinctCounts[section] == null) distinctCounts[section] = Object.keys(unlocks.bestiary[section] || {}).length;
    return distinctCounts[section];
  };

  const frag = document.createDocumentFragment();
  for (const cat of categories) {
    const inCat = _ACHV_BY_CATEGORY.get(cat) || [];
    const catDone = inCat.filter(a => unlocks.achievements[a.id]).length;
    const shown = inCat.filter(a => {
      const done = !!unlocks.achievements[a.id];
      return _achvFilter === 'all' || (_achvFilter === 'unlocked' && done) || (_achvFilter === 'locked' && !done);
    });
    if (!shown.length) continue;
    const h = document.createElement('h3');
    h.className = 'achv-category';
    h.textContent = cat + ' (' + catDone + '/' + inCat.length + ')';
    frag.appendChild(h);
    const grid = document.createElement('div');
    grid.className = 'achv-grid';
    for (const a of shown) {
      const done = !!unlocks.achievements[a.id];
      const row = document.createElement('div');
      row.className = 'achv-row' + (done ? ' done' : '');
      const icon = document.createElement('div');
      icon.className = 'achv-icon';
      icon.textContent = done ? a.icon : '❓';
      row.appendChild(icon);
      const text = document.createElement('div');
      text.className = 'achv-text';
      const name = document.createElement('div');
      name.className = 'achv-name';
      name.textContent = done ? a.name : '???';
      text.appendChild(name);
      const desc = document.createElement('div');
      desc.className = 'achv-desc';

      if (done) desc.textContent = a.desc;
      else if (a.statKey) desc.textContent = Util.formatNum(unlocks.stats[a.statKey] || 0) + ' / ' + Util.formatNum(a.threshold);

      else if (a.bestiarySection && a.bestiaryId != null && a.threshold != null) {
        const b = unlocks.bestiary[a.bestiarySection] || {};
        desc.textContent = Util.formatNum(b[a.bestiaryId] || 0) + ' / ' + Util.formatNum(a.threshold);
      } else if (a.bestiarySection && a.distinctThreshold != null) {
        desc.textContent = Util.formatNum(distinctSeen(a.bestiarySection)) + ' / ' + Util.formatNum(a.distinctThreshold);
      } else desc.textContent = 'Not yet earned.';
      text.appendChild(desc);
      if (a.classId || a.itemId || a.pickupKind || a.trinketId || a.familiarId || a.starId || a.shopDiscount || a.skillPoints) {
        const rew = document.createElement('div');
        rew.className = 'achv-reward';
        if (a.classId) {
          const cls = CLASSES[a.classId];
          rew.textContent = 'Unlocks: ' + (done ? (cls ? cls.name : a.classId) : 'a new character');
        } else if (a.itemId) {
          const item = ITEMS[a.itemId];
          rew.textContent = done ? ('Reward: ' + item.icon + ' ' + item.name) : 'Reward: an item';
        } else if (a.trinketId) {
          const trinket = TRINKETS[a.trinketId];
          rew.textContent = done ? ('Reward: ' + trinket.icon + ' ' + trinket.name + ' (trinket)') : 'Reward: a trinket';
        } else if (a.familiarId) {
          const familiar = FAMILIAR_TYPES[a.familiarId];
          rew.textContent = done ? ('Reward: ' + familiar.icon + ' ' + familiar.name + ' (familiar)') : 'Reward: a familiar';
        } else if (a.starId) {
          const star = STAR_TYPES[a.starId];
          rew.textContent = done ? ('Reward: ' + star.icon + ' ' + star.name + ' (star)') : 'Reward: a star';
        } else if (a.shopDiscount) {
          rew.textContent = done ? ('Reward: ' + SHOP_KIND_LABELS[a.shopDiscount] + ' price -1c') : 'Reward: a permanent shop discount';
        } else if (a.skillPoints) {
          rew.textContent = 'Reward: 💠 ' + a.skillPoints + ' skill point' + (a.skillPoints === 1 ? '' : 's');
        } else {
          rew.textContent = done ? ('Reward: ' + PICKUP_KIND_LABELS[a.pickupKind] + ' pickups') : 'Reward: a special pickup';
        }
        text.appendChild(rew);
      }
      row.appendChild(text);
      grid.appendChild(row);
    }
    frag.appendChild(grid);
  }
  wrap.appendChild(frag);
}

for (const btn of document.querySelectorAll('#achievementsFilter button')) {
  btn.addEventListener('click', () => {
    _achvFilter = btn.dataset.filter;
    for (const b of document.querySelectorAll('#achievementsFilter button')) b.classList.toggle('active', b === btn);
    Sound.play('uiClick');
    buildAchievementsPanel();
  });
}
