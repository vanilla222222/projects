# Retrosynth

A retrosynthesis engine: give it a target molecule, get back a route down to
compounds you can buy.

It exists because the planner inside `chem lab` is sized for an interactive
teaching panel — `maxDepth: 3`, a 1,500 ms budget, and 102 hand-written reaction
rules. That is the right shape for a lab notebook and the wrong shape for route
finding, which needs eight to fifteen steps and can afford to think for a
minute. This is the other shape.

## What is here

```
tools/build-templates.py    mine retro templates from atom-mapped reactions
tools/import-catalogue.py   load a supplier catalogue as purchasable stock
tools/build-stock.py        derive a stand-in stock when no catalogue is at hand
tools/engine.py             best-first route search over the template library
tools/benchmark.py          measure the engine on reactions it has never seen
data/                       the built library, stock and held-out test set
```

## The templates are mined, not written

102 hand-written rules will not find routes to real targets, and writing the
next 10,000 by hand is not a plan. So they are extracted from USPTO-50k — 50,016
atom-mapped reactions from patents — using `rdchiral`.

**Every template is validated the moment it is extracted.** It is run backwards
against the product of the very reaction it came from, and it has to return that
reaction's own precursors. A template that cannot do that is dropped before it
ever reaches the engine; there is no point searching twelve levels deep with
transforms that fail at one.

| | |
|---|---|
| reactions read | 50,016 |
| held out (1 in 10, split by patent id) | 5,103 |
| templates extracted | 44,913 |
| unique templates | 11,188 |
| **usable after round-trip validation** | **10,947** |
| dropped for failing their own reaction | 241 |
| round-trip recovery | **97.96%** |
| templates covering half the corpus | 311 |
| templates seen exactly once | 7,077 |

That recovery figure matches published `rdchiral` results, which is the point of
measuring it: it says the extraction is working, not that the engine is good.

## Stock

`data/stock.json` is 204,210 purchasable compounds from eMolecules, via the
ASKCOS buyables catalogue, with per-gram prices kept in `stock-prices.json`.

`build-stock.py` can instead derive a stand-in from the corpus — molecules used
as reactants at least three times and never recorded as a product. It produces
3,489 compounds and is a much weaker stop condition. It is kept because not
every corpus arrives with a catalogue, not because it is as good.

## Search

Best-first over *states*, where a state is the multiset of molecules still to be
made. One step replaces a molecule with the precursors a template proposes; a
state whose molecules are all purchasable is a finished route.

Cost is `-log(template frequency)` summed over steps, so common chemistry is
cheap and exotic chemistry has to earn its place. The heuristic is the count of
molecules not yet purchasable, which cannot overestimate the steps remaining.

This is weaker than retro\*'s AND-OR formulation, deliberately. retro\* leans on
a learned value function whose errors are invisible; a state here is either
solved or not, and every route can be re-checked against the templates that
produced it.

## How good is it? Not very, yet — and here is the number

Measured on held-out reactions, whose templates are **not** in the library.
Purchasable means present in the catalogue, with no size shortcut.

| | |
|---|---|
| targets attempted | 38 |
| **solved** (reached buyable material) | **26.3%** |
| first step matches the chemist's own | 10.5% |
| median time per target | 9.1 s |
| route depths found | 7 × 1-step, 2 × 2-step, 1 × 3-step |
| failures | 28, all "no route within budget" |

Published systems reach far higher. This is the honest starting line.

### What is actually limiting it

Not the rules: 10,947 validated templates against the old 102.

Not the stock, and this was worth being wrong about out loud. The derived
3,489-molecule stock looked like the obvious culprit, and loosening it did lift
the solve rate — from 16% to 54% as the "anything small is buyable" threshold
rose. But that lift was mostly the measurement rotting: at the loosest setting
12 of 25 targets were being declared purchasable outright. Swapping in the real
204,210-compound catalogue, which is 58× larger and has no shortcut, moved the
solve rate 22.5% → 26.3%. The stock was not the constraint.

**It is the search.** Every failure is a budget failure: 11 timeouts and 15
expansion caps across 38 targets, ~100 expansions each, and 7 of the 10 routes
found are a single step. The engine brute-forces the 400 most frequent templates
against every intermediate, and most of them cannot match it.

So the next thing to build is the piece that picks which templates to try: a
model from molecule fingerprint to a ranked shortlist. That is what
AiZynthFinder's policy network does, it is a plain supervised problem, and the
training pairs already exist in `data/templates.json` — every template carries
the product it came from.

## Running it

```
python3 -m pip install rdkit rdchiral
python3 -I tools/benchmark.py data 40 15
```

Rebuilding the library from source (about six minutes):

```
python3 -I tools/build-templates.py <uspto-50k.csv> data
python3 -I tools/import-catalogue.py <buyables.json.gz> data
```

## Sources

- Reactions: USPTO-50k, via [retrosim](https://github.com/connorcoley/retrosim)
  (Coley et al.), derived from Lowe's USPTO text-mined reaction set.
- Template extraction: [rdchiral](https://github.com/connorcoley/rdchiral).
- Buyables: [askcos-data](https://github.com/ASKCOS/askcos-data), eMolecules.

Nothing here is validated chemistry advice. A proposed route is a hypothesis
drawn from patent precedent, not a procedure, and the engine has no model of
yield, selectivity under real conditions, or safety.
