'use strict';
// Sprites. Every living thing in the game used to be a rectangle with two eyes on it, and
// at that point the only thing telling a shark from a skeleton was its colour.
//
// Three decisions shape this file:
//
//   - Creatures are drawn, not blitted. There are no image assets anywhere in Fathom, and
//     a sprite sheet for forty enemies in a dozen poses is not something you write by
//     hand. Drawing each body from primitives means a pose is a number, so animation
//     costs nothing extra: the same code draws every frame of a walk cycle.
//   - Shape is carried by a body plan, not by the enemy. Forty enemies share twenty
//     plans, chosen by a `body` tag on the species, so a new enemy is one line in
//     enemy.js and gets limbs, eyes and a gait for free.
//   - Everything is drawn in a normalised box. A plan places its parts in units of the
//     creature's own width and height, so the same spider plan draws a one-tile cave
//     crawler and a two-tile magma crawler without a special case. Small round details -
//     eyes, teeth, rivets - are sized against the smaller dimension instead, so a long
//     flat shark does not get oval eyes.
//
// The animation phase (`anim`) is supplied by the caller and is in radians. For walkers
// it advances with distance travelled, so legs that are not getting anywhere stop moving.

const TAU = Math.PI * 2;

// Local rather than borrowed from texture.js: in the browser every module shares one
// lexical scope, and two files that both define `shade` is exactly the collision this
// project has been bitten by before.
function spriteShade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const up = amount > 0;
  const t = Math.abs(amount);
  const ch = (v) => {
    const out = up ? v + (255 - v) * t : v * (1 - t);
    return Math.max(0, Math.min(255, Math.round(out)));
  };
  return 'rgb(' + ch((n >> 16) & 255) + ',' + ch((n >> 8) & 255) + ',' + ch(n & 255) + ')';
}

function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

// --- the normalised drawing surface ---------------------------------------------------
// A geometry object holds the pixel box plus `px`, the detail unit. Plans address the box
// in fractions: x from -0.5 (back edge) to 0.5 (front edge), y from -1 (top) to 0 (feet).

function geometry(box) {
  return {
    w: box.w,
    h: box.h,
    cx: box.x + box.w / 2,
    by: box.y + box.h,
    px: Math.min(box.w, box.h)
  };
}

function ell(ctx, g, nx, ny, rx, ry, colour, rot) {
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.ellipse(g.cx + nx * g.w, g.by + ny * g.h, Math.abs(rx) * g.w, Math.abs(ry) * g.h,
    rot || 0, 0, TAU);
  ctx.fill();
}

// A round detail, sized against the smaller dimension so it stays round whatever the
// creature's proportions are.
function dot(ctx, g, nx, ny, r, colour) {
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.arc(g.cx + nx * g.w, g.by + ny * g.h, r * g.px, 0, TAU);
  ctx.fill();
}

function rect(ctx, g, nx, ny, nw, nh, colour) {
  ctx.fillStyle = colour;
  ctx.fillRect(g.cx + nx * g.w, g.by + ny * g.h, nw * g.w, nh * g.h);
}

// A limb: a tapering bar from one point to another. Drawn as a polygon rather than a
// stroke because a stroke's width does not survive the anisotropic box.
function limb(ctx, g, x0, y0, x1, y1, thick, colour) {
  const ax = g.cx + x0 * g.w;
  const ay = g.by + y0 * g.h;
  const bx = g.cx + x1 * g.w;
  const by2 = g.by + y1 * g.h;
  const dx = bx - ax;
  const dy = by2 - ay;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * thick * g.px * 0.5;
  const ny = (dx / len) * thick * g.px * 0.5;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(ax + nx, ay + ny);
  ctx.lineTo(bx + nx * 0.62, by2 + ny * 0.62);
  ctx.lineTo(bx - nx * 0.62, by2 - ny * 0.62);
  ctx.lineTo(ax - nx, ay - ny);
  ctx.closePath();
  ctx.fill();
  // A knuckle at the far end so a limb does not read as a cut stick.
  ctx.beginPath();
  ctx.arc(bx, by2, thick * g.px * 0.31, 0, TAU);
  ctx.fill();
}

