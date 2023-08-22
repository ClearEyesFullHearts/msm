require('dotenv').config();
const debug = require('debug')('secrets:starter');
const {
  GetSecretValueCommand,
  SecretsManagerClient,
} = require('@aws-sdk/client-secrets-manager');

debug('.env is mounted');

const getSecretValue = async () => {
  let client;
  let secrets;
  try {
    client = new SecretsManagerClient();
  } catch (err) {
    debug('No secret client');
    return;
  }
  try {
    const response = await client.send(
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
    debug(`${k} key is added to the environment`);
    process.env[k] = secrets[k];
  });
};

module.exports = getSecretValue;
