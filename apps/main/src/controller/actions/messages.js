const config = require('config');
const debug = require('debug')('msm-main:message');

const ErrorHelper = require('../../lib/error');
const Encryption = require('../../lib/encryption');

class Message {
  static async getInbox(db, user) {
    debug(`get inbox for user ${user.id}`);
    const allMessages = await db.messages.getUserMessages(user.id);
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

  static async writeMessage(db, msg, user, checkUser = true) {
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

    const { id: targetId, key } = targetUser;

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

    const newMsg = db.messages.getNew();
    newMsg.userId = targetId;
    newMsg.hasBeenRead = false;
    newMsg.header = headerChallenge;
    newMsg.full = fullChallenge;

    await newMsg.save();
    debug('message saved');
  }

  static async getMessage(db, msgId, user) {
    debug(`get user ${user.id}`);
    const reader = await db.users.findByID(user.id);
    if (!reader) {
      throw ErrorHelper.getCustomError(404, ErrorHelper.CODE.NOT_FOUND, 'User not found');
    }

    debug(`get message ${msgId}`);
    const message = await db.messages.findByID(msgId);
    if (message) {
      debug('message found');
      if (message.userId !== user.id) {
        throw ErrorHelper.getCustomError(403, ErrorHelper.CODE.FORBIDDEN, 'You cannot access this message');
      }
      message.hasBeenRead = true;
      await message.save();
      debug('message marked as read');

      const { id, full } = message;

      reader.lastActivity = Math.floor(Date.now() / (15 * 60000)) * (15 * 60000);
      await reader.save();
      debug('reader updated');

      debug('full message sent');
      return {
        id,
        challenge: full,
      };
    }
    debug('message do not exists');

    throw ErrorHelper.getCustomError(404, ErrorHelper.CODE.NOT_FOUND, 'Message not found');
  }

  static async removeMessage(db, msgId, user) {
    debug(`remove message ${msgId}`);
    const message = await db.messages.findByID(msgId);
    if (message) {
      debug('message found');
      if (message.userId !== user.id) {
        throw ErrorHelper.getCustomError(403, ErrorHelper.CODE.FORBIDDEN, 'You cannot access this message');
      }
      await db.messages.deleteID(msgId);
      debug('message removed');
      return;
    }
    debug('message do not exists, do nothing');
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
}

module.exports = Message;
