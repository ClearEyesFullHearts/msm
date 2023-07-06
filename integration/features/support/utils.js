const crypto = require('crypto');

async function asyncGenerateKeyPair(modulo) {
  return new Promise((resolve, reject) => {
    crypto.generateKeyPair('rsa', {
      modulusLength: modulo,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    }, (err, publicKey, privateKey) => {
      if (err) return reject(err);
      return resolve({ publicKey, privateKey });
    });
  });
}
function formatPK(publicKey) {
  const pemHeader = '-----BEGIN PUBLIC KEY-----';
  const pemFooter = '-----END PUBLIC KEY-----';
  const trimmedPK = publicKey.replace(/\n/g, '');
  const pemContents = trimmedPK.substring(pemHeader.length, trimmedPK.length - pemFooter.length);

  return `${pemHeader}\n${pemContents}\n${pemFooter}`;
}

class Util {
  static async generateKeyPair() {
    const doubleKeyPair = await Promise.all([
      asyncGenerateKeyPair(4096),
      asyncGenerateKeyPair(1024),
    ]);

    const [
      { publicKey, privateKey },
      { publicKey: sigPK, privateKey: sigSK },
    ] = doubleKeyPair;

    return {
      public: {
        encrypt: formatPK(publicKey),
        signature: formatPK(sigPK),
      },
      private: {
        encrypt: privateKey,
        signature: sigSK,
      },
    };
  }

  static generateFalseKeyPair() {
    const pemHeader = '-----BEGIN PUBLIC KEY-----';
    const pemFooter = '-----END PUBLIC KEY-----';
    const falseEPK = Util.getRandomString(552, true);// 4 * (n / 3) = length
    const falseSPK = Util.getRandomString(162, true);// n = (length * 3) / 4

    return {
      public: {
        encrypt: `${pemHeader}\n${falseEPK}\n${pemFooter}`,
        signature: `${pemHeader}\n${falseSPK}\n${pemFooter}`,
      },
    };
  }

  static resolve(pem, challenge) {
    const { token, passphrase, iv } = challenge;

    const key = crypto.privateDecrypt({
      key: pem,
      oaepHash: 'sha256',
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    }, Buffer.from(passphrase, 'base64'));

    const algorithm = 'aes-256-gcm';
    const cipher = Buffer.from(token, 'base64');
    const authTag = cipher.subarray(cipher.length - 16);
    const crypted = cipher.subarray(0, cipher.length - 16);

    const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(authTag);
    const decData = Buffer.concat([decipher.update(crypted), decipher.final()]);

    return JSON.parse(decData.toString());
  }

  // static sign() {
  //   const bufData = Buffer.from(data);
  //   return crypto.verify('rsa-sha256', bufData, {
  //     key,
  //     padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
  //     saltLength: 32,
  //   }, bufSig);
  // }

  static getPathValue(obj, path) {
    if (path[0] !== '$') throw new Error('Wrong path format');
    const props = path.split('.');
    let val = obj;
    for (let i = 1; i < props.length; i += 1) {
      if (!val[props[i]]) return undefined;
      val = val[props[i]];
    }
    return val;
  }

  static getRandomString(length, base64 = false) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
    let str = '';
    for (let i = 0; i < length; i += 1) {
      str += chars[Math.floor(Math.random() * chars.length)];
    }
    if (base64) {
      return Buffer.from(str).toString('base64');
    }
    return str;
  }
}

module.exports = Util;
