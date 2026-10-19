'use strict';
// Internal grouped-profile holdout, not external pharmacology validation. Reports
// curated-label retrieval; unlisted targets are unknown, not confirmed negatives.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const api=require('../js/target-ranking.js');
for(const file of ['smiles','mol','stereo','fingerprints'])Object.assign(global,require('../js/'+file+'.js'));
const {LIBRARY}=require('../data/library.js'),{TARGETS}=require('../data/targets.js');
const index=api.createIndex(LIBRARY,TARGETS,{parse:s=>buildMolecule(parseSmiles(s)),fingerprint,tanimoto,dice});
const all=[...index.entries.values()].sort((a,b)=>a.entry.name.localeCompare(b.entry.name));
const unique=[...new Map(all.map(item=>[item.profile,item])).values()];
const max=100;
const sample=Array.from({length:Math.min(max,unique.length)},(_,i)=>unique[Math.floor(i*unique.length/Math.min(max,unique.length))]);
const keys=target=>target.gene+'::'+target.name;
const results=[];
for(const item of sample){
 const positives=new Set(TARGETS.filter(t=>t.ligands.includes(item.entry.name)).map(keys));
 const record={name:item.entry.name,labels:positives.size};
 for(const mode of ['legacy','ensemble']){
  const ranks=api.rank({fps:item.fps,profile:item.profile},index,{mode,excludeProfile:item.profile});
  const positions=ranks.map((r,i)=>positives.has(keys(r.target))?i+1:null).filter(Boolean);
  record[mode]={bestRank:positions.length?Math.min(...positions):null,rankableLabels:positions.length};
 }
 results.push(record);
}
const summarize=mode=>({queries:results.length,top1:results.filter(r=>r[mode].bestRank===1).length/results.length,
 top5:results.filter(r=>r[mode].bestRank!==null&&r[mode].bestRank<=5).length/results.length,
 top10:results.filter(r=>r[mode].bestRank!==null&&r[mode].bestRank<=10).length/results.length,
 unrankableQueries:results.filter(r=>r[mode].bestRank===null).length});
const report={schemaVersion:1,algorithmVersion:api.VERSION,node:process.version,
 sourceSha256:Object.fromEntries(['data/library.js','data/targets.js','js/target-ranking.js'].map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'..',file))).digest('hex')])),
 protocol:'Deterministic sample of 100 fingerprint-profile groups; all indistinguishable profiles withheld from every target.',
 caveats:['Internal curated-label retrieval only, not confirmed binding validation.','Profile grouping is not chemical canonicalization or scaffold-disjoint validation.',
 'No negative experimental set; these metrics cannot establish specificity or binding probabilities.','Sampling and label incompleteness can change the apparent winner. No weights were fitted to these results.'],
 sourceCounts:{library:LIBRARY.length,targets:TARGETS.length,indexed:index.entries.size,uniqueProfiles:unique.length,issues:index.issues.length},
 legacy:summarize('legacy'),ensemble:summarize('ensemble'),results};
const out=process.argv.indexOf('--report');if(out>=0)fs.writeFileSync(process.argv[out+1],JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,results:undefined},null,2));
