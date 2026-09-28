'use strict';

ENEMY_BEHAVIOR_HANDLERS.inf2Slagbloater = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.inf2Swell === undefined) { e.inf2Swell = 0; e.inf2Base = e.radius; }
  const v = seekVector(e, player.x, player.y);
  e.inf2Swell += dt * 0.45;
  if (e.inf2Swell >= 1) {
    e.inf2Swell = 0;
    e.radius = e.inf2Base;
    infernoScorch(game, e, e.x, e.y, 54);
    infernoRing(game, e, 8, (t.boltSpeed || 150) * 0.85, { color: '#c95a2e', radius: 5 }, RNG.random());
    e.hitFlash = 0.16;
    return;
  }
  e.radius = e.inf2Base * (1 + e.inf2Swell * 0.35);
  infernoStep(game, e, dt, v.x, v.y, 1.15 - e.inf2Swell * 0.75);
};

ENEMY_BEHAVIOR_HANDLERS.inf2Cindermites = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  let cx = 0, cy = 0, n = 0;
  for (const o of node.enemies) {
    if (o === e || o.isDead || o.type.id !== e.type.id) continue;
    if (Util.dist(e.x, e.y, o.x, o.y) < 110) { cx += o.x; cy += o.y; n++; }
  }
  const v = seekVector(e, player.x, player.y);
  if (n === 0) {
    infernoStep(game, e, dt, -v.x + (-v.y) * 0.6, -v.y + v.x * 0.6, 0.85);
    return;
  }
  const h = seekVector(e, cx / n, cy / n);
  const pack = Math.min(1, n / 4);
  const w = (t.driftAmount || 0.58) * (1 - pack);
  infernoStep(game, e, dt, v.x + h.x * w, v.y + h.y * w, 0.8 + pack * 0.75);
};

ENEMY_BEHAVIOR_HANDLERS.inf2Pyremarksman = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.inf2Burst === undefined) { e.inf2Burst = 0; e.inf2Gap = 0; e.inf2Side = RNG.random() < 0.5 ? 1 : -1; }
  if (e.inf2Burst > 0) {
    e.inf2Gap -= dt;
    if (e.inf2Gap <= 0) {
      fireProjectileAngle(game, e, e.inf2Lock, t.boltSpeed || 440, e.dmg, { color: t.boltColor || '#ffb46a', radius: t.boltRadius || 4 });
      e.inf2Burst--;
      e.inf2Gap = 0.11;
      if (e.inf2Burst <= 0) { e.fireTimer = t.fireCooldown || 2.6; e.inf2Side = -e.inf2Side; }
    }
    return;
  }
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 22) > 0) ? 0.14 : 0;
    if (e.telegraph <= 0) { e.inf2Burst = 3; e.inf2Gap = 0; }
    return;
  }
  e.fireTimer -= dt;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 220) infernoStep(game, e, dt, -v.x, -v.y, 1);
  else infernoStep(game, e, dt, -v.y * e.inf2Side, v.x * e.inf2Side, 0.7);
  if (e.fireTimer <= 0 && v.d < (t.fireRange || 550) && hasLineOfSight(node, e, player.x, player.y)) {
    e.inf2Lock = infernoAim(e, player);
    e.telegraph = t.telegraphTime || 1.15;
  }
};

ENEMY_BEHAVIOR_HANDLERS.inf2Cinderdrone = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.inf2Rev === undefined) { e.inf2Rev = 0; }
  const v = seekVector(e, player.x, player.y);
  if (e.arming) {
    const near = v.d < (t.blastRadius || 88);
    e.fuseTimer -= dt * (near ? 2.6 : 0.7);
    e.hitFlash = (Math.sin(e.fuseTimer * 30) > 0) ? 0.16 : 0;
    infernoStep(game, e, dt, v.x, v.y, 0.5);
    if (e.fuseTimer <= 0) {
      e.isDead = true;
      infernoScorch(game, e, e.x, e.y, t.blastRadius || 88);
      infernoRing(game, e, 10, 165, { color: '#ff8a3a', radius: 5 }, RNG.random());
      handleEnemyDeath(game, e);
    }
    return;
  }
  e.inf2Rev = Math.min(1, e.inf2Rev + dt * 0.4);
  infernoStep(game, e, dt, v.x + (-v.y) * (1 - e.inf2Rev) * 0.9, v.y + v.x * (1 - e.inf2Rev) * 0.9, 0.8 + e.inf2Rev * 0.8);
  if (v.d < 70 || e.inf2Rev >= 1) { e.arming = true; e.fuseTimer = t.fuseTime || 0.95; }
};

