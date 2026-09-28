'use strict';

const C20SPECS = {
  Chantedhusk: ['wander', {"freq": 9.1, "amp": 1.5, "mul": 1.26}],
  Bellechoghost: ['phase', {"freq": 1.2, "mul": 1.5, "n": 3, "col": "#e0c060"}],
  Ironclapper: ['mine', {"cd": 1.6, "fuse": 1.4, "r": 73, "mul": 0.76}],
  Belfrywatcher: ['charge', {"cd": 1.6, "dur": 0.65, "mul": 4.4}],
  Chanterelder: ['kite', {"keep": 267, "cd": 2.3, "n": 3, "spread": 0.35, "spd": 270, "pierce": 1, "col": "#e0c060"}],
  Organarcher: ['kite', {"keep": 263, "cd": 1.6, "n": 2, "spread": 0.35, "spd": 321, "pierce": 0, "col": "#e0c060"}],
  Belfrycircler: ['orbit', {"range": 166, "spin": 2.3, "cd": 1.9, "n": 3, "spread": 0.4, "spd": 260, "col": "#e0c060"}],
  Crypticpouncer: ['hop', {"cd": 1.3, "dur": 0.49, "mul": 4.0, "land": 5, "col": "#e0c060"}],
  Requiemstrafer: ['orbit', {"range": 103, "spin": 2.0, "cd": 1.3, "n": 2, "spread": 0.4, "spd": 241, "col": "#e0c060"}],
  Splitchoir: ['kite', {"keep": 222, "cd": 1.8, "n": 1, "spread": 0.35, "spd": 299, "pierce": 0, "col": "#e0c060"}],
  Chantswarm: ['wander', {"freq": 10.6, "amp": 2.4, "mul": 1.08}],
  Pewambush: ['phase', {"freq": 1.8, "mul": 1.5, "n": 3, "col": "#e0c060"}],
  Candlewaxlobber: ['mine', {"cd": 1.8, "fuse": 1.7, "r": 72, "mul": 0.63}],
  Choirweaver: ['wander', {"freq": 8.2, "amp": 2.1, "mul": 1.05}],
  Ossuaryburrower: ['blink', {"cd": 1.7, "range": 136, "n": 2, "col": "#e0c060"}],
  Mendingchoir: ['aura', {"r": 134, "cd": 2.3, "n": 3, "col": "#e0c060", "slam": 0, "mul": 0.6}],
  Chorussummoner: ['summon', {"max": 2, "cd": 3.7, "spawn": "chantswarm"}],
  Belfrywhip: ['slam', {"r": 106, "cd": 2.7, "ring": 7, "mul": 0.54, "col": "#e0c060"}],
  Blinkchoir: ['blink', {"cd": 1.9, "range": 119, "n": 2, "col": "#e0c060"}],
  Chargingbrass: ['charge', {"cd": 2.6, "dur": 0.45, "mul": 4.0}],
  Belltoller: ['turret', {"cd": 2.4, "n": 8, "spread": 1.9, "spd": 226, "rot": 0.7, "col": "#e0c060"}],
  Rustedsentry: ['wander', {"freq": 3.1, "amp": 2.2, "mul": 1.09}],
  Rustedidol: ['hop', {"cd": 1.2, "dur": 0.54, "mul": 3.0, "land": 4, "col": "#e0c060"}],
  Rustedscarab: ['charge', {"cd": 1.7, "dur": 0.48, "mul": 4.0}],
  Rustedguardian: ['orbit', {"range": 109, "spin": -2.5, "cd": 1.5, "n": 1, "spread": 0.4, "spd": 251, "col": "#e0c060"}],
  Rustedlancer: ['turret', {"cd": 1.9, "n": 7, "spread": 2.7, "spd": 202, "rot": 0, "col": "#e0c060"}],
  Rustedmummer: ['kite', {"keep": 264, "cd": 1.5, "n": 2, "spread": 0.35, "spd": 283, "pierce": 0, "col": "#e0c060"}],
  Rustedcenser: ['slam', {"r": 121, "cd": 2.6, "ring": 7, "mul": 0.46, "col": "#e0c060"}],
  Rustedstatue: ['blink', {"cd": 1.8, "range": 137, "n": 3, "col": "#e0c060"}],
  Gildedsentry: ['summon', {"max": 3, "cd": 3.6, "spawn": "chantswarm"}],
  Gildedidol: ['mine', {"cd": 1.8, "fuse": 1.7, "r": 66, "mul": 0.65}],
  Gildedguardian: ['aura', {"r": 115, "cd": 2.3, "n": 5, "col": "#e0c060", "slam": 0, "mul": 0.6}],
  Gildedlancer: ['phase', {"freq": 1.6, "mul": 1.5, "n": 2, "col": "#e0c060"}],
  Gildedmummer: ['wander', {"freq": 7.7, "amp": 2.0, "mul": 1.25}],
  Gildedcenser: ['hop', {"cd": 1.6, "dur": 0.39, "mul": 3.3, "land": 5, "col": "#e0c060"}],
  Gildedstatue: ['charge', {"cd": 2.0, "dur": 0.59, "mul": 4.3}],
  Ashensentry: ['orbit', {"range": 131, "spin": 1.0, "cd": 1.5, "n": 2, "spread": 0.4, "spd": 239, "col": "#e0c060"}],
  Ashenidol: ['turret', {"cd": 2.1, "n": 1, "spread": 2.5, "spd": 214, "rot": 0, "col": "#e0c060"}],
  Ashenscarab: ['kite', {"keep": 209, "cd": 1.9, "n": 2, "spread": 0.35, "spd": 336, "pierce": 0, "col": "#e0c060"}],
  Ashenguardian: ['slam', {"r": 115, "cd": 2.8, "ring": 4, "mul": 0.55, "col": "#e0c060"}]
};

for (const k in C20SPECS) {
  const [a, c] = C20SPECS[k];
  ENEMY_BEHAVIOR_HANDLERS['c20' + k] = function(game, e, dt){ FWF_ARCH[a](game, e, dt, c); };
}
