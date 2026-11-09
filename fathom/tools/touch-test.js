'use strict';
const assert = require('node:assert/strict');
const { bindTouchControls } = require('../js/touch.js');
function element(dataset = {}) {
  const events = {};
  return { dataset, classList: { toggle() {} }, setAttribute() {},
    addEventListener(id, handler) { events[id] = handler; },
    emit(id, values = {}) { events[id]?.({ preventDefault() {}, ...values }); }
  };
}
const stage = element(), host = element(), left = element({ touchHold: 'left' }),
  jump = element({ touchHold: 'jump' }), mode = element({ touchAction: 'mode' }), bag = element({ touchAction: 'bag' }), hook = element({ touchAction: 'hook' });
host.matchMedia = () => ({ matches: true });
const controls = element();
controls.querySelectorAll = key => key === '[data-touch-hold]' ? [left, jump] : [mode, bag, hook];
const input = {};
let target = null, modal = false, places = 0, hooks = 0;
const binder = bindTouchControls(stage, controls, {
  modal: () => modal,
  hold: (key, value) => { input[key] = value; },
  aim: ev => { target = ev.clientX; },
  run: action => { if (action === 'place') places++; if (action === 'hook') hooks++; if (action === 'bag') modal = !modal; }
}, host);
assert.equal(controls.hidden, true);
binder.setPlaying(true);
assert.equal(controls.hidden, false);
left.emit('pointerdown', { pointerId: 1 });
jump.emit('pointerdown', { pointerId: 2 });
stage.emit('pointerdown', { pointerType: 'touch', pointerId: 3, clientX: 90 });
assert.deepEqual(input, { left: true, jump: true, dig: true });
assert.equal(target, 90);
stage.emit('pointermove', { pointerId: 3, clientX: 115 });
assert.equal(target, 115);
stage.emit('pointercancel', { pointerId: 3 });
assert.equal(input.dig, false);
assert.equal(input.left, true);
bag.emit('click');
assert.deepEqual(input, { left: false, jump: false, dig: false });
stage.emit('pointerdown', { pointerType: 'touch', pointerId: 4 });
assert.equal(input.dig, false);
bag.emit('click'); mode.emit('click');
stage.emit('pointerdown', { pointerType: 'touch', pointerId: 5 });
assert.equal(places, 1);
stage.emit('pointerup', { pointerId: 5 });
left.emit('pointerdown', { pointerId: 7 });
hook.emit('click');
assert.equal(input.left, true);
stage.emit('pointerdown', { pointerType: 'touch', pointerId: 8, clientX: 120 });
assert.equal(hooks, 1);
assert.equal(places, 1);
assert.equal(target, 120);
modal = true;
binder.sync();
assert.equal(input.left, false);
host.emit('blur');
binder.setPlaying(false);
assert.equal(controls.hidden, true);
console.log('Touch multitouch, cancellation, modal and placement checks passed');
