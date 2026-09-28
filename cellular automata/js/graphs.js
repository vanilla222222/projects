"use strict";

  /* ============================================================
     METRICS CHART FACTORY — one instance per team
     ============================================================ */

  function createMetricsChart(panelEl, canvasEl, initialColor, extraSeries) {
    const chartCtx2 = canvasEl.getContext("2d");
    const chartFrameEl = canvasEl.closest(".graph-frame");
    const followBtn = panelEl.querySelector(".graph-follow");
    const zoomInBtn = panelEl.querySelector(".graph-zoom-in");
    const zoomOutBtn = panelEl.querySelector(".graph-zoom-out");
    const zoomResetBtn = panelEl.querySelector(".graph-zoom-reset");
    const chips = panelEl.querySelectorAll(".series-chip");

    const SERIES_LOCAL = Object.assign({
      population: { color: initialColor, label: "Population", axis: "left" },
      births:     { color: "#6bc5ff", label: "Births", axis: "left" },
      deaths:     { color: "#ff7a96", label: "Deaths", axis: "left" },
      net:        { color: "#c89bff", label: "Net Δ", axis: "left", dashed: true },
      density:    { color: "#ffb454", label: "Density %", axis: "right" },
      volatility: { color: "#ff9f4d", label: "Volatility", axis: "left", dashed: true },
    }, extraSeries || {});
    const SERIES_KEYS = Object.keys(SERIES_LOCAL);
    const LEFT_AXIS_KEYS = SERIES_KEYS.filter((k) => SERIES_LOCAL[k].axis !== "right");
    const DEFAULT_VISIBLE = { population: true, births: true, deaths: true };

    const metrics = { markers: [] };
    SERIES_KEYS.forEach((k) => { metrics[k] = []; });
    const view = { genMin: 0, genMax: 120, yMaxLeft: null, yMaxRight: 100, follow: true, panning: false, panStartX: 0, panStartGenMin: 0, panStartGenMax: 120 };
    const visible = {};
    SERIES_KEYS.forEach((k) => { visible[k] = !!DEFAULT_VISIBLE[k]; });
    const PAD = { top: 14, right: 46, bottom: 26, left: 46 };

    function boardArea() { return state.cols * state.rows; }

    function ensureLength(gen) {
      while (metrics.population.length <= gen) {
        SERIES_KEYS.forEach((k) => metrics[k].push(0));
      }
    }

    // Standard deviation of population over a short trailing window — a
    // spread/"how much is it swinging lately" measure, derived purely from
    // population history already stored here (no extra data from step()).
    function computeVolatility(gen) {
      const arr = metrics.population;
      const windowSize = 20;
      const start = Math.max(0, gen - windowSize + 1);
      let sum = 0, count = 0;
      for (let g = start; g <= gen; g++) { sum += arr[g]; count++; }
      if (count === 0) return 0;
      const mean = sum / count;
      let sqSum = 0;
      for (let g = start; g <= gen; g++) { const d = arr[g] - mean; sqSum += d * d; }
      return Math.sqrt(sqSum / count);
    }

    function writePoint(gen, pop, births, deaths, extra) {
      ensureLength(gen);
      metrics.population[gen] = pop;
      metrics.births[gen] = births;
      metrics.deaths[gen] = deaths;
      metrics.net[gen] = births - deaths;
      metrics.density[gen] = boardArea() > 0 ? (pop / boardArea()) * 100 : 0;
      metrics.volatility[gen] = computeVolatility(gen);
      if (extra) {
        for (const k in extra) { if (metrics[k]) metrics[k][gen] = extra[k]; }
      }
      render();
    }

    function syncCurrent(pop) {
      ensureLength(state.generation);
      metrics.population[state.generation] = pop;
      metrics.density[state.generation] = boardArea() > 0 ? (pop / boardArea()) * 100 : 0;
      metrics.volatility[state.generation] = computeVolatility(state.generation);
      render();
    }

    function resetHistory(label, pop) {
      SERIES_KEYS.forEach((k) => { metrics[k] = []; });
      metrics.markers = [];
      writePoint(0, pop, 0, 0);
      if (label) metrics.markers.push({ gen: 0, label });
      view.genMin = 0;
      view.genMax = Math.max(120, state.generation + 20);
      view.yMaxLeft = null;
      view.follow = true;
      followBtn.classList.add("is-active");
      followBtn.setAttribute("aria-pressed", "true");
      render();
    }

    function addMarker(label) {
      metrics.markers.push({ gen: state.generation, label });
      render();
    }

    function latestGen() { return Math.max(0, metrics.population.length - 1); }

    function plotRect() {
      const w = canvasEl.clientWidth, h = canvasEl.clientHeight;
      return { x: PAD.left, y: PAD.top, w: Math.max(1, w - PAD.left - PAD.right), h: Math.max(1, h - PAD.top - PAD.bottom), width: w, height: h };
    }

    function genToX(gen, plot) {
      const span = view.genMax - view.genMin;
      if (span <= 0) return plot.x;
      return plot.x + ((gen - view.genMin) / span) * plot.w;
    }
    function valueToYLeft(val, yMax, plot) {
      if (yMax <= 0) return plot.y + plot.h / 2;
      const t = clamp(val / yMax, 0, 1);
      return plot.y + plot.h - t * plot.h;
    }
    function valueToYRight(val, plot) {
      const t = clamp(val / view.yMaxRight, 0, 1);
      return plot.y + plot.h - t * plot.h;
    }
    function visibleYMaxLeft(plot) {
      if (view.yMaxLeft != null) return view.yMaxLeft;
      const g0 = Math.max(0, Math.floor(view.genMin));
      const g1 = Math.min(latestGen(), Math.ceil(view.genMax));
      let max = 1;
      for (const key of LEFT_AXIS_KEYS) {
        if (!visible[key]) continue;
        const arr = metrics[key];
        for (let g = g0; g <= g1 && g < arr.length; g++) {
          const v = Math.abs(arr[g]);
          if (v > max) max = v;
        }
      }
      return Math.ceil(max * 1.12);
    }

    function autoFollow() {
      if (!view.follow) return;
      const latest = latestGen();
      const span = view.genMax - view.genMin;
      view.genMax = latest + span * 0.08;
      view.genMin = view.genMax - span;
      if (view.genMin < 0) { view.genMin = 0; view.genMax = span; }
    }

    function clampView() {
      const latest = Math.max(latestGen(), 1);
      const minSpan = 4;
      let span = Math.max(minSpan, view.genMax - view.genMin);
      if (span > latest + 500) span = latest + 500;
      if (view.genMin < 0) { view.genMax -= view.genMin; view.genMin = 0; }
      view.genMax = Math.max(view.genMin + minSpan, view.genMax);
      view.genMin = clamp(view.genMin, 0, Math.max(0, latest + 100 - minSpan));
      view.genMax = Math.max(view.genMin + minSpan, view.genMax);
      if (view.yMaxLeft != null) view.yMaxLeft = Math.max(1, view.yMaxLeft);
    }

    function formatAxisNumber(n) {
      if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
      if (n >= 10000) return (n / 1000).toFixed(0) + "k";
      if (Number.isInteger(n)) return String(n);
      return n.toFixed(1);
    }

    function drawGrid(plot, yMaxLeft) {
      chartCtx2.strokeStyle = "#1b212b";
      chartCtx2.lineWidth = 1;
      chartCtx2.fillStyle = "#4b5563";
      chartCtx2.font = "10px IBM Plex Mono, monospace";
      chartCtx2.textAlign = "right";
      chartCtx2.textBaseline = "middle";
      const yTicks = 4;
      for (let i = 0; i <= yTicks; i++) {
        const y = plot.y + (plot.h / yTicks) * i;
        chartCtx2.beginPath();
        chartCtx2.moveTo(plot.x, y + 0.5);
        chartCtx2.lineTo(plot.x + plot.w, y + 0.5);
        chartCtx2.stroke();
        const val = yMaxLeft * (1 - i / yTicks);
        chartCtx2.fillText(formatAxisNumber(val), plot.x - 6, y);
      }
      chartCtx2.textAlign = "left";
      for (let i = 0; i <= 4; i++) {
        const pct = 100 * (1 - i / 4);
        const y = plot.y + (plot.h / 4) * i;
        chartCtx2.fillText(`${pct | 0}%`, plot.x + plot.w + 6, y);
      }
      chartCtx2.textAlign = "center";
      chartCtx2.textBaseline = "top";
      const xTicks = Math.min(6, Math.max(2, Math.floor(plot.w / 80)));
      for (let i = 0; i <= xTicks; i++) {
        const gen = view.genMin + ((view.genMax - view.genMin) * i) / xTicks;
        const x = genToX(gen, plot);
        chartCtx2.beginPath();
        chartCtx2.moveTo(x + 0.5, plot.y);
        chartCtx2.lineTo(x + 0.5, plot.y + plot.h);
        chartCtx2.stroke();
        chartCtx2.fillText(String(Math.round(gen)), x, plot.y + plot.h + 6);
      }
      chartCtx2.fillStyle = "#7c8797";
      chartCtx2.font = "9px IBM Plex Mono, monospace";
      chartCtx2.textAlign = "center";
      chartCtx2.fillText("generation", plot.x + plot.w / 2, plot.height - 4);
    }

    function drawSeries(key, plot, yMaxLeft) {
      const spec = SERIES_LOCAL[key];
      const arr = metrics[key];
      if (!visible[key] || !arr.length) return;
      const gStart = Math.max(0, Math.floor(view.genMin));
      const gEnd = Math.min(arr.length - 1, Math.ceil(view.genMax));
      if (gEnd < gStart) return;
      chartCtx2.strokeStyle = spec.color;
      chartCtx2.lineWidth = key === "population" ? 2 : 1.5;
      if (spec.dashed) chartCtx2.setLineDash([5, 4]); else chartCtx2.setLineDash([]);
      chartCtx2.beginPath();
      let started = false;
      for (let g = gStart; g <= gEnd; g++) {
        const x = genToX(g, plot);
        const y = spec.axis === "right" ? valueToYRight(arr[g], plot) : valueToYLeft(arr[g], yMaxLeft, plot);
        if (!started) { chartCtx2.moveTo(x, y); started = true; } else chartCtx2.lineTo(x, y);
      }
      chartCtx2.stroke();
      chartCtx2.setLineDash([]);
    }

    /* ---- average reference line: mean of the full recorded history,
       drawn across the plot width with the number labeled at the right ---- */

    function computeAverage(key) {
      const arr = metrics[key];
      if (!arr.length) return 0;
      let sum = 0;
      for (let i = 0; i < arr.length; i++) sum += arr[i];
      return sum / arr.length;
    }

    function drawAverageLine(key, plot, yMaxLeft) {
      const spec = SERIES_LOCAL[key];
      if (!visible[key] || !metrics[key].length) return null;
      const avg = computeAverage(key);
      const y = spec.axis === "right" ? valueToYRight(avg, plot) : valueToYLeft(avg, yMaxLeft, plot);
      chartCtx2.save();
      chartCtx2.strokeStyle = spec.color;
      chartCtx2.globalAlpha = 0.55;
      chartCtx2.lineWidth = 1;
      chartCtx2.setLineDash([2, 3]);
      chartCtx2.beginPath();
      chartCtx2.moveTo(plot.x, y);
      chartCtx2.lineTo(plot.x + plot.w, y);
      chartCtx2.stroke();
      chartCtx2.restore();
      return { y, avg, color: spec.color, unit: spec.axis === "right" ? "%" : "" };
    }

    function drawAverageLabels(lines, plot) {
      chartCtx2.font = "9px IBM Plex Mono, monospace";
      chartCtx2.textBaseline = "middle";
      const placed = [];
      for (const line of lines) {
        if (!line) continue;
        const text = `avg ${formatAxisNumber(line.avg)}${line.unit}`;
        const tw = chartCtx2.measureText(text).width + 8;
        let ly = clamp(line.y - 7, plot.y, plot.y + plot.h - 14);
        while (placed.some((p) => Math.abs(p - ly) < 13)) ly += 13;
        placed.push(ly);
        const lx = plot.x + plot.w - tw - 2;
        chartCtx2.fillStyle = "rgba(10, 13, 18, 0.88)";
        chartCtx2.fillRect(lx, ly, tw, 14);
        chartCtx2.strokeStyle = line.color;
        chartCtx2.strokeRect(lx + 0.5, ly + 0.5, tw - 1, 13);
        chartCtx2.fillStyle = line.color;
        chartCtx2.textAlign = "left";
        chartCtx2.fillText(text, lx + 4, ly + 7);
      }
    }

    function drawMarkers(plot) {
      const vis = metrics.markers.filter((m) => m.gen >= view.genMin && m.gen <= view.genMax);
      vis.sort((a, b) => a.gen - b.gen);
      chartCtx2.font = "9px IBM Plex Mono, monospace";
      let slot = 0;
      for (const marker of vis) {
        const x = genToX(marker.gen, plot);
        chartCtx2.strokeStyle = "rgba(124, 135, 151, 0.75)";
        chartCtx2.lineWidth = 1;
        chartCtx2.setLineDash([3, 4]);
        chartCtx2.beginPath();
        chartCtx2.moveTo(x + 0.5, plot.y);
        chartCtx2.lineTo(x + 0.5, plot.y + plot.h);
        chartCtx2.stroke();
        chartCtx2.setLineDash([]);
        const label = marker.label;
        const tw = chartCtx2.measureText(label).width + 8;
        const lx = clamp(x + 4, plot.x + 2, plot.x + plot.w - tw - 2);
        const ly = plot.y + 4 + (slot % 4) * 14;
        slot++;
        chartCtx2.fillStyle = "rgba(10, 13, 18, 0.88)";
        chartCtx2.fillRect(lx, ly, tw, 13);
        chartCtx2.strokeStyle = "#3a4453";
        chartCtx2.strokeRect(lx + 0.5, ly + 0.5, tw - 1, 12);
        chartCtx2.fillStyle = "#c5cdd8";
        chartCtx2.textAlign = "left";
        chartCtx2.textBaseline = "top";
        chartCtx2.fillText(label, lx + 4, ly + 2);
      }
    }

    function render() {
      if (!canvasEl.clientWidth) return;
      autoFollow();
      clampView();
      const dpr = window.devicePixelRatio || 1;
      const w = canvasEl.clientWidth, h = canvasEl.clientHeight;
      if (canvasEl.width !== Math.round(w * dpr) || canvasEl.height !== Math.round(h * dpr)) {
        canvasEl.width = Math.round(w * dpr);
        canvasEl.height = Math.round(h * dpr);
        chartCtx2.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      chartCtx2.clearRect(0, 0, w, h);
      chartCtx2.fillStyle = "#070911";
      chartCtx2.fillRect(0, 0, w, h);
      const plot = plotRect();
      const yMaxLeft = visibleYMaxLeft(plot);
      drawGrid(plot, yMaxLeft);
      drawMarkers(plot);

      const avgLines = SERIES_KEYS.map((key) => drawAverageLine(key, plot, yMaxLeft));
      SERIES_KEYS.forEach((key) => drawSeries(key, plot, yMaxLeft));
      drawAverageLabels(avgLines, plot);

      chartCtx2.fillStyle = "#7c8797";
      chartCtx2.font = "9px IBM Plex Mono, monospace";
      chartCtx2.textAlign = "left";
      chartCtx2.textBaseline = "top";
      let legendX = plot.x + 4;
      const legendY = plot.y + 2;
      for (const key of Object.keys(SERIES_LOCAL)) {
        if (!visible[key]) continue;
        const spec = SERIES_LOCAL[key];
        chartCtx2.fillStyle = spec.color;
        chartCtx2.fillRect(legendX, legendY + 2, 8, 8);
        chartCtx2.fillStyle = "#7c8797";
        chartCtx2.fillText(spec.label, legendX + 11, legendY);
        legendX += chartCtx2.measureText(spec.label).width + 22;
      }
    }

    function zoomX(factor, anchorFrac) {
      view.follow = false;
      followBtn.classList.remove("is-active");
      followBtn.setAttribute("aria-pressed", "false");
      const span = view.genMax - view.genMin;
      const anchor = view.genMin + span * anchorFrac;
      const newSpan = clamp(span * factor, 4, Math.max(500, latestGen() + 200));
      view.genMin = anchor - newSpan * anchorFrac;
      view.genMax = anchor + newSpan * (1 - anchorFrac);
      clampView();
      render();
    }
    function zoomY(factor) {
      const plot = plotRect();
      const auto = visibleYMaxLeft(plot);
      const current = view.yMaxLeft != null ? view.yMaxLeft : auto;
      view.yMaxLeft = clamp(current * factor, 1, Math.max(1000, boardArea()));
      render();
    }
    function resetView() {
      view.genMin = 0;
      view.genMax = Math.max(120, latestGen() + 20);
      view.yMaxLeft = null;
      view.follow = true;
      followBtn.classList.add("is-active");
      followBtn.setAttribute("aria-pressed", "true");
      render();
    }

    function setPaletteColor(color) {
      SERIES_LOCAL.population.color = color;
      panelEl.style.setProperty("--series-pop-color", color);
      render();
    }

    chips.forEach((chip) => {
      chip.classList.toggle("is-active", visible[chip.dataset.series]);
      chip.setAttribute("aria-pressed", String(visible[chip.dataset.series]));
      chip.addEventListener("click", () => {
        const key = chip.dataset.series;
        visible[key] = !visible[key];
        chip.classList.toggle("is-active", visible[key]);
        chip.setAttribute("aria-pressed", String(visible[key]));
        render();
      });
    });

    followBtn.addEventListener("click", () => {
      view.follow = !view.follow;
      followBtn.classList.toggle("is-active", view.follow);
      followBtn.setAttribute("aria-pressed", String(view.follow));
      if (view.follow) render();
    });
    zoomInBtn.addEventListener("click", () => zoomX(0.75, 0.5));
    zoomOutBtn.addEventListener("click", () => zoomX(1.35, 0.5));
    zoomResetBtn.addEventListener("click", resetView);

    canvasEl.addEventListener("wheel", (e) => {
      e.preventDefault();
      const rect = canvasEl.getBoundingClientRect();
      const frac = clamp((e.clientX - rect.left) / rect.width, 0, 1);
      const factor = e.deltaY > 0 ? 1.12 : 1 / 1.12;
      if (e.shiftKey) zoomY(factor); else zoomX(factor, frac);
    }, { passive: false });

    canvasEl.addEventListener("mousedown", (e) => {
      view.panning = true;
      view.panStartX = e.clientX;
      view.panStartGenMin = view.genMin;
      view.panStartGenMax = view.genMax;
      canvasEl.classList.add("is-panning");
      view.follow = false;
      followBtn.classList.remove("is-active");
      followBtn.setAttribute("aria-pressed", "false");
    });
    window.addEventListener("mousemove", (e) => {
      if (!view.panning) return;
      const plot = plotRect();
      const dx = e.clientX - view.panStartX;
      const genSpan = view.panStartGenMax - view.panStartGenMin;
      const genShift = (-dx / plot.w) * genSpan;
      view.genMin = view.panStartGenMin + genShift;
      view.genMax = view.panStartGenMax + genShift;
      clampView();
      render();
    });
    window.addEventListener("mouseup", () => { view.panning = false; canvasEl.classList.remove("is-panning"); });

    canvasEl.addEventListener("touchstart", (e) => {
      if (e.touches.length !== 1) return;
      view.panning = true;
      view.panStartX = e.touches[0].clientX;
      view.panStartGenMin = view.genMin;
      view.panStartGenMax = view.genMax;
      view.follow = false;
      followBtn.classList.remove("is-active");
      followBtn.setAttribute("aria-pressed", "false");
    }, { passive: true });
    canvasEl.addEventListener("touchmove", (e) => {
      if (!view.panning || e.touches.length !== 1) return;
      e.preventDefault();
      const plot = plotRect();
      const dx = e.touches[0].clientX - view.panStartX;
      const genSpan = view.panStartGenMax - view.panStartGenMin;
      const genShift = (-dx / plot.w) * genSpan;
      view.genMin = view.panStartGenMin + genShift;
      view.genMax = view.panStartGenMax + genShift;
      clampView();
      render();
    }, { passive: false });
    canvasEl.addEventListener("touchend", () => { view.panning = false; });

    if (typeof ResizeObserver !== "undefined") {
      new ResizeObserver(() => render()).observe(chartFrameEl);
    }

    panelEl.style.setProperty("--series-pop-color", initialColor);

    function exportData() {
      const out = { markers: metrics.markers.map((m) => ({ ...m })) };
      SERIES_KEYS.forEach((k) => { out[k] = metrics[k].slice(); });
      return out;
    }

    function importData(data) {
      if (!data) return;
      SERIES_KEYS.forEach((k) => { metrics[k] = Array.isArray(data[k]) ? data[k].slice() : []; });
      metrics.markers = Array.isArray(data.markers) ? data.markers.map((m) => ({ ...m })) : [];
      view.genMin = 0;
      view.genMax = Math.max(120, metrics.population.length + 10);
      view.yMaxLeft = null;
      view.follow = false;
      followBtn.classList.remove("is-active");
      followBtn.setAttribute("aria-pressed", "false");
      render();
    }

    return { writePoint, resetHistory, addMarker, syncCurrent, render, setPaletteColor, exportData, importData, panelEl };
  }

  let suppressMarkers = true;
  function addMarkerAll(label) {
    if (suppressMarkers) return;
    charts.forEach((c) => { if (c) c.addMarker(label); });
  }

