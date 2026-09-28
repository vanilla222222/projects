'use strict';

const DIRS = [
  { d:'N', o:'S', dx:0, dy:-1 },
  { d:'E', o:'W', dx:1, dy:0 },
  { d:'S', o:'N', dx:0, dy:1 },
  { d:'W', o:'E', dx:-1, dy:0 },
];

const SPECIAL_ROOM_TYPES = new Set([
  'boss', 'treasure', 'shop', 'secret', 'petshop', 'curse', 'sacrifice', 'vault', 'challenge', 'crystal', 'sombra', 'star',
  'cpathgate',
  'planetarium',
  'shrine',
  'arcade',
  'floorfeature',
  'miniboss',
  'mirror',
  'karma',
  'bosschallenge',

  'supersecret',
]);

const AUTO_OPEN_ROOM_TYPES = new Set([
  'start', 'secret', 'supersecret', 'petshop', 'curse', 'sacrifice', 'challenge', 'crystal', 'sombra', 'cpathgate', 'planetarium', 'shrine',
  'mirror', 'karma', 'bosschallenge',

  'floorfeature',

  'wavearena',
]);

const MANDATORY_ROOM_TYPES = ['boss', 'treasure', 'shop', 'secret', 'supersecret'];

const DUNGEON_CONFIG = {
  roomCount: { base: 12, perFloor: 2, spread: 4, floorMin: 6 },
  radiusBase: 8, radiusPerFloor: 1, radiusHeadroom: 2,
  specialBudget: { base: 3, perFloors: 4, max: 6 },
  specialChances: {
    petshop: 0.25, curse: 0.50, sacrifice: 0.50, vault: 0.10, challenge: 0.25,
    star: 0.25, shrine: 0.20, arcade: 0.18, miniboss: 0.25,
    karma: 0.22, bosschallenge: 0.20,
  },
  totalRoomCap: { base: 15, perFloor: 2, max: 30 },
  tileFootprintCap: { base: 30, perFloor: 4, max: 50 },
};

let _roomIdSeq = 1;

function blockKey(x, y){ return x + ',' + y; }

function isDoorDisabled(template, col, row, dir){
  const d = template && template.d;
  if (!d) return false;
  if (typeof d === 'string') return d.includes(dir);
  for (const entry of d) {
    if (entry[0] === col && entry[1] === row && entry[2].includes(dir)) return true;
  }
  return false;
}

function obstacleAllowedOnFloor(kind, floorNum, floorPath){
  const def = OBSTACLES[kind];
  const rules = def && def.floorRules;
  if (!rules || !rules.length) return true;
  for (const r of rules) {
    if (r.minFloor !== undefined && floorNum < r.minFloor) continue;
    if (r.maxFloor !== undefined && floorNum > r.maxFloor) continue;
    if (r.path !== undefined && floorPath !== r.path) continue;
    if (r.pathExclude !== undefined && floorPath === r.pathExclude) continue;
    return true;
  }
  return false;
}

function templateAllowsFloor(tmpl, floorNum){
  if (tmpl.f && !tmpl.f.includes(floorNum)) return false;
  const floorPath = currentFloorPath();
  if (tmpl.p === 'C' && floorPath !== 'C') return false;
  if (tmpl.p === 'D' && floorPath !== 'D') return false;
  if (tmpl.s) {
    for (const sp of tmpl.s) {
      if (sp[2] === 'o' && !obstacleAllowedOnFloor(sp[3], floorNum, floorPath)) return false;
    }
  }
  return true;
}

function computeDoorSlots(mask, originBx, originBy, template, room){
  const slots = [];
  for (let r = 0; r < mask.length; r++) {
    for (let c = 0; c < mask[r].length; c++) {
      if (!mask[r][c]) continue;
      for (const dir of DIRS) {
        const nr = r + dir.dy, nc = c + dir.dx;
        const interior = nr >= 0 && nr < mask.length && nc >= 0 && nc < mask[r].length && mask[nr][nc];
        if (interior) continue;
        slots.push({
          room, localCol: c, localRow: r, dir: dir.d,
          bx: originBx + c, by: originBy + r,
          disabled: isDoorDisabled(template, c, r, dir.d),
          type: null, pairedSlot: null, opened: false, cells: null,
        });
      }
    }
  }
  return slots;
}

