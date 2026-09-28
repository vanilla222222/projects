'use strict';

const C15SPECS = {
  Boneyardbarnacle: ['turret', {"cd": 2.2, "n": 5, "spread": 1.2, "spd": 190, "col": "#7ad0c8"}],
  Wreckbarnacle: ['turret', {"cd": 1.4, "n": 1, "spd": 250, "col": "#7ad0c8"}],
  Ossuaryshell: ['turret', {"cd": 3, "n": 8, "spread": 6.28, "spd": 170, "rot": 0.8, "col": "#7ad0c8"}],
  Reefdartling: ['hop', {"cd": 0.9, "dur": 0.3, "mul": 3.4}],
  Finflicker: ['blink', {"cd": 2, "n": 2, "col": "#7ad0c8"}],
  Coralspine: ['hop', {"cd": 1.5, "land": 6, "col": "#e08a8a"}],
  Echoray: ['kite', {"keep": 240, "cd": 1.7, "n": 3, "spread": 0.5, "spd": 250, "col": "#7ad0c8"}],
  Wreckcaller: ['summon', {"max": 3, "cd": 3.5, "spawn": "wreckswarm"}],
  Boneyardhound: ['charge', {"cd": 2, "mul": 4}],
  Reefrunner: ['wander', {"freq": 5, "amp": 1.4, "mul": 1.3}],
  Bonebowman: ['kite', {"keep": 260, "cd": 1.5, "spd": 330, "pierce": 1, "col": "#e0e0c0"}],
  Driftorbiter: ['orbit', {"spin": 2, "cd": 1.4, "n": 1, "spd": 230, "col": "#7ad0c8"}],
  Wreckpouncer: ['hop', {"cd": 1.6, "dur": 0.5, "mul": 3.6}],
  Coralstrafer: ['orbit', {"range": 120, "spin": -2.4, "cd": 1, "n": 1, "spd": 240, "col": "#e08a8a"}],
  Boneforktongue: ['kite', {"keep": 200, "cd": 2, "n": 2, "spread": 0.25, "spd": 270, "col": "#e0e0c0"}],
  Wreckswarm: ['wander', {"freq": 10, "amp": 2, "mul": 1.2}],
  Wreckambush: ['phase', {"freq": 1.3, "mul": 1.6, "n": 2, "col": "#7ad0c8"}],
  Shelllobber: ['mine', {"cd": 1.8, "fuse": 1.4, "r": 60, "mul": 0.6}],
  Tidalweaver: ['wander', {"freq": 3, "amp": 2.2}],
  Sandcrabburrower: ['blink', {"cd": 2.6, "range": 100, "n": 4, "col": "#e0c890"}],
  Shellshielder: ['aura', {"r": 120, "cd": 2.2, "n": 4, "col": "#7ad0c8", "mul": 0.55}],
  Hitandrunreef: ['blink', {"cd": 1.6, "range": 170, "n": 3, "col": "#7ad0c8"}],
  Farreef: ['kite', {"keep": 300, "cd": 2.4, "spd": 380, "pierce": 2, "col": "#c0f0f0"}],
  Wreckturret: ['turret', {"cd": 1.1, "n": 3, "spread": 0.4, "spd": 240, "col": "#7ad0c8"}],
  Reefdart: ['orbit', {"range": 160, "spin": 1.6, "cd": 1.2, "n": 1, "spd": 260, "col": "#7ad0c8"}],
  Anchorcrab: ['slam', {"r": 95, "cd": 2.6, "ring": 6, "col": "#7ad0c8"}],
  Brinehound: ['charge', {"cd": 1.5, "dur": 0.5, "mul": 4.2}],
  Ribcagelurker: ['phase', {"freq": 1.7, "n": 3, "col": "#e0e0c0"}],
  Kelpstrangler: ['wander', {"freq": 4, "amp": 1.8}],
  Pearlspitter: ['kite', {"keep": 230, "cd": 1.4, "spd": 300, "col": "#f0f0ff"}],
  Wrecksentinel: ['turret', {"cd": 2, "n": 9, "spread": 2.6, "spd": 200, "col": "#7ad0c8"}],
  Tidepoolmite: ['wander', {"freq": 11, "amp": 2.2, "mul": 1.3}],
  Skullcrabber: ['hop', {"cd": 1.3, "land": 5, "col": "#e0e0c0"}],
  Harpoongull: ['orbit', {"range": 200, "spin": 2.4, "cd": 1.6, "n": 2, "spread": 0.3, "spd": 280, "col": "#c0d8f0"}],
  Sunkenbell: ['aura', {"r": 140, "slow": true, "cd": 2.2, "n": 5, "col": "#a0c8e0"}],
  Urchinmine: ['mine', {"cd": 1, "fuse": 1.8, "r": 70, "mul": 0.8}],
  Barnaclebrood: ['summon', {"max": 4, "cd": 3, "spawn": "wreckswarm"}],
  Driftwoodgolem: ['slam', {"r": 110, "cd": 2.2, "mul": 0.5, "ring": 8, "col": "#c0a070"}],
  Gillwraith: ['blink', {"cd": 2.2, "n": 3, "col": "#90d8c0"}],
  Tidalmaster: ['charge', {"cd": 1.8, "dur": 0.7, "mul": 4}]
};

for (const k in C15SPECS) {
  const [a, c] = C15SPECS[k];
  ENEMY_BEHAVIOR_HANDLERS['c15' + k] = function(game, e, dt){ FWF_ARCH[a](game, e, dt, c); };
}
