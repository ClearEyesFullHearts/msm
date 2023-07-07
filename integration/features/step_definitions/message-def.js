const fs = require('fs');
const { Given } = require('@cucumber/cucumber');
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
