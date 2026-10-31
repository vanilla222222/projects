# Chem Lab upgrades

## Linear Path Finder pathway diversity — 2026-10-31

- Requests for multiple routes now explore a bounded pool of up to four times the requested count, within the existing time/node/depth/branch budgets, instead of stopping after the first few recipe variants. Single-route searches retain their early exit.
- Identical stereo-aware intermediate sequences occupy one slot, keeping their best cost-ranked recipe. Distinct disconnections are interleaved before branch truncation so reagent variants cannot monopolize the branch limit.
- The final selection keeps the best-cost route and then favors the least overlap in intermediates and reaction families. Cost breaks diversity ties and orders the displayed results. Fewer than the requested number may be returned when distinct pathways are unavailable within the limits. This heuristic encourages structural diversity; it does not guarantee globally disjoint or experimentally feasible synthesis routes.
- Eleven new checks cover a nine-route selection pool, deterministic behavior, best-cost retention, recipe grouping, stereo separation and an actual forward-verified five-route request. Existing engine and DOM-controller checks were updated to expect grouped pathways. Convergent Recipe Tree selection is unchanged.

## Grignard competing electrophilic sites — 2026-10-31

- Grignard carbonyl, nitrile and CO2 endpoints now count recognized electrophilic sites across substrate inputs. Multiple carbonyl/nitrile/CO2 sites produce an explicit compatibility conflict, including repeated groups of the same kind that group-presence checks could miss.
- First-site graph predictions remain inspectable, but route assessment, saved-step validation and scope replays cannot certify selective mono-addition. This is a conservative structural ambiguity audit, not a prediction of relative rates, exhaustive addition products or a claim that selective experimental methods do not exist.
- Thirty-two checks cover dialdehydes, diketones, diesters, dinitriles, carbonyl/nitrile combinations, separate electrophile inputs, changed-input scope replay and five single-site controls. Existing reaction-stage medium, donor and work-up checks remain in force.

## Hydroxyl substitution atom identity — 2026-10-31

- Alcohol-to-halide, Appel and acid-to-acyl-chloride rules replace the departing oxygen with a new halogen atom. Oxygen isotope labels no longer become halogen isotope labels. Carbon labels and the nondeparting carbonyl oxygen stay on their original atoms.
- Shared replacement updates tetrahedral neighbor identity before applying inversion or retention. Acid-mediated rearrangement moves the new halogen and preserves the unrearranged alternative.
- Fifty-three focused checks cover both alcohol enantiomers, inversion/retention, a spectator stereocentre, polyol substitution, acyl oxygen identity and rearrangement. Three independent product fixtures extend the benchmark. This does not predict isotope transfer from labelled reagents or balanced byproducts, or broaden the rules’ substrate/condition scope.

## Grignard nitrile hydrolysis atom identity — 2026-10-31

- Nitrile addition followed by hydrolysis now removes the nitrile nitrogen and adds a fresh oxygen, rather than changing nitrogen into oxygen. Nitrile-carbon and Grignard-carbon isotope labels remain on carbon.
- Work-up provenance records the departing nitrogen isotope and separately assumed unlabelled water as the oxygen source. Labelled work-up transfer, oxygen exchange and balanced salt/byproduct structures remain outside this endpoint model.
- Ten focused regression checks and three fixed product fixtures cover isotope identity, input immutability, ether-containing substrates and the existing work-up boundary.

## DIBAL atom identity and mixture scope — 2026-10-31

- Cold nitrile reduction/hydrolysis now removes nitrile nitrogen and introduces a new oxygen from separately assumed unlabelled work-up water. It no longer changes the nitrogen atom into oxygen, which incorrectly transferred nitrogen isotope labels. Carbon labels and existing ester oxygen identity stay on their original atoms in the graph model. Work-up provenance records departing nitrogen labels without inventing a balanced byproduct structure or predicting oxygen exchange.
- Recorded water, protic solvent, acid and neutral O–H/N–H/S–H inputs block clean DIBAL endpoints because their reagent consumption is outside this rule. Recognized carbonyl/nitrile solvents also block solvent-independent outcomes. Water listed in the reaction mixture is not silently moved to a later work-up.
- Nitrile-to-aldehyde prediction is now limited to the existing cold branch followed by hydrolysis. Warm nitrile mixtures return an unsupported-scope hint rather than retaining an unvalidated aldehyde endpoint. Warm ester/alcohol and ordinary carbonyl controls remain. The existing minus-40 C branch threshold is an implementation bound, not a universal experimental transition.
- Unmodeled amide, acyl chloride, anhydride and CO2 sites are excluded, including on the same substrate. Other recorded electrophilic inputs remain inspectable as competing branches but cannot establish clean selected-input DIBAL preparation. Scope replays and saved routes apply the same compatibility records.
- Forty-six focused checks cover fixed/isotope-labelled endpoints, donor and reactive-solvent conflicts, changed-medium saved routes, warm/cold controls, competing partners and retained native retrosynthesis. Three positive isotope/product fixtures and five unsupported-endpoint fixtures extend the independent benchmark. Chemical class references do not establish an experimental yield or full substrate compatibility.

## Product survival and broader exhaustive methylation — 2026-10-31

- A product-survival audit checks recognized sites in products and represented alternatives against every active supported reagent model, including additional recorded reagent classes. Product motifs share a per-prediction inventory with the existing input chemoselectivity audit. No cross-query chemistry cache, reaction recursion or unbounded follow-up search is introduced.
- Reports distinguish review, unresolved further reaction, no recognized alert, missing coverage and a separate-work-up boundary. Stoichiometric exhaustion is not proof of absent residue. Recorded excess HX with a susceptible unsaturated partial-addition product now blocks a clean endpoint without inventing subsequent isomer identities or ratios. Other susceptibility alerts remain explicit uncertainty when dose/kinetic/phase coverage is insufficient.
- Neutral Grignard/LAH/DIBAL and selected other work-up endpoints are not automatically exposed to the original reaction mixture. Their product-survival assessment explicitly remains across an unvalidated work-up boundary. Scope replays recompute reagent quantities and product alerts; workspace, planner, Reactions details and Recipe Tree expose the result. This is a finite susceptibility screen, not a stability or compatibility guarantee.
- Exhaustive O-methylation now supports two to four eligible OH sites in one operation with site-scaled methyl/base demand. The same competing-group exclusions remain. Reverse matching considers retained pre-existing methoxy groups, deduplicates stereochemically identical parents, and preserves batch-size diversity within the existing four-proposal limit. At most six eligible unlabelled methoxy sites and eight cut attempts per batch size are inspected; the search remains bounded and nonexhaustive.
- Twenty-three product-survival and twenty-seven polyol tests cover excess-HX endpoint rejection, newly formed product functionality versus another reagent, current-condition replay, work-up boundaries, three/four-site fixed products, underloading, bounded reverse diversity, retained methoxy groups and one-operation Path Finder/Recipe Tree controls. Prior two-site cases retain their checks; the old three-OH exclusion is replaced by the current five-OH boundary. Five fixed benchmark cases add multi-site endpoints/loading and product-survival expectations.

