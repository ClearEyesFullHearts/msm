const { Given, When } = require('@cucumber/cucumber');
const request = require('request');
const Util = require('../support/utils');

const REST_EVENT = require('../../data/events/mainapi');

When('I notify a message', async function () {
  const options = {};
  options.url = 'http://localhost:9003/2015-03-31/functions/function/invocations';
  options.method = 'POST';
  options.body = JSON.stringify({
    Records: [
      {
        Sns: {
          Message: {
            to: 'Q81mat8baS',
            from: 'batmat',
            type: 'mail',
            name: 'batmat',
          },
        },
      },
    ],
  });

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

When('I send to lambda', async function () {
  const options = {};
  options.url = 'http://localhost:9004/2015-03-31/functions/function/invocations';
  options.method = 'POST';
  const event = {
    ...REST_EVENT,
  };
  event.rawPath = '/identity/vaultUser';
  event.requestContext.http.method = 'GET';
  event.requestContext.http.path = 'identity/vaultUser';

  console.log(event.requestContext)
  options.body = JSON.stringify(event);

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
