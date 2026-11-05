'use strict';
// Game shell: input, camera, mining, placing, particles, day cycle and save. Keeps a fixed
// simulation timestep so physics does not change behaviour with frame rate, and renders
// whatever the latest state is.

const STEP = 1 / 120;
const DAY_SECONDS = 600;

function makeGame(canvas, deps) {
  const { tiles, worldgen, chunks, light, texture, render, player: physics, noise, autotile } = deps;
  const seed = readSeed();
  const world = chunks.makeWorld(seed, worldgen);
  const renderer = render.makeRenderer(canvas, { tiles, texture, autotile, light, worldgen, noise });

  const state = {
    world,
    player: spawnPlayer(),
    camera: { x: 0, y: 0, zoom: 2 },
    dayPhase: 0.12,
    time: 0,
    particles: [],
    paused: false,
    message: '',
    messageUntil: 0
  };
  state.camera.x = state.player.x;
  state.camera.y = state.player.y;

  const HOTBAR = ['torch', 'plank', 'brick', 'glass', 'lantern', 'wood', 'stone', 'dirt'];
  const inventory = new Map();
  for (const key of HOTBAR) inventory.set(key, key === 'torch' ? 24 : 0);

  const input = { left: false, right: false, jump: false, down: false, dig: false, place: false };
  const pointer = { x: 0, y: 0, screenX: 0, screenY: 0 };
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
    state.messageUntil = state.time + (seconds || 2.4);
  }

  function spawnParticles(x, y, id, count) {
    const spec = tiles.tile(id);
    for (let i = 0; i < count; i += 1) {
      state.particles.push({
        x: x + Math.random(), y: y + Math.random(),
        vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 5,
        size: 0.1 + Math.random() * 0.14,
        life: 0.5 + Math.random() * 0.5, maxLife: 1,
        colour: spec.colour || '#ffffff'
      });
    }
  }

  function updateParticles(dt) {
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const p = state.particles[i];
      p.vy += 34 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (tiles.isSolid(world.get(Math.floor(p.x), Math.floor(p.y)))) {
        p.vy = -p.vy * 0.26;
        p.vx *= 0.52;
        p.y -= 0.02;
      }
      p.life -= dt;
      if (p.life <= 0) state.particles.splice(i, 1);
    }
    if (state.particles.length > 900) state.particles.splice(0, state.particles.length - 900);
  }

  function mine(dt) {
    const aim = physics.aimTile(state.player, pointer);
    if (!aim.inReach) {
      state.player.mining = null;
      return;
    }
    const id = world.get(aim.x, aim.y);
    if (id === tiles.AIR) {
      state.player.mining = null;
      return;
    }
    const spec = tiles.tile(id);
    const current = state.player.mining;
    if (!current || current.x !== aim.x || current.y !== aim.y) {
      state.player.mining = { x: aim.x, y: aim.y, progress: 0, id };
      return;
    }
    current.progress += dt;
    if (current.progress >= spec.hardness) {
      world.set(aim.x, aim.y, tiles.AIR);
      spawnParticles(aim.x, aim.y, id, 9);
      inventory.set(spec.key, (inventory.get(spec.key) || 0) + 1);
      state.player.mining = null;
    }
  }

  function place() {
    const key = HOTBAR[state.player.selected];
    const have = inventory.get(key) || 0;
    if (have <= 0) {
      say('No ' + tiles.BY_KEY[key].name + ' left');
      return;
    }
    const aim = physics.aimTile(state.player, pointer);
    if (!aim.inReach) return;
    if (world.get(aim.x, aim.y) !== tiles.AIR) return;
    const id = tiles.idOf(key);
    if (tiles.isSolid(id)) {
      const p = state.player;
      const overlapsPlayer = aim.x + 1 > p.x && aim.x < p.x + p.width
        && aim.y + 1 > p.y && aim.y < p.y + p.height;
      if (overlapsPlayer) return;
    }
    const neighbours = tiles.isSolid(world.get(aim.x - 1, aim.y))
      || tiles.isSolid(world.get(aim.x + 1, aim.y))
      || tiles.isSolid(world.get(aim.x, aim.y - 1))
      || tiles.isSolid(world.get(aim.x, aim.y + 1));
    if (!neighbours) return;
    world.set(aim.x, aim.y, id);
    inventory.set(key, have - 1);
  }

  function simulate(dt) {
    physics.step(state.player, world, tiles, input, dt);
    if (input.dig) mine(dt);
    else state.player.mining = null;
    updateParticles(dt);
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
    drawOverlay();
    requestAnimationFrame(frame);
  }

  function drawOverlay() {
    const ctx = canvas.getContext('2d');
    const view = lastView;
    if (view) {
      const size = texture.TILE * view.zoom;
      const aim = physics.aimTile(state.player, pointer);
      const sx = (aim.x - view.x0) * size - view.offsetX;
      const sy = (aim.y - view.y0) * size - view.offsetY;
      ctx.save();
      ctx.lineWidth = 2;
      ctx.strokeStyle = aim.inReach ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.2)';
      ctx.strokeRect(sx + 1, sy + 1, size - 2, size - 2);
      const mining = state.player.mining;
      if (mining) {
        const spec = tiles.tile(mining.id);
        const ratio = Math.min(1, mining.progress / spec.hardness);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(sx + 2, sy + size - 6, (size - 4) * ratio, 4);
      }
      ctx.restore();
    }
    const ui = document.getElementById('hud');
    if (!ui) return;
    const hour = ((state.dayPhase + 0.5) * 24) % 24;
    const clock = String(Math.floor(hour)).padStart(2, '0') + ':'
      + String(Math.floor((hour % 1) * 60)).padStart(2, '0');
    const biome = worldgen.biomeAt(seed, Math.floor(state.player.x));
    const depth = Math.floor(state.player.y) - worldgen.surfaceHeight(seed, Math.floor(state.player.x));
    ui.querySelector('[data-field=clock]').textContent = clock;
    ui.querySelector('[data-field=biome]').textContent = biome.name;
    ui.querySelector('[data-field=depth]').textContent = (depth > 0 ? depth + 'm down' : 'surface');
    ui.querySelector('[data-field=coords]').textContent =
      Math.floor(state.player.x) + ', ' + Math.floor(state.player.y);
    ui.querySelector('[data-field=seed]').textContent = String(seed);
    ui.querySelector('[data-field=edits]').textContent = String(world.editCount());
    const note = ui.querySelector('[data-field=message]');
    note.textContent = state.time < state.messageUntil ? state.message : '';
    const slots = ui.querySelectorAll('[data-slot]');
    slots.forEach((slot, i) => {
      const key = HOTBAR[i];
      if (!key) return;
      slot.classList.toggle('active', i === state.player.selected);
      slot.querySelector('.count').textContent = String(inventory.get(key) || 0);
      slot.querySelector('.name').textContent = tiles.BY_KEY[key].name;
      slot.style.setProperty('--swatch', tiles.BY_KEY[key].colour || '#888');
    });
  }

  function worldFromScreen(ev) {
    const rect = canvas.getBoundingClientRect();
    const px = (ev.clientX - rect.left) * (canvas.width / rect.width);
    const py = (ev.clientY - rect.top) * (canvas.height / rect.height);
    const size = texture.TILE * state.camera.zoom;
    pointer.screenX = px;
    pointer.screenY = py;
    pointer.x = state.camera.x + (px - canvas.width / 2) / size;
    pointer.y = state.camera.y + (py - canvas.height / 2) / size;
  }

  function bind() {
    const keymap = {
      ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
      ArrowUp: 'jump', KeyW: 'jump', Space: 'jump', ArrowDown: 'down', KeyS: 'down'
    };
    addEventListener('keydown', (ev) => {
      if (keymap[ev.code]) {
        input[keymap[ev.code]] = true;
        ev.preventDefault();
      }
      if (ev.code.startsWith('Digit')) {
        const n = Number(ev.code.slice(5));
        if (n >= 1 && n <= HOTBAR.length) state.player.selected = n - 1;
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
      if (ev.button === 0) input.dig = true;
      if (ev.button === 2) place();
      ev.preventDefault();
    });
    addEventListener('mouseup', () => { input.dig = false; });
    canvas.addEventListener('contextmenu', (ev) => ev.preventDefault());
    canvas.addEventListener('wheel', (ev) => {
      state.player.selected = (state.player.selected + (ev.deltaY > 0 ? 1 : -1) + HOTBAR.length) % HOTBAR.length;
      ev.preventDefault();
    }, { passive: false });
    addEventListener('beforeunload', () => {
      try {
        localStorage.setItem('fathom.save', JSON.stringify(world.serialize()));
      } catch (err) { /* storage full or blocked; the seed alone still rebuilds the world */ }
    });
  }

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(canvas.clientWidth * dpr);
    canvas.height = Math.floor(canvas.clientHeight * dpr);
  }

  function restore() {
    try {
      const saved = localStorage.getItem('fathom.save');
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (parsed && parsed.seed === seed) world.restore(parsed);
    } catch (err) { /* a corrupt save is discarded rather than fatal */ }
  }

  function start() {
    resize();
    addEventListener('resize', resize);
    restore();
    bind();
    say('Left click digs, right click places, 1-8 picks a block', 6);
    requestAnimationFrame(frame);
  }

  return { state, start, inventory, HOTBAR, seed };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { makeGame, STEP, DAY_SECONDS };
}
