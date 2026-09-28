'use strict';

const CAMERA_TILES = 12;
const CAMERA_W = CAMERA_TILES * TILE;
const CAMERA_H = CAMERA_TILES * TILE;
const ROOM_FREEZE_TIME = 0.4;
const ROOM_FADE_TIME = 0.4;
const MAX_DPR = 2;

const ROOM_LABELS = {
  boss: 'Boss Chamber', treasure: 'Treasure Room', shop: 'Shop', secret: 'Secret Room!',
  petshop: 'Pet Shop', curse: 'Cursed Room!', sacrifice: 'Sacrifice Room', vault: 'Vault',
  challenge: 'Challenge Room', crystal: 'Crystal Room', sombra: 'Sombra Room',
  cpathgate: 'The Storm Drain',
  mirror: 'Mirror Room', karma: 'Karma Room', bosschallenge: 'Boss Challenge Room',
  wavearena: 'Wave Arena',
};
function roomLabel(node){ return ROOM_LABELS[node.type] || ''; }

class Game {
  constructor(canvas){
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    this.canvas.width = CAMERA_W * this.dpr;
    this.canvas.height = CAMERA_H * this.dpr;
    this.state = 'idle';
    this.player = null;
    this.dungeon = null;
    this.currentRoom = null;
    this.projectiles = []; this.bombs = []; this.explosions = []; this.creep = []; this.dustDevils = []; this.floatTexts = [];
    this.swingFX = null;
    this.laserFX = null;
    this.paused = false;
    this.camX = 0; this.camY = 0;
    this.freezeTimer = 0;
    this.roomFadeTimer = 0;
    this.slowTimer = 0;
    this.now = performance.now();
    this._entityDrawScratch = [];
  }

  startRun(classId, seedText){

    let seedInt, seedDisplay;
    if (seedText && String(seedText).trim()) {
      seedText = String(seedText).trim();
      seedInt = RNG.hashString(seedText);
      seedDisplay = seedText;
    } else {
      seedInt = RNG.randomSeed();
      seedDisplay = RNG.seedToString(seedInt);
    }
    RNG.seed(seedInt);

    this.runSeed = { int: seedInt, display: seedDisplay };
    this.player = new Player(classId);

    const startDef = CLASSES[classId];
    if (startDef.startingFamiliars) {
      for (const grant of startDef.startingFamiliars) {
        const def = FAMILIAR_TYPES[grant.id];
        if (!def) continue;
        for (let i = 0; i < grant.count; i++) this.player.familiars.push(new Familiar(def, this.player, this.player.familiars.length));
      }
    }

    applySkillTreeStartingPickups(this.player);
    recalcPlayerStats(this.player);

    if (this.player.wispCountBonus > 0) {
      const wispDef = FAMILIAR_TYPES.snowwisp;
      if (wispDef) for (let i = 0; i < this.player.wispCountBonus; i++) this.player.familiars.push(new Familiar(wispDef, this.player, this.player.familiars.length));
    }
    this.state = 'playing';
    this.paused = false;
    this.floorsClearedNoDamage = 0;
    this.floorBranch = null;

    this.floorPath = null;

    this.dealAlignment = null;
    this.runElapsed = 0;
    this.runKills = 0;

    this.mode = 'story';

    this.runStats = {
      kills: 0, bossKills: 0, roomsCleared: 0, itemsCollected: 0,
      hitsLanded: 0, crits: 0, lifestealHeals: 0, floorsReached: 0,
      waveDefenseBossKills: 0,
    };

    this.runLog = [];
    bumpStat('runsStarted', 1, this);

    beginRunUnlocks();

    this.pillEffectMap = {};
    for (const c of PILL_COLORS) this.pillEffectMap[c.id] = Util.choice(PILL_EFFECT_LIST).id;
    this.pillIdentified = {};
    const unlocks = loadUnlocks();
    this.maxFloorsThisRun = unlocks.polishDefeated ? 8 : BASE_MAX_FLOORS;
    this.startFloor(0);
  }

