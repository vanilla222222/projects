'use strict';

const T14CSPECS = {
  Grimcrawler14c: ['wander', {"freq": 5.9, "amp": 2.4, "mul": 1.18}],
  Grimwarden14c: ['hop', {"cd": 1.3, "dur": 0.54, "mul": 3.5, "land": 2, "col": "#e59572"}],
  Grimlurker14c: ['charge', {"cd": 2.1, "dur": 0.72, "mul": 4.5}],
  Grimhurler14c: ['orbit', {"range": 187, "spin": 1.5, "cd": 1.2, "n": 1, "spread": 0.4, "spd": 247, "col": "#e59572"}],
  Grimbrute14c: ['turret', {"cd": 1.1, "n": 8, "spread": 2.7, "spd": 221, "rot": 0, "col": "#e59572"}],
  Grimwisp14c: ['kite', {"keep": 268, "cd": 1.6, "n": 1, "spread": 0.35, "spd": 279, "pierce": 1, "col": "#e59572"}],
  Grimstalker14c: ['slam', {"r": 117, "cd": 2.5, "ring": 0, "mul": 0.58, "col": "#e59572"}],
  Grimsentry14c: ['blink', {"cd": 1.8, "range": 118, "n": 4, "col": "#e59572"}],
  Fellcrawler14c: ['summon', {"max": 3, "cd": 4.0, "spawn": "dithercloud"}],
  Fellwarden14c: ['mine', {"cd": 1.3, "fuse": 1.3, "r": 67, "mul": 0.87}],
  Felllurker14c: ['aura', {"r": 149, "cd": 2.2, "n": 4, "col": "#e59572", "slam": 0, "mul": 0.6}],
  Fellhurler14c: ['phase', {"freq": 1.8, "mul": 1.5, "n": 3, "col": "#e59572"}],
  Fellbrute14c: ['wander', {"freq": 3.9, "amp": 1.3, "mul": 1.21}],
  Fellwisp14c: ['hop', {"cd": 1.1, "dur": 0.52, "mul": 3.4, "land": 1, "col": "#e59572"}],
  Fellstalker14c: ['charge', {"cd": 2.3, "dur": 0.46, "mul": 3.9}],
  Fellsentry14c: ['orbit', {"range": 162, "spin": 1.8, "cd": 1.3, "n": 3, "spread": 0.4, "spd": 276, "col": "#e59572"}]
};

for (const k in T14CSPECS) {
  const [a, c] = T14CSPECS[k];
  ENEMY_BEHAVIOR_HANDLERS['t14c' + k] = function(game, e, dt){ FWF_ARCH[a](game, e, dt, c); };
}
