const crypto = require('crypto');
const assert = require('assert');
const { Given, When, Then } = require('@cucumber/cucumber');
const Util = require('../support/utils');

Given(/^I generate my group key for (.*)$/, async function (name) {
  const username = this.apickli.replaceVariables(name);
  if (!this.apickli.scenarioVariables.GROUP_HASH) {
    const pass = crypto.randomBytes(32);
    this.apickli.storeValueInScenarioScope('GROUP_HASH', pass.toString('base64'));
  }

  const num = name.split('.')[1];
  let n = 'USER';
  if (num) {
    n = num.substring(0, num.length - 1);
  }

  const {
    GROUP_HASH,
    [`EPK.${username}`]: pem,
  } = this.apickli.scenarioVariables;
  const key = Util.encrypt(pem, Buffer.from(GROUP_HASH, 'base64'));
  this.apickli.storeValueInScenarioScope(`GK.${n}`, key);
});

Given('I generate new shared key', async function () {
  const pass = crypto.randomBytes(32);
  this.apickli.storeValueInScenarioScope('GROUP_HASH', pass.toString('base64'));
});

Given(/^(.*) creates a group (.*) for (.*) with index (.*)$/, async function (admin, group, members, index) {
  this.apickli.removeRequestHeader('x-msm-sig');
  this.apickli.removeRequestHeader('x-msm-pass');
  this.apickli.removeRequestHeader('x-msm-cpk');
  const creator = this.apickli.replaceVariables(admin);

  const {
    cpk,
    csk,
  } = await Util.generateECDHKeyPair();

  this.apickli.addRequestHeader('x-msm-cpk', cpk);

  await this.get(`/attic/${creator}`);

  const attic = JSON.parse(this.apickli.httpResponse.body);
  this.apickli.storeValueInScenarioScope('ATTIC', attic);
  const {
    salt, key,
  } = attic;
  this.apickli.removeRequestHeader('x-msm-cpk');

  const { tss, header } = Util.getLoginHeaderWithECDH(
    { csk, spk: key, info: `${creator}-login` },
    salt,
    creator,
  );

  this.apickli.addRequestHeader('x-msm-pass', header);
  await this.get(`/identity/${creator}`);

  const respBody = JSON.parse(this.apickli.httpResponse.body);
  const {
    vault: {
      token: vToken, salt: rs2, iv,
    },
  } = respBody;
  const vaultItem = Util.openSessionWithECDH({ token: vToken, salt: rs2, iv }, { tss, info: `${creator}-connection` });
  const privateK = Util.openVault(vaultItem, creator);

  // const [eskFile, sskFile] = privateK.split('\n----- SIGNATURE -----\n');
  const { key: eskFile, signKey: sskFile } = Util.setContentAsSK(privateK);
  this.apickli.storeValueInScenarioScope(`ESK.${creator}`, eskFile);
  this.apickli.storeValueInScenarioScope(`SSK.${creator}`, sskFile);

  const epk = Util.extractPublicKey(eskFile);
  const spk = Util.extractPublicKey(sskFile);
  this.apickli.storeValueInScenarioScope(`EPK.${creator}`, epk);
  this.apickli.storeValueInScenarioScope(`SPK.${creator}`, spk);

  const resolved = Util.resolve(eskFile, respBody);
  this.apickli.storeValueInScenarioScope(`AUTH.${creator}`, resolved);
  this.apickli.httpResponse.body = JSON.stringify(resolved);

  this.apickli.setAccessTokenFromResponseBodyPath('$.token');
  this.apickli.setBearerToken();

  const pass = crypto.randomBytes(32);
  const passHash = pass.toString('base64');
  this.apickli.storeValueInScenarioScope('GROUP_HASH', passHash);

  const creatorKey = Util.encrypt(epk, pass);

  const num = admin.split('.')[1];
  const n = num.substring(0, num.length - 1);

  this.apickli.storeValueInScenarioScope(`GK.${n}`, creatorKey);

  const reqBody = {
    name: group,
    key: creatorKey,
  };
  this.apickli.setRequestBody(JSON.stringify(reqBody));

  const {
    token, contacts, ...restAuth
  } = resolved;
  const data = JSON.stringify({
    ...restAuth,
    ...reqBody,
  });

  const sig = Util.sign(sskFile, data);
  this.apickli.addRequestHeader('x-msm-sig', sig);

  await this.post('/groups');
  const { id } = JSON.parse(this.apickli.httpResponse.body);
  const membersArray = JSON.parse(members);
  this.apickli.storeValueInScenarioScope(`GROUP_ID.${index}`, id);

  for (let i = 0; i < membersArray.length; i += 1) {
    this.apickli.removeRequestHeader('x-msm-sig');
    this.apickli.removeRequestHeader('x-msm-pass');
    this.apickli.removeRequestHeader('x-msm-cpk');
    const member = this.apickli.replaceVariables(membersArray[i]);

    await this.get(`/user/${member}`);

    const { key: mEpk } = JSON.parse(this.apickli.httpResponse.body);

    const memberKey = Util.encrypt(mEpk, pass);
    const mNum = membersArray[i].split('.')[1];
    const mn = mNum.substring(0, mNum.length - 1);

    this.apickli.storeValueInScenarioScope(`EPK.${member}`, mEpk);
    this.apickli.storeValueInScenarioScope(`GK.${mn}`, memberKey);

    const mReqBody = {
      username: member,
      key: memberKey,
    };
    this.apickli.setRequestBody(JSON.stringify(mReqBody));

    const mData = JSON.stringify({
      ...restAuth,
      ...mReqBody,
    });

    const mSig = Util.sign(sskFile, mData);
    this.apickli.addRequestHeader('x-msm-sig', mSig);

    await this.post(`/group/${id}/member`);
  }
});
/*
Given(/^I set group message body to (.*)$/, async function (messageBody) {
  const { title, content } = JSON.parse(messageBody);
  const passphrase = this.apickli.scenarioVariables.GROUP_HASH;

  const cypheredTitle = Util.symmetricEncrypt(title, Buffer.from(passphrase, 'base64'));
  const cypheredContent = Util.symmetricEncrypt(content, Buffer.from(passphrase, 'base64'));
  this.apickli.setRequestBody(JSON.stringify({
    title: cypheredTitle,
    content: cypheredContent,
  }));
});

Then('resolved challenge should match a group message', function () {
  const { resolved } = this.apickli.scenarioVariables;
  const {
    id,
    from,
    sentAt,
    title,
    content,
    groupId,
  } = resolved;

  assert.ok(id);
  assert.ok(from);
  assert.ok(sentAt);
  assert.ok(title);
  assert.ok(groupId);

  const key = this.apickli.scenarioVariables.MY_GROUP_KEY;
  const pem = this.apickli.scenarioVariables.ESK;

  const passphrase = Util.decrypt(pem, key, false);

  const clearTitle = Util.symmetricDecrypt(title, passphrase);
  let clearContent;
  if (content) {
    clearContent = Util.symmetricDecrypt(content, passphrase);
  }
  this.apickli.storeValueInScenarioScope('resolved', { ...resolved, title: clearTitle, content: clearContent });
});
*/


