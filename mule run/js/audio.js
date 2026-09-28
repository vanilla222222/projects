// Tiny synthesized sound effects + a procedural drum & bass loop, all via
// the Web Audio API. No sound files needed, and everything stays silent
// until the player interacts with the page (required by autoplay rules).
const MuleAudio = (() => {
  let ctx = null;
  let muted = false;
  let noiseBuffer = null;

  // --- music scheduler state ---
  let musicTimer = null;
  let nextStepTime = 0;
  let currentStep = 0;
  const STEPS_PER_BAR = 16;
  const SCHEDULE_AHEAD = 0.12;

  function ensureContext() {
    if (!ctx) {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (AudioCtor) ctx = new AudioCtor();
    }
    if (ctx && ctx.state === "suspended") {
      ctx.resume();
    }
    return ctx;
  }

  function tone({ freq, duration = 0.12, type = "square", gain = 0.08, glideTo = null, delay = 0 }) {
    if (muted) return;
    const audioCtx = ensureContext();
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.type = type;

    const startTime = audioCtx.currentTime + Math.max(0, delay);
    osc.frequency.setValueAtTime(freq, startTime);
    if (glideTo !== null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(glideTo, 1), startTime + duration);
    }

    gainNode.gain.setValueAtTime(gain, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gainNode).connect(audioCtx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  function getNoiseBuffer(audioCtx) {
    if (!noiseBuffer) {
      const size = audioCtx.sampleRate; // 1s of white noise, replayed in short bursts
      noiseBuffer = audioCtx.createBuffer(1, size, audioCtx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
    }
    return noiseBuffer;
  }

  function noiseHit({ duration = 0.08, gain = 0.06, filterFreq = 1500, filterType = "highpass", delay = 0 }) {
    if (muted) return;
    const audioCtx = ensureContext();
    if (!audioCtx) return;

    const src = audioCtx.createBufferSource();
    src.buffer = getNoiseBuffer(audioCtx);
    const filter = audioCtx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = filterFreq;
    const gainNode = audioCtx.createGain();

    const startTime = audioCtx.currentTime + Math.max(0, delay);
    gainNode.gain.setValueAtTime(gain, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    src.connect(filter).connect(gainNode).connect(audioCtx.destination);
    src.start(startTime);
    src.stop(startTime + duration + 0.02);
  }

  // --- drum & bass step pattern (16th notes, breakbeat-ish) ---
  function secondsPerStep() {
    return 60 / CONFIG.MUSIC_BPM / 4;
  }

  function scheduleStep(step, time) {
    const audioCtx = ensureContext();
    if (!audioCtx) return;
    const delay = Math.max(0, time - audioCtx.currentTime);

    if (step === 0 || step === 10) {
      tone({ freq: 150, glideTo: 42, duration: 0.16, type: "sine", gain: 0.16, delay });
    }
    if (step === 4 || step === 12) {
      noiseHit({ duration: 0.14, gain: 0.08, filterFreq: 1800, filterType: "bandpass", delay });
    }
    const isAccentHat = step % 4 === 2;
    noiseHit({
      duration: isAccentHat ? 0.05 : 0.022,
      gain: isAccentHat ? 0.04 : 0.022,
      filterFreq: 7500,
      filterType: "highpass",
      delay,
    });
    if (step === 0 || step === 8) {
      tone({ freq: 55, duration: secondsPerStep() * 3.6, type: "sawtooth", gain: 0.045, delay });
    }
  }

  function schedulerTick() {
    const audioCtx = ensureContext();
    if (!audioCtx) return;
    while (nextStepTime < audioCtx.currentTime + SCHEDULE_AHEAD) {
      scheduleStep(currentStep, nextStepTime);
      nextStepTime += secondsPerStep();
      currentStep = (currentStep + 1) % STEPS_PER_BAR;
    }
  }

  return {
    unlock() {
      ensureContext();
    },
    setMuted(value) {
      muted = value;
    },
    isMuted() {
      return muted;
    },
    jump() {
      tone({ freq: 340, glideTo: 620, duration: 0.14, type: "square", gain: 0.07 });
    },
    coin() {
      tone({ freq: 700, duration: 0.09, type: "triangle", gain: 0.09 });
      tone({ freq: 1050, duration: 0.12, type: "triangle", gain: 0.08, delay: 0.06 });
    },
    hit() {
      tone({ freq: 180, glideTo: 40, duration: 0.35, type: "sawtooth", gain: 0.12 });
    },
    milestone() {
      tone({ freq: 520, duration: 0.08, type: "sine", gain: 0.06 });
      tone({ freq: 780, duration: 0.1, type: "sine", gain: 0.06, delay: 0.08 });
    },
    monkeyIncoming() {
      // quick descending "swoop" to warn a rocket monkey just entered
      tone({ freq: 900, glideTo: 300, duration: 0.22, type: "sawtooth", gain: 0.05 });
    },
    machete() {
      // radioactive power-up "zap"
      tone({ freq: 220, glideTo: 900, duration: 0.22, type: "sawtooth", gain: 0.09 });
      noiseHit({ duration: 0.1, gain: 0.06, filterFreq: 4000, filterType: "highpass", delay: 0.02 });
    },
    slice() {
      // quick metallic hit when smash mode destroys an obstacle
      noiseHit({ duration: 0.07, gain: 0.07, filterFreq: 5000, filterType: "highpass" });
      tone({ freq: 700, glideTo: 180, duration: 0.08, type: "triangle", gain: 0.06, delay: 0.01 });
    },
    bossWarning() {
      // two-tone alarm siren
      tone({ freq: 220, glideTo: 500, duration: 0.32, type: "sawtooth", gain: 0.09 });
      tone({ freq: 220, glideTo: 500, duration: 0.32, type: "sawtooth", gain: 0.08, delay: 0.38 });
    },
    bossDefeated() {
      // little ascending victory fanfare
      tone({ freq: 523, duration: 0.14, type: "triangle", gain: 0.08 });
      tone({ freq: 659, duration: 0.14, type: "triangle", gain: 0.08, delay: 0.12 });
      tone({ freq: 784, duration: 0.14, type: "triangle", gain: 0.08, delay: 0.24 });
      tone({ freq: 1047, duration: 0.28, type: "triangle", gain: 0.09, delay: 0.36 });
    },
    startMusic() {
      const audioCtx = ensureContext();
      if (!audioCtx || musicTimer) return;
      currentStep = 0;
      nextStepTime = audioCtx.currentTime + 0.05;
      musicTimer = setInterval(schedulerTick, 25);
    },
    stopMusic() {
      if (musicTimer) {
        clearInterval(musicTimer);
        musicTimer = null;
      }
    },
    isMusicPlaying() {
      return musicTimer !== null;
    },
  };
})();
