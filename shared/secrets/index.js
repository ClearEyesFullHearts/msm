const debug = require('debug')('secrets:starter');
const AWSXRay = require('@shared/tracing');
const {
  GetSecretValueCommand,
  SecretsManagerClient,
} = require('@aws-sdk/client-secrets-manager');

class Secret {
  constructor(choice = ['*']) {
    this.choice = choice;
    this.client = new SecretsManagerClient();
    this.KEY_AUTH_SIGN = 'supersecret';
    this.PRIVATE_VAPID_KEY = 'N/A';
    this.KEY_WALLET_SECRET = 'N/A';
    this.loaded = false;
  }

  async getTracedSecretValue() {
    await AWSXRay.segmentAsyncFunc('GetMSMSecret', this.getSecretValue());
  }

  async getSecretValue() {
    this.loaded = true;
    let secrets;
    try {
      const response = await this.client.send(
        new GetSecretValueCommand({
          SecretId: process.env.SECRET_LOCATION,
        }),
      );
      const { SecretString } = response;
      secrets = JSON.parse(SecretString);
    } catch (err) {
      debug('No secret value');
      return;
    }

    Object.keys(secrets).forEach((k) => {
      if (this.choice[0] === '*' || this.choice.includes(k)) {
        debug(`${k} key is added to the secret`);
        this[k] = secrets[k];
      }
    });
  }
}

module.exports = Secret;
