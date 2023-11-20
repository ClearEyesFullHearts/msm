const crypto = require('crypto');
const AWSXRay = require('@shared/tracing');

const ALGORITHM = 'aes-256-gcm';
const PASS_SIZE = 32;
const IV_SIZE = 16;
const PK_START = '-----BEGIN PUBLIC KEY-----';
const PK_END = '-----END PUBLIC KEY-----';
const base64regExp = /^[A-Za-z0-9+/]*(=|==)?$/;

class Encryption {
  static simpleEncrypt(txt, keyBuffer) {
    const iv = crypto.randomBytes(IV_SIZE);
    const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
    const encrypted = cipher.update(txt);
    const result = Buffer.concat([encrypted, cipher.final(), cipher.getAuthTag()]);

    return {
      value: result.toString('base64'),
      vector: iv.toString('base64'),
    };
  }

  static simpleDecrypt({ value, vector }, keyBuffer) {
    const ivBuffer = Buffer.from(vector, 'base64');
    const cipher = Buffer.from(value, 'base64');
    const authTag = cipher.subarray(cipher.length - 16);
    const crypted = cipher.subarray(0, cipher.length - 16);
    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, ivBuffer);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(crypted), decipher.final()]);
  }

  static generateECDSAKeys() {
    return crypto.generateKeyPairSync('ec', {
      namedCurve: 'secp521r1',
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });
  }

  static hybrid(txt, key) {
    const pass = crypto.randomBytes(PASS_SIZE);
    const iv = crypto.randomBytes(IV_SIZE);

    const cipher = crypto.createCipheriv(ALGORITHM, pass, iv);
    const cypheredText = Buffer.concat([cipher.update(txt), cipher.final(), cipher.getAuthTag()]);

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

  static verifyECDSASignature(key, dataB64, signature) {
    const bufData = Buffer.from(dataB64, 'base64');
    const bufSig = Buffer.from(signature, 'base64');
    return crypto.verify(
      'sha512',
      bufData,
      {
        key,
        dsaEncoding: 'ieee-p1363',
      },
      bufSig,
    );
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

  static isBase64(b) {
    return b.length % 4 === 0 && base64regExp.test(b);
  }

  static encryptVault(key, {
    token,
    salt,
    iv,
    pass,
    kill,
  }) {
    const keyBuffer = Buffer.from(key, 'base64');

    return {
      token: this.simpleEncrypt(token, keyBuffer),
      salt: this.simpleEncrypt(salt, keyBuffer),
      iv: this.simpleEncrypt(iv, keyBuffer),
      pass: this.simpleEncrypt(pass, keyBuffer),
      kill: this.simpleEncrypt(kill, keyBuffer),
    };
  }

  static decryptVault(key, {
    token,
    salt,
    iv,
    pass,
    kill,
  }) {
    const keyBuffer = Buffer.from(key, 'base64');

    return {
      token: token ? this.simpleDecrypt(token, keyBuffer).toString() : undefined,
      salt: salt ? this.simpleDecrypt(salt, keyBuffer).toString() : undefined,
      iv: iv ? this.simpleDecrypt(iv, keyBuffer).toString() : undefined,
      pass: pass ? this.simpleDecrypt(pass, keyBuffer).toString() : undefined,
      kill: kill ? this.simpleDecrypt(kill, keyBuffer).toString() : undefined,
    };
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

module.exports = AWSXRay.captureClass(Encryption, { ignoreList: ['isValidPemPk', 'isBase64', 'simpleEncrypt', 'simpleDecrypt'] });