function poly(ctx, g, points, colour) {
  ctx.fillStyle = colour;
  ctx.beginPath();
  for (let i = 0; i < points.length; i += 2) {
    const x = g.cx + points[i] * g.w;
    const y = g.by + points[i + 1] * g.h;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

// A pair of eyes looking forward, which is the single detail that turns a shape into
// something that wants to eat you.
function eyes(ctx, g, nx, ny, r, white, pupil) {
  dot(ctx, g, nx, ny, r, white || '#f6f1e2');
  dot(ctx, g, nx + r * 0.3 * (g.px / g.w), ny, r * 0.52, pupil || '#1a1620');
}

// --- body plans -------------------------------------------------------------------------
// Each takes (ctx, g, c) where c carries colour, anim, and whatever state the plan needs.
// They all draw facing right; the caller mirrors for the other direction.

const BODIES = {};

// A blob that squashes when it lands and stretches when it leaves the ground. The squash
// is driven by vertical speed rather than by a timer, so the deformation always agrees
// with what the slime is actually doing.
BODIES.slime = function (ctx, g, c) {
  // Two sources of deformation: the hop, read off vertical speed, and a slow idle
  // quiver that runs even when the slime is doing nothing at all. Without the quiver a
  // resting slime is a painted dome.
  const stretch = clamp(c.vy * 0.022 + Math.sin(c.anim) * 0.05, -0.24, 0.28);
  const rx = 0.5 - stretch * 0.5;
  const ry = 0.5 + stretch * 0.5;
  if (c.key === 'iceslime') {
    poly(ctx, g, [-0.27, -ry * 1.63, -0.22, -ry * 2.32, -0.03, -ry * 1.85,
      0.08, -ry * 2.17, 0.19, -ry * 1.6], '#b9f1f1');
  } else if (c.key === 'jungleslime') {
    poly(ctx, g, [-0.24, -ry * 1.67, -0.36, -ry * 2.2, -0.05, -ry * 1.96,
      0.15, -ry * 2.24, 0.07, -ry * 1.64], '#79b753');
  } else if (c.key === 'motherslime') {
    ell(ctx, g, -0.37, -ry * 0.45, rx * 0.42, ry * 0.42, spriteShade(c.colour, -0.3));
  }
  ctx.save();
  ctx.globalAlpha *= 0.88;
  ell(ctx, g, 0, -ry, rx, ry, c.colour);
  ctx.globalAlpha /= 0.88;
  // A lighter dome on top and a dark pool at the bottom: the two things that make a
  // gel blob read as liquid rather than as a painted ball.
  ell(ctx, g, -0.1, -ry * 1.35, rx * 0.5, ry * 0.34, spriteShade(c.colour, 0.3));
  ell(ctx, g, 0, -ry * 0.28, rx * 0.82, ry * 0.26, spriteShade(c.colour, -0.28));
  // The thing suspended inside it. Terraria's joke, and it is a good one.
  rect(ctx, g, -0.09, -ry * 1.05, 0.18, ry * 0.42, spriteShade(c.colour, -0.45));
  eyes(ctx, g, 0.14, -ry * 1.15, 0.09);
  eyes(ctx, g, -0.1, -ry * 1.15, 0.08);
  ctx.restore();
};

// The king: the same gel, four times the size, with a crown on it and something
// unfortunate suspended inside. Terraria's joke, and a good one - a boss that is
// visibly the same thing you have been stepping on all game is funnier and more
// alarming than a new monster would be.
BODIES.kingslime = function (ctx, g, c) {
  const stretch = clamp(c.vy * 0.016 + Math.sin(c.anim) * 0.04, -0.26, 0.3);
  const rx = 0.5 - stretch * 0.5;
  const ry = 0.5 + stretch * 0.5;
  ctx.save();
  ctx.globalAlpha *= 0.86;
  ell(ctx, g, 0, -ry, rx, ry, c.colour);
  ctx.globalAlpha /= 0.86;
  ell(ctx, g, -0.1, -ry * 1.4, rx * 0.46, ry * 0.3, spriteShade(c.colour, 0.3));
  ell(ctx, g, 0, -ry * 0.24, rx * 0.84, ry * 0.24, spriteShade(c.colour, -0.3));
  // The ninja inside, drawn small and dark so it reads as a silhouette in the gel.
  const dark = spriteShade(c.colour, -0.55);
  rect(ctx, g, -0.07, -ry * 1.12, 0.14, ry * 0.4, dark);
  ell(ctx, g, 0, -ry * 1.2, 0.08, ry * 0.1, dark);
  limb(ctx, g, -0.06, -ry * 1.0, -0.14, -ry * 0.72, 0.1, dark);
  limb(ctx, g, 0.06, -ry * 1.0, 0.15, -ry * 0.74, 0.1, dark);
  // Eyes, large and low, which is what makes it look like it is deciding about you.
  eyes(ctx, g, 0.17, -ry * 1.05, 0.13);
  eyes(ctx, g, -0.12, -ry * 1.05, 0.12);
  // The crown, riding on top and tipping with the squash.
  const top = -ry * 1.86;
  poly(ctx, g, [-0.2, top, -0.14, top - 0.1, -0.08, top - 0.03, 0, top - 0.13,
    0.08, top - 0.03, 0.14, top - 0.1, 0.2, top, 0.2, top + 0.06, -0.2, top + 0.06],
    '#e0c054');
  rect(ctx, g, -0.2, top + 0.04, 0.4, 0.035, '#a8882c');
  dot(ctx, g, 0, top - 0.02, 0.07, '#d8344c');
  ctx.restore();
  if (c.key === 'reedking') {
    poly(ctx, g, [-0.38, -0.65, -0.48, -1.03, -0.30, -0.88, -0.18, -1.06,
      -0.12, -0.69], '#b5ae68');
  }

  if (c.key === 'sporecrown') {
    const ink = c.windUp > 0 ? '#fff0cc' : '#bdb0da';
    poly(ctx, g, [-0.35, -0.59, -0.22, -0.90, -0.11, -0.70, 0.03, -0.91,
      0.13, -0.69, -0.02, -0.56], ink);
  }

};

// The Hollow Eye. The same plan as a demon eye and four times the size, because a boss
// that is visibly a bigger version of something you have been swatting all game lands
// better than a new shape would. Enraged, the sclera splits and the iris goes black.
BODIES.bigeye = function (ctx, g, c) {
  const beat = Math.sin(c.anim) * 0.7;
  const dark = spriteShade(c.colour, -0.45);
  membraneWing(ctx, g, -0.16, -0.58, 0.58, beat, dark, spriteShade(c.colour, -0.6));
  membraneWing(ctx, g, 0.16, -0.58, 0.5, -beat, spriteShade(c.colour, -0.2), dark);
  // The ball.
  ell(ctx, g, 0, -0.5, 0.44, 0.44, c.enraged ? '#d8cfc4' : '#efe6d8');
  // Veins, more of them and angrier in the second half.
  ctx.save();
  ctx.globalAlpha *= c.enraged ? 0.85 : 0.45;
  const veins = c.enraged ? 9 : 5;
  for (let i = 0; i < veins; i += 1) {
    const a = c.phase + i * (TAU / veins);
    limb(ctx, g, -0.38 * Math.cos(a), -0.5 + 0.38 * Math.sin(a),
      -0.12 * Math.cos(a), -0.5 + 0.12 * Math.sin(a), 0.05, '#a8303a');
  }
  ctx.restore();
  // The iris, which looks at you. Winding up it opens wide; charging it is a slit.
  const open = c.windUp > 0 ? 1.18 : (c.charge > 0 ? 0.74 : 1);
  dot(ctx, g, 0.12, -0.5, 0.34 * open, c.enraged ? '#5a1c22' : c.colour);
  dot(ctx, g, 0.16, -0.5, 0.2 * open, c.enraged ? '#120a0e' : '#1a1016');
  dot(ctx, g, 0.06, -0.6, 0.08, 'rgba(255,255,255,0.65)');
  if (c.enraged) {
    // A torn lower lid, so the second phase is legible at a glance.
    poly(ctx, g, [-0.3, -0.2, -0.1, -0.06, 0.1, -0.2, 0.3, -0.05, 0.3, -0.3, -0.3, -0.3],
      spriteShade(c.colour, -0.3));
  }
  if (c.key === 'abyssaleye') {
    const ink = c.windUp > 0 ? '#fff0cc' : '#94c8ec';
    poly(ctx, g, [-0.35, -0.59, -0.22, -0.90, -0.11, -0.70, 0.03, -0.91,
      0.13, -0.69, -0.02, -0.56], ink);
  }

};

// The walk cycle every two-legged plan shares: one swing value per limb, in box units.
function gaitOf(c, reach) {
  const swing = Math.sin(c.anim);
  const lift = Math.max(0, Math.sin(c.anim * 2)) * 0.06;
  return {
    frontLeg: swing * reach,
    backLeg: -swing * reach,
    lift,
    frontArm: -swing * reach * 0.8,
    backArm: swing * reach * 0.8
  };
}

BODIES.humanoid = function (ctx, g, c) {
  const dark = spriteShade(c.colour, -0.3);
  const light = spriteShade(c.colour, 0.2);
  const k = gaitOf(c, 0.16);
  // Back limbs first, in a darker shade, so the figure has a near side and a far side.
  limb(ctx, g, -0.06, -0.46, -0.06 + k.backLeg, -0.02, 0.2, dark);
  limb(ctx, g, -0.1, -0.78, -0.1 + k.backArm, -0.44, 0.17, dark);
  // Torso: narrower at the waist, with a tattered hem.
  poly(ctx, g, [-0.21, -0.86, 0.21, -0.86, 0.16, -0.42, -0.16, -0.42], c.colour);
  rect(ctx, g, -0.17, -0.46, 0.34, 0.05, dark);
  // Head, with a jaw that hangs: the whole silhouette of a shambling thing.
  ell(ctx, g, 0.02, -0.92, 0.17, 0.09, c.colour);
  ell(ctx, g, 0.05, -0.87, 0.1, 0.04, dark);
  eyes(ctx, g, 0.08, -0.94, 0.075, '#d9dec6', '#1b1a12');
  // Front limbs: arms held out ahead, which is the pose that says zombie at any size.
  limb(ctx, g, 0.04, -0.46, 0.04 + k.frontLeg, -0.02 - k.lift, 0.21, c.colour);
  limb(ctx, g, 0.08, -0.78, 0.3 + k.frontArm * 0.4, -0.58 + k.frontArm * 0.3, 0.18, light);
};

BODIES.skeleton = function (ctx, g, c) {
  const bone = c.colour;
  const dark = spriteShade(bone, -0.35);
  const k = gaitOf(c, 0.18);
  limb(ctx, g, -0.05, -0.46, -0.05 + k.backLeg, -0.02, 0.12, dark);
  limb(ctx, g, -0.08, -0.78, -0.08 + k.backArm, -0.44, 0.1, dark);
  // Spine and ribs rather than a torso: a skeleton is mostly the gaps.
  rect(ctx, g, -0.03, -0.84, 0.06, 0.4, bone);
  for (let i = 0; i < 4; i += 1) {
    const y = -0.8 + i * 0.09;
    const span = 0.19 - i * 0.02;
    rect(ctx, g, -span, y, span * 2, 0.035, bone);
  }
  rect(ctx, g, -0.16, -0.45, 0.32, 0.06, bone);        // pelvis
  // Skull: a dome, a jaw, and two sockets that read as empty because they are.
  ell(ctx, g, 0.02, -0.93, 0.15, 0.085, bone);
  rect(ctx, g, -0.08, -0.9, 0.2, 0.04, spriteShade(bone, -0.15));
  dot(ctx, g, 0.08, -0.95, 0.075, '#141118');
  dot(ctx, g, -0.04, -0.95, 0.07, '#141118');
  dot(ctx, g, 0.085, -0.95, 0.03, c.glow || '#d85a3a');
  dot(ctx, g, -0.035, -0.95, 0.028, c.glow || '#d85a3a');
  limb(ctx, g, 0.03, -0.46, 0.03 + k.frontLeg, -0.02 - k.lift, 0.13, bone);
  limb(ctx, g, 0.06, -0.78, 0.26 + k.frontArm * 0.5, -0.56, 0.11, bone);
};

BODIES.imp = function (ctx, g, c) {
  const dark = spriteShade(c.colour, -0.32);
  const hot = spriteShade(c.colour, 0.45);
  const k = gaitOf(c, 0.15);
  // A tail that lashes on its own clock, so a standing imp is never quite still.
  const lash = Math.sin(c.anim * 0.7 + c.phase) * 0.12;
  limb(ctx, g, -0.14, -0.4, -0.42, -0.3 + lash, 0.12, dark);
  dot(ctx, g, -0.45, -0.3 + lash, 0.1, hot);
  limb(ctx, g, -0.05, -0.42, -0.05 + k.backLeg, -0.02, 0.17, dark);
  poly(ctx, g, [-0.2, -0.8, 0.2, -0.8, 0.15, -0.38, -0.15, -0.38], c.colour);
  ell(ctx, g, 0.02, -0.88, 0.18, 0.1, c.colour);
  // Horns.
  poly(ctx, g, [0.1, -0.95, 0.2, -1.05, 0.14, -0.93], dark);
  poly(ctx, g, [-0.08, -0.95, -0.16, -1.04, -0.11, -0.93], dark);
  dot(ctx, g, 0.1, -0.89, 0.075, hot);
  dot(ctx, g, -0.03, -0.89, 0.07, hot);
  limb(ctx, g, 0.04, -0.42, 0.04 + k.frontLeg, -0.02 - k.lift, 0.18, c.colour);
  limb(ctx, g, 0.08, -0.74, 0.26 + k.frontArm * 0.5, -0.5, 0.15, c.colour);
};

BODIES.golem = function (ctx, g, c) {
  const dark = spriteShade(c.colour, -0.3);
  const light = spriteShade(c.colour, 0.22);
  const k = gaitOf(c, 0.1);
  limb(ctx, g, -0.1, -0.4, -0.1 + k.backLeg, -0.02, 0.3, dark);
  limb(ctx, g, -0.2, -0.74, -0.3, -0.36 + k.backArm, 0.26, dark);
  // A slab of a body, with the seams of something assembled from rubble.
  rect(ctx, g, -0.3, -0.82, 0.6, 0.44, c.colour);
  rect(ctx, g, -0.3, -0.82, 0.6, 0.07, light);
  rect(ctx, g, -0.18, -0.68, 0.1, 0.18, dark);
  rect(ctx, g, 0.05, -0.74, 0.14, 0.1, dark);
  // The head sits down between the shoulders: no neck on a pile of rock.
  rect(ctx, g, -0.16, -0.96, 0.32, 0.17, c.colour);
  rect(ctx, g, -0.16, -0.96, 0.32, 0.05, light);
  dot(ctx, g, 0.07, -0.89, 0.07, c.glow || '#e8a84a');
  dot(ctx, g, -0.06, -0.89, 0.065, c.glow || '#e8a84a');
  limb(ctx, g, 0.08, -0.4, 0.08 + k.frontLeg, -0.02, 0.32, c.colour);
  limb(ctx, g, 0.2, -0.74, 0.34, -0.3 + k.frontArm, 0.28, light);
  if (c.key === 'rimehorn') {
    poly(ctx, g, [-0.29, -0.74, -0.47, -0.99, -0.19, -0.91, -0.08, -0.76], '#dbf6fa');
    poly(ctx, g, [0.16, -0.75, 0.37, -1.03, 0.39, -0.8, 0.28, -0.72], '#9bd2e6');
  }

  if (c.key === 'cragbreaker') {
    poly(ctx, g, [-0.42, -0.6, -0.49, -0.92, -0.29, -0.83, -0.18, -0.62], '#c1a98a');
    poly(ctx, g, [0.18, -0.62, 0.28, -0.91, 0.46, -0.78, 0.4, -0.60], '#806b5e');
  }

  if (c.key === 'claybehemoth') {
    for (let i = 0; i < 3; i += 1) {
      rect(ctx, g, -0.27 + i * 0.17, -0.66 + (i % 2) * 0.09, 0.13, 0.045, '#edac76');
    }
  }

  if (c.key === 'winterroot') {
    const ice = c.windUp > 0 ? '#efffff' : '#91cdd7';
    poly(ctx, g, [-0.35, -0.64, -0.43, -0.97, -0.16, -0.79, -0.13, -0.63], ice);
    poly(ctx, g, [0.12, -0.62, 0.19, -0.88, 0.39, -0.98, 0.33, -0.62], ice);
  }

  if (c.key === 'windmillwarden') {
    const turn = c.anim * 0.7;
    for (let i = 0; i < 4; i += 1) {
      const a = turn + i * Math.PI / 2;
      limb(ctx, g, 0, -0.66, Math.cos(a) * 0.28, -0.66 + Math.sin(a) * 0.28, 0.11, '#e1c38d');
    }
    dot(ctx, g, 0, -0.66, 0.054, '#8c6a4e');
  }

  if (c.key === 'veinwarden') {
    const ink = c.windUp > 0 ? '#fff0cc' : '#de8d8e';
    poly(ctx, g, [-0.35, -0.59, -0.22, -0.90, -0.11, -0.70, 0.03, -0.91,
      0.13, -0.69, -0.02, -0.56], ink);
  }

};

// Wings shared by everything that flies on membrane rather than feather. `beat` is the
// flap angle; the wing is drawn as a swept triangle with two finger bones in it.
function membraneWing(ctx, g, ox, oy, span, beat, colour, bone) {
  const tipY = oy - span * 0.5 * Math.sin(beat);
  const tipX = ox - span * 0.9 * Math.cos(beat * 0.3);
  poly(ctx, g, [ox, oy, tipX, tipY, tipX * 0.72, oy + span * 0.34, ox, oy + span * 0.1],
    colour);
  poly(ctx, g, [ox, oy, tipX * 0.85, (tipY + oy) * 0.5, ox, oy + span * 0.05], bone);
}

BODIES.bat = function (ctx, g, c) {
  const dark = spriteShade(c.colour, -0.34);
  const beat = Math.sin(c.anim) * 0.9;
  membraneWing(ctx, g, -0.04, -0.52, 0.52, beat, dark, spriteShade(c.colour, -0.5));
  ell(ctx, g, 0.06, -0.5, 0.22, 0.3, c.colour);
  // Ears, which is the whole difference between a bat and a flying mouse.
  poly(ctx, g, [0.08, -0.74, 0.12, -0.98, 0.18, -0.72], c.colour);
  poly(ctx, g, [-0.02, -0.74, -0.04, -0.96, 0.06, -0.72], c.colour);
  eyes(ctx, g, 0.16, -0.56, 0.08, '#ffd9a0', '#2a140f');
  dot(ctx, g, 0.08, -0.56, 0.07, '#ffd9a0');
  // Fangs.
  poly(ctx, g, [0.14, -0.4, 0.17, -0.3, 0.2, -0.4], '#f4efe0');
  membraneWing(ctx, g, 0.14, -0.5, 0.46, -beat, spriteShade(c.colour, 0.12),
    spriteShade(c.colour, -0.3));
};

BODIES.eye = function (ctx, g, c) {
  const beat = Math.sin(c.anim) * 0.8;
  const dark = spriteShade(c.colour, -0.4);
  membraneWing(ctx, g, -0.1, -0.56, 0.46, beat, dark, spriteShade(c.colour, -0.55));
  membraneWing(ctx, g, 0.1, -0.56, 0.4, -beat, spriteShade(c.colour, -0.18), dark);
  // The eye itself: sclera, veins, a wide iris and a pupil that is always on you.
  ell(ctx, g, 0, -0.5, 0.36, 0.36, '#efe6d8');
  ctx.save();
  ctx.globalAlpha *= 0.5;
  for (let i = 0; i < 4; i += 1) {
    const a = c.phase + i * 1.6;
    limb(ctx, g, -0.3 * Math.cos(a), -0.5 + 0.3 * Math.sin(a),
      -0.12 * Math.cos(a), -0.5 + 0.12 * Math.sin(a), 0.055, '#b8484a');
  }
  ctx.restore();
  dot(ctx, g, 0.1, -0.5, 0.3, c.colour);
  dot(ctx, g, 0.14, -0.5, 0.16, '#140d14');
  dot(ctx, g, 0.06, -0.58, 0.07, 'rgba(255,255,255,0.7)');
};

BODIES.bird = function (ctx, g, c) {
  const dark = spriteShade(c.colour, -0.3);
  const light = spriteShade(c.colour, 0.18);
  const beat = Math.sin(c.anim) * 0.8;
  // Far wing, body, near wing: three layers is what gives a bird depth at this size.
  poly(ctx, g, [-0.05, -0.6, -0.5, -0.6 - beat * 0.3, -0.42, -0.4, -0.05, -0.46], dark);
  ell(ctx, g, 0, -0.45, 0.3, 0.3, c.colour);
  poly(ctx, g, [-0.24, -0.5, -0.52, -0.3, -0.24, -0.32], dark);   // tail fan
  ell(ctx, g, 0.24, -0.66, 0.14, 0.16, c.colour);                  // head
  poly(ctx, g, [0.33, -0.68, 0.5, -0.62, 0.33, -0.58], '#e0b452'); // beak
  eyes(ctx, g, 0.26, -0.7, 0.07, '#f3e8cf', '#20160f');
  // Legs tucked up under it.
  limb(ctx, g, 0.04, -0.2, 0.14, -0.08, 0.07, '#caa45e');
  poly(ctx, g, [0.0, -0.62, -0.46, -0.66 + beat * 0.34, -0.38, -0.42, 0.0, -0.48], light);
  if (c.key === 'thunderbird') {
    poly(ctx, g, [0.10, -0.72, 0.13, -0.99, 0.28, -0.84, 0.35, -0.96, 0.35, -0.72], '#443657');
    const wing = -0.66 + beat * 0.34;
    poly(ctx, g, [-0.47, wing, -0.26, wing + 0.06, -0.34, wing + 0.13,
      -0.06, wing + 0.18, -0.39, wing + 0.17, -0.31, wing + 0.10],
      c.windUp > 0 || c.charge > 0 ? '#fff6ba' : '#a98ac2');
  }

  if (c.key === 'bloodcrest') {
    const ink = c.windUp > 0 ? '#fff0cc' : '#e29c83';
    poly(ctx, g, [-0.35, -0.59, -0.22, -0.90, -0.11, -0.70, 0.03, -0.91,
      0.13, -0.69, -0.02, -0.56], ink);
  }

};

BODIES.wasp = function (ctx, g, c) {
  const dark = spriteShade(c.colour, -0.45);
  // Wings beat far faster than the gait: drawn translucent, which is what a blur looks
  // like when you cannot afford a blur.
  ctx.save();
  ctx.globalAlpha *= 0.42;
  const beat = Math.sin(c.anim * 3) * 0.3;
  poly(ctx, g, [0.0, -0.66, -0.3, -0.95 + beat, -0.05, -0.6], '#dff0ff');
  poly(ctx, g, [0.05, -0.66, 0.3, -0.98 - beat, 0.1, -0.6], '#dff0ff');
  ctx.restore();
  // Striped abdomen, trailing behind.
  ell(ctx, g, -0.24, -0.46, 0.22, 0.24, c.colour);
  for (let i = 0; i < 3; i += 1) {
    rect(ctx, g, -0.4 + i * 0.1, -0.64, 0.045, 0.36, dark);
  }
  poly(ctx, g, [-0.44, -0.5, -0.62, -0.44, -0.44, -0.38], dark);   // sting
  ell(ctx, g, 0.02, -0.52, 0.18, 0.2, dark);                        // thorax
  ell(ctx, g, 0.24, -0.56, 0.14, 0.15, c.colour);                   // head
  eyes(ctx, g, 0.28, -0.58, 0.07, '#2a1f10', '#f0c84a');
  for (let i = 0; i < 3; i += 1) {
    const sweep = Math.sin(c.anim * 2 + i) * 0.06;
    limb(ctx, g, -0.04 + i * 0.12, -0.42, -0.02 + i * 0.12 + sweep, -0.12, 0.05, dark);
  }
  if (c.key === 'orchidqueen') {
    poly(ctx, g, [-0.09, -0.66, -0.16, -0.96, 0.07, -0.84, 0.23, -0.99, 0.27, -0.68],
      c.windUp > 0 ? '#fff0ac' : '#d895b6');
  }

};

BODIES.beetle = function (ctx, g, c) {
  const dark = spriteShade(c.colour, -0.32);
  const light = spriteShade(c.colour, 0.2);
  for (let i = 0; i < 3; i += 1) {
    const step = Math.sin(c.anim + i * 2.1) * 0.08;
    limb(ctx, g, -0.2 + i * 0.18, -0.4, -0.26 + i * 0.18 + step, -0.02, 0.07, dark);
    limb(ctx, g, -0.2 + i * 0.18, -0.4, -0.14 + i * 0.18 - step, -0.02, 0.06,
      spriteShade(c.colour, -0.5));
  }
  ell(ctx, g, -0.08, -0.52, 0.38, 0.34, c.colour);     // carapace
  ell(ctx, g, -0.08, -0.62, 0.3, 0.18, light);
  rect(ctx, g, -0.09, -0.86, 0.02, 0.36, dark);        // wing-case seam
  ell(ctx, g, 0.3, -0.46, 0.16, 0.2, dark);            // head
  // Mandibles that open and close as it walks.
  const gape = 0.05 + Math.abs(Math.sin(c.anim * 0.5)) * 0.05;
  poly(ctx, g, [0.38, -0.5 - gape, 0.56, -0.56 - gape, 0.4, -0.44], dark);
  poly(ctx, g, [0.38, -0.42 + gape, 0.56, -0.34 + gape, 0.4, -0.48], dark);
  dot(ctx, g, 0.34, -0.54, 0.06, '#1b1410');
  if (c.key === 'sunscarab') {
    const gold = c.windUp > 0 ? '#fff3a8' : '#eac077';
    poly(ctx, g, [-0.30, -0.51, -0.14, -0.78, 0.04, -0.57, -0.10, -0.40], gold);
    poly(ctx, g, [0.26, -0.58, 0.48, -0.80, 0.44, -0.49, 0.31, -0.44], '#f4cf85');
  }

};

BODIES.spider = function (ctx, g, c) {
  const dark = spriteShade(c.colour, -0.36);
  // Eight legs in two alternating sets, each knee lifted on its own phase. The knee is
  // what makes it read as a spider and not as a hairy ball.
  for (let i = 0; i < 4; i += 1) {
    for (const side of [-1, 1]) {
      const phase = c.anim + i * 0.9 + (side > 0 ? Math.PI : 0);
      const step = Math.sin(phase) * 0.1;
      const lift = Math.max(0, Math.cos(phase)) * 0.12;
      const hipX = -0.12 + i * 0.1;
      const kneeX = hipX + side * 0.22;
      const footX = hipX + side * 0.34 + step;
      limb(ctx, g, hipX, -0.52, kneeX, -0.72 - lift, 0.06, dark);
      limb(ctx, g, kneeX, -0.72 - lift, footX, -0.02, 0.05, dark);
    }
  }
  ell(ctx, g, -0.18, -0.52, 0.3, 0.42, c.colour);                   // abdomen
  ell(ctx, g, -0.18, -0.6, 0.18, 0.22, spriteShade(c.colour, 0.22));
  ell(ctx, g, 0.2, -0.46, 0.22, 0.3, dark);                          // cephalothorax
  for (let i = 0; i < 3; i += 1) {
    dot(ctx, g, 0.26 + (i % 2) * 0.08, -0.56 + i * 0.06, 0.05, c.glow || '#e8544e');
  }
  poly(ctx, g, [0.34, -0.42, 0.48, -0.36, 0.36, -0.3], dark);        // fangs
  if (c.key === 'fenwidow') {
    const glow = c.windUp > 0 ? '#ffdbbd' : '#d396ae';
    poly(ctx, g, [-0.32, -0.56, -0.15, -0.65, -0.01, -0.56, -0.15, -0.48], glow);
    poly(ctx, g, [-0.27, -0.48, -0.15, -0.54, -0.04, -0.48, -0.15, -0.40], glow);
  }

};

BODIES.crab = function (ctx, g, c) {
  const dark = spriteShade(c.colour, -0.32);
  const light = spriteShade(c.colour, 0.22);
  for (let i = 0; i < 3; i += 1) {
    const step = Math.sin(c.anim + i * 1.7) * 0.08;
    limb(ctx, g, -0.1 + i * 0.12, -0.42, -0.2 + i * 0.14 + step, -0.02, 0.07, dark);
  }
  ell(ctx, g, 0, -0.5, 0.42, 0.34, c.colour);          // shell
  ell(ctx, g, 0, -0.62, 0.3, 0.14, light);
  // Claws: the near one big, and both opening on the gait, so a crab sidling at you
  // clacks rather than slides.
  const gape = Math.abs(Math.sin(c.anim * 0.6)) * 0.1;
  limb(ctx, g, 0.3, -0.5, 0.5, -0.62, 0.1, dark);
  poly(ctx, g, [0.5, -0.62, 0.74, -0.74 - gape, 0.56, -0.56], dark);
  poly(ctx, g, [0.5, -0.62, 0.72, -0.5 + gape, 0.56, -0.66], c.colour);
  limb(ctx, g, -0.28, -0.5, -0.44, -0.6, 0.08, spriteShade(c.colour, -0.45));
  // Eye stalks.
  limb(ctx, g, 0.1, -0.76, 0.14, -0.94, 0.05, dark);
  limb(ctx, g, -0.06, -0.76, -0.08, -0.92, 0.05, dark);
  dot(ctx, g, 0.14, -0.96, 0.07, '#1b1410');
  dot(ctx, g, -0.08, -0.94, 0.065, '#1b1410');
};

BODIES.jelly = function (ctx, g, c) {
  // The bell pulses: wide and flat on the push, tall and narrow on the recovery.
  const pulse = Math.sin(c.anim);
  const rx = 0.36 + pulse * 0.07;
  const ry = 0.3 - pulse * 0.07;
  ctx.save();
  ctx.globalAlpha *= 0.78;
  // Tentacles first: they hang behind the bell.
  for (let i = 0; i < 6; i += 1) {
    const sway = Math.sin(c.anim * 0.8 + i * 0.8) * 0.08;
    const x = -0.26 + i * 0.1;
    limb(ctx, g, x, -0.5, x + sway, -0.04, 0.05, spriteShade(c.colour, -0.1));
  }
  ell(ctx, g, 0, -0.6, rx, ry, c.colour);
  ell(ctx, g, 0, -0.66, rx * 0.6, ry * 0.5, spriteShade(c.colour, 0.35));
  ctx.restore();
  // The core, which is the part that glows in a dark cavern.
  dot(ctx, g, 0, -0.6, 0.1, spriteShade(c.colour, 0.5));
  dot(ctx, g, 0.1, -0.62, 0.05, '#ffffff');
};

BODIES.fish = function (ctx, g, c) {
  const dark = spriteShade(c.colour, -0.32);
  const pale = spriteShade(c.colour, 0.34);
  const swish = Math.sin(c.anim) * 0.14;
  // Tail, body, fins. The tail swings and the body leans the other way, which reads as
  // a swimming stroke rather than as a sliding picture of a fish.
  poly(ctx, g, [-0.4, -0.5, -0.62, -0.74 + swish, -0.52, -0.5, -0.62, -0.26 + swish], dark);
  ell(ctx, g, 0, -0.5 - swish * 0.2, 0.46, 0.3, c.colour);
  ell(ctx, g, 0.04, -0.38 - swish * 0.2, 0.4, 0.16, pale);          // pale belly
  poly(ctx, g, [0.06, -0.78, -0.08, -0.98, -0.16, -0.74], dark);    // dorsal
  poly(ctx, g, [0.1, -0.3, 0.04, -0.12, -0.08, -0.32], dark);       // pectoral
  for (let i = 0; i < 3; i += 1) {
    rect(ctx, g, 0.14 + i * 0.05, -0.62, 0.012, 0.16, dark);        // gills
  }
  dot(ctx, g, 0.3, -0.6, 0.07, '#efe7d6');
  dot(ctx, g, 0.32, -0.6, 0.04, '#141018');
  // The mouth, with the teeth that are the point of a shark.
  poly(ctx, g, [0.46, -0.52, 0.2, -0.4, 0.46, -0.36], spriteShade(c.colour, -0.55));
  for (let i = 0; i < 4; i += 1) {
    poly(ctx, g, [0.42 - i * 0.06, -0.47, 0.4 - i * 0.06, -0.42, 0.37 - i * 0.06, -0.47],
      '#f6f2e4');
  }
  if (c.key === 'reefleviathan') {
    const ink = c.windUp > 0 ? '#fff0cc' : '#a9e0db';
    poly(ctx, g, [-0.35, -0.59, -0.22, -0.90, -0.11, -0.70, 0.03, -0.91,
      0.13, -0.69, -0.02, -0.56], ink);
  }

};

BODIES.leech = function (ctx, g, c) {
  const dark = spriteShade(c.colour, -0.3);
  // A tube of segments, each one further along a travelling wave.
  for (let i = 6; i >= 0; i -= 1) {
    const t = i / 6;
    const x = 0.4 - t * 0.82;
    const y = -0.5 + Math.sin(c.anim - i * 0.7) * 0.16;
    const r = 0.17 - t * 0.07;
    ell(ctx, g, x, y, r, r * (g.w / g.h) * 0.9, i % 2 ? c.colour : dark);
  }
  const headY = -0.5 + Math.sin(c.anim) * 0.16;
  dot(ctx, g, 0.42, headY, 0.14, dark);                   // sucker
  dot(ctx, g, 0.46, headY, 0.07, '#2a1016');
  dot(ctx, g, 0.34, headY - 0.1, 0.04, '#f0d8c0');
};

BODIES.maw = function (ctx, g, c) {
  const dark = spriteShade(c.colour, -0.35);
  // Three jaws that open and close: a mouth with nothing behind it, which is why the
  // Eater of Souls is unsettling rather than merely hostile.
  const gape = 0.1 + Math.abs(Math.sin(c.anim * 0.5)) * 0.16;
  ell(ctx, g, -0.08, -0.5, 0.3, 0.32, c.colour);
  ell(ctx, g, -0.14, -0.58, 0.18, 0.16, spriteShade(c.colour, 0.22));
  for (const [dy, scale] of [[-gape, 1], [gape, 1], [0, 0.78]]) {
    poly(ctx, g, [0.1, -0.5 + dy * 0.3, 0.48 * scale, -0.5 + dy, 0.46 * scale,
      -0.5 + dy * 1.6, 0.1, -0.5 + dy * 0.8], dark);
  }
  for (let i = 0; i < 3; i += 1) {
    poly(ctx, g, [0.2 + i * 0.09, -0.5 - gape * 0.9, 0.24 + i * 0.09, -0.5 - gape * 0.3,
      0.28 + i * 0.09, -0.5 - gape * 0.9], '#f2ecdc');
    poly(ctx, g, [0.2 + i * 0.09, -0.5 + gape * 0.9, 0.24 + i * 0.09, -0.5 + gape * 0.3,
      0.28 + i * 0.09, -0.5 + gape * 0.9], '#f2ecdc');
  }
  dot(ctx, g, -0.14, -0.56, 0.06, c.glow || '#f0e2a0');
  if (c.key === 'amberroot') {
    for (let i = 0; i < 4; i += 1) {
      const x = -0.31 + i * 0.16;
      limb(ctx, g, x, -0.37, x + Math.sin(c.anim + i) * 0.17, -0.09, 0.10, '#694e35');
      dot(ctx, g, x, -0.38, 0.035, '#e9c177');
    }
  }

  if (c.key === 'hollowroot') {
    const ink = c.windUp > 0 ? '#fff0cc' : '#bd8eae';
    poly(ctx, g, [-0.35, -0.59, -0.22, -0.90, -0.11, -0.70, 0.03, -0.91,
      0.13, -0.69, -0.02, -0.56], ink);
  }

};

BODIES.worm = function (ctx, g, c) {
  const dark = spriteShade(c.colour, -0.3);
  // The body trails backwards out of the box along a travelling sine, which is how a
  // creature far longer than its own hitbox is drawn without pretending the hitbox is
  // the creature.
  const scourge = c.key === 'desertscourge';
  for (let i = 9; i >= 1; i -= 1) {
    const x = -i * 0.3;
    const y = -0.5 + Math.sin(c.anim - i * 0.55) * 0.3;
    const r = 0.3 - i * 0.02;
    ell(ctx, g, x, y, r, r * 0.95, i % 2 ? c.colour : dark);
    if (scourge) poly(ctx, g, [x - r, y, x - r * 0.55, y - r * 1.28, x + r * 0.6, y - r * 0.7], '#ecd1a0');
  }
  const hy = -0.5 + Math.sin(c.anim) * 0.3;
  ell(ctx, g, 0.04, hy, 0.34, 0.34, c.colour);
  ell(ctx, g, 0.1, hy, 0.2, 0.2, spriteShade(c.colour, -0.45));   // maw
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * TAU;
    poly(ctx, g, [0.1 + Math.cos(a) * 0.2, hy + Math.sin(a) * 0.2,
      0.1 + Math.cos(a) * 0.34, hy + Math.sin(a) * 0.34,
      0.1 + Math.cos(a + 0.4) * 0.2, hy + Math.sin(a + 0.4) * 0.2], '#efe7d2');
  }
};

BODIES.demon = function (ctx, g, c) {
  const dark = spriteShade(c.colour, -0.35);
  const beat = Math.sin(c.anim) * 0.7;
  membraneWing(ctx, g, -0.1, -0.64, 0.6, beat, dark, spriteShade(c.colour, -0.5));
  membraneWing(ctx, g, 0.12, -0.64, 0.52, -beat, spriteShade(c.colour, -0.15), dark);
  // A tail, a torso that tapers, and horns: the stock devil, drawn properly.
  const lash = Math.sin(c.anim * 0.5) * 0.14;
  limb(ctx, g, -0.1, -0.3, -0.34, -0.1 + lash, 0.1, dark);
  poly(ctx, g, [-0.4, -0.12 + lash, -0.28, -0.06 + lash, -0.3, -0.16 + lash], dark);
  poly(ctx, g, [-0.18, -0.74, 0.18, -0.74, 0.1, -0.22, -0.1, -0.22], c.colour);
  limb(ctx, g, 0.12, -0.68, 0.3, -0.42 + beat * 0.1, 0.13, c.colour);
  limb(ctx, g, 0.04, -0.24, 0.1, -0.02, 0.14, dark);
  ell(ctx, g, 0.02, -0.84, 0.17, 0.1, c.colour);
  poly(ctx, g, [0.1, -0.9, 0.24, -1.02, 0.14, -0.86], dark);
  poly(ctx, g, [-0.08, -0.9, -0.2, -1.0, -0.1, -0.86], dark);
  dot(ctx, g, 0.09, -0.86, 0.07, c.glow || '#ffd05a');
  dot(ctx, g, -0.03, -0.86, 0.065, c.glow || '#ffd05a');
  if (c.key === 'ochredrake') {
    const gold = c.windUp > 0 ? '#fff0ac' : '#d9a45f';
    poly(ctx, g, [-0.22, -0.70, -0.34, -1.03, -0.06, -0.85, 0.10, -1.02, 0.17, -0.73], gold);
    limb(ctx, g, -0.24, -0.45, -0.56, -0.22 + Math.sin(c.anim) * 0.08, 0.11, '#886043');
  }

};

BODIES.lizard = function (ctx, g, c) {
  const dark = spriteShade(c.colour, -0.3);
  const light = spriteShade(c.colour, 0.2);
  const sway = Math.sin(c.anim) * 0.12;
  // Tail first, swinging opposite the stride.
  poly(ctx, g, [-0.3, -0.42, -0.72, -0.3 - sway, -0.68, -0.22 - sway, -0.3, -0.26], c.colour);
  for (let i = 0; i < 2; i += 1) {
    const step = Math.sin(c.anim + i * Math.PI) * 0.1;
    limb(ctx, g, -0.2 + i * 0.44, -0.36, -0.26 + i * 0.44 + step, -0.02, 0.09, dark);
    limb(ctx, g, -0.2 + i * 0.44, -0.36, -0.14 + i * 0.44 - step, -0.02, 0.08,
      spriteShade(c.colour, -0.45));
  }
  ell(ctx, g, 0, -0.46, 0.36, 0.26, c.colour);
  // A crest of spines along the back.
  for (let i = 0; i < 5; i += 1) {
    poly(ctx, g, [-0.24 + i * 0.12, -0.68, -0.2 + i * 0.12, -0.86, -0.16 + i * 0.12, -0.68],
      light);
  }
  ell(ctx, g, 0.34, -0.44, 0.18, 0.18, c.colour);
  dot(ctx, g, 0.38, -0.52, 0.07, '#f2e2b8');
  dot(ctx, g, 0.4, -0.52, 0.035, '#1a1410');
  poly(ctx, g, [0.46, -0.44, 0.56, -0.4, 0.46, -0.36], dark);
  if (c.key === 'sunmane') {
    poly(ctx, g, [0.03, -0.68, 0.02, -0.91, 0.19, -0.83, 0.27, -0.99,
      0.39, -0.83, 0.46, -0.6, 0.35, -0.43], '#d6a357');
  }

  if (c.key === 'pinemaw') {
    poly(ctx, g, [-0.31, -0.60, -0.22, -0.90, -0.08, -0.72, 0.02, -0.94,
      0.13, -0.69, 0.31, -0.63], '#a9b69b');
  }

};

BODIES.cloud = function (ctx, g, c) {
  const drift = Math.sin(c.anim * 0.5) * 0.04;
  ctx.save();
  ctx.globalAlpha *= 0.92;
  for (const [x, y, r] of [[-0.26, -0.44, 0.24], [0.0, -0.58, 0.32], [0.26, -0.46, 0.26],
    [0.1, -0.34, 0.22], [-0.12, -0.34, 0.2]]) {
    ell(ctx, g, x + drift * (y + 1), y, r, r * 0.9, c.colour);
  }
  ell(ctx, g, 0, -0.66, 0.26, 0.16, spriteShade(c.colour, 0.3));
  ctx.restore();
  eyes(ctx, g, 0.16, -0.5, 0.08, '#48506a', '#1a1d2a');
  eyes(ctx, g, -0.02, -0.5, 0.075, '#48506a', '#1a1d2a');
  if (c.key === 'aurorawraith') {
    const wave = Math.sin(c.anim) * 0.10;
    poly(ctx, g, [-0.53, -0.68, -0.25, -0.80 + wave, 0.12, -0.62, 0.49, -0.75,
      0.14, -0.47, -0.23, -0.67 + wave, -0.52, -0.55], c.windUp > 0 ? '#dbfff1' : '#8fe7d8');
    poly(ctx, g, [-0.42, -0.39, -0.10, -0.55 - wave, 0.20, -0.41, 0.46, -0.5,
      0.19, -0.28, -0.11, -0.42 - wave], '#d5a6e9');
  }

  if (c.key === 'cairnshade') {
    for (let i = 0; i < 3; i += 1) {
      const y = -0.71 + i * 0.12;
      const x = -0.27 + Math.sin(c.anim + i) * 0.09;
      poly(ctx, g, [x - 0.1, y, x + 0.13, y - 0.06, x + 0.21, y + 0.04, x, y + 0.08],
        c.windUp > 0 ? '#f4e9cd' : '#c0afd3');
    }
  }

  if (c.key === 'buriedstandard') {
    const fold = Math.sin(c.anim) * 0.09;
    poly(ctx, g, [-0.43, -0.71, 0.17, -0.80 + fold, 0.39, -0.62,
      0.17, -0.42 + fold, -0.40, -0.54], c.windUp > 0 ? '#f4e2a3' : '#c3cdd9');
  }

};

// --- people ----------------------------------------------------------------------------
// The player and the villagers. One plan, because they are the same kind of thing and a
// villager that moved differently from the player would read as an enemy that cannot be
// hit. Poses: standing, walking, airborne, swimming, and swinging whatever is in hand.

function drawPerson(ctx, box, look, pose) {
  const g = geometry(box);
  const skin = look.skin || '#e8c39a';
  const gear = pose.gear || {};
  const shirt = gear.chest?.colour || look.shirt || '#4a6fa5';
  const pants = gear.legs?.colour || look.pants || '#2f3b52';
  const hair = look.hair || '#23304a';
  const shirtDark = spriteShade(shirt, -0.3);
  const shirtLight = spriteShade(shirt, 0.16);
  const pantsDark = spriteShade(pants, -0.3);
  const skinDark = spriteShade(skin, -0.2);
  const boot = gear.feet?.colour || spriteShade(pants, -0.42);
  const shinCol = spriteShade(pants, -0.14);

  const anim = pose.anim || 0;
  const swing = Math.sin(anim);
  const walking = !!pose.walking;
  const air = !!pose.airborne;
  const swim = !!pose.swimming;

  // How far each limb is thrown. Standing still, the figure breathes instead: a tiny
  // vertical drift, because a motionless character looks like a cardboard cut-out the
  // moment everything around it is moving.
  const reach = swim ? 0.18 : (walking ? 0.15 : 0.015);
  const breath = walking || air ? 0 : Math.sin((pose.time || 0) * 1.9) * 0.014;
  const legF = air ? 0.1 : swing * reach;
  const legB = air ? -0.13 : -swing * reach;
  const armF = swim ? Math.sin(anim * 1.6) * 0.26 : (air ? -0.26 : -swing * reach * 0.9);
  const armB = swim ? Math.sin(anim * 1.6 + 2.1) * 0.26 : (air ? 0.2 : swing * reach * 0.9);
  const lean = swim ? 0.08 : 0;

  ctx.save();
  ctx.translate(0, breath * g.h);

  // A leg is a thigh, a shin and a boot, so a stride bends at the knee instead of
  // pivoting like a compass.
  function leg(hipX, throwX, thigh, shin, bootCol) {
    const kneeX = hipX + throwX * 0.5;
    const kneeY = -0.26 + Math.abs(throwX) * 0.1;
    const footX = hipX + throwX;
    limb(ctx, g, hipX, -0.46, kneeX, kneeY, 0.21, thigh);
    limb(ctx, g, kneeX, kneeY, footX, -0.05, 0.18, shin);
    rect(ctx, g, footX - 0.10, -0.075, 0.23, 0.07, '#222538');
    rect(ctx, g, footX - 0.08, -0.07, 0.20, 0.051, bootCol);
    if (gear.feet) rect(ctx, g, footX, -0.065, 0.10, 0.014, spriteShade(boot, 0.4));
    if (gear.legs) rect(ctx, g, kneeX - 0.05, kneeY - 0.025, 0.1, 0.044, spriteShade(pants, 0.32));
  }

  // An arm is an upper in sleeve colour and a forearm in skin, with a hand at the end.
  function arm(shoulderX, throwX, sleeve, flesh) {
    const elbowX = shoulderX + throwX * 0.55 + 0.05;
    const elbowY = -0.58;
    const handX = shoulderX + throwX + 0.09;
    const handY = -0.4 + Math.abs(throwX) * 0.1;
    limb(ctx, g, shoulderX, -0.76, elbowX, elbowY, 0.19, sleeve);
    limb(ctx, g, elbowX, elbowY, handX, handY, 0.16, flesh);
    return { x: handX, y: handY };
  }

  // Far side first, in darker shades, so the figure has a near side and a far side.
  leg(-0.05, legB, pantsDark, spriteShade(pantsDark, -0.08), spriteShade(boot, -0.2));
  arm(-0.09 - lean, armB, shirtDark, skinDark);

  // Torso: shoulders out, waist in, with a collar and a belt.
  poly(ctx, g, [-0.23 - lean, -0.78, 0.23 - lean, -0.78, 0.18, -0.44, -0.18, -0.44], shirt);
  poly(ctx, g, [-0.23 - lean, -0.78, 0.23 - lean, -0.78, 0.2 - lean, -0.72, -0.2 - lean,
    -0.72], shirtLight);
  rect(ctx, g, -0.19, -0.5, 0.38, 0.055, spriteShade(shirt, -0.45));
  rect(ctx, g, -0.18, -0.46, 0.36, 0.045, pants);

  rect(ctx, g, -0.052, -0.49, 0.105, 0.036, '#d6a455');
  if (gear.chest) {
    poly(ctx, g, [-0.26, -0.78, 0.26, -0.78, 0.17, -0.57, 0, -0.53, -0.17, -0.57], shirtDark);
    poly(ctx, g, [-0.22, -0.77, 0.22, -0.77, 0.14, -0.61, 0, -0.57, -0.14, -0.61], shirtLight);
    const bone = gear.chest.tier === 'bone';
    for (let i = 0; i < (bone ? 3 : 2); i += 1) {
      rect(ctx, g, -0.15 + i * 0.025, -0.71 + i * 0.045, 0.3 - i * 0.05, 0.019, bone ? shirt : shirtDark);
    }
  }
  if (gear.accessories?.length) {
    for (const [index, accessory] of gear.accessories.entries()) {
      const x = (index - (gear.accessories.length - 1) / 2) * 0.072;
      poly(ctx, g, [x, -0.714, x + 0.043, -0.674, x, -0.633, x - 0.043, -0.674], '#25253b');
      dot(ctx, g, x, -0.674, 0.032, accessory.colour);
    }
  }

  // Neck and head.
  const hx = 0.01 - lean * 1.6;
  rect(ctx, g, hx - 0.06, -0.82, 0.12, 0.06, skinDark);
  ell(ctx, g, hx, -0.89, 0.155, 0.085, skin);
  const hairstyle = look.hairstyle || 'swept';
  if (!gear.head && hairstyle !== 'shaved') {
    ell(ctx, g, hx - 0.027, -0.939, 0.158, 0.055, hair);
    if (hairstyle === 'braid') {
      for (let i = 0; i < 4; i += 1) dot(ctx, g, hx - 0.15 - i * 0.013, -0.91 + i * 0.044, 0.055, hair);
      rect(ctx, g, hx - 0.225, -0.76, 0.075, 0.018, '#d5a159');
    } else if (hairstyle === 'crest') {
      poly(ctx, g, [hx - 0.19, -0.94, hx - 0.20, -1.04, hx - 0.08, -0.99, hx + 0.05, -1.03,
        hx + 0.12, -0.94], hair);
    } else if (hairstyle === 'curls') {
      for (let i = 0; i < 4; i += 1) dot(ctx, g, hx - 0.16 + i * 0.083, -0.958 - (i % 2) * 0.018, 0.065, hair);
    } else {
      poly(ctx, g, [hx - 0.17, -0.97, hx - 0.24, -0.87, hx - 0.13, -0.88, hx + 0.12, -0.97], hair);
    }
    rect(ctx, g, hx - 0.1, -0.967, 0.17, 0.014, spriteShade(hair, 0.28));
  }
  // A face: one eye, a brow and a mouth is enough at this size, and the blink is on a
  // long cycle with a short closure, which is the only reason it reads as a blink.
  const blink = Math.sin((pose.time || 0) * 0.9 + (pose.phase || 0));
  if (blink > 0.985) rect(ctx, g, hx + 0.03, -0.9, 0.09, 0.012, skinDark);
  else {
    dot(ctx, g, hx + 0.075, -0.9, 0.05, '#f6f3ec');
    dot(ctx, g, hx + 0.09, -0.9, 0.028, look.eyes || '#241e2a');
  }
  rect(ctx, g, hx + 0.03, -0.94, 0.1, 0.014, hair);
  rect(ctx, g, hx + 0.05, -0.845, 0.06, 0.012, skinDark);

  if (look.marking === 'freckles') {
    for (let i = 0; i < 3; i += 1) dot(ctx, g, hx + i * 0.035, -0.865, 0.012, skinDark);
  } else if (look.marking === 'paint') {
    rect(ctx, g, hx + 0.03, -0.873, 0.107, 0.017, look.eyes || '#349d9b');
  } else if (look.marking === 'scar') {
    limb(ctx, g, hx + 0.03, -0.88, hx - 0.02, -0.844, 0.022, skinDark);
  }
  if (gear.head) {
    const { colour, tier } = gear.head;
    const cloth = tier === 'apprentice' || tier === 'adept' || tier === 'brigand';
    const dark = spriteShade(colour, -0.35);
    ell(ctx, g, hx - 0.018, -0.946, 0.184, 0.071, dark);
    if (cloth) {
      poly(ctx, g, [hx - 0.20, -0.94, hx - 0.11, -0.994, hx - 0.06, -1.05, hx + 0.16, -0.94], colour);
      rect(ctx, g, hx - 0.22, -0.949, 0.43, 0.022, spriteShade(colour, 0.35));
    } else {
      poly(ctx, g, [hx - 0.18, -0.95, hx - 0.09, -1.01, hx + 0.09, -1.01, hx + 0.17, -0.944,
        hx + 0.08, -0.929, hx - 0.05, -0.942, hx - 0.10, -0.858, hx - 0.18, -0.883], colour);
      rect(ctx, g, hx - 0.09, -0.992, 0.18, 0.016, spriteShade(colour, 0.47));
      dot(ctx, g, hx - 0.12, -0.925, 0.025, tier === 'emberite' ? '#ffde87' : dark);
    }
  }

  // Near side, and whatever is in hand.
  leg(0.05, legF, pants, shinCol, boot);
  const shoulderX = 0.09 - lean;
  if (pose.swingArm !== undefined && pose.swingArm !== null) {
    // Mining and fighting share one arc, because the player swings the same arm. The
    // arc starts above the shoulder and comes down past the waist.
    const a = pose.swingArm;
    const angle = -1.25 + a * 2.3;
    const elbowX = shoulderX + Math.cos(angle) * 0.17;
    const elbowY = -0.72 + Math.sin(angle) * 0.17;
    const handX = shoulderX + Math.cos(angle) * 0.32;
    const handY = -0.72 + Math.sin(angle) * 0.32;
    limb(ctx, g, shoulderX, -0.76, elbowX, elbowY, 0.19, shirtLight);
    limb(ctx, g, elbowX, elbowY, handX, handY, 0.16, skin);
    if (pose.held) drawHeld(ctx, g, pose.held, handX, handY, angle);
  } else {
    const hand = arm(shoulderX, armF, shirtLight, skin);
    if (pose.held) drawHeld(ctx, g, pose.held, hand.x, hand.y, -0.7);
  }
  ctx.restore();
}

// Whatever is in hand, as a stick with a head on it. Enough to tell a pickaxe from a
// sword at a glance, which is all it has to do.
function drawHeld(ctx, g, held, hx, hy, angle) {
  const len = held.length || 0.42;
  const tipX = hx + Math.cos(angle) * len;
  const tipY = hy + Math.sin(angle) * len;
  limb(ctx, g, hx, hy, tipX, tipY, 0.12, held.handle || '#7a5a36');
  const head = held.head || '#b8bec8';
  if (held.shape === 'blade') {
    poly(ctx, g, [hx + Math.cos(angle) * 0.1, hy + Math.sin(angle) * 0.1,
      tipX, tipY, tipX + Math.cos(angle + 1.6) * 0.06, tipY + Math.sin(angle + 1.6) * 0.06],
      head);
  } else if (held.shape === 'pick') {
    // Two curved beaks off the haft, drawn as a thin arc rather than a filled wedge:
    // a solid triangle at this size reads as an axe.
    const a1 = angle - 1.35;
    const a2 = angle + 1.35;
    poly(ctx, g, [tipX + Math.cos(a1) * 0.2, tipY + Math.sin(a1) * 0.2,
      tipX + Math.cos(a1) * 0.1, tipY + Math.sin(a1) * 0.1,
      tipX + Math.cos(a2) * 0.1, tipY + Math.sin(a2) * 0.1,
      tipX + Math.cos(a2) * 0.2, tipY + Math.sin(a2) * 0.2,
      tipX + Math.cos(a2) * 0.16, tipY + Math.sin(a2) * 0.16,
      tipX, tipY,
      tipX + Math.cos(a1) * 0.16, tipY + Math.sin(a1) * 0.16], head);
  } else if (held.shape === 'axe') {
    poly(ctx, g, [tipX, tipY, tipX + Math.cos(angle - 1.4) * 0.2,
      tipY + Math.sin(angle - 1.4) * 0.2, tipX + Math.cos(angle - 0.4) * 0.22,
      tipY + Math.sin(angle - 0.4) * 0.22], head);
  } else if (held.shape === 'torch') {
    dot(ctx, g, tipX, tipY, 0.085, head);
    dot(ctx, g, tipX, tipY, 0.04, '#fff3c4');
  } else if (held.shape === 'hammer') {
    const crossX = -Math.sin(angle) * 0.19;
    const crossY = Math.cos(angle) * 0.19;
    const depthX = Math.cos(angle) * 0.07;
    const depthY = Math.sin(angle) * 0.07;
    poly(ctx, g, [
      tipX - crossX - depthX, tipY - crossY - depthY,
      tipX + crossX - depthX, tipY + crossY - depthY,
      tipX + crossX + depthX, tipY + crossY + depthY,
      tipX - crossX + depthX, tipY - crossY + depthY
    ], head);
  } else if (held.shape === 'block') {
    rect(ctx, g, hx - 0.08, hy - 0.08, 0.16, 0.16, head);
  }
}

BODIES.mimic = function (ctx, g, c) {
  const jaw = (Math.sin(c.anim * 1.3 + c.time * 5) + 1) * 0.09;
  const dark = '#302737', trim = '#c7a56d';
  rect(ctx, g, -0.43, -0.64, 0.86, 0.51, dark);
  rect(ctx, g, -0.38, -0.40, 0.76, 0.23, c.colour);
  poly(ctx, g, [-0.44, -0.56 - jaw, -0.33, -0.82 - jaw, 0.36, -0.77 - jaw, 0.45, -0.55 - jaw], c.colour);
  rect(ctx, g, -0.11, -0.73 - jaw, 0.22, 0.18, trim);
  for (let i = 0; i < 5; i += 1) {
    const x = -0.32 + i * 0.16;
    poly(ctx, g, [x, -0.53 - jaw, x + 0.10, -0.53 - jaw, x + 0.04, -0.40 - jaw], '#f4e1bb');
  }
  for (const side of [-1, 1]) {
    const x = side * 0.29;
    limb(ctx, g, x, -0.25, x + Math.sin(c.anim + side) * 0.13, 0, 0.13, dark);
    dot(ctx, g, x * 0.65, -0.63 - jaw, 0.038, '#ffb468');
  }
};

// --- the entry point ---------------------------------------------------------------------

// Draw one creature. `box` is in pixels; `c` carries colour, the animation phase and
// whatever state the plan reads. Mirroring is done here, once, so no plan has to think
// about which way it is facing.
// Anchors sit on the central body, clear of eyes and animated extremities.
const CREATURE_INLAYS = {
  slime: [-0.17, -0.68, 'speck'], kingslime: [-0.20, -0.55, 'gem'],
  humanoid: [-0.05, -0.61, 'seam'], skeleton: [-0.06, -0.62, 'seam'],
  eye: [-0.18, -0.62, 'seam'], bigeye: [-0.19, -0.62, 'gem'],
  bird: [-0.1, -0.52, 'seam'], beetle: [-0.19, -0.48, 'plate'],
  spider: [-0.18, -0.54, 'gem'], wasp: [-0.24, -0.56, 'seam'],
  leech: [0.12, -0.48, 'speck'], crab: [-0.08, -0.48, 'plate'],
  jelly: [-0.10, -0.69, 'speck'], fish: [-0.13, -0.53, 'seam'],
  maw: [-0.18, -0.62, 'gem'], worm: [0.14, -0.48, 'plate'],
  bat: [0, -0.56, 'seam'], lizard: [-0.13, -0.46, 'plate'],
  golem: [0, -0.63, 'gem'], imp: [-0.04, -0.57, 'seam'],
  demon: [-0.02, -0.61, 'gem'], mimic: [0, -0.30, 'plate'], cloud: [-0.14, -0.57, 'speck']
};
const creaturePaints = new Map();

function paintCreatureInlay(ctx, g, body, c) {
  const inlay = CREATURE_INLAYS[body];
  if (!inlay || !c.key || g.px < 7) return;
  let paint = creaturePaints.get(c.key);
  if (!paint) {
    let seed = 0;
    for (const letter of c.key) seed = (Math.imul(seed, 31) + letter.charCodeAt(0)) >>> 0;
    paint = { ink: spriteShade(c.colour, -0.55), light: spriteShade(c.colour, 0.53),
      count: 2 + seed % 3, spacing: 0.032 + (seed % 5) * 0.006 };
    creaturePaints.set(c.key, paint);
  }
  const [x, y, style] = inlay;
  if (style === 'gem') {
    poly(ctx, g, [x, y - 0.055, x + 0.07, y, x, y + 0.055, x - 0.07, y], paint.ink);
    poly(ctx, g, [x, y - 0.042, x + 0.044, y, x, y + 0.021, x - 0.039, y], paint.light);
    return;
  }
  for (let i = 0; i < paint.count; i += 1) {
    const dx = x + i * paint.spacing;
    const dy = y - (i % 2) * 0.025;
    if (style === 'speck') dot(ctx, g, dx, dy, 0.021, paint.light);
    else if (style === 'seam') limb(ctx, g, dx, dy, dx + 0.028, dy + 0.048, 0.025, paint.light);
    else {
      rect(ctx, g, dx, dy, 0.032, 0.048, paint.ink);
      rect(ctx, g, dx, dy, 0.025, 0.012, paint.light);
    }
  }
}

function drawCreature(ctx, box, body, c) {
  const plan = BODIES[body] || BODIES.slime;
  const g = geometry(box);
  ctx.save();
  if (c.facing < 0) {
    ctx.translate(g.cx, 0);
    ctx.scale(-1, 1);
    ctx.translate(-g.cx, 0);
  }
  plan(ctx, g, c);
  paintCreatureInlay(ctx, g, body, c);
  ctx.restore();
}

const EXPORTS_sprite = { BODIES, drawCreature, drawPerson, drawHeld, geometry,
  spriteShade, limb, poly, ell, dot, rect, eyes, gaitOf };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXPORTS_sprite;
} else if (typeof FATHOM !== 'undefined') {
  FATHOM.sprite = EXPORTS_sprite;
}
