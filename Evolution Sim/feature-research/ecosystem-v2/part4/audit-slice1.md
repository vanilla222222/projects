# Part 4 slice 1 audit

## Files changed

- `js/render.js`: weather overlay shaders (`WX_VS`/`WX_FS`, `wxProg`, `wxVao`), `showWeather` (default true), `_drawWeather`, `rain` and `water` ramps and `LIVE_MODES` entries, `_stormRain`, fresh/dim water colours, thirst markers in `_pushAnimals`, new consts `FRESH_RGB`, `DIM_WATER_RGB`, `RAIN_VIEW_K`, `THIRST_TINT`, `DRY_TINT`, `DRY_MARK`, `WX_ZOOM`, `WX_TIME_WRAP`.
- `js/sim/weather.js`: `_spawnStorm(tick)`, `_logStorm`, `lastStormLog`, consts `STORM_LOG_R`, `STORM_LOG_EVERY`, `COMPASS`.
- `js/sim/ecosystem.js`: history keys `thirstDeaths`, `herds`, `territories`, `eggs`.
- `CODE_REFERENCE.md`: Weather, Ecosystem and Renderer sections.
- `complexities.md`: render.js row.
- `feature-research/ecosystem-v2/part4/screenshots/views.png`, `weather-map.png`.

Not touched: `main.js`, `index.html`, `css/style.css`, `js/tree.js`.

## Test numbers

Headless runner, 300x200, 3000 ticks, sequential, pre-edit snapshot vs new:

| Seed | Base ms/tick (2 runs) | New ms/tick (2 runs) | Change of means |
| --- | --- | --- | --- |
| 42 | 25.83, 26.98 | 27.01, 25.43 | -0.7% |
| 7 | 27.63, 27.22 | 27.76, 27.54 | +0.8% |

- Determinism: all result fields except timing and the event log are identical for seeds 42 and 7 (`_logStorm` uses no RNG).
- Storm log: about 12 `'weather'` storm events in 3000 ticks on seed 42, e.g. "Storm over the Hills in the east".
- Browser (CDP, headless chromium, swiftshader, 320x210 Medium world): `rain` and `water` modes static and running live, zoom 8, `showWeather = false`, and `options.weather` toggling, all with 0 console errors and 0 exceptions. Storms are visible on seed 42 (8 active at tick 864).
- Overlay frame cost, median draw time on vs off at default zoom (about 2.97): +3.1% (3 storms), -6.2% (4), -0.8% (7), -2.1% (8 storms, 15 rounds). Zoom 6: -7.6%, -3.7%. Zoom 20: +15.9% (single noisy sample, not the gate). Swiftshader noise is about ±20% per sample.
- Screenshots viewed: `views.png` (Rainfall and Water/Thirst side by side, tick 864) and `weather-map.png` (rain storm and blizzard crops at zoom 6, full biome view with 8 storms).

## Deviations

- The overlay is a dedicated quad pass, `_drawWeather`, one draw per storm, as the plan allows.
- It is hidden in flat views (ramp views and `territory`), like the bug clouds.
- Storm positions are extrapolated by velocity between the 5-tick weather updates, so clouds glide instead of jumping.
- Rain and snow are drawn in screen-pixel space, so streak size is constant across zoom.
- The overlay is clipped to the map.
- Snow vs rain is decided at the storm centre tile, not per pixel.

## Risks

- Overlay cost at very high zoom (20+) was measured at +15.9% in one noisy sample, because each storm quad fills more of the screen.
- In the Rainfall view the live storm discs blend into already-wet ground and can be hard to tell apart.
- Thirst markers are small at dot zoom (tinted dots, 1.35× when dry).
- Storms over the sea can log as "Blizzard over the Deep Ocean …".
- `weather.lastStormLog` is new state; the slice 3 serializer must save it to keep logs identical after load.
- The old part3 timing harness wrapper around `_spawnStorm` dropped its argument; any external wrapper must pass `tick` through.

## Checklist

- [x] Only `js/render.js`, `js/sim/weather.js`, `js/sim/ecosystem.js` and the listed docs edited
- [x] `renderer.showWeather` (default true) and modes `rain`, `water` exposed for slice 2
- [x] No new comments (grep of diff: 0 added lines with `//` or `/*` in the three JS files)
- [x] No sim balance changes; seeds 42 and 7 deterministic results identical
- [x] ms/tick within ±5% on seeds 42 and 7
- [x] No console errors in the browser
- [x] Overlay at most +15% frame time at default zoom
- [x] Screenshots saved and viewed
- [x] Docs updated (CODE_REFERENCE.md Weather, Ecosystem, Renderer; complexities.md render.js row)
- [x] No state-changing git commands
