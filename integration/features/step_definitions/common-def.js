const fs = require('fs');
const assert = require('assert');
const { Given, Then } = require('@cucumber/cucumber');
const Util = require('../support/utils');

Given(/^I load up (.*) public keys$/, function (folder) {
  const file = fs.readFileSync(`./data/users/${folder}/public.pem`).toString();
  const [publicK, hash] = file.split('\n----- HASH -----\n');
  const [epkFile, spkFile] = publicK.split('\n----- SIGNATURE -----\n');
  this.apickli.storeValueInScenarioScope('EPK', JSON.stringify(epkFile));
  this.apickli.storeValueInScenarioScope('SPK', JSON.stringify(spkFile));
  this.apickli.storeValueInScenarioScope('SHA', hash);
});

Given(/^I load up (.*) private keys$/, function (folder) {
  const privateK = fs.readFileSync(`./data/users/${folder}/private.pem`).toString();
  const [eskFile, sskFile] = privateK.split('\n----- SIGNATURE -----\n');
  this.apickli.storeValueInScenarioScope('NEW_ESK', eskFile);
  this.apickli.storeValueInScenarioScope('NEW_SSK', sskFile);
  // this.apickli.storeValueInScenarioScope('ESK', eskFile);
  // this.apickli.storeValueInScenarioScope('SSK', sskFile);
});

Given(/^I set var (.*) to a (.*) characters long (.*)string$/, function (varName, length, format) {
  const isBase64 = format === 'base64 ';
  let str = Util.getRandomString(length, isBase64);
  if (format === 'hex ') {
    str = Buffer.from(str).toString('hex');
  }
  this.apickli.storeValueInScenarioScope(varName, str);
});

Given('I set signature header', function () {
  const {
    token, vault, contacts, ...restAuth
  } = this.apickli.scenarioVariables.AUTH;
  const signatureKey = this.apickli.scenarioVariables.SSK || this.apickli.scenarioVariables.NEW_SSK;
  const bodyObj = JSON.parse(this.apickli.requestBody);
  const data = JSON.stringify({
    ...restAuth,
    ...bodyObj,
  });

  const sig = Util.sign(signatureKey, data);
  this.apickli.addRequestHeader('x-msm-sig', sig);
});

Given('I set false signature header', function () {
  const falseSig = Util.getRandomString(129, true);
  this.apickli.addRequestHeader('x-msm-sig', falseSig);
});

Then('response body match a challenge', async function () {
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
  const pem = this.apickli.scenarioVariables.ESK || this.apickli.scenarioVariables.NEW_ESK;
  const resolved = Util.resolve(pem, respBody);
  this.apickli.httpResponse.body = JSON.stringify(resolved);

  this.apickli.storeValueInScenarioScope('resolved', resolved);
});

Then(/^response body path (.*) should match a challenge$/, async function (path) {
  const body = JSON.parse(this.apickli.httpResponse.body);
  const respBody = Util.getPathValue(body, path);
  const {
    id,
    challenge: {
      token,
      passphrase,
      iv,
    },
  } = respBody;
  assert.ok(token);
  assert.ok(passphrase);
  assert.ok(iv);
  assert.strictEqual(passphrase.length, 684);
  assert.strictEqual(iv.length, 24);
  assert.strictEqual(Buffer.from(token, 'base64').toString('base64'), token);
  assert.strictEqual(Buffer.from(passphrase, 'base64').toString('base64'), passphrase);
  assert.strictEqual(Buffer.from(iv, 'base64').toString('base64'), iv);

  this.apickli.storeValueInScenarioScope('challenge', respBody);
  const pem = this.apickli.scenarioVariables.ESK || this.apickli.scenarioVariables.NEW_ESK;
  const resolved = Util.resolve(pem, respBody.challenge);

  this.apickli.storeValueInScenarioScope('resolved', { id, ...resolved });
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
