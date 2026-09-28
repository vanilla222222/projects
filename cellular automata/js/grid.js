"use strict";

  /* ============================================================
     GRID HELPERS / ENCODING
     ============================================================ */

  function idx(x, y) {
    return y * state.cols + x;
  }

  function allocateGrids() {
    grid = new Uint8Array(state.cols * state.rows);
    nextGrid = new Uint8Array(state.cols * state.rows);
  }

  /* ---- encoding tables: each team occupies a contiguous run of raw byte
     values sized to its own numStates. Rebuilt whenever team count or any
     team's numStates changes; per-cell decode is then just an array read. ---- */

  let teamOffsets = [];
  let ownerLookup = new Array(256).fill(null);
  let stageLookup = new Array(256).fill(0);

  function rebuildEncodingTables() {
    teamOffsets = [];
    let off = 0;
    teams.forEach((t) => { teamOffsets.push(off); off += (t.numStates - 1); });
    ownerLookup.fill(null);
    stageLookup.fill(0);
    teams.forEach((t, ti) => {
      const stride = t.numStates - 1;
      for (let stage = 1; stage <= stride; stage++) {
        const raw = teamOffsets[ti] + stage;
        if (raw < 256) { ownerLookup[raw] = ti; stageLookup[raw] = stage; }
      }
    });
  }

  // Changes one team's generation count and remaps every existing grid cell
  // from the old encoding to the new one (every team after `t` shifts offset).
  function changeTeamNumStates(t, newNumStates) {
    const oldOwnerLookup = ownerLookup.slice();
    const oldStageLookup = stageLookup.slice();
    teams[t].numStates = clamp(newNumStates, 2, MAX_GENERATIONS);
    rebuildEncodingTables();
    for (let i = 0; i < grid.length; i++) {
      const raw = grid[i];
      if (raw === 0) continue;
      const owner = oldOwnerLookup[raw];
      if (owner === null) { grid[i] = 0; continue; }
      const stage = Math.min(oldStageLookup[raw], teams[owner].numStates - 1);
      grid[i] = teamOffsets[owner] + stage;
    }
  }

  function ownerOf(s) {
    return s === 0 ? null : ownerLookup[s];
  }

  function localStageOf(s) {
    return stageLookup[s];
  }

  function teamAliveValue(t) { return teamOffsets[t] + 1; }
  function teamStageMax(t) { return teamOffsets[t] + (teams[t].numStates - 1); }

  function nextDecayValue(s, owner) {
    const max = teamStageMax(owner);
    return (s + 1 > max) ? 0 : s + 1;
  }

  function stateAlpha(s) {
    const owner = ownerOf(s);
    if (owner === null) return 0;
    const numStates = teams[owner].numStates;
    if (numStates <= 2) return 1;
    const localStage = localStageOf(s);
    return Math.max(0.08, 1 - (localStage - 1) / (numStates - 1));
  }

  function activeTeam() { return teams[state.activeTeam]; }

  /* ---- brush: map a UI "stage" (0 = eraser, 1 = alive, 2..C-1 = decaying)
     for the active team into the raw grid-encoded value ---- */

  function brushValueForStage(teamIndex, stage) {
    if (stage <= 0) return 0;
    return teamOffsets[teamIndex] + stage;
  }

  function currentPaintValue() {
    return brushValueForStage(state.activeTeam, state.brush.stage);
  }

  // Uniformly random raw cell value across the ENTIRE current state space —
  // empty, or any team at any of its generations — used by "full" noise mode
  // and as the mutation target for every other noise mode's eligible cells.
  function randomEncodedValue() {
    const totalValues = 1 + teams.reduce((sum, t) => sum + (t.numStates - 1), 0);
    let pick = Math.floor(Math.random() * totalValues);
    if (pick === 0) return 0;
    pick -= 1;
    for (let t = 0; t < teams.length; t++) {
      const stride = teams[t].numStates - 1;
      if (pick < stride) return teamOffsets[t] + pick + 1;
      pick -= stride;
    }
    return 0;
  }

  /* ---- circular brush footprint ---- */

  function offsetToCube(col, row) {
    const x = col - (row - (row & 1)) / 2;
    const z = row;
    const y = -x - z;
    return { x, y, z };
  }
  function hexDistanceOffset(c1, r1, c2, r2) {
    const a = offsetToCube(c1, r1);
    const b = offsetToCube(c2, r2);
    return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.z - b.z));
  }

  function forEachCellInBrush(cx, cy, callback) {
    const r = state.brush.size;
    if (r <= 0) {
      if (cx >= 0 && cx < state.cols && cy >= 0 && cy < state.rows) callback(cx, cy);
      return;
    }
    if (state.gridShape === "hex") {
      for (let dy = -r - 1; dy <= r + 1; dy++) {
        for (let dx = -r - 2; dx <= r + 2; dx++) {
          const x = cx + dx, y = cy + dy;
          if (x < 0 || x >= state.cols || y < 0 || y >= state.rows) continue;
          if (hexDistanceOffset(cx, cy, x, y) <= r) callback(x, y);
        }
      }
    } else if (state.gridShape === "tri") {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) > r) continue;
          const x = cx + dx, y = cy + dy;
          if (x < 0 || x >= state.cols || y < 0 || y >= state.rows) continue;
          callback(x, y);
        }
      }
    } else {
      const rr = r * r + 0.4;
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dy * dy > rr) continue;
          const x = cx + dx, y = cy + dy;
          if (x < 0 || x >= state.cols || y < 0 || y >= state.rows) continue;
          callback(x, y);
        }
      }
    }
  }

  /* ---- neighbor counting: only fully-alive cells of each team count ---- */

  const MOORE_OFFSETS = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0],           [1, 0],
    [-1, 1],  [0, 1],  [1, 1],
  ];
  const VON_NEUMANN_OFFSETS = [
    [0, -1],
    [-1, 0], [1, 0],
    [0, 1],
  ];
  const HEX_OFFSETS_EVEN_ROW = [[-1, -1], [0, -1], [-1, 0], [1, 0], [-1, 1], [0, 1]];
  const HEX_OFFSETS_ODD_ROW  = [[0, -1], [1, -1], [-1, 0], [1, 0], [0, 1], [1, 1]];

  function triOffsetsFor(x, y) {
    const up = (x + y) % 2 === 0;
    return up ? [[-1, 0], [1, 0], [0, 1]] : [[-1, 0], [1, 0], [0, -1]];
  }

  // Reusable scratch buffers: one countNeighborsAt() call per cell per step,
  // used-then-discarded immediately, so no per-cell allocation is needed.
  let scratchStage1 = null, scratchAny = null, scratchByGen = null;

  function ensureScratchBuffers() {
    const n = state.numTeams;
    if (!scratchStage1 || scratchStage1.length !== n) {
      scratchStage1 = new Int32Array(n);
      scratchAny = new Int32Array(n);
      scratchByGen = new Int32Array(n * (MAX_GENERATIONS - 1));
    }
  }

  function neighborOffsetsFor(x, y) {
    if (state.gridShape === "hex") return (y % 2 === 0) ? HEX_OFFSETS_EVEN_ROW : HEX_OFFSETS_ODD_ROW;
    if (state.gridShape === "tri") return triOffsetsFor(x, y);
    return state.neighborhood === "vonneumann" ? VON_NEUMANN_OFFSETS : MOORE_OFFSETS;
  }

  // Tallies neighbors three ways in one pass: stage1 (only fully-alive, "ignore"
  // mode), any (any generation counts as a member, "health" mode), and byGen
  // (per specific generation, "independent" mode).
  function countNeighborsAt(x, y) {
    ensureScratchBuffers();
    scratchStage1.fill(0);
    scratchAny.fill(0);
    scratchByGen.fill(0);
    const offsets = neighborOffsetsFor(x, y);
    for (const [dx, dy] of offsets) {
      let nx = x + dx, ny = y + dy;
      if (state.wrap) {
        nx = (nx + state.cols) % state.cols;
        ny = (ny + state.rows) % state.rows;
      } else if (nx < 0 || nx >= state.cols || ny < 0 || ny >= state.rows) {
        continue;
      }
      const v = grid[idx(nx, ny)];
      if (v === 0) continue;
      const t = ownerLookup[v];
      if (t === null || t >= state.numTeams) continue;
      const stage = stageLookup[v];
      scratchAny[t]++;
      if (stage === 1) scratchStage1[t]++;
      scratchByGen[t * (MAX_GENERATIONS - 1) + (stage - 1)]++;
    }
    return { stage1: scratchStage1, any: scratchAny, byGen: scratchByGen };
  }

  function isKilledByRivalsIndependent(team, ownerIndex, counts) {
    for (let et = 0; et < state.numTeams; et++) {
      if (et === ownerIndex) continue;
      const enemyStride = teams[et].numStates - 1;
      for (let eg = 0; eg < enemyStride; eg++) {
        const n = counts.byGen[et * (MAX_GENERATIONS - 1) + eg];
        if (n > 0 && team.killedByEnemyGen[eg].has(n)) return true;
      }
    }
    return false;
  }

  // Decides what an EMPTY cell becomes: each team checks neighbor counts per
  // its own interaction mode (ignore: stage1 only; health: any generation;
  // independent: each of its own generation's Born rows independently), and
  // the highest matching count across all teams/generations wins the tie.
  function evaluateBirth(counts) {
    let winner = -1, winnerCount = -1;
    for (let t = 0; t < state.numTeams; t++) {
      const team = teams[t];
      if (team.interaction === "independent") {
        const stride = team.numStates - 1;
        for (let g = 0; g < stride; g++) {
          const n = counts.byGen[t * (MAX_GENERATIONS - 1) + g];
          if (team.birthByGen[g].has(n) && n > winnerCount) { winner = t; winnerCount = n; }
        }
      } else {
        const n = team.interaction === "health" ? counts.any[t] : counts.stage1[t];
        if (team.birth.has(n) && n > winnerCount) { winner = t; winnerCount = n; }
      }
    }
    return winner;
  }

  // "Killed" fully replaces rivalry and is active in every interaction mode:
  // each OTHER team gets its own independent set of rows, one per that
  // enemy's generation — if this cell's neighbor count of that specific
  // enemy at that specific stage matches, this cell is killed.
  function isKilledByRivals(team, ownerIndex, counts) {
    for (let et = 0; et < state.numTeams; et++) {
      if (et === ownerIndex) continue;
      const enemyStride = teams[et].numStates - 1;
      const rows = team.killedByEnemyGen[et];
      for (let eg = 0; eg < enemyStride; eg++) {
        const n = counts.byGen[et * (MAX_GENERATIONS - 1) + eg];
        if (n > 0 && rows[eg].has(n)) return true;
      }
    }
    return false;
  }

  // Decides what an EXISTING cell becomes. "independent" mode gives every
  // generation its own Survive row; "ignore"/"health" only evaluate survive
  // at generation 1 — later generations just count down, same as today —
  // the two modes differ only in whether decaying cells count as neighbors
  // for everyone else. The killed check (above) applies the same way in
  // every mode, replacing the old single rivalry-threshold number.
  function evaluateExistingCell(s, owner, counts, kills) {
    const team = teams[owner];
    const stage = stageLookup[s];

    if (team.interaction === "independent") {
      const gIdx = stage - 1;
      const nSelf = counts.byGen[owner * (MAX_GENERATIONS - 1) + gIdx];
      const killed = isKilledByRivals(team, owner, counts);
      if (killed) kills[owner]++;
      if (!killed && team.surviveByGen[gIdx].has(nSelf)) return s;
      return nextDecayValue(s, owner);
    }

    if (stage !== 1) return nextDecayValue(s, owner);

    const useAny = team.interaction === "health";
    const nSelf = useAny ? counts.any[owner] : counts.stage1[owner];
    const killed = isKilledByRivals(team, owner, counts);
    if (killed) kills[owner]++;
    if (!killed && team.survive.has(nSelf)) return s;
    return nextDecayValue(s, owner);
  }

  function maxPossibleNeighbors() {
    if (state.gridShape === "hex") return 6;
    if (state.gridShape === "tri") return 3;
    return state.neighborhood === "vonneumann" ? 4 : 8;
  }

  /* ---- compactedness: isoperimetric quotient (4π·area / perimeter²) of each
     team's live+decaying cells, using true edge-adjacency (not the rule's
     Moore/Von Neumann setting) so it's a pure shape measure, 0..1, higher =
     rounder/more compact, lower = more sprawling/fractal ---- */

  function edgeNeighborOffsets(x, y) {
    if (state.gridShape === "hex") return (y % 2 === 0) ? HEX_OFFSETS_EVEN_ROW : HEX_OFFSETS_ODD_ROW;
    if (state.gridShape === "tri") return triOffsetsFor(x, y);
    return VON_NEUMANN_OFFSETS;
  }

  function computeCompactedness(area, perimeter) {
    const out = new Array(area.length).fill(0);
    for (let t = 0; t < area.length; t++) {
      if (area[t] > 0 && perimeter[t] > 0) {
        out[t] = clamp((4 * Math.PI * area[t]) / (perimeter[t] * perimeter[t]), 0, 1) * 100;
      }
    }
    return out;
  }

  // Mean decay-stage of a team's live cells, normalized 0% (everyone at
  // gen 1, freshly born) .. 100% (everyone at that team's oldest stage).
  function computeAverageAge(area, ageSum) {
    const out = new Array(area.length).fill(0);
    for (let t = 0; t < area.length; t++) {
      const span = teams[t].numStates - 2; // stage range from 1 to numStates-1
      if (area[t] > 0 && span > 0) {
        const avgStage = ageSum[t] / area[t];
        out[t] = clamp(((avgStage - 1) / span) * 100, 0, 100);
      }
    }
    return out;
  }

  // Shannon entropy of the whole-board raw-value distribution (empty counts
  // as one value, each team's each generation counts as its own value),
  // normalized 0% (grid is one uniform value) .. 100% (every possible value
  // is equally likely — maximum disorder given the current rule config).
  function computeEntropy() {
    const counts = new Map();
    for (let i = 0; i < grid.length; i++) {
      const v = grid[i];
      counts.set(v, (counts.get(v) || 0) + 1);
    }
    const total = grid.length;
    if (total === 0) return 0;
    let h = 0;
    counts.forEach((c) => {
      const p = c / total;
      h -= p * Math.log2(p);
    });
    const possibleValues = 1 + teams.reduce((sum, t) => sum + (t.numStates - 1), 0);
    const maxH = Math.log2(Math.max(2, possibleValues));
    return maxH > 0 ? clamp((h / maxH) * 100, 0, 100) : 0;
  }

  /* ---- board-stability tracking: a cheap rolling hash of the whole grid,
     checked against a short history window — a repeat means the automaton
     has settled into a still-life or a cycle of that period ---- */

  const STABILITY_WINDOW = 64;
  let gridHashHistory = [];
  let boardStablePeriod = 0;

  function hashGrid() {
    let h = 2166136261;
    for (let i = 0; i < grid.length; i++) {
      h ^= grid[i];
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function updateStabilityTracking() {
    const h = hashGrid();
    gridHashHistory.push(h);
    if (gridHashHistory.length > STABILITY_WINDOW + 1) gridHashHistory.shift();
    const lastIdx = gridHashHistory.length - 1;
    const matchIdx = gridHashHistory.lastIndexOf(h, lastIdx - 1);
    boardStablePeriod = matchIdx === -1 ? 0 : lastIdx - matchIdx;
  }

  function resetStabilityTracking() {
    gridHashHistory = [];
    boardStablePeriod = 0;
    resetAutoMarkerState();
  }

  /* ---- auto markers: watches for a handful of significant state changes
     each generation and drops a chart marker automatically, so notable
     moments are logged without having to catch them live ---- */

  let autoMarkerState = { leader: -1, extinct: new Set(), wasStable: false };

  function resetAutoMarkerState() {
    autoMarkerState = { leader: -1, extinct: new Set(), wasStable: false };
  }

  function detectAutoMarkers(pops) {
    pops.forEach((p, t) => {
      if (p === 0 && !autoMarkerState.extinct.has(t)) {
        autoMarkerState.extinct.add(t);
        addMarkerAll(`Team ${t + 1} extinct`);
      } else if (p > 0 && autoMarkerState.extinct.has(t)) {
        autoMarkerState.extinct.delete(t);
      }
    });

    let leadT = -1, leadP = 0;
    pops.forEach((p, t) => { if (p > leadP) { leadP = p; leadT = t; } });
    if (leadT !== -1 && leadT !== autoMarkerState.leader) {
      addMarkerAll(`Team ${leadT + 1} takes the lead`);
      autoMarkerState.leader = leadT;
    }

    const nowStable = boardStablePeriod > 0;
    if (nowStable && !autoMarkerState.wasStable) {
      addMarkerAll(`Board stabilized (period ${boardStablePeriod})`);
    } else if (!nowStable && autoMarkerState.wasStable) {
      addMarkerAll("Board destabilized");
    }
    autoMarkerState.wasStable = nowStable;
  }

  /* ---- Margolus (block) update scheme — a fundamentally different rule
     model from everything above: the grid is diced into non-overlapping 2x2
     blocks, alternating which partition is used each generation, and each
     whole block is replaced at once by a rule that looks at its 4 cells
     together. Positions within a block: 0=TL, 1=TR, 2=BL, 3=BR — packed into
     a 4-bit "alive" mask as (TL<<3)|(TR<<2)|(BL<<1)|BR.

     Each rule returns { outMask, mapping }: outMask is the new 4-bit alive
     pattern; mapping[pi] is the source position (0-3) whose exact raw value
     (team + generation stage) should be copied to output position pi, or -1
     if that output cell is newly created by the rule (e.g. by inversion)
     and needs a fresh team assignment rather than an inherited one. ---- */

  function popcount4(mask) {
    return ((mask >> 3) & 1) + ((mask >> 2) & 1) + ((mask >> 1) & 1) + (mask & 1);
  }

  function permuteMask(mask, mapping) {
    let out = 0;
    for (let pi = 0; pi < 4; pi++) {
      if (mapping[pi] !== -1 && ((mask >> (3 - mapping[pi])) & 1)) out |= (1 << (3 - pi));
    }
    return out;
  }

  const MARGOLUS_ROTATE_CW = [2, 0, 3, 1];
  const MARGOLUS_ROTATE_CCW = [1, 3, 0, 2];
  const MARGOLUS_ROTATE_180 = [3, 2, 1, 0];

  const MARGOLUS_RULES = {
    // Every block spins in place — a pure permutation, so cell count is
    // exactly conserved every generation.
    rotateCW: (mask) => ({ outMask: permuteMask(mask, MARGOLUS_ROTATE_CW), mapping: MARGOLUS_ROTATE_CW }),
    rotateCCW: (mask) => ({ outMask: permuteMask(mask, MARGOLUS_ROTATE_CCW), mapping: MARGOLUS_ROTATE_CCW }),
    // Corners swap diagonally — an elastic "billiard ball" gas.
    bbm: (mask) => ({ outMask: permuteMask(mask, MARGOLUS_ROTATE_180), mapping: MARGOLUS_ROTATE_180 }),
    // Reversible: exactly-2-alive blocks just rotate 180; every other block
    // inverts (every inverted cell is "new", no team to inherit) then rotates.
    critters: (mask) => {
      if (popcount4(mask) === 2) {
        return { outMask: permuteMask(mask, MARGOLUS_ROTATE_180), mapping: MARGOLUS_ROTATE_180 };
      }
      const inverted = (~mask) & 0b1111;
      const outMask = permuteMask(inverted, MARGOLUS_ROTATE_180);
      return { outMask, mapping: [-1, -1, -1, -1] };
    },
    // Every block inverts every generation — explosive fractal growth.
    tron: (mask) => ({ outMask: (~mask) & 0b1111, mapping: [-1, -1, -1, -1] }),
  };

  // Standalone full-grid pass for area/perimeter/age-sum, used by Margolus
  // mode since its block loop doesn't naturally visit cells that way (the
  // standard step() accumulates these inline instead, for one fewer pass).
  function computeAreaPerimeterAge() {
    const area = new Array(state.numTeams).fill(0);
    const perimeter = new Array(state.numTeams).fill(0);
    const ageSum = new Array(state.numTeams).fill(0);
    for (let y = 0; y < state.rows; y++) {
      for (let x = 0; x < state.cols; x++) {
        const s = grid[idx(x, y)];
        const owner = ownerOf(s);
        if (owner === null || owner >= state.numTeams) continue;
        area[owner]++;
        ageSum[owner] += stageLookup[s];
        const offsets = edgeNeighborOffsets(x, y);
        for (const [dx, dy] of offsets) {
          let nx = x + dx, ny = y + dy;
          if (state.wrap) {
            nx = (nx + state.cols) % state.cols;
            ny = (ny + state.rows) % state.rows;
          } else if (nx < 0 || nx >= state.cols || ny < 0 || ny >= state.rows) {
            perimeter[owner]++;
            continue;
          }
          if (ownerOf(grid[idx(nx, ny)]) !== owner) perimeter[owner]++;
        }
      }
    }
    return { area, perimeter, ageSum };
  }

  function stepMargolus() {
    const rule = MARGOLUS_RULES[state.margolusRule] || MARGOLUS_RULES.rotateCW;
    nextGrid.set(grid);

    const offset = state.margolusPhase === 0 ? 0 : -1;
    for (let by = offset; by < state.rows; by += 2) {
      for (let bx = offset; bx < state.cols; bx += 2) {
        const coords = [[bx, by], [bx + 1, by], [bx, by + 1], [bx + 1, by + 1]];
        const cellIdxs = [];
        let outOfBounds = false;
        for (const [cx, cy] of coords) {
          let x = cx, y = cy;
          if (state.wrap) {
            x = (x + state.cols) % state.cols;
            y = (y + state.rows) % state.rows;
          } else if (x < 0 || x >= state.cols || y < 0 || y >= state.rows) {
            outOfBounds = true;
            break;
          }
          cellIdxs.push(idx(x, y));
        }
        if (outOfBounds) continue;

        const vals = cellIdxs.map((i) => grid[i]);
        let mask = 0;
        for (let pi = 0; pi < 4; pi++) if (ownerOf(vals[pi]) !== null) mask |= (1 << (3 - pi));

        const { outMask, mapping } = rule(mask);
        const presentTeams = vals.map(ownerOf).filter((o) => o !== null);
        for (let pi = 0; pi < 4; pi++) {
          const alive = (outMask >> (3 - pi)) & 1;
          if (!alive) { nextGrid[cellIdxs[pi]] = 0; continue; }
          const src = mapping[pi];
          if (src !== -1 && ownerOf(vals[src]) !== null) {
            nextGrid[cellIdxs[pi]] = vals[src];
          } else {
            const t = presentTeams.length
              ? presentTeams[Math.floor(Math.random() * presentTeams.length)]
              : Math.floor(Math.random() * state.numTeams);
            nextGrid[cellIdxs[pi]] = teamAliveValue(t);
          }
        }
      }
    }

    if (state.noise > 0) {
      const chance = state.noise / 100;
      for (let i = 0; i < nextGrid.length; i++) {
        const oldVal = grid[i];
        const newVal = nextGrid[i];
        let eligible;
        if (state.noiseMode === "birth") eligible = ownerOf(oldVal) === null && ownerOf(newVal) !== null;
        else if (state.noiseMode === "death") eligible = ownerOf(newVal) === null || stageLookup[newVal] > 1;
        else if (state.noiseMode === "untouched") eligible = oldVal === newVal;
        else eligible = true;
        if (eligible && Math.random() < chance) nextGrid[i] = randomEncodedValue();
      }
    }

    const births = new Array(state.numTeams).fill(0);
    const deaths = new Array(state.numTeams).fill(0);
    for (let i = 0; i < grid.length; i++) {
      const oldOwner = ownerOf(grid[i]);
      const newOwner = ownerOf(nextGrid[i]);
      if (oldOwner !== newOwner) {
        if (oldOwner !== null && oldOwner < state.numTeams) deaths[oldOwner]++;
        if (newOwner !== null && newOwner < state.numTeams) births[newOwner]++;
      }
    }

    const tmp = grid;
    grid = nextGrid;
    nextGrid = tmp;
    state.margolusPhase = 1 - state.margolusPhase;

    const { area, perimeter, ageSum } = computeAreaPerimeterAge();
    const kills = new Array(state.numTeams).fill(0);
    finishGeneration(births, deaths, kills, area, perimeter, ageSum);
  }

  /* ---- simulation step ---- */

  function step() {
    if (state.updateScheme === "margolus") { stepMargolus(); return; }

    const births = new Array(state.numTeams).fill(0);
    const deaths = new Array(state.numTeams).fill(0);
    const kills = new Array(state.numTeams).fill(0);
    const area = new Array(state.numTeams).fill(0);
    const perimeter = new Array(state.numTeams).fill(0);
    const ageSum = new Array(state.numTeams).fill(0);

    for (let y = 0; y < state.rows; y++) {
      for (let x = 0; x < state.cols; x++) {
        const i = idx(x, y);
        const s = grid[i];
        const counts = countNeighborsAt(x, y);
        const owner = ownerOf(s);
        let ns;

        if (owner === null) {
          const winner = evaluateBirth(counts);
          ns = winner >= 0 ? teamAliveValue(winner) : 0;
        } else {
          ns = evaluateExistingCell(s, owner, counts, kills);
        }
        nextGrid[i] = ns;

        if (owner !== null && owner < state.numTeams) {
          area[owner]++;
          ageSum[owner] += stageLookup[s];
          const offsets = edgeNeighborOffsets(x, y);
          for (const [dx, dy] of offsets) {
            let nx = x + dx, ny = y + dy;
            if (state.wrap) {
              nx = (nx + state.cols) % state.cols;
              ny = (ny + state.rows) % state.rows;
            } else if (nx < 0 || nx >= state.cols || ny < 0 || ny >= state.rows) {
              perimeter[owner]++;
              continue;
            }
            if (ownerOf(grid[idx(nx, ny)]) !== owner) perimeter[owner]++;
          }
        }
      }
    }

    if (state.noise > 0) {
      const chance = state.noise / 100;
      for (let i = 0; i < nextGrid.length; i++) {
        const oldVal = grid[i];
        const newVal = nextGrid[i];
        let eligible;
        if (state.noiseMode === "birth") {
          eligible = ownerOf(oldVal) === null && ownerOf(newVal) !== null;
        } else if (state.noiseMode === "death") {
          eligible = ownerOf(newVal) === null || stageLookup[newVal] > 1;
        } else if (state.noiseMode === "untouched") {
          eligible = oldVal === newVal;
        } else {
          eligible = true; // "full"
        }
        if (eligible && Math.random() < chance) {
          nextGrid[i] = randomEncodedValue();
        }
      }
    }

    for (let i = 0; i < grid.length; i++) {
      const oldOwner = ownerOf(grid[i]);
      const newOwner = ownerOf(nextGrid[i]);
      if (oldOwner !== newOwner) {
        if (oldOwner !== null && oldOwner < state.numTeams) deaths[oldOwner]++;
        if (newOwner !== null && newOwner < state.numTeams) births[newOwner]++;
      }
    }

    const tmp = grid;
    grid = nextGrid;
    nextGrid = tmp;
    finishGeneration(births, deaths, kills, area, perimeter, ageSum);
  }

  // Shared tail for both step() and stepMargolus(): swap already done by the
  // caller, this just advances the generation counter and publishes stats.
  function finishGeneration(births, deaths, kills, area, perimeter, ageSum) {
    state.generation++;
    updateStabilityTracking();

    const compactedness = computeCompactedness(area, perimeter);
    const avgAge = computeAverageAge(area, ageSum);
    const pops = populationByTeam();
    pops.forEach((p, t) => {
      if (charts[t]) {
        charts[t].writePoint(state.generation, p, births[t] || 0, deaths[t] || 0, {
          compactedness: compactedness[t] || 0,
          avgAge: avgAge[t] || 0,
          kills: kills[t] || 0,
        });
      }
    });
    if (globalChart) {
      const totalPop = pops.reduce((a, b) => a + b, 0);
      const totalBirths = births.reduce((a, b) => a + b, 0);
      const totalDeaths = deaths.reduce((a, b) => a + b, 0);
      globalChart.writePoint(state.generation, totalPop, totalBirths, totalDeaths, { entropy: computeEntropy() });
    }
    detectAutoMarkers(pops);
    updateStats();
  }

  function randomBlockColor(ox, oy, colorValue) {
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 10; x++) {
        if (Math.random() < 0.4) {
          grid[idx(clamp(ox + x, 0, state.cols - 1), clamp(oy + y, 0, state.rows - 1))] = colorValue;
        }
      }
    }
  }

  function randomize(density = 0.32) {
    for (let i = 0; i < grid.length; i++) {
      if (Math.random() < density) {
        const t = Math.floor(Math.random() * state.numTeams);
        grid[i] = teamAliveValue(t);
      } else {
        grid[i] = 0;
      }
    }
    state.generation = 0;
    resetStabilityTracking();
    const pops = populationByTeam();
    pops.forEach((p, t) => { if (charts[t]) charts[t].resetHistory("Randomize", p); });
    if (globalChart) globalChart.resetHistory("Randomize", pops.reduce((a, b) => a + b, 0));
    updateStats();
    render();
  }

  function clearGrid() {
    grid.fill(0);
    state.generation = 0;
    resetStabilityTracking();
    teams.forEach((_, t) => { if (charts[t]) charts[t].resetHistory("Clear", 0); });
    if (globalChart) globalChart.resetHistory("Clear", 0);
    updateStats();
    render();
  }

  function populationByTeam() {
    const pops = new Array(state.numTeams).fill(0);
    for (let i = 0; i < grid.length; i++) {
      const o = ownerOf(grid[i]);
      if (o !== null && o < state.numTeams) pops[o]++;
    }
    return pops;
  }

