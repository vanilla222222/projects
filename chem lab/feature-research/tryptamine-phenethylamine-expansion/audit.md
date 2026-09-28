# Tryptamine / phenethylamine common-name expansion — audit

## Files changed

- `js/naming-core.js` — 48 new `COMMON_NAMES` entries (71 → 119) plus three new classifier functions (`classifyThioalkoxy`, `classifyAcyloxy`, `classifyPhosphoryloxy`) and the `collectCoreAttachments` wiring that tries them.
- `CODE_REFERENCE.md` — "Common (trivial) names" section: entry count bumped to 119, two new paragraphs describing this batch and the three classifiers.
- `complexities.md` — `js/naming-core.js` row: names the three new classifiers and the widened four-classifier cascade in `collectCoreAttachments`.
- `feature-research/tryptamine-phenethylamine-expansion/audit.md` — this file.

## Verification method

Every key below was produced by the real, unmodified `nameStructure` running over an explicitly constructed `Graph` (indole core with hand-set Kekulé bond orders + `matchEthylamineChain`-shaped bridge for tryptamines; benzene core + `matchEthylamineChain` / `matchAmphetamineChain` bridge for phenethylamines/amphetamines), via a Node bundle of `js/graph.js js/valence.js js/naming-chain.js js/naming-core.js js/naming-ring.js js/naming-scaffolds.js`. The builders were validated first by reproducing four already-known entries (`psilocin`, `serotonin`, `dopamine`, `mescaline`, `DOM`, `2C-E`) before any new candidate was trusted. The bundle was rebuilt from the on-disk files after the Phase B code edits so the Phase B verifications exercised the new classifiers.

## Phase A — verified and added (37 entries, no new code)

| # | Verified key | Value |
|---|---|---|
| 2 | `N,N-dipropyltryptamine` | `DPT` |
| 3 | `N,N-dibutyltryptamine` | `DBT` |
| 4 | `N-ethyl-N-propyltryptamine` | `EPT` |
| 5 | `N-ethyl-N-methyltryptamine` | `MET` |
| 6 | `N-methyl-N-propyltryptamine` | `MPT` |
| 7 | `4-hydroxy-N,N-diethyltryptamine` | `4-HO-DET` |
| 8 | `4-hydroxy-N,N-dipropyltryptamine` | `4-HO-DPT` |
| 9 | `4-hydroxy-N-ethyl-N-methyltryptamine` | `4-HO-MET` |
| 10 | `4-hydroxy-N-methyl-N-propyltryptamine` | `4-HO-MPT` |
| 11 | `4-hydroxy-N-ethyl-N-propyltryptamine` | `4-HO-EPT` |
| 12 | `4-hydroxytryptamine` | `4-HO-T` |
| 13 | `5-methoxy-N,N-diethyltryptamine` | `5-MeO-DET` |
| 14 | `5-methoxy-N-ethyl-N-methyltryptamine` | `5-MeO-MET` |
| 15 | `5-methoxy-N,N-dipropyltryptamine` | `5-MeO-DPT` |
| 16 | `5-fluoro-N,N-dimethyltryptamine` | `5-Fluoro-DMT` |
| 17 | `5-chloro-N,N-dimethyltryptamine` | `5-Chloro-DMT` |
| 18 | `5-bromo-N,N-dimethyltryptamine` | `5-Bromo-DMT` |
| 19 | `6-fluoro-N,N-dimethyltryptamine` | `6-Fluoro-DMT` |
| 20 | `2-methyl-N,N-dimethyltryptamine` | `2,N,N-TMT` |
| 21 | `4-methyl-N,N-dimethyltryptamine` | `4,N,N-TMT` |
| 22 | `5-methyl-N,N-dimethyltryptamine` | `5-N,N-TMT` |
| 23 | `7-methyl-N,N-dimethyltryptamine` | `7,N,N-TMT` |
| 24 | `4-hydroxy-5-methoxy-N,N-dimethyltryptamine` | `psilomethoxin` |
| 25 | `2,5-dimethoxy-4-propylphenethylamine` | `2C-P` |
| 26 | `4-fluoro-2,5-dimethoxyphenethylamine` | `2C-F` |
| 27 | `2,5-dimethoxy-4-methylphenethylamine` | `2C-D` |
| 28 | `4-butyl-2,5-dimethoxyphenethylamine` | `2C-Bu` |
| 29 | `4-ethyl-2,5-dimethoxyamphetamine` | `DOET` |
| 30 | `2,5-dimethoxy-4-propylamphetamine` | `DOPR` |
| 31 | `4-butyl-2,5-dimethoxyamphetamine` | `DOBU` |
| 32 | `2,5-dimethoxyamphetamine` | `DOH` |
| 33 | `2,4,5-trimethoxyamphetamine` | `TMA-2` |
| 34 | `3,4,5-trimethoxyamphetamine` | `TMA` |
| 35 | `2,4,6-trimethoxyamphetamine` | `TMA-6` |
| 36 | `4-ethoxy-3,5-dimethoxyphenethylamine` | `escaline` |
| 37 | `3,5-dimethoxy-4-propoxyphenethylamine` | `proscaline` |
| 38 | `3,4,5-trimethoxy-N,N-dimethylphenethylamine` | `trichocereine` |

