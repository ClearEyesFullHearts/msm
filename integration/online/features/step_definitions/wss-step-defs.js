const fs = require('fs');
const { Given, When } = require('@cucumber/cucumber');
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
  const token = Buffer.from(jwt.sign(payload, config.get('auth'))).toString('hex');

  const data = JSON.stringify({
    ...payload,
    action: 'WSS',
  });

  const signature = Buffer.from(Util.sign(sskFile, data)).toString('hex');
  console.log('token', token);
  console.log('signature', signature);

  await new Promise((resolve, reject) => {
    const wss = new WebSocket(this.apickli.domain, [token, signature]);
    wss.on('error', (err) => {
      throw err;
    });

    wss.on('open', () => {
      Util.getValueInDB({ sk: username, pk: 'WSS' })
        .then((connection) => {
          if (connection) {
            console.log(`${username} connected`);
            this.apickli.storeValueInScenarioScope(`SOCKET.${username}`, wss);
            resolve();
          } else {
            reject(new Error('Connection not created in db'));
          }
        })
        .catch(reject);
    });
    wss.on('message', (message) => {
      console.log(`${username} received message ${message}`);
      let allMsg = this.apickli.scenarioVariables[`MSG.${username}`];
      if (!allMsg) {
        allMsg = [];
      }
      allMsg.push(message);
      this.apickli.storeValueInScenarioScope(`MSG.${username}`, allMsg);
    });
    wss.on('close', () => {
      console.log(`${username} closed socket`);
    });
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

Given(/^(.*) is listening$/, function (name) {
  const username = this.apickli.replaceVariables(name);
  const wss = this.apickli.scenarioVariables[`SOCKET.${username}`];

  wss.on('message', (message) => {
    console.log(`${username} received message ${message}`);
    let allMsg = this.apickli.scenarioVariables[`MSG.${username}`];
    if (!allMsg) {
      allMsg = [];
    }
    allMsg.push(message);
    this.apickli.storeValueInScenarioScope(`MSG.${username}`, allMsg);
  });
});
Given(/^(.*) stop listening$/, function (name) {
  const username = this.apickli.replaceVariables(name);
  const wss = this.apickli.scenarioVariables[`SOCKET.${username}`];

  wss.removeAllListeners('message');
  this.apickli.storeValueInScenarioScope(`MSG.${username}`, null);
});

Given(/^I prepare message (.*) for (.*)$/, function (txt, name) {
  const username = this.apickli.replaceVariables(name);

  const file = fs.readFileSync(`./data/users/${username}/public.pem`).toString();
  const [epkFile] = file.split('\n----- SIGNATURE -----\n');

  const encryptedTxt = Util.encrypt(epkFile, txt);

  this.apickli.storeValueInScenarioScope(`NEXT.${username}`, encryptedTxt);
});

When(/^(.*) send next (.*) message to (.*)$/, async function (sender, route, target) {
  const sendername = this.apickli.replaceVariables(sender);
  const targetname = this.apickli.replaceVariables(target);

  const wss = this.apickli.scenarioVariables[`SOCKET.${sendername}`];
  const content = this.apickli.scenarioVariables[`NEXT.${targetname}`];

  const message = {
    action: route,
    message: {
      to: targetname,
      content,
    },
  };

  await wss.send(JSON.stringify(message));
});
