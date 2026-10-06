(function () {
  'use strict';
  const SOUNDS = {
    hit: { gap: 0.045, gain: 0.05, voices: [{ type: 'triangle', f: 520, f2: 300, dur: 0.06 }], noise: 0.02 },
    crit: { gap: 0.08, gain: 0.09, voices: [{ type: 'square', f: 1100, f2: 1500, dur: 0.07 }, { type: 'triangle', f: 1650, f2: 2200, dur: 0.09, at: 0.02 }] },
    kill: { gap: 0.05, gain: 0.08, voices: [{ type: 'sine', f: 330, f2: 110, dur: 0.14 }], noise: 0.06 },
    leak: { gap: 0.2, gain: 0.12, voices: [{ type: 'sawtooth', f: 180, f2: 90, dur: 0.25 }] },
    place: { gap: 0.05, gain: 0.12, voices: [{ type: 'triangle', f: 392, dur: 0.09 }, { type: 'triangle', f: 587, dur: 0.12, at: 0.07 }] },
    upgrade: { gap: 0.05, gain: 0.11, voices: [{ type: 'sine', f: 523, dur: 0.08 }, { type: 'sine', f: 659, dur: 0.08, at: 0.06 }, { type: 'sine', f: 784, dur: 0.14, at: 0.12 }] },
    sell: { gap: 0.1, gain: 0.11, voices: [{ type: 'triangle', f: 660, f2: 330, dur: 0.18 }] },
    boss: { gap: 1, gain: 0.2, voices: [{ type: 'sawtooth', f: 82, f2: 62, dur: 0.9 }, { type: 'square', f: 123, f2: 92, dur: 0.9, at: 0.05 }, { type: 'sine', f: 41, dur: 1.1 }] },
    bossDown: { gap: 1, gain: 0.16, voices: [{ type: 'triangle', f: 392, dur: 0.15 }, { type: 'triangle', f: 523, dur: 0.15, at: 0.12 }, { type: 'triangle', f: 784, dur: 0.4, at: 0.24 }], noise: 0.25 },
    win: { gap: 1, gain: 0.13, voices: [{ type: 'sine', f: 523, dur: 0.14 }, { type: 'sine', f: 659, dur: 0.14, at: 0.12 }, { type: 'sine', f: 784, dur: 0.14, at: 0.24 }, { type: 'sine', f: 1047, dur: 0.35, at: 0.36 }] },
    lose: { gap: 1, gain: 0.13, voices: [{ type: 'triangle', f: 392, f2: 370, dur: 0.25 }, { type: 'triangle', f: 330, f2: 311, dur: 0.25, at: 0.22 }, { type: 'triangle', f: 262, f2: 196, dur: 0.6, at: 0.44 }] },
    click: { gap: 0.03, gain: 0.06, voices: [{ type: 'square', f: 880, dur: 0.03 }] },
    wind: { gap: 2, gain: 0.07, voices: [{ type: 'sine', f: 180, f2: 120, dur: 0.9 }], noise: 0.9 },
    starup: { gap: 1, gain: 0.16, voices: [{ type: 'triangle', f: 523, dur: 0.14 }, { type: 'triangle', f: 659, dur: 0.14, at: 0.12 }, { type: 'triangle', f: 784, dur: 0.14, at: 0.24 }, { type: 'sine', f: 1047, dur: 0.2, at: 0.36 }, { type: 'sine', f: 1319, f2: 1568, dur: 0.6, at: 0.5 }, { type: 'sine', f: 2093, dur: 0.5, at: 0.62 }], noise: 0.03 },
    research: { gap: 0.1, gain: 0.12, voices: [{ type: 'sine', f: 880, dur: 0.08 }, { type: 'sine', f: 1319, dur: 0.18, at: 0.07 }] },
    unlocked: { gap: 1, gain: 0.14, voices: [{ type: 'sine', f: 659, dur: 0.12 }, { type: 'sine', f: 880, dur: 0.12, at: 0.1 }, { type: 'sine', f: 1175, dur: 0.12, at: 0.2 }, { type: 'triangle', f: 1319, dur: 0.45, at: 0.3 }] },
    chirp: { gap: 0.09, gain: 0.04, voices: [{ type: 'sine', f: 2600, f2: 4200, dur: 0.04 }, { type: 'sine', f: 3400, f2: 5200, dur: 0.03, at: 0.035 }] },
    chime: { gap: 0.1, gain: 0.05, voices: [{ type: 'sine', f: 1568, dur: 0.18 }, { type: 'triangle', f: 2349, dur: 0.22, at: 0.02 }] },
    sonar: { gap: 0.6, gain: 0.08, voices: [{ type: 'sine', f: 1800, f2: 900, dur: 0.35 }, { type: 'sine', f: 1800, f2: 900, dur: 0.3, at: 0.18 }] },
    swarm: { gap: 0.6, gain: 0.07, voices: [{ type: 'square', f: 3000, f2: 4400, dur: 0.05 }, { type: 'square', f: 2800, f2: 4000, dur: 0.05, at: 0.06 }, { type: 'square', f: 3200, f2: 4600, dur: 0.05, at: 0.12 }], noise: 0.15 },
    bloodmoon: { gap: 1, gain: 0.12, voices: [{ type: 'sawtooth', f: 110, f2: 220, dur: 0.6 }, { type: 'sine', f: 440, f2: 330, dur: 0.6, at: 0.1 }] },
    screech: { gap: 0.6, gain: 0.08, voices: [{ type: 'sawtooth', f: 2400, f2: 900, dur: 0.3 }, { type: 'square', f: 3100, f2: 1200, dur: 0.25, at: 0.03 }], noise: 0.2 },
    chorus: { gap: 0.8, gain: 0.09, voices: [{ type: 'sine', f: 1047, dur: 0.5 }, { type: 'sine', f: 1319, dur: 0.5, at: 0.05 }, { type: 'sine', f: 1568, dur: 0.6, at: 0.1 }] },
    quake: { gap: 0.4, gain: 0.1, voices: [{ type: 'triangle', f: 140, f2: 60, dur: 0.3 }, { type: 'sine', f: 2093, dur: 0.12, at: 0.02 }], noise: 0.2 },
    cataclysm: { gap: 0.8, gain: 0.13, voices: [{ type: 'sawtooth', f: 90, f2: 40, dur: 0.6 }, { type: 'sine', f: 2637, f2: 1760, dur: 0.4, at: 0.05 }], noise: 0.4 },
    heal: { gap: 0.5, gain: 0.05, voices: [{ type: 'sine', f: 660, f2: 990, dur: 0.18 }, { type: 'sine', f: 880, f2: 1320, dur: 0.2, at: 0.06 }] },
    shield: { gap: 0.25, gain: 0.07, voices: [{ type: 'triangle', f: 1400, f2: 500, dur: 0.16 }], noise: 0.08 },
    split: { gap: 0.2, gain: 0.07, voices: [{ type: 'square', f: 300, f2: 600, dur: 0.06 }, { type: 'square', f: 450, f2: 900, dur: 0.06, at: 0.05 }] },
    burrow: { gap: 0.5, gain: 0.06, voices: [{ type: 'triangle', f: 110, f2: 70, dur: 0.22 }], noise: 0.25 },
    codex: { gap: 0.5, gain: 0.07, voices: [{ type: 'sine', f: 784, dur: 0.1 }, { type: 'triangle', f: 1175, dur: 0.2, at: 0.08 }] },
    levelup: { gap: 0.4, gain: 0.13, voices: [{ type: 'triangle', f: 587, dur: 0.1 }, { type: 'triangle', f: 784, dur: 0.1, at: 0.08 }, { type: 'triangle', f: 988, dur: 0.1, at: 0.16 }, { type: 'sine', f: 1175, f2: 1568, dur: 0.35, at: 0.24 }] },
    cast: { gap: 0.15, gain: 0.09, voices: [{ type: 'sine', f: 660, f2: 1320, dur: 0.16 }, { type: 'triangle', f: 990, f2: 1980, dur: 0.14, at: 0.04 }], noise: 0.05 },
    roar: { gap: 1, gain: 0.13, voices: [{ type: 'sawtooth', f: 140, f2: 70, dur: 0.55 }, { type: 'square', f: 95, f2: 60, dur: 0.5, at: 0.03 }], noise: 0.35 },
    herostun: { gap: 0.8, gain: 0.08, voices: [{ type: 'sine', f: 1200, f2: 800, dur: 0.12 }, { type: 'sine', f: 1000, f2: 600, dur: 0.14, at: 0.12 }, { type: 'sine', f: 800, f2: 400, dur: 0.2, at: 0.26 }] },
    ach: { gap: 0.6, gain: 0.12, voices: [{ type: 'triangle', f: 784, dur: 0.1 }, { type: 'triangle', f: 988, dur: 0.1, at: 0.09 }, { type: 'sine', f: 1319, dur: 0.12, at: 0.18 }, { type: 'sine', f: 1568, f2: 2093, dur: 0.45, at: 0.27 }], noise: 0.02 },
    deny: { gap: 0.15, gain: 0.08, voices: [{ type: 'square', f: 160, dur: 0.08 }, { type: 'square', f: 120, dur: 0.1, at: 0.09 }] },
  };
  const MAX_VOICES = 24;

  const A = {
    ctx: null, master: null, noiseBuf: null, enabled: true, vol: 0.6, last: {}, live: 0,
    unlock() {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.enabled ? this.vol : 0;
        const comp = this.ctx.createDynamicsCompressor();
        this.master.connect(comp);
        comp.connect(this.ctx.destination);
        const len = Math.floor(this.ctx.sampleRate * 0.3);
        this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noiseBuf.getChannelData(0);
        let s = 12345;
        for (let i = 0; i < len; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; d[i] = (s / 0x3fffffff - 1) * (1 - i / len); }
      } catch (err) { this.ctx = null; }
    },
    set(enabled, vol) {
      this.enabled = !!enabled;
      if (typeof vol === 'number') this.vol = Math.max(0, Math.min(1, vol));
      if (this.master) this.master.gain.setTargetAtTime(this.enabled ? this.vol : 0, this.ctx.currentTime, 0.02);
    },
    play(name, strength) {
      if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return false;
      const def = SOUNDS[name];
      if (!def) return false;
      const now = this.ctx.currentTime;
      if (now - (this.last[name] || -9) < def.gap) return false;
      if (this.live >= MAX_VOICES) return false;
      this.last[name] = now;
      const k = Math.min(1.6, 0.7 + 0.3 * (strength || 1));
      const pitch = 1 + (Math.random() - 0.5) * 0.06;
      for (const v of def.voices) this.tone(v, now + (v.at || 0), def.gain * k, pitch);
      if (def.noise) this.noise(now, def.noise, def.gain * k * 0.8);
      return true;
    },
    tone(v, t0, gain, pitch) {
      const c = this.ctx;
      const o = c.createOscillator(), g = c.createGain();
      o.type = v.type;
      o.frequency.setValueAtTime(v.f * pitch, t0);
      if (v.f2) o.frequency.exponentialRampToValueAtTime(v.f2 * pitch, t0 + v.dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + v.dur);
      o.connect(g); g.connect(this.master);
      o.start(t0); o.stop(t0 + v.dur + 0.02);
      this.live++;
      o.onended = () => { this.live--; o.disconnect(); g.disconnect(); };
    },
    noise(t0, dur, gain) {
      const c = this.ctx;
      const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      s.buffer = this.noiseBuf;
      f.type = 'lowpass'; f.frequency.value = 1400;
      g.gain.setValueAtTime(gain, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      s.connect(f); f.connect(g); g.connect(this.master);
      s.start(t0); s.stop(t0 + dur + 0.02);
      this.live++;
      s.onended = () => { this.live--; s.disconnect(); f.disconnect(); g.disconnect(); };
    },
    drain(sfx) {
      if (sfx.crit) this.play('crit', sfx.crit);
      else if (sfx.hit) this.play('hit', sfx.hit);
      if (sfx.kill) this.play('kill', sfx.kill);
      if (sfx.leak) this.play('leak', sfx.leak);
      sfx.hit = sfx.crit = sfx.kill = sfx.leak = 0;
      for (const k in sfx) if (sfx[k]) { this.play(k, sfx[k]); sfx[k] = 0; }
    },
  };
  window.NDAudio = A;
})();
