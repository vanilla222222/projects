'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const { bindNightfallStick, bindNightfallHold } = vm.runInNewContext(
  fs.readFileSync(path.join(root, 'js/ui/touch-input.js'), 'utf8') + '\n({ bindNightfallStick, bindNightfallHold })'
);

class Surface {
  listeners = new Map();
  captured = new Set();
  addEventListener(name, callback){ this.listeners.set(name, callback); }
  setPointerCapture(id){ this.captured.add(id); }
  hasPointerCapture(id){ return this.captured.has(id); }
  releasePointerCapture(id){ this.captured.delete(id); }
  getBoundingClientRect(){ return { left:0, top:0, width:100, height:100 }; }
  dispatch(name, id, x = 50, y = 50){
    this.listeners.get(name)?.({ pointerId:id, clientX:x, clientY:y, button:0, preventDefault(){} });
  }
}

const move = new Surface(), aim = new Surface(), build = new Surface();
let movement, aiming, building;
let unlocks = 0;
const unlock = () => { unlocks++; };
const resetMove = bindNightfallStick(move, { style:{} }, (...state) => { movement = state; }, unlock);
const resetAim = bindNightfallStick(aim, { style:{} }, (...state) => { aiming = state; }, unlock);
const resetBuild = bindNightfallHold(build, value => { building = value; }, unlock);

move.dispatch('pointerdown', 1, 100, 50);
aim.dispatch('pointerdown', 2);
assert.deepEqual(movement, [1, 0, true]);
assert.deepEqual(aiming, [0, 0, true], 'a centered hold still attacks');
aim.dispatch('pointermove', 2, 50, 0);
assert.deepEqual(aiming, [0, -1, true]);
move.dispatch('pointerdown', 3, 0, 0);
move.dispatch('pointercancel', 3);
assert.deepEqual(movement, [1, 0, true], 'another finger cannot steal the move stick');
aim.dispatch('pointercancel', 2);
assert.deepEqual(aiming, [0, 0, false]);
assert.deepEqual(movement, [1, 0, true]);
build.dispatch('pointerdown', 3);
assert.equal(building, true);
assert.equal(build.hasPointerCapture(3), true);
build.dispatch('lostpointercapture', 3);
assert.equal(building, false);

move.dispatch('pointermove', 1, 67, 50);
assert.ok(movement[0] > 0 && movement[0] < 1, 'short drag moves at partial speed');
resetMove();
resetAim();
resetBuild();
assert.deepEqual(movement, [0, 0, false]);
assert.equal(move.captured.size + aim.captured.size + build.captured.size, 0);
assert.equal(unlocks, 3);
console.log('Verified simultaneous move and aim, centered attack, analog movement, held build, and pointer cleanup.');