function connectDoorSlots(a, b, type){
  a.type = type; b.type = type;
  a.pairedSlot = b; b.pairedSlot = a;
}

function countRoomConnections(room){
  const ids = new Set();
  for (const s of room.doorSlots) if (s.pairedSlot) ids.add(s.pairedSlot.room.id);
  return ids.size;
}

function connectRoomDoors(room, blockGrid, rooms, doorType){
  if (countRoomConnections(room) >= room.maxDoors) return;

  const candidates = [];
  for (const slot of room.doorSlots) {
    if (slot.disabled || slot.pairedSlot) continue;
    const dir = DIRS.find(dd => dd.d === slot.dir);
    const nbx = slot.bx + dir.dx, nby = slot.by + dir.dy;
    const otherId = blockGrid.get(blockKey(nbx, nby));
    if (otherId == null || otherId === room.id) continue;
    const other = rooms.get(otherId);
    const oppSlot = other.doorSlots.find(s => s.bx === nbx && s.by === nby && s.dir === dir.o && !s.disabled && !s.pairedSlot);
    if (!oppSlot) continue;
    candidates.push({ slot, oppSlot, other });
  }
  if (room.maxDoors < Infinity) Util.shuffle(candidates);

  for (const c of candidates) {
    if (countRoomConnections(room) >= room.maxDoors) break;
    if (countRoomConnections(c.other) >= c.other.maxDoors) continue;
    connectDoorSlots(c.slot, c.oppSlot, doorType);
  }
}

function makeRoomInstance(type, originBx, originBy, mask, template){
  const room = {
    id: _roomIdSeq++,
    type,
    gx: originBx, gy: originBy,
    shape: { mask },
    template: template || null,
    doorSlots: null,

    tiles: null, doorsOpen: AUTO_OPEN_ROOM_TYPES.has(type), tileW: 0, tileH: 0,
    discovered: false, seen: false, revealed: false, visited: false, cleared: (type === 'start'),
    populated: false,
    enemies: null, obstacles: null, pickups: null, chests: null,
    itemPedestals: null, shopSlots: null, bossDefeated: false, stairsSpot: null,
    keyToastCooldown: 0,

    maxDoors: SPECIAL_ROOM_TYPES.has(type) ? 1 : Infinity,
  };
  room.doorSlots = computeDoorSlots(mask, originBx, originBy, template, room);
  return room;
}

function roomBlockCells(room){
  const mask = room.shape.mask;
  const cells = [];
  for (let r = 0; r < mask.length; r++) {
    for (let c = 0; c < mask[r].length; c++) {
      if (mask[r][c]) cells.push({ bx: room.gx + c, by: room.gy + r });
    }
  }
  return cells;
}

const PROCGEN_ROUTED_ROOM_TYPES = new Set([
  'normal', 'boss', 'miniboss', 'floorfeature',
  'shop', 'treasure', 'petshop', 'shrine', 'vault', 'karma', 'arcade', 'curse', 'sacrifice',
  'challenge', 'bosschallenge', 'crystal', 'sombra', 'mirror', 'secret', 'supersecret', 'star',
  'start', 'cpathgate', 'planetarium',
]);

function pickMaskForType(type, floorNum){
  if (PROCGEN_ROUTED_ROOM_TYPES.has(type)) return pickProceduralMask(type);
  const pool = (ROOM_TEMPLATES[type] || []).filter(t => templateAllowsFloor(t, floorNum));
  if (pool.length) {
    const tmpl = Util.choice(pool);
    return { mask: tmpl.m, template: tmpl };
  }
  const shape = chooseShapeForNode({ type });
  return { mask: shape.mask, template: null };
}

function procgenTemplatePoolFor(type, floorNum){
  if (PROCGEN_ROUTED_ROOM_TYPES.has(type)) return [null];
  const rawPool = (ROOM_TEMPLATES[type] || []).filter(t => templateAllowsFloor(t, floorNum));
  return rawPool.length ? Util.shuffle(rawPool.slice()) : [null];
}

function procgenMaskFor(type, tmpl, fallbackMask){
  if (PROCGEN_ROUTED_ROOM_TYPES.has(type)) return pickProceduralMask(type).mask;
  if (tmpl) return tmpl.m;
  return fallbackMask;
}

