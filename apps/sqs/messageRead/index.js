const Data = require('@shared/dynamolayer');
const AWSXRay = require('@shared/tracing');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { SchedulerClient, CreateScheduleCommand } = require('@aws-sdk/client-scheduler');
const debug = require('debug')('msm-message-read:app');
const config = require('config');

const data = new Data(config.get('dynamo'));
data.init();
const schedulerClient = AWSXRay.captureAWSv3Client(new SchedulerClient());
const snsClient = AWSXRay.captureAWSv3Client(new SNSClient({}));

async function autoMessageRemoval(username, msgId) {
  debug('Schedule Auto Message removal');
  const scheduleAt = new Date(Date.now() + config.get('timer.removal.message'));

  const input = {
    Name: `AutoMessageRemovalSchedule-${username}-${msgId}`,
    GroupName: process.env.SCHEDULER_GROUP,
    ScheduleExpression: `at(${scheduleAt.toISOString().substring(0, 19)})`,
    FlexibleTimeWindow: {
      Mode: 'OFF',
    },
    Target: {
      Arn: process.env.CLEAN_MESSAGE_TARGET,
      RoleArn: process.env.SCHEDULER_ROLE,
      Input: JSON.stringify({ username, messageId: msgId }),
    },
    ActionAfterCompletion: 'DELETE',
  };
  const command = new CreateScheduleCommand(input);
  await schedulerClient.send(command);
  debug('Auto Message removal is scheduled');
}

async function userValidation(name) {
  debug(`${name} auto validation is asked`);
  await snsClient.send(
    new PublishCommand({
      Message: JSON.stringify({
        name,
      }),
      TopicArn: process.env.VALIDATION_TOPIC,
    }),
  );
}

async function recordMessageRead(username, messageId) {
  debug(`get user ${username}`);
  const reader = await data.users.findByName(username);
  if (!reader) return;

  debug(`user found, get message ${messageId}`);
  const message = await data.messages.findByID(reader.username, `M#${messageId}`);
  if (!message) return;

  debug('message found');
  if (reader.lastActivity < 0) {
    await data.users.confirmUser(reader.username);
    debug('reader confirmed');
  } else {
    await data.users.updateLastActivity(reader.username);
    debug('reader updated');
  }

  if (reader.validation === 'NO_VALIDATION' && !process.env.NO_CHAIN) {
    await userValidation(reader.username);
  }

  await autoMessageRemoval(reader.username, messageId);
}

exports.handler = async function lambdaHandler(event) {
  const { Records } = event;

  const promises = Records.map(({ body }) => {
    const { username, messageId } = JSON.parse(body);
    return recordMessageRead(username, messageId);
  });

  await Promise.all(promises);
};
