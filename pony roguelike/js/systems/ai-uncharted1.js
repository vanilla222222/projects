'use strict';

function uchStep(game, e, dt, dx, dy, mul){
  const node = game.currentRoom;
  const len = Math.hypot(dx, dy) || 1;
  return tryMoveEntity(e, node, node.obstacles, (dx / len) * e.speed * (mul || 1) * dt, (dy / len) * e.speed * (mul || 1) * dt);
}

function uchAim(e, player){
  return Math.atan2(player.y - e.y, player.x - e.x);
}

function uchArc(game, e, ang, count, spread, speed, opts){
  const start = ang - spread / 2;
  const step = count > 1 ? spread / (count - 1) : 0;
  for (let i = 0; i < count; i++) fireProjectileAngle(game, e, start + step * i, speed, e.dmg, opts);
}

function uchSpawn(game, node, id, x, y){
  const def = ENEMY_TYPES[id];
  if (!def) return null;
  const spot = findNearestFloor(node, Math.floor(x / TILE), Math.floor(y / TILE));
  const en = new Enemy(def, spot.x, spot.y, game.dungeon.floorNum);
  node.enemies.push(en);
  return en;
}

ENEMY_BEHAVIOR_HANDLERS.uch1Icecrawler = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.uchRime === undefined) e.uchRime = 0;
  const v = seekVector(e, player.x, player.y);
  uchStep(game, e, dt, v.x, v.y, 1);
  if (v.d < e.radius + player.radius + 4) {
    e.uchRime += dt;
    player.freezeTimer = Math.max(player.freezeTimer, Math.min(e.uchRime * 0.2, 0.5));
    damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
  } else e.uchRime = Math.max(0, e.uchRime - dt);
};

ENEMY_BEHAVIOR_HANDLERS.uch1Glacierbeast = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  const enraged = e.hp < e.maxHp * 0.5;
  uchStep(game, e, dt, v.x, v.y, enraged ? 1.5 : 0.9);
  if (enraged) e.hitFlash = Math.max(e.hitFlash || 0, 0.05);
  if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg + (enraged ? 1 : 0)), t.id);
};

ENEMY_BEHAVIOR_HANDLERS.uch1Snowdrifter = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.uchDrift === undefined) e.uchDrift = Util.rand(0, Math.PI * 2);
  e.uchDrift += dt * 1.6;
  const v = seekVector(e, player.x, player.y);
  const perp = Math.atan2(v.y, v.x) + Math.PI / 2;
  const dx = v.x + Math.cos(perp) * 0.6 * Math.sin(e.uchDrift);
  const dy = v.y + Math.sin(perp) * 0.6 * Math.sin(e.uchDrift);
  uchStep(game, e, dt, dx, dy, 1);
  if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
};

ENEMY_BEHAVIOR_HANDLERS.uch1Frostbomber = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (e.uchFuse > 0) {
    e.uchFuse -= dt;
    e.hitFlash = 0.1;
    if (e.uchFuse <= 0) {
      game.explosions.push(new Explosion(e.x, e.y, 60));
      if (Util.dist(e.x, e.y, player.x, player.y) < 60 + player.radius) {
        damagePlayer(game, playerDamageAmount(game, false, e.dmg + 1), t.id);
        player.freezeTimer = Math.max(player.freezeTimer, 0.4);
      }
      e.hp = 0;
    }
    return;
  }
  uchStep(game, e, dt, v.x, v.y, 1.1);
  if (v.d < 50) e.uchFuse = 0.6;
};

ENEMY_BEHAVIOR_HANDLERS.uch1Permafrostguard = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  uchStep(game, e, dt, v.x, v.y, 0.6);
  e.uchCycle = (e.uchCycle === undefined) ? 0 : e.uchCycle + dt;
  e.shielded = Math.sin(e.uchCycle * 1.2) > -0.3;
  if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
};

ENEMY_BEHAVIOR_HANDLERS.uch1Avalanchecharger = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.uchState === undefined) { e.uchState = 'seek'; e.uchCd = 0; }
  const v = seekVector(e, player.x, player.y);
  if (e.uchState === 'telegraph') {
    e.uchTimer -= dt; e.hitFlash = 0.08;
    if (e.uchTimer <= 0) { e.uchState = 'charge'; e.uchDX = v.x; e.uchDY = v.y; }
    return;
  }
  if (e.uchState === 'charge') {
    const r = uchStep(game, e, dt, e.uchDX, e.uchDY, 6.5);
    if (Util.dist(e.x, e.y, player.x, player.y) < e.radius + player.radius) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
    if (!r.movedX && !r.movedY) { e.uchState = 'seek'; e.uchCd = 2.2; }
    return;
  }
  uchStep(game, e, dt, v.x, v.y, 0.8);
  e.uchCd -= dt;
  if (e.uchCd <= 0 && v.d < 260) { e.uchState = 'telegraph'; e.uchTimer = 0.5; }
};

