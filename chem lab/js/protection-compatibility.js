// Protecting-group survival checks are deliberately separate from product rules.
// 'compatible' means a bounded encoded regime has no known group-level conflict;
// it does not establish selectivity, substrate stability or experimental success.
const PROTECTION_SOURCES = {
  amine: { title: 'University of Calgary, Carey Ch27: peptide synthesis and Boc/Cbz protection', url: 'https://www.chem.ucalgary.ca/courses/353/Carey5th/Ch27/ch27-6.html', kind: 'teaching' },
  fmoc: { title: 'Carpino and Han, 9-Fluorenylmethoxycarbonyl amino-protecting group, J. Org. Chem. (1972)', url: 'https://doi.org/10.1021/jo00795a005', kind: 'primary' },
  carbonyl: { title: 'University of Calgary, Carey Ch17: carbonyl protecting groups', url: 'https://www.chem.ucalgary.ca/courses/350/Carey5th/Ch17/ch17-3-4-3.html', kind: 'teaching' },
  silylBasic: { title: 'McMurry, OpenStax Organic Chemistry 17.8: Protection of Alcohols, silyl ethers during Grignard addition', url: 'https://openstax.org/books/organic-chemistry/pages/17-8-protection-of-alcohols', kind: 'teaching' },
  silyl: { title: 'Lakshman et al., selective desilylation of phenolic TBDMS ethers (2016)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5509224/', kind: 'primary' },
  pmb: { title: 'Crich et al., oxidative cleavage of benzyl ethers and limits of DDQ selectivity (2007)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2615469/', kind: 'primary' },
  ester: { title: 'McMurry, OpenStax Organic Chemistry 21.6: chemistry of esters', url: 'https://openstax.org/books/organic-chemistry/pages/21-6-chemistry-of-esters', kind: 'teaching' },
  tbu: { title: 'Lundt et al., removal of tert-butyl and Boc groups with TFA (1978)', url: 'https://pubmed.ncbi.nlm.nih.gov/744685/', kind: 'primary' },
};
const PROTECTION_GROUPS = [
  {id:'boc',label:'Boc',kind:'amine',install:'Boc2O / amine base',remove:'TFA or HCl',removal:'acid',references:[PROTECTION_SOURCES.amine,PROTECTION_SOURCES.tbu]},
  {id:'cbz',label:'Cbz',kind:'amine',install:'CbzCl / amine base',remove:'H2 / Pd-C',removal:'hydrogenolysis',references:[PROTECTION_SOURCES.amine]},
  {id:'fmoc',label:'Fmoc',kind:'amine',install:'Fmoc-Cl or Fmoc-OSu / base',remove:'Piperidine',removal:'fmocBase',references:[PROTECTION_SOURCES.fmoc]},
  ...['tms','tbs','tips','tbdps'].map(id=>({id,label:id.toUpperCase(),kind:'alcohol',install:id.toUpperCase()+'Cl / imidazole',remove:'Fluoride; acid cleavage depends on substitution and conditions',removal:'fluoride',references:[PROTECTION_SOURCES.silyl,PROTECTION_SOURCES.silylBasic]})),
  {id:'silyl',label:'Other silyl ether',kind:'alcohol',install:'Supported silyl chloride / base',remove:'Fluoride; individual rates not encoded',removal:'fluoride',references:[PROTECTION_SOURCES.silyl,PROTECTION_SOURCES.silylBasic]},
  {id:'benzyl',label:'Benzyl ether',kind:'alcohol',install:'Benzyl halide / base',remove:'H2 / Pd-C',removal:'hydrogenolysis',references:[PROTECTION_SOURCES.amine,PROTECTION_SOURCES.pmb]},
  {id:'pmb',label:'PMB ether',kind:'alcohol',install:'PMB chloride / base',remove:'DDQ or CAN; hydrogenolysis also possible',removal:'oxidative',references:[PROTECTION_SOURCES.pmb]},
  {id:'acetal',label:'Acetal / ketal',kind:'carbonyl',install:'Diol or alcohol / acid; remove water',remove:'Aqueous acid',removal:'aqueousAcid',references:[PROTECTION_SOURCES.carbonyl]},
  {id:'tbu-ester',label:'tert-Butyl ester',kind:'acid',install:'Isobutylene / acid',remove:'TFA',removal:'acid',references:[PROTECTION_SOURCES.tbu]},
  {id:'methyl-ester',label:'Methyl ester',kind:'acid',install:'Supported methyl esterification',remove:'Aqueous hydroxide / acid work-up',removal:'aqueousBase',references:[PROTECTION_SOURCES.ester]},
  {id:'benzyl-ester',label:'Benzyl ester',kind:'acid',install:'Supported esterification / benzylation',remove:'H2 / Pd-C',removal:'hydrogenolysis',references:[PROTECTION_SOURCES.ester,PROTECTION_SOURCES.amine]},
];
function protectionGraph(value) {
  if (typeof value==='string') return reactionFragmentGraph(smilesToFragment(value));
  if (value && typeof value.getAtom==='function') return value;
  if (value && Array.isArray(value.atoms) && Array.isArray(value.bonds)) return reactionFragmentGraph(value);
  throw new Error('Protecting-group assessment requires a molecular structure.');
}
function protectionPath(g,from,to,excluded) {
  const seen=new Set(excluded||[]),queue=[[from,0]];
  while(queue.length){const [id,d]=queue.shift();if(seen.has(id))continue;if(id===to)return d;seen.add(id);rxNeighbors(g,id).forEach(n=>{if(!seen.has(n.atom.id))queue.push([n.atom.id,d+1]);});}
  return Infinity;
}
function protectionGroups(value) {
  const g=protectionGraph(value),info=rxAnalyze(g),aro=info.aromatic.atoms,sites=[];
  const methyl=id=>{const a=g.getAtom(id);return a&&a.element==='C'&&!a.charge&&rxHydrogens(g,id)===3&&rxNeighbors(g,id).length===1;};
  const tbu=id=>{const a=g.getAtom(id),ns=a&&rxNeighbors(g,id);return a&&a.element==='C'&&!a.charge&&ns.length===4&&ns.filter(n=>n.atom.element==='C'&&n.bond.order===1&&methyl(n.atom.id)).length===3;};
  const benzylic=id=>{const a=g.getAtom(id),ns=a&&rxNeighbors(g,id);return a&&a.element==='C'&&!a.charge&&rxHydrogens(g,id)===2&&ns.length===2&&ns.every(n=>n.bond.order===1)&&ns.some(n=>aro.has(n.atom.id));};
  const add=(id,anchor,atoms,extra)=>{const d=PROTECTION_GROUPS.find(x=>x.id===id);if(d&&!sites.some(s=>s.id===id&&s.anchor===anchor))sites.push(Object.assign({id,label:d.label,kind:d.kind,anchor,atoms:[...new Set(atoms)],hasNH:false},extra||{}));};
  const carbamateO=new Set();
  info.carbonyls.forEach(c=>{
    const ns=rxNeighbors(g,c.c),n=ns.find(x=>x.atom.element==='N'&&!x.atom.charge&&x.bond.order===1),o=ns.find(x=>x.atom.element==='O'&&!x.atom.charge&&x.bond.order===1);
    if(!o||rxNeighbors(g,o.atom.id).length!==2)return;
    const alkyl=rxNeighbors(g,o.atom.id).find(x=>x.atom.id!==c.c&&x.atom.element==='C'&&x.bond.order===1);if(!alkyl)return;
    const a=alkyl.atom.id,atoms=[c.c,c.o,o.atom.id,a];
    let id=null;
    if(n){
      if(tbu(a))id='boc';
      else if(benzylic(a))id='cbz';
      else if(rxHydrogens(g,a)===2){
        const next=rxCarbonNeighbors(g,a).find(x=>x.atom.id!==c.c),ar=next&&rxCarbonNeighbors(g,next.atom.id).filter(x=>aro.has(x.atom.id));
        if(next&&rxHydrogens(g,next.atom.id)===1&&ar.length===2&&protectionPath(g,ar[0].atom.id,ar[1].atom.id,[next.atom.id])===3)id='fmoc';
      }
      if(id){carbamateO.add(o.atom.id);add(id,n.atom.id,atoms.concat(n.atom.id),{hasNH:rxHydrogens(g,n.atom.id)>0||rxNeighbors(g,n.atom.id).some(x=>['H','D'].includes(x.atom.element))});}
    }else if(c.kind==='ester'){
      if(tbu(a))id='tbu-ester';else if(methyl(a))id='methyl-ester';else if(benzylic(a))id='benzyl-ester';
      if(id){carbamateO.add(o.atom.id);add(id,c.c,atoms);}
    }
  });
  g.atoms.filter(a=>a.element==='O'&&!a.charge&&!carbamateO.has(a.id)).forEach(o=>{
    const ns=rxNeighbors(g,o.id);if(ns.length!==2||ns.some(n=>n.bond.order!==1))return;
    const si=ns.find(n=>n.atom.element==='Si'&&!n.atom.charge);
    if(si){
      const ss=rxNeighbors(g,si.atom.id),cs=ss.filter(n=>n.atom.element==='C'&&n.bond.order===1);
      if(ss.length!==4||cs.length!==3||!ns.some(n=>n.atom.element==='C'&&(aro.has(n.atom.id)||rxIsSp3(g,n.atom.id))))return;
      let id='silyl';const me=cs.filter(n=>methyl(n.atom.id)).length,tb=cs.filter(n=>tbu(n.atom.id)).length;
      const iso=id=>rxHydrogens(g,id)===1&&rxCarbonNeighbors(g,id).length===2&&rxCarbonNeighbors(g,id).every(x=>methyl(x.atom.id));
      if(me===3)id='tms';else if(me===2&&tb===1)id='tbs';else if(cs.every(n=>iso(n.atom.id)))id='tips';else if(tb===1&&cs.filter(n=>aro.has(n.atom.id)).length===2)id='tbdps';
      add(id,o.id,[o.id,si.atom.id].concat(cs.map(n=>n.atom.id)),{phenolic:ns.some(n=>aro.has(n.atom.id))});return;
    }
    if(!ns.every(n=>n.atom.element==='C'&&!rxNeighbors(g,n.atom.id).some(x=>x.bond.order===2&&x.atom.element==='O')))return;
    const bn=ns.find(n=>benzylic(n.atom.id));if(!bn)return;
    const aryl=rxNeighbors(g,bn.atom.id).find(n=>aro.has(n.atom.id)),ring=aryl&&info.aromatic.rings.find(r=>r.length===6&&r.includes(aryl.atom.id));
    let pmb=false;
    if(ring){const ri=ring.indexOf(aryl.atom.id),opposite=ring[(ri+3)%6];pmb=rxNeighbors(g,opposite).some(n=>n.atom.element==='O'&&!n.atom.charge&&n.bond.order===1&&rxNeighbors(g,n.atom.id).some(x=>x.atom.id!==opposite&&methyl(x.atom.id)));}
    add(pmb?'pmb':'benzyl',o.id,[o.id,bn.atom.id,aryl.atom.id]);
  });
  g.atoms.filter(a=>a.element==='C'&&!a.charge&&rxIsSp3(g,a.id)).forEach(c=>{
    const ns=rxNeighbors(g,c.id),os=ns.filter(n=>n.atom.element==='O'&&!n.atom.charge&&n.bond.order===1&&rxNeighbors(g,n.atom.id).length===2&&rxNeighbors(g,n.atom.id).every(x=>x.atom.element==='C'&&x.bond.order===1));
    if(os.length!==2||ns.some(n=>!['C','O','H','D'].includes(n.atom.element)))return;
    add('acetal',c.id,[c.id,...os.map(n=>n.atom.id)],{cyclic:Number.isFinite(protectionPath(g,os[0].atom.id,os[1].atom.id,[c.id]))});
  });
  return sites;
}
function protectionContext(compounds,conditions) {
  if(compounds&&typeof compounds.has==='function'&&compounds.conditions)return compounds;
  const cs=(Array.isArray(compounds)?compounds:[]).map(c=>typeof c==='string'?{smiles:c,fragment:smilesToFragment(c),role:'reagent',equiv:1}:Object.assign({},c,{fragment:c.fragment||smilesToFragment(c.smiles)}));
  return reactionContext(cs,conditions||{});
}
function protectionThreats(compounds,conditions) {
  if(Array.isArray(compounds)&&compounds.every(t=>typeof t==='string')&&!conditions&&compounds.every(t=>PROTECTION_THREAT_IDS.includes(t)))return compounds.slice();
  const ctx=protectionContext(compounds,conditions),ts=[];const add=t=>{if(!ts.includes(t))ts.push(t);};
  if(ctx.has('strongAcid')){add('acid');if(ctx.has('H2O'))add('aqueousAcid');}
  if(ctx.has('fluoride'))add('fluoride');
  if(ctx.has('H2')&&ctx.has('hydrogenationCatalyst'))add('hydrogenolysis');
  if(ctx.has('HBr')||ctx.has('HI')||ctx.has('sulfuricAcid'))add('otherReactive');
  if((ctx.has('grignard')||ctx.has('alanate'))&&(ctx.protic||!ctx.conditions.solvents.some(id=>['thf','ether'].includes(id))))add('otherReactive');
  if(ctx.has('hydroxide')){add('strongBase');if(ctx.has('H2O'))add('aqueousBase');}
  if(['hydride','amideBase','sodamide','alkoxide'].some(t=>ctx.has(t)))add('strongBase');
  if((ctx.conditions.additives||[]).some(t=>['piperidine','dbu'].includes(t)))add('fmocBase');
  if(ctx.substrates.some(s=>s.compound&&s.compound.role==='reagent'&&s.info.amines.some(a=>a.h===1)))add('fmocBase');
  if(ctx.has('amineBase')||ctx.has('weakBase')||(ctx.conditions.additives||[]).includes('imidazole'))add('weakBase');
  if(ctx.has('grignard'))add('organometallic');
  if(ctx.has('zinc'))add('organozinc');
  if(ctx.has('alanate'))add('alanate');if(ctx.has('dibal'))add('dibal');if(ctx.has('borohydride')||ctx.has('mildHydride'))add('borohydride');
  if(ctx.has('ddq')||ctx.has('can'))add('oxidative');
  if(ctx.has('pcc'))add('mildOxidative');
  if(['mcpba','ozone','permanganate','jones','hydrogenPeroxide','bbr3','lewis','dissolvingMetal','rosenmundCatalyst'].some(t=>ctx.has(t)))add('otherReactive');
  if(ctx.substrates.some(s=>s.info.carbonyls.some(c=>['acylChloride','anhydride'].includes(c.kind)))||ctx.has('boc2o')||ctx.has('cbzReagent')||ctx.has('fmocReagent'))add('acylation');
  // DCC/DMAP esterification under mild, nonaqueous conditions.
  // https://doi.org/10.1002/anie.197805221
  const mildCoupling=ctx.has('carbodiimide')&&ctx.temperature>=0&&ctx.temperature<=40&&!ctx.protic&&ctx.conditions.solvents.some(id=>['dcm','thf'].includes(id));
  if(mildCoupling)add('carbodiimide');
  const handled=new Set(['strongAcid','sulfuricAcid','HCl','HBr','HI','H2O','fluoride','H2','hydrogenationCatalyst','hydroxide','hydride','amideBase','sodamide','alkoxide','amineBase','weakBase','grignard','zinc','alanate','dibal','borohydride','mildHydride','ddq','can','boc2o','cbzReagent','fmocReagent','silylChloride','cation','quaternaryAmmonium','dmso','light','dmap','pcc','hydrazine']);
  if(mildCoupling)handled.add('carbodiimide');
  if([...ctx.species.keys()].some(tag=>!handled.has(tag)))add('otherReactive');
  const supportedAdditives=new Set(['h2so4','hcl','hbr','tsoh','h3po4','naoh','koh','naoet','kotbu','nah','lda','k2co3','et3n','pyr','cs2co3','k3po4','nanh2','imidazole','dmap','piperidine','dbu','pdc','pt','ni','ddq','can']);
  if((ctx.conditions.additives||[]).some(id=>!supportedAdditives.has(id)))add('otherReactive');
  if(ctx.substrates.some(s=>s.compound&&s.compound.role==='reagent'&&!s.info.carbonyls.some(c=>['acylChloride','anhydride'].includes(c.kind))&&!s.info.amines.some(a=>a.h===1)&&!s.graph.atoms.every(a=>a.element==='Zn')))add('otherReactive');
  if(ctx.temperature>60||ctx.temperature< -80)add('extremeTemperature');
  if(ctx.light||ctx.conditions.energy==='light')add('photochemical');
  return ts;
}
const PROTECTION_THREAT_IDS=['acid','aqueousAcid','fluoride','hydrogenolysis','strongBase','aqueousBase','fmocBase','weakBase','organometallic','organozinc','alanate','dibal','borohydride','oxidative','mildOxidative','acylation','otherReactive','extremeTemperature','photochemical','carbodiimide'];
function protectionGroupCompatibility(id,conditionsOrThreats,site) {
  const entry=PROTECTION_GROUPS.find(x=>x.id===id||x.label.toLowerCase()===String(id).toLowerCase());
  if(!entry)return {status:'unknown',reasons:['This protecting group is not in the bounded compatibility registry.']};
  const threats=Array.isArray(conditionsOrThreats)?conditionsOrThreats:protectionThreats(conditionsOrThreats),reasons=[];let status='compatible';
  const conflict=reason=>{status='conflict';reasons.push(reason);};const unknown=reason=>{if(status!=='conflict')status='unknown';reasons.push(reason);};
  if(!threats.length)unknown('No characterized reaction regime was recognized; absence of a flagged threat does not establish survival.');
  threats.forEach(t=>{
    const pg=entry.id,carbamate=['boc','cbz','fmoc'].includes(pg),ester=['tbu-ester','methyl-ester','benzyl-ester'].includes(pg),silyl=['tms','tbs','tips','tbdps','silyl'].includes(pg);
    if(t==='acid'||t==='aqueousAcid'){
      if(pg==='boc'||pg==='tbu-ester')conflict(entry.label+' is acid-labile and can be removed during this step.');
      else if(silyl)conflict('Acid can cleave '+entry.label+'; relative rates and selective partial cleavage are not encoded.');
      else if(pg==='acetal'){if(t==='aqueousAcid')conflict('Aqueous acid hydrolyses the acetal/ketal protecting group.');else if(!threats.includes('aqueousAcid'))unknown('Acetal survival under dry acid depends on water content and exchange; not assumed.');}
      else if(pg==='fmoc')reasons.push('Fmoc is acid-stable in its encoded mild acid regime; other substrate groups require separate checks.');
      else unknown(entry.label+' survival depends on acid identity, loading and time; a general strong-acid guarantee is not encoded.');
    }else if(t==='fluoride'){
      if(silyl)conflict('Fluoride cleaves Si–O protection; selective removal between silyl groups is not established by this model.');
      else unknown('Fluoride compatibility of '+entry.label+' is not independently encoded; do not infer orthogonality from a different removal mechanism.');
    }else if(t==='hydrogenolysis'){
      if(['cbz','benzyl','pmb','benzyl-ester'].includes(pg))conflict(entry.label+' is susceptible to catalytic hydrogenolysis.');
      else if(pg==='boc')reasons.push('Boc is retained in the encoded mild hydrogenolysis regime.');
      else unknown('Hydrogenation catalyst, pressure and substrate effects prevent a general '+entry.label+' survival claim.');
    }else if(t==='fmocBase'||t==='strongBase'||t==='aqueousBase'){
      if(pg==='fmoc')conflict('Base-promoted elimination can remove Fmoc.');
      else if(ester&&(t==='aqueousBase'||t==='strongBase'))t==='aqueousBase'?conflict('Aqueous base can hydrolyse the ester masking the acid.'):unknown('Ester stability depends on base and solvent; transesterification/hydrolysis is not excluded.');
      else if(silyl&&(site&&site.phenolic))conflict('Phenolic silyl ethers can be base-labile; do not use alkyl-silyl stability as a guarantee.');
      else if(silyl&&t!=='fmocBase')unknown('Silyl survival under strong base depends on substituents and medium; not universally established.');
      else reasons.push(entry.label+' has no encoded cleavage in this bounded base regime.');
    }else if(t==='organozinc'){
      if(ester)reasons.push(entry.label+' is retained in the bounded Reformatsky organozinc regime; the zinc enolate reacts at the partner aldehyde or ketone rather than its own ester.');
      else unknown(entry.label+' compatibility with this organozinc regime is not independently encoded.');
    }else if(t==='organometallic'){
      if(carbamate&&(site&&site.hasNH))conflict('The protected amine still has N–H and consumes organometallic reagent; a carbamate is not a universal amine solution.');
      else if(carbamate)unknown('Even without N–H, the carbamate carbonyl can react with organometallics; survival is not established.');
      else if(ester)conflict('Organometallic addition attacks the ester carbonyl; this is not compatible acid protection.');
      else if(pg==='acetal')reasons.push('Acetals mask carbonyl electrophilicity under the encoded dry basic/organometallic regime.');
      else if(pg==='tbs'||pg==='tms')reasons.push('Trialkylsilyl protection masks the alcohol proton in the encoded dry Grignard regime; other substrate conflicts remain separate.');
      else unknown(entry.label+' compatibility with this organometallic regime is not independently encoded.');
    }else if(t==='alanate'||t==='dibal'){
      if(carbamate||ester)conflict('Strong hydride can reduce the '+(carbamate?'carbamate':'ester')+' protecting functionality.');
      else if(pg==='acetal')reasons.push('The acetal masks the original carbonyl during the encoded hydride step.');
      else unknown('Hydride-specific cleavage of '+entry.label+' is not excluded.');
    }else if(t==='mildOxidative'){
      if(pg==='acetal')reasons.push('The acetal has no encoded cleavage in the bounded PCC oxidation regime; full-substrate selectivity remains separate.');
      else unknown('The mild-oxidant compatibility of '+entry.label+' is not independently encoded.');
    }else if(t==='extremeTemperature'&&pg==='acetal'){
      reasons.push('Temperature alone is not an encoded acetal-cleavage mechanism; acid, base, solvent and substrate effects are assessed separately.');
    }else if(t==='oxidative'){
      if(pg==='pmb')conflict('DDQ/CAN are encoded PMB removal reagents.');
      else if(pg==='benzyl'||pg==='cbz')unknown('Oxidative debenzylation can compete under some DDQ conditions; selective PMB removal is not a blanket guarantee.');
      else unknown('The oxidant compatibility of '+entry.label+' is not independently encoded.');
    }else if(t==='carbodiimide'){
      if(carbamate)reasons.push(entry.label+' is retained in the bounded mild DCC/DMAP coupling regime; full-substrate selectivity remains separate.');
      else unknown('Carbodiimide compatibility for '+entry.label+' is not independently encoded.');
    }else if(['weakBase','acylation','borohydride'].includes(t))reasons.push(entry.label+' has no encoded cleavage in the bounded '+t+' regime.');
    else unknown('The '+t+' regime is outside the encoded survival scope for '+entry.label+'.');
  });
  return {status,reasons:[...new Set(reasons)],references:entry.references.slice()};
}
function protectionAssess(value,compounds,conditions) {
  const threats=protectionThreats(compounds,conditions),sites=protectionGroups(value).map(site=>Object.assign({},site,protectionGroupCompatibility(site.id,threats,site)));
  const status=sites.some(s=>s.status==='conflict')?'conflict':sites.some(s=>s.status==='unknown')?'unknown':'compatible';
  return {version:1,status,sites,threats,references:[...new Map(sites.flatMap(s=>s.references).map(r=>[r.url,r])).values()],scope:'Group-level structural compatibility only. Unknown regimes are not compatible by default; full-substrate selectivity and feasibility require separate checks.'};
}
function protectionOrthogonality(value,removalId) {
  const group=PROTECTION_GROUPS.find(g=>g.id===removalId||g.label.toLowerCase()===String(removalId).toLowerCase());
  if(!group)return {status:'unknown',sites:[],reason:'Unknown removal group.'};
  const report=protectionAssess(value,[group.removal]);
  report.removing=group.id;report.collateral=report.sites.filter(s=>s.id!==group.id&&s.status!=='compatible');
  report.scope+=' Intended removal is reported as cleavage; collateral sites with conflict or unknown status must be reviewed.';
  return report;
}

function protectionCatalog() {
  return PROTECTION_GROUPS.map(g=>Object.assign({},g,{references:g.references.map(r=>Object.assign({},r)),liabilities:PROTECTION_THREAT_IDS.filter(t=>protectionGroupCompatibility(g.id,[t],{hasNH:g.kind==='amine',phenolic:false}).status==='conflict')}));
}
