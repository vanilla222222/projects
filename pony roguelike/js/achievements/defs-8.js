'use strict';

addAchievement({ id:'challenge_mangrove_flawless', name:'Not a Ripple', icon:'🌿',
  desc:'Defeat Mangrove DNB without taking damage in its boss room.', category:'Challenge', trinketId:'stillbrackwater' });
addAchievement({ id:'challenge_mangrove_floor_nodamage', name:'Untouched Shallows', icon:'🛡️',
  desc:'Clear all of Floor 11C without taking any damage.', category:'Challenge', itemId:'mgtrophy_challenge_floor_nodamage' });
addAchievement({ id:'challenge_mangrove_onehearted', name:'One Root Left', icon:'💔',
  desc:'Defeat Mangrove DNB with only one red heart of maximum health.', category:'Challenge', itemId:'mgtrophy_challenge_onehearted' });
addAchievement({ id:'challenge_mangrove_speedkill', name:'Quick Tide', icon:'⏱️',
  desc:'Defeat Mangrove DNB within 18 minutes of run time.', category:'Challenge', itemId:'mgtrophy_challenge_speedkill' });
addAchievement({ id:'challenge_mangrove_frugal', name:'Nothing Bought in the Shallows', icon:'👛',
  desc:'Defeat Mangrove DNB without ever visiting a shop this run.', category:'Challenge', trinketId:'emptycreel' });
addAchievement({ id:'challenge_mangrove_untouched_run', name:'Never Once Sank', icon:'🕊️',
  desc:'Defeat Mangrove DNB having taken no damage at any point this run.', category:'Challenge', familiarId:'saltboundwisp' });
addAchievement({ id:'challenge_mangroves_speedrun', name:'Racing the Tide', icon:'⏳',
  desc:'Reach Floor 11C within 20 minutes of run time.', category:'Challenge', itemId:'tidalclock' });

addAchievement({ id:'exploration_reach_11c', name:'The Tangled Shallows', icon:'🌿',
  desc:'Reach Floor 11C.', category:'Exploration', itemId:'mgtrophy_exploration_floor11c' });
addAchievement({ id:'exploration_meet_mangrove', name:'First Sight: Mangrove DNB', icon:'👁️',
  desc:'Encounter and defeat Mangrove DNB for the first time.', category:'Exploration', bestiarySection:'enemyKills', bestiaryId:'mangrove', threshold:1, itemId:'mgtrophy_exploration_meet_mangrove' });
addAchievement({ id:'exploration_meet_saltheron', name:'First Sight: Salt Heron', icon:'👁️',
  desc:'Encounter and defeat the DNB Salt Heron for the first time.', category:'Exploration', bestiarySection:'enemyKills', bestiaryId:'saltheron', threshold:1, itemId:'mgtrophy_meet_saltheron' });
addAchievement({ id:'exploration_meet_tidebloat', name:'First Sight: Tide Bloat', icon:'👁️',
  desc:'Encounter and defeat the DNB Tide Bloat for the first time.', category:'Exploration', bestiarySection:'enemyKills', bestiaryId:'tidebloat', threshold:1, itemId:'mgtrophy_meet_tidebloat' });
addAchievement({ id:'exploration_meet_mudtuskram', name:'First Sight: Mudtusk Ram', icon:'👁️',
  desc:'Encounter and defeat the DNB Mudtusk Ram for the first time.', category:'Exploration', bestiarySection:'enemyKills', bestiaryId:'mudtuskram', threshold:1, itemId:'mgtrophy_meet_mudtuskram' });
addAchievement({ id:'exploration_meet_mudskipper', name:'First Sight: Mudskipper', icon:'👁️',
  desc:'Encounter and defeat the DNB Mudskipper for the first time.', category:'Exploration', bestiarySection:'enemyKills', bestiaryId:'mudskipper', threshold:1, itemId:'mgtrophy_meet_mudskipper' });
addAchievement({ id:'exploration_meet_eelspitter', name:'First Sight: Eel Spitter', icon:'👁️',
  desc:'Encounter and defeat the DNB Eel Spitter for the first time.', category:'Exploration', bestiarySection:'enemyKills', bestiaryId:'eelspitter', threshold:1, itemId:'mgtrophy_meet_eelspitter' });
addAchievement({ id:'exploration_meet_crabmortar', name:'First Sight: Crab Mortar', icon:'👁️',
  desc:'Encounter and defeat the DNB Crab Mortar for the first time.', category:'Exploration', bestiarySection:'enemyKills', bestiaryId:'crabmortar', threshold:1, itemId:'mgtrophy_meet_crabmortar' });
addAchievement({ id:'exploration_meet_mireloper', name:'First Sight: Mire Loper', icon:'👁️',
  desc:'Encounter and defeat the DNB Mire Loper for the first time.', category:'Exploration', bestiarySection:'enemyKills', bestiaryId:'mireloper', threshold:1, itemId:'mgtrophy_meet_mireloper' });
addAchievement({ id:'exploration_meet_saltspitter', name:'First Sight: Salt Spitter', icon:'👁️',
  desc:'Encounter and defeat the DNB Salt Spitter for the first time.', category:'Exploration', bestiarySection:'enemyKills', bestiaryId:'saltspitter', threshold:1, itemId:'mgtrophy_meet_saltspitter' });
