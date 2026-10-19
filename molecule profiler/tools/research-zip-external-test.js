'use strict';
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const cmd=process.platform==='win32'?'python':'python3';
const out=spawnSync(cmd,[path.join(__dirname,'verify-research-zip.py')],{encoding:'utf8'});
if(out.stdout)process.stdout.write(out.stdout);
if(out.stderr)process.stderr.write(out.stderr);
if(out.error||out.status!==0)throw new Error('Independent ZIP validation failed: '+(out.error||out.status));
