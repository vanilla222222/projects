#!/usr/bin/env python3
"""Working snapshots permit one feature commit without claiming a future Git SHA."""
import hashlib,runpy
from pathlib import Path
root=Path(__file__).resolve().parents[1]
b=runpy.run_path(str(root/'tools/build-reference-releases.py'))
r=b['snapshot']({'id':'working-test','label':'Working content pin','workingTree':True,'baseCommit':'f34865b7beaed7b886325915c06edb901fbd0b75'})
assert r['commit'] is None and r['snapshotOrigin']=='working-tree-content-hash'
assert r['sourceSha256']==hashlib.sha256((root/'data/curated-references.js').read_bytes()).hexdigest()
try:b['snapshot']({'id':'bad','workingTree':True,'baseCommit':'not-a-commit'})
except AssertionError:pass
else:raise AssertionError('Invalid publication-base reference accepted')
print('One-commit working release snapshot: content hash pinned, prior base not mislabeled as the new publication')
