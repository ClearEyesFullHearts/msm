const debug = require('debug')('validation:app');
const config = require('config');
const { SchedulerClient, CreateScheduleCommand } = require('@aws-sdk/client-scheduler');
const AWSXRay = require('aws-xray-sdk');
const Data = require('@shared/dynamolayer');
const Secret = require('@shared/secrets');
const Validator = require('@shared/validator');

const data = new Data(config.get('dynamo'));
data.init();

const secret = new Secret(['KEY_WALLET_SECRET']);
const client = AWSXRay.captureAWSv3Client(new SchedulerClient());

let validator;

async function askConfirmation(username, tries, invokedFunctionArn) {
  debug('Schedule Auto User removal');
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
  debug('Auto User removal is scheduled');
}

async function initValidation(user, invokedFunctionArn) {
  await data.users.updateValidation(user.username, 'IS_VALIDATING');

  debug('Validating user', user.username);

  try {
    await new Promise((resolve, reject) => {
      AWSXRay.captureAsyncFunc('EtherValidation', (subsegment) => {
        validator.validateUser({ userId: user.id, signature: user.hash })
          .then((result) => {
            resolve(result);
          }).catch((exc) => {
            reject(exc);
          })
          .finally(() => {
            subsegment.close();
          });
      });
    });
    await askConfirmation(user.username, 0, invokedFunctionArn);
  } catch (err) {
    debug(`User ${user.username} is not validated, an async error happened`, err);
    await data.users.updateValidation(user.username, 'NO_VALIDATION');
  }
}

async function confirmValidation(user, tries, invokedFunctionArn) {
  const isValid = await new Promise((resolve, reject) => {
    AWSXRay.captureAsyncFunc('EtherConfirmation', (subsegment) => {
      validator.isValidated(user.id)
        .then((result) => {
          resolve(result);
        }).catch((exc) => {
          reject(exc);
        })
        .finally(() => {
          subsegment.close();
        });
    });
  });
  if (isValid) {
    await data.users.updateValidation(user.username, 'VALIDATED');
  } else if (tries < config.get('retries.max')) {
    await askConfirmation(user.username, tries + 1, invokedFunctionArn);
  } else {
    await data.users.updateValidation(user.username, 'NO_VALIDATION');
  }
}

exports.handler = async (event, context) => {
  const { name, tries } = JSON.parse(event.Records[0].Sns.Message);

  if (!secret.loaded) {
    await secret.getSecretValue();

    validator = new Validator({
      network: config.get('ether.network'),
      apiKey: config.get('ether.api'),
      privateKey: secret.KEY_WALLET_SECRET,
      address: config.get('ether.contract'),
    });
  }

  debug('Auto User Validation', name);
  const user = await data.users.findByName(name);

  if (!user) {
    debug('Unknown user, no validation');
    return;
  }

  if (user.validation === 'IS_VALIDATING') {
    await confirmValidation(user, tries, context.invokedFunctionArn);
  }

  if (user.validation === 'NO_VALIDATION') {
    await initValidation(user, context.invokedFunctionArn);
  }
};
