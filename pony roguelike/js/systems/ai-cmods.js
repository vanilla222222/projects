'use strict';

const CMODS = {
  ringPulse(game, e, dt, m){ e.fwmA = (e.fwmA === undefined) ? Util.rand(0, m.cd) : e.fwmA - dt; if (e.fwmA <= 0) { e.fwmA = m.cd; hlwArc(game, e, 0, m.n, Math.PI * 2, m.spd, { color: m.col }); } },
  trailMine(game, e, dt, m){
    const node = game.currentRoom; node.fwmTrail = node.fwmTrail || [];
    e.fwmA = (e.fwmA === undefined) ? m.cd : e.fwmA - dt;
    if (e.fwmA <= 0) { e.fwmA = m.cd; node.fwmTrail.push({ o: e, x: e.x, y: e.y, t: m.fuse }); }
    for (let i = node.fwmTrail.length - 1; i >= 0; i--) { const q = node.fwmTrail[i]; if (q.o !== e) continue; q.t -= dt; if (q.t <= 0) { hlwBlast(game, e, q.x, q.y, m.r, 0); node.fwmTrail.splice(i, 1); } }
  },
  enrage(game, e, dt, m){ if (e.fwmBase === undefined) e.fwmBase = e.speed; e.speed = e.hp < e.maxHp * m.frac ? e.fwmBase * m.mul : e.fwmBase; },
  regen(game, e, dt, m){ e.fwmA = (e.fwmA || 0) + dt; if (e.fwmA >= m.cd) { e.fwmA = 0; if (e.hp < e.maxHp) e.hp += 1; } },
  spiral(game, e, dt, m){ e.fwmA = (e.fwmA || 0) - dt; e.fwmR = (e.fwmR || 0) + dt * m.rot; if (e.fwmA <= 0) { e.fwmA = m.cd; fireProjectileAngle(game, e, e.fwmR, m.spd, e.dmg, { color: m.col }); } },
  burst(game, e, dt, m){
    e.fwmA = (e.fwmA === undefined) ? m.cd : e.fwmA - dt;
    if (e.fwmA <= 0 && !e.fwmLeft) { e.fwmLeft = m.n; e.fwmA = m.cd; e.fwmB = 0; }
    if (e.fwmLeft > 0) { e.fwmB -= dt; if (e.fwmB <= 0) { e.fwmB = 0.1; e.fwmLeft--; fireProjectileAngle(game, e, hlwAim(e, game.player), m.spd, e.dmg, { color: m.col }); } }
  },
  dash(game, e, dt, m){
    e.fwmA = (e.fwmA === undefined) ? m.cd : e.fwmA - dt;
    if (e.fwmD > 0) { e.fwmD -= dt; hlwStep(game, e, dt, e.fwmX, e.fwmY, m.mul); return; }
    if (e.fwmA <= 0) { const v = seekVector(e, game.player.x, game.player.y); e.fwmA = m.cd; e.fwmD = 0.25; e.fwmX = v.x; e.fwmY = v.y; }
  },
  backstep(game, e, dt, m){ const v = seekVector(e, game.player.x, game.player.y); if (v.d < m.r) hlwStep(game, e, dt, -v.x, -v.y, m.mul); },
  shieldPulse(game, e, dt, m){ e.fwmA = (e.fwmA === undefined) ? m.cd : e.fwmA - dt; if (e.fwmA <= 0) { e.fwmS = m.dur; e.fwmA = m.cd; } if (e.fwmS > 0) { e.fwmS -= dt; e.shielded = true; } else if (e.fwmS !== undefined && e.fwmS <= 0 && e.type.behavior && !e.submerged) { e.shielded = false; e.fwmS = undefined; } },
  slowField(game, e, dt, m){ const p = game.player; if (Util.dist(e.x, e.y, p.x, p.y) < m.r) p.freezeTimer = Math.max(p.freezeTimer || 0, 0.04); },
  fan(game, e, dt, m){ e.fwmA = (e.fwmA === undefined) ? m.cd : e.fwmA - dt; if (e.fwmA <= 0) { e.fwmA = m.cd; hlwArc(game, e, hlwAim(e, game.player), m.n, m.spread, m.spd, { color: m.col }); } },
  blades(game, e, dt, m){
    e.fwmR = (e.fwmR || 0) + dt * m.rot; const p = game.player;
    for (let i = 0; i < m.n; i++) { const a = e.fwmR + i * Math.PI * 2 / m.n; e.fwmT = (e.fwmT || 0) - dt / m.n; if (Util.dist(e.x + Math.cos(a) * m.r, e.y + Math.sin(a) * m.r, p.x, p.y) < p.radius + 6) { if (e.fwmT <= 0) { e.fwmT = 0.6; damagePlayer(game, playerDamageAmount(game, false, 1), e.type.id); } } }
  },
  leech(game, e, dt, m){ const v = seekVector(e, game.player.x, game.player.y); e.fwmA = (e.fwmA || 0) - dt; if (v.d < e.radius + game.player.radius + 6 && e.fwmA <= 0) { e.fwmA = m.cd; if (e.hp < e.maxHp) e.hp += 1; } },
  flicker(game, e, dt, m){ e.fwmA = (e.fwmA === undefined) ? m.cd : e.fwmA - dt; if (e.fwmA <= 0) { e.fwmA = m.cd; e.hitFlash = 0.1; hlwStep(game, e, dt * 8, Util.rand(-1, 1), Util.rand(-1, 1), m.mul); } },
  cross(game, e, dt, m){ e.fwmA = (e.fwmA === undefined) ? m.cd : e.fwmA - dt; if (e.fwmA <= 0) { e.fwmA = m.cd; e.fwmR = (e.fwmR || 0) + 0.4; for (let i = 0; i < 4; i++) fireProjectileAngle(game, e, e.fwmR + i * Math.PI / 2, m.spd, e.dmg, { color: m.col }); } },
  snipe(game, e, dt, m){
    e.fwmA = (e.fwmA === undefined) ? m.cd : e.fwmA - dt;
    if (e.fwmA <= 0 && !e.fwmW) { e.fwmW = 0.6; e.fwmA = m.cd; }
    if (e.fwmW > 0) { e.fwmW -= dt; e.hitFlash = 0.05; if (e.fwmW <= 0) fireProjectileAngle(game, e, hlwAim(e, game.player), m.spd, e.dmg + 1, { pierce: 3, color: m.col }); }
  },
  grow(game, e, dt, m){ if (e.fwmBR === undefined) e.fwmBR = e.radius; e.radius = Math.min(e.fwmBR * m.cap, e.radius + dt * m.rate); },
  tinySummon(game, e, dt, m){ e.fwmN = e.fwmN || 0; e.fwmA = (e.fwmA === undefined) ? m.cd : e.fwmA - dt; if (e.fwmA <= 0 && e.fwmN < m.max) { e.fwmA = m.cd; e.fwmN++; hlwSpawn(game, game.currentRoom, 'dithercloud', e.x + 30, e.y); } },
  knock(game, e, dt, m){ const p = game.player; e.fwmA = (e.fwmA === undefined) ? m.cd : e.fwmA - dt; if (e.fwmA <= 0) { e.fwmA = m.cd; const v = seekVector(e, p.x, p.y); if (v.d < m.r) { p.x += v.x * m.push; p.y += v.y * m.push; e.hitFlash = 0.15; } } },
  accel(game, e, dt, m){ if (e.fwmBase === undefined) e.fwmBase = e.speed; e.fwmT = Math.min((e.fwmT || 0) + dt, m.t); e.speed = e.fwmBase * (1 + (m.mul - 1) * e.fwmT / m.t); }
};

for (const id in CMOD_ASSIGN) {
  const base = ENEMY_BEHAVIOR_HANDLERS[id];
  if (!base) continue;
  const list = CMOD_ASSIGN[id];
  ENEMY_BEHAVIOR_HANDLERS[id] = function(game, e, dt){
    base(game, e, dt);
    const slots = e._fs || (e._fs = []);
    for (let i = 0; i < list.length; i += 2) {
      const st = slots[i] || (slots[i] = {});
      for (const k in st) e[k] = st[k];
      CMODS[list[i]](game, e, dt, list[i + 1]);
      for (const k of Object.keys(e)) if (k.startsWith('fwm')) { st[k] = e[k]; delete e[k]; }
    }
  };
}
