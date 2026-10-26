'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),root=path.join(__dirname,'..'),hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const sourceSha256=Object.fromEntries(['js/smiles.js','js/mol.js','js/stereo.js','js/fingerprints.js'].map(p=>[p,hash(fs.readFileSync(path.join(root,p)))])),engine={schemaVersion:1,sha256:hash(JSON.stringify(sourceSha256)),sourceSha256};
fs.writeFileSync(path.join(root,'data/fingerprint-engine.js'),"'use strict';\nconst FINGERPRINT_ENGINE="+JSON.stringify(engine)+";\nif(typeof globalThis!=='undefined')globalThis.FINGERPRINT_ENGINE=FINGERPRINT_ENGINE;\nif(typeof module!=='undefined')module.exports=FINGERPRINT_ENGINE;\n");
