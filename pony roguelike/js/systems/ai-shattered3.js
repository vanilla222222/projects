'use strict';

ENEMY_BEHAVIOR_HANDLERS.shr3Feedbackphantom = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  e.shrCd = (e.shrCd === undefined) ? t.phaseCooldown || 3 : e.shrCd - dt;
  if (e.shrPhase > 0) {
    e.shrPhase -= dt; e.submerged = true;
    shrStep(game, e, dt, v.x, v.y, 1.8);
    if (e.shrPhase <= 0) { e.submerged = false; e.hitFlash = 0.2; shrArc(game, e, 0, 8, Math.PI * 2, 190, { color: '#8a4ac8' }); }
    return;
  }
  shrStep(game, e, dt, v.x, v.y, 0.7);
  if (e.shrCd <= 0) { e.shrPhase = 1.2; e.shrCd = t.phaseCooldown || 3; }
  shrContact(game, e, v);
};

ENEMY_BEHAVIOR_HANDLERS.shr3Resonanthulk = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  shrStep(game, e, dt, v.x, v.y, 0.6);
  e.shrCd = (e.shrCd === undefined) ? t.pullCooldown || 3.2 : e.shrCd - dt;
  if (e.shrCd <= 0) {
    e.shrCd = t.pullCooldown || 3.2; e.hitFlash = 0.2;
    if (v.d < (t.pullRadius || 180)) { player.x -= v.x * 40; player.y -= v.y * 40; }
    shrBlast(game, e, e.x, e.y, 60, 1);
  }
  shrContact(game, e, v);
};

ENEMY_BEHAVIOR_HANDLERS.shr3Dissonantsiren = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (v.d < (t.keepDistance || 200)) shrStep(game, e, dt, -v.x, -v.y, 0.7);
  e.shrT = (e.shrT || 0) + dt;
  e.shrCd = (e.shrCd === undefined) ? 1.5 : e.shrCd - dt;
  if (e.shrCd <= 0) {
    e.shrCd = 2.2; e.hitFlash = 0.1;
    const a = shrAim(e, player);
    shrArc(game, e, a, 3, 0.5, 190, { color: '#c85ad8' });
    shrArc(game, e, a + Math.PI, 3, 0.5, 150, { color: '#642c6c' });
  }
};

ENEMY_BEHAVIOR_HANDLERS.shr3Bitcrusher = function(game, e, dt){
  const player = game.player;
  const v = seekVector(e, player.x, player.y);
  e.shrCd = (e.shrCd === undefined) ? 0 : e.shrCd - dt;
  if (e.shrCd <= 0) {
    const snap = Math.round(Math.atan2(v.y, v.x) / (Math.PI / 4)) * (Math.PI / 4);
    e.shrDX = Math.cos(snap); e.shrDY = Math.sin(snap); e.shrCd = 0.4;
  }
  shrStep(game, e, dt, e.shrDX, e.shrDY, 1.2);
  shrContact(game, e, v);
};

ENEMY_BEHAVIOR_HANDLERS.shr3Echostalker = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 160) shrStep(game, e, dt, -v.x, -v.y, 0.7); else shrStep(game, e, dt, v.x, v.y, 0.7);
  e.shrCd = (e.shrCd === undefined) ? 1.5 : e.shrCd - dt;
  if (e.shrCd <= 0) {
    e.shrCd = 2.6; e.hitFlash = 0.1;
    fireProjectileAngle(game, e, shrAim(e, player), 220, e.dmg, { color: '#a08ae8' });
    e.shrEcho = t.echoDelay || 0.6; e.shrEX = e.x; e.shrEY = e.y;
  }
  if (e.shrEcho > 0) {
    e.shrEcho -= dt;
    if (e.shrEcho <= 0) {
      const ox = e.x, oy = e.y;
      e.x = e.shrEX; e.y = e.shrEY;
      fireProjectileAngle(game, e, shrAim(e, player), 220, e.dmg, { color: '#a08ae8' });
      e.x = ox; e.y = oy;
    }
  }
};

