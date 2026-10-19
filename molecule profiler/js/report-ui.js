'use strict';
// Lightweight reporting layer over the existing app data; no changes to calculation engines.
(function(){
  const host=document.getElementById('molecule-report');
  if(!host||typeof MoleculeReport==='undefined')return;
  const get=id=>document.getElementById(id);
  function empty(node){node.replaceChildren();}
  function textEl(tag,value,className){
    const element=document.createElement(tag);
    element.textContent=String(value);
    if(className)element.className=className;
    return element;
  }
  function render(){
    const record=(typeof records!=='undefined'&&Array.isArray(records))?records[current]:null;
    host.hidden=!record;
    if(!record)return;
    const validation=typeof PROPERTY_VALIDATION==='undefined'?null:PROPERTY_VALIDATION.datasets;
    const m=MoleculeReport.summarize(record,validation,typeof propertyEvidenceWarnings==='function'?propertyEvidenceWarnings:null);
    get('report-title').textContent=m.name;
    get('report-formula').textContent=m.formula;
    get('report-smiles').textContent=m.smiles;
    get('report-date').textContent='Report viewed '+new Date().toLocaleString();
    const metrics=get('report-metrics');empty(metrics);
    m.metrics.forEach(item=>{
      const card=textEl('div','','report-metric');
      card.append(textEl('span',item.label,'report-metric-label'));
      card.append(textEl('strong',item.value+(item.unit?' '+item.unit:''),'report-metric-value'));
      card.append(textEl('small',item.kind,'report-metric-kind'));
      metrics.append(card);
    });
    const evidence=get('report-validation');empty(evidence);
    if(!m.evidence.length)evidence.append(textEl('p','No measured-error benchmark is currently available for this report.'));
    m.evidence.forEach(item=>{
      const line=textEl('div','','report-evidence');
      line.append(textEl('strong',item.title));
      line.append(textEl('span',item.detail));
      line.append(textEl('small',item.caveat));
      if(item.url){
        const a=textEl('a','Dataset ↗');a.href=item.url;a.target='_blank';a.rel='noopener noreferrer';line.append(a);
      }
      evidence.append(line);
    });
    const caution=get('report-cautions');empty(caution);
    caution.append(textEl('p',m.limitation));
    for(const warning of m.warnings)caution.append(textEl('p',warning,'report-warning'));
    if(!m.warnings.length)caution.append(textEl('p','No simple applicability flags were triggered; this is not a validation of safety or model accuracy.'));
  }
  get('report-print').addEventListener('click',()=>{
    render();
    window.print();
  });
  document.addEventListener('molecule-profiler:selected',render);
  document.addEventListener('molecule-profiler:updated',render);
  render();
})();
