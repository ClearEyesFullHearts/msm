const debug = require('debug')('msm-error:index');

class ErrorHelper {
  static get CODE() {
    return {
      BAD_REQUEST_FORMAT: 'BAD_REQUEST_FORMAT',
      BAD_ROLE: 'BAD_ROLE',
      BAD_TOKEN: 'BAD_TOKEN',
      MIS_AUTH_HEADER: 'MIS_AUTH_HEADER',
      NO_AUTH_HEADER: 'NO_AUTH_HEADER',
      SESSION_EXPIRED: 'SESSION_EXPIRED',
      NOT_FOUND: 'NOT_FOUND',
      NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
      SERVER_ERROR: 'SERVER_ERROR',
      EXTERNAL_SERVER_ERROR: 'EXTERNAL_SERVER_ERROR',
      UNAUTHORIZED: 'UNAUTHORIZED',
      FORBIDDEN: 'FORBIDDEN',
      UNKNOWN_USER: 'UNKNOWN_USER',
      USER_EXISTS: 'USER_EXISTS',
    };
  }

  static catchMiddleware() {
    return function catchMiddleware(err, req, res, next) { // eslint-disable-line no-unused-vars
      debug('error received', err);
      let error;
      if (typeof err !== 'object') {
      // If the object is not an Error, create a representation that appears to be
        error = {
          status: 500,
          message: String(err), // Coerce to string
          code: 'SERVER_ERROR',
        };
      } else {
        // Ensure that err.message is enumerable (It is not by default)
        Object.defineProperty(err, 'message', { enumerable: true });
        error = err;
      }
      if (error.errors && error.status) {
        const [first] = error.errors;
        error = ErrorHelper.getCustomError(error.status, ErrorHelper.CODE.BAD_REQUEST_FORMAT, first.errorCode);
      }
      if (res.statusCode >= 400) {
        error.status = res.statusCode;
      }

      res.statusCode = (error.status) ? error.status : 500;

      res.json(error);
    };
  }

  static getCustomError(status, code, message) {
    const err = new Error(message);
    err.status = status;
    err.code = code;

    return err;
  }
}

module.exports = ErrorHelper;