## One-operation exhaustive O-methylation — 2026-10-31

- Two compatible O–H groups can now be converted to two methoxy groups by one explicit exhaustive transformation, with two methyl-transfer equivalents and two encoded base-activation equivalents. It is a new whole-substrate forward rule and independently replayed disconnection, not post-hoc merging of unrelated route steps or an assumption of selective mono-methylation. Path Finder and Recipe Tree count the operation once.
- The initial scope is one connected neutral C/O diol/diphenol with exactly two eligible OH sites, one methyl bromide/iodide partner and hydride base (or encoded carbonate/weak base for two phenols) in the supported aprotic medium. Competing N/S functions, organic catalysts/nucleophiles, extra partners, epoxides/peroxides, carbonyls, nonaromatic unsaturation and geminal/hemiacetal OH environments are excluded. This is not general polyol permethylation or experimental substrate-specific validation.
- Recorded insufficient methyl or base loading blocks a complete route through the existing stoichiometric-ceiling gate. No singly methylated product distribution is inferred from underloading. The exhaustive ceiling is normalized to the diol/diphenol even if reagent rows are reordered. Existing carbon stereochemistry and forward methyl-carbon isotopes are retained; the initial reverse template uses unlabelled methyl bromide stock and does not silently erase labels.
- Sixty-one focused checks cover five fixed endpoints, forward/reverse replay, one-step Path Finder and Recipe Tree routes, loading bounds, substrate/reagent exclusions, carbonate controls, isotope/stereo retention, saved-route verification and graph immutability. Three fixed benchmark cases check two endpoints and one theoretical underloading ceiling. Reaction-class references support the graph-edit family, not a universal preparative yield.

## Bounded cyclization topology — 2026-10-31

- Ring-closing metathesis, intramolecular Williamson closure, amino-acid lactamization and halolactonization now expose tether connectivity and ring size separately from experimental feasibility. Multiple tether paths, eligible closures or recognized external reactive partners carry explicit unresolved conflicts through planner, saved-route and scope checks. Pendant rings outside the tether do not trigger the cyclic-tether guard.
- Five/eight-membered RCM range and five/six-membered ether/lactam/halolactone ranges remain unchanged. No conformation, actual concentration, strain energy, oligomer distribution or preparative yield is inferred. RCM no longer gives a generic numerical dilution instruction as if it established selectivity; closure-favoring conditions remain an explicit assumption.
- Strict acyclic ether, lactam and acyloin rules now require a single connected input graph. A disconnected cyclic spectator can no longer make the aggregate bond count mimic an acyclic tree. Supported simple closures remain available; ring topology warnings are displayed in Recipe Tree.
- Twenty-eight focused checks cover supported/out-of-range ring sizes, cyclic versus pendant tethers, competing closures and external partners, disconnected-input bypasses, input/outcome immutability, saved-route gates and independently replayed controls.

## Positional-isomer alternatives and provenance — 2026-10-30

- Alkene HX addition (including radical HBr), hydration and hydroboration now distinguish equal-substitution orientations by isotope-preserving constitutional identity. Distinct orientations remain visible as unranked positional alternatives without an assigned ratio; symmetry-equivalent products are not duplicated. Multiple alkene sites and tied rearrangement cases remain unresolved instead of acquiring first-site selectivity. Enumeration is bounded to the selected alkene and is not a comprehensive rearrangement model.
- The shared planner gate, workspace and scope replay reject clean selective preparation for unresolved cases. Ordinary class-directed additions remain available with explicit heuristic warnings. Recipe Tree displays positional-selectivity provenance. Stereochemical mixtures remain a separate assessment.
- Existing aromatic halogenation, Friedel–Crafts, nitration and sulfonation branches retain their alternatives while explicitly identifying site ranking and legacy ratios as heuristics. Scope assigns positional ratios to regioselectivity instead of incorrectly calling them stereo ratios. Reaction cards label these ratios as heuristic and tied addition drawings as unranked. Aromatic alternatives remain nonexhaustive; this batch does not establish experimental isolation or product distributions.
- Forty-five focused checks cover asymmetric/symmetric and isotope-labelled inputs, reversed atom order, fixed product pairs, three addition families, multiple sites, aromatic provenance, scope nonmutation, saved-route gates and Path Finder conflict/control cases. Two source-linked positional reference cases and an ethene status check extend the benchmark; RDKit independently compares the fixed positional product sets with stereochemistry removed only for these explicitly connectivity-scoped fixtures, retaining isotopes. Existing stereochemical fixtures keep their original identity checks.

## Route boundaries and endpoint work-up records — 2026-10-30

- Saved routes persist isolated/fresh-mixture versus carry-over boundaries, with legacy/generated defaults explicitly labelled model assumptions. Import and direct validation preserve one-pot intent instead of dropping it. Unsupported carry-over makes the route unverified even when every individual graph edit replays; overall yield and scale planning remain unavailable for that route.
- Potential carry-over notes reuse recorded input classes: sensitive reagent to protic/acidic next stage, protic/acidic medium to sensitive reagent, and oxidant/reductant combinations. They do not calculate residual amounts, identify the actual post-reaction mixture or establish experimental safety. Isolated-mode boundaries remain assumptions about separate preparation, not proof of isolation or purity.
- Endpoint work-up records are assumed, described in a record, or none. Explicitly recording no work-up blocks the neutral endpoints of the finite Grignard/LAH/DIBAL set whose encoded models include separate work-up, including final products. Descriptions are retained as unvalidated records and never interpreted as procedures. Other classes are explicitly outside this work-up requirement list.
- Workspace controls edit and persist the assumptions; JSON/CSV, route comparison and Recipe Tree display them and their verification consequences. Explicit cascades retain structured boundary reports and keep carry-over unsupported. Existing independent-step chemistry checks and search budgets are unchanged.
- Forty-two focused model checks and four DOM/persistence checks cover legacy defaults, one-pot import/direct-validation bypasses, work-up omission, potential conflicts, JSON/CSV, scaling gates, stale/invalid records, input immutability, cascade handoffs and final endpoints.

## Coupling selectivity and ether-route overlap — 2026-10-30

- Suzuki, Heck and Sonogashira branches record ambiguity when recognized substrates contain several eligible halide/partner sites, or the same mixture enables multiple coupling families. Counts include every matching boron group and terminal unsaturated bond, without double-counting the two orientations of ethene/acetylene. First-site ordering is not treated as validated selective mono-coupling.
- Mitsunobu and Williamson remain distinct, forward-verified alternatives for suitable ethers under separately specified recipes. A mixture enabling both alcohol activation and halide displacement now carries an explicit activation-overlap conflict. Multiple alcohol, acidic partner, oxygen donor or halide sites are flagged; preformed-alkoxide Williamson branches are included. No dominant pathway or product ratio is inferred from display scores.
- Structured conflicts pass through the shared Path Finder/Recipe Tree/protection assessment and saved-route validation. Scope replays recompute the metadata for the current inputs. Existing low-temperature Heck, copper-free Sonogashira and Cu/oxygen caveats are surfaced as structured review warnings, preserving the difference between uncertainty and an encoded conflict.
- Fifty-two focused checks cover single/multiple sites, alternative coupling pathways, ethene/acetylene controls, mixed versus separate ether recipes, retained inversion, independent saved-route checks, stale metadata, required bases and condition review. Browser interaction and experimental substrate-specific compatibility remain outside this regression set.

