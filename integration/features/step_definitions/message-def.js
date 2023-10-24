const fs = require('fs');
const crypto = require('crypto');
const assert = require('assert');
const { Given, Then } = require('@cucumber/cucumber');
const Util = require('../support/utils');

Given(/^I set message body to (.*)$/, async function (messageBody) {
  const { to, title, content } = JSON.parse(messageBody);
  let epkFile;
  if (fs.existsSync(`./data/users/${to}/public.pem`)) {
    const publicK = fs.readFileSync(`./data/users/${to}/public.pem`).toString();
    const [key] = publicK.split('\n----- SIGNATURE -----\n');
    epkFile = key;
  } else {
    await this.get(`/user/${to}`);
    const { key } = JSON.parse(this.apickli.httpResponse.body);
    epkFile = key;
  }

  const cypheredTitle = Util.encrypt(epkFile, title);
  const cypheredContent = Util.encrypt(epkFile, content);
  this.apickli.setRequestBody(JSON.stringify({
    to,
    title: cypheredTitle,
    content: cypheredContent,
  }));
});

Then('resolved challenge should match a message', function () {
  const { resolved } = this.apickli.scenarioVariables;
  const {
    id,
    from,
    sentAt,
    title,
    content,
  } = resolved;

  assert.ok(id);
  assert.ok(from);
  assert.ok(sentAt);
  assert.ok(title);

  const pem = this.apickli.scenarioVariables.ESK;
  const clearTitle = Util.decrypt(pem, title);
  let clearContent;
  if (content) {
    clearContent = Util.decrypt(pem, content);
  }
  this.apickli.storeValueInScenarioScope('resolved', { ...resolved, title: clearTitle, content: clearContent });
});

Given(/^(.*) write a message as (.*)$/, async function (from, messageBody) {
  this.apickli.removeRequestHeader('x-msm-sig');
  this.apickli.removeRequestHeader('x-msm-pass');
  // load keys
  const file = fs.readFileSync(`./data/users/${from}/public.pem`).toString();
  const [publicK, hash] = file.split('\n----- HASH -----\n');
  const [epkFile, spkFile] = publicK.split('\n----- SIGNATURE -----\n');

  this.apickli.storeValueInScenarioScope('EPK', epkFile);
  this.apickli.storeValueInScenarioScope('SPK', spkFile);
  this.apickli.storeValueInScenarioScope('SHA', hash);
  const privateK = fs.readFileSync(`./data/users/${from}/private.pem`).toString();
  const [eskFile, sskFile] = privateK.split('\n----- SIGNATURE -----\n');
  this.apickli.storeValueInScenarioScope('ESK', eskFile);
  this.apickli.storeValueInScenarioScope('SSK', sskFile);

  const falseHash = crypto.randomBytes(32).toString('base64');
  this.apickli.addRequestHeader('x-msm-pass', falseHash);
  // get identity challenge
  await this.get(`/identity/${from}`);

  // resolve it for body
  const respBody = JSON.parse(this.apickli.httpResponse.body);
  const pem = this.apickli.scenarioVariables.ESK;
  const resolved = Util.resolve(pem, respBody);

  this.apickli.storeValueInScenarioScope('AUTH', resolved);

  this.apickli.httpResponse.body = JSON.stringify(resolved);

  // set bearer token
  this.apickli.setAccessTokenFromResponseBodyPath('$.token');
  this.apickli.setBearerToken();
  const { to, title, content } = JSON.parse(messageBody);
  let targetEpkFile;
  if (fs.existsSync(`./data/users/${to}/public.pem`)) {
    const publicTargetK = fs.readFileSync(`./data/users/${to}/public.pem`).toString();
    const [key] = publicTargetK.split('\n----- SIGNATURE -----\n');
    targetEpkFile = key;
  } else {
    await this.get(`/user/${to}`);
    const { key } = JSON.parse(this.apickli.httpResponse.body);
    targetEpkFile = key;
  }

  const cypheredTitle = Util.encrypt(targetEpkFile, title);
  const cypheredContent = Util.encrypt(targetEpkFile, content);
  this.apickli.setRequestBody(JSON.stringify({
    to,
    title: cypheredTitle,
    content: cypheredContent,
  }));

  const {
    token, contacts, ...restAuth
  } = this.apickli.scenarioVariables.AUTH;
  const signatureKey = this.apickli.scenarioVariables.SSK || this.apickli.scenarioVariables.NEW_SSK;
  const bodyObj = JSON.parse(this.apickli.requestBody);
  const data = JSON.stringify({
    ...restAuth,
    ...bodyObj,
  });

  const sig = Util.sign(signatureKey, data);
  this.apickli.addRequestHeader('x-msm-sig', sig);

  await this.post('/message');
});
