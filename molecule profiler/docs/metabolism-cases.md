# Metabolism known-answer tests

`tools/metabolism-cases.js` runs the metabolism engine on a fixture set of drugs whose major
metabolites are documented in the literature, and asks a single question of each: does the engine
produce the documented structure at all, and where does it rank it?

Run it with:

```
node tools/metabolism-cases.js            # print the report
node tools/metabolism-cases.js --write    # also regenerate data/metcases.js
```

`data/metcases.js` is what the page reads for the line under the metabolism panel heading. It is
generated; do not edit it by hand.

## Method

For each case the harness holds a parent SMILES, the documented metabolite's SMILES, the route the
literature attributes it to, and a one-line note on that route's standing (dominant, secondary, a
few percent of dose). It then:

1. Parses the parent and runs `metabolicTree(parent, { depth: 2, phases: ['I', 'II'] })` — the same
   call the page makes at its default settings.
2. Canonicalises every product with `metaboliteKey`, the same identity function the engine uses to
   de-duplicate, and canonicalises the documented metabolite the same way.
3. Looks the documented metabolite up by that key, and records whether it was found, its band
   (major / minor / trace against the fixed cuts at 0.10 and 0.02), its rank by weight among all
   metabolites enumerated for that parent, its relative weight, which generation it appeared in, and
   which rule the engine fired to get there.

A case passes the strong form of the test if the documented metabolite lands in the major band, and
the weak form if it is enumerated at all. Both are reported, because they fail for different
reasons: a missing structure is a rule gap, while a structure in the wrong band is a weighting
question.

## What this does not measure

- **It is not a rate test.** The engine's weights are published frequencies for reaction classes,
  not rates for these molecules. A documented metabolite ranking third does not mean it is the third
  most abundant in a person.
- **It is not a false-positive test.** Nothing here penalises the engine for the other 40 to 110
  structures it enumerates per parent. Those are reaction sites the molecule genuinely offers; which
  of them matter in vivo is exactly what this page refuses to claim.
- **Fourteen drugs is a fixture set, not a validation set.** It is large enough to catch missing
  rules for common transformations and too small to characterise coverage.
- **The weights were not tuned to these cases.** Two cases land in the minor band and were left
  there. Tuning a rule weight until a fixture passes makes the fixture meaningless, and the point of
  a known-answer test is to be able to fail.

## What it caught

The first run recovered 11 of 16. Debugging the five misses found one error of mine and four real
rule gaps:

- **Morphine glucuronide** was not a miss at all. The engine had produced it correctly; my reference
  SMILES had the aryl oxygen attached to the wrong glucuronide carbon. Fixture fixed.
- **`N-dealkylation (larger alkyl)`** required `[CH2;!R]`, so a branched alkyl could never be
  cleaved. Propranolol's isopropyl was untouchable. Added
  `N-dealkylation (branched alkyl)`.
- **No amide or lactam N-demethylation rule** existed, so diazepam could not reach nordazepam, the
  textbook case. Added `N-demethylation (amide or lactam)`.
- **No aryl O-dealkylation rule for anything larger than a methyl**, so phenacetin could not lose
  its ethyl to become paracetamol. Added `O-dealkylation (aryl ether, larger alkyl)`.
- **No quinone-imine oxidation**, so paracetamol could not reach NAPQI. Added
  `Para-acylaminophenol oxidation to quinone imine` at a deliberately low weight.

The existing `N-demethylation (aromatic N-methyl)` note was also a copy-paste of the aliphatic
hydroxylation note; corrected.

## The two cases still short of the major band

**Paracetamol to NAPQI**, weight 0.08, rank 5 of 41. This is correct behaviour, not a miss to fix.
NAPQI is a few percent of a therapeutic dose; the glucuronide and sulfate conjugates dominate. The
rule's weight is low because the route is minor, and the route being minor is the pharmacological
point — it is why paracetamol is safe at dose and hepatotoxic in overdose, where the conjugation
routes saturate. Raising the weight to make the fixture pass would misstate the chemistry.

**Caffeine to paraxanthine**, weight 0.09, rank 3 of 12. This one is a genuine limitation. CYP1A2
N3-demethylation is about 80% of caffeine clearance in people, and the engine reaches paraxanthine
through a generic aromatic N-methyl demethylation rule carrying a class frequency of 0.09. The
engine has no way to know that this particular methyl on this particular xanthine is the one CYP1A2
prefers; that is isoform-specific substrate knowledge, which is exactly what this page declines to
fake. The honest outcome is a minor band and a note saying why.

