'use strict';

const K4DSPECS = {
  Lensdrifter: ['phase', {"freq": 1.2, "mul": 1.5, "n": 3, "col": "#e5cc72"}],
  Dustmote: ['blink', {"cd": 2.5, "range": 121, "n": 2, "col": "#e5cc72"}],
  Starshard: ['slam', {"r": 108, "cd": 2.2, "ring": 8, "mul": 0.45, "col": "#e5cc72"}],
  Brassbulwark: ['hop', {"cd": 1.0, "dur": 0.38, "mul": 3.5, "land": 1, "col": "#e5cc72"}],
  Comettusk: ['wander', {"freq": 9.7, "amp": 1.5, "mul": 1.3}],
  Spyglassturret: ['turret', {"cd": 1.9, "n": 8, "spread": 1.6, "spd": 217, "rot": 0, "col": "#e5cc72"}],
  Astralhopper: ['hop', {"cd": 1.4, "dur": 0.39, "mul": 3.6, "land": 4, "col": "#e5cc72"}],
  Novaslinger: ['phase', {"freq": 1.9, "mul": 1.6, "n": 2, "col": "#e5cc72"}],
  Gravitymortar: ['kite', {"keep": 201, "cd": 2.2, "n": 3, "spread": 0.35, "spd": 306, "pierce": 1, "col": "#e5cc72"}],
  Constellationweaver: ['kite', {"keep": 267, "cd": 1.7, "n": 2, "spread": 0.35, "spd": 300, "pierce": 0, "col": "#e5cc72"}],
  Domewatcher: ['wander', {"freq": 4.4, "amp": 1.1, "mul": 1.13}],
  Planetcircler: ['blink', {"cd": 2.4, "range": 122, "n": 3, "col": "#e5cc72"}],
  Dustborer: ['orbit', {"range": 128, "spin": 1.7, "cd": 1.2, "n": 2, "spread": 0.4, "spd": 227, "col": "#e5cc72"}],
  Starmites: ['wander', {"freq": 3.4, "amp": 2.3, "mul": 1.27}],
  Dustcluster: ['mine', {"cd": 1.9, "fuse": 1.7, "r": 61, "mul": 0.74}],
  Constellationcaller: ['blink', {"cd": 2.8, "range": 148, "n": 3, "col": "#e5cc72"}],
  Lensmender: ['kite', {"keep": 225, "cd": 2.1, "n": 2, "spread": 0.35, "spd": 282, "pierce": 1, "col": "#e5cc72"}],
  Brasswarden: ['blink', {"cd": 2.7, "range": 165, "n": 4, "col": "#e5cc72"}],
  Telescopemarksman: ['phase', {"freq": 2.0, "mul": 1.4, "n": 3, "col": "#e5cc72"}],
  Stardriftblink: ['blink', {"cd": 2.1, "range": 139, "n": 4, "col": "#e5cc72"}],
  Shadowcomet: ['wander', {"freq": 9.6, "amp": 1.0, "mul": 1.16}],
  Duststrider: ['blink', {"cd": 2.6, "range": 116, "n": 4, "col": "#e5cc72"}],
  Cometsprinter: ['blink', {"cd": 1.7, "range": 155, "n": 4, "col": "#e5cc72"}],
  Glassslinger: ['wander', {"freq": 5.2, "amp": 1.9, "mul": 1.0}],
  Meteorspark: ['kite', {"keep": 211, "cd": 2.2, "n": 3, "spread": 0.35, "spd": 330, "pierce": 0, "col": "#e5cc72"}],
  Dustmoth: ['kite', {"keep": 217, "cd": 2.5, "n": 1, "spread": 0.35, "spd": 294, "pierce": 1, "col": "#e5cc72"}],
  Brassram: ['turret', {"cd": 1.5, "n": 1, "spread": 0.7, "spd": 235, "rot": 1.2, "col": "#e5cc72"}],
  Stardustmortar: ['wander', {"freq": 9.6, "amp": 1.1, "mul": 1.05}],
  Lensborer: ['slam', {"r": 121, "cd": 2.5, "ring": 2, "mul": 0.65, "col": "#e5cc72"}],
  Satellitecircler: ['mine', {"cd": 1.3, "fuse": 1.3, "r": 56, "mul": 0.65}],
  Telescopesentinel: ['blink', {"cd": 2.1, "range": 157, "n": 2, "col": "#e5cc72"}],
  Novablink: ['turret', {"cd": 1.4, "n": 5, "spread": 0.8, "spd": 254, "rot": 0, "col": "#e5cc72"}],
  Domebulwark: ['orbit', {"range": 165, "spin": 2.1, "cd": 1.0, "n": 1, "spread": 0.4, "spd": 224, "col": "#e5cc72"}],
  Grim4dcrawler: ['wander', {"freq": 4.5, "amp": 1.7, "mul": 1.02}],
  Grim4dwarden: ['hop', {"cd": 1.5, "dur": 0.37, "mul": 3.1, "land": 2, "col": "#e5cc72"}],
  Grim4dlurker: ['charge', {"cd": 2.0, "dur": 0.44, "mul": 4.5}],
  Grim4dhurler: ['orbit', {"range": 115, "spin": 2.4, "cd": 1.6, "n": 2, "spread": 0.4, "spd": 251, "col": "#e5cc72"}],
  Grim4dbrute: ['turret', {"cd": 2.3, "n": 2, "spread": 1.1, "spd": 227, "rot": 0, "col": "#e5cc72"}],
  Grim4dwisp: ['kite', {"keep": 239, "cd": 2.3, "n": 1, "spread": 0.35, "spd": 251, "pierce": 0, "col": "#e5cc72"}],
  Grim4dstalker: ['slam', {"r": 91, "cd": 2.1, "ring": 3, "mul": 0.54, "col": "#e5cc72"}],
  Grim4dsentry: ['blink', {"cd": 2.1, "range": 128, "n": 2, "col": "#e5cc72"}],
  Fell4dcrawler: ['summon', {"max": 3, "cd": 3.8, "spawn": "lensdrifter"}],
  Fell4dwarden: ['mine', {"cd": 1.6, "fuse": 2.1, "r": 74, "mul": 0.79}]
};

for (const k in K4DSPECS) {
  const [a, c] = K4DSPECS[k];
  ENEMY_BEHAVIOR_HANDLERS['k4d' + k] = function(game, e, dt){ FWF_ARCH[a](game, e, dt, c); };
}
