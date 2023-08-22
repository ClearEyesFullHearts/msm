(async () => {
  await require('@shared/secrets')();
  const MSMMain = require('./src/app');
  await new MSMMain().start();
})();
