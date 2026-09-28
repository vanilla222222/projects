'use strict';

const C16SPECS = {
  Reefclam: ['turret', {"cd": 2.4, "n": 3, "spread": 0.6, "spd": 251, "rot": 0.6, "col": "#a0d8e8"}],
  Bleachedcrust: ['turret', {"cd": 2.3, "n": 3, "spread": 1.6, "spd": 229, "rot": 0.5, "col": "#a0d8e8"}],
  Wreckdart: ['hop', {"cd": 1.3, "dur": 0.39, "mul": 3.3, "land": 0, "col": "#a0d8e8"}],
  Boneyardpike: ['hop', {"cd": 0.9, "dur": 0.33, "mul": 3.8, "land": 5, "col": "#a0d8e8"}],
  Boneyardgunner: ['kite', {"keep": 294, "cd": 1.6, "n": 1, "spread": 0.35, "spd": 264, "pierce": 0, "col": "#a0d8e8"}],
  Reefsentinel: ['kite', {"keep": 257, "cd": 2.3, "n": 1, "spread": 0.35, "spd": 308, "pierce": 1, "col": "#a0d8e8"}],
  Boneecholing: ['kite', {"keep": 296, "cd": 1.7, "n": 2, "spread": 0.35, "spd": 348, "pierce": 1, "col": "#a0d8e8"}],
  Wreckarcher: ['kite', {"keep": 256, "cd": 1.4, "n": 2, "spread": 0.35, "spd": 332, "pierce": 0, "col": "#a0d8e8"}],
  Reefcircler: ['orbit', {"range": 192, "spin": 2.2, "cd": 1.4, "n": 3, "spread": 0.4, "spd": 270, "col": "#a0d8e8"}],
  Bonepouncer: ['hop', {"cd": 1.7, "dur": 0.39, "mul": 3.7, "land": 2, "col": "#a0d8e8"}],
  Bleachedstrafer: ['orbit', {"range": 121, "spin": 1.2, "cd": 1.9, "n": 1, "spread": 0.4, "spd": 269, "col": "#a0d8e8"}],
  Splitreef: ['kite', {"keep": 245, "cd": 2.2, "n": 2, "spread": 0.35, "spd": 258, "pierce": 0, "col": "#a0d8e8"}],
  Reefswarm: ['wander', {"freq": 9.6, "amp": 1.3, "mul": 1.3}],
  Boneambush: ['phase', {"freq": 1.6, "mul": 1.6, "n": 3, "col": "#a0d8e8"}],
  Driftwoodlobber: ['mine', {"cd": 1.6, "fuse": 1.4, "r": 74, "mul": 0.71}],
  Reefweaver: ['wander', {"freq": 3.2, "amp": 1.7, "mul": 1.01}],
  Wreckburrower: ['blink', {"cd": 2.7, "range": 139, "n": 4, "col": "#a0d8e8"}],
  Mendingray: ['aura', {"r": 122, "cd": 2.1, "n": 5, "col": "#a0d8e8", "slam": 0, "mul": 0.6}],
  Boneyardsummoner: ['summon', {"max": 3, "cd": 3.3, "spawn": "reefswarm"}],
  Bonewhip: ['slam', {"r": 88, "cd": 2.7, "ring": 0, "mul": 0.49, "col": "#a0d8e8"}],
  Blinkreef: ['blink', {"cd": 1.9, "range": 135, "n": 4, "col": "#a0d8e8"}],
  Chargingpike: ['charge', {"cd": 1.9, "dur": 0.71, "mul": 4.0}],
  Shellstrafer: ['orbit', {"range": 119, "spin": -2.4, "cd": 1.6, "n": 2, "spread": 0.4, "spd": 220, "col": "#a0d8e8"}],
  Bleachedanemone: ['wander', {"freq": 4.8, "amp": 1.4, "mul": 1.22}],
  Bleachedlamprey: ['hop', {"cd": 1.2, "dur": 0.5, "mul": 3.0, "land": 3, "col": "#a0d8e8"}],
  Bleachedchimer: ['charge', {"cd": 1.9, "dur": 0.6, "mul": 3.6}],
  Bleachedcuttler: ['orbit', {"range": 173, "spin": 1.4, "cd": 1.6, "n": 3, "spread": 0.4, "spd": 268, "col": "#a0d8e8"}],
  Bleachedsiphon: ['turret', {"cd": 1.4, "n": 8, "spread": 0.9, "spd": 200, "rot": 1.3, "col": "#a0d8e8"}],
  Bleachedribwrack: ['kite', {"keep": 211, "cd": 2.4, "n": 3, "spread": 0.35, "spd": 259, "pierce": 1, "col": "#a0d8e8"}],
  Bleachedconch: ['slam', {"r": 112, "cd": 2.8, "ring": 8, "mul": 0.65, "col": "#a0d8e8"}],
  Bleachedprowler: ['blink', {"cd": 2.5, "range": 141, "n": 2, "col": "#a0d8e8"}],
  Tidewornanemone: ['summon', {"max": 2, "cd": 4.9, "spawn": "reefswarm"}],
  Tidewornlamprey: ['mine', {"cd": 1.2, "fuse": 2.0, "r": 72, "mul": 0.76}],
  Tidewornchimer: ['aura', {"r": 145, "cd": 2.5, "n": 3, "col": "#a0d8e8", "slam": 0, "mul": 0.6}],
  Tideworncuttler: ['phase', {"freq": 1.9, "mul": 1.6, "n": 2, "col": "#a0d8e8"}],
  Tidewornsiphon: ['wander', {"freq": 6.9, "amp": 1.1, "mul": 1.24}],
  Tidewornribwrack: ['hop', {"cd": 1.2, "dur": 0.51, "mul": 3.2, "land": 1, "col": "#a0d8e8"}],
  Tidewornconch: ['charge', {"cd": 2.0, "dur": 0.58, "mul": 4.0}],
  Tidewornprowler: ['orbit', {"range": 132, "spin": 1.4, "cd": 2.0, "n": 1, "spread": 0.4, "spd": 239, "col": "#a0d8e8"}],
  Pallidanemone: ['turret', {"cd": 1.1, "n": 3, "spread": 1.6, "spd": 216, "rot": 1.2, "col": "#a0d8e8"}]
};

for (const k in C16SPECS) {
  const [a, c] = C16SPECS[k];
  ENEMY_BEHAVIOR_HANDLERS['c16' + k] = function(game, e, dt){ FWF_ARCH[a](game, e, dt, c); };
}
