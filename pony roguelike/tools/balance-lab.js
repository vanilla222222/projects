'use strict';

const Lab = (() => {
  const $ = id => document.getElementById(id);
  const log = m => { const el = $('log'); if (el) { el.textContent += m + '\n'; el.scrollTop = el.scrollHeight; } };
  const results = { meta: {}, stages: [], enemies: [], bosses: [], items: {}, problems: [] };

  function stageNum(key){ const m = /^(\d+)/.exec(key || ''); return m ? +m[1] : null; }
  function isBossDef(d){ return d.isBoss || /boss/i.test(d.behavior || '') || /superboss/i.test(d.behavior || ''); }
  function allEnemyDefs(){ return Object.values(ENEMY_TYPES).filter(d => d && d.id && !isBossDef(d)); }
  const r1 = n => Math.round(n * 10) / 10;
  const r2 = n => Math.round(n * 100) / 100;

  function staticAudit(){
    const groups = {};
    for (const d of allEnemyDefs()) {
      const k = d.floorKey || ('stage' + (d.stage === undefined ? '?' : d.stage));
      (groups[k] = groups[k] || []).push(d);
    }
    const rows = [];
    for (const k of Object.keys(groups)) {
      const g = groups[k], n = g.length;
      const avg = f => g.reduce((s, d) => s + (d[f] || 0), 0) / n;
      const hps = g.map(d => d.hp).sort((a, b) => a - b);
      rows.push({ key: k, count: n, hp: r1(avg('hp')), dmg: r2(avg('dmg')), speed: r1(avg('speed')), maxHp: hps[n - 1], minHp: hps[0] });
      if (n < 40 && /^\d+[A-D]?$/.test(k) && stageNum(k) >= 3) results.problems.push({ type: 'count<40', key: k, count: n });
      for (const d of g) {
        if (!Number.isFinite(d.hp) || !Number.isFinite(d.speed) || !Number.isFinite(d.dmg)) results.problems.push({ type: 'badStat', id: d.id });
        if (d.hp > avg('hp') * 4 && n > 8) results.problems.push({ type: 'hpOutlier', id: d.id, key: k, hp: d.hp, groupAvg: r1(avg('hp')) });
      }
    }
    results.stages = rows.sort((a, b) => (stageNum(a.key) || 99) - (stageNum(b.key) || 99) || a.key.localeCompare(b.key));
    const seen = {};
    for (const fn of ['ENEMY_TYPES']) { void fn; }
    const behaviors = {};
    for (const d of allEnemyDefs()) {
      const b = d.behavior;
      if (b && typeof ENEMY_BEHAVIOR_HANDLERS !== 'undefined' && !ENEMY_BEHAVIOR_HANDLERS[b] && !/^(chaser|ranged|orbiter|pouncer|strafer|splitshot|swarm|ambusher|lobber|weaver|burrower|shielder|skirmisher|sniper|turret|healer|summoner|whiplash|teleporter|charger|shielded|splitter|rootgrower|treeburner|oilrig|leaper|sentry|flyer|bomber)$/.test(b)) behaviors[b] = (behaviors[b] || 0) + 1;
    }
    for (const b in behaviors) results.problems.push({ type: 'unknownBehaviorHandler', behavior: b, count: behaviors[b] });
    void seen;
  }

  function itemAudit(){
    const out = { classes: [], stacks: [] };
    const classIds = Object.keys(CLASSES);
    const snap = p => ({ speed: r1(p.speed), dmg: r2(p.rangedDamage), melee: r2(p.meleeDamage), rate: r2(p.fireCooldown ? 1 / p.fireCooldown : 0), range: r2(p.rangeTiles || 0), luck: r2(p.luck), crit: r2(p.critChance || 0) });
    for (const c of classIds) {
      try { const p = new Player(c); recalcPlayerStats(p); out.classes.push(Object.assign({ id: c }, snap(p))); }
      catch (e) { results.problems.push({ type: 'playerInitError', class: c, msg: String(e) }); }
    }
    const conv = {};
    for (const id in STAT_CONVERTED_ITEMS) (conv[STAT_CONVERTED_ITEMS[id]] = conv[STAT_CONVERTED_ITEMS[id]] || []).push(id);
    const base = classIds[0];
    const stack = (label, prep) => {
      try { const p = new Player(base); prep(p); recalcPlayerStats(p); out.stacks.push(Object.assign({ label }, snap(p))); }
      catch (e) { results.problems.push({ type: 'stackError', label, msg: String(e) }); }
    };
    stack('baseline (' + base + ')', () => {});
    for (const cat in conv) stack('all ' + conv[cat].length + ' converted ' + cat, p => { for (const id of conv[cat]) p.statPassives[id] = 1; });
    const prot = typeof PROTECTED_BASIC_ITEM_IDS !== 'undefined' ? PROTECTED_BASIC_ITEM_IDS : {};
    for (const cat in prot) stack('all ' + prot[cat].length + ' protected ' + cat, p => { for (const id of prot[cat]) p.passives[id] = 1; });
    stack('everything converted + protected', p => { for (const id in STAT_CONVERTED_ITEMS) p.statPassives[id] = 1; for (const cat in prot) for (const id of prot[cat]) p.passives[id] = 1; });
    let noPool = 0; const items = typeof ITEMS !== 'undefined' ? Object.values(ITEMS) : [];
    for (const it of items) if (!it.pools || !it.pools.length) noPool++;
    out.itemCount = items.length; out.itemsWithoutPools = noPool;
    results.items = out;
  }

  function makeGame(classId){
    const canvas = document.createElement('canvas');
    const g = new Game(canvas);
    g.startRun(classId, 'balance-lab');
    return g;
  }

  function floorFor(d){
    const n = stageNum(d.floorKey);
    if (n !== null) return n;
    const s = typeof d.stage === 'number' ? d.stage : 1;
    return Math.max(1, s * (typeof FLOORS_PER_STAGE === 'number' ? FLOORS_PER_STAGE : 3) + 1);
  }

  function simEnemy(game, d, seconds, o){
    o = o || {};
    const player = game.player, room = game.currentRoom;
    const cx = (room.tileW || 15) * TILE / 2, cy = (room.tileH || 9) * TILE / 2;
    player.x = cx - 120; player.y = cy;
    player.hp = player.maxHp = 1e6; player.isDead = false;
    room.obstacles = []; room.enemies = []; room.itemPedestals = room.itemPedestals || [];
    game.projectiles.length = 0; game.bombs.length = 0; game.explosions.length = 0;
    const floor = o.floor || floorFor(d);
    const e = o.boss ? new Boss(d, Math.round((cx + 120) / TILE), Math.round(cy / TILE), floor) : new Enemy(d, Math.round((cx + 120) / TILE), Math.round(cy / TILE), floor);
    e.x = cx + 120; e.y = cy;
    room.enemies.push(e);
    const startHp = e.hp; let dmgTaken = 0, maxProj = 0, maxPProj = 0, moved = 0, lastX = e.x, lastY = e.y, ttk = null, nan = false, err = null;
    const realDamage = damagePlayer;
    const lowLevel = o.lowHp ? Math.min(player.redMax || 1, 1) : null;
    if (lowLevel !== null) player.redCurrent = lowLevel;
    globalThis.damagePlayer = function(g, amount, src){
      if (!o.real) { dmgTaken += amount; return; }
      const before = (player.redCurrent || 0) + (player.blueCurrent || 0);
      realDamage(g, amount, src);
      dmgTaken += Math.max(0, before - ((player.redCurrent || 0) + (player.blueCurrent || 0)));
    };
    const input = { left: false, right: false, up: false, down: false, attack: true, build: false, mouseX: 0, mouseY: 0, mouseActive: true };
    const dt = 1 / 30, frames = Math.round(seconds / dt);
    let strafe = 1;
    try {
      for (let f = 0; f < frames; f++) {
        game.state = 'playing'; game.freezeTimer = 0; game.paused = false; if (typeof FX !== 'undefined') FX.hitStopTimer = 0;
        if (!o.real) { player.invulnTimer = 0; player.invincibleTimer = 0; }
        if (o.move) {
          const dx = e.x - player.x, dy = e.y - player.y, dist = Math.hypot(dx, dy) || 1;
          if (f % 30 === 0) strafe = -strafe;
          const towards = dist > 300 ? 1 : dist < 200 ? -1 : 0;
          const vx = (dx / dist) * towards + (-dy / dist) * strafe * 0.7, vy = (dy / dist) * towards + (dx / dist) * strafe * 0.7;
          input.left = vx < -0.25; input.right = vx > 0.25; input.up = vy < -0.25; input.down = vy > 0.25;
        }
        input.mouseX = e.x - game.camX; input.mouseY = e.y - game.camY;
        game.update(input, dt);
        if (o.real) { if (lowLevel !== null) player.redCurrent = lowLevel; else player.redCurrent = player.redMax; }
        { let np = 0; for (const q of game.projectiles) if (q.owner !== 'player') np++; if (np > maxProj) maxProj = np; if (game.projectiles.length - np > maxPProj) maxPProj = game.projectiles.length - np; }
        if (!Number.isFinite(e.x) || !Number.isFinite(e.y)) { nan = true; break; }
        moved += Math.hypot(e.x - lastX, e.y - lastY); lastX = e.x; lastY = e.y;
        if (e.hp <= 0 || e.dead || !room.enemies.includes(e)) { ttk = r1((f + 1) * dt); break; }
        game.state = 'playing';
      }
    } catch (ex) { err = String(ex && ex.message || ex); }
    globalThis.damagePlayer = realDamage;
    const t = ttk === null ? seconds : ttk;
    return { id: d.id, key: d.floorKey || ('stage' + d.stage), floor, behavior: d.behavior, hp: startHp, ttk, dps: r2(dmgTaken / Math.max(t, 0.1)), dmgTaken: r1(dmgTaken), maxProj, maxPProj, hpFrac: r2(Math.min(1, Math.max(0, 1 - Math.max(e.hp, 0) / startHp))), moved: Math.round(moved), nan, err };
  }

  async function enemyLab(opts){
    const defs = allEnemyDefs().filter(d => !opts.stage || (d.floorKey || '').toUpperCase() === opts.stage.toUpperCase() || String(stageNum(d.floorKey)) === opts.stage);
    const list = opts.quick ? defs.filter((d, i) => i % 4 === 0) : defs;
    let game;
    try { game = makeGame(opts.classId); } catch (e) { results.problems.push({ type: 'startRunFailed', msg: String(e && e.stack || e) }); log('startRun failed: ' + e); return; }
    log('Simulating ' + list.length + ' enemies as ' + opts.classId + '...');
    let i = 0;
    for (const d of list) {
      const r = simEnemy(game, d, opts.seconds, { real: opts.real, move: opts.move });
      results.enemies.push(r);
      if (r.nan) results.problems.push({ type: 'NaNposition', id: d.id });
      if (r.err) results.problems.push({ type: 'exception', id: d.id, msg: r.err });
      if (!r.err && !r.nan && r.moved < 5 && r.dps === 0 && r.maxProj === 0 && d.speed > 0) results.problems.push({ type: 'idle', id: d.id, behavior: d.behavior });
      if (++i % 25 === 0) { $('progress').textContent = i + ' / ' + list.length; await new Promise(res => setTimeout(res, 0)); }
    }
    $('progress').textContent = 'done';
  }

  function refEnemies(){
    const defs = allEnemyDefs().filter(d => d.stage === 3 && d.speed > 0 && d.hp >= 3).sort((a, b) => a.id.localeCompare(b.id));
    const out = []; const step = Math.max(1, Math.floor(defs.length / 5));
    for (let i = 0; i < defs.length && out.length < 5; i += step) out.push(defs[i]);
    return out;
  }
  function score(rs, T){
    let eff = 0, taken = 0, pp = 0, bad = null;
    for (const r of rs) { eff += r.ttk !== null ? 1 / Math.max(r.ttk, 0.2) : r.hpFrac / T; taken += r.dmgTaken; if (r.maxPProj > pp) pp = r.maxPProj; if (r.err || r.nan) bad = r.err || 'NaN'; }
    return { eff: r2(eff / rs.length), taken: r1(taken / rs.length), pp, bad };
  }
  function statKey(p){ return [p.speed, p.rangedDamage, p.meleeDamage, p.fireCooldown, p.rangeTiles, p.luck, p.critChance, p.redMax, p.crystalShardCount, p.multishotExtra, p.boltSpeed].map(v => Math.round((v || 0) * 1000)).join('|') + '|' + JSON.stringify(p.tearFlags); }
  function playerFor(classId, ids){
    const g = makeGame(classId);
    for (const id of ids) applyPassiveEffect(g, ITEMS[id]);
    recalcPlayerStats(g.player);
    const p = g.player;
    p.redCurrent = p.redMax;
    for (const k of ['speed', 'rangedDamage', 'meleeDamage', 'fireCooldown', 'luck']) if (!Number.isFinite(p[k])) throw new Error('stat ' + k + ' is ' + p[k]);
    return g;
  }
  function classRates(){
    const out = [];
    for (const c of Object.keys(CLASSES)) { try { const p = new Player(c); recalcPlayerStats(p); out.push({ c, d: Math.max(p.rangedDamage || 0, p.meleeDamage || 0) / (p.fireCooldown || 1) }); } catch (e) {} }
    return out.sort((x, y) => y.d - x.d);
  }
  const tick = () => new Promise(res => setTimeout(res, 0));
  async function synergyLab(opts){
    const refs = refEnemies(), T = opts.synSeconds;
    const rates = classRates();
    const main = rates[0].c;
    opts.classId = main;
    const nCls = Math.max(1, Math.min(rates.length, opts.classCount || 1));
    const extra = [];
    for (let i = 1; i < nCls; i++) extra.push(rates[Math.round(i * (rates.length - 1) / (nCls - 1))].c);
    log('Synergy class: ' + main + (extra.length ? ' + cross-class: ' + extra.join(', ') : ''));
    const duel = (cls, ids, o, rl, sec) => { const g = playerFor(cls, ids); return score((rl || refs).map(d => { if (RNG.seed) RNG.seed(4242); return simEnemy(g, d, sec || T, Object.assign({ move: opts.move, real: opts.real }, o || {})); }), sec || T); };
    const base = duel(main, []);
    const noise = Math.abs(base.eff - duel(main, []).eff);
    const baseKey = statKey(playerFor(main, []).player);
    log('baseline noise ' + noise);
    const ids = Object.keys(ITEMS).filter(id => ITEMS[id].type === 'passive' && !(typeof PROTECTED_BASIC_ITEM_IDS !== 'undefined' && Object.values(PROTECTED_BASIC_ITEM_IDS).some(a => a.includes(id))));
    const list = opts.quick ? ids.filter((x, i) => i % 4 === 0) : ids;
    const solo = [], inert = [];
    let i = 0;
    for (const id of list) {
      try {
        const sc = duel(main, [id]);
        const sn = statKey(playerFor(main, [id]).player);
        if (sc.bad) results.problems.push({ type: 'itemCrash', id, msg: sc.bad });
        if (sc.pp > 150) results.problems.push({ type: 'playerProjSpam', id, n: sc.pp });
        if (sc.eff === base.eff && sc.taken === base.taken && sc.pp === base.pp && sn === baseKey) inert.push(id);
        solo.push({ id, eff: sc.eff, gain: r2(sc.eff - base.eff), taken: sc.taken, pp: sc.pp });
      } catch (e) { results.problems.push({ type: 'itemCrash', id, msg: String(e && e.message || e) }); }
      if (++i % 10 === 0) { $('progress').textContent = 'solo ' + i + ' / ' + list.length; await tick(); }
    }
    const gains = solo.map(x => x.gain).sort((a, b) => a - b);
    const med = gains.length ? gains[gains.length >> 1] : 0;
    for (const x of solo) {
      if (x.gain > Math.max(base.eff * 1.5, med * 6, noise * 6) && x.gain > 0.1) results.problems.push({ type: 'itemOP', id: x.id, gain: x.gain });
      if (x.gain < -Math.max(0.05, base.eff * 0.5, noise * 4)) results.problems.push({ type: 'itemHarmful', id: x.id, gain: x.gain });
    }

    const triggered = {};
    if (inert.length) {
      const scen = [['real', { real: true }], ['lowHp', { real: true, lowHp: true }], ['moving', { real: true, move: true }], ['long', { real: true, move: true }, 2]];
      const r3 = refs.slice(0, 3);
      const sb = scen.map(([n, o, m]) => ({ n, o, m: m || 1, b: duel(main, [], o, r3, T * (m || 1)) }));
      let k = 0;
      for (const id of inert) {
        try {
          for (const sc of sb) {
            const r = duel(main, [id], sc.o, r3, T * sc.m);
            if (r.eff !== sc.b.eff || r.taken !== sc.b.taken || r.pp !== sc.b.pp) { triggered[id] = sc.n; break; }
          }
        } catch (e) { results.problems.push({ type: 'itemCrash', id, msg: String(e && e.message || e) }); }
        if (++k % 5 === 0) { $('progress').textContent = 'triggers ' + k + ' / ' + inert.length; await tick(); }
      }
      for (const id of inert) if (!triggered[id]) results.problems.push({ type: 'itemDead', id });
    }

    const cross = [];
    if (extra.length) {
      const r2refs = refs.slice(0, 2), cT = Math.max(3, T - 2);
      const cb = {}; for (const c of extra) cb[c] = duel(c, [], null, r2refs, cT);
      let k = 0;
      for (const x of solo) {
        const row = { id: x.id, rel: {} };
        row.rel[main] = base.eff > 0 ? x.gain / base.eff : 0;
        for (const c of extra) {
          try { const r = duel(c, [x.id], null, r2refs, cT); row.rel[c] = cb[c].eff > 0 ? (r.eff - cb[c].eff) / cb[c].eff : 0; if (r.bad) results.problems.push({ type: 'itemCrash', id: x.id + '@' + c, msg: r.bad }); }
          catch (e) { results.problems.push({ type: 'itemCrash', id: x.id + '@' + c, msg: String(e && e.message || e) }); }
        }
        const v = Object.values(row.rel), mx = Math.max(...v), mn = Math.min(...v);
        row.spread = r2(mx - mn);
        cross.push(row);
        if (mx > 0.5 && mn < 0.05 && mx - mn > 0.45) results.problems.push({ type: 'classDisparity', id: x.id, best: r2(mx), worst: r2(mn) });
        if (++k % 10 === 0) { $('progress').textContent = 'classes ' + k + ' / ' + solo.length; await tick(); }
      }
    }

    const pairs = [];
    const topN = opts.pairTop;
    if (topN > 1) {
      const top = solo.slice().sort((a, b) => b.gain - a.gain).slice(0, topN);
      let n = 0; const total = top.length * (top.length - 1) / 2;
      for (let a = 0; a < top.length; a++) for (let b = a + 1; b < top.length; b++) {
        try {
          const sc = duel(main, [top[a].id, top[b].id]);
          const gain = sc.eff - base.eff, expect = top[a].gain + top[b].gain;
          const ratio = expect > 0.05 ? gain / expect : 0;
          pairs.push({ a: top[a].id, b: top[b].id, gain: r2(gain), ratio: r2(ratio) });
          if (sc.bad) results.problems.push({ type: 'pairCrash', id: top[a].id + '+' + top[b].id, msg: sc.bad });
          if (sc.pp > 150) results.problems.push({ type: 'playerProjSpam', id: top[a].id + '+' + top[b].id, n: sc.pp });
        } catch (e) { results.problems.push({ type: 'pairCrash', id: top[a].id + '+' + top[b].id, msg: String(e && e.message || e) }); }
        if (++n % 10 === 0) { $('progress').textContent = 'pairs ' + n + ' / ' + total; await tick(); }
      }
    }
    results.synergy = { base, refs: refs.map(d => d.id), solo, pairs, triggered, cross, extraClasses: extra, classId: main };
    $('progress').textContent = 'done';
  }

  async function bossLab(opts){
    const defs = [];
    if (typeof BOSS_TYPES !== 'undefined') for (const k in BOSS_TYPES) defs.push(BOSS_TYPES[k]);
    if (typeof SUPERBOSSES !== 'undefined') for (const k in SUPERBOSSES) defs.push(SUPERBOSSES[k]);
    const cls = classRates()[0].c;
    let game;
    try { game = makeGame(cls); } catch (e) { results.problems.push({ type: 'startRunFailed', msg: String(e) }); return; }
    log('Boss duels as ' + cls + ': ' + defs.length + ' bosses, ' + opts.bossSeconds + 's each');
    let i = 0;
    for (const d of defs) {
      if (!d || !d.id) continue;
      const fl = stageNum(d.floorKey) || (typeof d.floor === 'number' ? d.floor : null) || ((typeof d.stage === 'number' ? d.stage : 1) * 3 + 1);
      const r = simEnemy(game, d, opts.bossSeconds, { boss: true, real: opts.real, move: true, floor: fl });
      r.boss = true; results.bosses.push(r);
      if (r.err) results.problems.push({ type: 'bossException', id: d.id, msg: r.err });
      if (r.nan) results.problems.push({ type: 'bossNaN', id: d.id });
      if (r.ttk !== null && r.ttk < 6) results.problems.push({ type: 'bossTrivial', id: d.id, ttk: r.ttk });
      if (r.ttk === null && r.hpFrac < 0.3) results.problems.push({ type: 'bossTooTanky', id: d.id, hpFrac: r.hpFrac });
      if (r.maxProj > 120) results.problems.push({ type: 'bossProjSpam', id: d.id, n: r.maxProj });
      if (++i % 5 === 0) { $('progress').textContent = 'bosses ' + i + ' / ' + defs.length; await tick(); }
    }
    $('progress').textContent = 'done';
  }

  const BASE_KEY = 'balanceLabBaseline';
  function compact(){
    const e = {}; for (const r of results.enemies) e[r.id] = [r.dps, r.ttk, r.maxProj];
    const it = {}; if (results.synergy) for (const x of results.synergy.solo) it[x.id] = x.gain;
    return { date: results.meta.date, problems: results.problems.map(p => p.type + ':' + (p.id || p.key || p.behavior || p.label || p.class || '')), e, it };
  }
  function saveBaseline(){ try { localStorage.setItem(BASE_KEY, JSON.stringify(compact())); log('baseline saved (' + results.enemies.length + ' enemies, ' + (results.synergy ? results.synergy.solo.length : 0) + ' items)'); } catch (ex) { log('baseline save failed: ' + ex); } }
  function diffLines(){
    let b; try { b = JSON.parse(localStorage.getItem(BASE_KEY) || 'null'); } catch (ex) { b = null; }
    if (!b) return [];
    const c = compact(), L = ['', '## Diff vs baseline (' + b.date + ')'];
    const bp = new Set(b.problems), cp = new Set(c.problems);
    const added = c.problems.filter(x => !bp.has(x)), gone = b.problems.filter(x => !cp.has(x));
    L.push('- new problems (' + added.length + '): ' + added.slice(0, 40).join(', '));
    L.push('- resolved problems (' + gone.length + '): ' + gone.slice(0, 40).join(', '));
    const ch = [];
    for (const id in c.e) { const o = b.e[id]; if (!o) continue; const n = c.e[id]; const dd = n[0] - o[0]; if (Math.abs(dd) > Math.max(0.5, Math.abs(o[0]) * 0.25) || Math.abs(n[2] - o[2]) > Math.max(4, o[2] * 0.4)) ch.push(`${id} dps ${o[0]}->${n[0]} proj ${o[2]}->${n[2]} ttk ${o[1]}->${n[1]}`); }
    L.push('- enemies changed >25% (' + ch.length + '):', ...ch.slice(0, 40));
    const ic = [];
    for (const id in c.it) { const o = b.it[id]; if (o === undefined) continue; if (Math.abs(c.it[id] - o) > Math.max(0.05, Math.abs(o) * 0.25)) ic.push(`${id} gain ${o}->${c.it[id]}`); }
    L.push('- items changed >25% (' + ic.length + '):', ...ic.slice(0, 40));
    return L;
  }
  function download(){
    const blob = new Blob([$('out').value], { type: 'text/plain' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'balance-lab-' + Date.now() + '.txt'; document.body.appendChild(a); a.click(); a.remove();
  }

  function markdown(){
    const L = [];
    L.push('# Balance Lab results', '', JSON.stringify(results.meta), '');
    L.push('## Problems (' + results.problems.length + ')');
    const byType = {};
    for (const p of results.problems) (byType[p.type] = byType[p.type] || []).push(p);
    for (const t in byType) L.push('- ' + t + ' x' + byType[t].length + ': ' + byType[t].slice(0, 25).map(p => p.id || p.key || p.behavior || p.label || p.class).join(', '));
    L.push('', '## Stage enemy stats (key, count, avgHP, avgDmg, avgSpeed, maxHP)');
    for (const s of results.stages) L.push(`${s.key}\t${s.count}\t${s.hp}\t${s.dmg}\t${s.speed}\t${s.maxHp}`);
    L.push('', '## Item stacks (label, speed, dmg, rate, range, luck, crit, maxHp)');
    for (const s of results.items.stacks || []) L.push(`${s.label}\t${s.speed}\t${s.dmg}\t${s.rate}\t${s.range}\t${s.luck}\t${s.crit}\t${s.maxHp}`);
    L.push('', 'items: ' + results.items.itemCount + ', without pools: ' + results.items.itemsWithoutPools);
    if (results.enemies.length) {
      const es = results.enemies.slice();
      const stat = (label, arr) => L.push('', '## ' + label, ...arr.map(e => `${e.id} (${e.key}) hp=${e.hp} ttk=${e.ttk} dps=${e.dps} proj=${e.maxProj} moved=${e.moved}`));
      stat('Highest damage-per-second enemies', es.slice().sort((a, b) => b.dps - a.dps).slice(0, 30));
      stat('Longest time-to-kill (or unkilled)', es.slice().sort((a, b) => (b.ttk === null ? 99 : b.ttk) - (a.ttk === null ? 99 : a.ttk)).slice(0, 30));
      stat('Trivial (dps 0 and killed fast)', es.filter(e => e.dps === 0 && e.ttk !== null && e.ttk < 2).slice(0, 30));
      const per = {};
      for (const e of es) { const p = per[e.key] = per[e.key] || { n: 0, dps: 0, ttk: 0, k: 0 }; p.n++; p.dps += e.dps; if (e.ttk !== null) { p.ttk += e.ttk; p.k++; } }
      L.push('', '## Per stage sim (key, n, avgDPS, avgTTK)');
      for (const k in per) L.push(`${k}\t${per[k].n}\t${r2(per[k].dps / per[k].n)}\t${per[k].k ? r1(per[k].ttk / per[k].k) : '-'}`);
    }
    if (results.bosses.length) {
      const bs = results.bosses.slice().sort((a, b) => (a.ttk === null ? 999 : a.ttk) - (b.ttk === null ? 999 : b.ttk));
      L.push('', '## Boss duels (id, floor, hp, ttk, dpsTaken, maxProj, hpFrac) sorted fastest-killed first', ...bs.map(e => `${e.id}\tf${e.floor}\thp=${e.hp}\tttk=${e.ttk}\tdps=${e.dps}\tproj=${e.maxProj}\thpFrac=${e.hpFrac}`));
    }
    const sy = results.synergy;
    if (sy && sy.triggered) {
      const tk = Object.keys(sy.triggered);
      L.push('', '## Items that only work under a trigger (' + tk.length + ')', tk.map(k => k + ':' + sy.triggered[k]).join(', '));
    }
    if (sy && sy.cross && sy.cross.length) {
      L.push('', '## Cross-class spread (' + [sy.classId].concat(sy.extraClasses).join(', ') + '); relative gain per class, highest spread first', ...sy.cross.slice().sort((a, b) => b.spread - a.spread).slice(0, 40).map(x => x.id + '\t' + Object.entries(x.rel).map(([c, v]) => c + '=' + r2(v)).join('\t')));
    }
    if (sy) {
      L.push('', '## Synergy mode (' + sy.classId + ', refs: ' + sy.refs.join(', ') + '; baseline eff ' + sy.base.eff + ', taken ' + sy.base.taken + ')');
      const row = x => `${x.id}\tgain=${x.gain}\ttaken=${x.taken}\tpproj=${x.pp}`;
      const so = sy.solo.slice().sort((a, b) => b.gain - a.gain);
      L.push('', '### Top 40 solo items', ...so.slice(0, 40).map(row));
      L.push('', '### Bottom 40 solo items (dead or harmful)', ...so.slice(-40).map(row));
      if (sy.pairs.length) {
        const ps = sy.pairs.slice().sort((a, b) => b.ratio - a.ratio);
        L.push('', '### Pairs with the strongest super-additive synergy (ratio = pair gain / sum of solo gains)', ...ps.slice(0, 30).map(x => `${x.a}+${x.b}\tgain=${x.gain}\tratio=${x.ratio}`));
        const an = sy.pairs.filter(x => x.ratio > 0).sort((a, b) => a.ratio - b.ratio);
        L.push('', '### Pairs that cancel out (lowest ratio)', ...an.slice(0, 30).map(x => `${x.a}+${x.b}\tgain=${x.gain}\tratio=${x.ratio}`));
        L.push('', '### Strongest pairs overall', ...sy.pairs.slice().sort((a, b) => b.gain - a.gain).slice(0, 20).map(x => `${x.a}+${x.b}\tgain=${x.gain}\tratio=${x.ratio}`));
      }
    }
    L.push(...diffLines());
    return L.join('\n');
  }

  async function run(){
    $('run').disabled = true; $('log').textContent = '';
    results.stages = []; results.enemies = []; results.bosses = []; results.items = {}; results.problems = []; results.synergy = null;
    const opts = { classId: $('cls').value, seconds: +$('secs').value || 15, quick: $('quick').checked, stage: $('stage').value.trim(), synergy: $('syn').checked, boss: $('boss').checked, bossSeconds: +$('bosssecs').value || 45, classCount: +$('clscount').value || 1, real: $('real').checked, move: $('move').checked, synSeconds: +$('synsecs').value || 6, pairTop: +$('pairtop').value || 0 };
    results.meta = { date: new Date().toISOString(), opts, enemyTypes: Object.keys(ENEMY_TYPES).length };
    try { staticAudit(); log('static enemy audit done'); } catch (e) { log('static audit error: ' + e); results.problems.push({ type: 'staticAuditError', msg: String(e) }); }
    try { itemAudit(); log('item audit done'); } catch (e) { log('item audit error: ' + e); results.problems.push({ type: 'itemAuditError', msg: String(e) }); }
    if ($('sim').checked) { try { await enemyLab(opts); } catch (e) { log('sim error: ' + e); results.problems.push({ type: 'simError', msg: String(e) }); } }
    if (opts.boss) { try { await bossLab(opts); } catch (e) { log('boss error: ' + e); results.problems.push({ type: 'bossLabError', msg: String(e && e.stack || e) }); } }
    if (opts.synergy) { try { await synergyLab(opts); } catch (e) { log('synergy error: ' + e); results.problems.push({ type: 'synergyError', msg: String(e && e.stack || e) }); } }
    const md = markdown();
    $('out').value = md + '\n\n```json\n' + JSON.stringify({ problems: results.problems, enemies: results.enemies, bosses: results.bosses, synergy: results.synergy }) + '\n```';
    log('finished. Copy the results box and send it.');
    $('run').disabled = false;
  }

  function init(){
    const sel = $('cls'); for (const c of Object.keys(CLASSES)) { const o = document.createElement('option'); o.value = c; o.textContent = c; sel.appendChild(o); }
    $('run').addEventListener('click', run);
    $('baseline').addEventListener('click', saveBaseline);
    $('download').addEventListener('click', download);
    $('copy').addEventListener('click', () => { $('out').select(); try { document.execCommand('copy'); } catch (e) {} });
  }
  return { bossLab, synergyLab, saveBaseline, simEnemy, makeGame, init, run, results, staticAudit, itemAudit, enemyLab, markdown };
})();
