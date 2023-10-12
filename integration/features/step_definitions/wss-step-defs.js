const fs = require('fs');
const assert = require('assert');
const { Given, When, Then } = require('@cucumber/cucumber');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const config = require('config');
const { v4: uuidv4 } = require('uuid');
const Util = require('../support/utils');

const WSS_URL = 'wss://socktest.ysypya.com';

Given(/^(.*) is connected$/, async function (name) {
  const username = this.apickli.replaceVariables(name);
  const {
    [`SSK.${username}`]: sskFile,
    [`AUTH.${username}`]: { token, contacts, ...payload },
  } = this.apickli.scenarioVariables;

  const authToken = Buffer.from(token).toString('hex');

  const data = JSON.stringify({
    ...payload,
    action: 'WSS',
  });

  const signature = Buffer.from(Util.sign(sskFile, data)).toString('hex');
  // console.log('token', token);
  // console.log('signature', signature);

  await new Promise((resolve, reject) => {
    const wss = new WebSocket(WSS_URL, [authToken, signature]);
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

  // const file = fs.readFileSync(`./data/users/${username}/public.pem`).toString();
  // const [epkFile] = file.split('\n----- SIGNATURE -----\n');
  const {
    [`EPK.${username}`]: epkFile,
  } = this.apickli.scenarioVariables;

  const encryptedTxt = Util.encrypt(epkFile, txt);

  const message = {
    to: username,
    requestId: uuidv4(),
    content: encryptedTxt,
  };
  this.apickli.storeValueInScenarioScope(`NEXT.${username}`, message);
});

Given(/^I prepare next message for (.*) as (.*)$/, function (name, json) {
  const username = this.apickli.replaceVariables(name);

  this.apickli.storeValueInScenarioScope(`NEXT.${username}`, JSON.parse(json));
});

Given(/^(.*) is listening$/, function (name) {
  const username = this.apickli.replaceVariables(name);

  const wss = this.apickli.scenarioVariables[`SOCKET.${username}`];
  wss.on('message', (msg) => {
    // console.log(`${username} received message`, msg.toString());
    let allMsg = this.apickli.scenarioVariables[`MSG.${username}`];
    if (!allMsg) {
      allMsg = [];
    }
    allMsg.push(msg.toString());
    this.apickli.httpResponse.body = msg.toString();

    this.apickli.storeValueInScenarioScope(`MSG.${username}`, allMsg);
  });
});

Then(/^(.*) stop listening$/, function (name) {
  const username = this.apickli.replaceVariables(name);

  const wss = this.apickli.scenarioVariables[`SOCKET.${username}`];
  wss.removeAllListeners('message');
});

When(/^(.*) send next fallback message to (.*)$/, function (sender, target, cb) {
  const sendername = this.apickli.replaceVariables(sender);
  const targetname = this.apickli.replaceVariables(target);

  const wss = this.apickli.scenarioVariables[`SOCKET.${sendername}`];
  const message = this.apickli.scenarioVariables[`NEXT.${targetname}`];

  this.apickli.storeValueInScenarioScope(`REQ.${sender.substring(1, sender.length - 1)}`, message.requestId);

  const body = {
    action: 'fallback',
    message,
  };

  const targetWss = this.apickli.scenarioVariables[`SOCKET.${targetname}`];

  if (targetWss) {
    targetWss.on('message', (msg) => {
      // console.log(`${targetname} received message`, msg.toString());
      let allMsg = this.apickli.scenarioVariables[`MSG.${targetname}`];
      if (!allMsg) {
        allMsg = [];
      }
      allMsg.push(msg.toString());
      this.apickli.storeValueInScenarioScope(`MSG.${targetname}`, allMsg);
      targetWss.removeAllListeners('message');
      cb();
    });

    wss.send(JSON.stringify(body));
  } else {
    wss.send(JSON.stringify(body));
    cb();
  }
});

Then(/^(.*) acknowledges reception to (.*)$/, function (target, sender, cb) {
  const sendername = this.apickli.replaceVariables(sender);
  const targetname = this.apickli.replaceVariables(target);

  const wss = this.apickli.scenarioVariables[`SOCKET.${targetname}`];
  const reqId = this.apickli.scenarioVariables[`REQ.${sender.substring(1, sender.length - 2)}`];
  const message = {
    to: sendername,
    requestId: reqId,
    content: 'ack',
  };

  const body = {
    action: 'fallback',
    message,
  };

  const senderWss = this.apickli.scenarioVariables[`SOCKET.${sendername}`];

  if (senderWss) {
    senderWss.on('message', (event) => {
      const { message: { requestId, content } } = JSON.parse(event.toString());
      assert.strictEqual(content, 'ack');
      assert.strictEqual(requestId, reqId);
      senderWss.removeAllListeners('message');
      cb();
    });

    wss.send(JSON.stringify(body));
  } else {
    wss.send(JSON.stringify(body));
    cb();
  }
});

Then(/^(.*) decrypt content of message (.*) from route (.*)$/, function (name, index, route) {
  const username = this.apickli.replaceVariables(name);
  const allMsg = this.apickli.scenarioVariables[`MSG.${username}`];
  const msg = JSON.parse(allMsg[Number(index)]);

  assert.ok(msg.action);
  assert.ok(msg.message);
  assert.ok(msg.message.from);
  assert.ok(msg.message.requestId);
  assert.ok(msg.message.content);
  const { action, message: { from, requestId, content } } = msg;
  assert.strictEqual(action, route);

  const {
    [`ESK.${username}`]: eskFile,
  } = this.apickli.scenarioVariables;

  const body = Util.decrypt(eskFile, content);
  this.apickli.httpResponse.body = JSON.stringify({ from, requestId, content: body });
});

Then(/^(.*) last message action match (.*)$/, function (name, route) {
  const username = this.apickli.replaceVariables(name);
  const allMsg = this.apickli.scenarioVariables[`MSG.${username}`];

  const msg = JSON.parse(allMsg[allMsg.length - 1]);

  assert.strictEqual(msg.action, route);
});
