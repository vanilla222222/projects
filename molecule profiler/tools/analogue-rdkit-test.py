#!/usr/bin/env python3
"""Independent sanitization, graph uniqueness and exact edit/stereo parity."""
import json, subprocess
from pathlib import Path
from rdkit import Chem, rdBase
root=Path(__file__).resolve().parents[1]
fixtures=json.loads(subprocess.check_output(['node','tools/analogue-candidates-test.js','--json'],cwd=root))
count=0
for fixture in fixtures:
    parent=Chem.MolFromSmiles(fixture['parent'])
    assert parent is not None
    seen=set()
    for row in fixture['report']['rows']:
        candidate=Chem.MolFromSmiles(row['smiles'])
        assert candidate is not None,(fixture['parent'],row)
        canonical=Chem.MolToSmiles(candidate,isomericSmiles=True)
        assert canonical not in seen,('duplicate graph',fixture['parent'],row)
        seen.add(canonical)
        def append(expected,site,fragment):
            offset=expected.GetNumAtoms()
            fragment=Chem.MolFromSmiles(fragment)
            atom=expected.GetAtomWithIdx(site)
            if atom.GetNumExplicitHs():atom.SetNumExplicitHs(atom.GetNumExplicitHs()-1)
            anchor=fragment.GetAtomWithIdx(0)
            if anchor.GetNumExplicitHs():anchor.SetNumExplicitHs(anchor.GetNumExplicitHs()-1)
            out=Chem.RWMol(Chem.CombineMols(expected,fragment))
            out.AddBond(site,offset,Chem.BondType.SINGLE)
            return out
        expected=Chem.RWMol(parent)
        if row['operation']=='append':
            expected=append(expected,row['site']['atom'],row['fragment'])
        elif row['operation']=='extension':
            c=row['changes'];kind=c['kind']
            if kind=='appendMany':
                for site,fragment in zip(c['sites'],c['fragments']):expected=append(expected,site,fragment)
            elif kind in {'substitute','removeBranch'}:
                # Give the attachment atom a temporary explicit H consumed by replacement.
                site=expected.GetAtomWithIdx(c['anchor']);site.SetNumExplicitHs(site.GetNumExplicitHs()+1)
                if kind=='substitute':expected=append(expected,c['anchor'],c['fragment'])
                for i in sorted(c['remove'],reverse=True):expected.RemoveAtom(i)
            elif kind=='relocate':
                expected.RemoveBond(c['from'],c['root']);expected.AddBond(c['to'],c['root'],Chem.BondType.SINGLE)
            elif kind=='insert':
                expected.RemoveBond(c['a'],c['b']);i=expected.AddAtom(Chem.Atom('C'));expected.AddBond(c['a'],i,Chem.BondType.SINGLE);expected.AddBond(i,c['b'],Chem.BondType.SINGLE)
            elif kind in {'contract','heteroContract'}:
                aromatic=kind=='heteroContract'
                if aromatic:
                    atom=expected.GetAtomWithIdx(c['replace']);atom.SetAtomicNum(Chem.GetPeriodicTable().GetAtomicNumber(c['element']));atom.SetNumExplicitHs(0)
                expected.AddBond(c['a'],c['b'],Chem.BondType.AROMATIC if aromatic else Chem.BondType.SINGLE);expected.RemoveAtom(c['atom'])
            elif kind=='fuse':
                offset=expected.GetNumAtoms()
                for element in [c['element'],'C','C']:
                    atom=Chem.Atom(element);atom.SetIsAromatic(True);expected.AddAtom(atom)
                for a,b in [(c['a'],offset),(offset,offset+1),(offset+1,offset+2),(offset+2,c['b'])]:expected.AddBond(a,b,Chem.BondType.AROMATIC)
            else:raise AssertionError(kind)
        else:
            site=expected.GetAtomWithIdx(row['site']['atom'])
            site.SetAtomicNum(Chem.GetPeriodicTable().GetAtomicNumber(row['replacement']['element']))
            site.SetNumExplicitHs(row['replacement']['hydrogens'])
        expected=expected.GetMol()
        Chem.SanitizeMol(expected)
        assert canonical==Chem.MolToSmiles(expected,isomericSmiles=True),('edit/stereo mismatch',fixture['parent'],row['name'],canonical,Chem.MolToSmiles(expected,isomericSmiles=True))
        count+=1
print(f'RDKit {rdBase.rdkitVersion}: {count} analogues across {len(fixtures)} inputs sanitize, remain unique and match independent edits including isotope/stereo identity.')
