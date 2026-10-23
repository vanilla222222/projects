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

Choose **Design on current input**, then use **Compatible site** or
the full atom menu. Supported sites are labelled by atom and functional group.
Choose a template and select **Preview selected option**. The builder can target
any compatible site, including sites beyond the automatic Quick candidate list.
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
chemistry are not opened by these rules. Specified alkene geometry is retained when full graph serialization checks succeed.

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


## Existing oxygen–carbon groups and other cleavage explorations

The same compatible-site menu now offers existing-group transformations alongside
new attachment designs. A benzene/aryl–O–alkyl ether (for example anisole,
`COc1ccccc1`) exposes an **Explore O-dealkylation** option at its ether oxygen or adjacent ether-bond carbons. Each option names the proposed input bond(s), and the preview highlights the bond(s) actually changed.
The preview shows hypothetical phenol and formaldehyde products. Ethyl ethers
yield an aldehyde hypothesis; an eligible secondary alkyl carbon yields a ketone.
Aliphatic, benzyl and cyclic ethers are also recognized when the attacked carbon
is saturated and bears an alpha hydrogen. A tertiary alkyl carbon without that
hydrogen, a diaryl ether, peroxide or unsupported graph is not assigned this
oxidative route. Competing ring oxidation or other metabolism may dominate.

Additional classes: esters/lactones, carbonates, carbamates, thioesters,
acetals/ketals (including methylenedioxy ring systems), and disulfides. Ester and
thioester previews show formal hydrolysis products. Carbonate/carbamate previews
stop at the first hydrolysis products; an intermediate is not assumed to complete
a fragmentation cascade. Acetal previews are chemical hydrolysis hypotheses with
no general physiological pH or rate claim. Disulfide previews show formal thiol
ends without assuming subsequent payload release. All product equivalents are
retained, including duplicate products of a symmetric cleavage.

These are transformations **of the input into different products**, not
parent-regenerating attachments to that input. They are recorded separately as
`PharmacologyUI.getSnapshot().prodrugSiteCleavage`, with `inputRegenerated:false`.
The original `prodrugSiteDesign` remains reserved for attachment designs checked
against their supplied parent. Changing input, site, mode or template clears both
previews. Reference evidence remains independent from either hypothesis type.

Each product has an **Analyze this product / explore its attachment sites**
button. For example, analyzing the phenol exposed from an aryl ether makes its
free OH available for the existing ester/phosphate attachment generator. Product
SMILES can also be downloaded. No product is ranked as the active species.

Input bonds are highlighted using original atom indices; recognized-counterion
normalization is carried through in the snapshot and limitations. Oxidation of a
reacting tetrahedral carbon to a planar carbonyl explicitly removes its prior
stereo tag and records this change. Remote supported stereo and isotope labels
are retained; any added oxygen is formal reaction input, not an experimentally
assigned oxygen-isotope origin.

Primary class sources, also linked with each preview:
- Ether oxidation in rat liver microsomes: https://pubmed.ncbi.nlm.nih.gov/1492425/
- Ester prodrug hydrolysis: https://pubmed.ncbi.nlm.nih.gov/24179032/
- Carbonates/carbamates: https://pubmed.ncbi.nlm.nih.gov/8234176/
- Phenolic carbamate prodrugs: https://pubmed.ncbi.nlm.nih.gov/17268110/
- Thioester deacetylation: https://pubmed.ncbi.nlm.nih.gov/3513776/
- Acetal drug-delivery linkages: https://pubmed.ncbi.nlm.nih.gov/15546191/
- Releasable disulfide conjugates:
  https://www.sciencedirect.com/science/article/abs/pii/S0223523415301252

Validation: 51 focused pathway checks; 15 UI checks including ether-to-phenol
analysis, exposure of new OH attachment sites, stale-state clearing and reference
separation; independent RDKit product sanitization, atom/isotope conservation and
net reaction bookkeeping for 28 pathways across 20 inputs. The optional command
is `python tools/cleavable-groups-rdkit-test.py`. These are structure and interface
checks, not validation of biological occurrence. Browser visual layout was not
verified.


## Carbonyl designs and additional existing-group pathways

