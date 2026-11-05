'use strict';
// Game shell: input, camera, mining, placing, stats and save. A fixed simulation timestep
// keeps physics independent of frame rate; rendering shows whatever the latest state is.

const STEP = 1 / 120;
const DAY_SECONDS = 600;
const PICKUP_RANGE = 2.2;

function makeGame(canvas, deps) {
  const { tiles, worldgen, chunks, light, texture, render, player: physics,
    noise, autotile, mining, inventory: inventoryModule, stats: statsModule, ui: uiModule,
    profile: profileModule, menu: menuModule } = deps;

  const profiles = profileModule.makeProfiles(window.localStorage);
  const menu = menuModule.makeMenu(document.getElementById('menu'),
    { profiles, palette: profileModule, parseSeed: profileModule.parseSeed });

  // Nothing world-shaped exists until a world is chosen, so each of these is filled in by
  // boot(). A character brings its own inventory and stats into whichever world it enters.
  let seed = 0;
  let world = null;
  let renderer = null;
  let inventory = null;
  let stats = null;
  let ui = null;
  let characterId = null;
  let worldId = null;
  let running = false;
  let sessionStart = 0;
  let carriedCharacterSeconds = 0;
  let carriedWorldSeconds = 0;

  const state = {
    world: null,
    stats: null,
    player: null,
    colours: null,
    camera: { x: 0, y: 0, zoom: 2 },
    dayPhase: 0.12,
    time: 0,
    particles: [],
    drops: [],
    paused: false,
    message: '',
    messageUntil: 0
  };

  const input = { left: false, right: false, jump: false, down: false, dig: false };
  const pointer = { x: 0, y: 0 };
  let lastView = null;

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

    // You have to be holding the pickaxe, as in Terraria. That is what makes the hotbar
    // a decision rather than a shelf.
    const held = selectedItem();
    const tool = mining.isTool(held) ? held : null;
    if (!tool) {
      state.player.mining = null;
      say('Hold a pickaxe to mine', 0.9);
      return;
    }

    const spec = diggingWall ? tiles.wall(wallId) : tiles.tile(id);
    const power = mining.powerOf(tool);
    // Walls come away like soft ground: they are a backing, not a seam of rock.
    const perHit = diggingWall ? power * 2 : mining.damagePerHit(power, spec);
    if (perHit <= 0) {
      state.player.mining = null;
      say(spec.name + ' needs a ' + mining.requirementName(spec), 1.6);
      return;
    }

    const current = state.player.mining;
    if (!current || current.x !== aim.x || current.y !== aim.y || current.wall !== diggingWall) {
      // A fresh tile starts undamaged and swings at once, so the first click always bites.
      const toughness = diggingWall ? mining.BREAK_AT : mining.toughnessOf(spec);
      state.player.mining = { x: aim.x, y: aim.y, damage: perHit, swing: 0,
        id, wall: diggingWall, perHit, toughness };
      spawnParticles(aim.x, aim.y, spec.colour, 2);
      if (perHit < toughness) return;
    } else {
      current.perHit = perHit;
      current.swing += dt;
      if (current.swing < mining.useTimeOf(tool)) return;
      current.swing -= mining.useTimeOf(tool);
      current.damage += perHit;
      spawnParticles(aim.x, aim.y, spec.colour, 2);
      if (current.damage < current.toughness) return;
    }

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
    if (!running) return;
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
    const dig = state.player.mining;
    if (dig) {
      const spec = dig.wall ? tiles.wall(dig.id) : tiles.tile(dig.id);

      ctx.fillStyle = 'rgba(255,255,255,0.32)';
      ctx.fillRect(sx + 2, sy + size - 6, (size - 4) * Math.min(1, dig.damage / dig.toughness), 4);
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
      if (!running) return;
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
      if (!running) return;
      if (keymap[ev.code]) input[keymap[ev.code]] = false;
    });
    canvas.addEventListener('mousemove', (ev) => { if (running) worldFromScreen(ev); });
    canvas.addEventListener('mousedown', (ev) => {
      if (!running) return;
      worldFromScreen(ev);
      if (ui.isOpen) return;
      if (ev.button === 0) input.dig = true;
      if (ev.button === 2) place();
      ev.preventDefault();
    });
    addEventListener('mouseup', () => { input.dig = false; });
    canvas.addEventListener('contextmenu', (ev) => ev.preventDefault());
    canvas.addEventListener('wheel', (ev) => {
      if (!running) return;
      const count = inventory.section('hotbar').size;
      state.player.selected = (state.player.selected + (ev.deltaY > 0 ? 1 : -1) + count) % count;
      ev.preventDefault();
    }, { passive: false });
    addEventListener('beforeunload', save);
  }

  function save() {
    if (!running) return;
    const elapsed = Math.floor((Date.now() - sessionStart) / 1000);
    profiles.saveCharacter(characterId, {
      inventory: inventory.serialize(),
      stats: { health: stats.health, maxHealth: stats.maxHealth,
        mana: stats.mana, maxMana: stats.maxMana },
      colours: state.colours,
      playedSeconds: carriedCharacterSeconds + elapsed
    });
    profiles.saveWorld(worldId, {
      world: world.serialize(),
      dayPhase: state.dayPhase,
      spawn: { x: state.player.x, y: state.player.y },
      playedSeconds: carriedWorldSeconds + elapsed
    });
  }

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(canvas.clientWidth * dpr);
    canvas.height = Math.floor(canvas.clientHeight * dpr);
  }

  function boot(choice) {
    characterId = choice.character.id;
    worldId = choice.world.id;
    const characterRecord = profiles.loadCharacter(characterId) || {};
    const worldRecord = profiles.loadWorld(worldId) || {};
    seed = choice.world.seed;

    world = chunks.makeWorld(seed, worldgen);
    if (worldRecord.world && worldRecord.world.seed === seed) world.restore(worldRecord.world);

    renderer = render.makeRenderer(canvas, { tiles, texture, autotile, light, worldgen, noise });
    inventory = inventoryModule.makeInventory();
    stats = statsModule.makeStats();
    ui = uiModule.makeUI(document.getElementById('hud'),
      { tiles, texture, inventory, atlas: renderer.atlas, mining });

    if (characterRecord.inventory) inventory.restore(characterRecord.inventory);
    else {
      inventory.add({ key: 'wood-pick', kind: 'tool' }, 1, 'hotbar');
      inventory.add({ key: 'torch', kind: 'block' }, 40, 'hotbar');
      inventory.add({ key: 'plankwall', kind: 'wall' }, 60, 'hotbar');
    }
    if (characterRecord.stats) Object.assign(stats, characterRecord.stats);

    carriedCharacterSeconds = choice.character.playedSeconds || 0;
    carriedWorldSeconds = choice.world.playedSeconds || 0;
    sessionStart = Date.now();

    state.world = world;
    state.stats = stats;
    state.colours = characterRecord.colours || choice.character.colours;
    state.dayPhase = worldRecord.dayPhase === undefined ? 0.12 : worldRecord.dayPhase;
    state.player = spawnPlayer();
    if (worldRecord.spawn
      && !physics.overlapsSolid(world, tiles, worldRecord.spawn.x, worldRecord.spawn.y,
        state.player.width, state.player.height)) {
      state.player.x = worldRecord.spawn.x;
      state.player.y = worldRecord.spawn.y;
    }
    state.camera.x = state.player.x;
    state.camera.y = state.player.y;

    ui.build();
    running = true;
    say(choice.world.name + ' \u2014 seed ' + seed + '. E opens the backpack.', 7);
    setInterval(save, 20000);
    requestAnimationFrame(frame);
  }

  function start() {
    resize();
    addEventListener('resize', resize);
    bind();
    menu.open().then(boot);
  }

  // A narrow seam for the browser checks: aim the cursor at a tile and swing once. It
  // drives the same mine() the mouse does, so a wiring mistake shows up here too.
  function swingAt(x, y, dt) {
    pointer.x = x + 0.5;
    pointer.y = y + 0.5;
    mine(dt);
  }

  return { state, start, deps, swingAt, selectedItem,
    get inventory() { return inventory; },
    get stats() { return stats; },
    get seed() { return seed; },
    get ui() { return ui; },
    get profiles() { return profiles; } };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { makeGame, STEP, DAY_SECONDS };
}
