'use strict';

function triggerSkillTechnique(game, event, impact, progress = 1){
  const player = game.player;
  const state = player.technique;
  if (!state || state.executing || player.isDead) return;
  const [name, trigger, threshold, origin, radius, action, upgrade] = state.config;
  if (trigger !== event) return;
  const node = game.currentRoom;
  if (event === 'move' && (node.cleared || !node.enemies.some(enemy => !enemy.isDead))) return;
  const now = game.runElapsed || 0;
  if (now < state.readyAt) return;
  if (action === 'syncopate') {
    if (now - (state.lastHitAt || 0) > 1.15) state.progress = 0;
    state.lastHitAt = now;
  }
  if (event !== 'hurt') {
    state.progress = Math.min(threshold, state.progress + progress);
    if (state.progress < threshold) return;
  }

  const facing = player.facing;
  const x = origin === 'impact' ? impact.x : player.x - (origin === 'behind' ? facing.x * 48 : 0);
  const y = origin === 'impact' ? impact.y : player.y - (origin === 'behind' ? facing.y * 48 : 0);
  const targets = node.enemies.filter(enemy => {
    if (enemy.isDead) return false;
    const dx = enemy.x - x, dy = enemy.y - y;
    if (Math.hypot(dx, dy) > radius + enemy.radius) return false;
    if (origin === 'forward' && (dx * facing.x + dy * facing.y < 0
      || Math.abs(dx * facing.y - dy * facing.x) > 32 + enemy.radius)) return false;
    return hasLineOfSight(node, { x, y, radius:0 }, enemy.x, enemy.y);
  }).sort((a, b) => Util.dist2(x, y, a.x, a.y) - Util.dist2(x, y, b.x, b.y));

  const ctx = { game, player, node, targets, impact, x, y, radius, facing, relayTarget:null };
  // Kills caused by a technique still receive rewards, but cannot charge it.
  state.executing = true;
  try {
    const effect = TECHNIQUE_ACTIONS[action];
    const applied = effect(ctx, state.rank === 2 && action === upgrade);
    const conditional = upgrade === 'haste' || upgrade === 'guard' || upgrade === 'mend' || upgrade === 'summon' || action === 'relay';
    const upgraded = state.rank === 2 && action !== upgrade && (!conditional || applied)
      && TECHNIQUE_ACTIONS[upgrade](ctx);
    if (!applied && !upgraded) return;
    state.progress = 0;
    state.readyAt = now + (event === 'hurt' ? threshold : event === 'blast' ? 0.7 : 0.85);
    game.floatTexts.push(new FloatText(x, y - 24, name, player.def.color, true));
  } finally {
    state.executing = false;
  }
}

function techniqueDamage(ctx, target, strength){
  if (target.isDead) return false;
  const player = ctx.player;
  const attack = player.noAttack ? 1.4 : Math.max(player.meleeDamage, player.rangedDamage);
  const damage = Math.max(1, attack * strength) * (target.isBoss ? 0.65 : 1);
  if (!target.takeDamage(damage, 0, 0)) return false;
  if (target.isDead) handleEnemyDeath(ctx.game, target);
  return true;
}

function techniqueTargets(ctx, effect){
  const targets = ctx.relayTarget ? [ctx.relayTarget] : ctx.targets;
  let affected = false;
  for (const target of targets) {
    if (!target.isDead && effect(target)) affected = true;
  }
  return affected;
}

function techniqueStatus(field, duration){
  return ctx => techniqueTargets(ctx, target => {
    if (target.isBoss || target.isChallengeBoss || target.isMiniboss) return false;
    target[field] = Math.max(target[field] || 0, duration);
    return true;
  });
}

function techniqueImpulse(direction){
  return ctx => techniqueTargets(ctx, target => {
    if (target.isBoss || target.isChallengeBoss || target.isMiniboss) return false;
    const dx = target.x - ctx.x, dy = target.y - ctx.y;
    const distance = Math.hypot(dx, dy) || 1;
    target.knockX += dx / distance * direction;
    target.knockY += dy / distance * direction;
    return true;
  });
}

function techniqueArea(ctx, strength){
  if (!techniqueTargets(ctx, target => techniqueDamage(ctx, target, strength))) return false;
  ctx.game.explosions.push(new Explosion(ctx.x, ctx.y, ctx.radius));
  return true;
}

