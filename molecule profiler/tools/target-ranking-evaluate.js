'use strict';
// Full internal profile holdout by default. Unknown labels are not negatives.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const api=require('../js/target-ranking.js'),metrics=require('./target-ranking-metrics.js');
const hash=text=>crypto.createHash('sha256').update(text).digest('hex');
const limitArg=process.argv.indexOf('--limit');
const limit=limitArg<0?Infinity:Number(process.argv[limitArg+1]);
if(limit!==Infinity&&(!Number.isSafeInteger(limit)||limit<1))throw Error('--limit requires a positive integer');
for(const file of ['smiles','mol','stereo','fingerprints'])Object.assign(global,require('../js/'+file+'.js'));
const {LIBRARY}=require('../data/library.js'),{TARGETS}=require('../data/targets.js');
const index=api.createIndex(LIBRARY,TARGETS,{parse:s=>buildMolecule(parseSmiles(s)),fingerprint,tanimoto,dice});
const all=[...index.entries.values()].sort((a,b)=>a.entry.name.localeCompare(b.entry.name));
const groups=new Map();for(const item of all){if(!groups.has(item.profile))groups.set(item.profile,[]);groups.get(item.profile).push(item);}
// Hash ordering avoids alphabetic/position sampling drift. Group representative
// stays the first sorted name; labels are never transferred between profiles.
const sample=[...groups.values()].map(group=>({item:group[0],aliases:group.map(x=>x.entry.name),hash:hash(group[0].profile)}))
 .sort((a,b)=>a.hash.localeCompare(b.hash)).slice(0,limit);
const keys=target=>target.gene+'::'+target.name,results=[];
for(const {item,aliases,hash:profileSha256} of sample){
 const positives=new Set(TARGETS.filter(t=>t.ligands.includes(item.entry.name)).map(keys));
 const record={name:item.entry.name,profileSha256,aliases,positiveKeys:[...positives].sort(),labels:positives.size};
 for(const mode of ['legacy','ensemble']){
  const ranks=api.rank({fps:item.fps,profile:item.profile},index,{mode,excludeProfile:item.profile});
  record[mode]=metrics.positions(ranks,positives,keys);
 }
 results.push(record);
}
const report={schemaVersion:2,algorithmVersion:api.VERSION,node:process.version,
 sourceSha256:Object.fromEntries(['data/library.js','data/targets.js','js/target-ranking.js','js/mol.js','js/smiles.js','js/stereo.js','js/fingerprints.js','tools/target-ranking-evaluate.js','tools/target-ranking-metrics.js'].map(file=>[file,hash(fs.readFileSync(path.join(__dirname,'..',file)))])),
 protocol:'One query per fingerprint-profile group, SHA-256 ordered; all indistinguishable profiles withheld from every target. Default evaluates every group.',
 selection:{limit:Number.isFinite(limit)?limit:null,complete:sample.length===groups.size},
 caveats:['Internal curated-label retrieval only, not confirmed binding validation.','Profile grouping is not chemical canonicalization or scaffold-disjoint validation.',
 'No negative experimental set; these metrics cannot establish specificity or binding probabilities.',
 'One alphabetical representative per profile; aliases and representative labels are recorded. Labels are not transferred between profile aliases.',
 'Tie intervals use equality of rank score and mean; display order is arbitrary within ties. No weights were fitted to these results.'],
 sourceCounts:{library:LIBRARY.length,targets:TARGETS.length,indexed:index.entries.size,uniqueProfiles:groups.size,issues:index.issues.length},
 legacy:metrics.summarize(results,'legacy'),ensemble:metrics.summarize(results,'ensemble'),results};
const out=process.argv.indexOf('--report');if(out>=0){if(!process.argv[out+1])throw Error('--report requires a path');fs.writeFileSync(process.argv[out+1],JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({...report,results:undefined},null,2));
