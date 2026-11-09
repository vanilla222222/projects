'use strict';
// Every module registers itself here, and index.html loads them as plain
// scripts in dependency order. No build step, no bundler, the same way chem lab
// works - open index.html and it runs.
//
// The registry exists because the alternative, each module reaching for the
// globals it wants, fails silently: a module that is renamed or reordered
// leaves `undefined` behind rather than an error, and the first symptom is
// wrong chemistry three layers away.
const RETRO = {};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = RETRO;
}
