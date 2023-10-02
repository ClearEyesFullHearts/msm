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

/*
Can't use async initialization or we'll lose secret manager traces
const main = async () => {
  const server = new MSMMain();
  await server.setup();
  const app = server.start();

  return { handler: serverless(app) };
};

module.exports = main();
*/
