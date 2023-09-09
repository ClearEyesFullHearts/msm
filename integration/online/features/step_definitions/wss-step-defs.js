const fs = require('fs');
const assert = require('assert');
const { Given, When, Then } = require('@cucumber/cucumber');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const config = require('config');
const Util = require('../support/utils');

const IDS = {
  mat: 'a5839ded-e0e7-413e-928c-dfd59c7ff158',
  batmat: '405a50e4-cc26-4475-be83-d4fc457d930a',
  vaultUser: 'c8c691df-d12d-4dda-bb7e-236b4dd0f64d',
};

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
  // console.log('token', token);
  // console.log('signature', signature);

  await new Promise((resolve, reject) => {
    const wss = new WebSocket(this.apickli.domain, [token, signature]);
    wss.on('error', (err) => {
      throw err;
    });

    wss.on('open', () => {
      Util.getValueInDB({ sk: username, pk: 'WSS' })
        .then((connection) => {
          if (connection) {
            // console.log(`${username} connected`);
            this.apickli.storeValueInScenarioScope(`SOCKET.${username}`, wss);
            resolve();
          } else {
            reject(new Error('Connection not created in db'));
          }
        })
        .catch(reject);
    });
  });
});

Given(/^(.*) disconnects$/, async function (name) {
  const username = this.apickli.replaceVariables(name);

  await new Promise((resolve) => {
    const wss = this.apickli.scenarioVariables[`SOCKET.${username}`];
    wss.on('close', () => {
      wss.removeAllListeners('close');
      resolve();
    });
    wss.close();
  });
});

Given(/^I prepare fallback message (.*) for (.*)$/, function (txt, name) {
  const username = this.apickli.replaceVariables(name);

  const file = fs.readFileSync(`./data/users/${username}/public.pem`).toString();
  const [epkFile] = file.split('\n----- SIGNATURE -----\n');

  const encryptedTxt = Util.encrypt(epkFile, txt);

  const message = {
    to: username,
    content: encryptedTxt,
  };
  this.apickli.storeValueInScenarioScope(`NEXT.${username}`, message);
});

Given(/^I prepare next message for (.*) as (.*)$/, function (name, json) {
  const username = this.apickli.replaceVariables(name);

  this.apickli.storeValueInScenarioScope(`NEXT.${username}`, JSON.parse(json));
});

When(/^(.*) send next fallback message to (.*)$/, function (sender, target, cb) {
  const sendername = this.apickli.replaceVariables(sender);
  const targetname = this.apickli.replaceVariables(target);

  const targetWss = this.apickli.scenarioVariables[`SOCKET.${targetname}`];

  targetWss.on('message', (message) => {
    console.log(`${targetname} received message`, message.toString());
    let allMsg = this.apickli.scenarioVariables[`MSG.${targetname}`];
    if (!allMsg) {
      allMsg = [];
    }
    allMsg.push(message.toString());
    this.apickli.storeValueInScenarioScope(`MSG.${targetname}`, allMsg);
    targetWss.removeAllListeners('message');
    cb();
  });

  const wss = this.apickli.scenarioVariables[`SOCKET.${sendername}`];
  const message = this.apickli.scenarioVariables[`NEXT.${targetname}`];

  const body = {
    action: 'fallback',
    message,
  };

  wss.send(JSON.stringify(body));
});

Then(/^(.*) decrypt content of message (.*) from route (.*)$/, function (name, index, route) {
  const username = this.apickli.replaceVariables(name);
  const allMsg = this.apickli.scenarioVariables[`MSG.${username}`];
  const msg = JSON.parse(allMsg[Number(index)]);

  assert.ok(msg.action);
  assert.ok(msg.message);
  assert.ok(msg.message.content);
  const { action, message: { content } } = msg;
  assert.strictEqual(action, route);

  const privateK = fs.readFileSync(`./data/users/${username}/private.pem`).toString();
  const [eskFile] = privateK.split('\n----- SIGNATURE -----\n');

  const body = Util.decrypt(eskFile, content);
  this.apickli.httpResponse.body = JSON.stringify({ content: body });
});

Then(/^(.*)'s last message action is (.*)$/, function (name, route) {
  const username = this.apickli.replaceVariables(name);
  const allMsg = this.apickli.scenarioVariables[`MSG.${username}`];
  const msg = JSON.parse(allMsg[allMsg.length - 1]);

  assert.strictEqual(msg.action, route);
});
