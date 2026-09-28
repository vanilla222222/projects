'use strict';

const K13CSPECS = {
  Undercitydrifter: ['slam', {"r": 94, "cd": 2.1, "ring": 6, "mul": 0.65, "col": "#e57272"}],
  Underciteel: ['blink', {"cd": 1.8, "range": 112, "n": 3, "col": "#e57272"}],
  Undertowling: ['aura', {"r": 116, "cd": 2.4, "n": 4, "col": "#e57272", "slam": 0, "mul": 0.6}],
  Siltlurker: ['summon', {"max": 2, "cd": 4.2, "spawn": "flooddrifterswarm"}],
  Bilgehusk: ['slam', {"r": 118, "cd": 2.6, "ring": 3, "mul": 0.49, "col": "#e57272"}],
  Drownedreacher: ['phase', {"freq": 1.6, "mul": 1.5, "n": 3, "col": "#e57272"}],
  Silentgrip: ['phase', {"freq": 2.0, "mul": 1.7, "n": 3, "col": "#e57272"}],
  Undercitehound: ['charge', {"cd": 2.2, "dur": 0.52, "mul": 4.0}],
  Underciterunner: ['charge', {"cd": 2.7, "dur": 0.76, "mul": 4.2}],
  Siltarcher: ['kite', {"keep": 283, "cd": 2.0, "n": 2, "spread": 0.35, "spd": 272, "pierce": 0, "col": "#e57272"}],
  Ruinflitter: ['orbit', {"range": 187, "spin": 1.7, "cd": 1.8, "n": 1, "spread": 0.4, "spd": 229, "col": "#e57272"}],
  Navelurker: ['hop', {"cd": 1.8, "dur": 0.53, "mul": 3.3, "land": 5, "col": "#e57272"}],
  Flotsamstrafer: ['orbit', {"range": 154, "spin": 1.8, "cd": 2.0, "n": 2, "spread": 0.4, "spd": 230, "col": "#e57272"}],
  Archsplitter: ['kite', {"keep": 279, "cd": 2.1, "n": 1, "spread": 0.35, "spd": 289, "pierce": 1, "col": "#e57272"}],
  Flooddrifterswarm: ['wander', {"freq": 4.0, "amp": 1.0, "mul": 1.25}],
  Altarambush: ['phase', {"freq": 1.3, "mul": 1.7, "n": 2, "col": "#e57272"}],
  Reliclobber: ['mine', {"cd": 1.0, "fuse": 1.9, "r": 62, "mul": 0.73}],
  Ripplebender: ['wander', {"freq": 8.1, "amp": 1.9, "mul": 1.22}],
  Siltmole: ['blink', {"cd": 1.8, "range": 111, "n": 4, "col": "#e57272"}],
  Siltshielder: ['aura', {"r": 121, "cd": 2.6, "n": 5, "col": "#e57272", "slam": 0, "mul": 0.6}],
  Hitandrundrifter: ['blink', {"cd": 2.7, "range": 150, "n": 4, "col": "#e57272"}],
  Farlurker: ['kite', {"keep": 234, "cd": 1.5, "n": 2, "spread": 0.35, "spd": 299, "pierce": 0, "col": "#e57272"}],
  Turretbarnacle: ['turret', {"cd": 2.4, "n": 8, "spread": 2.6, "spd": 257, "rot": 1.4, "col": "#e57272"}],
  Gillrasp: ['charge', {"cd": 1.5, "dur": 0.78, "mul": 3.9}],
  Grimcrawler: ['wander', {"freq": 4.3, "amp": 1.3, "mul": 1.3}],
  Grimwarden: ['hop', {"cd": 0.9, "dur": 0.39, "mul": 3.6, "land": 4, "col": "#e57272"}],
  Grimlurker: ['charge', {"cd": 1.5, "dur": 0.7, "mul": 3.9}],
  Grimhurler: ['orbit', {"range": 158, "spin": 1.5, "cd": 1.3, "n": 2, "spread": 0.4, "spd": 240, "col": "#e57272"}],
  Grimbrute: ['turret', {"cd": 1.9, "n": 6, "spread": 0.5, "spd": 208, "rot": 0, "col": "#e57272"}],
  Grimwisp: ['kite', {"keep": 277, "cd": 2.5, "n": 2, "spread": 0.35, "spd": 254, "pierce": 0, "col": "#e57272"}],
  Grimstalker: ['slam', {"r": 107, "cd": 2.1, "ring": 1, "mul": 0.45, "col": "#e57272"}],
  Grimsentry: ['blink', {"cd": 2.1, "range": 106, "n": 2, "col": "#e57272"}],
  Fellcrawler: ['summon', {"max": 3, "cd": 3.1, "spawn": "flooddrifterswarm"}],
  Fellwarden: ['mine', {"cd": 1.7, "fuse": 1.2, "r": 70, "mul": 0.78}],
  Felllurker: ['aura', {"r": 127, "cd": 2.0, "n": 5, "col": "#e57272", "slam": 0, "mul": 0.6}],
  Fellhurler: ['phase', {"freq": 1.3, "mul": 1.7, "n": 2, "col": "#e57272"}],
  Fellbrute: ['wander', {"freq": 5.2, "amp": 1.1, "mul": 1.19}],
  Fellwisp: ['hop', {"cd": 1.4, "dur": 0.44, "mul": 3.3, "land": 5, "col": "#e57272"}],
  Fellstalker: ['charge', {"cd": 1.8, "dur": 0.51, "mul": 3.8}],
  Fellsentry: ['orbit', {"range": 115, "spin": 2.5, "cd": 1.3, "n": 1, "spread": 0.4, "spd": 256, "col": "#e57272"}]
};

for (const k in K13CSPECS) {
  const [a, c] = K13CSPECS[k];
  ENEMY_BEHAVIOR_HANDLERS['k13c' + k] = function(game, e, dt){ FWF_ARCH[a](game, e, dt, c); };
}