## Current report

```
metabolism known-answer cases, 2 generations, phase I and II
  16 documented metabolites across 14 drugs
  enumerated at all: 16/16
  in the major band: 14/16
  inside the top five by weight: 15/16

  MAJOR Aspirin       -> Salicylic acid                    rank   1 of 50   weight 0.7000  gen 1  Esterase, Aryl ester hydrolysis
        documented: ester hydrolysis by carboxylesterase and plasma esterases — dominant: essentially all absorbed aspirin is deacetylated
  MAJOR Codeine       -> Morphine                          rank   4 of 67   weight 0.2200  gen 1  CYP, O-demethylation (aryl methyl ether)
        documented: CYP2D6 O-demethylation — minor by mass but the analgesically decisive route
  MAJOR Codeine       -> Norcodeine                        rank   2 of 67   weight 0.2400  gen 1  CYP, N-demethylation (tertiary amine)
        documented: CYP3A4 N-demethylation — documented secondary route
  minor Paracetamol   -> NAPQI                             rank   5 of 41   weight 0.0800  gen 1  CYP2E1, CYP3A4 or peroxidase, Para-acylaminophenol oxidation to quinone imine
        documented: CYP2E1 and CYP3A4 oxidation — a few percent of dose, and the reason overdose is hepatotoxic
  MAJOR MDMA          -> MDA                               rank   1 of 87   weight 0.2800  gen 1  CYP, N-demethylation (secondary amine)
        documented: CYP2D6 and CYP1A2 N-demethylation — documented, about a tenth of the dose
  MAJOR MDMA          -> HHMA                              rank   3 of 87   weight 0.2600  gen 1  CYP, Methylenedioxy ring opening
        documented: CYP2D6 O-demethylenation — the dominant route; HMMA is its O-methylated product
  MAJOR Diazepam      -> Nordazepam                        rank   1 of 44   weight 0.1800  gen 1  CYP, N-demethylation (amide or lactam)
        documented: CYP2C19 and CYP3A4 N-demethylation — dominant first-pass route
  MAJOR Propranolol   -> N-desisopropylpropranolol         rank   9 of 119  weight 0.1400  gen 1  CYP, N-dealkylation (branched alkyl)
        documented: CYP1A2 N-dealkylation — documented route alongside ring hydroxylation
  MAJOR Amitriptyline -> Nortriptyline                     rank   1 of 61   weight 0.2400  gen 1  CYP, N-demethylation (tertiary amine)
        documented: CYP2C19 and CYP3A4 N-demethylation — dominant, and an active drug in its own right
  minor Caffeine      -> Paraxanthine                      rank   3 of 12   weight 0.0900  gen 1  CYP, N-demethylation (aromatic N-methyl)
        documented: CYP1A2 N3-demethylation — about 80% of caffeine clearance
  MAJOR Nicotine      -> Nornicotine                       rank   1 of 44   weight 0.2400  gen 1  CYP, N-demethylation (tertiary amine)
        documented: CYP2A6 N-demethylation — minor; cotinine, the dominant route, needs an oxidation this engine does not carry
  MAJOR Ibuprofen     -> Carboxyibuprofen precursor (2-hydroxyibuprofen)rank   5 of 68   weight 0.1125  gen 1  CYP, Aliphatic hydroxylation (tertiary C-H)
        documented: CYP2C9 hydroxylation — documented oxidative route
  MAJOR Phenacetin    -> Paracetamol                       rank   3 of 29   weight 0.1400  gen 1  CYP, O-dealkylation (aryl ether, larger alkyl)
        documented: CYP1A2 O-deethylation — dominant; this is why phenacetin was an analgesic
  MAJOR Tamoxifen     -> N-desmethyltamoxifen              rank   2 of 113  weight 0.2400  gen 1  CYP, N-demethylation (tertiary amine)
        documented: CYP3A4 N-demethylation — the dominant circulating metabolite
  MAJOR Valproic acid -> Valproate glucuronide             rank   1 of 43   weight 0.1200  gen 1  UGT, Acyl glucuronidation
        documented: UGT glucuronidation — dominant, roughly half the dose
  MAJOR Morphine      -> Morphine glucuronide              rank   2 of 87   weight 0.2500  gen 1  UGT, Aromatic O-glucuronidation
        documented: UGT2B7 glucuronidation — dominant; the 3- and 6-glucuronides together are most of the dose
```
