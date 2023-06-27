const fs = require('fs');
const assert = require('assert')
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

Then('response body should be a challenge', async function () {
  const respBody = JSON.parse(this.apickli.httpResponse.body);
  assert.ok(respBody.token);
  assert.ok(respBody.passphrase);
  assert.ok(respBody.iv);
  assert.strictEqual(respBody.passphrase.length, 684);
  assert.strictEqual(respBody.iv.length, 24);
  assert.strictEqual(Buffer.from(respBody.token, 'base64').toString('base64'), respBody.token);
  assert.strictEqual(Buffer.from(respBody.passphrase, 'base64').toString('base64'), respBody.passphrase);
  assert.strictEqual(Buffer.from(respBody.iv, 'base64').toString('base64'), respBody.iv);

  this.apickli.storeValueInScenarioScope('challenge', respBody);
  const pem = this.apickli.scenarioVariables.NEW_ESK;
  const resolved = Util.resolve(pem, respBody);

  this.apickli.storeValueInScenarioScope('resolved', resolved);
});

Then(/^resolved challenge path (.*) should be (.*)$/, function (path, value) {
  const obj = this.apickli.scenarioVariables.resolved;
  const test = Util.getPathValue(obj, path);
  const trueValue = this.apickli.replaceVariables(value);
  assert.deepStrictEqual(test, trueValue);
});

Then(/^resolved challenge path (.*) should match (.*)$/, function (path, expression) {
  const obj = this.apickli.scenarioVariables.resolved;
  const regexp = this.apickli.replaceVariables(expression);
  const regExpObject = new RegExp(regexp);
  const test = Util.getPathValue(obj, path);
  const success = regExpObject.test(test);
  assert.ok(success);
});

Then(/^I wait for (.*) seconds$/, async function (seconds) {
  const time = this.apickli.replaceVariables(seconds);
  await new Promise((resolve) => {
    setTimeout(resolve, (time * 1000));
  });
});

Then(/^I wait for (.*) ms$/, async function (seconds) {
  const time = this.apickli.replaceVariables(seconds);
  await new Promise((resolve) => {
    setTimeout(resolve, time);
  });
});