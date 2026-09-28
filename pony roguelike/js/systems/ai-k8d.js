'use strict';

const K8DSPECS = {
  Voidwisp: ['aura', {"r": 133, "cd": 2.4, "n": 3, "col": "#72e5ce", "slam": 0, "mul": 0.6}],
  Derelictmoth: ['blink', {"cd": 2.7, "range": 130, "n": 2, "col": "#72e5ce"}],
  Wreckspark: ['summon', {"max": 2, "cd": 3.0, "spawn": "voidwisp"}],
  Hullplate: ['turret', {"cd": 1.6, "n": 6, "spread": 1.7, "spd": 246, "rot": 0, "col": "#72e5ce"}],
  Driftram: ['aura', {"r": 152, "cd": 2.1, "n": 4, "col": "#72e5ce", "slam": 0, "mul": 0.6}],
  Silentturret: ['phase', {"freq": 2.1, "mul": 1.7, "n": 2, "col": "#72e5ce"}],
  Driftleaper: ['charge', {"cd": 1.8, "dur": 0.65, "mul": 4.0}],
  Voidslinger: ['aura', {"r": 130, "cd": 2.4, "n": 4, "col": "#72e5ce", "slam": 0, "mul": 0.6}],
  Wreckmortar: ['turret', {"cd": 1.1, "n": 5, "spread": 1.0, "spd": 243, "rot": 0.7, "col": "#72e5ce"}],
  Stardrift: ['phase', {"freq": 1.4, "mul": 1.6, "n": 2, "col": "#72e5ce"}],
  Hulkwatcher: ['phase', {"freq": 1.8, "mul": 1.4, "n": 3, "col": "#72e5ce"}],
  Debrissatellite: ['hop', {"cd": 1.4, "dur": 0.45, "mul": 3.7, "land": 1, "col": "#72e5ce"}],
  Hulltunneler: ['turret', {"cd": 1.3, "n": 7, "spread": 0.8, "spd": 202, "rot": 0, "col": "#72e5ce"}],
  Driftmites: ['aura', {"r": 121, "cd": 2.0, "n": 3, "col": "#72e5ce", "slam": 0, "mul": 0.6}],
  Wreckhusk: ['blink', {"cd": 2.5, "range": 104, "n": 3, "col": "#72e5ce"}],
  Voidcaller: ['aura', {"r": 116, "cd": 2.1, "n": 3, "col": "#72e5ce", "slam": 0, "mul": 0.6}],
  Hullmender: ['phase', {"freq": 1.7, "mul": 1.6, "n": 3, "col": "#72e5ce"}],
  Driftwarden: ['phase', {"freq": 1.4, "mul": 1.4, "n": 3, "col": "#72e5ce"}],
  Hulkmarksman: ['blink', {"cd": 1.8, "range": 133, "n": 3, "col": "#72e5ce"}],
  Hullblink: ['slam', {"r": 104, "cd": 3.0, "ring": 3, "mul": 0.6, "col": "#72e5ce"}],
  Shadowhulk: ['aura', {"r": 134, "cd": 1.9, "n": 4, "col": "#72e5ce", "slam": 0, "mul": 0.6}],
  Derelicthound: ['kite', {"keep": 284, "cd": 2.3, "n": 1, "spread": 0.35, "spd": 326, "pierce": 1, "col": "#72e5ce"}],
  Comethusk: ['wander', {"freq": 6.8, "amp": 2.2, "mul": 1.16}],
  Wreckslinger: ['charge', {"cd": 1.7, "dur": 0.5, "mul": 3.7}],
  Hullspark: ['blink', {"cd": 2.7, "range": 131, "n": 2, "col": "#72e5ce"}],
  Duskmoth: ['aura', {"r": 125, "cd": 2.3, "n": 3, "col": "#72e5ce", "slam": 0, "mul": 0.6}],
  Hulkram: ['turret', {"cd": 1.9, "n": 1, "spread": 0.5, "spd": 192, "rot": 0, "col": "#72e5ce"}],
  Driftmortar: ['blink', {"cd": 2.1, "range": 105, "n": 3, "col": "#72e5ce"}],
  Wrecktunneler: ['slam', {"r": 116, "cd": 3.0, "ring": 8, "mul": 0.57, "col": "#72e5ce"}],
  Driftsatellite: ['slam', {"r": 116, "cd": 2.3, "ring": 5, "mul": 0.48, "col": "#72e5ce"}],
  Derelictsentinel: ['phase', {"freq": 1.7, "mul": 1.8, "n": 3, "col": "#72e5ce"}],
  Driftblink: ['turret', {"cd": 2.3, "n": 2, "spread": 1.5, "spd": 211, "rot": 0, "col": "#72e5ce"}],
  Hullbulwark: ['aura', {"r": 153, "cd": 2.3, "n": 3, "col": "#72e5ce", "slam": 0, "mul": 0.6}],
  Grim8dcrawler: ['wander', {"freq": 6.5, "amp": 1.1, "mul": 1.02}],
  Grim8dwarden: ['hop', {"cd": 1.4, "dur": 0.42, "mul": 3.7, "land": 0, "col": "#72e5ce"}],
  Grim8dlurker: ['charge', {"cd": 2.3, "dur": 0.48, "mul": 4.3}],
  Grim8dhurler: ['orbit', {"range": 158, "spin": 1.8, "cd": 1.5, "n": 2, "spread": 0.4, "spd": 264, "col": "#72e5ce"}],
  Grim8dbrute: ['turret', {"cd": 2.0, "n": 1, "spread": 0.9, "spd": 245, "rot": 1.1, "col": "#72e5ce"}],
  Grim8dwisp: ['kite', {"keep": 258, "cd": 2.4, "n": 2, "spread": 0.35, "spd": 250, "pierce": 1, "col": "#72e5ce"}],
  Grim8dstalker: ['slam', {"r": 122, "cd": 2.5, "ring": 3, "mul": 0.56, "col": "#72e5ce"}],
  Grim8dsentry: ['blink', {"cd": 2.1, "range": 144, "n": 2, "col": "#72e5ce"}],
  Fell8dcrawler: ['summon', {"max": 3, "cd": 4.1, "spawn": "voidwisp"}],
  Fell8dwarden: ['mine', {"cd": 1.8, "fuse": 1.2, "r": 66, "mul": 0.71}]
};

for (const k in K8DSPECS) {
  const [a, c] = K8DSPECS[k];
  ENEMY_BEHAVIOR_HANDLERS['k8d' + k] = function(game, e, dt){ FWF_ARCH[a](game, e, dt, c); };
}
