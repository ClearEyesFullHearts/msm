const jwt = require('jsonwebtoken');
const config = require('config');
const debug = require('debug')('msm-main:user');

const ErrorHelper = require('../../lib/error');
const Encryption = require('../../lib/encryption');

class User {
  static async createUser(db, { at, key }) {
    debug('check for user with username:', at);
    const knownUser = await db.users.Doc.findOne({ username: at });
    if (knownUser) {
      throw ErrorHelper.getCustomError(403, ErrorHelper.CODE.USER_EXISTS, '@ name already taken');
    }

    debug('create new user');
    const newUser = new db.users.Doc();
    newUser.username = at;
    newUser.key = key;
    newUser.lastActivity = new Date();
    newUser.security = 'safe';

    const created = await newUser.save();
    debug('createNewUser newUser', created);

    const auth = this.changeUserToAuth(newUser);
    return Encryption.hybrid(JSON.stringify(auth), key);
  }

  static async getCredentials(db, { at }) {
    debug('check for user with @:', at);
    const knownUser = await db.users.Doc.findOne({ username: at });
    if (knownUser) {
      debug('known user');
      const auth = this.changeUserToAuth(knownUser);
      const { key } = knownUser;
      return Encryption.hybrid(JSON.stringify(auth), key);
    }

    throw ErrorHelper.getCustomError(401, ErrorHelper.CODE.UNKNOWN_USER, 'Unknown user');
  }

  static changeUserToAuth(usr) {
    const payload = {
      auth: true,
      user: {
        id: usr.id,
        username: usr.username,
        key: usr.key,
        security: usr.security,
      },
    };
    debug('changeUserToAuth payload', payload);
    payload.token = jwt.sign(payload, config.get('auth'));
    return payload;
  }
}

module.exports = User;
