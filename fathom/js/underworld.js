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

  const campaign = UNDERWORLD_TILES.UNDERWORLD_CAMPAIGN;

  function campaignSite(seed, encounter) {
    const direction = biomeAt(seed, bandWidth) === biomes[1] ? 1 : -1;
    const stage = encounter.index % 3;
    const center = Math.floor(encounter.index / 3) * bandWidth;
    const x = direction * (center + [48, 110, bandWidth / 2][stage]);
    const floor = stage === 0 ? surfaceHeight(seed, x) + 1 : surface + (stage === 1 ? 74 : 124 + 17 * Math.floor(encounter.index / 3));
    const radius = 17 + stage * 2;
    return { encounter, x, floor, left: x - radius, right: x + radius, top: floor - 14 - stage * 2, bottom: floor };
  }

  function campaignSiteAt(seed, x, y) {
    if (x < -1650 || x > 1650 || y < surface - 55 || y > surface + 192) return null;
    const direction = biomeAt(seed, bandWidth) === biomes[1] ? 1 : -1;
    const leg = Math.floor((x * direction + 25) / bandWidth);
    if (leg < 0 || leg >= biomes.length) return null;
    for (let index = leg * 3; index < leg * 3 + 3; index += 1) {
      const site = campaignSite(seed, campaign[index]);
      if (x >= site.left && x <= site.right && y >= site.top && y <= site.bottom) return site;
    }
    return null;
  }

  function campaignTile(site, x, y) {
    const { encounter, floor, left, right, top } = site;
    const dx = x - site.x, depth = floor - y;
    const stage = encounter.index % 3;
    if (depth === 0 || y === top) return idOf(encounter.biome + '-stone');
    if (stage === 0 && Math.abs(dx) < 12 && y === top + 1 + Math.floor(Math.abs(dx) / 4)) {
      return idOf(encounter.biome + '-wood');
    }
    if ((x === left || x === right) && (depth > 5 || depth === 1)) return idOf(encounter.biome + '-wood');
    if (dx === 0 && depth === 1) return idOf('underworld-campaign-seal');
    if (Math.abs(dx) === 12 && depth === 2) return idOf('lantern');
    if (Math.abs(dx) >= 5 && Math.abs(dx) <= 9 && depth === 5 + stage) return idOf(landmarkDecor[encounter.biome]);
    if (stage === 1 && Math.abs(dx) === 14 && depth >= 1 && depth <= 4) return idOf(encounter.biome + '-stone');
    if (stage === 2 && Math.abs(dx) >= 12 && Math.abs(dx) <= 16 && depth === 10) return idOf(landmarkDecor[encounter.biome]);
    return AIR;
  }

  const dungeons = UNDERWORLD_TILES.UNDERWORLD_DUNGEONS;

  function dungeonSite(seed, encounter) {
    const direction = biomeAt(seed, bandWidth) === biomes[1] ? 1 : -1;
    const x = direction * (encounter.index * bandWidth - 125);
    const entrance = surfaceHeight(seed, x);
    const floor = surface + 88 + encounter.index * 16;
    const top = floor - 19;
    const depths = [[49, 32, 15], [52, 30, 11], [60, 40, 16], [53, 36, 13], [61, 44, 20]][encounter.index];
    const decks = depths.map(depth => top - depth);
    return { encounter, x, entrance, floor, top, bottom: floor, left: x - 18, right: x + 18,
      conduits: decks.map((y, index) => ({
        x: x + direction * (index % 2 === 0 ? 24 : -24), y: y - 1
      })),
      decks, cache: { x: x - direction * 27, y: decks[0] - 2 }, waystone: { x: x + 12, y: floor - 1 } };
  }

  function dungeonSiteAt(seed, x, y) {
    if (y < surface - 40 || y > surface + 152) return null;
    const direction = biomeAt(seed, bandWidth) === biomes[1] ? 1 : -1;
    const index = Math.round((x * direction + 125) / bandWidth);
    if (!dungeons[index] || Math.abs(x - direction * (index * bandWidth - 125)) > 32) return null;
    const site = dungeonSite(seed, dungeons[index]);
    const distance = Math.abs(x - site.x);
    if (y < site.entrance - 4 || y > site.floor) return null;
    if (y < site.top && distance > 5 && !site.decks.some(deck => y >= deck - 7 && y <= deck)) return null;
    if (y >= site.top && distance > 18) return null;
    return site;
  }

  function dungeonTile(site, x, y) {
    const { encounter, floor, entrance, top } = site;
    const dx = x - site.x;
    const distance = Math.abs(dx);
    const stone = idOf(encounter.biome + '-stone');
    if (y === entrance - 1 && dx === 3) return idOf('underworld-dungeon-tablet');
    if (y === entrance && distance >= 2 && distance <= 5) return stone;
    if (y === top && distance <= 1) return idOf('underworld-dungeon-lock');
    if (y < floor - 2 && distance <= 1) return dx === 0 && y >= entrance ? idOf('rope') : AIR;
    if (y < top) {
      const deck = site.decks.find(row => y >= row - 7 && y <= row);
      if (deck !== undefined) {
        if (distance === 32 || y === deck || y === deck - 7) return stone;
        if (x >= site.cache.x && x <= site.cache.x + 1 && y >= site.cache.y && y < site.cache.y + 2) {
          return cellOf('goldchest', x - site.cache.x, y - site.cache.y).id;
        }
        if (site.conduits.some(conduit => conduit.x === x && conduit.y === y)) return idOf('underworld-conduit');
        if (distance === 12 && y === deck - 4) return idOf('lantern');
        if (distance === 18 && y === deck - 2) return idOf(landmarkDecor[encounter.biome]);
        return AIR;
      }
      return y > entrance && distance >= 2 ? stone : AIR;
    }
    if (y === floor || y === top || distance === 18) return stone;
    if (dx === 0 && y === floor - 1) return idOf('underworld-campaign-seal');
    if (encounter.key === 'undertow-warden' && dx === -12 && y === floor - 1) return idOf('tidekeeper-cell');
    if (x === site.waystone.x && y === site.waystone.y) return idOf('underworld-waystone');
    if (distance === 10 && y === floor - 4) return idOf('lantern');
    if (distance >= 6 && distance <= 9 && y === floor - 7) return idOf(landmarkDecor[encounter.biome]);
    return AIR;
  }

  const ruinOffset = bandWidth * 2 + 143;

  function tidalRuin(seed) {
    const direction = biomeAt(seed, bandWidth) === biomes[1] ? 1 : -1;
    const x = direction * ruinOffset;
    const entrance = surfaceHeight(seed, x);
    const floor = entrance + 39;
    return { x, entrance, floor, hatch: { x, y: entrance - 1 },
      exit: { x: x - 8, y: floor - 1 }, archive: { x: x + 8, y: floor - 1 } };
  }

  function tidalTile(site, x, y) {
    const dx = x - site.x;
    const { entrance, floor } = site;
    const stone = idOf('brine-depths-stone');
    if (y === entrance - 1 && dx === 0) return idOf('tidal-hatch');
    if (y < entrance) return AIR;
    if (y === entrance || y === floor || y === floor - 12 || Math.abs(dx) === 12) return stone;
    if (y < floor - 12) return undefined;
    if (y === floor - 1 && x === site.exit.x) return idOf('tidal-exit');
    if (y === floor - 1 && x === site.archive.x) return idOf('tidal-archive');
    if (Math.abs(dx) === 5 && y === floor - 4) return idOf('lantern');
    if (Math.abs(dx) >= 4 && Math.abs(dx) <= 8 && y === floor - 6) return idOf('brine-depths-platform');
    return AIR;
  }

  function baseTileAt(seed, x, y) {
    if (Math.abs(x) <= 11 && y >= surface - 5 && y <= surface) {
      if (y === surface) return idOf('ashwood-stone');
      if (x === 0 && y === surface - 1) return returnGate;
      if (x === 5 && y === surface - 1) return idOf('underworld-waystone');
      if ((x === -8 || x === 8) && y === surface - 3) return idOf('lantern');
      return AIR;
    }
    if (Math.abs(Math.abs(x) - ruinOffset) <= 12 && y >= surface - 15 && y <= surface + 85) {
      const ruin = tidalRuin(seed);
      if (Math.abs(x - ruin.x) <= 12 && y >= ruin.entrance - 4 && y <= ruin.floor) {
        const tile = tidalTile(ruin, x, y);
        if (tile !== undefined) return tile;
      }
    }
    const biome = biomeAt(seed, x);
    const floor = surfaceHeight(seed, x);
    const dungeon = dungeonSiteAt(seed, x, y);
    if (dungeon) return dungeonTile(dungeon, x, y);
    const arena = campaignSiteAt(seed, x, y);
    if (arena) return campaignTile(arena, x, y);
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
    const dungeon = dungeonSiteAt(seed, x, y);
    if (dungeon && y >= dungeon.entrance) return wallIdOf(dungeon.encounter.biome + '-wall');
    const arena = campaignSiteAt(seed, x, y);
    if (arena) return wallIdOf(arena.encounter.biome + '-wall');
    return siteAt(seed, x, y) || y >= surfaceHeight(seed, x)
      ? wallIdOf(biomeAt(seed, x).key + '-wall') : 0;
  }

  function baseContainerAt(seed, x, y) {
    const dungeon = dungeonSiteAt(seed, x, y);
    if (dungeon && x === dungeon.cache.x && y === dungeon.cache.y) {
      const { biome, index } = dungeon.encounter;
      return [
        { key: biome + '-ore', kind: 'block', count: 6 + index * 2 },
        { key: biome + '-relic', kind: 'loot', count: 3 + index },
        { key: 'torch', kind: 'block', count: 12 }
      ];
    }
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
    campaignSiteAt, campaignSite, dungeonSiteAt, dungeonSite, tidalRuin,
    encounterSiteAt(seed, x, y) {
      const dungeon = dungeonSiteAt(seed, x, y);
      return dungeon && y >= dungeon.top ? dungeon : campaignSiteAt(seed, x, y);
    },
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

function brineTide(phase) {
  const cycle = (phase + 0.18) % 1;
  const low = cycle < 0.25;
  return { low, untilChange: (low ? 0.25 : 1) - cycle };
}

const EXPORTS_underworld = { makeUnderworldGenerator, brineTide };
if (typeof module !== 'undefined' && module.exports) module.exports = EXPORTS_underworld;
else if (typeof FATHOM !== 'undefined') FATHOM.underworld = EXPORTS_underworld;
