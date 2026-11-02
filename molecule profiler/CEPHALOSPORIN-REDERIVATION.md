# Re-deriving the Cephalosporin class

The 34 systematically named `cls: 'Cephalosporin'` rows shipped earlier were re-examined
against the rule they claim to follow: every substituent value admitted only when two or more
**externally sourced** library rows attest it on a constructively proven cephem anchor. None of
the 34 survives that test. They are left in place, because the library is immutable by design,
and the class is re-derived from scratch alongside them.

## Why none of the 34 can be re-proven

The script that produced them iterated the library with a single `ENTRY` regex and no `SOURCED`
regex. That regex matches only rows written without a `source` block. It therefore scanned
6,958 hand-written rows and **0 of the 15,067 externally sourced rows** — the entire population
the two-anchor rule is meant to draw on. Every one of its 21 anchors resolved to a hand-written
row with no `source` block, so not one anchor was externally sourced.

| defect | rows affected |
|---|---|
| anchors externally sourced | 0 of 21 |
| re-provable under the two-sourced-anchor rule | 0 of 34 |
| C7 substituent attested by two sourced anchors | 0 of 34 |
| C3 substituent attested by two sourced anchors | 17 of 34 |
| C2 substituent attested by two sourced anchors | 34 of 34 |
| storing the stereo-free core (no assigned centre anywhere) | 34 of 34 |
| unassigned stereocentres | 85 across 34 rows |

C2 is the only site that was sound, and only because the free carboxylic acid is attested by
nearly every cephem in the corpus whatever population is scanned.

Four of the 34 are additionally mis-drawn: they are named `...cyclohexa-1,4-dien-1-yl...` but
store `C3=CCCC=C3`, the 1,3-diene. The externally sourced `cefradine` stores the 1,4-diene
`C3=CCC=CC3`; the hand-written `Cephradine`, `Cefroxadine` and `Epicillin` share the same error.

All 34 fail rule 9: the cephem core is 6R,7R in all 55 externally sourced cephems, and the 34
store it flat.

## The re-derivation

`tools/derive-cephalosporin-references.py` is replaced. It reads both populations, finds 115
cephem-core rows of which 55 are externally sourced, and proves anchors constructively by
`FragmentOnBonds` + `molzip` against a numbered 6R,7R template, requiring stereo-inclusive
canonical SMILES identity, identifying the core by atom index rather than substructure and
dropping ring-fused matches. All 55 sourced rows prove out across three core shapes (49 + 5 + 1)
with 0 proof failures; five are then dropped because their C7 carries two heavy substituents
(the cephamycins `cefbuperazone`, `cefmetazole`, `cefminox`, `cefoxitin`, `cephamycin C`).

Of the 64 (site, value) cells the 49 usable anchors present, **19 are attested by two or more
sourced anchors** — 8 at C3, 3 at C2, 8 at C7 — and 45 hold exactly one anchor and are refused.
The refusals include every quaternary-pyridinium C3 (`cefaloridine`, `cefpirome`, `cefozopran`,
`cefsulodin`, `cefclidin`, `cefoselis`, `ceftolozane`, `cefpimizole`, `cefiderocol`) and every
one-off prodrug ester at C2 (`cefuroxime axetil`, `cefpodoxime proxetil`, `cefotiam hexetil`,
`cefuroxime pivoxetil`).

The arithmetic closes exactly: 8 C3 × 2 nameable C2 × 8 C7 = 128 candidates, less 16 refused by
the collision gates, is **112 rows**. Library 22,025 → 22,137; class 52 → 164.

## Names that determine their structures

The first corrected run emitted 112 structures carrying 250 tetrahedral centres and 87 specified
double-bond geometries, under 112 names with no stereodescriptor at all. That was refused: a name
that does not determine its structure is not a reference. Each slot-table entry is now
`(formula, name_template, locmap)`, the template carrying `@key@` tokens and the locmap declaring
each locant as an atom index or a bond pair. Locants are written onto the fragment as atom or
bond properties before `CombineMols`/`molzip`, which both preserve them; after assembly every
letter is read off the finished molecule by `Chem.AssignStereochemistry(cleanIt=True, force=True)`
and `Chem.rdCIPLabeler.AssignCIPLabels`. Nothing is transcribed from the SMILES tag that built it.
Locants and bracketing are grammar facts; every R/S/E/Z comes from CIP.

| measurement | value |
|---|---|
| specified stereo elements across the 112 structures | 337 |
| stereodescriptors carried by the 112 names | 337 |
| names with no stereodescriptor | 0 |
| rows refused for want of a name the grammar can write | 0 |
| rows reading `(6R,7R)` at the core | 112 |

Two refusals guard the invariant — an unfilled `@`/`?` token, and a mismatch between specified
elements and descriptors — and neither fires.

A counting convention is worth recording: these C=N and C=C bonds report `STEREOCIS` and
`STEREOTRANS`, never `STEREOE`/`STEREOZ`. Testing `in (STEREOE, STEREOZ)` finds 0 bonds and
undercounts the total as 250; `not in (STEREONONE, STEREOANY)` finds 87 and gives 337. The same
distinction bites in the other direction: molecules parsed back from emitted SMILES report
`STEREOZ`/`STEREOE` while `molzip`-built ones report `STEREOCIS`/`STEREOTRANS`, so a
structure-direction mutation test written against one pair only is a silent no-op. All 87 passed
vacuously until the flip covered all four values.

## The inverse check

