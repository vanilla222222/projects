'use strict';

const CAST_ATTACK_STYLES = {

  echoShot(game, trigger, ctx, layer){
    const player = game.player;
    const delay = layer.delay || 0.25;
    const power = layer.power || 0.5;
    const ang = ctx.ang, x = ctx.x, y = ctx.y;
    player.delayedActions.push({
      time: delay,
      fn: () => {
        if (game.state !== 'playing') return;
        const node = game.currentRoom;
        if (trigger === 'melee') {
          const coneHalfWidth = Math.PI * 0.5;
          for (const e of node.enemies) {
            if (e.isDead) continue;
            const d = Util.dist(x, y, e.x, e.y);
            if (d >= player.meleeRange + e.radius) continue;
            const angTo = Math.atan2(e.y - y, e.x - x);
            if (Math.abs(normalizeAngle(angTo - ang)) < coneHalfWidth) dealPlayerDamage(game, e, ang, { dmgMult: power });
          }
        } else {
          game.projectiles.push(new Projectile(
            x, y, Math.cos(ang) * player.boltSpeed, Math.sin(ang) * player.boltSpeed,
            player.rangedDamage * power, 'player', { color:'#c9c3ff', radius:5, life:(player.rangeTiles * TILE) / player.boltSpeed }
          ));
        }
        Sound.play('rangedShot');
      },
    });
  },

  mirrorConvert(game, trigger, ctx, layer){
    const player = game.player, node = game.currentRoom;
    const power = layer.power || 0.4;
    if (trigger === 'melee') {
      game.projectiles.push(new Projectile(
        ctx.x, ctx.y, Math.cos(ctx.ang) * player.boltSpeed, Math.sin(ctx.ang) * player.boltSpeed,
        player.meleeDamage * power, 'player', { color:'#e0c9ff', radius:5, life:(player.rangeTiles * TILE) / player.boltSpeed }
      ));
    } else {
      const coneHalfWidth = Math.PI * 0.5;
      for (const e of node.enemies) {
        if (e.isDead) continue;
        const d = Util.dist(ctx.x, ctx.y, e.x, e.y);
        if (d >= player.meleeRange + e.radius) continue;
        const angTo = Math.atan2(e.y - ctx.y, e.x - ctx.x);
        if (Math.abs(normalizeAngle(angTo - ctx.ang)) < coneHalfWidth) dealPlayerDamage(game, e, ctx.ang, { dmgMult: power });
      }
    }
  },

  groundSlam(game, trigger, ctx, layer){
    if (trigger !== 'melee') return;
    const node = game.currentRoom, player = game.player;

    const giantSynergy = (layer.itemId === 'apexchronometer' && player.passives && player.passives.giantsheart) ? 1.35 : 1;
    const radius = (layer.radius || 70) * giantSynergy;
    const power = layer.power || 0.4;
    for (const e of node.enemies) {
      if (e.isDead) continue;
      if (Util.dist(player.x, player.y, e.x, e.y) > radius + e.radius) continue;
      const applied = e.takeDamage(player.meleeDamage * power, 0, 0);
      if (applied && e.isDead) handleEnemyDeath(game, e);
    }
  },

  chargeNova(game, trigger, ctx, layer){
    const player = game.player, node = game.currentRoom;
    const key = '_chargeNovaCount_' + layer.itemId;
    player[key] = (player[key] || 0) + 1;
    const every = layer.every || 6;
    if (player[key] < every) return;
    player[key] = 0;
    let radius = layer.radius || 90;
    const power = layer.power || 1.2;

    if (layer.itemId === 'eventchronometer' && player.passives && player.passives.eventhorizonheart) radius *= 1.3;
    Sound.play('bombExplode');
    for (const e of node.enemies) {
      if (e.isDead) continue;
      if (Util.dist(player.x, player.y, e.x, e.y) > radius + e.radius) continue;
      const applied = e.takeDamage(player.meleeDamage * power, 0, 0);
      if (applied && e.isDead) handleEnemyDeath(game, e);
    }
  },

  ricochetBolt(game, trigger, ctx, layer){
    if (!ctx.projectiles) return;
    for (const proj of ctx.projectiles) proj.ricochet = (proj.ricochet || 0) + (layer.bounces || 1);
  },

  orbitBlades(game, trigger, ctx, layer){
    if (trigger !== 'tick') return;
    const player = game.player, node = game.currentRoom, dt = ctx.dt;
    const n = layer.blades || 2;
    const radius = layer.radius || 46;
    const speed = layer.spinSpeed || 2.6;
    player._orbitBladeAngle = (player._orbitBladeAngle || 0) + speed * dt;
    player._orbitBladeCooldowns = player._orbitBladeCooldowns || {};
    for (let i = 0; i < n; i++) {
      const ang = player._orbitBladeAngle + (i / n) * Math.PI * 2;
      const bx = player.x + Math.cos(ang) * radius, by = player.y + Math.sin(ang) * radius;
      for (const e of node.enemies) {
        if (e.isDead) continue;
        const key = layer.itemId + ':' + i + ':' + e.id;
        if ((player._orbitBladeCooldowns[key] || 0) > 0) continue;
        if (Util.dist(bx, by, e.x, e.y) < 14 + e.radius) {
          const applied = e.takeDamage((layer.dmg || 0.5) * player.meleeDamage, Math.cos(ang) * 2, Math.sin(ang) * 2);
          if (applied) {
            player._orbitBladeCooldowns[key] = 0.4;
            applyOnHitStatuses(game, e);
            if (e.isDead) { bumpStat('meleeKills', 1, game); handleEnemyDeath(game, e); }
          }
        }
      }
    }
    for (const k in player._orbitBladeCooldowns) if (player._orbitBladeCooldowns[k] > 0) player._orbitBladeCooldowns[k] -= dt;
  },

  guardianPulse(game, trigger, ctx, layer){
    if (trigger !== 'tick') return;
    const player = game.player, node = game.currentRoom, dt = ctx.dt;
    const key = layer.itemId || 'guardianPulse';
    player._guardianPulseTimers = player._guardianPulseTimers || {};
    player._guardianPulseTimers[key] = (player._guardianPulseTimers[key] || 0) - dt;
    if (player._guardianPulseTimers[key] > 0) return;
    player._guardianPulseTimers[key] = layer.interval || 2.0;
    let power = layer.power || 0.5;
    let radius = layer.radius || 90;

    if (layer.itemId === 'guardianfeather' && player.passives.guardianhalo) { power += 0.3; radius += 20; }
    if (layer.itemId === 'guardianhalo' && player.passives.guardianfeather) { power += 0.3; radius += 20; }

    if (layer.itemId === 'hardenedscales' && player.passives.hallowedbracer) { power += 0.25; radius += 15; }
    if (layer.itemId === 'hallowedbracer' && player.passives.hardenedscales) { power += 0.25; radius += 15; }

    if (layer.itemId === 'hallowedbracer') {
      const hallowedIds = ['hallowedamulet','hallowedbracer','hallowedgauntlet','hallowedheart','hallowedpendant','hallowedrelic','hallowedsignet'];
      let owned = 0;
      for (const id of hallowedIds) if (player.passives[id]) owned++;
      if (owned >= 3) { power += 0.4; radius += 25; }
    }
    const dmg = power * player.meleeDamage;
    for (const e of node.enemies) {
      if (e.isDead) continue;
      if (Util.dist(player.x, player.y, e.x, e.y) < radius) {
        const ang = Math.atan2(e.y - player.y, e.x - player.x);
        const applied = e.takeDamage(dmg, Math.cos(ang) * 2, Math.sin(ang) * 2);
        if (applied) {
          applyOnHitStatuses(game, e);
          if (e.isDead) { bumpStat('meleeKills', 1, game); handleEnemyDeath(game, e); }
        }
      }
    }
  },

  scatterVolley(game, trigger, ctx, layer){
    const player = game.player;
    const n = layer.bolts || 2;
    const spread = layer.spread || 0.9;
    const power = layer.power || 0.3;
    const base = trigger === 'melee' ? player.meleeDamage : player.rangedDamage;
    for (let i = 0; i < n; i++) {

      const off = (i - (n - 1) / 2) * (spread / Math.max(1, n - 1)) + (n === 1 ? spread * 0.5 : 0);
      const ang = ctx.ang + off;
      game.projectiles.push(new Projectile(
        ctx.x, ctx.y, Math.cos(ang) * player.boltSpeed * 0.9, Math.sin(ang) * player.boltSpeed * 0.9,
        base * power, 'player', { color:'#ffb37a', radius:4, life:(player.rangeTiles * TILE) / player.boltSpeed }
      ));
    }
  },

  skyfall(game, trigger, ctx, layer){
    if (trigger !== 'ranged' && trigger !== 'volley') return;
    if (RNG.random() >= (layer.chance || 0.18)) return;
    const node = game.currentRoom, player = game.player;
    const candidates = node.enemies.filter(e => !e.isDead && !e.isBoss);
    if (!candidates.length) return;
    const target = candidates[Math.floor(RNG.random() * candidates.length)];
    const tx = target.x, ty = target.y;
    const delay = layer.delay || 1.1;
    const radius = layer.radius || 60;
    const power = layer.power || 0.9;
    const dmg = (ctx.dmg || player.rangedDamage) * power;
    player.delayedActions.push({
      time: delay,
      fn: () => {
        if (game.state !== 'playing') return;
        game.explosions.push(new Explosion(tx, ty, radius));
        Sound.play('explosion');
        for (const e of game.currentRoom.enemies) {
          if (e.isDead || e.isBoss) continue;
          if (Util.dist(tx, ty, e.x, e.y) > radius + e.radius) continue;
          const applied = e.takeDamage(dmg, (e.x - tx) * 0.06, (e.y - ty) * 0.06);
          if (applied && e.isDead) handleEnemyDeath(game, e);
        }
      },
    });
  },

  mineLayer(game, trigger, ctx, layer){
    const player = game.player;
    const key = '_mineLayerCount_' + layer.itemId;
    player[key] = (player[key] || 0) + 1;
    const every = layer.every || 5;
    if (player[key] < every) return;
    player[key] = 0;
    const mx = ctx.x, my = ctx.y;
    const delay = layer.delay || 1.2;
    const radius = layer.radius || 90;
    const power = layer.power || 1.5;
    player.delayedActions.push({
      time: delay,
      fn: () => {
        if (game.state !== 'playing') return;
        const node = game.currentRoom;
        game.explosions.push(new Explosion(mx, my, radius));
        Sound.play('explosion');
        for (const e of node.enemies) {
          if (e.isDead) continue;
          if (Util.dist(mx, my, e.x, e.y) > radius + e.radius) continue;
          const applied = e.takeDamage(player.meleeDamage * power, (e.x - mx) * 0.06, (e.y - my) * 0.06);
          if (applied && e.isDead) handleEnemyDeath(game, e);
        }
      },
    });
  },

  beamSweep(game, trigger, ctx, layer){
    const player = game.player, node = game.currentRoom;
    const key = '_beamSweepCount_' + layer.itemId;
    player[key] = (player[key] || 0) + 1;
    const every = layer.every || 4;
    if (player[key] < every) return;
    player[key] = 0;
    const length = layer.length || 4 * TILE;
    const halfWidth = layer.width || 22;
    let power = layer.power || 0.9;

    if (layer.itemId === 'emberwick' && player.passives && player.passives.emberheart) power += 0.2;
    const dx = Math.cos(ctx.ang), dy = Math.sin(ctx.ang);
    Sound.play('laserShot');
    for (const e of node.enemies) {
      if (e.isDead) continue;
      const ex = e.x - ctx.x, ey = e.y - ctx.y;
      const along = ex * dx + ey * dy;
      if (along < 0 || along > length) continue;
      const perp = ex * dy - ey * dx;
      if (Math.abs(perp) > halfWidth + e.radius) continue;
      const applied = e.takeDamage(player.rangedDamage * power, dx * 2, dy * 2);
      if (applied && e.isDead) handleEnemyDeath(game, e);
    }
  },

  laggedEcho(game, trigger, ctx, layer){
    if (trigger === 'melee') return;
    const player = game.player;
    const power = layer.power || 0.55;
    const x = ctx.x, y = ctx.y;
    const fire = (mult) => () => {
      if (game.state !== 'playing') return;
      const node = game.currentRoom;
      let best = null, bestD = Infinity;
      for (const e of node.enemies) {
        if (e.isDead) continue;
        const d = Util.dist(x, y, e.x, e.y);
        if (d < bestD) { best = e; bestD = d; }
      }
      if (!best) return;
      const ang = Math.atan2(best.y - y, best.x - x);
      game.projectiles.push(new Projectile(
        x, y, Math.cos(ang) * player.boltSpeed, Math.sin(ang) * player.boltSpeed,
        player.rangedDamage * mult, 'player', { color:'#ffd9a0', radius:5, life:(player.rangeTiles * TILE) / player.boltSpeed }
      ));
      Sound.play('rangedShot');
    };
    player.delayedActions.push({ time: layer.delay1 || 0.25, fn: fire(power) });
    player.delayedActions.push({ time: layer.delay2 || 0.55, fn: fire(power * 0.7) });
  },

  whipArc(game, trigger, ctx, layer){
    const player = game.player, node = game.currentRoom;
    const key = '_whipArcCount_' + layer.itemId;
    player[key] = (player[key] || 0) + 1;
    const every = layer.every || 3;
    if (player[key] < every) return;
    player[key] = 0;
    let range = layer.range || 70;
    const halfAngle = layer.arc || 0.6;

    if (layer.itemId === 'explorersboots' && player.passives && player.passives.gildedwing) range *= 1.25;

    let power = layer.power || 1.2;
    if (layer.itemId === 'goldengauntlet' && player.passives && player.passives.goldenbrooch) power += 0.3;
    Sound.play('meleeSwing');
    for (const e of node.enemies) {
      if (e.isDead) continue;
      if (Util.dist(ctx.x, ctx.y, e.x, e.y) > range + e.radius) continue;
      const angTo = Math.atan2(e.y - ctx.y, e.x - ctx.x);
      if (Math.abs(normalizeAngle(angTo - ctx.ang)) > halfAngle) continue;
      const applied = e.takeDamage(player.meleeDamage * power, 0, 0);
      if (applied && e.isDead) handleEnemyDeath(game, e);
    }
  },
};

