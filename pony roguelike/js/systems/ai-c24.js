'use strict';

const C24SPECS = {
  Fangwretch: ['charge', {"cd": 2.3, "dur": 0.73, "mul": 4.3}],
  Jawshard: ['slam', {"r": 124, "cd": 3.2, "ring": 7, "mul": 0.48, "col": "#b080ff"}],
  Deepwarden: ['charge', {"cd": 1.6, "dur": 0.7, "mul": 3.9}],
  Bonewarden: ['charge', {"cd": 2.6, "dur": 0.41, "mul": 4.4}],
  Tidebrute: ['slam', {"r": 106, "cd": 2.1, "ring": 0, "mul": 0.48, "col": "#b080ff"}],
  Hollowmaw: ['slam', {"r": 115, "cd": 2.5, "ring": 2, "mul": 0.52, "col": "#b080ff"}],
  Drownedcolossus: ['orbit', {"range": 198, "spin": 1.3, "cd": 1.6, "n": 3, "spread": 0.4, "spd": 259, "col": "#b080ff"}],
  Crushonarcher: ['kite', {"keep": 224, "cd": 1.6, "n": 1, "spread": 0.35, "spd": 329, "pierce": 0, "col": "#b080ff"}],
  Mawcircler: ['orbit', {"range": 132, "spin": 2.5, "cd": 1.5, "n": 3, "spread": 0.4, "spd": 279, "col": "#b080ff"}],
  Crushpouncer: ['hop', {"cd": 1.7, "dur": 0.4, "mul": 4.0, "land": 3, "col": "#b080ff"}],
  Jawstrafer: ['orbit', {"range": 118, "spin": -2.1, "cd": 2.0, "n": 3, "spread": 0.4, "spd": 267, "col": "#b080ff"}],
  Splitmaw: ['kite', {"keep": 209, "cd": 2.3, "n": 3, "spread": 0.35, "spd": 310, "pierce": 1, "col": "#b080ff"}],
  Mawswarm: ['wander', {"freq": 8.3, "amp": 1.7, "mul": 1.08}],
  Jawambush: ['phase', {"freq": 1.8, "mul": 1.6, "n": 2, "col": "#b080ff"}],
  Maulobber: ['mine', {"cd": 1.1, "fuse": 1.4, "r": 62, "mul": 0.68}],
  Jawweaver: ['wander', {"freq": 8.1, "amp": 2.1, "mul": 1.06}],
  Mawburrower: ['blink', {"cd": 1.7, "range": 156, "n": 4, "col": "#b080ff"}],
  Mendingmaw: ['aura', {"r": 147, "cd": 2.3, "n": 3, "col": "#b080ff", "slam": 0, "mul": 0.6}],
  Mawsummoner: ['summon', {"max": 2, "cd": 4.6, "spawn": "mawswarm"}],
  Fangwhip: ['slam', {"r": 120, "cd": 2.8, "ring": 4, "mul": 0.55, "col": "#b080ff"}],
  Blinkmaw: ['blink', {"cd": 2.4, "range": 124, "n": 3, "col": "#b080ff"}],
  Chargingfang: ['charge', {"cd": 2.4, "dur": 0.74, "mul": 4.0}],
  Fangsummoner: ['summon', {"max": 2, "cd": 4.8, "spawn": "mawswarm"}],
  Voidherald: ['wander', {"freq": 4.7, "amp": 1.2, "mul": 1.07}],
  Voidwraith: ['hop', {"cd": 1.0, "dur": 0.33, "mul": 3.6, "land": 2, "col": "#b080ff"}],
  Voidseer: ['charge', {"cd": 1.7, "dur": 0.59, "mul": 4.0}],
  Voiddevourer: ['orbit', {"range": 122, "spin": 1.0, "cd": 1.9, "n": 1, "spread": 0.4, "spd": 240, "col": "#b080ff"}],
  Voidecho: ['turret', {"cd": 1.9, "n": 1, "spread": 0.9, "spd": 257, "rot": 0, "col": "#b080ff"}],
  Voidsentinel: ['kite', {"keep": 226, "cd": 2.3, "n": 2, "spread": 0.35, "spd": 261, "pierce": 0, "col": "#b080ff"}],
  Voidsplinter: ['slam', {"r": 93, "cd": 2.2, "ring": 7, "mul": 0.55, "col": "#b080ff"}],
  Voidprophet: ['blink', {"cd": 2.6, "range": 149, "n": 3, "col": "#b080ff"}],
  Eclipsedherald: ['summon', {"max": 3, "cd": 4.2, "spawn": "mawswarm"}],
  Eclipsedwraith: ['mine', {"cd": 1.9, "fuse": 1.4, "r": 71, "mul": 0.87}],
  Eclipsedseer: ['aura', {"r": 140, "cd": 2.0, "n": 5, "col": "#b080ff", "slam": 0, "mul": 0.6}],
  Eclipseddevourer: ['phase', {"freq": 1.5, "mul": 1.7, "n": 3, "col": "#b080ff"}],
  Eclipsedecho: ['wander', {"freq": 3.4, "amp": 1.6, "mul": 1.25}],
  Eclipsedsentinel: ['hop', {"cd": 1.4, "dur": 0.55, "mul": 3.4, "land": 4, "col": "#b080ff"}],
  Eclipsedsplinter: ['charge', {"cd": 1.6, "dur": 0.79, "mul": 3.8}],
  Eclipsedprophet: ['orbit', {"range": 115, "spin": 2.4, "cd": 1.6, "n": 2, "spread": 0.4, "spd": 228, "col": "#b080ff"}],
  Starlessherald: ['turret', {"cd": 1.7, "n": 7, "spread": 0.7, "spd": 222, "rot": 0, "col": "#b080ff"}]
};

for (const k in C24SPECS) {
  const [a, c] = C24SPECS[k];
  ENEMY_BEHAVIOR_HANDLERS['c24' + k] = function(game, e, dt){ FWF_ARCH[a](game, e, dt, c); };
}
