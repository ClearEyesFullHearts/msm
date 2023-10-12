class CryptoHelper {
  static get SEPARATOR() { return '\n----- SIGNATURE -----\n'; }

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

    return {
      PK,
      SK,
    };
  }

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
    const publicKeyBuff = await window.crypto.subtle.importKey('jwk', jwk,
      {
        name: 'RSA-OAEP',
        modulusLength: 4096,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true, ['encrypt']);
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
    const publicKeyBuff = await window.crypto.subtle.importKey('jwk', jwk,
      {
        name: 'RSA-PSS',
        modulusLength: 1024,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true, ['verify']);
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

  async symmetricEncrypt(txt, password = false) {
    const iv = window.crypto.getRandomValues(new Uint8Array(16));
    let arrPass;
    if (password) {
      const base64Hash = await this.hash(password);
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
        iv,
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

  uuidV4() {
    return window.crypto.randomUUID();
  }
}

export default CryptoHelper;
