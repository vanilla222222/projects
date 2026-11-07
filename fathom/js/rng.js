'use strict';
// Seeded, position-addressable randomness. Every generator call is a pure function of
// (seed, x, y, salt), never of call order, so a chunk generates identically whenever and in
// whatever order it is asked for. tools/worldgen-test.js asserts that.

function hash32(a) {
  a |= 0;
  a = (a ^ 61) ^ (a >>> 16);
  a = (a + (a << 3)) | 0;
  a ^= a >>> 4;
  a = Math.imul(a, 0x27d4eb2d);
  a ^= a >>> 15;
  return a >>> 0;
}

function hash2(seed, x, y, salt) {
  let h = hash32(seed ^ 0x9e3779b9);
  h = hash32(h ^ Math.imul(x | 0, 0x85ebca6b));
  h = hash32(h ^ Math.imul(y | 0, 0xc2b2ae35));
  h = hash32(h ^ Math.imul((salt | 0) + 1, 0x165667b1));
  return h >>> 0;
}

function unit(seed, x, y, salt) {
  return hash2(seed, x, y, salt) / 4294967296;
}

function signed(seed, x, y, salt) {
  return unit(seed, x, y, salt) * 2 - 1;
}

function pick(seed, x, y, salt, list) {
  return list[hash2(seed, x, y, salt) % list.length];
}

function streamFrom(seed, x, y, salt) {
  let state = hash2(seed, x, y, salt) || 1;
  return function next() {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4294967296;
  };
}

// The module's public surface, declared once. index.html used to repeat these
// names by hand, and three separate times a new export was added here and
// forgotten there, which broke the game at runtime while every test passed.
const EXPORTS_rng = { hash32, hash2, unit, signed, pick, streamFrom };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXPORTS_rng;
} else if (typeof FATHOM !== 'undefined') {
  FATHOM.rng = EXPORTS_rng;
}
