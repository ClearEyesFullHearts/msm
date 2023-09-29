import logger from 'debug';
import config from 'config';
import AWSXRay from 'aws-xray-sdk';
import Data from '@shared/dynamolayer';
import Secret from '@shared/secrets';
import Validator from '@shared/validator';

const debug = logger('validation:app');

const data = new Data(config.get('dynamo'));
data.init();

const secret = new Secret(['KEY_WALLET_SECRET']);
await secret.getSecretValue();

const validator = new Validator({
  network: config.get('ether.network'),
  apiKey: config.get('ether.api'),
  privateKey: secret.KEY_WALLET_SECRET,
  address: config.get('ether.contract'),
});

export const handler = async (event) => {
  const { name } = JSON.parse(event.Records[0].Sns.Message);

  debug('Auto User Validation', name);
  const user = await data.users.findByName(name);

  if (!user) {
    debug('Unknown user, no validation');
    return;
  }

  if (user.validation !== 'NO_VALIDATION') {
    debug('No need to validate');
    return;
  }

  await data.users.updateValidation(user.username, 'IS_VALIDATING');

  try {
    debug('Validating user', name);

    let isValid = false;
    try {
      isValid = await new Promise((resolve, reject) => {
        AWSXRay.captureAsyncFunc('EtherValidation', (subsegment) => {
          validator.validateUser({ userId: user.id, signature: user.hash })
            .then((result) => {
              resolve(result);
            }).catch((exc) => {
              reject(exc);
            })
            .finally(() => {
              subsegment.close();
            });
        });
      });
    } catch (err) {
      debug(`User ${user.username} is not validated, an async error happened`, err);
      await data.users.updateValidation(user.username, 'NO_VALIDATION');
    }

    if (isValid) {
      await data.users.updateValidation(user.username, 'VALIDATED');
      debug(`User ${user.username} is validated`);
    } else {
      await data.users.updateValidation(user.username, 'NO_VALIDATION');
      debug(`User ${user.username} is not validated`);
    }
  } catch (err) {
    debug(`User ${user.username} is not validated, an error happened`, err);
    await data.users.updateValidation(user.username, 'NO_VALIDATION');
  }
};
