const debug = require('debug')('msm-main:auth');
const ErrorHelper = require('@shared/error');
const Auth = require('@shared/auth');

class AuthMiddleware {
  static verify(secret, timeToWait) {
    return function verifyMiddleware(req, res, next) {
      debug('Route is guarded');
      if (req.headers.authorization) {
        const heads = req.headers.authorization.split(' ');
        if (heads.length !== 2 || heads[0] !== 'Bearer') return next(ErrorHelper.getCustomError(401, ErrorHelper.CODE.MIS_AUTH_HEADER, 'Misformed authorization header'));

        const token = heads[1];
        debug('verify token');
        return Auth.verifyToken(token, secret, timeToWait)
          .then((payload) => {
            const { user } = payload;
            req.auth = user;
            debug('token is good, user is set');

            if (req.headers['x-msm-sig']) {
              debug('verify identity');
              const signature = req.headers['x-msm-sig'];
              const {
                body,
                app: {
                  locals: {
                    db,
                  },
                },
              } = req;
              return Auth.verifyIdentity(db, signature, payload, body)
                .then((author) => {
                  req.auth = author;
                  debug('signature is good, author is set');
                  next();
                })
                .catch((err) => {
                  debug('Identity verfication error');
                  next(err);
                });
            }
            return next();
          })
          .catch((err) => {
            debug('Token verfication error');
            next(err);
          });
      }
      return next(ErrorHelper.getCustomError(401, ErrorHelper.CODE.NO_AUTH_HEADER, 'Missing authorization header'));
    };
  }
}

module.exports = AuthMiddleware;
