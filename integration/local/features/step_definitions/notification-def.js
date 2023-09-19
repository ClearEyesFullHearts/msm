const { Given, When } = require('@cucumber/cucumber');
const request = require('request');
const Util = require('../support/utils');

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
