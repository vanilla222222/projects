'use strict';

const SUPERBOSSES = {
  polish:    { id:'polish', name:'Polish DNB', hp:60, dmg:3, speed:80, radius:30,
    color:'#c9a35a', dark:'#8a6a2e', behavior:'bossPolish', icon:'🥊' },
  tyrone:    { id:'tyrone', name:'Tyrone, the DNB King', hp:62, dmg:3, speed:68, radius:33,
    color:'#9c3a3a', dark:'#5c1f1f', behavior:'bossTyrone', icon:'👑' },
  pineapple: { id:'pineapple', name:'Pineapple Gatorade DNB', hp:64, dmg:3, speed:82, radius:29,
    color:'#e0d23a', dark:'#8a7a1e', behavior:'bossPineapple', icon:'🍍' },
  israel:    { id:'israel', name:'Israel DNB', hp:64, dmg:3, speed:82, radius:29,
    color:'#3a6ec9', dark:'#1e3a7a', behavior:'bossIsrael', icon:'⭐' },
  algae:     { id:'algae', name:'Algae DNB', hp:66, dmg:4, speed:72, radius:31,
    color:'#4a9c9c', dark:'#1e4a4a', behavior:'bossAlgae', icon:'🧊' },
  lilac:     { id:'lilac', name:'Lilac DNB', hp:66, dmg:4, speed:76, radius:29,
    color:'#b47ad9', dark:'#5c2e7a', behavior:'bossLilac', icon:'🌸' },

  plapper:    { id:'plapper', name:'PlapperDNB', hp:68, dmg:4, speed:74, radius:31,
    color:'#5a4ae0', dark:'#2a1e7a', behavior:'bossPlapper', icon:'🔊' },
  clapper:    { id:'clapper', name:'ClapperDNB', hp:68, dmg:4, speed:88, radius:27,
    color:'#e08a3a', dark:'#7a4414', behavior:'bossClapper', icon:'👏' },
  nhm:        { id:'nhm', name:'NHMDNB', hp:70, dmg:4, speed:60, radius:33,
    color:'#2ec9a0', dark:'#12604c', behavior:'bossNhm', icon:'🎧' },
  vanilladnb: { id:'vanilladnb', name:'VanillaDNB', hp:70, dmg:4, speed:78, radius:30,
    color:'#f0e0c0', dark:'#a08a5a', behavior:'bossVanillaDnb', icon:'🍦' },
  onetruednb: { id:'onetruednb', name:'The One True DNB', hp:76, dmg:4, speed:82, radius:34,
    color:'#ffd447', dark:'#8a6a10', behavior:'bossOneTrueDnb', icon:'🌀' },

  drenched:   { id:'drenched', name:'Drenched DNB', hp:62, dmg:3, speed:78, radius:31,
    color:'#4a86c9', dark:'#1e3f6a', behavior:'bossStormbringer', icon:'🌊' },
  brazil:     { id:'brazil', name:'Brazil DNB', hp:68, dmg:4, speed:84, radius:30,
    color:'#3aa85a', dark:'#1a5c2e', behavior:'bossCanopyStalker', icon:'🇧🇷' },
  israelprime:{ id:'israelprime', name:'Israel DNB Prime', hp:72, dmg:4, speed:80, radius:32,
    color:'#5a8ee0', dark:'#22407a', behavior:'bossIsrael', icon:'✡️' },
  kirk:       { id:'kirk', name:'Kirk DNB', hp:78, dmg:4, speed:86, radius:34,
    color:'#c95a3a', dark:'#6a2412', behavior:'bossOneTrueDnb', icon:'🎤' },

  wobbler:    { id:'wobbler', name:'WobblerDNB', hp:73, dmg:4, speed:94, radius:27,
    color:'#8a3ae0', dark:'#3e1470', behavior:'bossEclipseWraith', icon:'〰️' },
  subdrop:    { id:'subdrop', name:'SubdropDNB', hp:75, dmg:4, speed:58, radius:35,
    color:'#c93a5a', dark:'#5e1226', behavior:'bossIronBastion', burstRadius:100, icon:'🔻' },

  monsoon:    { id:'monsoon', name:'Monsoon DNB', hp:74, dmg:4, speed:90, radius:28,
    color:'#3ac0e0', dark:'#12546a', behavior:'bossBlizzardWraith', icon:'🌀' },
  mangrove:   { id:'mangrove', name:'Mangrove DNB', hp:76, dmg:4, speed:64, radius:34,
    color:'#8a9c3a', dark:'#3e4a12', behavior:'bossVineHorror', icon:'🌿' },

  astrolabe:  { id:'astrolabe', name:'Astrolabe DNB', hp:63, dmg:3, speed:88, radius:27,
    color:'#c9b06a', dark:'#6a5a24', behavior:'bossGlassScorpion', icon:'🧭' },
  orrery:     { id:'orrery', name:'Orrery DNB', hp:70, dmg:4, speed:60, radius:34,
    color:'#e0b45a', dark:'#7a5c14', behavior:'bossBrickGolem', icon:'🪐' },
  singularity:{ id:'singularity', name:'The Singularity', hp:79, dmg:4, speed:80, radius:35,
    color:'#9ab8ff', dark:'#2a3a7a', behavior:'bossSlagbound', icon:'🌌' },
};
const SUPERBOSS_LIST = Object.values(SUPERBOSSES);
