'use strict';
// Standard-library-only scripts operating on copies of the app's existing data.
(function(root){
 const common = `import math

def _text(value, default="Unavailable"):
    if value is None or value == "":
        return default
    return str(value).replace("\\n", " ").replace("\\r", " ").replace("\\t", " ")

def _number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)

def _fmt(value, signed=False):
    if not _number(value):
        return "Unavailable"
    return format(value, "+.2f" if signed else ".2f")

def _parent_properties():
    comparison = evidence.get("candidateComparison") or {}
    baseline = (comparison.get("input") or {}).get("properties")
    return baseline if isinstance(baseline, dict) else (molecule.get("descriptors") or {})

def _bbb(properties):
    screen = properties.get("bbb") or {}
    if screen.get("available") is not True:
        return "Unavailable: " + _text(screen.get("reason"), "no compatible BBB estimate in this snapshot")
    return _text(screen.get("label")) + " (passive screen; not measured penetration)"

def _heading(title):
    print(title)
    print("Input:", _text(molecule.get("name")))
    print("SMILES:", _text(molecule.get("smiles")))
    print("Designs:", len(candidates), "| All generated designs are unvalidated.")
    print()

`;
 const templates = {
  'Compare all designs with parent': {
   id:'candidate-parent-comparison',version:1,
   description:'Compare all copied quick candidates with the input: molecular weight, WLOGP, TPSA and ESOL log S, with differences where both values are available. Original design order is retained.',
   code:common+`_heading("CANDIDATES COMPARED WITH INPUT")
parent = _parent_properties()
metrics = [("mw", "MW g/mol"), ("logp", "WLOGP"), ("tpsa", "TPSA A^2"), ("logS", "ESOL log S mol/L")]
print("Input formula:", _text(parent.get("formula")))
print("Input values:", " | ".join(label + " " + _fmt(parent.get(key)) for key, label in metrics))
print("Positive/negative differences do not establish an ADME or clinical improvement.")
print("Design numbers match the candidate-comparison snapshot; no benefit ranking is applied.")
if not candidates:
    print("No candidate designs are available for this input.")
for position, candidate in enumerate(candidates, 1):
    props = candidate.get("properties") or {}
    print()
    print(str(position) + ". " + _text(candidate.get("name"), "Unnamed design"))
    print("Formula:", _text(props.get("formula")))
    for key, label in metrics:
        value, reference = props.get(key), parent.get(key)
        delta = value - reference if _number(value) and _number(reference) else None
        print("  " + label + ": " + _fmt(value) + " | difference from input " + _fmt(delta, signed=True))
    if candidate.get("error"):
        print("  Calculation issue:", _text(candidate["error"]))
`
  },
  'Formula, properties and BBB summary': {
   id:'candidate-basic-summary',version:1,
   description:'Show the input and every design with full descriptive names, formula, molecular weight, TPSA, WLOGP and any available passive BBB screen. Missing estimates remain unavailable.',
   code:common+`_heading("MOLECULE AND CANDIDATE SUMMARIES")
print("Names are app/reference labels; generated design names are not verified IUPAC names.")
print("BBB values below are existing passive screens, not trained-model probabilities or measured brain exposure.")
print("Transporters, efflux, dose and in-vivo ionization are not resolved by this screen.")

def summary(label, name, smiles, props):
    print()
    print(label + ": " + _text(name, "Unnamed design"))
    print("  Formula:", _text(props.get("formula")))
    print("  MW g/mol:", _fmt(props.get("mw")), "| TPSA A^2:", _fmt(props.get("tpsa")), "| WLOGP:", _fmt(props.get("logp")))
    print("  BBB:", _bbb(props))
    print("  SMILES:", _text(smiles))

summary("INPUT", molecule.get("name"), molecule.get("smiles"), _parent_properties())
for position, candidate in enumerate(candidates, 1):
    summary("DESIGN " + str(position), candidate.get("name"), candidate.get("smiles"), candidate.get("properties") or {})
    if candidate.get("error"):
        print("  Calculation issue:", _text(candidate["error"]))
if not candidates:
    print("No candidate designs are available for this input.")
`
  },
  'Cleavage products and release targets': {
   id:'candidate-release-review',version:1,
   description:'Review declared targets and any release checks already performed in Candidate comparison. Lists formal products, intermediates and coproducts without predicting biological conversion. Run “Check all release paths” there first to populate more results.',
   code:common+`_heading("FORMAL RELEASE REVIEW")
print("This script reads existing checks; it does not perform new cleavage searches.")
print("Formal graph transformations do not demonstrate enzymatic cleavage, conversion rates, safety or activity.")
labels = {"original-input": "Original input", "organic-component": "Organic input component (full salt not recovered)", "different-analogue": "Different OH analogue (original methoxy/alkoxy input not recovered)"}
unchecked = 0
for position, candidate in enumerate(candidates, 1):
    print()
    print(str(position) + ". " + _text(candidate.get("name"), "Unnamed design"))
    print("  Design SMILES:", _text(candidate.get("smiles")))
    print("  Declared target kind:", labels.get(candidate.get("releaseKind"), "Unknown"))
    print("  Declared target SMILES:", _text(candidate.get("declaredTargetSmiles")))
    release = candidate.get("release")
    if not isinstance(release, dict):
        unchecked += 1
        print("  Release path: NOT CHECKED; no products inferred.")
        continue
    print("  Release check:", _text(release.get("status")))
    print("  Check detail:", _text(release.get("reason")))
    target = release.get("releaseTarget") or {}
    print("  Target identity check:", _text(target.get("status")), "(structural identity only)")
    print("  Checked target SMILES:", _text(target.get("smiles")))
    if release.get("status") != "formal-route-found":
        print("  No supported formal route is reported here; this is not evidence against biological conversion.")
        continue
    for step in release.get("steps") or []:
        print("  Step", _text(step.get("number")), "|", _text(step.get("label")))
        print("    Reactant:", _text(step.get("reactantSmiles")))
        print("    Formal input:", _text(step.get("formalInput")))
        for bond in step.get("cutBonds") or []:
            atoms = bond.get("atoms") or []
            print("    Cut-bond atom numbers:", "-".join(str(a) for a in atoms), "|", _text(bond.get("numbering")))
        for product in step.get("products") or []:
            kind = "Declared release target" if product.get("isReleaseTarget") else "Formal product/intermediate"
            print("    " + kind + ":", _text(product.get("formula")), "|", _text(product.get("smiles")))
        source = step.get("source") or {}
        if source.get("url"):
            print("    Reaction-class source:", _text(source["url"]))
    coproducts = release.get("byproducts")
    if coproducts is None:
        print("  Remaining formal coproducts: not reported.")
    elif not coproducts:
        print("  Remaining formal coproducts: none reported by this graph route.")
    else:
        for product in coproducts:
            print("  Remaining formal coproduct:", _text(product.get("formula")), "|", _text(product.get("smiles")))
if unchecked:
    print()
    print(str(unchecked) + " design(s) have no saved release check. Open Candidate comparison, choose Check all release paths, then rerun this template.")
if not candidates:
    print("No candidate designs are available for this input.")
`
  }
 };
 root.PythonAnalysisTemplates=templates;
 if(typeof module!=='undefined'&&module.exports)module.exports=templates;
})(globalThis);
