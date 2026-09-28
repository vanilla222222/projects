'use strict';

const WD_STAGE_BRANCHES = ['A', 'B', 'C', 'D'];
const WD_MAX_ALIVE = 20;
const WD_SPAWN_INTERVAL = 0.55;
const WD_STAGE_SWAP_INTERVAL = 25;
const WD_BOSS_WAVE_INTERVAL = 10;
const WD_ITEM_WAVE_INTERVAL = 10;
const WD_AUTO_PAUSE_INTERVAL = 5;
const WD_INTERWAVE_BREAK = 15;
const WD_COIN_DROP_MIN = 2;
const WD_COIN_DROP_MAX = 3;
const WD_CONTROL_BUTTON_RANGE = 30;
const WD_PAUSE_HEART_COST = 1;
const WD_WAVE_ACHIEVEMENTS = [
  { wave: 10, id: 'wd_wave10' },
  { wave: 25, id: 'wd_wave25' },
  { wave: 50, id: 'wd_wave50' },
  { wave: 100, id: 'wd_wave100' },
];
const WD_BOSSKILL_ACHIEVEMENTS = [
  { kills: 5, id: 'wd_bosses5' },
  { kills: 15, id: 'wd_bosses15' },
];

function wdBranchLetter(stageIndex){
  return WD_STAGE_BRANCHES[((stageIndex % 4) + 4) % 4];
}

function wdSyntheticFloor(game){
  return Math.min(13, 2 + Math.floor((game.wdWave || 0) / 3) + (game.wdLoop || 0) * 4);
}

function wdWaveQuota(wave){
  return Math.min(40, 4 + Math.floor(wave * 1.5));
}

function wdLoopMult(game){
  return 1 + (game.wdLoop || 0) * 0.25;
}

function wdApplyLoopScale(e, game){
  const m = wdLoopMult(game) * (game.wdDifficultyMult || 1);
  if (m === 1) return e;
  e.hp = Math.max(1, Math.round(e.hp * m));
  e.maxHp = e.hp;
  if (typeof e.prevHp === 'number') e.prevHp = e.hp;
  e.dmg = Math.max(1, Math.round(e.dmg * m));
  e.speed = e.speed * (1 + (game.wdLoop || 0) * 0.05);
  return e;
}

function wdDefBranchLetter(def){
  if (def && typeof def.floorKey === 'string' && def.floorKey.length) {
    const last = def.floorKey.charAt(def.floorKey.length - 1);
    if (WD_STAGE_BRANCHES.indexOf(last) !== -1) return last;
  }
  return null;
}

function wdDefInBranch(def, letter){
  const own = wdDefBranchLetter(def);
  if (own) return own === letter;
  if (def.stage === 'universal') return true;
  return letter === 'A' || letter === 'B';
}

function wdDefEligible(def){
  return (!def.locked || isEnemyUnlocked(def.id)) && !def.neverRandom && def.onlyFloorNum === undefined;
}

function wdEnemyPoolForBranch(letter){
  const pool = ENEMY_LIST.filter(e => !e.isMinion && wdDefEligible(e) && wdDefInBranch(e, letter));
  if (pool.length) return pool;
  return ENEMY_LIST.filter(e => !e.isMinion && wdDefEligible(e) && e.stage === 'universal');
}

function wdFloorKeyDepth(def){
  if (!def || typeof def.floorKey !== 'string') return null;
  const m = /^(\d+)/.exec(def.floorKey);
  return m ? parseInt(m[1], 10) : null;
}

function wdDefDepth(def){
  const floorDepth = wdFloorKeyDepth(def);
  if (floorDepth != null) return floorDepth;
  if (def && typeof def.stage === 'number') return def.stage;
  return null;
}

function wdGateEnemyPoolByFloor(pool, floorNum){
  const tierCap = floorNum <= 5 ? 1 : 2;
  const gated = pool.filter(e => {
    const depth = wdDefDepth(e);
    if (depth != null) return depth <= floorNum + 2;
    return (e.xpTier || 1) <= tierCap;
  });
  return gated.length ? gated : pool;
}

