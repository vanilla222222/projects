'use strict';

ENEMY_BEHAVIOR_HANDLERS.snk3Crushwraith = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  sunkStep(game, e, dt, v.x, v.y, 0.7);
  e.snkCd = (e.snkCd === undefined) ? t.crushCooldown || 2.8 : e.snkCd - dt;
  if (e.snkCd <= 0) {
    e.snkCd = t.crushCooldown || 2.8;
    e.hitFlash = 0.2;
    const r = t.crushRadius || 100;
    game.explosions.push(new Explosion(e.x, e.y, r));
    const d = Util.dist(e.x, e.y, player.x, player.y);
    if (d < r + player.radius) {
      damagePlayer(game, playerDamageAmount(game, false, e.dmg + 1), t.id);
      const pull = Math.min(30, d);
      const ang = Math.atan2(e.y - player.y, e.x - player.x);
      player.x += Math.cos(ang) * pull; player.y += Math.sin(ang) * pull;
    }
  }
};

ENEMY_BEHAVIOR_HANDLERS.snk3Sonarcolossus = function(game, e, dt){
  const player = game.player, t = e.type;
  e.snkState = e.snkState || 'idle';
  e.snkCd = (e.snkCd === undefined) ? t.pingCooldown || 2.2 : e.snkCd - dt;
  if (e.snkState === 'idle' && e.snkCd <= 0) { e.snkState = 'ping'; e.snkTimer = 0.7; e.hitFlash = 0.15; }
  if (e.snkState === 'ping') {
    e.snkTimer -= dt;
    if (e.snkTimer <= 0) {
      const r = t.pingRadius || 220;
      sunkArc(game, e, 0, 14, Math.PI * 2, 170, { color: '#8ab8f0', radius: 4 });
      if (Util.dist(e.x, e.y, player.x, player.y) < r) player.freezeTimer = Math.max(player.freezeTimer, 0.2);
      e.snkState = 'idle'; e.snkCd = t.pingCooldown || 2.2;
    }
  }
};

ENEMY_BEHAVIOR_HANDLERS.snk3Trenchsiren = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  const keep = t.keepDistance || 210;
  if (v.d < keep) sunkStep(game, e, dt, -v.x, -v.y, 0.6);
  else sunkStep(game, e, dt, v.x, v.y, 0.6);
  e.snkCd = (e.snkCd === undefined) ? 2.2 : e.snkCd - dt;
  if (e.snkCd <= 0) {
    e.snkCd = 2.8;
    e.hitFlash = 0.15;
    if (v.d < (t.luresRadius || 180)) { const pull = 26; player.x -= v.x * pull; player.y -= v.y * pull; }
    fireProjectileAngle(game, e, sunkAim(e, player), 190, e.dmg, { color: '#4a78c0' });
  }
};

ENEMY_BEHAVIOR_HANDLERS.snk3Abysshulk = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (e.snkRoll === undefined) { e.snkRoll = false; e.snkCd = 1; e.snkSpeed = 1; }
  if (e.snkRoll) {
    e.snkSpeed = Math.min(e.snkSpeed + dt * 1.5, 4);
    const r = sunkStep(game, e, dt, e.snkDX, e.snkDY, e.snkSpeed);
    if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg + (e.snkSpeed > 3 ? 1 : 0)), t.id);
    if (!r.movedX && !r.movedY) { e.snkRoll = false; e.snkSpeed = 1; e.snkCd = t.rollCooldown || 3.4; }
    return;
  }
  sunkStep(game, e, dt, v.x, v.y, 0.55);
  e.snkCd -= dt;
  if (e.snkCd <= 0 && v.d < 260) { e.snkRoll = true; e.snkDX = v.x; e.snkDY = v.y; }
};

