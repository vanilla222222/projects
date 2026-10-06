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
