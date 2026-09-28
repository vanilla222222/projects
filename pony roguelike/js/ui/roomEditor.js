'use strict';

let TILE_PX = 16;
const CATEGORY_COLORS = { enemy:'#e35b6a', pickup:'#e3c15b', item:'#8b5cf6', deal:'#7a1f2e', shop:'#4fd1c5', obstacle:'#7a746a' };

let workingMask = [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
workingMask[0][0] = 1;

let spawnerMap = new Map();
let selectedCategory = 'enemy';
let selectedSubGroup = 'enemies';
let selectedStage = 'random';
let selectedEnemyPath = 'main';
const recentTools = { enemy:[], pickup:[], item:[], deal:[], shop:[], obstacle:[] };
let currentGrid = null, gridW = 0, gridH = 0;

const PICKUP_SUBGROUPS = [
  { id:'coins', label:'Coins' },
  { id:'hearts', label:'Hearts' },
  { id:'keysbombs', label:'Keys/Bombs' },
  { id:'pills', label:'Pills' },
  { id:'stars', label:'Stars' },
  { id:'chests', label:'Chests' },
];
const PICKUP_SUBGROUP_MATCH = {
  hearts: (id) => id.toLowerCase().includes('heart'),
  keysbombs: (id) => id.toLowerCase().includes('key') || id.toLowerCase().includes('bomb'),
};

function stageIdsFor(registry){
  const set = new Set();
  for (const k in registry) if (typeof registry[k].stage === 'number') set.add(registry[k].stage);
  return set;
}

function allStageIds(){
  const set = stageIdsFor(ENEMY_TYPES);
  for (const s of stageIdsFor(BOSS_TYPES)) set.add(s);
  return Array.from(set).sort((a, b) => a - b);
}

function floorKeysFor(registry, suffix){
  const set = new Set();
  for (const k in registry) {
    const fk = registry[k].floorKey;
    if (typeof fk === 'string' && fk.charAt(fk.length - 1) === suffix) set.add(fk);
  }
  return Array.from(set).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
}

const disabledDoorSlots = new Set();
let previewDoorSlots = [];
let floorState = new Array(MAX_FLOORS).fill(true);
let cFloorState = new Array(C_LAST_FLOORNUM + 1).fill(true);
let dFloorState = new Array(D_LAST_FLOORNUM + 1).fill(true);
let selectedFloorPath = 'main';
let hoverTile = null;

const canvas = document.getElementById('editorCanvas');
const ctx = canvas.getContext('2d');

function makeEmptyMask(){ return [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]]; }

function isMaskConnected(mask){
  const cells = [];
  for (let r = 0; r < mask.length; r++) for (let c = 0; c < mask[r].length; c++) if (mask[r][c]) cells.push(r + ',' + c);
  if (cells.length <= 1) return true;
  const set = new Set(cells);
  const visited = new Set([cells[0]]);
  const stack = [cells[0]];
  while (stack.length) {
    const [rs, cs] = stack.pop().split(',').map(Number);
    for (const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const k = (rs + dr) + ',' + (cs + dc);
      if (set.has(k) && !visited.has(k)) { visited.add(k); stack.push(k); }
    }
  }
  return visited.size === cells.length;
}

function trimMaskWithOffset(mask){
  let minR = 99, maxR = -1, minC = 99, maxC = -1;
  for (let r = 0; r < mask.length; r++) {
    for (let c = 0; c < mask[r].length; c++) {
      if (mask[r][c]) { minR = Math.min(minR, r); maxR = Math.max(maxR, r); minC = Math.min(minC, c); maxC = Math.max(maxC, c); }
    }
  }
  if (maxR < 0) return null;
  const out = [];
  for (let r = minR; r <= maxR; r++) {
    const row = [];
    for (let c = minC; c <= maxC; c++) row.push(mask[r][c] ? 1 : 0);
    out.push(row);
  }
  return { mask: out, offR: minR, offC: minC };
}

const MAX_UNDO = 80;
let undoStack = [];
let redoStack = [];

function snapshotState(){
  return {
    mask: workingMask.map((r) => r.slice()),
    spawners: Array.from(spawnerMap.entries()).map(([k, v]) => [k, { ...v }]),
    disabledDoorSlots: Array.from(disabledDoorSlots),
    floorState: floorState.slice(),
    cFloorState: cFloorState.slice(),
    dFloorState: dFloorState.slice(),
    selectedFloorPath: selectedFloorPath,
    roomType: document.getElementById('roomType').value,
  };
}

function restoreState(snap){
  workingMask = snap.mask.map((r) => r.slice());
  spawnerMap = new Map(snap.spawners.map(([k, v]) => [k, { ...v }]));
  disabledDoorSlots.clear();
  snap.disabledDoorSlots.forEach((d) => disabledDoorSlots.add(d));
  floorState = snap.floorState.slice();
  cFloorState = snap.cFloorState.slice();
  dFloorState = snap.dFloorState.slice();
  selectedFloorPath = snap.selectedFloorPath;
  document.getElementById('roomType').value = snap.roomType;
  renderBlockGrid();
  renderFloorPathButtons();
  renderFloorButtons();
  rebuildGrid();
  updateStatsAndWarnings();
}

function pushUndo(){
  undoStack.push(snapshotState());
  if (undoStack.length > MAX_UNDO) undoStack.shift();
  redoStack.length = 0;
  updateUndoRedoButtons();
}

function undo(){
  if (!undoStack.length) return;
  redoStack.push(snapshotState());
  restoreState(undoStack.pop());
  updateUndoRedoButtons();
}

function redo(){
  if (!redoStack.length) return;
  undoStack.push(snapshotState());
  restoreState(redoStack.pop());
  updateUndoRedoButtons();
}

function updateUndoRedoButtons(){
  document.getElementById('undoBtn').disabled = undoStack.length === 0;
  document.getElementById('redoBtn').disabled = redoStack.length === 0;
}
document.getElementById('undoBtn').addEventListener('click', undo);
document.getElementById('redoBtn').addEventListener('click', redo);

window.addEventListener('keydown', (e) => {
  const tag = document.activeElement && document.activeElement.tagName;
  if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT') return;
  if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); return; }
  if (e.ctrlKey && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) { e.preventDefault(); redo(); return; }
  const catKeys = { '1':'enemy', '2':'pickup', '3':'item', '4':'deal', '5':'shop', '6':'obstacle', '7':'erase' };
  if (catKeys[e.key]) {
    selectedCategory = catKeys[e.key];
    categoryBtns.forEach((b) => b.classList.toggle('active', b.dataset.cat === selectedCategory));
    resetSubGroupDefaults();
    renderSubTabs();
    populateSpecificSelect();
  }
  if (e.key === 'Tab') {
    const rows = [document.getElementById('subGroupBtns'), document.getElementById('subStageBtns')];
    const visibleRows = rows.filter((r) => r.style.display !== 'none' && r.children.length > 0);
    if (visibleRows.length === 0) return;
    let row = visibleRows[0];
    for (const r of visibleRows) if (Array.from(r.children).some((b) => b.classList.contains('active'))) { row = r; break; }
    const btns = Array.from(row.children);
    let idx = btns.findIndex((b) => b.classList.contains('active'));
    if (idx === -1) idx = 0;
    const dir = e.shiftKey ? -1 : 1;
    const next = btns[(idx + dir + btns.length) % btns.length];
    e.preventDefault();
    next.click();
  }
});

