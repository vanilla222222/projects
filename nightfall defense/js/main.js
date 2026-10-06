(function () {
  'use strict';
  const C = window.NDCore;
  const R = window.NDRender;
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
  const ui = { placing: null, ghost: null, ghostTouch: false, selId: 0, sellArm: 0, autoWait: 0, autoNext: 0, infoKey: '', waveKey: '', buildKey: '' };

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
    R.buildBg(cw, ch, dpr);
  }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(board);
  window.addEventListener('resize', resize);
  resize();

  function selTower() { return S.towers.find(t => t.id === ui.selId) || null; }

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
    h.textContent = ui.ghostTouch && ui.ghost ? 'Tap the same spot again to place the ' + name + '. Tap a button to cancel.' : 'Place the ' + name + ' anywhere off the road. Esc or right-click cancels.';
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

  cv.addEventListener('pointermove', ev => {
    if (!ui.placing || ev.pointerType === 'touch') return;
    const [x, y] = eventWorld(ev);
    ui.ghost = { x, y };
    ui.ghostTouch = false;
  });
  cv.addEventListener('pointerleave', ev => { if (ev.pointerType !== 'touch' && !ui.ghostTouch) ui.ghost = null; });
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

  function tryPlace(x, y) {
    const race = ui.placing;
    if (!C.canPlace(S, x, y)) { banner('Too close to the road or another pony', 'bad'); return; }
    const cost = C.nextTowerCost(S, race);
    if (S.cash < cost) { banner('Need ' + C.fmt(cost) + ' cash', 'bad'); return; }
    const t = C.placeTower(S, race, x, y);
    if (!t) return;
    ui.placing = null; ui.ghost = null; ui.ghostTouch = false;
    ui.selId = t.id;
    updateHint();
    ui.infoKey = ''; ui.buildKey = '';
    writeSave();
  }

  window.addEventListener('keydown', ev => {
    if (ev.target && /INPUT|TEXTAREA/.test(ev.target.tagName)) return;
    if (ev.key === 'Escape') { if (ui.placing) setPlacing(null); else { ui.selId = 0; ui.infoKey = ''; } }
    if (ev.key === '1' || ev.key === '2' || ev.key === '3') setPlacing(C.RACE_IDS[+ev.key - 1]);
    if (ev.key === ' ' && !S.run) { ev.preventDefault(); startSelected(); }
  });

  const raceIcons = {};
  function buildList() {
    const box = $('buildList');
    box.innerHTML = '';
    for (const id of C.RACE_IDS) {
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
      b.append(c, nm, cost);
      b.addEventListener('click', () => setPlacing(id));
      box.appendChild(b);
    }
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
    const key = C.RACE_IDS.map(id => C.nextTowerCost(S, id) + (S.cash >= C.nextTowerCost(S, id) ? 'y' : 'n')).join() + ui.placing;
    if (key === ui.buildKey) return;
    ui.buildKey = key;
    for (const b of $('buildList').children) {
      const id = b.dataset.race, cost = C.nextTowerCost(S, id);
      b.querySelector('.rc').textContent = C.fmt(cost);
      b.classList.toggle('on', ui.placing === id);
      b.classList.toggle('poor', S.cash < cost);
      b.title = C.RACES[id].ability + ' Owned: ' + C.owned(S, id) + '. Each extra copy costs x' + C.TUNE.towerGrowth + '.';
    }
  }

  function startSelected() {
    if (S.run) return;
    ui.autoNext = 0;
    C.startWave(S, S.sel);
  }
  $('startBtn').addEventListener('click', startSelected);
  $('wPrev').addEventListener('click', () => { if (!S.run && S.sel > 1) { S.sel--; ui.waveKey = ''; } });
  $('wNext').addEventListener('click', () => { if (!S.run && S.sel < Math.min(C.MAX_WAVE, S.cleared + 1)) { S.sel++; ui.waveKey = ''; } });
  $('wTop').addEventListener('click', () => { if (!S.run) { S.sel = Math.min(C.MAX_WAVE, S.cleared + 1); ui.waveKey = ''; } });
  $('autoBox').addEventListener('change', ev => { S.auto = ev.target.checked; ui.waveKey = ''; if (!S.auto) ui.autoNext = 0; writeSave(); });
  $('resetBtn').addEventListener('click', () => {
    if (!window.confirm('Reset all progress? Every pony, upgrade, wave and coin will be lost.')) return;
    clearSave();
    S = C.newState();
    ui.selId = 0; ui.placing = null; ui.autoNext = 0;
    ui.infoKey = ui.waveKey = ui.buildKey = '';
    banner('Progress reset', 'bad');
  });

  const TYPE_NAMES = { basic: 'Shambler', fast: 'Skitter', tanky: 'Brute', flying: 'Duskwing', magical: 'Hexling' };
  function refreshWave() {
    const top = Math.min(C.MAX_WAVE, S.cleared + 1);
    const n = S.run ? S.run.n : S.sel;
    const key = [n, S.cleared, !!S.run, S.auto, S.run ? S.run.lives : 0, S.run ? S.run.enemies.length + S.run.queue.length : 0, ui.autoNext > 0].join();
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
    const spec = C.waveSpec(n);
    const parts = [];
    for (const k of Object.keys(TYPE_NAMES)) if (spec.counts[k]) parts.push('<b>' + spec.counts[k] + '</b> ' + TYPE_NAMES[k]);
    let html = parts.join(' &middot; ');
    if (spec.boss) html += '<br><span class="boss">Boss: ' + spec.boss.name + '</span> &middot; ' + spec.boss.desc;
    if (fresh) html += '<br>First clear bonus: <b style="color:var(--gold)">+' + C.fmt(C.clearBonus(n)) + '</b>';
    if (S.run) html += '<br>In progress: <b>' + (S.run.enemies.length + S.run.queue.length) + '</b> DNBs left';
    $('wInfo').innerHTML = html;
    const sb = $('startBtn');
    sb.disabled = !!S.run;
    sb.textContent = S.run ? 'Wave ' + S.run.n + ' running' : (ui.autoNext > 0 ? 'Auto-starting Wave ' + S.sel + '...' : (fresh ? 'Start Wave ' : 'Replay Wave ') + S.sel);
    $('autoBox').checked = !!S.auto;
    $('autoHint').textContent = !S.auto
      ? 'Auto is off: a wave only starts when you press Start.'
      : (S.sel > S.cleared
        ? 'Auto is on: each time you clear a new wave, the next new wave starts by itself. A lost wave stops auto so you can rebuild.'
        : 'Auto is on: Wave ' + S.sel + ' replays on a loop for kill cash. Pick the top wave to push forward instead. A lost wave stops auto.');
  }

  function stat(k, v) { return '<div class="stat"><div class="k">' + k + '</div><div class="v">' + v + '</div></div>'; }
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  function refreshInfo() {
    const t = selTower();
    const box = $('info');
    if (!t) { if (box.innerHTML) box.innerHTML = ''; ui.infoKey = ''; return; }
    const paths = C.PATHS[t.race];
    const aff = paths.map((p, i) => S.cash >= C.nextNodeCost(t, i) ? 1 : 0).join('') + (S.cash >= C.infNext(t, 'dmg') ? 1 : 0) + (S.cash >= C.infNext(t, 'rate') ? 1 : 0);
    const key = [t.id, t.paths.join(''), t.infD, t.infR, t.mode, aff, ui.sellArm > performance.now(), (t.buff && t.buff.dmg + ',' + t.buff.rate) || ''].join('|');
    if (key === ui.infoKey) return;
    ui.infoKey = key;
    const r = C.RACES[t.race];
    const s = C.stats(t);
    const dmg = C.effDmg(t), rate = C.effRate(t);
    let h = '<div class="ihead"><span class="nm" style="color:' + r.accent + '">' + r.name + '</span><span class="pstate">#' + t.id + ' &middot; ' + t.kills + ' kills</span><button class="ghost x" data-act="close" type="button">Close</button></div>';
    h += '<div class="statgrid">' + stat('Damage', C.fmt(dmg)) + stat('Rate', (Math.round(rate * 100) / 100) + '/s') + stat('Range', Math.round(s.range)) + stat('DPS', C.fmt(dmg * rate * (s.multi || 1))) + '</div>';
    h += '<div class="tags"><span class="tag ' + (s.canFly ? 'yes' : '') + '">' + (s.canFly ? 'Hits flyers' : 'No flyers') + '</span><span class="tag mag ' + (s.canMagic ? 'yes' : '') + '">' + (s.canMagic ? 'Hurts magical' : 'No magical') + '</span>';
    if (t.buff && (t.buff.dmg || t.buff.rate)) h += '<span class="tag yes">Herd aura +' + C.pct(t.buff.dmg) + ' dmg</span>';
    h += '</div><p class="ability">' + esc(r.ability) + '</p>';
    h += '<div class="modes">' + ['first', 'last', 'strong', 'close'].map(m => '<button type="button" data-act="mode" data-v="' + m + '" class="' + (t.mode === m ? 'on' : '') + '">' + m[0].toUpperCase() + m.slice(1) + '</button>').join('') + '</div>';
    const chosen = C.chosenPaths(t).length;
    h += '<div class="ptitle"><span>Upgrade paths</span><span>' + chosen + ' / 2 chosen</span></div><div class="paths">';
    paths.forEach((p, i) => {
      const st = C.pathState(t, i), lv = t.paths[i], cost = C.nextNodeCost(t, i);
      let pips = '';
      for (let k = 1; k <= 10; k++) pips += '<span class="pip' + (k <= lv ? ' f' : '') + (k === 10 ? ' sig' : '') + '"></span>';
      const label = st === 'maxed' ? 'Signature' : st === 'locked' ? 'Locked' : st === 'chosen' ? 'Chosen' : 'Open';
      let btn;
      if (st === 'maxed') btn = '<button class="buy" type="button" disabled>Max</button>';
      else if (st === 'locked') btn = '<button class="buy" type="button" disabled>Locked</button>';
      else btn = '<button class="buy' + (S.cash < cost ? ' poor' : '') + '" type="button" data-act="node" data-v="' + i + '"' + (S.cash < cost ? ' disabled' : '') + '>Lv ' + (lv + 1) + ' &middot; ' + C.fmt(cost) + '</button>';
      h += '<div class="path ' + st + '"><div class="prow"><span class="pname">' + esc(p.name) + '</span><span class="pstate">' + label + ' ' + lv + '/10</span>' + btn + '</div>';
      h += '<div class="pips">' + pips + '</div>';
      h += '<div class="pdesc">' + esc(p.blurb) + ' ' + esc(p.node) + '<br>Node 10: <b>' + esc(p.sig) + '</b> ' + esc(p.sigDesc) + '</div></div>';
    });
    h += '</div><div class="ptitle"><span>Endless training</span><span>x' + C.TUNE.infMul + ' each</span></div><div class="infs">';
    for (const [w, label, lv] of [['dmg', 'Damage', t.infD], ['rate', 'Fire rate', t.infR]]) {
      const c = C.infNext(t, w);
      h += '<button class="inf" type="button" data-act="inf" data-v="' + w + '"' + (S.cash < c ? ' disabled' : '') + '><div class="t">' + label + ' Lv ' + lv + '</div><div class="s">x' + C.TUNE.infMul + ' ' + label.toLowerCase() + ' (now x' + (Math.round(Math.pow(C.TUNE.infMul, lv) * 100) / 100) + ')</div><div class="c">' + C.fmt(c) + '</div></button>';
    }
    h += '</div>';
    const refund = Math.floor(t.spent * C.TUNE.sellRate);
    const armed = ui.sellArm > performance.now();
    h += '<div class="sellrow"><button class="sell' + (armed ? ' confirm' : '') + '" type="button" data-act="sell">' + (armed ? 'Tap again to sell for ' : 'Sell for ') + C.fmt(refund) + '</button></div>';
    h += '<p class="hint">Selling refunds ' + C.pct(C.TUNE.sellRate) + ' of the ' + C.fmt(t.spent) + ' spent on this pony.</p>';
    box.innerHTML = h;
  }

  $('info').addEventListener('click', ev => {
    const b = ev.target.closest('[data-act]');
    if (!b) return;
    const t = selTower();
    if (!t) return;
    const act = b.dataset.act, v = b.dataset.v;
    if (act === 'close') { ui.selId = 0; }
    else if (act === 'mode') { t.mode = v; }
    else if (act === 'node') { if (C.buyNode(S, t, +v)) { t.anim = 0.4; writeSave(); } }
    else if (act === 'inf') { if (C.buyInf(S, t, v)) { t.anim = 0.4; writeSave(); } }
    else if (act === 'sell') {
      if (ui.sellArm > performance.now()) {
        const got = C.sellTower(S, t);
        ui.selId = 0; ui.sellArm = 0;
        banner('Sold for ' + C.fmt(got), '');
        writeSave();
      } else { ui.sellArm = performance.now() + 2500; setTimeout(() => { ui.infoKey = ''; }, 2600); }
    }
    ui.infoKey = ''; ui.buildKey = '';
  });

  function handleEvents() {
    if (!S.events.length) return;
    const evs = S.events.splice(0);
    for (const e of evs) {
      if (e.type === 'start') {
        if (e.boss) banner('Wave ' + e.n + ': ' + e.boss.name + ' approaches', 'boss');
        else banner('Wave ' + e.n + ' begins', '');
      } else if (e.type === 'won') {
        banner(e.fresh ? 'Wave ' + e.n + ' cleared! Bonus +' + C.fmt(e.bonus) + ', kills +' + C.fmt(e.earned) : 'Wave ' + e.n + ' replayed: +' + C.fmt(e.earned) + ' kill cash', 'good');
        if (e.fresh) {
          if (S.cleared >= 50 && e.n === 50) setTimeout(() => banner('Wave 50 cleared! Map 2 is still being charted.', 'good'), 2700);
          if (S.sel === e.n && S.sel < C.MAX_WAVE) S.sel = Math.min(C.MAX_WAVE, S.cleared + 1);
          if (e.n === C.MAX_WAVE) setTimeout(() => banner('All 100 waves held. The road is safe!', 'good'), 2700);
        }
        if (S.auto && !(e.fresh && e.n === C.MAX_WAVE)) ui.autoNext = performance.now() + 1600;
        writeSave();
      } else if (e.type === 'lost') {
        banner('Wave ' + e.n + ' lost. Ponies and cash kept, try again', 'bad');
        ui.autoNext = 0;
        if (S.auto) { S.auto = false; }
        writeSave();
      } else if (e.type === 'enrage') {
        banner('The stragglers are enraged and immune to control', 'bad');
      }
      ui.waveKey = ''; ui.infoKey = '';
    }
  }

  function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }

  function drawRange(t, x, y, range, ok) {
    const [sx, sy] = V.toScreen(x, y);
    circle(sx, sy, range * V.sc);
    ctx.fillStyle = ok ? 'rgba(79,209,197,.08)' : 'rgba(227,91,106,.1)';
    ctx.fill();
    ctx.strokeStyle = ok ? 'rgba(79,209,197,.6)' : 'rgba(227,91,106,.7)';
    ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]); ctx.stroke(); ctx.setLineDash([]);
  }

  function drawFx(f) {
    const k = f.t / f.life, sc = V.sc;
    const [sx, sy] = V.toScreen(f.x || 0, f.y || 0);
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - k);
    switch (f.k) {
      case 'ring': case 'stomp':
        ctx.strokeStyle = f.c; ctx.lineWidth = f.k === 'stomp' ? 3 : 2;
        circle(sx, sy, f.r * sc * (f.k === 'stomp' ? 0.4 + 0.6 * k : 0.3 + 0.7 * k)); ctx.stroke(); break;
      case 'puff':
        ctx.fillStyle = f.c; circle(sx, sy, f.r * sc * (1 + k)); ctx.globalAlpha *= 0.5; ctx.fill(); break;
      case 'text':
        ctx.fillStyle = f.c; ctx.font = '700 ' + Math.max(11, 14 * sc + 4) + 'px system-ui'; ctx.textAlign = 'center';
        ctx.fillText(f.s, sx, sy - k * 24); break;
      case 'spark':
        ctx.fillStyle = f.c; circle(sx, sy, (4 + 6 * k) * Math.max(0.6, sc)); ctx.fill(); break;
      case 'zap': case 'bolt': {
        const [ax, ay] = f.k === 'zap' ? V.toScreen(f.x1, f.y1) : [sx, sy - 200 * sc];
        const [bx, by] = f.k === 'zap' ? V.toScreen(f.x2, f.y2) : [sx, sy];
        ctx.strokeStyle = f.c; ctx.lineWidth = f.k === 'bolt' ? 3 : 2; ctx.shadowColor = f.c; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.moveTo(ax, ay);
        for (let i = 1; i < 5; i++) { const q = i / 5; ctx.lineTo(ax + (bx - ax) * q + (Math.random() - 0.5) * 10, ay + (by - ay) * q + (Math.random() - 0.5) * 10); }
        ctx.lineTo(bx, by); ctx.stroke(); break;
      }
      case 'star':
        ctx.fillStyle = f.c; ctx.shadowColor = f.c; ctx.shadowBlur = 20;
        circle(sx, sy, f.r * sc * (0.3 + 0.7 * k)); ctx.globalAlpha *= 0.4; ctx.fill(); break;
      case 'swirl':
        ctx.strokeStyle = f.c; ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(sx, sy, f.r * sc * (0.3 + 0.25 * i), k * 6 + i, k * 6 + i + 2.4); ctx.stroke(); }
        break;
      case 'rainbow': {
        const cols = ['#ff6b6b', '#ffb36b', '#ffe66b', '#7fd66a', '#6bb8ff', '#b48bff'];
        cols.forEach((c, i) => { ctx.strokeStyle = c; ctx.lineWidth = 3; circle(sx, sy, f.r * sc * k * (1 - i * 0.05)); ctx.stroke(); });
        break;
      }
      case 'stampede': {
        ctx.fillStyle = 'rgba(210,168,108,.35)';
        const [ax, ay] = V.toScreen(W.L * k, W.cy);
        circle(ax, ay, W.half * sc * 1.2); ctx.fill(); break;
      }
      case 'leak': {
        ctx.fillStyle = 'rgba(227,91,106,.35)';
        circle(sx, sy, 60 * sc * (0.5 + k)); ctx.fill(); break;
      }
    }
    ctx.restore();
  }

  const PROJ_COL = { unicorn: '#c9a4ff', pegasus: '#bff4ee', earth: '#e3a95b' };
  function draw(now) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (R.bg) ctx.drawImage(R.bg, 0, 0, cw, ch); else { ctx.fillStyle = '#0b0a13'; ctx.fillRect(0, 0, cw, ch); }
    const sc = V.sc;
    const sel = selTower();
    if (sel) drawRange(sel, sel.x, sel.y, C.stats(sel).range, true);
    if (ui.placing && ui.ghost) {
      const ok = C.canPlace(S, ui.ghost.x, ui.ghost.y) && S.cash >= C.nextTowerCost(S, ui.placing);
      drawRange(null, ui.ghost.x, ui.ghost.y, C.RACES[ui.placing].range, ok);
    }
    if (ui.placing) {
      ctx.strokeStyle = 'rgba(227,91,106,.25)'; ctx.lineWidth = 1;
      for (const t of S.towers) { const [tx, ty] = V.toScreen(t.x, t.y); circle(tx, ty, W.minGap * sc); ctx.stroke(); }
    }
    const list = S.towers.slice().sort((a, b) => V.toScreen(a.x, a.y)[1] - V.toScreen(b.x, b.y)[1]);
    for (const t of list) {
      const [sx, sy] = V.toScreen(t.x, t.y);
      const ring = C.chosenPaths(t).reduce((a, i) => a + t.paths[i], 0);
      if (t === sel) { ctx.strokeStyle = '#4fd1c5'; ctx.lineWidth = 2; circle(sx, sy, W.towerR * sc * 1.25); ctx.stroke(); }
      if (ring >= 10) { ctx.strokeStyle = ring >= 20 ? 'rgba(227,193,91,.7)' : 'rgba(169,139,255,.5)'; ctx.lineWidth = 1.5; circle(sx, sy + W.towerR * sc * 0.45, W.towerR * sc * 0.9); ctx.stroke(); }
      R.drawPony(ctx, sx, sy, W.towerR * 2.3 * sc, Object.assign(R.ponyOpts(t.race, t), { angle: V.angle(t.face), now, hop: t.anim > 0 ? Math.min(1, t.anim * 4) : 0 }));
    }
    if (S.run) {
      const es = S.run.enemies.slice().sort((a, b) => a.y - b.y);
      for (const e of es) { const [sx, sy] = V.toScreen(e.x, e.y); R.drawDNB(ctx, e, sx, sy, e.r * sc, now); }
      for (const p of S.run.proj) {
        const [sx, sy] = V.toScreen(p.x, p.y);
        ctx.save(); ctx.fillStyle = PROJ_COL[p.kind] || '#fff'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 10;
        circle(sx, sy, (p.kind === 'unicorn' ? 5 : 3) * Math.max(0.7, sc)); ctx.fill(); ctx.restore();
      }
    }
    for (const f of S.fx) drawFx(f);
    if (ui.placing && ui.ghost) {
      const [sx, sy] = V.toScreen(ui.ghost.x, ui.ghost.y);
      ctx.save(); ctx.globalAlpha = 0.6;
      R.drawPony(ctx, sx, sy, W.towerR * 2.3 * sc, Object.assign(R.ponyOpts(ui.placing), { angle: V.angle(ui.ghost.y < W.cy ? Math.PI / 2 : -Math.PI / 2), now }));
      ctx.restore();
    }
    if (S.run) {
      ctx.save();
      ctx.font = '700 13px system-ui'; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(243,240,251,.85)';
      const hearts = Math.max(0, S.run.lives);
      ctx.fillText('Lives ' + hearts + ' / ' + C.LIVES + '   +' + C.fmt(S.run.earned) + ' this wave', 10, ch - 12);
      ctx.restore();
    }
  }

  function refreshHud() {
    $('hCash').textContent = C.fmt(S.cash);
    $('hLives').textContent = S.run ? Math.max(0, S.run.lives) + '/' + C.LIVES : C.LIVES + '/' + C.LIVES;
    $('hWave').textContent = S.run ? S.run.n : S.sel;
    $('hBest').textContent = S.cleared;
  }

  buildList();
  let last = performance.now(), acc = 0, uiT = 0, saveT = 0;
  const DT = 1 / 60;
  function frame(now) {
    acc += Math.min(0.25, (now - last) / 1000);
    last = now;
    let steps = 0;
    while (acc >= DT && steps < 8) { C.step(S, DT); acc -= DT; steps++; }
    if (steps >= 8) acc = 0;
    handleEvents();
    if (ui.autoNext && now >= ui.autoNext && !S.run) {
      ui.autoNext = 0;
      if (S.auto) C.startWave(S, S.sel);
    }
    draw(now);
    if (now - uiT > 120) {
      uiT = now;
      refreshHud(); refreshBuild(); refreshWave(); refreshInfo(); drawIcons(now);
    }
    if (now - saveT > 10000) { saveT = now; writeSave(); }
    requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) writeSave(); });
  window.addEventListener('pagehide', writeSave);
  $('saveNote').textContent = 'Progress saves automatically in this browser.';
  requestAnimationFrame(frame);
  window.__nd = { get S() { return S; }, ui, save: writeSave };
})();
