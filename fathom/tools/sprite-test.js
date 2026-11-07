'use strict';
// Sprites. There is no canvas in Node, so what is tested here is everything about a
// sprite that is not pixels: that every enemy names a body plan that exists, that every
// plan draws something rather than nothing, that nothing is drawn outside a sane
// envelope around the creature, and that the animation phase actually changes the frame.
//
// That last one is the check worth having. A plan that ignores its `anim` argument looks
// completely correct in a screenshot and is a still photograph in motion, which is the
// bug this whole file exists to catch.

const sprite = require('../js/sprite.js');
const enemy = require('../js/enemy.js');

let checks = 0;
let failures = 0;
function ok(cond, label) {
  checks += 1;
  if (!cond) { failures += 1; console.log('FAIL: ' + label); }
}

// A canvas context that records instead of drawing. Every call that places geometry is
// logged with its coordinates, which is enough to answer both questions: did anything
// get drawn, and did it move when the phase changed.
function recorder() {
  const calls = [];
  const points = [];
  let fill = '';
  const note = (name, args) => calls.push(name + ':' + args.map(n =>
    typeof n === 'number' ? n.toFixed(2) : n).join(',') + ':' + fill);
  const mark = (x, y) => { points.push([x, y]); };
  return {
    calls,
    points,
    get fillStyle() { return fill; },
    set fillStyle(v) { fill = v; },
    globalAlpha: 1,
    save() { calls.push('save'); },
    restore() { calls.push('restore'); },
    translate(x, y) { note('translate', [x, y]); },
    scale(x, y) { note('scale', [x, y]); },
    clip() { calls.push('clip'); },
    beginPath() { calls.push('beginPath'); },
    closePath() { calls.push('closePath'); },
    moveTo(x, y) { note('moveTo', [x, y]); mark(x, y); },
    lineTo(x, y) { note('lineTo', [x, y]); mark(x, y); },
    arc(x, y, r) { note('arc', [x, y, r]); mark(x - r, y - r); mark(x + r, y + r); },
    ellipse(x, y, rx, ry) { note('ellipse', [x, y, rx, ry]); mark(x - rx, y - ry); mark(x + rx, y + ry); },
    fill() { calls.push('fill'); },
    fillRect(x, y, w, h) { note('fillRect', [x, y, w, h]); mark(x, y); mark(x + w, y + h); }
  };
}

const BOX = { x: 100, y: 200, w: 48, h: 48 };

function frame(body, anim, extra) {
  const ctx = recorder();
  sprite.drawCreature(ctx, BOX, body, Object.assign({
    colour: '#58b05a', anim, phase: 0.3, facing: 1, vx: 2, vy: 0,
    onGround: true, time: anim
  }, extra || {}));
  return ctx;
}

// --- 1. every enemy names a plan that exists ---------------------------------------------
for (const spec of enemy.ENEMIES) {
  ok(typeof spec.body === 'string' && spec.body.length > 0,
    spec.key + ' has no body plan');
  ok(!!sprite.BODIES[spec.body],
    spec.key + ' names the body plan ' + spec.body + ', which does not exist');
}
const used = new Set(enemy.ENEMIES.map(s => s.body));
for (const body of Object.keys(sprite.BODIES)) {
  ok(used.has(body), 'the body plan ' + body + ' is drawn by nothing');
}

// --- 2. every plan draws something, and keeps it near the creature -------------------------
// The envelope is generous: a worm trails well behind its own box and a bat's wings reach
// past it. What it catches is a plan whose coordinates are wrong by an order of magnitude.
for (const body of Object.keys(sprite.BODIES)) {
  const ctx = frame(body, 1.0);
  const filled = ctx.calls.filter(c => c === 'fill' || c.startsWith('fillRect')).length;
  ok(filled >= 3, 'the ' + body + ' plan drew only ' + filled + ' shapes');
  const colours = new Set(ctx.calls.filter(c => c.includes(':')).map(c => c.split(':').pop())
    .filter(Boolean));
  ok(colours.size >= 3, 'the ' + body + ' plan used only ' + colours.size
    + ' colours, so it has no internal detail');
  let minX = 1e9;
  let maxX = -1e9;
  let minY = 1e9;
  let maxY = -1e9;
  for (const [x, y] of ctx.points) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  ok(minX > BOX.x - BOX.w * 4 && maxX < BOX.x + BOX.w * 5,
    'the ' + body + ' plan drew from x ' + minX.toFixed(0) + ' to ' + maxX.toFixed(0)
    + ', far outside its own box');
  ok(minY > BOX.y - BOX.h * 2 && maxY < BOX.y + BOX.h * 2.5,
    'the ' + body + ' plan drew from y ' + minY.toFixed(0) + ' to ' + maxY.toFixed(0)
    + ', far outside its own box');
}

// --- 3. every plan is actually animated ------------------------------------------------------
// Four phases a half-cycle apart: a plan that ignores `anim` produces four identical
// frames, which is the whole failure this catches.
for (const body of Object.keys(sprite.BODIES)) {
  const frames = [0, 1.6, 3.2, 4.8].map(a => frame(body, a).calls.join('|'));
  const distinct = new Set(frames).size;
  ok(distinct >= 3, 'the ' + body + ' plan drew ' + distinct
    + ' distinct frames out of 4: it is not animated');
}

