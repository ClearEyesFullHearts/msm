const { Given } = require('@cucumber/cucumber');
const request = require('request');
const Util = require('../support/utils');

const CONNECT_EVENT = require('../../data/events/connect');
const CLOSE_EVENT = require('../../data/events/disconnect');

Given('I send a connection event', async function () {
  const { token, contacts, ...restAuth } = this.apickli.scenarioVariables.AUTH;
  const ssk = this.apickli.scenarioVariables.SSK;

  const data = JSON.stringify({
    ...restAuth,
    action: 'WSS',
  });

  const signature = Util.sign(ssk, data);

  const myEvent = { ...CONNECT_EVENT };
  myEvent.headers['Sec-WebSocket-Protocol'] = `${Buffer.from(token).toString('hex')}, ${Buffer.from(signature).toString('hex')}`;
  myEvent.multiValueHeaders['Sec-WebSocket-Protocol'] = [`${Buffer.from(token).toString('hex')}, ${Buffer.from(signature).toString('hex')}`];
  myEvent.requestContext.connectionId = 'my_connection_id';

  const options = {};
  options.url = 'http://localhost:9001/2015-03-31/functions/function/invocations';
  options.method = 'POST';
  options.body = JSON.stringify(myEvent);

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

Given('I send a close event', async function () {
  const myEvent = { ...CLOSE_EVENT };
  myEvent.requestContext.connectionId = 'my_connection_id';

  const options = {};
  options.url = 'http://localhost:9002/2015-03-31/functions/function/invocations';
  options.method = 'POST';
  options.body = JSON.stringify(myEvent);

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
