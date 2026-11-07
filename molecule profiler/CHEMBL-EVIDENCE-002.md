# ChEMBL dossier evidence and calculated properties

The six retained ChEMBL_37 batches contain 1,881 binding associations across
1,355 existing library keys. This update restores the numeric standardized
Ki/Kd result and the source trail that were lost between the receptor-tag
builder and the dossier. It adds no structures, target panels or assay results.

Each association is joined back to its retained activity and assay record.
The dossier keeps standardized metric, relation, value and units separate from
the original reported type, relation, value and units. This distinction matters:
ChEMBL standardization can transform the source endpoint or its scale, including
original pA2 records standardized to Kd. Neither form is silently substituted for
the other or promoted to functional action. No uncertainty is invented.

Cards expose molecule, target, activity, assay and document identifiers and links,
source release, assay context and snapshot SHA-256/location. A document link is
retained where the snapshot supplies no primary DOI or PubMed identifier. Assay
organism is not used as host-cell species. Missing context stays unreported.
IUPHAR affinity values remain on their original scale.

Numerical observations require an exact full isomeric graph match, including
charge and disconnected components. The uncharged/tautomer grouping key used
for reference coverage is not sufficient for numerical transfer. Disagreements
remain auditable and receive a dossier warning instead of a transferred value.
Existing source snapshots and reviewed identity corrections remain unchanged.

A separate panel provides nine local RDKit descriptors for these existing keys:
molecular weight, exact mass, calculated logP, topological polar surface area,
hydrogen-bond donors and acceptors, rotatable bonds, formal charge and heavy-atom
count. It identifies the method/version and complete-graph scope. These values
are calculated descriptors, not experimental properties or values reported by
ChEMBL. They do not enter measured-property claims or receptor inference.

`tools/repin.py` rebuilds the property dataset through its owner and checks its
input, output and builder hashes. Generated files must be rebuilt after merging
library changes; source snapshots must not be rewritten to satisfy a new pin.

Reproduction:

```sh
python -B tools/build-receptor-tags.py
python -B tools/build-chembl-properties.py
python -B tools/chembl-evidence-builder-test.py
python -B tools/chembl-properties-test.py
node tools/chembl-evidence-test.js
node tools/chembl-properties-test.js
python -B tools/repin.py --check --report validation/chembl-enrichment-validation.json
```

Native builders/tests require RDKit. DOM checks additionally require jsdom.
Attribution and redistribution terms are in `CHEMBL-DATA-NOTICE.md`.
