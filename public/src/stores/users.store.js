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
