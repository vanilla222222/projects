'use strict';

const T_VOID = 0, T_FLOOR = 1, T_WALL = 2, T_DOOR = 3, T_SECRET = 4, T_SECRET_OPEN = 5;

function chooseShapeForNode(node){
  if (node.type === 'start') return { name:'single', w:1, mask:[[1]] };
  if (node.type === 'boss') return pickRoomShape(2, 4);
  if (node.type === 'treasure' || node.type === 'shop' || node.type === 'secret'
      || node.type === 'petshop' || node.type === 'curse' || node.type === 'sacrifice'
      || node.type === 'star' || node.type === 'cpathgate' || node.type === 'planetarium') {
    return RNG.random() < 0.65 ? pickRoomShape(1, 1) : pickRoomShape(2, 2);
  }
  return pickRoomShape(1, 4);
}

function doorSlotCells(slot){
  const c = slot.localCol, r = slot.localRow;
  if (slot.dir === 'N' || slot.dir === 'S') {
    const y = slot.dir === 'N' ? r * BLOCK : (r + 1) * BLOCK + 1;
    const x0 = 1 + c * BLOCK + 4;
    return [{ x: x0, y }, { x: x0 + 1, y }];
  }
  const x = slot.dir === 'W' ? c * BLOCK : (c + 1) * BLOCK + 1;
  const y0 = 1 + r * BLOCK + 4;
  return [{ x, y: y0 }, { x, y: y0 + 1 }];
}

function buildRoomTiles(node){
  const shape = node.shape;
  const mask = shape.mask;
  const blockH = mask.length, blockW = mask[0].length;
  const tileW = blockW * BLOCK + 2;
  const tileH = blockH * BLOCK + 2;

  const grid = [];
  for (let y = 0; y < tileH; y++) grid.push(new Array(tileW).fill(T_VOID));

  for (let by = 0; by < blockH; by++) {
    for (let bx = 0; bx < blockW; bx++) {
      if (!mask[by][bx]) continue;
      for (let ty = 0; ty < BLOCK; ty++) {
        for (let tx = 0; tx < BLOCK; tx++) {
          grid[1 + by * BLOCK + ty][1 + bx * BLOCK + tx] = T_FLOOR;
        }
      }
    }
  }

  for (let y = 0; y < tileH; y++) {
    for (let x = 0; x < tileW; x++) {
      if (grid[y][x] !== T_VOID) continue;
      const touchesFloor =
        (y > 0 && grid[y - 1][x] === T_FLOOR) || (y < tileH - 1 && grid[y + 1][x] === T_FLOOR) ||
        (x > 0 && grid[y][x - 1] === T_FLOOR) || (x < tileW - 1 && grid[y][x + 1] === T_FLOOR);
      if (touchesFloor) grid[y][x] = T_WALL;
    }
  }

  for (const slot of (node.doorSlots || [])) {
    if (slot.type !== 'normal' && slot.type !== 'secret' && slot.type !== 'supersecret') { slot.cells = null; continue; }
    const cells = doorSlotCells(slot).filter(c => c.x >= 0 && c.y >= 0 && c.x < tileW && c.y < tileH);
    slot.cells = cells;
    for (const c of cells) grid[c.y][c.x] = slot.type === 'normal' ? T_DOOR : T_SECRET;
  }

  return { grid, tileW, tileH };
}

function ensureRoomBuilt(node){

  if (node.tiles) return;
  const built = buildRoomTiles(node);
  node.tiles = built.grid;
  node.tileW = built.tileW;
  node.tileH = built.tileH;

}

function roomFloorTiles(node, opts){
  opts = opts || {};
  const list = [];
  const cx = node.tileW / 2, cy = node.tileH / 2;
  for (let y = 1; y < node.tileH - 1; y++) {
    for (let x = 1; x < node.tileW - 1; x++) {
      if (node.tiles[y][x] !== T_FLOOR) continue;
      if (opts.avoidCenter && Util.dist(x, y, cx, cy) < opts.avoidCenter) continue;
      if (opts.avoidDoors) {
        let nearDoor = false;
        for (const slot of node.doorSlots) {
          if (!slot.cells) continue;
          for (const c of slot.cells) if (Util.dist(x, y, c.x, c.y) < opts.avoidDoors) nearDoor = true;
        }
        if (nearDoor) continue;
      }
      list.push({ x, y });
    }
  }
  return list;
}

function tileToPx(t){ return t * TILE + TILE / 2; }

function populateRoom(node, dungeon, opts){
  if (node.populated) return;
  node.populated = true;
  node.enemies = [];
  node.obstacles = [];
  node.pickups = [];
  node.chests = [];
  node.itemPedestals = [];
  node.shopSlots = null;
  node.donationMachine = null;
  node.rerollAltar = null;
  node.fillies = [];
  node.machines = [];
  node.karmaMachines = [];

  resetRoomEnemyBias();

  if (node.template) populateRoomFromTemplate(node, dungeon, opts);
  else populateRoomProcedural(node, dungeon, opts);

  if (node.type === 'shop') {
    const spot = findNearestFloor(node, Math.floor(node.tileW * 0.82), Math.floor(node.tileH * 0.82));
    node.donationMachine = { x: spot.x, y: spot.y };

    let aSpot = findNearestFloor(node, Math.floor(node.tileW * 0.18), Math.floor(node.tileH * 0.82));

    if (aSpot.x === spot.x && aSpot.y === spot.y) {
      aSpot = findNearestFloor(node, Math.floor(node.tileW * 0.18), Math.floor(node.tileH * 0.18));
    }
    node.rerollAltar = { x: aSpot.x, y: aSpot.y, uses: 0 };
  }

  if (node.type === 'petshop' && !node.itemPedestals.some(p => p.isFamiliar)) {
    const spot = findNearestFloor(node, Math.floor(node.tileW / 2), Math.floor(node.tileH / 2));
    const familiar = pickFamiliarFromPool();
    if (familiar) addFamiliarPedestal(node, familiar, spot.x, spot.y);
    else addItemPedestal(node, pickItemFromPool('treasure'), spot.x, spot.y);
  }

  if (node.type === 'shrine' && !node.itemPedestals.some(p => p.isShrine)) {
    const spot = findNearestFloor(node, Math.floor(node.tileW / 2), Math.floor(node.tileH / 2));
    const coinCost = Math.min(30, 8 + dungeon.floorNum * 3);
    addShrinePedestal(node, pickItemFromPool('shrine'), spot.x, spot.y, coinCost);
  }

  if (node.type === 'arcade' && !node.fillies.length && !node.machines.length) {
    const FILLY_KINDS = ['coin', 'bomb', 'key', 'heart', 'battery'];
    const MACHINE_KINDS = ['friendship', 'tools', 'dark'];
    const allKinds = Util.shuffle(FILLY_KINDS.concat(MACHINE_KINDS));
    const count = Util.randi(2, 4);
    const picks = allKinds.slice(0, count);

    const spotFracs = Util.shuffle([
      { x:0.25, y:0.25 }, { x:0.75, y:0.25 }, { x:0.25, y:0.75 }, { x:0.75, y:0.75 },
      { x:0.5, y:0.25 }, { x:0.25, y:0.5 }, { x:0.75, y:0.5 }, { x:0.5, y:0.75 },
    ]);
    const takenSpots = [];
    for (let i = 0; i < picks.length; i++) {
      const frac = spotFracs[i % spotFracs.length];
      let spot = findNearestFloor(node, Math.floor(node.tileW * frac.x), Math.floor(node.tileH * frac.y));

      if (takenSpots.some(s => s.x === spot.x && s.y === spot.y)) {
        spot = findNearestFloor(node, spot.x + (i % 2 === 0 ? 1 : -1), spot.y + (i < 2 ? 1 : -1));
      }
      takenSpots.push(spot);
      const kind = picks[i];
      if (FILLY_KINDS.includes(kind)) {

        node.fillies.push({ kind, x: spot.x, y: spot.y, fedCount: 0, done: false });
      } else {
        node.machines.push({ kind, x: spot.x, y: spot.y });
      }
    }
  }

  if (node.type === 'challenge') {
    if (!node.itemPedestals.length) {
      const spot = findNearestFloor(node, Math.floor(node.tileW / 2), Math.floor(node.tileH / 2));
      addItemPedestal(node, pickItemFromPool('challenge'), spot.x, spot.y);
    }
    node.challengeStarted = false;
    node.challengeWave = 0;
    node.challengeTotalWaves = 5;
  }

  if (node.type === 'bosschallenge') {
    if (!node.itemPedestals.length) {
      const spot = findNearestFloor(node, Math.floor(node.tileW / 2), Math.floor(node.tileH / 2));
      addItemPedestal(node, pickItemFromPool('challenge'), spot.x, spot.y);
    }
    node.challengeStarted = false;
    node.challengeWave = 0;
    node.challengeTotalWaves = 1;
  }

  if (node.type === 'mirror') {
    if (!node.itemPedestals.length) {
      const spot = findNearestFloor(node, Math.floor(node.tileW / 2), Math.floor(node.tileH * 0.78));
      addItemPedestal(node, pickItemFromPool('mirror'), spot.x, spot.y);
    }
    if (typeof spawnMirrorBoss === 'function' && !node.enemies.some(e => e.isMirrorBoss)) {
      let mp = null;
      try { mp = (typeof activeGame === 'function' && activeGame()) ? activeGame().player : null; } catch (e) { mp = null; }
      const spot = findClearFloorSpot(node, Math.floor(node.tileW / 2), Math.floor(node.tileH * 0.28));
      const boss = spawnMirrorBoss(mp, spot.x, spot.y, dungeon.floorNum);
      if (boss) {
        node.enemies.push(boss);
        node.doorsOpen = false;
      }
    }
  }

  if (node.type === 'karma' && !node.karmaMachines.length) {
    const coinSpot = findNearestFloor(node, Math.floor(node.tileW / 2), Math.floor(node.tileH * 0.22));
    node.donationMachine = { x: coinSpot.x, y: coinSpot.y };
    const layout = [
      { resource: 'key', x: 0.2, y: 0.45 },
      { resource: 'bomb', x: 0.8, y: 0.45 },
      { resource: 'heart', x: 0.3, y: 0.78 },
      { resource: 'familiar', x: 0.7, y: 0.78 },
    ];
    const taken = [{ x: coinSpot.x, y: coinSpot.y }];
    for (let i = 0; i < layout.length; i++) {
      const f = layout[i];
      let spot = findNearestFloor(node, Math.floor(node.tileW * f.x), Math.floor(node.tileH * f.y));
      if (taken.some(s => s.x === spot.x && s.y === spot.y)) {
        spot = findNearestFloor(node, spot.x + (i % 2 === 0 ? 1 : -1), spot.y);
      }
      taken.push(spot);
      node.karmaMachines.push({ resource: f.resource, x: spot.x, y: spot.y });
    }
  }

  if (node.type === 'sacrifice' && !node.obstacles.some(o => o.kind === 'spike')) {
    const spot = findNearestFloor(node, Math.floor(node.tileW / 2), Math.floor(node.tileH / 2));
    node.obstacles.push(new Obstacle('spike', spot.x, spot.y));
  }

  if (node.forceSwarm) {
    const cx = Math.floor(node.tileW / 2), cy = Math.floor(node.tileH / 2);
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2;
      const s = findClearFloorSpot(node, cx + Math.round(Math.cos(ang) * 2), cy + Math.round(Math.sin(ang) * 2));
      node.enemies.push(new Enemy(ENEMY_TYPES.swarmerdnb, s.x, s.y, dungeon.floorNum));
    }
  }

  if (node.type === 'normal' && !node.enemies.some(e => e.isChampion) && Util.chance(0.05)) {
    const candidates = node.enemies.filter(e => !e.isBoss && !e.isDead);
    if (candidates.length) {
      const champ = Util.choice(candidates);
      champ.isChampion = true;
      champ.hp = champ.maxHp = champ.hp * 2;
      champ.dmg = champ.dmg * 2;
    }
  }

  if ((node.type === 'normal' || node.type === 'boss' || node.type === 'miniboss') && node.enemies.length === 0) {
    node.doorsOpen = true;
    node.cleared = true;
  }

  computePitMasks(node);
  computeRockMasks(node);
}

