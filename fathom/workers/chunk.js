'use strict';
// A separate generator cache keeps speculative chunks off the frame loop.
importScripts('../js/registry.js', '../js/rng.js?v=boss-armories-1', '../js/noise.js', '../js/tiles.js?v=underworld-campaign-1', '../js/worldgen.js?v=portal-trials-1', '../js/underworld.js?v=underworld-campaign-1');
const underworld = FATHOM.underworld.makeUnderworldGenerator(FATHOM.worldgen);
let activeKey;
let activeSeed;
self.onmessage = ({ data: { seed, cx, cy, settings, dimension } }) => {
  const key = seed + ':' + JSON.stringify(settings || {});
  if (key !== activeKey) {
    activeKey = key;
    activeSeed = FATHOM.worldgen.generationSeed(seed, settings);
  }
  const generator = dimension === 'underworld' ? underworld : FATHOM.worldgen;
  const chunk = generator.generateChunk(activeSeed, cx, cy);
  self.postMessage(chunk, [chunk.tiles.buffer, chunk.walls.buffer]);
};
