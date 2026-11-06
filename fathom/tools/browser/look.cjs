const { chromium } = require('playwright');

// Park the camera at a named kind of place and photograph it, wide.
(async () => {
  const out = process.argv[2];
  const jobs = JSON.parse(process.argv[3]);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 760 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto('http://localhost:8777/', { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(800);
  await page.click('text=New character');
  await page.waitForTimeout(300);
  await page.fill('.field input', 'Looker');
  await page.click('text=Create');
  await page.waitForTimeout(300);
  await page.click('text=New world');
  await page.waitForTimeout(300);
  const inputs = await page.$$('.field input');
  await inputs[0].fill('Look');
  await inputs[1].fill(process.argv[4] || 'atlas');
  await page.click('text=Create');
  await page.waitForTimeout(2600);

  const report = {};
  for (const [name, what] of jobs) {
    const spot = await page.evaluate((kind) => {
      const g = window.fathom;
      const gen = g.deps.worldgen;
      if (kind === 'shore') {
        for (let x = 0; x < 60000; x += 2) {
          const a = gen.columnOf(g.seed, x);
          const b = gen.columnOf(g.seed, x + 40);
          if (a.biome.key === 'beach' && b.biome.key === 'ocean') return { x: x + 18, y: gen.SEA_LEVEL - 6 };
        }
      }
      if (kind === 'border') {
        // A place where two different climate biomes meet.
        for (let x = 0; x < 60000; x += 2) {
          const a = gen.columnOf(g.seed, x).climate.key;
          const b = gen.columnOf(g.seed, x + 60).climate.key;
          const oa = gen.columnOf(g.seed, x).biome.key;
          if (a !== b && oa !== 'ocean' && oa !== 'beach') {
            return { x: x + 30, y: gen.surfaceHeight(g.seed, x + 30) - 8 };
          }
        }
      }
      if (kind === 'walk') {
        return { x: 0, y: gen.surfaceHeight(g.seed, 0) - 8 };
      }
      return { x: 0, y: gen.SEA_LEVEL };
    }, what);

    await page.evaluate((s) => {
      const g = window.fathom;
      g.state.player.x = s.x;
      g.state.player.y = s.y;
      g.state.player.vx = 0;
      g.state.player.vy = 0;
      g.state.camera.zoom = 1.4;
      g.state.dayPhase = 0.02;
    }, spot);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: out + '/look-' + name + '.png' });
    const info = await page.evaluate((s) => {
      const g = window.fathom;
      const gen = g.deps.worldgen;
      const seen = [];
      for (let x = s.x - 70; x < s.x + 70; x += 1) {
        const k = gen.columnOf(g.seed, x).biome.key;
        if (!seen.length || seen[seen.length - 1][0] !== k) seen.push([k, 1]);
        else seen[seen.length - 1][1] += 1;
      }
      return { spot: s, strip: seen.map(([k, n]) => k + 'x' + n).join(' ') };
    }, spot);
    report[name] = info;
  }
  console.log(JSON.stringify(report, null, 1));
  console.log('errors: ' + JSON.stringify(errs));
  await browser.close();
})();
