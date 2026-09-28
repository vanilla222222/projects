# Phase 6a overhaul — audit

## Files changed

- `js/core/theme.js` — `Theme.status.vulnerableRing`/`vulnerableMark`; `Theme.machine.spinRing`.
- `js/core/audio.js` — new `SFX.machineWhiff()`.
- `js/core/utils-2.js` — `drawFriendshipMachine`/`drawToolsMachine` gained `(machine, now)` params; new `Util.drawMachineSpinFlourish`.
- `js/ui/render.js` — `drawStatusEffects` gained a Vulnerable branch; `drawArcadeFixtures` now passes `m, this.now` to the friendship/tools draw calls.
- `js/ui/ui.js` — `roomTypeColor`/`ROOM_TYPE_ICON`/`ROOM_TYPE_LEGEND` gained `shrine`/`arcade`; `_hudCache` gained `turrets`/`minions`/`synergy`; new `SYNERGY_BADGES` table; `updateHUD` gained turret/minion counter sync and synergy badge sync.
- `js/systems/shop.js` — `useArcadeMachine`'s `friendship`/`tools` cases now roll-and-store instead of resolving instantly; new `updateArcadeMachines(game, dt)`; new `ARCADE_SPIN_DELAY` const.
- `js/systems/combat-1.js` — `updatePlayer` now calls `updateArcadeMachines(game, dt)` right after `updatePlayerTurrets`.
- `js/systems/items-1.js` — `recalcPlayerStats` now stores `player.ecosystemSetActive`, `player.packBondActive`, `player.twinFangsActive`, `player.marksmansEyeActive` as named booleans (`rotAndRuinActive` already existed).
- `js/game.js` — `enterRoom` now hard-snaps every `player.familiars`/`player.changelingMinions` entry's `x`/`y` to the player's freshly-set spawn position.
- `index.html` — `#resTurrets`/`#resMinions` HUD counters (hidden by default); `#synergyBar` with 5 badge spans (`synEcosystem`/`synRotRuin`/`synMarksman`/`synPackBond`/`synTwinFangs`) added to `#rightPanel`.
- `style.css` — `.synergy-badge`/`.synergy-badge.active`/`#synergyBar` rules.
- `js/CODE_REFERENCE.md` — updated in the same pass per the standing rule (theme.js status/machine tokens, `drawStatusEffects`, `drawFriendshipMachine`/`drawToolsMachine`/new `drawMachineSpinFlourish`, `drawArcadeFixtures`, the arcade-room `useArcadeMachine`/new `updateArcadeMachines` writeup, `SFX.machineWhiff`, `ui.js`'s `roomTypeColor`/`ROOM_TYPE_ICON`/`ROOM_TYPE_LEGEND`, new `_hudCache` fields/`SYNERGY_BADGES`, `updateHUD`, the Synergies section, `enterRoom`, combat-1.js's per-frame dispatch note).

No other files were touched.

## Section-by-section summary

**1. Vulnerable status visual.** Added `Theme.status.vulnerableRing`/`vulnerableMark` (crimson, distinct from all 5 existing status colors). `drawStatusEffects` in `render.js` now has a THIRD always-checked `if (e.vulnerableTimer > 0)` block, sibling to the poison `if`, outside and after the freeze/stun/charm/fear `if/else if` chain — confirmed by direct read of the edited file (`js/ui/render.js:927-943`-ish). Draws a pulsing crimson ring at `radius+4` (deliberately a different radius than the freeze/fear ring's `radius+8`, per the plan's anti-aliasing note) plus a small pulsing crimson crosshair mark above the enemy, using `Math.sin(this.now/100)` the same way stun/charm's glyphs bob. No deviation from plan.

