'use strict';

const RNG = (() => {
  let _seed = 0;
  let _state = 0;

  function mulberry32(state) {
    return function () {
      state |= 0; state = (state + 0x6D2B79F5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  let _next = mulberry32(1);

  function seed(intSeed) {

    _seed = (intSeed >>> 0) || 1;
    _state = _seed;
    _next = mulberry32(_state);
    return _seed;
  }

  function random() {
    return _next();
  }

  function int(min, max) {

    return Math.floor(random() * (max - min + 1)) + min;
  }

  function pick(arr) {
    if (!arr || !arr.length) return undefined;
    return arr[Math.floor(random() * arr.length)];
  }

  function hashString(str) {
    str = String(str);
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  function randomSeed() {

    const a = Math.floor(Math.random() * 0xffffffff);
    const b = Date.now() & 0xffffffff;
    return (a ^ b) >>> 0;
  }

  function seedToString(intSeed) {
    return (intSeed >>> 0).toString(36);
  }

  function currentSeed() {
    return _seed;
  }

  seed(randomSeed());

  return {
    seed,
    reseed: seed,
    random,
    int,
    pick,
    hashString,
    randomSeed,
    seedToString,
    currentSeed,
  };
})();
