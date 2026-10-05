# Audit: Part 3.3, bless and curse

Commits:
- `22752a0`: sim layer
- `5f423cb`: palette, sterile badge and map pulses

Base: `dc55205`.

## What shipped

### Palette

Files: `index.html`, `css/style.css`, `js/main.js`.

- A new "Bless & curse" group sits under Disasters. It has six buttons: Feed, Heal, Sterilise, Cull, Fertilise and Blight. Blessings are drawn green and curses purple.
- A target pane (`#godBlessPane`) appears for these tools:
  - **Animal tools:**
    - chips for All, Species, and the six animal classes
    - Species reuses the 3.1 species picker, filtered to living animals
  - **Soil tools:**
    - chips for Any plant and Species
    - the picker lists living non-fungus plants
  - **"Everywhere" checkbox:**
    - labelled "Everywhere on the map", "Whole species, everywhere" or "Everywhere it grows"
    - turns a click into a map-wide action on the chosen species or class
    - disabled for All and Any plant, so there is no unbounded "every animal" button
    - the brush ring is hidden while Everywhere is on
  - **Sterilise:** a Ticks slider, 50–2000, default 500
  - **Cull:** a Share slider, 10–100%, default 50%
- Feed, Heal, Sterilise and Cull act on a single click. Fertilise and Blight are drag strokes, or a single click when Everywhere is on.
- The hint line reports the same count as the log, for example:
  - "Fed 27 animals."
  - "Sterilised 219 animals for 800 ticks."
  - "Struck down 11 animals."
  - "Fertilised 2.1k tiles."
- Failures are explained:
  - "Pick a living species first."
  - "Nobody there is sick or poisoned."
  - "Everyone there is already well fed."
  - "That soil is already rich."
- The Disasters card gets a line "N struck down by the divine hand" (`deaths.divine`).

### Sim

Every action goes through `Ecosystem.applyGod`, then `GodTools._bless` or `_soil`. Actions run between ticks.

**Targeting (`_aim`)**

- `sp` must be a living animal species. Otherwise `cls` must be 0–5. Otherwise the target is all animals.
- With `all` and a species or class, the action covers the whole map.
- Otherwise it covers the brush disc: centre is the first stroke point, r = max(1, r), and the test is `dx²+dy² ≤ r²+r`, the same as the disaster tiles.

**Feed**

- Raises energy to `emax·gf`.
- Raises fat to half of the fat cap (`emax·gf·FAT_MAX·app·0.5`).
- Only counts animals that actually changed.

**Heal**

- Clears infection through `Disease.recoverAnimal`, which keeps the immunity bookkeeping consistent.
- Clears toxin status (`fx`, `fxT`, `confuse`), gene damage (`gl`) and craving (`crv`).
- Only counts animals that changed.
- **The sim has no injury state.** Predation is all-or-nothing and there is no wound or HP field, so "injury" has nothing to clear. Heal covers disease and poison.

**Sterilise**

- A new per-animal `Int32Array A.ster` holds the tick until which the animal is sterile, as `max(existing, tick + ticks)`, clamped to 10–5000.
- It is created lazily on first use. It grows with `_grow`, is reset in `spawn`, and is copied in `_copySlot`.
- It saves automatically with the animal pool, and `poolArrays` sends it to the client because its length is a multiple of cap.
- **Breeding gate:** `(!ster || ster[i] < tick)`
- **Mate choice:** skips sterile partners (`_chooseMate(i, tick)`).
- `_reproduce` is the only birth path. It covers both direct birth and egg laying.
- Eggs laid before the curse still hatch.

**Cull**

- `k = max(1, round(frac·n))` of the n targets, with frac clamped to 0.05–1.
- Victims are chosen by a partial Fisher–Yates shuffle on `eco.rng`, then killed with `_kill(k, 1)` and removed with `_compact()`, the same as the meteor.
- Deaths are counted under a new cause, `deaths.divine`, which is created lazily.

**Fertilise**

- Adds 0.5 nutrient to every land tile under the stroke, capped at SOIL_MAX.
- With a species and Everywhere, it covers every tile that species occupies.

**Blight**

- Multiplies biomass by 0.3 and removes fruit on occupied land plant slots. Fungus or other kind slot-1 plants are left alone.
- With a species set, only that species' slots are hit.
- Then `P.version++`. The worker's existing god handler resyncs and invalidates WebGPU plant state, so `js/gpu/` needed no code change.

**Logging**

- Each action logs one `god` event, for example:
  - "You sterilised 160 Abyssilepis everywhere for 300 ticks"
  - "You struck down 2 animals in the Ocean in the northwest"
  - "You withered 7978 tiles of Lumianthus everywhere"
- Fertilise and Blight strokes merge into one entry per stroke, like biome paint.

**Counters**

`fed`, `healed`, `sterilised`, `culled`, `fertilised` and `blighted` live on GodTools. They are created lazily and serialised with the graph.

### Map visual

File: `js/render.js`.

- The impact shader gains a `u_mode` uniform:
  - mode 1 is a soft green-gold bloom and halo for blessings
  - mode 2 is a dark purple contracting pulse for curses
- `renderer.pulse(x, y, r, mode)` queues pulses, capped at 64, each lasting 1.1 s.
- Area actions pulse the brush centre. Map-wide actions pulse up to 12 sampled animals or tiles. A soil stroke pulses up to about 6 points along the stroke.
- Pulses are UI only and never reach the sim.

### Badge

