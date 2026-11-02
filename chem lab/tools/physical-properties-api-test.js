'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const context = vm.createContext({ console, performance, setTimeout, clearTimeout });
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const match of html.matchAll(/<script src="([^"]+)"/g)) {
  if (match[1] !== 'js/app.js') vm.runInContext(fs.readFileSync(path.join(root, match[1]), 'utf8'), context, { filename: match[1] });
}
const run = (code) => vm.runInContext(code, context);
// Synthetic PUG-REST/PUG-View contract fixtures; not reference measurements.
let checks=0;
function check(code,expected,label){assert.equal(run(code),expected,label);checks++;}
check(`physicalTemperatureParse('-114 to -112 °C','melting').minC`,-114,'Signed Celsius range');
check(`physicalTemperatureParse('273.15 K','melting').minC`,0,'Kelvin conversion');
check(`physicalTemperatureParse('32 °F','melting').minC`,0,'Fahrenheit conversion');
for(const text of ['120 °C (decomposes)','<120 °C','120 °C hydrate','120 °C (estimated)','31 ± 0.2 °C','1.23e2 °C','120 °C (computed)'])check(`physicalTemperatureParse(${JSON.stringify(text)},'melting').usable`,false,'Qualified values not used');
check(`physicalTemperatureParse('100 °C at 12 mmHg','boiling').usable`,false,'Reduced pressure excluded');
check(`physicalTemperatureParse('100 °C','boiling').usable`,false,'Unreported boiling pressure excluded');
check(`physicalTemperatureParse('100 °C at 760 mm Hg','boiling').usable`,true,'Normal-pressure boiling accepted');
check(`physicalPropertiesAnnotations({Record:{Section:[{TOCHeading:'Melting Point',Information:[{Value:{Number:[273.15],Unit:'K'}}]}]}},'melting')[0].minC`,0,'Numeric PUG-View unit encoding');
run(`function physicalRow(text,kind){return physicalTemperatureParse(text,kind)};function phaseRecord(mp,bp){return {status:'ready',melting:mp.map(s=>physicalRow(s,'melting')),boiling:bp.map(s=>physicalRow(s,'boiling'))}};`);
check(`physicalPropertiesPhaseFromRecord(phaseRecord(['100 °C'],[])).phase`,'S','Below supported melting interval');
check(`physicalPropertiesPhaseFromRecord(phaseRecord(['0 °C'],['100 °C at 1 atm'])).phase`,'L','Between melting and normal boiling');
check(`physicalPropertiesPhaseFromRecord(phaseRecord([],['0 °C at 1 atm'])).phase`,'G','Above supported normal boiling');
check(`physicalPropertiesPhaseFromRecord(phaseRecord(['25-30 °C'],[]))`,null,'Boundary interval is not one phase');
check(`physicalPropertiesPhaseFromRecord(phaseRecord(['0 °C','100 °C'],[]))`,null,'Conflicting phase intervals retained');
check(`physicalPropertiesPhaseFromRecord(phaseRecord(['0 °C'],[]))`,null,'Melting alone cannot distinguish liquid from gas above it');
(async()=>{
 const requests=[],pauses=[],stored={};let clock=1000;
 context.mockFetch=async(url,init)=>{requests.push({url,init});let data;if(url.includes('/property/'))data={PropertyTable:{Properties:[{CID:702,SMILES:'CCO'}]}};else{const kind=url.includes('Melting')?'Melting Point':'Boiling Point';data={Record:{RecordNumber:702,Reference:[{ReferenceNumber:1,SourceName:'Synthetic contract source',URL:'https://example.org/source'}],Section:[{TOCHeading:'Experimental Properties',Section:[{TOCHeading:kind,Information:[{ReferenceNumber:1,Value:{StringWithMarkup:[{String:kind==='Melting Point'?'0 °C':'100 °C at 760 mmHg'}]}}]}]}]}};}return {status:200,ok:true,text:async()=>JSON.stringify(data)}};
 context.pause=async ms=>{pauses.push(ms);clock+=ms};context.clock=()=>clock;context.storage={getItem:k=>stored[k]||null,setItem:(k,v)=>stored[k]=v};
 run(`var client=physicalPropertiesClient({fetcher:mockFetch,pause,now:clock,storage});`);
 const result=await run(`Promise.all([client.lookup('CCO'),client.lookup('OCC')])`);
 assert.equal(requests.length,3,'Equivalent concurrent requests deduplicated');checks++;assert.equal(result[0].status,'ready');checks++;
 assert.equal(requests[0].init.method,'POST');checks++;assert.equal(requests[0].init.credentials,'omit');checks++;assert.ok(requests[0].init.body.startsWith('smiles='));checks++;
 assert.ok(pauses.every(ms=>ms>=500));checks++;assert.equal(result[0].melting[0].source,'Synthetic contract source');checks++;
 await run(`client.lookup('CCO')`);assert.equal(requests.length,3,'Cached result reused');checks++;
 run(`physicalPropertiesDefaultClient.value=client`);check(`physicalPropertiesCatalogAllows('CCO','S')`,false,'Measured interval excludes contradictory catalog solid');check(`physicalPropertiesCatalogAllows('CCO','L')`,true,'Consistent catalog phase remains eligible');check(`reactionMaterialStateAuto('CCO').basis`,'pubchem','Fetched intervals drive automatic phase');check(`reactionMaterialStateResolve({phase:'S'},'CCO').phase`,'S','Lookup cannot erase override');
 assert.ok(stored['chem-lab-pubchem-phase-cache']);checks++;run(`var reloaded=physicalPropertiesClient({storage,fetcher:mockFetch,pause,now:clock});`);check(`reloaded.get('CCO').melting[0].minC`,0,'Bounded cache survives reload');
 context.badFetch=async()=>({ok:true,status:200,text:async()=>JSON.stringify({PropertyTable:{Properties:[{CID:702,SMILES:'N'}]}})});
 const wrong=await run(`physicalPropertiesClient({fetcher:badFetch,pause,now:clock}).lookup('CCO')`);assert.equal(wrong.status,'error');checks++;assert.match(wrong.message,/structure differs/);checks++;
 context.offlineFetch=async()=>({ok:false,status:503});run(`client=physicalPropertiesClient({fetcher:offlineFetch,pause,now:clock,storage})`);const retained=await run(`client.lookup('CCO',true)`);assert.equal(retained.status,'ready');checks++;assert.ok(retained.refreshError);checks++;
 const quiet=[];context.silentFetch=async()=>{quiet.push(1);throw Error('offline')};run(`physicalPropertiesDefaultClient.value=physicalPropertiesClient({fetcher:silentFetch,pause,now:clock});physicalPropertiesAutoEnabled(false);`);
 context.document={createElement(tag){return {tag,children:[],events:{},append(...n){this.children.push(...n)},replaceChildren(...n){this.children=n},addEventListener(k,fn){this.events[k]=fn}}}};
 run(`var panel=physicalPropertiesElement('CCO',()=>{});`);assert.equal(quiet.length,0,'No network before explicit request or opt-in');checks++;
 console.log('PubChem physical-property integration: '+checks+' checks passed.');
})().catch(error=>{console.error(error);process.exitCode=1});
