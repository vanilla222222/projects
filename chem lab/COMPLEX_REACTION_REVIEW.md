# Route-shortening reaction review — 2026-10-31

This is an implementation-gap review, not an experimental synthesis recommendation. A shorter encoded route must still pass the same forward identity, loading, selectivity, inventory and boundary checks.

## Completed first shortcut

`exhaustive-o-methylation` treats two compatible O–H sites as one exhaustive preparation operation. It has a dedicated forward rule and reverse template, with two methyl-transfer and base-activation equivalents in the model. It does not merge arbitrary saved steps. Fixed glycol and catechol examples now have one-step Path Finder / Recipe Tree controls. Competing N/S functions and unsupported substrate classes remain excluded.

## Next complex-reaction candidates

| Candidate | Current repository coverage | Opportunity | Required work before enabling |
| --- | --- | --- | --- |
| Broader Robinson annulation coverage | Forward `rxyRuleRobinson` and reverse `robinson` already exist. | Improve coverage of the existing Michael-addition / aldol / dehydration preparation instead of adding a duplicate named rule or forcing separate operations. | Audit donor/acceptor site choices, tether/ring topology, temperature assumptions, competing carbonyls and new stereochemical mixtures. Add fixed route comparisons at unchanged budgets. |
| Bounded Passerini three-component reaction | No forward or reverse Passerini template found in the reaction and retrosynthesis modules. | Add a dedicated multicomponent endpoint forming an alpha-acyloxy amide from a carbonyl compound, carboxylic acid and isocyanide. | Confirm isocyanide parsing and distinguish it from nitrile; preserve all three input skeletons and oxygen identities; define a small source-backed substrate/condition subset; flag new stereochemical mixtures and competing sites; implement a bounded reverse decomposition and independent fixed-product checks. |

The Passerini opportunity is an inference from missing repository coverage and published reaction classes, not a demonstrated numerical step saving in the present planner. Measure actual savings only after adding the forward/reverse pair, using fixed target panels, unchanged stock policies and identical search budgets.

## Source and boundary caution

Schwäblein and Martens, *European Journal of Organic Chemistry* (2011), [DOI: 10.1002/ejoc.201100160](https://doi.org/10.1002/ejoc.201100160), report a Passerini construction followed by ring-closing metathesis. Their sequence supports investigating complementary multicomponent and cyclization templates. It does **not** justify combining those two operations into an automatically verified one-pot step. The current separate-mixture boundary requirement must remain in force.

The exhaustive methylation rule records the Williamson reaction-class source: McMurry, [OpenStax Organic Chemistry 18.2: Preparing Ethers](https://openstax.org/books/organic-chemistry/pages/18-2-preparing-ethers). The finite two-site endpoints are model deductions; the reference is not a universal yield or substrate-compatibility guarantee.
