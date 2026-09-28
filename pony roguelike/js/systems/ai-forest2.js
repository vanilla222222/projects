'use strict';

ENEMY_BEHAVIOR_HANDLERS.fr2Bramblewarden = function(game, e, dt){
  const player = game.player, t = e.type, node = game.currentRoom;
  if (e.fr2Ward === undefined) { e.fr2Ward = null; e.fr2Orbit = RNG.random() * Math.PI * 2; e.attackTimer = 0; }
  const R = t.shieldRadius || 135;
  if (e.fr2Ward && (e.fr2Ward.isDead || Util.dist(e.x, e.y, e.fr2Ward.x, e.fr2Ward.y) > R * 2)) {
    if (!e.fr2Ward.isDead) e.fr2Ward.shielded = false;
    e.fr2Ward = null;
    e.attackTimer = t.shieldCooldown || 5;
  }
  if (!e.fr2Ward) {
    e.attackTimer -= dt;
    if (e.attackTimer <= 0) {
      let best = null, bd = R * 2;
      for (const o of node.enemies) {
        if (o === e || o.isDead || o.shielded || o.isBoss) continue;
        const d = Util.dist(e.x, e.y, o.x, o.y);
        if (d < bd) { bd = d; best = o; }
      }
      if (best) { e.fr2Ward = best; best.shielded = true; e.hitFlash = 0.16; }
      else e.attackTimer = 1.2;
    }
  }
  if (e.fr2Ward) {
    const w = e.fr2Ward;
    e.fr2Orbit += dt * 1.7;
    const tx = w.x + Math.cos(e.fr2Orbit) * 52, ty = w.y + Math.sin(e.fr2Orbit) * 52;
    const wv = seekVector(e, tx, ty);
    forestStep(game, e, dt, wv.x, wv.y, wv.d > 12 ? 1.2 : 0.3);
    return;
  }
  const v = seekVector(e, player.x, player.y);
  const keep = t.keepDistance || 195;
  const away = v.d < keep;
  forestStep(game, e, dt, away ? -v.x : v.x, away ? -v.y : v.y, 0.9);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && v.d < 340) {
    e.fireTimer = 2.6;
    forestArc(game, e, forestAim(e, player), 5, 1.15, 155, { color: '#8ac06a', radius: 5 });
  }
};

ENEMY_BEHAVIOR_HANDLERS.fr2Acornmortar = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.fr2Shell === undefined) { e.fr2Shell = null; e.fr2Strafe = RNG.random() < 0.5 ? 1 : -1; }
  if (e.fr2Shell) {
    const s = e.fr2Shell;
    s.t -= dt;
    e.hitFlash = (Math.sin(s.t * 22) > 0) ? 0.14 : 0;
    if (s.t <= 0) {
      const R = t.burstRadius || 46;
      game.explosions.push(new Explosion(s.x, s.y, R));
      if (Util.dist(s.x, s.y, player.x, player.y) < R + player.radius) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
      e.fr2Shell = null;
      e.fireTimer = t.fireCooldown || 2.5;
    }
  }
  const v = seekVector(e, player.x, player.y);
  const range = t.lobRange || 265;
  const radial = v.d > range + 40 ? 1 : (v.d < range - 60 ? -1 : 0);
  forestStep(game, e, dt, v.x * radial - v.y * e.fr2Strafe * 0.7, v.y * radial + v.x * e.fr2Strafe * 0.7, 1);
  e.fireTimer -= dt;
  if (!e.fr2Shell && e.fireTimer <= 0 && v.d < range + 90) {
    const lead = t.lobTime || 1.1;
    e.fr2Shell = { x: player.x + (player.vx || 0) * lead * 0.45, y: player.y + (player.vy || 0) * lead * 0.45, t: lead };
    e.fr2Strafe = -e.fr2Strafe;
  }
};

