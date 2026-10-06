'use strict';
const path = require('path');
const { execSync } = require('child_process');
const { chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));
const BASE = process.env.BASE || 'http://localhost:8801/';
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
  const browser = await chromium.launch();

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
    ok(s2.ver === 2, 'save has ver 2');
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
    ok(ver === '2:false', 'resaved as ver 2, got ' + ver);
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
