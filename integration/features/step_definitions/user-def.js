const fs = require('fs');
const { Given } = require('@cucumber/cucumber');
const Util = require('../support/utils');

Given('I am a new invalidated user', async function () {
  const keys = await Util.generateKeyPair();
  const epk = keys.public.encrypt;
  const spk = keys.public.signature;
  this.apickli.storeValueInScenarioScope('NEW_EPK', JSON.stringify(epk));
  this.apickli.storeValueInScenarioScope('NEW_SPK', JSON.stringify(spk));
  this.apickli.storeValueInScenarioScope('NEW_ESK', keys.private.encrypt);
  this.apickli.storeValueInScenarioScope('NEW_SSK', keys.private.signature);
  const username = Util.getRandomString(25);
  this.apickli.storeValueInScenarioScope('MY_AT', username);

  await this.axios.post('/users', {
    at: username,
    key: epk,
    signature: spk,
  });
});

Given('I generate a false encryption key', function () {
  const publicK = fs.readFileSync('./data/user1/public.pem').toString();
  const [_, spkFile] = publicK.split('\n----- SIGNATURE -----\n');
  const pair = Util.generateFalseKeyPair();
  const epk = pair.public.encrypt;
  this.apickli.storeValueInScenarioScope('NEW_EPK', JSON.stringify(epk));
  this.apickli.storeValueInScenarioScope('NEW_SPK', JSON.stringify(spkFile));
  const username = Util.getRandomString(25);
  this.apickli.storeValueInScenarioScope('MY_AT', username);
});

Given('I generate a false signature key', function () {
  const publicK = fs.readFileSync('./data/user1/public.pem').toString();
  const [epkFile] = publicK.split('\n----- SIGNATURE -----\n');
  const pair = Util.generateFalseKeyPair();
  const spk = pair.public.signature;
  this.apickli.storeValueInScenarioScope('NEW_EPK', JSON.stringify(epkFile));
  this.apickli.storeValueInScenarioScope('NEW_SPK', JSON.stringify(spk));
  const username = Util.getRandomString(25);
  this.apickli.storeValueInScenarioScope('MY_AT', username);
});