ENEMY_BEHAVIOR_HANDLERS.fr2Bristleback = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.fr2Bristle === undefined) e.fr2Bristle = 0;
  const v = seekVector(e, player.x, player.y);
  const keep = t.keepDistance || 130;
  if (e.fr2Bristle > 0) {
    e.fr2Bristle -= dt;
    e.hitFlash = 0.1;
    forestStep(game, e, dt, -v.x, -v.y, 1.45);
    if (e.fr2Bristle <= 0) {
      forestArc(game, e, forestAim(e, player), t.shotCount || 5, t.spreadAngle || 0.9, (t.boltSpeed || 170) * 0.9,
        { color: t.boltColor || '#c9e07a', radius: t.boltRadius || 4 });
      e.fireTimer = t.fireCooldown || 2.4;
    }
    return;
  }
  const away = v.d < keep;
  forestStep(game, e, dt, away ? -v.x : v.x, away ? -v.y : v.y, 0.95);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) {
    if (v.d < keep * 0.85) e.fr2Bristle = 0.45;
    else if (v.d < 330) {
      forestArc(game, e, forestAim(e, player), 3, 0.28, t.boltSpeed || 170, { color: t.boltColor || '#c9e07a', radius: t.boltRadius || 4 });
      e.fireTimer = (t.fireCooldown || 2.4) * 0.65;
    }
  }
};

ENEMY_BEHAVIOR_HANDLERS.fr2Hivestump = function(game, e, dt){
  const player = game.player, t = e.type, node = game.currentRoom;
  if (e.fr2Open === undefined) { e.fr2Open = 0; e.fr2Shut = Util.rand(1, 1.8); e.minionsSpawned = e.minionsSpawned || 0; }
  const v = seekVector(e, player.x, player.y);
  const keep = t.keepDistance || 210;
  if (e.fr2Open > 0) {
    e.shielded = false;
    e.fr2Open -= dt;
    forestStep(game, e, dt, -v.x, -v.y, 0.5);
    e.summonTimer -= dt;
    if (e.summonTimer <= 0) {
      e.summonTimer = 0.75;
      const a = RNG.random() * Math.PI * 2;
      if (e.minionsSpawned < (t.maxSummons || 5) && forestSpawn(game, node, t.summonId, e.x + Math.cos(a) * 34, e.y + Math.sin(a) * 34)) e.minionsSpawned++;
      forestRing(game, e, 5, 120, { color: '#e0c06a', radius: 4 }, a);
    }
    if (e.fr2Open <= 0) { e.fr2Shut = Util.rand(1.4, 2.2); e.shielded = true; }
    return;
  }
  e.shielded = true;
  e.fr2Shut -= dt;
  const away = v.d < keep;
  forestStep(game, e, dt, away ? -v.x : v.x, away ? -v.y : v.y, 0.7);
  if (e.fr2Shut <= 0) { e.fr2Open = 2.2; e.summonTimer = 0.3; e.shielded = false; e.hitFlash = 0.16; }
};

ENEMY_BEHAVIOR_HANDLERS.fr2Puffcap = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.fr2Stage === undefined) { e.fr2Stage = 0; e.fr2Beat = 0.6; }
  const v = seekVector(e, player.x, player.y);
  if (e.arming) {
    e.fuseTimer -= dt;
    e.hitFlash = (Math.sin(e.fuseTimer * 30) > 0) ? 0.14 : 0;
    forestStep(game, e, dt, v.x, v.y, 0.3);
    if (e.fuseTimer <= 0) {
      e.isDead = true;
      const R = (t.blastRadius || 86) * (1 + e.fr2Stage * 0.18);
      game.explosions.push(new Explosion(e.x, e.y, R));
      forestRing(game, e, 6 + e.fr2Stage * 3, 110, { color: '#d9c9a0', radius: 6 }, RNG.random());
      if (Util.dist(e.x, e.y, player.x, player.y) < R + player.radius) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
      handleEnemyDeath(game, e);
    }
    return;
  }
  e.fr2Beat -= dt;
  if (e.fr2Beat <= 0) {
    e.fr2Beat = 1.1;
    if (e.fr2Stage < 3) {
      e.fr2Stage++;
      e.radius += 1.2;
      e.hitFlash = 0.12;
      forestRing(game, e, 4, 92, { color: '#cfc0a0', radius: 4 }, e.fr2Stage * 0.5);
    }
  }
  forestStep(game, e, dt, v.x, v.y, 0.7 + e.fr2Stage * 0.28);
  if (v.d < 48 + e.fr2Stage * 6) { e.arming = true; e.fuseTimer = t.fuseTime || 1.3; }
};

