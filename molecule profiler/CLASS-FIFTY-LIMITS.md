# Where the fifty-reference class target stops

The fifty-reference-per-class target is met where a reference class is a structural family: a set of compounds sharing a scaffold that externally sourced rows attest, so that a new member's structure can be derived by differential against an anchor and then rebuilt by an independent inverse check. Where a class is instead a pharmacological grouping, the target is not reachable by any method this project is willing to use, and the class stops where the documented compounds stop. `LIBRARY-TAXONOMY.md` already records that reference-class labels are historical dataset classifications describing pharmacology, use, chemistry or provenance, and do not establish verified activity; this document records what that means for the fifty-reference target.

A maximum-common-substructure census over every library row, run without reference to the `cls` field, separated the two cases. Of the 58 classes then under fifty references, 13 were structural families and 45 were not. The census had to be run cls-blind because the `cls` view hides family members: Sulfonylurea showed 2 rows under its own class against 31 across the library, and Penicillin 12 against 54, so in-class counts understate family size by as much as fifteenfold and are the wrong measure of what a class can reach.

## Classes closed at a measured ceiling

These are genuine families, but the family is smaller than fifty once collisions with existing rows are removed. Each number is a measured ceiling rather than a convenient stopping point.

| class | rows | why it stops |
|---|---|---|
| beta-Carboline | 33 | 101 skeleton hits library-wide, of which 83 are ring-fused onto the core and so unreachable by substitution; 16 sourced anchors across three oxidation states attested 14 site-value pairs, of which 15 of 47 candidates collided |
| Penicillin | 18 | family is 54 library-wide; the remaining variants collide on name or on stereo-stripped structure |
| Sulfonylurea | 14 | 20 combinations are attested at both sites by sourced anchors, of which 8 collide |
| Thiazolidinedione | 2 | two strict anchors, whose substituent arms are entire library rows, so every generable candidate rebuilds an anchor |
| Benzodifuran | 12 | family is 12 library-wide |
| Bisphosphonate | 8 | family is 8 library-wide |
| Oxicam | 8 | family is 8 library-wide |

Thiazolidinedione is the opposite case to Bisphosphonate: the family is not too small, the proof is. Eight library rows carry a saturated C5 on the 2,4-dione core, three of them externally sourced, but one of those three is stored as its 4-hydroxy-2-oxo enol tautomer and so fails canonical identity against the name it is filed under, leaving two anchors. Both anchors' C5 arms are indivisible whole fragments rather than decomposable substituents, so the attested slot table has exactly two values and both candidates it generates reconstruct the anchors they came from. The N3 site was refused outright at zero anchors: the only N3-substituted sourced rows sit on the 2-thioxo rhodanine core, and moving a substituent from one core to another is the cross-site reuse an earlier audit of nine Beta blocker rows recorded as a defect. The honest growth path for this class is not derivation but reclassification of the real thiazolidinediones already held under catch-all provenance classes, which would take the class to five and requires the identity-correction overlay rather than an edit to the library.

The enol-tautomer storage form is worth recording beyond this one class. A strict SMARTS census of a carbonyl-bearing core silently misses rows stored as the corresponding enol or iminol, so a family can measure smaller than it is for reasons that have nothing to do with the family. Censuses behind the numbers above were run with tautomer-tolerant queries for that reason.

Bisphosphonate is worth singling out. An earlier survey ranked it fourth of forty-four candidate classes at a score of 7.00, and that score was read as a queue position. It measured anchor availability, not family size, and the census found the family has eight members in total. A class cannot be grown past the size of its own family, so the survey was answering a different question than the one it was being used to answer.

## Classes that are not structural families

For the remaining 45, the census found a maximum common substructure of one atom, of nothing at all, or of a bare benzene ring. A bare benzene ring matches more than twelve thousand library rows, so it establishes no family: treating a six-atom common substructure as one produced counts such as fourteen thousand anticoagulants before the threshold was raised to eight heavy atoms.

Membership in these classes rests on pharmacological activity, which is the kind of claim the derivation method exists to avoid making. The method proves structure, by differential against an anchor that shares a scaffold, and checks the result by rebuilding it from its name through independently written code. It cannot prove that a compound is an antidepressant. Enumerating plausible members from recall would put unverifiable pharmacological claims into a reference library, so these classes grow only when a documented compound is imported with its source, and they are not padded to reach fifty.

Affected: Amino acid, Alkylating agent, Antiarrhythmic, Statin, Antimalarial, Antidiabetic, Antibiotic, Antidepressant, Metabolite, Angiotensin receptor blocker, Vitamin, Fenamate, Dihydropyridine reference, Antipsychotic, Antiandrogen, Immunomodulator, Cholinergic ester, Stimulant, Antihypertensive, Antiparasitic, Natural product, Alkaloid, Urological, Antineoplastic, Carbonic anhydrase inhibitor, Antiemetic, Aromatic hydrocarbon, Heterocycle, Vasodilator, Antiparkinson, COX-2 inhibitor, Anaesthetic, Cholinergic, Solvent, Antiseptic, Dopamine agonist, Retinoid, Anticoagulant, PARP inhibitor, Hypnotic, Antiplatelet, Uricosuric, Nucleobase, Dopamine transporter ligand, Cholinesterase reactivator.

Four of these are near-empty taxonomy stubs rather than classes anyone would browse: Solvent with 6 rows, Heterocycle with 8, Aromatic hydrocarbon with 8 and Natural product with 10. They describe provenance or bulk chemistry rather than a family, and retiring them would be more honest than carrying them as permanent shortfalls.

## How this differs from the tag expansion

`LIBRARY-50-EXPANSION.md` describes a fifty-per-tag target on a different axis, structural tags rather than reference classes, and met it purely by import: its shortfalls were retained rather than generating molecules. The class work described here does derive structures where a family and its anchors exist. The two policies are not in conflict, because they rest on what can be proved in each case. A structural tag is a SMARTS pattern, and a row either matches it or does not, so generating a row to satisfy a tag would be circular: the tag count would measure the generator rather than the library. A structural family instead supports a derivation that can be checked against sourced anchors and re-derived independently from the name, so a derived row carries a proof that a tag-satisfying row would not. Where no such proof is available, as in the 45 classes above, this document applies the same answer the tag expansion did, and retains the shortfall.

## What a derived row claims

A derived row is a defined structure carrying a systematic name. It is not a claim that the compound has been synthesised, tested, or has any pharmacological activity, and a systematic name is not evidence that anyone has reported the compound. Derived rows exist to populate the structural neighbourhood that similarity retrieval searches, which is why a class of documented drugs and a class of derived structures serve that purpose equally well and are not interchangeable for any other purpose.

Each batch's commit message records the anchors proved, the sites refused and the full gate accounting, so the ratio of documented to derived rows in any class is recoverable from the history rather than having to be taken on trust.
