// Small, declared reference set. Replaying known edges measures agreement with
// these endpoints, not blind route discovery or general experimental accuracy.
function routeBenchmarkCases() {
  const source=(title,url,kind='teaching')=>({title,url,kind});
  const oxidation=source('John McMurry, Organic Chemistry 17.7: alcohol oxidation','https://openstax.org/books/organic-chemistry/pages/17-7-oxidation-of-alcohols');
  const reduction=source('John McMurry, Organic Chemistry 17.4: carbonyl reduction','https://openstax.org/books/organic-chemistry/pages/17-4-alcohols-from-carbonyl-compounds-reduction');
  const ester=source('John McMurry, Organic Chemistry 21.6: ester chemistry','https://openstax.org/books/organic-chemistry/pages/21-6-chemistry-of-esters');
  const cleavage=source('John McMurry, Organic Chemistry 19.3: aldehyde and ketone oxidation','https://openstax.org/books/organic-chemistry/pages/19-3-oxidation-of-aldehydes-and-ketones');
  const edge=(from,to,reagents,conditions,note='')=>({from,to,compounds:[{smiles:from,role:'reactant'},...reagents],conditions,note});
  return [
    {id:'aspirin-lab',name:'Wintergreen ester → salicylic acid → aspirin',kind:'Published university laboratory sequence',references:[source('Donald L. Robertson, MiraCosta CHEM211 Experiment 3: Hydrolysis of Methyl Salicylate and Synthesis of Acetylsalicylic Acid','https://home.miracosta.edu/dlr/211exp3.htm','procedure')],
      scope:'The documented intermediate and product identities are replayed with simplified model conditions. Sequential acidification, isolation, purity and preparative outcomes are not simulated.',
      edges:[edge('COC(=O)c1ccccc1O','O=C(O)c1ccccc1O',[],{additives:['naoh'],solvents:['water'],temperature:100,reflux:true},'The source acidifies after base hydrolysis. This model edge checks the neutral acid endpoint after that work-up; it does not mix acid and base concurrently.'),
        edge('O=C(O)c1ccccc1O','CC(=O)Oc1ccccc1C(=O)O',[{smiles:'CC(=O)OC(C)=O',role:'reactant'},{smiles:'OS(=O)(=O)O',role:'reagent'}],{solvents:[],temperature:100},'Acetylation endpoint from the published laboratory sequence; isolation and catalyst concentration are outside the model.')]},
    {id:'reduction-esterification',name:'Ethanal → ethanol → ethyl acetate',kind:'Composed teaching example',references:[reduction,ester],scope:'A constructed two-edge exercise using the referenced reaction classes; not an exact preparative sequence reported by either source.',
      edges:[edge('CC=O','CCO',[{smiles:'[Na+].[BH4-]',role:'reagent'}],{solvents:['ethanol']}),edge('CCO','CCOC(C)=O',[{smiles:'CC(=O)O',role:'reactant'},{smiles:'OS(=O)(=O)O',role:'reagent'}],{solvents:[],temperature:80})]},
    {id:'secondary-oxidation',name:'Cyclopentanol → cyclopentanone',kind:'Teaching reaction-class example',references:[oxidation],scope:'Simple secondary-alcohol exercise. Exact substrate-specific conversion, yield and selectivity are not taken from the source.',edges:[edge('OC1CCCC1','O=C1CCCC1',[],{additives:['dmp'],solvents:['dcm']})]},
    {id:'ring-cleavage-gap',name:'Cyclohexanol → cyclohexanone → adipic acid',kind:'Composed teaching example / coverage challenge',references:[oxidation,cleavage],scope:'The second edge is a textbook ketone ring-cleavage endpoint. It deliberately exposes missing model coverage instead of assuming that every cited reaction is implemented.',edges:[edge('OC1CCCCC1','O=C1CCCCC1',[],{additives:['dmp'],solvents:['dcm']}),edge('O=C1CCCCC1','O=C(O)CCCCC(=O)O',[{smiles:'[K+].[O-][Mn](=O)(=O)=O',role:'reagent'}],{additives:['naoh'],solvents:['water'],temperature:100},'The neutral acid endpoint includes the separate acid work-up described in the source; ketone cleavage may be outside the current rules.')]},
  ];
}

async function routeBenchmarkRun(id) {
  const reference=routeBenchmarkCases().find(c=>c.id===id);
  if(!reference)throw new Error('Unknown reference route.');
  const edges=[];
  for(const [index,edge] of reference.edges.entries()) {
    // Yield between edges so the browser can paint the running state.
    await new Promise(resolve=>setTimeout(resolve,0));
    const step={...edge,conditions:normalizeReactionConditions(edge.conditions)};
    const report=routeWorkspaceValidateStep(step);
    edges.push({number:index+1,from:edge.from,to:edge.to,note:edge.note,status:report.status==='verified'?'reproduced':'unsupported',verification:report.status,reason:report.message,ruleId:report.ruleId||'',byproducts:report.outcome&&report.outcome.byproducts||[]});
  }
  const reproduced=edges.filter(e=>e.status==='reproduced').length;
  return {id:reference.id,name:reference.name,kind:reference.kind,scope:reference.scope,references:reference.references,expectedEdges:reference.edges.length,reproducedEdges:reproduced,unsupportedEdges:reference.edges.length-reproduced,status:reproduced===reference.edges.length?'reproduced':'coverage-gap',edges,interpretation:'Known-edge replay only. This is not blind route discovery, external accuracy estimation, experimental yield or substrate feasibility validation.'};
}

function createRouteBenchmarks(container,deps) {
  const make=(tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=String(text);return el;};
  const section=make('details'),heading=make('summary','Benign reference routes');section.append(heading);
  section.append(make('p','Compare known reference edges with the current rule model. Teaching examples and a published laboratory sequence are labelled separately; a missing edge is reported as a coverage gap.'));
  routeBenchmarkCases().forEach(reference=>{
    const card=make('article');card.append(make('h4',reference.name),make('p',reference.kind+'. '+reference.scope));
    reference.references.forEach(ref=>{const a=make('a',ref.title);a.href=ref.url;a.target='_blank';a.rel='noopener noreferrer';const p=make('p');p.append(a);card.append(p);});
    const run=make('button','Compare reference edges');run.type='button';const output=make('div');output.setAttribute('aria-live','polite');
    run.addEventListener('click',async()=>{
      run.disabled=true;output.replaceChildren(make('p','Checking reference edges…'));
      try {
        const report=await routeBenchmarkRun(reference.id);output.replaceChildren(make('p',report.reproducedEdges+' / '+report.expectedEdges+' expected edges reproduced. '+report.interpretation));
        report.edges.forEach(e=>{output.append(make('p',e.number+'. '+e.from+' → '+e.to+' · '+e.status+': '+e.reason+(e.note?' '+e.note:'')));});
        if(deps&&deps.onResult)deps.onResult(report);
      } catch(error) {output.replaceChildren(make('p','Reference comparison failed: '+error.message));}
      finally {run.disabled=false;}
    });card.append(run,output);section.append(card);
  });container.append(section);return section;
}