ENEMY_BEHAVIOR_HANDLERS.fr2Loamweaver = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.fr2Dig === undefined) { e.fr2Dig = Util.rand(1.4, 2.4); e.fr2Phase = RNG.random() * Math.PI * 2; e.submerged = false; }
  const v = seekVector(e, player.x, player.y);
  e.fr2Dig -= dt;
  if (e.submerged) {
    forestStep(game, e, dt, v.x, v.y, 1.9);
    if (e.fr2Dig <= 0 || v.d < 34) {
      e.submerged = false;
      e.fr2Dig = Util.rand(2, 3.2);
      e.hitFlash = 0.18;
      forestRing(game, e, 6, 165, { color: '#8a6a3a', radius: 5 }, RNG.random());
      if (v.d < 54) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
    }
    return;
  }
  e.fr2Phase += dt * (t.weaveFrequency || 3);
  const w = Math.sin(e.fr2Phase) * (t.weaveAmplitude || 0.6);
  forestStep(game, e, dt, v.x - v.y * w, v.y + v.x * w, 1);
  if (e.fr2Dig <= 0 && v.d > 90) { e.submerged = true; e.fr2Dig = Util.rand(1.2, 2); }
};

ENEMY_BEHAVIOR_HANDLERS.fr2Oaksentry = function(game, e, dt){
  const player = game.player, t = e.type, node = game.currentRoom;
  if (e.fr2Slam === undefined) { e.fr2Slam = 0; e.fr2Lock = 0; }
  const v = seekVector(e, player.x, player.y);
  if (e.fr2Slam > 0) {
    e.fr2Slam -= dt;
    e.hitFlash = 0.14;
    if (e.fr2Slam <= 0) {
      game.explosions.push(new Explosion(e.x, e.y, 64));
      forestRing(game, e, 10, 150, { color: '#a88a4a', radius: 6 }, RNG.random());
      if (v.d < 70 + player.radius) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
      e.fireTimer = 1.2;
    }
    return;
  }
  if (v.d < (t.sentryThreshold || 32) + 68) { e.fr2Slam = 0.5; e.fr2Lock = 0; return; }
  if (!hasLineOfSight(node, e, player.x, player.y)) {
    e.fr2Lock = 0;
    chaseSeek(game, e, player.x, player.y, 0.9, dt);
    return;
  }
  e.fr2Lock += dt;
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && v.d < (t.fireRange || 430)) {
    const locked = e.fr2Lock > 2.5;
    e.fireTimer = (t.fireCooldown || 1.4) * (locked ? 0.55 : 1);
    fireProjectileAngle(game, e, forestAim(e, player), (t.boltSpeed || 205) * (locked ? 1.3 : 1), e.dmg,
      { color: t.boltColor || '#c9e07a', radius: t.boltRadius || 5 });
  }
};

ENEMY_BEHAVIOR_HANDLERS.fr2Sporechanter = function(game, e, dt){
  const player = game.player, t = e.type, node = game.currentRoom;
  if (e.fr2Chant === undefined) { e.fr2Chant = 0; e.fr2Verse = 0; }
  const v = seekVector(e, player.x, player.y);
  if (e.fr2Chant > 0) {
    e.fr2Chant -= dt;
    e.hitFlash = (Math.sin(e.fr2Chant * 20) > 0) ? 0.1 : 0;
    forestStep(game, e, dt, -v.x, -v.y, 0.35);
    if (e.fr2Chant <= 0) {
      e.fr2Verse++;
      forestArc(game, e, forestAim(e, player), (t.shotCount || 3) + e.fr2Verse, (t.spreadAngle || 0.44) + e.fr2Verse * 0.22,
        (t.boltSpeed || 185) * 0.85, { color: t.boltColor || '#b4e08a', radius: t.boltRadius || 4 });
      let full = false;
      if (e.fr2Verse >= 3) {
        e.fr2Verse = 0;
        full = true;
        for (const o of node.enemies) {
          if (o === e || o.isDead || o.isBoss || o.hp >= o.maxHp) continue;
          if (Util.dist(e.x, e.y, o.x, o.y) > 150) continue;
          o.hp = Math.min(o.maxHp, o.hp + 1);
          game.floatTexts.push(new FloatText(o.x, o.y - o.radius - 6, '+1', Theme.floatText.heal));
        }
      }
      e.fireTimer = (t.fireCooldown || 2.1) * (full ? 1.6 : 0.55);
    }
    return;
  }
  const keep = t.keepDistance || 200;
  const away = v.d < keep;
  forestStep(game, e, dt, away ? -v.x : v.x, away ? -v.y : v.y, 0.9);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && v.d < 370) e.fr2Chant = 0.55;
};

