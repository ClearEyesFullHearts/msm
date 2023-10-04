const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda'); // CommonJS import
const { SchedulerClient, GetScheduleCommand } = require('@aws-sdk/client-scheduler'); // CommonJS import
const Util = require('../support/utils');

Given(/^I invalidate (.*)$/, async function (name) {
  const username = this.apickli.replaceVariables(name);
  const daysInMs = (24 * 60 * 60000);
  const yesterday = Date.now() - daysInMs;

  const yesterdayRounded = Util.roundTimeToDays(-yesterday);

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

Then('user removal is scheduled', async function () {
  const username = this.apickli.replaceVariables('`MY_AT`');
  const client = new SchedulerClient();
  const input = { // GetScheduleInput
    Name: `AutoUserRemovalSchedule-${username}`, // required
    GroupName: 'test-MSM-Cleanup-Group',
  };
  const command = new GetScheduleCommand(input);
  const { Target: { Input } } = await client.send(command);
  this.apickli.httpResponse.body = Input;
});

Then(/^message removal is scheduled for (.*)$/, async function (varName) {
  const username = this.apickli.replaceVariables(varName);
  const ID = this.apickli.replaceVariables('`FIRST_MSG_ID`');
  const client = new SchedulerClient();
  const input = { // GetScheduleInput
    Name: `AutoMessageRemovalSchedule-${username}-${ID}`, // required
    GroupName: 'test-MSM-Cleanup-Group',
  };
  const command = new GetScheduleCommand(input);
  const { Target: { Input } } = await client.send(command);
  this.apickli.httpResponse.body = Input;
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
  const response = Buffer.from(Payload).toString();
  this.apickli.httpResponse.body = response;
});

When('I invoke the clean user lambda function', async function () {
  const client = new LambdaClient();
  const input = { // InvocationRequest
    FunctionName: 'TestMsmMasterStack-MSMCle-MSMAccountCleanupLambdaF-3xv2rFzE7TgC', // required
    InvocationType: 'RequestResponse', // 'Event' || 'DryRun',
    LogType: 'None',
    Payload: Buffer.from(this.apickli.httpResponse.body),
  };
  const command = new InvokeCommand(input);
  const { Payload } = await client.send(command);
  const response = Buffer.from(Payload).toString();

  assert.strictEqual(response, 'null');
});

When('I invoke the clean message lambda function', async function () {
  const client = new LambdaClient();
  const input = { // InvocationRequest
    FunctionName: 'TestMsmMasterStack-MSMCle-MSMMessageCleanupLambdaF-zHXEqDvzjXbT', // required
    InvocationType: 'RequestResponse', // 'Event' || 'DryRun',
    LogType: 'None',
    Payload: Buffer.from(this.apickli.httpResponse.body),
  };
  const command = new InvokeCommand(input);
  const { Payload } = await client.send(command);
  const response = Buffer.from(Payload).toString();

  assert.strictEqual(response, 'null');
});
