'use strict';
// The map. An endless world with fourteen biomes and seven vertical layers and no way to
// find your way back to anything is a world you stop exploring, because every trip out is
// a trip you might not be able to undo.
//
// Two sizes of the same thing: a corner panel that is always there, and a full-screen
// chart on a key. Both draw the same way - one pixel per tile, coloured from the tile
// registry, dark where the player has not been.
//
// It is drawn into its own small canvas at one pixel per tile and then scaled up, which
// is the same trick the lighting uses: the cost is the number of tiles sampled, not the
// number of screen pixels painted.

const SMALL_W = 168;
const SMALL_H = 112;
const LARGE_SCALE = 0.72;        // of the smaller screen dimension
const REDRAW_EVERY = 0.09;       // seconds; the map does not need 60fps

// What the player reveals as they go. Generous enough that walking a corridor opens the
// rock either side of it, so a tunnel reads as a tunnel on the map.
const REVEAL_RADIUS = 26;

// Reveal the ground around a point. A free function rather than a method, because it is
// pure logic with no canvas in it and the alternative is a test that needs a DOM to
// check the shape of a disc.
function revealAround(world, px, py, radius) {
  const r = radius === undefined ? REVEAL_RADIUS : radius;
  const cx = Math.floor(px);
  const cy = Math.floor(py);
  for (let dy = -r; dy <= r; dy += 1) {
    const span = Math.round(Math.sqrt(Math.max(0, r * r - dy * dy)));
    for (let dx = -span; dx <= span; dx += 1) world.markExplored(cx + dx, cy + dy);
  }
}

function makeMinimap(canvas, deps) {
  const { tiles, worldgen } = deps;
  const ctx = canvas.getContext('2d');
  const buffer = document.createElement('canvas');
  const bctx = buffer.getContext('2d', { willReadFrequently: true });
  let since = REDRAW_EVERY;
  let large = false;
  let zoom = 1;

  // Colours are cached per tile id: the registry's own colour, darkened for walls so a
  // dug tunnel reads differently from solid rock.
  const tileColour = [];
  const wallColour = [];

  function rgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function buildPalette() {
    for (const spec of tiles.TILES) {
      tileColour[spec.id] = spec.colour ? rgb(spec.colour) : null;
    }
    for (const wall of tiles.WALLS) {
      if (!wall.colour) { wallColour[wall.id] = null; continue; }
      const [r, g, b] = rgb(wall.colour);
      wallColour[wall.id] = [Math.round(r * 0.55), Math.round(g * 0.55), Math.round(b * 0.55)];
    }
  }

  function size() {
    if (!large) return { w: SMALL_W, h: SMALL_H };
    const side = Math.min(window.innerWidth / 1.5, window.innerHeight) * LARGE_SCALE;
    return { w: Math.round(side * 1.5), h: Math.round(side) };
  }

  // Called from the simulation rather than the draw, so the map fills in whether or not
  // it is being looked at.
  function reveal(world, px, py) {
    revealAround(world, px, py, REVEAL_RADIUS);
  }

  function draw(state, dt) {
    since += dt;
    if (since < REDRAW_EVERY) return;
    since = 0;
    if (tileColour.length === 0) buildPalette();

    const { w, h } = size();
    const tilesAcross = Math.round(w / zoom);
    const tilesDown = Math.round(h / zoom);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    if (buffer.width !== tilesAcross || buffer.height !== tilesDown) {
      buffer.width = tilesAcross;
      buffer.height = tilesDown;
    }

    const world = state.world;
    const x0 = Math.floor(state.player.x) - (tilesAcross >> 1);
    const y0 = Math.floor(state.player.y) - (tilesDown >> 1);
    const image = bctx.createImageData(tilesAcross, tilesDown);
    const data = image.data;

    for (let j = 0; j < tilesDown; j += 1) {
      for (let i = 0; i < tilesAcross; i += 1) {
        const wx = x0 + i;
        const wy = y0 + j;
        const at = (j * tilesAcross + i) * 4;
        data[at + 3] = 255;
        if (!world.isExplored(wx, wy)) {
          // Unexplored: near-black, with a faint grid so the chart does not read as a
          // hole in the interface.
          const grid = ((wx & 31) === 0 || (wy & 31) === 0) ? 26 : 16;
          data[at] = grid;
          data[at + 1] = grid + 2;
          data[at + 2] = grid + 6;
          continue;
        }
        const id = world.get(wx, wy);
        let colour = tileColour[id];
        if (!colour) {
          // Open space: show the background wall if there is one, sky if there is not.
          const level = world.getLevel ? world.getLevel(wx, wy) : 0;
          if (level > 0) colour = [38, 96, 150];
          else colour = wallColour[world.getWall(wx, wy)] || null;
          if (!colour) {
            const sky = wy < worldgen.SEA_LEVEL - 250 ? 10 : 46;
            data[at] = sky;
            data[at + 1] = sky + 8;
            data[at + 2] = sky + 20;
            continue;
          }
        }
        data[at] = colour[0];
        data[at + 1] = colour[1];
        data[at + 2] = colour[2];
      }
    }
    bctx.putImageData(image, 0, 0);

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(buffer, 0, 0, tilesAcross, tilesDown, 0, 0, w, h);

    // Markers, drawn at screen scale so they stay legible however far out the map is.
    const mark = (wx, wy, colour, r) => {
      const sx = (wx - x0) * zoom;
      const sy = (wy - y0) * zoom;
      if (sx < -r || sy < -r || sx > w + r || sy > h + r) return;
      ctx.fillStyle = colour;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();
    };
    if (state.spawn) mark(state.spawn.x, state.spawn.y, '#8fd4ff', large ? 5 : 3);
    mark(state.player.x, state.player.y, '#ffd35c', large ? 5 : 3.5);

    // Sea level, which is the one altitude worth seeing on a chart of a world this tall.
    const seaY = (worldgen.SEA_LEVEL - y0) * zoom;
    if (seaY > 0 && seaY < h) {
      ctx.strokeStyle = 'rgba(140, 200, 255, 0.28)';
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(0, seaY);
      ctx.lineTo(w, seaY);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function setLarge(value) {
    large = value;
    zoom = large ? 2 : 1;
    since = REDRAW_EVERY;
    canvas.classList.toggle('large', large);
  }

  function zoomBy(step) {
    zoom = Math.max(1, Math.min(6, zoom + step));
    since = REDRAW_EVERY;
  }

  return { reveal, draw, setLarge, zoomBy,
    get isLarge() { return large; },
    get zoom() { return zoom; },
    REVEAL_RADIUS };
}

const EXPORTS_minimap = { makeMinimap, revealAround, SMALL_W, SMALL_H, REVEAL_RADIUS, REDRAW_EVERY };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXPORTS_minimap;
} else if (typeof FATHOM !== 'undefined') {
  FATHOM.minimap = EXPORTS_minimap;
}
