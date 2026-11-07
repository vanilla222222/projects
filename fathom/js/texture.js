'use strict';
// Every tile texture is baked procedurally at load into one atlas canvas, so the game ships
// no image assets. Each tile gets four variants chosen by position hash, which stops large
// expanses of stone from tiling visibly. Bevels are not baked in: the renderer applies them
// per tile from its neighbour mask, because a tile's lit edges depend on what is beside it.

const TILE = 16;

// Four noise patterns, in three brightness bands. The bands are what break up a field of
// dirt: with one shade, several hundred tiles of soil read as a single flat mass however
// much per-pixel noise is sprinkled on them, because the eye integrates the noise away
// and sees only the average. The band is chosen by a coarse hash of position, so the
// brightness varies in patches of several tiles rather than per tile, which is what makes
// it read as ground rather than as static.
const PATTERNS = 4;
const SHADE_BANDS = 3;
const VARIANTS = PATTERNS * SHADE_BANDS;
const BAND_SHADE = [-0.042, 0, 0.042];
const BAND_SIZE = 4;            // tiles per brightness patch

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

// The base material painter. Per-pixel noise alone averages out to flat colour at any
// distance, so this works at three scales: broad blotches, mid-size clusters, and single
// pixels. What a material gets on top of that depends on what it is - soil has pebbles,
// rock has bedding planes and cracks, sand has ripples - because "brown with noise" and
// "grey with noise" is what made every surface look like the same surface.
function paintGrain(ctx, spec, variant, ox, oy) {
  const grain = spec.grain || 0;
  if (grain <= 0) return;

  // Broad blotches: a handful of soft patches per tile, which is the scale the eye reads
  // as material rather than as dirt on the screen.
  // Kept low-contrast and small on purpose: a bright blotch is a shape, and a shape that
  // repeats every few tiles reads as wallpaper rather than as ground.
  for (let i = 0; i < 3; i += 1) {
    const n = hashPixel(spec.id, variant * 7 + i, i * 5, 3);
    const cx = (hashPixel(spec.id, variant, i * 3, 11) * TILE) | 0;
    const cy = (hashPixel(spec.id, variant, i * 3, 29) * TILE) | 0;
    const r = 2 + n * 3;
    ctx.fillStyle = shade(spec.colour, (n - 0.5) * grain * 0.8);
    ctx.beginPath();
    ctx.arc(ox + cx, oy + cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mid-size clusters and single pixels.
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

  paintMaterial(ctx, spec, variant, ox, oy);
}

// What distinguishes one material from another at a glance.
function paintMaterial(ctx, spec, variant, ox, oy) {
  const kind = materialOf(spec);
  if (kind === 'soil') {
    // Pebbles and root flecks.
    for (let i = 0; i < 5; i += 1) {
      const px = (hashPixel(spec.id, variant + 3, i * 7, 2) * TILE) | 0;
      const py = (hashPixel(spec.id, variant + 3, i * 7, 19) * TILE) | 0;
      const big = hashPixel(spec.id, variant, i, 41) > 0.72;
      ctx.fillStyle = shade(spec.colour, big ? 0.3 : -0.28);
      ctx.fillRect(ox + px, oy + py, big ? 2 : 1, big ? 2 : 1);
    }
    return;
  }
  if (kind === 'rock') {
    // Bedding planes: a couple of faint horizontal seams, offset per variant, which is
    // what makes a wall of stone read as layered rock rather than as grey paint.
    for (let i = 0; i < 2; i += 1) {
      const y = ((variant * 5 + i * 9 + 3) % TILE);
      ctx.fillStyle = shade(spec.colour, -0.16);
      ctx.fillRect(ox, oy + y, TILE, 1);
      ctx.fillStyle = shade(spec.colour, 0.1);
      ctx.fillRect(ox, oy + y + 1, TILE, 1);
    }
    // A crack, sometimes.
    if (hashPixel(spec.id, variant, 5, 5) > 0.55) {
      ctx.fillStyle = shade(spec.colour, -0.3);
      let cx = (hashPixel(spec.id, variant, 9, 1) * TILE) | 0;
      for (let y = 2; y < TILE - 2; y += 1) {
        ctx.fillRect(ox + cx, oy + y, 1, 1);
        if (hashPixel(spec.id, variant, cx, y) > 0.6) cx += hashPixel(spec.id, variant, y, cx) > 0.5 ? 1 : -1;
        cx = Math.max(0, Math.min(TILE - 1, cx));
      }
    }
    return;
  }
  if (kind === 'sand') {
    // Ripples.
    for (let y = (variant % 4); y < TILE; y += 4) {
      ctx.fillStyle = shade(spec.colour, -0.1);
      for (let x = 0; x < TILE; x += 1) {
        const wave = Math.round(Math.sin((x + variant * 3) * 0.6) * 1.2);
        ctx.fillRect(ox + x, oy + y + wave, 1, 1);
      }
    }
    return;
  }
  if (kind === 'ice') {
    // Facets: a few bright diagonal slivers.
    for (let i = 0; i < 3; i += 1) {
      const x = (hashPixel(spec.id, variant, i * 11, 7) * TILE) | 0;
      const y = (hashPixel(spec.id, variant, i * 11, 23) * TILE) | 0;
      const len = 3 + ((i + variant) % 4);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      for (let j = 0; j < len; j += 1) {
        ctx.fillRect(ox + ((x + j) % TILE), oy + ((y + j) % TILE), 1, 1);
      }
    }
  }
}

// Which family of material a tile belongs to, for texturing purposes only.
function materialOf(spec) {
  if (spec.material) return spec.material;
  const key = spec.key;
  if (/dirt|grass|mud|peat|clay|ash|redclay/.test(key)) return 'soil';
  if (/sand|salt/.test(key)) return 'sand';
  if (/ice|snow|cloud|frost/.test(key)) return 'ice';
  if (/stone|granite|basalt|slate|brim|cinder|obsidian|skystone|starrock/.test(key)) return 'rock';
  return 'plain';
}

// A gem in its matrix: a cut stone embedded in rock, drawn with a hard highlight and a
// dark girdle so it catches the eye against the stone it is sitting in. Gems use the ore
// placement machinery but must not look like ore - a seam of metal and a gem you find
// once an hour should not read the same.
function paintGem(ctx, spec, variant, ox, oy) {
  ctx.fillStyle = '#595762';
  ctx.fillRect(ox, oy, TILE, TILE);
  paintGrain(ctx, { id: spec.id, colour: '#595762', grain: 0.12, key: 'stone' }, variant, ox, oy);
  // Two or three stones per tile, each a diamond with a lit top-left facet.
  const n = 2 + (hashPixel(spec.id, variant, 77, 3) > 0.6 ? 1 : 0);
  for (let i = 0; i < n; i += 1) {
    const cx = 3 + hashPixel(spec.id, variant, i, 13) * (TILE - 6);
    const cy = 3 + hashPixel(spec.id, variant, i, 31) * (TILE - 6);
    const r = 2.2 + hashPixel(spec.id, variant, i, 47) * 2;
    ctx.save();
    ctx.translate(ox, oy);
    // A dark girdle first, then the stone on top of it, so the gem has an outline
    // without drawing one.
    ctx.fillStyle = shade(spec.colour, -0.45);
    ctx.beginPath();
    ctx.moveTo(cx, cy - r - 0.8);
    ctx.lineTo(cx + r + 0.8, cy);
    ctx.lineTo(cx, cy + r + 0.8);
    ctx.lineTo(cx - r - 0.8, cy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = spec.colour;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r, cy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = shade(spec.colour, 0.45);
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx - r, cy);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
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

// Bark: vertical fibres with a lit left edge and a dark right edge, so a one-tile trunk still
// reads as round rather than as a flat brown stripe.
function paintWood(ctx, spec, variant, ox, oy) {
  const trunk = !!spec.trunkOf || spec.key === 'trunk'
    || spec.key === 'blighttrunk' || spec.key === 'fleshtrunk';
  ctx.fillStyle = spec.colour;
  ctx.fillRect(ox, oy, TILE, TILE);
  for (let x = 0; x < TILE; x += 1) {
    const across = x / (TILE - 1);
    const round = Math.sin(across * Math.PI);
    const fibre = hashPixel(spec.id, variant, x, 3) > 0.5 ? 0.1 : -0.12;
    ctx.fillStyle = shade(spec.colour, fibre + (round - 0.5) * 0.42);
    ctx.fillRect(ox + x, oy, 1, TILE);
  }
  if (trunk) {
    for (let i = 0; i < 3; i += 1) {
      const y = 2 + hashPixel(spec.id, variant, i, 71) * (TILE - 5);
      const h = 1 + hashPixel(spec.id, variant, i, 81) * 2.4;
      ctx.fillStyle = shade(spec.colour, -0.3);
      ctx.fillRect(ox + 2 + hashPixel(spec.id, variant, i, 91) * 6, oy + y, 2.4, h);
    }
  } else {
    ctx.fillStyle = shade(spec.colour, -0.3);
    ctx.fillRect(ox, oy + 7 + (variant % 2), TILE, 1);
  }
}

function paintLeaves(ctx, spec, variant, ox, oy) {
  ctx.clearRect(ox, oy, TILE, TILE);
  ctx.save();
  for (let i = 0; i < 9; i += 1) {
    const cx = 1 + hashPixel(spec.id, variant, i, 5) * (TILE - 2);
    const cy = 1 + hashPixel(spec.id, variant, i, 15) * (TILE - 2);
    const r = 2.1 + hashPixel(spec.id, variant, i, 25) * 3.1;
    const edge = Math.min(cx, cy, TILE - cx, TILE - cy) / (TILE / 2);
    ctx.globalAlpha = 0.55 + edge * 0.45;
    const tone = (hashPixel(spec.id, variant, i, 35) - 0.45) * 0.55;
    ctx.fillStyle = shade(spec.colour, tone);
    ctx.beginPath();
    ctx.arc(ox + cx, oy + cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 5; i += 1) {
    const cx = 2 + hashPixel(spec.id, variant, i, 45) * (TILE - 4);
    const cy = 2 + hashPixel(spec.id, variant, i, 55) * (TILE - 6);
    ctx.fillStyle = shade(spec.colour, 0.3);
    ctx.fillRect(ox + cx, oy + cy, 1.4, 1.4);
  }
  ctx.restore();
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
  if (spec.spikeDamage) {
    ctx.fillStyle = '#33253b';
    ctx.fillRect(ox, oy + 13, 16, 3);
    for (let i = 0; i < 4; i += 1) {
      ctx.fillStyle = spec.colour;
      ctx.fillRect(ox + i * 4 + 1, oy + 7, 1, 6);
      ctx.fillRect(ox + i * 4, oy + 10, 3, 3);
    }
    return;
  }
  if (spec.townDevice) {
    ctx.fillStyle = '#29253f';
    ctx.fillRect(ox + 2, oy + 12, 12, 4);
    ctx.fillRect(ox + 3, oy + 5, 10, 8);
    ctx.fillStyle = spec.colour;
    if (spec.townDevice === 'pylon' || spec.townDevice === 'heart') {
      ctx.beginPath();
      ctx.moveTo(ox + 8, oy + 1);
      ctx.lineTo(ox + 13, oy + 6);
      ctx.lineTo(ox + 8, oy + 13);
      ctx.lineTo(ox + 3, oy + 6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff2d6';
      ctx.fillRect(ox + 7, oy + 4, 2, 4);
    } else {
      ctx.fillRect(ox + 4, oy + 6, 8, 6);
      ctx.fillStyle = '#41465f';
      ctx.fillRect(ox + 5, oy + 7, 6, 3);
      ctx.fillStyle = '#c8ffe3';
      ctx.fillRect(ox + 6, oy + 8, 2, 1);
    }
    return;
  }
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

// The three stations. Each is drawn as a recognisable silhouette rather than a tinted
// square, because a bench you cannot pick out of a wall of dirt is a bench you lose.
// Water is painted with alpha so the wall behind a flooded tunnel still reads through it.
// The bands shift with the variant, which gives a large body of water some movement when
// the per-tile variant hash scatters them.
// Grass. The old grass was a flat tinted square with noise over it, which is why a
// hillside read as coloured dirt. Now the top two rows are a lighter band with blades
// standing out of it, so the surface of the world has a silhouette.
function paintGrass(ctx, spec, variant, ox, oy, soil) {
  ctx.fillStyle = soil || shade(spec.colour, -0.5);
  ctx.fillRect(ox, oy, 16, 16);
  ctx.fillStyle = spec.colour;
  ctx.fillRect(ox, oy, 16, 4);
  ctx.fillStyle = shade(spec.colour, 0.16);
  ctx.fillRect(ox, oy, 16, 1);
  // A ragged lower edge, so grass meets soil as a fringe of roots and not as a ruled line.
  for (let x = 0; x < 16; x += 1) {
    const h = 3 + ((x * 7 + variant * 5) % 3);
    ctx.fillStyle = shade(spec.colour, -0.12);
    ctx.fillRect(ox + x, oy + 4, 1, h - 2);
  }
  // Blades rising above the block, drawn into the top rows of the tile below's space by
  // staying inside this tile: the autotile lip above does the rest.
  for (let i = 0; i < 4; i += 1) {
    const x = (i * 4 + variant * 3 + 1) % 16;
    const tall = 1 + ((x + variant) % 3);
    ctx.fillStyle = shade(spec.colour, 0.3);
    ctx.fillRect(ox + x, oy, 1, -tall + 1 > 0 ? 1 : 1);
    ctx.fillRect(ox + x, oy, 1, 1);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (let i = 0; i < 5; i += 1) {
    const x = (i * 5 + variant * 7) % 16;
    const y = 6 + ((i * 3 + variant) % 9);
    ctx.fillRect(ox + x, oy + y, 1, 1);
  }
}

// One painter for the whole prop family. Each prop is a small silhouette built from a
// handful of rectangles; drawing them from a shared routine keeps them consistent in
// weight, which is what stops a field of foliage looking like a sticker sheet.
function paintDecor(ctx, spec, variant, ox, oy) {
  const c = spec.colour;
  const mid = 8;
  const jitter = (variant % 3) - 1;
  const base = ox + mid + jitter;

  function blade(x, from, to, w, colour) {
    ctx.fillStyle = colour;
    ctx.fillRect(x, oy + to, w, from - to);
  }

  switch (spec.key) {
    case 'tuft':
    case 'jungletuft': {
      const n = spec.key === 'jungletuft' ? 5 : 4;
      for (let i = 0; i < n; i += 1) {
        const x = base - (n - 1) + i * 2 + ((variant + i) % 2);
        const top = 16 - (4 + ((i * 3 + variant * 2) % 6));
        blade(x, 16, top, 1, shade(c, i % 2 ? 0.14 : -0.08));
      }
      return;
    }
    case 'reeds': {
      for (let i = 0; i < 3; i += 1) {
        const x = base - 2 + i * 2;
        blade(x, 16, 2 + ((i + variant) % 4), 1, shade(c, i % 2 ? 0.1 : -0.1));
      }
      return;
    }
    case 'seaweed': {
      // A ribbon that leans, so a bed of it does not look like a comb.
      for (let y = 15; y >= 3; y -= 1) {
        const sway = Math.round(Math.sin((y + variant * 3) * 0.6) * 1.6);
        ctx.fillStyle = shade(c, y % 3 ? 0 : 0.12);
        ctx.fillRect(base + sway, oy + y, 2, 1);
      }
      return;
    }
    case 'flower': {
      blade(base, 16, 7, 1, '#4f8a3a');
      ctx.fillStyle = c;
      ctx.fillRect(base - 2, oy + 4, 5, 3);
      ctx.fillRect(base - 1, oy + 3, 3, 5);
      ctx.fillStyle = shade(c, -0.4);
      ctx.fillRect(base, oy + 5, 1, 1);
      return;
    }
    case 'bamboo': {
      ctx.fillStyle = c;
      ctx.fillRect(base - 2, oy, 4, 16);
      ctx.fillStyle = shade(c, -0.26);
      ctx.fillRect(base + 1, oy, 1, 16);
      ctx.fillStyle = shade(c, -0.38);
      for (let y = (variant * 3) % 6; y < 16; y += 6) ctx.fillRect(base - 2, oy + y, 4, 1);
      ctx.fillStyle = shade(c, 0.22);
      ctx.fillRect(base - 2, oy, 1, 16);
      return;
    }
    case 'cactus': {
      ctx.fillStyle = c;
      ctx.fillRect(base - 3, oy, 6, 16);
      ctx.fillStyle = shade(c, 0.18);
      ctx.fillRect(base - 3, oy, 1, 16);
      ctx.fillStyle = shade(c, -0.3);
      ctx.fillRect(base + 2, oy, 1, 16);
      ctx.fillStyle = '#e4e0c8';
      for (let y = 2 + (variant % 3); y < 16; y += 5) {
        ctx.fillRect(base - 4, oy + y, 1, 1);
        ctx.fillRect(base + 3, oy + y + 2, 1, 1);
      }
      return;
    }
    case 'deadbush': {
      ctx.fillStyle = c;
      ctx.fillRect(base, oy + 8, 1, 8);
      for (let i = 0; i < 4; i += 1) {
        const dir = i % 2 ? 1 : -1;
        const y = 9 + i * 2 - (variant % 2);
        ctx.fillRect(base + (dir > 0 ? 1 : -3), oy + y, 3, 1);
        ctx.fillRect(base + dir * 3, oy + y - 2, 1, 2);
      }
      return;
    }
    case 'shell': {
      ctx.fillStyle = c;
      ctx.fillRect(base - 3, oy + 12, 7, 4);
      ctx.fillRect(base - 2, oy + 11, 5, 1);
      ctx.fillStyle = shade(c, -0.22);
      for (let i = -2; i <= 2; i += 1) ctx.fillRect(base + i, oy + 12, 1, 3 - Math.abs(i));
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(base - 2, oy + 11, 4, 1);
      return;
    }
    case 'coral': {
      ctx.fillStyle = c;
      ctx.fillRect(base - 1, oy + 7, 2, 9);
      for (let i = 0; i < 3; i += 1) {
        const dir = (i + variant) % 2 ? 1 : -1;
        const y = 8 + i * 2;
        ctx.fillRect(base + (dir > 0 ? 1 : -3), oy + y, 3, 1);
        ctx.fillRect(base + dir * 3, oy + y - 3, 1, 3);
      }
      ctx.fillStyle = shade(c, 0.3);
      ctx.fillRect(base - 1, oy + 7, 1, 4);
      return;
    }
    case 'frostshard': {
      ctx.fillStyle = c;
      for (let i = 0; i < 3; i += 1) {
        const x = base - 3 + i * 3;
        const top = 4 + ((i * 5 + variant * 2) % 7);
        ctx.fillRect(x, oy + top, 2, 16 - top);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillRect(base - 3, oy + 8, 1, 8);
      return;
    }
    default: {
      // The mushroom caps: blight, crimson, and anything else that lands here.
      ctx.fillStyle = '#d9d2c4';
      ctx.fillRect(base - 1, oy + 9, 2, 7);
      ctx.fillStyle = c;
      ctx.fillRect(base - 4, oy + 6, 9, 3);
      ctx.fillRect(base - 3, oy + 4, 7, 3);
      ctx.fillRect(base - 1, oy + 3, 3, 2);
      ctx.fillStyle = shade(c, 0.34);
      ctx.fillRect(base - 3, oy + 4, 6, 1);
      ctx.fillStyle = shade(c, -0.3);
      ctx.fillRect(base - 4, oy + 8, 9, 1);
    }
  }
}

// Liquid tiles are deliberately featureless. Anything baked into them - a highlight line,
// a darker bed - repeats every tile, and a body of water is the one place where a repeat
// is unmissable: an ocean rendered from a textured atlas reads as brickwork. The motion
// and the light live in the renderer instead, where they can be continuous functions of
// world position and time and so cross tile borders without a seam.
function paintWater(ctx, spec, variant, ox, oy) {
  ctx.save();
  ctx.globalAlpha = 0.66;
  ctx.fillStyle = spec.colour;
  ctx.fillRect(ox, oy, 16, 16);
  ctx.restore();
}

// A platform: a deck with a lip, drawn only in the top third of the tile so the space
// under it reads as space you can walk through, because you can.
function paintPlatform(ctx, spec, variant, ox, oy) {
  ctx.fillStyle = spec.colour;
  ctx.fillRect(ox, oy + 1, 16, 4);
  ctx.fillStyle = shade(spec.colour, 0.22);
  ctx.fillRect(ox, oy + 1, 16, 1);
  ctx.fillStyle = shade(spec.colour, -0.3);
  ctx.fillRect(ox, oy + 5, 16, 1);
  for (let i = 0; i < 2; i += 1) {
    const x = 3 + i * 8 + (variant % 3);
    ctx.fillRect(ox + x, oy + 6, 2, 3);
  }
}

// A door, hinged on one side and three tiles tall. Each cell knows which row it is, so
// the handle is drawn once and the panels line up into one object rather than three
// stacked hatches each with its own furniture.
function paintDoor(ctx, spec, variant, ox, oy) {
  const open = spec.door === 'open';
  const row = spec.doorRow || 0;
  ctx.fillStyle = shade(spec.colour, -0.5);
  ctx.fillRect(ox, oy, 16, 16);
  const w = open ? 5 : 14;
  const x = open ? 0 : 1;
  ctx.fillStyle = spec.colour;
  ctx.fillRect(ox + x, oy, w, 16);
  // The hinge side is lit, the swinging side shaded, all the way down.
  ctx.fillStyle = shade(spec.colour, 0.18);
  ctx.fillRect(ox + x, oy, 1, 16);
  ctx.fillStyle = shade(spec.colour, -0.3);
  ctx.fillRect(ox + x + w - 1, oy, 1, 16);
  if (open) return;

  // A panel per row, inset from the frame, and a lintel on the top cell.
  ctx.fillStyle = shade(spec.colour, -0.18);
  const top = row === 0 ? 4 : 1;
  const height = row === 2 ? 11 : 14;
  ctx.fillRect(ox + 3, oy + top, 10, height);
  ctx.fillStyle = shade(spec.colour, 0.08);
  ctx.fillRect(ox + 4, oy + top + 1, 8, height - 2);
  if (row === 0) {
    ctx.fillStyle = shade(spec.colour, -0.34);
    ctx.fillRect(ox + 1, oy + 1, 14, 2);
  }
  if (row === 2) {
    ctx.fillStyle = shade(spec.colour, -0.34);
    ctx.fillRect(ox + 1, oy + 13, 14, 2);
  }
  // One handle, on the middle cell, on the swinging edge.
  if (row === 1) {
    ctx.fillStyle = '#d8c070';
    ctx.fillRect(ox + 11, oy + 7, 2, 3);
    ctx.fillStyle = shade('#d8c070', -0.4);
    ctx.fillRect(ox + 11, oy + 9, 2, 1);
  }
}

// A bed: a headboard at one end, a footboard at the other, a mattress across the middle
// and a frame underneath. Each cell knows where it sits, so the four read as one object.
function paintBed(ctx, spec, variant, ox, oy) {
  const { dx, dy } = spec.bedCell;
  const wood = spec.colour;
  const sheet = '#cfd6e2';
  const blanket = '#9a5f62';
  if (dy === 0) {
    // The upper row: posts at the ends, pillow and blanket between.
    if (dx === 0 || dx === 3) {
      ctx.fillStyle = shade(wood, -0.1);
      ctx.fillRect(ox + (dx === 0 ? 2 : 8), oy + 2, 6, 14);
      ctx.fillStyle = shade(wood, 0.2);
      ctx.fillRect(ox + (dx === 0 ? 2 : 8), oy + 2, 6, 2);
      return;
    }
    ctx.fillStyle = dx === 1 ? sheet : blanket;
    ctx.fillRect(ox, oy + 8, 16, 8);
    if (dx === 1) {
      ctx.fillStyle = '#eef2f8';
      ctx.fillRect(ox + 1, oy + 5, 14, 5);     // the pillow
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(ox + 1, oy + 9, 14, 1);
    } else {
      ctx.fillStyle = shade(blanket, 0.18);
      ctx.fillRect(ox, oy + 8, 16, 1);
    }
    return;
  }
  // The lower row: the frame and its legs.
  ctx.fillStyle = wood;
  ctx.fillRect(ox, oy, 16, 4);
  ctx.fillStyle = shade(wood, 0.18);
  ctx.fillRect(ox, oy, 16, 1);
  ctx.fillStyle = shade(wood, -0.32);
  if (dx === 0) ctx.fillRect(ox + 2, oy + 4, 3, 9);
  if (dx === 3) ctx.fillRect(ox + 11, oy + 4, 3, 9);
}

// A chest: a lid across the top two cells and a body across the bottom two, with the
// lock in the middle where the four cells meet.
function paintChest(ctx, spec, variant, ox, oy) {
  const top = spec.part.dy === 0;
  const left = spec.part.dx === 0;
  const c = spec.colour;
  ctx.fillStyle = top ? shade(c, 0.1) : c;
  ctx.fillRect(ox + (left ? 1 : 0), oy + (top ? 3 : 0), left ? 15 : 15, top ? 13 : 14);
  // Banding, and a strap down the join.
  ctx.fillStyle = shade(c, -0.38);
  if (top) ctx.fillRect(ox + (left ? 1 : 0), oy + 3, 15, 2);
  ctx.fillRect(ox + (left ? 1 : 0), oy + (top ? 14 : 12), 15, 2);
  ctx.fillStyle = shade(c, 0.26);
  if (top) ctx.fillRect(ox + (left ? 1 : 0), oy + 5, 15, 1);
  // The lock, drawn across the seam by the two cells that meet there.
  ctx.fillStyle = '#d8c070';
  if (top && left) ctx.fillRect(ox + 13, oy + 11, 3, 5);
  if (top && !left) ctx.fillRect(ox, oy + 11, 3, 5);
  if (!top && left) ctx.fillRect(ox + 13, oy, 3, 3);
  if (!top && !left) ctx.fillRect(ox, oy, 3, 3);
}

// A life crystal: a faceted red gem on a small pedestal, spanning all four cells. Drawn
// bright at the core and dark at the edges so it reads as something that glows in a cave
// you have just opened, which is how you are meant to notice it.
function paintLifeCrystal(ctx, spec, variant, ox, oy) {
  const top = spec.part.dy === 0;
  const left = spec.part.dx === 0;
  const c = spec.colour;
  // The gem is a diamond centred on the join of the four cells; each cell draws its own
  // quarter of it.
  const cx = left ? 16 : 0;
  const cy = top ? 16 : 0;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(ox + cx, oy + cy - 14);
  ctx.lineTo(ox + cx + 8, oy + cy);
  ctx.lineTo(ox + cx, oy + cy + 12);
  ctx.lineTo(ox + cx - 8, oy + cy);
  ctx.closePath();
  const g = ctx.createRadialGradient(ox + cx, oy + cy - 3, 1, ox + cx, oy + cy, 15);
  // Kept well short of white at the core: the tile also emits light, and bloom on top of
  // a near-white centre washed the gem out into a pale blob with pink corners.
  g.addColorStop(0, shade(c, 0.28));
  g.addColorStop(0.5, c);
  g.addColorStop(1, shade(c, -0.52));
  ctx.fillStyle = g;
  ctx.fill();
  // Facet lines, so it is a cut gem rather than a red lozenge.
  ctx.strokeStyle = 'rgba(255,220,230,0.22)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(ox + cx - 8, oy + cy);
  ctx.lineTo(ox + cx + 8, oy + cy);
  ctx.moveTo(ox + cx, oy + cy - 14);
  ctx.lineTo(ox + cx, oy + cy + 12);
  ctx.stroke();
  ctx.restore();
  // A stone base under the bottom two cells.
  if (!top) {
    ctx.fillStyle = '#6a6470';
    ctx.fillRect(ox + (left ? 2 : 0), oy + 13, 14, 3);
    ctx.fillStyle = '#857f8c';
    ctx.fillRect(ox + (left ? 2 : 0), oy + 13, 14, 1);
  }
}

// A campfire: three logs and a flame, drawn bright because it is also a lamp.
function paintCampfire(ctx, spec, variant, ox, oy) {
  ctx.fillStyle = '#6d4f30';
  ctx.fillRect(ox + 2, oy + 11, 12, 2);
  ctx.fillStyle = '#5a3f26';
  ctx.fillRect(ox + 1, oy + 13, 14, 2);
  ctx.fillStyle = '#8a6038';
  ctx.fillRect(ox + 3, oy + 12, 4, 1);
  ctx.fillRect(ox + 9, oy + 12, 4, 1);
  // The flame, leaning a little differently in each variant so a row of fires does not
  // burn in lockstep.
  const lean = (variant % 3) - 1;
  ctx.fillStyle = '#e2743a';
  ctx.beginPath();
  ctx.moveTo(ox + 8 + lean, oy + 2);
  ctx.lineTo(ox + 12, oy + 11);
  ctx.lineTo(ox + 4, oy + 11);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f2b45a';
  ctx.beginPath();
  ctx.moveTo(ox + 8 + lean, oy + 5);
  ctx.lineTo(ox + 10.5, oy + 11);
  ctx.lineTo(ox + 5.5, oy + 11);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff0c0';
  ctx.fillRect(ox + 7 + lean, oy + 8, 2, 3);
}

// A rope: a twisted cord down the middle of the tile, drawn so that stacked tiles line
// up into one continuous line rather than into a column of separate dashes.
function paintRope(ctx, spec, variant, ox, oy) {
  const c = spec.colour;
  ctx.fillStyle = shade(c, -0.35);
  ctx.fillRect(ox + 7, oy, 3, TILE);
  ctx.fillStyle = c;
  for (let y = 0; y < TILE; y += 1) {
    // Two strands crossing: the offset is a function of y alone, so the twist continues
    // across the tile boundary.
    const t = Math.sin((y + oy) * 0.9) * 1.1;
    ctx.fillRect(ox + 8 + Math.round(t), oy + y, 1, 1);
    ctx.fillRect(ox + 8 - Math.round(t), oy + y, 1, 1);
  }
  ctx.fillStyle = shade(c, 0.35);
  for (let y = 1; y < TILE; y += 4) ctx.fillRect(ox + 8, oy + y, 1, 1);
}

// A pot: a bellied jar with a rim and a shoulder highlight.
function paintPot(ctx, spec, variant, ox, oy) {
  const c = spec.colour;
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.ellipse(ox + 8, oy + 10, 5.5, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(ox + 5, oy + 4, 6, 6);
  ctx.fillStyle = shade(c, -0.35);
  ctx.fillRect(ox + 4, oy + 3, 8, 2);          // rim
  ctx.fillStyle = shade(c, 0.28);
  ctx.fillRect(ox + 5, oy + 7, 2, 5);          // highlight down the belly
  ctx.fillStyle = shade(c, -0.3);
  ctx.fillRect(ox + 3, oy + 11, 10, 1);        // banding
  // Which pot this is, so a row of them is not a row of clones.
  ctx.fillStyle = shade(c, variant % 2 ? 0.14 : -0.14);
  ctx.fillRect(ox + 8 + (variant % 3), oy + 9, 1, 2);
}

// Chairs, tables and benches: small silhouettes, because a tile of flat colour in a room
// is indistinguishable from a tile of wall.
function paintFurniture(ctx, spec, variant, ox, oy) {
  const c = spec.colour;
  const dark = shade(c, -0.3);
  if (spec.furniture === 'chair') {
    ctx.fillStyle = c;
    ctx.fillRect(ox + 4, oy + 8, 8, 2);          // the seat
    ctx.fillStyle = dark;
    ctx.fillRect(ox + 4, oy + 10, 2, 6);         // legs
    ctx.fillRect(ox + 10, oy + 10, 2, 6);
    ctx.fillStyle = c;
    ctx.fillRect(ox + 10, oy + 2, 2, 7);         // the back
    ctx.fillStyle = shade(c, 0.2);
    ctx.fillRect(ox + 4, oy + 8, 8, 1);
    return;
  }
  if (spec.furniture === 'table') {
    ctx.fillStyle = c;
    ctx.fillRect(ox, oy + 5, 16, 3);
    ctx.fillStyle = shade(c, 0.2);
    ctx.fillRect(ox, oy + 5, 16, 1);
    ctx.fillStyle = dark;
    ctx.fillRect(ox + 1, oy + 8, 2, 8);
    ctx.fillRect(ox + 13, oy + 8, 2, 8);
    return;
  }
  // A work bench, in this species' wood.
  ctx.fillStyle = shade(c, 0.1);
  ctx.fillRect(ox + 1, oy + 5, 14, 3);
  ctx.fillStyle = dark;
  ctx.fillRect(ox + 2, oy + 8, 2, 7);
  ctx.fillRect(ox + 12, oy + 8, 2, 7);
  ctx.fillRect(ox + 4, oy + 10, 8, 1);
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(ox + 1, oy + 5, 14, 1);
  ctx.fillStyle = variant % 2 ? '#b9c2cc' : shade(c, -0.5);
  ctx.fillRect(ox + 4 + (variant % 3), oy + 3, 5, 2);
}

function paintStation(ctx, spec, variant, ox, oy) {
  const base = spec.colour;
  if (spec.key === 'workbench') {
    ctx.fillStyle = shade(base, 0.12);
    ctx.fillRect(ox + 1, oy + 5, 14, 3);          // the top
    ctx.fillStyle = shade(base, -0.22);
    ctx.fillRect(ox + 2, oy + 8, 2, 7);           // legs
    ctx.fillRect(ox + 12, oy + 8, 2, 7);
    ctx.fillRect(ox + 4, oy + 10, 8, 1);          // the stretcher
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(ox + 1, oy + 5, 14, 1);
    // A saw and a plane laid on the bench, placed by variant so benches differ.
    ctx.fillStyle = variant % 2 ? '#b9c2cc' : '#8e6b45';
    ctx.fillRect(ox + 4 + (variant % 3), oy + 3, 5, 2);
    return;
  }
  if (spec.key === 'furnace') {
    ctx.fillStyle = shade(base, -0.1);
    ctx.fillRect(ox + 1, oy + 2, 14, 13);
    ctx.fillStyle = shade(base, -0.35);
    ctx.fillRect(ox + 1, oy + 2, 14, 2);          // the lintel
    // The mouth, and the fire in it. This is the tile's own light source.
    ctx.fillStyle = '#1a1210';
    ctx.fillRect(ox + 4, oy + 7, 8, 8);
    const flicker = 0.55 + variant * 0.12;
    const grad = ctx.createLinearGradient(0, oy + 15, 0, oy + 7);
    grad.addColorStop(0, 'rgba(255,214,120,' + flicker.toFixed(2) + ')');
    grad.addColorStop(0.5, 'rgba(240,120,40,' + (flicker * 0.8).toFixed(2) + ')');
    grad.addColorStop(1, 'rgba(180,40,20,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(ox + 5, oy + 8, 6, 7);
    ctx.fillStyle = shade(base, 0.18);
    ctx.fillRect(ox + 1, oy + 2, 14, 1);
    return;
  }
  // Anvil: the classic horn-and-waist silhouette.
  ctx.fillStyle = shade(base, -0.3);
  ctx.fillRect(ox + 4, oy + 12, 8, 3);            // the base
  ctx.fillRect(ox + 6, oy + 8, 4, 4);             // the waist
  ctx.fillStyle = base;
  ctx.fillRect(ox + 2, oy + 5, 12, 3);            // the face
  ctx.fillRect(ox + 1, oy + 6, 2, 2);             // the horn
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillRect(ox + 2, oy + 5, 12, 1);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(ox + 2, oy + 7, 12, 1);
}

function paintOssuaryFixture(ctx, spec, ox, oy) {
  if (spec.solid) {
    ctx.fillStyle = '#302d40';
    ctx.fillRect(ox, oy, TILE, TILE);
    ctx.fillStyle = '#8e7147';
    ctx.fillRect(ox, oy + 2, TILE, 2);
    ctx.fillRect(ox, oy + 12, TILE, 2);
    ctx.fillStyle = spec.colour;
    ctx.fillRect(ox + 6, oy + 4, 4, 8);
    ctx.fillRect(ox + 3, oy + 7, 10, 2);
    return;
  }
  ctx.fillStyle = '#53526a';
  ctx.fillRect(ox + 2, oy + 13, 12, 3);
  ctx.fillRect(ox + 3, oy + 1, 2, 12);
  ctx.fillRect(ox + 11, oy + 1, 2, 12);
  ctx.fillRect(ox + 5, oy + 1, 6, 2);
  ctx.fillStyle = spec.colour;
  ctx.fillRect(ox + 7, oy + 3, 2, 2);
  ctx.fillRect(ox + 5, oy + 5, 6, 5);
  ctx.fillRect(ox + 4, oy + 10, 8, 2);
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

// A cool shadow and warm glints unify the material painters at atlas bake time.
function finishTileArt(ctx, spec, variant, x, y) {
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  const material = materialOf(spec);
  const highlights = { rock: '#d4c8f441', soil: '#ffc69144', sand: '#fff0b44f', ice: '#cbffff59' };
  if (spec.liquid || !spec.solid || spec.part || spec.station) {
    ctx.fillStyle = spec.liquid ? '#19365d29' : '#20193534';
    ctx.fillRect(x, y + 10, TILE, 6);
  }
  ctx.fillStyle = spec.liquid ? '#b9f2ff2b' : highlights[material] || '#ffd6a438';
  for (let i = 0; i < 4; i += 1) {
    const px = 1 + Math.floor(hashPixel(spec.id, variant, i, 83) * 12);
    const py = 1 + Math.floor(hashPixel(spec.id, variant, i, 89) * 12);
    const width = material === 'sand' || material === 'ice' ? 3 : i % 2 + 1;
    ctx.fillRect(x + px, y + py, width, 1);
    if (material === 'ice') ctx.fillRect(x + px + 1, y + py - 1, 2, 1);
  }
  ctx.restore();
}

const ATLAS_ROWS = 128;
function atlasX(id, variant) {
  return (Math.floor(id / ATLAS_ROWS) * VARIANTS + variant) * TILE;
}
function atlasY(id) {
  return (id % ATLAS_ROWS) * TILE;
}

function bakeAtlas(document, tiles) {
  const canvas = document.createElement('canvas');
  canvas.width = TILE * VARIANTS * Math.ceil(tiles.TILES.length / ATLAS_ROWS);
  canvas.height = TILE * Math.min(ATLAS_ROWS, tiles.TILES.length);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  for (const spec of tiles.TILES) {
    if (!spec.colour) continue;
    for (let v = 0; v < VARIANTS; v += 1) {
      const ox = atlasX(spec.id, v);
      const oy = atlasY(spec.id);
      const band = Math.floor(v / PATTERNS);
      if (spec.gem || spec.key === 'void-crystal') paintGem(ctx, spec, v, ox, oy);
      else if (spec.ore) paintOre(ctx, spec, v, ox, oy);
      else if (spec.platform) paintPlatform(ctx, spec, v, ox, oy);
      else if (spec.bed) paintBed(ctx, spec, v, ox, oy);
      else if (spec.chest) paintChest(ctx, spec, v, ox, oy);
      else if (spec.crystal === 'life') paintLifeCrystal(ctx, spec, v, ox, oy);
      else if (spec.pot) paintPot(ctx, spec, v, ox, oy);
      else if (spec.climb) paintRope(ctx, spec, v, ox, oy);
      else if (spec.key === 'campfire') paintCampfire(ctx, spec, v, ox, oy);
      else if (spec.door) paintDoor(ctx, spec, v, ox, oy);
      else if (spec.furniture) paintFurniture(ctx, spec, v, ox, oy);
      else if (spec.wood || spec.key === 'wood' || spec.key === 'plank' || spec.key === 'trunk'
        || spec.key === 'blighttrunk' || spec.key === 'fleshtrunk') paintWood(ctx, spec, v, ox, oy);
      else if (spec.decor) paintDecor(ctx, spec, v, ox, oy);
      else if (spec.grassTop) paintGrass(ctx, spec, v, ox, oy, spec.soil);
      else if (spec.key === 'leaves') paintLeaves(ctx, spec, v, ox, oy);
      else if (spec.key === 'crystal') paintCrystal(ctx, spec, v, ox, oy);
      else if (spec.key === 'glass') paintGlass(ctx, spec, v, ox, oy);
      else if (spec.key === 'dungeon-gate' || spec.key === 'dungeon-bell') paintOssuaryFixture(ctx, spec, ox, oy);
      else if (['brick', 'ashvault-brick', 'dungeon-brick'].includes(spec.key)) paintBrick(ctx, spec, v, ox, oy);
      else if (spec.liquid) paintWater(ctx, spec, v, ox, oy);
      else if (spec.station) paintStation(ctx, spec, v, ox, oy);
      else if (!spec.solid) paintSmall(ctx, spec, v, ox, oy);
      else {
        ctx.fillStyle = spec.colour;
        ctx.fillRect(ox, oy, TILE, TILE);
        paintGrain(ctx, spec, v, ox, oy);
      }

      finishTileArt(ctx, spec, v, ox, oy);

      // The brightness band, washed over whatever was painted. Done here rather than in
      // each painter so every material gets it, including the ones with hand-drawn
      // silhouettes.
      if (band !== 1 && spec.solid && !spec.door && !spec.chest && !spec.bed) {
        ctx.save();
        ctx.globalCompositeOperation = band === 0 ? 'multiply' : 'screen';
        const amount = Math.abs(BAND_SHADE[band]);
        const level = band === 0 ? 255 - Math.round(255 * amount * 2)
          : Math.round(255 * amount * 2);
        ctx.fillStyle = 'rgb(' + level + ',' + level + ',' + level + ')';
        ctx.fillRect(ox, oy, TILE, TILE);
        ctx.restore();
      }

      // A bevel on every solid tile: a lit top-left edge and a shaded bottom-right one.
      // Without it a wall of the same material is one undifferentiated mass, because
      // nothing marks where one block ends and the next begins.
      if (spec.solid && !spec.liquid) {
        ctx.save();
        // Light enough to separate one block from the next without drawing a grid over
        // the world: at 0.13 and 0.18 a wall of dirt read as a tiled lattice.
        ctx.globalAlpha = 0.06;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(ox, oy, TILE, 1);
        ctx.fillRect(ox, oy, 1, TILE);
        ctx.globalAlpha = 0.1;
        ctx.fillStyle = '#000000';
        ctx.fillRect(ox, oy + TILE - 1, TILE, 1);
        ctx.fillRect(ox + TILE - 1, oy, 1, TILE);
        ctx.restore();
      }
    }
  }
  return canvas;
}

// Which baked variant a tile at this position uses: a noise pattern chosen per tile, and
// a brightness band chosen per patch of a few tiles, so the ground varies at two scales
// at once.
function variantFor(x, y) {
  let h = (x * 73856093) ^ (y * 19349663);
  h ^= h >>> 13;
  const pattern = (h >>> 0) % PATTERNS;
  // Two scales of patch, summed. One scale alone tiles the world into visible squares of
  // a single brightness; two offset scales break that boundary up.
  const band = (bandAt(x, y, BAND_SIZE, 374761393)
    + bandAt(x + 2, y + 1, BAND_SIZE * 2 + 1, 668265263)) % SHADE_BANDS;
  return pattern + PATTERNS * band;
}

function bandAt(x, y, size, salt) {
  let b = (Math.floor(x / size) * salt) ^ (Math.floor(y / size) * 1103515245);
  b ^= b >>> 15;
  b = Math.imul(b, 2246822519);
  b ^= b >>> 13;
  return (b >>> 0) % SHADE_BANDS;
}

// The module's public surface, declared once. index.html used to repeat these
// names by hand, and three separate times a new export was added here and
// forgotten there, which broke the game at runtime while every test passed.
const EXPORTS_texture = { TILE, atlasX, atlasY, VARIANTS, PATTERNS, SHADE_BANDS, BAND_SIZE,
  bakeAtlas, variantFor, shade };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXPORTS_texture;
} else if (typeof FATHOM !== 'undefined') {
  FATHOM.texture = EXPORTS_texture;
}
