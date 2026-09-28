// Main game loop, state machine, spawning, collisions, and UI wiring.
(() => {
  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");
  const stage = document.getElementById("stage");

  const scoreEl = document.getElementById("score");
  const bestScoreEl = document.getElementById("best-score");
  const finalScoreEl = document.getElementById("final-score");
  const newBestMsg = document.getElementById("new-best-msg");
  const startScreen = document.getElementById("start-screen");
  const gameOverScreen = document.getElementById("game-over-screen");
  const startBtn = document.getElementById("start-btn");
  const restartBtn = document.getElementById("restart-btn");
  const muteBtn = document.getElementById("mute-btn");
  const growthStageEl = document.getElementById("growth-stage");
  const welcomeBackMsg = document.getElementById("welcome-back-msg");
  const smashBar = document.getElementById("smash-bar");
  const smashBarFill = document.getElementById("smash-bar-fill");

  const STATE = { START: "start", PLAYING: "playing", GAME_OVER: "gameover" };
  let state = STATE.START;

  let mule, background, obstacles, collectibles, rocketMonkeys, macheteItems, sliceBursts;
  let speed = CONFIG.START_SPEED;
  let distance = 0;
  let score = 0;
  let coinsCollected = 0;
  let smashBonus = 0;
  let smashFramesLeft = 0;
  let framesUntilSpawn = 60;
  let framesUntilMonkey = CONFIG.ROCKET_MONKEY.FIRST_SPAWN_DELAY;
  let framesUntilMachete = CONFIG.MACHETE.FIRST_SPAWN_DELAY;
  let nextMilestone = 500;
  let shakeFrames = 0;
  let bestScore = Number(localStorage.getItem(CONFIG.STORAGE_KEY)) || 0;

  bestScoreEl.textContent = bestScore;

  // --- Boss fights ---
  // bossPhase: "none" -> "warning" -> "active" -> "victory" -> "none"
  let bossPhase = "none";
  let boss = null;
  let bossAttacks = [];
  let bossQueueIndex = 0;
  let bossTier = 0; // bumps up once per full lap through the roster
  let nextBossScore = CONFIG.BOSS.FIRST_TRIGGER_SCORE;
  let bossWarningFramesLeft = 0;
  let bossVictoryFramesLeft = 0;
  let bossAttacksSurvived = 0;
  let bossAttacksToSurvive = 0;
  let bossAttackTimer = 0;
  let bossAttackInterval = 0;
  let bossTelegraphFramesLeft = 0;
  let bossDefeatedName = "";

  // --- Idle growth: the mule ages in real wall-clock time, whether the tab
  // is open or not. See CONFIG.GROWTH for the stage thresholds. ---
  let growthTotalSeconds = 0;
  let growthStage = CONFIG.GROWTH.STAGES[0];
  let lastGrowthSaveMs = 0;

  function stageForSeconds(totalSeconds) {
    let current = CONFIG.GROWTH.STAGES[0];
    for (const s of CONFIG.GROWTH.STAGES) {
      if (totalSeconds >= s.seconds) current = s;
    }
    return current;
  }

  function formatDuration(seconds) {
    seconds = Math.floor(seconds);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    if (mins > 0) return `${mins}m`;
    return `${seconds}s`;
  }

  function saveGrowthState() {
    try {
      localStorage.setItem(
        CONFIG.GROWTH.STORAGE_KEY,
        JSON.stringify({ totalSeconds: growthTotalSeconds, lastSeen: Date.now() })
      );
    } catch (e) {
      // localStorage unavailable (private mode, etc.) — growth just won't persist
    }
  }

  function initGrowth() {
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(CONFIG.GROWTH.STORAGE_KEY));
    } catch (e) {
      saved = null;
    }

    if (saved && typeof saved.totalSeconds === "number" && typeof saved.lastSeen === "number") {
      const gapSeconds = Math.max(0, (Date.now() - saved.lastSeen) / 1000);
      const clampedGap = Math.min(gapSeconds, CONFIG.GROWTH.MAX_OFFLINE_SECONDS);
      growthTotalSeconds = saved.totalSeconds + clampedGap;
      if (gapSeconds >= CONFIG.GROWTH.WELCOME_BACK_THRESHOLD_SECONDS) {
        welcomeBackMsg.textContent = `🐴 While you were away (${formatDuration(gapSeconds)}), your mule kept growing!`;
        welcomeBackMsg.classList.remove("hidden");
      }
    } else {
      growthTotalSeconds = 0;
    }

    growthStage = stageForSeconds(growthTotalSeconds);
    growthStageEl.textContent = growthStage.label;
    saveGrowthState();
  }

  function tickGrowth(dtSeconds) {
    growthTotalSeconds += dtSeconds;
    const stage = stageForSeconds(growthTotalSeconds);
    if (stage !== growthStage) {
      growthStage = stage;
      growthStageEl.textContent = growthStage.label;
    }
  }

  function resetGame() {
    mule = new Mule(growthStage.scale);
    background = new Background();
    obstacles = [];
    collectibles = [];
    rocketMonkeys = [];
    macheteItems = [];
    sliceBursts = [];
    speed = CONFIG.START_SPEED;
    distance = 0;
    score = 0;
    coinsCollected = 0;
    smashBonus = 0;
    smashFramesLeft = 0;
    framesUntilSpawn = 60;
    framesUntilMonkey = CONFIG.ROCKET_MONKEY.FIRST_SPAWN_DELAY;
    framesUntilMachete = CONFIG.MACHETE.FIRST_SPAWN_DELAY;
    nextMilestone = 500;
    shakeFrames = 0;
    scoreEl.textContent = "0";
    smashBar.classList.add("hidden");

    bossPhase = "none";
    boss = null;
    bossAttacks = [];
    bossQueueIndex = 0;
    bossTier = 0;
    nextBossScore = CONFIG.BOSS.FIRST_TRIGGER_SCORE;
    bossWarningFramesLeft = 0;
    bossVictoryFramesLeft = 0;
    bossAttacksSurvived = 0;
    bossAttacksToSurvive = 0;
    bossAttackTimer = 0;
    bossTelegraphFramesLeft = 0;
  }

  function spawnGap() {
    // Higher speed -> shorter gap, clamped between min/max.
    const t = Math.min(1, (speed - CONFIG.START_SPEED) / (CONFIG.MAX_SPEED - CONFIG.START_SPEED));
    const gap = CONFIG.MAX_SPAWN_GAP - t * (CONFIG.MAX_SPAWN_GAP - CONFIG.MIN_SPAWN_GAP);
    return gap + (Math.random() * 20 - 10);
  }

  function spawnObstacle() {
    const type = CONFIG.OBSTACLE_TYPES[Math.floor(Math.random() * CONFIG.OBSTACLE_TYPES.length)];
    obstacles.push(new Obstacle(type, CONFIG.WIDTH + 20));

    // Occasionally toss in a carrot, sometimes over the obstacle (forces a
    // well-timed jump), sometimes in a clear gap.
    if (Math.random() < 0.55) {
      const overObstacle = Math.random() < 0.5;
      const cx = CONFIG.WIDTH + 20 + (overObstacle ? type.width / 2 - 13 : 90 + Math.random() * 60);
      const cy = overObstacle
        ? CONFIG.GROUND_Y - type.height - 34
        : CONFIG.GROUND_Y - 30 - Math.random() * 40;
      collectibles.push(new Collectible(cx, cy));
    }
  }

  function monkeyGap() {
    const cfg = CONFIG.ROCKET_MONKEY;
    const t = Math.min(1, (speed - CONFIG.START_SPEED) / (CONFIG.MAX_SPEED - CONFIG.START_SPEED));
    const gap = cfg.SPAWN_MAX_GAP - t * (cfg.SPAWN_MAX_GAP - cfg.SPAWN_MIN_GAP);
    return gap + (Math.random() * 100 - 50);
  }

  function spawnRocketMonkey() {
    rocketMonkeys.push(new RocketMonkey(CONFIG.WIDTH + 40));
    MuleAudio.monkeyIncoming();
  }

  function macheteGap() {
    const cfg = CONFIG.MACHETE;
    const t = Math.min(1, (speed - CONFIG.START_SPEED) / (CONFIG.MAX_SPEED - CONFIG.START_SPEED));
    const gap = cfg.SPAWN_MAX_GAP - t * (cfg.SPAWN_MAX_GAP - cfg.SPAWN_MIN_GAP);
    return gap + (Math.random() * 200 - 100);
  }

  function spawnMachete() {
    const y = CONFIG.GROUND_Y - 70 - Math.random() * 70;
    macheteItems.push(new MacheteItem(CONFIG.WIDTH + 30, y));
  }

  function spawnSliceBurst(x, y) {
    sliceBursts.push({ x, y, age: 0 });
  }

  function currentBossDef() {
    return CONFIG.BOSSES[bossQueueIndex % CONFIG.BOSSES.length];
  }

  function startBossWarning() {
    bossPhase = "warning";
    bossWarningFramesLeft = CONFIG.BOSS.WARNING_FRAMES;
    MuleAudio.bossWarning();
  }

  function activateBoss() {
    boss = new Boss(currentBossDef());
    bossAttacks = [];
    bossAttacksSurvived = 0;
    bossAttacksToSurvive = CONFIG.BOSS.BASE_ATTACKS_TO_SURVIVE + bossTier * CONFIG.BOSS.ATTACKS_PER_TIER;
    bossAttackInterval = Math.max(
      CONFIG.BOSS.ATTACK_INTERVAL_MIN,
      CONFIG.BOSS.BASE_ATTACK_INTERVAL - bossTier * CONFIG.BOSS.ATTACK_INTERVAL_DECAY_PER_TIER
    );
    bossAttackTimer = CONFIG.BOSS.ENTRY_GRACE_FRAMES;
    bossTelegraphFramesLeft = 0;
    bossPhase = "active";
  }

  function launchBossAttack() {
    boss.telegraph = false;
    bossAttacks.push(new BossAttack(boss));
    bossAttackTimer = bossAttackInterval;
  }

  function defeatBoss(instant) {
    bossDefeatedName = boss.def.name;
    smashBonus += CONFIG.BOSS.BONUS_SCORE;
    if (instant) {
      spawnSliceBurst(boss.x + boss.width / 2, boss.y + boss.height / 2);
      MuleAudio.slice();
    }
    MuleAudio.bossDefeated();

    boss = null;
    bossAttacks = [];
    bossPhase = "victory";
    bossVictoryFramesLeft = CONFIG.BOSS.VICTORY_FRAMES;

    bossQueueIndex++;
    if (bossQueueIndex % CONFIG.BOSSES.length === 0) bossTier++;
    nextBossScore = score + CONFIG.BOSS.SCORE_INCREMENT + bossTier * CONFIG.BOSS.SCORE_INCREMENT_GROWTH;

    // breathing room before normal hazards resume
    framesUntilSpawn = Math.max(framesUntilSpawn, 90);
    framesUntilMonkey = Math.max(framesUntilMonkey, 200);
    framesUntilMachete = Math.max(framesUntilMachete, 300);
  }

  // Returns true if the run ended as a result of this update (caller should bail).
  function updateBossActive(muleBounds) {
    boss.update();

    if (boss.isHolding()) {
      if (bossTelegraphFramesLeft > 0) {
        bossTelegraphFramesLeft--;
        if (bossTelegraphFramesLeft === 0) launchBossAttack();
      } else {
        bossAttackTimer--;
        if (bossAttackTimer <= 0) {
          bossTelegraphFramesLeft = CONFIG.BOSS.TELEGRAPH_FRAMES;
          boss.telegraph = true;
        }
      }
    }

    for (const a of bossAttacks) a.update(speed);
    for (const a of bossAttacks) {
      if (!a.destroyed && a.isOffscreen()) {
        a.destroyed = true;
        bossAttacksSurvived++;
      }
    }
    for (const a of bossAttacks) {
      if (a.destroyed) continue;
      if (rectsOverlap(muleBounds, a.getBounds())) {
        if (smashFramesLeft > 0) {
          a.destroyed = true;
          bossAttacksSurvived++;
          smashBonus += CONFIG.MACHETE.KILL_SCORE;
          spawnSliceBurst(a.x + a.size / 2, a.y + a.size / 2);
          MuleAudio.slice();
        } else {
          endGame();
          return true;
        }
      }
    }
    bossAttacks = bossAttacks.filter((a) => !a.destroyed);

    if (rectsOverlap(muleBounds, boss.getBounds())) {
      if (smashFramesLeft > 0) {
        defeatBoss(true);
        return false;
      }
      endGame();
      return true;
    }

    if (bossAttacksSurvived >= bossAttacksToSurvive) {
      defeatBoss(false);
    }
    return false;
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  }

  function update() {
    background.update(speed);
    mule.update(speed);
    speed = Math.min(CONFIG.MAX_SPEED, speed + CONFIG.SPEED_RAMP);
    distance += speed;

    score = Math.floor(distance / CONFIG.DISTANCE_SCORE_DIVISOR) + coinsCollected * CONFIG.COIN_SCORE + smashBonus;
    scoreEl.textContent = score;

    if (score >= nextMilestone) {
      MuleAudio.milestone();
      nextMilestone += 500;
    }

    // Normal hazards stand down during a boss encounter — the boss and its
    // attacks are the only thing spawning until it's resolved.
    if (bossPhase === "none") {
      framesUntilSpawn--;
      if (framesUntilSpawn <= 0) {
        spawnObstacle();
        framesUntilSpawn = spawnGap();
      }

      framesUntilMonkey--;
      if (framesUntilMonkey <= 0) {
        spawnRocketMonkey();
        framesUntilMonkey = monkeyGap();
      }

      framesUntilMachete--;
      if (framesUntilMachete <= 0) {
        spawnMachete();
        framesUntilMachete = macheteGap();
      }

      if (score >= nextBossScore) {
        startBossWarning();
      }
    } else if (bossPhase === "warning") {
      bossWarningFramesLeft--;
      if (bossWarningFramesLeft <= 0) activateBoss();
    } else if (bossPhase === "victory") {
      bossVictoryFramesLeft--;
      if (bossVictoryFramesLeft <= 0) bossPhase = "none";
    }

    // smash mode countdown
    if (smashFramesLeft > 0) {
      smashFramesLeft--;
      mule.setSmashActive(smashFramesLeft > 0);
      smashBar.classList.remove("hidden");
      smashBarFill.style.transform = `scaleX(${smashFramesLeft / CONFIG.MACHETE.DURATION_FRAMES})`;
    } else if (!smashBar.classList.contains("hidden")) {
      smashBar.classList.add("hidden");
      mule.setSmashActive(false);
    }

    const muleBounds = mule.getBounds();

    if (bossPhase === "active") {
      if (updateBossActive(muleBounds)) return;
    }

    for (const m of macheteItems) m.update(speed);
    for (const m of macheteItems) {
      if (!m.collected && rectsOverlap(muleBounds, m.getBounds())) {
        m.collected = true;
        smashFramesLeft = CONFIG.MACHETE.DURATION_FRAMES;
        mule.setSmashActive(true);
        MuleAudio.machete();
      }
    }
    macheteItems = macheteItems.filter((m) => !m.collected && !m.isOffscreen());

    for (const b of sliceBursts) b.age++;
    sliceBursts = sliceBursts.filter((b) => b.age < 16);

    for (const obs of obstacles) obs.update(speed);
    obstacles = obstacles.filter((o) => !o.isOffscreen());
    for (const obs of obstacles) {
      if (rectsOverlap(muleBounds, obs.getBounds())) {
        if (smashFramesLeft > 0) {
          obs.destroyed = true;
          smashBonus += CONFIG.MACHETE.KILL_SCORE;
          spawnSliceBurst(obs.x + obs.width / 2, obs.y + obs.height / 2);
          MuleAudio.slice();
        } else {
          endGame();
          return;
        }
      }
    }
    obstacles = obstacles.filter((o) => !o.destroyed);

    for (const m of rocketMonkeys) m.update(speed);
    rocketMonkeys = rocketMonkeys.filter((m) => !m.isOffscreen());
    for (const m of rocketMonkeys) {
      if (rectsOverlap(muleBounds, m.getBounds())) {
        if (smashFramesLeft > 0) {
          m.destroyed = true;
          smashBonus += CONFIG.MACHETE.KILL_SCORE;
          spawnSliceBurst(m.x + m.size / 2, m.y + m.size / 2);
          MuleAudio.slice();
        } else {
          endGame();
          return;
        }
      }
    }
    rocketMonkeys = rocketMonkeys.filter((m) => !m.destroyed);

    for (const c of collectibles) c.update(speed);
    for (const c of collectibles) {
      if (!c.collected && rectsOverlap(muleBounds, c.getBounds())) {
        c.collected = true;
        coinsCollected++;
        MuleAudio.coin();
      }
    }
    collectibles = collectibles.filter((c) => !c.collected && !c.isOffscreen());
  }

  function draw() {
    ctx.save();
    if (shakeFrames > 0) {
      const dx = (Math.random() - 0.5) * 6;
      const dy = (Math.random() - 0.5) * 6;
      ctx.translate(dx, dy);
      shakeFrames--;
    }

    background.draw(ctx);
    for (const c of collectibles) c.draw(ctx);
    for (const m of macheteItems) m.draw(ctx);
    if (boss) boss.draw(ctx);
    for (const a of bossAttacks) a.draw(ctx);
    for (const obs of obstacles) obs.draw(ctx);
    for (const m of rocketMonkeys) m.draw(ctx);
    mule.draw(ctx);

    for (const b of sliceBursts) {
      const t = b.age / 16;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t);
      ctx.strokeStyle = "#8cff50";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 10 + t * 24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (boss && bossPhase === "active") {
      ctx.save();
      ctx.textAlign = "center";
      ctx.font = "bold 13px sans-serif";
      ctx.fillStyle = "#fff3e0";
      ctx.fillText(boss.def.name, boss.x + boss.width / 2, boss.y - 14);
      const pct = bossAttacksToSurvive > 0 ? Math.min(1, bossAttacksSurvived / bossAttacksToSurvive) : 0;
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.fillRect(boss.x, boss.y - 8, boss.width, 6);
      ctx.fillStyle = "#8cff50";
      ctx.fillRect(boss.x, boss.y - 8, boss.width * pct, 6);
      ctx.restore();
    }

    if (bossPhase === "warning") {
      const flash = Math.sin(bossWarningFramesLeft * 0.4) > 0;
      ctx.save();
      ctx.textAlign = "center";
      ctx.fillStyle = flash ? "#ff4d4d" : "#fff3e0";
      ctx.font = "bold 26px sans-serif";
      ctx.fillText("⚠ BOSS INCOMING ⚠", CONFIG.WIDTH / 2, 60);
      ctx.font = "bold 16px sans-serif";
      ctx.fillText(currentBossDef().name, CONFIG.WIDTH / 2, 84);
      ctx.restore();
    }

    if (bossPhase === "victory") {
      ctx.save();
      ctx.textAlign = "center";
      ctx.fillStyle = "#baf27f";
      ctx.font = "bold 22px sans-serif";
      ctx.fillText(`🏆 ${bossDefeatedName} DEFEATED! +${CONFIG.BOSS.BONUS_SCORE}`, CONFIG.WIDTH / 2, 60);
      ctx.restore();
    }

    ctx.restore();
  }

  let rafId = null;
  let lastFrameMs = performance.now();
  function loop() {
    const nowMs = performance.now();
    const dtSeconds = Math.min(1, (nowMs - lastFrameMs) / 1000); // clamp huge gaps (tab was backgrounded)
    lastFrameMs = nowMs;

    tickGrowth(dtSeconds);
    if (nowMs - lastGrowthSaveMs > 5000) {
      saveGrowthState();
      lastGrowthSaveMs = nowMs;
    }

    if (state === STATE.PLAYING) {
      update();
    }
    draw();
    rafId = requestAnimationFrame(loop);
  }

  function startGame() {
    resetGame();
    state = STATE.PLAYING;
    startScreen.classList.add("hidden");
    gameOverScreen.classList.add("hidden");
    MuleAudio.startMusic();
  }

  function endGame() {
    state = STATE.GAME_OVER;
    shakeFrames = 12;
    MuleAudio.hit();
    MuleAudio.stopMusic();

    finalScoreEl.textContent = score;
    const isNewBest = score > bestScore;
    if (isNewBest) {
      bestScore = score;
      localStorage.setItem(CONFIG.STORAGE_KEY, String(bestScore));
      bestScoreEl.textContent = bestScore;
    }
    newBestMsg.classList.toggle("hidden", !isNewBest);
    gameOverScreen.classList.remove("hidden");
  }

  function handleAction() {
    MuleAudio.unlock();
    if (state === STATE.START) {
      startGame();
    } else if (state === STATE.PLAYING) {
      if (mule.jump()) MuleAudio.jump();
    } else if (state === STATE.GAME_OVER) {
      startGame();
    }
  }

  // --- Input ---
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.code === "ArrowUp") {
      e.preventDefault();
      handleAction();
    }
  });
  stage.addEventListener("pointerdown", (e) => {
    // Let the mute button handle its own clicks.
    if (e.target.closest("#mute-btn")) return;
    handleAction();
  });
  startBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    handleAction();
  });
  restartBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    handleAction();
  });

  muteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const nowMuted = !MuleAudio.isMuted();
    MuleAudio.setMuted(nowMuted);
    muteBtn.textContent = nowMuted ? "🔇" : "🔊";
  });

  // --- Canvas sizing (crisp on high-DPI screens, scaled to fit container) ---
  function resizeCanvas() {
    const rect = stage.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = CONFIG.WIDTH * dpr;
    canvas.height = CONFIG.HEIGHT * dpr;
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  // Persist growth state whenever the tab is hidden/closed so the offline
  // gap on the next visit is measured accurately, not just every 5s.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") saveGrowthState();
  });
  window.addEventListener("beforeunload", saveGrowthState);

  // --- Boot ---
  initGrowth();
  resetGame();
  draw();
  loop();
})();
