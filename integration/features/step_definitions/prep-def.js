const fs = require('fs');
const { Given, Then } = require('@cucumber/cucumber');
const Util = require('../support/utils');

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

  this.apickli.setRequestBody(JSON.stringify({
    at: username,
    key: epk,
    signature: spk,
    hash: sha,
  }));
  await this.post('/users');

  // get identity challenge
  await this.get(`/identity/${username}`);

  // resolve it for body
  const respBody = JSON.parse(this.apickli.httpResponse.body);
  const resolved = Util.resolve(pem, respBody);
  this.apickli.httpResponse.body = JSON.stringify(resolved);

  const {
    token, contacts, ...restAuth
  } = resolved;

  this.apickli.setAccessTokenFromResponseBodyPath('$.token');
  this.apickli.setBearerToken();

  await this.get('/inbox');
  const [{ id }] = JSON.parse(this.apickli.httpResponse.body);

  await this.get(`/message/${id}`);

  const vaultItem = Util.symmetricEncrypt(`${pem}\n----- SIGNATURE -----\n${ssk}`, username);

  this.apickli.setRequestBody(JSON.stringify(vaultItem));

  const data = JSON.stringify({
    ...restAuth,
    ...vaultItem,
  });

  const sig = Util.sign(ssk, data);
  this.apickli.addRequestHeader('x-msm-sig', sig);

  await this.put('/vault');
  this.apickli.removeRequestHeader('x-msm-sig');
  this.apickli.removeRequestHeader('Authorization');
});

Then('I save random users name', function () {
  fs.writeFileSync(`${__dirname}/../../data/randoms.json`, JSON.stringify(this.randomUsers));
});
