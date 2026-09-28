'use strict';

const C22SPECS = {
  Driftbody: ['kite', {"keep": 200, "cd": 2.1, "n": 1, "spread": 0.35, "spd": 346, "pierce": 0, "col": "#a0e0ff"}],
  Tidewraith: ['wander', {"freq": 10.1, "amp": 2.4, "mul": 1.09}],
  Deepnode: ['mine', {"cd": 1.9, "fuse": 1.2, "r": 67, "mul": 0.73}],
  Lightlessorb: ['orbit', {"range": 185, "spin": 1.8, "cd": 2.0, "n": 1, "spread": 0.4, "spd": 245, "col": "#a0e0ff"}],
  Darkhunter: ['orbit', {"range": 131, "spin": 1.3, "cd": 1.3, "n": 1, "spread": 0.4, "spd": 258, "col": "#a0e0ff"}],
  Currentghoul: ['hop', {"cd": 0.9, "dur": 0.36, "mul": 3.5, "land": 4, "col": "#a0e0ff"}],
  Blackarcher: ['kite', {"keep": 201, "cd": 1.4, "n": 2, "spread": 0.35, "spd": 336, "pierce": 0, "col": "#a0e0ff"}],
  Deepcircler: ['orbit', {"range": 145, "spin": 1.2, "cd": 2.0, "n": 1, "spread": 0.4, "spd": 276, "col": "#a0e0ff"}],
  Darkpouncer: ['hop', {"cd": 1.8, "dur": 0.35, "mul": 4.0, "land": 5, "col": "#a0e0ff"}],
  Darkstrafer: ['orbit', {"range": 166, "spin": 1.7, "cd": 1.2, "n": 3, "spread": 0.4, "spd": 250, "col": "#a0e0ff"}],
  Splitcurrent: ['kite', {"keep": 258, "cd": 1.8, "n": 2, "spread": 0.35, "spd": 272, "pierce": 1, "col": "#a0e0ff"}],
  Voidswarm: ['wander', {"freq": 4.2, "amp": 1.1, "mul": 1.13}],
  Deepambush: ['phase', {"freq": 1.7, "mul": 1.7, "n": 3, "col": "#a0e0ff"}],
  Driftlobber: ['mine', {"cd": 1.3, "fuse": 1.5, "r": 69, "mul": 0.75}],
  Darkweaver: ['wander', {"freq": 6.4, "amp": 2.5, "mul": 1.05}],
  Deepburrower: ['blink', {"cd": 2.5, "range": 111, "n": 3, "col": "#a0e0ff"}],
  Mendingcurrent: ['aura', {"r": 120, "cd": 1.9, "n": 5, "col": "#a0e0ff", "slam": 0, "mul": 0.6}],
  Currentsummoner: ['summon', {"max": 2, "cd": 4.6, "spawn": "voidswarm"}],
  Currentwhip: ['slam', {"r": 95, "cd": 2.0, "ring": 7, "mul": 0.57, "col": "#a0e0ff"}],
  Blinkdeep: ['blink', {"cd": 2.5, "range": 140, "n": 2, "col": "#a0e0ff"}],
  Chargingdeep: ['charge', {"cd": 2.1, "dur": 0.65, "mul": 4.4}],
  Reaverleaper: ['hop', {"cd": 1.5, "dur": 0.38, "mul": 3.7, "land": 4, "col": "#a0e0ff"}],
  Frostboundwisp: ['wander', {"freq": 10.7, "amp": 1.2, "mul": 1.21}],
  Frostboundhound: ['hop', {"cd": 0.9, "dur": 0.41, "mul": 3.1, "land": 5, "col": "#a0e0ff"}],
  Frostboundshard: ['charge', {"cd": 1.9, "dur": 0.55, "mul": 4.2}],
  Frostboundgolem: ['orbit', {"range": 175, "spin": 1.8, "cd": 2.1, "n": 1, "spread": 0.4, "spd": 234, "col": "#a0e0ff"}],
  Frostboundlurker: ['turret', {"cd": 1.9, "n": 4, "spread": 1.1, "spd": 252, "rot": 0, "col": "#a0e0ff"}],
  Frostboundarcher: ['kite', {"keep": 208, "cd": 1.6, "n": 2, "spread": 0.35, "spd": 337, "pierce": 1, "col": "#a0e0ff"}],
  Frostbounddrifter: ['slam', {"r": 121, "cd": 2.2, "ring": 6, "mul": 0.59, "col": "#a0e0ff"}],
  Frostboundbell: ['blink', {"cd": 2.5, "range": 125, "n": 3, "col": "#a0e0ff"}],
  Rimedwisp: ['summon', {"max": 3, "cd": 3.6, "spawn": "voidswarm"}],
  Rimedhound: ['mine', {"cd": 1.8, "fuse": 1.4, "r": 65, "mul": 0.88}],
  Rimedshard: ['aura', {"r": 133, "cd": 2.6, "n": 4, "col": "#a0e0ff", "slam": 0, "mul": 0.6}],
  Rimedgolem: ['phase', {"freq": 1.6, "mul": 1.4, "n": 2, "col": "#a0e0ff"}],
  Rimedlurker: ['wander', {"freq": 8.8, "amp": 1.8, "mul": 1.07}],
  Rimedarcher: ['hop', {"cd": 1.0, "dur": 0.49, "mul": 3.0, "land": 5, "col": "#a0e0ff"}],
  Rimeddrifter: ['charge', {"cd": 2.2, "dur": 0.46, "mul": 3.8}],
  Rimedbell: ['orbit', {"range": 116, "spin": 1.4, "cd": 1.6, "n": 3, "spread": 0.4, "spd": 254, "col": "#a0e0ff"}],
  Glacialwisp: ['turret', {"cd": 1.8, "n": 7, "spread": 1.2, "spd": 212, "rot": 1.4, "col": "#a0e0ff"}],
  Glacialhound: ['kite', {"keep": 240, "cd": 2.2, "n": 2, "spread": 0.35, "spd": 273, "pierce": 0, "col": "#a0e0ff"}]
};

for (const k in C22SPECS) {
  const [a, c] = C22SPECS[k];
  ENEMY_BEHAVIOR_HANDLERS['c22' + k] = function(game, e, dt){ FWF_ARCH[a](game, e, dt, c); };
}
