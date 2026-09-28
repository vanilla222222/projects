'use strict';

addAchievement({ id:'challenge_voidbetween_8d_speedrun', name:'Racing the Drift', icon:'⏳',
  desc:'Reach Floor 8D within 29 minutes of run time.', category:'Challenge', itemId:'voidchronometer' });
addAchievement({ id:'challenge_voidbetween_8d_nodamage', name:'Untouched Wreckage', icon:'🛡️',
  desc:'Clear all of Floor 8D without taking any damage.', category:'Challenge', itemId:'vbtrophy_challenge_nodamage' });
addAchievement({ id:'challenge_voidbetween_8d_frugal', name:'Nothing Bought in the Cold', icon:'👛',
  desc:'Clear Floor 8D without ever visiting a shop this run.', category:'Challenge', trinketId:'hollowdriftpouch' });
addAchievement({ id:'challenge_voidbetween_8d_untouched', name:'Never Once Struck by the Drift', icon:'🕊️',
  desc:'Clear Floor 8D having taken no damage at any point this run.', category:'Challenge', familiarId:'coldstarwisp' });

addAchievement({ id:'exploration_reach_8d', name:'The Void Between', icon:'🌌',
  desc:'Reach Floor 8D.', category:'Exploration', itemId:'vbtrophy_exploration_floor8d' });

addAchievement({ id:'exploration_meet_voidwisp', name:'First Sight: Void Wisp', icon:'👁️',
  desc:'Encounter and defeat the DNB Void Wisp for the first time.', category:'Exploration', bestiarySection:'enemyKills', bestiaryId:'voidwisp', threshold:1, itemId:'vbtrophy_meet_voidwisp' });
addAchievement({ id:'exploration_meet_derelictmoth', name:'First Sight: Derelict Moth', icon:'👁️',
  desc:'Encounter and defeat the DNB Derelict Moth for the first time.', category:'Exploration', bestiarySection:'enemyKills', bestiaryId:'derelictmoth', threshold:1, itemId:'vbtrophy_meet_derelictmoth' });
addAchievement({ id:'exploration_meet_wreckspark', name:'First Sight: Wreck Spark', icon:'👁️',
  desc:'Encounter and defeat the DNB Wreck Spark for the first time.', category:'Exploration', bestiarySection:'enemyKills', bestiaryId:'wreckspark', threshold:1, itemId:'vbtrophy_meet_wreckspark' });
addAchievement({ id:'exploration_meet_hullplate', name:'First Sight: Hull Plate', icon:'👁️',
  desc:'Encounter and defeat the DNB Hull Plate for the first time.', category:'Exploration', bestiarySection:'enemyKills', bestiaryId:'hullplate', threshold:1, itemId:'vbtrophy_meet_hullplate' });
addAchievement({ id:'exploration_meet_driftram', name:'First Sight: Drift Ram', icon:'👁️',
  desc:'Encounter and defeat the DNB Drift Ram for the first time.', category:'Exploration', bestiarySection:'enemyKills', bestiaryId:'driftram', threshold:1, itemId:'vbtrophy_meet_driftram' });
addAchievement({ id:'exploration_meet_silentturret', name:'First Sight: Silent Turret', icon:'👁️',
  desc:'Encounter and defeat the DNB Silent Turret for the first time.', category:'Exploration', bestiarySection:'enemyKills', bestiaryId:'silentturret', threshold:1, itemId:'vbtrophy_meet_silentturret' });
addAchievement({ id:'exploration_meet_driftleaper', name:'First Sight: Drift Leaper', icon:'👁️',
  desc:'Encounter and defeat the DNB Drift Leaper for the first time.', category:'Exploration', bestiarySection:'enemyKills', bestiaryId:'driftleaper', threshold:1, itemId:'vbtrophy_meet_driftleaper' });
addAchievement({ id:'exploration_meet_voidslinger', name:'First Sight: Void Slinger', icon:'👁️',
  desc:'Encounter and defeat the DNB Void Slinger for the first time.', category:'Exploration', bestiarySection:'enemyKills', bestiaryId:'voidslinger', threshold:1, itemId:'vbtrophy_meet_voidslinger' });
addAchievement({ id:'exploration_meet_wreckmortar', name:'First Sight: Wreck Mortar', icon:'👁️',
  desc:'Encounter and defeat the DNB Wreck Mortar for the first time.', category:'Exploration', bestiarySection:'enemyKills', bestiaryId:'wreckmortar', threshold:1, itemId:'vbtrophy_meet_wreckmortar' });
addAchievement({ id:'exploration_meet_stardrift', name:'First Sight: Star Drift', icon:'👁️',
  desc:'Encounter and defeat the DNB Star Drift for the first time.', category:'Exploration', bestiarySection:'enemyKills', bestiaryId:'stardrift', threshold:1, itemId:'vbtrophy_meet_stardrift' });
addAchievement({ id:'exploration_meet_hulkwatcher', name:'First Sight: Hulk Watcher', icon:'👁️',
  desc:'Encounter and defeat the DNB Hulk Watcher for the first time.', category:'Exploration', bestiarySection:'enemyKills', bestiaryId:'hulkwatcher', threshold:1, itemId:'vbtrophy_meet_hulkwatcher' });

const VOIDBETWEEN_8D_ROSTER_IDS = ["voidwisp","derelictmoth","wreckspark","hullplate","driftram","silentturret","driftleaper","voidslinger","wreckmortar","stardrift","hulkwatcher","debrissatellite","hulltunneler","driftmites","wreckhusk","voidcaller","hullmender","driftwarden","hulkmarksman","hullblink","shadowhulk","derelicthound","comethusk","wreckslinger","hullspark","duskmoth","hulkram","driftmortar","wrecktunneler","driftsatellite","derelictsentinel","driftblink","hullbulwark"];

const VOIDBETWEEN_WATCH_IDS = new Set(VOIDBETWEEN_8D_ROSTER_IDS);
function checkVoidBetweenCollection(game){
  const unlocks = ensureUnlockShape(loadUnlocks());
  const bucket = unlocks.bestiary.enemyKills;
  const count = VOIDBETWEEN_8D_ROSTER_IDS.reduce((n, id) => n + (bucket[id] ? 1 : 0), 0);
  if (count >= 11) unlockAchievement('collection_voidbetween_t1', game);
  if (count >= 22) unlockAchievement('collection_voidbetween_t2', game);
  if (count >= 33) unlockAchievement('collection_voidbetween_t3', game);
}

addAchievement({ id:'collection_voidbetween_t1', name:'Wreckage Fragments', icon:'🧩',
  desc:'Encounter and defeat 11 different kinds of Void Between foe from Floor 8D\'s regular roster.', category:'Collection', itemId:'vbtrophy_collection_t1' });
addAchievement({ id:'collection_voidbetween_t2', name:'Deep Into the Cold', icon:'🧩',
  desc:'Encounter and defeat 22 different kinds of Void Between foe from Floor 8D\'s regular roster.', category:'Collection', itemId:'vbtrophy_collection_t2' });
addAchievement({ id:'collection_voidbetween_t3', name:'The Whole Drift', icon:'🌌',
  desc:'Encounter and defeat all 33 kinds of Void Between foe — Floor 8D\'s full regular roster.', category:'Collection', itemId:'voidbetweenheart' });
