/* eslint no-param-reassign: ["error", { "props": true, "ignorePropertyModificationsFor": ["user"] }] */
const jwt = require('jsonwebtoken');
const config = require('config');
const debug = require('debug')('msm-main:user');

const Encryption = require('@shared/encryption');
const ErrorHelper = require('@shared/error');
const MessageAction = require('./messages');

class User {
  static async createUser(db, {
    at, key, signature, hash, pass, kill,
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
    let newUser;
    try {
      newUser = await db.users.create({
        username: at,
        key,
        signature,
        hash,
        pass,
        kill,
      });
    } catch (err) {
      if (err.message === 'Username already exists') {
        throw ErrorHelper.getCustomError(403, ErrorHelper.CODE.USER_EXISTS, '@ name already taken');
      }
      throw ErrorHelper.getCustomError(403, ErrorHelper.CODE.USER_EXISTS, 'Key singularity');
    }
    debug(`user ${at} created with ID = ${newUser.id}`);

    try {
      debug('send welcoming message');
      const welcomeTitle = config.get('welcome.title');
      const welcomeContent = config.get('welcome.content');

      const encrytedMsg = Encryption.encryptMessage(newUser, welcomeTitle, welcomeContent);

      await MessageAction.writeMessage({ db, user: { username: 'do not reply to this message', lastActivity: 1 } }, encrytedMsg, false);
      debug('welcoming message sent');
    } catch (err) {
      debug('Error on first message, user is removed');
      await db.clearUserAccount(newUser, config.get('timer.removal.frozen'), false);
      throw ErrorHelper.getCustomError(500, ErrorHelper.CODE.SERVER_ERROR, 'Encryption issue');
    }

    return newUser;
  }

  static async getCredentials({ db, secret }, { at, hashedPass }) {
    debug('check for user with @:', at);
    if (at.length !== encodeURIComponent(at).length) {
      throw ErrorHelper.getCustomError(400, ErrorHelper.CODE.BAD_REQUEST_FORMAT, '@ name should not have any special character');
    }
    const knownUser = await db.users.findByName(at);
    if (!knownUser) {
      throw ErrorHelper.getCustomError(404, ErrorHelper.CODE.UNKNOWN_USER, 'Unknown user');
    }
    debug('known user');

    const {
      signature,
      pass,
      kill,
    } = knownUser;

    if (kill && Encryption.verifySignature(signature, hashedPass, kill)) {
      await db.clearUserAccount(knownUser, config.get('timer.removal.frozen'));
      throw ErrorHelper.getCustomError(404, ErrorHelper.CODE.UNKNOWN_USER, 'Unknown user');
    }
    if (pass && !Encryption.verifySignature(signature, hashedPass, pass)) {
      throw ErrorHelper.getCustomError(404, ErrorHelper.CODE.UNKNOWN_USER, 'Unknown user');
    }
    debug('password is good');

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
      token: jwt.sign(payload, secret.KEY_AUTH_SIGN),
      contacts: knownUser.contacts,
      ...payload,
    };

    const { key } = knownUser;
    const rawChallenge = Encryption.hybrid(JSON.stringify(auth), key);
    if (knownUser.vault) {
      const {
        iv,
        token,
      } = knownUser.vault;
      return {
        ...rawChallenge,
        vault: {
          iv,
          token,
        },
      };
    }
    return rawChallenge;
  }

  static async getUsers({ db }, { search }) {
    debug('search for users with @ like:', search);
    const users = await db.users.searchUsername(search.toUpperCase());

    debug('found', users.length);
    return users.map(({
      sk,
    }) => (sk));
  }

  static async getList({ db }, { list }) {
    debug('search for users with @ in:', list);
    for (let i = 0; i < list.length; i += 1) {
      const at = list[i];
      if (at.length < 3) {
        throw ErrorHelper.getCustomError(400, ErrorHelper.CODE.BAD_REQUEST_FORMAT, '@ name should should have at least 3 character');
      }
      if (at.length > 35) {
        throw ErrorHelper.getCustomError(400, ErrorHelper.CODE.BAD_REQUEST_FORMAT, '@ name should not have more than 35 character');
      }
      if (at.length !== encodeURIComponent(at).length) {
        throw ErrorHelper.getCustomError(400, ErrorHelper.CODE.BAD_REQUEST_FORMAT, '@ name should not have any special character');
      }
    }
    debug('the list is correct');
    const promises = list.map((name) => db.users.findByName(name)
      .then((user) => {
        if (user) {
          const {
            username: at, key, id, signature,
          } = user;
          return {
            at, key, id, signature,
          };
        }
        return null;
      }));

    const all = await Promise.all(promises);
    const result = all.filter((u) => !!u);
    debug(`found ${result.length} users on ${list.length}`);
    return result;
  }

  static async getUserByName({ db }, name) {
    debug('search for user with exact @ :', name);
    const knownUser = await db.users.findByName(name);
    if (!knownUser) {
      throw ErrorHelper.getCustomError(404, ErrorHelper.CODE.NOT_FOUND, '@ unknown');
    }

    debug('found for id', knownUser.id);
    const {
      username: at, key, id, signature,
    } = knownUser;
    return {
      at, key, id, signature,
    };
  }

  static async removeUser({ db, user }, name) {
    if (user.username !== name) {
      throw ErrorHelper.getCustomError(403, ErrorHelper.CODE.FORBIDDEN, 'You cannot access this account');
    }
    debug(`remove user ${name}`);
    await db.clearUserAccount(user, config.get('timer.removal.frozen'));
    debug('user removed');
  }

  static async removeVaultItem({ db, user }) {
    debug(`remove vault item for ${user.username}`);
    if (user.lastActivity < 0) {
      throw ErrorHelper.getCustomError(501, ErrorHelper.CODE.NOT_IMPLEMENTED, 'Sender account is not activated (open the welcoming email)');
    }

    await db.users.deleteVault(user.username);
    debug('vault item removed');
  }

  static async setVaultItem({ db, user }, { vault, pass, kill }) {
    debug(`set vault item for ${user.username}`);

    await db.users.addVault(user.username, { vault, pass, kill });
    debug('vault item set');
  }

  static async setContacts({ db, user }, challenge) {
    const {
      token,
      passphrase,
      iv,
    } = challenge;
    debug(`set contacts for ${user.id}`);

    if (user.lastActivity < 0) {
      throw ErrorHelper.getCustomError(501, ErrorHelper.CODE.NOT_IMPLEMENTED, 'Sender account is not activated (open the welcoming email)');
    }
    await db.users.setContacts(user.username, challenge);
    debug('contacts set');
  }

  static async addSubscription({ db, user }, { endpoint, keys: { auth, p256dh } }) {
    debug(`add a push subscription for ${user.username}`);
    const sub = {
      username: user.username,
      endpoint,
      auth,
      p256dh,
    };

    try {
      await db.subscriptions.create(sub);
      debug('subscription added');
    } catch (err) {
      if (err.name !== 'ConditionalCheckFailedException') {
        throw err;
      }
      debug('subscription already exists');
    }
  }
}

module.exports = User;
