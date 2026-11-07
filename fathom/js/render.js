'use strict';
// Layered renderer. The lighting trick is worth knowing: light is computed per tile, written
// into a canvas one pixel per tile, then drawn over the world scaled up with smoothing on and
// a multiply blend. That turns blocky per-tile values into soft coloured gradients for the
// cost of one small canvas, instead of shading each tile individually.

function makeRenderer(canvas, deps) {
  const { tiles, texture, autotile, light, worldgen, noise, sprite } = deps;
  const ctx = canvas.getContext('2d');
  const lightCanvas = document.createElement('canvas');
  const lightCtx = lightCanvas.getContext('2d');
  const atlas = texture.bakeAtlas(document, tiles);
  const TILE = texture.TILE;
  const field = light.makeLightField(tiles);
  const stars = [];
  for (let i = 0; i < 220; i += 1) {
    stars.push({ x: Math.random(), y: Math.random() * 0.62, r: 0.4 + Math.random() * 1.1,
      twinkle: Math.random() * Math.PI * 2 });
  }

  function skyColours(dayPhase) {
    const e = light.solarElevation(dayPhase);
    if (e >= 0.3) return ['#5aa6e8', '#9fd0f2', '#cfe8fa'];
    if (e >= 0) {
      const t = e / 0.3;
      return [
        texture.shade('#2d4a7a', 0.45 * t),
        mixHex('#e07a4a', '#9fd0f2', t),
        mixHex('#f3c58a', '#cfe8fa', t)
      ];
    }
    if (e >= -0.25) {
      const t = -e / 0.25;
      return [mixHex('#2d4a7a', '#0a1026', t), mixHex('#e07a4a', '#1c2545', t), mixHex('#f3c58a', '#2b3150', t)];
    }
    return ['#060a18', '#0d1430', '#18203c'];
  }

  function mixHex(a, b, t) {
    const pa = parseInt(a.slice(1), 16);
    const pb = parseInt(b.slice(1), 16);
    const r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t);
    const g = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t);
    const bl = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
    return 'rgb(' + r + ',' + g + ',' + bl + ')';
  }

  // How far into space the camera is: 0 at and below the sky layer's floor, 1 once the
  // camera is properly in vacuum. Used to black out the sky and hide the horizon, because
  // a planetoid against a blue sky with mountains behind it reads as a hill, not a world.
  // Drifting cloud banks, drawn as soft overlapping blobs. They move with the camera at
  // a fraction of its speed and with time, so the sky is not a still photograph.
  const CLOUD_BANDS = [
    { y: 0.12, scale: 0.0016, drift: 6, size: 96, alpha: 0.26, depth: 0.04 },
    { y: 0.22, scale: 0.0026, drift: 11, size: 68, alpha: 0.3, depth: 0.07 },
    { y: 0.32, scale: 0.0038, drift: 18, size: 46, alpha: 0.2, depth: 0.11 }
  ];

  function drawClouds(state) {
    const vacuum = spaceFactor(state);
    if (vacuum >= 1) return;
    const night = Math.max(0, -light.solarElevation(state.dayPhase));
    const tint = night > 0.3 ? '235,238,250' : '255,253,246';
    ctx.save();
    ctx.globalAlpha = (1 - vacuum) * (night > 0.3 ? 0.5 : 1);
    for (const band of CLOUD_BANDS) {
      const gust = (state.weather && state.weather.wind) || 0;
      const originX = state.camera.x * band.depth + state.time * (band.drift + gust * 26);
      const baseY = canvas.height * band.y;
      for (let px = -band.size; px <= canvas.width + band.size; px += band.size * 0.7) {
        const wx = (originX + px) * band.scale;
        const n = noise.fbm1(state.world.seed + 4201, wx, 131, 3, 2, 0.5);
        // The threshold is what makes a sky of separate clouds rather than one overcast
        // sheet: most of the field has to fall below it, or the puffs merge into fog.
        if (n < 0.54) continue;
        // Eased rather than linear: a linear ramp from the threshold makes every cloud
        // nearly transparent, because the noise rarely reaches its own maximum.
        const puff = Math.min(1, Math.pow((n - 0.54) / 0.18, 0.7));
        const r = band.size * (0.35 + puff * 0.8);
        const yy = baseY + Math.sin(wx * 3.1) * band.size * 0.3;
        const g = ctx.createRadialGradient(px, yy, r * 0.2, px, yy, r);
        g.addColorStop(0, 'rgba(' + tint + ',' + (band.alpha * puff).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(' + tint + ',0)');
        ctx.fillStyle = g;
        ctx.fillRect(px - r, yy - r, r * 2, r * 2);
      }
    }
    ctx.restore();
  }

  function spaceFactor(state) {
    if (!worldgen || !worldgen.SEA_LEVEL) return 0;
    const alt = state.camera.y - worldgen.SEA_LEVEL;
    return Math.max(0, Math.min(1, (-alt - 300) / 450));
  }

  function drawSky(state) {
    const [top, mid, low] = skyColours(state.dayPhase);
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    // Five stops rather than three. A three-stop gradient over a whole screen is a flat
    // wash: the extra stops are where the sky gets its depth, and the band just above the
    // horizon is where most of the colour of a real sky actually lives.
    g.addColorStop(0, top);
    g.addColorStop(0.3, mixHex(top, mid, 0.55));
    g.addColorStop(0.58, mid);
    g.addColorStop(0.82, mixHex(mid, low, 0.7));
    g.addColorStop(1, low);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // A haze band sitting on the horizon, brightest where the sun is.
    const elev = light.solarElevation(state.dayPhase);
    if (elev > -0.2) {
      const haze = ctx.createLinearGradient(0, canvas.height * 0.52, 0, canvas.height * 0.92);
      const strength = Math.max(0, Math.min(1, (elev + 0.2) / 0.6));
      haze.addColorStop(0, 'rgba(255,255,255,0)');
      haze.addColorStop(1, 'rgba(255,248,232,' + (0.16 * strength).toFixed(3) + ')');
      ctx.fillStyle = haze;
      ctx.fillRect(0, canvas.height * 0.52, canvas.width, canvas.height * 0.4);
    }

    drawClouds(state);

    // In space the sky goes black whatever the hour.
    const vacuum = spaceFactor(state);
    if (vacuum > 0) {
      ctx.save();
      ctx.globalAlpha = vacuum;
      ctx.fillStyle = '#05060e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    const night = Math.max(0, Math.max(-light.solarElevation(state.dayPhase), vacuum));
    if (night > 0.02) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, night * 1.6);
      for (const s of stars) {
        const tw = 0.55 + 0.45 * Math.sin(state.time * 1.6 + s.twinkle);
        ctx.globalAlpha = Math.min(1, night * 1.6) * tw;
        ctx.fillStyle = '#eaf2ff';
        ctx.beginPath();
        ctx.arc(s.x * canvas.width, s.y * canvas.height, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    const angle = (state.dayPhase + 0.75) * Math.PI * 2;
    const cx = canvas.width * 0.5 + Math.cos(angle) * canvas.width * 0.42;
    const cy = canvas.height * 0.62 + Math.sin(angle) * canvas.height * 0.52;
    const isSun = light.solarElevation(state.dayPhase) >= 0;
    // A blood moon is bigger, red, and lights the whole sky rather than a disc of it.
    // The event has to be visible from inside a house, which means it has to be in the
    // sky and not only in the spawn table.
    const bloody = !isSun && !!state.bloodMoon;
    const r = isSun ? 30 : (bloody ? 34 : 22);
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * (bloody ? 7 : 4.5));
    if (isSun) {
      glow.addColorStop(0, 'rgba(255,246,214,0.95)');
      glow.addColorStop(0.18, 'rgba(255,224,150,0.5)');
    } else if (bloody) {
      glow.addColorStop(0, 'rgba(255,120,110,0.95)');
      glow.addColorStop(0.16, 'rgba(210,60,60,0.5)');
      glow.addColorStop(0.5, 'rgba(150,30,36,0.18)');
    } else {
      glow.addColorStop(0, 'rgba(208,224,255,0.75)');
      glow.addColorStop(0.18, 'rgba(170,196,240,0.3)');
    }
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, r * (bloody ? 7 : 4.5), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = isSun ? '#fffbe8' : (bloody ? '#e04a46' : '#dfe8ff');
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    if (bloody) {
      // A wash of red over the whole sky, so the night reads as wrong from anywhere
      // with a window.
      const wash = ctx.createLinearGradient(0, 0, 0, canvas.height);
      wash.addColorStop(0, 'rgba(120,16,22,0.34)');
      wash.addColorStop(1, 'rgba(60,8,14,0.16)');
      ctx.fillStyle = wash;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  function drawParallax(state) {
    // The horizon fades out as the camera climbs: there is nothing to see from space.
    const vacuum = spaceFactor(state);
    if (vacuum >= 1) return;
    ctx.save();
    ctx.globalAlpha = 1 - vacuum;
    const layers = [
      { depth: 0.12, scale: 0.0045, amp: 70, base: 0.52, tint: 'rgba(120,150,180,0.40)' },
      { depth: 0.24, scale: 0.0075, amp: 54, base: 0.62, tint: 'rgba(96,124,152,0.52)' },
      { depth: 0.42, scale: 0.012, amp: 40, base: 0.72, tint: 'rgba(70,92,116,0.66)' }
    ];
    const night = Math.max(0, -light.solarElevation(state.dayPhase));
    for (const layer of layers) {
      ctx.beginPath();
      ctx.moveTo(0, canvas.height);
      const originX = state.camera.x * layer.depth;
      for (let px = 0; px <= canvas.width; px += 4) {
        const wx = (originX + px) * layer.scale;
        const n = noise.fbm1(state.world.seed + 991, wx, 77, 4, 2, 0.5);
        const y = canvas.height * layer.base - n * layer.amp;
        ctx.lineTo(px, y);
      }
      ctx.lineTo(canvas.width, canvas.height);
      ctx.closePath();
      ctx.fillStyle = night > 0.2 ? 'rgba(26,34,54,0.72)' : layer.tint;
      ctx.fill();
    }
    ctx.restore();
  }

  // The wall layer, drawn behind the blocks. This is real per-tile data rather than a painted
  // backdrop, so a tunnel shows the wall its stratum generated and a player-placed wall shows
  // where it was put.
  function drawWalls(state, view) {
    const { x0, y0, cols, rows, offsetX, offsetY, zoom } = view;
    const size = TILE * zoom;
    for (let ty = 0; ty < rows; ty += 1) {
      for (let tx = 0; tx < cols; tx += 1) {
        const wx = x0 + tx;
        const wy = y0 + ty;
        const id = state.world.getWall(wx, wy);
        if (id === 0) continue;
        // A solid block covers its whole cell, so the wall behind it is painted and then
        // painted over. Underground that is almost every cell on the screen.
        if (tiles.isSolid(state.world.get(wx, wy))) continue;
        const spec = tiles.wall(id);
        ctx.fillStyle = spec.colour;
        ctx.fillRect(tx * size - offsetX, ty * size - offsetY, size + 1, size + 1);
      }
    }
    // A soft dark edge where wall meets open sky stops the boundary reading as a hard line.
    for (let tx = 0; tx < cols; tx += 1) {
      const wx = x0 + tx;
      const surface = worldgen.surfaceHeight(state.world.seed, wx);
      const sy = (surface - y0) * size - offsetY;
      if (sy < -size * 2 || sy > canvas.height + size) continue;
      const g = ctx.createLinearGradient(0, sy - size * 2.5, 0, sy + size * 1.5);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.42)');
      ctx.fillStyle = g;
      ctx.fillRect(tx * size - offsetX, sy - size * 2.5, size + 1, size * 4);
    }
  }

  const EDGE_TOP = 'rgba(255,255,255,0.16)';
  const EDGE_BOTTOM = 'rgba(0,0,0,0.28)';
  const EDGE_SIDE = 'rgba(0,0,0,0.16)';
  const GRASS_FRINGE = '#5f9440';

  function drawTiles(state, view) {
    const { x0, y0, cols, rows, offsetX, offsetY, zoom } = view;
    const size = TILE * zoom;
    const wind = (state.weather && state.weather.wind) || 0;
    const lip = Math.max(1, Math.round(zoom * 1.5));
    // One closure for the whole pass rather than one per tile: maskAt is called for
    // every solid tile on the screen and was being handed a freshly allocated function
    // each time.
    const solidAt = (nx, ny) => tiles.isSolid(state.world.get(nx, ny));
    let ink = null;
    ctx.imageSmoothingEnabled = false;
    for (let ty = 0; ty < rows; ty += 1) {
      for (let tx = 0; tx < cols; tx += 1) {
        const wx = x0 + tx;
        const wy = y0 + ty;
        const id = state.world.get(wx, wy);
        const sx = tx * size - offsetX;
        const sy = ty * size - offsetY;
        const spec = tiles.tile(id);

        // A tile that is not solid can still hold water: a shell or a frond on the sea
        // bed is waterlogged, not a hole in the ocean. Draw the water first and the thing
        // standing in it on top.
        if (id === tiles.AIR || (!spec.solid && !spec.liquid)) {
          const wet = state.world.getLevel ? state.world.getLevel(wx, wy) : 0;
          if (wet > 0) {
            const frac = Math.max(0.08, wet / 255);
            const hPix = Math.round(size * frac);
            const srcH = Math.max(1, Math.round(TILE * frac));
            const wid = tiles.idOf('water');
            ctx.drawImage(atlas, texture.variantFor(wx, wy) * TILE, wid * TILE + (TILE - srcH),
              TILE, srcH, sx, sy + size - hPix, size, hPix);
          }
        }
        if (id === tiles.AIR) continue;
        const variant = texture.variantFor(wx, wy);

        // Water is drawn at the height it actually holds, measured from the bottom of the
        // tile. A tile that is a third full looks a third full, which is the only way a
        // shoreline or a draining pool reads as anything other than a staircase.
        if (spec.liquid) {
          const level = state.world.getLevel ? state.world.getLevel(wx, wy) : 255;
          if (level <= 0) continue;
          // A tile with water above it is drawn full, so a deep body has no seams in it.
          const below = state.world.get(wx, wy - 1);
          const brimming = tiles.tile(below).liquid || level >= 250;
          const frac = brimming ? 1 : Math.max(0.08, level / 255);
          const hPix = Math.round(size * frac);
          const srcH = Math.max(1, Math.round(TILE * frac));
          ctx.drawImage(atlas, variant * TILE, id * TILE + (TILE - srcH), TILE, srcH,
            sx, sy + size - hPix, size, hPix);
          continue;
        }

        // Foliage bends in the wind. Drawn as two halves - the root half where it is,
        // the top half pushed sideways - because one drawImage cannot shear, and two
        // halves offset against each other read as a bend at this size.
        if (spec.decor && wind !== 0) {
          const sway = Math.sin(state.time * 2.1 + wx * 0.7) * wind * size * 0.18;
          ctx.drawImage(atlas, variant * TILE, id * TILE + TILE / 2, TILE, TILE / 2,
            sx, sy + size / 2, size, size / 2);
          ctx.drawImage(atlas, variant * TILE, id * TILE, TILE, TILE / 2,
            sx + sway, sy, size, size / 2);
          continue;
        }
        ctx.drawImage(atlas, variant * TILE, id * TILE, TILE, TILE, sx, sy, size, size);
        if (!spec.solid) continue;
        const mask = autotile.maskAt(solidAt, wx, wy);
        if (autotile.isBuried(mask)) continue;
        const e = autotile.edges(mask);
        // Assigning fillStyle makes the canvas parse the colour string, so the four
        // edge shades are set at most once each per tile and in a fixed order rather
        // than being re-stated for every rectangle.
        if (e.top) {
          if (ink !== EDGE_TOP) { ctx.fillStyle = EDGE_TOP; ink = EDGE_TOP; }
          ctx.fillRect(sx, sy, size, lip);
        }
        if (e.bottom) {
          if (ink !== EDGE_BOTTOM) { ctx.fillStyle = EDGE_BOTTOM; ink = EDGE_BOTTOM; }
          ctx.fillRect(sx, sy + size - lip, size, lip);
        }
        if (e.left || e.right) {
          if (ink !== EDGE_SIDE) { ctx.fillStyle = EDGE_SIDE; ink = EDGE_SIDE; }
          if (e.left) ctx.fillRect(sx, sy, lip, size);
          if (e.right) ctx.fillRect(sx + size - lip, sy, lip, size);
        }
        if (e.top && spec.key === 'grass') {
          ctx.fillStyle = GRASS_FRINGE;
          ink = GRASS_FRINGE;
          ctx.fillRect(sx, sy - lip, size, lip);
          const bend = Math.sin(state.time * 2.4 + wx * 0.6) * wind * zoom * 1.6;
          for (let i = 0; i < 3; i += 1) {
            const gx = sx + (i * 5 + (texture.variantFor(wx, wy + i) * 3)) % (size - 2);
            const h = lip * (2 + ((wx + i) % 3));
            ctx.fillRect(gx + bend, sy - h, Math.max(1, Math.round(zoom)), h);
          }
        }
      }
    }
  }

  // --- water -------------------------------------------------------------------------
  // Everything that makes water look like water is drawn here rather than baked into the
  // atlas, because the atlas repeats every tile and a body of water is the one place a
  // repeat cannot hide: the old textured water read as blue brickwork. These are all
  // continuous functions of world position and time, so they cross tile borders without
  // a seam and they move.
  const LIQUID_LOOK = {
    water: { deep: '6,32,58', light: '198,234,255', wave: 1.9, crest: 0.5 },
    lava: { deep: '58,8,2', light: '255,196,120', wave: 0.6, crest: 0.34 }
  };

  // What liquid, if any, stands in this cell: the tile if it is a liquid, or the water
  // logged into a shell or a frond standing on the sea bed.
  function liquidKindAt(state, x, y) {
    const spec = tiles.tile(state.world.get(x, y));
    if (spec.liquid) {
      const level = state.world.getLevel ? state.world.getLevel(x, y) : 255;
      return level > 0 ? (spec.hot ? 'lava' : 'water') : null;
    }
    if (spec.solid) return null;
    const wet = state.world.getLevel ? state.world.getLevel(x, y) : 0;
    return wet > 0 ? 'water' : null;
  }

  function drawLiquidDetail(state, view) {
    const { x0, y0, cols, rows, offsetX, offsetY, zoom } = view;
    const size = TILE * zoom;
    const t = state.time || 0;

    // Where the water each column holds starts and stops. Collected first rather than
    // drawn as it is found, so that neighbouring columns sharing a surface can be filled
    // as one shape: a gradient per column cost thirty-one milliseconds a frame over open
    // ocean, which is precisely where every column has the same surface as its neighbour.
    const runs = [];
    for (let tx = 0; tx < cols; tx += 1) {
      const wx = x0 + tx;
      let ty = 0;
      while (ty < rows) {
        const kind = liquidKindAt(state, wx, y0 + ty);
        if (!kind) { ty += 1; continue; }
        let end = ty;
        while (end < rows && liquidKindAt(state, wx, y0 + end) === kind) end += 1;
        const level = state.world.getLevel ? state.world.getLevel(wx, y0 + ty) : 255;
        const brimming = level >= 250 || liquidKindAt(state, wx, y0 + ty - 1) === kind;
        const frac = brimming ? 1 : Math.max(0.08, level / 255);
        runs.push({
          tx,
          wx,
          kind,
          topY: ty * size - offsetY + size * (1 - frac),
          botY: end * size - offsetY,
          open: !liquidKindAt(state, wx, y0 + ty - 1)
            && !tiles.isSolid(state.world.get(wx, y0 + ty - 1))
        });
        ty = end;
      }
    }
    if (runs.length === 0) return;

    ctx.save();
    // Depth, light at the surface and dark some way down. One gradient per group of
    // columns that agree about where the water is.
    let i = 0;
    while (i < runs.length) {
      const first = runs[i];
      let j = i + 1;
      while (j < runs.length && runs[j].tx === runs[j - 1].tx + 1
        && runs[j].kind === first.kind
        && Math.abs(runs[j].topY - first.topY) < 0.5
        && Math.abs(runs[j].botY - first.botY) < 0.5) j += 1;
      const look = LIQUID_LOOK[first.kind];
      const sx = first.tx * size - offsetX;
      const w = (runs[j - 1].tx - first.tx + 1) * size + 1;
      const g = ctx.createLinearGradient(0, first.topY, 0, first.topY + size * 13);
      g.addColorStop(0, 'rgba(' + look.deep + ',0)');
      g.addColorStop(1, 'rgba(' + look.deep + ',0.42)');
      ctx.fillStyle = g;
      ctx.fillRect(sx, first.topY, w, first.botY - first.topY);
      i = j;
    }

    // The moving parts stay per column, so they keep varying along the body. These are
    // plain fills and cost almost nothing.
    for (const run of runs) {
      const look = LIQUID_LOOK[run.kind];
      const sx = run.tx * size - offsetX;
      const rollY = run.topY + (2 + Math.sin(run.wx * 0.26 + t * look.wave * 0.5) * 1.1) * size;
      if (rollY + size * 0.6 < run.botY) {
        ctx.fillStyle = 'rgba(' + look.light + ',0.07)';
        ctx.fillRect(sx, rollY, size + 1, size * 0.6);
      }
      if (!run.open) continue;
      const wave = Math.sin(run.wx * 0.5 + t * look.wave) * 0.9
        + Math.sin(run.wx * 0.21 - t * look.wave * 0.6) * 0.6;
      const crest = run.topY + wave * zoom;
      const line = Math.max(1, Math.round(zoom));
      ctx.fillStyle = 'rgba(' + look.light + ',' + look.crest + ')';
      ctx.fillRect(sx, crest, size + 1, line);
      ctx.fillStyle = 'rgba(' + look.light + ',0.14)';
      ctx.fillRect(sx, crest + line, size + 1, line * 2);
    }
    ctx.restore();
  }

  // Enemies. The shape, the limbs and the gait all live in sprite.js; what belongs here
  // is where on the screen the creature goes, the hurt flash, and the health bar.
  function drawEnemies(state, view) {
    if (!state.enemies || state.enemies.length === 0) return;
    const { x0, y0, offsetX, offsetY, zoom } = view;
    const size = TILE * zoom;
    for (const enemy of state.enemies) {
      const sx = (enemy.x - x0) * size - offsetX;
      const sy = (enemy.y - y0) * size - offsetY;
      const w = enemy.width * size;
      const h = enemy.height * size;
      ctx.save();
      if (enemy.hurt > 0) ctx.globalAlpha = 0.55 + 0.45 * Math.sin(enemy.hurt * 90);
      // A contact shadow for anything that stands on the ground, so it is not floating.
      if (enemy.onGround) {
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(sx + w / 2, sy + h, w * 0.46, Math.max(1, size * 0.1), 0, 0, Math.PI * 2);
        ctx.fill();
      }
      sprite.drawCreature(ctx, { x: sx, y: sy, w, h }, enemy.spec.body || 'slime', {
        colour: enemy.spec.colour,
        glow: enemy.spec.emit ? '#ffcf7a' : null,
        anim: enemy.anim || 0,
        enraged: !!enemy.enraged,
        windUp: enemy.windUp || 0,
        charge: enemy.charge || 0,
        phase: (enemy.spec.key.length * 1.7) % 6.28,
        facing: enemy.facing,
        vx: enemy.vx,
        vy: enemy.vy,
        onGround: enemy.onGround,
        time: state.time
      });

      // A health bar, but only once it has been hurt: an untouched enemy needs no UI.
      if (enemy.hp < enemy.maxHp) {
        const frac = Math.max(0, enemy.hp / enemy.maxHp);
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(sx, sy - 7, w, 4);
        ctx.fillStyle = '#d2564e';
        ctx.fillRect(sx + 1, sy - 6, (w - 2) * frac, 2);
      }
      ctx.restore();
    }
  }

  // A boss gets a bar across the top of the screen rather than the small one that floats
  // over an ordinary enemy's head. The difference is the point: this is a fight you chose
  // and the only number that matters for the next minute is this one.
  function drawBossBar(state) {
    const boss = (state.enemies || []).find(e => e.boss);
    if (!boss) return;
    const w = Math.min(620, canvas.width * 0.6);
    const h = 16;
    const x = (canvas.width - w) / 2;
    const y = 54;
    const frac = Math.max(0, boss.hp / boss.maxHp);
    ctx.save();
    ctx.fillStyle = 'rgba(12,14,20,0.72)';
    ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x, y, w, h);
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, '#e2645c');
    g.addColorStop(1, '#8e2a2a');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w * frac, h);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(x, y, w * frac, Math.max(1, h * 0.3));
    ctx.fillStyle = '#efe7d6';
    ctx.font = '13px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(boss.spec.name + '  ' + Math.ceil(boss.hp) + ' / ' + boss.maxHp,
      canvas.width / 2, y + h + 16);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  // Villagers, drawn with the player's own body plan rather than a plan of their own:
  // they are people, and a villager that moved differently from the player would read as
  // an enemy that cannot be hit.
  function drawVillagers(state, view) {
    if (!state.villagers || state.villagers.length === 0) return;
    const { x0, y0, offsetX, offsetY, zoom } = view;
    const size = TILE * zoom;
    for (const v of state.villagers) {
      const sx = (v.x - x0) * size - offsetX;
      const sy = (v.y - y0) * size - offsetY;
      const w = v.width * size;
      const h = v.height * size;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(sx + w / 2, sy + h, w * 0.5, w * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      if (v.facing < 0) {
        ctx.translate(sx + w / 2, 0);
        ctx.scale(-1, 1);
        ctx.translate(-(sx + w / 2), 0);
      }
      sprite.drawPerson(ctx, { x: sx, y: sy, w, h }, {
        skin: '#d7b091', shirt: v.spec.colour, hair: v.spec.hair,
        pants: sprite.spriteShade(v.spec.colour, -0.4)
      }, {
        anim: v.anim || 0,
        walking: Math.abs(v.vx) > 0.05 && v.onGround,
        airborne: !v.onGround,
        time: state.time,
        phase: v.home ? v.home.x % 6.28 : 0
      });
      ctx.restore();
    }
  }

  function drawLighting(state, view) {
    const { x0, y0, cols, rows, offsetX, offsetY, zoom } = view;
    const margin = 6;
    const lw = cols + margin * 2;
    const lh = rows + margin * 2;
    field.compute(state.world, x0 - margin, y0 - margin, lw, lh,
      Math.round(255 * light.sunStrength(state.dayPhase)), state.dayPhase);
    if (lightCanvas.width !== lw || lightCanvas.height !== lh) {
      lightCanvas.width = lw;
      lightCanvas.height = lh;
    }
    const image = lightCtx.createImageData(lw, lh);
    const buffer = field.buffer;
    // A floor under the light so unlit rock reads as rock. At zero the multiply blend
    // turns everything pure black and the underground becomes an unreadable void.
    const ambient = 88;
    for (let i = 0; i < lw * lh; i += 1) {
      image.data[i * 4] = Math.min(255, buffer[i * 3] + ambient);
      image.data[i * 4 + 1] = Math.min(255, buffer[i * 3 + 1] + ambient);
      image.data[i * 4 + 2] = Math.min(255, buffer[i * 3 + 2] + ambient);
      image.data[i * 4 + 3] = 255;
    }
    lightCtx.putImageData(image, 0, 0);
    const size = TILE * zoom;
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(lightCanvas,
      -margin * size - offsetX, -margin * size - offsetY, lw * size, lh * size);
    ctx.restore();
  }

  // A light the player carries. Drawn after the lighting pass as an additive glow rather
  // than fed into the tile light field, because the field is computed per tile from the
  // world and the player is not in the world.
  function drawCarriedLight(state, view) {
    const glow = state.gear && state.gear.glow;
    if (!glow) return;
    const { x0, y0, offsetX, offsetY, zoom } = view;
    const size = TILE * zoom;
    const sx = (state.player.x + state.player.width / 2 - x0) * size - offsetX;
    const sy = (state.player.y + state.player.height / 2 - y0) * size - offsetY;
    const radius = glow * size;
    const g = ctx.createRadialGradient(sx, sy, size * 0.3, sx, sy, radius);
    g.addColorStop(0, 'rgba(255, 221, 160, 0.55)');
    g.addColorStop(0.5, 'rgba(255, 200, 120, 0.22)');
    g.addColorStop(1, 'rgba(255, 190, 110, 0)');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.fillRect(sx - radius, sy - radius, radius * 2, radius * 2);
    ctx.restore();
  }

  function drawBloom(state, view) {
    const { x0, y0, cols, rows, offsetX, offsetY, zoom } = view;
    const size = TILE * zoom;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let ty = -1; ty < rows + 1; ty += 1) {
      for (let tx = -1; tx < cols + 1; tx += 1) {
        const id = state.world.get(x0 + tx, y0 + ty);
        const emit = tiles.emitOf(id);
        if (emit <= 0) continue;
        const tint = light.EMIT_TINTS[tiles.tile(id).key] || [255, 255, 255];
        const cx = tx * size - offsetX + size / 2;
        const cy = ty * size - offsetY + size / 2;
        const radius = size * (1.2 + emit * 0.16);
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        const flicker = 0.78 + 0.22 * Math.sin(state.time * 7 + (x0 + tx) * 1.7 + (y0 + ty) * 2.3);
        g.addColorStop(0, 'rgba(' + tint.join(',') + ',' + (0.3 * flicker).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(' + tint.join(',') + ',0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawPlayer(state, view) {
    const { x0, y0, offsetX, offsetY, zoom } = view;
    const size = TILE * zoom;
    const p = state.player;
    const sx = (p.x - x0) * size - offsetX;
    const sy = (p.y - y0) * size - offsetY;
    const w = p.width * size;
    const h = p.height * size;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(sx + w / 2, sy + h, w * 0.5, w * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    if (p.facing < 0) {
      ctx.translate(sx + w / 2, 0);
      ctx.scale(-1, 1);
      ctx.translate(-(sx + w / 2), 0);
    }
    sprite.drawPerson(ctx, { x: sx, y: sy, w, h }, state.colours || {}, {
      anim: state.anim || 0,
      walking: p.onGround && Math.abs(p.vx) > 0.05,
      airborne: !p.onGround && !p.swimming,
      swimming: !!p.swimming,
      swingArm: state.swingArm === null ? undefined : state.swingArm,
      held: state.held,
      time: state.time,
      phase: 0
    });
    ctx.restore();
  }

  // Items lying on the ground, bobbing so they read as pickups rather than placed blocks.
  function drawDrops(state, view) {
    const { x0, y0, offsetX, offsetY, zoom } = view;
    const size = TILE * zoom;
    const half = size * 0.52;
    for (const d of state.drops) {
      const bob = Math.sin(state.time * 3.4 + d.x * 2.1) * size * 0.1;
      const sx = (d.x - x0) * size - offsetX - half / 2;
      const sy = (d.y - y0) * size - offsetY - half / 2 + bob;
      const spec = tiles.BY_KEY[d.key];
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = size * 0.2;
      // A heart is not an item, so it is not in the atlas: it is drawn here, pulsing,
      // because the one thing it has to do is catch the eye of somebody losing a fight.
      if (d.kind === 'pickup') {
        const pulse = 1 + Math.sin(state.time * 6 + d.x) * 0.1;
        const r = half * 0.34 * pulse;
        const cxp = sx + half / 2;
        const cyp = sy + half / 2;
        ctx.shadowColor = 'rgba(224,64,92,0.9)';
        ctx.shadowBlur = size * 0.5;
        ctx.fillStyle = '#e0405c';
        ctx.beginPath();
        ctx.arc(cxp - r * 0.55, cyp - r * 0.35, r * 0.62, 0, Math.PI * 2);
        ctx.arc(cxp + r * 0.55, cyp - r * 0.35, r * 0.62, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cxp - r * 1.1, cyp - r * 0.12);
        ctx.lineTo(cxp, cyp + r * 1.15);
        ctx.lineTo(cxp + r * 1.1, cyp - r * 0.12);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255,220,230,0.75)';
        ctx.beginPath();
        ctx.arc(cxp - r * 0.5, cyp - r * 0.45, r * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        continue;
      }
      if (spec && spec.colour) {
        ctx.drawImage(atlas, 0, spec.id * TILE, TILE, TILE, sx, sy, half, half);
      } else {
        const wallSpec = tiles.WALL_BY_KEY[d.key];
        ctx.fillStyle = wallSpec && wallSpec.colour ? wallSpec.colour : '#8894a8';
        ctx.fillRect(sx, sy, half, half);
      }
      ctx.restore();
    }
  }

  // Arrows and magic bolts in flight. These were never drawn at all: the bow fired
  // invisible arrows and the only way to tell you had hit something was that it died.
  function drawShots(state, view) {
    if (!state.arrows || state.arrows.length === 0) return;
    const { x0, y0, offsetX, offsetY, zoom } = view;
    const size = TILE * zoom;
    ctx.save();
    for (const a of state.arrows) {
      const sx = (a.x - x0) * size - offsetX;
      const sy = (a.y - y0) * size - offsetY;
      const len = Math.hypot(a.vx, a.vy) || 1;
      const ux = a.vx / len;
      const uy = a.vy / len;
      if (a.magic) {
        // A bolt is a glowing head with a tail behind it, drawn as a gradient so it
        // reads as light rather than as a painted lozenge.
        const r = size * 0.3;
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 2.2);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.35, a.colour || '#9b59d0');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(sx, sy, r * 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = a.colour || '#9b59d0';
        ctx.lineWidth = Math.max(1, zoom * 1.4);
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - ux * size * 0.9, sy - uy * size * 0.9);
        ctx.stroke();
        ctx.globalAlpha = 1;
        continue;
      }
      // An arrow is a shaft with a head and a fletching, turned to face its flight.
      const shaft = size * 0.8;
      ctx.strokeStyle = a.colour || '#b9a271';
      ctx.lineWidth = Math.max(1, zoom * 1.1);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx - ux * shaft, sy - uy * shaft);
      ctx.stroke();
      ctx.fillStyle = a.burns ? '#ffb05a' : '#cfd6e0';
      ctx.beginPath();
      ctx.moveTo(sx + ux * size * 0.16, sy + uy * size * 0.16);
      ctx.lineTo(sx - uy * size * 0.1, sy + ux * size * 0.1);
      ctx.lineTo(sx + uy * size * 0.1, sy - ux * size * 0.1);
      ctx.closePath();
      ctx.fill();
      if (a.burns) {
        ctx.fillStyle = 'rgba(255,140,60,0.4)';
        ctx.beginPath();
        ctx.arc(sx, sy, size * 0.22, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // The hook, and the line back to the hand. Drawn as a taut line with links on it
  // rather than a plain stroke, because a plain line reads as a crack in the screen.
  function drawHook(state, view) {
    const hook = state.hook;
    if (!hook) return;
    const { x0, y0, offsetX, offsetY, zoom } = view;
    const size = TILE * zoom;
    const p = state.player;
    const hx = (hook.x - x0) * size - offsetX;
    const hy = (hook.y - y0) * size - offsetY;
    const px = (p.x + p.width / 2 - x0) * size - offsetX;
    const py = (p.y + p.height * 0.4 - y0) * size - offsetY;
    ctx.save();
    const dx = hx - px;
    const dy = hy - py;
    const len = Math.hypot(dx, dy) || 1;
    const links = Math.max(1, Math.round(len / (size * 0.3)));
    ctx.strokeStyle = '#6f6a62';
    ctx.lineWidth = Math.max(1, zoom * 0.8);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(hx, hy);
    ctx.stroke();
    ctx.fillStyle = '#9aa3ad';
    for (let i = 1; i < links; i += 1) {
      const t = i / links;
      ctx.fillRect(px + dx * t - zoom, py + dy * t - zoom, zoom * 2, zoom * 2);
    }
    // The head itself: a wedge pointing the way it is travelling, or into the wall it
    // has bitten.
    const ux = dx / len;
    const uy = dy / len;
    ctx.fillStyle = hook.anchored ? '#d8d2bf' : '#cfd6e0';
    ctx.beginPath();
    ctx.moveTo(hx + ux * size * 0.22, hy + uy * size * 0.22);
    ctx.lineTo(hx - uy * size * 0.16, hy + ux * size * 0.16);
    ctx.lineTo(hx - ux * size * 0.12, hy - uy * size * 0.12);
    ctx.lineTo(hx + uy * size * 0.16, hy - ux * size * 0.16);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // The bobber, and the line out to it. It rides the surface, and the whole signal that
  // something is on the line is that it goes under - so when it bites it is drawn low,
  // with rings spreading out from it.
  function drawBobber(state, view) {
    const b = state.bobber;
    if (!b) return;
    const { x0, y0, offsetX, offsetY, zoom } = view;
    const size = TILE * zoom;
    const p = state.player;
    const px = (p.x + p.width / 2 - x0) * size - offsetX;
    const py = (p.y + p.height * 0.35 - y0) * size - offsetY;
    const biting = b.biting > 0;
    const bob = biting
      ? size * (0.42 + Math.sin(b.bob * 22) * 0.1)
      : Math.sin(b.bob * 2.1) * size * 0.08;
    const bx = (b.x - x0) * size - offsetX;
    const by = (b.y - y0) * size - offsetY + bob;
    ctx.save();
    // The line: a shallow catenary rather than a straight stroke, because a taut
    // straight line reads as a crack in the screen.
    ctx.strokeStyle = 'rgba(230,236,244,0.55)';
    ctx.lineWidth = Math.max(1, zoom * 0.5);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.quadraticCurveTo((px + bx) / 2, Math.max(py, by) + size * 0.5, bx, by);
    ctx.stroke();
    if (biting) {
      // Rings, so the bite is visible from across the screen rather than only if you
      // happen to be looking at the float.
      ctx.strokeStyle = 'rgba(214,240,255,0.5)';
      ctx.lineWidth = Math.max(1, zoom * 0.7);
      for (let i = 0; i < 2; i += 1) {
        const t = ((b.bob * 1.6 + i * 0.5) % 1);
        ctx.globalAlpha = 0.55 * (1 - t);
        ctx.beginPath();
        ctx.ellipse(bx, by, size * (0.3 + t * 1.1), size * (0.12 + t * 0.42), 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    const r = size * 0.17;
    ctx.fillStyle = '#d8524c';
    ctx.beginPath();
    ctx.arc(bx, by, r, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#f2efe6';
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI);
    ctx.fill();
    ctx.restore();
  }

  // Stars falling at night: a bright head with a long tail behind it.
  function drawStars(state, view) {
    if (!state.stars || state.stars.length === 0) return;
    const { x0, y0, offsetX, offsetY, zoom } = view;
    const size = TILE * zoom;
    ctx.save();
    for (const star of state.stars) {
      const sx = (star.x - x0) * size - offsetX;
      const sy = (star.y - y0) * size - offsetY;
      const len = Math.hypot(star.vx, star.vy) || 1;
      const tail = size * 2.6;
      const g = ctx.createLinearGradient(sx, sy, sx - (star.vx / len) * tail,
        sy - (star.vy / len) * tail);
      g.addColorStop(0, 'rgba(255,245,200,0.95)');
      g.addColorStop(1, 'rgba(255,230,150,0)');
      ctx.strokeStyle = g;
      ctx.lineWidth = Math.max(1.5, zoom * 1.8);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx - (star.vx / len) * tail, sy - (star.vy / len) * tail);
      ctx.stroke();
      const head = ctx.createRadialGradient(sx, sy, 0, sx, sy, size * 0.6);
      head.addColorStop(0, '#ffffff');
      head.addColorStop(0.4, '#ffe9a0');
      head.addColorStop(1, 'rgba(255,233,160,0)');
      ctx.fillStyle = head;
      ctx.beginPath();
      ctx.arc(sx, sy, size * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawParticles(state, view) {
    const { x0, y0, offsetX, offsetY, zoom } = view;
    const size = TILE * zoom;
    for (const p of state.particles) {
      const sx = (p.x - x0) * size - offsetX;
      const sy = (p.y - y0) * size - offsetY;
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.maxLife));
      ctx.fillStyle = p.colour;
      const s = p.size * zoom;
      ctx.fillRect(sx, sy, s, s);
    }
    ctx.globalAlpha = 1;
  }

  // Being underwater is told by tinting the whole view, not by making the water glow.
  // Water was briefly given an `emit` so a flooded cavern would be visible in the dark,
  // but every tile of an ocean is then an emitter and the bloom pass turned the whole
  // body into a lamp. A tint says the same thing and costs one rectangle.
  // --- weather -------------------------------------------------------------------------
  // Rain and snow are drawn as a fixed pool of drops recycled forever rather than as
  // spawned particles, so a downpour costs the same as a drizzle and nothing accumulates.
  // Each drop is placed in world coordinates and skipped where the sky is not visible,
  // which is why rain does not fall inside caves.
  const DROPS = [];
  for (let i = 0; i < 520; i += 1) {
    DROPS.push({ x: Math.random(), y: Math.random(), speed: 0.8 + Math.random() * 0.5,
      len: 0.5 + Math.random() * 0.8 });
  }

  function drawWeather(state, view) {
    const w = state.weather;
    if (!w || w.rain <= 0.02) return;
    if (spaceFactor(state) >= 1) return;
    const { x0, y0, offsetX, offsetY, zoom } = view;
    const size = TILE * zoom;
    const snow = w.snow > 0.5;
    // A storm takes the colour out of the sky. Drawn before the drops so the drops stay
    // bright against it.
    ctx.save();
    // Enough to take the colour out of the sky: at a quarter of this a downpour still
    // happened under a bright blue noon, which reads as sun shower rather than as storm.
    ctx.fillStyle = 'rgba(86,96,114,' + (0.44 * Math.min(1, w.rain)).toFixed(3) + ')';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    const count = Math.round(DROPS.length * Math.min(1, w.rain));
    const fall = snow ? 7 : 42;
    const slant = w.wind * (snow ? 5 : 11);
    ctx.save();
    ctx.strokeStyle = 'rgba(190,214,236,' + (0.5 * Math.min(1, w.rain)).toFixed(2) + ')';
    ctx.fillStyle = 'rgba(236,244,252,' + (0.8 * Math.min(1, w.rain)).toFixed(2) + ')';
    ctx.lineWidth = Math.max(1, zoom * 0.7);
    const spanX = (canvas.width / size) + 4;
    const spanY = (canvas.height / size) + 4;
    for (let i = 0; i < count; i += 1) {
      const d = DROPS[i];
      // World position, so the rain belongs to the world rather than to the screen and
      // does not slide when the camera moves.
      const wy = y0 - 2 + ((d.y * spanY + state.time * fall * d.speed) % spanY);
      const wx = x0 - 2 + ((d.x * spanX + wy * slant * 0.02) % spanX + spanX) % spanX;
      // Nothing falls where there is rock overhead.
      if (wy > worldgen.surfaceHeight(state.world.seed, Math.floor(wx))) continue;
      const sx = (wx - x0) * size - offsetX;
      const sy = (wy - y0) * size - offsetY;
      if (snow) {
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(1, zoom * 0.8), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - slant * zoom * 0.5, sy + d.len * size);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawUnderwater(state) {
    const player = state.player;
    if (!player || !player.swimming) return;
    const deep = player.submerged;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = deep ? 'rgba(28, 86, 140, 0.34)' : 'rgba(28, 86, 140, 0.16)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (deep) {
      // A soft inward darkening, so submerged reads as submerged and not as a colour grade.
      const grad = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) * 0.2,
        canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * 0.62);
      grad.addColorStop(0, 'rgba(10, 40, 70, 0)');
      grad.addColorStop(1, 'rgba(6, 26, 48, 0.55)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.restore();
  }

  function drawVignette() {
    const g = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) * 0.34,
      canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * 0.78);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.34)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Per-pass timing, off by default and costing one boolean test when it is off. A
  // renderer with nineteen passes needs a way to answer "which one" that is not guesswork.
  const timings = {};
  let profiling = false;
  let frames = 0;

  function phase(name, run) {
    if (!profiling) { run(); return; }
    const t0 = performance.now();
    run();
    timings[name] = (timings[name] || 0) + (performance.now() - t0);
  }

  function setProfiling(on) {
    profiling = !!on;
    for (const key of Object.keys(timings)) delete timings[key];
    frames = 0;
    return profiling;
  }

  // Mean milliseconds per frame in each pass, worst first.
  function profile() {
    const out = [];
    for (const [name, total] of Object.entries(timings)) {
      out.push({ name, ms: +(total / Math.max(1, frames)).toFixed(3) });
    }
    out.sort((a, b) => b.ms - a.ms);
    return { frames, passes: out };
  }

  function draw(state) {
    const zoom = state.camera.zoom;
    const size = TILE * zoom;
    const cols = Math.ceil(canvas.width / size) + 1;
    const rows = Math.ceil(canvas.height / size) + 1;
    const leftWorld = state.camera.x - canvas.width / (2 * size);
    const topWorld = state.camera.y - canvas.height / (2 * size);
    const x0 = Math.floor(leftWorld);
    const y0 = Math.floor(topWorld);
    const view = { x0, y0, cols, rows, zoom,
      offsetX: (leftWorld - x0) * size, offsetY: (topWorld - y0) * size };

    phase('sky', () => drawSky(state));
    phase('parallax', () => drawParallax(state));
    phase('walls', () => drawWalls(state, view));
    phase('tiles', () => drawTiles(state, view));
    phase('water', () => drawLiquidDetail(state, view));
    phase('drops', () => drawDrops(state, view));
    phase('enemies', () => drawEnemies(state, view));
    phase('villagers', () => drawVillagers(state, view));
    phase('player', () => drawPlayer(state, view));
    phase('lighting', () => drawLighting(state, view));
    phase('carried', () => drawCarriedLight(state, view));
    phase('bloom', () => drawBloom(state, view));
    phase('hook', () => drawHook(state, view));
    phase('bobber', () => drawBobber(state, view));
    phase('shots', () => drawShots(state, view));
    phase('stars', () => drawStars(state, view));
    phase('particles', () => drawParticles(state, view));
    phase('weather', () => drawWeather(state, view));
    phase('underwater', () => drawUnderwater(state));
    phase('vignette', () => drawVignette());
    phase('bossbar', () => drawBossBar(state));
    frames += 1;
    return view;
  }

  return { draw, atlas, field, setProfiling, profile };
}

// The module's public surface, declared once. index.html used to repeat these
// names by hand, and three separate times a new export was added here and
// forgotten there, which broke the game at runtime while every test passed.
const EXPORTS_render = { makeRenderer };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXPORTS_render;
} else if (typeof FATHOM !== 'undefined') {
  FATHOM.render = EXPORTS_render;
}
