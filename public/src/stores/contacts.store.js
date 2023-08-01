/* eslint-disable import/prefer-default-export */
import { reactive } from 'vue'
import { defineStore } from 'pinia';
import { fetchWrapper } from '@/helpers';
import CryptoHelper from '@/lib/cryptoHelper';

const mycrypto = new CryptoHelper();
const baseUrl = `${import.meta.env.VITE_API_URL}`;

export const useContactsStore = defineStore({
  id: 'contacts',
  state: () => ({
    list: [],
  }),
  actions: {
    async setContactList(pem, contacts) {
      if (!contacts) {
        this.list = [];
        return;
      }

      const {
        passphrase,
        iv,
        token,
      } = contacts;

      const listStr = await mycrypto.resolve(pem, { token, passphrase, iv });
      this.list = JSON.parse(listStr);
    },
    async saveContactList(pem) {
      const listChallenge = await mycrypto.challenge(pem, JSON.stringify(this.list));
      await fetchWrapper.put(`${baseUrl}/contacts`, listChallenge);
    },
    async manualAdd(user) {
      const {
        id,
        at,
        key,
        signature,
      } = user;
      const hash = await mycrypto.hash(`${key}\n${signature}`);
      const checkingUser = reactive({
        id,
        at,
        verified: false,
        hash,
        signature: null,
        auto: null,
        verification: {
          hash: false,
          signature: false,
          auto: false,
        },
      });
      this.list.push(checkingUser);
      // check if user is verified in ether blockchain
    },
    async fileAdd({
      id, at, hash, signature,
    }) {
      const serverUser = await fetchWrapper.get(`${baseUrl}/user/${id}`);
      const {
        key: serverKey,
        signature: serverSigKey,
      } = serverUser;
      const serverHash = await mycrypto.hash(`${serverKey}\n${serverSigKey}`);
      const result = await mycrypto.verify(serverSigKey, serverHash, signature, true);

      const checkedUser = reactive({
        id,
        at,
        verified: true,
        hash,
        signature,
        auto,
        verification: {
          hash: (serverHash === hash),
          signature: result,
          auto: false,
        },
      });
      this.list.push(checkedUser);
      // check if user is verified in ether blockchain
    },
    verifyUser(id) {
      const [knownUser] = this.list.filter((u) => u.id === id);
      knownUser.verified = true;
      knownUser.verification.hash = true;
    },
    async checkUser(user) {
      // check if user is verified in contact list
      const [knownUser] = this.list.filter((u) => u.id === user.id);
      if (knownUser) {
        if (knownUser.verified) {
          const {
            hash,
            signature,
          } = knownUser;
          if (signature) {
            const result = await mycrypto.verify(user.signature, user.security.hash, signature, true);

            user.security.verification = result ? 1 : 4;
            return;
          }
          user.security.verification = user.security.hash === hash ? 2 : 4;
          return;
        }
        if (knownUser.verification.auto && knownUser.auto) {
          const result = await mycrypto.verify(user.signature, user.security.hash, knownUser.auto, true);
          user.security.verification = result ? 3 : 4;
          return;
        }
      }
      // check if user is verified in ether blockchain
      // if the hash checks out => user.security.verification = 3;
      // setInterval(() => {
      //   user.security.verification++;
      //   if (user.security.verification > 4) {
      //     user.security.verification = 0;
      //   }
      // }, 2000);
    },
  },
});
