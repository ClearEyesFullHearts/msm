import { defineStore } from 'pinia';

import CryptoHelper from '@/lib/cryptoHelper';
import { fetchWrapper } from '@/helpers';

const baseUrl = `${import.meta.env.VITE_API_URL}`;
const mycrypto = new CryptoHelper();

function downloadKey(at, text) {
  const a = window.document.createElement('a');
  a.href = window.URL.createObjectURL(new Blob([text]));
  a.download = `@${at}.pem`;

  // Append anchor to body.
  document.body.appendChild(a);
  a.click();

  // Remove anchor from body
  document.body.removeChild(a);
}
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
    async register(user) {
      const {
        username,
        publicKey,
        sigPublicKey,
      } = user;

      if (!publicKey || !publicKey.length) {
        const { PK, SK } = await mycrypto.generateKeyPair();
        const { PK: signPK, SK: signSK } = await mycrypto.generateSignatureKeyPair();

        const send = {
          at: username,
          key: PK,
          signature: signPK,
        };
        await fetchWrapper.post(`${baseUrl}/users`, send);
        const skFileContent = `${SK}${CryptoHelper.SEPARATOR}${signSK}`;
        downloadKey(user.username, skFileContent);
      } else {
        const send = {
          at: username,
          key: formatPK(publicKey, 788),
          signature: formatPK(sigPublicKey, 268),
        };
        await fetchWrapper.post(`${baseUrl}/users`, send);
      }
      this.newUsername = username;
    },
    async getAll(search) {
      if (search.length < 3) return;
      this.users = { loading: true };
      try {
        this.users = await fetchWrapper.get(`${baseUrl}/users?search=${search}`);
      } catch (error) {
        this.users = { error };
      }
    },
    async returnOne(at) {
      const user = await fetchWrapper.get(`${baseUrl}/user/${at}`);
      return user;
    },
    async destroy(userId) {
      await fetchWrapper.delete(`${baseUrl}/user/${userId}`);
    },
  },
});
