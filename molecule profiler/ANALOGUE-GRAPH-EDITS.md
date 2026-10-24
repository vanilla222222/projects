# General analogue graph edits

The browser generator now provides **22 edit families**: the previous 11 families plus 11 connectivity-based extensions. These rules apply to compatible molecular graphs without a named-compound allowlist, receptor objective or preferred ring locant. Input atom numbers refer to the original parsed structure, not IUPAC ring numbering.

## Added families

| Family | Structural operation and boundary |
| --- | --- |
| Aliphatic C–H substitution | Methyl, ethyl or hydroxy attachment at an uncharged, unlabelled, non-stereospecified saturated carbon with an available H. No assumed alpha/beta position. |
| Amine double alkylation | Two methyl/ethyl attachments on an ordinary neutral primary amine with two available N–H bonds. Amides and other carbonyl-bound N sites are excluded. |
| Amine N–O substitution | N-hydroxy or N-methoxy graph edits at an ordinary neutral amine N–H. |
| Chain length changes | Insert CH2 into eligible acyclic single bonds, or remove eligible unlabelled acyclic CH2 sites. No contraction of rings or deletion of labelled/stereospecified atoms. |
| Additional aromatic substituents | Propyl, isopropyl, butyl, tert-butyl, methylthio, ethylthio, propylthio, difluoromethyl, nitro, vinyl, ethynyl, cyclopropyl and cyclobutyl at compatible aromatic C–H sites. |
| Aryl-halogen group replacement | Remove a pendant aryl halogen, or replace it with a compatible group from the existing and extended substituent sets. It does not require or favour a particular ring position. |
| Alkoxy / halogen relocation | Move a pendant alkoxy branch or halogen to an available C–H within the same connected aromatic system; retain other substituents. Aryl esters and ring-tethered ethers are excluded. Symmetry-equivalent positions and unchanged parents are removed. |
| Terminal methoxy removal | Delete a pendant, unlabelled O–CH3 branch and restore the aromatic C–H. |
| Paired aromatic substitutions | Place F/F, methyl/F, F/methyl or methyl/methyl at two compatible C–H sites in an aromatic system. Both input sites are recorded and selectable. |
| Six-to-five aromatic ring edit | Contract an isolated six-carbon aromatic ring by one unsubstituted carbon and replace an adjacent eligible C–H with O or S. Existing external substituents remain attached to retained atoms. Fused, tethered or fully occupied starting cores are excluded. This is a formal graph edit, not a reaction. |
| Adjacent aromatic ring fusion | Add an O- or S-containing five-membered aromatic ring across an eligible aromatic C–H/C–H edge. Occupied edge atoms and shared fused-ring junctions are excluded. |

Existing aromatic C–H-to-N enumeration already examines each compatible aromatic carbon, rather than assuming two positions. Existing ether extension, O/N alkylation, halogen exchange, acid ester and other functional replacements remain available.

## Validation and display

Candidates undergo the existing supported closed-shell graph checks, parent-identity round-trip check, candidate round-trip check and exact graph deduplication. Additional runtime guards reject loss of existing stereochemical or isotope labels. Deleting atoms remaps the atom-order references used by the SMILES writer, including the implicit-H sentinel at retained stereocentres. New stereocentres remain unspecified.

The input depiction highlights all affected input sites for multi-site and topology edits. CSV exports add `affected_input_atoms` and `graph_edit`; JSON retains the explicit edit operations. These are edit descriptions, not assigned chemical names or evidence of synthetic accessibility.

Generation remains bounded to **100 unique designs and 400 attempted edits**. Paired substitutions and pendant-group relocations each have a 120-placement catalogue bound per input. Coverage reports distinguish catalogue bounds from attempt bounds; “exhausted” means the compiled edit set, not all possible chemistry. Selection and expansion are deterministic, and Generate 5 more retains the existing prefix.

An independent RDKit audit reconstructs the edits from the original parent graphs, sanitizes products, verifies exact isomeric graph parity and checks uniqueness. Regression fixtures include ordinary alcohols, acids/esters, amines, heterocycles and labelled/stereospecified inputs. Passing these checks supports graph consistency; it does not establish activity, selectivity, metabolism, stability, safety, synthesis feasibility or improved ADME.

Run `node tools/analogue-candidates-test.js`, `python tools/analogue-rdkit-test.py`, `node tools/analogue-workbench-test.js` and `node tools/analogue-ui-test.js` with RDKit/jsdom available. The full application smoke test covers generation, expansion, notebook save/restore and stale-job handling.
