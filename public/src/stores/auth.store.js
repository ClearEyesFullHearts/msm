import { defineStore, getActivePinia } from 'pinia';

import { fetchWrapper } from '@/helpers';
import { router } from '@/router';
import { useAlertStore } from '@/stores';
import CryptoHelper from '@/lib/cryptoHelper';

const baseUrl = `${import.meta.env.VITE_API_URL}/identity`;
const mycrypto = new CryptoHelper();
let interval;

export const useAuthStore = defineStore({
  id: 'auth',
  state: () => ({
    user: null,
    pem: null,
    signing: null,
    returnUrl: null,
    countDownMsg: null,
  }),
  actions: {
    async login(username, key, signKey) {
      try {
        const challenge = await fetchWrapper.get(`${baseUrl}/${username}`);
        const userStr = await mycrypto.resolve(key, challenge);

        const user = JSON.parse(userStr);
        this.pem = key;
        this.signing = signKey;

        // update pinia state
        this.user = user;
        const countDownDate = user.connection + user.config.sessionTime;

        interval = setInterval(() => {
          // Get today's date and time
          const now = new Date().getTime();

          // Find the distance between now and the count down date
          const distance = countDownDate - now;

          // Time calculations for minutes and seconds
          const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((distance % (1000 * 60)) / 1000);

          this.countDownMsg = `${minutes}m ${seconds}s`;

          // If the count down is finished, write some text
          if (distance < 0) {
            clearInterval(interval);
            this.countDownMsg = 'expired';
          }
        }, 1000);

        // redirect to previous url or default to home page
        router.push(this.returnUrl || '/messages');
      } catch (error) {
        const alertStore = useAlertStore();
        alertStore.error(error);
      }
    },
    logout() {
      const pinia = getActivePinia();
      pinia._s.forEach((store) => store.$reset())
      router.push('/');
      document.title = 'ySyPyA';
      clearInterval(interval);
    },
  },
});
