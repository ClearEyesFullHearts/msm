const crypto = require('crypto');
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
    this.KEY_AUTH_SIGN = 'xgcNGlHiShHnhM5qlyQXJLhJokbGWzHatLBwOgcTiE4=';
    this.KEY_VAULT_ENCRYPT = 'oN/Yguy3Y1Y2O4zEWdxzib2rxt8aMRmGWu+p8DXsh1M=';
    this.PRIVATE_VAPID_KEY = 'N/A';
    this.KEY_WALLET_SECRET = 'N/A';
    this.loaded = false;
  }

  getKeyAuthSign(salt = false) {
    let rs = crypto.randomBytes(16);
    if (salt) rs = Buffer.from(salt, 'base64');

    const constant = Buffer.alloc(32);

    const dek = crypto.hkdfSync(
      'sha512',
      Buffer.from(this.KEY_AUTH_SIGN, 'base64'),
      constant,
      Buffer.concat([rs, Buffer.from('KEY_AUTH_SIGN')]),
      32,
    );

    return {
      salt: rs.toString('base64'),
      key: Buffer.from(dek).toString('base64'),
    };
  }

  getKeyVaultEncrypt(info, salt = false) {
    let rs = crypto.randomBytes(16);
    if (salt) rs = Buffer.from(salt, 'base64');

    const constant = Buffer.alloc(32);

    const dek = crypto.hkdfSync(
      'sha512',
      Buffer.from(this.KEY_VAULT_ENCRYPT, 'base64'),
      constant,
      Buffer.concat([rs, Buffer.from(`KEY_VAULT_ENCRYPT_${info}`)]),
      32,
    );

    return {
      salt: rs.toString('base64'),
      key: Buffer.from(dek).toString('base64'),
    };
  }

  async getTracedSecretValue() {
    await AWSXRay.captureInitializationFunc('GetMSMSecret', this.getSecretValue());
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
