"""Exercise browser-launch server startup/reuse/port collision without a GUI."""
import json,os,re,selectors,subprocess,sys,threading,urllib.request
from functools import partial
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
env={**os.environ,'BROWSER':'true'}

def start(port):
 process=subprocess.Popen([sys.executable,str(ROOT/'standalone/server.py'),'--open-browser','--port',str(port)],env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
 reader=selectors.DefaultSelector();reader.register(process.stdout,selectors.EVENT_READ)
 try:
  if not reader.select(10):raise AssertionError('Server did not report startup')
  line=process.stdout.readline();match=re.search(r'http://127.0.0.1:(\d+)',line)
  if not match:raise AssertionError('No startup URL: '+line)
  return process,int(match.group(1))
 except Exception:process.terminate();process.wait(timeout=3);raise
 finally:reader.close()

def stop(process):
 process.terminate();process.wait(timeout=3)

first,port=start(0)
try:
 with urllib.request.urlopen(f'http://127.0.0.1:{port}/api/status',timeout=10) as response:assert json.load(response)['project']=='Molecule Profiler'
 reused=subprocess.run([sys.executable,str(ROOT/'standalone/server.py'),'--open-browser','--port',str(port)],env=env,capture_output=True,text=True,timeout=10)
 assert reused.returncode==0 and not reused.stdout,'Second launch reuses the active project server'
finally:stop(first)

class Other(BaseHTTPRequestHandler):
 def do_GET(self):
  raw=b'{"project":"Other application"}';self.send_response(200);self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw)
 def log_message(self,*args):pass
other=ThreadingHTTPServer(('127.0.0.1',0),Other);thread=threading.Thread(target=other.serve_forever,daemon=True);thread.start()
try:
 process,chosen=start(other.server_port)
 try:
  assert chosen!=other.server_port,'Unrelated occupied port triggers a fresh localhost port'
  with urllib.request.urlopen(f'http://127.0.0.1:{chosen}/',timeout=10) as response:assert b'js/candidate-dashboard-ui.js' in response.read()
 finally:stop(process)
finally:other.shutdown();other.server_close()
print('Launcher server: browser-mode startup, existing instance reuse and unrelated port collision passed.')