addAchievement({ id:'exploration_meet_bloatbladder', name:'First Sight: Bloat Bladder', icon:'👁️',
  desc:'Encounter and defeat the DNB Bloat Bladder for the first time.', category:'Exploration', bestiarySection:'enemyKills', bestiaryId:'bloatbladder', threshold:1, itemId:'mgtrophy_meet_bloatbladder' });
addAchievement({ id:'exploration_meet_siltboar', name:'First Sight: Silt Boar', icon:'👁️',
  desc:'Encounter and defeat the DNB Silt Boar for the first time.', category:'Exploration', bestiarySection:'enemyKills', bestiaryId:'siltboar', threshold:1, itemId:'mgtrophy_meet_siltboar' });
addAchievement({ id:'exploration_meet_mudlobster', name:'First Sight: Mud Lobster', icon:'👁️',
  desc:'Encounter and defeat the DNB Mud Lobster for the first time.', category:'Exploration', bestiarySection:'enemyKills', bestiaryId:'mudlobster', threshold:1, itemId:'mgtrophy_meet_mudlobster' });
addAchievement({ id:'exploration_meet_shellbulk', name:'First Sight: Shell Bulk', icon:'👁️',
  desc:'Encounter and defeat the DNB Shell Bulk for the first time.', category:'Exploration', bestiarySection:'enemyKills', bestiaryId:'shellbulk', threshold:1, itemId:'mgtrophy_meet_shellbulk' });

const MANGROVES_ORIGINAL_IDS = ['rootwraith', 'saltheron', 'tidebloat', 'brineplate', 'mudtuskram', 'barnaclespike', 'mudskipper', 'eelspitter', 'crabmortar', 'mangroveviper', 'tidewatcher', 'siltswirl', 'fiddlerborer', 'silthopper', 'brinesack', 'hivewader', 'mangrovemender', 'tidewarden', 'heronmarksman', 'brackblink', 'crocshade'];
const MANGROVES_FLAVOR_IDS = ['mireloper', 'tidedasher', 'saltspitter', 'bloatbladder', 'mangrovebat', 'siltboar', 'mudmortar', 'mudlobster', 'duskcircler', 'rootsentinel', 'brackmist', 'shellbulk'];
const MANGROVES_SUPERBOSS_IDS = ['mangrove'];

const MANGROVES_WATCH_IDS = new Set(MANGROVES_ORIGINAL_IDS.concat(MANGROVES_FLAVOR_IDS, MANGROVES_SUPERBOSS_IDS));
function checkMangrovesCollection(game){
  const unlocks = ensureUnlockShape(loadUnlocks());
  const bucket = unlocks.bestiary.enemyKills;
  const countIn = ids => ids.reduce((n, id) => n + (bucket[id] ? 1 : 0), 0);
  const origCount = countIn(MANGROVES_ORIGINAL_IDS), flavorCount = countIn(MANGROVES_FLAVOR_IDS), sb = countIn(MANGROVES_SUPERBOSS_IDS);
  const roster = origCount + flavorCount;
  if (roster >= 11) unlockAchievement('collection_mangroves_roster_t1', game);
  if (roster >= 22) unlockAchievement('collection_mangroves_roster_t2', game);
  if (roster >= 33) unlockAchievement('collection_mangroves_roster_t3', game);
  if (flavorCount >= 12) unlockAchievement('collection_mangroves_flavors', game);
  if (origCount >= 21) unlockAchievement('collection_mangroves_originals', game);
  if (roster + sb >= 34) unlockAchievement('collection_mangroves_grand', game);
}

addAchievement({ id:'collection_mangroves_roster_t1', name:'Shallows Fragments', icon:'🧩',
  desc:'Encounter and defeat 11 different kinds of Tangled Shallows foe (Floor 11C regular roster).', category:'Collection', itemId:'mgtrophy_collection_roster_t1' });
addAchievement({ id:'collection_mangroves_roster_t2', name:'Deep Into the Silt', icon:'🧩',
  desc:'Encounter and defeat 22 different kinds of Tangled Shallows foe (Floor 11C regular roster).', category:'Collection', itemId:'mgtrophy_collection_roster_t2' });
addAchievement({ id:'collection_mangroves_roster_t3', name:'The Whole Tangle', icon:'🌿',
  desc:'Encounter and defeat all 33 kinds of Tangled Shallows foe — Floor 11C\'s full regular roster.', category:'Collection', itemId:'mangrovecanopyheart' });
addAchievement({ id:'collection_mangroves_flavors', name:'Every Brackish Variant', icon:'🐊',
  desc:'Encounter and defeat all 12 flavor-variant foes of the Tangled Shallows.', category:'Collection', trinketId:'brackishvariant' });
addAchievement({ id:'collection_mangroves_originals', name:'The Original Roster', icon:'🍃',
  desc:'Encounter and defeat all 21 original foes of the Tangled Shallows.', category:'Collection', itemId:'mgtrophy_collection_originals' });
addAchievement({ id:'collection_mangroves_grand', name:'Nothing Left in the Silt', icon:'🌊',
  desc:'Encounter and defeat all 34 foes of the Tangled Shallows — every regular enemy and the Mangrove DNB superboss of Floor 11C.', category:'Collection', familiarId:'lasttidewatcher' });
