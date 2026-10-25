#!/usr/bin/env python3
"""Pin semantic evidence snapshots to public commits; never infer resolution from deletion."""
import argparse,hashlib,json,subprocess,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sha=lambda b:hashlib.sha256(b).hexdigest()
canonical=lambda o:json.dumps(o,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()
def read(ref,path,optional=False):
 r=subprocess.run(['git','show',ref+':'+ROOT.name+'/'+path],cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
 if r.returncode:
  if optional:return None
  raise ValueError('Missing public commit object or file: '+ref+' '+path+'. Fetch repository history before building.')
 return r.stdout
def export(raw,key):
 script="const fs=require('fs'),vm=require('vm'),ctx={module:{exports:{}}};vm.runInNewContext(fs.readFileSync(0,'utf8'),ctx);console.log(JSON.stringify(ctx.module.exports[process.argv[1]]));"
 return json.loads(subprocess.check_output(['node','-e',script,key],input=raw,cwd=ROOT))
def snapshot(meta):
 if meta.get('workingTree'):
  assert re.fullmatch('[0-9a-f]{40}',meta.get('baseCommit','')),'A working snapshot requires its previous public base commit'
  raw=(ROOT/'data/curated-references.js').read_bytes();reviewraw=(ROOT/'data/reference-reviews.js').read_bytes()
 else:
  raw=read(meta['commit'],'data/curated-references.js');reviewraw=read(meta['commit'],'data/reference-reviews.js',True)
 d=export(raw,'CURATED_REFERENCES')
 evidence_fields='kind receptorId target action species hostSpecies metric relation value sd lower upper unit uncertainty uncertaintyKind efficacy originalValue originalSd originalUnit testedForm assay conditions endpoint context sourceClassification sourceProvider sourceUrl sourceFile sourceSha256 sourceLocation pubmedIds values rankEligible counterScreen'.split()
 compounds_fields='name sourceName smiles formula inchiKey sourceUrl aliases role libraryNames'.split()
 records=[]
 for r in d['records']:
  compounds=[]
  for c in r['compounds']:
   compounds.append({**{k:c[k] for k in compounds_fields if k in c},'libraryWitnesses':{n:d['entries'][n]['librarySmiles'] for n in c['libraryNames']},'identityWitnessSha256':sha(canonical(c['identitySource']))})
  evidence=[]
  for e in r['evidence']:
   row={k:e[k] for k in evidence_fields if k in e}
   if 'sourceRecord' in e:row['sourceWitnessSha256']=sha(canonical(e['sourceRecord']))
   evidence.append(row)
  records.append({'id':r['id'],'title':r['title'],'compounds':compounds,'evidence':evidence,'relationships':r.get('relationships',[]),'note':r['note'],'reviewedDate':r.get('reviewedDate','')})
 return {**meta,'commit':None if meta.get('workingTree') else meta['commit'],'snapshotOrigin':'working-tree-content-hash' if meta.get('workingTree') else 'public-commit','sourceSha256':sha(raw),'reviewSourceSha256':sha(reviewraw) if reviewraw else None,'records':records,'families':d.get('familyDefinitions',[]),'extraStructures':d.get('extraLibrary',[]),'decisions':export(reviewraw,'REFERENCE_REVIEWS')['decisions'] if reviewraw else []}
def build():
 config=ROOT/'data/reference-release-history.json';history=json.loads(config.read_text());assert not any(r.get('workingTree') for r in history['releases'][:-1]),'Only the newest snapshot can use the working tree; pin older snapshots to their published commit';snapshots=[snapshot(meta) for meta in history['releases']]
 assert len({r['id'] for r in snapshots})==len(snapshots),'Duplicate release ID'
 live={p:sha((ROOT/p).read_bytes()) for p in ['data/curated-references.js','data/reference-reviews.js']}
 assert snapshots[-1]['sourceSha256']==live['data/curated-references.js'],'Append a new evidence snapshot (public commit or latest working tree) after a data change'
 assert snapshots[-1]['reviewSourceSha256']==live['data/reference-reviews.js'],'Append a new review snapshot (public commit or latest working tree) after a decision change'
 result={'schemaVersion':1,'scope':'Semantic snapshots of the curated evidence overlay and recorded reviews, not the complete base-library history. Source facts retain their original attribution and licenses; see CURATED-REFERENCES.md. Counts describe imported records, not independent experiments.','builderSha256':sha(Path(__file__).read_bytes()),'historySha256':sha(config.read_bytes()),'liveSources':live,'releases':snapshots}
 return "'use strict';\nconst REFERENCE_RELEASES="+json.dumps(result,ensure_ascii=False,separators=(',',':'))+";\nif(typeof globalThis!=='undefined')globalThis.REFERENCE_RELEASES=REFERENCE_RELEASES;\nif(typeof module!=='undefined')module.exports={REFERENCE_RELEASES};\n"
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');args=p.parse_args();out=ROOT/'data/reference-releases.js';result=build()
 if args.check:assert out.read_text()==result,'Stale evidence release snapshots'
 else:out.write_text(result)
 print(json.dumps({'checked':args.check,'bytes':len(result.encode())}))
