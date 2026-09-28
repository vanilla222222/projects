'use strict';

function loadUnlocks(){
  try { return JSON.parse(localStorage.getItem('nightfallUnlocks') || '{}'); }
  catch (e) { return {}; }
}
function saveUnlocks(u){ localStorage.setItem('nightfallUnlocks', JSON.stringify(u)); }

const DEFAULT_KEYBINDS = {
  moveUp: 'KeyW', moveUpAlt: 'ArrowUp',
  moveDown: 'KeyS', moveDownAlt: 'ArrowDown',
  moveLeft: 'KeyA', moveLeftAlt: 'ArrowLeft',
  moveRight: 'KeyD', moveRightAlt: 'ArrowRight',
  attack: 'Space',
  buildTurret: 'KeyV',
  bomb: 'KeyB',
  activeItem: 'KeyE',
  pill: 'KeyQ',
  star: 'KeyR',
  donate: 'KeyF',
  reroll: 'KeyG',
  arcade: 'KeyH',
  pocketActive: 'KeyU',
  mute: 'KeyM',
  achievements: 'KeyT',
  bestiary: 'KeyC',
  skillTree: 'KeyK',
};

const KEYBIND_LABELS = {
  moveUp: 'Move Up', moveDown: 'Move Down', moveLeft: 'Move Left', moveRight: 'Move Right',
  attack: 'Attack', buildTurret: 'Build Turret (hold)', bomb: 'Bomb', activeItem: 'Active Item',
  pill: 'Pill', star: 'Star', donate: 'Donate', reroll: 'Reroll', arcade: 'Arcade',
  pocketActive: 'Pocket Active', mute: 'Mute Toggle', achievements: 'Achievements',
  bestiary: 'Bestiary', skillTree: 'Skill Tree',
};
function loadKeybindsPref(){
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem('nightfallKeybinds') || '{}'); }
  catch (e) { saved = {}; }

  return Object.assign({}, DEFAULT_KEYBINDS, saved);
}
function saveKeybindsPref(kb){
  try { localStorage.setItem('nightfallKeybinds', JSON.stringify(kb)); } catch (e) {  }
}

let keybinds = loadKeybindsPref();

function keyCodeLabel(code){
  if (!code) return '?';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Arrow')) return code.slice(5);
  return code;
}

function refreshKeybindHints(){
  const k = keybinds, L = keyCodeLabel;
  const hint = document.getElementById('controlsHint');
  if (hint) {
    hint.innerHTML =
      `Move: WASD / Arrows &nbsp;·&nbsp; Attack: Left Click or ${L(k.attack)} &nbsp;·&nbsp; ` +
      `Bomb: ${L(k.bomb)} &nbsp;·&nbsp; Build Turret (hold): ${L(k.buildTurret)} &nbsp;·&nbsp; ` +
      `Active Item: ${L(k.activeItem)} &nbsp;·&nbsp; Pill: ${L(k.pill)} &nbsp;·&nbsp; Star: ${L(k.star)} &nbsp;·&nbsp; ` +
      `Donate: ${L(k.donate)} &nbsp;·&nbsp; Reroll: ${L(k.reroll)} &nbsp;·&nbsp; Arcade: ${L(k.arcade)} &nbsp;·&nbsp; ` +
      `Bestiary: ${L(k.bestiary)} &nbsp;·&nbsp; Achievements: ${L(k.achievements)} &nbsp;·&nbsp; Pause: Esc`;
  }
  const pkb = document.getElementById('pauseKeybinds');
  if (pkb) {
    const rows = [
      ['WASD', 'Move'],
      ['Click', 'Attack'],
      [L(k.bomb), 'Bomb'],
      [L(k.buildTurret), 'Build Turret (hold)'],
      [L(k.activeItem), 'Active Item'],
      [L(k.pocketActive), 'Pocket Active'],
      [L(k.pill), 'Pill'],
      [L(k.star), 'Star'],
      [L(k.donate), 'Donate'],
      [L(k.reroll), 'Reroll'],
      [L(k.arcade), 'Arcade'],
      [L(k.mute), 'Mute'],
    ];
    pkb.innerHTML = rows.map(([key, label]) => `<span class="pause-keybind"><kbd>${key}</kbd> ${label}</span>`).join('');
  }
}

let game = null;

const input = { left:false, right:false, up:false, down:false, attack:false, build:false, mouseX:0, mouseY:0, mouseActive:false };

const canvas = document.getElementById('game');

function toggleMuteUI(){
  const muted = Sound.toggleMute();
  syncMuteBtn();
  toast(muted ? 'Sound muted' : 'Sound unmuted');
}

