const jwt = require('jsonwebtoken');
const debug = require('debug')('msm-main:auth');
const ErrorHelper = require('./error');

class AuthMiddleware {
  static verify(secret) {
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
          if (elapsedTime > (15 * 60 * 1000)) {
            debug('session expired');
            return next(ErrorHelper.getCustomError(401, ErrorHelper.CODE.SESSION_EXPIRED, 'Session expired after 15 minutes'));
          }
          req.auth = payload.user;
          return next();
        });

        return undefined;
      }
      return next(ErrorHelper.getCustomError(401, ErrorHelper.CODE.NO_AUTH_HEADER, 'Missing authorization header'));
    };
  }
}

module.exports = AuthMiddleware;
