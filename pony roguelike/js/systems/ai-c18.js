'use strict';

const C18SPECS = {
  Smokerspire: ['aura', {"r": 118, "cd": 2.3, "n": 3, "col": "#8070e0", "slam": 0, "mul": 0.6}],
  Mineralvent: ['aura', {"r": 126, "cd": 2.3, "n": 4, "col": "#8070e0", "slam": 0, "mul": 0.6}],
  Weightbeast: ['slam', {"r": 120, "cd": 2.8, "ring": 7, "mul": 0.47, "col": "#8070e0"}],
  Ventgrinder: ['slam', {"r": 89, "cd": 3.0, "ring": 0, "mul": 0.46, "col": "#8070e0"}],
  Scaldingpike: ['hop', {"cd": 1.3, "dur": 0.4, "mul": 3.3, "land": 1, "col": "#8070e0"}],
  Emberfish: ['hop', {"cd": 1.3, "dur": 0.52, "mul": 3.5, "land": 1, "col": "#8070e0"}],
  Mineralarcher: ['kite', {"keep": 235, "cd": 1.8, "n": 1, "spread": 0.35, "spd": 336, "pierce": 0, "col": "#8070e0"}],
  Ventcircler: ['orbit', {"range": 129, "spin": -1.8, "cd": 2.0, "n": 3, "spread": 0.4, "spd": 247, "col": "#8070e0"}],
  Emberpouncer: ['hop', {"cd": 1.3, "dur": 0.4, "mul": 3.4, "land": 1, "col": "#8070e0"}],
  Scaldedstrafer: ['orbit', {"range": 189, "spin": 2.1, "cd": 1.8, "n": 2, "spread": 0.4, "spd": 271, "col": "#8070e0"}],
  Splitvent: ['kite', {"keep": 282, "cd": 1.6, "n": 2, "spread": 0.35, "spd": 298, "pierce": 1, "col": "#8070e0"}],
  Ashswarm: ['wander', {"freq": 6.3, "amp": 1.6, "mul": 1.24}],
  Ventambush: ['phase', {"freq": 1.4, "mul": 1.4, "n": 3, "col": "#8070e0"}],
  Moltenlobber: ['mine', {"cd": 1.0, "fuse": 1.5, "r": 69, "mul": 0.66}],
  Ventweaver: ['wander', {"freq": 10.0, "amp": 1.4, "mul": 1.01}],
  Magmaburrower: ['blink', {"cd": 1.8, "range": 105, "n": 2, "col": "#8070e0"}],
  Mendingvent: ['aura', {"r": 119, "cd": 2.4, "n": 4, "col": "#8070e0", "slam": 0, "mul": 0.6}],
  Ventsummoner: ['summon', {"max": 3, "cd": 3.7, "spawn": "ashswarm"}],
  Crushwhip: ['slam', {"r": 102, "cd": 3.0, "ring": 0, "mul": 0.62, "col": "#8070e0"}],
  Blinkvent: ['blink', {"cd": 2.0, "range": 107, "n": 3, "col": "#8070e0"}],
  Chargingmagma: ['charge', {"cd": 2.0, "dur": 0.52, "mul": 4.4}],
  Pressuresniper: ['kite', {"keep": 260, "cd": 2.1, "n": 1, "spread": 0.35, "spd": 262, "pierce": 1, "col": "#8070e0"}],
  Abyssalstalker: ['wander', {"freq": 8.2, "amp": 1.6, "mul": 1.26}],
  Abyssaldrifter: ['hop', {"cd": 1.4, "dur": 0.41, "mul": 3.3, "land": 0, "col": "#8070e0"}],
  Abyssalbulb: ['charge', {"cd": 2.3, "dur": 0.4, "mul": 4.2}],
  Abyssalleech: ['orbit', {"range": 127, "spin": -1.9, "cd": 1.5, "n": 1, "spread": 0.4, "spd": 273, "col": "#8070e0"}],
  Abyssalhulk: ['turret', {"cd": 1.9, "n": 3, "spread": 1.1, "spd": 223, "rot": 0.7, "col": "#8070e0"}],
  Abyssalshade: ['kite', {"keep": 293, "cd": 1.3, "n": 3, "spread": 0.35, "spd": 323, "pierce": 0, "col": "#8070e0"}],
  Abyssalspitter: ['slam', {"r": 118, "cd": 3.0, "ring": 3, "mul": 0.65, "col": "#8070e0"}],
  Lanternmaw: ['blink', {"cd": 2.5, "range": 167, "n": 4, "col": "#8070e0"}],
  Lanternstalker: ['summon', {"max": 3, "cd": 4.3, "spawn": "ashswarm"}],
  Lanterndrifter: ['mine', {"cd": 1.5, "fuse": 1.2, "r": 63, "mul": 0.77}],
  Lanternbulb: ['aura', {"r": 120, "cd": 1.9, "n": 3, "col": "#8070e0", "slam": 0, "mul": 0.6}],
  Lanternleech: ['phase', {"freq": 1.3, "mul": 1.5, "n": 3, "col": "#8070e0"}],
  Lanternhulk: ['wander', {"freq": 6.0, "amp": 1.9, "mul": 1.22}],
  Lanternshade: ['hop', {"cd": 1.7, "dur": 0.39, "mul": 3.5, "land": 1, "col": "#8070e0"}],
  Lanternspitter: ['charge', {"cd": 2.4, "dur": 0.68, "mul": 4.3}],
  Pressuremaw: ['orbit', {"range": 188, "spin": -1.4, "cd": 2.1, "n": 2, "spread": 0.4, "spd": 235, "col": "#8070e0"}],
  Pressurestalker: ['turret', {"cd": 1.8, "n": 3, "spread": 1.8, "spd": 217, "rot": 0, "col": "#8070e0"}],
  Pressuredrifter: ['kite', {"keep": 264, "cd": 2.5, "n": 2, "spread": 0.35, "spd": 300, "pierce": 1, "col": "#8070e0"}]
};

for (const k in C18SPECS) {
  const [a, c] = C18SPECS[k];
  ENEMY_BEHAVIOR_HANDLERS['c18' + k] = function(game, e, dt){ FWF_ARCH[a](game, e, dt, c); };
}
