'use strict';

const C23SPECS = {
  Mawlet: ['aura', {"r": 119, "cd": 2.3, "n": 4, "col": "#e04040", "slam": 0, "mul": 0.6}],
  Gulletcrawler: ['hop', {"cd": 1.3, "dur": 0.37, "mul": 3.2, "land": 0, "col": "#e04040"}],
  Deepbiter: ['slam', {"r": 97, "cd": 2.6, "ring": 5, "mul": 0.48, "col": "#e04040"}],
  Depthenforcer: ['charge', {"cd": 2.7, "dur": 0.51, "mul": 3.9}],
  Mawsentry: ['aura', {"r": 120, "cd": 2.2, "n": 5, "col": "#e04040", "slam": 0, "mul": 0.6}],
  Crushbeast: ['charge', {"cd": 2.5, "dur": 0.78, "mul": 4.0}],
  Pressuredredge: ['phase', {"freq": 1.7, "mul": 1.4, "n": 2, "col": "#e04040"}],
  Mawhound: ['charge', {"cd": 2.3, "dur": 0.75, "mul": 4.1}],
  Depthrunner2: ['charge', {"cd": 2.3, "dur": 0.73, "mul": 3.9}],
  Crushonarcher: ['kite', {"keep": 292, "cd": 1.7, "n": 2, "spread": 0.35, "spd": 250, "pierce": 1, "col": "#e04040"}],
  Fangorbiter: ['orbit', {"range": 182, "spin": -1.2, "cd": 1.2, "n": 1, "spread": 0.4, "spd": 246, "col": "#e04040"}],
  Gulletpouncer: ['hop', {"cd": 0.9, "dur": 0.34, "mul": 3.4, "land": 5, "col": "#e04040"}],
  Fangstrafer: ['orbit', {"range": 186, "spin": -2.4, "cd": 1.0, "n": 2, "spread": 0.4, "spd": 253, "col": "#e04040"}],
  Forktonguemaw: ['kite', {"keep": 253, "cd": 2.3, "n": 3, "spread": 0.35, "spd": 270, "pierce": 0, "col": "#e04040"}],
  Gulletswarm: ['wander', {"freq": 9.6, "amp": 2.5, "mul": 1.24}],
  Fangambush: ['phase', {"freq": 2.0, "mul": 1.4, "n": 3, "col": "#e04040"}],
  Mawlobber: ['mine', {"cd": 1.1, "fuse": 1.6, "r": 55, "mul": 0.73}],
  Fangweaver: ['wander', {"freq": 5.2, "amp": 1.9, "mul": 1.29}],
  Gulletmole: ['blink', {"cd": 1.9, "range": 122, "n": 2, "col": "#e04040"}],
  Boneshielder: ['aura', {"r": 154, "cd": 2.2, "n": 3, "col": "#e04040", "slam": 0, "mul": 0.6}],
  Hitandrunmaw: ['blink', {"cd": 1.6, "range": 117, "n": 3, "col": "#e04040"}],
  Farmaw: ['kite', {"keep": 229, "cd": 1.7, "n": 2, "spread": 0.35, "spd": 267, "pierce": 1, "col": "#e04040"}],
  Mawturret: ['turret', {"cd": 1.8, "n": 1, "spread": 0.5, "spd": 229, "rot": 0, "col": "#e04040"}],
  Mawshielded: ['aura', {"r": 133, "cd": 2.3, "n": 4, "col": "#e04040", "slam": 0, "mul": 0.6}],
  Emberfiend: ['wander', {"freq": 6.2, "amp": 1.1, "mul": 1.08}],
  Emberreaver: ['hop', {"cd": 1.7, "dur": 0.55, "mul": 3.1, "land": 3, "col": "#e04040"}],
  Emberbrute: ['charge', {"cd": 2.4, "dur": 0.61, "mul": 3.9}],
  Embershade: ['orbit', {"range": 173, "spin": 2.2, "cd": 1.9, "n": 1, "spread": 0.4, "spd": 245, "col": "#e04040"}],
  Emberherald: ['turret', {"cd": 2.3, "n": 3, "spread": 2.6, "spd": 194, "rot": 0, "col": "#e04040"}],
  Emberflayer: ['kite', {"keep": 202, "cd": 1.5, "n": 2, "spread": 0.35, "spd": 324, "pierce": 0, "col": "#e04040"}],
  Emberwhelp: ['slam', {"r": 112, "cd": 2.8, "ring": 2, "mul": 0.48, "col": "#e04040"}],
  Wrathfulfiend: ['blink', {"cd": 2.4, "range": 102, "n": 4, "col": "#e04040"}],
  Wrathfulreaver: ['summon', {"max": 3, "cd": 4.8, "spawn": "gulletswarm"}],
  Wrathfulbrute: ['mine', {"cd": 1.2, "fuse": 1.4, "r": 68, "mul": 0.82}],
  Wrathfulshade: ['aura', {"r": 143, "cd": 2.1, "n": 3, "col": "#e04040", "slam": 0, "mul": 0.6}],
  Wrathfulherald: ['phase', {"freq": 1.5, "mul": 1.7, "n": 2, "col": "#e04040"}],
  Wrathfulflayer: ['wander', {"freq": 8.7, "amp": 2.2, "mul": 1.24}],
  Wrathfulwhelp: ['hop', {"cd": 0.8, "dur": 0.47, "mul": 3.5, "land": 0, "col": "#e04040"}],
  Wrathfulwarden: ['charge', {"cd": 2.6, "dur": 0.61, "mul": 4.4}],
  Bloodiedfiend: ['orbit', {"range": 171, "spin": 1.6, "cd": 1.8, "n": 3, "spread": 0.4, "spd": 230, "col": "#e04040"}]
};

for (const k in C23SPECS) {
  const [a, c] = C23SPECS[k];
  ENEMY_BEHAVIOR_HANDLERS['c23' + k] = function(game, e, dt){ FWF_ARCH[a](game, e, dt, c); };
}
