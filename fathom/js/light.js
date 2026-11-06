'use strict';
// Coloured light over the visible window. Sunlight falls per column and dims through
// whatever it passes, so a cave mouth throws a shaft rather than a hard edge; emitters
// flood outward in their own colour. Both run on a window with a margin, so light entering
// from just off-screen is accounted for instead of popping in at the edge.

const CHANNELS = 3;
const SUN_TINTS = {
  day: [255, 246, 222],
  dusk: [255, 176, 120],
  night: [78, 104, 168]
};
const EMIT_TINTS = {
  torch: [255, 176, 86],
  lantern: [255, 214, 150],
  crystal: [132, 164, 255],
  glowmoss: [96, 226, 176],
  mushroom: [186, 134, 226],
  emberite: [214, 92, 52]
};

// dayPhase runs 0 at noon through 0.5 at midnight and back. Solar elevation is its cosine,
// so the tint crosses day to dusk to night as the sun sets, and the strength falls with it
// instead of staying at noon level all night.
function solarElevation(dayPhase) {
  return Math.cos(dayPhase * Math.PI * 2);
}

function mix(a, b, t) {
  const out = [0, 0, 0];
  for (let c = 0; c < CHANNELS; c += 1) out[c] = a[c] + (b[c] - a[c]) * t;
  return out;
}

function sunTint(dayPhase) {
  const e = solarElevation(dayPhase);
  if (e >= 0.25) return SUN_TINTS.day.slice();
  if (e >= 0) return mix(SUN_TINTS.dusk, SUN_TINTS.day, e / 0.25);
  if (e >= -0.25) return mix(SUN_TINTS.dusk, SUN_TINTS.night, -e / 0.25);
  return SUN_TINTS.night.slice();
}

function sunStrength(dayPhase) {
  const e = solarElevation(dayPhase);
  if (e >= 0.15) return 1;
  if (e <= -0.15) return 0.1;
  const t = (e + 0.15) / 0.3;
  return 0.1 + 0.9 * t * t * (3 - 2 * t);
}

function makeLightField(tiles) {
  let width = 0;
  let height = 0;
  let buffer = new Uint8Array(0);
  let queueX = new Int32Array(0);
  let queueY = new Int32Array(0);

  function resize(w, h) {
    if (w === width && h === height) return;
    width = w;
    height = h;
    buffer = new Uint8Array(w * h * CHANNELS);
    queueX = new Int32Array(w * h);
    queueY = new Int32Array(w * h);
  }

  function at(lx, ly, channel) {
    return buffer[(ly * width + lx) * CHANNELS + channel];
  }

  function compute(world, x0, y0, w, h, sunStrength, dayPhase) {
    resize(w, h);
    buffer.fill(0);
    const tint = sunTint(dayPhase);
    let head = 0;
    let tail = 0;

    for (let lx = 0; lx < w; lx += 1) {
      const x = x0 + lx;
      let carry = sunStrength;
      for (let above = Math.max(0, y0 - 64); above < y0 && carry > 0; above += 1) {
        carry = Math.max(0, carry - tiles.opacityOf(world.get(x, above)));
      }
      for (let ly = 0; ly < h; ly += 1) {
        const id = world.get(x, y0 + ly);
        carry = Math.max(0, carry - tiles.opacityOf(id));
        if (carry <= 0) break;
        const base = (ly * w + lx) * CHANNELS;
        for (let c = 0; c < CHANNELS; c += 1) {
          buffer[base + c] = Math.min(255, Math.round(carry * (tint[c] / 255)));
        }
        if (carry > 16) {
          queueX[tail] = lx;
          queueY[tail] = ly;
          tail += 1;
        }
      }
    }

    for (let ly = 0; ly < h; ly += 1) {
      for (let lx = 0; lx < w; lx += 1) {
        const id = world.get(x0 + lx, y0 + ly);
        const emit = tiles.emitOf(id);
        if (emit <= 0) continue;
        const tintFor = EMIT_TINTS[tiles.tile(id).key] || [255, 255, 255];
        const base = (ly * w + lx) * CHANNELS;
        const strength = Math.min(255, emit * 17);
        let raised = false;
        for (let c = 0; c < CHANNELS; c += 1) {
          const value = Math.round(strength * (tintFor[c] / 255));
          if (value > buffer[base + c]) {
            buffer[base + c] = value;
            raised = true;
          }
        }
        if (raised) {
          queueX[tail] = lx;
          queueY[tail] = ly;
          tail += 1;
        }
      }
    }

    const neighbours = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    while (head < tail) {
      const lx = queueX[head];
      const ly = queueY[head];
      head += 1;
      const base = (ly * w + lx) * CHANNELS;
      for (const [dx, dy] of neighbours) {
        const nx = lx + dx;
        const ny = ly + dy;
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        const id = world.get(x0 + nx, y0 + ny);
        const fall = Math.max(12, tiles.opacityOf(id));
        const nbase = (ny * w + nx) * CHANNELS;
        let raised = false;
        for (let c = 0; c < CHANNELS; c += 1) {
          const value = buffer[base + c] - fall;
          if (value > buffer[nbase + c]) {
            buffer[nbase + c] = value;
            raised = true;
          }
        }
        if (raised && tail < queueX.length) {
          queueX[tail] = nx;
          queueY[tail] = ny;
          tail += 1;
        }
      }
    }
    return { width: w, height: h };
  }

  return { compute, at, get buffer() { return buffer; },
    get width() { return width; }, get height() { return height; } };
}

// The module's public surface, declared once. index.html used to repeat these
// names by hand, and three separate times a new export was added here and
// forgotten there, which broke the game at runtime while every test passed.
const EXPORTS_light = { makeLightField, sunTint, sunStrength, solarElevation, CHANNELS, EMIT_TINTS, SUN_TINTS };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXPORTS_light;
} else if (typeof FATHOM !== 'undefined') {
  FATHOM.light = EXPORTS_light;
}
