const jwt = require('jsonwebtoken');
const config = require('config');
const debug = require('debug')('msm-main:user');

const MessageAction = require('./messages');
const ErrorHelper = require('../../lib/error');
const Encryption = require('../../lib/encryption');

function createSearchTerms(str) {
  const l = str.length;
  const terms = [];
  for (let i = 0; i < l - 2; i += 1) {
    for (let j = i + 3; j < l; j += 1) {
      terms.push(str.substring(i, j).toUpperCase());
    }
    terms.push(str.substring(i).toUpperCase());
  }
  return terms;
}

class User {
  static async createUser(db, {
    at, key, signature, hash,
  }) {
    debug('check for user with username:', at);
    if (at.length !== encodeURIComponent(at).length) {
      throw ErrorHelper.getCustomError(400, ErrorHelper.CODE.BAD_REQUEST_FORMAT, '@ name should not have any special character');
    }
    if (!Encryption.isValidPemPk(key)) {
      throw ErrorHelper.getCustomError(400, ErrorHelper.CODE.BAD_REQUEST_FORMAT, 'Wrong public key format');
    }
    if (!Encryption.isValidPemPk(signature)) {
      throw ErrorHelper.getCustomError(400, ErrorHelper.CODE.BAD_REQUEST_FORMAT, 'Wrong public key format');
    }
    if (Buffer.from(hash, 'base64').toString('base64') !== hash) {
      throw ErrorHelper.getCustomError(400, ErrorHelper.CODE.BAD_REQUEST_FORMAT, 'Wrong hash format');
    }

    const knownUser = await db.users.findByName(at);
    if (knownUser) {
      throw ErrorHelper.getCustomError(403, ErrorHelper.CODE.USER_EXISTS, '@ name already taken');
    }
    const frozenUser = await db.freezer.findByName(at);
    if (frozenUser) {
      throw ErrorHelper.getCustomError(403, ErrorHelper.CODE.USER_EXISTS, '@ name already taken');
    }

    try {
      const keyHash = Encryption.hash(`${key}\n${signature}`);
      if (!Encryption.verifySignature(signature, keyHash, hash)) {
        throw ErrorHelper.getCustomError(400, ErrorHelper.CODE.BAD_REQUEST_FORMAT, 'Wrong hash format');
      }
    } catch (err) {
      if (err.code === ErrorHelper.CODE.BAD_REQUEST_FORMAT) throw err;
      throw ErrorHelper.getCustomError(500, ErrorHelper.CODE.SERVER_ERROR, 'Signature issue');
    }

    debug('create new user');
    const newUser = db.users.getNew();
    newUser.username = at;
    newUser.size = at.length;
    newUser.searchTerms = createSearchTerms(at);
    newUser.key = key;
    newUser.signature = signature;
    newUser.hash = hash;
    newUser.lastActivity = -(Date.now());
    newUser.security = 'safe';
    try {
      await newUser.save();
    } catch (err) {
      throw ErrorHelper.getCustomError(403, ErrorHelper.CODE.USER_EXISTS, 'Key singularity');
    }
    debug(`user ${at} created with ID = ${newUser.id}`);

    try {
      debug('send welcoming message');
      const welcomeTitle = config.get('welcome.title');
      const welcomeContent = config.get('welcome.content');

      const encrytedMsg = Encryption.encryptMessage(newUser, welcomeTitle, welcomeContent);

      await MessageAction.writeMessage(db, encrytedMsg, { username: 'do not reply to this message' }, false);
      debug('welcoming message sent');
    } catch (err) {
      debug('Error on first message, user is removed');
      await db.clearUserAccount({ userId: newUser.id, username: newUser.username }, false);
      throw ErrorHelper.getCustomError(500, ErrorHelper.CODE.SERVER_ERROR, 'Encryption issue');
    }

    return newUser;
  }

  static async getCredentials(db, { at }) {
    debug('check for user with @:', at);
    if (at.length !== encodeURIComponent(at).length) {
      throw ErrorHelper.getCustomError(400, ErrorHelper.CODE.BAD_REQUEST_FORMAT, '@ name should not have any special character');
    }
    const knownUser = await db.users.findByName(at);
    if (knownUser) {
      debug('known user');
      const payload = {
        connection: Date.now(),
        config: {
          sessionTime: config.get('timer.removal.session'),
          pollingTime: config.get('timer.interval.poll'),
        },
        user: {
          id: knownUser.id,
          username: knownUser.username,
        },
      };
      const auth = {
        token: jwt.sign(payload, config.get('auth')),
        vault: knownUser.vault,
        ...payload,
      };

      const { key } = knownUser;
      return Encryption.hybrid(JSON.stringify(auth), key);
    }

    throw ErrorHelper.getCustomError(404, ErrorHelper.CODE.UNKNOWN_USER, 'Unknown user');
  }

  static async getUsers(db, { search }) {
    debug('search for users with @ like:', search);
    const users = await db.users.searchUsername(search.toUpperCase());

    debug('found', users.length);
    return users.map(({ username, key }) => ({ at: username, key }));
  }

  static async getUserByName(db, username) {
    debug('search for user with exact @:', username);
    const knownUser = await db.users.findByName(username);
    if (!knownUser) {
      throw ErrorHelper.getCustomError(404, ErrorHelper.CODE.NOT_FOUND, '@ unknown');
    }

    debug('found for id', knownUser.id);
    const {
      username: at, key,
    } = knownUser;
    return { at, key };
  }

  static async removeUser(db, userId, askingUser) {
    if (askingUser.id !== userId) {
      throw ErrorHelper.getCustomError(403, ErrorHelper.CODE.FORBIDDEN, 'You cannot access this account');
    }
    debug(`remove user ${userId}`);
    const user = await db.users.findByID(userId);
    if (user) {
      debug('user found, delete account');
      await db.clearUserAccount({ userId: user.id, username: user.username });
      debug('user removed');
      return;
    }
    debug('user do not exists, no action');
  }

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
}

module.exports = User;
