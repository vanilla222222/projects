#!/usr/bin/env python3
"""Verify frozen PK features are unchanged by the ionic/isotope mass correction."""
import argparse
import csv
import hashlib
import json
from pathlib import Path
import subprocess

ROOT=Path(__file__).resolve().parents[1]
BASELINE='d47212bb3393fb0eff269f0d093561b48d2e49c5'
sha=lambda b:hashlib.sha256(b).hexdigest()

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--half-life',type=Path,required=True);p.add_argument('--logd',type=Path,required=True)
    p.add_argument('--baseline-mol',type=Path);p.add_argument('--write',action='store_true');args=p.parse_args()
    evaluation_path=ROOT/'validation/pk-model-evaluation.json';evaluation=json.loads(evaluation_path.read_text())
    before=args.baseline_mol.read_text()if args.baseline_mol else subprocess.check_output(['git','show',BASELINE+':molecule profiler/js/mol.js'],cwd=ROOT,text=True)
    training=evaluation.get('trainingSourceSha256',evaluation['sourceSha256'])
    assert sha(before.encode())==training['js/mol.js'],'Baseline mol.js does not match original training source'
    for f,h in training.items():
        if f!='js/mol.js':assert sha((ROOT/f).read_bytes())==h,'Unreviewed feature-source change: '+f
    datasets=[]
    for key,path,delimiter,column in [('halfLife',args.half_life,'\t','X'),('logD74',args.logd,',','smiles')]:
        raw=path.read_bytes();assert sha(raw)==evaluation['models'][key]['inputSha256'],'Input data checksum mismatch'
        rows=list(csv.DictReader(raw.decode().splitlines(),delimiter=delimiter));datasets.append((key,raw,[r[column]for r in rows]))
    code=r"""
const fs=require('node:fs'),vm=require('node:vm'),job=JSON.parse(fs.readFileSync(0,'utf8'));
function features(old){
 const ctx=vm.createContext({});
 for(const f of ['smiles','mol','smarts','stereo','descriptors','fingerprints','pk-features'])vm.runInContext(old&&f==='mol'?job.before:fs.readFileSync('js/'+f+'.js','utf8'),ctx);
 ctx.inputs=job.inputs;
 return vm.runInContext(`inputs.map(s=>{try{const m=buildMolecule(parseSmiles(s));return PKFeatures.features(m,describe(m),fingerprint(m,'ecfp4s'));}catch(e){return {error:e.message};}})`,ctx);
}
const a=features(true),b=features(false),changed=[];
for(let i=0;i<a.length;i++)if(JSON.stringify(a[i])!==JSON.stringify(b[i]))changed.push(i);
console.log(JSON.stringify({rows:a.length,changed}));
"""
    results=[]
    for key,raw,inputs in datasets:
        checked=json.loads(subprocess.check_output(['node','-e',code],cwd=ROOT,text=True,input=json.dumps({'before':before,'inputs':inputs})))
        assert not checked['changed'],f'Frozen features changed: {key}: {checked["changed"]}'
        results.append({'model':key,'inputSha256':sha(raw),'rows':checked['rows'],'changedRows':0})
    report={'schemaVersion':1,'baselineCommit':BASELINE,'baselineMolSha256':sha(before.encode()),
        'currentMolSha256':sha((ROOT/'js/mol.js').read_bytes()),'datasets':results,
        'modelSha256':sha((ROOT/'data/pk-models.js').read_bytes()),'toolSha256':sha(Path(__file__).read_bytes()),
        'scope':'All original raw training/calibration/test input feature vectors compared byte-for-byte before and after the mass fix, including error outputs. No refitting, label changes, split changes, model tuning or new prediction accuracy claim.'}
    assert report['modelSha256']==evaluation['modelSha256']
    if args.write:
        (ROOT/'validation/pk-mass-compatibility.json').write_text(json.dumps(report,indent=2)+'\n')
        evaluation['trainingSourceSha256']=training
        evaluation['sourceSha256']={**training,'js/mol.js':report['currentMolSha256']}
        evaluation['compatibilityRevalidation']='validation/pk-mass-compatibility.json'
        evaluation_path.write_text(json.dumps(evaluation,indent=2)+'\n')
    print(json.dumps(report,indent=2))

if __name__=='__main__':main()