`tools/inverse-check-cephalosporin.py` rebuilds each structure from its name alone, with its own
grammar, independently retyped **stereo-free** scaffolds, and ring-closure digits drawn only from
7, 8, 9 and %10 (asserting no digit 1 or 2 appears). It parses each descriptor out of the name,
enumerates the stereo-free scaffold with `EnumerateStereoisomers(onlyUnassigned=True,
unique=True)`, CIP-labels each isomer, and keeps the one whose labels at the mapped sites equal
the name's letters — asserting both that the isomer count is 2^n and that exactly one isomer
matches. 36 assertions check positively that no `@`, `/` or `\` appears in any of its 18
constants, so the stereochemistry cannot be smuggled in through a scaffold.

```
rows under inverse check: 112
name-direction descriptor flips: 337
structure-direction tag flips:   337
assertions: 1193
failures: 0
```

All 337 name-letter flips either change the structure or fail to resolve; all 337 structure-tag
inversions stop matching the name. Nine positive controls reproduce sourced rows from the house
name alone, stereochemistry included (`cephalexin`, `cefetamet`, `cefaloglycin`,
`cephalosporin C`, `deacetoxycephalosporin C`, both 7β-amino acids, `cefteram`, `cefcapene`),
each paired with a `(6S,7R)` flip control; eight negative controls cover a missing core block,
an invalid descriptor letter and a missing side-chain descriptor.

The script reads the generator's rows on stdin and now exits non-zero when it receives none.
Run without input it had reported `rows under inverse check: 0` and exited 0 on its 71 control
assertions alone — a checker that passes having checked nothing is worse than no checker.

## Method findings

- **Site indices invert easily.** In the census SMARTS, match index 0 is C2, the N-adjacent
  carboxyl-bearing carbon, and index 1 is C3. Reading them the other way silently swaps the two
  slot tables.
- **Slot values must be tautomer-normalised before attestation.** Ten sourced rows store the C7
  side-chain amide as the imidic acid, and several store the aminothiazole or aminothiadiazole as
  the ring iminol. Un-normalised, `cefditoren` and `ceftiolene` form a spurious iminol cell,
  `cefclidin` and `ceftobiprole` fall to one anchor each, and the 12-anchor methoxyimino cell
  reads 10. RDKit's full `TautomerEnumerator.Canonicalize` gets the connectivity right but
  destroys stereochemistry, so the generator applies the restricted 1,3 hydrogen shift on the
  Kekulé form and picks by `ScoreTautomer`; every tag survives. This is the same artefact
  `TAUTOMER-ARTEFACT.md` measures, here cutting against the anchor pool.
- **The cross-class gate must read the product space, not raw class size.** No non-target class
  holds 50 or more cephem rows, so the gate trips 0 times. Thresholding on raw class size instead
  trips 11 times and suppresses 2 of the 6 stereo-stripped sole blockers.
- **The prefix sort key must strip `@key@` tokens as well as descriptor blocks**, or the token's
  own letter leaks into the alphabetical comparison and reorders prefixes.
- **In the inverse checker, side-chain ring digits must avoid 7.** The scaffold's β-lactam ring 7
  is still open where the C7 chain splices in, so reusing 7 closed the lactam into the side chain
  and produced a mangled molecule that still parsed. Side chains are confined to 8 and 9.
- Setting `SetStereo(STEREOCIS/STEREOTRANS)` by hand and then calling
  `AssignStereochemistry(cleanIt=True, force=True)` silently discards the bond stereo. It
  produced 83 spurious failures before the enumeration route replaced it.

## Collision gates

Each gate is evaluated independently, with no short-circuit, so the table reads as a diagnosis
rather than a first-refusal log.

| gate | candidates tripped | sole blocker for | rows if lifted |
|---|---|---|---|
| stereo-stripped-structure | 15 | 6 | 118 (+6) |
| exact-smiles | 9 | 0 | 112 (+0) |
| name-case-insensitive | 0 | 0 | 112 (+0) |
| intra-batch-duplicate | 0 | 0 | 112 (+0) |
| cross-class-double-count | 0 | 0 | 112 (+0) |
| tautomer-identity | 10 | 1 | 113 (+1) |
| unassigned-stereo (rule 9) | 0 | 0 | 112 (+0) |

Naming the stereochemistry moved work between gates without changing the admitted set. Under the
stereo-free names, four candidates were refused by name collision, three of them colliding with
rows of the batch under audit here — the defect reappearing as a name clash. Those four are still
refused, now by structure alone, which is why the stereo-stripped gate's sole-blocker count is 6
rather than 4 and the name gate's is 0 rather than 4. Measured the other way, 0 of the 112 new
names collapse onto an existing corpus name when stripped of descriptors, so the resolution does
not rest on the descriptors alone.

The `tautomer-identity` gate is the sole blocker for exactly one candidate: the cefditoren amide,
refused because `cefditoren` itself is stored in the iminol form. That is the amide/lactam ↔
imidic-acid/lactim transform and nothing wider. `TAUTOMER-ARTEFACT.md` measures what happens when
such a gate is generalized — over the whole library it would refuse genuine distinct compounds at
a false-to-true ratio of 67 to 27 — so this gate stays restricted to that transform and is not a
precedent for a general one.

## Independent verification

The 112 rows were re-measured outside the generator, by separate code reading the emitted text:
stored `formula` against `CalcMolFormula` (0 mismatches), unassigned stereocentres and
`STEREOANY` bonds after explicit stereo perception (0), exact-SMILES, stereo-stripped and
case-insensitive-name collisions against all 22,025 prior rows (0 each), intra-batch duplicate
name, exact structure and flat structure (0 each, and 112 distinct values of each), descriptor
count against specified stereo element count per row (337 = 337, 0 rows differing), and the
`(6R,7R)` core in every name. Both scripts are byte-identical on stdout and stderr across
separate cold caches, and neither contains a hard-coded temporary path.

The validation gate added for the tautomer artefact stays green across the splice: the 112 new
rows contribute 0 artefact rows, because the generator normalises the tautomer before attesting a
slot value and therefore never emits an iminol.
