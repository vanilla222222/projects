(function () {
  'use strict';
  const C = window.NDCore;
  const R = window.NDRender;
  const A = window.NDAudio;
  const V = R.View;
  const W = C.WORLD;
  const SAVE_KEY = 'nightfall-defense-save-v1';
  const $ = id => document.getElementById(id);

  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      return C.deserialize(raw);
    } catch (err) { return null; }
  }
  function writeSave() {
    try { localStorage.setItem(SAVE_KEY, C.serialize(S)); return true; } catch (err) { return false; }
  }
  function clearSave() {
    try { localStorage.removeItem(SAVE_KEY); } catch (err) { }
  }

  let S = loadSave() || C.newState();
  C.setNumFormat(S.settings.numFmt);
  A.set(S.settings.sound, S.settings.vol);
  const ui = {
    placing: null, ghost: null, ghostTouch: false, selId: 0, hoverId: 0, sellArm: 0, autoNext: 0,
    infoKey: '', waveKey: '', buildKey: '', ledgerKey: '', speedKey: '', showAll: false, paused: false, sel: null, tipEl: null,
  };

  const cv = $('cv');
  const ctx = cv.getContext('2d');
  const board = $('board');
  let dpr = 1, cw = 0, ch = 0;

  function resize() {
    const r = board.getBoundingClientRect();
    cw = Math.max(1, Math.round(r.width)); ch = Math.max(1, Math.round(r.height));
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    V.fit(cw, ch);
    R.buildBg(cw, ch, dpr, C.mapOf(S));
  }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(board);
  window.addEventListener('resize', resize);
  resize();

  function selTower() { return S.towers.find(t => t.id === ui.selId) || null; }
  function dirty() { ui.infoKey = ui.waveKey = ui.buildKey = ui.ledgerKey = ui.speedKey = ''; }

  let bannerT = 0;
  function banner(text, cls) {
    const b = $('banner');
    b.textContent = text;
    b.className = 'banner show ' + (cls || '');
    clearTimeout(bannerT);
    bannerT = setTimeout(() => { b.className = 'banner'; }, 2600);
  }

  function setPlacing(race) {
    ui.placing = ui.placing === race ? null : race;
    ui.ghost = null;
    if (ui.placing) ui.selId = 0;
    updateHint();
    ui.buildKey = ''; ui.infoKey = '';
  }
  function updateHint() {
    const h = $('placeHint');
    if (!ui.placing) { h.className = 'placehint'; return; }
    const name = C.RACES[ui.placing].name;
    const extra = C.mapOf(S).dark ? ' Ponies outside crystal light lose range.' : '';
    h.textContent = (ui.ghostTouch && ui.ghost ? 'Tap the same spot again to place the ' + name + '. Tap a button to cancel.' : 'Place the ' + name + ' anywhere off the road. Esc or right-click cancels.') + extra;
    h.className = 'placehint show';
  }

  function eventWorld(ev) {
    const r = cv.getBoundingClientRect();
    return V.toWorld(ev.clientX - r.left, ev.clientY - r.top);
  }
  function towerAt(x, y) {
    let best = null, bd = (W.towerR + 8) ** 2;
    for (const t of S.towers) { const d = (t.x - x) ** 2 + (t.y - y) ** 2; if (d < bd) { bd = d; best = t; } }
    return best;
  }

  function unlockAudio() { A.unlock(); }
  window.addEventListener('pointerdown', unlockAudio, { capture: true });
  window.addEventListener('keydown', unlockAudio, { capture: true });

  cv.addEventListener('pointermove', ev => {
    const [x, y] = eventWorld(ev);
    if (ev.pointerType !== 'touch') {
      const t = towerAt(x, y);
      ui.hoverId = t ? t.id : 0;
    }
    if (!ui.placing || ev.pointerType === 'touch') return;
    ui.ghost = { x, y };
    ui.ghostTouch = false;
  });
  cv.addEventListener('pointerleave', ev => { ui.hoverId = 0; if (ev.pointerType !== 'touch' && !ui.ghostTouch) ui.ghost = null; });
  cv.addEventListener('contextmenu', ev => { if (ui.placing) { ev.preventDefault(); setPlacing(null); } });
  cv.addEventListener('pointerup', ev => {
    if (ev.button > 0) return;
    const [x, y] = eventWorld(ev);
    if (ui.placing) {
      const touch = ev.pointerType !== 'mouse';
      if (touch) {
        const g = ui.ghost;
        const near = g && ui.ghostTouch && Math.hypot(g.x - x, g.y - y) < 30;
        if (!near) { ui.ghost = { x, y }; ui.ghostTouch = true; updateHint(); return; }
        tryPlace(g.x, g.y);
        return;
      }
      tryPlace(x, y);
      return;
    }
    const t = towerAt(x, y);
    ui.selId = t ? t.id : 0;
    ui.sellArm = 0;
    ui.infoKey = '';
  });

  const BLOCK_MSG = {
    edge: 'Too close to the edge of the map', road: 'Too close to the road', pony: 'Too close to another pony',
    tree: 'A tree is in the way', crystal: 'Crystals cannot be built on', stalagmite: 'A stalagmite is in the way',
    boulder: 'A boulder is in the way', pillar: 'A pillar is in the way', keep: 'The keep tower is in the way', rock: 'A rock is in the way',
  };
  function tryPlace(x, y) {
    const race = ui.placing;
    const why = C.placeBlockReason(S, x, y);
    if (why) { banner(BLOCK_MSG[why] || 'Something is in the way here', 'bad'); A.play('deny'); return; }
    const cost = C.nextTowerCost(S, race);
    if (S.cash < cost) { banner('Need ' + C.fmt(cost) + ' cash', 'bad'); A.play('deny'); return; }
    const t = C.placeTower(S, race, x, y);
    if (!t) return;
    t.anim = 0.4;
    A.play('place');
    ui.placing = null; ui.ghost = null; ui.ghostTouch = false;
    ui.selId = t.id;
    updateHint();
    ui.infoKey = ''; ui.buildKey = '';
    writeSave();
  }

  function setSpeed(v) {
    if (C.SPEEDS.indexOf(v) < 0) return;
    S.settings.speed = v; ui.paused = false; ui.speedKey = ''; refreshSpeed();
    writeSave();
  }
  function togglePause() { ui.paused = !ui.paused; ui.speedKey = ''; refreshSpeed(); }
  function cycleSpeed() {
    const i = C.SPEEDS.indexOf(S.settings.speed);
    setSpeed(C.SPEEDS[(i + 1) % C.SPEEDS.length]);
  }
  function setSound(on) {
    S.settings.sound = !!on;
    A.set(S.settings.sound, S.settings.vol);
    if (on) { A.unlock(); A.play('click'); }
    syncSettings(); writeSave();
  }

  function focusInfo() {
    const box = $('info');
    if (!box.firstChild) return;
    box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    box.classList.remove('pulse'); void box.offsetWidth; box.classList.add('pulse');
  }
  function doBuyMax(t) {
    const r = C.buyMaxAffordable(S, t);
    if (r.count) { t.anim = 0.4; A.play('upgrade'); banner('Bought ' + r.count + ' upgrade' + (r.count > 1 ? 's' : '') + ' for ' + C.fmt(r.spent), 'good'); writeSave(); }
    else { A.play('deny'); banner('Nothing affordable for this pony yet', 'bad'); }
    ui.infoKey = ''; ui.buildKey = '';
  }
  function doSell(t) {
    if (ui.sellArm > performance.now()) {
      const got = C.sellTower(S, t);
      ui.selId = 0; ui.sellArm = 0;
      A.play('sell');
      banner('Sold for ' + C.fmt(got), '');
      writeSave();
    } else { ui.sellArm = performance.now() + 2500; setTimeout(() => { ui.infoKey = ''; }, 2600); }
    ui.infoKey = ''; ui.buildKey = '';
  }

  window.addEventListener('keydown', ev => {
    if (ev.target && /INPUT|TEXTAREA|SELECT/.test(ev.target.tagName)) return;
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
    if (k === 'Shift') { ui.showAll = true; return; }
    if (!$('setModal').hidden) { if (k === 'Escape') closeSettings(); return; }
    if (!$('mapModal').hidden) { if (k === 'Escape') closeMaps(); return; }
    const t = selTower();
    if (k === 'Escape') { if (ui.placing) setPlacing(null); else { ui.selId = 0; ui.infoKey = ''; } }
    else if (k === '1' || k === '2' || k === '3') setPlacing(C.RACE_IDS[+k - 1]);
    else if (k === ' ') { ev.preventDefault(); if (!S.run) startSelected(); else togglePause(); }
    else if (k === 'p') togglePause();
    else if (k === 'f') cycleSpeed();
    else if (k === 'm') setSound(!S.settings.sound);
    else if (k === 'u') {
      const h = ui.hoverId && S.towers.find(q => q.id === ui.hoverId);
      if (h) { ui.selId = h.id; ui.placing = null; updateHint(); ui.infoKey = ''; refreshInfo(); }
      focusInfo();
    }
    else if (k === 's' && t) doSell(t);
    else if (k === 'b' && t) doBuyMax(t);
    else return;
  });
  window.addEventListener('keyup', ev => { if (ev.key === 'Shift') ui.showAll = false; });
  window.addEventListener('blur', () => { ui.showAll = false; });

  const raceIcons = {};
  function buildList() {
    const box = $('buildList');
    box.innerHTML = '';
    C.RACE_IDS.forEach((id, i) => {
      const r = C.RACES[id];
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'race'; b.dataset.race = id;
      const c = document.createElement('canvas');
      c.width = 80; c.height = 80;
      raceIcons[id] = c;
      const nm = document.createElement('div');
      nm.innerHTML = '<div class="rn"></div><div class="rr"></div>';
      nm.querySelector('.rn').textContent = r.name;
      nm.querySelector('.rr').textContent = r.role;
      const cost = document.createElement('div'); cost.className = 'rc';
      const key = document.createElement('kbd'); key.textContent = String(i + 1);
      b.append(key, c, nm, cost);
      b.addEventListener('click', () => setPlacing(id));
      box.appendChild(b);
    });
  }
  function drawIcons(now) {
    for (const id of C.RACE_IDS) {
      const c = raceIcons[id]; if (!c) continue;
      const g = c.getContext('2d');
      g.clearRect(0, 0, 80, 80);
      R.drawPony(g, 40, 42, 58, Object.assign(R.ponyOpts(id), { angle: Math.PI / 2, now }));
    }
  }
  function refreshBuild() {
    const key = C.RACE_IDS.map(id => C.nextTowerCost(S, id) + (S.cash >= C.nextTowerCost(S, id) ? 'y' : 'n')).join() + ui.placing + C.fmt(1e6);
    if (key === ui.buildKey) return;
    ui.buildKey = key;
    for (const b of $('buildList').children) {
      const id = b.dataset.race, cost = C.nextTowerCost(S, id);
      b.querySelector('.rc').textContent = C.fmt(cost);
      b.classList.toggle('on', ui.placing === id);
      b.classList.toggle('poor', S.cash < cost);
      b.dataset.tip = C.RACES[id].name + ' (hotkey ' + (C.RACE_IDS.indexOf(id) + 1) + ')\n' + C.RACES[id].ability + '\nOwned: ' + C.owned(S, id) + '. Each extra copy costs x' + C.TUNE.towerGrowth + '.';
    }
  }

  function startSelected() {
    if (S.run) return;
    ui.autoNext = 0;
    C.startWave(S, S.sel);
  }
  $('startBtn').addEventListener('click', startSelected);
  $('wPrev').addEventListener('click', () => { if (!S.run && S.sel > 1) { S.sel--; ui.waveKey = ''; } });
  $('wNext').addEventListener('click', () => { if (!S.run && S.sel < C.topWave(S)) { S.sel++; ui.waveKey = ''; } });
  $('wTop').addEventListener('click', () => { if (!S.run) { S.sel = C.topWave(S); ui.waveKey = ''; } });
  $('autoBox').addEventListener('change', ev => { S.auto = ev.target.checked; ui.waveKey = ''; if (!S.auto) ui.autoNext = 0; writeSave(); });
  function resetAll() {
    if (!window.confirm('Reset all progress on every map? Every pony, upgrade, wave and coin will be lost.')) return;
    const keep = S.settings;
    clearSave();
    S = C.newState();
    S.settings = keep;
    R.bgKey = ''; resize();
    ui.selId = 0; ui.placing = null; ui.autoNext = 0; ui.paused = false;
    dirty();
    closeSettings();
    banner('Progress reset', 'bad');
    writeSave();
  }
  $('resetBtn').addEventListener('click', resetAll);

  const TYPE_ORDER = ['basic', 'fast', 'tanky', 'flying', 'magical', 'boss'];
  const TYPE_COL = { basic: '#a07a52', fast: '#e3c15b', tanky: '#8a6a4a', flying: '#7fc8ff', magical: '#c08bff', boss: '#e35b6a' };
  function previewHtml(spec, compact) {
    let h = '<div class="mix">';
    for (const k of TYPE_ORDER) {
      const c = spec.counts[k];
      if (!c) continue;
      const d = C.ENEMIES[k];
      const name = k === 'boss' && spec.boss ? spec.boss.name : d.short;
      const tip = (k === 'boss' && spec.boss ? spec.boss.name + '\n' + spec.boss.desc : d.name + '\n' + d.trait);
      h += '<span class="mx" data-tip="' + esc(tip) + '"><canvas data-dnb="' + k + '" width="48" height="48"></canvas><b>' + c + '</b>' + (compact ? '' : '<span>' + esc(name) + '</span>') + '</span>';
    }
    h += '</div>';
    if (!compact) {
      h += '<div class="tl" aria-hidden="true">';
      const dur = Math.max(1, spec.duration);
      for (const e of spec.list) h += '<i style="left:' + (100 * e.t / dur).toFixed(1) + '%;background:' + TYPE_COL[e.type] + (e.type === 'boss' ? ';width:6px;height:12px;top:-2px' : '') + '"></i>';
      h += '</div><div class="tlk"><span>0s</span><span>' + (spec.theme && spec.theme !== 'boss' ? esc(C.ENEMIES[spec.theme].short) + ' swarm' : 'Mixed wave') + '</span><span>' + Math.round(spec.duration) + 's</span></div>';
    }
    return h;
  }
  function paintIcons(box, spec) {
    for (const c of box.querySelectorAll('canvas[data-dnb]')) R.dnbIcon(c, c.dataset.dnb, c.dataset.dnb === 'boss' ? spec.boss : null, 0);
  }
  function warnings(spec) {
    const out = [];
    let fly = false, mag = false;
    for (const t of S.towers) { const s = C.stats(t); if (s.canFly) fly = true; if (s.canMagic) mag = true; }
    const bt = spec.boss && spec.boss.trick;
    const tk = (spec.boss && spec.boss.tricks) || {};
    const bFly = bt === 'flying' || bt === 'phase' || bt === 'mother' || !!tk.fly || !!tk.phase;
    const bMag = bt === 'magical' || bt === 'phase' || bt === 'mother' || !!tk.magic || !!tk.phase;
    if ((spec.counts.flying || bFly) && !fly) out.push('No pony can hit flyers yet. Add a Pegasus.');
    if ((spec.counts.magical || bMag) && !mag) out.push('No pony can harm magical DNBs yet. Add a Unicorn.');
    const map = C.mapOf(S);
    if (map.wind && spec.counts.flying) out.push('Wind gusts on this map push flyers back or sideways.');
    return out;
  }

  function refreshWave() {
    const top = C.topWave(S);
    const n = S.run ? S.run.n : S.sel;
    const left = S.run ? S.run.enemies.length + S.run.queue.length : 0;
    const key = [n, S.cleared, !!S.run, S.auto, S.run ? S.run.lives : 0, left, ui.autoNext > 0, S.towers.length, C.fmt(1e6)].join();
    if (key === ui.waveKey) return;
    ui.waveKey = key;
    const fresh = n > S.cleared;
    $('wLabel').textContent = 'Wave ' + n + (n === C.MAX_WAVE ? ' (final)' : '');
    const sub = $('wSub');
    sub.textContent = fresh ? 'New wave: first clear pays a bonus' : 'Replay: kill cash only';
    sub.className = 'ws' + (fresh ? ' new' : '');
    $('wPrev').disabled = !!S.run || S.sel <= 1;
    $('wNext').disabled = !!S.run || S.sel >= top;
    $('wTop').disabled = !!S.run || S.sel >= top;
    const map = C.mapOf(S);
    const spec = C.waveSpec(n, map);
    let html = previewHtml(spec, false);
    if (spec.boss) html += '<div class="bosscard"><canvas data-dnb="boss" width="64" height="64"></canvas><div><div class="bn">' + esc(spec.boss.name) + '</div><div class="bd">' + esc(spec.boss.desc) + '</div></div></div>';
    for (const w of warnings(spec)) html += '<div class="warn">' + esc(w) + '</div>';
    if (fresh) html += '<div>First clear bonus: <b style="color:var(--gold)">+' + C.fmt(C.clearBonus(n, map)) + '</b></div>';
    if (S.run) {
      html += '<div>In progress: <b>' + left + '</b> DNBs left</div>';
      const nx = S.run.n + 1;
      if (nx <= C.MAX_WAVE && S.run.fresh) html += '<div class="upnext"><span>Up next: wave ' + nx + '</span>' + previewHtml(C.waveSpec(nx, map), true) + '</div>';
    }
    const box = $('wInfo');
    box.innerHTML = html;
    paintIcons(box, spec);
    if (S.run) { const up = box.querySelector('.upnext'); if (up) paintIcons(up, C.waveSpec(S.run.n + 1, map)); }
    const sb = $('startBtn');
    sb.disabled = !!S.run;
    sb.textContent = S.run ? 'Wave ' + S.run.n + ' running' : (ui.autoNext > 0 ? 'Auto-starting Wave ' + S.sel + '...' : (fresh ? 'Start Wave ' : 'Replay Wave ') + S.sel);
    $('autoBox').checked = !!S.auto;
    const nm = 'Map ' + map.order + ' · ' + map.name;
    if ($('mapName').textContent !== nm) $('mapName').textContent = nm;
    $('autoHint').textContent = !S.auto
      ? 'Auto is off: a wave only starts when you press Start.'
      : (S.sel > S.cleared
        ? 'Auto is on: each time you clear a new wave, the next new wave starts by itself. A lost wave stops auto so you can rebuild.'
        : 'Auto is on: Wave ' + S.sel + ' replays on a loop for kill cash. Pick the top wave to push forward instead. A lost wave stops auto.');
  }

  function stat(k, v, id) { return '<div class="stat"><div class="k">' + k + '</div><div class="v"' + (id ? ' id="' + id + '"' : '') + '>' + v + '</div></div>'; }
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  function nodeTip(t, i, k) {
    const info = C.nodeInfo(t, i, k);
    const lv = t.paths[i];
    const head = info.name + ' ' + k + '/10' + (k <= lv ? ' (owned)' : ' - ' + C.fmt(info.cost));
    const body = info.lines.length ? info.lines.join('\n') : 'Minor tuning.';
    return head + '\n' + body + (info.sig ? '\n' + info.sig : '');
  }

  function totalDealt() { let s = 0; for (const t of S.towers) s += t.dmg; return s; }
  function refreshPonyStats(t) {
    const el = $('pStats');
    if (!el) return;
    const tot = totalDealt();
    const set = (id, v) => { const e = $(id); if (e && e.textContent !== v) e.textContent = v; };
    set('psDealt', C.fmt(t.dmg));
    set('psKills', C.fmt(t.kills));
    set('psWave', S.run ? C.fmt(t.wDmg) + ' / ' + t.wKills : '-');
    set('psShare', tot > 0 ? Math.round(100 * t.dmg / tot) + '%' : '-');
  }

  function refreshInfo() {
    const t = selTower();
    const box = $('info');
    if (!t) { if (box.innerHTML) box.innerHTML = ''; ui.infoKey = ''; return; }
    const paths = C.PATHS[t.race];
    const aff = paths.map((p, i) => S.cash >= C.nextNodeCost(t, i) ? 1 : 0).join('') + (S.cash >= C.infNext(t, 'dmg') ? 1 : 0) + (S.cash >= C.infNext(t, 'rate') ? 1 : 0);
    const pv = C.maxAffordablePreview(S, t);
    const key = [t.id, t.paths.join(''), t.infD, t.infR, t.mode, aff, pv.count, ui.sellArm > performance.now(), (t.buff && t.buff.dmg + ',' + t.buff.rate) || '', C.fmt(1e6)].join('|');
    if (key === ui.infoKey) { refreshPonyStats(t); return; }
    ui.infoKey = key;
    hideTip();
    const r = C.RACES[t.race];
    const s = C.stats(t);
    const dmg = C.effDmg(t), rate = C.effRate(t);
    let h = '<div class="ihead"><span class="nm" style="color:' + r.accent + '">' + r.name + '</span><span class="pstate">#' + t.id + '</span><button class="ghost x" data-act="close" type="button">Close</button></div>';
    h += '<div class="statgrid">' + stat('Damage', C.fmt(dmg)) + stat('Rate', (Math.round(rate * 100) / 100) + '/s') + stat('Range', Math.round(s.range)) + stat('DPS', C.fmt(dmg * rate * (s.multi || 1))) + '</div>';
    h += '<div class="statgrid" id="pStats">' + stat('Dealt', '', 'psDealt') + stat('Kills', '', 'psKills') + stat('Wave', '', 'psWave') + stat('Share', '', 'psShare') + '</div>';
    h += '<div class="tags"><span class="tag ' + (s.canFly ? 'yes' : '') + '">' + (s.canFly ? 'Hits flyers' : 'No flyers') + '</span><span class="tag mag ' + (s.canMagic ? 'yes' : '') + '">' + (s.canMagic ? 'Hurts magical' : 'No magical') + '</span>';
    if (t.buff && (t.buff.dmg || t.buff.rate)) h += '<span class="tag yes">Herd aura +' + C.pct(t.buff.dmg) + ' dmg</span>';
    h += '</div><p class="ability">' + esc(r.ability) + '</p>';
    h += '<div class="modes">' + ['first', 'last', 'strong', 'close'].map(m => '<button type="button" data-act="mode" data-v="' + m + '" class="' + (t.mode === m ? 'on' : '') + '">' + m[0].toUpperCase() + m.slice(1) + '</button>').join('') + '</div>';
    const maxTip = pv.count ? 'Buys ' + pv.count + ' upgrade' + (pv.count > 1 ? 's' : '') + ', cheapest first, among chosen paths and endless training. Hotkey B.' : 'Nothing affordable yet. Pick a path first, or earn more cash. Hotkey B.';
    h += '<button class="maxbtn" type="button" data-act="max"' + (pv.count ? '' : ' disabled') + ' data-tip="' + esc(maxTip) + '">' + (pv.count ? 'Upgrade max affordable &middot; ' + pv.count + ' for ' + C.fmt(pv.spent) : 'Upgrade max affordable') + '</button>';
    const chosen = C.chosenPaths(t).length;
    h += '<div class="ptitle"><span>Upgrade paths</span><span>' + chosen + ' / 2 chosen</span></div><div class="paths">';
    paths.forEach((p, i) => {
      const st = C.pathState(t, i), lv = t.paths[i], cost = C.nextNodeCost(t, i);
      let pips = '';
      for (let k = 1; k <= 10; k++) pips += '<span class="pip' + (k <= lv ? ' f' : '') + (k === lv + 1 && st !== 'locked' ? ' nx' : '') + (k === 10 ? ' sig' : '') + '" tabindex="-1" data-tip="' + esc(nodeTip(t, i, k)) + '"></span>';
      const label = st === 'maxed' ? 'Signature' : st === 'locked' ? 'Locked' : st === 'chosen' ? 'Chosen' : 'Open';
      let btn;
      if (st === 'maxed') btn = '<button class="buy" type="button" disabled>Max</button>';
      else if (st === 'locked') btn = '<button class="buy" type="button" disabled>Locked</button>';
      else btn = '<button class="buy' + (S.cash < cost ? ' poor' : '') + '" type="button" data-act="node" data-v="' + i + '"' + (S.cash < cost ? ' disabled' : '') + ' data-tip="' + esc(nodeTip(t, i, lv + 1)) + '">Lv ' + (lv + 1) + ' &middot; ' + C.fmt(cost) + '</button>';
      h += '<div class="path ' + st + '"><div class="prow"><span class="pname">' + esc(p.name) + '</span><span class="pstate">' + label + ' ' + lv + '/10</span>' + btn + '</div>';
      h += '<div class="pips">' + pips + '</div>';
      h += '<div class="pdesc">' + esc(p.blurb) + ' ' + esc(p.node) + '<br>Node 10: <b>' + esc(p.sig) + '</b> ' + esc(p.sigDesc) + '</div></div>';
    });
    h += '</div><div class="ptitle"><span>Endless training</span><span>x' + C.TUNE.infMul + ' each</span></div><div class="infs">';
    for (const [w, label, lv] of [['dmg', 'Damage', t.infD], ['rate', 'Fire rate', t.infR]]) {
      const c = C.infNext(t, w);
      h += '<button class="inf" type="button" data-act="inf" data-v="' + w + '"' + (S.cash < c ? ' disabled' : '') + ' data-tip="' + esc(label + ' Lv ' + (lv + 1) + '\n+' + Math.round((C.TUNE.infMul - 1) * 100) + '% ' + label.toLowerCase() + ', no cap.\nEach level costs x' + C.TUNE.infGrowth + ' more.') + '"><div class="t">' + label + ' Lv ' + lv + '</div><div class="s">x' + C.TUNE.infMul + ' ' + label.toLowerCase() + ' (now x' + (Math.round(Math.pow(C.TUNE.infMul, lv) * 100) / 100) + ')</div><div class="c">' + C.fmt(c) + '</div></button>';
    }
    h += '</div>';
    const refund = C.sellValue(t);
    const armed = ui.sellArm > performance.now();
    h += '<div class="sellrow"><button class="sell' + (armed ? ' confirm' : '') + '" type="button" data-act="sell">' + (armed ? 'Tap again to sell for ' : 'Sell for ') + C.fmt(refund) + '</button></div>';
    h += '<p class="hint">Selling refunds ' + C.pct(C.TUNE.sellRate) + ' of the ' + C.fmt(t.spent) + ' spent on this pony. Hotkeys: B buy max, S sell, U focus.</p>';
    box.innerHTML = h;
    refreshPonyStats(t);
  }

  $('info').addEventListener('click', ev => {
    const pip = ev.target.closest('.pip');
    if (pip) { showTip(pip, true); return; }
    const b = ev.target.closest('[data-act]');
    if (!b) return;
    const t = selTower();
    if (!t) return;
    const act = b.dataset.act, v = b.dataset.v;
    if (act === 'close') { ui.selId = 0; }
    else if (act === 'mode') { t.mode = v; A.play('click'); }
    else if (act === 'node') { if (C.buyNode(S, t, +v)) { t.anim = 0.4; A.play('upgrade'); writeSave(); } }
    else if (act === 'inf') { if (C.buyInf(S, t, v)) { t.anim = 0.4; A.play('upgrade'); writeSave(); } }
    else if (act === 'max') { doBuyMax(t); }
    else if (act === 'sell') { doSell(t); return; }
    ui.infoKey = ''; ui.buildKey = '';
  });

  function refreshLedger() {
    const box = $('ledger');
    const tot = totalDealt();
    const list = S.towers.slice().sort((a, b) => b.dmg - a.dmg).slice(0, 5);
    const key = list.map(t => t.id + ':' + C.fmt(t.dmg) + ':' + t.kills).join() + ui.selId + '|' + C.fmt(S.stats.dmg) + S.stats.bossKills + S.stats.played;
    if (key === ui.ledgerKey) return;
    ui.ledgerKey = key;
    let h = '<h2>Herd ledger</h2>';
    if (!list.length) h += '<p class="hint">Place a pony to start tracking damage and kills.</p>';
    else {
      h += '<div class="lrows">';
      for (const t of list) {
        const r = C.RACES[t.race];
        const f = tot > 0 ? t.dmg / tot : 0;
        h += '<button type="button" class="lrow' + (t.id === ui.selId ? ' on' : '') + '" data-id="' + t.id + '"><span class="ln" style="color:' + r.accent + '">' + r.name + ' #' + t.id + '</span><span class="lv">' + C.fmt(t.dmg) + ' &middot; ' + t.kills + ' kills</span><span class="lb"><i style="width:' + (100 * f).toFixed(1) + '%;background:' + r.accent + '"></i></span></button>';
      }
      h += '</div>';
    }
    h += '<div class="ltot"><span>Total dealt <b>' + C.fmt(S.stats.dmg) + '</b></span><span>Bosses <b>' + S.stats.bossKills + '</b></span><span>Waves played <b>' + S.stats.played + '</b></span></div>';
    box.innerHTML = h;
  }
  $('ledger').addEventListener('click', ev => {
    const b = ev.target.closest('.lrow');
    if (!b) return;
    ui.selId = +b.dataset.id; ui.placing = null; updateHint(); ui.infoKey = ''; ui.ledgerKey = '';
    refreshInfo(); focusInfo();
  });

  function refreshSpeed() {
    const key = S.settings.speed + '|' + ui.paused + '|' + S.settings.sound;
    if (key === ui.speedKey) return;
    ui.speedKey = key;
    for (const b of $('speedBar').querySelectorAll('[data-speed]')) b.classList.toggle('on', !ui.paused && +b.dataset.speed === S.settings.speed);
    const p = $('pauseBtn');
    p.classList.toggle('on', ui.paused);
    p.setAttribute('aria-pressed', ui.paused ? 'true' : 'false');
    p.textContent = ui.paused ? '▶' : '❚❚';
    p.setAttribute('aria-label', ui.paused ? 'Resume' : 'Pause');
    const m = $('muteBtn');
    m.classList.toggle('off', !S.settings.sound);
    m.setAttribute('aria-pressed', S.settings.sound ? 'false' : 'true');
    m.setAttribute('aria-label', S.settings.sound ? 'Mute sound' : 'Unmute sound');
    m.textContent = S.settings.sound ? '♪' : '✕';
  }
  $('speedBar').addEventListener('click', ev => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.id === 'pauseBtn') togglePause();
    else setSpeed(+b.dataset.speed);
    A.play('click');
  });
  $('muteBtn').addEventListener('click', () => setSound(!S.settings.sound));

  function syncSettings() {
    const st = S.settings;
    $('optSound').checked = st.sound;
    $('optVol').value = Math.round(st.vol * 100);
    $('optShake').checked = st.shake;
    $('optNums').checked = st.dmgNums;
    for (const r of document.querySelectorAll('input[name="numFmt"]')) r.checked = r.value === st.numFmt;
    $('fmtDemo').textContent = [1234, 5.67e6, 8.9e12].map(C.fmt).join('  ·  ');
    ui.speedKey = '';
  }
  let lastFocus = null;
  function openSettings() {
    lastFocus = document.activeElement;
    syncSettings();
    $('setModal').hidden = false;
    $('setClose').focus();
  }
  function closeSettings() {
    if ($('setModal').hidden) return;
    $('setModal').hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  $('setBtn').addEventListener('click', openSettings);
  $('setClose').addEventListener('click', closeSettings);
  $('setModal').addEventListener('click', ev => { if (ev.target === $('setModal')) closeSettings(); });
  $('optSound').addEventListener('change', ev => setSound(ev.target.checked));
  $('optVol').addEventListener('input', ev => { S.settings.vol = (+ev.target.value) / 100; A.set(S.settings.sound, S.settings.vol); });
  $('optVol').addEventListener('change', () => { A.play('hit', 3); writeSave(); });
  $('optShake').addEventListener('change', ev => { S.settings.shake = ev.target.checked; if (!S.settings.shake) R.shakeT = 0; writeSave(); });
  $('optNums').addEventListener('change', ev => { S.settings.dmgNums = ev.target.checked; if (!S.settings.dmgNums) S.fx = S.fx.filter(f => f.k !== 'num'); writeSave(); });
  for (const r of document.querySelectorAll('input[name="numFmt"]')) r.addEventListener('change', ev => {
    if (!ev.target.checked) return;
    S.settings.numFmt = C.setNumFormat(ev.target.value);
    syncSettings(); dirty(); writeSave();
  });
  $('setReset').addEventListener('click', () => {
    S.settings = C.cleanSettings(null);
    C.setNumFormat(S.settings.numFmt);
    A.set(S.settings.sound, S.settings.vol);
    syncSettings(); dirty(); writeSave();
  });

  function mapCard(id) {
    const m = C.MAPS[id];
    const open = C.mapUnlocked(S, id), best = C.mapCleared(S, id), cur = S.map === id;
    const prev = m.order > 1 ? C.MAPS[C.MAP_IDS[m.order - 2]] : null;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mapcard' + (cur ? ' on' : '') + (open ? '' : ' locked');
    b.dataset.map = id;
    if (!open) b.setAttribute('aria-disabled', 'true');
    const c = document.createElement('canvas');
    c.width = 336; c.height = 192;
    let lock;
    if (cur) lock = '<span class="ml ok">Playing now</span>';
    else if (open) lock = '<span class="ml ok">' + (best ? 'Continue' : 'Unlocked, start fresh') + '</span>';
    else lock = '<span class="ml">Locked: clear wave ' + C.UNLOCK_AT + ' on ' + esc(prev.name) + ' (best ' + C.mapCleared(S, prev.id) + ')</span>';
    const info = document.createElement('div');
    info.innerHTML = '<div class="mt"><span class="mo">' + m.order + '</span><span>' + esc(m.name) + '</span><span class="mb">Best ' + best + ' / ' + C.MAX_WAVE + '</span></div>'
      + '<div class="mbar"><i style="width:' + best + '%"></i></div>'
      + '<div class="mf">' + esc(m.feature) + '</div><div class="md">' + esc(m.blurb) + '</div>' + lock;
    b.append(c, info);
    R.drawMapPreview(c, m);
    return b;
  }
  function buildMaps() {
    const box = $('mapList');
    box.innerHTML = '';
    for (const id of C.MAP_IDS) box.appendChild(mapCard(id));
  }
  function openMaps() {
    lastFocus = document.activeElement;
    $('mapBtn').classList.remove('pulse');
    buildMaps();
    $('mapModal').hidden = false;
    $('mapClose').focus();
  }
  function closeMaps() {
    if ($('mapModal').hidden) return;
    $('mapModal').hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function chooseMap(id) {
    if (id === S.map) { closeMaps(); return; }
    if (!C.mapUnlocked(S, id)) { A.play('deny'); banner('Clear wave ' + C.UNLOCK_AT + ' on the previous map to unlock this one', 'bad'); return; }
    if (S.run) { A.play('deny'); banner('Finish or lose the current wave before switching maps', 'bad'); return; }
    if (!C.switchMap(S, id)) return;
    ui.selId = 0; ui.placing = null; ui.ghost = null; ui.autoNext = 0; ui.paused = false;
    updateHint();
    R.bgKey = ''; resize();
    dirty();
    closeMaps();
    A.play('click');
    banner(C.mapOf(S).name + (S.cleared ? ': best wave ' + S.cleared : ': a fresh board with ' + C.fmt(S.cash) + ' cash'), 'good');
    writeSave();
  }
  $('mapBtn').addEventListener('click', openMaps);
  $('mapClose').addEventListener('click', closeMaps);
  $('mapModal').addEventListener('click', ev => {
    if (ev.target === $('mapModal')) { closeMaps(); return; }
    const card = ev.target.closest('.mapcard');
    if (card) chooseMap(card.dataset.map);
  });

  const tip = $('tip');
  function showTip(el, sticky) {
    const text = el.dataset.tip;
    if (!text) return;
    ui.tipEl = el;
    tip.textContent = text;
    tip.hidden = false;
    tip.classList.toggle('sticky', !!sticky);
    const r = el.getBoundingClientRect();
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    let x = r.left + r.width / 2 - tw / 2, y = r.top - th - 8;
    if (y < 6) y = r.bottom + 8;
    x = Math.max(6, Math.min(window.innerWidth - tw - 6, x));
    y = Math.max(6, Math.min(window.innerHeight - th - 6, y));
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }
  function hideTip() { ui.tipEl = null; tip.hidden = true; }
  document.addEventListener('pointerover', ev => {
    if (ev.pointerType === 'touch') return;
    const el = ev.target.closest && ev.target.closest('[data-tip]');
    if (el) showTip(el, false); else if (ui.tipEl && !tip.classList.contains('sticky')) hideTip();
  });
  document.addEventListener('pointerdown', ev => {
    if (ev.target.closest && ev.target.closest('.pip')) return;
    if (ui.tipEl) hideTip();
  });
  document.addEventListener('focusin', ev => { const el = ev.target.closest && ev.target.closest('[data-tip]'); if (el) showTip(el, false); });
  window.addEventListener('scroll', hideTip, true);

  function handleEvents() {
    if (!S.events.length) return;
    const evs = S.events.splice(0);
    for (const e of evs) {
      if (e.type === 'start') {
        if (e.boss) banner('Wave ' + e.n + ': ' + e.boss.name + ' approaches', 'boss');
        else banner('Wave ' + e.n + ' begins', '');
      } else if (e.type === 'boss') {
        A.play('boss');
        if (S.settings.shake) R.kick(9, 0.7);
        banner(e.name + ' has arrived!', 'boss');
      } else if (e.type === 'bossDown') {
        if (!C.bossStatus(S.run)) { A.play('bossDown'); banner(e.name + ' is defeated!', 'good'); if (S.settings.shake) R.kick(5, 0.35); }
      } else if (e.type === 'won') {
        A.play('win');
        banner(e.fresh ? 'Wave ' + e.n + ' cleared! Bonus +' + C.fmt(e.bonus) + ', kills +' + C.fmt(e.earned) : 'Wave ' + e.n + ' replayed: +' + C.fmt(e.earned) + ' kill cash', 'good');
        if (e.fresh) {
          if (e.n === C.UNLOCK_AT) {
            const nx = C.MAP_IDS[C.mapOf(S).order];
            if (nx) setTimeout(() => { banner('Wave ' + C.UNLOCK_AT + ' cleared! ' + C.MAPS[nx].name + ' is now unlocked.', 'good'); A.play('unlocked'); $('mapBtn').classList.add('pulse'); }, 2700);
          }
          if (S.sel === e.n && S.sel < C.MAX_WAVE) S.sel = C.topWave(S);
          if (e.n === C.MAX_WAVE) setTimeout(() => banner('All 100 waves held. ' + C.mapOf(S).name + ' is safe!', 'good'), 2700);
        }
        if (S.auto && !(e.fresh && e.n === C.MAX_WAVE)) ui.autoNext = performance.now() + 1600;
        writeSave();
      } else if (e.type === 'lost') {
        A.play('lose');
        banner('Wave ' + e.n + ' lost. Ponies and cash kept, try again', 'bad');
        ui.autoNext = 0;
        if (S.auto) { S.auto = false; }
        writeSave();
      } else if (e.type === 'enrage') {
        banner('The stragglers are enraged and immune to control', 'bad');
      } else if (e.type === 'gust') { A.play('wind'); continue; }
      else if (e.type === 'map') resize();
      else if (e.type === 'leak') continue;
      ui.waveKey = ''; ui.infoKey = '';
    }
  }

  function refreshHud() {
    $('hCash').textContent = C.fmt(S.cash);
    $('hLives').textContent = S.run ? Math.max(0, S.run.lives) + '/' + C.LIVES : C.LIVES + '/' + C.LIVES;
    $('hWave').textContent = S.run ? S.run.n : S.sel;
    $('hBest').textContent = S.cleared;
  }

  buildList();
  syncSettings();
  let last = performance.now(), acc = 0, uiT = 0, saveT = 0, ledT = 0;
  const DT = 1 / 60;
  function frame(now) {
    const real = Math.min(0.25, (now - last) / 1000);
    last = now;
    const speed = S.settings.speed || 1;
    if (!ui.paused) {
      acc += real * speed;
      let steps = 0;
      const cap = 8 * speed;
      while (acc >= DT && steps < cap) { C.step(S, DT); acc -= DT; steps++; }
      if (steps >= cap) acc = 0;
    } else acc = 0;
    handleEvents();
    A.drain(S.sfx);
    if (!ui.paused && ui.autoNext && now >= ui.autoNext && !S.run) {
      ui.autoNext = 0;
      if (S.auto) C.startWave(S, S.sel);
    }
    ui.sel = selTower();
    R.drawScene(ctx, S, ui, now, real, cw, ch, dpr);
    board.classList.toggle('bossfight', R.bossBar);
    if (now - uiT > 120) {
      uiT = now;
      refreshHud(); refreshBuild(); refreshWave(); refreshInfo(); refreshSpeed(); drawIcons(now);
    }
    if (now - ledT > 500) { ledT = now; refreshLedger(); }
    if (now - saveT > 10000) { saveT = now; writeSave(); }
    requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) writeSave(); });
  window.addEventListener('pagehide', writeSave);
  $('saveNote').textContent = 'Progress saves automatically in this browser.';
  requestAnimationFrame(frame);
  window.__nd = { get S() { return S; }, ui, save: writeSave, audio: A, setSpeed, togglePause, refresh: dirty, openMaps, closeMaps, chooseMap };
})();
