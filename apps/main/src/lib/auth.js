const jwt = require('jsonwebtoken');
const debug = require('debug')('msm-main:auth');
const ErrorHelper = require('./error');
const Encryption = require('./encryption');

class AuthMiddleware {
  static verify(secret, timeToWait) {
    return function verifyMiddleware(req, res, next) {
      debug('Route is guarded');
      if (req.headers.authorization) {
        const heads = req.headers.authorization.split(' ');
        if (heads.length < 2) return next(ErrorHelper.getCustomError(401, ErrorHelper.CODE.MIS_AUTH_HEADER, 'Misformed authorization header'));

        const token = heads[1];
        debug('verify token', token);
        jwt.verify(token, secret, (err, payload) => {
          if (err) {
            debug('verify error', err);
            return next(ErrorHelper.getCustomError(403, ErrorHelper.CODE.BAD_TOKEN, err.message));
          }
          debug('verify ok', payload);
          const elapsedTime = Date.now() - payload.connection;
          if (elapsedTime > timeToWait) {
            debug('session expired');
            return next(ErrorHelper.getCustomError(401, ErrorHelper.CODE.SESSION_EXPIRED, 'Session expired after 15 minutes'));
          }

          req.auth = payload.user;

          if (req.headers['x-msm-sig']) {
            debug('verify signature');
            const {
              body,
              app: {
                locals: {
                  db,
                },
              },
            } = req;

            const sig = req.headers['x-msm-sig'];
            const { iat, ...restPayload } = payload;
            const { user: { id } } = restPayload;

            return db.users.Doc.findOne({ id })
              .then((author) => {
                if (!author) {
                  return next(ErrorHelper.getCustomError(404, ErrorHelper.CODE.NOT_FOUND, 'Unknown user'));
                }
                const { signature: verifPK } = author;
                const data = JSON.stringify({
                  ...restPayload,
                  ...body,
                });
                const result = Encryption.verifySignature(verifPK, data, sig);
                if (!result) {
                  return next(ErrorHelper.getCustomError(403, ErrorHelper.CODE.FORBIDDEN, 'Impersonation attempt'));
                }
                debug('signature checks out');
                req.auth = author;
                return next();
              })
              .catch(() => next(ErrorHelper.getCustomError(500, ErrorHelper.CODE.SERVER_ERROR, 'Server error')));
          }
          return next();
        });

        return undefined;
      }
      return next(ErrorHelper.getCustomError(401, ErrorHelper.CODE.NO_AUTH_HEADER, 'Missing authorization header'));
    };
  }
}

module.exports = AuthMiddleware;
