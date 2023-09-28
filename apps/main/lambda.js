const serverless = require('serverless-http');
const MSMMain = require('./src/app');

let serverlessHandler;

async function setup(event, context) {
  const server = new MSMMain();
  await server.setup();
  const app = server.start();
  serverlessHandler = serverless(app);
  const result = await serverlessHandler(event, context);
  return result;
}

async function handler(event, context) {
  if (serverlessHandler) {
    const result = await serverlessHandler(event, context);
    return result;
  }

  const result = await setup(event, context);
  return result;
}

exports.handler = handler;