ENEMY_BEHAVIOR_HANDLERS.inf2Charhusk = function(game, e, dt){
  const player = game.player;
  if (e.inf2Cracks === undefined) { e.inf2Cracks = 0; e.inf2Lunge = 0; e.inf2Rest = 0.3; }
  const lost = 1 - e.hp / Math.max(1, e.maxHp);
  const want = Math.floor(lost * 3);
  if (want > e.inf2Cracks) {
    e.inf2Cracks = want;
    infernoRing(game, e, 5 + e.inf2Cracks * 2, 150, { color: '#8a6a58', radius: 4 }, RNG.random());
    infernoScorch(game, e, e.x, e.y, 34, Math.max(1, Math.floor(e.dmg / 2)));
    e.hitFlash = 0.16;
  }
  const v = seekVector(e, player.x, player.y);
  if (e.inf2Cracks < 2) { infernoStep(game, e, dt, v.x, v.y, 1); return; }
  if (e.inf2Lunge > 0) {
    e.inf2Lunge -= dt;
    const r = infernoStep(game, e, dt, e.inf2LX, e.inf2LY, 2.2 + e.inf2Cracks * 0.3);
    if ((!r.movedX && !r.movedY) || e.inf2Lunge <= 0) { e.inf2Lunge = 0; e.inf2Rest = 0.45; }
    return;
  }
  e.inf2Rest -= dt;
  if (e.inf2Rest <= 0) { e.inf2Lunge = 0.3; e.inf2LX = v.x; e.inf2LY = v.y; }
};

ENEMY_BEHAVIOR_HANDLERS.inf2Emberchanter = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.inf2Stack === undefined) { e.inf2Stack = 0; e.inf2Beat = 0; }
  const v = seekVector(e, player.x, player.y);
  if (v.d < 130) {
    e.inf2Stack = 0;
    e.inf2Beat = 0;
    infernoStep(game, e, dt, -v.x, -v.y, 1.6);
    return;
  }
  e.inf2Beat -= dt;
  if (e.inf2Beat > 0) return;
  e.inf2Beat = 0.7;
  e.inf2Stack++;
  const sp = t.boltSpeed || 200;
  const col = { color: t.boltColor || '#f0a03a', radius: t.boltRadius || 4 };
  if (e.inf2Stack >= 3) {
    e.inf2Stack = 0;
    e.inf2Beat = (t.fireCooldown || 1.95);
    infernoArc(game, e, infernoAim(e, player), 7, 1.5, sp * 0.8, col);
    infernoRing(game, e, 6, sp * 0.55, col, RNG.random());
    e.hitFlash = 0.16;
    return;
  }
  infernoArc(game, e, infernoAim(e, player), 1 + e.inf2Stack * 2, 0.22 * e.inf2Stack, sp, col);
};

ENEMY_BEHAVIOR_HANDLERS.inf2Obsidianpouncer = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.inf2Hot === undefined) { e.inf2Hot = 0; }
  if (e.dashing) {
    const r = infernoStep(game, e, dt, e.dashVX, e.dashVY, t.leapSpeed || 4.8);
    e.dashTimer -= dt;
    if ((!r.movedX && !r.movedY) || e.dashTimer <= 0) {
      e.dashing = false;
      e.shielded = false;
      infernoRing(game, e, 6, 210, { color: '#6a5a78', radius: 5 }, RNG.random());
      e.inf2Hot = 1;
      e.attackTimer = t.leapCooldown || 1.9;
    }
    return;
  }
  if (e.telegraph > 0) {
    e.shielded = true;
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 26) > 0) ? 0.14 : 0;
    if (e.telegraph <= 0) {
      const v = seekVector(e, player.x, player.y);
      e.dashing = true; e.dashTimer = 0.34;
      e.dashVX = v.x; e.dashVY = v.y;
    }
    return;
  }
  e.inf2Hot = Math.max(0, e.inf2Hot - dt);
  e.attackTimer -= dt;
  const v = seekVector(e, player.x, player.y);
  infernoStep(game, e, dt, v.x, v.y, e.inf2Hot > 0 ? 1.5 : 0.8);
  if (e.attackTimer <= 0 && v.d < 300 && hasLineOfSight(node, e, player.x, player.y)) e.telegraph = t.telegraphTime || 0.5;
};