Aldehyde and ketone **carbonyl carbons** now offer two formal condensation
designs: oxime and hydrazone. The reverse C=N hydrolysis graph is checked against
the complete input parent. Carboxylic acids, esters, amides and other acyl
derivatives are not treated as aldehydes/ketones by these rules. Carbonyl oxygen
isotope labels block this design class because condensation removes the original
oxygen; the generator must not claim to preserve its isotope identity. Remote
isotopes and supported stereo remain subject to existing round-trip checks.
E/Z configurations of the new C=N linkage are unassigned, and hydrolysis may be
slow, reversible or biologically irrelevant. Hydroxylamine/hydrazine-derived
byproducts are not evaluated for safety. An identity check is not isotope tracing
or validation of in-vivo release.

Existing **imines, oximes and hydrazones** now offer formal C=N hydrolysis previews
showing carbonyl and nitrogen-containing products. Compatible iminium forms retain
the supplied nitrogen charge; solution speciation is not predicted. Amidines,
nitriles, aromatic ring C=N and unsupported stereochemical states are excluded
from those rules. Oxime hydrolysis is not assumed to be as fast as hydrazone or
imine hydrolysis. Primary reaction-class references:
- Hydrolytic Stability of Hydrazones and Oximes:
  https://pmc.ncbi.nlm.nih.gov/articles/PMC2743602/
- NMR studies of imines in aqueous solution:
  https://www.sciencedirect.com/science/article/pii/0022236474901541

Existing **phosphate esters** can preview one P–O–carbon ester hydrolysis at a
time, exposing an alcohol/phenol and a phosphate-containing fragment. Neutral
and compatible anionic phosphate forms and recognized counterion salts are
handled without changing their supplied charge state. P–N phosphoramidates,
P–C phosphonates, sulfates and explicitly chiral phosphorus are outside this
rule. No phosphatase, pKa, rate or complete cascade is predicted. Primary
reference: https://pubmed.ncbi.nlm.nih.gov/8429495/.

Existing tertiary-amine and pyridine-like **N-oxides** can preview formal
reductive deoxygenation to the nitrogen parent and water. The formal reduction
adds two hydrogen atoms, preserves total charge and retains any existing oxygen
isotope in the water product. No enzyme, oxygen dependence or activity is
predicted. Primary class precedent: https://pubmed.ncbi.nlm.nih.gov/10974206/.

The **Explore** filter separates **Parent-recovery designs** from
**Existing-group pathways**, or shows both. Changing the filter clears stale
previews and selects a compatible site where available. A changed input resets
the filter to all options. The filter changes only visible options and does not
change chemistry or assign evidence.

Validation: 130 generator checks, 72 pathway checks and 25 combined workflow DOM
checks, alongside the existing interface regressions. Independent RDKit checks
cover 176 derivative candidates from 45 parents (including carbonyl condensation
atom/charge bookkeeping and exact recovery), and 44 transformation pathways from
33 inputs (including charge, isotope and net atom bookkeeping). Browser visual
layout was not verified.


The fixed 200-reference derivative-generation benchmark against `a6417075`
increased from 158 to 167 inputs generating at least one derivative (nine gained,
zero lost). Reproduce with
`node tools/prodrug-coverage-benchmark.js a6417075` with that baseline available.
This count concerns derivative generation only; it excludes the separate
existing-group pathway previews and is not a biological-validation result.


### Specified double-bond compatibility (2026-10-23)

The selected-input prodrug builder, existing-group pathway explorer and analogue
builder no longer reject every input containing directional SMILES markers.
The shared writer retains bond direction relative to traversal, including
branches and opposite ring-closure endpoints. Complete graph round trips remain
required; this expands serialization coverage rather than weakening chemical
site eligibility. New oxime/hydrazone geometry remains unassigned. Hydrolysis of
a specified reacting C=N explicitly records consumption of its geometry;
unchanged remote double bonds retain their supplied configuration. Unused
direction markers are removed after cleavage without dropping shared markers
that still describe an adjacent double bond.

Validation: 133 prodrug and 74 existing-group focused checks; 27 pathway UI
checks; independent RDKit checks for 218 designs across 54 parents, 51 pathways
across 39 inputs, and 54 directional serialization/analogue outputs. Directional
fixtures cover reversed edges, reordered atoms, both isomers, branches, ring
closures, conjugation, salts and combined tetrahedral/double-bond stereo.
The deterministic 200-library-entry generation sample increased from 167 to 169
compatible entries against commit 519cfbbf, with zero losses. This is structural
coverage only, with no new biological cleavage, activity or ADME validation.

