'use strict';
// Value noise with fractal and domain-warped variants, addressed by absolute world
// coordinate. Nothing here keeps state, so a column's value does not depend on which chunk
// asked for it; that is what makes chunk seams continuous by construction.

function smooth(t) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function value1(seed, x, salt) {
  const i = Math.floor(x);
  const f = x - i;
  const a = unit(seed, i, 0, salt);
  const b = unit(seed, i + 1, 0, salt);
  return a + (b - a) * smooth(f);
}

function value2(seed, x, y, salt) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const a = unit(seed, ix, iy, salt);
  const b = unit(seed, ix + 1, iy, salt);
  const c = unit(seed, ix, iy + 1, salt);
  const d = unit(seed, ix + 1, iy + 1, salt);
  const sx = smooth(fx);
  const sy = smooth(fy);
  const top = a + (b - a) * sx;
  const bottom = c + (d - c) * sx;
  return top + (bottom - top) * sy;
}

function fbm1(seed, x, salt, octaves, lacunarity, gain) {
  let sum = 0;
  let amp = 1;
  let freq = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o += 1) {
    sum += value1(seed, x * freq, salt + o * 101) * amp;
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
}

function fbm2(seed, x, y, salt, octaves, lacunarity, gain) {
  let sum = 0;
  let amp = 1;
  let freq = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o += 1) {
    sum += value2(seed, x * freq, y * freq, salt + o * 131) * amp;
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
}

function ridged2(seed, x, y, salt, octaves) {
  let sum = 0;
  let amp = 1;
  let freq = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o += 1) {
    const n = 1 - Math.abs(value2(seed, x * freq, y * freq, salt + o * 149) * 2 - 1);
    sum += n * n * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

function warped2(seed, x, y, salt, strength) {
  const wx = x + strength * (value2(seed, x * 0.5, y * 0.5, salt + 7) * 2 - 1);
  const wy = y + strength * (value2(seed, x * 0.5, y * 0.5, salt + 19) * 2 - 1);
  return fbm2(seed, wx, wy, salt, 4, 2, 0.5);
}

// The module's public surface, declared once. index.html used to repeat these
// names by hand, and three separate times a new export was added here and
// forgotten there, which broke the game at runtime while every test passed.
const EXPORTS_noise = { smooth, value1, value2, fbm1, fbm2, ridged2, warped2 };

if (typeof module !== 'undefined' && module.exports) {

  const rng = require('./rng.js');
  global.unit = rng.unit;
  module.exports = EXPORTS_noise;
} else if (typeof FATHOM !== 'undefined') {
  FATHOM.noise = EXPORTS_noise;
}
