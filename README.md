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

## Usage

`yarn add --dev @funnel-io/lalr`

### TypeScript

`yarn lalr --lambda-path dist/index.js --lambda-handler lambdaHandler --build-langauge ts --build "yarn tsc"`

### JavaScript

`yarn lalr --lambda-path dist/index.js --lambda-handler lambdaHandler --build-langauge js`