  startFloor(floorNum){

    if (this.runStats) this.runStats.floorsReached = Math.max(this.runStats.floorsReached, floorNum);
    this.dungeon = generateDungeon(floorNum);

    if (this.floorPath === 'C') {

      let stageId;
      if (floorNum <= 3) stageId = 'gutters';
      else if (floorNum <= 5) stageId = 'sewers';
      else if (floorNum <= 9) stageId = 'rainforest';
      else if (floorNum <= 11) stageId = 'mangroves';
      else if (floorNum <= 13) stageId = 'floodedundercity';
      else if (floorNum <= 15) stageId = 'coralboneyard';
      else if (floorNum <= 17) stageId = 'abyssalvents';
      else if (floorNum <= 19) stageId = 'drownedcathedral';
      else if (floorNum <= 21) stageId = 'blackcurrent';
      else stageId = 'leviathansmaw';
      markBestiarySeen('seenStages', stageId, this);
    } else if (this.floorPath === 'D') {

      markBestiarySeen('seenStages', floorNum <= 4 ? 'observatory' : floorNum <= 6 ? 'orrery' : 'voidbetween', this);
    } else if (floorNum > OLD_MAIN_ROUTE_FINAL_FLOOR) {

      markBestiarySeen('seenStages', STAGES[stageIndexForFloor(floorNum)].id, this);
    } else if (floorNum >= 12) {

      markBestiarySeen('seenStages', String(floorNum + 1), this);
    } else if (floorNum >= 8 && this.floorBranch) {
      markBestiarySeen('seenStages', String(floorNum + 1) + this.floorBranch.toLowerCase(), this);
    } else {
      markBestiarySeen('seenStages', STAGES[stageIndexForFloor(floorNum)].id, this);
    }

    if (!this.floorPath) {
      this.currentFloorTrackId = legacyMusicTrackFor(floorNum, this.floorBranch === 'B' ? 'B' : 'A');
    } else if (this.floorPath === 'C') {
      this.currentFloorTrackId = cMusicTrackFor(floorNum);
    } else if (this.floorPath === 'D') {
      this.currentFloorTrackId = dMusicTrackFor(floorNum);
    } else {
      this.currentFloorTrackId = null;
    }
    if (this.currentFloorTrackId) Sound.startMusic(this.currentFloorTrackId); else Sound.stopMusic();

    if ((this.player.passives.starlitcompass || this.player.passives.infernalcompass)) {
      if (this.dungeon.crystalNode) this.dungeon.crystalNode.seen = true;
      if (this.dungeon.sombraNode) this.dungeon.sombraNode.seen = true;
    }

    if (floorNum > 0 && this.player.gainsFlyPerFloor) {
      const flyDef = pickChudFlyFamiliar();
      if (flyDef) addFamiliar(this, flyDef);
    }
    this.player.secondWindUsedThisFloor = false;
    this.player.tookDamageThisFloor = false;
    this.player.unlimitedKeysFloor = false;
    this.player.unlimitedBombsFloor = false;
    if (this.player.passives.whisperingkey) this.player.keys += this.player.passives.whisperingkey;
    if (this.player.passives.guardianfeather) this.player.shieldHits = Math.max(this.player.shieldHits, 1);
    if (this.player.trinketId === 'blastcap') this.player.bombs += 1;
    if (this.player.trinketId === 'tinybattery' && this.player.activeItem) {
      this.player.activeCharge = Math.min(this.player.activeItem.maxCharge, this.player.activeCharge + 1);
    }

    if (this.player.trinketId === 'wardingsigil') this.player.shieldHits = Math.max(this.player.shieldHits, 1);
    if (this.player.trinketId === 'skeletonpin') this.player.keys += 1;
    if (this.player.trinketId === 'tollpouch') this.player.coins += 5;
    if (this.player.trinketId === 'soulcandle') this.player.healBlue(0.5);
    if (this.player.trinketId === 'pilgrimsflask') this.player.heal(0.5);

    if (setStatMax('deepestFloor', floorNum + 1) && floorNum > 0) {
      this.toast('🏅 New personal best! Reached Floor ' + (floorNum + 1) + ' for the first time.', false, 'good');
    }

    if (floorNum === 8 && !this.floorPath) unlockAchievement('deepdiver', this);

    if (floorNum === 12 && !this.floorPath) {
      unlockAchievement('exploration_reach_floor13', this);
      if (this.runElapsed < 22 * 60) unlockAchievement('challenge_hollowchorus_speedrun', this);
    }
    if (floorNum === 13 && !this.floorPath) {
      unlockAchievement('exploration_reach_floor14', this);
      if (this.runElapsed < 29 * 60) unlockAchievement('challenge_finalwaveform_speedrun', this);
    }
    if (this.floorPath === 'C') {

      bumpStat('cBranchFloorsVisited', 1, this);

      if (floorNum === 10) {
        unlockAchievement('exploration_reach_11c', this);
        if (this.runElapsed < 20 * 60) unlockAchievement('challenge_mangroves_speedrun', this);
      }

      if (floorNum === 5) this.pendingBossType = SUPERBOSSES.drenched;
      else if (floorNum === 7) this.pendingBossType = SUPERBOSSES.brazil;
      else if (floorNum === 8) this.pendingBossType = SUPERBOSSES.israelprime;
      else if (floorNum === 9) this.pendingBossType = SUPERBOSSES.monsoon;
      else if (floorNum === 10) this.pendingBossType = SUPERBOSSES.mangrove;
      else if (floorNum === 11) this.pendingBossType = SUPERBOSSES.kirk;

      else if (floorNum === 13) this.pendingBossType = SUPERBOSSES.undertow;
      else if (floorNum === 15) this.pendingBossType = SUPERBOSSES.riptide;
      else if (floorNum === 17) this.pendingBossType = SUPERBOSSES.thermocline;
      else if (floorNum === 19) this.pendingBossType = SUPERBOSSES.requiem;
      else if (floorNum === 21) this.pendingBossType = SUPERBOSSES.abyssal;
      else if (floorNum === 23) this.pendingBossType = SUPERBOSSES.leviathan;
      else this.pendingBossType = resolveGenericBoss(floorNum, null, 'C');
    }
    else if (this.floorPath === 'D') {

      bumpStat('dBranchFloorsVisited', 1, this);

      if (floorNum === 3) {
        unlockAchievement('exploration_reach_4d', this);
        if (this.runElapsed < 15 * 60) unlockAchievement('challenge_observatory_4d_speedrun', this);
      }
      if (floorNum === 4) {
        unlockAchievement('exploration_reach_5d', this);
        if (this.runElapsed < 19 * 60) unlockAchievement('challenge_observatory_5d_speedrun', this);
      }

      if (floorNum === 5) {
        unlockAchievement('exploration_reach_6d', this);
        if (this.runElapsed < 22 * 60) unlockAchievement('challenge_orrery_6d_speedrun', this);
      }
      if (floorNum === 6) {
        unlockAchievement('exploration_reach_7d', this);
        if (this.runElapsed < 26 * 60) unlockAchievement('challenge_orrery_7d_speedrun', this);
      }

      if (floorNum === 7) {
        unlockAchievement('exploration_reach_8d', this);
        if (this.runElapsed < 29 * 60) unlockAchievement('challenge_voidbetween_8d_speedrun', this);
      }

      if (floorNum === 8) {
        unlockAchievement('exploration_reach_9d', this);
        if (this.runElapsed < 32 * 60) unlockAchievement('challenge_voidbetween2_9d_speedrun', this);
      }
      if (floorNum === 9) {
        unlockAchievement('exploration_reach_10d', this);
        if (this.runElapsed < 35 * 60) unlockAchievement('challenge_voidbetween2_10d_speedrun', this);
      }
      if (floorNum === 4) this.pendingBossType = SUPERBOSSES.astrolabe;
      else if (floorNum === 6) this.pendingBossType = SUPERBOSSES.orrery;
      else if (floorNum === 9) this.pendingBossType = SUPERBOSSES.singularity;
      else this.pendingBossType = resolveGenericBoss(floorNum, null, 'D');
    }
    else if (floorNum === 5) this.pendingBossType = SUPERBOSSES.polish;
    else if (floorNum === 7) this.pendingBossType = SUPERBOSSES.tyrone;
    else if (floorNum === 8) this.pendingBossType = this.floorBranch === 'B' ? SUPERBOSSES.israel : SUPERBOSSES.pineapple;

    else if (floorNum === 9) this.pendingBossType = this.floorBranch === 'B' ? SUPERBOSSES.lilac : SUPERBOSSES.algae;

    else if (floorNum === 10) this.pendingBossType = this.floorBranch === 'B' ? SUPERBOSSES.clapper : SUPERBOSSES.plapper;
    else if (floorNum === 11) this.pendingBossType = this.floorBranch === 'B' ? SUPERBOSSES.vanilladnb : SUPERBOSSES.nhm;

    else if (floorNum === 12) this.pendingBossType = SUPERBOSSES.wobbler;
    else if (floorNum === 13) this.pendingBossType = SUPERBOSSES.subdrop;
    else if (floorNum === 14) this.pendingBossType = SUPERBOSSES.onetruednb;

    else if (floorNum === 16) this.pendingBossType = SUPERBOSSES.iceagent;
    else if (floorNum === 18) this.pendingBossType = SUPERBOSSES.mexico;
    else if (floorNum === 20) this.pendingBossType = SUPERBOSSES.g5;
    else if (floorNum === 22) this.pendingBossType = SUPERBOSSES.japan;
    else if (floorNum === 24) this.pendingBossType = SUPERBOSSES.deannb;
    else if (floorNum === 26) this.pendingBossType = SUPERBOSSES.israelprimeprime;
    else if (floorNum === 28) this.pendingBossType = SUPERBOSSES.palestine;
    else if (floorNum === 30) this.pendingBossType = SUPERBOSSES.warden;
    else if (floorNum === 32) this.pendingBossType = SUPERBOSSES.notch;
    else if (floorNum === 34) this.pendingBossType = SUPERBOSSES.kirkinator;
    else this.pendingBossType = resolveGenericBoss(floorNum, this.floorBranch);
    this.enterRoom(this.dungeon.start, null);
  }

