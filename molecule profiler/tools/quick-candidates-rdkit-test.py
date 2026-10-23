#!/usr/bin/env python3
"""Independent validation of the expanded Quick candidate structures."""
import json
import subprocess
from collections import Counter
from pathlib import Path
from rdkit import Chem, rdBase
root=Path(__file__).resolve().parents[1]
data=json.loads(subprocess.check_output(['node','tools/quick-candidates-test.js','--json'],cwd=root))
def composition(m):return Counter((a.GetAtomicNum(),a.GetIsotope()) for a in Chem.AddHs(m).GetAtoms())
def canonical(s):return Chem.MolToSmiles(Chem.MolFromSmiles(s),isomericSmiles=True)
checked=0;ether_checked=0
for fixture in data:
    parent=Chem.MolFromSmiles(fixture['parent'])
    assert parent is not None
    report=fixture['report']
    if report.get('normalization'):
        parent=Chem.MolFromSmiles(report['normalization']['parentSmiles'])
    parent_key=Chem.MolToSmiles(parent,isomericSmiles=True)
    seen=set()
    for row in report['rows']:
        mol=Chem.MolFromSmiles(row['smiles'])
        assert mol is not None,row
        assert not any(a.GetNumRadicalElectrons() for a in mol.GetAtoms()),row
        assert len(Chem.GetMolFrags(mol))==1,row
        key=Chem.MolToSmiles(mol,isomericSmiles=True)
        assert key!=parent_key and key not in seen,row
        seen.add(key)
        if row.get('designMode')=='ether-redesign':
            assert row['parentRecoveryVerified'] is False and row['recoveredParentSmiles'] is None
            assert row['releaseTargetVerified'] and canonical(row['releaseTargetSmiles'])!=parent_key
            release=row['releaseCheck'];first,second=release['steps']
            assert canonical(first['inputSmiles'])==key
            assert canonical(first['products'][release['intermediateProductIndex']]['smiles'])==canonical(second['inputSmiles'])
            for step,kind in [(first,'ester'),(second,'ether-hemiacetal')]:
                assert step['pathway']['kind']==kind
                before=Chem.MolFromSmiles(step['inputSmiles']);expected=composition(before)
                if kind=='ester':expected[(8,0)]+=1;expected[(1,0)]+=2
                actual=Counter();charge=0
                for product in step['products']:
                    product_mol=Chem.MolFromSmiles(product['smiles']);assert product_mol is not None
                    actual.update(composition(product_mol));charge+=Chem.GetFormalCharge(product_mol)
                assert actual==expected and charge==Chem.GetFormalCharge(before),row
            assert canonical(row['releaseTargetSmiles']) in [canonical(p['smiles']) for p in second['products']]
            # Independently reverse the new alpha-C--O-acyl branch. This must
            # restore the original ether graph, irrespective of SMILES ordering.
            restored=False
            for carbon in mol.GetAtoms():
                if carbon.GetAtomicNum()!=6:continue
                for oxygen in carbon.GetNeighbors():
                    if oxygen.GetAtomicNum()!=8:continue
                    acyl=[a for a in oxygen.GetNeighbors() if a.GetIdx()!=carbon.GetIdx() and a.GetAtomicNum()==6 and any(b.GetBondType()==Chem.BondType.DOUBLE and b.GetOtherAtom(a).GetAtomicNum()==8 for b in a.GetBonds())]
                    if not acyl:continue
                    a,b=carbon.GetIdx(),oxygen.GetIdx();edit=Chem.RWMol(mol);edit.RemoveBond(a,b)
                    branch=next(set(g) for g in Chem.GetMolFrags(edit) if b in g)
                    if a in branch:continue
                    anchor=a-sum(i<a for i in branch);hydrogens=carbon.GetTotalNumHs()+1
                    for i in sorted(branch,reverse=True):edit.RemoveAtom(i)
                    edit.GetAtomWithIdx(anchor).SetNumExplicitHs(hydrogens);edit.GetAtomWithIdx(anchor).SetNoImplicit(True)
                    try:
                        result=edit.GetMol();Chem.SanitizeMol(result)
                        if Chem.MolToSmiles(result,isomericSmiles=True)==parent_key:restored=True
                    except Exception:pass
            assert restored,row
            ether_checked+=1;checked+=1;continue
        recovered=Chem.MolFromSmiles(row['recoveredParentSmiles'])
        assert recovered is not None and Chem.MolToSmiles(recovered,isomericSmiles=True)==parent_key,row
        a,b=row['attachment']['parentAtom'],row['attachment']['promoietyAtom']
        assert mol.GetBondBetweenAtoms(a,b) is not None,row
        if row['cleavage'].startswith('carbonyl-'):
            # Independently remove the complete C=N-derived branch and restore
            # a carbonyl oxygen. This also covers substituted oxime/hydrazone ends.
            edit=Chem.RWMol(mol);edit.RemoveBond(a,b)
            branch=next(set(g) for g in Chem.GetMolFrags(edit) if b in g)
            assert a not in branch,row
            anchor=a-sum(i<a for i in branch)
            for i in sorted(branch,reverse=True):edit.RemoveAtom(i)
            oxygen=edit.AddAtom(Chem.Atom('O'));edit.AddBond(anchor,oxygen,Chem.BondType.DOUBLE)
            restored=edit.GetMol();Chem.SanitizeMol(restored)
            assert Chem.MolToSmiles(restored,isomericSmiles=True)==parent_key,row
        checked+=1
print(f'RDKit {rdBase.rdkitVersion}: {checked} Quick candidates across {len(data)} inputs passed sanitization, distinctness and parent identity checks; {ether_checked} ether redesigns also passed independent branch reversal, two-step release target and isotope/atom/charge balance.')
