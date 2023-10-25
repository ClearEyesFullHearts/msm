const webpush = require('web-push');
const debug = require('debug')('notification:app');
const config = require('config');
const AWSXRay = require('@shared/tracing');
const { ApiGatewayManagementApiClient, PostToConnectionCommand, GoneException } = require('@aws-sdk/client-apigatewaymanagementapi');
const Data = require('@shared/dynamolayer');
const Secret = require('@shared/secrets');

let data;
let secret;

async function wssNotification({ to, from, action }) {
  debug(`Notify ${to} that ${from} sent a message`);
  const connection = await data.connections.findByName(to);
  debug('target is connected', !!connection);
  if (connection) {
    const {
      id,
      stage,
      domainName,
    } = connection;

    const message = {
      action,
      message: {
        from,
      },
    };

    const endpoint = config.get('wss.withStage') ? `https://${domainName}/${stage}` : `https://${domainName}`;
    const client = AWSXRay.captureAWSv3Client(new ApiGatewayManagementApiClient({
      endpoint,
    }));
    const input = {
      Data: JSON.stringify(message),
      ConnectionId: id,
    };
    const command = new PostToConnectionCommand(input);
    try {
      await client.send(command);
      debug('notification sent');
    } catch (err) {
      if (err instanceof GoneException) {
        debug('target is disconnected', to);
        await data.connections.delete(to);
        return false;
      }
      throw err;
    }
    return true;
  }

  return false;
}

async function webPushNotification({ to, from, action }) {
  const subs = await data.subscriptions.findAll(to);
  debug(`${subs.length} subscription for ${to}`);
  if (subs.length < 1) return;

  let message = {
    action, from, to,
  };
  if (action === 'mail') {
    const waitingMessages = await data.messages.getUserMessages(to);

    message = {
      ...message,
      unread: waitingMessages.length,
    };
  }

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
    const result = AWSXRay.captureAsyncFunc('WebPush', webpush.sendNotification(
      subscription,
      JSON.stringify(message),
      {
        topic: action,
        vapidDetails: {
          subject: `mailto:${config.get('vapid.subject')}`,
          publicKey: config.get('vapid.publicKey'),
          privateKey: secret.PRIVATE_VAPID_KEY,
        },
      },
    ).catch((err) => {
      if (err.name === 'WebPushError' && err.statusCode === 410) {
        debug('Unsubscribing');
        return data.subscriptions.delete(to, endpoint);
      }
      throw err;
    }));
    promises.push(result);
  });

  debug('send notifications');
  await Promise.all(promises);
  debug('all sent');
}

const handler = async (event) => {
  debug('event received');
  try {
    const { to, from, action } = JSON.parse(event.Records[0].Sns.Message);

    const isNotified = await wssNotification({ to, from, action });

    if (!isNotified) {
      await webPushNotification({ to, from, action });
    }
  } catch (err) {
    console.log('handler error', err);
    throw err;
  }
};
const main = async () => {
  data = new Data(config.get('dynamo'));
  data.init();

  secret = new Secret(['PRIVATE_VAPID_KEY']);
  await secret.getTracedSecretValue();

  return { handler };
};

module.exports = main();
