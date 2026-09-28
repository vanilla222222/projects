'use strict';

ENEMY_BEHAVIOR_HANDLERS.hlw3Caesuraleaper = function(game, e, dt){
  const v = seekVector(e, game.player.x, game.player.y);
  if (e.hlwHops === undefined) { e.hlwHops = 0; e.hlwCd = 1.2; }
  if (e.hlwHops > 0) {
    e.hlwTick -= dt; hlwStep(game, e, dt, e.hlwDX, e.hlwDY, 3.5); hlwContact(game, e, v, 1);
    if (e.hlwTick <= 0) { e.hlwHops--; e.hlwTick = 0.18; e.hlwDX = v.x; e.hlwDY = v.y; if (!e.hlwHops) e.hlwCd = 2.4; }
    return;
  }
  e.hlwCd -= dt;
  if (e.hlwCd <= 0) { e.hlwHops = 3; e.hlwTick = 0.18; e.hlwDX = v.x; e.hlwDY = v.y; e.hitFlash = 0.15; }
};

ENEMY_BEHAVIOR_HANDLERS.hlw3Lullabymender = function(game, e, dt){
  const v = seekVector(e, game.player.x, game.player.y);
  if (v.d < 200) hlwStep(game, e, dt, -v.x, -v.y, 1);
  e.hlwCd = (e.hlwCd === undefined) ? 1.5 : e.hlwCd - dt;
  if (e.hlwCd <= 0) {
    e.hlwCd = 1.8; e.hitFlash = 0.1;
    for (const en of game.currentRoom.enemies) if (en !== e && en.hp > 0 && en.hp < en.maxHp && Util.dist(e.x, e.y, en.x, en.y) < 150) en.hp = Math.min(en.maxHp, en.hp + 1);
  }
};

ENEMY_BEHAVIOR_HANDLERS.hlw3Codaburster = function(game, e, dt){
  const v = seekVector(e, game.player.x, game.player.y);
  if (e.hlwFuse === undefined) e.hlwFuse = -1;
  if (e.hlwFuse < 0) { hlwStep(game, e, dt, v.x, v.y, 1.4); if (v.d < 65) e.hlwFuse = 0.5; return; }
  e.hlwFuse -= dt; e.hitFlash = 0.05;
  if (e.hlwFuse <= 0) { hlwBlast(game, e, e.x, e.y, 70, 1); hlwArc(game, e, 0, 8, Math.PI * 2, 170, { color: '#c0c0e0' }); e.hp = 0; }
};

ENEMY_BEHAVIOR_HANDLERS.hlw3Sustainturret = function(game, e, dt){
  e.hlwCd = (e.hlwCd === undefined) ? 1.5 : e.hlwCd - dt;
  if (e.hlwCd <= 0 && !(e.hlwVolley > 0)) { e.hlwVolley = 3; e.hlwTick = 0; e.hlwCd = 3; e.hitFlash = 0.15; }
  if (e.hlwVolley > 0) {
    e.hlwTick -= dt;
    if (e.hlwTick <= 0) { e.hlwTick = 0.25; e.hlwVolley--; fireProjectileAngle(game, e, hlwAim(e, game.player), 320, e.dmg, { pierce: 2, color: '#a0a0d0' }); }
  }
};

ENEMY_BEHAVIOR_HANDLERS.hlw3Staccatoflyer = function(game, e, dt){
  const player = game.player;
  e.hlwCd = (e.hlwCd === undefined) ? 0 : e.hlwCd - dt;
  if (e.hlwCd <= 0) {
    if (e.hlwBurst) fireProjectileAngle(game, e, hlwAim(e, player), 230, e.dmg, { color: '#b0b0e0' });
    e.hlwBurst = true; e.hlwCd = 0.5; e.hlwAng = Util.rand(0, Math.PI * 2);
  }
  const moving = e.hlwCd > 0.25;
  if (moving) hlwStep(game, e, dt, Math.cos(e.hlwAng), Math.sin(e.hlwAng), 2.2);
};

ENEMY_BEHAVIOR_HANDLERS.hlw3Legatoweaver = function(game, e, dt){
  const player = game.player;
  e.hlwT = (e.hlwT || 0) + dt;
  const tx = player.x + Math.cos(e.hlwT * 0.9) * 170, ty = player.y + Math.sin(e.hlwT * 1.8) * 110;
  hlwStep(game, e, dt, tx - e.x, ty - e.y, 1);
  e.hlwCd = (e.hlwCd === undefined) ? 0.4 : e.hlwCd - dt;
  if (e.hlwCd <= 0) { e.hlwCd = 0.5; fireProjectileAngle(game, e, hlwAim(e, player), 130, e.dmg, { color: '#c0c0f0' }); }
};

