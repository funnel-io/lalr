import json


def my_python_handler():
    return {"statusCode": 204, "body": json.dumps({"hello": "world!"})}
