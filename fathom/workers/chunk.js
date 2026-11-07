'use strict';
// A separate generator cache keeps speculative chunks off the frame loop.
importScripts('../js/registry.js', '../js/rng.js', '../js/noise.js', '../js/tiles.js?v=highlands-expansion-1', '../js/worldgen.js?v=savanna-expansion-1');
self.onmessage = ({ data: { seed, cx, cy } }) => {
  const chunk = FATHOM.worldgen.generateChunk(seed, cx, cy);
  self.postMessage(chunk, [chunk.tiles.buffer, chunk.walls.buffer]);
};
