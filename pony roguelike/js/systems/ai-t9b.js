'use strict';

const T9BSPECS = {
  Grimcrawler9b: ['wander', {"freq": 9.3, "amp": 2.1, "mul": 1.09}],
  Grimwarden9b: ['hop', {"cd": 1.0, "dur": 0.44, "mul": 3.6, "land": 4, "col": "#e5e072"}],
  Grimlurker9b: ['charge', {"cd": 1.6, "dur": 0.42, "mul": 3.9}],
  Grimhurler9b: ['orbit', {"range": 138, "spin": 1.8, "cd": 1.6, "n": 1, "spread": 0.4, "spd": 278, "col": "#e5e072"}],
  Grimbrute9b: ['turret', {"cd": 1.1, "n": 5, "spread": 0.4, "spd": 200, "rot": 0.8, "col": "#e5e072"}]
};

for (const k in T9BSPECS) {
  const [a, c] = T9BSPECS[k];
  ENEMY_BEHAVIOR_HANDLERS['t9b' + k] = function(game, e, dt){ FWF_ARCH[a](game, e, dt, c); };
}
