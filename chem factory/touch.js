'use strict';

(() => {
  const controls = document.getElementById('factoryTouch');
  const mode = document.getElementById('factoryTouchMode');
  const buttons = [...controls.querySelectorAll('[data-move]')];
  const moving = new Map();
  let world = null;
  let mapPointer = null, suppressMapClick = false;

  function enableTouch(){
    document.documentElement.classList.add('factory-touch');
    controls.hidden = false;
  }

  if (matchMedia('(pointer: coarse)').matches) enableTouch();
  window.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch') enableTouch();
  }, { capture:true });

  // Route touch gestures through the same canvas handlers as desktop input.
  // A captured touch is the sole owner of its corresponding mouse gesture.
  function mouseEvent(type, event, options = {}){
    return new MouseEvent(type, {
      clientX:event.clientX, clientY:event.clientY, cancelable:true, ...options,
    });
  }

  const modes = {
    act:{ button:0 }, pan:{ button:1 }, remove:{ button:2 },
    wire:{ button:0, shiftKey:true }, copy:{ button:2, shiftKey:true },
    take:{ button:0, ctrlKey:true }, fill:{ button:2, ctrlKey:true },
  };

  cv.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'touch' || world || modalKind) return;
    event.preventDefault();
    const options = modes[mode.value];
    world = { id:event.pointerId, options };
    cv.setPointerCapture(event.pointerId);
    cv.dispatchEvent(mouseEvent('mousemove', event));
    cv.dispatchEvent(mouseEvent('mousedown', event, options));
  });
  cv.addEventListener('pointermove', event => {
    if (world?.id !== event.pointerId) return;
    event.preventDefault();
    cv.dispatchEvent(mouseEvent('mousemove', event));
  });
  function finishWorld(event){
    if (!world || (event && event.pointerId !== world.id)) return;
    const { id, options } = world;
    world = null;
    window.dispatchEvent(mouseEvent('mouseup', event || {}, options));
    if (cv.hasPointerCapture(id)) cv.releasePointerCapture(id);
    if (mode.value === 'remove') mode.value = 'act';
  }
  for (const event of ['pointerup','pointercancel','lostpointercapture']) cv.addEventListener(event, finishWorld);

  function releaseMove(id){
    const key = moving.get(id);
    if (!key) return;
    moving.delete(id);
    const owner = buttons.find(button => button.hasPointerCapture(id));
    if (owner) owner.releasePointerCapture(id);
    if (![...moving.values()].includes(key)) {
      keys[key] = false;
      for (const button of buttons) if (button.dataset.move === key) button.classList.remove('held');
    }
  }
  for (const button of buttons) {
    button.addEventListener('pointerdown', event => {
      if (event.button !== 0 || modalKind) return;
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      moving.set(event.pointerId, button.dataset.move);
      keys[button.dataset.move] = true;
      button.classList.add('held');
    });
    for (const event of ['pointerup','pointercancel','lostpointercapture']) {
      button.addEventListener(event, ev => releaseMove(ev.pointerId));
    }
  }

  function shortcut(key){
    cv.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles:true, cancelable:true }));
    cv.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles:true }));
  }

  controls.addEventListener('click', event => {
    const button = event.target.closest('[data-touch-key],[data-touch-zoom],[data-touch-center]');
    if (!button || modalKind) return;
    if (button.dataset.touchKey) shortcut(button.dataset.touchKey);
    else if (button.hasAttribute('data-touch-center')) camFree = false;
    else {
      const rect = cv.getBoundingClientRect();
      cv.dispatchEvent(new WheelEvent('wheel', {
        clientX:rect.left + rect.width / 2, clientY:rect.top + rect.height / 2,
        deltaY:Number(button.dataset.touchZoom), cancelable:true,
      }));
    }
  });

  // The full map uses its existing mouse drag math, including drag/click distinction.
  modal.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'touch' || event.target.id !== 'wmap' || mapPointer) return;
    event.preventDefault();
    const canvas = event.target;
    suppressMapClick = false;
    mapPointer = { id:event.pointerId, canvas };
    canvas.setPointerCapture(event.pointerId);
    canvas.dispatchEvent(mouseEvent('mousedown', event, { bubbles:true }));
  });
  window.addEventListener('pointermove', event => {
    if (mapPointer?.id === event.pointerId) window.dispatchEvent(mouseEvent('mousemove', event));
  });
  function finishMap(event){
    if (!mapPointer || (event && event.pointerId !== mapPointer.id)) return;
    const { id, canvas } = mapPointer;
    mapPointer = null;
    suppressMapClick = !!mDrag?.moved || event?.type === 'pointercancel';
    window.dispatchEvent(mouseEvent('mouseup', event || {}));
    if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
  }
  window.addEventListener('pointerup', finishMap);
  window.addEventListener('pointercancel', finishMap);
  modal.addEventListener('lostpointercapture', finishMap);

  modal.addEventListener('click', event => {
    if (event.target.id !== 'wmap' || !suppressMapClick) return;
    suppressMapClick = false;
    event.stopImmediatePropagation();
  }, { capture:true });

  function reset(){
    for (const id of [...moving.keys()]) releaseMove(id);
    finishWorld();
    finishMap();
  }
  window.addEventListener('blur', reset);
  window.addEventListener('orientationchange', reset);
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });
  new MutationObserver(() => { if (modalKind) { for (const id of [...moving.keys()]) releaseMove(id); finishWorld(); } })
    .observe(modal, { attributes:true, attributeFilter:['hidden'] });
})();