const HIT_ATTACK_STYLES = {

  chainLightning(game, trigger, ctx, layer){
    const node = game.currentRoom, player = game.player;
    const range = layer.range || 120;
    let power = layer.power || 0.5;

    if (layer.itemId === 'gildedtrinket' && player.passives && player.passives.fangguard) power += 0.25;
    const source = ctx.hits[0];
    let best = null, bestD = range;
    for (const e of node.enemies) {
      if (e.isDead || e === source) continue;
      const d = Util.dist(source.x, source.y, e.x, e.y);
      if (d < bestD) { best = e; bestD = d; }
    }
    if (best) {
      const applied = best.takeDamage((ctx.dmg || player.meleeDamage) * power, 0, 0);
      if (applied) {
        Sound.play('rangedShot');
        game.floatTexts.push(new FloatText(best.x, best.y - 20, 'zap', '#7fd0ff'));
        if (best.isDead) handleEnemyDeath(game, best);
      }
    }
  },

  knockbackPulse(game, trigger, ctx, layer){
    const player = game.player;
    let strength = layer.strength || 5;

    if (layer.itemId === 'gauntletveteransmedal' && player.passives && player.passives.giantsheart) strength *= 1.4;
    const e = ctx.hits[0];
    if (e.isDead) return;
    const dx = e.x - ctx.x, dy = e.y - ctx.y;
    const d = Math.hypot(dx, dy) || 1;
    e.takeDamage(0, (dx / d) * strength, (dy / d) * strength);
  },

  onKillFragments(game, trigger, ctx, layer){
    const e = ctx.hits[0];
    if (!e.isDead) return;
    const player = game.player;

    const lockSynergy = (layer.itemId === 'brasslockpick' && player.passives && player.passives.blacklockboxkey) ? 1 : 0;

    const devotionSynergy = (layer.itemId === 'eternaldevotion' && player.passives && player.passives.collapsecatalyst) ? 1 : 0;
    const n = (layer.fragments || 3) + lockSynergy + devotionSynergy;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + RNG.random() * 0.6;
      game.projectiles.push(new Projectile(
        e.x, e.y, Math.cos(ang) * 220, Math.sin(ang) * 220,
        player.rangedDamage * (layer.power || 0.35), 'player',
        { color:'#ffd97a', radius:4, life:1.4, homing:1 }
      ));
    }
  },

  bloodPact(game, trigger, ctx, layer){
    const player = game.player;
    const cost = layer.hpCost || 0.1;
    if (player.redCurrent - cost < 0.5) return;
    const e = ctx.hits[0];
    if (e.isDead) return;
    player.redCurrent -= cost;
    let power = layer.power || 0.5;

    if (layer.itemId === 'cursedlocket' && player.passives && player.passives.bloodpact) power += 0.15;
    if (layer.itemId === 'devilsbargainring' && player.passives && player.passives.blackheart) power += 0.2;

    if (layer.itemId === 'gluttonyscoin' && player.passives && player.passives.bloodpact) power += 0.2;
    const applied = e.takeDamage((ctx.dmg || player.meleeDamage) * power, 0, 0);
    if (applied && e.isDead) handleEnemyDeath(game, e);
  },

  frostShatter(game, trigger, ctx, layer){
    const player = game.player;
    const e = ctx.hits[0];
    if (e.isDead) return;
    if (e.freezeTimer > 0) {
      const applied = e.takeDamage((ctx.dmg || player.meleeDamage) * (layer.power || 0.4), 0, 0);
      if (applied) {
        game.floatTexts.push(new FloatText(e.x, e.y - 20, 'shatter', '#7fd6e0'));
        if (e.isDead) handleEnemyDeath(game, e);
      }
      return;
    }
    if (e.isBoss) return;
    if (RNG.random() >= (layer.chance || 0.2)) return;
    let duration = layer.duration || 1.2;

    if (layer.itemId === 'gildedcrown' && player.passives && player.passives.gildedwing) duration *= 1.5;
    e.freezeTimer = Math.max(e.freezeTimer, duration);
    bumpStat('enemiesFrozen', 1, game);
    Sound.play('statusFreeze');
  },

  impactBurst(game, trigger, ctx, layer){
    const node = game.currentRoom, player = game.player;
    const source = ctx.hits[0];
    const radius = layer.radius || 60;
    let power = layer.power || 0.35;

    if (layer.itemId === 'giantsbanealloy' && player.passives && player.passives.giantsheart) power *= 1.5;
    let anyHit = false;
    for (const e of node.enemies) {
      if (e.isDead || e === source) continue;
      if (Util.dist(source.x, source.y, e.x, e.y) > radius + e.radius) continue;
      const applied = e.takeDamage((ctx.dmg || player.meleeDamage) * power, 0, 0);
      if (applied) {
        anyHit = true;
        if (e.isDead) handleEnemyDeath(game, e);
      }
    }
    if (anyHit) Sound.play('bombExplode');
  },

  markedForDeath(game, trigger, ctx, layer){
    const player = game.player;
    const e = ctx.hits[0];
    if (e.isDead) return;
    if (e.isBoss) return;
    if (e.vulnerableTimer > 0) {
      const applied = e.takeDamage((ctx.dmg || player.meleeDamage) * (layer.power || 0.5), 0, 0);
      if (applied) {
        game.floatTexts.push(new FloatText(e.x, e.y - 20, 'marked!', '#d84a4a'));
        if (e.isDead) handleEnemyDeath(game, e);
      }
      return;
    }
    if (RNG.random() >= (layer.chance || 0.25)) return;
    let duration = layer.duration || 2.5;

    if (layer.itemId === 'gildedcompass' && player.passives && player.passives.fortunaterelic) duration *= 1.4;

    if (layer.itemId === 'hexbreakertalisman' && player.passives && player.passives.hexedtracker) duration *= 1.3;
    e.vulnerableTimer = Math.max(e.vulnerableTimer, duration);
    bumpStat('enemiesMarkedVulnerable', 1, game);
    Sound.play('statusStun');
  },

  venomBloom(game, trigger, ctx, layer){
    const node = game.currentRoom, player = game.player;
    const e = ctx.hits[0];
    if (e.isDead) return;
    if (e.isBoss) return;
    let radius = layer.radius || 90;

    if (layer.itemId === 'fangguard' && player.passives && player.passives.gildedtrinket) radius *= 1.3;
    if (e.poisonTimer > 0) {
      const applied = e.takeDamage((ctx.dmg || player.meleeDamage) * (layer.power || 0.4), 0, 0);
      if (applied) {
        for (const other of node.enemies) {
          if (other === e || other.isDead || other.isBoss) continue;
          if (Util.dist(e.x, e.y, other.x, other.y) > radius + other.radius) continue;
          other.poisonTimer = Math.max(other.poisonTimer, 3);
          if (other.poisonTickTimer <= 0) other.poisonTickTimer = 0.8;
        }
        game.floatTexts.push(new FloatText(e.x, e.y - 20, 'bloom!', '#8ac93a'));
        if (e.isDead) handleEnemyDeath(game, e);
      }
      return;
    }
    if (RNG.random() >= (layer.chance || 0.3)) return;
    e.poisonTimer = Math.max(e.poisonTimer, 4);
    if (e.poisonTickTimer <= 0) e.poisonTickTimer = 0.8;
    Sound.play('statusPoison');
  },

  gravityWell(game, trigger, ctx, layer){
    if (RNG.random() >= (layer.chance || 0.35)) return;
    const node = game.currentRoom, player = game.player;
    let radius = layer.radius || 120;
    let power = layer.power || 2.0;

    if (layer.itemId === 'gravitonnet' && player.passives && player.passives.eventhorizonheart) { radius += 30; power += 0.6; }
    for (const e of node.enemies) {
      if (e.isDead) continue;
      const dx = e.x - ctx.x, dy = e.y - ctx.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d > radius + e.radius) continue;
      e.takeDamage(0, -(dx / d) * power, -(dy / d) * power);
    }
  },

  trailBurn(game, trigger, ctx, layer){
    const player = game.player;
    const bx = ctx.x, by = ctx.y;
    const pulses = layer.pulses || 3;
    const interval = layer.interval || 0.45;
    const radius = layer.radius || 55;
    const tick = layer.tick || 0.3;
    for (let i = 1; i <= pulses; i++) {
      player.delayedActions.push({
        time: interval * i,
        fn: () => {
          if (game.state !== 'playing') return;
          const node = game.currentRoom;
          for (const e of node.enemies) {
            if (e.isDead) continue;
            if (Util.dist(bx, by, e.x, e.y) > radius + e.radius) continue;
            const applied = e.takeDamage(player.rangedDamage * tick, 0, 0);
            if (applied && e.isDead) handleEnemyDeath(game, e);
          }
        },
      });
    }
  },

  singularity(game, trigger, ctx, layer){
    if (RNG.random() >= (layer.chance || 0.22)) return;
    const player = game.player;
    const bx = ctx.x, by = ctx.y;
    const delay = layer.delay || 0.6;
    let radius = layer.radius || 100;
    const power = layer.power || 0.9;

    if (layer.itemId === 'eventhorizonheart' && player.passives && player.passives.eventchronometer) radius *= 1.3;
    player.delayedActions.push({
      time: delay,
      fn: () => {
        if (game.state !== 'playing') return;
        const node = game.currentRoom;
        for (const e of node.enemies) {
          if (e.isDead) continue;
          const d = Util.dist(bx, by, e.x, e.y);
          if (d > radius + e.radius) continue;
          const dx = e.x - bx, dy = e.y - by;
          const dd = d || 1;
          const applied = e.takeDamage(player.rangedDamage * power, -(dx / dd) * 3, -(dy / dd) * 3);
          if (applied && e.isDead) handleEnemyDeath(game, e);
        }
      },
    });
  },
};

