const fs = require('fs');
const crypto = require('crypto');
const { Given } = require('@cucumber/cucumber');
const Util = require('../support/utils');

Given('I am a new invalidated user', async function () {
  const keys = await Util.generateKeyPair();
  const epk = keys.public.encrypt;
  const spk = keys.public.signature;
  const sha = keys.public.signedHash;
  this.apickli.storeValueInScenarioScope('NEW_EPK', JSON.stringify(epk));
  this.apickli.storeValueInScenarioScope('NEW_SPK', JSON.stringify(spk));
  this.apickli.storeValueInScenarioScope('NEW_SHA', sha);
  this.apickli.storeValueInScenarioScope('NEW_ESK', keys.private.encrypt);
  this.apickli.storeValueInScenarioScope('NEW_SSK', keys.private.signature);
  const username = Util.getRandomString(25);
  this.apickli.storeValueInScenarioScope('MY_AT', username);

  this.apickli.setRequestBody(JSON.stringify({
    at: username,
    key: epk,
    signature: spk,
    hash: sha,
  }));
  await this.post('/users');
});

Given('I generate a false encryption key', function () {
  const file = fs.readFileSync('./data/users/user1/public.pem').toString();
  const [publicK] = file.split('\n----- HASH -----\n');
  const [_, spkFile] = publicK.split('\n----- SIGNATURE -----\n');
  const pair = Util.generateFalseKeyPair();
  const epk = pair.public.encrypt;

  const privateK = fs.readFileSync('./data/users/user1/private.pem').toString();
  const [ignore, sskFile] = privateK.split('\n----- SIGNATURE -----\n');

  const hash = crypto.createHash('sha256');
  hash.update(`${epk}\n${spkFile}`);
  const pkHash = hash.digest();

  const signedHash = Util.sign(sskFile, pkHash);

  this.apickli.storeValueInScenarioScope('NEW_EPK', JSON.stringify(epk));
  this.apickli.storeValueInScenarioScope('NEW_SPK', JSON.stringify(spkFile));
  this.apickli.storeValueInScenarioScope('NEW_SHA', signedHash);
  const username = Util.getRandomString(25);
  this.apickli.storeValueInScenarioScope('MY_AT', username);
});

Given('I generate a false signature key', function () {
  const publicK = fs.readFileSync('./data/users/user1/public.pem').toString();
  const [epkFile] = publicK.split('\n----- SIGNATURE -----\n');
  const pair = Util.generateFalseKeyPair();
  const spk = pair.public.signature;
  this.apickli.storeValueInScenarioScope('NEW_EPK', JSON.stringify(epkFile));
  this.apickli.storeValueInScenarioScope('NEW_SPK', JSON.stringify(spk));
  this.apickli.storeValueInScenarioScope('NEW_SHA', pair.public.signedHash);
  const username = Util.getRandomString(25);
  this.apickli.storeValueInScenarioScope('MY_AT', username);
});
Given(/^I hash and sign (.*) and (.*) into (.*) with (.*)$/, async function (pkVarName, skVarName, varName, sskVarName) {
  const epk = this.apickli.scenarioVariables[pkVarName];
  const spk = this.apickli.scenarioVariables[skVarName];
  const ssk = this.apickli.scenarioVariables[sskVarName];

  const hash = crypto.createHash('sha256');
  hash.update(`${JSON.parse(epk)}\n${JSON.parse(spk)}`);
  const pkHash = hash.digest();

  const signedHash = Util.sign(ssk, pkHash);
  this.apickli.storeValueInScenarioScope(varName, signedHash);
});

Given(/^I am authenticated user (.*)$/, async function (folder) {
  // load keys
  const file = fs.readFileSync(`./data/users/${folder}/public.pem`).toString();
  const [publicK, hash] = file.split('\n----- HASH -----\n');
  const [epkFile, spkFile] = publicK.split('\n----- SIGNATURE -----\n');

  this.apickli.storeValueInScenarioScope('EPK', epkFile);
  this.apickli.storeValueInScenarioScope('SPK', spkFile);
  this.apickli.storeValueInScenarioScope('SHA', hash);
  const privateK = fs.readFileSync(`./data/users/${folder}/private.pem`).toString();
  const [eskFile, sskFile] = privateK.split('\n----- SIGNATURE -----\n');
  this.apickli.storeValueInScenarioScope('ESK', eskFile);
  this.apickli.storeValueInScenarioScope('SSK', sskFile);

  // get identity challenge
  await this.get(`/identity/${folder}`);

  // resolve it for body
  const respBody = JSON.parse(this.apickli.httpResponse.body);
  const pem = this.apickli.scenarioVariables.ESK;
  const resolved = Util.resolve(pem, respBody);

  this.apickli.storeValueInScenarioScope('AUTH', resolved);

  this.apickli.httpResponse.body = JSON.stringify(resolved);

  // set bearer token
  this.apickli.setAccessTokenFromResponseBodyPath('$.token');
  this.apickli.setBearerToken();
});
