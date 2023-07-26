const fs = require('fs');
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const PASS_SIZE = 32;
const IV_SIZE = 16;

function hybrid(txt, key) {
  const pass = crypto.randomBytes(PASS_SIZE);
  const iv = crypto.randomBytes(IV_SIZE);

  const cipher = crypto.createCipheriv(
    ALGORITHM, pass, iv,
  );
  const encrypted = cipher.update(txt);
  const cypheredText = Buffer.concat([encrypted, cipher.final(), cipher.getAuthTag()]);

  const cypheredPass = crypto.publicEncrypt({
    key,
    oaepHash: 'sha256',
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
  }, pass);

  return {
    token: cypheredText.toString('base64'),
    passphrase: cypheredPass.toString('base64'),
    iv: iv.toString('base64'),
  };
}
module.exports = (id) => {
  const pem = fs.readFileSync(`${__dirname}/user${id}/private.pem`).toString();
  const priv = pem.split('\n----- SIGNATURE -----\n');
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

  const contactList = [
    { id: 1, at: 'test1', verified: false },
    {
      id: 2, at: 'test2', verified: true, hash: 'X3uo1ZRbB9zYh9qiR4cXHHkKF8/9tI4CSwg2y867cV4=',
    },
    {
      id: 3,
      at: 'test3',
      verified: true,
      hash: 'L1USvP+ihWZKX+QyuZX4TsvsjdzeQ/IbKClu5doHy2U=',
      signature: 'rN5XWpQmJdmJdDLfMo7iPQhENwNz7U99+875+G/FevYXkg/9JcuU2fO12EsG5oUs5rSYu444Wq6Uh0s3fAW3JJo1Kq2ewqGgH02UcCr1qbcRpy/mEhSmDsaaMPT4trEpeLBD0TiQIn0RwlY8lwrxJ7NhBvOHI+Zhvzi3RK4LuCM=',
    },
    { id: 4, at: 'test4', verified: false },
  ];

  const contacts = hybrid(JSON.stringify(contactList), pub[0]);
  const vaultItem = hybrid(pem, pub[0]);

  const user = {
    id,
    username: `user${id}`,
    searchTerms: ['USE', 'USER', `USER${id}`, 'SER', `SER${id}`, `ER${id}`],
    key: pub[0],
    signature: pub[1],
    hash: signedHash,
    lastActivity: Date.now(),
    vault: {
      token: vaultItem.token,
      iv: vaultItem.iv,
    },
    contacts,
    size: 5,
    private: {
      key: priv[0],
      signature: priv[1],
      passphrase: vaultItem.passphrase,
    },
  };
  return user;
};