function canPlace(blockGrid, room, radius){
  const cells = roomBlockCells(room);
  if (!cells.length) return false;
  for (const cell of cells) {
    if (Math.max(Math.abs(cell.bx), Math.abs(cell.by)) > radius) return false;
    if (blockGrid.has(blockKey(cell.bx, cell.by))) return false;
  }
  return true;
}

function commitPlace(blockGrid, rooms, room){
  rooms.set(room.id, room);
  for (const cell of roomBlockCells(room)) blockGrid.set(blockKey(cell.bx, cell.by), room.id);
}

function tryPlaceAdjacent(blockGrid, rooms, fromRoom, dir, mask, template, type, radius){
  const fromSlots = Util.shuffle(fromRoom.doorSlots.filter(s => s.dir === dir.d && !s.disabled && !s.pairedSlot));
  if (!fromSlots.length) return null;

  const maskCells = [];
  for (let r = 0; r < mask.length; r++) for (let c = 0; c < mask[r].length; c++) if (mask[r][c]) maskCells.push({ mx: c, my: r });
  const maskSet = new Set(maskCells.map(p => blockKey(p.mx, p.my)));
  const oppEntry = DIRS.find(d => d.d === dir.o);
  const maskBoundary = Util.shuffle(maskCells.filter(p =>
    !maskSet.has(blockKey(p.mx + oppEntry.dx, p.my + oppEntry.dy)) &&
    !isDoorDisabled(template, p.mx, p.my, dir.o)
  ));
  if (!maskBoundary.length) return null;

  for (const slot of fromSlots) {
    const targetX = slot.bx + dir.dx, targetY = slot.by + dir.dy;
    for (const mc of maskBoundary) {
      const originBx = targetX - mc.mx, originBy = targetY - mc.my;
      const candidate = makeRoomInstance(type, originBx, originBy, mask, template);
      if (canPlace(blockGrid, candidate, radius)) {
        commitPlace(blockGrid, rooms, candidate);
        connectRoomDoors(candidate, blockGrid, rooms, 'normal');
        return candidate;
      }
    }
  }
  return null;
}

function touchingRoomIds(blockGrid, candidate){
  const touching = new Set();
  for (const cell of roomBlockCells(candidate)) {
    for (const dir of DIRS) {
      const nid = blockGrid.get(blockKey(cell.bx + dir.dx, cell.by + dir.dy));
      if (nid != null) touching.add(nid);
    }
  }
  return touching;
}

function scanSecretPlacement(blockGrid, searchRadius, placeRadius, mask, pick, minTouch, maxTouch, type){
  let best = null, bestScore = -1;
  for (let ox = -searchRadius; ox <= searchRadius; ox++) {
    for (let oy = -searchRadius; oy <= searchRadius; oy++) {
      const candidate = makeRoomInstance(type, ox, oy, mask, pick);
      if (!canPlace(blockGrid, candidate, placeRadius)) continue;
      const touching = touchingRoomIds(blockGrid, candidate);
      if (touching.size < minTouch || touching.size > maxTouch) continue;
      const score = touching.size + RNG.random() * 0.5;
      if (score > bestScore) { bestScore = score; best = candidate; }
    }
  }
  return best;
}

function connectSecretRoomDoors(room, blockGrid, rooms, doorType, touchIds){
  if (countRoomConnections(room) >= room.maxDoors) return;
  const byNeighbor = new Map();
  for (const slot of room.doorSlots) {
    if (slot.disabled || slot.pairedSlot) continue;
    const dir = DIRS.find(dd => dd.d === slot.dir);
    const nbx = slot.bx + dir.dx, nby = slot.by + dir.dy;
    const otherId = blockGrid.get(blockKey(nbx, nby));
    if (otherId == null || otherId === room.id || !touchIds.has(otherId)) continue;
    const other = rooms.get(otherId);
    const oppSlot = other.doorSlots.find(s => s.bx === nbx && s.by === nby && s.dir === dir.o && !s.disabled && !s.pairedSlot);
    if (!oppSlot) continue;
    if (!byNeighbor.has(otherId)) byNeighbor.set(otherId, []);
    byNeighbor.get(otherId).push({ slot, oppSlot, other });
  }
  const neighborIds = Util.shuffle([...byNeighbor.keys()]);
  for (const nid of neighborIds) {
    if (countRoomConnections(room) >= room.maxDoors) break;
    const options = byNeighbor.get(nid);
    const other = options[0].other;
    if (countRoomConnections(other) >= other.maxDoors) continue;
    const pick = options[Math.floor(RNG.random() * options.length)];
    connectDoorSlots(pick.slot, pick.oppSlot, doorType);
  }
}

