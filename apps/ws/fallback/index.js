const debug = require('debug')('ws-fallback:app');
const config = require('config');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
  DeleteConnectionCommand,
  GoneException,
} = require('@aws-sdk/client-apigatewaymanagementapi');
const Data = require('@shared/dynamolayer');

const ACTIONS = {
  DISCONNECTED: 'DISCONNECTED',
  ERROR: 'ERROR',
  FALLBACK: 'FALLBACKCHAT',
};

const data = new Data(config.get('dynamo'), {
  frozen: config.get('timer.removal.frozen'),
  inactivity: config.get('timer.removal.inactivity'),
});
data.init();

const schema = {
  type: 'object',
  properties: {
    to: { type: 'string', minLength: 3, maxLength: 35 },
    content: {
      type: 'string', minLength: 684, maxLength: 684, format: 'byte',
    },
  },
  required: ['to', 'content'],
  additionalProperties: false,
};
const ajvP = new Ajv();
addFormats(ajvP);
const messageValidator = ajvP.compile(schema);

function validateMessageSchema(message) {
  const valid = messageValidator(message);
  if (!valid) {
    return messageValidator.errors;
  }

  return false;
}

async function sendMessage(target, message, doesThrow = true) {
  const {
    id,
    stage,
    domainName,
  } = target;

  const client = new ApiGatewayManagementApiClient({
    endpoint: `https://${domainName}/${stage}`,
  });
  const input = {
    Data: JSON.stringify(message),
    ConnectionId: id,
  };
  const command = new PostToConnectionCommand(input);
  try {
    await client.send(command);
  } catch (err) {
    if (doesThrow) throw err;
    console.error(err);
  }
}

async function sendDisconnection(target, disconnected) {
  const message = {
    action: ACTIONS.DISCONNECTED,
    message: {
      username: disconnected,
    },
  };
  await sendMessage(target, message, false);
}

async function sendError(target, error) {
  const message = {
    action: ACTIONS.ERROR,
    message: {
      action: ACTIONS.FALLBACK,
      error,
    },
  };
  await sendMessage(target, message, false);
}

async function cleanSocket({
  id, stage, domainName,
}) {
  const client = new ApiGatewayManagementApiClient({
    endpoint: `https://${domainName}/${stage}`,
  });
  const input = {
    ConnectionId: id,
  };
  const command = new DeleteConnectionCommand(input);
  await client.send(command);
}

exports.handler = async function lambdaHandler(event) {
  try {
    const {
      requestContext: {
        connectionId,
        stage,
        domainName,
      },
      body,
    } = event;
    debug(`get connection for id ${connectionId}`);

    const sender = await data.connections.findById(connectionId);

    if (sender) {
      debug('sender retrieved', sender);
      const { message } = JSON.parse(body);
      const validationError = validateMessageSchema(message);
      if (validationError) {
        await sendError(sender, validationError);
        debug('message is not good');
        return {
          statusCode: 200,
        };
      }
      debug('message is good');

      const {
        to,
        content,
      } = message;

      const target = await data.connections.findByName(to);
      if (!target) {
        await sendDisconnection(sender, to);
        debug('target is disconnected');
        return {
          statusCode: 200,
        };
      }
      debug('target retrieved', target.username);

      try {
        await sendMessage(target, {
          action: ACTIONS.FALLBACK,
          message: {
            content,
          },
        });
      } catch (err) {
        if (err instanceof GoneException) {
          debug('target is disconnected');
          await data.connections.delete(target.username);
          await sendDisconnection(sender, to);
          debug('data cleaned up');
          return {
            statusCode: 200,
          };
        }
        throw err;
      }

      debug('message sent');
      return {
        statusCode: 200,
      };
    }

    debug('unknown user');

    const unknownUser = {
      id: connectionId,
      stage,
      domainName,
    };
    const unknownSenderError = {
      status: 404,
      code: 'NOT_FOUND',
      message: 'You are unknown, please re-connect',
    };
    await sendError(unknownUser, unknownSenderError);
    await cleanSocket(unknownUser).catch((err) => console.error(err));

    debug('unknown user disconnected');
    return {
      statusCode: 200,
    };
  } catch (err) {
    debug('error occured', err);
    return {
      statusCode: 500,
      code: 'SERVER_ERROR',
      message: err.message,
    };
  }
};
