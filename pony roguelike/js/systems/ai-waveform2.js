'use strict';

const FWF_ARCH = {
  wander(game, e, dt, c){
    const p = game.player, v = seekVector(e, p.x, p.y);
    e.fwfT = (e.fwfT || 0) + dt;
    const w = Math.sin(e.fwfT * (c.freq || 3)) * (c.amp || 1);
    hlwStep(game, e, dt, v.x - v.y * w, v.y + v.x * w, c.mul || 1);
    hlwContact(game, e, v);
  },
  hop(game, e, dt, c){
    const p = game.player, v = seekVector(e, p.x, p.y);
    e.fwfCd = (e.fwfCd === undefined) ? Util.rand(0.3, 1) : e.fwfCd - dt;
    if (e.fwfHop > 0) { e.fwfHop -= dt; hlwStep(game, e, dt, e.fwfDX, e.fwfDY, c.mul || 3); hlwContact(game, e, v); if (e.fwfHop <= 0 && c.land) hlwArc(game, e, 0, c.land, Math.PI * 2, 150, { color: c.col }); return; }
    if (e.fwfCd <= 0) { e.fwfHop = c.dur || 0.35; e.fwfDX = v.x; e.fwfDY = v.y; e.fwfCd = c.cd || 1.4; }
  },
  charge(game, e, dt, c){
    const p = game.player, v = seekVector(e, p.x, p.y);
    e.fwfCd = (e.fwfCd === undefined) ? 1 : e.fwfCd - dt;
    if (e.fwfRun > 0) { e.fwfRun -= dt; const r = hlwStep(game, e, dt, e.fwfDX, e.fwfDY, c.mul || 3.5); hlwContact(game, e, v, 1); if (!r.movedX && !r.movedY) e.fwfRun = 0; return; }
    if (e.fwfWind > 0) { e.fwfWind -= dt; e.hitFlash = 0.05; if (e.fwfWind <= 0) { e.fwfRun = c.dur || 0.6; e.fwfDX = v.x; e.fwfDY = v.y; } return; }
    hlwStep(game, e, dt, v.x, v.y, 0.6);
    if (e.fwfCd <= 0) { e.fwfWind = 0.5; e.fwfCd = c.cd || 2.5; }
  },
  orbit(game, e, dt, c){
    const p = game.player, v = seekVector(e, p.x, p.y);
    e.fwfA = (e.fwfA === undefined) ? Util.rand(0, 6.28) : e.fwfA + dt * (c.spin || 1.5);
    const R = c.range || 150;
    hlwStep(game, e, dt, p.x + Math.cos(e.fwfA) * R - e.x, p.y + Math.sin(e.fwfA) * R - e.y, 1.6);
    e.fwfCd = (e.fwfCd === undefined) ? 1.5 : e.fwfCd - dt;
    if (e.fwfCd <= 0) { e.fwfCd = c.cd || 2; hlwArc(game, e, hlwAim(e, p), c.n || 1, c.spread || 0.3, c.spd || 200, { color: c.col }); }
  },
  turret(game, e, dt, c){
    const p = game.player;
    e.fwfCd = (e.fwfCd === undefined) ? Util.rand(0.5, 1.5) : e.fwfCd - dt;
    e.fwfRot = (e.fwfRot || 0) + dt * (c.rot || 0);
    if (e.fwfCd <= 0) {
      e.fwfCd = c.cd || 2; e.hitFlash = 0.1;
      const base = c.rot ? e.fwfRot : hlwAim(e, p);
      hlwArc(game, e, base, c.n || 5, c.spread || 1, c.spd || 200, { color: c.col });
    }
    if (c.move) { const v = seekVector(e, p.x, p.y); hlwStep(game, e, dt, v.x, v.y, c.move); }
  },
  kite(game, e, dt, c){
    const p = game.player, v = seekVector(e, p.x, p.y);
    const keep = c.keep || 220;
    hlwStep(game, e, dt, v.d < keep ? -v.x : v.x, v.d < keep ? -v.y : v.y, 0.8);
    e.fwfCd = (e.fwfCd === undefined) ? 1 : e.fwfCd - dt;
    if (e.fwfCd <= 0) { e.fwfCd = c.cd || 1.8; hlwArc(game, e, hlwAim(e, p), c.n || 1, c.spread || 0.25, c.spd || 260, { color: c.col, pierce: c.pierce || 0 }); }
  },
  slam(game, e, dt, c){
    const p = game.player, v = seekVector(e, p.x, p.y);
    hlwStep(game, e, dt, v.x, v.y, c.mul || 0.6);
    e.fwfCd = (e.fwfCd === undefined) ? 2 : e.fwfCd - dt;
    if (e.fwfCd <= 0 && v.d < (c.r || 110) + 40) { e.fwfCd = c.cd || 3; e.hitFlash = 0.2; hlwBlast(game, e, e.x, e.y, c.r || 110, 1); if (c.ring) hlwArc(game, e, 0, c.ring, Math.PI * 2, 170, { color: c.col }); }
    hlwContact(game, e, v);
  },
  blink(game, e, dt, c){
    const p = game.player, v = seekVector(e, p.x, p.y);
    e.fwfCd = (e.fwfCd === undefined) ? Util.rand(1, 2) : e.fwfCd - dt;
    if (e.fwfCd <= 0) {
      e.fwfCd = c.cd || 2.4;
      const a = Util.rand(0, 6.28), R = c.range || 130;
      const s = findNearestFloor(game.currentRoom, Math.floor((p.x + Math.cos(a) * R) / TILE), Math.floor((p.y + Math.sin(a) * R) / TILE));
      e.x = s.x; e.y = s.y; e.hitFlash = 0.2;
      hlwArc(game, e, hlwAim(e, p), c.n || 3, 0.5, 240, { color: c.col });
    }
    hlwStep(game, e, dt, v.x, v.y, 0.4);
    hlwContact(game, e, v);
  },
  summon(game, e, dt, c){
    const p = game.player, v = seekVector(e, p.x, p.y);
    if (v.d < 200) hlwStep(game, e, dt, -v.x, -v.y, 0.6);
    e.fwfN = e.fwfN || 0;
    e.fwfCd = (e.fwfCd === undefined) ? 2 : e.fwfCd - dt;
    if (e.fwfCd <= 0 && e.fwfN < (c.max || 3)) { e.fwfCd = c.cd || 4; e.fwfN++; e.hitFlash = 0.15; const a = Util.rand(0, 6.28); hlwSpawn(game, game.currentRoom, c.spawn || 'dithercloud', e.x + Math.cos(a) * 50, e.y + Math.sin(a) * 50); }
  },
  mine(game, e, dt, c){
    const p = game.player, v = seekVector(e, p.x, p.y);
    hlwStep(game, e, dt, v.x, v.y, c.mul || 0.7);
    const node = game.currentRoom;
    node.fwfMines = node.fwfMines || [];
    e.fwfCd = (e.fwfCd === undefined) ? 1 : e.fwfCd - dt;
    if (e.fwfCd <= 0) { e.fwfCd = c.cd || 2; node.fwfMines.push({ o: e, x: e.x, y: e.y, t: c.fuse || 1.5 }); }
    for (let i = node.fwfMines.length - 1; i >= 0; i--) {
      const m = node.fwfMines[i];
      if (m.o !== e) continue;
      m.t -= dt;
      if (m.t <= 0) { hlwBlast(game, e, m.x, m.y, c.r || 60, 0); node.fwfMines.splice(i, 1); }
    }
    hlwContact(game, e, v);
  },
  aura(game, e, dt, c){
    const p = game.player, v = seekVector(e, p.x, p.y);
    hlwStep(game, e, dt, v.x, v.y, c.mul || 0.7);
    e.fwfCd = (e.fwfCd === undefined) ? 1 : e.fwfCd - dt;
    if (c.slow && v.d < (c.r || 130)) p.freezeTimer = Math.max(p.freezeTimer || 0, 0.05);
    if (e.fwfCd <= 0) { e.fwfCd = c.cd || 2; if (v.d < (c.r || 130)) hlwArc(game, e, hlwAim(e, p), c.n || 3, 0.6, 230, { color: c.col }); }
    hlwContact(game, e, v);
  },
  phase(game, e, dt, c){
    const p = game.player, v = seekVector(e, p.x, p.y);
    e.fwfT = (e.fwfT || 0) + dt;
    const on = Math.sin(e.fwfT * (c.freq || 1.5)) > 0;
    e.shielded = !on;
    hlwStep(game, e, dt, v.x, v.y, on ? (c.mul || 1) : 0.4);
    if (on) hlwContact(game, e, v, 1);
    e.fwfCd = (e.fwfCd === undefined) ? 1.5 : e.fwfCd - dt;
    if (!on && e.fwfCd <= 0) { e.fwfCd = c.cd || 2; hlwArc(game, e, hlwAim(e, p), c.n || 3, 0.7, 220, { color: c.col }); }
  }
};

