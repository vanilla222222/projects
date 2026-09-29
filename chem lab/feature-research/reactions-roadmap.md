# Reactions & retrosynthesis roadmap

Four sections with five additions each. Every new forward rule also becomes a retrosynthesis transform, so Section 1 widens both features.

## Section 1: new reaction families (forward rules plus matching retro transforms)
1. **Aromatic substitution**: nitration and sulfonation; directing effects on substituted rings (o/p versus m, activating versus deactivating, including isomer ratios); SNAr on activated halides.
2. **Diazonium chemistry**: diazotisation, Sandmeyer (Cl, Br, CN), Schiemann (F), iodination, azo coupling, hydro-deamination.
3. **Cross-couplings**: Suzuki, Heck, Sonogashira, Buchwald–Hartwig, each with catalyst and base conditions.
4. **Enolate and carbonyl C–C bonds**: enolate alkylation, Michael addition, Claisen and Dieckmann condensations, Robinson annulation, Mannich reaction.
5. **Protecting groups**: installing and removing Boc, Cbz and Fmoc (amines); TBS and TBDPS (alcohols); Bn and PMB (alcohols and phenols); acetals and ketals (carbonyls); methyl and tert-butyl esters (acids).

## Section 2: engine accuracy and bench practicality
1. **Chemoselectivity warnings**: detect when a reagent hits more than one site, report the competing products, and suggest a protecting group.
2. **Stereo-preserving SMILES**: write @/@@ and / \ in `propSmiles` output so stereo survives products, routes, share links and exports.
3. **Reagent library**: MW, density, form, typical equivalents and hazard class for common reagents and solvents. The stoichiometry sheet then gives grams, mL and mmol.
4. **Green metrics**: atom economy, E-factor and PMI for each step and for the whole route.
5. **Reaction file I/O**: import and export reaction SMILES (`A.B>reagents>P`) and MDL RXN files.

## Section 3: retrosynthesis search
1. **Automatic multi-step search**: best-first search to purchasable starting materials, with depth, time and branch budgets. It runs in time slices and can be cancelled.
2. **Stock list manager**: a built-in stock list plus your own list, imported from SMILES or CSV, with a stock tier per compound.
3. **Route scoring**: step count, whether branches are built in parallel, estimated overall yield, how much complexity each step removes, and the stock tier. It can be sorted and filtered.
4. **Protecting-group planning**: when a step conflicts with another group in the molecule, insert protect and deprotect steps automatically (uses 1.5 and 2.1).
5. **Stereo-aware disconnections**: keep the target's stereocentres, prefer steps that set them, and flag steps that would make a racemic mixture (uses 2.2).

## Section 4: retrosynthesis workflow and canvas integration
1. **Bond-click disconnection**: on the canvas, highlight the bonds that can be disconnected. Clicking one shows only the routes that break that bond.
2. **Route comparison**: routes side by side, with steps, yield, metrics and reagents.
3. **Save and share routes**: routes are stored in the save file and carried in `#g=` share links.
4. **Route to lab notebook**: the notebook export gets per-step schemes, conditions, stoichiometry and metrics.
5. **Library mode**: run one reaction over a list of substrates, then export the product table (SMILES, CSV or SDF).
