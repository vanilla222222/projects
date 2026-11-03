# Rule 9 across the reference generators

Rule 9 is the house rule that a derived row must not carry an unassigned stereocentre or an
undefined double-bond geometry. It was audited across all 72 `tools/derive-*.py`. **Not one of
them implemented it correctly**, and the gap was not latent: 24 generators were emitting
rule-9-failing rows, 744 of the 1,218 rows they produced between them.

## How it was wrong

Two generators came close and 68 had no check at all.

`derive-cox2-references.py` tested rule 9 as a bare truthiness test on
`Chem.FindMolChiralCenters(mol, includeUnassigned=True)`. That expression is truthy for assigned
centres too, so it refused fully specified chiral candidates and could never emit a chiral row.
There is a second, worse flavour of the same mistake: over the **default** call,
`includeUnassigned` is `False`, so the expression is falsy for an unassigned centre and lets it
straight through. Measured on two probes:

| probe | truthiness, default call | truthiness, `includeUnassigned=True` | correct `'?'` test |
|---|---|---|---|
| `N[C@@H](C)C(=O)O` (assigned) | refuses | refuses | admits |
| `NC(C)C(=O)O` (unassigned) | admits | refuses | refuses |

`derive-parp-references.py` had the correct `'?'` test **and** a `STEREOANY` bond check, and the
bond check was still vacuous, because nothing in the file calls
`Chem.FindPotentialStereoBonds`. Without it `STEREOANY` is never set: after `SanitizeMol` alone,
`CC=CC` reports `STEREOANY` false; after `FindPotentialStereoBonds`, true; `C/C=C/C` stays false
either way. `derive-nucleoside-references.py` had the `'?'` test and no bond check at all.

So the correct gate needs all four parts, which is what `derive-cox2-references.py` now carries
and what every patched generator matches:

```python
    Chem.AssignStereochemistry(mol, cleanIt=True, force=True)
    Chem.FindPotentialStereoBonds(mol)
    ...
    elif any(label == '?' for _, label in Chem.FindMolChiralCenters(
            mol, includeUnassigned=True, useLegacyImplementation=False)):
        why = 'unassigned stereocentre'
    elif any(bond.GetStereo() == Chem.BondStereo.STEREOANY for bond in mol.GetBonds()):
        why = 'undefined double-bond geometry'
```

## Rule 9 is a gate, not a run failure

The first patch set routed a rule-9 refusal into each generator's run-level failure list, which
made 23 of 24 generators emit nothing and exit non-zero. That conflated two different things.
Rule 9 judges a *candidate*, so it should drop that candidate and say why, exactly like the
stereo-stripped and exact-SMILES collision gates; whether the run then fails is for the
generator's own pre-existing row-target gate to decide.

Re-cut that way, the result changes materially. Rule 9 can no longer raise, so every non-zero
exit below is provably the target gate firing on a pool rule 9 has legitimately thinned, with the
refusals counted in that line's own `collisions skipped` total.

| outcome | generators |
|---|---|
| emits rows, exits 0 | 5 |
| emits some rows but its own target gate fails the run | **0** |
| emits zero rows, target gate fails the run | 19 |
| output unchanged (already emitting nothing) | 9 |
| not verified, see below | 1 |

The empty middle row is the useful result: after the correction nothing lands in the ambiguous
case where rule 9 and the target gate are both implicated.

### Correctness costs nothing in five

All five of these emitted 0 rows under the first patch set; the semantics correction alone
recovers them, and all 261 emitted rows pass rule 9 when re-measured outside the generators.

| generator | rows before | rows after | rule-9 refusals |
|---|---|---|---|
| `derive-psychotropic-matrix` | 189 | 113 | 127 |
| `derive-methylxanthine` | 48 | 48 | 33 |
| `derive-fluoroquinolone` | 35 | 35 | 27 |
| `derive-antihistamine` | 34 | 34 | 93 |
| `derive-carbamate` | 31 | 31 | 17 |

Four of the five emit the same count from a different set: their candidate pools exceed their
targets, so they backfill with stereo-clean candidates. Only `psychotropic-matrix` emits strictly
fewer, and it is also the one file with no skip counter, so its recovery comes purely from
refusing to treat a skip as a failure.

### Nineteen stop producing

`ace-inhibitor`, `adrenergic-anesthetic`, `androgen`, `anticonvulsant`, `antiestrogen`,
`antimuscarinic`, `aromatase`, `arylpiperazine`, `benzamide`, `benzazepine`, `benzomorphan`,
`dihydropyridine`, `estrogen`, `oxime-carbamate`, `phenethylamine-scaffold`, `phytoestrogen`,
`pyrazolone`, `steroid-ester`, `tropane`.

