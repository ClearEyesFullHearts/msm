const { Given } = require('@cucumber/cucumber');
const Util = require('../support/utils');

Given('I am a new invalidated user', async function () {
  const keys = await Util.generateKeyPair();
  const epk = keys.public.encrypt;
  const spk = keys.public.signature;
  this.apickli.storeValueInScenarioScope('EPK', epk);
  this.apickli.storeValueInScenarioScope('SPK', spk);
  this.apickli.storeValueInScenarioScope('ESK', keys.private.encrypt);
  this.apickli.storeValueInScenarioScope('SSK', keys.private.signature);
  const username = Util.getRandomString(25);
  this.apickli.storeValueInScenarioScope('MY_AT', username);

  try {
    await this.axios.post('/users', {
      at: username,
      key: epk,
      signature: spk,
    });
  } catch (err) {
    console.log(err);
  }
});
