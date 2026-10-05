# Part 3 plan: God tools

Part 3 adds a tool palette on the map. Every tool works the same way: the UI sends an action to the worker, and the worker applies it between ticks using the sim RNG. Each action goes in the event log, and anything that changes the world is stored in saves. When no tool is used, the sim behaves exactly as before: world hashes, state hashes and ms/tick match the previous base.

Rules shared by every slice:
- Actions are plain objects such as `{kind, ...}` and go to `Ecosystem.applyGod(action)`. In worker mode they travel as a `god` message that holds stepping, like the save handler does. In local mode they are called directly.
- God state (`eco.god`, class `GodTools` in `js/sim/god.js`) is created lazily on the first action, so the state of untouched worlds does not change.
- SAVE_VERSION stays 2. New classes go in `classTable()`. World edits go in the save header and are replayed on the regenerated world before the graph is restored. Old saves still load.
- Any change to plant or soil state is mirrored in the WebGPU fast mode: pending GPU work is synced before the edit, and the static textures are re-uploaded after it.
- The same actions at the same ticks give the same result.

## 3.1 Palette, spawn and paint

Scope:
- **Palette:**
  - a toggle button and the `G` key
  - tool buttons with icons, a brush size slider and an active-tool indicator
  - `Esc` deselects the tool
  - with no tool active, pan, zoom, selection and inspection work as before
  - uses the existing light and dark theme tokens
- **Spawn:**
  - choose a living animal or plant species from a searchable list
  - click or drag to place N individuals
  - animals clone the species genome with normal mutation and the class clamp
  - plants fill empty slots of the right domain
- **Paint:**
  - a biome brush covering every legend biome, gen 4 included; land and water swaps update altitude, the water flags, depth, salinity and every derived array
  - a temperature +/- brush and a moisture +/- brush
  - grids that used to be static (world arrays, plant water, depth and salinity) ship again when the world version changes, and the renderer rebuilds its terrain textures
- **Log and saves:**
  - "You spawned 20 X" and "You painted 140 tiles of Desert"
  - the edit list is saved in the header

Gates:
- No tools used: world hashes for seeds 42, 7 and 123 (gen 2, 3 and 4) and a 500-tick state hash are identical to base. ms/tick stays within noise.
- With edits: save after the edits, load, then step 500 ticks. The state hash equals an uninterrupted run with the same actions. A base save still loads.
- Browser smoke with the worker on: open the palette, spawn, paint each brush kind, with no console errors.

## 3.2 Disasters

Scope:
- **Area triggers** placed with the brush: wildfire, flood and drought, using the slice 11 code in `js/sim/disasters.js`.
- **New events:**
  - meteor: a crater turns to water or rock, nearby life is killed, and fire starts at the edge
  - disease outbreak: a seeded strain in a chosen class or species
  - plague of locusts: a burst of the bug grazer niche that strips plants
- **Logging and saves:** every trigger is logged. Meteor craters are world edits that go in the edit list from 3.1.

Gates:
- No tools used: hashes are unchanged.
- Each trigger runs its normal disaster lifecycle. Recovery and succession follow the slice 11 behaviour.
- Save and load in the middle of a disaster is deterministic.
- Browser smoke: trigger each disaster with no console errors.

## 3.3 Bless and curse

Scope:
- Area or species targets for:
  - feed: energy and fat up
  - heal: clear infection and injury
  - sterilise: block breeding for a set number of ticks
  - cull: kill a fraction of the targets, logged as deaths by divine hand
- Plant variants: fertilise (soil nutrients up) and blight (biomass down).
- Each action reports the number of individuals affected in the log.

Gates:
- No tools used: hashes are unchanged.
- Sterilise and cull counts match the log.
- Save and load during a sterilise timer is deterministic.
- Browser smoke with no console errors.

## 3.4 Time controls and species designer

Scope:
- **Snapshots:** named in-memory save blobs, with restore and a limited history.
- **Rewind:** go back to the last autosave, with a confirm step.
- **Species designer:**
  - sliders over the main genome traits, with class and diet pickers
  - preview of the derived stats
  - spawns a new founding species through the 3.1 spawn path, logged as a creation

Gates:
- A snapshot taken, run on, then restored and run 500 ticks matches an uninterrupted run from the snapshot.
- Designer genomes stay inside class clamps.
- No tools used: hashes are unchanged.
- Browser smoke with no console errors.
