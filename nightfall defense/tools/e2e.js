'use strict';
const path = require('path');
const { execSync } = require('child_process');
const { chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));
const BASE = process.env.BASE || 'http://localhost:8803/';
const SHOTS = process.env.SHOTS || '';
const GAME = BASE + 'nightfall%20defense/index.html';

const results = [];
async function test(name, fn) {
  try { await fn(); results.push(['PASS', name]); }
  catch (err) { results.push(['FAIL', name, err.message]); }
}
function ok(cond, msg) { if (!cond) throw new Error(msg); }

async function openGame(browser, viewport) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
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
    ok(s2.ver === 3, 'save has ver 3');
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
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(BASE + 'index.html');
    await page.evaluate(() => localStorage.setItem('nightfall-defense-save-v1', JSON.stringify({
      v: 1, cash: 777, cleared: 12, sel: 13, auto: false, nextId: 3, totalKills: 456,
      towers: [{ id: 1, race: 'earth', x: 600, y: 330, spent: 90, paths: [2, 0, 0, 1, 0], infD: 1, infR: 0, mode: 'strong', kills: 50 },
        { id: 2, race: 'pegasus', x: 800, y: 470, spent: 140, paths: [0, 0, 3, 0, 0], infD: 0, infR: 2, mode: 'first', kills: 70 }],
    })));
    await page.goto(GAME);
    await page.waitForTimeout(500);
    const m = await page.evaluate(() => { const S = __nd.S; return { cash: Math.floor(S.cash), cleared: S.cleared, n: S.towers.length, p: S.towers[0].paths.join(), mode: S.towers[0].mode, dmg: S.towers[1].dmg, map: S.map, set: !!S.settings && S.settings.speed }; });
    ok(m.cash === 777 && m.cleared === 12 && m.n === 2 && m.p === '2,0,0,1,0' && m.mode === 'strong' && m.dmg === 0 && m.map === 'moonlit' && m.set === 1, 'migrated ' + JSON.stringify(m));
    await page.evaluate(() => __nd.save());
    const ver = await page.evaluate(() => { const o = JSON.parse(localStorage.getItem('nightfall-defense-save-v1')); return o.ver + ':' + ('v' in o); });
    ok(ver === '3:false', 'resaved as ver 3, got ' + ver);
    ok(!errors.length, 'console errors: ' + errors.join(' | '));
    await page.close();
  });

  await test('old v2 save moves onto the Moonlit Road board', async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(BASE + 'index.html');
    await page.evaluate(() => localStorage.setItem('nightfall-defense-save-v1', JSON.stringify({
      ver: 2, map: 'moonlit', seed: 99, cash: 4321, cleared: 57, sel: 58, auto: true, nextId: 5, totalKills: 900,
      stats: { played: 70, dmg: 1e6, bossKills: 5, earned: 5e5 }, settings: { speed: 2, sound: false, vol: 0.4, shake: true, dmgNums: true, numFmt: 'short' },
      towers: [{ id: 4, race: 'unicorn', x: 700, y: 300, spent: 900, paths: [3, 0, 2, 0, 0], infD: 2, infR: 1, mode: 'last', kills: 40, dmg: 5000 }],
    })));
    await page.goto(GAME);
    await page.waitForTimeout(500);
    const m = await page.evaluate(() => { const S = __nd.S; return { map: S.map, cash: Math.floor(S.cash), cleared: S.cleared, sel: S.sel, auto: S.auto, n: S.towers.length, p: S.towers[0].paths.join(), mode: S.towers[0].mode, dmg: S.towers[0].dmg, played: S.stats.played, speed: S.settings.speed, woods: NDCore.mapUnlocked(S, 'woods'), caverns: NDCore.mapUnlocked(S, 'caverns') }; });
    ok(m.map === 'moonlit' && m.cash === 4321 && m.cleared === 57 && m.sel === 58 && m.auto === true && m.n === 1 && m.p === '3,0,2,0,0' && m.mode === 'last' && m.dmg === 5000 && m.played === 70 && m.speed === 2, 'migrated ' + JSON.stringify(m));
    ok(m.woods && !m.caverns, 'wave 57 on map 1 unlocks map 2 only');
    await page.evaluate(() => __nd.save());
    const o = await page.evaluate(() => JSON.parse(localStorage.getItem('nightfall-defense-save-v1')));
    ok(o.ver === 3 && o.boards && o.boards.moonlit && o.boards.moonlit.cleared === 57 && o.boards.moonlit.towers.length === 1 && !('towers' in o), 'ver 3 layout ' + JSON.stringify(Object.keys(o)));
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
    const w = await page.evaluate(() => ({ map: __nd.S.map, n: __nd.S.towers.length, cleared: __nd.S.cleared, cash: __nd.S.cash, start: NDCore.mapStartCash(NDCore.MAPS.woods), modal: document.getElementById('mapModal').hidden, name: document.getElementById('mapName').textContent }));
    ok(w.map === 'woods' && w.n === 0 && w.cleared === 0 && w.cash === w.start && w.modal && /Whispering Woods/.test(w.name), 'fresh woods board ' + JSON.stringify(w));
    const tree = await page.evaluate(() => { const b = NDCore.MAPS.woods.blocks[0]; return [b.x, b.y]; });
    await placeAt(page, 'earth', tree[0], tree[1]);
    await page.waitForTimeout(100);
    const deny = await page.evaluate(() => ({ n: __nd.S.towers.length, banner: document.getElementById('banner').textContent }));
    ok(deny.n === 0 && /tree/i.test(deny.banner), 'trees block building ' + JSON.stringify(deny));
    await page.keyboard.press('Escape');
    const spot = await page.evaluate(() => { const S = __nd.S; for (let y = 40; y < 760; y += 10) for (let x = 40; x < 1360; x += 10) if (NDCore.canPlace(S, x, y)) return [x, y]; return null; });
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
        for (let y = 30; y < 780 && spots.length < 18; y += 37) for (let x = 30; x < 1380 && spots.length < 18; x += 53) if (C.canPlace(S, x, y)) { const t = C.placeTower(S, C.RACE_IDS[spots.length % 3], x, y); if (t) { spots.push(t); t.infD = 40; t.paths[1] = 2; t._s = null; } }
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
