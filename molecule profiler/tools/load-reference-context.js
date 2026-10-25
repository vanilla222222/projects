'use strict';
const {LIBRARY}=require('../data/library'),{TARGETS}=require('../data/targets'),curated=require('../js/curated-references'),{CURATED_REFERENCES:data}=require('../data/curated-references');
module.exports=require('../js/reference-context').create(LIBRARY,TARGETS,curated,data);
