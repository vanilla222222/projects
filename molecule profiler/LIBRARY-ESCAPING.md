# Direction markers eaten by JS string escaping

`data/library.js` is a JavaScript module, and its SMILES are single-quoted string literals. A
double-bond direction marker is a backslash. Inside a single-quoted JS literal a lone backslash
is an escape character, so `'C/C=C\C'` parses to `C/C=CC`: the source reads as a specified
geometry, and the module hands back a molecule that has none. Nothing errors, nothing warns, and
the row looks right in every text search. The marker has to be written doubled, `\\`, to survive.

## What it cost

| population | rows | markers lost |
|---|---|---|
| rows predating this check | 17 | 26 |
| the Cephalosporin batch added in the same session this was found | 78 | 78 |

The second line was mine. The generator emitted `/C=C\c1scnc1C`; the splice wrote it into the
module verbatim; `node` returned `/C=CC1=...`. All 112 rows had been verified against the
generator's own output, which was correct, so the corruption lived entirely in the gap between
the emitted text and the loaded module — exactly where no check was looking. It surfaced because
an unrelated measurement reported 130 of 164 `Cephalosporin` rows failing the no-unassigned-stereo
rule when only 52 rows could possibly fail it.

## The rows, and what they were storing

| row | source records | module returned |
|---|---|---|
| Isotretinoin | `CC1=C(/C=C/C(C)=C/C=C\C(C)=C/C(=O)O)...` | `...C(C)=C/C=CC(C)=C/C(=O)O...` |
| Arachidonic acid | `CCCCC/C=C\C/C=C\C/C=C\C/C=C\CCCC(=O)O` | `CCCCC/C=CC/C=CC/C=CC/C=CCCCC(=O)O` |
| Flupentixol | `...CC/C=C2\c3ccccc3Sc3ccc(C(F)(F)F)cc32...` | `...CC/C=C2c3ccccc3Sc3ccc(C(F)(F)F)cc32...` |
| Cefuroxime | `CO/N=C(\C(=O)NC1...)c1ccco1` | `CO/N=C(C(=O)NC1...)c1ccco1` |

The others are `N-Arachidonoyl dopamine`, `Virodhamine`, `Prostaglandin D2`, `E2` and
`F2alpha`, `2-Oleoylglycerol`, `Cefepime`, `Cefotaxime`, `Ceftazidime`, `Ceftriaxone`,
`Teriflunomide`, `Timolol maleate fragment` and `Zuclopenthixol`. Every one of the 26 lost
backslashes stood before a `C` or `c`, which is what a direction marker on a carbon looks like
and what nothing else in the file looks like.

**This is the root cause of a defect recorded earlier as a curation error.** The note that
`Isotretinoin` does not store 13-cis is wrong about the cause: the source stores 13-cis
correctly and the loader removes it. The same applies to the four cis geometries of arachidonic
acid, the 5Z of the prostaglandins, the Z of the two thioxanthenes, and the methoxyimino Z of
five cephalosporins. Repairing the escaping restores what the curator wrote; it does not
re-curate anything.

## What is repaired, and what is not

The 78 rows of my own Cephalosporin batch are repaired: their backslashes are doubled and they
now load with the geometry the generator derived. Verified row by row against the generator's
stdout, all 112 stored rows are byte-identical to it in name, formula and SMILES.

The 17 older rows are **not** repaired. I did repair them, and the project's own
`tools/refresh-library-name-witness.js` refused the result: the witness pins each row's loaded
value at commit `7a05f9ff`, and doubling the backslash changes that value. It stopped the repin
with the `Cefuroxime` row quoted side by side. That is the append-only contract working as
designed, and it is right to overrule the argument I had made to myself — that this is "only
escaping, not content". What the witness protects is the value the module returns, and the value
the module returns is exactly what changes.

So these 17 belong on the sanctioned path: a curated correction in
`data/reference-identity-corrections.json` with a companion curated reference entry and a
recorded adjudication per row, as `IDENTITY-CORRECTIONS.md` describes. They are unusually easy
cases to adjudicate, because the witness for each one can cite the row's own source line: the
intended structure is not a judgement call, it is written in the file and dropped on the way out.

Formulae are unchanged throughout, geometry not being compositional — which is also why the
stored `formula` field could never have caught any of this.

One consequence of the repair attempt is worth keeping even though it is reverted: with the
markers restored, `Timolol maleate fragment` canonicalises onto an existing maleic acid row,
taking the corpus from 19 canonical duplicate groups to 20. The fragment really is maleic acid;
it is distinguishable today only by the geometry it is failing to store. Whoever adjudicates
these 17 should expect that duplicate to appear.

## The guard

`tools/library-escaping-test.js` runs on every validation pass. It scans the module as text and
classifies every backslash as a doubled marker, an escaped apostrophe in a row name, or a single
backslash. It then asserts that the single-backslash set is **exactly** the 17 rows named above,
by name and by count, so a row that joins them fails the suite and names itself. It also pins the
3,703 correctly escaped markers, the 21 escaped apostrophes, the 988 rows that carry a marker
through module loading, and that 78 of the 112 derived cephalosporin rows are among them.

A note for anyone adding rows from a generator: the generator's stdout is correct SMILES, not
correct JavaScript. Doubling the backslashes is part of the splice, and verifying a batch against
the generator's text is not the same as verifying it against the loaded module. Check the module.