function computePitMasks(node){
  const pits = node.obstacles.filter(o => o.isPit);
  if (!pits.length) return;
  const at = new Set();
  for (const p of pits) at.add(p.tx + ',' + p.ty);
  for (const p of pits) {
    let m = 0;
    if (at.has(p.tx + ',' + (p.ty - 1))) m |= PIT_N;
    if (at.has((p.tx + 1) + ',' + p.ty)) m |= PIT_E;
    if (at.has(p.tx + ',' + (p.ty + 1))) m |= PIT_S;
    if (at.has((p.tx - 1) + ',' + p.ty)) m |= PIT_W;
    p._pitMask = m;
  }
}

function computeRockMasks(node){
  const rockKinds = new Set(['rock', 'hardrock', 'tallrock', 'tallhardrock', 'spikedrock']);
  const rocks = node.obstacles.filter(o => rockKinds.has(o.kind));
  if (!rocks.length) return;
  const at = new Set();
  for (const r of rocks) at.add(r.tx + ',' + r.ty);
  for (const r of rocks) {
    let m = 0;
    if (at.has(r.tx + ',' + (r.ty - 1))) m |= PIT_N;
    if (at.has((r.tx + 1) + ',' + r.ty)) m |= PIT_E;
    if (at.has(r.tx + ',' + (r.ty + 1))) m |= PIT_S;
    if (at.has((r.tx - 1) + ',' + r.ty)) m |= PIT_W;
    r._rockMask = m;
  }
}

const PROCGEN_SCATTER_KINDS = [
  'rock', 'hardrock', 'pit', 'tallrock', 'tallhardrock',
  'cactus', 'yellowfire', 'redfire', 'bluefire', 'purplefire', 'greenfire', 'whitefire', 'blackfire',
  'spiketrap', 'spikedrock', 'tintedrock', 'thornbush', 'luckcrystal', 'movingspike',
  'sandtrap', 'mud', 'currentn', 'currents', 'currente', 'currentw',
  'turretn', 'turrete', 'turrets', 'turretw', 'turretplus', 'turretx', 'turrettarget', 'turretspinner',
  'bombbarrel', 'pushablebombbarrel', 'glimmerrock', 'frostvent', 'thornspire', 'driftstone',
  'cinderkeg', 'stunspore', 'glasscolumn', 'sparkbush', 'magmapod',
  'boneshard', 'graveslick', 'brambletangle', 'pollenpuff', 'duneslip', 'mirageheat', 'ashfall', 'cinderdraft',
  'echostatic', 'signalrot', 'nullpulse', 'rimecrust', 'frostbite', 'rustspur', 'grittide', 'shellspike',
  'undertow', 'saltspray', 'ripcurrent', 'siltcloud', 'wreckrust', 'coldseep', 'pressureveil', 'smokervent',
  'blacksilt', 'voideddrift', 'hushglow', 'marginrift', 'authorsmark', 'foldshear', 'lastexit',
  'overflowgrime', 'effluentooze', 'canopydrip', 'rootsnag', 'navewash', 'bleachedspine', 'scaldingjet',
  'bellrust', 'lightlessdrag', 'mawgrip', 'dustlens', 'brokenglass', 'lensflare', 'meridiandrag', 'gearjam',
  'brasscog', 'colddrift', 'eventhorizon', 'lastlightflare',
];

const PROCGEN_STRONG_EXACT_KINDS = new Set(['tintedrock', 'crushvent', 'lurehorn', 'dustvent', 'spikedrock']);

const PROCGEN_WALL_AFFINITY_KINDS = new Set(['turretn', 'turrete', 'turrets', 'turretw', 'turrettarget', 'turretspinner', 'sparkbush', 'thornspire', 'glasscolumn', 'frostvent', 'magmapod', 'cinderkeg', 'bombbarrel', 'pushablebombbarrel']);

const PROCGEN_OPEN_AFFINITY_KINDS = new Set(['turretplus', 'turretx', 'pit', 'currentn', 'currents', 'currente', 'currentw', 'driftstone', 'spiketrap', 'movingspike', 'sandtrap', 'mud', 'cactus', 'thornbush', 'stunspore',
  'boneshard', 'graveslick', 'brambletangle', 'pollenpuff', 'duneslip', 'mirageheat', 'ashfall', 'cinderdraft',
  'echostatic', 'signalrot', 'nullpulse', 'rimecrust', 'frostbite', 'rustspur', 'grittide', 'shellspike',
  'undertow', 'saltspray', 'ripcurrent', 'siltcloud', 'wreckrust', 'coldseep', 'pressureveil', 'smokervent',
  'blacksilt', 'voideddrift', 'hushglow', 'marginrift', 'authorsmark', 'foldshear', 'lastexit',
  'overflowgrime', 'effluentooze', 'canopydrip', 'rootsnag', 'navewash', 'bleachedspine', 'scaldingjet',
  'bellrust', 'lightlessdrag', 'mawgrip', 'dustlens', 'brokenglass', 'lensflare', 'meridiandrag', 'gearjam',
  'brasscog', 'colddrift', 'eventhorizon', 'lastlightflare']);

const PROCGEN_CLUSTER_FAMILY_KINDS = new Set(['rock', 'hardrock', 'tallrock', 'tallhardrock', 'spikedrock', 'bombbarrel', 'pushablebombbarrel', 'cinderkeg', 'yellowfire', 'redfire', 'bluefire', 'purplefire', 'greenfire', 'whitefire', 'blackfire', 'sandtrap', 'mud', 'pit', 'glasscolumn', 'currentn', 'currents', 'currente', 'currentw']);

const PROCGEN_BLOB_FAMILY_KINDS = new Set(['rock', 'hardrock', 'tallrock', 'tallhardrock', 'spikedrock', 'pit']);

const PROCGEN_CURRENT_DIRS = { currentn: { dx: 0, dy: -1 }, currents: { dx: 0, dy: 1 }, currente: { dx: 1, dy: 0 }, currentw: { dx: -1, dy: 0 } };

const PROCGEN_TURRET_BACK_DIR = { turretn: { dx: 0, dy: 1 }, turrete: { dx: -1, dy: 0 }, turrets: { dx: 0, dy: -1 }, turretw: { dx: 1, dy: 0 } };

const PROCGEN_FLAVOR_RESTRICT = {
  stunspore: new Set(['leaf', 'silt']),
  glasscolumn: new Set(['crystal', 'void']),
  frostvent: new Set(['ice']),
  magmapod: new Set(['fire']),
  cinderkeg: new Set(['fire', 'rust']),
  thornspire: new Set(['leaf', 'rust']),
  glimmerrock: new Set(['crystal']),
  driftstone: new Set(['tide', 'abyss', 'vent']),
  sparkbush: new Set(['leaf', 'rust']),
};

function procgenIsStrongKind(kind){
  return typeof kind === 'string' && (kind.startsWith('turret') || PROCGEN_STRONG_EXACT_KINDS.has(kind));
}

function procgenSpawnPriority(kind){
  return typeof kind === 'string' && kind.startsWith('turret') ? 1 : 0;
}

function procgenScatterCandidates(floorNum, floorPath){
  const out = [];
  for (const kind of PROCGEN_SCATTER_KINDS) {
    const def = OBSTACLES[kind];
    if (!def || !def.weight) continue;
    if (!obstacleAllowedOnFloor(kind, floorNum, floorPath)) continue;
    out.push({ w: def.weight, kind });
  }
  return out;
}

const PROCGEN_FLOORFEATURE_EXCLUDE = new Set(['spike', 'floorswitch']);

function procgenFloorfeatureCandidates(floorNum, floorPath){
  const scatter = new Set(PROCGEN_SCATTER_KINDS);
  const out = [];
  for (const kind in OBSTACLES) {
    if (scatter.has(kind) || PROCGEN_FLOORFEATURE_EXCLUDE.has(kind)) continue;
    const def = OBSTACLES[kind];
    if (!def || !def.weight) continue;
    if (!obstacleAllowedOnFloor(kind, floorNum, floorPath)) continue;
    out.push({ w: def.weight, kind });
  }
  return out;
}

function procgenRoomFloorBounds(node){
  const none = new Set();
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let y = 0; y < node.tileH; y++) {
    for (let x = 0; x < node.tileW; x++) {
      if (procgenTileBlocked(node, x, y, none)) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (minX > maxX || minY > maxY) return null;
  return { minX, minY, maxX, maxY };
}

function procgenHazardLineRaw(kind, bounds){
  if (Util.chance(0.5)) {
    const y = Util.randi(bounds.minY, bounds.maxY);
    return [bounds.minX, y, 'o', kind, bounds.maxX, y];
  }
  const x = Util.randi(bounds.minX, bounds.maxX);
  return [x, bounds.minY, 'o', kind, x, bounds.maxY];
}

const PROCGEN_CURSE_REWARD_KINDS = ['coin', 'coin:luckypenny', 'key', 'goldbomb', 'heartBlue', 'sack', 'pill'];
const PROCGEN_VAULT_REWARD_KINDS = ['coin:dime', 'goldbomb', 'goldkey', 'heartBlue', 'sack', 'heartContainer'];

const PROCGEN_DECOR_ANCHOR_FRACS = {
  shop: [[0.82, 0.82], [0.18, 0.82], [0.18, 0.18]],
  karma: [[0.5, 0.22], [0.2, 0.45], [0.8, 0.45], [0.3, 0.78], [0.7, 0.78]],
  arcade: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75], [0.5, 0.25], [0.25, 0.5], [0.75, 0.5], [0.5, 0.75]],
};