ENEMY_BEHAVIOR_HANDLERS.uch1Icicleturret = function(game, e, dt){
  const player = game.player, t = e.type;
  e.uchShot = (e.uchShot === undefined) ? Util.rand(0.6, 1.4) : e.uchShot - dt;
  if (e.uchShot <= 0) {
    e.uchBurst = (e.uchBurst || 0) + 1;
    const wide = e.uchBurst % 3 === 0;
    uchArc(game, e, uchAim(e, player), wide ? 5 : 1, wide ? Math.PI / 2 : 0, 220, { color: '#cdeefa', radius: 4 });
    e.uchShot = 1.4;
    e.hitFlash = 0.1;
  }
};

ENEMY_BEHAVIOR_HANDLERS.uch1Snowpouncer = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (e.uchLeap > 0) {
    e.uchLeap -= dt;
    uchStep(game, e, dt, e.uchLDX, e.uchLDY, 5);
    if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg + 1), t.id);
    if (e.uchLeap <= 0) e.uchCd = 1.6;
    return;
  }
  uchStep(game, e, dt, v.x, v.y, 0.75);
  e.uchCd = (e.uchCd === undefined) ? 0 : e.uchCd - dt;
  if (e.uchCd <= 0 && v.d < 180) { e.uchLeap = 0.4; e.uchLDX = v.x; e.uchLDY = v.y; }
};

ENEMY_BEHAVIOR_HANDLERS.uch1Frostarcher = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 160) uchStep(game, e, dt, -v.x, -v.y, 0.7);
  else if (v.d > 260) uchStep(game, e, dt, v.x, v.y, 0.7);
  e.uchShot = (e.uchShot === undefined) ? 1 : e.uchShot - dt;
  if (e.uchShot <= 0) { fireProjectileAngle(game, e, uchAim(e, player), 260, e.dmg, { color: '#bfe8f8' }); e.uchShot = 1.1; }
};

ENEMY_BEHAVIOR_HANDLERS.uch1Blizzardcaller = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 200) uchStep(game, e, dt, -v.x, -v.y, 0.6);
  e.uchShot = (e.uchShot === undefined) ? 1.4 : e.uchShot - dt;
  if (e.uchShot <= 0) {
    const ang = uchAim(e, player) + Util.rand(-0.15, 0.15);
    fireProjectileAngle(game, e, ang, 200, e.dmg, { color: '#e6f7ff' });
    for (const en of game.currentRoom.enemies) {
      if (en !== e && en.type && en.type.floorKey === '10A' && en.uchShot !== undefined && Util.dist(e.x, e.y, en.x, en.y) < 200) en.uchShot = Math.min(en.uchShot, 0.15);
    }
    e.uchShot = 1.5;
  }
};

ENEMY_BEHAVIOR_HANDLERS.uch1Glacialcircler = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.uchAng === undefined) e.uchAng = Util.rand(0, Math.PI * 2);
  e.uchAng += dt * 1.1;
  const r = 130;
  const tx = player.x + Math.cos(e.uchAng) * r, ty = player.y + Math.sin(e.uchAng) * r;
  const dx = tx - e.x, dy = ty - e.y;
  uchStep(game, e, dt, dx, dy, 1);
  e.uchShot = (e.uchShot === undefined) ? 1 : e.uchShot - dt;
  if (e.uchShot <= 0) { fireProjectileAngle(game, e, uchAim(e, player), 210, e.dmg, { color: '#cfeaf5' }); e.uchShot = 1.3; }
};

ENEMY_BEHAVIOR_HANDLERS.uch1Crevassedelver = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.uchBurrow === undefined) { e.uchBurrow = 0; e.uchCd = Util.rand(0.5, 1.5); }
  if (e.uchBurrow > 0) {
    e.uchBurrow -= dt; e.submerged = true; e.shielded = true;
    if (e.uchBurrow <= 0) {
      e.submerged = false; e.shielded = false;
      const spot = findNearestFloor(game.currentRoom, Math.floor(player.x / TILE), Math.floor(player.y / TILE));
      e.x = spot.x; e.y = spot.y;
      if (Util.dist(e.x, e.y, player.x, player.y) < e.radius + player.radius + 20) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
      e.uchCd = 2.4; e.hitFlash = 0.15;
    }
    return;
  }
  e.uchCd -= dt;
  if (e.uchCd <= 0) e.uchBurrow = 1;
};

