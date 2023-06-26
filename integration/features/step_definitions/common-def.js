const fs = require('fs');
const { Given, Then } = require('@cucumber/cucumber');
const Util = require('../support/utils');

Given(/^I load up (.*) public keys$/, function (folder) {
  const publicK = fs.readFileSync(`./data/${folder}/public.pem`).toString();
  const [epkFile, spkFile] = publicK.split('\n----- SIGNATURE -----\n');
  this.apickli.storeValueInScenarioScope('EPK', JSON.stringify(epkFile));
  this.apickli.storeValueInScenarioScope('SPK', JSON.stringify(spkFile));
});

Given(/^I set var (.*) to a (.*) characters long string$/, function (varName, length) {
  this.apickli.storeValueInScenarioScope(varName, Util.getRandomString(length));
});

Then('response body should be a challenge', function () {
  const respBody = JSON.parse(this.apickli.httpResponse.body);
  if (!respBody.token) throw new Error('No token on challenge');
  if (!respBody.passphrase) throw new Error('No passphrase on challenge');
  if (!respBody.iv) throw new Error('No iv on challenge');
  if (respBody.passphrase.length !== 684) throw new Error('Passphrase is not the right length');
  if (respBody.iv.length !== 24) throw new Error('Iv is not the right length');
  if (Buffer.from(respBody.token, 'base64').toString('base64') !== respBody.token) throw new Error('Token is not base64 encoded');
  if (Buffer.from(respBody.passphrase, 'base64').toString('base64') !== respBody.passphrase) throw new Error('Passphrase is not base64 encoded');
  if (Buffer.from(respBody.iv, 'base64').toString('base64') !== respBody.iv) throw new Error('Iv is not base64 encoded');

  this.apickli.storeValueInScenarioScope('challenge', respBody);
});

// Then('Decrypted challenge path (.*) should be (.*)', function (path, value) {

//   // this.apickli.scenarioVariables
// });
