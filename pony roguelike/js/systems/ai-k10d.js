'use strict';

const K10DSPECS = {
  Collapsehound: ['charge', {"cd": 2.4, "dur": 0.43, "mul": 4.1}],
  Lastlightmoth: ['turret', {"cd": 1.7, "n": 3, "spread": 0.3, "spd": 205, "rot": 1.3, "col": "#dae572"}],
  Eventspark: ['turret', {"cd": 1.8, "n": 2, "spread": 0.7, "spd": 213, "rot": 0.9, "col": "#dae572"}],
  Horizonplate: ['hop', {"cd": 1.1, "dur": 0.35, "mul": 3.4, "land": 0, "col": "#dae572"}],
  Gravram: ['charge', {"cd": 1.7, "dur": 0.75, "mul": 4.2}],
  Collapseturret: ['turret', {"cd": 2.1, "n": 8, "spread": 0.6, "spd": 256, "rot": 0, "col": "#dae572"}],
  Abyssleaper: ['slam', {"r": 106, "cd": 3.0, "ring": 4, "mul": 0.58, "col": "#dae572"}],
  Eventslinger: ['kite', {"keep": 285, "cd": 1.6, "n": 3, "spread": 0.35, "spd": 319, "pierce": 0, "col": "#dae572"}],
  Gravmortar: ['mine', {"cd": 1.7, "fuse": 1.9, "r": 59, "mul": 0.72}],
  Silenttrail: ['wander', {"freq": 4.9, "amp": 1.1, "mul": 1.19}],
  Horizonwatcher: ['blink', {"cd": 2.2, "range": 157, "n": 2, "col": "#dae572"}],
  Collapsesatellite: ['orbit', {"range": 169, "spin": -2.2, "cd": 1.8, "n": 3, "spread": 0.4, "spd": 260, "col": "#dae572"}],
  Eventtunneler: ['blink', {"cd": 2.5, "range": 140, "n": 2, "col": "#dae572"}],
  Collapsemites: ['wander', {"freq": 3.1, "amp": 2.0, "mul": 1.18}],
  Horizonhusk: ['charge', {"cd": 2.7, "dur": 0.42, "mul": 4.1}],
  Eventcaller: ['summon', {"max": 2, "cd": 4.2, "spawn": "collapsemites"}],
  Lastkeeper: ['aura', {"r": 143, "cd": 2.0, "n": 4, "col": "#dae572", "slam": 0, "mul": 0.6}],
  Horizonwarden: ['aura', {"r": 153, "cd": 2.3, "n": 3, "col": "#dae572", "slam": 0, "mul": 0.6}],
  Gravmarksman: ['kite', {"keep": 250, "cd": 2.1, "n": 1, "spread": 0.35, "spd": 278, "pierce": 0, "col": "#dae572"}],
  Eventblink: ['blink', {"cd": 1.6, "range": 120, "n": 4, "col": "#dae572"}],
  Silentstalker: ['phase', {"freq": 1.3, "mul": 1.5, "n": 2, "col": "#dae572"}],
  Gravhound: ['charge', {"cd": 2.2, "dur": 0.41, "mul": 3.6}],
  Collapserunner: ['charge', {"cd": 2.6, "dur": 0.77, "mul": 3.5}],
  Abyssslinger: ['kite', {"keep": 290, "cd": 1.6, "n": 3, "spread": 0.35, "spd": 291, "pierce": 0, "col": "#dae572"}],
  Horizonspark: ['kite', {"keep": 274, "cd": 1.4, "n": 3, "spread": 0.35, "spd": 297, "pierce": 0, "col": "#dae572"}],
  Eventmoth: ['hop', {"cd": 0.9, "dur": 0.36, "mul": 3.6, "land": 0, "col": "#dae572"}],
  Horizonram: ['charge', {"cd": 2.4, "dur": 0.47, "mul": 4.1}],
  Abyssmortar: ['mine', {"cd": 1.4, "fuse": 1.8, "r": 66, "mul": 0.66}],
  Gravtunneler: ['blink', {"cd": 1.8, "range": 149, "n": 3, "col": "#dae572"}],
  Eventsatellite: ['orbit', {"range": 140, "spin": 1.2, "cd": 1.3, "n": 1, "spread": 0.4, "spd": 247, "col": "#dae572"}],
  Collapsesentinel: ['hop', {"cd": 1.2, "dur": 0.47, "mul": 3.7, "land": 3, "col": "#dae572"}],
  Horizonblink: ['blink', {"cd": 2.1, "range": 161, "n": 4, "col": "#dae572"}],
  Eventbulwark: ['blink', {"cd": 2.7, "range": 107, "n": 4, "col": "#dae572"}],
  Vagrantbrute: ['wander', {"freq": 5.5, "amp": 1.2, "mul": 1.25}],
  Vagrantwisp: ['hop', {"cd": 1.5, "dur": 0.35, "mul": 3.9, "land": 3, "col": "#dae572"}],
  Vagrantstalker: ['charge', {"cd": 2.5, "dur": 0.59, "mul": 4.2}],
  Vagrantsentry: ['orbit', {"range": 105, "spin": 2.0, "cd": 1.2, "n": 2, "spread": 0.4, "spd": 251, "col": "#dae572"}],
  Starkcrawler: ['turret', {"cd": 1.2, "n": 3, "spread": 2.8, "spd": 231, "rot": 1.2, "col": "#dae572"}],
  Starkwarden: ['kite', {"keep": 290, "cd": 1.5, "n": 3, "spread": 0.35, "spd": 286, "pierce": 1, "col": "#dae572"}],
  Starklurker: ['slam', {"r": 88, "cd": 3.0, "ring": 6, "mul": 0.55, "col": "#dae572"}],
  Starkhurler: ['blink', {"cd": 2.5, "range": 128, "n": 3, "col": "#dae572"}],
  Starkbrute: ['summon', {"max": 2, "cd": 4.4, "spawn": "collapsemites"}],
  Starkwisp: ['mine', {"cd": 1.5, "fuse": 1.2, "r": 74, "mul": 0.78}]
};

for (const k in K10DSPECS) {
  const [a, c] = K10DSPECS[k];
  ENEMY_BEHAVIOR_HANDLERS['k10d' + k] = function(game, e, dt){ FWF_ARCH[a](game, e, dt, c); };
}
