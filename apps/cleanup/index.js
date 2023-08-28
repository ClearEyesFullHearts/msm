const Data = require('@shared/dynamolayer');
const Encryption = require('@shared/encryption');
const debug = require('debug')('msm-cleanup:app');
const config = require('config');

const data = new Data(config.get('dynamo'), {
  frozen: config.get('timer.removal.frozen'),
  inactivity: config.get('timer.removal.inactivity'),
});
data.init();

async function writeMessage(msg, targetUser) {
  const {
    title,
    content,
  } = msg;

  const { username, key } = targetUser;

  const from = '@Daily Report';
  const sentAt = Date.now();

  const headerPlain = {
    from,
    sentAt,
    title,
  };
  const headerChallenge = Encryption.hybrid(JSON.stringify(headerPlain), key);
  const fullPlain = {
    from,
    sentAt,
    title,
    content,
  };
  const fullChallenge = Encryption.hybrid(JSON.stringify(fullPlain), key);

  await data.messages.create({
    username,
    header: headerChallenge,
    full: fullChallenge,
  });
}

exports.handler = async function lambdaHandler() {
  debug('clear all read messages');
  const messagesCleared = await data.clearReadMessages();
  debug('clear all inactive users');
  const {
    inactive,
    missed,
  } = await data.deactivateAccounts();

  debug('send report');
  const target = await data.users.findByName(config.get('instance.reportTarget'));

  let reportNb = 0;
  if (target) {
    debug('target found');
    const {
      notValidatedUsers,
      validatingUsers,
      validatedUsers,
      waitingMessages,
    } = await data.activityReport();

    debug('send report message');
    const reportTitle = 'Here is today\'s activity report';
    let reportContent = `We cleared ${messagesCleared} read messages`;
    reportContent += `\nWe cleared ${missed} usernames`;
    reportContent += `\nWe froze ${inactive} users\n`;
    reportContent += `\nWe have ${validatedUsers} active and validated users`;
    reportContent += `\nWe have ${validatingUsers} active users waiting for validation`;
    reportContent += `\nWe have ${notValidatedUsers} active but not validated users`;
    reportContent += `\nWe have ${waitingMessages} unread messages\n`;
    const encrytedMsg = Encryption.encryptMessage(target, reportTitle, reportContent);
    await writeMessage(encrytedMsg, target);
    debug('report message sent');
    reportNb = 1;
  }

  return {
    messagesCleared,
    usersCleared: {
      inactive,
      missed,
    },
    reportSent: reportNb,
  };
};
