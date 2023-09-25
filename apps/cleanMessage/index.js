const Data = require('@shared/dynamolayer');
const debug = require('debug')('msm-clean-message:app');
const config = require('config');

const data = new Data(config.get('dynamo'), {
  frozen: config.get('timer.removal.frozen'),
  inactivity: config.get('timer.removal.inactivity'),
});
data.init();

exports.handler = async function lambdaHandler({ username, messageId }) {
  debug(`remove message ${messageId}`);
  const message = await data.messages.findByID(username, `M#${messageId}`);
  if (message) {
    debug('message found');
    await data.messages.deleteID(username, `M#${messageId}`);
    debug('message removed');
    return;
  }
  debug('message do not exists, no action');
};