  enterRoom(node, enteredSlot){
    ensureRoomBuilt(node);

    if (this.player) this.player.fireZone = null;

    const isDesignatedBossRoom = node.type === 'boss' && node === this.dungeon.bossNode;
    populateRoom(node, this.dungeon, Object.assign(
      { floorBranch: this.floorBranch },
      isDesignatedBossRoom ? { bossType: this.pendingBossType } : null
    ));
    this.currentRoom = node;

    if (node.rerollAltar) node.rerollAltar.uses = 0;

    if (this.player.trinketId === 'sprintersband') {
      this.player.speedBoostTimer = Math.max(this.player.speedBoostTimer, 2);
    }

    if (node.obstacles) for (const ob of node.obstacles) markBestiarySeen('objectsSeen', ob.kind);

    if (this.player.starDamageBonus || this.player.starSpeedMult !== 1) {
      this.player.starDamageBonus = 0;
      this.player.starSpeedMult = 1;
      recalcPlayerStats(this.player);
    }

    this.player.tookDamageThisRoom = false;
    const firstVisit = !node.discovered;
    node.discovered = true;
    node.visited = true;

    if (firstVisit) {
      if (node.type === 'petshop') bumpStat('petshopsVisited', 1, this);
      else if (node.type === 'curse') bumpStat('curseRoomsVisited', 1, this);
      else if (node.type === 'crystal') bumpStat('crystalRoomsVisited', 1, this);
      else if (node.type === 'star') bumpStat('starRoomsVisited', 1, this);
      else if (node.type === 'treasure') bumpStat('treasureRoomsVisited', 1, this);
      else if (node.type === 'shop') { bumpStat('shopRoomsVisited', 1, this); this.player.visitedShopThisRun = true; }
      else if (node.type === 'secret') bumpStat('secretRoomsVisited', 1, this);
      else if (node.type === 'sacrifice') bumpStat('sacrificeRoomsVisited', 1, this);
      else if (node.type === 'vault') bumpStat('vaultRoomsVisited', 1, this);
      else if (node.type === 'challenge') bumpStat('challengeRoomsVisited', 1, this);
      else if (node.type === 'sombra') bumpStat('sombraRoomsVisited', 1, this);
      else if (node.type === 'shrine') bumpStat('shrineRoomsVisited', 1, this);
      else if (node.type === 'arcade') bumpStat('arcadeRoomsVisited', 1, this);
      else if (node.type === 'mirror') bumpStat('mirrorRoomsVisited', 1, this);
      else if (node.type === 'karma') bumpStat('karmaRoomsVisited', 1, this);
      else if (node.type === 'bosschallenge') bumpStat('bossChallengeRoomsVisited', 1, this);
    }


    markBestiarySeen('seenRoomTypes', node.type, this);
    for (const slot of node.doorSlots) {
      if (slot.type === 'normal' && slot.pairedSlot) {
        const nb = slot.pairedSlot.room;
        if (nb && !nb.discovered) nb.seen = true;
      }
    }

    this.projectiles = []; this.bombs = []; this.explosions = []; this.creep = []; this.dustDevils = []; this.floatTexts = []; this.swingFX = null; this.laserFX = null;

    if (enteredSlot && enteredSlot.cells) {
      const cx = enteredSlot.cells.reduce((a, c) => a + c.x, 0) / enteredSlot.cells.length;
      const cy = enteredSlot.cells.reduce((a, c) => a + c.y, 0) / enteredSlot.cells.length;
      const dir = DIRS.find(d => d.d === enteredSlot.dir);
      const spot = findNearestFloor(node, Math.round(cx - dir.dx * 2), Math.round(cy - dir.dy * 2));
      this.player.x = spot.x * TILE + TILE / 2;
      this.player.y = spot.y * TILE + TILE / 2;
    } else {
      const spot = findNearestFloor(node, Math.floor(node.tileW / 2), Math.floor(node.tileH / 2));
      this.player.x = spot.x * TILE + TILE / 2;
      this.player.y = spot.y * TILE + TILE / 2;
    }

    for (const f of this.player.familiars) { f.x = this.player.x; f.y = this.player.y; }
    for (const m of this.player.changelingMinions) { m.x = this.player.x; m.y = this.player.y; }

    this.updateCamera();
    this.freezeTimer = ROOM_FREEZE_TIME;
    this.roomFadeTimer = ROOM_FADE_TIME;

    this.roomFadeDir = enteredSlot ? enteredSlot.dir : null;

    if (node.type === 'boss' && !node.bossDefeated) {
      Sound.play('bossIntro');
      this.player.tookDamageThisBossRoom = false;
    }

    const roomTrackId = ROOM_MUSIC_TRACKS[node.type];
    if (roomTrackId) Sound.startMusic(roomTrackId);
    else if (this.currentFloorTrackId) Sound.startMusic(this.currentFloorTrackId);
    else Sound.stopMusic();
    const label = roomLabel(node);
    if (label) showRoomBanner(label, node.type);
  }