function renderBlockGrid(){
  const el = document.getElementById('blockGrid');
  el.innerHTML = '';
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const cell = document.createElement('div');
      cell.className = 'blockcell' + (workingMask[r][c] ? ' on' : '');
      cell.addEventListener('click', () => {
        pushUndo();
        workingMask[r][c] = workingMask[r][c] ? 0 : 1;
        renderBlockGrid();
        rebuildGrid();
      });
      el.appendChild(cell);
    }
  }
  const count = workingMask.flat().reduce((a, b) => a + b, 0);
  const countEl = document.getElementById('blockCount');
  let msg = count + ' block' + (count === 1 ? '' : 's');
  let warn = count < 1 || count > 4;
  if (count < 1) msg += ' — need at least 1';
  if (count > 4) msg += ' — recommended max is 4';
  if (count > 1 && !isMaskConnected(workingMask)) { msg += ' — not all connected!'; warn = true; }
  countEl.textContent = msg;
  countEl.className = warn ? 'warn' : 'ok';
}

function rebuildGrid(){
  const count = workingMask.flat().reduce((a, b) => a + b, 0);
  if (count < 1) {
    currentGrid = null; gridW = 0; gridH = 0;
    canvas.width = 260; canvas.height = 70;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#e3c15b'; ctx.font = '13px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Toggle at least one block above', 130, 38);
    document.getElementById('canvasInfo').textContent = '';
    return;
  }
  previewDoorSlots = buildPreviewDoorSlots(workingMask, disabledDoorsField(0, 0, workingMask));
  const fakeNode = { shape: { mask: workingMask }, doorSlots: previewDoorSlots };
  const built = buildRoomTiles(fakeNode);
  currentGrid = built.grid; gridW = built.tileW; gridH = built.tileH;
  renderCanvas();
  updateStatsAndWarnings();
}

function disabledDoorsField(offC, offR, mask){
  offC = offC || 0; offR = offR || 0;
  const groups = new Map();
  for (const key of disabledDoorSlots) {
    const parts = key.split(',');
    const c = Number(parts[0]) - offC, r = Number(parts[1]) - offR, dir = parts[2];
    if (mask && (!mask[r] || !mask[r][c])) continue;
    const gk = c + ',' + r;
    if (!groups.has(gk)) groups.set(gk, new Set());
    groups.get(gk).add(dir);
  }
  const out = [];
  for (const [gk, dirs] of groups) {
    const [c, r] = gk.split(',').map(Number);
    out.push([c, r, Array.from(dirs).join('')]);
  }
  return out;
}

function buildPreviewDoorSlots(mask, doorField){
  const template = { d: doorField || [] };
  const slots = computeDoorSlots(mask, 0, 0, template, null);
  for (const s of slots) if (!s.disabled) s.type = 'normal';
  return slots;
}

function doorMarkerCenter(slot){
  const cells = doorSlotCells(slot);
  const tx = (cells[0].x + cells[1].x + 1) / 2;
  const ty = (cells[0].y + cells[1].y + 1) / 2;
  return { x: tx * TILE_PX, y: ty * TILE_PX };
}

function findDoorSlotAtEvent(e){
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
  const my = (e.clientY - rect.top) * (canvas.height / rect.height);
  const hitR = Math.max(6, TILE_PX * 0.4);
  for (const slot of previewDoorSlots) {
    const { x, y } = doorMarkerCenter(slot);
    if (Util.dist(mx, my, x, y) <= hitR) return slot;
  }
  return null;
}

function toggleDoorSlot(slot){
  const key = slot.localCol + ',' + slot.localRow + ',' + slot.dir;
  if (disabledDoorSlots.has(key)) disabledDoorSlots.delete(key); else disabledDoorSlots.add(key);
  rebuildGrid();
}

const OBSTACLE_GLYPHS = {
  rock:'R', hardrock:'H', pit:'P', tallrock:'r', tallhardrock:'h', cactus:'C', yellowfire:'Y', redfire:'F', bluefire:'f', purplefire:'p', spike:'S',
  greenfire:'G', whitefire:'W', blackfire:'K',
  spiketrap:'s', spikedrock:'k', tintedrock:'t', movingspike:'M', sandtrap:'D', mud:'U', thornbush:'b', luckcrystal:'l',
  turretn:'^', turrete:'>', turrets:'v', turretw:'<', turretplus:'+', turretx:'X', turrettarget:'@',
  bombbarrel:'B', pushablebombbarrel:'b',
  currentn:'↑', currents:'↓', currente:'→', currentw:'←',
  floorswitch:'?',
  iceslidan:'⇧', iceslidas:'⇩', iceslidae:'⇨', iceslidaw:'⇦',
  quicksand:'D', dustvent:'V',
  tidesurgee:'⇒', tidesurgew:'⇐', tidepool:'D',
  riptiden:'⇑', riptides:'⇓', riptidee:'⇛', riptidew:'⇚',
  glowbloom:'g', pressurecolumn:'c',
  crushvent:'⊗', lurehorn:'L', phantomwall:'w',
  warpstreamn:'⇈', warpstreams:'⇊', warpstreame:'⇉', warpstreamw:'⇇',
  glimmerrock:'i', frostvent:'D', thornspire:'T',
  driftstone:'⇗', cinderkeg:'e', stunspore:'D',
  turretspinner:'*', glasscolumn:'c', sparkbush:'b', magmapod:'y',
};
const PICKUP_TYPE_BY_ID = {};
for (const p of PICKUP_TYPE_LIST) PICKUP_TYPE_BY_ID[p.id] = p;
function spawnerGlyph(sp){
  if (sp.category === 'obstacle') return OBSTACLE_GLYPHS[sp.specific] || '?';
  if (sp.kind === 'genericBoss') return 'B';
  if (sp.kind === 'genericSuperboss') return 'S';
  if (sp.kind === 'generic') return '?';
  return sp.category[0].toUpperCase();
}

