'use strict';

const LEGACY_EXTRA_BOSS_TYPES = {
  charnelwarden: { id:'charnelwarden', name:'The Charnel Warden', hp:48, dmg:3, speed:64, radius:28,
    color:'#7a6a58', dark:'#3e352a', behavior:'bossCharnelWarden', stage:0,
    desc:'Alternates a full-room charge with a ring of grave spikes erupting straight up from the floor.' },
  thornmother: { id:'thornmother', name:'The Thornmother', hp:50, dmg:2, speed:54, radius:29,
    color:'#3a6a2a', dark:'#1c3814', behavior:'bossThornmother', stage:1,
    desc:'Roots into the ground and grows a slowly rotating cross of thorns before breaking free to close distance.' },
  dunesovereign: { id:'dunesovereign', name:'The Dune Sovereign', hp:52, dmg:3, speed:70, radius:27,
    color:'#d9b463', dark:'#8a6e35', behavior:'bossDuneSovereign', stage:2,
    desc:'Submerges beneath the sand, untouchable, then erupts directly under you — otherwise circles and fires from range.' },
  ashencolossus: { id:'ashencolossus', name:'The Ashen Colossus', hp:54, dmg:3, speed:42, radius:32,
    color:'#5a2418', dark:'#2c0f0a', behavior:'bossAshenColossus', stage:3,
    desc:'A slow, lumbering wall that leaves smoldering embers in its own footprints and periodically slams for a full shockwave.' },
};
Object.assign(BOSS_TYPES, LEGACY_EXTRA_BOSS_TYPES);
BOSS_LIST.push(...Object.values(LEGACY_EXTRA_BOSS_TYPES));
