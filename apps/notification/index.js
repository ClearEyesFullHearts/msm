const webpush = require('web-push');
const debug = require('debug')('notification:app');
const config = require('config');
const Data = require('@shared/dynamolayer');
const getSecretValue = require('@shared/secrets');

const data = new Data(config.get('dynamo'), {
  frozen: config.get('timer.removal.frozen'),
  inactivity: config.get('timer.removal.inactivity'),
});
data.init();

let secret;

exports.handler = async (event) => {
  debug('event received', event);
  const { to, from, type } = event.Records[0].Sns.Message;
  if (!secret) {
    await getSecretValue();
    secret = process.env.PRIVATE_VAPID_KEY;
  }
  const subs = await data.subscriptions.findAll(to);
  debug(`${subs.length} subscription for ${to}`);
  if (subs.length < 1) return;

  const promises = [];
  subs.forEach((sub) => {
    const {
      sk: endpoint,
      auth,
      p256dh,
    } = sub;
    const subscription = {
      endpoint,
      keys: {
        auth,
        p256dh,
      },
    };
    const result = webpush.sendNotification(
      subscription,
      JSON.stringify({ type, from }),
      {
        topic: 'mail',
        vapidDetails: {
          subject: `mailto:${config.get('vapid.subject')}`,
          publicKey: config.get('vapid.publicKey'),
          privateKey: secret,
        },
      },
    );
    // .catch((err) => {
    //   console.log(err);
    // });
    promises.push(result);
  });

  debug('send notifications');
  await Promise.all(promises);
  debug('all sent');
};
