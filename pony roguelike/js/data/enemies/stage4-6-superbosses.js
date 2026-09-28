'use strict';

const STAGE4_6_SUPERBOSSES = {
  iceagent: { id:'iceagent', name:'ICE Agent DNB', hp:66, dmg:4, speed:86, radius:29,
    color:'#bcd4e0', dark:'#5e6e7a', behavior:'bossIceAgentDnb', icon:'🧊',
    desc:'Frozen Desert’s apex. Runs a three-phase raid: pursuit dashes behind a cone of frost, then four corner blinks it is untouchable through, then a stationary counter-rotating double spiral — with a hound wave at 60% and mirages at 30%.' },
  mexico:   { id:'mexico', name:'Mexico DNB', hp:68, dmg:4, speed:88, radius:30,
    color:'#b07a44', dark:'#5c3d20', behavior:'bossMexicoDnb', icon:'🌵',
    desc:'Badlands’ apex, and a gunslinger to the bone: six fast rounds, a stationary reload that is your entire damage window, then three cross-room stampede charges laying grit rings. Bandits at 60%, haulers at 30%.' },
  g5:       { id:'g5', name:'G5 DNB', hp:70, dmg:4, speed:90, radius:30,
    color:'#3ac9c9', dark:'#186262', behavior:'bossG5Dnb', icon:'🏖️',
    desc:'The hardest fight in Group 1. Cycles a rotating five-point star barrage, jetwash passes that shove you and leave surf walls in their wake, and an undertow phase that drags you in while pulsing tight rings.' },
};
Object.assign(SUPERBOSSES, STAGE4_6_SUPERBOSSES);
SUPERBOSS_LIST.push(...Object.values(STAGE4_6_SUPERBOSSES));
