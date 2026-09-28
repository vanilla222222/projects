'use strict';

ENEMY_BEHAVIOR_HANDLERS.hlw2Choirwraith = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  e.hlwCd = (e.hlwCd === undefined) ? t.phaseCooldown || 3 : e.hlwCd - dt;
  if (e.hlwPhase > 0) {
    e.hlwPhase -= dt; e.submerged = true;
    hlwStep(game, e, dt, v.x, v.y, 1.8);
    if (e.hlwPhase <= 0) { e.submerged = false; e.hitFlash = 0.2; hlwArc(game, e, 0, 8, Math.PI * 2, 190, { color: '#9a9ab0' }); }
    return;
  }
  hlwStep(game, e, dt, v.x, v.y, 0.7);
  if (e.hlwCd <= 0) { e.hlwPhase = 1.2; e.hlwCd = t.phaseCooldown || 3; }
  hlwContact(game, e, v);
};

ENEMY_BEHAVIOR_HANDLERS.hlw2Cantorhulk = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  hlwStep(game, e, dt, v.x, v.y, 0.6);
  e.hlwCd = (e.hlwCd === undefined) ? t.pullCooldown || 3.2 : e.hlwCd - dt;
  if (e.hlwCd <= 0) {
    e.hlwCd = t.pullCooldown || 3.2; e.hitFlash = 0.2;
    if (v.d < 180) { player.x -= v.x * 40; player.y -= v.y * 40; }
    hlwBlast(game, e, e.x, e.y, 60, 1);
  }
  hlwContact(game, e, v);
};

ENEMY_BEHAVIOR_HANDLERS.hlw2Dirgesiren = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (v.d < (t.keepDistance || 200)) hlwStep(game, e, dt, -v.x, -v.y, 0.7);
  e.hlwCd = (e.hlwCd === undefined) ? 1.5 : e.hlwCd - dt;
  if (e.hlwCd <= 0) {
    e.hlwCd = 2.2; e.hitFlash = 0.1;
    const a = hlwAim(e, player);
    hlwArc(game, e, a, 3, 0.5, 190, { color: '#9a9ab0' });
    hlwArc(game, e, a + Math.PI, 3, 0.5, 150, { color: '#4c4c58' });
  }
};

ENEMY_BEHAVIOR_HANDLERS.hlw2Quietstalker = function(game, e, dt){
  const player = game.player, t = e.type;
  const node = game.currentRoom;
  const cx = (node.tileW || 0) * TILE / 2, cy = (node.tileH || 0) * TILE / 2;
  const v = seekVector(e, player.x, player.y);
  if (v.d < (t.mirrorRange || 240)) {
    hlwStep(game, e, dt, v.x, v.y, 1.3);
    hlwContact(game, e, v);
  } else hlwStep(game, e, dt, 2 * cx - player.x - e.x, 2 * cy - player.y - e.y, 0.9);
};

ENEMY_BEHAVIOR_HANDLERS.hlw2Refrainbrood = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 200) hlwStep(game, e, dt, -v.x, -v.y, 0.55);
  if (e.hlwSpawned === undefined) e.hlwSpawned = 0;
  e.hlwCd = (e.hlwCd === undefined) ? Util.rand(2, 3) : e.hlwCd - dt;
  if (e.hlwCd <= 0 && e.hlwSpawned < 3) {
    const ang = Util.rand(0, Math.PI * 2);
    hlwSpawn(game, game.currentRoom, 'onbeatstalker', e.x + Math.cos(ang) * 60, e.y + Math.sin(ang) * 60);
    e.hlwSpawned++; e.hlwCd = t.spawnCooldown || 3.5; e.hitFlash = 0.15;
  }
};

ENEMY_BEHAVIOR_HANDLERS.hlw2Vesperwarden = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 220) hlwStep(game, e, dt, -v.x, -v.y, 0.6);
  e.hlwCd = (e.hlwCd === undefined) ? t.barrageCooldown || 2.4 : e.hlwCd - dt;
  if (e.hlwCd <= 0) { e.hlwCd = t.barrageCooldown || 2.4; e.hitFlash = 0.1; hlwArc(game, e, hlwAim(e, player), 9, 0.7, 240, { color: '#b0a0c8' }); }
};

