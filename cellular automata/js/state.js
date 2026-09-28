"use strict";


  const SQRT3 = Math.sqrt(3);
  const TEAM_PALETTE = ["#9bff6b", "#ff5ec4", "#4dd8b0", "#ffb454", "#c89bff", "#ff9f4d"];
  const BOARD_MAX = 2000; // safety ceiling, not a hard "authored" limit — keeps a fat-fingered value from hanging the tab
  const MAX_GENERATIONS = 24; // per-team cap on states (C); also sizes the killed-by-enemy-generation rows
  const MAX_TEAMS = 6;

  /* ============================================================
     STATE
     ============================================================ */

  const state = {
    cols: 80,
    rows: 50,
    wrap: false,
    gridShape: "square",       // "square" | "hex" | "tri"
    neighborhood: "moore",     // "moore" (8) | "vonneumann" (4) — square only
    updateScheme: "standard",  // "standard" | "margolus" — margolus forces gridShape "square"
    margolusRule: "rotateCW",  // "rotateCW" | "rotateCCW" | "bbm" | "critters" | "tron"
    margolusPhase: 0,          // alternating 2x2 block partition, flips every generation
    noise: 0.1,                 // percentage (0.1 = 0.1%), not a fraction
    noiseMode: "full",          // "full" | "birth" | "death" | "untouched" — which cells are eligible
    running: false,
    genPerSec: 12,
    generation: 0,
    showGrid: true,
    cellSize: 10,
    hexRadius: 10,
    triWidth: 20,
    renderer: "canvas2d",       // "canvas2d" | "webgl"
    activeTeam: 0,
    numTeams: 2,
    syncRuleset: false,         // when true, editing any team's birth/survive applies it to all teams
    boardView: { zoom: 1, panX: 0, panY: 0 },
  };

  function makeDefaultTeam(i) {
    return {
      color: TEAM_PALETTE[i % TEAM_PALETTE.length],
      numStates: 2,             // this team's own C — 2 is classic alive/dead
      interaction: "ignore",    // "ignore" | "health" | "independent"
      syncGenerations: true,    // independent mode: mirror gen-1's Born/Survive to every other generation
      // Single shared rule, used in "ignore" and "health" modes:
      birth: new Set([3]),
      survive: new Set([2, 3]),
      // Per-generation rules, used only in "independent" mode. Indexed by
      // (own generation - 1); fixed at MAX_GENERATIONS-1 slots so raising/
      // lowering a team's numStates never discards edited rows.
      birthByGen: Array.from({ length: MAX_GENERATIONS - 1 }, () => new Set([3])),
      surviveByGen: Array.from({ length: MAX_GENERATIONS - 1 }, () => new Set([2, 3])),
      // Killed-by-enemy-generation: killedByEnemyGen[enemyTeamIndex][enemyGenIndex]
      // is the set of neighbor-counts-of-that-enemy-at-that-stage that kill this
      // cell. Every OTHER team gets its own fully independent set of rows;
      // killedSyncGenerations[enemyTeamIndex] mirrors that one enemy's gen-1
      // row to the rest of that enemy's rows (does not cross enemies). Fixed
      // at MAX_TEAMS slots regardless of current team count, same reasoning
      // as the generation arrays above. Active in every interaction mode —
      // this fully replaces the old single rivalry-threshold number.
      killedByEnemyGen: Array.from({ length: MAX_TEAMS }, () =>
        Array.from({ length: MAX_GENERATIONS - 1 }, () => new Set())
      ),
      killedSyncGenerations: Array.from({ length: MAX_TEAMS }, () => true),
    };
  }

  // Each team has its own Born/Survive rule, its own color, and its own
  // number of generations (C). See ruleset.js for the "independent" mode's
  // per-generation Born/Survive variants and the killed-by-enemy-generation
  // system (which replaces a simple rivalry threshold entirely).
  let teams = [makeDefaultTeam(0), makeDefaultTeam(1)];

  // Grid encoding: teams are packed back-to-back, each with its own stride
  // (its own numStates - 1 local stages). Because the stride varies per team,
  // decoding a raw byte isn't simple arithmetic anymore — ownerLookup/
  // stageLookup (grid.js) are small precomputed tables rebuilt by
  // rebuildEncodingTables() whenever team count or any team's numStates
  // changes, so per-cell decode stays an O(1) array read.
  //   0                    = empty
  //   team t: offset[t]+1 .. offset[t]+stride[t]   = 1 = alive, rest = decaying
  let grid = new Uint8Array(state.cols * state.rows);
  let nextGrid = new Uint8Array(state.cols * state.rows);

  // Brush: which lifecycle stage of the active team it paints (0 = eraser),
  // and its circular radius in cells (0 = single cell).
  state.brush = { stage: 1, size: 0 };

  // Board tool: "paint" | "select" | "stamp".
  state.tool = "paint";

  let selectedCells = new Set();
  let stampLibrary = [];
  let armedStamp = null;
  let stampIdCounter = 1;
  let charts = []; // one createMetricsChart instance per team, parallel to `teams`
  let globalChart = null; // aggregate chart across all teams (population/births/deaths/net/density)

  // Stamp folders: { id, name, collapsed }. Stamps reference a folder via
  // stamp.folderId (null = ungrouped, shown at the top of the library).
  let stampFolders = [];
  let stampFolderIdCounter = 1;

  // Rotate/flip is transient: it reorients the *armed* stamp for placement
  // without mutating the saved library entry. Reset whenever a stamp is
  // (re)armed or disarmed.
  let armedOrientation = { rot: 0, flipH: false, flipV: false };
  let stampHoverCell = null; // last hovered board cell while a stamp is armed, for the ghost preview

