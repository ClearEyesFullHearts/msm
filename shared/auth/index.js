const jwt = require('jsonwebtoken');
const debug = require('debug')('auth:index');
const Encryption = require('@shared/encryption');
const ErrorHelper = require('@shared/error');

class VerifyAuth {
  static async verifyToken(token, secret, timeToWait) {
    return new Promise((resolve, reject) => {
      jwt.verify(token, secret, (err, payload) => {
        if (err) {
          debug('verify error', err);
          return reject(ErrorHelper.getCustomError(403, ErrorHelper.CODE.BAD_TOKEN, err.message));
        }
        debug('verify ok', payload);
        const {
          connection,
          user,
        } = payload;
        if (!connection || !user) {
          return reject(ErrorHelper.getCustomError(401, ErrorHelper.CODE.MIS_AUTH_HEADER, 'Incorrect auth payload'));
        }
        debug('payload ok');

        const elapsedTime = Date.now() - connection;
        if (elapsedTime > timeToWait) {
          debug('session expired');
          return reject(ErrorHelper.getCustomError(401, ErrorHelper.CODE.SESSION_EXPIRED, 'Session expired after 15 minutes'));
        }

        debug('authorized', user.username);
        return resolve(payload);
      });
    });
  }

  static async verifyIdentity(models, signature, payload, body) {
    const { iat, ...restPayload } = payload;
    const { user: { username } } = restPayload;
    const author = await models.findByName(username);
    if (!author) {
      throw ErrorHelper.getCustomError(404, ErrorHelper.CODE.NOT_FOUND, 'Unknown user');
    }
    debug('author found');

    const { signature: verifPK } = author;
    const data = JSON.stringify({
      ...restPayload,
      ...body,
    });

    const result = Encryption.verifySignature(verifPK, data, signature);

    if (!result) {
      throw ErrorHelper.getCustomError(403, ErrorHelper.CODE.FORBIDDEN, 'Impersonation attempt');
    }
    debug('signature checks out');

    return author;
  }
}

module.exports = VerifyAuth;
