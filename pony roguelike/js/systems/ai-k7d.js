'use strict';

const K7DSPECS = {
  Zenithhound: ['turret', {"cd": 2.4, "n": 7, "spread": 2.6, "spd": 198, "rot": 1.1, "col": "#728ae5"}],
  Starcog: ['mine', {"cd": 1.5, "fuse": 2.0, "r": 56, "mul": 0.64}],
  Novagear: ['blink', {"cd": 2.2, "range": 117, "n": 3, "col": "#728ae5"}],
  Ironplate: ['orbit', {"range": 124, "spin": 2.2, "cd": 1.1, "n": 1, "spread": 0.4, "spd": 246, "col": "#728ae5"}],
  Zenithram: ['hop', {"cd": 1.5, "dur": 0.44, "mul": 3.8, "land": 5, "col": "#728ae5"}],
  Apexturret: ['hop', {"cd": 1.4, "dur": 0.43, "mul": 3.5, "land": 2, "col": "#728ae5"}],
  Springcoil: ['slam', {"r": 114, "cd": 2.6, "ring": 8, "mul": 0.47, "col": "#728ae5"}],
  Zenithslinger: ['wander', {"freq": 10.5, "amp": 2.4, "mul": 1.1}],
  Heavygyro: ['summon', {"max": 3, "cd": 3.2, "spawn": "zenithhound"}],
  Braidring: ['aura', {"r": 123, "cd": 2.0, "n": 4, "col": "#728ae5", "slam": 0, "mul": 0.6}],
  Apexwatcher: ['mine', {"cd": 1.1, "fuse": 2.2, "r": 62, "mul": 0.83}],
  Grandepicycler: ['hop', {"cd": 1.1, "dur": 0.53, "mul": 3.4, "land": 2, "col": "#728ae5"}],
  Ironworm: ['slam', {"r": 118, "cd": 2.6, "ring": 7, "mul": 0.52, "col": "#728ae5"}],
  Meridianmites: ['blink', {"cd": 2.0, "range": 136, "n": 2, "col": "#728ae5"}],
  Geartriad: ['wander', {"freq": 7.8, "amp": 1.1, "mul": 1.23}],
  Zenithcaller: ['orbit', {"range": 122, "spin": 1.8, "cd": 1.0, "n": 1, "spread": 0.4, "spd": 246, "col": "#728ae5"}],
  Ringmender: ['slam', {"r": 106, "cd": 3.1, "ring": 3, "mul": 0.47, "col": "#728ae5"}],
  Apexwarden: ['aura', {"r": 149, "cd": 2.2, "n": 5, "col": "#728ae5", "slam": 0, "mul": 0.6}],
  Apexsniper: ['turret', {"cd": 1.0, "n": 3, "spread": 1.6, "spd": 236, "rot": 0, "col": "#728ae5"}],
  Ringblink: ['orbit', {"range": 119, "spin": -2.2, "cd": 1.9, "n": 3, "spread": 0.4, "spd": 243, "col": "#728ae5"}],
  Nightgear: ['aura', {"r": 141, "cd": 1.8, "n": 5, "col": "#728ae5", "slam": 0, "mul": 0.6}],
  Titanhound: ['aura', {"r": 122, "cd": 1.9, "n": 4, "col": "#728ae5", "slam": 0, "mul": 0.6}],
  Cometrunner: ['slam', {"r": 91, "cd": 2.4, "ring": 2, "mul": 0.55, "col": "#728ae5"}],
  Apexslinger: ['orbit', {"range": 128, "spin": 1.7, "cd": 1.4, "n": 1, "spread": 0.4, "spd": 248, "col": "#728ae5"}],
  Shrapnelgear: ['wander', {"freq": 8.5, "amp": 1.8, "mul": 1.19}],
  Duskcog: ['slam', {"r": 106, "cd": 2.1, "ring": 1, "mul": 0.6, "col": "#728ae5"}],
  Ironram: ['kite', {"keep": 204, "cd": 1.9, "n": 2, "spread": 0.35, "spd": 252, "pierce": 1, "col": "#728ae5"}],
  Apexmortar: ['mine', {"cd": 1.1, "fuse": 1.5, "r": 64, "mul": 0.69}],
  Irontunneler: ['blink', {"cd": 1.7, "range": 142, "n": 4, "col": "#728ae5"}],
  Grandsatellite: ['slam', {"r": 121, "cd": 3.0, "ring": 7, "mul": 0.56, "col": "#728ae5"}],
  Zenithsentinel: ['summon', {"max": 3, "cd": 4.5, "spawn": "zenithhound"}],
  Apexblink: ['charge', {"cd": 2.3, "dur": 0.49, "mul": 3.7}],
  Ironbulwark: ['phase', {"freq": 2.0, "mul": 1.6, "n": 3, "col": "#728ae5"}],
  Grim7dcrawler: ['wander', {"freq": 6.2, "amp": 1.8, "mul": 1.24}],
  Grim7dwarden: ['hop', {"cd": 1.2, "dur": 0.5, "mul": 3.8, "land": 0, "col": "#728ae5"}],
  Grim7dlurker: ['charge', {"cd": 2.1, "dur": 0.48, "mul": 4.1}],
  Grim7dhurler: ['orbit', {"range": 192, "spin": -1.5, "cd": 1.3, "n": 1, "spread": 0.4, "spd": 253, "col": "#728ae5"}],
  Grim7dbrute: ['turret', {"cd": 1.4, "n": 5, "spread": 0.6, "spd": 203, "rot": 0, "col": "#728ae5"}],
  Grim7dwisp: ['kite', {"keep": 255, "cd": 1.5, "n": 2, "spread": 0.35, "spd": 294, "pierce": 1, "col": "#728ae5"}],
  Grim7dstalker: ['slam', {"r": 121, "cd": 3.0, "ring": 0, "mul": 0.5, "col": "#728ae5"}],
  Grim7dsentry: ['blink', {"cd": 2.5, "range": 131, "n": 3, "col": "#728ae5"}],
  Fell7dcrawler: ['summon', {"max": 3, "cd": 4.2, "spawn": "zenithhound"}],
  Fell7dwarden: ['mine', {"cd": 1.2, "fuse": 1.6, "r": 56, "mul": 0.87}]
};

for (const k in K7DSPECS) {
  const [a, c] = K7DSPECS[k];
  ENEMY_BEHAVIOR_HANDLERS['k7d' + k] = function(game, e, dt){ FWF_ARCH[a](game, e, dt, c); };
}
