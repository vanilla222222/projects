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
function ambientAtDepth(depth) {
  if (depth <= 8) return 88;
  return Math.round(9 + 79 * Math.max(0, (62 - depth) / 54) ** 2);
}

const EMIT_TINTS = {
  torch: [255, 214, 157],
  lantern: [255, 230, 184],
  crystal: [132, 164, 255],
  glowmoss: [96, 226, 176],
  mushroom: [186, 134, 226],
  emberite: [214, 92, 52],
  lava: [255, 138, 60],
  brimstone: [198, 84, 52],
  cinderstone: [170, 90, 60],
  starrock: [150, 160, 230]
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
  let queue = new Int32Array(0);
  let queued = new Uint8Array(0);
  let opacity = new Uint8Array(0);
  let ids = new Uint16Array(0);

  function resize(w, h) {
    if (w === width && h === height) return;
    width = w;
    height = h;
    buffer = new Uint8Array(w * h * CHANNELS);
    queue = new Int32Array(w * h + 1);
    queued = new Uint8Array(w * h);
    opacity = new Uint8Array(w * h);
    ids = new Uint16Array(w * h);
  }

  function at(lx, ly, channel) {
    return buffer[(ly * width + lx) * CHANNELS + channel];
  }

  function compute(world, x0, y0, w, h, sunStrength, dayPhase, surfaceAt) {
    resize(w, h);
    buffer.fill(0);
    queued.fill(0);
    const tint = sunTint(dayPhase);
    let head = 0;
    let tail = 0;
    function enqueue(index) {
      if (queued[index]) return;
      queued[index] = 1;
      queue[tail] = index;
      tail = (tail + 1) % queue.length;
    }

    for (let ly = 0; ly < h; ly += 1) for (let lx = 0; lx < w; lx += 1) {
      const index = ly * w + lx;
      const id = world.get(x0 + lx, y0 + ly);
      ids[index] = id;
      opacity[index] = tiles.opacityOf(id);
    }

    for (let lx = 0; lx < w; lx += 1) {
      const x = x0 + lx;
      const surface = surfaceAt ? surfaceAt(x) : Math.max(0, y0 - 64);
      if (y0 > surface + 64) continue;
      let carry = sunStrength;
      for (let above = Math.max(surface, y0 - 64); above < y0 && carry > 0; above += 1) {
        carry = Math.max(0, carry - tiles.opacityOf(world.get(x, above)) - 2);
      }
      for (let ly = 0; ly < h; ly += 1) {
        const index = ly * w + lx;
        carry = Math.max(0, carry - opacity[index] - (y0 + ly >= surface ? 2 : 0));
        if (carry <= 0) break;
        const base = index * CHANNELS;
        for (let c = 0; c < CHANNELS; c += 1) {
          buffer[base + c] = Math.min(255, Math.round(carry * (tint[c] / 255)));
        }
        if (carry > 16) enqueue(index);
      }
    }

    for (let index = 0; index < ids.length; index += 1) {
      const id = ids[index];
      const emit = tiles.emitOf(id);
      if (emit <= 0) continue;
      const key = tiles.tile(id).key;
      const tintFor = EMIT_TINTS[key] || [255, 255, 255];
      const placed = key === 'torch' || key === 'lantern' || key === 'campfire' || key === 'furnace';
      const strength = Math.min(255, emit * (placed ? 19 : 10));
      const base = index * CHANNELS;
      for (let c = 0; c < CHANNELS; c += 1) {
        const value = Math.round(strength * (tintFor[c] / 255));
        if (value <= buffer[base + c]) continue;
        buffer[base + c] = value;
        enqueue(index);
      }
    }

    function spread(base, next) {
      const fall = Math.max(18, opacity[next] * 2);
      const nextBase = next * CHANNELS;
      for (let c = 0; c < CHANNELS; c += 1) {
        const value = buffer[base + c] - fall;
        if (value <= buffer[nextBase + c]) continue;
        buffer[nextBase + c] = value;
        enqueue(next);
      }
    }

    // Revisit a cell if another source raises one of its color channels.
    while (head !== tail) {
      const index = queue[head];
      head = (head + 1) % queue.length;
      queued[index] = 0;
      const x = index % w;
      const base = index * CHANNELS;
      if (x > 0) spread(base, index - 1);
      if (x + 1 < w) spread(base, index + 1);
      if (index >= w) spread(base, index - w);
      if (index + w < ids.length) spread(base, index + w);
    }
    return { width: w, height: h };
  }

  return { compute, at, get buffer() { return buffer; },
    get width() { return width; }, get height() { return height; } };
}

// The module's public surface, declared once. index.html used to repeat these
// names by hand, and three separate times a new export was added here and
// forgotten there, which broke the game at runtime while every test passed.
const EXPORTS_light = { makeLightField, ambientAtDepth, sunTint, sunStrength, solarElevation, CHANNELS, EMIT_TINTS, SUN_TINTS };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXPORTS_light;
} else if (typeof FATHOM !== 'undefined') {
  FATHOM.light = EXPORTS_light;
}
