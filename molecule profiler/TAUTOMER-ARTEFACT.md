# The stored tautomer artefact, and why a tautomer-identity duplicate gate is the wrong fix

Part of the reference library stores compounds as the tautomer that the source database happened to serialize rather than the one the compound's own name specifies. The commonest case is an amide or lactam stored as its imidic acid or lactim: `C(=N)O` where the name says `C(=O)N`, or `Oc1nc...` where the name says `O=c1[nH]n...`. This document records what was measured about it, what it does to the computed descriptors, what it does to reference derivation, and — the part that reverses an earlier working assumption — why the duplicate gate that looked like the fix would refuse more genuine compounds than duplicates.

## Scale

Against the 22,025-row library, a substructure census over every row:

| form | query | rows |
|---|---|---|
| acyclic imidic acid | `[CX3](=[NX2])[OX2H1]` | 1,689 |
| aromatic lactim | `[$(c:n)][OX2H1]` | 299 |
| both in one row | | 32 |
| union | | 2,020 |

Of the 2,020, **2,008 are externally sourced and 12 are hand-written**: 2,007 come from the ChEBI import, 9 from `ChEMBL binding reference`, and one each from `Antiviral`, `Fragment`, `Immunosuppressant` and `DrugCentral named compound`. The artefact is overwhelmingly an import artefact, not an authoring mistake. An earlier count of 1,721 was the acyclic subset alone (1,689 + 32); the aromatic lactim set adds the remaining 299.

The molecular formula is unchanged by the shift, so the stored `formula` field agrees with `CalcMolFormula` on every one of these rows and the formula check cannot see the artefact.

## What it does to the computed descriptors

Topological polar surface area is wrong on all 2,020 rows, because an `=N` plus `OH` pair contributes differently from `=O` plus `NH`. Over the acyclic subset the error has median -3.5 and mean -6.28 square angstroms, worst case -47.4. Hydrogen-bond donor count is wrong on 251 rows.

TPSA is not a leaf value. It feeds the Lipinski, Veber, Egan and Muegge rule evaluations and the blood-brain-barrier estimate, so every panel that reads one of those reads the artefact. This is the part of the finding that is unambiguously a defect with a known fix: normalize the tautomer before computing descriptors.

## What it does to reference derivation, and why the sign varies

Each class derivation that ran against this corpus measured the artefact separately. The direction is not consistent, which is why no single blanket treatment is correct:

- **6-oxopurines (nucleoside census).** The artefact removes whole cores from the anchor pool: 42 inosines and 35 guanosines are stored as the 6-hydroxy lactim, so a keto-core query finds neither.
- **COX-2 inhibitor.** Contributes nothing. Lifting it changes the derived row count by zero.
- **PARP inhibitor.** Load-bearing *in favour*. The phthalazin-1(2H)-one N2-H cell reaches its two-anchor threshold only because `phthalazin-1(2H)-one` is itself stored as the lactim `Oc1nncc2ccccc12`, although its own name specifies the N2-H lactam. Lifting the artefact drops the class from one derived row to zero. The row was accepted on the ground that the name is the attestation and the stored structure is the defect.
- **Cephalosporin.** Cuts entirely against the pool. All 10 iminol cephem rows are externally sourced and none is hand-written, so 18 per cent of the anchor pool presents C7 in the artefact tautomer — the single largest cause of one-anchor refusal at that site.

## The duplicate audit, and the correction it forces

A corpus-wide audit bucketed all 22,025 rows by `CalcMolFormula` (tautomerisation preserves formula), stripped stereochemistry, canonicalised each row with `rdMolStandardize.TautomerEnumerator().Canonicalize`, and grouped rows sharing a canonical form. It reported 1,216 groups covering 3,102 rows, out of 11,991 formula buckets and 3,650 multi-row buckets, with 0 unparsable rows.

That headline number is not a duplicate count, and reading it as one was wrong. Partitioning it:

| partition | groups | note |
|---|---|---|
| all audit groups | 1,216 | |
| one distinct stereo-stripped structure | 1,122 | stereoisomer families, not tautomers — an artefact of stripping stereo before canonicalising |
| two or more distinct stereo-stripped structures | 94 | 272 rows over 199 distinct flat structures |

The 1,122 are families like the hexose group, where glucose, galactose, allose and nine other diastereomers collapse into one group purely because stereochemistry was removed first. They are already covered by the existing stereo-stripped duplicate gate and have nothing to do with tautomerism.

Of the 94 that remain, 240 rows are externally sourced and 32 hand-written, 24 groups mix the two, and 223 of the rows are `ChEBI named compound`. Classifying them by whether the difference is actually the amide/lactam shift:

| partition | groups | rows |
|---|---|---|
| an imidic-acid or lactim form coexists with the amide or lactam form | 27 | 69 |
| distinct compounds that happen to be formal tautomers | 67 | |

**The 67 are the reason a tautomer-identity gate must not be adopted as written.** They are not duplicates in any sense a chemist would accept:

