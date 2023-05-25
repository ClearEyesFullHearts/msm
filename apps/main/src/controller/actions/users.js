const jwt = require('jsonwebtoken');
const config = require('config');
const debug = require('debug')('msm-main:user');

const ErrorHelper = require('../../lib/error');
const Encryption = require('../../lib/encryption');

function createSearchTerms(str) {
  const l = str.length;
  const terms = [];
  for (let i = 0; i < l - 2; i += 1) {
    for (let j = i + 3; j < l; j += 1) {
      terms.push(str.substring(i, j));
    }
    if (i > 0) {
      terms.push(str.substring(i));
    }
  }
  return terms;
}

class User {
  static async createUser(db, { at, key }) {
    debug('check for user with username:', at);
    if (at.length !== encodeURIComponent(at).length) {
      throw ErrorHelper.getCustomError(400, ErrorHelper.CODE.BAD_REQUEST_FORMAT, '@ name should not have any special character');
    }
    if (!Encryption.isValidPemPk(key)) {
      throw ErrorHelper.getCustomError(400, ErrorHelper.CODE.BAD_REQUEST_FORMAT, 'Wrong public key format');
    }

    const knownUser = await db.users.Doc.findOne({ username: at });
    if (knownUser) {
      throw ErrorHelper.getCustomError(403, ErrorHelper.CODE.USER_EXISTS, '@ name already taken');
    }

    debug('create new user');
    const newUser = new db.users.Doc();
    newUser.username = at;
    newUser.searchTerms = createSearchTerms(at);
    newUser.key = key;
    newUser.lastActivity = Date.now();
    newUser.security = 'safe';

    await newUser.save();
    debug('createNewUser newUser');

    return true;
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

  static async getUsers(db, { search }) {
    debug('search for users with @ like:', search);
    const users = await db.users.Doc
      .find({ $text: { $search: search } })
      .limit(15);

    debug('found', users.length);
    return users.map(({ username, key }) => ({ at: username, key }));
  }

  static changeUserToAuth(usr) {
    const payload = {
      auth: true,
      connection: Date.now(),
      user: {
        id: usr.id,
        username: usr.username,
        security: usr.security,
      },
    };
    debug('changeUserToAuth payload', payload);
    payload.token = jwt.sign(payload, config.get('auth'));

    return payload;
  }
}

module.exports = User;
