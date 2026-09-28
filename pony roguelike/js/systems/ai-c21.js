'use strict';

const C21SPECS = {
  Currentrunner: ['wander', {"freq": 9.6, "amp": 1.8, "mul": 1.04}],
  Ripcurrentling: ['turret', {"cd": 1.1, "n": 6, "spread": 0.8, "spd": 226, "rot": 0.6, "col": "#f060d0"}],
  Currentcaller: ['aura', {"r": 128, "cd": 2.4, "n": 3, "col": "#f060d0", "slam": 0, "mul": 0.6}],
  Voidbell: ['hop', {"cd": 1.0, "dur": 0.51, "mul": 3.7, "land": 0, "col": "#f060d0"}],
  Echomarker: ['turret', {"cd": 1.7, "n": 5, "spread": 0.7, "spd": 253, "rot": 0, "col": "#f060d0"}],
  Currentbeacon: ['charge', {"cd": 1.8, "dur": 0.71, "mul": 3.9}],
  Hiddenmaw: ['charge', {"cd": 2.1, "dur": 0.76, "mul": 4.0}],
  Voidjaw: ['charge', {"cd": 1.6, "dur": 0.73, "mul": 4.3}],
  Currenthound: ['charge', {"cd": 1.6, "dur": 0.42, "mul": 3.9}],
  Depthrunner: ['charge', {"cd": 1.5, "dur": 0.51, "mul": 4.4}],
  Voidbowman: ['kite', {"keep": 258, "cd": 1.5, "n": 1, "spread": 0.35, "spd": 257, "pierce": 1, "col": "#f060d0"}],
  Driftorbiter2: ['orbit', {"range": 170, "spin": -1.6, "cd": 1.3, "n": 2, "spread": 0.4, "spd": 242, "col": "#f060d0"}],
  Currentpouncer: ['hop', {"cd": 1.2, "dur": 0.39, "mul": 3.7, "land": 4, "col": "#f060d0"}],
  Voidstrafer: ['orbit', {"range": 115, "spin": -1.9, "cd": 2.0, "n": 2, "spread": 0.4, "spd": 254, "col": "#f060d0"}],
  Forktonguecurrent: ['kite', {"keep": 205, "cd": 2.4, "n": 1, "spread": 0.35, "spd": 295, "pierce": 1, "col": "#f060d0"}],
  Darkswarm: ['wander', {"freq": 8.3, "amp": 2.5, "mul": 1.16}],
  Currentambush: ['phase', {"freq": 1.8, "mul": 1.8, "n": 3, "col": "#f060d0"}],
  Voidlobber: ['mine', {"cd": 1.9, "fuse": 2.0, "r": 67, "mul": 0.8}],
  Currentweaver2: ['wander', {"freq": 5.1, "amp": 2.2, "mul": 1.14}],
  Currentmole: ['blink', {"cd": 1.9, "range": 134, "n": 2, "col": "#f060d0"}],
  Voidshielder: ['aura', {"r": 153, "cd": 2.0, "n": 3, "col": "#f060d0", "slam": 0, "mul": 0.6}],
  Hitandrundeep: ['blink', {"cd": 1.8, "range": 139, "n": 2, "col": "#f060d0"}],
  Fardeep: ['kite', {"keep": 230, "cd": 1.7, "n": 2, "spread": 0.35, "spd": 347, "pierce": 1, "col": "#f060d0"}],
  Currentturret: ['turret', {"cd": 2.1, "n": 8, "spread": 1.8, "spd": 248, "rot": 1.3, "col": "#f060d0"}],
  Undertowweaver: ['wander', {"freq": 10.8, "amp": 1.8, "mul": 1.01}],
  Neondrone: ['wander', {"freq": 9.7, "amp": 1.7, "mul": 1.1}],
  Neoncrawler: ['hop', {"cd": 1.3, "dur": 0.48, "mul": 3.7, "land": 0, "col": "#f060d0"}],
  Neoncipher: ['charge', {"cd": 1.6, "dur": 0.73, "mul": 4.2}],
  Neonspark: ['orbit', {"range": 145, "spin": 2.2, "cd": 1.4, "n": 3, "spread": 0.4, "spd": 237, "col": "#f060d0"}],
  Neonnode: ['turret', {"cd": 1.5, "n": 6, "spread": 2.0, "spd": 190, "rot": 0, "col": "#f060d0"}],
  Neonwarden: ['kite', {"keep": 225, "cd": 1.8, "n": 1, "spread": 0.35, "spd": 329, "pierce": 0, "col": "#f060d0"}],
  Neonphantom: ['slam', {"r": 98, "cd": 2.9, "ring": 5, "mul": 0.64, "col": "#f060d0"}],
  Neonbug: ['blink', {"cd": 2.1, "range": 149, "n": 4, "col": "#f060d0"}],
  Staticcrawler: ['summon', {"max": 2, "cd": 3.8, "spawn": "darkswarm"}],
  Staticcipher: ['mine', {"cd": 1.3, "fuse": 1.3, "r": 58, "mul": 0.61}],
  Staticspark: ['aura', {"r": 134, "cd": 2.1, "n": 5, "col": "#f060d0", "slam": 0, "mul": 0.6}],
  Staticnode: ['phase', {"freq": 1.8, "mul": 1.5, "n": 2, "col": "#f060d0"}],
  Staticwarden: ['wander', {"freq": 4.9, "amp": 1.0, "mul": 1.28}],
  Staticphantom: ['hop', {"cd": 1.2, "dur": 0.5, "mul": 3.8, "land": 1, "col": "#f060d0"}],
  Staticbug: ['charge', {"cd": 2.5, "dur": 0.52, "mul": 3.9}]
};

for (const k in C21SPECS) {
  const [a, c] = C21SPECS[k];
  ENEMY_BEHAVIOR_HANDLERS['c21' + k] = function(game, e, dt){ FWF_ARCH[a](game, e, dt, c); };
}
