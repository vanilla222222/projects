'use strict';

const K6CSPECS = {
  Mainsrat: ['orbit', {"range": 131, "spin": 1.5, "cd": 1.0, "n": 1, "spread": 0.4, "spd": 226, "col": "#9472e5"}],
  Miasmaflit: ['slam', {"r": 98, "cd": 2.8, "ring": 4, "mul": 0.49, "col": "#9472e5"}],
  Sourgaspod: ['orbit', {"range": 199, "spin": 2.2, "cd": 2.1, "n": 3, "spread": 0.4, "spd": 277, "col": "#9472e5"}],
  Slagplate: ['charge', {"cd": 2.1, "dur": 0.62, "mul": 4.4}],
  Effluenthog: ['aura', {"r": 152, "cd": 2.2, "n": 5, "col": "#9472e5", "slam": 0, "mul": 0.6}],
  Runoffvalve: ['aura', {"r": 125, "cd": 2.3, "n": 4, "col": "#9472e5", "slam": 0, "mul": 0.6}],
  Conduitleaper: ['kite', {"keep": 257, "cd": 2.1, "n": 2, "spread": 0.35, "spd": 253, "pierce": 0, "col": "#9472e5"}],
  Acidspitter: ['charge', {"cd": 1.9, "dur": 0.52, "mul": 4.1}],
  Slurrymortar: ['phase', {"freq": 1.4, "mul": 1.7, "n": 2, "col": "#9472e5"}],
  Drainserpent: ['orbit', {"range": 138, "spin": 1.6, "cd": 1.3, "n": 2, "spread": 0.4, "spd": 278, "col": "#9472e5"}],
  Sluicewatcher: ['slam', {"r": 95, "cd": 2.3, "ring": 0, "mul": 0.51, "col": "#9472e5"}],
  Toxinswirl: ['wander', {"freq": 4.5, "amp": 1.3, "mul": 1.11}],
  Muckdriller: ['aura', {"r": 154, "cd": 2.1, "n": 3, "col": "#9472e5", "slam": 0, "mul": 0.6}],
  Drainmites: ['aura', {"r": 151, "cd": 1.9, "n": 4, "col": "#9472e5", "slam": 0, "mul": 0.6}],
  Tarsack: ['phase', {"freq": 2.1, "mul": 1.5, "n": 3, "col": "#9472e5"}],
  Broodtender: ['orbit', {"range": 162, "spin": 1.3, "cd": 1.2, "n": 3, "spread": 0.4, "spd": 242, "col": "#9472e5"}],
  Biofilmmender: ['slam', {"r": 90, "cd": 2.2, "ring": 8, "mul": 0.45, "col": "#9472e5"}],
  Sluicewarden: ['wander', {"freq": 6.0, "amp": 1.9, "mul": 1.12}],
  Pipelinemarksman: ['mine', {"cd": 1.6, "fuse": 2.0, "r": 62, "mul": 0.64}],
  Backwashblink: ['turret', {"cd": 1.9, "n": 3, "spread": 1.3, "spd": 237, "rot": 0.8, "col": "#9472e5"}],
  Sumpstalker: ['turret', {"cd": 2.2, "n": 2, "spread": 0.9, "spd": 251, "rot": 0, "col": "#9472e5"}],
  Sludgebrute: ['wander', {"freq": 5.3, "amp": 1.7, "mul": 1.18}],
  Toxinskitter: ['charge', {"cd": 1.5, "dur": 0.45, "mul": 3.7}],
  Bilespitter: ['charge', {"cd": 1.6, "dur": 0.64, "mul": 4.0}],
  Methanedrone: ['phase', {"freq": 1.4, "mul": 1.7, "n": 3, "col": "#9472e5"}],
  Drainmoth: ['turret', {"cd": 1.8, "n": 3, "spread": 2.3, "spd": 218, "rot": 0.8, "col": "#9472e5"}],
  Pistonram: ['blink', {"cd": 1.9, "range": 162, "n": 4, "col": "#9472e5"}],
  Scourmortar: ['orbit', {"range": 145, "spin": -1.0, "cd": 1.0, "n": 2, "spread": 0.4, "spd": 241, "col": "#9472e5"}],
  Greaseborer: ['orbit', {"range": 195, "spin": 2.4, "cd": 1.6, "n": 1, "spread": 0.4, "spd": 230, "col": "#9472e5"}],
  Effluenteddy: ['aura', {"r": 120, "cd": 2.4, "n": 3, "col": "#9472e5", "slam": 0, "mul": 0.6}],
  Outfallwatcher: ['wander', {"freq": 7.1, "amp": 1.4, "mul": 1.18}],
  Siphonshade: ['turret', {"cd": 1.8, "n": 2, "spread": 1.6, "spd": 238, "rot": 0, "col": "#9472e5"}],
  Ironbulk: ['kite', {"keep": 298, "cd": 1.7, "n": 1, "spread": 0.35, "spd": 346, "pierce": 1, "col": "#9472e5"}],
  Grim6ccrawler: ['wander', {"freq": 7.8, "amp": 1.7, "mul": 1.17}],
  Grim6cwarden: ['hop', {"cd": 0.8, "dur": 0.32, "mul": 3.3, "land": 2, "col": "#9472e5"}],
  Grim6clurker: ['charge', {"cd": 1.6, "dur": 0.77, "mul": 4.4}],
  Grim6churler: ['orbit', {"range": 173, "spin": 2.1, "cd": 1.9, "n": 2, "spread": 0.4, "spd": 273, "col": "#9472e5"}],
  Grim6cbrute: ['turret', {"cd": 1.6, "n": 2, "spread": 2.4, "spd": 224, "rot": 1.4, "col": "#9472e5"}],
  Grim6cwisp: ['kite', {"keep": 245, "cd": 1.8, "n": 1, "spread": 0.35, "spd": 309, "pierce": 0, "col": "#9472e5"}],
  Grim6cstalker: ['slam', {"r": 97, "cd": 2.7, "ring": 6, "mul": 0.56, "col": "#9472e5"}],
  Grim6csentry: ['blink', {"cd": 2.4, "range": 168, "n": 4, "col": "#9472e5"}],
  Fell6ccrawler: ['summon', {"max": 2, "cd": 4.0, "spawn": "mainsrat"}],
  Fell6cwarden: ['mine', {"cd": 1.0, "fuse": 1.9, "r": 61, "mul": 0.75}]
};

for (const k in K6CSPECS) {
  const [a, c] = K6CSPECS[k];
  ENEMY_BEHAVIOR_HANDLERS['k6c' + k] = function(game, e, dt){ FWF_ARCH[a](game, e, dt, c); };
}
