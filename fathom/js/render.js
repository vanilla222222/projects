'use strict';
// Layered renderer. The lighting trick is worth knowing: light is computed per tile, written
// into a canvas one pixel per tile, then drawn over the world scaled up with smoothing on and
// a multiply blend. That turns blocky per-tile values into soft coloured gradients for the
// cost of one small canvas, instead of shading each tile individually.

function makeRenderer(canvas, deps) {
  const { tiles, texture, autotile, light, worldgen, noise } = deps;
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

  function drawSky(state) {
    const [top, mid, low] = skyColours(state.dayPhase);
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, top);
    g.addColorStop(0.55, mid);
    g.addColorStop(1, low);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const night = Math.max(0, -light.solarElevation(state.dayPhase));
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
    const r = isSun ? 30 : 22;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 4.5);
    glow.addColorStop(0, isSun ? 'rgba(255,246,214,0.95)' : 'rgba(208,224,255,0.75)');
    glow.addColorStop(0.18, isSun ? 'rgba(255,224,150,0.5)' : 'rgba(170,196,240,0.3)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = isSun ? '#fffbe8' : '#dfe8ff';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawParallax(state) {
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
  }

  // The wall layer, drawn behind the blocks. This is real per-tile data rather than a painted
  // backdrop, so a tunnel shows the wall its stratum generated and a player-placed wall shows
  // where it was put.
  function drawWalls(state, view) {
    const { x0, y0, cols, rows, offsetX, offsetY, zoom } = view;
    const size = TILE * zoom;
    for (let ty = 0; ty < rows; ty += 1) {
      for (let tx = 0; tx < cols; tx += 1) {
        const id = state.world.getWall(x0 + tx, y0 + ty);
        if (id === 0) continue;
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

  function drawTiles(state, view) {
    const { x0, y0, cols, rows, offsetX, offsetY, zoom } = view;
    const size = TILE * zoom;
    ctx.imageSmoothingEnabled = false;
    for (let ty = 0; ty < rows; ty += 1) {
      for (let tx = 0; tx < cols; tx += 1) {
        const wx = x0 + tx;
        const wy = y0 + ty;
        const id = state.world.get(wx, wy);
        if (id === tiles.AIR) continue;
        const sx = tx * size - offsetX;
        const sy = ty * size - offsetY;
        const variant = texture.variantFor(wx, wy);
        const spec = tiles.tile(id);

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

        ctx.drawImage(atlas, variant * TILE, id * TILE, TILE, TILE, sx, sy, size, size);
        if (!spec.solid) continue;
        const mask = autotile.maskAt((nx, ny) => tiles.isSolid(state.world.get(nx, ny)), wx, wy);
        if (autotile.isBuried(mask)) continue;
        const e = autotile.edges(mask);
        const lip = Math.max(1, Math.round(zoom * 1.5));
        if (e.top) {
          ctx.fillStyle = 'rgba(255,255,255,0.16)';
          ctx.fillRect(sx, sy, size, lip);
        }
        if (e.bottom) {
          ctx.fillStyle = 'rgba(0,0,0,0.28)';
          ctx.fillRect(sx, sy + size - lip, size, lip);
        }
        if (e.left) {
          ctx.fillStyle = 'rgba(0,0,0,0.16)';
          ctx.fillRect(sx, sy, lip, size);
        }
        if (e.right) {
          ctx.fillStyle = 'rgba(0,0,0,0.16)';
          ctx.fillRect(sx + size - lip, sy, lip, size);
        }
        if (e.top && spec.key === 'grass') {
          ctx.fillStyle = '#5f9440';
          ctx.fillRect(sx, sy - lip, size, lip);
          for (let i = 0; i < 3; i += 1) {
            const gx = sx + (i * 5 + (texture.variantFor(wx, wy + i) * 3)) % (size - 2);
            const h = lip * (2 + ((wx + i) % 3));
            ctx.fillRect(gx, sy - h, Math.max(1, Math.round(zoom)), h);
          }
        }
      }
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
    const bob = p.onGround ? Math.sin(state.time * 11) * (Math.abs(p.vx) > 0.02 ? zoom : 0) : 0;
    ctx.translate(sx + w / 2, sy + h / 2 + bob);
    if (p.facing < 0) ctx.scale(-1, 1);
    const look = state.colours || {};
    ctx.fillStyle = look.pants || '#2f3b52';
    ctx.fillRect(-w * 0.34, -h * 0.06, w * 0.68, h * 0.46);
    ctx.fillStyle = look.shirt || '#4a6fa5';
    ctx.fillRect(-w * 0.4, -h * 0.42, w * 0.8, h * 0.38);
    ctx.fillStyle = look.skin || '#e8c39a';
    ctx.fillRect(-w * 0.26, -h * 0.5, w * 0.52, w * 0.52);
    ctx.fillStyle = look.hair || '#23304a';
    ctx.fillRect(-w * 0.3, -h * 0.56, w * 0.6, w * 0.2);
    ctx.fillRect(-w * 0.3, -h * 0.56, w * 0.14, w * 0.46);
    ctx.fillStyle = '#1d2437';
    ctx.fillRect(w * 0.02, -h * 0.42, w * 0.1, w * 0.12);
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

    drawSky(state);
    drawParallax(state);
    drawWalls(state, view);
    drawTiles(state, view);
    drawDrops(state, view);
    drawPlayer(state, view);
    drawLighting(state, view);
    drawBloom(state, view);
    drawParticles(state, view);
    drawUnderwater(state);
    drawVignette();
    return view;
  }

  return { draw, atlas, field };
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
