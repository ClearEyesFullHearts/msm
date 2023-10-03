const { Given, When } = require('@cucumber/cucumber');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda'); // CommonJS import
const Util = require('../support/utils');

Given(/^I invalidate (.*)$/, async function (name) {
  const username = this.apickli.replaceVariables(name);
  const daysInMs = (24 * 60 * 60000);
  const yesterday = Date.now() - daysInMs;

  const yesterdayRounded = Util.roundTimeToDays(-yesterday);
  console.log(yesterdayRounded);

  await Util.setValueInDB(username, `U#${username}`, 'lastActivity', yesterdayRounded);
});

Given(/^I mark (.*) message with ID (.*) as read$/, async function (name, msgId) {
  const username = this.apickli.replaceVariables(name);
  const id = this.apickli.replaceVariables(msgId);
  await Util.setValueInDB(`M#${id}`, `U#${username}`, 'hasBeenRead', 1);
});

Given(/^I mark (.*) as inactive$/, async function (name) {
  const username = this.apickli.replaceVariables(name);
  const lastActivity = Util.roundTimeToDays(Date.now() - 2592000000);
  await Util.setValueInDB(username, `U#${username}`, 'lastActivity', lastActivity);
});

When('I invoke the cleanup lambda function', async function () {
  const client = new LambdaClient();
  const input = { // InvocationRequest
    FunctionName: 'TestMsmMasterStack-MSMCle-MSMCleanupLambdaFunction-cJ4OyzmUzLQo', // required
    InvocationType: 'RequestResponse', // 'Event' || 'DryRun',
    LogType: 'None',
    Payload: Buffer.from(JSON.stringify({})),
  };
  const command = new InvokeCommand(input);
  const { Payload } = await client.send(command);
  const response = JSON.parse(Buffer.from(Payload).toString());
  this.apickli.httpResponse.body = JSON.stringify(response);
});