  loadTestRoom(template, roomType){
    const node = {
      type: roomType || 'normal',
      shape: { mask: template.m },
      template,
      doorSlots: [],
      discovered: false,
      visited: false,
    };
    if (node.type === 'boss') this.dungeon.bossNode = node;
    this.dungeon.start = node;
    this.enterRoom(node, null);
  }

  transitionThroughDoor(slot){
    const oppSlot = slot && slot.pairedSlot;
    if (!oppSlot) return;

    if (!this.player.curseImmune) {
      if (this.currentRoom.type === 'curse') damagePlayer(this, 0.5, 'curse');
      if (oppSlot.room.type === 'curse') damagePlayer(this, 0.5, 'curse');
    }

    if (this.currentRoom && this.currentRoom.playerTurrets) this.currentRoom.playerTurrets.length = 0;
    this.enterRoom(oppSlot.room, oppSlot);
  }

  fitCanvas(){
    const wrap = document.getElementById('canvasWrap');
    if (!wrap) return;
    const maxW = Math.max(50, wrap.clientWidth - 8);
    const maxH = Math.max(50, wrap.clientHeight - 8);

    const scale = Math.min(maxW / CAMERA_W, maxH / CAMERA_H, 2.2);
    this.canvas.style.width = (CAMERA_W * scale) + 'px';
    this.canvas.style.height = (CAMERA_H * scale) + 'px';
    this._positionHudPanels(wrap, CAMERA_W * scale);
  }

  _positionHudPanels(wrap, canvasPxW){
    const leftPanel = document.getElementById('leftPanel');
    const rightPanel = document.getElementById('rightPanel');
    if (!leftPanel || !rightPanel) return;
    const gap = 14;
    const outer = 6;
    const minW = 130, maxW = 190;
    const sideSpace = (wrap.clientWidth - canvasPxW) / 2;
    const available = sideSpace - gap - outer;
    const fits = available >= minW;
    leftPanel.classList.toggle('hud-panel-hidden', !fits);
    rightPanel.classList.toggle('hud-panel-fallback', !fits);
    if (fits) {
      const panelW = Math.round(Util.clamp(available, minW, maxW));
      leftPanel.style.width = panelW + 'px';
      rightPanel.style.width = panelW + 'px';
      leftPanel.style.left = outer + 'px';
      rightPanel.style.right = outer + 'px';
    } else {

      rightPanel.style.width = '';
      rightPanel.style.right = '';
      leftPanel.style.width = '';
      leftPanel.style.left = '';
    }
  }

  updateCamera(){
    const node = this.currentRoom;
    const roomPxW = node.tileW * TILE, roomPxH = node.tileH * TILE;
    let camX = this.player.x - CAMERA_W / 2;
    let camY = this.player.y - CAMERA_H / 2;
    camX = roomPxW <= CAMERA_W ? (roomPxW - CAMERA_W) / 2 : Util.clamp(camX, 0, roomPxW - CAMERA_W);
    camY = roomPxH <= CAMERA_H ? (roomPxH - CAMERA_H) / 2 : Util.clamp(camY, 0, roomPxH - CAMERA_H);
    this.camX = camX; this.camY = camY;
  }

  tryPlaceBomb(){
    if (this.state !== 'playing' || this.paused || this.freezeTimer > 0) return;
    placeBombAt(this, this.player.x, this.player.y, 'player');
  }

