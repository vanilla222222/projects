// Explicit staged predictions. Each boundary represents an independently
// prepared fresh mixture, never an inferred telescoped or one-pot operation.
const REACTION_CASCADE_SCOPE = 'Up to six explicit stages using existing forward rules. Only the selected product is carried to a fresh mixture. Branches, minor products and named byproducts are retained as records; no kinetic cascade, isolation, yield, balanced material flow or one-pot compatibility is inferred.';

function reactionCascadeRun(startSmiles, stages, options) {
  const opts=options||{},maxStages=Math.max(1,Math.min(6,Math.floor(Number(opts.maxStages)||6)));
  const report={status:'invalid',start:'',current:'',target:'',stages:[],route:[],issues:[],scope:REACTION_CASCADE_SCOPE};
  const identity=text=>pathFinderStructure(text);
  const fail=(status,message)=>{report.status=status;report.issues.push(message);return report;};
  if(!Array.isArray(stages)||!stages.length||stages.length>maxStages)return fail('invalid','Supply 1–'+maxStages+' explicit stages.');
  try {
    const start=identity(startSmiles);report.start=start.smiles;report.current=start.smiles;
    for(let index=0;index<stages.length;index++){
      const stage=stages[index];
      if(!stage||typeof stage!=='object'||Array.isArray(stage))return fail('invalid','Stage '+(index+1)+' must be an object.');
      if(index>0&&stage.freshMixture!==true)return fail('blocked','Stage '+(index+1)+' requires freshMixture: true. Carry-over reagents and one-pot compatibility are not modelled.');
      const rawReagents=stage.reagents||[];
      if(!Array.isArray(rawReagents)||rawReagents.length>=REACTION_LIMITS.maxCompounds)return fail('invalid','Too many reagents in stage '+(index+1)+'.');
      const from=identity(report.current),compounds=[{smiles:from.smiles,fragment:smilesToFragment(from.smiles),role:'reactant',equiv:1}];
      for(const input of rawReagents){
        if(!input||typeof input.smiles!=='string'||input.smiles.length>5000)return fail('invalid','Every stage reagent needs a valid SMILES string.');
        const role=input.role||'reagent';
        if(!['reactant','reagent','catalyst','solvent'].includes(role))return fail('invalid','Unknown reagent role in stage '+(index+1)+'.');
        const fragment=smilesToFragment(input.smiles);
        if(reactionFragmentGraph(fragment).atoms.length>120)return fail('invalid','Each stage reagent is limited to 120 atoms.');
        const equiv=input.equiv===undefined?'1':String(input.equiv);
        const amount=reactionParseAmount(equiv);
        if(!amount)return fail('invalid','Stage '+(index+1)+' has an invalid reagent amount.');
        if(amount.kind!=='equiv')return fail('invalid','Stage '+(index+1)+' requires reagent equivalents because no carried-material scale is recorded.');
        compounds.push({smiles:input.smiles,fragment,role,label:String(input.label||'').slice(0,120),equiv});
      }
      const conditions=normalizeReactionConditions(stage.conditions||{}),prediction=predictReaction(compounds,conditions);
      const outcomes=[prediction.best,...(prediction.alternatives||[])].filter(Boolean);
      if(outcomes.length>64)return fail('blocked','The stage produced too many alternative branches for this bounded inspector.');
      const branches=outcomes.map((o,i)=>({outcomeId:o.id,name:o.name,rule:o.rule,alternative:i>0,partialConversion:!!o.partialConversion,
        products:(o.products||[]).map(p=>p.isomericSmiles||p.smiles),minor:(o.minor||[]).map(p=>p.isomericSmiles||p.smiles),byproducts:(o.byproducts||[]).map(String),warnings:(o.warnings||[]).map(String)}));
      const entry={number:index+1,from:from.smiles,freshMixture:index===0||stage.freshMixture===true,compounds,conditions,branches,selected:null};
      report.stages.push(entry);
      if(!outcomes.length)return fail('unsupported','No forward rule matched stage '+(index+1)+'. '+(prediction.hints||[]).join(' '));
      let target=null;
      if(stage.target){target=identity(stage.target);}
      const choices=[];
      outcomes.forEach((outcome,i)=>{
        if(stage.outcomeId&&outcome.id!==stage.outcomeId)return;
        [...(outcome.products||[]).map(product=>({product,minor:i>0})),...(outcome.minor||[]).map(product=>({product,minor:true}))].forEach(choice=>{
          const product=identity(choice.product.isomericSmiles||choice.product.smiles);
          if(!target||target.key===product.key)choices.push({...choice,outcome,identity:product});
        });
      });
      if(!choices.length)return fail('unsupported','The selected product or outcome was not reproduced at stage '+(index+1)+'.');
      // Different outcomes with the same product still require a rule choice;
      // the recorded conditions/warnings must have an unambiguous provenance.
      const unique=new Map();
      choices.forEach(c=>unique.set([c.outcome.id,c.identity.key,c.minor].join('|'),c));
      if(unique.size!==1)return fail('ambiguous','Stage '+(index+1)+' has '+unique.size+' possible carried branches. Set target and, if needed, outcomeId to select one explicitly.');
      const selected=[...unique.values()][0],o=selected.outcome;
      const candidate={transform:'staged-'+o.rule,rule:o.rule,outcomeRule:o.rule,outcomeId:o.id,outcomeName:o.name,name:o.name,group:o.type||'Staged reaction',
        precursors:compounds.filter(c=>c.role==='reactant').map(retroPrecursorInfo),reagents:compounds.filter(c=>c.role!=='reactant'),
        compounds,conditions,outcome:o,product:selected.product,minor:selected.minor,labels:reactionConditionLabels(conditions,compounds)};
      entry.selected={outcomeId:o.id,name:o.name,to:selected.identity.smiles,minor:selected.minor,byproducts:(o.byproducts||[]).map(String)};
      if(o.partialConversion)return fail('blocked','Stage '+(index+1)+' is only an unestablished partial-conversion alternative.');
      if(typeof routeStepAssessment==='function'){
        const assessment=routeStepAssessment(candidate);entry.assessment=assessment;
        if(assessment.blockers.length)return fail('blocked','Stage '+(index+1)+': '+assessment.blockers.map(b=>b.message).join(' '));
      }
      if(typeof retroForwardCheck==='function'&&!retroForwardCheck(candidate,selected.identity.smiles))return fail('blocked','Stage '+(index+1)+' did not pass an independent forward replay.');
      const precursor=candidate.precursors.findIndex(p=>identity(p.isomericSmiles||p.smiles).key===from.key);
      if(precursor<0)return fail('invalid','The carried intermediate is missing from this stage’s reactants.');
      report.route.push({from:from.smiles,to:selected.identity.smiles,fromKey:from.key,toKey:selected.identity.key,precursor,candidate});
      report.current=selected.identity.smiles;
    }
    report.target=report.current;report.status='complete';return report;
  } catch(error) {return fail('invalid',error.message);}
}