function techniqueArc(ctx, target, from, strength){
  if (!techniqueDamage(ctx, target, strength)) return false;
  ctx.game.laserFX = { x1:from.x, y1:from.y, x2:target.x, y2:target.y, life:0.19,
    maxLife:0.19, color:ctx.player.def.color, width:3 };
  return true;
}

const TECHNIQUE_ACTIONS = {
  quake: ctx => techniqueArea(ctx, 0.65),
  syncopate: ctx => techniqueTargets(ctx, target => {
    if (target.isBoss || target.isMiniboss || target.isChallengeBoss) return false;
    target.stunTimer = Math.max(target.stunTimer, 0.85);
    return true;
  }),
  hoard: ctx => techniqueArea(ctx, 0.5 + Math.min(0.6, ctx.player.coins * 0.02)),
  shove: techniqueImpulse(11),
  pull: techniqueImpulse(-12),
  freeze: techniqueStatus('freezeTimer', 0.9),
  fear: techniqueStatus('fearTimer', 1.25),
  charm: techniqueStatus('charmTimer', 1.25),
  poison: techniqueStatus('poisonTimer', 2.4),
  mark: ctx => techniqueTargets(ctx, target => {
    target.vulnerableTimer = Math.max(target.vulnerableTimer || 0, target.isBoss ? 0.75 : 1.5);
    return true;
  }),
  guard: ctx => {
    ctx.player.techniqueGuardUntil = ctx.game.runElapsed + 2.75;
    return true;
  },
  haste: ctx => {
    ctx.player.speedBoostTimer = Math.max(ctx.player.speedBoostTimer, 1.15);
    return true;
  },
  mend: ctx => { ctx.player.heal(0.5); return true; },
  screen: ctx => {
    let intercepted = 0;
    for (const shot of ctx.game.projectiles) {
      if (!shot.dead && shot.owner === 'enemy' && Util.dist2(ctx.x, ctx.y, shot.x, shot.y) < ctx.radius ** 2) {
        shot.dead = true;
        if (++intercepted === 6) break;
      }
    }
    return intercepted > 0;
  },
  lance: ctx => {
    let hit = false;
    for (const target of ctx.targets) {
      const dx = target.x - ctx.x, dy = target.y - ctx.y;
      if (dx * ctx.facing.x + dy * ctx.facing.y < 0 || Math.abs(dx * ctx.facing.y - dy * ctx.facing.x) > 24 + target.radius) continue;
      hit = techniqueDamage(ctx, target, 0.8) || hit;
    }
    if (hit) ctx.game.laserFX = { x1:ctx.x, y1:ctx.y, x2:ctx.x + ctx.facing.x * ctx.radius,
      y2:ctx.y + ctx.facing.y * ctx.radius, life:0.16, maxLife:0.16, color:ctx.player.def.color, width:4 };
    return hit;
  },
  ricochet: (ctx, split) => {
    const targets = ctx.targets.filter(target => target !== ctx.impact && !target.isDead);
    let hit = false;
    for (const target of targets.slice(0, split ? 2 : 1)) {
      if (!techniqueArc(ctx, target, ctx, 0.8)) continue;
      hit = true;
      ctx.relayTarget = target;
    }
    return hit;
  },
  relay: ctx => {
    const target = ctx.targets.find(enemy => !enemy.isDead);
    if (!target) return false;
    const turret = (ctx.node.playerTurrets || []).filter(t =>
      Util.dist2(t.x, t.y, target.x, target.y) <= t.sightRange ** 2
      && hasLineOfSight(ctx.node, { x:t.x, y:t.y, radius:0 }, target.x, target.y))
      .sort((a, b) => Util.dist2(a.x, a.y, target.x, target.y) - Util.dist2(b.x, b.y, target.x, target.y))[0];
    if (!turret) return false;
    ctx.relayTarget = target;
    return techniqueArc(ctx, target, turret, 0.85);
  },
  summon: ctx => {
    if (ctx.player.changelingMinions.length >= ctx.player.maxChangelingMinions) return false;
    ctx.player._changelingSummonTimer = 0;
    return true;
  },
};