## Complete-input Grignard compatibility — 2026-10-30

- The four supported Grignard families now screen complete recorded structures before species classification strips components. Neutral O–H/N–H/S–H and nonmetalated terminal-alkyne H/D donors are checked regardless of reactant, reagent, catalyst or explicit solvent role. Existing metalated alkynyl donors are excluded from the free-terminal-alkyne guard.
- Newly recognized S–H/terminal-alkyne conflicts return bounded hints without inventing isotope transfer, acetylide follow-up chemistry or clean addition products. Formation and CO2/nitrile branches share the donor guard. This is a conservative finite model, not a calculation of loading-dependent competition.
- Carbonyl/nitrile groups on auxiliary inputs block unopposed addition/formation claims. Organic reagent-role electrophiles enter the existing chemoselectivity/planner gate; amides and explicit CO2 join the encoded organometallic susceptibility list. CO2 endpoints now participate in the same competing-site audit; nitrile branches exclude competing amide/acyl-derivative inputs. Saved-outcome scope checks explicitly report donor and reactive-auxiliary conflicts. No generic protection compatibility is assumed.
- Seventy-eight focused checks cover four families, isotope-labelled donors, complete-input roles, same-molecule sites, inert controls, a metalated alkynyl control, graph immutability and saved-outcome audits. Four fixed negative benchmark cases assert unsupported clean endpoints, not chemical inertness. Reaction-class references are recorded in the evidence catalogue.

## Additional-input redox compatibility — 2026-10-30

- Selected forward branches now audit other explicitly recorded reactants against the existing susceptible-site model. An input omitted from consumption is no longer silently treated as inert. Records retain its structure, group and site multiplicity; no competing products, rates or survival guarantees are invented. Solvent and catalyst roles remain outside this additional-reactant check.
- These conflicts use the existing route-assessment gate shared by Path Finder, Recipe Tree candidate generation and collapsed protection sequences. Reaction and query-scope displays retain the warning while leaving the modeled branch inspectable.
- DMP now uses the shared alcohol susceptibility entry instead of a query-only fallback. Ordinary Jones alcohol susceptibility excludes tertiary alcohols, matching the existing oxidizable-alcohol definition.
- Twenty-six focused checks cover multiple alcohol/carbonyl inputs, inert and tertiary-alcohol controls, NaBH4 ester retention, DMP bulk oxidation, PCC, Jones site classification, input roles/order, all alternate branches, scope propagation, fresh-mixture reauditing of saved outcomes, protection-sequence assessment and input immutability. This is a finite encoded compatibility screen, not general experimental validation.

## Transparent route-ranking criteria — 2026-10-30

- Path Finder now orders discovered routes lexicographically by actual operations, protection operations, recorded scope gaps, structured stereo concerns, minor-product selections, distinct extra building blocks, stock tiers, process-material entries and building-block size. Collapsed protection sequences count every operation. Search budgets, route acceptance and chemical verification remain unchanged; ranking applies to the routes found within those limits. Per-sort rank computation is cached without stale cross-job state.
- Recorded scope gaps mean absent/uncurated scope, missing reaction-class references, missing outcome or loading-model records and encoded heuristic ratios. Assumption/limitation text length is not scored. These flags do not assess unencoded chemistry or establish experimental confidence.
- Recipe Tree default scoring now uses exposed contributions for operations, sequence length, protection, feedstocks/materials, stock, structured stereo concerns, scope gaps, minor products and the existing convergence/simplification preferences. The historical modeled yield/factor field remains available for compatibility but is excluded from the default score. It is not an experimental yield.
- Comparison cards display the same ranking counts and gap explanations, including materials from collapsed protection sequences. Recipe Tree shows a heuristic points breakdown. No-solvent entries add no material burden.
- Twenty-eight focused policy checks cover protection expansion, metadata gaps, stereo/minor selection, building-block identity and counts, material burden, documentation-verbosity invariance, score decomposition, conversion-factor independence and nonmutation. Existing Path Finder ordering assertions now check the full declared order rather than an obsolete single-field position.

## Recorded loading and stoichiometric ceilings — 2026-10-30

- Consumed-input amounts now expose an explicit stoichiometric-upper-bound basis and sufficient/limited/unknown completion status. Unconvertible or invalid recorded units no longer fall through parseFloat to one equivalent. The ceiling is normalized to the first listed consumed reactant, so excess partners do not create a false limit. The legacy conversion field retains the numerical ceiling, not a predicted yield or product distribution.
- Raw, saved-route, scope and staged checks reject recorded underloading or unresolved quantities as evidence of complete conversion. One equivalent of Grignard in an ester double-addition does not invent selective ketone isolation; hydride ceilings retain the existing ideal four-hydride consumption model and its practical-loading caveats.
- Generated recipes may raise unspecified amounts to at least the encoded net demand, then must replay those recorded quantities. Explicit supplied amounts are preserved. Protection sequences, stereochemical replays and independent forward checks carry the planned equivalents. This is a theoretical recipe assumption, not a reagent-loading recommendation.
- Staged reactions preserve explicit reagent equivalents instead of replacing every amount with one. Absolute stage quantities are rejected without a carried-material scale. The reaction display calls the result a stoichiometric ceiling and shows unknown amounts as unresolved.
- Sixty-one focused checks cover ester–Grignard and hydride bounds, multiple sites, absolute-unit normalization, invalid/unconvertible units, explicit-versus-planned amounts, stage records and saved-route completion. Four fixed benchmark cases assert theoretical loading ceilings independently of product identity. Prior staged/scaling fixtures now use sufficient reagent; the 75% scaling example is an explicit yield assumption rather than an underloading ceiling.

## Reactive solvents and Grignard preparation limits — 2026-10-30

- The carbonyl, CO2 and nitrile Grignard branches now identify electrophilic carbonyl/nitrile motifs in recorded solvent structures. Acetone, ethyl acetate, acetonitrile and DMF no longer silently act as inert media; these branches return an unresolved solvent-competition hint rather than inventing products or calling the competition proton quench. Ether/THF cosolvents do not hide a reactive component.
- Isolated Grignard formation uses the same solvent check and rejects listed carbonyl/nitrile electrophiles on the halide precursor or other inputs. This is a bounded compatibility guard, not a model of intramolecular trapping, Barbier chemistry or all incompatible functional groups.
- Scope assessment identifies reactive recorded solvents and invalidates stale ether-based outcomes after the medium changes. Existing protic quench behavior remains separate. Acetone, esters and nitriles remain supported explicit substrates in the appropriate existing ether-based branches. Other solvent chemistry and competition ratios remain unmodeled.
- Seventy-three focused checks cover four reaction families, reactive/mixed solvents, dry-ether controls, incompatible formation precursors, explicit substrate roles, unchanged input graphs and raw/saved-route verification. Four fixed positive reference cases and two unsupported-clean-endpoint cases document the intended scope; the negative cases do not claim chemical inertness.

