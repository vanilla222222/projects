// Research policies inspect recorded chemistry. They never waive forward
// identity, loading, compatibility or work-up checks.
const PLANNING_SETTINGS_DEFAULTS={priority:'balanced',selectivity:'standard',stereochemistry:'exact',evidence:'standard',diversity:'balanced',minTemperature:null,maxTemperature:null,allowPressure:true,allowCryogenic:true,allowPhotochemistry:true,allowElectrochemistry:true,allowSpecialCatalysts:true,avoidAcid:false,avoidBase:false,avoidWater:false,avoidAirSensitive:false,excludedIntermediates:[],forbiddenGroups:[],purificationPreference:'any',maxChromatography:null,budgetMs:null,maxNodes:null,maxBranch:null};
function planningSettingsNormalize(raw){
 if(raw!==undefined&&raw!==null&&(typeof raw!=='object'||Array.isArray(raw)))throw Error('Research settings must be an object.');
 const r=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{},out={...PLANNING_SETTINGS_DEFAULTS};
 const choices={priority:['balanced','steps','protection','conditions','purification'],selectivity:['standard','strict','review'],stereochemistry:['exact','mixtures','resolution'],evidence:['standard','curated','referenced','exploratory'],diversity:['balanced','maximum','cost'],purificationPreference:['any','extraction','crystallization','distillation','chromatography']};
 Object.entries(choices).forEach(([k,values])=>{if(r[k]!==undefined){if(!values.includes(r[k]))throw Error('Unknown '+k+' setting.');out[k]=r[k];}});
 Object.keys(out).filter(k=>typeof out[k]==='boolean').forEach(k=>{if(r[k]!==undefined){if(typeof r[k]!=='boolean')throw Error(k+' must be true or false.');out[k]=r[k];}});
 const bounds={minTemperature:[-100,300],maxTemperature:[-100,300],maxChromatography:[0,20],budgetMs:[100,30000],maxNodes:[1,200],maxBranch:[1,60]};
 Object.entries(bounds).forEach(([k,[lo,hi]])=>{if(r[k]!==undefined&&r[k]!==null&&r[k]!==''){const n=Number(r[k]);if(!Number.isFinite(n)||n<lo||n>hi)throw Error(k+' must be between '+lo+' and '+hi+'.');out[k]=k.includes('Temperature')?n:Math.floor(n);}});
 if(out.minTemperature!==null&&out.maxTemperature!==null&&out.minTemperature>out.maxTemperature)throw Error('Minimum temperature exceeds maximum temperature.');
 ['excludedIntermediates','forbiddenGroups'].forEach(k=>{const values=r[k]===undefined?[]:Array.isArray(r[k])?r[k]:String(r[k]).split(k==='excludedIntermediates'?/\n+/:/[\n,]+/);if(values.length>40)throw Error('At most 40 '+k+' entries.');out[k]=[...new Set(values.map(v=>String(v).trim()).filter(Boolean))];if(out[k].some(v=>v.length>1000))throw Error('Restriction text is too long.');});
 return out;
}
function planningSettingsCurrent(value){
 if(value!==undefined){const normalized=planningSettingsNormalize(value);planningSettingsCurrent.value=normalized;try{localStorage.setItem('chem-lab-research-settings',JSON.stringify(normalized));}catch(error){}return normalized;}
 if(!planningSettingsCurrent.value){try{planningSettingsCurrent.value=planningSettingsNormalize(JSON.parse(localStorage.getItem('chem-lab-research-settings')||'{}'));}catch(error){planningSettingsCurrent.value=planningSettingsNormalize({});}}
 return planningSettingsNormalize(planningSettingsCurrent.value);
}
function planningStereoAllowed(candidate,target,settings){
 if(candidate.stereo==='mismatch')return false;
 const mixed=candidate.stereo==='racemic'||['racemic','diastereomers'].includes(candidate.product?.stereo?.kind);
 return !mixed||(settings.stereochemistry==='mixtures'&&!/[@/\\]/.test(target));
}
function planningPolicyCreate(raw,context){
 const settings=planningSettingsNormalize(raw),ctx=context||{};
 const exclusions=settings.excludedIntermediates.map(text=>{try{return moleculeIdentity(reactionParseCompound(text).smiles).key;}catch(error){throw Error('Invalid excluded intermediate: '+text);}});
 const knownGroups=typeof RX_CHEMO_GROUP_LABELS==='object'?Object.keys(RX_CHEMO_GROUP_LABELS):[];
 settings.forbiddenGroups.forEach(g=>{if(!knownGroups.includes(g))throw Error('Unknown functional-group ID: '+g);});
 const structureBlocked=smiles=>{
  if(!smiles||!exclusions.length&&!settings.forbiddenGroups.length)return null;let identity;try{identity=moleculeIdentity(smiles).key;}catch(error){return 'Intermediate identity could not be checked.';}
  if([ctx.start,ctx.target].filter(Boolean).some(s=>{try{return moleculeIdentity(s).key===identity;}catch(error){return false;}}))return null;
  if(exclusions.includes(identity))return 'A generated intermediate is excluded by structure.';
  if(settings.forbiddenGroups.length){const groups=rxChemoGroups(retroFromSmiles(smiles));const found=settings.forbiddenGroups.find(g=>(groups[g]||[]).length);if(found)return 'Intermediate contains excluded functional group: '+found+'.';}return null;
 };
 const filtersActive=settings.minTemperature!==null||settings.maxTemperature!==null||['allowPressure','allowCryogenic','allowPhotochemistry','allowElectrochemistry','allowSpecialCatalysts'].some(k=>!settings[k])||['avoidAcid','avoidBase','avoidWater','avoidAirSensitive'].some(k=>settings[k])||settings.selectivity==='strict'||['curated','referenced'].includes(settings.evidence)||settings.maxChromatography!==null||exclusions.length||settings.forbiddenGroups.length;
 const check=(candidate,target)=>{
  if(!filtersActive)return [];
  const reasons=[];const add=(code,message)=>reasons.push({code,message});
  if(target){const blocked=structureBlocked(target);if(blocked)add('intermediate-policy',blocked);}
  (candidate.precursors||[]).forEach(p=>{const blocked=structureBlocked(p.isomericSmiles||p.smiles);if(blocked)add('intermediate-policy',blocked);});
  routePlanningOperations(candidate).forEach((op,index)=>{
   const c=normalizeReactionConditions(op.conditions||{}),out=op.outcome||{},temperature=typeof reactionEffectiveTemperature==='function'?reactionEffectiveTemperature(c):Number(c.temperature),name=op.outcomeName||op.name||candidate.name||'operation';
   const report=(code,message)=>add(code,(candidate.pgSteps?'Operation '+(index+1)+': ':'')+message);
   if(settings.minTemperature!==null&&temperature<settings.minTemperature||settings.maxTemperature!==null&&temperature>settings.maxTemperature)report('temperature-policy','Temperature is outside the selected range.');
   if(!settings.allowCryogenic&&temperature<0)report('equipment-policy','Subzero cooling is excluded.');
   if(!settings.allowPressure&&Number(c.pressure)>1)report('equipment-policy','Above-atmospheric pressure is excluded.');
   if(!settings.allowPhotochemistry&&(c.energy==='light'||/photo|light|hν/i.test(name)))report('equipment-policy','Photochemistry is excluded.');
   if(!settings.allowElectrochemistry&&/electrochem|electrolys|electrosynth/i.test([name,c.energy,c.notes].join(' ')))report('equipment-policy','Recorded electrochemistry is excluded.');
   const compounds=(op.compounds||[...(op.precursors||[]),...(op.reagents||[])]).map(p=>({...p,fragment:p.fragment||smilesToFragment(p.isomericSmiles||p.smiles)}));
   const rx=reactionContext(compounds,c),has=tags=>tags.some(tag=>rx.has(tag));
   if(settings.avoidAcid&&has(['strongAcid','lewis']))report('condition-policy','Recorded acid activation is excluded.');
   if(settings.avoidBase&&has(['hydroxide','alkoxide','hydride','amideBase','sodamide','weakBase','amineBase']))report('condition-policy','Recorded base activation is excluded.');
   if(settings.avoidWater&&(rx.has('H2O')||c.solvents.includes('water')))report('condition-policy','Aqueous conditions are excluded.');
   if(settings.avoidAirSensitive&&(['n2','ar'].includes(c.atmosphere)||has(['grignard','alanate','dibal','organozinc','palladium0'])))report('condition-policy','An inert atmosphere or encoded air-sensitive reagent is excluded.');
   const specialized=has(['palladium0','palladium2','hydrogenationCatalyst','rosenmundCatalyst','metathesis','copper','nickelPhosphineCoupling'])||(c.additives||[]).some(id=>/pd|rh|ru|ir|ni|grubbs|lindlar|rosenmund/i.test(id))||(op.compounds||[]).some(p=>p.role==='catalyst'&&reactionFragmentGraph(p.fragment||smilesToFragment(p.smiles)).atoms.some(a=>['Pd','Pt','Rh','Ru','Ir','Ni','Co','Cu','Fe','Sc','Ti','Zn'].includes(a.element)));
   if(!settings.allowSpecialCatalysts&&specialized)report('equipment-policy','A recorded specialized catalyst is excluded.');
   const evidence=out.evidence||(typeof reactionRuleDescriptor==='function'?reactionRuleDescriptor(op.outcomeRule||op.rule||candidate.outcomeRule||candidate.rule):null),refs=(evidence?.references||[]).filter(r=>/^https:\/\//.test(r.url||''));
   if(['referenced','curated'].includes(settings.evidence)&&!refs.length)report('evidence-policy','A linked reaction-class reference is required.');
   if(settings.evidence==='curated'&&(!evidence?.scope||/Detailed scope has not yet been curated/.test(evidence.scope)))report('evidence-policy','Curated reaction scope is required.');
   if(settings.selectivity==='strict'&&(out.regioselectivity?.status==='heuristic'||out.chemoselectivity||(out.warnings||[]).some(w=>/unresolved selectivity|racemi|stereochemical mixture|competing (?:site|pathway|reaction)/i.test(w))))report('selectivity-policy','Strict selectivity excludes recorded heuristic or unresolved selectivity warnings.');
   if(settings.maxChromatography!==null&&!['none','extraction','crystallization','distillation','chromatography'].includes(op.purification?.method))report('purification-policy','A chromatography limit requires recorded purification methods; this operation has none.');
   const blocked=structureBlocked(op.target||op.product?.isomericSmiles||op.product?.smiles);if(blocked)report('intermediate-policy',blocked);
  });return reasons;
 };
 const routeCheck=route=>{
  const operations=route.flatMap(link=>routePlanningOperations(link.candidate||link));
  const reasons=[];
  if(settings.stereochemistry==='resolution'&&!operations.some(op=>op.outcome?.resolution?.verified===true))reasons.push({code:'resolution-policy',message:'A forward-supported resolution operation is required; none is recorded. No resolution is assumed.'});
  if(settings.maxChromatography!==null&&operations.filter(op=>op.purification?.method==='chromatography').length>settings.maxChromatography)reasons.push({code:'purification-policy',message:'The route exceeds the maximum recorded chromatography stages.'});
  return reasons;
 };
 return {settings,check,routeCheck};
}
function planningRouteRank(route,base,settings){
 if(!settings||settings.priority==='balanced'&&settings.purificationPreference==='any')return base;
 const operations=route.flatMap(link=>routePlanningOperations(link.candidate||link)),conditions=operations.map(op=>normalizeReactionConditions(op.conditions||{}));
 const conditionBurden=conditions.reduce((n,c)=>n+Math.abs(Number(c.temperature)-25)/25+Math.max(0,Number(c.pressure)-1)+(c.energy==='light'?2:0)+(['n2','ar'].includes(c.atmosphere)?1:0),0);
 const purification=operations.reduce((n,op)=>n+(op.purification?1:0)+(settings.purificationPreference==='any'?0:op.purification?.method===settings.purificationPreference?0:op.purification?.method?2:1),Math.max(0,operations.length-1));
 const value=settings.priority==='balanced'?purification:settings.priority==='steps'?operations.length:settings.priority==='protection'?operations.filter(op=>routePlanningStepFacts(op).protection).length:settings.priority==='conditions'?conditionBurden:purification;
 const methodPreference=operations.reduce((n,op)=>n+(op.purification?.method===settings.purificationPreference?0:op.purification?.method?2:1),0);
 return [value,...(settings.purificationPreference!=='any'&&!['balanced','purification'].includes(settings.priority)?[methodPreference]:[]),...base];
}
function planningResearchSummary(raw){const s=planningSettingsNormalize(raw);return 'Priority: '+s.priority+' · selectivity: '+s.selectivity+' · stereo: '+s.stereochemistry+' · evidence: '+s.evidence+' · diversity: '+s.diversity+'. Constraints inspect recorded conditions; unknown purification methods and unsupported resolution are never inferred.';}

const PLANNING_LEGACY_FIELDS={depth:'path-depth',routes:'path-route-count',stock:'path-stock-policy',tree:'path-recipe-tree',inventory:'path-inventory',reagents:'path-forbidden-reagents',rules:'path-forbidden-rules',protection:'path-protection-policy',groups:'path-allowed-protecting-groups',masks:'path-managed-protection'};
function planningProfileNormalize(raw){
 if(!raw||raw.format!=='chem-lab-planning-profile'||raw.version!==1)throw Error('Use a version 1 Chem Lab planning profile.');
 const legacy={};Object.entries(raw.legacy||{}).forEach(([k,v])=>{if(!Object.hasOwn(PLANNING_LEGACY_FIELDS,k))return;const value=String(v);if(value.length>12000)throw Error('Profile field too long.');legacy[k]=value;});
 if(legacy.depth&&!/^(10|[1-9])$/.test(legacy.depth))throw Error('Invalid profile depth.');if(legacy.routes&&!['1','3','5'].includes(legacy.routes))throw Error('Invalid route count.');
 [['stock',['builtin','custom']],['tree',['on','off']],['protection',['auto','off']]].forEach(([k,values])=>{if(legacy[k]&&!values.includes(legacy[k]))throw Error('Invalid '+k+' profile value.');});
 return {format:'chem-lab-planning-profile',version:1,name:String(raw.name||'Research profile').slice(0,80),research:planningSettingsNormalize(raw.research),legacy};
}
function planningProfileText(name){const legacy={};Object.entries(PLANNING_LEGACY_FIELDS).forEach(([k,id])=>{const el=document.getElementById(id);if(el)legacy[k]=el.value;});return JSON.stringify(planningProfileNormalize({format:'chem-lab-planning-profile',version:1,name,research:planningSettingsCurrent(),legacy}),null,2);}
function planningProfileImport(text){if(typeof text!=='string'||text.length>50000)throw Error('Profile JSON must be smaller than 50 KB.');return planningProfileNormalize(JSON.parse(text));}
function planningSettingsCreate(container,onChange){
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;},fields={},status=el('p');status.className='research-settings-status';status.setAttribute('role','status');
 const groups=[['Strategy','Route priorities, selectivity and evidence'],['Constraints','Equipment and recorded reaction conditions'],['Materials','Intermediate exclusions and purification'],['Search','Search effort and route diversity']];
 const panels=groups.map(([title,description],i)=>{const detail=el('details'),summary=el('summary',title);detail.className='research-settings-group';detail.open=i===0;detail.append(summary,el('p',description));container.append(detail);return detail;});
 const readFields=()=>{const raw={};Object.entries(fields).forEach(([key,f])=>raw[key]=f.type==='checkbox'?f.checked:f.multiple?Array.from(f.options).filter(o=>o.selected).map(o=>o.value):f.value);const normalized=planningSettingsNormalize(raw);planningPolicyCreate(normalized,{});return normalized;};
 const change=()=>{try{planningSettingsCurrent(readFields());status.textContent='Settings saved. Existing searches retain their recorded settings; rerun to apply changes.';onChange?.();}catch(error){status.textContent=error.message;}};
 const add=(group,key,label,type,choices)=>{const wrap=el('label',label),f=el(type==='select'?'select':type==='textarea'?'textarea':'input');wrap.className='research-setting'+(type==='checkbox'?' is-toggle':'');if(type!=='select'&&type!=='textarea')f.type=type;f.setAttribute('aria-label',label);if(choices)choices.forEach(([value,text])=>{const o=el('option',text);o.value=value;f.append(o);});if(type==='number'){f.step='1';f.placeholder='Automatic / no limit';}if(type==='textarea'){f.rows=3;f.maxLength=12000;}fields[key]=f;f.addEventListener('change',change);wrap.append(f);panels[group].append(wrap);return f;};
 add(0,'priority','Rank routes by','select',[['balanced','Balanced research ranking'],['steps','Fewest reaction operations'],['protection','Fewest protection operations'],['conditions','Milder recorded conditions'],['purification','Lower recorded isolation burden']]);
 add(0,'selectivity','Selectivity policy','select',[['standard','Encoded compatibility checks'],['strict','Strict: exclude selectivity warnings'],['review','Review warnings; retain all hard blockers']]);
 add(0,'stereochemistry','Stereochemistry','select',[['exact','Exact stereochemical preparation'],['mixtures','Allow mixtures for unspecified centres only'],['resolution','Require a forward-supported resolution']]);
 add(0,'evidence','Evidence requirement','select',[['standard','Standard forward verification'],['curated','Curated scope + references'],['referenced','Linked reaction-class reference'],['exploratory','Exploratory candidates, still forward verified']]);
 panels[0].append(el('p','Specified R/S and E/Z identities are always enforced. No resolution transformations are currently encoded; requiring one can return no routes. Review/exploratory modes never waive chemistry blockers.'));
 [['allowPressure','Allow pressure above 1 atm'],['allowCryogenic','Allow temperatures below 0 °C'],['allowPhotochemistry','Allow photochemistry'],['allowElectrochemistry','Allow recorded electrochemistry'],['allowSpecialCatalysts','Allow specialized catalysts']].forEach(([k,label])=>add(1,k,label,'checkbox'));
 add(1,'minTemperature','Minimum recorded temperature (°C)','number');add(1,'maxTemperature','Maximum recorded temperature (°C)','number');
 [['avoidAcid','Exclude recorded acid activation'],['avoidBase','Exclude recorded base activation'],['avoidWater','Exclude recorded aqueous conditions'],['avoidAirSensitive','Exclude inert-atmosphere / encoded sensitive inputs']].forEach(([k,label])=>add(1,k,label,'checkbox'));
 add(2,'excludedIntermediates','Excluded intermediate structures (one name or SMILES per line)','textarea');
 const groupsSelect=add(2,'forbiddenGroups','Excluded intermediate functional groups (Ctrl / Cmd to select several)','select',Object.entries(RX_CHEMO_GROUP_LABELS).map(([key,label])=>[key,label]));groupsSelect.multiple=true;groupsSelect.size=6;
 add(2,'purificationPreference','Prefer recorded purification method','select',[['any','No method preference'],['extraction','Extraction'],['crystallization','Crystallization'],['distillation','Distillation'],['chromatography','Chromatography']]);add(2,'maxChromatography','Maximum recorded chromatography stages','number');
 panels[2].append(el('p','Intermediate and precursor exclusions permit the requested endpoints. Purification preferences rank recorded methods only. A hard chromatography limit excludes operations with unknown methods; current idealized purification does not identify or validate a method.'));
 add(3,'diversity','Alternative-route selection','select',[['balanced','Balanced diversity'],['maximum','Distinct paths (at most 50% feature overlap)'],['cost','Best ranked paths first']]);add(3,'budgetMs','Search time budget (100–30,000 ms)','number');add(3,'maxNodes','Maximum explored structures (1–200)','number');add(3,'maxBranch','Disconnections per node (1–60; tree cap 8)','number');
 panels[3].append(el('p','Budget controls apply to full-route searches. The disconnection popup filters its cached, forward-verified proposals. Time and node limits bound exploration; more time does not prove a route is optimal.'));
 const profiles=el('details'),profileTitle=el('summary','Profiles & portable settings'),pick=el('select'),name=el('input'),json=el('textarea');profiles.className='research-settings-group';pick.setAttribute('aria-label','Planning profile');name.placeholder='Profile name';name.setAttribute('aria-label','Profile name');json.rows=5;json.maxLength=50000;json.setAttribute('aria-label','Planning profile JSON');profiles.append(profileTitle,pick,name);container.append(profiles);
 const builtins={balanced:{},simple:{allowPressure:false,allowCryogenic:false,allowPhotochemistry:false,allowElectrochemistry:false,allowSpecialCatalysts:false,avoidAirSensitive:true,minTemperature:0,maxTemperature:80},stereo:{stereochemistry:'exact',selectivity:'strict',evidence:'curated'},short:{priority:'steps'}};
 let saved=[];try{const data=JSON.parse(localStorage.getItem('chem-lab-planning-profiles')||'[]');if(Array.isArray(data))saved=data.slice(0,20).map(planningProfileNormalize);}catch(error){}
 const saveProfiles=()=>{try{localStorage.setItem('chem-lab-planning-profiles',JSON.stringify(saved));}catch(error){status.textContent='Profile kept for this session; browser storage is unavailable.';}};
 const populate=()=>{const selected=pick.value;pick.replaceChildren();[['balanced','Balanced research'],['simple','Simple equipment'],['stereo','Exact stereochemistry'],['short','Fewest operations']].forEach(([key,text])=>{const o=el('option',text);o.value=key;pick.append(o);});saved.forEach((p,i)=>{const o=el('option',p.name);o.value='saved:'+i;pick.append(o);});if(Array.from(pick.options).some(o=>o.value===selected))pick.value=selected;};
 const apply=profile=>{const p=planningProfileNormalize(profile);planningPolicyCreate(p.research,{});planningSettingsCurrent(p.research);Object.entries(p.legacy).forEach(([k,value])=>{const n=document.getElementById(PLANNING_LEGACY_FIELDS[k]);if(n)n.value=value;});refresh();status.textContent='Applied '+p.name+'. Rerun a search to apply its constraints.';onChange?.();};
 const button=(text,fn)=>{const b=el('button',text);b.type='button';b.addEventListener('click',()=>{try{fn();}catch(error){status.textContent=error.message;}});profiles.append(b);};
 button('Apply profile',()=>apply(pick.value.startsWith('saved:')?saved[Number(pick.value.slice(6))]:{format:'chem-lab-planning-profile',version:1,name:pick.value,research:builtins[pick.value],legacy:{}}));
 button('Save profile',()=>{planningSettingsCurrent(readFields());const label=name.value.trim();if(!label)throw Error('Enter a profile name.');const p=planningProfileImport(planningProfileText(label)),index=saved.findIndex(x=>x.name===p.name);if(index>=0)saved[index]=p;else{if(saved.length>=20)throw Error('Keep at most 20 profiles.');saved.push(p);}saveProfiles();populate();status.textContent='Saved '+p.name+'.';});
 button('Delete saved profile',()=>{if(!pick.value.startsWith('saved:'))throw Error('Built-in profiles cannot be deleted.');saved.splice(Number(pick.value.slice(6)),1);saveProfiles();populate();status.textContent='Profile deleted.';});
 profiles.append(json);button('Export current JSON',()=>{planningSettingsCurrent(readFields());json.value=planningProfileText(name.value||'Research profile');status.textContent='Profile JSON ready to copy; endpoints and molecule phase history are excluded.';});button('Import / apply JSON',()=>apply(planningProfileImport(json.value)));
 button('Reset settings',()=>{planningSettingsCurrent({});refresh();status.textContent='Research settings reset; inventory and endpoints retained.';onChange?.();});
 container.append(status);const refresh=()=>{try{const text=localStorage.getItem('chem-lab-planning-profiles');if(text!==null){saved=JSON.parse(text).slice(0,20).map(planningProfileNormalize);populate();}}catch(error){}const s=planningSettingsCurrent();Object.entries(fields).forEach(([k,f])=>{if(f.type==='checkbox')f.checked=s[k];else if(f.multiple)Array.from(f.options).forEach(o=>o.selected=s[k].includes(o.value));else f.value=Array.isArray(s[k])?s[k].join('\n'):s[k]===null?'':String(s[k]);});};populate();refresh();return {refresh,read:readFields,status};
}