ENEMY_BEHAVIOR_HANDLERS.uch1Rimecaller = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 200) uchStep(game, e, dt, -v.x, -v.y, 0.6);
  if (e.uchSpawned === undefined) e.uchSpawned = 0;
  e.uchCd = (e.uchCd === undefined) ? Util.rand(2, 3) : e.uchCd - dt;
  if (e.uchCd <= 0 && e.uchSpawned < 3) {
    const ang = Util.rand(0, Math.PI * 2);
    uchSpawn(game, game.currentRoom, 'icecrawler', e.x + Math.cos(ang) * 70, e.y + Math.sin(ang) * 70);
    e.uchSpawned++; e.uchCd = Util.rand(3.5, 5);
    e.hitFlash = 0.15;
  }
};

ENEMY_BEHAVIOR_HANDLERS.uch1Thawtender = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 150) uchStep(game, e, dt, -v.x, -v.y, 0.55);
  e.uchCd = (e.uchCd === undefined) ? 2 : e.uchCd - dt;
  if (e.uchCd <= 0) {
    let best = null, bd = 200;
    for (const en of game.currentRoom.enemies) {
      if (en === e || !en.type || en.type.floorKey !== '10A' || en.hp >= en.maxHp) continue;
      const d = Util.dist(e.x, e.y, en.x, en.y);
      if (d < bd) { bd = d; best = en; }
    }
    if (best) { best.hp = Math.min(best.maxHp, best.hp + best.maxHp * 0.25); best.hitFlash = 0.2; e.uchCd = 2.5; }
    else e.uchCd = 0.8;
  }
};

ENEMY_BEHAVIOR_HANDLERS.uch1Iciclemarksman = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 220) uchStep(game, e, dt, -v.x, -v.y, 0.5);
  e.uchCharge = (e.uchCharge === undefined) ? 0 : e.uchCharge;
  e.uchCd = (e.uchCd === undefined) ? 1.5 : e.uchCd - dt;
  if (e.uchCd <= 0 && e.uchCharge === 0) e.uchCharge = 0.8;
  if (e.uchCharge > 0) {
    e.uchCharge -= dt; e.hitFlash = 0.05;
    if (e.uchCharge <= 0) {
      fireProjectileAngle(game, e, uchAim(e, player), 340, e.dmg + 2, { pierce: 3, color: '#e8f7ff' });
      e.uchCd = 2.2;
    }
  }
};

ENEMY_BEHAVIOR_HANDLERS.uch1Hailmites = function(game, e, dt){
  const player = game.player, t = e.type;
  const node = game.currentRoom;
  let cx = 0, cy = 0, n = 0;
  for (const en of node.enemies) { if (en !== e && en.type && en.type.id === 'hailmites') { cx += en.x; cy += en.y; n++; } }
  const v = seekVector(e, player.x, player.y);
  if (n > 0) {
    cx /= n; cy /= n;
    const cd = Util.dist(e.x, e.y, cx, cy);
    const cohesion = cd > 40 ? { x: cx - e.x, y: cy - e.y } : { x: 0, y: 0 };
    uchStep(game, e, dt, v.x + cohesion.x * 0.02, v.y + cohesion.y * 0.02, 1.1);
  } else uchStep(game, e, dt, v.x, v.y, 1.1);
  if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
};

ENEMY_BEHAVIOR_HANDLERS.uch1Driftlurker = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  e.uchCloak = (e.uchCloak === undefined) ? true : e.uchCloak;
  if (e.uchCloak) {
    e.alpha = 0.3;
    uchStep(game, e, dt, v.x, v.y, 0.6);
    if (v.d < 90) { e.uchCloak = false; e.uchDash = 0.5; e.uchDX = v.x; e.uchDY = v.y; }
  } else if (e.uchDash > 0) {
    e.alpha = 1;
    e.uchDash -= dt;
    uchStep(game, e, dt, e.uchDX, e.uchDY, 4);
    if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg + 1), t.id);
    if (e.uchDash <= 0) { e.uchCloak = true; }
  }
};

