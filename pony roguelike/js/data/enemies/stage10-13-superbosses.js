'use strict';

const STAGE10_13_SUPERBOSSES = {
  palestine:  { id:'palestine', name:'Palestine DNB', hp:84, dmg:4, speed:68, radius:34,
    color:'#16324a', dark:'#0a1824', behavior:'g3SbPalestine', icon:'🕊️',
    desc:'THE CRUSH. Three bands, and each one takes another piece of the floor: rings that collapse onto you, a turning pressure cross layered over them, and finally both at once with a lunge threaded through. It barely leaves the middle of the room — this fight is about where you are allowed to stand.' },
  warden:     { id:'warden', name:'Warden DNB', hp:88, dmg:4, speed:72, radius:33,
    color:'#101018', dark:'#08080c', behavior:'g3SbWarden', icon:'🔒',
    desc:'THE LOCKDOWN. Unlit and untouchable, sweeping a searchlight around itself and mining the dark behind it. The only way to open a damage window is to let the beam find you — so the whole fight has to be walked into on purpose.' },
  notch:      { id:'notch', name:'Notch DNB', hp:92, dmg:4, speed:80, radius:33,
    color:'#5ae08a', dark:'#1e6a3a', behavior:'g3SbNotch', icon:'⛏️',
    desc:'THE BUILDER. It places lattice, deletes the cover you are hiding behind, and rewinds itself out of trouble whenever the exchange goes badly. Under a quarter of its bar it stops pretending to be a creature and simply strips the arena to bare floor.' },
  kirkinator: { id:'kirkinator', name:'The One True Kirkinator', hp:96, dmg:4, speed:92, radius:37,
    color:'#ff4fd8', dark:'#5c1050', behavior:'g3SbKirkinator', icon:'🌀',
    desc:'THE LAST EXIT. Thirty-four floors end here. Five bands — folds, collapses, lances, a pulsar sweep — and then a sixth state where the sweep never stops and the other three take turns punching through it. Every band change is one ring and one full second of stillness, because you deserve to be told the rules changed. Nothing in the game is deeper than this.' },
};
Object.assign(SUPERBOSSES, STAGE10_13_SUPERBOSSES);
SUPERBOSS_LIST.push(...Object.values(STAGE10_13_SUPERBOSSES));
