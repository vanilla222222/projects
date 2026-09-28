'use strict';

ENEMY_BEHAVIOR_HANDLERS.reck3Voidrend = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  const node = game.currentRoom;
  node.reckRifts = node.reckRifts || [];
  const moved = reckStep(game, e, dt, v.x, v.y, 1.1);
  if (moved.movedX || moved.movedY) node.reckRifts.push({ x: e.x, y: e.y, life: 1.4 });
  for (let i = node.reckRifts.length - 1; i >= 0; i--) {
    const r = node.reckRifts[i];
    r.life -= dt;
    if (r.life <= 0) { node.reckRifts.splice(i, 1); continue; }
    if (Util.dist(r.x, r.y, player.x, player.y) < 18 + player.radius) {
      r.tick = (r.tick || 0) - dt;
      if (r.tick <= 0) { damagePlayer(game, playerDamageAmount(game, false, 1), t.id); r.tick = 0.4; }
    }
  }
  if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
};

ENEMY_BEHAVIOR_HANDLERS.reck3Stormherald = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  const keep = t.keepDistance || 220;
  if (v.d < keep) reckStep(game, e, dt, -v.x, -v.y, 0.6);
  else reckStep(game, e, dt, v.x, v.y, 0.6);
  e.reckStrike = (e.reckStrike || 0) - dt;
  if (e.reckStrike === undefined || e.reckStrike <= 0) {
    e.reckStrike = t.strikeCooldown || 2.2;
    e.reckTelX = player.x + Util.rand(-70, 70);
    e.reckTelY = player.y + Util.rand(-70, 70);
    e.reckTel = 0.7;
    e.hitFlash = 0.1;
  }
  if (e.reckTel > 0) {
    e.reckTel -= dt;
    if (e.reckTel <= 0) {
      game.explosions.push(new Explosion(e.reckTelX, e.reckTelY, 55));
      if (Util.dist(e.reckTelX, e.reckTelY, player.x, player.y) < 55 + player.radius) damagePlayer(game, playerDamageAmount(game, false, e.dmg + 1), t.id);
    }
  }
};

ENEMY_BEHAVIOR_HANDLERS.reck3Hollowmarch = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  reckStep(game, e, dt, v.x, v.y, 0.55);
  e.reckPulse = (e.reckPulse === undefined) ? (t.pulseCooldown || 2.6) : e.reckPulse - dt;
  if (e.reckPulse <= 0) {
    e.reckPulse = t.pulseCooldown || 2.6;
    const r = t.pulseRadius || 100;
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

ENEMY_BEHAVIOR_HANDLERS.reck3Nightveil = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.reckPX === undefined) { e.reckPX = player.x; e.reckPY = player.y; }
  const mx = player.x - e.reckPX, my = player.y - e.reckPY;
  e.reckPX = player.x; e.reckPY = player.y;
  const moving = Math.hypot(mx, my) > 0.5;
  const v = seekVector(e, player.x, player.y);
  if (moving) {
    reckStep(game, e, dt, -mx, -my, 1.3);
    e.alpha = 0.9;
  } else {
    e.alpha = 0.4;
    if (v.d > (t.strikeRange || 60)) reckStep(game, e, dt, v.x, v.y, 1.4);
    else if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg + 1), t.id);
  }
};

ENEMY_BEHAVIOR_HANDLERS.reck3Voidcarver = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  reckStep(game, e, dt, v.x, v.y, 0.85);
  if (e.reckSpin === undefined) e.reckSpin = 0;
  e.reckSpin += dt * 4;
  const r = t.bladeRadius || 46;
  const bx = e.x + Math.cos(e.reckSpin) * r, by = e.y + Math.sin(e.reckSpin) * r;
  if (Util.dist(bx, by, player.x, player.y) < 14 + player.radius) {
    e.reckHitCd = (e.reckHitCd || 0) - dt;
    if (e.reckHitCd <= 0) { damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id); e.reckHitCd = 0.35; }
  }
};

ENEMY_BEHAVIOR_HANDLERS.reck3Frostbastion = function(game, e, dt){
  const player = game.player, t = e.type;
  e.reckNova = (e.reckNova === undefined) ? (t.novaCooldown || 3) : e.reckNova - dt;
  if (e.reckNova <= 0) {
    e.reckNova = t.novaCooldown || 3;
    reckArc(game, e, 0, 12, Math.PI * 2, 150, { color: '#cfeaf5', radius: 4 });
    const r = t.novaRadius || 110;
    if (Util.dist(e.x, e.y, player.x, player.y) < r) player.freezeTimer = Math.max(player.freezeTimer, 0.35);
    e.hitFlash = 0.2;
  }
};