  tryUseActive(){
    if (this.state !== 'playing' || this.paused || this.freezeTimer > 0) return;
    useActiveItem(this);
  }

  tryUsePill(){
    if (this.state !== 'playing' || this.paused || this.freezeTimer > 0) return;
    useHeldPill(this);
  }

  tryUseStar(){
    if (this.state !== 'playing' || this.paused || this.freezeTimer > 0) return;
    useHeldStar(this);
  }

  tryDonate(){
    if (this.state !== 'playing' || this.paused || this.freezeTimer > 0) return;
    if (this.currentRoom && this.currentRoom.type === 'karma') tryDonateKarmaMachine(this);
    else tryDonateMachine(this);
  }

  tryReroll(){
    if (this.state !== 'playing' || this.paused || this.freezeTimer > 0) return;
    const node = this.currentRoom;
    if (node && node.upgradeStation && node.rerollAltar) {
      const player = this.player;
      const stationDist = Util.dist(player.x, player.y, node.upgradeStation.x * TILE, node.upgradeStation.y * TILE);
      const altarDist = Util.dist(player.x, player.y, node.rerollAltar.x * TILE, node.rerollAltar.y * TILE);
      if (stationDist <= altarDist) tryUpgradeStation(this);
      else tryRerollAltar(this);
      return;
    }
    if (node && node.upgradeStation) { tryUpgradeStation(this); return; }
    tryRerollAltar(this);
  }

  tryArcadeInteract(){
    if (this.state !== 'playing' || this.paused || this.freezeTimer > 0) return;
    if (wdTryControlButton(this)) return;
    tryArcadeInteract(this);
  }

  tryDropTrinket(){
    if (this.state !== 'playing' || this.paused || this.freezeTimer > 0) return;
    dropTrinket(this);
  }

  tryUsePocket(){
    if (this.state !== 'playing' || this.paused || this.freezeTimer > 0) return;
    usePocketActive(this);
  }

  tryDestroyTurret(){
    if (this.state !== 'playing' || this.paused || this.freezeTimer > 0) return;
    if (!destroyTurret(this)) this.toast('No turrets to destroy.');
  }

  tryDonateOrArcade(){
    if (this.state !== 'playing' || this.paused || this.freezeTimer > 0) return;
    if (this.currentRoom && this.currentRoom.type === 'karma' && this.currentRoom.karmaMachines && this.currentRoom.karmaMachines.length) tryDonateKarmaMachine(this);
    else if (this.currentRoom && this.currentRoom.donationMachine) tryDonateMachine(this);
    else tryArcadeInteract(this);
  }

  toast(msg, long, kind){ toast(msg, long, kind); }

  onRoomJustCleared(){
    Sound.play('roomClear');
    this.player.gainRoomClearCharge();
    bumpStat('roomsCleared', 1, this);
    if (this.runStats) this.runStats.roomsCleared++;
    spawnClearRoomPickup(this);

    if (this.player.goldHeart && !this.player.tookDamageThisRoom) {
      this.player.heal(0.5);
      Sound.play('heart');
      this.floatTexts.push(new FloatText(this.player.x, this.player.y - 30, '+½ heart', '#e35b6a'));
    }

    if (this.player.trinketId === 'tithebell' && Util.chance(0.2)) {
      const node = this.currentRoom;
      const spot = findClearFloorSpot(node, Math.floor(this.player.x / TILE), Math.floor(this.player.y / TILE));
      node.pickups.push(new Pickup('coin', spot.x, spot.y, Util.weighted(COIN_TYPES)));
    }
    if (this.player.trinketId === 'mendingchime' && Util.chance(0.1) && this.player.redCurrent < this.player.redMax) {
      this.player.heal(0.5);
      Sound.play('heart');
      this.floatTexts.push(new FloatText(this.player.x, this.player.y - 30, '+\u00bd heart', '#e35b6a'));
    }
    if (this.player.trinketId === 'tinwhistle' && this.player.activeItem && Util.chance(0.05)) {
      this.player.activeCharge = Math.min(this.player.activeItem.maxCharge, this.player.activeCharge + 1);
      toast('Room cleared! Tin Whistle hums — active item charged!');
    } else {
      toast('Room cleared!');
    }
  }