**2. Minimap coverage for shrine/arcade.** Added `shrine`/`arcade` to `roomTypeColor` (`#d4af37` — matches `votivecoin`'s icon color exactly, since `Theme.door.shrine` doesn't exist to borrow from; `#c93f6b` — matches `Theme.door.arcade`'s `open` color), `ROOM_TYPE_ICON` (🕯️/🎰, confirmed against `data/economy.js`'s `ROOM_TYPE_LIST` entries for both ids), and `ROOM_TYPE_LEGEND` (short descriptive labels matching the existing entries' style). Deviation: plan suggested "teal/violet-ish for shrine" as a starting guess, but since `Theme.door.shrine` doesn't exist (a pre-existing gap noted in `CODE_REFERENCE.md`), gold/amber (matching the Shrine batch's established item palette, e.g. `votivecoin`) reads truer to the room's actual visual identity than an invented teal — noted as a deliberate deviation.

**3. Arcade machine gamble juice.** `useArcadeMachine`'s `friendship`/`tools` cases now deduct coins and roll+store the outcome (`machine.pendingOutcome = {win, kind}`) at press-time, then set `machine.spinning = true; machine.spinTimer = ARCADE_SPIN_DELAY` (0.45s). New `updateArcadeMachines(game, dt)` in `shop.js` ticks any spinning machine in `game.currentRoom.machines`, resolving the reward grant or the "nothing"/`machineWhiff` miss exactly once when the timer expires. Wired into the per-frame dispatch in `combat-1.js`'s `updatePlayer`, immediately after `updatePlayerTurrets` (following the plan's suggested placement). `dark` machine is unchanged (guaranteed, no spin). New `Sound.play('machineWhiff')` SFX — a soft descending tone — replaces `uiDeny` for the fair-gamble loss case; `uiDeny` is now reserved purely for the `coins < N` early-return denials, unchanged. Visual flourish: `drawFriendshipMachine`/`drawToolsMachine` take the machine object + `now` and forward to a new shared `Util.drawMachineSpinFlourish` (a cheap spinning dashed ring, no-op unless `machine.spinning`). No deviation from plan.

**4. Synergy HUD indicators.** Added `#synergyBar` (5 badge spans with tooltips) to `index.html`'s `#rightPanel`, above the existing Items panel. `js/systems/items-1.js`'s `recalcPlayerStats` now stores 4 previously-inline synergy conditions as named `player.*Active` booleans (`ecosystemSetActive`, `packBondActive`, `twinFangsActive`, `marksmansEyeActive`) alongside the pre-existing `rotAndRuinActive`, WITHOUT touching any of the original inline numeric expressions at their point of use (deliberately — those five sites were left untouched to minimize risk/scope; the new fields are purely additive read surfaces for the HUD). `ui/ui.js`'s `updateHUD` loops a new `SYNERGY_BADGES` table to toggle each badge's `.active` class, dirty-checked as one joined key string mirroring the familiar-bank `famKey` pattern. CSS added using existing `:root` custom properties (`--panel2`, `--border-soft`, `--accent2`, `--glow-accent2`, `--shadow-soft`) — no new hardcoded hex values. No deviation from plan.

**5. Turret/minion count HUD.** Added `#resTurrets`/`#resMinions` spans to `index.html`, same `<span class="res">ICON <b>0/N</b></span>` shape as keys/bombs, both starting with the shared `.hidden` utility class. `updateHUD` toggles `.hidden` off `player.canBuildTurrets`/`player.summonsChangelings` each frame and, when shown, sets dirty-checked text from `(game.currentRoom.playerTurrets||[]).length + '/3'` and `(player.changelingMinions||[]).length + '/' + player.maxChangelingMinions`. No deviation from plan.

**6. Familiar/minion room-entry snap fix.** In `game.js`'s `enterRoom`, immediately after both position-setting branches (the `enteredSlot`/no-`enteredSlot` if/else), added an unconditional loop hard-snapping every `player.familiars` and `player.changelingMinions` entry's `x`/`y` to the player's freshly-set spawn position. Runs on every room entry regardless of class, since both arrays are eagerly initialized to `[]` on every `Player` (confirmed at `js/entities/entities.js:77-78`). No deviation from plan.

## Verification

**`node --check` per touched file:** all 9 touched `.js` files passed individually, then a full sweep of every `.js` file under `js/` (`find js -name "*.js"`) passed with zero failures.

**Full concatenated bundle load under Node:** reused/extended the existing `js_scratch_verify.js` stub harness (stubs `document`/`window`/`localStorage`/`AudioContext`/etc., no canvas 2D stub, matching Phase 5b's precedent) — copied to the scratchpad as `verify6a.js`, all 61 `<script>`-tag files from `index.html` concatenated and `eval`'d in file order. Output: `OK - loaded without throwing`, plus the pre-existing `CLASSES`/`SUPERBOSSES`/`SUPERBOSS_REWARDS` sanity counts unchanged (25/15/375/375) — confirms nothing broke pre-existing invariants.

**Hand-trace — Vulnerable renders simultaneously with poison and the exclusive-chain statuses:** confirmed by direct read of the edited `drawStatusEffects` — the Vulnerable block is a standalone `if (e.vulnerableTimer > 0)` positioned AFTER (not inside) the `if/else if` freeze/stun/charm/fear chain and AFTER the separate poison `if`, at the same nesting depth as both. All three top-level `if`s can fire independently in the same call.

**Hand-trace — familiar/minion snap runs on every `enterRoom` path:** confirmed the new loop sits after both branches of the `if (enteredSlot && enteredSlot.cells) {...} else {...}` block that sets `this.player.x`/`y`, so it executes unconditionally regardless of which branch ran. Confirmed `startRun`'s first `enterRoom` call (`this.enterRoom(this.dungeon.start, null)`) hits the `else` branch (no `enteredSlot`), then the snap loop runs over `player.familiars`/`changelingMinions`, which are fresh empty arrays at that point (constructor-initialized) — a `for...of` over an empty array is a correct no-op, confirmed no code assumes non-empty.

**Hand-trace — arcade machine outcome committed at press-time, granted exactly once:** confirmed by reading `useArcadeMachine` — the coin deduction, `Math.random()` roll, and `machine.pendingOutcome` assignment all happen synchronously inside the press-time function call, before `spinning`/`spinTimer` are set; `updateArcadeMachines` only ever READS `pendingOutcome` (never re-rolls) and calls `grantPickupEffect`/plays the miss sound exactly once per resolution, immediately nulling `pendingOutcome` and clearing `spinning` so a later tick can't re-resolve the same machine.

**Simulated arcade-machine spin-and-resolve path (Node, `friendship` machine), via the extended verify harness:**
- Forced a WIN roll (`Math.random` stubbed to 0.1): after `useArcadeMachine`, `coins` dropped 10→9 immediately, `machine.spinning === true`, `machine.spinTimer === 0.45`, `pendingOutcome = {win:true, kind:'heartRed'}`, and `grantPickupEffect` had NOT been called yet (0 calls) — confirming reward is deferred, not granted at press.
- Ticked `updateArcadeMachines(fakeGame, 0.2)` (< remaining delay): still spinning, still 0 grant calls.
- Ticked `updateArcadeMachines(fakeGame, 0.3)` (crosses the remaining delay): `spinning` flipped to `false`, `grantPickupEffect` called exactly once with `'heartRed'`.
- Ticked again with a further `dt=1`: grant call count stayed at 1 (no double-grant).
- Forced a LOSE roll (`Math.random` stubbed to 0.9) on a fresh machine: `pendingOutcome.win === false` at press-time; after ticking past the delay, `grantPickupEffect` was called 0 times (no reward), `game.toast('Nothing this time.')` fired, and `machine.spinning` correctly flipped to `false`.
- All `console.assert` calls in the simulation printed nothing (Node's `console.assert` only logs on failure), confirming every assertion held.

No heavy browser playtest was performed, per standing instruction — the user will verify by playing.
