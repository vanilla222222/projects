'use strict';

const TEAR_SHAPES = {

  round:   { radiusMult: 1,   speedMult: 1,   damageMult: 1 },
  heavy:   { radiusMult: 1.4, speedMult: 0.8, damageMult: 1.25 },
  needle:  { radiusMult: 0.6, speedMult: 1.3, damageMult: 0.85 },

  bouncy:  { radiusMult: 1, speedMult: 1, damageMult: 1,
    onSpawn(pr) { pr.ricochet = Math.max(pr.ricochet || 0, 99); }
  },

  boomerang: { radiusMult: 1, speedMult: 1, damageMult: 1,
    onSpawn(pr) { pr.boomerang = { originX: pr.x, originY: pr.y, maxDist: 260, stage: 'out' }; },
    onUpdate(pr, dt) {
      const b = pr.boomerang; if (!b) return;
      const dx = pr.x - b.originX, dy = pr.y - b.originY;
      if (b.stage === 'out' && (dx * dx + dy * dy) >= b.maxDist * b.maxDist) {
        b.stage = 'back'; pr.vx = -pr.vx; pr.vy = -pr.vy;
        if (pr.explosive) pr.exploded = false;
      } else if (b.stage === 'back' && (dx * dx + dy * dy) < 16 * 16) {
        pr.dead = true;
      }
    }
  },

  orbiter: { radiusMult: 1, speedMult: 1, damageMult: 1, ignoresHoming: true,
    onSpawn(pr) { pr.orbit = { angle: Math.random() * Math.PI * 2, radius: 70, speed: 3.2, lastHit: {} }; pr.life = 9999; },
    onUpdate(pr, dt, game) {
      const o = pr.orbit; if (!o || !game || !game.player) return;
      o.angle += o.speed * dt;
      pr.x = game.player.x + Math.cos(o.angle) * o.radius;
      pr.y = game.player.y + Math.sin(o.angle) * o.radius;
      pr.vx = 0; pr.vy = 0;
    }
  },

  spiral: { radiusMult: 1, speedMult: 1.05, damageMult: 1,
    onUpdate(pr, dt) {
      pr.__spiralT = (pr.__spiralT || 0) + dt * 6;
      const wob = Math.sin(pr.__spiralT) * 70 * dt;
      const nx = -pr.vy, ny = pr.vx;
      const len = Math.hypot(nx, ny) || 1;
      pr.x += (nx / len) * wob;
      pr.y += (ny / len) * wob;
    }
  },

  razor: { radiusMult: 0.45, speedMult: 1.5, damageMult: 0.65 }
};

const SHAPE_PRIORITY = { boomerang: 7, orbiter: 6, bouncy: 5, needle: 4, heavy: 3, spiral: 2, razor: 1 };

function resolveTearMods(player, familiar){
  const tf = (player && player.tearFlags) || {};
  const shape = familiar ? 'round' : (tf.shape || 'round');
  const shapeDef = TEAR_SHAPES[shape] || TEAR_SHAPES.round;
  const sizeMult = Util.clamp(tf.sizeMult || 1, 0.5, 2.5);
  const sizeDamage = 1 + (sizeMult - 1) * 0.5;
  const sizeSpeed = Util.clamp(1 - (sizeMult - 1) * 0.25, 0.5, 1.5);
  return {
    shape, shapeDef, sizeMult,
    radiusMult: shapeDef.radiusMult * sizeMult,
    damageMult: shapeDef.damageMult * sizeDamage,
    speedMult: shapeDef.speedMult * sizeSpeed
  };
}