  onBossDefeated(enemy){
    const node = this.currentRoom;

    const f = this.dungeon.floorNum;
    const isBonusBossRoom = !this.floorPath && (f === 8 || f === 9 || f === 10 || f === 11) && node !== this.dungeon.bossNode;
    if (this.mode !== 'wavedefense' && !isBonusBossRoom) node.stairsSpot = { x: node.tileW / 2, y: node.tileH / 2 };

    if (this.player.trinketId === 'trophychain' && enemy) {
      for (let i = 0; i < 5; i++) {
        const spot = findClearFloorSpot(node, Math.floor(enemy.x / TILE), Math.floor(enemy.y / TILE));
        node.pickups.push(new Pickup('coin', spot.x, spot.y, Util.weighted(COIN_TYPES)));
      }
    }
    const unlocks = loadUnlocks();

    const superbossId = enemy && enemy.type && SUPERBOSSES[enemy.type.id] ? enemy.type.id : null;
    if (superbossId) {
      if (!unlocks.superbossDefeats) unlocks.superbossDefeats = { polish:0, tyrone:0, pineapple:0, israel:0, algae:0, lilac:0,
        plapper:0, clapper:0, nhm:0, vanilladnb:0, onetruednb:0 };
      const beforeCount = unlocks.superbossDefeats[superbossId] || 0;
      unlocks.superbossDefeats[superbossId] = beforeCount + 1;

      if (!unlocks.classSuperbossDefeats) unlocks.classSuperbossDefeats = {};
      const classId = this.player.classId;
      if (classId) {
        if (!unlocks.classSuperbossDefeats[classId]) unlocks.classSuperbossDefeats[classId] = {};
        const classBeforeCount = unlocks.classSuperbossDefeats[classId][superbossId] || 0;
        unlocks.classSuperbossDefeats[classId][superbossId] = classBeforeCount + 1;
      }

      if (superbossId === 'polish' && !unlocks.polishDefeated) {
        unlocks.polishDefeated = true;
        toast('Polish DNB falls! The Inferno awaits on future runs...');
      }
      if (superbossId === 'tyrone' && beforeCount + 1 === 3) {
        toast('Tyrone falls for the 3rd time! A branching path awaits on future runs...');
      }
      saveUnlocks(unlocks);

      if (superbossId === 'tyrone' && beforeCount >= 3) {
        node.stairsSpot = null;
        const cx = node.tileW / 2, cy = node.tileH / 2;
        node.branchSpots = [
          { x: cx - 2.4, y: cy, branch: 'A', label: '9A' },
          { x: cx + 2.4, y: cy, branch: 'B', label: '9B' },
        ];
      }
    }

    unlockAchievement('unlock_batpony', this);
    if (superbossId) {
      unlockAchievement('sb_' + superbossId + '_' + this.player.classId, this);
      if (!this.player.tookDamageThisBossRoom) unlockAchievement('untouchable', this);

      if (!this.player.tookDamageThisBossRoom) {
        this.player.bossRoomsNoDamageStreak = (this.player.bossRoomsNoDamageStreak || 0) + 1;
        if (this.player.bossRoomsNoDamageStreak >= 2) unlockAchievement('challenge_bossstreak_2', this);
        if (this.player.bossRoomsNoDamageStreak >= 4) unlockAchievement('challenge_bossstreak_4', this);
        if (this.player.bossRoomsNoDamageStreak >= 7) unlockAchievement('challenge_bossstreak_7', this);
      } else {
        this.player.bossRoomsNoDamageStreak = 0;
      }
      if (this.player.redCurrent + this.player.blueCurrent <= 1) unlockAchievement('unbreakable', this);
      if (superbossId === 'polish') {
        unlockAchievement('unlock_hypogriff', this);
        if (!this.player.tookDamageThisRun) unlockAchievement('unlock_seapony', this);
      }
      if (superbossId === 'pineapple') unlockAchievement('unlock_griffin', this);
      if (superbossId === 'israel') unlockAchievement('unlock_kirin', this);
      if (superbossId === 'tyrone') unlockAchievement('unlock_dragon', this);
      if (superbossId === 'onetruednb') unlockAchievement('unlock_dnbpony', this);

      if (superbossId === 'onetruednb' && !this.player.tookDamageThisRun) unlockAchievement('challenge_flawless_run', this);

      if (superbossId === 'wobbler') {
        if (!this.player.tookDamageThisBossRoom) unlockAchievement('challenge_hollowchorus_flawless', this);
        if (!this.player.tookDamageThisFloor) unlockAchievement('challenge_hollowchorus_floor_nodamage', this);
        if (this.player.redMax <= 1) unlockAchievement('challenge_hollowchorus_onehearted', this);
        if (this.runElapsed < 20 * 60) unlockAchievement('challenge_hollowchorus_speedkill', this);
      }
      if (superbossId === 'subdrop') {
        if (!this.player.tookDamageThisBossRoom) unlockAchievement('challenge_finalwaveform_flawless', this);
        if (!this.player.tookDamageThisFloor) unlockAchievement('challenge_finalwaveform_floor_nodamage', this);
        if (this.player.redMax <= 1) unlockAchievement('challenge_finalwaveform_onehearted', this);
        if (this.runElapsed < 26 * 60) unlockAchievement('challenge_finalwaveform_speedkill', this);
        if (!this.player.visitedShopThisRun) unlockAchievement('challenge_subdrop_frugal', this);
        if (!this.player.tookDamageThisRun) unlockAchievement('challenge_finalwaveform_untouched_run', this);
      }

      if (superbossId === 'mangrove') {
        if (!this.player.tookDamageThisBossRoom) unlockAchievement('challenge_mangrove_flawless', this);
        if (!this.player.tookDamageThisFloor) unlockAchievement('challenge_mangrove_floor_nodamage', this);
        if (this.player.redMax <= 1) unlockAchievement('challenge_mangrove_onehearted', this);
        if (this.runElapsed < 18 * 60) unlockAchievement('challenge_mangrove_speedkill', this);
        if (!this.player.visitedShopThisRun) unlockAchievement('challenge_mangrove_frugal', this);
        if (!this.player.tookDamageThisRun) unlockAchievement('challenge_mangrove_untouched_run', this);
      }

      if (superbossId === 'astrolabe') {
        if (!this.player.tookDamageThisBossRoom) unlockAchievement('challenge_astrolabe_flawless', this);
        if (!this.player.tookDamageThisFloor) unlockAchievement('challenge_astrolabe_floor_nodamage', this);
        if (this.player.redMax <= 1) unlockAchievement('challenge_astrolabe_onehearted', this);
        if (this.runElapsed < 19 * 60) unlockAchievement('challenge_astrolabe_speedkill', this);
        if (!this.player.visitedShopThisRun) unlockAchievement('challenge_astrolabe_frugal', this);
        if (!this.player.tookDamageThisRun) unlockAchievement('challenge_astrolabe_untouched_run', this);
      }

      if (superbossId === 'orrery') {
        if (!this.player.tookDamageThisBossRoom) unlockAchievement('challenge_orrery_flawless', this);
        if (!this.player.tookDamageThisFloor) unlockAchievement('challenge_orrery_floor_nodamage', this);
        if (this.player.redMax <= 1) unlockAchievement('challenge_orrery_onehearted', this);
        if (this.runElapsed < 28 * 60) unlockAchievement('challenge_orrery_speedkill', this);
        if (!this.player.visitedShopThisRun) unlockAchievement('challenge_orrery_frugal', this);
        if (!this.player.tookDamageThisRun) unlockAchievement('challenge_orrery_untouched_run', this);
      }

      if (superbossId === 'singularity') {
        if (!this.player.tookDamageThisBossRoom) unlockAchievement('challenge_voidbetween2_flawless', this);
        if (!this.player.tookDamageThisFloor) unlockAchievement('challenge_voidbetween2_floor_nodamage', this);
        if (this.player.redMax <= 1) unlockAchievement('challenge_voidbetween2_onehearted', this);
        if (this.runElapsed < 38 * 60) unlockAchievement('challenge_voidbetween2_speedkill', this);
        if (!this.player.visitedShopThisRun) unlockAchievement('challenge_voidbetween2_frugal', this);
        if (!this.player.tookDamageThisRun) unlockAchievement('challenge_voidbetween2_untouched_run', this);
      }
    }
  }

