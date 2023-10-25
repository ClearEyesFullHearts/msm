const serverless = require('serverless-http');
const MSMMain = require('./src/app');

const main = async () => {
  const server = new MSMMain();
  await server.setup();
  const app = server.start();

  return { handler: serverless(app) };
};

module.exports = main();
