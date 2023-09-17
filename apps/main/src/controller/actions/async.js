const config = require('config');
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');
const debug = require('debug')('msm-main:async');
const Validator = require('@shared/validator');

class Async {
  static async autoUserRemoval(db, username) {
    debug('Auto User Removal for user', username);
    const timeToWait = config.get('timer.removal.user');
    await new Promise((resolve) => setTimeout(resolve, timeToWait));
    debug(`remove user ${username}`);
    const user = await db.users.findByName(username);
    if (user) {
      debug('user found');
      if (user.lastActivity < 0) {
        debug('inactive user, delete account');
        await db.clearUserAccount(user, false);
        debug('user removed');
        return;
      }
      debug('user is active, do not delete');
      return;
    }
    debug('user do not exists, no action');
  }

  static async autoMessageRemoval(db, username, msgId) {
    debug('Auto Message Removal');
    const timeToWait = config.get('timer.removal.message');
    await new Promise((resolve) => setTimeout(resolve, timeToWait));
    debug(`remove message ${msgId}`);
    const message = await db.messages.findByID(username, `M#${msgId}`);
    if (message) {
      debug('message found');
      await db.messages.deleteID(username, `M#${msgId}`);
      debug('message removed');
      return;
    }
    debug('message do not exists, no action');
  }

  static async autoValidation(db, name) {
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
        privateKey: config.get('ether.key'),
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

  static async notifyMessage(db, from, to) {
    debug(`Notify ${to} that ${from} sent a message`);
    const connection = await db.connections.findByName(to);
    debug('target is connected', !!connection);
    if (connection) {
      const {
        id,
        stage,
        domainName,
      } = connection;

      const message = {
        action: 'mail',
        message: {
          from,
        },
      };

      const client = new ApiGatewayManagementApiClient({
        endpoint: `https://${domainName}/${stage}`,
      });
      const input = {
        Data: JSON.stringify(message),
        ConnectionId: id,
      };
      const command = new PostToConnectionCommand(input);
      await client.send(command);
      debug('notification sent');
    }
  }
}

module.exports = Async;