  updateItemPedestal(){
    const node = this.currentRoom;
    if (!node.itemPedestals) return;
    for (const ped of node.itemPedestals) {
      if (ped.taken) continue;
      const px = ped.x * TILE, py = ped.y * TILE;
      const distToPed = Util.dist(this.player.x, this.player.y, px, py);

      if (ped.justDropped) {
        if (distToPed >= 22) ped.justDropped = false;
        else continue;
      }
      if (distToPed < 22) {

        if (ped.isDeal) {
          const player = this.player;
          if (player.def.id === 'kirin') {
            if (player.dealFreebieUsed) {

              if (node.keyToastCooldown <= 0) { node.keyToastCooldown = 1.5; Sound.play('uiDeny'); this.toast("You've already used your free deal this run."); }
              continue;
            }
            player.dealFreebieUsed = true;
          } else {

            const q = ped.item.quality || 1;
            const containerCost = q <= 2 ? 1 : 2;
            const blueCost = q <= 2 ? 2 : 3;

            const discount = Math.min(1, player.dealDiscount || 0);

            if (!player.def.noRedContainers && (player.redMax - containerCost) >= 1) {
              const effectiveCost = Math.max(0, Math.round(containerCost * (1 - discount)));
              if (effectiveCost > 0) player.grantHeartContainer(-effectiveCost);
            } else if (player.blueCurrent >= blueCost) {
              const effectiveCost = Math.max(0, Math.round(blueCost * (1 - discount)));
              if (effectiveCost > 0) player.blueCurrent -= effectiveCost;
            } else {
              if (node.keyToastCooldown <= 0) { node.keyToastCooldown = 1.5; Sound.play('uiDeny'); this.toast("Not enough hearts for this deal."); }
              continue;
            }
          }
          if (ped.dealType === 'crystal') bumpStat('crystalDealsTaken', 1, this);
          else bumpStat('sombraDealsTaken', 1, this);

          if (!this.dealAlignment) this.dealAlignment = ped.dealType || 'sombra';
        }

        if (ped.isShrine) {
          const player = this.player;
          if (player.coins < ped.coinCost) {
            if (node.keyToastCooldown <= 0) { node.keyToastCooldown = 1.5; Sound.play('uiDeny'); this.toast('Not enough coins for this shrine offer.'); }
            continue;
          }
          player.coins -= ped.coinCost;
        }
        ped.taken = true;
        if (ped.isTrinket) equipTrinket(this, ped.item, ped);
        else if (ped.isFamiliar) addFamiliar(this, ped.item);

        else if (ped.isStar) grantPickupEffect(this, 'star', px, py - 10, undefined, undefined, ped.starId);
        else applyItemToPlayer(this, ped.item);

        if (node.type === 'challenge' && !node.challengeStarted) startChallengeRoom(this, node);
        else if (node.type === 'bosschallenge' && !node.challengeStarted && !node.cleared) startBossChallengeRoom(this, node);
      }
    }
  }

  updateItemExamine(){
    const node = this.currentRoom;
    let nearest = null, nearestD = 70;
    if (node.itemPedestals) {
      for (const ped of node.itemPedestals) {
        if (ped.taken) continue;
        const d = Util.dist(this.player.x, this.player.y, ped.x * TILE, ped.y * TILE);
        if (d < nearestD) { nearestD = d; nearest = ped; }
      }
    }
    showItemExamine(nearest, this.player);
  }

  logEvent(type, label){
    this.runLog.push({ type, label, time: this.runElapsed });
    if (this.runLog.length > 50) this.runLog.shift();
  }

  checkStairs(){
    const node = this.currentRoom;
    if (node.branchSpots) {
      for (const b of node.branchSpots) {
        if (Util.dist(this.player.x, this.player.y, b.x * TILE, b.y * TILE) < 26) { this.descend(b.branch); return; }
      }
      return;
    }
    if (!node.stairsSpot) return;
    const px = node.stairsSpot.x * TILE, py = node.stairsSpot.y * TILE;
    if (Util.dist(this.player.x, this.player.y, px, py) < 26) this.descend();
  }

