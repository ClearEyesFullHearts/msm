const config = require('config');
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

  static async autoValidation(db, userId) {
    debug('Auto User Validation', userId);
    const user = await db.users.findByID(userId);

    if (!user) {
      debug('Unknown user, no validation');
      return;
    }

    if (user.validation !== 'NO_VALIDATION') {
      debug('No need to validate');
      return;
    }

    user.validation = 'IS_VALIDATING';
    await user.save();

    try {
      debug('Validating user', user.id);

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
            user.validation = 'VALIDATED';
            debug('User is validated');
          } else {
            user.validation = 'NO_VALIDATION';
            debug('User is not validated');
          }
          await user.save();
        })
        .catch(async (err) => {
          debug('User is not validated, an async error happened', err);
          try {
            user.validation = 'NO_VALIDATION';
            await user.save();
          } catch (exc) {
            console.error('impossible to save user', exc);
          }
        });
    } catch (err) {
      debug('User is not validated, an error happened', err);
      try {
        user.validation = 'NO_VALIDATION';
        await user.save();
      } catch (exc) {
        console.error('impossible to save user', exc);
      }
    }
  }
}

module.exports = Async;
