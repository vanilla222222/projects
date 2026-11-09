'use strict';

function bindNightfallStick(element, knob, onChange, unlock){
  let owner = null;
  function setPosition(event){
    const rect = element.getBoundingClientRect();
    const radius = rect.width * 0.35;
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    const length = Math.hypot(x, y);
    const travel = Math.min(radius, length);
    const dx = length ? x / length : 0;
    const dy = length ? y / length : 0;
    const strength = Math.min(1, Math.max(0, (travel / radius - 0.18) / 0.82));
    knob.style.transform = 'translate(-50%, -50%) translate(' + dx * travel + 'px,' + dy * travel + 'px)';
    onChange(dx * strength, dy * strength, true);
  }
  function reset(){
    const pointer = owner;
    owner = null;
    knob.style.transform = 'translate(-50%, -50%)';
    onChange(0, 0, false);
    if (pointer !== null && element.hasPointerCapture(pointer)) element.releasePointerCapture(pointer);
  }
  element.addEventListener('pointerdown', event => {
    if (owner !== null || event.button !== 0) return;
    unlock();
    event.preventDefault();
    owner = event.pointerId;
    element.setPointerCapture(owner);
    setPosition(event);
  });
  element.addEventListener('pointermove', event => {
    if (event.pointerId !== owner) return;
    event.preventDefault();
    setPosition(event);
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    element.addEventListener(name, event => { if (event.pointerId === owner) reset(); });
  }
  return reset;
}

function bindNightfallHold(element, onChange, unlock){
  let owner = null;
  function reset(){
    const pointer = owner;
    owner = null;
    onChange(false);
    if (pointer !== null && element.hasPointerCapture(pointer)) element.releasePointerCapture(pointer);
  }
  element.addEventListener('pointerdown', event => {
    if (owner !== null || event.button !== 0) return;
    unlock();
    event.preventDefault();
    owner = event.pointerId;
    element.setPointerCapture(owner);
    onChange(true);
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    element.addEventListener(name, event => { if (event.pointerId === owner) reset(); });
  }
  return reset;
}