ENEMY_BEHAVIOR_HANDLERS.hlw2Tacetsentinel = function(game, e, dt){
  const player = game.player, t = e.type;
  e.hlwCd = (e.hlwCd === undefined) ? t.beamCooldown || 2.8 : e.hlwCd - dt;
  if (e.hlwCd <= 0 && !(e.hlwAimT > 0)) { e.hlwAimT = 0.8; e.hlwA = hlwAim(e, player); e.hlwCd = t.beamCooldown || 2.8; }
  if (e.hlwAimT > 0) {
    e.hlwAimT -= dt; e.hitFlash = 0.05;
    if (e.hlwAimT <= 0) for (let i = 0; i < 4; i++) fireProjectileAngle(game, e, e.hlwA, 300 + i * 40, e.dmg, { pierce: 2, color: '#6a6a80' });
  }
};

ENEMY_BEHAVIOR_HANDLERS.hlw2Requiemgolem = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  hlwStep(game, e, dt, v.x, v.y, 0.5);
  e.hlwCd = (e.hlwCd === undefined) ? t.quakeCooldown || 3.2 : e.hlwCd - dt;
  if (e.hlwCd <= 0) { e.hlwCd = t.quakeCooldown || 3.2; e.hlwQuake = 0; e.hitFlash = 0.2; }
  if (e.hlwQuake !== undefined && e.hlwQuake >= 0) {
    e.hlwQuake += dt;
    if (e.hlwQuake > 0.3 && !e.hlwRing1) { e.hlwRing1 = true; hlwBlast(game, e, e.x, e.y, 55, 0); }
    if (e.hlwQuake > 0.6) { e.hlwRing1 = false; e.hlwQuake = -1; hlwBlast(game, e, e.x, e.y, 110, 1); }
  }
  hlwContact(game, e, v);
};

ENEMY_BEHAVIOR_HANDLERS.hlw2Overtoneweaver = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  hlwStep(game, e, dt, v.x, v.y, 0.75);
  const node = game.currentRoom;
  node.hlwSpores = node.hlwSpores || [];
  e.hlwCd = (e.hlwCd === undefined) ? t.webCooldown || 2.4 : e.hlwCd - dt;
  if (e.hlwCd <= 0) { node.hlwSpores.push({ x: e.x, y: e.y, life: 6 }); e.hlwCd = t.webCooldown || 2.4; e.hitFlash = 0.1; }
  for (let i = node.hlwSpores.length - 1; i >= 0; i--) {
    const s = node.hlwSpores[i];
    s.life -= dt;
    if (s.life <= 0) { node.hlwSpores.splice(i, 1); continue; }
    if (Util.dist(s.x, s.y, player.x, player.y) < 20 + player.radius) {
      s.tick = (s.tick || 0) - dt;
      if (s.tick <= 0) { damagePlayer(game, playerDamageAmount(game, false, 1), t.id); s.tick = 0.5; }
    }
  }
  hlwContact(game, e, v);
};

ENEMY_BEHAVIOR_HANDLERS.hlw2Hollowidol = function(game, e, dt){
  const t = e.type;
  if (e.hlwSpin === undefined) { e.hlwSpin = 0; e.hlwCd = 1.5; e.hlwBurst = 0; }
  e.hlwCd -= dt;
  if (e.hlwCd <= 0) { e.hlwBurst = 8; e.hlwCd = t.novaCooldown || 3; e.hitFlash = 0.2; e.hlwTick = 0; }
  if (e.hlwBurst > 0) {
    e.hlwTick -= dt;
    if (e.hlwTick <= 0) { e.hlwTick = 0.1; e.hlwBurst--; e.hlwSpin += 0.7; hlwArc(game, e, e.hlwSpin, 3, Math.PI * 4 / 3, 190, { color: '#4a4a70' }); }
  }
};
