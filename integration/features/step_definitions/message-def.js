const fs = require('fs');
const assert = require('assert');
const { Given, Then } = require('@cucumber/cucumber');
const Util = require('../support/utils');

Given(/^I set message body to (.*)$/, function (messageBody) {
  const { to, title, content } = JSON.parse(messageBody);
  const publicK = fs.readFileSync(`./data/users/${to}/public.pem`).toString();
  const [epkFile] = publicK.split('\n----- SIGNATURE -----\n');

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
