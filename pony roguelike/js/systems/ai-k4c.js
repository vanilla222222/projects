'use strict';

const K4CSPECS = {
  Culvertwatcher: ['orbit', {"range": 130, "spin": 1.7, "cd": 1.2, "n": 2, "spread": 0.4, "spd": 268, "col": "#e59372"}],
  Carrionswirl: ['hop', {"cd": 1.1, "dur": 0.4, "mul": 4.0, "land": 4, "col": "#e59372"}],
  Muckborer: ['blink', {"cd": 2.0, "range": 115, "n": 3, "col": "#e59372"}],
  Rotgrubs: ['slam', {"r": 88, "cd": 2.8, "ring": 7, "mul": 0.55, "col": "#e59372"}],
  Rotsack: ['orbit', {"range": 195, "spin": 1.1, "cd": 2.0, "n": 3, "spread": 0.4, "spd": 276, "col": "#e59372"}],
  Broodcaller: ['charge', {"cd": 2.5, "dur": 0.58, "mul": 3.8}],
  Muckmender: ['mine', {"cd": 1.4, "fuse": 2.1, "r": 59, "mul": 0.85}],
  Cisternwarden: ['wander', {"freq": 8.7, "amp": 1.4, "mul": 1.14}],
  Outfallmarksman: ['kite', {"keep": 267, "cd": 2.3, "n": 1, "spread": 0.35, "spd": 328, "pierce": 0, "col": "#e59372"}],
  Backflowblink: ['slam', {"r": 87, "cd": 2.1, "ring": 7, "mul": 0.47, "col": "#e59372"}],
  Cisternlurker: ['aura', {"r": 138, "cd": 2.5, "n": 3, "col": "#e59372", "slam": 0, "mul": 0.6}],
  Floodbrute: ['summon', {"max": 3, "cd": 4.9, "spawn": "culvertwatcher"}],
  Scumskitter: ['summon', {"max": 3, "cd": 3.9, "spawn": "culvertwatcher"}],
  Effluentspitter: ['charge', {"cd": 1.8, "dur": 0.48, "mul": 3.6}],
  Miasmadrone: ['wander', {"freq": 3.1, "amp": 1.2, "mul": 1.06}],
  Gnatveil: ['wander', {"freq": 10.5, "amp": 1.8, "mul": 1.2}],
  Tidecharger: ['blink', {"cd": 1.7, "range": 105, "n": 4, "col": "#e59372"}],
  Weirmortar: ['slam', {"r": 87, "cd": 2.2, "ring": 1, "mul": 0.6, "col": "#e59372"}],
  Drownedhulk: ['slam', {"r": 120, "cd": 2.6, "ring": 3, "mul": 0.53, "col": "#e59372"}],
  Eddycircler: ['summon', {"max": 2, "cd": 3.7, "spawn": "culvertwatcher"}],
  Overflowwatcher: ['orbit', {"range": 147, "spin": 2.2, "cd": 1.3, "n": 1, "spread": 0.4, "spd": 238, "col": "#e59372"}],
  Siltmarksman: ['aura', {"r": 123, "cd": 2.3, "n": 4, "col": "#e59372", "slam": 0, "mul": 0.6}],
  Cisternblink: ['turret', {"cd": 2.3, "n": 1, "spread": 2.4, "spd": 244, "rot": 0, "col": "#e59372"}],
  Sewerrat: ['phase', {"freq": 1.8, "mul": 1.8, "n": 2, "col": "#e59372"}],
  Fetidflier: ['slam', {"r": 96, "cd": 2.8, "ring": 7, "mul": 0.6, "col": "#e59372"}],
  Rotbladder: ['slam', {"r": 102, "cd": 2.5, "ring": 3, "mul": 0.45, "col": "#e59372"}],
  Rustplate: ['hop', {"cd": 1.2, "dur": 0.45, "mul": 3.7, "land": 4, "col": "#e59372"}],
  Brinehog: ['kite', {"keep": 221, "cd": 2.1, "n": 3, "spread": 0.35, "spd": 256, "pierce": 0, "col": "#e59372"}],
  Standpipeturret: ['blink', {"cd": 2.3, "range": 103, "n": 3, "col": "#e59372"}],
  Culvertleaper: ['wander', {"freq": 9.3, "amp": 1.1, "mul": 1.15}],
  Bilgespitter: ['aura', {"r": 152, "cd": 2.3, "n": 3, "col": "#e59372", "slam": 0, "mul": 0.6}],
  Refusemortar: ['slam', {"r": 88, "cd": 2.6, "ring": 1, "mul": 0.52, "col": "#e59372"}],
  Bilgeweaver: ['mine', {"cd": 1.9, "fuse": 1.7, "r": 71, "mul": 0.65}],
  Grim4ccrawler: ['wander', {"freq": 6.6, "amp": 2.3, "mul": 1.04}],
  Grim4cwarden: ['hop', {"cd": 1.7, "dur": 0.47, "mul": 3.9, "land": 3, "col": "#e59372"}],
  Grim4clurker: ['charge', {"cd": 2.6, "dur": 0.62, "mul": 3.6}],
  Grim4churler: ['orbit', {"range": 161, "spin": -2.4, "cd": 1.6, "n": 1, "spread": 0.4, "spd": 236, "col": "#e59372"}],
  Grim4cbrute: ['turret', {"cd": 1.4, "n": 3, "spread": 1.3, "spd": 243, "rot": 0, "col": "#e59372"}],
  Grim4cwisp: ['kite', {"keep": 258, "cd": 2.1, "n": 1, "spread": 0.35, "spd": 304, "pierce": 0, "col": "#e59372"}],
  Grim4cstalker: ['slam', {"r": 113, "cd": 2.7, "ring": 4, "mul": 0.56, "col": "#e59372"}],
  Grim4csentry: ['blink', {"cd": 1.9, "range": 156, "n": 4, "col": "#e59372"}],
  Fell4ccrawler: ['summon', {"max": 3, "cd": 4.7, "spawn": "culvertwatcher"}],
  Fell4cwarden: ['mine', {"cd": 1.7, "fuse": 1.9, "r": 70, "mul": 0.62}]
};

for (const k in K4CSPECS) {
  const [a, c] = K4CSPECS[k];
  ENEMY_BEHAVIOR_HANDLERS['k4c' + k] = function(game, e, dt){ FWF_ARCH[a](game, e, dt, c); };
}