Serialization convention: OpenSMILES section 3.8.3,
https://opensmiles.org/opensmiles.html#_cis_trans_configuration_of_double_bonds

Run `node tools/directional-smiles-test.js` and, with RDKit installed,
`python tools/directional-smiles-rdkit-test.py` for the dedicated regression set.

### All-atom explorer, release routes and comparisons (2026-10-23)

The selected-input explorer scans every input atom, including explicit reasons
for uncovered environments, whole-input eligibility failures and omitted
recognized counterions. Supported option counts describe rule coverage; they
are not scores for likely cleavage or clinical benefit. Selecting a scan row
updates the existing atom and site controls. Generated site options are labelled
reaction-class hypotheses; exact documented compound relationships remain in
the separate reference viewer and are not transferred to generated designs.

A shortlist compares up to 12 distinct graph-checked derivatives across sites
against the input organic component. It reports MW, TPSA, strict HBD/HBA,
rotatable bonds, formal charge and estimated WLOGP, with numerical differences
from the parent. Salts explicitly use the normalized organic component as the
baseline. No direction of descriptor change is called an ADME improvement.
Property CSV and SMILES exports support external research; these are local
calculations, not SwissADME calculations or an automatic SwissADME submission.

The release-step explorer starts from a generated derivative or an existing-group
preview. Users choose a fragment and an available next rule; the engine does not
select a dominant pathway or designate an active fragment. All product equivalents
retain separate IDs, and previous intermediates remain in the step history.
Exploration is bounded to four steps, supports undo, and exports the full route
with sources, limitations and formal additional inputs. A target-parent indicator
uses exact isotope, charge and supported stereo identity. Its success is a
structural observation; protonation differences can prevent a match and are not
silently neutralized. Changing the site, template, mode, reference or input
clears the previous route. A new analysis clears the comparison shortlist.

Two restricted fragmentation classes expose continuation steps: an uncharged
N-hydroxymethyl group on a carbonyl-linked nitrogen, or a hydroxymethyl O linker
on a carbamate, can formally release formaldehyde and an N–H/O–H fragment;
a neutral carbamic acid can formally release amine and carbon dioxide. These
rules require an exposed OH intermediate. They do not apply directly to a
protected ester trigger or a generic methyl ether/amine. Individual previews
retain all fragments and pass valence and full-graph serialization checks.
No physiological rate is assigned. In particular, N-hydroxymethyl amides can
be too stable for useful release; offering a formal step does not establish
practical bioreversibility.

Primary class precedents and stability limits:
- Alexander et al. (1988), acyloxyalkyl carbamate amine prodrugs:
  https://pubmed.ncbi.nlm.nih.gov/2892933/
- Varia et al. (1984), hydroxymethyl phenytoin ester hydrolysis:
  https://pubmed.ncbi.nlm.nih.gov/6548518/
- N-(hydroxyalkyl) amide decomposition and limitations:
  https://www.sciencedirect.com/science/article/pii/0378517384900449

Validation: `tools/prodrug-explorer-test.js` covers all-atom reasons, charge/salt
scope, strict-count comparison, deduplication, immutable route extension,
isolated fragment equivalents, invalid/stale choices, the four-step limit and
complete amine/N–H linker cascades. `tools/prodrug-explorer-ui-test.js` checks
scan selection, filters, shortlist persistence across sites and reset across
inputs, downloads, three-step release, undo, reference separation and stale
route clearing. `tools/prodrug-explorer-rdkit-test.py` independently checks
20 steps across eight complete cascades for product sanitization, charge and
atom/isotope conservation (including formal hydrolysis water), exact final
parent identity, remote E/Z/tetrahedral stereo, and all four terminal fragments
of the amine-carbamate cascade. These checks validate structure bookkeeping,
not biological activation.

### Research-priority review (2026-10-23)

