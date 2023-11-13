const fs = require('fs');
const crypto = require('crypto');
const { Given, Then } = require('@cucumber/cucumber');
const Util = require('../support/utils');

Given('I am a new invalidated user', async function () {
  this.apickli.removeRequestHeader('x-msm-sig');
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
  this.apickli.storeValueInScenarioScope(`EPK.${username}`, epk);

  this.apickli.setRequestBody(JSON.stringify({
    at: username,
    key: epk,
    signature: spk,
    hash: sha,
  }));
  await this.post('/users');
});

Given('I am a new valid user', async function () {
  this.apickli.removeRequestHeader('x-msm-sig');
  this.apickli.removeRequestHeader('x-msm-pass');
  const keys = await Util.generateKeyPair();
  const epk = keys.public.encrypt;
  const spk = keys.public.signature;
  const sha = keys.public.signedHash;
  const esk = keys.private.encrypt;
  const ssk = keys.private.signature;

  this.apickli.storeValueInScenarioScope('NEW_EPK', JSON.stringify(epk));
  this.apickli.storeValueInScenarioScope('NEW_SPK', JSON.stringify(spk));
  this.apickli.storeValueInScenarioScope('NEW_SHA', sha);
  this.apickli.storeValueInScenarioScope('NEW_ESK', keys.private.encrypt);
  this.apickli.storeValueInScenarioScope('NEW_SSK', keys.private.signature);

  const username = Util.getRandomString(7);
  this.apickli.storeValueInScenarioScope('MY_AT', username);

  const keyVal = `${esk}\n----- SIGNATURE -----\n${ssk}`;
  const vaultValues = await Util.generateVaultValues(keyVal);
  const {
    password,
    killswitch,
    esk: cypherKey,
    eup,
    euk,
    rs1,
    rs2,
    iv1,
    iv2,
    rp,
    key,
    // sup,
    // suk,
  } = vaultValues;

  this.apickli.storeValueInScenarioScope('PASS_HASH', eup);
  this.apickli.storeValueInScenarioScope('KILL_HASH', euk);
  this.apickli.storeValueInScenarioScope('PASS', password);
  this.apickli.storeValueInScenarioScope('KILL', killswitch);

  this.apickli.setRequestBody(JSON.stringify({
    at: username,
    key: epk,
    signature: spk,
    hash: sha,
    vault: {
      token: cypherKey,
      salt: rs1,
      iv: iv1,
      pass: eup,
      kill: euk,
    },
    attic: {
      iv: iv2,
      salt: rs2,
      proof: rp,
      key,
    },
  }));
  await this.post('/users');

  const signingKey = `-----BEGIN PRIVATE KEY-----\n${key}\n-----END PRIVATE KEY-----`;
  const sup = crypto.sign('rsa-sha256', Buffer.from(eup, 'base64'), {
    key: signingKey,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: 32,
  });

  // get identity challenge
  this.apickli.addRequestHeader('x-msm-pass', sup.toString('base64'));
  await this.get(`/identity/${username}`);

  // resolve it for body
  const respBody = JSON.parse(this.apickli.httpResponse.body);
  const resolved = Util.resolve(esk, respBody);
  this.apickli.storeValueInScenarioScope('AUTH', resolved);
  this.apickli.storeValueInScenarioScope('MY_ID', resolved.user.id);
  this.apickli.httpResponse.body = JSON.stringify(resolved);

  this.apickli.setAccessTokenFromResponseBodyPath('$.token');
  this.apickli.setBearerToken();

  await this.get('/inbox');
  const [{ id }] = JSON.parse(this.apickli.httpResponse.body);

  await this.get(`/message/${id}`);
});

Given(/^I am existing (.*)$/, async function (varName) {
  this.apickli.removeRequestHeader('x-msm-sig');
  this.apickli.removeRequestHeader('x-msm-pass');
  const username = this.apickli.replaceVariables(varName);

  await this.get(`/attic/${username}`);

  const attic = JSON.parse(this.apickli.httpResponse.body);
  this.apickli.storeValueInScenarioScope('ATTIC', attic);
  const {
    iv, salt, proof, key,
  } = attic;

  const myHeader = Util.getHeaderFromAttic({
    iv, salt, proof, key,
  }, username);

  this.apickli.addRequestHeader('x-msm-pass', myHeader);
  await this.get(`/identity/${username}`);
  const respBody = JSON.parse(this.apickli.httpResponse.body);
  const privateK = Util.openVault(respBody.vault, username);

  const [eskFile, sskFile] = privateK.split('\n----- SIGNATURE -----\n');
  this.apickli.storeValueInScenarioScope('ESK', eskFile);
  this.apickli.storeValueInScenarioScope(`ESK.${username}`, eskFile);
  this.apickli.storeValueInScenarioScope('SSK', sskFile);
  this.apickli.storeValueInScenarioScope(`SSK.${username}`, sskFile);

  const epk = Util.extractPublicKey(eskFile);
  const spk = Util.extractPublicKey(sskFile);
  this.apickli.storeValueInScenarioScope('EPK', epk);
  this.apickli.storeValueInScenarioScope(`EPK.${username}`, epk);
  this.apickli.storeValueInScenarioScope('SPK', spk);
  this.apickli.storeValueInScenarioScope(`SPK.${username}`, spk);

  const resolved = Util.resolve(eskFile, respBody);
  this.apickli.storeValueInScenarioScope('AUTH', resolved);
  this.apickli.storeValueInScenarioScope(`AUTH.${username}`, resolved);
  this.apickli.httpResponse.body = JSON.stringify(resolved);

  this.apickli.setAccessTokenFromResponseBodyPath('$.token');
  this.apickli.setBearerToken();

  this.apickli.setRequestBody(JSON.stringify({}));
  this.apickli.removeRequestHeader('x-msm-sig');
  this.apickli.removeRequestHeader('x-msm-pass');
});

Given(/^I am authenticated user (.*)$/, async function (folder) {
  this.apickli.removeRequestHeader('x-msm-sig');
  this.apickli.removeRequestHeader('x-msm-pass');
  // load keys
  const file = fs.readFileSync(`./data/users/${folder}/public.pem`).toString();
  const [publicK, hash] = file.split('\n----- HASH -----\n');
  const [epkFile, spkFile] = publicK.split('\n----- SIGNATURE -----\n');

  this.apickli.storeValueInScenarioScope('EPK', epkFile);
  this.apickli.storeValueInScenarioScope(`EPK.${folder}`, epkFile);
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

Given(/^I save (.*)$/, async function (varName) {
  const username = this.apickli.replaceVariables(varName);
  const user = await Util.getValueInDB({ pk: `U#${username}`, sk: username });

  this.apickli.storeValueInScenarioScope(`USER.${username}`, user);
});

Then(/^I record (.*)$/, async function (varName) {
  const username = this.apickli.replaceVariables(varName);
  const {
    [`USER.${username}`]: user,
  } = this.apickli.scenarioVariables;
  await Util.recordInDB(user);
  delete this.apickli.scenarioVariables[`USER.${username}`];
});