ENEMY_BEHAVIOR_HANDLERS.hlw3Dronewarden = function(game, e, dt){
  const player = game.player;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 200) hlwStep(game, e, dt, -v.x, -v.y, 0.7);
  const prev = e.hlwAura || [];
  const now = [];
  for (const en of game.currentRoom.enemies) if (en !== e && en.hp > 0 && Util.dist(e.x, e.y, en.x, en.y) < 120) { en.shielded = true; now.push(en); }
  for (const en of prev) if (!now.includes(en)) en.shielded = false;
  e.hlwAura = now;
};

ENEMY_BEHAVIOR_HANDLERS.hlw3Glissandodasher = function(game, e, dt){
  const player = game.player;
  const v = seekVector(e, player.x, player.y);
  if (e.hlwState === undefined) { e.hlwState = 'idle'; e.hlwCd = 1.2; }
  if (e.hlwState === 'dash') {
    e.hlwT -= dt; hlwStep(game, e, dt, e.hlwDX, e.hlwDY, 4); hlwContact(game, e, v, 1);
    if (e.hlwT <= 0) { e.hlwState = 'idle'; e.hlwCd = 1.8; hlwBlast(game, e, e.x, e.y, 45, 0); }
    return;
  }
  hlwStep(game, e, dt, v.x, v.y, 0.4);
  e.hlwCd -= dt;
  if (e.hlwCd <= 0) { e.hlwState = 'dash'; e.hlwT = 0.5; e.hlwDX = v.x; e.hlwDY = v.y; hlwBlast(game, e, e.x, e.y, 35, 0); }
};

ENEMY_BEHAVIOR_HANDLERS.hlw3Ostinatoturret = function(game, e, dt){
  if (e.hlwSpin === undefined) { e.hlwSpin = 0; e.hlwCd = 1; }
  e.hlwSpin += dt * 1.4;
  e.hlwCd -= dt;
  if (e.hlwCd <= 0) { e.hlwCd = 0.35; for (let i = 0; i < 2; i++) fireProjectileAngle(game, e, e.hlwSpin + i * Math.PI, 180, e.dmg, { color: '#9090c8' }); }
};

ENEMY_BEHAVIOR_HANDLERS.hlw3Harmonicsplitter = function(game, e, dt){
  const v = seekVector(e, game.player.x, game.player.y);
  hlwStep(game, e, dt, v.x, v.y, 0.9);
  if (!e.hlwSplit && e.hp < e.maxHp * 0.5) {
    e.hlwSplit = true; e.hitFlash = 0.3;
    hlwSpawn(game, game.currentRoom, 'onbeatstalker', e.x + 20, e.y);
    hlwSpawn(game, game.currentRoom, 'onbeatstalker', e.x - 20, e.y);
  }
  hlwContact(game, e, v);
};

ENEMY_BEHAVIOR_HANDLERS.hlw3Pedalbrute = function(game, e, dt){
  const v = seekVector(e, game.player.x, game.player.y);
  hlwStep(game, e, dt, v.x, v.y, 0.7);
  e.hlwCd = (e.hlwCd === undefined) ? 1.5 : e.hlwCd - dt;
  if (e.hlwCd <= 0) {
    e.hlwCd = 1.6; e.hitFlash = 0.15; e.hlwAlt = !e.hlwAlt;
    if (e.hlwAlt) hlwBlast(game, e, e.x, e.y, 75, 0); else hlwArc(game, e, 0, 10, Math.PI * 2, 170, { color: '#7070a8' });
  }
  hlwContact(game, e, v);
};

ENEMY_BEHAVIOR_HANDLERS.hlw3Cadenzasniper = function(game, e, dt){
  const player = game.player;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 240) hlwStep(game, e, dt, -v.x, -v.y, 0.7);
  e.hlwCd = (e.hlwCd === undefined) ? 1.5 : e.hlwCd - dt;
  if (e.hlwCd <= 0 && !(e.hlwShots > 0)) { e.hlwShots = 3; e.hlwTick = 0.4; e.hlwCd = 3; e.hitFlash = 0.1; }
  if (e.hlwShots > 0) {
    e.hlwTick -= dt;
    if (e.hlwTick <= 0) { e.hlwTick = 0.12; e.hlwShots--; fireProjectileAngle(game, e, hlwAim(e, player), 340, e.dmg, { color: '#d0d0ff' }); }
  }
};