The comparison shortlist now has an explicit **Review shortlist** action. Up to
12 designs are reviewed, one per browser event-loop turn, with separate columns
for evidence provenance, formal route coverage, other route-frontier products,
property deltas and other matched sites. Each criterion sorts independently;
there is no combined score or implied ranking of clinical benefit. Unknown
numeric values remain last in either sort direction. A route-coverage filter
and full JSON export preserve the selected view in the pharmacology snapshot.

An exact curated-pair label requires both the candidate and supplied parent
organic graphs to match an existing documented relationship, including isotope,
charge and supported stereo. Candidate-only matches, another ester position,
mirror images and class references do not qualify. A generated structure remains
experimentally unvalidated by this software even when it matches a documented
compound pair. Sources and provenance scope remain visible for every entry.

Route review uses breadth-first exploration bounded to four steps, 32 visited
states and 96 attempted extensions per design. A found route is one implemented
formal sequence to the exact supplied parent state, not a predicted preferred
biological activation sequence. The first found route need not complete the
breakdown of other fragments. Products at its parent-reaching frontier may
still be intermediates; earlier products and sources remain in the inspectable
route history. Search exhaustion and missing rules are explicit unresolved
states. Protonation steps are not invented to force parent recovery. Every
reviewed candidate is independently checked against the current parent before
being assessed; failed entries are excluded with reasons.

The concern catalog covers four chemical species, reviewed 2026-10-23:
formaldehyde, methanol, hydrazine and hydroxylamine. It matches whole product
graphs, not substructures; isotopic labels are ignored only for the concern
lookup, with isotope-specific effects explicitly unassessed. Charge is retained.
All product structures and formal equivalents remain unchanged in the report.
An unlisted product is unknown, not safe. An unresolved route has unknown
products/concern counts, not zero concerns. Counts describe distinct catalog
matches rather than hazard severity. Occupational/chemical hazard sources do
not establish patient exposure, conversion, a dose threshold or individual risk.

Primary agency publications for this limited concern catalog:
- NIOSH, Formaldehyde: https://www.cdc.gov/niosh/npg/npgd0293.html
- NIOSH, Methyl alcohol: https://www.cdc.gov/niosh/npg/npgd0397.html
- NIOSH, Hydrazine: https://www.cdc.gov/niosh/npg/npgd0329.html
- ILO/WHO, Hydroxylamine ICSC 0661:
  https://chemicalsafety.ilo.org/dyn/icsc/showcard.display?p_card_id=0661&p_lang=en&p_version=1

Other parent attachment handles use original input atom numbers. Other candidate
transformations are distinct implemented rule/cut-bond matches excluding the
first step of the found route, when available. Same-kind parent handles and
same-class alternative first steps are retained separately in JSON. These counts
are coverage observations, not predictions of competition or selectivity.
Property deltas use the existing comparison engine's normalized parent baseline;
WLOGP remains estimated. No direction of change implies improved ADME.

Shortlist changes invalidate old reviews. A new analysis also resets sort and
route filters. Pending review work is cancelled by an epoch check when the
shortlist/input changes, preventing old results from appearing on a new input.
A selected reviewed route can be opened in the existing release-step explorer.

Validation: `tools/prodrug-priority-test.js` checks exact-pair provenance,
wrong-position/stereo/candidate-only negatives, missing sources, unresolved
charge states, catalog identity, alternative-site counts, deduplication,
independent criteria sorting, unknown-last ordering and route-search bounds.
`tools/prodrug-priority-ui-test.js` checks explicit review, source links,
unknown-product text, sorting/filtering, inspectable routes, JSON/snapshot view,
stale-review invalidation, input-change cancellation and reference separation.
`tools/prodrug-priority-rdkit-test.py` independently checks eight automatically
found routes (nine steps), exact final parent stereo/isotope identity, formal
atom/charge bookkeeping and every reported remaining product equivalent.
These are structure and interface checks, not validation of a priority model,
biological release, safety or efficacy.

### Quick candidates: 25 designs across up to five positions (2026-10-23)

Quick candidates now request 25 distinct single-site structural designs. The
sampler prefers positions with at least five available templates, allocates five
successful distinct candidates per position across up to five positions, then
fills unused capacity from those selected positions. With fewer than five usable
positions, remaining slots are distributed across the available positions. Other
positions are considered if a position cannot supply a distinct valid design.
Positions use original input atom numbers, including when recognized counterions
are omitted. Symmetry-equivalent edits are deduplicated by full molecular graph,
so equivalent positions can expose different promoiety choices rather than
repeated structures. No simultaneous multi-position substitutions are generated.

