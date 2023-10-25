const debug = require('debug')('msm-main:auth');
const config = require('config');
const AWSXRay = require('@shared/tracing');
const ErrorHelper = require('@shared/error');
const Auth = require('@shared/auth');

async function verifyAuth(req) {
  debug('Route is guarded');
  if (req.headers.authorization) {
    const heads = req.headers.authorization.split(' ');
    if (heads.length !== 2 || heads[0] !== 'Bearer') {
      throw ErrorHelper.getCustomError(401, ErrorHelper.CODE.MIS_AUTH_HEADER, 'Misformed authorization header');
    }

    const token = heads[1];
    debug('verify token');
    const { secret } = req.app.locals;
    const payload = await Auth.verifyToken(token, secret.KEY_AUTH_SIGN, config.get('timer.removal.session'));
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
      const author = await Auth.verifyIdentity(db.users, signature, payload, body);
      req.auth = author;
      debug('signature is good, author is set');
    }
    return;
  }
  throw ErrorHelper.getCustomError(401, ErrorHelper.CODE.NO_AUTH_HEADER, 'Missing authorization header');
}

class AuthMiddleware {
  static verify() {
    return function verifyMiddleware(req, res, next) {
      AWSXRay.captureAsyncFunc('AuthMiddleware', verifyAuth(req))
        .then(() => next())
        .catch((exc) => next(exc));
    };
  }
}

module.exports = AuthMiddleware;
