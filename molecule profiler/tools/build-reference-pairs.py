#!/usr/bin/env python3
"""Single-cut matched fragments from reviewed source graphs, with reconstruction guards."""
import argparse,hashlib,json,subprocess
from pathlib import Path
from collections import defaultdict
from itertools import combinations
from rdkit import Chem,rdBase
ROOT=Path(__file__).resolve().parents[1]
sha=lambda b:hashlib.sha256(b).hexdigest()
def build():
 source=ROOT/'data/curated-references.js'
 d=json.loads(subprocess.check_output(['node','-e',"console.log(JSON.stringify(require('./data/curated-references').CURATED_REFERENCES))"],cwd=ROOT,text=True))
 grouped={}
 for r in d['records']:
  for c in r['compounds']:
   m=Chem.MolFromSmiles(c['smiles']);s=Chem.MolToSmiles(m)
   g=grouped.setdefault(s,{'smiles':s,'names':set(),'recordIds':set(),'librarySmiles':{}})
   g['names'].update(c['libraryNames']);g['recordIds'].add(r['id'])
   g['librarySmiles'].update({n:d['entries'][n]['librarySmiles'] for n in c['libraryNames']})
 graphs=[{**g,'names':sorted(g['names']),'recordIds':sorted(g['recordIds'])} for _,g in sorted(grouped.items())]
 fragments=defaultdict(set);verified=0;unresolved=0
 with rdBase.BlockLogs():
  for gi,g in enumerate(graphs):
   original=Chem.MolFromSmiles(g['smiles']);m=Chem.AddHs(original);size=original.GetNumHeavyAtoms()
   for b in m.GetBonds():
    if b.IsInRing() or b.GetBondType()!=Chem.BondType.SINGLE:continue
    cut=Chem.FragmentOnBonds(m,[b.GetIdx()],addDummies=True,dummyLabels=[(0,0)])
    for a in cut.GetAtoms():
     if a.GetAtomicNum()==0:a.SetAtomMapNum(1)
    parts=Chem.GetMolFrags(cut,asMols=True,sanitizeFrags=True)
    if len(parts)!=2:continue
    for core,var in [parts,parts[::-1]]:
     core=Chem.RemoveHs(core);var=Chem.RemoveHs(var)
     heavy=lambda mol:sum(a.GetAtomicNum()>1 for a in mol.GetAtoms())
     if heavy(core)<6 or heavy(core)<size/2 or heavy(var)>8:continue
     try:
      restored=Chem.RemoveHs(Chem.molzip(Chem.CombineMols(core,var)))
      if Chem.MolToSmiles(restored)!=g['smiles']:unresolved+=1;continue
     except Exception:unresolved+=1;continue
     fragments[Chem.MolToSmiles(core)].add((gi,Chem.MolToSmiles(var)));verified+=1
 pairs=[]
 for core,variants in sorted(fragments.items()):
  for (a,va),(b,vb) in combinations(sorted(variants),2):
   if a==b or va==vb:continue
   pairs.append({'a':a,'b':b,'core':core,'variableA':va,'variableB':vb})
 result={'schemaVersion':1,'scope':'Reviewed curated source graphs only; non-ring single-bond cuts including H substitutions. Common core >=6 heavy atoms and >=half of each parent; variable fragments <=8 heavy atoms. Every fragment reconstruction preserves the full source isomeric graph. Structural relations alone do not establish an activity difference.','sourceSha256':sha(source.read_bytes()),'builderSha256':sha(Path(__file__).read_bytes()),'rdkitVersion':rdBase.rdkitVersion,'verifiedFragmentations':verified,'unresolvedFragmentations':unresolved,'graphs':graphs,'pairs':pairs}
 return "'use strict';\nconst REFERENCE_MATCHED_PAIRS="+json.dumps(result,ensure_ascii=False,separators=(',',':'))+";\nif(typeof globalThis!=='undefined')globalThis.REFERENCE_MATCHED_PAIRS=REFERENCE_MATCHED_PAIRS;\nif(typeof module!=='undefined')module.exports={REFERENCE_MATCHED_PAIRS};\n"
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');args=p.parse_args();out=ROOT/'data/reference-matched-pairs.js';result=build()
 if args.check:assert out.read_text()==result,'Stale matched-pair index'
 else:out.write_text(result)
 print(json.dumps({'checked':args.check,'bytes':len(result.encode())}))
