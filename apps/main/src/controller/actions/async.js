const config = require('config');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { SchedulerClient, CreateScheduleCommand } = require('@aws-sdk/client-scheduler');
const debug = require('debug')('msm-main:async');
const Validator = require('@shared/validator');

class Async {
  static async autoUserRemoval(db, username) {
    const scheduleAt = new Date(Date.now() + config.get('timer.removal.user'));

    const client = new SchedulerClient();
    const input = {
      Name: `AutoUserRemovalSchedule-${username}`,
      GroupName: process.env.SCHEDULER_GROUP,
      ScheduleExpression: `at(${scheduleAt.toISOString().substring(0, 19)})`,
      FlexibleTimeWindow: {
        Mode: 'OFF',
      },
      Target: {
        Arn: process.env.CLEAN_ACCOUNT_TARGET,
        RoleArn: process.env.SCHEDULER_ROLE,
        Input: JSON.stringify({ username }),
      },
      ActionAfterCompletion: 'DELETE',
    };
    const command = new CreateScheduleCommand(input);
    await client.send(command);
  }

  static async autoMessageRemoval(db, username, msgId) {
    const scheduleAt = new Date(Date.now() + config.get('timer.removal.message'));

    const client = new SchedulerClient();
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
    await client.send(command);
  }

  static async autoValidation({ db, secret }, name) {
    debug('Auto User Validation', name);
    const user = await db.users.findByName(name);

    if (!user) {
      debug('Unknown user, no validation');
      return;
    }

    if (user.validation !== 'NO_VALIDATION') {
      debug('No need to validate');
      return;
    }

    await db.users.updateValidation(user.username, 'IS_VALIDATING');

    try {
      debug('Validating user', name);

      const validator = new Validator({
        network: config.get('ether.network'),
        apiKey: config.get('ether.api'),
        privateKey: secret.KEY_WALLET_SECRET,
        address: config.get('ether.contract'),
      });

      debug('Connected to chain');

      validator.validateUser({ userId: user.id, signature: user.hash })
        .then(async (isValid) => {
          if (isValid) {
            await db.users.updateValidation(user.username, 'VALIDATED');
            debug(`User ${user.username} is validated`);
          } else {
            await db.users.updateValidation(user.username, 'NO_VALIDATION');
            debug(`User ${user.username} is not validated`);
          }
        })
        .catch(async (err) => {
          debug(`User ${user.username} is not validated, an async error happened`, err);
          try {
            await db.users.updateValidation(user.username, 'NO_VALIDATION');
            debug(`User ${user.username} is not validated`);
          } catch (exc) {
            console.error('impossible to save user', name, exc);
          }
        });
    } catch (err) {
      debug(`User ${user.username} is not validated, an error happened`, err);
      try {
        await db.users.updateValidation(user.username, 'NO_VALIDATION');
        debug(`User ${user.username} is not validated`);
      } catch (exc) {
        console.error('impossible to save user', name, exc);
      }
    }
  }

  static async notifyMessage(from, to) {
    debug(`Notify ${to} that ${from} sent a message`);
    const snsClient = new SNSClient({});
    await snsClient.send(
      new PublishCommand({
        Message: JSON.stringify({
          to,
          from,
          action: 'mail',
        }),
        TopicArn: process.env.NOTIF_TOPIC,
      }),
    );
  }
}

module.exports = Async;
