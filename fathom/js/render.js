'use strict';
// Layered renderer. The lighting trick is worth knowing: light is computed per tile, written
// into a canvas one pixel per tile, then drawn over the world scaled up with smoothing on and
// a multiply blend. That turns blocky per-tile values into soft coloured gradients for the
// cost of one small canvas, instead of shading each tile individually.

function makeRenderer(canvas, deps) {
  const { tiles, texture, autotile, light, worldgen, noise, sprite } = deps;
  const screen = canvas.getContext('2d');
  let ctx = screen;
  const actorCanvas = document.createElement('canvas');
  const actors = actorCanvas.getContext('2d');
  const ACTOR_PIXEL = 2;
  const lightCanvas = document.createElement('canvas');
  const lightCtx = lightCanvas.getContext('2d');
  const atlas = texture.bakeAtlas(document, tiles);
  const terrain = deps.webgl ? deps.webgl.makeTerrainGL(document, atlas) : null;
  let backend = 'canvas2d', terrainQuads = 0;
  const TILE = texture.TILE;
  const field = light.makeLightField(tiles);
  const stars = [];
  for (let i = 0; i < 220; i += 1) {
    stars.push({ x: Math.random(), y: Math.random() * 0.62, r: 0.4 + Math.random() * 1.1,
      twinkle: Math.random() * Math.PI * 2 });
  }

  function skyColours(dayPhase) {
    const e = light.solarElevation(dayPhase);
    if (e >= 0.3) return ['#4276ac', '#78b1be', '#e6d69e'];
    if (e >= 0) {
      const t = e / 0.3;
      return [
        mixHex('#49375e', '#4276ac', t),
        mixHex('#e07a4a', '#78b1be', t),
        mixHex('#f3c58a', '#e6d69e', t)
      ];
    }
    if (e >= -0.25) {
      const t = -e / 0.25;
      return [mixHex('#49375e', '#0a1026', t), mixHex('#e07a4a', '#1c2545', t), mixHex('#f3c58a', '#2b3150', t)];
    }
    return ['#060a18', '#0d1430', '#18203c'];
  }

  function mixHex(a, b, t) {
    const pa = parseInt(a.slice(1), 16);
    const pb = parseInt(b.slice(1), 16);
    const r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t);
    const g = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t);
    const bl = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
    return '#' + ((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0');
  }

  const CLOUD_BANDS = [
    { y: 0.14, depth: 5, drift: 4, scale: 6 },
    { y: 0.28, depth: 9, drift: 8, scale: 4 },
    { y: 0.42, depth: 14, drift: 12, scale: 3 }
  ];
  const CLOUD_SHAPE = [
    [[7, 3]],
    [[5, 7]],
    [[2, 11], [15, 3]],
    [[1, 18]],
    [[0, 20]],
    [[2, 16]],
    [[6, 8]]
  ];

  function drawClouds(state) {
    const night = light.solarElevation(state.dayPhase) < -0.16;
    const wind = state.weather?.wind || 0;
    for (const band of CLOUD_BANDS) {
      const span = band.scale * 64;
      const scroll = state.camera.x * band.depth - state.time * (band.drift + wind * 12);
      const first = Math.floor(scroll / span);
      for (let cell = first - 1; cell <= first + canvas.width / span + 1; cell += 1) {
        const n = noise.fbm1(state.world.seed + 4201, cell * 13 + band.depth, 31, 3, 2, 0.5);
        if (n < 0.37) continue;
        const px = Math.round((cell * span + n * span * 0.5 - scroll) / band.scale) * band.scale;
        const py = Math.round((canvas.height * band.y + (n - 0.5) * 80) / band.scale) * band.scale;
        for (const [row, runs] of CLOUD_SHAPE.entries()) {
          ctx.fillStyle = night ? (row < 4 ? '#333a62' : '#282e50')
            : (row < 4 ? '#e7e5ca' : '#a9c4be');
          for (const [left, width] of runs) {
            ctx.fillRect(px + left * band.scale, py + row * band.scale, width * band.scale, band.scale);
          }
        }
      }
    }
  }

  function spaceFactor(state) {
    if (!worldgen || !worldgen.SEA_LEVEL) return 0;
    const alt = state.camera.y - worldgen.SEA_LEVEL;
    return Math.max(0, Math.min(1, (-alt - 300) / 450));
  }

  // Scanlines of a stepped disc double as the sun, moon and their hard-edged halos.
  function pixelDisc(cx, cy, radius, pixel, colour) {
    const r = Math.max(1, Math.round(radius / pixel));
    const x = Math.round(cx / pixel);
    const y = Math.round(cy / pixel);
    ctx.fillStyle = colour;
    for (let row = -r; row <= r; row += 1) {
      const half = Math.floor(Math.sqrt((r + 0.4) ** 2 - row ** 2));
      ctx.fillRect((x - half) * pixel, (y + row) * pixel, (half * 2 + 1) * pixel, pixel);
    }
  }

  function drawSky(state) {
    const [top, mid, low] = skyColours(state.dayPhase);
    const vacuum = spaceFactor(state);
    const bandCount = 12;
    for (let i = 0; i < bandCount; i += 1) {
      const t = i / (bandCount - 1);
      const colour = t < 0.5 ? mixHex(top, mid, t * 2) : mixHex(mid, low, t * 2 - 1);
      const y = Math.floor(canvas.height * i / bandCount);
      const bottom = Math.floor(canvas.height * (i + 1) / bandCount);
      ctx.fillStyle = mixHex(colour, '#090b1c', vacuum);
      ctx.fillRect(0, y, canvas.width, bottom - y);
      if (i === 0 || vacuum > 0.8) continue;
      // Offset pixels bridge adjacent shades along the edge of each sky band.
      ctx.fillStyle = mixHex(i <= 5 ? mixHex(top, mid, Math.max(0, t * 2 - 0.13))
        : mixHex(mid, low, Math.max(0, t * 2 - 1.13)), '#090b1c', vacuum);
      for (let x = (i % 2) * 4; x < canvas.width; x += 8) ctx.fillRect(x, y, 4, 2);
    }

    const night = Math.max(0, -light.solarElevation(state.dayPhase), vacuum);
    if (night > 0.02) {
      ctx.save();
      ctx.fillStyle = '#f5dfb6';
      for (const star of stars) {
        const x = Math.round(star.x * canvas.width / 2) * 2;
        const y = Math.round(star.y * canvas.height / 2) * 2;
        ctx.globalAlpha = Math.min(1, night * 1.6) * (0.72 + 0.28 * Math.sin(state.time * 1.6 + star.twinkle));
        ctx.fillRect(x, y, 2, 2);
        if (star.r > 1.38) {
          ctx.fillRect(x - 2, y, 6, 2);
          ctx.fillRect(x, y - 2, 2, 6);
        }
      }
      ctx.restore();
    }

    const angle = (state.dayPhase + 0.75) * Math.PI * 2;
    const cx = canvas.width * (0.5 + Math.cos(angle) * 0.42);
    const cy = canvas.height * (0.62 + Math.sin(angle) * 0.52);
    const sun = light.solarElevation(state.dayPhase) >= 0;
    const blood = !sun && state.bloodMoon;
    const r = sun ? 30 : blood ? 34 : 22;
    pixelDisc(cx, cy, r + 14, 4, sun ? '#fbd88c42' : blood ? '#ec575847' : '#a9a4da32');
    pixelDisc(cx, cy, r, 2, sun ? '#ffe5a4' : blood ? '#ad394b' : '#a6a2c9');
    pixelDisc(cx - 2, cy - 4, r - 5, 2, sun ? '#fff3c6' : blood ? '#eb6466' : '#e3d9e7');
    if (!sun) {
      pixelDisc(cx - 8, cy - 6, 4, 2, blood ? '#a93b51' : '#b5accd');
      pixelDisc(cx + 8, cy + 2, 6, 2, blood ? '#c44a57' : '#bdb1ce');
    }
    if (blood) {
      ctx.fillStyle = '#761c3034';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    if (vacuum < 1) {
      ctx.save();
      ctx.globalAlpha = 1 - vacuum;
      drawClouds(state);
      ctx.restore();
    }
  }

  function drawParallax(state) {
    const vacuum = spaceFactor(state);
    if (vacuum >= 1) return;
    ctx.save();
    ctx.globalAlpha = 1 - vacuum;
    const layers = [
      { depth: 5, scale: 0.0045, amp: 96, base: 0.59, day: '#72949f', night: '#303859' },
      { depth: 9, scale: 0.0075, amp: 74, base: 0.69, day: '#537981', night: '#242e49' },
      { depth: 15, scale: 0.012, amp: 54, base: 0.78, day: '#355b61', night: '#192637' }
    ];
    const night = Math.min(1, Math.max(0, -light.solarElevation(state.dayPhase) * 2.5));
    for (const layer of layers) {
      const originX = Math.round(state.camera.x * layer.depth / 4) * 4;
      ctx.fillStyle = mixHex(layer.day, layer.night, night);
      for (let x = 0; x < canvas.width; x += 4) {
        const n = noise.fbm1(state.world.seed + 991, (originX + x) * layer.scale, 77, 4, 2, 0.5);
        const y = Math.round((canvas.height * layer.base - n * layer.amp) / 4) * 4;
        ctx.fillRect(x, y, 4, canvas.height - y);
      }
    }
    ctx.restore();
  }

  // The wall layer, drawn behind the blocks. This is real per-tile data rather than a painted
  // backdrop, so a tunnel shows the wall its stratum generated and a player-placed wall shows
  // where it was put.
  let terrainView = null;
  let heights = new Map();
  let heightWorld = null;
  function sampleTerrain(world, view) {
    const { x0, y0, cols, rows } = view, stride = cols + 2;
    const revision = world.renderRevision;
    if (terrainView && revision !== undefined && terrainView.world === world &&
        terrainView.revision === revision && terrainView.x0 === x0 && terrainView.y0 === y0 &&
        terrainView.cols === cols && terrainView.rows === rows) return terrainView;
    const cells = stride * (rows + 2);
    const ids = terrainView?.ids.length === cells ? terrainView.ids : new Uint16Array(cells);
    const walls = terrainView?.walls.length === cells ? terrainView.walls : new Uint16Array(cells);
    const variants = terrainView?.variants.length === cells ? terrainView.variants : new Uint8Array(cells);
    const edges = terrainView?.edges.length === cells ? terrainView.edges : new Uint8Array(cells);
    const levels = terrainView?.levels.length === cells ? terrainView.levels : new Uint8Array(cells);
    for (let y = -1; y <= rows; y += 1) for (let x = -1; x <= cols; x += 1) {
      const index = (y + 1) * stride + x + 1;
      const id = world.get(x0 + x, y0 + y);
      ids[index] = id;
      walls[index] = x >= 0 && x < cols && y >= 0 && y < rows && !tiles.isSolid(id)
        ? world.getWall(x0 + x, y0 + y) : 0;
    }
    for (let y = 0; y < rows; y += 1) for (let x = 0; x < cols; x += 1) {
      const at = (y + 1) * stride + x + 1;
      variants[at] = texture.variantFor(x0 + x, y0 + y);
      if (!tiles.isSolid(ids[at])) continue;
      edges[at] = (!tiles.isSolid(ids[at - stride]) ? autotile.N : 0)
        | (!tiles.isSolid(ids[at + stride]) ? autotile.S : 0)
        | (!tiles.isSolid(ids[at - 1]) ? autotile.W : 0)
        | (!tiles.isSolid(ids[at + 1]) ? autotile.E : 0);
    }
    terrainView = { world, revision, x0, y0, cols, rows, stride, ids, walls, variants, edges, levels };
    return terrainView;
  }
  function sampleLiquid(sample) {
    const { world, cols, rows, stride, x0, y0, ids, levels } = sample;
    const revision = world.liquidRevision;
    if (revision !== undefined && sample.liquidRevision === revision) return;
    let wet = false;
    for (let y = -1; y < rows; y += 1) for (let x = 0; x < cols; x += 1) {
      const at = (y + 1) * stride + x + 1;
      const id = ids[at];
      const level = tiles.isSolid(id) ? 0
        : world.getLevel ? world.getLevel(x0 + x, y0 + y, id) : tiles.tile(id).liquid ? 255 : 0;
      levels[at] = level;
      if (level && y >= 0) wet = true;
    }
    sample.wet = wet;
    sample.liquidRevision = revision;
  }
  function cachedSurface(world, x) {
    if (world !== heightWorld || heights.size > 4096) { heights = new Map(); heightWorld = world; }
    if (!heights.has(x)) heights.set(x, worldgen.surfaceHeight(world.seed, x));
    return heights.get(x);
  }

  function drawWalls(view, sample) {
    const { x0, y0, cols, rows, offsetX, offsetY, zoom } = view;
    const size = TILE * zoom;
    for (let ty = 0; ty < rows; ty += 1) {
      for (let tx = 0; tx < cols; tx += 1) {
        const id = sample.walls[(ty + 1) * sample.stride + tx + 1];
        if (id === 0) continue;
        // A solid block covers its whole cell, so the wall behind it is painted and then
        // painted over. Underground that is almost every cell on the screen.
        const spec = tiles.wall(id);
        ctx.fillStyle = spec.colour;
        ctx.fillRect(tx * size - offsetX, ty * size - offsetY, size + 1, size + 1);
      }
    }
  }

  const EDGE_TOP = 'rgba(255,255,255,0.16)';
  const EDGE_BOTTOM = 'rgba(0,0,0,0.28)';
  const EDGE_SIDE = 'rgba(0,0,0,0.16)';
  const SURFACE_DETAIL = {
    grass: ['#6c9e47', '#a8bd62'],
    junglegrass: ['#438d5a', '#81bd63'],
    peat: ['#777b45', '#a6ac65'],
    snow: ['#9dc2cf', '#dff5f4'],
    sand: ['#b98c54', '#e0b978'],
    redclay: ['#a45e4d', '#d9956e'],
    stone: ['#777784', '#a0a4b2'],
    blightgrass: ['#845ca1', '#b986c9'],
    fleshgrass: ['#a64d61', '#d68186'],
    hallowgrass: ['#8e79b5', '#e2aadf']
  };
  const GRASS_PALETTES = {
    forest: ['#49834d', '#83a855'],
    savanna: ['#a08442', '#d8b965']
  };

  function drawTiles(state, view, sample) {
    const { x0, y0, cols, rows, offsetX, offsetY, zoom } = view;
    const size = TILE * zoom;
    const wind = (state.weather && state.weather.wind) || 0;
    const lip = Math.max(1, Math.round(zoom * 1.5));
    let ink = null;
    ctx.imageSmoothingEnabled = false;
    for (let ty = 0; ty < rows; ty += 1) {
      for (let tx = 0; tx < cols; tx += 1) {
        const wx = x0 + tx;
        const wy = y0 + ty;
        const at = (ty + 1) * sample.stride + tx + 1;
        const id = sample.ids[at];
        const sx = tx * size - offsetX;
        const sy = ty * size - offsetY;
        const spec = tiles.tile(id);

        // A tile that is not solid can still hold water: a shell or a frond on the sea
        // bed is waterlogged, not a hole in the ocean. Draw the water first and the thing
        // standing in it on top.
        if (id === tiles.AIR || (!spec.solid && !spec.liquid)) {
          const wet = sample.levels[at];
          if (wet > 0) {
            const frac = Math.max(0.08, wet / 255);
            const hPix = Math.round(size * frac);
            const srcH = Math.max(1, Math.round(TILE * frac));
            const wid = tiles.idOf('water');
            ctx.drawImage(atlas, texture.atlasX(wid, sample.variants[at]), texture.atlasY(wid) + (TILE - srcH),
              TILE, srcH, sx, sy + size - hPix, size, hPix);
          }
        }
        if (id === tiles.AIR) continue;
        const variant = sample.variants[at];

        // Water is drawn at the height it actually holds, measured from the bottom of the
        // tile. A tile that is a third full looks a third full, which is the only way a
        // shoreline or a draining pool reads as anything other than a staircase.
        if (spec.liquid) {
          const level = sample.levels[at];
          if (level <= 0) continue;
          // A tile with water above it is drawn full, so a deep body has no seams in it.
          const below = sample.ids[at - sample.stride];
          const brimming = tiles.tile(below).liquid || level >= 250;
          const frac = brimming ? 1 : Math.max(0.08, level / 255);
          const hPix = Math.round(size * frac);
          const srcH = Math.max(1, Math.round(TILE * frac));
          ctx.drawImage(atlas, texture.atlasX(id, variant), texture.atlasY(id) + (TILE - srcH), TILE, srcH,
            sx, sy + size - hPix, size, hPix);
          continue;
        }

        // Foliage bends in the wind. Drawn as two halves - the root half where it is,
        // the top half pushed sideways - because one drawImage cannot shear, and two
        // halves offset against each other read as a bend at this size.
        if (spec.decor && wind !== 0) {
          const sway = Math.sin(state.time * 2.1 + wx * 0.7) * wind * size * 0.18;
          ctx.drawImage(atlas, texture.atlasX(id, variant), texture.atlasY(id) + TILE / 2, TILE, TILE / 2,
            sx, sy + size / 2, size, size / 2);
          ctx.drawImage(atlas, texture.atlasX(id, variant), texture.atlasY(id), TILE, TILE / 2,
            sx + sway, sy, size, size / 2);
          continue;
        }
        ctx.drawImage(atlas, texture.atlasX(id, variant), texture.atlasY(id), TILE, TILE, sx, sy, size, size);
        if (!spec.solid) continue;
        const edges = sample.edges[at];
        if (!edges) continue;
        // Assigning fillStyle makes the canvas parse the colour string, so the four
        // edge shades are set at most once each per tile and in a fixed order rather
        // than being re-stated for every rectangle.
        if (edges & autotile.N) {
          if (ink !== EDGE_TOP) { ctx.fillStyle = EDGE_TOP; ink = EDGE_TOP; }
          ctx.fillRect(sx, sy, size, lip);
        }
        if (edges & autotile.S) {
          if (ink !== EDGE_BOTTOM) { ctx.fillStyle = EDGE_BOTTOM; ink = EDGE_BOTTOM; }
          ctx.fillRect(sx, sy + size - lip, size, lip);
        }
        if (edges & (autotile.W | autotile.E)) {
          if (ink !== EDGE_SIDE) { ctx.fillStyle = EDGE_SIDE; ink = EDGE_SIDE; }
          if (edges & autotile.W) ctx.fillRect(sx, sy, lip, size);
          if (edges & autotile.E) ctx.fillRect(sx + size - lip, sy, lip, size);
        }
        const detail = SURFACE_DETAIL[spec.key];
        if ((edges & autotile.N) && detail && sample.ids[at - sample.stride] === tiles.AIR
          && wy === cachedSurface(state.world, wx)) {
          const palette = spec.key === 'grass'
            ? GRASS_PALETTES[worldgen.biomeAt(state.world.seed, wx).key] || detail
            : detail;
          const foliage = spec.key.endsWith('grass') || spec.key === 'peat';
          const width = Math.max(1, Math.round(zoom));
          const start = sx + Math.floor(size * (variant % 4 + 1) / 6);
          ctx.fillStyle = palette[0];
          if (foliage) {
            const height = lip * (variant % 3 + 2);
            const bend = wind ? Math.round(Math.sin(state.time * 2.4 + wx * 0.6) * wind * zoom) : 0;
            ctx.fillRect(start, sy - height + lip, width, height);
            ctx.fillStyle = palette[1];
            ctx.fillRect(start + bend, sy - height, width, lip);
            if (variant % 2 === 0) ctx.fillRect(start + 2 * width, sy - lip, width, lip);
          } else if (variant % 2 === 0) {
            ctx.fillRect(start, sy, width * 3, lip);
            ctx.fillStyle = palette[1];
            ctx.fillRect(start + width, sy - lip, width * 2, lip);
          }
          ink = ctx.fillStyle;
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

  function drawLiquidDetail(state, view, sample) {
    if (!sample.wet) return;
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
      const column = tx + 1;
      const kindAt = (ty) => {
        const at = (ty + 1) * sample.stride + column;
        if (!sample.levels[at]) return null;
        const spec = tiles.tile(sample.ids[at]);
        return spec.liquid && spec.hot ? 'lava' : 'water';
      };
      let ty = 0;
      while (ty < rows) {
        const kind = kindAt(ty);
        if (!kind) { ty += 1; continue; }
        let end = ty + 1;
        while (end < rows && kindAt(end) === kind) end += 1;
        const level = sample.levels[(ty + 1) * sample.stride + column];
        const above = kindAt(ty - 1);
        const brimming = level >= 250 || above === kind;
        const frac = brimming ? 1 : Math.max(0.08, level / 255);
        runs.push({
          tx,
          wx,
          kind,
          topY: ty * size - offsetY + size * (1 - frac),
          botY: end * size - offsetY,
          open: !above && !tiles.isSolid(sample.ids[ty * sample.stride + column])
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
      if (enemy.siegeMarks) {
        ctx.fillStyle = '#d394ed55';
        for (const mark of enemy.siegeMarks) {
          const x = (mark.x - x0) * size - offsetX;
          const y = (mark.y - y0) * size - offsetY;
          ctx.fillRect(x - size * 1.15, y - size * 18, size * 2.3, size * 18);
          ctx.fillRect(x - size * 0.56, y - size * 0.16, size * 1.12, size * 0.19);
        }
      }
      if (enemy.shielded) {
        ctx.strokeStyle = '#bcafffc0';
        ctx.lineWidth = size * 0.14;
        ctx.beginPath();
        ctx.ellipse(sx + w / 2, sy + h / 2, w * 0.61, h * 0.61, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (enemy.beams) {
        ctx.save();
        ctx.lineWidth = size * (enemy.beams.live ? 0.34 : 0.075);
        ctx.strokeStyle = enemy.beams.colour || (enemy.beams.live ? '#f9dafa' : '#b898d0');
        const beamY = enemy.beams.origin === 'feet' ? sy + h - size * 0.35 : sy + h / 2;
        for (const angle of enemy.beams.angles) {
          ctx.beginPath();
          ctx.moveTo(sx + w / 2, beamY);
          ctx.lineTo(sx + w / 2 + Math.cos(angle) * enemy.beams.range * size,
            beamY + Math.sin(angle) * enemy.beams.range * size);
          ctx.stroke();
        }
        ctx.restore();
      }
      sprite.drawCreature(ctx, { x: sx, y: sy, w, h }, enemy.spec.body || 'slime', {
        colour: enemy.spec.colour,
        key: enemy.spec.key,
        glow: enemy.spec.specimen?.rare === 'crystal' ? enemy.spec.colour : enemy.spec.emit ? '#ffcf7a' : null,
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
    ctx.fillStyle = '#bc4d57';
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

  let lightImage, lastLight = null;
  function drawLighting(state, view) {
    const { x0, y0, cols, rows, offsetX, offsetY, zoom } = view;
    const margin = 12;
    const lw = cols + margin * 2;
    const lh = rows + margin * 2;
    const phaseBucket = Math.round(state.dayPhase * 384);
    const revision = state.world.renderRevision;
    const signature = [x0, y0, lw, lh, phaseBucket, revision].join(':');
    if (revision === undefined || !lastLight || lastLight.world !== state.world || lastLight.signature !== signature) {
      field.compute(state.world, x0 - margin, y0 - margin, lw, lh,
        Math.round(255 * light.sunStrength(phaseBucket / 384)), phaseBucket / 384,
        x => cachedSurface(state.world, x));
      if (lightCanvas.width !== lw || lightCanvas.height !== lh) {
        lightCanvas.width = lw;
        lightCanvas.height = lh;
      }
      if (!lightImage || lightImage.width !== lw || lightImage.height !== lh) lightImage = lightCtx.createImageData(lw, lh);
      const image = lightImage;
      const buffer = field.buffer;
      for (let x = 0; x < lw; x += 1) {
        const surface = cachedSurface(state.world, x0 - margin + x);
        for (let y = 0; y < lh; y += 1) {
          const ambient = light.ambientAtDepth(y0 - margin + y - surface);
          const i = y * lw + x;
          image.data[i * 4] = Math.min(255, buffer[i * 3] + ambient);
          image.data[i * 4 + 1] = Math.min(255, buffer[i * 3 + 1] + ambient);
          image.data[i * 4 + 2] = Math.min(255, buffer[i * 3 + 2] + ambient + 2);
          image.data[i * 4 + 3] = 255;
        }
      }
      lightCtx.putImageData(image, 0, 0);
      lastLight = { world: state.world, signature };
    }
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
    const gearGlow = state.gear?.glow || 0;
    const torch = state.held?.shape === 'torch' && gearGlow < 3;
    const glow = torch ? 3 : gearGlow;
    if (!glow) return;
    const { x0, y0, offsetX, offsetY, zoom } = view;
    const size = TILE * zoom;
    const sx = (state.player.x + state.player.width / 2 - x0) * size - offsetX;
    const sy = (state.player.y + state.player.height / 2 - y0) * size - offsetY;
    const radius = glow * size;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    pixelGlow(sx, sy, radius, [255, 206, 137], torch ? 0.18 : 0.38);
    ctx.restore();
  }

  function pixelGlow(x, y, radius, tint, strength) {
    const pixel = Math.max(3, Math.round(radius / 12));
    const rgb = 'rgba(' + tint.join(',') + ',';
    pixelDisc(x, y, radius, pixel, rgb + strength * 0.13 + ')');
    pixelDisc(x, y, radius * 0.66, pixel, rgb + strength * 0.25 + ')');
    pixelDisc(x, y, radius * 0.33, pixel, rgb + strength * 0.42 + ')');
  }

  function drawBloom(state, view, sample) {
    const { x0, y0, cols, rows, offsetX, offsetY, zoom } = view;
    const size = TILE * zoom;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let ty = -1; ty < rows + 1; ty += 1) {
      for (let tx = -1; tx < cols + 1; tx += 1) {
        const id = sample.ids[(ty + 1) * sample.stride + tx + 1];
        const emit = tiles.emitOf(id);
        if (emit <= 0) continue;
        const key = tiles.tile(id).key;
        const flame = key === 'torch' || key === 'lantern' || key === 'campfire';
        const tint = light.EMIT_TINTS[key] || [255, 255, 255];
        const cx = tx * size - offsetX + size / 2;
        const cy = ty * size - offsetY + size / 2;
        const radius = size * (flame ? 1.2 + emit * 0.16 : 0.8 + emit * 0.09);
        const flicker = 0.78 + 0.22 * Math.sin(state.time * 7 + (x0 + tx) * 1.7 + (y0 + ty) * 2.3);
        pixelGlow(cx, cy, radius, tint, (flame ? 0.22 : 0.10) * flicker);
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
    if (p.cart) {
      const left = sx - w * 0.44;
      const base = sy + h - size * 0.17;
      ctx.fillStyle = '#302b39';
      ctx.fillRect(left, base - size * 0.4, w * 1.88, size * 0.42);
      ctx.fillStyle = p.cart.cargo ? '#bd9369' : '#8793aa';
      ctx.fillRect(left - size * 0.03, base - size * 0.36, w * 1.96, size * 0.1);
      ctx.fillStyle = '#626980';
      ctx.fillRect(left + size * 0.06, base - size * 0.23, w * 1.7, size * 0.12);
      ctx.fillStyle = '#272333';
      for (const offset of [0.26, 0.75]) {
        ctx.beginPath();
        ctx.arc(left + w * 1.88 * offset, base, size * 0.115, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (p.facing < 0) {
      ctx.translate(sx + w / 2, 0);
      ctx.scale(-1, 1);
      ctx.translate(-(sx + w / 2), 0);
    }
    sprite.drawPerson(ctx, { x: sx, y: sy, w, h }, state.colours || {}, {
      anim: state.anim || 0,
      walking: !p.cart && p.onGround && Math.abs(p.vx) > 0.05,
      airborne: !p.onGround && !p.swimming,
      swimming: !!p.swimming,
      swingArm: state.swingArm === null ? undefined : state.swingArm,
      held: state.held,
      gear: state.wornAppearance,
      wingsSpread: p.wingsSpread,
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
      if (sx + half < 0 || sy + half < 0 || sx > canvas.width || sy > canvas.height) continue;
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
      if (state.itemArt) {
        ctx.drawImage(state.itemArt(d), sx, sy, half, half);
      } else if (spec && spec.colour) {
        ctx.drawImage(atlas, texture.atlasX(spec.id, 0), texture.atlasY(spec.id), TILE, TILE, sx, sy, half, half);
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
      if (a.delay > 0) continue;
      if (a.beat && !a.beat.used) {
        const pixel = Math.max(2, Math.round(zoom));
        ctx.fillStyle = a.beat.colour;
        ctx.fillRect(Math.round(sx / pixel) * pixel - pixel, Math.round(sy / pixel) * pixel - 2 * pixel, 3 * pixel, pixel);
      }
      if (a.armed || a.shockwave) {
        const pixel = Math.max(2, Math.round(zoom));
        const x = Math.round(sx / pixel) * pixel, y = Math.round(sy / pixel) * pixel;
        ctx.fillStyle = a.colour || '#eab184';
        if (a.armed) {
          const bright = Math.floor(a.life * (a.armed === 'rune' ? 12 : 28)) % 2 === 0;
          if (bright) ctx.fillStyle = '#fff0b2';
          ctx.fillRect(x - 3 * pixel, y + pixel, 7 * pixel, pixel);
          ctx.fillRect(x - pixel, y - pixel, 3 * pixel, pixel);
          ctx.fillRect(x, y - 3 * pixel, pixel, 5 * pixel);
        } else {
          const direction = Math.sign(a.vx) || 1;
          for (let n = 0; n < 4; n += 1) {
            ctx.fillRect(x - n * pixel * direction, y - n * pixel, pixel, (2 * n + 1) * pixel);
          }
        }
        continue;
      }
      const len = Math.hypot(a.vx, a.vy) || 1;
      const ux = a.vx / len;
      const uy = a.vy / len;
      if (a.throwStyle && a.throwStyle !== 'pierce') {
        ctx.save();
        ctx.translate(Math.round(sx), Math.round(sy));
        ctx.rotate(a.throwStyle === 'fan' ? Math.atan2(uy, ux) : state.time * 15);
        ctx.fillStyle = '#30243c';
        ctx.fillRect(-4 * zoom, -2 * zoom, 8 * zoom, 4 * zoom);
        ctx.fillStyle = a.colour;
        if (a.throwStyle === 'returning') {
          ctx.fillRect(-4 * zoom, -zoom, 8 * zoom, 2 * zoom);
          ctx.fillRect(-zoom, -4 * zoom, 2 * zoom, 7 * zoom);
        } else if (a.throwStyle === 'blast') {
          ctx.fillRect(-2 * zoom, -3 * zoom, 4 * zoom, 6 * zoom);
          ctx.fillStyle = '#f8d5a1';
          ctx.fillRect(-zoom, -4 * zoom, 2 * zoom, zoom);
        } else ctx.fillRect(-3 * zoom, -zoom, 7 * zoom, 2 * zoom);
        ctx.restore();
        continue;
      }
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
    const hot = b.liquid === 'lava';
    const bob = biting
      ? size * (0.42 + Math.sin(b.bob * 22) * 0.1)
      : Math.sin(b.bob * 2.1) * size * 0.08;
    const bx = (b.x - x0) * size - offsetX;
    const by = (b.y - y0) * size - offsetY + bob;
    ctx.save();
    // The line: a shallow catenary rather than a straight stroke, because a taut
    // straight line reads as a crack in the screen.
    ctx.strokeStyle = hot ? 'rgba(255,200,150,0.6)' : 'rgba(230,236,244,0.55)';
    ctx.lineWidth = Math.max(1, zoom * 0.5);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.quadraticCurveTo((px + bx) / 2, Math.max(py, by) + size * 0.5, bx, by);
    ctx.stroke();
    if (biting) {
      // Rings, so the bite is visible from across the screen rather than only if you
      // happen to be looking at the float.
      ctx.strokeStyle = hot ? 'rgba(255,176,90,0.55)' : 'rgba(214,240,255,0.5)';
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
    ctx.restore();
  }

  // Rasterize moving sprites on their own grid, leaving the atlas, HUD text and
  // mouse-to-world coordinates at the normal display resolution.
  function drawEnemyBanners(state, view) {
    if (!state.enemyBanners?.size) return;
    const { x0, y0, cols, rows, zoom, offsetX, offsetY } = view;
    const size = TILE * zoom;
    const id = tiles.idOf('enemy-banner');
    for (const banner of state.enemyBanners.values()) {
      const tx = banner.x - x0, ty = banner.y - y0;
      if (tx < 0 || ty < 0 || tx >= cols || ty >= rows || state.world.get(banner.x, banner.y) !== id) continue;
      const x = Math.round(tx * size - offsetX), y = Math.round(ty * size - offsetY);
      ctx.fillStyle = '#211c2a';
      ctx.fillRect(x + 2 * zoom, y + 2 * zoom, 12 * zoom, 2 * zoom);
      ctx.fillRect(x + 4 * zoom, y + 3 * zoom, 8 * zoom, 12 * zoom);
      ctx.fillStyle = banner.colour;
      ctx.fillRect(x + 5 * zoom, y + 4 * zoom, 6 * zoom, 8 * zoom);
      ctx.fillRect(x + 6 * zoom, y + 12 * zoom, 4 * zoom, 2 * zoom);
      ctx.fillStyle = '#f4d8ac';
      ctx.fillRect(x + 7 * zoom, y + 6 * zoom, 2 * zoom, 4 * zoom);
    }
  }

  function drawActors(state, view) {
    const w = Math.ceil(canvas.width / ACTOR_PIXEL);
    const h = Math.ceil(canvas.height / ACTOR_PIXEL);
    if (actorCanvas.width !== w || actorCanvas.height !== h) {
      actorCanvas.width = w;
      actorCanvas.height = h;
    }
    actors.clearRect(0, 0, w, h);
    actors.save();
    actors.scale(1 / ACTOR_PIXEL, 1 / ACTOR_PIXEL);
    ctx = actors;
    try {
      phase('enemies', () => drawEnemies(state, view));
      phase('villagers', () => drawVillagers(state, view));
      phase('player', () => drawPlayer(state, view));
      if (state.spirit) {
        const { x, y, colour } = state.spirit;
        const size = TILE * view.zoom;
        const sx = Math.round((x - view.x0) * size - view.offsetX);
        const sy = Math.round((y - view.y0) * size - view.offsetY);
        const pixel = Math.max(2, Math.round(view.zoom));
        ctx.fillStyle = '#282139';
        ctx.fillRect(sx - 3 * pixel, sy - 2 * pixel, 6 * pixel, 4 * pixel);
        ctx.fillRect(sx - 2 * pixel, sy - 3 * pixel, 4 * pixel, 6 * pixel);
        ctx.fillStyle = colour;
        ctx.fillRect(sx - 2 * pixel, sy - 2 * pixel, 4 * pixel, 4 * pixel);
        ctx.fillStyle = '#fff1cf';
        ctx.fillRect(sx - pixel, sy - pixel, pixel, pixel);
        const mark = state.spirit.mark;
        if (mark) {
          const mx = Math.round((mark.x + mark.width / 2 - view.x0) * size - view.offsetX);
          const my = Math.round((mark.y - view.y0) * size - view.offsetY) - 4 * pixel;
          ctx.fillStyle = colour;
          ctx.fillRect(mx - 2 * pixel, my, 5 * pixel, pixel);
          ctx.fillRect(mx - pixel, my + pixel, 3 * pixel, pixel);
          ctx.fillRect(mx, my + 2 * pixel, pixel, pixel);
        }
      }
    } finally {
      actors.restore();
      ctx = screen;
    }
    screen.drawImage(actorCanvas, 0, 0, w * ACTOR_PIXEL, h * ACTOR_PIXEL);
  }

  // Per-pass timing, off by default and costing one boolean test when it is off. A
  // renderer with nineteen passes needs a way to answer "which one" that is not guesswork.
  const timings = {};
  let profiling = false;
  let frames = 0;

  function phase(name, run) {
    if (!profiling) return run();
    const t0 = performance.now();
    const result = run();
    timings[name] = (timings[name] || 0) + (performance.now() - t0);
    return result;
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
    screen.imageSmoothingEnabled = false;
    const zoom = state.camera.zoom;
    const size = TILE * zoom;
    const cols = Math.ceil(canvas.width / size) + 1;
    const rows = Math.ceil(canvas.height / size) + 1;
    const leftWorld = state.camera.x - canvas.width / (2 * size);
    const topWorld = state.camera.y - canvas.height / (2 * size);
    const x0 = Math.floor(leftWorld);
    const y0 = Math.floor(topWorld);
    const view = { x0, y0, cols, rows, zoom,
      offsetX: Math.round((leftWorld - x0) * size), offsetY: Math.round((topWorld - y0) * size) };

    phase('sky', () => drawSky(state));
    phase('parallax', () => drawParallax(state));
    const sample = phase('terrain sampling', () => {
      const sample = sampleTerrain(state.world, view);
      sampleLiquid(sample);
      return sample;
    });
    const accelerated = terrain && terrain.begin(canvas.width, canvas.height);
    backend = accelerated ? 'webgl2-terrain' : 'canvas2d';
    terrainQuads = 0;
    if (accelerated) ctx = terrain.painter;
    try {
      phase('walls', () => drawWalls(view, sample));
      phase('tiles', () => drawTiles(state, view, sample));
    } finally { ctx = screen; }
    if (accelerated) phase('terrain GPU', () => {
      terrainQuads = terrain.end();
      screen.drawImage(terrain.canvas, 0, 0);
    });
    phase('banners', () => drawEnemyBanners(state, view));
    phase('water', () => drawLiquidDetail(state, view, sample));
    phase('drops', () => drawDrops(state, view));
    drawActors(state, view);
    phase('lighting', () => drawLighting(state, view));
    phase('carried', () => drawCarriedLight(state, view));
    phase('bloom', () => drawBloom(state, view, sample));
    phase('hook', () => drawHook(state, view));
    phase('bobber', () => drawBobber(state, view));
    phase('shots', () => drawShots(state, view));
    phase('stars', () => drawStars(state, view));
    phase('particles', () => drawParticles(state, view));
    phase('weather', () => drawWeather(state, view));
    phase('underwater', () => drawUnderwater(state));
    phase('bossbar', () => drawBossBar(state));
    frames += 1;
    return view;
  }

  return { draw, atlas, field, setProfiling, profile, get backend() { return backend; }, get terrainQuads() { return terrainQuads; } };
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
