#!/usr/bin/env python3
"""Double-click bootstrap: isolated dependencies, then the local application."""
import hashlib,json,os,subprocess,sys,venv
from pathlib import Path
ROOT=Path(__file__).resolve().parent
ENV=ROOT/'.venv'

def environment_python(env=ENV):
 return env/('Scripts/python.exe' if os.name=='nt' else 'bin/python')

def dependency_digest():
 return hashlib.sha256((ROOT/'standalone/requirements.txt').read_bytes()).hexdigest()

def prepare(env=ENV,run=subprocess.run):
 python=environment_python(env);marker=env/'molecule-profiler-install.json';digest=dependency_digest()
 if not python.is_file():
  print('Creating the project Python environment…',flush=True)
  venv.EnvBuilder(with_pip=True).create(env)
 # Imports are checked on every launch, so a stale marker cannot hide a broken install.
 expected=dict(line.split('==') for line in (ROOT/'standalone/requirements.txt').read_text().splitlines() if '==' in line)
 probeCode='import rdkit,vina,meeko,gemmi,sys,json;from importlib.metadata import version;expected=json.loads(sys.argv[1]);assert all(tuple(map(int,version(k).split(".")))==tuple(map(int,v.split("."))) for k,v in expected.items())'
 probe=run([str(python),'-c',probeCode,json.dumps(expected)],capture_output=True,text=True)
 try:installed=json.loads(marker.read_text()).get('requirementsSha256')==digest
 except (OSError,ValueError):installed=False
 if not installed or probe.returncode:
  print('Installing pinned chemistry packages. First launch needs internet and may take several minutes…',flush=True)
  run([str(python),'-m','pip','install','-r',str(ROOT/'standalone/requirements.txt')],check=True)
  marker.write_text(json.dumps({'requirementsSha256':digest,'python':sys.version}))
 return python

def main():
 if sys.version_info<(3,12):raise RuntimeError('Install Python 3.12 or newer from python.org, then open Start Molecule Profiler again. Python 3.12 is the tested version.')
 python=prepare()
 print('Starting Molecule Profiler. Keep this window open; Ctrl+C stops the local server.',flush=True)
 return subprocess.call([str(python),str(ROOT/'standalone/server.py'),'--open-browser'],cwd=ROOT)

if __name__=='__main__':
 try:sys.exit(main())
 except KeyboardInterrupt:pass
 except Exception as error:
  print('\nMolecule Profiler could not start: '+str(error),file=sys.stderr)
  print('Check your internet connection, Python version and standalone setup instructions.',file=sys.stderr)
  if sys.stdin.isatty():input('Press Enter to close…')
  sys.exit(1)
