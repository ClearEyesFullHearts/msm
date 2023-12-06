const fs = require('fs');
const crypto = require('crypto');
const { Given, Then } = require('@cucumber/cucumber');
const assert = require('assert');
const Util = require('../../../features/support/utils');

Given(/^I create random user with length (.*)$/, async function (length) {
  const keys = await Util.generateKeyPair();
  const epk = keys.public.encrypt;
  const sigPK = keys.public.signature;
  const sha = keys.public.signedHash;

  const pem = keys.private.encrypt;
  const ssk = keys.private.signature;

  const rand = Util.getRandomString(length);
  const inject = Math.floor(length * Math.random());
  const username = `${rand.substring(0, inject)}mat${rand.substring(inject)}`;

  if (!this.randomUsers) this.randomUsers = [];
  this.randomUsers.push(username);

  this.apickli.setRequestBody(JSON.stringify({
    at: username,
    key: epk,
    signature: sigPK,
    hash: sha,
  }));
  await this.post('/users');
  await this.get(`/identity/${username}`);

  // resolve it for body
  const respBody = JSON.parse(this.apickli.httpResponse.body);
  const resolved = Util.resolve(pem, respBody);
  this.apickli.httpResponse.body = JSON.stringify(resolved);

  const {
    token, contacts, ...restAuth
  } = resolved;

  this.apickli.setAccessTokenFromResponseBodyPath('$.token');

  const {
    cpk,
    csk,
  } = await Util.generateECDHKeyPair();
  this.apickli.addRequestHeader('x-msm-cpk', cpk);

  await this.get(`/attic/${username}`);
  const { key: spk } = JSON.parse(this.apickli.httpResponse.body);
  this.apickli.removeRequestHeader('x-msm-cpk');

  const vaultValues = await Util.generateVaultWithECDH(
    { csk, spk, info: `${username}-set-vault` },
    { ESK: pem, SSK: ssk },
    username,
  );
  const {
    body,
  } = vaultValues;

  this.apickli.setBearerToken();
  this.apickli.setRequestBody(JSON.stringify(body));

  const bodyObj = JSON.parse(this.apickli.requestBody);
  const data = JSON.stringify({
    ...restAuth,
    ...bodyObj,
  });

  const sig = Util.sign(ssk, data);
  this.apickli.addRequestHeader('x-msm-sig', sig);
  await this.put('/vault');
  this.apickli.removeRequestHeader('x-msm-sig');

  await this.get('/inbox');
  const [{ id }] = JSON.parse(this.apickli.httpResponse.body);

  await this.get(`/message/${id}`);

  this.apickli.removeRequestHeader('x-msm-cpk');
  this.apickli.removeRequestHeader('x-msm-sig');
  this.apickli.removeRequestHeader('Authorization');

  if (process.env.NODE_ENV === 'dev') {
    Util.setValueInDB(username, `U#${username}`, 'lastActivity', Date.now());
    Util.setValueInDB(username, `U#${username}`, 'validation', 'VALIDATED');
  }

  const privateKeys = `${pem}\n----- SIGNATURE -----\n${ssk}`;
  fs.writeFileSync(`${__dirname}/../../../data/users/temp/${this.userCounter}.pem`, privateKeys);
  this.userCounter += 1;
});

Then(/^I validate (.*) manually if needed$/, (name) => {
  if (process.env.NODE_ENV === 'dev') {
    Util.setValueInDB(name, `U#${name}`, 'lastActivity', Date.now());
    Util.setValueInDB(name, `U#${name}`, 'validation', 'VALIDATED');
  }
});

Then('I create random users file', function () {
  fs.writeFileSync(`${__dirname}/../../../data/randoms_origin.json`, JSON.stringify(this.randomUsers));
});

Given(/^I load up new ECDH keys$/, async function () {
  const {
    cpk,
    csk,
  } = await Util.generateECDHKeyPair();

  this.apickli.storeValueInScenarioScope('CPK', cpk);
  this.apickli.storeValueInScenarioScope('CSK', csk);
});

Given(/^I set var (.*) to (.*) value$/, function (varName, value) {
  const str = this.apickli.replaceVariables(value);
  this.apickli.storeValueInScenarioScope(varName, str);
});

Given('I do what i do', async () => {
  const fileContent = fs.readFileSync(`${__dirname}/../../randoms.json`);
  const arrUsers = JSON.parse(fileContent);

  const key = '';

  function simpleDecrypt({ value, vector }, keyBuffer) {
    const ivBuffer = Buffer.from(vector, 'base64');
    const cipher = Buffer.from(value, 'base64');
    const authTag = cipher.subarray(cipher.length - 16);
    const crypted = cipher.subarray(0, cipher.length - 16);
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, ivBuffer);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(crypted), decipher.final()]);
  }
  function decryptVault({
    token,
    salt,
    iv,
    pass,
    kill,
  }) {
    const keyBuffer = Buffer.from(key, 'base64');

    return {
      token: token ? simpleDecrypt(token, keyBuffer).toString() : undefined,
      salt: salt ? simpleDecrypt(salt, keyBuffer).toString() : undefined,
      iv: iv ? simpleDecrypt(iv, keyBuffer).toString() : undefined,
      pass: pass ? simpleDecrypt(pass, keyBuffer).toString() : undefined,
      kill: kill ? simpleDecrypt(kill, keyBuffer).toString() : undefined,
    };
  }
  for (let i = 0; i < arrUsers.length; i += 1) {
    const at = arrUsers[i];
    const { vault } = await Util.getValueInDB({ sk: at, pk: `U#${at}` });

    const {
      token,
      salt,
      iv,
    } = decryptVault(vault);

    const keyContent = await Util.openVault({
      token,
      salt,
      iv,
    }, at);

    const { key: encKey, signKey } = Util.setContentAsSK(keyContent);

    fs.writeFileSync(`${__dirname}/../../users/temp/${i}.pem`, `${encKey}\n----- SIGNATURE -----\n${signKey}`);
  }
});