ENEMY_BEHAVIOR_HANDLERS.reck3Rimewarden = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  const keep = t.keepDistance || 180;
  if (v.d < keep) reckStep(game, e, dt, -v.x, -v.y, 0.7);
  else reckStep(game, e, dt, v.x, v.y, 0.7);
  e.reckReflect = (e.reckReflect || 0) - dt;
  if (e.reckReflect <= 0 && v.d < 260) {
    e.reckReflect = (t.reflectWindow || 1.2) + 1.6;
    e.shielded = true;
    e.reckReflecting = t.reflectWindow || 1.2;
  }
  if (e.reckReflecting > 0) {
    e.reckReflecting -= dt;
    if (e.reckReflecting <= 0) e.shielded = false;
  }
};

ENEMY_BEHAVIOR_HANDLERS.reck3Glaciermaw = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.reckBurrow === undefined) { e.reckBurrow = 0; e.reckCd = Util.rand(0.5, 1.5); }
  if (e.reckBurrow > 0) {
    e.reckBurrow -= dt;
    e.submerged = true; e.shielded = true;
    if (e.reckBurrow <= 0) {
      e.submerged = false; e.shielded = false;
      const spot = findNearestFloor(game.currentRoom, Math.floor(player.x / TILE), Math.floor(player.y / TILE));
      e.x = spot.x; e.y = spot.y;
      if (Util.dist(e.x, e.y, player.x, player.y) < e.radius + player.radius + 20) {
        damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
        player.freezeTimer = Math.max(player.freezeTimer, 0.3);
      }
      e.reckCd = t.burrowCooldown || 2.6;
      e.hitFlash = 0.15;
    }
    return;
  }
  e.reckCd -= dt;
  if (e.reckCd <= 0) e.reckBurrow = t.burrowTime || 1.1;
};

ENEMY_BEHAVIOR_HANDLERS.reck3Stonechant = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 150) reckStep(game, e, dt, -v.x, -v.y, 0.6);
  else reckStep(game, e, dt, v.x, v.y, 0.55);
  e.reckRally = (e.reckRally === undefined) ? (t.rallyCooldown || 4.5) : e.reckRally - dt;
  if (e.reckRally <= 0) {
    e.reckRally = t.rallyCooldown || 4.5;
    e.hitFlash = 0.15;
    for (const en of game.currentRoom.enemies) {
      if (en !== e && en.type && en.type.floorKey === '9B' && Util.dist(e.x, e.y, en.x, en.y) < (t.rallyRadius || 170)) {
        en.dmg = (en.dmg || 1) + 1;
        en.reckRallyT = 3;
      }
    }
  }
  if (e.reckRallyT > 0) {
    e.reckRallyT -= dt;
    if (e.reckRallyT <= 0) e.dmg = Math.max(1, e.dmg - 1);
  }
};

ENEMY_BEHAVIOR_HANDLERS.reck3Shatterbrand = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.reckState === undefined) { e.reckState = 'seek'; e.reckCd = 0; }
  const v = seekVector(e, player.x, player.y);
  if (e.reckState === 'telegraph') {
    e.reckTimer -= dt;
    e.hitFlash = 0.08;
    if (e.reckTimer <= 0) { e.reckState = 'charge'; e.reckDX = v.x; e.reckDY = v.y; }
    return;
  }
  if (e.reckState === 'charge') {
    const r = reckStep(game, e, dt, e.reckDX, e.reckDY, t.chargeSpeed || 6.8);
    if (Util.dist(e.x, e.y, player.x, player.y) < e.radius + player.radius) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
    if (!r.movedX && !r.movedY) {
      reckArc(game, e, 0, 8, Math.PI * 2, 220, { color: '#b8dcec', radius: 4 });
      e.reckState = 'seek'; e.reckCd = t.chargeCooldown || 2.4;
    }
    return;
  }
  reckStep(game, e, dt, v.x, v.y, 1);
  e.reckCd -= dt;
  if (e.reckCd <= 0 && v.d < 250) { e.reckState = 'telegraph'; e.reckTimer = t.telegraphTime || 0.5; }
};
