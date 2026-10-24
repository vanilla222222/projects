"""Bootstrap behavior without installing packages or opening a real browser."""
import importlib.util,json,tempfile,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('launcher',ROOT/'launch.py');launcher=importlib.util.module_from_spec(spec);spec.loader.exec_module(launcher)
with tempfile.TemporaryDirectory() as directory:
 env=Path(directory);python=launcher.environment_python(env);python.parent.mkdir(parents=True);python.touch();calls=[]
 def run(args,**kwargs):calls.append(args);return subprocess.CompletedProcess(args,0)
 assert launcher.prepare(env,run)==python
 assert any('pip' in c for c in calls),'First launch installs missing marker dependencies'
 marker=json.loads((env/'molecule-profiler-install.json').read_text());assert marker['requirementsSha256']==launcher.dependency_digest()
 calls.clear();launcher.prepare(env,run);assert len(calls)==1,'Healthy environment reuses installation'
 def broken(args,**kwargs):calls.append(args);return subprocess.CompletedProcess(args,1 if '-c' in args else 0)
 calls.clear();launcher.prepare(env,broken);assert any('pip' in c for c in calls),'Broken imports trigger repair'
 (env/'molecule-profiler-install.json').write_text('{}');calls.clear();launcher.prepare(env,run);assert any('pip' in c for c in calls),'Changed requirements trigger installation'
print('Launcher bootstrap: first install, reuse, repair and changed requirements passed.')