function renderCanvas(){
  if (!currentGrid) return;
  canvas.width = gridW * TILE_PX;
  canvas.height = gridH * TILE_PX;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      const t = currentGrid[y][x];
      const px = x * TILE_PX, py = y * TILE_PX;
      if (t === T_VOID) { ctx.fillStyle = '#000'; ctx.fillRect(px, py, TILE_PX, TILE_PX); continue; }
      if (t === T_WALL || t === T_SECRET) { ctx.fillStyle = '#242138'; ctx.fillRect(px, py, TILE_PX, TILE_PX); continue; }
      if (t === T_DOOR) {
        ctx.fillStyle = '#463a5e'; ctx.fillRect(px, py, TILE_PX, TILE_PX);
        ctx.strokeStyle = '#e3c15b'; ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, TILE_PX - 1, TILE_PX - 1);
        continue;
      }
      ctx.fillStyle = ((x + y) % 2 === 0) ? '#1c1a2b' : '#201e31';
      ctx.fillRect(px, py, TILE_PX, TILE_PX);
    }
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  for (let x = 0; x <= gridW; x++) { ctx.beginPath(); ctx.moveTo(x * TILE_PX, 0); ctx.lineTo(x * TILE_PX, canvas.height); ctx.stroke(); }
  for (let y = 0; y <= gridH; y++) { ctx.beginPath(); ctx.moveTo(0, y * TILE_PX); ctx.lineTo(canvas.width, y * TILE_PX); ctx.stroke(); }

  const doorR = Math.max(4, TILE_PX * 0.32);
  for (const slot of previewDoorSlots) {
    const { x: mx, y: my } = doorMarkerCenter(slot);
    ctx.beginPath();
    ctx.arc(mx, my, doorR, 0, Math.PI * 2);
    ctx.fillStyle = slot.disabled ? '#5a2436' : '#2f7a52';
    ctx.fill();
    ctx.strokeStyle = slot.disabled ? '#ff5a5a' : '#8effc1';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  const glyphSize = Math.max(8, Math.floor(TILE_PX * 0.6));
  for (const sp of spawnerMap.values()) {
    const px = sp.x * TILE_PX, py = sp.y * TILE_PX;
    const pv = sp.kind === 'forced' ? toolPreviewDef({ category: sp.category, kind: 'forced', specific: sp.specific }) : null;
    if (pv) {
      drawPreviewAt(ctx, px + TILE_PX / 2, py + TILE_PX / 2, pv);
      continue;
    }
    ctx.fillStyle = CATEGORY_COLORS[sp.category] || '#fff';
    ctx.fillRect(px + 1, py + 1, TILE_PX - 2, TILE_PX - 2);
    ctx.fillStyle = '#000';
    ctx.font = glyphSize + 'px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(spawnerGlyph(sp), px + TILE_PX / 2, py + TILE_PX / 2 + 1);
  }

  if (hoverTile && !isPainting) {
    const { x, y } = hoverTile;
    if (y >= 0 && y < gridH && x >= 0 && x < gridW && currentGrid[y][x] === T_FLOOR) {
      const px = x * TILE_PX, py = y * TILE_PX;
      const tool = currentTool();
      ctx.globalAlpha = 0.6;
      if (tool.erase) {
        ctx.strokeStyle = '#ff5a5a'; ctx.lineWidth = 2;
        ctx.strokeRect(px + 2, py + 2, TILE_PX - 4, TILE_PX - 4);
      } else {
        const pv = toolPreviewDef(tool);
        if (pv) {
          drawPreviewAt(ctx, px + TILE_PX / 2, py + TILE_PX / 2, pv);
        } else {
          ctx.fillStyle = CATEGORY_COLORS[tool.category] || '#fff';
          ctx.fillRect(px + 1, py + 1, TILE_PX - 2, TILE_PX - 2);
        }
      }
      ctx.globalAlpha = 1;
    }
  }
}

function canvasToTile(e){
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
  const my = (e.clientY - rect.top) * (canvas.height / rect.height);
  return { x: Math.floor(mx / TILE_PX), y: Math.floor(my / TILE_PX) };
}

function currentTool(){
  if (selectedCategory === 'erase') return { erase: true };
  const sel = document.getElementById('specificSelect');
  const val = sel.value;
  if (selectedCategory === 'obstacle') return { category: 'obstacle', kind: 'forced', specific: val };
  if (val === 'generic') return { category: selectedCategory, kind: 'generic' };
  if (val === 'generic-boss') return { category: 'enemy', kind: 'genericBoss' };
  if (val === 'generic-superboss') return { category: 'enemy', kind: 'genericSuperboss' };
  return { category: selectedCategory, kind: 'forced', specific: val };
}

function toolPreviewDef(tool){
  if (!tool || tool.erase || tool.kind !== 'forced') return null;
  const specific = tool.specific;
  if (tool.category === 'enemy') {
    const def = ENEMY_TYPES[specific] || BOSS_TYPES[specific] || SUPERBOSSES[specific];
    return def ? { renderKind: 'enemy', def } : null;
  }
  if (tool.category === 'pickup') {
    if (specific.indexOf('chest:') === 0) return { renderKind: 'chest', chestKind: specific.split(':')[1] };
    return { renderKind: 'pickup', pickupKind: specific };
  }
  if (tool.category === 'item' || tool.category === 'shop' || tool.category === 'deal') {
    if (ITEMS[specific]) return { renderKind: 'item', def: ITEMS[specific] };

    if (tool.category === 'shop' && TRINKETS[specific]) return { renderKind: 'item', def: TRINKETS[specific] };
    if (tool.category === 'shop' && FAMILIAR_TYPES[specific]) return { renderKind: 'item', def: FAMILIAR_TYPES[specific] };
    return { renderKind: 'pickup', pickupKind: specific };
  }
  if (tool.category === 'obstacle') {
    const def = OBSTACLES[specific];
    return def ? { renderKind: 'obstacle', kind: specific, def } : null;
  }
  return null;
}

function fakePickupFor(kindStr){
  if (kindStr.indexOf('coin:') === 0) {
    const tier = kindStr.split(':')[1];
    return { kind: 'coin', coin: COIN_TYPES.find((c) => c.id === tier) || COIN_TYPES[0], x: 0, y: 0 };
  }
  if (kindStr === 'pill') return { kind: 'pill', pillColor: PILL_COLORS[0].id, x: 0, y: 0 };
  if (kindStr === 'star') return { kind: 'star', starId: STAR_LIST[0].id, x: 0, y: 0 };
  return { kind: kindStr, x: 0, y: 0 };
}

function drawPreviewAt(ctx, x, y, pv, sizeHint){
  const s = sizeHint || TILE_PX;
  if (pv.renderKind === 'enemy') {
    const d = pv.def;
    const r = Util.clamp(d.radius, s * 0.3, s * 0.62);
    Util.drawBrownHumanoid(ctx, { x, y, radius: r, color: d.color, dark: d.dark, behavior: d.behavior, maxHp: 0 }, false);
  } else if (pv.renderKind === 'pickup') {
    const p = fakePickupFor(pv.pickupKind); p.x = x; p.y = y;
    Util.drawPickupIcon(ctx, p, 0);
  } else if (pv.renderKind === 'chest') {
    Util.drawChestIcon(ctx, { x, y, opened: false, def: CHEST_TYPES[pv.chestKind] || CHEST_TYPES.grey });
  } else if (pv.renderKind === 'item') {
    Util.drawItemIcon(ctx, x, y, pv.def);
  } else if (pv.renderKind === 'obstacle') {
    const r = Util.clamp(Util.obstacleRadius(pv.kind), s * 0.3, s * 0.62);
    const ob = { x, y, kind: pv.kind, tall: !!pv.def.tall, radius: r, hitFlash: 0, hp: pv.def.maxHp || 0, def: pv.def };
    Util.drawObstacle(ctx, ob, performance.now());
  }
}

const toolPreviewCanvas = document.getElementById('toolPreviewCanvas');
const toolPreviewCtx = toolPreviewCanvas.getContext('2d');
const toolPreviewRow = document.getElementById('toolPreviewRow');
const toolPreviewNameEl = document.getElementById('toolPreviewName');
const toolPreviewDescEl = document.getElementById('toolPreviewDesc');