function wdBossPoolForBranch(letter){
  const pool = BOSS_LIST.filter(b => wdDefEligible(b) && wdDefInBranch(b, letter));
  if (pool.length) return pool;
  return BOSS_LIST.filter(b => wdDefEligible(b) && b.stage === 'universal');
}

function wdRefreshPools(game){
  const letter = wdBranchLetter(game.wdStageIndex || 0);
  game.wdPoolBranch = letter;
  game.wdEnemyPoolCache = wdEnemyPoolForBranch(letter);
  game.wdBossPoolCache = wdBossPoolForBranch(letter);
}

function wdPickSpawnSpot(game, node){
  const px = game.player ? game.player.x : 0;
  const py = game.player ? game.player.y : 0;
  let fallback = null;
  for (let i = 0; i < 14; i++) {
    const tx = Util.randi(2, Math.max(2, node.tileW - 3));
    const ty = Util.randi(2, Math.max(2, node.tileH - 3));
    const spot = findClearFloorSpot(node, tx, ty);
    if (!spot) continue;
    if (!fallback) fallback = spot;
    const dx = tileToPx(spot.x) - px;
    const dy = tileToPx(spot.y) - py;
    if (dx * dx + dy * dy > 200 * 200) return spot;
  }
  return fallback || findClearFloorSpot(node, Math.floor(node.tileW / 2), Math.floor(node.tileH / 2));
}

function wdMarkRoomOpen(room){
  room.discovered = true;
  room.seen = true;
  room.revealed = true;
  room.visited = true;
  room.cleared = true;
  room.doorsOpen = true;
}

function wdComputeBounds(rooms){
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const room of rooms.values()) {
    for (const cell of roomBlockCells(room)) {
      if (cell.bx < minX) minX = cell.bx;
      if (cell.bx > maxX) maxX = cell.bx;
      if (cell.by < minY) minY = cell.by;
      if (cell.by > maxY) maxY = cell.by;
    }
  }
  return { minX, maxX, minY, maxY };
}

const WD_SHOP_CATEGORY_ORDER = ['heartRed', 'heartBlue', 'pickupOther', 'pillstar', 'item', 'item', 'trinket', 'familiar'];
const WD_SHOP_PICKUP_OTHER_KINDS = ['bomb', 'key', 'sack', 'battery', 'trashbag', 'pearl', 'driftnet', 'tideflask'];

function wdShopSlotPosition(shop, i){
  const frac = (i + 1) / 9;
  const x = Math.round(1 + frac * (shop.tileW - 2));
  const y = Math.floor(shop.tileH / 2);
  return { x, y };
}

function wdPushShopCategorySlot(shop, category, x, y, floorNum, pickupKind){
  if (category === 'heartRed' || category === 'heartBlue') {
    addShopSlot(shop, { kind: 'forced', specific: category }, x, y, floorNum);
  } else if (category === 'pickupOther') {
    const kind = pickupKind || Util.choice(WD_SHOP_PICKUP_OTHER_KINDS);
    addShopSlot(shop, { kind: 'forced', specific: kind }, x, y, floorNum);
    shop.shopSlots[shop.shopSlots.length - 1].wdPickupKind = kind;
  } else if (category === 'pillstar') {
    const kind = pickupKind || Util.choice(['pill', 'star']);
    addShopSlot(shop, { kind: 'forced', specific: kind }, x, y, floorNum);
    shop.shopSlots[shop.shopSlots.length - 1].wdPickupKind = kind;
  } else if (category === 'item') {
    const item = pickItemFromPool('shop');
    shop.shopSlots.push({ kind: 'item', item, price: shopPrice('item', floorNum), x, y, bought: false });
  } else if (category === 'trinket') {
    const trinket = pickTrinketFromPool();
    shop.shopSlots.push({ kind: 'trinket', trinket, price: shopPrice('trinket', floorNum), x, y, bought: false });
  } else if (category === 'familiar') {
    const familiar = pickFamiliarFromPool();
    shop.shopSlots.push({ kind: 'familiar', familiar, price: shopPrice('familiar', floorNum), x, y, bought: false });
  }
  shop.shopSlots[shop.shopSlots.length - 1].wdCategory = category;
}

