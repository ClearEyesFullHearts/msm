const debug = require('debug')('msm-main:message');

const Encryption = require('@shared/encryption');
const AsyncAction = require('./async');
const ErrorHelper = require('../../lib/error');

class Message {
  static async getInbox({ db, auth }) {
    debug(`get inbox for user ${auth.id}`);
    const allMessages = await db.messages.getUserMessages(auth.username);
    if (!allMessages) {
      return [];
    }
    debug(`found ${allMessages.length} messages in inbox`);
    return allMessages.map(({ id, header }) => {
      const {
        token,
        passphrase,
        iv,
      } = header;

      return {
        id,
        challenge: {
          token,
          passphrase,
          iv,
        },
      };
    });
  }

  static async writeMessage({ db, user }, msg, checkUser = true) {
    const {
      to,
      title,
      content,
    } = msg;

    if (user.lastActivity < 0) {
      throw ErrorHelper.getCustomError(501, ErrorHelper.CODE.NOT_IMPLEMENTED, 'Sender account is not activated (open the welcoming email)');
    }

    const targetUser = await db.users.findByName(to);
    if (checkUser) {
      if (!targetUser || targetUser.lastActivity < 0) {
        throw ErrorHelper.getCustomError(404, ErrorHelper.CODE.NOT_FOUND, 'target @ not found');
      }
      debug('known active user');
    }

    const { username, key } = targetUser;

    const from = `@${user.username}`;
    const sentAt = Date.now();

    const headerPlain = {
      from,
      sentAt,
      title,
    };
    const headerChallenge = Encryption.hybrid(JSON.stringify(headerPlain), key);
    const fullPlain = {
      from,
      sentAt,
      title,
      content,
    };
    const fullChallenge = Encryption.hybrid(JSON.stringify(fullPlain), key);

    await db.messages.create({
      username,
      header: headerChallenge,
      full: fullChallenge,
    });
    debug('message saved');
  }

  static async getMessage({ db, auth }, msgId) {
    debug(`get user ${auth.username}`);
    const reader = await db.users.findByName(auth.username);
    if (!reader) {
      throw ErrorHelper.getCustomError(404, ErrorHelper.CODE.NOT_FOUND, 'User not found');
    }

    debug(`get message ${msgId}`);
    const message = await db.messages.findByID(auth.username, msgId);
    if (message) {
      debug('message found');
      message.hasBeenRead = true;
      await message.save();
      debug('message marked as read');

      const {
        id, full: {
          token,
          passphrase,
          iv,
        },
      } = message;

      reader.lastActivity = Math.floor(Date.now() / (15 * 60000)) * (15 * 60000);
      await reader.save();
      debug('reader updated');

      if (reader.validation === 'NO_VALIDATION' && process.env.NODE_ENV !== 'test') {
        await AsyncAction.autoValidation(db, reader.id);
      }

      debug('full message sent');
      return {
        id,
        challenge: {
          token,
          passphrase,
          iv,
        },
      };
    }
    debug('message do not exists');

    throw ErrorHelper.getCustomError(404, ErrorHelper.CODE.NOT_FOUND, 'Message not found');
  }

  static async removeMessage({ db, user }, msgId) {
    debug(`remove message ${msgId}`);
    const message = await db.messages.findByID(user.username, msgId);
    if (message) {
      debug('message found');
      await db.messages.deleteID(user.username, msgId);
      debug('message removed');
      return;
    }
    debug('message do not exists, do nothing');
  }
}

module.exports = Message;
