# Part 3 Bugs: UI audit

## Files changed

- `js/icons.js`
  - Added 8 bug icons: `aphid`, `locust`, `beetle`, `worm`, `tick`, `leech`, `bee` and `butterfly`. The bee's wings use the fixed colour `#dbe8f0`.
  - Added a `bug` utility icon, used on the Bugs tab.
- `js/render.js`
  - Bugs view: `RAMPS.bugs`, a `bugs` branch in `setMode` using `percentile99(eco.bugs.total)`, and `LIVE_MODES.bugs`.
  - `_pushBugs` draws swarm particles at zoom 9 and above, in every view.
  - `_hostHighlight` stops a bug highlight from dimming plants and animals.
  - New constants: `BUG_DOT`, `BUG_DOT_PX`, `BUG_HL_SCALE`, `BUG_PER_DENSITY`, `BUG_JITTER` and `BUG_SPEED`.
- `js/main.js`
  - Bugs stat card with a niche sub-line and pollination %, a Bugs legend entry and a bugs series in the population chart.
  - Bugs species tab, `roleOf`/`roleTag`/`categoryLabel` for bugs, and `BUG_TRAITS` with `bugGeneShown`.
  - Bug detail: subtitle, Land/Aquatic badge, Mean density cell and per-niche trait rows.
  - A `Pest defence` row (gene 13) added to `PLANT_TRAITS`.
  - Tooltip bug rows and pollination; `bugsAt`, `densestBug` and `clickTarget` for clicks.
  - `GROUP_COLORS.bugs`, plus `SWARM_*` fallbacks for when the sim's `BUG_*` globals are missing.
- `index.html`
  - Added a Bugs view button, a Bugs tab with `#countBug`, and the `js/sim/bugs.js` script tag.
  - Changed the map hint text.
- `css/style.css`
  - Tab sizing changed to `flex: 1 1 auto`, and tab icons are hidden at widths of 1250px or less.
  - Added `.stat-sub`, `.tt-hint` and the `.role-bug-*` classes.
- `CODE_REFERENCE.md`: updated the Icons, Renderer and App/main sections.
- `complexities.md`: updated the render.js and main.js notes. Scores are unchanged.

## Tests / results

- **`node --check`:** passes for render.js, main.js and icons.js.
- **Comment grep:**
  - `grep -nE '//|/\*'` finds 0 matches in the 3 JS files.
  - index.html has 0 `<!--`.
  - The css diff adds 0 `/*` lines.
- **Headless CDP probe** (scratchpad `probe-p3.html?check`, seed 7, 600 ticks):
  - There are no exceptions or console errors, and all 10 view modes draw.
  - 13 bug species are listed.
  - Detail views show the correct trait rows for each niche:
    - pest: Swarming;
    - pollinator: Flower hue and Specialism;
    - parasite: Host size;
    - detritivore: the base rows.
  - Land plants show Pest defence; fungi hide it.
  - The stat card shows the total, niche tile counts and "pollination 55%".
  - Tooltip bug rows and pollination render.
  - Clicks select the plant in normal views and the densest bug in the Bugs view.
- **Without `bugs.js`** (`probe-nobugs.html`):
  - The app loads and the Bugs view fills with 0.
  - Tooltips and clicks work, with no exceptions.
- **Layout:**
  - At 1600 px wide, the tab bar measures 329/329 px with no clipping.
  - At 1200 px wide, it measures 299/299 px with no clipping.
- **Icons:** all 9 new icons were rendered at 110 px in a scratchpad page and inspected visually.

## Screenshots

- `feature-research/ecosystem-expansion/part3/screenshots/bugs-view.png`: the Bugs heat map, with 5 tabs.
- `feature-research/ecosystem-expansion/part3/screenshots/swarm.png`: butterfly swarm particles at zoom 16, with the species detail open.

## Deviations

- The swarm dot size is 0.1 world units or at least 4.5 px, larger than the planned ~0.07, because the smaller dots were not visible. A highlighted species is drawn 1.6× larger.
- The right column keeps its 330 px width. The tabs use `flex: 1 1 auto`, and tab icons are hidden at 1250 px or less, instead of widening the panel.
- Highlighting a bug species does not dim plants or animals (`_hostHighlight`).
- The map hint now reads "click a creature, plant or swarm to inspect it".
- In the Bugs view, the tooltip lists bug rows first and clicks prefer the densest swarm. In other views, bugs come last.
- Water plants also hide Pest defence, through the existing rule that hides genes 8 and up for water plants.
- `SWARM_*` UI fallbacks are used when `BUG_NICHES` or `BUG_CATEGORY_LABEL` are missing, and `BUG_MASKS` when it is defined.
- In `swarm.png`, the open detail panel covers the tab bar. The app already does this.

## Checklist

- [x] No new comments in JS, HTML or CSS (grep above).
- [x] CODE_REFERENCE entries grep-verified:

  | Entry | Line |
  | --- | --- |
  | `aphid` icon table | 862 |
  | bugs view | 988 |
  | `_pushBugs` | 1058 |
  | `BUG_DOT` size | 1061 |
  | `_hostHighlight` | 1064 |
  | `LIVE_MODES` | 1080 |
  | `SWARM_*` | 1131 |
  | Bugs stat card | 1164 |
  | Bugs tab | 1167 |
  | Pest defence | 1187 |
  | `BUG_TRAITS` | 1191 |
  | `clickTarget` | 1198 |
  | tooltip `bugsAt` | 1209 |

- [x] Screenshots exist: `screenshots/bugs-view.png` and `screenshots/swarm.png`.
- [x] No edits to `js/sim/*` and no git state changes.