window.addEventListener('keydown', (e) => {
  Sound.unlock();

  if ((e.code === 'ArrowLeft' || e.code === 'ArrowRight') && !document.getElementById('bestiaryScreen').classList.contains('hidden')) {
    const active = document.activeElement;
    if (!active || (active.tagName !== 'INPUT' && active.tagName !== 'SELECT' && active.tagName !== 'TEXTAREA')) {
      const dir = e.code === 'ArrowLeft' ? -1 : 1;
      const idx = BESTIARY_TABS.findIndex(t => t.id === _bestiaryTab);
      const next = BESTIARY_TABS[(idx + dir + BESTIARY_TABS.length) % BESTIARY_TABS.length];
      _bestiaryTab = next.id;
      try { localStorage.setItem('nightfallBestiaryTab', next.id); } catch (err) {  }
      Sound.play('uiClick');
      buildBestiaryPanel();
      e.preventDefault();
      return;
    }
  }

  switch (e.code) {
    case keybinds.moveUp: case keybinds.moveUpAlt: input.up = true; break;
    case keybinds.moveDown: case keybinds.moveDownAlt: input.down = true; break;
    case keybinds.moveLeft: case keybinds.moveLeftAlt: input.left = true; break;
    case keybinds.moveRight: case keybinds.moveRightAlt: input.right = true; break;
    case keybinds.attack: input.attack = true; e.preventDefault(); break;

    case keybinds.buildTurret: input.build = true; break;
    case keybinds.bomb: if (game) game.tryPlaceBomb(); break;
    case keybinds.activeItem: if (game) game.tryUseActive(); break;
    case keybinds.pill: if (game) game.tryUsePill(); break;
    case keybinds.star: if (game) game.tryUseStar(); break;
    case keybinds.donate: if (game) game.tryDonate(); break;

    case keybinds.reroll: if (game && !e.repeat) game.tryReroll(); break;

    case keybinds.arcade: if (game && !e.repeat) game.tryArcadeInteract(); break;

    case keybinds.pocketActive: if (game) game.tryUsePocket(); break;
    case keybinds.mute: toggleMuteUI(); break;
    case keybinds.achievements: toggleOverlay('achievementsScreen', buildAchievementsPanel, markAchievementsSeen); break;
    case keybinds.bestiary: toggleOverlay('bestiaryScreen', buildBestiaryPanel, markBestiarySeenBadge); break;
    case keybinds.skillTree: toggleOverlay('skillTreeScreen', () => { resetSkillTreeCamera(); buildSkillTreePanel(); }); break;
    case 'Escape': {

      const openScreen = ['achievementsScreen', 'bestiaryScreen', 'skillTreeScreen']
        .map(id => document.getElementById(id))
        .find(el => el && !el.classList.contains('hidden'));
      if (openScreen) { Sound.play('uiClick'); openScreen.classList.add('hidden'); }
      else togglePause();
      break;
    }
    default: return;
  }
});
window.addEventListener('keyup', (e) => {
  switch (e.code) {
    case keybinds.moveUp: case keybinds.moveUpAlt: input.up = false; break;
    case keybinds.moveDown: case keybinds.moveDownAlt: input.down = false; break;
    case keybinds.moveLeft: case keybinds.moveLeftAlt: input.left = false; break;
    case keybinds.moveRight: case keybinds.moveRightAlt: input.right = false; break;
    case keybinds.attack: input.attack = false; break;
    case keybinds.buildTurret: input.build = false; break;
  }
});

canvas.addEventListener('pointermove', (e) => {
  const rect = canvas.getBoundingClientRect();

  input.mouseX = (e.clientX - rect.left) * (CAMERA_W / rect.width);
  input.mouseY = (e.clientY - rect.top) * (CAMERA_H / rect.height);
  input.mouseActive = true;
});
canvas.addEventListener('pointerleave', () => { input.mouseActive = false; });
canvas.addEventListener('pointerdown', (e) => {
  Sound.unlock();
  if (e.button === 0) input.attack = true;
  if (e.button === 2 && game) game.tryPlaceBomb();
});
window.addEventListener('pointerup', (e) => { if (e.button === 0) input.attack = false; });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