const DECOR_PROP_POOLS = {
  dust: ['pebble', 'rubble'],
  bone: ['bonechip', 'skull', 'rubble'],
  leaf: ['leaftuft', 'twig', 'mushroom'],
  sand: ['sandripple', 'pebble', 'bonechip'],
  fire: ['ashpile', 'ember', 'rubble'],
  ice: ['iceshard', 'crystalshard', 'pebble'],
  rust: ['rustflake', 'rubble', 'pebble'],
  shell: ['shell', 'kelp', 'pebble'],
  tide: ['kelp', 'shell', 'siltmound'],
  silt: ['siltmound', 'tubeworm', 'shell'],
  abyss: ['tubeworm', 'siltmound', 'pebble'],
  vent: ['ember', 'ashpile', 'tubeworm'],
  void: ['stardust', 'crystalshard', 'pebble'],
  crystal: ['crystalshard', 'stardust', 'rubble'],
  moss: ['mosspatch', 'mushroom', 'pebble'],
  slime: ['mudsplat', 'mosspatch', 'mushroom'],
  mud: ['mudsplat', 'twig', 'siltmound'],
};

const DECOR_MAX_PROPS = 14;

function decorPoolFor(flavor){ return DECOR_PROP_POOLS[flavor] || DECOR_PROP_POOLS.dust; }

function roomDecorFlavor(floorNum, floorPath, floorBranch){
  if (typeof floorPaletteFor !== 'function' || typeof paletteFlavor !== 'function') return 'dust';
  return paletteFlavor(floorPaletteFor(floorNum, floorPath, floorBranch));
}

function roomBlockCount(node){
  const mask = node.shape && node.shape.mask;
  if (!mask) return 1;
  let n = 0;
  for (const row of mask) for (const v of row) if (v) n++;
  return Math.max(1, n);
}

const SCATTER_BASE_MAX = 6;
const SCATTER_MAX_CAP = 18;
const SCATTER_BLOCK_STEP = 2.0;
const SCATTER_WALL_BIAS_FRACTION = 0.5;
const SCATTER_WALL_BIAS_SAMPLE = 9;
const SCATTER_CLUSTER_CHANCE = 0.25;
const SCATTER_CLUSTER_RADIUS = 3.2;
const SCATTER_CLUSTER_SIZE_BASE = 3;
const SCATTER_CLUSTER_SIZE_STEP = 1.5;
const SCATTER_CLUSTER_HARD_CAP = 10;
const SCATTER_BLOB_CLUSTER_CHANCE = 0.55;
const SCATTER_BLOB_SIZE_BONUS = 3;
const SCATTER_BLOB_HARD_CAP = 14;

function scatterCountRange(node){
  return Math.min(SCATTER_MAX_CAP, SCATTER_BASE_MAX + Math.round((roomBlockCount(node) - 1) * SCATTER_BLOCK_STEP));
}

const ARENA_SCATTER_MAX = 6;
function arenaScatterCount(node){
  return Math.min(ARENA_SCATTER_MAX, 1 + Math.floor(roomBlockCount(node) * 1.5));
}

const PROCGEN_SETPIECE_CHANCE = 0.2;

const PROCGEN_SETPIECE_CORE_KINDS = new Set(['rock', 'hardrock', 'tallrock', 'tallhardrock', 'pit', 'redfire', 'yellowfire', 'turretn', 'turrete', 'turrets', 'turretw']);

const PROCGEN_SETPIECE_SHAPE_BUILDERS = [
  (r, cx, cy) => [[cx - r, cy - r], [cx + r, cy - r], [cx - r, cy + r], [cx + r, cy + r]],
  (r, cx, cy) => [[cx, cy - r], [cx, cy + r], [cx - r, cy], [cx + r, cy]],
  (r, cx, cy) => [[cx - r, cy - 1], [cx + r, cy - 1], [cx - r, cy + 1], [cx + r, cy + 1]],
  (r, cx, cy) => [[cx - 1, cy - r], [cx + 1, cy - r], [cx - 1, cy + r], [cx + 1, cy + r]],
  (r, cx, cy) => [[cx - r, cy], [cx + r, cy], [cx, cy - r], [cx, cy + r], [cx - r, cy - r], [cx + r, cy - r], [cx - r, cy + r], [cx + r, cy + r]],
  (r, cx, cy) => [[cx - r, cy - r], [cx + r, cy - r], [cx, cy], [cx - r, cy + r], [cx + r, cy + r]],
  (r, cx, cy) => [[cx - r, cy - r], [cx - r + 1, cy - r], [cx + r, cy + r], [cx + r - 1, cy + r]],
  (r, cx, cy) => [[cx - r, cy], [cx - r + 1, cy], [cx + r, cy], [cx + r - 1, cy]],
  (r, cx, cy) => [[cx, cy - r], [cx, cy - r + 1], [cx, cy + r], [cx, cy + r - 1]],
  (r, cx, cy) => [[cx - r, cy - r], [cx + r, cy - r], [cx - r, cy + r], [cx + r, cy + r], [cx, cy]],
];

const PROCGEN_SETPIECE_RADII_GENERIC = [2];
const PROCGEN_SETPIECE_RADII_CORE = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

function buildSetpiecePatternPool(radii){
  const pool = [];
  for (const r of radii) for (const build of PROCGEN_SETPIECE_SHAPE_BUILDERS) pool.push((cx, cy) => build(r, cx, cy));
  return pool;
}

const PROCGEN_SETPIECE_POOL_GENERIC = buildSetpiecePatternPool(PROCGEN_SETPIECE_RADII_GENERIC);
const PROCGEN_SETPIECE_POOL_CORE = buildSetpiecePatternPool(PROCGEN_SETPIECE_RADII_CORE);

function clusterMaxSize(node){
  return Math.min(SCATTER_CLUSTER_HARD_CAP, SCATTER_CLUSTER_SIZE_BASE + Math.round(roomBlockCount(node) * SCATTER_CLUSTER_SIZE_STEP));
}

function blobClusterMaxSize(node){
  return Math.min(SCATTER_BLOB_HARD_CAP, clusterMaxSize(node) + SCATTER_BLOB_SIZE_BONUS);
}

function roomWallDistMap(node){
  const w = node.tileW, h = node.tileH;
  const dist = new Int16Array(w * h).fill(-1);
  const q = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (node.tiles[y][x] !== T_FLOOR) { dist[y * w + x] = 0; q.push(y * w + x); }
    }
  }
  for (let qi = 0; qi < q.length; qi++) {
    const idx = q[qi];
    const x = idx % w, y = (idx - x) / w, d = dist[idx];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const ni = ny * w + nx;
        if (dist[ni] !== -1) continue;
        dist[ni] = d + 1;
        q.push(ni);
      }
    }
  }
  return { w, h, dist };
}

function wallDistAt(map, x, y){
  if (!map || x < 0 || y < 0 || x >= map.w || y >= map.h) return 0;
  const d = map.dist[y * map.w + x];
  return d < 0 ? 99 : d;
}

function decorBlockedTiles(node){
  const blocked = new Set();
  const add = (tx, ty) => blocked.add(tx + ',' + ty);
  const addArea = (tx, ty) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) add(tx + dx, ty + dy); };
  for (const t of doorClearanceTiles(node)) add(t.x, t.y);
  for (const ob of node.obstacles || []) add(ob.tx !== undefined ? ob.tx : Math.floor(ob.x / TILE), ob.ty !== undefined ? ob.ty : Math.floor(ob.y / TILE));
  for (const c of node.chests || []) add(Math.floor(c.x / TILE), Math.floor(c.y / TILE));
  for (const p of node.pickups || []) add(Math.floor(p.x / TILE), Math.floor(p.y / TILE));
  for (const p of node.itemPedestals || []) addArea(p.x, p.y);
  for (const s of node.shopSlots || []) addArea(s.x, s.y);
  for (const s of node.branchSpots || []) addArea(s.x, s.y);
  for (const f of node.fillies || []) addArea(f.x, f.y);
  for (const m of node.machines || []) addArea(m.x, m.y);
  for (const m of node.karmaMachines || []) addArea(m.x, m.y);
  if (node.donationMachine) addArea(node.donationMachine.x, node.donationMachine.y);
  if (node.rerollAltar) addArea(node.rerollAltar.x, node.rerollAltar.y);
  if (node.stairsSpot) addArea(node.stairsSpot.x, node.stairsSpot.y);
  for (const f of node.rewardFrame || []) add(f.tx, f.ty);
  for (const f of PROCGEN_DECOR_ANCHOR_FRACS[node.type] || []) {
    const a = findNearestFloor(node, Math.floor(node.tileW * f[0]), Math.floor(node.tileH * f[1]));
    addArea(a.x, a.y);
  }
  addArea(Math.floor(node.tileW / 2), Math.floor(node.tileH / 2));
  return blocked;
}

function frameReward(node, cx, cy, flavor, opts){
  node.rewardFrame = node.rewardFrame || [];
  const pool = decorPoolFor(flavor);
  const kind = (opts && opts.kind) || Util.choice(pool);
  const radius = (opts && opts.radius) || 2;
  const pattern = (opts && opts.count) === 2
    ? [[0, -radius], [0, radius]]
    : [[-radius, 0], [radius, 0], [0, -radius], [0, radius]];
  const blocked = new Set();
  for (const t of doorClearanceTiles(node)) blocked.add(t.x + ',' + t.y);
  for (const [dx, dy] of pattern) {
    const spot = findNearestFloor(node, cx + dx, cy + dy);
    const key = spot.x + ',' + spot.y;
    if (blocked.has(key) || (spot.x === cx && spot.y === cy)) continue;
    node.rewardFrame.push({
      kind, tx: spot.x, ty: spot.y,
      x: tileToPx(spot.x), y: tileToPx(spot.y),
      seed: Util.rand(0, Math.PI * 2),
      scale: Util.rand(0.85, 1.15),
      flip: Util.chance(0.5) ? -1 : 1,
    });
  }
}

