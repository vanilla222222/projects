'use strict';

const T12ASPECS = {
  Grimcrawler12a: ['wander', {"freq": 5.8, "amp": 1.6, "mul": 1.07}],
  Grimwarden12a: ['hop', {"cd": 1.1, "dur": 0.44, "mul": 3.6, "land": 1, "col": "#9072e5"}],
  Grimlurker12a: ['charge', {"cd": 1.5, "dur": 0.78, "mul": 3.7}],
  Grimhurler12a: ['orbit', {"range": 121, "spin": 1.1, "cd": 0.9, "n": 2, "spread": 0.4, "spd": 267, "col": "#9072e5"}],
  Grimbrute12a: ['turret', {"cd": 1.1, "n": 6, "spread": 2.0, "spd": 252, "rot": 0, "col": "#9072e5"}],
  Grimwisp12a: ['kite', {"keep": 244, "cd": 2.5, "n": 2, "spread": 0.35, "spd": 320, "pierce": 0, "col": "#9072e5"}],
  Grimstalker12a: ['slam', {"r": 119, "cd": 2.4, "ring": 1, "mul": 0.57, "col": "#9072e5"}],
  Grimsentry12a: ['blink', {"cd": 2.6, "range": 148, "n": 4, "col": "#9072e5"}],
  Fellcrawler12a: ['summon', {"max": 3, "cd": 4.3, "spawn": "dithercloud"}],
  Fellwarden12a: ['mine', {"cd": 1.3, "fuse": 2.0, "r": 68, "mul": 0.87}],
  Felllurker12a: ['aura', {"r": 150, "cd": 2.0, "n": 4, "col": "#9072e5", "slam": 0, "mul": 0.6}],
  Fellhurler12a: ['phase', {"freq": 1.4, "mul": 1.6, "n": 2, "col": "#9072e5"}]
};

for (const k in T12ASPECS) {
  const [a, c] = T12ASPECS[k];
  ENEMY_BEHAVIOR_HANDLERS['t12a' + k] = function(game, e, dt){ FWF_ARCH[a](game, e, dt, c); };
}