function procgenSecretPick(type, floorNum){
  if (PROCGEN_ROUTED_ROOM_TYPES.has(type)) return { pick: null, mask: pickProceduralMask(type).mask };
  const pool = (ROOM_TEMPLATES[type] || []).filter(t => templateAllowsFloor(t, floorNum));
  const pick = pool.length ? Util.choice(pool) : null;
  return { pick, mask: pick ? pick.m : [[1]] };
}

function attachSecretRoom(rooms, blockGrid, radius, floorNum){
  const { pick, mask } = procgenSecretPick('secret', floorNum);

  let best = null;
  for (const extra of [0, 2, 4]) {
    best = scanSecretPlacement(blockGrid, radius + extra, radius + extra, mask, pick, 2, 4, 'secret');
    if (best) break;
  }
  if (!best) {

    for (const extra of [0, 2, 4]) {
      best = scanSecretPlacement(blockGrid, radius + extra, radius + extra, mask, pick, 1, Infinity, 'secret');
      if (best) break;
    }
  }
  if (!best) return null;
  const touchIds = touchingRoomIds(blockGrid, best);
  best.maxDoors = Math.min(4, Math.max(1, touchIds.size));
  commitPlace(blockGrid, rooms, best);
  connectSecretRoomDoors(best, blockGrid, rooms, 'secret', touchIds);
  return best;
}

function attachSuperSecretRoom(rooms, blockGrid, radius, floorNum){
  const { pick, mask } = procgenSecretPick('supersecret', floorNum);

  let best = null;
  for (const extra of [0, 2, 4]) {
    best = scanSecretPlacement(blockGrid, radius + extra, radius + extra, mask, pick, 1, 1, 'supersecret');
    if (best) break;
  }
  if (!best) return null;
  const touchIds = touchingRoomIds(blockGrid, best);
  commitPlace(blockGrid, rooms, best);

  connectSecretRoomDoors(best, blockGrid, rooms, 'supersecret', touchIds);
  return best;
}