ENEMY_BEHAVIOR_HANDLERS.snk3Fathomstalker = function(game, e, dt){
  const player = game.player, t = e.type;
  const node = game.currentRoom;
  const cx = (node.tileW || 0) * TILE / 2;
  const cy = (node.tileH || 0) * TILE / 2;
  const v = seekVector(e, player.x, player.y);
  if (v.d < (t.mirrorRange || 250)) {
    sunkStep(game, e, dt, v.x, v.y, 1.3);
    if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
  } else {
    const mx = cx - (player.x - cx), my = cy - (player.y - cy);
    sunkStep(game, e, dt, mx - e.x, my - e.y, 0.9);
  }
};

ENEMY_BEHAVIOR_HANDLERS.snk3Coralbrood = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 200) sunkStep(game, e, dt, -v.x, -v.y, 0.55);
  if (e.snkSpawned === undefined) e.snkSpawned = 0;
  e.snkCd = (e.snkCd === undefined) ? Util.rand(2, 3) : e.snkCd - dt;
  if (e.snkCd <= 0 && e.snkSpawned < 3) {
    const ang = Util.rand(0, Math.PI * 2);
    sunkSpawn(game, game.currentRoom, 'reefstalker', e.x + Math.cos(ang) * 70, e.y + Math.sin(ang) * 70);
    e.snkSpawned++; e.snkCd = t.spawnCooldown || 4;
    e.hitFlash = 0.15;
  }
};

ENEMY_BEHAVIOR_HANDLERS.snk3Reeftitan = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  sunkStep(game, e, dt, v.x, v.y, 0.55);
  e.snkCd = (e.snkCd === undefined) ? t.pulseCooldown || 3 : e.snkCd - dt;
  if (e.snkCd <= 0) {
    e.snkCd = t.pulseCooldown || 3;
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

ENEMY_BEHAVIOR_HANDLERS.snk3Bloomweaver = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  sunkStep(game, e, dt, v.x, v.y, 0.75);
  const node = game.currentRoom;
  node.snkSpores = node.snkSpores || [];
  e.snkCd = (e.snkCd === undefined) ? t.webCooldown || 2.4 : e.snkCd - dt;
  if (e.snkCd <= 0) { node.snkSpores.push({ x: e.x, y: e.y, life: 6 }); e.snkCd = t.webCooldown || 2.4; e.hitFlash = 0.1; }
  for (let i = node.snkSpores.length - 1; i >= 0; i--) {
    const s = node.snkSpores[i];
    s.life -= dt;
    if (s.life <= 0) { node.snkSpores.splice(i, 1); continue; }
    if (Util.dist(s.x, s.y, player.x, player.y) < 20 + player.radius) {
      s.tick = (s.tick || 0) - dt;
      if (s.tick <= 0) { damagePlayer(game, playerDamageAmount(game, false, 1), t.id); s.tick = 0.5; }
    }
  }
  if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
};

ENEMY_BEHAVIOR_HANDLERS.snk3Tideguardian = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 220) sunkStep(game, e, dt, -v.x, -v.y, 0.55);
  e.snkCd = (e.snkCd === undefined) ? t.barrageCooldown || 2.6 : e.snkCd - dt;
  if (e.snkCd <= 0) {
    e.snkCd = t.barrageCooldown || 2.6;
    e.hitFlash = 0.12;
    sunkArc(game, e, sunkAim(e, player), 7, Math.PI * 0.5, 210, { color: '#2ab0c8' });
  }
};

ENEMY_BEHAVIOR_HANDLERS.snk3Leviathanidol = function(game, e, dt){
  const player = game.player, t = e.type;
  e.snkCd = (e.snkCd === undefined) ? t.novaCooldown || 3.2 : e.snkCd - dt;
  if (e.snkCd <= 0) {
    e.snkCd = t.novaCooldown || 3.2;
    e.hitFlash = 0.2;
    sunkArc(game, e, 0, 12, Math.PI * 2, 160, { color: '#0f8a70', radius: 4 });
    const r = t.novaRadius || 120;
    if (Util.dist(e.x, e.y, player.x, player.y) < r) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
  }
};
