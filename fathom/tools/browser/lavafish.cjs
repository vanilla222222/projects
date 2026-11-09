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
  await page.fill('.field input', 'L'); await page.click('text=Create'); await page.waitForTimeout(250);
  await page.click('text=New world'); await page.waitForTimeout(250);
  const i = await page.$$('.field input');
  await i[0].fill('L'); await i[1].fill('lava'); await page.click('text=Create');
  await page.waitForTimeout(2600);
  const res = await page.evaluate(() => {
    const g = window.fathom, T = g.deps.tiles, W = g.state.world, gen = g.deps.worldgen;
    const out = {};
    // Build a lava lake in hell with a ledge to stand on.
    const x0 = 0;
    const hellY = gen.SEA_LEVEL + 1300;
    for (let x = x0 - 30; x < x0 + 30; x += 1) {
      for (let y = hellY - 12; y < hellY + 14; y += 1) W.set(x, y, T.AIR);
    }
    for (let x = x0 - 30; x < x0 + 30; x += 1) W.set(x, hellY + 14, T.idOf('brimstone'));
    for (let x = x0 - 6; x < x0 + 26; x += 1) {
      for (let y = hellY + 2; y <= hellY + 13; y += 1) W.set(x, y, T.idOf('lava'));
    }
    for (let x = x0 - 12; x < x0 - 5; x += 1) W.set(x, hellY + 2, T.idOf('brimstone'));
    g.state.player.x = x0 - 9; g.state.player.y = hellY;
    g.state.camera.zoom = 1.8;
    g.stats.maxHealth = 9000; g.stats.health = 9000;
    const hot = g.inventory.section('hotbar').from;
    g.state.player.selected = 0;

    // A wooden rod should refuse lava.
    g.inventory.slots[hot] = { key: 'wood-rod', kind: 'tool', count: 1 };
    g.pointer.x = x0 + 2; g.pointer.y = hellY + 5;
    g.place();
    out.woodenRodInLava = !!g.state.bobber;

    // A hellfire rod should not.
    g.inventory.slots[hot] = { key: 'hellfire-rod', kind: 'tool', count: 1 };
    g.place();
    out.hellfireRodInLava = !!g.state.bobber;
    out.liquid = g.state.bobber && g.state.bobber.liquid;
    out.amount = g.state.bobber && g.state.bobber.amount;

    const caught = [];
    for (let k = 0; k < 60 * 150; k += 1) {
      g.state.player.x = x0 - 9; g.state.player.y = hellY;
      g.state.player.vx = 0; g.state.player.vy = 0;
      g.advance(1 / 60);
      const b = g.state.bobber;
      if (!b) { g.pointer.x = x0 + 2; g.pointer.y = hellY + 5; g.place(); continue; }
      if (b.biting > 0) {
        const before = g.state.drops.length;
        g.place();
        for (const d of g.state.drops.slice(before)) caught.push(d.key);
      }
    }
    const tally = {};
    for (const c of caught) tally[c] = (tally[c] || 0) + 1;
    out.lavaTally = tally;

    // Open a hellforged crate and see what is in it.
    g.inventory.slots[hot] = { key: 'hellcrate', kind: 'use', count: 1 };
    const before = g.state.drops.length;
    g.place();
    out.hellcrateHeld = g.state.drops.slice(before).map(d => d.key + 'x' + d.count);
    return out;
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: out + '/lavafish.png' });
  console.log(JSON.stringify(res, null, 1));
  console.log('errors: ' + JSON.stringify(errs));
  await browser.close();
})();
