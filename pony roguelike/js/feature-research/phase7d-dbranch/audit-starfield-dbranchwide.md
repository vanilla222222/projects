# Audit — starfield void tiles across the whole D-branch

## Files changed

- `js/ui/render.js` — `rebuildTileLayer(node, pal)`, the `T_VOID` branch only.
- `js/CODE_REFERENCE.md` — notes added to the `paintStarfieldTile` and `rebuildTileLayer` entries.

## Change

The starry-void tile treatment was previously reachable only through
`rebuildPlanetariumTiles`, i.e. the single one-off `planetarium` gate room on
floor 3. `rebuildTileLayer`'s normal path now checks `this.floorPath === 'D'`
in its `T_VOID` branch and calls the existing
`paintStarfieldTile(ctx, px, py, x, y, pal, 0)` instead of the flat
`pal.voidC` fill; every other floor path keeps the flat fill exactly as before.

```js
if (t === T_VOID) {
  if (this.floorPath === 'D') { paintStarfieldTile(ctx, px, py, x, y, pal, 0); continue; }
  ctx.fillStyle = pal.voidC; ctx.fillRect(px, py, TILE, TILE); continue;
}
```

Result: every real D-branch floor (4D-10D) has its background/void tiles read
as open sky, matching the gate room. Walls, secrets, doors and floors are
untouched, so D-branch rooms still read as normal room geometry sitting in
space, and collision/walkability/door geometry are unaffected (paint only).

`paintStarfieldTile` was reused as-is — not duplicated. `this` in
`rebuildTileLayer` is the `Game` instance (the method is installed via
`Object.assign(Game.prototype, {...})`), the same way `currentPalette()` reads
`this.floorPath` a few dozen lines above.

## Not touched

- `rebuildPlanetariumTiles` and the `node.type === 'planetarium'` early return.
- The `T_WALL` / `T_SECRET` / `T_DOOR` / floor branches and the special-room
  door-colour pass.
- Anything outside the two files listed above.

## Verification

- `node --check js/ui/render.js` — passes clean.
- Re-read the surrounding block: the only edit inside `rebuildTileLayer` is the
  `T_VOID` branch (one line expanded to a five-line block plus a comment); the
  rest of the loop is byte-identical.
- No game launch / screenshotting per the light-verification rule — the user
  verifies by playing.