(function bindTouchControls(){
  const joy = document.getElementById('touchJoystick');
  const knob = document.getElementById('touchJoystickKnob');
  if (joy && knob) {
    const RADIUS = 38;

    const DEADZONE = 10;
    let joyPointerId = null;
    function setDir(dx, dy){
      input.left = dx < -DEADZONE;
      input.right = dx > DEADZONE;
      input.up = dy < -DEADZONE;
      input.down = dy > DEADZONE;
    }
    function resetDir(){
      input.left = input.right = input.up = input.down = false;
      knob.style.transform = 'translate(-50%,-50%)';
    }
    joy.addEventListener('pointerdown', (e) => {
      Sound.unlock();
      joyPointerId = e.pointerId;
      joy.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    joy.addEventListener('pointermove', (e) => {
      if (e.pointerId !== joyPointerId) return;
      const rect = joy.getBoundingClientRect();
      const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
      let dx = e.clientX - cx, dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > RADIUS) { dx = dx / dist * RADIUS; dy = dy / dist * RADIUS; }
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      setDir(dx, dy);
      e.preventDefault();
    });
    function endJoy(e){
      if (e.pointerId !== joyPointerId) return;
      joyPointerId = null;
      resetDir();
    }
    joy.addEventListener('pointerup', endJoy);
    joy.addEventListener('pointercancel', endJoy);
    joy.addEventListener('lostpointercapture', () => { if (joyPointerId != null) { joyPointerId = null; resetDir(); } });
  }

  function bindTap(id, fn){
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('pointerdown', (e) => {
      Sound.unlock();
      e.preventDefault();
      fn();
    });
  }
  bindTap('touchBombBtn', () => game && game.tryPlaceBomb());
  bindTap('touchActiveBtn', () => game && game.tryUseActive());
  bindTap('touchPillBtn', () => game && game.tryUsePill());
  bindTap('touchStarBtn', () => game && game.tryUseStar());
  bindTap('touchDonateBtn', () => game && game.tryDonate());
  bindTap('touchRerollBtn', () => game && game.tryReroll());
  bindTap('touchArcadeBtn', () => game && game.tryArcadeInteract());
  bindTap('touchPauseBtn', () => togglePause());

  const turretBtn = document.getElementById('touchTurretBtn');
  if (turretBtn) {
    const startBuild = (e) => { Sound.unlock(); e.preventDefault(); input.build = true; };
    const stopBuild = () => { input.build = false; };
    turretBtn.addEventListener('pointerdown', startBuild);
    turretBtn.addEventListener('pointerup', stopBuild);
    turretBtn.addEventListener('pointercancel', stopBuild);
    turretBtn.addEventListener('pointerleave', stopBuild);
  }
})();

(function bindSideActionBar(){
  function bindTap(id, fn){
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('pointerdown', (e) => { Sound.unlock(); e.preventDefault(); fn(); });
  }
  bindTap('sideActionPill', () => game && game.tryUsePill());
  bindTap('sideActionStar', () => game && game.tryUseStar());
  bindTap('sideActionDropTrinket', () => game && game.tryDropTrinket());
  bindTap('sideActionActive', () => game && game.tryUseActive());
  bindTap('sideActionPocket', () => game && game.tryUsePocket());
  bindTap('sideActionBomb', () => game && game.tryPlaceBomb());
  bindTap('sideActionDestroyTurret', () => game && game.tryDestroyTurret());
  bindTap('sideActionDonateArcade', () => game && game.tryDonateOrArcade());

  const buildBtn = document.getElementById('sideActionBuildTurret');
  if (buildBtn) {
    const startBuild = (e) => { Sound.unlock(); e.preventDefault(); input.build = true; };
    const stopBuild = () => { input.build = false; };
    buildBtn.addEventListener('pointerdown', startBuild);
    buildBtn.addEventListener('pointerup', stopBuild);
    buildBtn.addEventListener('pointercancel', stopBuild);
    buildBtn.addEventListener('pointerleave', stopBuild);
  }
})();

function togglePause(){
  if (!game || (game.state !== 'playing')) return;
  game.paused = !game.paused;
  document.getElementById('pauseScreen').classList.toggle('hidden', !game.paused);

  if (game.paused) releaseWakeLock(); else requestWakeLock();
  if (game.paused) {
    const player = game.player;
    document.getElementById('pauseStats').textContent =
      `${CLASSES[player.classId].name} · Floor ${game.dungeon.floorNum + 1} · ${Util.formatNum(player.coins)}c · ${player.keys} keys · ${player.bombs} bombs · ` +
      `${game.runKills} kills · ${Util.formatDuration(game.runElapsed)} played`;

    const eqEl = document.getElementById('pauseEquipped');
    if (eqEl) {
      const bits = [];
      if (player.activeItem) bits.push(player.activeItem.icon + ' ' + player.activeItem.name);
      if (player.trinketId) bits.push(TRINKETS[player.trinketId].icon + ' ' + TRINKETS[player.trinketId].name);
      if (player.pillPocket) bits.push('💊 ' + PILL_COLORS_BY_ID[player.pillPocket].name);
      if (player.starPocket) bits.push(STAR_TYPES[player.starPocket].icon + ' ' + STAR_TYPES[player.starPocket].name);
      eqEl.textContent = bits.join('   ·   ');
    }
  }
}
document.getElementById('resumeBtn').addEventListener('click', () => { Sound.play('uiClick'); togglePause(); });
document.getElementById('quitBtn').addEventListener('click', () => {

  if (!confirm('Quit to the main menu? Your current run will be lost.')) return;
  Sound.play('uiClick');
  bumpStat('totalPlaytime', Math.round(game.runElapsed), game);
  document.getElementById('pauseScreen').classList.add('hidden');
  returnToMenu();
});

function openOverlay(id, buildFn, markSeenFn){
  Sound.play('uiClick');
  buildFn();
  const el = document.getElementById(id);
  el.classList.remove('hidden');
  el.scrollTop = 0;
  if (markSeenFn) markSeenFn();
}
function toggleOverlay(id, buildFn, markSeenFn){
  const el = document.getElementById(id);
  if (!el) return;
  if (el.classList.contains('hidden')) openOverlay(id, buildFn, markSeenFn);
  else { Sound.play('uiClick'); el.classList.add('hidden'); }
}

for (const id of ['achievementsScreen', 'bestiaryScreen', 'skillTreeScreen']) {
  document.getElementById(id).addEventListener('click', (e) => {
    if (e.target.id === id) { Sound.play('uiClick'); e.target.classList.add('hidden'); }
  });
}

document.getElementById('musicTestScreen').addEventListener('click', (e) => {
  if (e.target.id === 'musicTestScreen') { Sound.play('uiClick'); closeMusicTestPanel(); e.target.classList.add('hidden'); }
});
document.getElementById('settingsScreen').addEventListener('click', (e) => {
  if (e.target.id === 'settingsScreen') { Sound.play('uiClick'); e.target.classList.add('hidden'); }
});

document.getElementById('pauseAchievementsBtn').addEventListener('click', () => openOverlay('achievementsScreen', buildAchievementsPanel, markAchievementsSeen));
document.getElementById('pauseBestiaryBtn').addEventListener('click', () => openOverlay('bestiaryScreen', buildBestiaryPanel, markBestiarySeenBadge));
document.getElementById('pauseSkillTreeBtn').addEventListener('click', () => openOverlay('skillTreeScreen', () => { resetSkillTreeCamera(); buildSkillTreePanel(); }));
document.getElementById('retryBtn').addEventListener('click', () => { Sound.play('uiClick'); returnToMenu(); });
document.getElementById('winBtn').addEventListener('click', () => { Sound.play('uiClick'); returnToMenu(); });

document.getElementById('achievementsBtn').addEventListener('click', () => openOverlay('achievementsScreen', buildAchievementsPanel, markAchievementsSeen));
document.getElementById('bestiaryBtn').addEventListener('click', () => openOverlay('bestiaryScreen', buildBestiaryPanel, markBestiarySeenBadge));
document.getElementById('skillTreeBtn').addEventListener('click', () => openOverlay('skillTreeScreen', () => { resetSkillTreeCamera(); buildSkillTreePanel(); }));
document.getElementById('musicTestBtn').addEventListener('click', () => { Sound.unlock(); openOverlay('musicTestScreen', buildMusicTestPanel); });
document.getElementById('waveDefenseBtn').addEventListener('click', () => {
  Sound.unlock();
  buildClassSelect(startWaveDefenseWithClass);
  const wrap = document.getElementById('classSelect');
  if (wrap && wrap.scrollIntoView) wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
  toast('🌊 Wave Defense — pick a class to begin.', true);
});
document.getElementById('settingsBtn').addEventListener('click', () => { Sound.unlock(); openOverlay('settingsScreen', buildSettingsPanel); });

function markAchievementsSeen(){
  const unlocks = ensureUnlockShape(loadUnlocks());
  try { localStorage.setItem('nightfallAchvSeenCount', String(Object.keys(unlocks.achievements).length)); } catch (e) {  }
  const badge = document.getElementById('achievementsNewBadge');
  if (badge) badge.classList.add('hidden');
}
function refreshAchievementsBadge(){
  const badge = document.getElementById('achievementsNewBadge');
  if (!badge) return;
  const unlocks = ensureUnlockShape(loadUnlocks());
  const doneCount = Object.keys(unlocks.achievements).length;
  let seenCount = 0;
  try { seenCount = parseInt(localStorage.getItem('nightfallAchvSeenCount') || '0', 10); } catch (e) {  }
  badge.classList.toggle('hidden', doneCount <= seenCount);
}
document.getElementById('achievementsCloseBtn').addEventListener('click', () => {
  Sound.play('uiClick');
  document.getElementById('achievementsScreen').classList.add('hidden');
});
document.getElementById('bestiaryCloseBtn').addEventListener('click', () => {
  Sound.play('uiClick');
  document.getElementById('bestiaryScreen').classList.add('hidden');
});
document.getElementById('skillTreeCloseBtn').addEventListener('click', () => {
  Sound.play('uiClick');
  document.getElementById('skillTreeScreen').classList.add('hidden');
});
document.getElementById('musicTestCloseBtn').addEventListener('click', () => {
  Sound.play('uiClick');
  closeMusicTestPanel();
  document.getElementById('musicTestScreen').classList.add('hidden');
});
document.getElementById('settingsCloseBtn').addEventListener('click', () => {
  Sound.play('uiClick');
  document.getElementById('settingsScreen').classList.add('hidden');
});

function refreshSkillTreeBadge(){
  const badge = document.getElementById('skillTreePointsBadge');
  if (!badge) return;
  const unlocks = ensureUnlockShape(loadUnlocks());
  const points = unlocks.skillTree.points;
  badge.textContent = String(points);
  badge.classList.toggle('hidden', points <= 0);
  if (unlocks.skillTree.lifetimeEarned) badge.title = unlocks.skillTree.lifetimeEarned + ' points earned over your lifetime';
}

const muteBtn = document.getElementById('muteBtn');
function syncMuteBtn(){
  if (!muteBtn) return;
  const muted = Sound.isMuted();
  muteBtn.textContent = muted ? '🔇' : '🔊';
  muteBtn.title = (muted ? 'Unmute' : 'Mute') + ' (M)';
  muteBtn.classList.toggle('muted', muted);
}
if (muteBtn) muteBtn.addEventListener('click', () => { Sound.unlock(); toggleMuteUI(); });
syncMuteBtn();

const volumeSlider = document.getElementById('volumeSlider');
if (volumeSlider) {
  volumeSlider.value = String(Math.round(Sound.getVolume() * 100));
  volumeSlider.addEventListener('input', () => { Sound.setVolume(volumeSlider.value / 100); });
  volumeSlider.addEventListener('change', () => { Sound.unlock(); Sound.play('uiClick'); });
}

const DIFFICULTY_IDS = ['easy', 'normal', 'hard'];
function loadDifficultyPref(){
  try {
    const d = localStorage.getItem('nightfallDifficulty');
    return DIFFICULTY_IDS.indexOf(d) >= 0 ? d : 'normal';
  } catch (e) { return 'normal'; }
}
function saveDifficultyPref(d){
  try { localStorage.setItem('nightfallDifficulty', d); } catch (e) {  }
}
let currentDifficulty = loadDifficultyPref();

function difficultyStatMult(){
  return currentDifficulty === 'easy' ? 0.75 : currentDifficulty === 'hard' ? 1.5 : 1;
}

const difficultySelect = document.getElementById('difficultySelect');
function syncDifficultyBtns(){
  if (!difficultySelect) return;
  const btns = difficultySelect.querySelectorAll('button[data-difficulty]');
  for (let i = 0; i < btns.length; i++) {
    btns[i].classList.toggle('active', btns[i].dataset.difficulty === currentDifficulty);
  }
}
if (difficultySelect) {
  difficultySelect.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-difficulty]');
    if (!btn || DIFFICULTY_IDS.indexOf(btn.dataset.difficulty) < 0) return;
    currentDifficulty = btn.dataset.difficulty;
    saveDifficultyPref(currentDifficulty);
    syncDifficultyBtns();
    Sound.play('uiClick');
  });
  syncDifficultyBtns();
}

