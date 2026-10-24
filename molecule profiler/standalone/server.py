#!/usr/bin/env python3
"""Serve the complete standalone application and bounded local compute API."""
import argparse,json,subprocess,sys,threading,webbrowser
import urllib.request
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse
ROOT=Path(__file__).resolve().parents[1]
SLOTS=threading.BoundedSemaphore(2)
ACTIONS={'analyze','conformers','screen','fragments','replace','dock','bbb'}
class Handler(SimpleHTTPRequestHandler):
 def respond(self,status,payload):
  body=json.dumps(payload,allow_nan=False).encode();self.send_response(status);self.send_header('Content-Type','application/json');self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
 def allowed(self):
  # No cross-origin credential-free compute calls or DNS-rebinding hostnames.
  host=self.headers.get('Host','');origin=self.headers.get('Origin')
  return host.split(':')[0] in ('127.0.0.1','localhost') and (not origin or urlparse(origin).netloc==host)
 def do_GET(self):
  if self.path.split('?')[0]=='/api/status':
   if not self.allowed():return self.respond(403,{'error':'Use the same local origin.'})
   try:
    from engine import capabilities
    return self.respond(200,capabilities())
   except ImportError:return self.respond(503,{'error':'Install standalone/requirements.txt in this Python environment.'})
  if self.path.startswith('/api/'):return self.respond(404,{'error':'Unknown endpoint.'})
  return super().do_GET()
 def do_POST(self):
  if not self.allowed():return self.respond(403,{'error':'Use the same local origin.'})
  action=self.path.removeprefix('/api/')
  if action not in ACTIONS:return self.respond(404,{'error':'Unknown endpoint.'})
  try:length=int(self.headers.get('Content-Length','0'))
  except ValueError:return self.respond(400,{'error':'Invalid request length.'})
  if length<2 or length>3*1024*1024:return self.respond(413,{'error':'Request must be 2 bytes to 3 MB.'})
  try:
   payload=self.rfile.read(length).decode();obj=json.loads(payload)
   if not isinstance(obj,dict):raise ValueError()
  except (ValueError,UnicodeError):return self.respond(400,{'error':'Provide a JSON object.'})
  if not SLOTS.acquire(blocking=False):return self.respond(429,{'error':'Two jobs are already running. Try again after they complete.'})
  try:
   process=subprocess.run([sys.executable,str(ROOT/'standalone'/'worker.py'),action],input=payload,capture_output=True,text=True,timeout=120,cwd=ROOT)
   try:result=json.loads(process.stdout.strip().splitlines()[-1])
   except (ValueError,IndexError):result={'error':'Compute process failed. Verify dependencies and prepared molecular inputs.'}
   return self.respond(200 if process.returncode==0 and 'result' in result else 400,result)
  except subprocess.TimeoutExpired:return self.respond(408,{'error':'Job exceeded the 120-second compute limit.'})
  finally:SLOTS.release()
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=8765);parser.add_argument('--open-browser',action='store_true');args=parser.parse_args()
 try:server=ThreadingHTTPServer(('127.0.0.1',args.port),partial(Handler,directory=str(ROOT)))
 except OSError:
  if not args.open_browser:raise
  # Reuse this project's server if it already runs on the preferred port.
  try:
   with urllib.request.urlopen(f'http://127.0.0.1:{args.port}/api/status',timeout=2) as response:status=json.load(response)
   if status.get('project')=='Molecule Profiler' and status.get('engine')=='independent-local-v1':
    webbrowser.open(f'http://127.0.0.1:{args.port}');sys.exit(0)
  except Exception:pass
  server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(ROOT)))
 args.port=server.server_port
 if args.open_browser:threading.Timer(.3,lambda:webbrowser.open(f'http://127.0.0.1:{args.port}')).start()
 print(f'Molecule Profiler: http://127.0.0.1:{args.port} (local application and compute)',flush=True)
 try:server.serve_forever()
 except KeyboardInterrupt:server.server_close()
