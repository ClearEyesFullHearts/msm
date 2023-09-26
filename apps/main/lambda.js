const serverlessExpress = require('@vendia/serverless-express');
const MSMMain = require('./src/app');

let serverlessExpressInstance;

async function setup(event, context) {
  const server = new MSMMain();
  await server.setup();
  const app = server.start();
  serverlessExpressInstance = serverlessExpress({ app });
  return serverlessExpressInstance(event, context);
}

function handler(event, context) {
  if (serverlessExpressInstance) return serverlessExpressInstance(event, context);

  return setup(event, context);
}

exports.handler = handler;
