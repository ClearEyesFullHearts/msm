const crypto = require('crypto');
const dynamoose = require('dynamoose');
const config = require('config');
const fs = require('fs');

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
function formatSK(privateKey) {
  const pemHeader = '-----BEGIN PRIVATE KEY-----';
  const pemFooter = '-----END PRIVATE KEY-----';

  const trimmedPK = privateKey.replace(/\n/g, '');
  const pemContents = trimmedPK.substring(pemHeader.length, trimmedPK.length - pemFooter.length);

  return `${pemHeader}\n${pemContents}\n${pemFooter}`;
}

const TABLE_NAME = config.get('dynamo.table');
const ALGORITHM = 'aes-256-gcm';
const PASS_SIZE = 32;
const IV_SIZE = 16;
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

    const formattedPK = formatPK(publicKey);
    const formattedSPK = formatPK(sigPK);
    const hash = crypto.createHash('sha256');
    hash.update(`${formattedPK}\n${formattedSPK}`);
    const pkHash = hash.digest();

    const signedHash = Util.sign(sigSK, pkHash);

    return {
      public: {
        encrypt: formattedPK,
        signature: formattedSPK,
        signedHash,
      },
      private: {
        encrypt: formatSK(privateKey),
        signature: formatSK(sigSK),
      },
    };
  }

  static generateFalseKeyPair() {
    const pemHeader = '-----BEGIN PUBLIC KEY-----';
    const pemFooter = '-----END PUBLIC KEY-----';
    const falseEPK = Util.getRandomString(552, true);// 4 * (n / 3) = length
    const falseSPK = Util.getRandomString(162, true);// n = (length * 3) / 4
    const falseHash = Util.getRandomString(129, true);

    return {
      public: {
        encrypt: `${pemHeader}\n${falseEPK}\n${pemFooter}`,
        signature: `${pemHeader}\n${falseSPK}\n${pemFooter}`,
        signedHash: falseHash,
      },
    };
  }

  static extractPublicKey(pem) {
    const pubKeyObject = crypto.createPublicKey({
      key: pem,
      format: 'pem',
    });

    return pubKeyObject.export({
      format: 'pem',
      type: 'spki',
    });
  }

  static encrypt(pem, data) {
    const crypted = crypto.publicEncrypt({
      key: pem,
      oaepHash: 'sha256',
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    }, Buffer.from(data));

    return Buffer.from(crypted).toString('base64');
  }

  static decrypt(pem, base64str, inPlainText = true) {
    const pass = crypto.privateDecrypt({
      key: pem,
      oaepHash: 'sha256',
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    }, Buffer.from(base64str, 'base64'));
    if (inPlainText) {
      return pass.toString();
    }
    return pass;
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

  static challenge(txt, key) {
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

  static sign(key, data) {
    const bufData = Buffer.from(data);
    const signature = crypto.sign('rsa-sha256', bufData, {
      key,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: 32,
    });

    return Buffer.from(signature).toString('base64');
  }

  static symmetricEncrypt(txt, passphrase) {
    const hash = crypto.createHash('sha256');
    hash.update(passphrase);
    const pass = hash.digest();

    const iv = crypto.randomBytes(IV_SIZE);

    const cipher = crypto.createCipheriv(
      ALGORITHM, pass, iv,
    );
    const encrypted = cipher.update(txt);
    const cypheredText = Buffer.concat([encrypted, cipher.final(), cipher.getAuthTag()]);

    return {
      token: cypheredText.toString('base64'),
      iv: iv.toString('base64'),
    };
  }

  static symmetricDecrypt(item, passphrase) {
    const hash = crypto.createHash('sha256');
    hash.update(passphrase);
    const key = hash.digest();

    const { iv, token } = item;

    const algorithm = 'aes-256-gcm';
    const cipher = Buffer.from(token, 'base64');
    const authTag = cipher.subarray(cipher.length - 16);
    const crypted = cipher.subarray(0, cipher.length - 16);

    const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(authTag);
    const decData = Buffer.concat([decipher.update(crypted), decipher.final()]);

    return decData.toString();
  }

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

  static isPK(str, length) {
    const PK_START = '-----BEGIN PUBLIC KEY-----';
    const PK_END = '-----END PUBLIC KEY-----';

    if (str.length !== length) return false;

    if (str.substring(0, PK_START.length) !== PK_START) return false;
    if (str.substring(str.length - PK_END.length) !== PK_END) return false;

    const properKey = str.substring(PK_START.length + 1, str.length - PK_END.length - 1);
    if (!Buffer.from(properKey, 'base64').toString('base64') === properKey) return false;

    return true;
  }

  static getEverythingModel() {
    const Everything = dynamoose.model('Everything', new dynamoose.Schema({
      pk: {
        type: String,
        hashKey: true,
      },
      sk: {
        type: String,
        rangeKey: true,
      },
      id: {
        type: String,
      },
      key: {
        type: String,
      },
      signature: {
        type: String,
      },
      hash: {
        type: String,
      },
      vault: {
        type: Object,
        schema: {
          token: {
            type: String,
          },
          iv: {
            type: String,
          },
        },
      },
      switch: {
        type: Object,
        schema: {
          token: {
            type: String,
          },
          iv: {
            type: String,
          },
        },
      },
      contacts: {
        type: Object,
        schema: {
          token: {
            type: String,
          },
          passphrase: {
            type: String,
          },
          iv: {
            type: String,
          },
        },
      },
      lastActivity: {
        type: Number,
      },
      validation: {
        type: String,
      },
      msgCount: {
        type: Number,
      },
      expirationDate: {
        type: Number,
      },
      hasBeenRead: {
        type: Number,
      },
      header: {
        type: Object,
        schema: {
          token: {
            type: String,
          },
          passphrase: {
            type: String,
          },
          iv: {
            type: String,
          },
        },
      },
      full: {
        type: Object,
        schema: {
          token: {
            type: String,
          },
          passphrase: {
            type: String,
          },
          iv: {
            type: String,
          },
        },
      },
      size: {
        type: Number,
      },
      at: {
        type: String,
      },
      stage: {
        type: String,
      },
      domainName: {
        type: String,
      },
      groupName: {
        type: String,
      },
      isAdmin: {
        type: Number,
      },
      auth: {
        type: String,
      },
      p256dh: {
        type: String,
      },
    }), { tableName: TABLE_NAME, create: config.get('dynamo.createTable') });
    const ddb = new dynamoose.aws.ddb.DynamoDB({});

    // Set DynamoDB instance to the Dynamoose DDB instance
    dynamoose.aws.ddb.set(ddb);
    if (config.get('dynamo.local')) dynamoose.aws.ddb.local(config.get('dynamo.local.url'));

    return Everything;
  }

  static async backupTable() {
    const Everything = Util.getEverythingModel();

    const result = await Everything.scan().exec();

    fs.writeFileSync('./data/msm/dynamodb.json', JSON.stringify(result));
  }

  static async emptyTable() {
    const Keys = dynamoose.model('Keys', new dynamoose.Schema({
      pk: {
        type: String,
        hashKey: true,
      },
      sk: {
        type: String,
        rangeKey: true,
      },
    }), { tableName: TABLE_NAME, create: config.get('dynamo.createTable') });
    const ddb = new dynamoose.aws.ddb.DynamoDB({});

    // Set DynamoDB instance to the Dynamoose DDB instance
    dynamoose.aws.ddb.set(ddb);
    if (config.get('dynamo.local')) dynamoose.aws.ddb.local(config.get('dynamo.local.url'));

    const result = await Keys.scan().exec();

    const size = 24;
    for (let i = 0; i < result.length; i += size) {
      const objects = result.slice(i, i + size);
      await Keys.batchDelete(objects);
    }
  }

  static async restoreTable() {
    const dynamoTable = JSON.parse(fs.readFileSync('./data/msm/dynamodb.json'));
    const Everything = Util.getEverythingModel();

    const size = 24;
    for (let i = 0; i < dynamoTable.length; i += size) {
      const objects = dynamoTable.slice(i, i + size);
      await Everything.batchPut(objects);
    }
  }

  static async setValueInDB(sk, pk, prop, val) {
    const Everything = Util.getEverythingModel();
    await Everything.update(
      { pk, sk },
      {
        $SET: { [prop]: val },
      },
    );
  }

  static async getValueInDB({ sk, pk }) {
    const Everything = Util.getEverythingModel();
    const e = await Everything.get({ sk, pk });
    return e;
  }

  static async recordInDB(record) {
    const Everything = Util.getEverythingModel();
    const { pk, sk } = record;
    const e = await Everything.get({ sk, pk });
    Object.keys(record).forEach((k) => {
      e[k] = record[k];
    });
    delete e.expirationDate;
    await e.save();
  }

  static async removeGroup(groupId) {
    const Keys = dynamoose.model('Keys', new dynamoose.Schema({
      pk: {
        type: String,
        hashKey: true,
      },
      sk: {
        type: String,
        rangeKey: true,
      },
    }), { tableName: TABLE_NAME, create: config.get('dynamo.createTable') });
    const ddb = new dynamoose.aws.ddb.DynamoDB({});

    // Set DynamoDB instance to the Dynamoose DDB instance
    dynamoose.aws.ddb.set(ddb);
    if (config.get('dynamo.local')) dynamoose.aws.ddb.local(config.get('dynamo.local.url'));

    const result = await Keys.query('pk').eq(groupId).exec();
    if (result.length && result.length > 0) {
      await Keys.batchDelete(result);
    }
  }

  static roundTimeToDays(epoch, addDays = 0) {
    const daysInMs = (24 * 60 * 60000);
    const dayMs = Math.floor(epoch / daysInMs) * daysInMs;
    return dayMs + (addDays * daysInMs);
  }
}

module.exports = Util;
