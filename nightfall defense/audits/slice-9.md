# Slice 9 audit: codex, wardrobe, effect themes, names and decor

## What shipped

### Codex (extended)
- The existing codex modal now has four tabs: DNBs (13), Bosses (50), Ponies (5) and Heroes (4).
- Each entry has a 192px animated preview canvas, lore text, a stats list, abilities or mechanics, and weaknesses.
  - DNBs and bosses keep their mechanics and counters, and gain lore and a kill count. DNB kills come from `stats.killsBy`; boss kills are summed from every map board's `records.bosses`.
  - Ponies show cost, damage, range, rate, targeting, strengths, weakness tags, all upgrade paths with their tier names, total kills and damage, and an "Open wardrobe" button that jumps to that race's skins.
  - Heroes show role, stats, aura and all three abilities, plus kills and damage.
- Unlocking:
  - DNBs and bosses unlock on first sight, as before.
  - Ponies unlock when one of that race is first placed (`codex.p`), with a "Codex: Earth Pony (pony) added" toast.
  - Heroes count as known once unlocked.
  - Unknown entries draw as dark silhouettes of the real sprite, labelled "???", with a hint on how to reveal them.
- Grid cells show a kill badge. The count line reads "x / 13 DNBs · x / 50 bosses · x / 5 ponies · x / 4 heroes".
- The preview animation runs on its own requestAnimationFrame loop only while the modal is open.

### Wardrobe (new, K or the Wardrobe button)
- **Pony skins:**
  - 4 slots (coat, mane, accessory, aura) with 38 skin items in total, applied per race.
  - It has race tabs, a 240px live preview that hops and turns, and hover try-on: hovering a locked item previews it and tapping it pins the preview.
  - Actions: "Reset look", "Copy to all races" and "Random owned".
  - Items unlock from achievements, permanent challenges, challenge tokens, daily wins, stars and Moonstones. Free items: Lilac mane, Cozy Scarf and the Classic theme.
  - Moonstone items are bought in place: Rose Gold 4, Pearl 6, Snowdrift 3, Star Shades 5, Snowfall aura 6, Candy theme 8 and Festival decor 10.
  - Newly unlocked items carry a "new" badge, and the Wardrobe button pulses until the wardrobe has been opened.
- **Effect themes:**
  - Six themes: classic, starlight, ember, frost, candy and shadow.
  - Each card has an animated projectile and impact preview.
  - The theme is chosen globally, with an optional per-race override select ("Use global" by default).
- **Map decor:**
  - Seasons: autumn, winter, spring and festival.
  - Each map can be set to Auto (follows the device calendar: Dec 18 to Jan 6 festival, the rest of Dec to Feb winter, Mar to May spring, Jun to Aug festival, Sep to Nov autumn), None, or a fixed owned season.
  - A live map preview is shown for each map. Locked maps cannot be set.
  - Decor repaints the cached background with a seasonal palette, tree decorations and scenery (snow, leaves, pumpkins, blossom, lanterns and confetti).
- A "Show pony names on the board" toggle.
- The header shows Moonstones and owned / total cosmetics (48).

### Pony names and titles
- The inspect panel has a name field: Enter commits, Escape reverts, and there are Random and Clear buttons.
  - Names are at most 18 characters and are trimmed and sanitised in core.
  - `suggestName` avoids names already used on the board.
- Titles:

  | Title | Kills | or level |
  |---|---|---|
  | Veteran | 250 | 12 |
  | Champion | 2,500 | 24 |
  | Legend | 25,000 | 40 |

  Level is the sum of upgrade tiers and infinite levels.
- The inspect header shows the name (or race), a coloured title badge and next-title progress.
- The herd ledger uses the name.
- An optional name label is drawn over each pony with title stars. Labels are cached per name and title.

### Save v10
- `SAVE_VER = 10`. Migration 9 to 10:
  - adds `cos` (classic theme, names on, no skins);
  - seeds `codex.p` from every placed pony on every board and from `stats.raceDmg`.
- `cleanCos` validates every field against the cosmetic tables, so unknown ids, wrong slots and bad seasons are dropped.
- `cos` is part of `CHAL_SHARED`, so challenge sandboxes use the profile's looks.
- Tower names are saved with the tower.

## Sim isolation
- Cosmetic state lives only in `P.cos` and `t.name`.
- Sim code never reads either. `lookOf`, `fxThemeOf` and `decorOf` are read only by render.js and the UI, through `R.cos` (filled by `syncCos`).
- `tools/balance.js` has a `COS=1` mode:
  - It buys every Moonstone item, then restores the Moonstone balance so research spending stays the same.
  - It equips skins on every race, sets candy globally and per race, festival decor and names on.
  - It renames every new pony and calls the title, look, theme and decor getters every shop step.
- Fingerprints (hash of marks, loss wave, cash and every tower's race, paths and infinite levels), ACH=0, full 100-wave climb:

| map | default | COS=1 | slice 8 |
|---|---|---|---|
| moonlit | ac9c5793 | ac9c5793 | ac9c5793 |
| caverns | 16054004 (slice 8) | 16054004 | 16054004 |

- The only economic contact is that buying a cosmetic spends Moonstones, which then cannot go to research. This is a player choice, and nothing is bought automatically.

## Performance
- Ponies are drawn with the same vector routine as before. Skins only swap colours, and accessories add a few primitives.
- Aura particles and theme projectiles and impacts are blitted from cached glyph sprites (`sprite()` cache, capped at 700). Each theme has its own cached projectile sprite.
- Name labels have their own canvas cache, keyed by name and title, capped at 300, so there is no per-frame text layout.
- Seasonal decor is painted once into the cached background in `buildBg`. It is rebuilt only when the season actually changes (`syncCos` compares it).
- The codex and wardrobe preview loops run only while their modal is open, and stop when it closes.
- The wardrobe rebuilds its DOM only on interaction, or when Moonstones or the owned count change while it is open.

## Tests
- e2e runs on port 8810 at 1280 and 390, with no console errors.
  - The slice 9 test covers:
    - the pony silhouettes, the unlock on placement, the detail page and the heroes tab;
    - the codex to wardrobe jump and equipping free items (per race only);
    - a Moonstone item that is disabled until affordable, then a purchase that equips it;
    - six theme cards, a candy purchase and a pegasus override;
    - a winter decor override reaching `R.cos.season`;
    - Esc closing the wardrobe;
    - renaming with Enter, a Random name, and the Veteran badge with Champion progress;
    - a reload keeping names, skins, overrides and decor;
    - fit at 390.
  - A v9 to v10 migration test.
  - Every earlier test was updated to expect ver 10.

## Fixes found during the slice
- The wardrobe did not refresh when Moonstones arrived while it was open. It now rebuilds when the Moonstone balance or the owned count changes.
- Escape was ignored while a select or checkbox had focus, so the wardrobe could not be closed after changing a select. Escape now passes through for those controls (text fields still keep it).
- The fourth meta button squeezed the row, so the labels overlapped. The meta row is now a 2 x 2 grid.
- The wardrobe action buttons and the name buttons had no styling, so their labels were invisible. They now use the panel button style.

## Known issues
- Auto decor uses the device's local date. A device with a wrong clock shows the wrong season. This is cosmetic only.
- Effect-theme previews in the wardrobe are small loops. Very old devices may see a few dropped frames while the wardrobe is open on the themes tab.
- Hero entries have no separate "seen" state: a hero is known once unlocked.
- Name labels can overlap when ponies are packed tightly. The toggle in the wardrobe hides them.
