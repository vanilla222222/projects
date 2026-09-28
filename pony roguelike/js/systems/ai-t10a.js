'use strict';

const T10ASPECS = {
  Grimcrawler10a: ['wander', {"freq": 9.6, "amp": 1.8, "mul": 1.22}],
  Grimwarden10a: ['hop', {"cd": 1.2, "dur": 0.37, "mul": 3.6, "land": 5, "col": "#9ee572"}],
  Grimlurker10a: ['charge', {"cd": 2.6, "dur": 0.69, "mul": 3.7}],
  Grimhurler10a: ['orbit', {"range": 104, "spin": 1.0, "cd": 1.3, "n": 1, "spread": 0.4, "spd": 232, "col": "#9ee572"}],
  Grimbrute10a: ['turret', {"cd": 1.5, "n": 8, "spread": 0.8, "spd": 190, "rot": 0, "col": "#9ee572"}]
};

for (const k in T10ASPECS) {
  const [a, c] = T10ASPECS[k];
  ENEMY_BEHAVIOR_HANDLERS['t10a' + k] = function(game, e, dt){ FWF_ARCH[a](game, e, dt, c); };
}
