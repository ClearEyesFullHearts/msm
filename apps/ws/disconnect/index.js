const debug = require('debug')('ws-disconnect:app');
const config = require('config');
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');
const Data = require('@shared/dynamolayer');

const data = new Data(config.get('dynamo'), {
  frozen: config.get('timer.removal.frozen'),
  inactivity: config.get('timer.removal.inactivity'),
});
data.init();

async function broadcast(sender) {
  const connections = await data.connections.allConnected();
  debug('broadcast to connections', connections.length);
  if (connections.length <= 0) return;

  const message = JSON.stringify({
    action: 'disconnected',
    message: {
      requestId: 'N/A',
      username: sender,
    },
  });
  const sendMessages = connections.map(async (conn) => {
    const {
      id,
      stage,
      domainName,
    } = conn;

    if (id !== sender.id) {
      const client = new ApiGatewayManagementApiClient({
        endpoint: `https://${domainName}/${stage}`,
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
    const {
      requestContext: {
        connectionId,
        disconnectReason,
      },
    } = event;
    debug(`disconnect id ${connectionId} for ${disconnectReason}`);

    const connection = await data.connections.findById(connectionId);
    debug('connection retrieved', !!connection);

    if (connection) {
      await data.connections.delete(connection.username);
      debug('connection deleted');
    }

    if (process.env.CONNECT_BROADCAST) {
      debug('trying to broadcast new connection');
      await broadcast(connection.username);
      debug('broadcast done');
    }

    debug('disconnect done');
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
