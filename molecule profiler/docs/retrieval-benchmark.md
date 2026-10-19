# Target prediction: leave-one-out retrieval benchmark

The target panel is a nearest-neighbour lookup over hand-curated ligand sets. This
is the measurement of how often that lookup is right, on the only ground truth the
project has: its own labels.

Regenerate with `node tools/retrieval-benchmark.js` (add `--write` to refresh
`data/benchmark.js`, which the page reads).

## Method

For every known ligand of every target, the ligand is removed from the pool, all 132
targets are re-scored exactly as the page scores them, and the rank of the ligand's
own target is recorded. A target with fewer than two ligands cannot be measured:
dropping its only ligand leaves nothing to match against.

## What it does not measure

Agreement with any assay. The benchmark asks whether the page recovers labels it was
given, not whether those labels are complete or whether an unlabelled compound's real
targets would be found. Ligand sets have a median of three compounds, so a per-target
figure over two or three trials is an anecdote.

A low per-target recall@1 is also not always a ranking failure. 5-HT2A and 5-HT2C
share most of their ligands; whichever the fingerprint prefers takes every first place
and the other scores zero while still sitting at rank two or three. Read recall@5 for
families like that.

## Result

```
leave-one-out target retrieval, ecfp4 / tanimoto
  library 1012 compounds, 132 targets, 98 measurable, 34 with fewer than two ligands
  477 held-out trials over a median of 132 scored targets
  recall@1 25.4%  recall@5 57.2%  recall@10 67.7%  median rank 4  mean rank 16.1
  targets with >=5 ligands (306 trials): recall@1 20.9%  recall@5 58.2%  median rank 4
  popularity baseline: recall@1 6.3%  recall@5 20.1%  median rank 23
  uniform random baseline: recall@1 0.8%  recall@5 3.8%  median rank 66

other fingerprints
  ecfp6  recall@1 25.4%  recall@5 56.0%  median rank 4
  fcfp4  recall@1 25.6%  recall@5 55.6%  median rank 4
  pairs  recall@1 25.6%  recall@5 56.2%  median rank 4
  ecfp4 with Dice: recall@1 25.4%  recall@5 57.2%  median rank 4

per target: gene, trials, recall@1, recall@5, median rank
  HTR2A      30   46.7%   90.0%  2
  HTR2C      25    0.0%   84.0%  2
  DRD2       16   50.0%   62.5%  1.5
  HRH1       13   15.4%   30.8%  6
  HTR1A      12   58.3%   75.0%  1
  HTR2B      12    0.0%   50.0%  5
  SLC6A4     12    8.3%   25.0%  6.5
  ADRA1A     11   18.2%   45.5%  6
  PTGS2      11    0.0%  100.0%  2
  OPRM1      10   50.0%   80.0%  2
  PTGS1       9  100.0%  100.0%  1
  SLC6A2      9   11.1%   77.8%  3
  CHRM1       8    0.0%   12.5%  10.5
  DRD3        8    0.0%   25.0%  12.5
  HTR7        8    0.0%   12.5%  14.5
  ADRA2A      7   14.3%   57.1%  5
  SCN9A       7   14.3%   28.6%  19
  ADRB2       6   33.3%  100.0%  2
  CA2         6   16.7%  100.0%  3
  CYP2D6      6    0.0%   33.3%  38
  CYP3A4      6    0.0%    0.0%  47.5
  GABRA1      6   16.7%   16.7%  32.5
  HTR1B       6   33.3%   83.3%  3.5
  HTR6        6    0.0%   16.7%  13.5
  KCNH2       6    0.0%   33.3%  19
  ABCB1       5    0.0%    0.0%  37
  ADRB1       5   80.0%  100.0%  1
  CACNA1C     5   60.0%   60.0%  1
  CHRM3       5    0.0%   20.0%  13
  CYP2C9      5    0.0%    0.0%  31
  HTR1D       5    0.0%  100.0%  4
  HTR3A       5    0.0%   20.0%  9
  OPRK1       5    0.0%   80.0%  2
  pol         5    0.0%   40.0%  33
  SLC6A3      5    0.0%   80.0%  4
  ACE         4  100.0%  100.0%  1
  CHRM2       4    0.0%    0.0%  15
  CHRNA4      4   50.0%   50.0%  18
  DRD1        4    0.0%    0.0%  28
  DRD4        4    0.0%   50.0%  7.5
  EGFR        4   50.0%  100.0%  2
  HRH2        4   75.0%   75.0%  1
  KIT         4    0.0%   75.0%  3.5
  MAOA        4    0.0%    0.0%  61.5
  OPRD1       4    0.0%   75.0%  3.5
  pbp         4  100.0%  100.0%  1
  PDGFRB      4    0.0%   75.0%  3
  SCN5A       4    0.0%   50.0%  7.5
  TUBB        4   50.0%   75.0%  1.5
  ABL1        3   66.7%  100.0%  1
  ACHE        3    0.0%    0.0%  33
  CYP19A1     3   33.3%   33.3%  6
  ESR1        3    0.0%    0.0%  32
  folP        3  100.0%  100.0%  1
  GRIN1       3   66.7%   66.7%  1
  gyrA        3  100.0%  100.0%  1
  HMGCR       3   66.7%   66.7%  1
  KDR         3    0.0%    0.0%  61
  MAOB        3    0.0%    0.0%  14
  n/a         3  100.0%  100.0%  1
  n/a         3   66.7%   66.7%  1
  NR3C1       3   66.7%  100.0%  1
  parC        3    0.0%  100.0%  2
  SCN8A       3    0.0%    0.0%  23
  TYMS        3    0.0%    0.0%  80
  XDH         3    0.0%    0.0%  6
  ABCC8       2  100.0%  100.0%  1
  ADORA1      2  100.0%  100.0%  1
  ADORA2A     2    0.0%  100.0%  2
  AGTR1       2  100.0%  100.0%  1
  AR          2    0.0%    0.0%  113
  ATP4A       2  100.0%  100.0%  1
  ben-1       2    0.0%  100.0%  2
  BRAF        2    0.0%    0.0%  32.5
  CACNA2D1    2   50.0%  100.0%  3
  CRBN        2  100.0%  100.0%  1
  DDC         2   50.0%  100.0%  1.5
  DHFR        2    0.0%    0.0%  12
  ERBB2       2    0.0%   50.0%  9
  ESR2        2    0.0%    0.0%  51.5
  F10         2    0.0%   50.0%  7.5
  FLT3        2    0.0%    0.0%  61.5
  HPRT1       2   50.0%  100.0%  1.5
  IMPDH2      2    0.0%    0.0%  94
  JAK1        2  100.0%  100.0%  1
  JAK2        2    0.0%  100.0%  2
  M2          2    0.0%  100.0%  2
  NA          2  100.0%  100.0%  1
  nfsA        2    0.0%   50.0%  8
  PARP1       2    0.0%    0.0%  42
  PDE4D       2    0.0%  100.0%  3
  PDE5A       2    0.0%    0.0%  54.5
  POLA1       2   50.0%  100.0%  1.5
  PPARG       2  100.0%  100.0%  1
  rplC        2    0.0%    0.0%  93
  RRM1        2    0.0%    0.0%  106
  SLC18A2     2    0.0%    0.0%  40
  SLC22A1     2    0.0%    0.0%  95

worst trials
  XDH      Febuxostat                  rank  127, top was PTGS1 at 0.210
  CYP19A1  Testosterone                rank  127, top was PGR at 0.688
  OPRD1    Methadone                   rank  126, top was HRH1 at 0.298
  OPRK1    Methadone                   rank  125, top was HRH1 at 0.298
  RRM1     Gemcitabine                 rank  125, top was POLA1 at 0.592
  AR       Bicalutamide                rank  119, top was KDR at 0.244
  GRIN1    Ketamine                    rank  117, top was SLC6A4 at 0.218
  SLC22A1  Cimetidine                  rank  115, top was HRH2 at 0.203
  MAOA     Moclobemide                 rank  114, top was DRD1 at 0.339
  AR       Testosterone                rank  107, top was PGR at 0.688
  IMPDH2   Ribavirin                   rank  106, top was POLA1 at 0.415
  HMGCR    Simvastatin                 rank  105, top was NA at 0.159
  HTR3A    Serotonin                   rank  103, top was MTNR1A at 0.360
  rplC     Linezolid                   rank  103, top was F10 at 0.438
  RRM1     Hydroxyurea                 rank   87, top was PTGS2 at 0.185

not measurable (fewer than two resolved ligands)
  ALOX5 CYSLTR1 BCHE MTNR1A P2RY12 GABBR1 SV2A SLC12A1 SLC12A3 SLC22A12 NPC1L1 VKORC1 NDUFS1 COMT ABAT ADH1B DPP4 PGR RARA SRC ALK MET BTK CDK4 CDK6 JAK3 folA inhA embB pncA ERG11 UL30 UL23 NS5B
```
