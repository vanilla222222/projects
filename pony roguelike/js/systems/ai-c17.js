'use strict';

const C17SPECS = {
  Ventscab: ['aura', {"r": 130, "cd": 1.8, "n": 3, "col": "#f09050", "slam": 0, "mul": 0.6}],
  Ashencrust: ['aura', {"r": 116, "cd": 2.0, "n": 3, "col": "#f09050", "slam": 0, "mul": 0.6}],
  Blacksmokervent: ['aura', {"r": 149, "cd": 2.3, "n": 3, "col": "#f09050", "slam": 0, "mul": 0.6}],
  Crushcrab: ['slam', {"r": 124, "cd": 2.3, "ring": 3, "mul": 0.52, "col": "#f09050"}],
  Depthgrinder: ['slam', {"r": 117, "cd": 3.1, "ring": 3, "mul": 0.53, "col": "#f09050"}],
  Scaldedmaw: ['slam', {"r": 92, "cd": 2.4, "ring": 4, "mul": 0.5, "col": "#f09050"}],
  Magmadartling: ['hop', {"cd": 1.8, "dur": 0.41, "mul": 3.1, "land": 1, "col": "#f09050"}],
  Ventdart: ['hop', {"cd": 1.7, "dur": 0.52, "mul": 3.5, "land": 4, "col": "#f09050"}],
  Cinderdartfish: ['hop', {"cd": 1.8, "dur": 0.53, "mul": 3.6, "land": 1, "col": "#f09050"}],
  Venthound: ['charge', {"cd": 1.6, "dur": 0.46, "mul": 4.1}],
  Ashrunner: ['charge', {"cd": 2.3, "dur": 0.53, "mul": 3.9}],
  Scaldedbowman: ['kite', {"keep": 268, "cd": 1.4, "n": 1, "spread": 0.35, "spd": 261, "pierce": 0, "col": "#f09050"}],
  Cinderorbiter: ['orbit', {"range": 107, "spin": -1.2, "cd": 1.3, "n": 2, "spread": 0.4, "spd": 270, "col": "#f09050"}],
  Ashpouncer: ['hop', {"cd": 1.8, "dur": 0.44, "mul": 3.2, "land": 1, "col": "#f09050"}],
  Cinderstrafer: ['orbit', {"range": 116, "spin": 2.0, "cd": 1.3, "n": 2, "spread": 0.4, "spd": 222, "col": "#f09050"}],
  Forktonguevent: ['kite', {"keep": 280, "cd": 1.4, "n": 2, "spread": 0.35, "spd": 303, "pierce": 0, "col": "#f09050"}],
  Cinderswarm: ['wander', {"freq": 7.7, "amp": 1.8, "mul": 1.08}],
  Smokerambush: ['phase', {"freq": 2.0, "mul": 1.7, "n": 2, "col": "#f09050"}],
  Cinderlobber: ['mine', {"cd": 1.6, "fuse": 1.8, "r": 72, "mul": 0.66}],
  Scaldweaver: ['wander', {"freq": 10.3, "amp": 1.9, "mul": 1.09}],
  Ventmole: ['blink', {"cd": 2.2, "range": 102, "n": 2, "col": "#f09050"}],
  Crustshielder: ['aura', {"r": 145, "cd": 2.5, "n": 3, "col": "#f09050", "slam": 0, "mul": 0.6}],
  Hitandrunvent: ['blink', {"cd": 1.9, "range": 132, "n": 4, "col": "#f09050"}],
  Farvent: ['kite', {"keep": 257, "cd": 2.4, "n": 2, "spread": 0.35, "spd": 310, "pierce": 0, "col": "#f09050"}],
  Ventturret: ['turret', {"cd": 2.5, "n": 1, "spread": 1.9, "spd": 258, "rot": 0, "col": "#f09050"}],
  Ventskitter: ['blink', {"cd": 2.4, "range": 161, "n": 2, "col": "#f09050"}],
  Slaggedimp: ['wander', {"freq": 5.2, "amp": 2.3, "mul": 1.12}],
  Slaggedcrawler: ['hop', {"cd": 1.7, "dur": 0.55, "mul": 3.3, "land": 4, "col": "#f09050"}],
  Slaggedvent: ['charge', {"cd": 2.6, "dur": 0.61, "mul": 3.8}],
  Slaggedsprite: ['orbit', {"range": 194, "spin": 1.1, "cd": 1.5, "n": 1, "spread": 0.4, "spd": 223, "col": "#f09050"}],
  Slaggedgolem: ['turret', {"cd": 1.7, "n": 7, "spread": 2.1, "spd": 239, "rot": 0, "col": "#f09050"}],
  Slaggedlurker: ['kite', {"keep": 263, "cd": 2.2, "n": 2, "spread": 0.35, "spd": 324, "pierce": 0, "col": "#f09050"}],
  Slaggedhurler: ['slam', {"r": 122, "cd": 2.6, "ring": 4, "mul": 0.63, "col": "#f09050"}],
  Slaggedwisp: ['blink', {"cd": 1.7, "range": 161, "n": 4, "col": "#f09050"}],
  Cinderedimp: ['summon', {"max": 3, "cd": 3.0, "spawn": "cinderswarm"}],
  Cinderedcrawler: ['mine', {"cd": 1.4, "fuse": 1.4, "r": 56, "mul": 0.71}],
  Cinderedvent: ['aura', {"r": 128, "cd": 1.9, "n": 3, "col": "#f09050", "slam": 0, "mul": 0.6}],
  Cinderedsprite: ['phase', {"freq": 1.3, "mul": 1.7, "n": 3, "col": "#f09050"}],
  Cinderedgolem: ['wander', {"freq": 10.4, "amp": 1.8, "mul": 1.23}],
  Cinderedlurker: ['hop', {"cd": 0.9, "dur": 0.52, "mul": 3.6, "land": 1, "col": "#f09050"}]
};

for (const k in C17SPECS) {
  const [a, c] = C17SPECS[k];
  ENEMY_BEHAVIOR_HANDLERS['c17' + k] = function(game, e, dt){ FWF_ARCH[a](game, e, dt, c); };
}
