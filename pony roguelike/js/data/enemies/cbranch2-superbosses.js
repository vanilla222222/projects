'use strict';

const CBRANCH2_SUPERBOSSES = {
  undertow: { id:'undertow', name:'Undertow DNB', hp:8, dmg:3, speed:66, radius:29,
    color:'#3a6a86', dark:'#1c3644', behavior:'bossUndertow', icon:'🌊' },
  riptide: { id:'riptide', name:'Riptide DNB', hp:8, dmg:3, speed:58, radius:30,
    color:'#c9986a', dark:'#654e32', behavior:'bossRiptide', icon:'🐚' },
  thermocline: { id:'thermocline', name:'Thermocline DNB', hp:10, dmg:3, speed:54, radius:30,
    color:'#c9522e', dark:'#682a16', behavior:'bossThermocline', icon:'♨️' },
  requiem: { id:'requiem', name:'Requiem DNB', hp:14, dmg:3, speed:56, radius:30,
    color:'#5a4a8a', dark:'#2c2445', behavior:'bossRequiem', icon:'🔔' },
  abyssal: { id:'abyssal', name:'Abyssal DNB', hp:26, dmg:3, speed:108, radius:31,
    color:'#1c2850', dark:'#0c1226', behavior:'bossAbyssal', icon:'🌑' },
  leviathan: { id:'leviathan', name:'Leviathan DNB', hp:70, dmg:4, speed:60, radius:36,
    color:'#4a1a1a', dark:'#24100d', behavior:'bossLeviathan', icon:'🐋' },
};
Object.assign(SUPERBOSSES, CBRANCH2_SUPERBOSSES);
SUPERBOSS_LIST.push(...Object.values(CBRANCH2_SUPERBOSSES));
