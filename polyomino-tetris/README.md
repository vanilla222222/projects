# Polyfall

A standalone, buildless polyomino falling-block game. Serve this repository with any static HTTP server and open `polyomino-tetris/index.html`.

## Rules

- Board: 12 columns × 24 rows. Every piece is a randomly grown, edge-connected polyomino. Shapes are sampled by growth, not uniformly from the set of all polyominoes.
- Order: `max(2, floor(log2(max(1, score))) - 8)`. Score 0 starts at 2 cells; 2,048 unlocks 3; 4,096 unlocks 4; 8,192 unlocks 5. The active piece keeps its shape. At the next spawn the preview queue refreshes to the new size.
- Score: `100 × clearedRows²`, plus 50 per consecutive-clear combo step; soft drop earns 1 per cell, hard drop 2 per cell.
- 450 ms lock delay, horizontal and floor rotation kicks, landing ghost, automatic pause on tab/window blur, and local personal best.
- Keyboard: arrows move/drop, Up/X rotates clockwise, Z counterclockwise, Space hard drops, P/Escape pauses, Enter starts/resumes. Touch buttons support held horizontal movement and soft drop. New game asks before discarding an active run.
- Self-contained: no dependencies, requests, fonts or backend. Does not use or change Molecule Profiler.

Run engine checks with `node --test polyomino-tetris/engine.test.mjs` from the repository root.
