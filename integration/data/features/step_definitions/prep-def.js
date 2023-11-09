const fs = require('fs');
const { Given, Then } = require('@cucumber/cucumber');
const Util = require('../../../features/support/utils');

Given(/^I create random user with length (.*)$/, async function (length) {
  const keys = await Util.generateKeyPair();
  const epk = keys.public.encrypt;
  const spk = keys.public.signature;
  const sha = keys.public.signedHash;

  const pem = keys.private.encrypt;
  const ssk = keys.private.signature;

  const rand = Util.getRandomString(length);
  const inject = Math.floor(length * Math.random());
  const username = `${rand.substring(0, inject)}mat${rand.substring(inject)}`;

  if (!this.randomUsers) this.randomUsers = [];
  this.randomUsers.push(username);
  this.userCounter += 1;

  const keyVal = `${pem}\n----- SIGNATURE -----\n${ssk}`;
  const vaultValues = await Util.generateVaultValues(ssk, keyVal, username);
  const {
    esk: cypherKey,
    eup,
    rs1,
    rs2,
    iv1,
    iv2,
    rp,
    sup,
    suk,
  } = vaultValues;

  this.apickli.setRequestBody(JSON.stringify({
    at: username,
    key: epk,
    signature: spk,
    hash: sha,
    vault: {
      token: cypherKey,
      salt: rs1,
      iv: iv1,
      pass: sup,
      kill: suk,
    },
    attic: {
      iv: iv2,
      salt: rs2,
      proof: rp,
    },
  }));
  await this.post('/users');

  // get identity challenge
  this.apickli.addRequestHeader('x-msm-pass', eup);
  await this.get(`/identity/${username}`);
  this.apickli.removeRequestHeader('x-msm-pass');

  // resolve it for body
  const respBody = JSON.parse(this.apickli.httpResponse.body);
  const resolved = Util.resolve(pem, respBody);
  this.apickli.httpResponse.body = JSON.stringify(resolved);

  this.apickli.setAccessTokenFromResponseBodyPath('$.token');
  this.apickli.setBearerToken();

  await this.get('/inbox');
  const [{ id }] = JSON.parse(this.apickli.httpResponse.body);

  await this.get(`/message/${id}`);

  // const {
  //   token, contacts, ...restAuth
  // } = resolved;

  // const vaultItem = Util.symmetricEncrypt(`${pem}\n----- SIGNATURE -----\n${ssk}`, username);

  // this.apickli.setRequestBody(JSON.stringify(vaultItem));

  // const data = JSON.stringify({
  //   ...restAuth,
  //   ...vaultItem,
  // });

  // const sig = Util.sign(ssk, data);
  // this.apickli.addRequestHeader('x-msm-sig', sig);

  // await this.put('/vault');
  this.apickli.removeRequestHeader('x-msm-sig');
  this.apickli.removeRequestHeader('Authorization');
});

Then('I create random users file', function () {
  fs.writeFileSync(`${__dirname}/../../data/randoms.json`, JSON.stringify(this.randomUsers));
});

Given('I update all users vault', async function () {
  const fileContent = fs.readFileSync(`${__dirname}/../../data/randoms.json`);
  const arrUsers = JSON.parse(fileContent);
  arrUsers.unshift('vaultUser');
  for (let i = 0; i < arrUsers.length; i += 1) {
    this.apickli.removeRequestHeader('x-msm-sig');
    this.apickli.removeRequestHeader('x-msm-pass');
    const at = arrUsers[i];
    const password = (i === 0) ? 'iamapoorlonesomecowboy' : at;
    const killswitch = (i === 0) ? 'iamapoorlonesomecowgirl' : undefined;
    const user = await Util.getValueInDB({ pk: `U#${at}`, sk: at });
    console.log('user', i, at, !!user.vault);
    if (user.vault) {
      const privateK = Util.symmetricDecrypt(user.vault, password);
      const [eskFile, sskFile] = privateK.split('\n----- SIGNATURE -----\n');
      const vaultValues = await Util.generateVaultValues(sskFile, privateK, password, killswitch);
      const {
        esk: cypherKey,
        rs1,
        rs2,
        iv1,
        iv2,
        rp,
        sup,
        suk,
      } = vaultValues;

      await Util.setValueInDB(at, `U#${at}`, 'vault', undefined);
      await Util.setValueInDB(at, `U#${at}`, 'attic', undefined);

      await this.get(`/identity/${at}`);

      const respBody = JSON.parse(this.apickli.httpResponse.body);
      const resolved = Util.resolve(eskFile, respBody);
      const {
        token, contacts, ...restAuth
      } = resolved;

      this.apickli.httpResponse.body = JSON.stringify(resolved);
      this.apickli.setAccessTokenFromResponseBodyPath('$.token');
      this.apickli.setBearerToken();

      const reqBody = {
        vault: {
          token: cypherKey,
          salt: rs1,
          iv: iv1,
          pass: sup,
          kill: suk,
        },
        attic: {
          iv: iv2,
          salt: rs2,
          proof: rp,
        },
      };

      this.apickli.setRequestBody(JSON.stringify(reqBody));

      const data = JSON.stringify({
        ...restAuth,
        ...reqBody,
      });

      const sig = Util.sign(sskFile, data);
      this.apickli.addRequestHeader('x-msm-sig', sig);

      await this.put('/vault');
    }
  }
});