const seedInput = document.getElementById('seedInput');
const seedReadout = document.getElementById('seedReadout');
function readSeedInput(){
  return seedInput ? seedInput.value.trim() : '';
}

function loadDamageNumbersPref(){
  try {
    const v = localStorage.getItem('nightfallShowDamageNumbers');
    return v === null ? true : v === 'true';
  } catch (e) { return true; }
}
function saveDamageNumbersPref(v){
  try { localStorage.setItem('nightfallShowDamageNumbers', String(v)); } catch (e) {  }
}
let damageNumbersEnabled = loadDamageNumbersPref();

function minimapPinsStorageKey(game){
  const seed = (game && game.runSeed && game.runSeed.int != null) ? game.runSeed.int : 0;
  const floor = (game && game.dungeon && game.dungeon.floorNum != null) ? game.dungeon.floorNum : 0;
  return 'nightfallMinimapPins_' + seed + '_' + floor;
}
function loadMinimapPins(game){
  try {
    return JSON.parse(localStorage.getItem(minimapPinsStorageKey(game)) || '{}');
  } catch (e) { return {}; }
}
function saveMinimapPins(game, pins){
  try { localStorage.setItem(minimapPinsStorageKey(game), JSON.stringify(pins)); } catch (e) {  }
}

const minimapLegendBtn = document.getElementById('minimapLegendBtn');
if (minimapLegendBtn) minimapLegendBtn.addEventListener('click', () => { Sound.play('uiClick'); toggleMinimapLegend(); });

