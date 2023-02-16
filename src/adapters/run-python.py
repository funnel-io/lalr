import json
import socket
import sys
import importlib.util
import os.path
from dataclasses import dataclass
import inspect


conn = socket.create_connection(address=("localhost", 1337))

full_path_of_this_file, cwd, path, handler, event, context = sys.argv

module_name = os.path.basename(path).split(".")[0]
spec = importlib.util.spec_from_file_location(module_name, cwd + "/" + path)
code = importlib.util.module_from_spec(spec)
spec.loader.exec_module(code)

fn = getattr(code, handler)

@dataclass
class AWSContext:
    aws_request_id: str

    @staticmethod
    def from_input(lalr_input):
        return AWSContext(
            aws_request_id=lalr_input["aws_request_id"],
        )


arg_inspection = inspect.getfullargspec(fn)

if len(arg_inspection.args) == 0:
    output = fn()
elif len(arg_inspection.args) == 1:
    event = json.loads(event)
    output = fn(event)
else:
    event = json.loads(event)
    output = fn(event, AWSContext.from_input(json.loads(context)))

conn.send(json.dumps(output).encode("utf-8"))
