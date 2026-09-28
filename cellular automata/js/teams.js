"use strict";

  /* ============================================================
     TEAMS — dynamic tabs, colors, stat pills, count control
     ============================================================ */

  function refreshTeamColorUI() {
    colorTabsEl.querySelectorAll(".color-tab").forEach((btn, t) => {
      if (!teams[t]) return;
      const swatch = btn.querySelector(".color-tab-swatch");
      if (swatch) swatch.style.color = teams[t].color;
      if (t === state.activeTeam) {
        btn.style.borderColor = teams[t].color;
        btn.style.color = teams[t].color;
        btn.style.background = hexToRgba(teams[t].color, 0.08);
      } else {
        btn.style.borderColor = "";
        btn.style.color = "";
        btn.style.background = "";
      }
    });
    statTeamPopsEl.querySelectorAll(".stat-value").forEach((el, t) => {
      if (teams[t]) el.style.color = teams[t].color;
    });
  }

  function rebuildColorTabs() {
    colorTabsEl.innerHTML = "";
    teams.forEach((team, t) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "color-tab" + (t === state.activeTeam ? " is-active" : "");
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", String(t === state.activeTeam));
      const swatch = document.createElement("span");
      swatch.className = "color-tab-swatch";
      btn.appendChild(swatch);
      btn.appendChild(document.createTextNode(` Team ${t + 1}`));
      btn.addEventListener("click", () => setActiveTeam(t));
      colorTabsEl.appendChild(btn);
    });
    refreshTeamColorUI();
  }

  function rebuildTeamColorFields() {
    teamColorFieldsEl.innerHTML = "";
    teams.forEach((team, t) => {
      const row = document.createElement("div");
      row.className = "field-row";
      const label = document.createElement("label");
      label.textContent = `team ${t + 1}`;
      const input = document.createElement("input");
      input.type = "color";
      input.value = team.color;
      input.addEventListener("input", () => {
        team.color = input.value;
        refreshTeamColorUI();
        if (charts[t]) charts[t].setPaletteColor(team.color);
        if (t === state.activeTeam) {
          document.documentElement.style.setProperty("--active-color", team.color);
          document.documentElement.style.setProperty("--active-glow", hexToRgba(team.color, 0.35));
        }
        renderStampList();
        render();
      });
      row.appendChild(label);
      row.appendChild(input);
      teamColorFieldsEl.appendChild(row);
    });
  }

  function rebuildTeamStatPops() {
    statTeamPopsEl.innerHTML = "";
    teams.forEach((team, t) => {
      const div = document.createElement("div");
      div.className = "stat";
      const label = document.createElement("span");
      label.className = "stat-label";
      label.textContent = `pop ${t + 1}`;
      const value = document.createElement("span");
      value.className = "stat-value";
      value.id = `stat-pop-${t}`;
      value.style.color = team.color;
      value.textContent = "0";
      div.appendChild(label);
      div.appendChild(value);
      statTeamPopsEl.appendChild(div);
    });
  }

  function buildGraphPanelElement(t) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <section class="graph-panel" aria-label="Team ${t + 1} metrics" data-team-index="${t}">
        <header class="graph-header">
          <button type="button" class="graph-collapse-toggle" aria-expanded="true" aria-label="Collapse Team ${t + 1} metrics">
            <svg class="chevron-icon" viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path d="M2.5 4.5l3.5 3 3.5-3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <h2 class="graph-title" style="color:${teams[t].color}">Metrics — Team ${t + 1}</h2>
          <div class="graph-series" role="group" aria-label="Visible series, team ${t + 1}">
            <button type="button" class="series-chip is-active" data-series="population">Population</button>
            <button type="button" class="series-chip is-active" data-series="births">Births</button>
            <button type="button" class="series-chip is-active" data-series="deaths">Deaths</button>
            <button type="button" class="series-chip" data-series="net">Net Δ</button>
            <button type="button" class="series-chip" data-series="density">Density</button>
            <button type="button" class="series-chip" data-series="compactedness">Compactedness</button>
            <button type="button" class="series-chip" data-series="avgAge">Avg Age</button>
            <button type="button" class="series-chip" data-series="kills">Kill Rate</button>
            <button type="button" class="series-chip" data-series="volatility">Volatility</button>
          </div>
          <div class="graph-controls">
            <button type="button" class="btn btn-ghost btn-small is-active graph-follow" aria-pressed="true">Follow</button>
            <button type="button" class="btn btn-ghost btn-small graph-zoom-out" aria-label="Zoom out">−</button>
            <button type="button" class="btn btn-ghost btn-small graph-zoom-reset">Reset view</button>
            <button type="button" class="btn btn-ghost btn-small graph-zoom-in" aria-label="Zoom in">+</button>
          </div>
        </header>
        <div class="graph-frame">
          <canvas id="metrics-chart-${t}" class="metrics-chart-canvas" aria-label="Team ${t + 1} metrics chart. Scroll to zoom, drag to pan."></canvas>
          <div class="graph-hint">scroll to zoom · shift+scroll for Y · drag to pan</div>
        </div>
      </section>`;
    return wrapper.firstElementChild;
  }

  function buildGlobalGraphPanelElement() {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <section class="graph-panel graph-panel-global" aria-label="Global metrics, all teams">
        <header class="graph-header">
          <button type="button" class="graph-collapse-toggle" aria-expanded="true" aria-label="Collapse global metrics">
            <svg class="chevron-icon" viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path d="M2.5 4.5l3.5 3 3.5-3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <h2 class="graph-title">Metrics — All Teams</h2>
          <div class="graph-series" role="group" aria-label="Visible series, all teams">
            <button type="button" class="series-chip is-active" data-series="population">Population</button>
            <button type="button" class="series-chip is-active" data-series="births">Births</button>
            <button type="button" class="series-chip is-active" data-series="deaths">Deaths</button>
            <button type="button" class="series-chip" data-series="net">Net Δ</button>
            <button type="button" class="series-chip" data-series="density">Density</button>
            <button type="button" class="series-chip" data-series="volatility">Volatility</button>
            <button type="button" class="series-chip" data-series="entropy">Entropy</button>
          </div>
          <div class="graph-controls">
            <button type="button" class="btn btn-ghost btn-small is-active graph-follow" aria-pressed="true">Follow</button>
            <button type="button" class="btn btn-ghost btn-small graph-zoom-out" aria-label="Zoom out">−</button>
            <button type="button" class="btn btn-ghost btn-small graph-zoom-reset">Reset view</button>
            <button type="button" class="btn btn-ghost btn-small graph-zoom-in" aria-label="Zoom in">+</button>
          </div>
        </header>
        <div class="graph-frame">
          <canvas id="metrics-chart-global" class="metrics-chart-canvas" aria-label="Global metrics chart, all teams combined. Scroll to zoom, drag to pan."></canvas>
          <div class="graph-hint">scroll to zoom · shift+scroll for Y · drag to pan</div>
        </div>
      </section>`;
    return wrapper.firstElementChild;
  }

  function syncGraphPanelsToTeamCount() {
    if (!globalChart) {
      const panelEl = buildGlobalGraphPanelElement();
      graphPanelsContainer.appendChild(panelEl);
      wireGraphPanelCollapse(panelEl, "graph-global");
      globalChart = createMetricsChart(panelEl, panelEl.querySelector(".metrics-chart-canvas"), "#e8ecf1", {
        entropy: { color: "#ff9f4d", label: "Entropy %", axis: "right" },
      });
      const totalPop = populationByTeam().reduce((a, b) => a + b, 0);
      globalChart.resetHistory(null, totalPop);
    }

    const n = teams.length;
    for (let t = 0; t < n; t++) {
      if (!charts[t]) {
        const panelEl = buildGraphPanelElement(t);
        graphPanelsContainer.appendChild(panelEl);
        wireGraphPanelCollapse(panelEl, `graph-${t}`);
        charts[t] = createMetricsChart(panelEl, panelEl.querySelector(".metrics-chart-canvas"), teams[t].color, {
          compactedness: { color: "#4dd8b0", label: "Compactedness %", axis: "right" },
          avgAge: { color: "#c5cdd8", label: "Avg Age %", axis: "right" },
          kills: { color: "#ff6b6b", label: "Kill Rate", axis: "left" },
        });
        const pops = populationByTeam();
        charts[t].resetHistory(null, pops[t] || 0);
      }
    }
    while (charts.length > n) {
      const c = charts.pop();
      if (c && c.panelEl) c.panelEl.remove();
    }
  }

  function setActiveTeam(t) {
    state.activeTeam = clamp(t, 0, teams.length - 1);
    const team = activeTeam();
    document.documentElement.style.setProperty("--active-color", team.color);
    document.documentElement.style.setProperty("--active-glow", hexToRgba(team.color, 0.35));

    colorTabsEl.querySelectorAll(".color-tab").forEach((btn, i) => {
      btn.classList.toggle("is-active", i === state.activeTeam);
      btn.setAttribute("aria-selected", String(i === state.activeTeam));
    });
    refreshTeamColorUI();

    renderRulesetBody();
    updateBrushSwatches();
  }

  function setNumTeams(n) {
    n = clamp(n, 2, 6);
    const old = teams.length;
    if (n > old) {
      for (let t = old; t < n; t++) teams.push(makeDefaultTeam(t));
      if (state.syncRuleset) syncRulesToAllTeams();
    } else if (n < old) {
      // Removing teams from the end never shifts the encoding offsets of the
      // surviving teams, so only cells owned by a removed team need clearing.
      for (let i = 0; i < grid.length; i++) {
        const t = ownerLookup[grid[i]];
        if (t !== null && t >= n) grid[i] = 0;
      }
      teams = teams.slice(0, n);
    }
    state.numTeams = n;
    if (state.activeTeam >= n) state.activeTeam = n - 1;
    rebuildEncodingTables();

    syncGraphPanelsToTeamCount();
    rebuildColorTabs();
    rebuildTeamColorFields();
    rebuildTeamStatPops();
    setActiveTeam(state.activeTeam);
    renderStampList();
    render();
    updateStats();
    addMarkerAll(`${n} teams`);
  }

  teamCountInput.addEventListener("change", () => {
    const n = clamp(Number(teamCountInput.value) || 2, 2, 6);
    teamCountInput.value = n;
    setNumTeams(n);
  });