## Bounded permanganate condition regimes — 2026-10-30

- Alkene hydroxylation now requires recorded water medium, hydroxide, no strong acid and the cold model range (<=10 C). Alkene cleavage and alkyl-benzylic oxidation use the separate heated aqueous neutral/acidic range (>=60 C). These are conservative implementation bounds, not universal experimental transition temperatures. Intermediate temperatures, other/mixed media, unspecified pH for the cold branch and hot alkaline salt endpoints return unresolved-regime hints.
- Cold dilution remains an explicit assumption, not a calculation from generic concentration text. Neutral hot-branch acids represent work-up endpoints; oxidant consumption and kinetics remain unquantified. Existing standalone alcohol oxidation is a separate branch.
- Recognized alkyl benzylic C–H sites are susceptible only in the supported hot regime. Alkene/alcohol-only drawings that leave those sites unchanged now trigger the existing compatibility gates; cold branches do not inherit this competition. Tertiary alcohols are excluded from ordinary permanganate alcohol susceptibility. Net cleavage/side-chain outcomes record their substrate participation so auditing no longer silently skips them.
- Forty-two focused checks cover regime boundaries, aqueous/acid/base/solvent requirements, unresolved cases, exact products, isotope retention, condition-specific competition, stale-condition audits and unchanged inputs. Three fixed source-linked product cases exercise cold hydroxylation, hot cleavage and benzylic oxidation.

## Stereochemical outcome and precursor fidelity — 2026-10-30

- Qualitative Felkin component drawings are now labelled as parts of a diastereomeric mixture rather than single-enantiomer preparations. Only components that differ stereochemically across the drawn pair receive the label; unchanged achiral coproducts are excluded. The existing illustrative ratio remains a heuristic, not measured selectivity.
- Specified tetrahedral targets cannot pass raw forward verification, retrosynthesis classification or saved-route verification using a product labelled racemic/diastereomeric. Fully unspecified targets are not interpreted as requests for stereopurity. This adds no resolution or separation step.
- Stereo-classified precursors are now replayed and stored as the actual verified inputs/products, rather than retaining an earlier connectivity-only replay. Independent forward checking uses the recorded isomeric precursor structure. Existing chiral sulfonylation and esterification routes remain valid.
- Thirty-two focused checks cover SN2/Mitsunobu inversion for both enantiomers, retention of remote centers, unchanged inputs, unspecified starting configuration, Felkin mixture rejection through route layers and faithful recorded chiral inputs. Six fixed stereochemical product cases are independently canonicalized by RDKit; these are reaction-class deductions, not substrate-specific experimental or stereopurity claims.

## Borohydride competition on multifunctional substrates — 2026-10-30

- The NaBH4 susceptibility model now includes acyl chlorides. A drawn aldehyde/ketone-only reduction that leaves an acyl chloride is labelled unresolved competition and rejected by the existing route/retrosynthesis compatibility gates. No clean acyl chloride reduction product is invented; the standalone unsupported case now gives an accurate reactivity hint rather than claiming NaBH4 is simply too mild.
- Competition warnings describe encoded susceptibility without inventing a mixture composition or quantitative kinetic preference. Ester/amide/acid spectator wording applies only when those groups are actually present.
- Forty-three checks cover mixed aldehyde/ketone-acyl chlorides, isotope-labelled input, solvent variants, benign ester/nitrile/amide controls, input immutability, primary-source attribution and rejection through retrosynthesis and Path Finder. The source supports acyl chloride reactivity, not selective outcomes for the invented mixed-function fixtures.
- Added two fixed reference selectivity patterns from Chaikin and Brown (JACS 1949, DOI 10.1021/ja01169a033): carbonyl reduction while retaining a nitro group or alpha bromide. No substrate-specific yield or stereopurity is asserted.

## Current-engine benchmark and independent oracle refresh — 2026-10-30

- Chemistry benchmarks now load the current application script list/order instead of an outdated engine subset. Four fixed, source-linked cases cover mild/strong hydride behavior with an aldehyde/tert-butyl ester, primary-versus-tertiary alcohol oxidation and labelled carbonyl oxygen retention. Expectations are written independently of app output.
- Benchmark coverage rises from 209 to 221 assertions. The RDKit oracle independently checks exported products/structures and records hashes for both fixture files plus loaded app scripts; source links from both fixture sets are retained. Toolkit agreement is structural validation, not evidence that a reaction works experimentally.

## Acyclic Cope reverse coverage — 2026-10-30

- Added a reverse Cope bond exchange for supported carbon-only acyclic diene chains. The existing forward rule must reproduce the exact target; degenerate exchanges, heteroatom-containing substrates and unsupported chain topology are excluded. Existing direction-selection and equilibrium heuristics remain limitations.
- Twenty-five checks cover substituted dienes, carbon isotope retention, unchanged input graphs, unsupported/degenerate cases, heat gating and an independently replayed one-step Path Finder route. No quantitative equilibrium or yield model is added.

## Search queue omission diagnostics — 2026-10-30

- Pending-queue overflow now sets the existing truncated flag and counts omitted branches rather than silently dropping them. The user explanation identifies queue capacity as a limit. Duplicate branches do not create false omissions; omitted entries are not marked visited. Search budgets are unchanged.
- Seven queue regressions cover capacity, duplicate handling, reporting and subsequent admission after space becomes available.

## Transparent route-material tie-breaker — 2026-10-30

- Path Finder retains its existing step count, inventory, size and minor-product priorities, then breaks otherwise equal ties by distinct reagent/solvent/additive entries. Equivalent reagent SMILES and repeats across steps are deduplicated; this is a materials-list heuristic, not cost or feasibility prediction.
- Seven ranking regressions cover duplicate/equivalent identities, conditions, legacy reagent records, repeated steps and unchanged preceding priorities.

## Recorded reduction-medium conflicts — 2026-10-30

- Scope assessment now reports a conflict for LiAlH4 with recorded water/protic reaction medium, distinguishing reaction conditions from subsequent work-up. This reuses the existing reagent/protic-solvent model and does not infer rates, loading or work-up ordering from free text.
- Seven checks cover water/alcohol solvents, mixed solvent, dry ether/THF and the distinct NaBH4 branch.

## Stereochemical scope reporting — 2026-10-30

- Scope reports now expose stereo metadata for principal and minor products, warning about racemic/diastereomeric mixtures and relative-only configurations. Encoded product ratios are explicitly marked as heuristics rather than measured selectivity.
- Eight checks cover a real achiral ketone reduction, mixture and relative metadata, minor products, absent ratios and outcome immutability. This improves uncertainty reporting; it does not add an asymmetric catalyst model.

## Chemoselectivity audit consistency — 2026-10-30

