const crypto = require('crypto');
const SymmetricRatchet = require('./symmetricRatchet');

class DoubleRatchet {
  #ecdh;

  #keyChain = [];

  #sending = new SymmetricRatchet();

  #receiving = new SymmetricRatchet();

  #memories = {};

  #previousCounter = -1;

  #ratchetSendingChain(otherPublicKey) {
    const pk = Buffer.from(otherPublicKey, 'base64');

    const counter = this.#keyChain.length - 1;
    const lastKey = this.#keyChain[counter];

    this.#ecdh = crypto.createECDH('secp521r1');
    this.#ecdh.generateKeys();
    const dhOut = this.#ecdh.computeSecret(pk);

    const info = Buffer.from(`double-ratchet-${counter}`);

    const hkdfUIntArray = crypto.hkdfSync(
      'sha512',
      dhOut,
      lastKey,
      info,
      64,
    );
    const bufferKeys = Buffer.from(hkdfUIntArray);
    const RK = bufferKeys.subarray(0, 32);
    const CKs = bufferKeys.subarray(32);

    this.#keyChain.push(RK);
    lastKey.fill();
    this.#keyChain[counter] = false;

    this.#previousCounter = this.#sending.counter;

    this.#sending.clear();
    const sr = new SymmetricRatchet();
    sr.initKey(CKs);
    this.#sending = sr;
  }

  #ratchetReceivingChain(otherPublicKey, PN) {
    const pk = Buffer.from(otherPublicKey, 'base64');

    const counter = this.#keyChain.length - 1;
    const lastKey = this.#keyChain[counter];

    const dhOut = this.#ecdh.computeSecret(pk);

    const info = Buffer.from(`double-ratchet-${counter}`);

    const hkdfUIntArray = crypto.hkdfSync(
      'sha512',
      dhOut,
      lastKey,
      info,
      64,
    );
    const bufferKeys = Buffer.from(hkdfUIntArray);
    const RK = bufferKeys.subarray(0, 32);
    const CKr = bufferKeys.subarray(32);

    this.#keyChain.push(RK);
    lastKey.fill();
    this.#keyChain[counter] = false;

    if (PN <= this.#receiving.counter) {
      this.#receiving.counter = PN;
    }

    const sr = new SymmetricRatchet();
    sr.initKey(CKr);
    this.#receiving = sr;
    this.#memories[otherPublicKey] = sr;
  }

  constructor(name) {
    this.name = name;
    this.#ecdh = crypto.createECDH('secp521r1');
    this.#ecdh.generateKeys();
  }

  get publicKey() {
    return this.#ecdh.getPublicKey('base64');
  }

  init(rootKey, otherPublicKey = false) {
    let sharedSecret = rootKey;
    if (!Buffer.isBuffer(rootKey)) {
      sharedSecret = Buffer.from(rootKey, 'base64');
    }
    this.#keyChain.push(sharedSecret);

    if (otherPublicKey) {
      this.#ratchetSendingChain(otherPublicKey);
    }
  }

  send(message) {
    return {
      publicKey: this.publicKey,
      body: {
        ...this.#sending.send(message),
        PN: this.#previousCounter,
      },
    };
  }

  receive(otherPublicKey, message) {
    if (this.#memories[otherPublicKey]) {
      return this.#memories[otherPublicKey].receive(message);
    }

    const { PN } = message;

    this.#ratchetReceivingChain(otherPublicKey, PN);
    this.#ratchetSendingChain(otherPublicKey);

    return this.#receiving.receive(message);
  }
}

module.exports = DoubleRatchet;
