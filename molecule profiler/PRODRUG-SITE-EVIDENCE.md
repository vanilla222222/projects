# Molecule sites: reference evidence and selected-site designs

Any molecule successfully parsed by the profiler can now be displayed under **Current input molecule** in this section, including inputs outside the reference set. Every input atom can be selected and highlighted. Element, charge, graph-neighbor count and hydrogen count are structural observations only; unknown inputs receive no documented activation claim. Charged structures and disconnected parsed inputs are available for inspection too. Reference-class filters do not hide the current-input option.

The user can explicitly mark the current input as theoretical/unvalidated. A prominent red banner states **THEORETICAL ONLY — experimental testing required**, with no biological-conversion claim. This label is recorded as `inputStatus` in the selected-site snapshot and resets for a different input. The checkbox labels the input only. Generated attachments have their own always-visible theoretical-design label.

The Prodrugs tab includes a separate reference-site viewer for valacyclovir, enalapril, capecitabine and parecoxib. Filter ester, amide and carbamate examples separately, select a reference, select an atom, and check its evidence. The selected reference atom is highlighted in the structure. Atom numbers follow that reference SMILES parse order, not IUPAC locants or the atom order of another input.

The reference viewer filters existing compound-specific relationships. A separate selected-input builder generates structural hypotheses without transferring that reference evidence. Exact input/reference graph matches include charge, hydrogen counts, isotope and resolved stereochemistry. Unknown queries default to their own structure and may inspect references independently, with an explicit warning that reference evidence does not apply to their molecule. Reanalysis replaces prior selections/evidence. Selecting an unannotated reference atom returns unsupported rather than borrowing evidence from another position. In Current input mode all selected atoms are structural observations, even when a named reference is also available; inspect that reference separately for its curated annotation.

Relationship evidence and structural annotations have different labels. The highlighted atom is an annotation of a known reference functionality, not proof that a single cleavage there releases the final active compound. In particular, capecitabine activation is multistep. No individual conversion speed, completeness, exposure or therapeutic benefit is inferred. The latest selected-site report is available as `PharmacologyUI.getSnapshot().prodrugSiteEvidence`; it is cleared on a changed selection until checked again.

Sources, also linked in the UI:

- NCI, valacyclovir hydrochloride: https://www.cancer.gov/publications/dictionaries/cancer-drug/def/valacyclovir-hydrochloride
- NCI, enalapril maleate: https://www.cancer.gov/publications/dictionaries/cancer-drug/def/enalapril-maleate
- NCI, capecitabine: https://www.cancer.gov/publications/dictionaries/cancer-drug/def/capecitabine
- EMA, Dynastat scientific discussion, introduction: https://www.ema.europa.eu/en/documents/scientific-discussion/dynastat-epar-scientific-discussion_en.pdf

The added amide case is specifically parecoxib's N-acylsulfonamide relationship to valdecoxib. It is not a general rule for amide cleavage or amine derivatization. The displayed neutral structures reuse the repository reference-library records for Parecoxib and Valdecoxib (PubChem CIDs 119828 and 119607); EMA's product assessment concerns parecoxib sodium. No salt-equivalence match is inferred from the neutral graph.

The original three reference structures come from the existing `data/pharmacology-evidence.js` records, which carry their original PubChem structure links. A structural guard withholds an annotation if its expected atom and adjacent carbonyl no longer match. This small annotation set is not a general metabolism map.

Validation uses a focused DOM test covering reference availability, correct highlighting, supported and unsupported atoms, stale-state clearing and multistep evidence labels. No broad model or browser regression is required for this isolated viewer.


## Selected-site attachment builder

Choose **Design on current input**, then use **Compatible attachment site** or
the full atom menu. Supported sites are labelled by atom and functional group.
Choose a template and select **Preview selected design**. The builder can target
any compatible site, including sites beyond the automatic five-candidate list.
It never falls back to a different atom if a selected site or template is invalid.

