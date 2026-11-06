const { chromium } = require('playwright');
// A long randomised session. Everything here is an invariant that should hold at every
// moment of play, checked every simulated second rather than at the end, so a failure
// reports when it started rather than that it happened.
(async () => {
  const minutes = Number(process.argv[2] || 10);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e.message)));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto('http://localhost:8777/', { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(800);
  await page.click('text=New character'); await page.waitForTimeout(250);
  await page.fill('.field input', 'Soak'); await page.click('text=Create'); await page.waitForTimeout(250);
  await page.click('text=New world'); await page.waitForTimeout(250);
  const i = await page.$$('.field input');
  await i[0].fill('Soak'); await i[1].fill('soak'); await page.click('text=Create');
  await page.waitForTimeout(3000);

  const res = await page.evaluate((minutes) => {
    const g = window.fathom, T = g.deps.tiles, P = g.deps.player;
    const problems = [];
    const peak = { drops: 0, particles: 0, arrows: 0, chunks: 0, edits: 0, enemies: 0,
      stars: 0, heap: 0 };
    // mulberry32. The obvious LCG - rng * 1103515245 + 12345 - overflows 2^53 in a
    // double and degenerates to a constant, which made an earlier run of this test hold
    // exactly one set of keys for ten minutes and report that nothing was ever mined.
    let rng = 12345;
    const rand = () => {
      rng = (rng + 0x6d2b79f5) | 0;
      let t = Math.imul(rng ^ (rng >>> 15), 1 | rng);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const say = (t, what) => { if (problems.length < 40) problems.push(t.toFixed(0) + 's: ' + what); };

    const steps = Math.round(minutes * 60 * 60);
    for (let k = 0; k < steps; k += 1) {
      // Randomised but coherent input: hold a direction for a while rather than
      // flickering, which is what a player does and what shakes out the physics.
      if (k % 40 === 0) {
        const roll = rand();
        // A third of the time, stand still and dig. Pure noise never does this - it is
        // always walking - and a player who walks while mining resets the tile they were
        // working on, so ten minutes of noise broke not one block.
        if (roll < 0.33) {
          window.__hold = { left: false, right: false, jump: false, down: false, dig: true,
            still: true };
        } else {
          window.__hold = { left: roll < 0.55, right: roll >= 0.55,
            jump: rand() < 0.35, down: rand() < 0.15, dig: rand() < 0.5 };
        }
      }
      const hold = window.__hold || {};
      g.input.left = !!hold.left; g.input.right = !!hold.right;
      g.input.jump = !!hold.jump; g.input.down = !!hold.down; g.input.dig = !!hold.dig;
      // Aim somewhere reachable.
      // Standing still means keeping the cursor on one tile, which is how a tile ever
      // takes enough hits to break.
      if (hold.still) {
        if (k % 90 === 0) {
          window.__aim = { x: g.state.player.x + (rand() - 0.5) * 5,
            y: g.state.player.y + 1 + rand() * 3 };
        }
        const aim = window.__aim || { x: g.state.player.x, y: g.state.player.y + 2 };
        g.pointer.x = aim.x;
        g.pointer.y = aim.y;
      } else if (k % 7 === 0) {
        g.pointer.x = g.state.player.x + (rand() - 0.5) * 8;
        g.pointer.y = g.state.player.y + (rand() - 0.5) * 8;
      }
      g.advance(1 / 60);

      if (k % 60 !== 0) continue;
      const t = k / 60;
      const p = g.state.player;
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) { say(t, 'player position is ' + p.x + ',' + p.y); break; }
      if (!Number.isFinite(p.vx) || !Number.isFinite(p.vy)) say(t, 'player velocity is ' + p.vx + ',' + p.vy);
      if (P.overlapsSolid(g.state.world, T, p.x, p.y, p.width, p.height)) say(t, 'player is inside a solid tile');
      const s = g.stats;
      if (!(s.health >= 0 && s.health <= s.maxHealth)) say(t, 'health is ' + s.health + '/' + s.maxHealth);
      if (!(s.mana >= 0 && s.mana <= s.maxMana)) say(t, 'mana is ' + s.mana + '/' + s.maxMana);
      if (!Number.isFinite(g.state.dayPhase) || g.state.dayPhase < 0 || g.state.dayPhase > 1) say(t, 'dayPhase is ' + g.state.dayPhase);
      for (const e of g.state.enemies) {
        if (!Number.isFinite(e.x) || !Number.isFinite(e.y)) { say(t, e.key + ' is at ' + e.x + ',' + e.y); break; }
      }
      for (const d of g.state.drops) {
        if (!Number.isFinite(d.x) || !Number.isFinite(d.y)) { say(t, 'a drop is at ' + d.x + ',' + d.y); break; }
      }
      peak.drops = Math.max(peak.drops, g.state.drops.length);
      peak.particles = Math.max(peak.particles, g.state.particles.length);
      peak.arrows = Math.max(peak.arrows, g.state.arrows.length);
      peak.stars = Math.max(peak.stars, g.state.stars.length);
      peak.enemies = Math.max(peak.enemies, g.state.enemies.length);
      peak.chunks = Math.max(peak.chunks, g.state.world.loadedCount);
      peak.edits = Math.max(peak.edits, g.state.world.editCount());
      if (performance.memory) peak.heap = Math.max(peak.heap, Math.round(performance.memory.usedJSHeapSize / 1048576));
    }
    // And the world still saves and reloads after all that.
    let saved = null;
    let savedOk = false;
    try {
      saved = JSON.stringify(g.state.world.serialize());
      const fresh = g.deps.chunks.makeWorld(g.seed, g.deps.worldgen);
      fresh.restore(JSON.parse(saved));
      savedOk = true;
    } catch (e) { say(0, 'saving threw: ' + e.message); }
    return { problems, peak, savedBytes: saved ? saved.length : 0, savedOk,
      deaths: g.state.progress.deaths, deathsBy: g.deathsBy, nights: g.state.nights,
      finalDepth: Math.round(g.state.player.y) };
  }, minutes);
  console.log(JSON.stringify(res, null, 1));
  console.log('page errors: ' + JSON.stringify(errs.slice(0, 8)));
  await browser.close();
})();
