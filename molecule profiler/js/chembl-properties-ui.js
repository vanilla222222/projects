'use strict';
(function(root){
 const fields=[['molecularWeight','Molecular weight','g/mol',2],['exactMass','Exact mass','Da',5],['cLogP','Calculated logP','',3],['tpsa','Topological polar surface area','Å²',2],['hbd','Hydrogen-bond donors','',0],['hba','Hydrogen-bond acceptors','',0],['rotatableBonds','Rotatable bonds','',0],['formalCharge','Formal charge','e',0],['heavyAtoms','Heavy atoms','',0]];
 function render(host,entry){
  const api=root.ChEMBLProperties,record=api?.get(entry),data=root.CHEMBL_CALCULATED_PROPERTIES;if(!record||!data)return null;
  const doc=host.ownerDocument,el=(tag,text)=>{const node=doc.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
  const section=el('section');section.className='chembl-calculated-properties';section.setAttribute('aria-label','Calculated structure properties');
  section.append(el('h3','Calculated structure properties'),el('p','Calculated locally with RDKit '+data.rdkitVersion+' from the complete stored structure. These are model and graph descriptors, not experimental measurements or ChEMBL-reported property values.'));
  const table=el('table');table.append(el('caption','Descriptors of this stored graph'));
  const head=el('thead'),headRow=el('tr');for(const label of ['Property','Value','Unit']){const th=el('th',label);th.scope='col';headRow.append(th);}head.append(headRow);table.append(head);
  const body=el('tbody');for(const [key,label,unit,places]of fields){const value=record.calculated[key];if(!Number.isFinite(value))continue;const row=el('tr'),th=el('th',label);th.scope='row';row.dataset.property=key;row.append(th,el('td',value.toFixed(places)),el('td',unit));body.append(row);}table.append(body);
  const wrap=el('div');wrap.className='research-table-wrap';wrap.append(table);section.append(wrap);
  section.append(el('p','Calculated logP is an estimate, not measured logP or pH-dependent logD. Charge and disconnected fragments are retained; values for salts or mixtures may have limited physical interpretation.'));
  const methods=el('details');methods.append(el('summary','Calculation methods and graph scope'),el('p',data.scope));
  for(const [key,label]of fields){const method=data.methods[key];if(method)methods.append(el('p',label+': '+method.method));}
  section.append(methods);host.append(section);return section;
 }
 const api={render};root.ChemblPropertiesUI=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
