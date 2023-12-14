import Helper from './encodingHelper';
import SymmetricRatchet from './symmetricRatchet';

const MAX_ACTIVE_CHAINS = 5;
class DoubleRatchet {
  #myPublicKey;

  #myPrivateKey;

  #keyChain = [];

  #sending = new SymmetricRatchet();

  #receiving = new SymmetricRatchet();

  #memories = {};

  #actives = [];

  #previousCounter = -1;

  static async #computeDerivationKey(pkBuffer, skKey) {
    const otherKeyObject = await window.crypto.subtle.importKey(
      'raw',
      pkBuffer,
      {
        name: 'ECDH',
        namedCurve: 'P-256',
      },
      false,
      [],
    );

    const dhComputed = await window.crypto.subtle.deriveBits(
      {
        name: 'ECDH',
        namedCurve: 'P-256',
        public: otherKeyObject,
      },
      skKey,
      256,
    );

    const dhForDerivation = await window.crypto.subtle.importKey(
      'raw',
      dhComputed,
      { name: 'HKDF' },
      false,
      ['deriveBits'],
    );

    return dhForDerivation;
  }

  async #resetEcdh() {
    const { publicKey, privateKey } = await window.crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-256',
      },
      true,
      ['deriveBits'],
    );

    this.#myPrivateKey = privateKey;
    const bufferPublicKey = await window.crypto.subtle.exportKey('raw', publicKey);
    this.#myPublicKey = Helper.bufferToBase64(bufferPublicKey);
  }

  async #ratchetSendingChain(otherPublicKey) {
    const otherKeyBuffer = Helper.base64ToBuffer(otherPublicKey);

    const counter = this.#keyChain.length - 1;
    const lastKey = this.#keyChain[counter];

    await this.#resetEcdh();

    const dhOut = await DoubleRatchet.#computeDerivationKey(otherKeyBuffer, this.#myPrivateKey);

    const info = Helper.clearTextToBuffer(`double-ratchet-${counter}`);

    const bufferKeys = await window.crypto.subtle.deriveBits(
      {
        name: 'HKDF',
        hash: 'SHA-512',
        salt: lastKey,
        info,
      },
      dhOut,
      512,
    );
    const RK = bufferKeys.slice(0, 32);
    const CKs = bufferKeys.slice(32);

    this.#keyChain.push(RK);
    const bufView = new Uint8Array(lastKey);
    bufView.fill(0);
    this.#keyChain[counter] = false;

    this.#previousCounter = this.#sending.counter;

    this.#sending.clear();
    const sr = new SymmetricRatchet();
    sr.initKey(CKs);
    this.#sending = sr;
  }

  async #ratchetReceivingChain(otherPublicKey, PN) {
    const otherKeyBuffer = Helper.base64ToBuffer(otherPublicKey);

    const counter = this.#keyChain.length - 1;
    const lastKey = this.#keyChain[counter];

    const dhOut = await DoubleRatchet.#computeDerivationKey(otherKeyBuffer, this.#myPrivateKey);

    const info = Helper.clearTextToBuffer(`double-ratchet-${counter}`);

    const bufferKeys = await window.crypto.subtle.deriveBits(
      {
        name: 'HKDF',
        hash: 'SHA-512',
        salt: lastKey,
        info,
      },
      dhOut,
      512,
    );

    const RK = bufferKeys.slice(0, 32);
    const CKr = bufferKeys.slice(32);

    this.#keyChain.push(RK);
    const bufView = new Uint8Array(lastKey);
    bufView.fill(0);
    this.#keyChain[counter] = false;

    if (this.#receiving.counter <= PN) {
      await this.#receiving.setCounter(PN);
    }

    const sr = new SymmetricRatchet();
    sr.initKey(CKr);
    this.#receiving = sr;
    this.#memories[otherPublicKey] = sr;
    this.#actives.push(sr);
    if (this.#actives.length > MAX_ACTIVE_CHAINS) {
      const tooOld = this.#actives.shift();
      tooOld.clear();
    }
  }

  get publicKey() {
    if (!this.#myPublicKey) {
      throw new Error('DH is not started');
    }

    return this.#myPublicKey;
  }

  async initECDH() {
    if (this.#myPublicKey) {
      throw new Error('ECDH already initialized');
    }
    await this.#resetEcdh();
  }

  async init(rootKey, otherPublicKey = false) {
    let sharedSecret = rootKey;
    if (!ArrayBuffer.isView(rootKey)) {
      sharedSecret = Helper.base64ToBuffer(rootKey);
    }
    this.#keyChain.push(sharedSecret);

    if (otherPublicKey) {
      await this.#ratchetSendingChain(otherPublicKey);
    }
  }

  async send(message, aad = false) {
    let AAD = aad;
    if (aad) {
      AAD = Helper.clearTextToBuffer(String(aad));
    }
    const encryption = await this.#sending.send(message, AAD);
    return {
      publicKey: this.publicKey,
      body: {
        ...encryption,
        PN: this.#previousCounter,
      },
    };
  }

  async receive(otherPublicKey, message, aad = false) {
    let AAD = aad;
    if (aad) {
      AAD = Helper.clearTextToBuffer(String(aad));
    }
    if (this.#memories[otherPublicKey]) {
      if (this.#memories[otherPublicKey].active) {
        const result = await this.#memories[otherPublicKey].receive(message, AAD);
        return result;
      }
      throw new Error('Receiving chain too old');
    }

    const { PN } = message;

    await this.#ratchetReceivingChain(otherPublicKey, PN);
    await this.#ratchetSendingChain(otherPublicKey);

    const result = await this.#receiving.receive(message, AAD);
    return result;
  }
}

export default DoubleRatchet;