function previewDescFor(pv){
  if (pv.renderKind === 'enemy') {
    const d = pv.def;
    return 'HP ' + d.hp + ' · DMG ' + d.dmg + ' · SPD ' + d.speed + (d.behavior ? ' · ' + d.behavior : '');
  }
  if (pv.renderKind === 'item') return pv.def.desc || '';
  return '';
}

function updateToolPreviewCard(){
  const pv = toolPreviewDef(currentTool());
  toolPreviewCtx.clearRect(0, 0, toolPreviewCanvas.width, toolPreviewCanvas.height);
  if (!pv) { toolPreviewRow.style.display = 'none'; return; }
  toolPreviewRow.style.display = '';
  drawPreviewAt(toolPreviewCtx, toolPreviewCanvas.width / 2, toolPreviewCanvas.height / 2, pv, 40);
  const sel = document.getElementById('specificSelect');
  const opt = sel.options[sel.selectedIndex];
  toolPreviewNameEl.textContent = opt ? opt.textContent : '';
  toolPreviewDescEl.textContent = previewDescFor(pv);
}
document.getElementById('specificSelect').addEventListener('change', updateToolPreviewCard);

let isPainting = false;
let paintErasing = false;
let paintGestureStarted = false;
let lastPaintedKey = null;

function paintAt(x, y, erasing){
  if (!currentGrid) return;
  if (y < 0 || y >= gridH || x < 0 || x >= gridW) return;
  if (currentGrid[y][x] !== T_FLOOR) {
    const info = document.getElementById('canvasInfo');
    if (!erasing) info.textContent = `(${x},${y}) is not open floor — pick a lit tile.`;
    return;
  }
  const key = x + ',' + y;
  if (key === lastPaintedKey) return;
  lastPaintedKey = key;
  if (!paintGestureStarted) { pushUndo(); paintGestureStarted = true; }

  const info = document.getElementById('canvasInfo');
  if (erasing) {
    spawnerMap.delete(key);
    info.textContent = `Erased (${x},${y}).`;
  } else {
    const tool = currentTool();
    if (tool.erase) {
      spawnerMap.delete(key);
      info.textContent = `Erased (${x},${y}).`;
    } else {
      const sp = { x, y, category: tool.category, kind: tool.kind };
      if (tool.specific) sp.specific = tool.specific;
      spawnerMap.set(key, sp);
      const label = tool.specific ? ':' + tool.specific : (tool.kind === 'genericBoss' ? ' (random boss)' : (tool.kind === 'genericSuperboss' ? ' (random superboss)' : ' (generic)'));
      info.textContent = `Placed ${tool.category}${label} at (${x},${y}).`;
      recordRecentTool(tool);
    }
  }
  renderCanvas();
  updateStatsAndWarnings();
}

canvas.addEventListener('mousedown', (e) => {
  if (!currentGrid) return;
  e.preventDefault();
  const doorSlot = findDoorSlotAtEvent(e);
  if (doorSlot) { pushUndo(); toggleDoorSlot(doorSlot); return; }
  isPainting = true;
  paintErasing = e.button === 2;
  paintGestureStarted = false;
  lastPaintedKey = null;
  const { x, y } = canvasToTile(e);
  paintAt(x, y, paintErasing);
});
window.addEventListener('mouseup', () => {
  isPainting = false;
  paintGestureStarted = false;
  lastPaintedKey = null;
  renderCanvas();
});
canvas.addEventListener('mousemove', (e) => {
  const { x, y } = canvasToTile(e);
  hoverTile = { x, y };
  if (isPainting) paintAt(x, y, paintErasing);
  else renderCanvas();
});
canvas.addEventListener('mouseleave', () => { hoverTile = null; renderCanvas(); });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

function restrictionFlags(){
  return {
    main: floorState.some((v) => !v),
    c: cFloorState.some((v, i) => i >= 2 && i <= C_LAST_FLOORNUM && !v),
    d: dFloorState.some((v, i) => i >= 3 && i <= D_LAST_FLOORNUM && !v)
  };
}

function exportedPathRestriction(){
  const f = restrictionFlags();
  if (f.main) return null;
  if (f.c) return 'C';
  if (f.d) return 'D';
  return null;
}

function pathMismatchWarning(){
  const restriction = exportedPathRestriction();
  if (!restriction) return '';
  const offenders = [];
  for (const sp of spawnerMap.values()) {
    if (sp.category !== 'enemy' || sp.kind !== 'forced' || !sp.specific) continue;
    const id = resolveEnemyTypeId(sp.specific);
    const def = ENEMY_TYPES[id] || BOSS_TYPES[id] || SUPERBOSSES[id];
    if (!def || typeof def.floorKey !== 'string') continue;
    const suffix = def.floorKey.charAt(def.floorKey.length - 1);
    if (suffix !== 'C' && suffix !== 'D') continue;
    if (suffix === restriction) continue;
    offenders.push((def.name || id) + ' (' + suffix + '-path)');
  }
  if (!offenders.length) return '';
  const uniq = Array.from(new Set(offenders));
  return uniq.join(', ') + (uniq.length > 1 ? ' are enemies from another path' : ' is an enemy from another path') + ', but this room is restricted to the ' + restriction + '-path — they will never spawn here.';
}

