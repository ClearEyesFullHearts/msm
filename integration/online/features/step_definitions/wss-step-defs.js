const fs = require('fs');
const { Given } = require('@cucumber/cucumber');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const config = require('config');
const Util = require('../support/utils');

const IDS = {
  mat: 'a5839ded-e0e7-413e-928c-dfd59c7ff158',
  batmat: '405a50e4-cc26-4475-be83-d4fc457d930a',
  vaultUser: 'c8c691df-d12d-4dda-bb7e-236b4dd0f64d',
};

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
      id: IDS[varName],
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

Given(/^(.*) is connected$/, async function (name) {
  const username = this.apickli.replaceVariables(name);
  const privateK = fs.readFileSync(`./data/users/${username}/private.pem`).toString();
  const [_, sskFile] = privateK.split('\n----- SIGNATURE -----\n');

  this.apickli.storeValueInScenarioScope('MY_AT', username);

  const payload = {
    connection: Date.now(),
    config: {
      sessionTime: config.get('timer.removal.session'),
      pollingTime: config.get('timer.interval.poll'),
    },
    user: {
      id: IDS[username],
      username,
    },
  };
  const token = jwt.sign(payload, config.get('auth'));

  const data = JSON.stringify({
    ...payload,
    action: 'WSS',
  });

  const signature = Util.sign(sskFile, data);

  await new Promise((resolve, reject) => {
    const wss = new WebSocket(this.apickli.domain, {
      headers: {
        'Sec-WebSocket-Protocol': `${token}, ${signature}`,
      },
    });
    wss.on('error', (err) => {
      throw err;
    });

    wss.on('open', () => {
      Util.getValueInDB({ sk: username, pk: 'WSS' })
        .then((connection) => {
          if (connection) {
            resolve();
          } else {
            reject(new Error('Connection not created in db'));
          }
        })
        .catch(reject);
    });

    wss.on('message', (msg) => {
      console.log(`${username} received a message:${msg}`);
    });
    this.apickli.storeValueInScenarioScope(`SOCKET.${username}`, wss);
  });
});

Given(/^(.*) disconnects$/, async function (name) {
  const username = this.apickli.replaceVariables(name);

  await new Promise((resolve) => {
    const wss = this.apickli.scenarioVariables[`SOCKET.${username}`];
    wss.on('close', () => {
      resolve();
    });
    wss.close();
  });
});
