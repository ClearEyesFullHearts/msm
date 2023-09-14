const { Given, Then } = require('@cucumber/cucumber');
const Util = require('../support/utils');

Given(/^I set var (.*) to a (.*) characters long (.*)string$/, function (varName, length, format) {
  const isBase64 = format === 'base64 ';
  let str = Util.getRandomString(length, isBase64);
  if (format === 'hex ') {
    str = Buffer.from(str).toString('hex');
  }
  this.apickli.storeValueInScenarioScope(varName, str);
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

module.exports = require('apickli/apickli-gherkin');