function generateDungeon(floorNum){

  const rc = DUNGEON_CONFIG.roomCount;
  const rawMin = rc.base + rc.perFloor * floorNum - rc.spread / 2;
  const minNormal = Math.max(rc.floorMin, Math.round(rawMin));
  const maxNormal = Math.max(minNormal, Math.round(rc.base + rc.perFloor * floorNum + rc.spread / 2));

  const radius = DUNGEON_CONFIG.radiusBase + DUNGEON_CONFIG.radiusPerFloor * floorNum + DUNGEON_CONFIG.radiusHeadroom;

  const totalRoomTarget = Math.min(
    DUNGEON_CONFIG.totalRoomCap.max,
    DUNGEON_CONFIG.totalRoomCap.base + DUNGEON_CONFIG.totalRoomCap.perFloor * floorNum
  );
  const footprintCap = Math.min(
    DUNGEON_CONFIG.tileFootprintCap.max,
    DUNGEON_CONFIG.tileFootprintCap.base + DUNGEON_CONFIG.tileFootprintCap.perFloor * floorNum
  );

  function weightedGroupPick(types){
    const total = types.reduce((sum, t) => sum + DUNGEON_CONFIG.specialChances[t], 0);
    let roll = RNG.random() * total;
    for (const t of types) {
      roll -= DUNGEON_CONFIG.specialChances[t];
      if (roll <= 0) return t;
    }
    return types[types.length - 1];
  }
  const groupAType = weightedGroupPick(['curse', 'sacrifice', 'challenge', 'miniboss', 'bosschallenge']);
  const groupBType = weightedGroupPick(['shrine', 'petshop', 'vault', 'arcade', 'karma']);
  const starRolled = Util.chance(Math.min(1, DUNGEON_CONFIG.specialChances.star + getStarRoomChanceBonus()));

  const decidedSpecialCount = 5 + 2;
  const targetNormal = Math.min(maxNormal, Math.max(minNormal, totalRoomTarget - decidedSpecialCount));

  let rooms, blockGrid, startRoom, distances;

  function degree(room){
    const ids = new Set();
    for (const s of room.doorSlots) if (s.pairedSlot && s.type !== 'secret' && s.type !== 'supersecret') ids.add(s.pairedSlot.room.id);
    return ids.size;
  }
  function farthestLeaves(){
    return [...rooms.values()]
      .filter(r => r.type === 'normal' && degree(r) === 1)
      .sort((a, b) => (distances.get(b.id) || 0) - (distances.get(a.id) || 0));
  }

  function attachSpecial(type){
    const leaves = farthestLeaves();
    const templatePool = procgenTemplatePoolFor(type, floorNum);
    for (const leaf of leaves) {
      for (const dir of Util.shuffle(DIRS.slice())) {
        for (const tmpl of templatePool) {
          const mask = procgenMaskFor(type, tmpl, chooseShapeForNode({ type }).mask);
          const placed = tryPlaceAdjacent(blockGrid, rooms, leaf, dir, mask, tmpl, type, radius);
          if (placed) return placed;
        }
      }
    }

    for (const room of rooms.values()) {
      for (const dir of DIRS) {
        for (const tmpl of templatePool) {
          const mask = procgenMaskFor(type, tmpl, [[1]]);
          const placed = tryPlaceAdjacent(blockGrid, rooms, room, dir, mask, tmpl, type, radius + 3);
          if (placed) return placed;
        }
      }
    }
    return null;
  }

  let bossNode, treasureNode, shopNode, secretNode, supersecretNode, groupANode, groupBNode;
  const MAX_GRAPH_ATTEMPTS = 5;
  for (let attempt = 0; attempt < MAX_GRAPH_ATTEMPTS; attempt++) {
    rooms = new Map();
    blockGrid = new Map();

    const startPick = pickMaskForType('start', floorNum);
    startRoom = makeRoomInstance('start', 0, 0, startPick.mask, startPick.template);
    commitPlace(blockGrid, rooms, startRoom);

    let normalCount = 0;
    let frontier = [startRoom];
    let guard = 0;
    while (frontier.length && normalCount < targetNormal && guard < 3000) {
      guard++;
      const idx = Util.randi(0, frontier.length - 1);
      const cur = frontier[idx];
      let placedHere = false;
      for (const dir of Util.shuffle(DIRS.slice())) {
        if (normalCount >= targetNormal) break;
        if (RNG.random() >= 0.6) continue;
        const pick = pickMaskForType('normal', floorNum);
        const placed = tryPlaceAdjacent(blockGrid, rooms, cur, dir, pick.mask, pick.template, 'normal', radius);
        if (placed) { frontier.push(placed); normalCount++; placedHere = true; }
      }
      if (!placedHere) frontier.splice(idx, 1);
    }

    if (normalCount < minNormal) {
      const retryRadius = radius + 3;
      frontier = [...rooms.values()].filter(r => r.type === 'start' || r.type === 'normal');
      guard = 0;
      while (frontier.length && normalCount < targetNormal && guard < 3000) {
        guard++;
        const idx = Util.randi(0, frontier.length - 1);
        const cur = frontier[idx];
        let placedHere = false;
        for (const dir of Util.shuffle(DIRS.slice())) {
          if (normalCount >= targetNormal) break;
          if (RNG.random() >= 0.6) continue;
          const pick = pickMaskForType('normal', floorNum);
          const placed = tryPlaceAdjacent(blockGrid, rooms, cur, dir, pick.mask, pick.template, 'normal', retryRadius);
          if (placed) { frontier.push(placed); normalCount++; placedHere = true; }
        }
        if (!placedHere) frontier.splice(idx, 1);
      }
    }

    const normalRooms = [...rooms.values()].filter(r => r.type === 'normal');
    if (normalRooms.length) Util.choice(normalRooms).forceSwarm = true;

    distances = new Map([[startRoom.id, 0]]);
    const bq = [startRoom];
    let bh = 0;
    while (bh < bq.length) {
      const cur = bq[bh++];
      const d = distances.get(cur.id);
      for (const slot of cur.doorSlots) {
        if (!slot.pairedSlot || slot.type === 'secret' || slot.type === 'supersecret') continue;
        const nid = slot.pairedSlot.room.id;
        if (distances.has(nid)) continue;
        distances.set(nid, d + 1);
        bq.push(slot.pairedSlot.room);
      }
    }

    bossNode = attachSpecial('boss');
    treasureNode = attachSpecial('treasure');
    shopNode = attachSpecial('shop');
    secretNode = attachSecretRoom(rooms, blockGrid, radius, floorNum);
    supersecretNode = attachSuperSecretRoom(rooms, blockGrid, radius, floorNum);
    groupANode = attachSpecial(groupAType);
    groupBNode = attachSpecial(groupBType);

    const footprintSum = [...rooms.values()].reduce((sum, r) => sum + roomBlockCells(r).length, 0);

    const ok = normalCount >= minNormal && bossNode && treasureNode && shopNode &&
      secretNode && supersecretNode && groupANode && groupBNode && footprintSum <= footprintCap;
    if (ok || attempt === MAX_GRAPH_ATTEMPTS - 1) break;
  }

  const curseNode = groupAType === 'curse' ? groupANode : null;
  const sacrificeNode = groupAType === 'sacrifice' ? groupANode : null;
  const challengeNode = groupAType === 'challenge' ? groupANode : null;
  const minibossNode = groupAType === 'miniboss' ? groupANode : null;
  const shrineNode = groupBType === 'shrine' ? groupBNode : null;
  const petshopNode = groupBType === 'petshop' ? groupBNode : null;
  const vaultNode = groupBType === 'vault' ? groupBNode : null;
  const arcadeNode = groupBType === 'arcade' ? groupBNode : null;
  const karmaNode = groupBType === 'karma' ? groupBNode : null;
  const bosschallengeNode = groupAType === 'bosschallenge' ? groupANode : null;

  const starNode = starRolled ? attachSpecial('star') : null;

  const mirrorNode = ((floorNum + 1) % 5 === 0) ? attachSpecial('mirror') : null;

  const cpathgateNode = (floorNum === 1 && isPathUnlocked('C')) ? attachSpecial('cpathgate') : null;

  const planetariumNode = (floorNum === 2 && !currentFloorPath() && isPathUnlocked('D')) ? attachSpecial('planetarium') : null;

  const floorfeatureNode = floorNum > OLD_MAIN_ROUTE_FINAL_FLOOR ? attachSpecial('floorfeature') : null;

  function attachNextTo(anchor, type){
    if (!anchor) return null;
    const templatePool = procgenTemplatePoolFor(type, floorNum);
    for (const dir of Util.shuffle(DIRS.slice())) {
      for (const tmpl of templatePool) {
        const mask = procgenMaskFor(type, tmpl, chooseShapeForNode({ type }).mask);
        const placed = tryPlaceAdjacent(blockGrid, rooms, anchor, dir, mask, tmpl, type, radius);
        if (placed) return placed;
      }
    }
    return null;
  }

  let crystalNode = null, sombraNode = null;
  if (bossNode) {
    const g = (typeof game !== 'undefined') ? game : null;
    const kirinFreebieSpent = !!(g && g.player && g.player.def && g.player.def.id === 'kirin' && g.player.dealFreebieUsed);
    if (!kirinFreebieSpent) {
      const tookDamage = !!(g && g.player && g.player.tookDamageThisFloor);
      const chance = tookDamage ? 0.16 : 0.50;
      if (RNG.random() < chance) {
        const dealType = (g && g.dealAlignment) ? g.dealAlignment : Util.choice(['crystal', 'sombra']);

        bossNode.maxDoors = 3;
        const placed = attachNextTo(bossNode, dealType);
        if (dealType === 'crystal') crystalNode = placed; else sombraNode = placed;
        bossNode.maxDoors = 1;
      }
    }
  }

  const secondBossNode = (!currentFloorPath() && (floorNum === 8 || floorNum === 9 || floorNum === 10 || floorNum === 11))
    ? attachSpecial('boss') : null;

  let minX = 0, maxX = 0, minY = 0, maxY = 0;
  for (const r of rooms.values()) {
    minX = Math.min(minX, r.gx); maxX = Math.max(maxX, r.gx);
    minY = Math.min(minY, r.gy); maxY = Math.max(maxY, r.gy);
  }

  return {
    rooms, start: startRoom, bossNode, treasureNode, shopNode, secretNode, supersecretNode,
    petshopNode, curseNode, sacrificeNode, vaultNode, challengeNode, starNode, crystalNode, sombraNode, secondBossNode,
    cpathgateNode, planetariumNode, shrineNode, arcadeNode, floorfeatureNode, minibossNode,
    mirrorNode, karmaNode, bosschallengeNode,
    bounds: { minX, maxX, minY, maxY },
    floorNum,
  };
}
