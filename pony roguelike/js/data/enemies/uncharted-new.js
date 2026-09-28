'use strict';

Object.assign(ENEMY_TYPES, {
  frostwraith: { id:'frostwraith', name:'DNB Frost Wraith', hp:7, dmg:2, speed:70, radius:12, color:'#bfe8fa', dark:'#5c7c90',
    behavior:'uch3Frostwraith', phaseCooldown:3, floorKey:'10A' },
  avalanchehulk: { id:'avalanchehulk', name:'DNB Avalanche Hulk', hp:12, dmg:3, speed:30, radius:18, color:'#7a96a8', dark:'#3c4a54',
    behavior:'uch3Avalanchehulk', rollCooldown:3.4, floorKey:'10A' },
  glacialsiren: { id:'glacialsiren', name:'DNB Glacial Siren', hp:6, dmg:2, speed:46, radius:12, color:'#c9defa', dark:'#63708c',
    behavior:'uch3Glacialsiren', luresRadius:180, keepDistance:210, floorKey:'10A' },
  permafrostcolossus: { id:'permafrostcolossus', name:'DNB Permafrost Colossus', hp:14, dmg:3, speed:0, radius:20, color:'#8fb4c9', dark:'#465a64',
    behavior:'uch3Permafrostcolossus', slamCooldown:2.8, slamRadius:120, floorKey:'10A' },
  crystalstalker: { id:'crystalstalker', name:'DNB Crystal Stalker', hp:8, dmg:2, speed:60, radius:13, color:'#e0f4ff', dark:'#708ca0',
    behavior:'uch3Crystalstalker', mirrorRange:250, floorKey:'10A' },

  thornwarden: { id:'thornwarden', name:'DNB Thorn Warden', hp:8, dmg:2, speed:52, radius:14, color:'#4a7a2a', dark:'#243c15',
    behavior:'uch3Thornwarden', barrageCooldown:2.6, floorKey:'10B' },
  canopytitan: { id:'canopytitan', name:'DNB Canopy Titan', hp:13, dmg:3, speed:32, radius:19, color:'#3a5a1e', dark:'#1c2e0f',
    behavior:'uch3Canopytitan', pulseCooldown:3, pulseRadius:110, floorKey:'10B' },
  mirebrood: { id:'mirebrood', name:'DNB Mire Brood', hp:9, dmg:2, speed:44, radius:15, color:'#6a5a2a', dark:'#352d15',
    behavior:'uch3Mirebrood', spawnCooldown:4, floorKey:'10B' },
  jungleweaver: { id:'jungleweaver', name:'DNB Jungle Weaver', hp:7, dmg:2, speed:58, radius:13, color:'#7ac04a', dark:'#3c6025',
    behavior:'uch3Jungleweaver', webCooldown:2.4, floorKey:'10B' },
  idolcolossus: { id:'idolcolossus', name:'DNB Idol Colossus', hp:15, dmg:3, speed:0, radius:21, color:'#8a7a4a', dark:'#453d25',
    behavior:'uch3Idolcolossus', novaCooldown:3.2, novaRadius:120, floorKey:'10B' },
});