const minimapZoomResetBtn = document.getElementById('minimapZoomResetBtn');
if (minimapZoomResetBtn) minimapZoomResetBtn.addEventListener('click', () => { Sound.play('uiClick'); resetMinimapCamera(); });

const minimapCanvas = document.getElementById('minimap');
let minimapLongPressTimer = null;
if (minimapCanvas) {
  minimapCanvas.addEventListener('wheel', (e) => {
    if (!game) return;
    minimapHandleWheel(game, minimapCanvas, e);
  }, { passive: false });

  minimapCanvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    minimapHandlePointerDown(e);

    if (e.pointerType !== 'mouse' && game) {
      minimapLongPressTimer = setTimeout(() => {
        if (_mmDragMoved) return;
        const node = minimapUnprojectNode(game, minimapCanvas, e.clientX, e.clientY);
        if (node && (node.discovered || node.seen || node.revealed || game.player.revealMap)) {
          Sound.play('uiClick');
          cycleMinimapPin(game, node.id);
        }
      }, 500);
    }
  });
  window.addEventListener('pointermove', (e) => {
    const dragged = minimapHandlePointerMove(e);
    if (dragged && minimapLongPressTimer) { clearTimeout(minimapLongPressTimer); minimapLongPressTimer = null; }
  });
  minimapCanvas.addEventListener('pointermove', (e) => {
    if (!game || _mmDragging) { if (_mmDragging) hideMinimapTooltip(); return; }
    const node = minimapUnprojectNode(game, minimapCanvas, e.clientX, e.clientY);
    updateMinimapTooltip(game, minimapCanvas, node, e.clientX, e.clientY);
  });
  minimapCanvas.addEventListener('pointerleave', () => { hideMinimapTooltip(); });
  window.addEventListener('pointerup', () => {
    minimapHandlePointerUp();
    if (minimapLongPressTimer) { clearTimeout(minimapLongPressTimer); minimapLongPressTimer = null; }
  });
  minimapCanvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (!game) return;
    const node = minimapUnprojectNode(game, minimapCanvas, e.clientX, e.clientY);
    if (node && (node.discovered || node.seen || node.revealed || game.player.revealMap)) {
      Sound.play('uiClick');
      cycleMinimapPin(game, node.id);
    }
  });
}

refreshKeybindHints();