function wdBuildShopSlots(shop, floorNum){
  shop.shopSlots = [];
  shop.shopFloorNum = floorNum;
  for (let i = 0; i < WD_SHOP_CATEGORY_ORDER.length; i++) {
    const category = WD_SHOP_CATEGORY_ORDER[i];
    const { x, y } = wdShopSlotPosition(shop, i);
    wdPushShopCategorySlot(shop, category, x, y, floorNum);
  }
}

function wdRestockShopSlot(node, slot){
  if (!node || !node.shopSlots) return;
  const idx = node.shopSlots.indexOf(slot);
  if (idx === -1) return;
  const floorNum = node.shopFloorNum || 0;
  const { x, y } = slot;
  wdPushShopCategorySlot(node, slot.wdCategory, x, y, floorNum);
  const fresh = node.shopSlots.pop();
  fresh.playerWasNear = false;
  node.shopSlots[idx] = fresh;
}

function wdAttachWaveShop(game, dungeon, arena){
  const blockGrid = new Map();
  commitPlace(blockGrid, dungeon.rooms, arena);
  const picked = pickMaskForType('shop', dungeon.floorNum);
  let shop = null;
  for (const dir of Util.shuffle(DIRS.slice())) {
    shop = tryPlaceAdjacent(blockGrid, dungeon.rooms, arena, dir, picked.mask, picked.template, 'shop', 99);
    if (shop) break;
  }
  if (!shop) return null;
  shop.wdShop = true;
  wdMarkRoomOpen(shop);
  ensureRoomBuilt(shop);
  populateRoom(shop, dungeon, {});
  wdBuildShopSlots(shop, dungeon.floorNum);
  const spot = findNearestFloor(shop, Math.floor(shop.tileW * 0.82), Math.floor(shop.tileH * 0.18));
  shop.upgradeStation = { x: spot.x, y: spot.y, tier: 0 };
  return shop;
}

function wdSetupControlButton(game, dungeon, arena){
  ensureRoomBuilt(arena);
  populateRoom(arena, dungeon, {});
  const spot = findClearFloorSpot(arena, Math.floor(arena.tileW / 2), Math.floor(arena.tileH / 2));
  if (spot) arena.wdControlButton = { x: spot.x, y: spot.y };
}

function wdWaveArenaPool(stageIndex){
  const themes = ROOM_TEMPLATES.wavearena || {};
  const letter = wdBranchLetter(stageIndex || 0);
  return themes[letter] || themes.A || [];
}

function generateWaveArena(game, stageIndex){
  const pool = wdWaveArenaPool(stageIndex);
  const tmpl = pool[((stageIndex % pool.length) + pool.length) % pool.length];
  const mask = tmpl.m;
  const room = makeRoomInstance('wavearena', 0, 0, mask, tmpl);
  wdMarkRoomOpen(room);
  const rooms = new Map();
  rooms.set(room.id, room);
  const dungeon = {
    rooms,
    start: room,
    bossNode: null,
    treasureNode: null,
    bounds: { minX: 0, maxX: mask[0].length - 1, minY: 0, maxY: mask.length - 1 },
    floorNum: wdSyntheticFloor(game),
  };
  wdAttachWaveShop(game, dungeon, room);
  dungeon.bounds = wdComputeBounds(rooms);
  wdSetupControlButton(game, dungeon, room);
  wdRefreshPools(game);
  return dungeon;
}

function wdPickWaveEnemyTypes(game){
  if (!game.wdEnemyPoolCache || !game.wdEnemyPoolCache.length) wdRefreshPools(game);
  const pool = wdGateEnemyPoolByFloor(game.wdEnemyPoolCache, wdSyntheticFloor(game));
  if (!pool || !pool.length) return [];
  if (pool.length <= 2) return pool.slice();
  const shuffled = Util.shuffle(pool.slice());
  return shuffled.slice(0, 2);
}

function wdSpawnTrash(game){
  const node = game.currentRoom;
  const floorNum = game.dungeon.floorNum;
  const pool = game.wdWaveEnemyTypes;
  if (!pool || !pool.length) return;
  const type = Util.choice(pool);
  if (!type) return;
  const spot = wdPickSpawnSpot(game, node);
  if (!spot) return;
  node.enemies.push(wdApplyLoopScale(new Enemy(type, spot.x, spot.y, floorNum), game));
}

