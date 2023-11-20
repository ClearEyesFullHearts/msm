/* eslint no-param-reassign:
["error", { "props": true, "ignorePropertyModificationsFor": ["user"] }] */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('config');
const debug = require('debug')('msm-main:user');
const AWSXRay = require('@shared/tracing');
const Encryption = require('@shared/encryption');
const ErrorHelper = require('@shared/error');
const MessageAction = require('./messages');

const SALT_SIZE = 64;
const IV_SIZE = 16;

function roundTimeToNext(secondsNumber) {
  const epoch = Date.now();
  const coeff = (1000 * secondsNumber);
  const minutesChunk = Math.floor(epoch / coeff) * coeff;
  return minutesChunk + coeff;
}

class User {
  static async createUser({ db, secret }, {
    at, key, signature, hash, vault, attic,
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
      });
    } catch (err) {
      if (err.message === 'Username already exists') {
        throw ErrorHelper.getCustomError(403, ErrorHelper.CODE.USER_EXISTS, '@ name already taken');
      }
      throw ErrorHelper.getCustomError(403, ErrorHelper.CODE.USER_EXISTS, 'Key singularity');
    }
    debug(`user ${at} created`);

    if (vault && attic) {
      try {
        const cypheredVault = Encryption.encryptVault(secret.KEY_VAULT_ENCRYPT, vault);
        await db.users.addVault(at, { vault: cypheredVault, attic });
      } catch (err) {
        debug('Error on vault set up, user is removed');
        await db.clearUserAccount(newUser, config.get('timer.removal.frozen'), false);
        throw ErrorHelper.getCustomError(500, ErrorHelper.CODE.SERVER_ERROR, 'Server error');
      }
    }

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

  static async getCryptoData({ db }, { at }) {
    function sendBogus(sk) {
      const pemHeader = '-----BEGIN PRIVATE KEY-----';
      const pemFooter = '-----END PRIVATE KEY-----';
      const trimmedSK = sk.replace(/\n/g, '');
      const key = trimmedSK.substring(pemHeader.length, trimmedSK.length - pemFooter.length);

      return {
        iv: crypto.randomBytes(IV_SIZE).toString('base64'),
        salt: crypto.randomBytes(SALT_SIZE).toString('base64'),
        proof: crypto.randomBytes(SALT_SIZE).toString('base64'),
        key,
      };
    }
    if (at.length !== encodeURIComponent(at).length) {
      throw ErrorHelper.getCustomError(400, ErrorHelper.CODE.BAD_REQUEST_FORMAT, '@ name should not have any special character');
    }

    debug('check for user with @:', at);

    const { privateKey } = Encryption.generateECDSAKeys();

    const knownUser = await db.users.findByName(at);
    if (!knownUser) {
      return sendBogus(privateKey);
    }
    debug('known user');

    const {
      attic,
    } = knownUser;
    if (!attic) {
      return sendBogus(privateKey);
    }
    debug('user has an attic');

    return attic;
  }

  static async getCredentials({ db, secret }, { at, passHeader }) {
    debug('check for user with @:', at);
    if (at.length !== encodeURIComponent(at).length) {
      throw ErrorHelper.getCustomError(400, ErrorHelper.CODE.BAD_REQUEST_FORMAT, 'Bad Request Format');
    }
    const knownUser = await db.users.findByName(at);
    if (!knownUser) {
      throw ErrorHelper.getCustomError(400, ErrorHelper.CODE.BAD_REQUEST_FORMAT, 'Bad Request Format');
    }
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
      token: jwt.sign(payload, secret.KEY_AUTH_SIGN),
      contacts: knownUser.contacts,
      ...payload,
    };

    const { key } = knownUser;
    const rawChallenge = Encryption.hybrid(JSON.stringify(auth), key);

    if (passHeader) {
      debug('compare header is present');
      const [ttl, signedPass] = passHeader.split(':');
      if (!Encryption.isBase64(signedPass)) {
        throw ErrorHelper.getCustomError(400, ErrorHelper.CODE.BAD_REQUEST_FORMAT, 'Bad Request Format');
      }
      debug('compare signature is present');
      const serverTtl = roundTimeToNext(1);
      if (ttl !== serverTtl.toString()) {
        console.log('ttl received', ttl);
        console.log('ttl computed', serverTtl);
        throw ErrorHelper.getCustomError(419, ErrorHelper.CODE.SESSION_EXPIRED, 'Time to live is expired');
      }
      debug('time to live is right');
      const {
        vault,
        attic: {
          key: verifB64,
        },
      } = knownUser;

      if (!vault) {
        throw ErrorHelper.getCustomError(400, ErrorHelper.CODE.BAD_REQUEST_FORMAT, 'Bad Request Format');
      }
      debug('vault is present');

      const {
        token,
        salt,
        iv,
        pass,
        kill,
      } = Encryption.decryptVault(secret.KEY_VAULT_ENCRYPT, vault);

      const verifier = `-----BEGIN PRIVATE KEY-----\n${verifB64}\n-----END PRIVATE KEY-----`;

      const killCompare = Encryption.hash(`${ttl}${kill}`).toString('base64');
      if (Encryption.verifyECDSASignature(verifier, killCompare, signedPass)) {
        debug('kill switch activated');
        await db.clearUserAccount(knownUser, config.get('timer.removal.frozen'));
        throw ErrorHelper.getCustomError(400, ErrorHelper.CODE.BAD_REQUEST_FORMAT, 'Bad Request Format');
      }
      const passCompare = Encryption.hash(`${ttl}${pass}`).toString('base64');
      if (!Encryption.verifyECDSASignature(verifier, passCompare, signedPass)) {
        debug('password do not match');
        throw ErrorHelper.getCustomError(400, ErrorHelper.CODE.BAD_REQUEST_FORMAT, 'Bad Request Format');
      }
      debug('password is good');
      return {
        ...rawChallenge,
        vault: {
          token,
          salt,
          iv,
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

  static async setVaultItem({ db, user, secret }, { vault, attic }) {
    debug(`set vault item for ${user.username}`);

    const cypheredVault = Encryption.encryptVault(secret.KEY_VAULT_ENCRYPT, vault);
    await db.users.addVault(user.username, { vault: cypheredVault, attic });

    debug('vault item set');
  }

  static async setContacts({ db, user }, challenge) {
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

module.exports = AWSXRay.captureClass(User);
