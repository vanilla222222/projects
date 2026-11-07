'use strict';
const assert = require('node:assert/strict');
const { makeTerrainGL } = require('../js/webgl.js');

assert.equal(makeTerrainGL({ createElement: () => ({ getContext: () => null }) }, {}), null);
let count = 0, uploaded, lost = false;
const handlers = {};
const methods = {
  createShader: () => ({}), getShaderParameter: () => true,
  createProgram: () => ({}), getProgramParameter: () => true, createBuffer: () => ({}), createTexture: () => ({}),
  getParameter: () => 8192, getError: () => 0, getUniformLocation: () => ({}),
  isContextLost: () => lost,
  bufferData: (_, vertices) => { uploaded = vertices.slice(); },
  drawArrays: (_, start, vertices) => { assert.equal(start, 0); count += vertices; }
};
const gl = new Proxy(methods, { get: (obj, key) => key in obj ? obj[key] : key === 'NO_ERROR' ? 0 : () => {} });
const canvas = { getContext(type) { assert.equal(type, 'webgl2'); return gl; }, addEventListener(event, fn) { handlers[event] = fn; } };
const atlas = { width: 192, height: 2048 };
const renderer = makeTerrainGL({ createElement: () => canvas }, atlas);
assert.ok(renderer.begin(800, 600));
renderer.painter.fillStyle = '#ff8000';
renderer.painter.fillRect(1, 2, 10, 20);
renderer.painter.drawImage(atlas, 16, 32, 16, 16, 10, 20, 32, 32);
renderer.painter.surfaceShade(0, 0, 8, 10);
assert.equal(renderer.end(), 3);
assert.equal(count, 18);
assert.deepEqual([...uploaded.slice(0, 4)], [1, 2, -1, -1]);
assert.ok(Math.abs(uploaded[48 + 2] - 16 / 192) < 1e-6);
assert.equal(uploaded[96 + 7], 0);
assert.ok(uploaded[96 + 16 + 7] > .4);
lost = true;
handlers.webglcontextlost({ preventDefault() {} });
assert.equal(renderer.begin(800, 600), false);
console.log('WebGL batching, UVs, gradients and context-loss fallback passed');
