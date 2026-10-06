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
    heroSel: false, heroKey: '', heroBarKey: '', heroListKey: '',
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
    if (ui.placing) { ui.selId = 0; ui.heroSel = false; }
    updateHint();
    ui.buildKey = ''; ui.infoKey = '';
  }
  function updateHint() {
    const h = $('placeHint');
    if (!ui.placing) { h.className = 'placehint'; return; }
    const name = C.RACES[ui.placing].name;
    const extra = C.mapOf(S).dark ? (ui.placing === 'crystal' ? ' Crystal ponies glow: they keep full range and light up the ponies around them.' : ' Ponies outside crystal light lose range. Crystal ponies carry their own light.') : '';
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
      ui.heroSel = false;
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
    if (S.hero && C.heroAt(S, x, y)) { selectHero(!ui.heroSel); return; }
    const t = towerAt(x, y);
    if (ui.heroSel && !t) { orderMove(x, y); return; }
    ui.heroSel = false;
    ui.selId = t ? t.id : 0;
    ui.sellArm = 0;
    ui.infoKey = '';
  });

  const HERO_ICONS = { bolt: '\u26A1', burst: '\u2739', cage: '\u25A6', dagger: '\u2020', eye: '\u25C9', mark: '\u2316', moon: '\u263E', quake: '\u2248', shield: '\u26E8', shout: '\u203C', swirl: '\u058E', wind: '\u27BF' };
  function heroIc(id) { return HERO_ICONS[id] || '\u2726'; }
  function selectHero(on) {
    if (!S.hero || !S.hero.id) { ui.heroSel = false; if (on) openHeroes(); return; }
    ui.heroSel = !!on;
    if (ui.heroSel) { ui.selId = 0; if (ui.placing) setPlacing(null); }
    const h = $('placeHint');
    if (ui.heroSel) {
      h.textContent = 'Tap or click the field to move ' + C.HEROES[S.hero.id].name + '. Esc or tap the hero to stop.';
      h.className = 'placehint show';
    } else if (!ui.placing) h.className = 'placehint';
    ui.infoKey = ''; ui.heroBarKey = ''; ui.heroKey = '';
  }
  function orderMove(x, y) {
    if (!C.moveHero(S, x, y)) return;
    A.play('click');
  }
  const CAST_MSG = { idle: 'Hero abilities work during a wave', stunned: 'Your hero is stunned', notarget: 'No target in range for that ability' };
  function doCast(i) {
    if (!S.hero || !S.hero.id) { openHeroes(); return false; }
    const r = C.castHero(S, i);
    if (r === true) { ui.heroBarKey = ''; return true; }
    A.play('deny');
    if (CAST_MSG[r]) banner(CAST_MSG[r], r === 'stunned' ? 'bad' : '');
    return r;
  }

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
    if (!$('codexModal').hidden) { if (k === 'Escape') closeCodex(); return; }
    if (!$('starModal').hidden) { if (k === 'Escape') closeStar(); return; }
    if (!$('researchModal').hidden) { if (k === 'Escape' || k === 'r') closeResearch(); return; }
    if (!$('heroModal').hidden) { if (k === 'Escape' || k === 'h') closeHeroes(); return; }
    const t = selTower();
    if (k === 'Escape') { if (ui.placing) setPlacing(null); else if (ui.heroSel) selectHero(false); else { ui.selId = 0; ui.infoKey = ''; } }
    else if (k === 'q' || k === 'w' || k === 'e') doCast('qwe'.indexOf(k));
    else if (k === 'h') { if (!S.hero || !S.hero.id) openHeroes(); else selectHero(!ui.heroSel); }
    else if (/^[1-9]$/.test(k) && C.RACE_IDS[+k - 1]) setPlacing(C.RACE_IDS[+k - 1]);
    else if (k === ' ') { ev.preventDefault(); if (!S.run) startSelected(); else togglePause(); }
    else if (k === 'p') togglePause();
    else if (k === 'f') cycleSpeed();
    else if (k === 'm') setSound(!S.settings.sound);
    else if (k === 'c') openCodex();
    else if (k === 'r') openResearch();
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
      const r0 = C.RACES[id], b0 = C.computeStats({ race: id, paths: [0, 0, 0, 0, 0], infD: 0, infR: 0 });
      b.dataset.tip = r0.name + ' (hotkey ' + (C.RACE_IDS.indexOf(id) + 1) + ') - ' + r0.role + '\n' + r0.ability + '\nDamage ' + C.fmt(b0.dmg) + ' base, ' + b0.rate + '/s, range ' + Math.round(b0.range) + '.\nOwned: ' + C.owned(S, id) + '. Each extra copy costs x' + C.TUNE.towerGrowth + '.';
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

  const TYPE_ORDER = ['basic', 'fast', 'tanky', 'flying', 'magical', 'swarm', 'healer', 'splitter', 'stealth', 'burrower', 'shield', 'armored', 'boss'];
  const TYPE_COL = {
    basic: '#a07a52', fast: '#e3c15b', tanky: '#8a6a4a', flying: '#7fc8ff', magical: '#c08bff', boss: '#e35b6a',
    swarm: '#d8c08a', healer: '#9fe08a', splitter: '#e0a8c8', mini: '#e0a8c8', stealth: '#b8c0e0', burrower: '#c09060', shield: '#8fc0ff', armored: '#c8c0b0',
  };
  function mechTip(kind, id) {
    return C.mechOf(kind, id).map(k => { const M = C.MECH[k]; return M ? M.tag + ': ' + M.weak + ' Counters: ' + M.counters.join(', ') + '.' : ''; }).filter(Boolean).join('\n');
  }
  function previewHtml(spec, compact, n, map) {
    let h = '<div class="mix">';
    for (const k of TYPE_ORDER) {
      const c = spec.counts[k];
      if (!c) continue;
      const d = C.ENEMIES[k];
      const name = k === 'boss' && spec.boss ? spec.boss.name : d.short;
      let tip = (k === 'boss' && spec.boss ? spec.boss.name + '\n' + spec.boss.desc : d.name + '\n' + d.trait);
      if (d.plate && n) tip += '\nArmor ' + C.fmt(C.armorFor(k, n, map)) + ' per hit';
      if (k !== 'boss') tip += '\n' + mechTip('e', k);
      h += '<span class="mx" data-tip="' + esc(tip) + '"><canvas data-dnb="' + k + '" width="48" height="48"></canvas><b>' + c + '</b>' + (compact ? '' : '<span>' + esc(name) + '</span>') + '</span>';
    }
    if (spec.counts.elite) h += '<span class="mx elite" data-tip="' + esc('Elite DNBs\n' + C.MECH.elite.weak + (n >= C.WAVEGEN.elite.combo ? ' From wave ' + C.WAVEGEN.elite.combo + ' each elite also carries armor, a bubble or stealth.' : '')) + '"><i class="star">&#9733;</i><b>' + spec.counts.elite + '</b>' + (compact ? '' : '<span>Elite</span>') + '</span>';
    h += '</div>';
    if (!compact) {
      h += '<div class="tl" aria-hidden="true">';
      const dur = Math.max(1, spec.duration);
      for (const e of spec.list) h += '<i style="left:' + (100 * e.t / dur).toFixed(1) + '%;background:' + (TYPE_COL[e.type] || '#a07a52') + (e.type === 'boss' ? ';width:6px;height:12px;top:-2px' : e.elite ? ';box-shadow:0 0 0 1px #ffd66e' : '') + '"></i>';
      h += '</div><div class="tlk"><span>0s</span><span>' + (spec.themeName ? esc(spec.themeName) : 'Mixed wave') + '</span><span>' + Math.round(spec.duration) + 's</span></div>';
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
    if ((spec.counts.flying || bFly) && !fly) out.push('No pony can hit flyers yet. Add a Pegasus or a Bat Pony.');
    if ((spec.counts.magical || bMag) && !mag) out.push('No pony can harm magical DNBs yet. Add a Unicorn, or a Crystal Pony on the Spellshard path.');
    const tkB = spec.boss && spec.boss.tricks ? spec.boss.tricks : {};
    const hasCloak = spec.counts.stealth || tkB.cloak || (tkB.stages && tkB.stages.some(s => s.cloak));
    const sts = S.towers.map(t => C.stats(t));
    if (hasCloak && !sts.some(s => s.detects || s.revealR > 0)) out.push('Stealthy DNBs ahead. Only ponies that detect them can aim: a Bat Pony on Echolocation, a Unicorn on Skyward Sight 3+, or a Crystal Pony whose glow reveals them.');
    if ((spec.counts.armored || tkB.plate) && !sts.some(s => s.pierce > 0)) out.push('Armored DNBs ahead. Small hits barely scratch them. Stonehoof earth ponies and Arcanist unicorns pierce armor.');
    if ((spec.counts.swarm || 0) >= 15 && !sts.some(s => s.splash > 0 || s.swarmMul > 1)) out.push('Big swarms ahead. Splash and multi-shot ponies (Prismatic, Geode Burst, Feather Volley) clear them fast.');
    const map = C.mapOf(S);
    if (map.wind && spec.counts.flying) out.push('Wind gusts on this map push flyers back or sideways.');
    return out;
  }

  function refreshWave() {
    const top = C.topWave(S);
    const n = S.run ? S.run.n : S.sel;
    const left = S.run ? S.run.enemies.length + S.run.queue.length : 0;
    const star = C.starOf(S);
    const key = [n, S.cleared, !!S.run, S.auto, S.run ? S.run.lives : 0, left, ui.autoNext > 0, S.towers.length, C.fmt(1e6), star, S.map, C.rl(S, 'util_auto'), C.rl(S, 'eco_first') + C.rl(S, 'eco_master')].join();
    if (key === ui.waveKey) return;
    ui.waveKey = key;
    $('starMods').innerHTML = starPills(star, false);
    $('starBtn').hidden = !C.canStarUp(S);
    $('starBtn').textContent = 'Star up to ' + (star + 1) + '★';
    $('presetBtn').hidden = !(C.rl(S, 'util_auto') && !S.run && !S.towers.length && C.presetOf(S).length);
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
    let html = previewHtml(spec, false, n, map);
    if (spec.boss) {
      const tags = C.mechOf('b', spec.boss.id).map(k => C.MECH[k] ? '<span class="tag" data-tip="' + esc(C.MECH[k].weak + ' Counters: ' + C.MECH[k].counters.join(', ') + '.') + '">' + esc(C.MECH[k].tag) + '</span>' : '').join('');
      html += '<div class="bosscard"><canvas data-dnb="boss" width="64" height="64"></canvas><div><div class="bn">' + esc(spec.boss.name) + '</div><div class="bd">' + esc(spec.boss.desc) + '</div><div class="tags">' + tags + '</div></div></div>';
    }
    for (const w of warnings(spec)) html += '<div class="warn">' + esc(w) + '</div>';
    if (fresh) html += '<div>First clear bonus: <b style="color:var(--gold)">+' + C.fmt(Math.round(C.clearBonus(n, map) * C.clearMul(S, star))) + '</b></div>';
    if (S.run) {
      html += '<div>In progress: <b>' + left + '</b> DNBs left</div>';
      const nx = S.run.n + 1;
      if (nx <= C.MAX_WAVE && S.run.fresh) html += '<div class="upnext"><span>Up next: wave ' + nx + '</span>' + previewHtml(C.waveSpec(nx, map), true, nx, map) + '</div>';
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
    const key = [t.id, t.paths.join(''), t.infD, t.infR, t.mode, aff, pv.count, ui.sellArm > performance.now(), (t.buff && t.buff.dmg + ',' + t.buff.rate + ',' + t.buff.range + ',' + t.buff.detect) || '', C.fmt(1e6)].join('|');
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
    if (t.buff && (t.buff.dmg || t.buff.rate)) h += '<span class="tag yes">Aura +' + C.pct(t.buff.dmg) + ' dmg +' + C.pct(t.buff.rate) + ' rate</span>';
    if (t.buff && t.buff.range) h += '<span class="tag yes">Aura +' + C.pct(t.buff.range) + ' range</span>';
    if (s.detects) h += '<span class="tag yes">Detects stealth</span>';
    if (s.auraR) h += '<span class="tag yes">Aura ' + Math.round(s.auraR) + '</span>';
    if (s.lightR && C.mapOf(S).dark) h += '<span class="tag yes">Light ' + Math.round(s.lightR) + '</span>';
    if (s.wall) h += '<span class="tag yes">Wall -' + C.pct(s.wall) + ' speed</span>';
    if (s.fastMul > 1) h += '<span class="tag yes">x' + (Math.round(s.fastMul * 100) / 100) + ' vs fast</span>';
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
    const st = C.starOf(S, id);
    if (st) { b.classList.add('starred'); b.style.setProperty('--sg', st); }
    let stars = '';
    for (let i = 1; i <= C.MAX_STARS; i++) stars += i <= st ? '<b>★</b>' : '☆';
    const info = document.createElement('div');
    info.innerHTML = '<div class="mt"><span class="mo">' + m.order + '</span><span>' + esc(m.name) + '</span><span class="mb">Best ' + best + ' / ' + C.MAX_WAVE + '</span></div>'
      + '<div class="mstars" aria-label="' + st + ' of ' + C.MAX_STARS + ' stars" data-tip="' + esc(starTip(st)) + '">' + stars + '</div>'
      + (st ? '<div class="smods">' + starPills(st, true) + '</div>' : '')
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

  function pctOf(m) { return Math.round((m - 1) * 100); }
  function starTip(st) {
    if (!st) return 'No stars yet. Clear wave ' + C.MAX_WAVE + ' to star up this map.';
    const lines = [st + '★: DNBs +' + pctOf(C.starHpMul(st, S)) + '% HP, +' + pctOf(C.starSpeedMul(st)) + '% speed. Rewards +' + pctOf(C.starCashMul(st)) + '% cash.'];
    for (const m of C.starMods(st)) lines.push(m.star + '★ ' + m.name + ': ' + m.desc);
    return lines.join('\n');
  }
  function starPills(st, compact) {
    if (!st) return '';
    let h = '<span class="smod lvl" data-tip="' + esc(starTip(st)) + '">' + st + '★</span>';
    for (const m of C.starMods(st)) h += '<span class="smod" data-tip="' + esc(m.name + ': ' + m.desc) + '">' + esc(compact ? m.short : m.name) + '</span>';
    return h;
  }

  function starBodyHtml() {
    const map = C.mapOf(S), cur = C.starOf(S), next = cur + 1;
    const gain = C.starUpGain(S), skip = C.skipFor(S);
    const mod = C.STAR_MODS.find(m => m.star === next);
    let line = '';
    for (let i = 1; i <= C.MAX_STARS; i++) line += i <= next ? '★' : '<span class="dim">☆</span>';
    let h = '<div class="stline">' + line + '</div>';
    h += '<p>Raise <b>' + esc(map.name) + '</b> to <b>' + next + '★</b>? Clearing all ' + C.MAX_WAVE + ' waves again will be harder, and pay more.</p>';
    h += '<h3>Resets on this map</h3><ul class="loses" id="starResets">'
      + '<li>' + (S.towers.length === 1 ? 'Your 1 pony on the board is removed' : 'All ' + S.towers.length + ' ponies on the board are removed') + '</li>'
      + '<li>Cash goes back to ' + C.fmt(C.mapStartCash(map, S)) + (skip ? ' plus the skipped waves’ pay' : '') + '</li>'
      + '<li>Wave progress restarts at wave ' + (skip + 1) + ' (best ' + S.cleared + ')</li>'
      + '<li>First-clear records reset, so every first-clear bonus pays again</li>'
      + (S.hero ? '<li>' + C.HEROES[S.hero.id].name + ' goes back to level 1 (the hero choice and unlocks stay)</li>' : '') + '</ul>';
    h += '<h3>You gain</h3><ul class="gains">'
      + '<li><span class="gain">+' + gain + ' Moonstones</span> for permanent research</li>'
      + '<li>Rewards +' + pctOf(C.starCashMul(next)) + '% cash (was +' + pctOf(C.starCashMul(cur)) + '%)</li>'
      + '<li>DNBs +' + pctOf(C.starHpMul(next, S)) + '% HP, +' + pctOf(C.starSpeedMul(next)) + '% speed, counting ' + C.researchLevels(S) + ' research levels at ' + Math.round(C.STAR.res * 1000) / 10 + '% each</li>'
      + (mod ? '<li>New modifier: <b>' + esc(mod.name) + '</b>. ' + esc(mod.desc) + '</li>' : '')
      + '<li>Boss waves you clear for the first time drop Moonstones</li>'
      + (skip ? '<li>Head Start skips waves 1 to ' + skip + ', bonuses paid</li>' : '')
      + (C.rl(S, 'util_auto') ? '<li>Your current layout is saved as a preset</li>' : '')
      + '</ul>';
    h += '<p class="hint">Other maps, research, Moonstones and the Codex are not touched.</p>';
    return h;
  }
  function openStar() {
    if (!C.canStarUp(S)) { A.play('deny'); banner(S.run ? 'Finish the wave first' : 'Clear wave ' + C.MAX_WAVE + ' to star up this map', 'bad'); return false; }
    lastFocus = document.activeElement;
    $('starTitle').textContent = 'Star up to ' + (C.starOf(S) + 1) + '★';
    $('starBody').innerHTML = starBodyHtml();
    $('starModal').hidden = false;
    $('starCancel').focus();
    return true;
  }
  function closeStar() {
    if ($('starModal').hidden) return;
    $('starModal').hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function confirmStar() {
    const r = C.starUp(S);
    $('starModal').hidden = true;
    if (!r) { A.play('deny'); return null; }
    ui.selId = 0; ui.placing = null; ui.ghost = null; ui.autoNext = 0; ui.paused = false; S.auto = false;
    updateHint(); dirty();
    writeSave();
    return r;
  }
  function starBurst(e) {
    const el = $('starBurst');
    let rays = '';
    for (let i = 0; i < 12; i++) rays += '<i class="sbray" style="transform:rotate(' + (i * 30) + 'deg)"></i>';
    el.innerHTML = rays + '<div class="sbstar">★</div><div class="sbtext">' + esc(C.MAPS[e.id].name) + ' ' + e.star + '★ · +' + e.gain + ' Moonstones</div>';
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2500);
  }
  $('starBtn').addEventListener('click', openStar);
  $('starClose').addEventListener('click', closeStar);
  $('starCancel').addEventListener('click', closeStar);
  $('starConfirm').addEventListener('click', confirmStar);
  $('starModal').addEventListener('click', ev => { if (ev.target === $('starModal')) closeStar(); });
  $('presetBtn').addEventListener('click', () => {
    const n = C.placePreset(S);
    if (!n) { A.play('deny'); banner('Not enough cash to rebuild the saved layout yet', 'bad'); return; }
    A.play('place');
    banner('Rebuilt ' + n + ' ponies from your saved layout', 'good');
    dirty(); writeSave();
  });

  function resTip(r) {
    const lv = C.rl(S, r.id), st = C.researchState(S, r.id);
    const lines = [r.name + ' ' + lv + '/' + r.max, r.per];
    if (lv) lines.push('Now: ' + r.total(lv));
    if (lv < r.max) lines.push('Next: ' + r.total(lv + 1) + ' for ' + C.researchCost(r.id, lv) + ' Moonstones');
    else lines.push('Fully researched');
    if (st === 'locked') lines.push('Requires ' + r.req.map(q => C.RESEARCH_BY_ID[q].name).join(' and '));
    return lines.join('\n');
  }
  function buildResearch(flash) {
    $('resMoon').textContent = C.fmt(S.moon || 0) + ' Moonstones';
    $('resPress').textContent = Math.round(C.STAR.res * 1000) / 10 + '%';
    const box = $('resTree');
    let h = '';
    for (const br of C.BRANCHES) {
      const nodes = C.RESEARCH.filter(r => r.br === br.id);
      let lines = '';
      for (const r of nodes) for (const q of r.req) {
        const p = C.RESEARCH_BY_ID[q];
        lines += '<line x1="' + (p.pos[0] + 0.5) * 100 + '" y1="' + (p.pos[1] + 0.5) * 100 + '" x2="' + (r.pos[0] + 0.5) * 100 + '" y2="' + (r.pos[1] + 0.5) * 100 + '"' + (C.rl(S, q) ? ' class="on"' : '') + '/>';
      }
      let btns = '';
      for (const r of nodes) {
        const lv = C.rl(S, r.id), st = C.researchState(S, r.id);
        let pips = '';
        for (let i = 0; i < r.max; i++) pips += '<i' + (i < lv ? ' class="on"' : '') + '></i>';
        const cost = st === 'maxed' ? 'Max' : '◆ ' + C.researchCost(r.id, lv);
        btns += '<button type="button" class="rnode ' + st + (flash === r.id ? ' flash' : '') + '" data-res="' + r.id + '" style="left:' + ((r.pos[0] + 0.5) / 3 * 100).toFixed(2) + '%;top:' + ((r.pos[1] + 0.5) / 4 * 100).toFixed(2) + '%"'
          + ' data-tip="' + esc(resTip(r)) + '" aria-label="' + esc(r.name + ', level ' + lv + ' of ' + r.max + ', ' + st) + '"'
          + (st === 'locked' ? ' aria-disabled="true"' : '') + '><span class="rn">' + esc(r.name) + '</span><span class="rpips">' + pips + '</span><span class="rc">' + cost + '</span></button>';
      }
      h += '<section class="rbranch" style="--bc:' + br.color + ';--bcg:' + br.color + '73;--bcm:' + br.color + '38"><h3>' + esc(br.name) + '</h3><div class="rbd">' + esc(br.desc) + '</div>'
        + '<div class="rgraph"><svg viewBox="0 0 300 400" preserveAspectRatio="none" aria-hidden="true">' + lines + '</svg>' + btns + '</div></section>';
    }
    box.innerHTML = h;
  }
  function openResearch() {
    lastFocus = document.activeElement;
    $('researchBtn').classList.remove('pulse');
    buildResearch();
    $('researchModal').hidden = false;
    $('researchClose').focus();
  }
  function closeResearch() {
    if ($('researchModal').hidden) return;
    $('researchModal').hidden = true;
    hideTip();
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function tryResearch(id) {
    if (!C.buyResearch(S, id)) { A.play('deny'); return false; }
    A.play('research');
    buildResearch(id);
    const el = $('resTree').querySelector('[data-res="' + id + '"]');
    if (el) { el.focus(); if (el.matches(':hover')) showTip(el, false); }
    dirty(); writeSave();
    return true;
  }
  $('researchBtn').addEventListener('click', openResearch);
  $('researchClose').addEventListener('click', closeResearch);
  $('researchModal').addEventListener('click', ev => {
    if (ev.target === $('researchModal')) { closeResearch(); return; }
    const n = ev.target.closest('[data-res]');
    if (n) tryResearch(n.dataset.res);
  });


  function heroLockText(d) {
    const u = d.unlock;
    return u.free ? 'Free' : 'Unlock with ◆ ' + u.moon + ' or: ' + u.text;
  }
  function buildHeroList() {
    const box = $('heroList');
    $('heroMoon').textContent = '◆ ' + C.fmt(S.moon || 0);
    let h = '';
    for (const id of C.HERO_IDS) {
      const d = C.HEROES[id], own = C.heroUnlocked(S, id), cur = S.hero && S.hero.id === id;
      const lv = S.hero && S.hero.prog && S.hero.prog[id] ? S.hero.prog[id].lv : 1;
      let act;
      if (cur) act = '<span class="hpick cur">Active on this map</span>';
      else if (own) act = '<button type="button" class="primary hpick" data-pick="' + id + '"' + (S.run ? ' disabled' : '') + '>' + (S.run ? 'Pick after this wave' : 'Pick ' + esc(d.name)) + '</button>';
      else act = '<button type="button" class="starbtn hpick" data-buy="' + id + '"' + ((S.moon || 0) < d.unlock.moon ? ' disabled' : '') + '>Unlock ◆ ' + d.unlock.moon + '</button><div class="hlock">or: ' + esc(d.unlock.text) + '</div>';
      let ab = '';
      d.abil.forEach((a, i) => { ab += '<li><kbd>' + 'QWE'[i] + '</kbd><b>' + heroIc(a.icon) + ' ' + esc(a.name) + '</b> <span class="hcdt">' + a.cd + 's</span><div>' + esc(a.text(1)) + '</div></li>'; });
      h += '<article class="hcard' + (cur ? ' on' : '') + (own ? '' : ' locked') + '" data-hero="' + id + '">'
        + '<div class="htop"><canvas width="120" height="120" data-hicon="' + id + '"></canvas><div><h3>' + esc(d.name) + '</h3><div class="hrole">' + esc(d.role) + ' &middot; ' + esc(d.title) + '</div>'
        + '<div class="hblurb">' + esc(d.blurb) + '</div>' + (own ? '<div class="hlvl">Level ' + lv + ' on this map</div>' : '') + '</div></div>'
        + '<div class="haura"><b>' + esc(d.aura.name) + '</b> (aura): ' + esc(d.aura.text(d.aura.base)) + '</div>'
        + '<ul class="habil">' + ab + '</ul>' + act + '</article>';
    }
    box.innerHTML = h;
    drawHeroIcons(performance.now());
    ui.heroListKey = heroListKey();
  }
  function heroListKey() { return (S.moon || 0) + '|' + !!S.run + '|' + (S.hero ? S.hero.id : '') + '|' + C.HERO_IDS.map(id => C.heroUnlocked(S, id) ? 1 : 0).join(''); }
  function drawHeroIcons(now) {
    for (const c of document.querySelectorAll('canvas[data-hicon]')) if (c.offsetParent) R.heroIcon(c, c.dataset.hicon, now);
  }
  function openHeroes() {
    lastFocus = document.activeElement;
    buildHeroList();
    $('heroModal').hidden = false;
    $('heroClose').focus();
  }
  function closeHeroes() {
    if ($('heroModal').hidden) return;
    $('heroModal').hidden = true;
    hideTip();
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function doPickHero(id) {
    if (!C.pickHero(S, id)) { A.play('deny'); return false; }
    A.play('research');
    banner(C.HEROES[id].name + ' joins the defense. Tap the hero, then the field to move.', 'good');
    buildHeroList();
    ui.heroKey = ''; ui.heroBarKey = '';
    writeSave();
    return true;
  }
  function doUnlockHero(id) {
    if (!C.unlockHero(S, id)) { A.play('deny'); return false; }
    buildHeroList();
    dirty(); writeSave();
    return true;
  }
  $('heroClose').addEventListener('click', closeHeroes);
  $('heroModal').addEventListener('click', ev => {
    if (ev.target === $('heroModal')) { closeHeroes(); return; }
    const pk = ev.target.closest('[data-pick]');
    if (pk && !pk.disabled) { if (doPickHero(pk.dataset.pick)) closeHeroes(); return; }
    const bu = ev.target.closest('[data-buy]');
    if (bu && !bu.disabled) doUnlockHero(bu.dataset.buy);
  });
  $('heroFace').addEventListener('click', () => { if (!S.hero || !S.hero.id) openHeroes(); else selectHero(!ui.heroSel); });
  for (const b of document.querySelectorAll('#heroBar .hab')) b.addEventListener('click', () => doCast(+b.dataset.ab));

  function refreshHeroBar(now) {
    const bar = $('heroBar');
    const inf = C.heroInfo(S);
    bar.hidden = false;
    bar.classList.toggle('none', !inf);
    const face = $('heroFace');
    face.classList.toggle('on', !!ui.heroSel);
    face.setAttribute('aria-pressed', ui.heroSel ? 'true' : 'false');
    const fc = face.querySelector('canvas');
    if (inf) R.heroIcon(fc, inf.id, now);
    else { const g = fc.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, fc.width, fc.height); }
    const k = inf ? inf.id + inf.lv + '|' + inf.abil.map(a => Math.round(a.left * 4) + (a.ready ? 'r' : '')).join() + '|' + (inf.stunT > 0) + !!S.run : 'none';
    if (k === ui.heroBarKey) return;
    ui.heroBarKey = k;
    $('heroFaceLv').textContent = inf ? inf.lv : '+';
    face.dataset.tip = inf ? inf.def.name + ', level ' + inf.lv + (inf.max ? ' (max)' : '') + '\nSelect, then tap the field to move (H).' : 'Pick a hero for this map (H)';
    face.setAttribute('aria-label', inf ? 'Select ' + inf.def.name + ' (H)' : 'Pick a hero (H)');
    document.querySelectorAll('#heroBar .hab').forEach((b, i) => {
      const a = inf && inf.abil[i];
      b.hidden = !a;
      if (!a) return;
      b.querySelector('.hic').textContent = heroIc(a.icon);
      const p = a.ready ? 0 : Math.min(1, a.left / a.cd);
      b.style.setProperty('--cd', (p * 360).toFixed(1) + 'deg');
      b.querySelector('.hcd').textContent = a.ready ? '' : Math.ceil(a.left);
      b.classList.toggle('ready', a.ready && !!S.run && !(inf.stunT > 0));
      b.classList.toggle('cooling', !a.ready);
      b.disabled = false;
      b.setAttribute('aria-label', a.name + ' (' + a.key + ')' + (a.ready ? '' : ', ' + Math.ceil(a.left) + ' seconds'));
      b.dataset.tip = a.name + ' (' + a.key + ') - cooldown ' + a.cd.toFixed(1) + 's\n' + a.text + (S.run ? '' : '\nUsable during a wave.');
    });
  }

  function heroCardSkeleton(inf) {
    const box = $('heroCard');
    if (!inf) {
      box.innerHTML = '<h2>Hero</h2><p class="hint">No hero on this map yet. A hero stands on the field, auto-attacks, casts Q/W/E abilities and boosts nearby ponies.</p><button type="button" class="primary hchoose pulse" data-heroes>Pick a hero</button>';
      return;
    }
    let ab = '';
    inf.abil.forEach((a, i) => { ab += '<li class="hcab" data-i="' + i + '" tabindex="0"><kbd>' + a.key + '</kbd><span class="hn"></span><span class="hcdt"></span></li>'; });
    box.innerHTML = '<h2>Hero</h2><div class="hctop"><canvas width="96" height="96" data-hicon="' + inf.id + '"></canvas><div class="hcmain"><div class="hcname"></div><div class="hcrole"></div>'
      + '<div class="hclv"></div><div class="hxp" role="progressbar" aria-label="Hero experience" aria-valuemin="0" aria-valuemax="100"><i></i></div><div class="hcxp"></div></div></div>'
      + '<div class="hcaura"></div><ul class="hcabs">' + ab + '</ul><div class="hcstat"></div>'
      + '<div class="hcrow"><label class="auto hauto"><input type="checkbox" id="heroAuto"><span class="sw"></span><span>Auto-cast</span></label><button type="button" class="ghost hchoose" data-heroes>Change hero</button></div>';
    $('heroAuto').addEventListener('change', ev => { if (S.hero) { S.hero.auto = ev.target.checked; writeSave(); } });
  }
  $('heroCard').addEventListener('click', ev => {
    if (ev.target.closest('[data-heroes]')) { openHeroes(); return; }
    const li = ev.target.closest('.hcab');
    if (li) doCast(+li.dataset.i);
  });
  function refreshHeroCard() {
    const inf = C.heroInfo(S);
    const sk = inf ? inf.id + '|' + S.map : 'none|' + S.map;
    if (sk !== ui.heroKey) { ui.heroKey = sk; heroCardSkeleton(inf); }
    if (!inf) return;
    const box = $('heroCard');
    box.querySelector('.hcname').textContent = inf.def.name;
    box.querySelector('.hcrole').textContent = inf.def.role;
    box.querySelector('.hclv').textContent = 'Level ' + inf.lv + ' / 30 · Rank ' + inf.rank + (inf.nextRank ? ' (next at ' + inf.nextRank + ')' : '');
    const pct = inf.max ? 100 : Math.min(100, inf.xp / inf.need * 100);
    const bar = box.querySelector('.hxp');
    bar.firstChild.style.width = pct.toFixed(1) + '%';
    bar.setAttribute('aria-valuenow', Math.round(pct));
    box.querySelector('.hcxp').textContent = inf.max ? 'Max level' : 'XP ' + C.fmt(Math.floor(inf.xp)) + ' / ' + C.fmt(Math.ceil(inf.need));
    box.querySelector('.hcaura').innerHTML = '<b>' + esc(inf.def.aura.name) + '</b> · ' + esc(inf.auraText) + ' (radius ' + Math.round(inf.auraR) + ')';
    box.querySelectorAll('.hcab').forEach((li, i) => {
      const a = inf.abil[i];
      li.querySelector('.hn').textContent = heroIc(a.icon) + ' ' + a.name;
      li.querySelector('.hcdt').textContent = a.ready ? 'Ready' : Math.ceil(a.left) + 's';
      li.classList.toggle('ready', a.ready);
      li.dataset.tip = a.name + ' (' + a.key + ') - cooldown ' + a.cd.toFixed(1) + 's\n' + a.text;
    });
    box.querySelector('.hcstat').textContent = 'Range ' + Math.round(inf.range) + ' · ' + inf.rate.toFixed(2) + ' hits/s · kills ' + C.fmt(inf.kills || 0) + (inf.stunT > 0 ? ' · stunned!' : '');
    const au = $('heroAuto');
    if (au.checked !== inf.auto) au.checked = inf.auto;
    const ch = box.querySelector('.hcrow .hchoose');
    ch.disabled = false;
    ch.dataset.tip = S.run ? 'You can change hero between waves' : 'Pick another hero for this map';
    const c = box.querySelector('canvas[data-hicon]');
    if (c) R.heroIcon(c, inf.id, performance.now());
    if (!$('heroModal').hidden && heroListKey() !== ui.heroListKey) buildHeroList();
  }

  const codexUi = { tab: 'e', pick: null, toastT: 0 };
  function codexEntries() { const L = C.codexList(); return codexUi.tab === 'b' ? L.b : L.e; }
  function codexKnown(it) { const box = it.kind === 'b' ? S.codex.b : S.codex.e; return !!box[it.id]; }
  function codexArt(c, it, known, now) {
    R.dnbIcon(c, it.kind === 'b' ? 'boss' : it.id, it.kind === 'b' ? it.def : null, now || 0);
    if (known) return;
    const g = c.getContext('2d');
    g.save(); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#2a2640'; g.fillRect(0, 0, c.width, c.height); g.restore();
  }
  function codexWhere(it) {
    if (it.kind === 'b') return C.MAPS[it.map].name + ', wave ' + it.wave;
    const out = [];
    for (const id of C.MAP_IDS) {
      const w = it.id === 'mini' ? C.firstSeen('splitter', id) : C.firstSeen(it.id, id);
      if (w) out.push(C.MAPS[id].name + ' ' + w);
    }
    return out.join(' · ');
  }
  function codexDetail(it) {
    const box = $('codexDetail');
    if (!it) { box.innerHTML = '<p class="hint">Pick an entry to read about it.</p>'; return; }
    const known = codexKnown(it), d = it.def;
    let h = '<div class="cdtop"><canvas id="codexBig" width="160" height="160"></canvas><div><h3>' + (known ? esc(d.name) : '???') + '</h3>';
    h += '<div class="cdsub">' + (it.kind === 'b' ? 'Boss · ' : 'DNB · ') + esc(codexWhere(it)) + '</div></div></div>';
    if (!known) {
      h += '<p class="hint">Not seen yet. Meet it in a wave to unlock this entry.</p>';
      box.innerHTML = h;
      codexArt($('codexBig'), it, false, 0);
      return;
    }
    const E = C.ENEMIES[it.kind === 'b' ? 'boss' : it.id];
    const map = C.mapOf(S), n = Math.max(1, S.sel);
    const stats = [];
    if (it.kind === 'b') {
      stats.push(['HP', 'x' + (E.hp * (d.hpMul || 1)).toFixed(1) + ' of a Shambler, +1% per wave']);
      stats.push(['Leak cost', (d.tricks && d.tricks.twin ? 3 : 5) + ' lives']);
      if (d.tricks && d.tricks.plate) stats.push(['Armor', Math.round(d.tricks.plate * 100) + '% of a Shambler\'s HP per hit']);
    } else {
      stats.push(['HP', 'x' + E.hp + ' of a Shambler']);
      stats.push(['Speed', String(E.speed)]);
      stats.push(['Bounty', 'x' + E.cash]);
      if (E.plate) stats.push(['Armor', C.fmt(C.armorFor(it.id, n, map)) + ' per hit at wave ' + n]);
      if (E.swarm) stats.push(['Group', '5 at a time']);
    }
    h += '<p class="cddesc">' + esc(it.kind === 'b' ? d.desc : E.trait) + '</p><dl class="cdstats">' + stats.map(s => '<dt>' + esc(s[0]) + '</dt><dd>' + esc(s[1]) + '</dd>').join('') + '</dl>';
    for (const k of it.mech) {
      const M = C.MECH[k];
      if (!M) continue;
      h += '<div class="cdmech"><span class="tag">' + esc(M.tag) + '</span><div><div>' + esc(M.weak) + '</div><div class="cdc">Counter ponies: ' + esc(M.counters.join(', ')) + '</div></div></div>';
    }
    box.innerHTML = h;
    codexArt($('codexBig'), it, true, 0);
  }
  function buildCodex() {
    const list = codexEntries();
    const all = C.codexList();
    const ce = all.e.filter(codexKnown).length, cb = all.b.filter(codexKnown).length;
    $('codexCount').textContent = ce + ' / ' + all.e.length + ' DNBs · ' + cb + ' / ' + all.b.length + ' bosses';
    for (const b of document.querySelectorAll('#codexTabs [data-tab]')) { const on = b.dataset.tab === codexUi.tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); }
    const grid = $('codexGrid');
    grid.innerHTML = '';
    let lastMap = '';
    for (const it of list) {
      if (it.kind === 'b' && it.map !== lastMap) {
        lastMap = it.map;
        const hd = document.createElement('div');
        hd.className = 'cxmap'; hd.textContent = C.MAPS[it.map].name;
        grid.appendChild(hd);
      }
      const known = codexKnown(it);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cx' + (known ? '' : ' locked') + (codexUi.pick === it.kind + it.id ? ' on' : '');
      b.dataset.cx = it.kind + ':' + it.id;
      const c = document.createElement('canvas');
      c.width = 72; c.height = 72;
      const nm = document.createElement('span');
      nm.textContent = known ? (it.kind === 'b' ? it.def.name : it.def.short) : '???';
      b.append(c, nm);
      grid.appendChild(b);
      codexArt(c, it, known, 0);
    }
    const cur = list.find(it => codexUi.pick === it.kind + it.id) || null;
    codexDetail(cur);
  }
  function openCodex(tab) {
    lastFocus = document.activeElement;
    if (tab) codexUi.tab = tab;
    $('codexBtn').classList.remove('pulse');
    buildCodex();
    $('codexModal').hidden = false;
    $('codexClose').focus();
  }
  function closeCodex() {
    if ($('codexModal').hidden) return;
    $('codexModal').hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function codexToast(e) {
    const el = $('codexToast');
    el.textContent = 'Codex: ' + e.name + (e.kind === 'b' ? ' (boss)' : '') + ' added';
    el.className = 'codextoast show';
    $('codexBtn').classList.add('pulse');
    A.play('codex');
    clearTimeout(codexUi.toastT);
    codexUi.toastT = setTimeout(() => { el.className = 'codextoast'; }, 2800);
    if (!$('codexModal').hidden) buildCodex();
  }
  $('codexBtn').addEventListener('click', () => openCodex());
  $('codexClose').addEventListener('click', closeCodex);
  $('codexModal').addEventListener('click', ev => {
    if (ev.target === $('codexModal')) { closeCodex(); return; }
    const tb = ev.target.closest('[data-tab]');
    if (tb) { codexUi.tab = tb.dataset.tab; codexUi.pick = null; buildCodex(); return; }
    const cx = ev.target.closest('[data-cx]');
    if (cx) { const [k, id] = cx.dataset.cx.split(':'); codexUi.pick = k + id; buildCodex(); const d = $('codexDetail'); if (d.scrollIntoView && window.innerWidth < 700) d.scrollIntoView({ block: 'nearest' }); }
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
        banner((e.fresh ? 'Wave ' + e.n + ' cleared! Bonus +' + C.fmt(e.bonus) + ', kills +' + C.fmt(e.earned) : 'Wave ' + e.n + ' replayed: +' + C.fmt(e.earned) + ' kill cash') + (e.moon ? ' · +' + e.moon + ' Moonstones' : ''), 'good');
        if (e.moon) $('researchBtn').classList.add('pulse');
        if (e.fresh) {
          if (e.n === C.UNLOCK_AT) {
            const nx = C.MAP_IDS[C.mapOf(S).order];
            if (nx) setTimeout(() => { banner('Wave ' + C.UNLOCK_AT + ' cleared! ' + C.MAPS[nx].name + ' is now unlocked.', 'good'); A.play('unlocked'); $('mapBtn').classList.add('pulse'); }, 2700);
          }
          if (S.sel === e.n && S.sel < C.MAX_WAVE) S.sel = C.topWave(S);
          if (e.n === C.MAX_WAVE) setTimeout(() => banner('All 100 waves held. ' + C.mapOf(S).name + ' is safe!' + (C.canStarUp(S) ? ' Star up for Moonstones.' : ''), 'good'), 2700);
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
      else if (e.type === 'codex') { codexToast(e); continue; }
      else if (e.type === 'map') resize();
      else if (e.type === 'starup') {
        starBurst(e);
        banner(C.MAPS[e.id].name + ' is now ' + e.star + '★! +' + e.gain + ' Moonstones', 'good');
        $('researchBtn').classList.add('pulse');
        if (S.settings.shake) R.kick(6, 0.5);
      }
      else if (e.type === 'research') { dirty(); continue; }
      else if (e.type === 'herolv') { if (e.rankUp) banner(e.name + ' reached level ' + e.lv + '! Abilities and aura upgraded', 'good'); ui.heroBarKey = ''; continue; }
      else if (e.type === 'heroUnlock') { A.play('unlocked'); banner(e.name + ' is unlocked! Pick heroes from the hero card.', 'good'); ui.heroListKey = ''; continue; }
      else if (e.type === 'herostun') { banner(e.name + ' stuns your hero!', 'bad'); continue; }
      else if (e.type === 'heroPick') { ui.heroKey = ''; ui.heroBarKey = ''; continue; }
      else if (e.type === 'herocast') { ui.heroBarKey = ''; continue; }
      else if (e.type === 'leak') continue;
      ui.waveKey = ''; ui.infoKey = '';
    }
  }

  function refreshHud() {
    $('hCash').textContent = C.fmt(S.cash);
    const lm = S.run ? (S.run.livesMax || C.LIVES) : C.livesFor(S);
    $('hLives').textContent = S.run ? Math.max(0, S.run.lives) + '/' + lm : lm + '/' + lm;
    $('hMoon').textContent = C.fmt(S.moon || 0);
    const st = C.starOf(S), sc = $('hStarChip');
    const sk = S.map + st;
    if (sc.dataset.k !== sk) {
      sc.dataset.k = sk;
      $('hStars').textContent = st ? st + '★' : '0';
      sc.dataset.tip = starTip(st);
      sc.classList.toggle('on', st > 0);
    }
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
      refreshHud(); refreshBuild(); refreshWave(); refreshInfo(); refreshSpeed(); drawIcons(now); refreshHeroCard();
      if (!$('heroModal').hidden) drawHeroIcons(now);
    }
    refreshHeroBar(now);
    if (now - ledT > 500) { ledT = now; refreshLedger(); }
    if (now - saveT > 10000) { saveT = now; writeSave(); }
    requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) writeSave(); });
  window.addEventListener('pagehide', writeSave);
  $('saveNote').textContent = 'Progress saves automatically in this browser.';
  requestAnimationFrame(frame);
  window.__nd = { get S() { return S; }, ui, save: writeSave, audio: A, setSpeed, togglePause, refresh: dirty, openMaps, closeMaps, chooseMap, openCodex, closeCodex,
    openStar, closeStar, confirmStar, openResearch, closeResearch, buyResearch: tryResearch,
    forceClear(n) { if (S.run) return false; S.cleared = Math.max(S.cleared, Math.min(C.MAX_WAVE, n)); S.sel = C.topWave(S); dirty(); return true; },
    grantMoon(n) { C.grantMoon(S, n); dirty(); return S.moon; },
    openHeroes, closeHeroes, pickHero: doPickHero, unlockHero: doUnlockHero, castHero: doCast, selectHero,
    moveHero(x, y) { return C.moveHero(S, x, y); }, heroInfo() { return C.heroInfo(S); }, heroXp(n) { const r = C.addHeroXp(S, n); handleEvents(); return r; },
    heroScreen() { if (!S.hero || !S.hero.id) return null; const r = cv.getBoundingClientRect(), p = V.toScreen(S.hero.x, S.hero.y - 8); return [r.left + p[0], r.top + p[1]]; },
    worldToClient(x, y) { const r = cv.getBoundingClientRect(), p = V.toScreen(x, y); return [r.left + p[0], r.top + p[1]]; } };
})();
