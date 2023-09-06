const fs = require('fs');
const apickli = require('apickli');
const {
  Before, BeforeAll, After,
} = require('@cucumber/cucumber');
const Util = require('./utils');

// lengths: ESK = 3222 SSK = 898
// lengths: ESK = 3222 SSK = 902

// BeforeAll((cb) => {
//   // Util.backupTable().then(cb);
//   Util.emptyTable()
//     .then(() => Util.restoreTable())
//     .then(cb);
// });

const ENDPOINT = 'bot77no7h6.execute-api.eu-west-3.amazonaws.com/test';

Before(function () {
  this.apickli = new apickli.Apickli('wss', ENDPOINT, 'data');

  const fileContent = fs.readFileSync(`${__dirname}/../../data/randoms.json`);
  const arrUsers = JSON.parse(fileContent);
  for (let i = 0; i < arrUsers.length; i += 1) {
    this.apickli.setGlobalVariable(`RANDOM_USER.${i}`, arrUsers[i]);
  }
});

After(function () {
  if (this.apickli.scenarioVariables.SOCKET) {
    this.apickli.scenarioVariables.SOCKET.close();
  }
});
