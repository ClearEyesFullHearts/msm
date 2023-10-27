const debug = require('debug')('msm-main:message');

const Encryption = require('@shared/encryption');
const ErrorHelper = require('@shared/error');

class Message {
  static async getInbox({ db, auth }) {
    debug(`get inbox for user ${auth.username}`);
    const allMessages = await db.messages.getUserMessages(auth.username);
    if (!allMessages) {
      return [];
    }
    debug(`found ${allMessages.length} messages in inbox`);
    return allMessages.map(({ sk, header }) => {
      const {
        token,
        passphrase,
        iv,
      } = header;

      const id = Number(sk.split('#')[1]);

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

    debug(`get message ${msgId}`);
    const message = await db.messages.findByID(auth.username, `M#${msgId}`);
    if (message) {
      debug('message found');
      await db.messages.updateReadStatus(auth.username, `M#${msgId}`);
      debug('message marked as read');

      const {
        sk, full: {
          token,
          passphrase,
          iv,
        },
      } = message;

      const id = Number(sk.split('#')[1]);

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
    const message = await db.messages.findByID(user.username, `M#${msgId}`);
    if (message) {
      debug('message found');
      await db.messages.deleteID(user.username, `M#${msgId}`);
      debug('message removed');
      return;
    }

    throw ErrorHelper.getCustomError(404, ErrorHelper.CODE.NOT_FOUND, 'Message not found');
  }
}

module.exports = Message;
