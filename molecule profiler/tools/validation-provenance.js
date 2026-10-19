'use strict';
// Content identity for local validation evidence, not a scientific validation claim.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {spawnSync} = require('node:child_process');
const EXTENSIONS = new Set(['.js','.py','.html','.css']);
function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }
function git(root, args) {
  const result = spawnSync('git', args, {cwd:root,encoding:'utf8',timeout:5000});
  return !result.error && result.status === 0 ? result.stdout : null;
}
function capture(root) {
  const files = [];
  function visit(directory) {
    for (const entry of fs.readdirSync(directory,{withFileTypes:true})) {
      const absolute = path.join(directory,entry.name);
      if (entry.isDirectory() && directory === root && ['js','data','tools','css'].includes(entry.name)) visit(absolute);
      else if (entry.isDirectory() && directory !== root && !entry.name.startsWith('.') && entry.name !== '__pycache__') visit(absolute);
      else if (entry.isFile() && EXTENSIONS.has(path.extname(entry.name))) {
        const bytes = fs.readFileSync(absolute);
        files.push({path:path.relative(root,absolute).split(path.sep).join('/'),bytes:bytes.length,sha256:sha256(bytes)});
      }
    }
  }
  visit(root);
  files.sort((a,b)=>a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  const head = git(root,['rev-parse','HEAD']);
  const commit = head === null ? null : head.trim();
  const status = git(root,['status','--porcelain=v1','-z','--untracked-files=all','--','.']);
  const changes = [];
  if (status !== null) {
    const entries = status.split('\0');
    for (let i=0;i<entries.length;i++) {
      const entry = entries[i];
      if (!entry) continue;
      const item = {status:entry.slice(0,2),path:entry.slice(3)};
      if (EXTENSIONS.has(path.extname(item.path))) changes.push(item);
      if (item.status.includes('R') || item.status.includes('C')) i++;
    }
  }
  return {
    algorithm:'SHA-256',
    scope:'Project root HTML/JS/Python/CSS plus js/, data/, tools/ and css/ source files; excludes generated JSON, logs and browser artifacts.',
    git:{commit,available:commit !== null,sourceDirty:status === null ? null : changes.length > 0,changes},
    fileCount:files.length, digest:sha256(JSON.stringify(files)),files
  };
}
function compare(before, after) {
  const old = new Map(before.files.map(file=>[file.path,file.sha256]));
  const current = new Map(after.files.map(file=>[file.path,file.sha256]));
  const changedFiles = [...new Set([...old.keys(),...current.keys()])]
    .filter(file=>old.get(file)!==current.get(file)).sort();
  const revisionChanged = before.git.commit !== after.git.commit;
  return {stable:changedFiles.length===0 && !revisionChanged,revisionChanged,changedFiles};
}
module.exports = {capture,compare};