function runCastLayers(game, trigger, ctx){
  const player = game.player;
  if (!player.attackLayers || !player.attackLayers.length) return;
  for (const layer of player.attackLayers) {
    const handler = CAST_ATTACK_STYLES[layer.style];
    if (handler) handler(game, trigger, ctx, layer);
  }
}

function runHitLayers(game, trigger, ctx){
  const player = game.player;
  if (!player.attackLayers || !player.attackLayers.length) return;
  for (const layer of player.attackLayers) {
    const handler = HIT_ATTACK_STYLES[layer.style];
    if (handler) handler(game, trigger, ctx, layer);
  }
}

function tickOrbitBlades(game, dt){
  const player = game.player;
  if (!player.attackLayers || !player.attackLayers.length) return;
  for (const layer of player.attackLayers) {
    if (layer.style === 'orbitBlades') CAST_ATTACK_STYLES.orbitBlades(game, 'tick', { dt }, layer);
    else if (layer.style === 'guardianPulse') CAST_ATTACK_STYLES.guardianPulse(game, 'tick', { dt }, layer);
  }
}

function tickDelayedActions(player, dt){
  if (!player.delayedActions.length) return;
  for (let i = player.delayedActions.length - 1; i >= 0; i--) {
    const a = player.delayedActions[i];
    a.time -= dt;
    if (a.time <= 0) { a.fn(); player.delayedActions.splice(i, 1); }
  }
}
