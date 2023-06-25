const fs = require('fs');
const apickli = require('apickli');
const {
  Before, After, BeforeAll, AfterAll,
} = require('@cucumber/cucumber');
const config = require('config');

// BeforeAll((cb) => {
// });

Before(function () {
  const host = config.get('base.instance.host');
  const port = config.get('base.instance.port');
  const protocol = config.get('base.instance.protocol');

  this.apickli = new apickli.Apickli(protocol, `${host}:${port}`, 'data');
  this.apickli.addRequestHeader('Cache-Control', 'no-cache');
  this.apickli.addRequestHeader('Content-Type', 'application/json');

  const publicK = fs.readFileSync('./data/user1/public.pem').toString();
  const [epkFile, spkFile] = publicK.split('\n----- SIGNATURE -----\n');
  this.apickli.storeValueInScenarioScope('EPK', JSON.stringify(epkFile));
  this.apickli.storeValueInScenarioScope('SPK', JSON.stringify(spkFile));

  // const obj = {
  //   at: 'user',
  //   key: epkFile,
  //   signature: spkFile,
  // };
  // fs.writeFileSync('./data/user1/body.json', JSON.stringify(obj))
});

// After(async () => {

// });

// AfterAll((cb) => {

// });
