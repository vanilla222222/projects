'use strict';

const ACHIEVEMENT_PICKUP_KINDS = ['doublebomb', 'goldbomb', 'doublekey', 'goldkey', 'sack', 'battery', 'minibattery'];
const PICKUP_KIND_LABELS = {
  doublebomb:'Double Bomb', goldbomb:'Gold Bomb', doublekey:'Double Key', goldkey:'Gold Key',
  sack:'Sack', battery:'Battery', minibattery:'Mini Battery',
};

let _runUnlockSnapshot = null;
function beginRunUnlocks(){ _runUnlockSnapshot = ensureUnlockShape(loadUnlocks()); }
function endRunUnlocks(){ _runUnlockSnapshot = null; }
function currentUnlocks(){ return _runUnlockSnapshot || ensureUnlockShape(loadUnlocks()); }

function isPickupKindUnlocked(kind){
  if (ACHIEVEMENT_PICKUP_KINDS.indexOf(kind) === -1) return true;
  return !!currentUnlocks().unlockedPickups[kind];
}

function isTrinketUnlocked(trinketId){
  return !!currentUnlocks().unlockedTrinkets[trinketId];
}

function isFamiliarUnlocked(familiarId){
  return !!currentUnlocks().unlockedFamiliars[familiarId];
}

function isStarUnlocked(starId){
  return !!currentUnlocks().unlockedStars[starId];
}

function getStarRoomChanceBonus(){
  const unlocks = currentUnlocks();
  let bonus = 0;
  if (isSkillNodeOwned(unlocks, 'unlock_starroom_1')) bonus += 0.25;
  if (isSkillNodeOwned(unlocks, 'unlock_starroom_2')) bonus += 0.25;
  if (isSkillNodeOwned(unlocks, 'unlock_starroom_3')) bonus += 0.25;
  return bonus;
}

function isPillColorUnlocked(colorId){
  return !!currentUnlocks().unlockedPillColors[colorId];
}

function isEnemyUnlocked(enemyId){
  return !!currentUnlocks().unlockedEnemies[enemyId];
}

function isPathUnlocked(path){
  return !!currentUnlocks().unlockedPaths[path];
}

const ACHIEVEMENTS = [];

var _achvIndexReady = false;
function addAchievement(def){ ACHIEVEMENTS.push(def); if (_achvIndexReady) indexAchievement(def); }

const TIER_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

const TIER_REWARD_KEYS = ['itemId', 'trinketId', 'familiarId', 'starId', 'pickupKind', 'pillColorId', 'enemyId', 'classId', 'shopDiscount'];
function addTierSet(spec){
  const tiers = spec.tiers || [];
  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    const n = tier.threshold;
    const def = {
      id: spec.baseId + '_t' + (i + 1),
      name: tier.name != null ? tier.name
        : typeof spec.name === 'function' ? spec.name(n, i)
        : (tiers.length > 1 ? spec.name + ' ' + (TIER_NUMERALS[i] || (i + 1)) : spec.name),
      icon: tier.icon || spec.icon,
      desc: typeof spec.desc === 'function' ? spec.desc(n, i) : spec.desc,
      category: spec.category,
    };
    if (spec.statKey) def.statKey = spec.statKey;
    if (spec.bestiarySection) def.bestiarySection = spec.bestiarySection;
    if (spec.bestiaryId) def.bestiaryId = spec.bestiaryId;
    if (spec.distinct) def.distinctThreshold = n; else def.threshold = n;
    for (const key of TIER_REWARD_KEYS) if (tier[key] != null) def[key] = tier[key];
    addAchievement(def);
  }
}

