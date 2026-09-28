'use strict';

const MIRROR_BOSS_HP_PER_DAMAGE = 26;
const MIRROR_BOSS_BASE_HP = 90;
const MIRROR_BOSS_MAX_HP = 460;

function mirrorBossName(player){
  const label = (player && player.def && player.def.name) ? player.def.name : 'Wanderer';
  return 'Mirrored ' + label;
}

function mirrorBossColor(player){
  if (player && player.def && player.def.color) return player.def.color;
  return '#8fa8d8';
}

function spawnMirrorBoss(player, tx, ty, floorNum){
  if (!player) return null;
  const melee = player.meleeDamage || 3;
  const ranged = player.rangedDamage || 3;
  const dmg = Math.max(2, Math.round((melee + ranged) * 0.5));
  const hp = Util.clamp(Math.round(MIRROR_BOSS_BASE_HP + (melee + ranged) * MIRROR_BOSS_HP_PER_DAMAGE), MIRROR_BOSS_BASE_HP, MIRROR_BOSS_MAX_HP);
  const type = {
    id: 'mirrorboss_' + (player.classId || 'default'),
    name: mirrorBossName(player),
    radius: 17,
    hp: hp,
    dmg: dmg,
    speed: Util.clamp((player.speed || 150) * 0.92, 60, 260),
    behavior: 'mirrorboss',
    color: mirrorBossColor(player),
    dark: '#2b2f45',
    fireCooldown: Util.clamp((player.fireCooldown || 0.4) * 2.2, 0.35, 1.6),
    boltSpeed: Util.clamp((player.boltSpeed || 340) * 0.72, 160, 420),
    boltColor: '#b9a4ff',
    boltRadius: 6,
    fireRange: 460,
    keepDistance: 170,
    shotCount: Util.clamp(1 + Math.round(player.multishotExtra || 0), 1, 4),
    spreadAngle: 0.34,
  };
  const boss = new Boss(type, tx, ty, floorNum);
  boss.isBoss = false;
  boss.isMirrorBoss = true;
  boss.mirrorClass = player.classId || 'default';
  boss.mirrorFlags = Object.assign({}, player.tearFlags || {});
  boss.mirrorLayers = (player.attackLayers || []).slice();
  boss.mirrorLuck = player.luck || 0;
  boss.mirrorCrit = player.critChance || 0;
  return boss;
}

function mirrorState(e){
  return e._mirror || (e._mirror = {
    t: 0, t2: 0, phase: 0, n: 0,
    dir: RNG.random() < 0.5 ? -1 : 1,
    ang: RNG.random() * Math.PI * 2,
    x: 0, y: 0,
  });
}

function mirrorBoltOpts(e){
  const f = e.mirrorFlags || {};
  const t = e.type || {};
  return {
    color: t.boltColor || '#b9a4ff',
    radius: t.boltRadius || 6,
    pierce: Math.min(2, f.pierce || 0),
    homing: Math.min(0.6, (f.homing || 0) * 0.5),
    spectral: !!f.spectral,
    explosive: Math.min(1, f.explosive || 0),
  };
}

function mirrorFire(game, e, tx, ty, speedMul, damageMul){
  const t = e.type || {};
  fireSpread(game, e, tx, ty, (t.boltSpeed || 260) * (speedMul || 1), Math.max(1, Math.round(e.dmg * (damageMul || 1))), mirrorBoltOpts(e));
  mirrorRunLayers(game, e, Math.atan2(ty - e.y, tx - e.x));
}

function mirrorRing(game, e, count, speedMul, offset){
  const t = e.type || {};
  const opts = mirrorBoltOpts(e);
  const n = Math.max(3, count);
  for (let i = 0; i < n; i++) {
    fireProjectileAngle(game, e, (offset || 0) + (Math.PI * 2 * i) / n, (t.boltSpeed || 260) * (speedMul || 1), e.dmg, opts);
  }
  mirrorRunLayers(game, e, offset || 0);
}

function mirrorBlast(game, e, x, y, radius){
  const player = game.player;
  game.explosions.push(new Explosion(x, y, radius));
  if (Util.dist(x, y, player.x, player.y) < radius + player.radius) {
    damagePlayer(game, playerDamageAmount(game, false, e.dmg), 'mirrorboss');
  }
}

