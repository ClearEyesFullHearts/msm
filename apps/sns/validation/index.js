const debug = require('debug')('validation:app');
const config = require('config');
const { SchedulerClient, CreateScheduleCommand } = require('@aws-sdk/client-scheduler');
const AWSXRay = require('@shared/tracing');
const Data = require('@shared/dynamolayer');
const Secret = require('@shared/secrets');
const Encryption = require('@shared/encryption');
const Validator = require('./src/validator');

let data;
let secret;
let client;
let validator;

async function askConfirmation(username, tries, invokedFunctionArn) {
  debug('Schedule validation confirmation');
  const scheduleAt = new Date(Date.now() + config.get('retries.interval'));

  const input = {
    Name: `ConfirmValidation-${username}`,
    GroupName: process.env.SCHEDULER_GROUP,
    ScheduleExpression: `at(${scheduleAt.toISOString().substring(0, 19)})`,
    FlexibleTimeWindow: {
      Mode: 'OFF',
    },
    Target: {
      Arn: invokedFunctionArn,
      RoleArn: process.env.SCHEDULER_ROLE,
      Input: JSON.stringify({ username, tries }),
    },
    ActionAfterCompletion: 'DELETE',
  };
  const command = new CreateScheduleCommand(input);
  await client.send(command);
  debug('Validation confirmation is scheduled');
}

async function initValidation(user, invokedFunctionArn) {
  debug('Validating user', user.username);

  await data.users.updateValidation(user.username, 'IS_VALIDATING');

  try {
    const userId = Encryption.hash(user.username).toString('base64');
    await validator.validateUser({ userId, signature: user.hash });
    debug('Validation sent');
    await askConfirmation(user.username, 1, invokedFunctionArn);
    debug('Confirmation asked');
  } catch (err) {
    debug(`User ${user.username} is not validated, an async error happened`, err);
    await data.users.updateValidation(user.username, 'NO_VALIDATION');
  }
}

async function confirmValidation(user, tries, invokedFunctionArn) {
  debug(`Confirming user ${user.username}, time ${tries}`);

  const userId = Encryption.hash(user.username).toString('base64');
  const isValid = await validator.isValidated(userId);
  if (isValid) {
    debug('Validation confirmed');
    await data.users.updateValidation(user.username, 'VALIDATED');
  } else if (tries < config.get('retries.max')) {
    debug('No confirmation, retries');
    await askConfirmation(user.username, tries + 1, invokedFunctionArn);
  } else {
    debug('No confirmation, stop');
    await data.users.updateValidation(user.username, 'NO_VALIDATION');
  }
}

const handler = async (event, context) => {
  // called for the first time by SNS
  if (event.Records && event.Records.length > 0) {
    const { name } = JSON.parse(event.Records[0].Sns.Message);
    debug('Auto User Validation', name);
    const user = await data.users.findByName(name);

    if (!user) {
      debug('Unknown user, no validation');
      return;
    }

    if (user.validation === 'NO_VALIDATION') {
      await initValidation(user, context.invokedFunctionArn);
    }
  }

  // subsequent call by the scheduler
  const { username, tries } = event;
  if (username && tries) {
    debug('Auto User Confirmation', username);
    const user = await data.users.findByName(username);

    if (!user) {
      debug('Unknown user, no confirmation');
      return;
    }
    if (user.validation === 'IS_VALIDATING') {
      await confirmValidation(user, tries, context.invokedFunctionArn);
    }
  }
};
const main = async () => {
  data = new Data(config.get('dynamo'));
  data.init();

  secret = new Secret(['KEY_WALLET_SECRET']);
  await secret.getTracedSecretValue();

  client = AWSXRay.captureAWSv3Client(new SchedulerClient());

  validator = AWSXRay.captureInstance(new Validator({
    network: config.get('ether.network'),
    apiKey: config.get('ether.api'),
    privateKey: secret.KEY_WALLET_SECRET,
    address: config.get('ether.contract'),
  }));

  return { handler };
};

module.exports = main();
