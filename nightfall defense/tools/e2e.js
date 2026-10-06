'use strict';
const path = require('path');
const { execSync } = require('child_process');
const { chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));
const BASE = process.env.BASE || 'http://localhost:8804/';
const SHOTS = process.env.SHOTS || '';
const GAME = BASE + 'nightfall%20defense/index.html';

const results = [];
async function test(name, fn) {
  try { await fn(); results.push(['PASS', name]); }
  catch (err) { results.push(['FAIL', name, err.message]); }
}
function ok(cond, msg) { if (!cond) throw new Error(msg); }
function watch(page, errors) {
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text() + ' @ ' + ((m.location() || {}).url || '')); });
  page.on('pageerror', e => errors.push(String(e)));
  page.on('response', r => { if (r.status() >= 400) errors.push('HTTP ' + r.status() + ' ' + r.url()); });
  page.on('requestfailed', r => { if (/favicon/.test(r.url())) errors.push('request failed ' + r.url()); });
}

async function openGame(browser, viewport) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  watch(page, errors);
  await page.goto(GAME);
  await page.waitForTimeout(400);
  return { page, errors };
}

async function placeAt(page, race, wx, wy) {
  await page.click('.race[data-race="' + race + '"]');
  const box = await page.locator('#cv').boundingBox();
  const [sx, sy] = await page.evaluate(([x, y]) => NDRender.View.toScreen(x, y), [wx, wy]);
  await page.mouse.move(box.x + sx, box.y + sy);
  await page.mouse.click(box.x + sx, box.y + sy);
}

