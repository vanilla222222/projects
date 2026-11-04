# What the generators can actually see

51 of the 72 `tools/derive-*.py` read `data/library.js` as text. Hand-written rows are written
on one line in the single-quoted house style; externally sourced rows are written as compact JSON
objects carrying a nested `"source"` block. Two different formats, and most generators parse only
the first:

```python
ENTRY = re.compile(
    r"\{ name: '([^']*)', cls: '([^']*)', formula: '([^']*)', smiles: '([^']*)'"
)
```

Measured against the current 22,137-row library:

| reader | rows seen | sourced rows seen |
|---|---|---|
| single-quoted pattern only — **43 generators** | **7,049** | **0** |
| both patterns — 8 generators | 22,116 | 15,067 |
| the node module loader — 19 generators | 22,137 | 15,067 |

The zero is not an estimate. Every one of the 7,049 matches was checked for whether the row it
sits in also carries a source block; none does. Nor is the 43: an earlier draft of this document
said 51, which was wrong. Eight generators already carry a second regex for the JSON rows, and
they are **exactly** the eight that have externally sourced anchors — `methylxanthine` 16 of 16,
`imidazopyridine` 7 of 7, `sulfonylurea` 7 of 7, `benzamide` 6 of 6, `sulfonamide` 6 of 6,
`benzazepine` 5 of 6, `ergoline` 2 of 3, `arylpiperazine` 1 of 8. For those eight the conversion
is a tidy-up worth 21 rows of corpus. The blind population is 43.

## Why this matters more than it looks

Those 51 generators compute two different things from the library, and the blindness corrupts
both.

**Collision gates.** A candidate is refused if an existing row already holds its structure or its
name. Run against 7,049 rows instead of 22,137, the gate cannot see 68% of the corpus, and in
particular cannot see any of the 15,067 imported compounds. A generator can therefore emit a row
for a compound the library already holds.

**Anchor pools.** The house rule admits a substituent value only when two or more **externally
sourced** rows attest it. A generator that cannot see a single sourced row cannot satisfy that
rule at all. Whatever it is doing instead, it is not the two-sourced-anchor rule.

## This already happened

It is the defect that invalidated the 34 original `cls: 'Cephalosporin'` rows, recorded in
`CEPHALOSPORIN-REDERIVATION.md`: all 21 of that generator's anchors resolved to hand-written rows
with no `source` block, C7 was unattested in all 34 rows, and not one of the 34 was re-provable.

**The cephalosporin precedent does not generalise, and it is worth being clear about why.** That
class gained rows — 34 unprovable became 112 provable — because its generator derives its slot
tables *from* the corpus, so a larger corpus gave it more attested values. None of these 43 does
that. Every one carries hand-written slot literals and uses the library only to prove a template
and to reject collisions. For them a larger corpus can only ever subtract. Measured across all 50
generators converted: **0 rows gained, 0 rows lost.**

Conversion is therefore necessary but not sufficient for the 43. Their anchors have to be
re-chosen from the sourced population before their shipped rows become re-provable. Anchor lookup
is by exact name, sourced rows are stored lower-case, and no anchor name in any of the 51 matches
a sourced row under any casing — measured as 0 across all of them — so conversion alone moves no
generator's anchors from unsourced to sourced.

## What the blindness was about to cost

The unchanged row counts hide the result. Three generators emit the same *count* and a different
*set*, because they fill to a target: the collision gate removes a candidate and the loop
backfills. Each dropped candidate is a compound the library already holds, under its real name,
imported from a source the generator could not see:

| generator | candidate it would have emitted | already in the library as |
|---|---|---|
| `antihistamine` | `10-[2-pyrrolidin-1-ylethyl]-10H-phenothiazine` | `parathiazine`, DrugCentral 2327 |
| `arylacetic-nsaid` | `N-hydroxy-2-[1-(4-chlorobenzoyl)-5-methoxy-2-methyl-1H-indol-3-yl]acetamide` | `oxametacin`, DrugCentral 2008 |
| `carbamate` | `(4-dimethylamino-3-methylphenyl) N-methylcarbamate` | `aminocarb`, ChEBI 2653 |

Had those three been re-run and their output appended, the library would have gained three rows
naming compounds it already contains.

