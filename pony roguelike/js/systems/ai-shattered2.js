'use strict';

ENEMY_BEHAVIOR_HANDLERS.shr2Clipstalker = function(game, e, dt){
  const player = game.player;
  const v = seekVector(e, player.x, player.y);
  e.shrCd = (e.shrCd === undefined) ? 1 : e.shrCd - dt;
  if (e.shrCd <= 0) { e.shrFast = !e.shrFast; e.shrCd = e.shrFast ? 0.6 : 1; }
  shrStep(game, e, dt, v.x, v.y, e.shrFast ? 2.2 : 0.4);
  shrContact(game, e, v);
};

ENEMY_BEHAVIOR_HANDLERS.shr2Distortionbrute = function(game, e, dt){
  const player = game.player;
  const v = seekVector(e, player.x, player.y);
  shrStep(game, e, dt, v.x, v.y, 0.7);
  e.shrCd = (e.shrCd === undefined) ? 2.5 : e.shrCd - dt;
  if (e.shrCd <= 0 && v.d < 160) { e.shrCd = 3; e.hitFlash = 0.2; shrBlast(game, e, e.x, e.y, 80, 0); }
  shrContact(game, e, v);
};

ENEMY_BEHAVIOR_HANDLERS.shr2Peakcharger = function(game, e, dt){
  const player = game.player;
  const v = seekVector(e, player.x, player.y);
  if (e.shrState === undefined) { e.shrState = 'idle'; e.shrCd = 1.5; }
  if (e.shrState === 'wind') {
    e.shrTimer -= dt; e.hitFlash = 0.05;
    if (e.shrTimer <= 0) { e.shrState = 'dash'; e.shrDX = v.x; e.shrDY = v.y; e.shrTimer = 0.9; }
    return;
  }
  if (e.shrState === 'dash') {
    e.shrTimer -= dt;
    const r = shrStep(game, e, dt, e.shrDX, e.shrDY, 3.5);
    shrContact(game, e, v, 1);
    if (e.shrTimer <= 0 || (!r.movedX && !r.movedY)) { e.shrState = 'idle'; e.shrCd = 2.2; }
    return;
  }
  shrStep(game, e, dt, v.x, v.y, 0.5);
  e.shrCd -= dt;
  if (e.shrCd <= 0) { e.shrState = 'wind'; e.shrTimer = 0.6; }
};

ENEMY_BEHAVIOR_HANDLERS.shr2Screamturret = function(game, e, dt){
  const player = game.player;
  e.shrCd = (e.shrCd === undefined) ? 1.2 : e.shrCd - dt;
  if (e.shrCd <= 0) { e.shrCd = 2; e.hitFlash = 0.1; shrArc(game, e, shrAim(e, player), 5, 0.9, 230, { color: '#ff4a3a' }); }
};

ENEMY_BEHAVIOR_HANDLERS.shr2Crushmortar = function(game, e, dt){
  const player = game.player;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 220) shrStep(game, e, dt, -v.x, -v.y, 0.5);
  e.shrCd = (e.shrCd === undefined) ? 1.8 : e.shrCd - dt;
  if (e.shrCd <= 0) { e.shrCd = 2.6; e.shrQ = 0.9; e.shrTX = player.x; e.shrTY = player.y; e.hitFlash = 0.1; }
  if (e.shrQ > 0) { e.shrQ -= dt; if (e.shrQ <= 0) shrBlast(game, e, e.shrTX, e.shrTY, 70, 1); }
};

ENEMY_BEHAVIOR_HANDLERS.shr2Feedbackflyer = function(game, e, dt){
  const player = game.player;
  e.shrT = (e.shrT || 0) + dt;
  const tx = player.x + Math.sin(e.shrT * 1.6) * 150, ty = player.y + Math.sin(e.shrT * 3.2) * 90;
  shrStep(game, e, dt, tx - e.x, ty - e.y, 1.6);
  e.shrCd = (e.shrCd === undefined) ? 1.2 : e.shrCd - dt;
  if (e.shrCd <= 0) { e.shrCd = 1.6; fireProjectileAngle(game, e, shrAim(e, player), 220, e.dmg, { color: '#ff7a3a' }); }
};

ENEMY_BEHAVIOR_HANDLERS.shr2Redlinelurker = function(game, e, dt){
  const player = game.player;
  const v = seekVector(e, player.x, player.y);
  if (e.shrHidden === undefined) e.shrHidden = true;
  if (e.shrHidden) {
    e.submerged = true;
    shrStep(game, e, dt, v.x, v.y, 0.4);
    if (v.d < 100) { e.shrHidden = false; e.submerged = false; e.shrLunge = 0.6; e.shrDX = v.x; e.shrDY = v.y; e.hitFlash = 0.2; }
    return;
  }
  e.shrLunge -= dt;
  shrStep(game, e, dt, e.shrDX, e.shrDY, 3);
  shrContact(game, e, v, 1);
  if (e.shrLunge <= 0) e.shrHidden = true;
};

