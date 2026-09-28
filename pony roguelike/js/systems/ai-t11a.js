'use strict';

const T11ASPECS = {
  Grimcrawler11a: ['wander', {"freq": 6.7, "amp": 1.4, "mul": 1.14}],
  Grimwarden11a: ['hop', {"cd": 1.5, "dur": 0.4, "mul": 3.3, "land": 1, "col": "#72e5de"}],
  Grimlurker11a: ['charge', {"cd": 1.6, "dur": 0.7, "mul": 3.5}],
  Grimhurler11a: ['orbit', {"range": 117, "spin": 2.5, "cd": 1.8, "n": 2, "spread": 0.4, "spd": 224, "col": "#72e5de"}],
  Grimbrute11a: ['turret', {"cd": 2.6, "n": 1, "spread": 2.2, "spd": 199, "rot": 1.3, "col": "#72e5de"}],
  Grimwisp11a: ['kite', {"keep": 247, "cd": 2.4, "n": 1, "spread": 0.35, "spd": 339, "pierce": 1, "col": "#72e5de"}],
  Grimstalker11a: ['slam', {"r": 92, "cd": 2.7, "ring": 8, "mul": 0.54, "col": "#72e5de"}],
  Grimsentry11a: ['blink', {"cd": 2.2, "range": 142, "n": 3, "col": "#72e5de"}],
  Fellcrawler11a: ['summon', {"max": 3, "cd": 3.5, "spawn": "dithercloud"}],
  Fellwarden11a: ['mine', {"cd": 1.6, "fuse": 2.2, "r": 62, "mul": 0.61}],
  Felllurker11a: ['aura', {"r": 126, "cd": 2.4, "n": 5, "col": "#72e5de", "slam": 0, "mul": 0.6}],
  Fellhurler11a: ['phase', {"freq": 1.9, "mul": 1.4, "n": 3, "col": "#72e5de"}],
  Fellbrute11a: ['wander', {"freq": 7.5, "amp": 1.6, "mul": 1.19}],
  Fellwisp11a: ['hop', {"cd": 1.7, "dur": 0.42, "mul": 3.2, "land": 0, "col": "#72e5de"}],
  Fellstalker11a: ['charge', {"cd": 2.4, "dur": 0.75, "mul": 3.7}],
  Fellsentry11a: ['orbit', {"range": 199, "spin": -2.0, "cd": 1.4, "n": 2, "spread": 0.4, "spd": 258, "col": "#72e5de"}]
};

for (const k in T11ASPECS) {
  const [a, c] = T11ASPECS[k];
  ENEMY_BEHAVIOR_HANDLERS['t11a' + k] = function(game, e, dt){ FWF_ARCH[a](game, e, dt, c); };
}
