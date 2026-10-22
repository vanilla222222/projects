# Chem Lab upgrades

## Naming

The parent-selection fallback now prefers a parent containing more principal
suffix groups before preferring chain length. Regression cases cover polyols,
diamines and dithiols, graph-order independence, and unchanged input graphs.
The displayed primary systematic name follows the selected parent. Butenedioic
acid receives the fumaric or maleic common name only when E or Z geometry is
specified; unspecified geometry keeps a nonspecific name.

Reference: [IUPAC Blue Book P-44.1.1](https://iupac.qmul.ac.uk/BlueBook/P4.html)
and [P-66, retained acid names](https://iupac.qmul.ac.uk/BlueBook/PDF/P6.pdf).
These changes do not establish complete IUPAC coverage for arbitrary structures.

## Reactions

Product merging preserves atom and bond metadata, product identity uses
isomeric SMILES, and a narrow structural validator rejects invalid bond graphs
and unsupported overvalent carbon/oxygen products. Carboxylates no longer match
the alkoxide reagent class.

Two sulfur transformations extend the rule library:

- Thiolate alkylation with methyl or accessible primary alkyl halides. Neutral
  thiols require a supported base; tertiary and neopentyl halides are excluded.
- TCEP reduction of disulfides under aqueous conditions, including mixed
  disulfides and product multiplicity for symmetric disulfides.

References: [University of Calgary, thiol reactions](https://www.chem.ucalgary.ca/courses/350/Carey5th/Ch16/ch16-7-1.html)
and [Burns et al., selective disulfide reduction using TCEP](https://doi.org/10.1021/jo00008a014).
The rules are bounded structural models; displayed conversions or yields from
the existing engine are estimates rather than measurements for a query.

Reaction-file import rejects empty dot components, malformed counts, missing
agent records, and compounds beyond the lab's supported limit. Oversized imports
are rejected before replacing the existing reaction.

Disconnected SMILES export now serializes every component independently, so
counterions and stereocentres in charged multi-component products survive export.

## Path Finder

The Path Finder tab accepts a starting material and target as local names or
SMILES. It searches backwards from the target using forward-checked
retrosynthesis candidates, carrying one precursor toward the chosen start and
requiring any other building blocks to be available in the local stock list.
The displayed route runs forwards and lists the additional building blocks,
reagents and conditions; each step can open in the Reactions tab.

Search is bounded to the selected step count, 60 expanded structures and 12
seconds of processing, with cancellation. A successful result is a candidate
within the supported rule model. Failure to find a route does not establish
that a route is impossible. Endpoints currently must be single connected
molecules, up to the existing retrosynthesis size limit.

## Validation

Run the standalone Node regression suites in `tools/` for naming, reaction
prediction, reaction I/O, sulfur retrosynthesis and Path Finder. They use the
same browser scripts as the app without requiring a package installation.