Note on #24 (`psilomethoxin`): the two ring prefixes come out in locant order, `4-hydroxy-5-methoxy-`, which is what `assembleSubstituentPrefix`'s alphabetical grouping happens to give here as well.

### Phase A candidate not needing an entry

- **#1 bare tryptamine.** Verified raw output is exactly the literal string `tryptamine` (`nameIndole` emits it directly when there are no ring substituents and no N-alkyls), so per the plan no `COMMON_NAMES` entry was added. Not a drop — simply already correct.

## Phase B — new classifiers plus 11 entries

### Code added to `js/naming-core.js`

- `classifyThioalkoxy` — divalent S bridging the core to a ≤4-carbon straight branch; names it `ALKYL_PREFIXES[n] + 'thio'`.
- `classifyAcyloxy` — core-O-C(=O)-CH3, with the carbonyl O terminal and double-bonded and the methyl terminal; emits `acetoxy`.
- `classifyPhosphoryloxy` — core-O-P(=O)(OH)(OH), phosphorus carrying exactly one terminal `=O` and two terminal `-OH`; emits `phosphoryloxy`.
- `collectCoreAttachments` now tries `classifyAlkoxy` → `classifyThioalkoxy` → `classifyAcyloxy` → `classifyPhosphoryloxy` in sequence when `allowAlkoxy` is set, and the substituent-push branch matches all four kinds.

### Verified and added (11 entries)

| Verified key | Value |
|---|---|
| `2,5-dimethoxy-4-methylthiophenethylamine` | `2C-T` |
| `4-ethylthio-2,5-dimethoxyphenethylamine` | `2C-T-2` |
| `2,5-dimethoxy-4-propylthiophenethylamine` | `2C-T-7` |
| `4-acetoxy-N,N-dimethyltryptamine` | `psilacetin` |
| `4-acetoxy-N,N-diethyltryptamine` | `ethacetin` |
| `4-acetoxy-N,N-dipropyltryptamine` | `depracetin` |
| `4-acetoxy-N-ethyl-N-methyltryptamine` | `metacetin` |
| `4-phosphoryloxy-N,N-dimethyltryptamine` | `psilocybin` |
| `4-phosphoryloxy-N-methyltryptamine` | `baeocystin` |
| `4-phosphoryloxytryptamine` | `norbaeocystin` |
| `4-phosphoryloxy-N,N-diethyltryptamine` | `ethocybin` |

## Dropped candidates

None. All 48 candidates that required an entry verified on the first constructed graph; nothing was force-added and no key was bent to fit an unexpected output.

## Regression checks

- Pre-existing entries still resolve after the edits: `DOM`, `2C-P`'s neighbours, `psilocin`, `serotonin`, `dopamine`, `mescaline`.
- Non-scaffold tiers unaffected by the new classifier cascade: `thiophenol` (terminal S still hits `classifyAttachment` first), `anisole` (still `classifyAlkoxy`), `acetic acid` (chain tier).
- Final `COMMON_NAMES` count confirmed programmatically: 119.

## Checklist

- [x] Every added key verified against the real `nameStructure`, not hand-derived.
- [x] Bundle rebuilt from on-disk files after the Phase B code edits before Phase B verification.
- [x] No code comments added in any new or edited line.
- [x] No files touched outside the four listed above.
- [x] Nothing from Phase C (lysergamides, FLY/benzofuran/aminorex) attempted.
- [x] No state-changing git commands run.
