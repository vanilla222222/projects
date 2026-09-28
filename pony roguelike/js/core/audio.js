'use strict';

const Sound = (() => {
  let ctx = null;
  let master = null;

  let musicGain = null;
  let sfxGain = null;
  let noiseBuffer = null;
  const BASE_VOLUME = 0.55;

  function loadMutePref(){
    try { return localStorage.getItem('nightfallMuted') === '1'; } catch (e) { return false; }
  }
  function saveMutePref(v){
    try { localStorage.setItem('nightfallMuted', v ? '1' : '0'); } catch (e) {  }
  }
  let muted = loadMutePref();

  function loadVolumePref(){
    try {
      const v = parseFloat(localStorage.getItem('nightfallVolume'));
      return isNaN(v) ? 1 : Util.clamp(v, 0, 1);
    } catch (e) { return 1; }
  }
  function saveVolumePref(v){
    try { localStorage.setItem('nightfallVolume', String(v)); } catch (e) {  }
  }
  let volume = loadVolumePref();

  function loadMusicVolumePref(){
    try {
      const v = parseFloat(localStorage.getItem('nightfallMusicVolume'));
      return isNaN(v) ? 1 : Util.clamp(v, 0, 1);
    } catch (e) { return 1; }
  }
  function saveMusicVolumePref(v){
    try { localStorage.setItem('nightfallMusicVolume', String(v)); } catch (e) {  }
  }
  let musicVolume = loadMusicVolumePref();

  function loadSfxVolumePref(){
    try {
      const v = parseFloat(localStorage.getItem('nightfallSfxVolume'));
      return isNaN(v) ? 1 : Util.clamp(v, 0, 1);
    } catch (e) { return 1; }
  }
  function saveSfxVolumePref(v){
    try { localStorage.setItem('nightfallSfxVolume', String(v)); } catch (e) {  }
  }
  let sfxVolume = loadSfxVolumePref();

  function ensureCtx(){
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : BASE_VOLUME * volume;

    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 2;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.15;
    master.connect(limiter);
    limiter.connect(ctx.destination);

    musicGain = ctx.createGain();
    musicGain.gain.value = musicVolume;
    musicGain.connect(master);
    sfxGain = ctx.createGain();
    sfxGain.gain.value = sfxVolume;
    sfxGain.connect(master);

    const len = ctx.sampleRate * 2;
    noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return ctx;
  }

  function unlock(){
    const c = ensureCtx();
    if (c && c.state === 'suspended') c.resume();
  }

  let reverbNode = null;
  function ensureReverb(c){
    if (reverbNode) return reverbNode;
    reverbNode = c.createConvolver();
    const len = Math.floor(c.sampleRate * 1.6);
    const impulse = c.createBuffer(2, len, c.sampleRate);

    const lpAlpha = 0.12;
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const raw = Math.random() * 2 - 1;
        lp += (raw - lp) * lpAlpha;
        data[i] = lp * Math.pow(1 - i / len, 2.2);
      }
    }
    reverbNode.buffer = impulse;
    reverbNode.connect(master);
    return reverbNode;
  }

  function routeOut(c, gainNode, opts){
    const pan = opts.pan || 0, reverbAmt = opts.reverb || 0, dest = opts.bus || sfxGain;
    let dry = gainNode;
    if (pan && c.createStereoPanner) {
      const p = c.createStereoPanner();
      p.pan.setValueAtTime(Util.clamp(pan, -1, 1), c.currentTime);
      gainNode.connect(p);
      dry = p;
    }
    dry.connect(dest);
    if (reverbAmt > 0) {
      const send = c.createGain();

      send.gain.value = Util.clamp(reverbAmt, 0, 1) * 0.35;
      gainNode.connect(send);
      send.connect(ensureReverb(c));
    }
  }

  const _periodicWaves = {};
  function periodicWave(c, name){
    if (_periodicWaves[name]) return _periodicWaves[name];
    let real, imag;
    if (name === 'bell') {

      const partials = [1, 2.01, 2.98, 4.2, 5.4, 6.8];
      const amps =     [1, 0.55, 0.35, 0.22, 0.14, 0.09];
      const top = Math.ceil(partials[partials.length - 1]) + 1;
      real = new Float32Array(top + 1); imag = new Float32Array(top + 1);
      partials.forEach((p, i) => { const h = Math.round(p); if (h > 0 && h < imag.length) imag[h] += amps[i]; });
    } else if (name === 'organ') {

      const harmonics = [1, 2, 3, 4, 6, 8];
      const amps =       [1, 0.5, 0.33, 0.25, 0.15, 0.1];
      real = new Float32Array(9); imag = new Float32Array(9);
      harmonics.forEach((h, i) => { imag[h] = amps[i]; });
    } else if (name === 'brass') {

      const n = 12;
      real = new Float32Array(n + 1); imag = new Float32Array(n + 1);
      for (let h = 1; h <= n; h++) imag[h] = (1 / h) * (h <= 4 ? 1 : 0.5);
    } else {
      return null;
    }
    const wave = c.createPeriodicWave(real, imag, { disableNormalization: false });
    _periodicWaves[name] = wave;
    return wave;
  }

  function suspend(){
    if (ctx && ctx.state === 'running') { try { ctx.suspend(); } catch (e) {  } }
  }
  function resume(){
    if (ctx && !muted && ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {  } }
  }

  function setMuted(v){
    muted = v;
    saveMutePref(v);
    if (master) master.gain.setTargetAtTime(muted ? 0 : BASE_VOLUME * volume, ctx.currentTime, 0.01);
  }
  function toggleMute(){ setMuted(!muted); return muted; }
  function isMuted(){ return muted; }

  function setVolume(v){
    volume = Util.clamp(v, 0, 1);
    saveVolumePref(volume);
    if (master && !muted) master.gain.setTargetAtTime(BASE_VOLUME * volume, ctx.currentTime, 0.01);
  }
  function getVolume(){ return volume; }

  function setMusicVolume(v){
    musicVolume = Util.clamp(v, 0, 1);
    saveMusicVolumePref(musicVolume);
    if (musicGain) musicGain.gain.setTargetAtTime(musicVolume, ctx.currentTime, 0.01);
  }
  function getMusicVolume(){ return musicVolume; }

  function setSfxVolume(v){
    sfxVolume = Util.clamp(v, 0, 1);
    saveSfxVolumePref(sfxVolume);
    if (sfxGain) sfxGain.gain.setTargetAtTime(sfxVolume, ctx.currentTime, 0.01);
  }
  function getSfxVolume(){ return sfxVolume; }

  function tone(freq, opts = {}){
    const c = ensureCtx(); if (!c) return;
    const {
      type = 'sine', dur = 0.15, gain = 0.3, attack = 0.005, release = 0.08,
      detune = 0, sweepTo = null, delay = 0, filterFreq = null, filterType = 'lowpass',
      pan = 0, reverb = 0, bus = null, vibrato = 0, vibratoDepth = 0,
    } = opts;
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const customWave = periodicWave(c, type);
    if (customWave) osc.setPeriodicWave(customWave); else osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (detune) osc.detune.setValueAtTime(detune, t0);
    if (sweepTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, sweepTo), t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + release);
    let tail = osc;
    if (filterFreq) {
      const f = c.createBiquadFilter();
      f.type = filterType; f.frequency.setValueAtTime(filterFreq, t0);
      osc.connect(f); tail = f;
    }
    tail.connect(g); routeOut(c, g, { pan, reverb, bus });

    let lfo = null;
    if (vibrato > 0 && vibratoDepth > 0) {
      lfo = c.createOscillator();
      lfo.frequency.value = vibrato;
      const lfoGain = c.createGain();
      lfoGain.gain.value = vibratoDepth;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.detune);
      lfo.start(t0);
    }
    osc.start(t0); osc.stop(t0 + dur + release + 0.05);
    if (lfo) lfo.stop(t0 + dur + release + 0.05);
  }

  function chord(freqs, opts = {}){
    const { stagger = 0.045, delay = 0, ...rest } = opts;
    freqs.forEach((f, i) => tone(f, { ...rest, delay: delay + i * stagger }));
  }

  function noise(opts = {}){
    const c = ensureCtx(); if (!c) return;
    const {
      dur = 0.15, gain = 0.3, attack = 0.002, release = 0.1,
      filterFreq = 1200, filterType = 'bandpass', filterQ = 1,
      filterSweepTo = null, delay = 0, pan = 0, reverb = 0, bus = null,
    } = opts;
    const t0 = c.currentTime + delay;
    const src = c.createBufferSource();
    src.buffer = noiseBuffer;
    const startOffset = Math.max(0, Math.random() * (noiseBuffer.duration - dur - 0.1));
    const f = c.createBiquadFilter();
    f.type = filterType; f.Q.value = filterQ;
    f.frequency.setValueAtTime(filterFreq, t0);
    if (filterSweepTo) f.frequency.exponentialRampToValueAtTime(Math.max(1, filterSweepTo), t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + release);
    src.connect(f); f.connect(g); routeOut(c, g, { pan, reverb, bus });
    src.start(t0, startOffset); src.stop(t0 + dur + release + 0.05);
  }

  function fm(carrierFreq, opts = {}){
    const c = ensureCtx(); if (!c) return;
    const {
      ratio = 2, index = 200, dur = 0.25, gain = 0.25, attack = 0.005, release = 0.18,
      delay = 0, pan = 0, reverb = 0, bus = null, carrierType = 'sine',
    } = opts;
    const t0 = c.currentTime + delay;
    const carrier = c.createOscillator();
    carrier.type = carrierType;
    carrier.frequency.setValueAtTime(carrierFreq, t0);
    const modulator = c.createOscillator();
    modulator.frequency.setValueAtTime(carrierFreq * ratio, t0);
    const modGain = c.createGain();
    modGain.gain.setValueAtTime(Math.max(1, index), t0);
    modGain.gain.exponentialRampToValueAtTime(1, t0 + dur);
    modulator.connect(modGain);
    modGain.connect(carrier.frequency);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + release);
    carrier.connect(g); routeOut(c, g, { pan, reverb, bus });
    carrier.start(t0); carrier.stop(t0 + dur + release + 0.05);
    modulator.start(t0); modulator.stop(t0 + dur + release + 0.05);
  }

  function pluck(freq, opts = {}){
    const c = ensureCtx(); if (!c) return;
    const { dur = 0.6, gain = 0.3, damping = 2200, decay = 0.988, delay = 0, pan = 0, reverb = 0, bus = null } = opts;
    const t0 = c.currentTime + delay;
    const period = 1 / Math.max(20, freq);
    const burst = c.createBufferSource();
    burst.buffer = noiseBuffer;
    const startOffset = Math.max(0, Math.random() * (noiseBuffer.duration - period - 0.1));
    const burstGain = c.createGain();
    burstGain.gain.setValueAtTime(gain, t0);
    burstGain.gain.setValueAtTime(0, t0 + period);
    const dly = c.createDelay(1);
    dly.delayTime.value = period;
    const damp = c.createBiquadFilter();
    damp.type = 'lowpass';
    damp.frequency.value = damping;
    const fb = c.createGain();
    fb.gain.value = decay;
    const outGain = c.createGain();
    outGain.gain.setValueAtTime(1, t0);
    outGain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    burst.connect(burstGain);
    burstGain.connect(dly);
    dly.connect(damp);
    damp.connect(fb);
    fb.connect(dly);
    damp.connect(outGain);
    routeOut(c, outGain, { pan, reverb, bus });
    burst.start(t0, startOffset); burst.stop(t0 + period + 0.02);

    setTimeout(() => { try { dly.disconnect(); damp.disconnect(); fb.disconnect(); outGain.disconnect(); } catch (e) {  } }, (delay + dur) * 1000 + 120);
  }

  function bass(freq, opts = {}){
    const c = ensureCtx(); if (!c) return;
    const {
      dur = 0.4, gain = 0.22, attack = 0.015, release = 0.2, delay = 0,
      pan = 0, reverb = 0, bus = null, filterFreq = 320, filterType = 'lowpass',
    } = opts;
    tone(freq, { type:'sine', dur, gain, attack, release, delay, pan, reverb, bus, filterFreq, filterType });
    tone(freq * 2, { type:'sine', dur, gain: gain * 0.22, attack, release, delay, pan, reverb, bus });
  }

  function perc(kind, opts = {}){
    const c = ensureCtx(); if (!c) return;
    const { gain = 1, delay = 0, pan = 0, reverb = 0, bus = null } = opts;
    if (kind === 'kick') {
      tone(120, { type:'sine', dur:0.08, gain:0.3 * gain, sweepTo:45, release:0.12, delay, pan, reverb, bus });
    } else if (kind === 'snare') {
      noise({ dur:0.06, gain:0.22 * gain, filterFreq:1800, filterType:'bandpass', release:0.08, delay, pan, reverb, bus });
      tone(200, { type:'triangle', dur:0.04, gain:0.08 * gain, release:0.05, delay, pan, bus });
    } else if (kind === 'hat') {
      noise({ dur:0.02, gain:0.12 * gain, filterFreq:7000, filterType:'highpass', release:0.03, delay, pan, reverb, bus });
    } else if (kind === 'bonehit') {

      pluck(700, { dur:0.1, gain:0.18 * gain, damping:550, decay:0.85, delay, pan, reverb, bus });
    }
  }

  function strings(freq, opts = {}){
    const c = ensureCtx(); if (!c) return;
    const {
      dur = 2, gain = 0.15, attack = 0.4, release = 1, delay = 0,
      pan = 0, reverb = 0, bus = null, voices = 5, detune = 9, type = 'sawtooth',
      filterFreq = 1800, filterType = 'lowpass',
    } = opts;
    const perVoiceGain = gain / Math.sqrt(voices);
    for (let i = 0; i < voices; i++) {
      const spread = voices === 1 ? 0 : (i / (voices - 1)) * 2 - 1;
      tone(freq, { type, dur, gain: perVoiceGain, attack, release, delay, pan, reverb, bus, detune: spread * detune, filterFreq, filterType });
    }
  }

  const MALLET_PARTIALS = [ { ratio:1, gain:1, decayMul:1 }, { ratio:3.0, gain:0.35, decayMul:0.55 }, { ratio:6.4, gain:0.12, decayMul:0.32 } ];
  function mallet(freq, opts = {}){
    const c = ensureCtx(); if (!c) return;
    const {
      dur = 0.5, gain = 0.22, attack = 0.002, release = 0.4, delay = 0,
      pan = 0, reverb = 0, bus = null, filterFreq = null, filterType = 'lowpass',
    } = opts;
    for (const p of MALLET_PARTIALS) {
      tone(freq * p.ratio, {
        type:'sine', dur: dur * p.decayMul, gain: gain * p.gain, attack, release: release * p.decayMul,
        delay, pan, reverb, bus, filterFreq, filterType,
      });
    }
  }

  function choir(freq, opts = {}){
    const c = ensureCtx(); if (!c) return;
    const { dur = 2, gain = 0.12, attack = 0.5, release = 1.2, delay = 0, pan = 0, reverb = 0, bus = null } = opts;
    tone(freq, { type:'sine', dur, gain: gain * 0.6, attack, release, delay, pan, reverb, bus });
    noise({ dur, gain: gain * 0.5, attack, release, filterFreq: freq * 4, filterType:'bandpass', filterQ:6, delay, pan, reverb, bus });
    noise({ dur, gain: gain * 0.3, attack, release, filterFreq: freq * 9, filterType:'bandpass', filterQ:8, delay, pan, reverb, bus });
  }

  function piano(freq, opts = {}){
    const c = ensureCtx(); if (!c) return;
    const {
      dur = 1.2, gain = 0.2, release = 1.0, delay = 0,
      pan = 0, reverb = 0, bus = null, filterFreq = 3200, filterType = 'lowpass',
    } = opts;
    noise({ dur:0.008, gain: gain * 0.35, attack:0.001, release:0.01, filterFreq:2500, filterType:'bandpass', delay, pan, bus });
    tone(freq, { type:'triangle', dur, gain, attack:0.004, release, delay, pan, reverb, bus, filterFreq, filterType });
    tone(freq * 2, { type:'sine', dur: dur * 0.6, gain: gain * 0.18, attack:0.004, release: release * 0.6, delay, pan, reverb, bus });
    tone(freq * 4, { type:'sine', dur: dur * 0.3, gain: gain * 0.06, attack:0.002, release: release * 0.3, delay, pan, bus });
  }

  function trumpet(freq, opts = {}){
    const c = ensureCtx(); if (!c) return;
    const {
      dur = 0.5, gain = 0.2, attack = 0.03, release = 0.15, delay = 0,
      pan = 0, reverb = 0, bus = null, vibrato = 5.5, vibratoDepth = 8,
    } = opts;
    noise({ dur:0.02, gain: gain * 0.22, attack:0.001, release:0.02, filterFreq: freq * 2, filterType:'bandpass', filterQ:4, delay, pan, bus });
    tone(freq * 0.92, { type:'brass', dur:0.05, gain: gain * 0.6, attack:0.005, sweepTo: freq, release:0.02, delay, pan, bus });
    tone(freq, { type:'brass', dur, gain, attack, release, delay: delay + 0.03, pan, reverb, bus, vibrato, vibratoDepth });
  }

  function zunpet(freq, opts = {}){
    const c = ensureCtx(); if (!c) return;
    const { dur = 0.3, gain = 0.18, delay = 0, pan = 0, reverb = 0, bus = null } = opts;
    fm(freq, { ratio:0.5, index:340, dur, gain, attack:0.008, release:0.12, delay, pan, reverb, bus, carrierType:'square' });
    tone(freq * 1.01, { type:'square', dur: dur * 0.8, gain: gain * 0.35, attack:0.01, release:0.1, delay, pan, bus, vibrato:14, vibratoDepth:40 });
  }

  function banjo(freq, opts = {}){
    const c = ensureCtx(); if (!c) return;
    const {
      dur = 0.35, gain = 0.2, damping = 3200, decay = 0.93, delay = 0,
      pan = 0, reverb = 0, bus = null,
    } = opts;
    noise({ dur:0.006, gain: gain * 0.3, attack:0.001, release:0.008, filterFreq:4500, filterType:'highpass', delay, pan, bus });
    pluck(freq, { dur, gain, damping, decay, delay, pan, reverb, bus });
  }

  function distortionCurve(amount){
    const k = amount, n = 256, curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
    }
    return curve;
  }
  function growl(freq, opts = {}){
    const c = ensureCtx(); if (!c) return;
    const {
      dur = 0.3, gain = 0.16, attack = 0.01, release = 0.12, delay = 0,
      drive = 6, filterFreq = 1400, detuneCents = 9,
      pan = 0, reverb = 0, bus = null,
    } = opts;
    const t0 = c.currentTime + delay;
    const shaper = c.createWaveShaper();
    shaper.curve = distortionCurve(drive);
    const filt = c.createBiquadFilter();
    filt.type = 'lowpass'; filt.frequency.setValueAtTime(filterFreq, t0);
    shaper.connect(filt);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + release);
    filt.connect(g); routeOut(c, g, { pan, reverb, bus });
    const stopAt = t0 + dur + release + 0.05;
    for (const det of [-detuneCents, detuneCents]) {
      const osc = c.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t0);
      osc.detune.setValueAtTime(det, t0);
      osc.connect(shaper);
      osc.start(t0); osc.stop(stopAt);
    }
  }

  function stab(freq, opts = {}){
    const c = ensureCtx(); if (!c) return;
    const {
      dur = 0.25, gain = 0.18, delay = 0, drive = 8, filterFreq = 2200,
      pan = 0, reverb = 0.12, bus = null,
    } = opts;
    const t0 = c.currentTime + delay;
    noise({ dur:0.03, gain: gain * 0.5, attack:0.001, release:0.05, filterFreq:5000, filterType:'highpass', delay, pan, bus });
    const shaper = c.createWaveShaper();
    shaper.curve = distortionCurve(drive);
    const filt = c.createBiquadFilter();
    filt.type = 'lowpass'; filt.frequency.setValueAtTime(filterFreq, t0);
    shaper.connect(filt);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.15);
    filt.connect(g); routeOut(c, g, { pan, reverb, bus });
    const stopAt = t0 + dur + 0.2;
    for (const ratio of [1, 1.5, 2]) {
      const osc = c.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq * ratio, t0);
      osc.connect(shaper);
      osc.start(t0); osc.stop(stopAt);
    }
  }

  function icechime(freq, opts = {}){
    const c = ensureCtx(); if (!c) return;
    const {
      dur = 1.1, gain = 0.14, attack = 0.01, release = 1.4, delay = 0,
      tremolo = 4.5, tremoloDepth = 0.35,
      pan = 0, reverb = 0.2, bus = null,
    } = opts;
    const t0 = c.currentTime + delay;
    noise({ dur:0.03, gain: gain * 0.25, attack:0.002, release:0.05, filterFreq:6000, filterType:'highpass', delay, pan, bus });
    const out = c.createGain();
    out.gain.setValueAtTime(1, t0);
    routeOut(c, out, { pan, reverb, bus });
    const lfo = c.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(tremolo, t0);
    const lfoGain = c.createGain();
    lfoGain.gain.value = tremoloDepth;
    lfo.connect(lfoGain); lfoGain.connect(out.gain);
    lfo.start(t0); lfo.stop(t0 + dur + release + 0.05);
    const partials = [{ ratio:1, g:1 }, { ratio:2.4, g:0.3 }];
    for (const p of partials) {
      const osc = c.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * p.ratio, t0);
      const g = c.createGain();
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(gain * p.g, t0 + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + release);
      osc.connect(g); g.connect(out);
      osc.start(t0); osc.stop(t0 + dur + release + 0.05);
    }
  }

  function harmonica(freq, opts = {}){
    const c = ensureCtx(); if (!c) return;
    const {
      dur = 0.4, gain = 0.16, attack = 0.02, release = 0.15, delay = 0,
      detuneCents = 12, filterFreq = null,
      pan = 0, reverb = 0, bus = null,
    } = opts;
    const bandpass = filterFreq || freq * 2.2;
    noise({ dur:0.015, gain: gain * 0.2, attack:0.001, release:0.02, filterFreq: freq * 1.5, filterType:'bandpass', filterQ:3, delay, pan, bus });
    tone(freq * 0.985, { type:'square', dur, gain: gain * 0.55, attack, release, sweepTo: freq, delay, pan, reverb, bus, filterFreq: bandpass, filterType:'bandpass' });
    tone(freq, { type:'square', dur, gain: gain * 0.5, attack, release, delay, pan, reverb, bus, filterFreq: bandpass, filterType:'bandpass', detune: detuneCents });
  }

  function flute(freq, opts = {}){
    const c = ensureCtx(); if (!c) return;
    const {
      dur = 0.5, gain = 0.16, attack = 0.05, release = 0.25, delay = 0,
      vibrato = 4.5, vibratoDepth = 6, breath = 0.35,
      pan = 0, reverb = 0, bus = null,
    } = opts;
    noise({ dur, gain: gain * breath, attack, release, filterFreq: freq * 1.6, filterType:'bandpass', filterQ:1.2, delay, pan, bus });
    tone(freq, { type:'sine', dur, gain, attack, release, delay, pan, reverb, bus, vibrato, vibratoDepth });
  }

  function whalecall(freq, opts = {}){
    const c = ensureCtx(); if (!c) return;
    const {
      dur = 1.6, gain = 0.13, attack = 0.3, release = 0.6, delay = 0,
      glideTo = null, vibrato = 3, vibratoDepth = 15, bubbles = 2,
      pan = 0, reverb = 0.25, bus = null,
    } = opts;
    const target = glideTo || freq * 1.15;
    tone(freq, { type:'sine', dur, gain, attack, release, delay, pan, reverb, bus, sweepTo: target, vibrato, vibratoDepth });
    for (let i = 0; i < bubbles; i++) {
      const bd = delay + Util.rand(0.1, Math.max(0.15, dur * 0.7));
      noise({ dur:0.03, gain: gain * 0.15, attack:0.002, release:0.04, filterFreq: Util.rand(1800, 3200), filterType:'bandpass', filterQ:5, delay: bd, pan, bus });
    }
  }

  const GONG_PARTIALS = [
    { ratio:1, gain:1 }, { ratio:1.8, gain:0.4 }, { ratio:2.75, gain:0.22 }, { ratio:3.4, gain:0.12 },
  ];
  function gong(freq, opts = {}){
    const c = ensureCtx(); if (!c) return;
    const {
      dur = 2.2, gain = 0.12, attack = 0.05, release = 2.5, delay = 0,
      damping = 1600, pan = 0, reverb = 0.3, bus = null,
    } = opts;
    const t0 = c.currentTime + delay;
    const stopAt = t0 + dur + release + 0.05;
    noise({ dur:0.04, gain: gain * 0.3, attack:0.001, release:0.05, filterFreq: freq * 3, filterType:'bandpass', delay, pan, bus });
    for (const p of GONG_PARTIALS) {
      const osc = c.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * p.ratio, t0);
      const filt = c.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.setValueAtTime(damping, t0);
      filt.frequency.exponentialRampToValueAtTime(Math.max(200, damping * 0.3), t0 + dur + release);
      const g = c.createGain();
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(gain * p.gain, t0 + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + release);
      osc.connect(filt); filt.connect(g); routeOut(c, g, { pan, reverb, bus });
      osc.start(t0); osc.stop(stopAt);
    }
  }

  function sonarping(freq, opts = {}){
    const c = ensureCtx(); if (!c) return;
    const {
      dur = 0.15, gain = 0.16, attack = 0.005, release = 0.3, delay = 0,
      echoTime = 0.28, feedback = 0.42, echoes = 4,
      pan = 0, reverb = 0, bus = null,
    } = opts;
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freq * 0.6), t0 + dur + release);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + release);
    osc.connect(g);
    const echoDelay = c.createDelay(1);
    echoDelay.delayTime.setValueAtTime(echoTime, t0);
    const fbGain = c.createGain();
    fbGain.gain.setValueAtTime(feedback, t0);
    g.connect(echoDelay);
    echoDelay.connect(fbGain);
    fbGain.connect(echoDelay);
    routeOut(c, g, { pan, reverb, bus });
    routeOut(c, echoDelay, { pan, reverb, bus });
    osc.start(t0); osc.stop(t0 + dur + release + echoTime * echoes + 0.1);
  }

  function ringmod(freq, opts = {}){
    const c = ensureCtx(); if (!c) return;
    const {
      dur = 0.5, gain = 0.14, attack = 0.02, release = 0.6, delay = 0,
      modRatio = 1.4, pan = 0, reverb = 0, bus = null,
    } = opts;
    const t0 = c.currentTime + delay;
    const carrier = c.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(freq, t0);
    const ring = c.createGain();
    ring.gain.setValueAtTime(0, t0);
    carrier.connect(ring);
    const modulator = c.createOscillator();
    modulator.type = 'sine';
    modulator.frequency.setValueAtTime(freq * modRatio, t0);
    modulator.connect(ring.gain);
    const env = c.createGain();
    env.gain.setValueAtTime(0, t0);
    env.gain.linearRampToValueAtTime(gain, t0 + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + release);
    ring.connect(env);
    routeOut(c, env, { pan, reverb, bus });
    const stopAt = t0 + dur + release + 0.05;
    carrier.start(t0); carrier.stop(stopAt);
    modulator.start(t0); modulator.stop(stopAt);
  }

  function voidhum(freq, opts = {}){
    const c = ensureCtx(); if (!c) return;
    const {
      dur = 3, gain = 0.05, delay = 0, grains = 14,
      pan = 0, reverb = 0.3, bus = null,
    } = opts;
    tone(freq, { type:'sine', dur, gain: gain * 1.4, attack: dur * 0.4, release: dur * 0.5, delay, pan, reverb, bus });
    for (let i = 0; i < grains; i++) {
      const gd = delay + Util.rand(0, dur);
      noise({ dur:0.05, gain: gain * 0.4, attack:0.01, release:0.08, filterFreq: freq * Util.rand(0.5, 2), filterType:'bandpass', filterQ:6, delay: gd, pan: Util.clamp(pan + Util.rand(-0.2, 0.2), -1, 1), bus });
    }
  }

  function glitch(freq, opts = {}){
    const c = ensureCtx(); if (!c) return;
    const {
      dur = 0.06, gain = 0.14, delay = 0, steps = 4, stepGap = 0.045,
      ratios = [1, 1.5, 2, 1], pan = 0, reverb = 0.15, bus = null,
    } = opts;
    for (let i = 0; i < steps; i++) {
      const r = ratios[i % ratios.length];
      tone(freq * r, { type:'square', dur, gain: gain * (0.5 + 0.5 * Math.random()), attack:0.002, release:0.03, delay: delay + i * stepGap, pan, reverb, bus });
    }
  }

  function warpsynth(freq, opts = {}){
    const c = ensureCtx(); if (!c) return;
    const {
      dur = 1.2, gain = 0.14, attack = 0.05, release = 0.5, delay = 0,
      riseTo = null, filterFrom = 300, filterTo = 4000,
      pan = 0, reverb = 0.2, bus = null,
    } = opts;
    const t0 = c.currentTime + delay;
    const target = riseTo || freq * 2;
    const osc = c.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, target), t0 + dur);
    const filt = c.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(filterFrom, t0);
    filt.frequency.exponentialRampToValueAtTime(Math.max(200, filterTo), t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + release);
    osc.connect(filt); filt.connect(g); routeOut(c, g, { pan, reverb, bus });
    osc.start(t0); osc.stop(t0 + dur + release + 0.05);
  }

  function drip(freq, opts = {}){
    const c = ensureCtx(); if (!c) return;
    const {
      dur = 0.12, gain = 0.15, delay = 0,
      chorusRate = 5, chorusDepth = 0.004, chorusBase = 0.012,
      pan = 0, reverb = 0.2, bus = null,
    } = opts;
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 1.4, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freq * 0.5), t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.25);
    osc.connect(g);
    const chorusDelay = c.createDelay(1);
    chorusDelay.delayTime.setValueAtTime(chorusBase, t0);
    const lfo = c.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(chorusRate, t0);
    const lfoGain = c.createGain();
    lfoGain.gain.value = chorusDepth;
    lfo.connect(lfoGain); lfoGain.connect(chorusDelay.delayTime);
    g.connect(chorusDelay);
    routeOut(c, g, { pan, reverb, bus });
    routeOut(c, chorusDelay, { pan, reverb, bus });
    const stopAt = t0 + dur + 0.3;
    osc.start(t0); osc.stop(stopAt);
    lfo.start(t0); lfo.stop(stopAt);
  }

  function sludge(freq, opts = {}){
    const c = ensureCtx(); if (!c) return;
    const {
      dur = 0.4, gain = 0.15, attack = 0.02, release = 0.3, delay = 0,
      wahRate = 3.2, wahDepth = 500, filterBase = 900,
      pan = 0, reverb = 0.1, bus = null,
    } = opts;
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t0);
    const filt = c.createBiquadFilter();
    filt.type = 'bandpass'; filt.Q.value = 6;
    filt.frequency.setValueAtTime(filterBase, t0);
    const wah = c.createOscillator();
    wah.type = 'sine';
    wah.frequency.setValueAtTime(wahRate, t0);
    const wahGain = c.createGain();
    wahGain.gain.value = wahDepth;
    wah.connect(wahGain); wahGain.connect(filt.frequency);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + release);
    osc.connect(filt); filt.connect(g); routeOut(c, g, { pan, reverb, bus });
    const stopAt = t0 + dur + release + 0.05;
    osc.start(t0); osc.stop(stopAt);
    wah.start(t0); wah.stop(stopAt);
  }

  function birdcall(freq, opts = {}){
    const c = ensureCtx(); if (!c) return;
    const {
      dur = 0.12, gain = 0.13, delay = 0,
      peakMul = 1.6, trill = 22, trillDepth = 60,
      pan = 0, reverb = 0.25, bus = null,
    } = opts;
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    osc.frequency.exponentialRampToValueAtTime(freq * peakMul, t0 + dur * 0.4);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freq * 0.9), t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.08);
    const lfo = c.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(trill, t0);
    const lfoGain = c.createGain();
    lfoGain.gain.value = trillDepth;
    lfo.connect(lfoGain); lfoGain.connect(osc.detune);
    osc.connect(g); routeOut(c, g, { pan, reverb, bus });
    const stopAt = t0 + dur + 0.15;
    osc.start(t0); osc.stop(stopAt);
    lfo.start(t0); lfo.stop(stopAt);
  }

  function creak(freq, opts = {}){
    const c = ensureCtx(); if (!c) return;
    const {
      dur = 0.6, gain = 0.14, delay = 0,
      filterFrom = null, filterTo = null, filterQ = 12,
      pan = 0, reverb = 0.2, bus = null,
    } = opts;
    const t0 = c.currentTime + delay;
    const from = filterFrom || freq * 0.8;
    const to = filterTo || freq * 1.6;
    const src = c.createBufferSource();
    src.buffer = noiseBuffer;
    const startOffset = Math.max(0, Math.random() * (noiseBuffer.duration - dur - 0.1));
    const filt = c.createBiquadFilter();
    filt.type = 'bandpass'; filt.Q.value = filterQ;
    filt.frequency.setValueAtTime(from, t0);
    filt.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.3);
    src.connect(filt); filt.connect(g); routeOut(c, g, { pan, reverb, bus });
    src.start(t0, startOffset); src.stop(t0 + dur + 0.35);
  }

  function pipeclang(freq, opts = {}){
    const c = ensureCtx(); if (!c) return;
    const {
      dur = 0.7, gain = 0.14, attack = 0.004, release = 0.6, delay = 0,
      hops = 4, hopDepth = 35, pan = 0, reverb = 0.22, bus = null,
    } = opts;
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const wave = periodicWave(c, 'bell');
    if (wave) osc.setPeriodicWave(wave); else osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t0);
    for (let i = 0; i < hops; i++) {
      osc.detune.setValueAtTime(Util.rand(-hopDepth, hopDepth), t0 + (i / hops) * (dur + release));
    }
    const g = c.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + release);
    osc.connect(g); routeOut(c, g, { pan, reverb, bus });
    const stopAt = t0 + dur + release + 0.05;
    osc.start(t0); osc.stop(stopAt);
  }

  function coralclick(freq, opts = {}){
    const c = ensureCtx(); if (!c) return;
    const {
      gain = 0.14, delay = 0, clicks = 3, spread = 0.02, detuneRange = 0.35,
      pan = 0, reverb = 0.18, bus = null,
    } = opts;
    for (let i = 0; i < clicks; i++) {
      const cf = freq * Util.rand(3 * (1 - detuneRange), 3 * (1 + detuneRange));
      noise({
        dur: 0.02, gain: gain * Util.rand(0.6, 1), attack: 0.001, release: 0.05,
        filterFreq: cf, filterType: 'bandpass', filterQ: 14,
        delay: delay + Util.rand(0, spread), pan: Util.clamp(pan + Util.rand(-0.15, 0.15), -1, 1), reverb, bus,
      });
    }
  }

  function ventgurgle(freq, opts = {}){
    const c = ensureCtx(); if (!c) return;
    const {
      dur = 0.45, gain = 0.14, delay = 0, riseTo = null,
      pan = 0, reverb = 0.15, bus = null,
    } = opts;
    const t0 = c.currentTime + delay;
    const to = riseTo || freq * 5;
    const src = c.createBufferSource();
    src.buffer = noiseBuffer;
    const startOffset = Math.max(0, Math.random() * (noiseBuffer.duration - dur - 0.1));
    const filt = c.createBiquadFilter();
    filt.type = 'bandpass'; filt.Q.value = 9;
    filt.frequency.setValueAtTime(freq * 1.5, t0);
    filt.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + dur * 0.6);
    g.gain.setValueAtTime(gain, t0 + dur - 0.01);
    g.gain.setValueAtTime(0.0001, t0 + dur);
    src.connect(filt); filt.connect(g); routeOut(c, g, { pan, reverb, bus });
    src.start(t0, startOffset); src.stop(t0 + dur + 0.05);
    tone(freq * 0.5, { type:'sine', dur: dur * 1.4, gain: gain * 0.5, attack: 0.05, release: 0.3, delay, pan, reverb, bus });
  }

  const DROWNEDBELL_PARTIALS = [
    { ratio:1, gain:1 }, { ratio:2.4, gain:0.4 }, { ratio:3.1, gain:0.25 }, { ratio:4.7, gain:0.14 },
  ];
  function drownedbell(freq, opts = {}){
    const c = ensureCtx(); if (!c) return;
    const {
      dur = 1.4, gain = 0.11, attack = 0.004, release = 1.6, delay = 0,
      sagDepth = 40, pan = 0, reverb = 0.3, bus = null,
    } = opts;
    const t0 = c.currentTime + delay;
    const stopAt = t0 + dur + release + 0.05;
    for (const p of DROWNEDBELL_PARTIALS) {
      const osc = c.createOscillator();
      osc.type = 'sine';
      const start = freq * p.ratio;
      osc.frequency.setValueAtTime(start, t0);
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, start - Util.rand(sagDepth * 0.4, sagDepth)), t0 + dur + release);
      const g = c.createGain();
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(gain * p.gain, t0 + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + release);
      osc.connect(g); routeOut(c, g, { pan, reverb, bus });
      osc.start(t0); osc.stop(stopAt);
    }
  }

  function currentdrone(freq, opts = {}){
    const c = ensureCtx(); if (!c) return;
    const {
      dur = 3.5, gain = 0.045, delay = 0, surges = 3,
      pan = 0, reverb = 0.3, bus = null,
    } = opts;
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain * 0.5, t0 + dur * 0.3);
    let tMark = t0 + dur * 0.35;
    for (let i = 0; i < surges; i++) {
      const peakAt = tMark + Util.rand(0.15, 0.4);
      const settleAt = peakAt + Util.rand(0.3, 0.6);
      g.gain.linearRampToValueAtTime(gain * Util.rand(0.9, 1.15), peakAt);
      g.gain.linearRampToValueAtTime(gain * 0.4, settleAt);
      tMark = settleAt;
    }
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 1.2);
    osc.connect(g); routeOut(c, g, { pan, reverb, bus });
    osc.start(t0); osc.stop(t0 + dur + 1.3);
  }

  function leviathanmoan(freq, opts = {}){
    const c = ensureCtx(); if (!c) return;
    const {
      dur = 2.6, gain = 0.11, attack = 0.4, release = 1, delay = 0,
      glideDown = 0.6, breathRate = 0.6, breathDepth = 0.4,
      pan = 0, reverb = 0.28, bus = null,
    } = opts;
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freq * glideDown), t0 + dur + release);
    const filt = c.createBiquadFilter();
    filt.type = 'lowpass'; filt.frequency.value = freq * 3;
    const env = c.createGain();
    env.gain.setValueAtTime(0, t0);
    env.gain.linearRampToValueAtTime(gain, t0 + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + release);
    const breath = c.createOscillator();
    breath.type = 'sine';
    breath.frequency.setValueAtTime(breathRate, t0);
    const breathGain = c.createGain();
    breathGain.gain.value = breathDepth;
    breath.connect(breathGain);
    const am = c.createGain();
    am.gain.value = 1;
    breathGain.connect(am.gain);
    osc.connect(filt); filt.connect(env); env.connect(am); routeOut(c, am, { pan, reverb, bus });
    noise({ dur: dur * 0.8, gain: gain * 0.25, attack: attack * 1.5, release: release, filterFreq: freq * 4, filterType:'lowpass', delay, pan, reverb, bus });
    const stopAt = t0 + dur + release + 0.1;
    osc.start(t0); osc.stop(stopAt);
    breath.start(t0); breath.stop(stopAt);
  }

  function stardust(freq, opts = {}){
    const c = ensureCtx(); if (!c) return;
    const {
      dur = 1.5, gain = 0.05, delay = 0, twinkles = 10, ratios = [2, 3, 4, 5, 6],
      pan = 0, reverb = 0.3, bus = null,
    } = opts;
    tone(freq, { type:'sine', dur, gain: gain * 1.2, attack: dur * 0.3, release: dur * 0.5, delay, pan, reverb, bus });
    for (let i = 0; i < twinkles; i++) {
      const r = ratios[Math.floor(Util.rand(0, ratios.length))];
      const td = delay + Util.rand(0, dur * 0.8);
      tone(freq * r, { type:'sine', dur:0.04, gain: gain * 0.5, attack:0.005, release:0.1, delay: td, pan: Util.clamp(pan + Util.rand(-0.15, 0.15), -1, 1), bus });
    }
  }

  function clockwork(freq, opts = {}){
    const c = ensureCtx(); if (!c) return;
    const {
      gain = 0.13, delay = 0, ticks = 5, startGap = 0.09, gapRatio = 0.7,
      filterFreq = null, pan = 0, reverb = 0.12, bus = null,
    } = opts;
    const ff = filterFreq || freq * 3;
    let t = delay, gap = startGap;
    for (let i = 0; i < ticks; i++) {
      noise({ dur:0.01, gain: gain * (1 - (i / ticks) * 0.4), attack:0.001, release:0.02, filterFreq: ff, filterType:'bandpass', filterQ:8, delay: t, pan, reverb, bus });
      t += gap;
      gap *= gapRatio;
    }
    tone(freq, { type:'triangle', dur:0.15, gain: gain * 0.5, attack:0.005, release:0.3, delay, pan, reverb, bus });
  }

  function drift(freq, opts = {}){
    const c = ensureCtx(); if (!c) return;
    const {
      dur = 4, gain = 0.04, attack = 1.5, release = 2, delay = 0,
      panRate = 0.15, panDepth = 0.6, reverb = 0.35, bus = null,
    } = opts;
    const t0 = c.currentTime + delay;
    const dest = bus || master;
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + release);
    osc.connect(g);
    const panner = c.createStereoPanner();
    panner.pan.setValueAtTime(0, t0);
    const lfo = c.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(panRate, t0);
    const lfoGain = c.createGain();
    lfoGain.gain.value = panDepth;
    lfo.connect(lfoGain); lfoGain.connect(panner.pan);
    g.connect(panner); panner.connect(dest);
    if (reverb > 0) {
      const send = c.createGain();
      send.gain.value = Util.clamp(reverb, 0, 1) * 0.35;
      g.connect(send);
      send.connect(ensureReverb(c));
    }
    const stopAt = t0 + dur + release + 0.05;
    osc.start(t0); osc.stop(stopAt);
    lfo.start(t0); lfo.stop(stopAt);
  }

  let ambient = null;
  function startAmbient(){
    const c = ensureCtx(); if (!c || ambient) return;
    const filt = c.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 900;
    filt.connect(musicGain);

    const ambGain = c.createGain();
    ambGain.gain.setValueAtTime(0, c.currentTime);
    ambGain.gain.linearRampToValueAtTime(0.07, c.currentTime + 3);
    ambGain.connect(filt);

    const ROOT = 55;
    const voices = [
      { type: 'sine', freq: ROOT, gain: 0.5 },
      { type: 'sine', freq: ROOT * 1.5, gain: 0.3 },
      { type: 'triangle', freq: ROOT * 2, gain: 0.15 },
    ];
    const nodes = [];
    for (const v of voices) {
      const osc = c.createOscillator();
      osc.type = v.type;
      osc.frequency.value = v.freq;
      const g = c.createGain();
      g.gain.value = v.gain;
      osc.connect(g); g.connect(ambGain);
      osc.start();
      nodes.push(osc);
    }

    const lfo = c.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.06;
    const lfoGain = c.createGain();
    lfoGain.gain.value = 0.02;
    lfo.connect(lfoGain);
    lfoGain.connect(ambGain.gain);
    lfo.start();
    nodes.push(lfo);

    ambient = { ambGain, nodes };
  }
  function stopAmbient(){
    if (!ambient || !ctx) return;
    const { ambGain, nodes } = ambient;
    const t = ctx.currentTime;
    ambGain.gain.cancelScheduledValues(t);
    ambGain.gain.setValueAtTime(ambGain.gain.value, t);
    ambGain.gain.linearRampToValueAtTime(0, t + 1.2);
    setTimeout(() => { for (const n of nodes) { try { n.stop(); } catch (e) {  } } }, 1300);
    ambient = null;
  }

  function stepArray(len, entries){
    const arr = new Array(len).fill(null);
    for (const idx in entries) arr[idx] = entries[idx];
    return arr;
  }

  const CRYPT_BASS_STEPS = stepArray(32, { 0: 110.00, 8: 98.00, 16: 110.00, 24: 87.31 });
  const CRYPT_MELODY_STEPS = stepArray(32, {
    2: 196.00, 9: 174.61, 18: 220.00, 26: 164.81,
  });
  const CRYPT_PERC_STEPS = stepArray(32, { 0: 'kick', 16: 'kick', 12: 'bonehit', 28: 'bonehit' });
  const CRYPT_PAD_STEPS = stepArray(32, { 0: [110.00, 130.81, 196.00] });

  const FOREST_BASS_STEPS = stepArray(32, { 0: 73.42, 8: 110.00, 16: 98.00, 24: 73.42 });
  const FOREST_PIANO_STEPS = stepArray(32, {
    2: 146.83, 6: 185.00, 10: 220.00, 14: 293.66, 18: 220.00, 22: 185.00, 26: 146.83, 30: 110.00,
  });
  const FOREST_TRUMPET_STEPS = stepArray(32, { 4: 220.00, 20: 293.66, 28: 185.00 });
  const FOREST_PERC_STEPS = stepArray(32, { 0: 'kick', 16: 'kick', 4: 'hat', 12: 'hat', 20: 'hat', 28: 'hat' });

  const DESERT_BASS_STEPS = stepArray(32, { 0: 98.00, 8: 73.42, 16: 98.00, 24: 65.41 });
  const DESERT_MELODY_STEPS = stepArray(32, {
    2: 196.00, 6: 246.94, 10: 293.66, 14: 246.94, 18: 220.00, 22: 196.00, 26: 246.94, 30: 220.00,
  });
  const DESERT_PERC_STEPS = stepArray(32, { 0: 'kick', 16: 'kick', 4: 'hat', 12: 'hat', 20: 'hat', 28: 'hat' });
  const DESERT_PAD_STEPS = stepArray(32, { 0: [98.00, 123.47, 146.83] });

  const INFERNO_BASS_STEPS = stepArray(32, { 0: 110.00, 8: 87.31, 16: 98.00, 24: 110.00 });
  const INFERNO_GROWL_STEPS = stepArray(32, {
    0: 220.00, 3: 261.63, 6: 246.94, 8: 220.00, 11: 174.61, 14: 196.00,
    16: 220.00, 19: 261.63, 22: 246.94, 24: 220.00, 27: 174.61, 30: 196.00,
  });
  const INFERNO_PERC_STEPS = stepArray(32, {
    0: 'kick', 8: 'kick', 16: 'kick', 24: 'kick',
    4: 'snare', 12: 'snare', 20: 'snare', 28: 'snare',
    2: 'hat', 6: 'hat', 10: 'hat', 14: 'hat', 18: 'hat', 22: 'hat', 26: 'hat', 30: 'hat',
  });
  const INFERNO_PAD_STEPS = stepArray(32, { 0: [110.00, 130.81, 164.81] });

  const INFERNOB_BASS_STEPS = stepArray(32, { 0: 73.42, 6: 73.42, 10: 92.50, 16: 61.74, 22: 61.74, 26: 82.41 });
  const INFERNOB_GROWL_STEPS = stepArray(32, {
    0: 146.83, 2: 174.61, 5: 185.00, 9: 220.00, 12: 185.00, 15: 146.83,
    16: 123.47, 18: 146.83, 21: 164.81, 25: 196.00, 28: 164.81, 31: 123.47,
  });
  const INFERNOB_PERC_STEPS = stepArray(32, {
    0: 'kick', 6: 'kick', 10: 'kick', 16: 'kick', 22: 'kick', 26: 'kick',
    8: 'snare', 24: 'snare',
    3: 'hat', 7: 'hat', 11: 'hat', 15: 'hat', 19: 'hat', 23: 'hat', 27: 'hat', 31: 'hat',
  });
  const INFERNOB_MALLET_STEPS = stepArray(32, { 4: 293.66, 13: 349.23, 20: 246.94, 29: 329.63 });
  const INFERNOB_PAD_STEPS = stepArray(32, { 0: [73.42, 87.31, 110.00], 16: [61.74, 73.42, 92.50] });

  const FINALE_BASS_STEPS = stepArray(32, { 0: 55.00, 4: 55.00, 8: 65.41, 12: 73.42, 16: 82.41, 20: 73.42, 24: 65.41, 28: 49.00 });
  const FINALE_TRUMPET_STEPS = stepArray(32, {
    0: 220.00, 4: 329.63, 7: 293.66, 10: 261.63, 14: 329.63,
    16: 246.94, 20: 349.23, 23: 329.63, 26: 293.66, 30: 392.00,
  });
  const FINALE_PIANO_STEPS = stepArray(32, {
    2: 440.00, 6: 523.25, 9: 493.88, 13: 587.33,
    18: 493.88, 22: 587.33, 25: 523.25, 29: 659.25,
  });
  const FINALE_PERC_STEPS = stepArray(32, {
    0: 'kick', 4: 'kick', 8: 'kick', 12: 'kick', 16: 'kick', 20: 'kick', 24: 'kick', 28: 'kick',
    6: 'snare', 14: 'snare', 22: 'snare', 30: 'snare',
    2: 'hat', 10: 'hat', 18: 'hat', 26: 'hat',
  });
  const FINALE_PAD_STEPS = stepArray(32, { 0: [110.00, 164.81, 220.00], 16: [123.47, 185.00, 246.94] });

  const FROZENDESERT_BASS_STEPS = stepArray(32, { 0: 65.41, 16: 98.00 });
  const FROZENDESERT_ICECHIME_STEPS = stepArray(32, {
    2: 392.00, 10: 440.00, 18: 329.63, 26: 392.00,
  });
  const FROZENDESERT_PERC_STEPS = stepArray(32, { 0: 'hat', 16: 'hat' });
  const FROZENDESERT_PAD_STEPS = stepArray(32, { 0: [65.41, 98.00, 164.81] });

  const BADLANDS_BASS_STEPS = stepArray(32, { 0: 73.42, 8: 58.27, 16: 65.41, 24: 73.42 });
  const BADLANDS_HARMONICA_STEPS = stepArray(32, {
    0: 146.83, 4: 174.61, 8: 196.00, 12: 220.00, 16: 146.83, 20: 233.08, 24: 196.00, 28: 174.61,
  });
  const BADLANDS_PERC_STEPS = stepArray(32, { 0: 'kick', 16: 'kick', 4: 'hat', 8: 'hat', 12: 'hat', 20: 'hat', 24: 'hat', 28: 'hat' });
  const BADLANDS_PAD_STEPS = stepArray(32, { 0: [73.42, 87.31, 110.00] });

  const BEACH_BASS_STEPS = stepArray(32, { 0: 110.00, 8: 82.41, 16: 92.50, 24: 110.00 });
  const BEACH_FLUTE_STEPS = stepArray(32, {
    0: 220.00, 6: 277.18, 12: 329.63, 18: 369.99, 22: 329.63, 26: 277.18, 30: 246.94,
  });
  const BEACH_PERC_STEPS = stepArray(32, { 0: 'kick', 16: 'kick', 6: 'hat', 14: 'hat', 22: 'hat', 30: 'hat' });
  const BEACH_PAD_STEPS = stepArray(32, { 0: [110.00, 138.59, 164.81] });

  const OCEAN_BASS_STEPS = stepArray(32, { 0: 82.41, 8: 65.41, 16: 73.42, 24: 82.41 });
  const OCEAN_WHALECALL_STEPS = stepArray(32, { 2: 164.81, 14: 196.00, 24: 246.94 });
  const OCEAN_PERC_STEPS = stepArray(32, { 0: 'kick', 16: 'kick', 8: 'hat', 24: 'hat' });
  const OCEAN_PAD_STEPS = stepArray(32, { 0: [82.41, 98.00, 123.47] });

  const SEAFLOOR_BASS_STEPS = stepArray(32, { 0: 65.41, 8: 58.27, 16: 51.91, 24: 65.41 });
  const SEAFLOOR_GONG_STEPS = stepArray(32, { 0: 130.81, 16: 155.56, 24: 98.00 });
  const SEAFLOOR_PERC_STEPS = stepArray(32, { 0: 'hat', 20: 'hat' });
  const SEAFLOOR_PAD_STEPS = stepArray(32, { 0: [65.41, 77.78, 98.00] });

  const TRENCH_BASS_STEPS = stepArray(32, { 0: 98.00, 8: 77.78, 16: 87.31, 24: 98.00 });
  const TRENCH_SONARPING_STEPS = stepArray(32, { 0: 196.00, 10: 233.08, 20: 261.63, 28: 196.00 });
  const TRENCH_PERC_STEPS = stepArray(32, { 0: 'kick', 16: 'kick', 8: 'hat', 24: 'hat' });
  const TRENCH_PAD_STEPS = stepArray(32, { 0: [98.00, 116.54, 146.83] });

  const TRENCHDEPTHS_BASS_STEPS = stepArray(32, { 0: 92.50, 8: 73.42, 16: 82.41, 24: 92.50 });
  const TRENCHDEPTHS_RINGMOD_STEPS = stepArray(32, { 2: 185.00, 14: 220.00, 22: 277.18, 28: 185.00 });
  const TRENCHDEPTHS_PERC_STEPS = stepArray(32, { 0: 'hat', 20: 'hat' });
  const TRENCHDEPTHS_PAD_STEPS = stepArray(32, { 0: [92.50, 110.00, 138.59] });

  const DEEPDARK_BASS_STEPS = stepArray(32, { 0: 87.31, 8: 69.30, 16: 77.78, 24: 87.31 });
  const DEEPDARK_VOIDHUM_STEPS = stepArray(32, { 0: 174.61, 16: 138.59 });
  const DEEPDARK_PERC_STEPS = stepArray(32, { 16: 'hat' });
  const DEEPDARK_PAD_STEPS = stepArray(32, { 0: [87.31, 103.83, 130.81] });

  const METAREALM_BASS_STEPS = stepArray(32, { 0: 73.42, 8: 55.00, 16: 61.74, 24: 73.42 });
  const METAREALM_GLITCH_STEPS = stepArray(32, { 0: 293.66, 8: 369.99, 16: 440.00, 24: 246.94 });
  const METAREALM_PERC_STEPS = stepArray(32, { 0: 'kick', 14: 'kick', 16: 'kick', 30: 'kick' });
  const METAREALM_PAD_STEPS = stepArray(32, { 0: [73.42, 92.50, 110.00] });

  const HYPERSPACE_BASS_STEPS = stepArray(32, { 0: 82.41, 8: 61.74, 16: 69.30, 24: 82.41 });
  const HYPERSPACE_WARPSYNTH_STEPS = stepArray(32, { 0: 164.81, 8: 207.65, 16: 246.94, 24: 277.18 });
  const HYPERSPACE_PERC_STEPS = stepArray(32, { 0: 'kick', 8: 'kick', 16: 'kick', 24: 'kick', 4: 'hat', 12: 'hat', 20: 'hat', 28: 'hat' });
  const HYPERSPACE_PAD_STEPS = stepArray(32, { 0: [82.41, 103.83, 123.47] });

  const GUTTERS_BASS_STEPS = stepArray(32, { 0: 61.74, 8: 49.00, 16: 55.00, 24: 61.74 });
  const GUTTERS_DRIP_STEPS = stepArray(32, { 3: 146.83, 9: 185.00, 15: 220.00, 19: 146.83, 25: 185.00, 29: 246.94 });
  const GUTTERS_PERC_STEPS = stepArray(32, { 6: 'hat', 14: 'hat', 22: 'hat', 30: 'hat' });
  const GUTTERS_PAD_STEPS = stepArray(32, { 0: [61.74, 73.42, 92.50] });

  const SEWERS_BASS_STEPS = stepArray(32, { 0: 73.42, 8: 58.27, 16: 65.41, 24: 73.42 });
  const SEWERS_SLUDGE_STEPS = stepArray(32, { 0: 146.83, 10: 174.61, 20: 196.00, 28: 164.81 });
  const SEWERS_PERC_STEPS = stepArray(32, { 0: 'kick', 16: 'kick', 8: 'hat', 24: 'hat' });
  const SEWERS_PAD_STEPS = stepArray(32, { 0: [73.42, 87.31, 110.00] });

  const RAINFOREST_BASS_STEPS = stepArray(32, { 0: 69.30, 8: 55.00, 16: 61.74, 24: 69.30 });
  const RAINFOREST_BIRDCALL_STEPS = stepArray(32, {
    0: 207.65, 3: 246.94, 6: 277.18, 10: 329.63, 14: 246.94, 18: 207.65, 22: 277.18, 26: 369.99, 30: 246.94,
  });
  const RAINFOREST_PERC_STEPS = stepArray(32, { 0: 'kick', 16: 'kick', 4: 'hat', 8: 'hat', 12: 'hat', 20: 'hat', 24: 'hat', 28: 'hat' });
  const RAINFOREST_PAD_STEPS = stepArray(32, { 0: [69.30, 82.41, 103.83] });

  const MANGROVES_BASS_STEPS = stepArray(32, { 0: 103.83, 8: 82.41, 16: 92.50, 24: 103.83 });
  const MANGROVES_CREAK_STEPS = stepArray(32, { 0: 207.65, 16: 155.56 });
  const MANGROVES_PERC_STEPS = stepArray(32, { 0: 'hat', 20: 'hat' });
  const MANGROVES_PAD_STEPS = stepArray(32, { 0: [103.83, 123.47, 155.56] });

  const FLOODEDUNDERCITY_BASS_STEPS = stepArray(32, { 0: 65.41, 8: 51.91, 16: 58.27, 24: 65.41 });
  const FLOODEDUNDERCITY_PIPECLANG_STEPS = stepArray(32, { 3: 155.56, 11: 196.00, 19: 233.08, 27: 155.56 });
  const FLOODEDUNDERCITY_PERC_STEPS = stepArray(32, { 6: 'hat', 14: 'hat', 22: 'hat', 30: 'hat' });
  const FLOODEDUNDERCITY_PAD_STEPS = stepArray(32, { 0: [65.41, 77.78, 98.00] });

  const CORALBONEYARD_BASS_STEPS = stepArray(32, { 0: 82.41, 8: 65.41, 16: 73.42, 24: 82.41 });
  const CORALBONEYARD_CORALCLICK_STEPS = stepArray(32, {
    2: 164.81, 5: 196.00, 10: 246.94, 13: 164.81, 18: 196.00, 21: 246.94, 26: 164.81, 29: 196.00,
  });
  const CORALBONEYARD_PERC_STEPS = stepArray(32, { 0: 'kick', 16: 'kick', 8: 'hat', 24: 'hat' });
  const CORALBONEYARD_PAD_STEPS = stepArray(32, { 0: [82.41, 98.00, 123.47] });

  const ABYSSALVENTS_BASS_STEPS = stepArray(32, { 0: 92.50, 8: 73.42, 16: 82.41, 24: 92.50 });
  const ABYSSALVENTS_VENTGURGLE_STEPS = stepArray(32, { 6: 92.50, 22: 110.00 });
  const ABYSSALVENTS_PERC_STEPS = stepArray(32, { 0: 'kick', 8: 'hat', 16: 'kick', 24: 'hat' });
  const ABYSSALVENTS_PAD_STEPS = stepArray(32, { 0: [92.50, 110.00, 138.59] });

  const DROWNEDCATHEDRAL_BASS_STEPS = stepArray(32, { 0: 55.00, 8: 43.65, 16: 49.00, 24: 55.00 });
  const DROWNEDCATHEDRAL_DROWNEDBELL_STEPS = stepArray(32, { 0: 220.00, 16: 174.61 });
  const DROWNEDCATHEDRAL_PERC_STEPS = stepArray(32, { 0: 'hat', 16: 'hat' });
  const DROWNEDCATHEDRAL_PAD_STEPS = stepArray(32, { 0: [55.00, 65.41, 82.41] });

  const BLACKCURRENT_BASS_STEPS = stepArray(32, { 0: 49.00, 8: 38.89, 16: 43.65, 24: 49.00 });
  const BLACKCURRENT_CURRENTDRONE_STEPS = stepArray(32, { 0: 98.00, 18: 87.31 });
  const BLACKCURRENT_PERC_STEPS = stepArray(32, { 0: 'kick', 16: 'kick' });
  const BLACKCURRENT_PAD_STEPS = stepArray(32, { 0: [49.00, 58.27, 73.42] });

  const LEVIATHANSMAW_BASS_STEPS = stepArray(32, { 0: 32.70, 8: 25.96, 16: 29.14, 24: 32.70 });
  const LEVIATHANSMAW_LEVIATHANMOAN_STEPS = stepArray(32, { 0: 65.41, 16: 58.27 });
  const LEVIATHANSMAW_PERC_STEPS = stepArray(32, { 0: 'kick' });
  const LEVIATHANSMAW_PAD_STEPS = stepArray(32, { 0: [32.70, 38.89, 49.00] });

  const OBSERVATORY_BASS_STEPS = stepArray(32, { 0: 58.27, 8: 46.25, 16: 51.91, 24: 58.27 });
  const OBSERVATORY_STARDUST_STEPS = stepArray(32, { 0: 233.08, 10: 277.18, 20: 311.13, 28: 233.08 });
  const OBSERVATORY_PERC_STEPS = stepArray(32, { 0: 'hat', 16: 'hat' });
  const OBSERVATORY_PAD_STEPS = stepArray(32, { 0: [58.27, 69.30, 87.31] });

  const ORRERY_BASS_STEPS = stepArray(32, { 0: 87.31, 8: 65.41, 16: 73.42, 24: 87.31 });
  const ORRERY_CLOCKWORK_STEPS = stepArray(32, { 0: 174.61, 8: 220.00, 16: 261.63, 24: 293.66 });
  const ORRERY_PERC_STEPS = stepArray(32, { 0: 'kick', 16: 'kick', 4: 'hat', 8: 'hat', 12: 'hat', 20: 'hat', 24: 'hat', 28: 'hat' });
  const ORRERY_PAD_STEPS = stepArray(32, { 0: [87.31, 110.00, 130.81] });

  const VOIDBETWEEN_BASS_STEPS = stepArray(32, { 0: 77.78, 8: 61.74, 16: 69.30, 24: 77.78 });
  const VOIDBETWEEN_DRIFT_STEPS = stepArray(32, { 0: 155.56, 16: 138.59 });
  const VOIDBETWEEN_PERC_STEPS = stepArray(32, { 16: 'hat' });
  const VOIDBETWEEN_PAD_STEPS = stepArray(32, { 0: [77.78, 92.50, 116.54] });

  const BOSSROOM_BASS_GRIND = stepArray(32, { 0: 55.00, 8: 43.65, 16: 49.00, 24: 55.00 });
  const BOSSROOM_BASS_ASSAULT = stepArray(32, {
    0: 55.00, 4: 65.41, 8: 43.65, 12: 49.00, 16: 55.00, 20: 65.41, 24: 43.65, 28: 49.00,
  });
  const BOSSROOM_GROWL_GRIND = stepArray(32, {
    0: 220.00, 2: 261.63, 4: 246.94, 6: 220.00, 8: 174.61, 10: 196.00, 12: 220.00, 14: 246.94,
    16: 220.00, 18: 261.63, 20: 246.94, 22: 220.00, 24: 174.61, 26: 196.00, 28: 220.00, 30: 246.94,
  });
  const BOSSROOM_GROWL_ASSAULT = stepArray(32, {
    0: 220.00, 1: 246.94, 2: 261.63, 3: 293.66, 4: 261.63, 5: 246.94, 6: 220.00, 7: 196.00,
    8: 220.00, 9: 246.94, 10: 261.63, 11: 293.66, 12: 329.63, 13: 293.66, 14: 261.63, 15: 246.94,
    16: 220.00, 17: 246.94, 18: 261.63, 19: 293.66, 20: 261.63, 21: 246.94, 22: 220.00, 23: 196.00,
    24: 220.00, 25: 246.94, 26: 261.63, 27: 293.66, 28: 329.63, 29: 293.66, 30: 261.63, 31: 246.94,
  });
  const BOSSROOM_PERC_GRIND = stepArray(32, {
    0: 'kick', 4: 'kick', 8: 'kick', 12: 'kick', 16: 'kick', 20: 'kick', 24: 'kick', 28: 'kick',
    2: 'snare', 6: 'snare', 10: 'snare', 14: 'snare', 18: 'snare', 22: 'snare', 26: 'snare', 30: 'snare',
  });
  const BOSSROOM_PERC_ASSAULT = stepArray(32, (() => {

    const o = {};
    for (let i = 0; i < 32; i++) o[i] = 'hat';
    for (let i = 0; i < 32; i += 8) o[i] = 'kick';
    for (let i = 4; i < 32; i += 8) o[i] = 'snare';
    return o;
  })());
  const BOSSROOM_STAB_SILENT = stepArray(32, {});
  const BOSSROOM_STAB_ASSAULT = stepArray(32, { 0: [220.00, 329.63, 440.00], 8: [196.00, 293.66, 392.00], 16: [220.00, 329.63, 440.00], 24: [246.94, 369.99, 493.88] });
  const BOSSROOM_PAD_GRIND = stepArray(32, { 0: [55.00, 65.41, 82.41] });
  const BOSSROOM_PAD_ASSAULT = stepArray(32, { 0: [55.00, 65.41, 87.31] });

  const CRYSTALROOM_BASS_STEPS = stepArray(16, { 0: 65.41, 8: 98.00 });
  const CRYSTALROOM_ICECHIME_STEPS = stepArray(16, { 0: 392.00, 5: 329.63, 10: 261.63, 13: 329.63 });
  const CRYSTALROOM_PERC_STEPS = stepArray(16, { 0: 'hat', 8: 'hat' });
  const CRYSTALROOM_PAD_STEPS = stepArray(16, { 0: [130.81, 164.81, 196.00] });

  const SOMBRAROOM_BASS_STEPS = stepArray(16, { 0: 92.50, 8: 73.42 });
  const SOMBRAROOM_RINGMOD_STEPS = stepArray(16, { 0: 185.00, 6: 220.00, 11: 277.18 });
  const SOMBRAROOM_PERC_STEPS = stepArray(16, { 0: 'kick', 10: 'hat' });
  const SOMBRAROOM_PAD_STEPS = stepArray(16, { 0: [92.50, 110.00, 138.59] });

  const TREASUREROOM_BASS_STEPS = stepArray(16, { 0: 110.00, 4: 138.59, 8: 92.50, 12: 110.00 });
  const TREASUREROOM_TRUMPET_STEPS = stepArray(16, { 0: 220.00, 4: 277.18, 8: 329.63, 14: 220.00 });
  const TREASUREROOM_PERC_STEPS = stepArray(16, { 0: 'kick', 8: 'kick', 4: 'hat', 12: 'hat' });
  const TREASUREROOM_PAD_STEPS = stepArray(16, { 0: [110.00, 138.59, 164.81] });

  const SECRETROOM_BASS_STEPS = stepArray(16, { 0: 61.74, 8: 49.00 });
  const SECRETROOM_MALLET_STEPS = stepArray(16, { 0: 146.83, 7: 185.00, 12: 220.00 });
  const SECRETROOM_PERC_STEPS = stepArray(16, { 12: 'hat' });
  const SECRETROOM_PAD_STEPS = stepArray(16, { 0: [61.74, 73.42, 92.50] });

  const SHOP_BASS_STEPS = stepArray(16, { 0: 98.00, 4: 73.42, 8: 65.41, 12: 98.00 });
  const SHOP_PIANO_STEPS = stepArray(16, { 0: 196.00, 2: 246.94, 4: 293.66, 6: 246.94, 8: 196.00, 10: 246.94, 12: 293.66, 14: 246.94 });
  const SHOP_PERC_STEPS = stepArray(16, { 0: 'kick', 8: 'kick', 4: 'hat', 12: 'hat' });
  const SHOP_PAD_STEPS = stepArray(16, { 0: [98.00, 123.47, 146.83] });

  const MUSIC_TRACKS = {
    crypt: {
      name: 'The Crypt',
      bpm: 72, stepsPerBeat: 2,
      parts: [
        { instrument:'bass',    steps: CRYPT_BASS_STEPS,   opts:{ dur:0.9, gain:0.18, attack:0.02, release:0.5, filterFreq:260 } },
        { instrument:'mallet',  steps: CRYPT_MELODY_STEPS, opts:{ dur:0.7, gain:0.15, attack:0.003, release:0.5, reverb:0.15, pan:-0.15, filterFreq:1400 } },
        { instrument:'perc',    steps: CRYPT_PERC_STEPS,   opts:{ gain:0.6, reverb:0.06 } },
        { instrument:'strings', steps: CRYPT_PAD_STEPS,    opts:{ dur:6, gain:0.045, attack:1.5, release:2, reverb:0.18, voices:4, detune:6, type:'triangle', filterFreq:420 } },
      ],
    },
    forest: {
      name: 'The Whitetail Forest',
      bpm: 96, stepsPerBeat: 2,
      parts: [
        { instrument:'bass',    steps: FOREST_BASS_STEPS,    opts:{ dur:0.7, gain:0.16, attack:0.02, release:0.4, filterFreq:300 } },
        { instrument:'piano',   steps: FOREST_PIANO_STEPS,   opts:{ dur:0.8, gain:0.12, release:0.6, reverb:0.12, filterFreq:2600, pan:-0.1 } },
        { instrument:'trumpet', steps: FOREST_TRUMPET_STEPS, opts:{ dur:0.6, gain:0.13, attack:0.03, release:0.2, reverb:0.2, pan:0.15, vibrato:5, vibratoDepth:6 } },
        { instrument:'perc',    steps: FOREST_PERC_STEPS,    opts:{ gain:0.45, reverb:0.05 } },
      ],
    },
    desert: {
      name: 'The Sandswept Dunes',
      bpm: 84, stepsPerBeat: 2,
      parts: [
        { instrument:'bass',    steps: DESERT_BASS_STEPS,   opts:{ dur:0.7, gain:0.15, attack:0.02, release:0.4, filterFreq:280 } },
        { instrument:'banjo',   steps: DESERT_MELODY_STEPS, opts:{ dur:0.3, gain:0.15, damping:3000, decay:0.92, reverb:0.12, pan:0.1 } },
        { instrument:'perc',    steps: DESERT_PERC_STEPS,   opts:{ gain:0.5, reverb:0.06 } },
        { instrument:'strings', steps: DESERT_PAD_STEPS,    opts:{ dur:5, gain:0.04, attack:1.3, release:1.8, reverb:0.15, voices:4, detune:5, type:'triangle', filterFreq:500 } },
      ],
    },
    inferno: {
      name: 'The Inferno',
      bpm: 108, stepsPerBeat: 2, swing: 0,
      parts: [
        { instrument:'bass',    steps: INFERNO_BASS_STEPS,  opts:{ dur:0.5, gain:0.17, attack:0.015, release:0.3, filterFreq:320 } },
        { instrument:'growl',   steps: INFERNO_GROWL_STEPS, opts:{ dur:0.22, gain:0.14, attack:0.008, release:0.1, drive:7, filterFreq:1600, reverb:0.08, pan:-0.1 } },
        { instrument:'perc',    steps: INFERNO_PERC_STEPS,  opts:{ gain:0.5, reverb:0.05 } },
        { instrument:'strings', steps: INFERNO_PAD_STEPS,   opts:{ dur:4.5, gain:0.04, attack:1.1, release:1.5, reverb:0.15, voices:4, detune:6, type:'sawtooth', filterFreq:450 } },
      ],
    },
    infernoB: {
      name: 'The Inferno — Side B',
      bpm: 112, stepsPerBeat: 2, swing: 0,
      parts: [
        { instrument:'bass',    steps: INFERNOB_BASS_STEPS,   opts:{ dur:0.6, gain:0.18, attack:0.02, release:0.35, filterFreq:260 } },
        { instrument:'growl',   steps: INFERNOB_GROWL_STEPS,  opts:{ dur:0.26, gain:0.13, attack:0.01, release:0.14, drive:5, filterFreq:1300, reverb:0.12, pan:0.12 } },
        { instrument:'mallet',  steps: INFERNOB_MALLET_STEPS, opts:{ dur:0.8, gain:0.11, attack:0.004, release:0.7, reverb:0.22, pan:-0.2, filterFreq:1900 } },
        { instrument:'perc',    steps: INFERNOB_PERC_STEPS,   opts:{ gain:0.48, reverb:0.07 } },
        { instrument:'strings', steps: INFERNOB_PAD_STEPS,    opts:{ dur:4, gain:0.038, attack:1.2, release:1.6, reverb:0.2, voices:4, detune:8, type:'sawtooth', filterFreq:380 } },
      ],
    },
    finale: {
      name: 'The Final Descent',
      bpm: 128, stepsPerBeat: 2, swing: 0,
      parts: [
        { instrument:'bass',    steps: FINALE_BASS_STEPS,    opts:{ dur:0.5, gain:0.19, attack:0.012, release:0.28, filterFreq:300 } },
        { instrument:'trumpet', steps: FINALE_TRUMPET_STEPS, opts:{ dur:0.5, gain:0.13, attack:0.03, release:0.24, reverb:0.24, pan:0.15, vibrato:5.5, vibratoDepth:7 } },
        { instrument:'piano',   steps: FINALE_PIANO_STEPS,   opts:{ dur:0.7, gain:0.1, release:0.6, reverb:0.2, filterFreq:3000, pan:-0.18 } },
        { instrument:'perc',    steps: FINALE_PERC_STEPS,    opts:{ gain:0.55, reverb:0.06 } },
        { instrument:'strings', steps: FINALE_PAD_STEPS,     opts:{ dur:4, gain:0.05, attack:0.9, release:1.4, reverb:0.24, voices:5, detune:7, type:'sawtooth', filterFreq:620 } },
      ],
    },
    frozendesert: {
      name: 'The Frozen Desert',
      bpm: 66, stepsPerBeat: 2,
      parts: [
        { instrument:'bass',     steps: FROZENDESERT_BASS_STEPS,     opts:{ dur:1.2, gain:0.12, attack:0.05, release:0.7, filterFreq:240 } },
        { instrument:'icechime', steps: FROZENDESERT_ICECHIME_STEPS, opts:{ dur:1.1, gain:0.13, release:1.6, tremolo:4.5, tremoloDepth:0.35, reverb:0.25, pan:0.1 } },
        { instrument:'perc',     steps: FROZENDESERT_PERC_STEPS,     opts:{ gain:0.25, reverb:0.1 } },
        { instrument:'strings',  steps: FROZENDESERT_PAD_STEPS,      opts:{ dur:6, gain:0.035, attack:1.8, release:2.2, reverb:0.22, voices:4, detune:4, type:'triangle', filterFreq:900 } },
      ],
    },
    badlands: {
      name: 'The Badlands',
      bpm: 80, stepsPerBeat: 2,
      parts: [
        { instrument:'bass',      steps: BADLANDS_BASS_STEPS,      opts:{ dur:0.6, gain:0.16, attack:0.02, release:0.35, filterFreq:280 } },
        { instrument:'harmonica', steps: BADLANDS_HARMONICA_STEPS, opts:{ dur:0.45, gain:0.15, detuneCents:12, reverb:0.1, pan:-0.1 } },
        { instrument:'perc',      steps: BADLANDS_PERC_STEPS,      opts:{ gain:0.42, reverb:0.05 } },
        { instrument:'strings',   steps: BADLANDS_PAD_STEPS,       opts:{ dur:4.5, gain:0.04, attack:1.2, release:1.6, reverb:0.15, voices:4, detune:5, type:'triangle', filterFreq:480 } },
      ],
    },
    beach: {
      name: 'The Beach',
      bpm: 92, stepsPerBeat: 2,
      parts: [
        { instrument:'bass',    steps: BEACH_BASS_STEPS,  opts:{ dur:0.65, gain:0.14, attack:0.02, release:0.4, filterFreq:300 } },
        { instrument:'flute',   steps: BEACH_FLUTE_STEPS, opts:{ dur:0.9, gain:0.13, attack:0.06, release:0.35, breath:0.3, reverb:0.16, pan:0.1, vibrato:4, vibratoDepth:5 } },
        { instrument:'perc',    steps: BEACH_PERC_STEPS,  opts:{ gain:0.35, reverb:0.08 } },
        { instrument:'strings', steps: BEACH_PAD_STEPS,   opts:{ dur:5.5, gain:0.04, attack:1.4, release:1.9, reverb:0.18, voices:4, detune:5, type:'triangle', filterFreq:700 } },
      ],
    },
    ocean: {
      name: 'The Ocean',
      bpm: 76, stepsPerBeat: 2,
      parts: [
        { instrument:'bass',      steps: OCEAN_BASS_STEPS,      opts:{ dur:0.8, gain:0.15, attack:0.03, release:0.5, filterFreq:260 } },
        { instrument:'whalecall', steps: OCEAN_WHALECALL_STEPS, opts:{ dur:2.4, gain:0.12, attack:0.4, release:0.8, bubbles:2, reverb:0.28, pan:-0.1, vibrato:2.5, vibratoDepth:12 } },
        { instrument:'perc',      steps: OCEAN_PERC_STEPS,      opts:{ gain:0.3, reverb:0.1 } },
        { instrument:'strings',   steps: OCEAN_PAD_STEPS,       opts:{ dur:6, gain:0.04, attack:1.6, release:2, reverb:0.2, voices:4, detune:5, type:'triangle', filterFreq:550 } },
      ],
    },
    seafloor: {
      name: 'The Sea Floor',
      bpm: 60, stepsPerBeat: 2,
      parts: [
        { instrument:'bass',    steps: SEAFLOOR_BASS_STEPS, opts:{ dur:1.1, gain:0.13, attack:0.05, release:0.7, filterFreq:220 } },
        { instrument:'gong',    steps: SEAFLOOR_GONG_STEPS, opts:{ dur:2.2, gain:0.11, damping:1400, reverb:0.32, pan:0.1 } },
        { instrument:'perc',    steps: SEAFLOOR_PERC_STEPS, opts:{ gain:0.22, reverb:0.12 } },
        { instrument:'strings', steps: SEAFLOOR_PAD_STEPS,  opts:{ dur:7, gain:0.035, attack:2, release:2.5, reverb:0.25, voices:4, detune:4, type:'triangle', filterFreq:380 } },
      ],
    },
    trench: {
      name: 'The Trench',
      bpm: 70, stepsPerBeat: 2,
      parts: [
        { instrument:'bass',      steps: TRENCH_BASS_STEPS,      opts:{ dur:0.8, gain:0.15, attack:0.03, release:0.5, filterFreq:250 } },
        { instrument:'sonarping', steps: TRENCH_SONARPING_STEPS, opts:{ dur:0.15, gain:0.15, echoTime:0.3, feedback:0.4, echoes:4, reverb:0.12, pan:-0.1 } },
        { instrument:'perc',      steps: TRENCH_PERC_STEPS,      opts:{ gain:0.32, reverb:0.1 } },
        { instrument:'strings',   steps: TRENCH_PAD_STEPS,       opts:{ dur:6, gain:0.04, attack:1.6, release:2, reverb:0.2, voices:4, detune:5, type:'triangle', filterFreq:500 } },
      ],
    },
    trenchdepths: {
      name: 'The Trench Depths',
      bpm: 58, stepsPerBeat: 2,
      parts: [
        { instrument:'bass',    steps: TRENCHDEPTHS_BASS_STEPS,    opts:{ dur:1, gain:0.14, attack:0.04, release:0.6, filterFreq:230 } },
        { instrument:'ringmod', steps: TRENCHDEPTHS_RINGMOD_STEPS, opts:{ dur:0.5, gain:0.12, modRatio:1.4, reverb:0.2, pan:0.1 } },
        { instrument:'perc',    steps: TRENCHDEPTHS_PERC_STEPS,    opts:{ gain:0.24, reverb:0.12 } },
        { instrument:'strings', steps: TRENCHDEPTHS_PAD_STEPS,     opts:{ dur:6.5, gain:0.038, attack:1.8, release:2.2, reverb:0.24, voices:4, detune:4, type:'triangle', filterFreq:420 } },
      ],
    },
    deepdark: {
      name: 'The Deep Dark',
      bpm: 54, stepsPerBeat: 2,
      parts: [
        { instrument:'bass',    steps: DEEPDARK_BASS_STEPS,    opts:{ dur:1.3, gain:0.12, attack:0.06, release:0.8, filterFreq:200 } },
        { instrument:'voidhum', steps: DEEPDARK_VOIDHUM_STEPS, opts:{ dur:4, gain:0.05, grains:16, reverb:0.35, pan:0 } },
        { instrument:'perc',    steps: DEEPDARK_PERC_STEPS,    opts:{ gain:0.2, reverb:0.14 } },
        { instrument:'strings', steps: DEEPDARK_PAD_STEPS,     opts:{ dur:8, gain:0.032, attack:2.2, release:2.8, reverb:0.28, voices:4, detune:4, type:'triangle', filterFreq:320 } },
      ],
    },
    metarealm: {
      name: 'The Meta Realm',
      bpm: 100, stepsPerBeat: 2, swing: 0,
      parts: [
        { instrument:'bass',    steps: METAREALM_BASS_STEPS,   opts:{ dur:0.6, gain:0.15, attack:0.02, release:0.35, filterFreq:320 } },
        { instrument:'glitch',  steps: METAREALM_GLITCH_STEPS, opts:{ gain:0.13, steps:4, stepGap:0.045, reverb:0.15, pan:0 } },
        { instrument:'perc',    steps: METAREALM_PERC_STEPS,   opts:{ gain:0.4, reverb:0.08 } },
        { instrument:'strings', steps: METAREALM_PAD_STEPS,    opts:{ dur:4, gain:0.045, attack:1, release:1.4, reverb:0.16, voices:4, detune:6, type:'triangle', filterFreq:650 } },
      ],
    },
    hyperspace: {
      name: 'Hyperspace',
      bpm: 118, stepsPerBeat: 2, swing: 0,
      parts: [
        { instrument:'bass',      steps: HYPERSPACE_BASS_STEPS,      opts:{ dur:0.45, gain:0.16, attack:0.015, release:0.25, filterFreq:340 } },
        { instrument:'warpsynth', steps: HYPERSPACE_WARPSYNTH_STEPS, opts:{ dur:0.55, gain:0.14, filterFrom:300, filterTo:3800, reverb:0.18, pan:0.1 } },
        { instrument:'perc',      steps: HYPERSPACE_PERC_STEPS,      opts:{ gain:0.48, reverb:0.06 } },
        { instrument:'strings',   steps: HYPERSPACE_PAD_STEPS,       opts:{ dur:3.6, gain:0.045, attack:0.9, release:1.2, reverb:0.16, voices:4, detune:6, type:'triangle', filterFreq:700 } },
      ],
    },
    gutters: {
      name: 'The Gutters',
      bpm: 68, stepsPerBeat: 2,
      parts: [
        { instrument:'bass',    steps: GUTTERS_BASS_STEPS, opts:{ dur:0.8, gain:0.15, attack:0.03, release:0.5, filterFreq:260 } },
        { instrument:'drip',    steps: GUTTERS_DRIP_STEPS, opts:{ dur:0.12, gain:0.15, chorusRate:5, chorusDepth:0.004, reverb:0.22, pan:-0.1 } },
        { instrument:'perc',    steps: GUTTERS_PERC_STEPS, opts:{ gain:0.28, reverb:0.1 } },
        { instrument:'strings', steps: GUTTERS_PAD_STEPS,  opts:{ dur:6, gain:0.04, attack:1.6, release:2, reverb:0.2, voices:4, detune:5, type:'triangle', filterFreq:460 } },
      ],
    },
    sewers: {
      name: 'The Sewers',
      bpm: 64, stepsPerBeat: 2,
      parts: [
        { instrument:'bass',    steps: SEWERS_BASS_STEPS,   opts:{ dur:0.9, gain:0.15, attack:0.04, release:0.55, filterFreq:240 } },
        { instrument:'sludge',  steps: SEWERS_SLUDGE_STEPS, opts:{ dur:0.5, gain:0.13, wahRate:3.2, wahDepth:500, filterBase:900, reverb:0.12, pan:0.1 } },
        { instrument:'perc',    steps: SEWERS_PERC_STEPS,   opts:{ gain:0.34, reverb:0.08 } },
        { instrument:'strings', steps: SEWERS_PAD_STEPS,    opts:{ dur:6.5, gain:0.038, attack:1.7, release:2.1, reverb:0.18, voices:4, detune:5, type:'triangle', filterFreq:350 } },
      ],
    },
    rainforest: {
      name: 'The Rainforest',
      bpm: 88, stepsPerBeat: 2,
      parts: [
        { instrument:'bass',     steps: RAINFOREST_BASS_STEPS,     opts:{ dur:0.6, gain:0.15, attack:0.02, release:0.35, filterFreq:300 } },
        { instrument:'birdcall', steps: RAINFOREST_BIRDCALL_STEPS, opts:{ gain:0.12, trill:22, trillDepth:60, reverb:0.22, pan:0.15 } },
        { instrument:'perc',     steps: RAINFOREST_PERC_STEPS,     opts:{ gain:0.4, reverb:0.08 } },
        { instrument:'strings',  steps: RAINFOREST_PAD_STEPS,      opts:{ dur:4.5, gain:0.042, attack:1.2, release:1.6, reverb:0.2, voices:4, detune:6, type:'triangle', filterFreq:520 } },
      ],
    },
    mangroves: {
      name: 'The Mangroves',
      bpm: 62, stepsPerBeat: 2,
      parts: [
        { instrument:'bass',    steps: MANGROVES_BASS_STEPS,  opts:{ dur:1, gain:0.14, attack:0.04, release:0.6, filterFreq:250 } },
        { instrument:'creak',   steps: MANGROVES_CREAK_STEPS, opts:{ dur:0.7, gain:0.13, filterQ:12, reverb:0.24, pan:-0.1 } },
        { instrument:'perc',    steps: MANGROVES_PERC_STEPS,  opts:{ gain:0.24, reverb:0.12 } },
        { instrument:'strings', steps: MANGROVES_PAD_STEPS,   opts:{ dur:6.5, gain:0.038, attack:1.8, release:2.2, reverb:0.22, voices:4, detune:5, type:'triangle', filterFreq:440 } },
      ],
    },

    floodedundercity: {
      name: 'The Flooded Undercity',
      bpm: 66, stepsPerBeat: 2,
      parts: [
        { instrument:'bass',      steps: FLOODEDUNDERCITY_BASS_STEPS,      opts:{ dur:0.85, gain:0.15, attack:0.03, release:0.5, filterFreq:250 } },
        { instrument:'pipeclang', steps: FLOODEDUNDERCITY_PIPECLANG_STEPS, opts:{ dur:0.7, gain:0.13, release:0.55, hops:4, hopDepth:35, reverb:0.22, pan:-0.12 } },
        { instrument:'perc',      steps: FLOODEDUNDERCITY_PERC_STEPS,      opts:{ gain:0.26, reverb:0.1 } },
        { instrument:'strings',   steps: FLOODEDUNDERCITY_PAD_STEPS,       opts:{ dur:6, gain:0.038, attack:1.6, release:2, reverb:0.2, voices:4, detune:5, type:'triangle', filterFreq:430 } },
      ],
    },
    coralboneyard: {
      name: 'The Coral Boneyard',
      bpm: 72, stepsPerBeat: 2,
      parts: [
        { instrument:'bass',       steps: CORALBONEYARD_BASS_STEPS,       opts:{ dur:0.7, gain:0.15, attack:0.025, release:0.42, filterFreq:270 } },
        { instrument:'coralclick', steps: CORALBONEYARD_CORALCLICK_STEPS, opts:{ gain:0.13, clicks:3, spread:0.02, reverb:0.16, pan:0.12 } },
        { instrument:'perc',       steps: CORALBONEYARD_PERC_STEPS,       opts:{ gain:0.3, reverb:0.08 } },
        { instrument:'strings',    steps: CORALBONEYARD_PAD_STEPS,        opts:{ dur:5.5, gain:0.04, attack:1.4, release:1.9, reverb:0.18, voices:4, detune:5, type:'triangle', filterFreq:480 } },
      ],
    },
    abyssalvents: {
      name: 'The Abyssal Vents',
      bpm: 78, stepsPerBeat: 2,
      parts: [
        { instrument:'bass',       steps: ABYSSALVENTS_BASS_STEPS,       opts:{ dur:0.6, gain:0.16, attack:0.02, release:0.35, filterFreq:290 } },
        { instrument:'ventgurgle', steps: ABYSSALVENTS_VENTGURGLE_STEPS, opts:{ dur:0.45, gain:0.14, reverb:0.15, pan:0.1 } },
        { instrument:'perc',       steps: ABYSSALVENTS_PERC_STEPS,       opts:{ gain:0.36, reverb:0.08 } },
        { instrument:'strings',    steps: ABYSSALVENTS_PAD_STEPS,        opts:{ dur:5, gain:0.042, attack:1.2, release:1.6, reverb:0.18, voices:4, detune:6, type:'triangle', filterFreq:540 } },
      ],
    },
    drownedcathedral: {
      name: 'The Drowned Cathedral',
      bpm: 58, stepsPerBeat: 2,
      parts: [
        { instrument:'bass',       steps: DROWNEDCATHEDRAL_BASS_STEPS,       opts:{ dur:1, gain:0.13, attack:0.04, release:0.6, filterFreq:230 } },
        { instrument:'drownedbell', steps: DROWNEDCATHEDRAL_DROWNEDBELL_STEPS, opts:{ dur:1.4, gain:0.11, release:1.6, sagDepth:40, reverb:0.3, pan:-0.1 } },
        { instrument:'perc',       steps: DROWNEDCATHEDRAL_PERC_STEPS,       opts:{ gain:0.16, reverb:0.14 } },
        { instrument:'strings',    steps: DROWNEDCATHEDRAL_PAD_STEPS,        opts:{ dur:6.5, gain:0.036, attack:1.9, release:2.3, reverb:0.26, voices:4, detune:4, type:'triangle', filterFreq:360 } },
      ],
    },
    blackcurrent: {
      name: 'The Black Current',
      bpm: 52, stepsPerBeat: 2,
      parts: [
        { instrument:'bass',         steps: BLACKCURRENT_BASS_STEPS,         opts:{ dur:1.1, gain:0.13, attack:0.05, release:0.65, filterFreq:210 } },
        { instrument:'currentdrone', steps: BLACKCURRENT_CURRENTDRONE_STEPS, opts:{ dur:3.5, gain:0.045, surges:3, reverb:0.3, pan:0.05 } },
        { instrument:'perc',         steps: BLACKCURRENT_PERC_STEPS,         opts:{ gain:0.18, reverb:0.14 } },
        { instrument:'strings',      steps: BLACKCURRENT_PAD_STEPS,          opts:{ dur:7, gain:0.033, attack:2.1, release:2.6, reverb:0.28, voices:4, detune:4, type:'triangle', filterFreq:310 } },
      ],
    },
    leviathansmaw: {
      name: "The Leviathan's Maw",
      bpm: 48, stepsPerBeat: 2,
      parts: [
        { instrument:'bass',          steps: LEVIATHANSMAW_BASS_STEPS,          opts:{ dur:1.3, gain:0.12, attack:0.06, release:0.8, filterFreq:190 } },
        { instrument:'leviathanmoan', steps: LEVIATHANSMAW_LEVIATHANMOAN_STEPS, opts:{ dur:2.6, gain:0.12, glideDown:0.6, breathRate:0.6, breathDepth:0.4, reverb:0.3, pan:0 } },
        { instrument:'perc',          steps: LEVIATHANSMAW_PERC_STEPS,          opts:{ gain:0.14, reverb:0.16 } },
        { instrument:'strings',       steps: LEVIATHANSMAW_PAD_STEPS,           opts:{ dur:8, gain:0.03, attack:2.4, release:3, reverb:0.3, voices:4, detune:4, type:'triangle', filterFreq:280 } },
      ],
    },
    observatory: {
      name: 'Observatory',
      bpm: 72, stepsPerBeat: 2,
      parts: [
        { instrument:'bass',     steps: OBSERVATORY_BASS_STEPS,     opts:{ dur:0.8, gain:0.15, attack:0.03, release:0.5, filterFreq:250 } },
        { instrument:'stardust', steps: OBSERVATORY_STARDUST_STEPS, opts:{ dur:1.3, gain:0.05, twinkles:8, reverb:0.28, pan:0.1 } },
        { instrument:'perc',     steps: OBSERVATORY_PERC_STEPS,     opts:{ gain:0.26, reverb:0.12 } },
        { instrument:'strings',  steps: OBSERVATORY_PAD_STEPS,      opts:{ dur:6, gain:0.038, attack:1.6, release:2, reverb:0.22, voices:4, detune:5, type:'triangle', filterFreq:420 } },
      ],
    },
    orrery: {
      name: 'Orrery',
      bpm: 96, stepsPerBeat: 2, swing: 0,
      parts: [
        { instrument:'bass',      steps: ORRERY_BASS_STEPS,      opts:{ dur:0.6, gain:0.15, attack:0.02, release:0.35, filterFreq:310 } },
        { instrument:'clockwork', steps: ORRERY_CLOCKWORK_STEPS, opts:{ gain:0.13, ticks:5, startGap:0.09, gapRatio:0.7, reverb:0.12, pan:-0.1 } },
        { instrument:'perc',      steps: ORRERY_PERC_STEPS,      opts:{ gain:0.4, reverb:0.06 } },
        { instrument:'strings',   steps: ORRERY_PAD_STEPS,       opts:{ dur:4, gain:0.045, attack:1, release:1.4, reverb:0.16, voices:4, detune:6, type:'triangle', filterFreq:600 } },
      ],
    },
    voidbetween: {
      name: 'The Void Between',
      bpm: 56, stepsPerBeat: 2,
      parts: [
        { instrument:'bass',    steps: VOIDBETWEEN_BASS_STEPS,  opts:{ dur:1.2, gain:0.13, attack:0.05, release:0.7, filterFreq:210 } },
        { instrument:'drift',   steps: VOIDBETWEEN_DRIFT_STEPS, opts:{ dur:4, gain:0.045, panRate:0.15, panDepth:0.6, reverb:0.34, } },
        { instrument:'perc',    steps: VOIDBETWEEN_PERC_STEPS,  opts:{ gain:0.2, reverb:0.14 } },
        { instrument:'strings', steps: VOIDBETWEEN_PAD_STEPS,   opts:{ dur:7.5, gain:0.032, attack:2.1, release:2.6, reverb:0.26, voices:4, detune:4, type:'triangle', filterFreq:340 } },
      ],
    },
    bossroom: {
      name: 'Boss Room',
      bpm: 136, stepsPerBeat: 2, swing: 0, altSectionLoops: 4,
      parts: [
        { instrument:'bass',    steps: BOSSROOM_BASS_GRIND,   altSteps: BOSSROOM_BASS_ASSAULT,   opts:{ dur:0.32, gain:0.17, attack:0.01, release:0.18, filterFreq:340 } },
        { instrument:'growl',   steps: BOSSROOM_GROWL_GRIND,  altSteps: BOSSROOM_GROWL_ASSAULT,  opts:{ dur:0.13, gain:0.13, attack:0.004, release:0.07, drive:7, filterFreq:1700, reverb:0.06, pan:0 } },
        { instrument:'perc',    steps: BOSSROOM_PERC_GRIND,   altSteps: BOSSROOM_PERC_ASSAULT,   opts:{ gain:0.5, reverb:0.04 } },
        { instrument:'stab',    steps: BOSSROOM_STAB_SILENT,  altSteps: BOSSROOM_STAB_ASSAULT,   opts:{ dur:0.2, gain:0.16, drive:8, filterFreq:2400, reverb:0.1, pan:0 } },
        { instrument:'strings', steps: BOSSROOM_PAD_GRIND,    altSteps: BOSSROOM_PAD_ASSAULT,    opts:{ dur:3.5, gain:0.025, attack:0.8, release:1, reverb:0.1, voices:4, detune:6, type:'sawtooth', filterFreq:400 } },
      ],
    },
    crystalroom: {
      name: 'Crystal Room',
      bpm: 70, stepsPerBeat: 2,
      parts: [
        { instrument:'bass',     steps: CRYSTALROOM_BASS_STEPS,     opts:{ dur:1, gain:0.12, attack:0.05, release:0.6, filterFreq:280 } },
        { instrument:'icechime', steps: CRYSTALROOM_ICECHIME_STEPS, opts:{ dur:1, gain:0.13, release:1.3, tremolo:4, tremoloDepth:0.3, reverb:0.28, pan:0.05 } },
        { instrument:'perc',     steps: CRYSTALROOM_PERC_STEPS,     opts:{ gain:0.22, reverb:0.14 } },
        { instrument:'choir',    steps: CRYSTALROOM_PAD_STEPS,      opts:{ dur:5, gain:0.05, attack:1.3, release:1.8, reverb:0.26 } },
      ],
    },
    sombraroom: {
      name: 'Sombra Room',
      bpm: 66, stepsPerBeat: 2,
      parts: [
        { instrument:'bass',    steps: SOMBRAROOM_BASS_STEPS,    opts:{ dur:1, gain:0.13, attack:0.04, release:0.6, filterFreq:230 } },
        { instrument:'ringmod', steps: SOMBRAROOM_RINGMOD_STEPS, opts:{ dur:0.5, gain:0.11, modRatio:1.6, reverb:0.2, pan:-0.1 } },
        { instrument:'perc',    steps: SOMBRAROOM_PERC_STEPS,    opts:{ gain:0.28, reverb:0.12 } },
        { instrument:'strings', steps: SOMBRAROOM_PAD_STEPS,     opts:{ dur:5, gain:0.036, attack:1.5, release:2, reverb:0.22, voices:4, detune:5, type:'triangle', filterFreq:400 } },
      ],
    },
    treasureroom: {
      name: 'Treasure Room',
      bpm: 100, stepsPerBeat: 2,
      parts: [
        { instrument:'bass',    steps: TREASUREROOM_BASS_STEPS,    opts:{ dur:0.6, gain:0.15, attack:0.02, release:0.35, filterFreq:320 } },
        { instrument:'trumpet', steps: TREASUREROOM_TRUMPET_STEPS, opts:{ dur:0.5, gain:0.15, attack:0.03, release:0.18, reverb:0.2, pan:0.1, vibrato:5, vibratoDepth:6 } },
        { instrument:'perc',    steps: TREASUREROOM_PERC_STEPS,    opts:{ gain:0.42, reverb:0.08 } },
        { instrument:'strings', steps: TREASUREROOM_PAD_STEPS,     opts:{ dur:3.5, gain:0.045, attack:0.9, release:1.2, reverb:0.16, voices:4, detune:6, type:'triangle', filterFreq:650 } },
      ],
    },
    secretroom: {
      name: 'Secret Room',
      bpm: 64, stepsPerBeat: 2,
      parts: [
        { instrument:'bass',    steps: SECRETROOM_BASS_STEPS,   opts:{ dur:1, gain:0.12, attack:0.04, release:0.6, filterFreq:220 } },
        { instrument:'mallet',  steps: SECRETROOM_MALLET_STEPS, opts:{ dur:0.6, gain:0.13, attack:0.003, release:0.45, reverb:0.2, pan:-0.1, filterFreq:1200 } },
        { instrument:'perc',    steps: SECRETROOM_PERC_STEPS,   opts:{ gain:0.22, reverb:0.12 } },
        { instrument:'strings', steps: SECRETROOM_PAD_STEPS,    opts:{ dur:5.5, gain:0.034, attack:1.6, release:2, reverb:0.22, voices:4, detune:4, type:'triangle', filterFreq:360 } },
      ],
    },
    shoproom: {
      name: 'Shop',
      bpm: 108, stepsPerBeat: 2,
      parts: [
        { instrument:'bass',    steps: SHOP_BASS_STEPS,  opts:{ dur:0.5, gain:0.15, attack:0.015, release:0.3, filterFreq:320 } },
        { instrument:'piano',   steps: SHOP_PIANO_STEPS, opts:{ dur:0.5, gain:0.12, release:0.4, reverb:0.1, filterFreq:2600, pan:0.05 } },
        { instrument:'perc',    steps: SHOP_PERC_STEPS,  opts:{ gain:0.4, reverb:0.06 } },
        { instrument:'strings', steps: SHOP_PAD_STEPS,   opts:{ dur:3, gain:0.045, attack:0.7, release:1, reverb:0.14, voices:4, detune:6, type:'triangle', filterFreq:700 } },
      ],
    },
  };

  const MUSIC_LOOKAHEAD = 0.12;
  const MUSIC_SCHEDULE_INTERVAL = 30;
  let musicState = null;

  function playMusicNote(instrument, note, opts, delay){
    const merged = { ...opts, delay };
    if (instrument === 'perc') perc(note, merged);
    else if (instrument === 'pluck') pluck(note, merged);
    else if (instrument === 'fm') fm(note, merged);
    else if (instrument === 'bass') bass(note, merged);
    else if (instrument === 'strings') strings(note, merged);
    else if (instrument === 'mallet') mallet(note, merged);
    else if (instrument === 'choir') choir(note, merged);
    else if (instrument === 'piano') piano(note, merged);
    else if (instrument === 'trumpet') trumpet(note, merged);
    else if (instrument === 'zunpet') zunpet(note, merged);
    else if (instrument === 'banjo') banjo(note, merged);
    else if (instrument === 'growl') growl(note, merged);
    else if (instrument === 'stab') stab(note, merged);
    else if (instrument === 'icechime') icechime(note, merged);
    else if (instrument === 'harmonica') harmonica(note, merged);
    else if (instrument === 'flute') flute(note, merged);
    else if (instrument === 'whalecall') whalecall(note, merged);
    else if (instrument === 'gong') gong(note, merged);
    else if (instrument === 'sonarping') sonarping(note, merged);
    else if (instrument === 'ringmod') ringmod(note, merged);
    else if (instrument === 'voidhum') voidhum(note, merged);
    else if (instrument === 'glitch') glitch(note, merged);
    else if (instrument === 'warpsynth') warpsynth(note, merged);
    else if (instrument === 'drip') drip(note, merged);
    else if (instrument === 'sludge') sludge(note, merged);
    else if (instrument === 'birdcall') birdcall(note, merged);
    else if (instrument === 'creak') creak(note, merged);
    else if (instrument === 'stardust') stardust(note, merged);
    else if (instrument === 'clockwork') clockwork(note, merged);
    else if (instrument === 'drift') drift(note, merged);
    else if (instrument === 'pipeclang') pipeclang(note, merged);
    else if (instrument === 'coralclick') coralclick(note, merged);
    else if (instrument === 'ventgurgle') ventgurgle(note, merged);
    else if (instrument === 'drownedbell') drownedbell(note, merged);
    else if (instrument === 'currentdrone') currentdrone(note, merged);
    else if (instrument === 'leviathanmoan') leviathanmoan(note, merged);
    else tone(note, { ...merged, type: instrument });
  }

  function scheduleMusicStep(track, stepIndex, t0, bus, secPerStep){
    const nowDelay = Math.max(0, t0 - ctx.currentTime);
    const stepsPerBeat = track.stepsPerBeat || 1;
    const beatPos = stepIndex % stepsPerBeat;
    const isOnBeat = beatPos === 0;
    const isDownbeat = isOnBeat && Math.floor(stepIndex / stepsPerBeat) % 4 === 0;
    const accent = isDownbeat ? 1.15 : isOnBeat ? 1.0 : 0.88;
    const swingAmt = track.swing !== undefined ? track.swing : 0.1;
    const swingDelay = (!isOnBeat && swingAmt) ? swingAmt * secPerStep * 0.33 : 0;
    const timingJitter = Util.rand(-0.012, 0.012);
    for (const part of track.parts) {
      const len = part.steps.length;
      const idx = stepIndex % len;
      const loopIndex = Math.floor(stepIndex / len);
      const inAltSection = part.altSteps && Math.floor(loopIndex / (track.altSectionLoops || 4)) % 2 === 1;
      const activeSteps = inAltSection ? part.altSteps : part.steps;
      let step = activeSteps[idx];

      if (part.instrument === 'perc' && step == null) {
        if (loopIndex % 4 === 3 && idx >= len - 4) step = 'hat';
      }
      if (step == null) continue;
      const notes = Array.isArray(step) ? step : [step];
      let gainMul = accent * (0.94 + Math.random() * 0.12);
      if (part.instrument === 'strings' || part.instrument === 'choir') {
        gainMul *= 0.88 + 0.12 * Math.sin(stepIndex * 0.05);
      }
      for (const note of notes) {
        const opts = { ...part.opts, bus };
        if (typeof opts.gain === 'number') opts.gain *= gainMul;
        playMusicNote(part.instrument, note, opts, nowDelay + timingJitter + swingDelay);
      }
    }
  }

  function scheduleMusicTick(){
    if (!musicState) return;
    while (musicState.nextStepTime < ctx.currentTime + MUSIC_LOOKAHEAD) {
      scheduleMusicStep(musicState.track, musicState.stepIndex, musicState.nextStepTime, musicState.bus, musicState.secPerStep);
      musicState.nextStepTime += musicState.secPerStep;
      musicState.stepIndex++;
    }
  }

  function startMusic(trackId){
    const c = ensureCtx(); if (!c) return;
    if (musicState && musicState.trackId === trackId) return;
    if (musicState) stopMusic();
    const track = MUSIC_TRACKS[trackId];
    if (!track) return;
    const bus = c.createGain();
    bus.gain.setValueAtTime(0, c.currentTime);
    bus.gain.linearRampToValueAtTime(1, c.currentTime + 2);
    bus.connect(musicGain);
    const secPerStep = (60 / track.bpm) / (track.stepsPerBeat || 1);
    musicState = { trackId, track, secPerStep, bus, nextStepTime: c.currentTime + 0.1, stepIndex: 0, timerId: null };
    musicState.timerId = setInterval(scheduleMusicTick, MUSIC_SCHEDULE_INTERVAL);
    scheduleMusicTick();
  }

  function stopMusic(){
    if (!musicState) return;
    const { bus, timerId } = musicState;
    clearInterval(timerId);
    if (ctx) {
      const t = ctx.currentTime;
      bus.gain.cancelScheduledValues(t);
      bus.gain.setValueAtTime(bus.gain.value, t);
      bus.gain.linearRampToValueAtTime(0, t + 1.5);
      setTimeout(() => { try { bus.disconnect(); } catch (e) {  } }, 1600);
    }
    musicState = null;
  }

  function listMusicTracks(){
    return Object.keys(MUSIC_TRACKS).map(id => ({ id, name: MUSIC_TRACKS[id].name || id }));
  }
  function currentMusicTrackId(){ return musicState ? musicState.trackId : null; }

  function scatterPan(spread){ return Util.rand(-spread, spread); }

  const SFX = {

    coin(){ tone(760, { type:'triangle', dur:0.05, gain:0.22, sweepTo:1100, release:0.06, reverb:0.08 }); },
    coinNickel(){ chord([620,900], { type:'triangle', gain:0.22, dur:0.06, release:0.08, stagger:0.03, reverb:0.1 }); },
    coinDime(){ chord([700,980,1300], { type:'triangle', gain:0.2, dur:0.06, release:0.1, stagger:0.035, reverb:0.12 }); },

    coinLucky(){
      fm(880, { ratio:1.5, index:120, dur:0.14, gain:0.16, release:0.22, reverb:0.3 });
      fm(1318, { ratio:1.5, index:100, dur:0.12, gain:0.12, delay:0.06, release:0.2, reverb:0.3 });
      tone(1760, { type:'sine', gain:0.08, dur:0.12, delay:0.12, release:0.2, reverb:0.2 });
    },
    key(){
      noise({ dur:0.03, gain:0.18, filterFreq:3200, filterType:'highpass', release:0.05, reverb:0.08 });
      tone(1400, { type:'square', dur:0.04, gain:0.12, delay:0.02, release:0.05 });
    },
    bombPickup(){ tone(160, { type:'sine', dur:0.09, gain:0.28, sweepTo:110, release:0.05 }); },

    heart(){ chord([520,780], { type:'bell', gain:0.2, dur:0.14, release:0.18, stagger:0.06, reverb:0.2 }); },
    heartContainer(){ chord([520,780,1040], { type:'bell', gain:0.22, dur:0.16, release:0.24, stagger:0.06, reverb:0.25 }); },

    itemGet(){ chord([660,880,1100,1320], { type:'organ', gain:0.15, dur:0.12, release:0.24, stagger:0.055, reverb:0.22 }); },
    sack(){
      noise({ dur:0.06, gain:0.14, filterFreq:600, filterType:'lowpass', release:0.06 });
      chord([500,700,900], { type:'triangle', gain:0.14, dur:0.07, delay:0.05, release:0.14, stagger:0.045, reverb:0.1 });
    },
    battery(){ chord([440,660], { type:'square', gain:0.14, dur:0.08, release:0.16, stagger:0.06, detune:-6 }); },

    chestOpen(){
      noise({ dur:0.18, gain:0.2, filterFreq:400, filterType:'lowpass', filterSweepTo:900, release:0.1 });
      chord([700,1050], { type:'bell', gain:0.15, dur:0.1, delay:0.12, release:0.2, stagger:0.05, reverb:0.3 });
    },
    shopBuy(){ chord([660,990], { type:'triangle', gain:0.18, dur:0.07, release:0.12, stagger:0.05, reverb:0.12 }); },
    activeUse(){ chord([500,760,1020], { type:'sine', gain:0.18, dur:0.1, release:0.2, stagger:0.04, reverb:0.15 }); },

    meleeSwing(){ noise({ dur:0.06, gain:0.16, filterFreq:2200, filterType:'bandpass', filterSweepTo:600, filterQ:0.7, release:0.03, pan:scatterPan(0.25) }); },
    rangedShot(){ tone(900, { type:'sawtooth', dur:0.07, gain:0.14, sweepTo:280, release:0.04, pan:scatterPan(0.2) }); },
    laserShot(){
      tone(1800, { type:'sawtooth', dur:0.1, gain:0.12, sweepTo:900, release:0.06, pan:scatterPan(0.2) });
      noise({ dur:0.08, gain:0.08, filterFreq:4000, filterType:'highpass', release:0.05 });
    },
    enemyHit(){ noise({ dur:0.04, gain:0.16, filterFreq:1400, filterType:'bandpass', release:0.03, pan:scatterPan(0.3) }); },
    crit(){
      noise({ dur:0.05, gain:0.2, filterFreq:1800, filterType:'bandpass', release:0.03, pan:scatterPan(0.3) });
      tone(1500, { type:'square', dur:0.04, gain:0.1, delay:0.01, release:0.04 });
    },
    enemyDeath(){
      noise({ dur:0.12, gain:0.22, filterFreq:900, filterType:'lowpass', filterSweepTo:150, release:0.1, reverb:0.1, pan:scatterPan(0.3) });
      tone(220, { type:'sawtooth', dur:0.1, gain:0.12, sweepTo:60, release:0.08 });
    },

    bossDeath(){
      noise({ dur:0.4, gain:0.3, filterFreq:1200, filterType:'lowpass', filterSweepTo:80, release:0.35, reverb:0.25 });
      chord([180,140,90], { type:'brass', gain:0.18, dur:0.32, release:0.35, stagger:0.09, reverb:0.3 });
    },
    playerHurt(){ noise({ dur:0.08, gain:0.24, filterFreq:1000, filterType:'lowpass', filterSweepTo:300, release:0.08 }); },
    shieldBlock(){
      tone(500, { type:'square', dur:0.05, gain:0.18, sweepTo:800, release:0.05 });
      noise({ dur:0.04, gain:0.1, filterFreq:2500, filterType:'highpass', release:0.03 });
    },
    dodge(){ tone(700, { type:'sine', dur:0.06, gain:0.14, sweepTo:1100, release:0.08 }); },
    flashpowder(){ noise({ dur:0.1, gain:0.24, filterFreq:3000, filterType:'highpass', release:0.12 }); },

    bombPlace(){ tone(300, { type:'square', dur:0.04, gain:0.12, sweepTo:500, release:0.04 }); },
    explosion(){
      noise({ dur:0.32, gain:0.32, filterFreq:1400, filterType:'lowpass', filterSweepTo:90, release:0.3, reverb:0.2 });
      tone(90, { type:'sine', dur:0.28, gain:0.2, release:0.3 });
    },

    bombExplode(){
      noise({ dur:0.14, gain:0.28, filterFreq:1600, filterType:'lowpass', filterSweepTo:200, release:0.16, reverb:0.15 });
      tone(140, { type:'sine', dur:0.12, gain:0.18, sweepTo:55, release:0.12 });
    },
    obstacleHit(){ noise({ dur:0.05, gain:0.16, filterFreq:2000, filterType:'bandpass', release:0.04 }); },
    obstacleDestroy(){ noise({ dur:0.16, gain:0.22, filterFreq:800, filterType:'lowpass', filterSweepTo:200, release:0.14, reverb:0.1 }); },

    statusPoison(){ tone(320, { type:'sine', dur:0.09, gain:0.12, sweepTo:220, release:0.1 }); },
    statusStun(){ chord([1200,900], { type:'square', gain:0.1, dur:0.04, release:0.06, stagger:0.05 }); },

    statusFreeze(){ chord([1600,2000,2400], { type:'bell', gain:0.09, dur:0.08, release:0.14, stagger:0.03, reverb:0.15 }); },
    statusFear(){ tone(180, { type:'sawtooth', dur:0.14, gain:0.12, sweepTo:90, release:0.12 }); },
    statusCharm(){ chord([900,1200], { type:'sine', gain:0.12, dur:0.08, release:0.14, stagger:0.06, reverb:0.1 }); },

    roomClear(){ chord([523,659,784,1046], { type:'brass', gain:0.16, dur:0.14, release:0.24, stagger:0.07, reverb:0.2 }); },
    secretOpen(){ noise({ dur:0.35, gain:0.2, filterFreq:500, filterType:'lowpass', filterSweepTo:150, release:0.3, reverb:0.3 }); },

    bossIntro(){
      chord([110,146,110], { type:'sawtooth', gain:0.2, dur:0.3, release:0.2, stagger:0.14 });
      fm(55, { ratio:0.5, index:60, dur:0.4, gain:0.14, release:0.3, reverb:0.25 });
    },

    unlock(){ chord([660,880,1100,1320,1600], { type:'bell', gain:0.15, dur:0.16, release:0.28, stagger:0.06, reverb:0.28 }); },

    achievement(){
      chord([523,659,784], { type:'brass', gain:0.17, dur:0.15, release:0.2, stagger:0.08, reverb:0.22 });
      fm(1046, { ratio:1.4, index:130, gain:0.14, dur:0.2, delay:0.24, release:0.3, reverb:0.22 });
    },
    descend(){ tone(500, { type:'sine', dur:0.22, gain:0.16, sweepTo:160, release:0.14, reverb:0.18 }); },

    gameOver(){ chord([392,349,294,220], { type:'organ', gain:0.2, dur:0.3, release:0.32, stagger:0.18, reverb:0.3 }); },

    winFanfare(){ chord([523,659,784,1046,1318], { type:'brass', gain:0.19, dur:0.2, release:0.32, stagger:0.11, reverb:0.28 }); },

    uiClick(){ tone(700, { type:'square', dur:0.02, gain:0.1, sweepTo:900, release:0.03 }); },
    uiDeny(){ tone(160, { type:'square', dur:0.08, gain:0.14, release:0.05 }); },

    machineWhiff(){ tone(500, { type:'sine', dur:0.14, gain:0.14, sweepTo:260, release:0.12 }); },

    skillPointGain(){
      fm(1046, { ratio:1.4, index:180, dur:0.16, gain:0.16, release:0.22, reverb:0.25 });
      fm(1568, { ratio:1.4, index:140, dur:0.14, gain:0.1, delay:0.05, release:0.2, reverb:0.25 });
    },

    ascensionChime(){
      chord([220,330,440], { type:'organ', gain:0.16, dur:0.22, release:0.4, stagger:0.06, reverb:0.35 });
    },

    stringPluck(freq){ pluck(freq || 440, { dur:0.5, gain:0.22, reverb:0.3 }); },
  };

  function play(name, ...args){
    if (muted) return;
    const fn = SFX[name];
    if (!fn) return;
    try { fn(...args); } catch (e) {  }
  }

  function guardMute(fn){ return (...args) => { if (!muted) fn(...args); }; }

  return {
    play, unlock, suspend, resume, toggleMute, isMuted, setVolume, getVolume,
    setMusicVolume, getMusicVolume, setSfxVolume, getSfxVolume, startAmbient, stopAmbient,
    startMusic, stopMusic, listMusicTracks, currentMusicTrackId,
    tone: guardMute(tone), noise: guardMute(noise), fm: guardMute(fm), pluck: guardMute(pluck), chord: guardMute(chord),
    bass: guardMute(bass), perc: guardMute(perc),
    strings: guardMute(strings), mallet: guardMute(mallet), choir: guardMute(choir),
    piano: guardMute(piano), trumpet: guardMute(trumpet), zunpet: guardMute(zunpet), banjo: guardMute(banjo),
    growl: guardMute(growl), stab: guardMute(stab), icechime: guardMute(icechime),
    harmonica: guardMute(harmonica), flute: guardMute(flute),
    whalecall: guardMute(whalecall), gong: guardMute(gong),
    sonarping: guardMute(sonarping), ringmod: guardMute(ringmod), voidhum: guardMute(voidhum),
    glitch: guardMute(glitch), warpsynth: guardMute(warpsynth),
    drip: guardMute(drip), sludge: guardMute(sludge), birdcall: guardMute(birdcall), creak: guardMute(creak),
    stardust: guardMute(stardust), clockwork: guardMute(clockwork), drift: guardMute(drift),
    pipeclang: guardMute(pipeclang), coralclick: guardMute(coralclick), ventgurgle: guardMute(ventgurgle),
    drownedbell: guardMute(drownedbell), currentdrone: guardMute(currentdrone), leviathanmoan: guardMute(leviathanmoan),
  };
})();