function mirrorApproach(game, e, dt, speedMul, keep){
  const node = game.currentRoom, player = game.player;
  const d = Util.dist(e.x, e.y, player.x, player.y);
  const want = keep || 0;
  if (want > 0 && d < want - 24) {
    const mx = e.x - player.x, my = e.y - player.y;
    const len = Math.hypot(mx, my) || 1;
    tryMoveEntity(e, node, node.obstacles, (mx / len) * e.speed * dt * (speedMul || 1), (my / len) * e.speed * dt * (speedMul || 1));
    return d;
  }
  if (want <= 0 || d > want + 24) chaseSeek(game, e, player.x, player.y, speedMul || 1, dt);
  return d;
}

function mirrorDelay(e, time, fn){
  (e._mirrorDelayed || (e._mirrorDelayed = [])).push({ time: time, fn: fn });
}

function mirrorTickDelayed(game, e, dt){
  const list = e._mirrorDelayed;
  if (!list || !list.length) return;
  for (let i = list.length - 1; i >= 0; i--) {
    list[i].time -= dt;
    if (list[i].time > 0) continue;
    const a = list[i];
    list.splice(i, 1);
    if (game.state === 'playing' && !e.isDead) a.fn();
  }
}

function mirrorShotFrom(game, e, x, y, ang, speedMul, damageMul){
  const t = e.type || {};
  fireProjectileAngle(game, { x: x, y: y, isBoss: false }, ang,
    (t.boltSpeed || 260) * (speedMul || 1),
    Math.max(1, Math.round(e.dmg * (damageMul || 0.6))), mirrorBoltOpts(e));
}

function mirrorArc(game, e, ang, count, spread, speedMul, damageMul){
  const n = Math.max(1, count);
  const step = n > 1 ? spread / (n - 1) : 0;
  for (let i = 0; i < n; i++) mirrorShotFrom(game, e, e.x, e.y, ang - spread / 2 + step * i, speedMul, damageMul);
}

function mirrorSpray(game, e, count, speedMul, damageMul){
  const n = Math.max(3, count);
  const base = RNG.random() * Math.PI * 2;
  for (let i = 0; i < n; i++) mirrorShotFrom(game, e, e.x, e.y, base + (Math.PI * 2 * i) / n, speedMul, damageMul);
}

function mirrorSummon(game, e, typeId, count, cap){
  const node = game.currentRoom;
  const def = (typeof ENEMY_TYPES !== 'undefined') ? ENEMY_TYPES[typeId] : null;
  if (!def) return;
  e.minionsSpawned = e.minionsSpawned || 0;
  const max = cap || 4;
  if (e.minionsSpawned >= max) return;
  const n = Math.min(count || 1, max - e.minionsSpawned);
  for (let i = 0; i < n; i++) {
    const a = RNG.random() * Math.PI * 2;
    const spot = findNearestFloor(node, Math.floor((e.x + Math.cos(a) * 55) / TILE), Math.floor((e.y + Math.sin(a) * 55) / TILE));
    node.enemies.push(new Enemy(def, spot.x, spot.y, game.dungeon.floorNum));
    e.minionsSpawned++;
  }
}

const MIRROR_LAYER_STYLES = {

  mineLayer(game, e, ang, layer){
    const x = e.x, y = e.y;
    mirrorDelay(e, layer.delay || 1.1, () => mirrorBlast(game, e, x, y, layer.radius || 90));
  },

  skyfall(game, e, ang, layer){
    const p = game.player, x = p.x, y = p.y;
    mirrorDelay(e, layer.delay || 0.8, () => mirrorBlast(game, e, x, y, layer.radius || 80));
  },

  groundSlam(game, e, ang, layer){
    mirrorBlast(game, e, e.x, e.y, layer.radius || 80);
  },

  chargeNova(game, e, ang, layer){
    mirrorSpray(game, e, 10, 0.8, 0.55);
  },

  beamSweep(game, e, ang, layer){
    for (let i = -1; i <= 1; i++) mirrorShotFrom(game, e, e.x, e.y, ang + i * 0.05, 1.6, 0.5);
  },

  scatterVolley(game, e, ang, layer){
    mirrorArc(game, e, ang, 5, 0.7, 0.9, 0.45);
  },

  echoShot(game, e, ang, layer){
    const x = e.x, y = e.y;
    mirrorDelay(e, layer.delay1 || 0.25, () => mirrorShotFrom(game, e, x, y, ang, 1, 0.5));
  },

  whipArc(game, e, ang, layer){
    mirrorArc(game, e, ang, 3, 1.2, 0.55, 0.7);
  },

  orbitBlades(game, e, ang, layer){
    mirrorSpray(game, e, 6, 0.55, 0.5);
  },

  chainLightning(game, e, ang, layer){
    mirrorArc(game, e, ang, 3, 2.4, 1.1, 0.4);
  },

  gravityWell(game, e, ang, layer){
    const node = game.currentRoom, p = game.player;
    const dx = e.x - p.x, dy = e.y - p.y;
    const len = Math.hypot(dx, dy) || 1;
    const pull = Math.min(38, layer.radius || 30);
    tryMoveEntity(p, node, node.obstacles, (dx / len) * pull, (dy / len) * pull);
  },

  trailBurn(game, e, ang, layer){
    const x = e.x, y = e.y;
    mirrorDelay(e, 0.35, () => mirrorBlast(game, e, x, y, layer.radius || 55));
  },

  singularity(game, e, ang, layer){
    const p = game.player, x = p.x, y = p.y;
    mirrorDelay(e, layer.delay || 0.6, () => mirrorBlast(game, e, x, y, layer.radius || 100));
  },
};

