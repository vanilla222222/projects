"use strict";

  /* ============================================================
     RULESET — per-team Born/Survive/Killed rules.
       - "ignore"/"health" modes: one shared Born row, one shared Survive row
         (team.birth/survive).
       - "independent" mode: one Born row + one Survive row PER generation
         instead (team.birthByGen/surviveByGen).
       - Killed-by-enemy-generation (team.killedByEnemyGen, indexed by
         [enemyTeamIndex][enemyGenIndex]) is active in EVERY mode — it's the
         entire rivalry system, fully replacing the old single-number threshold.
     ============================================================ */

  function updateMatrixReachability() {
    const maxN = maxPossibleNeighbors();
    document.querySelectorAll(".cell-toggle").forEach((btn) => {
      const n = Number(btn.dataset.n);
      const unreachable = n > maxN;
      btn.classList.toggle("is-unreachable", unreachable);
      btn.disabled = btn.disabled || unreachable;
    });
  }

  function syncRulesToAllTeams() {
    const srcIndex = state.activeTeam;
    const src = teams[srcIndex];
    teams.forEach((t, ti) => {
      if (ti === srcIndex) return;
      t.birth = new Set(src.birth);
      t.survive = new Set(src.survive);
      t.interaction = src.interaction;
      t.syncGenerations = src.syncGenerations;
      t.birthByGen = src.birthByGen.map((s) => new Set(s));
      t.surviveByGen = src.surviveByGen.map((s) => new Set(s));
      t.killedByEnemyGen = src.killedByEnemyGen.map((rows) => rows.map((s) => new Set(s)));
      t.killedSyncGenerations = src.killedSyncGenerations.slice();
      if (t.numStates !== src.numStates) changeTeamNumStates(ti, src.numStates);
    });
  }

  syncRulesetInput.addEventListener("change", () => {
    state.syncRuleset = syncRulesetInput.checked;
    if (state.syncRuleset) {
      syncRulesToAllTeams();
      addMarkerAll("Synced ruleset to all teams");
      render();
    }
  });

  function syncGenerationsForTeam(team) {
    for (let g = 1; g < team.birthByGen.length; g++) {
      team.birthByGen[g] = new Set(team.birthByGen[0]);
      team.surviveByGen[g] = new Set(team.surviveByGen[0]);
    }
  }

  function syncKilledGenerationsForEnemy(team, enemyIndex) {
    const rows = team.killedByEnemyGen[enemyIndex];
    for (let g = 1; g < rows.length; g++) rows[g] = new Set(rows[0]);
  }

  function onRulesetChanged() {
    if (state.syncRuleset) syncRulesToAllTeams();
    addMarkerAll(`Team ${state.activeTeam + 1} rule changed`);
    render();
  }

  /* ---- dynamic matrix builder: shared by both the simple and the
     per-generation UI, so every row (Born/Survive/Killed, any generation)
     is built the same way ---- */

  function buildMatrixHeaderRow() {
    const row = document.createElement("div");
    row.className = "matrix-row matrix-header";
    const empty = document.createElement("span");
    empty.className = "matrix-row-label";
    row.appendChild(empty);
    for (let n = 0; n <= 8; n++) {
      const lbl = document.createElement("span");
      lbl.className = "matrix-col-label";
      lbl.textContent = n;
      row.appendChild(lbl);
    }
    return row;
  }

  function buildToggleRow(kind, rowLabel, set, disabled, onChange) {
    const row = document.createElement("div");
    row.className = "matrix-row";
    row.dataset.kind = kind;
    const label = document.createElement("span");
    label.className = "matrix-row-label";
    label.textContent = rowLabel;
    row.appendChild(label);
    for (let n = 0; n <= 8; n++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cell-toggle";
      btn.dataset.n = n;
      const active = set.has(n);
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", String(active));
      btn.setAttribute("aria-label", `${rowLabel} on ${n} neighbors`);
      if (disabled) btn.disabled = true;
      btn.addEventListener("click", () => {
        if (set.has(n)) set.delete(n); else set.add(n);
        btn.classList.toggle("is-active", set.has(n));
        btn.setAttribute("aria-pressed", String(set.has(n)));
        onChange();
      });
      row.appendChild(btn);
    }
    return row;
  }

  function onGenerationRuleChange(team, gIdx) {
    if (team.syncGenerations && gIdx === 0) {
      syncGenerationsForTeam(team);
      renderRulesetBody();
      return;
    }
    onRulesetChanged();
  }

  function onKilledRuleChange(team, enemyIndex, gIdx) {
    if (team.killedSyncGenerations[enemyIndex] && gIdx === 0) {
      syncKilledGenerationsForEnemy(team, enemyIndex);
      renderRulesetBody();
      return;
    }
    onRulesetChanged();
  }

  /* ---- full rebuild of everything below the states-count field, driven
     by the active team's numStates/interaction/syncGenerations ---- */

  function renderRulesetBody() {
    const team = activeTeam();
    statesInput.value = team.numStates;

    const margolus = state.updateScheme === "margolus";
    const statesRow = statesInput.closest(".field-row");
    const statesHint = document.getElementById("states-hint");
    if (statesRow) statesRow.hidden = margolus;
    if (statesHint) statesHint.hidden = margolus;

    const hasGenerations = !margolus && team.numStates > 2;
    syncGenerationsRow.hidden = !hasGenerations;
    syncGenerationsInput.checked = team.syncGenerations;
    interactionBlock.hidden = !hasGenerations;

    interactionModeEl.querySelectorAll(".segmented-btn").forEach((btn) => {
      const active = btn.dataset.mode === team.interaction;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-checked", String(active));
    });

    rulesetMatricesEl.innerHTML = "";

    if (margolus) {
      const note = document.createElement("p");
      note.className = "hint-text";
      note.textContent = "Margolus update scheme is active — Born/Survive/Killed rules don't apply. Set the block rule under \"Margolus rule\" below instead.";
      rulesetMatricesEl.appendChild(note);
      return;
    }

    const independent = hasGenerations && team.interaction === "independent";

    if (!independent) {
      const wrap = document.createElement("div");
      wrap.className = "matrix";
      wrap.setAttribute("role", "group");
      wrap.setAttribute("aria-label", "Birth and survival neighbor counts for the active team");
      wrap.appendChild(buildMatrixHeaderRow());
      wrap.appendChild(buildToggleRow("birth", "Born", team.birth, false, onRulesetChanged));
      wrap.appendChild(buildToggleRow("survive", "Survive", team.survive, false, onRulesetChanged));
      rulesetMatricesEl.appendChild(wrap);
      const hint = document.createElement("p");
      hint.className = "hint-text";
      hint.textContent = "Toggle how many same-team neighbors cause an empty cell to birth, or a live cell to survive.";
      rulesetMatricesEl.appendChild(hint);
    } else {
      const stride = team.numStates - 1;
      const wrap = document.createElement("div");
      wrap.className = "matrix matrix-independent";
      wrap.setAttribute("role", "group");
      wrap.setAttribute("aria-label", "Per-generation birth and survival rules");
      wrap.appendChild(buildMatrixHeaderRow());
      for (let g = 0; g < stride; g++) {
        const disabled = team.syncGenerations && g > 0;
        wrap.appendChild(buildToggleRow("birth", `Born — Gen ${g + 1}`, team.birthByGen[g], disabled, () => onGenerationRuleChange(team, g)));
      }
      for (let g = 0; g < stride; g++) {
        const disabled = team.syncGenerations && g > 0;
        wrap.appendChild(buildToggleRow("survive", `Survive — Gen ${g + 1}`, team.surviveByGen[g], disabled, () => onGenerationRuleChange(team, g)));
      }
      rulesetMatricesEl.appendChild(wrap);

      const hint = document.createElement("p");
      hint.className = "hint-text";
      hint.textContent = "Each generation has its own Born/Survive check based on same-generation neighbors.";
      rulesetMatricesEl.appendChild(hint);
    }

    // Killed-by-enemy-generation: every other team, fully independent rows,
    // active in every interaction mode — this is the entire rivalry system now.
    const killedSection = document.createElement("div");
    killedSection.className = "matrix-killed-section";
    const killedSectionTitle = document.createElement("p");
    killedSectionTitle.className = "matrix-section-title";
    killedSectionTitle.textContent = "Killed by enemies";
    killedSection.appendChild(killedSectionTitle);

    teams.forEach((enemyTeam, ei) => {
      if (ei === state.activeTeam) return;
      const enemyStride = enemyTeam.numStates - 1;
      const enemyBlock = document.createElement("div");
      enemyBlock.className = "matrix matrix-killed";
      enemyBlock.setAttribute("role", "group");
      enemyBlock.setAttribute("aria-label", `Killed by Team ${ei + 1}`);

      const header = document.createElement("div");
      header.className = "matrix-killed-header";
      const title = document.createElement("span");
      title.className = "matrix-killed-team-title";
      title.textContent = `Team ${ei + 1}`;
      title.style.color = enemyTeam.color;
      header.appendChild(title);

      if (enemyStride > 1) {
        const syncLabel = document.createElement("label");
        syncLabel.className = "matrix-killed-sync";
        const syncCheckbox = document.createElement("input");
        syncCheckbox.type = "checkbox";
        syncCheckbox.checked = team.killedSyncGenerations[ei];
        syncCheckbox.addEventListener("change", () => {
          team.killedSyncGenerations[ei] = syncCheckbox.checked;
          if (syncCheckbox.checked) syncKilledGenerationsForEnemy(team, ei);
          renderRulesetBody();
          onRulesetChanged();
        });
        syncLabel.appendChild(syncCheckbox);
        syncLabel.appendChild(document.createTextNode(" sync gens"));
        header.appendChild(syncLabel);
      }
      enemyBlock.appendChild(header);
      enemyBlock.appendChild(buildMatrixHeaderRow());
      for (let eg = 0; eg < enemyStride; eg++) {
        const disabled = team.killedSyncGenerations[ei] && eg > 0;
        const rowLabel = enemyStride > 1 ? `Gen ${eg + 1}` : "Killed by";
        enemyBlock.appendChild(buildToggleRow("killed", rowLabel, team.killedByEnemyGen[ei][eg], disabled, () => onKilledRuleChange(team, ei, eg)));
      }
      killedSection.appendChild(enemyBlock);
    });

    rulesetMatricesEl.appendChild(killedSection);
    const killedHint = document.createElement("p");
    killedHint.className = "hint-text";
    killedHint.textContent = "Each enemy team is tracked separately, generation by generation — set how many of that specific enemy's neighbors at that specific stage kill this team.";
    rulesetMatricesEl.appendChild(killedHint);

    updateMatrixReachability();
  }

  statesInput.addEventListener("change", () => {
    const team = activeTeam();
    const newStates = clamp(Number(statesInput.value) || 2, 2, MAX_GENERATIONS);
    changeTeamNumStates(state.activeTeam, newStates);
    if (state.syncRuleset) syncRulesToAllTeams();
    renderRulesetBody();
    render();
    addMarkerAll(`Team ${state.activeTeam + 1}: C${team.numStates} states`);
  });

  syncGenerationsInput.addEventListener("change", () => {
    const team = activeTeam();
    team.syncGenerations = syncGenerationsInput.checked;
    if (team.syncGenerations) syncGenerationsForTeam(team);
    renderRulesetBody();
    onRulesetChanged();
  });

  interactionModeEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".segmented-btn");
    if (!btn) return;
    const team = activeTeam();
    team.interaction = btn.dataset.mode;
    renderRulesetBody();
    onRulesetChanged();
  });
