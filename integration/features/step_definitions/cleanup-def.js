const { Given, When } = require('@cucumber/cucumber');
const request = require('request');
const Util = require('../support/utils');

Given(/^I invalidate (.*)$/, async (name) => {
  const daysInMs = (24 * 60 * 60000);
  const yesterday = Date.now() - daysInMs;

  const yesterdayRounded = Util.roundTimeToDays(-yesterday);

  await Util.setValueInDB(name, `U#${name}`, 'lastActivity', yesterdayRounded);
});

Given(/^I mark (.*) message with ID (.*) as read$/, async function (name, msgId) {
  const username = this.apickli.replaceVariables(name);
  await Util.setValueInDB(`M#${msgId}`, `U#${username}`, 'hasBeenRead', 1);
});

Given(/^I mark (.*) as inactive$/, async function (name) {
  const username = this.apickli.replaceVariables(name);
  const lastActivity = Util.roundTimeToDays(Date.now() - 2592000000);
  await Util.setValueInDB(username, `U#${username}`, 'lastActivity', lastActivity);
});

When('I invoke the cleanup lambda function', async function () {
  const options = {};
  options.url = 'http://localhost:9000/2015-03-31/functions/function/invocations';
  options.method = 'POST';
  options.body = '{}';

  const result = await new Promise((resolve, reject) => {
    request(options, (error, response) => {
      if (error) {
        reject(error);
      } else {
        resolve(response);
      }
    });
  });

  this.apickli.httpResponse = result;
});