function wdSpawnBoss(game){
  const node = game.currentRoom;
  const floorNum = game.dungeon.floorNum;
  if (!game.wdBossPoolCache || !game.wdBossPoolCache.length) wdRefreshPools(game);
  const pool = game.wdBossPoolCache;
  if (!pool || !pool.length) return;
  const type = pool[game.wdBossPoolCursor % pool.length];
  game.wdBossPoolCursor = (game.wdBossPoolCursor + 1) % pool.length;
  const spot = wdPickSpawnSpot(game, node);
  if (!spot) return;
  node.enemies.push(wdApplyLoopScale(new Boss(type, spot.x, spot.y, floorNum), game));
  game.wdBossActive = true;
  game.toast('Boss Wave!', true);
}

function wdAdvanceStage(game){
  game.wdStageIndex = (game.wdStageIndex + 1) % 4;
  if (game.wdStageIndex === 0) {
    game.wdLoop++;
    game.wdDifficultyMult += 0.25;
    game.toast('Loop ' + (game.wdLoop + 1) + '!', true);
  }
  const arena = generateWaveArena(game, game.wdStageIndex);
  game.dungeon = arena;
  game.enterRoom(arena.start, null);
}

function wdGrantWaveRewards(game, wave){
  const node = game.currentRoom;
  if (wave % WD_ITEM_WAVE_INTERVAL === 0) {
    const item = pickItemFromPool('treasure');
    if (item) applyItemToPlayer(game, item);
  }
  if (!node) return;
  const center = findClearFloorSpot(node, Math.floor(node.tileW / 2), Math.floor(node.tileH / 2));
  if (!center) return;
  const coins = Util.randi(WD_COIN_DROP_MIN, WD_COIN_DROP_MAX);
  for (let i = 0; i < coins; i++) {
    const spot = findClearFloorSpot(node, center.x + Util.randi(-2, 2), center.y + Util.randi(-2, 2));
    if (spot) spawnResolvedPickup(node, 'coin', spot.x, spot.y);
  }
}

function wdCompleteWave(game){
  const wave = game.wdWave;
  setStatMax('bestWaveReached', wave);
  for (const a of WD_WAVE_ACHIEVEMENTS) {
    if (wave >= a.wave) unlockAchievement(a.id, game);
  }
  wdGrantWaveRewards(game, wave);
  if (wave % WD_STAGE_SWAP_INTERVAL === 0) wdAdvanceStage(game);
  if (wave % WD_AUTO_PAUSE_INTERVAL === 0) {
    game.wdPaused = true;
    game.toast('Paused - use the arena button to resume', true);
    return;
  }
  game.wdInterWaveTimer = WD_INTERWAVE_BREAK;
}

function wdStartWave(game){
  game.wdWave++;
  game.dungeon.floorNum = wdSyntheticFloor(game);
  game.wdSpawnTimer = 0;
  if (game.wdWave % WD_BOSS_WAVE_INTERVAL === 0) {
    game.wdQuotaRemaining = 0;
    game.wdWaveEnemyTypes = [];
    wdSpawnBoss(game);
    wdCyclePalette(game);
  } else {
    game.wdQuotaRemaining = wdWaveQuota(game.wdWave);
    game.wdBossActive = false;
    game.wdWaveEnemyTypes = wdPickWaveEnemyTypes(game);
    game.toast('Wave ' + game.wdWave, false);
  }
  game.logEvent('floor', 'Wave ' + game.wdWave);
}

function wdCyclePalette(game){
  game.wdPaletteIndex = (game.wdPaletteIndex || 0) + 1;
  const stage = STAGES[game.wdPaletteIndex % STAGES.length];
  const trackId = STAGE_MUSIC_TRACKS[stage.id];
  if (trackId) Sound.startMusic(trackId);
  wdRegenerateObstacles(game);
}

function wdRegenerateObstacles(game){
  const node = game.currentRoom;
  if (!node || node.type !== 'wavearena') return;
  const pool = wdWaveArenaPool(game.wdStageIndex || 0);
  if (!pool.length) return;
  const tmpl = pool[(game.wdPaletteIndex || 0) % pool.length];
  node.obstacles = [];
  for (const raw of (tmpl.s || [])) {
    for (const one of expandLineSpawner(raw)) {
      const sp = decodeSpawner(one);
      if (sp.category !== 'obstacle') continue;
      const kind = rollRockKind(sp.specific, node.type);
      if (OBSTACLES[kind]) node.obstacles.push(new Obstacle(kind, sp.x, sp.y));
    }
  }
}

