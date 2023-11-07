/* eslint-disable import/prefer-default-export */
import { defineStore } from 'pinia';

import CryptoHelper from '@/lib/cryptoHelper';
import FileHelper from '@/lib/fileHelper';
import { fetchWrapper } from '@/helpers';
import Config from '@/lib/config';

const baseUrl = Config.API_URL;
const mycrypto = new CryptoHelper();

function formatPK(publicKey, size) {
  const pemHeader = '-----BEGIN PUBLIC KEY-----';
  const pemFooter = '-----END PUBLIC KEY-----';
  const trimmedPK = publicKey.replace(/\n/g, '');
  const pemContents = trimmedPK.substring(pemHeader.length, trimmedPK.length - pemFooter.length);

  const str = window.atob(pemContents);
  const base64Key = window.btoa(str);
  if (base64Key !== pemContents) {
    throw new Error('Wrong public key format');
  }

  const key = `${pemHeader}\n${pemContents}\n${pemFooter}`;
  if (key.length !== size) {
    throw new Error('Wrong public key format');
  }
  return key;
}

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
        passphrase,
      } = user;
      const { PK, SK } = await mycrypto.generateKeyPair();
      const { PK: signPK, SK: signSK } = await mycrypto.generateSignatureKeyPair();

      const clearHash = await mycrypto.hash(`${PK}\n${signPK}`);
      const signedHash = await mycrypto.sign(signSK, clearHash, true);

      const passHash = await mycrypto.hash(passphrase);
      const pass = await mycrypto.sign(signSK, passHash);

      const randKill = window.crypto.getRandomValues(new Uint8Array(32));
      const b64Kill = mycrypto.ArBuffToBase64(randKill);
      const kill = await mycrypto.sign(signSK, b64Kill);

      const send = {
        at: username,
        key: PK,
        signature: signPK,
        hash: signedHash,
        pass,
        kill,
      };
      await fetchWrapper.post(`${baseUrl}/users`, send);

      return { ESK: SK, SSK: signSK };
    },
    async createUserChallenge(user) {
      const {
        username,
        passphrase,
      } = user;

      const { PK, SK } = await mycrypto.generateKeyPair();
      const { PK: signPK, SK: signSK } = await mycrypto.generateSignatureKeyPair();

      const clearHash = await mycrypto.hash(`${PK}\n${signPK}`);
      const signedHash = await mycrypto.sign(signSK, clearHash, true);

      const randKill = window.crypto.getRandomValues(new Uint8Array(32));
      const b64Kill = mycrypto.ArBuffToBase64(randKill);

      const iv1 = window.crypto.getRandomValues(new Uint8Array(16));
      const iv2 = window.crypto.getRandomValues(new Uint8Array(16));
      const rs1 = window.crypto.getRandomValues(new Uint8Array(64));
      const rs2 = window.crypto.getRandomValues(new Uint8Array(64));

      const results = await Promise.all([
        mycrypto.PBKDF2Hash(passphrase, rs1),
        mycrypto.PBKDF2Hash(passphrase, rs2),
        mycrypto.PBKDF2Hash(b64Kill, rs2),
      ]);
      console.log(results);
      const [{ key: hp1 }, { key: hp2 }, { key: hks }] = results;

      const sk = `${SK}${CryptoHelper.SEPARATOR}${signSK}`;
      const rp = mycrypto.ArBuffToBase64(window.crypto.getRandomValues(new Uint8Array(64)));

      const encrypts = await Promise.all([
        mycrypto.PBKDF2Encrypt(hp1, sk, iv1),
        mycrypto.PBKDF2Encrypt(hp2, rp, iv2),
        mycrypto.PBKDF2Encrypt(hks, rp, iv2),
      ]);
      console.log(encrypts);
      const [{ token: esk }, { token: eup }, { token: euk }] = encrypts;

      const signatures = await Promise.all([
        mycrypto.sign(SK, eup, true),
        mycrypto.sign(SK, euk, true),
      ]);
      console.log(signatures);

      const [sup, suk] = signatures;

      const data = {
        at: username,
        key: PK,
        signature: signPK,
        hash: signedHash,
        vault: {
          token: esk,
          salt: mycrypto.ArBuffToBase64(rs1),
          iv: mycrypto.ArBuffToBase64(iv1),
          pass: suk,
          kill: sup,
        },
        attic: {
          salt: mycrypto.ArBuffToBase64(rs2),
          iv: mycrypto.ArBuffToBase64(iv2),
          proof: rp,
        },
      };

      await fetchWrapper.post(`${baseUrl}/users`, data);

      return {
        ESK: SK, SSK: signSK, proof: eup,
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
    async destroy(at) {
      await fetchWrapper.delete(`${baseUrl}/user/${at}`);
    },
  },
});
