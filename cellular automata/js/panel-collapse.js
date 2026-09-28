"use strict";

  /* ============================================================
     PANEL COLLAPSE — sidebar .panel sections + per-team graph panels.
     Collapse state persists in localStorage, keyed by panel/graph id.
     ============================================================ */

  const collapseState = loadCollapseState();

  function initSettingsPanelCollapse() {
    document.querySelectorAll(".sidebar .panel").forEach((panel) => {
      const btn = panel.querySelector(".panel-collapse-toggle");
      if (!btn || !panel.id) return;
      const collapsed = !!collapseState[panel.id];
      panel.classList.toggle("is-collapsed", collapsed);
      btn.setAttribute("aria-expanded", String(!collapsed));
      btn.addEventListener("click", () => {
        const nowCollapsed = panel.classList.toggle("is-collapsed");
        btn.setAttribute("aria-expanded", String(!nowCollapsed));
        collapseState[panel.id] = nowCollapsed;
        saveCollapseState(collapseState);
      });
    });
  }

  function wireGraphPanelCollapse(panelEl, key) {
    const btn = panelEl.querySelector(".graph-collapse-toggle");
    if (!btn) return;
    const collapsed = !!collapseState[key];
    panelEl.classList.toggle("is-collapsed", collapsed);
    btn.setAttribute("aria-expanded", String(!collapsed));
    btn.addEventListener("click", () => {
      const nowCollapsed = panelEl.classList.toggle("is-collapsed");
      btn.setAttribute("aria-expanded", String(!nowCollapsed));
      collapseState[key] = nowCollapsed;
      saveCollapseState(collapseState);
      if (!nowCollapsed) {
        const t = Number(panelEl.dataset.teamIndex);
        if (charts[t]) charts[t].render();
      }
    });
  }

