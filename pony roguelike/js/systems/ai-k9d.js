'use strict';

const K9DSPECS = {
  Starvedhound: ['kite', {"keep": 234, "cd": 2.2, "n": 3, "spread": 0.35, "spd": 334, "pierce": 1, "col": "#89e572"}],
  Dyingember: ['aura', {"r": 133, "cd": 2.3, "n": 4, "col": "#89e572", "slam": 0, "mul": 0.6}],
  Fadingnova: ['blink', {"cd": 2.1, "range": 165, "n": 3, "col": "#89e572"}],
  Darkplate: ['summon', {"max": 3, "cd": 4.9, "spawn": "starvedhound"}],
  Nullram: ['summon', {"max": 3, "cd": 4.2, "spawn": "starvedhound"}],
  Lastlightturret: ['summon', {"max": 3, "cd": 4.5, "spawn": "starvedhound"}],
  Voidleaper: ['slam', {"r": 105, "cd": 2.7, "ring": 0, "mul": 0.53, "col": "#89e572"}],
  Witherslinger: ['phase', {"freq": 1.9, "mul": 1.4, "n": 3, "col": "#89e572"}],
  Nullmortar: ['wander', {"freq": 10.0, "amp": 1.8, "mul": 1.14}],
  Fainttrail: ['kite', {"keep": 246, "cd": 2.0, "n": 2, "spread": 0.35, "spd": 280, "pierce": 0, "col": "#89e572"}],
  Darkwatcher: ['wander', {"freq": 5.9, "amp": 1.7, "mul": 1.17}],
  Dyingsatellite: ['turret', {"cd": 2.4, "n": 1, "spread": 1.1, "spd": 224, "rot": 0, "col": "#89e572"}],
  Nulltunneler: ['orbit', {"range": 133, "spin": 2.3, "cd": 1.0, "n": 1, "spread": 0.4, "spd": 233, "col": "#89e572"}],
  Embermites: ['wander', {"freq": 10.2, "amp": 1.2, "mul": 1.13}],
  Fadinghusk: ['orbit', {"range": 168, "spin": -2.0, "cd": 1.3, "n": 3, "spread": 0.4, "spd": 274, "col": "#89e572"}],
  Nullcaller: ['blink', {"cd": 2.7, "range": 165, "n": 2, "col": "#89e572"}],
  Emberkeeper: ['orbit', {"range": 111, "spin": 1.6, "cd": 1.2, "n": 3, "spread": 0.4, "spd": 273, "col": "#89e572"}],
  Darkwarden: ['turret', {"cd": 2.1, "n": 4, "spread": 2.0, "spd": 198, "rot": 0, "col": "#89e572"}],
  Nightmarksman: ['mine', {"cd": 1.0, "fuse": 1.2, "r": 70, "mul": 0.87}],
  Nullblink: ['orbit', {"range": 188, "spin": -1.1, "cd": 1.5, "n": 1, "spread": 0.4, "spd": 267, "col": "#89e572"}],
  Hollowstalker: ['blink', {"cd": 2.5, "range": 138, "n": 3, "col": "#89e572"}],
  Nullhound: ['aura', {"r": 133, "cd": 2.5, "n": 5, "col": "#89e572", "slam": 0, "mul": 0.6}],
  Faintrunner: ['slam', {"r": 122, "cd": 2.2, "ring": 5, "mul": 0.49, "col": "#89e572"}],
  Darkslinger: ['charge', {"cd": 2.5, "dur": 0.51, "mul": 3.9}],
  Nullspark: ['mine', {"cd": 2.0, "fuse": 1.6, "r": 67, "mul": 0.83}],
  Witherwisp: ['slam', {"r": 123, "cd": 2.4, "ring": 2, "mul": 0.54, "col": "#89e572"}],
  Darkram: ['wander', {"freq": 5.9, "amp": 1.3, "mul": 1.09}],
  Faintmortar: ['slam', {"r": 95, "cd": 2.5, "ring": 2, "mul": 0.58, "col": "#89e572"}],
  Darktunneler: ['slam', {"r": 100, "cd": 2.4, "ring": 5, "mul": 0.56, "col": "#89e572"}],
  Nullsatellite: ['orbit', {"range": 129, "spin": 1.5, "cd": 1.5, "n": 3, "spread": 0.4, "spd": 248, "col": "#89e572"}],
  Fadingsentinel: ['wander', {"freq": 3.4, "amp": 2.4, "mul": 1.0}],
  Darkblink: ['summon', {"max": 3, "cd": 4.6, "spawn": "starvedhound"}],
  Nullbulwark: ['slam', {"r": 112, "cd": 2.5, "ring": 4, "mul": 0.49, "col": "#89e572"}],
  Grim9dcrawler: ['wander', {"freq": 7.7, "amp": 2.2, "mul": 1.2}],
  Grim9dwarden: ['hop', {"cd": 1.8, "dur": 0.44, "mul": 3.9, "land": 3, "col": "#89e572"}],
  Grim9dlurker: ['charge', {"cd": 2.3, "dur": 0.66, "mul": 3.5}],
  Grim9dhurler: ['orbit', {"range": 189, "spin": 2.2, "cd": 1.4, "n": 1, "spread": 0.4, "spd": 262, "col": "#89e572"}],
  Grim9dbrute: ['turret', {"cd": 1.6, "n": 1, "spread": 2.0, "spd": 219, "rot": 1.5, "col": "#89e572"}],
  Grim9dwisp: ['kite', {"keep": 238, "cd": 2.0, "n": 1, "spread": 0.35, "spd": 295, "pierce": 0, "col": "#89e572"}],
  Grim9dstalker: ['slam', {"r": 115, "cd": 2.6, "ring": 8, "mul": 0.61, "col": "#89e572"}],
  Grim9dsentry: ['blink', {"cd": 1.7, "range": 144, "n": 3, "col": "#89e572"}],
  Fell9dcrawler: ['summon', {"max": 2, "cd": 4.4, "spawn": "starvedhound"}],
  Fell9dwarden: ['mine', {"cd": 1.5, "fuse": 1.9, "r": 59, "mul": 0.84}]
};

for (const k in K9DSPECS) {
  const [a, c] = K9DSPECS[k];
  ENEMY_BEHAVIOR_HANDLERS['k9d' + k] = function(game, e, dt){ FWF_ARCH[a](game, e, dt, c); };
}