The expanded profile adds acyl and alcohol-side ester variants, related trigger
variants for amine carbamates and N–H linkers, thioesters, O-substituted oxime ethers,
and substituted hydrazones. They stay within the existing reaction classes and
reuse class-level sources; those sources do not validate every new promoiety.
New promoiety stereochemistry remains unassigned. Carbonyl reversal removes the
complete N–O/N–N branch and restores the original unlabeled carbonyl oxygen;
isotope-labelled carbonyl oxygen remains excluded as before. Product valence,
round-trip stereo/isotope identity and exact structural parent recovery checks
remain required. These checks are structural, not evidence of physiological
cleavage, useful conversion, synthesis selectivity, improved delivery or safety.

Sampling is bounded to 25 outputs, five positions and 300 attempted edits.
`ProdrugCandidates.generateQuick(parent)` exposes the expanded profile, while
`generate()` keeps its default five-output bound and the selected-site builder
keeps its compact template menus. A limited class such as a tertiary amine
N-oxide can still yield fewer than 25 designs when no other compatible position
is available; the UI and JSON report the shortfall instead of padding duplicates
or introducing unsupported attachment classes. The sampling export records the
target, per-position counts, attempts and unfilled slots.

The Quick candidates view groups cards in position disclosures, showing counts
per position and opening the first group by default. Every design retains its
SMILES, analysis handoff, activation hypothesis, parent recovery and source/limit
disclosures. Pharmacology JSON includes the complete set of generated designs.

Primary carbonyl-class reference (includes methoxyamine-derived oxime and alkyl/
acyl hydrazones, with strongly variable hydrolytic stability):
https://pmc.ncbi.nlm.nih.gov/articles/PMC2743602/
All other expanded classes retain the class sources already documented above.

Validation: `tools/quick-candidates-test.js` checks 25-output generation across
oxygen, acid, amine, sulfur, N–H linker and carbonyl classes, five-by-five quotas,
full-capacity site preference, redistribution, graph deduplication, charge/salt
indices, stereo/isotope handling, truthful shortfalls and preservation of compact
builder limits. `tools/quick-candidates-rdkit-test.py` independently checks 425
Quick structures across 17 inputs for sanitization, canonical distinctness,
attachment indices and recovered parent isotope/stereo/charge identity, including
an independent graph reversal for substituted carbonyl derivatives. UI tests
cover 25 cards and handoffs, position grouping and original salt atom numbering.


### Ester-triggered ether redesigns — 2026-10-23

The site builder now offers a separate **Ester-triggered ether redesigns** filter. Methoxy, eligible acyclic primary/secondary alkoxy and benzyl ether positions can replace an alpha carbon-bound hydrogen with an O-acyl substituent. Seven sampled tails are available: acetate, propionate, butyrate, isobutyrate, pivalate, benzoate and hemisuccinate. This changes the molecule into a soft ether; it does not acylate an already two-coordinate ether oxygen.

Example: `COc1ccccc1` → `CC(=O)OCOc1ccccc1`. Formal ester hydrolysis gives an exposed hemiacetal and acetic acid; a separate fragmentation step gives `Oc1ccccc1` and formaldehyde. The OH analogue differs from the original methoxy input. It is not evidence of parent regeneration or biological activity. Secondary alpha substitution can give a ketone byproduct instead. Every fragment, including acid and carbonyl products, remains visible in the release explorer.

The preview displays input, redesigned ether and intended OH analogue together. Analyze and SMILES download actions preserve these identities. Release exploration targets the OH analogue explicitly; undo and JSON export retain this different-target scope. Original-parent comparison and Quick parent-recovery candidate generation remain separate. Site scan explanations and snapshot `prodrugSiteRedesign` expose the redesign role; `parentRecoveryVerified` and `inputRegenerated` stay false.

Eligibility requires a valid round-trippable organic graph, an acyclic ether boundary, a neutral saturated alpha carbon bearing hydrogen, and a graph-valid target. Specified alpha stereocentres are excluded; remote stereochemistry, isotopes, charges and recognized salt input numbering are retained. New linker stereochemistry remains unspecified. Diaryl ethers, tertiary alkyl sides without alpha hydrogen, cyclic ether bonds, peroxides, radicals and unsupported mixtures do not inherit these designs.