function updateStatsAndWarnings(){
  const counts = { enemy:0, pickup:0, item:0, deal:0, shop:0, obstacle:0 };
  for (const sp of spawnerMap.values()) if (counts[sp.category] !== undefined) counts[sp.category]++;
  document.getElementById('statsReadout').textContent =
    `${counts.enemy} enemy · ${counts.pickup} pickup · ${counts.item} item · ${counts.deal} deal · ${counts.shop} shop · ${counts.obstacle} obstacle`;

  const roomType = document.getElementById('roomType').value;
  const warnEl = document.getElementById('roomWarning');
  const hasBossSpawner = Array.from(spawnerMap.values()).some((sp) => {
    if (sp.category !== 'enemy') return false;
    if (sp.kind === 'genericBoss' || sp.kind === 'genericSuperboss') return true;
    if (sp.kind === 'forced' && sp.specific) {
      const id = resolveEnemyTypeId(sp.specific);
      return !!(BOSS_TYPES[id] || SUPERBOSSES[id]);
    }
    return false;
  });
  warnEl.className = 'warn';
  if ((roomType === 'normal' || roomType === 'boss') && counts.enemy === 0) {
    warnEl.textContent = 'No enemy spawner placed — the game will auto-unlock this room\'s doors with nothing to fight.';
  } else if (roomType === 'boss' && !hasBossSpawner) {
    warnEl.textContent = 'No boss spawner ("Random Boss", or a forced specific boss) placed — a random boss will be forced in as a fallback.';
  } else if (roomType === 'petshop') {
    warnEl.textContent = 'A free familiar pedestal is always added automatically — anything placed here is extra decoration.';
    warnEl.className = 'ok';
  } else if (roomType === 'curse') {
    warnEl.textContent = 'Nothing is added automatically — design this room\'s contents entirely by hand. Doors already cost half a heart to cross, both ways, regardless of what\'s placed here.';
    warnEl.className = 'ok';
  } else if (roomType === 'sacrifice') {
    warnEl.textContent = 'A Spike fixture is always added automatically at the room\'s center if you don\'t place one yourself.';
    warnEl.className = 'ok';
  } else if (roomType === 'vault') {
    warnEl.textContent = 'Nothing is added automatically — design this room\'s contents entirely by hand. Key-locked like treasure/shop.';
    warnEl.className = 'ok';
  } else if (roomType === 'challenge') {
    warnEl.textContent = 'A free item pedestal is always added automatically at the room\'s center. Taking it locks the room for 5 waves of 3-5 enemies each — keep the layout open, since waves spawn from the center.';
    warnEl.className = 'ok';
  } else if (roomType === 'crystal') {
    warnEl.textContent = 'Nothing is added automatically — design this room\'s contents entirely by hand. Item spawners here draw from the \'crystal\' pool.';
    warnEl.className = 'ok';
  } else if (roomType === 'sombra') {
    warnEl.textContent = 'Nothing is added automatically — design this room\'s contents entirely by hand. Use the "Deal" category for a heart-cost item pedestal (the \'sombra\' pool); item spawners here also draw from \'sombra\'.';
    warnEl.className = 'ok';
  } else if (roomType === 'shrine') {
    warnEl.textContent = 'A shrine pedestal (coin-cost, not heart-cost) is always added automatically if none is placed — anything placed here is extra decoration.';
    warnEl.className = 'ok';
  } else if (roomType === 'arcade') {
    warnEl.textContent = '2-4 random filly/machine fixtures are always auto-placed, scattered around the room — anything placed here is extra decoration. Doors are coin-toll gated (1c), not key-locked.';
    warnEl.className = 'ok';
  } else {
    warnEl.textContent = '';
  }
  const pathWarn = pathMismatchWarning();
  if (pathWarn) {
    warnEl.textContent = warnEl.textContent ? pathWarn + ' · ' + warnEl.textContent : pathWarn;
    warnEl.className = 'warn';
  }
}
document.getElementById('roomType').addEventListener('change', updateStatsAndWarnings);

function resetSubGroupDefaults(){
  if (selectedCategory === 'enemy') { selectedSubGroup = 'enemies'; selectedStage = 'random'; }
  else if (selectedCategory === 'pickup') { selectedSubGroup = 'coins'; selectedStage = 'random'; }
  else { selectedSubGroup = null; selectedStage = 'random'; }
}

function renderEnemyPathButtons(){
  const el = document.getElementById('enemyPathBtns');
  if (!el) return;
  el.innerHTML = '';
  if (selectedCategory !== 'enemy') { el.style.display = 'none'; return; }
  el.style.display = '';
  const paths = [['main', 'Main'], ['C', 'C-Path'], ['D', 'D-Path']];
  for (const [id, label] of paths) {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.className = selectedEnemyPath === id ? 'active' : '';
    btn.addEventListener('click', () => {
      selectedEnemyPath = id;
      selectedStage = 'random';
      renderEnemyPathButtons();
      renderSubTabs();
      populateSpecificSelect();
    });
    el.appendChild(btn);
  }
}

function renderSubTabs(){
  const groupRow = document.getElementById('subGroupBtns');
  const stageRow = document.getElementById('subStageBtns');
  groupRow.innerHTML = '';
  stageRow.innerHTML = '';
  renderEnemyPathButtons();

  if (selectedCategory === 'enemy') {
    groupRow.style.display = '';
    const groups = [ { id:'enemies', label:'Enemies' }, { id:'bosses', label:'Bosses' } ];
    for (const g of groups) {
      const b = document.createElement('button');
      b.textContent = g.label;
      b.classList.toggle('active', selectedSubGroup === g.id);
      b.addEventListener('click', () => {
        selectedSubGroup = g.id;
        selectedStage = 'random';
        renderSubTabs();
        populateSpecificSelect();
      });
      groupRow.appendChild(b);
    }
    stageRow.style.display = '';
    let stageOpts;
    if (selectedEnemyPath === 'main') {
      stageOpts = [{ id:'random', label:'Random' }].concat(allStageIds().map((s) => ({ id:s, label:'Stage ' + s })));
    } else {
      const pathRegistry = selectedSubGroup === 'bosses' ? BOSS_TYPES : ENEMY_TYPES;
      stageOpts = [{ id:'random', label:'Random' }].concat(floorKeysFor(pathRegistry, selectedEnemyPath).map((k) => ({ id:k, label:'Stage ' + k })));
    }
    for (const s of stageOpts) {
      const b = document.createElement('button');
      b.textContent = s.label;
      b.classList.toggle('active', selectedStage === s.id);
      b.addEventListener('click', () => {
        selectedStage = s.id;
        renderSubTabs();
        populateSpecificSelect();
      });
      stageRow.appendChild(b);
    }
  } else if (selectedCategory === 'pickup') {
    groupRow.style.display = '';
    stageRow.style.display = 'none';
    const groups = PICKUP_SUBGROUPS.concat([{ id:'other', label:'Other' }]);
    for (const g of groups) {
      const b = document.createElement('button');
      b.textContent = g.label;
      b.classList.toggle('active', selectedSubGroup === g.id);
      b.addEventListener('click', () => {
        selectedSubGroup = g.id;
        renderSubTabs();
        populateSpecificSelect();
      });
      groupRow.appendChild(b);
    }
  } else {
    groupRow.style.display = 'none';
    stageRow.style.display = 'none';
  }
}

function recordRecentTool(tool){
  const list = recentTools[tool.category];
  if (!list) return;
  const sel = document.getElementById('specificSelect');
  const opt = sel.options[sel.selectedIndex];
  const value = tool.specific || (tool.kind === 'genericBoss' ? 'generic-boss' : (tool.kind === 'genericSuperboss' ? 'generic-superboss' : 'generic'));
  const label = opt ? opt.textContent : value;
  const entry = { category: tool.category, subGroup: selectedSubGroup, stage: selectedStage, enemyPath: selectedEnemyPath, value, label };
  const dedupe = list.filter((e) => e.value !== value || e.subGroup !== entry.subGroup);
  dedupe.unshift(entry);
  recentTools[tool.category] = dedupe.slice(0, 5);
  renderRecentTools();
}

function renderRecentTools(){
  const row = document.getElementById('recentToolBtns');
  const list = recentTools[selectedCategory] || [];
  row.innerHTML = '';
  if (list.length === 0) { row.style.display = 'none'; return; }
  row.style.display = '';
  for (const entry of list) {
    const btn = document.createElement('button');
    btn.textContent = entry.label;
    btn.title = 'Recently used';
    btn.addEventListener('click', () => {
      selectedCategory = entry.category;
      selectedSubGroup = entry.subGroup;
      selectedStage = entry.stage;
      selectedEnemyPath = entry.enemyPath || 'main';
      categoryBtns.forEach((b) => b.classList.toggle('active', b.dataset.cat === selectedCategory));
      renderEnemyPathButtons();
      renderSubTabs();
      populateSpecificSelect();
      const sel = document.getElementById('specificSelect');
      sel.value = entry.value;
      updateToolPreviewCard();
    });
    row.appendChild(btn);
  }
}

