import { defineStore } from 'pinia';

import CryptoHelper from '@/lib/cryptoHelper';
import { useAuthStore, useAlertStore } from '@/stores';

const mycrypto = new CryptoHelper();

export const useMemoryStore = defineStore({
  id: 'memory',
  state: () => ({
    messages: [],
  }),
  actions: {
    async readMessage(challenge) {
      try {
        const authStore = useAuthStore();
        const { pem } = authStore;

        const objStr = await mycrypto.resolve(pem, challenge);

        const {
          from,
          sentAt,
          title,
          content,
        } = JSON.parse(objStr);

        this.messages.unshift({
          from,
          sentAt,
          title: this.decodeText(title),
          content: this.decodeText(content),
        });
      } catch (error) {
        console.log(error);
        const alertStore = useAlertStore();
        alertStore.error(`An error occured: ${error}`);
      }
    },
    decodeText(str) {
      return decodeURIComponent(str);
    },
  },
});
