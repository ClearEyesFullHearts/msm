/* eslint-disable import/prefer-default-export */
import { defineStore } from 'pinia';
import CryptoHelper from '@/lib/cryptoHelper';

const mycrypto = new CryptoHelper();

export const useContactsStore = defineStore({
  id: 'contacts',
  state: () => ({
    list: [],
  }),
  actions: {
    async checkUser(user) {
      // check if user is verified in contact list
      const [knownUser] = this.list.filter((u) => u.id === user.id);
      if (knownUser && knownUser.verified) {
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