function generateRoomDecor(node, flavor, spots){
  node.decorProps = (node.rewardFrame || []).slice();
  const pool = decorPoolFor(node.type === 'treasure' || node.type === 'crystal' ? 'crystal' : flavor);
  const blocks = roomBlockCount(node);
  const count = Math.min(DECOR_MAX_PROPS - node.decorProps.length, Util.randi(2, 4) + Math.floor((blocks - 1) * 1.5));
  if (count <= 0 || !spots || !spots.length) return;
  const blocked = decorBlockedTiles(node);
  const used = new Set();
  for (let i = 0; i < count; i++) {
    let s = null;
    for (let attempt = 0; attempt < 14 && spots.length; attempt++) {
      const cand = spots.pop();
      const key = cand.x + ',' + cand.y;
      if (blocked.has(key) || used.has(key)) continue;
      s = cand;
      break;
    }
    if (!s) break;
    used.add(s.x + ',' + s.y);
    node.decorProps.push({
      kind: Util.choice(pool),
      tx: s.x, ty: s.y,
      x: tileToPx(s.x) + Util.rand(-7, 7),
      y: tileToPx(s.y) + Util.rand(-7, 7),
      seed: Util.rand(0, Math.PI * 2),
      scale: Util.rand(0.75, 1.25),
      flip: Util.chance(0.5) ? -1 : 1,
    });
  }
}

