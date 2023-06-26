const {
  generateKeyPair,
} = require('crypto');

async function asyncGenerateKeyPair(modulo) {
  return new Promise((resolve, reject) => {
    generateKeyPair('rsa', {
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
