const fs = require('fs');
const crypto = require('crypto');
const assert = require('assert');
const { Given, Then } = require('@cucumber/cucumber');
const Util = require('../support/utils');

Given(/^I load up (.*) public keys$/, async function (folder) {
  if (folder === 'random') {
    const {
      public: {
        encrypt: formattedPK,
        signature: formattedSPK,
        signedHash,
      },
    } = await Util.generateKeyPair();

    this.apickli.storeValueInScenarioScope('EPK', JSON.stringify(formattedPK));
    this.apickli.storeValueInScenarioScope('SPK', JSON.stringify(formattedSPK));
    this.apickli.storeValueInScenarioScope('SHA', signedHash);
  } else {
    const file = fs.readFileSync(`./data/users/${folder}/public.pem`).toString();
    const [publicK, hash] = file.split('\n----- HASH -----\n');
    const [epkFile, spkFile] = publicK.split('\n----- SIGNATURE -----\n');
    this.apickli.storeValueInScenarioScope('EPK', JSON.stringify(epkFile));
    this.apickli.storeValueInScenarioScope('SPK', JSON.stringify(spkFile));
    this.apickli.storeValueInScenarioScope('SHA', hash);
  }
});

Given(/^I load up (.*) private keys$/, function (folder) {
  const privateK = fs.readFileSync(`./data/users/${folder}/private.pem`).toString();
  const [eskFile, sskFile] = privateK.split('\n----- SIGNATURE -----\n');
  this.apickli.storeValueInScenarioScope('NEW_ESK', eskFile);
  this.apickli.storeValueInScenarioScope('NEW_SSK', sskFile);
});

Given(/^I load up new RSA keys$/, async function () {
  const {
    public: {
      encrypt: formattedPK,
      signature: formattedSPK,
      signedHash,
    },
    private: sk,
  } = await Util.generateKeyPair();

  this.apickli.storeValueInScenarioScope('EPK', JSON.stringify(formattedPK));
  this.apickli.storeValueInScenarioScope('SPK', JSON.stringify(formattedSPK));
  this.apickli.storeValueInScenarioScope('SHA', signedHash);
  this.apickli.storeValueInScenarioScope('NEW_EPK', JSON.stringify(formattedPK));
  this.apickli.storeValueInScenarioScope('NEW_SPK', JSON.stringify(formattedSPK));
  this.apickli.storeValueInScenarioScope('NEW_SHA', signedHash);
  this.apickli.storeValueInScenarioScope('NEW_ESK', sk.encrypt);
  this.apickli.storeValueInScenarioScope('NEW_SSK', sk.signature);
});

Given(/^I load up new ECDH keys$/, async function () {
  const {
    cpk,
    csk,
  } = await Util.generateECDHKeyPair();

  this.apickli.storeValueInScenarioScope('CPK', cpk);
  this.apickli.storeValueInScenarioScope('CSK', csk);
});

Given(/^I set var (.*) to a (.*) characters long (.*)string$/, function (varName, length, format) {
  const isBase64 = format === 'base64 ';
  let str = Util.getRandomString(length, isBase64);
  if (format === 'hex ') {
    str = Buffer.from(str).toString('utf16le').substring(0, length);
  }
  if (format === 'not base64 ') {
    str = Util.getRandomString(2 * length, false);
    str = Buffer.from(str).toString('utf16le');
  }
  this.apickli.storeValueInScenarioScope(varName, str);
});

Given('I generate a false encryption key', async function () {
  const keys = await Util.generateKeyPair();
  const spk = keys.public.signature;
  const ssk = keys.private.signature;
  const pair = Util.generateFalseKeyPair();
  const epk = pair.public.encrypt;

  const hash = crypto.createHash('sha256');
  hash.update(`${epk}\n${spk}`);
  const pkHash = hash.digest();

  const signedHash = Util.sign(ssk, pkHash);

  this.apickli.storeValueInScenarioScope('NEW_EPK', JSON.stringify(epk));
  this.apickli.storeValueInScenarioScope('NEW_SPK', JSON.stringify(spk));
  this.apickli.storeValueInScenarioScope('NEW_SHA', signedHash);
  const username = Util.getRandomString(25);
  this.apickli.storeValueInScenarioScope('MY_AT', username);
});

