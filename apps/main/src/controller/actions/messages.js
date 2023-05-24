const debug = require('debug')('msm-main:message');

const ErrorHelper = require('../../lib/error');
const Encryption = require('../../lib/encryption');

class Message {
  static async getInbox(db, user) {
    debug(`get inbox for user ${user.id}`);
    const allMessages = await db.messages.Doc.find({ userId: user.id }).sort({ id: 'desc' });
    if (!allMessages) {
      return [];
    }
    debug(`found ${allMessages.length} messages in inbox`);
    return allMessages.map(({ id, header }) => ({
      id, challenge: header,
    }));
  }

  static async writeMessage(db, msg, user) {
    const {
      anonymous,
      to,
      title,
      content,
    } = msg;

    const targetUser = await db.users.Doc.findOne({ username: to });
    if (!targetUser) {
      throw ErrorHelper.getCustomError(404, ErrorHelper.CODE.NOT_FOUND, 'target @ not found');
    }
    debug('known user');

    const { id: targetId, key } = targetUser;

    const from = anonymous ? 'No signature' : `@${user.username}`;
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

    const newMsg = db.messages.Doc();
    newMsg.userId = targetId;
    newMsg.readAt = 0;
    newMsg.header = headerChallenge;
    newMsg.full = fullChallenge;

    await newMsg.save();
    debug('message saved');

    const sender = await db.users.Doc.findOne({ id: user.id });
    sender.lastActivity = Math.floor(Date.now() / (3 * 60000)) * (3 * 60000);
    await sender.save();
    debug('sender updated');
  }

  static async getMessage(db, msgId, user) {
    debug(`get message ${msgId}`);
    const message = await db.messages.Doc.findOne({ id: msgId });
    if (message) {
      debug('message found');
      if (message.userId !== user.id) {
        throw ErrorHelper.getCustomError(403, ErrorHelper.CODE.FORBIDDEN, 'You cannot access this message');
      }
      const { id, full } = message;

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
    const message = await db.messages.Doc.findOne({ id: msgId });
    if (message) {
      debug('message found');
      if (message.userId !== user.id) {
        throw ErrorHelper.getCustomError(403, ErrorHelper.CODE.FORBIDDEN, 'You cannot access this message');
      }
      await db.messages.Doc.deleteOne({ id: msgId });
      debug('message removed');
      return;
    }
    debug('message do not exists, do nothing');
  }

  static async autoMessageRemoval(db, msgId) {
    debug('Auto Message Removal');
    await new Promise((resolve) => setTimeout(resolve, (2 * 60 * 1000)));
    debug(`remove message ${msgId}`);
    const message = await db.messages.Doc.findOne({ id: msgId });
    if (message) {
      debug('message found');
      await db.messages.Doc.deleteOne({ id: msgId });
      debug('message removed');
      return;
    }
    debug('message do not exists, no action');
  }
}

module.exports = Message;