function startWaveDefense(game){
  game.mode = 'wavedefense';
  game.waveDefenseMode = true;
  game.wdWave = 0;
  game.wdStageIndex = 0;
  game.wdPaletteIndex = 0;
  game.wdLoop = 0;
  game.wdDifficultyMult = 1;
  game.wdBossPoolCursor = 0;
  game.wdSpawnTimer = 0;
  game.wdQuotaRemaining = 0;
  game.wdBossActive = false;
  game.wdStarted = false;
  game.wdPaused = false;
  game.wdInterWaveTimer = 0;
  game.wdWaveEnemyTypes = [];
  const arena = generateWaveArena(game, 0);
  game.dungeon = arena;
  game.enterRoom(arena.start, null);
  game.toast('Use the arena button to start', true);
}

function wdControlButtonState(game){
  return (game.wdStarted && !game.wdPaused) ? 'running' : 'idle';
}

function wdTryControlButton(game){
  if (game.mode !== 'wavedefense') return false;
  const node = game.currentRoom;
  if (!node || !node.wdControlButton) return false;
  const player = game.player;
  if (!player) return false;
  const px = node.wdControlButton.x * TILE;
  const py = node.wdControlButton.y * TILE;
  if (Util.dist(player.x, player.y, px, py) > WD_CONTROL_BUTTON_RANGE) return false;
  if (!game.wdStarted) {
    game.wdStarted = true;
    game.wdPaused = false;
    wdStartWave(game);
    return true;
  }
  if (game.wdPaused) {
    game.wdPaused = false;
    game.toast('Resumed', false);
    if (game.wdQuotaRemaining <= 0 && !game.wdBossActive && game.wdInterWaveTimer <= 0) {
      wdStartWave(game);
    }
    return true;
  }
  game.wdPaused = true;
  player.spendHearts(WD_PAUSE_HEART_COST);
  if (player.redCurrent <= 0) { player.redCurrent = 0; player.isDead = true; }
  game.toast('Paused (-1 heart)', true);
  return true;
}

function updateWaveDefense(game, dt){
  if (game.mode !== 'wavedefense') return;
  if (game.state !== 'playing') return;
  const node = game.currentRoom;
  if (!node || !node.enemies) return;
  if (node.type !== 'wavearena') return;
  if (!game.wdStarted) return;
  if (game.wdPaused) return;

  if (game.wdBossActive) {
    const bossAlive = node.enemies.some(e => e.isBoss && !e.isDead);
    if (!bossAlive) {
      game.wdBossActive = false;
      game.runStats.waveDefenseBossKills = (game.runStats.waveDefenseBossKills || 0) + 1;
      for (const a of WD_BOSSKILL_ACHIEVEMENTS) {
        if (game.runStats.waveDefenseBossKills >= a.kills) unlockAchievement(a.id, game);
      }
      wdCompleteWave(game);
    }
    return;
  }

  if (game.wdInterWaveTimer > 0) {
    const allDead = !node.enemies.some(e => !e.isDead);
    if (allDead) {
      game.wdInterWaveTimer = 0;
      wdStartWave(game);
      return;
    }
    game.wdInterWaveTimer -= dt;
    if (game.wdInterWaveTimer <= 0) {
      game.wdInterWaveTimer = 0;
      wdStartWave(game);
    }
    return;
  }

  if (game.wdQuotaRemaining <= 0) return;

  game.wdSpawnTimer -= dt;
  if (game.wdSpawnTimer > 0) return;

  const alive = node.enemies.reduce((n, e) => n + (e.isDead ? 0 : 1), 0);
  if (alive >= WD_MAX_ALIVE) return;

  game.wdSpawnTimer = WD_SPAWN_INTERVAL;
  wdSpawnTrash(game);
  game.wdQuotaRemaining--;
  if (game.wdQuotaRemaining <= 0) wdCompleteWave(game);
}