ENEMY_BEHAVIOR_HANDLERS.uch1Aurorablinker = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  e.uchCd = (e.uchCd === undefined) ? Util.rand(1.5, 2.5) : e.uchCd - dt;
  if (e.uchCd <= 0) {
    const ang = Util.rand(0, Math.PI * 2);
    const dist = 120;
    e.x = player.x + Math.cos(ang) * dist;
    e.y = player.y + Math.sin(ang) * dist;
    e.uchCd = Util.rand(2, 3);
    e.hitFlash = 0.15;
  }
  if (v.d < 200) fireProjectileAngle(game, e, uchAim(e, player), 200, e.dmg, { color: '#d8b8f0' });
};

ENEMY_BEHAVIOR_HANDLERS.uch1Floeweaver = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.uchWeave === undefined) e.uchWeave = Util.rand(0, Math.PI * 2);
  e.uchWeave += dt * 3;
  const v = seekVector(e, player.x, player.y);
  const perp = Math.atan2(v.y, v.x) + Math.PI / 2;
  uchStep(game, e, dt, v.x + Math.cos(perp) * Math.sin(e.uchWeave) * 1.2, v.y + Math.sin(perp) * Math.sin(e.uchWeave) * 1.2, 1);
  e.shielded = Math.sin(e.uchWeave) > 0.6;
  if (!e.shielded && v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
};

ENEMY_BEHAVIOR_HANDLERS.uch1Glaciersentry = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  e.uchLock = (e.uchLock === undefined) ? 0 : e.uchLock;
  if (v.d < 260) {
    e.uchLock += dt;
    if (e.uchLock >= 1.2) {
      fireProjectileAngle(game, e, uchAim(e, player), 260, e.dmg + 1, { pierce: 2, color: '#a8dcec' });
      e.uchLock = 0;
      e.hitFlash = 0.1;
    }
  } else e.uchLock = 0;
};

ENEMY_BEHAVIOR_HANDLERS.uch1Seracbloater = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  uchStep(game, e, dt, v.x, v.y, 0.7);
  if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
  if (e.hp <= 0 && !e.uchSplit) {
    e.uchSplit = true;
    for (let i = 0; i < 2; i++) {
      const ang = Util.rand(0, Math.PI * 2);
      uchSpawn(game, game.currentRoom, 'icecrawler', e.x + Math.cos(ang) * 24, e.y + Math.sin(ang) * 24);
    }
  }
};

ENEMY_BEHAVIOR_HANDLERS.uch1Cornicewarden = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  uchStep(game, e, dt, v.x, v.y, 0.6);
  e.uchCd = (e.uchCd === undefined) ? 3 : e.uchCd - dt;
  if (e.uchCd <= 0) {
    e.uchCd = 4;
    e.hitFlash = 0.15;
    for (const en of game.currentRoom.enemies) if (Util.dist(e.x, e.y, en.x, en.y) < 130) en.shielded = true;
    e.uchGrantT = 3;
  }
  if (e.uchGrantT > 0) { e.uchGrantT -= dt; if (e.uchGrantT <= 0) for (const en of game.currentRoom.enemies) en.shielded = false; }
  if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
};

ENEMY_BEHAVIOR_HANDLERS.uch1Avalanchemortar = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 220) uchStep(game, e, dt, -v.x, -v.y, 0.5);
  e.uchCd = (e.uchCd === undefined) ? 1.8 : e.uchCd - dt;
  if (e.uchCd <= 0) {
    e.uchLobX = player.x; e.uchLobY = player.y; e.uchLobT = 0.9; e.uchCd = 2.2;
    e.hitFlash = 0.1;
  }
  if (e.uchLobT > 0) {
    e.uchLobT -= dt;
    if (e.uchLobT <= 0) {
      game.explosions.push(new Explosion(e.uchLobX, e.uchLobY, 55));
      if (Util.dist(e.uchLobX, e.uchLobY, player.x, player.y) < 55 + player.radius) damagePlayer(game, playerDamageAmount(game, false, e.dmg + 1), t.id);
    }
  }
};

ENEMY_BEHAVIOR_HANDLERS.uch1Frostdrone = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  uchStep(game, e, dt, v.x, v.y, 1.2);
  e.uchFuse = (e.uchFuse === undefined) ? -1 : e.uchFuse;
  if (e.uchFuse < 0 && v.d < 60) e.uchFuse = 0.5;
  if (e.uchFuse >= 0) {
    e.uchFuse -= dt; e.hitFlash = 0.1;
    if (e.uchFuse <= 0) {
      game.explosions.push(new Explosion(e.x, e.y, 50));
      if (Util.dist(e.x, e.y, player.x, player.y) < 50 + player.radius) {
        damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
        player.freezeTimer = Math.max(player.freezeTimer, 0.3);
      }
      e.hp = 0;
    }
  }
};

