'use strict';
// The interface: hearts and stars, the hotbar, and the inventory screen with its equipment
// slots. Built from DOM rather than drawn on the canvas, so slots stay crisp at any zoom and
// the browser handles hit-testing. Item icons are drawn from the same baked atlas the world
// uses, so a slot shows the block it will place.

const CHEST_SLOTS = 20;

function makeUI(root, deps) {
  const { tiles, texture, inventory, atlas, mining, craft, controls } = deps;
  let craftRows = [];
  let craftSignature = null;
  let onCraft = null;
  let chest = null;
  let onChestMove = null;
  let shop = null;
  let paintedShop = null;
  let onBuy = null;
  let onHeal = null;
  let onSelectHotbar = null;
  const els = {};
  let open = false;
  let townOpen = false;

  function el(tag, cls, parent) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (parent) parent.appendChild(node);
    return node;
  }

  const iconArt = new Map();
  function itemArt(item) {
    let art = iconArt.get(item.key);
    if (!art) {
      art = paintInventoryIcon(item, 32);
      const ctx = art.getContext('2d');
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = '#eecb9c22';
      ctx.fillRect(0, 3, 32, 6);
      ctx.fillStyle = '#211f362b';
      ctx.fillRect(0, 23, 32, 9);
      ctx.globalCompositeOperation = 'source-over';
      iconArt.set(item.key, art);
    }
    return art;
  }

  function iconFor(item, size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    if (!item) return canvas;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(itemArt(item), 1, 2, size - 2, size - 2);
    return canvas;
  }

  function paintInventoryIcon(item, size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    if (!item) return canvas;
    const banner = craft?.ITEMS[item.key];
    if (banner?.banner) {
      const u = size / 16;
      ctx.fillStyle = '#322335';
      ctx.fillRect(2 * u, 2 * u, 12 * u, 2 * u);
      ctx.fillRect(4 * u, 4 * u, 8 * u, 11 * u);
      ctx.fillStyle = banner.colour;
      ctx.fillRect(5 * u, 4 * u, 6 * u, 9 * u);
      ctx.fillStyle = '#f4d8ac';
      ctx.fillRect(7 * u, 6 * u, 2 * u, 4 * u);
      return canvas;
    }
    if (mining && mining.isTool(item)) {
      paintToolIcon(ctx, mining.toolSpec(item.key).job, mining.tierColour(item), size);
      return canvas;
    }
    // Fit the whole object into the slot so furniture reads as a silhouette.
    const multi = tiles.MULTI && tiles.MULTI[item.key];
    if (multi) {
      const unit = Math.floor(size / Math.max(multi.w, multi.h));
      for (const cell of multi.cells) {
        ctx.drawImage(atlas, texture.atlasX(cell.id, 4), texture.atlasY(cell.id), texture.TILE, texture.TILE,
          Math.floor((size - multi.w * unit) / 2) + cell.part.dx * unit,
          Math.floor((size - multi.h * unit) / 2) + cell.part.dy * unit, unit, unit);
      }
      return canvas;
    }
    const spec = tiles.BY_KEY[item.key];
    if (spec && spec.colour) {
      ctx.drawImage(atlas, texture.atlasX(spec.id, 4), texture.atlasY(spec.id), texture.TILE, texture.TILE, 0, 0, size, size);
      return canvas;
    }
    const wallSpec = tiles.WALL_BY_KEY[item.key];
    if (wallSpec && wallSpec.colour) {
      ctx.fillStyle = wallSpec.colour;
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = Math.max(1, size / 12);
      ctx.strokeRect(size * 0.16, size * 0.16, size * 0.68, size * 0.68);
      return canvas;
    }
    const workshop = craft?.ITEMS[item.key];
    if (workshop?.dish || workshop?.textile || workshop?.potionTier) {
      const unit = size / 16;
      const shape = (colour, x, y, w, h) => {
        ctx.fillStyle = colour;
        ctx.fillRect(x * unit, y * unit, w * unit, h * unit);
      };
      const colour = workshop.colour;
      if (workshop.textile === 'thread') {
        shape('#a27953', 5, 2, 6, 12);
        for (let y = 4; y < 12; y += 2) shape(colour, 4, y, 8, 1);
      } else if (workshop.textile === 'fabric') {
        shape('#30273c', 2, 4, 12, 10);
        shape(colour, 3, 3, 10, 9);
        shape('#eee0c782', 4, 5, 8, 1);
        shape('#eee0c782', 4, 9, 8, 1);
      } else if (workshop.dish === 'skewer') {
        shape('#bd956b', 7, 2, 2, 13);
        for (let y = 4; y <= 10; y += 3) shape(colour, 4, y, 8, 2);
      } else if (workshop.dish) {
        shape('#775047', 2, 7, 12, 3);
        shape('#aa7562', 3, 10, 10, 2);
        shape('#875855', 5, 12, 6, 1);
        shape(colour, 3, 6, 10, 2);
        if (workshop.dish !== 'broth') shape('#e8c79f', 6, 5, 4, 1);
        if (workshop.dish === 'hotpot') shape('#dc805c', 4, 9, 8, 2);
      } else {
        const width = workshop.potionTier === 'grand' ? 10 : workshop.potionTier === 'refined' ? 8 : 6;
        const x = (16 - width) / 2;
        shape('#ba9b6d', 6, 2, 4, 2);
        shape('#c7d7df', 6, 4, 4, 2);
        shape('#8197aa', x - 1, 6, width + 2, 8);
        shape(colour, x, 8, width, 5);
        shape('#ffffff80', x + 1, 7, 1, 5);
      }
      return canvas;
    }
    if (craft && (item.key === 'bucket' || item.key === 'water-bucket')) {
      const u = size / 16;
      const full = item.key === 'water-bucket';
      ctx.fillStyle = '#8f98a3';
      ctx.fillRect(4 * u, 5 * u, 8 * u, 1 * u);
      ctx.fillStyle = '#9aa3ad';
      ctx.fillRect(4 * u, 6 * u, 8 * u, 7 * u);
      ctx.fillRect(5 * u, 13 * u, 6 * u, 1 * u);
      if (full) {
        ctx.fillStyle = '#3f86c4';
        ctx.fillRect(5 * u, 7 * u, 6 * u, 6 * u);
        ctx.fillStyle = 'rgba(190,230,255,0.5)';
        ctx.fillRect(5 * u, 7 * u, 6 * u, 1 * u);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(4 * u, 6 * u, 1 * u, 7 * u);
      return canvas;
    }
    if (craft && craft.ARMOUR[item.key]) {
      // Armour: a silhouette per slot, so four brown pieces are not four brown squares.
      const u = size / 16;
      const piece = craft.ARMOUR[item.key];
      ctx.fillStyle = piece.colour;
      if (piece.slot === 'head') {
        ctx.fillRect(3 * u, 3 * u, 10 * u, 7 * u);
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(5 * u, 6 * u, 6 * u, 2 * u);
      } else if (piece.slot === 'chest') {
        ctx.fillRect(3 * u, 3 * u, 10 * u, 9 * u);
        ctx.fillRect(1 * u, 4 * u, 2 * u, 5 * u);
        ctx.fillRect(13 * u, 4 * u, 2 * u, 5 * u);
      } else if (piece.slot === 'legs') {
        ctx.fillRect(3 * u, 2 * u, 10 * u, 5 * u);
        ctx.fillRect(3 * u, 7 * u, 4 * u, 7 * u);
        ctx.fillRect(9 * u, 7 * u, 4 * u, 7 * u);
      } else {
        ctx.fillRect(2 * u, 8 * u, 5 * u, 6 * u);
        ctx.fillRect(9 * u, 8 * u, 5 * u, 6 * u);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(2 * u, 12 * u, 12 * u, 2 * u);
      }
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = '#f8d8aa55';
      ctx.fillRect(2 * u, 3 * u, 12 * u, 2 * u);
      ctx.fillStyle = '#251e3b70';
      ctx.fillRect(2 * u, 10 * u, 12 * u, 2 * u);
      ctx.fillStyle = piece.tier === 'bone' ? '#5b4c50' : '#f3d59b';
      ctx.fillRect(7 * u, 8 * u, 2 * u, 2 * u);
      return canvas;
    }
    if (craft && item.kind === 'coin') {
      const u = size / 16;
      ctx.fillStyle = '#b8912c';
      ctx.beginPath();
      ctx.arc(8 * u, 8 * u, 5.6 * u, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = craft.ITEMS[item.key]?.colour || '#c38560';
      ctx.beginPath();
      ctx.arc(8 * u, 8 * u, 4.4 * u, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath();
      ctx.arc(6.4 * u, 6.4 * u, 1.5 * u, 0, Math.PI * 2);
      ctx.fill();
      return canvas;
    }
    if (craft && craft.ITEMS[item.key]?.kind === 'ammo') {
      const u = size / 16;
      if (craft.AMMO[item.key]?.family === 'bullet') {
        ctx.fillStyle = '#544352';
        ctx.fillRect(5 * u, 5 * u, 6 * u, 9 * u);
        ctx.fillStyle = craft.ITEMS[item.key].colour;
        ctx.fillRect(6 * u, 2 * u, 4 * u, 10 * u);
        ctx.fillStyle = '#f0d9aa';
        ctx.fillRect(5 * u, 12 * u, 6 * u, 2 * u);
        return canvas;
      }
      ctx.strokeStyle = '#b9a271';
      ctx.lineWidth = Math.max(1, u);
      ctx.beginPath();
      ctx.moveTo(3 * u, 13 * u);
      ctx.lineTo(12 * u, 4 * u);
      ctx.stroke();
      ctx.fillStyle = craft.ITEMS[item.key].colour;
      ctx.fillRect(11 * u, 3 * u, 3 * u, 3 * u);
      ctx.fillStyle = '#8a7a52';
      ctx.fillRect(2 * u, 12 * u, 3 * u, 3 * u);
      return canvas;
    }
    if (craft && craft.WEAPONS[item.key] && craft.WEAPONS[item.key].ranged) {
      const u = size / 16;
      if (craft.WEAPONS[item.key].ammo === 'bullet') {
        ctx.fillStyle = '#3c2d3e';
        ctx.fillRect(2 * u, 8 * u, 12 * u, 3 * u);
        ctx.fillRect(3 * u, 10 * u, 3 * u, 4 * u);
        ctx.fillStyle = craft.WEAPONS[item.key].colour || '#a8a29b';
        ctx.fillRect(5 * u, 6 * u, 10 * u, 2 * u);
        return canvas;
      }
      if (craft.WEAPONS[item.key].ammo === 'bolt') {
        ctx.fillStyle = '#9c633f';
        ctx.fillRect(2 * u, 8 * u, 12 * u, 2 * u);
        ctx.fillRect(4 * u, 10 * u, 3 * u, 3 * u);
        ctx.fillStyle = '#c5bbbf';
        ctx.fillRect(10 * u, 4 * u, 2 * u, 10 * u);
        ctx.fillRect(8 * u, 5 * u, 2 * u, 2 * u);
        ctx.fillRect(8 * u, 11 * u, 2 * u, 2 * u);
        return canvas;
      }
      const pickKey = item.key.replace(/-bow$/, '-pick');
      ctx.strokeStyle = mining?.toolSpec(pickKey) ? mining.tierColour({ key: pickKey }) : '#8a6038';
      ctx.lineWidth = Math.max(1.5, u * 1.4);
      ctx.beginPath();
      ctx.arc(5 * u, 8 * u, 6 * u, -Math.PI / 2.2, Math.PI / 2.2);
      ctx.stroke();
      ctx.strokeStyle = '#ded6c2';
      ctx.lineWidth = Math.max(1, u * 0.7);
      ctx.beginPath();
      ctx.moveTo(6 * u, 2.6 * u);
      ctx.lineTo(6 * u, 13.4 * u);
      ctx.stroke();
      return canvas;
    }
    if (craft && craft.WEAPONS[item.key] && craft.WEAPONS[item.key].magic) {
      // A staff: a shaft with the gem it is made of on the end, in that gem's colour.
      const u = size / 16;
      const w = craft.WEAPONS[item.key];
      ctx.strokeStyle = '#7a5a36';
      ctx.lineWidth = 1.6 * u;
      ctx.beginPath();
      ctx.moveTo(4 * u, 14 * u);
      ctx.lineTo(10 * u, 5 * u);
      ctx.stroke();
      ctx.fillStyle = w.bolt || '#9b59d0';
      ctx.beginPath();
      ctx.arc(11 * u, 4 * u, 3.1 * u, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.arc(10 * u, 3 * u, 1.1 * u, 0, Math.PI * 2);
      ctx.fill();
      return canvas;
    }
    if (craft && craft.WEAPONS[item.key]) {
      // A sword: blade, crossguard, grip. Tier shows in the blade colour.
      const u = size / 16;
      const tier = Math.max(0, Object.keys(craft.WEAPONS)
        .filter(k => !craft.WEAPONS[k].ranged).indexOf(item.key));
      const blades = ['#8a6a42', '#b5733c', '#8f8f97', '#c9ccd6', '#e0c054', '#3f7fb5', '#d4663a'];
      const pickKey = item.key === 'aether-sabre' ? 'aetherite-pick' : item.key.replace(/-sword$/, '-pick');
      ctx.fillStyle = mining?.toolSpec(pickKey) ? mining.tierColour({ key: pickKey }) : blades[tier] || '#aab';
      ctx.beginPath();
      ctx.moveTo(12 * u, 2 * u);
      ctx.lineTo(14 * u, 4 * u);
      ctx.lineTo(6 * u, 12 * u);
      ctx.lineTo(4 * u, 10 * u);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(11 * u, 3 * u, 2 * u, 1 * u);
      ctx.fillStyle = '#6b4a2c';
      ctx.fillRect(3 * u, 11 * u, 4 * u, 2 * u);
      ctx.fillStyle = '#9a8248';
      ctx.fillRect(2 * u, 9 * u, 5 * u, 1.6 * u);
      return canvas;
    }
    // Accessories. Twenty-five of them, and every one was the same grey square: a
    // pendant on a chain, tinted, is enough to tell them apart at a glance.
    const acc = craft && craft.ACCESSORIES[item.key];
    if (acc) {
      const u = size / 16;
      ctx.strokeStyle = '#c9b06a';
      ctx.lineWidth = 1.4 * u;
      ctx.beginPath();
      ctx.arc(8 * u, 7 * u, 4.2 * u, Math.PI * 0.86, Math.PI * 0.14);
      ctx.stroke();
      ctx.fillStyle = acc.colour;
      ctx.beginPath();
      ctx.moveTo(8 * u, 8 * u);
      ctx.lineTo(11.5 * u, 11 * u);
      ctx.lineTo(8 * u, 14.5 * u);
      ctx.lineTo(4.5 * u, 11 * u);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath();
      ctx.moveTo(8 * u, 8 * u);
      ctx.lineTo(8 * u, 11 * u);
      ctx.lineTo(4.5 * u, 11 * u);
      ctx.closePath();
      ctx.fill();
      return canvas;
    }
    // A rod: a tapering pole with a line and a float on the end.
    if (craft && craft.ITEMS[item.key] && craft.ITEMS[item.key].rod) {
      const u = size / 16;
      ctx.strokeStyle = craft.ITEMS[item.key].colour;
      ctx.lineWidth = 1.6 * u;
      ctx.beginPath();
      ctx.moveTo(2 * u, 14 * u);
      ctx.lineTo(12 * u, 3 * u);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(230,236,244,0.7)';
      ctx.lineWidth = 0.9 * u;
      ctx.beginPath();
      ctx.moveTo(12 * u, 3 * u);
      ctx.quadraticCurveTo(14 * u, 8 * u, 11 * u, 11 * u);
      ctx.stroke();
      ctx.fillStyle = '#d8524c';
      ctx.beginPath();
      ctx.arc(11 * u, 12 * u, 1.8 * u, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#f2efe6';
      ctx.beginPath();
      ctx.arc(11 * u, 12 * u, 1.8 * u, 0, Math.PI);
      ctx.fill();
      return canvas;
    }
    // A hook: a shaft with two barbs and a length of chain.
    const hooked = craft && craft.grappleOf(item);
    if (hooked) {
      const u = size / 16;
      ctx.strokeStyle = '#7d848f';
      ctx.lineWidth = 1.2 * u;
      ctx.beginPath();
      ctx.moveTo(3 * u, 14 * u);
      ctx.lineTo(8 * u, 8 * u);
      ctx.stroke();
      ctx.fillStyle = '#cfd6e0';
      ctx.beginPath();
      ctx.moveTo(8 * u, 9 * u);
      ctx.lineTo(13 * u, 3 * u);
      ctx.lineTo(11 * u, 8 * u);
      ctx.lineTo(13 * u, 10 * u);
      ctx.lineTo(7 * u, 11 * u);
      ctx.closePath();
      ctx.fill();
      return canvas;
    }
    const itemSpec = craft && craft.ITEMS[item.key];
    if (itemSpec?.kind === 'loot' || item.key === 'manacrystal' || item.key === 'cinder-idol' || item.key.endsWith('-fish')) {
      paintLootIcon(ctx, item.key, itemSpec, size);
      return canvas;
    }
    if (itemSpec?.use?.open) {
      const u = size / 16;
      ctx.fillStyle = '#262239';
      ctx.fillRect(1 * u, 3 * u, 14 * u, 11 * u);
      ctx.fillStyle = itemSpec.colour;
      ctx.fillRect(2 * u, 4 * u, 12 * u, 9 * u);
      ctx.fillStyle = '#fff0c960';
      ctx.fillRect(2 * u, 4 * u, 12 * u, 2 * u);
      ctx.fillStyle = '#29203590';
      ctx.fillRect(2 * u, 8 * u, 12 * u, 2 * u);
      ctx.fillRect(4 * u, 4 * u, 2 * u, 9 * u);
      ctx.fillRect(10 * u, 4 * u, 2 * u, 9 * u);
      ctx.fillStyle = '#e2b663';
      ctx.fillRect(7 * u, 7 * u, 2 * u, 3 * u);
      return canvas;
    }
    // Something used rather than worn: a flask, so a crystal and a salve do not look
    // like bars of metal.
    if (itemSpec && itemSpec.use) {
      const u = size / 16;
      ctx.fillStyle = '#bcc6d4';
      ctx.fillRect(6.5 * u, 2 * u, 3 * u, 3 * u);
      ctx.fillStyle = itemSpec.colour;
      ctx.beginPath();
      ctx.moveTo(6 * u, 5 * u);
      ctx.lineTo(10 * u, 5 * u);
      ctx.lineTo(13 * u, 12 * u);
      ctx.lineTo(11 * u, 14.5 * u);
      ctx.lineTo(5 * u, 14.5 * u);
      ctx.lineTo(3 * u, 12 * u);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(5 * u, 7 * u, 1.5 * u, 5 * u);
      return canvas;
    }
    if (itemSpec) {
      // An ingot: a stubby trapezoid with a lit top edge, so bars read apart from blocks.
      const u = size / 16;
      ctx.fillStyle = itemSpec.colour;
      ctx.beginPath();
      ctx.moveTo(4 * u, 6 * u);
      ctx.lineTo(12 * u, 6 * u);
      ctx.lineTo(14 * u, 11 * u);
      ctx.lineTo(2 * u, 11 * u);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(4 * u, 6 * u, 8 * u, 1.5 * u);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(2 * u, 10 * u, 12 * u, 1 * u);
      return canvas;
    }
    ctx.fillStyle = '#8894a8';
    ctx.fillRect(size * 0.2, size * 0.2, size * 0.6, size * 0.6);
    return canvas;
  }

  function paintToolIcon(ctx, job, colour, size) {
    const u = size / 16;
    function facet(points, fill, outline = false) {
      ctx.beginPath();
      ctx.moveTo(points[0] * u, points[1] * u);
      for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i] * u, points[i + 1] * u);
      ctx.closePath();
      if (outline) {
        ctx.lineJoin = 'round';
        ctx.lineWidth = u;
        ctx.strokeStyle = '#221d32';
        ctx.stroke();
      }
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (job === 'axe') {
      // Upright hatchet with a broad, dropped cutting edge.
      facet([5, 15, 3, 15, 4, 3, 6, 3], '#b07648', true);
      facet([4, 3, 8, 3, 13, 1, 15, 5, 14, 10, 9, 8, 7, 6, 4, 6], colour, true);
      facet([13, 1, 15, 5, 14, 10, 12, 9, 13, 5, 11.5, 2], '#fff1cbbd');
    } else if (job === 'hammer') {
      // A straight haft and a heavy rectangular double face.
      facet([7, 6, 9, 6, 9, 15, 7, 15], '#a5694a', true);
      facet([2, 3, 4, 1, 12, 1, 14, 3, 14, 7, 12, 9, 4, 9, 2, 7], colour, true);
      facet([2, 3, 4, 1, 12, 1, 14, 3, 12, 4, 4, 4], '#fff1cba8');
      facet([4, 4, 5, 4, 5, 9, 4, 9], '#211d3688');
      facet([11, 4, 12, 4, 12, 9, 11, 9], '#211d3688');
    } else {
      // Long diagonal shaft and two tapered, hooked ends.
      facet([2, 15, 1, 13, 10, 4, 12, 6], '#aa7547', true);
      facet([3, 2, 6, 1, 10, 2, 14, 6, 15, 10, 14, 13, 12, 8, 9, 5, 6, 3], colour, true);
      facet([3, 2, 6, 1, 10, 2, 14, 6, 15, 10, 12, 6, 9, 3.5, 6, 2.5], '#fff1cbb5');
    }
  }

  function paintLootIcon(ctx, key, spec, size) {
    const u = size / 16;
    let hash = 0;
    for (const letter of key) hash = (Math.imul(hash, 31) + letter.charCodeAt(0)) >>> 0;
    function shape(points, colour) {
      ctx.fillStyle = colour;
      ctx.beginPath();
      ctx.moveTo(points[0] * u, points[1] * u);
      for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i] * u, points[i + 1] * u);
      ctx.closePath();
      ctx.fill();
    }
    const fish = /fish|bass|trout|pike|perch|piranha|carp|gill|minnow|flarefin|mudeel/.test(key);
    const silhouettes = {
      fish: [1, 4, 5, 6, 8, 3, 12, 5, 15, 8, 12, 11, 8, 12, 5, 9, 1, 12],
      shell: [2, 8, 5, 3, 11, 3, 14, 7, 12, 12, 7, 14, 3, 12],
      feather: [2, 14, 5, 8, 7, 4, 13, 2, 14, 6, 11, 11, 6, 12],
      shard: [2, 9, 6, 3, 11, 2, 14, 6, 10, 12, 6, 14],
      star: [8, 1, 10, 6, 15, 6, 11, 10, 12, 15, 8, 12, 4, 15, 5, 10, 1, 6, 6, 6],
      gel: [2, 11, 4, 6, 7, 5, 10, 2, 13, 7, 14, 12, 11, 14, 5, 14],
      bone: [1, 10, 3, 7, 5, 8, 9, 5, 9, 2, 12, 2, 15, 5, 12, 8, 10, 7, 6, 11, 6, 13, 3, 14],
      boot: [5, 2, 11, 2, 10, 8, 14, 9, 15, 13, 3, 13, 3, 10],
      hide: [2, 3, 6, 4, 10, 2, 14, 5, 12, 9, 14, 13, 8, 14, 5, 11, 2, 13],
      idol: [2, 13, 4, 11, 4, 5, 2, 2, 6, 3, 8, 1, 10, 3, 14, 2, 12, 5, 12, 11, 14, 13, 14, 15, 2, 15],
      lens: [2, 6, 5, 3, 11, 3, 14, 6, 14, 10, 11, 13, 5, 13, 2, 10]
    };
    const type = key === 'cinder-idol' ? 'idol' : fish ? 'fish' : /shrimp|snail|chitin/.test(key) ? 'shell'
      : /star/.test(key) ? 'star' : /feather|finleather/.test(key) ? 'feather'
        : /gel/.test(key) ? 'gel' : /bone/.test(key) ? 'bone' : /junk/.test(key) ? 'boot'
          : /flesh|leather|tissue/.test(key) ? 'hide' : /lens/.test(key) ? 'lens' : 'shard';
    shape(silhouettes[type], '#211f36');
    ctx.save();
    ctx.translate(u, u);
    ctx.scale(0.875, 0.875);
    shape(silhouettes[type], spec.colour || '#bdac98');
    ctx.restore();
    ctx.globalCompositeOperation = 'source-atop';
    shape([2, 10, 8, 8, 15, 5, 15, 15, 2, 15], '#211f365c');
    shape([4, 6, 8, 3, 12, 4, 7, 7], '#fff0c977');
    ctx.fillStyle = '#fff0c9a0';
    for (let i = 0; i < 3; i += 1) ctx.fillRect((5 + (hash >>> (i * 5)) % 7) * u, (7 + i) * u, u, u);
    if (fish || type === 'lens') {
      ctx.fillStyle = '#211f36';
      ctx.fillRect((fish ? 11 : 7) * u, 6 * u, 2 * u, 2 * u);
    }
  }

  function nameOf(item) {
    if (!item) return '';
    const spec = tiles.BY_KEY[item.key] || tiles.WALL_BY_KEY[item.key];
    return spec ? spec.name : item.key;
  }

  function buildSlot(index, parent, extraClass) {
    const node = el('button', 'slot' + (extraClass ? ' ' + extraClass : ''), parent);
    node.dataset.index = String(index);
    el('span', 'icon', node);
    el('span', 'count', node);
    const activate = ev => {
      ev.preventDefault();
      ev.stopPropagation();
      if (!open && parent === els.bar && onSelectHotbar) { onSelectHotbar(index); return; }
      if (ev.button === 2) inventory.splitSlot(index);
      else if (ev.shiftKey) inventory.quickMove(index);
      else inventory.clickSlot(index);
      sync();
    };
    node.addEventListener('mousedown', activate);
    node.addEventListener('pointerdown', ev => { if (ev.pointerType === 'touch') activate(ev); });
    node.addEventListener('contextmenu', (ev) => ev.preventDefault());
    watchSlot(node, () => inventory.slots[index]);
    return node;
  }

  function closeTown() {
    if (!els.town) return;
    townOpen = false;
    els.town.hidden = true;
    els.town.textContent = '';
  }

  function showTown(title, rows, actions, searchView, placeholder = 'Search items and recipes') {
    hideTip();
    townOpen = true;
    els.town.hidden = false;
    els.town.textContent = '';
    const header = el('div', 'town-header', els.town);
    el('h2', null, header).textContent = title;
    const close = el('button', 'action', header);
    close.textContent = 'Close';
    close.addEventListener('click', closeTown);
    let search;
    if (searchView) {
      search = el('input', 'town-search', els.town);
      search.placeholder = placeholder;
      search.setAttribute('aria-label', search.placeholder);
    }
    const body = el('div', 'town-body', els.town);
    function paint() {
      if (!townOpen || !body.isConnected) return;
      body.textContent = '';
      const view = searchView ? searchView(search.value.trim().toLowerCase()) : { rows, actions };
      for (const row of view.rows) el('p', null, body).textContent = row;
      for (const action of view.actions) {
        const button = el('button', 'action town-action', body);
        button.textContent = action.label;
        button.addEventListener('click', () => {
          action.run();
          if (searchView) paint();
        });
      }
    }
    if (search) search.addEventListener('input', paint);
    paint();
  }

  function build() {
    els.stats = el('div', 'stats', root);
    els.hearts = el('div', 'meter hearts', els.stats);
    els.stars = el('div', 'meter stars', els.stats);
    // Breath appears only while it is running out, so the HUD stays quiet on land.
    els.breath = el('div', 'meter breath', els.stats);

    els.readout = el('div', 'panel readout', root);
    for (const field of ['clock', 'biome', 'depth', 'coords', 'seed']) {
      const row = el('div', 'row', els.readout);
      const label = el('span', 'label', row);
      label.textContent = field === 'coords' ? 'At' : field[0].toUpperCase() + field.slice(1);
      const value = el('span', null, row);
      value.dataset.field = field;
      els[field] = value;
    }

    els.message = el('p', 'message', root);
    els.town = el('section', 'panel town-panel', root);
    els.town.hidden = true;
    els.town.setAttribute('aria-label', 'Town services');

    els.screen = el('div', 'screen', root);
    const left = el('div', 'panel grid-panel', els.screen);
    el('h2', null, left).textContent = 'Backpack';
    els.backpack = el('div', 'grid', left);
    els.backpackSlots = [];
    const main = inventory.section('main');
    for (let i = main.from; i < main.to; i += 1) {
      els.backpackSlots.push(buildSlot(i, els.backpack));
    }
    const actions = el('div', 'actions', left);
    const sortBtn = el('button', 'action', actions);
    sortBtn.textContent = 'Sort';
    sortBtn.addEventListener('mousedown', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      inventory.sort('main');
      sync();
    });
    const trashWrap = el('div', 'trash-wrap', actions);
    el('span', 'trash-label', trashWrap).textContent = 'Trash';
    els.trashSlot = buildSlot(inventory.section('trash').from, trashWrap, 'trash');

    const right = el('div', 'panel equip-panel', els.screen);
    el('h2', null, right).textContent = 'Equipment';
    els.equipSlots = [];
    for (const [key, title] of [['armor', 'Armour'], ['accessory', 'Accessories'], ['vanity', 'Vanity'], ['ammo', 'Ammo · leftmost match fires first'], ['coins', 'Coins']]) {
      const group = el('div', 'equip-group', right);
      el('span', 'equip-label', group).textContent = title;
      const row = el('div', 'equip-row', group);
      const section = inventory.section(key);
      for (let i = section.from; i < section.to; i += 1) {
        els.equipSlots.push(buildSlot(i, row, 'equip'));
      }
    }

    // The chest panel: present only while a chest is open, which is why it is built
    // once and hidden rather than created and destroyed on every use.
    els.chestPanel = el('div', 'panel chest-panel', els.screen);
    els.chestTitle = el('h2', null, els.chestPanel);
    els.chestTitle.textContent = 'Chest';
    els.chestGrid = el('div', 'grid chest-grid', els.chestPanel);
    els.chestSlots = [];
    for (let i = 0; i < CHEST_SLOTS; i += 1) {
      const node = el('div', 'slot', els.chestGrid);
      node.dataset.chest = String(i);
      node.addEventListener('mousedown', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (onChestMove) onChestMove(i, ev.shiftKey);
      });
      watchSlot(node, () => (chest && chest[i]) || null);
      els.chestSlots.push(node);
    }
    el('p', 'hint', els.chestPanel).textContent = 'Click to take \u2014 shift-click to stow';

    // The shop, shown while talking to a villager.
    els.shopPanel = el('div', 'panel shop-panel', els.screen);
    els.shopName = el('h2', null, els.shopPanel);
    els.shopPurse = el('p', 'stations', els.shopPanel);
    els.shopList = el('div', 'craft-list', els.shopPanel);
    els.shopNote = el('p', 'craft-empty', els.shopPanel);

    const craftPanel = el('div', 'panel craft-panel', els.screen);
    el('h2', null, craftPanel).textContent = 'Crafting';
    els.craftStations = el('p', 'stations', craftPanel);
    els.craftFilter = el('select', 'craft-filter', craftPanel);
    els.craftFilter.setAttribute('aria-label', 'Filter recipes by crafting station');
    els.craftList = el('div', 'craft-list', craftPanel);
    els.craftEmpty = el('p', 'craft-empty', craftPanel);

    els.gearNote = el('p', 'gear-note', els.screen.querySelector('.equip-panel'));

    // The controls, in the one screen every player is told how to open. Three keys had
    // been added - the hook, sound, music - with no way for anybody to discover them.
    if (controls && controls.length) {
      const keysPanel = el('div', 'panel keys-panel', els.screen);
      el('h2', null, keysPanel).textContent = 'Controls';
      const list = el('div', 'keys', keysPanel);
      for (const [key, what] of controls) {
        const row = el('div', 'keys-row', list);
        el('kbd', null, row).textContent = key;
        el('span', null, row).textContent = what;
      }
    }

    // Active buffs. An effect with a clock on it has to show the clock, or the player
    // cannot tell a potion about to run out from one that just started. They sit down
    // the left rather than under the hearts, because the top right already has the
    // hearts and the map in it and a third thing there is a collision.
    els.buffs = el('div', 'buffs', root);

    els.bar = el('div', 'hotbar', root);
    els.hotbarSlots = [];
    const hotbar = inventory.section('hotbar');
    for (let i = hotbar.from; i < hotbar.to; i += 1) {
      const node = buildSlot(i, els.bar);
      el('span', 'key', node).textContent = String((i - hotbar.from + 1) % 10);
      els.hotbarSlots.push(node);
    }

    els.held = el('div', 'held', root);
    addEventListener('mousemove', (ev) => {
      els.held.style.transform = 'translate(' + (ev.clientX + 12) + 'px,' + (ev.clientY + 12) + 'px)';
    });
    return els;
  }

  // The tooltip. A floating panel rather than the browser's `title`, which waits a
  // second, cannot be styled and shows only one line - and by now most of what an item
  // does is in the lines underneath the name.
  function ensureTip() {
    if (els.tip) return els.tip;
    els.tip = el('div', 'tip', root);
    els.tipName = el('strong', 'tip-name', els.tip);
    els.tipBody = el('span', 'tip-body', els.tip);
    els.tip.style.display = 'none';
    return els.tip;
  }

  function showTip(item, x, y) {
    if (!item || !craft) { hideTip(); return; }
    const tip = ensureTip();
    const said = craft.describe(item.key, tiles);
    els.tipName.textContent = said.name;
    els.tipBody.textContent = said.lines.join('\n');
    tip.style.display = 'block';
    // Kept inside the window: a tooltip that runs off the right edge is worse than none.
    const w = tip.offsetWidth || 180;
    const h = tip.offsetHeight || 60;
    tip.style.left = Math.min(x + 14, window.innerWidth - w - 8) + 'px';
    tip.style.top = Math.max(6, Math.min(y + 16, window.innerHeight - h - 8)) + 'px';
  }

  function hideTip() {
    if (els.tip) els.tip.style.display = 'none';
  }

  // Every slot in the game reports what it is holding, wherever it lives.
  function watchSlot(node, pick) {
    node.addEventListener('mousemove', (ev) => showTip(pick(), ev.clientX, ev.clientY));
    node.addEventListener('mouseleave', hideTip);
  }

  function paintSlot(node, index) {
    const item = inventory.slots[index];
    const icon = node.querySelector('.icon');
    const count = node.querySelector('.count');
    if (node.dataset.key !== (item ? item.key : '')) {
      icon.textContent = '';
      if (item) icon.appendChild(iconFor(item, 30));
      node.dataset.key = item ? item.key : '';
      node.title = '';
    }
    count.textContent = item && item.count > 1 ? String(item.count) : '';
    node.classList.toggle('filled', !!item);
  }

  function paintBuffs(state) {
    if (!els.buffs) return;
    const list = (state && state.buffs) || [];
    const signature = list.map(b => b.key + Math.ceil(b.seconds)).join(',');
    if (els.buffs.dataset.sig === signature) return;
    els.buffs.dataset.sig = signature;
    els.buffs.textContent = '';
    for (const entry of list) {
      const node = el('span', 'buff', els.buffs);
      node.style.borderColor = entry.spec.colour;
      el('span', 'buff-dot', node).style.background = entry.spec.colour;
      const secs = Math.ceil(entry.seconds);
      const clock = secs >= 60 ? Math.ceil(secs / 60) + 'm' : secs + 's';
      el('span', null, node).textContent = entry.spec.name + ' ' + clock;
      node.title = entry.spec.text;
    }
  }

  function meter(node, filled, total, kind) {
    if (node.childElementCount !== total) {
      node.textContent = '';
      for (let i = 0; i < total; i += 1) el('span', 'pip ' + kind, node);
    }
    const pips = node.children;
    for (let i = 0; i < pips.length; i += 1) {
      const amount = Math.max(0, Math.min(1, filled - i));
      pips[i].style.setProperty('--fill', (amount * 100).toFixed(1) + '%');
      pips[i].classList.toggle('empty', amount <= 0);
    }
  }

  // Rebuilt only when what it would show actually changes. Rebuilding every frame looked
  // fine but detached every row from under the cursor, so a click could land on an element
  // that no longer existed; the signature below is what makes a click reliable.
  function paintCrafting(state) {
    if (!craft || !els.craftList) return;
    const stations = (state && state.stations) || new Set();
    const stationList = Array.from(stations).sort();
    const filterKey = stationList.join(',');
    if (els.craftFilter.dataset.stations !== filterKey) {
      const previous = els.craftFilter.value;
      els.craftFilter.dataset.stations = filterKey;
      els.craftFilter.textContent = '';
      for (const [value, label] of [['all', 'All nearby stations'], ['hand', 'By hand'],
        ...stationList.map(key => [key, tiles.BY_KEY[key]?.name || key])]) {
        const option = el('option', null, els.craftFilter);
        option.value = value;
        option.textContent = label;
      }
      els.craftFilter.value = stationList.includes(previous) || previous === 'hand' ? previous : 'all';
    }
    const filter = els.craftFilter.value;
    const matchesStation = recipe => filter === 'all' || (recipe.station || 'hand') === filter;
    const list = craft.available(inventory, stations).filter(matchesStation);
    const signature = filterKey + '|' + filter + '|' + list.map(r => r.out.key + 'x' + r.out.count).join(',');
    if (signature === craftSignature) return;
    craftSignature = signature;

    const names = Array.from(stations).map(key => tiles.BY_KEY[key]?.name || key);
    els.craftStations.textContent = names.length
      ? 'At: ' + names.join(', ')
      : 'No station in reach \u2014 by hand only';

    els.craftList.textContent = '';
    craftRows = [];
    for (const recipe of list) {
      const row = el('button', 'craft-row', els.craftList);
      row.appendChild(iconFor(recipe.out, 30));
      const text = el('span', 'craft-text', row);
      const title = el('span', 'craft-name', text);
      title.textContent = craft.nameOf(recipe.out.key, tiles)
        + (recipe.out.count > 1 ? ' \u00d7' + recipe.out.count : '');
      const cost = el('span', 'craft-cost', text);
      cost.textContent = recipe.need
        .map(([key, count]) => count + ' ' + craft.nameOf(key, tiles))
        .join(', ');
      row.addEventListener('mousedown', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (onCraft) onCraft(recipe);
      });
      craftRows.push(row);
    }
    const total = craft.atStation(stations).filter(matchesStation).length;
    els.craftEmpty.textContent = list.length
      ? ''
      : (total ? 'Nothing you can afford yet.' : 'Find or place a station.');
  }

  // What the worn equipment is doing, in words. Armour that silently changes a number is
  // armour the player cannot reason about.
  function paintGear(state) {
    if (!els.gearNote || !craft) return;
    const gear = state && state.gear;
    if (!gear) { els.gearNote.textContent = ''; return; }
    const lines = [];
    lines.push('Defence ' + gear.defense);
    if (gear.bonus) lines.push('Set: ' + gear.bonus.name + ' \u2014 ' + gear.bonus.text);
    if (gear.speed !== 1) lines.push('Speed ' + Math.round(gear.speed * 100) + '%');
    if (gear.power !== 1) lines.push('Mining ' + Math.round(gear.power * 100) + '%');
    if (gear.doubleJump) lines.push('Double jump');
    if (gear.flight) lines.push('Flight ' + (gear.flight + gear.flightBonus).toFixed(2) + 's');
    else if (gear.flightBonus) lines.push('Wing flight bonus +' + gear.flightBonus + 's');
    if (gear.fireproof) lines.push('Fireproof');
    else if (gear.lavaDamage !== 1) lines.push('Lava damage x' + gear.lavaDamage);
    if (gear.breathMul !== 1) {
      lines.push(gear.breathMul === Infinity ? 'Breathes water'
        : 'Breath x' + gear.breathMul);
    }
    if (gear.fallMul !== 1) lines.push('Falls x' + gear.fallMul);
    if (gear.glow) lines.push('Glowing');
    // The three damage classes and the two numbers that decide whether magic is worth
    // using. Four armour sets and a dozen accessories exist only to change these, and
    // none of them showed up here at all.
    if (gear.melee !== 1) lines.push('Melee ' + Math.round(gear.melee * 100) + '%');
    if (gear.ranged !== 1) lines.push('Ranged ' + Math.round(gear.ranged * 100) + '%');
    if (gear.magic !== 1) lines.push('Magic ' + Math.round(gear.magic * 100) + '%');
    if (gear.meleeReach) lines.push('Melee reach +' + Number(gear.meleeReach.toFixed(2)) + ' tiles');
    if (gear.spiritReach) lines.push('Spirit reach +' + gear.spiritReach + ' tiles');
    if (gear.throwSpeed !== 1) lines.push('Throw speed ' + Math.round(gear.throwSpeed * 100) + '%');
    if (gear.spiritInterval !== 1) lines.push('Spirit attack interval ' + Math.round(Math.max(0.6, gear.spiritInterval) * 100) + '%');
    if (gear.throwBlast !== 1) lines.push('Throwing blast radius ' + Math.round(gear.throwBlast * 100) + '%');
    if (gear.thrower !== 1) lines.push('Thrower ' + Math.round(gear.thrower * 100) + '%');
    if (gear.summoner !== 1) lines.push('Summoner ' + Math.round(gear.summoner * 100) + '%');
    if (gear.manaCost !== 1) lines.push('Mana cost ' + Math.round(gear.manaCost * 100) + '%');
    if (gear.manaRegen !== 1) lines.push('Mana returns ' + Math.round(gear.manaRegen * 100) + '%');
    if (gear.arrowSpeed !== 1) lines.push('Arrows ' + Math.round(gear.arrowSpeed * 100) + '%');
    if (gear.swing !== 1) lines.push('Swing ' + Math.round(gear.swing * 100) + '%');
    if (gear.pickup !== 1) lines.push('Reach for drops ' + Math.round(gear.pickup * 100) + '%');
    if (gear.slimeFriend) lines.push('Slimes ignore you');
    // Health regeneration: the Gilded set bonus and the Blood Charm both change it, and
    // both were doing so silently.
    if (gear.regen !== 1) lines.push('Healing ' + Math.round(gear.regen * 100) + '%');
    els.gearNote.textContent = lines.join('  \u00b7  ');
  }

  function paintShop() {
    if (!els.shopPanel) return;
    els.shopPanel.classList.toggle('visible', !!shop);
    if (!shop || shop === paintedShop) return;
    paintedShop = shop;
    els.shopName.textContent = shop.who.spec.name.replace(/^the /, '');
    const discount = Math.round((1 - shop.discount) * 100);
    els.shopPurse.textContent = shop.coins.toLocaleString() + ' copper value'
      + (discount ? ' · ' + discount + '% town discount' : '');
    els.shopList.textContent = '';
    if (shop.quest) {
      const row = el('button', 'craft-row', els.shopList);
      el('span', 'craft-name', row).textContent = 'A Road Through the Deepwood';
      row.addEventListener('click', ev => {
        ev.preventDefault();
        ev.stopPropagation();
        shop.quest();
      });
    }
    shop.who.spec.stock.forEach((entry, i) => {
      const row = el('button', 'craft-row', els.shopList);
      row.appendChild(iconFor({ key: entry.key, kind: craft.kindOf(entry.key) }, 30));
      const text = el('span', 'craft-text', row);
      el('span', 'craft-name', text).textContent = craft.nameOf(entry.key, tiles)
        + (entry.count > 1 ? ' \u00d7' + entry.count : '');
      const cost = el('span', 'craft-cost', text);
      const price = Math.ceil(entry.price * shop.discount);
      cost.textContent = price.toLocaleString() + ' coin';
      if (shop.coins < price) row.classList.add('unaffordable');
      row.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (onBuy) onBuy(i);
      });
    });
    if (shop.who.spec.heals) {
      const row = el('button', 'craft-row', els.shopList);
      const text = el('span', 'craft-text', row);
      el('span', 'craft-name', text).textContent = 'Heal me';
      el('span', 'craft-cost', text).textContent =
        shop.who.spec.healPrice.toLocaleString() + ' coin';
      row.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (onHeal) onHeal();
      });
    }
    els.shopNote.textContent = shop.who.spec.greeting;
  }

  function paintChest() {
    if (!els.chestPanel) return;
    els.chestPanel.classList.toggle('visible', !!chest);
    if (!chest) return;
    for (let i = 0; i < els.chestSlots.length; i += 1) {
      const node = els.chestSlots[i];
      const item = chest.items[i];
      node.textContent = '';
      node.classList.toggle('filled', !!item);
      if (!item) continue;
      node.appendChild(iconFor(item, 30));
      if (item.count > 1) {
        const n = el('span', 'count', node);
        n.textContent = String(item.count);
      }
    }
  }

  function sync(state) {
    // Buffs are painted whether or not the backpack is open: they belong to the heads-up
    // display, not to the inventory screen.
    paintBuffs(state);
    for (let i = 0; i < els.hotbarSlots.length; i += 1) {
      paintSlot(els.hotbarSlots[i], inventory.section('hotbar').from + i);
    }
    if (open) {
      for (let i = 0; i < els.backpackSlots.length; i += 1) {
        paintSlot(els.backpackSlots[i], inventory.section('main').from + i);
      }
      for (let i = 0; i < els.equipSlots.length; i += 1) {
        paintSlot(els.equipSlots[i], Number(els.equipSlots[i].dataset.index));
      }
      paintSlot(els.trashSlot, inventory.section('trash').from);
      paintCrafting(state);
      paintChest();
      paintGear(state);
      paintShop();
    }
    const held = inventory.held;
    els.held.textContent = '';
    els.held.classList.toggle('visible', !!held);
    if (held) {
      els.held.appendChild(iconFor(held, 30));
      if (held.count > 1) {
        const n = el('span', 'count', els.held);
        n.textContent = String(held.count);
      }
    }
    if (!state) return;
    const { stats, player } = state;
    meter(els.hearts, stats.health / 20, Math.ceil(stats.maxHealth / 20), 'heart');
    meter(els.stars, stats.mana / 20, Math.ceil(stats.maxMana / 20), 'star');
    const air = stats.breath === undefined ? 1 : stats.breath;
    els.breath.classList.toggle('visible', air < 0.999);
    meter(els.breath, air * 6, 6, 'bubble');
    for (let i = 0; i < els.hotbarSlots.length; i += 1) {
      els.hotbarSlots[i].classList.toggle('active', i === player.selected);
    }
  }

  function setOpen(value) {
    hideTip();
    open = value;
    craftSignature = null;
    els.screen.classList.toggle('visible', open);
    sync();
  }

  function toggle() {
    if (townOpen) { closeTown(); return open; }
    setOpen(!open);
    return open;
  }

  return { build, sync, toggle, setOpen, itemArt, showTown, closeTown, get isOpen() { return open || townOpen; }, get townOpen() { return townOpen; },
    setField(key, text) { if (els[key] && els[key].textContent !== text) els[key].textContent = text; },
    setMessage(text) { if (els.message && els.message.textContent !== text) els.message.textContent = text; },
    set onCraft(fn) { onCraft = fn; },
    set onChestMove(fn) { onChestMove = fn; },
    set onBuy(fn) { onBuy = fn; },
    set onHeal(fn) { onHeal = fn; },
    set onSelectHotbar(fn) { onSelectHotbar = fn; },
    openShop(who, purse) { shop = { who, coins: purse.coins, discount: purse.discount || 1, quest: purse.quest }; },
    closeShop() { shop = null; },
    openChest(box) {
      chest = box;
      els.chestTitle.textContent = box.cargo ? 'Cargo Hold' : 'Chest';
      craftSignature = null;
    },
    closeChest() { chest = null; },
    get chest() { return chest; },
    CHEST_SLOTS };
}

// The module's public surface, declared once. index.html used to repeat these
// names by hand, and three separate times a new export was added here and
// forgotten there, which broke the game at runtime while every test passed.
const EXPORTS_ui = { makeUI };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXPORTS_ui;
} else if (typeof FATHOM !== 'undefined') {
  FATHOM.ui = EXPORTS_ui;
}
