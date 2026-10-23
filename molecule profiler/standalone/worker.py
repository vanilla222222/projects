"""Isolated, timeout-controlled compute process used by server.py."""
import json,sys
from engine import ACTIONS
try:
 result=ACTIONS[sys.argv[1]](json.load(sys.stdin));print(json.dumps({'result':result},allow_nan=False))
except Exception as error:
 print(json.dumps({'error':str(error)}));sys.exit(1)
