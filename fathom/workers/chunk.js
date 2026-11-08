'use strict';
// A separate generator cache keeps speculative chunks off the frame loop.
importScripts('../js/registry.js', '../js/rng.js?v=boss-armories-1', '../js/noise.js', '../js/tiles.js?v=boss-armories-1', '../js/worldgen.js?v=boss-armories-1');
let activeKey;
let activeSeed;
self.onmessage = ({ data: { seed, cx, cy, settings } }) => {
  const key = seed + ':' + JSON.stringify(settings || {});
  if (key !== activeKey) {
    activeKey = key;
    activeSeed = FATHOM.worldgen.generationSeed(seed, settings);
  }
  const chunk = FATHOM.worldgen.generateChunk(activeSeed, cx, cy);
  self.postMessage(chunk, [chunk.tiles.buffer, chunk.walls.buffer]);
};
