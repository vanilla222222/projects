'use strict';

function buildMusicTestPanel(){
  const list = document.getElementById('musicTestList');
  if (!list) return;
  list.innerHTML = '';
  const tracks = Sound.listMusicTracks();
  const currentId = Sound.currentMusicTrackId();
  if (!tracks.length) {
    const empty = document.createElement('p');
    empty.className = 'achv-desc';
    empty.textContent = 'No tracks yet.';
    list.appendChild(empty);
    return;
  }
  for (const t of tracks) {
    const isPlaying = currentId === t.id;
    const row = document.createElement('div');
    row.className = 'achv-row done music-test-row' + (isPlaying ? ' playing' : '');

    const icon = document.createElement('div');
    icon.className = 'achv-icon';
    icon.textContent = isPlaying ? '🔊' : '🎵';
    row.appendChild(icon);

    const text = document.createElement('div');
    text.className = 'achv-text';
    const name = document.createElement('div');
    name.className = 'achv-name';
    name.textContent = t.name;
    text.appendChild(name);
    const desc = document.createElement('div');
    desc.className = 'achv-desc';
    desc.textContent = isPlaying ? 'Now playing.' : 'Press Play to preview.';
    text.appendChild(desc);
    row.appendChild(text);

    const btn = document.createElement('button');
    btn.className = 'music-test-btn';
    btn.textContent = isPlaying ? '⏹ Stop' : '▶ Play';
    btn.onclick = () => {

      Sound.unlock();
      Sound.play('uiClick');
      if (Sound.currentMusicTrackId() === t.id) {
        Sound.stopMusic();
        Sound.startAmbient();
      } else {
        Sound.stopAmbient();
        Sound.startMusic(t.id);
      }
      buildMusicTestPanel();
    };
    row.appendChild(btn);
    list.appendChild(row);
  }
}

function closeMusicTestPanel(){
  if (Sound.currentMusicTrackId()) { Sound.stopMusic(); Sound.startAmbient(); }
}
