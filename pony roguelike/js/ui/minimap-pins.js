'use strict';

const MINIMAP_PIN_ICONS = ['⭐', '💀', '❓', '❗'];

let _pinsCacheKey = null;
let _pinsCache = null;

function _getPinsCache(game){
  const key = minimapPinsStorageKey(game);
  if (_pinsCacheKey !== key) {
    _pinsCacheKey = key;
    _pinsCache = loadMinimapPins(game);
  }
  return _pinsCache;
}

function cycleMinimapPin(game, roomId){
  const pins = _getPinsCache(game);
  const cur = pins[roomId] || 0;
  const next = (cur + 1) % (MINIMAP_PIN_ICONS.length + 1);
  if (next === 0) delete pins[roomId]; else pins[roomId] = next;
  saveMinimapPins(game, pins);
}

function getMinimapPinIcon(game, roomId){
  const pins = _getPinsCache(game);
  const idx = pins[roomId];
  return idx ? MINIMAP_PIN_ICONS[idx - 1] : null;
}

function drawMinimapPin(ctx, x, y, icon, cellSize){
  ctx.font = 'bold ' + Math.floor(cellSize * 0.8) + 'px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,.95)';
  ctx.shadowColor = 'rgba(0,0,0,.8)';
  ctx.shadowBlur = 2;
  ctx.fillText(icon, x, y);
  ctx.shadowBlur = 0;
}
