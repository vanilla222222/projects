'use strict';

const PROCGEN_MASK_GROUPS = [
  { w: 30, names: ['single'] },
  { w: 15, names: ['wideDom'] },
  { w: 15, names: ['tallDom'] },
  { w: 25, names: ['lA', 'lB', 'lC', 'lD', 'tShape', 'tShape2', 'sShape', 'zShape', 'plus', 'uShape'] },
  { w: 15, names: ['lBig1', 'lBig2', 'bigNotch', 'hallWide', 'hallTall'] },
];

const PROCGEN_FREE_ROOM_TYPES = new Set(['normal', 'floorfeature', 'boss', 'miniboss']);

function procgenShapeByName(name){
  for (const s of ROOM_SHAPES) if (s.name === name) return s;
  return ROOM_SHAPES[0];
}

function cloneMask(mask){
  return mask.map(row => row.slice());
}

function pickProceduralMask(roomType){
  if (!PROCGEN_FREE_ROOM_TYPES.has(roomType)) {
    return { mask: cloneMask(procgenShapeByName('single').mask), template: null };
  }
  const group = Util.weighted(PROCGEN_MASK_GROUPS.map(g => ({ w: g.w, group: g }))).group;
  const shape = procgenShapeByName(Util.choice(group.names));
  return { mask: cloneMask(shape.mask), template: null };
}

function doorFrontZoneTiles(col, row, dir){
  const ox = col * BLOCK, oy = row * BLOCK;
  let xs, ys;
  if (dir === 'N') { xs = [ox + 5, ox + 6]; ys = [oy + 1, oy + 2]; }
  else if (dir === 'S') { xs = [ox + 5, ox + 6]; ys = [oy + 9, oy + 10]; }
  else if (dir === 'W') { xs = [ox + 1, ox + 2]; ys = [oy + 5, oy + 6]; }
  else { xs = [ox + 9, ox + 10]; ys = [oy + 5, oy + 6]; }
  const out = [];
  for (const y of ys) for (const x of xs) out.push({ x, y });
  return out;
}

function doorInteriorTile(slot){
  const ox = slot.localCol * BLOCK, oy = slot.localRow * BLOCK;
  if (slot.dir === 'N') return { x: ox + 5, y: oy + 1 };
  if (slot.dir === 'S') return { x: ox + 5, y: oy + 10 };
  if (slot.dir === 'W') return { x: ox + 1, y: oy + 5 };
  return { x: ox + 10, y: oy + 5 };
}

function procgenActiveDoorSlots(node){
  const slots = node.doorSlots || computeDoorSlots(node.shape.mask, node.gx || 0, node.gy || 0, node.template, node);
  return slots.filter(s => !s.disabled && !isDoorDisabled(node.template, s.localCol, s.localRow, s.dir));
}

function doorClearanceTiles(node){
  const seen = new Set();
  const out = [];
  for (const slot of procgenActiveDoorSlots(node)) {
    for (const t of doorFrontZoneTiles(slot.localCol, slot.localRow, slot.dir)) {
      const k = t.x + ',' + t.y;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(t);
    }
  }
  return out;
}

function procgenObstacleBlockKeys(obstacles){
  const keys = new Set();
  for (const ob of (obstacles || [])) {
    if (!ob || ob.destroyed) continue;
    const def = OBSTACLES[ob.kind];
    if (def && def.walkable) continue;
    const tx = ob.tx !== undefined ? ob.tx : Math.floor(ob.x / TILE);
    const ty = ob.ty !== undefined ? ob.ty : Math.floor(ob.y / TILE);
    keys.add(tx + ',' + ty);
  }
  return keys;
}

function procgenTileBlocked(node, x, y, obstacleKeys){
  if (x < 0 || y < 0 || x >= node.tileW || y >= node.tileH) return true;
  const t = node.tiles[y][x];
  if (t === T_VOID || t === T_WALL || t === T_SECRET) return true;
  if (obstacleKeys.has(x + ',' + y)) return true;
  return false;
}

function roomIsFullyConnected(node, obstacles){
  const slots = procgenActiveDoorSlots(node);
  if (slots.length < 2) return true;
  const obstacleKeys = procgenObstacleBlockKeys(obstacles);
  const targets = [];
  for (const slot of slots) {
    const t = doorInteriorTile(slot);
    if (procgenTileBlocked(node, t.x, t.y, obstacleKeys)) return false;
    targets.push(t.x + ',' + t.y);
  }
  const start = targets[0].split(',').map(Number);
  const visited = new Set();
  const queue = [{ x: start[0], y: start[1] }];
  visited.add(targets[0]);
  while (queue.length) {
    const cur = queue.shift();
    const steps = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dx, dy] of steps) {
      const nx = cur.x + dx, ny = cur.y + dy;
      const k = nx + ',' + ny;
      if (visited.has(k)) continue;
      if (procgenTileBlocked(node, nx, ny, obstacleKeys)) continue;
      visited.add(k);
      queue.push({ x: nx, y: ny });
    }
  }
  for (const k of targets) if (!visited.has(k)) return false;
  return true;
}