Reaction-class precedent: Thomas, Majumdar and Sloan, *Soft Alkyl Ether Prodrugs of a Model Phenolic Drug: The Effect of Incorporation of Ethyleneoxy Groups on Transdermal Delivery*, Molecules 2009, [doi:10.3390/molecules14104231](https://doi.org/10.3390/molecules14104231). This is experimental evidence for related phenolic soft-ether classes, not for every sampled acyl tail or the selected molecule. Aliphatic and substituted linkers are labelled extrapolations. No physiological cleavage rate, esterase recognition, synthesis feasibility, ADME improvement, efficacy or safety is inferred.

Validation: `node tools/soft-ethers-test.js`; `python tools/soft-ethers-rdkit-test.py` with RDKit installed; expanded `prodrug-explorer-ui-test.js`. Independent RDKit checks cover 105 designs / 210 formal release steps, product sanitization, target identity, remote stereo and isotope/charge/atom balance.


### Methoxy selection on substituted rings — 2026-10-23

The all-options site builder now initially selects an eligible methoxy oxygen and its ester redesign even when an amine, phenol, methyl ester or other supported group occurs earlier in the input atom order. Explicit selections of other atoms and exploration filters remain available. Existing O-dealkylation is selectable in Existing-group pathways.

A **Methoxy / ether group** selector names each eligible ether, its input O–C atom pair and (for aryl ethers) the attached aromatic ring carbon. Selecting a group switches to the ether redesign filter, synchronizes the displayed atom, and offers seven ester variants for that exact carbon side. Multiple methoxy groups have separate choices. A shared ether oxygen does not collapse the two carbon-side choices. The depiction highlights both atoms and the O–C bond. Recognized counterions preserve original input atom numbering. Methyl esters are not classified as methoxy ethers. Reference mode and unsupported inputs clear these controls and generated state.

This changes selection and labelling, not chemistry eligibility or evidence scope. The release target remains a different OH analogue, with biological activation unvalidated. Regression checks: `tools/methoxy-selection-ui-test.js` (100 assertions across substituted rings, multiple methoxy positions, salts, alternate atom order, competing groups, shared oxygen, explicit non-methoxy choice and state resets).


### Quick candidates now includes ether positions — 2026-10-23

Quick sampling now merges eligible ether carbon positions with the original-parent attachment positions. Previously the site builder recognized methoxy groups but the independent Quick generator sampled only attachment handles, so an amine could consume all 25 slots. The same capped batch now includes ether redesigns: up to five positions receive five unique designs each, and spare capacity is redistributed among the selected positions. Full-capacity ether positions are considered before other full-capacity handles; sparse sites remain available if fewer than five full-capacity positions exist. Input position means the carbon whose hydrogen is replaced, not a second duplicate entry for its adjacent oxygen.

Quick ether variants reuse the expanded acyl-tail catalogue; the selected-site builder keeps seven choices. Every Quick ether row must pass valence, complete identity round-trip and graph deduplication checks, plus a separate ester-hydrolysis / hemiacetal-fragmentation check that reaches the declared OH analogue. These are formal graph transformations, not evidence of biological release. Rows retain `parentRecoveryVerified: false`, `recoveredParentSmiles: null`, `designMode: ether-redesign`, and explicit `releaseTargetSmiles`, `releaseTargetVerified` and `releaseCheck` fields. Parent-recovery rows continue to require exact original-parent reverse-edit checks. Salt carbon/oxygen indices and design IDs map back to original input numbering.

Quick cards and position summaries name the ether class and show the different OH target. The snapshot preserves both modes without silently relabelling an OH analogue as the original parent. Four methoxy sites plus an amine produce five-by-five sampling; three methoxys plus an amine receive five each before filling remaining capacity. Methoxy-only input can generate 25 distinct hypotheses. No duplicate or unsupported structures fill shortages.

Validation: 163 focused Quick assertions, UI coverage for the actual mixed batch, and independent RDKit checks over 675 structures / 27 inputs, including 197 ether redesigns with independent alpha-C–O-acyl branch reversal and balanced two-step target release.
