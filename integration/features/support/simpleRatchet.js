const crypto = require('crypto');

class SimpleRatchet {
  #myPublicKey = null;

  #ecdh = null;

  #chainStarted = false;

  #keyChain = [];

  #myChain = [];

  #copyChain = [];

  #iamInitiator = false;

  #myCounter = -1;

  #ratchet() {
    const counter = this.#keyChain.length - 1;
    const lastKey = this.#keyChain[counter];
    const salt = Buffer.alloc(96);

    const info = Buffer.from(`session-${counter}`);

    const hkdfUIntArray = crypto.hkdfSync(
      'sha512',
      lastKey,
      salt,
      info,
      96,
    );

    const bufferKeys = Buffer.from(hkdfUIntArray);
    const key = bufferKeys.subarray(0, 32);
    const mine = this.#iamInitiator ? bufferKeys.subarray(32, 64) : bufferKeys.subarray(64);
    const copy = this.#iamInitiator ? bufferKeys.subarray(64) : bufferKeys.subarray(32, 64);

    this.#keyChain.push(key);
    this.#myChain.push(mine);
    this.#copyChain.push(copy);

    lastKey.fill();
    this.#keyChain[counter] = false;
  }

  constructor() {
    this.#ecdh = crypto.createECDH('secp521r1');
    this.#ecdh.generateKeys();

    this.#myPublicKey = this.#ecdh.getPublicKey('base64');
  }

  get publicKey() {
    return this.#myPublicKey;
  }

  initChains(iStart, otherPublicKey) {
    this.#iamInitiator = iStart;
    const pkBuffer = Buffer.from(otherPublicKey, 'base64');

    const sharedSecret = this.#ecdh.computeSecret(pkBuffer);

    this.#keyChain.push(sharedSecret);
    this.#chainStarted = true;
    this.#ecdh = null;
  }

  send(message) {
    if (!this.#chainStarted) {
      throw new Error('Chain is not initialized');
    }

    this.#myCounter += 1;
    while (this.#myChain.length <= this.#myCounter) {
      this.#ratchet();
    }

    if (!this.#myChain[this.#myCounter]) {
      throw new Error('You cannot reuse a key');
    }

    const bufferKey = this.#myChain[this.#myCounter];

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-gcm',
      bufferKey,
      iv,
      { authTagLength: 16 },
    );

    const bufferCypher = Buffer.concat([
      cipher.update(message),
      cipher.final(),
      cipher.getAuthTag(),
    ]);

    bufferKey.fill();
    this.#myChain[this.#myCounter] = false;

    return {
      counter: this.#myCounter,
      cypher: bufferCypher.toString('base64'),
      iv: iv.toString('base64'),
    };
  }

  receive({ cypher, iv, counter }) {
    if (!this.#chainStarted) {
      throw new Error('Chain is not initialized');
    }

    while (this.#copyChain.length <= counter) {
      this.#ratchet();
    }

    if (!this.#copyChain[counter]) {
      throw new Error('You cannot reuse a key');
    }

    const bufferKey = this.#copyChain[counter];
    const bufferIv = Buffer.from(iv, 'base64');
    const bufferCypher = Buffer.from(cypher, 'base64');

    const authTag = bufferCypher.subarray(bufferCypher.length - 16);
    const crypted = bufferCypher.subarray(0, bufferCypher.length - 16);

    const decipher = crypto.createDecipheriv('aes-256-gcm', bufferKey, bufferIv);
    decipher.setAuthTag(authTag);
    const bufferText = Buffer.concat([decipher.update(crypted), decipher.final()]);

    bufferKey.fill();
    this.#copyChain[counter] = false;

    return bufferText.toString();
  }
}

module.exports = SimpleRatchet;
