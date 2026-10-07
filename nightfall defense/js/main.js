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
  let seenReady = false;
  function writeSave() {
    if (seenReady && !ui.away) C.touchSeen(prof(), Date.now());
    try { localStorage.setItem(SAVE_KEY, C.serialize(prof())); return true; } catch (err) { return false; }
  }
  function clearSave() {
    try { localStorage.removeItem(SAVE_KEY); } catch (err) { }
  }

  let S = loadSave() || C.newState();
  function prof() { return C.profileOf(S); }
  C.setNumFormat(S.settings.numFmt);
  A.set(S.settings.sound, S.settings.vol);
  const ui = {
    placing: null, ghost: null, ghostTouch: false, selId: 0, hoverId: 0, sellArm: 0, autoNext: 0,
    infoKey: '', waveKey: '', buildKey: '', ledgerKey: '', speedKey: '', showAll: false, paused: false, sel: null, tipEl: null,
    heroSel: false, heroKey: '', heroBarKey: '', heroListKey: '',
    away: null, farmNext: 0, farmKey: '', rulesKey: '', plansKey: '',
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
  function dirty() { ui.infoKey = ui.waveKey = ui.buildKey = ui.ledgerKey = ui.speedKey = ui.farmKey = ui.rulesKey = ''; }

  let bannerT = 0;
  function banner(text, cls) {
    const b = $('banner');
    b.textContent = text;
    b.className = 'banner show ' + (cls || '');
    clearTimeout(bannerT);
    bannerT = setTimeout(() => { b.className = 'banner'; }, 2600);
  }

  function setPlacing(race) {
    if (race && ui.placing !== race && S.chal) {
      const why = C.chalBlock(S, race);
      if (why === 'race' || why === 'over') { A.play('deny'); banner(CHAL_MSG[why], 'bad'); return; }
    }
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
    const cb = C.chalBlock(S, race);
    if (cb) { banner(CHAL_MSG[cb] + (cb === 'cap' ? ' (' + S.chal.def.cap + ')' : ''), 'bad'); A.play('deny'); return; }
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
    if (C.chalHas(S, 'nosell')) { A.play('deny'); banner('No selling in this challenge', 'bad'); return; }
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
    if (ev.target && /INPUT|TEXTAREA|SELECT/.test(ev.target.tagName) && !(ev.key === 'Escape' && (ev.target.tagName === 'SELECT' || ev.target.type === 'checkbox'))) return;
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
    if (k === 'Shift') { ui.showAll = true; return; }
    if (!$('awayModal').hidden) { if (k === 'Escape' || k === 'Enter') { ev.preventDefault(); claimAway(); } return; }
    if (!$('chalEndModal').hidden) { if (k === 'Escape' || k === 'Enter') { ev.preventDefault(); closeChalEnd(false); } return; }
    if (!$('chalModal').hidden) { if (k === 'Escape' || k === 'g') closeChal(); return; }
    if (!$('achModal').hidden) { if (k === 'Escape' || k === 'a') closeAch(); return; }
    if (!$('statsModal').hidden) { if (k === 'Escape' || k === 't') closeStats(); return; }
    if (!$('rulesModal').hidden) { if (k === 'Escape') closeRules(); return; }
    if (!$('plansModal').hidden) { if (k === 'Escape') closePlans(); return; }
    if (!$('setModal').hidden) { if (k === 'Escape') closeSettings(); return; }
    if (!$('mapModal').hidden) { if (k === 'Escape') closeMaps(); return; }
    if (!$('codexModal').hidden) { if (k === 'Escape' || k === 'c') closeCodex(); return; }
    if (!$('wardrobeModal').hidden) { if (k === 'Escape' || k === 'k') closeWardrobe(); return; }
    if (!$('starModal').hidden) { if (k === 'Escape') closeStar(); return; }
    if (!$('researchModal').hidden) { if (k === 'Escape' || k === 'r') closeResearch(); return; }
    if (!$('heroModal').hidden) { if (k === 'Escape' || k === 'h') closeHeroes(); return; }
    const t = selTower();
    if (k === 'Escape') { if (ui.placing) setPlacing(null); else if (ui.heroSel) selectHero(false); else { ui.selId = 0; ui.infoKey = ''; } }
    else if (k === 'q' || k === 'w' || k === 'e') doCast('qwe'.indexOf(k));
    else if (k === 'h') { if (!S.hero || !S.hero.id) openHeroes(); else selectHero(!ui.heroSel); }
    else if (/^[1-9]$/.test(k) && C.RACE_IDS[+k - 1]) setPlacing(C.RACE_IDS[+k - 1]);
    else if (k === 'x' && S.chal) quitChal(false);
    else if (k === ' ') { ev.preventDefault(); if (!S.run) startSelected(); else togglePause(); }
    else if (k === 'p') togglePause();
    else if (k === 'f') cycleSpeed();
    else if (k === 'm') setSound(!S.settings.sound);
    else if (k === 'c') openCodex();
    else if (k === 'r') openResearch();
    else if (k === 'g') openChal();
    else if (k === 'a') openAch();
    else if (k === 't') openStats();
    else if (k === 'k') openWardrobe();
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
    const allow = C.chalRaces(S);
    const key = C.RACE_IDS.map(id => C.nextTowerCost(S, id) + (S.cash >= C.nextTowerCost(S, id) ? 'y' : 'n')).join() + ui.placing + C.fmt(1e6) + allow.join() + (S.chal ? S.chal.id + S.towers.length : '');
    if (key === ui.buildKey) return;
    ui.buildKey = key;
    const capped = S.chal && S.chal.def.cap && S.towers.length >= S.chal.def.cap;
    for (const b of $('buildList').children) {
      const id = b.dataset.race, cost = C.nextTowerCost(S, id);
      b.hidden = allow.indexOf(id) < 0;
      b.classList.toggle('capped', !!capped);
      b.querySelector('.rc').textContent = C.fmt(cost);
      b.classList.toggle('on', ui.placing === id);
      b.classList.toggle('poor', S.cash < cost);
      const r0 = C.RACES[id], b0 = C.computeStats({ race: id, paths: [0, 0, 0, 0, 0], infD: 0, infR: 0 });
      b.dataset.tip = r0.name + ' (hotkey ' + (C.RACE_IDS.indexOf(id) + 1) + ') - ' + r0.role + '\n' + r0.ability + '\nDamage ' + C.fmt(b0.dmg) + ' base, ' + b0.rate + '/s, range ' + Math.round(b0.range) + '.\nOwned: ' + C.owned(S, id) + '. Each extra copy costs x' + C.TUNE.towerGrowth + '.';
    }
  }

  function startSelected() {
    if (S.run) return;
    ui.autoNext = 0; ui.farmNext = 0;
    C.startWave(S, S.sel);
  }
  $('startBtn').addEventListener('click', startSelected);
  $('wPrev').addEventListener('click', () => { if (!S.run && S.sel > 1) { S.sel--; ui.waveKey = ''; } });
  $('wNext').addEventListener('click', () => { if (!S.run && S.sel < C.topWave(S)) { S.sel++; ui.waveKey = ''; } });
  $('wTop').addEventListener('click', () => { if (!S.run) { S.sel = C.topWave(S); ui.waveKey = ''; } });
  $('autoBox').addEventListener('change', ev => {
    S.auto = ev.target.checked; ui.waveKey = '';
    if (!S.auto) ui.autoNext = 0;
    else if (farmOn()) { C.setFarm(S, false); ui.farmNext = 0; ui.farmKey = ''; banner('Auto-farm off: Auto-continue climbs instead', ''); }
    writeSave();
  });
  function resetAll() {
    if (S.chal) { chalDeny('Resetting progress'); return; }
    if (!window.confirm('Reset all progress on every map? Every pony, upgrade, wave and coin will be lost.')) return;
    const keep = S.settings;
    clearSave();
    S = C.newState();
    S.settings = keep;
    R.bgKey = ''; resize();
    ui.selId = 0; ui.placing = null; ui.autoNext = 0; ui.farmNext = 0; ui.paused = false;
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
    const slotKey = C.slotsOf(S).map(q => q ? q.name + q.at : '').join();
    const key = [n, S.cleared, !!S.run, S.auto, S.run ? S.run.lives : 0, left, ui.autoNext > 0, S.towers.length, C.fmt(1e6), star, S.map, C.rl(S, 'util_auto'), C.rl(S, 'eco_first') + C.rl(S, 'eco_master'), slotKey, !!S.build, ui.farmNext > 0].join();
    if (key === ui.waveKey) return;
    ui.waveKey = key;
    $('starMods').innerHTML = starPills(star, false);
    $('starBtn').hidden = !C.canStarUp(S);
    $('starBtn').textContent = 'Star up to ' + (star + 1) + '★';
    const ls = latestSlot(), pb = $('presetBtn');
    pb.hidden = !(!S.run && !S.towers.length && !S.build && (ls >= 0 || (C.rl(S, 'util_auto') && C.presetOf(S).length)));
    if (!pb.hidden) pb.textContent = ls >= 0 ? 'Restore plan: ' + C.slotsOf(S)[ls].name : 'Rebuild saved layout';
    const fresh = n > S.cleared;
    const ch = S.chal;
    $('wLabel').textContent = 'Wave ' + n + (n === C.MAX_WAVE ? ' (final)' : '');
    const sub = $('wSub');
    sub.textContent = ch ? (ch.over ? 'Challenge over' : 'Challenge wave ' + (n - ch.from + 1) + ' of ' + (ch.to - ch.from + 1)) : fresh ? 'New wave: first clear pays a bonus' : 'Replay: kill cash only';
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
    sb.disabled = !!S.run || !!(ch && ch.over);
    sb.textContent = S.run ? 'Wave ' + S.run.n + ' running' : ch ? (ch.over ? 'Challenge over' : (ui.autoNext > 0 ? 'Auto-starting Wave ' + S.sel + '...' : 'Start Wave ' + S.sel)) : (ui.autoNext > 0 ? 'Auto-starting Wave ' + S.sel + '...' : (fresh ? 'Start Wave ' : 'Replay Wave ') + S.sel);
    $('autoBox').checked = !!S.auto;
    const nm = ch ? 'Challenge · ' + map.name : 'Map ' + map.order + ' · ' + map.name;
    if ($('mapName').textContent !== nm) $('mapName').textContent = nm;
    $('autoHint').textContent = ch ? (S.auto ? 'Auto is on: each cleared challenge wave starts the next one by itself.' : 'Auto is off: press Start for each challenge wave. Waves can not be replayed in a challenge.') : !S.auto
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
    const ttl = C.titleOf(t);
    const key = [t.id, t.name || '', ttl ? ttl.id : '', t.paths.join(''), t.infD, t.infR, t.mode, aff, S.rules.on, (S.rules.pony[t.id] || S.rules.race[t.race] || []).length, !!S.rules.pony[t.id], pv.count, ui.sellArm > performance.now(), (t.buff && t.buff.dmg + ',' + t.buff.rate + ',' + t.buff.range + ',' + t.buff.detect) || '', C.fmt(1e6)].join('|');
    if (key === ui.infoKey) { refreshPonyStats(t); return; }
    const ae = document.activeElement;
    if (ae && ae.id === 'ponyName' && box.contains(ae) && ui.infoKey.split('|')[0] === String(t.id)) { refreshPonyStats(t); return; }
    ui.infoKey = key;
    hideTip();
    const r = C.RACES[t.race];
    const s = C.stats(t);
    const dmg = C.effDmg(t), rate = C.effRate(t);
    let h = '<div class="ihead"><span class="nm" style="color:' + r.accent + '">' + (t.name ? esc(t.name) : r.name) + '</span>' + (ttl ? '<span class="ptitleb ' + ttl.id + '">' + ttl.name + '</span>' : '') + '<span class="pstate">' + (t.name ? esc(r.name) + ' ' : '') + '#' + t.id + '</span><button class="ghost x" data-act="close" type="button">Close</button></div>';
    const nx = C.titleNext(t), lv = C.ponyLevel(t);
    h += '<div class="iname"><input id="ponyName" type="text" maxlength="18" autocomplete="off" spellcheck="false" placeholder="Name this pony" aria-label="Pony name" value="' + esc(t.name || '') + '"><button type="button" data-act="randname" data-tip="Pick a random pony name">Random</button>' + (t.name ? '<button type="button" data-act="clearname">Clear</button>' : '') + '</div>';
    h += '<div class="ititle">' + (nx ? 'Next title <b>' + nx.name + '</b> at ' + C.fmt(nx.kills) + ' kills or level ' + nx.lv + ' &middot; now ' + C.fmt(t.kills | 0) + ' kills, level ' + lv : 'Highest title earned &middot; ' + C.fmt(t.kills | 0) + ' kills, level ' + lv) + '</div>';
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
    const own = S.rules.pony[t.id], rc = (own || S.rules.race[t.race] || []).length;
    h += '<button class="rulesbtn" type="button" data-act="rules">Upgrade rules &middot; ' + (own ? own.length + ' own' : rc ? rc + ' from ' + esc(r.name) : 'none') + (S.rules.on ? '' : ' (off)') + '</button>';
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
    if (act === 'rules') { openRules('pony', t.id); return; }
    if (act === 'close') { ui.selId = 0; }
    else if (act === 'mode') { t.mode = v; A.play('click'); }
    else if (act === 'node') { if (C.buyNode(S, t, +v)) { t.anim = 0.4; A.play('upgrade'); writeSave(); } }
    else if (act === 'inf') { if (C.buyInf(S, t, v)) { t.anim = 0.4; A.play('upgrade'); writeSave(); } }
    else if (act === 'max') { doBuyMax(t); }
    else if (act === 'sell') { doSell(t); return; }
    else if (act === 'randname') { C.renameTower(S, t.id, C.suggestName(S, t)); A.play('equip'); writeSave(); }
    else if (act === 'clearname') { C.renameTower(S, t.id, ''); A.play('click'); writeSave(); }
    ui.infoKey = ''; ui.buildKey = '';
  });
  function commitName(el) {
    const t = selTower();
    if (!t || (t.name || '') === el.value.trim()) return;
    C.renameTower(S, t.id, el.value);
    writeSave();
    ui.infoKey = ''; ui.ledgerKey = '';
  }
  $('info').addEventListener('change', ev => { if (ev.target.id === 'ponyName') commitName(ev.target); });
  $('info').addEventListener('keydown', ev => {
    if (ev.target.id !== 'ponyName') return;
    if (ev.key === 'Enter') { ev.preventDefault(); commitName(ev.target); ev.target.blur(); }
    else if (ev.key === 'Escape') { ev.preventDefault(); ev.target.value = (selTower() || {}).name || ''; ev.target.blur(); }
  });

  function refreshLedger() {
    const box = $('ledger');
    const tot = totalDealt();
    const list = S.towers.slice().sort((a, b) => b.dmg - a.dmg).slice(0, 5);
    const key = list.map(t => t.id + ':' + C.fmt(t.dmg) + ':' + t.kills + ':' + (t.name || '')).join() + ui.selId + '|' + C.fmt(S.stats.dmg) + S.stats.bossKills + S.stats.played;
    if (key === ui.ledgerKey) return;
    ui.ledgerKey = key;
    let h = '<h2>Herd ledger</h2>';
    if (!list.length) h += '<p class="hint">Place a pony to start tracking damage and kills.</p>';
    else {
      h += '<div class="lrows">';
      for (const t of list) {
        const r = C.RACES[t.race];
        const f = tot > 0 ? t.dmg / tot : 0;
        h += '<button type="button" class="lrow' + (t.id === ui.selId ? ' on' : '') + '" data-id="' + t.id + '"><span class="ln" style="color:' + r.accent + '">' + (t.name ? esc(t.name) : r.name + ' #' + t.id) + '</span><span class="lv">' + C.fmt(t.dmg) + ' &middot; ' + t.kills + ' kills</span><span class="lb"><i style="width:' + (100 * f).toFixed(1) + '%;background:' + r.accent + '"></i></span></button>';
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
    R.drawMapPreview(c, m, C.decorOf(S, m.id));
    return b;
  }
  function buildMaps() {
    const box = $('mapList');
    box.innerHTML = '';
    for (const id of C.MAP_IDS) box.appendChild(mapCard(id));
  }
  function openMaps() {
    if (S.chal) { A.play('deny'); banner('Quit the challenge to go back to your maps', 'bad'); return false; }
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
    if (S.chal) return;
    if (id === S.map) { closeMaps(); return; }
    if (!C.mapUnlocked(S, id)) { A.play('deny'); banner('Clear wave ' + C.UNLOCK_AT + ' on the previous map to unlock this one', 'bad'); return; }
    if (S.run) { A.play('deny'); banner('Finish or lose the current wave before switching maps', 'bad'); return; }
    if (!C.switchMap(S, id)) return;
    ui.selId = 0; ui.placing = null; ui.ghost = null; ui.autoNext = 0; ui.farmNext = 0; ui.paused = false;
    if (farmOn() && !S.run) { S.sel = C.farmTarget(S); ui.farmNext = performance.now() + 1600; }
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
    if (S.chal) return chalDeny('Starring up');
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
    ui.selId = 0; ui.placing = null; ui.ghost = null; ui.autoNext = 0; ui.farmNext = 0; ui.paused = false; S.auto = false;
    updateHint(); dirty();
    const ls = latestSlot();
    if (ls >= 0) setTimeout(() => { if (!S.towers.length && !S.build && !S.run) banner('Tap "Restore plan: ' + C.slotsOf(S)[ls].name + '" to rebuild your board', 'good'); }, 2800);
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
    const ls = latestSlot();
    if (ls >= 0) { doLoadPlan(ls); return; }
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
    $('resMoon').textContent = C.fmt(S.moon || 0) + ' Moonstones' + (S.rp ? ' + ' + C.fmt(S.rp) + ' research points' : '');
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
    if (S.chal) return chalDeny('Research');
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
    $('heroMoon').textContent = '◆ ' + C.fmt(prof().moon || 0);
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
    if (C.chalHas(S, 'nohero')) { A.play('deny'); banner('No heroes in this challenge', 'bad'); return false; }
    if (!C.pickHero(S, id)) { A.play('deny'); return false; }
    A.play('research');
    banner(C.HEROES[id].name + ' joins the defense. Tap the hero, then the field to move.', 'good');
    buildHeroList();
    ui.heroKey = ''; ui.heroBarKey = '';
    writeSave();
    return true;
  }
  function doUnlockHero(id) {
    if (S.chal) return chalDeny('Unlocking heroes');
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

  const codexUi = { tab: 'e', pick: null, toastT: 0, raf: 0 };
  const CX_KIND = { e: 'DNB', b: 'Boss', p: 'Pony', h: 'Hero' };
  function codexAll() {
    const L = C.codexList();
    L.p = C.RACE_IDS.map(id => ({ kind: 'p', id, def: C.RACES[id], mech: [] }));
    L.h = C.HERO_IDS.map(id => ({ kind: 'h', id, def: C.HEROES[id], mech: [] }));
    return L;
  }
  function codexEntries() { return codexAll()[codexUi.tab] || []; }
  function codexBox() { const P = prof(); return (P && P.codex) || S.codex; }
  function codexKnown(it) {
    if (it.kind === 'h') return C.heroUnlocked(prof(), it.id);
    const box = codexBox()[it.kind];
    return !!(box && box[it.id]);
  }
  function codexArt(c, it, known, now) {
    if (it.kind === 'p') { R.ponyPreview(c, it.id, now || 0, known ? undefined : null, { sil: !known, scale: 0.52, spin: known && c.width > 100, hop: known && c.width > 100 }); return; }
    if (it.kind === 'h') R.heroIcon(c, it.id, now || 0);
    else R.dnbIcon(c, it.kind === 'b' ? 'boss' : it.id, it.kind === 'b' ? it.def : null, now || 0);
    if (known) return;
    const g = c.getContext('2d');
    g.save(); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#2a2640'; g.fillRect(0, 0, c.width, c.height); g.restore();
  }
  function bossKills(id) {
    const P = prof();
    let n = 0;
    for (const m of C.MAP_IDS) { const b = C.boardOf(P, m); if (b && b.records && b.records.bosses) n += b.records.bosses[id] | 0; }
    if (S !== P && S.records && S.records.bosses) n += S.records.bosses[id] | 0;
    return n;
  }
  function codexKills(it) {
    const st = prof().stats || {};
    if (it.kind === 'b') return bossKills(it.id);
    if (it.kind === 'p') return (st.raceKills || {})[it.id] | 0;
    if (it.kind === 'h') return (st.heroKills || {})[it.id] | 0;
    return (st.killsBy || {})[it.id] | 0;
  }
  function codexWhere(it) {
    if (it.kind === 'b') return C.MAPS[it.map].name + ', wave ' + it.wave;
    if (it.kind === 'p') return it.def.role + ' · ' + C.fmt(it.def.cost) + ' cash';
    if (it.kind === 'h') return it.def.role + ' · ' + it.def.title;
    const out = [];
    for (const id of C.MAP_IDS) {
      const w = it.id === 'mini' ? C.firstSeen('splitter', id) : C.firstSeen(it.id, id);
      if (w) out.push(C.MAPS[id].name + ' ' + w);
    }
    return out.join(' · ');
  }
  function lockedHint(it) {
    if (it.kind === 'p') return 'Not placed yet. Place this pony on any map to unlock its entry.';
    if (it.kind === 'h') return 'Not recruited yet. Unlock: ' + (it.def.unlock.text || (it.def.unlock.moon + ' Moonstones')) + '.';
    return 'Not seen yet. Meet it in a wave to unlock this entry.';
  }
  function dl(stats) { return '<dl class="cdstats">' + stats.map(s => '<dt>' + esc(s[0]) + '</dt><dd>' + esc(s[1]) + '</dd>').join('') + '</dl>'; }
  function codexDetail(it) {
    const box = $('codexDetail');
    if (!it) { box.innerHTML = '<p class="hint">Pick an entry to read about it.</p>'; return; }
    const known = codexKnown(it), d = it.def;
    let h = '<div class="cdtop"><canvas id="codexBig" width="192" height="192"></canvas><div><h3>' + (known ? esc(d.name) : '???') + '</h3>';
    h += '<div class="cdsub">' + CX_KIND[it.kind] + ' · ' + esc(codexWhere(it)) + '</div>';
    if (known) h += '<div class="cdkills"><b>' + C.fmt(codexKills(it)) + '</b> ' + (it.kind === 'p' || it.kind === 'h' ? 'DNBs defeated' : 'defeated') + '</div>';
    h += '</div></div>';
    if (!known) {
      h += '<p class="hint">' + esc(lockedHint(it)) + '</p>';
      box.innerHTML = h;
      codexArt($('codexBig'), it, false, performance.now());
      return;
    }
    const lore = it.kind === 'b' ? '' : (C.LORE[it.kind] || {})[it.id];
    if (lore) h += '<p class="cdlore">' + esc(lore) + '</p>';
    if (it.kind === 'p') {
      h += dl([['Cost', C.fmt(d.cost)], ['Damage', String(d.dmg)], ['Rate', d.rate + '/s'], ['Range', String(d.range)], ['Damage dealt', C.fmt((prof().stats.raceDmg || {})[it.id] || 0)]]);
      h += '<p class="cddesc">' + esc(d.ability) + '</p>';
      const weak = [];
      if (/Cannot see flyers|Cannot reach flyers/.test(d.ability)) weak.push(['Flyers', 'Cannot target Duskwings or flying bosses without help.']);
      if (/Cannot harm magical|harm magical DNBs\./.test(d.ability) && it.id !== 'unicorn') weak.push(['Magical', 'Hexlings shrug off its attacks unless a path or aura dispels them.']);
      if (it.id === 'unicorn') weak.push(['Swarms', 'Slow bolts struggle with Gnat clouds and fast Skitters.']);
      if (it.id === 'pegasus' || it.id === 'bat') weak.push(['Armor', 'Light hits ring off Ironhide plates.']);
      if (it.id === 'crystal') weak.push(['Damage', 'Low raw damage; it shines when surrounded by other ponies.']);
      for (const w of weak) h += '<div class="cdmech"><span class="tag warn">' + esc(w[0]) + '</span><div>' + esc(w[1]) + '</div></div>';
      h += '<div class="ptitle"><span>Upgrade paths</span><span>' + C.PATHS[it.id].length + '</span></div><div class="cdpaths">';
      for (const p of C.PATHS[it.id]) h += '<div class="cdpath"><b>' + esc(p.name) + '</b> ' + esc(p.blurb) + '<div class="cdc">Node 10: ' + esc(p.sig) + '</div></div>';
      h += '</div><button type="button" class="codexbtn" data-wardrobe="' + it.id + '">Open wardrobe</button>';
    } else if (it.kind === 'h') {
      const a = d.aura;
      h += dl([['Race', C.RACES[d.race] ? C.RACES[d.race].name : d.race], ['Range', String(d.range)], ['Rate', d.rate + '/s'], ['Hits flyers', d.canFly ? 'Yes' : 'No'], ['Hurts magical', d.canMagic ? 'Yes' : 'No'], ['Damage dealt', C.fmt((prof().stats.heroDmg || {})[it.id] || 0)]]);
      h += '<p class="cddesc">' + esc(d.blurb) + '</p>';
      if (a) h += '<div class="cdmech"><span class="tag">Aura</span><div><div>' + esc(a.name) + '</div><div class="cdc">' + esc(a.text(a.base)) + ' within ' + a.r + '</div></div></div>';
      for (const ab of d.abil) h += '<div class="cdmech"><span class="tag">' + ab.cd + 's</span><div><div>' + esc(ab.name) + '</div><div class="cdc">' + esc(ab.text(1)) + '</div></div></div>';
    } else {
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
      h += '<p class="cddesc">' + esc(it.kind === 'b' ? d.desc : E.trait) + '</p>' + dl(stats);
      for (const k of it.mech) {
        const M = C.MECH[k];
        if (!M) continue;
        h += '<div class="cdmech"><span class="tag">' + esc(M.tag) + '</span><div><div>' + esc(M.weak) + '</div><div class="cdc">Counter ponies: ' + esc(M.counters.join(', ')) + '</div></div></div>';
      }
    }
    box.innerHTML = h;
    codexArt($('codexBig'), it, true, performance.now());
  }
  function codexCurrent() { return codexEntries().find(it => codexUi.pick === it.kind + it.id) || null; }
  function codexAnim(now) {
    codexUi.raf = 0;
    if ($('codexModal').hidden) return;
    const c = $('codexBig'), it = codexCurrent();
    if (c && it && codexKnown(it)) codexArt(c, it, true, now);
    codexUi.raf = requestAnimationFrame(codexAnim);
  }
  function buildCodex() {
    const list = codexEntries();
    const all = codexAll();
    const cnt = k => all[k].filter(codexKnown).length + ' / ' + all[k].length;
    $('codexCount').textContent = cnt('e') + ' DNBs · ' + cnt('b') + ' bosses · ' + cnt('p') + ' ponies · ' + cnt('h') + ' heroes';
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
      nm.textContent = known ? (it.kind === 'e' ? it.def.short : it.kind === 'p' ? it.def.name.replace(' Pony', '') : it.def.name) : '???';
      b.append(c, nm);
      if (known) { const k = codexKills(it); if (k) { const kb = document.createElement('i'); kb.className = 'cxk'; kb.textContent = C.fmt(k); b.appendChild(kb); } }
      grid.appendChild(b);
      codexArt(c, it, known, 0);
    }
    codexDetail(codexCurrent());
  }
  function openCodex(tab, pick) {
    lastFocus = document.activeElement;
    if (tab) { codexUi.tab = tab; codexUi.pick = pick ? tab + pick : codexUi.pick; }
    $('codexBtn').classList.remove('pulse');
    buildCodex();
    $('codexModal').hidden = false;
    $('codexClose').focus();
    if (!codexUi.raf) codexUi.raf = requestAnimationFrame(codexAnim);
  }
  function closeCodex() {
    if ($('codexModal').hidden) return;
    $('codexModal').hidden = true;
    if (codexUi.raf) { cancelAnimationFrame(codexUi.raf); codexUi.raf = 0; }
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function codexToast(e) {
    const el = $('codexToast');
    el.textContent = 'Codex: ' + e.name + (e.kind === 'b' ? ' (boss)' : e.kind === 'p' ? ' (pony)' : '') + ' added';
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
    const wb = ev.target.closest('[data-wardrobe]');
    if (wb) { const r = wb.dataset.wardrobe; closeCodex(); openWardrobe(r); return; }
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

  function fmtAway(sec) {
    sec = Math.max(0, Math.floor(sec));
    const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
    if (h) return h + 'h ' + (m < 10 ? '0' : '') + m + 'm';
    if (m) return m + 'm ' + (s < 10 ? '0' : '') + s + 's';
    return s + 's';
  }
  function anyModalOpen() {
    for (const id of ['setModal', 'mapModal', 'codexModal', 'starModal', 'researchModal', 'heroModal', 'awayModal', 'rulesModal', 'plansModal', 'chalModal', 'chalEndModal', 'achModal', 'statsModal', 'wardrobeModal']) if (!$(id).hidden) return true;
    return false;
  }
  function awayHtml(g) {
    let h = '<p>You were away for <b>' + fmtAway(g.away) + '</b>.' + (g.capped ? ' Earnings stop after <b>' + fmtAway(g.cap) + '</b>, so ' + fmtAway(g.secs) + ' counted.' : '') + '</p>';
    h += '<p class="hint">Each map earns from the best wave its board can safely farm. The map you were playing earns in full, the others at ' + Math.round(C.OFFLINE.side * 100) + '%.</p>';
    h += '<ul class="awaylist" id="awayList">';
    for (const m of g.maps) h += '<li class="' + (m.active ? 'on' : '') + '"><span class="an">' + esc(m.name) + '</span><span class="aw">wave ' + m.wave + ' &middot; ' + C.fmt(m.rate * 60) + '/min</span><span class="ac">+' + C.fmt(m.cash) + '</span></li>';
    h += '</ul><div class="awaytot"><span>Total</span><b id="awayTotal">+' + C.fmt(g.total) + '</b></div>';
    const r = C.rl(prof(), 'eco_offline'), c = C.rl(prof(), 'util_offline');
    h += '<p class="hint">' + (r ? 'Night Shift adds +' + Math.round(C.OFFLINE.boost * r * 100) + '% to these earnings. ' : 'Night Shift research raises these earnings. ') + (c ? 'Long Watch extends the limit to ' + fmtAway(C.offlineCap(prof())) + '.' : 'Long Watch research extends the 8h limit.') + '</p>';
    return h;
  }
  function openAway(g) {
    ui.away = g;
    lastFocus = document.activeElement;
    $('awayBody').innerHTML = awayHtml(g);
    $('awayClaim').textContent = 'Claim ' + C.fmt(g.total);
    $('awayModal').hidden = false;
    $('awayClaim').focus();
  }
  function claimAway() {
    const g = ui.away;
    if (!g) { $('awayModal').hidden = true; return 0; }
    ui.away = null;
    const got = C.applyOffline(prof(), g);
    $('awayModal').hidden = true;
    A.play('win');
    banner('Claimed ' + C.fmt(got) + ' earned while away', 'good');
    dirty(); writeSave();
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    if (S.build && !S.chal) C.buildStep(S);
    return got;
  }
  $('awayClaim').addEventListener('click', claimAway);
  function catchUp(now, quiet) {
    if (ui.away) return null;
    const S = prof();
    if (S.lastSeen > now) { if (!quiet) banner('The clock went back. Offline earnings resume once it passes your last visit.', 'bad'); return null; }
    const g = C.offlineGain(S, now);
    if (!g) { C.touchSeen(S, now); return null; }
    if (g.away < 10 || g.total <= 0) { C.touchSeen(S, now); return g; }
    if (g.away < C.OFFLINE.min) {
      C.applyOffline(S, g);
      banner('+' + C.fmt(g.total) + ' cash while the tab was hidden', 'good');
      dirty(); writeSave();
      return g;
    }
    openAway(g);
    return g;
  }

  function farmOn() { return !!(S.farm && S.farm.on); }
  function farmLabel() { return 'w' + C.farmTarget(S) + (S.farm && S.farm.fails ? ' !' : ''); }
  function setFarming(on, pick) {
    if (S.chal) return chalDeny('Auto-farm');
    C.setFarm(S, on, pick);
    ui.autoNext = 0;
    if (on && !S.run) { S.sel = C.farmTarget(S); ui.farmNext = performance.now() + 900; }
    if (!on) ui.farmNext = 0;
    ui.waveKey = ''; ui.farmKey = '';
    writeSave();
  }
  function farmPickOptions() {
    const top = C.topWave(S), sel = $('farmPick');
    const k = top + '|' + S.map + '|' + (S.farm ? S.farm.safe : 0) + '|' + S.cleared;
    if (sel.dataset.k !== k) {
      sel.dataset.k = k;
      const safe = S.farm && S.farm.safe ? S.farm.safe : S.cleared;
      let h = '<option value="0">Best safe wave (' + Math.max(1, Math.min(top, safe)) + ')</option>';
      for (let n = Math.max(1, S.cleared); n >= 1; n--) h += '<option value="' + n + '">Wave ' + n + '</option>';
      sel.innerHTML = h;
    }
    const v = String(S.farm ? S.farm.pick : 0);
    if (sel.value !== v) sel.value = sel.querySelector('option[value="' + v + '"]') ? v : '0';
  }
  function refreshFarm() {
    const f = S.farm || {};
    const key = [S.map, !!f.on, f.pick, f.safe, f.fails, f.runs, S.cleared, !!S.run, ui.farmNext > 0, S.sel].join();
    if (key === ui.farmKey) return;
    ui.farmKey = key;
    farmPickOptions();
    $('farmBox').checked = !!f.on;
    $('farmPick').disabled = S.cleared < 1;
    $('farmBox').disabled = S.cleared < 1 && !f.on;
    const n = C.farmTarget(S);
    $('farmHint').textContent = S.cleared < 1 ? 'Clear a wave to unlock auto-farm.'
      : !f.on ? 'Auto-farm loops ' + (f.pick ? 'wave ' + f.pick : 'your best wave cleared without losing a life (wave ' + n + ')') + ' and starts each run by itself. Two losses in a row stop it and drop back one wave.'
        : 'Farming wave ' + n + (f.runs ? ' · ' + f.runs + ' run' + (f.runs > 1 ? 's' : '') + ' done' : '') + (f.fails ? ' · last run lost, retrying once' : '') + '.';
    const chip = $('hFarmChip');
    chip.hidden = !f.on;
    if (f.on) { $('hFarm').textContent = farmLabel(); chip.classList.toggle('warn', !!f.fails); }
  }
  $('farmBox').addEventListener('change', ev => {
    if (ev.target.checked && S.cleared < 1) { ev.target.checked = false; A.play('deny'); return; }
    setFarming(ev.target.checked);
    banner(ev.target.checked ? 'Auto-farm on: looping wave ' + C.farmTarget(S) : 'Auto-farm off', ev.target.checked ? 'good' : '');
  });
  $('farmPick').addEventListener('change', ev => {
    const v = +ev.target.value || 0;
    C.setFarm(S, farmOn(), v);
    if (!S.run) S.sel = C.farmTarget(S);
    ui.waveKey = ''; ui.farmKey = '';
    writeSave();
  });
  $('hFarmChip').addEventListener('click', () => { const b = $('farmBox'); b.closest('.farmrow').scrollIntoView({ block: 'center', behavior: 'smooth' }); b.focus({ preventScroll: true }); });

  const rulesUi = { scope: 'race', key: C.RACE_IDS[0], kind: 'dmg' };
  function rulesList() {
    if (rulesUi.scope === 'pony') {
      const t = S.towers.find(q => q.id === rulesUi.key);
      if (!t) { rulesUi.scope = 'race'; rulesUi.key = C.RACE_IDS[0]; return rulesList(); }
      const own = S.rules.pony[t.id];
      return { t, race: t.race, own: !!own, list: own || S.rules.race[t.race] || [] };
    }
    return { t: null, race: rulesUi.key, own: true, list: S.rules.race[rulesUi.key] || [] };
  }
  function commitRules(list) {
    const cur = rulesList();
    if (rulesUi.scope === 'pony') C.setRules(S, 'pony', cur.t.id, list);
    else C.setRules(S, 'race', rulesUi.key, list);
    buildRules(); ui.infoKey = ''; writeSave();
  }
  function ruleArgsHtml(race) {
    const k = rulesUi.kind;
    if (k === 'dmg' || k === 'rate') {
      let o = '<option value="0">no limit</option>';
      for (const n of [5, 10, 15, 20, 25, 30, 40, 50]) o += '<option value="' + n + '">up to Lv ' + n + '</option>';
      return '<select id="ruleTo" aria-label="Level limit">' + o + '</select>';
    }
    if (k === 'path') {
      const P = C.PATHS[race];
      const ps = (id, none) => '<select id="' + id + '" aria-label="' + (none ? 'Then path' : 'First path') + '">' + (none ? '<option value="-1">then nothing</option>' : '') + P.map((p, i) => '<option value="' + i + '">' + (none ? 'then ' : '') + esc(p.name) + '</option>').join('') + '</select>';
      const ns = (id, lbl) => { let o = ''; for (let n = 1; n <= 10; n++) o += '<option value="' + n + '"' + (n === (id === 'ruleAn' ? 5 : 10) ? ' selected' : '') + '>to ' + n + '</option>'; return '<select id="' + id + '" aria-label="' + lbl + '">' + o + '</select>'; };
      return ps('ruleA', false) + ns('ruleAn', 'First path node') + ps('ruleB', true) + ns('ruleBn', 'Then path node');
    }
    return '';
  }
  function buildRules() {
    const R = S.rules;
    $('rulesOn').checked = !!R.on;
    $('rulesTick').value = R.tick;
    const rs = $('rulesReserve');
    if (!rs.options.length) rs.innerHTML = C.RESERVES.map(v => '<option value="' + v + '">' + (v ? 'Keep ' + v + '% of cash' : 'No reserve') + '</option>').join('');
    rs.value = String(C.RESERVES.indexOf(R.reserve) >= 0 ? R.reserve : 0);
    const cur = rulesList();
    let tabs = '';
    for (const id of C.RACE_IDS) {
      const on = rulesUi.scope === 'race' && rulesUi.key === id, n = (R.race[id] || []).length;
      tabs += '<button type="button" role="tab" aria-selected="' + on + '" class="' + (on ? 'on' : '') + '" data-scope="race" data-key="' + id + '" style="--rc:' + C.RACES[id].accent + '">' + esc(C.RACES[id].name) + (n ? ' <b>' + n + '</b>' : '') + '</button>';
    }
    const st = rulesUi.scope === 'pony' ? cur.t : selTower();
    if (st) {
      const on = rulesUi.scope === 'pony';
      tabs += '<button type="button" role="tab" aria-selected="' + on + '" class="pony' + (on ? ' on' : '') + '" data-scope="pony" data-key="' + st.id + '">' + esc(C.RACES[st.race].name) + ' #' + st.id + (R.pony[st.id] ? ' <b>own</b>' : '') + '</button>';
    }
    $('rulesTabs').innerHTML = tabs;
    let sc = '';
    if (rulesUi.scope === 'pony') {
      sc = cur.own ? '<span>Pony #' + cur.t.id + ' uses its own rules.</span><button type="button" class="ghost" data-rscope="race">Use ' + esc(C.RACES[cur.race].name) + ' rules again</button>'
        : '<span>Pony #' + cur.t.id + ' follows the ' + esc(C.RACES[cur.race].name) + ' rules below.</span><button type="button" class="ghost" data-rscope="own">Give it its own rules</button>';
    } else {
      const cnt = S.towers.filter(t => t.race === rulesUi.key && !R.pony[t.id]).length;
      sc = '<span>Applies to ' + cnt + ' ' + esc(C.RACES[rulesUi.key].name) + (cnt === 1 ? ' pony' : ' ponies') + ' on this map without their own rules.</span>';
    }
    $('rulesScope').innerHTML = sc;
    const ro = rulesUi.scope === 'pony' && !cur.own;
    let li = '';
    cur.list.forEach((r, i) => {
      li += '<li data-i="' + i + '"><span class="rn">' + (i + 1) + '</span><span class="rt">' + esc(C.ruleText(r, cur.race)) + '</span>' + (ro ? '' :
        '<span class="rbtns"><button type="button" class="sq small" data-mv="-1" aria-label="Move rule up"' + (i ? '' : ' disabled') + '>&#9650;</button><button type="button" class="sq small" data-mv="1" aria-label="Move rule down"' + (i < cur.list.length - 1 ? '' : ' disabled') + '>&#9660;</button><button type="button" class="sq small del" data-del aria-label="Delete rule">&#10005;</button></span>') + '</li>';
    });
    if (!cur.list.length) li = '<li class="empty">No rules yet. Add one below, for example Buy Damage when affordable.</li>';
    $('rulesList').innerHTML = li;
    $('ruleKind').value = rulesUi.kind;
    $('ruleArgs').innerHTML = ruleArgsHtml(cur.race);
    const full = cur.list.length >= C.RULE_MAX;
    $('ruleAdd').disabled = ro || full;
    $('ruleKind').disabled = ro;
    $('ruleAdd').textContent = full ? 'Rule list full (' + C.RULE_MAX + ')' : 'Add rule';
    ui.rulesKey = '';
  }
  function readRule() {
    const k = rulesUi.kind, v = id => $(id) ? +$(id).value : 0;
    if (k === 'dmg' || k === 'rate') return { k, to: v('ruleTo') };
    if (k === 'path') return { k, a: v('ruleA'), an: v('ruleAn'), b: v('ruleB'), bn: v('ruleBn') };
    return { k: 'cheap' };
  }
  function addRule(r) {
    const cur = rulesList();
    if (rulesUi.scope === 'pony' && !cur.own) return false;
    if (cur.list.length >= C.RULE_MAX) return false;
    commitRules(cur.list.concat([r || readRule()]));
    A.play('click');
    return true;
  }
  function openRules(scope, key) {
    if (S.chal) return chalDeny('Upgrade rules');
    lastFocus = document.activeElement;
    if (scope === 'pony' && S.towers.some(t => t.id === key)) { rulesUi.scope = 'pony'; rulesUi.key = key; }
    else if (scope === 'race' && C.RACES[key]) { rulesUi.scope = 'race'; rulesUi.key = key; }
    buildRules();
    $('rulesModal').hidden = false;
    $('rulesClose').focus();
  }
  function closeRules() {
    if ($('rulesModal').hidden) return;
    $('rulesModal').hidden = true;
    hideTip();
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  $('rulesBtn').addEventListener('click', () => openRules());
  $('rulesClose').addEventListener('click', closeRules);
  $('rulesOn').addEventListener('change', ev => {
    S.rules.on = ev.target.checked;
    ui.rulesKey = '';
    if (S.rules.on) { const r = C.runRules(S, 'end'); if (r.count) banner('Rules bought ' + r.count + ' upgrade' + (r.count > 1 ? 's' : '') + ' for ' + C.fmt(r.spent), 'good'); }
    dirty(); writeSave();
  });
  $('rulesTick').addEventListener('change', ev => { S.rules.tick = ev.target.value; writeSave(); });
  $('rulesReserve').addEventListener('change', ev => { S.rules.reserve = +ev.target.value || 0; writeSave(); });
  $('ruleKind').addEventListener('change', ev => { rulesUi.kind = ev.target.value; $('ruleArgs').innerHTML = ruleArgsHtml(rulesList().race); });
  $('ruleAdd').addEventListener('click', () => addRule());
  $('rulesModal').addEventListener('click', ev => {
    if (ev.target === $('rulesModal')) { closeRules(); return; }
    const tb = ev.target.closest('[data-scope]');
    if (tb) { rulesUi.scope = tb.dataset.scope; rulesUi.key = tb.dataset.scope === 'pony' ? +tb.dataset.key : tb.dataset.key; buildRules(); return; }
    const rs = ev.target.closest('[data-rscope]');
    if (rs) {
      const cur = rulesList();
      if (rs.dataset.rscope === 'own') C.setRules(S, 'pony', cur.t.id, (S.rules.race[cur.race] || []).slice());
      else C.setRules(S, 'pony', cur.t.id, null);
      buildRules(); ui.infoKey = ''; writeSave();
      return;
    }
    const li = ev.target.closest('li[data-i]');
    if (!li) return;
    const i = +li.dataset.i, cur = rulesList(), list = cur.list.slice();
    const mv = ev.target.closest('[data-mv]');
    if (mv && !mv.disabled) {
      const j = i + (+mv.dataset.mv);
      if (j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]];
      commitRules(list);
      const btn = $('rulesList').querySelector('li[data-i="' + j + '"] [data-mv="' + mv.dataset.mv + '"]');
      if (btn && !btn.disabled) btn.focus();
      return;
    }
    if (ev.target.closest('[data-del]')) { list.splice(i, 1); commitRules(list); }
  });
  function refreshRulesBtn() {
    const R = S.rules;
    let n = 0;
    for (const id in R.race) n += R.race[id].length;
    for (const id in R.pony) n += R.pony[id].length;
    const slots = C.slotsOf(S).filter(Boolean).length;
    const k = R.on + '|' + n + '|' + slots + '|' + C.slotCount(S);
    if (k === ui.rulesKey) return;
    ui.rulesKey = k;
    const rs = $('rulesState');
    rs.textContent = R.on ? 'on · ' + n : (n ? 'off · ' + n : 'off');
    rs.classList.toggle('on', !!R.on);
    $('plansState').textContent = slots + '/' + C.slotCount(S);
  }

  const plansUi = { arm: '', armT: 0 };
  function slotWhen(at) {
    if (!at) return '';
    const d = new Date(at);
    return isNaN(d) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  function buildPlans() {
    const list = C.slotsOf(S), n = C.slotCount(S);
    const armed = plansUi.armT > performance.now() ? plansUi.arm : '';
    let h = '';
    for (let i = 0; i < C.SLOT_MAX; i++) {
      const sl = list[i];
      if (i >= n) { h += '<article class="pslot locked"><div class="psh"><span class="psn">Slot ' + (i + 1) + '</span><span class="hint">Locked</span></div><p class="hint">Research Muster Plans to open ' + C.SLOT_BONUS + ' more slots.</p></article>'; continue; }
      if (!sl) {
        h += '<article class="pslot empty" data-slot="' + i + '"><div class="psh"><span class="psn">Slot ' + (i + 1) + '</span><span class="hint">Empty</span></div>'
          + '<div class="psrow"><input type="text" maxlength="24" class="psname" data-name="' + i + '" placeholder="Plan ' + (i + 1) + '" aria-label="Name for slot ' + (i + 1) + '">'
          + '<button type="button" class="primary pssave" data-save="' + i + '"' + (S.towers.length ? '' : ' disabled') + '>Save board</button></div></article>';
        continue;
      }
      const races = {};
      for (const t of sl.towers) races[t.race] = (races[t.race] || 0) + 1;
      const mix = C.RACE_IDS.filter(r => races[r]).map(r => '<span class="pmix" style="--rc:' + C.RACES[r].accent + '">' + races[r] + ' ' + esc(C.RACES[r].name) + '</span>').join('');
      const ow = armed === 'save' + i, del = armed === 'del' + i, building = S.build && S.build.slot === i;
      h += '<article class="pslot' + (building ? ' on' : '') + '" data-slot="' + i + '"><div class="psh"><input type="text" maxlength="24" class="psname" data-name="' + i + '" value="' + esc(sl.name) + '" aria-label="Rename slot ' + (i + 1) + '"><span class="psc">' + C.fmt(sl.cost) + '</span></div>'
        + '<div class="pmixes">' + mix + '</div>'
        + '<div class="hint">' + sl.towers.length + (sl.towers.length === 1 ? ' pony' : ' ponies') + (sl.hero ? ' · hero ' + esc(C.HEROES[sl.hero.id].name) : '') + ' · saved at best wave ' + sl.cleared + (sl.at ? ' · ' + slotWhen(sl.at) : '') + '</div>'
        + '<div class="psrow"><button type="button" class="primary psload" data-load="' + i + '">' + (building ? 'Rebuilding...' : 'Restore') + '</button>'
        + '<button type="button" class="ghost' + (ow ? ' armed' : '') + '" data-save="' + i + '"' + (S.towers.length ? '' : ' disabled') + '>' + (ow ? 'Tap to overwrite' : 'Save over') + '</button>'
        + '<button type="button" class="ghost danger' + (del ? ' armed' : '') + '" data-del="' + i + '">' + (del ? 'Tap to delete' : 'Delete') + '</button></div></article>';
    }
    $('plansList').innerHTML = h;
    $('plansBuild').innerHTML = buildBoxHtml();
    ui.plansKey = plansKey();
  }
  function plansKey() { const p = C.buildProgress(S); return C.slotsOf(S).map(s => s ? s.name + s.at : '-').join() + '|' + C.slotCount(S) + '|' + S.towers.length + '|' + (p ? p.done + '/' + p.total : '') + '|' + (plansUi.armT > performance.now() ? plansUi.arm : ''); }
  function buildBoxHtml() {
    const p = C.buildProgress(S);
    if (!p) return '';
    return '<div class="buildbox"><div class="bbhead"><span>Rebuilding ' + esc(p.name) + '</span><span>' + Math.round(p.pct * 100) + '%</span></div><div class="bbar"><i style="width:' + (p.pct * 100).toFixed(1) + '%"></i></div>'
      + '<div class="bbfoot"><span class="hint">' + p.placed + ' / ' + p.towers + ' ponies placed' + (p.skipped ? ', ' + p.skipped + ' blocked' : '') + (p.next ? ' · next ' + C.fmt(p.next) : '') + '</span><button type="button" class="ghost" data-cancel>Stop</button></div></div>';
  }
  function openPlans() {
    if (S.chal) return chalDeny('Muster plans');
    lastFocus = document.activeElement;
    buildPlans();
    $('plansModal').hidden = false;
    $('plansClose').focus();
  }
  function closePlans() {
    if ($('plansModal').hidden) return;
    $('plansModal').hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function planName(i) { const el = $('plansList').querySelector('[data-name="' + i + '"]'); return el ? el.value : ''; }
  function doSavePlan(i, name, force) {
    const exists = !!C.slotsOf(S)[i];
    if (exists && !force && !(plansUi.arm === 'save' + i && plansUi.armT > performance.now())) { plansUi.arm = 'save' + i; plansUi.armT = performance.now() + 2500; buildPlans(); return null; }
    plansUi.arm = '';
    const sl = C.savePreset(S, i, name, Date.now());
    if (!sl) { A.play('deny'); banner('Place some ponies before saving a plan', 'bad'); return null; }
    A.play('research');
    banner('Saved plan "' + sl.name + '" with ' + sl.towers.length + ' ponies', 'good');
    ui.rulesKey = ''; ui.waveKey = '';
    refreshRulesBtn();
    writeSave();
    if (!$('plansModal').hidden) buildPlans();
    return sl;
  }
  function doLoadPlan(i) {
    const B = C.loadPreset(S, i);
    if (!B && !C.slotsOf(S)[i]) { A.play('deny'); return null; }
    A.play('place');
    const p = C.buildProgress(S);
    banner(p ? 'Restoring "' + p.name + '": ' + Math.round(p.pct * 100) + '% done, the rest buys itself as cash comes in' : 'Plan restored', 'good');
    dirty(); writeSave();
    if (!$('plansModal').hidden) buildPlans();
    return p || true;
  }
  function doDeletePlan(i) {
    if (!(plansUi.arm === 'del' + i && plansUi.armT > performance.now())) { plansUi.arm = 'del' + i; plansUi.armT = performance.now() + 2500; buildPlans(); return false; }
    plansUi.arm = '';
    C.deletePreset(S, i);
    ui.rulesKey = ''; ui.waveKey = '';
    writeSave(); buildPlans();
    return true;
  }
  function stopBuild() {
    if (!C.cancelBuild(S)) return;
    banner('Plan rebuild stopped', '');
    dirty(); writeSave();
    if (!$('plansModal').hidden) buildPlans();
  }
  $('plansBtn').addEventListener('click', openPlans);
  $('plansClose').addEventListener('click', closePlans);
  $('buildCancel').addEventListener('click', stopBuild);
  $('hBuildChip').addEventListener('click', openPlans);
  $('plansModal').addEventListener('click', ev => {
    if (ev.target === $('plansModal')) { closePlans(); return; }
    const b = ev.target.closest('button');
    if (!b || b.disabled) return;
    if (b.hasAttribute('data-cancel')) { stopBuild(); return; }
    if (b.dataset.save != null) { doSavePlan(+b.dataset.save, planName(+b.dataset.save)); return; }
    if (b.dataset.load != null) { doLoadPlan(+b.dataset.load); return; }
    if (b.dataset.del != null) doDeletePlan(+b.dataset.del);
  });
  $('plansModal').addEventListener('change', ev => {
    const el = ev.target.closest('[data-name]');
    if (!el) return;
    const i = +el.dataset.name;
    if (C.slotsOf(S)[i] && C.renamePreset(S, i, el.value)) { writeSave(); el.value = C.slotsOf(S)[i].name; }
  });
  $('plansModal').addEventListener('keydown', ev => {
    const el = ev.target.closest && ev.target.closest('[data-name]');
    if (el && ev.key === 'Enter') { ev.preventDefault(); const i = +el.dataset.name; if (!C.slotsOf(S)[i]) doSavePlan(i, el.value); else el.blur(); }
  });
  function latestSlot() {
    let best = -1, at = -1;
    C.slotsOf(S).forEach((s, i) => { if (s && i < C.slotCount(S) && s.at >= at) { at = s.at; best = i; } });
    return best;
  }
  function refreshBuildBox() {
    const p = C.buildProgress(S);
    const box = $('buildBox'), chip = $('hBuildChip');
    box.hidden = !p; chip.hidden = !p;
    if (p) {
      const pct = Math.round(p.pct * 100) + '%';
      $('buildName').textContent = 'Rebuilding ' + p.name;
      $('buildPct').textContent = pct;
      $('buildBar').style.width = (p.pct * 100).toFixed(1) + '%';
      box.querySelector('.bbar').setAttribute('aria-valuenow', Math.round(p.pct * 100));
      $('buildNext').textContent = p.placed + '/' + p.towers + ' placed' + (p.next ? ' · next ' + C.fmt(p.next) : '');
      $('hBuild').textContent = pct;
    }
    if (!$('plansModal').hidden && plansKey() !== ui.plansKey) buildPlans();
  }

  let idleT = 0;
  function idleTick(now) {
    if (ui.paused || ui.away || now - idleT < 1000) return;
    idleT = now;
    let changed = false;
    if (S.build) { if (C.buildStep(S)) changed = true; }
    if (S.rules.on) { const r = C.runRules(S, 'sec'); if (r.count) changed = true; }
    if (changed) { ui.infoKey = ''; ui.buildKey = ''; }
  }
  function waveEndIdle(e) {
    const fr = C.farmResult(S, e);
    if (fr && !fr.stop) {
      ui.autoNext = 0;
      S.sel = fr.next;
      ui.farmNext = performance.now() + (fr.retry ? 2200 : 1600);
      if (fr.retry) banner('Wave ' + e.n + ' lost. Auto-farm retries once.', 'bad');
    }
    if (S.build) C.buildStep(S);
    const r = C.runRules(S, 'end');
    if (r.count) setTimeout(() => banner('Rules bought ' + r.count + ' upgrade' + (r.count > 1 ? 's' : '') + ' for ' + C.fmt(r.spent), 'good'), 1400);
    ui.farmKey = '';
  }

  function handleEvents() {
    const P = prof();
    if (!S.events.length && (P === S || !P.events.length)) return;
    const evs = S.events.splice(0);
    if (P !== S) for (const e of P.events.splice(0)) evs.push(e);
    let ended = null;
    for (const e of evs) {
      if (e.type === 'chalStart') { ui.waveKey = ''; continue; }
      if (e.type === 'chalEnd') { ended = e; continue; }
      if (e.type === 'ach') { achToast(e); continue; }
      if (e.type === 'achRetro') { banner(e.n + ' achievement' + (e.n > 1 ? 's' : '') + ' unlocked from your past progress', 'good'); $('achBtn').classList.add('pulse'); continue; }
      if (S.chal && (e.type === 'won' || e.type === 'lost')) {
        const c = S.chal, total = c.to - c.from + 1;
        if (e.type === 'won') {
          A.play('win');
          if (!c.over) banner('Wave ' + (e.n - c.from + 1) + ' of ' + total + ' held! +' + C.fmt(e.bonus + e.earned) + ' cash', 'good');
          if (S.auto && !c.over) ui.autoNext = performance.now() + 1600;
          S.sel = Math.min(c.to, S.cleared + 1);
          C.runRules(S, 'end');
        } else { A.play('lose'); ui.autoNext = 0; }
        ui.waveKey = ''; ui.infoKey = '';
        continue;
      }
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
        waveEndIdle(e);
        writeSave();
      } else if (e.type === 'lost') {
        A.play('lose');
        banner('Wave ' + e.n + ' lost. Ponies and cash kept, try again', 'bad');
        ui.autoNext = 0;
        if (S.auto) { S.auto = false; }
        waveEndIdle(e);
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
      else if (e.type === 'farmStop') { ui.farmNext = 0; setTimeout(() => banner('Auto-farm stopped: wave ' + e.n + ' lost twice, dropped back to wave ' + e.drop, 'bad'), 1500); }
      else if (e.type === 'buildDone') { A.play('upgrade'); banner('Plan "' + e.name + '" fully rebuilt', 'good'); writeSave(); }
      else if (e.type === 'rules' || e.type === 'buildBuy' || e.type === 'offline' || e.type === 'farm' || e.type === 'buildStart' || e.type === 'slotSaved') { ui.farmKey = ''; ui.rulesKey = ''; ui.infoKey = ''; ui.buildKey = ''; continue; }
      ui.waveKey = ''; ui.infoKey = '';
    }
    if (ended) {
      leaveChal();
      A.play(ended.result === 'won' ? 'unlocked' : ended.result === 'lost' ? 'lose' : 'click');
      showChalEnd(ended);
      if (ended.reward && ended.reward.length) $('researchBtn').classList.add('pulse');
    }
  }

  const CHAL_MSG = { race: 'That race sits this challenge out', cap: 'This challenge allows only a few ponies', over: 'The challenge is over' };
  const chalUi = { endT: 0, quitArm: 0, last: null, achTab: 'all', toasts: [], toastT: 0, cardKey: '', owlT: 0 };
  function inChal() { return !!S.chal; }
  function chalDeny(what) { A.play('deny'); banner(what + ' is not available during a challenge', 'bad'); return false; }
  function diffStars(d) { return '★'.repeat(d) + '☆'.repeat(Math.max(0, 5 - d)); }
  function fmtTime(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
    if (h) return h + 'h ' + (m < 10 ? '0' : '') + m + 'm';
    if (m) return m + 'm ' + (s < 10 ? '0' : '') + s + 's';
    return s + 's';
  }
  function modsHtml(def) { return def.mods.map(m => '<span class="mod" data-tip="' + esc(C.modDesc(m, def)) + '">' + esc(C.modText(m, def)) + '</span>').join(''); }
  function rulesHtml(def) {
    const L = def.mods.map(m => '<li><b>' + esc(C.modText(m, def)) + ':</b> ' + esc(C.modDesc(m, def)) + '</li>');
    L.push('<li>' + def.lives + ' li' + (def.lives === 1 ? 'fe' : 'ves') + ' for the whole run.</li>');
    return L.join('');
  }
  function buildChal() {
    const P = prof(), info = C.chalInfo(P, Date.now()), d = info.daily, dd = d.def, map = C.MAPS[dd.map];
    const box = $('dailyCard');
    box.className = 'dailycard' + (d.won ? ' won' : '');
    box.innerHTML = '<div><div class="dtitle">Daily challenge &middot; ' + esc(d.label) + '</div><div class="dsub">' + esc(map.name) + ' &middot; waves ' + dd.from + '-' + dd.to + ' &middot; ' + dd.lives + ' lives</div></div>'
      + '<span class="cdiff" data-tip="Difficulty">' + diffStars(dd.diff) + '</span>'
      + '<div class="dmods">' + dd.mods.map(m => '<div><b>' + esc(C.modText(m, dd)) + '</b> ' + esc(C.modDesc(m, dd)) + '</div>').join('') + '</div>'
      + '<div class="dstats"><span>Today\'s best <b id="dailyBest">' + (d.best ? C.fmt(d.best) : '-') + '</b></span><span>Runs <b>' + d.runs + '</b></span><span>Streak <b id="dailyStreak">' + d.streak + '</b></span><span>Best streak <b>' + d.bestStreak + '</b></span><span>Reward <b>' + (d.won ? 'claimed' : d.moon + ' Moonstones') + '</b></span></div>'
      + '<p class="hint" style="grid-column:1/-1;margin:0">Score: 1,000 per wave held. A win adds 5,000, 100 per life left and a bonus for speed. The Moonstones are paid once per day, more for a longer streak. A new daily starts at midnight UTC.</p>'
      + '<button class="primary" type="button" data-chal="daily">' + (d.won ? 'Play again for score' : d.runs ? 'Try again' : 'Start the daily') + '</button>';
    const list = $('chalList');
    list.innerHTML = '';
    for (const it of info.perm) {
      const c = it.def, el = document.createElement('div');
      el.className = 'ccard' + (it.done ? ' done' : '');
      el.dataset.id = c.id;
      el.innerHTML = '<div class="ct"><span>' + esc(c.name) + '</span><span class="cdiff" data-tip="Difficulty ' + c.diff + ' of 5">' + diffStars(c.diff) + '</span></div>'
        + '<div class="cw">' + esc(C.MAPS[c.map].name) + ' &middot; waves ' + c.from + '-' + c.to + '</div>'
        + '<div class="cb">' + esc(c.blurb) + '</div>'
        + '<ul class="crules">' + rulesHtml(c) + '</ul>'
        + '<div class="crew">Reward: <b>' + esc(it.reward) + '</b></div>'
        + '<div class="cstate">' + (it.done ? 'Completed' + (it.best ? ' &middot; best ' + C.fmt(it.best) : '') : it.best ? 'Not yet won &middot; best ' + C.fmt(it.best) : 'Not yet won') + '</div>'
        + '<button class="primary" type="button" data-chal="' + c.id + '">' + (it.done ? 'Play again' : 'Start') + '</button>';
      list.appendChild(el);
    }
  }
  function openChal() {
    if (inChal()) { A.play('deny'); banner('Finish or quit this challenge first', 'bad'); return false; }
    lastFocus = document.activeElement;
    $('chalBtn').classList.remove('pulse');
    buildChal();
    $('chalModal').hidden = false;
    $('chalClose').focus();
    return true;
  }
  function closeChal() {
    if ($('chalModal').hidden) return;
    $('chalModal').hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function enterBoard(X) {
    S = X;
    ui.selId = 0; ui.placing = null; ui.ghost = null; ui.ghostTouch = false; ui.autoNext = 0; ui.farmNext = 0; ui.paused = false; ui.heroSel = false;
    ui.heroKey = ''; ui.heroBarKey = ''; ui.heroListKey = ''; chalUi.cardKey = ''; chalUi.quitArm = 0;
    document.body.classList.toggle('inchal', !!S.chal);
    updateHint();
    R.bgKey = ''; resize();
    dirty();
    refreshHud(); refreshBuild(); refreshWave(); refreshInfo(); refreshRulesBtn(); refreshChalCard();
  }
  function startChal(id) {
    const P = prof();
    if (inChal()) return null;
    if (P.run) { A.play('deny'); banner('Finish the current wave before starting a challenge', 'bad'); return null; }
    const X = C.startChallenge(P, id, Date.now());
    if (!X) return null;
    writeSave();
    closeChal();
    enterBoard(X);
    A.play('unlocked');
    banner(X.chal.def.name + ': ' + C.fmt(X.cash) + ' cash, ' + X.chal.lives + ' lives. Good luck!', 'good');
    return X;
  }
  function quitChal(force) {
    if (!inChal()) return null;
    if (!force && chalUi.quitArm < performance.now()) { chalUi.quitArm = performance.now() + 2500; chalUi.cardKey = ''; return null; }
    chalUi.quitArm = 0;
    const r = C.quitChallenge(S);
    handleEvents();
    return r;
  }
  function leaveChal() {
    if (!S.chal) return;
    const P = S.chal.parent;
    enterBoard(P);
    writeSave();
  }
  function chalEndHtml(e) {
    const word = e.result === 'won' ? 'Victory' : e.result === 'lost' ? 'Defeated' : 'Run abandoned';
    let h = '<div class="cres ' + e.result + '">' + word + '</div><p>' + esc(e.name) + '</p>';
    h += '<div class="cgrid"><div>Waves held<b>' + e.waves + '/' + e.total + '</b></div><div>Lives left<b>' + e.lives + '</b></div><div>Time<b>' + fmtTime(e.t) + '</b></div><div>Score<b id="chalScore">' + C.fmt(e.score) + '</b></div></div>';
    if (e.best) h += '<p class="hint">New best score' + (e.kind === 'daily' ? ' for today' : '') + '.</p>';
    if (e.kind === 'daily' && e.streak) h += '<p class="hint">Daily streak: ' + e.streak + ' day' + (e.streak > 1 ? 's' : '') + '.</p>';
    if (e.reward && e.reward.length) h += '<div class="creward" id="chalReward">Reward: ' + esc(e.reward.join(', ')) + '</div>';
    else if (e.result === 'won') h += '<p class="hint">' + (e.kind === 'daily' ? 'Today\'s Moonstones were already claimed.' : 'The reward for this challenge was already claimed.') + '</p>';
    h += '<p class="hint">Your maps are exactly as you left them.</p>';
    return h;
  }
  function showChalEnd(e) {
    chalUi.last = e;
    $('chalEndTitle').textContent = e.kind === 'daily' ? 'Daily challenge' : 'Challenge';
    $('chalEndBody').innerHTML = chalEndHtml(e);
    $('chalEndAgain').hidden = e.kind !== 'daily' && e.result === 'won';
    $('chalEndModal').hidden = false;
    $('chalEndOk').focus();
  }
  function closeChalEnd(again) {
    if ($('chalEndModal').hidden) return;
    $('chalEndModal').hidden = true;
    const e = chalUi.last;
    if (again && e) startChal(e.kind === 'daily' ? 'daily' : e.id);
  }
  function refreshChalCard() {
    const card = $('chalCard'), c = S.chal;
    if (!c) { if (!card.hidden) card.hidden = true; return; }
    card.hidden = false;
    const total = c.to - c.from + 1, lives = S.run ? Math.max(0, S.run.lives) : c.lives;
    const t = c.t + (S.run ? S.run.t : 0), armed = chalUi.quitArm > performance.now();
    const key = c.id + '|' + c.waves + '|' + lives + '|' + Math.floor(t) + '|' + armed + '|' + !!c.over;
    if (key === chalUi.cardKey) return;
    chalUi.cardKey = key;
    $('chalName').textContent = c.def.name;
    $('chalDiff').textContent = diffStars(c.def.diff);
    const mh = modsHtml(c.def);
    if ($('chalMods').innerHTML !== mh) $('chalMods').innerHTML = mh;
    $('chalProg').textContent = 'Wave ' + c.waves + '/' + total;
    $('chalLives').textContent = 'Lives ' + lives + '/' + c.livesMax;
    $('chalTime').textContent = fmtTime(t);
    $('chalBar').style.width = Math.round(c.waves / total * 100) + '%';
    const q = $('chalQuit');
    q.textContent = armed ? 'Tap again to quit' : 'Quit challenge';
    q.classList.toggle('armed', armed);
  }
  $('chalBtn').addEventListener('click', openChal);
  $('chalClose').addEventListener('click', closeChal);
  $('chalModal').addEventListener('click', ev => {
    if (ev.target === $('chalModal')) { closeChal(); return; }
    const b = ev.target.closest('[data-chal]');
    if (b) startChal(b.dataset.chal);
  });
  $('chalQuit').addEventListener('click', () => quitChal(false));
  $('chalEndOk').addEventListener('click', () => closeChalEnd(false));
  $('chalEndAgain').addEventListener('click', () => closeChalEnd(true));

  function achToast(e) {
    chalUi.toasts.push(e);
    if (!chalUi.toastT) nextToast();
  }
  function nextToast() {
    const el = $('achToast');
    const e = chalUi.toasts.shift();
    if (!e) { el.className = 'achtoast'; chalUi.toastT = 0; return; }
    el.innerHTML = '<div class="tk">Achievement unlocked</div><div class="tn"></div><div class="td"></div><div class="tb"></div>';
    el.querySelector('.tn').textContent = e.name;
    el.querySelector('.td').textContent = e.desc;
    el.querySelector('.tb').textContent = e.bonus;
    el.className = 'achtoast show';
    A.play('ach');
    $('achBtn').classList.add('pulse');
    chalUi.toastT = setTimeout(() => { el.className = 'achtoast'; chalUi.toastT = setTimeout(nextToast, 350); }, 3200);
  }
  function achValText(a) {
    if (a.goal <= 1) return a.done ? 'Done' : 'Not yet';
    return C.fmt(Math.floor(a.val)) + ' / ' + C.fmt(a.goal);
  }
  function buildAch() {
    const P = prof(), list = C.achList(S), done = list.filter(a => a.done).length;
    $('achCount').textContent = done + ' / ' + list.length;
    const bt = C.BONUS_KEYS.filter(k => P.bonus && P.bonus[k] > 0).map(k => '+' + C.pctText(P.bonus[k]) + ' ' + C.BONUS_NAMES[k]);
    $('achBonus').textContent = 'Every achievement gives a small permanent bonus that works on every map and in challenges. ' + (bt.length ? 'Current total: ' + bt.join(', ') + '.' : 'No bonuses yet.');
    const tabs = [{ id: 'all', name: 'All' }].concat(C.ACH_CATS);
    $('achTabs').innerHTML = tabs.map(t => {
      const L = t.id === 'all' ? list : list.filter(a => a.cat === t.id);
      return '<button type="button" role="tab" data-acat="' + t.id + '" class="' + (chalUi.achTab === t.id ? 'on' : '') + '" aria-selected="' + (chalUi.achTab === t.id) + '">' + esc(t.name) + ' <b>' + L.filter(a => a.done).length + '/' + L.length + '</b></button>';
    }).join('');
    const catName = {};
    for (const c of C.ACH_CATS) catName[c.id] = c.name;
    const show = chalUi.achTab === 'all' ? list : list.filter(a => a.cat === chalUi.achTab);
    $('achList').innerHTML = show.map(a => '<div class="arow' + (a.done ? ' done' : '') + (a.hidden ? ' secret' : '') + '" data-ach="' + a.id + '">'
      + '<span class="an">' + (a.hidden ? '???' : esc(a.name)) + '</span><span class="ac">' + esc(catName[a.cat]) + '</span>'
      + '<span class="ad">' + (a.hidden ? 'A secret achievement. Keep playing to find it.' : esc(a.desc)) + '</span>'
      + '<span class="ab">' + esc(a.bonus) + '</span>'
      + '<span class="abar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(a.pct * 100) + '"><i style="width:' + Math.round(a.pct * 100) + '%"></i></span>'
      + '<span class="av">' + (a.hidden ? '' : achValText(a)) + '</span></div>').join('');
  }
  function openAch() {
    lastFocus = document.activeElement;
    $('achBtn').classList.remove('pulse');
    buildAch();
    $('achModal').hidden = false;
    $('achClose').focus();
  }
  function closeAch() {
    if ($('achModal').hidden) return;
    $('achModal').hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  $('achBtn').addEventListener('click', openAch);
  $('achClose').addEventListener('click', closeAch);
  $('achModal').addEventListener('click', ev => {
    if (ev.target === $('achModal')) { closeAch(); return; }
    const b = ev.target.closest('[data-acat]');
    if (b) { chalUi.achTab = b.dataset.acat; buildAch(); }
  });

  const wardUi = { tab: 'skin', race: 'earth', raf: 0, tryOn: null, key: '' };
  const SEASON_NAMES = { autumn: 'Autumn', winter: 'Winter', spring: 'Spring Bloom', festival: 'Festival Lanterns' };
  function cosSwatch(it) {
    if (it.slot === 'coat') return it.spots ? 'radial-gradient(circle at 30% 35%,' + it.spots + ' 0 18%,transparent 20%),radial-gradient(circle at 70% 65%,' + it.spots + ' 0 14%,transparent 16%),' + it.body : it.body;
    if (it.slot === 'mane') return it.rainbow ? 'linear-gradient(135deg,#ff6b6b,#ffd24a,#7fd66a,#4fd1c5,#8b5cf6)' : it.streak ? 'linear-gradient(135deg,' + it.mane + ' 0 55%,' + it.streak + ' 55% 70%,' + it.mane + ' 70%)' : it.mane;
    if (it.slot === 'aura' && it.aura === 'rainbow') return 'conic-gradient(#ff6b6b,#ffd24a,#7fd66a,#4fd1c5,#8b5cf6,#ff6b6b)';
    return it.col || '#888';
  }
  function wardLook() {
    const base = C.lookOf(S, wardUi.race);
    if (!wardUi.tryOn) return base;
    const L = Object.assign({}, base);
    if (wardUi.tryOn.id) L[wardUi.tryOn.slot] = C.COS_BY_ID[wardUi.tryOn.id]; else delete L[wardUi.tryOn.slot];
    return L;
  }
  function wardSkinHtml() {
    const race = wardUi.race, cur = (C.cosOf(S).skin[race]) || {}, fresh = C.cosNew(S);
    let h = '<div class="rtabs wraces" role="tablist">';
    for (const r of C.RACE_IDS) h += '<button type="button" role="tab" data-wrace="' + r + '" class="' + (r === race ? 'on' : '') + '" aria-selected="' + (r === race) + '">' + esc(C.RACES[r].name.replace(' Pony', '')) + '</button>';
    h += '</div><div class="wlayout"><div class="wstage"><canvas id="wardPreview" width="240" height="240"></canvas><div class="wname" id="wardName">' + esc(C.RACES[race].name) + '</div><div class="wtry" id="wardTry"></div>';
    h += '<div class="wacts"><button type="button" data-wact="reset">Reset look</button><button type="button" data-wact="all">Copy to all races</button><button type="button" data-wact="random">Random owned</button></div>';
    h += '<label class="wtoggle"><input type="checkbox" id="wardNames"' + (C.cosOf(S).names ? ' checked' : '') + '> Show pony names on the board</label></div><div class="wslots">';
    for (const slot of C.COS_SLOTS) {
      const items = C.cosList(S, slot);
      const own = items.filter(x => x.owned).length;
      h += '<section class="wslot"><div class="ptitle"><span>' + C.COS_KINDS[slot] + '</span><span>' + own + ' / ' + items.length + ' owned</span></div><div class="witems">';
      h += '<button type="button" class="witem' + (!cur[slot] ? ' on' : '') + '" data-wslot="' + slot + '" data-wid=""><span class="wsw none"></span><span class="wn">None</span><span class="ws">Default</span></button>';
      for (const x of items) {
        const it = x.def, on = cur[slot] === it.id && x.owned;
        let state;
        if (on) state = 'Equipped';
        else if (x.owned) state = 'Owned';
        else if (x.cost) state = x.cost + ' Moonstones';
        else state = 'Locked';
        h += '<button type="button" class="witem' + (on ? ' on' : '') + (x.owned ? '' : ' locked') + '" data-wslot="' + slot + '" data-wid="' + it.id + '" data-tip="' + esc(it.name + '\n' + (x.owned ? 'Unlocked' : x.how)) + '">';
        h += '<span class="wsw' + (slot === 'aura' ? ' ring' : '') + '" style="background:' + cosSwatch(it) + '"></span><span class="wn">' + esc(it.name) + '</span><span class="ws">' + esc(state) + '</span>';
        if (fresh.indexOf(it.id) >= 0) h += '<i class="wnew">New</i>';
        h += '</button>';
        if (!x.owned && x.cost) h += '<button type="button" class="wbuy" data-wbuy="' + it.id + '"' + ((prof().moon | 0) < x.cost ? ' disabled' : '') + '>Buy ' + esc(it.name) + ' &middot; ' + x.cost + '</button>';
      }
      h += '</div></section>';
    }
    return h + '</div></div>';
  }
  function wardFxHtml() {
    const cos = C.cosOf(S), themes = C.COSMETICS.filter(c => c.slot === 'fx');
    let h = '<p class="hint">Effect themes restyle projectiles and impacts. They never change damage, range or timing.</p><div class="wfx">';
    for (const it of themes) {
      const own = C.cosUnlocked(S, it), on = cos.fx === it.fx;
      h += '<button type="button" class="wfxc' + (on ? ' on' : '') + (own ? '' : ' locked') + '" data-wfx="' + it.fx + '"><canvas width="160" height="70" data-fxprev="' + it.fx + '"></canvas><span class="wn">' + esc(it.name) + '</span><span class="ws">' + esc(own ? (on ? 'Active' : it.desc) : C.cosHow(it)) + '</span></button>';
      if (!own && it.un.k === 'moon') h += '<button type="button" class="wbuy" data-wbuy="' + it.id + '"' + ((prof().moon | 0) < it.un.cost ? ' disabled' : '') + '>Buy ' + esc(it.name) + ' &middot; ' + it.un.cost + '</button>';
    }
    h += '</div><div class="ptitle"><span>Per-race overrides</span><span>Optional</span></div><div class="wover">';
    for (const r of C.RACE_IDS) {
      h += '<label class="wrow"><span>' + esc(C.RACES[r].name) + '</span><select data-wfxrace="' + r + '"><option value="">Use global (' + esc(cos.fx) + ')</option>';
      for (const it of themes) h += '<option value="' + it.fx + '"' + (cos.fxRace[r] === it.fx ? ' selected' : '') + (C.cosUnlocked(S, it) ? '' : ' disabled') + '>' + esc(it.name) + (C.cosUnlocked(S, it) ? '' : ' (locked)') + '</option>';
      h += '</select></label>';
    }
    return h + '</div>';
  }
  function wardDecorHtml() {
    const auto = C.seasonFor(new Date());
    let h = '<p class="hint">Seasonal decor repaints a map\'s scenery. Auto follows the calendar; right now that is ' + esc(SEASON_NAMES[auto]) + (C.cosUnlocked(S, 'decor_' + auto) ? '' : ' (not unlocked yet)') + '.</p><div class="wseasons">';
    for (const s of C.SEASONS) {
      const it = C.COS_BY_ID['decor_' + s], own = C.cosUnlocked(S, it);
      h += '<div class="wseason' + (own ? '' : ' locked') + '"><b>' + esc(it.name) + '</b><span>' + esc(own ? it.desc : C.cosHow(it)) + '</span>';
      if (!own && it.un.k === 'moon') h += '<button type="button" class="wbuy" data-wbuy="' + it.id + '"' + ((prof().moon | 0) < it.un.cost ? ' disabled' : '') + '>Buy &middot; ' + it.un.cost + '</button>';
      h += '</div>';
    }
    h += '</div><div class="wmaps">';
    for (const id of C.MAP_IDS) {
      const m = C.MAPS[id], open = C.mapUnlocked(prof(), id), pick = C.decorPick(S, id);
      h += '<div class="wmap' + (open ? '' : ' locked') + '"><canvas width="200" height="112" data-mapprev="' + id + '"></canvas><div><b>' + esc(m.name) + '</b>';
      if (!open) h += '<span class="ws">Unlock the map first</span>';
      else {
        h += '<select data-wdecor="' + id + '" aria-label="Decor for ' + esc(m.name) + '"><option value="auto"' + (pick === 'auto' ? ' selected' : '') + '>Auto (calendar)</option><option value="none"' + (pick === 'none' ? ' selected' : '') + '>None</option>';
        for (const s of C.SEASONS) { const own = C.cosUnlocked(S, 'decor_' + s); h += '<option value="' + s + '"' + (pick === s ? ' selected' : '') + (own ? '' : ' disabled') + '>' + esc(SEASON_NAMES[s]) + (own ? '' : ' (locked)') + '</option>'; }
        h += '</select>';
      }
      h += '</div></div>';
    }
    return h + '</div>';
  }
  function buildWardrobe() {
    for (const b of document.querySelectorAll('#wardTabs [data-wtab]')) { const on = b.dataset.wtab === wardUi.tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); }
    const all = C.COSMETICS, owned = all.filter(c => C.cosUnlocked(S, c)).length;
    wardUi.key = (prof().moon | 0) + ':' + owned;
    $('wardMoon').textContent = C.fmt(prof().moon | 0) + ' Moonstones · ' + owned + ' / ' + all.length + ' cosmetics';
    const body = $('wardBody');
    const keep = body.scrollTop;
    body.innerHTML = wardUi.tab === 'fx' ? wardFxHtml() : wardUi.tab === 'decor' ? wardDecorHtml() : wardSkinHtml();
    body.scrollTop = keep;
    if (wardUi.tab === 'decor') for (const c of body.querySelectorAll('[data-mapprev]')) { const id = c.dataset.mapprev; R.drawMapPreview(c, C.MAPS[id], C.decorOf(S, id)); }
    wardDraw(performance.now());
    const fresh = C.cosNew(S);
    $('wardrobeBtn').classList.toggle('pulse', fresh.length > 0);
  }
  function wardDraw(now) {
    const body = $('wardBody');
    if (wardUi.tab === 'skin') {
      const c = $('wardPreview');
      if (c) R.ponyPreview(c, wardUi.race, now, wardLook(), { scale: 0.5, spin: true, hop: true });
      const tr = $('wardTry');
      if (tr) { const it = wardUi.tryOn && wardUi.tryOn.id && C.COS_BY_ID[wardUi.tryOn.id]; tr.textContent = it ? 'Previewing ' + it.name + (C.cosUnlocked(S, it) ? '' : ' (locked)') : ''; }
    } else if (wardUi.tab === 'fx') {
      for (const c of body.querySelectorAll('[data-fxprev]')) R.fxPreview(c, c.dataset.fxprev, now);
    }
  }
  function wardAnim(now) {
    wardUi.raf = 0;
    if ($('wardrobeModal').hidden) return;
    wardDraw(now);
    wardUi.raf = requestAnimationFrame(wardAnim);
  }
  function syncCos() {
    for (const r of C.RACE_IDS) { R.cos.looks[r] = C.lookOf(S, r); R.cos.fx[r] = C.fxThemeOf(S, r); }
    R.cos.names = C.cosOf(S).names;
    const season = C.decorOf(S, S.map);
    if (season !== R.cos.season) { R.cos.season = season; R.buildBg(cw, ch, dpr, C.mapOf(S)); }
    if (!$('wardrobeModal').hidden && wardUi.key !== (prof().moon | 0) + ':' + C.COSMETICS.filter(c => C.cosUnlocked(S, c)).length) buildWardrobe();
  }
  function cosChanged() { syncCos(); writeSave(); buildWardrobe(); ui.infoKey = ''; }
  function openWardrobe(race, tab) {
    lastFocus = document.activeElement;
    if (race && C.RACES[race]) { wardUi.race = race; wardUi.tab = 'skin'; }
    if (tab) wardUi.tab = tab;
    wardUi.tryOn = null;
    buildWardrobe();
    $('wardrobeModal').hidden = false;
    $('wardrobeClose').focus();
    if (!wardUi.raf) wardUi.raf = requestAnimationFrame(wardAnim);
  }
  function closeWardrobe() {
    if ($('wardrobeModal').hidden) return;
    C.markCosSeen(S);
    $('wardrobeBtn').classList.remove('pulse');
    $('wardrobeModal').hidden = true;
    if (wardUi.raf) { cancelAnimationFrame(wardUi.raf); wardUi.raf = 0; }
    writeSave();
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function wardBuy(id) {
    const it = C.COS_BY_ID[id];
    if (!it || !C.buyCos(S, id)) { A.play('deny'); return false; }
    A.play('unlocked');
    if (C.COS_SLOTS.indexOf(it.slot) >= 0) C.setSkin(S, wardUi.race, it.slot, id);
    else if (it.slot === 'fx') C.setFxTheme(S, it.fx);
    banner(it.name + ' unlocked', 'good');
    cosChanged();
    return true;
  }
  function wardRandom() {
    for (const slot of C.COS_SLOTS) {
      const own = C.cosList(S, slot).filter(x => x.owned);
      const pick = own.length && Math.random() < 0.85 ? own[Math.floor(Math.random() * own.length)].def.id : '';
      C.setSkin(S, wardUi.race, slot, pick);
    }
  }
  $('wardrobeBtn').addEventListener('click', () => openWardrobe());
  $('wardrobeClose').addEventListener('click', closeWardrobe);
  $('wardrobeModal').addEventListener('click', ev => {
    if (ev.target === $('wardrobeModal')) { closeWardrobe(); return; }
    const tb = ev.target.closest('[data-wtab]');
    if (tb) { wardUi.tab = tb.dataset.wtab; wardUi.tryOn = null; $('wardBody').scrollTop = 0; buildWardrobe(); return; }
    const rb = ev.target.closest('[data-wrace]');
    if (rb) { wardUi.race = rb.dataset.wrace; wardUi.tryOn = null; A.play('click'); buildWardrobe(); return; }
    const bb = ev.target.closest('[data-wbuy]');
    if (bb) { wardBuy(bb.dataset.wbuy); return; }
    const ab = ev.target.closest('[data-wact]');
    if (ab) {
      const a = ab.dataset.wact;
      if (a === 'reset') for (const sl of C.COS_SLOTS) C.setSkin(S, wardUi.race, sl, '');
      else if (a === 'all') { const src = C.cosOf(S).skin[wardUi.race] || {}; for (const r of C.RACE_IDS) for (const sl of C.COS_SLOTS) C.setSkin(S, r, sl, src[sl] || ''); banner('Look copied to every race', 'good'); }
      else if (a === 'random') wardRandom();
      A.play('equip'); cosChanged(); return;
    }
    const it = ev.target.closest('[data-wslot]');
    if (it) {
      const slot = it.dataset.wslot, id = it.dataset.wid;
      if (!id || C.cosUnlocked(S, id)) {
        const cur = (C.cosOf(S).skin[wardUi.race] || {})[slot];
        C.setSkin(S, wardUi.race, slot, cur === id ? '' : id);
        wardUi.tryOn = null; A.play('equip'); cosChanged();
      } else { wardUi.tryOn = { slot, id }; A.play('click'); }
      return;
    }
    const fx = ev.target.closest('[data-wfx]');
    if (fx) { if (C.setFxTheme(S, fx.dataset.wfx)) { A.play('equip'); cosChanged(); } else A.play('deny'); }
  });
  $('wardrobeModal').addEventListener('pointerover', ev => {
    const it = ev.target.closest('[data-wslot]');
    if (!it || wardUi.tab !== 'skin') return;
    wardUi.tryOn = { slot: it.dataset.wslot, id: it.dataset.wid };
  });
  $('wardrobeModal').addEventListener('pointerout', ev => {
    const it = ev.target.closest('[data-wslot]');
    if (it && !it.contains(ev.relatedTarget)) wardUi.tryOn = null;
  });
  $('wardrobeModal').addEventListener('change', ev => {
    const el = ev.target;
    if (el.id === 'wardNames') { C.cosOf(S).names = el.checked; cosChanged(); return; }
    if (el.dataset.wfxrace) { C.setFxTheme(S, el.value || null, el.dataset.wfxrace); cosChanged(); return; }
    if (el.dataset.wdecor) { if (C.setDecor(S, el.dataset.wdecor, el.value)) cosChanged(); }
  });

  function statsHtml() {
    const s = C.statsSummary(S);
    const box = (k, v, id) => '<div>' + k + '<b' + (id ? ' id="' + id + '"' : '') + '>' + v + '</b></div>';
    let h = '<h3>Overall</h3><div class="sgrid">';
    h += box('DNBs defeated', C.fmt(s.kills), 'stKills') + box('Bosses defeated', C.fmt(s.bossKills), 'stBosses') + box('Elites defeated', C.fmt(s.eliteKills));
    h += box('Cash earned', C.fmt(s.earned), 'stCash') + box('Moonstones earned', C.fmt(s.moonEarned), 'stMoon') + box('Damage dealt', C.fmt(s.dmg));
    h += box('Waves cleared', C.fmt(s.waves), 'stWaves') + box('Waves started', C.fmt(s.played)) + box('Star-ups', C.fmt(s.starUps), 'stStars');
    h += box('Upgrades bought', C.fmt(s.upgrades)) + box('Ponies sold', C.fmt(s.sold)) + box('Achievements', s.ach + ' / ' + s.achTotal);
    h += box('Playtime, active', fmtTime(s.playActive), 'stActive') + box('Playtime, offline', fmtTime(s.playOffline), 'stOffline') + box('Playtime, total', fmtTime(s.playActive + s.playOffline));
    h += box('Favourite pony', s.favPony ? esc(s.favPony.name) : '-', 'stFavPony') + box('Favourite hero', s.favHero ? esc(s.favHero.name) : '-', 'stFavHero') + box('Challenges won', s.chal + ' / ' + C.CHALLENGES.length);
    h += box('Dailies won', C.fmt(s.dailyWins)) + box('Best daily streak', s.bestStreak) + '</div>';
    h += '<h3>Kills by DNB type</h3><div class="kbars" id="stKillsBy">';
    const keys = TYPE_ORDER.filter(k => s.killsBy[k]);
    for (const k in s.killsBy) if (keys.indexOf(k) < 0) keys.push(k);
    const top = Math.max(1, ...keys.map(k => s.killsBy[k]));
    if (!keys.length) h += '<p class="hint">No DNBs defeated yet.</p>';
    for (const k of keys) {
      const nm = k === 'boss' ? 'Bosses' : C.ENEMIES[k] ? C.ENEMIES[k].short || C.ENEMIES[k].name : k;
      h += '<div class="kbar" style="--kc:' + (TYPE_COL[k] || 'var(--accent)') + '"><span>' + esc(nm) + '</span><span class="kb"><i style="width:' + Math.max(2, Math.round(s.killsBy[k] / top * 100)) + '%"></i></span><span>' + C.fmt(s.killsBy[k]) + '</span></div>';
    }
    h += '</div><h3>Map records</h3><div class="mwrap"><table class="mtable" id="stMaps"><thead><tr><th>Map</th><th>Best wave</th><th>Stars</th><th>Kills</th><th>Boss wins</th><th>Waves won</th><th>Waves tried</th><th>Time</th></tr></thead><tbody>';
    for (const m of s.maps) h += '<tr class="' + (m.open ? '' : 'locked') + '"><td>' + esc(m.name) + '</td><td>' + (m.open ? m.cleared : '-') + '</td><td>' + (m.stars ? m.stars + '★' : '-') + '</td><td>' + C.fmt(m.kills) + '</td><td>' + C.fmt(m.bosses) + '</td><td>' + C.fmt(m.wins) + '</td><td>' + C.fmt(m.att) + '</td><td>' + fmtTime(m.time) + '</td></tr>';
    h += '</tbody></table></div><p class="hint">Challenge runs count toward kills, cash, playtime and achievements, but never toward map records.</p>';
    return h;
  }
  function openStats() {
    lastFocus = document.activeElement;
    $('statsBody').innerHTML = statsHtml();
    $('statsModal').hidden = false;
    $('statsClose').focus();
  }
  function closeStats() {
    if ($('statsModal').hidden) return;
    $('statsModal').hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  $('statsBtn').addEventListener('click', openStats);
  $('statsClose').addEventListener('click', closeStats);
  $('statsModal').addEventListener('click', ev => { if (ev.target === $('statsModal')) closeStats(); });
  function owlCheck(now) {
    if (now - chalUi.owlT < 60000) return;
    chalUi.owlT = now;
    const h = new Date().getHours();
    if (h >= 0 && h < 4) { C.feat(S, 'x_owl'); C.checkAch(S); }
  }

  function refreshHud() {
    $('hCash').textContent = C.fmt(S.cash);
    const ch = S.chal;
    const lm = S.run ? (S.run.livesMax || C.LIVES) : ch ? ch.livesMax : C.livesFor(S);
    $('hLives').textContent = S.run ? Math.max(0, S.run.lives) + '/' + lm : ch ? ch.lives + '/' + lm : lm + '/' + lm;
    $('hMoon').textContent = C.fmt(prof().moon || 0);
    const P = prof(), achN = P.ach ? Object.keys(P.ach).length : 0;
    const as = $('achState');
    if (as.textContent !== String(achN)) as.textContent = achN;
    const st = C.starOf(S), sc = $('hStarChip');
    const sk = S.map + st;
    if (sc.dataset.k !== sk) {
      sc.dataset.k = sk;
      $('hStars').textContent = st ? st + '★' : '0';
      sc.dataset.tip = starTip(st);
      sc.classList.toggle('on', st > 0);
    }
    $('hWave').textContent = S.run ? S.run.n : S.sel;
    $('hBest').textContent = ch ? ch.waves + '/' + (ch.to - ch.from + 1) : S.cleared;
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
    if (!ui.paused && !document.hidden) C.tickPlay(S, real);
    handleEvents();
    A.drain(S.sfx);
    if (!ui.paused && ui.autoNext && now >= ui.autoNext && !S.run) {
      ui.autoNext = 0;
      if (S.auto) C.startWave(S, S.sel);
    }
    if (!ui.paused && ui.farmNext && now >= ui.farmNext && !S.run) {
      if (anyModalOpen()) ui.farmNext = now + 500;
      else {
        ui.farmNext = 0;
        if (farmOn()) { S.sel = C.farmTarget(S); C.startWave(S, S.sel); }
      }
    }
    idleTick(now);
    ui.sel = selTower();
    R.drawScene(ctx, S, ui, now, real, cw, ch, dpr);
    board.classList.toggle('bossfight', R.bossBar);
    if (now - uiT > 120) {
      uiT = now;
      refreshHud(); refreshBuild(); refreshWave(); refreshInfo(); refreshSpeed(); drawIcons(now); refreshHeroCard();
      refreshFarm(); refreshRulesBtn(); refreshBuildBox(); refreshChalCard(); owlCheck(now); syncCos();
      if (!$('heroModal').hidden) drawHeroIcons(now);
    }
    refreshHeroBar(now);
    if (now - ledT > 500) { ledT = now; refreshLedger(); }
    if (now - saveT > 10000) { saveT = now; writeSave(); }
    requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { writeSave(); return; }
    last = performance.now(); acc = 0;
    catchUp(Date.now());
  });
  syncCos();
  seenReady = true;
  catchUp(Date.now(), true);
  if (!ui.away) writeSave();
  if (farmOn() && !S.run) { S.sel = C.farmTarget(S); ui.farmNext = performance.now() + 2500; }
  window.addEventListener('pagehide', writeSave);
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const pinView = () => { if ((window.scrollY || window.scrollX) && getComputedStyle(document.body).overflowY === 'hidden') window.scrollTo(0, 0); };
  window.addEventListener('scroll', pinView, { passive: true });
  window.addEventListener('resize', pinView);
  pinView();
  $('saveNote').textContent = 'Progress saves automatically in this browser.';
  requestAnimationFrame(frame);
  window.__nd = { get S() { return S; }, ui, save: writeSave, audio: A, setSpeed, togglePause, refresh: dirty, openMaps, closeMaps, chooseMap, openCodex, closeCodex,
    openStar, closeStar, confirmStar, openResearch, closeResearch, buyResearch: tryResearch,
    forceClear(n) { if (S.run) return false; S.cleared = Math.max(S.cleared, Math.min(C.MAX_WAVE, n)); S.sel = C.topWave(S); dirty(); return true; },
    grantMoon(n) { C.grantMoon(S, n); dirty(); return S.moon; },
    claimAway, catchUp, simAway(ms) { S.lastSeen = Math.max(1, Date.now() - ms); return catchUp(Date.now()); },
    setFarming, openRules, closeRules, addRule, openPlans, closePlans, savePlan(i, name) { return doSavePlan(i, name, true); }, loadPlan: doLoadPlan, stopBuild,
    idleTick(now) { idleT = 0; idleTick(now || performance.now()); }, runRules(why) { const r = C.runRules(S, why || 'end'); dirty(); return r; },
    openHeroes, closeHeroes, pickHero: doPickHero, unlockHero: doUnlockHero, castHero: doCast, selectHero,
    moveHero(x, y) { return C.moveHero(S, x, y); }, heroInfo() { return C.heroInfo(S); }, heroXp(n) { const r = C.addHeroXp(S, n); handleEvents(); return r; },
    heroScreen() { if (!S.hero || !S.hero.id) return null; const r = cv.getBoundingClientRect(), p = V.toScreen(S.hero.x, S.hero.y - 8); return [r.left + p[0], r.top + p[1]]; },
    worldToClient(x, y) { const r = cv.getBoundingClientRect(), p = V.toScreen(x, y); return [r.left + p[0], r.top + p[1]]; },
    openChal, closeChal, startChal, quitChal(force) { return quitChal(force !== false); }, closeChalEnd, openAch, closeAch, openStats, closeStats,
    achList() { return C.achList(S); }, prof, openWardrobe, closeWardrobe, syncCos, get wardUi() { return wardUi; },
    renameTower(id, name) { const r = C.renameTower(S, id, name); ui.infoKey = ''; writeSave(); return r; }, get chalUi() { return chalUi; } };
})();
