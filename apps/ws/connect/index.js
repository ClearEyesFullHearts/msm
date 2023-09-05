const debug = require('debug')('ws-connect:app');
const config = require('config');
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');
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

async function broadcast(sender) {
  const connections = await data.connections.allConnected();
  if (connections.length < 2) return;

  const message = JSON.stringify({
    type: 'CONNECTION',
    from: sender.username,
  });
  const sendMessages = connections.map(async (conn) => {
    const {
      id,
      stage,
      domainName,
    } = conn;

    if (id !== sender.id) {
      const client = new ApiGatewayManagementApiClient({
        apiVersion: '2018-11-29',
        endpoint:
      `${domainName}/${stage}`,
      });
      const input = { // PostToConnectionRequest
        Data: message, // required
        ConnectionId: id, // required
      };
      const command = new PostToConnectionCommand(input);
      return client.send(command).catch((err) => console.log(err));
    }
    return Promise.resolve();
  });

  try {
    await Promise.all(sendMessages);
  } catch (e) {
    console.log(e);
  }
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

      debug('check for auth headers');

      if (headers['sec-websocket-protocol'] !== undefined) {
        debug('auth headers exist');
        const subprotocolHeader = headers['sec-websocket-protocol'];
        const identifiers = subprotocolHeader.split(',');

        if (identifiers.length !== 2) {
          throw ErrorHelper.getCustomError(400, ErrorHelper.CODE.BAD_REQUEST_FORMAT, 'Missing header informations');
        }
        debug('both auth headers present');

        const [token, signature] = identifiers;
        if (!tokenSecret) {
          await getSecretValue();
          tokenSecret = process.env.KEY_AUTH_SIGN;
        }
        debug('secret is set');

        const payload = await Auth.verifyToken(token, tokenSecret, config.get('timer.removal.session'));
        debug('token is verified, we have payload');

        const author = await Auth.verifyIdentity(data.users, signature, payload, { action: 'WSS' });
        debug('signature is verified, we have author');

        if (author.validation !== 'VALIDATED') {
          throw ErrorHelper.getCustomError(401, ErrorHelper.CODE.UNAUTHORIZED, 'Only validated users can connect');
        }
        debug('author is validated, proceed');

        const {
          username,
          signature: sigKey,
        } = author;

        const connection = await data.connections.findByName(username);

        if (connection) {
          await data.connections.updateId(username, connectionId);
          debug('already connected, update the id');
        } else {
          const sender = await data.connections.create({
            username,
            signature: sigKey,
            connectionId,
            stage,
            domainName,
          });
          debug('connection created');

          if (process.env.CONNECT_BROADCAST) {
            debug('trying to broadcast new connection');
            await broadcast(sender);
            debug('broadcast done');
          }
        }

        const response = {
          statusCode: 200,
          headers: {
            'Sec-WebSocket-Protocol': 'signature',
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
