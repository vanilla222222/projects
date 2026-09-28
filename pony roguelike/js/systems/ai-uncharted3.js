'use strict';

ENEMY_BEHAVIOR_HANDLERS.uch3Frostwraith = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.uchPhase === undefined) { e.uchPhase = 0; e.uchCd = 0; }
  const v = seekVector(e, player.x, player.y);
  if (e.uchPhase > 0) {
    e.uchPhase -= dt;
    e.shielded = true; e.alpha = 0.5;
    uchStep(game, e, dt, v.x, v.y, 2.2);
    if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg + 1), t.id);
    if (e.uchPhase <= 0) { e.shielded = false; e.alpha = 1; e.uchCd = t.phaseCooldown || 3; }
    return;
  }
  uchStep(game, e, dt, v.x, v.y, 0.85);
  e.uchCd -= dt;
  if (e.uchCd <= 0 && v.d < 240) e.uchPhase = 0.9;
};

ENEMY_BEHAVIOR_HANDLERS.uch3Avalanchehulk = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (e.uchRoll === undefined) { e.uchRoll = false; e.uchCd = 1; e.uchSpeed = 1; }
  if (e.uchRoll) {
    e.uchSpeed = Math.min(e.uchSpeed + dt * 1.5, 4);
    const r = uchStep(game, e, dt, e.uchDX, e.uchDY, e.uchSpeed);
    if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg + (e.uchSpeed > 3 ? 1 : 0)), t.id);
    if (!r.movedX && !r.movedY) { e.uchRoll = false; e.uchSpeed = 1; e.uchCd = t.rollCooldown || 3.4; }
    return;
  }
  uchStep(game, e, dt, v.x, v.y, 0.55);
  e.uchCd -= dt;
  if (e.uchCd <= 0 && v.d < 260) { e.uchRoll = true; e.uchDX = v.x; e.uchDY = v.y; }
};

ENEMY_BEHAVIOR_HANDLERS.uch3Glacialsiren = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  const keep = t.keepDistance || 210;
  if (v.d < keep) uchStep(game, e, dt, -v.x, -v.y, 0.6);
  else uchStep(game, e, dt, v.x, v.y, 0.6);
  e.uchCd = (e.uchCd === undefined) ? 2.2 : e.uchCd - dt;
  if (e.uchCd <= 0) {
    e.uchCd = 2.8;
    e.hitFlash = 0.15;
    if (v.d < (t.luresRadius || 180)) {
      const pull = 26;
      player.x -= v.x * pull; player.y -= v.y * pull;
    }
    fireProjectileAngle(game, e, uchAim(e, player), 190, e.dmg, { color: '#d8f0ff' });
  }
};

ENEMY_BEHAVIOR_HANDLERS.uch3Permafrostcolossus = function(game, e, dt){
  const player = game.player, t = e.type;
  e.uchCd = (e.uchCd === undefined) ? t.slamCooldown || 2.8 : e.uchCd - dt;
  if (e.uchCd <= 0) {
    e.uchCd = t.slamCooldown || 2.8;
    e.hitFlash = 0.2;
    const r = t.slamRadius || 120;
    game.explosions.push(new Explosion(e.x, e.y, r));
    const d = Util.dist(e.x, e.y, player.x, player.y);
    if (d < r + player.radius) {
      damagePlayer(game, playerDamageAmount(game, false, e.dmg + 1), t.id);
      player.freezeTimer = Math.max(player.freezeTimer, 0.35);
    }
  }
};

ENEMY_BEHAVIOR_HANDLERS.uch3Crystalstalker = function(game, e, dt){
  const player = game.player, t = e.type;
  const node = game.currentRoom;
  const cx = (node.tileW || 0) * TILE / 2;
  const cy = (node.tileH || 0) * TILE / 2;
  const v = seekVector(e, player.x, player.y);
  if (v.d < (t.mirrorRange || 250)) {
    uchStep(game, e, dt, v.x, v.y, 1.3);
    if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
  } else {
    const mx = cx - (player.x - cx), my = cy - (player.y - cy);
    uchStep(game, e, dt, mx - e.x, my - e.y, 0.9);
  }
};

