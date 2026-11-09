'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"?]+)(?:\?[^"]*)?"><\/script>/g)].map(m => m[1]);
const code = file => fs.readFileSync(path.join(root, file), 'utf8');
const document = {
  getElementById: () => null, querySelectorAll: () => [], addEventListener() {}
};
const context = vm.createContext({ document, window: {}, console, setTimeout, clearTimeout,
  localStorage: { getItem: () => null, setItem() {} }, navigator: {},
  requestAnimationFrame() {}, Image: class {} });
for (const file of scripts.filter(name => name !== 'js/main.js')) {
  vm.runInContext(code(file), context, { filename: file });
}
context.assert = assert;
vm.runInContext(`
let save;
let game;
function loadUnlocks() { return JSON.parse(JSON.stringify(save || {})); }
function saveUnlocks(unlocks) { save = unlocks; }
const baseRoom = () => ({ type:'normal', shape:{ mask:[[1,1],[1,1]] }, doorSlots:[], obstacles:[], enemies:[], cleared:false });
const sandbox = player => ({ player, runElapsed:30, currentRoom:baseRoom(), dungeon:{floorNum:0}, projectiles:[], floatTexts:[], explosions:[], mode:'story' });
const names = new Set();
for (const [classId, nodes] of Object.entries(SKILL_SPECIALIZATION_NODES)) {
  for (const route of [0, 1]) {
    save = { [classId]:true, skillTree:{points:6, spent:{}, unlockedNodes:{}} };
    const path = nodes.slice(route * 3, route * 3 + 3);
    assert.equal(buySkillNode(path[0].id), true);
    assert.equal(buySkillNode(path[1].id), true);
    const early = new Player(classId);
    recalcPlayerStats(early);
    assert.equal(early.technique.rank, 1);
    assert.equal(buySkillNode(path[2].id), true);
    const player = new Player(classId);
    recalcPlayerStats(player);
    assert.equal(player.technique.rank, 2);
    const [name, trigger, threshold] = player.technique.config;
    assert.ok(!names.has(name), name);
    names.add(name);
    const g = sandbox(player);
    ensureRoomBuilt(g.currentRoom);
    player.x = 225; player.y = 225; player.facing = {x:1,y:0}; player.coins = 20;
    const enemy = new Enemy(ENEMY_TYPES.gravegrub, 7, 7, 0);
    enemy.x = 253; enemy.y = 225; enemy.hp = enemy.maxHp = 100;
    const secondary = new Enemy(ENEMY_TYPES.gravegrub, 8, 7, 0);
    secondary.x = 265; secondary.y = 237; secondary.hp = secondary.maxHp = 100;
    g.currentRoom.enemies.push(enemy, secondary);
    g.currentRoom.playerTurrets = [{x:212,y:220,sightRange:180}];
    g.projectiles.push(new Projectile(230,225,1,0,1,'enemy'));
    const impact = trigger === 'hit' || trigger === 'kill' || trigger === 'blast' ? enemy : player;
    triggerSkillTechnique(g, trigger, impact, threshold);
    assert.ok(g.floatTexts.some(text => text.text === name), name);
    assert.ok(player.technique.readyAt > g.runElapsed, name);
    const count = g.floatTexts.length;
    triggerSkillTechnique(g, trigger, impact, threshold);
    assert.equal(g.floatTexts.length, count, name + ' cooldown');
  }
}
assert.equal(names.size, 56);
console.log('All 56 techniques triggered at full rank, with tier unlocks and cooldown checks.');
let roomCount = 0;
const layouts = new Set();
for (const route of [null,'C','D']) for (const seed of [3, 124, 786]) for (const floor of [0, 1, 4, 8, 13, 20, 28]) {
  RNG.seed(seed);
  game = sandbox(new Player('earth'));
  game.floorPath = route;
  game.lootOffers = new Map();
  game.dungeon = generateDungeon(floor);
  for (const type of ['boss','treasure','shop']) {
    assert.ok([...game.dungeon.rooms.values()].some(room => room.type === type), 'missing ' + type);
  }
  for (const room of game.dungeon.rooms.values()) {
    if (room.type !== 'normal') continue;
    ensureRoomBuilt(room);
    populateRoom(room, game.dungeon, {floorBranch:'A'});
    assert.ok(room.enemies.length >= 1 && room.enemies.length <= 8, 'floor ' + floor + ' / enemies ' + room.enemies.length);
    assert.ok(roomIsFullyConnected(room, room.obstacles), 'disconnected floor ' + floor);
    const entry = procgenActiveDoorSlots(room)[0];
    if (entry) {
      const reachable = roomReachableTiles(room, doorInteriorTile(entry), procgenObstacleBlockKeys(room.obstacles));
      for (const enemy of room.enemies) {
        const tx = Math.floor(enemy.x / TILE), ty = Math.floor(enemy.y / TILE);
        assert.ok(reachable.has(tx + ',' + ty), 'unreachable spawn');
      }
    }
    layouts.add(room.encounterLayout);
    roomCount++;
  }
}
assert.equal(layouts.size, 3);
console.log('Verified', roomCount, 'combat rooms on 63 seeded floors across the three routes.');
const player = new Player('earth');
game = sandbox(player);
ensureRoomBuilt(game.currentRoom);
player.x = 225; player.y = 225;
const ranged = new Enemy({ id:'test', hp:5, dmg:1, speed:80, radius:10, behavior:'ranged' }, 3, 5, 0);
ranged.x = 100; ranged.y = 225; ranged.fireTimer = 0;
aiRanged(game, ranged, 0.01);
assert.ok(ranged.attackAim);
assert.equal(game.projectiles.length, 0);
player.y = 300;
aiRanged(game, ranged, 0.4);
assert.equal(game.projectiles.length, 1);
assert.equal(game.projectiles[0].vy, 0);
assert.ok(bossHpScale(28) < 50);
for (const pool of ['treasure','shop','secret','boss','curse']) {
  for (let i = 0; i < 20; i++) assert.ok(pickItemFromPool(pool));
}
assert.ok(pickTrinketFromPool());
const enemyCases = [
  ['ranged', aiRanged], ['turret', aiTurret], ['flyer', aiFlyer], ['sniper', aiSniper],
  ['charger', aiCharger], ['leaper', aiLeaper], ['skirmisher', aiSkirmisher], ['lobber', aiLobber],
];
for (const [behavior, handler] of enemyCases) {
  const g = sandbox(new Player('unicorn'));
  ensureRoomBuilt(g.currentRoom);
  g.player.x = 225; g.player.y = 225;
  const e = new Enemy({id:behavior, hp:5, dmg:1, speed:85, radius:10, behavior}, 3, 5, 0);
  g.currentRoom.enemies.push(e);
  for (let tick = 0; tick < 240; tick++) { g.runElapsed += 1/60; handler(g, e, 1/60); }
  assert.ok(Number.isFinite(e.x) && Number.isFinite(e.y), behavior);
}
const bossCases = [
  ['warlord', aiBossWarlord], ['bonesentinel', aiBossBoneSentinel], ['colossus', aiBossColossus],
  ['hivemother', aiBossHiveMother], ['brambleQueen', aiBossBrambleQueen], ['eclipsewraith', aiBossEclipseWraith],
];
for (const [id, handler] of bossCases) {
  const g = sandbox(new Player('earth'));
  ensureRoomBuilt(g.currentRoom);
  g.currentRoom.type = 'boss';
  g.player.x = 235; g.player.y = 235;
  g.player.invincibleTimer = 100;
  const boss = new Boss(BOSS_TYPES[id], 4, 4, 0);
  boss.hp *= 0.45;
  g.currentRoom.enemies.push(boss);
  let warned = false;
  for (let tick = 0; tick < 600; tick++) {
    g.runElapsed += 1/60;
    handler(g, boss, 1/60);
    warned ||= !!boss.attackAim || boss.lobTimer > 0 || boss.attackWarningRadius > 0;
    if (tick % 100 === 0) { g.player.x += 14; g.player.y += 8; }
  }
  assert.ok(warned, id + ' warning');
  assert.ok(Number.isFinite(boss.x) && Number.isFinite(boss.y), id);
}
console.log('Simulated revised attacks for eight enemy archetypes and six bosses.');
console.log('Locked enemy aim, endgame HP curve and reward pools passed.');
`, context);