let lastOpts = [];

function renderFilteredOptions(){
  const sel = document.getElementById('specificSelect');
  const filterEl = document.getElementById('paletteFilter');
  const q = (filterEl.value || '').trim().toLowerCase();
  const prevVal = sel.value;
  sel.innerHTML = '';
  const filtered = q ? lastOpts.filter((o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)) : lastOpts;
  for (const o of filtered) {
    const opt = document.createElement('option');
    opt.value = o.value; opt.textContent = o.label; opt.title = o.label;
    sel.appendChild(opt);
  }
  if (filtered.some((o) => o.value === prevVal)) sel.value = prevVal;
  updateToolPreviewCard();
}
document.getElementById('paletteFilter').addEventListener('input', renderFilteredOptions);

function populateSpecificSelect(){
  const sel = document.getElementById('specificSelect');
  const label = document.getElementById('specificLabel');
  const filterEl = document.getElementById('paletteFilter');
  sel.innerHTML = '';
  filterEl.value = '';
  renderRecentTools();
  if (selectedCategory === 'erase') {
    sel.style.display = 'none'; label.style.display = 'none';
    filterEl.style.display = 'none';
    document.getElementById('toolHint').textContent = 'Click/drag over a placed spawner to remove it (or right-click-drag with any tool).';
    updateToolPreviewCard();
    return;
  }
  sel.style.display = ''; label.style.display = '';
  filterEl.style.display = '';
  document.getElementById('toolHint').textContent = 'Click-drag to paint tiles. Right-click-drag always erases. Ctrl+Z/Ctrl+Y undo/redo.';

  const opts = [];
  if (selectedCategory !== 'obstacle' && selectedCategory !== 'enemy' && selectedCategory !== 'pickup') opts.push({ value:'generic', label:'Random (generic)' });
  if (selectedCategory === 'enemy' && selectedEnemyPath !== 'main') {
    const suffix = selectedEnemyPath;
    const matches = (def) => {
      const fk = def.floorKey;
      if (typeof fk !== 'string') return false;
      if (selectedStage === 'random') return fk.charAt(fk.length - 1) === suffix;
      return fk === selectedStage;
    };
    const scopeLabel = selectedStage === 'random' ? (suffix + '-path') : ('floor ' + selectedStage);
    if (selectedSubGroup === 'bosses') {
      opts.push({ value:'generic-boss', label:'Random Boss (' + scopeLabel + ')' });
      if (selectedStage === 'random') opts.push({ value:'generic-superboss', label:'Random Superboss' });
      for (const k in BOSS_TYPES) if (matches(BOSS_TYPES[k])) opts.push({ value:k, label: BOSS_TYPES[k].name + ' (boss ' + BOSS_TYPES[k].floorKey + ')' });
    } else {
      opts.push({ value:'generic', label:'Random (' + scopeLabel + ')' });
      for (const k in ENEMY_TYPES) if (matches(ENEMY_TYPES[k])) opts.push({ value:k, label: ENEMY_TYPES[k].name + ' (' + ENEMY_TYPES[k].floorKey + ')' });
    }
  } else if (selectedCategory === 'enemy') {
    if (selectedSubGroup === 'bosses') {
      if (selectedStage === 'random') {
        opts.push({ value:'generic-boss', label:'Random Boss (this floor)' });
        opts.push({ value:'generic-superboss', label:'Random Superboss' });
        for (const k in BOSS_TYPES) opts.push({ value:k, label: BOSS_TYPES[k].name + ' (boss)' });
        for (const k in SUPERBOSSES) opts.push({ value:k, label: SUPERBOSSES[k].name + ' (superboss)' });
      } else {
        opts.push({ value:'generic-boss', label:'Random Boss (this stage)' });
        for (const k in BOSS_TYPES) if (BOSS_TYPES[k].stage === selectedStage) opts.push({ value:k, label: BOSS_TYPES[k].name + ' (boss)' });
      }
    } else {
      if (selectedStage === 'random') {
        opts.push({ value:'generic', label:'Random (all stages)' });
        for (const k in ENEMY_TYPES) opts.push({ value:k, label: ENEMY_TYPES[k].name });
      } else {
        opts.push({ value:'generic', label:'Random (this stage)' });
        for (const k in ENEMY_TYPES) if (ENEMY_TYPES[k].stage === selectedStage) opts.push({ value:k, label: ENEMY_TYPES[k].name });
      }
    }
  } else if (selectedCategory === 'pickup') {
    opts.push({ value:'generic', label:'Random (any pickup)' });
    if (selectedSubGroup === 'coins') {
      for (const c of COIN_TYPES) {
        const t = PICKUP_TYPE_BY_ID[c.id];
        opts.push({ value:'coin:' + c.id, label:'Coin: ' + (t ? t.name : c.id) + (t && t.desc ? ' (' + t.desc + ')' : '') });
      }
    } else if (selectedSubGroup === 'chests') {
      for (const key in CHEST_TYPES) {
        const c = CHEST_TYPES[key];
        opts.push({ value:'chest:' + c.id, label:'Chest: ' + c.id.charAt(0).toUpperCase() + c.id.slice(1) });
      }
    } else if (selectedSubGroup === 'pills') {
      if (PILL_COLORS.length) opts.push({ value:'pill', label:'Pill (unknown effect)' });
    } else if (selectedSubGroup === 'stars') {
      if (STAR_LIST.length) opts.push({ value:'star', label:'Star (random named effect)' });
    } else {
      const coinIds = new Set(COIN_TYPES.map((c) => c.id));
      const dyeAndAugmentIds = new Set(['reddye','purpledye','golddye','neondye','blackdye','bluedye','whitedye','orangedye','tearsaugment','damageaugment','healthaugment','goldaugment','pierceaugment']);
      for (const p of PICKUP_TYPE_LIST) {
        if (coinIds.has(p.id) || dyeAndAugmentIds.has(p.id)) continue;
        const isHeart = PICKUP_SUBGROUP_MATCH.hearts(p.id);
        const isKeyBomb = PICKUP_SUBGROUP_MATCH.keysbombs(p.id);
        if (selectedSubGroup === 'hearts' && !isHeart) continue;
        if (selectedSubGroup === 'keysbombs' && !isKeyBomb) continue;
        if (selectedSubGroup === 'other' && (isHeart || isKeyBomb)) continue;
        opts.push({ value: p.id, label: p.name + (p.desc ? ' (' + p.desc + ')' : '') });
      }
    }
  } else if (selectedCategory === 'item') {
    for (const it of ITEM_LIST) opts.push({ value: it.id, label: it.name + ' (' + it.type + ')' });
  } else if (selectedCategory === 'deal') {

    for (const it of ITEM_LIST) if (it.pools && it.pools.includes('sombra')) opts.push({ value: it.id, label: it.name + ' (' + it.type + ')' });
  } else if (selectedCategory === 'shop') {

    for (const it of ITEM_LIST) opts.push({ value: it.id, label: it.name + ' (' + it.type + ')' });
    for (const t of TRINKET_LIST) opts.push({ value: t.id, label: t.name + ' (trinket)' });
    for (const f of FAMILIAR_LIST) opts.push({ value: f.id, label: f.name + ' (familiar)' });
    for (const p of SHOP_PICKUP_PRICES) opts.push({ value: p.kind, label: p.kind + ' pickup' });
  } else if (selectedCategory === 'obstacle') {
    for (const key in OBSTACLES) {
      const o = OBSTACLES[key];
      opts.push({ value: o.id, label: o.name + (o.desc ? ' (' + o.desc + ')' : '') });
    }
  }
  lastOpts = opts;
  renderFilteredOptions();
}

