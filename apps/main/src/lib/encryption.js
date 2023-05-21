const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

class Encryption {
  static hybrid(txt, key) {
    const pass = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(
      ALGORITHM, pass, iv,
    );
    const encrypted = cipher.update(txt);
    const cypheredText = Buffer.concat([encrypted, cipher.final()]);

    const cypheredPass = crypto.publicEncrypt(key, pass);

    return {
      token: cypheredText.toString('base64'),
      passphrase: cypheredPass.toString('base64'),
      iv: iv.toString('base64'),
    };
  }
}

module.exports = Encryption;
