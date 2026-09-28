'use strict';

const T11BSPECS = {
  Grimcrawler11b: ['wander', {"freq": 9.9, "amp": 1.6, "mul": 1.19}],
  Grimwarden11b: ['hop', {"cd": 0.9, "dur": 0.42, "mul": 3.4, "land": 0, "col": "#72a0e5"}],
  Grimlurker11b: ['charge', {"cd": 2.2, "dur": 0.42, "mul": 4.3}],
  Grimhurler11b: ['orbit', {"range": 131, "spin": 2.0, "cd": 1.9, "n": 2, "spread": 0.4, "spd": 253, "col": "#72a0e5"}],
  Grimbrute11b: ['turret', {"cd": 1.4, "n": 4, "spread": 2.6, "spd": 211, "rot": 0, "col": "#72a0e5"}],
  Grimwisp11b: ['kite', {"keep": 277, "cd": 2.2, "n": 3, "spread": 0.35, "spd": 285, "pierce": 1, "col": "#72a0e5"}],
  Grimstalker11b: ['slam', {"r": 105, "cd": 2.8, "ring": 0, "mul": 0.56, "col": "#72a0e5"}],
  Grimsentry11b: ['blink', {"cd": 2.7, "range": 143, "n": 2, "col": "#72a0e5"}],
  Fellcrawler11b: ['summon', {"max": 3, "cd": 3.6, "spawn": "dithercloud"}],
  Fellwarden11b: ['mine', {"cd": 1.3, "fuse": 1.5, "r": 72, "mul": 0.87}],
  Felllurker11b: ['aura', {"r": 122, "cd": 2.4, "n": 3, "col": "#72a0e5", "slam": 0, "mul": 0.6}],
  Fellhurler11b: ['phase', {"freq": 1.7, "mul": 1.6, "n": 3, "col": "#72a0e5"}],
  Fellbrute11b: ['wander', {"freq": 4.5, "amp": 2.2, "mul": 1.02}]
};

for (const k in T11BSPECS) {
  const [a, c] = T11BSPECS[k];
  ENEMY_BEHAVIOR_HANDLERS['t11b' + k] = function(game, e, dt){ FWF_ARCH[a](game, e, dt, c); };
}
