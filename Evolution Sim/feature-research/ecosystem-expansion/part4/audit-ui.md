# Part 4 slice B (UI): audit

## Files changed

- `index.html`: Disease view button, `#optDisease` switch (on by default, after Migrations), sixth tab `data-tab="disease"` with `#countDisease`, Outbreaks event filter `data-f="outbreak"`, `#detailHostsWrap` / `#detailHosts` after the detail grid, and the `js/sim/disease.js` script tag between `bugs.js` and `ecosystem.js`.
- `js/icons.js`: `virus` and `blight` icons after `wave`, every part in fixed hex colours.
- `js/render.js`: `RAMPS.disease`, `disease` in `LIVE_MODES`, `sickField` and the disease branch of `setMode`; `BLIGHT_RGB`, `BLIGHT_MIX`, `INFECT_MIX` and `MARK_SCALE`; blight tint in `_updateVegetation` and `_tinted`; `_infected`; virus markers, strain rings and disease-view dimming in `_pushAnimals`; `_hostHighlight` ignores pathogens.
- `js/main.js`: `GROUP_COLORS.disease`, `TAB_GROUP`, the disease tab (routing, counts, empty text, units), the pathogen role, category, detail, badges and cells, the hosts chips, `DISEASE_TRAITS`, the resistance trait rows, the Avg resistance and Infected cells, the Disease stat card, `sick:` and `blight:` tooltip lines, `EVENT_GLYPH.outbreak`, and the `optDisease` wiring.
- `css/style.css`: `.role-pathogen`, `.ev-outbreak .ev-dot`, `.chip small`, `.tt-sick`, and tab sizing for six tabs.
- `CODE_REFERENCE.md`: the load-order line (adds `sim/bugs.js` and `sim/disease.js`), and the Icons, Renderer and App/main sections.
- `complexities.md`: `render.js` note; `main.js` moves from 5 to 5.5.
- `part4/screenshots/disease-view.png`, `part4/screenshots/sick-animals.png`.

## Tests run

All runs are headless Chrome (CDP probe from the scratchpad) on `index.html#7`, plus `node --check`.

- **Outbreak state:** at tick 3088 there were 124 sick animals, 2973 blighted slots and 23 strains. The Disease view had 2931 non-zero tiles.
- **Disease tab:**
  - The tab lists 23 strains, and no pathogen appears in any other tab.
  - Plant strains show "tiles" and animal strains show "hosts".
- **Strain detail:**
  - The subtitle, badges and cells are correct.
  - Clicking a host chip selects the host (species 29) and opens the Water tab.
- **Host species detail:** shows Avg resistance and Infected, and the trait list has Resistance and Blight resistance (water plants included).
- **Stat card:** shows the sick-animal count, the strains and blighted-tiles sub-line, and the sparkline.
- **Tooltip:** shows `sick: Streptobacter` on an animal and `blight: Septuspora` on a plant.
- **Map click:** clicking a sick animal opens its species.
- **Events:**
  - The Outbreaks filter shows 12 rows, all `ev-outbreak`, with the `!` glyph.
  - Clicking an outbreak event opens the strain in the Disease tab.
- **Toggle:**
  - After switching `#optDisease` off and stepping once, every disease display reads zero: the view, the count, the list ("No active outbreaks yet.") and the stat card. They were still zero after 300 more ticks.
  - Switching it back on works.
- **Errors:** no console errors and no exceptions.
- **Syntax:** `node --check` passes on `render.js`, `main.js` and `icons.js`.
- **Tab fit:** six tabs fit at 329 px and 299 px column widths. The only overflow left is 0–1 px of sub-pixel overflow, and only when every tab shows a 3-digit count.

## Deviations

1. **Tab layout:** tab icons show only on the active tab, and the tab padding and font are smaller. Without this, six tabs did not fit the column.
2. **Strain highlight:** selecting an animal strain rings and highlights the animals carrying it. `_hostHighlight` returns `null` for pathogens, so selecting a strain does not dim the plants.
3. **Disease view dimming:** healthy animals are dimmed to 0.35 alpha in the Disease view. Without this, the animal outbreak was hidden under healthy animals.
4. **Hosts section:** added `#detailHostsWrap` to `index.html` for the strain host chips.
5. **Plant-strain units:** plant strains use the unit "tiles" in the list, not "hosts".
6. **Strain count:** the species totals line gains " · N strains".
7. **Water-plant traits:** the water-plant trait filter allows gene 14, Blight resistance.

## Checklist

- [x] **Comment counts** (`grep -cE '//|/\*'`): unchanged from baseline.

  | File | Count |
  | --- | --- |
  | `index.html` | 2 |
  | `js/render.js` | 0 |
  | `js/main.js` | 0 |
  | `js/icons.js` | 0 |
  | `css/style.css` | 7 |

- [x] **No `js/sim/*.js` edits** from this slice.
- [x] **CODE_REFERENCE UI sections grep-verified.** Each of these is found: `sim/disease.js`, `virus`, `sickField`, `BLIGHT_MIX`, `_infected`, `MARK_SCALE`, `TAB_GROUP`, `countDisease`, `detailHostsWrap`, `DISEASE_TRAITS`, `optDisease`, `EVENT_GLYPH.outbreak`, `Avg resistance`, `tt-sick`, `Blight resistance`, `history.sick`.
- [x] **complexities.md updated** (`render.js` note; `main.js` 5 → 5.5).
- [x] **Screenshots present:** `screenshots/disease-view.png` and `screenshots/sick-animals.png`.
