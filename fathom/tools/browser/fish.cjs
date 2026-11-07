const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2];
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1300, height: 720 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto('http://localhost:8777/', { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(800);
  await page.click('text=New character'); await page.waitForTimeout(250);
  await page.fill('.field input', 'F'); await page.click('text=Create'); await page.waitForTimeout(250);
  await page.click('text=New world'); await page.waitForTimeout(250);
  const i = await page.$$('.field input');
  await i[0].fill('F'); await i[1].fill('fish'); await page.click('text=Create');
  await page.waitForTimeout(2600);
  const res = await page.evaluate(() => {
    const g = window.fathom, gen = g.deps.worldgen, T = g.deps.tiles;
    const out = {};
    // Go to the sea.
    // Well inside the ocean, not on the first column of it: the point of the water
    // survey is that the edge of the sea is not the sea.
    let sx = null;
    for (let x = 0; x < 40000 && sx === null; x += 3) {
      let deep = true;
      for (let d = 0; d <= 60; d += 6) {
        if (gen.columnOf(g.seed, x + d).biome.key !== 'ocean') { deep = false; break; }
      }
      if (deep) sx = x + 30;
    }
    out.ocean = sx;
    g.state.player.x = sx; g.state.player.y = gen.SEA_LEVEL - 4;
    g.state.camera.zoom = 2;
    g.state.dayPhase = 0.02;
    for (let k = 0; k < 120; k += 1) g.advance(1 / 60);

    const hot = g.inventory.section('hotbar').from;
    g.inventory.slots[hot] = { key: 'gold-rod', kind: 'tool', count: 1 };
    g.state.player.selected = 0;

    out.water = g.deps.fishing.waterAround(g.state.world, T, Math.floor(sx) + 3,
      Math.floor(gen.SEA_LEVEL) + 3);
    // Cast at the sea.
    g.pointer.x = sx + 3; g.pointer.y = gen.SEA_LEVEL + 3;
    g.place();
    out.cast = !!g.state.bobber;
    out.castTile = g.deps.tiles.tile(g.state.world.get(sx + 3, gen.SEA_LEVEL + 3)).key;

    // Fish for a while, pulling whenever it bites.
    const caught = [];
    for (let k = 0; k < 60 * 180; k += 1) {
      // Hold the angler still. Dropped in open sea they sink, drift out of casting
      // range, and the line breaks - which is correct behaviour and a useless fixture.
      g.state.player.x = sx;
      g.state.player.y = gen.SEA_LEVEL - 4;
      g.state.player.vx = 0;
      g.state.player.vy = 0;
      g.advance(1 / 60);
      const b = g.state.bobber;
      if (!b) {
        // Only cast when there is no line out. Casting again while one is out pulls it
        // in, which is how an earlier version of this loop cancelled its own cast every
        // single frame and caught one shrimp in three minutes.
        g.pointer.x = sx + 3;
        g.pointer.y = gen.SEA_LEVEL + 3;
        g.place();
        continue;
      }
      if (b.biting > 0) {
        const before = g.state.drops.length;
        g.place();
        for (const d of g.state.drops.slice(before)) caught.push(d.key);
      }
    }
    out.caught = caught.length;
    const tally = {};
    for (const c of caught) tally[c] = (tally[c] || 0) + 1;
    out.tally = tally;

    // A puddle should not fish like the sea.
    const px = Math.floor(g.state.player.x);
    out.puddlePool = g.deps.fishing.catchesFor({ biome: 'forest', layer: 'surface', water: 6 })
      .map(e => e.key);
    out.seaPool = g.deps.fishing.catchesFor({ biome: 'ocean', layer: 'surface', water: 400 })
      .map(e => e.key);
    void px;
    return out;
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: out + '/fishing.png' });
  console.log(JSON.stringify(res, null, 1));
  console.log('errors: ' + JSON.stringify(errs));
  await browser.close();
})();
