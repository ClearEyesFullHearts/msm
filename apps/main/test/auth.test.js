const {
  describe, expect, test,
} = require('@jest/globals');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const Auth = require('../src/lib/auth');
const userLoader = require('./data/loadUser');

const middleware = Auth.verify('sercet', 60000);

const getErrorNext = (status, code, msg) => (result) => {
  expect(result).toBeInstanceOf(Error);
  expect(result).toHaveProperty('status', status);
  expect(result).toHaveProperty('code', code);
  expect(result).toHaveProperty('message', msg);
};

function sign(data, key) {
  const bufData = Buffer.from(JSON.stringify(data));
  return crypto.sign('rsa-sha256', bufData, {
    key,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: 32,
  }).toString('base64');
}

function getAuthInfo(id) {
  const user = userLoader(id);
  const payload = {
    connection: Date.now(),
    user: {
      id,
    },
  };
  const token = jwt.sign(payload, 'sercet');
  const body = { foo: 'any body is ok' };

  const data = {
    ...payload,
    ...body,
  };

  const signature = sign(data, user.private.signature);

  return {
    user,
    payload,
    token,
    signature,
    body,
  };
}

describe('Auth middleware tests', () => {
  describe('Authorization scheme', () => {
    test('Authorization is mandatory', () => {
      const next = getErrorNext(401, 'NO_AUTH_HEADER', 'Missing authorization header');
      const req = { headers: {} };
      middleware(req, {}, next);
      req.headers.authorization = null;
      middleware(req, {}, next);
      req.headers.authorization = '';
      middleware(req, {}, next);
    });
    test('Authorization should respect bearer format', () => {
      const next = getErrorNext(401, 'MIS_AUTH_HEADER', 'Misformed authorization header');
      const req = { headers: { authorization: 'Bearer' } };
      middleware(req, {}, next);
      req.headers.authorization = 'Bearer gibberish and again';
      middleware(req, {}, next);
      req.headers.authorization = 'Basic gibberish';
      middleware(req, {}, next);
    });
    test('Verification should fail on wrong token', () => {
      const req = { headers: { authorization: 'Bearer gibberish' } };
      middleware(req, {}, getErrorNext(403, 'BAD_TOKEN', 'jwt malformed'));

      const token = jwt.sign({
        connection: Date.now(),
        user: {
          id: 'my user is fine',
        },
      }, 'wrongsecret');
      req.headers.authorization = `Bearer ${token}`;
      middleware(req, {}, getErrorNext(403, 'BAD_TOKEN', 'invalid signature'));
    });
    test('Auth is set when validation pass', () => {
      const token = jwt.sign({
        connection: Date.now(),
        user: {
          id: 'my user is fine',
        },
      }, 'sercet');

      const req = { headers: { authorization: `Bearer ${token}` } };
      middleware(req, {}, () => {
        expect(req.auth.id).toBe('my user is fine');
      });
    });
    test('Verification should fail on malformed payload', () => {
      const next = getErrorNext(401, 'MIS_AUTH_HEADER', 'Incorrect auth payload');
      let token = jwt.sign({
        user: {
          id: 'my user is fine',
        },
      }, 'sercet');

      const req = { headers: { authorization: `Bearer ${token}` } };
      middleware(req, {}, next);

      token = jwt.sign({
        connection: Date.now(),
      }, 'sercet');
      req.headers.authorization = `Bearer ${token}`;
      middleware(req, {}, next);
    });
    test('Verification should fail when session expired', () => {
      const next = getErrorNext(401, 'SESSION_EXPIRED', 'Session expired after 15 minutes');
      const token = jwt.sign({
        connection: Date.now() - 1200000,
        user: {
          id: 'my user is fine',
        },
      }, 'sercet');

      const req = { headers: { authorization: `Bearer ${token}` } };
      middleware(req, {}, next);
    });
  });

  describe('Signature scheme', () => {
    test('Auth is set to db user when signature is verified', () => {
      const {
        user,
        token,
        signature,
        body,
      } = getAuthInfo(1);

      const req = {
        headers: {
          authorization: `Bearer ${token}`,
          'x-msm-sig': signature,
        },
        body,
        app: {
          locals: {
            db: {
              users: {
                findByID: () => Promise.resolve(user),
              },
            },
          },
        },
      };

      middleware(req, {}, () => {
        expect(req.auth).toEqual(user);
      });
    });
    test('Verification should fail on unknown user', () => {
      const {
        token,
        signature,
        body,
      } = getAuthInfo(1);

      const req = {
        headers: {
          authorization: `Bearer ${token}`,
          'x-msm-sig': signature,
        },
        body,
        app: {
          locals: {
            db: {
              users: {
                findByID: () => Promise.resolve(null),
              },
            },
          },
        },
      };

      middleware(req, {}, getErrorNext(404, 'NOT_FOUND', 'Unknown user'));
    });
    test('Verification should fail on wrong signature', () => {
      const {
        user,
        token,
        body,
      } = getAuthInfo(1);
      const {
        signature,
      } = getAuthInfo(2);

      const req = {
        headers: {
          authorization: `Bearer ${token}`,
          'x-msm-sig': signature,
        },
        body,
        app: {
          locals: {
            db: {
              users: {
                findByID: () => Promise.resolve(user),
              },
            },
          },
        },
      };

      middleware(req, {}, getErrorNext(403, 'FORBIDDEN', 'Impersonation attempt'));
    });
  });
});
