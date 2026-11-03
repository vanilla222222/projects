# What the generators can actually see

51 of the 72 `tools/derive-*.py` read `data/library.js` with a regex. The canonical form is
`derive-ace-inhibitor-references.py:26`:

```python
ENTRY = re.compile(
    r"\{ name: '([^']*)', cls: '([^']*)', formula: '([^']*)', smiles: '([^']*)'"
)
```

Hand-written rows are written on one line. Externally sourced rows are not: they carry a nested
`source: { provider, id, url, snapshot, ... }` block and span several lines. A single-line regex
cannot match them.

Measured against the current 22,137-row library:

| what the regex readers see | rows |
|---|---|
| matched by `ENTRY` | 7,049 |
| not matched | 15,088 |
| matched rows carrying a `source` block | **0** |
| rows the node loader sees | 22,137, of which 15,067 sourced |

The zero is not an estimate. Every one of the 7,049 matches was checked for whether the row it
sits in also carries `source:`; none does.

## Why this matters more than it looks

Those 51 generators compute two different things from the library, and the blindness corrupts
both.

**Collision gates.** A candidate is refused if an existing row already holds its structure or its
name. Run against 7,049 rows instead of 22,137, the gate cannot see 68% of the corpus, and in
particular cannot see any of the 15,067 imported compounds. A generator can therefore emit a row
for a compound the library already holds.

**Anchor pools.** The house rule admits a substituent value only when two or more **externally
sourced** rows attest it. A generator that cannot see a single sourced row cannot satisfy that
rule at all. Whatever it is doing instead, it is not the two-sourced-anchor rule.

## This already happened

It is the exact defect that invalidated the 34 original `cls: 'Cephalosporin'` rows, recorded in
`CEPHALOSPORIN-REDERIVATION.md`: all 21 of that generator's anchors resolved to hand-written rows
with no `source` block, C7 was unattested in all 34 rows, and not one of the 34 was re-provable.

The repair is also informative about the direction of the effect. Converting that one generator to
read the whole corpus did not simply delete rows — it took the class from **34 unprovable rows to
112 provable ones**, because the sourced population it had been blind to is where the attesting
anchors actually live. A correct corpus means more collisions *and* more attested slot values. Which
of the two dominates is a per-generator question, and is being measured.

## The loader to converge on

19 generators already read the library properly, and `derive-cephalosporin-references.py` is the
reference: a cache directory from `MP_DERIVE_CACHE` or `tempfile.mkdtemp`, the library dumped once
through `node -e "const{LIBRARY}=require('./data/library.js');console.log(JSON.stringify(LIBRARY))"`,
and rows read as objects with `source` left nested. `derive-benzofuran`, `derive-flavonoid` and
`derive-beta-carboline` were converted to it in `f8b810c`.

Two cautions from those conversions. `derive-beta-carboline` expected `provider` flattened onto
each row and had to be changed to read it from inside the `source` block, which is the shape the
module actually returns. And a generator whose diagnostics go to stdout must have them moved to
stderr before its rows can go to stdout — `beta-carboline` had 37 such prints.

## Not a defect, recorded so nobody fixes it

The regex readers capture 123 SMILES in which a direction marker appears as a doubled backslash,
because they read the JavaScript source text rather than the parsed module. That is harmless:
RDKit parses `C/C=C\\C` and `C/C=C\C` to the same molecule and canonicalises both to the same
string, so any census key built by parsing and canonicalising is correct. The escaping defect that
did real damage was on the **write** side, and is recorded in `LIBRARY-ESCAPING.md`.