const fullscreenBtn = document.getElementById('fullscreenBtn');
const FULLSCREEN_SUPPORTED = !!document.documentElement.requestFullscreen;
function syncFullscreenBtn(){
  if (!fullscreenBtn) return;
  const on = !!document.fullscreenElement;

  fullscreenBtn.title = on ? 'Exit fullscreen' : 'Fullscreen';
  fullscreenBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
  fullscreenBtn.classList.toggle('active', on);
}
if (fullscreenBtn) {
  if (!FULLSCREEN_SUPPORTED) fullscreenBtn.classList.add('hidden');
  else {
    fullscreenBtn.addEventListener('click', () => {
      Sound.play('uiClick');

      if (document.fullscreenElement) { const p = document.exitFullscreen(); if (p && p.catch) p.catch(() => {}); }
      else { const p = document.documentElement.requestFullscreen(); if (p && p.catch) p.catch(() => {}); }
    });
    document.addEventListener('fullscreenchange', () => {
      syncFullscreenBtn();
      if (game) game.fitCanvas();
    });
    syncFullscreenBtn();
  }
}

const screenshotBtn = document.getElementById('screenshotBtn');
if (screenshotBtn) {
  screenshotBtn.addEventListener('click', () => {
    const canvas = document.getElementById('game');
    if (!canvas) return;
    Sound.play('uiClick');
    try {
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'nightfall-charge-' + Date.now() + '.png';
        document.body.appendChild(a);
        a.click();
        a.remove();

        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }, 'image/png');
    } catch (e) {  }
    screenshotBtn.classList.remove('flash'); void screenshotBtn.offsetWidth; screenshotBtn.classList.add('flash');
  });
}

let wakeLock = null;
function requestWakeLock(){
  if (!('wakeLock' in navigator) || wakeLock || document.hidden) return;
  if (!game || game.state !== 'playing' || game.paused) return;
  try {
    navigator.wakeLock.request('screen').then((lock) => {

      if (!game || game.state !== 'playing' || game.paused || document.hidden) {
        try { const p = lock.release(); if (p && p.catch) p.catch(() => {}); } catch (e) {  }
        return;
      }
      wakeLock = lock;
      lock.addEventListener('release', () => { if (wakeLock === lock) wakeLock = null; });
    }).catch(() => {  });
  } catch (e) {  }
}
function releaseWakeLock(){
  if (!wakeLock) return;
  const lock = wakeLock;
  wakeLock = null;
  try { const p = lock.release(); if (p && p.catch) p.catch(() => {}); } catch (e) {  }
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopLoop();
    Sound.suspend();
    releaseWakeLock();
  } else {
    startLoop();
    Sound.resume();
    requestWakeLock();
  }
});

window.addEventListener('blur', () => {
  if (game && game.state === 'playing' && !game.paused) togglePause();
});

window.addEventListener('beforeunload', (e) => {
  if (game && game.state === 'playing') { e.preventDefault(); e.returnValue = ''; }
});

const MENU_TIPS = [
  'Press R to use a held Star — unlike pills, its effect is always shown up front.',
  'The Bestiary (C) fills in as you play: kills, pickups, and destroyed objects all count toward it.',
  'Crystal and Sombra rooms have a better chance of spawning right next to the boss room on even floors.',
  'Standing near an item pedestal shows what it does before you commit to grabbing it.',
  'Donation machines cap at 5000c lifetime — across every run, never reset.',
  'Every 25c you donate is worth a skill point, on top of any milestone reward.',
  'Achievements (T) show live progress toward anything with a numeric threshold.',
  'A Cursed Chest costs hearts to open, but is far more likely to hold an item.',
  'Bombs destroy rocks, hazards, turrets, and stone chests alike — always worth carrying a few.',
  'The minimap\'s "?" button explains every room-type icon.',
  'Losing focus on the tab (alt-tab, switching windows) auto-pauses your run.',
];
function showMenuTip(){
  const el = document.getElementById('mainMenuTip');
  if (el) el.textContent = '💡 ' + Util.choice(MENU_TIPS);
}

function startGameWithClass(classId){
  Sound.stopAmbient();
  document.getElementById('mainMenu').classList.add('hidden');
  document.getElementById('gameOverScreen').classList.add('hidden');
  document.getElementById('winScreen').classList.add('hidden');
  document.getElementById('pauseScreen').classList.add('hidden');
  document.getElementById('gameScreen').classList.remove('hidden');
  game = new Game(canvas);
  game.startRun(classId, readSeedInput());
  game.fitCanvas();
  requestWakeLock();
  if (seedReadout) seedReadout.textContent = game.runSeed ? `Seed: ${game.runSeed.display}` : '';
}

function startWaveDefenseWithClass(classId){
  Sound.stopAmbient();
  document.getElementById('mainMenu').classList.add('hidden');
  document.getElementById('gameOverScreen').classList.add('hidden');
  document.getElementById('winScreen').classList.add('hidden');
  document.getElementById('pauseScreen').classList.add('hidden');
  document.getElementById('gameScreen').classList.remove('hidden');
  game = new Game(canvas);
  game.startRun(classId, readSeedInput());
  startWaveDefense(game);
  game.fitCanvas();
  requestWakeLock();
  if (seedReadout) seedReadout.textContent = game.runSeed ? `Seed: ${game.runSeed.display}` : '';
}

