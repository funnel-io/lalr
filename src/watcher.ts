import nodemon from "nodemon";
import type { Settings } from "nodemon";
import fastify, { FastifyRequest, FastifyReply } from "fastify";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { spawn } from "child_process";
import net from "net";
import { Command } from "commander";

const methods = {
  node: "adapters/run-js.js",
  python: "adapters/run-python.py",
};


const program = new Command();
program
  .name("lambda-watcher")
  .description("Monitors your code and automatically hot-reloads your lambda")
  .version(process.env.VERSION) // Will be compiled with esbuild!
  .requiredOption("--lambda-path <path>", "The path of the actual file to run")
  .requiredOption(
    "--lambda-handler <function>",
    "The handler/function to run of the lambda path"
  )
  .requiredOption(
    "--executable <executable>",
    "The executable that should run your lambda."
  )
  .requiredOption(
    "--file-types <file-types>",
    "The file types that should be watched by nodemon, will in turn reload the setup on changes."
  )
  .option(
    "--build <yarn command>",
    "A command to run if you want nodemon to build your lambda before running it."
  )
  .option(
    "--build <yarn command>",
    "A command to run if you want nodemon to build your lambda before running it."
  )
  .option(
    "--cwd <directory>",
    "A directory to cd to before watching and running the lambda."
  )
  .option("--port <port>", "The port to listen to. Default 8080.", "8080")
  .option(
    "--host <url>",
    "The host to listen to. Default 127.0.0.1.",
    "127.0.0.1"
  );

program.parse(process.argv);

const options = program.opts();
console.log(options);
const cwd = options.cwd || process.cwd();
const executable = options["executable"];
const fileTypes = options["fileTypes"];

let n: null | typeof nodemon = null;
if (options["build"]) {
  console.log("Starting nodemon at", cwd, "executing", options["build"]);
  const opts: Settings = {
    runOnChangeOnly: true,
    cwd: cwd,
    exec: options["build"],
    ignore: ["dist"],
    ext: fileTypes,
  };
  console.log("Nodemon settings", opts);
  n = nodemon(opts)
    .on("start", () => {
      console.log("nodemon start");
    })
    .on("log", (log) => {
      console.log(log["colour"]);
    });
}

const server = fastify();

server.all("/*", async (request: FastifyRequest, reply: FastifyReply) => {
  console.log("fastify request", request.method);
  const event = createEvent(request);
  const response = await runLambda(event);
  reply
    .code(response.statusCode)
    .headers(response.headers || {})
    .send(response.body);
});


function createEvent(request: FastifyRequest): APIGatewayProxyEvent {
  const headers: Record<string, string> = {};
  const multiValueHeaders: Record<string, string[]> = {};
  const queryStringParameters: Record<string, string> = {};
  const multiValueQueryStringParameters: Record<string, string[]> = {};

  Object.entries(request.headers).forEach(([k, v]) => {
    if (Array.isArray(v)) {
      multiValueHeaders[k] = v;
      headers[k] = v[0];
    } else {
      multiValueHeaders[k] = [v];
      headers[k] = v;
    }
  });

  Object.entries(request.query).forEach(([k, v]) => {
    if (Array.isArray(v)) {
      queryStringParameters[k] = v[0];
      multiValueQueryStringParameters[k] = v;
    } else {
      queryStringParameters[k] = v;
      multiValueQueryStringParameters[k] = [v];
    }
  });

  const getPathOfURL = (x: string): string => {
    return x.replace(/^\/*/, "/").split("?")[0];
  };

  return {
    body: request.body != null ? JSON.stringify(request.body) : null,
    headers: headers,
    path: getPathOfURL(request.raw.url ?? ""),
    httpMethod: request.method,
    isBase64Encoded: false,
    multiValueHeaders: multiValueHeaders,
    pathParameters: {},
    queryStringParameters: queryStringParameters,
    multiValueQueryStringParameters: multiValueQueryStringParameters,
    stageVariables: {},
    requestContext: {
      accountId: "N/A",
      apiId: "N/A",
      authorizer: {},
      protocol: "N/A",
      httpMethod: "N/A",
      identity: {
        accessKey: "N/A",
        accountId: "N/A",
        apiKey: "N/A",
        apiKeyId: "N/A",
        caller: "N/A",
        clientCert: {
          clientCertPem: "N/A",
          serialNumber: "N/A",
          subjectDN: "N/A",
          issuerDN: "N/A",
          validity: {
            notAfter: "N/A",
            notBefore: "N/A",
          },
        },
        cognitoAuthenticationType: "N/A",
        cognitoAuthenticationProvider: "N/A",
        cognitoIdentityId: "N/A",
        cognitoIdentityPoolId: "N/A",
        principalOrgId: "N/A",
        sourceIp: "N/A",
        user: "N/A",
        userAgent: "N/A",
        userArn: "N/A",
      },
      path: "N/A",
      stage: "N/A",
      requestId: "N/A",
      requestTimeEpoch: -1,
      resourceId: "N/A",
      resourcePath: "N/A",
      routeKey: "N/A",
    },
    resource: "N/A",
  };
}

server.listen(
  parseInt(options.port),
  options.host,
  (err: any, address: any) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(`Server listening at ${address}`);
  }
);

async function runLambda(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const context = JSON.stringify({ ranLocally: "yes", "aws_request_id": "local" });
  let output: APIGatewayProxyResult = {
    statusCode: 500,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      error: "Internal server error",
    }),
  };

  const socketServer = net.createServer(function (socket) {
    socket.setEncoding("utf8");
    socket.on("data", (m: any) => {
      output = JSON.parse(m);
      socket.end();
      socket.destroy();
    });

    socket.pipe(socket);
  });
  socketServer.listen(1337, "127.0.0.1");

  if (typeof executable === "undefined") {
      console.log("No executable!, Exiting");
      return output;
  }
  const res = spawn(
    executable,
    [
      __dirname + "/" + methods[executable],
      cwd,
      options["lambdaPath"],
      options["lambdaHandler"],
      JSON.stringify(event),
      context,
    ],
    {}
  );
  res.stdout.on("data", (data) => {
    console.log('subprocess stdout: ', data.toString());
  });
  res.stderr.on("data", (data) => {
    console.log('subprocess stderr: ', data.toString());
  });

  let exited = false;
  res.on("exit", () => {
    exited = true;
  });

  while (!exited) {
    await sleep(100);
  }

  await sleep(100);
  socketServer.close();
  await sleep(100);

  return output;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

process.on("SIGINT", function () {
  console.log("Caught interrupt signal");
  server.close();
  if (n != null) {
    n.emit("quit");
  }
  process.exit(0);
});
