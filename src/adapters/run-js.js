const net = require("net");
const args = process.argv;

let [
  executable,
  fullPathOfThisFile,
  cwd,
  path,
  handler,
  event,
  context,
  ...rest
] = args;

// console.log("Running lambda", cwd, path, handler, event, context);
const output = require(cwd + "/" + path)[handler](
  JSON.parse(event),
  JSON.parse(context)
);

var client = new net.Socket();

client.connect(
  {
    port: 1337,
    host: "127.0.0.1",
  },
  () => {
    Promise.resolve(output).then(function (value) {
      client.write(JSON.stringify(value) + "\r\n");
      client.destroy();
    });
  }
);