async function fastForward(page, maxSeconds) {
  return page.evaluate(sec => {
    const S = __nd.S;
    let t = 0;
    while (S.run && t < sec) { NDCore.step(S, 1 / 30); t += 1 / 30; }
    return t;
  }, maxSeconds);
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME || '/opt/pw-browsers/chromium',
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name + '.png') }); };

  await test('place, upgrade and win with every race; targeting rules', async () => {
    const { page, errors } = await openGame(browser, { width: 1280, height: 800 });
    await page.evaluate(() => { localStorage.clear(); __nd.S.cash = 5000; });
    await placeAt(page, 'earth', 600, 330);
    await placeAt(page, 'unicorn', 700, 470);
    await placeAt(page, 'pegasus', 800, 330);
    ok(await page.evaluate(() => __nd.S.towers.map(t => t.race).join()) === 'earth,unicorn,pegasus', 'three ponies placed');
    for (const id of [1, 2, 3]) {
      await page.evaluate(i => { __nd.ui.selId = i; __nd.ui.infoKey = ''; }, id);
      await page.waitForTimeout(200);
      await page.click('#info [data-act="node"][data-v="1"]');
      await page.waitForTimeout(150);
      await page.click('#info [data-act="inf"][data-v="dmg"]');
      await page.waitForTimeout(150);
    }
    const lv = await page.evaluate(() => __nd.S.towers.map(t => t.paths[1] + ':' + t.infD).join());
    ok(lv === '1:1,1:1,1:1', 'upgrades bought via panel, got ' + lv);
    await page.click('#startBtn');
    await fastForward(page, 300);
    await page.waitForTimeout(300);
    ok(await page.evaluate(() => __nd.S.cleared) === 1, 'wave 1 cleared');
    const rules = await page.evaluate(() => {
      const C = NDCore;
      const mk = o => Object.assign({ alive: true, burrowT: 0, d: 500, flying: false, magical: false, dispelT: 0 }, o);
      const fly = mk({ flying: true }), mag = mk({ magical: true });
      const tw = (race, paths) => C.computeStats({ race, paths, infD: 0, infR: 0 });
      return [
        C.canHit(tw('earth', [0, 0, 0, 0, 0]), mag), C.canHit(tw('earth', [0, 1, 0, 0, 0]), mag), C.canHit(tw('earth', [0, 1, 0, 0, 0]), fly),
        C.canHit(tw('unicorn', [0, 0, 0, 0, 0]), fly), C.canHit(tw('unicorn', [0, 1, 0, 0, 0]), fly), C.canHit(tw('unicorn', [0, 0, 0, 0, 0]), mag),
        C.canHit(tw('pegasus', [0, 0, 0, 0, 0]), fly), C.canHit(tw('pegasus', [0, 0, 0, 0, 0]), mag),
      ].join();
    });
    ok(rules === 'false,true,false,false,true,true,true,false', 'targeting rules ' + rules);
    ok(!errors.length, 'console errors: ' + errors.join(' | '));
    await page.close();
  });

  await test('losing resets the wave but keeps progress; save survives reload', async () => {
    const { page, errors } = await openGame(browser, { width: 390, height: 844 });
    const before = await page.evaluate(() => {
      const S = __nd.S;
      S.cash = 1000;
      const t = NDCore.placeTower(S, 'unicorn', 300, 600);
      t.paths[2] = 3; t._s = null;
      S.cleared = 4; S.cash = 1234; S.sel = 5;
      NDCore.startWave(S, S.sel);
      return { towers: S.towers.length, cleared: S.cleared, n: S.run.n };
    });
    await page.evaluate(() => { __nd.S.run.lives = 1; });
    await fastForward(page, 400);
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => ({ towers: __nd.S.towers.length, cleared: __nd.S.cleared, cash: __nd.S.cash, run: !!__nd.S.run }));
    ok(!after.run, 'run ended');
    ok(after.cleared === before.cleared, 'cleared unchanged after loss');
    ok(after.towers === before.towers, 'towers kept after loss');
    ok(after.cash >= 1234, 'cash kept after loss');
    await page.evaluate(() => __nd.save());
    await page.reload();
    await page.waitForTimeout(400);
    const re = await page.evaluate(() => ({ p: __nd.S.towers[0] && __nd.S.towers[0].paths[2], towers: __nd.S.towers.length, cleared: __nd.S.cleared, cash: Math.floor(__nd.S.cash) }));
    ok(re.p === 3 && re.towers === after.towers && re.cleared === after.cleared && re.cash === Math.floor(after.cash), 'save restored ' + JSON.stringify(re));
    ok(!errors.length, 'console errors: ' + errors.join(' | '));
    await page.close();
  });

  await test('speed buttons, pause and space toggle change game time', async () => {
    const { page, errors } = await openGame(browser, { width: 1280, height: 800 });
    await page.evaluate(() => { const S = __nd.S; S.cash = 2000; NDCore.placeTower(S, 'earth', 600, 330); __nd.setSpeed(1); NDCore.startWave(S, 1); S.run.lives = 1e9; });
    const span = async ms => { const a = await page.evaluate(() => __nd.S.run ? __nd.S.run.t : -1); await page.waitForTimeout(ms); const b = await page.evaluate(() => __nd.S.run ? __nd.S.run.t : -1); return b - a; };
    const t1 = await span(600);
    await page.click('#speedBar [data-speed="4"]');
    ok(await page.evaluate(() => __nd.S.settings.speed) === 4, 'speed set to 4');
    ok(await page.locator('#speedBar [data-speed="4"].on').count() === 1, '4x button highlighted');
    const t4 = await span(600);
    ok(t1 > 0.2 && t4 > t1 * 2.2, 'game time 1x ' + t1.toFixed(2) + ' vs 4x ' + t4.toFixed(2));
    await page.click('#pauseBtn');
    ok(await page.evaluate(() => __nd.ui.paused) === true, 'paused by button');
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    const tp = await span(400);
    ok(tp === 0, 'no time passes while paused, got ' + tp);
    await page.keyboard.press('Space');
    ok(await page.evaluate(() => __nd.ui.paused) === false, 'space resumes during a wave');
    await page.keyboard.press('f');
    ok(await page.evaluate(() => __nd.S.settings.speed) === 1, 'F cycles 4x back to 1x');
    await page.keyboard.press('p');
    ok(await page.evaluate(() => __nd.ui.paused) === true, 'P pauses');
    await page.keyboard.press('p');
    await page.evaluate(() => { __nd.S.run.lives = 10; });
    await fastForward(page, 300);
    ok(!errors.length, 'console errors: ' + errors.join(' | '));
    await page.close();
  });

  await test('hotkeys 1/2/3, U, B, S and Shift; buy max; pip tooltip; per-pony stats', async () => {
    const { page, errors } = await openGame(browser, { width: 1280, height: 800 });
    await page.evaluate(() => { localStorage.clear(); const S = __nd.S; S.towers = []; S.cash = 400; __nd.refresh(); });
    await page.locator('#cv').hover();
    for (const [key, race] of [['1', 'earth'], ['2', 'unicorn'], ['3', 'pegasus']]) {
      await page.keyboard.press(key);
      ok(await page.evaluate(() => __nd.ui.placing) === race, 'hotkey ' + key + ' picks ' + race);
    }
    await page.keyboard.press('Escape');
    ok(await page.evaluate(() => __nd.ui.placing) === null, 'escape cancels placing');
    await placeAt(page, 'earth', 600, 330);
    await page.keyboard.press('Escape');
    await page.evaluate(() => { __nd.ui.selId = 0; __nd.ui.infoKey = ''; });
    const box = await page.locator('#cv').boundingBox();
    const [sx, sy] = await page.evaluate(() => NDRender.View.toScreen(600, 330));
    await page.mouse.move(box.x + sx + 2, box.y + sy + 1);
    await page.waitForTimeout(100);
    await page.keyboard.press('u');
    await page.waitForTimeout(250);
    const id = await page.evaluate(() => __nd.S.towers[0].id);
    ok(await page.evaluate(() => __nd.ui.selId) === id, 'U opens the hovered pony');
    ok(await page.locator('#info .maxbtn').count() === 1, 'upgrade max button shown');
    await page.locator('#info .pip').first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await page.locator('#info .pip').first().hover();
    await page.waitForTimeout(150);
    const tip = await page.evaluate(() => { const t = document.getElementById('tip'); return t.hidden ? '' : t.textContent; });
    ok(tip.length > 10, 'pip tooltip visible: ' + tip);
    ok(await page.locator('#info [data-tip]').count() >= 25, 'every node and button has a tooltip');
    await page.evaluate(() => { __nd.S.cash = 1e6; __nd.ui.infoKey = ''; });
    await page.waitForTimeout(250);
    const before = await page.evaluate(() => { const t = __nd.S.towers[0]; return t.infD + t.infR + t.paths.reduce((a, b) => a + b, 0); });
    await page.click('#info .maxbtn');
    await page.waitForTimeout(150);
    const mid = await page.evaluate(() => { const t = __nd.S.towers[0]; return { lv: t.infD + t.infR + t.paths.reduce((a, b) => a + b, 0), cash: __nd.S.cash }; });
    ok(mid.lv > before + 3 && mid.cash < 1e6, 'buy max bought ' + (mid.lv - before) + ' levels');
    const prev = await page.evaluate(t => NDCore.maxAffordablePreview(__nd.S, __nd.S.towers[0]).count, 0);
    ok(prev === 0, 'nothing affordable left after buy max, preview ' + prev);
    await page.evaluate(() => { __nd.S.cash += 5e5; });
    await page.keyboard.press('b');
    const after = await page.evaluate(() => { const t = __nd.S.towers[0]; return t.infD + t.infR + t.paths.reduce((a, b) => a + b, 0); });
    ok(after > mid.lv, 'B buys max too');
    await page.keyboard.down('Shift');
    ok(await page.evaluate(() => __nd.ui.showAll) === true, 'shift shows all ranges');
    await page.keyboard.up('Shift');
    ok(await page.evaluate(() => __nd.ui.showAll) === false, 'shift release hides ranges');
    await page.evaluate(() => { __nd.S.sel = 1; NDCore.startWave(__nd.S, 1); });
    let sawNum = false;
    for (let i = 0; i < 40 && !sawNum; i++) sawNum = await page.evaluate(() => { const S = __nd.S; for (let k = 0; k < 15 && S.run; k++) NDCore.step(S, 1 / 30); return S.fx.some(f => f.k === 'num'); });
    ok(sawNum, 'damage numbers spawned');
    await fastForward(page, 300);
    await page.waitForTimeout(700);
    const st = await page.evaluate(() => ({ dmg: __nd.S.towers[0].dmg, kills: __nd.S.towers[0].kills, dealt: document.getElementById('psDealt').textContent, rows: document.querySelectorAll('#ledger .lrow').length }));
    ok(st.dmg > 0 && st.kills > 0 && st.dealt && st.dealt !== '0', 'per-pony stats ' + JSON.stringify(st));
    ok(st.rows === 1, 'ledger lists the pony');
    await page.keyboard.press('s');
    ok(await page.evaluate(() => __nd.S.towers.length) === 1, 'first S only arms the sell');
    await page.keyboard.press('s');
    ok(await page.evaluate(() => __nd.S.towers.length) === 0, 'second S sells');
    ok(!errors.length, 'console errors: ' + errors.join(' | '));
    await page.close();
  });

  await test('bat and crystal ponies: hotkeys 4/5, shop, upgrades, crystal aura, bat vs flyers, stealth hook', async () => {
    const { page, errors } = await openGame(browser, { width: 1280, height: 800 });
    await page.evaluate(() => { localStorage.clear(); const S = __nd.S; S.towers = []; S.cash = 5000; __nd.refresh(); });
    await page.locator('#cv').hover();
    for (const [key, race] of [['4', 'bat'], ['5', 'crystal']]) {
      await page.keyboard.press(key);
      ok(await page.evaluate(() => __nd.ui.placing) === race, 'hotkey ' + key + ' picks ' + race);
    }
    await page.keyboard.press('Escape');
    const shop = await page.evaluate(() => [...document.querySelectorAll('.race')].map(b => b.dataset.race + ':' + (b.getBoundingClientRect().width > 0)).join());
    ok(/bat:true/.test(shop) && /crystal:true/.test(shop), 'shop shows bat and crystal ' + shop);
    await placeAt(page, 'bat', 600, 330);
    await placeAt(page, 'crystal', 700, 470);
    await page.keyboard.press('Escape');
    ok(await page.evaluate(() => __nd.S.towers.map(t => t.race).join()) === 'bat,crystal', 'bat and crystal placed from the shop');
    const costs = await page.evaluate(() => ({ bat: NDCore.nextTowerCost(__nd.S, 'bat'), base: NDCore.towerCost('bat', 0, NDCore.priceOf(NDCore.mapOf(__nd.S))) }));
    ok(costs.bat > costs.base, 'second bat costs more ' + JSON.stringify(costs));
    for (const id of [1, 2]) {
      await page.evaluate(i => { __nd.ui.selId = i; __nd.ui.infoKey = ''; }, id);
      await page.waitForTimeout(200);
      await page.click('#info [data-act="node"][data-v="1"]');
      await page.waitForTimeout(150);
      await page.click('#info [data-act="inf"][data-v="rate"]');
      await page.waitForTimeout(150);
    }
    const lv = await page.evaluate(() => __nd.S.towers.map(t => t.paths[1] + ':' + t.infR).join());
    ok(lv === '1:1,1:1', 'bat and crystal upgraded via panel, got ' + lv);
    const aura = await page.evaluate(() => {
      const C = NDCore, S = __nd.S, cr = S.towers[1];
      S.cash = 1e6;
      let nb = null;
      for (let r = 50; r <= 110 && !nb; r += 15) for (let a = 0; a < 6.28 && !nb; a += 0.4) {
        const x = cr.x + Math.cos(a) * r, y = cr.y + Math.sin(a) * r;
        if (C.canPlace(S, x, y)) nb = C.placeTower(S, 'earth', x, y);
      }
      if (!nb) return { placed: false };
      C.refreshBuffs(S);
      return { placed: true, dmg: nb.buff.dmg, rate: nb.buff.rate, eff: C.effDmg(nb), raw: C.stats(nb).dmg, self: cr.buff.dmg };
    });
    ok(aura.placed && aura.dmg > 0 && aura.rate > 0 && aura.eff > aura.raw && aura.self === 0, 'crystal aura buffs a neighbour ' + JSON.stringify(aura));
    const fly = await page.evaluate(() => {
      const C = NDCore, S = __nd.S, bat = S.towers[0];
      C.startWave(S, 1);
      S.run.queue = [];
      S.run.lives = 1e9;
      const list = [];
      for (let d = 20; d < S.run.map.maxLen; d += 30) { const e = C.spawnEnemy(S, S.run, 'flying', d); e.hp = e.hpMax = 1e12; e.speed = 0; list.push(e); }
      const before = bat.dmg;
      for (let i = 0; i < 90; i++) C.step(S, 1 / 30);
      const hit = list.some(e => e.hp < e.hpMax);
      const can = C.canHit(C.stats(bat), list[0]);
      const earthCan = C.canHit(C.stats(S.towers[2]), list[0]);
      S.run.enemies = []; S.run = null;
      return { hit, dealt: bat.dmg - before, can, earthCan };
    });
    ok(fly.hit && fly.dealt > 0 && fly.can && !fly.earthCan, 'bat hits flyers ' + JSON.stringify(fly));
    const stealth = await page.evaluate(() => {
      const C = NDCore, S = __nd.S;
      C.startWave(S, 1);
      S.run.queue = [];
      const e = C.spawnEnemy(S, S.run, 'basic', 300, { stealth: true });
      const tw = (race, paths, buff) => C.computeStats({ race, paths, infD: 0, infR: 0, buff });
      const out = [
        C.isHidden(e),
        C.canHit(tw('bat', [0, 0, 0, 0, 0]), e),
        C.canHit(tw('bat', [0, 1, 0, 0, 0]), e),
        C.canHit(tw('earth', [0, 0, 0, 0, 0]), e),
        C.canHit(tw('earth', [0, 0, 0, 0, 0], { dmg: 0, rate: 0, range: 0, detect: true }), e),
        tw('bat', [0, 5, 0, 0, 0]).detectR > 0,
      ];
      e.revealT = 1;
      out.push(C.isHidden(e), C.canHit(tw('earth', [0, 0, 0, 0, 0]), e));
      S.run.enemies = []; S.run = null;
      return out.join();
    });
    ok(stealth === 'true,false,true,false,true,true,false,true', 'stealth hook ' + stealth);
    ok(!errors.length, 'console errors: ' + errors.join(' | '));
    await page.close();
  });

  await test('wave preview, boss card and boss bar on wave 10', async () => {
    const { page, errors } = await openGame(browser, { width: 1280, height: 800 });
    await page.evaluate(() => { const S = __nd.S; S.cleared = 9; S.sel = 10; S.cash = 1e5; __nd.refresh(); });
    await page.waitForTimeout(300);
    const pv = await page.evaluate(() => ({ mx: document.querySelectorAll('#wInfo .mx canvas[data-dnb]').length, boss: document.querySelectorAll('#wInfo .bosscard').length, tl: document.querySelectorAll('#wInfo .tl i').length, n: NDCore.waveSpec(10, NDCore.mapOf(__nd.S)).list.length }));
    ok(pv.mx >= 2 && pv.boss === 1 && pv.tl === pv.n, 'preview ' + JSON.stringify(pv));
    await page.evaluate(() => {
      const S = __nd.S;
      NDCore.placeTower(S, 'earth', 600, 330);
      NDCore.startWave(S, 10); S.run.lives = 1e9;
      let k = 0;
      while (S.run && !NDCore.bossStatus(S.run) && k < 9000) { NDCore.step(S, 1 / 30); k++; }
    });
    await page.waitForTimeout(400);
    const bb = await page.evaluate(() => ({ st: !!NDCore.bossStatus(__nd.S.run), bar: NDRender.bossBar, cls: document.getElementById('board').classList.contains('bossfight'), up: !!document.querySelector('#wInfo .upnext') }));
    ok(bb.st && bb.bar && bb.cls, 'boss bar shown ' + JSON.stringify(bb));
    ok(bb.up, 'up next preview during a fresh run');
    await page.evaluate(() => { __nd.S.run.lives = 1; });
    await fastForward(page, 600);
    ok(!errors.length, 'console errors: ' + errors.join(' | '));
    await page.close();
  });

  await test('settings persist across reload at phone width', async () => {
    const { page, errors } = await openGame(browser, { width: 390, height: 844 });
    await page.click('#setBtn');
    ok(await page.evaluate(() => !document.getElementById('setModal').hidden), 'settings open');
    await page.click('label.opt:has(#optShake)');
    await page.click('label.opt:has(#optNums)');
    await page.click('label:has(input[value="sci"])');
    await page.locator('#optVol').fill('25');
    await page.click('#setClose');
    ok(await page.evaluate(() => document.getElementById('setModal').hidden), 'settings closed');
    await page.click('#muteBtn');
    const s1 = await page.evaluate(() => __nd.S.settings);
    ok(!s1.shake && !s1.dmgNums && s1.numFmt === 'sci' && !s1.sound && Math.abs(s1.vol - 0.25) < 0.01, 'settings applied ' + JSON.stringify(s1));
    const sci = await page.evaluate(() => NDCore.fmt(1.5e9));
    ok(/e/.test(sci), 'scientific format ' + sci);
    await page.reload();
    await page.waitForTimeout(400);
    const s2 = await page.evaluate(() => ({ s: __nd.S.settings, ver: JSON.parse(localStorage.getItem('nightfall-defense-save-v1')).ver, radio: document.querySelector('input[name="numFmt"][value="sci"]').checked }));
    ok(!s2.s.shake && !s2.s.dmgNums && s2.s.numFmt === 'sci' && !s2.s.sound && s2.radio, 'settings survived reload ' + JSON.stringify(s2));
    ok(s2.ver === 8, 'save has ver 8, got ' + s2.ver);
    await page.click('#setBtn');
    await page.click('#setReset');
    await page.keyboard.press('Escape');
    ok(await page.evaluate(() => __nd.S.settings.shake && __nd.S.settings.numFmt === 'short'), 'defaults restored');
    const ov = await page.evaluate(() => document.documentElement.scrollWidth);
    ok(ov <= 390, 'no horizontal scroll at 390px, width ' + ov);
    ok(!errors.length, 'console errors: ' + errors.join(' | '));
    await page.close();
  });

  await test('old v1 save loads and migrates', async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    await page.addInitScript(s => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('nightfall-defense-save-v1', s); } }, JSON.stringify({
      v: 1, cash: 777, cleared: 12, sel: 13, auto: false, nextId: 3, totalKills: 456,
      towers: [{ id: 1, race: 'earth', x: 600, y: 330, spent: 90, paths: [2, 0, 0, 1, 0], infD: 1, infR: 0, mode: 'strong', kills: 50 },
        { id: 2, race: 'pegasus', x: 800, y: 470, spent: 140, paths: [0, 0, 3, 0, 0], infD: 0, infR: 2, mode: 'first', kills: 70 }],
    }));
    watch(page, errors);
    await page.goto(GAME);
    await page.waitForTimeout(500);
    const m = await page.evaluate(() => { const S = __nd.S; return { cash: Math.floor(S.cash), cleared: S.cleared, n: S.towers.length, p: S.towers[0].paths.join(), mode: S.towers[0].mode, dmg: S.towers[1].dmg, map: S.map, set: !!S.settings && S.settings.speed }; });
    ok(m.cash === 777 && m.cleared === 12 && m.n === 2 && m.p === '2,0,0,1,0' && m.mode === 'strong' && m.dmg === 0 && m.map === 'moonlit' && m.set === 1, 'migrated ' + JSON.stringify(m));
    await page.evaluate(() => __nd.save());
    const ver = await page.evaluate(() => { const o = JSON.parse(localStorage.getItem('nightfall-defense-save-v1')); return o.ver + ':' + ('v' in o); });
    ok(ver === '8:false', 'resaved as ver 8, got ' + ver);
    ok(!errors.length, 'console errors: ' + errors.join(' | '));
    await page.close();
  });

  await test('old v2 save moves onto the Moonlit Road board', async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    await page.addInitScript(s => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('nightfall-defense-save-v1', s); } }, JSON.stringify({
      ver: 2, map: 'moonlit', seed: 99, cash: 4321, cleared: 57, sel: 58, auto: true, nextId: 5, totalKills: 900,
      stats: { played: 70, dmg: 1e6, bossKills: 5, earned: 5e5 }, settings: { speed: 2, sound: false, vol: 0.4, shake: true, dmgNums: true, numFmt: 'short' },
      towers: [{ id: 4, race: 'unicorn', x: 700, y: 300, spent: 900, paths: [3, 0, 2, 0, 0], infD: 2, infR: 1, mode: 'last', kills: 40, dmg: 5000 }],
    }));
    watch(page, errors);
    await page.goto(GAME);
    await page.waitForTimeout(500);
    const m = await page.evaluate(() => { const S = __nd.S; return { map: S.map, cash: Math.floor(S.cash), cleared: S.cleared, sel: S.sel, auto: S.auto, n: S.towers.length, p: S.towers[0].paths.join(), mode: S.towers[0].mode, dmg: S.towers[0].dmg, played: S.stats.played, speed: S.settings.speed, woods: NDCore.mapUnlocked(S, 'woods'), caverns: NDCore.mapUnlocked(S, 'caverns') }; });
    ok(m.map === 'moonlit' && m.cash === 4321 && m.cleared === 57 && m.sel === 58 && m.auto === true && m.n === 1 && m.p === '3,0,2,0,0' && m.mode === 'last' && m.dmg === 5000 && m.played === 70 && m.speed === 2, 'migrated ' + JSON.stringify(m));
    ok(m.woods && !m.caverns, 'wave 57 on map 1 unlocks map 2 only');
    await page.evaluate(() => __nd.save());
    const o = await page.evaluate(() => JSON.parse(localStorage.getItem('nightfall-defense-save-v1')));
    ok(o.ver === 8 && o.codex && o.boards && o.boards.moonlit && o.boards.moonlit.cleared === 57 && o.boards.moonlit.towers.length === 1 && !('towers' in o), 'ver 8 layout ' + JSON.stringify(Object.keys(o)));
    ok(!errors.length, 'console errors: ' + errors.join(' | '));
    await page.close();
  });

  await test('map select at phone width: previews, locks, unlock, switch and return', async () => {
    const { page, errors } = await openGame(browser, { width: 390, height: 844 });
    await page.evaluate(() => { localStorage.clear(); });
    await page.reload();
    await page.waitForTimeout(400);
    await page.evaluate(() => { const S = __nd.S; S.cash = 5000; S.cleared = 49; S.sel = 49; __nd.refresh(); });
    await placeAt(page, 'earth', 600, 330);
    await page.keyboard.press('Escape');
    ok(await page.evaluate(() => __nd.S.towers.length) === 1, 'pony placed on map 1');
    await page.click('#mapBtn');
    await page.waitForTimeout(250);
    const m1 = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#mapList .mapcard')];
      const painted = cards.map(c => { const cv = c.querySelector('canvas'); const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let n = 0; for (let i = 3; i < d.length; i += 40) if (d[i] > 0) n++; return n; });
      return { open: !document.getElementById('mapModal').hidden, n: cards.length, locked: cards.filter(c => c.classList.contains('locked')).length, on: cards.findIndex(c => c.classList.contains('on')), painted: Math.min(...painted), best: cards[0].querySelector('.mb').textContent, sw: document.documentElement.scrollWidth, dw: document.querySelector('#mapModal .dialog').getBoundingClientRect().width };
    });
    ok(m1.open && m1.n === 5 && m1.locked === 4 && m1.on === 0, 'modal ' + JSON.stringify(m1));
    ok(m1.painted > 100, 'every preview is drawn, min painted ' + m1.painted);
    ok(m1.best === 'Best 49 / 100', 'best wave shown: ' + m1.best);
    ok(m1.sw <= 390 && m1.dw <= 390, 'modal fits 390px ' + JSON.stringify(m1));
    await shot(page, 'maps-locked-390');
    await page.click('#mapList .mapcard[data-map="woods"]', { force: true });
    await page.waitForTimeout(200);
    ok(await page.evaluate(() => __nd.S.map) === 'moonlit', 'locked map cannot be chosen');
    ok(/Clear wave 50/.test(await page.evaluate(() => document.getElementById('banner').textContent)), 'locked map explains itself');
    await page.click('#mapClose');
    await page.evaluate(() => {
      const S = __nd.S; S.towers[0].paths[0] = 2; S.towers[0]._s = null;
      S.cash = 1e6; NDCore.placeTower(S, 'pegasus', 600, 480); S.cash = 1e6;
      NDCore.startWave(S, 50); S.run.lives = 1e9;
      for (const t of S.towers) { t.infD = 60; t.paths[1] = 1; t._s = null; }
      let k = 0;
      while (S.run && k < 60000) { NDCore.step(S, 1 / 30); k++; }
    });
    await page.waitForTimeout(3200);
    const won = await page.evaluate(() => ({ cleared: __nd.S.cleared, unlocked: NDCore.mapUnlocked(__nd.S, 'woods'), banner: document.getElementById('banner').textContent, pulse: document.getElementById('mapBtn').classList.contains('pulse') }));
    ok(won.cleared === 50 && won.unlocked, 'wave 50 unlocks map 2 ' + JSON.stringify(won));
    ok(/Whispering Woods is now unlocked/.test(won.banner) && won.pulse, 'unlock banner and pulsing map button ' + JSON.stringify(won));
    const moon = await page.evaluate(() => ({ cash: __nd.S.cash, n: __nd.S.towers.length, p: __nd.S.towers[0].paths.join() }));
    await page.click('#mapBtn');
    await page.waitForTimeout(250);
    ok(await page.locator('#mapList .mapcard.locked').count() === 3, 'three maps still locked');
    await page.click('#mapList .mapcard[data-map="woods"]');
    await page.waitForTimeout(300);
    await page.waitForFunction(() => /Whispering/.test(document.getElementById('mapName').textContent), null, { timeout: 5000 }).catch(() => {});
    const w = await page.evaluate(() => ({ map: __nd.S.map, n: __nd.S.towers.length, cleared: __nd.S.cleared, cash: __nd.S.cash, start: NDCore.mapStartCash(NDCore.MAPS.woods), modal: document.getElementById('mapModal').hidden, name: document.getElementById('mapName').textContent }));
    ok(w.map === 'woods' && w.n === 0 && w.cleared === 0 && w.cash === w.start && w.modal && /Whispering Woods/.test(w.name), 'fresh woods board ' + JSON.stringify(w));
    const tree = await page.evaluate(() => { const b = NDCore.MAPS.woods.blocks[0]; return [b.x, b.y]; });
    await placeAt(page, 'earth', tree[0], tree[1]);
    await page.waitForTimeout(100);
    const deny = await page.evaluate(() => ({ n: __nd.S.towers.length, banner: document.getElementById('banner').textContent }));
    ok(deny.n === 0 && /tree/i.test(deny.banner), 'trees block building ' + JSON.stringify(deny));
    await page.keyboard.press('Escape');
    const spot = await page.evaluate(() => { const S = __nd.S; let best = null, bd = 1e18; for (let y = 40; y < 760; y += 10) for (let x = 40; x < 1360; x += 10) { const d = (x - 700) ** 2 + (y - 400) ** 2; if (d < bd && NDCore.canPlace(S, x, y)) { bd = d; best = [x, y]; } } return best; });
    await placeAt(page, 'unicorn', spot[0], spot[1]);
    await page.keyboard.press('Escape');
    ok(await page.evaluate(() => __nd.S.towers.length) === 1, 'pony placed on woods');
    await page.evaluate(() => { NDCore.startWave(__nd.S, 1); __nd.S.run.lives = 1e9; });
    await page.waitForTimeout(600);
    await shot(page, 'woods-390');
    await page.evaluate(() => { const S = __nd.S; while (S.run) NDCore.step(S, 1 / 30); });
    await page.click('#mapBtn');
    await page.waitForTimeout(200);
    await page.click('#mapList .mapcard[data-map="moonlit"]');
    await page.waitForTimeout(300);
    const back = await page.evaluate(() => ({ map: __nd.S.map, cash: __nd.S.cash, n: __nd.S.towers.length, p: __nd.S.towers[0].paths.join(), cleared: __nd.S.cleared, woods: NDCore.mapCleared(__nd.S, 'woods') }));
    ok(back.map === 'moonlit' && back.cash === moon.cash && back.n === moon.n && back.p === moon.p && back.cleared === 50 && back.woods === 1, 'map 1 board restored ' + JSON.stringify(back) + ' vs ' + JSON.stringify(moon));
    await page.evaluate(() => __nd.save());
    await page.reload();
    await page.waitForTimeout(500);
    const re = await page.evaluate(() => ({ map: __nd.S.map, n: __nd.S.towers.length, woodsN: NDCore.boardOf(__nd.S, 'woods').towers.length, woods: NDCore.mapCleared(__nd.S, 'woods') }));
    ok(re.map === 'moonlit' && re.n === moon.n && re.woodsN === 1 && re.woods === 1, 'both boards survive reload ' + JSON.stringify(re));
    const ov = await page.evaluate(() => document.documentElement.scrollWidth);
    ok(ov <= 390, 'no horizontal scroll at 390px, width ' + ov);
    ok(!errors.length, 'console errors: ' + errors.join(' | '));
    await page.close();
  });

  await test('every map renders and plays: forks, darkness, bridge and wind, two gates', async () => {
    const { page, errors } = await openGame(browser, { width: 1280, height: 800 });
    await page.evaluate(() => { localStorage.clear(); });
    await page.reload();
    await page.waitForTimeout(400);
    const out = {};
    for (const id of ['moonlit', 'woods', 'caverns', 'cliffs', 'castle']) {
      const r = await page.evaluate(id => {
        const C = NDCore, S = __nd.S;
        S.cleared = Math.max(S.cleared, 50);
        __nd.chooseMap(id);
        S.cash = 1e300;
        const spots = [];
        for (let y = 30; y < 780 && spots.length < 18; y += 37) for (let x = 30; x < 1380 && spots.length < 18; x += 53) if (C.canPlace(S, x, y)) { const t = C.placeTower(S, C.RACE_IDS[spots.length % 5], x, y); if (t) { spots.push(t); t.infD = 40; t.paths[1] = 2; t._s = null; } }
        const n = id === 'cliffs' ? 14 : 20;
        S.cleared = n - 1; S.sel = n;
        C.startWave(S, n); S.run.lives = 1e9;
        const paths = new Set(); let gust = 0, warn = 0, k = 0;
        while (S.run && S.run.t < 40 && k < 4000) {
          C.step(S, 1 / 30); k++;
          if (!S.run) break;
          for (const e of S.run.enemies) paths.add(e.path);
          if (S.run.gustOn) gust++; if (S.run.gustWarn > 0) warn++;
        }
        const dark = S.towers.filter(t => C.stats(t).baseRange).length;
        return { map: S.map, towers: S.towers.length, paths: paths.size, gust, warn, dark, lit: S.towers.length - dark, bridges: (C.MAPS[id].bridges || []).length, run: !!S.run };
      }, id);
      await page.waitForTimeout(250);
      if (id === 'cliffs') {
        await page.evaluate(() => { const S = __nd.S; let k = 0; while (S.run && !S.run.gustOn && k < 4000) { NDCore.step(S, 1 / 30); k++; } });
        await page.waitForTimeout(150);
      }
      if (id === 'caverns') await page.evaluate(() => { const t = __nd.S.towers.find(q => NDCore.stats(q).baseRange); if (t) __nd.ui.selId = t.id; });
      await page.waitForTimeout(150);
      await shot(page, 'map-' + id);
      await page.evaluate(() => { __nd.ui.selId = 0; const S = __nd.S; if (S.run) S.run.lives = 1e9; let k = 0; while (S.run && k < 40000) { NDCore.step(S, 1 / 10); k++; } S.cleared = Math.max(S.cleared, 50); });
      out[id] = r;
    }
    ok(Object.values(out).every(r => r.towers >= 6), 'towers placed on every map ' + JSON.stringify(out));
    ok(out.caverns.paths === 2 && out.castle.paths === 2 && out.moonlit.paths === 1, 'forks and twin gates use both routes ' + JSON.stringify(out));
    ok(out.caverns.dark > 0 && out.caverns.lit > 0 && out.moonlit.dark === 0, 'crystal light splits caverns ponies ' + JSON.stringify(out.caverns));
    ok(out.cliffs.bridges >= 1 && out.cliffs.warn > 0 && out.cliffs.gust > 0, 'cliffs bridge and gusts ' + JSON.stringify(out.cliffs));
    ok(await page.evaluate(() => NDCore.MAP_IDS.every(id => NDCore.mapUnlocked(__nd.S, id))), 'all maps unlocked in a chain');
    ok(!errors.length, 'console errors: ' + errors.join(' | '));
    await page.close();
  });

  await test('new DNBs: lurker untargetable without detection, splitter splits on its path, shields and plate', async () => {
    const { page, errors } = await openGame(browser, { width: 1280, height: 800 });
    const r = await page.evaluate(() => {
      const C = NDCore, S = __nd.S;
      localStorage.clear();
      S.towers = []; S.cash = 1e9; S.cleared = 40;
      C.startWave(S, 30);
      S.run.queue = []; S.run.lives = 1e9;
      const lurk = C.spawnEnemy(S, S.run, 'stealth', 300);
      lurk.hp = lurk.hpMax = 1e9; lurk.speed = 0;
      const tw = (race, paths) => C.computeStats({ race, paths, infD: 0, infR: 0, buff: { dmg: 0, rate: 0, range: 0 } });
      const out = { hidden: C.isHidden(lurk), earth: C.canHit(tw('earth', [0, 0, 0, 0, 0]), lurk), echo: C.canHit(tw('bat', [0, 2, 0, 0, 0]), lurk) };
      let earth = null;
      for (let rr = 40; rr <= 90 && !earth; rr += 10) for (let a = 0; a < 6.28 && !earth; a += 0.3) { const x = lurk.x + Math.cos(a) * rr, y = lurk.y + Math.sin(a) * rr; if (C.canPlace(S, x, y)) earth = C.placeTower(S, 'earth', x, y); }
      out.placed = !!earth;
      for (let i = 0; i < 90; i++) C.step(S, 1 / 30);
      out.dealtHidden = lurk.hpMax - lurk.hp;
      lurk.revealT = 2;
      for (let i = 0; i < 45; i++) C.step(S, 1 / 30);
      out.dealtRevealed = lurk.hpMax - lurk.hp;
      S.run.enemies = []; S.towers = [];
      const sp = C.spawnEnemy(S, S.run, 'splitter', 260);
      const d0 = sp.d, p0 = sp.path;
      C.kill(S, S.run, sp, null);
      const minis = S.run.enemies.filter(e => e.alive && e.type === 'mini');
      out.minis = minis.length;
      out.sameSpot = minis.every(m => m.path === p0 && Math.abs(m.d - d0) < 40);
      const sh = C.spawnEnemy(S, S.run, 'shield', 400);
      const bud = C.spawnEnemy(S, S.run, 'basic', 410);
      for (let i = 0; i < 30; i++) C.step(S, 1 / 30);
      out.bubble = bud.sh > 0;
      const ar = C.spawnEnemy(S, S.run, 'armored', 500);
      const h0 = ar.hp; C.damage(S, S.run, ar, ar.plate * 0.5, null);
      out.plate = ar.plate > 0 && (h0 - ar.hp) < ar.plate * 0.5;
      out.codex = ['stealth', 'splitter', 'mini', 'shield', 'armored'].every(k => S.codex.e[k]);
      S.run.enemies = []; S.run = null;
      return out;
    });
    ok(r.hidden && !r.earth && r.echo, 'lurker detection rules ' + JSON.stringify(r));
    ok(r.placed && r.dealtHidden === 0 && r.dealtRevealed > 0, 'earth pony cannot hit an unseen lurker but can once revealed ' + JSON.stringify(r));
    ok(r.minis >= 2 && r.minis <= 3 && r.sameSpot, 'splitter leaves 2-3 pieces where it fell ' + JSON.stringify(r));
    ok(r.bubble && r.plate && r.codex, 'shield bubble, armor plate and codex unlocks ' + JSON.stringify(r));
    ok(!errors.length, 'console errors: ' + errors.join(' | '));
    await page.close();
  });

  for (const vp of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    await test('codex unlocks on first sight and opens at ' + vp.width, async () => {
      const { page, errors } = await openGame(browser, vp);
      await page.evaluate(() => { localStorage.clear(); });
      await page.reload();
      await page.waitForTimeout(400);
      const before = await page.evaluate(() => ({ e: Object.keys(__nd.S.codex.e).length, healer: !!__nd.S.codex.e.healer }));
      await page.evaluate(() => {
        const C = NDCore, S = __nd.S;
        S.cleared = 20;
        C.startWave(S, 20);
        S.run.queue = []; S.run.lives = 1e9;
        C.spawnEnemy(S, S.run, 'healer', 200);
      });
      await page.waitForTimeout(500);
      const toast = await page.evaluate(() => ({ cls: document.getElementById('codexToast').className, txt: document.getElementById('codexToast').textContent, pulse: document.getElementById('codexBtn').classList.contains('pulse'), healer: !!__nd.S.codex.e.healer }));
      ok(!before.healer && toast.healer && /show/.test(toast.cls) && /Healer|Mender/i.test(toast.txt) && toast.pulse, 'codex unlock toast ' + JSON.stringify(toast));
      const saved = await page.evaluate(() => { __nd.save && __nd.save(); const o = JSON.parse(localStorage.getItem('nightfall-defense-save-v1') || '{}'); return { ver: o.ver, healer: !!(o.codex && o.codex.e && o.codex.e.healer) }; });
      await page.evaluate(() => { const S = __nd.S; if (S.run) { S.run.enemies = []; S.run.queue = []; } });
      await page.locator('#codexBtn').scrollIntoViewIfNeeded();
      await page.click('#codexBtn');
      await page.waitForTimeout(300);
      const m = await page.evaluate(() => {
        const box = document.querySelector('#codexModal .modal, #codexModal > *');
        const r = box ? box.getBoundingClientRect() : { left: 0, right: 0 };
        return {
          open: !document.getElementById('codexModal').hidden,
          cells: document.querySelectorAll('#codexGrid .cx').length,
          locked: document.querySelectorAll('#codexGrid .cx.locked').length,
          known: document.querySelectorAll('#codexGrid .cx:not(.locked)').length,
          count: document.getElementById('codexCount').textContent,
          fits: r.left >= -1 && r.right <= innerWidth + 1,
          scrollX: document.documentElement.scrollWidth <= innerWidth + 1,
        };
      });
      ok(m.open && m.cells >= 13 && m.known >= 1 && m.locked >= 1 && m.fits && m.scrollX, 'codex modal ' + JSON.stringify(m));
      await page.click('#codexGrid .cx[data-cx="e:healer"]');
      await page.waitForTimeout(200);
      const det = await page.evaluate(() => ({ txt: document.getElementById('codexDetail').textContent, art: !!document.querySelector('#codexDetail canvas') }));
      ok(/Healer|Mender/i.test(det.txt) && /weak|counter/i.test(det.txt) && det.art, 'codex detail shows art, weakness and counters ' + det.txt.slice(0, 160));
      await page.click('#codexTabs [data-tab="b"]');
      await page.waitForTimeout(200);
      const bosses = await page.evaluate(() => ({ cells: document.querySelectorAll('#codexGrid .cx').length, locked: document.querySelectorAll('#codexGrid .cx.locked').length }));
      ok(bosses.cells === 50 && bosses.locked >= 49, 'boss tab lists all 50 bosses ' + JSON.stringify(bosses));
      await shot(page, 'codex-' + vp.width);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(150);
      ok(await page.evaluate(() => document.getElementById('codexModal').hidden), 'escape closes the codex');
      ok(saved.ver === 8 && saved.healer, 'codex persists in the save ' + JSON.stringify(saved));
      ok(!errors.length, 'console errors: ' + errors.join(' | '));
      await page.close();
    });
  }

  await test('wave preview lists the new DNB types', async () => {
    const { page, errors } = await openGame(browser, { width: 1280, height: 800 });
    const pv = await page.evaluate(() => {
      const S = __nd.S, C = NDCore, map = C.mapOf(S);
      let n = 0;
      for (let k = 30; k <= 49 && !n; k++) { const sp = C.waveSpec(k, map); if (!sp.boss && ['healer', 'stealth', 'shield', 'armored', 'burrower', 'splitter', 'swarm'].filter(t => sp.counts[t]).length >= 3) n = k; }
      S.cleared = Math.max(S.cleared, n - 1); S.sel = n; __nd.refresh();
      return n;
    });
    await page.waitForTimeout(300);
    const types = await page.evaluate(() => [...document.querySelectorAll('#wInfo .mx canvas[data-dnb]')].map(c => c.dataset.dnb));
    ok(pv > 0 && types.filter(t => ['healer', 'stealth', 'shield', 'armored', 'burrower', 'splitter', 'swarm'].includes(t)).length >= 3, 'preview of wave ' + pv + ' shows new types ' + types.join());
    ok(!errors.length, 'console errors: ' + errors.join(' | '));
    await page.close();
  });

  await test('star up after wave 100: confirm lists resets, map resets, Moonstones and stars shown', async () => {
    const { page, errors } = await openGame(browser, { width: 1280, height: 800 });
    const pre = await page.evaluate(() => {
      const S = __nd.S, C = NDCore;
      S.cash = 9000;
      C.placeTower(S, 'earth', 600, 330);
      C.placeTower(S, 'unicorn', 700, 470);
      S.boards.woods = C.newBoard(C.MAPS.woods, S);
      S.boards.woods.cleared = 30;
      S.records.firsts = { 5: 1 };
      return { ok: __nd.forceClear(100), btn: document.getElementById('starBtn').hidden, n: S.towers.length };
    });
    await page.waitForTimeout(300);
    ok(pre.ok && pre.n === 2, 'setup ' + JSON.stringify(pre));
    ok(await page.evaluate(() => !document.getElementById('starBtn').hidden && /1/.test(document.getElementById('starBtn').textContent)), 'star up button appears after wave 100');
    await page.click('#starBtn');
    await page.waitForTimeout(200);
    const dlg = await page.evaluate(() => ({ open: !document.getElementById('starModal').hidden, resets: document.getElementById('starResets').textContent, body: document.getElementById('starBody').textContent }));
    ok(dlg.open && /2 ponies/.test(dlg.resets) && /Cash/.test(dlg.resets) && /Wave progress/.test(dlg.resets) && /First-clear records/.test(dlg.resets), 'confirm lists resets ' + dlg.resets);
    ok(/\+20 Moonstones/.test(dlg.body) && /Armored bosses/.test(dlg.body) && /Other maps, research/.test(dlg.body), 'confirm lists gains ' + dlg.body.slice(0, 300));
    await page.click('#starCancel');
    await page.waitForTimeout(150);
    ok(await page.evaluate(() => document.getElementById('starModal').hidden && NDCore.starOf(__nd.S) === 0 && __nd.S.towers.length === 2), 'cancel keeps everything');
    await page.click('#starBtn');
    await page.waitForTimeout(150);
    await page.click('#starConfirm');
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => {
      const S = __nd.S, C = NDCore;
      return {
        star: C.starOf(S), towers: S.towers.length, cleared: S.cleared, sel: S.sel, cash: S.cash, start: C.mapStartCash(C.MAPS.moonlit, S), firsts: Object.keys(S.records.firsts).length,
        moon: S.moon, hMoon: document.getElementById('hMoon').textContent, hStars: document.getElementById('hStars').textContent, chipTip: document.getElementById('hStarChip').dataset.tip,
        burst: document.getElementById('starBurst').className, mods: document.getElementById('starMods').textContent, btn: document.getElementById('starBtn').hidden,
        woods: S.boards.woods.cleared, research: Object.keys(S.research).length, modal: document.getElementById('starModal').hidden, banner: document.getElementById('banner').textContent,
      };
    });
    ok(after.star === 1 && after.towers === 0 && after.cleared === 0 && after.sel === 1 && after.cash === after.start && after.firsts === 0 && after.modal, 'map board reset ' + JSON.stringify(after));
    ok(after.moon === 20 && after.hMoon === '20' && /1/.test(after.hStars) && /Armored bosses/.test(after.chipTip), 'HUD shows Moonstones and stars ' + JSON.stringify(after));
    ok(/show/.test(after.burst) && /1★/.test(after.banner), 'celebration plays ' + after.burst + ' / ' + after.banner);
    ok(/Armored bosses/.test(after.mods) && after.btn, 'wave box shows the active modifier ' + after.mods);
    ok(after.woods === 30 && after.research === 0, 'other maps and research untouched');
    const run = await page.evaluate(() => {
      const S = __nd.S, C = NDCore;
      S.cleared = 9; S.sel = 10; S.cash = 1e6;
      C.placeTower(S, 'earth', 600, 330);
      C.startWave(S, 10);
      let boss = null, t = 0;
      while (S.run && !boss && t < 120) { C.step(S, 1 / 30); t += 1 / 30; boss = S.run && S.run.enemies.find(e => e.boss); }
      const r = { hp: S.run && S.run.hpMul, cash: S.run && S.run.clearMul, lives: S.run && S.run.livesMax, plate: boss ? boss.starPlate : -1 };
      S.run = null; S.cleared = 0; S.sel = 1; S.towers.length = 0; S.cash = C.mapStartCash(C.MAPS.moonlit, S);
      return r;
    });
    ok(Math.abs(run.hp - 1.19) < 1e-9 && run.cash > 1.2 && run.lives === 10 && run.plate > 0, '1 star scales HP, rewards and plates bosses ' + JSON.stringify(run));
    await page.evaluate(() => __nd.openMaps());
    await page.waitForTimeout(250);
    const card = await page.evaluate(() => { const c = document.querySelector('.mapcard[data-map="moonlit"]'); return { lit: c.querySelectorAll('.mstars b').length, cls: c.className, mods: c.querySelector('.smods') ? c.querySelector('.smods').textContent : '' }; });
    ok(card.lit === 1 && /starred/.test(card.cls) && /Plated/.test(card.mods), 'map card shows 1 glowing star and modifiers ' + JSON.stringify(card));
    await shot(page, 'maps-star-1280');
    await page.evaluate(() => __nd.closeMaps());
    await page.evaluate(() => __nd.save());
    const saved = await page.evaluate(() => { const o = JSON.parse(localStorage.getItem('nightfall-defense-save-v1')); return { ver: o.ver, star: o.stars.moonlit, moon: o.moon, preset: (o.presets.moonlit || []).length }; });
    ok(saved.ver === 8 && saved.star === 1 && saved.moon === 20 && saved.preset === 2, 'stars, Moonstones and preset saved ' + JSON.stringify(saved));
    ok(!errors.length, 'console errors: ' + errors.join(' | '));
    await page.close();
  });

  await test('research purchase applies its effect; research and star dialogs fit 390px', async () => {
    const { page, errors } = await openGame(browser, { width: 390, height: 844 });
    const pre = await page.evaluate(() => {
      const S = __nd.S, C = NDCore;
      S.cash = 5000;
      const t = C.placeTower(S, 'earth', 600, 330);
      __nd.grantMoon(30);
      return { dmg: C.stats(S.towers[0]).dmg, moon: S.moon, placed: !!t };
    });
    await page.waitForTimeout(300);
    ok(await page.evaluate(() => document.getElementById('hMoon').textContent) === '30', 'HUD shows granted Moonstones');
    await page.click('#researchBtn');
    await page.waitForTimeout(250);
    const tree = await page.evaluate(() => ({
      open: !document.getElementById('researchModal').hidden, nodes: document.querySelectorAll('#resTree .rnode').length, branches: document.querySelectorAll('#resTree .rbranch').length,
      lines: document.querySelectorAll('#resTree line').length, locked: document.querySelector('[data-res="pony_cheap"]').className, afford: document.querySelector('[data-res="pony_dmg"]').className,
      tip: document.querySelector('[data-res="pony_dmg"]').dataset.tip, moon: document.getElementById('resMoon').textContent,
    }));
    ok(tree.open && tree.nodes === 34 && tree.branches === 4 && tree.lines >= 26, 'tree drawn ' + JSON.stringify(tree));
    ok(/locked/.test(tree.locked) && /afford/.test(tree.afford) && /\+10% damage/.test(tree.tip) && /30/.test(tree.moon), 'node states and tooltip ' + JSON.stringify(tree));
    await page.click('[data-res="pony_cheap"]', { force: true });
    await page.click('[data-res="pony_dmg"]');
    await page.waitForTimeout(150);
    await page.click('[data-res="util_lives"]');
    await page.waitForTimeout(250);
    const post = await page.evaluate(() => {
      const S = __nd.S, C = NDCore;
      return { dmg: C.stats(S.towers[0]).dmg, moon: S.moon, lv: S.research.pony_dmg, cheap: S.research.pony_cheap || 0, lives: C.livesFor(S), cls: document.querySelector('[data-res="pony_cheap"]').className, resMoon: document.getElementById('resMoon').textContent };
    });
    ok(post.lv === 1 && post.cheap === 0 && post.moon === 22 && /22/.test(post.resMoon), 'purchase spends Moonstones ' + JSON.stringify(post));
    ok(Math.abs(post.dmg / pre.dmg - 1.1) < 0.02 && post.lives === 11 && /open|afford/.test(post.cls), 'research effects apply ' + JSON.stringify({ pre, post }));
    const lay = await page.evaluate(() => {
      const d = document.querySelector('#researchModal .dialog').getBoundingClientRect();
      let bad = 0;
      for (const g of document.querySelectorAll('#resTree .rgraph')) {
        const gr = g.getBoundingClientRect();
        for (const n of g.querySelectorAll('.rnode')) { const r = n.getBoundingClientRect(); if (r.left < gr.left - 6 || r.right > gr.right + 6) bad++; }
      }
      const a = [...document.querySelectorAll('#resTree .rnode')].map(n => n.getBoundingClientRect());
      let overlap = 0;
      for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if (a[i].left < a[j].right - 1 && a[j].left < a[i].right - 1 && a[i].top < a[j].bottom - 1 && a[j].top < a[i].bottom - 1) overlap++;
      return { sw: document.documentElement.scrollWidth, dl: d.left, dr: d.right, bad, overlap };
    });
    ok(lay.sw <= 390 && lay.dl >= 0 && lay.dr <= 390 && !lay.bad && !lay.overlap, 'research dialog fits 390px ' + JSON.stringify(lay));
    await shot(page, 'research-390');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    ok(await page.evaluate(() => document.getElementById('researchModal').hidden), 'escape closes research');
    await page.keyboard.press('r');
    await page.waitForTimeout(150);
    ok(await page.evaluate(() => !document.getElementById('researchModal').hidden), 'R opens research');
    await page.keyboard.press('Escape');
    await page.evaluate(() => __nd.forceClear(100));
    await page.waitForTimeout(300);
    await page.evaluate(() => document.getElementById('starBtn').scrollIntoView({ block: 'end' }));
    await page.click('#starBtn');
    await page.waitForTimeout(250);
    const sd = await page.evaluate(() => { const d = document.querySelector('#starModal .dialog').getBoundingClientRect(); return { open: !document.getElementById('starModal').hidden, sw: document.documentElement.scrollWidth, dl: d.left, dr: d.right, h: d.height, vh: innerHeight }; });
    ok(sd.open && sd.sw <= 390 && sd.dl >= 0 && sd.dr <= 390 && sd.h <= sd.vh, 'star dialog fits 390px ' + JSON.stringify(sd));
    await shot(page, 'star-390');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    ok(await page.evaluate(() => document.getElementById('starModal').hidden && NDCore.starOf(__nd.S) === 0), 'escape closes the star dialog without starring');
    ok(!errors.length, 'console errors: ' + errors.join(' | '));
    await page.close();
  });

  await test('v5 save migrates to v8 with no stars, no Moonstones and empty research', async () => {
    const C = require(path.join(__dirname, '..', 'js', 'core.js'));
    const o = JSON.parse(C.serialize(C.newState()));
    o.ver = 5;
    for (const k of ['stars', 'moon', 'moonTotal', 'research', 'presets']) delete o[k];
    o.boards.moonlit.cleared = 64; o.boards.moonlit.sel = 65; o.boards.moonlit.cash = 31337;
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    await page.addInitScript(s => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('nightfall-defense-save-v1', s); } }, JSON.stringify(o));
    watch(page, errors);
    await page.goto(GAME);
    await page.waitForTimeout(500);
    const m = await page.evaluate(() => { const S = __nd.S; return { cleared: S.cleared, cash: Math.floor(S.cash), stars: JSON.stringify(S.stars), moon: S.moon, research: JSON.stringify(S.research), hMoon: document.getElementById('hMoon').textContent, hStars: document.getElementById('hStars').textContent, btn: document.getElementById('starBtn').hidden, lives: document.getElementById('hLives').textContent }; });
    ok(m.cleared === 64 && m.cash === 31337 && m.stars === '{}' && m.moon === 0 && m.research === '{}' && m.hMoon === '0' && m.hStars === '0' && m.btn && m.lives === '10/10', 'v5 migrated ' + JSON.stringify(m));
    await page.evaluate(() => __nd.save());
    const s = await page.evaluate(() => { const x = JSON.parse(localStorage.getItem('nightfall-defense-save-v1')); return { ver: x.ver, stars: typeof x.stars, research: typeof x.research, moon: x.moon }; });
    ok(s.ver === 8 && s.stars === 'object' && s.research === 'object' && s.moon === 0, 'resaved as v8 ' + JSON.stringify(s));
    ok(!errors.length, 'console errors: ' + errors.join(' | '));
    await page.close();
  });

  await test('hero: pick, click to move, Q/W/E casts, level-up, unlock, star-up level reset at 1280', async () => {
    const { page, errors } = await openGame(browser, { width: 1280, height: 800 });
    const pre = await page.evaluate(() => ({
      bar: !document.getElementById('heroBar').hidden, none: document.getElementById('heroBar').classList.contains('none'),
      btn: !!document.querySelector('#heroCard [data-heroes]'), hero: __nd.S.hero, unlocks: JSON.stringify(__nd.S.heroUnlocks),
    }));
    ok(pre.bar && pre.none && pre.btn && !pre.hero && pre.unlocks === '{"nova":1}', 'no hero yet, picker prompt shown ' + JSON.stringify(pre));
    await page.click('#heroCard [data-heroes]');
    await page.waitForTimeout(250);
    const list = await page.evaluate(() => ({
      open: !document.getElementById('heroModal').hidden, cards: document.querySelectorAll('#heroList .hcard').length,
      pick: !!document.querySelector('[data-pick="nova"]'), buy: [...document.querySelectorAll('[data-buy]')].map(b => b.dataset.buy + ':' + b.disabled).join(),
      names: document.getElementById('heroList').textContent, icon: (() => { const c = document.querySelector('canvas[data-hicon="nova"]'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n; })(),
    }));
    ok(list.open && list.cards === 4 && list.pick && list.buy === 'ironmane:true,skyflick:true,duskfang:true', 'hero picker lists 4 heroes ' + JSON.stringify(list));
    ok(/Nova Quill/.test(list.names) && /Ironmane/.test(list.names) && /Skyflick/.test(list.names) && /Duskfang/.test(list.names) && list.icon > 200, 'hero names and portraits ' + list.icon);
    await shot(page, 'hero-picker-1280');
    await page.click('[data-pick="nova"]');
    await page.waitForTimeout(300);
    const picked = await page.evaluate(() => ({ modal: document.getElementById('heroModal').hidden, id: __nd.S.hero && __nd.S.hero.id, lv: __nd.heroInfo().lv, card: document.getElementById('heroCard').textContent, none: document.getElementById('heroBar').classList.contains('none'), abs: [...document.querySelectorAll('#heroBar .hab')].filter(b => !b.hidden).length }));
    ok(picked.modal && picked.id === 'nova' && picked.lv === 1 && /Nova Quill/.test(picked.card) && /Level 1/.test(picked.card) && !picked.none && picked.abs === 3, 'nova picked ' + JSON.stringify(picked));
    const hs = await page.evaluate(() => __nd.heroScreen());
    await page.mouse.click(hs[0], hs[1]);
    await page.waitForTimeout(150);
    ok(await page.evaluate(() => __nd.ui.heroSel === true && /move/.test(document.getElementById('placeHint').textContent)), 'clicking the hero selects it');
    const tgt = await page.evaluate(() => { const h = __nd.S.hero; const x = Math.min(NDCore.WORLD.L - 80, h.x + 160), y = h.y + 10; return { x, y, c: __nd.worldToClient(x, y), d0: Math.hypot(h.x - x, h.y - y) }; });
    await page.mouse.click(tgt.c[0], tgt.c[1]);
    await page.waitForTimeout(1200);
    const mv = await page.evaluate(t => { const h = __nd.S.hero; return { tx: h.tx, ty: h.ty, d: Math.hypot(h.x - t.x, h.y - t.y), sel: __nd.ui.heroSel, towers: __nd.S.towers.length }; }, tgt);
    ok(Math.abs(mv.tx - tgt.x) < 4 && Math.abs(mv.ty - tgt.y) < 4 && mv.d < tgt.d0 - 60 && mv.towers === 0, 'click moves the hero ' + JSON.stringify({ mv, tgt }));
    await page.keyboard.press('Escape');
    await page.keyboard.press('h');
    await page.waitForTimeout(100);
    const hk = await page.evaluate(() => __nd.ui.heroSel);
    await page.keyboard.press('Escape');
    ok(hk === true && await page.evaluate(() => __nd.ui.heroSel === false), 'H selects the hero and Esc clears it');
    await page.keyboard.press('q');
    await page.waitForTimeout(100);
    ok(/during a wave/.test(await page.evaluate(() => document.getElementById('banner').textContent)), 'casting between waves explains itself');
    const ready = await page.evaluate(() => {
      const S = __nd.S, C = NDCore;
      __nd.togglePause();
      C.startWave(S, S.sel);
      let k = 0;
      while (S.run && k < 3000 && S.run.enemies.filter(e => e.alive && e.d > 60).length < 5) { C.step(S, 1 / 30); k++; }
      const L = S.run.enemies.filter(e => e.alive && e.d > 60);
      const e = L[Math.floor(L.length / 2)];
      S.hero.x = S.hero.tx = e.x; S.hero.y = S.hero.ty = e.y;
      return { n: L.length, run: !!S.run };
    });
    ok(ready.run && ready.n >= 5, 'wave running with DNBs near the hero ' + JSON.stringify(ready));
    for (const key of ['q', 'w', 'e']) { await page.keyboard.press(key); await page.waitForTimeout(60); }
    const cast = await page.evaluate(() => ({ ab: __nd.S.hero.ab.map(v => +v.toFixed(1)), casts: __nd.S.hero.casts, bar: [...document.querySelectorAll('#heroBar .hab')].map(b => b.classList.contains('cooling')).join(), cd: document.querySelector('#heroBar .hab').style.getPropertyValue('--cd') }));
    ok(cast.ab.every(v => v > 1) && cast.casts === 3, 'Q/W/E cast all three abilities ' + JSON.stringify(cast));
    await page.evaluate(() => { __nd.togglePause(); });
    await page.waitForTimeout(250);
    const cool = await page.evaluate(() => ({ bar: [...document.querySelectorAll('#heroBar .hab')].map(b => b.classList.contains('cooling')).join(), cd: document.querySelector('#heroBar .hab').style.getPropertyValue('--cd'), txt: document.querySelector('#heroBar .hab .hcd').textContent }));
    ok(cool.bar === 'true,true,true' && parseFloat(cool.cd) > 10 && +cool.txt > 0, 'cooldown sweep shows on the hero bar ' + JSON.stringify(cool));
    await shot(page, 'hero-cast-1280');
    const lvl = await page.evaluate(() => {
      const r = __nd.heroXp(5000);
      const S = __nd.S;
      return { lv: r, fx: S.fx.some(f => f.k === 'levelup'), sfx: true, banner: document.getElementById('banner').textContent, rank: __nd.heroInfo().rank };
    });
    ok(lvl.lv >= 5 && lvl.fx && lvl.rank >= 2 && /reached level/.test(lvl.banner), 'XP levels the hero up with effects ' + JSON.stringify(lvl));
    await page.waitForTimeout(300);
    ok(new RegExp('Level ' + lvl.lv + ' / 30').test(await page.evaluate(() => document.querySelector('#heroCard .hclv').textContent)), 'hero card shows the new level');
    await page.evaluate(() => { const S = __nd.S; let k = 0; while (S.run && k < 40000) { NDCore.step(S, 1 / 30); k++; } });
    await page.evaluate(() => __nd.grantMoon(15));
    await page.waitForTimeout(200);
    await page.click('#heroCard .hcrow [data-heroes]');
    await page.waitForTimeout(250);
    ok(await page.evaluate(() => !document.querySelector('[data-buy="ironmane"]').disabled), 'Moonstones make Ironmane affordable');
    await page.click('[data-buy="ironmane"]');
    await page.waitForTimeout(250);
    const un = await page.evaluate(() => ({ moon: __nd.S.moon, own: NDCore.heroUnlocked(__nd.S, 'ironmane'), pick: !!document.querySelector('[data-pick="ironmane"]'), banner: document.getElementById('banner').textContent }));
    ok(un.moon === 0 && un.own && un.pick && /Ironmane is unlocked/.test(un.banner), 'unlock with Moonstones ' + JSON.stringify(un));
    await page.click('[data-pick="ironmane"]');
    await page.waitForTimeout(250);
    const iron = await page.evaluate(() => ({ id: __nd.S.hero.id, lv: __nd.heroInfo().lv, novaLv: __nd.S.hero.prog.nova.lv }));
    ok(iron.id === 'ironmane' && iron.lv === 1 && iron.novaLv === lvl.lv, 'switching hero keeps per-hero levels ' + JSON.stringify(iron));
    await page.evaluate(() => { __nd.pickHero('nova'); __nd.heroXp(20000); __nd.forceClear(100); });
    await page.waitForTimeout(300);
    const lvBefore = await page.evaluate(() => __nd.heroInfo().lv);
    await page.evaluate(() => document.getElementById('starBtn').scrollIntoView({ block: 'end' }));
    await page.click('#starBtn');
    await page.waitForTimeout(250);
    await page.click('#starConfirm');
    await page.waitForTimeout(600);
    const st = await page.evaluate(() => ({ star: NDCore.starOf(__nd.S), id: __nd.S.hero && __nd.S.hero.id, lv: __nd.heroInfo().lv, iron: NDCore.heroUnlocked(__nd.S, 'ironmane'), dusk: NDCore.heroUnlocked(__nd.S, 'duskfang'), card: document.querySelector('#heroCard .hclv').textContent }));
    ok(lvBefore > 5 && st.star === 1 && st.id === 'nova' && st.lv === 1 && st.iron && st.dusk && /Level 1 /.test(st.card), 'star up resets hero level, keeps choice and unlocks ' + JSON.stringify({ lvBefore, st }));
    await page.evaluate(() => __nd.save());
    const sv = await page.evaluate(() => { const o = JSON.parse(localStorage.getItem('nightfall-defense-save-v1')); return { ver: o.ver, hero: o.boards.moonlit.hero && o.boards.moonlit.hero.id, un: o.heroUnlocks }; });
    ok(sv.ver === 8 && sv.hero === 'nova' && sv.un.ironmane && sv.un.duskfang, 'hero saved ' + JSON.stringify(sv));
    await page.reload();
    await page.waitForTimeout(500);
    const rl = await page.evaluate(() => ({ id: __nd.S.hero && __nd.S.hero.id, card: document.getElementById('heroCard').textContent }));
    ok(rl.id === 'nova' && /Nova Quill/.test(rl.card), 'hero survives reload ' + JSON.stringify(rl));
    ok(!errors.length, 'console errors: ' + errors.join(' | '));
    await page.close();
  });

  await test('hero UI at 390px: tap to select and move, touch ability buttons, picker fits', async () => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const errors = [];
    watch(page, errors);
    await page.goto(GAME);
    await page.waitForTimeout(400);
    await page.tap('#heroFace');
    await page.waitForTimeout(250);
    const md = await page.evaluate(() => { const d = document.querySelector('#heroModal .dialog').getBoundingClientRect(); let bad = 0; for (const c of document.querySelectorAll('#heroList .hcard')) { const r = c.getBoundingClientRect(); if (r.left < d.left - 1 || r.right > d.right + 1) bad++; } return { open: !document.getElementById('heroModal').hidden, sw: document.documentElement.scrollWidth, dl: d.left, dr: d.right, bad }; });
    ok(md.open && md.sw <= 390 && md.dl >= 0 && md.dr <= 390 && !md.bad, 'hero picker fits 390px ' + JSON.stringify(md));
    await shot(page, 'hero-picker-390');
    await page.tap('[data-pick="nova"]');
    await page.waitForTimeout(300);
    const lay = await page.evaluate(() => {
      const b = document.getElementById('board').getBoundingClientRect(), bar = document.getElementById('heroBar').getBoundingClientRect();
      const btns = [...document.querySelectorAll('#heroBar .hab, #heroFace')].map(e => e.getBoundingClientRect());
      const card = document.getElementById('heroCard').getBoundingClientRect();
      return { id: __nd.S.hero && __nd.S.hero.id, inBoard: bar.left >= b.left && bar.right <= b.right && bar.bottom <= b.bottom && bar.top >= b.top, small: btns.filter(r => r.width < 38 || r.height < 38).length, n: btns.length, sw: document.documentElement.scrollWidth, cardW: card.right <= 390 && card.left >= 0 };
    });
    ok(lay.id === 'nova' && lay.inBoard && lay.n === 4 && !lay.small && lay.sw <= 390 && lay.cardW, 'hero bar fits the board at 390px ' + JSON.stringify(lay));
    const hs = await page.evaluate(() => __nd.heroScreen());
    await page.touchscreen.tap(hs[0], hs[1]);
    await page.waitForTimeout(150);
    ok(await page.evaluate(() => __nd.ui.heroSel), 'tapping the hero selects it');
    const tgt = await page.evaluate(() => { const h = __nd.S.hero; const x = Math.max(80, h.x - 200), y = h.y; return { x, y, c: __nd.worldToClient(x, y) }; });
    await page.touchscreen.tap(tgt.c[0], tgt.c[1]);
    await page.waitForTimeout(200);
    const mv = await page.evaluate(() => ({ tx: __nd.S.hero.tx, ty: __nd.S.hero.ty, placing: __nd.ui.placing, towers: __nd.S.towers.length }));
    ok(Math.abs(mv.tx - tgt.x) < 6 && Math.abs(mv.ty - tgt.y) < 6 && !mv.placing && mv.towers === 0, 'tap moves the selected hero ' + JSON.stringify({ mv, tgt }));
    await page.tap('.race[data-race="earth"]');
    await page.waitForTimeout(100);
    ok(await page.evaluate(() => __nd.ui.placing === 'earth' && !__nd.ui.heroSel), 'placing a pony clears hero move mode');
    await page.tap('.race[data-race="earth"]');
    await page.evaluate(() => {
      const S = __nd.S, C = NDCore;
      __nd.togglePause();
      C.startWave(S, S.sel);
      let k = 0;
      while (S.run && k < 3000 && S.run.enemies.filter(e => e.alive && e.d > 60).length < 3) { C.step(S, 1 / 30); k++; }
      const e = S.run.enemies.filter(q => q.alive && q.d > 60)[0];
      S.hero.x = S.hero.tx = e.x; S.hero.y = S.hero.ty = e.y;
    });
    await page.tap('#heroBar .hab[data-ab="0"]');
    await page.waitForTimeout(100);
    ok(await page.evaluate(() => __nd.S.hero.ab[0] > 1), 'touch button casts the first ability');
    await page.evaluate(() => __nd.togglePause());
    await page.waitForTimeout(300);
    await shot(page, 'hero-390');
    ok(!errors.length, 'console errors: ' + errors.join(' | '));
    await page.close();
  });

  await test('v6 save migrates to v8 with no hero and only the free hero unlocked', async () => {
    const C = require(path.join(__dirname, '..', 'js', 'core.js'));
    const o = JSON.parse(C.serialize(C.newState()));
    o.ver = 6;
    delete o.heroUnlocks;
    for (const id in o.boards) delete o.boards[id].hero;
    o.boards.moonlit.cleared = 33; o.boards.moonlit.sel = 34; o.moon = 7;
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    await page.addInitScript(s => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('nightfall-defense-save-v1', s); } }, JSON.stringify(o));
    watch(page, errors);
    await page.goto(GAME);
    await page.waitForTimeout(500);
    const m = await page.evaluate(() => { const S = __nd.S; __nd.save(); const x = JSON.parse(localStorage.getItem('nightfall-defense-save-v1')); return { cleared: S.cleared, moon: S.moon, hero: S.hero, un: JSON.stringify(S.heroUnlocks), ver: x.ver, prompt: !!document.querySelector('#heroCard [data-heroes]') }; });
    ok(m.cleared === 33 && m.moon === 7 && !m.hero && m.un === '{"nova":1,"ironmane":1}' && m.ver === 8 && m.prompt, 'v6 migrated ' + JSON.stringify(m));
    ok(!errors.length, 'console errors: ' + errors.join(' | '));
    await page.close();
  });

  await test('welcome back modal pays offline cash from a faked timestamp; clock rollback and hidden tab', async () => {
    const C = require(path.join(__dirname, '..', 'js', 'core.js'));
    const S0 = C.newState();
    S0.cash = 1e6;
    for (const [x, y] of [[600, 330], [700, 470], [800, 330]]) C.placeTower(S0, 'earth', x, y);
    S0.cleared = 40; S0.sel = 41; S0.farm.safe = 38; S0.farm.val = C.boardValue(S0.towers); S0.cash = 500;
    S0.lastSeen = Date.now() - 3 * 3600 * 1000 - 120 * 1000;
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const errors = [];
    await page.addInitScript(s => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('nightfall-defense-save-v1', s); } }, C.serialize(S0));
    watch(page, errors);
    await page.goto(GAME);
    await page.waitForTimeout(600);
    const m = await page.evaluate(() => {
      const d = document.querySelector('#awayModal .dialog').getBoundingClientRect();
      const g = __nd.ui.away;
      return { open: !document.getElementById('awayModal').hidden, body: document.getElementById('awayBody').textContent, rows: document.querySelectorAll('#awayList li').length, claim: document.getElementById('awayClaim').textContent,
        total: g && g.total, away: g && g.away, wave: g && g.maps[0] && g.maps[0].wave, cash: __nd.S.cash, focus: document.activeElement && document.activeElement.id, dl: d.left, dr: d.right, sw: document.documentElement.scrollWidth };
    });
    ok(m.open && m.rows === 1 && /3h 0[12]m/.test(m.body) && /Moonlit Road/.test(m.body) && /Claim/.test(m.claim) && m.total > 0 && m.wave === 38, 'welcome back modal ' + JSON.stringify(m));
    ok(m.focus === 'awayClaim' && m.dl >= 0 && m.dr <= 390 && m.sw <= 390, 'modal fits 390px and focuses claim ' + JSON.stringify(m));
    await shot(page, 'away-390');
    await page.click('#awayClaim');
    await page.waitForTimeout(200);
    const c = await page.evaluate(() => ({ open: !document.getElementById('awayModal').hidden, cash: __nd.S.cash, seen: __nd.S.lastSeen, now: Date.now(), banner: document.getElementById('banner').textContent }));
    ok(!c.open && Math.round(c.cash - m.cash) === Math.round(m.total) && Math.abs(c.now - c.seen) < 5000 && /Claimed/.test(c.banner), 'claim pays the total once ' + JSON.stringify(c));
    const rb = await page.evaluate(() => {
      const S = __nd.S, fut = Date.now() + 3600e3;
      S.lastSeen = fut;
      const r = __nd.catchUp(Date.now());
      __nd.save();
      const kept = JSON.parse(localStorage.getItem('nightfall-defense-save-v1')).lastSeen;
      const out = { r, open: !document.getElementById('awayModal').hidden, kept: kept === fut, banner: document.getElementById('banner').textContent };
      S.lastSeen = Date.now();
      return out;
    });
    ok(rb.r === null && !rb.open && rb.kept && /clock/.test(rb.banner), 'clock rollback pays nothing and keeps the last visit ' + JSON.stringify(rb));
    const hid = await page.evaluate(() => { const a = __nd.S.cash; const g = __nd.simAway(30 * 1000); return { g: g && g.total, d: __nd.S.cash - a, open: !document.getElementById('awayModal').hidden, banner: document.getElementById('banner').textContent }; });
    ok(hid.g > 0 && Math.round(hid.d) === Math.round(hid.g) && !hid.open && /hidden/.test(hid.banner), 'short hidden tab catches up silently ' + JSON.stringify(hid));
    const cap = await page.evaluate(() => { const g = __nd.simAway(20 * 3600 * 1000); return { capped: g.capped, secs: g.secs, open: !document.getElementById('awayModal').hidden, body: document.getElementById('awayBody').textContent }; });
    ok(cap.capped && cap.secs === 8 * 3600 && cap.open && /8h 00m/.test(cap.body), 'long absence capped at 8h ' + JSON.stringify(cap));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    ok(await page.evaluate(() => document.getElementById('awayModal').hidden && !__nd.ui.away), 'Escape claims and closes');
    const vis = await page.evaluate(() => { const S = __nd.S; S.lastSeen = Date.now() - 2 * 3600e3; document.dispatchEvent(new Event('visibilitychange')); return { open: !document.getElementById('awayModal').hidden, h: Math.round(__nd.ui.away ? __nd.ui.away.away / 3600 : 0) }; });
    ok(vis.open && vis.h === 2, 'visibility change opens the catch-up modal ' + JSON.stringify(vis));
    await page.evaluate(() => __nd.claimAway());
    const res = await page.evaluate(() => { const S = __nd.S, C = NDCore; const base = C.farmRate(S).rate; S.research.eco_offline = 2; S.research.util_offline = 1; return { mul: C.farmRate(S).rate / base, cap: C.offlineCap(S) }; });
    ok(Math.abs(res.mul - 1.4) < 1e-9 && res.cap === 10 * 3600, 'Night Shift and Long Watch research raise rate and cap ' + JSON.stringify(res));
    ok(!errors.length, 'console errors: ' + errors.join(' | '));
    await page.close();
  });

  await test('auto-farm loops the best safe wave, retries once, then stops and drops back', async () => {
    const { page, errors } = await openGame(browser, { width: 1280, height: 800 });
    await page.evaluate(() => {
      localStorage.clear();
      const S = __nd.S, C = NDCore;
      S.cash = 1e7;
      for (const [x, y] of [[600, 330], [700, 470], [800, 330], [500, 470]]) { const t = C.placeTower(S, 'unicorn', x, y); if (t) for (let i = 0; i < 4; i++) C.buyNode(S, t, 0); }
      __nd.forceClear(5);
    });
    await page.click('label:has(#farmBox)');
    await page.waitForTimeout(150);
    const on = await page.evaluate(() => ({ on: __nd.S.farm.on, chip: !document.getElementById('hFarmChip').hidden, txt: document.getElementById('hFarm').textContent, hint: document.getElementById('farmHint').textContent, auto: __nd.S.auto }));
    ok(on.on && on.chip && on.txt === 'w5' && /Farming wave 5/.test(on.hint) && !on.auto, 'auto-farm on with status chip ' + JSON.stringify(on));
    await page.waitForTimeout(1100);
    const r1 = await page.evaluate(() => ({ n: __nd.S.run && __nd.S.run.n }));
    ok(r1.n === 5, 'auto-farm started wave 5 by itself ' + JSON.stringify(r1));
    for (let k = 0; k < 2; k++) {
      await page.evaluate(() => { const S = __nd.S; if (S.run) S.run.lives = 1e9; });
      await fastForward(page, 300);
      await page.waitForTimeout(1900);
    }
    const r2 = await page.evaluate(() => ({ runs: __nd.S.farm.runs, n: __nd.S.run && __nd.S.run.n, safe: __nd.S.farm.safe, chip: document.getElementById('hFarm').textContent }));
    ok(r2.runs >= 2 && r2.n === 5, 'loop restarts after each clear ' + JSON.stringify(r2));
    await page.evaluate(() => { const S = __nd.S; S.run.lives = 0; NDCore.step(S, 1 / 60); });
    await page.waitForTimeout(300);
    const f1 = await page.evaluate(() => ({ fails: __nd.S.farm.fails, on: __nd.S.farm.on, warn: document.getElementById('hFarmChip').classList.contains('warn'), next: __nd.ui.farmNext > 0 }));
    ok(f1.fails === 1 && f1.on && f1.warn && f1.next, 'first loss retries ' + JSON.stringify(f1));
    await page.waitForTimeout(2400);
    ok(await page.evaluate(() => __nd.S.run && __nd.S.run.n === 5), 'retry started');
    await page.evaluate(() => { const S = __nd.S; S.run.lives = 0; NDCore.step(S, 1 / 60); });
    await page.waitForTimeout(1900);
    const f2 = await page.evaluate(() => ({ on: __nd.S.farm.on, sel: __nd.S.sel, safe: __nd.S.farm.safe, chip: document.getElementById('hFarmChip').hidden, box: document.getElementById('farmBox').checked, banner: document.getElementById('banner').textContent, run: !!__nd.S.run }));
    ok(!f2.on && f2.sel === 4 && f2.safe === 4 && f2.chip && !f2.box && !f2.run && /stopped/.test(f2.banner) && /wave 4/.test(f2.banner), 'two losses stop and drop back one wave ' + JSON.stringify(f2));
    await page.selectOption('#farmPick', '3');
    await page.evaluate(() => __nd.setFarming(true));
    await page.waitForTimeout(1200);
    const p = await page.evaluate(() => ({ pick: __nd.S.farm.pick, n: __nd.S.run && __nd.S.run.n, txt: document.getElementById('hFarm').textContent }));
    ok(p.pick === 3 && p.n === 3 && p.txt === 'w3', 'chosen wave is farmed ' + JSON.stringify(p));
    await page.evaluate(() => { __nd.setFarming(false); const S = __nd.S; while (S.run) { S.run.lives = 1e9; NDCore.step(S, 1 / 30); } });
    ok(!errors.length, 'console errors: ' + errors.join(' | '));
    await page.close();
  });

  await test('upgrade rules fire every second and at wave end; per-pony rules and reserve; rules dialog at 390px', async () => {
    const { page, errors } = await openGame(browser, { width: 390, height: 844 });
    const id = await page.evaluate(() => { localStorage.clear(); const S = __nd.S; S.cash = 5000; const t = NDCore.placeTower(S, 'earth', 600, 330); S.cash = 0; return t.id; });
    await page.click('#rulesBtn');
    await page.waitForTimeout(200);
    await page.click('label:has(#rulesOn)');
    await page.selectOption('#ruleKind', 'dmg');
    await page.click('#ruleAdd');
    await page.waitForTimeout(100);
    const lay = await page.evaluate(() => {
      const d = document.querySelector('#rulesModal .dialog').getBoundingClientRect();
      let bad = 0;
      for (const el of document.querySelectorAll('#rulesModal button, #rulesModal select, #rulesList li')) { const r = el.getBoundingClientRect(); if (r.width && (r.left < d.left - 1 || r.right > d.right + 1)) bad++; }
      return { open: !document.getElementById('rulesModal').hidden, rows: document.querySelectorAll('#rulesList li[data-i]').length, txt: document.getElementById('rulesList').textContent, on: __nd.S.rules.on, sw: document.documentElement.scrollWidth, dl: d.left, dr: d.right, bad };
    });
    ok(lay.open && lay.rows === 1 && /Damage/.test(lay.txt) && lay.on, 'rule added ' + JSON.stringify(lay));
    ok(lay.sw <= 390 && lay.dl >= 0 && lay.dr <= 390 && !lay.bad, 'rules dialog fits 390px ' + JSON.stringify(lay));
    await page.selectOption('#ruleKind', 'path');
    await page.click('#ruleAdd');
    await page.waitForTimeout(100);
    const lay2 = await page.evaluate(() => { let bad = 0; const d = document.querySelector('#rulesModal .dialog').getBoundingClientRect(); for (const el of document.querySelectorAll('#rulesModal select')) { const r = el.getBoundingClientRect(); if (r.left < d.left - 1 || r.right > d.right + 1) bad++; } return { rows: document.querySelectorAll('#rulesList li[data-i]').length, bad, sw: document.documentElement.scrollWidth }; });
    ok(lay2.rows === 2 && !lay2.bad && lay2.sw <= 390, 'path rule adds and the row wraps ' + JSON.stringify(lay2));
    await shot(page, 'rules-390');
    await page.click('#rulesList li[data-i="1"] [data-mv="-1"]');
    await page.waitForTimeout(100);
    ok(await page.evaluate(() => __nd.S.rules.race.earth[0].k === 'path'), 'rule moved up');
    await page.click('#rulesList li[data-i="0"] [data-del]');
    await page.click('#rulesClose');
    await page.waitForTimeout(100);
    const st = await page.evaluate(() => document.getElementById('rulesState').textContent);
    ok(/on/.test(st) && /1/.test(st), 'rules chip shows state ' + st);
    const sec = await page.evaluate(() => { const S = __nd.S, t = S.towers[0]; const a = t.infD; S.cash = 5000; __nd.idleTick(); return { a, b: t.infD, cash: S.cash }; });
    ok(sec.b > sec.a, 'per-second rule bought Damage ' + JSON.stringify(sec));
    const end = await page.evaluate(() => {
      const S = __nd.S, t = S.towers[0];
      S.rules.tick = 'end';
      const a = t.infD;
      S.cash = 0; NDCore.startWave(S, 1); S.run.lives = 1e9;
      while (S.run) NDCore.step(S, 1 / 30);
      S.cash += 1e5;
      return { a };
    });
    await page.waitForTimeout(300);
    const end2 = await page.evaluate(() => ({ b: __nd.S.towers[0].infD }));
    await page.evaluate(() => { const S = __nd.S; NDCore.startWave(S, 1); S.run.lives = 1e9; while (S.run) NDCore.step(S, 1 / 30); });
    await page.waitForTimeout(300);
    const end3 = await page.evaluate(() => ({ b: __nd.S.towers[0].infD, cash: __nd.S.cash }));
    ok(end3.b > end.a, 'wave-end rule fired ' + JSON.stringify([end, end2, end3]));
    await page.evaluate(id => { __nd.ui.selId = id; __nd.refresh(); }, id);
    await page.waitForTimeout(250);
    await page.click('#info [data-act="rules"]');
    await page.waitForTimeout(150);
    const pony = await page.evaluate(() => ({ open: !document.getElementById('rulesModal').hidden, tab: (document.querySelector('#rulesTabs button.on') || {}).textContent, scope: document.getElementById('rulesScope').textContent }));
    ok(pony.open && /#/.test(pony.tab) && /follows/.test(pony.scope), 'pony tab opens from the info panel ' + JSON.stringify(pony));
    await page.click('#rulesScope [data-rscope="own"]');
    await page.selectOption('#ruleKind', 'rate');
    await page.click('#ruleAdd');
    await page.selectOption('#rulesReserve', '50');
    await page.click('#rulesClose');
    const own = await page.evaluate(id => { const S = __nd.S, t = S.towers[0]; S.rules.tick = 'both'; const r0 = t.infR; S.cash = 1e6; const r = __nd.runRules('sec'); return { n: (S.rules.pony[id] || []).length, r0, r1: t.infR, cash: S.cash, reserve: S.rules.reserve, count: r.count }; }, id);
    ok(own.n === 2 && own.r1 > own.r0 && own.reserve === 50 && own.cash >= 5e5 && own.count > 0, 'pony rules with a 50% reserve ' + JSON.stringify(own));
    ok(!errors.length, 'console errors: ' + errors.join(' | '));
    await page.close();
  });

  await test('plan slots save a board, survive a star-up and restore with progress', async () => {
    const { page, errors } = await openGame(browser, { width: 1280, height: 800 });
    const made = await page.evaluate(() => {
      localStorage.clear();
      const S = __nd.S, C = NDCore;
      S.cash = 1e6;
      const a = C.placeTower(S, 'earth', 600, 330), b = C.placeTower(S, 'unicorn', 700, 470), c = C.placeTower(S, 'pegasus', 800, 330);
      for (let i = 0; i < 3; i++) C.buyNode(S, a, 0);
      C.buyNode(S, b, 1); C.buyInf(S, c, 'dmg');
      return S.towers.map(t => t.race + t.paths.join('') + t.infD).sort().join();
    });
    await page.click('#plansBtn');
    await page.waitForTimeout(200);
    const p0 = await page.evaluate(() => ({ open: !document.getElementById('plansModal').hidden, slots: document.querySelectorAll('#plansList .pslot').length, locked: document.querySelectorAll('#plansList .pslot.locked').length }));
    ok(p0.open && p0.slots === 5 && p0.locked === 2, 'three open slots and two locked ' + JSON.stringify(p0));
    await page.fill('#plansList [data-name="0"]', 'Opening');
    await page.click('#plansList [data-save="0"]');
    await page.waitForTimeout(150);
    const p1 = await page.evaluate(() => ({ slot: NDCore.slotsOf(__nd.S)[0], state: document.getElementById('plansState').textContent, card: document.querySelector('#plansList .pslot').textContent }));
    ok(p1.slot && p1.slot.name === 'Opening' && p1.slot.towers.length === 3 && p1.state === '1/3' && /3 ponies/.test(p1.card), 'plan saved ' + JSON.stringify(p1.state) + ' ' + p1.card);
    await page.click('#plansList [data-save="0"]');
    await page.waitForTimeout(100);
    ok(await page.evaluate(() => /overwrite/.test(document.querySelector('#plansList [data-save="0"]').textContent)), 'overwrite asks for a second tap');
    await page.click('#plansClose');
    await page.evaluate(() => { __nd.forceClear(100); });
    await page.waitForTimeout(200);
    await page.click('#starBtn');
    await page.waitForTimeout(150);
    await page.click('#starConfirm');
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => ({ star: NDCore.starOf(__nd.S), towers: __nd.S.towers.length, btn: !document.getElementById('presetBtn').hidden, txt: document.getElementById('presetBtn').textContent, cash: __nd.S.cash, slots: NDCore.slotsOf(__nd.S).filter(Boolean).length }));
    ok(after.star === 1 && after.towers === 0 && after.btn && /Restore plan: Opening/.test(after.txt) && after.slots === 1, 'plan survives the star-up ' + JSON.stringify(after));
    await page.click('#presetBtn');
    await page.waitForTimeout(300);
    const part = await page.evaluate(() => { const p = NDCore.buildProgress(__nd.S); return { p, towers: __nd.S.towers.length, box: !document.getElementById('buildBox').hidden, pct: document.getElementById('buildPct').textContent, chip: !document.getElementById('hBuildChip').hidden, bar: document.getElementById('buildBar').style.width }; });
    ok(part.p && part.towers >= 1 && part.p.done < part.p.total && part.box && part.chip && /%/.test(part.pct) && part.bar, 'restore buys what it can and queues the rest ' + JSON.stringify(part));
    await page.evaluate(() => { __nd.S.cash = 1e9; __nd.idleTick(); });
    await page.waitForTimeout(300);
    const done = await page.evaluate(() => ({ build: __nd.S.build, got: __nd.S.towers.map(t => t.race + t.paths.join('') + t.infD).sort().join(), box: document.getElementById('buildBox').hidden, banner: document.getElementById('banner').textContent }));
    ok(!done.build && done.got === made && done.box && /rebuilt/.test(done.banner), 'queue finishes once cash arrives ' + JSON.stringify(done) + ' vs ' + made);
    await page.evaluate(() => { __nd.grantMoon(500); __nd.buyResearch('util_lives'); __nd.buyResearch('util_skip'); __nd.buyResearch('util_auto'); });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(200);
    await page.click('#plansBtn');
    await page.waitForTimeout(200);
    const lay = await page.evaluate(() => {
      const d = document.querySelector('#plansModal .dialog').getBoundingClientRect();
      let bad = 0;
      for (const el of document.querySelectorAll('#plansList .pslot, #plansList button, #plansList input')) { const r = el.getBoundingClientRect(); if (r.left < d.left - 1 || r.right > d.right + 1) bad++; }
      return { locked: document.querySelectorAll('#plansList .pslot.locked').length, state: document.getElementById('plansState').textContent, sw: document.documentElement.scrollWidth, dl: d.left, dr: d.right, bad };
    });
    ok(lay.locked === 0 && lay.state === '1/5' && lay.sw <= 390 && lay.dl >= 0 && lay.dr <= 390 && !lay.bad, 'Muster Plans opens 5 slots and the dialog fits 390px ' + JSON.stringify(lay));
    await shot(page, 'plans-390');
    await page.keyboard.press('Escape');
    const wb = await page.evaluate(() => {
      const box = document.querySelector('.wavebox') || document.getElementById('farmBox').closest('.card');
      const r = box.getBoundingClientRect();
      let bad = 0;
      for (const el of box.querySelectorAll('button, select, label')) { const q = el.getBoundingClientRect(); if (q.width && (q.left < r.left - 1 || q.right > r.right + 1)) bad++; }
      return { closed: document.getElementById('plansModal').hidden, sw: document.documentElement.scrollWidth, bad };
    });
    ok(wb.closed && wb.sw <= 390 && !wb.bad, 'wave card controls fit 390px ' + JSON.stringify(wb));
    await page.evaluate(() => __nd.save());
    const sv = await page.evaluate(() => { const o = JSON.parse(localStorage.getItem('nightfall-defense-save-v1')); return { ver: o.ver, slots: (o.slots.moonlit || []).filter(Boolean).length, seen: o.lastSeen > 0, rules: typeof o.rules }; });
    ok(sv.ver === 8 && sv.slots === 1 && sv.seen && sv.rules === 'object', 'v8 save holds slots, rules and the last visit ' + JSON.stringify(sv));
    ok(!errors.length, 'console errors: ' + errors.join(' | '));
    await page.close();
  });

  await test('v7 save migrates to v8 with idle defaults', async () => {
    const C = require(path.join(__dirname, '..', 'js', 'core.js'));
    const o = JSON.parse(C.serialize(C.newState()));
    o.ver = 7;
    delete o.slots; delete o.rules; delete o.lastSeen;
    for (const id in o.boards) { delete o.boards[id].farm; delete o.boards[id].build; }
    o.boards.moonlit.cleared = 12; o.boards.moonlit.sel = 13;
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    await page.addInitScript(s => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('nightfall-defense-save-v1', s); } }, JSON.stringify(o));
    watch(page, errors);
    await page.goto(GAME);
    await page.waitForTimeout(500);
    const m = await page.evaluate(() => { const S = __nd.S; __nd.save(); const x = JSON.parse(localStorage.getItem('nightfall-defense-save-v1')); return { cleared: S.cleared, farm: !!S.farm && !S.farm.on, rules: !S.rules.on, slots: NDCore.slotsOf(S).length, ver: x.ver, seen: x.lastSeen > 0, modal: document.getElementById('awayModal').hidden }; });
    ok(m.cleared === 12 && m.farm && m.rules && m.slots === 0 && m.ver === 8 && m.seen && m.modal, 'v7 migrated ' + JSON.stringify(m));
    ok(!errors.length, 'console errors: ' + errors.join(' | '));
    await page.close();
  });

  await test('root page lists Nightfall Defense', async () => {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(BASE + 'index.html');
    await page.waitForTimeout(500);
    const txt = await page.locator('button.card', { hasText: 'Nightfall Defense' }).count();
    ok(txt === 1, 'card count ' + txt);
    ok(!errors.length, 'errors: ' + errors.join(' | '));
    await page.close();
  });

  await browser.close();
  for (const r of results) console.log(r.join('  '));
  process.exit(results.every(r => r[0] === 'PASS') ? 0 : 1);
})();