// --- 4. mirroring is done once, by the caller, and changes nothing else ------------------------
{
  const right = frame('humanoid', 1.0, { facing: 1 }).calls;
  const left = frame('humanoid', 1.0, { facing: -1 }).calls;
  ok(left.some(c => c.startsWith('scale:-1')), 'facing left did not mirror the sprite');
  ok(left.filter(c => c === 'fill').length === right.filter(c => c === 'fill').length,
    'mirroring changed how many shapes the plan drew');
}

// --- 5. people -----------------------------------------------------------------------------------
{
  const look = { skin: '#e8c39a', shirt: '#4a6fa5', pants: '#2f3b52', hair: '#23304a' };
  const poses = {
    idle: { anim: 0, time: 1 },
    walk: { anim: 1.1, walking: true, time: 1 },
    air: { anim: 0, airborne: true, time: 1 },
    swim: { anim: 2, swimming: true, time: 1 },
    swing: { anim: 0, swingArm: 0.5, time: 1,
      held: { shape: 'pick', head: '#b9c0ca', handle: '#6d4f30' } }
  };
  const drawn = {};
  for (const [name, pose] of Object.entries(poses)) {
    const ctx = recorder();
    sprite.drawPerson(ctx, { x: 0, y: 0, w: 30, h: 60 }, look, pose);
    drawn[name] = ctx.calls.join('|');
    ok(ctx.calls.filter(c => c === 'fill').length > 8,
      'the ' + name + ' pose drew almost nothing');
    const colours = new Set(ctx.calls.map(c => c.split(':').pop()).filter(Boolean));
    for (const c of [look.skin, look.shirt, look.pants, look.hair]) {
      ok([...colours].some(v => v === c || v.startsWith('rgb')),
        'the ' + name + ' pose never used ' + c);
    }
  }
  const names = Object.keys(poses);
  for (let i = 0; i < names.length; i += 1) {
    for (let j = i + 1; j < names.length; j += 1) {
      ok(drawn[names[i]] !== drawn[names[j]],
        'the ' + names[i] + ' and ' + names[j] + ' poses are the same picture');
    }
  }
  // A walk cycle has to be a cycle: two points half a stride apart differ, and a full
  // stride later it comes back to where it started.
  const at = (a) => {
    const ctx = recorder();
    sprite.drawPerson(ctx, { x: 0, y: 0, w: 30, h: 60 }, look, { anim: a, walking: true, time: 0 });
    return ctx.calls.join('|');
  };
  // A quarter turn apart, not a half: phases 0 and PI are both the mid-stride passing
  // pose, where the legs really are in the same place, so comparing those two would
  // call a correct walk cycle broken.
  ok(at(0) !== at(Math.PI / 2), 'the walk cycle does not move');
  ok(at(Math.PI / 2) !== at(Math.PI * 1.5), 'the walk cycle does not swap legs');
  ok(at(0.7) === at(0.7 + Math.PI * 2), 'the walk cycle does not repeat');
}

// Every registered species reaches the keyed art pass and every armor slot changes the sprite.
for (const spec of enemy.ENEMIES) {
  const base = frame(spec.body, 0, { colour: spec.colour }).calls.join('|');
  const painted = frame(spec.body, 0, { colour: spec.colour, key: spec.key }).calls.join('|');
  ok(base !== painted, spec.key + ' has no species art');
}
{
  const draw = (look, gear) => {
    const ctx = recorder();
    sprite.drawPerson(ctx, BOX, look, { gear });
    return ctx.calls.join('|');
  };
  const base = draw({}, {});
  for (const slot of ['head', 'chest', 'legs', 'feet']) {
    ok(draw({}, { [slot]: { tier: 'gold', colour: '#e0c054' } }) !== base, slot + ' armor is invisible');
  }
  ok(draw({}, { accessories: [{ colour: '#849eda' }] }) !== base, 'accessory is invisible');
  const styles = ['swept', 'braid', 'crest', 'curls', 'shaved'];
  ok(new Set(styles.map(hairstyle => draw({ hairstyle }, {}))).size === styles.length,
    'hairstyles do not all change the player');
  ok(draw({ marking: 'paint', eyes: '#8d588a' }, {}) !== base, 'face settings are invisible');
}

// --- 6. the gait table covers every archetype ------------------------------------------------------
for (const kind of Object.keys(enemy.ARCHETYPES)) {
  ok(!!enemy.GAIT[kind], 'the archetype ' + kind + ' has no gait');
  const g = enemy.GAIT[kind];
  ok(g.perTile >= 0 && g.perSecond >= 0, 'the ' + kind + ' gait runs backwards');
  ok(g.perTile > 0 || g.perSecond > 0, 'the ' + kind + ' gait never advances at all');
}

console.log('\n' + Object.keys(sprite.BODIES).length + ' body plans across '
  + enemy.ENEMIES.length + ' enemies: '
  + Object.keys(sprite.BODIES).join(', '));
console.log(checks + ' checks, ' + failures + ' failures');
process.exit(failures ? 1 : 0);
