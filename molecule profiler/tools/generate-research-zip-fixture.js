'use strict';
const fs=require('node:fs');
global.ResearchZip=require('../js/research-zip.js');
const {createPackage}=require('../js/research-package.js');
const record={name:'Café, Test',smiles:'CCO',d:{formula:'C2H6O',mw:46.07,exactMass:46.0419,heavyAtoms:3,charge:0,tpsa:20,hbdStrict:1,hbaStrict:1,rotatableBonds:0,rings:0,fractionCsp3:1,logp:0.1,mr:12},v:{logS:-1}};
const other={name:'Water',smiles:'O',d:{...record.d,formula:'H2O',mw:18,logp:NaN},v:{logS:0}};
const data=createPackage([record,other],{},[{line:8,reason:'Parse error'}],{createdAt:'2026-10-19',assetToken:'js/app.js?v=test',referenceLibraryCount:42});
fs.writeFileSync(process.argv[2],ResearchZip.makeZip(data.files));