- Hovering a sterile animal shows `sterile · N ticks` (`.badge.sterile`, purple) in the tooltip, where N is the ticks remaining.
- The species inspector shows "Sterilised: N cannot breed" while any are sterile.

## Determinism and saves

- Only `eco.rng` is used, and only by Cull, and only when the tool is used. There is no `Math.random`.
- No state is added to a world unless a tool runs, because `A.ster`, `deaths.divine` and the counters are all lazy. The no-tool hashes are therefore identical to base.
- Animal and soil effects live in the serialised graph. Nothing new goes in `header.god`, which still holds only world edits.
- SAVE_VERSION is still 2. No new classes were needed, so `classTable()` is unchanged. No new renderer grid, so `SNAP_GRIDS` is unchanged.

## Gates (one batched run)

**No tool used**

- World hashes for gen 2/3/4 × seeds 42/7/123 are identical to base.
- 500-tick state hashes are identical to base:

  | Seed | State hash         | ms/tick base | ms/tick new |
  |------|--------------------|--------------|-------------|
  | 42   | `edb5330b1bacd537` | 26.05        | 25.64       |
  | 7    | `6abecf2485dc1c53` | 24.03        | 24.22       |
  | 123  | `d4cef852ccd68adf` | 25.64        | 25.27       |

**Bless plan (seeds 42, 7, 123)**

The plan applies 17 actions at tick 200:
- feed in an area
- heal a class everywhere, and heal an area
- sterilise a species everywhere for 300 ticks, and sterilise a class in an area for 200 ticks
- cull a species everywhere at 30%, and cull an area at 50%
- two fertilise segments in one stroke
- blight a species everywhere, and blight an area
- six invalid actions

Results:

| Check | Result |
|---|---|
| Log number equals result count, including the merged fertilise stroke (69 + 97 = 166 logged) | 0 mismatches, all seeds |
| Invalid actions | Return the right reason (host, host, spot, none, host, spot) and log nothing |
| Cull | `deaths.divine` = sum of cull counts = live population drop: 22 / 36 / 41 |
| Each cull's own population drop | Equals its count |
| Sterile count after a species-wide sterilise | Equals the result count (160 / 139 / 153) |
| Sterile count after adding the area sterilise | Equals the union (165 / 144 / 157) |
| Blight everywhere | Species biomass ratio 0.300 |
| Sterilised species, young under 100 ticks old, 100 ticks after the curse | 7 / 0 / 3 (unsterilised control: 52 / 12 / 0). The few are hatchlings from eggs laid before the curse. `_reproduce`, the only birth path, is gated. |
| After expiry (tick 800) | The species breeds again: 188 / 144 / 74 young under 300 ticks |
| Same actions at the same ticks in two runs (`sameRes`, `sameAB`) | Identical |
| Save mid-sterile (tick 300, sterile until 500), load | State and world hashes equal. Sterile count survives (141 / 132 / 122). |
| After 500 more steps | Equal to the uninterrupted run |
| Water and walk arrays after the plan | 0 mismatches |

**Old saves, loaded with the plan applied, then 300 steps, re-encode and decode**

All of these give an equal state:
- **Base `dc55205` save:** gen 4, tick 300.
- **3.1 save with 41 biome/climate edits:** made by the pre-3.2 tree. At-load hash equals the save-time hash.
- **3.2 save with 4 crater edits and live disasters:** At-load hash equals the save-time hash.

In all three, log counts match and divine equals the cull sum.

**Regression**

- 3.1 `goddet 42`: sameAB, loadEqual and afterEqual all pass.
- 3.2 `disdet 7`: sameRes, sameAB, loadEqual and afterEqual all pass.
- `loadgod` of the 3.1 save with disasters: OK.

**Syntax**

`node --check` passes on all 24 js files.

### Browser smoke test

Setup: worker mode with the GPU active, Chromium on SwiftShader, port 8797.

- The palette shows the six tools.
- Feed by click: "Fed 27 animals." The log matches, and one bless pulse plays.
- Heal over a healthy area: "Nobody there is sick or poisoned.", nothing logged.
- Sterilise a picked species, Everywhere, 800 ticks:
  - "Sterilised 219 animals for 800 ticks."
  - the client sees 219 of 219 sterile
  - 12 curse pulses play
  - the tooltip shows the badge "sterile · 800 ticks"
- Cull 40% in an area: "Struck down 11 animals." After running, the card reads "11 struck down by the divine hand".
- Fertilise drag: "Fertilised 2.1k tiles." and the log says 2055.
- Blight drag: "Withered plants on 497 tiles." and the log matches.
- Save and load round trip works. No console errors.

## Open issues

- **No injury state.** Heal clears infection, toxin status, gene damage and craving. If wounds are ever added, Heal should clear them too.
- **Stroke counts can double-count tiles.** The stroke count for Fertilise and Blight is the number of tile edits. A drag that passes over the same tiles counts them again (about 2k for a long r10 drag). Fertilise stops counting a tile once it reaches SOIL_MAX. Blight keeps cutting biomass on each pass, ×0.3 each time. This matches how the 3.1 paint strokes count, but the number can read as large.
- **Eggs still hatch.** Sterilise does not touch eggs already laid, so a few young can still hatch during the window. Purging a sterilised species' clutch would need an eggs-side hook.
- **Cull in an area takes the share of every target in the brush.** It has no minimum spacing, so a 100% cull is a local wipe-out, like a meteor without the crater. The 10% slider floor keeps a 0-count cull from happening.
- **Map-wide pulses are capped at 12.** On a big species they show where the action landed but not its full extent.