ENEMY_BEHAVIOR_HANDLERS.inf2Sootmarksman = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.inf2Veil === undefined) { e.inf2Veil = 1; e.inf2Bear = RNG.random() * Math.PI * 2; }
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 24) > 0) ? 0.12 : 0;
    if (e.telegraph <= 0) {
      fireProjectileAngle(game, e, infernoAim(e, player), t.boltSpeed || 460, e.dmg, { color: t.boltColor || '#e0c8b4', radius: t.boltRadius || 4 });
      infernoScorch(game, e, e.x, e.y, 30, Math.max(1, Math.floor(e.dmg / 2)));
      e.inf2Veil = 1;
      e.inf2Bear += Math.PI * (0.55 + RNG.random() * 0.5);
      e.fireTimer = t.fireCooldown || 2.2;
    }
    return;
  }
  if (e.inf2Veil) {
    e.submerged = true;
    e.shielded = true;
    const R = 260;
    const tx = player.x + Math.cos(e.inf2Bear) * R, ty = player.y + Math.sin(e.inf2Bear) * R;
    const s = seekVector(e, tx, ty);
    infernoStep(game, e, dt, s.x, s.y, 1.5);
    e.fireTimer -= dt;
    if (e.fireTimer <= 0 && s.d < 70 && hasLineOfSight(node, e, player.x, player.y)) {
      e.inf2Veil = 0;
      e.submerged = false;
      e.shielded = false;
      e.telegraph = t.telegraphTime || 0.95;
    }
    return;
  }
  e.telegraph = t.telegraphTime || 0.95;
};

ENEMY_BEHAVIOR_HANDLERS.inf2Sparkmites = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.inf2Charge === undefined) { e.inf2Charge = RNG.random() * 0.6; e.inf2Zag = RNG.random() * 6; e.inf2Kick = 0; }
  const v = seekVector(e, player.x, player.y);
  if (e.inf2Kick > 0) {
    e.inf2Kick -= dt;
    infernoStep(game, e, dt, -v.x, -v.y, 1.6);
    return;
  }
  e.inf2Zag += dt * 13;
  e.inf2Charge += dt;
  const w = Math.sin(e.inf2Zag) * (t.driftAmount || 0.66);
  infernoStep(game, e, dt, v.x + (-v.y) * w, v.y + v.x * w, 1);
  if (e.inf2Charge >= 1.5) {
    e.inf2Charge = 0;
    e.inf2Kick = 0.28;
    e.hitFlash = 0.14;
    if (v.d < 62 + player.radius) damagePlayer(game, playerDamageAmount(game, false, e.dmg), e.type.id);
    infernoRing(game, e, 4, 230, { color: '#ffd23a', radius: 3 }, RNG.random());
  }
};

ENEMY_BEHAVIOR_HANDLERS.inf2Slagorbiter = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.inf2R === undefined) { e.inf2R = (t.orbitRadius || 150) + 50; e.inf2Dir = RNG.random() < 0.5 ? 1 : -1; }
  e.inf2R -= dt * 34;
  if (e.inf2R <= 70) {
    e.inf2R = (t.orbitRadius || 150) + 50;
    e.inf2Dir = -e.inf2Dir;
    infernoScorch(game, e, e.x, e.y, 60);
    e.hitFlash = 0.16;
  }
  const bearing = Math.atan2(e.y - player.y, e.x - player.x) + e.inf2Dir * (t.orbitSpeed || 1.6) * dt;
  const tx = player.x + Math.cos(bearing) * e.inf2R, ty = player.y + Math.sin(bearing) * e.inf2R;
  const v = seekVector(e, tx, ty);
  if (v.d > 5) infernoStep(game, e, dt, v.x, v.y, 1.25);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && Util.dist(e.x, e.y, player.x, player.y) < (t.fireRange || 420)) {
    e.fireTimer = (t.fireCooldown || 1.5) * (e.inf2R / 200);
    fireProjectileAngle(game, e, bearing + e.inf2Dir * Math.PI / 2, t.boltSpeed || 250, e.dmg, { color: '#e07a3a', radius: 5 });
  }
};