function populateRoomProcedural(node, dungeon, opts){
  const floorNum = dungeon.floorNum;
  const floorBranch = opts && opts.floorBranch;
  let spots = roomFloorTiles(node, { avoidDoors: 2.5, avoidCenter: node.type === 'start' ? 0 : 1.2 });
  if (node.type === 'normal') {
    const blocked = new Set();
    for (const t of doorClearanceTiles(node)) blocked.add(t.x + ',' + t.y);
    spots = spots.filter(s => !blocked.has(s.x + ',' + s.y));
  }
  Util.shuffle(spots);

  function takeSpot(){ return spots.length ? spots.pop() : { x: Math.floor(node.tileW/2), y: Math.floor(node.tileH/2) }; }

  function takeSpotWallHugging(wallMap){
    if (!spots.length) return null;
    const sample = Math.min(SCATTER_WALL_BIAS_SAMPLE, spots.length);
    let best = spots.length - 1, bestD = Infinity;
    for (let i = spots.length - sample; i < spots.length; i++) {
      const d = wallDistAt(wallMap, spots[i].x, spots[i].y);
      if (d < bestD) { bestD = d; best = i; }
    }
    return spots.splice(best, 1)[0];
  }

  function takeSpotExact(tx, ty){
    for (let i = 0; i < spots.length; i++) {
      if (spots[i].x === tx && spots[i].y === ty) return spots.splice(i, 1)[0];
    }
    return null;
  }

  function takeSpotBackToWall(wallMap, dir){
    if (!spots.length) return null;
    if (!dir) return takeSpotWallHugging(wallMap);
    const sample = Math.min(SCATTER_WALL_BIAS_SAMPLE, spots.length);
    let best = -1, bestD = Infinity;
    for (let i = spots.length - sample; i < spots.length; i++) {
      const bx = spots[i].x + dir.dx, by = spots[i].y + dir.dy;
      const solid = bx < 0 || by < 0 || bx >= node.tileW || by >= node.tileH || node.tiles[by][bx] !== T_FLOOR;
      if (!solid) continue;
      const d = wallDistAt(wallMap, spots[i].x, spots[i].y);
      if (d < bestD) { bestD = d; best = i; }
    }
    if (best < 0) return takeSpotWallHugging(wallMap);
    return spots.splice(best, 1)[0];
  }

  function takeSpotNear(anchor){
    let best = -1, bestD = Infinity;
    for (let i = 0; i < spots.length; i++) {
      const d = Util.dist(spots[i].x, spots[i].y, anchor.x, anchor.y);
      if (d <= SCATTER_CLUSTER_RADIUS && d < bestD) { bestD = d; best = i; }
    }
    if (best < 0) return null;
    return spots.splice(best, 1)[0];
  }

  function takeSpotAdjacent(clusterTiles){
    if (!spots.length || !clusterTiles || !clusterTiles.length) return null;
    const matches = [];
    for (let i = 0; i < spots.length; i++) {
      const sx = spots[i].x, sy = spots[i].y;
      for (const t of clusterTiles) {
        const dx = Math.abs(sx - t.x), dy = Math.abs(sy - t.y);
        if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) { matches.push(i); break; }
      }
    }
    if (!matches.length) return null;
    return spots.splice(matches[Util.randi(0, matches.length - 1)], 1)[0];
  }

  function scatterObstacles(count){
    const floorPath = typeof currentFloorPath === 'function' ? currentFloorPath() : undefined;
    const candidates = procgenScatterCandidates(floorNum, floorPath);
    if (!candidates.length) return [];
    const flavor = roomDecorFlavor(floorNum, floorPath, floorBranch);
    const flavorFiltered = candidates.filter(c => !PROCGEN_FLAVOR_RESTRICT[c.kind] || PROCGEN_FLAVOR_RESTRICT[c.kind].has(flavor));
    const gatedCandidates = flavorFiltered.length ? flavorFiltered : candidates;
    const wallMap = roomWallDistMap(node);
    const usedStrongBlocks = new Set();
    const usedKindsThisRoom = new Set();
    const rareKindsUsed = new Set();
    const placed = [];
    const pending = [];
    const rollKind = () => {
      let pool = gatedCandidates;
      if (usedKindsThisRoom.size >= 3) {
        const capped = pool.filter(c => usedKindsThisRoom.has(c.kind));
        if (capped.length) pool = capped;
      }
      if (rareKindsUsed.size) {
        const rarePruned = pool.filter(c => !rareKindsUsed.has(c.kind));
        if (rarePruned.length) pool = rarePruned;
      }
      return Util.weighted(pool).kind;
    };
    const markKindUsed = (kind) => {
      usedKindsThisRoom.add(kind);
      if (OBSTACLES[kind] && OBSTACLES[kind].weight < 1) rareKindsUsed.add(kind);
    };
    const wallSpot = () => takeSpotWallHugging(wallMap) || takeSpot();
    const spotForKind = (kind) => {
      if (PROCGEN_TURRET_BACK_DIR[kind]) return Util.chance(0.85) ? (takeSpotBackToWall(wallMap, PROCGEN_TURRET_BACK_DIR[kind]) || takeSpot()) : takeSpot();
      if (kind === 'movingspike') return Util.chance(0.85) ? wallSpot() : takeSpot();
      if (PROCGEN_WALL_AFFINITY_KINDS.has(kind)) return Util.chance(0.85) ? wallSpot() : takeSpot();
      if (PROCGEN_OPEN_AFFINITY_KINDS.has(kind)) return Util.chance(0.85) ? takeSpot() : wallSpot();
      return Util.chance(SCATTER_WALL_BIAS_FRACTION) ? wallSpot() : takeSpot();
    };
    const endCluster = () => { clusterKind = null; clusterAnchor = null; clusterRemaining = 0; clusterTiles = []; };
    let clusterKind = null, clusterAnchor = null, clusterRemaining = 0, clusterTiles = [];
    for (let i = 0; i < count; i++) {
      if (!spots.length) break;
      let kind = null, s = null, clusterTile = false, startedCluster = false;
      if (clusterRemaining > 0 && clusterKind) {
        const dir = PROCGEN_CURRENT_DIRS[clusterKind];
        if (dir) {
          s = takeSpotExact(clusterAnchor.x + dir.dx, clusterAnchor.y + dir.dy);
          if (s) { kind = clusterKind; clusterTile = true; clusterAnchor = s; clusterTiles.push(s); }
          else endCluster();
        } else if (PROCGEN_BLOB_FAMILY_KINDS.has(clusterKind)) {
          s = takeSpotAdjacent(clusterTiles);
          if (s) { kind = clusterKind; clusterTile = true; clusterTiles.push(s); }
          else endCluster();
        } else {
          s = takeSpotNear(clusterAnchor);
          if (s) { kind = clusterKind; clusterTile = true; clusterTiles.push(s); }
          else endCluster();
        }
      }
      if (!kind) {
        kind = rollKind();
        const isBlobKind = PROCGEN_BLOB_FAMILY_KINDS.has(kind);
        const clusterChance = isBlobKind ? SCATTER_BLOB_CLUSTER_CHANCE : SCATTER_CLUSTER_CHANCE;
        const clusterCap = isBlobKind ? blobClusterMaxSize(node) : clusterMaxSize(node);
        if (PROCGEN_CLUSTER_FAMILY_KINDS.has(kind) && count - i >= 2 && Util.chance(clusterChance)) {
          s = Util.chance(SCATTER_WALL_BIAS_FRACTION) ? wallSpot() : takeSpot();
          if (s) {
            clusterKind = kind;
            clusterAnchor = s;
            clusterTiles = [s];
            clusterRemaining = Util.randi(1, Math.min(clusterCap - 1, count - i - 1));
            startedCluster = true;
          }
        } else {
          s = spotForKind(kind);
        }
      }
      if (!s) s = takeSpot();
      if (!s) break;
      const blockKey = Math.floor(s.x / BLOCK) + ',' + Math.floor(s.y / BLOCK);
      if (procgenIsStrongKind(kind) && usedStrongBlocks.has(blockKey)) {
        let repick = null;
        for (let attempt = 1; attempt < 6; attempt++) {
          const pick = rollKind();
          if (procgenIsStrongKind(pick) && usedStrongBlocks.has(blockKey)) continue;
          repick = pick;
          break;
        }
        if (startedCluster && repick !== clusterKind) endCluster();
        kind = repick;
      }
      if (clusterTile) {
        clusterRemaining--;
        if (clusterRemaining <= 0) endCluster();
      }
      if (!kind) continue;
      if (procgenIsStrongKind(kind)) usedStrongBlocks.add(blockKey);
      markKindUsed(kind);
      pending.push({ kind, x: s.x, y: s.y });
    }
    pending.sort((a, b) => procgenSpawnPriority(a.kind) - procgenSpawnPriority(b.kind));
    for (const record of pending) {
      const ob = new Obstacle(record.kind, record.x, record.y);
      node.obstacles.push(ob);
      if (procgenSpawnPriority(record.kind) > 0 && !roomIsFullyConnected(node, node.obstacles)) {
        node.obstacles.pop();
        continue;
      }
      placed.push(ob);
    }
    return placed;
  }

  function enforcePathability(placed){
    for (let i = placed.length - 1; i >= 0; i--) {
      if (roomIsFullyConnected(node, node.obstacles)) return;
      const idx = node.obstacles.indexOf(placed[i]);
      if (idx >= 0) node.obstacles.splice(idx, 1);
    }
  }

  function specialDecorScatter(extraBlocked){
    const count = Util.randi(0, 1);
    if (!count) return;
    const floorPath = typeof currentFloorPath === 'function' ? currentFloorPath() : undefined;
    const candidates = procgenScatterCandidates(floorNum, floorPath).filter(c => !procgenIsStrongKind(c.kind));
    if (!candidates.length) return;
    const blocked = new Set();
    for (const t of doorClearanceTiles(node)) blocked.add(t.x + ',' + t.y);
    const anchors = (PROCGEN_DECOR_ANCHOR_FRACS[node.type] || [])
      .map(f => findNearestFloor(node, Math.floor(node.tileW * f[0]), Math.floor(node.tileH * f[1])));
    for (const a of anchors.concat(extraBlocked || [])) {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) blocked.add((a.x + dx) + ',' + (a.y + dy));
    }
    const placed = [];
    for (let i = 0; i < count; i++) {
      let s = null;
      for (let attempt = 0; attempt < 12 && spots.length; attempt++) {
        const cand = spots.pop();
        if (blocked.has(cand.x + ',' + cand.y)) continue;
        s = cand;
        break;
      }
      if (!s) break;
      const ob = new Obstacle(Util.weighted(candidates).kind, s.x, s.y);
      node.obstacles.push(ob);
      placed.push(ob);
    }
    enforcePathability(placed);
  }

  function applyRoomSetPiece(){
    const bounds = procgenRoomFloorBounds(node);
    if (!bounds || bounds.maxX - bounds.minX < 4 || bounds.maxY - bounds.minY < 4) return 0;
    const floorPath = typeof currentFloorPath === 'function' ? currentFloorPath() : undefined;
    const candidates = procgenScatterCandidates(floorNum, floorPath).filter(c => !procgenIsStrongKind(c.kind));
    if (!candidates.length) return 0;
    const flavor = roomDecorFlavor(floorNum, floorPath, floorBranch);
    const flavorFiltered = candidates.filter(c => !PROCGEN_FLAVOR_RESTRICT[c.kind] || PROCGEN_FLAVOR_RESTRICT[c.kind].has(flavor));
    const gated = flavorFiltered.length ? flavorFiltered : candidates;
    const kind = Util.weighted(gated).kind;
    const cx = Math.round((bounds.minX + bounds.maxX) / 2);
    const cy = Math.round((bounds.minY + bounds.maxY) / 2);
    const pool = PROCGEN_SETPIECE_CORE_KINDS.has(kind) ? PROCGEN_SETPIECE_POOL_CORE : PROCGEN_SETPIECE_POOL_GENERIC;
    const positions = Util.choice(pool)(cx, cy);
    const blocked = new Set();
    for (const t of doorClearanceTiles(node)) blocked.add(t.x + ',' + t.y);
    const placedObs = [];
    for (const [tx, ty] of positions) {
      const key = tx + ',' + ty;
      if (blocked.has(key)) continue;
      const idx = spots.findIndex(s => s.x === tx && s.y === ty);
      if (idx < 0) continue;
      spots.splice(idx, 1);
      const ob = new Obstacle(kind, tx, ty);
      node.obstacles.push(ob);
      placedObs.push(ob);
    }
    if (placedObs.length < 2 || !roomIsFullyConnected(node, node.obstacles)) {
      for (const ob of placedObs) { const i = node.obstacles.indexOf(ob); if (i >= 0) node.obstacles.splice(i, 1); spots.push({ x: ob.tx, y: ob.ty }); }
      return 0;
    }
    return placedObs.length;
  }

  if (node.type === 'normal') {
    const budget = Util.clamp(2 + Math.floor(floorNum * 1.3) + Util.randi(0, 2), 2, 8);
    let spent = 0;
    while (spent < budget) {
      if (!spots.length) break;
      const s = takeSpot();
      const type = resolveGenericEnemy(floorNum, floorBranch);

      const n = Math.max(1, type.groupSize || 1);
      for (let i = 0; i < n; i++) {
        const en = new Enemy(type, s.x, s.y, floorNum);
        if (n > 1) { en.x += Util.rand(-10, 10); en.y += Util.rand(-10, 10); }
        node.enemies.push(en);
      }
      spent += n;
    }
    let normalScatterBudget = Util.randi(Math.ceil(scatterCountRange(node) * 0.6), scatterCountRange(node));
    if (Util.chance(PROCGEN_SETPIECE_CHANCE)) normalScatterBudget = Math.max(0, normalScatterBudget - applyRoomSetPiece());
    enforcePathability(scatterObstacles(normalScatterBudget));
    if (spots.length && Util.chance(0.003)) {
      const s = takeSpot();
      node.chests.push(new Chest(Util.weighted(CHEST_TYPE_POOL).id, s.x, s.y));
    }
    if (spots.length && Util.chance(0.01)) {
      const s = takeSpot();
      spawnResolvedPickup(node, rollGenericPickupKind(), s.x, s.y);
    }
    if (spots.length && Util.chance(0.001)) {
      const s = takeSpot();
      const item = pickItemFromPool('treasure');
      if (item) addItemPedestal(node, item, s.x, s.y);
    }
  } else if (node.type === 'boss') {
    const bossType = (opts && opts.bossType) || resolveGenericBoss(floorNum, floorBranch);
    const center = findNearestFloor(node, Math.floor(node.tileW / 2), Math.floor(node.tileH / 2));
    const boss = new Boss(bossType, center.x, center.y, floorNum);
    node.enemies.push(boss);
    node.bossDefeated = false;
    const arenaCount = arenaScatterCount(node);
    enforcePathability(scatterObstacles(Util.randi(Math.ceil(arenaCount * 0.5), arenaCount)));
  } else if (node.type === 'miniboss') {

    const center = findNearestFloor(node, Math.floor(node.tileW / 2), Math.floor(node.tileH / 2));
    node.enemies.push(new Miniboss(resolveMiniboss(floorNum), center.x, center.y, floorNum));
    const arenaCount = arenaScatterCount(node);
    enforcePathability(scatterObstacles(Util.randi(Math.ceil(arenaCount * 0.5), arenaCount)));
  } else if (node.type === 'floorfeature') {
    const floorPath = typeof currentFloorPath === 'function' ? currentFloorPath() : undefined;
    let candidates = procgenFloorfeatureCandidates(floorNum, floorPath);
    if (!candidates.length) candidates = procgenScatterCandidates(floorNum, floorPath);
    const bounds = procgenRoomFloorBounds(node);
    if (candidates.length && bounds) {
      const kinds = [Util.weighted(candidates).kind];
      if (Util.chance(0.2)) {
        for (let i = 0; i < 6; i++) {
          const alt = Util.weighted(candidates).kind;
          if (alt !== kinds[0]) { kinds.push(alt); break; }
        }
      }
      const blocked = new Set();
      for (const t of doorClearanceTiles(node)) blocked.add(t.x + ',' + t.y);
      const noneKeys = new Set();
      for (const kind of kinds) {
        for (let attempt = 0; attempt < 5; attempt++) {
          const placed = [];
          for (const one of expandLineSpawner(procgenHazardLineRaw(kind, bounds))) {
            const tx = one[0], ty = one[1];
            if (blocked.has(tx + ',' + ty)) continue;
            if (procgenTileBlocked(node, tx, ty, noneKeys)) continue;
            const ob = new Obstacle(kind, tx, ty);
            node.obstacles.push(ob);
            placed.push(ob);
          }
          if (placed.length && roomIsFullyConnected(node, node.obstacles)) break;
          for (const ob of placed) {
            const idx = node.obstacles.indexOf(ob);
            if (idx >= 0) node.obstacles.splice(idx, 1);
          }
        }
      }
    }
  } else if (node.type === 'treasure') {
    const tcx = Math.floor(node.tileW / 2), tcy = Math.floor(node.tileH / 2);
    addItemOrTrinketPedestal(node, 'treasure', tcx, tcy, 0.55);
    frameReward(node, tcx, tcy, 'crystal', { radius: 2 });
  } else if (node.type === 'shop') {

    const nSlots = Math.min(SHOP_MAX_SLOTS, Util.randi(3, 4) + shopBonusSlots(floorNum));
    const slotTiles = [];
    for (let i = 0; i < nSlots; i++) {
      const frac = (i + 1) / (nSlots + 1);
      const x = Math.round(1 + frac * (node.tileW - 2));
      const y = Math.floor(node.tileH / 2);
      addShopSlot(node, { kind: 'generic' }, x, y, floorNum);
      slotTiles.push({ x, y });
    }
    specialDecorScatter(slotTiles);
  } else if (node.type === 'karma' || node.type === 'arcade') {
    specialDecorScatter(null);
  } else if (node.type === 'curse') {
    if (Util.chance(0.35)) {
      const ccx = Math.floor(node.tileW / 2), ccy = Math.floor(node.tileH / 2);
      addItemOrTrinketPedestal(node, 'curse', ccx, ccy);
      const curseFlavor = roomDecorFlavor(floorNum, typeof currentFloorPath === 'function' ? currentFloorPath() : undefined, floorBranch);
      frameReward(node, ccx, ccy, curseFlavor, { radius: 2 });
    } else {
      const kind = Util.choice(PROCGEN_CURSE_REWARD_KINDS);
      const n = Util.randi(1, 4);
      for (let i = 0; i < n && spots.length; i++) {
        const s = takeSpot();
        spawnResolvedPickup(node, kind, s.x, s.y);
      }
    }
    specialDecorScatter(null);
  } else if (node.type === 'vault') {
    if (Util.chance(0.4)) {
      const chestKind = Util.weighted(CHEST_TYPE_POOL).id;
      const n = Util.randi(2, 4);
      for (let i = 0; i < n && spots.length; i++) {
        const s = takeSpot();
        node.chests.push(new Chest(chestKind, s.x, s.y));
      }
    } else {
      const kind = Util.choice(PROCGEN_VAULT_REWARD_KINDS);
      const n = kind === 'heartContainer' ? 1 : Util.randi(2, 5);
      for (let i = 0; i < n && spots.length; i++) {
        const s = takeSpot();
        spawnResolvedPickup(node, kind, s.x, s.y);
      }
    }
    specialDecorScatter(null);
  } else if (node.type === 'crystal') {
    const spot = findNearestFloor(node, Math.floor(node.tileW / 2), Math.floor(node.tileH / 2));
    const item = pickItemFromPool('crystal');
    if (item) addDealPedestal(node, item, spot.x, spot.y, 'crystal');
  } else if (node.type === 'sombra') {
    const cx = Math.floor(node.tileW / 2), cy = Math.floor(node.tileH / 2);
    const offs = Util.shuffle([[-2, -2], [2, -2], [-2, 2], [2, 2]]).slice(0, Util.randi(2, 4));
    const taken = new Set();
    for (const off of offs) {
      const spot = findNearestFloor(node, cx + off[0], cy + off[1]);
      const key = spot.x + ',' + spot.y;
      if (taken.has(key)) continue;
      taken.add(key);
      const item = pickItemFromPool('sombra');
      if (item) addDealPedestal(node, item, spot.x, spot.y, 'sombra');
    }
  } else if (node.type === 'supersecret') {
    const cx = Math.floor(node.tileW / 2), cy = Math.floor(node.tileH / 2);
    addItemOrTrinketPedestal(node, 'treasure', cx, cy);
    frameReward(node, cx, cy, 'crystal', { radius: 2 });
    if (Util.chance(0.35)) {
      const a = findNearestFloor(node, cx - 3, cy - 3);
      const b = findNearestFloor(node, cx + 3, cy + 3);
      addItemOrTrinketPedestal(node, 'treasure', a.x, a.y);
      addItemOrTrinketPedestal(node, 'treasure', b.x, b.y);
    }
  } else if (node.type === 'star') {

    const id1 = rollRandomStarId();
    let id2 = rollRandomStarId();
    let guard = 0;
    while (id2 === id1 && guard++ < 8) id2 = rollRandomStarId();
    const cx = Math.floor(node.tileW / 2), cy = Math.floor(node.tileH / 2);

    const left = findNearestFloor(node, cx - 2, cy);
    const right = findNearestFloor(node, cx + 2, cy);
    addStarPedestal(node, id1, left.x, left.y);
    addStarPedestal(node, id2, right.x, right.y);
    frameReward(node, cx, cy, 'crystal', { radius: 1, count: 2 });
  } else if (node.type === 'cpathgate') {

    const cx = Math.floor(node.tileW / 2), cy = Math.floor(node.tileH / 2);
    const spot = findNearestFloor(node, cx, cy);
    node.branchSpots = [{ x: spot.x, y: spot.y, branch: 'C', label: '3C' }];
  } else if (node.type === 'planetarium') {

    const cx = Math.floor(node.tileW / 2), cy = Math.floor(node.tileH / 2);
    const spot = findNearestFloor(node, cx, cy);
    node.branchSpots = [{ x: spot.x, y: spot.y, branch: 'D', label: '4D' }];
  } else if (node.type === 'secret') {

    addItemOrTrinketPedestal(node, 'secret', Math.floor(node.tileW / 2), Math.floor(node.tileH / 2));
    if (Util.chance(0.4) && spots.length) {
      const s = takeSpot();
      node.chests.push(new Chest(Util.weighted(CHEST_TYPE_POOL).id, s.x, s.y));
    }
  }

  const floorPathForDecor = typeof currentFloorPath === 'function' ? currentFloorPath() : undefined;
  generateRoomDecor(node, roomDecorFlavor(floorNum, floorPathForDecor, floorBranch), spots);
}

