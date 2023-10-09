const crypto = require('crypto');
const { Given, When, Then } = require('@cucumber/cucumber');
const Util = require('../support/utils');

Given(/^I generate my group key for (.*)$/, async function (name) {
  const username = this.apickli.replaceVariables(name);
  if (!this.apickli.scenarioVariables.GROUP_HASH) {
    const pass = crypto.randomBytes(32);
    const hash = crypto.createHash('sha256');
    hash.update(pass);
    const passHash = hash.digest();
    this.apickli.storeValueInScenarioScope('GROUP_HASH', passHash.toString('base64'));
  }

  const num = name.split('.')[1];
  const n = num.substring(0, num.length - 1);

  const {
    GROUP_HASH,
    [`EPK.${username}`]: pem,
  } = this.apickli.scenarioVariables;
  const key = Util.encrypt(pem, GROUP_HASH);
  this.apickli.storeValueInScenarioScope(`GK.${n}`, key);
});

Given(/^(.*) creates a group (.*) for (.*)$/, async function (admin, group, members) {
  const creator = this.apickli.replaceVariables(admin);

  await this.get(`/identity/${creator}`);

  const respBody = JSON.parse(this.apickli.httpResponse.body);
  const privateK = Util.symmetricDecrypt(respBody.vault, creator);

  const [eskFile, sskFile] = privateK.split('\n----- SIGNATURE -----\n');
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
  const hash = crypto.createHash('sha256');
  hash.update(pass);
  const passHash = hash.digest().toString('base64');
  this.apickli.storeValueInScenarioScope('GROUP_HASH', passHash);

  const creatorKey = Util.encrypt(epk, passHash);

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
  this.apickli.storeValueInScenarioScope('GROUP_ID', id);

  for (let i = 0; i < membersArray.length; i += 1) {
    this.apickli.removeRequestHeader('x-msm-sig');
    const member = this.apickli.replaceVariables(membersArray[i]);

    await this.get(`/identity/${member}`);

    const mBody = JSON.parse(this.apickli.httpResponse.body);
    const pK = Util.symmetricDecrypt(mBody.vault, member);
    const [mEsk] = pK.split('\n----- SIGNATURE -----\n');
    const mEpk = Util.extractPublicKey(mEsk);

    const memberKey = Util.encrypt(mEpk, passHash);
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
