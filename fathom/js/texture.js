'use strict';
// Every tile texture is baked procedurally at load into one atlas canvas, so the game ships
// no image assets. Each tile gets four variants chosen by position hash, which stops large
// expanses of stone from tiling visibly. Bevels are not baked in: the renderer applies them
// per tile from its neighbour mask, because a tile's lit edges depend on what is beside it.

const TILE = 16;
const VARIANTS = 4;

function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  if (amount >= 0) {
    r += (255 - r) * amount;
    g += (255 - g) * amount;
    b += (255 - b) * amount;
  } else {
    r *= 1 + amount;
    g *= 1 + amount;
    b *= 1 + amount;
  }
  return 'rgb(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ')';
}

function hashPixel(id, variant, x, y) {
  let h = (id * 7349 + variant * 9173 + x * 3119 + y * 6151) | 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

function paintGrain(ctx, spec, variant, ox, oy) {
  const grain = spec.grain || 0;
  if (grain <= 0) return;
  for (let y = 0; y < TILE; y += 1) {
    for (let x = 0; x < TILE; x += 1) {
      const n = hashPixel(spec.id, variant, x, y);
      if (n > 0.62) {
        ctx.fillStyle = shade(spec.colour, (n - 0.62) * grain * 2.6);
        ctx.fillRect(ox + x, oy + y, 1, 1);
      } else if (n < 0.3) {
        ctx.fillStyle = shade(spec.colour, -(0.3 - n) * grain * 2.6);
        ctx.fillRect(ox + x, oy + y, 1, 1);
      }
    }
  }
}

function paintOre(ctx, spec, variant, ox, oy) {
  ctx.fillStyle = '#5f5f69';
  ctx.fillRect(ox, oy, TILE, TILE);
  paintGrain(ctx, { id: spec.id, colour: '#5f5f69', grain: 0.12 }, variant, ox, oy);
  const blobs = 3 + Math.floor(hashPixel(spec.id, variant, 91, 7) * 3);
  for (let i = 0; i < blobs; i += 1) {
    const cx = 2 + hashPixel(spec.id, variant, i, 11) * (TILE - 4);
    const cy = 2 + hashPixel(spec.id, variant, i, 23) * (TILE - 4);
    const r = 1.6 + hashPixel(spec.id, variant, i, 37) * 2.1;
    const g = ctx.createRadialGradient(ox + cx, oy + cy, 0, ox + cx, oy + cy, r);
    g.addColorStop(0, shade(spec.colour, 0.35));
    g.addColorStop(0.6, spec.colour);
    g.addColorStop(1, shade(spec.colour, -0.35));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(ox + cx, oy + cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintWood(ctx, spec, variant, ox, oy) {
  ctx.fillStyle = spec.colour;
  ctx.fillRect(ox, oy, TILE, TILE);
  for (let x = 0; x < TILE; x += 1) {
    const wob = Math.sin((x + variant * 3) * 0.9) * 0.5;
    const tone = hashPixel(spec.id, variant, x, 3) > 0.5 ? 0.14 : -0.16;
    ctx.fillStyle = shade(spec.colour, tone + wob * 0.05);
    ctx.fillRect(ox + x, oy, 1, TILE);
  }
  ctx.fillStyle = shade(spec.colour, -0.3);
  ctx.fillRect(ox, oy + 7 + (variant % 2), TILE, 1);
}

function paintLeaves(ctx, spec, variant, ox, oy) {
  ctx.clearRect(ox, oy, TILE, TILE);
  const clumps = 7;
  for (let i = 0; i < clumps; i += 1) {
    const cx = hashPixel(spec.id, variant, i, 5) * TILE;
    const cy = hashPixel(spec.id, variant, i, 15) * TILE;
    const r = 2.6 + hashPixel(spec.id, variant, i, 25) * 3.4;
    ctx.fillStyle = shade(spec.colour, (hashPixel(spec.id, variant, i, 35) - 0.5) * 0.5);
    ctx.beginPath();
    ctx.arc(ox + cx, oy + cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintCrystal(ctx, spec, variant, ox, oy) {
  ctx.fillStyle = shade(spec.colour, -0.45);
  ctx.fillRect(ox, oy, TILE, TILE);
  const facets = 3;
  for (let i = 0; i < facets; i += 1) {
    const cx = 3 + hashPixel(spec.id, variant, i, 61) * (TILE - 6);
    const cy = 3 + hashPixel(spec.id, variant, i, 71) * (TILE - 6);
    const h = 4 + hashPixel(spec.id, variant, i, 81) * 6;
    ctx.beginPath();
    ctx.moveTo(ox + cx, oy + cy - h / 2);
    ctx.lineTo(ox + cx + 2.4, oy + cy + h / 2);
    ctx.lineTo(ox + cx - 2.4, oy + cy + h / 2);
    ctx.closePath();
    ctx.fillStyle = shade(spec.colour, 0.2 + i * 0.12);
    ctx.fill();
  }
}

function paintSmall(ctx, spec, variant, ox, oy) {
  ctx.clearRect(ox, oy, TILE, TILE);
  if (spec.key === 'torch') {
    ctx.fillStyle = '#5a3b22';
    ctx.fillRect(ox + 7, oy + 6, 2, 9);
    const g = ctx.createRadialGradient(ox + 8, oy + 5, 0, ox + 8, oy + 5, 5);
    g.addColorStop(0, '#fff3c4');
    g.addColorStop(0.5, '#ffb347');
    g.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(ox + 8, oy + 5, 5, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (spec.key === 'lantern') {
    ctx.fillStyle = '#4a3a24';
    ctx.fillRect(ox + 5, oy + 3, 6, 2);
    ctx.fillStyle = '#2f2718';
    ctx.fillRect(ox + 4, oy + 5, 8, 8);
    const g = ctx.createRadialGradient(ox + 8, oy + 9, 0, ox + 8, oy + 9, 4);
    g.addColorStop(0, '#fff6d8');
    g.addColorStop(1, '#ffd98a');
    ctx.fillStyle = g;
    ctx.fillRect(ox + 5, oy + 6, 6, 6);
    return;
  }
  if (spec.key === 'vine') {
    for (let i = 0; i < 4; i += 1) {
      const x = 2 + i * 4 + (hashPixel(spec.id, variant, i, 9) - 0.5) * 2;
      const h = 6 + hashPixel(spec.id, variant, i, 19) * 9;
      ctx.fillStyle = shade(spec.colour, (hashPixel(spec.id, variant, i, 29) - 0.5) * 0.4);
      ctx.fillRect(ox + x, oy, 1.4, h);
    }
    return;
  }
  const cx = TILE / 2;
  const cy = TILE - 5;
  ctx.fillStyle = shade(spec.colour, -0.3);
  ctx.fillRect(ox + cx - 1, oy + cy, 2, 5);
  const g = ctx.createRadialGradient(ox + cx, oy + cy, 0, ox + cx, oy + cy, 5);
  g.addColorStop(0, shade(spec.colour, 0.45));
  g.addColorStop(1, spec.colour);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(ox + cx, oy + cy, 5, 3.4, 0, 0, Math.PI * 2);
  ctx.fill();
}

function paintGlass(ctx, spec, variant, ox, oy) {
  ctx.fillStyle = 'rgba(200,228,239,0.28)';
  ctx.fillRect(ox, oy, TILE, TILE);
  ctx.strokeStyle = 'rgba(235,250,255,0.55)';
  ctx.lineWidth = 1;
  ctx.strokeRect(ox + 0.5, oy + 0.5, TILE - 1, TILE - 1);
  ctx.beginPath();
  ctx.moveTo(ox + 2, oy + TILE - 3);
  ctx.lineTo(ox + TILE - 4, oy + 2);
  ctx.stroke();
}

function paintBrick(ctx, spec, variant, ox, oy) {
  ctx.fillStyle = shade(spec.colour, -0.18);
  ctx.fillRect(ox, oy, TILE, TILE);
  const rows = 4;
  const h = TILE / rows;
  for (let r = 0; r < rows; r += 1) {
    const stagger = r % 2 === 0 ? 0 : TILE / 4;
    for (let c = -1; c < 2; c += 1) {
      const x = ox + stagger + c * (TILE / 2);
      ctx.fillStyle = shade(spec.colour, (hashPixel(spec.id, variant, r, c) - 0.5) * 0.2);
      ctx.fillRect(x + 1, oy + r * h + 1, TILE / 2 - 2, h - 2);
    }
  }
}

function bakeAtlas(document, tiles) {
  const canvas = document.createElement('canvas');
  canvas.width = TILE * VARIANTS;
  canvas.height = TILE * tiles.TILES.length;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  for (const spec of tiles.TILES) {
    if (!spec.colour) continue;
    for (let v = 0; v < VARIANTS; v += 1) {
      const ox = v * TILE;
      const oy = spec.id * TILE;
      if (spec.ore) paintOre(ctx, spec, v, ox, oy);
      else if (spec.key === 'wood' || spec.key === 'plank') paintWood(ctx, spec, v, ox, oy);
      else if (spec.key === 'leaves') paintLeaves(ctx, spec, v, ox, oy);
      else if (spec.key === 'crystal') paintCrystal(ctx, spec, v, ox, oy);
      else if (spec.key === 'glass') paintGlass(ctx, spec, v, ox, oy);
      else if (spec.key === 'brick') paintBrick(ctx, spec, v, ox, oy);
      else if (!spec.solid) paintSmall(ctx, spec, v, ox, oy);
      else {
        ctx.fillStyle = spec.colour;
        ctx.fillRect(ox, oy, TILE, TILE);
        paintGrain(ctx, spec, v, ox, oy);
      }
    }
  }
  return canvas;
}

function variantFor(x, y) {
  let h = (x * 73856093) ^ (y * 19349663);
  h ^= h >>> 13;
  return (h >>> 0) % VARIANTS;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TILE, VARIANTS, bakeAtlas, variantFor, shade };
}