These classes stop growing until their slot tables carry stereochemistry. That is the accepted
outcome: it is the same answer the 20 classes with measured ceilings below 50 already record in
`CLASS-FIFTY-LIMITS.md`, reached by the same reasoning — the evidence does not support the rows,
so the rows are not written.

Six are near misses rather than hopeless, and a lower target would recover stereo-clean rows from
them today:

| generator | target gate after rule 9 |
|---|---|
| `derive-sulfonamide` | `only 14 of 20` |
| `derive-anticonvulsant` | `only 9 of 10` |
| `derive-pyrazolone` | `only 7 of 12` |
| `derive-antimetabolite` | `only 2 of 8` |
| `derive-kinase` | `only 1 of 4` |
| `derive-nonbenzodiazepine` | `only 1 of 5` |

They emit nothing rather than a short batch because these scripts write to stdout only when
*every* family clears its target, so a partial success is discarded wholesale.

### Nine unchanged, but not untouched

`antifungal`, `antimetabolite`, `antiviral`, `diuretic`, `kinase`, `nicotinic-ligand`,
`nonbenzodiazepine`, `phenethylamine`, `sulfonamide` already emitted nothing. Their stdout is
byte-identical, but the patch is not inert: `antifungal` now logs 156 rule-9 refusals,
`nicotinic-ligand` 151, `diuretic` 65, `phenethylamine` 41. Those candidates were previously
dropped only by the flat collision gate — these are the generators that were safe by accident,
and they now have a real gate between those candidates and the library. `sulfonamide` logs 0,
consistent with having no stereogenic candidates to refuse.

## What is not patched

`derive-opioid-references.py` is **left unpatched**. Two of its five families enumerate novel
4-anilidopiperidines on the fentanyl template, anchored on fentanyl, acetylfentanyl, ocfentanil,
carfentanil and sufentanil, and all five families emit in a single run, so there is no partial run
that avoids them. That enumeration is declined as synthesis-adjacent uplift, as it was when the
class was first considered, so the generator was never run and its patch has no measured
before-and-after. A patch verified only by inspection is not applied here.

Three further generators could not be measured at all: `derive-benzofuran`, `derive-flavonoid` and
`derive-beta-carboline` hard-coded their input and output paths to scratch directories that are not
in the project, and `beta-carboline` additionally required a positional argument. They are now
portable and runnable, and each reproduces its recorded figure: `benzofuran` and `flavonoid` report
their classes already at the 50-row target and emit nothing, and `beta-carboline` reproduces the
measured ceiling of 33 that `CLASS-FIFTY-LIMITS.md` records. None of the three has a rule-9 check,
and none is in the patched set: their emit sites share none of the five anchor idioms, and since
all three currently emit zero rows a patch to them could not be verified by a before-and-after.
They are the remaining rule-9 work, alongside `derive-opioid-references.py`.

## Already in the library

Measured over all 22,137 rows: **4,720 of 15,067 externally sourced rows and 2,886 of 7,070
hand-written rows** carry an unassigned stereocentre or an undefined geometry. Restricted to the
classes a `derive-*.py` produces, it is 1,760 of 3,266, and every one of those is hand-written —
not one is externally sourced, so the class filter alone separates the signal cleanly. Many
sourced rows legitimately specify no stereochemistry, which is why the library-wide figure is not
a defect count.

The library is append-only, so none of these rows is rewritten. The patches stop the number
growing; they do not reduce it.

## Diagnostic volume

One stderr line per refused candidate is what makes the zero-row cases legible, and on the widest
enumerators that is a lot of lines: `phenethylamine-scaffold` writes 32,481,
`benzazepine` 3,721, `aromatase` 2,139. It is stderr only, it touches neither stdout nor the row
data, and it matches the per-candidate `gate refused` idiom `derive-cox2-references.py` already
uses. If it becomes unwieldy the house pattern is a counter plus a capped sample, as these files
already do for `fails[:40]`.

## Side findings

- `derive-arb-references.py` writes `tools/library.json` as a list of 4-element lists, and
  `derive-beta-blocker-references.py` reads that same path expecting dicts and dies with
  `TypeError: list indices must be integers or slices, not str`. The second only works if the
  first has not run.
- Several generators write into the project while running: `derive-fenamate` drops
  `tools/library.json` and `tools/rows.js`, `derive-aniline-analgesic` drops
  `tools/library-dump.json`, `derive-penicillin` drops `Penicillin-rows.js` and `rows.json` into
  the working directory, `derive-beta-blocker` drops `tools/Beta-blocker-rows.js` and
  `tools/accepted.json`, `derive-arb` drops `tools/rows.js`. The portable convention the
  cephalosporin generator follows — rows to stdout, diagnostics to stderr, no file writes outside
  a cache directory — is the fix, and is what the three generators above were converted to. These
  five are not yet converted.