Given('I update random users vaults', async function () {
  const fileContent = fs.readFileSync(`${__dirname}/../../randoms.json`);
  const arrUsers = JSON.parse(fileContent);

  for (let i = 0; i < arrUsers.length; i += 1) {
    this.apickli.removeRequestHeader('x-msm-sig');
    this.apickli.removeRequestHeader('x-msm-pass');
    this.apickli.removeRequestHeader('x-msm-cpk');

    const at = arrUsers[i];
    const password = at;

    const file = fs.readFileSync(`${__dirname}/../../users/temp/${i}.pem`).toString();
    const [eskFile, sskFile] = file.split('\n----- SIGNATURE -----\n');

    // get identity challenge
    await this.get(`/identity/${at}`);

    // resolve it for body
    const respBody = JSON.parse(this.apickli.httpResponse.body);
    const resolved = Util.resolve(eskFile, respBody);

    this.apickli.httpResponse.body = JSON.stringify(resolved);

    const {
      token, contacts, ...restAuth
    } = resolved;

    // set bearer token
    this.apickli.setAccessTokenFromResponseBodyPath('$.token');
    this.apickli.setBearerToken();

    const {
      cpk,
      csk,
    } = await Util.generateECDHKeyPair();
    this.apickli.addRequestHeader('x-msm-cpk', cpk);

    await this.get(`/attic/${at}`);
    const { key: spk } = JSON.parse(this.apickli.httpResponse.body);
    this.apickli.removeRequestHeader('x-msm-cpk');

    const vaultValues = await Util.generateVaultWithECDH(
      { csk, spk, info: `${at}-set-vault` },
      { ESK: eskFile, SSK: sskFile },
      password,
    );
    const {
      body,
    } = vaultValues;

    this.apickli.setBearerToken();
    this.apickli.setRequestBody(JSON.stringify(body));

    const bodyObj = JSON.parse(this.apickli.requestBody);
    const data = JSON.stringify({
      ...restAuth,
      ...bodyObj,
    });

    const sig = Util.sign(sskFile, data);
    this.apickli.addRequestHeader('x-msm-sig', sig);
    await this.put('/vault');
  }
});

// Given('I update all users vault', async function () {
//   const fileContent = fs.readFileSync(`${__dirname}/../../data/randoms.json`);
//   const arrUsers = JSON.parse(fileContent);
//   arrUsers.unshift('vaultUser');
//   for (let i = 0; i < arrUsers.length; i += 1) {
//     this.apickli.removeRequestHeader('x-msm-sig');
//     this.apickli.removeRequestHeader('x-msm-pass');
//     const at = arrUsers[i];
//     const password = (i === 0) ? 'iamapoorlonesomecowboy' : at;
//     const killswitch = (i === 0) ? 'iamapoorlonesomecowgirl' : undefined;
//     const user = await Util.getValueInDB({ pk: `U#${at}`, sk: at });
//     console.log('user', i, at, !!user.vault);
//     if (user.vault) {
//       const privateK = Util.symmetricDecrypt(user.vault, password);
//       const [eskFile, sskFile] = privateK.split('\n----- SIGNATURE -----\n');
//       const vaultValues = await Util.generateVaultValues(sskFile, privateK, password, killswitch);
//       const {
//         esk: cypherKey,
//         rs1,
//         rs2,
//         iv1,
//         iv2,
//         rp,
//         sup,
//         suk,
//       } = vaultValues;

//       await Util.setValueInDB(at, `U#${at}`, 'vault', undefined);
//       await Util.setValueInDB(at, `U#${at}`, 'attic', undefined);

//       await this.get(`/identity/${at}`);

//       const respBody = JSON.parse(this.apickli.httpResponse.body);
//       const resolved = Util.resolve(eskFile, respBody);
//       const {
//         token, contacts, ...restAuth
//       } = resolved;

//       this.apickli.httpResponse.body = JSON.stringify(resolved);
//       this.apickli.setAccessTokenFromResponseBodyPath('$.token');
//       this.apickli.setBearerToken();

//       const reqBody = {
//         vault: {
//           token: cypherKey,
//           salt: rs1,
//           iv: iv1,
//           pass: sup,
//           kill: suk,
//         },
//         attic: {
//           iv: iv2,
//           salt: rs2,
//           proof: rp,
//         },
//       };

//       this.apickli.setRequestBody(JSON.stringify(reqBody));

//       const data = JSON.stringify({
//         ...restAuth,
//         ...reqBody,
//       });

//       const sig = Util.sign(sskFile, data);
//       this.apickli.addRequestHeader('x-msm-sig', sig);

//       await this.put('/vault');
//     }
//   }
// });

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

  this.apickli.storeValueInScenarioScope('MY_AT', folder);
  this.apickli.storeValueInScenarioScope('AUTH', resolved);

  this.apickli.httpResponse.body = JSON.stringify(resolved);

  // set bearer token
  this.apickli.setAccessTokenFromResponseBodyPath('$.token');
  this.apickli.setBearerToken();
});

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
    rs2,
    body,
  } = vaultValues;
  this.apickli.storeValueInScenarioScope('ATTIC', {
    salt: rs2,
  });
  this.apickli.storeValueInScenarioScope('TSS', tss);

  this.apickli.storeValueInScenarioScope(varName, JSON.stringify(body));
});

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

Then(/^I wait for (.*) seconds$/, async function (seconds) {
  const time = this.apickli.replaceVariables(seconds);
  await new Promise((resolve) => {
    setTimeout(resolve, (time * 1000));
  });
});
