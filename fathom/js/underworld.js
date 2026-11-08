'use strict';

const UNDERWORLD_TILES = typeof require === 'function' ? require('./tiles.js') : FATHOM.tiles;
const UNDERWORLD_RNG = typeof require === 'function' ? require('./rng.js') : FATHOM.rng;

function makeUnderworldGenerator(overworld) {
  const { UNDERWORLD_BIOMES: biomes, idOf, wallIdOf, cellOf, AIR } = UNDERWORLD_TILES;
  const { CHUNK } = overworld;
  const { unit } = UNDERWORLD_RNG;
  const surface = overworld.SEA_LEVEL;
  const bandWidth = 360;
  const water = idOf('water'), lava = idOf('lava');
  const returnGate = idOf('underworld-return');
  const caveProfiles = {
    ashwood: [0.11, 0.064, 1.23, 1.7],
    'glass-dunes': [0.07, 0.094, 1.38, 1.72],
    'brine-depths': [0.10, 0.048, 1.27, 1.52],
    'ember-bloom': [0.054, 0.115, 1.37, 1.74],
    'gloom-frost': [0.145, 0.041, 1.48, 1.82]
  };
  const landmarkDecor = { ashwood: 'ashwood-platform', 'glass-dunes': 'glass', 'brine-depths': 'brine-depths-platform',
    'ember-bloom': 'ember-bloom-platform', 'gloom-frost': 'gloom-frost-platform' };
  const layerAt = y => y < surface + 42 ? overworld.LAYERS.find(layer => layer.key === 'surface')
    : y < surface + 185 ? overworld.LAYERS.find(layer => layer.key === 'caves')
    : overworld.LAYERS.find(layer => layer.key === 'deep');

  function biomeAt(seed, x) {
    const band = Math.floor((x + bandWidth / 2) / bandWidth);
    const direction = unit(seed, 0, 0, 8511) < 0.5 ? -1 : 1;
    return biomes[((band * direction) % biomes.length + biomes.length) % biomes.length];
  }

  function surfaceHeight(seed, x) {
    if (Math.abs(x) < 18) return surface;
    const biome = biomeAt(seed, x);
    const amplitude = { ashwood: 8, 'glass-dunes': 18, 'brine-depths': 7, 'ember-bloom': 22, 'gloom-frost': 13 }[biome.key];
    const offset = biome.key === 'brine-depths' ? 13 : 0;
    const valley = Math.sin(x * 0.027) * amplitude + Math.sin(x * 0.083) * amplitude * 0.25;
    const basin = Math.max(0, Math.sin(x * 0.035 - 1.2) - 0.6) * 32;
    return surface + offset + Math.round(valley + basin);
  }

  function siteAt(seed, x, y) {
    const band = Math.floor((x + bandWidth / 2) / bandWidth);
    const layer = y < surface + 50 ? 0 : y < surface + 175 ? 1 : 2;
    const center = band * bandWidth + (layer === 0 ? 84 : layer === 1 ? -76 : 24);
    const floor = layer === 0 ? surfaceHeight(seed, center) + 1 : surface + (layer === 1 ? 103 : 237);
    const height = 9 + layer * 3;
    if (Math.abs(x - center) > 10 || y < floor - height + 1 || y > floor) return null;
    const biome = biomeAt(seed, center);
    return { x: center, top: floor - height + 1, floor, height, layer, biome: biome.key, name: biome.structures[layer],
      mimic: layer === 2 && Math.abs(band) % 2 === 1 };
  }

  function structureTile(site, x, y) {
    const dx = x - site.x, depth = y - site.floor;
    if (depth === 0 || (y === site.top + Math.floor(Math.abs(dx) / 5))) return idOf(site.biome + '-stone');
    if (Math.abs(dx) === 10 && depth < -4) return idOf(site.biome + '-wood');
    if (dx >= 5 && dx <= 6 && depth >= -2) {
      const key = site.mimic ? 'forest-mimic' : site.layer === 2 ? 'goldchest' : 'woodchest';
      return cellOf(key, dx - 5, depth + 2).id;
    }
    if ((dx === -6 || dx === 2) && depth === -4) return idOf('lantern');
    if (dx === 0 && depth === -1) return idOf(site.layer ? 'underworld-shrine' : 'campfire');
    if (site.layer && Math.abs(dx) >= 4 && Math.abs(dx) <= 7 && depth === -6) return idOf(landmarkDecor[site.biome]);
    if (site.biome === 'gloom-frost' && Math.abs(dx) >= 8 && depth === -2) return idOf('glacier-spikes');
    if (site.biome === 'ember-bloom' && Math.abs(dx) === 8 && depth === -3) return idOf('lantern');
    return AIR;
  }

  function baseTileAt(seed, x, y) {
    if (Math.abs(x) <= 11 && y >= surface - 5 && y <= surface) {
      if (y === surface) return idOf('ashwood-stone');
      if (x === 0 && y === surface - 1) return returnGate;
      if ((x === -8 || x === 8) && y === surface - 3) return idOf('lantern');
      return AIR;
    }
    const biome = biomeAt(seed, x);
    const floor = surfaceHeight(seed, x);
    const site = siteAt(seed, x, y);
    if (site) return structureTile(site, x, y);
    const depth = y - floor;
    if (depth < 0) {
      if (Math.abs(x) >= 22 && biome.key === 'ember-bloom' && y >= surface + 10) return lava;
      if (Math.abs(x) >= 22 && y >= surface + (biome.key === 'brine-depths' ? 5 : 12)) return water;
      if (Math.abs(x) < 22 || depth < -13) return AIR;
      const center = Math.round(x / 13) * 13;
      if (biomeAt(seed, center) !== biome || unit(seed, center, 0, 8517) > (biome.key === 'glass-dunes' ? 0.23 : 0.68)) return AIR;
      const treeFloor = surfaceHeight(seed, center);
      const height = 4 + Math.floor(unit(seed, center, 0, 8521) * (biome.key === 'ember-bloom' ? 9 : 5));
      const top = treeFloor - height;
      if (x === center && y >= top && y < treeFloor) return idOf(biome.key + '-wood');
      if (Math.abs(x - center) + Math.abs(y - top) <= (biome.key === 'ashwood' ? 2 : 3)) return idOf(biome.key + '-leaves');
      return AIR;
    }
    if (depth === 0) return idOf(biome.key + '-grass');
    if (depth < 5) return idOf(biome.key + '-soil');
    const [width, steepness, tunnel, room] = caveProfiles[biome.key];
    const wave = Math.sin(x * width + y * steepness) + Math.sin(x * 0.041 - y * 0.132);
    const chamber = Math.sin(x * 0.026 + y * 0.028) + Math.sin(x * 0.057 - y * 0.047);
    if (depth > 9 && (wave > tunnel || chamber > room)) {
      if (depth > 70 && wave > 1.7 && biome.key === 'ember-bloom') return lava;
      if (depth > 42 && chamber > Math.min(1.93, room + 0.09)) {
        return biome.key === 'ember-bloom' ? lava : water;
      }
      return AIR;
    }
    if (depth > 13 && unit(seed, Math.floor(x / 3), Math.floor(y / 3), 8541) < 0.115) return idOf(biome.key + '-ore');
    return idOf(biome.key + '-stone');
  }

  function baseWallAt(seed, x, y) {
    return siteAt(seed, x, y) || y >= surfaceHeight(seed, x)
      ? wallIdOf(biomeAt(seed, x).key + '-wall') : 0;
  }

  function baseContainerAt(seed, x, y) {
    const site = siteAt(seed, x, y);
    if (!site || site.mimic || x !== site.x + 5 || y !== site.floor - 2) return null;
    return [
      { key: site.biome + '-ore', kind: 'block', count: 3 + site.layer * 4 },
      { key: 'torch', kind: 'block', count: 10 + site.layer * 5 },
      { key: 'coin', kind: 'loot', count: 350 + site.layer * 300 }
    ];
  }

  function generateChunk(seed, cx, cy) {
    const tiles = new Uint16Array(CHUNK * CHUNK), walls = new Uint16Array(CHUNK * CHUNK);
    for (let i = 0; i < tiles.length; i += 1) {
      const x = cx * CHUNK + i % CHUNK, y = cy * CHUNK + Math.floor(i / CHUNK);
      tiles[i] = baseTileAt(seed, x, y);
      walls[i] = baseWallAt(seed, x, y);
    }
    return { tiles, walls };
  }

  const absent = () => null;
  return { ...overworld, realm: 'underworld', BIOMES: biomes, layerAt, biomeAt, surfaceHeight,
    generateChunk, baseTileAt, baseWallAt, baseContainerAt, biomeSiteAt: siteAt, BIOME_SITE_SPACING: bandWidth,
    biomeSitesForSlot: (seed, slot) => {
      const center = slot * bandWidth;
      return [siteAt(seed, center + 84, surfaceHeight(seed, center + 84)),
        siteAt(seed, center - 76, surface + 102), siteAt(seed, center + 24, surface + 236)].filter(Boolean);
    },
    bandWidth, baseLevelAt: () => 0, starterForestEdge: () => 18, dungeonLayout: absent, archiveLayout: absent, runawayMineLayout: absent,
    dungeonAt: absent, archiveAt: absent, foundryAt: absent, runawayMineAt: absent, ashvaultAt: absent,
    chapterArmoryAt: absent, chapterArmories: () => [], siegeAt: absent,
    weatherAt: (seed, time, key) => ({ rain: 0, snow: key === 'gloom-frost' ? 0.65 : 0,
      wind: Math.sin(time * 0.13 + Number(seed)) * (key === 'glass-dunes' ? 0.85 : 0.24) })
  };
}

const EXPORTS_underworld = { makeUnderworldGenerator };
if (typeof module !== 'undefined' && module.exports) module.exports = EXPORTS_underworld;
else if (typeof FATHOM !== 'undefined') FATHOM.underworld = EXPORTS_underworld;