ENEMY_BEHAVIOR_HANDLERS.inf2Ashsentry = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.inf2Awake === undefined) { e.inf2Awake = 0; e.inf2Spin = 0; e.inf2Lost = 0; }
  const d = Util.dist(e.x, e.y, player.x, player.y);
  const los = hasLineOfSight(node, e, player.x, player.y);
  if (!e.inf2Awake) {
    e.submerged = true;
    e.shielded = true;
    if (d < (t.sentryThreshold || 34) * 8 && los) {
      e.inf2Awake = 1;
      e.submerged = false;
      e.shielded = false;
      e.inf2Lost = 0;
      infernoScorch(game, e, e.x, e.y, 52);
      e.hitFlash = 0.18;
    }
    return;
  }
  if (!los || d > (t.fireRange || 440)) {
    e.inf2Lost += dt;
    if (e.inf2Lost > 3) { e.inf2Awake = 0; e.hp = Math.min(e.maxHp, e.hp + 2); }
    return;
  }
  e.inf2Lost = 0;
  e.fireTimer -= dt;
  if (e.fireTimer > 0) return;
  e.fireTimer = t.fireCooldown || 1.4;
  e.inf2Spin++;
  const off = (e.inf2Spin % 2) ? Math.PI / 4 : 0;
  infernoRing(game, e, 4, t.boltSpeed || 230, { color: '#c9a88a', radius: 4 }, off);
};

ENEMY_BEHAVIOR_HANDLERS.inf2Pyreburrower = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.inf2State === undefined) { e.inf2State = 0; e.inf2Timer = t.burrowCooldown || 2.3; e.inf2Mark = 0; e.inf2Geyser = 0; }
  e.inf2Timer -= dt;
  if (e.inf2State === 1) {
    e.submerged = true;
    e.shielded = true;
    const v = seekVector(e, player.x, player.y);
    infernoStep(game, e, dt, v.x, v.y, 2.1);
    e.inf2Mark -= dt;
    if (e.inf2Mark <= 0) {
      e.inf2Mark = 0.28;
      infernoScorch(game, e, e.x, e.y, 30, Math.max(1, Math.floor(e.dmg / 2)));
    }
    if (e.inf2Timer <= 0 || v.d < 30) { e.inf2State = 2; e.inf2Timer = 0.4; e.inf2Geyser = 3; }
    return;
  }
  if (e.inf2State === 2) {
    e.hitFlash = 0.14;
    if (e.inf2Timer <= 0) {
      infernoRing(game, e, 6, 150 + e.inf2Geyser * 40, { color: '#ff7a2a', radius: 5 }, RNG.random());
      infernoScorch(game, e, e.x, e.y, 34 + e.inf2Geyser * 10);
      e.inf2Geyser--;
      e.inf2Timer = 0.18;
      if (e.inf2Geyser <= 0) {
        e.submerged = false;
        e.shielded = false;
        e.inf2State = 0;
        e.inf2Timer = t.burrowCooldown || 2.3;
      }
    }
    return;
  }
  chaseSeek(game, e, player.x, player.y, 0.85, dt);
  if (e.inf2Timer <= 0) {
    e.inf2State = 1;
    e.inf2Timer = t.burrowTime || 1.15;
    e.inf2Mark = 0.1;
    e.navPath = null; e.pathTimer = 0;
  }
};

ENEMY_BEHAVIOR_HANDLERS.inf2Brimstoneskirmisher = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.inf2Pass === undefined) { e.inf2Pass = 0; e.inf2Fired = 0; }
  const v = seekVector(e, player.x, player.y);
  if (e.inf2Pass > 0) {
    e.inf2Pass -= dt;
    const r = infernoStep(game, e, dt, e.inf2PX, e.inf2PY, (t.dashSpeed || 1.6) * 1.9);
    if (!e.inf2Fired && v.d < (t.retreatRange || 120)) {
      e.inf2Fired = 1;
      infernoArc(game, e, Math.atan2(-e.inf2PY, -e.inf2PX), 3, 0.8, (t.boltSpeed || 225) * 0.8, { color: '#ff9a4a', radius: 4 });
    }
    if ((!r.movedX && !r.movedY) || e.inf2Pass <= 0) { e.inf2Pass = 0; e.attackTimer = 0.35; }
    return;
  }
  e.attackTimer -= dt;
  e.fireTimer -= dt;
  if (v.d > (t.engageRange || 250)) infernoStep(game, e, dt, v.x, v.y, 1);
  else infernoStep(game, e, dt, -v.y, v.x, 0.75);
  if (e.fireTimer <= 0 && v.d < (t.engageRange || 250)) {
    e.fireTimer = t.fireCooldown || 1.5;
    infernoArc(game, e, infernoAim(e, player), 3, 0.5, t.boltSpeed || 225, { color: '#ff9a4a', radius: 4 });
  }
  if (e.attackTimer <= 0 && v.d < (t.engageRange || 250)) {
    e.inf2Pass = 0.6;
    e.inf2Fired = 0;
    e.inf2PX = v.x; e.inf2PY = v.y;
    e.hitFlash = 0.12;
  }
};

