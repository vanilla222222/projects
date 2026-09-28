'use strict';

const K5DSPECS = {
  Astrolabestalker: ['turret', {"cd": 2.6, "n": 7, "spread": 2.3, "spd": 204, "rot": 0, "col": "#e5728b"}],
  Cometwisp: ['kite', {"keep": 292, "cd": 1.7, "n": 3, "spread": 0.35, "spd": 269, "pierce": 1, "col": "#e5728b"}],
  Quasarshard: ['hop', {"cd": 1.5, "dur": 0.48, "mul": 3.6, "land": 3, "col": "#e5728b"}],
  Brassaegis: ['kite', {"keep": 274, "cd": 2.4, "n": 3, "spread": 0.35, "spd": 307, "pierce": 0, "col": "#e5728b"}],
  Meteortusk: ['wander', {"freq": 9.2, "amp": 1.7, "mul": 1.24}],
  Opticturret: ['wander', {"freq": 6.5, "amp": 1.1, "mul": 1.15}],
  Starhopper: ['slam', {"r": 96, "cd": 2.1, "ring": 2, "mul": 0.53, "col": "#e5728b"}],
  Gravslinger: ['wander', {"freq": 6.2, "amp": 1.6, "mul": 1.23}],
  Novamortar: ['hop', {"cd": 1.0, "dur": 0.52, "mul": 3.3, "land": 3, "col": "#e5728b"}],
  Nebulaweaver: ['hop', {"cd": 1.2, "dur": 0.4, "mul": 3.8, "land": 0, "col": "#e5728b"}],
  Astrariumwatcher: ['turret', {"cd": 1.3, "n": 4, "spread": 2.4, "spd": 226, "rot": 0.9, "col": "#e5728b"}],
  Ringcircler: ['blink', {"cd": 2.0, "range": 108, "n": 3, "col": "#e5728b"}],
  Gravityborer: ['phase', {"freq": 1.9, "mul": 1.7, "n": 3, "col": "#e5728b"}],
  Cosmicmites: ['kite', {"keep": 223, "cd": 2.1, "n": 1, "spread": 0.35, "spd": 259, "pierce": 0, "col": "#e5728b"}],
  Nebulacluster: ['summon', {"max": 3, "cd": 3.9, "spawn": "astrolabestalker"}],
  Astralcaller: ['wander', {"freq": 5.4, "amp": 2.3, "mul": 1.28}],
  Glassmender: ['blink', {"cd": 1.8, "range": 141, "n": 2, "col": "#e5728b"}],
  Astrolabewarden: ['summon', {"max": 3, "cd": 4.4, "spawn": "astrolabestalker"}],
  Precisionmarksman: ['aura', {"r": 150, "cd": 2.5, "n": 5, "col": "#e5728b", "slam": 0, "mul": 0.6}],
  Voidblink: ['phase', {"freq": 1.9, "mul": 1.5, "n": 3, "col": "#e5728b"}],
  Eclipsecomet: ['turret', {"cd": 2.2, "n": 1, "spread": 1.8, "spd": 213, "rot": 0, "col": "#e5728b"}],
  Gravitybrute: ['wander', {"freq": 3.5, "amp": 1.2, "mul": 1.29}],
  Starstreak: ['slam', {"r": 90, "cd": 2.6, "ring": 3, "mul": 0.6, "col": "#e5728b"}],
  Prismslinger: ['orbit', {"range": 151, "spin": 1.6, "cd": 1.6, "n": 3, "spread": 0.4, "spd": 274, "col": "#e5728b"}],
  Fluxshard: ['blink', {"cd": 2.4, "range": 107, "n": 4, "col": "#e5728b"}],
  Astralmoth: ['orbit', {"range": 173, "spin": 1.5, "cd": 1.2, "n": 3, "spread": 0.4, "spd": 278, "col": "#e5728b"}],
  Brassjuggernaut: ['hop', {"cd": 1.1, "dur": 0.48, "mul": 3.7, "land": 4, "col": "#e5728b"}],
  Cometmortar: ['kite', {"keep": 298, "cd": 2.0, "n": 1, "spread": 0.35, "spd": 349, "pierce": 1, "col": "#e5728b"}],
  Duskborer: ['charge', {"cd": 1.5, "dur": 0.58, "mul": 3.7}],
  Mooncircler: ['turret', {"cd": 1.4, "n": 7, "spread": 2.6, "spd": 202, "rot": 0, "col": "#e5728b"}],
  Opticsentinel: ['kite', {"keep": 205, "cd": 2.4, "n": 3, "spread": 0.35, "spd": 286, "pierce": 1, "col": "#e5728b"}],
  Riftblink: ['orbit', {"range": 151, "spin": 1.4, "cd": 2.0, "n": 3, "spread": 0.4, "spd": 272, "col": "#e5728b"}],
  Astralbulwark: ['phase', {"freq": 1.5, "mul": 1.6, "n": 3, "col": "#e5728b"}],
  Grim5dcrawler: ['wander', {"freq": 5.7, "amp": 1.2, "mul": 1.28}],
  Grim5dwarden: ['hop', {"cd": 1.8, "dur": 0.44, "mul": 3.1, "land": 2, "col": "#e5728b"}],
  Grim5dlurker: ['charge', {"cd": 2.6, "dur": 0.64, "mul": 3.8}],
  Grim5dhurler: ['orbit', {"range": 177, "spin": 1.3, "cd": 1.2, "n": 2, "spread": 0.4, "spd": 272, "col": "#e5728b"}],
  Grim5dbrute: ['turret', {"cd": 2.5, "n": 6, "spread": 1.2, "spd": 198, "rot": 0, "col": "#e5728b"}],
  Grim5dwisp: ['kite', {"keep": 256, "cd": 2.4, "n": 3, "spread": 0.35, "spd": 297, "pierce": 0, "col": "#e5728b"}],
  Grim5dstalker: ['slam', {"r": 96, "cd": 3.2, "ring": 3, "mul": 0.62, "col": "#e5728b"}],
  Grim5dsentry: ['blink', {"cd": 1.6, "range": 124, "n": 3, "col": "#e5728b"}],
  Fell5dcrawler: ['summon', {"max": 3, "cd": 4.6, "spawn": "astrolabestalker"}],
  Fell5dwarden: ['mine', {"cd": 1.9, "fuse": 2.0, "r": 58, "mul": 0.88}]
};

for (const k in K5DSPECS) {
  const [a, c] = K5DSPECS[k];
  ENEMY_BEHAVIOR_HANDLERS['k5d' + k] = function(game, e, dt){ FWF_ARCH[a](game, e, dt, c); };
}
