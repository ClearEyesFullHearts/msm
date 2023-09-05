const { Given } = require('@cucumber/cucumber');
const request = require('request');
const Util = require('../support/utils');

const CONNECT_EVENT = {
  headers: {
    Accept: '*/*',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.5',
    'Cache-Control': 'no-cache',
    Host: 'o3r9ea6ds0.execute-api.eu-west-3.amazonaws.com',
    Origin: 'http://localhost:5173',
    Pragma: 'no-cache',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'websocket',
    'Sec-Fetch-Site': 'cross-site',
    'Sec-WebSocket-Extensions': 'permessage-deflate',
    'Sec-WebSocket-Key': 'FQw4ugDdoiCpdPDIUOVwRA==',
    'Sec-WebSocket-Protocol': '',
    'Sec-WebSocket-Version': '13',
    'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/117.0',
    'X-Amzn-Trace-Id': 'Root=1-64f728a8-6e286f4216a931fd7b0a1343',
    'X-Forwarded-For': '86.211.17.236',
    'X-Forwarded-Port': '443',
    'X-Forwarded-Proto': 'https',
  },
  multiValueHeaders: {
    Accept: ['*/*'],
    'Accept-Encoding': ['gzip, deflate, br'],
    'Accept-Language': ['en-US,en;q=0.5'],
    'Cache-Control': ['no-cache'],
    Host: ['o3r9ea6ds0.execute-api.eu-west-3.amazonaws.com'],
    Origin: ['http://localhost:5173'],
    Pragma: ['no-cache'],
    'Sec-Fetch-Dest': ['empty'],
    'Sec-Fetch-Mode': ['websocket'],
    'Sec-Fetch-Site': ['cross-site'],
    'Sec-WebSocket-Extensions': ['permessage-deflate'],
    'Sec-WebSocket-Key': ['FQw4ugDdoiCpdPDIUOVwRA=='],
    'Sec-WebSocket-Protocol': [''],
    'Sec-WebSocket-Version': ['13'],
    'User-Agent': [
      'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/117.0',
    ],
    'X-Amzn-Trace-Id': ['Root=1-64f728a8-6e286f4216a931fd7b0a1343'],
    'X-Forwarded-For': ['86.211.17.236'],
    'X-Forwarded-Port': ['443'],
    'X-Forwarded-Proto': ['https'],
  },
  requestContext: {
    routeKey: '$connect',
    eventType: 'CONNECT',
    extendedRequestId: 'KyNKbGkJiGYFh2w=',
    requestTime: '05/Sep/2023:13:10:00 +0000',
    messageDirection: 'IN',
    stage: 'dev',
    connectedAt: 1693919400853,
    requestTimeEpoch: 1693919400854,
    identity: {
      userAgent: 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/117.0',
      sourceIp: '86.211.17.236',
    },
    requestId: 'KyNKbGkJiGYFh2w=',
    domainName: 'o3r9ea6ds0.execute-api.eu-west-3.amazonaws.com',
    connectionId: 'KyNKbdf6CGYCHqg=',
    apiId: 'o3r9ea6ds0',
  },
  isBase64Encoded: false,
};

Given('I send a connection event', async function () {
  const { token, contacts, ...restAuth } = this.apickli.scenarioVariables.AUTH;
  const ssk = this.apickli.scenarioVariables.SSK;

  const data = JSON.stringify({
    ...restAuth,
    action: 'WSS',
  });

  const signature = Util.sign(ssk, data);

  const myEvent = { ...CONNECT_EVENT };
  myEvent.headers['Sec-WebSocket-Protocol'] = `${token}, ${signature}`;
  myEvent.multiValueHeaders['Sec-WebSocket-Protocol'] = [`${token}, ${signature}`];

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