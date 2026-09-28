'use strict';

const C19SPECS = {
  Hymnalwraith: ['wander', {"freq": 7.5, "amp": 2.2, "mul": 1.27}],
  Organghost: ['summon', {"max": 3, "cd": 3.6, "spawn": "wispswarm"}],
  Requiemvoice: ['blink', {"cd": 2.7, "range": 109, "n": 3, "col": "#80d060"}],
  Bellswinger: ['kite', {"keep": 288, "cd": 1.5, "n": 1, "spread": 0.35, "spd": 288, "pierce": 0, "col": "#80d060"}],
  Chimewraith: ['turret', {"cd": 2.3, "n": 2, "spread": 1.8, "spd": 225, "rot": 1.0, "col": "#80d060"}],
  Ringingbrass: ['phase', {"freq": 1.4, "mul": 1.6, "n": 3, "col": "#80d060"}],
  Hymnistlarva: ['wander', {"freq": 9.6, "amp": 2.0, "mul": 1.2}],
  Requiemreader: ['turret', {"cd": 2.0, "n": 8, "spread": 1.3, "spd": 202, "rot": 0.6, "col": "#80d060"}],
  Cathedralhound: ['charge', {"cd": 2.3, "dur": 0.76, "mul": 4.2}],
  Navewisprunner: ['charge', {"cd": 1.5, "dur": 0.51, "mul": 4.5}],
  Choirbowman: ['kite', {"keep": 209, "cd": 1.4, "n": 3, "spread": 0.35, "spd": 271, "pierce": 0, "col": "#80d060"}],
  Candleorbiter: ['orbit', {"range": 166, "spin": 1.4, "cd": 1.0, "n": 3, "spread": 0.4, "spd": 274, "col": "#80d060"}],
  Shroudpouncer: ['hop', {"cd": 1.2, "dur": 0.34, "mul": 3.5, "land": 5, "col": "#80d060"}],
  Candlestrafer: ['orbit', {"range": 161, "spin": -2.1, "cd": 1.2, "n": 2, "spread": 0.4, "spd": 242, "col": "#80d060"}],
  Forktonguehymn: ['kite', {"keep": 283, "cd": 1.6, "n": 1, "spread": 0.35, "spd": 289, "pierce": 0, "col": "#80d060"}],
  Wispswarm: ['wander', {"freq": 6.8, "amp": 1.1, "mul": 1.26}],
  Cryptambush: ['phase', {"freq": 1.5, "mul": 1.7, "n": 2, "col": "#80d060"}],
  Hymnlobber: ['mine', {"cd": 1.4, "fuse": 1.8, "r": 55, "mul": 0.6}],
  Requiemweaver: ['wander', {"freq": 6.8, "amp": 1.7, "mul": 1.15}],
  Cryptmole: ['blink', {"cd": 2.7, "range": 108, "n": 4, "col": "#80d060"}],
  Wardenshielder: ['aura', {"r": 121, "cd": 2.6, "n": 4, "col": "#80d060", "slam": 0, "mul": 0.6}],
  Hitandrunwisp: ['blink', {"cd": 2.8, "range": 125, "n": 4, "col": "#80d060"}],
  Farchoir: ['kite', {"keep": 290, "cd": 1.4, "n": 2, "spread": 0.35, "spd": 273, "pierce": 1, "col": "#80d060"}],
  Cathedralturret: ['turret', {"cd": 1.5, "n": 3, "spread": 1.1, "spd": 212, "rot": 0, "col": "#80d060"}],
  Choirburrower: ['blink', {"cd": 1.7, "range": 150, "n": 2, "col": "#80d060"}],
  Mossyshambler: ['wander', {"freq": 6.7, "amp": 1.3, "mul": 1.01}],
  Mossyfrond: ['hop', {"cd": 0.9, "dur": 0.48, "mul": 3.7, "land": 1, "col": "#80d060"}],
  Mossytoad: ['charge', {"cd": 2.2, "dur": 0.67, "mul": 4.2}],
  Mossythorn: ['orbit', {"range": 101, "spin": 1.1, "cd": 1.2, "n": 1, "spread": 0.4, "spd": 252, "col": "#80d060"}],
  Mossybloom: ['turret', {"cd": 1.8, "n": 2, "spread": 2.3, "spd": 226, "rot": 0, "col": "#80d060"}],
  Mossycreeper: ['kite', {"keep": 294, "cd": 1.7, "n": 3, "spread": 0.35, "spd": 323, "pierce": 1, "col": "#80d060"}],
  Mossyhusk: ['slam', {"r": 120, "cd": 2.5, "ring": 6, "mul": 0.5, "col": "#80d060"}],
  Mossywarden: ['blink', {"cd": 2.7, "range": 141, "n": 3, "col": "#80d060"}],
  Sunkenshambler: ['summon', {"max": 2, "cd": 4.1, "spawn": "wispswarm"}],
  Sunkenfrond: ['mine', {"cd": 1.2, "fuse": 1.7, "r": 59, "mul": 0.68}],
  Sunkentoad: ['aura', {"r": 144, "cd": 2.5, "n": 3, "col": "#80d060", "slam": 0, "mul": 0.6}],
  Sunkenthorn: ['phase', {"freq": 1.8, "mul": 1.4, "n": 3, "col": "#80d060"}],
  Sunkenbloom: ['wander', {"freq": 10.3, "amp": 2.4, "mul": 1.29}],
  Sunkencreeper: ['hop', {"cd": 1.2, "dur": 0.54, "mul": 3.6, "land": 1, "col": "#80d060"}],
  Sunkenhusk: ['charge', {"cd": 2.6, "dur": 0.72, "mul": 4.0}]
};

for (const k in C19SPECS) {
  const [a, c] = C19SPECS[k];
  ENEMY_BEHAVIOR_HANDLERS['c19' + k] = function(game, e, dt){ FWF_ARCH[a](game, e, dt, c); };
}
