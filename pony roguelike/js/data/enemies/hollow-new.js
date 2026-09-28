'use strict';

Object.assign(ENEMY_TYPES, {
  choirwraith: { id:'choirwraith', name:'DNB Choir Wraith', hp:8, dmg:2, speed:60, radius:13, color:'#7a7a90', dark:'#3a3a48',
    behavior:'hlw2Choirwraith', phaseCooldown:3, floorKey:'13' },
  cantorhulk: { id:'cantorhulk', name:'DNB Cantor Hulk', hp:14, dmg:3, speed:30, radius:19, color:'#5a5a70', dark:'#2c2c38',
    behavior:'hlw2Cantorhulk', pullCooldown:3.2, floorKey:'13' },
  dirgesiren: { id:'dirgesiren', name:'DNB Dirge Siren', hp:7, dmg:2, speed:46, radius:12, color:'#9a9ab0', dark:'#4c4c58',
    behavior:'hlw2Dirgesiren', keepDistance:200, floorKey:'13' },
  quietstalker: { id:'quietstalker', name:'DNB Quiet Stalker', hp:8, dmg:2, speed:60, radius:13, color:'#4a4a60', dark:'#24242e',
    behavior:'hlw2Quietstalker', mirrorRange:240, floorKey:'13' },
  refrainbrood: { id:'refrainbrood', name:'DNB Refrain Brood', hp:9, dmg:2, speed:44, radius:15, color:'#8a8aa0', dark:'#44444e',
    behavior:'hlw2Refrainbrood', spawnCooldown:3.5, floorKey:'13' },
  vesperwarden: { id:'vesperwarden', name:'DNB Vesper Warden', hp:8, dmg:2, speed:54, radius:14, color:'#b0a0c8', dark:'#584f64',
    behavior:'hlw2Vesperwarden', barrageCooldown:2.4, floorKey:'13' },
  tacetsentinel: { id:'tacetsentinel', name:'DNB Tacet Sentinel', hp:12, dmg:3, speed:0, radius:18, color:'#6a6a80', dark:'#34343f',
    behavior:'hlw2Tacetsentinel', beamCooldown:2.8, floorKey:'13' },
  requiemgolem: { id:'requiemgolem', name:'DNB Requiem Golem', hp:15, dmg:3, speed:28, radius:20, color:'#3a3a50', dark:'#1c1c27',
    behavior:'hlw2Requiemgolem', quakeCooldown:3.2, floorKey:'13' },
  overtoneweaver: { id:'overtoneweaver', name:'DNB Overtone Weaver', hp:7, dmg:2, speed:58, radius:13, color:'#a8b0d0', dark:'#545868',
    behavior:'hlw2Overtoneweaver', webCooldown:2.4, floorKey:'13' },
  hollowidol: { id:'hollowidol', name:'DNB Hollow Idol', hp:16, dmg:3, speed:0, radius:21, color:'#2a2a40', dark:'#14141f',
    behavior:'hlw2Hollowidol', novaCooldown:3, floorKey:'13' },
});
