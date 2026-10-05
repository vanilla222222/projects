# Audit: Secrets (roadmap item 12)

Two rare, purely cosmetic secret biomes: a **nuclear wasteland** and an **enchanted glade**. Each has a 0.5% chance of appearing on a gen 4 seed. When one appears, founders near it carry a heritable lineage mark that gives them a unique animal texture.

## Design

### Roll (`js/mapGenerator.js`)
- `secretKindsForSeed(seed, gen, force)` returns a bitmask: 1 is nuclear, 2 is magic, 3 is both.
- Gen < 4 always returns 0.
- Each kind is rolled from its own fmix32 hash of `(seed, salt)` fed to `SeededRandom`. The salts are nuclear `0x6e75636c` and magic `0x6d616769`. A kind appears when the draw is below `SECRET_CHANCE = 0.005`.
- The roll never consumes the world generator's RNG, so no existing world array changes.

### Patch
- `_placeSecrets` writes only a new `world.secret` Uint8Array plus the scalars `secretKinds`, `secretNx/Ny/Nr` and `secretMx/My/Mr`.
- The patch is a noise-wobbled disc on land, with radius `clamp(5 + sqrt(cells)/120, 5, 9)`.
- When both kinds appear, the patches are at least 4 radii apart.
- Biome, height, moisture, temperature and water arrays are untouched. The sim never reads `secret`, so the patch is purely cosmetic.

### Override
- `?secret=nuclear|magic|both|none` forces the result.
- The override travels as a world option through `SimClient.create` to the worker, and through the local path.
- It is stored in the save header (`secret`) only when it was forced.

### Lineage (`animals.lin`, `eggs.lin`)
- A heritable tag, not a gene. Values: 0 none, 1 irradiated, 2 enchanted.
- **Founders:** `Ecosystem._markSecretFounders()` runs once at world start. It marks live animals within `max(18, 2.5r)` of each patch centre. If fewer than 16 are marked, it tops up with the nearest animals using a deterministic sort, with no RNG.
- **Inheritance:** the tag is copied to live-born young and through eggs to hatchlings.
- **Log:** world start logs one `secret` event with the start text.

### Rendering (`js/render.js`)
- **Terrain shader** reads a secret texture (TEXTURE5; a 1x1 texture when there is no secret).
  - Nuclear: zoom-faded Voronoi cracks, a pulsing green glow and a sickly tint.
  - Magic: a purple/teal hue shimmer and twinkling sparkles.
- **Sprite icons** carry an fx code: `icon + 4096 * (lin + 3 * (uid & 15))`.
  - Irradiated animals get a green glow, plus dark radiation spots with glowing rims.
  - Enchanted animals get iridescent hue cycling plus sparkles.
  - Both kinds get a soft halo dot.

### UI (`js/main.js`, `index.html`, `css/style.css`)
- **Legend:** gains "Nuclear wasteland (cosmetic, rare)" and/or "Enchanted glade (cosmetic, rare)" only when the matching patch exists. The legend is rebuilt on every `installWorld`.
- **Start toast:** a one-time `#secretToast` when a new world has a secret. It shows for 7 s and closes on click.
- **Event log:** the secret event uses the glyph ✦.
- **Tooltip:** a tile shows "· a strange green glow" or "· a strange shimmer". A marked animal shows "Irradiated lineage" or "Enchanted lineage".
- **Species detail:** a badge with the count of living carriers, e.g. "Irradiated lineage · 3".
- **Colours:** theme tokens `--secret-nuc` and `--secret-mag`, with darker values in the light theme for contrast.

### Saves (`js/save.js`)
- `SAVE_VERSION` stays 2.
- `lin` is saved automatically through the pool field lists.
- `upgradeLineage` creates zeroed `lin` arrays for saves that lack them.
- The world is regenerated from the header seed and gen, plus `secret` when it was forced.

## Real seeds (gen 4)
Scan of 1,000,000 seeds:

| Result | Seeds | Share |
|---|---|---|
| Nuclear only | 5043 | 0.50% |
| Magic only | 5156 | 0.52% |
| Both | 26 | 0.0026% |
| None | 989775 | |

The two kinds are independent.

- **Nuclear:** 152, 543, 591, 1306, 1504, 1611, 1667, 1726, 1745, 1747, 2097, 2402
- **Magic:** 276, 471, 972, 1323, 1580, 1777, 2260, 2431, 2570, 3046, 3503, 3505
- **Both:** 49653, 148555, 170691, 185008, 229848, 268407
- **None:** the default seeds 42, 7 and 123 roll nothing.

Try e.g. `index.html#152` (nuclear), `#276` (magic) or `#49653` (both).

## Gates

### Test run 1: headless, vm harness, new code vs base ba29de3

**World arrays**
- Gen 2/3/4 × seeds 42/7/123 at 320x210: all existing world arrays hash identical to base.
- Secret seeds 152, 543, 276, 471 and 49653 also have identical existing arrays.
- Gen 2/3 never roll.

**Patch sizes**
- At 320x210: 144–186 cells.
- At 640x420: 260 cells (r 9).
- At 160x100: 115 cells.

**Cosmetic purity**
- Seed 42 with `secret: 'both'` forced vs plain: stats and every animal position/uid are identical after 600 ticks.

**Founders**
- At tick 0, 16 irradiated and 22 enchanted founders across 7 species.
- At tick 600, 22 + 19 carriers. 36 of 1182 newborns inherited the mark.
- Natural seeds 152 and 276 mark 16 founders each and log the start text.

**Saves**
- Save/load keeps `secretKinds` 3 and `lin` exactly.
- Reloaded and original runs are byte-identical after +300 ticks.
- A base-code save loads in the new code, gets `lin` arrays and continues identical to base.

### Test run 2: browser smoke (Playwright, SwiftShader, worker mode)
- **Forced `?secret=both`:**
  - The toast and both legend entries appear.
  - Tooltips read "Irradiated lineage" / "Enchanted lineage", and the species badges show carrier counts.
  - Screenshots show cracked glowing green ground, a purple/teal shimmer with sparkles, green glowing animals and iridescent animals.
- **Plain seed 42:** no toast and no secret legend entries.
- **Errors:** no JS or shader errors. Only unrelated font certificate errors appeared.

### Static checks
- `node --check` on all 23 files under `js/`: 0 failures.
- No `Math.random` added.
- No code comments added in source.

## Open issues
- **Lineage can die out.** A marked lineage disappears if its founders' lines die out. The texture is not reapplied after that.
- **Both marks in one species.** With both kinds present, a species can hold carriers of both marks. An individual keeps a single mark.
- **Event list in the smoke test.** The DOM check of the event list came back empty, probably because the panel had not rendered yet. The `secret` log entry itself is verified headlessly.
- **Animation jump.** Shader time wraps at `WX_TIME_WRAP` (600 s), which causes a small jump in the shimmer and pulse animation.
- **Dots mode.** The sprite fx also apply in the far-zoom dots mode. This is intentional, but it adds a little colour noise.
- **Not covered by a test run:** whether the `?secret=` override survives a "new world" click from the UI. It is re-read from the URL each time.
