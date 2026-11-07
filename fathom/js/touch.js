'use strict';

function bindTouchControls(stage, controls, actions, host = window) {
  if (!controls) return { setPlaying() {}, sync() {}, get active() { return false; } };
  let active = !!host.matchMedia?.('(pointer: coarse)').matches;
  let playing = false, mode = 'dig', aim = null;
  const held = new Map();

  function sync() {
    controls.hidden = !active || !playing;
    controls.classList.toggle('modal', actions.modal());
  }
  function release(id) {
    const key = held.get(id);
    if (!key) return;
    held.delete(id);
    if (![...held.values()].includes(key)) actions.hold(key, false);
  }
  function endAim(ev) {
    if (ev.pointerId !== aim) return;
    aim = null;
    actions.hold('dig', false);
  }
  function reset() {
    for (const id of [...held.keys()]) release(id);
    aim = null;
    actions.hold('dig', false);
  }
  stage.addEventListener('pointerdown', ev => {
    if (ev.pointerType !== 'touch' || !playing || actions.modal() || aim !== null) return;
    active = true;sync();
    ev.preventDefault();
    aim = ev.pointerId;
    stage.setPointerCapture?.(aim);
    actions.aim(ev);
    if (mode === 'dig') actions.hold('dig', true);
    else actions.run('place');
  });
  stage.addEventListener('pointermove', ev => {
    if (ev.pointerId === aim && !actions.modal()) actions.aim(ev);
  });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) stage.addEventListener(event, endAim);

  for (const button of controls.querySelectorAll('[data-touch-hold]')) {
    const key = button.dataset.touchHold;
    button.addEventListener('pointerdown', ev => {
      if (!playing || actions.modal()) return;
      ev.preventDefault();
      button.setPointerCapture?.(ev.pointerId);
      held.set(ev.pointerId, key);
      actions.hold(key, true);
    });
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(event, ev => release(ev.pointerId));
  }
  for (const button of controls.querySelectorAll('[data-touch-action]')) button.addEventListener('click', () => {
    if (!playing) return;
    const action = button.dataset.touchAction;
    if (action === 'mode') {
      mode = mode === 'dig' ? 'place' : 'dig';
      button.textContent = mode === 'dig' ? 'Dig / attack' : 'Place / use';
      button.setAttribute('aria-pressed', String(mode === 'place'));
      reset();
    } else {
      actions.run(action);
      if (actions.modal()) reset();
    }
    sync();
  });
  host.addEventListener('blur', reset);
  sync();
  return {
    setPlaying(on) { playing = on; if (!on) reset(); sync(); },
    sync,
    get active() { return active; }
  };
}
const EXPORTS_touch = { bindTouchControls };
if (typeof module !== 'undefined' && module.exports) module.exports = EXPORTS_touch;
else if (typeof FATHOM !== 'undefined') FATHOM.touch = EXPORTS_touch;