Given(/^(.*) set group (.*) message body to (.*)$/, async function (user, index, messageBody) {
  const { title, content } = JSON.parse(messageBody);
  const sender = this.apickli.replaceVariables(user);
  const passphrase = this.apickli.scenarioVariables.GROUP_HASH;
  const groupId = this.apickli.scenarioVariables[`GROUP_ID.${index}`];

  const cypheredTitle = Util.groupEncrypt(title, passphrase, groupId, sender);
  const cypheredContent = Util.groupEncrypt(content, passphrase, groupId, `${sender}${title}`);

  this.apickli.setRequestBody(JSON.stringify({
    title: cypheredTitle,
    content: cypheredContent,
  }));
});

Then('resolved challenge should match a group message', function () {
  const { resolved } = this.apickli.scenarioVariables;
  const {
    id,
    from,
    sentAt,
    title,
    content,
    groupId,
  } = resolved;

  assert.ok(id);
  assert.ok(from);
  assert.ok(sentAt);
  assert.ok(title);
  assert.ok(groupId);

  const key = this.apickli.scenarioVariables.MY_GROUP_KEY;
  const pem = this.apickli.scenarioVariables.ESK;

  const passphrase = Util.decrypt(pem, key, false);

  const clearTitle = Util.groupDecrypt(title, passphrase.toString('base64'), groupId, from);
  let clearContent;
  if (content) {
    clearContent = Util.groupDecrypt(content, passphrase.toString('base64'), groupId, `${from}${clearTitle}`);
  }
  this.apickli.storeValueInScenarioScope('resolved', { ...resolved, title: clearTitle, content: clearContent });
});

/*
*/