const SPAWNER_CATEGORY_DECODE = { e:'enemy', p:'pickup', i:'item', d:'deal', s:'shop', o:'obstacle' };
function decodeSpawner(arr){
  const category = SPAWNER_CATEGORY_DECODE[arr[2]] || arr[2];
  if (category === 'obstacle') return { x: arr[0], y: arr[1], category, kind: 'forced', specific: arr[3] };
  const kindCode = arr[3];
  if (kindCode === 'g') return { x: arr[0], y: arr[1], category, kind: 'generic' };
  if (kindCode === 'b') return { x: arr[0], y: arr[1], category, kind: 'genericBoss' };
  if (kindCode === 'S') return { x: arr[0], y: arr[1], category, kind: 'genericSuperboss' };
  return { x: arr[0], y: arr[1], category, kind: 'forced', specific: arr[4] };
}

function expandLineSpawner(raw){
  if (raw[2] !== 'o' || raw.length !== 6) return [raw];
  const [x1, y1, , kind, x2, y2] = raw;
  if (x1 !== x2 && y1 !== y2) {
    console.error('[roomTemplates] line spawner must be axis-aligned (same x or same y):', raw);
    return [[x1, y1, 'o', kind]];
  }
  const pts = [];
  if (x1 === x2) {
    const lo = Math.min(y1, y2), hi = Math.max(y1, y2);
    for (let y = lo; y <= hi; y++) pts.push([x1, y, 'o', kind]);
  } else {
    const lo = Math.min(x1, x2), hi = Math.max(x1, x2);
    for (let x = lo; x <= hi; x++) pts.push([x, y1, 'o', kind]);
  }
  return pts;
}

function populateRoomFromTemplate(node, dungeon, opts){
  const floorNum = dungeon.floorNum;
  const tmpl = node.template;
  for (const raw of (tmpl.s || [])) {
    for (const one of expandLineSpawner(raw)) instantiateSpawner(node, dungeon, floorNum, decodeSpawner(one), opts);
  }
  if (node.type === 'boss' && !node.enemies.some(e => e.isBoss)) {

    const bossType = (opts && opts.bossType) || resolveGenericBoss(floorNum, opts && opts.floorBranch);
    const center = findNearestFloor(node, Math.floor(node.tileW / 2), Math.floor(node.tileH / 2));
    node.enemies.push(new Boss(bossType, center.x, center.y, floorNum));
  }
  if (node.type === 'boss') node.bossDefeated = false;

  if (node.type === 'miniboss' && !node.enemies.some(e => e.isMiniboss)) {
    const center = findNearestFloor(node, Math.floor(node.tileW / 2), Math.floor(node.tileH / 2));
    node.enemies.push(new Miniboss(resolveMiniboss(floorNum), center.x, center.y, floorNum));
  }
}

function instantiateSpawner(node, dungeon, floorNum, sp, opts){
  const tx = sp.x, ty = sp.y;
  switch (sp.category) {
    case 'enemy': {
      if (sp.kind === 'genericBoss') {

        const bossType = (opts && opts.bossType) || resolveGenericBoss(floorNum, opts && opts.floorBranch);
        node.enemies.push(new Boss(bossType, tx, ty, floorNum));
        break;
      }
      if (sp.kind === 'genericSuperboss') {
        const superbossType = resolveGenericSuperboss();
        node.enemies.push(new Boss(superbossType, tx, ty, floorNum));
        break;
      }
      const specificId = sp.specific ? resolveEnemyTypeId(sp.specific) : null;
      const type = sp.kind === 'forced' ? (ENEMY_TYPES[specificId] || BOSS_TYPES[specificId]) : resolveGenericEnemy(floorNum, opts && opts.floorBranch);
      if (!type) return;
      const isBossType = sp.kind === 'forced' && !!BOSS_TYPES[specificId];
      node.enemies.push(isBossType ? new Boss(type, tx, ty, floorNum) : new Enemy(type, tx, ty, floorNum));
      break;
    }
    case 'pickup': {
      const kind = sp.kind === 'forced' ? sp.specific : rollGenericPickupKind();
      spawnResolvedPickup(node, kind, tx, ty);
      break;
    }
    case 'item': {
      const poolName = node.type === 'secret' ? 'secret'
        : node.type === 'curse' ? 'curse'
        : node.type === 'challenge' ? 'challenge'
        : node.type === 'crystal' ? 'crystal'
        : node.type === 'sombra' ? 'sombra'
        : node.type === 'mirror' ? 'mirror'
        : 'treasure';
      const item = sp.kind === 'forced' ? ITEMS[sp.specific] : pickItemFromPool(poolName);
      if (item) {

        if (node.type === 'crystal') addDealPedestal(node, item, tx, ty, 'crystal');
        else addItemPedestal(node, item, tx, ty);
      }
      break;
    }

    case 'deal': {
      const item = sp.kind === 'forced' ? ITEMS[sp.specific] : pickItemFromPool('sombra');
      if (item) addDealPedestal(node, item, tx, ty, 'sombra');
      break;
    }
    case 'shop': {
      addShopSlot(node, sp, tx, ty, floorNum);
      break;
    }
    case 'obstacle': {
      const kind = rollRockKind(sp.specific, node.type);
      if (OBSTACLES[kind]) node.obstacles.push(new Obstacle(kind, tx, ty));
      break;
    }
  }
}

const ROOM_FEATURED_WEIGHT = 12;

const ROOM_SINGLE_FEATURE_CHANCE = 0.5;
let _roomEnemyBias = null;

function resetRoomEnemyBias(){ _roomEnemyBias = null; }

function rollRoomEnemyBias(pool){
  const want = Util.chance(ROOM_SINGLE_FEATURE_CHANCE) ? 1 : 2;
  const bias = new Set();
  if (pool.length <= want) return bias;
  let guard = 0;
  while (bias.size < want && guard++ < 20) bias.add(Util.choice(pool).id);
  return bias;
}

function pickBiasedEnemy(pool){
  if (!_roomEnemyBias) _roomEnemyBias = rollRoomEnemyBias(pool);
  if (!_roomEnemyBias.size) return Util.choice(pool);
  let total = 0;
  for (const e of pool) total += (e.weight || 1) * (_roomEnemyBias.has(e.id) ? ROOM_FEATURED_WEIGHT : 1);
  let r = RNG.random() * total;
  for (const e of pool) {
    const w = (e.weight || 1) * (_roomEnemyBias.has(e.id) ? ROOM_FEATURED_WEIGHT : 1);
    if (r < w) return e;
    r -= w;
  }
  return pool[pool.length - 1];
}

function currentFloorPath(explicit){
  if (explicit !== undefined) return explicit;
  return (typeof game !== 'undefined' && game) ? game.floorPath : null;
}

