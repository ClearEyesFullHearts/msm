const crypto = require('crypto');

const MAX_SKIPPED_MESSAGES = 5;
class SymmetricRatchet {
  #chainStarted = false;

  #keyChain = [];

  #sharedChain = [];

  #ratchet() {
    const counter = this.#keyChain.length - 1;
    const lastKey = this.#keyChain[counter];
    const salt = Buffer.alloc(64);

    const info = Buffer.from(`session-${counter}`);

    const hkdfUIntArray = crypto.hkdfSync(
      'sha512',
      lastKey,
      salt,
      info,
      64,
    );

    const bufferKeys = Buffer.from(hkdfUIntArray);
    const key = bufferKeys.subarray(0, 32);
    const shared = bufferKeys.subarray(32);

    this.#keyChain.push(key);
    this.#sharedChain.push(shared);

    lastKey.fill();
    this.#keyChain[counter] = false;
  }

  get active() {
    return this.#chainStarted;
  }

  get counter() {
    return this.#keyChain.length - 1;
  }

  set counter(val) {
    if (val - this.#sharedChain.length > 5) {
      throw new Error('Too many missed messages');
    }
    while (this.#sharedChain.length <= val) {
      this.#ratchet();
    }
  }

  initKey(rootKey) {
    let sharedSecret = rootKey;
    if (!Buffer.isBuffer(rootKey)) {
      sharedSecret = Buffer.from(rootKey, 'base64');
    }

    this.#keyChain.push(sharedSecret);
    this.#chainStarted = true;
  }

  send(message, aad) {
    if (!this.#chainStarted) {
      throw new Error('Chain is not initialized');
    }

    const counter = this.#sharedChain.length;
    this.#ratchet();

    if (!this.#sharedChain[counter]) {
      throw new Error('You cannot reuse a key');
    }

    const bufferKey = this.#sharedChain[counter];

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-gcm',
      bufferKey,
      iv,
      { authTagLength: 16 },
    );

    if (aad) cipher.setAAD(aad);

    const bufferCypher = Buffer.concat([
      cipher.update(message),
      cipher.final(),
      cipher.getAuthTag(),
    ]);

    bufferKey.fill();
    this.#sharedChain[counter] = false;

    return {
      counter,
      cypher: bufferCypher.toString('base64'),
      iv: iv.toString('base64'),
    };
  }

  receive({ cypher, iv, counter }, aad) {
    if (!this.#chainStarted) {
      throw new Error('Chain is not initialized');
    }

    if (counter - this.#sharedChain.length > MAX_SKIPPED_MESSAGES) {
      throw new Error('Too many missed messages');
    }

    while (this.#sharedChain.length <= counter) {
      this.#ratchet();
    }

    if (!this.#sharedChain[counter]) {
      throw new Error('You cannot reuse a key');
    }

    const bufferKey = this.#sharedChain[counter];
    const bufferIv = Buffer.from(iv, 'base64');
    const bufferCypher = Buffer.from(cypher, 'base64');

    const authTag = bufferCypher.subarray(bufferCypher.length - 16);
    const crypted = bufferCypher.subarray(0, bufferCypher.length - 16);

    const decipher = crypto.createDecipheriv('aes-256-gcm', bufferKey, bufferIv);
    decipher.setAuthTag(authTag);
    if (aad) decipher.setAAD(aad);
    const bufferText = Buffer.concat([
      decipher.update(crypted),
      decipher.final(),
    ]);

    bufferKey.fill();
    this.#sharedChain[counter] = false;

    return bufferText.toString();
  }

  clear() {
    this.#keyChain = this.#keyChain.map((key) => {
      if (key) {
        key.fill();
      }
      return false;
    });
    this.#sharedChain = this.#sharedChain.map((key) => {
      if (key) {
        key.fill();
      }
      return false;
    });
    this.#chainStarted = false;
  }
}

module.exports = SymmetricRatchet;
