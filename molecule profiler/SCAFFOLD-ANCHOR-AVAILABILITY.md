# Can the 42 blind generators be repaired?

`GENERATOR-CORPUS.md` records that 42 generators resolve **zero** externally sourced anchors, and
that conversion to the full-corpus loader does not change that, because anchor lookup is by exact
name and no anchor name matches a sourced row under any casing. Their shipped rows are therefore
not re-provable under the house two-sourced-anchor rule. This measures whether re-choosing their
anchors from the sourced population is possible, class by class, before anyone attempts it.

## What is actually at stake

The 42 generators emit into **123 classes holding 5,276 library rows**. Every one of those rows is
currently unprovable: not wrong, but unsupported by the rule the project claims to follow.

**92 of those 123 classes are already at or over the 50-row target.** 31 are still under. So the
repair is overwhelmingly about *provability of what is already shipped*, not about growth. That is
the opposite of how a yield estimate makes it look, and it is the number to keep hold of.

## Verdicts

141 family cores were measured across the 42 classes, by census blind to `cls` over the whole
22,137-row corpus.

| verdict | classes | families |
|---|---|---|
| repairable — two sourced anchors prove out at every varied site | 21 | 33 |
| partially repairable — some sites stall below two | 9 | 24 |
| closed — the sourced population cannot attest two anchors at any site | 12 | 84 |

## The yield figure, and why the large one is not real

| bound | rows |
|---|---|
| product space across every core | 6,391,089 |
| excluding the eight motif cores | 6,378,072 |
| **restricted to cores of 200 corpus hits or fewer** | **82** |

That spread is the measurement's error bar, and the small number is the honest one. Three reasons
the large figure cannot be read as a yield:

**It is one family.** 6,376,268 of the 6,391,089 is phytoestrogen's chromone core
`O=c1ccoc2ccccc12` — a genuine scaffold with genuine evidence (635 corpus rows, 566 sourced, 390
constructively proven anchors after dropping 164 ring-fused matches, all six sites admitted). What
is unreal is the arithmetic: a bare six-site product with no cross-combination evidenced and no
collision gate run. The cephalosporin precedent went 128 candidates to 112 rows on a *three*-site
product. And `Phytoestrogen` already holds 52 rows, so its need is zero regardless.

**Three of the headline classes rest on a motif, not a scaffold.** The psychotropic, psychotropic-matrix
and dopaminergic yields all come from the benzamide core `NC(=O)c1ccccc1`. Censused directly, that
query returns Imatinib, Methotrexate, Metoclopramide, Nilotinib, Olaparib and Thalidomide; the
anilide core `C(=O)Nc1ccccc1` returns Paracetamol, Fentanyl, Diazepam, Imatinib, Atorvastatin and
Aripiprazole. Per-site counts on a core that matches a sixth of the drug universe are not
measurements about a class. A repair would have to narrow the core first, as the COX-2 census did
with recursive SMARTS.

**39 of the 141 cores are not scaffolds at all.** Once every slot a template varies is removed,
some templates leave a functional group: `aromatase` family 1 reduces to `C`,
`antifungal-antiviral` family 2 to `CC`, `nsaid` to `c9ccccc9` and `C`, `cholinergic` to `OC(=O)`.
These were refused on the project's own thresholds — fewer than 8 heavy atoms, no ring, or more
than 1,000 corpus hits — the same bounds `CLASS-FIFTY-LIMITS.md` already applies. A further 24
families have at least one site that cannot be located on a single core atom, clearest in the
androgen and steroid A/B ring-fusion slots; those sites are excluded and such families cannot be
called fully repairable.

Restricted to credible cores, the whole realistic yield is **82 rows, from two classes**: androgen
69 and kinase 13. Both are **already at the target** — `Androgen` holds 51 rows and
`Kinase inhibitor` 50. There is no class in this set where re-choosing anchors both works and is
needed for growth.

## Cores that came out clean

Worth recording, because these are where a repair would stand up. Each is a specific scaffold with
a substantial sourced population and constructive proofs:

| core | corpus | sourced | proven anchors |
|---|---|---|---|
| cephem | 226 | 54 | 54 |
| adenosine | 360 | 326 | 310 |
| androstene | 227 | 86 | 75 |
| quinazolin-4-amine | 52 | 37 | 31 |
| phenothiazine | 94 | 34 | 14 |
| tropane | 71 | 17 | 14 |

The cephem row is the control: it reproduces the figures `CEPHALOSPORIN-REDERIVATION.md` recorded
from a separate measurement, and an independent re-census here returned 227 corpus rows and 55
sourced for a looser query. A measurement that reproduces the one case already repaired is the
reason to trust the rest.

## What follows

1. **The repair is worth doing for provability, not for rows.** 5,276 shipped rows across 123
   classes currently rest on hand-written anchors that no sourced row supports. Re-choosing anchors
   on the clean cores above would make those rows defensible without changing one of them.
2. **Do not pursue the large yields.** The phytoestrogen product is ungated arithmetic on a class
   already at target, and the psychotropic family numbers are artefacts of a motif core.
3. **Narrow the motif cores before measuring them again.** Eight cores need recursive SMARTS or an
   explicit scaffold before their per-site counts mean anything.
4. **The 12 closed classes are closed.** They join the 20 in `CLASS-FIFTY-LIMITS.md`: the sourced
   corpus cannot attest two anchors at any site, so the rows they hold are the rows the evidence
   supports.
