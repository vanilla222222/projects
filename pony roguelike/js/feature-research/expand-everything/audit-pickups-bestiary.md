# Audit — Bestiary "Pickups" + "Room Types" tabs

File touched: `js/bestiary.js` only.

## Line ranges touched
- **L3-4** — header comment: "7 tabs (…/Objects)" → "9 tabs (…/Objects/Pickups/Room Types)". Comment only.
- **L29-30** — two new `BESTIARY_TABS` entries appended after `objects`:
  - `{ id:'pickups', label:'Pickups', icon:'🎁' }`
  - `{ id:'roomtypes', label:'Room Types', icon:'🚪' }`
  `BESTIARY_TABS` now has 9 entries (L22-30).
- **L143** — `renderBestiarySimple`: `unlocks.bestiary[seenSection]` → `unlocks.bestiary[seenSection] || {}`. Defensive only, so the panel does not throw if the achievements.js agent's bucket registration has not landed yet. No behavior change once buckets exist.
- **L238-239** — new entries in `bestiaryDiscoveredTotals()`, same `list.filter(x => b.<bucket>[x.id]).length / list.length` pattern as the existing `trinkets`/`stars` entries (with a `|| {}` guard for the same reason as above):
  - `pickups: { done: PICKUP_TYPE_LIST.filter(p => (b.seenPickupKinds || {})[p.id]).length, total: PICKUP_TYPE_LIST.length }`
  - `roomtypes: { done: ROOM_TYPE_LIST.filter(r => (b.seenRoomTypes || {})[r.id]).length, total: ROOM_TYPE_LIST.length }`
- **L289-290** — two new cases in `buildBestiaryPanel()`'s switch:
  - `case 'pickups': renderBestiarySimple(wrap, PICKUP_TYPE_LIST, 'seenPickupKinds'); break;`
  - `case 'roomtypes': renderBestiarySimple(wrap, ROOM_TYPE_LIST, 'seenRoomTypes'); break;`
  The 5 pre-existing cases (enemies, items, stars, pills, trinkets, familiars, objects) are untouched.

## Icons
- Pickups: **🎁** — no collision; existing tab icons are 💀 🎒 ⭐ 💊 🔩 🐾 🪨.
- Room Types: **🚪** — no collision with any other tab icon. (🚪 is also the per-entry icon of `ROOM_TYPE_LIST`'s `normal` room, but per-entry icons live in a different namespace than tab icons, so this is not a conflict.)
- No icon had to be changed to avoid a collision.

## Dependencies
- `PICKUP_TYPE_LIST` (22 entries) and `ROOM_TYPE_LIST` (15 entries) are in `js/data.js`, loaded at index.html L164, before `js/bestiary.js` at L168 — globals resolve at call time regardless.
- `unlocks.bestiary.seenPickupKinds` / `unlocks.bestiary.seenRoomTypes` are registered by the parallel achievements.js work; referenced here by those exact names only.

## Verification
- `node --check js/bestiary.js` → passes (no output, exit 0).
- Grep-confirmed: `BESTIARY_TABS` = 9 entries; `pickups` and `roomtypes` each appear exactly once in `BESTIARY_TABS`, once in `bestiaryDiscoveredTotals()`, once in the render switch.
