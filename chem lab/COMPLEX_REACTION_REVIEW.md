# Route-shortening reaction review — 2026-10-31

This is an implementation-gap review, not an experimental synthesis recommendation. A shorter encoded route must still pass the same forward identity, loading, selectivity, inventory and boundary checks.

## Current exhaustive shortcut

`exhaustive-o-methylation` treats two to four compatible O–H sites as one exhaustive preparation operation. It has a dedicated forward rule and reverse template, with methyl-transfer and base-activation demand scaled to the number of sites in the model. Reverse search also considers substrates retaining pre-existing methoxy groups, within its unchanged proposal cap. It does not merge arbitrary saved steps. Fixed glycol and catechol examples now have one-step Path Finder / Recipe Tree controls. Competing N/S functions and unsupported substrate classes remain excluded.

## Current complex-reaction coverage

| Candidate | Current repository coverage | Opportunity | Required work before enabling |
| --- | --- | --- | --- |
| Broader Robinson annulation coverage | Forward `rxyRuleRobinson` and reverse `robinson` already exist. | Improve coverage of the existing Michael-addition / aldol / dehydration preparation instead of adding a duplicate named rule or forcing separate operations. | Audit donor/acceptor site choices, tether/ring topology, temperature assumptions, competing carbonyls and new stereochemical mixtures. Add fixed route comparisons at unchanged budgets. |
| Bounded Passerini three-component reaction | Implemented forward/reverse for simple achiral monoaldehyde, monocarboxylic acid and charge-separated isocyanide inputs in the encoded DCM/ambient branch. Ketones, arylacetic acids, labels and extra functionality/partners are excluded. | Both planners can use one atom-conserving preparation with three required inputs. A fixed one-step panel succeeds with this rule and has no one-step route when this rule is disabled, at unchanged budgets. | Broader substrate/medium scope, experimental selectivity and isotope assignment remain unvalidated. The new alpha centre is an uncontrolled stereochemical mixture; no pure enantiomer is claimed. |

The fixed Passerini panel demonstrates a newly available one-operation route within the encoded model, not a global minimum-step proof or a numerical saving against a fully validated longer experimental route. Primary class/condition reference: [DOI: 10.1021/acs.joc.5c00236](https://doi.org/10.1021/acs.joc.5c00236).

## Source and boundary caution

Schwäblein and Martens, *European Journal of Organic Chemistry* (2011), [DOI: 10.1002/ejoc.201100160](https://doi.org/10.1002/ejoc.201100160), report a Passerini construction followed by ring-closing metathesis. Their sequence supports investigating complementary multicomponent and cyclization templates. It does **not** justify combining those two operations into an automatically verified one-pot step. The current separate-mixture boundary requirement must remain in force.

The exhaustive methylation rule records the Williamson reaction-class source: McMurry, [OpenStax Organic Chemistry 18.2: Preparing Ethers](https://openstax.org/books/organic-chemistry/pages/18-2-preparing-ethers). The finite two-site endpoints are model deductions; the reference is not a universal yield or substrate-compatibility guarantee.
