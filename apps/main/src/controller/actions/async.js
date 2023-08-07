const config = require('config');
const debug = require('debug')('msm-main:async');
const Validator = require('@shared/validator');

class Async {
  static async autoUserRemoval(db, userId) {
    debug('Auto User Removal for user', userId);
    const timeToWait = config.get('timer.removal.user');
    await new Promise((resolve) => setTimeout(resolve, timeToWait));
    debug(`remove user ${userId}`);
    const user = await db.users.findByID(userId);
    if (user) {
      debug('user found');
      if (user.lastActivity < 0) {
        debug('inactive user, delete account');
        await db.clearUserAccount({ userId: user.id, username: user.username }, false);
        debug('user removed');
        return;
      }
      debug('user is active, do not delete');
      return;
    }
    debug('user do not exists, no action');
  }

  static async autoMessageRemoval(db, msgId) {
    debug('Auto Message Removal');
    const timeToWait = config.get('timer.removal.message');
    await new Promise((resolve) => setTimeout(resolve, timeToWait));
    debug(`remove message ${msgId}`);
    const message = await db.messages.findByID(msgId);
    if (message) {
      debug('message found');
      await db.messages.deleteID(msgId);
      debug('message removed');
      return;
    }
    debug('message do not exists, no action');
  }

  static async autoValidation(user) {
    debug('Auto User Validation', user.validation);
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

      const isValid = await validator.validateUser({ userId: user.id, signature: user.hash });

      if (isValid) {
        user.validation = 'VALIDATED';
        debug('User is validated');
      } else {
        user.validation = 'NO_VALIDATION';
        debug('User is not validated');
      }
    } catch (err) {
      debug('User is not validated, an error happened', err);
      user.validation = 'NO_VALIDATION';
    } finally {
      debug('Save new status', user.validation);
      await user.save();
    }
  }
}

module.exports = Async;
