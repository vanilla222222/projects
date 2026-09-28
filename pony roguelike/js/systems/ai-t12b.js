'use strict';

const T12BSPECS = {
  Grimcrawler12b: ['wander', {"freq": 5.3, "amp": 2.5, "mul": 1.29}],
  Grimwarden12b: ['hop', {"cd": 1.7, "dur": 0.38, "mul": 3.0, "land": 3, "col": "#dc72e5"}],
  Grimlurker12b: ['charge', {"cd": 2.5, "dur": 0.62, "mul": 3.5}],
  Grimhurler12b: ['orbit', {"range": 105, "spin": 1.9, "cd": 1.1, "n": 3, "spread": 0.4, "spd": 265, "col": "#dc72e5"}],
  Grimbrute12b: ['turret', {"cd": 1.7, "n": 3, "spread": 0.8, "spd": 228, "rot": 0, "col": "#dc72e5"}],
  Grimwisp12b: ['kite', {"keep": 298, "cd": 2.4, "n": 3, "spread": 0.35, "spd": 301, "pierce": 0, "col": "#dc72e5"}],
  Grimstalker12b: ['slam', {"r": 118, "cd": 3.1, "ring": 6, "mul": 0.46, "col": "#dc72e5"}],
  Grimsentry12b: ['blink', {"cd": 2.2, "range": 159, "n": 3, "col": "#dc72e5"}],
  Fellcrawler12b: ['summon', {"max": 3, "cd": 4.6, "spawn": "dithercloud"}],
  Fellwarden12b: ['mine', {"cd": 1.3, "fuse": 1.6, "r": 73, "mul": 0.82}],
  Felllurker12b: ['aura', {"r": 136, "cd": 2.5, "n": 5, "col": "#dc72e5", "slam": 0, "mul": 0.6}],
  Fellhurler12b: ['phase', {"freq": 1.9, "mul": 1.6, "n": 3, "col": "#dc72e5"}],
  Fellbrute12b: ['wander', {"freq": 9.9, "amp": 2.2, "mul": 1.05}],
  Fellwisp12b: ['hop', {"cd": 1.4, "dur": 0.47, "mul": 3.7, "land": 5, "col": "#dc72e5"}],
  Fellstalker12b: ['charge', {"cd": 2.0, "dur": 0.75, "mul": 3.8}],
  Fellsentry12b: ['orbit', {"range": 126, "spin": 2.0, "cd": 1.8, "n": 1, "spread": 0.4, "spd": 256, "col": "#dc72e5"}],
  Wretchedcrawler12b: ['turret', {"cd": 2.2, "n": 5, "spread": 0.8, "spd": 232, "rot": 0, "col": "#dc72e5"}]
};

for (const k in T12BSPECS) {
  const [a, c] = T12BSPECS[k];
  ENEMY_BEHAVIOR_HANDLERS['t12b' + k] = function(game, e, dt){ FWF_ARCH[a](game, e, dt, c); };
}