ENEMY_BEHAVIOR_HANDLERS.inf2Embersplitter = function(game, e, dt){
  const player = game.player;
  if (e.inf2Bounce === undefined) { e.inf2Bounce = 0; e.inf2Roll = 0; }
  if (e.inf2Roll > 0) {
    e.inf2Roll -= dt;
    const r = infernoStep(game, e, dt, e.inf2RX, e.inf2RY, 2.6);
    if (!r.movedX && !r.movedY) {
      infernoScorch(game, e, e.x, e.y, 46);
      infernoRing(game, e, 4, 175, { color: '#ff6a2a', radius: 5 }, RNG.random());
      e.inf2Bounce--;
      if (e.inf2Bounce > 0) {
        if (!r.movedX) e.inf2RX = -e.inf2RX;
        if (!r.movedY) e.inf2RY = -e.inf2RY;
        e.inf2Roll = 0.8;
      } else { e.inf2Roll = 0; e.attackTimer = 1.6; }
      return;
    }
    if (e.inf2Roll <= 0) { e.inf2Bounce = 0; e.attackTimer = 1.6; }
    return;
  }
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 28) > 0) ? 0.14 : 0;
    if (e.telegraph <= 0) {
      const v = seekVector(e, player.x, player.y);
      e.inf2RX = v.x; e.inf2RY = v.y;
      e.inf2Roll = 0.9;
      e.inf2Bounce = 3;
    }
    return;
  }
  e.attackTimer = (e.attackTimer || 0) - dt;
  chaseSeek(game, e, player.x, player.y, 0.7, dt);
  if (e.attackTimer <= 0) e.telegraph = 0.6;
};

ENEMY_BEHAVIOR_HANDLERS.inf2Sootstrafer = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.inf2T === undefined) { e.inf2T = RNG.random() * 6; e.inf2Tilt = RNG.random() * Math.PI; e.inf2Half = 0; }
  e.inf2T += dt * 1.5;
  const R = (t.keepDistance || 125) * 1.5;
  const lx = Math.cos(e.inf2T) * R, ly = Math.sin(e.inf2T * 2) * R * 0.5;
  const c = Math.cos(e.inf2Tilt), s = Math.sin(e.inf2Tilt);
  const tx = player.x + lx * c - ly * s, ty = player.y + lx * s + ly * c;
  const v = seekVector(e, tx, ty);
  if (v.d > 6) infernoStep(game, e, dt, v.x, v.y, 1.3);
  const half = Math.cos(e.inf2T) >= 0 ? 1 : 0;
  if (half !== e.inf2Half) {
    e.inf2Half = half;
    infernoArc(game, e, infernoAim(e, player), 2, 0.3, t.boltSpeed || 215, { color: '#b4a08a', radius: 4 });
    infernoScorch(game, e, e.x, e.y, 26, Math.max(1, Math.floor(e.dmg / 2)));
    e.hitFlash = 0.1;
  }
};

