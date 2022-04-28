import json
import socket
import sys
import importlib.util
import os.path
import inspect


conn = socket.create_connection(address=("localhost", 1337))

full_path_of_this_file, cwd, path, handler, event, context = sys.argv

module_name = os.path.basename(path).split(".")[0]
spec = importlib.util.spec_from_file_location(module_name, cwd + "/" + path)
code = importlib.util.module_from_spec(spec)
spec.loader.exec_module(code)

fn = getattr(code, handler)

arg_inspection = inspect.getfullargspec(fn)

if len(arg_inspection.args) == 0:
    output = fn()
elif len(arg_inspection.args) == 1:
    output = fn(event)
else:
    output = fn(event, context)

conn.send(json.dumps(output).encode("utf-8"))
