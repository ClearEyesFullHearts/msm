const crypto = require('crypto');
const AWSXRay = require('@shared/tracing');

const ALGORITHM = 'aes-256-gcm';
const PASS_SIZE = 32;
const IV_SIZE = 16;
const PK_START = '-----BEGIN PUBLIC KEY-----';
const PK_END = '-----END PUBLIC KEY-----';

class Encryption {
  static hybrid(txt, key) {
    const pass = crypto.randomBytes(PASS_SIZE);
    const iv = crypto.randomBytes(IV_SIZE);

    const cipher = crypto.createCipheriv(ALGORITHM, pass, iv);
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

  static verifySignature(key, data, signature) {
    const bufData = Buffer.from(data);
    const bufSig = Buffer.from(signature, 'base64');
    return crypto.verify('rsa-sha256', bufData, {
      key,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: 32,
    }, bufSig);
  }

  static hash(txt) {
    const hash = crypto.createHash('sha256');
    hash.update(txt);
    return hash.digest();
  }

  static isValidPemPk(str) {
    if (str.substring(0, PK_START.length) !== PK_START) return false;
    if (str.substring(str.length - PK_END.length) !== PK_END) return false;

    const properKey = str.substring(PK_START.length + 1, str.length - PK_END.length - 1);
    if (!this.isBase64(properKey)) return false;

    return true;
  }

  static isBase64(str) {
    return Buffer.from(str, 'base64').toString('base64') === str;
  }

  static encryptMessage(target, title, text) {
    const { username, key } = target;

    const cypheredTitle = crypto.publicEncrypt({
      key,
      oaepHash: 'sha256',
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    }, title);

    const cypheredText = crypto.publicEncrypt({
      key,
      oaepHash: 'sha256',
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    }, text);

    return {
      to: username,
      title: cypheredTitle.toString('base64'),
      content: cypheredText.toString('base64'),
    };
  }
}

module.exports = AWSXRay.captureClass(Encryption, { ignoreList: ['isValidPemPk', 'isBase64'] });
