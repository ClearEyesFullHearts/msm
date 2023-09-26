const MSMMain = require('./src/app');

(async () => {
  // await new MSMMain().start();
  const server = new MSMMain();
  await server.setup();
  server.start();
  await server.listen();
})();