- the whole aldose/ketose family — `aldehydo-D-glucose 6-phosphate` with `keto-D-fructose 6-phosphate`, `aldehydo-D-xylose` with `D-xylulose`, `D-erythrose` with `D-erythrulose`. These interconvert only by enzymatic or base-catalysed isomerisation and are separately isolable compounds with separate names, separate suppliers and separate biology.
- `alpha-ionone`, `beta-ionone` and `gamma-ionone`, three distinct fragrance compounds, merged into one group.
- `prostaglandin A1`, `prostaglandin B1` and `prostaglandin C1`, three distinct natural products.
- `fukanefuromarin A`, `B` and `C` merged with two named dihydrofuranocoumarins.

A gate that refuses a candidate whenever `Canonicalize` matches a stored row would refuse all of these. On the library's own evidence the false-to-true ratio is 67 to 27. Formal tautomerism is not identity, and `Canonicalize` implements formal tautomerism including the 1,2-enol shift that merges aldoses with ketoses.

Of the 27 genuine groups, **25 have an iminol row whose constitution converts exactly onto a stored amide row** under the `[C:1](=[N:2])[OX2H1:3]>>[C:1](=[O:3])[N:2]` transform and its aromatic lactim equivalent. Named examples, iminol row first: `(R)-/(S)-thalidomide` onto `Thalidomide`; `(R)-/(S)-mosapride` onto `mosapride`; `(S,S)-formoterol` onto `Formoterol` and `arformoterol`; `(R)-atenolol` onto `Atenolol` and `esatenolol`; `(S,S)-labetalol` and three misspelled `labetolol` rows onto `dilevalol`; `lysergamide` onto `Ergine`; `cephapirin` onto `Cefapirin`; `SR 144528` onto `SR-144528`; `2-[4-(piperidin-3-yl)phenyl]-2H-indazole-7-carboxamide` onto `Niraparib`. The two that do not convert are `tartrazine`/`tartrazine acid` and `5-methyltetrahydrofolic acid`/`levomefolic acid`.

In most of these 25 the iminol copy is the stereospecified one and the amide copy is stereo-flat, so the pair is a duplicate only under a rule that treats a flat row as compatible with any specified isomer of it. Some are not duplicates at all once stereochemistry is read: `N-benzoyl-L-arginine` against `N-benzoyl-D-arginine` and `nocardicin E` against `nocardicin F` are genuinely different compounds whose iminol member is simply stored in the artefact form. The measured claim is about constitution, not identity.

## The stereochemistry interaction

`Canonicalize` does not preserve stereochemistry, which rules out running any stereo-sensitive gate on its output. Directly:

```
N[C@@H](CO)C(=O)O   (L-Serine)         -> NC(CO)C(=O)O
N[C@H](CO)C(=O)O    (D-Serine)         -> NC(CO)C(=O)O
O=C1CC[C@@H](...)   ((R)-thalidomide)  -> O=C1CCC(...)
O=C1CC[C@H](...)    ((S)-thalidomide)  -> O=C1CCC(...)
```

D- and L-serine become the same string; both thalidomide enantiomers become the same string. So a gate that canonicalises before comparing cannot tell enantiomers apart, and the stereo-aware duplicate rule must run on the original molecule.

Over the whole corpus, of the 9,735 rows that specify any stereochemistry:

| outcome of `Canonicalize` | rows | share |
|---|---|---|
| tetrahedral and double-bond counts both unchanged | 5,564 | 57.2% |
| at least one tetrahedral centre lost | 3,710 | 38.1% |
| at least one double-bond geometry lost | 626 | 6.4% |
| stereo-stripped structure itself changed | 2,465 | 25.3% |

`Rilpivirine` loses its acrylonitrile `/C=C/`; `Belinostat` has its hydroxamic acid rearranged to the hydroxyimino form, which is why a quarter of rows change even their stereo-stripped structure. The last row is the one that matters most for the duplicate gate: for a quarter of stereo-bearing rows, the canonical tautomer is not a different drawing of the same constitution in the bucketing sense the gate assumes.

## What follows

1. **Normalize the tautomer before computing descriptors**, so TPSA and donor counts stop carrying the artefact into the four rule panels and the barrier estimate. This is the unambiguous fix and it changes no stored row.
2. **Do not adopt a tautomer-identity collision gate keyed on `Canonicalize` equality.** Restrict any tautomer gate to the amide/lactam to imidic-acid/lactim transform, which is the only transform the library's own evidence shows producing duplicates rather than distinct compounds.
3. **Run the stereo-aware duplicate rule on the original molecule**, never on a tautomer-canonical form, and make any tautomer gate fire last and only when the matched row is also stereochemically compatible.
4. **Add a validation gate counting the rows still presenting the artefact**, so the number is measured on every run rather than rediscovered.

The library itself is immutable by design, so none of the 2,020 rows is rewritten. Where a stored structure contradicts its own name, the correction belongs in the identity-correction overlay described in `IDENTITY-CORRECTIONS.md`, with a reviewed witness per correction.
