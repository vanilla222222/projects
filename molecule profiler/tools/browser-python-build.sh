#!/bin/bash
set -euo pipefail
build_root=$1
cd "$build_root"
test "$(git rev-parse HEAD)" = aedd1440c9a1d79ea320b839f900368e9f2c802f
bash tools/prepare_pyodide_build.sh
export PIP_CONSTRAINT="$build_root/tools/constraints.txt"
pyodide build-recipes rdkit --install --install-dir=./repodata --log-dir=build-logs
bash tools/copy_pyodide_runtime.sh ./repodata
python - <<'PY'
from pathlib import Path
import hashlib,json
root=Path('repodata')
lock=json.loads((root/'pyodide-lock.json').read_text())
assert 'rdkit' in lock['packages'] and 'librdkit' in lock['packages']
manifest={'recipeCommit':'aedd1440c9a1d79ea320b839f900368e9f2c802f','packages':lock['info'],'files':{p.name:{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(root.iterdir()) if p.is_file()}}
(root/'molecule-profiler-runtime-manifest.json').write_text(json.dumps(manifest,indent=2))
print(json.dumps(manifest['packages']))
PY