MIRROR_LAYER_STYLES.laggedEcho = MIRROR_LAYER_STYLES.echoShot;
MIRROR_LAYER_STYLES.mirrorConvert = MIRROR_LAYER_STYLES.echoShot;
MIRROR_LAYER_STYLES.ricochetBolt = MIRROR_LAYER_STYLES.scatterVolley;
MIRROR_LAYER_STYLES.onKillFragments = MIRROR_LAYER_STYLES.scatterVolley;
MIRROR_LAYER_STYLES.guardianPulse = MIRROR_LAYER_STYLES.orbitBlades;
MIRROR_LAYER_STYLES.knockbackPulse = MIRROR_LAYER_STYLES.groundSlam;
MIRROR_LAYER_STYLES.impactBurst = MIRROR_LAYER_STYLES.groundSlam;
MIRROR_LAYER_STYLES.frostShatter = MIRROR_LAYER_STYLES.chargeNova;
MIRROR_LAYER_STYLES.venomBloom = MIRROR_LAYER_STYLES.trailBurn;
MIRROR_LAYER_STYLES.bloodPact = MIRROR_LAYER_STYLES.whipArc;
MIRROR_LAYER_STYLES.markedForDeath = MIRROR_LAYER_STYLES.chainLightning;

function mirrorRunLayers(game, e, ang){
  const layers = e.mirrorLayers;
  if (!layers || !layers.length || e._mirrorLayerBusy) return;
  e._mirrorLayerBusy = true;
  const s = mirrorState(e);
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    const fn = MIRROR_LAYER_STYLES[layer.style];
    if (!fn) continue;
    const key = 'lc' + i;
    s[key] = (s[key] || 0) + 1;
    if (s[key] < Math.max(1, Math.round(layer.every || 4))) continue;
    s[key] = 0;
    fn(game, e, ang, layer);
  }
  e._mirrorLayerBusy = false;
}