  descend(branch){

    this.logEvent('floor', 'Floor ' + floorLabelFor(this.dungeon.floorNum, this.floorPath) + ' complete');
    if (!this.player.tookDamageThisFloor) {
      this.floorsClearedNoDamage = (this.floorsClearedNoDamage || 0) + 1;
      if (this.floorsClearedNoDamage >= 2) unlockAchievement('unlock_zebra', this);
      if (this.floorsClearedNoDamage >= 4) unlockAchievement('challenge_floors_nodamage_4', this);
      if (this.floorsClearedNoDamage >= 6) unlockAchievement('challenge_floors_nodamage_6', this);
    } else {
      this.floorsClearedNoDamage = 0;
    }

    if (this.floorPath === 'D' && this.dungeon.floorNum === 7) {
      if (!this.player.tookDamageThisFloor) unlockAchievement('challenge_voidbetween_8d_nodamage', this);
      if (!this.player.visitedShopThisRun) unlockAchievement('challenge_voidbetween_8d_frugal', this);
      if (!this.player.tookDamageThisRun) unlockAchievement('challenge_voidbetween_8d_untouched', this);
    }
    Sound.play('descend');

    if (this.player.eternalHeart) {
      this.player.eternalHeart = false;
      this.player.redMax = Math.max(0, this.player.redMax - 0.5);
      this.player.redCurrent = Math.min(this.player.redCurrent, this.player.redMax);
      this.player.grantHeartContainer(1);
      this.toast('💗 Eternal Heart became a heart container!');
    }

    if (branch === 'C') {
      this.floorPath = 'C';
      this.toast('You slip down the storm drain...');
      this.startFloor(2);
      return;
    }

    if (branch === 'D') {
      this.floorPath = 'D';
      this.toast('You step off the platform and fall upward, into the stars...');
      this.startFloor(3);
      return;
    }
    if (branch) {
      this.floorBranch = branch;
      this.startFloor(8);
      return;
    }

    if (this.floorPath === 'C') {
      if (this.dungeon.floorNum >= C_LAST_FLOORNUM) {

        bumpStat('cBranchRunsCompleted', 1, this);

        unlockPath('D', this);
        this.state = 'win'; endRunUnlocks(); return;
      }
      this.startFloor(this.dungeon.floorNum + 1);
      return;
    }

    if (this.floorPath === 'D') {
      if (this.dungeon.floorNum >= D_LAST_FLOORNUM) {

        bumpStat('dBranchRunsCompleted', 1, this);
        this.state = 'win'; endRunUnlocks(); return;
      }
      this.startFloor(this.dungeon.floorNum + 1);
      return;
    }

    if (this.dungeon.floorNum === 8) { this.startFloor(9); return; }
    if (this.dungeon.floorNum === 9) { this.startFloor(10); return; }
    if (this.dungeon.floorNum === 10) { this.startFloor(11); return; }
    if (this.dungeon.floorNum === 11) { this.startFloor(12); return; }
    if (this.dungeon.floorNum === 12) { this.startFloor(13); return; }
    if (this.dungeon.floorNum === 13) { this.startFloor(14); return; }

    if (this.dungeon.floorNum >= OLD_MAIN_ROUTE_FINAL_FLOOR && this.dungeon.floorNum < MAIN_ROUTE_FINAL_FLOOR) {
      if (this.dungeon.floorNum === OLD_MAIN_ROUTE_FINAL_FLOOR) unlockPath('C', this);
      this.startFloor(this.dungeon.floorNum + 1);
      return;
    }
    const next = this.dungeon.floorNum + 1;
    if (next >= this.maxFloorsThisRun) {

      if (!this.floorPath && this.dungeon.floorNum >= OLD_MAIN_ROUTE_FINAL_FLOOR) unlockPath('C', this);
      this.state = 'win'; endRunUnlocks(); return;
    }
    this.startFloor(next);
  }

  isLastFloorOfRun(){
    const f = this.dungeon.floorNum;

    if (this.floorPath === 'C') return f >= C_LAST_FLOORNUM;

    if (this.floorPath === 'D') return f >= D_LAST_FLOORNUM;

    if (f === 8 || f === 9 || f === 10 || f === 11 || f === 12 || f === 13) return false;

    if (f >= OLD_MAIN_ROUTE_FINAL_FLOOR) return f >= MAIN_ROUTE_FINAL_FLOOR;
    return f + 1 >= this.maxFloorsThisRun;
  }

  update(input, dt){
    if (this.state !== 'playing' || this.paused) return;
    this.now = performance.now();
    this.runElapsed += dt;
    if (this.roomFadeTimer > 0) this.roomFadeTimer -= dt;
    if (this.freezeTimer > 0) {
      this.freezeTimer -= dt;
      updateHUD(this);
      drawMinimap(this);
      return;
    }

    if (FX.frozen()) {
      updateHUD(this);
      drawMinimap(this);
      return;
    }
    updatePlayer(this, input, dt);
    if (this.slowTimer > 0) this.slowTimer -= dt;
    const enemyDt = this.slowTimer > 0 ? dt * 0.35 : dt;
    for (const e of this.currentRoom.enemies) updateEnemy(this, e, enemyDt);
    updateFamiliars(this, dt);
    updateObstacles(this, dt);
    updateProjectiles(this, dt);
    updateBombs(this, dt);
    updateExplosions(this, dt);
    updateCreep(this, dt);
    updateDustDevils(this, dt);
    updateFloatTexts(this, dt);
    updateShop(this);
    this.updateItemPedestal();
    this.updateItemExamine();
    this.updateCamera();
    if (this.swingFX) { this.swingFX.life -= dt; if (this.swingFX.life <= 0) this.swingFX = null; }
    if (this.laserFX) { this.laserFX.life -= dt; if (this.laserFX.life <= 0) this.laserFX = null; }
    if (this.mode !== 'wavedefense') this.checkStairs();

    if (this.player.isDead) { this.state = 'gameover'; endRunUnlocks(); }
    updateHUD(this);
    drawMinimap(this);
  }
}