ENEMY_BEHAVIOR_HANDLERS.uch1Glacierchanter = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 200) uchStep(game, e, dt, -v.x, -v.y, 0.55);
  e.uchShot = (e.uchShot === undefined) ? 1 : e.uchShot - dt;
  if (e.uchShot <= 0) {
    fireProjectileAngle(game, e, uchAim(e, player), 220, e.dmg, { color: '#cdeafa' });
    fireProjectileAngle(game, e, uchAim(e, player) + 0.3, 220, e.dmg, { color: '#cdeafa' });
    e.uchShot = 1.3;
  }
};

ENEMY_BEHAVIOR_HANDLERS.uch1Floehusk = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  uchStep(game, e, dt, v.x, v.y, 0.85);
  if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg), t.id);
  if (e.hp <= 0 && !e.uchSplit) {
    e.uchSplit = true;
    uchSpawn(game, game.currentRoom, 'icecrawler', e.x + 20, e.y);
    uchSpawn(game, game.currentRoom, 'icecrawler', e.x - 20, e.y);
  }
};

ENEMY_BEHAVIOR_HANDLERS.uch1Verglaslurker = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  e.uchCloak = (e.uchCloak === undefined) ? true : e.uchCloak;
  if (e.uchCloak) {
    e.alpha = 0.35;
    uchStep(game, e, dt, v.x, v.y, 0.65);
    if (v.d < 80) { e.uchCloak = false; e.uchDash = 0.4; e.uchDX = v.x; e.uchDY = v.y; }
  } else if (e.uchDash > 0) {
    e.alpha = 1;
    e.uchDash -= dt;
    uchStep(game, e, dt, e.uchDX, e.uchDY, 4.5);
    if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg + 1), t.id);
    if (e.uchDash <= 0) e.uchCloak = true;
  }
};

ENEMY_BEHAVIOR_HANDLERS.uch1Crystalspire = function(game, e, dt){
  const player = game.player, t = e.type;
  e.uchShot = (e.uchShot === undefined) ? Util.rand(0.5, 1.2) : e.uchShot - dt;
  if (e.uchShot <= 0) {
    e.uchStage = (e.uchStage || 0) + 1;
    uchArc(game, e, uchAim(e, player), Math.min(e.uchStage, 6), Math.PI / 3 + Math.min(e.uchStage, 6) * 0.08, 210, { color: '#dff0fa' });
    if (e.uchStage >= 6) e.uchStage = 0;
    e.uchShot = 1.2;
    e.hitFlash = 0.1;
  }
};

ENEMY_BEHAVIOR_HANDLERS.uch1Wintermender = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 150) uchStep(game, e, dt, -v.x, -v.y, 0.5);
  e.uchCd = (e.uchCd === undefined) ? 2 : e.uchCd - dt;
  if (e.uchCd <= 0) {
    let best = null, bd = 220;
    for (const en of game.currentRoom.enemies) {
      if (en === e || !en.type || en.type.floorKey !== '10A' || en.hp >= en.maxHp) continue;
      const d = Util.dist(e.x, e.y, en.x, en.y);
      if (d < bd) { bd = d; best = en; }
    }
    if (best) { best.hp = Math.min(best.maxHp, best.hp + best.maxHp * 0.3); best.hitFlash = 0.2; e.uchCd = 2.8; }
    else e.uchCd = 0.8;
  }
};

ENEMY_BEHAVIOR_HANDLERS.uch1Seracpouncer = function(game, e, dt){
  const player = game.player, t = e.type;
  const v = seekVector(e, player.x, player.y);
  if (e.uchLeap > 0) {
    e.uchLeap -= dt;
    uchStep(game, e, dt, e.uchLDX, e.uchLDY, 5.5);
    if (v.d < e.radius + player.radius + 4) damagePlayer(game, playerDamageAmount(game, false, e.dmg + 1), t.id);
    if (e.uchLeap <= 0) { e.uchCd = 1.8; player.freezeTimer = Math.max(player.freezeTimer, 0.2); }
    return;
  }
  uchStep(game, e, dt, v.x, v.y, 0.7);
  e.uchCd = (e.uchCd === undefined) ? 0 : e.uchCd - dt;
  if (e.uchCd <= 0 && v.d < 170) { e.uchLeap = 0.35; e.uchLDX = v.x; e.uchLDY = v.y; }
};
