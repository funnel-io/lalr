# LALR

Local API Gateway-lambda runner.

Runs your lambda locally with hot reloading through an API-gateway mock.

## Features

- Is able to listen to your source code and react to changes. Is also to compile your code.
- Starts a web server at 127.0.0.1:8080 and will through various adapters run your code and return it the HTTP client.

Language support:

- JavaScript
- TypeScript

## Dependencies

Due to esbuild having difficult bundling `nodemon`, it's required to have in your node environment before running.

## Motivation

AWS' `sam` has a CLI tool has a command `sam local start-api`, that will take a yaml file and start an API gateway mock HTTP server. The problem with this is that there [no support to hot reload your code](https://github.com/aws/aws-sam-cli/issues/901) from a built `asset` folder, you manually need to run `sam build` to build your lambda and then run it. If you're using aws-cdk to deploy your code, it doesn't really make sense to build your lambda with `sam build`.

## Usage

`yarn add --dev @funnel-io/lalr`

### TypeScript

`$ yarn lalr --lambda-path dist/index.js --lambda-handler lambdaHandler --build-language ts --build "yarn tsc"`

`$ curl http://localhost:8080`

### JavaScript

`$ yarn lalr --lambda-path dist/index.js --lambda-handler lambdaHandler --build-language js`

`$ curl http://localhost:8080`

### Run example lambda

`$ yarn lalr --lambda-path example-dist/index.js --lambda-handler myHandler --build-language js`

`$ curl -H "x-hello: test" "http://localhost:8080?queryParam=hello"`