Supported classes include alcohol/phenol O-acyl and phosphate attachments,
acid/carboxylate esters, primary/secondary amine acyloxymethyl carbamates, tertiary
amine N-oxides, and thiol/thiolate S-acyl thioesters. The added sulfur precedent
is alacepril deacetylation to desacetyl-alacepril in rat studies:
https://pubmed.ncbi.nlm.nih.gov/3513776/. This does not claim that the displayed
S-acyl derivative converts in humans or that one deacetylation releases captopril
from alacepril; the documented alacepril pathway is multistep.

The preview highlights the attachment bond using indices from the generated
SMILES parse, and shows the structurally recovered parent separately. The
highlight is not necessarily the initiating biological cleavage bond: an amine
carbamate, for example, has a terminal ester trigger and a proposed fragmentation
cascade. Graph recovery is checked against the complete supplied parent, including
charge, isotopes and supported stereo. No atom or bond is made biologically
cleavable merely by selection. Unsupported scaffold atoms remain selectable for
inspection, with a reason that no compatible design is available.

The preview includes the class source, activation hypothesis, charge-bookkeeping
scope and limitations. It supports **Analyze this design** and SMILES download.
`PharmacologyUI.getSnapshot().prodrugSiteDesign` records input SMILES, selected
input atom, template ID and the complete candidate. Input, reference, atom and
template changes clear stale previews and design snapshots. The existing
`prodrugSiteEvidence` report remains distinct from generated hypotheses.

Validation: 89 focused generator checks, 17 selected-site builder DOM checks,
21 reference-viewer checks, and independent RDKit checks on 112 candidates from
26 neutral/charged/isotopic/chiral parents. Browser visual layout was not verified.


## Compatibility expansion

The builder additionally recognizes pyridine-like aromatic nitrogens,
carbonyl-linked amide/lactam/imide N–H sites (including compatible N-anions),
and phenolate/alkoxide forms of supported oxygen sites. Aromatic N-oxide
hypotheses are separate from tertiary aliphatic amine N-oxides. Carbonyl-linked
N–H sites offer hydroxymethyl, acetoxymethyl, propionyloxymethyl and
phosphoryloxymethyl linker hypotheses. These are class extrapolations from
hydantoin/imide work; availability in this builder does not establish biological
conversion from a different amide, lactam, urea or carbamate. Their possible
formaldehyde release, equilibrium and competing reactions remain unassessed.
Pyrrole-like aromatic N–H, permanently quaternary nitrogen and unsupported
chemistry are not opened by these rules. Directional alkene stereo remains gated.

Additional primary precedents:
- Varia et al. (1984), phenytoin hydroxymethyl ester/phosphate prodrugs:
  https://pubmed.ncbi.nlm.nih.gov/6548518/
- 1980 hydantoin study, N-hydroxymethylation and amide/imide comparison:
  https://www.sciencedirect.com/science/article/pii/0378517380900514
- Aromatic N-oxide class precedent (Siim et al., 2000):
  https://pubmed.ncbi.nlm.nih.gov/10974206/

One organic component plus recognized monatomic Li/Na/K/Mg/Ca or halide
counterions can now be used for design when the full input is charge-balanced.
Counterion omission is reported in the builder and export snapshot, the organic
parent keeps its supplied charge state, and selected atom numbers still refer to
the original input. Preview recovery verifies that organic component, never the
complete salt. Neutral solvates, organic counterions, multiple organic components,
complex ions, unbalanced mixtures and unsupported elements remain excluded from
this normalization policy. Parsed mixtures still remain available for inspection.

Regression checks cover all new site classes, exact recovery, charged and chiral
salt inputs, original atom-index mapping and spectator rejection. Optional RDKit
checks validate 159 candidates across 38 parents, including candidate attachment
bond indices and recovery of the original organic component for normalized salts.


Coverage benchmark against `60699dbe`: the fixed 200 evenly spaced library
entries generated at least one candidate for 139 inputs before and 158 after
(19 gained, zero lost). Reproduce with
`node tools/prodrug-coverage-benchmark.js 60699dbe` when baseline history is
available. This measures enumerator coverage only, not biological validation or
whole-library coverage. Focused checks: 117 generator, 24 builder DOM, 21 reference
viewer and 16 PK/prodrug interface checks, plus existing analogue UI integration.