ENEMY_BEHAVIOR_HANDLERS.fr2Mistlestag = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.fr2Bounce === undefined) e.fr2Bounce = 0;
  if (e.dashing) {
    const r = forestStep(game, e, dt, e.dashVX, e.dashVY, t.chargeSpeed || 6.3);
    e.dashTimer -= dt;
    const blocked = !r.movedX && !r.movedY;
    if (blocked && e.fr2Bounce > 0) {
      e.fr2Bounce--;
      const a = Math.atan2(e.dashVY, e.dashVX) + (RNG.random() < 0.5 ? 1 : -1) * Math.PI / 2;
      e.dashVX = Math.cos(a); e.dashVY = Math.sin(a);
      e.dashTimer = 0.4;
      e.hitFlash = 0.14;
      forestRing(game, e, 3, 145, { color: '#cfe0b0', radius: 4 }, a);
      return;
    }
    if (blocked || e.dashTimer <= 0) { e.dashing = false; e.attackTimer = t.chargeCooldown || 2.3; }
    return;
  }
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 28) > 0) ? 0.13 : 0;
    if (e.telegraph <= 0) {
      const v = seekVector(e, player.x, player.y);
      e.dashing = true; e.dashVX = v.x; e.dashVY = v.y; e.dashTimer = 0.45; e.fr2Bounce = 2;
    }
    return;
  }
  e.attackTimer -= dt;
  const v = seekVector(e, player.x, player.y);
  forestStep(game, e, dt, v.x, v.y, 0.75);
  if (e.attackTimer <= 0 && v.d < 320) e.telegraph = t.telegraphTime || 0.52;
};

ENEMY_BEHAVIOR_HANDLERS.fr2Fungalchoir = function(game, e, dt){
  const player = game.player, t = e.type, node = game.currentRoom;
  if (e.fr2Note === undefined) { e.fr2Note = 0; e.fr2Beat = Util.rand(0.7, 1.3); e.minionsSpawned = e.minionsSpawned || 0; }
  const v = seekVector(e, player.x, player.y);
  const keep = t.keepDistance || 195;
  const away = v.d < keep;
  forestStep(game, e, dt, away ? -v.x : v.x, away ? -v.y : v.y, e.fr2Note > 0 ? 0.4 : 0.9);
  e.fr2Beat -= dt;
  if (e.fr2Beat > 0) return;
  e.fr2Note++;
  e.hitFlash = 0.14;
  if (e.fr2Note < 3) {
    e.fr2Beat = 0.55;
    forestRing(game, e, 4 + e.fr2Note * 2, 120 + e.fr2Note * 30, { color: '#b48ad9', radius: 4 }, e.fr2Note * 0.4);
    return;
  }
  e.fr2Note = 0;
  e.fr2Beat = t.summonCooldown || 6.5;
  for (let i = 0; i < (t.summonCount || 2); i++) {
    if (e.minionsSpawned >= (t.maxSummons || 6)) break;
    const a = RNG.random() * Math.PI * 2;
    if (forestSpawn(game, node, t.summonId, e.x + Math.cos(a) * 46, e.y + Math.sin(a) * 46)) e.minionsSpawned++;
  }
};

ENEMY_BEHAVIOR_HANDLERS.fr2Dewdancer = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.fr2Spin === undefined) { e.fr2Spin = 0; e.fr2T = RNG.random() * Math.PI * 2; e.attackTimer = Util.rand(1, 2); }
  const v = seekVector(e, player.x, player.y);
  if (e.fr2Spin > 0) {
    e.fr2Spin -= dt;
    e.hitFlash = 0.1;
    forestStep(game, e, dt, -v.y, v.x, 1.7);
    if (e.fr2Spin <= 0) {
      forestRing(game, e, 3, 110, { color: '#a8f0dc', radius: 5 }, e.fr2T);
      e.attackTimer = Util.rand(1.6, 2.6);
    }
    return;
  }
  e.fr2T += dt * (t.weaveFrequency || 3.1);
  const lat = Math.sin(e.fr2T) * (t.weaveAmplitude || 0.6);
  const rad = Math.cos(e.fr2T * 0.5) * 0.5 + 0.6;
  forestStep(game, e, dt, v.x * rad - v.y * lat, v.y * rad + v.x * lat, 1);
  e.attackTimer -= dt;
  if (e.attackTimer <= 0 && v.d < 120) e.fr2Spin = 0.4;
};

