# Focused page layout

The main page groups input, optional file import and downloads rather than
showing every example and export control in one action row. Existing input,
file, export and analysis IDs remain attached to their original controls.
The full methodology is available in a separate disclosure. Input feedback,
quality warnings and scientific evidence labels remain present.

Top-level navigation now separates Prodrug studio, Analogues, Exposure and
Metabolism. The full dossier remains in Overview/All sections, while focused
workspaces retain the molecule selector and quality context. Section search
still searches across workspaces, including design and release terminology.

The prodrug studio provides five presentation views: Build at a site, Compare &
review, Release steps, Quick candidates and Reference evidence. Existing DOM
nodes and event handlers remain owned by the scientific modules. View changes
preserve previews, the shortlist and pathway state. Adding a design navigates
to comparison; starting or inspecting a route navigates to release steps.
Returning to build/comparison/route restores current-input context rather than
leaving a named reference selected. New analyses reset the studio to its builder.
Reference evidence and generated hypotheses stay visually distinct.

Workflow navigation supports left/right arrows and Home/End. Automatic navigation
moves focus to the visible workflow button. Optional export/resource menus close
with Escape. Results tables scroll within focusable regions; mobile workspaces
and studio navigation scroll horizontally, while forms and cards stack. Dark
and light themes use shared variables. Compact inline information buttons retain
their own sizing, and print layout continues to show the selected molecular dossier.

No chemistry calculations, eligibility rules, ranking methods, research data or
export formats are changed. Source references and complete candidate limitations
remain accessible in labelled disclosures.

Validation: the layout controller has focused DOM checks for exports, navigation,
section search, input/reference context, preserved preview/shortlist state,
route handoff, keyboard focus, Escape and changed-input reset. Existing explorer,
priority, builder and analogue interface tests passed, alongside analysis
lifecycle, file import, input workflow, comparison and script/ID integration
checks. Run the DOM test with jsdom available:

```sh
PROFILER_JSDOM_PATH=/path/to/node_modules/jsdom node tools/layout-ui-test.js
```