function resolveGenericEnemy(floorNum, branch, floorPath){

  const avail = e => (!e.locked || isEnemyUnlocked(e.id)) && !e.neverRandom
    && (e.onlyFloorNum === undefined || e.onlyFloorNum === floorNum);
  const floorKey = floorKeyFor(floorNum, branch, currentFloorPath(floorPath));
  if (floorKey) {
    const fkPool = ENEMY_LIST.filter(e => e.floorKey === floorKey && !e.isMinion && avail(e));
    if (fkPool.length) return pickBiasedEnemy(fkPool);
  }
  const stage = stageIndexForFloor(floorNum);
  const floorInStage = floorNum % FLOORS_PER_STAGE;

  const stageMatch = e => e.stage === stage || e.stage === 'universal';
  let pool = ENEMY_LIST.filter(e => stageMatch(e) && !e.isMinion && avail(e) && (e.xpTier || 1) <= 1 + floorInStage);
  if (!pool.length) pool = ENEMY_LIST.filter(e => stageMatch(e) && !e.isMinion && avail(e));

  if (!pool.length) pool = ENEMY_LIST.filter(avail);
  return pickBiasedEnemy(pool.length ? pool : ENEMY_LIST.filter(avail));
}

function resolveGenericBoss(floorNum, branch, floorPath){
  const floorKey = floorKeyFor(floorNum, branch, currentFloorPath(floorPath));
  if (floorKey) {
    const fkPool = BOSS_LIST.filter(b => b.floorKey === floorKey);
    if (fkPool.length) return Util.choice(fkPool);
  }
  const stage = stageIndexForFloor(floorNum);
  const pool = BOSS_LIST.filter(b => b.stage === stage);
  return Util.choice(pool.length ? pool : BOSS_LIST);
}

function resolveBossChallengeBoss(floorNum, branch, floorPath){
  return resolveGenericBoss(floorNum, branch, floorPath);
}

function resolveGenericSuperboss(){
  return Util.choice(SUPERBOSS_LIST);
}

function rollRockKind(kind, roomType){
  if (kind !== 'rock') return kind;

  if (roomType === 'start') return kind;

  let p = null;
  try { p = (typeof activeGame === 'function' && activeGame()) ? activeGame().player : null; } catch (e) { p = null; }
  if (p && p.def && p.def.noTintedRocks) return kind;

  return Util.chance(0.01) ? 'tintedrock' : kind;
}

function rollGenericPickupKind(){
  const kind = Util.weighted(PICKUP_POOL).kind;
  if (kind === 'bomb') return Util.weighted(BOMB_TIER_POOL.filter(t => !t.locked || isPickupKindUnlocked(t.id))).id;
  if (kind === 'key') return Util.weighted(KEY_TIER_POOL.filter(t => !t.locked || isPickupKindUnlocked(t.id))).id;
  return kind;
}

const SACK_BATTERY_WEIGHTS = { sack:50, minibattery:25, battery:25, trashbag:15 };
function rollSackBatteryKind(){
  const candidates = Object.keys(SACK_BATTERY_WEIGHTS).filter(isPickupKindUnlocked).map(id => ({ id, w: SACK_BATTERY_WEIGHTS[id] }));
  if (!candidates.length) return null;
  return Util.weighted(candidates).id;
}

function pickItemFromPool(poolName, passiveChance){
  const available = i => !i.locked || isItemUnlocked(i.id);

  let basePassiveChance = passiveChance !== undefined ? passiveChance : 0.68;

  let p = null;
  try { p = (typeof activeGame === 'function' && activeGame()) ? activeGame().player : null; } catch (e) { p = null; }
  if (p && p.activeItem) basePassiveChance = 1 - (1 - basePassiveChance) / 2;
  const wantType = RNG.random() < basePassiveChance ? 'passive' : 'active';

  let cappedIds = null;
  if (p && p.primedStatus && (p[p.primedStatus] || 0) >= (STATUS_CHANCE_CAPS[p.primedStatus] || Infinity)) {
    const g = STATUS_GRANTING_ITEMS[p.primedStatus];
    if (g) cappedIds = new Set(g.items);
  }
  const notCapped = i => !cappedIds || !cappedIds.has(i.id);
  let candidates = ITEM_LIST.filter(i => available(i) && notCapped(i) && i.pools && i.pools.includes(poolName) && i.type === wantType);
  if (!candidates.length) candidates = ITEM_LIST.filter(i => available(i) && notCapped(i) && i.pools && i.pools.includes(poolName));
  if (!candidates.length) candidates = (wantType === 'passive' ? PASSIVE_ITEMS : ACTIVE_ITEMS).filter(i => available(i) && notCapped(i));
  if (!candidates.length) candidates = ITEM_LIST.filter(available);
  return pickByQuality(candidates);
}

const ITEM_QUALITY_WEIGHTS = [ { q:1, w:40 }, { q:2, w:30 }, { q:3, w:20 }, { q:4, w:10 } ];
function pickByQuality(candidates){
  if (!candidates.length) return null;
  const tier = Util.weighted(ITEM_QUALITY_WEIGHTS).q;
  const atTier = candidates.filter(i => (i.quality || 1) === tier);
  return Util.choice(atTier.length ? atTier : candidates);
}

function pickAboveQuality1(){
  const available = i => !i.locked || isItemUnlocked(i.id);
  let p = null;
  try { p = (typeof activeGame === 'function' && activeGame()) ? activeGame().player : null; } catch (e) { p = null; }
  let cappedIds = null;
  if (p && p.primedStatus && (p[p.primedStatus] || 0) >= (STATUS_CHANCE_CAPS[p.primedStatus] || Infinity)) {
    const g = STATUS_GRANTING_ITEMS[p.primedStatus];
    if (g) cappedIds = new Set(g.items);
  }
  const notCapped = i => !cappedIds || !cappedIds.has(i.id);
  const candidates = ITEM_LIST.filter(i => available(i) && notCapped(i) && (i.quality || 1) > 1);
  if (!candidates.length) return null;
  return Util.choice(candidates);
}

function spawnResolvedPickup(node, kindOrCoin, tx, ty){
  if (kindOrCoin === 'coin') { node.pickups.push(new Pickup('coin', tx, ty, Util.weighted(COIN_TYPES))); return; }
  if (typeof kindOrCoin === 'string' && kindOrCoin.indexOf('coin:') === 0) {
    const tier = kindOrCoin.split(':')[1];
    const coin = COIN_TYPES.find(c => c.id === tier) || Util.weighted(COIN_TYPES);
    node.pickups.push(new Pickup('coin', tx, ty, coin));
    return;
  }
  if (kindOrCoin === 'pill') { node.pickups.push(new Pickup('pill', tx, ty, rollRandomPillColorId())); return; }
  if (kindOrCoin === 'star') { node.pickups.push(new Pickup('star', tx, ty, rollRandomStarId())); return; }

  if (kindOrCoin === 'wispdye') { node.pickups.push(new Pickup('wispdye', tx, ty, Util.choice(WISP_DYE_TYPES).id)); return; }
  if (kindOrCoin === 'wispaugment') { node.pickups.push(new Pickup('wispaugment', tx, ty, Util.choice(WISP_AUGMENT_TYPES).id)); return; }
  if (typeof kindOrCoin === 'string' && kindOrCoin.indexOf('chest:') === 0) {
    const chestKind = kindOrCoin.split(':')[1];
    node.chests.push(new Chest(CHEST_TYPES[chestKind] ? chestKind : 'grey', tx, ty));
    return;
  }
  node.pickups.push(new Pickup(kindOrCoin, tx, ty));
}

function addItemPedestal(node, item, tx, ty){
  if (!node.itemPedestals) node.itemPedestals = [];
  node.itemPedestals.push({ item, taken: false, x: tx, y: ty });
}

function addDealPedestal(node, item, tx, ty, dealType){
  if (!node.itemPedestals) node.itemPedestals = [];
  node.itemPedestals.push({ item, taken: false, x: tx, y: ty, isDeal: true, heartCost: 1, dealType: dealType || 'sombra' });
}

function addShrinePedestal(node, item, tx, ty, coinCost){
  if (!node.itemPedestals) node.itemPedestals = [];
  node.itemPedestals.push({ item, taken: false, x: tx, y: ty, isShrine: true, coinCost });
}

function addTrinketPedestal(node, trinket, tx, ty){
  if (!node.itemPedestals) node.itemPedestals = [];
  node.itemPedestals.push({ item: trinket, taken: false, x: tx, y: ty, isTrinket: true });
}

function addStarPedestal(node, starId, tx, ty){
  if (!node.itemPedestals) node.itemPedestals = [];
  node.itemPedestals.push({ item: STAR_TYPES[starId], taken: false, x: tx, y: ty, isStar: true, starId });
}

function pickTrinketFromPool(){

  let p = null;
  try { p = (typeof activeGame === 'function' && activeGame()) ? activeGame().player : null; } catch (e) { p = null; }
  let cappedIds = null;
  if (p && p.primedStatus && (p[p.primedStatus] || 0) >= (STATUS_CHANCE_CAPS[p.primedStatus] || Infinity)) {
    const g = STATUS_GRANTING_ITEMS[p.primedStatus];
    if (g) cappedIds = new Set(g.trinkets);
  }
  let candidates = TRINKET_LIST.filter(t => (!t.locked || isTrinketUnlocked(t.id)) && (!cappedIds || !cappedIds.has(t.id)));
  if (!candidates.length) candidates = TRINKET_LIST.filter(t => !t.locked || isTrinketUnlocked(t.id));
  return candidates.length ? Util.choice(candidates) : null;
}

function addFamiliarPedestal(node, familiar, tx, ty){
  if (!node.itemPedestals) node.itemPedestals = [];
  node.itemPedestals.push({ item: familiar, taken: false, x: tx, y: ty, isFamiliar: true });
}

function pickFamiliarFromPool(){

  const candidates = FAMILIAR_LIST.filter(f => (!f.locked || isFamiliarUnlocked(f.id)) && !f.trashBagOnly);
  return candidates.length ? Util.choice(candidates) : null;
}

function rollRandomStarId(){
  const candidates = STAR_LIST.filter(s => !s.locked || isStarUnlocked(s.id));
  return (candidates.length ? Util.choice(candidates) : Util.choice(STAR_LIST)).id;
}

function rollRandomPillColorId(){
  const candidates = PILL_COLORS.filter(c => !c.locked || isPillColorUnlocked(c.id));
  return (candidates.length ? Util.choice(candidates) : Util.choice(PILL_COLORS)).id;
}

function itemPoolForRoomType(type){
  return type === 'secret' ? 'secret'
    : type === 'curse' ? 'curse'
    : type === 'challenge' ? 'challenge'
    : type === 'crystal' ? 'crystal'
    : type === 'sombra' ? 'sombra'
    : type === 'mirror' ? 'mirror'
    : 'treasure';
}

