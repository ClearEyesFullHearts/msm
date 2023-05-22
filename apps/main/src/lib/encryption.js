const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const PASS_SIZE = 32;
const IV_SIZE = 16;

class Encryption {
  static hybrid(txt, key) {
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
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
    }, pass);

    return {
      token: cypheredText.toString('base64'),
      passphrase: cypheredPass.toString('base64'),
      iv: iv.toString('base64'),
    };
  }
}

module.exports = Encryption;