function returnToMenu(){
  releaseWakeLock();
  Sound.stopMusic();
  game = null;
  document.getElementById('gameScreen').classList.add('hidden');
  document.getElementById('gameOverScreen').classList.add('hidden');
  document.getElementById('winScreen').classList.add('hidden');
  document.getElementById('pauseScreen').classList.add('hidden');
  document.getElementById('mainMenu').classList.remove('hidden');

  const shotBtn = document.getElementById('screenshotBtn');
  if (shotBtn) shotBtn.classList.add('hidden');
  buildClassSelect(startGameWithClass);
  buildSuperbossTrophies();
  updateLifetimeStatsDisplay();
  Sound.startAmbient();
}

function updateLifetimeStatsDisplay(){
  const el = document.getElementById('lifetimeStats');
  if (el) {
    const unlocks = ensureUnlockShape(loadUnlocks());
    const s = unlocks.stats;
    if (!s.runsStarted) { el.textContent = ''; }
    else {
      const best = s.deepestFloor ? ` · deepest: Floor ${Util.formatNum(s.deepestFloor)}` : '';
      const fastest = s.fastestWinSeconds != null ? ` · fastest win: ${Util.formatDuration(s.fastestWinSeconds)}` : '';
      el.textContent = `${Util.formatNum(s.runsStarted)} runs · ${Util.formatNum(s.wins)} wins · ${Util.formatDuration(s.totalPlaytime)} played · ${Util.formatNum(s.enemiesKilled)} enemies defeated${best}${fastest}`;
    }
  }
  refreshAchievementsBadge();
  refreshBestiaryBadge();
  refreshSkillTreeBadge();
  showMenuTip();
}

let _runSummary = '';
const CLIPBOARD_SUPPORTED = !!(navigator.clipboard && navigator.clipboard.writeText);
function buildRunSummary(won){
  const p = game.player;
  const rs = game.runStats || {};

  if (game.mode === 'wavedefense') {
    return `Nightfall Charge — Wave Defense — ${CLASSES[p.classId].name} survived to Wave ${game.wdWave}\n`
      + `${Util.formatNum(p.coins)} coins · ${game.runKills} kills (${rs.waveDefenseBossKills || 0} bosses) · ${Util.formatDuration(game.runElapsed)} played\n`
      + (game.runSeed ? `Seed: ${game.runSeed.display}` : '');
  }

  const outcome = won
    ? (game.floorPath === 'C' ? `silenced Kirk DNB at the end of the drowned path` : `banished the DNBs`)
    : `fell on Floor ${floorLabelFor(game.dungeon.floorNum, game.floorPath)} (${floorNameFor(game.dungeon.floorNum, game.floorPath)})`;

  return `Nightfall Charge — ${CLASSES[p.classId].name} ${outcome}\n`
    + `${Util.formatNum(p.coins)} coins · ${game.runKills} kills (${rs.bossKills || 0} bosses) · ${Util.formatDuration(game.runElapsed)} played\n`
    + `Floor ${rs.floorsReached || game.dungeon.floorNum} · ${rs.roomsCleared || 0} rooms cleared · ${rs.itemsCollected || 0} items\n`
    + (game.runSeed ? `Seed: ${game.runSeed.display}` : '');
}

function wireCopyBtn(id){
  const btn = document.getElementById(id);
  if (!btn) return;
  if (!CLIPBOARD_SUPPORTED) { btn.classList.add('hidden'); return; }
  const label = btn.textContent;
  let resetTimer = null;
  btn.addEventListener('click', () => {
    Sound.play('uiClick');
    navigator.clipboard.writeText(_runSummary).then(() => {
      btn.textContent = '✅ Copied!';
    }).catch(() => {
      btn.textContent = 'Copy failed';
    }).then(() => {
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => { btn.textContent = label; }, 1600);
    });
  });
}
wireCopyBtn('copyRunBtn');
wireCopyBtn('copyWinRunBtn');

function wireCopySeedBtn(id){
  const btn = document.getElementById(id);
  if (!btn) return;
  if (!CLIPBOARD_SUPPORTED) { btn.classList.add('hidden'); return; }
  const label = btn.textContent;
  let resetTimer = null;
  btn.addEventListener('click', () => {
    if (!_runSeedText) return;
    Sound.play('uiClick');
    navigator.clipboard.writeText(_runSeedText).then(() => {
      btn.textContent = '✅ Copied!';
    }).catch(() => {
      btn.textContent = 'Copy failed';
    }).then(() => {
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => { btn.textContent = label; }, 1600);
    });
  });
}
wireCopySeedBtn('copySeedBtn');
wireCopySeedBtn('copyWinSeedBtn');

