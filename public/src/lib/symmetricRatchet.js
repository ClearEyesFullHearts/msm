import Helper from './encodingHelper';

const MAX_SKIPPED_MESSAGES = 5;

class SymmetricRatchet {
  #chainStarted = false;

  #keyChain = [];

  #sharedChain = [];

  async #ratchet() {
    const counter = this.#keyChain.length - 1;
    const lastKey = this.#keyChain[counter];
    const salt = new ArrayBuffer(64);

    const info = Helper.clearTextToBuffer(`session-${counter}`);

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
      512,
    );

    const key = bufferKeys.slice(0, 32);
    const shared = bufferKeys.slice(32);

    this.#keyChain.push(key);
    this.#sharedChain.push(shared);

    const bufView = new Uint8Array(lastKey);
    bufView.fill(0);
    this.#keyChain[counter] = false;
  }

  get active() {
    return this.#chainStarted;
  }

  get counter() {
    return this.#keyChain.length - 1;
  }

  async setCounter(val) {
    if (val - this.#sharedChain.length > 5) {
      throw new Error('Too many missed messages');
    }
    while (this.#sharedChain.length <= val) {
      await this.#ratchet();
    }
  }

  initKey(rootKey) {
    let sharedSecret = rootKey;
    if (!(rootKey instanceof ArrayBuffer)) {
      sharedSecret = Helper.base64ToBuffer(rootKey);
    }

    this.#keyChain.push(sharedSecret);
    this.#chainStarted = true;
  }

  async send(message) {
    if (!this.#chainStarted) {
      throw new Error('Chain is not initialized');
    }

    const counter = this.#sharedChain.length;
    await this.#ratchet();

    if (!this.#sharedChain[counter]) {
      throw new Error('You cannot reuse a key');
    }

    const bufferKey = this.#sharedChain[counter];

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
    const bufferTxt = Helper.clearTextToBuffer(message);
    const bufferCypher = await window.crypto.subtle.encrypt({
      name: 'AES-GCM',
      iv: bufferIv,
      tagLength: 128,
    }, key, bufferTxt);

    const bufView = new Uint8Array(bufferKey);
    bufView.fill(0);
    this.#sharedChain[counter] = false;

    return {
      counter,
      cypher: Helper.bufferToBase64(bufferCypher),
      iv: Helper.bufferToBase64(bufferIv),
    };
  }

  async receive({ cypher, iv, counter }) {
    if (!this.#chainStarted) {
      throw new Error('Chain is not initialized');
    }

    if (counter - this.#sharedChain.length > MAX_SKIPPED_MESSAGES) {
      throw new Error('Too many missed messages');
    }

    while (this.#sharedChain.length <= counter) {
      await this.#ratchet();
    }

    if (!this.#sharedChain[counter]) {
      throw new Error('You cannot reuse a key');
    }

    const bufferKey = this.#sharedChain[counter];
    const bufferIv = Helper.base64ToBuffer(iv);
    const bufferCypher = Helper.base64ToBuffer(cypher);

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
    this.#sharedChain[counter] = false;

    return Helper.bufferToClearText(bufferText);
  }

  clear() {
    this.#keyChain = this.#keyChain.map((key) => {
      if (key) {
        const view = new Uint8Array(key);
        view.fill(0);
      }
      return false;
    });
    this.#sharedChain = this.#sharedChain.map((key) => {
      if (key) {
        const view = new Uint8Array(key);
        view.fill(0);
      }
      return false;
    });
    this.#chainStarted = false;
  }
}
export default SymmetricRatchet;