ENEMY_BEHAVIOR_HANDLERS.hlw3Decrescendoshade = function(game, e, dt){
  const player = game.player;
  const v = seekVector(e, player.x, player.y);
  hlwStep(game, e, dt, v.x, v.y, Util.clamp(v.d / 200, 0.25, 1.6));
  e.hlwCd = (e.hlwCd === undefined) ? 2 : e.hlwCd - dt;
  if (e.hlwCd <= 0 && v.d < 60) {
    e.hlwCd = 3; e.hitFlash = 0.2;
    const a = hlwAim(e, player) + Math.PI;
    e.x = player.x + Math.cos(a) * 180; e.y = player.y + Math.sin(a) * 180;
  }
  hlwContact(game, e, v);
};

ENEMY_BEHAVIOR_HANDLERS.hlw3Motifmites = function(game, e, dt){
  const player = game.player;
  if (e.hlwAng === undefined) { e.hlwAng = Util.rand(0, Math.PI * 2); e.hlwT = 0; }
  e.hlwT += dt; e.hlwAng += dt * 3;
  const r = 40 + 30 * Math.sin(e.hlwT * 1.5);
  hlwStep(game, e, dt, player.x + Math.cos(e.hlwAng) * r - e.x, player.y + Math.sin(e.hlwAng) * r - e.y, 1.8);
  hlwContact(game, e, seekVector(e, player.x, player.y));
};

ENEMY_BEHAVIOR_HANDLERS.hlw3Bridgemortar = function(game, e, dt){
  const player = game.player;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 220) hlwStep(game, e, dt, -v.x, -v.y, 0.5);
  e.hlwCd = (e.hlwCd === undefined) ? 1.8 : e.hlwCd - dt;
  if (e.hlwCd <= 0) { e.hlwCd = 3; e.hlwQ = 0.9; e.hlwTX = player.x; e.hlwTY = player.y; e.hitFlash = 0.1; }
  if (e.hlwQ > 0) {
    e.hlwQ -= dt;
    if (e.hlwQ <= 0) { hlwBlast(game, e, e.hlwTX, e.hlwTY, 50, 1); hlwBlast(game, e, 2 * e.x - e.hlwTX, 2 * e.y - e.hlwTY, 50, 0); }
  }
};

ENEMY_BEHAVIOR_HANDLERS.hlw3Chorddrone = function(game, e, dt){
  const player = game.player;
  if (e.hlwSpin === undefined) { e.hlwSpin = 0; e.hlwCd = 1; }
  e.hlwSpin += dt * 0.6;
  hlwStep(game, e, dt, player.x + Math.cos(e.hlwSpin * 2) * 170 - e.x, player.y + Math.sin(e.hlwSpin * 2) * 170 - e.y, 1.3);
  e.hlwCd -= dt;
  if (e.hlwCd <= 0) { e.hlwCd = 1.8; hlwArc(game, e, hlwAim(e, player), 3, 1.2, 200, { color: '#c8c8f8' }); }
};

ENEMY_BEHAVIOR_HANDLERS.hlw3Vibratocircler = function(game, e, dt){
  const player = game.player;
  if (e.hlwAng === undefined) { e.hlwAng = Util.rand(0, Math.PI * 2); e.hlwT = 0; e.hlwCd = 2; }
  e.hlwT += dt; e.hlwAng += dt * 1.3;
  const r = 140 + 50 * Math.sin(e.hlwT * 6);
  hlwStep(game, e, dt, player.x + Math.cos(e.hlwAng) * r - e.x, player.y + Math.sin(e.hlwAng) * r - e.y, 2);
  e.hlwCd -= dt;
  if (e.hlwCd <= 0) { e.hlwCd = 2.6; hlwArc(game, e, hlwAim(e, player), 5, 1.2, 200, { color: '#b8b8f0' }); }
};

ENEMY_BEHAVIOR_HANDLERS.hlw3Finalechantor = function(game, e, dt){
  const player = game.player;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 200) hlwStep(game, e, dt, -v.x, -v.y, 0.5);
  e.hlwCd = (e.hlwCd === undefined) ? 1.5 : e.hlwCd - dt;
  if (e.hlwCd <= 0) { e.hlwCd = 3.2; e.hlwZones = [{ x: player.x, y: player.y, t: 0.8 }, { x: player.x, y: player.y, t: 1.3 }]; e.hitFlash = 0.15; }
  if (e.hlwZones) {
    for (const z of e.hlwZones) { z.t -= dt; if (z.t <= 0 && !z.done) { z.done = true; hlwBlast(game, e, z.x, z.y, 60, 0); } }
    if (e.hlwZones.every(z => z.done)) e.hlwZones = null;
  }
};