ENEMY_BEHAVIOR_HANDLERS.uch3Thornwarden = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 220) uchStep(game, e, dt, -v.x, -v.y, 0.55);
  e.uchCd = (e.uchCd === undefined) ? t.barrageCooldown || 2.6 : e.uchCd - dt;
  if (e.uchCd <= 0) {
    e.uchCd = t.barrageCooldown || 2.6;
    e.hitFlash = 0.12;
    uchArc(game, e, uchAim(e, player), 7, Math.PI * 0.5, 210, { color: '#9ad868' });
  }
};

ENEMY_BEHAVIOR_HANDLERS.uch3Canopytitan = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  uchStep(game, e, dt, v.x, v.y, 0.55);
  e.uchCd = (e.uchCd === undefined) ? t.pulseCooldown || 3 : e.uchCd - dt;
  if (e.uchCd <= 0) {
    e.uchCd = t.pulseCooldown || 3;
    const r = t.pulseRadius || 110;
    game.explosions.push(new Explosion(e.x, e.y, r));
    const d = Util.dist(e.x, e.y, player.x, player.y);
    if (d < r + player.radius) {
      damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
      const kb = (r + player.radius - d) * 0.6;
      const ang = Math.atan2(player.y - e.y, player.x - e.x);
      player.x += Math.cos(ang) * kb; player.y += Math.sin(ang) * kb;
    }
    e.hitFlash = 0.15;
  }
};

ENEMY_BEHAVIOR_HANDLERS.uch3Mirebrood = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 200) uchStep(game, e, dt, -v.x, -v.y, 0.55);
  if (e.uchSpawned === undefined) e.uchSpawned = 0;
  e.uchCd = (e.uchCd === undefined) ? Util.rand(2, 3) : e.uchCd - dt;
  if (e.uchCd <= 0 && e.uchSpawned < 3) {
    const ang = Util.rand(0, Math.PI * 2);
    uchSpawn(game, game.currentRoom, 'junglestalker', e.x + Math.cos(ang) * 70, e.y + Math.sin(ang) * 70);
    e.uchSpawned++; e.uchCd = t.spawnCooldown || 4;
    e.hitFlash = 0.15;
  }
};

ENEMY_BEHAVIOR_HANDLERS.uch3Jungleweaver = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  uchStep(game, e, dt, v.x, v.y, 0.75);
  const node = game.currentRoom;
  node.uchWebs = node.uchWebs || [];
  e.uchCd = (e.uchCd === undefined) ? t.webCooldown || 2.4 : e.uchCd - dt;
  if (e.uchCd <= 0) { node.uchWebs.push({ x: e.x, y: e.y, life: 6 }); e.uchCd = t.webCooldown || 2.4; e.hitFlash = 0.1; }
  for (let i = node.uchWebs.length - 1; i >= 0; i--) {
    const w = node.uchWebs[i];
    w.life -= dt;
    if (w.life <= 0) { node.uchWebs.splice(i, 1); continue; }
    if (Util.dist(w.x, w.y, player.x, player.y) < 20 + player.radius) player.freezeTimer = Math.max(player.freezeTimer, 0.15);
  }
  if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
};

ENEMY_BEHAVIOR_HANDLERS.uch3Idolcolossus = function(game, e, dt){
  const player = game.player, t = e.type;
  e.uchCd = (e.uchCd === undefined) ? t.novaCooldown || 3.2 : e.uchCd - dt;
  if (e.uchCd <= 0) {
    e.uchCd = t.novaCooldown || 3.2;
    e.hitFlash = 0.2;
    uchArc(game, e, 0, 12, Math.PI * 2, 160, { color: '#c8b880', radius: 4 });
    const r = t.novaRadius || 120;
    if (Util.dist(e.x, e.y, player.x, player.y) < r) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
  }
};
