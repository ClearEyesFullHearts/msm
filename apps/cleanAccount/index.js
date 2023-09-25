const debug = require('debug')('msm-clean-account:app');
const config = require('config');
const Data = require('@shared/dynamolayer');

const data = new Data(config.get('dynamo'), {
  frozen: config.get('timer.removal.frozen'),
  inactivity: config.get('timer.removal.inactivity'),
});
data.init();

exports.handler = async function lambdaHandler({ username }) {
  debug('Auto User Removal for user', username);
  const user = await data.users.findByName(username);
  if (user) {
    debug('user found');
    if (user.lastActivity < 0) {
      debug('inactive user, delete account');
      await data.clearUserAccount(user, false);
      debug('user removed');
      return;
    }
    debug('user is active, do not delete');
    return;
  }
  debug('user do not exists, no action');
};