Given('I generate a false signature key', async function () {
  const keys = await Util.generateKeyPair();
  const epk = keys.public.encrypt;
  const pair = Util.generateFalseKeyPair();
  const spk = pair.public.signature;
  this.apickli.storeValueInScenarioScope('NEW_EPK', JSON.stringify(epk));
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

Given(/^I sign hashed (.*) into (.*) with (.*)$/, async function (valueToHash, varName, sskVarName) {
  const val = this.apickli.replaceVariables(valueToHash);
  const ssk = this.apickli.scenarioVariables[sskVarName];

  const hash = crypto.createHash('sha256');
  hash.update(val);
  const myHash = hash.digest();

  const signedHash = Util.sign(ssk, myHash);
  this.apickli.storeValueInScenarioScope(varName, signedHash);
});

Given('I clear headers', function () {
  this.apickli.removeRequestHeader('x-msm-pass');
  this.apickli.removeRequestHeader('x-msm-sig');
  this.apickli.removeRequestHeader('x-msm-cpk');
});

Given('I set signature header', function () {
  this.apickli.removeRequestHeader('x-msm-sig');
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
});

Given(/^I set Pass header with (.*)$/, function (password) {
  this.apickli.removeRequestHeader('x-msm-pass');
  const val = this.apickli.replaceVariables(password);

  const { salt } = this.apickli.scenarioVariables.ATTIC;
  const spk = this.apickli.scenarioVariables.SPK;
  const csk = this.apickli.scenarioVariables.CSK;
  const username = this.apickli.scenarioVariables.MY_AT;

  const myHeader = Util.getLoginHeaderWithECDH(
    { csk, spk, info: `${username}-login` },
    salt,
    val,
  );

  // const myHeader = Util.getHeaderFromAttic({
  //   iv, salt, proof, key,
  // }, val);
  this.apickli.addRequestHeader('x-msm-pass', myHeader);
});

Given('I set false signature header', function () {
  const falseSig = Util.getRandomString(129, true);
  this.apickli.addRequestHeader('x-msm-sig', falseSig);
});

Given(/^I set my vault item (.*) with password (.*) and (.*)$/, async function (varName, passphrase, killswitch) {
  this.apickli.storeValueInScenarioScope('VAULT_PASS', passphrase);
  const eskVal = this.apickli.scenarioVariables.ESK || this.apickli.scenarioVariables.NEW_ESK;
  const sskVal = this.apickli.scenarioVariables.SSK || this.apickli.scenarioVariables.NEW_SSK;
  const spk = this.apickli.scenarioVariables.SPK;
  const csk = this.apickli.scenarioVariables.CSK;
  const username = this.apickli.scenarioVariables.MY_AT;
  const vaultValues = await Util.generateVaultWithECDH(
    { csk, spk, info: `${username}-set-vault` },
    { ESK: eskVal, SSK: sskVal },
    passphrase,
    killswitch,
  );
  const {
    tss,
    // password,
    // killswitch,
    // rs1,
    // iv1,
    // key,
    rs2,
    // hp1,
    // hp2,
    // hks,
    // sup,
    // suk,
    body,
  } = vaultValues;
  this.apickli.storeValueInScenarioScope('ATTIC', {
    salt: rs2,
  });
  this.apickli.storeValueInScenarioScope('TSS', tss);

  // console.log('vault.length', body.vault.length)

  this.apickli.storeValueInScenarioScope(varName, JSON.stringify(body));
});

/*
Given(/^I set my vault item (.*) with password (.*) and (.*)$/, async function (varName, passphrase, killswitch) {
  this.apickli.storeValueInScenarioScope('VAULT_PASS', passphrase);
  const eskVal = this.apickli.scenarioVariables.ESK || this.apickli.scenarioVariables.NEW_ESK;
  const sskVal = this.apickli.scenarioVariables.SSK || this.apickli.scenarioVariables.NEW_SSK;
  const keys = Util.getSKContent(eskVal, sskVal);
  const vaultValues = await Util.generateVaultValues(keys, passphrase, killswitch);
  const {
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

  // const sup = Util.signECDSA(key, Buffer.from(eup, 'base64'));
  // const suk = Util.signECDSA(key, Buffer.from(euk, 'base64'));

  // this.apickli.storeValueInScenarioScope('NEW_PASS_HASH', sup.toString('base64'));
  // this.apickli.storeValueInScenarioScope('NEW_KILL_HASH', suk.toString('base64'));
  this.apickli.storeValueInScenarioScope('ATTIC', {
    iv: iv2,
    salt: rs2,
    proof: rp,
    key,
  });
  this.apickli.storeValueInScenarioScope('NEW_SALT', rs1);
  this.apickli.storeValueInScenarioScope('NEW_IV', iv1);

  this.apickli.storeValueInScenarioScope(varName, JSON.stringify({
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
});
*/

Then(/^I open the vault (.*) with (.*)$/, function (vaultName, passphrase) {
  const vault = this.apickli.scenarioVariables[vaultName];
  const val = this.apickli.replaceVariables(passphrase);
  const privateK = Util.openVault(vault, val);

  // const [eskFile, sskFile] = privateK.split('\n----- SIGNATURE -----\n');
  const { key, signKey } = Util.setContentAsSK(privateK);
  this.apickli.storeValueInScenarioScope('ESK', key);
  this.apickli.storeValueInScenarioScope('SSK', signKey);
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
  assert.ok(success, `Error: expected: ${regexp}, got: ${test}`);
});

Then(/^response body path (.*) should match Encryption Public Key$/, async function (path) {
  const mypath = this.apickli.replaceVariables(path);
  const evalValue = Util.getPathValue(JSON.parse(this.apickli.httpResponse.body), mypath);
  const success = Util.isPK(evalValue, 788);
  assert.ok(success, `Error: expected: Encryption PK, got: ${evalValue}`);
});

Then(/^response body path (.*) should match Signature Public Key$/, async function (path) {
  const mypath = this.apickli.replaceVariables(path);
  const evalValue = Util.getPathValue(JSON.parse(this.apickli.httpResponse.body), mypath);
  const success = Util.isPK(evalValue, 268);
  assert.ok(success, `Error: expected: Signature PK, got: ${evalValue}`);
});

Then(/^response body path (.*) should strictly be equal to (.*)$/, function (path, value) {
  const obj = this.apickli.scenarioVariables.resolved;
  const trueValue = this.apickli.replaceVariables(value);
  const test = Util.getPathValue(obj, path);
  const success = assert.strictEqual(test, trueValue);
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

Given('I update all users vault', async () => {
  const fileContent = fs.readFileSync(`${__dirname}/../../data/randoms.json`);
  const arrUsers = JSON.parse(fileContent);
  arrUsers.push('vaultUser');

  const ALGORITHM = 'aes-256-gcm';
  const IV_SIZE = 16;
  const secretTxt = '';
  const keyTxt = '';

  function simpleDecrypt({ value, vector }, keyBuffer) {
    const ivBuffer = Buffer.from(vector, 'base64');
    const cipher = Buffer.from(value, 'base64');
    const authTag = cipher.subarray(cipher.length - 16);
    const crypted = cipher.subarray(0, cipher.length - 16);
    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, ivBuffer);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(crypted), decipher.final()]);
  }

  function simpleEncrypt(txt, keyBuffer) {
    const iv = crypto.randomBytes(IV_SIZE);
    const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
    const encrypted = cipher.update(txt);
    const result = Buffer.concat([encrypted, cipher.final(), cipher.getAuthTag()]);

    return {
      value: result.toString('base64'),
      vector: iv.toString('base64'),
    };
  }

  for (let i = 0; i < arrUsers.length; i += 1) {
    const username = arrUsers[i];
    const user = await Util.getValueInDB({ pk: `U#${username}`, sk: username });

    const {
      token,
      salt,
      iv,
      pass,
      kill,
    } = user.vault;

    const secretBuf = Buffer.from(secretTxt, 'base64');
    const keyBuf = Buffer.from(keyTxt, 'base64');

    const clearToken = simpleDecrypt(token, secretBuf).toString();
    const clearSalt = simpleDecrypt(salt, secretBuf).toString();
    const clearIv = simpleDecrypt(iv, secretBuf).toString();
    const clearPass = simpleDecrypt(pass, secretBuf).toString();
    const clearKill = simpleDecrypt(kill, secretBuf).toString();

    const newVault = {
      token: simpleEncrypt(clearToken, keyBuf),
      salt: simpleEncrypt(clearSalt, keyBuf),
      iv: simpleEncrypt(clearIv, keyBuf),
      pass: simpleEncrypt(clearPass, keyBuf),
      kill: simpleEncrypt(clearKill, keyBuf),
    };

    await Util.setValueInDB(username, `U#${username}`, 'vault', newVault);
  }
});
