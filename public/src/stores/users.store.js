/* eslint-disable import/prefer-default-export */
import { defineStore } from 'pinia'; import {
  useAuthStore,
} from '@/stores';
// temporary
// import TimeLogger from '@/lib/timeLogger';

import CryptoHelper from '@/lib/cryptoHelper';
import { fetchWrapper } from '@/helpers';
import Config from '@/lib/config';

// const mylogger = new TimeLogger('user store');

const baseUrl = Config.API_URL;
const mycrypto = new CryptoHelper();

export const useUsersStore = defineStore({
  id: 'users',
  state: () => ({
    users: {},
    user: {},
    newUsername: null,
  }),
  actions: {
    async createUser(user) {
      const {
        username,
      } = user;
      const { PK, SK } = await mycrypto.generateKeyPair();
      const { PK: signPK, SK: signSK } = await mycrypto.generateSignatureKeyPair();

      const clearHash = await mycrypto.hash(`${PK}\n${signPK}`);
      const signedHash = await mycrypto.sign(signSK, clearHash, true);

      const send = {
        at: username,
        key: PK,
        signature: signPK,
        hash: signedHash,
      };
      await fetchWrapper.post(`${baseUrl}/users`, send);

      return { ESK: SK, SSK: signSK };
    },
    async createUserWithVault(user) {
      // mylogger.start();
      const {
        username,
        passphrase,
      } = user;

      const { PK, SK } = await mycrypto.generateKeyPair();
      // mylogger.logTime('encryption keys generated');
      const { PK: signPK, SK: signSK } = await mycrypto.generateSignatureKeyPair();
      // mylogger.logTime('signature keys generated');

      const clearHash = await mycrypto.hash(`${PK}\n${signPK}`);
      const signedHash = await mycrypto.sign(signSK, clearHash, true);
      // mylogger.logTime('public hash signed');

      const {
        vault,
        attic,
      } = await this.calculateVault(SK, signSK, passphrase);
      // mylogger.logTime('vault calculated');

      const data = {
        at: username,
        key: PK,
        signature: signPK,
        hash: signedHash,
        vault,
        attic,
      };

      await fetchWrapper.post(`${baseUrl}/users`, data);
      // mylogger.logTime('user data posted');

      return {
        ESK: SK, SSK: signSK,
      };
    },
    async getAll(search) {
      if (search.length < 3) return;
      this.users = { loading: true };
      try {
        this.users = await fetchWrapper.get(`${baseUrl}/search?user=${search}`);
      } catch (error) {
        this.users = { error };
      }
    },
    async returnOne(at) {
      const user = await fetchWrapper.get(`${baseUrl}/user/${at}`);
      return user;
    },
    async setVault(passphrase, killSwitch) {
      const authStore = useAuthStore();
      const {
        pem,
        signing,
        user: {
          user: {
            username,
          },
        },
      } = authStore;

      const data = await this.calculateVault(username, pem, signing, passphrase, killSwitch);

      await fetchWrapper.put(`${baseUrl}/vault`, data);

      authStore.hasVault = true;
    },
    async emptyVault() {
      const authStore = useAuthStore();
      await fetchWrapper.delete(`${baseUrl}/vault`);

      authStore.hasVault = false;
    },
    async destroy(at) {
      await fetchWrapper.delete(`${baseUrl}/user/${at}`);
    },
    async calculateVault(username, SK, signSK, passphrase, killSwitch) {
      let kill = killSwitch;
      if (!killSwitch || !killSwitch.length || killSwitch.length < 8) {
        const randKill = window.crypto.getRandomValues(new Uint8Array(32));
        kill = mycrypto.ArBuffToBase64(randKill);
      }

      // Hash the password and killswitch (for encryption & comparison)
      const rs1 = window.crypto.getRandomValues(new Uint8Array(64));
      const rs2 = window.crypto.getRandomValues(new Uint8Array(64));
      const results = await Promise.all([
        mycrypto.PBKDF2Hash(passphrase, rs1),
        mycrypto.PBKDF2Hash(passphrase, rs2),
        mycrypto.PBKDF2Hash(kill, rs2),
      ]);
      const [{ key: hp1 }, { key: hp2 }, { key: hks }] = results;

      // sign the comparison hashes
      const signatures = await Promise.all([
        mycrypto.sign(signSK, hp2, true),
        mycrypto.sign(signSK, hks, true),
      ]);
      const [sup, suk] = signatures;

      // encrypt the private key with the encryption hash
      const sk = CryptoHelper.getSKContent(SK, signSK);
      const iv1 = window.crypto.getRandomValues(new Uint8Array(16));
      const { token: esk } = await mycrypto.PBKDF2Encrypt(hp1, sk, iv1);

      // vault values in clear text
      const data = {
        salt: mycrypto.ArBuffToBase64(rs1),
        iv: mycrypto.ArBuffToBase64(iv1),
        token: esk,
        pass: sup,
        kill: suk,
      };

      // create ECDH keys
      const { cpk, csk } = await mycrypto.generateECDHKeyPair();

      // ask the server for an attic
      const ecdhHeader = {
        'X-msm-Cpk': cpk,
      };
      const { key: spk } = await fetchWrapper.get(`${baseUrl}/attic/${username}`, false, ecdhHeader);

      // computes the shared secret
      const tss = await mycrypto.computeSharedSecret({ csk, spk });

      // derive an encryption key from our shared secret
      const { key: dek, salt: rs3 } = await mycrypto.deriveKey(tss, `${username}-set-vault`);

      // encrypt vault data
      const {
        iv: iv2,
        token: vault,
      } = await mycrypto.symmetricEncrypt(JSON.stringify(data), dek, false);

      return {
        sessionSalt: rs3,
        iv: iv2,
        passSalt: mycrypto.ArBuffToBase64(rs2),
        vault,
      };
    },
    /*
    async calculateVault(SK, signSK, passphrase, killSwitch) {
      let kill = killSwitch;
      if (!killSwitch || !killSwitch.length || killSwitch.length < 8) {
        const randKill = window.crypto.getRandomValues(new Uint8Array(32));
        kill = mycrypto.ArBuffToBase64(randKill);
      }

      const iv1 = window.crypto.getRandomValues(new Uint8Array(16));
      const iv2 = window.crypto.getRandomValues(new Uint8Array(16));
      const rs1 = window.crypto.getRandomValues(new Uint8Array(64));
      const rs2 = window.crypto.getRandomValues(new Uint8Array(64));
      // mylogger.logTime('randoms generated');

      const results = await Promise.all([
        mycrypto.PBKDF2Hash(passphrase, rs1),
        mycrypto.PBKDF2Hash(passphrase, rs2),
        mycrypto.PBKDF2Hash(kill, rs2),
      ]);

      const [{ key: hp1 }, { key: hp2 }, { key: hks }] = results;
      // mylogger.logTime('3 PBKDF2 hash done');

      const sk = CryptoHelper.getSKContent(SK, signSK);
      const rp = mycrypto.ArBuffToBase64(window.crypto.getRandomValues(new Uint8Array(64)));

      const encrypts = await Promise.all([
        mycrypto.PBKDF2Encrypt(hp1, sk, iv1),
        mycrypto.PBKDF2Encrypt(hp2, rp, iv2),
        mycrypto.PBKDF2Encrypt(hks, rp, iv2),
      ]);

      const [{ token: esk }, { token: eup }, { token: euk }] = encrypts;
      // mylogger.logTime('3 encryption done');

      const pemContents = await mycrypto.generateECDSAKey();
      // mylogger.logTime('signing key generated');

      return {
        vault: {
          token: esk,
          salt: mycrypto.ArBuffToBase64(rs1),
          iv: mycrypto.ArBuffToBase64(iv1),
          pass: eup,
          kill: euk,
        },
        attic: {
          salt: mycrypto.ArBuffToBase64(rs2),
          iv: mycrypto.ArBuffToBase64(iv2),
          proof: rp,
          key: pemContents,
        },
      };
    },
    */
  },
});
