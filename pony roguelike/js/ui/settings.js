'use strict';

function buildSettingsPanel(){
  const musicSlider = document.getElementById('musicVolumeSlider');
  if (musicSlider) musicSlider.value = String(Math.round(Sound.getMusicVolume() * 100));

  const sfxSlider = document.getElementById('sfxVolumeSlider');
  if (sfxSlider) sfxSlider.value = String(Math.round(Sound.getSfxVolume() * 100));

  const dmgCheckbox = document.getElementById('damageNumbersCheckbox');
  if (dmgCheckbox) dmgCheckbox.checked = damageNumbersEnabled;

  buildKeybindsList();
}

const REBINDABLE_ACTIONS = [
  'moveUp', 'moveDown', 'moveLeft', 'moveRight',
  'attack', 'buildTurret', 'bomb', 'activeItem', 'pill', 'star',
  'donate', 'reroll', 'arcade', 'pocketActive', 'mute',
  'achievements', 'bestiary', 'skillTree',
];

function buildKeybindsList(){
  const list = document.getElementById('keybindsList');
  if (!list) return;
  list.innerHTML = REBINDABLE_ACTIONS.map(action => `
    <div class="achv-row done">
      <div class="achv-icon">⌨</div>
      <div class="achv-text">
        <div class="achv-name">${KEYBIND_LABELS[action]}</div>
      </div>
      <button class="music-test-btn keybind-btn" data-action="${action}">${keyCodeLabel(keybinds[action])}</button>
    </div>
  `).join('');
  list.querySelectorAll('.keybind-btn').forEach(btn => {
    btn.addEventListener('click', () => startRebind(btn.dataset.action, btn));
  });
}

function startRebind(action, btn){
  const prevLabel = btn.textContent;
  btn.textContent = 'Press a key…';
  btn.classList.add('listening');

  const onKeyDown = (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    window.removeEventListener('keydown', onKeyDown, true);
    btn.classList.remove('listening');

    if (e.code === 'Escape') {
      btn.textContent = prevLabel;
      return;
    }

    for (const other of REBINDABLE_ACTIONS) {
      if (other !== action && keybinds[other] === e.code) keybinds[other] = null;
    }
    keybinds[action] = e.code;
    saveKeybindsPref(keybinds);
    refreshKeybindHints();
    buildKeybindsList();
    Sound.play('uiClick');
  };
  window.addEventListener('keydown', onKeyDown, true);
}

(function wireSettingsControls(){
  const musicSlider = document.getElementById('musicVolumeSlider');
  if (musicSlider) {
    musicSlider.addEventListener('input', () => { Sound.setMusicVolume(musicSlider.value / 100); });
    musicSlider.addEventListener('change', () => { Sound.unlock(); Sound.play('uiClick'); });
  }

  const sfxSlider = document.getElementById('sfxVolumeSlider');
  if (sfxSlider) {
    sfxSlider.addEventListener('input', () => { Sound.setSfxVolume(sfxSlider.value / 100); });
    sfxSlider.addEventListener('change', () => { Sound.unlock(); Sound.play('uiClick'); });
  }

  const dmgCheckbox = document.getElementById('damageNumbersCheckbox');
  if (dmgCheckbox) {
    dmgCheckbox.addEventListener('change', () => {
      damageNumbersEnabled = dmgCheckbox.checked;
      saveDamageNumbersPref(damageNumbersEnabled);
      Sound.play('uiClick');
    });
  }

  const resetBtn = document.getElementById('keybindsResetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      keybinds = Object.assign({}, DEFAULT_KEYBINDS);
      saveKeybindsPref(keybinds);
      refreshKeybindHints();
      buildKeybindsList();
      Sound.play('uiClick');
    });
  }
})();