ENEMY_BEHAVIOR_HANDLERS.fr2Crowsentinel = function(game, e, dt){
  const player = game.player, t = e.type, node = game.currentRoom;
  if (e.fr2Perch === undefined) { e.fr2Perch = null; e.fr2Shots = 0; }
  const v = seekVector(e, player.x, player.y);
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 18) > 0) ? 0.16 : 0;
    if (e.telegraph <= 0) {
      fireProjectileAngle(game, e, forestAim(e, player), t.boltSpeed || 380, e.dmg, { color: '#cfd9f0', radius: 5 });
      e.fireTimer = t.fireCooldown || 2.5;
      e.fr2Shots++;
      if (e.fr2Shots >= 2) { e.fr2Shots = 0; e.fr2Perch = null; }
    }
    return;
  }
  if (!e.fr2Perch) {
    const a = Math.atan2(e.y - player.y, e.x - player.x) + Util.rand(-1.1, 1.1);
    const d = (t.fireRange || 480) * 0.7;
    const spot = findNearestFloor(node, Math.floor((player.x + Math.cos(a) * d) / TILE), Math.floor((player.y + Math.sin(a) * d) / TILE));
    e.fr2Perch = { x: spot.x, y: spot.y };
  }
  const pv = seekVector(e, e.fr2Perch.x, e.fr2Perch.y);
  if (pv.d > 26) { forestStep(game, e, dt, pv.x, pv.y, 1.35); return; }
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && v.d < (t.fireRange || 480) && hasLineOfSight(node, e, player.x, player.y)) e.telegraph = t.telegraphTime || 1.1;
};

ENEMY_BEHAVIOR_HANDLERS.fr2Owlstalker = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.fr2Mode === undefined) { e.fr2Mode = 0; e.fr2Timer = Util.rand(0.8, 1.6); e.fr2Fired = false; }
  const v = seekVector(e, player.x, player.y);
  if (e.fr2Mode === 1) {
    forestStep(game, e, dt, e.dashVX, e.dashVY, t.dashSpeed || 1.5);
    e.fr2Timer -= dt;
    if (!e.fr2Fired && v.d < (t.retreatRange || 120)) {
      e.fr2Fired = true;
      forestArc(game, e, forestAim(e, player), 2, 0.22, t.boltSpeed || 220, { color: '#e0c98a', radius: 4 });
    }
    if (e.fr2Timer <= 0) { e.fr2Mode = 2; e.fr2Timer = Util.rand(0.7, 1.1); }
    return;
  }
  if (e.fr2Mode === 2) {
    forestStep(game, e, dt, -v.x, -v.y, 1.2);
    e.fr2Timer -= dt;
    if (e.fr2Timer <= 0 || v.d > (t.engageRange || 240)) { e.fr2Mode = 0; e.fr2Timer = Util.rand(0.8, 1.5); }
    return;
  }
  forestStep(game, e, dt, v.x, v.y, 0.55);
  e.fr2Timer -= dt;
  if (e.fr2Timer <= 0 && v.d < (t.engageRange || 240)) {
    const sv = seekVector(e, player.x + (player.vx || 0) * 0.35, player.y + (player.vy || 0) * 0.35);
    e.dashVX = sv.x; e.dashVY = sv.y;
    e.fr2Mode = 1; e.fr2Timer = 0.75; e.fr2Fired = false; e.hitFlash = 0.12;
  }
};

ENEMY_BEHAVIOR_HANDLERS.fr2Graveswift = function(game, e, dt){
  const player = game.player, t = e.type, node = game.currentRoom;
  if (e.fr2Way === undefined) e.fr2Way = null;
  if (!e.fr2Way) {
    const a = RNG.random() * Math.PI * 2, d = Util.rand(120, 260);
    const spot = findNearestFloor(node, Math.floor((player.x + Math.cos(a) * d) / TILE), Math.floor((player.y + Math.sin(a) * d) / TILE));
    e.fr2Way = { x: spot.x, y: spot.y };
  }
  const wv = seekVector(e, e.fr2Way.x, e.fr2Way.y);
  const r = forestStep(game, e, dt, wv.x, wv.y, 1.25);
  if (wv.d < 22 || (!r.movedX && !r.movedY)) e.fr2Way = null;
  e.fireTimer -= dt;
  if (e.fireTimer <= 0) {
    e.fireTimer = t.fireCooldown || 1.9;
    const a = Math.atan2(wv.y, wv.x);
    fireProjectileAngle(game, e, a + Math.PI / 2, t.boltSpeed || 175, e.dmg, { color: '#cfc9d9', radius: 4 });
    fireProjectileAngle(game, e, a - Math.PI / 2, t.boltSpeed || 175, e.dmg, { color: '#cfc9d9', radius: 4 });
  }
};

