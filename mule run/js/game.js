(() => {
  const C = CONFIG;
  const $ = (id) => document.getElementById(id);
  const app = $("app");
  const canvas = $("game");
  const ctx = canvas.getContext("2d");
  const DEBUG = /[?&]debug\b/.test(location.search);
  const TOUCH = window.matchMedia && window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  const FONT = '"Lilita One", "Trebuchet MS", sans-serif';

  const el = {
    score: $("score"),
    best: $("best"),
    powerups: $("powerups"),
    carrots: $("carrots"),
    combo: $("combo"),
    pauseBtn: $("pause-btn"),
    muteBtn: $("mute-btn"),
    title: $("title-screen"),
    pause: $("pause-screen"),
    over: $("over-screen"),
    skinPrev: $("skin-prev"),
    skinNext: $("skin-next"),
    skinCanvas: $("skin-canvas"),
    skinName: $("skin-name"),
    skinReq: $("skin-req"),
    skinCard: document.querySelector(".skin-card"),
    playBtn: $("play-btn"),
    titleBest: $("title-best"),
    titleCarrots: $("title-carrots"),
    titleGrowth: $("title-growth"),
    welcome: $("welcome"),
    resumeBtn: $("resume-btn"),
    quitBtn: $("quit-btn"),
    overTitle: $("over-title"),
    overScore: $("over-score"),
    newBest: $("new-best"),
    overBest: $("over-best"),
    statDist: $("stat-dist"),
    statCarrots: $("stat-carrots"),
    statNear: $("stat-near"),
    statBosses: $("stat-bosses"),
    unlockNote: $("unlock-note"),
    nextGoal: $("next-goal"),
    retryBtn: $("retry-btn"),
    menuBtn: $("menu-btn"),
    toast: $("toast"),
  };

  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const fmt = (n) => Math.floor(n).toLocaleString("en-US");

  function defaultSave() {
    return { best: 0, carrots: 0, runs: 0, bosses: 0, skin: "dusty", muted: false, tutorial: false, unlocked: ["dusty"] };
  }

  function loadSave() {
    const s = defaultSave();
    try {
      const raw = localStorage.getItem(C.SAVE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d && typeof d === "object") {
          for (const k of Object.keys(s)) if (typeof d[k] === typeof s[k]) s[k] = d[k];
          if (Array.isArray(d.unlocked)) s.unlocked = d.unlocked.filter((id) => C.SKINS.some((k) => k.id === id));
        }
      } else {
        const legacy = parseInt(localStorage.getItem(C.LEGACY_BEST_KEY), 10);
        if (legacy > 0) s.best = legacy;
      }
    } catch (e) {
      return s;
    }
    if (!s.unlocked.includes("dusty")) s.unlocked.unshift("dusty");
    if (!s.unlocked.includes(s.skin)) s.skin = "dusty";
    return s;
  }

  const save = loadSave();

  function persist() {
    try {
      localStorage.setItem(C.SAVE_KEY, JSON.stringify(save));
    } catch (e) {
      return false;
    }
    return true;
  }

  const growth = { total: 0, stage: C.GROWTH.STAGES[0], lastSave: 0 };

  function stageFor(sec) {
    let cur = C.GROWTH.STAGES[0];
    for (const s of C.GROWTH.STAGES) if (sec >= s.seconds) cur = s;
    return cur;
  }

  function formatDuration(sec) {
    sec = Math.floor(sec);
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m`;
    return `${sec}s`;
  }

  function saveGrowth() {
    try {
      localStorage.setItem(C.GROWTH.STORAGE_KEY, JSON.stringify({ totalSeconds: growth.total, lastSeen: Date.now() }));
    } catch (e) {
      return;
    }
  }

  function initGrowth() {
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(C.GROWTH.STORAGE_KEY));
    } catch (e) {
      saved = null;
    }
    if (saved && typeof saved.totalSeconds === "number" && typeof saved.lastSeen === "number") {
      const gap = Math.max(0, (Date.now() - saved.lastSeen) / 1000);
      growth.total = saved.totalSeconds + Math.min(gap, C.GROWTH.MAX_OFFLINE_SECONDS);
      if (gap >= C.GROWTH.WELCOME_BACK_SECONDS) {
        el.welcome.textContent = `While you were away (${formatDuration(gap)}), your mule kept growing!`;
        el.welcome.classList.remove("hidden");
      }
    }
    growth.stage = stageFor(growth.total);
    el.titleGrowth.textContent = growth.stage.label;
    saveGrowth();
  }

  function tickGrowth(dt, now) {
    growth.total += dt;
    const s = stageFor(growth.total);
    if (s !== growth.stage) {
      growth.stage = s;
      el.titleGrowth.textContent = s.label;
      if (state !== "title") toast(`Your mule grew into a ${s.label}!`);
    }
    if (now - growth.lastSave > 5000) {
      growth.lastSave = now;
      saveGrowth();
    }
  }

  const view = { w: 620, h: 420, groundY: 315, scale: 1, dpr: 1, cssW: 620, cssH: 420, muleX: 110 };

  function resize() {
    const cssW = Math.max(1, app.clientWidth);
    const cssH = Math.max(1, app.clientHeight);
    let scale = Math.min(cssH / C.VIEW_H, cssW / C.MIN_VIEW_W);
    let w = cssW / scale;
    if (w > C.MAX_VIEW_W) {
      scale = cssW / C.MAX_VIEW_W;
      w = C.MAX_VIEW_W;
    }
    const h = cssH / scale;
    const groundY = h <= 520 ? h - 105 : Math.max(h - 105 - (h - 520) * 0.55, 415);
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    Object.assign(view, { w, h, groundY, scale, dpr, cssW, cssH, muleX: clamp(w * 0.17, 96, 170) });
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    if (run) run.mule.x = view.muleX;
    titleMule.x = view.muleX;
  }

  const bg = new World.Background();
  let state = "title";
  let run = null;
  let time = 0;
  let acc = 0;
  let last = performance.now();
  let hitstop = 0;
  let trauma = 0;
  let flash = 0;
  let flashColor = "#fff";
  let overAt = 0;
  let titleDist = 0;
  let skinIndex = Math.max(0, C.SKINS.findIndex((s) => s.id === save.skin));
  let toastTimer = 0;
  const debug = { autopilot: false, god: false, holdT: 0 };

  const titleMule = makeMule(1);

  function makeMule(scale) {
    return {
      x: view ? view.muleX : 110,
      y: 0,
      vy: 0,
      vx: 0,
      scale,
      sx: 1,
      sy: 1,
      sv: 0,
      tilt: 0,
      deadSpin: 0,
      runPhase: 0,
      onGround: true,
      coyote: 0,
      buffer: 0,
      fresh: false,
      held: false,
      holdT: 0,
      airJumps: 1,
      slamming: false,
      blink: 0,
      nextBlink: rand(1.5, 4),
      earFlop: 0,
      dead: false,
      dustT: 0,
      glow: null,
      machete: false,
      landed: 0,
    };
  }

  function skinById(id) {
    return C.SKINS.find((s) => s.id === id) || C.SKINS[0];
  }

  function setState(s) {
    state = s;
    app.className = "app " + s;
    el.title.classList.toggle("show", s === "title");
    el.pause.classList.toggle("show", s === "paused");
    el.over.classList.toggle("show", s === "over");
  }

  function toast(text, ms = 2800) {
    el.toast.textContent = text;
    el.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove("show"), ms);
  }

  function difficulty() {
    return clamp((run.speed - C.START_SPEED) / (C.MAX_SPEED - C.START_SPEED), 0, 1);
  }

  function score() {
    return run ? Math.floor(run.dist / C.SCORE_DIVISOR + run.bonus) : 0;
  }

  function newRun() {
    const m = makeMule(growth.stage.scale);
    m.x = view.muleX;
    run = {
      dist: 0,
      speed: C.START_SPEED,
      bonus: 0,
      carrots: 0,
      near: 0,
      bosses: 0,
      smashed: 0,
      mule: m,
      skin: skinById(save.skin),
      obstacles: [],
      pickups: [],
      particles: [],
      floaters: [],
      projectiles: [],
      lines: [],
      boss: null,
      bossTier: 0,
      nextBossScore: C.BOSS.FIRST_SCORE,
      nextSpawn: 650,
      pending: null,
      lastPattern: "",
      nextPowerup: C.POWERUP_FIRST,
      lastPower: "",
      power: { machete: 0, magnet: 0, feather: 0, shield: false },
      invuln: 0,
      combo: 0,
      comboT: 0,
      milestone: 1000,
      cause: null,
      deathT: 0,
      t: 0,
      jumps: 0,
      slams: 0,
      tutorial: !save.tutorial,
      shownScore: -1,
      shownCarrots: -1,
    };
    run.pending = choosePattern();
  }

  function startRun() {
    MuleAudio.unlock();
    MuleAudio.click();
    newRun();
    setState("playing");
    acc = 0;
    hitstop = 0;
    trauma = 0;
    flash = 0;
    el.powerups.innerHTML = "";
    puEls.clear();
    el.best.textContent = fmt(save.best);
    el.combo.classList.remove("show");
    bg.offset = 0;
    bg.setCycle(0);
    MuleAudio.startMusic();
    MuleAudio.muffle(false);
    updateHud(true);
  }

  function pauseGame() {
    if (state !== "playing") return;
    setState("paused");
    MuleAudio.muffle(true);
    run.mule.held = false;
  }

  function resumeGame() {
    if (state !== "paused") return;
    MuleAudio.click();
    setState("playing");
    last = performance.now();
    acc = 0;
    MuleAudio.muffle(false);
  }

  function toMenu() {
    MuleAudio.click();
    MuleAudio.stopMusic();
    run = null;
    setState("title");
    refreshTitle();
  }

  function setMuted(v) {
    save.muted = v;
    MuleAudio.setMuted(v);
    el.muteBtn.classList.toggle("muted", v);
    persist();
  }

  function muleBox(m) {
    const s = m.scale;
    return { l: m.x - 20 * s, r: m.x + 26 * s, t: m.y - 50 * s, b: m.y - 3 };
  }

  function muleCenter(m) {
    return { x: m.x + 6 * m.scale, y: m.y - 32 * m.scale };
  }

  function obBox(o) {
    const { x, y, w, h } = o;
    switch (o.type) {
      case "cactusS":
      case "cactusL":
        return { l: x + w * 0.16, r: x + w * 0.84, t: y - h + 4, b: y };
      case "cactusDuo":
        return { l: x + 5, r: x + w - 5, t: y - h * 0.9, b: y };
      case "rock":
        return { l: x + 5, r: x + w - 5, t: y - h + 5, b: y };
      case "scorpion":
        return { l: x + 2, r: x + w - 4, t: y - h + 9, b: y };
      case "tumbleweed": {
        const r = w / 2;
        const cy = y - r - o.bounce;
        return { l: x + r * 0.3, r: x + w - r * 0.3, t: cy - r * 0.7, b: cy + r * 0.7 };
      }
      case "larper":
      case "fan":
        return { l: x + w * 0.15, r: x + w * 0.85, t: y - h + 4, b: y };
      case "buzzard":
        return { l: x + 8, r: x + w - 6, t: y - h + 4, b: y - 3 };
      case "monkey":
        return { l: x + 6, r: x + w - 2, t: y - h + 5, b: y - 4 };
      default:
        return { l: x, r: x + w, t: y - h, b: y };
    }
  }

  function projBox(p) {
    return { l: p.x - 11, r: p.x + 11, t: p.y - 11, b: p.y + 11 };
  }

  function overlap(a, b) {
    return a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
  }

  function addObstacle(type, x, opts = {}) {
    const d = C.OBSTACLES[type];
    const o = {
      type,
      x,
      y: opts.y || 0,
      w: d.w,
      h: d.h,
      extra: d.extra || 0,
      air: type === "buzzard" || (type === "monkey" && opts.high),
      t: Math.random() * 10,
      seed: Math.floor(Math.random() * 100),
      flower: Math.random() < 0.3,
      bounce: 0,
      rot: 0,
      warn: opts.warn || 0,
      minGap: Infinity,
      scored: false,
      bank: 0,
    };
    if (type === "cactusL") o.h = d.h + Math.floor(rand(-4, 6));
    run.obstacles.push(o);
    return o;
  }

  function addCarrot(x, y, goldChance = 0.04) {
    run.pickups.push({ kind: "carrot", x, y, gold: Math.random() < goldChance, t: Math.random() * 6, pulled: false });
  }

  function carrotArc(cx, n, peak, base) {
    const half = (n - 1) / 2;
    for (let i = 0; i < n; i++) {
      const k = half ? (i - half) / (half + 0.6) : 0;
      addCarrot(cx + (i - half) * 34, -(base + (peak - base) * (1 - k * k)));
    }
  }

  function choosePattern() {
    const d = difficulty();
    const dist = run.dist;
    const opts = [
      ["cactus", 3],
      ["rock", 1.3],
      ["npc", dist > 1500 ? 1.3 : 0],
      ["duo", d > 0.06 ? 1 : 0],
      ["scorpion", dist > 2500 ? 1 : 0],
      ["double", d > 0.14 ? 1.1 : 0],
      ["buzzard", dist > 4000 ? 1.3 : 0],
      ["tumbleweed", dist > 6000 ? 1 : 0],
      ["monkey", dist > 9000 ? 0.9 : 0],
      ["combo", d > 0.28 ? 1 : 0],
      ["carrots", run.lastPattern === "carrots" ? 0 : 1],
    ];
    let total = 0;
    for (const o of opts) total += o[1];
    let r = Math.random() * total;
    let name = "cactus";
    for (const o of opts) {
      r -= o[1];
      if (r <= 0) {
        name = o[0];
        break;
      }
    }
    const extra = { tumbleweed: C.OBSTACLES.tumbleweed.extra, scorpion: C.OBSTACLES.scorpion.extra, monkey: C.OBSTACLES.monkey.extra }[name] || 0;
    const travel = (view.w - view.muleX) / Math.max(200, run.speed);
    return { name, lead: extra * travel + (name === "monkey" ? 0.9 * run.speed : 0) };
  }

  function spawnPattern() {
    const p = run.pending;
    const x = view.w + 40;
    const d = difficulty();
    let width = 60;
    let gapMul = 1;
    let carrotsOk = Math.random() < 0.45;

    if (run.dist >= run.nextPowerup && !run.boss) {
      const kinds = ["machete", "magnet", "feather", "shield"].filter((k) => k !== run.lastPower);
      const kind = pick(kinds);
      run.lastPower = kind;
      run.pickups.push({ kind: "power", type: kind, x: x + 30, y: -95, t: 0 });
      run.nextPowerup = run.dist + rand(C.POWERUP_GAP_MIN, C.POWERUP_GAP_MAX);
      width = 80;
      gapMul = 0.7;
      run.lastPattern = "power";
    } else {
      run.lastPattern = p.name;
      switch (p.name) {
        case "cactus": {
          const type = Math.random() < 0.35 + d * 0.4 ? "cactusL" : "cactusS";
          const o = addObstacle(type, x);
          width = o.w;
          if (carrotsOk) carrotArc(x + o.w / 2, 3 + Math.floor(Math.random() * 3), 150, 95);
          break;
        }
        case "rock": {
          const o = addObstacle("rock", x);
          width = o.w;
          if (carrotsOk) carrotArc(x + o.w / 2, 3, 120, 80);
          break;
        }
        case "npc": {
          const o = addObstacle(Math.random() < 0.5 ? "larper" : "fan", x);
          width = o.w;
          if (carrotsOk) carrotArc(x + o.w / 2, 3, 160, 110);
          break;
        }
        case "duo": {
          const o = addObstacle("cactusDuo", x);
          width = o.w;
          if (carrotsOk) carrotArc(x + o.w / 2, 4, 160, 100);
          break;
        }
        case "scorpion": {
          const o = addObstacle("scorpion", x);
          width = o.w;
          break;
        }
        case "double": {
          const a = addObstacle("cactusS", x);
          const gap = 30 + Math.random() * (24 + d * 30);
          const b = addObstacle(Math.random() < d ? "cactusL" : "cactusS", x + a.w + gap);
          width = a.w + gap + b.w;
          if (carrotsOk) carrotArc(x + width / 2, 5, 175, 110);
          break;
        }
        case "buzzard": {
          addObstacle("buzzard", x, { y: -64 });
          width = 60;
          for (let i = 0; i < 4; i++) addCarrot(x - 20 + i * 32, -26, 0.06);
          break;
        }
        case "tumbleweed": {
          const o = addObstacle("tumbleweed", x);
          width = o.w;
          break;
        }
        case "monkey": {
          const high = Math.random() < 0.5;
          addObstacle("monkey", x + 40, { y: high ? -68 : -6, high, warn: 0.9 });
          width = 50;
          break;
        }
        case "combo": {
          const a = addObstacle("cactusS", x);
          const gap = run.speed * 0.8 + 80;
          addObstacle("buzzard", x + a.w + gap, { y: -64 });
          width = a.w + gap + 50;
          break;
        }
        case "carrots":
        default: {
          const n = 5 + Math.floor(Math.random() * 4);
          const wave = Math.random() < 0.5;
          for (let i = 0; i < n; i++) addCarrot(x + i * 34, wave ? -30 - Math.sin((i / (n - 1)) * Math.PI) * 70 : -30);
          width = n * 34;
          gapMul = 0.45;
        }
      }
    }
    run.pending = choosePattern();
    const base = run.speed * 0.55 + 110;
    const extra = Math.random() * (run.speed * 0.9 + 120) * (1 - d * 0.45);
    run.nextSpawn = run.dist + width + (base + extra) * gapMul + run.pending.lead;
  }

  function burst(x, y, n, o) {
    for (let i = 0; i < n; i++) {
      if (run && run.particles.length > 450) run.particles.shift();
      const a = o.angle !== undefined ? o.angle + rand(-o.spread, o.spread) : rand(0, Math.PI * 2);
      const sp = rand(o.speed[0], o.speed[1]);
      const life = rand(o.life[0], o.life[1]);
      particles().push({
        type: o.type,
        x: x + rand(-(o.jx || 0), o.jx || 0),
        y: y + rand(-(o.jy || 0), o.jy || 0),
        vx: Math.cos(a) * sp + (o.vx || 0),
        vy: Math.sin(a) * sp,
        g: o.g || 0,
        drag: o.drag || 0,
        life,
        max: life,
        size: rand(o.size[0], o.size[1]),
        color: Array.isArray(o.color) ? pick(o.color) : o.color,
        rot: rand(0, Math.PI * 2),
        vr: rand(-12, 12),
        ground: o.ground || false,
      });
    }
  }

  const titleParticles = [];
  function particles() {
    return run ? run.particles : titleParticles;
  }

  function floater(x, y, text, color = "#fff", size = 22, life = 0.9) {
    run.floaters.push({ x, y, text, color, size, life, max: life });
  }

  function dust(x, n, power = 1) {
    burst(x, -2, n, { type: "dust", angle: -Math.PI / 2 - 0.6, spread: 0.9, speed: [40 * power, 140 * power], life: [0.3, 0.6], size: [4, 9 * power], color: bg.pal.groundTop, g: -40, drag: 3, vx: -run.speed * 0.35, jx: 10 });
  }

  function addShake(v) {
    trauma = Math.min(1, trauma + v);
  }

  function pressJump() {
    if (state !== "playing") return;
    const m = run.mule;
    m.held = true;
    m.fresh = true;
    m.buffer = C.BUFFER;
  }

  function releaseJump() {
    if (run) run.mule.held = false;
  }

  function slam() {
    if (state !== "playing") return;
    const m = run.mule;
    if (m.onGround || m.slamming) return;
    m.slamming = true;
    m.vy = Math.max(m.vy, C.FAST_FALL_V);
    m.sy = 1.3;
    m.sv = 0;
    run.slams++;
    MuleAudio.slam();
  }

  function doJump(m, v, double) {
    m.vy = -v;
    m.onGround = false;
    m.coyote = 0;
    m.buffer = 0;
    m.holdT = 0;
    m.slamming = false;
    m.sy = 1.28;
    m.sv = 0;
    run.jumps++;
    if (double) {
      m.airJumps--;
      MuleAudio.doubleJump();
      burst(m.x, m.y - 10, 12, { type: "feather", angle: Math.PI / 2, spread: 1.2, speed: [60, 200], life: [0.4, 0.8], size: [4, 7], color: ["#ffffff", "#bfe9ff"], g: 200, drag: 2 });
      burst(m.x, m.y - 4, 1, { type: "ring", speed: [0, 0], life: [0.35, 0.35], size: [34, 34], color: "#bfe9ff" });
    } else {
      MuleAudio.jump();
      dust(m.x, 6, 0.8);
    }
  }

  function updateMule(dt) {
    const m = run.mule;
    const P = run.power;
    if (m.onGround) m.coyote = C.COYOTE;
    else m.coyote -= dt;
    m.buffer -= dt;

    if (m.buffer > 0 && (m.onGround || m.coyote > 0)) {
      doJump(m, C.JUMP_V, false);
    } else if (m.fresh && !m.onGround && P.feather > 0 && m.airJumps > 0) {
      doJump(m, C.DOUBLE_JUMP_V, true);
    }
    m.fresh = false;

    if (!m.onGround) {
      m.holdT += dt;
      const g = m.held && m.vy < 0 && m.holdT < C.HOLD_TIME && !m.slamming ? C.GRAVITY_HOLD : C.GRAVITY;
      m.vy += g * dt;
      if (m.slamming) m.vy = Math.max(m.vy, C.FAST_FALL_V);
      m.y += m.vy * dt;
      if (m.y >= 0) {
        const impact = m.vy;
        m.y = 0;
        m.vy = 0;
        m.onGround = true;
        m.airJumps = 1;
        const k = clamp(impact / 1600, 0.15, 0.45);
        m.sy = 1 - k;
        m.sv = 0;
        if (m.slamming) {
          dust(m.x, 14, 1.6);
          burst(m.x, -2, 1, { type: "ring", speed: [0, 0], life: [0.3, 0.3], size: [46, 46], color: "#fff4e0" });
          addShake(0.18);
          MuleAudio.land();
        } else if (impact > 500) {
          dust(m.x, 7, 1);
          MuleAudio.land();
        }
        m.slamming = false;
        if (m.buffer > 0) doJump(m, C.JUMP_V, false);
      }
    }

    m.sv += (1 - m.sy) * 900 * dt - m.sv * 22 * dt;
    m.sy += m.sv * dt;
    if (!m.onGround) {
      const stretch = 1 + clamp(-m.vy / 4000, -0.08, 0.12);
      m.sy += (stretch - m.sy) * Math.min(1, dt * 10);
    }
    m.sy = clamp(m.sy, 0.6, 1.4);
    m.sx = 1 + (1 - m.sy) * 0.85;

    const tTilt = m.onGround ? 0 : clamp(m.vy / 2600, -0.28, 0.32);
    m.tilt += (tTilt - m.tilt) * Math.min(1, dt * 14);
    m.runPhase += dt * (9 + run.speed / 55) * (m.onGround ? 1 : 0.25);
    const ear = m.onGround ? Math.sin(m.runPhase * 2) * 0.1 : clamp(-m.vy / 1600, -0.5, 0.6);
    m.earFlop += (ear - m.earFlop) * Math.min(1, dt * 12);

    m.nextBlink -= dt;
    if (m.blink > 0) m.blink -= dt;
    if (m.nextBlink <= 0) {
      m.blink = 0.12;
      m.nextBlink = rand(2, 5);
    }

    if (m.onGround) {
      m.dustT -= dt;
      if (m.dustT <= 0) {
        m.dustT = 0.07 - difficulty() * 0.03;
        burst(m.x - 16 * m.scale, -2, 1, { type: "dust", angle: -Math.PI / 2 - 0.8, spread: 0.5, speed: [20, 70], life: [0.25, 0.45], size: [3, 6], color: bg.pal.groundTop, g: -30, drag: 3, vx: -run.speed * 0.3 });
      }
    }
    m.machete = P.machete > 0;
    m.glow = P.machete > 0 ? C.POWERUPS.machete.color : null;
  }

  function hurt(cause, thing, isProjectile) {
    if (debug.god || run.invuln > 0) return;
    if (run.power.machete > 0) {
      smash(thing, isProjectile);
      return;
    }
    if (run.power.shield) {
      run.power.shield = false;
      run.invuln = 1.1;
      MuleAudio.shieldBreak();
      const c = muleCenter(run.mule);
      burst(c.x, c.y, 18, { type: "spark", speed: [150, 420], life: [0.3, 0.6], size: [3, 6], color: ["#ffd34d", "#fff4c2"], drag: 2 });
      burst(c.x, c.y, 1, { type: "ring", speed: [0, 0], life: [0.4, 0.4], size: [70, 70], color: "#ffd34d" });
      floater(c.x, c.y - 40, "SHIELD!", "#ffd34d", 22);
      hitstop = 0.08;
      addShake(0.35);
      removeThing(thing, isProjectile);
      debrisFor(thing, isProjectile);
      return;
    }
    die(cause);
  }

  function removeThing(thing, isProjectile) {
    const arr = isProjectile ? run.projectiles : run.obstacles;
    const i = arr.indexOf(thing);
    if (i >= 0) arr.splice(i, 1);
  }

  function debrisFor(thing, isProjectile) {
    if (isProjectile) {
      burst(thing.x, thing.y, 12, { type: "chunk", speed: [120, 320], life: [0.5, 0.9], size: [4, 7], color: ["#ffd34d", "#5a3018", "#ffffff"], g: 1400, ground: true });
      return;
    }
    const hb = obBox(thing);
    const cx = (hb.l + hb.r) / 2;
    const cy = (hb.t + hb.b) / 2;
    const colors = {
      cactusS: ["#4f9a4a", "#3b7a38"],
      cactusL: ["#4f9a4a", "#3b7a38"],
      cactusDuo: ["#4f9a4a", "#3b7a38"],
      rock: ["#9a8778", "#7a6858"],
      scorpion: ["#b5462e", "#7a2e1e"],
      tumbleweed: ["#7a5a2e", "#a0783c"],
      larper: ["#8a5a2b", "#f4d35e", "#a8aeb4"],
      fan: ["#4d8a63", "#f2c879"],
      buzzard: ["#43364a", "#2e2430", "#e9e1d6"],
      monkey: ["#eef0f2", "#d6453a", "#8a5a35"],
    }[thing.type] || ["#888"];
    burst(cx, cy, 14, { type: "chunk", speed: [140, 380], life: [0.6, 1], size: [4, 8], color: colors, g: 1500, ground: true, angle: -Math.PI / 2, spread: 1.4 });
    for (const top of [true, false]) {
      particles().push({ type: "half", ob: thing, top, x: thing.x, y: thing.y, vx: top ? 160 : -60, vy: top ? -420 : -120, g: 1700, drag: 0, life: 0.9, max: 0.9, rot: 0, vr: top ? 5 : -2, size: 1, ground: false, cut: hb.t + (hb.b - hb.t) * 0.5 - thing.y });
    }
  }

  function smash(thing, isProjectile) {
    removeThing(thing, isProjectile);
    debrisFor(thing, isProjectile);
    MuleAudio.slice();
    hitstop = 0.045;
    addShake(0.22);
    run.bonus += C.SMASH_SCORE;
    run.smashed++;
    const x = isProjectile ? thing.x : thing.x + thing.w / 2;
    const y = isProjectile ? thing.y : thing.y - thing.h;
    burst(x, y + 10, 1, { type: "slash", speed: [0, 0], life: [0.22, 0.22], size: [60, 60], color: "#eaffd0" });
    floater(x, y - 14, `SLICE +${C.SMASH_SCORE}`, "#b6ff7a", 20);
  }

  function die(cause) {
    const m = run.mule;
    run.cause = cause;
    m.dead = true;
    m.held = false;
    m.onGround = false;
    m.vy = -820;
    m.vx = run.speed * 0.25;
    run.deathT = 0;
    hitstop = 0.16;
    addShake(0.75);
    flash = 0.7;
    flashColor = "#fff";
    MuleAudio.hit();
    MuleAudio.muffle(true);
    const c = muleCenter(m);
    burst(c.x + 20, c.y, 10, { type: "star", speed: [120, 300], life: [0.5, 0.9], size: [4, 7], color: ["#ffd34d", "#ffffff"], drag: 2.5 });
    burst(c.x + 20, c.y, 1, { type: "ring", speed: [0, 0], life: [0.35, 0.35], size: [60, 60], color: "#ffffff" });
    dust(m.x, 12, 1.4);
    setState("dying");
    finalizeRun();
  }

  let lastResult = null;

  function finalizeRun() {
    const sc = score();
    const prevBest = save.best;
    const before = new Set(save.unlocked);
    save.runs++;
    save.carrots += run.carrots;
    save.bosses += run.bosses;
    const isBest = sc > save.best;
    if (isBest) save.best = sc;
    if (run.dist > 1500) save.tutorial = true;
    const fresh = [];
    for (const s of C.SKINS) {
      if (before.has(s.id) || !s.req) continue;
      if (reqMet(s.req)) {
        save.unlocked.push(s.id);
        fresh.push(s);
      }
    }
    persist();
    lastResult = { score: sc, isBest: isBest && prevBest > 0, firstBest: isBest, fresh };
  }

  function reqValue(req) {
    if (req.type === "carrots") return save.carrots;
    if (req.type === "best") return save.best;
    if (req.type === "runs") return save.runs;
    if (req.type === "bosses") return save.bosses;
    return 0;
  }

  function reqMet(req) {
    return !req || reqValue(req) >= req.n;
  }

  const CAUSES = {
    cactusS: "Prickly situation.",
    cactusL: "That cactus did not budge.",
    cactusDuo: "Double the cactus, double the ouch.",
    rock: "Rock solid. Mule, less so.",
    scorpion: "Stung by a scorpion!",
    tumbleweed: "Bowled over by a tumbleweed.",
    larper: "Bonked by a foam sword.",
    fan: "Mobbed by an overexcited fan.",
    buzzard: "Buzzard to the face.",
    monkey: "Rocket monkey special delivery.",
    choc: "Chocolate-bombed by the Giant Nestle Bear.",
    bolt: "Zapped by Lilac Nyx.",
    flower: "Sunflowered by the King of Ukraine.",
    pint: "Pint-smacked by Hugeponer.",
  };

  function showOver() {
    const r = lastResult;
    setState("over");
    overAt = performance.now();
    el.overTitle.textContent = CAUSES[run.cause] || "The mule dug in its heels.";
    el.overScore.textContent = fmt(r.score);
    el.overBest.textContent = fmt(save.best);
    el.newBest.classList.toggle("hidden", !r.isBest);
    el.statDist.textContent = `${fmt(run.dist / 10)} m`;
    el.statCarrots.textContent = fmt(run.carrots);
    el.statNear.textContent = fmt(run.near);
    el.statBosses.textContent = fmt(run.bosses);
    if (r.fresh.length) {
      el.unlockNote.textContent = r.fresh.length > 1 ? `New mules unlocked: ${r.fresh.map((s) => s.name).join(" & ")}! Pick one on the menu.` : `New mule unlocked: ${r.fresh[0].name}! Pick it on the menu.`;
      el.unlockNote.classList.remove("hidden");
      MuleAudio.fanfare();
      toast(`Unlocked: ${r.fresh.map((s) => s.name).join(" & ")}!`);
    } else {
      el.unlockNote.classList.add("hidden");
    }
    el.nextGoal.textContent = nextGoalText();
    if (r.isBest) {
      MuleAudio.fanfare();
      burst(view.w / 2, -view.groundY * 0.6, 60, { type: "confetti", angle: -Math.PI / 2, spread: 1.3, speed: [300, 700], life: [1.2, 2], size: [5, 9], color: ["#ff8a2b", "#ffd34d", "#2a9d8f", "#d6453a", "#7fd4ff"], g: 700, drag: 1.2 });
    }
  }

  function nextGoalText() {
    const s = C.SKINS.find((k) => !save.unlocked.includes(k.id) && k.req);
    if (!s) return "Every mule unlocked. Legend.";
    const v = reqValue(s.req);
    return `Next mule: ${s.name} — ${s.req.text} (${fmt(Math.min(v, s.req.n))}/${fmt(s.req.n)})`;
  }

  function retry() {
    if (state !== "over" || performance.now() - overAt < 450) return;
    startRun();
  }

  function startBoss() {
    const tier = run.bossTier;
    const def = C.BOSSES[tier % C.BOSSES.length];
    run.boss = {
      def,
      w: def.w,
      h: def.h,
      phase: "warn",
      t: 0,
      x: view.w + def.w,
      y: 0,
      attacks: C.BOSS.ATTACKS + tier * C.BOSS.ATTACKS_PER_TIER,
      thrown: 0,
      interval: Math.max(C.BOSS.INTERVAL_MIN, C.BOSS.INTERVAL - tier * C.BOSS.INTERVAL_DECAY),
      timer: 1.1,
      windup: 0,
      telegraph: false,
      nextHigh: Math.random() < 0.5,
      queue: [],
      hit: 0,
    };
    MuleAudio.bossWarning();
  }

  function updateBoss(dt) {
    const b = run.boss;
    if (!b) {
      if (score() >= run.nextBossScore && run.obstacles.length === 0) startBoss();
      return;
    }
    b.t += dt;
    const home = view.w - b.w * 0.5 - 30;
    if (b.phase === "warn") {
      if (b.t >= C.BOSS.WARNING) {
        b.phase = "enter";
        b.t = 0;
      }
    } else if (b.phase === "enter") {
      const k = Math.min(1, b.t / 0.8);
      const e = 1 - Math.pow(1 - k, 3);
      b.x = view.w + b.w - (view.w + b.w - home) * e;
      if (k >= 1) {
        b.phase = "fight";
        b.t = 0;
        addShake(0.2);
        dust(b.x, 10, 1.2);
      }
    } else if (b.phase === "fight") {
      b.x = home + Math.sin(b.t * 1.7) * 8;
      b.timer -= dt;
      b.telegraph = b.timer < C.BOSS.TELEGRAPH && b.thrown < b.attacks;
      const wt = b.telegraph ? 1 - b.timer / C.BOSS.TELEGRAPH : 0;
      b.windup += (wt - b.windup) * Math.min(1, dt * 16);
      if (b.timer <= 0 && b.thrown < b.attacks) {
        throwProjectile(b, b.nextHigh);
        b.thrown++;
        b.nextHigh = Math.random() < 0.5;
        b.timer = b.interval * rand(0.9, 1.15);
        if (run.bossTier >= 2 && Math.random() < 0.3 && b.thrown < b.attacks) b.timer = 0.5;
      }
      if (b.thrown >= b.attacks && run.projectiles.length === 0) defeatBoss();
    } else if (b.phase === "leave") {
      b.y -= 0;
      b.vy = (b.vy || -700) + 1800 * dt;
      b.y += b.vy * dt;
      b.x += 260 * dt;
      b.spin = (b.spin || 0) + dt * 4;
      if (b.t > 2.2) run.boss = null;
    }
  }

  function throwProjectile(b, high) {
    MuleAudio.bossThrow();
    run.projectiles.push({
      kind: b.def.attack,
      x: b.x - b.w * 0.4,
      y: high ? -80 : -20,
      high,
      vx: -Math.max(420, run.speed * C.BOSS.PROJECTILE_MULT),
      spin: 0,
      t: 0,
      minGap: Infinity,
      scored: false,
    });
    b.windup = 0;
  }

  function defeatBoss() {
    const b = run.boss;
    b.phase = "leave";
    b.t = 0;
    b.telegraph = false;
    run.bonus += C.BOSS.BONUS;
    run.bosses++;
    run.bossTier++;
    run.nextBossScore = score() + C.BOSS.GAP + run.bossTier * C.BOSS.GAP_GROWTH;
    run.nextSpawn = run.dist + 500;
    MuleAudio.bossDefeated();
    flash = 0.35;
    flashColor = "#fff4c2";
    floater(view.w / 2, -view.groundY * 0.55, `${b.def.name} defeated! +${C.BOSS.BONUS}`, "#ffd34d", 26, 2);
    burst(b.x, -b.h * 0.6, 70, { type: "confetti", angle: -Math.PI / 2, spread: 1.4, speed: [250, 650], life: [1, 1.8], size: [5, 9], color: ["#ff8a2b", "#ffd34d", "#2a9d8f", "#d6453a", "#7fd4ff", "#b47fe5"], g: 700, drag: 1.2 });
  }

  function collectCarrot(p) {
    run.combo = run.comboT > 0 ? Math.min(C.COMBO_MAX, run.combo + 1) : 1;
    run.comboT = C.COMBO_WINDOW;
    run.carrots++;
    const pts = p.gold ? C.GOLD_CARROT_SCORE : C.CARROT_SCORE * run.combo;
    run.bonus += pts;
    if (p.gold) {
      MuleAudio.goldCarrot();
      burst(p.x, p.y, 16, { type: "star", speed: [80, 240], life: [0.4, 0.8], size: [3, 6], color: ["#ffd34d", "#fff8d0"], drag: 2.5 });
      floater(p.x, p.y - 16, `+${pts}`, "#ffd34d", 26);
    } else {
      MuleAudio.carrot(run.combo);
      burst(p.x, p.y, 7, { type: "spark", speed: [80, 220], life: [0.2, 0.4], size: [2, 4], color: ["#ff8a2b", "#ffd34d"], drag: 3 });
      floater(p.x, p.y - 14, run.combo > 1 ? `+${pts} x${run.combo}` : `+${pts}`, "#fff", run.combo > 1 ? 20 : 18, 0.7);
    }
  }

  function collectPower(p) {
    const P = run.power;
    const def = C.POWERUPS[p.type];
    if (p.type === "shield") P.shield = true;
    else P[p.type] = def.duration;
    if (p.type === "feather") run.mule.airJumps = 1;
    MuleAudio.powerup();
    flash = 0.25;
    flashColor = def.color;
    burst(p.x, p.y, 22, { type: "spark", speed: [120, 380], life: [0.3, 0.7], size: [3, 6], color: [def.color, "#ffffff"], drag: 2 });
    burst(p.x, p.y, 1, { type: "ring", speed: [0, 0], life: [0.4, 0.4], size: [60, 60], color: def.color });
    floater(p.x, p.y - 30, def.label.toUpperCase() + "!", def.color, 26, 1.2);
  }

  function step(dt) {
    run.t += dt;
    const m = run.mule;
    if (state === "playing") {
      run.speed = C.START_SPEED + (C.MAX_SPEED - C.START_SPEED) * (1 - Math.exp(-run.dist / C.SPEED_K));
      run.dist += run.speed * dt;
      if (DEBUG && debug.autopilot) autopilot(dt);
      updateMule(dt);
    } else {
      run.deathT += dt;
      run.speed *= Math.exp(-3.2 * dt);
      run.dist += run.speed * dt;
      m.vy += 2600 * dt;
      m.y += m.vy * dt;
      m.vx *= Math.exp(-1.5 * dt);
      m.x += m.vx * dt;
      if (m.y >= 0) {
        m.y = 0;
        if (m.vy > 220) {
          m.vy *= -0.35;
          dust(m.x, 6, 1);
          MuleAudio.land();
        } else {
          m.vy = 0;
          m.onGround = true;
        }
      }
      if (!m.onGround) m.deadSpin -= dt * 7;
      else m.deadSpin += (-Math.PI - m.deadSpin) * Math.min(1, dt * 10);
      if (run.deathT > 1.15 && state === "dying") showOver();
    }
    const speed = run.speed;
    bg.update(dt, speed, run.dist);

    const P = run.power;
    for (const k of ["machete", "magnet", "feather"]) {
      if (P[k] > 0) {
        P[k] -= dt;
        if (P[k] <= 0) {
          P[k] = 0;
          MuleAudio.powerdown();
        }
      }
    }
    if (run.invuln > 0) run.invuln -= dt;
    if (run.comboT > 0) {
      run.comboT -= dt;
      if (run.comboT <= 0) run.combo = 0;
    }

    if (state === "playing") {
      if (!run.boss && score() < run.nextBossScore && run.dist >= run.nextSpawn) spawnPattern();
      if (!run.boss && score() >= run.nextBossScore && run.dist >= run.nextSpawn && run.obstacles.length) run.nextSpawn = run.dist + 200;
      updateBoss(dt);
    } else if (run.boss && run.boss.phase !== "leave") {
      run.boss.telegraph = false;
    }

    const mb = muleBox(m);
    for (let i = run.obstacles.length - 1; i >= 0; i--) {
      const o = run.obstacles[i];
      o.t += dt;
      if (o.warn > 0) {
        o.warn -= dt;
        continue;
      }
      o.x -= (speed + o.extra * (state === "playing" ? 1 : 0.3)) * dt;
      if (o.type === "tumbleweed") {
        o.bounce = Math.abs(Math.sin(o.t * 4.2)) * 38;
        o.rot -= dt * (speed + o.extra) / (o.w / 2);
      } else if (o.type === "buzzard") {
        o.y = -64 + Math.sin(o.t * 3) * 3;
      } else if (o.type === "monkey") {
        o.bank = Math.sin(o.t * 6) * 0.06;
        if (Math.random() < 0.5) burst(o.x + o.w, o.y - o.h / 2, 1, { type: "dust", angle: 0, spread: 0.3, speed: [60, 120], life: [0.3, 0.5], size: [3, 6], color: "#e0d6cc", g: -30, drag: 2 });
      }
      if (o.x + o.w < -80) {
        run.obstacles.splice(i, 1);
        continue;
      }
      if (state !== "playing") continue;
      const hb = obBox(o);
      if (overlap(mb, hb)) {
        hurt(o.type, o, false);
        if (state !== "playing") break;
        continue;
      }
      if (hb.l < mb.r && hb.r > mb.l) {
        const gap = o.air ? hb.t > mb.b ? Infinity : hb.b <= mb.t ? mb.t - hb.b : Infinity : mb.b <= hb.t ? hb.t - mb.b : Infinity;
        if (gap < o.minGap) o.minGap = gap;
      }
      if (!o.scored && hb.r < mb.l) {
        o.scored = true;
        if (o.minGap < 14) nearMiss(o.x + o.w, o.air ? o.y : o.y - o.h);
      }
    }

    for (let i = run.projectiles.length - 1; i >= 0; i--) {
      const p = run.projectiles[i];
      p.t += dt;
      p.x += (p.vx - (state === "playing" ? 0 : -run.speed * 0)) * dt;
      p.spin -= dt * 10;
      if (p.x < -60) {
        run.projectiles.splice(i, 1);
        continue;
      }
      if (state !== "playing") continue;
      const hb = projBox(p);
      if (overlap(mb, hb)) {
        hurt(p.kind, p, true);
        if (state !== "playing") break;
        continue;
      }
      if (hb.l < mb.r && hb.r > mb.l) {
        const gap = p.high ? (hb.b <= mb.t ? mb.t - hb.b : Infinity) : mb.b <= hb.t ? hb.t - mb.b : Infinity;
        if (gap < p.minGap) p.minGap = gap;
      }
      if (!p.scored && hb.r < mb.l) {
        p.scored = true;
        if (p.minGap < 16) nearMiss(p.x, p.y);
      }
    }

    const mc = muleCenter(m);
    for (let i = run.pickups.length - 1; i >= 0; i--) {
      const p = run.pickups[i];
      p.t += dt;
      if (p.kind === "carrot" && P.magnet > 0 && state === "playing") {
        const dx = mc.x - p.x;
        const dy = mc.y - p.y;
        const dd = Math.hypot(dx, dy);
        if (dd < 300 || p.pulled) {
          p.pulled = true;
          const pull = 900 + (300 - Math.min(300, dd)) * 4;
          p.x += (dx / (dd || 1)) * pull * dt;
          p.y += (dy / (dd || 1)) * pull * dt;
        } else p.x -= speed * dt;
      } else {
        p.x -= speed * dt;
      }
      if (p.x < -60) {
        run.pickups.splice(i, 1);
        continue;
      }
      if (state !== "playing") continue;
      const r = p.kind === "power" ? 40 : 34;
      if (Math.hypot(mc.x - p.x, mc.y - p.y) < r) {
        run.pickups.splice(i, 1);
        if (p.kind === "carrot") collectCarrot(p);
        else collectPower(p);
      }
    }

    updateParticles(run.particles, dt, speed);

    for (let i = run.floaters.length - 1; i >= 0; i--) {
      const f = run.floaters[i];
      f.life -= dt;
      f.y -= 40 * dt;
      if (f.life <= 0) run.floaters.splice(i, 1);
    }

    if (state === "playing") {
      const sc = score();
      if (sc >= run.milestone) {
        MuleAudio.milestone();
        floater(view.w / 2, -view.groundY * 0.62, `${fmt(run.milestone)}!`, "#ffd34d", 40, 1.3);
        run.milestone += 1000;
        el.score.classList.remove("bump");
        void el.score.offsetWidth;
        el.score.classList.add("bump");
      }
      if (speed > 560 && Math.random() < (speed - 560) / 900) {
        run.lines.push({ x: view.w + 20, y: -rand(20, view.groundY - 30), len: rand(40, 120), v: speed * rand(1.6, 2.4) });
      }
    }
    for (let i = run.lines.length - 1; i >= 0; i--) {
      const l = run.lines[i];
      l.x -= l.v * dt;
      if (l.x + l.len < 0) run.lines.splice(i, 1);
    }
  }

  function nearMiss(x, y) {
    run.near++;
    run.bonus += C.NEAR_MISS_SCORE;
    MuleAudio.nearMiss();
    floater(x, y - 18, `CLOSE! +${C.NEAR_MISS_SCORE}`, "#7fd4ff", 20, 0.9);
  }

  function updateParticles(list, dt, speed) {
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.life -= dt;
      if (p.life <= 0) {
        list.splice(i, 1);
        continue;
      }
      if (p.drag) {
        const k = Math.exp(-p.drag * dt);
        p.vx *= k;
        p.vy *= k;
      }
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.type === "half") p.x -= speed * 0.6 * dt;
      if (p.ground && p.y > 0) {
        p.y = 0;
        p.vy *= -0.4;
        p.vx = p.vx * 0.6 - speed * 0.5 * dt * 60;
        p.vr *= 0.5;
      }
    }
  }

  function autopilot(dt) {
    const m = run.mule;
    if (debug.holdT > 0) {
      debug.holdT -= dt;
      if (debug.holdT <= 0) releaseJump();
    }
    const mb = muleBox(m);
    let best = Infinity;
    let threat = null;
    const consider = (hb, air, vx) => {
      if (hb.r < mb.l) return;
      const dx = hb.l - mb.r;
      if (dx < best) {
        best = dx;
        threat = { hb, air, vx };
      }
    };
    for (const o of run.obstacles) if (o.warn <= 0) consider(obBox(o), o.air, run.speed + o.extra);
    for (const p of run.projectiles) consider(projBox(p), p.high, -p.vx);
    if (!threat) return;
    const tt = best / threat.vx;
    if (!threat.air) {
      const wide = threat.hb.r - threat.hb.l > 50 || threat.hb.b - threat.hb.t > 45;
      if (m.onGround && tt < (wide ? 0.16 : 0.12)) {
        pressJump();
        debug.holdT = wide ? 0.22 : 0.06;
      }
    } else if (!m.onGround && tt < 0.45) {
      releaseJump();
      slam();
    }
  }

  const puEls = new Map();

  function updateHud(force) {
    if (!run) return;
    const sc = score();
    if (sc !== run.shownScore || force) {
      run.shownScore = sc;
      el.score.textContent = fmt(sc);
      if (sc > save.best && save.best > 0) el.best.textContent = fmt(sc);
    }
    if (run.carrots !== run.shownCarrots || force) {
      run.shownCarrots = run.carrots;
      el.carrots.textContent = fmt(run.carrots);
    }
    const showCombo = run.combo > 1 && run.comboT > 0;
    el.combo.classList.toggle("show", showCombo);
    if (showCombo) el.combo.textContent = `x${run.combo} combo`;

    const P = run.power;
    for (const kind of Object.keys(C.POWERUPS)) {
      const active = kind === "shield" ? P.shield : P[kind] > 0;
      let e = puEls.get(kind);
      if (active && !e) {
        const div = document.createElement("div");
        div.className = "pu";
        const cv = document.createElement("canvas");
        cv.width = cv.height = Math.round(38 * view.dpr);
        div.appendChild(cv);
        el.powerups.appendChild(div);
        e = { div, cv, c: cv.getContext("2d") };
        puEls.set(kind, e);
      } else if (!active && e) {
        e.div.remove();
        puEls.delete(kind);
        continue;
      }
      if (!active) continue;
      const frac = kind === "shield" ? 1 : P[kind] / C.POWERUPS[kind].duration;
      e.div.classList.toggle("ending", kind !== "shield" && P[kind] < 1.8);
      const c = e.c;
      const k = e.cv.width / 38;
      c.setTransform(k, 0, 0, k, 0, 0);
      c.clearRect(0, 0, 38, 38);
      c.beginPath();
      c.moveTo(16, 16);
      c.arc(16, 16, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
      c.closePath();
      c.fillStyle = C.POWERUPS[kind].color + "77";
      c.fill();
      c.save();
      c.translate(16, 16);
      c.scale(0.85, 0.85);
      Art.powerIcon(c, kind, time);
      c.restore();
    }
  }

  function drawObstacleShape(o) {
    const { w, h, t } = o;
    switch (o.type) {
      case "cactusS":
      case "cactusL":
        Art.saguaro(ctx, w / 2, w, h, o.seed, o.flower);
        break;
      case "cactusDuo":
        Art.saguaro(ctx, w * 0.28, w * 0.46, h * 0.78, o.seed, false);
        Art.saguaro(ctx, w * 0.7, w * 0.5, h, o.seed + 1, o.flower);
        break;
      case "rock":
        Art.rock(ctx, w, h);
        break;
      case "scorpion":
        Art.scorpion(ctx, w, h, t);
        break;
      case "tumbleweed":
        ctx.save();
        ctx.translate(w / 2, -w / 2 - o.bounce);
        Art.tumbleweed(ctx, w / 2, o.rot);
        ctx.restore();
        break;
      case "larper":
        Art.larper(ctx, w, h, t);
        break;
      case "fan":
        Art.fan(ctx, w, h, t);
        break;
      case "buzzard":
        Art.buzzard(ctx, w, h, t);
        break;
      case "monkey":
        Art.rocketMonkey(ctx, w, h, t, o.bank);
        break;
    }
  }

  function drawObstacle(o) {
    ctx.save();
    ctx.translate(o.x, o.y);
    drawObstacleShape(o);
    ctx.restore();
  }

  function drawWarning(o) {
    const blink = Math.sin(time * 22) > -0.2;
    const x = view.w - 26;
    const y = o.y - o.h / 2;
    ctx.save();
    ctx.globalAlpha = blink ? 1 : 0.45;
    ctx.beginPath();
    ctx.moveTo(x - 20, y);
    ctx.lineTo(x - 4, y - 14);
    ctx.lineTo(x - 4, y + 14);
    ctx.closePath();
    Art.paint(ctx, "#ff5d3b", 2.4);
    Art.circle(ctx, x + 8, y, 13);
    Art.paint(ctx, "#ffd34d", 2.6);
    ctx.fillStyle = Art.OUT;
    ctx.font = `20px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("!", x + 8, y + 1);
    ctx.restore();
  }

  function text(str, x, y, size, color, align = "center", stroke = 5) {
    ctx.font = `${size}px ${FONT}`;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = stroke;
    ctx.strokeStyle = Art.OUT;
    ctx.strokeText(str, x, y);
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  }

  function drawParticles(list) {
    for (const p of list) {
      const k = p.life / p.max;
      ctx.save();
      switch (p.type) {
        case "dust":
          ctx.globalAlpha = k * 0.7;
          ctx.fillStyle = p.color;
          Art.circle(ctx, p.x, p.y, p.size * (1.6 - k * 0.6));
          ctx.fill();
          break;
        case "spark":
          ctx.globalAlpha = Math.min(1, k * 1.5);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size * 0.7;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04);
          ctx.stroke();
          break;
        case "star":
          ctx.globalAlpha = Math.min(1, k * 2);
          Art.sparkleStar(ctx, p.x, p.y, p.size * (0.5 + k * 0.5), p.color);
          break;
        case "confetti":
          ctx.globalAlpha = Math.min(1, k * 3);
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.scale(1, Math.sin(p.rot * 2));
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
          break;
        case "chunk":
          ctx.globalAlpha = Math.min(1, k * 3);
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          Art.rrect(ctx, -p.size / 2, -p.size / 2, p.size, p.size, 1.5);
          Art.paint(ctx, p.color, 1.6);
          break;
        case "feather":
          ctx.globalAlpha = k;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot * 0.3);
          Art.ellipse(ctx, 0, 0, p.size * 0.45, p.size);
          Art.paint(ctx, p.color, 1.4);
          break;
        case "ring":
          ctx.globalAlpha = k;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 4 * k + 1;
          Art.ellipse(ctx, p.x, p.y, p.size * (1.2 - k) + 6, (p.size * (1.2 - k) + 6) * (p.y > -6 ? 0.35 : 1));
          ctx.stroke();
          break;
        case "slash":
          ctx.globalAlpha = k;
          ctx.translate(p.x, p.y);
          ctx.rotate(-0.6);
          ctx.fillStyle = p.color;
          Art.ellipse(ctx, 0, 0, p.size * (1.3 - k * 0.5), 3 + 4 * k);
          ctx.fill();
          break;
        case "half": {
          ctx.globalAlpha = Math.min(1, k * 2.5);
          const o = p.ob;
          ctx.translate(p.x + o.w / 2, p.y + p.cut);
          ctx.rotate(p.rot * (p.top ? 1 : 0.5));
          ctx.translate(-o.w / 2, -p.cut);
          ctx.beginPath();
          if (p.top) ctx.rect(-40, p.cut - 400, o.w + 80, 400);
          else ctx.rect(-40, p.cut, o.w + 80, 400);
          ctx.clip();
          drawObstacleShape({ ...o, x: 0, y: 0, bounce: o.bounce });
          break;
        }
      }
      ctx.restore();
    }
  }

  function drawMule(m, skin) {
    const blinkHide = run && run.invuln > 0 && Math.sin(time * 40) > 0;
    Art.shadow(ctx, m.x + 2, 58 * m.scale, 0.26, -m.y);
    if (blinkHide) ctx.globalAlpha = 0.45;
    Art.mule(ctx, m, skin, time);
    ctx.globalAlpha = 1;
  }

  function drawMuleFx(m) {
    const P = run.power;
    const c = muleCenter(m);
    if (P.shield) {
      ctx.save();
      const r = 46 * m.scale + Math.sin(time * 6) * 2;
      const g = ctx.createRadialGradient(c.x, c.y, r * 0.5, c.x, c.y, r);
      g.addColorStop(0, "rgba(255,211,77,0)");
      g.addColorStop(1, "rgba(255,211,77,0.35)");
      ctx.fillStyle = g;
      Art.circle(ctx, c.x, c.y, r);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,235,150,0.9)";
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.beginPath();
      ctx.arc(c.x, c.y, r - 6, -2.4, -1.6);
      ctx.stroke();
      ctx.restore();
    }
    if (P.magnet > 0) {
      ctx.save();
      for (let i = 0; i < 2; i++) {
        const k = (time * 1.4 + i * 0.5) % 1;
        ctx.globalAlpha = (1 - k) * 0.45;
        ctx.strokeStyle = "#ff5d5d";
        ctx.lineWidth = 2;
        Art.circle(ctx, c.x, c.y, 30 + k * 90);
        ctx.stroke();
      }
      ctx.restore();
    }
    if (P.feather > 0 && !m.dead) {
      ctx.save();
      const flap = m.onGround ? Math.sin(time * 6) * 0.15 : Math.sin(time * 22) * 0.5;
      ctx.translate(m.x - 4 * m.scale, m.y - 48 * m.scale);
      for (const s of [0.75, 1]) {
        ctx.save();
        ctx.rotate(-0.6 - flap * s);
        ctx.globalAlpha = s === 1 ? 1 : 0.7;
        Art.ellipse(ctx, -12, -6, 14 * s, 6 * s, -0.2);
        Art.paint(ctx, "#f4fbff", 2);
        ctx.restore();
      }
      ctx.restore();
    }
  }

  function drawBoss(b) {
    ctx.save();
    ctx.translate(b.x, b.y);
    if (b.phase !== "leave") Art.shadow(ctx, 0, b.w * 0.9, 0.25, 0);
    const bob = b.phase === "fight" ? Math.sin(b.t * 5) * 2 : 0;
    ctx.translate(0, bob);
    if (b.spin) {
      ctx.translate(0, -b.h / 2);
      ctx.rotate(b.spin);
      ctx.translate(0, b.h / 2);
    }
    const sq = 1 + b.windup * 0.06;
    ctx.scale(1 / sq, sq);
    Art.boss(ctx, b, time);
    ctx.restore();
    if (b.telegraph && b.phase === "fight") {
      const y = b.nextHigh ? -80 : -20;
      const a = 0.4 + Math.sin(time * 30) * 0.3;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.setLineDash([10, 10]);
      ctx.lineDashOffset = time * 120;
      ctx.strokeStyle = b.nextHigh ? "#7fd4ff" : "#ff5d3b";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(b.x - b.w * 0.5, y);
      ctx.lineTo(view.muleX + 40, y);
      ctx.stroke();
      ctx.restore();
      text(b.nextHigh ? "STAY LOW" : "JUMP!", b.x - b.w * 0.3, -b.h - 28, 18, b.nextHigh ? "#7fd4ff" : "#ffd34d", "center", 4);
    }
  }

  function drawBossUi(b) {
    const top = -view.groundY + 64 / view.scale + 16;
    if (b.phase === "warn") {
      const k = b.t / C.BOSS.WARNING;
      const a = Math.sin(time * 14) > 0 ? 1 : 0.6;
      ctx.save();
      ctx.globalAlpha = Math.min(1, (1 - k) * 4) * 0.85;
      ctx.fillStyle = "#d6453a";
      ctx.fillRect(0, top + 8, view.w, 54);
      ctx.fillStyle = Art.OUT;
      ctx.fillRect(0, top + 8, view.w, 4);
      ctx.fillRect(0, top + 58, view.w, 4);
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = a * Math.min(1, (1 - k) * 4);
      text("WARNING", view.w / 2, top + 26, 20, "#ffd34d", "center", 4);
      text(b.def.name, view.w / 2, top + 46, 18, "#fff", "center", 4);
      ctx.restore();
      return;
    }
    if (b.phase !== "fight") return;
    const left = b.attacks - b.thrown;
    const pw = Math.min(260, view.w * 0.5);
    const x = view.w / 2 - pw / 2;
    text(b.def.name, view.w / 2, top + 12, 16, "#fff", "center", 4);
    Art.rrect(ctx, x, top + 24, pw, 12, 6);
    Art.paint(ctx, "rgba(0,0,0,0.35)", 2.4);
    const f = left / b.attacks;
    if (f > 0) {
      Art.rrect(ctx, x + 2, top + 26, (pw - 4) * f, 8, 4);
      ctx.fillStyle = "#d6453a";
      ctx.fill();
    }
  }

  function render() {
    const k = view.dpr * view.scale;
    const sh = trauma * trauma;
    const sx = sh * 14 * (Math.sin(time * 97) + Math.sin(time * 61)) * 0.5;
    const sy = sh * 12 * (Math.sin(time * 83 + 1) + Math.sin(time * 47)) * 0.5;
    ctx.setTransform(k, 0, 0, k, sx * k, (view.groundY + sy) * k);
    bg.drawBack(ctx, view, time);
    bg.drawGround(ctx, view);

    if (run) {
      for (const o of run.obstacles) if (o.warn <= 0) Art.shadow(ctx, o.x + o.w / 2, o.w, 0.22, -o.y + (o.bounce || 0));
      for (const o of run.obstacles) if (o.warn <= 0) drawObstacle(o);
      if (run.boss) drawBoss(run.boss);
      for (const p of run.pickups) {
        ctx.save();
        const bobY = Math.sin(p.t * 4) * 3;
        ctx.translate(p.x, p.y + bobY);
        if (p.kind === "carrot") {
          if (p.gold) {
            ctx.save();
            ctx.globalAlpha = 0.5 + Math.sin(p.t * 6) * 0.2;
            const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 26);
            g.addColorStop(0, "rgba(255,230,120,0.9)");
            g.addColorStop(1, "rgba(255,230,120,0)");
            ctx.fillStyle = g;
            Art.circle(ctx, 0, 0, 26);
            ctx.fill();
            ctx.restore();
          }
          Art.carrot(ctx, p.gold ? 13 : 11, p.t, p.gold);
        } else {
          Art.powerOrb(ctx, p.type, p.t);
        }
        ctx.restore();
      }
      for (const p of run.projectiles) {
        ctx.save();
        ctx.translate(p.x, p.y);
        Art.projectile(ctx, p.kind, p.t, p.spin);
        ctx.restore();
      }
      drawMule(run.mule, run.skin);
      drawMuleFx(run.mule);
      drawParticles(run.particles);
    } else {
      drawMule(titleMule, skinById(save.skin));
      drawParticles(titleParticles);
    }
    bg.drawFront(ctx, view);
    bg.tint(ctx, view);

    if (run) {
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      for (const l of run.lines) {
        ctx.beginPath();
        ctx.moveTo(l.x, l.y);
        ctx.lineTo(l.x + l.len, l.y);
        ctx.stroke();
      }
      ctx.restore();
      for (const o of run.obstacles) if (o.warn > 0) drawWarning(o);
      if (run.boss && (state === "playing" || state === "paused")) drawBossUi(run.boss);
      for (const f of run.floaters) {
        const k2 = f.life / f.max;
        const pop = k2 > 0.85 ? 1 + (k2 - 0.85) * 3 : 1;
        ctx.save();
        ctx.globalAlpha = Math.min(1, k2 * 3);
        text(f.text, f.x, f.y, f.size * pop, f.color, "center", Math.max(3, f.size * 0.22));
        ctx.restore();
      }
      drawTutorial();
    }

    if (flash > 0) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = Math.min(1, flash) * 0.6;
      ctx.fillStyle = flashColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
  }

  function drawTutorial() {
    if (!run.tutorial || state !== "playing") return;
    const m = run.mule;
    let msg = null;
    if (run.jumps === 0) msg = TOUCH ? "Tap to jump!" : "Press Space to jump!";
    else if (run.t > 6 && run.t < 11) msg = TOUCH ? "Hold longer to jump higher" : "Hold Space to jump higher";
    else if (run.t > 15 && run.t < 20 && run.slams === 0) msg = TOUCH ? "Swipe down mid-air to slam" : "Press ↓ mid-air to slam down";
    if (!msg) return;
    const a = 0.75 + Math.sin(time * 6) * 0.25;
    ctx.save();
    ctx.globalAlpha = a;
    text(msg, Math.max(view.muleX + 130, view.w * 0.42), -150, 22, "#fff", "center", 5);
    ctx.restore();
  }

  function updateTitle(dt) {
    titleDist += dt * 700;
    bg.update(dt, 180, titleDist);
    const m = titleMule;
    m.scale = growth.stage.scale;
    m.runPhase += dt * 12;
    m.earFlop = Math.sin(m.runPhase * 2) * 0.1;
    m.nextBlink -= dt;
    if (m.blink > 0) m.blink -= dt;
    if (m.nextBlink <= 0) {
      m.blink = 0.12;
      m.nextBlink = rand(2, 5);
    }
    updateParticles(titleParticles, dt, 180);
  }

  function refreshTitle() {
    el.titleBest.textContent = fmt(save.best);
    el.titleCarrots.textContent = fmt(save.carrots);
    el.titleGrowth.textContent = growth.stage.label;
    showSkin();
  }

  function showSkin() {
    const s = C.SKINS[skinIndex];
    const unlocked = save.unlocked.includes(s.id);
    el.skinName.textContent = s.name;
    el.skinReq.textContent = unlocked ? (save.skin === s.id ? "Selected" : "Unlocked") : `${s.req.text} (${fmt(Math.min(reqValue(s.req), s.req.n))}/${fmt(s.req.n)})`;
    el.skinCard.classList.toggle("locked", !unlocked);
    if (unlocked && save.skin !== s.id) {
      save.skin = s.id;
      persist();
      el.skinReq.textContent = "Selected";
    }
    el.playBtn.textContent = unlocked ? "Hee-haw, let's go!" : `Run as ${skinById(save.skin).name}`;
  }

  function cycleSkin(d) {
    skinIndex = (skinIndex + d + C.SKINS.length) % C.SKINS.length;
    MuleAudio.unlock();
    MuleAudio.click();
    showSkin();
  }

  const skinCtx = el.skinCanvas.getContext("2d");
  const skinMule = makeMule(1.15);

  function drawSkinPreview() {
    const dpr = view.dpr;
    const W = 180;
    const H = 120;
    if (el.skinCanvas.width !== Math.round(W * dpr)) {
      el.skinCanvas.width = Math.round(W * dpr);
      el.skinCanvas.height = Math.round(H * dpr);
    }
    const c = skinCtx;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, H);
    const s = C.SKINS[skinIndex];
    const m = skinMule;
    m.x = 82;
    m.y = 104;
    m.runPhase = time * 11;
    m.earFlop = Math.sin(time * 22) * 0.1;
    m.blink = (time % 3.3) < 0.12 ? 1 : 0;
    c.save();
    c.translate(0, 104);
    c.globalAlpha = 0.25;
    c.fillStyle = "#3a1d0c";
    c.beginPath();
    c.ellipse(m.x + 2, 1.5, 34, 4.5, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
    Art.mule(c, m, s, time);
  }

  function frame(now) {
    const realDt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    time += realDt;
    if (document.visibilityState === "visible") tickGrowth(realDt, now);

    if (state === "playing" || state === "dying") {
      if (hitstop > 0) {
        hitstop -= realDt;
      } else {
        acc += realDt;
        let n = 0;
        while (acc >= C.STEP && n < 12) {
          step(C.STEP);
          acc -= C.STEP;
          n++;
          if (state === "over") break;
        }
        if (n >= 12) acc = 0;
      }
      updateHud();
    } else if (state === "over") {
      run.speed *= Math.exp(-3 * realDt);
      updateParticles(run.particles, realDt, 0);
      for (let i = run.floaters.length - 1; i >= 0; i--) {
        const f = run.floaters[i];
        f.life -= realDt;
        if (f.life <= 0) run.floaters.splice(i, 1);
      }
    } else if (state === "title") {
      updateTitle(realDt);
      drawSkinPreview();
    }
    trauma = Math.max(0, trauma - realDt * 1.6);
    flash = Math.max(0, flash - realDt * 3);
    render();
    requestAnimationFrame(frame);
  }

  function isUi(target) {
    return target && target.closest && target.closest("button, a, .panel, .icon-btn");
  }

  const JUMP_KEYS = new Set(["Space", "ArrowUp", "KeyW"]);
  const SLAM_KEYS = new Set(["ArrowDown", "KeyS"]);

  window.addEventListener("keydown", (e) => {
    const code = e.code;
    if (JUMP_KEYS.has(code) || SLAM_KEYS.has(code) || code === "ArrowLeft" || code === "ArrowRight") e.preventDefault();
    if (code === "KeyM" && !e.repeat) {
      MuleAudio.unlock();
      setMuted(!save.muted);
      return;
    }
    if (state === "title") {
      if (e.repeat) return;
      if (code === "ArrowLeft" || code === "KeyA") cycleSkin(-1);
      else if (code === "ArrowRight" || code === "KeyD") cycleSkin(1);
      else if (JUMP_KEYS.has(code) || code === "Enter") startRun();
      return;
    }
    if (state === "over") {
      if (e.repeat) return;
      if (JUMP_KEYS.has(code) || code === "Enter") retry();
      else if (code === "Escape") toMenu();
      return;
    }
    if (state === "paused") {
      if (e.repeat) return;
      if (code === "KeyP" || code === "Escape" || code === "Enter" || JUMP_KEYS.has(code)) resumeGame();
      return;
    }
    if (state === "playing") {
      if (code === "KeyP" || code === "Escape") {
        pauseGame();
        return;
      }
      if (e.repeat) return;
      if (JUMP_KEYS.has(code)) pressJump();
      else if (SLAM_KEYS.has(code)) slam();
    }
  });

  window.addEventListener("keyup", (e) => {
    if (JUMP_KEYS.has(e.code)) releaseJump();
  });

  let touchStart = null;
  app.addEventListener("pointerdown", (e) => {
    MuleAudio.unlock();
    if (state === "over" && e.target === el.over) {
      retry();
      return;
    }
    if (isUi(e.target)) return;
    if (state === "playing") {
      e.preventDefault();
      touchStart = { id: e.pointerId, y: e.clientY, slammed: false };
      pressJump();
    }
  });

  app.addEventListener("pointermove", (e) => {
    if (!touchStart || e.pointerId !== touchStart.id || touchStart.slammed) return;
    if (e.clientY - touchStart.y > 36) {
      touchStart.slammed = true;
      releaseJump();
      slam();
    }
  });

  const endTouch = (e) => {
    if (touchStart && e.pointerId === touchStart.id) touchStart = null;
    releaseJump();
  };
  app.addEventListener("pointerup", endTouch);
  app.addEventListener("pointercancel", endTouch);
  app.addEventListener("contextmenu", (e) => e.preventDefault());

  function onClick(btn, fn) {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      fn();
      btn.blur();
    });
  }

  onClick(el.playBtn, startRun);
  onClick(el.skinPrev, () => cycleSkin(-1));
  onClick(el.skinNext, () => cycleSkin(1));
  onClick(el.pauseBtn, () => (state === "paused" ? resumeGame() : pauseGame()));
  onClick(el.muteBtn, () => {
    MuleAudio.unlock();
    setMuted(!save.muted);
  });
  onClick(el.resumeBtn, resumeGame);
  onClick(el.quitBtn, toMenu);
  onClick(el.retryBtn, retry);
  onClick(el.menuBtn, toMenu);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      pauseGame();
      saveGrowth();
    } else {
      last = performance.now();
    }
  });
  window.addEventListener("blur", () => {
    if (run) run.mule.held = false;
  });
  window.addEventListener("beforeunload", saveGrowth);
  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", () => setTimeout(resize, 120));

  if (DEBUG) {
    window.__mule = {
      get state() {
        return state;
      },
      get score() {
        return score();
      },
      get run() {
        return run;
      },
      get save() {
        return save;
      },
      get view() {
        return view;
      },
      set autopilot(v) {
        debug.autopilot = !!v;
      },
      get autopilot() {
        return debug.autopilot;
      },
      set god(v) {
        debug.god = !!v;
      },
      get god() {
        return debug.god;
      },
      start: startRun,
      jump: pressJump,
      release: releaseJump,
      slam,
      setDist(d) {
        if (run) {
          run.dist = d;
          run.nextSpawn = d + 200;
          run.nextPowerup = Math.max(run.nextPowerup, d);
          run.milestone = Math.ceil((score() + 1) / 1000) * 1000;
          run.nextBossScore = Math.max(run.nextBossScore, score() + C.BOSS.FIRST_SCORE);
        }
      },
      give(kind) {
        if (run) collectPower({ type: kind, x: run.mule.x, y: -60 });
      },
      boss() {
        if (run) {
          run.nextBossScore = score();
          run.obstacles.length = 0;
        }
      },
      kill() {
        if (run && state === "playing") die("cactusS");
      },
    };
  }

  setMuted(save.muted);
  resize();
  initGrowth();
  refreshTitle();
  setState("title");
  requestAnimationFrame((t) => {
    last = t;
    frame(t);
  });
})();