ENEMY_BEHAVIOR_HANDLERS.shr3Overloadbrood = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 200) shrStep(game, e, dt, -v.x, -v.y, 0.55);
  if (e.shrSpawned === undefined) e.shrSpawned = 0;
  e.shrCd = (e.shrCd === undefined) ? Util.rand(2, 3) : e.shrCd - dt;
  if (e.shrCd <= 0 && e.shrSpawned < 3) {
    const ang = Util.rand(0, Math.PI * 2);
    shrSpawn(game, game.currentRoom, 'clipstalker', e.x + Math.cos(ang) * 60, e.y + Math.sin(ang) * 60);
    e.shrSpawned++; e.shrCd = t.spawnCooldown || 3.5; e.hitFlash = 0.15;
  }
};

ENEMY_BEHAVIOR_HANDLERS.shr3Clipsentinel = function(game, e, dt){
  const player = game.player, t = e.type;
  e.shrCd = (e.shrCd === undefined) ? t.beamCooldown || 2.8 : e.shrCd - dt;
  if (e.shrCd <= 0 && !(e.shrAim > 0)) { e.shrAim = 0.8; e.shrA = shrAim(e, player); e.shrCd = t.beamCooldown || 2.8; }
  if (e.shrAim > 0) {
    e.shrAim -= dt; e.hitFlash = 0.05;
    if (e.shrAim <= 0) for (let i = 0; i < 4; i++) fireProjectileAngle(game, e, e.shrA, 300 + i * 40, e.dmg, { pierce: 2, color: '#e04a2a' });
  }
};

ENEMY_BEHAVIOR_HANDLERS.shr3Subbassgolem = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  shrStep(game, e, dt, v.x, v.y, 0.5);
  e.shrCd = (e.shrCd === undefined) ? t.quakeCooldown || 3.2 : e.shrCd - dt;
  if (e.shrCd <= 0) { e.shrCd = t.quakeCooldown || 3.2; e.shrQuake = 0; e.hitFlash = 0.2; }
  if (e.shrQuake !== undefined && e.shrQuake >= 0) {
    e.shrQuake += dt;
    if (e.shrQuake > 0.3 && !e.shrRing1) { e.shrRing1 = true; shrBlast(game, e, e.x, e.y, 55, 0); }
    if (e.shrQuake > 0.6) { e.shrRing1 = false; e.shrQuake = -1; shrBlast(game, e, e.x, e.y, 110, 1); }
  }
  shrContact(game, e, v);
};

ENEMY_BEHAVIOR_HANDLERS.shr3Treblewarden = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 220) shrStep(game, e, dt, -v.x, -v.y, 0.6);
  e.shrCd = (e.shrCd === undefined) ? t.barrageCooldown || 2.4 : e.shrCd - dt;
  if (e.shrCd <= 0) { e.shrCd = t.barrageCooldown || 2.4; e.hitFlash = 0.1; shrArc(game, e, shrAim(e, player), 9, 0.7, 240, { color: '#ff8a4a' }); }
};

ENEMY_BEHAVIOR_HANDLERS.shr3Masteridol = function(game, e, dt){
  const t = e.type;
  if (e.shrSpin === undefined) { e.shrSpin = 0; e.shrCd = 1.5; e.shrBurst = 0; }
  e.shrCd -= dt;
  if (e.shrCd <= 0) { e.shrBurst = 8; e.shrCd = t.novaCooldown || 3; e.hitFlash = 0.2; e.shrTick = 0; }
  if (e.shrBurst > 0) {
    e.shrTick -= dt;
    if (e.shrTick <= 0) {
      e.shrTick = 0.1; e.shrBurst--; e.shrSpin += 0.7;
      shrArc(game, e, e.shrSpin, 3, Math.PI * 4 / 3, 190, { color: '#ff5a2a' });
    }
  }
};