const FWF_SPECS = {
  Sinewalker: ['wander', { freq: 4, amp: 1.2 }],
  Squarehopper: ['hop', { cd: 1.1, land: 4, col: '#8a8ab0' }],
  Sawtoothcharger: ['charge', { cd: 2.2, mul: 4 }],
  Triangleorbiter: ['orbit', { spin: 1.8, n: 3, spread: 0.6, col: '#9a9ac0' }],
  Pulsewidthsentry: ['turret', { cd: 1.2, n: 3, spread: 0.3, spd: 240, col: '#aaaad0' }],
  Noisecrawler: ['wander', { freq: 9, amp: 2, mul: 1.2 }],
  Amplitudebrute: ['slam', { r: 120, cd: 3, ring: 8, col: '#7a7aa0' }],
  Phasecancel: ['phase', { freq: 1.2, n: 3, col: '#b0b0e0' }],
  Clipgolem: ['slam', { r: 100, cd: 2.4, mul: 0.5 }],
  Lowpassmender: ['kite', { keep: 240, cd: 2.6, n: 1, spd: 150, col: '#6a8ab0' }],
  Highpassmarksman: ['kite', { keep: 260, cd: 1.6, spd: 340, pierce: 1, col: '#c0c0f0' }],
  Bandpasswarden: ['orbit', { range: 110, spin: 1, n: 5, spread: 1.2, cd: 2.6, col: '#8080c0' }],
  Fadeshade: ['blink', { cd: 2.8, n: 2, col: '#707090' }],
  Decaybomber: ['mine', { cd: 1.6, fuse: 1.2, r: 55 }],
  Sustaindrone: ['orbit', { range: 190, spin: 0.9, cd: 1.2, n: 1, spd: 230, col: '#a0a0d0' }],
  Releaseleaper: ['hop', { cd: 1.8, dur: 0.5, mul: 3.5 }],
  Attackcharger: ['charge', { cd: 1.6, dur: 0.4, mul: 4.5 }],
  Gatekeeper: ['turret', { cd: 2.4, n: 7, spread: 3.1, spd: 190, rot: 0.6, col: '#8a8ab8' }],
  Compressorhulk: ['slam', { r: 90, cd: 2, mul: 0.45, ring: 6, col: '#606090' }],
  Limitbrood: ['summon', { max: 3, cd: 3.5, spawn: 'dithercloud' }],
  Delaymine: ['mine', { cd: 1, fuse: 2.2, r: 70, mul: 0.9 }],
  Reverbcaller: ['summon', { max: 2, cd: 5, spawn: 'noisecrawler' }],
  Feedbackloop: ['orbit', { range: 90, spin: 3, cd: 0.9, n: 1, spd: 260, col: '#c0a0e0' }],
  Flangerweaver: ['wander', { freq: 6, amp: 1.6, mul: 1.1 }],
  Choruscloner: ['summon', { max: 2, cd: 4, spawn: 'sinewalker' }],
  Vocodermarksman: ['kite', { keep: 230, cd: 2, n: 3, spread: 0.4, spd: 250, col: '#a0c0e0' }],
  Tremolosentry: ['turret', { cd: 0.7, n: 1, spd: 260, col: '#b0b0e0' }],
  Arpeggiodrone: ['orbit', { range: 170, spin: 2.2, cd: 0.8, n: 1, spd: 240, col: '#c0c0f0' }],
  Subharmonic: ['aura', { r: 150, slow: true, cd: 2.4, n: 6, col: '#5a5a90' }],
  Nyquistblinker: ['blink', { cd: 1.8, range: 160, n: 4, col: '#e0e0ff' }],
  Dithercloud: ['wander', { freq: 12, amp: 2.5, mul: 1.3 }],
  Aliasingstalker: ['phase', { freq: 2, mul: 1.5, n: 2, col: '#d0d0ff' }],
  Quantizeguard: ['aura', { r: 120, cd: 1.8, n: 4, col: '#8a8ac0', mul: 0.6 }],
  Zerocrosser: ['hop', { cd: 0.9, dur: 0.3, mul: 3.2, land: 3, col: '#9090c0' }],
  Peakholdturret: ['turret', { cd: 3, n: 9, spread: 2.4, spd: 210, col: '#a0a0e0' }],
  Masterfader: ['turret', { cd: 1.6, n: 4, rot: 1.4, spread: 6, spd: 200, col: '#f0f0ff' }]
};

for (const k in FWF_SPECS) {
  const [a, c] = FWF_SPECS[k];
  ENEMY_BEHAVIOR_HANDLERS['fwf2' + k] = function(game, e, dt){ FWF_ARCH[a](game, e, dt, c); };
}
