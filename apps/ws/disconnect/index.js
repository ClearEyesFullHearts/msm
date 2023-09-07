const debug = require('debug')('ws-disconnect:app');
const config = require('config');
const Data = require('@shared/dynamolayer');

const data = new Data(config.get('dynamo'), {
  frozen: config.get('timer.removal.frozen'),
  inactivity: config.get('timer.removal.inactivity'),
});
data.init();

exports.handler = async function lambdaHandler(event) {
  try {
    const {
      requestContext: {
        connectionId,
      },
    } = event;
    debug('disconnect id', connectionId);

    const connection = await data.connections.findById(connectionId);
    debug('connection retrieved', connection);

    if (connection) {
      await data.connections.delete(connection.username);
      debug('connection deleted');
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
