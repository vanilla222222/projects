# Browser checks

The suites in `tools/` run in Node and cover everything that is not a browser: the
generator, the crafting graph, the physics, the sprite plans, the sound description. What
they cannot see is the game actually running — and three times this project has shipped a
change that passed every suite and was broken on screen.

These scripts drive the real game in a real browser with Playwright. They need the game
served somewhere:

```
cd fathom && python3 -m http.server 8777
```

| script | what it answers |
|---|---|
| `node tools/browser/soak.cjs [minutes]` | Does ten minutes of randomised play break any invariant? Checks every simulated second that the player is finite and not inside a tile, health and mana are in range, nothing has run away in the drop, particle, arrow or chunk lists, and that the world still saves and reloads afterwards. |
| `node tools/browser/perf.cjs` | Where does the frame go? Times simulation and drawing in six situations and names the six most expensive draw passes in each. |
| `node tools/browser/look.cjs <dir> '[["name","walk"]]'` | Screenshots named places — `walk`, `shore`, `border` — so a change to how the world looks can be looked at. |

Two notes from using them.

The soak test is only as good as its randomness. The first version used the obvious
`rng * 1103515245 + 12345` LCG, which overflows 2^53 in a double and degenerates: it held
one set of keys for ten minutes and reported that nothing had ever been mined. It uses
mulberry32 now. It also has to *stand still and dig* some of the time, because a player
who walks while mining resets the tile they were working on, and pure noise is always
walking.

The performance numbers are from a headless browser with no GPU, which software-rasterises
the whole canvas. Costs that scale with pixel area rather than with work done are an
artefact of that and not of the game — see the renderer section of REFERENCE.md.