ENEMY_BEHAVIOR_HANDLERS.inf2Cinderleaper = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.inf2Hops === undefined) { e.inf2Hops = 0; e.attackTimer = Util.rand(0.3, 0.9); }
  if (e.dashing) {
    infernoStep(game, e, dt, e.dashVX, e.dashVY, (t.leapSpeed || 5.4) * (e.inf2Hops === 0 ? 1.3 : 0.8));
    e.dashTimer -= dt;
    if (e.dashTimer <= 0) {
      e.dashing = false;
      if (e.inf2Hops === 0) {
        infernoScorch(game, e, e.x, e.y, 50);
        infernoRing(game, e, 5, t.boltSpeed || 180, { color: '#ff8a3a', radius: 5 }, RNG.random());
        e.attackTimer = t.leapCooldown || 1.5;
      } else {
        infernoScorch(game, e, e.x, e.y, 24, Math.max(1, Math.floor(e.dmg / 2)));
        e.telegraph = 0.1;
      }
    }
    return;
  }
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    e.hitFlash = (Math.sin(e.telegraph * 36) > 0) ? 0.12 : 0;
    if (e.telegraph <= 0) {
      const v = seekVector(e, player.x, player.y);
      e.inf2Hops--;
      e.dashing = true;
      e.dashTimer = e.inf2Hops === 0 ? 0.3 : 0.16;
      e.dashVX = v.x; e.dashVY = v.y;
    }
    return;
  }
  e.attackTimer -= dt;
  const v = seekVector(e, player.x, player.y);
  infernoStep(game, e, dt, v.x, v.y, 0.55);
  if (e.attackTimer <= 0 && v.d < 340 && hasLineOfSight(node, e, player.x, player.y)) {
    e.inf2Hops = 3;
    e.telegraph = t.telegraphTime || 0.32;
  }
};

INFERNO_ID_AI.magmaspire = function(game, e, dt){
  const node = game.currentRoom, player = game.player, t = e.type;
  if (e.inf2Head === undefined) { e.inf2Head = RNG.random() * Math.PI * 2; e.inf2Dir = 1; e.inf2Sweeps = 0; }
  const d = Util.dist(e.x, e.y, player.x, player.y);
  const los = hasLineOfSight(node, e, player.x, player.y);
  const aim = infernoAim(e, player);
  let diff = aim - e.inf2Head;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const prev = diff;
  e.inf2Head += e.inf2Dir * 1.35 * dt;
  let after = aim - e.inf2Head;
  while (after > Math.PI) after -= Math.PI * 2;
  while (after < -Math.PI) after += Math.PI * 2;
  if (prev !== 0 && (prev > 0) !== (after > 0)) {
    e.inf2Dir = -e.inf2Dir;
    e.inf2Sweeps++;
    if (e.inf2Sweeps % 6 === 0) {
      infernoRing(game, e, 6, (t.boltSpeed || 195) * 0.8, { color: t.boltColor || '#f0762e', radius: t.boltRadius || 5 }, RNG.random());
      infernoScorch(game, e, e.x, e.y, 58);
      e.hitFlash = 0.16;
      e.fireTimer = (t.fireCooldown || 2.1) * 1.1;
      return;
    }
  }
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && los && d < 460) {
    e.fireTimer = (t.fireCooldown || 2.1) * 1.1;
    infernoArc(game, e, e.inf2Head, t.shotCount || 4, t.spreadAngle || 0.75, t.boltSpeed || 195,
      { color: t.boltColor || '#f0762e', radius: t.boltRadius || 5 });
  }
};

INFERNO_ID_AI.cindershielded = function(game, e, dt){
  const player = game.player, t = e.type;
  if (e.inf2Heat === undefined) { e.inf2Heat = 0; e.inf2Was = e.shielded ? 1 : 0; }
  const v = seekVector(e, player.x, player.y);
  const now = e.shielded ? 1 : 0;
  if (now !== e.inf2Was) {
    e.inf2Was = now;
    if (!now) {
      const stacks = Math.min(4, Math.floor(e.inf2Heat));
      infernoScorch(game, e, e.x, e.y, 50 + stacks * 16);
      infernoRing(game, e, 4 + stacks * 2, 160 + stacks * 15, { color: '#ff7a3a', radius: 5 }, RNG.random());
      e.inf2Heat = 0;
      e.hitFlash = 0.18;
    }
  }
  if (now) {
    e.inf2Heat += dt;
    infernoStep(game, e, dt, v.x, v.y, 0.55);
    return;
  }
  const keep = 190;
  if (v.d < keep) infernoStep(game, e, dt, -v.x, -v.y, 1.5);
  else infernoStep(game, e, dt, -v.y, v.x, 0.8);
  e.fireTimer -= dt;
  if (e.fireTimer <= 0 && v.d < 380) {
    e.fireTimer = 0.9;
    fireProjectileAngle(game, e, infernoAim(e, player), 205, e.dmg, { color: '#ff9a5a', radius: 4 });
  }
};
