'use strict';

const DBRANCH_BOSS_TYPES = {
  lenskeeper: { id:'lenskeeper', name:'The Lens Keeper', hp:6, dmg:2, speed:52, radius:26,
    color:'#c9c2a0', dark:'#68624a', behavior:'bossLensKeeper', floorKey:'4D' },
  domefracture: { id:'domefracture', name:'The Dome Fracture', hp:7, dmg:2, speed:58, radius:27,
    color:'#8ab0c8', dark:'#3e5866', behavior:'bossDomeFracture', floorKey:'5D' },
  meridianclockwork: { id:'meridianclockwork', name:'The Meridian Clockwork', hp:8, dmg:2, speed:56, radius:28,
    color:'#c08a3a', dark:'#60441c', behavior:'bossMeridianClockwork', floorKey:'6D' },
  gearwarden: { id:'gearwarden', name:'The Gearwarden', hp:10, dmg:3, speed:60, radius:28,
    color:'#a8763a', dark:'#543a1c', behavior:'bossGearwarden', floorKey:'7D' },
  colddrifter: { id:'colddrifter', name:'The Cold Drifter', hp:14, dmg:3, speed:64, radius:29,
    color:'#7a9ac0', dark:'#3a4a60', behavior:'bossColdDrifter', floorKey:'8D' },
  eventhorizon: { id:'eventhorizon', name:'The Event Horizon', hp:20, dmg:3, speed:50, radius:31,
    color:'#3a2c58', dark:'#1a1428', behavior:'bossEventHorizon', floorKey:'9D' },
  lastlight: { id:'lastlight', name:'The Last Light', hp:30, dmg:4, speed:58, radius:33,
    color:'#e0d8b0', dark:'#6c6640', behavior:'bossLastLight', floorKey:'10D' },

  dustlensward: { id:'dustlensward', name:'The Dust Lensward', hp:6, dmg:2, speed:48, radius:26,
    color:'#a89860', dark:'#544c30', behavior:'bossLensKeeper', floorKey:'4D' },
  shatterdome: { id:'shatterdome', name:'The Shatter Dome', hp:7, dmg:2, speed:62, radius:27,
    color:'#5a86a8', dark:'#2c4254', behavior:'bossDomeFracture', floorKey:'5D' },
  brassmeridian: { id:'brassmeridian', name:'The Brass Meridian', hp:8, dmg:2, speed:56, radius:28,
    color:'#d0a24a', dark:'#684e24', behavior:'bossMeridianClockwork', floorKey:'6D' },
  irongearwarden: { id:'irongearwarden', name:'The Iron Gearwarden', hp:10, dmg:3, speed:56, radius:28,
    color:'#7a5a30', dark:'#3c2c18', behavior:'bossGearwarden', floorKey:'7D' },
  frostdrifter: { id:'frostdrifter', name:'The Frost Drifter', hp:14, dmg:3, speed:68, radius:29,
    color:'#a0c0d8', dark:'#4c5c6c', behavior:'bossColdDrifter', floorKey:'8D' },
  voidhorizon: { id:'voidhorizon', name:'The Void Horizon', hp:20, dmg:3, speed:46, radius:31,
    color:'#241c38', dark:'#100c18', behavior:'bossEventHorizon', floorKey:'9D' },
  lastglow: { id:'lastglow', name:'The Last Glow', hp:30, dmg:4, speed:54, radius:33,
    color:'#c8b880', dark:'#5c5432', behavior:'bossLastLight', floorKey:'10D' },
};
Object.assign(BOSS_TYPES, DBRANCH_BOSS_TYPES);
BOSS_LIST.push(...Object.values(DBRANCH_BOSS_TYPES));
