'use strict';

// Draw on an integer grid, then scale with nearest-neighbor. Visual seeds never
// touch the run RNG, so opening a menu cannot change a seeded run.
const NightfallArt = (() => {
  const ink = '#171322';
  const paper = '#fff0c5';
  const assets = new Map();
  const terrain = new Map();

  function hash(text) {
    let n = 2166136261;
    for (const c of String(text)) n = Math.imul(n ^ c.codePointAt(0), 16777619);
    return (n ^ n >>> 16) >>> 0;
  }

  function rect(ctx, color, x, y, w, h) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }

  function surface(w, h) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    return canvas;
  }

  function blit(ctx, canvas, x, y, w, h) {
    const smoothing = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(canvas, Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    ctx.imageSmoothingEnabled = smoothing;
  }

  // Each family has a recognizable silhouette. Each catalog entry gets its own
  // engraving, trim, placement and highlights, including entries with the same icon.
  const shapes = {
    gem: ['....##....','...####...','..######..','.########.','##########','##########','.########.','..######..','...####...','....##....'],
    bottle: ['...####...','...####...','....##....','...####...','..######..','.########.','.########.','.########.','..######..','...####...'],
    shield: ['##########','##########','##########','##########','##########','.########.','.########.','..######..','...####...','....##....'],
    book: ['.########.','##########','##########','##########','##########','##########','##########','##########','##########','.########.'],
    blade: ['........##','......####','.....####.','....####..','...####...','..####....','#####.....','.####.....','#####.....','###.......'],
    feather: ['......####','....######','...#######','..#######.','..######..','.######...','.#####....','####......','##........','#.........'],
    flower: ['...####...','...####...','##.####.##','##########','##########','.########.','..######..','...####...','....##....','....##....'],
    ring: ['...####...','..######..','.########.','.##....##.','###....###','###....###','.##....##.','.########.','..######..','...####...'],
    crown: ['##..##..##','###.##.###','##########','##########','##########','.########.','.########.','.########.','..######..','..........'],
    mask: ['.##....##.','##########','##########','##########','.########.','.########.','..######..','...####...','....##....','..........'],
    moth: ['##......##','###....###','####..####','##########','##########','##########','.########.','..######..','...####...','....##....'],
    beast: ['..##..##..','.###..###.','.########.','##########','##########','##########','.########.','..######..','..##..##..','..........'],
    flame: ['.....#....','....##....','...####...','..#####...','..######..','.########.','##########','##########','.########.','..######..'],
    eye: ['..........','...####...','..######..','.########.','##########','##########','.########.','..######..','...####...','..........'],
    charm: ['....##....','...####...','...####...','..######..','.########.','##########','##########','.########.','..######..','...####...'],
    star: ['....##....','....##....','...####...','##########','.########.','..######..','..######..','..##..##..','.##....##.','..........'],
    heart: ['..........','.###..###.','#####.####','##########','##########','.########.','..######..','...####...','....##....','..........'],
    key: ['..####....','.##..##...','.##..##...','..#####...','....##....','....#####.','....##....','....####..','....##....','..........'],
    coin: ['...####...','..######..','.########.','.########.','.########.','.########.','.########.','.########.','..######..','...####...'],
    bomb: ['.....##...','....##....','..######..','.########.','##########','##########','##########','.########.','..######..','...####...'],
    chest: ['..........','..######..','.########.','##########','##########','##########','##########','##########','.########.','..........'],
    gear: ['..##..##..','..######..','##########','##########','.########.','.########.','##########','##########','..######..','..##..##..']
  };

  function family(def, kind, seed) {
    if (def.shape && shapes[def.shape]) return def.shape;
    if (kind === 'star') return 'star';
    if (kind === 'chest') return 'chest';
    const label = ((def.name || '') + ' ' + (def.icon || '')).toLowerCase();
    if (kind === 'familiar') {
      if (/moth|wing|fly|bat|🦋|🦇/.test(label)) return 'moth';
      if (/wisp|fire|spark|flame|ember/.test(label)) return 'flame';
      if (/eye|seer|watch/.test(label)) return 'eye';
      if (/bot|sentry|turret|machine/.test(label)) return 'gear';
      return ['beast','mask','moth','eye','flame','shield'][seed % 6];
    }
    if (/blade|sword|dagger|knife|spear|⚔|🗡/.test(label)) return 'blade';
    if (/feather|wing|quill|🪶/.test(label)) return 'feather';
    if (/crown|tiara|royal|👑/.test(label)) return 'crown';
    if (/bottle|flask|vial|potion|🧪/.test(label)) return 'bottle';
    if (/book|tome|scroll|page|📖|📜/.test(label)) return 'book';
    if (/shield|armor|barding|🛡/.test(label)) return 'shield';
    if (/flower|leaf|clover|seed|🍀/.test(label)) return 'flower';
    if (/ring|band|loop|💍/.test(label)) return 'ring';
    if (/gear|clock|machine|⚙/.test(label)) return 'gear';
    if (/flame|ember|torch|🔥/.test(label)) return 'flame';
    return ['gem','charm','mask','gear','eye','bottle','shield'][seed % 7];
  }

  function iconAsset(def, kind) {
    def = def || { id: 'unknown' };
    const identity = kind + ':' + (def.id || def.name || def.icon || 'unknown');
    const color = /^#[\da-f]{6}$/i.test(def.color || '') ? def.color : '#c79cd9';
    const key = identity + ':' + color;
    if (assets.has(key)) return assets.get(key);
    const canvas = surface(16, 16);
    const ctx = canvas.getContext('2d');
    const seed = hash(identity);
    const dark = Util.shadeColor(color, -0.45);
    const light = Util.shadeColor(color, 0.45);
    const accent = ['#ffd588','#8adac1','#f2a9d0','#b8c0ff'][seed >>> 28 & 3];
    if (kind === 'pill') {
      const pillShape = ['..########..','.##########.','############','############','############','.##########.','..########..'];
      pillShape.forEach((row, y) => [...row].forEach((cell, x) => {
        if (cell === '.') return;
        const outline = y === 0 || y === 6 || row[x - 1] !== '#' || row[x + 1] !== '#';
        rect(ctx, outline ? ink : x < 5 + (seed & 1) ? (y > 3 ? dark : color) : (y > 3 ? '#a6a7c4' : '#e7e9ef'), x + 2, y + 5, 1, 1);
      }));
      for (let i = 0; i < 20; i++) {
        const x = 4 + i % 7, y = 7 + Math.floor(i / 7);
        if ((seed >>> i) & 1) rect(ctx, x < 8 ? light : '#797394', x, y, 1, 1);
      }
      rect(ctx, paper, 5 + (seed >>> 20 & 3), 6, 2, 1);
    } else {
      const mask = shapes[family(def, kind, seed)];
      const flip = kind === 'item' || kind === 'familiar' ? seed & 1 : false;
      const pixels = [];
      mask.forEach((row, y) => [...row].forEach((cell, x) => {
        if (cell === '#') pixels.push([flip ? 12 - x : x + 3, y + 3]);
      }));
      for (const [x, y] of pixels) rect(ctx, ink, x - 1, y - 1, 3, 3);
      for (const [x, y] of pixels) {
        const detail = hash(seed + ':' + x + ':' + y);
        rect(ctx, y > 10 ? dark : y < 5 || (detail & 7) < 2 ? light : color, x, y, 1, 1);
      }
      // An inset seal is part of the object, rather than an emoji over its face.
      const center = pixels.filter(([x, y]) => x >= 5 && x <= 10 && y >= 5 && y <= 10);
      center.forEach(([x, y], i) => {
        if ((seed >>> (i % 32)) & 1) rect(ctx, i % 3 ? Util.shadeColor(color, 0.32) : accent, x, y, 1, 1);
      });
      if (def.half) {
        for (const [x, y] of pixels) if (x >= 8) rect(ctx, '#403346', x, y, 1, 1);
      }
      if (kind === 'chest') {
        rect(ctx, ink, 3, 8, 10, 1);
        rect(ctx, def.opened ? ink : '#ffd28c', 7, 7, 2, 3);
      }
      if (kind === 'familiar') {
        rect(ctx, ink, 6, 7, 2, 2); rect(ctx, ink, 10, 7, 2, 2);
        rect(ctx, paper, 6, 7, 1, 1); rect(ctx, paper, 10, 7, 1, 1);
      }
    }
    const entry = { canvas, url: null };
    assets.set(key, entry);
    return entry;
  }

  function icon(ctx, x, y, def, kind = 'item', size = 30) {
    blit(ctx, iconAsset(def, kind).canvas, x - size / 2, y - size / 2, size, size);
  }

  function image(def, kind = 'item') {
    const asset = iconAsset(def, kind);
    asset.url ||= asset.canvas.toDataURL();
    return '<img class="nightfall-pixel-icon" alt="" src="' + asset.url + '">';
  }

  function mount(element, def, kind) {
    if (!def) {
      if (element.textContent !== '—') element.textContent = '—';
      return;
    }
    const asset = iconAsset(def, kind || 'item');
    asset.url ||= asset.canvas.toDataURL();
    if (element.firstElementChild?.getAttribute('src') !== asset.url) element.innerHTML = image(def, kind);
  }

  function pony(ctx, x, y, size, opts = {}) {
    const unit = size / 21;
    const f = opts.facing || { x: 1, y: 0 };
    const mirror = f.x < -0.18 ? -1 : 1;
    const up = f.y < -0.65, down = f.y > 0.65;
    const now = opts.now || 0;
    const stride = opts.moving && Math.floor(now / 95) % 2 ? 1 : 0;
    const body = opts.flash ? '#ffedda' : opts.bodyColor || '#9d8ac2';
    const mane = opts.flash ? '#fff5ed' : opts.maneColor || '#463651';
    const shade = Util.shadeColor(body, -0.35);
    const height = opts.build === 'lanky' ? 1 : 0;
    const head = up ? 8 : 10;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(unit * mirror, unit);
    if (opts.ghostly) ctx.globalAlpha *= 0.72;
    if (opts.aura && !opts.flash) Util._ponyAura(ctx, 21, now, opts);
    rect(ctx, '#14101b88', -10, 8, 20, 2);
    // Back legs, tail, barrel and chest.
    rect(ctx, ink, -7, 2, 4, 6 + stride);
    rect(ctx, ink, 2, 2, 4, 6 - stride);
    rect(ctx, shade, -6, 3, 2, 4 + stride);
    rect(ctx, shade, 3, 3, 2, 4 - stride);
    rect(ctx, ink, -12, -3, 6, 7);
    rect(ctx, mane, -11, -2, 5, opts.hasFinTail ? 5 : 4);
    rect(ctx, mane, -12, 1, opts.hasFinTail ? 4 : 2, 4);
    rect(ctx, ink, -9, -5, 17, 10);
    rect(ctx, shade, -8, -4, 15, 8);
    rect(ctx, body, -8, -4, 14, 6);
    rect(ctx, Util.shadeColor(body, 0.28), -7, -4, 10, 2);
    for (const [leg, step] of [[-7, 1 - stride], [4, stride]]) {
      rect(ctx, ink, leg, 2, 4, 7 + step);
      rect(ctx, body, leg + 1, 3, 2, 5 + step);
      rect(ctx, shade, leg + 1, 7 + step, 2, 1);
    }
    if (opts.hasWings) {
      const flap = stride ? 1 : 0;
      rect(ctx, ink, -7, -9 - flap, 9, 9);
      rect(ctx, opts.wingStyle === 'bat' ? mane : shade, -6, -8 - flap, 7, 7);
      rect(ctx, opts.wingStyle === 'bat' ? Util.shadeColor(mane, 0.4) : body, -5, -7 - flap, 5, 4);
      rect(ctx, ink, -6, -2, 2, 2);
    }
    if (opts.hasScales || opts.hasStripes || opts.isRobot) {
      const trim = Util.shadeColor(mane, 0.25);
      for (let i = 0; i < 3; i++) rect(ctx, trim, -5 + i * 3, -1 + i % 2, 1 + Number(opts.isRobot), 2);
    }
    const hy = -10 - height;
    rect(ctx, ink, head - 6, hy - 1, 10, 11);
    rect(ctx, body, head - 5, hy, 8, 9);
    rect(ctx, shade, head - 4, hy + 7, 8, 2);
    rect(ctx, ink, head - 6, hy - 4, 4, 5);
    rect(ctx, mane, head - 5, hy - 3, 2, 4);
    rect(ctx, mane, head - 6, hy, 4, 6);
    rect(ctx, mane, head - 4, hy - 1, 6, 2);
    if (opts.flameMane) rect(ctx, '#ffbf67', head - 3, hy - 3 + stride, 2, 3);
    if (!up) {
      rect(ctx, ink, head + 1, hy + 4, 5, 4);
      rect(ctx, opts.hasBeak ? '#dca452' : body, head + 1, hy + 4, 4, 3);
      rect(ctx, opts.isRobot ? '#e7786e' : paper, head, hy + 2, down ? 4 : 3, 2);
      rect(ctx, ink, head + 1, hy + 2, 1, 2);
      if (opts.hasFangs) rect(ctx, paper, head + 3, hy + 7, 1, 2);
    }
    if (opts.hasHorn || opts.extraHorn) {
      rect(ctx, ink, head + 1, hy - 5, 3, 6);
      rect(ctx, opts.auraColor || paper, head + 2, hy - 4, 1, 4);
    }
    ctx.restore();
  }

  function dnb(ctx, e, flash) {
    const scale = e.radius / 8;
    const seed = hash(e.type?.id || e.behavior || 'dnb');
    const body = flash ? '#ffddbd' : ['#9d6247','#b27853','#83533f','#a96e4d'][seed & 3];
    const dark = flash ? '#dba991' : '#633a32';
    const light = flash ? paper : '#d2a278';
    const accent = flash ? paper : e.color || '#cc8a63';
    ctx.save();
    ctx.translate(Math.round(e.x), Math.round(e.y));
    ctx.scale(scale, scale);
    if (e.behavior === 'turret') {
      rect(ctx, ink, -6, -5, 12, 11);
      rect(ctx, dark, -5, -4, 10, 9);
      rect(ctx, body, -4, -4, 8, 6);
      rect(ctx, ink, -3, -8, 6, 6);
      rect(ctx, body, -2, -7, 4, 5);
      rect(ctx, accent, -1, -7, 2, 2);
      rect(ctx, light, -5, 3, 10, 1);
      ctx.restore();
      return;
    }
    // Broad head, narrow neck, shoulders, hands and boots: DNBs are humanoid.
    rect(ctx, ink, -5, -10, 10, 8); rect(ctx, ink, -7, -3, 14, 8);
    rect(ctx, ink, -8, 0, 4, 7); rect(ctx, ink, 4, 0, 4, 7);
    rect(ctx, ink, -5, 4, 4, 5); rect(ctx, ink, 1, 4, 4, 5);
    rect(ctx, dark, -4, 4, 3, 4); rect(ctx, dark, 1, 4, 3, 4);
    rect(ctx, dark, -6, -2, 12, 6); rect(ctx, body, -4, -2, 8, 5);
    rect(ctx, body, -7, 1, 2, 4); rect(ctx, body, 5, 1, 2, 4);
    rect(ctx, body, -4, -9, 8, 7); rect(ctx, light, -3, -9, 6, 1);
    rect(ctx, dark, -4, -4, 8, 2); rect(ctx, accent, -4, 2, 8, 1);
    rect(ctx, ink, -3, -7, 2, 2); rect(ctx, ink, 1, -7, 2, 2);
    rect(ctx, paper, -3, -7, 1, 1); rect(ctx, paper, 2, -7, 1, 1);
    if (e.isBoss) {
      rect(ctx, ink, -6, -12, 12, 4);
      for (let i = -5; i <= 5; i += 5) rect(ctx, accent, i, -13, 2, 4);
    } else {
      for (let i = 0; i < 4; i++) if ((seed >>> (4 + i)) & 1) rect(ctx, accent, -4 + i * 2, -10, 1, 2);
    }
    ctx.restore();
  }

  const materials = {
    bone: 'brick', leaf: 'moss', sand: 'dune', fire: 'fault', ice: 'facet',
    rust: 'plate', shell: 'shell', tide: 'wave', silt: 'silt', abyss: 'ripple',
    vent: 'fault', void: 'rune', crystal: 'facet'
  };

  function tile(ctx, x, y, size, tx, ty, pal, flavor, layer, floor) {
    const seed = hash(floor + ':' + tx + ':' + ty);
    const variation = seed & 7;
    const base = layer === 'void' ? pal.voidC : layer === 'wall' ? pal.wall : (tx + ty) % 2 ? pal.floorB : pal.floorA;
    const key = [floor, flavor, layer, base, pal.accent, variation].join(':');
    let canvas = terrain.get(key);
    if (!canvas) {
      if (terrain.size >= 768) terrain.delete(terrain.keys().next().value);
      canvas = surface(16, 16);
      const c = canvas.getContext('2d');
      const material = materials[flavor] || ['brick','plate','rune','moss'][hash(flavor) & 3];
      const low = Util.shadeColor(base, layer === 'void' ? -0.10 : -0.22);
      const mid = Util.shadeColor(base, layer === 'void' ? 0.16 : 0.20);
      const high = Util.shadeColor(base, layer === 'void' ? 0.26 : 0.33);
      rect(c, base, 0, 0, 16, 16);
      if (layer === 'wall') {
        for (const row of [0, 5, 10, 15]) {
          rect(c, low, 0, row, 16, 1);
          if (row < 15) {
            rect(c, mid, 1, row + 1, 14, 1);
            rect(c, low, (row * 3 + variation) % 13 + 1, row, 1, 5);
          }
        }
      } else {
        if (layer === 'floor') {
          rect(c, low, 0, 15, 16, 1); rect(c, low, 15, 0, 1, 16);
          rect(c, mid, 1, 0, 14, 1);
        }
        for (let i = 0; i < 12; i++) {
          const n = hash(key + ':' + i);
          const px = 1 + n % 13, py = 1 + (n >>> 8) % 13;
          const color = i < 4 ? high : i % 2 ? low : mid;
          if (material === 'wave' || material === 'dune' || material === 'silt' || material === 'ripple') {
            rect(c, color, px, py, Math.min(15 - px, 2 + (n >>> 18 & 3)), 1);
          } else if (material === 'moss' || material === 'shell') {
            rect(c, color, px, py, 2, 1); rect(c, color, px + 1, py + 1, 1, 1);
          } else if (material === 'fault' || material === 'facet') {
            rect(c, color, px, py, 1, 2); rect(c, color, px + 1, py + 1, 1, 2);
          } else {
            rect(c, color, px, py, i % 3 ? 1 : 2, 1);
          }
        }
        if (layer === 'floor') {
          const mx = 4 + (variation & 3), my = 4 + (variation >>> 1);
          if (flavor === 'bone') {
            rect(c, high, mx, my + 2, 6, 1);
            rect(c, high, mx, my + 1, 2, 3); rect(c, high, mx + 5, my + 1, 2, 3);
          } else if (flavor === 'leaf') {
            rect(c, high, mx, my + 2, 6, 2);
            rect(c, mid, mx + 2, my, 3, 5);
            rect(c, low, mx + 3, my + 2, 1, 5);
          } else if (flavor === 'sand' || flavor === 'tide' || flavor === 'silt') {
            for (let j = 0; j < 3; j++) rect(c, j === 1 ? high : low, 2 + (variation + j) % 4, 6 + j * 3, 10 - j, 1);
          } else if (flavor === 'ice' || flavor === 'crystal' || flavor === 'fire' || flavor === 'vent') {
            for (let j = 0; j < 6; j++) {
              const px = mx + j - 1, py = my + Math.floor(j / 2) - (j > 3 ? 2 : 0);
              rect(c, low, px, py, 2, 2);
              rect(c, flavor === 'fire' || flavor === 'vent' ? mid : high, px, py, 1, 1);
            }
          } else if (flavor === 'shell') {
            for (let j = 0; j < 4; j++) rect(c, j % 2 ? mid : high, mx - j, my + j, 2 + j * 2, 1);
          } else if (flavor === 'abyss' || flavor === 'void') {
            rect(c, low, mx, my, 5, 5);
            rect(c, high, mx + 2, my, 1, 5); rect(c, high, mx, my + 2, 5, 1);
          }
        }
        if (layer === 'floor' && (material === 'rune' || material === 'plate' || material === 'brick')) {
          const offset = 3 + variation;
          rect(c, low, 1, offset, 13, 1);
          rect(c, low, offset, offset + 1, 1, 14 - offset);
          if (material === 'plate') rect(c, high, 2, 12, 2, 2);
        }
      }
      terrain.set(key, canvas);
    }
    blit(ctx, canvas, x, y, size, size);
  }

  const panoramas = new Map();
  function backdrop(ctx, width, height, pal, floor, flavor) {
    const key = [width, height, pal.voidC, pal.accent, floor, flavor].join(':');
    let panorama = panoramas.get(key);
    if (!panorama) {
      const canvas = surface(120, 68);
      const c = canvas.getContext('2d');
      const seed = hash(floor);
      const base = pal.voidC;
      rect(c, base, 0, 0, 120, 68);
      for (let i = 0; i < 38; i++) {
        const n = hash(seed + ':' + i);
        rect(c, i % 7 === 0 ? pal.accent : Util.shadeColor(base, 0.26), n % 120, (n >>> 14) % 54, i % 5 ? 1 : 2, 1);
      }
      for (let i = 0; i < 4; i++) {
        const ridge = 18 + i * 11;
        for (let x = 0; x < 120; x += 3) {
          const offset = Math.round(Math.sin(x / (10 - i) + (seed % 17)) * (4 + i)) + hash(seed + ':' + i + ':' + x) % 4;
          rect(c, Util.shadeColor(base, 0.16 - i * 0.08), x, ridge + offset, 3, 68 - ridge - offset);
        }
      }
      const silhouette = Util.shadeColor(base, -0.25);
      const motif = hash(floor + ':horizon');
      for (let x = 4; x < 116; x += 7 + (motif & 3)) {
        const n = hash(floor + ':' + x);
        const rise = 4 + n % 15;
        const y = 60 - rise;
        if (flavor === 'leaf') {
          rect(c, silhouette, x, y, 2, rise + 8);
          rect(c, silhouette, x - 3, y - 1, 8, 5);
          rect(c, silhouette, x - 1, y - 4, 4, 4);
        } else if (flavor === 'bone' || flavor === 'rust') {
          rect(c, silhouette, x, y, 4, rise + 8);
          rect(c, silhouette, x - 1, y - 2, 6, 2);
          if (n & 1) rect(c, silhouette, x + 4, y + 5, 7, 2);
        } else if (flavor === 'ice' || flavor === 'crystal') {
          for (let j = 0; j < 4; j++) rect(c, silhouette, x + j, y + j * 2, 2, 68 - y - j * 2);
        } else if (['shell','tide','silt','abyss'].includes(flavor)) {
          rect(c, silhouette, x, 53 + n % 12, 5 + n % 7, 2);
          rect(c, silhouette, x + 3, 56 + n % 9, 7, 1);
        }
      }
      if (panoramas.size >= 8) panoramas.delete(panoramas.keys().next().value);
      panorama = canvas;
      panoramas.set(key, panorama);
    }
    blit(ctx, panorama, 0, 0, width, height);
  }

  return { icon, image, mount, pony, dnb, tile, backdrop };
})();