FOREST_ID_AI.thistlepod = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.fr2Bloom === undefined) { e.fr2Bloom = 0; e.fr2Cycle = Util.rand(0.6, 1.6); e.fr2Salvo = 0; }
  const v = seekVector(e, player.x, player.y);
  if (e.fr2Bloom > 0) {
    e.shielded = false;
    e.fr2Bloom -= dt;
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) {
      e.fireTimer = 0.55;
      e.fr2Salvo++;
      if (e.fr2Salvo % 2 === 1) forestArc(game, e, forestAim(e, player), t.shotCount || 3, t.spreadAngle || 0.5, t.boltSpeed || 185,
        { color: t.boltColor || '#a8d96a', radius: t.boltRadius || 5 });
      else forestRing(game, e, 7, (t.boltSpeed || 185) * 0.68, { color: t.boltColor || '#a8d96a', radius: t.boltRadius || 5 }, e.fr2Salvo * 0.45);
    }
    if (e.fr2Bloom <= 0) { e.fr2Cycle = Util.rand(1.8, 2.8); e.shielded = true; }
    return;
  }
  e.shielded = true;
  e.fr2Cycle -= dt;
  if (e.fr2Cycle <= 0 && v.d < 340) { e.fr2Bloom = 2.2; e.fireTimer = 0.25; e.shielded = false; e.hitFlash = 0.16; }
};

FOREST_ID_AI.burrbloater = function(game, e, dt){
  const player = game.player;
  if (e.fr2Roll === undefined) { e.fr2Roll = 0; e.fr2Wind = Util.rand(1, 1.8); e.fr2Shed = 1.2; }
  const v = seekVector(e, player.x, player.y);
  e.fr2Shed -= dt;
  if (e.fr2Shed <= 0) { e.fr2Shed = 1.5; forestRing(game, e, 3, 95, { color: '#9cc04a', radius: 5 }, RNG.random() * Math.PI * 2); }
  if (e.fr2Roll > 0) {
    e.fr2Roll -= dt;
    const r = forestStep(game, e, dt, e.dashVX, e.dashVY, 2.3);
    if (!r.movedX && !r.movedY) {
      e.fr2Roll = 0;
      e.fr2Wind = Util.rand(1.2, 2);
      e.hitFlash = 0.16;
      forestRing(game, e, 6, 130, { color: '#9cc04a', radius: 5 }, RNG.random() * Math.PI * 2);
      return;
    }
    if (e.fr2Roll <= 0) e.fr2Wind = Util.rand(1, 1.7);
    return;
  }
  e.fr2Wind -= dt;
  forestStep(game, e, dt, v.x, v.y, 0.6);
  if (e.fr2Wind <= 0 && v.d < 290) { e.dashVX = v.x; e.dashVY = v.y; e.fr2Roll = 0.85; e.hitFlash = 0.1; }
};

FOREST_ID_AI.heartseedling = function(game, e, dt){
  const player = game.player;
  if (e.fr2Pulse === undefined) { e.fr2Pulse = 0; e.fr2Rest = Util.rand(0.4, 0.9); e.fr2Count = 0; }
  const v = seekVector(e, player.x, player.y);
  if (e.fr2Pulse > 0) {
    e.fr2Pulse -= dt;
    forestStep(game, e, dt, v.x, v.y, 2.1);
    if (e.fr2Pulse <= 0) {
      e.fr2Count++;
      fireProjectileAngle(game, e, Math.atan2(-v.y, -v.x), 95, e.dmg, { color: '#e0788f', radius: 5 });
      if (e.fr2Count >= 2) { e.fr2Count = 0; e.fr2Rest = Util.rand(0.7, 1.1); }
      else e.fr2Rest = 0.14;
    }
    return;
  }
  e.fr2Rest -= dt;
  forestStep(game, e, dt, v.x, v.y, 0.35);
  if (e.fr2Rest <= 0) e.fr2Pulse = 0.26;
};
