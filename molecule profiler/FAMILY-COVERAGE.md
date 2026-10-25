# Named chemical families and identity review

The latest [named-family pharmacology batch](NAMED-FAMILY-PHARMACOLOGY.md)
adds aryloxypropanolamine, imidazoline, tetrahydrobenzazepine, phenothiazine and
aminobutyrophenone filters with 19 cited human receptor action assignments.

The initial family-catalog milestone covered 4,072 stored structures and offered
direct buttons for eight overlapping **structural motifs**, with counts and
searchable tags. The reference library has since grown; these historical counts
are retained as that milestone's snapshot. These are explicit graph queries, not an exhaustive chemical taxonomy or
a statement that every matching compound shares a pharmacological action.
Large fused molecules can contain a smaller family motif without usually being
classified in that family. Names, old class labels and motif matches alone are
not evidence of receptor binding, agonism, antagonism or selectivity.

## Current motif coverage

| Stored-graph motif | Entries |
| --- | ---: |
| Phenethylamine | 677 |
| Alpha-methylphenethylamine (amphetamine-related) | 124 |
| Tryptamine | 244 |
| Cathinone | 33 |
| Primary 2,5-dimethoxyphenethylamine (2C core) | 37 |
| Nitazene-related benzimidazole | 12 |
| Nitro-substituted nitazene motif | 9 |
| N-benzylphenethylamine | 53 |

Counts overlap and include legacy entries whose identities/pharmacology have
not all been independently reviewed. They must not be reported as numbers of
experimentally verified drugs. `validation/library-family-coverage.json` lists
the matching reference keys and source hashes. Exact SMARTS definitions are in
`tools/build-library-tags.py`.

The phenethylamine and tryptamine queries require their saturated two-carbon
amine linkers. The amphetamine query adds an alpha methyl group and a benzylic
methylene; it can also identify that motif in a prodrug. The cathinone query
requires an amine-bearing carbon adjacent to an aryl ketone. The 2C query is
limited to a primary two-carbon amine with 2,5-methoxy substitution; it does not
automatically classify N-benzyl or fused-ring descendants as 2Cs. Nitazene-related
and nitro-containing motifs have separate tags, so desnitazenes are not silently
reported as nitro-containing compounds. Unsupported variants can be missed;
these definitions are documented subsets, not complete family boundaries.

For current measured 2C coverage, see [2C references](TWO-C-REFERENCES.md):
30 named compounds, 17 additional parent structures, and 32 human 5-HT2A
functional observations. The inspector reports coverage of the selected core,
thio and alkoxy study cohorts separately.

## Six named amphetamine-related additions

The first expansion prioritizes named pharmacology references rather than
unnamed analogue enumeration: dextroamphetamine, levoamphetamine,
lisdexamfetamine, phentermine, benzphetamine and levomethamphetamine.

`validation/family-reference-curation.json` retains their complete PubChem
property responses, query URLs, retrieval times, parent structures and selected
DailyMed role sources. It explicitly distinguishes a labelled product from the
stored parent graph: product salts, formulations and clinical exposure are not
represented by a neutral parent structure. The selection rationale is not a
new receptor annotation or a fitted model. No target links are inferred.

Dextroamphetamine and levoamphetamine retain distinct source stereochemistry.
Import checks require different isomeric graphs, identical connectivity without
stereochemistry and assigned chiral centres. Existing unspecified-stereo entries
remain separate; unspecified stereo is not proof of a racemate or either
enantiomer. Browser and RDKit formulas must agree before writing an addition.

## Cathinone identity corrections

The 27 older cathinone-labelled entries were checked against name-resolved
PubChem structures. Eight disagreed in connectivity; one additional name
required the recognized synonym **4-MePPP** / CID 6430745. Nine reviewed
pyrrolidinophenone records had their ring attachment at a carbon instead of the
source nitrogen attachment. Their formulas were identical, demonstrating why
formula agreement alone cannot establish molecular identity.

Reviewed corrections cover Alpha-PPP, Alpha-PBP, Alpha-PVP, Alpha-PHP,
4-Methyl-alpha-PPP, Pyrovalerone, MDPV, MDPPP and Naphyrone. Names and target keys
are preserved; the source structures replace the incorrect graphs. This changes
their descriptors, fingerprints and any structure-based retrieval involving
those references. It does not add experimental pharmacology evidence.

The before/after source snapshots are `validation/cathinone-identity-before.json`
and `validation/cathinone-identity-after.json`. After correction, 26 entries
match isomeric source graphs. **Cathinone** matches connectivity but retains
unspecified local stereochemistry while its name-resolved source specifies an
enantiomer. That unresolved distinction is recorded, not silently assigned.
Agreement with PubChem is a database identity check, not independent physical
identification, assay validation or comprehensive scientific validation.

## Reproduction

```sh
python -B tools/pubchem-reference-audit.py --class-name Cathinone \
  --output cathinone-check.json
python -B tools/build-library-tags.py
python -B tools/library-metadata-test.py
node tools/family-reference-test.js
node tools/run-validation.js
```

`tools/curate-family-references.py` acquires a reviewable candidate by default.
`--apply` requires the matching pre-correction source checkout and the reviewed
before snapshot; it refuses to reapply to changed input. Cached responses permit
`--offline` acquisition. Source graphs, name collisions, single-component
structures, source/RDKit/browser formulas and the enantiomer pair are checked
before mutation. The source-linked regression retains the corrected graphs.

Primary structure records and role sources are linked per record in the
curation snapshot. Additional identity context:
[PubChem alpha-PVP](https://pubchem.ncbi.nlm.nih.gov/compound/11148955),
[PubChem MDPV](https://pubchem.ncbi.nlm.nih.gov/compound/20111961),
[PubChem 4-MePPP](https://pubchem.ncbi.nlm.nih.gov/compound/6430745),
[EUDA alpha-PVP structure](https://www.euda.europa.eu/media-library/molecular-structure-%CE%B1-pvp_en).

## Structural filters and pharmacology-linked nitazene references (2026 batch)

Nine additional graph filters are now available: arylcyclohexylamines,
ergoline cores, dibenzopyran cores, tropane cores, morphinan cores,
benzimidazolones, barbiturates, a defined 1,4-benzodiazepin-2-one subset, and
1,3-benzodioxoles. The filters classify the existing library as well as the
newly added compounds. Their counts are generated in
`validation/curated-references.json`; exact queries and positive/negative named
fixtures are pinned in `data/family-definitions.json`. These structural tags do
not carry pharmacology.

The nitazene expansion adds six named references, each with a cited functional
observation at the mu-opioid receptor: Clonitazene, N-desethyl etonitazene,
5-aminoisotonitazene, Methylnitazene, N-pyrrolidino protonitazene, and
Brorphine. All six have human MOR evidence and can contribute to human target
retrieval. Brorphine's full paper specifies human MOR in HEK293T cells and
reports separate beta-arrestin2 and mini-Gi assays. Reported endpoints, assay
formats, uncertainty and tested salt form are retained as published; values are
not converted to binding affinities. Identity-only additions were excluded from
this batch.

Nitazene-related and nitro-substituted tags remain separate. In particular,
5-aminoisotonitazene can match the broader nitazene-related scaffold without
being tagged as a nitro-substituted nitazene. Family matching never transfers
agonism or potency to a related structure.
