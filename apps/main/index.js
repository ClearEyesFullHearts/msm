const MSMMain = require('./src/app');

(async () => {
  await new MSMMain().start();
})();
