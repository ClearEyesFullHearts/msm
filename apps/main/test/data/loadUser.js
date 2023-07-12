const fs = require('fs');
const crypto = require('crypto');

module.exports = (id) => {
  const priv = fs.readFileSync(`${__dirname}/user${id}/private.pem`).toString().split('\n----- SIGNATURE -----\n');
  const pub = fs.readFileSync(`${__dirname}/user${id}/public.pem`).toString().split('\n----- SIGNATURE -----\n');

  const hash = crypto.createHash('sha256');
  hash.update(`${pub[0]}\n${pub[1]}`);
  const pkHash = hash.digest();

  const signature = crypto.sign('rsa-sha256', pkHash, {
    key: priv[1],
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: 32,
  });

  const signedHash = Buffer.from(signature).toString('base64');

  const user = {
    id,
    username: `user${id}`,
    searchTerms: ['USE', 'USER', `USER${id}`, 'SER', `SER${id}`, `ER${id}`],
    key: pub[0],
    signature: pub[1],
    hash: signedHash,
    lastActivity: Date.now(),
    security: 'safe',
    size: 5,
    private: {
      key: priv[0],
      signature: priv[1],
    },
  };
  return user;
};