const categoryBtns = Array.from(document.querySelectorAll('#categoryBtns button'));
categoryBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    selectedCategory = btn.dataset.cat;
    categoryBtns.forEach((b) => b.classList.toggle('active', b === btn));
    resetSubGroupDefaults();
    renderSubTabs();
    populateSpecificSelect();
  });
});
resetSubGroupDefaults();
renderSubTabs();
categoryBtns[0].classList.add('active');

const zoomBtns = Array.from(document.querySelectorAll('#zoomBtns button'));
zoomBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    TILE_PX = parseInt(btn.dataset.px, 10);
    zoomBtns.forEach((b) => b.classList.toggle('active', b === btn));
    rebuildGrid();
  });
});
zoomBtns[1].classList.add('active');

function renderFloorPathButtons(){
  const el = document.getElementById('floorPathBtns');
  if (!el) return;
  el.innerHTML = '';
  const paths = [['main', 'Main'], ['C', 'C-Path'], ['D', 'D-Path']];
  for (const [id, label] of paths) {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.className = selectedFloorPath === id ? 'active' : '';
    btn.addEventListener('click', () => {
      selectedFloorPath = id;
      renderFloorPathButtons();
      renderFloorButtons();
    });
    el.appendChild(btn);
  }
}

function renderFloorButtons(){
  const el = document.getElementById('floorBtns');
  el.innerHTML = '';
  if (selectedFloorPath === 'C') {
    for (let i = 2; i <= C_LAST_FLOORNUM; i++) {
      const btn = document.createElement('button');
      btn.textContent = floorLabelFor(i, 'C');
      btn.title = floorNameFor(i, 'C');
      btn.className = cFloorState[i] ? 'active' : '';
      btn.addEventListener('click', () => {
        pushUndo();
        cFloorState[i] = !cFloorState[i];
        btn.classList.toggle('active', cFloorState[i]);
        updateStatsAndWarnings();
      });
      el.appendChild(btn);
    }
  } else if (selectedFloorPath === 'D') {
    for (let i = 3; i <= D_LAST_FLOORNUM; i++) {
      const btn = document.createElement('button');
      btn.textContent = floorLabelFor(i, 'D');
      btn.title = floorNameFor(i, 'D');
      btn.className = dFloorState[i] ? 'active' : '';
      btn.addEventListener('click', () => {
        pushUndo();
        dFloorState[i] = !dFloorState[i];
        btn.classList.toggle('active', dFloorState[i]);
        updateStatsAndWarnings();
      });
      el.appendChild(btn);
    }
  } else {
    for (let i = 0; i < MAX_FLOORS; i++) {
      const btn = document.createElement('button');
      btn.textContent = floorLabelFor(i, null);
      btn.className = floorState[i] ? 'active' : '';
      btn.addEventListener('click', () => {
        pushUndo();
        floorState[i] = !floorState[i];
        btn.classList.toggle('active', floorState[i]);
        updateStatsAndWarnings();
      });
      el.appendChild(btn);
    }
  }
}

document.getElementById('resetSpawnersBtn').addEventListener('click', () => {
  pushUndo();
  spawnerMap.clear();
  renderCanvas();
  updateStatsAndWarnings();
});
document.getElementById('resetAllBtn').addEventListener('click', () => {
  pushUndo();
  workingMask = makeEmptyMask();
  workingMask[0][0] = 1;
  spawnerMap.clear();
  disabledDoorSlots.clear();
  floorState = new Array(MAX_FLOORS).fill(true);
  cFloorState = new Array(C_LAST_FLOORNUM + 1).fill(true);
  dFloorState = new Array(D_LAST_FLOORNUM + 1).fill(true);
  selectedFloorPath = 'main';
  renderFloorPathButtons();
  renderFloorButtons();
  renderBlockGrid();
  rebuildGrid();
});

document.getElementById('importBtn').addEventListener('click', () => {
  const hintEl = document.getElementById('importHint');
  const raw = document.getElementById('importArea').value.trim();
  if (!raw) { hintEl.textContent = 'Paste an exported room line first.'; hintEl.className = 'warn'; return; }

  let jsonText = raw;
  let detectedType = null;
  const wrapped = raw.match(/ROOM_TEMPLATES\.(\w+)\.push\(([\s\S]*)\)\s*;?\s*$/);
  if (wrapped) { detectedType = wrapped[1]; jsonText = wrapped[2]; }

  let obj;
  try { obj = JSON.parse(jsonText); }
  catch (err) { hintEl.textContent = 'Could not parse that as JSON — paste the exported line as-is.'; hintEl.className = 'err'; return; }
  if (!obj || !Array.isArray(obj.m)) { hintEl.textContent = 'That doesn\'t look like a room template (missing "m").'; hintEl.className = 'err'; return; }

  const hasContent = spawnerMap.size > 0 || workingMask.flat().reduce((a, b) => a + b, 0) > 1;
  if (hasContent && !confirm('Load this room into the editor? It will replace what\'s on the canvas (Undo will bring it back).')) return;

  pushUndo();

  workingMask = makeEmptyMask();
  for (let r = 0; r < obj.m.length && r < 4; r++) {
    for (let c = 0; c < obj.m[r].length && c < 4; c++) {
      if (obj.m[r][c]) workingMask[r][c] = 1;
    }
  }

  spawnerMap.clear();
  for (const rawSp of (obj.s || [])) {
    const sp = decodeSpawner(rawSp);
    spawnerMap.set(sp.x + ',' + sp.y, sp);
  }

  floorState = new Array(MAX_FLOORS).fill(true);
  cFloorState = new Array(C_LAST_FLOORNUM + 1).fill(true);
  dFloorState = new Array(D_LAST_FLOORNUM + 1).fill(true);
  if (obj.p === 'C') {
    if (obj.f) { cFloorState.fill(false); obj.f.forEach((i) => { if (i >= 2 && i <= C_LAST_FLOORNUM) cFloorState[i] = true; }); }
    selectedFloorPath = 'C';
  } else if (obj.p === 'D') {
    if (obj.f) { dFloorState.fill(false); obj.f.forEach((i) => { if (i >= 3 && i <= D_LAST_FLOORNUM) dFloorState[i] = true; }); }
    selectedFloorPath = 'D';
  } else {
    if (obj.f) { floorState.fill(false); obj.f.forEach((i) => { if (i >= 0 && i < MAX_FLOORS) floorState[i] = true; }); }
    selectedFloorPath = 'main';
  }

  disabledDoorSlots.clear();
  if (obj.d) {
    if (typeof obj.d === 'string') {

      const slots = computeDoorSlots(workingMask, 0, 0, null, null);
      for (const s of slots) if (obj.d.includes(s.dir)) disabledDoorSlots.add(s.localCol + ',' + s.localRow + ',' + s.dir);
    } else {
      for (const entry of obj.d) for (const ch of entry[2]) disabledDoorSlots.add(entry[0] + ',' + entry[1] + ',' + ch);
    }
  }

  if (detectedType) document.getElementById('roomType').value = detectedType;

  renderBlockGrid();
  renderFloorPathButtons();
  renderFloorButtons();
  rebuildGrid();
  hintEl.textContent = 'Loaded' + (detectedType ? ' as "' + detectedType + '"' : ' — double check the Type dropdown, it wasn\'t in the pasted data') + '.';
  hintEl.className = 'ok';
});

