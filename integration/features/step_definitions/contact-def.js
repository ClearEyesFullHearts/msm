const { Given, Then } = require('@cucumber/cucumber');
const Util = require('../support/utils');

Given(/^I set a random challenge to (.*)$/, function (varName) {
  const randomTxt = Util.getRandomString(Math.floor(Math.random() * 1000));
  const epk = this.apickli.scenarioVariables.EPK || JSON.parse(this.apickli.scenarioVariables.NEW_EPK);
  const challenge = Util.challenge(randomTxt, epk);
  this.apickli.storeValueInScenarioScope(varName, JSON.stringify(challenge));
});
