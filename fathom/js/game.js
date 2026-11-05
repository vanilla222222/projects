'use strict';
// Game shell: input, camera, mining, placing, stats and save. A fixed simulation timestep
// keeps physics independent of frame rate; rendering shows whatever the latest state is.

const STEP = 1 / 120;
const DAY_SECONDS = 600;
const PICKUP_RANGE = 2.2;

function makeGame(canvas, deps) {
  const { tiles, worldgen, chunks, light, texture, render, player: physics,
    noise, autotile, inventory: inventoryModule, stats: statsModule, ui: uiModule } = deps;

  const seed = readSeed();
  const world = chunks.makeWorld(seed, worldgen);
  const renderer = render.makeRenderer(canvas, { tiles, texture, autotile, light, worldgen, noise });
  const inventory = inventoryModule.makeInventory();
  const stats = statsModule.makeStats();
  const ui = uiModule.makeUI(document.getElementById('hud'),
    { tiles, texture, inventory, atlas: renderer.atlas });

  const state = {
    world,
    stats,
    player: spawnPlayer(),
    camera: { x: 0, y: 0, zoom: 2 },
    dayPhase: 0.12,
    time: 0,
    particles: [],
    drops: [],
    paused: false,
    message: '',
    messageUntil: 0
  };
  state.camera.x = state.player.x;
  state.camera.y = state.player.y;

  const input = { left: false, right: false, jump: false, down: false, dig: false };
  const pointer = { x: 0, y: 0 };
  let lastView = null;

  function readSeed() {
    const params = new URLSearchParams(location.search);
    const given = params.get('seed');
    if (given !== null && given !== '') {
      const n = Number(given);
      if (Number.isFinite(n)) return Math.floor(n) | 0;
      let h = 0;
      for (const ch of given) h = (Math.imul(h, 31) + ch.charCodeAt(0)) | 0;
      return h;
    }
    const stored = localStorage.getItem('fathom.seed');
    if (stored !== null) return Number(stored) | 0;
    const fresh = (Math.random() * 0x7fffffff) | 0;
    localStorage.setItem('fathom.seed', String(fresh));
    return fresh;
  }

  function spawnPlayer() {
    for (let probe = 0; probe < 256; probe += 1) {
      const column = probe * 7;
      const surface = worldgen.surfaceHeight(seed, column);
      const candidate = physics.makePlayer(column + 0.1, surface - 3);
      if (!physics.overlapsSolid(world, tiles, candidate.x, candidate.y,
        candidate.width, candidate.height)) return candidate;
    }
    return physics.makePlayer(0, worldgen.SKY_H);
  }

  function say(text, seconds) {
    state.message = text;
    state.messageUntil = state.time + (seconds || 2.6);
  }

  function selectedItem() {
    return inventory.slots[inventory.section('hotbar').from + state.player.selected];
  }

  function spawnParticles(x, y, colour, count) {
    for (let i = 0; i < count; i += 1) {
      state.particles.push({
        x: x + Math.random(), y: y + Math.random(),
        vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 5,
        size: 0.1 + Math.random() * 0.14,
        life: 0.5 + Math.random() * 0.5, maxLife: 1,
        colour: colour || '#ffffff'
      });
    }
  }

  // Mined blocks become items on the ground that fly to the player, rather than appearing in
  // the backpack from nowhere. A full backpack therefore leaves them lying there.
  function dropItem(x, y, key, kind, count) {
    state.drops.push({ x: x + 0.5, y: y + 0.5, vx: (Math.random() - 0.5) * 2, vy: -3,
      key, kind: kind || 'block', count: count || 1, age: 0 });
  }

  function updateDrops(dt) {
    const p = state.player;
    const px = p.x + p.width / 2;
    const py = p.y + p.height / 2;
    for (let i = state.drops.length - 1; i >= 0; i -= 1) {
      const d = state.drops[i];
      d.age += dt;
      d.vy = Math.min(32, d.vy + 44 * dt);
      const nextY = d.y + d.vy * dt;
      if (tiles.isSolid(world.get(Math.floor(d.x), Math.floor(nextY)))) {
        d.vy = 0;
        d.vx *= 0.7;
      } else {
        d.y = nextY;
      }
      const nextX = d.x + d.vx * dt;
      if (!tiles.isSolid(world.get(Math.floor(nextX), Math.floor(d.y)))) d.x = nextX;
      else d.vx = 0;
      if (d.age < 0.35) continue;
      const dist = Math.hypot(px - d.x, py - d.y);
      if (dist < PICKUP_RANGE) {
        const pull = 26 * dt;
        d.x += (px - d.x) * Math.min(1, pull);
        d.y += (py - d.y) * Math.min(1, pull);
      }
      if (dist < 0.55) {
        const left = inventory.add({ key: d.key, kind: d.kind }, d.count);
        if (left === 0) state.drops.splice(i, 1);
        else if (left < d.count) d.count = left;
        else if (d.age > 1.2) say('Backpack full', 1.4);
      }
    }
    if (state.drops.length > 300) state.drops.splice(0, state.drops.length - 300);
  }

  function mine(dt) {
    const aim = physics.aimTile(state.player, pointer);
    if (!aim.inReach) {
      state.player.mining = null;
      return;
    }
    const id = world.get(aim.x, aim.y);
    const wallId = world.getWall(aim.x, aim.y);
    const diggingWall = id === tiles.AIR && wallId !== 0;
    if (id === tiles.AIR && !diggingWall) {
      state.player.mining = null;
      return;
    }
    const spec = diggingWall ? tiles.wall(wallId) : tiles.tile(id);
    const hardness = diggingWall ? 0.45 : spec.hardness;
    const current = state.player.mining;
    if (!current || current.x !== aim.x || current.y !== aim.y || current.wall !== diggingWall) {
      state.player.mining = { x: aim.x, y: aim.y, progress: 0, id, wall: diggingWall };
      return;
    }
    current.progress += dt;
    if (current.progress < hardness) return;
    if (diggingWall) {
      world.setWall(aim.x, aim.y, 0);
      spawnParticles(aim.x, aim.y, spec.colour, 6);
      dropItem(aim.x, aim.y, spec.key, 'wall', 1);
    } else {
      world.set(aim.x, aim.y, tiles.AIR);
      spawnParticles(aim.x, aim.y, spec.colour, 9);
      dropItem(aim.x, aim.y, spec.drops || spec.key, 'block', 1);
    }
    state.player.mining = null;
  }

  function place() {
    const item = selectedItem();
    if (!item) return;
    const aim = physics.aimTile(state.player, pointer);
    if (!aim.inReach) return;

    if (item.kind === 'wall') {
      if (world.getWall(aim.x, aim.y) !== 0) return;
      const anchored = world.getWall(aim.x - 1, aim.y) || world.getWall(aim.x + 1, aim.y)
        || world.getWall(aim.x, aim.y - 1) || world.getWall(aim.x, aim.y + 1)
        || tiles.isSolid(world.get(aim.x, aim.y));
      if (!anchored) return;
      world.setWall(aim.x, aim.y, tiles.wallIdOf(item.key));
      inventory.take(item.key, 1);
      return;
    }

    if (world.get(aim.x, aim.y) !== tiles.AIR) return;
    const spec = tiles.BY_KEY[item.key];
    if (!spec) return;
    if (spec.solid) {
      const p = state.player;
      const overlapsPlayer = aim.x + 1 > p.x && aim.x < p.x + p.width
        && aim.y + 1 > p.y && aim.y < p.y + p.height;
      if (overlapsPlayer) return;
    }
    // A torch can hang on a wall with no block beneath it; a block needs something to sit against.
    const againstBlock = tiles.isSolid(world.get(aim.x - 1, aim.y))
      || tiles.isSolid(world.get(aim.x + 1, aim.y))
      || tiles.isSolid(world.get(aim.x, aim.y - 1))
      || tiles.isSolid(world.get(aim.x, aim.y + 1));
    const againstWall = world.getWall(aim.x, aim.y) !== 0;
    if (!againstBlock && !(spec.emit > 0 && againstWall)) return;
    world.set(aim.x, aim.y, spec.id);
    inventory.take(item.key, 1);
  }

  function simulate(dt) {
    const before = state.player.x;
    physics.step(state.player, world, tiles, input, dt);
    const moving = Math.abs(state.player.x - before) > 1e-4 || !state.player.onGround;
    statsModule.step(stats, dt, moving);
    if (input.dig && !ui.isOpen) mine(dt);
    else state.player.mining = null;
    updateDrops(dt);

    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const p = state.particles[i];
      p.vy += 34 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (tiles.isSolid(world.get(Math.floor(p.x), Math.floor(p.y)))) {
        p.vy = -p.vy * 0.26;
        p.vx *= 0.52;
      }
      p.life -= dt;
      if (p.life <= 0) state.particles.splice(i, 1);
    }

    state.dayPhase = (state.dayPhase + dt / DAY_SECONDS) % 1;
    const target = state.player;
    const lerp = 1 - Math.pow(0.0015, dt);
    state.camera.x += (target.x + target.width / 2 - state.camera.x) * lerp;
    state.camera.y += (target.y + target.height / 2 - state.camera.y) * lerp;

    const size = texture.TILE * state.camera.zoom;
    const cols = Math.ceil(canvas.width / size) + 2;
    const rows = Math.ceil(canvas.height / size) + 2;
    const cx = Math.floor(state.camera.x / worldgen.CHUNK);
    const cy = Math.floor(state.camera.y / worldgen.CHUNK);
    const span = Math.ceil(Math.max(cols, rows) / worldgen.CHUNK) + 2;
    world.evictOutside(cx - span, cy - span, cx + span, cy + span);
  }

  let accumulator = 0;
  let previous = 0;
  function frame(now) {
    const dt = previous ? Math.min(0.25, (now - previous) / 1000) : 0;
    previous = now;
    if (!state.paused) {
      accumulator += dt;
      let guard = 0;
      while (accumulator >= STEP && guard < 240) {
        simulate(STEP);
        accumulator -= STEP;
        state.time += STEP;
        guard += 1;
      }
    }
    lastView = renderer.draw(state);
    drawAim();
    syncUI();
    requestAnimationFrame(frame);
  }

  function drawAim() {
    if (!lastView || ui.isOpen) return;
    const ctx = canvas.getContext('2d');
    const size = texture.TILE * lastView.zoom;
    const aim = physics.aimTile(state.player, pointer);
    const sx = (aim.x - lastView.x0) * size - lastView.offsetX;
    const sy = (aim.y - lastView.y0) * size - lastView.offsetY;
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = aim.inReach ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.18)';
    ctx.strokeRect(sx + 1, sy + 1, size - 2, size - 2);
    const mining = state.player.mining;
    if (mining) {
      const spec = mining.wall ? tiles.wall(mining.id) : tiles.tile(mining.id);
      const hardness = mining.wall ? 0.45 : spec.hardness;
      ctx.fillStyle = 'rgba(255,255,255,0.32)';
      ctx.fillRect(sx + 2, sy + size - 6, (size - 4) * Math.min(1, mining.progress / hardness), 4);
    }
    ctx.restore();
  }

  function syncUI() {
    const hour = ((state.dayPhase + 0.5) * 24) % 24;
    ui.setField('clock', String(Math.floor(hour)).padStart(2, '0') + ':'
      + String(Math.floor((hour % 1) * 60)).padStart(2, '0'));
    ui.setField('biome', worldgen.biomeAt(seed, Math.floor(state.player.x)).name);
    const depth = Math.floor(state.player.y) - worldgen.surfaceHeight(seed, Math.floor(state.player.x));
    ui.setField('depth', depth > 0 ? depth + 'm down' : 'surface');
    ui.setField('coords', Math.floor(state.player.x) + ', ' + Math.floor(state.player.y));
    ui.setField('seed', String(seed));
    ui.setMessage(state.time < state.messageUntil ? state.message : '');
    ui.sync(state);
  }

  function worldFromScreen(ev) {
    const rect = canvas.getBoundingClientRect();
    const px = (ev.clientX - rect.left) * (canvas.width / rect.width);
    const py = (ev.clientY - rect.top) * (canvas.height / rect.height);
    const size = texture.TILE * state.camera.zoom;
    pointer.x = state.camera.x + (px - canvas.width / 2) / size;
    pointer.y = state.camera.y + (py - canvas.height / 2) / size;
  }

  function bind() {
    const keymap = {
      ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
      ArrowUp: 'jump', KeyW: 'jump', Space: 'jump', ArrowDown: 'down', KeyS: 'down'
    };
    addEventListener('keydown', (ev) => {
      if (ev.code === 'KeyE' || ev.code === 'Tab' || ev.code === 'KeyI') {
        ui.toggle();
        ev.preventDefault();
        return;
      }
      if (ev.code === 'Escape' && ui.isOpen) {
        ui.setOpen(false);
        return;
      }
      if (keymap[ev.code]) {
        input[keymap[ev.code]] = true;
        ev.preventDefault();
      }
      if (ev.code.startsWith('Digit')) {
        const n = Number(ev.code.slice(5));
        state.player.selected = n === 0 ? 9 : n - 1;
      }
      if (ev.code === 'KeyP') state.paused = !state.paused;
      if (ev.code === 'BracketRight') state.camera.zoom = Math.min(4, state.camera.zoom + 0.5);
      if (ev.code === 'BracketLeft') state.camera.zoom = Math.max(1, state.camera.zoom - 0.5);
    });
    addEventListener('keyup', (ev) => {
      if (keymap[ev.code]) input[keymap[ev.code]] = false;
    });
    canvas.addEventListener('mousemove', worldFromScreen);
    canvas.addEventListener('mousedown', (ev) => {
      worldFromScreen(ev);
      if (ui.isOpen) return;
      if (ev.button === 0) input.dig = true;
      if (ev.button === 2) place();
      ev.preventDefault();
    });
    addEventListener('mouseup', () => { input.dig = false; });
    canvas.addEventListener('contextmenu', (ev) => ev.preventDefault());
    canvas.addEventListener('wheel', (ev) => {
      const count = inventory.section('hotbar').size;
      state.player.selected = (state.player.selected + (ev.deltaY > 0 ? 1 : -1) + count) % count;
      ev.preventDefault();
    }, { passive: false });
    addEventListener('beforeunload', save);
  }

  function save() {
    try {
      localStorage.setItem('fathom.save', JSON.stringify({
        world: world.serialize(), inventory: inventory.serialize(),
        stats: { health: stats.health, maxHealth: stats.maxHealth, mana: stats.mana, maxMana: stats.maxMana }
      }));
    } catch (err) { /* storage blocked or full; the seed alone still rebuilds the world */ }
  }

  function restore() {
    try {
      const saved = JSON.parse(localStorage.getItem('fathom.save') || 'null');
      if (!saved || !saved.world || saved.world.seed !== seed) return false;
      world.restore(saved.world);
      inventory.restore(saved.inventory);
      if (saved.stats) Object.assign(stats, saved.stats);
      return true;
    } catch (err) {
      return false;
    }
  }

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(canvas.clientWidth * dpr);
    canvas.height = Math.floor(canvas.clientHeight * dpr);
  }

  function start() {
    resize();
    addEventListener('resize', resize);
    ui.build();
    if (!restore()) {
      inventory.add({ key: 'torch', kind: 'block' }, 40, 'hotbar');
      inventory.add({ key: 'plankwall', kind: 'wall' }, 60, 'hotbar');
    }
    bind();
    say('E opens the backpack. Left click digs, right click places.', 7);
    requestAnimationFrame(frame);
  }

  return { state, start, inventory, stats, seed, ui };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { makeGame, STEP, DAY_SECONDS };
}