ENEMY_BEHAVIOR_HANDLERS.shr2Wailmites = function(game, e, dt){
  const player = game.player;
  const node = game.currentRoom;
  let cx = 0, cy = 0, n = 0;
  for (const en of node.enemies) if (en !== e && en.type && en.type.id === 'wailmites') { cx += en.x; cy += en.y; n++; }
  const v = seekVector(e, player.x, player.y);
  if (n > 0) { cx /= n; cy /= n; shrStep(game, e, dt, v.x - (cx - e.x) * 0.02, v.y - (cy - e.y) * 0.02, 1.3); }
  else shrStep(game, e, dt, v.x, v.y, 1.3);
  shrContact(game, e, v);
};

ENEMY_BEHAVIOR_HANDLERS.shr2Gainsplitter = function(game, e, dt){
  const player = game.player;
  const v = seekVector(e, player.x, player.y);
  shrStep(game, e, dt, v.x, v.y, 0.9);
  if (!e.shrSplit && e.hp < e.maxHp * 0.5) {
    e.shrSplit = true; e.hitFlash = 0.3;
    shrSpawn(game, game.currentRoom, 'wailmites', e.x + 20, e.y);
    shrSpawn(game, game.currentRoom, 'wailmites', e.x - 20, e.y);
  }
  shrContact(game, e, v);
};

ENEMY_BEHAVIOR_HANDLERS.shr2Peakmarksman = function(game, e, dt){
  const player = game.player;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 240) shrStep(game, e, dt, -v.x, -v.y, 0.55);
  e.shrCharge = e.shrCharge || 0;
  e.shrCd = (e.shrCd === undefined) ? 1.5 : e.shrCd - dt;
  if (e.shrCd <= 0 && e.shrCharge === 0) e.shrCharge = 0.7;
  if (e.shrCharge > 0) {
    e.shrCharge -= dt; e.hitFlash = 0.05;
    if (e.shrCharge <= 0) { fireProjectileAngle(game, e, shrAim(e, player), 360, e.dmg + 2, { pierce: 3, color: '#ff3a3a' }); e.shrCd = 2.3; }
  }
};

ENEMY_BEHAVIOR_HANDLERS.shr2Clipleaper = function(game, e, dt){
  const player = game.player;
  const v = seekVector(e, player.x, player.y);
  if (e.shrState === undefined) { e.shrState = 'idle'; e.shrCd = 1.5; }
  if (e.shrState === 'wind') { e.shrTimer -= dt; e.hitFlash = 0.05; if (e.shrTimer <= 0) { e.shrState = 'leap'; e.shrTimer = 0.35; e.shrDX = v.x; e.shrDY = v.y; } return; }
  if (e.shrState === 'leap') {
    e.shrTimer -= dt;
    shrStep(game, e, dt, e.shrDX, e.shrDY, 5);
    shrContact(game, e, v, 1);
    if (e.shrTimer <= 0) { e.shrState = 'idle'; e.shrCd = 1.8; }
    return;
  }
  shrStep(game, e, dt, v.x, v.y, 0.5);
  e.shrCd -= dt;
  if (e.shrCd <= 0) { e.shrState = 'wind'; e.shrTimer = 0.4; }
};

ENEMY_BEHAVIOR_HANDLERS.shr2Overdrivecircler = function(game, e, dt){
  const player = game.player;
  if (e.shrAng === undefined) { e.shrAng = Util.rand(0, Math.PI * 2); e.shrCd = 2; }
  const rage = 1 + (1 - e.hp / e.maxHp) * 1.5;
  e.shrAng += dt * 1.2 * rage;
  const tx = player.x + Math.cos(e.shrAng) * 150, ty = player.y + Math.sin(e.shrAng) * 150;
  shrStep(game, e, dt, tx - e.x, ty - e.y, 1.6 * rage);
  e.shrCd -= dt;
  if (e.shrCd <= 0) { e.shrCd = 3 / rage; shrArc(game, e, shrAim(e, player), 5, Math.PI * 2 * 0.8, 190, { color: '#ff6a3a' }); }
};

