'use strict';

const K6DSPECS = {
  Gearhound: ['hop', {"cd": 1.8, "dur": 0.32, "mul": 3.6, "land": 4, "col": "#cd72e5"}],
  Cogmoth: ['turret', {"cd": 1.0, "n": 1, "spread": 1.1, "spd": 214, "rot": 0, "col": "#cd72e5"}],
  Sparkcog: ['turret', {"cd": 1.2, "n": 2, "spread": 0.5, "spd": 223, "rot": 0, "col": "#cd72e5"}],
  Brassplate: ['blink', {"cd": 2.5, "range": 119, "n": 2, "col": "#cd72e5"}],
  Ringrammer: ['phase', {"freq": 1.8, "mul": 1.5, "n": 2, "col": "#cd72e5"}],
  Meridianturret: ['mine', {"cd": 2.0, "fuse": 1.8, "r": 69, "mul": 0.65}],
  Cogspring: ['blink', {"cd": 2.7, "range": 153, "n": 3, "col": "#cd72e5"}],
  Gearslinger: ['charge', {"cd": 2.5, "dur": 0.61, "mul": 4.1}],
  Gyromortar: ['blink', {"cd": 1.7, "range": 135, "n": 4, "col": "#cd72e5"}],
  Ringweaver: ['hop', {"cd": 1.5, "dur": 0.54, "mul": 3.8, "land": 2, "col": "#cd72e5"}],
  Clockwatcher: ['slam', {"r": 120, "cd": 2.5, "ring": 6, "mul": 0.49, "col": "#cd72e5"}],
  Epicycler: ['blink', {"cd": 1.8, "range": 105, "n": 3, "col": "#cd72e5"}],
  Gearworm: ['hop', {"cd": 1.3, "dur": 0.33, "mul": 3.8, "land": 4, "col": "#cd72e5"}],
  Cogmites: ['hop', {"cd": 1.3, "dur": 0.34, "mul": 3.6, "land": 4, "col": "#cd72e5"}],
  Geartwin: ['phase', {"freq": 1.5, "mul": 1.6, "n": 3, "col": "#cd72e5"}],
  Meridiancaller: ['turret', {"cd": 1.5, "n": 7, "spread": 0.5, "spd": 205, "rot": 1.0, "col": "#cd72e5"}],
  Gearmender: ['phase', {"freq": 2.0, "mul": 1.8, "n": 2, "col": "#cd72e5"}],
  Ringwarden: ['hop', {"cd": 1.4, "dur": 0.43, "mul": 3.3, "land": 4, "col": "#cd72e5"}],
  Meridianmarksman: ['hop', {"cd": 1.3, "dur": 0.49, "mul": 3.8, "land": 4, "col": "#cd72e5"}],
  Gearblink: ['wander', {"freq": 8.8, "amp": 1.9, "mul": 1.29}],
  Shadowcog: ['kite', {"keep": 228, "cd": 1.8, "n": 1, "spread": 0.35, "spd": 252, "pierce": 1, "col": "#cd72e5"}],
  Ironhound: ['charge', {"cd": 2.4, "dur": 0.53, "mul": 4.2}],
  Sparkrunner: ['mine', {"cd": 1.9, "fuse": 2.1, "r": 71, "mul": 0.76}],
  Cogslinger: ['summon', {"max": 2, "cd": 4.3, "spawn": "gearhound"}],
  Fusegear: ['kite', {"keep": 262, "cd": 2.2, "n": 2, "spread": 0.35, "spd": 265, "pierce": 1, "col": "#cd72e5"}],
  Ringmoth: ['orbit', {"range": 163, "spin": 1.3, "cd": 1.1, "n": 1, "spread": 0.4, "spd": 243, "col": "#cd72e5"}],
  Bronzeram: ['hop', {"cd": 1.2, "dur": 0.37, "mul": 3.6, "land": 3, "col": "#cd72e5"}],
  Orbitmortar: ['blink', {"cd": 2.1, "range": 134, "n": 3, "col": "#cd72e5"}],
  Cogtunneler: ['phase', {"freq": 1.3, "mul": 1.7, "n": 3, "col": "#cd72e5"}],
  Ringsatellite: ['wander', {"freq": 6.4, "amp": 1.5, "mul": 1.19}],
  Gearsentinel: ['summon', {"max": 2, "cd": 3.6, "spawn": "gearhound"}],
  Cogblink: ['charge', {"cd": 1.5, "dur": 0.56, "mul": 3.9}],
  Bronzebulwark: ['wander', {"freq": 8.1, "amp": 1.5, "mul": 1.01}],
  Grim6dcrawler: ['wander', {"freq": 8.7, "amp": 1.7, "mul": 1.13}],
  Grim6dwarden: ['hop', {"cd": 1.8, "dur": 0.36, "mul": 3.5, "land": 1, "col": "#cd72e5"}],
  Grim6dlurker: ['charge', {"cd": 1.6, "dur": 0.68, "mul": 3.8}],
  Grim6dhurler: ['orbit', {"range": 193, "spin": -1.7, "cd": 1.0, "n": 3, "spread": 0.4, "spd": 223, "col": "#cd72e5"}],
  Grim6dbrute: ['turret', {"cd": 1.7, "n": 6, "spread": 1.5, "spd": 195, "rot": 0, "col": "#cd72e5"}],
  Grim6dwisp: ['kite', {"keep": 268, "cd": 1.7, "n": 2, "spread": 0.35, "spd": 307, "pierce": 1, "col": "#cd72e5"}],
  Grim6dstalker: ['slam', {"r": 91, "cd": 2.4, "ring": 2, "mul": 0.45, "col": "#cd72e5"}],
  Grim6dsentry: ['blink', {"cd": 1.9, "range": 164, "n": 4, "col": "#cd72e5"}],
  Fell6dcrawler: ['summon', {"max": 3, "cd": 4.8, "spawn": "gearhound"}],
  Fell6dwarden: ['mine', {"cd": 1.3, "fuse": 1.8, "r": 64, "mul": 0.63}]
};

for (const k in K6DSPECS) {
  const [a, c] = K6DSPECS[k];
  ENEMY_BEHAVIOR_HANDLERS['k6d' + k] = function(game, e, dt){ FWF_ARCH[a](game, e, dt, c); };
}
