'use strict';

Object.assign(ENEMY_TYPES, {
  feedbackphantom: { id:'feedbackphantom', name:'DNB Feedback Phantom', hp:8, dmg:2, speed:60, radius:13, color:'#8a4ac8', dark:'#442264',
    behavior:'shr3Feedbackphantom', phaseCooldown:3, floorKey:'12A' },
  resonanthulk: { id:'resonanthulk', name:'DNB Resonant Hulk', hp:14, dmg:3, speed:30, radius:19, color:'#6a3aa8', dark:'#33195a',
    behavior:'shr3Resonanthulk', pullCooldown:3.2, pullRadius:180, floorKey:'12A' },
  dissonantsiren: { id:'dissonantsiren', name:'DNB Dissonant Siren', hp:7, dmg:2, speed:46, radius:12, color:'#c85ad8', dark:'#642c6c',
    behavior:'shr3Dissonantsiren', keepDistance:200, floorKey:'12A' },
  bitcrusher: { id:'bitcrusher', name:'DNB Bitcrusher', hp:9, dmg:2, speed:70, radius:13, color:'#5a5ae0', dark:'#2c2c70',
    behavior:'shr3Bitcrusher', floorKey:'12A' },
  echostalker: { id:'echostalker', name:'DNB Echo Stalker', hp:8, dmg:2, speed:58, radius:13, color:'#a08ae8', dark:'#50447a',
    behavior:'shr3Echostalker', echoDelay:0.6, floorKey:'12A' },

  overloadbrood: { id:'overloadbrood', name:'DNB Overload Brood', hp:9, dmg:2, speed:44, radius:15, color:'#e0603a', dark:'#703018',
    behavior:'shr3Overloadbrood', spawnCooldown:3.5, floorKey:'12B' },
  clipsentinel: { id:'clipsentinel', name:'DNB Clip Sentinel', hp:12, dmg:3, speed:0, radius:18, color:'#e04a2a', dark:'#702414',
    behavior:'shr3Clipsentinel', beamCooldown:2.8, floorKey:'12B' },
  subbassgolem: { id:'subbassgolem', name:'DNB Sub-Bass Golem', hp:15, dmg:3, speed:28, radius:20, color:'#b03a1a', dark:'#581c0c',
    behavior:'shr3Subbassgolem', quakeCooldown:3.2, floorKey:'12B' },
  treblewarden: { id:'treblewarden', name:'DNB Treble Warden', hp:8, dmg:2, speed:54, radius:14, color:'#ff8a4a', dark:'#804424',
    behavior:'shr3Treblewarden', barrageCooldown:2.4, floorKey:'12B' },
  masteridol: { id:'masteridol', name:'DNB Master Idol', hp:16, dmg:3, speed:0, radius:21, color:'#ff5a2a', dark:'#802c14',
    behavior:'shr3Masteridol', novaCooldown:3, floorKey:'12B' },
});