Across all 50, **31 candidates are newly refused as duplicates** — `phytoestrogen` 21,
`steroid-ester` 3, `fluoroquinolone` 2, and one each for `antihistamine`, `antimetabolite`,
`arylacetic-nsaid`, `benzomorphan` and `carbamate`. All 31 were checked against the 15,067 sourced
rows by stereo-stripped canonical SMILES: 31 of 31 collide, no false positives. `phytoestrogen` is
the plainest case — it enumerates a flavanone grid the library already holds from ChEBI, and 21 of
its candidates have ChEBI identifiers.

Library-wide, **245 hand-written rows across 79 classes are stereo-stripped duplicates of an
externally sourced row**, 116 of them in the 87 classes these generators emit into. The library is
append-only, so that is a measurement rather than a fix list.

## A row channel with diagnostics in it

Found while checking the conversion rather than by looking for it: 11 generators carry
`print("FAIL " + line)` with no `file=sys.stderr`, and `derive-dopaminergic-references.py`
**reaches that path today**. Its stdout — the channel its rows go to — held nine lines reading
`FAIL <name>: template disagrees with the stored structure` and no rows at all. Splicing that
output into `data/library.js` would have pasted nine `FAIL` lines into a JavaScript array literal.
All 11 are fixed; dopaminergic's stdout is now empty and the nine lines are on stderr.

Those nine failures were a real defect in their own right, and moving them to stderr is what made
it findable. Nine alpha-pyrrolidinophenone cathinone anchors — `Alpha-PPP`, `Alpha-PBP`,
`Alpha-PVP`, `Alpha-PHP`, `4-Methyl-alpha-PPP`, `Pyrovalerone`, `MDPV`, `MDPPP`, `Naphyrone` — did
not match the template they were proven against. The cause is one constant:

```python
CATHINONE = "{AMINE}C({ALPHA})C(=O){ARYL}"
PYRROLIDINE = "N1CCCC1"
```

The comment above the template says `{AMINE}` is "written so its last atom carries the bond to the
alpha carbon". `CN` and `CN(C)` satisfy that. `N1CCCC1` does not: its last atom is a ring carbon,
so the alpha carbon bonded to **carbon** and the template built a 2-substituted pyrrolidine with a
free N-H. For alpha-PVP it produced `CCCC(C(=O)c1ccccc1)C1CCCN1` where the stored row holds
`CCCC(C(=O)c1ccccc1)N1CCCC1` — a constitutional isomer, with the nitrogen at degree 2 and one
hydrogen instead of degree 3 and none.

The stored rows were right the whole time. Writing the ring as a branch off the nitrogen,
`N1(CCCC1)`, reproduces every one of the nine exactly.

Two things about this are worth keeping. **The formula gate cannot see it**: both structures are
`C15H21NO`, so the generator's stated-versus-computed formula check passed and only the
stereo-stripped structure comparison against the stored row caught it. And **the generator was
inert, not merely degraded**: it aborts on any anchor failure, so those nine failures meant it
could never emit a row at all. Before the fix it exits 1 with nine failures and no
constructive-proof report; after it reproduces all **90** of its stored entries, 0 failures,
exit 0. No emitted row changes, because the class is saturated.

## The loader to converge on

50 of the 51 are now converted. `derive-opioid-references.py` is **held back**: two of its six
families enumerate novel 4-anilidopiperidines and `main` iterates every family with no option to
select, so it cannot be run, and its conversion is unverified. It is the one generator still
reading 7,049 rows, and the one still without a rule-9 gate.

`derive-cephalosporin-references.py` is the reference loader: a cache directory from `MP_DERIVE_CACHE` or `tempfile.mkdtemp`, the library dumped once
through `node -e "const{LIBRARY}=require('./data/library.js');console.log(JSON.stringify(LIBRARY))"`,
and rows read as objects with `source` left nested. `derive-benzofuran`, `derive-flavonoid` and
`derive-beta-carboline` were converted to it in `f8b810c`.

Two cautions from those conversions. `derive-beta-carboline` expected `provider` flattened onto
each row and had to be changed to read it from inside the `source` block, which is the shape the
module actually returns. And a generator whose diagnostics go to stdout must have them moved to
stderr before its rows can go to stdout — `beta-carboline` had 37 such prints.

## Not a defect, recorded so nobody fixes it

The regex readers capture 123 SMILES in which a direction marker appears as a doubled backslash,
because they read the JavaScript source text rather than the parsed module. That is harmless:
RDKit parses `C/C=C\\C` and `C/C=C\C` to the same molecule and canonicalises both to the same
string, so any census key built by parsing and canonicalising is correct. The escaping defect that
did real damage was on the **write** side, and is recorded in `LIBRARY-ESCAPING.md`.