ENEMY_BEHAVIOR_HANDLERS.shr2Limiterhulk = function(game, e, dt){
  const player = game.player;
  const v = seekVector(e, player.x, player.y);
  e.shrCd = (e.shrCd === undefined) ? 3 : e.shrCd - dt;
  if (e.shrCd <= 0) { e.shielded = true; e.shrHold = 1.5; e.shrCd = 4.5; e.hitFlash = 0.15; }
  if (e.shrHold > 0) { e.shrHold -= dt; if (e.shrHold <= 0) e.shielded = false; }
  shrStep(game, e, dt, v.x, v.y, e.shielded ? 0.2 : 0.6);
  shrContact(game, e, v, 1);
};

ENEMY_BEHAVIOR_HANDLERS.shr2Saturatorspire = function(game, e, dt){
  if (e.shrStage === undefined) { e.shrStage = 0; e.shrCd = 1.5; }
  e.shrCd -= dt;
  if (e.shrCd <= 0) {
    const n = 6 + e.shrStage * 2;
    shrArc(game, e, Util.rand(0, 1), n, Math.PI * 2, 170, { color: '#ff5a3a' });
    e.shrStage = (e.shrStage + 1) % 3; e.shrCd = 2; e.hitFlash = 0.15;
  }
};

ENEMY_BEHAVIOR_HANDLERS.shr2Redlinedrone = function(game, e, dt){
  const player = game.player;
  const v = seekVector(e, player.x, player.y);
  if (e.shrFuse === undefined) e.shrFuse = -1;
  if (e.shrFuse < 0) {
    shrStep(game, e, dt, v.x, v.y, 1.5);
    if (v.d < 60) e.shrFuse = 0.5;
    return;
  }
  e.shrFuse -= dt; e.hitFlash = 0.05;
  if (e.shrFuse <= 0) { shrBlast(game, e, e.x, e.y, 70, 1); e.hp = 0; }
};

ENEMY_BEHAVIOR_HANDLERS.shr2Clipblinker = function(game, e, dt){
  const player = game.player;
  const v = seekVector(e, player.x, player.y);
  e.shrCd = (e.shrCd === undefined) ? 1.5 : e.shrCd - dt;
  if (v.d < 100 && e.shrCd > 0.3) e.shrCd = 0.3;
  if (e.shrCd <= 0) {
    const ang = shrAim(e, player) + Math.PI + Util.rand(-0.6, 0.6);
    e.x = player.x + Math.cos(ang) * 200; e.y = player.y + Math.sin(ang) * 200;
    e.shrCd = 2.4; e.hitFlash = 0.2;
    fireProjectileAngle(game, e, shrAim(e, player), 230, e.dmg, { color: '#ff8a3a' });
  }
};

ENEMY_BEHAVIOR_HANDLERS.shr2Crestcharger = function(game, e, dt){
  const player = game.player;
  const v = seekVector(e, player.x, player.y);
  const rage = e.hp < e.maxHp * 0.5;
  if (e.shrState === undefined) { e.shrState = 'idle'; e.shrCd = 1.2; }
  if (e.shrState === 'wind') { e.shrTimer -= dt; e.hitFlash = 0.05; if (e.shrTimer <= 0) { e.shrState = 'dash'; e.shrDX = v.x; e.shrDY = v.y; e.shrTimer = 0.7; } return; }
  if (e.shrState === 'dash') {
    e.shrTimer -= dt;
    const r = shrStep(game, e, dt, e.shrDX, e.shrDY, 3.6);
    shrContact(game, e, v, 1);
    if (e.shrTimer <= 0 || (!r.movedX && !r.movedY)) { e.shrState = 'idle'; e.shrCd = rage ? 0.8 : 1.8; }
    return;
  }
  shrStep(game, e, dt, v.x, v.y, 0.4);
  e.shrCd -= dt;
  if (e.shrCd <= 0) { e.shrState = 'wind'; e.shrTimer = rage ? 0.3 : 0.5; }
};

ENEMY_BEHAVIOR_HANDLERS.shr2Squarewaveweaver = function(game, e, dt){
  const player = game.player;
  e.shrCd = (e.shrCd === undefined) ? 0 : e.shrCd - dt;
  if (e.shrCd <= 0) {
    e.shrAxis = e.shrAxis === 'x' ? 'y' : 'x'; e.shrCd = 0.6;
    fireProjectileAngle(game, e, shrAim(e, player), 200, e.dmg, { color: '#ff7a5a' });
  }
  const dx = player.x - e.x, dy = player.y - e.y;
  if (e.shrAxis === 'x') shrStep(game, e, dt, Math.sign(dx), 0, 1);
  else shrStep(game, e, dt, 0, Math.sign(dy), 1);
};
