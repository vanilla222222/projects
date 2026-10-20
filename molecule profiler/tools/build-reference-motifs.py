#!/usr/bin/env python3
"""Precompute exact stored-graph motif matches; no receptor actions inferred."""
import hashlib,json,subprocess
from pathlib import Path
from rdkit import Chem,rdBase
ROOT=Path(__file__).resolve().parents[1]
paths=['data/library.js','js/structural-evidence.js','tools/build-reference-motifs.py']
hashes={p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in paths}
data=json.loads(subprocess.check_output(['node','-e',"console.log(JSON.stringify({library:require('./data/library').LIBRARY,definitions:require('./js/structural-evidence').DEFINITIONS}))"],cwd=ROOT,text=True))
patterns=[(k,Chem.MolFromSmarts(s)) for k,_,s in data['definitions']]
entries={}
for e in data['library']:
 m=Chem.MolFromSmiles(e['smiles'])
 if m is None:continue
 entries[e['name']]={'librarySmiles':e['smiles'],'motifs':[k for k,p in patterns if m.HasSubstructMatch(p)]}
payload={'schemaVersion':1,'rdkitVersion':rdBase.rdkitVersion,'sourceSha256':hashes,'entries':entries}
if any(hashlib.sha256((ROOT/p).read_bytes()).hexdigest()!=h for p,h in hashes.items()):raise ValueError('Source changed')
text="'use strict';\n// Stored-graph structural motifs; not affinity or functional labels.\nconst REFERENCE_MOTIFS = "+json.dumps(payload,separators=(',',':'))+";\nif(typeof module!=='undefined'&&module.exports)module.exports={REFERENCE_MOTIFS};\nif(typeof globalThis!=='undefined')globalThis.REFERENCE_MOTIFS=REFERENCE_MOTIFS;\n"
(ROOT/'data/reference-motifs.js').write_text(text)
print(json.dumps({'entries':len(entries),'patterns':len(patterns)}))