let _runSeedText = '';
function showGameOver(){
  const rs = game.runStats || {};
  document.getElementById('gameOverStats').textContent = game.mode === 'wavedefense'
    ? `${CLASSES[game.player.classId].name} · Wave Defense · Survived to Wave ${game.wdWave} · ` +
      `${Util.formatNum(game.player.coins)} coins collected · ${game.runKills} kills (${rs.waveDefenseBossKills || 0} bosses) · ${rs.itemsCollected || 0} items · ` +
      `${Util.formatDuration(game.runElapsed)} played` +
      (game.runSeed ? ` · Seed: ${game.runSeed.display}` : '')
    : `${CLASSES[game.player.classId].name} · reached Floor ${floorLabelFor(game.dungeon.floorNum, game.floorPath)} (${floorNameFor(game.dungeon.floorNum, game.floorPath)}) · ` +
      `${Util.formatNum(game.player.coins)} coins collected · ${game.runKills} kills (${rs.bossKills || 0} bosses) · ${rs.roomsCleared || 0} rooms cleared · ${rs.itemsCollected || 0} items · ` +
      `${Util.formatDuration(game.runElapsed)} played` +
      (game.runSeed ? ` · Seed: ${game.runSeed.display}` : '');
  _runSummary = buildRunSummary(false);
  _runSeedText = game.runSeed ? game.runSeed.display : '';

  document.getElementById('gameScreen').classList.add('hidden');
  document.getElementById('gameOverScreen').classList.remove('hidden');
}
function showWin(){

  const deed = game.floorPath === 'C' ? 'silenced Kirk DNB'
    : game.floorPath === 'D' ? 'snuffed out the last light'
    : 'banished the DNBs';
  const rs = game.runStats || {};
  document.getElementById('winStats').textContent =
    `${CLASSES[game.player.classId].name} ${deed} with ${Util.formatNum(game.player.coins)} coins and ${game.player.totalHearts()} hearts remaining! ` +
    `${game.runKills} kills (${rs.bossKills || 0} bosses) · ${rs.roomsCleared || 0} rooms cleared · ${rs.itemsCollected || 0} items · ${Util.formatDuration(game.runElapsed)} played` +
    (game.runSeed ? ` · Seed: ${game.runSeed.display}` : '');
  _runSummary = buildRunSummary(true);
  _runSeedText = game.runSeed ? game.runSeed.display : '';

  document.getElementById('gameScreen').classList.add('hidden');
  document.getElementById('winScreen').classList.remove('hidden');
}

const canvasWrap = document.getElementById('canvasWrap');
if (window.ResizeObserver && canvasWrap) {
  new ResizeObserver(() => { if (game) game.fitCanvas(); }).observe(canvasWrap);
} else {
  window.addEventListener('resize', () => { if (game) game.fitCanvas(); });
}

let lastTime = performance.now();
let lastState = 'idle';
function loop(now){
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  if (game) {
    game.update(input, dt);
    if (game.mode === 'wavedefense') updateWaveDefense(game, dt);
    game.render();
    if (game.state !== lastState) {
      lastState = game.state;
      if (game.state === 'gameover' || game.state === 'win') releaseWakeLock();
      if (game.state === 'gameover') {
        showGameOver(); Sound.play('gameOver'); bumpStat('deaths', 1, game); bumpStat('totalPlaytime', Math.round(game.runElapsed), game);

        const src = game.player.lastDamageSource;
        if (src && (ENEMY_TYPES[src] || BOSS_TYPES[src] || SUPERBOSSES[src])) bumpBestiaryCount('enemyDeaths', src, 1);
      }
      if (game.state === 'win') {
        showWin(); Sound.play('winFanfare'); recordWin(game, game.player.classId);
        bumpStat('totalPlaytime', Math.round(game.runElapsed), game);

        if (setStatMin('fastestWinSeconds', game.runElapsed)) {
          toast('🏅 New personal best! Fastest win: ' + Util.formatDuration(game.runElapsed) + '.', true);
        }

        if (game.runElapsed <= 1200) unlockAchievement('challenge_speedrun_20min', game);
        if (game.runElapsed <= 720) unlockAchievement('challenge_speedrun_12min', game);
        if (game.runElapsed <= 480) unlockAchievement('challenge_speedrun_8min', game);
      }
    }
  }

  if (menuBackdropShouldRender()) renderMenuBackdrop(dt);
  rafId = requestAnimationFrame(loop);
}

const MENU_BACKDROP_SCREENS = ['mainMenu', 'achievementsScreen', 'bestiaryScreen',
  'skillTreeScreen', 'musicTestScreen', 'settingsScreen', 'gameOverScreen', 'winScreen'];
function menuBackdropShouldRender(){
  for (const id of MENU_BACKDROP_SCREENS) {
    const el = document.getElementById(id);
    if (el && !el.classList.contains('hidden')) return true;
  }

  return false;
}

let rafId = null;
function startLoop(){
  if (rafId !== null) return;
  lastTime = performance.now();
  rafId = requestAnimationFrame(loop);
}
function stopLoop(){
  if (rafId === null) return;
  cancelAnimationFrame(rafId);
  rafId = null;
}
startLoop();

function tryBootTestRoom(){
  let raw;
  try { raw = localStorage.getItem('adele2_testRoom'); } catch (e) { raw = null; }
  if (!raw) return false;
  try { localStorage.removeItem('adele2_testRoom'); } catch (e) {}
  const match = /^ROOM_TEMPLATES\.(\w+)\.push\((.*)\);$/s.exec(raw.trim());
  if (!match) return false;
  let template;
  try { template = JSON.parse(match[2]); } catch (e) { return false; }
  startGameWithClass('earth');
  if (game) game.loadTestRoom(template, match[1]);
  return true;
}

buildClassSelect(startGameWithClass);
buildSuperbossTrophies();
updateLifetimeStatsDisplay();
Sound.startAmbient();
tryBootTestRoom();
