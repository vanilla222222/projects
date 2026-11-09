'use strict';
// Calculated descriptors are separate from measured assay/property evidence.
(function(root){
  function create(dataset){
    const data=dataset||root.CHEMBL_CALCULATED_PROPERTIES;
    function get(entry){
      if(!entry||!data||data.schemaVersion!==1||data.kind!=='locally_calculated_descriptors'||!data.entries||!Object.prototype.hasOwnProperty.call(data.entries,entry.name))return null;
      const record=data.entries[entry.name];
      return record&&record.librarySmiles===entry.smiles?record:null;
    }
    return Object.freeze({get,metadata:data||null});
  }
  const api=Object.freeze({create,get:entry=>create().get(entry)});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ChEMBLProperties=api;
})(typeof globalThis!=='undefined'?globalThis:this);
