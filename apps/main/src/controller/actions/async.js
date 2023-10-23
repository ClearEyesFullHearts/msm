const config = require('config');
const AWSXRay = require('aws-xray-sdk');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { SchedulerClient, CreateScheduleCommand } = require('@aws-sdk/client-scheduler');
const debug = require('debug')('msm-main:async');

class Async {
  static ACTION_TYPE = {
    MAIL: 'mail',
    GROUP_ADD: 'group-add',
    GROUP_REMOVE: 'group-remove',
    GROUP_REVOKE: 'group-revokation',
  };

  static async autoUserRemoval(db, username) {
    debug('Schedule Auto User removal');
    const scheduleAt = new Date(Date.now() + config.get('timer.removal.user'));

    const client = AWSXRay.captureAWSv3Client(new SchedulerClient());
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
    debug('Auto User removal is scheduled');
  }

  static async autoMessageRemoval(db, username, msgId) {
    debug('Schedule Auto Message removal');
    const scheduleAt = new Date(Date.now() + config.get('timer.removal.message'));

    const client = AWSXRay.captureAWSv3Client(new SchedulerClient());
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
    debug('Auto Message removal is scheduled');
  }

  static async autoValidation(name) {
    debug(`${name} auto validation is asked`);
    const snsClient = AWSXRay.captureAWSv3Client(new SNSClient({}));
    await snsClient.send(
      new PublishCommand({
        Message: JSON.stringify({
          name,
        }),
        TopicArn: process.env.VALIDATION_TOPIC,
      }),
    );
  }

  static async notifyMessage(from, to) {
    debug(`Notify ${to} that ${from} sent a message`);
    const snsClient = AWSXRay.captureAWSv3Client(new SNSClient({}));
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

  static async notifyGroup(from, sender, members, action) {
    debug(`Notify members that ${from} had a change as ${action}`);
    const snsClient = AWSXRay.captureAWSv3Client(new SNSClient({}));
    const promises = members.reduce((acc, m) => {
      if (m.username !== sender.username) {
        acc.push(snsClient.send(
          new PublishCommand({
            Message: JSON.stringify({
              to: m.username.split('#')[1],
              from,
              action,
            }),
            TopicArn: process.env.NOTIF_TOPIC,
          }),
        ));
      }
      return acc;
    }, []);

    await Promise.all(promises);
  }
}

module.exports = Async;
