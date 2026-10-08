const MuleAudio = (() => {
  let ctx = null;
  let master = null;
  let sfxBus = null;
  let musicBus = null;
  let musicFilter = null;
  let noiseBuffer = null;
  let muted = false;
  let musicTimer = null;
  let nextStepTime = 0;
  let step = 0;
  let bar = 0;
  const AHEAD = 0.12;
  const BASS = [41.2, 41.2, 49, 36.7];

  function ensure() {
    if (!ctx) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      try {
        ctx = new Ctor();
      } catch (e) {
        return null;
      }
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.9;
      sfxBus = ctx.createGain();
      sfxBus.gain.value = 0.8;
      musicBus = ctx.createGain();
      musicBus.gain.value = 0.32;
      musicFilter = ctx.createBiquadFilter();
      musicFilter.type = "lowpass";
      musicFilter.frequency.value = 18000;
      sfxBus.connect(master);
      musicBus.connect(musicFilter).connect(master);
      master.connect(comp).connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  }

  function noise() {
    if (!noiseBuffer) {
      const n = ctx.sampleRate;
      noiseBuffer = ctx.createBuffer(1, n, ctx.sampleRate);
      const d = noiseBuffer.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuffer;
  }

  function tone(o) {
    if (!ctx || muted) return;
    const { freq, dur = 0.12, type = "square", gain = 0.1, glide = null, delay = 0, bus = sfxBus, attack = 0.004 } = o;
    const t = ctx.currentTime + Math.max(0, delay);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (glide) osc.frequency.exponentialRampToValueAtTime(Math.max(1, glide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(bus);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }

  function hiss(o) {
    if (!ctx || muted) return;
    const { dur = 0.08, gain = 0.08, freq = 2000, type = "highpass", delay = 0, bus = sfxBus, sweep = null, q = 0.8 } = o;
    const t = ctx.currentTime + Math.max(0, delay);
    const src = ctx.createBufferSource();
    src.buffer = noise();
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(freq, t);
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(bus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.03);
  }

  function spStep() {
    return 60 / CONFIG.MUSIC_BPM / 4;
  }

  function scheduleStep(s, time) {
    const d = time - ctx.currentTime;
    const mb = musicBus;
    if (s === 0 || s === 10) tone({ freq: 160, glide: 40, dur: 0.18, type: "sine", gain: 0.5, delay: d, bus: mb });
    if (s === 4 || s === 12) {
      hiss({ dur: 0.16, gain: 0.25, freq: 1800, type: "bandpass", delay: d, bus: mb });
      tone({ freq: 220, glide: 120, dur: 0.08, type: "triangle", gain: 0.12, delay: d, bus: mb });
    }
    if (s === 7 && bar % 2 === 1) hiss({ dur: 0.06, gain: 0.12, freq: 2200, type: "bandpass", delay: d, bus: mb });
    const accent = s % 4 === 2;
    hiss({ dur: accent ? 0.05 : 0.02, gain: accent ? 0.1 : 0.05, freq: 8000, delay: d, bus: mb });
    const root = BASS[bar % BASS.length];
    if (s === 0) tone({ freq: root, dur: spStep() * 5.5, type: "sawtooth", gain: 0.16, delay: d, bus: mb, attack: 0.01 });
    if (s === 6) tone({ freq: root * 1.5, dur: spStep() * 2, type: "sawtooth", gain: 0.1, delay: d, bus: mb, attack: 0.01 });
    if (s === 8) tone({ freq: root, dur: spStep() * 3.5, type: "sawtooth", gain: 0.14, delay: d, bus: mb, attack: 0.01 });
    if (s === 14) tone({ freq: root * 2, dur: spStep() * 1.6, type: "square", gain: 0.06, delay: d, bus: mb, attack: 0.01 });
    if (bar % 4 === 0 && s === 0) {
      [0, 3, 7].forEach((st, i) => tone({ freq: root * 8 * Math.pow(2, st / 12), dur: 1.4, type: "triangle", gain: 0.035, delay: d + i * 0.01, bus: mb, attack: 0.2 }));
    }
  }

  function tick() {
    if (!ctx) return;
    while (nextStepTime < ctx.currentTime + AHEAD) {
      scheduleStep(step, nextStepTime);
      nextStepTime += spStep();
      step = (step + 1) % 16;
      if (step === 0) bar++;
    }
  }

  function setFilter(freq, time = 0.3) {
    if (!ctx) return;
    const t = ctx.currentTime;
    musicFilter.frequency.cancelScheduledValues(t);
    musicFilter.frequency.setValueAtTime(musicFilter.frequency.value, t);
    musicFilter.frequency.exponentialRampToValueAtTime(freq, t + time);
  }

  return {
    unlock() {
      ensure();
    },
    setMuted(v) {
      muted = v;
      if (ctx) master.gain.setTargetAtTime(v ? 0 : 0.9, ctx.currentTime, 0.02);
    },
    isMuted() {
      return muted;
    },
    jump() {
      tone({ freq: 300, glide: 560, dur: 0.13, type: "square", gain: 0.06 });
      tone({ freq: 600, glide: 1100, dur: 0.08, type: "sine", gain: 0.04 });
    },
    doubleJump() {
      tone({ freq: 520, glide: 1200, dur: 0.16, type: "triangle", gain: 0.09 });
      hiss({ dur: 0.12, gain: 0.05, freq: 3000, sweep: 8000 });
    },
    land() {
      tone({ freq: 120, glide: 60, dur: 0.07, type: "sine", gain: 0.12 });
      hiss({ dur: 0.05, gain: 0.03, freq: 600, type: "lowpass" });
    },
    slam() {
      hiss({ dur: 0.12, gain: 0.08, freq: 3000, sweep: 400, type: "bandpass" });
    },
    carrot(combo) {
      const f = 660 * Math.pow(2, Math.min(combo, 8) / 12 * 2);
      tone({ freq: f, dur: 0.08, type: "triangle", gain: 0.1 });
      tone({ freq: f * 1.5, dur: 0.12, type: "triangle", gain: 0.08, delay: 0.05 });
    },
    goldCarrot() {
      [0, 4, 7, 12, 16].forEach((st, i) => tone({ freq: 784 * Math.pow(2, st / 12), dur: 0.12, type: "triangle", gain: 0.08, delay: i * 0.045 }));
    },
    powerup() {
      [0, 5, 9, 12].forEach((st, i) => tone({ freq: 392 * Math.pow(2, st / 12), dur: 0.14, type: "square", gain: 0.06, delay: i * 0.06 }));
      hiss({ dur: 0.3, gain: 0.04, freq: 2000, sweep: 9000, type: "bandpass", delay: 0.05 });
    },
    powerdown() {
      tone({ freq: 700, glide: 300, dur: 0.25, type: "triangle", gain: 0.06 });
    },
    shieldBreak() {
      hiss({ dur: 0.3, gain: 0.14, freq: 5000, sweep: 800, type: "bandpass" });
      tone({ freq: 900, glide: 200, dur: 0.25, type: "triangle", gain: 0.1 });
    },
    slice() {
      hiss({ dur: 0.09, gain: 0.12, freq: 5000, type: "highpass" });
      tone({ freq: 800, glide: 160, dur: 0.1, type: "sawtooth", gain: 0.06 });
    },
    nearMiss() {
      hiss({ dur: 0.18, gain: 0.06, freq: 900, sweep: 4000, type: "bandpass", q: 2 });
      tone({ freq: 1200, dur: 0.07, type: "sine", gain: 0.05, delay: 0.05 });
    },
    milestone() {
      tone({ freq: 523, dur: 0.1, type: "sine", gain: 0.07 });
      tone({ freq: 784, dur: 0.14, type: "sine", gain: 0.07, delay: 0.09 });
    },
    hit() {
      hiss({ dur: 0.45, gain: 0.25, freq: 1500, sweep: 120, type: "lowpass" });
      tone({ freq: 200, glide: 35, dur: 0.5, type: "sawtooth", gain: 0.16 });
      tone({ freq: 90, glide: 30, dur: 0.4, type: "sine", gain: 0.3 });
    },
    bossWarning() {
      tone({ freq: 220, glide: 520, dur: 0.34, type: "sawtooth", gain: 0.08 });
      tone({ freq: 220, glide: 520, dur: 0.34, type: "sawtooth", gain: 0.08, delay: 0.42 });
      tone({ freq: 220, glide: 520, dur: 0.34, type: "sawtooth", gain: 0.08, delay: 0.84 });
    },
    bossThrow() {
      hiss({ dur: 0.14, gain: 0.07, freq: 600, sweep: 2500, type: "bandpass", q: 3 });
    },
    bossDefeated() {
      [0, 4, 7, 12, 7, 12, 16].forEach((st, i) => tone({ freq: 523 * Math.pow(2, st / 12), dur: 0.16, type: "square", gain: 0.06, delay: i * 0.09 }));
    },
    fanfare() {
      [0, 7, 12, 19].forEach((st, i) => tone({ freq: 440 * Math.pow(2, st / 12), dur: 0.3, type: "triangle", gain: 0.07, delay: i * 0.1 }));
    },
    click() {
      tone({ freq: 880, dur: 0.04, type: "square", gain: 0.04 });
    },
    startMusic() {
      if (!ensure() || musicTimer) return;
      step = 0;
      bar = 0;
      nextStepTime = ctx.currentTime + 0.06;
      setFilter(18000, 0.05);
      musicTimer = setInterval(tick, 25);
    },
    stopMusic() {
      if (musicTimer) {
        clearInterval(musicTimer);
        musicTimer = null;
      }
    },
    muffle(on) {
      setFilter(on ? 500 : 18000, on ? 0.25 : 0.4);
    },
  };
})();