const MIRROR_BOSS_BEHAVIORS = {

  earth: function(game, e, dt){
    const player = game.player, s = mirrorState(e);
    const d = mirrorApproach(game, e, dt, 1.05, 0);
    s.t -= dt;
    if (s.t <= 0 && d < 210) {
      s.t = 2.6;
      e.telegraph = 0.4;
    }
    if (e.telegraph > 0) {
      e.telegraph -= dt;
      e.hitFlash = (Math.sin(e.telegraph * 30) > 0) ? 0.15 : 0;
      if (e.telegraph <= 0) {
        mirrorBlast(game, e, e.x, e.y, 96);
        mirrorRing(game, e, 6, 0.7, s.ang);
        s.ang += 0.5;
      }
    }
  },

  pegasus: function(game, e, dt){
    const node = game.currentRoom, player = game.player, s = mirrorState(e);
    if (e.dashing) {
      tryMoveEntity(e, node, node.obstacles, e.dashVX * dt, e.dashVY * dt);
      e.dashTimer -= dt;
      if (e.dashTimer <= 0) { e.dashing = false; s.n++; s.t = (s.n % 3 === 0) ? 1.5 : 0.35; }
      return;
    }
    if (s.t > 0) { s.t -= dt; mirrorApproach(game, e, dt, 0.9, 130); return; }
    const v = seekVector(e, player.x, player.y);
    e.dashing = true; e.dashTimer = 0.34;
    e.dashVX = v.x * e.speed * 5.4; e.dashVY = v.y * e.speed * 5.4;
    mirrorFire(game, e, player.x, player.y, 1.15, 0.8);
  },

  unicorn: function(game, e, dt){
    const player = game.player, s = mirrorState(e);
    mirrorApproach(game, e, dt, 0.85, 190);
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) {
      e.fireTimer = (e.type.fireCooldown || 0.9) * 1.1;
      s.n++;
      if (s.n % 4 === 0) mirrorRing(game, e, 8, 0.85, s.ang += 0.4);
      else mirrorFire(game, e, player.x, player.y, 1, 1);
    }
  },

  batpony: function(game, e, dt){
    const node = game.currentRoom, player = game.player, s = mirrorState(e);
    s.t -= dt;
    if (s.t <= 0) {
      s.t = 3.4;
      s.phase = s.phase ? 0 : 1;
      e.shielded = !!s.phase;
    }
    if (s.phase) {
      const ang = Math.atan2(e.y - player.y, e.x - player.x) + s.dir * dt * 1.7;
      const rx = player.x + Math.cos(ang) * 150, ry = player.y + Math.sin(ang) * 150;
      const v = seekVector(e, rx, ry);
      tryMoveEntity(e, node, node.obstacles, v.x * e.speed * dt * 1.2, v.y * e.speed * dt * 1.2);
    } else {
      mirrorApproach(game, e, dt, 1.25, 0);
    }
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) {
      e.fireTimer = (e.type.fireCooldown || 0.9) * 1.4;
      mirrorFire(game, e, player.x, player.y, 0.9, 0.85);
    }
  },

  zebra: function(game, e, dt){
    const player = game.player, s = mirrorState(e);
    mirrorApproach(game, e, dt, 1, 120);
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) {
      e.fireTimer = (e.type.fireCooldown || 0.9) * 0.8;
      s.n++;
      const crit = (s.n % 3 === 0);
      const ang = Math.atan2(player.y - e.y, player.x - e.x);
      const opts = mirrorBoltOpts(e);
      if (crit) opts.radius = (opts.radius || 6) + 4;
      fireProjectileAngle(game, e, ang, (e.type.boltSpeed || 260) * (crit ? 1.25 : 1), Math.max(1, Math.round(e.dmg * (crit ? 1.7 : 0.9))), opts);
    }
  },

  hypogriff: function(game, e, dt){
    const node = game.currentRoom, player = game.player, s = mirrorState(e);
    s.ang += dt * 2.4 * s.dir;
    const v = seekVector(e, player.x, player.y);
    const px = -v.y, py = v.x;
    const weave = Math.sin(s.ang) * 0.75;
    tryMoveEntity(e, node, node.obstacles,
      (v.x + px * weave) * e.speed * dt * 1.15,
      (v.y + py * weave) * e.speed * dt * 1.15);
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) {
      e.fireTimer = (e.type.fireCooldown || 0.9) * 1.05;
      mirrorFire(game, e, player.x, player.y, 1.1, 0.9);
    }
  },

  seapony: function(game, e, dt){
    const player = game.player, s = mirrorState(e);
    s.t -= dt;
    if (s.t <= 0) {
      s.t = 4.2;
      s.phase = s.phase ? 0 : 1;
    }
    mirrorApproach(game, e, dt, s.phase ? 1.2 : 0.8, s.phase ? 90 : 220);
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) {
      e.fireTimer = (e.type.fireCooldown || 0.9) * (s.phase ? 1.6 : 0.75);
      if (s.phase) {
        mirrorBlast(game, e, e.x, e.y, 72);
      } else {
        const opts = mirrorBoltOpts(e);
        opts.radius = (opts.radius || 6) + 2;
        const aim = Math.atan2(player.y - e.y, player.x - e.x);
        for (let i = -1; i <= 1; i++) {
          fireProjectileAngle(game, e, aim + i * 0.22, (e.type.boltSpeed || 260) * 0.95, e.dmg, opts);
        }
      }
    }
  },

  ponybot: function(game, e, dt){
    const player = game.player, s = mirrorState(e);
    mirrorApproach(game, e, dt, 0.75, 240);
    if (s.phase) {
      s.t -= dt;
      const aim = Math.atan2(player.y - e.y, player.x - e.x);
      s.ang += Util.clamp(((aim - s.ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI, -dt * 1.4, dt * 1.4);
      e.hitFlash = 0.12;
      const opts = mirrorBoltOpts(e);
      opts.pierce = 3;
      opts.radius = (opts.radius || 6) - 2;
      fireProjectileAngle(game, e, s.ang, (e.type.boltSpeed || 260) * 1.9, Math.max(1, Math.round(e.dmg * 0.35)), opts);
      if (s.t <= 0) { s.phase = 0; s.t = 2.4; }
      return;
    }
    s.t -= dt;
    if (s.t <= 0) { s.phase = 1; s.t = 1.1; s.ang = Math.atan2(player.y - e.y, player.x - e.x); mirrorRunLayers(game, e, s.ang); }
  },

  griffin: function(game, e, dt){
    const player = game.player, s = mirrorState(e);
    mirrorApproach(game, e, dt, 1.15, 150);
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) {
      e.fireTimer = (e.type.fireCooldown || 0.9) * 0.45;
      s.n++;
      const jitter = (RNG.random() - 0.5) * 0.18;
      const aim = Math.atan2(player.y - e.y, player.x - e.x) + jitter;
      fireProjectileAngle(game, e, aim, (e.type.boltSpeed || 260) * 1.5, Math.max(1, Math.round(e.dmg * 0.55)), mirrorBoltOpts(e));
      if (s.n % 8 === 0) mirrorRunLayers(game, e, aim);
    }
  },

  kirin: function(game, e, dt){
    const player = game.player, s = mirrorState(e);
    mirrorApproach(game, e, dt, 0.9, 200);
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) {
      e.fireTimer = (e.type.fireCooldown || 0.9) * 1.3;
      s.n++;
      const aim = Math.atan2(player.y - e.y, player.x - e.x);
      const opts = mirrorBoltOpts(e);
      opts.explosive = Math.max(opts.explosive, 0.5);
      opts.radius = (opts.radius || 6) + 3;
      fireProjectileAngle(game, e, aim, (e.type.boltSpeed || 260) * 0.85, Math.max(1, Math.round(e.dmg * 1.4)), opts);
      if (s.n % 3 === 0) { const x = player.x, y = player.y; mirrorDelay(e, 0.7, () => mirrorBlast(game, e, x, y, 70)); }
      mirrorRunLayers(game, e, aim);
    }
  },

  dragon: function(game, e, dt){
    const player = game.player, s = mirrorState(e);
    const d = mirrorApproach(game, e, dt, 1.05, 110);
    s.t -= dt;
    if (s.t > 0) return;
    if (e.telegraph > 0) {
      e.telegraph -= dt;
      e.hitFlash = 0.2;
      if (e.telegraph <= 0) {
        const aim = Math.atan2(player.y - e.y, player.x - e.x);
        for (let i = 0; i < 7; i++) {
          const sp = 200 + i * 34;
          fireProjectileAngle(game, e, aim + (RNG.random() - 0.5) * 0.45, sp, Math.max(1, Math.round(e.dmg * 0.5)), mirrorBoltOpts(e));
        }
        mirrorRunLayers(game, e, aim);
        s.t = 2.2;
      }
      return;
    }
    if (d < 200) e.telegraph = 0.55;
  },

  windigo: function(game, e, dt){
    const player = game.player, s = mirrorState(e);
    mirrorApproach(game, e, dt, 0.8, 175);
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) {
      e.fireTimer = (e.type.fireCooldown || 0.9) * 1.5;
      s.n++;
      const opts = mirrorBoltOpts(e);
      opts.homing = Math.max(opts.homing, 0.25);
      opts.radius = (opts.radius || 6) + 4;
      opts.color = '#9ac9e0';
      const aim = Math.atan2(player.y - e.y, player.x - e.x);
      for (let i = -1; i <= 1; i++) {
        fireProjectileAngle(game, e, aim + i * 0.3, (e.type.boltSpeed || 260) * 0.6, Math.max(1, Math.round(e.dmg * 1.1)), opts);
      }
      if (s.n % 4 === 0) mirrorRing(game, e, 9, 0.5, s.ang += 0.3);
      else mirrorRunLayers(game, e, aim);
    }
  },

  kelpie: function(game, e, dt){
    const player = game.player, s = mirrorState(e);
    const d = mirrorApproach(game, e, dt, 0.85, 0);
    s.t -= dt;
    if (s.t <= 0 && d < 150) {
      s.t = 1.6;
      const aim = Math.atan2(player.y - e.y, player.x - e.x);
      mirrorBlast(game, e, e.x + Math.cos(aim) * 60, e.y + Math.sin(aim) * 60, 66);
      mirrorRunLayers(game, e, aim);
    }
  },

  breezie: function(game, e, dt){
    const node = game.currentRoom, player = game.player, s = mirrorState(e);
    s.ang += dt * 3.6 * s.dir;
    s.t -= dt;
    if (s.t <= 0) { s.t = 1.4; s.dir = -s.dir; }
    const ang = Math.atan2(e.y - player.y, e.x - player.x) + s.dir * dt * 2.2;
    const rx = player.x + Math.cos(ang) * 135, ry = player.y + Math.sin(ang) * 135;
    const v = seekVector(e, rx, ry);
    tryMoveEntity(e, node, node.obstacles, v.x * e.speed * dt * 1.5, v.y * e.speed * dt * 1.5);
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) {
      e.fireTimer = (e.type.fireCooldown || 0.9) * 0.6;
      const opts = mirrorBoltOpts(e);
      opts.radius = Math.max(3, (opts.radius || 6) - 2);
      opts.homing = Math.max(opts.homing, 0.35);
      const aim = Math.atan2(player.y - e.y, player.x - e.x);
      fireProjectileAngle(game, e, aim, (e.type.boltSpeed || 260) * 1.2, Math.max(1, Math.round(e.dmg * 0.5)), opts);
      mirrorRunLayers(game, e, aim);
    }
  },

  dnbpony: function(game, e, dt){
    const player = game.player, s = mirrorState(e);
    mirrorApproach(game, e, dt, 1, 165);
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) {
      s.n++;
      const drop = (s.n % 8 === 0);
      e.fireTimer = (e.type.fireCooldown || 0.9) * (drop ? 1.5 : 0.4);
      if (drop) {
        mirrorRing(game, e, 12, 0.8, s.ang += 0.26);
        mirrorBlast(game, e, e.x, e.y, 70);
      } else {
        mirrorFire(game, e, player.x, player.y, 1.15, 0.6);
      }
    }
  },

  crystalpony: function(game, e, dt){
    const player = game.player, s = mirrorState(e);
    mirrorApproach(game, e, dt, 0.8, 210);
    s.t -= dt;
    if (s.t > 0) return;
    if (e.telegraph > 0) {
      e.telegraph -= dt;
      e.hitFlash = (Math.sin(e.telegraph * 26) > 0) ? 0.18 : 0;
      if (e.telegraph <= 0) {
        const aim = Math.atan2(player.y - e.y, player.x - e.x);
        const opts = mirrorBoltOpts(e);
        opts.pierce = Math.max(opts.pierce, 1);
        for (let i = -1; i <= 1; i++) {
          const off = Math.PI / 2 * i;
          const sx = e.x + Math.cos(aim + off) * 46, sy = e.y + Math.sin(aim + off) * 46;
          fireProjectileAngle(game, { x: sx, y: sy, isBoss: false }, Math.atan2(player.y - sy, player.x - sx),
            (e.type.boltSpeed || 260) * 1.05, Math.max(1, Math.round(e.dmg * 0.8)), opts);
        }
        mirrorRunLayers(game, e, aim);
        s.t = 1.5;
      }
      return;
    }
    e.telegraph = 0.7;
  },

  mule: function(game, e, dt){
    const player = game.player, s = mirrorState(e);
    mirrorApproach(game, e, dt, 0.7, 190);
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) {
      e.fireTimer = (e.type.fireCooldown || 0.9) * 1.6;
      s.n++;
      const aim = Math.atan2(player.y - e.y, player.x - e.x);
      const tx = player.x, ty = player.y;
      mirrorDelay(e, 0.9, () => mirrorBlast(game, e, tx, ty, 92));
      if (s.n % 2 === 0) mirrorFire(game, e, player.x, player.y, 0.9, 0.9);
      mirrorRunLayers(game, e, aim);
    }
  },

  alicorn: function(game, e, dt){
    const node = game.currentRoom, player = game.player, s = mirrorState(e);
    s.t -= dt;
    if (s.t <= 0) { s.t = 3.6; s.phase = (s.phase + 1) % 3; }
    if (s.phase === 1) {
      const ang = Math.atan2(e.y - player.y, e.x - player.x) + s.dir * dt * 1.5;
      const v = seekVector(e, player.x + Math.cos(ang) * 175, player.y + Math.sin(ang) * 175);
      tryMoveEntity(e, node, node.obstacles, v.x * e.speed * dt * 1.3, v.y * e.speed * dt * 1.3);
    } else {
      mirrorApproach(game, e, dt, 1, s.phase === 0 ? 200 : 120);
    }
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) {
      e.fireTimer = (e.type.fireCooldown || 0.9) * 0.85;
      s.n++;
      if (s.phase === 0) mirrorFire(game, e, player.x, player.y, 1.1, 1);
      else if (s.phase === 1) mirrorRing(game, e, 10, 0.85, s.ang += 0.32);
      else { mirrorBlast(game, e, e.x, e.y, 80); mirrorRing(game, e, 6, 1.1, s.ang -= 0.28); }
    }
  },

  changeling: function(game, e, dt){
    const player = game.player, s = mirrorState(e);
    mirrorApproach(game, e, dt, 1.05, 145);
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) {
      e.fireTimer = (e.type.fireCooldown || 0.9) * 1.15;
      s.n++;
      const aim = Math.atan2(player.y - e.y, player.x - e.x);
      const opts = mirrorBoltOpts(e);
      opts.color = '#7ce06a';
      opts.explosive = Math.max(opts.explosive, 0.4);
      fireProjectileAngle(game, e, aim, (e.type.boltSpeed || 260) * 0.95, Math.max(1, Math.round(e.dmg * 0.9)), opts);
      if (s.n % 3 === 0 && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + Math.max(1, Math.round(e.maxHp * 0.02)));
      mirrorRunLayers(game, e, aim);
    }
  },

  diamonddog: function(game, e, dt){
    const player = game.player, s = mirrorState(e);
    const d = mirrorApproach(game, e, dt, 0.8, 0);
    s.t -= dt;
    if (e.telegraph > 0) {
      e.telegraph -= dt;
      e.hitFlash = 0.2;
      if (e.telegraph <= 0) {
        mirrorBlast(game, e, e.x, e.y, 120);
        mirrorRing(game, e, 8, 0.6, s.ang += 0.4);
        s.t = 3.2;
      }
      return;
    }
    if (s.t <= 0 && d < 170) e.telegraph = 0.5;
  },

  gargoyle: function(game, e, dt){
    const player = game.player, s = mirrorState(e);
    s.t -= dt;
    if (s.t <= 0) { s.t = 3; s.phase = s.phase ? 0 : 1; e.shielded = !!s.phase; }
    if (s.phase) {
      e.hitFlash = 0.1;
      e.fireTimer -= dt;
      if (e.fireTimer <= 0) {
        e.fireTimer = (e.type.fireCooldown || 0.9) * 1.2;
        mirrorRing(game, e, 8, 0.75, s.ang += 0.38);
      }
      return;
    }
    mirrorApproach(game, e, dt, 1.15, 130);
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) {
      e.fireTimer = (e.type.fireCooldown || 0.9) * 0.9;
      mirrorFire(game, e, player.x, player.y, 1, 1.15);
    }
  },

  changedling: function(game, e, dt){
    const player = game.player, s = mirrorState(e);
    mirrorApproach(game, e, dt, 1.3, 100);
    s.t -= dt;
    if (s.t <= 0) {
      s.t = 2.2;
      mirrorBlast(game, e, e.x, e.y, 76);
      mirrorRing(game, e, 7, 0.7, s.ang += 0.45);
    }
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) {
      e.fireTimer = (e.type.fireCooldown || 0.9) * 1.1;
      mirrorFire(game, e, player.x, player.y, 1.05, 0.8);
    }
  },

  changelingqueen: function(game, e, dt){
    const player = game.player, s = mirrorState(e);
    mirrorApproach(game, e, dt, 0.85, 205);
    s.t -= dt;
    if (s.t <= 0) {
      s.t = 4;
      mirrorSummon(game, e, 'swarmerdnb', 2, 6);
    }
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) {
      e.fireTimer = (e.type.fireCooldown || 0.9) * 1.2;
      s.n++;
      if (s.n % 4 === 0) mirrorRing(game, e, 9, 0.8, s.ang += 0.3);
      else mirrorFire(game, e, player.x, player.y, 1, 0.95);
    }
  },

  filly: function(game, e, dt){
    const node = game.currentRoom, player = game.player, s = mirrorState(e);
    s.ang += dt * 4;
    const v = seekVector(e, player.x, player.y);
    const px = -v.y, py = v.x;
    const weave = Math.sin(s.ang) * 0.45;
    tryMoveEntity(e, node, node.obstacles,
      (v.x + px * weave) * e.speed * dt * 1.45,
      (v.y + py * weave) * e.speed * dt * 1.45);
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) {
      e.fireTimer = (e.type.fireCooldown || 0.9) * 0.55;
      const aim = Math.atan2(player.y - e.y, player.x - e.x);
      const opts = mirrorBoltOpts(e);
      opts.radius = Math.max(3, (opts.radius || 6) - 1);
      fireProjectileAngle(game, e, aim, (e.type.boltSpeed || 260) * 1.1, Math.max(1, Math.round(e.dmg * 0.5)), opts);
      mirrorRunLayers(game, e, aim);
    }
  },

  engineerpony: function(game, e, dt){
    const player = game.player, s = mirrorState(e);
    mirrorApproach(game, e, dt, 0.8, 215);
    s.t -= dt;
    if (s.t <= 0) {
      s.t = 2.8;
      s.x = e.x; s.y = e.y;
      const opts = mirrorBoltOpts(e);
      for (let k = 1; k <= 4; k++) {
        const gx = s.x, gy = s.y;
        mirrorDelay(e, k * 0.45, () => {
          const aim = Math.atan2(game.player.y - gy, game.player.x - gx);
          fireProjectileAngle(game, { x: gx, y: gy, isBoss: false }, aim, (e.type.boltSpeed || 260) * 1.05, Math.max(1, Math.round(e.dmg * 0.55)), opts);
        });
      }
    }
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) {
      e.fireTimer = (e.type.fireCooldown || 0.9) * 1.25;
      mirrorFire(game, e, player.x, player.y, 1, 0.9);
    }
  },

  chudfilly: function(game, e, dt){
    const player = game.player, s = mirrorState(e);
    mirrorApproach(game, e, dt, 1.1, 120);
    s.t -= dt;
    if (s.t <= 0) {
      s.t = 3.6;
      mirrorSummon(game, e, 'swarmerdnb', 3, 9);
    }
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) {
      e.fireTimer = (e.type.fireCooldown || 0.9) * 1.5;
      mirrorFire(game, e, player.x, player.y, 0.9, 0.7);
    }
  },

  chadfilly: function(game, e, dt){
    const player = game.player, s = mirrorState(e);
    mirrorApproach(game, e, dt, 1, 175);
    s.t -= dt;
    if (s.t <= 0) {
      s.t = 1.7;
      s.n++;
      const aim = Math.atan2(player.y - e.y, player.x - e.x);
      const dist = Math.min(190, Util.dist(e.x, e.y, player.x, player.y));
      const bx = e.x + Math.cos(aim) * dist, by = e.y + Math.sin(aim) * dist;
      mirrorDelay(e, 0.85, () => mirrorBlast(game, e, bx, by, 96));
      if (s.n % 3 === 0) {
        const ox = e.x, oy = e.y;
        mirrorDelay(e, 0.4, () => mirrorBlast(game, e, ox, oy, 84));
      }
      mirrorRunLayers(game, e, aim);
    }
  },

  snowpitymare: function(game, e, dt){
    const player = game.player, s = mirrorState(e);
    mirrorApproach(game, e, dt, 0.8, 200);
    s.t -= dt;
    if (s.t <= 0) {
      s.t = 2.5;
      s.ang += 0.5;
      const opts = mirrorBoltOpts(e);
      opts.homing = Math.max(opts.homing, 0.4);
      opts.color = '#dceaf5';
      opts.radius = Math.max(4, (opts.radius || 6) - 1);
      for (let i = 0; i < 5; i++) {
        const a = s.ang + (Math.PI * 2 * i) / 5;
        const sx = e.x + Math.cos(a) * 40, sy = e.y + Math.sin(a) * 40;
        mirrorDelay(e, i * 0.12, () => {
          fireProjectileAngle(game, { x: sx, y: sy, isBoss: false }, Math.atan2(game.player.y - sy, game.player.x - sx),
            (e.type.boltSpeed || 260) * 0.8, Math.max(1, Math.round(e.dmg * 0.55)), opts);
        });
      }
      mirrorRunLayers(game, e, s.ang);
    }
  },

  default: function(game, e, dt){
    const player = game.player, s = mirrorState(e);
    mirrorApproach(game, e, dt, 1, 160);
    e.fireTimer -= dt;
    if (e.fireTimer <= 0) {
      e.fireTimer = e.type.fireCooldown || 1;
      s.n++;
      if (s.n % 6 === 0) mirrorRing(game, e, 7, 0.8, s.ang += 0.35);
      else mirrorFire(game, e, player.x, player.y, 1, 1);
    }
  },
};

ENEMY_BEHAVIOR_HANDLERS.mirrorboss = function aiMirrorBoss(game, e, dt){
  mirrorTickDelayed(game, e, dt);
  const fn = MIRROR_BOSS_BEHAVIORS[e.mirrorClass] || MIRROR_BOSS_BEHAVIORS.default;
  fn(game, e, dt);
};
