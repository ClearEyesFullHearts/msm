const fs = require('fs');
const { Given } = require('@cucumber/cucumber');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const config = require('config');
const Util = require('../support/utils');

Given(/^I load up (.*) private keys$/, function (folder) {
  const privateK = fs.readFileSync(`./data/users/${folder}/private.pem`).toString();
  const [eskFile, sskFile] = privateK.split('\n----- SIGNATURE -----\n');
  this.apickli.storeValueInScenarioScope('NEW_ESK', eskFile);
  this.apickli.storeValueInScenarioScope('NEW_SSK', sskFile);
});

Given(/^I am existing (.*)$/, async function (varName) {
  const username = this.apickli.replaceVariables(varName);

  const payload = {
    connection: Date.now(),
    config: {
      sessionTime: config.get('timer.removal.session'),
      pollingTime: config.get('timer.interval.poll'),
    },
    user: {
      id: 'DONT_CARE',
      username,
    },
  };
  const token = jwt.sign(payload, config.get('auth'));
  this.apickli.storeValueInScenarioScope('AUTH', payload);
  this.apickli.storeValueInScenarioScope('TOKEN', token);
});

Given('I connect to the web socket', async function () {
  const token = this.apickli.scenarioVariables.TOKEN;
  const payload = this.apickli.scenarioVariables.AUTH;
  const data = JSON.stringify({
    ...payload,
    action: 'WSS',
  });

  const signature = Util.sign(this.apickli.scenarioVariables.NEW_SSK, data);

  await new Promise((resolve, reject) => {
    const wss = new WebSocket(this.apickli.domain, {
      headers: {
        'Sec-WebSocket-Protocol': `${token}, ${signature}`,
      },
    });
    wss.on('error', (err) => {
      reject(err);
    });

    wss.on('open', () => {
      resolve();
    });
    this.apickli.storeValueInScenarioScope('SOCKET', wss);
  });
});
