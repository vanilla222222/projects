'use strict';
const assert = require('node:assert/strict');
const at = require('../js/autotile.js');

let checks = 0;
function check(c, m) { assert.ok(c, m); checks += 1; }

// Every mask must resolve to a complete, boolean edge description.
const keys = ['top', 'right', 'bottom', 'left',
  'innerTopLeft', 'innerTopRight', 'innerBottomLeft', 'innerBottomRight'];
for (let mask = 0; mask < 256; mask += 1) {
  const e = at.edges(mask);
  for (const key of keys) {
    check(typeof e[key] === 'boolean', 'mask ' + mask + ' gave non-boolean ' + key);
  }
  const open = at.exposure(mask);
  check(open >= 0 && open <= 4, 'mask ' + mask + ' reported exposure ' + open);
  check(at.isBuried(mask) === (open === 0), 'mask ' + mask + ' disagrees on buried vs exposure');
}

// A fully surrounded tile has no edges and no notches; a lone tile has all four.
const buried = at.edges(255);
check(keys.every((k) => buried[k] === false), 'a fully surrounded tile still reports an edge');
const lone = at.edges(0);
check(lone.top && lone.right && lone.bottom && lone.left, 'an isolated tile is missing an edge');
check(!lone.innerTopLeft && !lone.innerBottomRight, 'an isolated tile reports an inner corner');

// An inner corner needs both its cardinals present and its diagonal absent.
check(at.edges(at.N | at.W).innerTopLeft, 'N+W without NW should notch the top-left');
check(!at.edges(at.N | at.W | at.NW).innerTopLeft, 'N+W+NW should not notch');
check(!at.edges(at.N).innerTopLeft, 'N alone should not notch');

// maskAt must read the eight neighbours and nothing else.
const solid = new Set(['0,-1', '1,0']);
const mask = at.maskAt((x, y) => solid.has(x + ',' + y), 0, 0);
check(mask === (at.N | at.E), 'maskAt read the wrong neighbours: ' + mask);
check(at.maskAt(() => false, 5, 5) === 0, 'an empty neighbourhood is not zero');
check(at.maskAt(() => true, 5, 5) === 255, 'a full neighbourhood is not 255');

console.log('Autotile: ' + checks + ' checks passed across all 256 neighbour masks');
