# Reference library taxonomy

The inspector exposes all 57 defined structural families, every represented reference-class label, all functional-group motifs, study collections and binding-reference families. Search within the selector to find an option; zero-match structural families remain visible but disabled. Counts refer to the complete library, while the results still respect the selected collection and molecule search.

Structural families use explicit RDKit SMARTS against the stored graph. Reference-class labels are historical dataset classifications and may describe pharmacology, use, chemistry or provenance; they are displayed separately and do not establish verified activity. Study collections are curated name-based discovery groups. Binding families refer only to the existing qualified source associations. These categories are not interchangeable.

## Consolidation

Indole and pyridine motif tags are consolidated into the Indoles and Pyridines structural-family tags. Old tag searches remain aliases. Sourced records retain one collection label rather than duplicate source-provider and source-class tags; source links and snapshot information remain available. Broad parent motifs and specific subtypes are retained when they answer different questions—for example an amide and a lactam, or a halogenated structure and a fluorinated structure.

## More specific tags

Amine subtypes distinguish primary, secondary, tertiary and quaternary ammonium groups; amide-like nitrogens are excluded from the new neutral-amine subtype patterns. Amides, carbamates, ureas, imides, lactams and thioamides remain separately searchable. Esters, carbonates and lactones are distinct. New sulfur and phosphorus motifs include thiols, thioethers, sulfoxides, sulfones, phosphate esters and phosphonates.

Indole, pyrrole, pyridine, diazine, azole, fused aromatic heterocycle and saturated heterocycle families have explicit patterns. Positional diol families distinguish catechols, resorcinols and hydroquinones. Unacylated phenethylamines and tryptamines are separated from the broader scaffold families and N-acyltryptamines. Existing detailed amide-related families remain intact.

Ring counts now distinguish 3 and 4 rings from the 5+ bin. Additional tags describe spiro, bridged and macrocyclic ring topology, mixed aromatic/aliphatic rings and tetrahedral-stereo completeness. Ring definitions follow the RDKit ring representation; macrocycle means a perceived ring with eight or more atoms. These tags are descriptive, not synthetic feasibility, biological activity or safety predictions.

## Maintenance and tests

`tools/library-taxonomy.py` contains the added patterns; `tools/build-library-tags.py` rebuilds all graph tags, serialized family definitions and coverage reports. `tools/library-taxonomy-test.py` checks representative positive and negative cases and topology. The real inspector DOM test verifies every defined family and every represented reference-class/functional-group/binding-family selector, search, counts and empty-family behavior. Class and functional-group selectors are generated from metadata rather than a manually maintained subset.

SMARTS interpretation: https://www.rdkit.org/docs/RDKit_Book.html . Pattern matches describe a substructure, not exhaustive chemical taxonomy. Nested motifs may overlap intentionally. All molecule names, source records and graphs are unchanged by this update.
