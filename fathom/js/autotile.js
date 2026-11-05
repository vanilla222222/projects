'use strict';
// Neighbour analysis for tile drawing. A tile's appearance depends on which of its eight
// neighbours are solid: exposed edges get a bevel, a face open to the sky gets a lit rim,
// and inner corners get a notch. Pure integer logic, so tools/autotile-test.js can assert
// every one of the 256 masks resolves to a defined edge set.

const N = 1;
const NE = 2;
const E = 4;
const SE = 8;
const S = 16;
const SW = 32;
const W = 64;
const NW = 128;

const OFFSETS = [
  [0, -1, N], [1, -1, NE], [1, 0, E], [1, 1, SE],
  [0, 1, S], [-1, 1, SW], [-1, 0, W], [-1, -1, NW]
];

function maskAt(sameAt, x, y) {
  let mask = 0;
  for (const [dx, dy, bit] of OFFSETS) {
    if (sameAt(x + dx, y + dy)) mask |= bit;
  }
  return mask;
}

function edges(mask) {
  return {
    top: (mask & N) === 0,
    right: (mask & E) === 0,
    bottom: (mask & S) === 0,
    left: (mask & W) === 0,
    innerTopLeft: (mask & N) !== 0 && (mask & W) !== 0 && (mask & NW) === 0,
    innerTopRight: (mask & N) !== 0 && (mask & E) !== 0 && (mask & NE) === 0,
    innerBottomLeft: (mask & S) !== 0 && (mask & W) !== 0 && (mask & SW) === 0,
    innerBottomRight: (mask & S) !== 0 && (mask & E) !== 0 && (mask & SE) === 0
  };
}

function exposure(mask) {
  let open = 0;
  if ((mask & N) === 0) open += 1;
  if ((mask & E) === 0) open += 1;
  if ((mask & S) === 0) open += 1;
  if ((mask & W) === 0) open += 1;
  return open;
}

function isBuried(mask) {
  return (mask & (N | E | S | W)) === (N | E | S | W);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { N, NE, E, SE, S, SW, W, NW, OFFSETS, maskAt, edges, exposure, isBuried };
}
