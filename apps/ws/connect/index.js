const debug = require('debug')('ws-connect:app');
const config = require('config');
const Data = require('@shared/dynamolayer');
const Auth = require('@shared/auth');
const ErrorHelper = require('@shared/error');
const getSecretValue = require('@shared/secrets');

const data = new Data(config.get('dynamo'), {
  frozen: config.get('timer.removal.frozen'),
  inactivity: config.get('timer.removal.inactivity'),
});
data.init();

let tokenSecret;

function toLowerCaseProperties(obj) {
  const wrapper = {};
  Object.keys(obj).forEach((key) => {
    wrapper[key.toLowerCase()] = obj[key];
  });
  return wrapper;
}

exports.handler = async function lambdaHandler(event) {
  try {
    if (event.headers !== undefined) {
      const {
        requestContext: {
          connectionId,
          stage,
          domainName,
        },
      } = event;

      const headers = toLowerCaseProperties(event.headers);

      if (headers['sec-websocket-protocol'] !== undefined) {
        const subprotocolHeader = headers['sec-websocket-protocol'];
        const identifiers = subprotocolHeader.split(',');

        if (identifiers.length !== 2) {
          throw ErrorHelper.getCustomError(400, ErrorHelper.CODE.BAD_REQUEST_FORMAT, 'Missing header informations');
        }

        const [token, signature] = identifiers;
        if (!tokenSecret) {
          await getSecretValue();
          tokenSecret = process.env.KEY_AUTH_SIGN;
        }

        const payload = await Auth.verifyToken(token, tokenSecret, config.get('timer.removal.session'));

        const author = await Auth.verifyIdentity(data.users, signature, payload, { action: 'WSS' });

        if (author.validation !== 'VALIDATED') {
          throw ErrorHelper.getCustomError(401, ErrorHelper.CODE.UNAUTHORIZED, 'Only validated users can connect');
        }

        const {
          username,
          signature: sigKey,
        } = author;

        const connection = await data.connections.findByName(username);

        if (connection) {
          await data.connections.updateId(username, connectionId);
        } else {
          await data.connections.create({
            username,
            signature: sigKey,
            connectionId,
            stage,
            domainName,
          });
        }

        const response = {
          statusCode: 200,
          headers: {
            'Sec-WebSocket-Protocol': token,
          },
        };
        return response;
      }
    }

    throw ErrorHelper.getCustomError(400, ErrorHelper.CODE.BAD_REQUEST_FORMAT, 'Missing header');
  } catch (err) {
    const { status, code, message } = err;
    if (code) {
      return {
        statusCode: status,
        code,
        message,
      };
    }

    return {
      statusCode: 500,
      code: 'SERVER_ERROR',
      message,
    };
  }
};
