'use strict';

const K11CSPECS = {
  Rootwraith: ['charge', {"cd": 1.5, "dur": 0.69, "mul": 4.5}],
  Saltheron: ['blink', {"cd": 2.6, "range": 113, "n": 4, "col": "#e59c72"}],
  Tidebloat: ['hop', {"cd": 1.4, "dur": 0.46, "mul": 3.2, "land": 0, "col": "#e59c72"}],
  Brineplate: ['slam', {"r": 109, "cd": 2.4, "ring": 5, "mul": 0.6, "col": "#e59c72"}],
  Mudtuskram: ['charge', {"cd": 1.6, "dur": 0.48, "mul": 4.1}],
  Barnaclespike: ['turret', {"cd": 1.7, "n": 3, "spread": 0.5, "spd": 193, "rot": 0, "col": "#e59c72"}],
  Mudskipper: ['summon', {"max": 2, "cd": 3.4, "spawn": "silthopper"}],
  Eelspitter: ['kite', {"keep": 286, "cd": 2.5, "n": 3, "spread": 0.35, "spd": 319, "pierce": 0, "col": "#e59c72"}],
  Crabmortar: ['mine', {"cd": 1.7, "fuse": 1.8, "r": 74, "mul": 0.71}],
  Mangroveviper: ['wander', {"freq": 3.1, "amp": 1.9, "mul": 1.05}],
  Tidewatcher: ['mine', {"cd": 1.1, "fuse": 1.5, "r": 58, "mul": 0.69}],
  Siltswirl: ['orbit', {"range": 132, "spin": 2.1, "cd": 1.2, "n": 2, "spread": 0.4, "spd": 258, "col": "#e59c72"}],
  Fiddlerborer: ['blink', {"cd": 2.3, "range": 106, "n": 2, "col": "#e59c72"}],
  Silthopper: ['wander', {"freq": 9.5, "amp": 1.9, "mul": 1.17}],
  Brinesack: ['orbit', {"range": 142, "spin": -1.4, "cd": 1.5, "n": 3, "spread": 0.4, "spd": 232, "col": "#e59c72"}],
  Hivewader: ['summon', {"max": 3, "cd": 3.8, "spawn": "silthopper"}],
  Mangrovemender: ['aura', {"r": 143, "cd": 2.0, "n": 4, "col": "#e59c72", "slam": 0, "mul": 0.6}],
  Tidewarden: ['aura', {"r": 116, "cd": 2.4, "n": 5, "col": "#e59c72", "slam": 0, "mul": 0.6}],
  Heronmarksman: ['kite', {"keep": 207, "cd": 2.0, "n": 3, "spread": 0.35, "spd": 309, "pierce": 0, "col": "#e59c72"}],
  Brackblink: ['blink', {"cd": 1.9, "range": 121, "n": 4, "col": "#e59c72"}],
  Crocshade: ['phase', {"freq": 1.5, "mul": 1.8, "n": 3, "col": "#e59c72"}],
  Mireloper: ['charge', {"cd": 2.5, "dur": 0.59, "mul": 4.3}],
  Tidedasher: ['charge', {"cd": 2.4, "dur": 0.71, "mul": 3.8}],
  Saltspitter: ['kite', {"keep": 275, "cd": 2.0, "n": 1, "spread": 0.35, "spd": 279, "pierce": 1, "col": "#e59c72"}],
  Bloatbladder: ['mine', {"cd": 1.9, "fuse": 1.5, "r": 67, "mul": 0.72}],
  Mangrovebat: ['aura', {"r": 138, "cd": 2.3, "n": 5, "col": "#e59c72", "slam": 0, "mul": 0.6}],
  Siltboar: ['charge', {"cd": 1.9, "dur": 0.61, "mul": 4.3}],
  Mudmortar: ['mine', {"cd": 1.4, "fuse": 2.1, "r": 74, "mul": 0.75}],
  Mudlobster: ['blink', {"cd": 2.0, "range": 153, "n": 3, "col": "#e59c72"}],
  Duskcircler: ['orbit', {"range": 174, "spin": 2.3, "cd": 1.7, "n": 2, "spread": 0.4, "spd": 221, "col": "#e59c72"}],
  Rootsentinel: ['orbit', {"range": 196, "spin": -2.0, "cd": 1.0, "n": 3, "spread": 0.4, "spd": 263, "col": "#e59c72"}],
  Brackmist: ['blink', {"cd": 2.4, "range": 164, "n": 3, "col": "#e59c72"}],
  Shellbulk: ['mine', {"cd": 1.9, "fuse": 1.3, "r": 67, "mul": 0.75}],
  Wretchedcrawler: ['wander', {"freq": 10.6, "amp": 2.4, "mul": 1.05}],
  Wretchedwarden: ['hop', {"cd": 1.4, "dur": 0.33, "mul": 3.1, "land": 3, "col": "#e59c72"}],
  Wretchedlurker: ['charge', {"cd": 1.8, "dur": 0.68, "mul": 4.2}],
  Wretchedhurler: ['orbit', {"range": 134, "spin": -1.7, "cd": 1.2, "n": 3, "spread": 0.4, "spd": 248, "col": "#e59c72"}],
  Wretchedbrute: ['turret', {"cd": 2.1, "n": 3, "spread": 0.3, "spd": 220, "rot": 0, "col": "#e59c72"}],
  Wretchedwisp: ['kite', {"keep": 276, "cd": 1.5, "n": 3, "spread": 0.35, "spd": 272, "pierce": 0, "col": "#e59c72"}],
  Wretchedstalker: ['slam', {"r": 98, "cd": 2.6, "ring": 7, "mul": 0.48, "col": "#e59c72"}],
  Wretchedsentry: ['blink', {"cd": 2.0, "range": 143, "n": 3, "col": "#e59c72"}],
  Hushedcrawler: ['summon', {"max": 3, "cd": 3.5, "spawn": "silthopper"}],
  Hushedwarden: ['mine', {"cd": 1.1, "fuse": 1.6, "r": 55, "mul": 0.82}]
};

for (const k in K11CSPECS) {
  const [a, c] = K11CSPECS[k];
  ENEMY_BEHAVIOR_HANDLERS['k11c' + k] = function(game, e, dt){ FWF_ARCH[a](game, e, dt, c); };
}