const SPAWNER_CATEGORY_ENCODE = { enemy:'e', pickup:'p', item:'i', deal:'d', shop:'s', obstacle:'o' };
function encodeSpawner(sp){
  const cat = SPAWNER_CATEGORY_ENCODE[sp.category] || sp.category;
  if (sp.category === 'obstacle') return [sp.x, sp.y, 'o', sp.specific];
  if (sp.kind === 'generic') return [sp.x, sp.y, cat, 'g'];
  if (sp.kind === 'genericBoss') return [sp.x, sp.y, cat, 'b'];
  if (sp.kind === 'genericSuperboss') return [sp.x, sp.y, cat, 'S'];
  return [sp.x, sp.y, cat, 'f', sp.specific];
}

function exportTemplate(){
  const hintEl = document.getElementById('exportHint');
  const trimmed = trimMaskWithOffset(workingMask);
  if (!trimmed) { hintEl.textContent = 'Toggle at least one block first.'; return; }

  const blockCount = trimmed.mask.flat().reduce((a, b) => a + b, 0);
  let hint = '';
  if (blockCount > 4) hint += 'More than 4 blocks (outside the usual 1-4 range). ';
  if (blockCount > 1 && !isMaskConnected(trimmed.mask)) hint += 'Warning: blocks are not fully connected. ';

  const doorField = disabledDoorsField(trimmed.offC, trimmed.offR, trimmed.mask);
  const fakeNode = { shape: { mask: trimmed.mask }, doorSlots: buildPreviewDoorSlots(trimmed.mask, doorField) };
  const built = buildRoomTiles(fakeNode);

  const offX = trimmed.offC * BLOCK, offY = trimmed.offR * BLOCK;
  const spawners = [];
  let dropped = 0;
  for (const sp of spawnerMap.values()) {
    const nx = sp.x - offX, ny = sp.y - offY;
    if (ny < 0 || ny >= built.tileH || nx < 0 || nx >= built.tileW || built.grid[ny][nx] !== T_FLOOR) { dropped++; continue; }
    spawners.push(encodeSpawner({ x: nx, y: ny, category: sp.category, kind: sp.kind, specific: sp.specific }));
  }
  if (dropped) hint += dropped + ' spawner(s) fell outside the trimmed shape and were dropped. ';
  hintEl.textContent = hint;

  const roomType = document.getElementById('roomType').value;
  const template = { m: trimmed.mask };
  if (spawners.length) template.s = spawners;
  const flags = restrictionFlags();
  const cRestricted = flags.c;
  const dRestricted = flags.d;
  const mainRestricted = flags.main;
  if (mainRestricted) {
    template.f = floorState.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
  } else if (cRestricted) {
    template.p = 'C';
    template.f = cFloorState.map((v, i) => (i >= 2 && i <= C_LAST_FLOORNUM && v ? i : -1)).filter((i) => i >= 0);
  } else if (dRestricted) {
    template.p = 'D';
    template.f = dFloorState.map((v, i) => (i >= 3 && i <= D_LAST_FLOORNUM && v ? i : -1)).filter((i) => i >= 0);
  }
  if (doorField.length) template.d = doorField;

  const text = 'ROOM_TEMPLATES.' + roomType + '.push(' + JSON.stringify(template) + ');';
  document.getElementById('exportArea').value = text;
}
document.getElementById('exportBtn').addEventListener('click', exportTemplate);
document.getElementById('copyBtn').addEventListener('click', () => {
  const ta = document.getElementById('exportArea');
  if (!ta.value) exportTemplate();
  ta.select();
  try { document.execCommand('copy'); } catch (e) {  }
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).catch(() => {});
});

function testInGame(){
  const ta = document.getElementById('exportArea');
  if (!ta.value) exportTemplate();
  try { localStorage.setItem('adele2_testRoom', ta.value); } catch (e) {  }
  window.location.href = 'index.html';
}
document.getElementById('testInGameBtn').addEventListener('click', testInGame);

let batchLines = [];
try {
  const restored = JSON.parse(localStorage.getItem('adele2_roomEditorBatch'));
  if (Array.isArray(restored)) batchLines = restored;
} catch (e) {  }

function renderFileBufferArea(){
  const el = document.getElementById('fileBufferArea');
  if (el) el.value = batchLines.join('\n');
}

document.getElementById('addToFileBtn').addEventListener('click', () => {
  const ta = document.getElementById('exportArea');
  if (!ta.value) exportTemplate();
  batchLines.push(ta.value);
  try { localStorage.setItem('adele2_roomEditorBatch', JSON.stringify(batchLines)); } catch (e) {  }
  renderFileBufferArea();
});

document.getElementById('copyFileBtn').addEventListener('click', () => {
  const ta = document.getElementById('fileBufferArea');
  if (!ta.value) { document.getElementById('exportHint').textContent = 'Nothing added to the file buffer yet.'; return; }
  ta.select();
  try { document.execCommand('copy'); } catch (e) {  }
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).catch(() => {});
});

document.getElementById('clearFileBtn').addEventListener('click', () => {
  if (!window.confirm('Clear the accumulated file buffer?')) return;
  batchLines = [];
  try { localStorage.removeItem('adele2_roomEditorBatch'); } catch (e) {  }
  renderFileBufferArea();
});

let variantCount = 0;
document.getElementById('duplicateVariantBtn').addEventListener('click', () => {
  const ta = document.getElementById('exportArea');
  if (!ta.value) exportTemplate();
  variantCount += 1;
  const block = document.createElement('div');
  block.className = 'variant';
  const row = document.createElement('div');
  row.className = 'row';
  const heading = document.createElement('label');
  heading.textContent = 'Variant ' + variantCount;
  const copyVariantBtn = document.createElement('button');
  copyVariantBtn.textContent = 'Copy';
  row.appendChild(heading); row.appendChild(copyVariantBtn);
  const textarea = document.createElement('textarea');
  textarea.readOnly = true;
  textarea.value = ta.value;
  copyVariantBtn.addEventListener('click', () => {
    textarea.select();
    try { document.execCommand('copy'); } catch (e) {  }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(textarea.value).catch(() => {});
  });
  block.appendChild(row); block.appendChild(textarea);
  document.getElementById('variantList').prepend(block);
});

renderFloorPathButtons();
renderFloorButtons();
renderBlockGrid();
rebuildGrid();
populateSpecificSelect();
updateUndoRedoButtons();
updateStatsAndWarnings();
renderFileBufferArea();
