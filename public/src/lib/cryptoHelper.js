class CryptoHelper {
  static get SEPARATOR() { return '\n----- SIGNATURE -----\n'; }

  static get PBDKF_HASH() { return 'SHA-512'; }

  static get PBDKF_ITERATIONS() { return 600000; }

  static getSKContent(ESK, SSK) {
    const pemHeader = '-----BEGIN PRIVATE KEY-----';
    const pemFooter = '-----END PRIVATE KEY-----';
    let trimmedSK = ESK.replace(/\n/g, '');
    const eskContent = trimmedSK
      .substring(pemHeader.length, trimmedSK.length - pemFooter.length);
    trimmedSK = SSK.replace(/\n/g, '');
    const sskContent = trimmedSK
      .substring(pemHeader.length, trimmedSK.length - pemFooter.length);

    return `${eskContent}${sskContent}`;
  }

  static setContentAsSK(txt) {
    return {
      key: `-----BEGIN PRIVATE KEY-----\n${txt.substring(0, 3168)}\n-----END PRIVATE KEY-----`,
      signKey: `-----BEGIN PRIVATE KEY-----\n${txt.substring(3168)}\n-----END PRIVATE KEY-----`,
    };
  }

  constructor() {
    this.clearTextToArBuff = (txt) => {
      const buf = new ArrayBuffer(txt.length);
      const bufView = new Uint8Array(buf);
      for (let i = 0, strLen = txt.length; i < strLen; i += 1) {
        bufView[i] = txt.charCodeAt(i);
      }
      return buf;
    };
    this.base64ToArBuff = (base64EncodedKey) => {
      const str = window.atob(base64EncodedKey); // decode base64
      return this.clearTextToArBuff(str);
    };
    this.ArBuffToBase64 = (arBuff) => {
      const str = String.fromCharCode.apply(null, new Uint8Array(arBuff));
      return window.btoa(str);
    };
    this.clearTextToHEX = (txt) => txt.split('')
      .map((c) => c.charCodeAt(0).toString(16).padStart(2, '0'))
      .join('');

    this.importCryptoKey = async (pem, format, keyType, extractable = false) => {
      const usage = keyType === 'PUBLIC' ? ['encrypt'] : ['decrypt'];
      // fetch the part of the PEM string between header and footer
      const pemHeader = `-----BEGIN ${keyType} KEY-----`;
      const pemFooter = `-----END ${keyType} KEY-----`;
      const pemContents = pem.substring(pemHeader.length, pem.length - pemFooter.length - 1);

      const binaryDer = this.base64ToArBuff(pemContents);

      const imoprtedKey = await window.crypto.subtle.importKey(
        format,
        binaryDer,
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256',
        },
        extractable,
        usage,
      );

      return imoprtedKey;
    };
    this.exportCryptoKey = async (key, format, keyType) => {
      const exported = await window.crypto.subtle.exportKey(format, key);
      const exportedAsBase64 = this.ArBuffToBase64(exported);

      const pemExported = `-----BEGIN ${keyType} KEY-----\n${exportedAsBase64}\n-----END ${keyType} KEY-----`;

      return pemExported;
    };
    this.importSigningKey = async (pem, format, keyType, extractable = false) => {
      const usage = keyType === 'PUBLIC' ? ['verify'] : ['sign'];
      // fetch the part of the PEM string between header and footer
      const pemHeader = `-----BEGIN ${keyType} KEY-----`;
      const pemFooter = `-----END ${keyType} KEY-----`;
      const pemContents = pem.substring(pemHeader.length, pem.length - pemFooter.length - 1);

      const binaryDer = this.base64ToArBuff(pemContents);

      const importedKey = await window.crypto.subtle.importKey(
        format,
        binaryDer,
        {
          name: 'RSA-PSS',
          hash: 'SHA-256',
        },
        extractable,
        usage,
      );

      return importedKey;
    };
  }

  async generateKeyPair() {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 4096,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['encrypt', 'decrypt'],
    );

    const PK = await this.exportCryptoKey(keyPair.publicKey, 'spki', 'PUBLIC');
    const SK = await this.exportCryptoKey(keyPair.privateKey, 'pkcs8', 'PRIVATE');

    if (SK.length !== 3222) {
      // console.log('wrong encryption key format, try again', SK.length);
      const res = await this.generateKeyPair();
      return res;
    }

    return {
      PK,
      SK,
    };
  }

  async generateSignatureKeyPair() {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'RSA-PSS',
        modulusLength: 1024,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['sign', 'verify'],
    );

    const PK = await this.exportCryptoKey(keyPair.publicKey, 'spki', 'PUBLIC');
    const SK = await this.exportCryptoKey(keyPair.privateKey, 'pkcs8', 'PRIVATE');

    if (SK.length !== 902) {
      // console.log('wrong signature key format, try again', SK.length);
      const res = await this.generateSignatureKeyPair();
      return res;
    }

    return {
      PK,
      SK,
    };
  }

  async generateECDHKeyPair() {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-256',
      },
      true,
      ['deriveKey', 'deriveBits'],
    );

    const PK = await window.crypto.subtle.exportKey('raw', keyPair.publicKey);
    const SK = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

    return {
      csk: this.ArBuffToBase64(SK),
      cpk: this.ArBuffToBase64(PK),
    };
  }

  async computeSharedSecret({ csk, spk }) {
    // import server public key
    const binaryPK = this.base64ToArBuff(spk);
    const PK = await window.crypto.subtle.importKey(
      'raw',
      binaryPK,
      {
        name: 'ECDH',
        namedCurve: 'P-256',
      },
      false,
      [],
    );

    // import client secret key
    const binarySK = this.base64ToArBuff(csk);
    const SK = await window.crypto.subtle.importKey(
      'pkcs8',
      binarySK,
      {
        name: 'ECDH',
        namedCurve: 'P-256',
      },
      false,
      ['deriveKey', 'deriveBits'],
    );

    // get derived shared secret
    const sharedSecret = await window.crypto.subtle.deriveBits(
      {
        name: 'ECDH',
        namedCurve: 'P-256',
        public: PK,
      },
      SK,
      256,
    );

    // import for HKDF derivation
    const TSS = await window.crypto.subtle.importKey(
      'raw',
      sharedSecret,
      { name: 'HKDF' },
      false,
      ['deriveKey', 'deriveBits'],
    );
    // const TEMP = await window.crypto.subtle.exportKey('raw', TSS);
    // console.log('shared', this.ArBuffToBase64(TEMP));

    return TSS;
  }

  async deriveKey(sharedSecret, info, salt) {
    let mySalt = window.crypto.getRandomValues(new Uint8Array(64));
    if (salt) {
      mySalt = this.base64ToArBuff(salt);
    }
    const myInfo = this.clearTextToArBuff(info);
    const derivedSecret = await window.crypto.subtle.deriveBits(
      {
        name: 'HKDF',
        hash: 'SHA-512',
        salt: mySalt,
        info: myInfo,
      },
      sharedSecret,
      256,
    );

    return {
      key: this.ArBuffToBase64(derivedSecret),
      salt: this.ArBuffToBase64(mySalt),
    };
  }

  /*
  async generateECDSAKey() {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'ECDSA',
        namedCurve: 'P-521',
      },
      true,
      ['sign', 'verify'],
    );
    const exported = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
    const pemContent = this.ArBuffToBase64(exported);

    return pemContent;
  }
  */

  async getPublicKey(pem) {
    const privateKey = await this.importCryptoKey(pem, 'pkcs8', 'PRIVATE', true);
    // export private key to JWK
    const jwk = await window.crypto.subtle.exportKey('jwk', privateKey);

    // remove private data from JWK
    delete jwk.d;
    delete jwk.dp;
    delete jwk.dq;
    delete jwk.q;
    delete jwk.qi;
    jwk.key_ops = ['encrypt'];

    // import public key
    const publicKeyBuff = await window.crypto.subtle.importKey(
      'jwk',
      jwk,
      {
        name: 'RSA-OAEP',
        modulusLength: 4096,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['encrypt'],
    );
    const publicKey = await this.exportCryptoKey(publicKeyBuff, 'spki', 'PUBLIC');
    return publicKey;
  }

  async getSigningPublicKey(pem) {
    const privateKey = await this.importSigningKey(pem, 'pkcs8', 'PRIVATE', true);
    // export private key to JWK
    const jwk = await window.crypto.subtle.exportKey('jwk', privateKey);

    // remove private data from JWK
    delete jwk.d;
    delete jwk.dp;
    delete jwk.dq;
    delete jwk.q;
    delete jwk.qi;
    jwk.key_ops = ['verify'];

    // import public key
    const publicKeyBuff = await window.crypto.subtle.importKey(
      'jwk',
      jwk,
      {
        name: 'RSA-PSS',
        modulusLength: 1024,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['verify'],
    );
    const publicKey = await this.exportCryptoKey(publicKeyBuff, 'spki', 'PUBLIC');
    return publicKey;
  }

  async challenge(pem, dataStr) {
    const { passphrase, iv, token } = await this.symmetricEncrypt(dataStr);
    const clearPass = window.atob(passphrase);
    const pkPem = await this.getPublicKey(pem);
    const cryptedPass = await this.publicEncrypt(pkPem, clearPass);

    return {
      iv,
      passphrase: cryptedPass,
      token,
    };
  }

  async resolve(pem, { token, passphrase, iv }) {
    const clearPassBuff = await this.privateDecrypt(pem, passphrase);
    const authBuff = await this.symmetricDecrypt(clearPassBuff, iv, token);
    const dec = new TextDecoder();
    return dec.decode(authBuff);
  }

  async publicEncrypt(pem, plaintext) {
    const importedKey = await this.importCryptoKey(pem, 'spki', 'PUBLIC');
    const arrTxt = this.clearTextToArBuff(plaintext);

    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'RSA-OAEP' },
      importedKey,
      arrTxt,
    );

    return this.ArBuffToBase64(encrypted);
  }

  async privateDecrypt(pem, cryptedText) {
    const importedKey = await this.importCryptoKey(pem, 'pkcs8', 'PRIVATE');
    const cypherTxt = this.base64ToArBuff(cryptedText);

    const decripted = await window.crypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      importedKey,
      cypherTxt,
    );

    return decripted;
  }

  async symmetricEncrypt(txt, password = false, hashIt = true) {
    const iv = window.crypto.getRandomValues(new Uint8Array(16));
    let arrPass;
    if (password) {
      let base64Hash = password;
      if (hashIt) base64Hash = await this.hash(password);
      arrPass = this.base64ToArBuff(base64Hash);
    } else {
      arrPass = window.crypto.getRandomValues(new Uint8Array(32));
    }
    const arrTxt = this.clearTextToArBuff(txt);
    const key = await window.crypto.subtle.importKey(
      'raw',
      arrPass,
      {
        name: 'AES-GCM',
      },
      false,
      ['encrypt'],
    );

    const ctBuffer = await window.crypto.subtle.encrypt({
      name: 'AES-GCM',
      iv,
    }, key, arrTxt);

    return {
      iv: this.ArBuffToBase64(iv),
      passphrase: this.ArBuffToBase64(arrPass),
      token: this.ArBuffToBase64(ctBuffer),
    };
  }

  async symmetricDecrypt(pass, iv, cryptedText) {
    const arrIV = this.base64ToArBuff(iv);
    let arrPass = pass;
    if (Object.prototype.toString.call(pass) === '[object String]') {
      arrPass = this.base64ToArBuff(pass);
    }
    const arrCryptedText = this.base64ToArBuff(cryptedText);

    const importedKey = await window.crypto.subtle.importKey(
      'raw',
      arrPass,
      {
        name: 'AES-GCM',
      },
      false,
      ['encrypt', 'decrypt'],
    );

    const decripted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: arrIV },
      importedKey,
      arrCryptedText,
    );
    return decripted;
  }

  async sign(signingKey, dataStr, isBase64 = false) {
    const privateKey = await this.importSigningKey(signingKey, 'pkcs8', 'PRIVATE');
    let encoded;
    if (isBase64) {
      encoded = this.base64ToArBuff(dataStr);
    } else {
      encoded = this.clearTextToArBuff(dataStr);
    }

    const signature = await window.crypto.subtle.sign(
      {
        name: 'RSA-PSS',
        saltLength: 32,
      },
      privateKey,
      encoded,
    );

    return this.ArBuffToBase64(signature);
  }

  /*
  async signWithECDSA(pemContent, dataStr) {
    const binaryDer = this.base64ToArBuff(pemContent);

    const importedKey = await window.crypto.subtle.importKey(
      'pkcs8',
      binaryDer,
      {
        name: 'ECDSA',
        namedCurve: 'P-521',
      },
      false,
      ['sign'],
    );
    const encoded = this.base64ToArBuff(dataStr);
    const signature = await window.crypto.subtle.sign(
      {
        name: 'ECDSA',
        hash: 'SHA-512',
      },
      importedKey,
      encoded,
    );

    return this.ArBuffToBase64(signature);
  }
  */

  async verify(verifyKey, dataStr, signature, isBase64 = false) {
    const publicKey = await this.importSigningKey(verifyKey, 'spki', 'PUBLIC');
    let toCheck = dataStr;
    if (isBase64) {
      toCheck = window.atob(dataStr);
    }
    const encoded = this.clearTextToArBuff(toCheck);
    const paraph = this.base64ToArBuff(signature);

    const result = await window.crypto.subtle.verify(
      {
        name: 'RSA-PSS',
        saltLength: 32,
      },
      publicKey,
      paraph,
      encoded,
    );

    return result;
  }

  async hash(dataStr) {
    const arrTxt = this.clearTextToArBuff(dataStr);

    const digest = await window.crypto.subtle.digest({
      name: 'SHA-256',
    }, arrTxt);

    return this.ArBuffToBase64(digest);
  }

  async PBKDF2Hash(simpleKey, salt) {
    const passwordBuffer = this.clearTextToArBuff(simpleKey);
    const importedKey = await window.crypto.subtle.importKey('raw', passwordBuffer, 'PBKDF2', false, ['deriveBits']);

    const params = {
      name: 'PBKDF2', hash: CryptoHelper.PBDKF_HASH, salt, iterations: CryptoHelper.PBDKF_ITERATIONS,
    };
    const derivation = await window.crypto.subtle.deriveBits(params, importedKey, 256);

    return {
      key: this.ArBuffToBase64(derivation),
    };
  }

  async PBKDF2Encrypt(b64Key, txt, iv) {
    const derivation = this.base64ToArBuff(b64Key);
    const importedEncryptionKey = await window.crypto.subtle.importKey('raw', derivation, { name: 'AES-GCM', iv }, true, ['encrypt', 'decrypt']);

    const data = this.clearTextToArBuff(txt);
    const ctBuffer = await window.crypto.subtle.encrypt({
      name: 'AES-GCM',
      iv,
    }, importedEncryptionKey, data);

    return {
      token: this.ArBuffToBase64(ctBuffer),
    };
  }

  getRandomBase64Password() {
    const arrPass = window.crypto.getRandomValues(new Uint8Array(32));
    return this.ArBuffToBase64(arrPass);
  }

  uuidV4() {
    return window.crypto.randomUUID();
  }
}

export default CryptoHelper;
