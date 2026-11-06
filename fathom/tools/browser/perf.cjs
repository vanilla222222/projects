const { chromium } = require('playwright');
// Frame cost in five situations. Measured as the time the game's own draw takes, averaged
// over many frames, rather than as rAF rate: headless Chromium does not vsync honestly.
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8777/', { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(800);
  await page.click('text=New character'); await page.waitForTimeout(250);
  await page.fill('.field input', 'P'); await page.click('text=Create'); await page.waitForTimeout(250);
  await page.click('text=New world'); await page.waitForTimeout(250);
  const i = await page.$$('.field input');
  await i[0].fill('P'); await i[1].fill('perf'); await page.click('text=Create');
  await page.waitForTimeout(3000);

  const res = await page.evaluate(() => {
    const g = window.fathom;
    const gen = g.deps.worldgen, T = g.deps.tiles, E = g.deps.enemy;
    const out = {};

    function time(label, setup, frames) {
      setup();
      // Warm up, so the first measured frame is not the one that bakes something.
      for (let k = 0; k < 10; k += 1) { g.advance(1 / 60); g.drawOnce && g.drawOnce(); }
      const sim = [];
      const drw = [];
      for (let k = 0; k < (frames || 90); k += 1) {
        let t0 = performance.now();
        g.advance(1 / 60);
        sim.push(performance.now() - t0);
        t0 = performance.now();
        if (g.drawOnce) g.drawOnce();
        drw.push(performance.now() - t0);
      }
      const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
      const p95 = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length * 0.95)];
      out[label] = { sim: +mean(sim).toFixed(2), draw: +mean(drw).toFixed(2),
        drawP95: +p95(drw).toFixed(2), total: +(mean(sim) + mean(drw)).toFixed(2) };
      // And which passes the drawing went into.
      g.renderer.setProfiling(true);
      for (let k = 0; k < 40; k += 1) { g.advance(1 / 60); g.drawOnce(); }
      out[label].worst = g.renderer.profile().passes.slice(0, 6)
        .map(p => p.name + ' ' + p.ms);
      g.renderer.setProfiling(false);
    }

    const surfaceY = (x) => gen.surfaceHeight(g.seed, x) - 3;

    time('surface day', () => {
      g.state.player.x = 0; g.state.player.y = surfaceY(0);
      g.state.dayPhase = 0.02; g.state.camera.zoom = 2; g.swarm.clear();
      g.state.time = 0;
    });

    time('surface storm', () => {
      // A time this seed is raining hard at.
      for (let t = 0; t < 400000; t += 20) {
        if (gen.weatherAt(g.seed, t, 'forest').rain > 0.9) { g.state.time = t; break; }
      }
      g.state.dayPhase = 0.02;
    });

    time('deep cave', () => {
      const x = 0;
      g.state.player.x = x; g.state.player.y = gen.surfaceHeight(g.seed, x) + 600;
      g.state.dayPhase = 0.02;
    });

    time('ocean', () => {
      for (let x = 0; x < 40000; x += 4) {
        if (gen.columnOf(g.seed, x).biome.key === 'ocean') {
          g.state.player.x = x; g.state.player.y = gen.SEA_LEVEL + 10; break;
        }
      }
    });

    time('crowd', () => {
      g.state.player.x = 0; g.state.player.y = surfaceY(0);
      g.swarm.clear();
      const roster = ['greenslime', 'zombie', 'demoneye', 'skeleton', 'cavebat',
        'hornet', 'crab', 'shark', 'devourer', 'rockgolem', 'demon', 'harpy'];
      roster.forEach((key, k) => {
        const e = E.makeEnemy(E.BY_KEY[key], g.state.player.x - 12 + k * 2,
          g.state.player.y - 4);
        g.swarm.list.push(e);
      });
      for (let k = 0; k < 60; k += 1) {
        g.state.arrows.push({ x: g.state.player.x + k * 0.3, y: g.state.player.y,
          vx: 20, vy: -3, damage: 1, life: 99, colour: '#9b59d0', gravity: 0,
          magic: k % 2 === 0 });
      }
      for (let k = 0; k < 40; k += 1) g.state.drops.push({ x: g.state.player.x + k * 0.5,
        y: g.state.player.y, vx: 0, vy: 0, key: 'coin', kind: 'coin', count: 1, age: 2 });
    });

    time('boss', () => {
      g.swarm.clear(); g.state.arrows.length = 0; g.state.drops.length = 0;
      g.state.player.x = 0; g.state.player.y = surfaceY(0);
      g.swarm.summon('kingslime', g.state.player);
    }, 150);
    return out;
  });
  console.log(JSON.stringify(res, null, 1));
  console.log('errors: ' + JSON.stringify(errs));
  await browser.close();
})();
