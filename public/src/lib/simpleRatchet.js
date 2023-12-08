function clearTextToBuffer(txt) {
  const buf = new ArrayBuffer(txt.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = txt.length; i < strLen; i += 1) {
    bufView[i] = txt.charCodeAt(i);
  }
  return buf;
}

function bufferToClearText(buffer) {
  return String.fromCharCode.apply(null, new Uint8Array(buffer));
}

function base64ToBuffer(b64Txt) {
  const str = window.atob(b64Txt); // decode base64
  return clearTextToBuffer(str);
}

function bufferToBase64(buffer) {
  const str = bufferToClearText(buffer);
  return window.btoa(str); // encode base64
}

class SimpleRatchet {
  async #ratchet() {
    const counter = this.keyChain.length - 1;
    const lastKey = this.keyChain[counter];
    const salt = new ArrayBuffer(96);

    const info = clearTextToBuffer(`session-${counter}`);

    const sharedSecretKey = await window.crypto.subtle.importKey(
      'raw',
      lastKey,
      { name: 'HKDF' },
      false,
      ['deriveBits'],
    );

    const bufferKeys = await window.crypto.subtle.deriveBits(
      {
        name: 'HKDF',
        hash: 'SHA-512',
        salt,
        info,
      },
      sharedSecretKey,
      768,
    );

    const key = bufferKeys.slice(0, 32);
    const mine = this.iamInitiator ? bufferKeys.slice(32, 64) : bufferKeys.slice(64);
    const copy = this.iamInitiator ? bufferKeys.slice(64) : bufferKeys.slice(32, 64);

    this.keyChain.push(key);
    this.myChain.push(mine);
    this.copyChain.push(copy);

    const bufView = new Uint8Array(lastKey);
    bufView.fill(0);
    this.keyChain[counter] = false;
  }

  constructor() {
    this.myPublicKey = null;
    this.myPrivateKey = null;
    this.chainStarted = false;

    this.keyChain = [];
    this.myChain = [];
    this.copyChain = [];
    this.iamInitiator = false;
    this.myCounter = -1;
  }

  get publicKey() {
    if (!this.myPublicKey) {
      throw new Error('DH is not started');
    }

    return this.myPublicKey;
  }

  async initECDH() {
    const { publicKey, privateKey } = await window.crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-521',
      },
      true,
      ['deriveBits'],
    );

    this.myPrivateKey = privateKey;
    const bufferPublicKey = await window.crypto.subtle.exportKey('raw', publicKey);
    this.myPublicKey = bufferToBase64(bufferPublicKey);
  }

  async initChains(iStart, otherPublicKey) {
    this.iamInitiator = iStart;

    const otherKeyBuffer = base64ToBuffer(otherPublicKey);
    const otherKeyObject = await window.crypto.subtle.importKey(
      'raw',
      otherKeyBuffer,
      {
        name: 'ECDH',
        namedCurve: 'P-521',
      },
      false,
      [],
    );

    const sharedSecret = await window.crypto.subtle.deriveBits(
      {
        name: 'ECDH',
        namedCurve: 'P-521',
        public: otherKeyObject,
      },
      this.myPrivateKey,
      528,
    );

    this.keyChain.push(sharedSecret);
    this.chainStarted = true;
    this.myPrivateKey = null;
    delete this.myPrivateKey;
  }

  async send(message) {
    if (!this.chainStarted) {
      throw new Error('Chain is not initialized');
    }

    this.myCounter += 1;
    while (this.myChain.length <= this.myCounter) {
      await this.#ratchet();
    }

    if (!this.myChain[this.myCounter]) {
      throw new Error('You cannot reuse a key');
    }

    const bufferKey = this.myChain[this.myCounter];

    const key = await window.crypto.subtle.importKey(
      'raw',
      bufferKey,
      {
        name: 'AES-GCM',
      },
      false,
      ['encrypt'],
    );

    const bufferIv = window.crypto.getRandomValues(new Uint8Array(16));
    const bufferTxt = clearTextToBuffer(message);
    const bufferCypher = await window.crypto.subtle.encrypt({
      name: 'AES-GCM',
      iv: bufferIv,
      tagLength: 128,
    }, key, bufferTxt);

    const bufView = new Uint8Array(bufferKey);
    bufView.fill(0);
    this.myChain[this.myCounter] = false;

    return {
      counter: this.myCounter,
      cypher: bufferToBase64(bufferCypher),
      iv: bufferToBase64(bufferIv),
    };
  }

  async receive({ cypher, iv, counter }) {
    if (!this.chainStarted) {
      throw new Error('Chain is not initialized');
    }

    while (this.copyChain.length <= counter) {
      await this.#ratchet();
    }

    if (!this.copyChain[counter]) {
      throw new Error('You cannot reuse a key');
    }

    const bufferKey = this.copyChain[counter];
    const bufferIv = base64ToBuffer(iv);
    const bufferCypher = base64ToBuffer(cypher);

    const importedKey = await window.crypto.subtle.importKey(
      'raw',
      bufferKey,
      {
        name: 'AES-GCM',
      },
      false,
      ['decrypt'],
    );

    const bufferText = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: bufferIv,
        tagLength: 128,
      },
      importedKey,
      bufferCypher,
    );

    const bufView = new Uint8Array(bufferKey);
    bufView.fill(0);
    this.copyChain[counter] = false;

    return bufferToClearText(bufferText);
  }
}
export default SimpleRatchet;