function reactionCascadeElement(report) {
  const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=String(text);if(cls)e.className=cls;return e;};
  const root=make('section',undefined,'reaction-cascade-report');
  root.append(make('p','Staged prediction: '+report.status),make('p',report.scope));
  (report.issues||[]).forEach(t=>root.append(make('p',t)));
  report.stages.forEach(stage=>{
    const card=make('article',undefined,'path-step');card.append(make('h4','Stage '+stage.number),make('p','Carried input: '+stage.from));
    if(stage.selected)card.append(make('p','Selected: '+stage.selected.name+' → '+stage.selected.to+(stage.selected.minor?' · minor/alternative prediction':'')));
    const details=make('details');details.append(make('summary','Recorded products and branches · '+stage.branches.length));
    stage.branches.forEach(b=>{const branch=make('div');branch.append(make('strong',b.name+' ['+b.outcomeId+']'),make('p','Products: '+(b.products.join(' + ')||'none recorded')),make('p','Minor products: '+(b.minor.join(' + ')||'none recorded')),make('p','Named byproducts (not a balanced equation): '+(b.byproducts.join('; ')||'none recorded')));b.warnings.forEach(w=>branch.append(make('p',w)));details.append(branch);});
    card.append(details);root.append(card);
  });return root;
}

function createReactionCascade(container,deps) {
  deps=deps||{};
  const make=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
  const root=make('details'),title=make('summary','Explore explicit reaction stages'),intro=make('p',REACTION_CASCADE_SCOPE);
  const startLabel=make('label','Starting molecule (SMILES) '),start=make('input');start.value='CCO';startLabel.append(start);
  const stageLabel=make('label','Stages (JSON) '),input=make('textarea');input.rows=14;input.spellcheck=false;
  input.value=JSON.stringify([
    {reagents:[{smiles:'[O-][Mn](=O)(=O)=O.[K+]',role:'reagent'}],target:'CC(=O)O'},
    {freshMixture:true,reagents:[{smiles:'CCO',role:'reactant'}],conditions:{additives:['h2so4']},target:'CCOC(C)=O'}
  ],null,2);stageLabel.append(input);
  const run=make('button','Predict stages'),output=make('div');run.type='button';run.className='text-button';
  run.addEventListener('click',()=>{
    output.replaceChildren();
    try {
      const report=reactionCascadeRun(start.value,JSON.parse(input.value));output.append(reactionCascadeElement(report));
      if(report.status==='complete'&&deps.saveRoute){const save=make('button','Save staged route to workspace');save.type='button';save.className='text-button';save.addEventListener('click',()=>deps.saveRoute({version:1,start:report.start,target:report.target,steps:report.route,name:'Explicit staged route'}));output.append(save);}
    } catch(error){output.append(make('p','Invalid stage JSON: '+error.message));}
  });
  root.append(title,intro,startLabel,stageLabel,run,output);container.append(root);return {root,run,start,stages:input,output};
}
