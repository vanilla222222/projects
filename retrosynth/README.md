# Retrosynth

A retrosynthesis engine built the way Chemical Graph Constructor is built —
plain scripts, no build step, a molecular graph the code can reason about —
without the ceilings that stop its planner at three steps.

Open `index.html`. Nothing to install.

```
js/registry.js      the module registry
js/elements.js      31 elements, valence lists, implicit hydrogens
js/settings.js      38 settings, declared once, reachable five ways
js/settings-ui.js   controls generated from that schema
js/molecule.js      the graph: charges, aromaticity, stereochemistry, rings
js/smiles.js        reader and canonical writer
js/groups.js        functional-group perception
js/transforms.js    40 disconnections across 11 families
js/stock.js         where a route is allowed to stop
js/search.js        best-first route and path search
js/analogues.js     close relatives, and whether you could make them
tools/*-test.js     883 checks
tools/corpus-check.js   the large run against 20,000 patent structures
```

## Three questions

| mode | you give it | it answers |
|---|---|---|
| `route` | a target | how to make it, back to things you can order |
| `path` | a start and a target | how to get from one to the other, using the start |
| `analogues` | a target | close relatives, and how to make those |

A question is settings like any other, so it travels in a link:
`?m=path&x=OC(=O)c1ccccc1O&y=CC(=O)Oc1ccccc1C(=O)O`

## Why rebuild rather than extend

| Chemical Graph Constructor | Here |
|---|---|
| 9 elements: C N O S P F Cl Br I | 31, with valence *lists* |
| `maxDepth: 3`, 1.5 s budget | depth to 20, budget to 10 min |
| 58 transforms, none of them couplings | 40, including Suzuki, Buchwald, Sonogashira, Heck |
| tree expansion, no ordering between branches | best-first over a cost model |
| stops at a depth limit | stops at a catalogue |
| 27 settings, one hand-written validator | 38, declared once |
| one `priority` choice | five weights you can trade off |

The element table is the one that decides the rest. No boron means no Suzuki
coupling — not "unimplemented", *inexpressible*. No silicon means TBS and TMS
are labels rather than chemistry.

Fewer transforms than chem lab, and that is the honest number. The forty here
are chosen for what a route needs rather than what a course covers.

## What it does

```
O=C(NCc1ccccc1)c1ccc(-c2ccncc2)cc1   ->  5 routes, 0.03 s

Route 1 · 2 steps
  1. Brc1ccc(C(O)=O)cc1 + OB(O)c1ccncc1  ->  biaryl acid
     Suzuki–Miyaura coupling · Pd(PPh3)4, K2CO3 · dioxane/water, 90 °C
  2. NCc1ccccc1 + biaryl acid  ->  the target
     Amide coupling · EDC, HOBt · DMF, 20 °C

Route 2 · 2 steps   amide first, then the coupling
Route 3 · 3 steps   halogenate, couple, acylate
```

## How far to trust it

**The SMILES layer is measured, not asserted.** Against RDKit over 20,000 real
patent structures: all 20,000 agree, none fail to parse, none drift on a second
pass, and 44 (0.22%) still write differently after their atoms are renumbered.
`node tools/corpus-check.js <uspto.csv> 20000` reproduces it.

**The catalogue is the limit, not the chemistry.** 187 compounds, written out
by hand. Most targets that fail do so because a starting material is not on the
shelf, not because no disconnection exists. A real supplier catalogue would
move this more than any other single change.

**Nothing is verified forwards yet.** chem lab checks each candidate by running
the reaction in the forward direction and confirming it gives the target back.
That is the right check and it is not written here, so a route is a suggestion
that has not been argued with.

**And it is not chemistry advice.** No model of yield, selectivity, order of
addition or safety.

## Running the tests

```
node tools/all.js                 # 883 checks, under a second
node tools/corpus-check.js <csv>  # the slow confirmation
```