function rerollOnePedestal(node){
  const list = (node.itemPedestals || []).filter(p => !p.taken);
  if (!list.length) return null;
  const ped = Util.choice(list);
  let next = null;
  if (ped.isFamiliar) next = pickFamiliarFromPool();
  else if (ped.isTrinket) next = pickTrinketFromPool();
  else if (ped.isDeal) next = pickItemFromPool(ped.dealType || 'sombra');
  else next = pickItemFromPool(itemPoolForRoomType(node.type));
  if (!next) return null;
  ped.item = next;
  return next;
}

const REROLLABLE_HAZARD_KINDS = ['cactus', 'yellowfire', 'redfire', 'bluefire', 'purplefire',
  'greenfire', 'whitefire', 'blackfire',
  'spiketrap', 'movingspike', 'sandtrap', 'mud'];

function rerollRoomHazards(node){
  let count = 0;
  for (let i = 0; i < node.obstacles.length; i++) {
    const ob = node.obstacles[i];
    if (ob.destroyed || REROLLABLE_HAZARD_KINDS.indexOf(ob.kind) === -1) continue;
    let kind = Util.choice(REROLLABLE_HAZARD_KINDS);
    if (kind === ob.kind) kind = Util.choice(REROLLABLE_HAZARD_KINDS);

    node.obstacles[i] = new Obstacle(kind, ob.tx, ob.ty);
    markBestiarySeen('objectsSeen', kind);
    count++;
  }
  return count;
}

function rerollRoomEnemies(node, floorNum, floorBranch){
  if (node.enemies.some(e => e.isBoss && !e.isDead)) return 0;
  const living = node.enemies.filter(e => !e.isDead && !e.isBoss);
  if (!living.length) return 0;
  node.enemies = node.enemies.filter(e => living.indexOf(e) === -1);
  const spots = roomFloorTiles(node, { avoidDoors: 2.5, avoidCenter: 1.2 });
  Util.shuffle(spots);
  resetRoomEnemyBias();
  for (let i = 0; i < living.length; i++) {
    const s = spots.length ? spots.pop()
      : findClearFloorSpot(node, Math.floor(node.tileW / 2), Math.floor(node.tileH / 2));
    node.enemies.push(new Enemy(resolveGenericEnemy(floorNum, floorBranch), s.x, s.y, floorNum));
  }
  return living.length;
}

function championizeRoomEnemies(node){
  let count = 0;
  for (const e of node.enemies) {
    if (e.isDead || e.isBoss || e.isChampion) continue;
    e.isChampion = true;
    e.hp = e.maxHp = e.hp * 2;
    e.dmg = e.dmg * 2;
    count++;
  }
  return count;
}

function addItemOrTrinketPedestal(node, poolName, tx, ty, passiveChance){
  const familiar = Util.chance(0.10) ? pickFamiliarFromPool() : null;
  const trinket = !familiar && Util.chance(0.15) ? pickTrinketFromPool() : null;
  if (familiar) addFamiliarPedestal(node, familiar, tx, ty);
  else if (trinket) addTrinketPedestal(node, trinket, tx, ty);
  else addItemPedestal(node, pickItemFromPool(poolName, passiveChance), tx, ty);
}

const SHOP_SLOT_KIND_WEIGHTS = [
  { kind:'pickup', w:35 },
  { kind:'item', w:40 },
  { kind:'trinket', w:12 },
  { kind:'familiar', w:13 },
];

const SHOP_MAX_SLOTS = 6;
const SHOP_BONUS_SLOT_FLOORS = [5, 9];
function shopBonusSlots(floorNum){
  const f = floorNum || 0;
  let n = 0;
  for (const threshold of SHOP_BONUS_SLOT_FLOORS) if (f >= threshold) n++;
  return n;
}

function addShopSlot(node, sp, tx, ty, floorNum){
  if (!node.shopSlots) node.shopSlots = [];
  node.shopFloorNum = floorNum || 0;
  if (sp.kind === 'forced' && sp.specific) {
    if (ITEMS[sp.specific]) {
      const item = ITEMS[sp.specific];
      node.shopSlots.push({ kind: 'item', item, price: shopPrice('item', floorNum), x: tx, y: ty, bought: false });
    } else if (TRINKETS[sp.specific]) {
      const trinket = TRINKETS[sp.specific];
      node.shopSlots.push({ kind: 'trinket', trinket, price: shopPrice('trinket', floorNum), x: tx, y: ty, bought: false });
    } else if (FAMILIAR_TYPES[sp.specific]) {
      const familiar = FAMILIAR_TYPES[sp.specific];
      node.shopSlots.push({ kind: 'familiar', familiar, price: shopPrice('familiar', floorNum), x: tx, y: ty, bought: false });
    } else {
      node.shopSlots.push({ kind: 'pickup', pickup: sp.specific, price: shopPrice(sp.specific, floorNum), x: tx, y: ty, bought: false });
    }
    return;
  }

  const roll = Util.weighted(SHOP_SLOT_KIND_WEIGHTS).kind;
  if (roll === 'trinket') {
    const trinket = pickTrinketFromPool();
    if (trinket) { node.shopSlots.push({ kind: 'trinket', trinket, price: shopPrice('trinket', floorNum), x: tx, y: ty, bought: false }); return; }
  } else if (roll === 'familiar') {
    const familiar = pickFamiliarFromPool();
    if (familiar) { node.shopSlots.push({ kind: 'familiar', familiar, price: shopPrice('familiar', floorNum), x: tx, y: ty, bought: false }); return; }
  } else if (roll === 'pickup') {
    const p = Util.choice(SHOP_PICKUP_PRICES);
    node.shopSlots.push({ kind: 'pickup', pickup: p.kind, price: shopPrice(p.kind, floorNum), x: tx, y: ty, bought: false });
    return;
  }

  const item = pickItemFromPool('shop');
  node.shopSlots.push({ kind: 'item', item, price: shopPrice('item', floorNum), x: tx, y: ty, bought: false });
}

const SHOP_REROLL_KIND_WEIGHTS = [
  { kind:'item', w:40 },
  { kind:'trinket', w:12 },
  { kind:'familiar', w:13 },
];

function countRerollableShopSlots(node){
  if (!node.shopSlots) return 0;
  let n = 0;
  for (const slot of node.shopSlots) {
    if (slot.bought) continue;
    if (slot.kind === 'item' || slot.kind === 'trinket' || slot.kind === 'familiar') n++;
  }
  return n;
}

function rerollShopSlots(node){
  if (!node.shopSlots) return 0;
  const floorNum = node.shopFloorNum || 0;
  let n = 0;
  for (const slot of node.shopSlots) {
    if (slot.bought) continue;
    if (slot.kind !== 'item' && slot.kind !== 'trinket' && slot.kind !== 'familiar') continue;
    const roll = Util.weighted(SHOP_REROLL_KIND_WEIGHTS).kind;
    let trinket = null, familiar = null;
    if (roll === 'trinket') trinket = pickTrinketFromPool();
    else if (roll === 'familiar') familiar = pickFamiliarFromPool();
    slot.item = null; slot.trinket = null; slot.familiar = null;
    if (trinket) { slot.kind = 'trinket'; slot.trinket = trinket; }
    else if (familiar) { slot.kind = 'familiar'; slot.familiar = familiar; }
    else { slot.kind = 'item'; slot.item = pickItemFromPool('shop'); }
    slot.price = shopPrice(slot.kind, floorNum);
    n++;
  }
  return n;
}

function spawnClearRoomPickup(game){
  const node = game.currentRoom;
  if (node.type === 'boss') return;
  const c = CLEAR_REWARD_CHANCE;
  const tier = Util.weighted(Object.keys(c).map(id => ({ id, w: c[id] }))).id;
  const spot = findClearFloorSpot(node, Math.floor(node.tileW / 2), Math.floor(node.tileH / 2));
  if (tier === 'nothing') {

    if (game.player.classId === 'snowpitymare') {
      const roll = RNG.random();
      if (roll < 0.5) { spawnResolvedPickup(node, 'wispdye', spot.x, spot.y); return; }
      if (roll < 0.75) { spawnResolvedPickup(node, 'wispaugment', spot.x, spot.y); return; }
    }
    return;
  }

  if (tier === 'common') {

    const cat = Util.weighted(applySkillTreePoolNudge(COMMON_CATEGORY_POOL, 'COMMON_CATEGORY_POOL')).id;
    if (cat === 'penny') {
      const pennyPool = wdCoinPool(game, COMMON_PENNY_POOL);
      const coin = Util.weighted(applySkillTreePoolNudge(pennyPool, 'COMMON_PENNY_POOL')).id;

      spawnResolvedPickup(node, coin === 'cursedpenny' ? 'cursedpenny' : 'coin:' + coin, spot.x, spot.y);
    } else if (cat === 'heart') {
      spawnResolvedPickup(node, Util.weighted(applySkillTreePoolNudge(COMMON_HEART_POOL, 'COMMON_HEART_POOL')).id, spot.x, spot.y);
    } else if (cat === 'bomb') {

      spawnResolvedPickup(node, Util.weighted(applySkillTreePoolNudge(BOMB_TIER_POOL.filter(t => !t.locked || isPickupKindUnlocked(t.id)), 'BOMB_TIER_POOL')).id, spot.x, spot.y);
    } else {
      spawnResolvedPickup(node, Util.weighted(applySkillTreePoolNudge(KEY_TIER_POOL.filter(t => !t.locked || isPickupKindUnlocked(t.id)), 'KEY_TIER_POOL')).id, spot.x, spot.y);
    }
    return;
  }

  if (tier === 'rare') {

    const candidates = RARE_POOL.filter(t => !ACHIEVEMENT_PICKUP_KINDS.includes(t.id) || isPickupKindUnlocked(t.id));
    if (!candidates.length) return;
    spawnResolvedPickup(node, Util.weighted(applySkillTreePoolNudge(candidates, 'RARE_POOL')).id, spot.x, spot.y);
    return;
  }

  const leg = Util.weighted(applySkillTreePoolNudge(LEGENDARY_POOL, 'LEGENDARY_POOL')).id;
  if (leg === 'trinket') {
    const trinket = pickTrinketFromPool();

    if (trinket) { addTrinketPedestal(node, trinket, spot.x, spot.y); return; }
  } else if (leg === 'familiar') {
    const familiar = pickFamiliarFromPool();
    if (familiar) { addFamiliar(game, familiar); return; }
  }

  node.chests.push(new Chest(Util.weighted(applySkillTreePoolNudge(CHEST_TYPE_POOL, 'CHEST_TYPE_POOL')).id, spot.x, spot.y));
}