- Tert-butyl esters retain their protection-group label while entering the LiAlH4/organometallic susceptible-site models as esters. NaBH4 retains its narrower aldehyde/ketone scope. This aligns auditing with the existing forward edits; it adds no claim of measured rates or selectivity.
- Predictor warnings and the query audit share the same PCC alcohol-site filter: tertiary alcohols without a carbon-bound hydrogen no longer count as oxidizable competing sites.
- Susceptible groups are counted across all product components, so a secondary component cannot hide an unchanged competing group. Acid-to-ester masking advice is suppressed for reagent classes that also attack esters; applicable acetal advice remains available.
- Added 15 focused regressions covering mixed ketone/ester substrates, exact bulk and mild-reduction products, polyol susceptibility, protection advice and secondary-product accounting. Reaction-class reference: [OpenStax 21.6, Chemistry of Esters](https://openstax.org/books/organic-chemistry/pages/21-6-chemistry-of-esters).

## Claisen rearrangement routes — 2026-10-30

- Added vinyl and aromatic Claisen reverse methods using the existing six-atom bond exchange. Proposals require forward replay; existing ortho-selection and substituted-allyl heuristics remain authoritative.
- Vinyl routes reconstruct allyl vinyl ethers from supported unsaturated aldehydes/ketones. Aromatic routes reconstruct allyl aryl ethers from ortho-allyl phenols. Both use explicit heated conditions and work through Path Finder.
- Added 49 checks for exact product identity, unchanged input graphs, isotope retention, heat gating, unsupported substitution/distance patterns and independently replayed planner edges.

## Imine, enamine, ether and ammonium-elimination routes — 2026-10-30

- **Four additional reverse methods:** imines from carbonyls and primary amines, enamines from carbonyls and secondary amines, aryl alkyl ethers from alcohols/phenols by Mitsunobu substitution, and terminal alkenes from alkyltrimethylammonium precursors by Hofmann elimination. Each proposal requires the existing forward engine to reproduce its target, and all four methods work through Path Finder.
- **Explicit partners and limits:** amines and phenols remain separate precursors subject to inventory policy. Oximes/hydrazones are excluded from the imine matcher; aromatic amine-like motifs and unsupported substitution patterns are not proposed as enamines. Mitsunobu ether proposals exclude tertiary alcohols and diaryl/dialkyl ethers. Hofmann proposals are bounded to terminal alkenes, with trimethylammonium leaving groups and heated hydroxide conditions.
- **Atom/stereo regression coverage:** forward fixtures verify nitrogen-isotope retention in imines/enamines, carbonyl-oxygen loss in condensation, phenol oxygen retention/alcohol oxygen loss in Mitsunobu ethers, the encoded inversion of a specified secondary alcohol, and nitrogen-label retention in the Hofmann amine coproduct. These checks exercise existing forward behavior; no new experimental isotope-origin or stereopurity claim is inferred.
- **Focused checks:** 79 reverse/planner checks and 23 forward/scope/isotope/stereo checks cover exact replay, target immutability, custom amine inventory, reagent exclusions, unsupported targets and labelled coproducts. Existing pH, equilibrium, water-removal and substrate-selectivity warnings remain applicable.


## Pinacol, Birch, magnesium insertion and haloform routes — 2026-10-30

- **Four additional reverse methods:** ketones from supported Pinacol vicinal-diol rearrangements, isolated nonconjugated cyclohexadienes from Birch arene reduction, Grignard reagents from organic halides and magnesium, and carboxylate anions from methyl-ketone haloform cleavage. Every proposal still requires exact forward replay; the existing migration/regioselection heuristics and reagent compatibility limits remain authoritative.
- **Planner integration:** all four methods connect supported one-step endpoints. Pinacol proposals include selected hydride and carbon-group shifts. Birch proposals exclude fused/shared-ring systems and require the encoded alcoholic solvent/reductant combination. Magnesium insertion includes ether, Mg and inert-atmosphere conditions; Mg exclusions and encoded protic conflicts apply.
- **Explicit carboxylate endpoint:** haloform retrosynthesis targets the encoded carboxylate anion, without inventing neutralizing work-up or a counterion. The corresponding methyl ketone, iodine and hydroxide are shown explicitly. Neutral acids and disconnected salts are outside this reverse proposal's verified endpoint scope.
- **Haloform carbon identity:** cleavage now detaches and reuses the original methyl carbon instead of deleting it and creating an unlabelled replacement. A methyl-carbon isotope label therefore remains in haloform; a carbonyl-carbon label remains in the carboxylate. Hydrogen/isotope exchange and experimental selectivity are not simulated.
- **Focused checks:** 68 reverse/planner checks and 25 forward/scope/isotope checks cover exact replay, target immutability, rearrangement variants, arene/diene bounds, reagent exclusions, protic conflicts and carbon-label fate across both cleavage products.


## Metathesis, trans-alkene and Cannizzaro alternatives — 2026-10-30

- **Four additional reverse methods:** five- to eight-membered ring-closing metathesis, cross-metathesis of two terminal alkenes, dissolving-metal reduction of an acyclic internal alkyne to a trans alkene, and a primary alcohol from a non-enolizable aldehyde by Cannizzaro self-disproportionation. Each proposal requires the existing forward model to reproduce the target.
- **Planner constraints:** all four methods work through Path Finder. Both cross-metathesis partners remain explicit; custom inventory must supply the second building block. Cis requests are rejected under the encoded trans-only cross-metathesis/reduction branches. Ring-size, substitution and substrate exclusions remain bounded; metathesis geometry is the existing model heuristic, not an experimental selectivity claim.
- **Cannizzaro atom identity:** the hydroxide oxygen is copied into the carboxylate coproduct rather than replaced by an unlabelled new atom. This preserves oxygen-isotope labels alongside both aldehyde oxygen atoms. The two-aldehyde-equivalent requirement and separate alcohol/carboxylate products are retained. Isotope exchange, proton-transfer trajectories and experimental product ratios are not simulated.
- **Focused checks:** 76 reverse/planner checks and 22 forward/scope/stoichiometry/isotope checks cover the new methods, target immutability, exact replay, partner inventory, rejected cis requests, ring bounds and labelled coproduct oxygen.


## Nitrogen condensations and Paal–Knorr routes — 2026-10-30

- **Four forward-verified reverse methods:** oxime and hydrazone formation, Paal–Knorr furan synthesis, and Paal–Knorr pyrrole synthesis with ammonia or a primary amine. Hydroxylamine, hydrazine and pyrrole nitrogen donors are explicit precursors subject to inventory checks. Unsupported substituted donors and non-reproduced selective carbonyl conversions remain excluded.
- **Multiple condensation sites:** supported complete dioxime formation can reverse all matched sites together. Target structures are preserved during matching; each proposal still requires the existing forward engine to reproduce the complete target.
- **Condensation atom identity:** the carbonyl oxygen is removed and the actual nitrogen reagent atoms are copied into the product. This fixes an oxygen-isotope label incorrectly becoming a nitrogen-isotope label and preserves donor nitrogen/oxygen isotope labels. Explicit hydrogens on the attacking nitrogen are removed when forming C=N. This is net atom handling, not a balanced water/isotope-exchange model.
- **Pyrrole donor identity:** the ammonia nitrogen is copied instead of replaced with an unlabelled new atom; labelled-ammonia pyrrole products now retain their nitrogen label.
- **Focused checks:** 82 reverse/planner checks and 34 forward/isotope/scope checks cover the four methods, full target replay, unchanged target graphs, inventory requirements, labelled donors, carbonyl-oxygen loss, multiple carbonyls and negative controls. Existing E/Z-mixture and reaction-scope limitations remain visible.


## Acyl-substitution route alternatives — 2026-10-30

- **Four additional reverse methods:** carbodiimide amide coupling, Steglich esterification, methyl-ester aminolysis, and methyl/ethyl transesterification. Every proposal requires the existing forward engine to reproduce its target; cyclic acyl cuts and unsupported coupling partners remain excluded. The Steglich proposal includes DCC and DMAP; ester aminolysis supports explicit ammonia for primary amides.
- **Explicit incoming alcohol:** transesterification retains methanol or ethanol as a solvent-role precursor, so custom inventory cannot invent the carbon-containing alcohol. The donor is the opposite methyl/ethyl ester rather than a no-change exchange. Broader incoming alcohols are outside this reverse proposal's bounds.
- **Reagent recognition:** DCC/EDC formula matches now require neutral N=C=N connectivity. Same-formula diimine controls previously triggered false amide/ester coupling predictions; they are rejected. Supported DCC and EDC reactions retain their existing product and evidence behavior.
- **Regression coverage:** 66 reverse/planner checks and 20 forward/reagent checks cover all four methods, exact products, intended forward outcomes, negative targets, isotope/stereo preservation and custom inventory. Recipe Tree now includes the independently verified Steglich alternative with its complete acid-preparation branch, while enforcing the existing depth limit.


## Alpha-bromination, sulfur substitution and decarboxylation — 2026-10-30

- **Four additional reverse transforms:** HVZ alpha-bromination of carboxylic acids, alcohol sulfonate formation, amine sulfonamide formation, and ketone formation by beta-keto-acid decarboxylation. They reuse the existing sourced forward rules; shape matches remain proposals until forward replay reproduces the target. Sulfonyl precursors outside the forward engine's recognized reagent scope remain unavailable through these transforms.
- **Path Finder integration:** all four methods connect supported one-step endpoints. Sulfonylation includes an explicit sulfonyl-chloride building block and triethylamine conditions. A chiral alcohol route retains its specified stereocentre, and an isotope-labelled sulfonate keeps its label.
- **Sulfur reagent accuracy:** mesyl/tosyl chloride recognition now requires the actual sulfonyl-chloride bond pattern. A same-formula sulfinyl-chloride isomer previously triggered an incorrect mesylation product; that false positive is rejected. The leaving chloride is selected from its bond to the matched sulfur.
- **Focused validation:** 63 reverse/planner checks and 18 forward/scope checks cover the new methods, exact molecular identities, intended forward outcomes, negative controls, unchanged target graphs, stereo/isotope preservation and the reagent-isomer regression. These are bounded structural-model checks, not experimental feasibility or selectivity estimates.


## Route depth and reaction multiplicity — 2026-10-30

- Retrosynthesis enumeration now enforces the remaining operation budget separately on each branch. Shared intermediates expanded at a shallower graph depth cannot expose longer recipes beyond the requested depth. Explicit protection/reaction/deprotection operations each consume a step; independent convergent branches retain their own remaining budget.
- Reaction outcome deduplication now includes product multiplicity. Different product amounts remain distinct, while repeated entries and explicit counts for the same molecular identity normalize to one multiset regardless of product order. Existing stereochemical identity handling is retained.
- Regression checks cover shared intermediates, exact depth boundaries, protection triplets, convergence, multiplicity and product order. The recipe-tree integration check now requires depth three for the three-operation acyl-chloride route rather than accepting it under depth two.


## Retrosynthesis search quality — 2026-10-27

- **Stereochemistry-safe stock endpoints:** bounded retrosynthesis search now compares full molecular identity before treating a stock record or a Grignard reagent's parent halide as an available precursor. Connectivity-only, name-only and opposite-enantiomer matches cannot silently terminate a route; the policy now matches Path Finder inventory handling.
- **Convergent-route scoring:** linear routes still multiply encoded step yields. Independent branches now use their weakest cumulative branch as a conservative planning bottleneck instead of multiplying all branches as if they were serial operations. This removes an artificial penalty on convergent routes; it remains a ranking heuristic, not an experimental yield prediction or a stoichiometric material-flow model.
- **Regression coverage:** eight focused checks cover linear and convergent yields, yield filtering, invalid connectivity and enantiomer stock matches, exact stereochemical stock, and Grignard fallback identity.

## Staged predictions, protected routes and reference comparisons — 2026-10-23

- **Explicit reaction stages:** the Path Finder now has a staged-reaction editor. Up to six declared stages carry one explicitly selected product into a fresh mixture and retain the other product/minor/byproduct branches as records. Ambiguous choices stop for selection; unresolved partial conversion and compatibility conflicts block continuation. Every selected edge is independently forward replayed and complete staged routes can be saved. This is not a kinetic cascade, a balanced material-flow model or a one-pot compatibility prediction.
- **Substrate and site review:** Reactions, route comparison and the workspace show recognized input functional groups with atom indices, which sites are susceptible in the encoded reagent model, and whether the selected branch was reproduced. Single recognized sites, multiple susceptible sites, unestablished partial-conversion alternatives and encoded conflicts are distinguished. No relative rates, product ratios or universal site-selectivity scores are invented.
- **Two-mask route coordination:** explicit route masks can request an amine mask (Boc, Cbz or Fmoc), optionally with TBS for an alcohol. The coordinator tries bounded installation orders, up to four prospective protected endpoints, a main Path Finder search, and compatible final removal orders. Starting installations require a unique eligible site. Prospective endpoint variants are proposals, and only independently reproduced main routes survive. Every installed group must remain present through each main step; all operations count toward the 1–10 step setting and obey material/rule filters. A benign amino-hydroxy aldehyde reduction supports a five-step Fmoc/TBS example. Unencoded orthogonality, including the current general Boc/fluoride case, remains unsupported.
- **Whole-route ledger:** route comparisons and saved routes show the recognized protecting-group counts installed, retained and removed at each step, with preservation conflicts. Recognized motifs can also be native functionality; detection alone does not establish intent or necessity. Explicit masks express a user request, not an automatic claim that masking is chemically needed or optimal.
- **Condition-specific scope:** selected rules are replayed against recorded conditions. Unrecognized IDs, normalized/clamped values, uninterpreted time/concentration text, missing scope and unsupported susceptible-site models stay visible as uncertainty. A reproduced branch means agreement with the current encoded scope, not experimental feasibility.
- **Reference routes:** four benign cases distinguish a documented university preparation from composed teaching examples. The MiraCosta wintergreen-to-salicylic-acid-to-aspirin sequence currently reproduces one of two expected edges; other exercises reproduce two of two, one of one and one of two. Unsupported edges remain coverage gaps. These are known-edge replays rather than blind synthesis discovery or a general accuracy estimate. See `REFERENCE-ROUTES.md` for sources and work-up distinctions.
- **Focused validation:** eight scope checks, eight stage checks, nine reference checks and ten protection-program checks pass. A DOM smoke check also mounts the new panels, saves a staged route and renders a five-step protected route. No full browser/RDKit regression rerun was used for this release.

## Planner inspection and compatibility — 2026-10-23

- **Inspectable atom correspondence:** Reactions, route comparison and saved routes can show heavy-atom input/product pairs and formed, broken or order-changed bonds. Source atom indices refer to each listed input SMILES. Detached input atoms are shown explicitly; omitted atoms are not treated as a balanced byproduct equation. Mapping preserves element/isotope identity and uses injective assignments across multiple inputs. It is a bounded minimum-edit heuristic, with explicit symmetry, incomplete-input and search-limit messages; it does not establish mechanism, hydrogen transfers or experimental atom origins.
- **Stricter substrate gates:** unresolved competing-site annotations and unestablished partial-conversion alternatives are excluded from planner candidates. Existing retained-group survival and proton-donor checks are reused. Each operation in an automatic protection sequence is assessed separately. Bulk conversion of multiple groups is allowed when no competing site is left. Saved route verification recalculates these checks rather than trusting a historical status. Unencoded chemistry remains outside these checks.
- **Search and rejection explanations:** breadth-first depth ordering now uses graph-count similarity to the requested starting material as a tie-breaker, without pruning dissimilar intermediates. Search limits remain bounded. Path Finder shows up to 12 rejection examples, including forward-product mismatches and compatibility reasons; single-step retrosynthesis also displays excluded substrate conflicts. Sources still document reaction classes rather than validating a queried substrate.
- **Validation:** 17 focused planner/mapping checks and the existing 10 complex-substrate integration checks. No full regression, browser or RDKit rerun for this update.

## Complex-substrate planning — 2026-10-23

- **Multiple installed groups:** Path Finder can seed compatible removal sequences of up to four separately counted steps. Boc/Cbz and Boc/Fmoc examples support complete removal and selected one-group removal. Every edge is forward reproduced and checked for retained-group compatibility. Existing reagent/rule/inventory filters and depth limits apply. Unknown survival, repeated-group selective cleavage and collateral hydrogenation are rejected; this is not general simultaneous multi-group installation.
- **Site alternatives:** two bounded generators show inequivalent one-site oxidation products for polyols with PCC/DMP and reduction products for polycarbonyls with NaBH4. Equivalent outcomes deduplicate; names identify the input carbon index and the Reactions view displays the selected site. These are partial-conversion alternatives with no assigned kinetic preference or ratio. They are withheld from verified retrosynthesis routes, and saved steps remain unverified as selective preparations. The catalog now has 156 descriptors, including these two inspection generators.
- **Broader coupling substrates:** source-bounded Kumada chemistry covers selected pyridyl/thienyl electrophiles and 2-pyridyl/2-thienyl Mg donors. Stille supports 2-thienyl trimethyl/tributylstannanes with exact ligand topology. Unsupported NH heterocycles, furyl cases and incompatible reactive groups remain excluded; Negishi retains its prior scope.
- **Focused checks:** 10 integration checks, eight multi-group sequence checks, 10 heteroaryl checks and the existing 10 coupling checks pass. No full browser/RDKit regression rerun was used for this update. Source references and explicit substrate limits accompany the implementation.

## Family expansion — 2026-10-23

- **154 sourced rules, 24 new families:** MPV reduction, Oppenauer oxidation, Tishchenko ester formation, Perkin condensation, Darzens glycidic esters, benzilic acid rearrangement, Hunsdiecker bromodecarboxylation, Kolbe–Schmitt carboxylation, McMurry coupling, acyloin cyclization, isocyanate urea/carbamate formation and hydrolysis, isothiocyanate thiourea formation, aldoxime dehydration, amide thionation, thiourea alkylation/isothiouronium release, Paal–Knorr thiophenes, Hantzsch thiazoles, amino-acid lactamization, and Negishi/Kumada/Stille cross-couplings.
- **17 new reverse transforms:** useful precursors are proposed through the existing forward verifier. Darzens disconnection first opens the epoxide ring before separating the precursor fragments.
- **Reagent access:** new catalyst/reagent condition choices register with the application; common isocyanate, isothiocyanate, oxime, thiourea and thioamide names resolve locally. Each rule records its specific conditions, substrate exclusions, sequential work-up assumptions and reaction-class sources.
- **Focused validation:** 69 new product/exclusion/reverse checks passed, plus syntax checks for the eight new modules and catalog integration confirming sources/scopes for all 154 rules. The full browser, RDKit and historical regression suites were intentionally not rerun for this expansion; their saved reports identify the earlier source versions they checked. These are bounded structural models, not experimental feasibility or yield predictions.

## Protection compatibility and nitrogen chemistry — 2026-10-22

- **130 sourced rules:** eight new bounded families cover pyridine N-oxidation/deoxygenation, Cope elimination, Gabriel alkylation/hydrazinolysis, imine/enamine hydrolysis and Curtius rearrangement with aqueous work-up. Eight matching reverse transforms are forward checked; exact coproduct counts, isotope fate and migrating stereochemistry are tested.
- **14 protecting-group motifs:** the registry distinguishes Boc, Cbz, Fmoc, TMS/TBS/TIPS/TBDPS and other silyl ethers, benzyl/PMB ethers, acetals/ketals, and tert-butyl/methyl/benzyl esters. A detected motif does not prove that the user intended it as protection. The searchable Reactions reference lists installation/removal classes and sources. Recognition is broader than automatic planning.
- **Condition-specific checks:** acid, base, fluoride, hydrogenolysis, hydride, organometallic and oxidative liabilities produce compatible/conflict/unknown reports with reasons. Unhandled reagents or regimes remain unknown even alongside a recognized base. Carbamate N–H is still protic; Boc is not a universal Grignard solution. Relative cleavage rates and general orthogonality are not assumed.
- **Stronger verified routes:** the supported amine-versus-alcohol acylation case can use Boc, Cbz or Fmoc; a separate TBS alcohol protection/Grignard/fluoride-removal sequence is supported. Every installation, main reaction and removal is independently forward checked, with collateral-site compatibility checks and separate step counts. Conflicting or unknown preserved groups reject planner branches. Unsupported selective installation/removal across equivalent multiple sites is excluded.
- **User controls and audit trail:** Path Finder can disable new protection or allow only listed group IDs. Preservation reports appear in Reactions, route comparisons and the workspace; CSV exports include recalculated status/reasons, while JSON preserves the stable planned-group ID and rationale. Structural workspace verification remains distinct from compatibility and experimental validation.
- **Hydrogenolysis consistency:** the encoded Cbz/benzyl cleavage endpoint now includes reduction of C=C/C≡C and nitro groups on the same molecule, preventing an invented selective deprotection endpoint. Substrate-specific catalyst selectivity remains outside the model.
- **Validation:** 27 default suites, 544 independent RDKit checks (42 structures, 18 identity pairs, 48 reaction fixtures and four explicit protection routes), and 70 Chromium desktop/mobile-emulation checks. These are finite regression checks, not general accuracy or experimental-feasibility estimates.

## Expanded reaction engine — 2026-10-22

- **122 sourced rules at that release (17 new):** acid-anhydride hydrolysis, alcohol/phenol acylation, aminolysis, reduction and formation; gamma/delta hydroxy-acid lactonization; Rosenmund reduction; peracid aldehyde oxidation; tertiary-amine N-oxidation and N-oxide deoxygenation; aryl-sulfoxide deoxygenation; thiol acylation; thioester and sulfonyl-chloride hydrolysis; selective peroxide nitrile hydration; photochemical thiol–ene addition; and intramolecular Williamson five/six-membered ether formation.
- **13 new reverse transformations:** added to the existing planner with forward verification, isotope/stereo checks and explicit scope limits. Reversible or multi-product reactions do not imply a uniquely preferred synthesis.
- **Reagent access:** named inputs include acetic/formic anhydride and PCl3; the condition selector has a dedicated Pd/BaSO4 Rosenmund catalyst. Ordinary Pd/C is not treated as equivalent.
- **Chemical identity fix:** imported N-oxides and nitro groups retain N+–O− charges instead of becoming invalid neutral pentavalent N=O structures.
- **Consistent endpoints:** cold alkaline-peroxide nitrile hydration reports the encoded amide endpoint without also asserting exhaustive acid hydrolysis. All anhydride/thioester coproducts and repeated product counts are independently checked.
- **Validation:** 23 default suites pass, with 465 independent RDKit checks covering 42 structures, 18 identity pairs, 37 reaction fixtures and one encoded protection route; 60 Chromium desktop/mobile-emulation checks cover the integrated application.

Rules are bounded structural models. Sources document the reaction classes; neither source coverage nor RDKit agreement establishes experimental feasibility, yield, selectivity or general chemical-space accuracy. Explicit exclusions prevent unsupported functional-group competition from being treated as established chemistry.

## Validation and synthesis-planning update — 2026-10-22

- **Desktop and mobile browser coverage:** the complete app now has a real
  Chromium test covering all four tabs, route comparisons, responsive layout,
  save/reload, step reordering and revalidation, exports/imports, rule search,
  extended depth settings and an explicit amine-protection route. Mobile means
  touch/viewport emulation, not a physical-device claim. See `tools/README.md`.
- **Sources and scope:** all 105 rule descriptors in that release have attributable
  reaction-class references and implementation-specific substrate/condition
  limits. Combined-rule branches still state where source coverage is narrower
  than the local model; a source is not validation of the code or query.
- **Independent checks:** the RDKit oracle compares actual exported structures
  and fixed product expectations independently. It found an ionic exact-mass
  omission; exact masses now include the net-charge electron-mass correction.
  The versioned report records fixture and loaded-script hashes.
- **Route comparison:** alternatives are displayed side by side on desktop and
  stacked on mobile, with step/material counts, source coverage, assumptions,
  scope and reported stereo/minor-product concerns. No numerical experimental
  feasibility or yield score is inferred from these counts.
- **Three additional families:** terminal-alkyne hydroboration/oxidation,
  BH3/THF carboxylic-acid reduction, and BBr3 aryl methyl ether cleavage, each with
  bounded scope, negative cases and forward-checked retrosynthesis.
- **Amine protection:** supported conflicts can expand into explicit protect,
  main reaction and deprotect steps. Automatic Boc planning is currently
  restricted to the encoded amine-versus-alcohol acyl-substitution case; each
  operation is independently forward checked. Forbidden reagents/rules and
  inventory checks apply to every substep. Unsupported amine conflicts produce
  an explanation instead of a guessed compatible protection scheme. Planning
  roles and reasons survive workspace JSON and CSV export.
  The forward Grignard, nitrile-addition and formation branches also reject the
  encoded O–H/N–H/acid conflicts rather than disagreeing with the planner.
- **One to ten steps:** Path Finder settings now include 6–10 steps. Protection
  and deprotection count separately. Searches up to five steps default to 60
  expanded structures/12 seconds; six to ten default to 200/30 seconds, remain
  cancellable, and do not establish impossibility when exhausted.

The reproducible checks are `node tools/run-validation.js`, with optional
`--rdkit --browser` checks documented in `tools/README.md`. These are finite
regression and oracle comparisons, not a general accuracy percentage.
Results at that release: all 18 default suites passed, RDKit passed 385 independent
checks, and the Chromium suite passes 56 desktop/mobile-emulation checks.

## Coordinated workbench upgrade — 2026-10-22

This round implements the six requested areas:

1. **Identity consistency:** a shared bounded exact graph key distinguishes
   connectivity, charge, isotope labels and supported specified stereochemistry.
   Reaction products, Path Finder and the workspace use shared identity checks.
   Copy/paste, schemes, SMILES, MOL and share links preserve isotope metadata;
   unmarked imported double bonds stay unspecified instead of inheriting E/Z
   from automatic layout. New v2 share links retain isotope/stereo flags while
   the decoder continues to accept legacy v1 links.
2. **Broader validation:** a fixture-based benchmark covers naming, eleven
   established forward families, negative controls, stereo and file roundtrips.
   `node tools/run-validation.js` runs every regression suite and syntax checks.
   The fixture set is finite regression coverage, not a measured accuracy rate
   across chemical space.
3. **Reaction coverage:** four additional bounded families and matching
   forward-verified retrosynthesis transforms: Finkelstein exchange, periodate
   thioether oxidation, peracid sulfoxide oxidation and iodine-mediated
   symmetric disulfide formation. Their descriptors record supported substrates,
   conditions, assumptions, limitations and literature/teaching references.
4. **Prediction evidence:** all 102 reaction descriptors can be searched and
   filtered in Reactions. Every outcome carries its generating rule, scope,
   assumptions and limitations. Curated sources are linked; older rules with
   missing source records are explicitly identified. References support a
   reaction class, not experimental validation of the local implementation.
5. **Cleaner internals:** reaction metadata is separated from graph edits in a
   common catalog/registration API. Naming parent selection and stereo-locant
   state management now use shared helpers; phenol/aniline retained names and
   suffix-group parent selection have regression coverage.
6. **Route workflow:** Path Finder returns ranked alternatives with editable
   inventory and reagent/rule exclusions. Each route can be saved to the Route
   Workspace, renamed, reordered and edited. Every edit is checked for endpoint
   continuity and forward-rule reproduction. Intermediate previews, step
   handoff, local persistence, validated JSON import/export and readable CSV
   exports are available; CSV text fields guard spreadsheet formula injection.

Known limits: endpoints currently require one connected molecule; search and
identity computation have explicit size/time/symmetry budgets. The existing CIP
implementation is not a complete implementation of every modern CIP rule.
Common labelled-isotope masses are supported; unknown isotope masses are shown
as unavailable. Historical stock entries whose stereo was previously discarded
cannot recover that information without re-importing the original structures.
At that earlier release rule-source coverage was partial; the update above adds
reaction-class references for every current rule. None of
these checks establishes experimental yield, selectivity or general feasibility.

Validation at integration: 61 browser scripts parse, and 11 regression/benchmark
suites passed at that release. A full-app DOM smoke test also passed startup, tab switching, path
search, route save/verification, reaction-step handoff and evidence/explorer
initialization, using jsdom with a stub canvas. Full browser rendering was not
available then; the current update adds the real Chromium suite described above.

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
